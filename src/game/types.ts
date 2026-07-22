// All game state interfaces. The whole game is a pure function over GameState.

export type ArchetypeId =
  | 'pensioner'
  | 'couple'
  | 'drunk'
  | 'vekslak'
  | 'shift'
  | 'kutil'
  | 'svazak'
  | 'disident'
  | 'family'
  | 'musician';

export type UpgradeId = 'elevatorNdr' | 'cellar' | 'satellite' | 'laundry';

export type CourtyardId = 'piskoviste' | 'lavicky' | 'zahonky' | 'susak' | 'garaz';

/** Endlessly repeatable upgrades — the long-term money sink. */
export type RepeatableId = 'renovace' | 'naradi';

/** Permanent perks bought with privatizační kupóny; survive every prestige. */
export type PerkId = 'beton' | 'konexe' | 'stribro' | 'povest' | 'rucicky';

/** Kádrový posudek badges — earned once, survive every prestige. */
export type BadgeId =
  | 'udernik'
  | 'provereny'
  | 'plnyDum'
  | 'milionar'
  | 'prezimoval'
  | 'budovatel'
  | 'vzorny'
  | 'kapitalista'
  | 'slusnyClovek'
  | 'konfident';

/** Protirežimové (či jen protizákonné) aktivity nájemníků. */
export type SecretId = 'samizdat' | 'radio' | 'veksl' | 'melouch' | 'zapad' | 'palenka';

/** Personal records — the síň slávy. Survive every prestige. */
export interface EraRecords {
  /** Ticks to the Vzorný dům title, best era; null until first achieved. */
  fastestVzornyTicks: number | null;
  /** Highest totalEarned an era ended with. */
  richestEraEarned: number;
  /** Best income per second ever seen. */
  bestIncomePerSec: number;
  /** All kupóny ever earned (privatizace + badges). */
  kuponyEarnedTotal: number;
}

export interface Meta {
  /** How many times the house has been privatized ("éra"). */
  prestigeLevel: number;
  /** Unspent privatizační kupóny. */
  kupony: number;
  perks: Record<PerkId, number>;
  badges: Record<BadgeId, boolean>;
  records: EraRecords;
}

/** Permanent Tuzex purchases (paid in bony). Káva is a repeatable consumable. */
export type TuzexId = 'tv' | 'pracka' | 'digitalky';

export type ProblemId = 'leak' | 'window' | 'radiator';

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
  /** Game tick of the move-in — some quirks (disident loyalty) depend on tenure. */
  movedInAt: number;
  /** One-shot quirk already fired (e.g. the disident loyalty bonus). */
  quirkDone: boolean;
  /** Tick when a filed eviction completes; null when no proceedings run. */
  evictionAt: number | null;
  /** What the tenant hides from the regime; null = spořádaný občan. */
  secret: SecretId | null;
  /** The správce knows the secret — spied out, or entrusted. */
  secretKnown: boolean;
  /** The secret was volunteered. Betraying a confidence cuts deeper. */
  confided: boolean;
  /** The správce actively covers for the tenant (shields StB visits). */
  covered: boolean;
  /** Tick when the reported tenant gets picked up; null = no hlášení filed. */
  arrestAt: number | null;
}

export interface Flat {
  /** Globally unique index across all buildings (drives weathering too). */
  index: number;
  /** 1-based floor number; ground floor (entrance, kočárkárna) is not a flat row. */
  floor: number;
  /** Index into GameState.buildings — a flat knows its panelák. */
  bldg: number;
  /** Rekonstrukce level 0–3: more rent, happier tenant, nicer window. */
  renovation: number;
  tenant: Tenant | null;
  problem: ProblemId | null;
}

export interface Building {
  floors: number;
  flats: Flat[];
  elevatorBroken: boolean;
  /** Index into the SITES table (location + its modifiers). */
  site: number;
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
  /** Context for resolvers that target a tenant (prosby). */
  flatIndex?: number;
  requestId?: string;
}

export interface GameStats {
  moveIns: number;
  moveOuts: number;
  eventsFired: number;
  breakdowns: number;
  /** Lifetime-of-era counters feeding the kádrový posudek. */
  brigadeClicks: number;
  stbVisits: number;
  /** Repairs completed by anyone — player, pan Fanda or the kutil. */
  repairsDone: number;
  /** Šmírování attempts this era. */
  spied: number;
  /** Secrets entrusted voluntarily. */
  confided: number;
  /** Tenants the správce covers for. Counts at the lustrace. */
  covered: number;
  /** Hlášení filed with the StB. Counts at the lustrace, the other way. */
  reported: number;
}

/** Sídliště mega-projects, built once per era, sequential unlock. */
export type ProjectId = 'samoobsluha' | 'skolka' | 'kulturak';

export type PlanId = 'earn' | 'movein' | 'fix' | 'happy' | 'brigade';

/** One rotating pětiletka assignment from the OV. */
export interface ActivePlan {
  id: PlanId;
  /** What counts as done (Kčs, counts, or accumulated ticks for 'happy'). */
  target: number;
  /** Counter value when the plan started (counter-based plans). */
  baseline: number;
  /** Accumulated progress for 'happy' (ticks at/above the threshold). */
  progress: number;
  /** Required average happiness for 'happy'. */
  threshold?: number;
  /** Tick when the plan expires. */
  deadline: number;
  rewardKcs: number;
  rewardBony: number;
  rewardKupon: boolean;
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
  /** Důvěra sousedů 0..100 — scales tenant move-in chance, unlocks svěřování. */
  reputation: number;
  /** Kádrový profil 0..100 — how the výbor sees you. Softens fines, moves the
   * pořadník; on 17. listopadu 1989 it stops mattering rather abruptly. */
  regime: number;
  /** Elán 0..100 — spent by the Akce Z work action, regenerates over time. */
  energy: number;
  /** Always length 1 in MVP; an array so a sídliště view doesn't need a schema rewrite. */
  buildings: Building[];
  meta: Meta;
  upgrades: Record<UpgradeId, boolean>;
  repeatables: Record<RepeatableId, number>;
  /** Courtyard buildables — rendered in the scene, unlock their own events. */
  courtyard: Record<CourtyardId, boolean>;
  /** Pan Fanda: auto-repairs paid from the fund, for a wage. */
  caretakerHired: boolean;
  /** Tuzex vouchers — the rare second currency. */
  bony: number;
  tuzex: Record<TuzexId, boolean>;
  /** Sídliště mega-projects built this era. */
  projects: Record<ProjectId, boolean>;
  /** The current pětiletka assignment, if any. */
  plan: ActivePlan | null;
  /** Tick when the next plan may be issued. */
  nextPlanAt: number;
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
