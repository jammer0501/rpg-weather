// The One Ring feat die — a 12-face die with special faces for the Gandalf
// rune (best possible result) and the Eye of Sauron (worst possible result).

const FACES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 'gandalf', 'eye'];

// Assigns each face an index so two rolls can be compared by rank.
// Eye is index 0 (worst), Gandalf is index 11 (best).
const FACE_ORDER = Object.fromEntries(FACES.map((f, i) => [f, i]));

function rollOnce() {
  return FACES[Math.floor(Math.random() * FACES.length)];
}

// Rolls the feat die. When favoured, rolls twice and keeps the better result
// by FACE_ORDER rank — this is the core mechanic for a Favoured roll in TOR.
// Always returns all raw rolls so the caller can display what was actually thrown.
export function featDie(favoured = false) {
  const r1 = rollOnce();
  if (!favoured) return { value: r1, raw: [r1] };

  const r2    = rollOnce();
  const value = FACE_ORDER[r1] >= FACE_ORDER[r2] ? r1 : r2;
  return { value, raw: [r1, r2] };
}

// Converts an internal face value to its display label.
export function dieFaceLabel(face) {
  if (face === 'gandalf') return 'Gandalf rune';
  if (face === 'eye')     return 'Eye of Sauron';
  return String(face);
}
