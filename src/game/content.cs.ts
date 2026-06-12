// ALL Czech strings, names and flavor text live here (spec §3: hardcoded Czech,
// single content file). Identifiers stay English; the panelák speaks Czech.

import type {
  ArchetypeId,
  CourtyardId,
  MilestoneId,
  ProblemId,
  TuzexId,
  UpgradeId,
} from './types';

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
    milestoneReward: (kcs: string) => `Odměna od OPBH: ${kcs}.`,
    brigade: 'Akce Z',
    brigadeAction: 'Přiložit ruku k dílu',
    brigadeHint: 'Dobrovolně povinné zvelebování okolí domu.',
    energy: 'Elán',
    kronika: 'Kronika domu',
    kronikaEmpty: 'Zatím se nic nestalo. To se změní.',
    help: 'Nápověda',
    domovnik: 'Domovník',
    hireCaretaker: (wage: string) => `Najmout pana Fandu (mzda ${wage})`,
    fireCaretaker: 'Propustit',
    caretakerOnDuty: 'Pan Fanda: ve službě.',
    caretakerIdle: 'Pan Fanda kouří v kočárkárně. Vše funguje.',
    caretakerHint: 'Opravy platí z fondu a řeší je sám. Většinou. Časem.',
    caretakerLocked: 'Domovník dává smysl až od 3 pater.',
    dvorek: 'Dvorek',
    influences: 'Co na něj působí',
    heating: (kcs: string) => `Topná sezóna: −${kcs}`,
    bony: (n: number) => `${n} bonů`,
    tuzex: 'Tuzex',
    tuzexHint: 'Bony nechává vekslák a dávají je i milníky. Neptejte se, odkud jsou.',
    evict: 'Podat návrh na výpověď',
    evictionPending: (sec: number) => `Výpovědní řízení běží… (${sec} s)`,
    evictionRefused: 'Návrh zamítnut. Zkoušeli to už tři předsedové.',
  },

  problems: {
    leak: {
      repair: 'Opravit trubku',
      list: (flat: string) => `💧 Prasklá trubka — ${flat}`,
      fixed: (flat: string) => `Trubka opravena (${flat}). Tentokrát snad doopravdy.`,
      caretakerFixed: (flat: string, kcs: string) => `Pan Fanda vyměnil trubku (${flat}, −${kcs}).`,
    },
    window: {
      repair: 'Zasklít okno',
      list: (flat: string) => `⚽ Rozbité okno — ${flat}`,
      fixed: (flat: string) => `Okno zaskleno (${flat}). Sklenář si účtoval i cestu.`,
      caretakerFixed: (flat: string, kcs: string) => `Pan Fanda zasklil okno (${flat}, −${kcs}).`,
    },
    radiator: {
      repair: 'Odvzdušnit radiátor',
      list: (flat: string) => `🥶 Studený radiátor — ${flat}`,
      fixed: (flat: string) => `Radiátor zase topí (${flat}). Klíč na odvzdušnění se našel.`,
      caretakerFixed: (flat: string, kcs: string) =>
        `Pan Fanda odvzdušnil radiátor (${flat}, −${kcs}).`,
    },
  } satisfies Record<
    ProblemId,
    {
      repair: string;
      list: (flat: string) => string;
      fixed: (flat: string) => string;
      caretakerFixed: (flat: string, kcs: string) => string;
    }
  >,

  courtyard: {
    piskoviste: {
      name: 'Pískoviště',
      desc: 'Rodiny s dětmi jsou spokojenější. Riziko: dvorní fotbal.',
    },
    lavicky: {
      name: 'Lavičky',
      desc: 'Důchodkyně mají odkud pozorovat. Všechno a všechny.',
    },
    zahonky: {
      name: 'Záhonky',
      desc: 'Vůně rajčat pro celý dům. Občas úroda, občas zloděj.',
    },
    susak: {
      name: 'Sušák na prádlo',
      desc: 'Čisté prádlo ve větru. Drobná radost pro všechny.',
    },
    garaz: {
      name: 'Garáž',
      desc: 'Vekslák platí o 20 % víc. A trabanty přestanou blokovat vchod.',
    },
  } satisfies Record<CourtyardId, { name: string; desc: string }>,

  factors: {
    winter: 'Topná sezóna',
    summer: 'Léto na sídlišti',
    radiator: 'Studený radiátor',
    tv: 'Barevná televize ve společné anténě',
    satellite: 'Satelit na střeše',
    zahonky: 'Záhonky na dvorku',
    susak: 'Sušák na prádlo',
    piskoviste: 'Pískoviště pod okny',
    lavicky: 'Lavičky před domem',
    hotWater: 'Neteče teplá voda',
    hotWaterFamily: 'Děti se nemají kde koupat',
    leak: 'Prasklá trubka',
    window: 'Rozbité okno',
    elevator: 'Rozbitý výtah',
    elevatorCouple: 'Schody. Každý den. Pěšky.',
    pensionerDrag: 'Stížnosti sousedky s pejskem',
    svazakDrag: 'Soudruh od vedle si vše zapisuje',
    musicianDrag: 'Večerní cvičení na nástroj',
  },

  help: {
    title: 'Jak vést panelák',
    tips: [
      'Nájemníci platí nájem každou sekundu — čím spokojenější, tím víc. Klikněte na byt a uvidíte, kdo v něm bydlí.',
      'Za vydělané Kčs stavějte patra, opravujte výtah a prasklé trubky a kupujte vylepšení na nástěnce vpravo.',
      'Nemáte na první patro? Akce Z: dokud máte elán, klikejte a přivydělejte si. Elán se obnovuje sám.',
      'Každý nájemník je jiný: vekslák platí 1,5×, ale přitahuje pozornost. Paní Vlasta se neodstěhuje nikdy. Nikdy.',
      'Od tří pater můžete najmout domovníka — opravy pak řeší (a platí z fondu) sám.',
      'Dvorek není jen tráva: pískoviště, lavičky nebo záhonky zvedají náladu a přinášejí události.',
      'Čas plyne: v zimě se topí (a studí radiátory), 1. července bývá odstávka. Bony od veksláka uplatníte v Tuzexu.',
      'Nepohodlného nájemníka lze vystěhovat — za peníze, reputaci a 60 vteřin úředního řízení. Paní Vlastu ne.',
      'Po zavření záložky dům vydělává dál na 50 % (max 8 hodin). Hra se ukládá automaticky.',
      'Cíl: 8 pater, plno a spokojenost aspoň 80 % = titul „Vzorný dům socialistické péče“.',
    ],
    ok: 'Rozumím, soudruzi',
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
    kutil: {
      label: 'Kutil',
      names: ['Pan Jarda', 'Pan Standa', 'Pan Véna'],
      flavor: [
        '„To si spravím sám.“',
        '„Mám na to nářadí. Mám na všechno nářadí.“',
        '„Hmoždinka drží tenhle dům pohromadě.“',
      ],
    },
    svazak: {
      label: 'Svazák',
      names: ['Soudruh Milan', 'Soudruh Zdeněk', 'Soudruh Ivo'],
      flavor: [
        '„Schůze je základ.“',
        '„Hlásím vzorný stav vchodu.“',
        '„Nástěnku jsem aktualizoval. Opět.“',
      ],
    },
    disident: {
      label: 'Disident',
      names: ['Pan Šafář', 'Pan Vohryzek', 'Paní Olga'],
      flavor: [
        '„Nic jsem nepodepsal.“',
        '„Knihy? Jaké knihy.“',
        '„Zeď má uši, soudruhu. I ta panelová.“',
      ],
    },
    family: {
      label: 'Rodina s dětmi',
      names: ['Holubovi (+ 2 děti)', 'Veselí (+ 2 děti)', 'Maláčovi (+ 3 děti)'],
      flavor: [
        '„Děti potřebují vzduch a pískoviště.“',
        '„Kočárek je konečně v kočárkárně.“',
        '„Ve dvou pokojích se dá žít. Musí.“',
      ],
    },
    musician: {
      label: 'Hudebník',
      names: ['Mistr Vašek (housle)', 'Slečna Eva (klavír)', 'Pan Bedřich (lesní roh)'],
      flavor: [
        '„Umění vyžaduje oběti. Hlavně od sousedů.“',
        '„Cvičím jen do desíti. Do desíti večer.“',
        '„Dvořák by to pochopil.“',
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
    musicianMoveIn: 'Do domu se nastěhovala kultura. Reputace stoupá.',
    disidentLoyal:
      'Bydlí tu už půl hodiny a dům mlčí. Sousedé drží spolu. Reputace stoupá.',
    kutilFix: (flat: string) =>
      `Pan Jarda si všiml prasklé trubky (${flat}) a spravil ji. Neptal se.`,
    caretakerHired:
      'Pan Fanda nastoupil jako domovník. První věc: pověsil si síťovku v kočárkárně.',
    caretakerFired: 'Pan Fanda skončil. Síťovku si vzal s sebou.',
    caretakerElevator: (kcs: string) => `Pan Fanda opravil výtah (−${kcs}).`,
    courtyardBuilt: (name: string) => `Na dvorku přibylo: ${name}.`,
    evictionFiled: (name: string) =>
      `Podán návrh na výpověď: ${name}. Razítka schnou, sousedé si šeptají.`,
    evictionDone: (name: string, flat: string) =>
      `${name} se odstěhoval(a) úředně (${flat}). Spravedlnost po našem.`,
    bonReceived: 'Ve schránce přistála obálka s bonem. Pan Karel nic neví.',
    bonyAwarded: (n: number) => `K odměně přibyly ${n} bony. Neoficiálně.`,
    tuzexBought: (name: string) => `Z Tuzexu dorazilo: ${name}.`,
    kavaServed:
      'Káva a čokoláda z Tuzexu kolovaly po domě. Celý dům si připadá na úrovni.',
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
    melouch: (flat: string) =>
      `Melouch. Kamarád švagra „spravil“ trubku (${flat}). Kupodivu to drží.`,
    jitrnice: 'Soudružka jeřábnice přivezla z venkova jitrnice. Celý dům voní zabíjačkou.',
    satelliteReported: (kcs: string) =>
      `Soused to nahlásil. Satelit zabaven, pokuta ${kcs}. Anténa oficiálně nikdy neexistovala.`,
    schuzeTitle: 'Domovní schůze',
    schuzeBody:
      'Bod 1: údržba zeleně. Bod 2: kdo zaplatí chlebíčky? Bod 3: různé (nikdo neví, co to znamená, ale potrvá to nejdéle).',
    schuzePay: (kcs: string) => `Zaplatit chlebíčky (${kcs})`,
    schuzeSkip: 'Nechat být (sousedé si to zapamatují)',
    schuzePaid: 'Chlebíčky byly. Schůze proběhla v duchu vzájemného porozumění.',
    schuzeSkipped: 'Bez chlebíčků. Schůze skončila povzdechem a zápisem.',
    kscSvazak: 'Kontrola z OV KSČ: soudruh svazák se za dům zaručil. „Vzorná práce.“',
    stbDisidentGone: (name: string) =>
      `${name} zmizel. V šest ráno. Nikdo nic neviděl, nikdo nic neslyšel.`,
    stbSearch: 'Domovní prohlídka ve tři ráno. Hledali knihy. Celé patro nespalo.',
    vrtani: (floor: number) =>
      `Sobota, 7:00. Vrtačka pana Jardy budí ${floor}. patro. Důvod neznámý, konec v nedohlednu.`,
    okno: (flat: string) => `Fotbal na dvorku. Míč vyhrál souboj s oknem (${flat}).`,
    rajcata: 'Úroda ze záhonků. Rajčata dostal celý dům. I pan Lojza, i když neví proč.',
    zlodej: 'Někdo v noci očesal záhonky. Paní Vlasta zahájila vlastní vyšetřování.',
    trabant:
      'Před vchodem už týden parkuje cizí trabant. Nikdo neví čí. Nikdo se nepřizná.',
    azorTitle: 'Azor se ztratil',
    azorBody:
      'Paní Vlasta stojí přede dveřmi a mlčí. Azor je pryč. Dům má příležitost projevit charakter.',
    azorSearch: (kcs: string) => `Uspořádat pátrání (${kcs})`,
    azorSkip: 'Nechat to být (vrátí se sám… asi)',
    azorFound: 'Azor nalezen v kotelně. Spal. Paní Vlasta děkuje celému domu.',
    azorReturned:
      'Azor se vrátil sám. Po dvou dnech. Páchne uhlím a nikdo neví proč.',
    odstavka:
      'Plánovaná odstávka teplé vody. Plán je plán. Termín obnovení: bude upřesněn.',
    vanoce: 'Štědrý den. Mezi patry koluje cukroví a chvíli jsou všichni sousedé.',
    radiator: (flat: string) => `Radiátor vystydl (${flat}). Topiči dělají, co můžou. Prý.`,
    majTitle: 'První máj',
    majBody:
      'Blíží se průvod. Domovní správa očekává výzdobu vchodu. Očekává ji velmi.',
    majDecorate: (kcs: string) => `Vyzdobit vchod (${kcs})`,
    majSkip: 'Nechat nástěnku být',
    majDecorated: 'Vchod zářil. Mávátka, karafiáty, transparent. Soudruzi spokojeni.',
    majSkipped: 'Nástěnka zela prázdnotou. Soudruzi si toho všimli. A zapsali si to.',
    teta: 'Balík od tety z Vídně. Káva, bony a vůně, kterou Jednota nezná.',
    prosbaTitle: 'Prosba nájemníka',
  },

  requests: {
    pes: {
      body: (name: string) => `${name} prosí o povolení psa. „Bude hodný. Většinou.“`,
      allow: 'Povolit psa',
      refuse: 'Zamítnout',
      allowed: 'Pes povolen. Štěkot se počítá jako život v domě.',
      refused: 'Pes zamítnut. V bytě je od té doby podezřele ticho.',
    },
    odklad: {
      body: (name: string) =>
        `${name} prosí o odklad nájmu. „Do výplaty, soudruhu. Čestný pionýrský.“`,
      allow: 'Povolit odklad (20 Kčs z fondu)',
      refuse: 'Zamítnout',
      allowed: 'Odklad povolen. Vděčnost je veliká, dluh také.',
      refused: 'Odklad zamítnut. U výčepu se o vás mluví.',
    },
    zabradli: {
      body: (name: string) => `${name} prosí o opravu zábradlí. „Já nic, já jen to koleno.“`,
      allow: 'Opravit zábradlí (25 Kčs)',
      refuse: 'Odložit na schůzi',
      allowed: 'Zábradlí drží. Důchodkyně domu vzkazují, že si toho váží.',
      refused: 'Zábradlí počká. Důchodkyně si to pamatují. Všechno si pamatují.',
    },
    nedele: {
      body: (name: string) =>
        `${name} prosí o povolení vrtat v neděli. „Jen pár dírek. Maximálně sto.“`,
      allow: 'Povolit nedělní vrtání',
      refuse: 'Zamítnout',
      allowed: 'Vrtání povoleno. Kutil září, patro skřípe zuby.',
      refused: 'Vrtání zamítnuto. Kutil smutně hladí příklepovku.',
    },
    zarovka: {
      body: (name: string) =>
        `${name} prosí o výměnu žárovky na chodbě. „Už tři týdny tma jak v pytli.“`,
      allow: 'Vyměnit žárovku (10 Kčs)',
      refuse: 'Tma šetří elektřinu',
      allowed: 'Na chodbě se rozsvítilo. Drobnost, ale dům si všiml.',
      refused: 'Chodba zůstává temná. Jako vaše pověst u nájemníka.',
    },
  },

  tuzex: {
    tv: {
      name: 'Barevná televize',
      desc: 'Do společné antény. Celý dům kouká barevně (+10 spokojenosti všem).',
    },
    pracka: {
      name: 'Západoněmecká pračka',
      desc: 'Do prádelny. Spokojenost se obnovuje ještě rychleji. Vyžaduje prádelnu.',
    },
    digitalky: {
      name: 'Digitálky pro domovníka',
      desc: 'Pan Fanda stíhá opravy dvakrát rychleji. Hlavně je rád ukazuje.',
    },
  } satisfies Record<TuzexId, { name: string; desc: string }>,

  kava: {
    name: 'Káva a čokoláda na schůzi',
    desc: 'Jednorázově +15 spokojenosti všem. Dá se kupovat opakovaně.',
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
  kutil: '🔧',
  svazak: '📋',
  disident: '📚',
  family: '👪',
  musician: '🎻',
};
