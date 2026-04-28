// Regional predator, prey and shadow lookup. Rolls from a region-specific pool
// where one exists, and falls back to widely-distributed entries otherwise.

import { state } from '../state.js';

// Entries that appear in fewer regions than this threshold are considered too
// location-specific to use as a global fallback when a region has no matches.
const GENERIC_THRESHOLD = 4;

// Prefers entries tagged for the current region to give flavourful, location-
// appropriate results. Falls back to entries common across many regions rather
// than returning nothing when the region has no specific pool.
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
