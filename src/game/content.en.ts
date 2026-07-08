// English translation of the game content. Typed as `typeof CS`, so the
// compiler guarantees the shape stays in sync with the Czech original.
// Czech proper nouns (Akce Z, Tuzex, bony, paní Vlasta…) stay — they are
// the identity, the grammar around them switches.

import type { CS } from './content.cs';

export const EN: typeof CS = {
  title: 'PANELÁK TYCOON',
  subtitle: 'Housing-block management in the age of real socialism',

  ui: {
    panelHeader: 'HOUSE ADMINISTRATION',
    fund: 'House fund',
    reputation: 'Reputation',
    avgHappiness: 'Happiness',
    occupancy: 'Occupancy',
    flatsCount: (occupied: number, total: number) => `${occupied}/${total} flats`,
    buyFloor: 'Add a floor',
    maxFloorsNote: 'The housing office won’t approve anything taller.',
    repairs: 'Maintenance',
    repairElevator: 'Repair elevator',
    elevatorBrokenSign: 'OUT OF ORDER',
    elevatorBrokenSub: 'Repair is being arranged.',
    repairLeak: 'Fix the pipe',
    leakInFlat: (flat: string) => `💧 Burst pipe — ${flat}`,
    upgrades: 'Upgrades',
    owned: '✓ Owned',
    milestones: 'Milestones',
    newGame: 'New game',
    newGameConfirm:
      'Really start over? The house, tenants and fund will vanish. Like an urban renewal project.',
    vacantFlat: 'Vacant flat',
    vacantHint: 'Awaiting allocation. The waiting list is long, someone will turn up.',
    rent: 'Rent',
    happiness: 'Happiness',
    close: 'Close',
    continue: 'Continue',
    entrance: 'ENTRANCE',
    kocarkarna: 'PRAM ROOM',
    houseNumber: '1024/7',
    plaque: 'MODEL HOUSE OF SOCIALIST CARE',
    flatLabel: (n: number) => `flat ${n}`,
    floorLabel: (n: number) => `floor ${n}`,
    milestoneReward: (kcs: string) => `Bonus from the housing office: ${kcs}.`,
    brigade: 'Akce Z',
    brigadeAction: 'Lend a hand',
    brigadeHint: 'Voluntarily mandatory beautification of the surroundings.',
    energy: 'Zeal',
    kronika: 'House chronicle',
    kronikaEmpty: 'Nothing has happened yet. That will change.',
    help: 'Help',
    domovnik: 'Caretaker',
    hireCaretaker: (wage: string) => `Hire pan Fanda (wage ${wage})`,
    fireCaretaker: 'Dismiss',
    caretakerOnDuty: 'Pan Fanda: on duty.',
    caretakerIdle: 'Pan Fanda is smoking in the pram room. Everything works.',
    caretakerHint: 'Pays for repairs from the fund and does them himself. Mostly. Eventually.',
    caretakerLocked: 'A caretaker makes sense from 3 floors up.',
    dvorek: 'Courtyard',
    modernizace: 'Modernization',
    influences: 'What affects them',
    heating: (kcs: string) => `Heating season: −${kcs}`,
    bony: (n: number) => `${n} bony`,
    tuzex: 'Tuzex',
    tuzexHint: 'Bony come from the vekslák and from milestones. Don’t ask where from.',
    evict: 'File for eviction',
    evictionPending: (sec: number) => `Eviction proceedings under way… (${sec} s)`,
    evictionRefused: 'Application denied. Three chairmen have tried already.',
  },

  problems: {
    leak: {
      repair: 'Fix the pipe',
      list: (flat: string) => `💧 Burst pipe — ${flat}`,
      fixed: (flat: string) => `Pipe fixed (${flat}). For real this time. Probably.`,
      caretakerFixed: (flat: string, kcs: string) =>
        `Pan Fanda replaced the pipe (${flat}, −${kcs}).`,
    },
    window: {
      repair: 'Reglaze the window',
      list: (flat: string) => `⚽ Broken window — ${flat}`,
      fixed: (flat: string) => `Window reglazed (${flat}). The glazier billed the travel too.`,
      caretakerFixed: (flat: string, kcs: string) =>
        `Pan Fanda reglazed the window (${flat}, −${kcs}).`,
    },
    radiator: {
      repair: 'Bleed the radiator',
      list: (flat: string) => `🥶 Cold radiator — ${flat}`,
      fixed: (flat: string) => `The radiator heats again (${flat}). The bleed key turned up.`,
      caretakerFixed: (flat: string, kcs: string) =>
        `Pan Fanda bled the radiator (${flat}, −${kcs}).`,
    },
  },

  courtyard: {
    piskoviste: {
      name: 'Sandbox',
      desc: 'Families with kids are happier. Risk: courtyard football.',
    },
    lavicky: {
      name: 'Benches',
      desc: 'The pensioners get a vantage point. For everything and everyone.',
    },
    zahonky: {
      name: 'Garden beds',
      desc: 'The smell of tomatoes for the whole house. Sometimes a harvest, sometimes a thief.',
    },
    susak: {
      name: 'Laundry dryer',
      desc: 'Clean laundry in the wind. A small joy for everyone.',
    },
    garaz: {
      name: 'Garage',
      desc: 'The vekslák pays 20 % more. And Trabants stop blocking the entrance.',
    },
  },

  factors: {
    winter: 'Heating season',
    summer: 'Summer on the estate',
    radiator: 'Cold radiator',
    tv: 'Colour TV on the shared antenna',
    satellite: 'Satellite dish on the roof',
    zahonky: 'Garden beds in the courtyard',
    susak: 'Laundry dryer',
    piskoviste: 'Sandbox under the windows',
    lavicky: 'Benches by the house',
    hotWater: 'No hot water',
    hotWaterFamily: 'Nowhere to bathe the kids',
    leak: 'Burst pipe',
    window: 'Broken window',
    elevator: 'Broken elevator',
    elevatorCouple: 'Stairs. Every day. On foot.',
    pensionerDrag: 'Complaints from the lady with the dog',
    svazakDrag: 'The comrade next door takes notes',
    musicianDrag: 'Evening instrument practice',
  },

  help: {
    title: 'How to run a panelák',
    tips: [
      'Tenants pay rent every second — the happier, the more. Click a flat to see who lives there.',
      'Spend your Kčs on new floors, elevator and pipe repairs, and upgrades on the notice board.',
      'Can’t afford the first floor? Akce Z: while you have zeal, keep clicking. Zeal regenerates on its own.',
      'Every tenant is different: the vekslák pays 1.5× but attracts attention. Paní Vlasta never moves out. Never.',
      'From 3 floors up you can hire a caretaker — he handles (and pays for) repairs himself.',
      'The courtyard is not just grass: a sandbox, benches or garden beds lift the mood and bring events.',
      'Time passes: winter means heating bills (and cold radiators), July 1st brings the outage. Spend the vekslák’s bony in Tuzex.',
      'An inconvenient tenant can be evicted — for money, reputation and 60 seconds of official proceedings. Not paní Vlasta.',
      'Money never goes to waste: Modernization raises rent forever. And from 1990 you can privatize — start over with kupóny and permanent perks.',
      'Finish eight floors and the housing office allots another plot — an estate of up to three houses, each with its own character. Cadre-file badges survive everything.',
      'Closing the tab is fine — the house keeps earning at 50 % (8 h cap). The game saves automatically.',
      'The goal: 8 floors, full house, 80 % happiness = the title “Model House of Socialist Care”.',
    ],
    ok: 'Understood, comrades',
  },

  archetypes: {
    pensioner: {
      label: 'Pensioner with a dog',
      names: ['Paní Vlasta (+ Azor)', 'Paní Božena (+ Brok)', 'Paní Jarmila (+ Punťa)'],
      flavor: [
        '“They didn’t drill like this under the First Republic.”',
        '“Azor is not loud. Azor is communicative.”',
        '“I’m not complaining, I’m merely informing.”',
      ],
    },
    couple: {
      label: 'Young couple',
      names: ['The Nováks', 'The Svobodas', 'The Dvořáks'],
      flavor: [
        '“Our own flat! After eight years on the list.”',
        '“One day we’ll have a cottage. One day.”',
        '“Just let the elevator run, we’re up top.”',
      ],
    },
    drunk: {
      label: 'House philosopher',
      names: ['Pan Lojza', 'Pan Tonda', 'Pan Franta'],
      flavor: [
        '“I don’t drink. I hydrate.”',
        '“A party? That was a cultural interlude.”',
        '“Lager is liquid bread, comrade.”',
      ],
    },
    vekslak: {
      label: 'Vekslák',
      names: ['Pan Karel', 'Pan Ríša', 'Pan Mirek'],
      flavor: [
        '“Bony? What bony. These bony?”',
        '“I know a guy who knows a guy.”',
        '“Marlboros? Friend price, just for you.”',
      ],
    },
    shift: {
      label: 'Crane operator',
      names: ['Comrade Marta', 'Comrade Květa', 'Comrade Zdena'],
      flavor: [
        '“Morning shift, afternoon, night. Repeat.”',
        '“The crane doesn’t drive itself.”',
        '“All I ask is quiet after a shift.”',
      ],
    },
    kutil: {
      label: 'Handyman',
      names: ['Pan Jarda', 'Pan Standa', 'Pan Véna'],
      flavor: [
        '“I’ll fix that myself.”',
        '“I have a tool for it. I have a tool for everything.”',
        '“Wall plugs hold this house together.”',
      ],
    },
    svazak: {
      label: 'Youth-league man',
      names: ['Comrade Milan', 'Comrade Zdeněk', 'Comrade Ivo'],
      flavor: [
        '“Meetings are the foundation.”',
        '“Entrance hall reported: exemplary.”',
        '“I updated the notice board. Again.”',
      ],
    },
    disident: {
      label: 'Dissident',
      names: ['Pan Šafář', 'Pan Vohryzek', 'Paní Olga'],
      flavor: [
        '“I signed nothing.”',
        '“Books? What books.”',
        '“Walls have ears, comrade. Even prefab ones.”',
      ],
    },
    family: {
      label: 'Family with kids',
      names: ['The Holubs (+ 2 kids)', 'The Veselýs (+ 2 kids)', 'The Maláčs (+ 3 kids)'],
      flavor: [
        '“Kids need fresh air and a sandbox.”',
        '“The pram is finally in the pram room.”',
        '“Two rooms are livable. They have to be.”',
      ],
    },
    musician: {
      label: 'Musician',
      names: ['Maestro Vašek (violin)', 'Miss Eva (piano)', 'Pan Bedřich (french horn)'],
      flavor: [
        '“Art demands sacrifice. Mostly from the neighbours.”',
        '“I only practise till ten. Ten p.m.”',
        '“Dvořák would have understood.”',
      ],
    },
  },

  toasts: {
    moveIn: (name: string, flat: string) => `New tenant: ${name} (${flat}).`,
    moveOut: (name: string, flat: string) =>
      `${name} returned the keys (${flat}). Said it “couldn’t be endured”.`,
    floorBought: (floor: number) => `Floor ${floor} added. The concrete is still drying.`,
    upgradeBought: (name: string) => `Acquired: ${name}.`,
    elevatorBroke: (site: string) => `The elevator (${site}) broke down. Again.`,
    elevatorFixed: 'Elevator repaired. Held together with tape, but it runs.',
    leak: (flat: string) => `A pipe burst (${flat}). The plumber is on holiday.`,
    musicianMoveIn: 'Culture has moved into the house. Reputation rises.',
    disidentLoyal:
      'Half an hour in and the house stays silent. The neighbours hold together. Reputation rises.',
    kutilFix: (flat: string) =>
      `Pan Jarda noticed the burst pipe (${flat}) and fixed it. Didn’t ask.`,
    caretakerHired:
      'Pan Fanda started as caretaker. First thing: hung his string bag in the pram room.',
    caretakerFired: 'Pan Fanda quit. Took the string bag with him.',
    caretakerElevator: (kcs: string) => `Pan Fanda repaired the elevator (−${kcs}).`,
    courtyardBuilt: (name: string) => `New in the courtyard: ${name}.`,
    evictionFiled: (name: string) =>
      `Eviction filed: ${name}. The stamps are drying, the neighbours are whispering.`,
    evictionDone: (name: string, flat: string) =>
      `${name} moved out officially (${flat}). Justice, our way.`,
    bonReceived: 'An envelope with a bon landed in the mailbox. Pan Karel knows nothing.',
    bonyAwarded: (n: number) => `The reward came with ${n} bony. Unofficially.`,
    tuzexBought: (name: string) => `Delivered from Tuzex: ${name}.`,
    repeatableBought: (name: string, level: number) =>
      `${name} — level ${level}. The house keeps getting better.`,
    kavaServed:
      'Tuzex coffee and chocolate made the rounds. The whole house feels classy.',
  },

  events: {
    hotWater: 'No hot water today. Reason: no hot water.',
    hotWaterEnd: 'Hot water flows again. Miracles happen.',
    kscFine: (kcs: string) =>
      `Party committee inspection: “Comrades, this simply won’t do.” Fine: ${kcs}.`,
    kscPraise: 'Party committee inspection: “Exemplary entrance, comrades. Carry on.”',
    stbGone: (name: string) =>
      `A visit from the StB. ${name} moved out. Quickly. At night. Without a trace.`,
    stbFee: (kcs: string) =>
      `A visit from the StB. Settled with an “administrative fee” of ${kcs}. Don’t ask.`,
    mejdan: (floor: number) =>
      `Party at Lojza’s. Pop hits till three a.m. Floor ${floor} isn’t sleeping.`,
    bananas: 'The grocery has bananas today. The whole house has a reason to live.',
    melouch: (flat: string) =>
      `Off-the-books job. A brother-in-law’s friend “fixed” the pipe (${flat}). Amazingly, it holds.`,
    jitrnice:
      'The crane operator brought sausages from the countryside. The whole house smells of pig feast.',
    satelliteReported: (kcs: string) =>
      `A neighbour reported it. Dish confiscated, fine ${kcs}. Officially the antenna never existed.`,
    schuzeTitle: 'House meeting',
    schuzeBody:
      'Item 1: greenery maintenance. Item 2: who pays for the sandwiches? Item 3: miscellaneous (nobody knows what it means, but it takes the longest).',
    schuzePay: (kcs: string) => `Pay for the sandwiches (${kcs})`,
    schuzeSkip: 'Let it be (the neighbours will remember)',
    schuzePaid: 'There were sandwiches. The meeting proceeded in a spirit of mutual understanding.',
    schuzeSkipped: 'No sandwiches. The meeting ended with a sigh and an entry in the minutes.',
    kscSvazak:
      'Party committee inspection: the youth-league comrade vouched for the house. “Exemplary work.”',
    stbDisidentGone: (name: string) =>
      `${name} disappeared. At six a.m. Nobody saw anything, nobody heard anything.`,
    stbSearch: 'A house search at three a.m. They were looking for books. The whole floor stayed awake.',
    vrtani: (floor: number) =>
      `Saturday, 7:00. Pan Jarda’s drill wakes floor ${floor}. Reason unknown, end nowhere in sight.`,
    okno: (flat: string) => `Courtyard football. The ball won its duel with a window (${flat}).`,
    rajcata: 'Harvest from the garden beds. Tomatoes for the whole house. Even pan Lojza, though he doesn’t know why.',
    zlodej: 'Someone stripped the garden beds overnight. Paní Vlasta has opened her own investigation.',
    trabant:
      'A stranger’s Trabant has been parked at the entrance for a week. Nobody knows whose. Nobody confesses.',
    azorTitle: 'Azor is missing',
    azorBody:
      'Paní Vlasta stands at the door, silent. Azor is gone. The house has a chance to show character.',
    azorSearch: (kcs: string) => `Organize a search (${kcs})`,
    azorSkip: 'Let it be (he’ll come back… probably)',
    azorFound: 'Azor found in the boiler room. Asleep. Paní Vlasta thanks the whole house.',
    azorReturned:
      'Azor came back on his own. After two days. He smells of coal and nobody knows why.',
    odstavka:
      'Planned hot-water outage. The plan is the plan. Restoration date: to be specified.',
    vanoce: 'Christmas Eve. Cookies circulate between floors and for a moment everyone is a neighbour.',
    radiator: (flat: string) => `A radiator went cold (${flat}). The boiler men are doing what they can. Allegedly.`,
    majTitle: 'May Day',
    majBody:
      'The parade approaches. The house administration expects entrance decorations. Expects them very much.',
    majDecorate: (kcs: string) => `Decorate the entrance (${kcs})`,
    majSkip: 'Leave the notice board be',
    majDecorated: 'The entrance shone. Paper flags, carnations, a banner. The comrades are satisfied.',
    majSkipped: 'The notice board stayed bare. The comrades noticed. And wrote it down.',
    teta: 'A parcel from the aunt in Vienna. Coffee, bony and a scent the grocery has never known.',
    prosbaTitle: 'A tenant’s request',
    volbyTitle: 'Elections',
    volbyBody:
      'The polling station is open. Attendance is expected to be demonstrative. Your tenants are watching what the house administration does.',
    volbyGo: 'March demonstratively (and bring the neighbours)',
    volbySkip: 'Stay home',
    volbyWent: 'Turnout 99.4 %. The election committee noted your enthusiasm. The queue was long.',
    volbySkipped: 'You didn’t go. Nobody said anything. Everybody wrote it down.',
    pout: 'The funfair is here! Shooting range, candy floss, carousel. The kids wanted coins and got them.',
    inventura: 'Stocktaking at the grocery. They have nothing. Not even a queue. The estate mourns.',
    stehovani: (floor: number) =>
      `Furniture moving. A wall unit is going to floor ${floor}. By stairs. Under loud expert supervision.`,
  },

  requests: {
    pes: {
      body: (name: string) => `${name} asks for a dog permit. “He’ll be good. Mostly.”`,
      allow: 'Allow the dog',
      refuse: 'Refuse',
      allowed: 'Dog allowed. Barking counts as life in the house.',
      refused: 'Dog refused. The flat has been suspiciously quiet since.',
    },
    odklad: {
      body: (name: string) =>
        `${name} asks to defer the rent. “Till payday, comrade. Scout’s honour.”`,
      allow: 'Allow the deferral (20 Kčs from the fund)',
      refuse: 'Refuse',
      allowed: 'Deferral granted. The gratitude is great; so is the debt.',
      refused: 'Deferral refused. They talk about you at the taproom.',
    },
    zabradli: {
      body: (name: string) => `${name} asks for the railing to be fixed. “It’s nothing, just my knee.”`,
      allow: 'Fix the railing (25 Kčs)',
      refuse: 'Postpone to the meeting',
      allowed: 'The railing holds. The house pensioners send word that they appreciate it.',
      refused: 'The railing can wait. The pensioners remember. They remember everything.',
    },
    nedele: {
      body: (name: string) =>
        `${name} asks for permission to drill on Sunday. “Just a few holes. A hundred at most.”`,
      allow: 'Allow Sunday drilling',
      refuse: 'Refuse',
      allowed: 'Drilling allowed. The handyman beams, the floor grits its teeth.',
      refused: 'Drilling refused. The handyman sadly strokes his hammer drill.',
    },
    zarovka: {
      body: (name: string) =>
        `${name} asks for the hallway bulb to be replaced. “Three weeks of pitch dark now.”`,
      allow: 'Replace the bulb (10 Kčs)',
      refuse: 'Darkness saves electricity',
      allowed: 'The hallway lit up. A small thing, but the house noticed.',
      refused: 'The hallway stays dark. Like your standing with the tenant.',
    },
    zkouska: {
      body: (name: string) =>
        `${name} asks for a rehearsal space in the pram room. “Chamber repertoire only. Mostly.”`,
      allow: 'Allow rehearsals',
      refuse: 'Refuse',
      allowed: 'Strings sound through the pram room. The prams got used to it; the neighbours, slowly.',
      refused: 'Rehearsals refused. The artist suffers. Loudly, and in a minor key.',
    },
    kralikarna: {
      body: (name: string) =>
        `${name} asks for a rabbit hutch behind the house. “Fresh meat, comrade. And the kids will learn something.”`,
      allow: 'Allow the hutch (30 Kčs)',
      refuse: 'Refuse',
      allowed: 'A rabbit hutch grew behind the house. The shift workers have weekend plans now.',
      refused: 'Hutch refused. The rabbits sighed with relief; the shift workers didn’t.',
    },
  },

  tuzex: {
    tv: {
      name: 'Colour television',
      desc: 'Into the shared antenna. The whole house watches in colour (+10 happiness for all).',
    },
    pracka: {
      name: 'West German washing machine',
      desc: 'For the laundry room. Happiness recovers even faster. Requires the laundry room.',
    },
    digitalky: {
      name: 'Digital watch for the caretaker',
      desc: 'Pan Fanda manages repairs twice as fast. Mostly he likes showing it off.',
    },
  },

  kava: {
    name: 'Coffee and chocolate for the meeting',
    desc: 'One-off +15 happiness for everyone. Can be bought repeatedly.',
  },

  repeatables: {
    renovace: {
      name: 'Bathroom-core renovation',
      desc: '+5 % rent per level. Plastic core replaces plastic core, but a new one.',
    },
    naradi: {
      name: 'Better tools for Akce Z',
      desc: '+2 Kčs per click per level. Kit makes the master.',
    },
  },

  prestige: {
    title: 'Privatization',
    era: (n: number) => `era ${n}`,
    kupony: (n: number) => `${n} kupóny`,
    rumour: 'Something is happening. On the radio, in the streets, in the queues. Still just whispers.',
    available:
      'The times have changed. The house can be privatized: you start over, but kupóny and permanent perks remain. And every era adds +5 % rent.',
    projected: (n: number) => `Estimated yield: ${n} kupóny`,
    button: 'Privatize the house',
    confirm:
      'Really privatize? The house, tenants and fund will vanish. Kupóny, permanent perks and memories remain. That’s how privatization goes.',
    done: (n: number) =>
      `Privatized. You gained ${n} kupóny. The house has a new administrator — you. Again.`,
    perkBought: (name: string, level: number) => `Permanent perk: ${name} (level ${level}).`,
    perksTitle: 'Permanent perks (for kupóny)',
    level: (n: number) => `level ${n}`,
    maxed: 'MAX',
  },

  sites: [
    {
      name: 'Jiráskova 7',
      desc: 'The original house. The standard the comrades are used to.',
      factor: '',
    },
    {
      name: 'By the Factory',
      desc: '+15 % rent, faster move-ins — but chimney smoke (−5 happiness).',
      factor: 'Smoke from the factory',
    },
    {
      name: 'By the Forest',
      desc: 'Peace and fresh air (+8 happiness), but far from the bus stop: −5 % rent, slower move-ins.',
      factor: 'Forest behind the house',
    },
  ],

  sidliste: {
    title: 'Housing estate',
    buyPlot: (name: string, kcs: string) => `Buy the plot ${name} (${kcs})`,
    needFullHouse: 'The housing office will allot another plot once the current house is fully built (8 floors).',
    complete: 'The estate is complete. Three houses, one administrator, zero peace.',
    plotBought: (name: string) =>
      `Plot allotted: ${name}. The excavators arrived immediately — a rare sight indeed.`,
  },

  badges: {
    udernik: {
      label: 'Shock worker',
      desc: '250 shifts in Akce Z.',
      toast: 'Cadre file: SHOCK WORKER. 250 shifts in Akce Z. A hand like a shovel, +1 kupón.',
    },
    provereny: {
      label: 'Vetted',
      desc: 'Survive 5 StB visits.',
      toast: 'Cadre file: VETTED. Fifth StB visit and still here. +1 kupón.',
    },
    plnyDum: {
      label: 'Full house',
      desc: 'All 16 flats occupied.',
      toast: 'Cadre file: FULL HOUSE. Sixteen flats, sixteen stories. +1 kupón.',
    },
    milionar: {
      label: 'Socialist millionaire',
      desc: 'Earn 1 000 000 Kčs in total.',
      toast: 'Cadre file: MILLIONAIRE. A million crowns. Officially you don’t exist. +1 kupón.',
    },
    prezimoval: {
      label: 'Overwintered',
      desc: 'Survive a whole heating season.',
      toast: 'Cadre file: OVERWINTERED. The radiators went cold, the house stands. +1 kupón.',
    },
    budovatel: {
      label: 'Estate builder',
      desc: 'Manage three paneláky at once.',
      toast: 'Cadre file: BUILDER. Three houses, one string bag of keys. +1 kupón.',
    },
    vzorny: {
      label: 'Model administrator',
      desc: 'Earn the Model House of Socialist Care title.',
      toast: 'Cadre file: MODEL ADMINISTRATOR. The plaque doesn’t lie. +1 kupón.',
    },
    kapitalista: {
      label: 'Voucher capitalist',
      desc: 'Carry out a privatization.',
      toast: 'Cadre file: CAPITALIST. You never forget your first privatization. +1 kupón.',
    },
  },

  posudek: {
    title: 'Cadre file',
    hint: 'Badges survive every privatization. Each carries a kupón.',
  },

  perks: {
    beton: {
      name: 'Better concrete',
      desc: '−4 % off floor prices per level. Panels that hold even without slogans.',
    },
    konexe: {
      name: 'Committee connections',
      desc: '−10 % off all fines and “fees” per level. A friend has a friend.',
    },
    stribro: {
      name: 'Family silver',
      desc: '+500 Kčs at the start of every era. Grandma’s china is not for sale. Almost.',
    },
    povest: {
      name: 'Good administrator’s reputation',
      desc: '+5 reputation at the start of every era. People remember.',
    },
    rucicky: {
      name: 'Golden hands',
      desc: '+3 Kčs per click in Akce Z. Forever.',
    },
  },

  milestones: {
    firstFullFloor: {
      label: 'First full floor',
      toast: 'The first floor is full. Neighbourly relations may commence.',
    },
    first1000: {
      label: 'First 1 000 Kčs',
      toast: 'First 1 000 Kčs earned. The house administration is cautiously satisfied.',
    },
    elevatorInstalled: {
      label: 'Elevator installed',
      toast: 'The house has an elevator. It may even run.',
    },
    eightFloors: {
      label: 'Eight floors',
      toast: 'Eight floors done. A dignified panelák, comrades.',
    },
    vzornyDum: {
      label: 'Model House of Socialist Care',
      toast: 'The house earned the title “Model House of Socialist Care”. The plaque hangs on the facade.',
    },
  },

  upgrades: {
    elevatorNdr: {
      name: 'Better elevator (GDR import)',
      desc: 'Half the breakdown rate. East German quality.',
    },
    cellar: {
      name: 'Cellar storage stalls',
      desc: '+10 % rent. Your own stall = a satisfied tenant.',
    },
    satellite: {
      name: 'Satellite dish on the roof',
      desc: '+20 happiness for everyone. Risk: a neighbour might report it.',
    },
    laundry: {
      name: 'Laundry room (mangle)',
      desc: 'Happiness recovers faster. The scent of clean linen.',
    },
  },

  offline: {
    title: 'While you were away…',
    away: (h: number, m: number) =>
      h > 0 ? `You were away ${h} h ${m} min.` : `You were away ${m} min.`,
    earned: (kcs: string) => `Rent brought in ${kcs} meanwhile.`,
    rateNote: 'Unsupervised, the house runs at 50 %. Beyond 8 hours doesn’t count — norms.',
    flavor: [
      'Pan Lojza claims he heard nothing.',
      'Paní Vlasta saw everything and wrote everything down.',
      'Azor barked. Reason: the postman, the wind, the silence.',
      'Someone borrowed the ladder from the cellar. They’ll return it. Surely.',
      'The party newspaper landed in every mailbox. Everyone’s.',
      'A carpet hung on the beating rack. It hangs no more.',
    ],
  },
};
