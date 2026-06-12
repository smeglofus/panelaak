Panelák Tycoon — MVP Specification (v0.1)


Idle/management game. You build and run a prefab apartment block (panelák) in 1980s Czechoslovakia.
This document is the single source of truth for the MVP build. Game content strings are in Czech (intentional — it's part of the identity). Code, comments, and identifiers in English.




1. Problem Statement / Vision

There is no idle game with the "panelák experience" identity: socialist-era housing block management, dry Czech humor, brutalist-cozy aesthetic. The mechanics are universally understood (manage a building, collect rent, fix problems), but the flavor is unique and highly shareable. Target: a free, browser-based game that earns attention through novelty and memes, not money.

Target players: Central European millennials (nostalgia), Western "cozy brutalism" fans, incremental-game players looking for something with character.

2. Goals (MVP)


A playable core loop in the browser within 60 seconds of page load — no tutorial needed.
Session feels alive: at least one event or tenant interaction every ~2 minutes of active play.
Offline progression works: closing the tab and returning later yields accumulated rent and a summary.
The game is screenshot-worthy: the building view alone communicates the theme without explanation.
Shipped as a static site in a Docker container behind a reverse proxy (deployment is a first-class deliverable, not an afterthought).


3. Non-Goals (MVP)


No pixel art assets. MVP visuals are pure CSS/SVG + emoji. Art is the #1 scope killer; the CSS panelák must look good on its own. Sprites are a v0.2 concern.
No backend, no accounts. Save = localStorage. No leaderboards, no cloud sync.
No monetization. No ads, no IAP hooks, nothing.
No mobile-first design. Desktop browser first; must merely not break on mobile (single column fallback is fine).
No prestige/rebirth system. Classic incremental prestige is v0.3+. MVP ends at a soft milestone (see §6.7).
No sound. v0.2.
No localization framework. Czech strings hardcoded in one content file; English toggle is future work.


4. Tech Stack & Architecture

ConcernDecisionRationaleFrameworkVite + React 18 + TypeScriptFast dev loop, typed game stateStateZustand (single store)Simple, no boilerplate, easy persist middlewarePersistencelocalStorage via zustand/persist, save version fieldMigration-safe savesGame loopSingle setInterval tick at 1000 ms driving a pure tick(state): state reducerDeterministic, testableOffline progressOn load: elapsed = now - lastSavedTimestamp, run a fast-forward calculation (capped at 8 hours)Standard idle patternStylingPlain CSS modules (or single global CSS). CSS Grid for the building cross-sectionNo Tailwind dependency neededRandomnessSeedable RNG helper (mulberry32)Reproducible testsTestsVitest for tick(), economy math, and offline calcThe economy is the product; test itDeployMulti-stage Dockerfile (node build → nginx static), docker-compose.yml example with Traefik labelsPortfolio-grade deployment story

Project structure

src/
  main.tsx
  App.tsx
  game/
    types.ts          // all interfaces
    store.ts          // zustand store + persist
    tick.ts           // pure tick reducer (NO React imports)
    economy.ts        // cost curves, rent formulas
    events.ts         // random event definitions + trigger logic
    tenants.ts        // archetype definitions + move-in logic
    offline.ts        // fast-forward calculation
    rng.ts            // seedable RNG
    content.cs.ts     // ALL Czech strings, names, flavor text
  components/
    Building.tsx      // CSS cross-section grid
    FlatCell.tsx      // one flat: tenant emoji, status
    SidePanel.tsx     // money, stats, upgrade buttons
    EventToast.tsx    // event popups
    OfflineModal.tsx  // "while you were gone" summary
  styles/

Hard rule: game/ contains zero React. All game logic is pure functions over a GameState object. UI only renders state and dispatches actions. This makes the economy unit-testable and is the single most important architectural decision for getting this right on the first try.

5. Core Loop

every 1s tick:
  occupied flats generate rent (Kčs)
  happiness drifts toward a target derived from building condition
  small chance: breakdown (elevator, hot water)
  small chance: random event fires
  vacant flats: chance of tenant move-in (scaled by reputation)

player spends Kčs on:
  new floors (more flats)  →  more rent
  repairs                  →  restore happiness/income
  upgrades                 →  multipliers + new event types

Numbers are tuned so that: first upgrade affordable in ~30 s, first new floor in ~2 min, full 8-floor building in ~2–3 hours of mixed active/idle play.

6. Functional Requirements

6.1 Building (P0)


Building starts with 1 floor × 2 flats, expandable to 8 floors (16 flats max).
Rendered as a CSS Grid cross-section: each flat is a cell; ground floor has entrance + "kočárkárna".
Visual identity via CSS only: concrete-gray palette (#9a9a94 family), darker weathering streaks (CSS gradients), one accent color for the iconic colored balcony panels (e.g. faded ochre/red), flat roof with TV antenna (SVG). Falling-off plaster = pseudo-random darker patches per flat (deterministic from flat index).
Each flat cell shows: tenant emoji (or empty = dark window), happiness tint (green/yellow/red border or window glow), active problem icon (e.g. 💧 for water leak).


Acceptance:


 Building renders correctly at 1–8 floors without layout breakage
 Buying a floor costs floorCost(n) = 500 * 2.2^n Kčs and immediately adds 2 vacant flats
 A screenshot of the building alone is recognizably "panelák"


6.2 Economy (P0)


Currency: Kčs. Displayed with Czech formatting (1 250 Kčs).
Base rent per occupied flat: 1 Kčs/s, modified by tenant archetype multiplier and happiness factor (0.2–1.0).
All costs/curves live in economy.ts as named constants — single tuning point.


Acceptance:


 tick() is pure and covered by unit tests for: rent accrual, happiness decay, cost curves
 Game never reaches a dead state (player can always eventually afford a repair: minimum trickle income of 0.2 Kčs/s per occupied flat even at zero happiness)


6.3 Tenants (P0)

Tenants auto-move into vacant flats (base ~10% chance per 10 s per vacant flat, scaled by building reputation). Each tenant has an archetype from tenants.ts:

ArchetypeCzech nameRent ×QuirkPensioner with dogDůchodkyně paní Vlasta (+ Azor)0.8Complains often → small happiness drag on neighbors, but never moves outYoung coupleMladý pár Novákovi1.0Sensitive to elevator breakdowns (upper floors)DrunkPan Lojza0.6Random "mejdan" event: −happiness for floor, +flavor textBlack-marketeer (vekslák)Pan Karel1.5Pays well; raises ŠtB inspection risk while presentShift workerSoudružka jeřábnice Marta1.1No quirk; the reliable backbone


Tenants move out if their happiness stays under 20 % for 60 s (except paní Vlasta).
Names/flavor: small pools in content.cs.ts, picked by RNG.


Acceptance:


 Hovering/clicking a flat shows tenant card: name, archetype, happiness, rent contribution, one line of flavor text
 Move-in and move-out both produce a toast message


6.4 Maintenance & Breakdowns (P0)


Elevator: exists from floor 3 up. Breaks randomly (mean time ~5 min). While broken: happiness of floors 3+ decays 3× faster. Repair cost scales with building size. Upgrade "Lepší výtah (NDR import)" halves breakdown rate.
Hot water (teplá voda): building-wide outage event, lasts 60–180 s, −happiness for everyone. Cannot be repaired, only waited out — the message is the point: "Teplá voda nepoteče. Důvod: nepoteče."


Acceptance:


 Broken elevator shows visibly on the building (icon at shaft)
 Repair button appears contextually with the price


6.5 Random Events (P0 — minimum 6 events)

Defined declaratively in events.ts: { id, weight, condition?, duration?, effect, textCz }. Roughly one event per 90–150 s of play. MVP set:


Výpadek teplé vody — see above.
Kontrola z OV KSČ — if average happiness < 50 % or elevator broken: fine. If building in good shape: praise + small reputation bonus. Flavor: "Soudruzi, takhle to teda nejde."
Návštěva StB — only if vekslák present: chance he disappears (flat vacated) or pays a "fee" from your money.
Mejdan u Lojzy — floor-wide happiness hit, one funny line.
Fronta na banány — temporary +happiness building-wide ("V Jednotě dnes mají banány.")
Domovní schůze — player choice modal (the only interactive event in MVP): spend 50 Kčs on refreshments → +happiness, or skip → small −happiness.


Acceptance:


 Events appear as toast/modal with Czech flavor text and auto-dismiss (except domovní schůze, which requires a choice)
 Event weights/conditions are data, not code branches in the tick loop


6.6 Upgrades (P0 — minimum 4)

UpgradeEffectRisk/flavorLepší výtah (NDR)−50 % elevator breakdown rate—Sklepní kóje+10 % rent (storage = happy tenants)—Satelit na střechu+20 % happiness building-wideWhile owned: new event "soused to nahlásil" possible (fine + satellite confiscated, can re-buy)Prádelna (mandl)+happiness regen rate—

Acceptance:


 Upgrades panel shows cost, effect, owned state
 Satellite risk event actually fires and removes the upgrade


6.7 Progression & Milestone (P0)


Milestones at: first full floor, first 1 000 Kčs, elevator installed, 8 floors, all flats occupied with ≥80 % avg happiness.
Final MVP milestone: plaque "Vzorný dům socialistické péče" rendered on the building facade. That's the soft "win". Game continues idling afterward.


6.8 Offline Progress (P0)


On load, if elapsed > 60 s: show modal "Zatímco jste byl/a pryč…" with earned Kčs (computed at a reduced 50 % offline rate, capped at 8 h) and a one-line summary of what "happened" (flavor only, no real event simulation offline).


Acceptance:


 Offline calc is a pure function with unit tests (1 min, 1 h, 9 h cap cases)
 Save survives page reload; save schema has a version field


6.9 Save/Reset (P0)


Auto-save every 10 s + on tab hide. "Nová hra" button with confirm dialog.


7. P1 (fast follow, do NOT build in MVP)


Pixel-art sprite pass (replace CSS flats with tiles)
Sound (panel house ambience, elevator ding)
More events (pawlatch gossip, OV KSČ housing quota, winter heating season)
Tenant requests/mini-quests
English localization toggle
Mobile layout


8. P2 (architectural insurance only)


Prestige system ("privatizace 1991" reset — thematically perfect endgame)
Multiple buildings / sídliště view
Steam/itch packaging via Tauri


Design GameState so that multiple buildings and a prestige multiplier could be added without schema rewrite (i.e. buildings: Building[] even if length is always 1 in MVP; top-level meta: { prestigeLevel: 0 }).

9. Deployment (P0 — part of the definition of done)


Dockerfile: multi-stage (node:20-alpine build → nginx:alpine serve), final image < 50 MB.
docker-compose.yml with Traefik labels (host rule placeholder) and healthcheck.
README.md: local dev, build, deploy instructions.
GitHub Actions workflow: lint + vitest + docker build on push (push to registry left as commented template).


10. Open Questions (non-blocking)


Exact economy tuning numbers — start with the curves above, tune by playtest. (owner: you)
Whether domovní schůze choice modal pauses the tick loop — recommend yes for simplicity. (owner: implementation)


11. Definition of Done (MVP)


 npm run dev → playable game; npm test → green; docker compose up → game served by nginx
 All P0 acceptance criteria above pass
 10 minutes of play produces: ≥1 move-in, ≥1 breakdown, ≥3 events, ≥1 affordable upgrade
 One screenshot of the building posted somewhere gets the reaction "co to je? :D" — the real success metric
