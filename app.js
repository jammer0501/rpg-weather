import { state } from './state.js';
import { UI_KEY, initWeather } from './weather.js';
import { initTabs } from './tabs.js';
import { initJourney } from './journey.js';
import { initCamp } from './camp.js';

// ── Data loading ───────────────────────────────────────────────────────────

async function loadData() {
  const [weatherManifest, journeyManifest, transitionsData] = await Promise.all([
    fetch('data/manifest.json').then(r => r.json()),
    fetch('data/journey-events/manifest.json').then(r => r.json()),
    fetch('data/transitions.json').then(r => r.json()),
  ]);
  state.transitions    = transitionsData;
  state.journeyManifest = journeyManifest;

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

  for (const region of regionData)  state.regions[region.id]      = region;
  for (const file   of journeyData) state.journeyFiles[file.id]   = file;
  state.predators  = predatorsFile.predators;
  state.prey       = preyFile.prey;
  state.shadow     = shadowFile.shadow;
  state.campEvents = campEventsFile;
}

// ── Init ───────────────────────────────────────────────────────────────────

async function init() {
  try {
    await loadData();
  } catch (err) {
    console.error('Failed to load data:', err);
    document.querySelector('.app').textContent =
      'Could not load data. Check your connection and reload.';
    return;
  }

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

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('[SW] registered', reg.scope))
      .catch(err => console.warn('[SW] registration failed', err));
  });
}
