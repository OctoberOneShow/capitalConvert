# capitalConvert

A zero-build, browser-only text toolkit with a 98-game arcade and a virtual companion.
Four static HTML pages share one vanilla JavaScript/CSS runtime. There is no bundler,
package manager, backend, or telemetry.

## Pages

| Page | Tool | What it does |
| --- | --- | --- |
| `index.html` | **Text Formatter** | Sentence-case cleanup, common contraction fixes, `[...]` removal, and symbol filtering that preserves Chinese characters. |
| `english_filter.html` | **English Letter Filter** | Removes CJK characters from mixed-language text while keeping Latin letters, digits, punctuation, and apostrophes. |
| `chinese_punctuation.html` | **Chinese Punctuation Remover** | Converts Chinese commas, colons, semicolons, and sentence marks to spaces; drops quotes, brackets, ellipses, dashes, and tildes; collapses the leftover spacing. |
| `words_replacing.html` | **Words Replacer** | Applies searchable preset replacement rules. The default preset has 70 rules with phrase exemptions; the speaker-tag preset has 7. Match previews and per-rule counts update as you type. |

Open any page directly in a browser. Paste text, run the tool, then copy, download,
swap the result back into the input, or inspect the before/after diff. `Ctrl+Enter`
runs the active tool.

### Shared shell

All four pages load the same 126 script modules and 9 stylesheets and provide:

- English/Chinese UI switching, dark/light themes, and full/calm/off motion settings.
- Game sound on/off, a history drawer, undo, draggable cards, and reset-layout.
- Character/line counters, a change summary, and a highlighted diff preview.
- A game drawer and the companion widget, available on every page.
- Responsive layouts and `prefers-reduced-motion` support.

The core app works offline. Web fonts (Inter, JetBrains Mono) and the optional
Love and Deepspace character videos are the only network-dependent pieces.

## Games

The drawer ships **98 games**: 49 hand-wired panels in the HTML pages plus 49
registry modules loaded through `assets/app/game-registry.js`. The picker supports
name search, six genre filters, a collapsible "more games" list, and keyboard
navigation.

Every game has a collapsible **How to play** guide with a mechanic diagram and
bilingual steps. Campaign games share the unlock-chain core in
`assets/app/game-campaign.js`. 96 titles use the illustrated presentation layer
with their own world, motif, and objective; Item Quest and Love and Deepspace keep
their native screens.

**Arcade (24):** Typing Sprint, Reflex Tap, Caret Dash, Punctuation Plumber, Stack!,
Inkball, Serpent, Glyph Blocks, Bubble Ink, Ink Slash, Peg Splash, Glyph Raid, Glyph
Leap, Comet Golf, Starfall Lander, Glyph Crossing, Neon Drift, Tether Salvage,
Pinball Courier, Tiny Wrestlers, Kitchen Relay, Crosswind Kites, Gravity Badminton,
Tiny Blacksmith.

**Puzzle (35):** Glyph Match, 2048, Spot the Diff, Color Code, Lights Out, Glyph
Mines, Traffic Jam, Letter Vault, Ink Cascade, Aurora Flow, Prism Path, Ink Sort,
Glyph Pusher, Glyph Net, Glyph Sketch, Glyph Fifteen, Glyph Sudoku, Glyph Glide,
Glyph Tower, Republic Rewind, Pocket Detective, Circuit Scribe, Shadow Fold, Paper
Bridge, Loopwright, Hue Hunter, Snapshot Sleuth, Double Take, Rule Thieves, Paradox
Post, Blind Sculptor, Lost Language, Switchboard Duo, Counterfeit Museum, Shadow
Puppeteer.

**Strategy (19):** Ember Dice, Gomoku, Glyph Reversi, Glyph Four, Glyph Fleet, Ember
Sticks, Glyph Dots, Kalah Row, Twenty-One Parlor, Clockwork Dispatch, Weather Loom,
Whisper Deck, Glyph Bastion, Microbe Lab, Moon Market, Courtroom of Animals, Whale
Parliament, One-Minute Mayor, Auction Dungeon.

**Explore (8):** Rooftop Radio, Lantern Heist, Ember Delve, Echo Cartographer,
Archive Escape, Borrowed Bodies, Deep Freeze, Ocean Archaeologist.

**Cozy (6):** Elements, Roof Garden, Coral Architect, Lantern Fishing, Pocket
Photographer, Tea House at Midnight.

**Rhythm (4):** Ink Beat, Glyph Echo, Dream Orchestra, Morse Rescue.

Item Quest and Love and Deepspace sit outside the genre filters and open their own
native layouts.

### Proven boards, not guessed ones

Many games generate their deals and prove the deal before shipping it:

- Glyph Pusher rooms are BFS-verified; Glyph Glide quotes a BFS-proven par.
- Glyph Tower bands are checked against the `2^n - 1` optimum.
- Glyph Sketch nonograms are solvable by row/column logic alone; Glyph Sudoku
  keeps a unique answer.
- Prism Path replays every reachable mirror orientation through the real beam.
- Kalah, Blackjack, Ink Sort, and several campaign ladders ship with their own
  solvers/forges.

The `tools/*-forge.js` scripts search for new levels, and
`node tools/verify-levels.js` replays every shipped rung through the games' own
engines. `node tools/audit-levels.js` reports the current ladder sizes.

### 恋与深空 / Love and Deepspace

A 1.0 fan-made mini-adventure built around the five partners (Xavier, Zayne,
Rafayel, Sylus, Caleb). It is not an official Infold release.

Open it from any page's game drawer, or directly with
`index.html?game=love-deepspace`.

- **Gallery:** nine locally bundled artworks per partner (45 originals plus 45
  compact thumbnails), with zoom, favorites, keyboard navigation, and original-file
  download.
- **Together:** scene strips, a six-goal Journey per partner, twelve Starpath
  constellation puzzles, and 18 keepsakes / 54 stars across Mosaic, Bouquet, and
  Expedition.
- **Date activities:** claw machine, Kitty Cards, date stories, photo studio and
  four-shot strips, quality time, heart-to-heart conversations, cooking, and room
  decoration.
- **Missions:** an action arena (Starbond Hunt) and a turn-based strategy mode
  (Starbond Relay), with per-partner skills and saved best stars.

Media provenance is recorded in
[assets/media/love-deepspace/CREDITS.md](assets/media/love-deepspace/CREDITS.md).
Dialog, mini-games, and gameplay are original fan adaptations; portraits and
gallery art belong to their respective rights holders.

## Companion

Every page also hosts an original virtual companion, injected by the `pet-*.js`
modules:

- Adopt one of three species — **Bracko**, **Quillop**, or **Tagling** — and name it.
- Happiness, hunger, and energy decay with real elapsed time (capped at 12 hours).
- Feed, pet, play, rest, brush, teach tricks, and unlock accessories, hues, and
  evolutions across 10 levels and three stages.
- Eleven achievements, daily streaks, away rewards, and two mini-games:
  **Treat Toss** and **Trick Trainer**.
- The widget can be collapsed, dragged to another corner, hidden, renamed, reset,
  or switched to another species. It respects the sound and motion settings.

State is stored under `capitalconvert-pet` and shared across all four pages.

## Project layout

```text
index.html                  Text Formatter + shared drawer
english_filter.html         English Letter Filter
chinese_punctuation.html    Chinese Punctuation Remover
words_replacing.html        Words Replacer

assets/app/                 126 JavaScript modules
  core.js                   storage, i18n, theme, history, layout, effects
  i18n.js                   English/Chinese dictionary
  tools.js                  text transforms and replacement presets
  main.js                   page bootstrap
  game-*.js                 game engines and registry modules
  pet-*.js                  companion
assets/styles/              9 stylesheets (base, games, presentation, pet, Love)
assets/media/love-deepspace/
                            45 artworks, 45 thumbnails, credits and source hashes
tools/                      headless checks, browser drivers, level forges
```

### Two ways a game is wired

1. **Hand-wired:** the tab and panel live in the four HTML pages; its module calls
   an exported `init...Game()` from `main.js`.
2. **Registry:** a module calls `App.registerGame({ name, tabKey, init, guide })`
   and the shell injects the tab, panel, guide, and pause hook. The linker
   `node tools/link-registry-games.js` adds registry scripts to all four pages and
   is the sanctioned wiring path; do not hand-edit asset tags.

## Run locally

Directly opening the `.html` files is enough for the text tools, games, and
companion.

For reliable Love and Deepspace PNG exports, use the local server:

```bash
node tools/serve-game.js
# http://127.0.0.1:8765/index.html?game=love-deepspace
```

`PORT` changes the port. The server listens on localhost only. Photo export needs
an HTTP origin because `file://` can taint the canvas.

## Development checks

Node.js 22+ is recommended for the browser scripts (they use the built-in
`fetch`/`WebSocket`). No `npm install` is required. Browser checks need a local
Chrome or Edge installation; the Love checks accept `CHROME_PATH` or
`--chrome=/path/to/browser`.

| Command | What it proves |
| --- | --- |
| `node tools/static-checks.js` | Page wiring, 98-game/49-panel manifest, i18n keys, pet lifecycle, campaign levels, CSS/HTML integrity. |
| `node tools/pet-harness.js` | Full headless suite: companion, registry games, campaigns, shell regressions, Love activities, Prism Path. |
| `node tools/i18n-keys.js` | English/Chinese dictionaries are 1:1; `--baseline <file>` also catches removed keys. |
| `node tools/verify-game.js game-<slug>` | Boots one module in the stub DOM and drives its controls before it is linked. Add `--isolated` to ignore unrelated modules. |
| `node tools/verify-levels.js` | Replays every campaign rung through the shipped engines. |
| `node tools/audit-levels.js` | Prints campaign level counts per game. |
| `node tools/prism-forge.js verify` | Replays every possible orientation of every Prism Path board. |
| `node tools/prism-forge.js forge [seed]` | Searches for new boards against the same proof bar. |
| `node tools/game-presentation-check.js` | Real-browser pass over all panels, filtering, localization, motion, and screenshots. |
| `node tools/love-deepspace-release-check.js` | Real-browser gallery, photo, story, Journey, Starpath, save, and responsive checks. |
| `node tools/love-deepspace-activities-check.js` | Real-browser Mosaic, Bouquet, and Expedition completion checks. |
| `node tools/shot.js --game <slug>` | Headless screenshot of a game panel. |
| `node tools/serve-game.js` | Local HTTP preview for photo exports and manual play. |

Browser checks write generated screenshots and reports under `tools/shots/` on
demand; that directory is ignored by Git.

## Persistence

Preferences (`theme`, `lang`, `motion-level`, `sound-level`), layout/history,
the companion, and game saves use `localStorage`. Love and Deepspace keeps its
records under `love-deepspace-*-v1` keys and falls back to session state when
storage is blocked. Saves are scoped to the origin, so `file://` and
`http://127.0.0.1` do not share progress.

## Credits

Love and Deepspace is a fan project. Character portraits, gallery artwork, and
optional character videos come from official Infold media and remain the property
of their rights holders; see the
[media credits](assets/media/love-deepspace/CREDITS.md) and
[gallery source hashes](assets/media/love-deepspace/gallery-sources.json).
Dialogue, mini-games, companion art, and all other game visuals are original and
drawn in code.
