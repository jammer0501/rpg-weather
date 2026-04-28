// Shared application state — the single source of truth imported by all tab modules.
// Mutated directly by modules; no reactive wrapper needed at this scale.
//
// Per-tab result state (what's currently displayed) is intentionally NOT here —
// each tab module owns its own result. Only selections and loaded data are shared.

export const state = {
  // ── UI selections (shared across all tabs) ──────────────────────────────
  tab:      'weather',   // 'weather' | 'journey' | 'camp'
  mode:     'one-ring',  // 'one-ring' | 'blade-runner'
  regionId: 'eriador',
  season:   'spring',

  // ── Weather data (loaded once at startup) ───────────────────────────────
  regions:     {},  // { [regionId]: { id, name, mode, seasons: { [season]: entry[] } } }
  transitions: {},  // { [category]: { [category]: multiplier } } — Markov transition matrix

  // ── Journey & Camp data (loaded once at startup) ─────────────────────────

  // Raw manifest object — kept so journey.js can resolve file IDs per target
  // without duplicating the manifest arrays.
  journeyManifest: null,

  // Rollable event files keyed by file ID (e.g. 'scout-geography', 'lookout-predators').
  // Only files with an event_target (scout | lookout | hunter) are stored here.
  journeyFiles: {},

  // Predator/prey/shadow arrays — kept separate from journeyFiles because they
  // are lookup pools (filtered by region and rolled against) rather than event tables.
  predators: [],
  prey:      [],
  shadow:    [],

  // Full camp-events.json object — kept separate because its schema (an outcomes
  // keyed object with variants arrays) differs from the journey event file shapes.
  campEvents: null,
};
