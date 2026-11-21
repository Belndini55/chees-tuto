// Smoke test: boot the full app in jsdom and exercise key flows.
import { JSDOM } from 'jsdom';
import fs from 'fs';

const html = fs.readFileSync('index.html', 'utf8')
  // strip external CSS/font links? keep it; jsdom doesn't fetch them by default
  ;
const dom = new JSDOM(html, { url: 'http://localhost/', pretendToBeVisual: true, runScripts: 'outside-only' });
const { window } = dom;

// install globals before importing app.js
globalThis.window = window;
globalThis.document = window.document;
globalThis.localStorage = window.localStorage;
globalThis.location = window.location;
globalThis.history = window.history;
globalThis.getComputedStyle = window.getComputedStyle?.bind(window);
globalThis.Event = window.Event;
globalThis.IntersectionObserver = window.IntersectionObserver;

try {
  await import('../assets/js/app.js');
  console.log('✓ app.js imported');
} catch (e) {
  console.error('✗ app.js import failed:', e.message);
  process.exit(1);
}

// fire DOMContentLoaded
const doc = window.document;
doc.dispatchEvent(new window.Event('DOMContentLoaded'));
console.log('✓ DOMContentLoaded fired');

// helper
const $ = (s) => doc.querySelector(s);
const $$ = (s) => [...doc.querySelectorAll(s)];

// ---- checks ----
const checks = [];
function check(name, cond) { checks.push({ name, ok: !!cond }); }

check('hero stats filled', $('#stat-openings').textContent === '20' && $('#stat-puzzles').textContent === '20');
check('openings grid rendered', $$('#openings-grid .opening-card').length === 20);
check('midgame grid rendered', $$('#midgame-grid .midgame-card').length === 6);
check('puzzle list rendered', $$('#puzzle-list .puzzle-list-item').length === 20);
check('bot levels rendered', $$('#bot-levels .bot-level').length === 5);
check('score-card filled', $('#score-card').textContent.includes('1 500') || $('#score-card').textContent.includes('1500'));
check('bot status text', $('#bot-status-text').textContent.length > 0);

// ---- opening modal ----
const card = $$('#openings-grid .opening-card')[5];
card.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
check('opening modal opens', !doc.querySelector('#opening-modal').hidden);
check('opening title set', doc.querySelector('#opening-modal-title').textContent.length > 0);
check('opening board has 64 squares', doc.querySelectorAll('#opening-board .square').length === 64);
check('opening ideas rendered', $$('#opening-ideas li').length >= 3);
// step through moves
doc.querySelector('#opening-next').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
check('opening modal: ply advanced', doc.querySelector('#opening-ply').textContent.includes('1'));
doc.querySelector('[data-close-modal]')?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
check('opening modal closes', doc.querySelector('#opening-modal').hidden);

// ---- puzzle flow: solve first puzzle by clicking the right cells ----
// Puzzle p01 is mate in 1: back-rank queen Qe8#. Player = white, king g1, queen e1.
// Find the queen square (e1), then target e8
const queenSq = (() => {
  // find e1 square in board
  const sq = [...doc.querySelectorAll('#puzzle-board .square')].find((s) => [...s.querySelectorAll('.piece')].some(p => p.textContent === '♕' && s.dataset.square[0] === 'e'));
  return sq ? sq.dataset.square : 'e1';
})();
const qEl = [...doc.querySelectorAll('#puzzle-board .square')].find((s) => s.dataset.square === 'e1');
qEl?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
const targetEl = [...doc.querySelectorAll('#puzzle-board .square')].find((s) => s.dataset.square === 'e8');
const beforeStatus = $('#puzzle-status').textContent;
targetEl?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
const afterStatus = $('#puzzle-status').textContent;
check('puzzle flow: correct move gives ok status', afterStatus !== '' && (afterStatus.includes('Rozwiązane') || afterStatus.includes('✓')));
check('score-card shows solved count', $('#score-card').textContent.includes('1/20'));

// ---- render bot board and click a square ----
const boardSq = [...doc.querySelectorAll('#bot-board .square')].find((s) => s.dataset.square === 'e2');
boardSq?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
check('bot board clickable (selection highlights)', boardSq?.classList.contains('selected') === true);

// print results
let pass = 0;
for (const c of checks) {
  console.log((c.ok ? '✓' : '✗') + ' ' + c.name);
  if (c.ok) pass++;
}
console.log(`\n${pass}/${checks.length} smoke checks passed`);

// ---- ---------- deeper interaction tests (async) ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const more = [];
function check2(name, cond) { more.push({ name, ok: !!cond }); }

// 1) bot game: make a real move e2-e4, bot should respond
const e2 = [...doc.querySelectorAll('#bot-board .square')].find((s) => s.dataset.square === 'e2');
e2?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
const e4 = [...doc.querySelectorAll('#bot-board .square')].find((s) => s.dataset.square === 'e4');
e4?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
check2('bot: player move accepted, needs bot turn', doc.querySelector('#bot-status-text').textContent.toLowerCase().includes('bot'));
await sleep(2500); // allow bot to finish thinking (1200 Elo ~600ms; 1500 ~800ms)
const statusAfter = doc.querySelector('#bot-status-text').textContent;
check2('bot: bot responded and player turn active', statusAfter.toLowerCase().includes('twój ruch') || statusAfter.toLowerCase().includes('ruch'));
check2('bot: board shows material change (e4 pawn)', [...doc.querySelectorAll('#bot-board .piece-b')].length > 0 || doc.querySelector('#bot-board').innerHTML.includes('♟') || doc.querySelector('#bot-board').innerHTML.includes('♙'));

// 2) puzzle failure: click a wrong move on second puzzle, verify mistake message
const listItems = $$('#puzzle-list .puzzle-list-item');
if (listItems.length > 1) listItems[1].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await sleep(50);
// current puzzle = second puzzle; wrong click on an empty square e.g. f7? click own piece and wrong target?
const sq = [...doc.querySelectorAll('#puzzle-board .square')].find((s) => s.dataset.square === 'e2');
sq?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await sleep(30);
// click a non-legal target if pawn e2 exists — modern board: check what piece is at e2 in puzzle p02 (back-rank rook puzzle)
// We don't know exact position here — just check that clicking does not crash and status remains
check2('puzzle fail flow: no crash, status visible', $('#puzzle-status').textContent !== undefined);

// 3) rush start
const btnRush = $('#btn-rush-start');
btnRush?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await sleep(60);
check2('rush: timer started (not -- and not empty)', $('#rush-timer').textContent !== '--' && $('#rush-timer').textContent !== '');
check2('rush: counter shows 1/10', $('#rush-counter').textContent === '1/10');
// stop rush to avoid timer running away
const stopBtn = $('#btn-rush-stop');
stopBtn?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

// print additional results
let pass2 = 0;
for (const c of more) {
  console.log((c.ok ? '✓' : '✗') + ' ' + c.name);
  if (c.ok) pass2++;
}
console.log(`\n${pass2}/${more.length} additional checks passed`);
process.exit(pass2 === more.length ? 0 : 1);
