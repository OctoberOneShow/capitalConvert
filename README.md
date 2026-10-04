# capitalConvert

A small web-based text toolkit (pure HTML/CSS/JS, no build step) for cleaning and transforming text:

- `index.html` – main entry point / overview
- `chinese_punctuation.html` – normalize Chinese punctuation
- `english_filter.html` – filter / process English text
- `words_replacing.html` – batch find-and-replace words
- `assets/` – shared scripts and styles

Each page also includes a shared mini-game drawer with seventy games:
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
Fleet (battleship duels against ranked hunt/target admirals), Ember Sticks
(Nim tables solved by a provably perfect xor player), and Glyph Dots
(dots-and-boxes against an AI that surrenders its shortest chain), and Republic
Rewind (a bilingual history-and-culture card quiz with per-card notes), Kalah
Row (a mancala sow against a bench that reads the ring two hands deep),
Twenty-One Parlor (blackjack tables that race a bankroll to its target) and
Roof Garden (an idle planting bed that ripens on the wall clock), plus twenty-one
games the drawer injects from a registry (game-registry.js) instead of page
markup: Rooftop Radio (triangulate a hidden transmitter from signal readings),
Lantern Heist (turn-based stealth past guard vision cones), Pocket Detective
(logic-grid cases carved down to one unique solution), Circuit Scribe (gate nets
graded against a truth table), Shadow Fold (stamp one unit cell, fold it into the
target), Clockwork Dispatch (junction switching against BFS-proved timetables),
Weather Loom (steer wind and heat to feed the villages), Coral Architect (draft
reef tiles scored by adjacency rules), Paper Bridge (beam lattices a cart can
actually roll), Ember Delve (telegraphed intents across a 4x4 floor plan),
Whisper Deck (a three-lane deckbuilder with echo and exhaust clauses), Glyph
Bastion (tower traits against armour, splitters and cloaks), Microbe Lab (spend
mutation points to outlast the environment cards), Echo Cartographer (map a cave
from fading sonar pings), Neon Drift (momentum time trials against your own
ghost), Lantern Fishing (depth, bite windows and line tension), Archive Escape
(a branching bilingual text adventure), Moon Market (seven seeded days of prices
and events), Dream Orchestra (voice-limited step-sequencer puzzles), Loopwright
(loop a program so your earlier runs hold the plates), and Love and Deepspace
(a route-and-bond strategy run themed around 恋与深空). Campaign
games share an unlock-chain core
(game-campaign.js). Every game panel carries a collapsible "How to play"
guide (game-guide.js) with a mechanic diagram and step-by-step instructions
in both languages. The picker is a two-column grid that shows six games and
states the hidden count ("More games +64") instead of hiding the rest behind
a scroll gesture.

## Usage

Open any `.html` file directly in a browser. No server required.

## Game checks and future ideas

Run `node tools/pet-harness.js` for the shared gameplay and regression checks,
and `node tools/static-checks.js` for page wiring, translation and level checks.

[GAME_BUG_AUDIT.md](GAME_BUG_AUDIT.md) records the verified bugs, fixes and checks.

[GAME_IDEAS.md](GAME_IDEAS.md) contains 24 new concepts across sport, combat, diplomacy,
survival, communication, narrative and cooperative play, with a small first
version for each.
