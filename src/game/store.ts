// Zustand store: thin action layer over the pure game core, plus persistence.
// All game rules live in tick.ts / events.ts / economy.ts — actions here only
// validate input, call pure functions and stamp the wall clock.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CourtyardId, GameState, MinigameId, PerkId, ProjectId, RepeatableId, TuzexId, UpgradeId } from './types';
import { tick } from './tick';
import { resolveChoice } from './events';
import { coverTenant, reportTenant, spyOnTenant } from './secrets';
import { applyPrestige, buyPerk, privatizaceAvailable } from './prestige';
import { getLang, setLang, type Lang } from './i18n';
import { computeOffline, OFFLINE_MIN_SECONDS, type OfflineSummary } from './offline';

// Apply the persisted language before anything renders.
const savedLang: Lang =
  typeof localStorage !== 'undefined' && localStorage.getItem('panelak-lang') === 'en'
    ? 'en'
    : 'cs';
if (savedLang !== getLang()) setLang(savedLang);
import {
  addLog,
  allFlats,
  applyBrigadeWork,
  clamp,
  createBuilding,
  createFlat,
  createInitialState,
  decodeSave,
  mapTenants,
  migrateSave,
  SAVE_VERSION,
  updateFlat,
} from './state';
import {
  ARKADA_ENERGY_COST,
  arkadaReward,
  POTRUBI_ENERGY_COST,
  potrubiReward,
  AZOR_ENERGY_COST,
  azorReward,
  CARETAKER_MIN_FLOORS,
  COURTYARD_COSTS,
  elevatorRepairCost,
  EVICTION_COST,
  EVICTION_DELAY_SECONDS,
  FLATS_PER_FLOOR,
  floorCost,
  KAVA_COST_BONY,
  KAVA_HAPPINESS_BONUS,
  tuzexBalikCost,
  BONY_PER_KUPON,
  MINIGAME_COSTS,
  FLAT_RENO_MAX,
  flatRenoCost,
  MAX_FLOORS,
  buildingCap,
  plotCost,
  TOTAL_PARCELS,
  PROBLEM_DEFS,
  PROJECT_COSTS,
  PROJECT_ORDER,
  REP_EVICTION,
  repeatableCost,
  TUZEX_COSTS,
  UPGRADE_COSTS,
} from './economy';
import { CS } from './content.cs';

interface PanelakStore {
  game: GameState;
  offlineSummary: OfflineSummary | null;
  /** Transient — the help overlay also pauses the tick loop. */
  helpOpen: boolean;
  /** Transient — which building the scene shows. */
  activeBuilding: number;
  /** Transient mirrors of UI preferences (persisted in their own keys). */
  lang: Lang;

  tickOnce: () => void;
  workBrigade: () => void;
  /** Pay elán to start the svazák arkáda. Returns false if too tired / paused. */
  startArkada: () => boolean;
  /** Bank the money earned in one finished arkáda game. */
  rewardArkada: (score: number) => void;
  /** Pay elán to start the kutil's pipe puzzle. */
  startPotrubi: () => boolean;
  /** Pay out a solved pipe puzzle; also fixes one real leak. Returns its flat. */
  rewardPotrubi: (moves: number) => string | null;
  /** Pay elán to let Azor out. */
  startAzor: () => boolean;
  /** Bank the money for the cats Azor rounded up. */
  rewardAzor: (cats: number) => void;
  setHelpOpen: (open: boolean) => void;
  setLanguage: (lang: Lang) => void;
  setActiveBuilding: (index: number) => void;
  buyFloor: (bIdx: number) => void;
  buyPlot: (site: number) => void;
  buyUpgrade: (id: UpgradeId) => void;
  buyCourtyard: (id: CourtyardId) => void;
  hireCaretaker: () => void;
  fireCaretaker: () => void;
  repairElevator: (bIdx: number) => void;
  repairProblem: (flatIndex: number) => void;
  requestEviction: (flatIndex: number) => void;
  spyOnFlat: (flatIndex: number) => void;
  coverFlat: (flatIndex: number) => void;
  reportFlat: (flatIndex: number) => void;
  buyTuzex: (id: TuzexId) => void;
  buyKava: () => void;
  /** Repeatable Tuzex hamper — the endless bony sink. */
  buyBalik: () => void;
  /** Trade a pile of bony for one privatizační kupón, at a bad rate. */
  exchangeBonyForKupon: () => void;
  /** Unlock a tenant-card diversion for bony. */
  unlockMinigame: (id: MinigameId) => void;
  buyRepeatable: (id: RepeatableId) => void;
  renovateFlat: (flatIndex: number) => void;
  buyProject: (id: ProjectId) => void;
  buyPrestigePerk: (id: PerkId) => void;
  privatize: () => void;
  resolveChoice: (optionId: string) => void;
  importSave: (raw: string) => boolean;
  dismissOffline: () => void;
  /** Credit rent for elapsed wall-clock time. `silent` skips the summary modal. */
  applyOfflineProgress: (silent?: boolean) => void;
  newGame: () => void;
}

export const useGame = create<PanelakStore>()(
  persist(
    (set, get) => ({
      game: createInitialState(),
      offlineSummary: null,
      helpOpen: false,
      activeBuilding: 0,
      lang: savedLang,

      tickOnce: () => {
        const { game, offlineSummary, helpOpen } = get();
        // Modals pause the simulation; keep the save timestamp fresh so a
        // reload during a pause doesn't double-pay offline earnings.
        if (offlineSummary || helpOpen || game.pendingChoice) {
          set({ game: { ...game, lastSaved: Date.now() } });
          return;
        }
        // If the loop was frozen for a while — laptop asleep, or a background
        // tab the browser throttled hard — the wall clock has jumped far past
        // the last tick. A plain tick would advance a single second and stamp
        // lastSaved = now, silently swallowing the whole gap (the reason an
        // open tab left overnight earned nothing). Settle it as offline rent
        // instead.
        //
        // Silently, though: a hidden tab is throttled to roughly one fire per
        // minute, so raising the summary modal here would fire it after the
        // first minute — and since an open modal refreshes lastSaved on every
        // tick, the remaining hours would then be discarded, leaving the player
        // with "Byl/a jste pryč 1 min." after a whole evening away. The modal
        // belongs to page loads (onRehydrateStorage), where the elapsed time is
        // measured once and the player is actually there to read it.
        if ((Date.now() - game.lastSaved) / 1000 >= OFFLINE_MIN_SECONDS) {
          get().applyOfflineProgress(true);
          return;
        }
        set({ game: { ...tick(game), lastSaved: Date.now() } });
      },

      workBrigade: () => {
        const { game, offlineSummary, helpOpen } = get();
        if (offlineSummary || helpOpen || game.pendingChoice) return;
        set({ game: applyBrigadeWork(game) });
      },

      startArkada: () => {
        const { game, offlineSummary, helpOpen } = get();
        if (offlineSummary || helpOpen || game.pendingChoice) return false;
        if (game.energy < ARKADA_ENERGY_COST) return false;
        set({ game: { ...game, energy: game.energy - ARKADA_ENERGY_COST } });
        return true;
      },

      rewardArkada: (score) => {
        const { game } = get();
        const reward = arkadaReward(score);
        if (reward <= 0) return;
        const next = addLog(
          { ...game, money: game.money + reward, totalEarned: game.totalEarned + reward },
          'good',
          CS.arkada.reward(reward),
        );
        set({ game: next });
      },

      startPotrubi: () => {
        const { game, offlineSummary, helpOpen } = get();
        if (offlineSummary || helpOpen || game.pendingChoice) return false;
        if (game.energy < POTRUBI_ENERGY_COST) return false;
        set({ game: { ...game, energy: game.energy - POTRUBI_ENERGY_COST } });
        return true;
      },

      rewardPotrubi: (moves) => {
        const { game } = get();
        const reward = potrubiReward(moves);
        // The kutil looks at a real leak on his way out — that's the joke, and
        // it makes the puzzle worth playing when the house is actually broken.
        const leak = allFlats(game).find((f) => f.problem === 'leak');
        let next: GameState = {
          ...game,
          money: game.money + reward,
          totalEarned: game.totalEarned + reward,
        };
        if (leak) next = updateFlat(next, leak.index, (f) => ({ ...f, problem: null }));
        next = addLog(next, 'good', CS.potrubi.win(reward));
        set({ game: next });
        return leak ? CS.ui.flatLabel(leak.index + 1) : null;
      },

      startAzor: () => {
        const { game, offlineSummary, helpOpen } = get();
        if (offlineSummary || helpOpen || game.pendingChoice) return false;
        if (game.energy < AZOR_ENERGY_COST) return false;
        set({ game: { ...game, energy: game.energy - AZOR_ENERGY_COST } });
        return true;
      },

      rewardAzor: (cats) => {
        const { game } = get();
        const reward = azorReward(cats);
        if (reward <= 0) return;
        const next = addLog(
          { ...game, money: game.money + reward, totalEarned: game.totalEarned + reward },
          'good',
          CS.azor.win2(reward),
        );
        set({ game: next });
      },

      setHelpOpen: (open) => set({ helpOpen: open }),

      setLanguage: (lang) => {
        setLang(lang);
        try {
          localStorage.setItem('panelak-lang', lang);
        } catch {
          /* preference just won't persist */
        }
        set({ lang });
      },

      setActiveBuilding: (index) =>
        set((s) => ({
          activeBuilding: Math.max(0, Math.min(index, s.game.buildings.length - 1)),
        })),

      buyFloor: (bIdx) => {
        const { game } = get();
        const b = game.buildings[bIdx];
        if (!b || b.floors >= MAX_FLOORS) return;
        const cost = floorCost(b.floors, game.meta.perks.beton);
        if (game.money < cost) return;

        const newFloor = b.floors + 1;
        const baseIndex = allFlats(game).length; // globally unique flat indices
        const flats = [
          ...b.flats,
          ...Array.from({ length: FLATS_PER_FLOOR }, (_, i) =>
            createFlat(baseIndex + i, newFloor, bIdx),
          ),
        ];
        const buildings = game.buildings.map((bb, i) =>
          i === bIdx ? { ...bb, floors: newFloor, flats } : bb,
        );
        let next: GameState = { ...game, money: game.money - cost, buildings };
        next = addLog(next, 'good', CS.toasts.floorBought(newFloor));
        set({ game: next });
      },

      buyPlot: (site) => {
        const { game } = get();
        const count = game.buildings.length;
        if (count >= buildingCap(game.meta.prestigeLevel)) return; // era limit
        if (site < 0 || site >= TOTAL_PARCELS) return;
        if (game.buildings.some((b) => b.site === site)) return; // parcel taken
        const cost = plotCost(count);
        if (game.money < cost) return;
        const building = createBuilding(site, count, allFlats(game).length);
        let next: GameState = {
          ...game,
          money: game.money - cost,
          buildings: [...game.buildings, building],
        };
        next = addLog(next, 'milestone', CS.sidliste.plotBought(CS.sites[site].name));
        set({ game: next, activeBuilding: count });
      },

      buyUpgrade: (id) => {
        const { game } = get();
        const cost = UPGRADE_COSTS[id];
        if (game.upgrades[id] || game.money < cost) return;
        let next: GameState = {
          ...game,
          money: game.money - cost,
          upgrades: { ...game.upgrades, [id]: true },
        };
        next = addLog(next, 'good', CS.toasts.upgradeBought(CS.upgrades[id].name));
        set({ game: next });
      },

      repairElevator: (bIdx) => {
        const { game } = get();
        const b = game.buildings[bIdx];
        if (!b) return;
        const cost = elevatorRepairCost(b.floors);
        if (!b.elevatorBroken || game.money < cost) return;
        const buildings = game.buildings.map((bb, i) =>
          i === bIdx ? { ...bb, elevatorBroken: false } : bb,
        );
        let next: GameState = {
          ...game,
          money: game.money - cost,
          buildings,
          stats: { ...game.stats, repairsDone: game.stats.repairsDone + 1 },
        };
        next = addLog(next, 'good', CS.toasts.elevatorFixed);
        set({ game: next });
      },

      repairProblem: (flatIndex) => {
        const { game } = get();
        const flat = allFlats(game).find((f) => f.index === flatIndex);
        if (!flat?.problem) return;
        const cost = PROBLEM_DEFS[flat.problem].repairCost;
        if (game.money < cost) return;
        const text = CS.problems[flat.problem].fixed(CS.ui.flatLabel(flatIndex + 1));
        let next: GameState = {
          ...game,
          money: game.money - cost,
          stats: { ...game.stats, repairsDone: game.stats.repairsDone + 1 },
        };
        next = updateFlat(next, flatIndex, (f) => ({ ...f, problem: null }));
        next = addLog(next, 'good', text);
        set({ game: next });
      },

      buyCourtyard: (id) => {
        const { game } = get();
        const cost = COURTYARD_COSTS[id];
        if (game.courtyard[id] || game.money < cost) return;
        let next: GameState = {
          ...game,
          money: game.money - cost,
          courtyard: { ...game.courtyard, [id]: true },
        };
        next = addLog(next, 'good', CS.toasts.courtyardBuilt(CS.courtyard[id].name));
        set({ game: next });
      },

      hireCaretaker: () => {
        const { game } = get();
        if (game.caretakerHired || !game.buildings.some((b) => b.floors >= CARETAKER_MIN_FLOORS)) return;
        let next: GameState = { ...game, caretakerHired: true };
        next = addLog(next, 'good', CS.toasts.caretakerHired);
        set({ game: next });
      },

      fireCaretaker: () => {
        const { game } = get();
        if (!game.caretakerHired) return;
        let next: GameState = { ...game, caretakerHired: false };
        next = addLog(next, 'info', CS.toasts.caretakerFired);
        set({ game: next });
      },

      requestEviction: (flatIndex) => {
        const { game } = get();
        const flat = allFlats(game).find((f) => f.index === flatIndex);
        const t = flat?.tenant;
        if (!t || t.evictionAt !== null) return;
        if (t.archetype === 'pensioner') {
          // Paní Vlasta is un-evictable. Three chairmen have tried.
          set({ game: addLog(game, 'info', CS.ui.evictionRefused) });
          return;
        }
        if (game.money < EVICTION_COST) return;
        let next: GameState = {
          ...game,
          money: game.money - EVICTION_COST,
          reputation: clamp(game.reputation + REP_EVICTION, 0, 100),
        };
        next = updateFlat(next, flatIndex, (f) => ({
          ...f,
          tenant: { ...f.tenant!, evictionAt: game.tick + EVICTION_DELAY_SECONDS },
        }));
        next = addLog(next, 'info', CS.toasts.evictionFiled(t.name));
        set({ game: next });
      },

      spyOnFlat: (flatIndex) => {
        const { game } = get();
        set({ game: spyOnTenant(game, flatIndex) });
      },

      coverFlat: (flatIndex) => {
        const { game } = get();
        set({ game: coverTenant(game, flatIndex) });
      },

      reportFlat: (flatIndex) => {
        const { game } = get();
        set({ game: reportTenant(game, flatIndex) });
      },

      buyTuzex: (id) => {
        const { game } = get();
        const cost = TUZEX_COSTS[id];
        if (game.tuzex[id] || game.bony < cost) return;
        if (id === 'pracka' && !game.upgrades.laundry) return;
        let next: GameState = {
          ...game,
          bony: game.bony - cost,
          tuzex: { ...game.tuzex, [id]: true },
        };
        next = addLog(next, 'good', CS.toasts.tuzexBought(CS.tuzex[id].name));
        set({ game: next });
      },

      buyKava: () => {
        const { game } = get();
        if (game.bony < KAVA_COST_BONY) return;
        let next: GameState = { ...game, bony: game.bony - KAVA_COST_BONY };
        next = mapTenants(next, (t) => ({
          ...t,
          happiness: clamp(t.happiness + KAVA_HAPPINESS_BONUS, 0, 100),
        }));
        next = addLog(next, 'good', CS.toasts.kavaServed);
        set({ game: next });
      },

      buyBalik: () => {
        const { game } = get();
        const cost = tuzexBalikCost(game.baliky);
        if (game.bony < cost) return;
        const level = game.baliky + 1;
        const next = addLog(
          { ...game, bony: game.bony - cost, baliky: level },
          'good',
          CS.toasts.balikBought(level),
        );
        set({ game: next });
      },

      exchangeBonyForKupon: () => {
        const { game } = get();
        if (game.bony < BONY_PER_KUPON) return;
        const next = addLog(
          {
            ...game,
            bony: game.bony - BONY_PER_KUPON,
            meta: { ...game.meta, kupony: game.meta.kupony + 1 },
          },
          'good',
          CS.toasts.kuponExchanged,
        );
        set({ game: next });
      },

      unlockMinigame: (id) => {
        const { game } = get();
        const cost = MINIGAME_COSTS[id];
        if (game.minigames[id] || game.bony < cost) return;
        const next = addLog(
          {
            ...game,
            bony: game.bony - cost,
            minigames: { ...game.minigames, [id]: true },
          },
          'milestone',
          CS.toasts.minigameUnlocked(CS.minigames[id].name),
        );
        set({ game: next });
      },

      buyRepeatable: (id) => {
        const { game } = get();
        const cost = repeatableCost(id, game.repeatables[id]);
        if (game.money < cost) return;
        let next: GameState = {
          ...game,
          money: game.money - cost,
          repeatables: { ...game.repeatables, [id]: game.repeatables[id] + 1 },
        };
        next = addLog(
          next,
          'good',
          CS.toasts.repeatableBought(CS.repeatables[id].name, next.repeatables[id]),
        );
        set({ game: next });
      },

      renovateFlat: (flatIndex) => {
        const { game } = get();
        const flat = allFlats(game).find((f) => f.index === flatIndex);
        if (!flat || flat.renovation >= FLAT_RENO_MAX) return;
        const cost = flatRenoCost(flat.renovation);
        if (game.money < cost) return;
        let next: GameState = { ...game, money: game.money - cost };
        next = updateFlat(next, flatIndex, (f) => ({ ...f, renovation: f.renovation + 1 }));
        next = addLog(
          next,
          'good',
          CS.reno.done(String(flatIndex + 1), flat.renovation + 1),
        );
        set({ game: next });
      },

      buyProject: (id) => {
        const { game } = get();
        if (game.projects[id]) return;
        const order = PROJECT_ORDER.indexOf(id);
        if (order > 0 && !game.projects[PROJECT_ORDER[order - 1]]) return;
        const cost = PROJECT_COSTS[id];
        if (game.money < cost) return;
        let next: GameState = {
          ...game,
          money: game.money - cost,
          projects: { ...game.projects, [id]: true },
        };
        next = addLog(next, 'milestone', CS.projects.built(CS.projects[id].name));
        set({ game: next });
      },

      buyPrestigePerk: (id) => {
        const { game } = get();
        set({ game: buyPerk(game, id) });
      },

      privatize: () => {
        const { game } = get();
        if (!privatizaceAvailable(game)) return;
        set({ game: applyPrestige(game), offlineSummary: null, activeBuilding: 0 });
      },

      resolveChoice: (optionId) => {
        const { game } = get();
        set({ game: resolveChoice(game, optionId) });
      },

      importSave: (raw) => {
        const game = decodeSave(raw);
        if (!game) return false;
        set({
          game: { ...game, lastSaved: Date.now() },
          offlineSummary: null,
          activeBuilding: 0,
        });
        return true;
      },

      dismissOffline: () => set({ offlineSummary: null }),

      applyOfflineProgress: (silent = false) => {
        const { game } = get();
        const elapsed = (Date.now() - game.lastSaved) / 1000;
        const summary = computeOffline(game, elapsed);
        if (!summary) {
          set({ game: { ...game, lastSaved: Date.now() } });
          return;
        }
        set({
          game: {
            ...game,
            money: game.money + summary.earned,
            totalEarned: game.totalEarned + summary.earned,
            lastSaved: Date.now(),
          },
          // Silent settles (a throttled background tab) only credit the rent —
          // the house kept running, there is no absence to announce.
          offlineSummary: silent ? null : summary,
        });
      },

      newGame: () => set({ game: createInitialState(), offlineSummary: null, activeBuilding: 0 }),
    }),
    {
      name: 'panelak-tycoon-save',
      version: SAVE_VERSION,
      partialize: (s) => ({ game: s.game }),
      migrate: (persisted, version) => {
        const p = persisted as { game: GameState };
        return { game: migrateSave(p.game, version) };
      },
      onRehydrateStorage: () => (state) => {
        // Defer until the store is fully constructed, then settle offline rent.
        if (state) queueMicrotask(() => useGame.getState().applyOfflineProgress());
      },
    },
  ),
);
