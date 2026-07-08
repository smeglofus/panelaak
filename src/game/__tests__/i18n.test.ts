import { afterEach, describe, expect, it } from 'vitest';
import { CS } from '../content.cs';
import { EN } from '../content.en';
import { getLang, setLang } from '../i18n';
import { formatDateCs } from '../calendar';

afterEach(() => setLang('cs'));

describe('language switch', () => {
  it('swaps the whole content in place and back', () => {
    const czechNewGame = CS.ui.newGame;
    setLang('en');
    expect(getLang()).toBe('en');
    expect(CS.ui.newGame).toBe(EN.ui.newGame);
    expect(CS.events.hotWater).toBe('No hot water today. Reason: no hot water.');
    expect(CS.badges.udernik.label).toBe('Shock worker');

    setLang('cs');
    expect(CS.ui.newGame).toBe(czechNewGame);
    expect(CS.events.hotWater).toBe('Teplá voda nepoteče. Důvod: nepoteče.');
  });

  it('interpolating functions work in both languages', () => {
    expect(CS.ui.flatsCount(3, 8)).toBe('3/8 bytů');
    setLang('en');
    expect(CS.ui.flatsCount(3, 8)).toBe('3/8 flats');
  });

  it('dates follow the language', () => {
    expect(formatDateCs({ year: 1989, month: 4, day: 14 })).toBe('14. dubna 1989');
    setLang('en');
    expect(formatDateCs({ year: 1989, month: 4, day: 14 })).toBe('14 April 1989');
  });
});
