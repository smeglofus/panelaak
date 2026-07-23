# Portréty nájemníků

Sem dej obrázky nájemníků. Pokud tu obrázek pro daný archetyp **není**, hra
automaticky použije emoji (fallback) — nic se nerozbije.

## Jak na to

Soubor pojmenuj **přesně podle ID archetypu** + přípona, např. `pensioner.png`.
Vite ho při buildu sám najde a nahradí jím emoji.

| Soubor            | Kdo to je            | Fallback emoji |
| ----------------- | -------------------- | -------------- |
| `pensioner.*`     | Důchodkyně s pejskem | 👵             |
| `couple.*`        | Mladý pár            | 👫             |
| `drunk.*`         | Domácí filozof       | 🥴             |
| `vekslak.*`       | Vekslák              | 🕶️             |
| `shift.*`         | Jeřábnice            | 👷‍♀️            |
| `kutil.*`         | Kutil                | 🔧             |
| `svazak.*`        | Svazák               | 📋             |
| `disident.*`      | Disident             | 📚             |
| `family.*`        | Rodina s dětmi       | 👪             |
| `musician.*`      | Hudebník             | 🎻             |

## Formát a velikost

- **Formát:** `png` (s průhledností), `webp`, `svg`, `jpg`, `gif` nebo `avif`.
- **Velikost:** stačí **64×64 px** (čtverec). V kartě se vykreslí ~40 px,
  v okně bytu ~24 px, takže větší zdroj je zbytečný. SVG je ideál — ostré v
  každé velikosti.
- Obrázek se ořízne do čtverce (`object-fit`), takže drž motiv doprostřed.

Přípona je jedno — když přidáš `pensioner.svg` i `pensioner.png`, použije se
jeden z nich (nespoléhej na to, měj vždy jen jeden soubor na archetyp).
