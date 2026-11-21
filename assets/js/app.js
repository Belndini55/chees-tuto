// SzachLab — main application logic.
import { Chess } from './vendor/chess.js';
import { Board } from './board.js';
import { OPENINGS } from './openings.js';
import { PUZZLES } from './puzzles.js';
import { BOT_LEVELS, pickLevel, findBestMove } from './engine.js';

// ---------------------------------------------------------------- state
const STORAGE_KEY = 'szachlab-v1';
const INITIAL = {
  elo: 1500,
  solved: [], revealed: [], mistakes: 0,
  streak: 0, bestStreak: 0,
  rushBest: 0, rushBestStreak: 0,
};
function loadState() {
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? { ...INITIAL, ...JSON.parse(raw) } : { ...INITIAL }; }
  catch { return { ...INITIAL }; }
}
function saveState(s) { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }
const state = loadState();

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

// ---------------------------------------------------------------- helpers
function getMoves(c) { return c.moves({ verbose: true }); }
function findMove(c, from, to) { return getMoves(c).find((m) => m.from === from && m.to === to) || null; }
function pieceAt(c, square) {
  for (const row of c.board()) for (const sq of row) { if (sq && sq.square === square) return sq; }
  return null;
}
function findKingSquare(c, color) {
  for (const row of c.board()) for (const sq of row) {
    if (sq && sq.type === 'k' && sq.color === color) return sq.square;
  }
  return null;
}
function isForcedMateIn2From(c, move) {
  // c: Chess instance (fresh puzzle position). move: {from,to,promotion}
  const copy = new Chess(c.fen());
  try { copy.move({ from: move.from, to: move.to, promotion: move.promotion || 'q' }); } catch { return false; }
  const replies = getMoves(copy);
  if (replies.length === 0) return false;
  for (const r of replies) {
    try { copy.move({ from: r.from, to: r.to, promotion: r.promotion || 'q' }); } catch { return false; }
    const mate = hasMateIn1(copy);
    copy.undo();
    if (!mate) return false;
  }
  copy.undo();
  return true;
}
function hasMateIn1(c) {
  for (const m of getMoves(c)) {
    const copy = new Chess(c.fen());
    try { copy.move({ from: m.from, to: m.to, promotion: m.promotion || 'q' }); } catch { continue; }
    if (copy.isCheckmate()) return true;
  }
  return false;
}

// ---------------------------------------------------------------- boot
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initHeroStats();
  initOpenings();
  initMiddlegame();
  initPuzzles();
  initRush();
  initBot();
  updateScoreboard();
});

// ---------------------------------------------------------------- nav
function initNav() {
  const toggle = $('#nav-toggle');
  const menu = $('#nav-menu');
  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!expanded));
    menu.classList.toggle('nav-mobile-open', !expanded);
  });
  $$('.site-nav a, .nav-mobile a').forEach((a) => a.addEventListener('click', () => {
    menu.classList.remove('nav-mobile-open');
    toggle.setAttribute('aria-expanded', 'false');
  }));
  const ids = ['openings', 'middlegame', 'puzzles', 'rush', 'bot'];
  const spy = () => {
    let active = null;
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el && el.getBoundingClientRect().top <= 160) active = id;
    }
    $$('.site-nav a').forEach((a) => a.classList.toggle('nav-active', a.getAttribute('href') === `#${active}`));
  };
  window.addEventListener('scroll', spy, { passive: true });
  spy();
}

function initHeroStats() {
  $('#stat-openings').textContent = String(OPENINGS.length);
  $('#stat-puzzles').textContent = String(PUZZLES.length);
}

// ---------------------------------------------------------------- openings
let currentOpening = null;
let openingPly = 0;
let openingChess = null;
let openingMoves = [];

function initOpenings() {
  const grid = $('#openings-grid');
  const chips = $$('.filter-chips button');
  const render = (filter) => {
    const list = OPENINGS.filter((o) => filter === 'all' || (filter === 'surprise' ? o.surprise : !o.surprise));
    grid.innerHTML = '';
    list.forEach((o) => grid.appendChild(buildOpeningCard(o)));
  };
  chips.forEach((c) => c.addEventListener('click', () => {
    chips.forEach((x) => x.classList.remove('chip-active'));
    c.classList.add('chip-active');
    render(c.dataset.filter);
  }));
  render('all');

  $('#opening-prev').addEventListener('click', () => moveOpening(-1));
  $('#opening-next').addEventListener('click', () => moveOpening(1));
  $$('[data-close-modal]').forEach((el) => el.addEventListener('click', closeOpeningModal));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#opening-modal').hidden) closeOpeningModal(); });
}

function buildOpeningCard(o) {
  const card = document.createElement('article');
  card.className = 'opening-card';
  const badges = [`<span class="badge">${o.eco}</span>`];
  badges.push(o.surprise ? '<span class="badge badge-surprise">Zaskakujący</span>' : '<span class="badge badge-classic">Klasyczny</span>');
  card.innerHTML = `
    <div class="opening-card-top">
      <h3 class="opening-name">${o.name}</h3>
      <div class="opening-badges">${badges.join('')}</div>
    </div>
    <p class="opening-tagline">${o.tagline}</p>
    <p class="opening-moves">${o.moves.slice(0, 4).join(' ')}${o.moves.length > 4 ? ' …' : ''}</p>
    <span class="opening-cta">Zobacz otwieranie →</span>
  `;
  card.addEventListener('click', () => openOpeningModal(o));
  return card;
}

function openOpeningModal(o) {
  currentOpening = o;
  openingChess = new Chess();
  openingPly = 0;
  openingMoves = [];
  $('#opening-eco').textContent = o.eco;
  $('#opening-surprise').hidden = !o.surprise;
  $('#opening-classic').hidden = o.surprise;
  $('#opening-modal-title').textContent = o.name;
  $('#opening-tagline').textContent = o.tagline;
  const whyEl = $('#opening-why');
  whyEl.hidden = !o.surprise;
  whyEl.textContent = o.why;
  $('#opening-ideas').innerHTML = o.ideas.map((i) => `<li>${i}</li>`).join('');
  $('#opening-middlegame').textContent = o.middlegame;
  $('#opening-usage').textContent = o.usage;
  buildOpeningMovelist();
  renderOpeningPosition();
  const modal = $('#opening-modal');
  modal.hidden = false;
  document.body.classList.add('modal-open');
}

function closeOpeningModal() {
  $('#opening-modal').hidden = true;
  document.body.classList.remove('modal-open');
}

function buildOpeningMovelist() {
  const list = $('#opening-movelist');
  list.innerHTML = '';
  currentOpening.moves.forEach((san, i) => {
    const li = document.createElement('li');
    const turn = i % 2 === 0 ? `${Math.floor(i / 2) + 1}.` : `${Math.floor(i / 2) + 1}...`;
    li.textContent = `${turn} ${san}`;
    li.dataset.i = String(i);
    li.addEventListener('click', () => jumpOpeningTo(i + 1));
    list.appendChild(li);
  });
}

function jumpOpeningTo(ply) {
  openingChess = new Chess();
  openingMoves = [];
  for (let i = 0; i < ply; i++) {
    try {
      const m = openingChess.move(currentOpening.moves[i]);
      if (m) openingMoves.push({ from: m.from, to: m.to });
    } catch (e) { /* ignore */ }
  }
  openingPly = ply;
  renderOpeningPosition();
}

function moveOpening(delta) {
  const target = Math.max(0, Math.min(currentOpening.moves.length, openingPly + delta));
  if (target === openingPly) return;
  jumpOpeningTo(target);
}

function renderOpeningPosition() {
  const container = $('#opening-board');
  container.innerHTML = '';
  const board = new Board(container, { orientation: 'w', interactive: false, showCoords: true });
  const lastMove = openingMoves.length ? openingMoves[openingMoves.length - 1] : null;
  board.render(openingChess, { lastMove });
  $('#opening-ply').textContent = `Ruch ${openingPly} / ${currentOpening.moves.length}`;
  $('#opening-prev').disabled = openingPly <= 0;
  $('#opening-next').disabled = openingPly >= currentOpening.moves.length;
  $$('#opening-movelist li').forEach((li, i) => li.classList.toggle('movelist-active', i === openingPly - 1));
}

// ---------------------------------------------------------------- middlegame
const MIDGAME_IDEAS = [
  { icon: '♟', title: 'Kontrola środka', body: 'Zajmuj centrum — pola e4/e5 i d4/d5 dają Ci przewagę w otwarciu i w grę.' },
  { icon: '♞', title: 'Rozwój', body: 'Rozwijaj figury przed atakiem — każdy ruch nieużywany jest stratą tempa.' },
  { icon: '♛', title: 'Osłona króla', body: 'Zamkuć króla przed ciężką grą. Bezpieczne król = większa przewaga.' },
  { icon: '⏱', title: 'Tempo ruchu', body: 'Każdy ruch powinien być akcją — zamierzanie i reagowanie lepsze niż czekanie.' },
  { icon: '✦', title: 'Aktywność', body: 'Aktywne figury bije statyczne — staw je w miejscach, gdzie mogą atakować.' },
  { icon: '◐', title: 'Przełamania pionków', body: 'Otwarte linie dają przewagę — użyj pionków, by wzmocnić pozycję i otworzyć centrum.' },
];
function initMiddlegame() {
  const grid = $('#midgame-grid');
  grid.innerHTML = '';
  MIDGAME_IDEAS.forEach((it) => {
    const card = document.createElement('article');
    card.className = 'midgame-card';
    card.innerHTML = `<div class="midgame-icon">${it.icon}</div><h3>${it.title}</h3><p>${it.body}</p>`;
    grid.appendChild(card);
  });
}

// ---------------------------------------------------------------- puzzles
let puzzle = { id: null, chess: null, phase: 'playing', firstMove: null, hintShown: false, mistakes: 0 };
let puzzleFilter = 'all';
let selectedSquare = null;
let lastPuzzleMove = null;
let puzzleBoard = null;
let puzzleBoardContainer = null;

function initPuzzles() {
  puzzleBoardContainer = $('#puzzle-board');
  updateScoreboard();
  renderPuzzleList();
  loadPuzzle(PUZZLES[0]);
  $('#btn-hint').addEventListener('click', onHint);
  $('#btn-solution').addEventListener('click', onSolution);
  $('#btn-reroll').addEventListener('click', onReroll);
  $('#btn-next-puzzle').addEventListener('click', nextPuzzle);
  $$('.filter-chips button[data-puzzle-filter]').forEach((c) => c.addEventListener('click', () => {
    $$('.filter-chips button[data-puzzle-filter]').forEach((x) => x.classList.remove('chip-active'));
    c.classList.add('chip-active');
    puzzleFilter = c.dataset.puzzleFilter;
    renderPuzzleList();
  }));
}

function filteredPuzzles() {
  if (puzzleFilter === 'all') return PUZZLES;
  return PUZZLES.filter((p) => String(p.tier) === puzzleFilter);
}

function loadPuzzle(p) {
  puzzle = { id: p.id, chess: new Chess(p.fen), phase: 'playing', firstMove: null, hintShown: false, mistakes: 0 };
  selectedSquare = null;
  lastPuzzleMove = null;
  puzzleBoardContainer.innerHTML = '';
  puzzleBoard = new Board(puzzleBoardContainer, { orientation: 'w', interactive: true, onSquareClick: handlePuzzleClick });
  const badge = $('#puzzle-tier-badge');
  badge.textContent = p.tier === 1 ? 'Łatwy' : p.tier === 2 ? 'Średni' : 'Trudny';
  badge.className = 'puzzle-tier-badge tier-' + p.tier;
  $('#puzzle-title').textContent = p.name;
  $('#puzzle-theme').textContent = `${p.theme} • mat w ${p.mateIn}`;
  setStatus(`Znajdź rozwiązanie`, 'info');
  $('#puzzle-explanation').hidden = true;
  $('#puzzle-explanation').innerHTML = '';
  renderPuzzleBoard();
  renderPuzzleList();
}

function renderPuzzleBoard() {
  const c = puzzle.chess;
  let sel = null;
  let legalMoves = null;
  if ((puzzle.phase === 'playing') && selectedSquare) {
    const piece = pieceAt(c, selectedSquare);
    if (piece && piece.color === 'w' && c.turn() === 'w') {
      sel = selectedSquare;
      legalMoves = getMoves(c).filter((m) => m.from === selectedSquare).map((m) => m.to);
    }
  }
  puzzleBoard.render(c, {
    lastMove: lastPuzzleMove,
    selected: sel,
    legalMoves,
    checkSquare: c.isCheck() ? findKingSquare(c, 'w') : null,
  });
}

function handlePuzzleClick(square) {
  if (puzzle.phase !== 'playing' && puzzle.phase !== 'await-black') return;
  const c = puzzle.chess;
  const piece = pieceAt(c, square);

  if (selectedSquare) {
    const target = findMove(c, selectedSquare, square);
    if (target) {
      applyPuzzleMove(target);
      selectedSquare = null;
      return;
    }
  }
  if (piece && piece.color === 'w' && c.turn() === 'w') {
    selectedSquare = square;
  } else {
    selectedSquare = null;
  }
  renderPuzzleBoard();
}

function applyPuzzleMove(move) {
  const p = PUZZLES.find((x) => x.id === puzzle.id);
  const c = puzzle.chess;
  if (p.mateIn === 1) {
    const before = c.fen();
    try { c.move({ from: move.from, to: move.to, promotion: move.promotion || 'q' }); } catch { return; }
    if (c.isCheckmate()) {
      lastPuzzleMove = { from: move.from, to: move.to };
      finishPuzzle(p, true);
      return;
    }
    // revert
    c.load(before);
    puzzleMistake(p, 'To nie jest mat — znaleźć mat w 1 ruchu.');
    renderPuzzleBoard();
    return;
  }
  // mate in 2
  try { c.move({ from: move.from, to: move.to, promotion: move.promotion || 'q' }); } catch { return; }
  const forced = isForcedMateIn2From(new Chess(p.fen), move);
  if (forced) {
    puzzle.phase = 'await-black';
    puzzle.firstMove = { from: move.from, to: move.to };
    lastPuzzleMove = { from: move.from, to: move.to };
    setStatus('✓ Pierwszy ruch poprawny — teraz znajdź mat.', 'ok');
    renderPuzzleBoard();
    setTimeout(() => botReplies(p), 700);
    return;
  }
  // wrong first move — undo
  c.load(new Chess(p.fen).fen());
  puzzleMistake(p, 'To nie doprowadza do matu — spróbuj inaczej.');
  renderPuzzleBoard();
}

function botReplies(p) {
  const c = puzzle.chess;
  const moves = getMoves(c);
  if (!moves.length || puzzle.phase !== 'await-black') return;
  const r = moves[Math.floor(Math.random() * moves.length)];
  try { c.move({ from: r.from, to: r.to, promotion: r.promotion || 'q' }); } catch { return; }
  lastPuzzleMove = { from: r.from, to: r.to };
  puzzle.phase = 'playing';
  setStatus('Przeciwnik odpowiedział — znajdź mat teraz!', 'info');
  renderPuzzleBoard();
}

function finishPuzzle(p, solved) {
  puzzle.phase = 'done';
  if (!state.solved.includes(p.id)) {
    state.solved.push(p.id);
    state.elo = Math.min(2800, state.elo + 40);
  }
  state.streak += 1;
  state.bestStreak = Math.max(state.bestStreak, state.streak);
  saveState(state);
  updateScoreboard();
  renderPuzzleList();
  setStatus(`✓ Rozwiązane! Elo +40 → ${fmt(state.elo)}`, 'ok');
  showExplanation(p, true);
}

function puzzleMistake(p, msg) {
  puzzle.mistakes += 1;
  state.mistakes += 1;
  state.streak = 0;
  saveState(state);
  updateScoreboard();
  setStatus(msg, 'bad');
}

function showExplanation(p, solved) {
  const el = $('#puzzle-explanation');
  el.hidden = false;
  el.innerHTML = `<strong>${solved ? '✓ Rozwiązane!' : 'Rozwiązanie'}</strong> — ${p.explain}<br><span class="mono">${p.solution}</span>`;
}

function onHint() {
  if (puzzle.hintShown) return;
  const p = PUZZLES.find((x) => x.id === puzzle.id);
  puzzle.hintShown = true;
  setStatus('💡 ' + p.hint, 'info');
}

function onSolution() {
  if (puzzle.phase === 'done') return;
  const p = PUZZLES.find((x) => x.id === puzzle.id);
  const c = puzzle.chess;
  if (p.mateIn === 1) {
    const m = getMoves(c).find((x) => x.san.replace('#','').replace('+','') === p.solution.replace('#','').replace('+',''));
    if (m) { try { c.move({ from: m.from, to: m.to, promotion: m.promotion || 'q' }); } catch {} }
  } else {
    // find first move from solver's solution san
    const m = getMoves(c).find((x) => x.san.replace('#','').replace('+','') === p.solution.replace('#','').replace('+',''));
    if (m) { try { c.move({ from: m.from, to: m.to, promotion: m.promotion || 'q' }); } catch {} }
  }
  lastPuzzleMove = null;
  // for mate-in-2 show the first move only
  if (p.mateIn === 2) lastPuzzleMove = null;
  puzzle.phase = 'done';
  if (!state.solved.includes(p.id) && !state.revealed.includes(p.id)) state.revealed.push(p.id);
  saveState(state);
  renderPuzzleBoard();
  showExplanation(p, false);
  setStatus('Rozwiązanie pokazane.', 'info');
}

function onReroll() {
  const list = filteredPuzzles();
  const p = list[Math.floor(Math.random() * list.length)];
  loadPuzzle(p);
}

function nextPuzzle() {
  const list = filteredPuzzles();
  const curIdx = list.findIndex((p) => p.id === puzzle.id);
  const next = list[(curIdx + 1) % list.length];
  loadPuzzle(next);
}

function setStatus(msg, tone) {
  const el = $('#puzzle-status');
  el.textContent = msg || '';
  el.className = 'puzzle-status' + (tone ? ' status-' + tone : '');
}

function renderPuzzleList() {
  const list = $('#puzzle-list');
  list.innerHTML = '';
  filteredPuzzles().forEach((p) => {
    const li = document.createElement('li');
    const solved = state.solved.includes(p.id);
    const revealed = state.revealed.includes(p.id);
    li.className = 'puzzle-list-item' + (solved ? ' solved' : '') + (p.id === puzzle.id ? ' active' : '');
    li.innerHTML = `
      <span class="pli-index">${PUZZLES.indexOf(p) + 1}</span>
      <span class="pli-name">${p.name}</span>
      <span class="pli-tier tier-${p.tier}">${p.tier === 1 ? 'Ł' : p.tier === 2 ? 'Ś' : 'T'}</span>
      <span class="pli-mark">${solved ? '✓' : revealed ? '•' : ''}</span>
    `;
    li.addEventListener('click', () => loadPuzzle(p));
    list.appendChild(li);
  });
}

// ---------------------------------------------------------------- rush
let rush = { active: false, idx: 0, score: 0, streak: 0, bestStreak: 0, timeLeft: 0, timer: null, chess: null, current: null, done: false };
let rushBoard = null;
let rushSquareSelected = null;

function initRush() {
  buildRushBoard();
  $('#btn-rush-start').addEventListener('click', startRush);
  $('#btn-rush-stop').addEventListener('click', stopRush);
}

function buildRushBoard() {
  rushBoard = new Board($('#rush-board'), { orientation: 'w', interactive: true, onSquareClick: handleRushClick });
  setRushStatus('Wciśnij Start, by zacząć rush.', 'info');
  $('#rush-timer').textContent = '--';
}

function startRush() {
  if (rush.active) return;
  rush.active = true;
  rush.idx = 0;
  rush.score = 0;
  rush.streak = 0;
  rush.bestStreak = 0;
  rush.done = false;
  $('#btn-rush-start').hidden = true;
  $('#btn-rush-stop').hidden = false;
  nextRushPuzzle();
}

function stopRush() {
  clearTimeout(rush.timer);
  rush.timer = null;
  rush.active = false;
  rush.done = true;
  $('#btn-rush-start').hidden = false;
  $('#btn-rush-stop').hidden = true;
  if (rush.idx > 0) finalizeRush(false);
}

function nextRushPuzzle() {
  clearTimeout(rush.timer);
  rush.timeLeft = 20;
  rush.current = pickRandomRushPuzzle();
  rush.chess = new Chess(rush.current.fen);
  rushSquareSelected = null;
  rushBoard.render(rush.chess, { lastMove: null, selected: null, legalMoves: null, checkSquare: null });
  setRushStatus('Znajdź rozwiązanie — masz 20 sekund.', 'info');
  $('#rush-counter').textContent = `${rush.idx + 1}/10`;
  $('#rush-timer').textContent = String(rush.timeLeft);
  $('#rush-score').textContent = String(rush.score);
  $('#rush-streak').textContent = String(rush.streak);
  rush.timer = setTimeout(rushTick, 1000);
}
function rushTick() {
  if (!rush.active) return;
  rush.timeLeft -= 1;
  $('#rush-timer').textContent = String(Math.max(0, rush.timeLeft));
  if (rush.timeLeft <= 0) { onRushTimerExpire(); return; }
  rush.timer = setTimeout(rushTick, 1000);
}

function onRushTimerExpire() {
  if (!rush.active) return;
  clearTimeout(rush.timer);
  onRushMiss('timeout');
}

function onRushMiss(reason) {
  rush.streak = 0;
  setRushStatus(reason === 'timeout' ? '⏰ Przestało działać — następne zadanie.' : '✗ Nie udało się — następne zadanie.', 'bad');
  $('#rush-streak').textContent = '0';
  setTimeout(() => advanceRush(), 1100);
}

function onRushSuccess(isMate) {
  clearTimeout(rush.timer);
  rush.streak += 1;
  rush.bestStreak = Math.max(rush.bestStreak, rush.streak);
  const bonus = rush.timeLeft * 5 + rush.streak * 15;
  rush.score += 100 + bonus;
  $('#rush-score').textContent = String(rush.score);
  $('#rush-streak').textContent = String(rush.streak);
  setRushStatus(`✓ Rozwiązano! +${100 + bonus} pkt (czas: ${rush.timeLeft}s, seria: ${rush.streak})`, 'ok');
  setTimeout(() => advanceRush(), 1300);
}

function advanceRush() {
  if (!rush.active) return;
  rush.idx += 1;
  if (rush.idx >= 10) { finalizeRush(true); return; }
  nextRushPuzzle();
}

function finalizeRush(completed) {
  clearTimeout(rush.timer);
  rush.active = false;
  rush.done = true;
  $('#btn-rush-start').hidden = false;
  $('#btn-rush-stop').hidden = true;
  $('#rush-timer').textContent = '--';
  const isBest = rush.score > (state.rushBest || 0);
  if (isBest) state.rushBest = rush.score;
  state.rushBestStreak = Math.max(state.rushBestStreak || 0, rush.bestStreak);
  saveState(state);
  $('#rush-best').textContent = String(state.rushBest);
  setRushStatus(
    completed ? `🎉 Finished! Wynik: ${rush.score} pkt. ${isBest ? 'Nowy rekord!' : 'Najlepszy: ' + state.rushBest + ' pkt.'}` :
               `Rush przerwany. Wynik: ${rush.score} pkt. ${isBest ? 'Nowy rekord!' : 'Najlepszy: ' + state.rushBest + ' pkt.'}`,
    completed ? 'ok' : 'info'
  );
}

function pickRandomRushPuzzle() {
  const pool = PUZZLES.filter((p) => p.mateIn === 1);
  return pool[Math.floor(Math.random() * pool.length)];
}

function handleRushClick(square) {
  if (!rush.active || rush.done) return;
  const c = rush.chess;
  if (c.turn() !== 'w') return;
  const piece = pieceAt(c, square);
  const selected = rushSquareSelected;
  if (selected) {
    const target = findMove(c, selected, square);
    if (target) {
      // apply puzzle logic: mate in 1
      const p = rush.current;
      try { c.move({ from: target.from, to: target.to, promotion: target.promotion || 'q' }); } catch { return; }
      if (c.isCheckmate()) {
        rushBoard.render(c, { lastMove: { from: target.from, to: target.to }, selected: null, legalMoves: null, checkSquare: findKingSquare(c, 'b') });
        onRushSuccess(true);
        return;
      }
      // revert
      c.load(p.fen);
      rushBoard.render(c, { lastMove: null, selected: null, legalMoves: null, checkSquare: null });
      setRushStatus('To nie jest mat — spróbuj inaczej.', 'bad');
      rush.streak = 0;
      $('#rush-streak').textContent = '0';
      return;
    }
  }
  if (piece && piece.color === 'w') {
    rushSquareSelected = square;
  } else {
    rushSquareSelected = null;
  }
  const sel = rushSquareSelected;
  const legalMoves = sel ? getMoves(c).filter((m) => m.from === sel).map((m) => m.to) : null;
  rushBoard.render(c, { lastMove: null, selected: sel, legalMoves, checkSquare: c.isCheck() ? findKingSquare(c, 'w') : null });
}

function setRushStatus(msg, tone) {
  const el = $('#rush-status');
  el.textContent = msg || '';
  el.className = 'puzzle-status' + (tone ? ' status-' + tone : '');
}
// ---------------------------------------------------------------- bot game
let game = {
  chess: null,
  side: 'w',          // player color: 'w' or 'b'
  level: pickLevel(1500),
  moves: [],
  status: 'idle',     // idle | player-turn | bot-turn | over
  botThinking: false,
  manualLevel: false,
};

let botBoard = null;
let botSelected = null;
let lastBotMove = null;

function initBot() {
  const container = $('#bot-board');
  botBoard = new Board(container, { orientation: 'w', interactive: true, onSquareClick: handleBotClick });
  game.chess = new Chess();
  renderBotBoard();

  // level buttons
  const levelsWrap = $('#bot-levels');
  BOT_LEVELS.forEach((lvl) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'bot-level';
    btn.dataset.elo = String(lvl.elo);
    btn.innerHTML = `<span class="bot-level-elo">${lvl.elo}</span><span class="bot-level-name">${lvl.label}</span>`;
    btn.addEventListener('click', () => {
      game.level = lvl;
      game.manualLevel = true;
      updateBotLevelUI();
      if (game.status === 'idle') startBotGame();
    });
    levelsWrap.appendChild(btn);
  });

  // side buttons
  $$('.choice-group .choice').forEach((btn) => btn.addEventListener('click', () => {
    if (game.status === 'over' || game.status === 'idle' || game.moves.length === 0) {
      game.side = btn.dataset.side;
      $$('.choice-group .choice').forEach((x) => x.classList.toggle('choice-active', x === btn));
      botBoard.setOrientation(game.side === 'w' ? 'w' : 'b');
      startBotGame();
    }
  }));
  $('.choice-group .choice[data-side="w"]').classList.add('choice-active');

  $('#btn-bot-undo').addEventListener('click', undoMove);
  $('#btn-bot-flip').addEventListener('click', flipBoard);
  $('#btn-bot-new').addEventListener('click', () => startBotGame());

  updateBotLevelSuggestions();
  updateBotProgressUI();
  startBotGame();
}

function updateBotLevelSuggestions() {
  const suggested = pickLevel(state.elo);
  if (!game.manualLevel) game.level = suggested;
  updateBotLevelUI();
  const hint = $('#bot-suggested-hint');
  if (hint) hint.textContent = `Twój Elo ${fmt(state.elo)} → sugerowany ${suggested.elo}${game.manualLevel ? ' (ten, który wybrałeś)' : ''}`;
}

function updateBotLevelUI() {
  const lvl = game.level;
  const badge = $('#bot-level-badge');
  if (badge) badge.textContent = String(lvl.elo);
  const cur = $('#bot-current');
  if (cur) cur.textContent = `${lvl.label} • ${lvl.elo} Elo`;
  $$('.bot-level').forEach((btn) => btn.classList.toggle('bot-level-active', Number(btn.dataset.elo) === lvl.elo));
}

function updateBotProgressUI() {
  const elo = $('#bot-elo'); if (elo) elo.textContent = fmt(state.elo);
  const solved = $('#bot-solved'); if (solved) solved.textContent = `${state.solved.length}/${PUZZLES.length}`;
  const best = $('#bot-best'); if (best) best.textContent = String(state.bestStreak);
}

function startBotGame() {
  if (game.moves.length && game.status === 'over') {} // fresh game below
  game.chess = new Chess();
  game.moves = [];
  lastBotMove = null;
  botSelected = null;
  game.botThinking = false;
  game.status = 'player-turn';
  setBotStatus('Twój ruch', 'info');
  renderBotBoard();
  updateBotLevelSuggestions();
  if (game.side === 'b') {
    // player is black — bot (white) moves first
    game.status = 'bot-turn';
    setBotStatus('Bot myśli…', 'bot');
    setTimeout(() => botMove(), 700);
  }
}

function renderBotBoard() {
  const legalMoves = botSelected && game.status === 'player-turn'
    ? getMoves(game.chess).filter((m) => m.from === botSelected).map((m) => m.to)
    : null;
  botBoard.render(game.chess, {
    lastMove: lastBotMove,
    selected: botSelected,
    legalMoves,
    checkSquare: game.chess.isCheck() ? findKingSquare(game.chess, game.chess.turn()) : null,
  });
}

function handleBotClick(square) {
  if (game.status !== 'player-turn' || game.botThinking) return;
  const c = game.chess;
  if (c.turn() !== game.side) return;
  const piece = pieceAt(c, square);
  if (botSelected) {
    const target = findMove(c, botSelected, square);
    if (target) {
      applyPlayerMove(target);
      return;
    }
  }
  if (piece && piece.color === game.side) botSelected = square;
  else botSelected = null;
  renderBotBoard();
}

function applyPlayerMove(move) {
  const c = game.chess;
  let applied;
  try { applied = c.move({ from: move.from, to: move.to, promotion: move.promotion || 'q' }); } catch { return; }
  lastBotMove = { from: applied.from, to: applied.to };
  game.moves.push(applied.san);
  botSelected = null;
  renderBotBoard();
  if (c.isCheckmate()) { endGame('🏆 Checkmate — zwycięstwo!', 'ok'); return; }
  if (c.isDraw()) { endGame('🤝 Remis', 'info'); return; }
  game.status = 'bot-turn';
  game.botThinking = true;
  setBotStatus('Bot myśli…', 'bot');
  setTimeout(() => botMove(), 250);
}

function botMove() {
  if (game.status !== 'bot-turn') return;
  const c = game.chess;
  const lvl = game.level;
  setBotStatus(`Bot myśli… (${lvl.elo})`, 'bot');
  setTimeout(() => {
    if (game.status !== 'bot-turn') return;
    const m = findBestMove(c, { depth: lvl.depth, timeBudgetMs: lvl.timeBudgetMs, blunder: lvl.blunder });
    if (!m) { game.botThinking = false; endGame('Nie udało się znaleźć ruchu', 'bad'); return; }
    let applied;
    try { applied = c.move({ from: m.from, to: m.to, promotion: m.promotion || 'q' }); }
    catch (e) { game.botThinking = false; endGame('Błąd bota', 'bad'); return; }
    lastBotMove = { from: applied.from, to: applied.to };
    game.moves.push(applied.san);
    game.botThinking = false;
    renderBotBoard();
    if (c.isCheckmate()) { endGame('💀 Checkmate — pokonany.', 'bad'); return; }
    if (c.isDraw()) { endGame('🤝 Remis', 'info'); return; }
    game.status = 'player-turn';
    setBotStatus('Twój ruch', 'info');
  }, 20);
}

function endGame(msg, tone) {
  game.status = 'over';
  game.botThinking = false;
  setBotStatus(msg, tone);
  renderBotBoard();
}

function undoMove() {
  if (!game.chess || game.botThinking || game.moves.length === 0) return;
  const undoCount = Math.min(2, game.moves.length);
  for (let i = 0; i < undoCount; i++) game.chess.undo();
  game.moves = game.moves.slice(0, Math.max(0, game.moves.length - undoCount));
  lastBotMove = null;
  botSelected = null;
  game.status = 'player-turn';
  setBotStatus('Twój ruch', 'info');
  renderBotBoard();
}

function flipBoard() {
  const next = botBoard.orientation === 'w' ? 'b' : 'w';
  botBoard.setOrientation(next);
  renderBotBoard();
}

function setBotStatus(msg, tone) {
  const el = $('#bot-status-text');
  el.textContent = msg;
  el.className = 'bot-status' + (tone ? ' status-' + tone : '');
}

// ---------------------------------------------------------------- scoreboard misc
function updateScoreboard() {
  const el = $('#score-card');
  if (el) el.innerHTML = `
    <div class="sc-stat"><span class="sc-num">${fmt(state.elo)}</span><span class="sc-label">Twój Elo</span></div>
    <div class="sc-stat"><span class="sc-num">${state.solved.length}/${PUZZLES.length}</span><span class="sc-label">Rozwiązane</span></div>
    <div class="sc-stat"><span class="sc-num">${state.streak}</span><span class="sc-label">Seria</span></div>
    <div class="sc-stat"><span class="sc-num">${state.bestStreak}</span><span class="sc-label">Best</span></div>
  `;
  updateBotProgressUI();
  updateBotLevelSuggestions();
}
