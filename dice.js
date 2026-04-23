const FACES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 'gandalf', 'eye'];

// eye is worst, gandalf is best — used by the favoured mechanic.
const FACE_ORDER = Object.fromEntries(FACES.map((f, i) => [f, i]));

function rollOnce() {
  return FACES[Math.floor(Math.random() * FACES.length)];
}

// Rolls the TOR feat die. If favoured, rolls twice and keeps the better result.
// Returns { value, raw } where raw is the array of all actual rolls.
export function featDie(favoured = false) {
  const r1 = rollOnce();
  if (!favoured) return { value: r1, raw: [r1] };

  const r2    = rollOnce();
  const value = FACE_ORDER[r1] >= FACE_ORDER[r2] ? r1 : r2;
  return { value, raw: [r1, r2] };
}

export function dieFaceLabel(face) {
  if (face === 'gandalf') return 'Gandalf rune';
  if (face === 'eye')     return 'Eye of Sauron';
  return String(face);
}
