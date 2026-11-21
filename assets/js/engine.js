// Bot engine — material + piece-square eval, alpha-beta search, time-capped,
// with Elo-based strength: depth, time budget, and "blunder" probability.
import { Chess } from './vendor/chess.js';

const VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
// piece-square tables (0-indexed row 0 = rank 8, white perspective)
const PST = {
  p: [
    0, 0, 0, 0, 0, 0, 0, 0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
    5, 5, 10, 25, 25, 10, 5, 5,
    0, 0, 0, 20, 20, 0, 0, 0,
    5, -5, -10, 0, 0, -10, -5, 5,
    5, 10, 10, -20, -20, 10, 10, 5,
    0, 0, 0, 0, 0, 0, 0, 0,
  ],
  n: [
    -50, -40, -30, -30, -30, -30, -40, -50,
    -40, -20, 0, 0, 0, 0, -20, -40,
    -30, 0, 10, 15, 15, 10, 0, -30,
    -30, 5, 15, 20, 20, 15, 5, -30,
    -30, 0, 15, 20, 20, 15, 0, -30,
    -30, 5, 10, 15, 15, 10, 5, -30,
    -40, -20, 0, 5, 5, 0, -20, -40,
    -50, -40, -30, -30, -30, -30, -40, -50,
  ],
  b: [
    -20, -40, -40, -40, -40, -40, -30, -20,
    -40, -10, 0, 0, 0, 0, -10, -40,
    -40, 0, 10, 15, 15, 10, 0, -40,
    -40, 5, 15, 20, 20, 15, 5, -40,
    -40, 0, 15, 20, 20, 15, 0, -40,
    -40, 10, 10, 10, 10, 10, 10, -40,
    -40, 0, 5, 10, 10, 5, 0, -40,
    -20, -30, -30, -30, -30, -30, -30, -20,
  ],
  r: [
    0, 0, 0, 0, 0, 0, 0, 0,
    5, 10, 10, 10, 10, 10, 10, 5,
    5, 0, 0, 0, 0, 0, 0, 5,
    5, 0, 0, 0, 0, 0, 0, 5,
    5, 0, 0, 0, 0, 0, 0, 5,
    5, 0, 0, 0, 0, 0, 0, 5,
    5, 0, 0, 0, 0, 0, 0, 5,
    0, 0, 0, 5, 5, 0, 0, 0,
  ],
  q: [
    -20, -30, -30, -40, -40, -30, -30, -20,
    -30, -10, 0, -10, -10, 0, -10, -30,
    -30, 0, 10, 0, 0, 0, 0, -30,
    -30, 0, 10, 5, 5, 5, 0, -30,
    -30, 0, 5, 5, 5, 5, 0, -30,
    -30, 0, 5, 5, 5, 5, 0, -30,
    -30, 0, 5, 5, 5, 0, 0, -30,
    -20, -30, -30, -40, -40, -30, -30, -20,
  ],
  k: [
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -20, -30, -30, -40, -40, -30, -30, -20,
    -10, -20, -20, -20, -20, -20, -20, -10,
    20, 20, 0, 0, 0, 0, 20, 20,
    20, 30, 10, 0, 0, 10, 30, 20,
  ],
};

const EMPTY = null;

function evalBoard(chess) {
  let score = 0;
  const board = chess.board(); // rows rank8 -> rank1
  let center = 0;
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const sq = board[r][f];
      if (!sq) continue;
      if (sq.type === 'p' || sq.type === 'n' || sq.type === 'b' || sq.type === 'r' || sq.type === 'q') {
        // center bonus: e4/d4/e5/d5 (rows 3-4, cols 3-4)
        if ((r === 3 || r === 4) && (f === 3 || f === 4)) center += sq.color === 'w' ? 15 : -15;
      }
      let table;
      switch (sq.type) {
        case 'p': table = PST.p; break;
        case 'n': table = PST.n; break;
        case 'b': table = PST.b; break;
        case 'r': table = PST.r; break;
        case 'q': table = PST.q; break;
        case 'k': table = PST.k; break;
        default: continue;
      }
      const idx = sq.color === 'w' ? r * 8 + f : (7 - r) * 8 + f;
      let v = VAL[sq.type] + (table ? table[idx] : 0);
      if (sq.color === 'b') v = -v;
      score += v;
    }
  }
  // side-to-move bonus
  if (chess.turn() === 'w') score += 10; else score -= 10;
  return score;
}

function sideBonus(chess) {
  return chess.turn() === 'w' ? 6 : -6;
}

function centerBonus(chess) {
  let center = 0;
  const board = chess.board();
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const sq = board[r][f];
      if (!sq) continue;
      if ((r === 3 || r === 4) && (f === 3 || f === 4)) {
        center += sq.color === 'w' ? 18 : -18;
      }
    }
  }
  return center;
}

function orderMoves(moves) {
  // captures first (good ordering showes up fast)
  return moves.sort((a, b) => {
    const aScore = a.captured ? VAL[a.captured] || 0 : 0;
    const bScore = b.captured ? VAL[b.captured] || 0 : 0;
    const aProm = a.promotion ? 50 : 0;
    const bProm = b.promotion ? 50 : 0;
    return (bScore + bProm) - (aScore + aProm);
  });
}

function search(chess, depth, alpha, beta, timeStart, timeBudget) {
  const elapsed = Date.now() - timeStart;
  if (elapsed > timeBudget) return { score: evalBoard(chess), move: null };

  const stand = evalBoard(chess);

  if (depth === 0) {
    if (chess.isCheckmate()) return { score: -99999, move: null };
    if (chess.isStalemate()) return { score: 0, move: null };
    const legal = chess.moves({ verbose: true });
    const mobility = legal.length * 3;
    const c = centerBonus(chess);
    return { score: stand + mobility + c + sideBonus(chess), move: null };
  }
  // middle depths: still add center bonus (mobility is expensive midway)
  const c = centerBonus(chess);
  if (depth === 1) {
    return { score: stand + c + sideBonus(chess), move: null };
  }
  if (chess.isCheckmate()) return { score: -99999, move: null };
  if (chess.isStalemate()) return { score: 0, move: null };

  const isWhite = chess.turn() === 'w';
  const moves = orderMoves(chess.moves({ verbose: true }));
  if (moves.length === 0) {
    if (chess.isCheckmate()) return { score: -99999, move: null };
    return { score: 0, move: null }; // stalemate / drawn
  }

  let best = { score: isWhite ? -Infinity : Infinity, move: null };
  const cRoot = centerBonus(chess);
  let localAlpha = alpha;
  let localBeta = beta;

  for (const m of moves) {
    chess.move({ from: m.from, to: m.to, promotion: m.promotion || 'q' });
    const { score } = search(chess, depth - 1, localAlpha, localBeta, timeStart, timeBudget);
    if (depth === 1) {}
    chess.undo();

    if (isWhite) {
      if (score > best.score) best = { score, move: m };
      if (score > localAlpha) localAlpha = score;
      if (localAlpha >= localBeta) break; // beta cut
    } else {
      if (score < best.score) best = { score, move: m };
      if (score < localBeta) localBeta = score;
      if (localAlpha >= localBeta) break; // alpha cut
    }
  }

  if (best.move === null) {
    // time exhausted / best not found — return eval
    return { score: stand, move: null };
  }
  return best;
}

// Find the best move for the side to move, time-capped.
// sense: pass sense='w'/'b' to always return WHITE-oriented eval points (not needed)
export function findBestMove(chess, { depth = 4, timeBudgetMs = 1500, randomize = 0, blunder = 0 } = {}) {
  const start = Date.now();
  // iterative deepening wrapper with time cap
  let best = null;
  for (let d = 1; d <= depth; d++) {
    const res = search(chess, d, -Infinity, Infinity, start, timeBudgetMs);
    if (res.move) best = res;
    if (Date.now() - start > timeBudgetMs) break;
  }
  if (!best || !best.move) {
    // fallback: list legal moves, pick random
    const moves = chess.moves({ verbose: true });
    if (moves.length === 0) return null;
    const m = moves[Math.floor(Math.random() * moves.length)];
    return { from: m.from, to: m.to, promotion: m.promotion || 'q', san: m.san, score: 0, blunder: true };
  }

  // randomize: prefer among top moves near the best (not necessarily exact best)
  // apply hidden noise via depth-1? keep it simple: apply blunder (misclick)
  if (blunder > 0 && Math.random() < blunder) {
    const moves = chess.moves({ verbose: true });
    const m = moves[Math.floor(Math.random() * moves.length)];
    return { from: m.from, to: m.to, promotion: m.promotion || 'q', san: m.san, score: 0, blunder: true };
  }
  return { from: best.move.from, to: best.move.to, promotion: best.move.promotion || 'q', san: best.move.san, score: best.score, blunder: false };
}

// Elo-based bot profiles (like chess.com's levels).
// 1200/1500/1800/2100/2400 with depth + time budget + blunder probability.
export const BOT_LEVELS = [
  { elo: 1200, label: 'Nowicjusz', depth: 2, timeBudgetMs: 600, blunder: 0.22, randomize: 0.35 },
  { elo: 1500, label: 'Ochotnik', depth: 3, timeBudgetMs: 800, blunder: 0.12, randomize: 0.18 },
  { elo: 1800, label: 'Doświadczony', depth: 4, timeBudgetMs: 1200, blunder: 0.05, randomize: 0.07 },
  { elo: 2100, label: 'Ekspert', depth: 5, timeBudgetMs: 1700, blunder: 0.02, randomize: 0.00 },
  { elo: 2400, label: 'Mistrz', depth: 6, timeBudgetMs: 2400, blunder: 0.01, randomize: 0.00 },
];

export function pickLevel(elo) {
  // nearest tier
  return [...BOT_LEVELS].sort((a, b) => Math.abs(a.elo - elo) - Math.abs(b.elo - elo))[0];
}
