/* Elements panel - The Elements drawer UI: challenge campaign, palette, canvas rendering, pointer and keyboard painting on top of the sim factory. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  var t = App.t;
  var getElement = App.getElement;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var createElementsSim = App.createElementsSim;
  var petNotifyGame = App.petNotifyGame;
  var elementsBestKey = "elements-best";
  /* v2 adds the per-board star table on top of the v1 {cleared, bests} pair.
   * A v1 record is still read - its bests are re-scored against the current
   * thresholds - and rewritten once in the new shape. */
  var elementsStoreVersion = 2;
  var elementsCols = 80;
  var elementsRows = 56;
  /* One cell is worth `elementsScale` internal canvas pixels: the 80x56 grid
   * renders onto a 320x224 canvas, which the CSS then scales up to the panel
   * width with image-rendering: pixelated. */
  var elementsScale = 4;
  /* The simulation advances one generation per tick, and the clock counts
   * the ticks it actually ran, so time spent hidden is never charged. */
  var elementsTickMs = 50;
  /* The pointer drag paints a 5x5 blob, the keyboard cursor a 3x3 one. */
  var elementsBrush = 2;
  var elementsCursorBrush = 1;
  var elementsMaxSeconds = 3600;
  /* The campaign: free play plus the eleven timed boards, in teaching order.
   * The order is also the unlock chain - a board unlocks when the one before it
   * is cleared, and the elements it introduces unlock with it. `tools` is the
   * palette each board hands out, so a goal cannot simply be painted into
   * existence: Grow only offers water, which is exactly what the growth rule
   * consumes, and Flood keeps stone so a channel above the rim can still be
   * built. `defaultTool` is the brush that board starts with. `budget` is the
   * paint allowance in cells, where 0 means the board rations nothing. `stars`
   * is [3-star, 2-star, 1-star] in seconds; a board with no clock never earns
   * one. */
  var elementsChallenges = [
    {
      id: "free",
      labelKey: "elementsChallengeFree",
      goalKey: "elementsGoalFree",
      limit: 0,
      budget: 0,
      stars: [0, 0, 0],
      defaultTool: "sand",
      tools: [
        "empty",
        "stone",
        "sand",
        "water",
        "plant",
        "fire",
        "wood",
        "ash",
        "oil",
        "lava",
        "ice",
        "steam",
        "acid",
        "seed",
        "smoke",
        "glass",
        "void",
      ],
    },
    {
      id: "grow",
      labelKey: "elementsChallengeGrow",
      goalKey: "elementsGoalGrow",
      limit: 60,
      budget: 0,
      /* The plant drinks one cell per `growEvery` generations and the seed sits
       * 54 cells down, so the climb alone costs 54 x 8 x 50 ms = 21.6 s before
       * a pour can matter. The three-star rung has to clear that floor: a clean
       * run lands just above it, and 24 s leaves a couple of seconds of air. */
      stars: [24, 30, 55],
      defaultTool: "water",
      tools: ["empty", "water"],
    },
    {
      id: "flood",
      labelKey: "elementsChallengeFlood",
      goalKey: "elementsGoalFlood",
      limit: 60,
      budget: 0,
      stars: [20, 40, 60],
      defaultTool: "water",
      tools: ["empty", "stone", "water"],
    },
    {
      id: "extinguish",
      labelKey: "elementsChallengeExtinguish",
      goalKey: "elementsGoalExtinguish",
      limit: 20,
      budget: 0,
      stars: [8, 14, 20],
      defaultTool: "water",
      tools: ["empty", "water"],
    },
    {
      id: "glass",
      labelKey: "elementsChallengeGlass",
      goalKey: "elementsGoalGlass",
      limit: 60,
      budget: 60,
      stars: [15, 25, 45],
      defaultTool: "sand",
      tools: ["empty", "sand"],
    },
    {
      id: "quench",
      labelKey: "elementsChallengeQuench",
      goalKey: "elementsGoalQuench",
      limit: 90,
      budget: 150,
      stars: [25, 40, 65],
      defaultTool: "water",
      tools: ["empty", "water"],
    },
    {
      id: "thaw",
      labelKey: "elementsChallengeThaw",
      goalKey: "elementsGoalThaw",
      limit: 60,
      budget: 24,
      stars: [15, 25, 45],
      defaultTool: "fire",
      tools: ["empty", "fire"],
    },
    {
      id: "spill",
      labelKey: "elementsChallengeSpill",
      goalKey: "elementsGoalSpill",
      limit: 60,
      budget: 48,
      stars: [15, 25, 45],
      defaultTool: "fire",
      tools: ["empty", "fire"],
    },
    {
      id: "etch",
      labelKey: "elementsChallengeEtch",
      goalKey: "elementsGoalEtch",
      limit: 60,
      budget: 300,
      stars: [25, 40, 55],
      defaultTool: "water",
      tools: ["water", "acid"],
    },
    {
      id: "sprout",
      labelKey: "elementsChallengeSprout",
      goalKey: "elementsGoalSprout",
      limit: 90,
      budget: 160,
      stars: [40, 55, 75],
      defaultTool: "water",
      tools: ["water", "fire"],
    },
    {
      id: "geyser",
      labelKey: "elementsChallengeGeyser",
      goalKey: "elementsGoalGeyser",
      limit: 90,
      budget: 200,
      stars: [30, 45, 70],
      defaultTool: "water",
      tools: ["water"],
    },
    {
      id: "grove",
      labelKey: "elementsChallengeGrove",
      goalKey: "elementsGoalGrove",
      limit: 60,
      budget: 60,
      stars: [18, 30, 50],
      defaultTool: "empty",
      tools: ["empty", "water"],
    },
  ];

  /* The base palette every player starts with. The rest of the roster is
   * unlocked by the campaign: an element unlocks the moment the board that
   * introduces it becomes selectable, and glass (which is only ever a goal)
   * unlocks once the last board is cleared. */
  var elementsBasePalette = ["empty", "stone", "sand", "water", "plant", "fire"];
  var elementsUnlockByChallenge = {
    glass: ["lava"],
    quench: ["steam"],
    thaw: ["ice"],
    spill: ["oil"],
    etch: ["acid"],
    sprout: ["wood", "seed", "ash"],
    grove: ["void"],
  };
  var elementsFinalUnlock = "glass";
  function initElements() {
    var panel = getElement("gamePanelElements");
    var canvas = getElement("elementsCanvas");
    var cursorEl = getElement("elementsCursor");
    var descEl = getElement("elementsDescription");
    var selectEl = getElement("elementsChallenge");
    var timeLabel = getElement("elementsTimeLabel");
    var timeEl = getElement("elementsTime");
    var progressEl = getElement("elementsProgress");
    var goalEl = getElement("elementsGoal");
    var resultEl = getElement("elementsResult");
    var bestEl = getElement("elementsBest");
    var starsEl = getElement("elementsStars");
    var startBtn = getElement("elementsStartBtn");
    var resetBtn = getElement("elementsResetBtn");
    var speedEl = getElement("elementsSpeed");
    var legendEl = getElement("elementsLegend");
    var budgetEl = getElement("elementsBudget");
    var pauseBtn = getElement("elementsPauseBtn");
    var stepBtn = getElement("elementsStepBtn");
    var pickBtn = getElement("elementsPickBtn");
    var undoBtn = getElement("elementsUndoBtn");
    if (
      !panel ||
      !canvas ||
      !cursorEl ||
      !descEl ||
      !selectEl ||
      !timeLabel ||
      !timeEl ||
      !progressEl ||
      !goalEl ||
      !resultEl ||
      !bestEl ||
      !starsEl ||
      !startBtn ||
      !resetBtn ||
      !speedEl ||
      !legendEl ||
      !budgetEl ||
      !pauseBtn ||
      !stepBtn ||
      !pickBtn ||
      !undoBtn
    ) {
      return;
    }

    var primaryLabel = startBtn.querySelector("[data-i18n]");
    var pauseLabel = pauseBtn.querySelector("[data-i18n]");
    if (!primaryLabel || !pauseLabel) {
      return;
    }

    var modal = getElement("gameModal");
    var toolButtons = panel.querySelectorAll(".elements-tool");
    var brushButtons = panel.querySelectorAll(".elements-brush");
    var sim = createElementsSim({
      cols: elementsCols,
      rows: elementsRows,
      seed: 20260915,
    });
    var EMPTY = sim.empty;
    var STONE = sim.stone;
    var FIRE = sim.fire;
    var ids = sim.ids;
    /* The palette order, and the only order the number keys follow. Ids 0-5
     * keep the positions they have always had, so 1-6 still mean what they
     * meant before the expansion. */
    var elementOrder = [
      "empty",
      "stone",
      "sand",
      "water",
      "plant",
      "fire",
      "wood",
      "ash",
      "oil",
      "lava",
      "ice",
      "steam",
      "acid",
      "seed",
      "smoke",
      "glass",
      "void",
    ];
    var elementLabelKeys = {
      empty: "elementsEmpty",
      stone: "elementsStone",
      sand: "elementsSand",
      water: "elementsWater",
      plant: "elementsPlant",
      fire: "elementsFire",
      wood: "elementsWood",
      ash: "elementsAsh",
      oil: "elementsOil",
      lava: "elementsLava",
      ice: "elementsIce",
      steam: "elementsSteam",
      acid: "elementsAcid",
      seed: "elementsSeed",
      smoke: "elementsSmoke",
      glass: "elementsGlass",
      void: "elementsVoid",
    };
    /* Which family each element belongs to, for the legend under the palette.
     * The classes are the design document's: a static is never stepped, a
     * powder falls in grains, a liquid falls and flows, a gas rises. */
    var elementClasses = {
      empty: "static",
      stone: "static",
      sand: "powder",
      water: "liquid",
      plant: "static",
      fire: "static",
      wood: "static",
      ash: "powder",
      oil: "liquid",
      lava: "liquid",
      ice: "static",
      steam: "gas",
      acid: "liquid",
      seed: "powder",
      smoke: "gas",
      glass: "static",
      void: "static",
    };
    var classKeys = {
      static: "elementsClassStatic",
      powder: "elementsClassPowder",
      liquid: "elementsClassLiquid",
      gas: "elementsClassGas",
    };
    /* Brush radii, in cells: 1x1, 3x3, 5x5 and 7x7. The 5x5 is the pointer
     * brush the sandbox has always had, so the middle chip is the default. */
    var brushRadii = [0, 1, 2, 3];
    var brushDefault = 2;
    /* Cell colours per theme, indexed by element id, plus the two tints the
     * renderer lays over an empty cell: the target zone a goal is scored in,
     * and the pour zone a board lets the brush work in. Both are washes rather
     * than fills, so the board underneath stays readable, and neither moves, so
     * the canvas looks the same with motion off. Fire is the one id the
     * renderer colours from its own life counter instead of from here. */
    var darkPalette = {
      cells: [
        [9, 12, 20],
        [96, 104, 126],
        [214, 176, 106],
        [58, 146, 226],
        [86, 214, 126],
        [255, 110, 40],
        [138, 96, 52],
        [120, 118, 112],
        [74, 60, 44],
        [226, 86, 26],
        [170, 220, 240],
        [200, 210, 225],
        [150, 220, 60],
        [176, 140, 70],
        [90, 92, 100],
        [190, 220, 230],
        [20, 10, 30],
      ],
      zone: [26, 36, 58],
      pour: [12, 44, 40],
    };
    var lightPalette = {
      cells: [
        [244, 246, 250],
        [128, 136, 154],
        [212, 168, 92],
        [56, 130, 212],
        [46, 168, 96],
        [230, 104, 36],
        [186, 150, 104],
        [150, 148, 142],
        [126, 108, 84],
        [236, 120, 60],
        [196, 232, 248],
        [222, 230, 240],
        [126, 190, 62],
        [196, 166, 96],
        [132, 134, 142],
        [214, 234, 242],
        [64, 52, 84],
      ],
      zone: [219, 229, 243],
      pour: [222, 242, 228],
    };

    var challenge = elementsChallenges[0];
    var activeTool = challenge.defaultTool;
    /* A board that has just been loaded is armed, not running: `runActive`
     * only turns true once the player starts that run - with Start, or with
     * the first paint that changes the grid - and it is the single definition
     * of "the clock is on" for the HUD, the win check and the best time. An
     * armed timed board freezes the world as well, so nothing can happen
     * before the player starts (see `boardArmed` near the loop). */
    var runActive = false;
    var runFinished = false;
    /* The hand controls. `paused` holds the interval stopped while the player
     * looks at a frame; `speed` scales the interval, never the clock; `pick`
     * turns the next click on the grid into an eyedropper; `brushIndex` is the
     * brush the pointer draws with; `strokePainted` counts what the gesture in
     * progress has changed, so a stroke the board refused costs no undo. */
    var paused = false;
    var speed = 1;
    var pick = false;
    var brushIndex = brushDefault;
    var strokePainted = 0;
    /* Whole milliseconds of simulated time: a float second counter rounds just
     * short of the limit, which would leave the clock showing 0.0s while the
     * run is still alive. Only ticks charged to a live run land here. */
    var elapsedMs = 0;
    var intervalId = null;
    var tickCount = 0;
    var cursorX = Math.floor(sim.cols / 2);
    var cursorY = Math.floor(sim.rows / 2);
    var painting = false;
    var lastCell = null;
    var lastLang = "";
    var store = readProgress();
    var cleared = store.cleared;
    var bests = store.bests;
    var stars = store.stars;
    /* What this board hands the brush: the elements it declares that the
     * campaign has unlocked. Grow's water is base kit, so the three original
     * boards offer exactly what they always did. */
    var allowed = boardTools(challenge);
    var canvasCtx = null;
    var offCtx = null;
    var offscreen = null;
    var imageData = null;

    /* --- the campaign's unlock chain --------------------------------- */

    /* Where a board sits in the teaching order. Free play is rung 0 and is
     * never locked; every later board waits on the one before it. */
    function challengeRung(id) {
      var rung = 0;
      var found = -1;
      elementsChallenges.forEach(function (info, index) {
        if (info.id === id) {
          found = index;
        }
      });
      rung = found;
      return rung;
    }

    /* Free play is never locked and Grow is the board the campaign opens
     * with, so the first two rungs are always open; every later board waits on
     * the one before it. There is no stored unlock state: the chain is derived
     * from the clears, so it can never fall out of step with them. */
    function challengeUnlocked(id) {
      var rung = challengeRung(id);
      if (rung <= 1) {
        return true;
      }
      return cleared[elementsChallenges[rung - 1].id] === true;
    }

    /* Every element the player has unlocked so far. The base six are always
     * there; an element arrives with the board that introduces it, so it can
     * be tried out before that board is solved. */
    function unlockedElements() {
      var list = elementsBasePalette.slice();
      elementsChallenges.forEach(function (info) {
        var adds = elementsUnlockByChallenge[info.id];
        if (!adds || !challengeUnlocked(info.id)) {
          return;
        }
        adds.forEach(function (name) {
          if (list.indexOf(name) === -1) {
            list.push(name);
          }
        });
      });
      if (cleared[elementsChallenges[elementsChallenges.length - 1].id] === true) {
        if (list.indexOf(elementsFinalUnlock) === -1) {
          list.push(elementsFinalUnlock);
        }
      }
      return list;
    }

    function boardTools(info) {
      var unlocked = unlockedElements();
      return info.tools.filter(function (name) {
        return unlocked.indexOf(name) !== -1;
      });
    }

    function findChallenge(id) {
      var found = elementsChallenges[0];
      elementsChallenges.forEach(function (info) {
        if (info.id === id) {
          found = info;
        }
      });
      return found;
    }

    function elapsedSeconds() {
      return elapsedMs / 1000;
    }

    function clampBest(value) {
      var parsed = parseFloat(value);
      if (!isFinite(parsed) || parsed <= 0 || parsed > elementsMaxSeconds) {
        return 0;
      }
      return parsed;
    }

    /* The stored progress. The shape is {v, cleared, bests}; anything
     * foreign, truncated or hostile falls back to the defaults instead of
     * throwing, and only known challenge ids are ever accepted. `stale` means
     * the stored text is not in the current shape yet and is rewritten once. */
    function readProgress() {
      var blank = function (stale) {
        return { cleared: {}, bests: {}, stars: {}, stale: stale };
      };
      var raw = null;
      try {
        raw = localStorage.getItem(elementsBestKey);
      } catch (error) {
        return blank(false);
      }
      if (raw === null || raw === undefined) {
        return blank(false);
      }

      var text = String(raw).trim();
      if (!text) {
        return blank(true);
      }

      var parsed = null;
      try {
        parsed = JSON.parse(text);
      } catch (error) {
        return blank(true);
      }
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return blank(true);
      }

      var cleanCleared = {};
      var sourceCleared = parsed.cleared;
      if (sourceCleared && typeof sourceCleared === "object" && !Array.isArray(sourceCleared)) {
        elementsChallenges.forEach(function (info) {
          if (info.limit > 0 && sourceCleared[info.id] === true) {
            cleanCleared[info.id] = true;
          }
        });
      }

      var cleanBests = {};
      var sourceBests = parsed.bests;
      if (sourceBests && typeof sourceBests === "object" && !Array.isArray(sourceBests)) {
        elementsChallenges.forEach(function (info) {
          if (info.limit <= 0) {
            return;
          }
          var value = clampBest(sourceBests[info.id]);
          if (value > 0) {
            cleanBests[info.id] = value;
          }
        });
      }

      /* The star table is never trusted from disk: it is recomputed from the
       * bests against the thresholds the board declares, so re-tuning a par
       * time needs no migration and a hand-edited record cannot invent one. */
      var cleanStars = {};
      var starsAgree = true;
      elementsChallenges.forEach(function (info) {
        if (info.limit <= 0 || !cleanCleared[info.id]) {
          return;
        }
        var earned = starsFor(info.id, cleanBests[info.id]);
        /* A board that was cleared but has no time left in the record (a v1
         * record, or one whose best was dropped as out of range) still earned
         * its first star. */
        if (earned === 0 && !cleanBests[info.id]) {
          earned = 1;
        }
        if (earned > 0) {
          cleanStars[info.id] = earned;
        }
      });
      /* A record whose cached star table disagrees with its own best times is
       * rewritten once, the same way an old version is. */
      var storedStars = parsed.stars;
      if (storedStars && typeof storedStars === "object" && !Array.isArray(storedStars)) {
        Object.keys(cleanStars).forEach(function (key) {
          if (storedStars[key] !== cleanStars[key]) {
            starsAgree = false;
          }
        });
        Object.keys(storedStars).forEach(function (key) {
          if (cleanStars[key] !== storedStars[key]) {
            starsAgree = false;
          }
        });
      }

      return {
        cleared: cleanCleared,
        bests: cleanBests,
        stars: cleanStars,
        stale: parsed.v !== elementsStoreVersion || !starsAgree,
      };
    }

    function writeProgress() {
      try {
        localStorage.setItem(
          elementsBestKey,
          JSON.stringify({
            v: elementsStoreVersion,
            cleared: cleared,
            bests: bests,
            stars: stars,
          }),
        );
      } catch (error) {
        /* no-op: progress stays in memory for this page view */
      }
    }

    function challengeBest(id) {
      var value = bests[id];
      return isFinite(value) && value > 0 ? value : 0;
    }

    /* Stars are a pure function of the best time and the board's par times, so
     * they can be re-read at any moment and never drift from the record. */
    function starsFor(id, best) {
      var info = findChallenge(id);
      var value = parseFloat(best);
      var rungs = 0;
      if (!info || info.limit <= 0 || !isFinite(value) || value <= 0) {
        return 0;
      }
      rungs = info.stars;
      if (value <= rungs[0]) {
        return 3;
      }
      if (value <= rungs[1]) {
        return 2;
      }
      if (value <= rungs[2]) {
        return 1;
      }
      return 0;
    }

    function starGlyphs(count) {
      var out = "";
      var step = 0;
      for (step = 0; step < 3; step += 1) {
        out += step < count ? "\u2605" : "\u2606";
      }
      return out;
    }

    /* --- rendering -------------------------------------------------- */

    /* One ImageData at grid resolution, blitted through an offscreen canvas
     * onto the 320x224 canvas the CSS scales up. Nothing per-cell touches the
     * DOM, so a frame costs one putImageData and one drawImage. */
    function setupCanvas() {
      canvas.width = sim.cols * elementsScale;
      canvas.height = sim.rows * elementsScale;
      canvasCtx = canvas.getContext ? canvas.getContext("2d") : null;
      if (!canvasCtx) {
        return;
      }
      if ("imageSmoothingEnabled" in canvasCtx) {
        canvasCtx.imageSmoothingEnabled = false;
      }
      offscreen = document.createElement("canvas");
      offscreen.width = sim.cols;
      offscreen.height = sim.rows;
      offCtx = offscreen.getContext ? offscreen.getContext("2d") : null;
      if (!offCtx || typeof offCtx.createImageData !== "function") {
        offCtx = null;
        return;
      }
      imageData = offCtx.createImageData(sim.cols, sim.rows);
      if (!imageData || !imageData.data) {
        imageData = null;
      }
    }

    function render() {
      if (!canvasCtx || !offCtx || !imageData) {
        return;
      }
      var light =
        document.documentElement.getAttribute("data-theme") === "light";
      var palette = light ? lightPalette : darkPalette;
      var board = sim.cells;
      var flames = sim.life;
      var target = sim.zone();
      /* The region the brush is allowed in, read once per frame. An empty list
       * is the whole board, which is free play: nothing is tinted. */
      var pours = sim.pourZones();
      var data = imageData.data;
      var cell = 0;
      var x = 0;
      var y = 0;
      var colour = null;
      var offset = 0;
      var heat = 0;
      var shade = 0;
      var inPour = false;
      var step = 0;
      for (cell = 0; cell < board.length; cell += 1) {
        x = cell % sim.cols;
        y = (cell - x) / sim.cols;
        var value = board[cell];
        colour = palette.cells[value] || palette.cells[EMPTY];
        if (value === FIRE) {
          heat = Math.max(0, Math.min(1, flames[cell] / sim.fireLife));
          colour = [255, Math.round(110 + 110 * heat), Math.round(40 + 60 * heat)];
        } else if (
          value === EMPTY &&
          target &&
          x >= target.x0 &&
          x <= target.x1 &&
          y >= target.y0 &&
          y <= target.y1
        ) {
          colour = palette.zone;
        } else if (value === EMPTY && pours.length) {
          inPour = false;
          for (step = 0; step < pours.length; step += 1) {
            if (
              x >= pours[step].x0 &&
              x <= pours[step].x1 &&
              y >= pours[step].y0 &&
              y <= pours[step].y1
            ) {
              inPour = true;
              break;
            }
          }
          if (inPour) {
            colour = palette.pour;
          }
        } else if (value === STONE) {
          shade = ((x * 7 + y * 13) % 15) - 7;
          colour = [colour[0] + shade, colour[1] + shade, colour[2] + shade];
        }
        offset = cell * 4;
        data[offset] = colour[0];
        data[offset + 1] = colour[1];
        data[offset + 2] = colour[2];
        data[offset + 3] = 255;
      }
      offCtx.putImageData(imageData, 0, 0);
      canvasCtx.drawImage(offscreen, 0, 0, canvas.width, canvas.height);
    }

    function renderCursor() {
      cursorEl.style.left = (cursorX / sim.cols) * 100 + "%";
      cursorEl.style.top = (cursorY / sim.rows) * 100 + "%";
      cursorEl.style.width = 100 / sim.cols + "%";
      cursorEl.style.height = 100 / sim.rows + "%";
    }

    /* A concise description of what the grid holds right now, for the
     * canvas's aria-describedby. One pass over the board, not one per
     * element, so a seventeen-element roster costs the same as six did. */
    function renderDescription() {
      var counts = sim.tally();
      var parts = [];
      elementOrder.forEach(function (name) {
        if (name === "empty") {
          return;
        }
        if (counts[ids[name]] > 0) {
          parts.push(counts[ids[name]] + " " + t(elementLabelKeys[name]));
        }
      });
      descEl.textContent = t("elementsDescription", {
        cols: String(sim.cols),
        rows: String(sim.rows),
        counts: parts.length ? parts.join(", ") : t("elementsCountNone"),
      });
    }

    function buildChallengeOptions() {
      var selected = challenge.id;
      selectEl.innerHTML = "";
      elementsChallenges.forEach(function (info) {
        var option = document.createElement("option");
        var open = challengeUnlocked(info.id);
        var earned = starsFor(info.id, challengeBest(info.id));
        option.value = info.id;
        option.textContent =
          t(info.labelKey) +
          (cleared[info.id] ? " \u2713" : "") +
          (earned > 0 ? " " + starGlyphs(earned) : "") +
          (open ? "" : " " + t("elementsLocked"));
        /* A locked board cannot be picked at all: the option is disabled, so
         * neither the pointer nor the keyboard can land on it. */
        option.disabled = !open;
        if (info.id === selected) {
          option.selected = true;
        }
        selectEl.appendChild(option);
      });
      selectEl.value = selected;
    }

    function renderTools() {
      toolButtons.forEach(function (button) {
        var name = button.getAttribute("data-element");
        var offered = allowed.indexOf(name) !== -1;
        button.disabled = !offered;
        button.setAttribute(
          "aria-pressed",
          offered && name === activeTool ? "true" : "false",
        );
        button.classList.toggle("is-active", offered && name === activeTool);
      });
    }

    function selectTool(name) {
      if (allowed.indexOf(name) === -1) {
        return false;
      }
      activeTool = name;
      renderTools();
      renderLegend();
      return true;
    }

    /* What the chosen element is and how it behaves, in one line under the
     * palette. The palette itself is a wall of seventeen chips, so the legend
     * is what keeps it readable. */
    function renderLegend() {
      legendEl.textContent = t("elementsLegend", {
        name: t(elementLabelKeys[activeTool]),
        kind: t(classKeys[elementClasses[activeTool]] || classKeys.static),
      });
    }

    function brushRadius() {
      var radius = brushRadii[brushIndex];
      return isFinite(radius) ? radius : elementsBrush;
    }

    function renderBrushes() {
      brushButtons.forEach(function (button) {
        var size = parseInt(button.getAttribute("data-size"), 10);
        var on = size === brushIndex;
        button.setAttribute("aria-pressed", on ? "true" : "false");
        button.classList.toggle("is-active", on);
      });
    }

    function renderButtons() {
      pauseLabel.setAttribute("data-i18n", paused ? "elementsResume" : "elementsPause");
      pauseLabel.textContent = t(paused ? "elementsResume" : "elementsPause");
      pauseBtn.setAttribute("aria-pressed", paused ? "true" : "false");
      pickBtn.setAttribute("aria-pressed", pick ? "true" : "false");
      stepBtn.disabled = runFinished;
      /* Undo is only offered when there is a stroke to undo. */
      undoBtn.disabled = sim.undoDepth() === 0;
    }

    /* Everything that only moves when the board, the challenge or the
     * language changes. */
    function renderStatic() {
      if (lastLang !== App.currentLang) {
        lastLang = App.currentLang;
        buildChallengeOptions();
        goalEl.textContent = boardGoalText();
      }
      renderBest();
      renderTools();
      renderLegend();
      renderBrushes();
      renderButtons();
      if (runFinished) {
        primaryLabel.textContent = t("btnTryAgain");
      } else if (challenge.limit > 0) {
        primaryLabel.textContent = t("btnStart");
      } else {
        primaryLabel.textContent = t("btnNewGame");
      }
    }

    function renderBest() {
      var best = challengeBest(challenge.id);
      var earned = starsFor(challenge.id, best);
      bestEl.textContent = best
        ? t("bestTime", { s: best.toFixed(1) })
        : t("noBest");
      starsEl.textContent = earned > 0 ? starGlyphs(earned) : "\u2014";
      starsEl.setAttribute(
        "aria-label",
        t("elementsStarsLabel") + " " + starGlyphs(earned),
      );
    }

    /* The goal line. Grow, the zone boards and the quarries print a fraction,
     * the "reduce this to zero" boards print a bare countdown, and the grove
     * prints both halves of its two-part goal. */
    function renderGoalState(state) {
      var kind = sim.goalKind(challenge.id);
      if (kind === "countZero") {
        progressEl.textContent = String(state.value);
        return;
      }
      if (kind === "countZeroPlusMin") {
        progressEl.textContent = t("elementsGroveProgress", {
          kept: String(state.value),
          need: String(state.target),
          fires: String(state.zero),
        });
        return;
      }
      progressEl.textContent =
        state.target > 0 ? state.value + "/" + state.target : "\u2014";
    }

    function renderHud() {
      if (challenge.limit > 0) {
        timeLabel.textContent = t("hudLeft");
        timeEl.textContent =
          Math.max(0, challenge.limit - elapsedSeconds()).toFixed(1) + "s";
      } else {
        timeLabel.textContent = t("hudTime");
        timeEl.textContent = elapsedSeconds().toFixed(1) + "s";
      }
      renderGoalState(sim.progress(challenge.id));
      /* The paint allowance. Zero means the board did not ration the brush,
       * which the sandbox and the first three goals do not, and the HUD says
       * so rather than showing a countdown that will never move. */
      if (sim.ink() > 0) {
        budgetEl.textContent = sim.inkLeft() + "/" + sim.ink();
      } else {
        budgetEl.textContent = t("elementsBudgetUnlimited");
      }
      undoBtn.disabled = sim.undoDepth() === 0;
    }

    /* --- the loop --------------------------------------------------- */

    function boardVisible() {
      return !panel.hidden && !document.hidden && (!modal || !modal.hidden);
    }

    /* A timed board that has been selected, loaded or reset but not yet started
     * is armed. Free play has no limit and is never armed, and neither is a run
     * the player has already begun. */
    function boardArmed() {
      return challenge.limit > 0 && !runActive;
    }

    /* The tick the loop actually runs at: the base tick divided by the speed
     * multiplier. The clock still charges the base tick, so a recorded time
     * measures generations rather than the wall-clock seconds they were run in
     * and a best time means the same thing at every speed. */
    function tickMs() {
      return Math.max(1, Math.round(elementsTickMs / speed));
    }

    function startLoop() {
      if (intervalId !== null || !boardVisible() || paused) {
        return;
      }
      intervalId = window.setInterval(tick, tickMs());
    }

    function stopLoop() {
      if (intervalId === null) {
        return;
      }
      window.clearInterval(intervalId);
      intervalId = null;
    }

    /* The sandbox keeps flowing while its panel is up; a finished challenge
     * stays frozen until the player starts again or resets, and so does a board
     * the player has paused. An armed timed board keeps its loop up too, but
     * every tick it produces advances nothing (see `tick`), so the sandbox is
     * running without the world running away. */
    function syncLoop() {
      if (!boardVisible() || runFinished || paused) {
        stopLoop();
        return;
      }
      startLoop();
    }

    function ensureLoop() {
      if (runFinished || paused) {
        return;
      }
      startLoop();
    }

    /* Changing speed swaps the interval for one at the new tick - the loop is
     * still the same tracked, cleared interval it has always been, never a
     * frame callback and never two intervals at once. */
    function applySpeed() {
      if (intervalId === null) {
        return;
      }
      stopLoop();
      startLoop();
    }

    function setSpeed(next) {
      var parsed = parseFloat(next);
      speed = isFinite(parsed) && parsed > 0 ? parsed : 1;
      applySpeed();
    }

    /* Pause stops the interval; nothing else about the board changes, so the
     * clock and the world are both exactly where the player left them. Because
     * the loop only ever steps a board that is not armed, pausing can never be
     * a way to make a frozen board move either. */
    function setPaused(next) {
      paused = !!next;
      if (paused) {
        stopLoop();
      } else {
        syncLoop();
      }
      renderButtons();
      resultEl.textContent = t(paused ? "elementsPaused" : "elementsResumed");
    }

    /* Free play is already flowing when it is merely loaded, but a timed board
     * is armed and frozen: both its world and its countdown start on the
     * player's first paint that actually changes the grid, so reading the goal
     * costs nothing and a recorded best only ever measures play. A paint the
     * board refuses (a wall, an occupied cell, below the flood board's rim)
     * moves nothing and so starts nothing either. Start remains an explicit go:
     * it reloads the board and begins both at once. */
    function beginRun(painted) {
      if (runFinished) {
        return;
      }
      if (painted > 0 && boardArmed()) {
        runActive = true;
        resultEl.textContent = t("elementsGo");
        renderStatic();
      }
      startLoop();
    }

    /* One tick advances the world by a generation and the stopwatch by one
     * tick - unless the board is armed, when it only redraws the frame. An
     * armed timed board is frozen solid: the hedge cannot burn itself out, the
     * plant cannot climb and the pool cannot level, so idling before the first
     * paint cannot reach a goal, run the clock out or record a best time. Free
     * play has no clock and is never armed, so it keeps evolving while it is
     * merely on screen. */
    function tick() {
      var frozen = boardArmed();
      if (!frozen) {
        advance();
      }
      /* An armed board still redraws, so a theme switch is picked up without
       * the grid having to move. */
      render();
      renderHud();
      if (!frozen && tickCount % 8 === 0) {
        renderDescription();
      }
    }

    /* One generation of world and clock, with the win and the timeout checked
     * against it. Shared by the loop and by Step, so a stepped generation is
     * charged and judged exactly like a looped one. */
    function advance() {
      sim.step();
      tickCount += 1;
      /* Only free play and a live run get this far, so every generation
       * produced is charged to a stopwatch that is actually running. */
      elapsedMs += elementsTickMs;
      if (runActive) {
        if (sim.progress(challenge.id).done) {
          completeRun();
        } else if (challenge.limit > 0 && elapsedMs >= challenge.limit * 1000) {
          expireRun();
        }
      }
    }

    /* Step: one generation on demand while the loop is held. On an armed timed
     * board a step is the go, exactly like the first paint that changes the
     * grid, so the frozen board is never advanced behind the player's back. */
    function stepOnce() {
      if (runFinished) {
        return;
      }
      if (boardArmed()) {
        runActive = true;
        resultEl.textContent = t("elementsGo");
        renderStatic();
      }
      advance();
      render();
      renderHud();
      renderDescription();
    }

    /* --- run lifecycle ---------------------------------------------- */

    /* The goal line. A board that fences the brush in says so here as well as
     * on the canvas, so the note travels with the goal into the status line and
     * a player reading either one is told where painting is allowed. */
    function boardGoalText() {
      var text = t(challenge.goalKey);
      if (sim.pourZones().length > 0) {
        text += " \u00b7 " + t("elementsPourHint");
      }
      return text;
    }

    function loadBoard() {
      /* The allowance belongs to the board, so it is set before the board is
       * laid out - the reload is what refills it. */
      sim.setInk(challenge.budget);
      sim.loadPreset(challenge.id);
      elapsedMs = 0;
      tickCount = 0;
      pick = false;
      strokePainted = 0;
      lastCell = null;
      cursorX = Math.floor(sim.cols / 2);
      cursorY = Math.floor(sim.rows / 2);
      goalEl.textContent = boardGoalText();
      renderCursor();
      render();
      renderHud();
      renderDescription();
    }

    function completeRun() {
      if (!runActive) {
        return;
      }
      var seconds = elapsedSeconds();
      runActive = false;
      runFinished = true;
      stopLoop();

      var best = challengeBest(challenge.id);
      var isBest = seconds > 0 && (best === 0 || seconds < best);
      var changed = false;
      if (isBest) {
        bests[challenge.id] = seconds;
        changed = true;
      }
      if (!cleared[challenge.id]) {
        cleared[challenge.id] = true;
        changed = true;
      }
      /* A clear is also the moment a new board (and with it a new element)
       * comes into reach, so the best, the star and the unlock are all written
       * in the same record. */
      var earned = starsFor(challenge.id, bests[challenge.id]);
      if (earned > (stars[challenge.id] || 0)) {
        stars[challenge.id] = earned;
        changed = true;
      }
      if (changed) {
        writeProgress();
        /* The picker marks cleared challenges, so it has to be rebuilt as
         * soon as one is finished. */
        buildChallengeOptions();
      }

      resultEl.textContent =
        t("elementsWin", { s: seconds.toFixed(1) }) +
        (isBest ? " " + t("newBest") : "");
      logAction(
        t("elementsLog", {
          name: t(challenge.labelKey),
          s: seconds.toFixed(1),
        }),
      );
      petNotifyGame(isBest);
      if (isBest) {
        var rect = canvas.getBoundingClientRect
          ? canvas.getBoundingClientRect()
          : null;
        createConfetti(
          rect ? rect.left + rect.width / 2 : 0,
          rect ? rect.top + rect.height / 2 : 0,
        );
      }
      renderStatic();
      renderHud();
      renderDescription();
    }

    function expireRun() {
      if (!runActive) {
        return;
      }
      runActive = false;
      runFinished = true;
      stopLoop();
      resultEl.textContent = t("elementsTimeUp");
      renderStatic();
      renderHud();
    }

    /* Start / Try Again / New Game: the explicit go. The board is reloaded and
     * a timed challenge's clock begins ticking at once - the player asked for
     * the run, so unlike a board that was merely selected nothing is charged
     * that they did not choose. An explicit go also lifts a pause: starting a
     * board and then not being able to see it move is nobody's idea of start. */
    function startRun() {
      paused = false;
      pick = false;
      loadBoard();
      runActive = challenge.limit > 0;
      runFinished = false;
      resultEl.textContent = runActive
        ? t("elementsGo")
        : boardGoalText();
      renderStatic();
      startLoop();
      if (typeof canvas.focus === "function") {
        canvas.focus();
      }
    }

    /* Reset: reload the board and hand both the world and the clock back frozen
     * at the opening position and the full limit, where they stay until the
     * player paints again. */
    function resetBoard() {
      runActive = false;
      runFinished = false;
      paused = false;
      pick = false;
      loadBoard();
      resultEl.textContent = boardGoalText();
      renderStatic();
      startLoop();
      if (typeof canvas.focus === "function") {
        canvas.focus();
      }
    }

    /* --- input ------------------------------------------------------ */

    function cellAt(clientX, clientY) {
      var rect = canvas.getBoundingClientRect
        ? canvas.getBoundingClientRect()
        : null;
      var left = rect && rect.left ? rect.left : 0;
      var top = rect && rect.top ? rect.top : 0;
      var width = rect && rect.width ? rect.width : canvas.width || 1;
      var height = rect && rect.height ? rect.height : canvas.height || 1;
      var gx = Math.floor(((clientX - left) / width) * sim.cols);
      var gy = Math.floor(((clientY - top) / height) * sim.rows);
      if (!isFinite(gx)) {
        gx = 0;
      }
      if (!isFinite(gy)) {
        gy = 0;
      }
      return {
        x: Math.max(0, Math.min(sim.cols - 1, gx)),
        y: Math.max(0, Math.min(sim.rows - 1, gy)),
      };
    }

    function paintAt(x, y) {
      return sim.paintBlob(x, y, ids[activeTool], brushRadius());
    }

    /* The eyedropper: whatever the player clicks becomes the brush, as long as
     * this board offers it. It paints nothing, so it starts nothing. */
    function pickAt(x, y) {
      var value = sim.get(x, y);
      var name = null;
      elementOrder.forEach(function (candidate) {
        if (ids[candidate] === value) {
          name = candidate;
        }
      });
      pick = false;
      if (name === null || allowed.indexOf(name) === -1) {
        resultEl.textContent = t("elementsPickBlocked");
        renderButtons();
        return false;
      }
      selectTool(name);
      renderButtons();
      resultEl.textContent = t("elementsPicked", {
        name: t(elementLabelKeys[name]),
      });
      return true;
    }

    /* A drag paints every cell between two pointer samples, so a fast swipe
     * leaves a line instead of a dotted trail. It reports how many cells the
     * whole line changed, which is what tells an armed board its run began. */
    function paintLine(from, to) {
      var dx = to.x - from.x;
      var dy = to.y - from.y;
      var steps = Math.max(Math.abs(dx), Math.abs(dy));
      var step = 0;
      var painted = 0;
      if (steps === 0) {
        return paintAt(to.x, to.y);
      }
      for (step = 0; step <= steps; step += 1) {
        painted += paintAt(
          Math.round(from.x + (dx * step) / steps),
          Math.round(from.y + (dy * step) / steps),
        );
      }
      return painted;
    }

    function renderPainted() {
      render();
      renderDescription();
      renderButtons();
    }

    canvas.addEventListener("pointerdown", function (event) {
      if (event.button) {
        return;
      }
      event.preventDefault();
      lastCell = cellAt(event.clientX, event.clientY);
      if (typeof canvas.setPointerCapture === "function" && event.pointerId !== undefined) {
        canvas.setPointerCapture(event.pointerId);
      }
      /* The eyedropper paints nothing, so it neither starts nor charges a run. */
      if (pick) {
        pickAt(lastCell.x, lastCell.y);
        renderPainted();
        return;
      }
      painting = true;
      /* One snapshot per gesture, taken before the first cell of it changes:
       * undo takes back a stroke, not a sample. */
      strokePainted = 0;
      sim.remember();
      strokePainted += paintAt(lastCell.x, lastCell.y);
      beginRun(strokePainted);
      renderPainted();
    });

    canvas.addEventListener("pointermove", function (event) {
      if (!painting) {
        return;
      }
      event.preventDefault();
      var cell = cellAt(event.clientX, event.clientY);
      var painted = paintLine(lastCell || cell, cell);
      lastCell = cell;
      strokePainted += painted;
      beginRun(painted);
      renderPainted();
    });

    ["pointerup", "pointercancel", "pointerleave"].forEach(function (type) {
      canvas.addEventListener(type, function () {
        /* A gesture the board refused every cell of changed nothing, so it
         * should not have cost the player an undo. */
        if (painting && strokePainted === 0) {
          sim.forget();
        }
        painting = false;
        strokePainted = 0;
        lastCell = null;
        renderButtons();
      });
    });

    canvas.addEventListener("keydown", function (event) {
      var key = event.key;
      if (
        key === "ArrowLeft" ||
        key === "ArrowRight" ||
        key === "ArrowUp" ||
        key === "ArrowDown"
      ) {
        event.preventDefault();
        if (key === "ArrowLeft") {
          cursorX = Math.max(0, cursorX - 1);
        } else if (key === "ArrowRight") {
          cursorX = Math.min(sim.cols - 1, cursorX + 1);
        } else if (key === "ArrowUp") {
          cursorY = Math.max(0, cursorY - 1);
        } else {
          cursorY = Math.min(sim.rows - 1, cursorY + 1);
        }
        renderCursor();
        return;
      }
      if (key === " " || key === "Spacebar" || key === "Enter") {
        event.preventDefault();
        if (pick) {
          pickAt(cursorX, cursorY);
          renderPainted();
          return;
        }
        sim.remember();
        var placed = sim.paintBlob(
          cursorX,
          cursorY,
          ids[activeTool],
          elementsCursorBrush,
        );
        if (placed === 0) {
          sim.forget();
        }
        beginRun(placed);
        renderPainted();
        renderButtons();
        return;
      }
      var digit = parseInt(key, 10);
      if (!isNaN(digit) && digit >= 1 && digit <= elementOrder.length) {
        event.preventDefault();
        selectTool(elementOrder[digit - 1]);
      }
    });

    /* The cursor square is the keyboard player's pointer, so it is only on
     * screen while the grid itself has focus. */
    canvas.addEventListener("focus", function () {
      cursorEl.hidden = false;
    });
    canvas.addEventListener("blur", function () {
      cursorEl.hidden = true;
    });

    toolButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        selectTool(button.getAttribute("data-element"));
        ensureLoop();
      });
    });

    brushButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        var size = parseInt(button.getAttribute("data-size"), 10);
        brushIndex = isFinite(size) && size >= 0 && size < brushRadii.length
          ? size
          : brushDefault;
        renderBrushes();
      });
    });

    speedEl.addEventListener("change", function () {
      setSpeed(speedEl.value);
    });

    pauseBtn.addEventListener("click", function () {
      setPaused(!paused);
    });

    stepBtn.addEventListener("click", function () {
      stepOnce();
    });

    pickBtn.addEventListener("click", function () {
      pick = !pick;
      renderButtons();
      resultEl.textContent = pick ? t("elementsPickHint") : boardGoalText();
    });

    /* Undo takes the board back to the snapshot from before the stroke. It
     * does not rewind the clock: the stroke and the generations it was charged
     * for really happened, and a best time should not be rewritable. */
    undoBtn.addEventListener("click", function () {
      if (!sim.undo()) {
        resultEl.textContent = t("elementsUndoEmpty");
        renderButtons();
        return;
      }
      render();
      renderHud();
      renderDescription();
      resultEl.textContent = t("elementsUndone");
    });

    selectEl.addEventListener("change", function () {
      var next = findChallenge(selectEl.value);
      if (next.id === challenge.id) {
        return;
      }
      challenge = next;
      allowed = boardTools(challenge);
      /* A freshly picked board is only armed: it shows its goal and its full
       * limit, and neither the world nor the countdown moves until the player's
       * first paint. */
      runActive = false;
      runFinished = false;
      paused = false;
      pick = false;
      if (allowed.indexOf(activeTool) === -1) {
        selectTool(challenge.defaultTool);
      }
      loadBoard();
      resultEl.textContent = boardGoalText();
      renderStatic();
      startLoop();
    });

    startBtn.addEventListener("click", startRun);
    resetBtn.addEventListener("click", resetBoard);

    function handleVisibility() {
      if (document.hidden) {
        stopLoop();
        return;
      }
      syncLoop();
    }

    document.addEventListener("visibilitychange", handleVisibility);

    /* Leaving the tab (or closing the drawer) abandons the run: the clock goes
     * back to frozen at its full limit and the board to its goal (an armed
     * timed board is frozen anyway), so a run picked up again only starts both
     * on the next paint. A tab switch also lifts a pause, because the board
     * that comes back is presented as a fresh armed one. */
    App.quietResetElements = function () {
      if (runActive || runFinished || intervalId !== null || paused) {
        runActive = false;
        runFinished = false;
        paused = false;
        pick = false;
        elapsedMs = 0;
        resultEl.textContent = boardGoalText();
        renderStatic();
        renderHud();
      }
      syncLoop();
    };

    setupCanvas();
    buildChallengeOptions();
    loadBoard();
    setSpeed(speedEl.value);
    renderStatic();
    cursorEl.hidden = true;
    if (store.stale) {
      writeProgress();
    }
  }

  /* Exported for the other modules. */
  App.initElements = initElements;
})(window.CapitalConvert = window.CapitalConvert || {});
