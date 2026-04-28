// Journey tab — rolls scout, lookout and hunter events, displays fatigue costs,
// handles predator triggers, and provides standalone prey/predator/shadow lookups.

import { state } from '../state.js';
import { rollWeather, saveUI } from '../weather/weather.js';
import { rollPredator, rollPrey, rollShadow } from './predators.js';
import { pickRandom, pickEventFromFile, WEATHER_FATIGUE } from './events.js';

// ── DOM refs ───────────────────────────────────────────────────────────────

const $ = id => document.getElementById(id);

const els = {
  regionSelect:             $('journey-region-select'),
  seasonSelect:             $('journey-season-select'),
  eventTargets:             document.querySelector('.event-targets'),
  targetBtns:               document.querySelectorAll('.event-target-btn'),
  result:                   $('journey-result'),
  meta:                     $('journey-meta'),
  eventLabel:               $('journey-event-label'),
  fatigue:                  $('journey-fatigue'),
  weatherLink:              $('journey-weather-link'),
  onEye:                    $('journey-on-eye'),
  notes:                    $('journey-notes'),
  notesText:                $('journey-notes-text'),
  predatorSection:          $('predator-section'),
  rollPredatorBtn:          $('roll-predator-btn'),
  predatorResult:           $('predator-result'),
  predatorName:             $('predator-name'),
  predatorDesc:             $('predator-desc'),
  predatorRef:              $('predator-ref'),
  rollAgainBtn:   $('journey-roll-again-btn'),
  retargetBtns:   document.querySelectorAll('.journey-retarget .secondary-btn'),
  lookupPreyBtn:      $('lookup-prey-btn'),
  lookupPredatorBtn:  $('lookup-predator-btn'),
  lookupShadowBtn:    $('lookup-shadow-btn'),
  lookupResult:       $('lookup-result'),
  lookupType:         $('lookup-type'),
  lookupName:         $('lookup-name'),
  lookupDesc:         $('lookup-desc'),
  lookupRations:      $('lookup-rations'),
  lookupRef:          $('lookup-ref'),
};

// ── Module state ──────────────────────────────────────────────────────────

// Tracks the last event target so "Roll again" can repeat without the user
// having to re-select a target button.
let lastTarget = null;

// ── Helpers ────────────────────────────────────────────────────────────────

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Resolves file IDs for a given target (scout/lookout/hunter) from the manifest,
// then looks each up in the pre-loaded journeyFiles map.
function getTargetFiles(target) {
  const ids = state.journeyManifest?.[`${target}_events`] ?? [];
  return ids.map(id => state.journeyFiles[id]).filter(Boolean);
}

// ── Rendering ──────────────────────────────────────────────────────────────

// Renders a predator inline within the journey result panel. This is separate
// from renderLookup because it writes to different DOM elements (the predator
// section embedded in the event result, not the standalone lookup panel).
function showPredator(predator, nameEl, descEl, refEl, resultEl) {
  nameEl.textContent = predator.name;
  descEl.textContent = predator.description;
  refEl.textContent  = predator.stat_reference ?? '';
  resultEl.hidden    = false;
}

// Renders a standalone prey/predator/shadow lookup result in the lookup panel.
// Rations are only shown for prey entries that carry a rations_yielded value.
function renderLookup(item, typeName) {
  if (!item) return;
  els.lookupType.textContent = typeName;
  els.lookupName.textContent = item.name;
  els.lookupDesc.textContent = item.description;
  els.lookupRef.textContent  = item.stat_reference ?? '';
  if (item.rations_yielded) {
    els.lookupRations.textContent = `Rations: ${item.rations_yielded}`;
    els.lookupRations.hidden = false;
  } else {
    els.lookupRations.hidden = true;
  }
  els.lookupResult.hidden = false;
}

// Special rendering path for lookout-weather events. The weather result is
// displayed with fatigue values derived from the rolled weather category
// rather than from a standard event object (which doesn't exist for this file).
function renderWeatherEvent(entry) {
  const regionName = state.regions[state.regionId]?.name ?? '';
  const fatigue    = WEATHER_FATIGUE[entry.category] ?? { success: 1, failure: 2 };

  els.meta.textContent       = `In ${regionName} — Lookout event`;
  els.eventLabel.textContent = entry.label;
  els.fatigue.textContent    = `Success: ${fatigue.success} Fatigue · Failure: ${fatigue.failure} Fatigue`;

  // Show the link to the Weather tab so the GM can view full weather context.
  // Eye/notes/predator fields don't apply to weather events.
  els.weatherLink.hidden     = false;
  els.onEye.hidden           = true;
  els.notes.hidden           = true;
  els.predatorSection.hidden = true;
  els.eventTargets.hidden    = true;
  els.result.hidden          = false;
}

// Renders a standard journey event. Optional fields (Eye of Sauron trigger,
// GM notes, predator section) are shown only when the event defines them.
function renderJourneyEvent(event, file, typeName) {
  const regionName = state.regions[state.regionId]?.name ?? '';
  const typeLabel  = typeName ? ` (${typeName})` : '';

  els.meta.textContent       = `In ${regionName} — ${capitalize(file.event_target)} event${typeLabel}`;
  els.eventLabel.textContent = event.label;
  els.fatigue.textContent    = `Success: ${event.fatigue_success} Fatigue · Failure: ${event.fatigue_failure} Fatigue`;

  if (event.on_eye) {
    els.onEye.textContent = `Eye of Sauron: ${event.on_eye}`;
    els.onEye.hidden = false;
  } else {
    els.onEye.hidden = true;
  }

  if (event.notes) {
    els.notesText.textContent = event.notes;
    els.notes.hidden = false;
    els.notes.open   = false;  // collapsed by default so it doesn't dominate the result
  } else {
    els.notes.hidden = true;
  }

  els.weatherLink.hidden     = true;
  els.predatorSection.hidden = !event.triggers_predator;
  els.predatorResult.hidden  = true;
  els.eventTargets.hidden    = true;
  els.result.hidden          = false;
}

// ── Rolling ────────────────────────────────────────────────────────────────

// Picks a random event file for the given target, then a random event within
// that file. The lookout-weather file is a special case — it delegates to the
// weather roller rather than containing its own event list.
function rollEvent(target) {
  lastTarget = target;
  const files = getTargetFiles(target);
  if (!files.length) return;

  const file = pickRandom(files);

  if (file.id === 'lookout-weather') {
    renderWeatherEvent(rollWeather());
    return;
  }

  const { event, typeName } = pickEventFromFile(file);
  renderJourneyEvent(event, file, typeName);
}

// ── Sync (called by tabs.js when switching to journey tab) ─────────────────

// Repopulates the region and season dropdowns to match shared state. Called
// by tabs.js on every tab switch so the selectors never show stale values.
export function syncJourneyControls() {
  const oneRingRegions = Object.values(state.regions).filter(r => r.mode === 'one-ring');
  els.regionSelect.innerHTML = oneRingRegions
    .map(r => `<option value="${r.id}">${r.name}</option>`)
    .join('');
  els.regionSelect.value = state.regionId;
  els.seasonSelect.value = state.season;
}

// ── Init ──────────────────────────────────────────────────────────────────

export function initJourney() {
  syncJourneyControls();

  els.regionSelect.addEventListener('change', () => {
    state.regionId = els.regionSelect.value;
    saveUI();
  });

  els.seasonSelect.addEventListener('change', () => {
    state.season = els.seasonSelect.value;
    saveUI();
  });

  els.targetBtns.forEach(btn => {
    btn.addEventListener('click', () => rollEvent(btn.dataset.target));
  });

  // Dispatches a custom event rather than importing tabs.js directly, avoiding
  // a circular dependency (tabs.js already imports journey.js).
  els.weatherLink.addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('rpgw:switch-tab', { detail: 'weather' }));
  });

  els.rollAgainBtn.addEventListener('click', () => {
    if (lastTarget) rollEvent(lastTarget);
  });

  els.retargetBtns.forEach(btn => {
    btn.addEventListener('click', () => rollEvent(btn.dataset.target));
  });

  // Inline predator roll — triggered by an event that flags triggers_predator.
  els.rollPredatorBtn.addEventListener('click', () => {
    const p = rollPredator();
    if (p) showPredator(p, els.predatorName, els.predatorDesc, els.predatorRef, els.predatorResult);
  });

  // Standalone lookup buttons — independent of the current event result.
  els.lookupPreyBtn.addEventListener('click', () => {
    renderLookup(rollPrey(), 'Prey');
  });

  els.lookupPredatorBtn.addEventListener('click', () => {
    renderLookup(rollPredator(), 'Predator');
  });

  els.lookupShadowBtn.addEventListener('click', () => {
    renderLookup(rollShadow(), 'Shadow');
  });
}
