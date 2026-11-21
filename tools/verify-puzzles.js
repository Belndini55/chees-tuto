// Find forced mate in N (1..2) from a position (side to move = FEN).
import { Chess } from '../assets/js/vendor/chess.js';

function matingMove(c, deadline) {
  // white side: is there a move that delivers checkmate?
  for (const m of c.moves({ verbose: true })) {
    c.move({ from: m.from, to: m.to, promotion: m.promotion || 'q' });
    const mated = c.isCheckmate();
    c.undo();
    if (mated) return m.san;
    if (Date.now() > deadline) return undefined;
  }
  return undefined;
}

export function findMate(fen, maxN = 2, budgetMs = 4000) {
  const start = Date.now();
  const c = new Chess(fen);
  if (c.isCheckmate()) return { N: 1, san: [] };
  const first = c.moves({ verbose: true });
  // mate in 1?
  for (const m of first) {
    c.move({ from: m.from, to: m.to, promotion: m.promotion || 'q' });
    if (c.isCheckmate()) { c.undo(); return { N: 1, san: [m.san] }; }
    c.undo();
  }
  if (maxN < 2) return null;
  const deadline = start + budgetMs;
  // forced mate in 2: for each first move, check ALL replies -> mate in 1
  for (const m of first) {
    c.move({ from: m.from, to: m.to, promotion: m.promotion || 'q' });
    const replies = c.moves({ verbose: true });
    if (replies.length === 0) { c.undo(); continue; } // already handled above
    let allMated = true;
    for (const r of replies) {
      c.move({ from: r.from, to: r.to, promotion: r.promotion || 'q' });
      if (Date.now() > deadline) { allMated = false; break; }
      const mate = matingMove(c, start + budgetMs);
      c.undo();
      if (!mate) { allMated = false; break; }
    }
    c.undo();
    if (allMated) return { N: 2, san: [m.san] };
  }
  return null;
}

const norm = (s) => s.replace(/[#+!?]/g, '').trim();

export function verifySolution(fen, san, expectedN) {
  const c = new Chess(fen);
  const m = c.moves({ verbose: true }).find((x) => norm(x.san) === norm(san));
  if (!m) return { ok: false, reason: 'SAN not found' };
  c.move({ from: m.from, to: m.to, promotion: m.promotion || 'q' });
  if (expectedN === 1) return { ok: c.isCheckmate(), reason: c.isCheckmate() ? 'mate in 1' : 'not mate in 1' };
  const replies = c.moves({ verbose: true });
  if (replies.length === 0) return { ok: false, reason: 'no replies' };
  for (const r of replies) {
    c.move({ from: r.from, to: r.to, promotion: r.promotion || 'q' });
    const mate = matingMove(c, Date.now() + 4000);
    c.undo();
    if (!mate) return { ok: false, reason: `reply ${r.san} survives` };
  }
  return { ok: true, reason: 'mate in 2 verified' };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { candidates } = await import('./candidates.js');
  for (const cand of candidates) {
    try {
      const res = findMate(cand.fen, 2, 4000);
      console.log(JSON.stringify({ name: cand.name, fen: cand.fen, mateIn: res ? res.N : null, san: res ? res.san[0] : null, theme: cand.theme }));
    } catch (e) {
      console.log(JSON.stringify({ name: cand.name, fen: cand.fen, error: e.message }));
    }
  }
}
