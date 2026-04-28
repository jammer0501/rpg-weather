// Pure event-picking logic for journey rolls — no DOM, no state access.
// Isolated here so it can be reasoned about and tested independently of the UI.

// Maps weather category to the fatigue costs for a lookout-weather event.
// Harsher weather imposes more fatigue on both success and failure.
export const WEATHER_FATIGUE = {
  clear:    { success: 0, failure: 1 },
  overcast: { success: 0, failure: 1 },
  mist:     { success: 1, failure: 2 },
  rain:     { success: 1, failure: 2 },
  storm:    { success: 2, failure: 3 },
};

// Uniform random selection from an array.
export function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Picks a random event from a file, handling two different JSON schemas:
//   - Flat:  { events: [...] }            — one pool, no sub-type
//   - Typed: { types: { key: { label, events: [...] } } } — multiple named sub-pools
// Returns { event, typeName } so the caller can display the sub-type label
// when one exists, or null when the file uses the flat schema.
export function pickEventFromFile(file) {
  if (file.events) {
    return { event: pickRandom(file.events), typeName: null };
  }
  const typeKey = pickRandom(Object.keys(file.types));
  const type    = file.types[typeKey];
  return { event: pickRandom(type.events), typeName: type.label };
}
