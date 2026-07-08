// Language switch. All call sites import the CS object directly, so switching
// works by swapping its top-level properties in place — no touchpoint changes.
// Log entries already written stay in their original language (the kronika
// remembers what it remembers).

import { CS } from './content.cs';
import { EN } from './content.en';

export type Lang = 'cs' | 'en';

/** Pristine copy of the Czech top level, taken before any swap. */
const CZECH = { ...CS };

let current: Lang = 'cs';

export function getLang(): Lang {
  return current;
}

export function setLang(lang: Lang): void {
  current = lang;
  Object.assign(CS, lang === 'en' ? EN : CZECH);
}
