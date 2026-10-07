/* Inkball - The glyph-brick breakout campaign in the shared game drawer. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  var t = App.t;
  var getElement = App.getElement;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  var createCampaign = App.createCampaign;
  var fillCampaignPicker = App.fillCampaignPicker;
  var brkW = 320;
  var brkH = 224;
  var brkCols = 8;
  var brkBrickW = 34;
  var brkBrickH = 15;
  var brkGap = 4;
  var brkTop = 20;
  var brkPaddleW = 46;
  var brkPaddleH = 5;
  var brkPaddleY = brkH - 14;
  var brkBallR = 3;
  var brkLives = 3;
  var brkTickMs = 16;
  var brkSubSteps = 4;
  var brkGhostBeats = 90;
  /* Presentation only. The table is authored at 320x224 but the panel stretches
   * it, so the backing store carries twice the pixels the bevels need. */
  var brkInkScale = 2;
  var brkTrailMax = 16;
  var brkSparkMax = 130;
  var brkTilePad = 4;
  /* Strata, not stripes: the top courses are the thick-cut tiles - deeper cast
   * shadow, wider bevel, bigger mark - and the wall lightens as it descends. */
  var brkRowWeight = [1.24, 1.05, 0.88, 0.74, 0.6];
  var brkDealStep = 1.4;
  var brkDealRise = 20;
  var brkDealBeats = 11;
  /* Marks are written as \uXXXX escapes so the source stays pure ASCII. */
  var brkGlyphs = [
    "\u706B",
    "\u6C34",
    "\u6728",
    "\u91D1",
    "\u571F",
    "\u98CE",
    "\u96F7",
    "\u7535",
    "\u5149",
    "\u6697",
    "\u661F",
    "\u6708",
  ];
  var brkRowTints = ["#22d3ee", "#fbbf24", "#f472b6", "#a3e635", "#a78bfa"];
  /* Three streets, five boards each. The map chars are the verbs:
   * n normal, t tough (2 hits), d drift (slides on every paddle hit),
   * s seed (re-sprouts when smashed), g ghost (solid on alternating
   * beats), x exploder (takes its neighbours with it). */
  var brkLevels = [
    { id: "p1", world: 0, labelKey: "brkL1", speed: 2.1, rows: ["........", "........", "nnnnnnnn", "nnnnnnnn", "........"] },
    { id: "p2", world: 0, labelKey: "brkL2", speed: 2.15, rows: ["........", "n.n.n.n.", "nnnnnnnn", "n.n.n.n.", "........"] },
    { id: "p3", world: 0, labelKey: "brkL3", speed: 2.2, rows: ["n.n.n.n.", "nnnnnnnn", "n.n.n.n.", "nnnnnnnn", "n.n.n.n."] },
    { id: "p4", world: 0, labelKey: "brkL4", speed: 2.25, rows: ["........", "tt.n.n.tt", "nnnnnnnn", "tt.n.n.tt", "........"] },
    { id: "p5", world: 0, labelKey: "brkL5", speed: 2.3, rows: ["t.t.t.t.", ".n.n.n.n", "tttttttt", ".n.n.n.n", "t.t.t.t."] },
    { id: "g1", world: 1, labelKey: "brkL6", speed: 2.35, rows: ["........", "ddd..ddd", "........", "ddd..ddd", "........"] },
    { id: "g2", world: 1, labelKey: "brkL7", speed: 2.4, rows: ["d.d.d.d.", ".dddddd.", "d.d.d.d.", ".dddddd.", "d.d.d.d."] },
    { id: "g3", world: 1, labelKey: "brkL8", speed: 2.45, rows: ["ss....ss", "........", "nnnnnnnn", "........", "ss....ss"] },
    { id: "g4", world: 1, labelKey: "brkL9", speed: 2.5, rows: ["d.s..s.d", "........", "ts....st", "........", "d.s..s.d"] },
    { id: "g5", world: 1, labelKey: "brkL10", speed: 2.55, rows: ["dddddddd", "s.nnnn.s", "dddddddd", "s.nnnn.s", "........"] },
    { id: "x1", world: 2, labelKey: "brkL11", speed: 2.6, rows: ["g.g.g.g.", "........", "g.g.g.g.", "........", "g.g.g.g."] },
    { id: "x2", world: 2, labelKey: "brkL12", speed: 2.65, rows: ["gggggggg", "........", "nnnnnnnn", "........", "gggggggg"] },
    { id: "x3", world: 2, labelKey: "brkL13", speed: 2.7, rows: ["...x....", "........", "..xxx...", "........", "....x..."] },
    { id: "x4", world: 2, labelKey: "brkL14", speed: 2.75, rows: ["g.x.x.g.", "x.g.g.g.x", "g.x.n.x.g", "x.g.g.g.x", "g.x.x.g."] },
    { id: "x5", world: 2, labelKey: "brkL15", speed: 2.85, rows: ["t.gx.xgt", "g.x..x.g", "gx.nn.xg", "g.x..x.g", "tgx.x.gt"] },
    { id: "x6", world: 2, labelKey: "brkL16", speed: 2.9, rows: ["x..n..x.", ".n.g.g.n", "x..t..x.", ".g.n.g.n", "x..n..x."] },
    { id: "x7", world: 2, labelKey: "brkL17", speed: 2.95, rows: ["nnxnnxnn", "........", "gxnnnxng", "........", "nxn..nxn"] },
  ];

  function initBreakoutGame() {
    var canvas = getElement("brkCanvas");
    var scoreEl = getElement("brkScore");
    var livesEl = getElement("brkLives");
    var levelEl = getElement("brkLevel");
    var resultEl = getElement("brkResult");
    var startBtn = getElement("brkStartBtn");
    var bestEl = getElement("brkBest");
    var selectEl = getElement("brkLevelSel");
    var panel = getElement("gamePanelBreakout");
    if (
      !canvas ||
      !scoreEl ||
      !livesEl ||
      !levelEl ||
      !resultEl ||
      !startBtn ||
      !bestEl ||
      !selectEl ||
      !panel
    ) {
      return;
    }

    var campaign = createCampaign({ key: "inkball-campaign", levels: brkLevels });
    var ctx = canvas.getContext("2d");
    var bricks = [];
    var ball = { x: brkW / 2, y: brkPaddleY - 6, vx: 0, vy: 0 };
    var paddleX = brkW / 2 - brkPaddleW / 2;
    var state = "idle";
    var running = false;
    var pausedByHide = false;
    var intervalId = null;
    var score = 0;
    var lives = brkLives;
    var combo = 0;
    var ticks = 0;
    var level = null;
    var keysDown = {};
    /* Presentation state: the pools the draw loop feeds and drains. */
    var trail = [];
    var sparks = [];
    var floats = [];
    var rings = [];
    var motes = [];
    var sprites = {};
    var inkHue = 190;
    var lightField = false;
    var pal = buildPalette();
    var shake = 0;
    var paddleSquash = 0;
    var paddleHeat = 0;
    var comboPop = 0;
    var ballPulse = 0;
    var ghostWas = 0;
    var railFlash = [0, 0, 0];
    var lastSmashSound = -9;
    var lastRailSound = -9;

    function brickX(col) {
      var gridW = brkCols * brkBrickW + (brkCols - 1) * brkGap;
      var left = (brkW - gridW) / 2;
      return left + col * (brkBrickW + brkGap);
    }

    function brickY(row) {
      return brkTop + row * (brkBrickH + brkGap);
    }

    function makeBrick(col, row, kind) {
      return {
        col: col,
        row: row,
        x: brickX(col),
        y: brickY(row),
        kind: kind,
        hp: kind === "t" ? 2 : 1,
        dir: row % 2 === 0 ? 1 : -1,
        glyph: brkGlyphs[(row * brkCols + col) % brkGlyphs.length],
        tint: brkRowTints[row % brkRowTints.length],
        /* draw-only: 1 is settled, less than 1 is still arriving */
        in: 1,
        delay: 0,
        flash: 0,
        grow: false,
      };
    }

    function buildLevel(levelDef, deal) {
      level = levelDef;
      bricks = [];
      sprites = {};
      clearFieldFx();
      var willDeal = deal && !motionOffField();
      for (var row = 0; row < levelDef.rows.length; row += 1) {
        for (var col = 0; col < brkCols; col += 1) {
          var ch = levelDef.rows[row].charAt(col);
          if (ch !== "." && ch !== "") {
            var brick = makeBrick(col, row, ch);
            /* The wall is dealt top-left to bottom-right instead of appearing,
             * which is the only moment a player learns what the board looks like. */
            if (willDeal) {
              brick.in = 0;
              brick.delay = (row * brkCols + col) * brkDealStep;
            }
            bricks.push(brick);
          }
        }
      }
      score = 0;
      lives = brkLives;
      combo = 0;
      scoreEl.textContent = "0";
      livesEl.textContent = String(brkLives);
      levelEl.textContent =
        campaign.indexOf(levelDef.id) + 1 + "/" + brkLevels.length;
      placeBallOnPaddle();
      refreshPicker();
      domFx("pop", levelEl, { scale: 1.12, ms: 240 });
      setChip(livesEl, "");
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
      selectEl.value = level ? level.id : campaign.nextLevelId();
      bestEl.textContent = t("campaignStars", {
        n: campaign.totalStars(),
        max: campaign.maxStars(),
      });
    }

    function ghostSolid() {
      return Math.floor(ticks / brkGhostBeats) % 2 === 0;
    }

    function placeBallOnPaddle() {
      ball.x = paddleX + brkPaddleW / 2;
      ball.y = brkPaddleY - brkBallR - 1;
      ball.vx = 0;
      ball.vy = 0;
      trail.length = 0;
    }

    function launch() {
      if (state !== "ready") {
        return;
      }
      var angle = (-70 - Math.random() * 40) * (Math.PI / 180);
      ball.vx = Math.cos(angle) * level.speed;
      ball.vy = Math.sin(angle) * level.speed;
      state = "live";
      resultEl.textContent = t("brkPlay");
      sound("shoot");
      pushRing(ball.x, ball.y, 3, 1.5, 18, pal.accent(lightField ? 46 : 80, 0.9), 1.4);
      pushBurst(ball.x, ball.y, blend(rowTint(1), [255, 255, 255], 0.5), 6, {
        power: 1.1,
        g: 0.02,
      });
      paddleSquash = Math.min(1, paddleSquash + 0.4);
    }

    /* ------------------------------------------------------------ ink field */
    /* Colour maths instead of a second palette table: every tile is derived from
     * its row tint, and the field is derived from the panel's own --gp-hue, so
     * the table and the chrome around it stay the same colour. */
    function rgbOf(hex) {
      var n = parseInt(hex.slice(1), 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }

    function blend(a, b, k) {
      return [
        Math.round(a[0] + (b[0] - a[0]) * k),
        Math.round(a[1] + (b[1] - a[1]) * k),
        Math.round(a[2] + (b[2] - a[2]) * k),
      ];
    }

    function css(rgb, a) {
      return (
        "rgba(" +
        rgb[0] +
        "," +
        rgb[1] +
        "," +
        rgb[2] +
        "," +
        (a === undefined ? 1 : a) +
        ")"
      );
    }

    function roundPath(c, x, y, w, h, r) {
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

    function easeOut(k) {
      var inv = 1 - k;
      return 1 - inv * inv * inv;
    }

    /* The shared fx layer already no-ops under [data-motion="off"]; the canvas
     * half has to obey the same switch or the escape hatch is a lie. */
    function motionOffField() {
      if (App.isMotionOff) {
        return App.isMotionOff();
      }
      return document.documentElement.getAttribute("data-motion") === "off";
    }

    function calmField() {
      if (App.isMotionCalm) {
        return App.isMotionCalm();
      }
      return document.documentElement.getAttribute("data-motion") === "calm";
    }

    function domFx(name, el, opts) {
      var fn = App.fx ? App.fx[name] : null;
      if (typeof fn !== "function") {
        return;
      }
      try {
        fn.call(App.fx, el, opts);
      } catch (error) {
        /* Feel is decoration: it must never cost a rally. */
      }
    }

    function sound(name) {
      if (typeof App.playSfx !== "function") {
        return;
      }
      try {
        App.playSfx(name);
      } catch (error) {
        /* ditto */
      }
    }

    /* A chip's state is a class the shared layer already draws (frame plus text
     * colour), so warn and good read as more than a hue. */
    function setChip(el, kind) {
      var chip = el ? el.parentNode : null;
      if (!chip || !chip.classList) {
        return;
      }
      chip.classList.remove("is-warn");
      chip.classList.remove("is-good");
      if (kind) {
        chip.classList.add("is-" + kind);
      }
    }

    function markResult(el, kind) {
      if (!el || !el.classList) {
        return;
      }
      el.classList.remove("is-win");
      el.classList.remove("is-lose");
      if (kind) {
        el.classList.add("is-" + kind);
      }
    }

    function buildPalette() {
      var h = inkHue;
      var light = lightField;
      return {
        washTop: "hsl(" + h + ", " + (light ? 38 : 44) + "%, " + (light ? 95 : 13) + "%)",
        washBot: "hsl(" + h + ", " + (light ? 30 : 52) + "%, " + (light ? 86 : 6) + "%)",
        grid: light ? "rgba(24, 60, 90, 0.09)" : "rgba(180, 232, 255, 0.055)",
        edge: light ? "rgba(20, 52, 78, 0.28)" : "rgba(160, 226, 255, 0.22)",
        accent: function (l, a) {
          return "hsla(" + h + ", " + (light ? 58 : 92) + "%, " + l + "%, " + a + ")";
        },
        danger: function (a) {
          return "hsla(356, 90%, " + (light ? 44 : 63) + "%, " + a + ")";
        },
        good: function (a) {
          return "hsla(142, 78%, " + (light ? 38 : 66) + "%, " + a + ")";
        },
        ball: light ? "#16324a" : "#f2fdff",
        ballRim: light ? "rgba(255,255,255,0.85)" : "rgba(12,40,60,0.55)",
        trail: function (a) {
          return light
            ? "rgba(22, 50, 74, " + a + ")"
            : "hsla(" + h + ", 95%, 74%, " + a + ")";
        },
        mote: light ? "rgba(24, 60, 90, 0.26)" : "rgba(196, 236, 255, 0.3)",
        watermark: light ? "rgba(22, 50, 74, 0.08)" : "rgba(206, 240, 255, 0.055)",
        tileShadow: light ? "rgba(15, 32, 48, 0.34)" : "rgba(0, 0, 0, 0.62)",
        plateTop: light ? "#f2fbff" : "#d9f7ff",
        plateMid: "hsl(" + h + ", " + (light ? 46 : 82) + "%, " + (light ? 56 : 60) + "%)",
        plateLow: "hsl(" + h + ", " + (light ? 44 : 70) + "%, " + (light ? 30 : 22) + "%)",
        plateEdge: light ? "rgba(18, 40, 58, 0.55)" : "rgba(3, 10, 18, 0.75)",
        text: light ? "#123048" : "rgba(240, 251, 255, 0.96)",
        textBack: light ? "rgba(255, 255, 255, 0.75)" : "rgba(6, 12, 20, 0.7)",
      };
    }

    function readPanelHue() {
      try {
        var declared = window.getComputedStyle
          ? window.getComputedStyle(panel).getPropertyValue("--gp-hue")
          : "";
        var n = parseInt(declared, 10);
        if (!isNaN(n)) {
          inkHue = n;
        }
      } catch (error) {
        /* the headless harness has no computed styles - the default holds */
      }
      pal = buildPalette();
    }

    function refreshTheme() {
      var theme = document.documentElement.getAttribute("data-theme");
      if ((theme === "light") === lightField) {
        return;
      }
      lightField = theme === "light";
      sprites = {};
      pal = buildPalette();
    }

    function rowTint(row) {
      return rgbOf(brkRowTints[row % brkRowTints.length]);
    }

    /* A tile is baked once per row/kind/hit/mark and blitted thereafter: forty
     * bevelled plates with a carved glyph each is far too much path work to redo
     * sixty times a second. */
    function tileSprite(brick) {
      var key =
        (lightField ? "l" : "d") +
        brick.row +
        brick.kind +
        brick.hp +
        brick.glyph;
      var cached = sprites[key];
      if (cached) {
        return cached;
      }
      var node = document.createElement("canvas");
      node.width = (brkBrickW + brkTilePad * 2) * brkInkScale;
      node.height = (brkBrickH + brkTilePad * 2) * brkInkScale;
      var g = node.getContext("2d");
      g.scale(brkInkScale, brkInkScale);
      g.translate(brkTilePad, brkTilePad);
      paintTile(g, brick);
      sprites[key] = node;
      return node;
    }

    function paintTile(c, brick) {
      var weight = brkRowWeight[brick.row] || 0.6;
      var tint = rowTint(brick.row);
      var hi = blend(tint, [255, 255, 255], lightField ? 0.2 : 0.4);
      var lo = blend(tint, lightField ? [26, 44, 62] : [4, 8, 14], lightField ? 0.46 : 0.56);
      var outline = blend(tint, [0, 0, 0], lightField ? 0.62 : 0.72);
      var w = brkBrickW;
      var h = brkBrickH;
      var rad = 2.6 + weight;

      /* cast shadow, baked in so the wall sits on the felt instead of floating */
      c.save();
      c.shadowColor = pal.tileShadow;
      c.shadowBlur = 1.6 + 2.6 * weight;
      c.shadowOffsetY = 1 + 1.4 * weight;
      roundPath(c, 0, 0, w, h, rad);
      c.fillStyle = css(lo, 1);
      c.fill();
      c.restore();

      /* the plate: a body gradient, then the two bands that turn a rectangle
       * into a tile - a gloss lid and a shaded floor */
      roundPath(c, 0, 0, w, h, rad);
      var body = c.createLinearGradient(0, 0, 0, h);
      body.addColorStop(0, css(hi, 1));
      body.addColorStop(0.46, css(tint, 1));
      body.addColorStop(1, css(lo, 1));
      c.fillStyle = body;
      c.fill();

      c.save();
      roundPath(c, 0, 0, w, h, rad);
      c.clip();
      roundPath(c, 1.4, 1.1, w - 2.8, h * 0.42, rad - 0.8);
      c.fillStyle = "rgba(255, 255, 255, " + (lightField ? 0.2 : 0.24) + ")";
      c.fill();
      c.fillStyle = "rgba(0, 0, 0, " + (lightField ? 0.2 : 0.26) + ")";
      c.fillRect(0, h - 2.6 - weight, w, 2.6 + weight);
      paintKind(c, brick, hi, lo, w, h);
      c.restore();

      roundPath(c, 0.5, 0.5, w - 1, h - 1, rad - 0.4);
      c.strokeStyle = css(outline, 0.95);
      c.lineWidth = 0.9 + 0.35 * weight;
      c.stroke();
      roundPath(c, 1.6, 1.6, w - 3.2, h - 3.2, rad - 0.8);
      c.strokeStyle = "rgba(255, 255, 255, " + (lightField ? 0.12 : 0.16) + ")";
      c.lineWidth = 0.6;
      c.stroke();

      /* the mark is carved, not printed: a dark seat one pixel down, then ink */
      c.font =
        "700 " +
        (8.4 + 3.6 * weight).toFixed(1) +
        "px 'JetBrains Mono', ui-monospace, monospace";
      c.textAlign = "center";
      c.textBaseline = "middle";
      var mark = brick.kind === "x" ? "\u2620" : brick.glyph;
      c.fillStyle = "rgba(0, 0, 0, 0.5)";
      c.fillText(mark, w / 2, h / 2 + 1.4);
      c.fillStyle = lightField ? "rgba(255, 255, 255, 0.9)" : "rgba(255, 255, 255, 0.96)";
      c.fillText(mark, w / 2, h / 2 + 0.4);

      if (brick.hp > 1) {
        /* hit points as pips, so a tough tile is counted and not just tinted */
        for (var pip = 0; pip < brick.hp; pip += 1) {
          c.beginPath();
          c.arc(w - 3.4 - pip * 3, 3.1, 1.1, 0, Math.PI * 2);
          c.fillStyle = "rgba(255, 255, 255, 0.85)";
          c.fill();
        }
      }
    }

    /* Each kind carries a shape as well as a colour, which is what keeps the
     * wall legible when two rows share a tint. */
    function paintKind(c, brick, hi, lo, w, h) {
      var mid = h / 2;
      var i;
      if (brick.kind === "t") {
        roundPath(c, 2, mid - 2.4, w - 4, 4.8, 2);
        c.fillStyle = "rgba(255, 255, 255, 0.14)";
        c.fill();
        c.strokeStyle = css(blend(hi, [255, 255, 255], 0.4), 0.5);
        c.lineWidth = 0.6;
        c.stroke();
        for (i = 0; i < 2; i += 1) {
          c.beginPath();
          c.arc(i === 0 ? 4.2 : w - 4.2, mid, 1.3, 0, Math.PI * 2);
          c.fillStyle = css(hi, 0.9);
          c.fill();
          c.beginPath();
          c.arc(i === 0 ? 4.2 : w - 4.2, mid, 0.5, 0, Math.PI * 2);
          c.fillStyle = css(lo, 0.9);
          c.fill();
        }
        if (brick.hp === 1) {
          /* a tile that already took a hit shows the crack it earned */
          c.strokeStyle = "rgba(0, 0, 0, 0.5)";
          c.lineWidth = 0.7;
          c.beginPath();
          c.moveTo(w * 0.34, 1.6);
          c.lineTo(w * 0.4, mid);
          c.lineTo(w * 0.3, h - 1.6);
          c.moveTo(w * 0.68, 1.8);
          c.lineTo(w * 0.62, mid + 1);
          c.stroke();
        }
      } else if (brick.kind === "x") {
        c.strokeStyle = "rgba(255, 226, 130, 0.75)";
        c.lineWidth = 0.9;
        for (i = 0; i < 4; i += 1) {
          var cx = i < 2 ? 3.2 : w - 3.2;
          var cy = i % 2 === 0 ? 3 : h - 3;
          c.beginPath();
          c.moveTo(cx - 1.6, cy);
          c.lineTo(cx + 1.6, cy);
          c.moveTo(cx, cy - 1.6);
          c.lineTo(cx, cy + 1.6);
          c.stroke();
        }
      } else if (brick.kind === "s") {
        c.strokeStyle = "rgba(255, 255, 255, 0.5)";
        c.lineWidth = 0.7;
        c.beginPath();
        c.moveTo(5, h - 3);
        c.quadraticCurveTo(5, h - 7, 8.5, h - 7.5);
        c.quadraticCurveTo(6.5, h - 4.5, 5, h - 3);
        c.moveTo(5, h - 3);
        c.quadraticCurveTo(4, h - 7.5, 1, h - 8);
        c.stroke();
      } else if (brick.kind === "g") {
        c.strokeStyle = "rgba(255, 255, 255, 0.2)";
        c.lineWidth = 0.8;
        c.beginPath();
        for (i = 0; i < 6; i += 1) {
          c.moveTo(i * 7 - h, h);
          c.lineTo(i * 7, 0);
        }
        c.stroke();
      }
    }

    /* ------------------------------------------------------------ field fx */
    function pushTrail() {
      if (motionOffField()) {
        return;
      }
      trail.push({ x: ball.x, y: ball.y });
      if (trail.length > brkTrailMax) {
        trail.shift();
      }
    }

    function pushBurst(x, y, tint, count, opts) {
      if (motionOffField()) {
        return;
      }
      var o = opts || {};
      var power = o.power || 1.5;
      for (var i = 0; i < count; i += 1) {
        if (sparks.length >= brkSparkMax) {
          sparks.shift();
        }
        var angle = Math.random() * Math.PI * 2;
        var speed = (0.4 + Math.random() * 1.4) * power;
        sparks.push({
          x: x,
          y: y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - (o.lift || 0.4),
          g: o.g === undefined ? 0.055 : o.g,
          life: 20 + Math.random() * 22,
          max: 42,
          size: 0.9 + Math.random() * 1.5,
          rot: Math.random() * Math.PI,
          spin: (Math.random() - 0.5) * 0.4,
          color: i % 4 === 0 ? "rgba(255,255,255,0.95)" : css(tint, 0.95),
          ch: o.marks && i < 2 ? o.marks : "",
        });
      }
    }

    function pushRing(x, y, radius, grow, life, color, width) {
      if (motionOffField()) {
        return;
      }
      rings.push({
        x: x,
        y: y,
        r: radius,
        vr: grow,
        life: life,
        max: life,
        color: color,
        w: width || 1,
      });
    }

    function pushFloat(x, y, text, kind) {
      if (motionOffField()) {
        return;
      }
      floats.push({
        x: x,
        y: y,
        text: text,
        kind: kind || "good",
        life: 48,
        max: 48,
      });
    }

    function joltTable(power) {
      if (motionOffField()) {
        return;
      }
      shake = Math.max(shake, power);
    }

    /* A rail strike leaves a mark: the bar it hit lights up and sheds a few
     * flecks along it, so the boundary reads as solid. A ball grinding down a
     * wall must not turn that into a machine gun, so the beat needs a cold rail. */
    function strikeRail(which, x, y) {
      var cold = railFlash[which] < 0.4;
      railFlash[which] = 1;
      if (!cold) {
        return;
      }
      if (ticks - lastRailSound >= 4) {
        lastRailSound = ticks;
        sound("tick");
      }
      pushBurst(x, y, blend(rowTint(which), [255, 255, 255], 0.5), 3, {
        power: 0.85,
        g: 0.03,
      });
    }

    function clearFieldFx() {
      trail.length = 0;
      sparks.length = 0;
      floats.length = 0;
      rings.length = 0;
      shake = 0;
      paddleSquash = 0;
      paddleHeat = 0;
      comboPop = 0;
      lastSmashSound = -9;
      lastRailSound = -9;
      ghostWas = ghostSolid() ? 1 : 0;
      railFlash[0] = railFlash[1] = railFlash[2] = 0;
    }

    function stepFx() {
      var i;
      for (i = sparks.length - 1; i >= 0; i -= 1) {
        var spark = sparks[i];
        spark.life -= 1;
        if (spark.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        spark.x += spark.vx;
        spark.y += spark.vy;
        spark.vy += spark.g;
        spark.vx *= 0.985;
        spark.vy *= 0.985;
        spark.rot += spark.spin;
      }
      for (i = floats.length - 1; i >= 0; i -= 1) {
        var float = floats[i];
        float.life -= 1;
        float.y -= 0.55;
        if (float.life <= 0) {
          floats.splice(i, 1);
        }
      }
      for (i = rings.length - 1; i >= 0; i -= 1) {
        var ring = rings[i];
        ring.life -= 1;
        ring.r += ring.vr;
        if (ring.life <= 0) {
          rings.splice(i, 1);
        }
      }
      for (i = 0; i < motes.length; i += 1) {
        var mote = motes[i];
        mote.x += mote.vx;
        mote.y += mote.vy;
        if (mote.x < 0) {
          mote.x += brkW;
        } else if (mote.x > brkW) {
          mote.x -= brkW;
        }
        if (mote.y < 0) {
          mote.y += brkH;
        } else if (mote.y > brkH) {
          mote.y -= brkH;
        }
      }
      var landed = 0;
      for (i = bricks.length - 1; i >= 0; i -= 1) {
        var brick = bricks[i];
        if (brick.flash > 0) {
          brick.flash -= 0.09;
        }
        if (brick.in >= 1) {
          continue;
        }
        if (brick.delay > 0) {
          brick.delay -= 1;
          continue;
        }
        brick.in = Math.min(1, brick.in + 1 / brkDealBeats);
        if (brick.in >= 1) {
          landed += 1;
          pushRing(
            brick.x + brkBrickW / 2,
            brick.y + brkBrickH / 2,
            2,
            0.55,
            11,
            css(rowTint(brick.row), 0.5),
            0.8,
          );
        }
      }
      if (landed > 0) {
        sound("place");
      }
      if (shake > 0.04) {
        shake *= 0.87;
      } else {
        shake = 0;
      }
      paddleSquash = paddleSquash > 0.02 ? paddleSquash * 0.82 : 0;
      paddleHeat = paddleHeat > 0.02 ? paddleHeat * 0.94 : 0;
      comboPop = comboPop > 0.02 ? comboPop * 0.9 : 0;
      for (i = 0; i < railFlash.length; i += 1) {
        railFlash[i] = railFlash[i] > 0.02 ? railFlash[i] * 0.9 : 0;
      }
      ballPulse += calmField() ? 0.06 : 0.12;
    }

    /* ---------------------------------------------------------------- paint */
    function paintBackdrop() {
      var wash = ctx.createLinearGradient(0, 0, 0, brkH);
      wash.addColorStop(0, pal.washTop);
      wash.addColorStop(1, pal.washBot);
      ctx.fillStyle = wash;
      ctx.fillRect(0, 0, brkW, brkH);

      /* a lamp over the wall so the table has a light source */
      var lamp = ctx.createRadialGradient(
        brkW / 2,
        brkTop - 6,
        4,
        brkW / 2,
        brkTop - 6,
        brkW * 0.72,
      );
      lamp.addColorStop(0, pal.accent(lightField ? 70 : 66, lightField ? 0.2 : 0.24));
      lamp.addColorStop(1, pal.accent(60, 0));
      ctx.fillStyle = lamp;
      ctx.fillRect(0, 0, brkW, brkH);

      ctx.strokeStyle = pal.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (var x = 12; x < brkW; x += 16) {
        ctx.moveTo(x, 2);
        ctx.lineTo(x, brkH - 2);
      }
      for (var y = 12; y < brkH; y += 16) {
        ctx.moveTo(2, y);
        ctx.lineTo(brkW - 2, y);
      }
      ctx.stroke();

      /* the game's own name, watermarked into the felt - no chrome needed */
      ctx.font = "800 30px 'JetBrains Mono', ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = pal.watermark;
      ctx.fillText(t("tabBreakout"), brkW / 2, brkPaddleY - 34);

      paintDrain();
      paintRails();
    }

    /* Where the ball is lost gets a marked edge, so the danger line is a shape
     * (teeth) and not only a colour. */
    function paintDrain() {
      var top = brkPaddleY + brkPaddleH + 3;
      var band = ctx.createLinearGradient(0, top, 0, brkH);
      band.addColorStop(0, pal.danger(0));
      band.addColorStop(1, pal.danger(lives <= 1 && state === "live" ? 0.3 : 0.13));
      ctx.fillStyle = band;
      ctx.fillRect(0, top, brkW, brkH - top);
      ctx.strokeStyle = pal.danger(lives <= 1 ? 0.5 : 0.26);
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      for (var tooth = 4; tooth < brkW; tooth += 12) {
        ctx.moveTo(tooth, brkH - 4);
        ctx.lineTo(tooth + 3, brkH - 8);
        ctx.lineTo(tooth + 6, brkH - 4);
      }
      ctx.stroke();
    }

    /* The side and top rails flash where the ball just struck them. */
    function paintRails() {
      var rails = [
        { i: 0, x: 0, y: 0, w: 3, h: brkH },
        { i: 1, x: brkW - 3, y: 0, w: 3, h: brkH },
        { i: 2, x: 0, y: 0, w: brkW, h: 3 },
      ];
      for (var r = 0; r < rails.length; r += 1) {
        var rail = rails[r];
        var hot = railFlash[rail.i];
        ctx.fillStyle = pal.accent(lightField ? 44 : 70, 0.16 + hot * 0.6);
        ctx.fillRect(rail.x, rail.y, rail.w, rail.h);
      }
      roundPath(ctx, 1, 1, brkW - 2, brkH - 2, 7);
      ctx.strokeStyle = pal.edge;
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }

    function paintMotes() {
      for (var i = 0; i < motes.length; i += 1) {
        var mote = motes[i];
        ctx.beginPath();
        ctx.arc(mote.x, mote.y, mote.r, 0, Math.PI * 2);
        ctx.fillStyle = pal.mote;
        ctx.globalAlpha = 0.35 + 0.65 * mote.k;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    function paintBricks() {
      for (var index = 0; index < bricks.length; index += 1) {
        var brick = bricks[index];
        var phantom = brick.kind === "g" && !ghostSolid();
        var land = brick.in >= 1 ? 1 : Math.max(0, brick.in);
        var drop = land < 1 ? (1 - easeOut(land)) * brkDealRise : 0;
        var scale = brick.grow && land < 1 ? 0.5 + 0.5 * land : 1;
        ctx.globalAlpha =
          (phantom ? 0.22 : 1) * (land < 1 ? 0.25 + 0.75 * land : 1);
        var w = brkBrickW * scale;
        var h = brkBrickH * scale;
        var ox = brick.x - (w - brkBrickW) / 2;
        var oy = brick.y - (h - brkBrickH) / 2 + drop;
        ctx.drawImage(
          tileSprite(brick),
          ox - brkTilePad,
          oy - brkTilePad,
          w + brkTilePad * 2,
          h + brkTilePad * 2,
        );
        ctx.globalAlpha = 1;
        if (brick.flash > 0) {
          roundPath(ctx, ox, oy, w, h, 3);
          ctx.fillStyle = "rgba(255, 255, 255, " + Math.min(0.7, brick.flash) + ")";
          ctx.fill();
        }
        if (brick.kind === "d") {
          /* drift tiles carry the direction they will take on the next push */
          ctx.strokeStyle = "rgba(255, 255, 255, 0.62)";
          ctx.lineWidth = 0.9;
          ctx.beginPath();
          for (var chev = 0; chev < 2; chev += 1) {
            var cx = brick.dir > 0 ? brick.x + w - 6 - chev * 3 : brick.x + 6 + chev * 3;
            var tip = brick.dir > 0 ? 2.4 : -2.4;
            ctx.moveTo(cx - tip, brick.y + 3.4);
            ctx.lineTo(cx, brick.y + h / 2);
            ctx.lineTo(cx - tip, brick.y + h - 3.4);
          }
          ctx.stroke();
        }
        if (brick.kind === "x") {
          var beat = 0.3 + 0.28 * Math.abs(Math.sin(ballPulse));
          roundPath(ctx, ox + 1.5, oy + 1.5, w - 3, h - 3, 3);
          ctx.strokeStyle = "rgba(255, 214, 120, " + beat + ")";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        if (phantom) {
          roundPath(ctx, brick.x + 1, brick.y + 1, brkBrickW - 2, brkBrickH - 2, 3);
          ctx.setLineDash([3, 3]);
          ctx.strokeStyle = pal.accent(lightField ? 42 : 74, 0.5);
          ctx.lineWidth = 0.9;
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }

    function paintTrail() {
      if (trail.length < 2) {
        return;
      }
      for (var i = 0; i < trail.length; i += 1) {
        var k = (i + 1) / trail.length;
        ctx.beginPath();
        ctx.arc(trail[i].x, trail[i].y, brkBallR * (0.24 + 0.78 * k), 0, Math.PI * 2);
        ctx.fillStyle = pal.trail(0.05 + 0.4 * k * k);
        ctx.fill();
      }
    }

    function paintRings() {
      for (var i = 0; i < rings.length; i += 1) {
        var ring = rings[i];
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
        ctx.strokeStyle = ring.color.replace(/[\d.]+\)$/, (ring.life / ring.max) * 0.9 + ")");
        ctx.lineWidth = ring.w;
        ctx.stroke();
      }
    }

    function paintSparks() {
      for (var i = 0; i < sparks.length; i += 1) {
        var spark = sparks[i];
        var alpha = Math.min(1, spark.life / (spark.max * 0.5));
        if (spark.ch) {
          ctx.save();
          ctx.translate(spark.x, spark.y);
          ctx.rotate(spark.rot);
          ctx.font = "700 7px 'JetBrains Mono', ui-monospace, monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.globalAlpha = alpha;
          ctx.fillStyle = spark.color;
          ctx.fillText(spark.ch, 0, 0);
          ctx.restore();
          ctx.globalAlpha = 1;
          continue;
        }
        ctx.strokeStyle = spark.color;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = spark.size;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(spark.x, spark.y);
        ctx.lineTo(spark.x - spark.vx * 1.8, spark.y - spark.vy * 1.8);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.lineCap = "butt";
    }

    function paintBall() {
      var pulse = state === "ready" ? 0.5 + 0.5 * Math.sin(ballPulse) : 0;
      var halo = ctx.createRadialGradient(ball.x, ball.y, 0.5, ball.x, ball.y, brkBallR * 4.2);
      halo.addColorStop(0, pal.accent(lightField ? 60 : 82, 0.4 + pulse * 0.25));
      halo.addColorStop(1, pal.accent(60, 0));
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, brkBallR * 4.2, 0, Math.PI * 2);
      ctx.fill();

      var core = ctx.createRadialGradient(
        ball.x - brkBallR * 0.4,
        ball.y - brkBallR * 0.5,
        brkBallR * 0.2,
        ball.x,
        ball.y,
        brkBallR * 1.25,
      );
      core.addColorStop(0, pal.ball);
      core.addColorStop(0.72, pal.ball);
      core.addColorStop(1, pal.ballRim);
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, brkBallR, 0, Math.PI * 2);
      ctx.fillStyle = core;
      ctx.fill();
      ctx.lineWidth = 0.7;
      ctx.strokeStyle = pal.accent(lightField ? 40 : 78, 0.85);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(ball.x - 1, ball.y - 1.1, brkBallR * 0.32, 0, Math.PI * 2);
      ctx.fillStyle = lightField ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.95)";
      ctx.fill();
    }

    /* The paddle is a lacquered bar with capped ends; on a save it squashes wider
     * and shorter, which is the only way a player can feel the contact. */
    function paintPaddle() {
      var squash = paddleSquash;
      var w = brkPaddleW + 8 * squash;
      var h = Math.max(3, brkPaddleH - 1.6 * squash);
      var x = paddleX - (w - brkPaddleW) / 2;
      var y = brkPaddleY + (brkPaddleH - h) / 2 + 0.6 * squash;

      ctx.beginPath();
      ctx.ellipse(
        x + w / 2,
        y + h + 2.2,
        w * 0.48,
        2.1,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = pal.accent(lightField ? 50 : 70, 0.16 + paddleHeat * 0.35);
      ctx.fill();

      roundPath(ctx, x, y, w, h, 2.6);
      var skin = ctx.createLinearGradient(0, y, 0, y + h);
      skin.addColorStop(0, pal.plateTop);
      skin.addColorStop(0.45, pal.plateMid);
      skin.addColorStop(1, pal.plateLow);
      ctx.fillStyle = skin;
      ctx.fill();
      ctx.lineWidth = 0.9;
      ctx.strokeStyle = pal.plateEdge;
      ctx.stroke();

      ctx.fillStyle = "rgba(255, 255, 255, " + (lightField ? 0.4 : 0.5) + ")";
      ctx.fillRect(x + 2, y + 0.9, w - 4, 1);
      ctx.fillStyle = pal.accent(lightField ? 46 : 76, 0.5 + paddleHeat * 0.5);
      ctx.fillRect(x + 3, y + h - 0.6, w - 6, 1.1);

      for (var cap = 0; cap < 2; cap += 1) {
        ctx.beginPath();
        ctx.arc(cap === 0 ? x + 1.6 : x + w - 1.6, y + h / 2, 1.9 + squash, 0, Math.PI * 2);
        ctx.fillStyle = pal.plateLow;
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }
    }

    function paintFloats() {
      for (var i = 0; i < floats.length; i += 1) {
        var float = floats[i];
        var k = float.life / float.max;
        ctx.font = "800 10px 'JetBrains Mono', ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.globalAlpha = Math.min(1, k * 2.4);
        var size = 1 + 0.22 * Math.max(0, (1 - k) * 4);
        ctx.save();
        ctx.translate(float.x, float.y);
        ctx.scale(size, size);
        ctx.lineWidth = 2.6;
        ctx.strokeStyle = pal.textBack;
        ctx.strokeText(float.text, 0, 0);
        ctx.fillStyle =
          float.kind === "hot"
            ? "hsl(42, 98%, " + (lightField ? 42 : 62) + "%)"
            : float.kind === "bad"
              ? pal.danger(1)
              : pal.good(1);
        ctx.fillText(float.text, 0, 0);
        ctx.restore();
        ctx.globalAlpha = 1;
      }
    }

    /* Lives are pearls on the table: three full ones, spent ones left as rings,
     * so the count is readable without hunting the HUD. */
    function paintLifePips() {
      for (var i = 0; i < brkLives; i += 1) {
        var px = 8 + i * 9;
        var py = brkH - 9;
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        if (i < lives) {
          ctx.fillStyle = pal.accent(lightField ? 46 : 76, 0.95);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(px - 0.9, py - 1, 0.9, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255,255,255,0.8)";
          ctx.fill();
        } else {
          ctx.strokeStyle = pal.edge;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }

    function paintCombo() {
      if (combo < 2) {
        return;
      }
      var size = 1 + comboPop * 0.4;
      ctx.save();
      ctx.translate(brkW - 10, brkH - 10);
      ctx.scale(size, size);
      ctx.font = "800 12px 'JetBrains Mono', ui-monospace, monospace";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.lineWidth = 3;
      ctx.strokeStyle = pal.textBack;
      var label = "\u00d7" + combo;
      ctx.strokeText(label, 0, 0);
      ctx.fillStyle = combo >= 4
        ? "hsl(42, 98%, " + (lightField ? 40 : 62) + "%)"
        : pal.text;
      ctx.fillText(label, 0, 0);
      ctx.restore();
    }

    /* The waiting state is drawn, not described: an aim guide and a ring that
     * says the ball is loaded and the table is live. */
    function paintReadyHint() {
      if (state !== "ready") {
        return;
      }
      var beat = 0.4 + 0.5 * Math.abs(Math.sin(ballPulse * 0.8));
      ctx.strokeStyle = pal.accent(lightField ? 40 : 78, beat);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, brkBallR + 3 + beat * 2.4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      for (var step = 0; step < 3; step += 1) {
        var gap = 9 + step * 7;
        ctx.moveTo(ball.x - 3, ball.y - gap);
        ctx.lineTo(ball.x, ball.y - gap - 3);
        ctx.lineTo(ball.x + 3, ball.y - gap);
      }
      ctx.strokeStyle = pal.accent(lightField ? 44 : 82, 0.55);
      ctx.stroke();
    }

    function draw() {
      refreshTheme();
      ctx.clearRect(0, 0, brkW, brkH);
      ctx.save();
      if (shake > 0) {
        ctx.translate((Math.random() * 2 - 1) * shake, (Math.random() * 2 - 1) * shake * 0.7);
      }
      paintBackdrop();
      paintMotes();
      paintBricks();
      paintRings();
      paintSparks();
      paintTrail();
      paintBall();
      paintPaddle();
      paintFloats();
      paintLifePips();
      paintCombo();
      paintReadyHint();
      ctx.restore();
    }

    function stopLoop() {
      window.clearInterval(intervalId);
      intervalId = null;
    }

    function startLoop() {
      if (intervalId === null) {
        intervalId = window.setInterval(tick, brkTickMs);
      }
    }

    function endRun() {
      stopLoop();
      running = false;
      state = "idle";
      resultEl.textContent = t("brkOver", { n: score });
      markResult(resultEl, "lose");
      logAction(t("logBrk", { n: score }));
      petNotifyGame(false);
      draw();
      domFx("flash", canvas, { hue: 356 });
      setChip(livesEl, "warn");
      setChip(scoreEl, "good");
      domFx("ceremony", panel, {
        tone: "lose",
        stars: 0,
        title: t("brkOver", { n: score }),
        lines: [t("campaignStars", {
          n: campaign.totalStars(),
          max: campaign.maxStars(),
        }), t("btnTryAgain")],
      });
      domFx("sweep", startBtn);
    }

    function levelCleared() {
      var starsWon = lives >= 3 ? 3 : lives === 2 ? 2 : 1;
      var outcome = campaign.record(level.id, {
        stars: starsWon,
        best: score,
        better: "high",
      });
      var message = t("brkCleared", {
        name: t(level.labelKey),
        s: starsWon,
      });
      if (outcome.isBest) {
        message += " " + t("newBest");
      }
      if (outcome.unlockedNext) {
        message += " " + t("brkNextLevel");
      } else if (campaign.clearedCount() === brkLevels.length) {
        message += " " + t("brkCampaignDone");
      }
      resultEl.textContent = message;
      markResult(resultEl, "win");
      logAction(t("logBrk", { n: score }));
      var rect = startBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      joltTable(2.4);
      pushRing(brkW / 2, brkPaddleY - 40, 6, 3.4, 30, pal.accent(lightField ? 46 : 80, 0.8), 2);
      var finalScore = score;
      var nextId = outcome.unlockedNext || level.id;
      domFx("pop", scoreEl, { scale: 1.16, ms: 300 });
      setChip(scoreEl, "");
      buildLevel(brkLevels[campaign.indexOf(nextId)], true);
      state = "ready";
      running = true;
      startLoop();
      draw();
      domFx("ceremony", panel, {
        tone: "clear",
        stars: starsWon,
        title: message,
        lines: [t("logBrk", { n: finalScore })],
      });
      domFx("pop", levelEl, { scale: 1.16, ms: 300 });
      domFx("sweep", startBtn);
    }

    function brickAt(col, row) {
      return bricks.some(function (brick) {
        return brick.col === col && brick.row === row;
      });
    }

    function smash(brick, chainExploders) {
      var index = bricks.indexOf(brick);
      if (index === -1) {
        return;
      }
      bricks.splice(index, 1);
      var gained = 10 + combo;
      score += gained;
      combo += 1;
      scoreEl.textContent = String(score);
      var cx = brick.x + brkBrickW / 2;
      var cy = brick.y + brkBrickH / 2;
      var tint = rowTint(brick.row);
      var big = brick.kind === "x";
      pushBurst(cx, cy, tint, big ? 22 : calmField() ? 7 : 13, {
        power: big ? 2.6 : 1.6,
        marks: brick.kind === "x" ? "" : brick.glyph,
      });
      pushRing(cx, cy, 3, big ? 2.6 : 1.3, big ? 26 : 18, css(tint, 0.9), big ? 2 : 1.2);
      pushFloat(cx, cy, "+" + gained, combo >= 3 ? "hot" : "good");
      if (combo >= 2) {
        comboPop = 1;
      }
      if (ticks - lastSmashSound >= 3) {
        lastSmashSound = ticks;
        sound(big ? "explode" : "pop");
        domFx("pop", scoreEl, { scale: combo >= 3 ? 1.24 : 1.12, ms: 220 });
      }
      if (brick.kind === "s") {
        /* the seed re-sprouts one storey up, left and right */
        [-1, 1].forEach(function (offset) {
          var col = brick.col + offset;
          var row = brick.row - 1;
          if (col >= 0 && col < brkCols && row >= 0 && !brickAt(col, row)) {
            var sprout = makeBrick(col, row, "n");
            if (!motionOffField()) {
              sprout.in = 0;
              sprout.grow = true;
            }
            bricks.push(sprout);
            sound("place");
            pushRing(
              sprout.x + brkBrickW / 2,
              sprout.y + brkBrickH / 2,
              1,
              0.7,
              14,
              css(rowTint(row), 0.8),
              1,
            );
          }
        });
      }
      if (brick.kind === "x" && chainExploders) {
        var blast = bricks.filter(function (other) {
          return (
            Math.abs(other.col - brick.col) <= 1 &&
            Math.abs(other.row - brick.row) <= 1
          );
        });
        blast.forEach(function (other) {
          smash(other, other.kind !== "x");
        });
        /* an exploder takes its neighbours, so it takes the table with it */
        joltTable(2.6);
      }
    }

    function loseBall() {
      lives -= 1;
      livesEl.textContent = String(lives);
      combo = 0;
      /* the table feels the drop: shake, splash, chip and voice on one beat */
      joltTable(lives <= 0 ? 7 : 4);
      sound("miss");
      pushBurst(ball.x, brkH - 6, blend(rowTint(0), [255, 255, 255], 0.3), 10, {
        power: 1.4,
        g: -0.01,
      });
      pushRing(ball.x, brkH - 3, 3, 2, 24, pal.danger(0.85), 1.6);
      domFx("jolt", canvas, { dist: lives <= 0 ? 7 : 5 });
      domFx("shake", livesEl, { dist: 5, kind: "y" });
      setChip(livesEl, lives <= 1 ? "warn" : "");
      if (lives <= 0) {
        endRun();
        return;
      }
      state = "ready";
      placeBallOnPaddle();
      resultEl.textContent = t("brkLifeLost", { n: lives });
      markResult(resultEl, "");
    }

    function stepBall() {
      ball.x += ball.vx / brkSubSteps;
      ball.y += ball.vy / brkSubSteps;
      pushTrail();

      if (ball.x - brkBallR <= 0) {
        ball.x = brkBallR;
        ball.vx = Math.abs(ball.vx);
        strikeRail(0, ball.x, ball.y);
      } else if (ball.x + brkBallR >= brkW) {
        ball.x = brkW - brkBallR;
        ball.vx = -Math.abs(ball.vx);
        strikeRail(1, ball.x, ball.y);
      }
      if (ball.y - brkBallR <= 0) {
        ball.y = brkBallR;
        ball.vy = Math.abs(ball.vy);
        strikeRail(2, ball.x, ball.y);
      }

      if (
        ball.vy > 0 &&
        ball.y + brkBallR >= brkPaddleY &&
        ball.y - brkBallR < brkPaddleY + brkPaddleH &&
        ball.x >= paddleX - brkBallR &&
        ball.x <= paddleX + brkPaddleW + brkBallR
      ) {
        var rel = (ball.x - (paddleX + brkPaddleW / 2)) / (brkPaddleW / 2);
        rel = Math.max(-1, Math.min(1, rel));
        var angle = -Math.PI / 2 + rel * 1.05;
        ball.vy = Math.sin(angle) * level.speed;
        ball.vx = Math.cos(angle) * level.speed;
        combo = 0;
        driftBricks();
        /* the save is the loudest touch in the game: the bar flattens, spits ink
         * and glows, and a drift wall shifts under it */
        paddleSquash = 1;
        paddleHeat = Math.min(1, paddleHeat + 0.65);
        sound("tap");
        pushBurst(ball.x, brkPaddleY, blend(rowTint(0), [255, 255, 255], 0.6), calmField() ? 3 : 6, {
          power: 1.1,
          g: 0.02,
        });
        pushRing(ball.x, brkPaddleY + 1, 2, 1.1, 14, pal.accent(lightField ? 46 : 82, 0.7), 1);
      }

      for (var index = bricks.length - 1; index >= 0; index -= 1) {
        var brick = bricks[index];
        if (brick.kind === "g" && !ghostSolid()) {
          continue;
        }
        if (
          ball.x + brkBallR > brick.x &&
          ball.x - brkBallR < brick.x + brkBrickW &&
          ball.y + brkBallR > brick.y &&
          ball.y - brkBallR < brick.y + brkBrickH
        ) {
          var pushUp = ball.y + brkBallR - brick.y;
          var pushDown = brick.y + brkBrickH - (ball.y - brkBallR);
          var pushLeft = ball.x + brkBallR - brick.x;
          var pushRight = brick.x + brkBrickW - (ball.x - brkBallR);
          var minPush = Math.min(pushUp, pushDown, pushLeft, pushRight);
          if (minPush === pushUp) {
            ball.y = brick.y - brkBallR;
            ball.vy = -Math.abs(ball.vy);
          } else if (minPush === pushDown) {
            ball.y = brick.y + brkBrickH + brkBallR;
            ball.vy = Math.abs(ball.vy);
          } else if (minPush === pushLeft) {
            ball.x = brick.x - brkBallR;
            ball.vx = -Math.abs(ball.vx);
          } else {
            ball.x = brick.x + brkBrickW + brkBallR;
            ball.vx = Math.abs(ball.vx);
          }
          if (brick.hp > 1) {
            brick.hp -= 1;
            /* chipped, not broken: the tile shakes and the cracked plate bakes
             * itself under its new hit count */
            brick.flash = 1;
            sound("hit");
            pushBurst(
              brick.x + brkBrickW / 2,
              brick.y + brkBrickH / 2,
              rowTint(brick.row),
              calmField() ? 3 : 6,
              { power: 1.1, marks: "" },
            );
            pushRing(ball.x, ball.y, 2, 0.9, 12, css(rowTint(brick.row), 0.8), 1);
          } else {
            smash(brick, true);
          }
          break;
        }
      }

      if (bricks.length === 0) {
        levelCleared();
        return;
      }

      if (ball.y - brkBallR > brkH) {
        loseBall();
      }
    }

    function driftBricks() {
      bricks.forEach(function (brick) {
        if (brick.kind !== "d") {
          return;
        }
        brick.col += brick.dir;
        if (brick.col <= 0 || brick.col >= brkCols - 1) {
          brick.dir = -brick.dir;
        }
        brick.x = brickX(brick.col);
      });
    }

    function tick() {
      if (!running) {
        return;
      }
      ticks += 1;
      if (keysDown.ArrowLeft) {
        paddleX -= 4.4;
      }
      if (keysDown.ArrowRight) {
        paddleX += 4.4;
      }
      paddleX = Math.max(0, Math.min(brkW - brkPaddleW, paddleX));
      if (state === "ready") {
        placeBallOnPaddle();
      } else if (state === "live") {
        for (var step = 0; step < brkSubSteps; step += 1) {
          if (state !== "live") {
            break;
          }
          stepBall();
        }
      }
      /* the ghost wall's phase flip is a beat in itself - one voice per flip,
       * never per frame, and only if there is a ghost wall on the table */
      var phase = ghostSolid() ? 1 : 0;
      if (phase !== ghostWas) {
        ghostWas = phase;
        if (state === "live" && hasGhostBrick()) {
          sound("flip");
        }
      }
      stepFx();
      draw();
    }

    function hasGhostBrick() {
      return bricks.some(function (brick) {
        return brick.kind === "g";
      });
    }

    function startGame(levelDef) {
      stopLoop();
      buildLevel(
        levelDef || brkLevels[campaign.indexOf(campaign.nextLevelId())],
        true,
      );
      state = "ready";
      running = true;
      pausedByHide = false;
      ticks = 0;
      ballPulse = 0;
      resultEl.textContent = t("brkLaunch");
      markResult(resultEl, "");
      setChip(livesEl, "");
      setChip(scoreEl, "");
      sound("select");
      startLoop();
      draw();
      canvas.focus();
    }

    function canvasX(clientX) {
      var rect = canvas.getBoundingClientRect();
      var ratio = brkW / (rect.width || brkW);
      return (clientX - rect.left) * ratio;
    }

    canvas.addEventListener("pointermove", function (event) {
      var next = Math.max(
        0,
        Math.min(brkW - brkPaddleW, canvasX(event.clientX) - brkPaddleW / 2),
      );
      /* a dragged bar leaves a little heat on the felt */
      if (Math.abs(next - paddleX) > 1.2) {
        paddleHeat = Math.min(1, paddleHeat + 0.08);
      }
      paddleX = next;
    });

    canvas.addEventListener("click", function () {
      if (state === "ready") {
        launch();
      }
    });

    canvas.addEventListener("keydown", function (event) {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        keysDown[event.key] = true;
        event.preventDefault();
      } else if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        if (state === "ready") {
          launch();
        }
      }
    });

    canvas.addEventListener("keyup", function (event) {
      keysDown[event.key] = false;
    });

    function handleVisibility() {
      if (!running) {
        return;
      }
      if (document.hidden || panel.hidden) {
        if (intervalId !== null) {
          pausedByHide = true;
          stopLoop();
        }
      } else if (pausedByHide) {
        pausedByHide = false;
        startLoop();
      }
    }

    document.addEventListener("visibilitychange", handleVisibility);

    selectEl.addEventListener("change", function () {
      var index = campaign.indexOf(selectEl.value);
      if (index >= 0 && campaign.isUnlocked(selectEl.value)) {
        startGame(brkLevels[index]);
      }
    });

    startBtn.addEventListener("click", function () {
      startGame();
    });

    App.quietResetBreakout = function () {
      if (running) {
        stopLoop();
        running = false;
        pausedByHide = false;
        state = "idle";
        clearFieldFx();
        markResult(resultEl, "");
        setChip(livesEl, "");
        setChip(scoreEl, "");
        placeBallOnPaddle();
        draw();
        resultEl.textContent = t("brkPrompt");
      }
    };

    /* The table is authored at 320x224 but stretched by the panel, so the backing
     * store takes the pixels the bevels need; the stage is the wrapper the sheet
     * lights, glazes and frames. */
    function mountInkField() {
      var rootEl = document.documentElement;
      lightField = !!(rootEl && rootEl.getAttribute("data-theme") === "light");
      readPanelHue();
      canvas.width = brkW * brkInkScale;
      canvas.height = brkH * brkInkScale;
      ctx.scale(brkInkScale, brkInkScale);
      if (canvas.parentNode && canvas.parentNode.insertBefore) {
        var stage = document.createElement("div");
        stage.className = "brk-stage";
        canvas.parentNode.insertBefore(stage, canvas);
        stage.appendChild(canvas);
      }
      var seeds = calmField() ? 6 : 14;
      for (var i = 0; i < seeds; i += 1) {
        motes.push({
          x: Math.random() * brkW,
          y: Math.random() * brkH,
          r: 0.5 + Math.random() * 1.3,
          vx: (Math.random() - 0.5) * 0.14,
          vy: -0.04 - Math.random() * 0.1,
          k: Math.random(),
        });
      }
    }

    mountInkField();
    buildLevel(brkLevels[campaign.indexOf(campaign.nextLevelId())]);
    draw();
    resultEl.textContent = t("brkPrompt");
    domFx("sweep", startBtn);
  }


  /* Exported for the other modules. */
  App.initBreakoutGame = initBreakoutGame;
})(window.CapitalConvert = window.CapitalConvert || {});
