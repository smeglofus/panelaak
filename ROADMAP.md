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

## v0.4 „Privatizace 1991“ (prestiž)

- Reset hry → **privatizační kupóny** → trvalé bonusy (levnější beton, konexe…)
- **Kádrový posudek** — achievementy přežívající prestiž („Úderník“, „Přežil 5× StB“…)

## v0.5 „Sídliště“

- Druhý a další panelák s modifikátory (u fabriky, u lesa), meta-správa
- Mobilní layout, zvuky, anglický toggle — dosah

## Průběžně

- Tooltipy „proč je nespokojený“, plná kronika, export/import savu, balanc
