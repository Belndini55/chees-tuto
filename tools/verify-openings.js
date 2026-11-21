import { Chess } from '../assets/js/vendor/chess.js';
import { OPENINGS } from '../assets/js/openings.js';
let fail = 0;
for (const o of OPENINGS) {
  const c = new Chess();
  let ok = true;
  for (const san of o.moves) {
    try { c.move(san); } catch (e) { console.log(`❌ ${o.id}: invalid move "${san}"`); ok = false; break; }
  }
  if (ok) console.log(`✓ ${o.id} (${o.moves.length} moves) → ${c.fen().split(' ').slice(0, 4).join(' ')}`);
  if (!ok) fail++;
}
console.log(fail === 0 ? `\nAll ${OPENINGS.length} opening lines verified` : `\n${fail} FAILED`);
process.exit(fail === 0 ? 0 : 1);
