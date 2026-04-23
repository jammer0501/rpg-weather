import { state } from './state.js';

// Entries appearing in fewer than this many regions are considered too
// specialised to use as a generic fallback.
const GENERIC_THRESHOLD = 4;

function rollFromPool(pool, regionId) {
  const regional = pool.filter(p => p.regions.includes(regionId));
  const entries  = regional.length > 0
    ? regional
    : pool.filter(p => p.regions.length >= GENERIC_THRESHOLD);
  return entries[Math.floor(Math.random() * entries.length)];
}

export function rollPredator(regionId = state.regionId) {
  return rollFromPool(state.predators, regionId);
}

export function rollPrey(regionId = state.regionId) {
  return rollFromPool(state.prey, regionId);
}

export function rollShadow(regionId = state.regionId) {
  return rollFromPool(state.shadow, regionId);
}
