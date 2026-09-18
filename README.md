# capitalConvert

A small web-based text toolkit (pure HTML/CSS/JS, no build step) for cleaning and transforming text:

- `index.html` – main entry point / overview
- `chinese_punctuation.html` – normalize Chinese punctuation
- `english_filter.html` – filter / process English text
- `words_replacing.html` – batch find-and-replace words
- `assets/` – shared scripts and styles

Each page also includes a shared mini-game drawer with eighteen games: Typing
Sprint, Glyph Match, 2048, Reflex Tap, Caret Dash, Elements (falling-sand
sandbox), Spot the Diff (mutation-hunting ladder), Punctuation Plumber (width
sorting with combos), Stack! (drop-and-trim tower), Color Code (Mastermind),
Inkball (glyph-brick breakout), Ember Dice (push-your-luck), Serpent (snake),
Lights Out (flip-the-cross logic), Glyph Mines (minesweeper), Gomoku (five in a
row against a ranking AI), Traffic Jam (BFS-proven slide puzzles), and Letter
Vault (daily five-letter word lock). Campaign games share an unlock-chain core
(game-campaign.js). The picker is a two-column grid that shows six games and
states the hidden count ("More games +12") instead of hiding the rest behind a
scroll gesture.

## Usage

Open any `.html` file directly in a browser. No server required.
