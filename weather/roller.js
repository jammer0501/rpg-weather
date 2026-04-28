// Pure weather-rolling logic — weighted random selection with Markov chain
// continuity. No DOM, no state, no side effects.

// Selects one entry from the pool using base weights biased by a Markov
// transition matrix. When a previous category is provided, each entry's
// weight is multiplied by the transition factor for moving from that category
// to the entry's own category — making consecutive weather feel realistic
// (storms don't typically follow clear skies without intermediate steps).
// Falls back to unbiased base weights when there is no previous category.
//
// @param {Array<{id, label, weight, category}>} entries
// @param {string|null} previousCategory
// @param {Object<string, Object<string, number>>} transitions
// @returns {{id, label, weight, category}}
export function roll(entries, previousCategory, transitions) {
  const weights = entries.map(entry => {
    const base = entry.weight;
    if (!previousCategory) return base;
    const row = transitions[previousCategory];
    const multiplier = row?.[entry.category] ?? 1.0;
    return base * multiplier;
  });

  // Standard weighted random selection: pick a random point in [0, total]
  // and walk the entries until we've consumed enough weight to land on one.
  const total = weights.reduce((sum, w) => sum + w, 0);
  let cursor = Math.random() * total;

  for (let i = 0; i < entries.length; i++) {
    cursor -= weights[i];
    if (cursor <= 0) return entries[i];
  }

  // Floating-point rounding can leave cursor fractionally above zero after
  // the loop; return the last entry as the safe fallback.
  return entries[entries.length - 1];
}
