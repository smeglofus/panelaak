# Panelák Tycoon — Roadmap

Cíl: plnohodnotná idle hra, u které hráči vydrží dny až týdny. Každá fáze
bumpne save schéma (migrace v `state.ts:migrateSave`) a drží pravidlo čistého
jádra: logika bez Reactu, texty v `content.cs.ts`, čísla v `economy.ts`.

## v0.2 „Dům žije“ *(tato verze)*

- **Noví nájemníci** (každý s mechanickým háčkem, ne jen jiným nájmem):
  - *Kutil pan Jarda* (1,0×) — občas zadarmo opraví trubku; občas v sobotu ráno vrtá
  - *Svazák* (0,9×) — kontroly z OV KSČ dopadají vždy dobře; sousedé jsou nesví
  - *Disident* (0,7×, vzácný) — riziko StB; když vydrží 30 minut, dům drží spolu (+reputace)
  - *Rodina s dětmi* (1,2×) — bez teplé vody trpí dvojnásob; miluje pískoviště
  - *Hudebník* (0,8×) — sousedům vadí cvičení, ale dům má kulturu (+reputace při nastěhování)
- **Domovník pan Fanda** — od 3 pater; bere mzdu, opravy (výtah, trubky, okna)
  platí z fondu a řeší sám, s prodlevou
- **Dvorek** — druhá stavební dimenze, stavby se kreslí ve scéně a odemykají eventy:
  pískoviště (rodiny; riziko fotbalu do okna), lavičky (důchodkyně), záhonky
  (úroda i zloděj), sušák, garáž (vekslák +20 %; konec trabantů před vchodem)
- **Nové eventy**: vrtání, fotbal → rozbité okno (nový typ závady), úroda rajčat,
  očesané záhonky, ztracený Azor (interaktivní volba), trabant před vchodem
- **Diagnostika spokojenosti** — karta nájemníka ukazuje, co mu vadí a co pomáhá

## v0.3 „Rok na sídlišti“ *(hotovo)*

- Kalendář (den = 30 s, rok = 3 h; start 1. dubna 1983): **topná sezóna**
  (náklady na topení, studené radiátory), letní **plánovaná odstávka teplé
  vody** (1. července), Vánoce (24. prosince), 1. máj (výzdoba vchodu — volba)
- **Výpověď nájemníka** — placená (150 Kčs + reputace), řízení trvá 60 s;
  paní Vlasta je úředně nevystěhovatelná
- **Prosby nájemníků** (mini-questy): povolení psa, odklad nájmu, zábradlí,
  nedělní vrtání, žárovka na chodbě
- **Bony + Tuzex** — vekslák nechává obálky, milníky přidávají; v Tuzexu:
  barevná televize, západoněmecká pračka, digitálky pro domovníka, káva
  na schůzi (opakovatelná)

## v0.4 „Privatizace“ *(hotovo)*

- Start hry posunut na 1. dubna 1988; od **1. ledna 1990** lze dům zprivatizovat:
  reset s **kupóny** (z celoživotního výdělku + titul), každá éra +5 % nájemného
- **Trvalé výhody za kupóny**: lepší beton, konexe na výboru, rodinné stříbro,
  pověst dobrého správce, zlaté ručičky
- **Modernizace** — nekonečně opakovatelná vylepšení (renovace jader +5 % nájmu
  za úroveň, lepší nářadí do Akce Z) = trvalý smysl peněz
- Frontend: dvorek přesunut do trávníku před domem (vždy v záběru),
  responzivní breakpointy pro tablet i telefon
- *(odloženo do v0.5)* Kádrový posudek — achievementy přežívající prestiž

## v0.5 „Sídliště“ *(hotovo)*

- Až **tři paneláky**: po dostavění 8 pater lze koupit parcelu **U Fabriky**
  (+15 % nájmu, rychlejší nastěhování, −5 spokojenosti) a **U Lesa**
  (+8 spokojenosti, −5 % nájmu, pomalejší nastěhování); přepínání taby ve scéně,
  opravy a eventy fungují per budova
- **Kádrový posudek** — 8 odznaků (Úderník, Prověřený, Budovatel…), přežívají
  privatizaci a každý nese kupón

## v0.6 *(hotovo)*

- **Zvuky** — procedurální Web Audio (žádné soubory): kliknutí Akce Z, dobré/
  špatné zprávy, milníky; přepínač 🔊/🔇 v hlavičce
- **Anglický toggle** — kompletní překlad (content.en.ts typovaný jako
  `typeof CS`, kompilátor hlídá úplnost), přepínač EN/CZ, anglická data
- **Nové eventy**: volby (manifestační účast — volba), pouť, inventura
  v Jednotě, stěhování nábytku; **nové prosby**: zkušebna hudebníka,
  králíkárna směnaře
- **Balanc**: větší sídliště = rušnější sídliště (+30 % eventů za další dům)

## v0.7 „Čtyři roční období“ *(hotovo)*

- **Sezónní scéna** — kalendář maluje svět: v zimě sníh na střeše, zavátý
  dvorek a sněžení, léto zelenější, podzim hnědne. (Místo plného pixel-art
  passu — spec sám varoval, že art je scope killer; CSS panelák je identita.)
- **Síň slávy** — osobní rekordy přes všechny éry: nejrychlejší Vzorný dům,
  rekordní výdělek éry, rekordní příjem, kupóny celkem
- **Záloha savu** — export/import přes schránku (base64, verzované, migruje se)
- **itch.io balíček** — CI přikládá web zip jako artefakt + butler šablona
  (Steam/Tauri odloženo — HTML5 na itch je pragmatická distribuce)

## Nápady dál

- Tauri desktop build pro Steam, pixel-art jako alternativní skin, další questy

## Průběžně

- Tooltipy „proč je nespokojený“, plná kronika, export/import savu, balanc
