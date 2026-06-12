// Zustand store: thin action layer over the pure game core, plus persistence.
// All game rules live in tick.ts / events.ts / economy.ts — actions here only
// validate input, call pure functions and stamp the wall clock.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CourtyardId, GameState, TuzexId, UpgradeId } from './types';
import { tick } from './tick';
import { resolveChoice } from './events';
import { computeOffline, type OfflineSummary } from './offline';
import {
  addLog,
  applyBrigadeWork,
  clamp,
  createFlat,
  createInitialState,
  mainBuilding,
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
  MAX_FLOORS,
  PROBLEM_DEFS,
  REP_EVICTION,
  TUZEX_COSTS,
  UPGRADE_COSTS,
} from './economy';
import { CS } from './content.cs';

interface PanelakStore {
  game: GameState;
  offlineSummary: OfflineSummary | null;
  /** Transient — the help overlay also pauses the tick loop. */
  helpOpen: boolean;

  tickOnce: () => void;
  workBrigade: () => void;
  setHelpOpen: (open: boolean) => void;
  buyFloor: () => void;
  buyUpgrade: (id: UpgradeId) => void;
  buyCourtyard: (id: CourtyardId) => void;
  hireCaretaker: () => void;
  fireCaretaker: () => void;
  repairElevator: () => void;
  repairProblem: (flatIndex: number) => void;
  requestEviction: (flatIndex: number) => void;
  buyTuzex: (id: TuzexId) => void;
  buyKava: () => void;
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

      buyFloor: () => {
        const { game } = get();
        const b = mainBuilding(game);
        if (b.floors >= MAX_FLOORS) return;
        const cost = floorCost(b.floors);
        if (game.money < cost) return;

        const newFloor = b.floors + 1;
        const baseIndex = b.flats.length;
        const flats = [
          ...b.flats,
          ...Array.from({ length: FLATS_PER_FLOOR }, (_, i) =>
            createFlat(baseIndex + i, newFloor),
          ),
        ];
        let next: GameState = {
          ...game,
          money: game.money - cost,
          buildings: [{ ...b, floors: newFloor, flats }],
        };
        next = addLog(next, 'good', CS.toasts.floorBought(newFloor));
        set({ game: next });
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

      repairElevator: () => {
        const { game } = get();
        const b = mainBuilding(game);
        const cost = elevatorRepairCost(b.floors);
        if (!b.elevatorBroken || game.money < cost) return;
        let next: GameState = {
          ...game,
          money: game.money - cost,
          buildings: [{ ...b, elevatorBroken: false }],
        };
        next = addLog(next, 'good', CS.toasts.elevatorFixed);
        set({ game: next });
      },

      repairProblem: (flatIndex) => {
        const { game } = get();
        const b = mainBuilding(game);
        const flat = b.flats.find((f) => f.index === flatIndex);
        if (!flat?.problem) return;
        const cost = PROBLEM_DEFS[flat.problem].repairCost;
        if (game.money < cost) return;
        const flats = b.flats.map((f) =>
          f.index === flatIndex ? { ...f, problem: null } : f,
        );
        const text = CS.problems[flat.problem].fixed(CS.ui.flatLabel(flatIndex + 1));
        let next: GameState = {
          ...game,
          money: game.money - cost,
          buildings: [{ ...b, flats }],
        };
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
        if (game.caretakerHired || mainBuilding(game).floors < CARETAKER_MIN_FLOORS) return;
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
        const flat = mainBuilding(game).flats.find((f) => f.index === flatIndex);
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

      newGame: () => set({ game: createInitialState(), offlineSummary: null }),
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
