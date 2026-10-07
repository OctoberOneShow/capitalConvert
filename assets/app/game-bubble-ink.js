/* Bubble Ink - The bubble-shooter campaign in the shared game drawer. */
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
  var bubR = 11;
  var bubD = 22;
  var bubRowH = 19;
  var bubRows = 12;
  var bubWidth = 320;
  var bubHeight = 270;
  var bubShooterX = 160;
  var bubShooterY = 252;
  var bubSpeed = 430;
  var bubColors = ["#22d3ee", "#fbbf24", "#f472b6", "#a3e635", "#a78bfa", "#e2e8f0"];
  /* Presentation-only tuning: the ink sprites are baked once per colour and
   * theme at four times the logical size, so 110 glossy spheres cost a blit
   * each instead of a gradient build each. */
  var bubTau = Math.PI * 2;
  var bubInkScale = 4;
  var bubPad = 2;
  var bubTrailMax = 12;
  var bubGuideStep = 4;
  var bubGuideMax = 620;
  var bubDeadlineY = 231.5;
  /* Every spring asks for a score from a shot budget. Fewer colours to
   * match early; star thresholds scale off the target, "high". */
  var bubLevels = [
    { id: "w1", labelKey: "bubL1", target: 350, shots: 30, colors: 4, rows: 4, starGain: [1.4, 1.2, 1] },
    { id: "w2", labelKey: "bubL2", target: 430, shots: 30, colors: 4, rows: 5, starGain: [1.4, 1.2, 1] },
    { id: "w3", labelKey: "bubL3", target: 510, shots: 28, colors: 5, rows: 5, starGain: [1.4, 1.2, 1] },
    { id: "w4", labelKey: "bubL4", target: 590, shots: 28, colors: 5, rows: 6, starGain: [1.4, 1.2, 1] },
    { id: "w5", labelKey: "bubL5", target: 670, shots: 26, colors: 6, rows: 6, starGain: [1.4, 1.2, 1] },
    { id: "w6", labelKey: "bubL6", target: 740, shots: 26, colors: 6, rows: 7, starGain: [1.4, 1.2, 1] },
    { id: "w7", labelKey: "bubL7", target: 810, shots: 24, colors: 6, rows: 7, starGain: [1.4, 1.2, 1] },
    { id: "w8", labelKey: "bubL8", target: 860, shots: 24, colors: 6, rows: 8, starGain: [1.4, 1.2, 1] },
    { id: "w9", labelKey: "bubL9", target: 900, shots: 22, colors: 6, rows: 8, starGain: [1.4, 1.2, 1] },
    { id: "w10", labelKey: "bubL10", target: 940, shots: 20, colors: 6, rows: 8, starGain: [1.4, 1.2, 1] },
    { id: "w11", labelKey: "bubL11", target: 950, shots: 18, colors: 6, rows: 8, starGain: [1.4, 1.2, 1] },
    { id: "w12", labelKey: "bubL12", target: 960, shots: 16, colors: 6, rows: 8, starGain: [1.4, 1.2, 1] },
  ];

  /* ------------------------------------------------------------ colour math */
  /* The bubble inks are fixed (prey keeps its identity, like the serpent's
   * jade), while the well, the launcher and the aim guide take the panel hue
   * from --gp-hue, so the chrome and the field stay one colour. */

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

  function hexHue(hex) {
    var n = parseInt(hex.slice(1), 16);
    var r = ((n >> 16) & 255) / 255;
    var g = ((n >> 8) & 255) / 255;
    var b = (n & 255) / 255;
    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var d = max - min;
    if (d === 0) {
      return 0;
    }
    var h;
    if (max === r) {
      h = ((g - b) / d) % 6;
    } else if (max === g) {
      h = (b - r) / d + 2;
    } else {
      h = (r - g) / d + 4;
    }
    return (h * 60 + 360) % 360;
  }

  var BUB_RGB = bubColors.map(rgbOf);
  var BUB_HUES = bubColors.map(hexHue);

  function bubX(row, col) {
    return 11 + col * bubD + (row % 2 ? 11 : 0);
  }

  function bubY(row) {
    return 11 + row * bubRowH;
  }

  function initBubbleInkGame() {
    var canvas = getElement("bubCanvas");
    var scoreEl = getElement("bubScore");
    var shotsEl = getElement("bubShots");
    var poppedEl = getElement("bubPopped");
    var resultEl = getElement("bubResult");
    var startBtn = getElement("bubStartBtn");
    var bestEl = getElement("bubBest");
    var selectEl = getElement("bubLevelSel");
    if (
      !canvas ||
      !scoreEl ||
      !shotsEl ||
      !poppedEl ||
      !resultEl ||
      !startBtn ||
      !bestEl ||
      !selectEl
    ) {
      return;
    }
    var panel = getElement("gamePanelBubbleInk");

    var ctx = canvas.getContext("2d");
    var campaign = createCampaign({ key: "bubble-ink-campaign", levels: bubLevels });
    var level = bubLevels[0];
    var grid = [];
    var current = 0;
    var next = 1;
    var aim = -Math.PI / 2;
    var flying = null;
    var shots = 0;
    var score = 0;
    var popped = 0;
    var alive = false;
    var lastFrame = 0;
    var particles = [];

    /* Presentation state: pools the draw loop feeds and drains. None of it
     * feeds back into the physics - the grid, the shot and the score above
     * are the game, everything here is how it looks while that happens. */
    var hue = 322;
    var light = false;
    var pal = null;
    var ratio = 1;
    var shown = true;
    var well = null;
    var bubbleSprites = {};
    var trail = [];
    var rings = [];
    var fallers = [];
    var deal = {};
    var dealAt = 0;
    var dealSpan = 840;
    var railFlash = [0, 0];
    var shake = 0;
    var bubTick = 0;
    var lastRailSound = -9;
    var dismissRound = null;
    var anchor = null;
    var frameId = null;

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

    /* The feel layer and the sound bank are optional: each takes its own
     * argument list, and a missing voice must never cost a shot. */
    function eff(name) {
      var lib = App.fx;
      var fn = lib && typeof lib[name] === "function" ? lib[name] : null;
      if (!fn) {
        return null;
      }
      try {
        return fn.apply(lib, Array.prototype.slice.call(arguments, 1));
      } catch (error) {
        return null;
      }
    }

    function sound(name) {
      if (typeof App.playSfx === "function") {
        try {
          App.playSfx(name);
        } catch (error) {
          /* audio is decoration */
        }
      }
    }

    /* A chip's state is a class the shared layer already draws, so a low shot
     * count reads as more than a hue. */
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

    /* A rounded rectangle as a path, so the module never depends on the newer
     * ctx.roundRect being present. */
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

    /* ------------------------------------------------------------- scene */

    function readScene() {
      light = !!(document.documentElement && document.documentElement.getAttribute("data-theme") === "light");
      try {
        var probe = panel && window.getComputedStyle ? window.getComputedStyle(panel) : null;
        var raw = probe && probe.getPropertyValue ? probe.getPropertyValue("--gp-hue") : "";
        var parsed = parseInt(raw, 10);
        if (!isNaN(parsed)) {
          hue = parsed;
        }
      } catch (error) {
        /* the headless harness has no computed styles - the default holds */
      }
      pal = bubPalette(light, hue);
      bubbleSprites = {};
      well = null;
    }

    function bubPalette(isLight, h) {
      var p = { hue: h };
      if (isLight) {
        p.washTop = "hsl(" + h + ", 44%, 93%)";
        p.washBot = "hsl(" + h + ", 36%, 79%)";
        p.dot = "hsla(" + h + ", 50%, 28%, 0.08)";
        p.vignette = "hsla(" + h + ", 42%, 28%, 0.16)";
        p.rim = "hsla(" + h + ", 42%, 28%, 0.42)";
        p.rimLit = "rgba(255, 255, 255, 0.7)";
        p.rimDeep = "hsla(" + h + ", 36%, 22%, 0.4)";
        p.teeth = "hsla(" + h + ", 46%, 28%, 0.3)";
        p.danger = function (a) { return "hsla(356, 82%, 44%, " + a + ")"; };
        p.watermark = "hsla(" + h + ", 46%, 26%, 0.12)";
        p.pedTop = "hsl(" + h + ", 42%, 84%)";
        p.pedLow = "hsl(" + h + ", 36%, 56%)";
        p.pedEdge = "hsla(" + h + ", 40%, 24%, 0.55)";
        p.cradle = "hsla(" + h + ", 44%, 30%, 0.55)";
        p.guide = function (a) { return "hsla(" + h + ", 62%, 28%, " + a + ")"; };
        p.accent = function (a) { return "hsla(" + h + ", 82%, 44%, " + a + ")"; };
      } else {
        p.washTop = "hsl(" + h + ", 28%, 13%)";
        p.washBot = "hsl(" + h + ", 36%, 6%)";
        p.dot = "hsla(" + h + ", 60%, 72%, 0.05)";
        p.vignette = "rgba(0, 0, 0, 0.42)";
        p.rim = "hsla(" + h + ", 62%, 74%, 0.3)";
        p.rimLit = "hsla(" + h + ", 80%, 86%, 0.18)";
        p.rimDeep = "rgba(0, 0, 0, 0.58)";
        p.teeth = "hsla(" + h + ", 70%, 78%, 0.22)";
        p.danger = function (a) { return "hsla(356, 90%, 62%, " + a + ")"; };
        p.watermark = "hsla(" + h + ", 80%, 86%, 0.07)";
        p.pedTop = "hsl(" + h + ", 34%, 34%)";
        p.pedLow = "hsl(" + h + ", 42%, 11%)";
        p.pedEdge = "rgba(0, 0, 0, 0.62)";
        p.cradle = "hsla(" + h + ", 70%, 78%, 0.5)";
        p.guide = function (a) { return "hsla(" + h + ", 85%, 90%, " + a + ")"; };
        p.accent = function (a) { return "hsla(" + h + ", 92%, 74%, " + a + ")"; };
      }
      return p;
    }

    function sizeCanvas() {
      var rect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : null;
      var wide = rect && rect.width ? rect.width : bubWidth;
      var dpr = window.devicePixelRatio || 1;
      var wanted = Math.max(1, Math.min(3, Math.round((wide / bubWidth) * dpr)));
      if (canvas.width !== bubWidth * wanted) {
        canvas.width = bubWidth * wanted;
        canvas.height = bubHeight * wanted;
        well = null;
      }
      ratio = wanted;
    }

    /* The well never changes during a spring, so it is painted once into an
     * offscreen canvas and blitted per frame; only the deadline line and the
     * rails pulse above it. */
    function wellBitmap() {
      var key = (light ? "l" : "d") + "|" + hue + "|" + canvas.width;
      if (well && well.key === key) {
        return well.node;
      }
      var node = document.createElement("canvas");
      node.width = canvas.width;
      node.height = canvas.height;
      var c = node.getContext("2d");
      c.setTransform(ratio, 0, 0, ratio, 0, 0);
      paintWell(c);
      well = { key: key, node: node };
      return node;
    }

    function paintWell(c) {
      var wash = c.createLinearGradient(0, 0, 0, bubHeight);
      wash.addColorStop(0, pal.washTop);
      wash.addColorStop(1, pal.washBot);
      c.fillStyle = wash;
      c.fillRect(0, 0, bubWidth, bubHeight);
      /* a faint ink-dot lattice: texture before any piece is drawn */
      c.fillStyle = pal.dot;
      for (var y = 10; y < bubHeight; y += 16) {
        for (var x = 10; x < bubWidth; x += 16) {
          c.beginPath();
          c.arc(x, y, 0.8, 0, bubTau);
          c.fill();
        }
      }
      /* carved rim: a lit inner edge and a deep outer line on all four sides */
      c.strokeStyle = pal.rimDeep;
      c.lineWidth = 2;
      c.strokeRect(1, 1, bubWidth - 2, bubHeight - 2);
      c.strokeStyle = pal.rim;
      c.lineWidth = 1;
      c.strokeRect(2.5, 2.5, bubWidth - 5, bubHeight - 5);
      c.strokeStyle = pal.rimLit;
      c.beginPath();
      c.moveTo(3, bubHeight - 3);
      c.lineTo(3, 3);
      c.lineTo(bubWidth - 3, 3);
      c.stroke();
      /* ceiling teeth: the top edge is the deadline's mirror, and the shape
       * says so without a word */
      c.strokeStyle = pal.teeth;
      c.lineWidth = 1.2;
      c.lineJoin = "round";
      c.beginPath();
      for (var tx = 12; tx < bubWidth - 8; tx += 16) {
        c.moveTo(tx, 4);
        c.lineTo(tx + 3.2, 7.6);
        c.lineTo(tx + 6.4, 4);
      }
      c.stroke();
      /* the deadline pool: everything below the line is lost ink */
      var band = c.createLinearGradient(0, bubDeadlineY, 0, bubHeight);
      band.addColorStop(0, pal.danger(0));
      band.addColorStop(1, pal.danger(0.2));
      c.fillStyle = band;
      c.fillRect(0, bubDeadlineY, bubWidth, bubHeight - bubDeadlineY);
      c.strokeStyle = pal.danger(0.4);
      c.lineWidth = 1;
      c.beginPath();
      for (var bx = 6; bx < bubWidth - 4; bx += 12) {
        c.moveTo(bx, bubHeight - 4);
        c.lineTo(bx + 3, bubHeight - 8);
        c.lineTo(bx + 6, bubHeight - 4);
      }
      c.stroke();
      /* the game's own name, watermarked into the well */
      c.font = "800 24px 'JetBrains Mono', ui-monospace, monospace";
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillStyle = pal.watermark;
      c.fillText(t("tabBubbleInk"), bubWidth / 2, 198);
      var shade = c.createRadialGradient(
        bubWidth / 2,
        bubHeight * 0.4,
        bubWidth * 0.2,
        bubWidth / 2,
        bubHeight / 2,
        bubWidth * 0.85,
      );
      shade.addColorStop(0, "rgba(0, 0, 0, 0)");
      shade.addColorStop(1, pal.vignette);
      c.fillStyle = shade;
      c.fillRect(0, 0, bubWidth, bubHeight);
    }

    /* ---------------------------------------------------------- the ink */

    function bubbleSprite(color) {
      var key = color + "|" + (light ? "l" : "d");
      var cached = bubbleSprites[key];
      if (cached) {
        return cached;
      }
      var rgb = BUB_RGB[color] || BUB_RGB[0];
      var hi = blend(rgb, [255, 255, 255], light ? 0.52 : 0.38);
      var lo = blend(rgb, light ? [48, 30, 60] : [6, 8, 18], light ? 0.4 : 0.55);
      var ink = light ? "rgba(40, 24, 54, 0.5)" : "rgba(3, 6, 14, 0.62)";
      var node = document.createElement("canvas");
      var size = (bubR + bubPad) * 2 * bubInkScale;
      node.width = size;
      node.height = size;
      var g = node.getContext("2d");
      g.scale(bubInkScale, bubInkScale);
      g.translate(bubR + bubPad, bubR + bubPad);
      /* a cast shadow baked into the sprite, so the wall sits on the felt */
      g.save();
      g.shadowColor = light ? "rgba(40, 24, 54, 0.35)" : "rgba(0, 0, 0, 0.55)";
      g.shadowBlur = 1.6;
      g.shadowOffsetY = 1.2;
      g.beginPath();
      g.arc(0, 0, bubR - 0.4, 0, bubTau);
      g.fillStyle = css(lo, 1);
      g.fill();
      g.restore();
      /* the sphere: one offset radial gradient does the shading */
      var body = g.createRadialGradient(-bubR * 0.34, -bubR * 0.4, bubR * 0.12, 0, 0, bubR * 1.06);
      body.addColorStop(0, css(hi, 1));
      body.addColorStop(0.44, css(rgb, 1));
      body.addColorStop(1, css(lo, 1));
      g.beginPath();
      g.arc(0, 0, bubR - 0.5, 0, bubTau);
      g.fillStyle = body;
      g.fill();
      /* the gloss: a soft pool and one hard sparkle, both up and left */
      g.fillStyle = "rgba(255, 255, 255, 0.48)";
      g.beginPath();
      g.arc(-bubR * 0.3, -bubR * 0.36, bubR * 0.3, 0, bubTau);
      g.fill();
      g.fillStyle = "rgba(255, 255, 255, 0.85)";
      g.beginPath();
      g.arc(-bubR * 0.46, -bubR * 0.5, bubR * 0.11, 0, bubTau);
      g.fill();
      /* bounce light along the bottom rim, so the sphere reads as glass */
      g.strokeStyle = "rgba(255, 255, 255, 0.16)";
      g.lineWidth = 1.2;
      g.lineCap = "round";
      g.beginPath();
      g.arc(0, bubR * 0.26, bubR * 0.72, Math.PI * 0.28, Math.PI * 0.72);
      g.stroke();
      /* rim: dark all round, lit on the upper-left where the lamp is */
      g.strokeStyle = ink;
      g.lineWidth = 1;
      g.beginPath();
      g.arc(0, 0, bubR - 0.55, 0, bubTau);
      g.stroke();
      g.strokeStyle = "rgba(255, 255, 255, 0.5)";
      g.lineWidth = 1.1;
      g.beginPath();
      g.arc(0, 0, bubR - 1.1, Math.PI * 1.04, Math.PI * 1.56);
      g.stroke();
      g.lineCap = "butt";
      bubbleSprites[key] = node;
      return node;
    }

    function drawBubble(x, y, color, radius, alpha) {
      if (alpha !== undefined && alpha <= 0) {
        return;
      }
      var sprite = bubbleSprite(color);
      var size = (radius + bubPad) * 2;
      if (alpha !== undefined && alpha < 1) {
        ctx.globalAlpha = alpha;
      }
      ctx.drawImage(sprite, x - size / 2, y - size / 2, size, size);
      if (alpha !== undefined && alpha < 1) {
        ctx.globalAlpha = 1;
      }
    }

    /* --------------------------------------------------------- fx anchors */

    /* fx positions itself from an element's box, so a canvas game needs a
     * probe parked where the pop happened. Fixed positioning keeps the math
     * in viewport pixels, which is what the shared effects write. */
    function mountAnchor() {
      anchor = document.createElement("div");
      anchor.className = "bub-anchor";
      anchor.setAttribute("aria-hidden", "true");
      if (document.body) {
        document.body.appendChild(anchor);
      }
    }

    function anchorAt(x, y) {
      if (!anchor) {
        return canvas;
      }
      var rect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : null;
      var wide = rect && rect.width ? rect.width : bubWidth;
      var scale = wide / bubWidth;
      anchor.style.left = ((rect && rect.left ? rect.left : 0) + x * scale) + "px";
      anchor.style.top = ((rect && rect.top ? rect.top : 0) + y * scale) + "px";
      return anchor;
    }

    /* ---------------------------------------------------------- field fx */

    function pushTrail(x, y, color) {
      trail.push({ x: x, y: y, c: color });
      if (trail.length > bubTrailMax) {
        trail.shift();
      }
    }

    function pushRing(x, y, radius, grow, life, rgb, width) {
      rings.push({ x: x, y: y, r: radius, vr: grow, life: life, max: life, rgb: rgb, w: width || 1.2 });
    }

    /* A dropped cluster keeps its body: each freed bubble falls as a drawn
     * sphere with gravity, instead of the cell simply going blank. */
    function pushFaller(x, y, color) {
      if (fallers.length > 40) {
        fallers.shift();
      }
      fallers.push({
        x: x,
        y: y,
        c: color,
        vx: (Math.random() - 0.5) * 34,
        vy: 30 + Math.random() * 40,
        life: 1.6,
      });
    }

    function burst(x, y, color, count) {
      for (var index = 0; index < count; index += 1) {
        particles.push({
          x: x,
          y: y,
          vx: (Math.random() - 0.5) * 160,
          vy: (Math.random() - 0.5) * 160 - 40,
          life: 1,
          color: color,
        });
      }
    }

    function railStrike(side, y) {
      if (!motionOffField()) {
        railFlash[side] = 1;
        pushRing(side === 0 ? bubR : bubWidth - bubR, y, 3, 60, 0.28, BUB_RGB[flying ? flying.color : current] || BUB_RGB[0], 1.4);
      }
      /* a grind along one wall must not turn into a machine gun */
      if (bubTick - lastRailSound >= 5) {
        lastRailSound = bubTick;
        sound("tick");
      }
    }

    /* The wall, the aim and the deal share one clock, so the loop only keeps
     * spinning while something is still moving in it. */
    function pendingPresentation() {
      var now = Date.now();
      return !!(
        particles.length ||
        fallers.length ||
        rings.length ||
        trail.length ||
        shake > 0.05 ||
        (dealAt && now - dealAt < dealSpan)
      );
    }

    function stepPresentation(dt) {
      var index;
      for (index = rings.length - 1; index >= 0; index -= 1) {
        var ring = rings[index];
        ring.life -= dt;
        ring.r += ring.vr * dt;
        if (ring.life <= 0) {
          rings.splice(index, 1);
        }
      }
      for (index = fallers.length - 1; index >= 0; index -= 1) {
        var faller = fallers[index];
        faller.vy += 620 * dt;
        faller.x += faller.vx * dt;
        faller.y += faller.vy * dt;
        faller.life -= dt;
        if (faller.y > bubHeight + bubR || faller.life <= 0) {
          fallers.splice(index, 1);
        }
      }
      if (!flying && trail.length) {
        trail.shift();
      }
      railFlash[0] = Math.max(0, railFlash[0] - dt * 2.6);
      railFlash[1] = Math.max(0, railFlash[1] - dt * 2.6);
      shake = shake > 0.05 ? shake * Math.exp(-dt * 6.5) : 0;
    }

    /* -------------------------------------------------------- game logic */
    /* Cluster detection, snapping and scoring are the shipped game and stay
     * untouched; the note* helpers hang the feedback beats off the same
     * moments without touching a number. */

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
      scoreEl.textContent = score + "/" + level.target;
      shotsEl.textContent = String(shots);
      poppedEl.textContent = String(popped);
    }

    function emptyGrid() {
      var rows = [];
      for (var r = 0; r < bubRows; r += 1) {
        rows.push(new Array(r % 2 ? 13 : 14).fill(-1));
      }
      return rows;
    }

    function activeColors() {
      var present = {};
      for (var r = 0; r < bubRows; r += 1) {
        for (var c = 0; c < grid[r].length; c += 1) {
          if (grid[r][c] >= 0) {
            present[grid[r][c]] = true;
          }
        }
      }
      var keys = Object.keys(present).map(Number);
      return keys.length ? keys : level.colors;
    }

    function randomColor() {
      var pool = activeColors();
      return pool[Math.floor(Math.random() * pool.length)];
    }

    function neighbours(row, col) {
      var list = [];
      if (col > 0) {
        list.push([row, col - 1]);
      }
      if (col < grid[row].length - 1) {
        list.push([row, col + 1]);
      }
      if (row % 2 === 0) {
        list.push([row - 1, col - 1], [row - 1, col], [row + 1, col - 1], [row + 1, col]);
      } else {
        list.push([row - 1, col], [row - 1, col + 1], [row + 1, col], [row + 1, col + 1]);
      }
      return list.filter(function (cell) {
        var r = cell[0];
        var c = cell[1];
        return r >= 0 && r < bubRows && c >= 0 && c < grid[r].length;
      });
    }

    function collectCluster(row, col, sameColorOnly) {
      var color = grid[row][col];
      var seen = {};
      var stack = [[row, col]];
      var found = [];
      seen[row + "," + col] = true;
      while (stack.length) {
        var cell = stack.pop();
        found.push(cell);
        var around = neighbours(cell[0], cell[1]);
        for (var index = 0; index < around.length; index += 1) {
          var r = around[index][0];
          var c = around[index][1];
          var key = r + "," + c;
          if (seen[key] || grid[r][c] < 0) {
            continue;
          }
          if (sameColorOnly && grid[r][c] !== color) {
            continue;
          }
          seen[key] = true;
          stack.push([r, c]);
        }
      }
      return found;
    }

    function snapSlot(x, y) {
      var row = Math.round((y - 11) / bubRowH);
      row = Math.max(0, Math.min(row, bubRows - 1));
      var col = Math.round((x - 11 - (row % 2 ? 11 : 0)) / bubD);
      col = Math.max(0, Math.min(col, grid[row].length - 1));
      if (grid[row][col] < 0) {
        return [row, col];
      }
      var seen = {};
      var queue = [[row, col]];
      seen[row + "," + col] = true;
      while (queue.length) {
        var cell = queue.shift();
        var around = neighbours(cell[0], cell[1]);
        for (var index = 0; index < around.length; index += 1) {
          var r = around[index][0];
          var c = around[index][1];
          var key = r + "," + c;
          if (seen[key]) {
            continue;
          }
          seen[key] = true;
          if (grid[r][c] < 0) {
            return [r, c];
          }
          queue.push([r, c]);
        }
      }
      return null;
    }

    function fire() {
      if (!alive || flying) {
        return;
      }
      flying = {
        color: current,
        x: bubShooterX,
        y: bubShooterY,
        vx: Math.cos(aim) * bubSpeed,
        vy: Math.sin(aim) * bubSpeed,
      };
      shots -= 1;
      renderHud();
      /* the launch beat: the well recoils, the counter ticks down loudly */
      sound("shoot");
      setChip(shotsEl, shots <= 5 ? "warn" : "");
      eff("pop", shotsEl, { scale: 1.12, ms: 180 });
      if (!motionOffField()) {
        pushRing(bubShooterX, bubShooterY, bubR * 0.7, 70, 0.3, BUB_RGB[current], 1.6);
        burst(bubShooterX, bubShooterY + 4, bubColors[current], 3);
      }
    }

    function notePop(count, cx, cy, gained, colorIndex) {
      shake = Math.max(shake, count >= 5 ? 3.2 : 2);
      sound("pop");
      eff("pop", scoreEl, { scale: 1.16, ms: 240 });
      eff("pop", poppedEl, { scale: 1.1, ms: 200 });
      if (motionOffField()) {
        return;
      }
      var probe = anchorAt(cx, cy);
      eff("burst", probe, { kind: "bubble", count: Math.min(18, 6 + count * 2), hue: BUB_HUES[colorIndex] || hue });
      eff("ring", probe, { hue: BUB_HUES[colorIndex] || hue });
      eff("floatText", probe, "+" + gained, { kind: "good", hue: BUB_HUES[colorIndex] || hue });
    }

    function noteDrop(cx, cy, gained) {
      sound("splash");
      if (motionOffField()) {
        return;
      }
      eff("floatText", anchorAt(cx, cy), "+" + gained, { kind: "good", hue: hue });
    }

    function noteSettle(slot, color) {
      sound("place");
      if (!motionOffField()) {
        pushRing(
          bubX(slot[0], slot[1]),
          bubY(slot[0]),
          bubR * 0.55,
          34,
          0.3,
          BUB_RGB[color] || BUB_RGB[0],
          1.3,
        );
      }
    }

    function land(fly) {
      var slot = snapSlot(fly.x, fly.y);
      if (!slot) {
        gameOver(false);
        return;
      }
      grid[slot[0]][slot[1]] = fly.color;
      if (slot[0] >= bubRows - 1) {
        gameOver(true);
        return;
      }
      var cluster = collectCluster(slot[0], slot[1], true);
      if (cluster.length >= 3) {
        var sumX = 0;
        var sumY = 0;
        cluster.forEach(function (cell) {
          burst(bubX(cell[0], cell[1]), bubY(cell[0]), bubColors[grid[cell[0]][cell[1]]], 6);
          sumX += bubX(cell[0], cell[1]);
          sumY += bubY(cell[0]);
          grid[cell[0]][cell[1]] = -1;
        });
        popped += cluster.length;
        score += cluster.length * 10;
        notePop(cluster.length, sumX / cluster.length, sumY / cluster.length, cluster.length * 10, fly.color);
        var floating = collectFloating();
        var dropX = 0;
        var dropY = 0;
        floating.forEach(function (cell) {
          pushFaller(bubX(cell[0], cell[1]), bubY(cell[0]), grid[cell[0]][cell[1]]);
          burst(bubX(cell[0], cell[1]), bubY(cell[0]), bubColors[grid[cell[0]][cell[1]]], 5);
          dropX += bubX(cell[0], cell[1]);
          dropY += bubY(cell[0]);
          grid[cell[0]][cell[1]] = -1;
        });
        popped += floating.length;
        score += floating.length * 15;
        if (floating.length) {
          noteDrop(dropX / floating.length, dropY / floating.length, floating.length * 15);
        }
        renderHud();
        if (score >= level.target) {
          levelCleared();
          return;
        }
      } else {
        noteSettle(slot, fly.color);
      }
      current = next;
      next = randomColor();
      if (shots <= 0) {
        gameOver(false);
        return;
      }
    }

    function collectFloating() {
      var anchored = {};
      for (var c = 0; c < grid[0].length; c += 1) {
        if (grid[0][c] >= 0 && !anchored["0," + c]) {
          collectCluster(0, c, false).forEach(function (cell) {
            anchored[cell[0] + "," + cell[1]] = true;
          });
        }
      }
      var loose = [];
      for (var r = 0; r < bubRows; r += 1) {
        for (var c2 = 0; c2 < grid[r].length; c2 += 1) {
          if (grid[r][c2] >= 0 && !anchored[r + "," + c2]) {
            loose.push([r, c2]);
          }
        }
      }
      return loose;
    }

    /* A round ends as an event, and the handle that closes the ceremony is
     * kept so loading another spring never leaves a scrim over the board. */
    function closeRoundView() {
      if (dismissRound) {
        dismissRound();
        dismissRound = null;
      }
    }

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

    function gameOver(hitDeadline) {
      alive = false;
      var overTitle = t(hitDeadline ? "bubOver" : "bubOutShots", { n: score, t: level.target });
      resultEl.textContent = overTitle + " " + t("bubRetry");
      markResult(resultEl, "lose");
      setChip(shotsEl, "warn");
      sound("hit");
      eff("jolt", canvas, { dist: 6, ms: 300 });
      eff("flash", canvas, { hue: 356, ms: 520 });
      draw();
      closeRound("lose", 0, overTitle, [t("bubRetry")]);
    }

    function levelCleared() {
      alive = false;
      var starsWon = starsFor(score, level.starGain.map(function (gain) {
        return Math.round(level.target * gain);
      }), "high");
      var outcome = campaign.record(level.id, {
        stars: starsWon,
        best: score,
      });
      var message = t("bubCleared", {
        name: t(level.labelKey),
        n: score,
        m: shots,
        stars: starsWon,
      });
      if (outcome.isBest) {
        message += " " + t("newBest");
      }
      if (outcome.unlockedNext) {
        message += " " + t("bubNextSpring");
      } else if (campaign.clearedCount() === bubLevels.length) {
        message += " " + t("bubCampaignDone");
      }
      logAction(t("logBubbleInk", { name: t(level.labelKey), n: score }));
      var rect = startBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      var nextId = outcome.unlockedNext || level.id;
      loadLevel(bubLevels[campaign.indexOf(nextId)]);
      resultEl.textContent = message;
      markResult(resultEl, "win");
      eff("pop", scoreEl, { scale: 1.2, ms: 320 });
      eff("pop", bestEl, { scale: 1.14, ms: 300 });
      eff("sweep", startBtn);
      closeRound(starsWon === 3 ? "win" : "clear", starsWon, t(level.labelKey), [message]);
    }

    function update(dt) {
      bubTick += 1;
      if (flying) {
        flying.x += flying.vx * dt;
        flying.y += flying.vy * dt;
        if (flying.x < bubR) {
          flying.x = bubR;
          flying.vx = Math.abs(flying.vx);
          railStrike(0, flying.y);
        } else if (flying.x > bubWidth - bubR) {
          flying.x = bubWidth - bubR;
          flying.vx = -Math.abs(flying.vx);
          railStrike(1, flying.y);
        }
        if (!motionOffField()) {
          pushTrail(flying.x, flying.y, flying.color);
        }
        var hit = flying.y <= bubR;
        if (!hit) {
          for (var r = 0; r < bubRows && !hit; r += 1) {
            for (var c = 0; c < grid[r].length && !hit; c += 1) {
              if (grid[r][c] < 0) {
                continue;
              }
              var dx = flying.x - bubX(r, c);
              var dy = flying.y - bubY(r);
              if (dx * dx + dy * dy < (bubD - 1) * (bubD - 1)) {
                hit = true;
              }
            }
          }
        }
        if (hit) {
          var fly = flying;
          flying = null;
          land(fly);
        }
      }
      var aliveParticles = [];
      for (var index = 0; index < particles.length; index += 1) {
        var spark = particles[index];
        spark.x += spark.vx * dt;
        spark.y += spark.vy * dt;
        spark.vy += 240 * dt;
        spark.life -= dt * 2.2;
        if (spark.life > 0) {
          aliveParticles.push(spark);
        }
      }
      particles = aliveParticles;
      stepPresentation(dt);
    }

    /* ------------------------------------------------------------- paint */

    function dealProgress(row, col, clock) {
      if (motionOffField() || !shown) {
        return 1;
      }
      var delay = deal[row + "," + col];
      if (delay === undefined) {
        return 1;
      }
      var k = (clock - dealAt - delay) / 300;
      if (k <= 0) {
        return 0;
      }
      return k >= 1 ? 1 : easeOut(k);
    }

    /* The aim guide is the genre's promise: it marches the shot forward with
     * wall reflections until first contact, so a bank shot is planned, not
     * hoped for. It reads the same collision radius the physics uses. */
    function paintGuide(clock) {
      if (!alive || flying) {
        return;
      }
      var filled = [];
      for (var r = 0; r < bubRows; r += 1) {
        for (var c = 0; c < grid[r].length; c += 1) {
          if (grid[r][c] >= 0) {
            filled.push({ x: bubX(r, c), y: bubY(r) });
          }
        }
      }
      var x = bubShooterX;
      var y = bubShooterY;
      var dx = Math.cos(aim);
      var dy = Math.sin(aim);
      var travelled = 0;
      var sinceDot = 6;
      var bounces = 0;
      var contact = null;
      var dots = [];
      while (travelled < bubGuideMax && bounces <= 2) {
        x += dx * bubGuideStep;
        y += dy * bubGuideStep;
        travelled += bubGuideStep;
        sinceDot += bubGuideStep;
        if (x < bubR) {
          x = bubR;
          dx = Math.abs(dx);
          bounces += 1;
        } else if (x > bubWidth - bubR) {
          x = bubWidth - bubR;
          dx = -Math.abs(dx);
          bounces += 1;
        }
        if (sinceDot >= 12) {
          dots.push({ x: x, y: y });
          sinceDot = 0;
        }
        if (y <= bubR) {
          contact = { x: x, y: Math.max(y, bubR) };
          break;
        }
        for (var index = 0; index < filled.length; index += 1) {
          var ddx = x - filled[index].x;
          var ddy = y - filled[index].y;
          if (ddx * ddx + ddy * ddy < (bubD - 1) * (bubD - 1)) {
            contact = { x: x, y: y };
            index = filled.length;
          }
        }
        if (contact) {
          break;
        }
      }
      var base = motionOffField() || calmField() ? 0.5 : 0.5 + 0.22 * Math.sin(clock / 280);
      ctx.fillStyle = pal.guide(1);
      for (var dot = 0; dot < dots.length; dot += 1) {
        ctx.globalAlpha = base * (1 - (dot / dots.length) * 0.72);
        ctx.beginPath();
        ctx.arc(dots[dot].x, dots[dot].y, 2.1, 0, bubTau);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (contact) {
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = pal.guide(0.65);
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.arc(contact.x, contact.y, bubR - 0.5, 0, bubTau);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    function paintTrail() {
      for (var index = 0; index < trail.length; index += 1) {
        var drop = trail[index];
        var k = (index + 1) / trail.length;
        ctx.globalAlpha = 0.05 + 0.4 * k * k;
        ctx.fillStyle = css(BUB_RGB[drop.c] || BUB_RGB[0], 1);
        ctx.beginPath();
        ctx.arc(drop.x, drop.y, bubR * (0.22 + 0.62 * k), 0, bubTau);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    function paintRings() {
      for (var index = 0; index < rings.length; index += 1) {
        var ring = rings[index];
        ctx.globalAlpha = Math.max(0, (ring.life / ring.max) * 0.9);
        ctx.strokeStyle = css(ring.rgb, 1);
        ctx.lineWidth = ring.w;
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, ring.r, 0, bubTau);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    function paintFallers() {
      for (var index = 0; index < fallers.length; index += 1) {
        var faller = fallers[index];
        drawBubble(faller.x, faller.y, faller.c, bubR, Math.max(0, Math.min(1, faller.life)));
      }
    }

    function paintParticles() {
      for (var index = 0; index < particles.length; index += 1) {
        var spark = particles[index];
        var life = Math.max(0, spark.life);
        ctx.globalAlpha = life;
        ctx.fillStyle = spark.color;
        ctx.beginPath();
        ctx.arc(spark.x, spark.y, 1 + 2.2 * life, 0, bubTau);
        ctx.fill();
        if (life > 0.55) {
          /* the glint: young sparks are little glossy beads, not squares */
          ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
          ctx.beginPath();
          ctx.arc(spark.x - 0.7, spark.y - 0.8, 0.8, 0, bubTau);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }

    function paintRails() {
      if (railFlash[0] > 0.02) {
        ctx.fillStyle = pal.accent(railFlash[0] * 0.55);
        ctx.fillRect(0, 0, 2.6, bubHeight);
      }
      if (railFlash[1] > 0.02) {
        ctx.fillStyle = pal.accent(railFlash[1] * 0.55);
        ctx.fillRect(bubWidth - 2.6, 0, 2.6, bubHeight);
      }
    }

    function paintDeadline(clock) {
      var alpha = 0.34;
      if (alive && !motionOffField()) {
        alpha += 0.14 * (0.5 + 0.5 * Math.sin(clock / 280));
      }
      if (alive && shots <= 5) {
        alpha += 0.18;
      }
      ctx.strokeStyle = pal.danger(alpha);
      ctx.lineWidth = 1.4;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(0, bubDeadlineY + 0.5);
      ctx.lineTo(bubWidth, bubDeadlineY + 0.5);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    /* The shooter is furniture, not a floating circle: a pedestal, a glowing
     * collar while the shot is loaded, and the next ink waiting in a cradle. */
    function paintShooter(clock) {
      roundPath(ctx, bubShooterX - 20, bubShooterY + 8, 40, 14, 6);
      var skin = ctx.createLinearGradient(0, bubShooterY + 8, 0, bubShooterY + 22);
      skin.addColorStop(0, pal.pedTop);
      skin.addColorStop(1, pal.pedLow);
      ctx.fillStyle = skin;
      ctx.fill();
      ctx.strokeStyle = pal.pedEdge;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = "rgba(255, 255, 255, " + (light ? 0.4 : 0.22) + ")";
      ctx.fillRect(bubShooterX - 15, bubShooterY + 9.5, 30, 1.2);
      if (alive && !flying) {
        var beat = motionOffField() || calmField() ? 0.5 : 0.5 + 0.5 * Math.abs(Math.sin(clock / 320));
        ctx.strokeStyle = pal.accent(0.25 + 0.5 * beat);
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(bubShooterX, bubShooterY, bubR + 2.5 + beat * 1.8, 0, bubTau);
        ctx.stroke();
      }
      drawBubble(bubShooterX, bubShooterY, alive ? current : next, bubR - 1);
      /* the cradle: the next colour is a promise the player can plan around */
      roundPath(ctx, 288 - 14, bubShooterY + 8, 28, 11, 4.5);
      var cradleSkin = ctx.createLinearGradient(0, bubShooterY + 8, 0, bubShooterY + 19);
      cradleSkin.addColorStop(0, pal.pedTop);
      cradleSkin.addColorStop(1, pal.pedLow);
      ctx.fillStyle = cradleSkin;
      ctx.fill();
      ctx.strokeStyle = pal.pedEdge;
      ctx.lineWidth = 0.9;
      ctx.stroke();
      ctx.strokeStyle = pal.cradle;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.arc(288, bubShooterY, bubR + 0.5, 0, bubTau);
      ctx.stroke();
      drawBubble(288, bubShooterY, next, bubR - 3);
    }

    function paint() {
      /* One wall clock for everything animated: the deal ledger stores
       * Date.now() values, so a rAF frame timestamp (page-relative) would
       * read as "not poured yet" forever and freeze the board mid-deal. */
      var now = Date.now();
      shown = !!canvas.offsetParent;
      sizeCanvas();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.save();
      if (shake > 0.05) {
        ctx.translate((Math.random() * 2 - 1) * shake, (Math.random() * 2 - 1) * shake * 0.7);
      }
      ctx.drawImage(wellBitmap(), 0, 0, bubWidth, bubHeight);
      paintRails();
      paintDeadline(now);
      for (var r = 0; r < bubRows; r += 1) {
        for (var c = 0; c < grid[r].length; c += 1) {
          if (grid[r][c] < 0) {
            continue;
          }
          var land = dealProgress(r, c, now);
          if (land <= 0) {
            continue;
          }
          var rise = (1 - land) * 12;
          drawBubble(bubX(r, c), bubY(r) - rise, grid[r][c], bubR, 0.25 + 0.75 * land);
        }
      }
      paintTrail();
      paintRings();
      paintFallers();
      if (flying) {
        drawBubble(flying.x, flying.y, flying.color, bubR);
      }
      paintGuide(now);
      paintShooter(now);
      paintParticles();
      ctx.restore();
    }

    /* ---------------------------------------------------------------- loop */

    function isShown() {
      /* A drawer panel is display:none while closed, which is exactly what
       * offsetParent reports as null: the loop stops itself on that. */
      return !!canvas.offsetParent;
    }

    function wantsFrames() {
      return isShown() && (alive || (!motionOffField() && pendingPresentation()));
    }

    function frame(now) {
      frameId = null;
      var stamp = now || Date.now();
      var dt = Math.min(0.032, (stamp - lastFrame) / 1000 || 0.016);
      lastFrame = stamp;
      update(dt);
      paint();
      if (wantsFrames()) {
        frameId = window.requestAnimationFrame(frame);
      }
    }

    function startLoop() {
      if (frameId !== null) {
        return;
      }
      lastFrame = performance.now();
      frameId = window.requestAnimationFrame(frame);
    }

    function stopLoop() {
      if (frameId !== null && window.cancelAnimationFrame) {
        window.cancelAnimationFrame(frameId);
      }
      frameId = null;
    }

    function schedulePaint() {
      if (frameId !== null) {
        return;
      }
      if (wantsFrames()) {
        frameId = window.requestAnimationFrame(frame);
      } else {
        paint();
      }
    }

    function draw() {
      paint();
      schedulePaint();
    }

    /* ---------------------------------------------------------- the round */

    function setAimFromPointer(clientX, clientY) {
      if (!alive || flying) {
        return;
      }
      var rect = canvas.getBoundingClientRect();
      var x = (clientX - rect.left) * bubWidth / (rect.width || bubWidth);
      var y = (clientY - rect.top) * bubHeight / (rect.height || bubHeight);
      var angle = Math.atan2(y - bubShooterY, x - bubShooterX);
      /* Keep the aim in the upper half-plane; a pointer below the shooter
       * picks the nearer side wall instead of firing into the floor. */
      if (angle > -0.17) {
        angle = x < bubShooterX ? -Math.PI + 0.17 : -0.17;
      }
      aim = Math.max(-Math.PI + 0.17, Math.min(-0.17, angle));
    }

    function loadLevel(levelDef) {
      closeRoundView();
      level = levelDef;
      grid = emptyGrid();
      for (var r = 0; r < level.rows; r += 1) {
        for (var c = 0; c < grid[r].length; c += 1) {
          grid[r][c] = Math.floor(Math.random() * level.colors);
        }
      }
      /* The well is poured, not printed: bubbles drop in row by row, so the
       * first paint has a moment of weight instead of a wall simply existing. */
      deal = {};
      dealAt = Date.now();
      for (var r2 = 0; r2 < level.rows; r2 += 1) {
        for (var c2 = 0; c2 < grid[r2].length; c2 += 1) {
          deal[r2 + "," + c2] = Math.min(520, r2 * 22 + c2 * 7);
        }
      }
      dealSpan = 520 + 320;
      current = Math.floor(Math.random() * level.colors);
      next = Math.floor(Math.random() * level.colors);
      flying = null;
      particles = [];
      trail.length = 0;
      rings.length = 0;
      fallers.length = 0;
      railFlash[0] = 0;
      railFlash[1] = 0;
      shake = 0;
      shots = level.shots;
      score = 0;
      popped = 0;
      alive = false;
      markResult(resultEl, "");
      setChip(shotsEl, "");
      setChip(scoreEl, "");
      renderHud();
      refreshPicker();
      draw();
      resultEl.textContent = t("bubReady", { n: level.target, m: level.shots });
    }

    function startGame() {
      loadLevel(level);
      alive = true;
      resultEl.textContent = t("bubGo");
      markResult(resultEl, "");
      sound("select");
      eff("sweep", startBtn);
      startLoop();
      canvas.focus();
    }

    canvas.addEventListener("pointermove", function (event) {
      setAimFromPointer(event.clientX, event.clientY);
    });

    canvas.addEventListener("pointerdown", function (event) {
      event.preventDefault();
      setAimFromPointer(event.clientX, event.clientY);
      fire();
    });

    canvas.addEventListener("keydown", function (event) {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        aim = Math.max(-Math.PI + 0.17, aim - 0.06);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        aim = Math.min(-0.17, aim + 0.06);
      } else if (event.key === " ") {
        event.preventDefault();
        fire();
      }
    });

    selectEl.addEventListener("change", function () {
      var index = campaign.indexOf(selectEl.value);
      if (index >= 0 && campaign.isUnlocked(selectEl.value)) {
        sound("select");
        loadLevel(bubLevels[index]);
      }
    });

    startBtn.addEventListener("click", startGame);

    /* The drawer hides this panel rather than unmounting it, so the pointer
     * coming back over the board is the cue to finish any drained animation. */
    function wake() {
      schedulePaint();
    }

    var wakeHost = panel || canvas;
    wakeHost.addEventListener("pointerover", wake);
    wakeHost.addEventListener("focusin", wake);

    if (window.MutationObserver && document.documentElement) {
      /* Theme and motion live on attributes; re-read the tokens and repaint
       * once when the shell flips either. No timer, so nothing outlives the
       * panel. */
      var watcher = new window.MutationObserver(function () {
        readScene();
        paint();
      });
      watcher.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-theme", "data-motion"],
      });
    }

    App.quietResetBubbleInk = function () {
      stopLoop();
      closeRoundView();
      if (alive) {
        alive = false;
        flying = null;
        markResult(resultEl, "");
        resultEl.textContent = t("bubPaused");
        draw();
      }
    };

    /* The field is authored at 320x270 but stretched by the panel, so the
     * backing store takes the pixels the bevels need; the stage is the wrapper
     * the sheet lights, glazes and frames. */
    function mountStage() {
      if (canvas.parentNode && canvas.parentNode.insertBefore) {
        var stage = document.createElement("div");
        stage.className = "bub-stage";
        canvas.parentNode.insertBefore(stage, canvas);
        stage.appendChild(canvas);
      }
    }

    readScene();
    mountStage();
    mountAnchor();
    loadLevel(bubLevels[campaign.indexOf(campaign.nextLevelId())]);
    eff("sweep", startBtn);
  }


  /* Exported for the other modules. */
  App.initBubbleInkGame = initBubbleInkGame;
})(window.CapitalConvert = window.CapitalConvert || {});
