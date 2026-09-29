# capitalConvert

A small web-based text toolkit (pure HTML/CSS/JS, no build step) for cleaning and transforming text:

- `index.html` – main entry point / overview
- `chinese_punctuation.html` – normalize Chinese punctuation
- `english_filter.html` – filter / process English text
- `words_replacing.html` – batch find-and-replace words
- `assets/` – shared scripts and styles

Each page also includes a shared mini-game drawer with forty-three games:
Typing Sprint, Glyph Match, 2048, Reflex Tap, Caret Dash, Elements
(falling-sand sandbox), Spot the Diff (mutation-hunting ladder), Punctuation
Plumber (width sorting with combos), Stack! (drop-and-trim tower), Color Code
(Mastermind), Inkball (glyph-brick breakout), Ember Dice (push-your-luck),
Serpent (snake), Lights Out (flip-the-cross logic), Glyph Mines (minesweeper),
Gomoku (five in a row against a ranking AI), Traffic Jam (BFS-proven slide
puzzles), Letter Vault (daily five-letter word lock), Glyph Blocks
(line-clearing stacker with a floor-by-floor campaign), Ink Cascade
(match-three chain reactions), Ink Beat (WebAudio rhythm tapping on
synthesized drums), Bubble Ink (bubble shooter with wall bounces and cluster
drops), Glyph Echo (listen-and-repeat chain memory on singing pads), Ink
Slash (swipe-to-cut arcade with combo trails and bombs), Peg Splash
(Peggle-style peg clearing with a ball-refunding bucket), Glyph Raid
(Invaders-style formation shooter), Glyph Leap (vertical hopper with
springs and drifting ledges), Aurora Flow (glowing numberlink ribbons on
a starfield board), Comet Golf (gravity-well slingshot golf with a
particle-trailing comet), Prism Path (laser-and-mirror puzzles with a
live-traced beam), Starfall Lander (thrust-and-touchdown flight over
glowing pads), Ink Sort (pouring puzzles dealt by a built-in solver), Glyph
Crossing (frogger-style lanes with log rides), Glyph Pusher (BFS-verified
sokoban rooms with undo), Glyph Net (spanning-tree pipe rotations that
power every bulb), Glyph Sketch (nonograms proven solvable by pure
row/column logic), Glyph Fifteen (sliding tiles dealt by legal walks, so
every board is solvable), Glyph Sudoku (mini grids carved while the answer
stays unique), Glyph Reversi (a disc-flipping duel against six AI ranks),
Glyph Glide (ice-slide mazes whose generator quotes a BFS-proven par),
Glyph Four (column-drop duels against a minimax ladder), Glyph Tower
(tower-transfer puzzles rated against the 2^n - 1 optimum), and Glyph
Fleet (battleship duels against ranked hunt/target admirals). Campaign games share an unlock-chain core
(game-campaign.js). Every game panel carries a collapsible "How to play"
guide (game-guide.js) with a mechanic diagram and step-by-step instructions
in both languages. The picker is a two-column grid that shows six games and
states the hidden count ("More games +37") instead of hiding the rest behind
a scroll gesture.

## Usage

Open any `.html` file directly in a browser. No server required.
