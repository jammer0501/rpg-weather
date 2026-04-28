// Entry point. Fetches all game data, restores saved UI preferences, then
// initialises each tab module in the correct order.

import { state } from './state.js';
import { UI_KEY, initWeather } from './weather/weather.js';
import { initTabs } from './core/tabs.js';
import { initJourney } from './journey/journey.js';
import { initCamp } from './camp/camp.js';

// ── Data loading ───────────────────────────────────────────────────────────

// Fetches all JSON game data in two parallel waves: manifests first so we
// know which region and event file IDs to request, then all dependent files.
// Populates shared state so every tab module has what it needs at init time.
async function loadData() {
  const [weatherManifest, journeyManifest, transitionsData] = await Promise.all([
    fetch('data/manifest.json').then(r => r.json()),
    fetch('data/journey-events/manifest.json').then(r => r.json()),
    fetch('data/transitions.json').then(r => r.json()),
  ]);
  state.transitions    = transitionsData;
  state.journeyManifest = journeyManifest;

  // Collect all rollable event file IDs from the manifest so we can fetch
  // them in one batch rather than lazily on first use.
  const rollableIds = [
    ...journeyManifest.scout_events,
    ...journeyManifest.lookout_events,
    ...journeyManifest.hunter_events,
  ];

  const [regionData, journeyData, predatorsFile, preyFile, shadowFile, campEventsFile] = await Promise.all([
    Promise.all(weatherManifest.regions.map(id =>
      fetch(`data/regions/${id}.json`).then(r => r.json())
    )),
    Promise.all(rollableIds.map(id =>
      fetch(`data/journey-events/${id}.json`).then(r => r.json())
    )),
    fetch('data/journey-events/predators.json').then(r => r.json()),
    fetch('data/journey-events/prey.json').then(r => r.json()),
    fetch('data/journey-events/shadow.json').then(r => r.json()),
    fetch('data/journey-events/camp-events.json').then(r => r.json()),
  ]);

  // Index regions and journey files by ID so tab modules can look them up
  // in O(1) without repeatedly searching the raw arrays.
  for (const region of regionData)  state.regions[region.id]      = region;
  for (const file   of journeyData) state.journeyFiles[file.id]   = file;
  state.predators  = predatorsFile.predators;
  state.prey       = preyFile.prey;
  state.shadow     = shadowFile.shadow;
  state.campEvents = campEventsFile;
}

// ── Init ───────────────────────────────────────────────────────────────────

// Orchestrates startup. Data must be fully loaded before any tab module
// initialises, since they all read from state immediately on first render.
async function init() {
  try {
    await loadData();
  } catch (err) {
    console.error('Failed to load data:', err);
    document.querySelector('.app').textContent =
      'Could not load data. Check your connection and reload.';
    return;
  }

  // Restore the last saved mode/region/season before init so each tab module
  // renders the correct context on first paint rather than the defaults.
  try {
    const saved = JSON.parse(localStorage.getItem(UI_KEY) ?? 'null');
    if (saved?.regionId && state.regions[saved.regionId]) {
      state.mode     = saved.mode;
      state.regionId = saved.regionId;
      state.season   = saved.season;
    }
  } catch { /* corrupted storage — fall through to defaults */ }

  initWeather();
  initJourney();
  initCamp();
  initTabs();
}

init();

// Registered on load (not immediately) to avoid competing with the initial
// data fetches for network bandwidth on slow connections.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('[SW] registered', reg.scope))
      .catch(err => console.warn('[SW] registration failed', err));
  });
}
