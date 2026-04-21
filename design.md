# RPG Weather Generator — Design Doc

## Purpose
A lightweight tool for generating in-game weather during tabletop RPG sessions. Two modes at launch:
- **One Ring mode** — seasonal, region-aware weather for Eriador and Wilderland (TA 2946–3018 setting).
- **Blade Runner mode** — dystopian LA weather (2037 era, per Free League's *Blade Runner RPG*).

Used at the table by the Loremaster / Gamemaster on an Android phone or iPad. Must be quick to consult mid-session.

## Non-goals
- Not a meteorological simulator.
- Not a campaign tracker.
- Not multi-user or synced.
- No account system, no backend.

## Platform
- **Progressive Web App** (PWA). Single-page, installable to home screen on Android and iPad.
- Works **offline** after first load (service worker, cache-first).
- Hosted on GitHub Pages (or equivalent static host).
- No native builds, no app stores.

## Core interaction
One screen. User picks:
1. **Mode** (One Ring / Blade Runner)
2. **Region** (mode-dependent — e.g. Eriador, Wilderland, Misty Mountains for One Ring; just "LA" for Blade Runner)
3. **Season** (One Ring only — Spring / Summer / Autumn / Winter, aligned to Tolkien's calendar feel, not literal solstices)

Presses a button. Gets **today's weather**. A second press generates **tomorrow**, biased by today's result.

A small "reset streak" button clears the history so weather is unbiased on the next roll.

## Weather model
**Tables with transition bias** — a hand-authored table per (mode, region, season) combination, plus a transition weighting layer.

### Rolling logic
1. Look up the table for `(mode, region, season)`.
2. If there is **no previous day**, roll using base weights.
3. If there **is** a previous day, multiply each row's base weight by a transition multiplier derived from yesterday's category (e.g. "storm → storm" gets a ×3 boost; "storm → clear" gets ×0.3).
4. Normalise, roll, return the result.

### Data shape (JSON, one file per region)
```json
{
  "id": "wilderland",
  "name": "Wilderland",
  "mode": "one-ring",
  "seasons": {
    "spring": [
      { "id": "clear",    "label": "Clear skies",           "weight": 20, "category": "clear" },
      { "id": "overcast", "label": "Overcast",              "weight": 25, "category": "overcast" },
      { "id": "rain",     "label": "Spring showers",        "weight": 30, "category": "rain" },
      { "id": "storm",    "label": "Thunderstorm",          "weight": 10, "category": "storm" },
      { "id": "mist",     "label": "Morning mist",          "weight": 15, "category": "mist" }
    ],
    "summer":  [ ... ],
    "autumn":  [ ... ],
    "winter":  [ ... ]
  }
}
```

Each entry has a free-text `label` (shown to the user) and a normalised `category` used only for the transition layer.

### Transition matrix
A single shared matrix keyed by category pairs, e.g.:
```json
{
  "clear":    { "clear": 3.0, "overcast": 1.5, "mist": 1.2, "rain": 0.5, "storm": 0.2 },
  "overcast": { "clear": 1.0, "overcast": 2.0, "rain": 2.0, "storm": 1.0, "mist": 1.5 },
  ...
}
```
This lives in a single file and applies across all regions/modes. Keeps the "weather has memory" feel without needing per-region matrices.

## Extensibility
**Adding a new region must not require touching code.**
- Regions live as individual JSON files in `/data/regions/`.
- The app discovers them at load time via a `manifest.json` listing the available region files.
- Adding Mirkwood, Lonely Mountain, Gondor, or anything else is: drop in a new JSON, add it to the manifest, done.

Same principle applies to modes — Blade Runner and One Ring are just groupings of regions with different season behaviour.

## v1 region content
- **One Ring**: Eriador, Wilderland, Misty Mountains (3 regions × 4 seasons = 12 tables)
- **Blade Runner**: LA (1 region; no season selector — just "daily weather" with a 2049-appropriate skew toward smog, acid rain, grey overcast)

Mirkwood and Lonely Mountain/Dale flagged for v2.

## Tech choices
- **Vanilla HTML/CSS/JS**, or a very light framework (Preact, Alpine.js). No React/Vue/build pipeline unless there's a real reason.
- Rationale: the app is tiny, offline-first, and will be maintained occasionally. Build tooling is a tax we don't need to pay.
- **Persist recent history** in `localStorage` so a day's weather survives a page refresh.

## Aesthetic

Each mode has a strongly differentiated visual identity. Switching modes should feel like stepping between two different worlds, not flipping a stylesheet. **All visual design is original** — no copyrighted logos, artwork, typefaces, or trade dress from *The One Ring RPG*, Tolkien Estate publications, or the *Blade Runner* films. We're evoking the genre, not copying the product.

### One Ring mode — illuminated manuscript
- **Mood**: parchment and ink, ranger's journal, warm and restrained. Readable in dim gaming-table light.
- **Palette**:
  - Background: aged parchment, warm off-white (`#f3e7d0` ish), optionally with a subtle paper texture (SVG noise or a tiling image — very low contrast).
  - Body ink: iron-gall dark brown-black (`#2a1a0e` ish), not pure black.
  - Accent: red ochre / rubric red (`#8b2c1e` ish) for headings and flourishes, echoing medieval manuscript rubrication.
- **Typography** (all free, Google Fonts):
  - Headings: *IM Fell English* or *Cormorant SC* — calligraphic without being cosplay.
  - Body: *EB Garamond* or *Cormorant Garamond* — warm, readable, period-appropriate.
- **Decoration**: a single small decorative flourish (an SVG leaf, a simple illuminated-letter-style initial, a horizontal rule with a dingbat centre) above the weather result. Not busy. One motif, used sparingly.
- **Weather result presentation**: framed like a journal entry — e.g. "*The 14th day of Afteryule, in Wilderland —*" followed by the weather in prose.

### Blade Runner mode — neon noir terminal
- **Mood**: atmospheric-monitoring console readout, 2049 LA, grimy future. Low light, high contrast.
- **Palette**:
  - Background: deep near-black with a cool blue undertone (`#0a0e14` ish). Optional very subtle scanline overlay (CSS repeating linear-gradient, low opacity).
  - Primary text: desaturated off-white / pale cyan (`#c8d4d8` ish).
  - Accents: magenta (`#ff2e88` ish) and cyan (`#00e5ff` ish), used sparingly — for headings, key values, the roll button. Think "neon sign through rain."
- **Typography** (all free, Google Fonts):
  - Everything monospace. *Space Mono* or *JetBrains Mono*.
- **Decoration**: minimal chrome. A thin rule under section headings. Maybe a fake timestamp (`2037-11-14 / SECTOR 04`) above the weather result. Text could have a subtle text-shadow glow on accent colours to read as "neon."
- **Weather result presentation**: styled like a terminal readout — monospaced, all-caps for the condition line, lowercase for the description. Slightly clipped, technical tone.

### Shared principles
- **Readable first, atmospheric second.** If a design choice makes the weather harder to read across a table, it loses.
- **Restraint.** One or two signature touches per mode, used consistently. Not a theme park.
- **Respect mobile constraints.** Textures and glow effects must be cheap on a phone GPU. Test on the target devices.

## Out of scope for v1
- Sharing weather with players (screenshot is fine).
- Custom region editor in-app (edit JSON by hand; this is a Loremaster tool, not a consumer product).
- Temperature in specific numbers — descriptions only ("cold", "biting cold") match the RPG feel better.
- Hour-by-hour weather.
- Sound effects or ambient audio (tempting for Blade Runner mode; save for later).

## Open questions to settle with Claude Code
1. Exact table contents for each region/season (need to draft these — partly creative, partly referencing *The One Ring* 2e source material).
2. Transition matrix weights — will need tuning by play.
3. Visual design — minimal and readable at the table. Dark-mode-friendly. No flashy animations.
