# Journeys of the Wild — Journey Events Design Doc

## Purpose

Extends the existing weather PWA into a full session companion for *The One Ring RPG*. Adds two major features:

- **Journey Events** — procedurally-selected events for the Journey system, driven by Event Target (Scout / Lookout / Hunter), region, and season.
- **Camp Events** — a simple event generator for nightly camp results, using a feat-die-weighted table.

Plus one shared utility:

- **Predator lookup** — region-appropriate predator generator, invoked both standalone and by events that produce predator encounters.

Weather remains the third core feature. All three sit within a One Ring mode; Blade Runner mode continues to support weather only.

## Relationship to the existing app

This is an **extension of the existing app**, not a new app. Lives in the same repo, deploys to the same URL, shares the same data directory, inherits the same aesthetics. The weather engine is preserved and made callable from other parts of the app rather than being torn out.

## Non-goals (v1)

- Hunting Day flow (dedicated day spent hunting to replenish rations) — explicitly out of scope; players roll their own dice
- Terrain generator for camp setup — the d4/d6/d8/d12/d20 dice-drop stays a physical table ritual
- Event mitigation rolling — the app presents success/failure fatigue; players roll their own mitigation skills
- Campaign tracking, XP, party sheets, character tracking — not this app's job
- Blade Runner equivalents of Journey or Camp events — One Ring only
- Deep integration between features beyond what's specified below (e.g. no event history influencing future events)
- Custom event authoring in-app — JSON is edited by hand

## Information architecture

### Top-level navigation: bottom tab bar

Three tabs, fixed at the bottom of the viewport on mobile, adapted to a vertical sidebar at desktop widths if practical:

- **Weather** — existing feature, unchanged in core behaviour
- **Journey** — new
- **Camp** — new

Each tab is independent; switching tabs preserves the state of each. The Weather tab retains its One Ring / Blade Runner mode toggle. Journey and Camp tabs are One Ring only — **no mode toggle visible**; if the user is in Blade Runner mode when they switch to Journey or Camp, the mode is silently forced back to One Ring (with a brief visible transition; the theme reverts to manuscript).

### Rationale

Tab bar is the native mobile pattern for this class of tool, scales to future features (predator lookup as a standalone tab, maybe), and cleanly communicates that the app is a session companion rather than a single-purpose utility. Bottom placement keeps it reachable with thumbs.

## Data model

### Directory layout

```
data/
├── manifest.json              # existing: lists weather regions
├── transitions.json           # existing: weather transition matrix
├── regions/                   # existing: weather region tables
│   ├── eriador.json
│   ├── wilderland.json
│   └── ...                    # twelve regions total
└── journey-events/            # new
    ├── manifest.json          # lists event files by Event Target
    ├── predators.json         # shared predator lookup
    ├── scout-geography.json
    ├── scout-campsite.json
    ├── scout-settlement.json
    ├── scout-ruin.json
    ├── scout-routing.json
    ├── lookout-weather.json
    ├── lookout-traveller.json
    ├── lookout-battle-site.json
    ├── lookout-predators.json
    ├── lookout-threats.json
    ├── lookout-robbery.json
    └── hunter.json
```

### Journey events manifest schema

```json
{
  "scout_events":   ["scout-geography", "scout-campsite", "..."],
  "lookout_events": ["lookout-weather", "lookout-traveller", "..."],
  "hunter_events":  ["hunter"],
  "shared":         ["predators"]
}
```

Files in the three `*_events` arrays are rollable event tables. Files in `shared` are utility data (predator lookup). The app loads all of them at startup.

### Event file schemas — two shapes

**Shape A — flat events array.** Used when a file has no meaningful sub-categories (Campsite, Routing, Battle Site, Predators, Weather, Hunter's sub-tables use this internally).

```json
{
  "id": "scout-campsite",
  "name": "Campsite",
  "event_target": "scout",
  "description": "...",
  "events": [
    {
      "id": "campsite_massacre",
      "label": "A camp littered with corpses...",
      "fatigue_success": 2,
      "fatigue_failure": 3,
      "on_eye": "The killers are still in the area...",
      "notes": "Investigation/shadow event..."
    }
  ]
}
```

**Shape B — typed events.** Used when sub-categories matter (Settlement, Ruin, Traveller, Threats, Robbery, Hunter).

```json
{
  "id": "scout-settlement",
  "name": "Settlement",
  "event_target": "scout",
  "description": "...",
  "types": {
    "farmstead": {
      "label": "Farmstead",
      "description": "...",
      "events": [ /* array of event objects as in Shape A */ ]
    },
    "hamlet": { "..." }
  }
}
```

Rolling logic handles both shapes uniformly: if `events` is present, roll from it; if `types` is present, pick a random type, then roll from its `events`.

### Event object fields

Every event, regardless of shape, has:

- `id` (string, required): unique within its file
- `label` (string, required): the prose read at the table
- `fatigue_success` (integer 0–3, required): fatigue inflicted if the target's mitigation roll succeeds
- `fatigue_failure` (integer 0–3, required): fatigue inflicted on failure
- `on_eye` (string, optional): additional consequence if the mitigation roll produces an Eye of Sauron
- `notes` (string, optional): GM-facing note about the event's intent

Future optional fields (not required in v1, but the schema reserves space):

- `regional_labels` (object, optional): `{ "rohan": "...", "gondor": "..." }` overrides for `label` when rolled in specific regions
- `shadow_points` (integer, optional): shadow points inflicted as a core part of the event (independent of Eye of Sauron)
- `rations_lost` (integer or string, optional): `"1d4"` or `2` — mechanical ration cost

### Predators data file schema

```json
{
  "predators": [
    {
      "id": "warg",
      "name": "Warg",
      "description": "A warg — larger than any wolf...",
      "regions": ["wilderland", "misty-mountains", "mirkwood", "dunland"],
      "stat_reference": "Core rulebook — adversary statistics"
    }
  ]
}
```

Predators are filtered to the current region before rolling. If no region-appropriate predators exist, fall back to a generic subset (e.g. bear, wolf pack, wild boar — predators with broad regional applicability).

## Journey Events — UI and flow

### Initial state (Journey tab)

Controls visible:

- Region selector (shared state with Weather tab — same region)
- Season selector (shared state with Weather tab)
- Three large Event Target buttons: **Scout**, **Lookout**, **Hunter**

No roll happens automatically. The GM rolls their feat die at the table, sees which target came up (per their homebrew rules), and taps the corresponding button.

### Roll flow

1. GM taps one of Scout / Lookout / Hunter
2. App picks a random event file from the appropriate array in the manifest (e.g. Scout → one of `scout-geography`, `scout-campsite`, `scout-settlement`, `scout-ruin`, `scout-routing`)
3. If the file uses Shape B (types), pick a random type
4. Pick a random event from the (typed or flat) events array
5. Render the result

### Result display

- The event's `label` rendered prominently, journal-entry style — same aesthetic idiom as the weather result
- A small meta line: "In Eriador — Scout event" (or similar)
- Fatigue values: "Success: 1 Fatigue · Failure: 2 Fatigue"
- If `on_eye` is present: a separate line styled as a warning: "If Eye of Sauron: [text]"
- If `notes` is present: collapsed by default, tappable to expand ("GM notes")
- **Cross-reference handling:** if the event text mentions a predator encounter, append an inline "Roll predator" button (see below). If the event is `lookout-weather`, automatically invoke the weather engine (see Weather integration below).

A "Roll another" button rolls a fresh event for the same Event Target. A row of three smaller buttons underneath allows re-rolling for a different target quickly.

### Cross-reference button: Predator

When an event mentions a predator encounter (currently these: `cave_wolves_den`, `cave_bear`, `fishing_disturbed`, `hunting_predator_encounter`, `stash_trapped`, and all events in `lookout-predators`), a **"Roll a predator"** button appears inline with the event result.

Tapping it calls the shared predator-roll function with the current region and appends the predator's name and description below the event. Can be tapped again to re-roll if the GM wants a different option.

**Implementation note:** which events trigger the button is determined by an explicit flag on the event, not by text matching. Add an optional `triggers_predator: true` field to the relevant events in the JSON. If present, show the button; if not, don't. Prevents fragile string-matching logic.

### Weather integration (deep)

When the GM rolls a Lookout event and the selected file is `lookout-weather`, the app:

1. Skips the normal event-display flow
2. Calls the weather engine's `rollWeather(regionId, season)` function directly
3. Displays the weather result within the Journey tab, styled consistently with a Journey event
4. Shows a small link/button: "See weather details" that switches to the Weather tab with the same result still displayed

The weather result inherits fatigue implications from its category (clear/overcast: 0–1, mist/rain: 1–2, storm: 2–3). The app displays these alongside the weather, so the GM gets fatigue info without having to interpret the weather category themselves.

**This requires refactoring the existing weather module**: extract a pure `rollWeather(regionId, season)` function that returns a result object, usable by both the Weather tab's roll button and the Journey tab's weather event. The existing weather UI calls this function internally; no behaviour change for the Weather tab.

## Camp Events — UI and flow

### Controls

- Region selector (shared with other tabs)
- Season selector (shared with other tabs)
- A "Scout's Explore roll succeeded" checkbox (defaults to unchecked)
- A large "Roll camp event" button

### Roll logic

Camp events are driven by a feat die roll:

- Numbered 7–10 → **No event** (40% base chance, more with favoured roll)
- Numbered 1 → **Attack**
- Numbered 2 → **Robbery**
- Numbered 3 → **Flash flood**
- Numbered 4 → **Bears / Boars** (1d6 rations lost)
- Numbered 5 → **Wanderer**
- Numbered 6 → **Elves leave a gift** (1d6 Lembas)
- Gandalf rune → **Elves leave a gift, elevated** (extra Lembas or a word of counsel)
- Eye of Sauron → **Attack, worsened** (larger force, or a creature of Shadow)

The "favoured" checkbox doubles the roll and keeps the higher result (standard TOR favoured mechanic). This biases toward higher numbers and therefore toward "no event."

### Camp event content

A new data file is required: `data/journey-events/camp-events.json`. Each event outcome has:

- A base prose description per outcome type
- An optional array of region-specific variants (same `regional_labels` pattern as journey events)
- A `consequences` field for mechanical effects (rations lost, 1d6 Lembas gained)

**This content needs to be authored** — it's not covered in the content-authoring session so far. Include as part of the build plan.

### Result display

Same journal-entry aesthetic as weather and journey events. Mechanical consequences clearly labelled. Gandalf-rune results have a subtle positive visual treatment (a small illuminated letter, a flourish); Eye-of-Sauron results have a subtle darkening or a red accent. Keep the aesthetic within the existing manuscript theme.

## Predator lookup — standalone feature

Not a full tab in its own right, but reachable two ways:

1. **Inline button** within events that trigger a predator encounter (described above)
2. **Standalone button** on the Journey tab labelled "Roll predator" — for when a player triggers a predator encounter via their own hunting roll and the GM wants a quick lookup

Both paths call the same underlying function: given a region, return a random region-appropriate predator. Displays name, description, and the stat reference.

## State and persistence

### In-memory state (app-level)

- Current tab (Weather / Journey / Camp)
- Current mode (One Ring / Blade Runner — only meaningful in Weather tab)
- Current region
- Current season
- Current displayed result (per tab)

### Persisted state (localStorage)

- Current tab (restore on load)
- Current mode
- Current region
- Current season
- Per-triplet weather history (existing, unchanged)

### Not persisted

- Journey event results (stateless; each roll is independent)
- Camp event results (stateless)
- Predator lookups (stateless)

### Storage schema additions

No breaking changes to existing schema. New top-level keys:

- `rpgw:currentTab` → `"weather" | "journey" | "camp"`

Existing keys unchanged.

## Architecture and module structure

### New modules

- `journey.js` — journey event selection logic and UI wiring for the Journey tab
- `camp.js` — camp event roll and UI wiring for the Camp tab
- `predators.js` — shared predator selection function, callable from multiple places
- `tabs.js` — tab bar UI and navigation logic (shared across all tabs)

### Existing modules to refactor

- `app.js` — becomes a thin orchestrator that wires up all three tabs. Most of its current logic (weather-specific) moves into `weather.js` (new name) or stays as the Weather tab's own module.
- `roller.js` — keep. The weighted-random function with transition bias is already pure and reusable. Rename to reflect its role if desired (e.g. `weighted-random.js`), but no behaviour change.
- Weather module — add a pure exported `rollWeather(regionId, season, options)` function alongside the existing UI-bound logic. The UI's roll button calls this function internally.

### Dice module

A new small module, `dice.js`, implements TOR-specific dice mechanics:

- `featDie(favoured: boolean)` — returns `{ value: 1..10 | "gandalf" | "eye", raw: [...] }`
- Used by camp events; journey events don't need it (the GM rolls their own mitigation)

No other dice utilities required for v1.

## Build order

1. **Refactor the weather module** — extract `rollWeather()` as a pure callable. Verify the Weather tab still works unchanged.
2. **Add `tabs.js` and the tab bar UI** — three tabs, only Weather functional initially. Verify navigation and state preservation.
3. **Create `data/journey-events/manifest.json` loading** — app reads the manifest at startup alongside the existing regions manifest.
4. **Build `predators.js`** — pure function, no UI yet, just the data-driven predator selection.
5. **Build `journey.js` — Event Target buttons and event rolling** — Shape-A and Shape-B handling; render event results. Predator button wiring comes with this.
6. **Wire weather integration into Journey** — the `lookout-weather` case calls `rollWeather()` and renders the result in the Journey tab.
7. **Build `camp.js` and `dice.js`** — feat die roll, camp event selection, result display.
8. **Author camp event content** — `camp-events.json` with prose per outcome. Parallel to step 7.
9. **Final integration pass** — tab state persistence, cross-tab state preservation (region/season shared), theme consistency check, mobile layout verification.

## UI and aesthetic

### Theme

The One Ring manuscript theme (parchment, iron-gall, red-ochre) applies to all three tabs. The Blade Runner terminal theme remains Weather-tab-only. Switching to Journey or Camp while in Blade Runner mode forces a mode swap back to One Ring with a brief theme transition.

### New UI elements needed

- **Tab bar** — bottom-fixed on mobile, consistent visual treatment with existing controls
- **Event Target buttons** (Scout / Lookout / Hunter) — large, tappable, visually distinct from each other (perhaps small iconography: eye for Lookout, compass for Scout, bow for Hunter — kept minimal)
- **Fatigue display** — small, readable, styled to echo the manuscript theme (perhaps ornamental numbers or roman-numeral hints)
- **Eye of Sauron warning** — distinct treatment, perhaps a dark red accent or a small icon, without being garish
- **Inline Roll Predator button** — secondary button styling, sits below event result
- **GM notes collapsible** — small, low-emphasis, expandable details

### Accessibility

- All interactive elements keep `min-height: 44px` (existing standard)
- Result regions maintain `aria-live="polite" aria-atomic="true"` so GMs using screen readers get announcements
- Tab bar announces tab changes to assistive tech
- Event Target buttons have clear labels (not just icons)

## Open questions for implementation

1. **Visual differentiation of Event Target buttons.** Icons, colours, layout? Defer to Claude Code's design pass; aim for restraint.
2. **Tab-switch animation.** None by default; if Claude Code wants a subtle transition, no objection so long as it's cheap on mobile GPU.
3. **Camp event prose content.** Needs authoring in parallel with implementation (step 8). Seven prose variants minimum (one per outcome type); regional variants optional v1.

## What's explicitly carried forward from the weather app

- Data-driven architecture (JSON content, minimal app code knows about specific events/regions)
- PWA structure (service worker, manifest, offline support once deployed)
- Plan-first discipline when working with Claude Code (review plans before they become code; keep roller/state logic pure; short leash on anything that touches persisted state)
- Two-theme system (manuscript One Ring / terminal Blade Runner)
- Aesthetic restraint ("readable at the table first, atmospheric second")

## Out of scope — revisit list

Items parked for future versions but worth tracking:

- **Region-specific event prose** (the `regional_labels` field is reserved but not populated in v1)
- **Hunter Day flow** — full hunting-day resolution if the players want it, with rations found per hunter
- **Terrain generator** — digital dice-drop for camp setup (the d4/d6/d8/d12/d20 layout)
- **Event mitigation rolling** — app could roll mitigation if the GM prefers, rather than the player
- **Event history log** — a scrollable list of recent rolls for campaign notes
- **Shareable links** — "send this weather/event to a player" via URL
- **Custom region authoring in-app** — requires JSON editing tooling; v3+
- **Blade Runner journey events** — the *Blade Runner RPG* doesn't have an equivalent system, but if desired, could be designed later

