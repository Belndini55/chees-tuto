import { Chess } from '../assets/js/vendor/chess.js';
export function isSoundPosition(fen) {
  let c;
  try { c = new Chess(fen); } catch (e) { return false; }
  if (c.turn() !== 'w') return false;           // player always white
  // side not to move (black) must not be in check
  const board = c.board();
  for (const row of board) for (const sq of row) {
    if (sq && sq.type === 'k' && sq.color === 'b') {
      if (c.isAttacked(sq.square, 'w')) return false;
      return true;
    }
  }
  return false;
}
