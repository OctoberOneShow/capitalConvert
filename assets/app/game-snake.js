/* Serpent - The walled-house snake campaign in the shared game drawer. */
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
  var snkCols = 16;
  var snkRows = 16;
  var snkCell = 15;
  var snkField = snkCols * snkCell;
  var snkStartMs = 150;
  var snkMinMs = 70;
  var snkStepMs = 4;
  var snkTau = Math.PI * 2;
  /* Each house is a wall plan plus a length goal and star times
   * [3-star, 2-star, 1-star]. wrap = the side edges are open. */
  var snkLevels = [
    { id: "h1", labelKey: "snkL1", goal: 6, starTimes: [20, 32, 45], wrap: false, walls: [] },
    { id: "h2", labelKey: "snkL2", goal: 7, starTimes: [24, 36, 50], wrap: false, walls: [[6, 0, 6, 12], [10, 3, 10, 15]] },
    { id: "h3", labelKey: "snkL3", goal: 8, starTimes: [26, 40, 55], wrap: false, walls: [[7, 8, 15, 8], [8, 0, 8, 6]] },
    { id: "h4", labelKey: "snkL4", goal: 9, starTimes: [30, 45, 60], wrap: false, walls: [[4, 4, 11, 4], [4, 12, 6, 12], [8, 12, 11, 12], [4, 4, 4, 7], [4, 9, 4, 12], [11, 4, 11, 12]] },
    { id: "h5", labelKey: "snkL5", goal: 8, starTimes: [22, 34, 48], wrap: true, walls: [] },
    { id: "h6", labelKey: "snkL6", goal: 10, starTimes: [34, 48, 65], wrap: false, walls: [[8, 0, 8, 2], [8, 4, 8, 11], [8, 13, 8, 15]] },
    { id: "h7", labelKey: "snkL7", goal: 10, starTimes: [36, 52, 70], wrap: false, start: { x: 4, y: 1, dx: 1 }, walls: [[3, 3, 3, 15], [7, 0, 7, 12], [11, 3, 11, 15], [14, 0, 14, 12]] },
    { id: "h8", labelKey: "snkL8", goal: 11, starTimes: [40, 56, 75], wrap: false, walls: [[0, 4, 5, 4], [10, 4, 15, 4], [0, 11, 5, 11], [10, 11, 15, 11]] },
    { id: "h9", labelKey: "snkL9", goal: 12, starTimes: [44, 62, 85], wrap: false, start: { x: 4, y: 7, dx: 1 }, walls: [[2, 4, 2, 4], [4, 4, 4, 4], [6, 4, 6, 4], [8, 4, 8, 4], [10, 4, 10, 4], [12, 4, 12, 4], [14, 4, 14, 4], [1, 8, 1, 8], [3, 8, 3, 8], [5, 8, 5, 8], [7, 8, 7, 8], [9, 8, 9, 8], [11, 8, 11, 8], [13, 8, 13, 8], [15, 8, 15, 8], [2, 12, 2, 12], [4, 12, 4, 12], [6, 12, 6, 12], [8, 12, 8, 12], [10, 12, 10, 12], [12, 12, 12, 12], [14, 12, 14, 12]] },
    { id: "h10", labelKey: "snkL10", goal: 13, starTimes: [48, 66, 90], wrap: true, walls: [[7, 7, 8, 8], [2, 2, 2, 2], [13, 2, 13, 2], [2, 13, 2, 13], [13, 13, 13, 13]] },
    { id: "h11", labelKey: "snkL11", goal: 14, starTimes: [52, 72, 98], wrap: false, walls: [[5, 0, 5, 5], [5, 7, 5, 15], [10, 0, 10, 5], [10, 7, 10, 15]] },
    { id: "h12", labelKey: "snkL12", goal: 15, starTimes: [56, 78, 105], wrap: true, walls: [[7, 3, 7, 5], [7, 10, 7, 12], [3, 7, 5, 7], [10, 7, 12, 7]] },
  ];

  /* The court takes its tint from the panel hue; the serpent stays jade and the
   * pellet stays ember, so prey, body and hazard never swap identities between
   * houses. Each pair is [head, tail] in hsl triples for the body gradient. */
  var snkSerpentHue = 156;
  var snkFoodHue = 42;
  var snkDangerHue = 4;
  var snkStoneHue = 222;
  var snkSerpentDark = [[156, 80, 62], [172, 58, 26]];
  var snkSerpentLight = [[158, 68, 34], [174, 58, 17]];
  var snkSub = 2;

  function snkClamp(value, low, high) {
    return value < low ? low : value > high ? high : value;
  }

  function snkColor(h, s, l, a) {
    if (a === undefined) {
      return "hsl(" + Math.round(h) + "," + Math.round(s) + "%," + Math.round(l) + "%)";
    }
    return "hsla(" + Math.round(h) + "," + Math.round(s) + "%," + Math.round(l) + "%," + a + ")";
  }

  function snkMix(a, b, k) {
    return snkColor(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k);
  }

  /* One resolved theme: every colour the board paints with, from the panel hue
   * plus the theme attribute. Reading tokens instead of hard-coding a second
   * palette is what keeps this canvas honest when the shell flips to light. */
  function snkPalette(light, hue) {
    var p = {
      light: light,
      hue: hue,
      key: (light ? "l" : "d") + hue,
      serpent: light ? snkSerpentLight : snkSerpentDark,
    };
    if (light) {
      p.fieldTop = snkColor(hue, 32, 87);
      p.fieldLow = snkColor(hue, 26, 72);
      p.lane = "rgba(255, 255, 255, 0.4)";
      p.hair = snkColor(hue, 40, 22, 0.07);
      p.mark = snkColor(hue, 45, 30, 0.26);
      p.kerbFace = snkColor(hue, 22, 56);
      p.kerbLit = "rgba(255, 255, 255, 0.5)";
      p.kerbDeep = snkColor(hue, 26, 32);
      p.kerbInner = snkColor(hue, 30, 24, 0.5);
      p.gate = snkColor(hue, 44, 34, 0.5);
      p.stone = snkColor(snkStoneHue, 12, 58);
      p.stoneLit = snkColor(snkStoneHue, 14, 76);
      p.stoneDeep = snkColor(snkStoneHue, 14, 42);
      p.stoneCap = "rgba(255, 255, 255, 0.45)";
      p.stoneSeam = "rgba(0, 0, 0, 0.24)";
      p.stoneRim = "rgba(0, 0, 0, 0.34)";
      p.stoneShade = "rgba(0, 0, 0, 0.18)";
      p.ink = snkColor(snkSerpentHue, 62, 9, 0.62);
      p.sheen = "rgba(255, 255, 255, 0.34)";
      p.band = "rgba(0, 0, 0, 0.16)";
      p.eye = "#ffffff";
      p.pupil = snkColor(snkSerpentHue, 60, 10);
      p.tongue = snkColor(350, 82, 48);
      p.foodGlow = function (a) {
        return snkColor(snkFoodHue, 96, 52, a);
      };
      p.foodLit = snkColor(snkFoodHue, 98, 68);
      p.foodDeep = snkColor(26, 88, 44);
      p.foodRim = snkColor(24, 70, 26);
      p.foodLeaf = snkColor(120, 44, 38);
      p.foodStem = snkColor(30, 40, 26);
      p.danger = snkColor(2, 76, 46);
      p.dangerDeep = snkColor(2, 60, 26);
      p.vignette = snkColor(hue, 40, 24, 0.16);
    } else {
      p.fieldTop = snkColor(hue, 20, 16);
      p.fieldLow = snkColor(hue, 26, 7);
      p.lane = "rgba(255, 255, 255, 0.03)";
      p.hair = snkColor(hue, 50, 70, 0.045);
      p.mark = snkColor(hue, 70, 82, 0.14);
      p.kerbFace = snkColor(hue, 22, 26);
      p.kerbLit = "rgba(255, 255, 255, 0.22)";
      p.kerbDeep = snkColor(hue, 30, 6);
      p.kerbInner = "rgba(0, 0, 0, 0.6)";
      p.gate = snkColor(hue, 80, 70, 0.42);
      p.stone = snkColor(snkStoneHue, 13, 36);
      p.stoneLit = snkColor(snkStoneHue, 15, 54);
      p.stoneDeep = snkColor(snkStoneHue, 16, 21);
      p.stoneCap = "rgba(255, 255, 255, 0.2)";
      p.stoneSeam = "rgba(0, 0, 0, 0.42)";
      p.stoneRim = "rgba(0, 0, 0, 0.55)";
      p.stoneShade = "rgba(0, 0, 0, 0.42)";
      p.ink = snkColor(snkSerpentHue, 70, 5, 0.9);
      p.sheen = "rgba(255, 255, 255, 0.2)";
      p.band = "rgba(0, 0, 0, 0.22)";
      p.eye = snkColor(snkSerpentHue, 44, 96);
      p.pupil = snkColor(snkSerpentHue, 70, 7);
      p.tongue = snkColor(350, 88, 62);
      p.foodGlow = function (a) {
        return snkColor(snkFoodHue, 98, 62, a);
      };
      p.foodLit = snkColor(snkFoodHue, 100, 78);
      p.foodDeep = snkColor(28, 92, 52);
      p.foodRim = snkColor(20, 80, 32);
      p.foodLeaf = snkColor(120, 46, 46);
      p.foodStem = snkColor(30, 40, 30);
      p.danger = snkColor(snkDangerHue, 90, 62);
      p.dangerDeep = snkColor(snkDangerHue, 70, 28);
      p.vignette = "rgba(0, 0, 0, 0.42)";
    }
    return p;
  }

  /* A rounded rectangle as a path, so the module never depends on the newer
   * ctx.roundRect being present. */
  function snkRoundRect(c, x, y, w, h, r) {
    var rad = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + rad, y);
    c.lineTo(x + w - rad, y);
    c.quadraticCurveTo(x + w, y, x + w, y + rad);
    c.lineTo(x + w, y + h - rad);
    c.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
    c.lineTo(x + rad, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - rad);
    c.lineTo(x, y + rad);
    c.quadraticCurveTo(x, y, x + rad, y);
    c.closePath();
  }

  function snkAncestorPanel(node) {
    var probe = node;
    while (probe) {
      if (probe.classList && probe.classList.contains && probe.classList.contains("game-panel")) {
        return probe;
      }
      probe = probe.parentNode;
    }
    return node ? node.parentNode : null;
  }

  /* The chip around a HUD number, or nothing at all: the bump and warn states are
   * decoration, so a harness without the shipped markup simply skips them. */
  function snkAncestorStat(node) {
    var probe = node ? node.parentNode : null;
    while (probe) {
      if (probe.classList && probe.classList.contains && probe.classList.contains("game-stat")) {
        return probe;
      }
      probe = probe.parentNode;
    }
    return null;
  }

  /* fx positions itself from an element's box, so a canvas game needs a probe it
   * can park on a cell. Fixed positioning keeps the math in viewport pixels,
   * which is what the shared effects write into their own nodes. */
  function snkAnchorNode(documentRef) {
    var node = documentRef.createElement("div");
    node.className = "snk-anchor";
    node.setAttribute("aria-hidden", "true");
    if (documentRef.body) {
      documentRef.body.appendChild(node);
    }
    return node;
  }

  function initSnakeGame() {
    var canvas = getElement("snkCanvas");
    var lengthEl = getElement("snkLength");
    var goalEl = getElement("snkGoalStat");
    var timeEl = getElement("snkTime");
    var resultEl = getElement("snkResult");
    var startBtn = getElement("snkStartBtn");
    var bestEl = getElement("snkBest");
    var selectEl = getElement("snkLevelSel");
    if (
      !canvas ||
      !lengthEl ||
      !goalEl ||
      !timeEl ||
      !resultEl ||
      !startBtn ||
      !bestEl ||
      !selectEl
    ) {
      return;
    }

    var ctx = canvas.getContext("2d");
    var campaign = createCampaign({ key: "serpent-campaign", levels: snkLevels });
    var level = snkLevels[0];
    var wallSet = {};
    var snake = [];
    var dir = { x: 1, y: 0 };
    var nextDir = { x: 1, y: 0 };
    var food = { x: 8, y: 8 };
    var running = false;
    var intervalId = null;
    var tickMs = snkStartMs;
    var startedAt = 0;

    /* -------------------------------------------------------- presentation */
    var panel = snkAncestorPanel(canvas);
    var anchor = snkAnchorNode(document);
    var palette = snkPalette(false, 16);
    var pips = null;
    var pipsRow = document.createElement("div");
    var prevSnake = [];
    var stepAt = 0;
    var frameId = null;
    var revealAt = 0;
    var bite = null;
    var death = null;
    var ratio = 1;
    var court = null;
    var lengthRolling = false;
    var dismissRound = null;
    var shown = false;
    var roundId = 0;
    var lengthChip = snkAncestorStat(lengthEl);

    function motionOff() {
      return App.isMotionOff
        ? App.isMotionOff()
        : document.documentElement.getAttribute("data-motion") === "off";
    }

    function calm() {
      return App.isMotionCalm
        ? App.isMotionCalm()
        : document.documentElement.getAttribute("data-motion") === "calm";
    }

    /* The feel layer and the sound bank are optional: the harness boots a single
     * game without them, and a missing voice must never cost a turn. Each effect
     * takes its own argument list, so this forwards whatever it is given. */
    function hasEff(name) {
      var lib = App.fx;
      return !!(lib && typeof lib[name] === "function");
    }

    function eff(name) {
      if (!hasEff(name)) {
        return null;
      }
      return App.fx[name].apply(App.fx, Array.prototype.slice.call(arguments, 1));
    }

    function sound(name) {
      if (typeof App.playSfx === "function") {
        App.playSfx(name);
      }
    }

    function readPalette() {
      var hue = 16;
      var light = false;
      if (document.documentElement) {
        light = document.documentElement.getAttribute("data-theme") === "light";
      }
      if (window.getComputedStyle) {
        var probe = window.getComputedStyle(canvas);
        var raw = probe && probe.getPropertyValue ? probe.getPropertyValue("--gp-hue") : "";
        var parsed = parseInt(raw, 10);
        if (!isNaN(parsed)) {
          hue = parsed;
        }
      }
      palette = snkPalette(light, hue);
    }

    /* A single cell of the board in canvas pixels. */
    function cellCenter(x, y) {
      return { x: (x + 0.5) * snkCell, y: (y + 0.5) * snkCell };
    }

    /* Move the fx probe onto a cell so a shared effect lands on the square the
     * player is looking at instead of the middle of the board. */
    function anchorAt(x, y) {
      var rect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : null;
      var wide = rect && rect.width ? rect.width : snkField;
      var scale = wide / snkField;
      var left = (rect && rect.left ? rect.left : 0) + (x + 0.5) * snkCell * scale;
      var top = (rect && rect.top ? rect.top : 0) + (y + 0.5) * snkCell * scale;
      anchor.style.left = left + "px";
      anchor.style.top = top + "px";
      return anchor;
    }

    /* The bite ledger: one hollow diamond per point of the house goal, filled as
     * the serpent grows. It is the board's own progress, so a player never has
     * to do arithmetic on the goal chip to know how many bites are left. */
    function buildPips() {
      var host = canvas.parentNode;
      if (!host) {
        return;
      }
      pipsRow.className = "snk-pips";
      pipsRow.setAttribute("aria-hidden", "true");
      host.insertBefore(pipsRow, canvas);
    }

    function fillPips() {
      if (!pipsRow.parentNode) {
        return;
      }
      while (pipsRow.firstChild) {
        pipsRow.removeChild(pipsRow.firstChild);
      }
      pips = [];
      for (var index = 0; index < level.goal; index += 1) {
        var pip = document.createElement("span");
        pip.className = "snk-pip";
        pipsRow.appendChild(pip);
        pips.push(pip);
      }
      paintPips();
      eff("stagger", pips, { step: 34, kind: "drop" });
    }

    function paintPips() {
      if (!pips) {
        return;
      }
      for (var index = 0; index < pips.length; index += 1) {
        var eaten = index < snake.length;
        if (pips[index].className !== "snk-pip" + (eaten ? " is-eaten" : "")) {
          pips[index].className = "snk-pip" + (eaten ? " is-eaten" : "");
        }
      }
    }

    function wallKey(x, y) {
      return x + "," + y;
    }

    function isWall(x, y) {
      return wallSet[wallKey(x, y)] === true;
    }

    function buildWalls(levelDef) {
      wallSet = {};
      levelDef.walls.forEach(function (rect) {
        for (var x = rect[0]; x <= rect[2]; x += 1) {
          for (var y = rect[1]; y <= rect[3]; y += 1) {
            wallSet[wallKey(x, y)] = true;
          }
        }
      });
    }

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

    function renderHud() {
      if (!lengthRolling) {
        lengthEl.textContent = String(snake.length);
      }
      goalEl.textContent = snake.length + "/" + level.goal;
      paintPips();
    }

    function emptyCell(occupied) {
      var spot;
      var guard = 0;
      do {
        spot = {
          x: Math.floor(Math.random() * snkCols),
          y: Math.floor(Math.random() * snkRows),
        };
        guard += 1;
      } while (
        guard < 500 &&
        (isWall(spot.x, spot.y) ||
          occupied.some(function (part) {
            return part.x === spot.x && part.y === spot.y;
          }))
      );
      return spot;
    }

    /* ------------------------------------------------------------ geometry */

    /* The body index measured in canvas pixels: fat behind the head, thinning to
     * a whip at the tail. This taper is the whole reason a snake reads as a
     * snake rather than a chain of tiles. */
    function bodyWidth(index, count) {
      var f = count <= 1 ? 0 : index / (count - 1);
      return snkCell * (0.9 - 0.62 * Math.pow(f, 0.8));
    }

    /* Node positions for this instant. Every node slides one cell per tick, so
     * the tube reads as slithering instead of jumping; a node that wrapped the
     * board snaps rather than streaking across it. */
    function bodyNodes(now) {
      var count = snake.length;
      var k = running && !motionOff() ? snkClamp((now - stepAt) / tickMs, 0, 1) : 1;
      var breath = running || motionOff() || calm() ? 1 : 1 + 0.05 * Math.sin(now / 520);
      var points = [];
      for (var index = 0; index < count; index += 1) {
        var to = snake[index];
        var from = prevSnake[index] || to;
        if (Math.abs(to.x - from.x) > 1 || Math.abs(to.y - from.y) > 1) {
          from = to;
        }
        var cell = {
          x: from.x + (to.x - from.x) * k,
          y: from.y + (to.y - from.y) * k,
        };
        var at = cellCenter(cell.x, cell.y);
        points.push({ x: at.x, y: at.y, w: bodyWidth(index, count) * breath, i: index });
      }
      if (death && points.length) {
        /* The fatal lunge: the head rests most of the way into the cell that
         * killed it, so the death reads as an impact, not a coincidence. */
        var target = cellCenter(death.x, death.y);
        points[0].x += (target.x - points[0].x) * 0.62;
        points[0].y += (target.y - points[0].y) * 0.62;
      }
      if (count > 1) {
        var tail = points[count - 1];
        var back = points[count - 2];
        var angle = Math.atan2(tail.y - back.y, tail.x - back.x);
        points.push({
          x: tail.x + Math.cos(angle) * snkCell * 0.55,
          y: tail.y + Math.sin(angle) * snkCell * 0.55,
          w: snkCell * 0.12,
          i: count,
        });
      }
      /* The entrance: the head arrives, then the body pays out behind it. */
      var reveal = revealAmount(now);
      if (reveal < 1 && points.length > 2) {
        var keep = 2 + Math.floor(reveal * (count - 1));
        points = points.slice(0, keep);
      }
      return points;
    }

    function revealAmount(now) {
      /* The deal-in only plays where there is someone to see it: a hidden panel
       * or a motion-off player gets the settled board, never a half one. */
      if (motionOff() || calm() || !shown) {
        return 1;
      }
      return snkClamp((now - revealAt) / 520, 0, 1);
    }

    /* Split the node chain wherever the board wrapped, so a serpent leaving one
     * edge does not draw a line across to the other. */
    function nodeRuns(points) {
      var runs = [[points[0]]];
      for (var index = 1; index < points.length; index += 1) {
        var a = points[index - 1];
        var b = points[index];
        if (Math.abs(a.x - b.x) > snkCell * 1.9 || Math.abs(a.y - b.y) > snkCell * 1.9) {
          runs.push([b]);
        } else {
          runs[runs.length - 1].push(b);
        }
      }
      return runs;
    }

    function curve(a, b, c, d, u) {
      var u2 = u * u;
      var u3 = u2 * u;
      return (
        0.5 *
        (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3)
      );
    }

    /* Catmull-Rom through the node centres: corners become bends, which is what
     * a body that cannot turn on a dime should do. */
    function sampleRun(points) {
      var out = [];
      var count = points.length;
      if (count < 2) {
        return out;
      }
      for (var index = 0; index < count - 1; index += 1) {
        var p0 = points[index > 0 ? index - 1 : 0];
        var p1 = points[index];
        var p2 = points[index + 1];
        var p3 = points[index + 2 < count ? index + 2 : count - 1];
        for (var step = 0; step < snkSub; step += 1) {
          var u = step / snkSub;
          out.push({
            x: curve(p0.x, p1.x, p2.x, p3.x, u),
            y: curve(p0.y, p1.y, p2.y, p3.y, u),
            w: p1.w + (p2.w - p1.w) * u,
            i: p1.i,
          });
        }
      }
      var end = points[count - 1];
      out.push({ x: end.x, y: end.y, w: end.w, i: end.i });
      return out;
    }

    /* A tapered tube as one filled polygon: walk one side out, the other side
     * back. Stroking one fat path per run is cheaper than a stroke per segment
     * and keeps the silhouette smooth. */
    function tubePath(c, samples, shrink) {
      var left = [];
      var right = [];
      for (var index = 0; index < samples.length; index += 1) {
        var before = samples[index > 0 ? index - 1 : index];
        var after = samples[index < samples.length - 1 ? index + 1 : index];
        var dx = after.x - before.x;
        var dy = after.y - before.y;
        var len = Math.sqrt(dx * dx + dy * dy) || 1;
        var nx = -dy / len;
        var ny = dx / len;
        var half = (samples[index].w * shrink) / 2;
        left.push([samples[index].x + nx * half, samples[index].y + ny * half]);
        right.push([samples[index].x - nx * half, samples[index].y - ny * half]);
      }
      c.beginPath();
      c.moveTo(left[0][0], left[0][1]);
      for (var a = 1; a < left.length; a += 1) {
        c.lineTo(left[a][0], left[a][1]);
      }
      for (var b = right.length - 1; b >= 0; b -= 1) {
        c.lineTo(right[b][0], right[b][1]);
      }
      c.closePath();
    }

    /* ------------------------------------------------------------- the court */

    function sizeCanvas() {
      var rect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : null;
      var shown = rect && rect.width ? rect.width : snkField;
      var dpr = window.devicePixelRatio || 1;
      var wanted = snkClamp(Math.round((shown / snkField) * dpr), 1, 3);
      if (wanted !== ratio || canvas.width !== snkField * wanted) {
        canvas.width = snkField * wanted;
        canvas.height = snkField * wanted;
        court = null;
      }
      ratio = wanted;
    }

    function courtKey() {
      return level.id + "|" + (level.wrap ? "w" : "s") + "|" + palette.key + "|" + canvas.width;
    }

    /* The field, the kerb and the walls never change during a house, so they are
     * painted once into an offscreen canvas and blitted per frame. */
    function courtBitmap() {
      var key = courtKey();
      if (court && court.key === key) {
        return court.node;
      }
      var node = document.createElement("canvas");
      node.width = canvas.width;
      node.height = canvas.height;
      var c = node.getContext("2d");
      c.setTransform(ratio, 0, 0, ratio, 0, 0);
      paintCourt(c);
      court = { key: key, node: node };
      return node;
    }

    function paintCourt(c) {
      var p = palette;
      var x;
      var y;
      c.fillStyle = p.fieldLow;
      c.fillRect(0, 0, snkField, snkField);
      var wash = c.createLinearGradient(0, 0, 0, snkField);
      wash.addColorStop(0, p.fieldTop);
      wash.addColorStop(1, p.fieldLow);
      c.fillStyle = wash;
      c.fillRect(0, 0, snkField, snkField);
      /* Mown lanes: the field says "playing surface" before any piece is drawn. */
      c.fillStyle = p.lane;
      for (y = 0; y < snkRows; y += 1) {
        for (x = 0; x < snkCols; x += 1) {
          if ((x + y) % 2 === 0) {
            c.fillRect(x * snkCell, y * snkCell, snkCell, snkCell);
          }
        }
      }
      c.strokeStyle = p.hair;
      c.lineWidth = 1;
      c.beginPath();
      for (x = 1; x < snkCols; x += 1) {
        c.moveTo(x * snkCell + 0.5, 0);
        c.lineTo(x * snkCell + 0.5, snkField);
      }
      for (y = 1; y < snkRows; y += 1) {
        c.moveTo(0, y * snkCell + 0.5);
        c.lineTo(snkField, y * snkCell + 0.5);
      }
      c.stroke();
      paintMarkings(c);
      paintEdges(c);
      paintWalls(c);
      var shade = c.createRadialGradient(
        snkField / 2,
        snkField * 0.42,
        snkField * 0.14,
        snkField / 2,
        snkField / 2,
        snkField * 0.8,
      );
      shade.addColorStop(0, "rgba(0, 0, 0, 0)");
      shade.addColorStop(1, p.vignette);
      c.fillStyle = shade;
      c.fillRect(0, 0, snkField, snkField);
    }

    function paintMarkings(c) {
      var p = palette;
      var mid = snkField / 2;
      c.strokeStyle = p.mark;
      c.lineWidth = 1.4;
      c.beginPath();
      c.moveTo(mid + 0.5, snkCell * 1.2);
      c.lineTo(mid + 0.5, snkField - snkCell * 1.2);
      c.stroke();
      c.beginPath();
      c.arc(mid, mid, snkCell * 2.4, 0, snkTau);
      c.stroke();
      c.beginPath();
      c.arc(mid, mid, snkCell * 0.42, 0, snkTau);
      c.fillStyle = p.mark;
      c.fill();
      var corners = [
        [snkCell * 0.9, snkCell * 0.9, Math.PI * 0.5, Math.PI],
        [snkField - snkCell * 0.9, snkCell * 0.9, Math.PI * 0.5, snkTau],
        [snkField - snkCell * 0.9, snkField - snkCell * 0.9, Math.PI, Math.PI * 1.5],
        [snkCell * 0.9, snkField - snkCell * 0.9, Math.PI * 1.5, snkTau],
      ];
      c.lineWidth = 1.2;
      corners.forEach(function (corner) {
        c.beginPath();
        c.arc(corner[0], corner[1], snkCell * 1.3, corner[2], corner[3]);
        c.stroke();
      });
    }

    /* Solid stone on an edge that kills, open gates on an edge that carries you
     * through. The rule is drawn, so wrap is not a colour the player has to
     * remember. */
    function paintEdges(c) {
      var p = palette;
      var inset = 5;
      var index;
      if (!level.wrap) {
        c.fillStyle = p.kerbFace;
        c.fillRect(0, 0, snkField, inset);
        c.fillRect(0, snkField - inset, snkField, inset);
        c.fillRect(0, 0, inset, snkField);
        c.fillRect(snkField - inset, 0, inset, snkField);
        c.fillStyle = p.kerbLit;
        c.fillRect(0, 0, snkField, 1);
        c.fillRect(0, 0, 1, snkField);
        c.fillStyle = p.kerbDeep;
        c.fillRect(0, snkField - 1, snkField, 1);
        c.fillRect(snkField - 1, 0, 1, snkField);
        c.strokeStyle = p.kerbInner;
        c.lineWidth = 1;
        c.strokeRect(inset - 0.5, inset - 0.5, snkField - inset * 2 + 1, snkField - inset * 2 + 1);
        return;
      }
      c.strokeStyle = p.gate;
      c.lineWidth = 2;
      c.setLineDash([5, 4]);
      c.strokeRect(2.5, 2.5, snkField - 5, snkField - 5);
      c.setLineDash([]);
      /* Gate mouths: a pair of ticks pointing out on each side of each edge. */
      c.lineWidth = 1.6;
      for (index = 0; index < 4; index += 1) {
        var along = snkCell * (2.5 + index * 4);
        c.beginPath();
        c.moveTo(along - 3, 1.5);
        c.lineTo(along, 5);
        c.lineTo(along + 3, 1.5);
        c.moveTo(along - 3, snkField - 1.5);
        c.lineTo(along, snkField - 5);
        c.lineTo(along + 3, snkField - 1.5);
        c.moveTo(1.5, along - 3);
        c.lineTo(5, along);
        c.lineTo(1.5, along + 3);
        c.moveTo(snkField - 1.5, along - 3);
        c.lineTo(snkField - 5, along);
        c.lineTo(snkField - 1.5, along + 3);
        c.stroke();
      }
    }

    function paintWalls(c) {
      var p = palette;
      Object.keys(wallSet).forEach(function (key) {
        var parts = key.split(",");
        var x = Number(parts[0]) * snkCell;
        var y = Number(parts[1]) * snkCell;
        c.fillStyle = p.stoneShade;
        snkRoundRect(c, x + 1.6, y + 2.4, snkCell - 2.6, snkCell - 2.6, 3);
        c.fill();
        var face = c.createLinearGradient(0, y, 0, y + snkCell);
        face.addColorStop(0, p.stoneLit);
        face.addColorStop(0.5, p.stone);
        face.addColorStop(1, p.stoneDeep);
        c.fillStyle = face;
        snkRoundRect(c, x + 1, y + 1, snkCell - 2.6, snkCell - 2.6, 3);
        c.fill();
        c.fillStyle = p.stoneCap;
        c.fillRect(x + 2.6, y + 2.4, snkCell - 5.8, 1.8);
        c.strokeStyle = p.stoneSeam;
        c.lineWidth = 0.8;
        c.beginPath();
        c.moveTo(x + 2, y + snkCell * 0.56);
        c.lineTo(x + snkCell - 2.4, y + snkCell * 0.56);
        c.moveTo(x + snkCell * 0.52, y + snkCell * 0.56);
        c.lineTo(x + snkCell * 0.52, y + snkCell - 2.4);
        c.stroke();
        c.strokeStyle = p.stoneRim;
        c.lineWidth = 0.9;
        snkRoundRect(c, x + 1, y + 1, snkCell - 2.6, snkCell - 2.6, 3);
        c.stroke();
      });
    }

    /* ---------------------------------------------------------------- pieces */

    function drawFood(c, now) {
      var p = palette;
      var at = cellCenter(food.x, food.y);
      var beat = 0.5;
      var ripple = 0;
      if (!motionOff()) {
        var swing = calm() ? 0.25 : 0.5;
        beat = 0.5 + swing * Math.sin(now / (calm() ? 620 : 300));
        ripple = ((now % 1400) + 1400) % 1400 / 1400;
      }
      var halo = snkCell * (0.82 + 0.46 * beat);
      var pool = c.createRadialGradient(at.x, at.y, 0, at.x, at.y, halo);
      pool.addColorStop(0, p.foodGlow(0.34 + 0.26 * beat));
      pool.addColorStop(0.5, p.foodGlow(0.14));
      pool.addColorStop(1, p.foodGlow(0));
      c.fillStyle = pool;
      c.beginPath();
      c.arc(at.x, at.y, halo, 0, snkTau);
      c.fill();
      if (ripple) {
        c.strokeStyle = p.foodGlow((1 - ripple) * 0.5);
        c.lineWidth = 1.4;
        c.beginPath();
        c.arc(at.x, at.y, snkCell * (0.4 + 1.05 * ripple), 0, snkTau);
        c.stroke();
      }
      var r = snkCell * (0.29 + 0.055 * beat);
      var berry = c.createLinearGradient(at.x, at.y - r, at.x, at.y + r);
      berry.addColorStop(0, p.foodLit);
      berry.addColorStop(1, p.foodDeep);
      c.fillStyle = berry;
      c.beginPath();
      c.arc(at.x, at.y, r, 0, snkTau);
      c.fill();
      c.strokeStyle = p.foodRim;
      c.lineWidth = 1;
      c.stroke();
      c.fillStyle = p.foodLeaf;
      c.beginPath();
      c.moveTo(at.x + 0.4, at.y - r - 1.6);
      c.quadraticCurveTo(at.x + r * 1.5, at.y - r - 5.4, at.x + r * 2, at.y - r - 1.2);
      c.quadraticCurveTo(at.x + r * 1.1, at.y - r + 1.2, at.x + 0.4, at.y - r - 1.6);
      c.fill();
      c.fillStyle = "rgba(255, 255, 255, 0.8)";
      c.beginPath();
      c.arc(at.x - r * 0.34, at.y - r * 0.36, r * 0.26, 0, snkTau);
      c.fill();
    }

    function drawSerpent(c, now) {
      var p = palette;
      var runs = nodeRuns(bodyNodes(now));
      var drawn = null;
      for (var index = 0; index < runs.length; index += 1) {
        var samples = sampleRun(runs[index]);
        if (samples.length < 2) {
          continue;
        }
        if (!drawn) {
          drawn = samples;
        }
        var head = samples[0];
        var tail = samples[samples.length - 1];
        /* Head-to-tail ramp: the newest flesh is brightest, the old tail sinks
         * into the court. */
        var ramp = c.createLinearGradient(head.x, head.y, tail.x, tail.y);
        ramp.addColorStop(0, snkMix(p.serpent[0], p.serpent[1], 0));
        ramp.addColorStop(1, snkMix(p.serpent[0], p.serpent[1], 1));
        c.lineJoin = "round";
        c.lineCap = "round";
        tubePath(c, samples, 1);
        c.strokeStyle = p.ink;
        c.lineWidth = snkCell * 0.2;
        c.stroke();
        c.fillStyle = ramp;
        c.fill();
        if (death) {
          c.fillStyle = p.light ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.26)";
          c.fill();
        }
        tubePath(c, samples, 0.36);
        c.fillStyle = p.sheen;
        c.fill();
        drawBands(c, samples);
      }
      drawHead(c, drawn, now);
    }

    /* Scale bands across the tube, every other node, so the body is drawn rather
     * than filled. */
    function drawBands(c, samples) {
      var p = palette;
      c.strokeStyle = p.band;
      c.lineWidth = 1.1;
      c.beginPath();
      for (var index = 2; index < samples.length - 1; index += 2) {
        var before = samples[index - 1];
        var after = samples[index + 1] || samples[index];
        var dx = after.x - before.x;
        var dy = after.y - before.y;
        var len = Math.sqrt(dx * dx + dy * dy) || 1;
        var nx = -dy / len;
        var ny = dx / len;
        var half = samples[index].w * 0.4;
        c.moveTo(samples[index].x + nx * half, samples[index].y + ny * half);
        c.lineTo(samples[index].x - nx * half, samples[index].y - ny * half);
      }
      c.stroke();
    }

    /* The head carries the direction: a spade plate turned into the travel, two
     * eyes whose pupils look where the body is going, and a tongue that flicks
     * on a slow cycle. */
    function drawHead(c, samples, now) {
      var p = palette;
      var node = samples && samples.length ? samples[0] : null;
      if (!node) {
        return;
      }
      var second = samples[1] || { x: node.x + dir.x * snkCell, y: node.y + dir.y * snkCell };
      var angle = Math.atan2(node.y - second.y, node.x - second.x);
      var alive = !death;
      c.save();
      c.translate(node.x, node.y);
      c.rotate(angle);
      var hw = snkCell * 0.72;
      var hh = snkCell * 0.46;
      c.beginPath();
      c.moveTo(hw, 0);
      c.quadraticCurveTo(hw * 0.34, -hh, -hw * 0.62, -hh * 0.92);
      c.quadraticCurveTo(-hw * 0.9, 0, -hw * 0.62, hh * 0.92);
      c.quadraticCurveTo(hw * 0.34, hh, hw, 0);
      c.closePath();
      c.lineJoin = "round";
      c.strokeStyle = p.ink;
      c.lineWidth = snkCell * 0.2;
      c.stroke();
      var crown = c.createLinearGradient(0, -hh, 0, hh);
      crown.addColorStop(0, snkMix(p.serpent[0], p.serpent[1], 0.05));
      crown.addColorStop(1, snkMix(p.serpent[0], p.serpent[1], 0.42));
      c.fillStyle = crown;
      c.fill();
      /* Brow ridge, so the head has a top and a bottom. */
      c.strokeStyle = p.band;
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(-hw * 0.1, -hh * 0.5);
      c.lineTo(hw * 0.5, -hh * 0.24);
      c.moveTo(-hw * 0.1, hh * 0.5);
      c.lineTo(hw * 0.5, hh * 0.24);
      c.stroke();
      drawEyes(c, hw, hh, alive);
      c.fillStyle = p.ink;
      c.beginPath();
      c.arc(hw * 0.74, -hh * 0.2, 0.62, 0, snkTau);
      c.arc(hw * 0.74, hh * 0.2, 0.62, 0, snkTau);
      c.fill();
      if (alive) {
        drawTongue(c, hw, now);
      }
      c.restore();
    }

    function drawEyes(c, hw, hh, alive) {
      var p = palette;
      var spots = [-1, 1];
      for (var index = 0; index < spots.length; index += 1) {
        var ey = spots[index] * hh * 0.52;
        var ex = hw * 0.2;
        c.fillStyle = p.ink;
        c.beginPath();
        c.arc(ex, ey, snkCell * 0.19, 0, snkTau);
        c.fill();
        c.fillStyle = p.eye;
        c.beginPath();
        c.arc(ex, ey, snkCell * 0.155, 0, snkTau);
        c.fill();
        if (alive) {
          /* The pupil rides toward the muzzle: the turn is readable a beat
           * before the body commits to it. */
          c.fillStyle = p.pupil;
          c.beginPath();
          c.arc(ex + snkCell * 0.06, ey, snkCell * 0.08, 0, snkTau);
          c.fill();
          c.fillStyle = "rgba(255, 255, 255, 0.7)";
          c.beginPath();
          c.arc(ex + snkCell * 0.02, ey - snkCell * 0.05, snkCell * 0.032, 0, snkTau);
          c.fill();
        } else {
          c.strokeStyle = p.pupil;
          c.lineWidth = 1.3;
          c.beginPath();
          c.moveTo(ex - snkCell * 0.09, ey - snkCell * 0.09);
          c.lineTo(ex + snkCell * 0.09, ey + snkCell * 0.09);
          c.moveTo(ex + snkCell * 0.09, ey - snkCell * 0.09);
          c.lineTo(ex - snkCell * 0.09, ey + snkCell * 0.09);
          c.stroke();
        }
      }
    }

    function drawTongue(c, hw, now) {
      if (motionOff() || calm()) {
        return;
      }
      var phase = ((now % 2200) + 2200) % 2200 / 2200;
      var out = phase > 0.56 && phase < 0.82 ? Math.sin(((phase - 0.56) / 0.26) * Math.PI) : 0;
      if (out < 0.06) {
        return;
      }
      var p = palette;
      var len = snkCell * (0.3 + 0.5 * out);
      c.strokeStyle = p.tongue;
      c.lineWidth = 1.3;
      c.lineCap = "round";
      c.beginPath();
      c.moveTo(hw * 0.96, 0);
      c.lineTo(hw * 0.96 + len * 0.66, 0);
      c.moveTo(hw * 0.96 + len * 0.66, 0);
      c.lineTo(hw * 0.96 + len, -len * 0.28);
      c.moveTo(hw * 0.96 + len * 0.66, 0);
      c.lineTo(hw * 0.96 + len, len * 0.28);
      c.stroke();
    }

    /* A ring of sparks where the pellet was: the bite happens inside the board,
     * not only in the particle layer above it. */
    function drawBite(c, now) {
      if (!bite) {
        return;
      }
      var k = (now - bite.at) / 340;
      if (k >= 1) {
        bite = null;
        return;
      }
      var at = cellCenter(bite.x, bite.y);
      var p = palette;
      c.strokeStyle = p.foodGlow((1 - k) * 0.85);
      c.lineWidth = 0.8 + 2.2 * (1 - k);
      c.beginPath();
      c.arc(at.x, at.y, snkCell * (0.34 + 1.3 * k), 0, snkTau);
      c.stroke();
      for (var index = 0; index < 7; index += 1) {
        var angle = (index / 7) * snkTau + 0.4;
        var reach = snkCell * (0.3 + 1.5 * k);
        c.fillStyle = p.foodGlow((1 - k) * 0.9);
        c.beginPath();
        c.arc(at.x + Math.cos(angle) * reach, at.y + Math.sin(angle) * reach, 1.5 * (1 - k) + 0.4, 0, snkTau);
        c.fill();
      }
    }

    /* The cell that ended the run stays marked: a hazard plate with a cross, so
     * the death says what killed the serpent even after the ceremony closes. */
    function drawDeath(c, now) {
      if (!death) {
        return;
      }
      var p = palette;
      var x = snkClamp(death.x, 0, snkCols - 1) * snkCell;
      var y = snkClamp(death.y, 0, snkRows - 1) * snkCell;
      var k = motionOff() ? 1 : snkClamp((now - death.at) / 640, 0, 1);
      var glow = 1 - k;
      if (glow > 0) {
        var at = cellCenter(snkClamp(death.x, 0, snkCols - 1), snkClamp(death.y, 0, snkRows - 1));
        var pool = c.createRadialGradient(at.x, at.y, 0, at.x, at.y, snkCell * (1 + 2.4 * k));
        pool.addColorStop(0, snkColor(snkDangerHue, 92, 60, 0.5 * glow));
        pool.addColorStop(1, snkColor(snkDangerHue, 92, 60, 0));
        c.fillStyle = pool;
        c.beginPath();
        c.arc(at.x, at.y, snkCell * (1 + 2.4 * k), 0, snkTau);
        c.fill();
      }
      snkRoundRect(c, x + 1, y + 1, snkCell - 2.6, snkCell - 2.6, 3.5);
      c.fillStyle = p.dangerDeep;
      c.globalAlpha = 0.5 + 0.4 * glow;
      c.fill();
      c.globalAlpha = 1;
      c.strokeStyle = p.danger;
      c.lineWidth = 1.4;
      c.stroke();
      c.strokeStyle = p.danger;
      c.lineWidth = 2;
      c.lineCap = "round";
      c.beginPath();
      c.moveTo(x + 4, y + 4);
      c.lineTo(x + snkCell - 5.6, y + snkCell - 5.6);
      c.moveTo(x + snkCell - 5.6, y + 4);
      c.lineTo(x + 4, y + snkCell - 5.6);
      c.stroke();
    }

    /* The waiting house is not an empty board: the serpent idles with a breath,
     * the pellet glows, and chevrons show which way the first move goes. */
    function drawCue(c, now) {
      if (running || death || !snake.length) {
        return;
      }
      var p = palette;
      var at = cellCenter(snake[0].x, snake[0].y);
      var pulse = motionOff() ? 0.55 : 0.55 + 0.45 * Math.sin(now / 420);
      var angle = Math.atan2(dir.y, dir.x);
      c.save();
      c.translate(at.x, at.y);
      c.rotate(angle);
      c.strokeStyle = snkColor(p.hue, 80, p.light ? 34 : 72, 0.25 + 0.4 * pulse);
      c.lineWidth = 1.8;
      c.lineCap = "round";
      for (var index = 0; index < 3; index += 1) {
        var reach = snkCell * (1 + index * 0.55 + 0.25 * pulse);
        c.beginPath();
        c.moveTo(reach - 3, -4.2);
        c.lineTo(reach, 0);
        c.lineTo(reach - 3, 4.2);
        c.stroke();
      }
      c.restore();
    }

    /* ---------------------------------------------------------------- render */

    function paint(now) {
      var clock = now || Date.now();
      shown = isShown();
      sizeCanvas();
      var field = courtBitmap();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(field, 0, 0);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      var reveal = revealAmount(clock);
      if (reveal < 1) {
        ctx.globalAlpha = 0.4 + 0.6 * reveal;
      }
      if (reveal > 0.42) {
        drawFood(ctx, clock);
      }
      ctx.globalAlpha = 1;
      drawSerpent(ctx, clock);
      drawBite(ctx, clock);
      drawDeath(ctx, clock);
      drawCue(ctx, clock);
    }

    function isShown() {
      /* A drawer panel is display:none while closed, which is exactly what
       * offsetParent reports as null: the loop stops itself on that. */
      return !!canvas.offsetParent;
    }

    function wantsFrames() {
      return !motionOff() && isShown() && (running || !calm());
    }

    function frame() {
      frameId = null;
      paint(Date.now());
      if (wantsFrames()) {
        frameId = window.requestAnimationFrame(frame);
      }
    }

    function schedulePaint() {
      if (frameId !== null) {
        return;
      }
      if (wantsFrames()) {
        frameId = window.requestAnimationFrame(frame);
      } else {
        paint(Date.now());
      }
    }

    function cancelPaint() {
      if (frameId !== null && window.cancelAnimationFrame) {
        window.cancelAnimationFrame(frameId);
      }
      frameId = null;
    }

    /* ------------------------------------------------------------- the round */

    function stopLoop() {
      window.clearInterval(intervalId);
      intervalId = null;
    }

    function startLoop() {
      stopLoop();
      intervalId = window.setInterval(tick, tickMs);
    }

    function closeRoundView() {
      if (dismissRound) {
        dismissRound();
        dismissRound = null;
      }
    }

    function loadLevel(levelDef) {
      stopLoop();
      cancelPaint();
      closeRoundView();
      running = false;
      level = levelDef;
      buildWalls(levelDef);
      var start = levelDef.start || { x: 4, y: 8, dx: 1 };
      dir = { x: start.dx, y: 0 };
      nextDir = { x: start.dx, y: 0 };
      snake = [
        { x: start.x, y: start.y },
        { x: start.x - start.dx, y: start.y },
        { x: start.x - start.dx * 2, y: start.y },
      ];
      tickMs = snkStartMs;
      food = emptyCell(snake);
      prevSnake = snake.slice();
      bite = null;
      death = null;
      lengthRolling = false;
      revealAt = Date.now();
      timeEl.textContent = "0.0s";
      renderHud();
      refreshPicker();
      fillPips();
      paint(Date.now());
      resultEl.textContent = t("snkGoal", {
        name: t(level.labelKey),
        n: level.goal,
      });
    }

    function startGame() {
      loadLevel(level);
      running = true;
      startedAt = Date.now();
      stepAt = startedAt;
      prevSnake = snake.slice();
      resultEl.textContent = t("snkGo");
      sound("tap");
      eff("sweep", startBtn);
      startLoop();
      schedulePaint();
      canvas.focus();
    }

    /* One bite: a burst in the board, sparks over it, the length rolling up and
     * another pip filled. Every beat lands where the pellet was. */
    function noteBite(cell, fromLength) {
      if (!motionOff()) {
        bite = { x: cell.x, y: cell.y, at: Date.now() };
      }
      var probe = anchorAt(cell.x, cell.y);
      var gained = snake.length - fromLength;
      eff("ring", probe, { hue: snkFoodHue });
      eff("burst", probe, { kind: "ember", count: 12, hue: snkFoodHue });
      eff("floatText", probe, "+" + gained, { kind: "good", hue: snkFoodHue });
      eff("pop", goalEl, { scale: 1.12, ms: 220 });
      sound("pop");
      if (hasEff("countUp")) {
        lengthRolling = true;
        if (lengthChip) {
          lengthChip.classList.add("is-bump");
        }
        var gen = roundId;
        eff("countUp", lengthEl, fromLength, snake.length, {
          ms: 280,
          format: function (value) {
            if (gen !== roundId) {
              /* This roll belongs to a house that has since been reloaded. */
              lengthRolling = false;
              if (lengthChip) {
                lengthChip.classList.remove("is-bump");
              }
              return lengthEl.textContent;
            }
            lengthRolling = value !== snake.length;
            if (!lengthRolling && lengthChip) {
              lengthChip.classList.remove("is-bump");
            }
            return String(value);
          },
        });
      } else {
        lengthEl.textContent = String(snake.length);
      }
    }

    function noteDeath(cell) {
      death = { x: cell.x, y: cell.y, at: Date.now() };
      var probe = anchorAt(snkClamp(cell.x, 0, snkCols - 1), snkClamp(cell.y, 0, snkRows - 1));
      eff("jolt", canvas, { dist: 6, ms: 260 });
      eff("flash", canvas, { hue: snkDangerHue });
      eff("burst", probe, { kind: "spark", count: 14, hue: snkDangerHue });
      eff("ring", probe, { hue: snkDangerHue });
      if (lengthChip) {
        lengthChip.classList.add("is-warn");
      }
      sound("hit");
    }

    /* A round ends as an event, and the handle that closes the ceremony is kept
     * so loading another house never leaves a scrim over the board. */
    function closeRound(tone, stars, title, lines) {
      var host = panel || resultEl;
      var dismiss = eff("ceremony", host, {
        tone: tone,
        stars: stars,
        title: title,
        lines: lines,
      });
      dismissRound = typeof dismiss === "function" ? dismiss : null;
    }

    function gameOver(at) {
      stopLoop();
      running = false;
      noteDeath(at || { x: snake[0].x + dir.x, y: snake[0].y + dir.y });
      resultEl.textContent = t("snkOver", { n: snake.length }) + " " + t("snkRetry");
      draw();
      closeRound("lose", 0, t("snkOver", { n: snake.length }), [
        t("hudLength") + ": " + snake.length + "/" + level.goal,
        t("snkRetry").trim(),
      ]);
    }

    function levelCleared() {
      stopLoop();
      running = false;
      var seconds = Math.max(0.1, (Date.now() - startedAt) / 1000);
      var starsWon = starsFor(Math.round(seconds * 10) / 10, level.starTimes, "low");
      var outcome = campaign.record(level.id, {
        stars: starsWon,
        best: Math.round(seconds * 10) / 10,
        better: "low",
      });
      var message = t("snkCleared", {
        name: t(level.labelKey),
        s: seconds.toFixed(1),
        stars: starsWon,
      });
      if (outcome.isBest) {
        message += " " + t("newBest");
      }
      if (outcome.unlockedNext) {
        message += " " + t("snkNextHouse");
      } else if (campaign.clearedCount() === snkLevels.length) {
        message += " " + t("snkCampaignDone");
      }
      logAction(t("logSnk", { n: snake.length }));
      var rect = startBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      var nextId = outcome.unlockedNext || level.id;
      loadLevel(snkLevels[campaign.indexOf(nextId)]);
      resultEl.textContent = message;
      closeRound(starsWon === 3 ? "win" : "clear", starsWon, t(level.labelKey), [message]);
    }

    function tick() {
      if (!running) {
        return;
      }
      timeEl.textContent = ((Date.now() - startedAt) / 1000).toFixed(1) + "s";
      if (nextDir.x !== -dir.x || nextDir.y !== -dir.y) {
        dir = nextDir;
      }
      var head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
      if (level.wrap) {
        head.x = (head.x + snkCols) % snkCols;
        head.y = (head.y + snkRows) % snkRows;
      } else if (head.x < 0 || head.x >= snkCols || head.y < 0 || head.y >= snkRows) {
        gameOver();
        return;
      }
      if (isWall(head.x, head.y)) {
        gameOver();
        return;
      }

      var ate = head.x === food.x && head.y === food.y;
      var body = ate ? snake : snake.slice(0, snake.length - 1);
      if (
        body.some(function (part) {
          return part.x === head.x && part.y === head.y;
        })
      ) {
        gameOver();
        return;
      }

      var wasLength = snake.length;
      var eaten = { x: food.x, y: food.y };
      prevSnake = snake.slice();
      stepAt = Date.now();
      snake.unshift(head);
      if (ate) {
        noteBite(eaten, wasLength);
        if (snake.length >= level.goal) {
          renderHud();
          draw();
          levelCleared();
          return;
        }
        food = emptyCell(snake);
        if (tickMs > snkMinMs) {
          tickMs = Math.max(snkMinMs, tickMs - snkStepMs);
          startLoop();
        }
      } else {
        snake.pop();
      }

      renderHud();
      draw();
    }

    /* Paint entry point for the game logic: one frame now, and the loop only
     * keeps spinning while there is something to animate. */
    function draw() {
      paint(Date.now());
      schedulePaint();
    }

    function steer(key) {
      var wanted = null;
      if (key === "ArrowUp" || key === "w") {
        wanted = { x: 0, y: -1 };
      } else if (key === "ArrowDown" || key === "s") {
        wanted = { x: 0, y: 1 };
      } else if (key === "ArrowLeft" || key === "a") {
        wanted = { x: -1, y: 0 };
      } else if (key === "ArrowRight" || key === "d") {
        wanted = { x: 1, y: 0 };
      }
      if (!wanted) {
        return;
      }
      if (running && (wanted.x !== nextDir.x || wanted.y !== nextDir.y)) {
        sound("step");
      }
      nextDir = wanted;
    }

    canvas.addEventListener("keydown", function (event) {
      if (
        event.key === "ArrowUp" ||
        event.key === "ArrowDown" ||
        event.key === "ArrowLeft" ||
        event.key === "ArrowRight"
      ) {
        event.preventDefault();
      }
      steer(event.key.length === 1 ? event.key.toLowerCase() : event.key);
    });

    selectEl.addEventListener("change", function () {
      var index = campaign.indexOf(selectEl.value);
      if (index >= 0 && campaign.isUnlocked(selectEl.value)) {
        sound("select");
        loadLevel(snkLevels[index]);
      }
    });

    startBtn.addEventListener("click", startGame);

    /* The drawer hides this panel rather than unmounting it, so the pointer
     * coming back over the board is the cue to start breathing again. */
    function wake() {
      if (dismissRound) {
        closeRoundView();
      }
      schedulePaint();
    }

    var wakeHost = panel || canvas;
    wakeHost.addEventListener("pointerover", wake);
    wakeHost.addEventListener("focusin", wake);

    if (window.MutationObserver && document.documentElement) {
      /* Theme and motion live on attributes; re-read the tokens and repaint once
       * when the shell flips either. No timer, so nothing outlives the panel. */
      var watcher = new window.MutationObserver(function () {
        readPalette();
        court = null;
        paint(Date.now());
      });
      watcher.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-theme", "data-motion"],
      });
    }

    App.quietResetSnake = function () {
      cancelPaint();
      closeRoundView();
      if (running) {
        loadLevel(level);
      }
    };

    readPalette();
    buildPips();
    loadLevel(snkLevels[campaign.indexOf(campaign.nextLevelId())]);
  }


  /* Exported for the other modules. */
  App.initSnakeGame = initSnakeGame;
})(window.CapitalConvert = window.CapitalConvert || {});
