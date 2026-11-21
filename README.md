# SzachLab

Strona do rozwijania umiejętności szachowych dla średniozaawansowanych graczy.

**Co tu jest:**
- **20 najpopularniejszych otwieraczy** (z 5 którymi można zaskoczyć) — z ideami gry środkowej, nie z teorą 200 kolumn.
- **Gra środkowa** — 6 podstawowych idei gry (kontrola środka, rozwój, osłona króla, tempo, aktywność, przełamania).
- **Zadania szachowe (puzzle ladder)** — 20 matów, od łatwych do trudnych; Twój Elo zaczyna się od 1500 i rośnie z każdym poprawnym zadaniem.
- **Puzzle Rush** — 10 zadań pod presją czasu z serią punktów.
- **Gra z botem** — boty na poziomach Elo jak na chess.com (1200–2400); zaczynasz na swoim poziomie i rośniesz wraz z odpowiedziami.

**Stack:** czysty HTML/CSS/JS (ESM), chess.js do reguł szachowych, vlastní silnik bota (meta-liczenie Alpha-Beta z czasem i randomizacją poziomów Elo). Bez frameworków.

## Uruchomienie

```bash
# serwer statyczny (brak budowania)
python3 -m http.server 8080
# otwórz http://localhost:8080
```

## Struktura

```
index.html               — strona główna
assets/css/style.css    — system designu (dark/gold)
assets/fonts/           — self-hosted czcionki (Cinzel + Inter)
assets/js/app.js        — logika aplikacji (otwieracze, zadania, rush, bota)
assets/js/board.js      — renderer planszy szachowej
assets/js/engine.js     — silnik bota (Alpha-Beta + czasy + losowość poziomów)
assets/js/openings.js   — 20 otwieraczy (treść)
assets/js/puzzles.js    — 20 puzzli (maty 1–2, weryfikowane)
assets/js/vendor/       — vendored chess.js
tools/                  — skrypty weryfikacyjne (puzzle + otwieracze)
```

## Weryfikacja

```bash
node tools/final-check.js   # wszystkie puzzły: zdrowe pozycje + mat w 1/2 ruchu
node tools/verify-openings.js  # wszystkie otwieracze: legalne ruchy
node tools/smoke-test.js      # końcowa test: boot + klamra flows
```

## Notatka

Treść oryginalna (bez kopiowania materiałów z innych źródeł). Wizualnie nawiązuj do lekcji pokazujących idei, a nie teorii — jak pokazują na innych kanalach, ale jest to samodzielna praca.
