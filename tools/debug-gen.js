import { Chess } from '../assets/js/vendor/chess.js';
import { findMate } from './verify-puzzles.js';
const c = new Chess('6k1/5ppp/8/8/8/8/8/4Q1K1 w - - 0 1');
for (let p = 0; p < 3; p++) {
  const moves = c.moves({ verbose: true });
  const m = moves[Math.floor(Math.random() * moves.length)];
  c.move({ from: m.from, to: m.to, promotion: m.promotion || 'q' });
}
console.log('fen', c.fen());
const fenRaw = c.fen();
const fen = fenRaw.split(' ').slice(0, 4).join(' ') + ' 0 1';
console.log('norm', fen);
try {
  const res = findMate(fen, 2, 4000);
  console.log('result', JSON.stringify(res));
} catch (e) { console.log('err', e.message); }
