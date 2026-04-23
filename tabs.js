import { state } from './state.js';
import { forceOneRingMode } from './weather.js';
import { syncJourneyControls } from './journey.js';
import { syncCampControls } from './camp.js';

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

function activateTab(tabId) {
  if (tabId === 'journey' || tabId === 'camp') {
    forceOneRingMode();
  }

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

  // Mode toggle is only meaningful on the Weather tab
  els.modeNav.hidden = tabId !== 'weather';

  localStorage.setItem(TAB_KEY, tabId);
}

export function initTabs() {
  const saved = localStorage.getItem(TAB_KEY);
  activateTab(saved && els.panels[saved] ? saved : 'weather');

  document.addEventListener('rpgw:switch-tab', e => activateTab(e.detail));

  els.tabBar.addEventListener('click', e => {
    const btn = e.target.closest('.tab-btn');
    if (!btn || btn.dataset.tab === state.tab) return;
    activateTab(btn.dataset.tab);
  });
}
