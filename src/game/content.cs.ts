// ALL Czech strings, names and flavor text live here (spec §3: hardcoded Czech,
// single content file). Identifiers stay English; the panelák speaks Czech.

import type {
  ArchetypeId,
  BadgeId,
  CourtyardId,
  MilestoneId,
  PerkId,
  ProblemId,
  RepeatableId,
  SecretId,
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
    panelHeader: 'DOMOVNÍ SPRÁVA',
    tabs: {
      dum: 'Dům',
      obchod: 'Tuzex',
      kariera: 'Kariéra',
      zaznamy: 'Záznamy',
      data: 'Data',
    },
    fund: 'Domovní fond',
    reputation: 'Důvěra sousedů',
    regime: 'Kádrový profil',
    regimeGone: 'Kádrový profil (archiv)',
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
    brigadeHint:
      'Dobrovolně povinné zvelebování okolí domu. Elán roste se spokojeností a důvěrou — komu se daří, tomu se chce.',
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
    modernizace: 'Modernizace',
    influences: 'Co na něj působí',
    heating: (kcs: string) => `Topná sezóna: −${kcs}`,
    bony: (n: number) => `${n} bonů`,
    tuzex: 'Tuzex',
    tuzexHint: 'Bony nechává vekslák a dávají je i milníky. Neptejte se, odkud jsou.',
    evict: 'Podat návrh na výpověď',
    evictionPending: (sec: number) => `Výpovědní řízení běží… (${sec} s)`,
    evictionRefused: 'Návrh zamítnut. Zkoušeli to už tři předsedové.',
    spy: (energy: number) => `Šmírovat (${energy} elánu)`,
    spyHint: 'Ucho na dveřích, oko na škvíře. Když vás chytí, dům si to zapamatuje.',
    secretTitle: 'Kádrové zjištění',
    secretConfided: 'Svěřil(a) se vám sám(a). Důvěra zavazuje.',
    cover: 'Krýt',
    report: 'Udat',
    covering: '🤫 Kryjete ho. Dům to tuší a váží si toho.',
    reportPending: '🚔 Hlášení podáno. Papíry už putují.',
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
    reno: 'Zrekonstruovaný byt',
    samoobsluha: 'Samoobsluha za rohem',
    skolka: 'Školka na sídlišti',
    kulturak: 'Kulturní dům',
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
    studenaVoda: 'Neteče vůbec žádná voda',
    vedro: 'Vedro k zalknutí',
    vedroPensioner: 'Na vedro už nejsou léta',
    chripka: 'Chřipka v domě',
    naroky: 'Vysoké nároky (na pohodlí si zvykli)',
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
      'Peníze nikdy nejsou zbytečné: Modernizace zvyšuje nájem donekonečna. A od roku 1990 lze dům zprivatizovat — začnete znovu s kupóny a trvalými výhodami.',
      'Po dostavění osmi pater přidělí OPBH další parcelu — sídliště až o třech domech, každý s jinou povahou. Odznaky v kádrovém posudku přežijí všechno.',
      'Výbor zadává pětiletkové plány s termínem a odměnou. A když dojde místo, rekonstruujte byty a stavějte: samoobsluhu, školku, kulturní dům.',
      'Správce slouží dvěma pánům: důvěře sousedů a kádrovému profilu. Volby, 1. máj a kontroly těší výbor; banány, pátrání po Azorovi a čisté chodníky těší dům. Obě osy pomalu šednou k průměru — jméno se musí udržovat.',
      'Nájemníci mají tajemství. Šmírujte za elán, nebo si získejte důvěru a svěří se sami. Pak je můžete krýt — nebo udat. Obojí má cenu a obojí se počítá.',
      'V listopadu 1989 se karta obrátí: kádrový profil přestane platit a dům si vzpomene, kým jste byl. U privatizace pak mluví lustrace.',
      'Po zavření záložky dům vydělává dál na 50 % (max 8 hodin). Hra se ukládá automaticky.',
      'Cíl: 8 pater, plno a spokojenost aspoň 80 % = titul „Vzorný dům socialistické péče“.',
    ],
    ok: 'Rozumím, soudruzi',
  },

  arkada: {
    title: 'Svazácká arkáda',
    open: '🎮 Zahrát arkádu',
    intro:
      'Soudruh svazák tě zve na „kulturně-výchovnou“ hru: skládej papíry do řádků. Za skóre kápne pár korun z fondu.',
    cost: (e: number) => `Sednout si stojí ${e} elánu.`,
    tooTired: 'Málo elánu. Přijď, až si odpočineš.',
    controls: 'Šipky: pohyb · ↑ otočit · ↓ rychleji · mezerník: shodit',
    score: 'Skóre',
    lines: 'Řádky',
    start: 'Start',
    again: 'Hrát znovu',
    gameOver: 'Konec hry',
    reward: (kcs: number) => `Svazácká arkáda: z fondu káplo ${kcs} Kčs.`,
  },

  leaderboard: {
    title: '🏆 Žebříček správců',
    yourScore: (kcs: string) => `Tvé skóre: ${kcs} (nejbohatší éra)`,
    namePlaceholder: 'Tvoje přezdívka',
    submit: '📤 Odeslat skóre',
    submitting: 'Odesílám…',
    submitted: (rank: number) => `Odesláno! Jsi na ${rank}. místě.`,
    offline: 'Žebříček je nedostupný (běží jen s backendem).',
    loading: 'Načítám…',
    empty: 'Zatím žádná skóre. Buď první, soudruhu.',
    refresh: 'Obnovit',
    era: (n: number) => `${n}. éra`,
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
    elevatorBroke: (site: string) => `Výtah (${site}) se porouchal. Zase.`,
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
    repeatableBought: (name: string, level: number) =>
      `${name} — úroveň ${level}. Dům zase o kus lepší.`,
    kulturakBon:
      'Z Kulturního domu ukápl bon. Vstupné se cestou do pokladny někde ztratilo.',
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
    volbyTitle: 'Volby',
    volbyBody:
      'Volební místnost je otevřena. Účast se očekává manifestační. Vaši nájemníci se dívají, jak se zachová správa domu.',
    volbyGo: 'Jít manifestačně (a vzít sousedy)',
    volbySkip: 'Zůstat doma',
    volbyWent: 'Účast 99,4 %. Volební komise si vaši ochotu zapsala. Fronta byla dlouhá.',
    volbySkipped: 'Nešli jste. Nikdo nic neřekl. Všichni si to zapsali.',
    pout: 'Přijela pouť! Střelnice, cukrová vata, kolotoč. Děti chtějí drobné a dostaly je.',
    inventura: 'Inventura v Jednotě. Nemají nic. Ani frontu. Sídliště truchlí.',
    stehovani: (floor: number) =>
      `Stěhování nábytku. Sekce jede do ${floor}. patra. Schodištěm. Za hlasitého odborného vedení.`,
    studenaVoda: 'Havárie řadu. Neteče nic. Ani studená, ani teplá, ani naděje.',
    studenaVodaEnd: 'Voda opět teče. Rezavá, ale teče.',
    vedro: 'Vedro. Panelák drží teplo jak kamna a větrání je jen pověra.',
    vedroEnd: 'Vedro polevilo. Dům si oddechl, beton dál sálá.',
    chripka: 'Chřipka jde po patrech. Kdo nekašle, ten inhaluje. Nad hrncem.',
    chripkaEnd: 'Chřipka odešla. Zůstaly čaje, rumy a historky o horečkách.',
    kalamitaTitle: 'Sněhová kalamita',
    kalamitaBody:
      'Napadlo přes noc. Chodník zmizel, trabanty jsou bílé kopečky. Technické služby hlásí, že „situaci monitorují“.',
    kalamitaShovel: 'Zorganizovat brigádu s lopatami (30 elánu)',
    kalamitaSkip: 'Ono to sleze samo',
    kalamitaShoveled:
      'Lopaty zazvonily, chodník je čistý. Dům si o sobě zase jednou myslí dobré věci.',
    kalamitaSkipped:
      'Neslezlo. Ušlapalo se to v kluziště a paní Vlasta málem nabrala hodiny.',
    mandarinky:
      'V Jednotě mají mandarinky! Fronta stála za to. Chodby voní Vánocemi a Kubou.',
    pomlazka:
      'Velikonoce. Po domě chodí pomlázka, vajíčka a mírně přeceňovaná poezie.',
    blato:
      'Tání. Dvorek je jedno velké bláto a s ním i chodby, rohožky a nervy.',
    bramboryTitle: 'Brigáda na brambory',
    bramboryBody:
      'JZD Rozvoj hlásí ohroženou sklizeň a OV očekává „dobrovolné zapojení sídliště“. V sobotu. V šest.',
    bramborySend: 'Poslat dům na pole (soudruzi to ocení)',
    bramborySkip: 'Vymluvit se na havárii vodovodu',
    bramborySent:
      'Autobus odjel v šest. Dům se vrátil s křížem v zádech a pytlem brambor na hlavu.',
    bramborySkipped:
      'Výmluva prošla. Podruhé už neprojde a soudruzi si udělali čárku.',
    pliskanice: (flat: string) =>
      `Podzimní plískanice. Střechou to prosáklo až do bytu (${flat}).`,
    posviceni:
      'Posvícení. Koláče, dechovka a tancovačka. Dům se druhý den drží za hlavu, ale spokojeně.',
    svereniTitle: 'Soused se svěřuje',
    svereniAccept: 'Vyslechnout. Mlčet umím.',
    svereniRefuse: 'Nechci nic vědět',
    svereniRefused:
      'Zavřeli jste dveře dřív, než to dořekl. Bezpečnější. A o kus chladnější.',
    hlaseniTitle: 'Návštěva v civilu',
    hlaseniBody:
      'Dva pánové v šedých sakách. „Soudruhu správce, vy tady vidíte lidem do života. Tak co nám povíte?“',
    hlaseniReport: (name: string) => `Zmínit, co víte (${name})`,
    hlaseniDeny: '„Samí slušní lidé, soudruzi.“',
    hlaseniDenied:
      '„Slušní lidé, jistě.“ Zapsali si to. I to, že jste nic neřekl.',
    revoluce:
      '17. listopadu 1989. Zvoní klíče — na náměstích i na vašem sídlišti. Něco skončilo.',
    revoluceHero:
      'Dům ví, kdo je nikdy neprodal. Sousedé vám tisknou ruku na chodbě.',
    revoluceMinor:
      'V archivech se našly papíry. Nic velkého, ale dům se dívá jinak.',
    revoluceTraitor:
      'Našly se složky s vaším rukopisem. Chodbou se chodí mlčky a nikdo nezdraví.',
  },

  secrets: {
    samizdat: {
      label: 'Přepisuje samizdat',
      discovered: (name: string) =>
        `${name} po nocích přepisuje samizdat. Průklepák, deset kopií, Havel.`,
      confide: (name: string) =>
        `${name} vás vzal(a) stranou: „Soudruhu správce… ty stránky, co u mě klapou po nocích, nejsou jídelníčky. Rozumíme si?“`,
    },
    radio: {
      label: 'Poslouchá Svobodnou Evropu',
      discovered: (name: string) =>
        `${name} má za záclonou drátovou anténu a večer u okna „ladí počasí“. Mnichovské.`,
      confide: (name: string) =>
        `${name} ztišil(a) hlas: „Já večer poslouchám… no, vy víte co. Kdyby se někdo ptal, tak dechovku.“`,
    },
    veksl: {
      label: 'Kšeftuje s bony a valutami',
      discovered: (name: string) =>
        `${name} má v kredenci obálky s bony a kurz, o kterém se Státní bance nezdá.`,
      confide: (name: string) =>
        `${name} pokrčil(a) rameny: „Soudruhu, já jen pomáhám lidem k pračkám. Národní hospodářství to zvládne.“`,
    },
    melouch: {
      label: 'Jede melouchy načerno',
      discovered: (name: string) =>
        `${name} má sklep plný cizího materiálu a víkendy plné faktur, které nikdo nikdy neuvidí.`,
      confide: (name: string) =>
        `${name} si otřel(a) ruce do montérek: „Kdyby se někdo ptal na ty trubky ve sklepě — jsou moje. Teda… budou.“`,
    },
    zapad: {
      label: 'Píše si se Západem',
      discovered: (name: string) =>
        `${name} dostává dopisy s německými známkami a schovává je do krabice od bot.`,
      confide: (name: string) =>
        `${name} vám ukázal(a) fotku: „Bratranec. Hamburk. Kdyby přišel balík, vezmete ho k sobě, že jo?“`,
    },
    palenka: {
      label: 'Doma pálí slivovici',
      discovered: (name: string) =>
        `Za dveřmi u ${name} to bublá a voní to tak, že by kotelna mohla žárlit.`,
      confide: (name: string) =>
        `${name} vám strčil(a) do ruky lahvičku: „Vzorek. Kdyby někdo čmuchal, je to sirup proti kašli.“`,
    },
  } satisfies Record<
    SecretId,
    { label: string; discovered: (name: string) => string; confide: (name: string) => string }
  >,

  spy: {
    caught: (name: string) =>
      `${name} vás načapal(a) s uchem na dveřích. „Soudruhu správce?!“ Patro to do večera ví.`,
    nothing: [
      (name: string) => `${name} vede spořádaný život. Až podezřele spořádaný.`,
      (name: string) => `U ${name} nic. Jen televize, večeře a chrápání.`,
      (name: string) => `Nic. ${name} má tajemství nanejvýš v receptu na svíčkovou.`,
    ],
    confided: (name: string) =>
      `${name} vám svěřil(a), co schovává. Teď to nesete taky.`,
    covered: (name: string) =>
      `Rozhodnuto: ${name} kryjete. Kdyby se někdo ptal, nic jste neviděl.`,
    reported: (name: string) =>
      `Hlášení o ${name} předáno. Obálka, razítko, ticho. Nikdo nic neví. Zatím.`,
    arrest: (name: string) =>
      `V šest ráno přijeli pro ${name}. Chodba mlčí, výtah jel dvakrát. Dům si domýšlí.`,
    arrestConfided: (name: string) =>
      `Přijeli pro ${name} — pro člověka, který se vám svěřil. Dům to neví jistě. Ale dívá se na vás.`,
    coverBusted: (name: string, kcs: string) =>
      `StB si posvítila na ${name} — a na vás. „Vy jste to věděl, soudruhu.“ Poplatek ${kcs} a vroubek v kádrech.`,
    coverHeld: (name: string) =>
      `StB se vyptávala na ${name}. Ukázal jste papíry vzorného domu a oni odjeli. ${name} ví, komu za to vděčí.`,
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
    zkouska: {
      body: (name: string) =>
        `${name} prosí o zkušebnu v kočárkárně. „Jen komorní repertoár. Skoro.“`,
      allow: 'Povolit zkoušení',
      refuse: 'Zamítnout',
      allowed: 'Kočárkárnou zní smyčce. Kočárky si zvykly, sousedé pomalu.',
      refused: 'Zkoušení zamítnuto. Umělec trpí. Nahlas a v mollové tónině.',
    },
    kralikarna: {
      body: (name: string) =>
        `${name} prosí o králíkárnu za domem. „Čerstvé maso, soudruhu. A děti se něco naučí.“`,
      allow: 'Povolit králíkárnu (30 Kčs)',
      refuse: 'Zamítnout',
      allowed: 'Za domem vyrostla králíkárna. Směnaři mají o víkendech program.',
      refused: 'Králíkárna zamítnuta. Králíci si oddechli, směnaři ne.',
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

  repeatables: {
    renovace: {
      name: 'Renovace bytových jader',
      desc: '+5 % nájemného za každou úroveň. Umakart střídá umakart, ale nový.',
    },
    naradi: {
      name: 'Lepší nářadí do Akce Z',
      desc: '+2 Kčs za kliknutí a úroveň. Vercajk dělá mistra.',
    },
  } satisfies Record<RepeatableId, { name: string; desc: string }>,

  prestige: {
    title: 'Privatizace',
    era: (n: number) => `${n}. éra`,
    kupony: (n: number) => `${n} kupónů`,
    teaser:
      'Povídá se, že v devadesátém se budou dít věci. Zatím se šetří a staví.',
    rumour: 'Něco se děje. V rádiu, na ulicích, ve frontách. Zatím jen šeptem.',
    available:
      'Doba se změnila. Dům lze zprivatizovat: začnete znovu, ale kupóny a trvalé výhody zůstanou. A každá éra přidává +5 % nájemného.',
    projected: (n: number) => `Odhad výnosu: ${n} kupónů`,
    button: 'Zprivatizovat dům',
    confirm:
      'Opravdu zprivatizovat? Dům, nájemníci i fond zmizí. Zůstanou kupóny, trvalé výhody a vzpomínky. Tak to v privatizaci chodí.',
    done: (n: number) =>
      `Privatizováno. Získali jste ${n} kupónů. Dům dostal nového správce — vás. Znovu.`,
    lustraceClean:
      'Lustrace: čistý štít. Lidé si pamatují, koho jste kryl. Morální kredit: +3 kupóny.',
    lustraceDirty:
      'Lustrace: ve svazcích se našel váš rukopis. Část kupónů se rozplynula i s pověstí.',
    perkBought: (name: string, level: number) => `Trvalá výhoda: ${name} (úroveň ${level}).`,
    perksTitle: 'Trvalé výhody (za kupóny)',
    level: (n: number) => `úroveň ${n}`,
    maxed: 'MAX',
  },

  sites: [
    {
      name: 'Jiráskova 7',
      desc: 'Původní dům. Standard, na který jsou soudruzi zvyklí.',
      factor: '',
    },
    {
      name: 'U Fabriky',
      desc: '+15 % nájemného, rychlejší nastěhování — ale kouř z komínů (−5 spokojenosti).',
      factor: 'Kouř z fabriky',
    },
    {
      name: 'U Lesa',
      desc: 'Klid a vzduch (+8 spokojenosti), ale daleko od zastávky: −5 % nájmu, pomalejší nastěhování.',
      factor: 'Les za domem',
    },
  ],

  sidliste: {
    title: 'Sídliště',
    buyPlot: (name: string, kcs: string) => `Koupit parcelu ${name} (${kcs})`,
    needFullHouse: 'Další parcelu OPBH přidělí, až bude stávající dům plně vystavěn (8 pater).',
    complete: 'Sídliště je kompletní. Tři domy, jeden správce, žádný klid.',
    plotBought: (name: string) =>
      `Přidělena parcela ${name}. Bagry přijely hned — to se hned tak nevidí.`,
  },

  badges: {
    udernik: {
      label: 'Úderník',
      desc: '250 směn v Akci Z.',
      toast: 'Kádrový posudek: ÚDERNÍK. 250 směn v Akci Z. Ruka jako lopata, +1 kupón.',
    },
    provereny: {
      label: 'Prověřený',
      desc: 'Přežít 5 návštěv StB.',
      toast: 'Kádrový posudek: PROVĚŘENÝ. Pátá návštěva StB a pořád tady. +1 kupón.',
    },
    plnyDum: {
      label: 'Plný dům',
      desc: 'Všech 16 bytů obsazeno.',
      toast: 'Kádrový posudek: PLNÝ DŮM. Šestnáct bytů, šestnáct příběhů. +1 kupón.',
    },
    milionar: {
      label: 'Socialistický milionář',
      desc: 'Vydělat celkem 1 000 000 Kčs.',
      toast: 'Kádrový posudek: MILIONÁŘ. Milión korun. Oficiálně neexistujete. +1 kupón.',
    },
    prezimoval: {
      label: 'Přezimoval',
      desc: 'Přežít celou topnou sezónu.',
      toast: 'Kádrový posudek: PŘEZIMOVAL. Radiátory studily, dům stojí. +1 kupón.',
    },
    budovatel: {
      label: 'Budovatel sídliště',
      desc: 'Spravovat tři paneláky najednou.',
      toast: 'Kádrový posudek: BUDOVATEL. Tři domy, jedna síťovka klíčů. +1 kupón.',
    },
    vzorny: {
      label: 'Vzorný správce',
      desc: 'Získat titul Vzorný dům socialistické péče.',
      toast: 'Kádrový posudek: VZORNÝ SPRÁVCE. Cedule nelže. +1 kupón.',
    },
    kapitalista: {
      label: 'Kupónový kapitalista',
      desc: 'Provést privatizaci.',
      toast: 'Kádrový posudek: KAPITALISTA. První privatizace se nezapomíná. +1 kupón.',
    },
    slusnyClovek: {
      label: 'Slušný člověk',
      desc: 'Krýt v jedné éře tři sousedy.',
      toast: 'Kádrový posudek: SLUŠNÝ ČLOVĚK. Tři lidé u vás spali klidně. +1 kupón.',
    },
    konfident: {
      label: 'Konfident',
      desc: 'Podat v jedné éře tři hlášení.',
      toast: 'Kádrový posudek: KONFIDENT. Tři hlášení, tři obálky. Posudek to nesoudí. +1 kupón.',
    },
  } satisfies Record<BadgeId, { label: string; desc: string; toast: string }>,

  posudek: {
    title: 'Kádrový posudek',
    hint: 'Odznaky přežijí každou privatizaci. Každý nese kupón.',
  },

  plans: {
    title: 'Pětiletka',
    none: 'Výbor připravuje nový plán…',
    dissolved: 'Výbor se rozpustil. Plány už nikdo nezadává — zvláštní pocit.',
    daysLeft: (d: number) => `zbývá ${d} dní`,
    reward: 'Odměna',
    kuponBonus: '+ kupón',
    tasks: {
      earn: (kcs: string) => `Vydělat ${kcs}`,
      movein: (n: number) => `Ubytovat ${n} nových nájemníků`,
      fix: (n: number) => `Opravit ${n} závad`,
      happy: (pct: number, days: number) =>
        `Držet spokojenost ≥ ${pct} % (celkem ${days} dní)`,
      brigade: (n: number) => `Odpracovat ${n} směn v Akci Z`,
    },
    started: (task: string) => `Nový plán od OV: ${task}. Termín běží.`,
    done: (task: string, kcs: string) =>
      `Plán splněn (${task}). Výbor je spokojen, odměna ${kcs}.`,
    failed: (task: string) => `Plán nesplněn (${task}). Zapsáno.`,
  },

  projects: {
    title: 'Výstavba sídliště',
    locked: 'Nejdřív se musí dokončit předchozí stavba. Plán je plán.',
    built: (name: string) =>
      `Slavnostně otevřeno: ${name}. Páska přestřižena, řeč pronesena, chlebíčky snědeny.`,
    samoobsluha: {
      name: 'Samoobsluha',
      desc: '+4 spokojenosti všem. Fronty konečně pod střechou.',
    },
    skolka: {
      name: 'Mateřská školka',
      desc: 'Rodiny +12 spokojenosti a stěhují se ochotněji (+15 %).',
    },
    kulturak: {
      name: 'Kulturní dům',
      desc: '+8 spokojenosti všem a občas z něj ukápne bon.',
    },
  },

  reno: {
    title: 'Rekonstrukce bytu',
    button: (level: number, kcs: string) => `Rekonstrukce na úroveň ${level} (${kcs})`,
    level: (n: number) => `úroveň ${n}`,
    max: 'Byt je v nejvyšším standardu. Umakart tu už nenajdete.',
    done: (flat: string, level: number) =>
      `Byt ${flat} zrekonstruován na úroveň ${level}. Umakart nahradily obklady.`,
  },

  sinSlavy: {
    title: 'Síň slávy',
    fastestVzorny: 'Nejrychlejší Vzorný dům',
    richestEra: 'Rekordní výdělek éry',
    bestIncome: 'Rekordní příjem',
    kuponyTotal: 'Kupónů celkem získáno',
    none: '—',
  },

  save: {
    title: 'Záloha a data',
    download: '⬇ Stáhnout zálohu (soubor)',
    upload: '⬆ Nahrát zálohu (soubor)',
    export: 'Zkopírovat kód zálohy',
    import: 'Vložit kód zálohy',
    exportDone: 'Záloha zkopírována do schránky. Uložte si ji někam k rodinnému stříbru.',
    exportPrompt: 'Zkopírujte si zálohu (Ctrl+C):',
    importPrompt: 'Vložte zálohu:',
    importFail: 'Zálohu se nepodařilo přečíst. Je poškozená, nebo z novější verze hry.',
    importDone: 'Save obnoven. Vítejte zpátky, soudruhu správce.',
  },

  perks: {
    beton: {
      name: 'Lepší beton',
      desc: '−4 % z ceny pater za úroveň. Panely, co drží i bez hesel.',
    },
    konexe: {
      name: 'Konexe na výboru',
      desc: '−10 % ze všech pokut a „poplatků“ za úroveň. Známý má známýho.',
    },
    stribro: {
      name: 'Rodinné stříbro',
      desc: '+500 Kčs do začátku každé éry. Babiččin servis se neprodává. Skoro.',
    },
    povest: {
      name: 'Pověst dobrého správce',
      desc: '+5 reputace do začátku každé éry. Lidé si pamatují.',
    },
    rucicky: {
      name: 'Zlaté ručičky',
      desc: '+3 Kčs za kliknutí v Akci Z. Navždy.',
    },
  } satisfies Record<PerkId, { name: string; desc: string }>,

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
