// Zustand store: thin action layer over the pure game core, plus persistence.
// All game rules live in tick.ts / events.ts / economy.ts — actions here only
// validate input, call pure functions and stamp the wall clock.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CourtyardId, GameState, PerkId, RepeatableId, TuzexId, UpgradeId } from './types';
import { tick } from './tick';
import { resolveChoice } from './events';
import { applyPrestige, buyPerk, privatizaceAvailable } from './prestige';
import { computeOffline, type OfflineSummary } from './offline';
import {
  addLog,
  allFlats,
  applyBrigadeWork,
  clamp,
  createBuilding,
  createFlat,
  createInitialState,
  mapTenants,
  migrateSave,
  SAVE_VERSION,
  updateFlat,
} from './state';
import {
  CARETAKER_MIN_FLOORS,
  COURTYARD_COSTS,
  elevatorRepairCost,
  EVICTION_COST,
  EVICTION_DELAY_SECONDS,
  FLATS_PER_FLOOR,
  floorCost,
  KAVA_COST_BONY,
  KAVA_HAPPINESS_BONUS,
  MAX_BUILDINGS,
  MAX_FLOORS,
  PLOT_COSTS,
  PROBLEM_DEFS,
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

  tickOnce: () => void;
  workBrigade: () => void;
  setHelpOpen: (open: boolean) => void;
  setActiveBuilding: (index: number) => void;
  buyFloor: (bIdx: number) => void;
  buyPlot: () => void;
  buyUpgrade: (id: UpgradeId) => void;
  buyCourtyard: (id: CourtyardId) => void;
  hireCaretaker: () => void;
  fireCaretaker: () => void;
  repairElevator: (bIdx: number) => void;
  repairProblem: (flatIndex: number) => void;
  requestEviction: (flatIndex: number) => void;
  buyTuzex: (id: TuzexId) => void;
  buyKava: () => void;
  buyRepeatable: (id: RepeatableId) => void;
  buyPrestigePerk: (id: PerkId) => void;
  privatize: () => void;
  resolveChoice: (optionId: string) => void;
  dismissOffline: () => void;
  applyOfflineProgress: () => void;
  newGame: () => void;
}

export const useGame = create<PanelakStore>()(
  persist(
    (set, get) => ({
      game: createInitialState(),
      offlineSummary: null,
      helpOpen: false,
      activeBuilding: 0,

      tickOnce: () => {
        const { game, offlineSummary, helpOpen } = get();
        // Modals pause the simulation; keep the save timestamp fresh so a
        // reload during a pause doesn't double-pay offline earnings.
        if (offlineSummary || helpOpen || game.pendingChoice) {
          set({ game: { ...game, lastSaved: Date.now() } });
          return;
        }
        set({ game: { ...tick(game), lastSaved: Date.now() } });
      },

      workBrigade: () => {
        const { game, offlineSummary, helpOpen } = get();
        if (offlineSummary || helpOpen || game.pendingChoice) return;
        set({ game: applyBrigadeWork(game) });
      },

      setHelpOpen: (open) => set({ helpOpen: open }),

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

      buyPlot: () => {
        const { game } = get();
        const count = game.buildings.length;
        if (count >= MAX_BUILDINGS) return;
        if (game.buildings[count - 1].floors < MAX_FLOORS) return;
        const cost = PLOT_COSTS[count];
        if (game.money < cost) return;
        const building = createBuilding(count, count, allFlats(game).length);
        let next: GameState = {
          ...game,
          money: game.money - cost,
          buildings: [...game.buildings, building],
        };
        next = addLog(next, 'milestone', CS.sidliste.plotBought(CS.sites[count].name));
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
        let next: GameState = { ...game, money: game.money - cost, buildings };
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
        let next: GameState = { ...game, money: game.money - cost };
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

      dismissOffline: () => set({ offlineSummary: null }),

      applyOfflineProgress: () => {
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
          offlineSummary: summary,
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
