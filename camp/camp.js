// Camp tab — rolls camp events using the One Ring feat die with optional
// favoured mechanic, and provides standalone predator/shadow lookups.

import { state } from '../state.js';
import { saveUI } from '../weather/weather.js';
import { featDie, dieFaceLabel } from './dice.js';
import { rollPredator, rollShadow } from '../journey/predators.js';

// ── DOM refs ───────────────────────────────────────────────────────────────

const $ = id => document.getElementById(id);

const els = {
  regionSelect:     $('camp-region-select'),
  seasonSelect:     $('camp-season-select'),
  favouredCheck:    $('camp-favoured'),
  rollBtn:          $('camp-roll-btn'),
  result:           $('camp-result'),
  lookupPredatorBtn: $('camp-lookup-predator-btn'),
  lookupShadowBtn:   $('camp-lookup-shadow-btn'),
  lookupResult:      $('camp-lookup-result'),
  lookupType:        $('camp-lookup-type'),
  lookupName:        $('camp-lookup-name'),
  lookupDesc:        $('camp-lookup-desc'),
  lookupRef:         $('camp-lookup-ref'),
  flourish:         $('camp-flourish'),
  dieResult:        $('camp-die-result'),
  eventLabel:       $('camp-event-label'),
  eventVariant:     $('camp-event-variant'),
  consequences:     $('camp-consequences'),
  consequencesText: $('camp-consequences-text'),
};

// ── Helpers ────────────────────────────────────────────────────────────────

// Maps numeric die faces 1–6 to their camp event outcome keys in camp-events.json.
// Faces 7–10 always resolve to no_event; Eye and Gandalf are handled separately.
const NUM_KEY = {
  1: 'attack', 2: 'robbery', 3: 'flood',
  4: 'beasts', 5: 'wanderer', 6: 'elves_gift',
};

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Resolves a die face to its camp event outcome object. Eye and Gandalf are
// special outcomes with their own keys; numeric faces 7+ mean nothing happens.
function getOutcome(value) {
  if (value === 'eye')     return state.campEvents.special_outcomes.eye_worsened_attack;
  if (value === 'gandalf') return state.campEvents.special_outcomes.gandalf_elevated_gift;
  if (value >= 7)          return state.campEvents.outcomes.no_event;
  return state.campEvents.outcomes[NUM_KEY[value]];
}

// ── Lookup rendering ──────────────────────────────────────────────────────

function renderLookup(item, typeName) {
  if (!item) return;
  els.lookupType.textContent = typeName;
  els.lookupName.textContent = item.name;
  els.lookupDesc.textContent = item.description;
  els.lookupRef.textContent  = item.stat_reference ?? '';
  els.lookupResult.hidden    = false;
}

// ── Rolling ────────────────────────────────────────────────────────────────

// Rolls the feat die, resolves the outcome, and renders the result. When
// favoured, the raw rolls are shown alongside the kept value so the player
// can see both dice. Visual treatment is driven by data-outcomeType on the
// result element so CSS handles the styling without any inline style logic.
function rollCamp() {
  const favoured       = els.favouredCheck.checked;
  const { value, raw } = featDie(favoured);
  const outcome        = getOutcome(value);
  if (!outcome) return;

  let dieText = dieFaceLabel(value);
  if (favoured && raw.length === 2) {
    dieText += ` (rolled ${raw.map(dieFaceLabel).join(' and ')})`;
  }

  els.dieResult.textContent    = dieText;
  els.eventLabel.textContent   = outcome.label;
  els.eventVariant.textContent = pickRandom(outcome.variants);

  if (outcome.consequences) {
    els.consequencesText.textContent = outcome.consequences;
    els.consequences.hidden = false;
    els.consequences.open   = false;  // collapsed by default; GM can expand if needed
  } else {
    els.consequences.hidden = true;
  }

  // Gandalf triggers a decorative flourish animation; Eye and Gandalf also
  // get distinct CSS treatment via data-outcomeType (good/evil/neutral).
  els.flourish.hidden            = value !== 'gandalf';
  els.result.dataset.outcomeType = value === 'gandalf' ? 'good'
                                 : value === 'eye'     ? 'evil'
                                 : 'neutral';
  els.result.hidden = false;
}

// ── Sync (called by tabs.js when switching to camp tab) ────────────────────

// Repopulates the region and season dropdowns from One Ring regions in shared
// state. Called by tabs.js on every tab switch so selectors stay in sync.
export function syncCampControls() {
  const oneRingRegions = Object.values(state.regions).filter(r => r.mode === 'one-ring');
  els.regionSelect.innerHTML = oneRingRegions
    .map(r => `<option value="${r.id}">${r.name}</option>`)
    .join('');
  els.regionSelect.value = state.regionId;
  els.seasonSelect.value = state.season;
}

// ── Init ──────────────────────────────────────────────────────────────────

export function initCamp() {
  syncCampControls();

  els.regionSelect.addEventListener('change', () => {
    state.regionId = els.regionSelect.value;
    saveUI();
  });

  els.seasonSelect.addEventListener('change', () => {
    state.season = els.seasonSelect.value;
    saveUI();
  });

  els.rollBtn.addEventListener('click', rollCamp);

  els.lookupPredatorBtn.addEventListener('click', () => {
    renderLookup(rollPredator(), 'Predator');
  });

  els.lookupShadowBtn.addEventListener('click', () => {
    renderLookup(rollShadow(), 'Shadow');
  });
}
