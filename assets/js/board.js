// Board renderer (pure DOM, no external assets). Renders from chess.js state.
const GLYPH_WHITE = { p: '♙', n: '♘', b: '♗', r: '♖', q: '♕', k: '♔' };
const GLYPH_BLACK = { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚' };
const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

export class Board {
  constructor(container, { orientation = 'w', onSquareClick = null, showCoords = true, interactive = true } = {}) {
    this.container = container;
    this.orientation = orientation;
    this.onSquareClick = onSquareClick;
    this.showCoords = showCoords;
    this.interactive = interactive;
    this.el = document.createElement('div');
    this.el.className = 'board';
    this.el.setAttribute('role', 'grid');
    this.el.setAttribute('aria-label', 'Szachowa plansza');
    container.appendChild(this.el);
    this.squares = new Map();
    this._build();
  }

  _filesAndRanks() {
    if (this.orientation === 'w') {
      return { files: [...FILES], ranks: [8, 7, 6, 5, 4, 3, 2, 1] };
    }
    return { files: [...FILES].reverse(), ranks: [1, 2, 3, 4, 5, 6, 7, 8] };
  }

  _build() {
    this.el.innerHTML = '';
    this.squares.clear();
    const { files, ranks } = this._filesAndRanks();
    const grid = document.createElement('div');
    grid.className = 'board-grid';
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const file = files[col];
        const rank = ranks[row];
        const square = `${file}${rank}`;
        const cell = document.createElement('div');
        cell.dataset.square = square;
        cell.className = 'square';
        const fileIndex = FILES.indexOf(file);
        const isDark = (fileIndex + rank) % 2 === 1;
        cell.classList.add(isDark ? 'dark' : 'light');
        if (this.showCoords) {
          if (col === 0) { // left column -> rank label
            const rl = document.createElement('span'); rl.className = 'coord-label rank'; rl.textContent = rank; cell.appendChild(rl);
          }
          if (row === 7) { // bottom row -> file label
            const fl = document.createElement('span'); fl.className = 'coord-label file'; fl.textContent = file; cell.appendChild(fl);
          }
        }
        cell.addEventListener('click', () => this._handleClick(square));
        const piece = document.createElement('span');
        piece.className = 'piece';
        piece.dataset.piece = square;
        cell.appendChild(piece);
        const dot = document.createElement('span');
        dot.className = 'dot';
        cell.appendChild(dot);
        grid.appendChild(cell);
        this.squares.set(square, { cell, piece, dot });
      }
    }
    this.el.appendChild(grid);
  }

  _handleClick(square) {
    if (this.interactive && this.onSquareClick) this.onSquareClick(square);
  }

  render(chess, { lastMove = null, selected = null, legalMoves = null, checkSquare = null } = {}) {
    for (const { cell, piece, dot } of this.squares.values()) {
      cell.classList.remove('last-from', 'last-to', 'selected', 'check');
      piece.textContent = '';
      piece.className = 'piece';
      dot.classList.remove('show', 'capture');
    }
    const board = chess.board();
    for (const row of board) {
      for (const sq of row) {
        if (!sq) continue;
        const ref = this.squares.get(sq.square);
        if (!ref) continue;
        ref.piece.textContent = (sq.color === 'w' ? GLYPH_WHITE : GLYPH_BLACK)[sq.type];
        ref.piece.classList.add(sq.color === 'w' ? 'piece-w' : 'piece-b');
      }
    }
    if (lastMove) {
      const a = this.squares.get(lastMove.from); const b = this.squares.get(lastMove.to);
      if (a) a.cell.classList.add('last-from');
      if (b) b.cell.classList.add('last-to');
    }
    if (selected) {
      const s = this.squares.get(selected);
      if (s) s.cell.classList.add('selected');
    }
    if (checkSquare) {
      const s = this.squares.get(checkSquare);
      if (s) s.cell.classList.add('check');
    }
    if (legalMoves && legalMoves.length) {
      const occupied = new Set();
      for (const row of chess.board()) for (const sq of row) { if (sq) occupied.add(sq.square); }
      for (const sq of legalMoves) {
        const ref = this.squares.get(sq);
        if (!ref) continue;
        ref.dot.classList.add('show');
        if (occupied.has(sq)) ref.dot.classList.add('capture');
      }
    }
  }

  setOrientation(o) {
    if (this.orientation === o) return;
    this.orientation = o;
    this._build();
  }
}
