// Candidate puzzle positions. Only positions with a verified forced mate will be kept.
export const candidates = [
  // ----- verified mate in 1 -------
  { fen: '6k1/5ppp/8/8/8/8/8/4Q1K1 w - - 0 1', name: 'back-rank-queen', theme: 'back-rank' },
  { fen: '7k/8/6K1/8/8/8/8/R7 w - - 0 1', name: 'rook-corner', theme: 'back-rank' },
  { fen: 'k7/8/1K6/8/8/8/8/4Q3 w - - 0 1', name: 'corner-queen', theme: 'corner' },
  { fen: '6k1/5ppp/8/8/8/8/2Q5/6K1 w - - 0 1', name: 'queen-diagonal', theme: 'queen' },
  { fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', name: 'back-rank-rook', theme: 'back-rank' },
  // ----- mate in 2 candidates -------
  { fen: '6k1/8/2Q5/8/8/8/8/2K5 w - - 0 1', name: 'queen-g8-late', theme: 'queen' },
  { fen: '1k6/8/8/4K3/8/8/8/2Q5 w - - 0 1', name: 'queen-b8-late', theme: 'corner' },
  { fen: '8/8/7k/8/1K6/8/8/2Q5 w - - 0 1', name: 'queen-h6-late', theme: 'corner' },
  { fen: 'k7/8/2K5/8/8/8/8/1Q2K3 w - - 0 1', name: 'queen-corner-b-late', theme: 'corner' },
  { fen: '8/8/6k1/8/8/6K1/8/4Q3 w - - 0 1', name: 'queen-g2-late', theme: 'queen' },
  { fen: '7k/8/8/8/8/4K3/8/2Q5 w - - 0 1', name: 'queen-corner-e2-late', theme: 'corner' },
  { fen: '1k6/8/8/8/3K4/8/8/2Q5 w - - 0 1', name: 'queen-corner-d4-late', theme: 'corner' },
  { fen: '4k3/8/8/8/1K6/8/8/5Q2 w - - 0 1', name: 'queen-e-middle-late', theme: 'center' },
  { fen: '8/8/8/8/8/4K1k1/8/2Q5 w - - 0 1', name: 'queen-g3-corner-late', theme: 'center' },
  { fen: '3k4/8/8/8/8/6K1/8/5Q2 w - - 0 1', name: 'queen-d8-late', theme: 'center' },
  { fen: '2k5/8/8/8/8/6K1/8/2Q5 w - - 0 1', name: 'queen-c8-late', theme: 'center' },
];
