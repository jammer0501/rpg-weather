// Weather tab — UI rendering, localStorage persistence, and the rollWeather
// function that is also used by journey.js for lookout-weather events.

import { roll } from './roller.js';
import { state } from '../state.js';

// ── localStorage ───────────────────────────────────────────────────────────

// Key under which the current mode/region/season selection is persisted so
// the app reopens in the same context across sessions.
export const UI_KEY = 'rpgw:ui';

// Each unique mode/region/season combination gets its own storage slot so
// switching context never overwrites the roll history of another context.
function tripletKey() {
  return `rpgw:${state.mode}:${state.regionId}:${state.season}`;
}

function defaultTriplet() {
  return { prevCategory: null, resultLabel: null };
}

// Loads the persisted roll history for the current context. The spread onto
// defaultTriplet() guards against partially-written entries in storage.
function loadTriplet() {
  try {
    const raw = localStorage.getItem(tripletKey());
    return raw ? { ...defaultTriplet(), ...JSON.parse(raw) } : defaultTriplet();
  } catch {
    return defaultTriplet();
  }
}

// Persists the last rolled category and label so the Markov chain carries
// state across page reloads and the result can be restored on return.
function saveTriplet(data) {
  localStorage.setItem(tripletKey(), JSON.stringify(data));
}

// Persists the current mode/region/season selection. Called whenever any of
// those three change so the app reopens in the same state.
export function saveUI() {
  localStorage.setItem(UI_KEY, JSON.stringify({
    mode:     state.mode,
    regionId: state.regionId,
    season:   state.season,
  }));
}

// ── DOM refs ───────────────────────────────────────────────────────────────

const $ = id => document.getElementById(id);

const els = {
  body:           document.body,
  themeColor:     $('meta-theme-color'),
  modeNav:        document.querySelector('.mode-nav'),
  modeBtns:       document.querySelectorAll('.mode-btn'),
  regionSelect:   $('region-select'),
  seasonGroup:    $('season-group'),
  seasonSelect:   $('season-select'),
  rollBtn:        $('roll-btn'),
  result:         $('result'),
  resultFlourish: $('result-flourish'),
  resultMeta:     $('result-meta'),
  resultLabel:    $('result-label'),
  resetBtn:       $('reset-btn'),
};

// ── Formatting ─────────────────────────────────────────────────────────────

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Returns the contextual meta line shown above the result label, or null for
// Blade Runner mode where named regions and seasons don't exist.
function buildMeta() {
  if (state.mode === 'one-ring') {
    const regionName = state.regions[state.regionId]?.name ?? '';
    return `In ${regionName}, ${capitalize(state.season)} —`;
  }
  return null;
}

// ── UI population ──────────────────────────────────────────────────────────

// Rebuilds the region dropdown filtered to the current mode. One Ring and
// Blade Runner have entirely separate region sets so the two never mix.
function populateRegionSelect() {
  const filtered = Object.values(state.regions).filter(r => r.mode === state.mode);
  els.regionSelect.innerHTML = filtered
    .map(r => `<option value="${r.id}">${r.name}</option>`)
    .join('');
  els.regionSelect.value = state.regionId;
}

// ── State → UI sync ────────────────────────────────────────────────────────

// Applies all mode-driven UI changes in one pass: body class (loads the
// correct CSS theme), theme-color meta tag, season visibility (Blade Runner
// has no seasons), and the roll button label.
export function syncModeUI() {
  const isBR = state.mode === 'blade-runner';
  els.body.className     = `mode-${state.mode}`;
  els.themeColor.content = isBR ? '#0a0e14' : '#f3e7d0';

  els.modeBtns.forEach(btn => {
    const active = btn.dataset.mode === state.mode;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', String(active));
  });

  els.seasonGroup.hidden = isBR;
  els.seasonSelect.value = state.season;
  els.rollBtn.textContent = isBR ? 'Generate report' : 'Roll weather';
}

// ── Result rendering ───────────────────────────────────────────────────────

function renderResult(label) {
  const meta = buildMeta();
  els.resultLabel.textContent = label;
  els.resultMeta.textContent  = meta ?? '';
  els.resultMeta.hidden       = meta === null;
  els.result.hidden           = false;
}

function clearResult() {
  els.result.hidden = true;
}

// Recovers the last rolled result for the current context so history is
// preserved when the user switches regions or seasons and switches back.
function restoreResult() {
  const triplet = loadTriplet();
  if (triplet.resultLabel) {
    renderResult(triplet.resultLabel);
  } else {
    clearResult();
  }
}

// ── Rolling ────────────────────────────────────────────────────────────────

// Performs a weather roll for the current context, persists the result so
// the Markov chain can use it next time, and returns the entry. Exported so
// journey.js can trigger a roll for lookout-weather events without
// duplicating the roll/persist logic.
export function rollWeather() {
  const entries = state.regions[state.regionId].seasons[state.season];
  const triplet = loadTriplet();
  const entry   = roll(entries, triplet.prevCategory, state.transitions);
  saveTriplet({ prevCategory: entry.category, resultLabel: entry.label });
  return entry;
}

function doRoll() {
  renderResult(rollWeather().label);
}

// ── Event handlers ─────────────────────────────────────────────────────────

// Switching mode also resets season (Blade Runner has no named seasons) and
// picks the first valid region for the new mode.
function onModeClick(e) {
  const btn = e.target.closest('.mode-btn');
  if (!btn || btn.dataset.mode === state.mode) return;

  state.mode     = btn.dataset.mode;
  state.season   = state.mode === 'blade-runner' ? 'any' : 'spring';
  state.regionId = Object.values(state.regions).find(r => r.mode === state.mode).id;

  syncModeUI();
  populateRegionSelect();
  restoreResult();
  saveUI();
}

function onRegionChange() {
  state.regionId = els.regionSelect.value;
  restoreResult();
  saveUI();
}

function onSeasonChange() {
  state.season = els.seasonSelect.value;
  restoreResult();
  saveUI();
}

// Clears the Markov history for the current context so the next roll is
// unbiased — useful when starting a new in-game day or travel leg.
function onReset() {
  saveTriplet(defaultTriplet());
  clearResult();
}

// ── Mode forcing (called by tabs.js when switching to Journey/Camp) ────────

// Journey and Camp only support One Ring content. If Blade Runner was active,
// this resets mode, season, and region before the new tab renders.
export function forceOneRingMode() {
  if (state.mode === 'one-ring') return;
  state.mode     = 'one-ring';
  state.season   = 'spring';
  state.regionId = Object.values(state.regions).find(r => r.mode === 'one-ring').id;
  syncModeUI();
  populateRegionSelect();
  restoreResult();
  saveUI();
}

// ── Init ───────────────────────────────────────────────────────────────────

export function initWeather() {
  populateRegionSelect();
  syncModeUI();
  restoreResult();

  els.modeNav.addEventListener('click', onModeClick);
  els.regionSelect.addEventListener('change', onRegionChange);
  els.seasonSelect.addEventListener('change', onSeasonChange);
  els.rollBtn.addEventListener('click', doRoll);
  els.resetBtn.addEventListener('click', onReset);
}
