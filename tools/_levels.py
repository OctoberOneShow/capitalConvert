# -*- coding: utf-8 -*-
# Batch-fifteen level expansion: +2 levels per campaign across 25 games.
import io

def patch(path, old, new, count=1):
    s = io.open(path, encoding="utf-8").read()
    n = s.count(old)
    assert n == count, (path, old[:60], n)
    s = s.replace(old, new)
    io.open(path, "w", encoding="utf-8", newline="").write(s)
    print("ok", path, old[:40].replace("\n", " "))

# --- memory: two bigger rungs (pool has 12 glyphs) ---
patch("assets/app/game-memory.js",
      '    { pairs: 10, cols: 5 },\n  ];',
      '    { pairs: 10, cols: 5 },\n    { pairs: 11, cols: 6 },\n    { pairs: 12, cols: 6 },\n  ];')

# --- spot the diff: two tougher rungs ---
patch("assets/app/game-spot-diff.js",
      '    { diffs: 5, caseFlips: true, homoglyphs: true },\n  ];',
      '    { diffs: 5, caseFlips: true, homoglyphs: true },\n    { diffs: 6, caseFlips: true, homoglyphs: true },\n    { diffs: 7, caseFlips: true, homoglyphs: true },\n  ];')

# --- lights: two darker shuffles ---
patch("assets/app/game-lights.js",
      '    { presses: 14 },\n  ];',
      '    { presses: 14 },\n    { presses: 16 },\n    { presses: 19 },\n  ];')

# --- ink beat: two faster tracks ---
patch("assets/app/game-ink-beat.js",
      '    { id: "t6", labelKey: "beatL6", bpm: 152, bars: 18, seed: 97, density: [0.105, 0.07, 0.11, 0.045] },\n  ];',
      '    { id: "t6", labelKey: "beatL6", bpm: 152, bars: 18, seed: 97, density: [0.105, 0.07, 0.11, 0.045] },\n    { id: "t7", labelKey: "beatL7", bpm: 164, bars: 18, seed: 113, density: [0.11, 0.075, 0.12, 0.05] },\n    { id: "t8", labelKey: "beatL8", bpm: 176, bars: 20, seed: 131, density: [0.115, 0.08, 0.13, 0.055] },\n  ];')

# --- ink slash: two tighter rounds ---
patch("assets/app/game-ink-slash.js",
      '    { id: "s6", labelKey: "slashL6", target: 1800, timeS: 35, spawnMs: 600, bomb: 0.2 },\n  ];',
      '    { id: "s6", labelKey: "slashL6", target: 1800, timeS: 35, spawnMs: 600, bomb: 0.2 },\n    { id: "s7", labelKey: "slashL7", target: 2200, timeS: 32, spawnMs: 540, bomb: 0.22 },\n    { id: "s8", labelKey: "slashL8", target: 2600, timeS: 30, spawnMs: 500, bomb: 0.24 },\n  ];')

# --- breakout: two encore walls (world 2) ---
patch("assets/app/game-breakout.js",
      '    { id: "x5", world: 2, labelKey: "brkL15", speed: 2.85, rows: ["t.gx.xgt", "g.x..x.g", "gx.nn.xg", "g.x..x.g", "tgx.x.gt"] },\n  ];',
      '    { id: "x5", world: 2, labelKey: "brkL15", speed: 2.85, rows: ["t.gx.xgt", "g.x..x.g", "gx.nn.xg", "g.x..x.g", "tgx.x.gt"] },\n    { id: "x6", world: 2, labelKey: "brkL16", speed: 2.9, rows: ["x..n..x.", ".n.g.g.n", "x..t..x.", ".g.n.g.n", "x..n..x."] },\n    { id: "x7", world: 2, labelKey: "brkL17", speed: 2.95, rows: ["nnxnnxnn", "........", "gxnnnxng", "........", "nxn..nxn"] },\n  ];')

# --- serpent: two more houses ---
patch("assets/app/game-snake.js",
      '    { id: "h10", labelKey: "snkL10", goal: 13, starTimes: [48, 66, 90], wrap: true, walls: [[7, 7, 8, 8], [2, 2, 2, 2], [13, 2, 13, 2], [2, 13, 2, 13], [13, 13, 13, 13]] },\n  ];',
      '    { id: "h10", labelKey: "snkL10", goal: 13, starTimes: [48, 66, 90], wrap: true, walls: [[7, 7, 8, 8], [2, 2, 2, 2], [13, 2, 13, 2], [2, 13, 2, 13], [13, 13, 13, 13]] },\n    { id: "h11", labelKey: "snkL11", goal: 14, starTimes: [52, 72, 98], wrap: false, walls: [[5, 0, 5, 5], [5, 7, 5, 15], [10, 0, 10, 5], [10, 7, 10, 15]] },\n    { id: "h12", labelKey: "snkL12", goal: 15, starTimes: [56, 78, 105], wrap: true, walls: [[7, 3, 7, 5], [7, 10, 7, 12], [3, 7, 5, 7], [10, 7, 12, 7]] },\n  ];')

# --- ember dice: two steeper tables ---
patch("assets/app/game-ember-dice.js",
      '    { id: "t5", labelKey: "diceTable5", ruleKey: "diceRule5", target: 120, burn: [1, 6], tax: 5, pairs: true },\n  ];',
      '    { id: "t5", labelKey: "diceTable5", ruleKey: "diceRule5", target: 120, burn: [1, 6], tax: 5, pairs: true },\n    { id: "t6", labelKey: "diceTable6", ruleKey: "diceRule6", target: 140, burn: [1], tax: 5, pairs: true },\n    { id: "t7", labelKey: "diceTable7", ruleKey: "diceRule7", target: 160, burn: [1, 6], tax: 5, pairs: true },\n  ];')

# --- ink cascade: two deeper pools ---
patch("assets/app/game-ink-cascade.js",
      '    { id: "p10", labelKey: "inkL10", target: 2300, moves: 14 },\n  ];',
      '    { id: "p10", labelKey: "inkL10", target: 2300, moves: 14 },\n    { id: "p11", labelKey: "inkL11", target: 2450, moves: 13 },\n    { id: "p12", labelKey: "inkL12", target: 2600, moves: 13 },\n  ];')

# --- bubble ink: two last springs ---
patch("assets/app/game-bubble-ink.js",
      '    { id: "w10", labelKey: "bubL10", target: 940, shots: 20, colors: 6, rows: 8, starGain: [1.4, 1.2, 1] },\n  ];',
      '    { id: "w10", labelKey: "bubL10", target: 940, shots: 20, colors: 6, rows: 8, starGain: [1.4, 1.2, 1] },\n    { id: "w11", labelKey: "bubL11", target: 980, shots: 18, colors: 6, rows: 8, starGain: [1.4, 1.2, 1] },\n    { id: "w12", labelKey: "bubL12", target: 1020, shots: 16, colors: 6, rows: 8, starGain: [1.4, 1.2, 1] },\n  ];')

# --- peg splash: two summit boards ---
patch("assets/app/game-peg-splash.js",
      '    { id: "b8", labelKey: "pegL8", balls: 7, orange: 18, bucketSpeed: 180, seed: 173 },\n  ];',
      '    { id: "b8", labelKey: "pegL8", balls: 7, orange: 18, bucketSpeed: 180, seed: 173 },\n    { id: "b9", labelKey: "pegL9", balls: 7, orange: 19, bucketSpeed: 190, seed: 191 },\n    { id: "b10", labelKey: "pegL10", balls: 6, orange: 20, bucketSpeed: 200, seed: 197 },\n  ];')

# --- glyph raid: two final waves ---
patch("assets/app/game-glyph-raid.js",
      '    { id: "v8", labelKey: "raidL8", rows: 6, cols: 10, stepMs: 350, dropMs: 720, starTimes: [96, 126, 160] },\n  ];',
      '    { id: "v8", labelKey: "raidL8", rows: 6, cols: 10, stepMs: 350, dropMs: 720, starTimes: [96, 126, 160] },\n    { id: "v9", labelKey: "raidL9", rows: 6, cols: 10, stepMs: 320, dropMs: 650, starTimes: [104, 136, 172] },\n    { id: "v10", labelKey: "raidL10", rows: 6, cols: 10, stepMs: 290, dropMs: 580, starTimes: [112, 146, 184] },\n  ];')

# --- glyph leap: two more ascents ---
patch("assets/app/game-glyph-leap.js",
      '    { id: "h8", labelKey: "leapL8", goal: 5600, gapMin: 74, gapMax: 92, moving: 0.4, spring: 0.15, starTimes: [70, 98, 130] },\n  ];',
      '    { id: "h8", labelKey: "leapL8", goal: 5600, gapMin: 74, gapMax: 92, moving: 0.4, spring: 0.15, starTimes: [70, 98, 130] },\n    { id: "h9", labelKey: "leapL9", goal: 6200, gapMin: 76, gapMax: 92, moving: 0.42, spring: 0.15, starTimes: [76, 106, 140] },\n    { id: "h10", labelKey: "leapL10", goal: 6800, gapMin: 78, gapMax: 92, moving: 0.44, spring: 0.16, starTimes: [82, 114, 150] },\n  ];')

# --- glyph echo: two longer songs ---
patch("assets/app/game-glyph-echo.js",
      '    { id: "c6", labelKey: "echoL6", goal: 9, stepMs: 320 },\n  ];',
      '    { id: "c6", labelKey: "echoL6", goal: 9, stepMs: 320 },\n    { id: "c7", labelKey: "echoL7", goal: 10, stepMs: 280 },\n    { id: "c8", labelKey: "echoL8", goal: 11, stepMs: 250 },\n  ];')

# --- glyph net: two bigger grids ---
patch("assets/app/game-glyph-net.js",
      '    { id: "n6", labelKey: "netL6", size: 7, starPad: [0, 5, 10] },\n  ];',
      '    { id: "n6", labelKey: "netL6", size: 7, starPad: [0, 5, 10] },\n    { id: "n7", labelKey: "netL7", size: 8, starPad: [0, 5, 10] },\n    { id: "n8", labelKey: "netL8", size: 8, starPad: [0, 6, 11] },\n  ];')

# --- glyph glide: two wider rinks ---
patch("assets/app/game-glyph-glide.js",
      '    { id: "i6", labelKey: "glL6", w: 10, h: 8, stars: 3, minPar: 8, maxPar: 18 },\n  ];',
      '    { id: "i6", labelKey: "glL6", w: 10, h: 8, stars: 3, minPar: 8, maxPar: 18 },\n    { id: "i7", labelKey: "glL7", w: 11, h: 9, stars: 4, minPar: 9, maxPar: 19 },\n    { id: "i8", labelKey: "glL8", w: 12, h: 9, stars: 5, minPar: 10, maxPar: 21 },\n  ];')

# --- ink sort: two bigger sets ---
patch("assets/app/game-ink-sort.js",
      '    { id: "q6", labelKey: "sorL6", tubes: 10, colors: 7, shuffle: 50, starMoves: [24, 36, 50] },\n  ];',
      '    { id: "q6", labelKey: "sorL6", tubes: 10, colors: 7, shuffle: 50, starMoves: [24, 36, 50] },\n    { id: "q7", labelKey: "sorL7", tubes: 11, colors: 8, shuffle: 56, starMoves: [28, 42, 58] },\n    { id: "q8", labelKey: "sorL8", tubes: 12, colors: 8, shuffle: 62, starMoves: [32, 46, 62] },\n  ];')

# --- glyph fifteen: two longer walks ---
patch("assets/app/game-glyph-fifteen.js",
      '    { id: "t6", labelKey: "ftL6", grid: 4, walk: 600, starMoves: [110, 180, 300] },\n  ];',
      '    { id: "t6", labelKey: "ftL6", grid: 4, walk: 600, starMoves: [110, 180, 300] },\n    { id: "t7", labelKey: "ftL7", grid: 4, walk: 800, starMoves: [130, 215, 340] },\n    { id: "t8", labelKey: "ftL8", grid: 4, walk: 1000, starMoves: [150, 250, 400] },\n  ];')

# --- glyph sudoku: two sparser ninths ---
patch("assets/app/game-glyph-sudoku.js",
      '    { id: "u6", labelKey: "sudL6", size: 9, bw: 3, bh: 3, clues: 30, starTimes: [210, 340, 540] },\n  ];',
      '    { id: "u6", labelKey: "sudL6", size: 9, bw: 3, bh: 3, clues: 30, starTimes: [210, 340, 540] },\n    { id: "u7", labelKey: "sudL7", size: 9, bw: 3, bh: 3, clues: 26, starTimes: [240, 380, 600] },\n    { id: "u8", labelKey: "sudL8", size: 9, bw: 3, bh: 3, clues: 24, starTimes: [270, 420, 660] },\n  ];')

# --- glyph reversi: two deeper ranks ---
patch("assets/app/game-glyph-reversi.js",
      '    { id: "r6", labelKey: "revL6", noise: 0, depth: 3, starMargin: [8, 4, 2] },\n  ];',
      '    { id: "r6", labelKey: "revL6", noise: 0, depth: 3, starMargin: [8, 4, 2] },\n    { id: "r7", labelKey: "revL7", noise: 0, depth: 4, starMargin: [8, 4, 2] },\n    { id: "r8", labelKey: "revL8", noise: 0, depth: 5, starMargin: [8, 4, 2] },\n  ];')

# --- glyph four: two sharper rivals ---
patch("assets/app/game-glyph-four.js",
      '    { id: "f6", labelKey: "c4L6", depth: 5, noise: 0, starMoves: [6, 8, 11] },\n  ];',
      '    { id: "f6", labelKey: "c4L6", depth: 5, noise: 0, starMoves: [6, 8, 11] },\n    { id: "f7", labelKey: "c4L7", depth: 6, noise: 0, starMoves: [6, 8, 10] },\n    { id: "f8", labelKey: "c4L8", depth: 7, noise: 0, starMoves: [6, 8, 10] },\n  ];')

# --- glyph fleet: two tighter admirals ---
patch("assets/app/game-glyph-fleet.js",
      '    { id: "bf6", labelKey: "fltL6", skill: 5, starShots: [32, 41, 52] },\n  ];',
      '    { id: "bf6", labelKey: "fltL6", skill: 5, starShots: [32, 41, 52] },\n    { id: "bf7", labelKey: "fltL7", skill: 5, starShots: [30, 39, 50] },\n    { id: "bf8", labelKey: "fltL8", skill: 5, starShots: [28, 37, 48] },\n  ];')

# --- prism path: two new boards (verified 2 flips) ---
patch("assets/app/game-prism-path.js",
      '''      starTimes: [26, 40, 58],
    },
  ];''',
      '''      starTimes: [26, 40, 58],
    },
    {
      id: "p7", labelKey: "prismL7", w: 7, h: 7,
      emitter: { x: 0, y: 0, dir: 0 },
      targets: [[1, 0], [3, 1], [5, 3]],
      walls: [[5, 0], [1, 3]],
      mirrors: [
        { x: 3, y: 0, slope: 1 },
        { x: 3, y: 3, s: 0, slope: 0 },
        { x: 6, y: 3, slope: 0 },
      ],
      starTimes: [30, 46, 66],
    },
    {
      id: "p8", labelKey: "prismL8", w: 7, h: 7,
      emitter: { x: 0, y: 5, dir: 0 },
      targets: [[1, 5], [4, 6], [6, 6]],
      walls: [[5, 5], [3, 2]],
      mirrors: [
        { x: 2, y: 5, slope: 1 },
        { x: 2, y: 6, slope: 0 },
      ],
      starTimes: [34, 52, 74],
    },
  ];''')

# --- aurora flow: two new boards (disjoint verified) ---
patch("assets/app/game-aurora-flow.js",
      '''      pairs: [[0, 0, 6, 1], [0, 6, 6, 5], [0, 1, 2, 1], [0, 4, 2, 4], [1, 3, 3, 3], [3, 1, 4, 1], [5, 2, 3, 4], [6, 2, 3, 5]],
      starTimes: [46, 68, 95],
    },
  ];''',
      '''      pairs: [[0, 0, 6, 1], [0, 6, 6, 5], [0, 1, 2, 1], [0, 4, 2, 4], [1, 3, 3, 3], [3, 1, 4, 1], [5, 2, 3, 4], [6, 2, 3, 5]],
      starTimes: [46, 68, 95],
    },
    {
      id: "f7", labelKey: "auroL7", size: 6,
      pairs: [[0, 0, 5, 0], [0, 5, 5, 5], [0, 2, 0, 3], [5, 2, 5, 3]],
      starTimes: [30, 45, 65],
    },
    {
      id: "f8", labelKey: "auroL8", size: 7,
      pairs: [[0, 0, 2, 0], [6, 0, 4, 0], [0, 6, 2, 6], [6, 6, 6, 5], [3, 0, 3, 6]],
      starTimes: [36, 54, 78],
    },
  ];''')

# --- comet golf: two new courses (sweep verified) ---
patch("assets/app/game-comet-golf.js",
      '''      starShots: [2, 3, 6],
    },
  ];''',
      '''      starShots: [2, 3, 6],
    },
    {
      id: "g7", labelKey: "cgfL7",
      tee: { x: 284, y: 300 }, target: { x: 36, y: 84, r: 14 },
      wells: [
        { x: 150, y: 200, m: 1.3, r: 13 },
        { x: 230, y: 120, m: 1.0, r: 11 },
      ],
      starShots: [2, 3, 5],
    },
    {
      id: "g8", labelKey: "cgfL8",
      tee: { x: 36, y: 300 }, target: { x: 160, y: 60, r: 14 },
      wells: [
        { x: 120, y: 160, m: 1.4, r: 13 },
        { x: 220, y: 200, m: 1.2, r: 12 },
        { x: 260, y: 80, m: 0.8, r: 10 },
      ],
      starShots: [2, 3, 4],
    },
  ];''')

# --- starfall: two new sectors (controller verified) ---
patch("assets/app/game-starfall.js",
      '''      starFuel: [26, 17, 9],
    },
  ];''',
      '''      starFuel: [26, 17, 9],
    },
    {
      id: "s7", labelKey: "lantL7", gravity: 100, fuel: 88,
      terrain: [[0, 320], [0.2, 250], [0.45, 330], [0.68, 246], [0.9, 330], [1, 270]],
      pad: { x0: 0.62, x1: 0.74, y: 246 },
      starFuel: [30, 20, 10],
    },
    {
      id: "s8", labelKey: "lantL8", gravity: 108, fuel: 84,
      terrain: [[0, 330], [0.18, 246], [0.4, 330], [0.62, 250], [0.84, 330], [1, 270]],
      pad: { x0: 0.12, x1: 0.26, y: 246 },
      starFuel: [26, 17, 9],
    },
  ];''')

# --- glyph pusher: two new rooms (BFS verified) ---
patch("assets/app/game-glyph-pusher.js",
      '''      id: "k6", labelKey: "sokL6", starMoves: [7, 10, 14],
      map: [
        "########",
        "#      #",
        "# #oo# #",
        "# $  $ #",
        "#   @  #",
        "#      #",
        "########",
      ],
    },
  ];''',
      '''      id: "k6", labelKey: "sokL6", starMoves: [7, 10, 14],
      map: [
        "########",
        "#      #",
        "# #oo# #",
        "# $  $ #",
        "#   @  #",
        "#      #",
        "########",
      ],
    },
    {
      id: "k7", labelKey: "sokL7", starMoves: [9, 13, 18],
      map: [
        "########",
        "#      #",
        "# $  $ #",
        "#  @   #",
        "# oo   #",
        "#      #",
        "########",
      ],
    },
    {
      id: "k8", labelKey: "sokL8", starMoves: [9, 13, 18],
      map: [
        "#########",
        "#   #   #",
        "# $ # o #",
        "#   # $ #",
        "#  @    #",
        "#  oo$  #",
        "#########",
      ],
    },
  ];''')

# --- glyph fleet label note: done above ---

print("all tables patched")
