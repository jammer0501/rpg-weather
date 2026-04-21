/**
 * Pure weather-rolling logic. No DOM, no state, no side effects.
 *
 * @param {Array<{id: string, label: string, weight: number, category: string}>} entries
 * @param {string|null} previousCategory - yesterday's category, or null for an unbiased roll
 * @param {Object<string, Object<string, number>>} transitions - transition matrix
 * @returns {{id: string, label: string, weight: number, category: string}}
 */
export function roll(entries, previousCategory, transitions) {
  const weights = entries.map(entry => {
    const base = entry.weight;
    if (!previousCategory) return base;
    const row = transitions[previousCategory];
    const multiplier = row?.[entry.category] ?? 1.0;
    return base * multiplier;
  });

  const total = weights.reduce((sum, w) => sum + w, 0);
  let cursor = Math.random() * total;

  for (let i = 0; i < entries.length; i++) {
    cursor -= weights[i];
    if (cursor <= 0) return entries[i];
  }

  return entries[entries.length - 1];
}

