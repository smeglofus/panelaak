// All game state interfaces. The whole game is a pure function over GameState.

export type ArchetypeId = 'pensioner' | 'couple' | 'drunk' | 'vekslak' | 'shift';

export type UpgradeId = 'elevatorNdr' | 'cellar' | 'satellite' | 'laundry';

export type ProblemId = 'leak';

export type MilestoneId =
  | 'firstFullFloor'
  | 'first1000'
  | 'elevatorInstalled'
  | 'eightFloors'
  | 'vzornyDum';

export interface Tenant {
  id: number;
  archetype: ArchetypeId;
  name: string;
  flavor: string;
  /** 0..100 */
  happiness: number;
  /** Game tick when happiness dropped below the move-out threshold, null when above it. */
  unhappySince: number | null;
}

export interface Flat {
  /** Unique, stable index (also drives the deterministic plaster weathering). */
  index: number;
  /** 1-based floor number; ground floor (entrance, kočárkárna) is not a flat row. */
  floor: number;
  tenant: Tenant | null;
  problem: ProblemId | null;
}

export interface Building {
  floors: number;
  flats: Flat[];
  elevatorBroken: boolean;
}

export interface ActiveEvent {
  id: string;
  /** Seconds until the event expires. */
  remaining: number;
}

export type LogKind = 'info' | 'good' | 'bad' | 'event' | 'milestone';

export interface LogEntry {
  seq: number;
  tick: number;
  kind: LogKind;
  text: string;
}

export interface ChoiceOption {
  id: string;
  label: string;
  disabled?: boolean;
}

export interface PendingChoice {
  eventId: string;
  title: string;
  body: string;
  options: ChoiceOption[];
}

export interface GameStats {
  moveIns: number;
  moveOuts: number;
  eventsFired: number;
  breakdowns: number;
}

export interface GameState {
  /** Save schema version — bump on breaking changes, migrate in store.ts. */
  version: number;
  /** Game seconds elapsed (one tick = one second). */
  tick: number;
  /** Advancing PRNG seed; the only source of randomness, keeps tick() deterministic. */
  rngSeed: number;
  money: number;
  totalEarned: number;
  /** 0..100, scales tenant move-in chance. */
  reputation: number;
  /** Elán 0..100 — spent by the Akce Z work action, regenerates over time. */
  energy: number;
  /** Always length 1 in MVP; an array so a sídliště view doesn't need a schema rewrite. */
  buildings: Building[];
  meta: { prestigeLevel: number };
  upgrades: Record<UpgradeId, boolean>;
  activeEvents: ActiveEvent[];
  /** Set while an interactive event (domovní schůze) waits for the player; tick pauses. */
  pendingChoice: PendingChoice | null;
  milestones: Record<MilestoneId, boolean>;
  log: LogEntry[];
  logSeq: number;
  stats: GameStats;
  nextTenantId: number;
  /** Wall-clock ms of the last save; basis for offline progress. */
  lastSaved: number;
}
