// Shared app state — the single source of truth imported by all tab modules.
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
  transitions: {},  // { [category]: { [category]: multiplier } }

  // ── Journey & Camp data (loaded once at startup) ─────────────────────────
  // Raw manifest object — kept so journey.js can resolve file IDs per target
  // without duplicating the manifest arrays.
  journeyManifest: null,

  // Rollable event files only (those with event_target: scout | lookout | hunter).
  // Keyed by file ID (e.g. 'scout-geography', 'lookout-predators', 'hunter').
  journeyFiles: {},

  // Predators array extracted from predators.json — kept separate because it
  // is utility data (filtered + rolled against) rather than a rollable event table.
  predators: [],
  prey:      [],
  shadow:    [],

  // Full camp-events.json object — kept separate because its schema (outcomes
  // keyed object with variants arrays) differs from the journey event shapes.
  campEvents: null,
};
