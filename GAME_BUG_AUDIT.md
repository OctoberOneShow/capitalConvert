# Game bug audit

Reviewed the source for all 69 games and the shared drawer, persistence and
campaign plumbing. Verified defects were fixed in the working project while
preserving its existing uncommitted changes. No commits were created.

## Confirmed fixes

| Game or shared component | Problem fixed |
| --- | --- |
| Browser storage / campaign records | Blocked or unavailable storage could abort startup or interrupt scoring. A shared adapter now preserves failed writes for the current session and uses browser persistence when available. |
| Result history | Valid JSON of the wrong shape, including `null`, could stop the startup chain. History is now restricted to a bounded list of strings. |
| Republic Rewind | Choices remained in fixed order despite the guide promising shuffled options. Choices now shuffle independently and retain the correct answer and reveal mapping. |
| Elements | Leaving a timed challenge reset the clock while retaining an advanced world. The world, ink and stroke state now reset with the clock. |
| Memory | A mismatch callback from an abandoned round could unlock or alter a later round. Reshuffling cancels it. |
| Gomoku | Rapid clicks placed extra human stones while the AI reply was pending. Human input now respects turn ownership. |
| Glyph Mines | Flagging could start the clock and place mines before the first dig, defeating first-dig safety. Flagged digs remain idle, and detonated mines keep their highlight. |
| Lights Out | The winning click left the displayed board behind the actual completed board. Completion now repaints it. |
| Traffic Jam | Movement bounds rejected leftward and upward slides. Both directions work again. |
| 2048 | Continuing from a winning board with no legal moves could leave the game frozen. The terminal board is handled. |
| Glyph Reversi | Consecutive forced passes could deadlock play; restarts could receive an old AI reply. Pass state and pending replies now belong to the current round. |
| Glyph Four / Glyph Fleet | Old AI callbacks affected restarted rounds, and closing the drawer could release the turn lock early. Restarts cancel callbacks and drawer closure preserves turn state. |
| Spot the Diff | A slower clear could block progression when a legacy best existed; repeated mistake highlights and old callbacks could persist. Progression and best scores are now independent. |
| Aurora Flow | Ribbons could cross another pair's endpoints or retain an invalid completed route. Endpoint occupancy and restarted ribbons now stay consistent. |
| Glyph Pusher | Finishing a room overwrote the next room's player position with the old room's last move. The next room starts at its declared cell. |
| Glyph Leap | Platforms were generated only once, making the campaign's height goals unreachable. Higher ledges now generate as the camera climbs; fast falls also land on crossed ledges. |
| Ink Cascade | Swaps remained possible after the move budget expired; old cascades survived resets; closing during a pop could award points twice. Budgets, callbacks and scoring now remain consistent. |
| Inkball | A single overlapping ball contact could consume both hit points of a tough brick. Collision penetration is resolved. |
| Glyph Echo / Ink Beat | Restarting retained callbacks from the previous run. Rhythm play also allowed an expired-note backlog to block current hits. |
| Glyph Crossing | Wrapping collapsed vehicle/log spacing, and an old respawn could teleport a restarted frog. Lane spacing and respawn ownership are corrected. |
| Typing Sprint | Delayed timer delivery could accept a completed phrase after the ten-second deadline. Input now checks the deadline directly. |
| Starfall Lander | Held thrust/turn controls and pending respawns could survive leaving or restarting the game. They are cleared at the appropriate lifecycle boundary. |
| Bubble Ink / Peg Splash | Pointer aim used canvas pixels without accounting for the displayed size. Aiming now follows scaled canvases. |
| Arcade animation lifecycle | Several finished or closed rounds retained animation callbacks. Loops now start on play and stop when the round finishes or closes. |
| Lantern Heist | Wait neither spent a turn nor moved guards. It now advances patrols while keeping the player in place. |
| Clockwork Dispatch | Head-on swaps missed crash accounting, train ID zero did not count as occupied, and unsorted timetable entries spawned late. Collision handling and the affected schedules are corrected. |
| Dream Orchestra | Muting left previously scheduled notes sounding. Muting now stops them immediately. |
| Microbe Lab | Keyboard mutations changed the internal traits and point balance without refreshing the display. The HUD updates immediately. |
| Rooftop Radio | A winning scan left the battery display one scan behind. The final scan refreshes it. |
| Neon Drift | Reference calibration skipped required checkpoints on four courses and fell back to guessed star times. All five reference laps now complete, providing measured targets. |
| Ember Delve | The exported stair-distance proof contained an always-true loop condition. Its explicit and default sample counts now terminate. |
| Whisper Deck | English and Chinese guidance described previous-turn echoes while the coherent implemented mechanic chains cards within one turn. Both guides now explain the demonstrated rule. |

## Verification

- The final combined gameplay harness passed **1,445 checks with zero failures**,
  including **191 added regression and smoke checks**.
- The existing structural, translation and level checks passed: **1,701 checks**.
- JavaScript syntax passed for **89 files**: all 85 app modules and four new
  regression case files.
- The registry verifier passed **282 checks** across all 20 registry games.
- New focused suites cover persistence/startup and quiz mapping (**29 checks**),
  puzzle/board gameplay (**41**), arcade gameplay and lifecycle (**70**), and
  registry mechanics (**48**). Three additional Elements checks verify that
  abandoning a run restores the world as well as its clock.
- Authored routes and generated-case invariants were checked for the affected
  puzzles and registry games, including train schedules, heist patrols, unique
  detective clues, connected cave maps and reference racing laps.
- The new cases are registered in `tools/pet-harness.js`, so future runs include
  the regressions alongside the existing checks.

Validation uses the project's headless DOM, controlled clock and audio stubs.
Actual visual rendering, physical touch interaction and audible output remain
unverified: the app browser blocked opening the local file URL.

Run from the project directory:

```text
node tools/pet-harness.js
node tools/static-checks.js
```

## New game directions

[GAME_IDEAS.md](GAME_IDEAS.md) contains 24 proposals with distinct mechanics,
first playable scopes and relative complexity. Three useful starting prototypes
are Morse Rescue, Gravity Badminton and Courtroom of Animals, spanning
communication, sport and narrative argument.
