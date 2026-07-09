// Game calendar: pure functions over the tick counter. The game starts on
// 1. dubna 1988; a 360-day year (12 × 30 days) takes 3 real hours of play.
// Winter brings heating costs and radiator trouble, July brings the annual
// planned hot-water outage — and in 1990 the privatizace era begins.

import { getLang } from './i18n';

export const SECONDS_PER_DAY = 30;
export const DAYS_PER_MONTH = 30;
export const MONTHS_PER_YEAR = 12;

export const START_YEAR = 1988;
export const START_MONTH = 4; // duben — be kind, don't start the game in winter
export const START_DAY = 1;

export interface GameDate {
  year: number;
  /** 1–12 */
  month: number;
  /** 1–30 */
  day: number;
}

export function dateFromTick(tick: number): GameDate {
  const startDays = (START_MONTH - 1) * DAYS_PER_MONTH + (START_DAY - 1);
  const totalDays = Math.floor(tick / SECONDS_PER_DAY) + startDays;
  const year = START_YEAR + Math.floor(totalDays / (DAYS_PER_MONTH * MONTHS_PER_YEAR));
  const dayOfYear = totalDays % (DAYS_PER_MONTH * MONTHS_PER_YEAR);
  return {
    year,
    month: Math.floor(dayOfYear / DAYS_PER_MONTH) + 1,
    day: (dayOfYear % DAYS_PER_MONTH) + 1,
  };
}

export function isWinter(date: GameDate): boolean {
  return date.month === 12 || date.month <= 2;
}

export function isSummer(date: GameDate): boolean {
  return date.month >= 6 && date.month <= 8;
}

/** True on the tick where the calendar first shows the given day. */
export function dateJustReached(tick: number, month: number, day: number): boolean {
  if (tick < 1) return false;
  const now = dateFromTick(tick);
  if (now.month !== month || now.day !== day) return false;
  const before = dateFromTick(tick - 1);
  return before.month !== month || before.day !== day;
}

const MONTHS_GENITIVE = [
  'ledna',
  'února',
  'března',
  'dubna',
  'května',
  'června',
  'července',
  'srpna',
  'září',
  'října',
  'listopadu',
  'prosince',
];

const MONTHS_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function formatDateCs(date: GameDate): string {
  if (getLang() === 'en') {
    return `${date.day} ${MONTHS_EN[date.month - 1]} ${date.year}`;
  }
  return `${date.day}. ${MONTHS_GENITIVE[date.month - 1]} ${date.year}`;
}

export function seasonEmoji(date: GameDate): string {
  if (isWinter(date)) return '❄️';
  if (isSummer(date)) return '☀️';
  return date.month <= 5 ? '🌱' : '🍂';
}

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export function seasonKey(date: GameDate): Season {
  if (isWinter(date)) return 'winter';
  if (isSummer(date)) return 'summer';
  return date.month <= 5 ? 'spring' : 'autumn';
}
