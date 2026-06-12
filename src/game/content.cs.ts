// ALL Czech strings, names and flavor text live here (spec §3: hardcoded Czech,
// single content file). Identifiers stay English; the panelák speaks Czech.

import type { ArchetypeId, MilestoneId, UpgradeId } from './types';

export interface ArchetypeContent {
  label: string;
  /** Small pools picked by RNG (spec §6.3). */
  names: string[];
  flavor: string[];
}

export const CS = {
  title: 'PANELÁK TYCOON',
  subtitle: 'Správa domu v dobách reálného socialismu',

  ui: {
    fund: 'Domovní fond',
    reputation: 'Reputace',
    avgHappiness: 'Spokojenost',
    occupancy: 'Obsazenost',
    flatsCount: (occupied: number, total: number) => `${occupied}/${total} bytů`,
    buyFloor: 'Přistavět patro',
    maxFloorsNote: 'Víc pater OPBH nepovolí.',
    repairs: 'Údržba',
    repairElevator: 'Opravit výtah',
    elevatorBrokenSign: 'MIMO PROVOZ',
    elevatorBrokenSub: 'Oprava se zajišťuje.',
    repairLeak: 'Opravit trubku',
    leakInFlat: (flat: string) => `💧 Prasklá trubka — ${flat}`,
    upgrades: 'Vylepšení',
    owned: '✓ Pořízeno',
    milestones: 'Milníky',
    newGame: 'Nová hra',
    newGameConfirm:
      'Opravdu začít znovu? Celý dům, nájemníci i fond zmizí. Jako za asanace.',
    vacantFlat: 'Volný byt',
    vacantHint: 'Čeká na přidělení. Pořadník je dlouhý, ale někdo se najde.',
    rent: 'Nájem',
    happiness: 'Spokojenost',
    close: 'Zavřít',
    continue: 'Pokračovat',
    entrance: 'VCHOD',
    kocarkarna: 'KOČÁRKÁRNA',
    houseNumber: '1024/7',
    plaque: 'VZORNÝ DŮM SOCIALISTICKÉ PÉČE',
    flatLabel: (n: number) => `byt ${n}`,
    floorLabel: (n: number) => `${n}. patro`,
  },

  archetypes: {
    pensioner: {
      label: 'Důchodkyně s pejskem',
      names: ['Paní Vlasta (+ Azor)', 'Paní Božena (+ Brok)', 'Paní Jarmila (+ Punťa)'],
      flavor: [
        '„Za první republiky se takhle nevrtalo.“',
        '„Azor není hlučný. Azor je komunikativní.“',
        '„Já si nestěžuju, já jen informuju.“',
      ],
    },
    couple: {
      label: 'Mladý pár',
      names: ['Novákovi', 'Svobodovi', 'Dvořákovi'],
      flavor: [
        '„Vlastní byt! Po osmi letech pořadníku.“',
        '„Jednou budeme mít chatu. Jednou.“',
        '„Hlavně aby jel výtah, jsme nahoře.“',
      ],
    },
    drunk: {
      label: 'Pan domácí filozof',
      names: ['Pan Lojza', 'Pan Tonda', 'Pan Franta'],
      flavor: [
        '„Já nepiju. Já se hydratuju.“',
        '„Mejdan? To byla kulturní vložka.“',
        '„Dvanáctka je tekutej chleba, soudruhu.“',
      ],
    },
    vekslak: {
      label: 'Vekslák',
      names: ['Pan Karel', 'Pan Ríša', 'Pan Mirek'],
      flavor: [
        '„Bony? Jaký bony. Tyhle bony?“',
        '„Mám známýho, co má známýho.“',
        '„Marlborky? Pro tebe kamarádská cena.“',
      ],
    },
    shift: {
      label: 'Jeřábnice',
      names: ['Soudružka Marta', 'Soudružka Květa', 'Soudružka Zdena'],
      flavor: [
        '„Ranní, odpolední, noční. A znovu.“',
        '„Jeřáb se sám neřídí.“',
        '„Hlavně klid na spaní po šichtě.“',
      ],
    },
  } satisfies Record<ArchetypeId, ArchetypeContent>,

  toasts: {
    moveIn: (name: string, flat: string) => `Nový nájemník: ${name} (${flat}).`,
    moveOut: (name: string, flat: string) =>
      `${name} vrací klíče od bytu (${flat}). Prý „se to nedalo vydržet“.`,
    floorBought: (floor: number) => `Přistavěno ${floor}. patro. Beton ještě schne.`,
    upgradeBought: (name: string) => `Pořízeno: ${name}.`,
    elevatorBroke: 'Výtah se porouchal. Zase.',
    elevatorFixed: 'Výtah opraven. Drží to izolepou, ale jede.',
    leak: (flat: string) => `V bytě praskla trubka (${flat}). Instalatér má dovolenou.`,
    leakFixed: (flat: string) => `Trubka opravena (${flat}). Tentokrát snad doopravdy.`,
  },

  events: {
    hotWater: 'Teplá voda nepoteče. Důvod: nepoteče.',
    hotWaterEnd: 'Teplá voda opět teče. Zázraky se dějí.',
    kscFine: (kcs: string) =>
      `Kontrola z OV KSČ: „Soudruzi, takhle to teda nejde.“ Pokuta ${kcs}.`,
    kscPraise: 'Kontrola z OV KSČ: „Vzorný vchod, soudruzi. Jen tak dál.“',
    stbGone: (name: string) =>
      `Návštěva StB. ${name} se odstěhoval. Rychle. V noci. Beze stop.`,
    stbFee: (kcs: string) =>
      `Návštěva StB. Vyřešeno „administrativním poplatkem“ ${kcs}. Neptejte se.`,
    mejdan: (floor: number) =>
      `Mejdan u Lojzy. Michal David do tří do rána. ${floor}. patro nespí.`,
    bananas: 'V Jednotě dnes mají banány. Celý dům má důvod žít.',
    satelliteReported: (kcs: string) =>
      `Soused to nahlásil. Satelit zabaven, pokuta ${kcs}. Anténa oficiálně nikdy neexistovala.`,
    schuzeTitle: 'Domovní schůze',
    schuzeBody:
      'Bod 1: údržba zeleně. Bod 2: kdo zaplatí chlebíčky? Bod 3: různé (nikdo neví, co to znamená, ale potrvá to nejdéle).',
    schuzePay: (kcs: string) => `Zaplatit chlebíčky (${kcs})`,
    schuzeSkip: 'Nechat být (sousedé si to zapamatují)',
    schuzePaid: 'Chlebíčky byly. Schůze proběhla v duchu vzájemného porozumění.',
    schuzeSkipped: 'Bez chlebíčků. Schůze skončila povzdechem a zápisem.',
  },

  milestones: {
    firstFullFloor: {
      label: 'První plné patro',
      toast: 'První patro je plné. Sousedské vztahy mohou začít.',
    },
    first1000: {
      label: 'Prvních 1 000 Kčs',
      toast: 'Vyděláno prvních 1 000 Kčs. Domovní správa je opatrně spokojena.',
    },
    elevatorInstalled: {
      label: 'Výtah nainstalován',
      toast: 'Dům má výtah. Občas i pojede.',
    },
    eightFloors: {
      label: 'Osm pater',
      toast: 'Osm pater hotovo. Důstojný panelák, soudruzi.',
    },
    vzornyDum: {
      label: 'Vzorný dům socialistické péče',
      toast: 'Dům získal titul „Vzorný dům socialistické péče“. Cedule visí na fasádě.',
    },
  } satisfies Record<MilestoneId, { label: string; toast: string }>,

  upgrades: {
    elevatorNdr: {
      name: 'Lepší výtah (NDR import)',
      desc: 'Poloviční poruchovost. Východoněmecká kvalita.',
    },
    cellar: {
      name: 'Sklepní kóje',
      desc: '+10 % nájemného. Vlastní kóje = spokojený nájemník.',
    },
    satellite: {
      name: 'Satelit na střechu',
      desc: '+20 spokojenosti všem. Riziko: soused to může nahlásit.',
    },
    laundry: {
      name: 'Prádelna (mandl)',
      desc: 'Spokojenost se obnovuje rychleji. Vůně čistého prádla.',
    },
  } satisfies Record<UpgradeId, { name: string; desc: string }>,

  offline: {
    title: 'Zatímco jste byl/a pryč…',
    away: (h: number, m: number) =>
      h > 0 ? `Byl/a jste pryč ${h} h ${m} min.` : `Byl/a jste pryč ${m} min.`,
    earned: (kcs: string) => `Nájemné mezitím přineslo ${kcs}.`,
    rateNote: 'Bez dozoru běží dům na 50 %. Víc než 8 hodin se nepočítá — normy.',
    flavor: [
      'Pan Lojza tvrdí, že nic neslyšel.',
      'Paní Vlasta všechno viděla a všechno si zapsala.',
      'Azor štěkal. Důvod: pošťák, vítr, ticho.',
      'Někdo si půjčil žebřík ze sklepa. Vrátí ho. Určitě.',
      'Ve schránkách přistálo Rudé právo. Všem.',
      'Na klepadle visel koberec. Už nevisí.',
    ],
  },
};

export const ARCHETYPE_EMOJI: Record<ArchetypeId, string> = {
  pensioner: '👵',
  couple: '👫',
  drunk: '🥴',
  vekslak: '🕶️',
  shift: '👷‍♀️',
};
