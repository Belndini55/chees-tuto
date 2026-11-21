// Verify the puzzles in assets/js/puzzles.js — sound positions + forced mate.
import { Chess } from '../assets/js/vendor/chess.js';
import { isSoundPosition } from './soundness.js';
import { verifySolution } from './verify-puzzles.js';
import { PUZZLES } from '../assets/js/puzzles.js';

let ok = 0;
const bad = [];
for (const p of PUZZLES) {
  const sound = isSoundPosition(p.fen);
  const v = verifySolution(p.fen, p.solution, p.mateIn);
  if (sound && v.ok) ok++;
  else bad.push({ id: p.id, sound, v });
}
console.log(`VERIFIED ${ok} of ${PUZZLES.length}`);
for (const b of bad) console.log(JSON.stringify(b));
process.exit(ok === PUZZLES.length ? 0 : 1);
