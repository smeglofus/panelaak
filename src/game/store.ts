// Zustand store: thin action layer over the pure game core, plus persistence.
// All game rules live in tick.ts / events.ts / economy.ts — actions here only
// validate input, call pure functions and stamp the wall clock.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CourtyardId, GameState, UpgradeId } from './types';
import { tick } from './tick';
import { resolveChoice } from './events';
import { computeOffline, type OfflineSummary } from './offline';
import {
  addLog,
  applyBrigadeWork,
  createFlat,
  createInitialState,
  mainBuilding,
  migrateSave,
  SAVE_VERSION,
} from './state';
import {
  CARETAKER_MIN_FLOORS,
  COURTYARD_COSTS,
  elevatorRepairCost,
  FLATS_PER_FLOOR,
  floorCost,
  MAX_FLOORS,
  PROBLEM_DEFS,
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
        const label = CS.ui.flatLabel(flatIndex + 1);
        const text =
          flat.problem === 'leak' ? CS.toasts.leakFixed(label) : CS.toasts.windowFixed(label);
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
