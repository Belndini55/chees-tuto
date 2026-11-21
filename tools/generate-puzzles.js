// Random-walk search for sound positions with a forced mate in 1 or 2.
import { Chess } from '../assets/js/vendor/chess.js';
import { findMate } from './verify-puzzles.js';
import { isSoundPosition } from './soundness.js';

const STARTS = [
  '6k1/5ppp/8/8/8/8/8/4Q1K1 w - - 0 1',
  'k7/8/1K6/8/8/8/8/4Q3 w - - 0 1',
  '7k/8/6K1/8/8/8/8/R7 w - - 0 1',
  '6k1/5ppp/8/8/8/8/2Q5/6K1 w - - 0 1',
  '8/8/6k1/8/8/6K1/8/4Q3 w - - 0 1',
  '1k6/8/1K6/Q7/8/8/8/8 w - - 0 1',
  'k7/8/8/2K5/8/8/8/2R5 w - - 0 1',
  '7k/5K2/8/R7/8/8/8/8 w - - 0 1',
];
let seed = Number(process.argv[2] || 0x1234567);
const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const sound = (c) => {
  // side not to move must not be in check (position otherwise unsound)
  const turn = c.turn();
  if (turn === 'w') {
    // set black to moves? use moves of black via moves({...}) not supported directly.
    // instead: white in check is fine; check black using chess state? do quick check on a clone
    // by checking if chess would have white moves vs black turns — simplest: use FEN & chess.js on flipped position
    return true; // handled soundness differently below
  }
  return true;
};

const results = [];
const seen = new Set();
const N_ITER = 50;
for (let i = 0; i < N_ITER; i++) {
  const startFen = STARTS[i % STARTS.length];
  const c = new Chess(startFen);
  const depth = 1 + Math.floor(rand() * 4);
  for (let plies = 0; plies < depth; plies++) {
    const moves = c.moves({ verbose: true });
    if (moves.length === 0) break;
    let pool = moves;
    // avoid immediate checkmate during random walk
    const nonMating = moves.filter(() => true); // keep all
    const m = pool[Math.floor(rand() * pool.length)];
    c.move({ from: m.from, to: m.to, promotion: m.promotion || 'q' });
  }
  if (c.isCheckmate()) continue;
  if (c.turn() !== 'w') continue; // player always plays white
  const fenRaw = c.fen();
  const fen = fenRaw.split(' ').slice(0, 4).join(' ') + ' 0 1';
  if (!isSoundPosition(fen)) continue;
  if (seen.has(fen)) continue;
  seen.add(fen);
  // soundness: side not to move must not be in check
  {
    const res = findMate(fen, 2, 4000);
    if (res && res.N <= 2) {
      results.push({ fen, mateIn: res.N, san: res.san[0] || null });
      console.log(JSON.stringify({ fen, mateIn: res.N, san: res.san[0] }));
    }
  }
}
console.log('\nFOUND', results.length, 'positions with forced mate in 1-2');
