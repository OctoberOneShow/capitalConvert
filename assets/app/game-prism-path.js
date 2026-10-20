/* Prism Path - The laser-and-mirrors puzzle campaign in the shared game drawer. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  var t = App.t;
  var getElement = App.getElement;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  var createCampaign = App.createCampaign;
  var fillCampaignPicker = App.fillCampaignPicker;
  var starsFor = App.starsFor;
  var prismSize = 320;
  /* dir: 0 right, 1 down, 2 left, 3 up. "/" maps right->up, down->right,
   * left->down, up->left; "\" is the transpose. Mirrors start on the given
   * slope and toggle on click; a board clears when every target glows.
   * Star times are [3-star, 2-star, 1-star] seconds.
   * Rungs 1-8 all fire rightward and never put a target on a mirror cell.
   * p9 fires downward, lights a target that is itself a mirror and stops its
   * last leg on a wall; p10 fires leftward and runs the route back across its
   * own outgoing leg at (5,3), which the trace allows because its guard keys
   * on cell plus direction rather than on the cell alone.
   *
   * Rungs 11-20 are the optics bench: two extra elements join the mirror.
   * `split: true` is a beam splitter - it reflects like a mirror *and* lets
   * the straight beam carry on, so one ray becomes two. `locked: true` is a
   * welded element: it never rotates, so it is a fixed corner the route has
   * to be built around. Every board from p11 on was forged, not guessed -
   * `node tools/prism-forge.js verify` replays the beam over every reachable
   * orientation and proves the deal is unsolved, that some orientation lights
   * every target, that 2-5 flips separate the two, that at most four
   * orientations solve it, and that the solution beam touches each element. */
  var prismLevels = [
    {
      id: "p1", labelKey: "prismL1", w: 5, h: 5,
      emitter: { x: 0, y: 2, dir: 0 },
      targets: [[1, 2], [2, 4]],
      walls: [],
      mirrors: [{ x: 2, y: 2, slope: 1 }],
      starTimes: [8, 15, 25],
    },
    {
      id: "p2", labelKey: "prismL2", w: 6, h: 6,
      emitter: { x: 0, y: 0, dir: 0 },
      targets: [[3, 2], [5, 3]],
      walls: [[4, 1]],
      mirrors: [
        { x: 3, y: 0, slope: 1 },
        { x: 3, y: 3, slope: 1 },
      ],
      starTimes: [14, 22, 34],
    },
    {
      id: "p3", labelKey: "prismL3", w: 6, h: 6,
      emitter: { x: 0, y: 1, dir: 0 },
      targets: [[2, 2], [3, 3], [5, 1]],
      walls: [],
      mirrors: [
        { x: 2, y: 1, slope: 1 },
        { x: 2, y: 3, slope: 0 },
        { x: 4, y: 3, slope: 0 },
        { x: 4, y: 1, slope: 0 },
      ],
      starTimes: [20, 30, 45],
    },
    {
      id: "p4", labelKey: "prismL4", w: 7, h: 7,
      emitter: { x: 0, y: 3, dir: 0 },
      targets: [[2, 3], [5, 6]],
      walls: [[4, 3], [1, 1]],
      mirrors: [
        { x: 3, y: 3, slope: 1 },
        { x: 3, y: 6, slope: 1 },
      ],
      starTimes: [16, 26, 40],
    },
    {
      id: "p5", labelKey: "prismL5", w: 7, h: 7,
      emitter: { x: 0, y: 0, dir: 0 },
      targets: [[1, 0], [2, 1], [3, 2], [4, 3], [6, 4]],
      walls: [[5, 0]],
      mirrors: [
        { x: 2, y: 0, slope: 0 },
        { x: 2, y: 2, slope: 0 },
        { x: 4, y: 2, slope: 0 },
        { x: 4, y: 4, slope: 0 },
      ],
      starTimes: [22, 34, 50],
    },
    {
      id: "p6", labelKey: "prismL6", w: 7, h: 7,
      emitter: { x: 0, y: 5, dir: 0 },
      targets: [[1, 5], [3, 6], [6, 6]],
      walls: [[4, 5], [6, 2]],
      mirrors: [
        { x: 2, y: 5, slope: 0 },
        { x: 2, y: 6, slope: 0 },
        { x: 5, y: 1, slope: 0 },
      ],
      starTimes: [26, 40, 58],
    },
    {
      id: "p7", labelKey: "prismL7", w: 7, h: 7,
      emitter: { x: 0, y: 0, dir: 0 },
      targets: [[1, 0], [3, 1], [5, 3]],
      walls: [[5, 0], [1, 3]],
      mirrors: [
        { x: 3, y: 0, slope: 1 },
        { x: 3, y: 3, slope: 0 },
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
    {
      id: "p9", labelKey: "prismL9", w: 7, h: 7,
      emitter: { x: 3, y: 0, dir: 1 },
      targets: [[3, 2], [4, 2], [5, 4], [4, 5], [2, 5], [1, 3]],
      walls: [[2, 2], [1, 1]],
      mirrors: [
        { x: 3, y: 2, slope: 0 },
        { x: 5, y: 2, slope: 1 },
        { x: 5, y: 5, slope: 1 },
        { x: 1, y: 5, slope: 1 },
      ],
      starTimes: [72, 112, 158],
    },
    {
      id: "p10", labelKey: "prismL10", w: 7, h: 7,
      emitter: { x: 6, y: 3, dir: 2 },
      targets: [[5, 3], [3, 5], [2, 5], [1, 3], [3, 1], [5, 5]],
      walls: [[4, 2], [6, 5]],
      mirrors: [
        { x: 4, y: 3, slope: 0 },
        { x: 4, y: 5, slope: 1 },
        { x: 1, y: 5, slope: 1 },
        { x: 1, y: 1, slope: 1 },
        { x: 5, y: 1, slope: 1 },
      ],
      starTimes: [96, 150, 212],
    },
    /* Relay: the first bench board. Four plain mirrors, three targets, and a
     * route that has to double back on itself before it climbs. */
    {
      id: "p11", labelKey: "prismL11", w: 7, h: 7,
      emitter: { x: 4, y: 0, dir: 1 },
      targets: [[3, 4], [2, 3], [3, 0]],
      walls: [[5, 2], [0, 4]],
      mirrors: [
        { x: 3, y: 5, slope: 0 },
        { x: 2, y: 5, slope: 0 },
        { x: 4, y: 2, slope: 0 },
        { x: 2, y: 2, slope: 0 },
      ],
      starTimes: [42, 64, 90],
    },
    /* Kaleidoscope: five mirrors and four targets, one of them sitting on the
     * emitter's own row, so the last leg has to come back down the left edge. */
    {
      id: "p12", labelKey: "prismL12", w: 7, h: 7,
      emitter: { x: 0, y: 4, dir: 0 },
      targets: [[2, 0], [0, 1], [1, 3], [6, 6]],
      walls: [[5, 2], [1, 2], [5, 1]],
      mirrors: [
        { x: 2, y: 4, slope: 0 },
        { x: 0, y: 3, slope: 1 },
        { x: 6, y: 0, slope: 1 },
        { x: 0, y: 0, slope: 1 },
        { x: 2, y: 3, slope: 1 },
      ],
      starTimes: [46, 70, 98],
    },
    /* Split Gate: the first splitter. One ray has to feed two corners of the
     * board, so the branch that carries straight on matters as much as the
     * one that turns. */
    {
      id: "p13", labelKey: "prismL13", w: 8, h: 8,
      emitter: { x: 0, y: 1, dir: 0 },
      targets: [[3, 3], [1, 3], [1, 2], [3, 7]],
      walls: [[6, 4], [6, 3], [5, 0]],
      mirrors: [
        { x: 3, y: 2, slope: 1, split: true },
        { x: 2, y: 5, slope: 1 },
        { x: 1, y: 1, slope: 1 },
        { x: 1, y: 5, slope: 0 },
        { x: 2, y: 2, slope: 1 },
      ],
      starTimes: [50, 76, 106],
    },
    /* Twin Beam: six elements and a splitter down on the emitter's own row,
     * which is the only way to reach the far top-right target. */
    {
      id: "p14", labelKey: "prismL14", w: 8, h: 8,
      emitter: { x: 0, y: 6, dir: 0 },
      targets: [[5, 5], [1, 3], [7, 1], [4, 0]],
      walls: [[4, 6], [6, 3], [3, 4], [4, 1]],
      mirrors: [
        { x: 3, y: 3, slope: 1 },
        { x: 3, y: 0, slope: 0 },
        { x: 7, y: 5, slope: 1 },
        { x: 3, y: 5, slope: 0 },
        { x: 7, y: 0, slope: 0 },
        { x: 3, y: 6, slope: 0, split: true },
      ],
      starTimes: [54, 82, 114],
    },
    /* Cascade: two splitters and five targets. The beam forks twice, so the
     * board reads as a tree rather than a single line. */
    {
      id: "p15", labelKey: "prismL15", w: 8, h: 8,
      emitter: { x: 0, y: 6, dir: 0 },
      targets: [[3, 1], [2, 7], [6, 7], [5, 1], [7, 5]],
      walls: [[5, 4], [7, 0], [0, 2], [2, 0]],
      mirrors: [
        { x: 7, y: 7, slope: 1, split: true },
        { x: 1, y: 6, slope: 1 },
        { x: 7, y: 3, slope: 0 },
        { x: 2, y: 3, slope: 0 },
        { x: 2, y: 1, slope: 1, split: true },
        { x: 1, y: 7, slope: 0 },
      ],
      starTimes: [58, 88, 122],
    },
    /* Bolted Rig: the first welded element. The mirror at (2,7) is bolted
     * down, so the whole bottom-left corner of the route is forced. */
    {
      id: "p16", labelKey: "prismL16", w: 9, h: 9,
      emitter: { x: 6, y: 8, dir: 3 },
      targets: [[2, 2], [8, 1], [5, 3], [6, 5], [2, 5]],
      walls: [[8, 8], [5, 1], [0, 0], [5, 0]],
      mirrors: [
        { x: 0, y: 3, slope: 1 },
        { x: 2, y: 1, slope: 0 },
        { x: 6, y: 1, slope: 1 },
        { x: 0, y: 1, slope: 0 },
        { x: 6, y: 7, slope: 0, split: true },
        { x: 2, y: 7, slope: 0, locked: true },
      ],
      starTimes: [62, 94, 130],
    },
    /* Labyrinth: seven elements, two splitters, one weld, and a route that
     * bends ten times before the last target lights. */
    {
      id: "p17", labelKey: "prismL17", w: 9, h: 9,
      emitter: { x: 8, y: 2, dir: 2 },
      targets: [[3, 7], [2, 8], [7, 6], [3, 3], [6, 2]],
      walls: [[1, 8], [6, 0], [0, 2], [1, 5], [2, 6]],
      mirrors: [
        { x: 5, y: 5, slope: 0, locked: true },
        { x: 3, y: 2, slope: 0 },
        { x: 3, y: 6, slope: 0 },
        { x: 5, y: 8, slope: 1, split: true },
        { x: 8, y: 6, slope: 1 },
        { x: 8, y: 5, slope: 1 },
        { x: 5, y: 6, slope: 1, split: true },
      ],
      starTimes: [66, 100, 138],
    },
    /* Resonator: six targets off seven elements, two of them welded. The
     * solution beam sweeps thirty-six of the eighty-one cells. */
    {
      id: "p18", labelKey: "prismL18", w: 9, h: 9,
      emitter: { x: 8, y: 3, dir: 2 },
      targets: [[0, 6], [6, 6], [6, 4], [3, 3], [2, 1], [8, 1]],
      walls: [[4, 5], [8, 6], [3, 6], [2, 8], [0, 2]],
      mirrors: [
        { x: 1, y: 4, slope: 1, split: true },
        { x: 0, y: 3, slope: 0 },
        { x: 7, y: 6, slope: 1 },
        { x: 0, y: 5, slope: 0, split: true },
        { x: 1, y: 5, slope: 1, locked: true },
        { x: 1, y: 1, slope: 1 },
        { x: 7, y: 4, slope: 0, locked: true },
      ],
      starTimes: [70, 106, 146],
    },
    /* Star Chamber: eight elements, two welded, and a launch from the bottom
     * edge that has to fan out to all four corners. */
    {
      id: "p19", labelKey: "prismL19", w: 9, h: 9,
      emitter: { x: 6, y: 8, dir: 3 },
      targets: [[0, 4], [4, 4], [4, 6], [1, 7], [5, 0], [8, 0]],
      walls: [[7, 4], [7, 2], [8, 8], [4, 1], [5, 5], [8, 6]],
      mirrors: [
        { x: 1, y: 8, slope: 0, locked: true },
        { x: 2, y: 2, slope: 0 },
        { x: 4, y: 3, slope: 0 },
        { x: 4, y: 8, slope: 1 },
        { x: 1, y: 2, slope: 1 },
        { x: 2, y: 0, slope: 0, split: true },
        { x: 6, y: 4, slope: 0, split: true },
        { x: 6, y: 3, slope: 1, locked: true },
      ],
      starTimes: [78, 118, 162],
    },
    /* Aurora Engine: the last bench. Three splitters, two welds, eight
     * elements, and exactly one orientation out of sixty-four that lights
     * all six targets. */
    {
      id: "p20", labelKey: "prismL20", w: 9, h: 9,
      emitter: { x: 0, y: 4, dir: 0 },
      targets: [[1, 8], [5, 3], [4, 1], [6, 2], [7, 2], [5, 0]],
      walls: [[8, 7], [2, 3], [2, 2], [1, 6], [1, 0], [4, 6]],
      mirrors: [
        { x: 5, y: 5, slope: 1, locked: true },
        { x: 4, y: 5, slope: 0 },
        { x: 4, y: 0, slope: 0 },
        { x: 7, y: 8, slope: 1 },
        { x: 7, y: 4, slope: 1, split: true },
        { x: 7, y: 0, slope: 0, locked: true },
        { x: 4, y: 4, slope: 0, split: true },
        { x: 5, y: 2, slope: 1, split: true },
      ],
      starTimes: [88, 132, 180],
    },
  ];
  /* "/" is slope 1, "\" is slope 0. */
  var SLOPE_SLASH = 1;
  var SLOPE_BACK = 0;
  var REFLECT = {
    0: { 1: 3, 0: 1 },
    1: { 1: 0, 0: 2 },
    2: { 1: 1, 0: 3 },
    3: { 1: 2, 0: 0 },
  };
  var STEP_X = [1, 0, -1, 0];
  var STEP_Y = [0, 1, 0, -1];

  function initPrismPathGame() {
    var canvas = getElement("prisCanvas");
    var goalsEl = getElement("prisGoals");
    var movesEl = getElement("prisMoves");
    var timeEl = getElement("prisTime");
    var resultEl = getElement("prisResult");
    var startBtn = getElement("prisNewBtn");
    var bestEl = getElement("prisBest");
    var selectEl = getElement("prisLevelSel");
    if (
      !canvas ||
      !goalsEl ||
      !movesEl ||
      !timeEl ||
      !resultEl ||
      !startBtn ||
      !bestEl ||
      !selectEl
    ) {
      return;
    }

    var ctx = canvas.getContext("2d");
    var campaign = createCampaign({ key: "prism-path-campaign", levels: prismLevels });
    var level = prismLevels[0];
    var cellSize = 0;
    var boardW = 0;
    var boardH = 0;
    var mirrors = [];
    var litTargets = {};
    /* One polyline per branch: a splitter hands the beam to two branches, and
     * each branch keeps its own route from the emitter for the draw pass. */
    var beamPaths = [];
    var moves = 0;
    var solved = false;
    var cursor = { x: 0, y: 0 };
    var rafId = null;
    var startedAt = 0;
    var clockRunning = false;

    function keyAt(x, y) {
      return x + "," + y;
    }

    function mirrorAt(x, y) {
      for (var index = 0; index < mirrors.length; index += 1) {
        if (mirrors[index].x === x && mirrors[index].y === y) {
          return mirrors[index];
        }
      }
      return null;
    }

    function isWall(x, y) {
      return level.walls.some(function (wall) {
        return wall[0] === x && wall[1] === y;
      });
    }

    function isTarget(x, y) {
      return level.targets.some(function (target) {
        return target[0] === x && target[1] === y;
      });
    }

    function renderHud() {
      movesEl.textContent = String(moves);
      goalsEl.textContent =
        level.targets.filter(function (target) {
          return litTargets[keyAt(target[0], target[1])];
        }).length + "/" + level.targets.length;
      timeEl.textContent = clockRunning
        ? ((Date.now() - startedAt) / 1000).toFixed(1) + "s"
        : timeEl.textContent;
    }

    /* Trace the beam through the current optics. A mirror bends the ray; a
     * splitter bends it *and* lets it carry straight on, so the trace walks a
     * queue of branches. The guard keys on cell plus direction, so a route may
     * cross its own earlier leg - but never ray the same cell the same way
     * twice, which is what would loop forever. */
    function traceBeam() {
      litTargets = {};
      beamPaths = [];
      var seen = {};
      var queue = [{
        x: level.emitter.x,
        y: level.emitter.y,
        dir: level.emitter.dir,
        path: [],
      }];
      var guard = 0;
      while (queue.length && guard < 600) {
        guard += 1;
        var ray = queue.shift();
        var x = ray.x + STEP_X[ray.dir];
        var y = ray.y + STEP_Y[ray.dir];
        if (x < 0 || y < 0 || x >= level.w || y >= level.h) {
          if (ray.path.length) {
            beamPaths.push(ray.path);
          }
          continue;
        }
        var stateKey = x + "," + y + "," + ray.dir;
        if (seen[stateKey]) {
          if (ray.path.length) {
            beamPaths.push(ray.path);
          }
          continue;
        }
        seen[stateKey] = true;
        var path = ray.path.concat([{ x: x, y: y }]);
        if (isWall(x, y)) {
          beamPaths.push(path);
          continue;
        }
        if (isTarget(x, y)) {
          litTargets[keyAt(x, y)] = true;
        }
        var mirror = mirrorAt(x, y);
        /* Reaching the emitter ends the branch: the housing absorbs it. */
        if (x === level.emitter.x && y === level.emitter.y) {
          beamPaths.push(path);
          continue;
        }
        var outs = [];
        if (mirror) {
          outs.push(REFLECT[ray.dir][mirror.slope]);
          if (mirror.split) {
            outs.push(ray.dir);
          }
        } else {
          outs.push(ray.dir);
        }
        outs.forEach(function (dir) {
          queue.push({ x: x, y: y, dir: dir, path: path });
        });
      }
    }

    function allLit() {
      return level.targets.every(function (target) {
        return litTargets[keyAt(target[0], target[1])];
      });
    }

    function checkCleared() {
      if (solved || !allLit()) {
        return;
      }
      solved = true;
      clockRunning = false;
      var seconds = Math.max(0.1, (Date.now() - startedAt) / 1000);
      var starsWon = starsFor(Math.round(seconds * 10) / 10, level.starTimes, "low");
      var outcome = campaign.record(level.id, {
        stars: starsWon,
        best: Math.round(seconds * 10) / 10,
        better: "low",
      });
      var message = t("prismCleared", { s: seconds.toFixed(1), stars: starsWon });
      if (outcome.isBest) {
        message += " " + t("newBest");
      }
      if (outcome.unlockedNext) {
        message += " " + t("prismNextBoard");
      } else if (campaign.clearedCount() === prismLevels.length) {
        message += " " + t("prismCampaignDone");
      }
      logAction(t("logPrismPath", { n: level.targets.length }));
      var rect = startBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      var nextId = outcome.unlockedNext || level.id;
      loadLevel(prismLevels[campaign.indexOf(nextId)]);
      resultEl.textContent = message;
    }

    function rotateAt(x, y) {
      var mirror = mirrorAt(x, y);
      if (!mirror || solved) {
        return;
      }
      /* A welded element is bolted to the bench: say so instead of counting a
       * move the player cannot make. */
      if (mirror.locked) {
        resultEl.textContent = t("prismWelded");
        return;
      }
      mirror.slope = mirror.slope === SLOPE_SLASH ? SLOPE_BACK : SLOPE_SLASH;
      moves += 1;
      if (!clockRunning) {
        clockRunning = true;
        startedAt = Date.now();
      }
      traceBeam();
      renderHud();
      draw();
      checkCleared();
    }

    function loadLevel(levelDef) {
      level = levelDef;
      cellSize = Math.floor(Math.min(
        (prismSize - 16) / level.w,
        (prismSize - 16) / level.h,
      ));
      boardW = cellSize * level.w;
      boardH = cellSize * level.h;
      mirrors = level.mirrors.map(function (mirror) {
        return {
          x: mirror.x,
          y: mirror.y,
          slope: mirror.slope,
          split: !!mirror.split,
          locked: !!mirror.locked,
        };
      });
      moves = 0;
      solved = false;
      cursor = { x: level.emitter.x, y: level.emitter.y };
      clockRunning = false;
      startedAt = Date.now();
      traceBeam();
      renderHud();
      refreshPicker();
      startLoop();
      draw();
      resultEl.textContent = t("prismReady", { n: level.targets.length }) + benchHint();
    }

    /* The bench boards carry elements the first ten never show, so name them
     * once when the board loads instead of leaving the player to guess. */
    function benchHint() {
      var hint = "";
      if (level.mirrors.some(function (mirror) {
        return mirror.split;
      })) {
        hint += " " + t("prismSplitHint");
      }
      if (level.mirrors.some(function (mirror) {
        return mirror.locked;
      })) {
        hint += " " + t("prismLockedHint");
      }
      return hint;
    }

    function centerOf(x, y) {
      return {
        x: (prismSize - boardW) / 2 + x * cellSize + cellSize / 2,
        y: (prismSize - boardH) / 2 + y * cellSize + cellSize / 2,
      };
    }

    function draw() {
      var time = Date.now();
      ctx.clearRect(0, 0, prismSize, prismSize);
      if (App.world) { App.world.backdrop(ctx, prismSize, prismSize, "laboratory"); }
      /* Emitter */
      var emitterCenter = centerOf(level.emitter.x, level.emitter.y);
      ctx.beginPath();
      ctx.arc(emitterCenter.x, emitterCenter.y, cellSize * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = "#ff6b35";
      ctx.shadowColor = "#ff6b35";
      ctx.shadowBlur = 14 + Math.sin(time / 260) * 4;
      ctx.fill();
      ctx.shadowBlur = 0;
      /* Beam - one pass per branch, so a split route lights both legs. */
      if (beamPaths.length) {
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        var start = centerOf(level.emitter.x, level.emitter.y);
        beamPaths.forEach(function (path) {
          ctx.beginPath();
          ctx.moveTo(start.x, start.y);
          path.forEach(function (point) {
            var center = centerOf(point.x, point.y);
            ctx.lineTo(center.x, center.y);
          });
          ctx.strokeStyle = "rgba(255, 107, 53, 0.35)";
          ctx.lineWidth = Math.max(6, cellSize * 0.34);
          ctx.shadowColor = "#ff6b35";
          ctx.shadowBlur = 18;
          ctx.stroke();
          ctx.strokeStyle = "rgba(0, 242, 255, 0.95)";
          ctx.lineWidth = Math.max(2, cellSize * 0.12);
          ctx.shadowColor = "#00f2ff";
          ctx.shadowBlur = 10;
          ctx.stroke();
          /* Travelling pulse along the beam */
          ctx.setLineDash([cellSize * 0.6, cellSize * 1.8]);
          ctx.lineDashOffset = -(time / 18) % (cellSize * 2.4);
          ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
          ctx.lineWidth = Math.max(1, cellSize * 0.06);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.shadowBlur = 0;
        });
      }
      /* Walls */
      level.walls.forEach(function (wall) {
        var center = centerOf(wall[0], wall[1]);
        ctx.fillStyle = "rgba(148, 163, 184, 0.4)";
        ctx.fillRect(
          center.x - cellSize * 0.38,
          center.y - cellSize * 0.38,
          cellSize * 0.76,
          cellSize * 0.76,
        );
      });
      /* Optics: a mirror is a cyan blade, a splitter is the same blade inside a
       * violet fork, and a welded element of either kind is amber and bolted. */
      mirrors.forEach(function (mirror) {
        var center = centerOf(mirror.x, mirror.y);
        var angle = mirror.slope === SLOPE_SLASH ? -Math.PI / 4 : Math.PI / 4;
        var edge = mirror.locked ? "#fbbf24" : mirror.split ? "#c084fc" : "#22d3ee";
        ctx.save();
        ctx.translate(center.x, center.y);
        if (mirror.split) {
          /* The fork: a diamond body that reads as "two rays leave here". */
          ctx.beginPath();
          ctx.moveTo(0, -cellSize * 0.34);
          ctx.lineTo(cellSize * 0.34, 0);
          ctx.lineTo(0, cellSize * 0.34);
          ctx.lineTo(-cellSize * 0.34, 0);
          ctx.closePath();
          ctx.fillStyle = mirror.locked ? "rgba(251, 191, 36, 0.22)" : "rgba(192, 132, 252, 0.22)";
          ctx.fill();
          ctx.strokeStyle = edge;
          ctx.lineWidth = 1.6;
          ctx.shadowColor = edge;
          ctx.shadowBlur = 8;
          ctx.stroke();
        }
        ctx.rotate(angle);
        ctx.fillStyle = mirror.locked
          ? "rgba(251, 191, 36, 0.26)"
          : mirror.split
            ? "rgba(192, 132, 252, 0.26)"
            : "rgba(34, 211, 238, 0.28)";
        ctx.fillRect(-cellSize * 0.38, -cellSize * 0.1, cellSize * 0.76, cellSize * 0.2);
        ctx.strokeStyle = edge;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = edge;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(-cellSize * 0.38, 0);
        ctx.lineTo(cellSize * 0.38, 0);
        ctx.stroke();
        if (mirror.locked) {
          /* Two bolt heads, drawn unrotated so they read as hardware. */
          ctx.rotate(-angle);
          [-1, 1].forEach(function (side) {
            ctx.beginPath();
            ctx.arc(side * cellSize * 0.28, 0, Math.max(1.2, cellSize * 0.05), 0, Math.PI * 2);
            ctx.fillStyle = "#fbbf24";
            ctx.fill();
          });
        }
        ctx.restore();
        ctx.shadowBlur = 0;
      });
      /* Targets */
      level.targets.forEach(function (target, index) {
        var center = centerOf(target[0], target[1]);
        var lit = litTargets[keyAt(target[0], target[1])];
        ctx.beginPath();
        ctx.arc(center.x, center.y, cellSize * 0.22, 0, Math.PI * 2);
        ctx.fillStyle = lit ? "#a3e635" : "rgba(148, 163, 184, 0.25)";
        ctx.shadowColor = "#a3e635";
        ctx.shadowBlur = lit ? 14 + Math.sin(time / 220 + index) * 5 : 0;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(center.x, center.y, cellSize * 0.33, 0, Math.PI * 2);
        ctx.strokeStyle = lit ? "rgba(163, 230, 53, 0.7)" : "rgba(148, 163, 184, 0.35)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });
      /* Keyboard cursor */
      var cursorCenter = centerOf(cursor.x, cursor.y);
      ctx.beginPath();
      ctx.arc(cursorCenter.x, cursorCenter.y, cellSize * 0.36, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    function frame() {
      if (rafId === null) {
        return;
      }
      /* The glow is decoration: hidden panels keep the slot but skip work. */
      if (document.getElementById("gamePanelPrismPath").hidden || document.hidden) {
        rafId = window.requestAnimationFrame(frame);
        return;
      }
      if (clockRunning) {
        renderHud();
      }
      draw();
      rafId = window.requestAnimationFrame(frame);
    }

    function startLoop() {
      if (rafId !== null) {
        return;
      }
      rafId = window.requestAnimationFrame(frame);
    }

    function stopLoop() {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
    }

    function cellFromEvent(event) {
      var rect = canvas.getBoundingClientRect();
      var scaleX = canvas.width / rect.width;
      var scaleY = canvas.height / rect.height;
      var px = (event.clientX - rect.left) * scaleX;
      var py = (event.clientY - rect.top) * scaleY;
      var x = Math.floor((px - (prismSize - boardW) / 2) / cellSize);
      var y = Math.floor((py - (prismSize - boardH) / 2) / cellSize);
      if (x < 0 || y < 0 || x >= level.w || y >= level.h) {
        return null;
      }
      return { x: x, y: y };
    }

    canvas.addEventListener("pointerdown", function (event) {
      event.preventDefault();
      var cell = cellFromEvent(event);
      if (!cell) {
        return;
      }
      cursor = cell;
      rotateAt(cell.x, cell.y);
    });

    canvas.addEventListener("keydown", function (event) {
      var step = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
      if (step) {
        event.preventDefault();
        cursor.x = Math.min(level.w - 1, Math.max(0, cursor.x + step[0]));
        cursor.y = Math.min(level.h - 1, Math.max(0, cursor.y + step[1]));
        draw();
        return;
      }
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        rotateAt(cursor.x, cursor.y);
      }
    });

    selectEl.addEventListener("change", function () {
      var index = campaign.indexOf(selectEl.value);
      if (index >= 0 && campaign.isUnlocked(selectEl.value)) {
        loadLevel(prismLevels[index]);
      }
    });

    startBtn.addEventListener("click", function () {
      loadLevel(level);
    });

    function refreshPicker() {
      fillCampaignPicker(
        selectEl,
        campaign,
        function (def) {
          return t(def.labelKey);
        },
        t("elementsLocked"),
      );
      selectEl.value = level.id;
      bestEl.textContent = t("campaignStars", {
        n: campaign.totalStars(),
        max: campaign.maxStars(),
      });
    }

    App.quietResetPrismPath = function () {
      clockRunning = false;
      resultEl.textContent = t("prismPaused");
    };

    loadLevel(prismLevels[campaign.indexOf(campaign.nextLevelId())]);
  }


  /* Bilingual copy travels with the game: addStrings only fills keys i18n.js
   * does not already own, so the shared dictionary stays authoritative. */
  App.addStrings({
    en: {
      "prismL9": "Deadfall",
      "prismL10": "Overpass",
      "prismL11": "Relay",
      "prismL12": "Kaleidoscope",
      "prismL13": "Split Gate",
      "prismL14": "Twin Beam",
      "prismL15": "Cascade",
      "prismL16": "Bolted Rig",
      "prismL17": "Labyrinth",
      "prismL18": "Resonator",
      "prismL19": "Star Chamber",
      "prismL20": "Aurora Engine",
      "prismSplitHint": "Violet forks split the beam: one ray turns, one carries straight on.",
      "prismLockedHint": "Amber elements are welded down and never rotate.",
      "prismWelded": "That element is welded to the bench - build the route around it.",
    },
    zh: {
      "prismL9": "落石阱",
      "prismL10": "立交桥",
      "prismL11": "中继",
      "prismL12": "万花筒",
      "prismL13": "分光闸",
      "prismL14": "双生光",
      "prismL15": "叠瀑",
      "prismL16": "铆死机架",
      "prismL17": "光迷宫",
      "prismL18": "共振腔",
      "prismL19": "星室",
      "prismL20": "极光引擎",
      "prismSplitHint": "紫色分光叉会把光束劈成两路：一路转向，一路直穿。",
      "prismLockedHint": "琥珀色元件已被焊死，永远不会转动。",
      "prismWelded": "这个元件焊死在台面上——请绕开它设计光路。",
    },
  });

  /* Exported for the other modules - the table also lets the harness drive
   * every board headlessly and the forge re-verify them. */
  App.initPrismPathGame = initPrismPathGame;
  App.prismLevels = prismLevels;
})(window.CapitalConvert = window.CapitalConvert || {});
