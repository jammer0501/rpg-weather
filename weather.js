import { roll } from './roller.js';
import { state } from './state.js';

// ── localStorage ───────────────────────────────────────────────────────────

export const UI_KEY = 'rpgw:ui';

function tripletKey() {
  return `rpgw:${state.mode}:${state.regionId}:${state.season}`;
}

function defaultTriplet() {
  return { prevCategory: null, resultLabel: null };
}

function loadTriplet() {
  try {
    const raw = localStorage.getItem(tripletKey());
    return raw ? { ...defaultTriplet(), ...JSON.parse(raw) } : defaultTriplet();
  } catch {
    return defaultTriplet();
  }
}

function saveTriplet(data) {
  localStorage.setItem(tripletKey(), JSON.stringify(data));
}

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

function buildMeta() {
  if (state.mode === 'one-ring') {
    const regionName = state.regions[state.regionId]?.name ?? '';
    return `In ${regionName}, ${capitalize(state.season)} —`;
  }
  return null;  // Blade Runner: no meta line
}

// ── UI population ──────────────────────────────────────────────────────────

function populateRegionSelect() {
  const filtered = Object.values(state.regions).filter(r => r.mode === state.mode);
  els.regionSelect.innerHTML = filtered
    .map(r => `<option value="${r.id}">${r.name}</option>`)
    .join('');
  els.regionSelect.value = state.regionId;
}

// ── State → UI sync ────────────────────────────────────────────────────────

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

function restoreResult() {
  const triplet = loadTriplet();
  if (triplet.resultLabel) {
    renderResult(triplet.resultLabel);
  } else {
    clearResult();
  }
}

// ── Rolling ────────────────────────────────────────────────────────────────

// Pure roll: reads current region/season/mode from shared state, updates the
// per-triplet localStorage history, returns the rolled entry. Exported so
// Journey tab can invoke it for lookout-weather events.
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

function onReset() {
  saveTriplet(defaultTriplet());
  clearResult();
}

// ── Mode forcing (called by tabs.js when switching to Journey/Camp) ────────

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
