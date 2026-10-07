# capitalConvert

A small web-based text toolkit (pure HTML/CSS/JS, no build step) for cleaning and transforming text:

- `index.html` – main entry point / overview
- `chinese_punctuation.html` – normalize Chinese punctuation
- `english_filter.html` – filter / process English text
- `words_replacing.html` – batch find-and-replace words
- `assets/` – shared scripts and styles

Each page also includes a shared mini-game drawer with ninety-eight games:
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
(loop a program so your earlier runs hold the plates), Hue Hunter (hunt the one
tile whose colour is a shade off, across a fifty-level ladder), Snapshot
Sleuth (find the one tampered photo on a wall of hand-painted scenes, across
a fifty-level ladder), Double Take (the classic two-photo
find-the-difference hunt over a fifteen-scene hand-painted deck, across a
fifty-level ladder), Item Quest (hunt the items listed in the tray through
six dense hand-painted rooms), and Love and Deepspace
(an action arena and route-and-bond strategy game themed around 恋与深空). Campaign
games share an unlock-chain core
(game-campaign.js). Every game panel carries a collapsible "How to play"
guide (game-guide.js) with a mechanic diagram and step-by-step instructions
in both languages. The picker is a two-column grid that shows six games and
states the hidden count ("More games +64") instead of hiding the rest behind
a scroll gesture.

## Usage

Open any `.html` file directly in a browser. No server required.

### Game presentation

The 96 games other than **Item Quest / 寻物启事** and **Love and Deepspace / 恋与深空** now have illustrated title scenes, bilingual objectives, and genre identities. The expanded picker supports searching English or Chinese names and filtering by category. Keyboard navigation follows the filtered results.

The remaining game screens use coordinated controls and readable dark surfaces in either site theme. Thirty-four canvas games include original environment artwork; trains, ships, stealth characters, coral, crates, board discs, and falling blocks have additional piece detail. Whisper Deck has illustrated card faces with visible costs and echo rules. Tea House has guest portraits and illustrated drinks. Weather Loom shows terrain and weather gauges, with exact values available through **Show readings** and the selected-cell readout.

Presentation animations respect the motion setting and the system's reduced-motion preference. Score changes animate only when the value changes; hidden games do not run presentation animation loops. Campaign completions display a dismissible star banner. Game rules and saved-progress formats are preserved.

Verification:

- `node tools/game-presentation-check.js` checks all 98 panels at 860px, 390px, and 320px; validates search, localization, motion controls, and the two excluded panels; and saves previews and a report in `tools/shots/completed/`. It requires local Chrome.
- `node tools/verify-game.js game-weather-loom game-coral-architect game-clockwork-dispatch game-whisper-deck game-tea-house game-ember-delve game-glyph-bastion game-lantern-heist` exercises the changed game controls and timer cleanup.
- `node tools/pet-harness.js` runs the full gameplay and companion regression suite.
- `node tools/static-checks.js` checks page wiring, localization, and the shared game infrastructure.

### 恋与深空 / Love and Deepspace

Open **Games → More games → Love and Deepspace** on any of the four pages.
The fan-made mini-adventure features Xavier, Zayne, Rafayel, Sylus, and
Caleb with locally bundled official portraits, optional muted character video
loops, and original English/Chinese dialogue. Videos require an internet
connection; portraits and gameplay work offline. Media sources are recorded in
[CREDITS.md](assets/media/love-deepspace/CREDITS.md).

**Together / 陪伴** is the landing view, with a large official character portrait,
gentle viewpoint movement, original character dialogue, and an optional official
character video. **Say hello** starts the muted video when motion is enabled;
**Animate character** also lets you start or stop it explicitly. On wider screens,
the character stays beside the date activity. **All games** restores the shared
picker, and **Missions** opens the existing combat and strategy modes.

Each partner has **five distinct images**: the original portrait plus four
official gallery artworks. The scene strip switches images, remembers a separate
selection for each partner, and can change scenes in response to play. Turn off
**Scenes react to play** to keep your chosen image. All 25 images are bundled
locally, and every scene is also available in the photo studio.

The date activities are simplified fan adaptations inspired by the official
[feature list](https://apps.apple.com/us/app/love-and-deepspace/id6443467666):

- **Claw machine / 抓娃娃:** hold A/D or arrows, use touch movement buttons,
  or drag to aim. Predict the moving plushies and press Space to drop. Each
  session has five attempts and one Evol assist that steadies prizes for two
  seconds. The claw descends, lifts, and delivers the prize before awarding it.
  **Challenge** adds a 60-second limit, faster movement, and a second Space press
  to grip in the mint timing zone. Centre hits earn Perfect bonuses, consecutive
  catches grow a combo, and each partner's best challenge score is saved.
- **Kitty Cards / 喵喵牌:** play number cards into coloured cups, doubling
  points for a matching colour. The partner replies with its strongest available
  move. Advanced mode adds a one-use shield and an opponent nudge. All twelve
  cups must be filled before scoring the match.
  Advanced play gives each side two tactic charges: redraw a selected hand card,
  boost an owned cup by two (cap eight), or rotate an occupied cup's colour.
  Use them before number-card placement. Shields stop enemy colour changes;
  the partner chooses tactics that improve its score advantage.
- **Date story / 约会故事:** three choices lead to two original endings, with
  different partner dialogue. Replay from **New session** to collect both endings.
- **Photo studio / 拍照馆:** choose any of the partner's five artworks, then adjust
  lighting, frame, sticker, close-up, and
  portrait crop by dragging or using the arrow keys. Save up to twelve snapshots;
  thumbnails recreate their settings and **Download PNG** exports a local portrait
  composition with attribution. Export requires a loaded portrait and browser
  permission to read its pixels; a local server supports this reliably.
- **Quality time / 专属陪伴:** a 1-, 5-, or 15-minute visible-page timer for
  studying, working, or taking a break together. It can run beside the optional
  character video and pauses when the page or date view is hidden.

Date keepsakes are saved per partner: five plushies, one Kitty badge, two story
endings, and completed focus sessions. A newly collected keepsake, the first
snapshot, or the first focus session awards two affinity points. Repeating the
same collection does not award affinity again. These records use
`love-deepspace-dates-v1` and share the existing character affinity. Live sessions
restart on reload; collections remain saved, or stay in memory if storage is blocked.

Under **Missions**, **Action · Starbond Hunt** is the default mode. Move with WASD or the arrow keys,
hold J to fire at the nearest enemy, press Space to dodge, and press E when the
Evol gauge fills. You can also hold the mouse inside the arena to aim and fire.
On touch screens, drag the movement joystick while holding Fire. Fight two
enemy waves and a Wanderer boss within 65 seconds. Attack warnings, charging
enemies, boss projectile fans, perfect-dodge slow motion, damage numbers, and
partner skill cut-ins provide live feedback. Each partner has a different skill:
lightblade, healing ice, lingering flame, energy siphon, or gravity control.
Optional synthesized sound starts only when enabled.

Press P or Escape to pause. Leaving the arena, closing the drawer, switching
modes, and changing characters stop its animation loop. A hidden page pauses
without advancing the mission clock; resume explicitly when you return.
Winning earns route stars and the selected partner's memory. The best stars
remain saved across both modes, and the original strategy turn records remain
separate from the arena score.

In **Strategy · Starbond Relay**, match the highlighted encounter counter to
build a resonance streak and charge
your partner's Evol skill. Three matches charge the skill; using it spends a
turn. Recovery restores energy and also spends a turn. A quiet moment adds
trust once per mission. Reach the route's resonance target with energy above
zero and trust at least 24; switching partners restarts the current mission.

Each of the five partners can earn four route memories, for 20 total. The
memory album, affinity, selected partner, campaign unlocks, and best stars are
saved in the browser. Missions themselves restart on page reload. Blocked
browser storage falls back to session progress. The layout supports narrow
screens and both themes, and respects the motion setting and reduced-motion
preference. Closing or switching away from the game stops its video and combat.

Run `node tools/harness/cases-love-deepspace.js` for the focused dates, combat, turn,
save, memory, and media lifecycle checks. These cover full arena clears for all
five partners on all four routes, claw timing, seeded card matches, saved photos,
both story branches, pause/resume, held inputs, and collection rewards.
Run `node tools/verify-game.js --isolated game-love-deepspace` for its registry
and translation checks.

## Game checks and future ideas

Run `node tools/pet-harness.js` for the shared gameplay and regression checks,
and `node tools/static-checks.js` for page wiring, translation and level checks.

[GAME_BUG_AUDIT.md](GAME_BUG_AUDIT.md) records the verified bugs, fixes and checks.

[GAME_IDEAS.md](GAME_IDEAS.md) contains 24 new concepts across sport, combat, diplomacy,
survival, communication, narrative and cooperative play, with a small first
version for each.
