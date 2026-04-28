// Tab navigation and mode coordination. Owns the tab bar UI and tells other
// modules to sync their controls whenever the active tab changes.

import { state } from '../state.js';
import { forceOneRingMode } from '../weather/weather.js';
import { syncJourneyControls } from '../journey/journey.js';
import { syncCampControls } from '../camp/camp.js';

const TAB_KEY = 'rpgw:currentTab';

const els = {
  tabBar:  document.querySelector('.tab-bar'),
  tabBtns: document.querySelectorAll('.tab-btn'),
  panels: {
    weather: document.getElementById('tab-weather'),
    journey: document.getElementById('tab-journey'),
    camp:    document.getElementById('tab-camp'),
  },
  modeNav: document.querySelector('.mode-nav'),
};

// Switches the visible panel, updates tab button states, and coordinates any
// side-effects required by the incoming tab. Journey and Camp only support
// One Ring mode, so switching to them resets Blade Runner if it was active.
function activateTab(tabId) {
  if (tabId === 'journey' || tabId === 'camp') {
    forceOneRingMode();
  }

  // Sync the incoming tab's dropdowns to shared state before revealing it,
  // so the user never sees stale values flash in.
  if (tabId === 'journey') syncJourneyControls();
  if (tabId === 'camp')    syncCampControls();

  state.tab = tabId;

  for (const [id, panel] of Object.entries(els.panels)) {
    panel.hidden = id !== tabId;
  }

  els.tabBtns.forEach(btn => {
    const active = btn.dataset.tab === tabId;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', String(active));
  });

  // Mode toggle is only meaningful on the Weather tab; hide it elsewhere
  // to avoid confusing users who can't switch mode on Journey/Camp anyway.
  els.modeNav.hidden = tabId !== 'weather';

  localStorage.setItem(TAB_KEY, tabId);
}

// Restores the last active tab from localStorage, then wires up the tab bar
// and the custom event that lets journey.js request a switch to the weather tab.
export function initTabs() {
  const saved = localStorage.getItem(TAB_KEY);
  activateTab(saved && els.panels[saved] ? saved : 'weather');

  // journey.js dispatches this event when the user clicks the weather link
  // inside a lookout-weather result, so it doesn't need to import tabs.js.
  document.addEventListener('rpgw:switch-tab', e => activateTab(e.detail));

  // Delegated listener on the bar so we don't need individual listeners per button.
  els.tabBar.addEventListener('click', e => {
    const btn = e.target.closest('.tab-btn');
    if (!btn || btn.dataset.tab === state.tab) return;
    activateTab(btn.dataset.tab);
  });
}
