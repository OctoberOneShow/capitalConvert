/* Glyph Tower - The disc-stacking campaign in the shared game drawer.
 * Classic tower transfer: the optimum is 2^n - 1 moves, so every level's
 * star thresholds sit above a provably reachable bar; the checks pin the
 * formula and the thresholds.
 *
 * The board is a machining bench, not three sticks. Discs are graduated steel
 * bars - width is keyed to size, so an illegal stack is obvious by silhouette
 * alone - each bevelled, bored with the rod showing through, and debossed with
 * its size. A move lifts, travels, drops and settles; a disc aimed at a smaller
 * one strikes it, throws up sparks and bounces back to its own peg. */
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
  var towSize = 320;
  /* Levels: disc count per tower. Star thresholds are move counts
   * [3-star, 2-star, 1-star], always above the 2^n - 1 optimum. */
  var towLevels = [
    { id: "tw1", labelKey: "towL1", discs: 3, starMoves: [8, 10, 14] },
    { id: "tw2", labelKey: "towL2", discs: 4, starMoves: [16, 19, 25] },
    { id: "tw3", labelKey: "towL3", discs: 5, starMoves: [32, 36, 45] },
    { id: "tw4", labelKey: "towL4", discs: 6, starMoves: [63, 68, 80] },
    { id: "tw5", labelKey: "towL5", discs: 7, starMoves: [128, 135, 155] },
    { id: "tw6", labelKey: "lvlNum6", discs: 8, starMoves: [256, 266, 290] },
    { id: "tw7", labelKey: "lvlNum7", discs: 9, starMoves: [512, 526, 560] },
  ];

  /* Pure optimum, exported for the static checks. */
  function towMinMoves(discs) {
    var moves = 1;
    for (var i = 1; i < discs; i += 1) {
      moves = moves * 2 + 1;
    }
    return moves;
  }
  App.glyphTowerMinMoves = towMinMoves;

  /* ------------------------------------------------------------------ feel */
  /* App.fx, App.art and App.playSfx are shared layers that a bare module boot
   * may not have loaded, and the bench still has to draw without them, so each
   * call goes through a guard rather than assuming the drawer is present. */
  function hasFx(name) {
    var impl = App.fx;
    return !!(impl && typeof impl[name] === "function");
  }

  function fx(name, args) {
    if (!hasFx(name)) {
      return null;
    }
    try {
      return App.fx[name].apply(App.fx, args || []);
    } catch (error) {
      return null;
    }
  }

  function sfx(name) {
    if (typeof App.playSfx !== "function") {
      return;
    }
    try {
      App.playSfx(name);
    } catch (error) {
      /* Audio is decoration; it never decides a move. */
    }
  }

  function motionOff() {
    return typeof App.isMotionOff === "function" && App.isMotionOff();
  }

  function calm() {
    return typeof App.isMotionCalm === "function" && App.isMotionCalm();
  }

  /* Every duration in the move machine runs through this: motion off commits on
   * the tap, calm shortens the beat, full keeps the authored timing. */
  function beat(ms) {
    if (motionOff()) {
      return 1;
    }
    return calm() ? Math.max(50, Math.round(ms * 0.55)) : ms;
  }

  function clampNum(lo, hi, value) {
    return Math.max(lo, Math.min(hi, value));
  }

  function easeOut(k) {
    return 1 - Math.pow(1 - k, 3);
  }

  function easeIn(k) {
    return k * k;
  }

  function easeInOut(k) {
    return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  }

  function easeOutBack(k) {
    var c = 1.9;
    return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2);
  }

  /* A star for the par plaque: the vector motif when the art layer is loaded,
   * a glyph when it is not. Filled and hollow are shapes, not just colours. */
  function starNode(filled) {
    var art = App.art;
    if (art && typeof art.icon === "function" && art.has && art.has("star")) {
      try {
        var svg = art.icon("star", { hue: filled ? 46 : 214, size: "1em" });
        svg.setAttribute("class", "art-icon tow-star " + (filled ? "is-filled" : "is-hollow"));
        return svg;
      } catch (error) {
        /* fall through to the glyph */
      }
    }
    var span = document.createElement("span");
    span.className = "tow-star " + (filled ? "is-filled" : "is-hollow");
    span.textContent = filled ? "\u2605" : "\u2606";
    return span;
  }

  var ROD_TOP = 62;
  var BEAM_H = 14;
  var LANE_W = 78;
  var DISC_MIN_W = 30;
  var DISC_MAX_W = 96;

  function initGlyphTowerGame() {
    var canvas = getElement("towCanvas");
    var movesEl = getElement("towMoves");
    var minEl = getElement("towMin");
    var timeEl = getElement("towTime");
    var resultEl = getElement("towResult");
    var startBtn = getElement("towNewBtn");
    var bestEl = getElement("towBest");
    var selectEl = getElement("towLevelSel");
    var panelEl = getElement("gamePanelGlyphTower");
    if (
      !canvas ||
      !movesEl ||
      !minEl ||
      !timeEl ||
      !resultEl ||
      !startBtn ||
      !bestEl ||
      !selectEl
    ) {
      return;
    }

    var ctx = canvas.getContext("2d");
    var campaign = createCampaign({ key: "glyph-tower-campaign", levels: towLevels });

    var level = towLevels[0];
    var pegs = [[], [], []];
    var lifted = null;
    var liftedFrom = 0;
    var moves = 0;
    var solved = false;
    var rafId = null;
    var startedAt = 0;
    var clockRunning = false;

    /* Presentation state. None of it decides a move: the rules above it are the
     * shipped ones, this layer only says when they become visible. */
    var flight = null;
    var queuedTap = null;
    var ripples = [];
    var jolt = 0;
    var pegJitter = [0, 0, 0];
    var blocked = null;
    var hover = -1;
    var caretPeg = 0;
    var focused = false;
    var entrance = -1;
    var landedFlags = {};
    var visBySize = {};
    var shownMoves = 0;
    var lastDelta = -1;
    var timers = [];
    var pendingNext = null;
    var wasHidden = true;
    var lastAt = 0;
    var theme = { hue: 196, light: false, age: 99 };

    /* A plaque over the board: par, the three star bands and where the run
     * stands against them. Reads as a handicap to beat, not as a caption. */
    var plaque = null;
    var plaqueValue = null;
    var plaqueDelta = null;
    var plaqueFill = null;
    var plaqueKnob = null;
    var plaqueTicks = null;
    var bandNodes = [];

    /* ---------------------------------------------------------------- layout */

    function geometry() {
      var gap = (towSize - 24 - LANE_W * 3) / 2;
      var baseY = towSize - 46;
      var discH = clampNum(13, 26, Math.floor((baseY - ROD_TOP - 12) / Math.max(1, level.discs)));
      return {
        pegW: LANE_W,
        gap: gap,
        discH: discH,
        baseY: baseY,
        /* pegX keeps the shape the pointer hit test reads. */
        pegX: [12, 12 + LANE_W + gap, 12 + (LANE_W + gap) * 2],
        lane: [
          12 + LANE_W / 2,
          12 + LANE_W + gap + LANE_W / 2,
          12 + (LANE_W + gap) * 2 + LANE_W / 2,
        ],
        rodTop: ROD_TOP,
        hoverY: ROD_TOP - 12,
      };
    }

    function slotY(geo, peg, index) {
      return geo.baseY - (index + 0.5) * geo.discH;
    }

    function discWidth(size) {
      var span = Math.max(1, level.discs - 1);
      return Math.round(DISC_MIN_W + (DISC_MAX_W - DISC_MIN_W) * (size - 1) / span);
    }

    /* Colour ramp by absolute size: light discs run cool, heavy discs run hot,
     * so hue and width say the same fact twice. */
    function discHue(size) {
      return 190 - (size - 1) * 22;
    }

    function discPalette(size) {
      var h = discHue(size);
      return {
        hue: h,
        lit: "hsl(" + h + ", 96%, " + (78 - size * 0.7) + "%)",
        main: "hsl(" + h + ", 88%, " + (58 - size * 0.8) + "%)",
        deep: "hsl(" + h + ", 80%, " + (33 - Math.min(7, size * 0.6)) + "%)",
        line: "hsl(" + h + ", 72%, " + Math.max(10, 22 - size) + "%)",
        glow: "hsl(" + h + ", 98%, 68%)",
      };
    }

    function syncTheme(force) {
      theme.age += 1;
      if (!force && theme.age < 45) {
        return;
      }
      theme.age = 0;
      var attr = null;
      try {
        attr = document.documentElement.getAttribute("data-theme");
        if (!attr && document.body) {
          attr = document.body.getAttribute("data-theme");
        }
      } catch (error) {
        attr = null;
      }
      theme.light = attr === "light";
      var hue = 196;
      try {
        if (panelEl && typeof window.getComputedStyle === "function") {
          var n = parseInt(window.getComputedStyle(panelEl).getPropertyValue("--gp-hue"), 10);
          if (!isNaN(n)) {
            hue = n;
          }
        }
      } catch (error) {
        /* the fallback hue still reads as machined steel */
      }
      theme.hue = hue;
    }

    /* -------------------------------------------------------------- particles */

    function emit(x, y, kind, count) {
      if (motionOff()) {
        return;
      }
      var total = calm() ? Math.max(2, Math.round(count * 0.5)) : count;
      for (var i = 0; i < total; i += 1) {
        var angle = Math.random() * Math.PI * 2;
        var power = 26 + Math.random() * (kind === "spark" ? 96 : 54);
        ripples.push({
          x: x,
          y: y,
          vx: Math.cos(angle) * power,
          vy: Math.sin(angle) * power * (kind === "dust" ? 0.4 : 0.9) - (kind === "dust" ? 18 : 26),
          life: 1,
          drain: kind === "dust" ? 0.03 : 0.024,
          size: kind === "dust" ? 1.6 + Math.random() * 2.2 : 2 + Math.random() * 2.4,
          kind: kind,
        });
      }
    }

    function stepParticles(dt) {
      var alive = [];
      var sec = dt / 1000;
      for (var i = 0; i < ripples.length; i += 1) {
        var r = ripples[i];
        r.x += r.vx * sec;
        r.y += r.vy * sec;
        r.vy += (r.kind === "dust" ? 44 : 190) * sec;
        r.vx *= 0.98;
        r.life -= r.drain * (dt / 16.7);
        if (r.life > 0) {
          alive.push(r);
        }
      }
      ripples = alive;
    }

    function drawParticles() {
      for (var i = 0; i < ripples.length; i += 1) {
        var r = ripples[i];
        var a = clampNum(0, 1, r.life);
        var c =
          r.kind === "spark"
            ? "255, " + Math.round(150 + 80 * a) + ", 74"
            : r.kind === "ember"
              ? "163, 230, 53"
              : theme.light
                ? "104, 118, 138"
                : "214, 226, 240";
        ctx.globalAlpha = a * (r.kind === "dust" ? 0.45 : 0.95);
        ctx.fillStyle = "rgba(" + c + ", 1)";
        ctx.fillRect(r.x - r.size / 2, r.y - r.size / 2, r.size, r.size);
      }
      ctx.globalAlpha = 1;
    }

    /* ------------------------------------------------------------ HUD + plaque */

    function buildPlaque() {
      if (plaque || !panelEl) {
        return;
      }
      plaque = document.createElement("div");
      plaque.className = "tow-par";
      plaque.setAttribute("role", "group");

      var head = document.createElement("div");
      head.className = "tow-par-head";
      var mark = document.createElement("span");
      mark.className = "tow-par-mark";
      mark.setAttribute("aria-hidden", "true");
      mark.appendChild(starNode(true));
      var label = document.createElement("span");
      label.className = "tow-par-label";
      label.textContent = t("hudPar");
      plaqueValue = document.createElement("strong");
      plaqueValue.className = "tow-par-value";
      plaqueDelta = document.createElement("span");
      plaqueDelta.className = "tow-par-delta";
      head.appendChild(mark);
      head.appendChild(label);
      head.appendChild(plaqueValue);
      head.appendChild(plaqueDelta);

      var rail = document.createElement("div");
      rail.className = "tow-par-rail";
      plaqueFill = document.createElement("i");
      plaqueFill.className = "tow-par-fill";
      plaqueTicks = document.createElement("div");
      plaqueTicks.className = "tow-par-ticks";
      plaqueKnob = document.createElement("i");
      plaqueKnob.className = "tow-par-knob";
      plaqueKnob.setAttribute("aria-hidden", "true");
      rail.appendChild(plaqueFill);
      rail.appendChild(plaqueTicks);
      rail.appendChild(plaqueKnob);

      plaque.appendChild(head);
      plaque.appendChild(rail);
      panelEl.insertBefore(plaque, canvas);
    }

    function buildBands() {
      if (!plaqueTicks) {
        return;
      }
      while (plaqueTicks.firstChild) {
        plaqueTicks.removeChild(plaqueTicks.firstChild);
      }
      bandNodes = [];
      var bands = level.starMoves;
      var max = bands[2] || 1;
      for (var i = 0; i < bands.length && i < 3; i += 1) {
        var node = document.createElement("span");
        node.className = "tow-band";
        node.style.left = (4 + clampNum(0, 100, (bands[i] / max) * 100) * 0.92).toFixed(2) + "%";
        var stars = document.createElement("span");
        stars.className = "tow-band-stars";
        stars.setAttribute("aria-hidden", "true");
        var earned = 3 - i;
        for (var s = 0; s < 3; s += 1) {
          stars.appendChild(starNode(s < earned));
        }
        var num = document.createElement("b");
        num.textContent = String(bands[i]);
        node.appendChild(stars);
        node.appendChild(num);
        plaqueTicks.appendChild(node);
        bandNodes.push(node);
      }
    }

    function renderPlaque(opt) {
      if (!plaque) {
        return;
      }
      var bands = level.starMoves;
      var max = bands[2] || 1;
      var pct = clampNum(0, 100, (moves / max) * 100);
      /* the track is inset 4% at each end, so every rail reading shares one map */
      plaqueFill.style.width = (pct * 0.92).toFixed(1) + "%";
      plaqueKnob.style.left = (4 + pct * 0.92).toFixed(1) + "%";
      plaqueValue.textContent = String(opt);
      var over = moves - opt;
      /* direction is a glyph as well as a colour, so the state is not colour-only */
      plaqueDelta.textContent = over > 0 ? "\u25b2 +" + over : "\u25c6 " + opt;
      if (over !== lastDelta) {
        lastDelta = over;
        fx("pop", [plaqueDelta, { scale: 1.24, ms: 210 }]);
      }
      plaque.className =
        "tow-par" +
        (over > 0 ? " is-over" : "") +
        (moves > max ? " is-spent" : "") +
        (solved ? " is-done" : "");
      for (var i = 0; i < bandNodes.length; i += 1) {
        bandNodes[i].className = "tow-band " + (bands[i] >= moves ? " is-live" : " is-spent");
      }
    }

    function renderTime() {
      if (!clockRunning) {
        return;
      }
      var stamp = ((Date.now() - startedAt) / 1000).toFixed(1) + "s";
      if (timeEl.textContent !== stamp) {
        timeEl.textContent = stamp;
      }
    }

    function renderHud(roll) {
      var opt = towMinMoves(level.discs);
      if (roll && moves !== shownMoves && hasFx("countUp")) {
        fx("countUp", [movesEl, shownMoves, moves, { ms: 190 }]);
      } else {
        movesEl.textContent = String(moves);
      }
      shownMoves = moves;
      minEl.textContent = String(opt);
      renderTime();
      renderPlaque(opt);
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

    /* ------------------------------------------------------------------ timers */

    function arm(fn, ms) {
      var id = window.setTimeout(function () {
        for (var i = 0; i < timers.length; i += 1) {
          if (timers[i] === id) {
            timers.splice(i, 1);
            break;
          }
        }
        fn();
      }, ms);
      timers.push(id);
      return id;
    }

    function clearTimers() {
      for (var i = 0; i < timers.length; i += 1) {
        window.clearTimeout(timers[i]);
      }
      timers = [];
    }

    function loadLevel(levelDef) {
      level = levelDef;
      pegs = [[], [], []];
      for (var size = level.discs; size >= 1; size -= 1) {
        pegs[0].push(size);
      }
      lifted = null;
      liftedFrom = 0;
      moves = 0;
      solved = false;
      flight = null;
      queuedTap = null;
      ripples = [];
      visBySize = {};
      landedFlags = {};
      jolt = 0;
      pegJitter = [0, 0, 0];
      blocked = null;
      hover = -1;
      shownMoves = 0;
      lastDelta = -1;
      clockRunning = false;
      startedAt = Date.now();
      /* The bench assembles itself on arrival: the tower drops in from the
       * biggest disc up, so the first paint is a scene being built. */
      entrance = motionOff() ? -1 : 0;
      buildPlaque();
      buildBands();
      renderHud(false);
      refreshPicker();
      syncTheme(true);
      pump();
      draw(Date.now());
      resultEl.textContent = t("towReady", { n: level.discs, m: towMinMoves(level.discs) });
    }

    /* ------------------------------------------------------------ move machine */

    function leg(f, geo, phase) {
      var fromLane = geo.lane[f.from];
      var toLane = geo.lane[f.to];
      f.phase = phase;
      f.t = 0;
      f.arc = 0;
      if (phase === "rise") {
        f.ax = fromLane;
        f.ay = slotY(geo, f.from, f.slot);
        f.bx = fromLane;
        f.by = geo.hoverY;
        f.dur = beat(190);
        f.ease = easeOutBack;
        return f;
      }
      if (phase === "travel") {
        f.ax = f.x === undefined ? fromLane : f.x;
        f.ay = f.y === undefined ? geo.hoverY : f.y;
        f.bx = toLane;
        f.by = geo.hoverY;
        f.dur = beat(Math.abs(toLane - f.ax) > 130 ? 300 : 220);
        f.ease = easeInOut;
        f.arc = 20;
        return f;
      }
      if (phase === "approach") {
        /* head for the face of the target stack, not for its resting slot */
        f.ax = f.x === undefined ? fromLane : f.x;
        f.ay = f.y === undefined ? geo.hoverY : f.y;
        f.bx = toLane;
        f.by = slotY(geo, f.to, Math.max(0, pegs[f.to].length - 1)) - geo.discH * 0.74;
        f.dur = beat(240);
        f.ease = easeInOut;
        f.arc = 12;
        return f;
      }
      if (phase === "strike") {
        f.ax = toLane;
        f.ay = f.y;
        f.bx = toLane;
        f.by = slotY(geo, f.to, Math.max(0, pegs[f.to].length - 1)) - geo.discH * 0.46;
        f.dur = beat(120);
        f.ease = easeIn;
        return f;
      }
      if (phase === "recoil") {
        f.ax = toLane;
        f.ay = f.y;
        f.bx = fromLane;
        f.by = geo.hoverY;
        f.dur = beat(310);
        f.ease = easeInOut;
        f.arc = 26;
        return f;
      }
      if (phase === "drop") {
        f.ax = f.x === undefined ? toLane : f.x;
        f.ay = f.y === undefined ? geo.hoverY : f.y;
        f.bx = toLane;
        f.by = slotY(geo, f.to, f.slot);
        f.dur = beat(200);
        f.ease = easeIn;
        return f;
      }
      /* settle: the disc sits in its slot and squashes as it takes its weight */
      f.ax = f.x === undefined ? f.ax : f.x;
      f.ay = f.y === undefined ? f.ay : f.y;
      f.bx = f.x;
      f.by = f.y;
      f.dur = beat(200);
      f.ease = easeOut;
      return f;
    }

    function pose(f, geo) {
      var k = f.dur > 0 ? Math.min(1, f.t / f.dur) : 1;
      var e = f.ease ? f.ease(k) : k;
      var x = f.ax + (f.bx - f.ax) * e;
      var y = f.ay + (f.by - f.ay) * e;
      var tilt = 0;
      var sx = 1;
      var sy = 1;
      if (f.phase === "travel" || f.phase === "approach" || f.phase === "recoil") {
        var bump = Math.sin(Math.PI * k);
        y -= (f.arc || 0) * bump * (f.phase === "approach" ? 0.3 : 1);
        tilt = (f.phase === "recoil" ? -9 : 8) * bump;
      }
      if (f.phase === "rise") {
        sy = 1 + 0.08 * Math.sin(Math.PI * k);
      }
      if (f.phase === "drop") {
        sy = 1 + 0.1 * k;
        sx = 1 - 0.05 * k;
      }
      if (f.phase === "settle") {
        var q = Math.sin(Math.PI * k);
        sx = 1 + 0.13 * q;
        sy = 1 - 0.16 * q;
      }
      if (f.phase === "strike") {
        var s = Math.sin(Math.PI * Math.min(1, k * 1.3));
        sx = 1 + 0.17 * s;
        sy = 1 - 0.22 * s;
      }
      return { x: x, y: y, tilt: tilt, sx: sx, sy: sy, k: k };
    }

    function restDisc(size, peg, slot) {
      pegs[peg].push(size);
      visBySize[size] = beat(200);
      var geo = geometry();
      emit(geo.lane[peg], geo.baseY - slot * geo.discH, "dust", calm() ? 4 : 7);
    }

    function endLeg(geo) {
      var f = flight;
      if (!f) {
        return;
      }
      if (f.phase === "rise") {
        /* the lift is over; the disc now hovers over its own peg */
        flight = null;
        return;
      }
      if (f.phase === "travel") {
        if (f.mode === "move") {
          f.slot = pegs[f.to].length;
          leg(f, geo, "drop");
          sfx("step");
        } else {
          leg(f, geo, "strike");
          onStrike(geo, f);
        }
        return;
      }
      if (f.phase === "approach") {
        leg(f, geo, "strike");
        onStrike(geo, f);
        return;
      }
      if (f.phase === "strike") {
        leg(f, geo, "recoil");
        return;
      }
      if (f.phase === "recoil") {
        f.slot = pegs[f.from].length;
        f.to = f.from;
        leg(f, geo, "drop");
        return;
      }
      if (f.phase === "drop") {
        /* the landing is the impact beat */
        var landing = slotY(geo, f.to, f.slot);
        emit(geo.lane[f.to], landing + geo.discH * 0.4, "dust", calm() ? 5 : 9);
        emit(geo.lane[f.to], landing, "ember", calm() ? 3 : 5);
        sfx("land");
        pegJitter[f.to] = 1;
        leg(f, geo, "settle");
        return;
      }
      /* settle over: this is where the logic commits */
      flight = null;
      if (f.mode === "move") {
        restDisc(f.size, f.to, f.slot);
        lifted = null;
        moves += 1;
        renderHud(true);
        fx("pop", [movesEl.parentNode || movesEl, { scale: 1.1, ms: 200 }]);
        drainQueue();
        checkCleared();
        return;
      }
      restDisc(f.size, f.from, pegs[f.from].length);
      lifted = null;
      drainQueue();
    }

    function onStrike(geo, f) {
      var top = pegs[f.to][pegs[f.to].length - 1];
      var hitY = slotY(geo, f.to, Math.max(0, pegs[f.to].length - 1)) - geo.discH * 0.4;
      blocked = { peg: f.to, big: f.size, small: top === undefined ? 0 : top, life: 1 };
      emit(geo.lane[f.to], hitY, "spark", calm() ? 6 : 14);
      pegJitter[f.to] = 1;
      jolt = 1;
      sfx("wrong");
      fx("jolt", [canvas, { dist: calm() ? 2 : 4 }]);
      fx("flash", [canvas, { hue: 4 }]);
    }

    function drainQueue() {
      if (queuedTap === null) {
        return;
      }
      var peg = queuedTap;
      queuedTap = null;
      tapPeg(peg);
    }

    function stepFlight(dt, geo) {
      if (!flight) {
        return;
      }
      var guard = 0;
      flight.t += dt;
      while (flight && flight.t >= flight.dur && guard < 8) {
        var p = pose(flight, geo);
        flight.x = p.x;
        flight.y = p.y;
        flight.t -= flight.dur;
        guard += 1;
        endLeg(geo);
      }
      if (flight) {
        var live = pose(flight, geo);
        flight.x = live.x;
        flight.y = live.y;
      }
    }

    /* A flight cut short by a tab switch still lands where it was heading, so no
     * disc is ever stranded in the air and no state is lost. */
    function settleFlightNow() {
      if (!flight) {
        return;
      }
      var f = flight;
      flight = null;
      if (f.mode === "move" && f.phase !== "rise") {
        f.slot = f.slot === undefined ? pegs[f.to].length : f.slot;
        restDisc(f.size, f.to, f.slot);
        lifted = null;
        moves += 1;
        renderHud(false);
        checkCleared();
        return;
      }
      restDisc(f.size, f.from, pegs[f.from].length);
      lifted = null;
    }

    /* -------------------------------------------------------------------- rules */

    function tapPeg(peg) {
      pump();
      if (solved || peg < 0 || peg > 2) {
        return;
      }
      if (flight) {
        /* one tap buffered, so a fast player never loses a move */
        queuedTap = peg;
        return;
      }
      /* the mark of a refused move lives until the next action, not until a timer */
      blocked = null;
      var geo = geometry();
      if (lifted === null) {
        if (!pegs[peg].length) {
          return;
        }
        /* the bench is built: stop the deal-in before indices shift */
        entrance = -1;
        landedFlags = {};
        lifted = pegs[peg].pop();
        liftedFrom = peg;
        caretPeg = peg;
        if (!clockRunning) {
          clockRunning = true;
          startedAt = Date.now();
        }
        sfx("select");
        emit(geo.lane[peg], geo.baseY - (pegs[peg].length + 1) * geo.discH, "dust", 4);
        if (!motionOff()) {
          flight = leg({ mode: "lift", size: lifted, from: peg, to: peg, slot: pegs[peg].length }, geo, "rise");
        }
        return;
      }
      var top = pegs[peg][pegs[peg].length - 1];
      var instant = motionOff();

      if (peg === liftedFrom) {
        sfx("click");
        if (instant) {
          restDisc(lifted, liftedFrom, pegs[liftedFrom].length);
          lifted = null;
          return;
        }
        flight = leg(
          { mode: "return", size: lifted, from: liftedFrom, to: liftedFrom, slot: pegs[liftedFrom].length },
          geo,
          "drop",
        );
        return;
      }
      if (top !== undefined && top < lifted) {
        /* illegal: bigger on smaller - it goes to look, and comes back */
        blocked = { peg: peg, big: lifted, small: top, life: 1 };
        sfx("wrong");
        if (instant) {
          restDisc(lifted, liftedFrom, pegs[liftedFrom].length);
          lifted = null;
          return;
        }
        pegJitter[peg] = 1;
        jolt = 1;
        fx("jolt", [canvas, { dist: calm() ? 2 : 3 }]);
        flight = leg({ mode: "bounce", size: lifted, from: liftedFrom, to: peg, slot: pegs[peg].length }, geo, "approach");
        flight.x = geo.lane[liftedFrom];
        flight.y = geo.hoverY;
        return;
      }
      sfx("flip");
      if (instant) {
        restDisc(lifted, peg, pegs[peg].length);
        lifted = null;
        moves += 1;
        renderHud(false);
        checkCleared();
        return;
      }
      flight = leg({ mode: "move", size: lifted, from: liftedFrom, to: peg, slot: pegs[peg].length }, geo, "travel");
    }

    function checkCleared() {
      if (solved || pegs[2].length !== level.discs) {
        return;
      }
      solved = true;
      clockRunning = false;
      var starsWon = starsFor(moves, level.starMoves, "low");
      if (starsWon <= 0) {
        starsWon = 1;
      }
      var outcome = campaign.record(level.id, {
        stars: starsWon,
        best: moves,
        better: "low",
      });
      var opt = towMinMoves(level.discs);
      var message = t("towCleared", { n: moves, m: opt, stars: starsWon });
      if (outcome.isBest) {
        message += " " + t("newBest");
      }
      if (outcome.unlockedNext) {
        message += " " + t("towNextTower");
      } else if (campaign.clearedCount() === towLevels.length) {
        message += " " + t("towCampaignDone");
      }
      logAction(t("logGlyphTower", { n: moves }));
      var nextId = outcome.unlockedNext || level.id;
      var nextIndex = campaign.indexOf(nextId);
      if (nextIndex < 0) {
        nextIndex = campaign.indexOf(level.id);
      }
      pendingNext = towLevels[nextIndex] || towLevels[0];

      var geo = geometry();
      emit(geo.lane[2], slotY(geo, 2, level.discs - 1), "ember", calm() ? 10 : 22);
      if (hasFx("ceremony")) {
        /* The round ends as an event, over the top of the finished tower. */
        fx("ceremony", [
          panelEl,
          {
            tone: moves <= opt ? "win" : "clear",
            stars: starsWon,
            title: t(level.labelKey),
            lines: [message],
          },
        ]);
      } else {
        var rect = startBtn.getBoundingClientRect();
        createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      }
      petNotifyGame(outcome.isBest || outcome.firstClear);
      resultEl.textContent = message;
      renderPlaque(opt);
      pump();
      clearTimers();
      arm(function () {
        if (!pendingNext) {
          return;
        }
        var next = pendingNext;
        pendingNext = null;
        loadLevel(next);
        resultEl.textContent = message;
      }, calm() ? 1000 : 1700);
    }

    /* ----------------------------------------------------------------- drawing */

    function roundPath(x, y, w, h, r) {
      var rr = Math.min(r, h / 2, w / 2);
      ctx.beginPath();
      ctx.moveTo(x + rr, y);
      ctx.lineTo(x + w - rr, y);
      ctx.arcTo(x + w, y, x + w, y + rr, rr);
      ctx.lineTo(x + w, y + h - rr);
      ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
      ctx.lineTo(x + rr, y + h);
      ctx.arcTo(x, y + h, x, y + h - rr, rr);
      ctx.lineTo(x, y + rr);
      ctx.arcTo(x, y, x + rr, y, rr);
      ctx.closePath();
    }

    function oval(cx, cy, rx, ry) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(rx, ry);
      ctx.beginPath();
      ctx.arc(0, 0, 1, 0, Math.PI * 2);
      ctx.restore();
    }

    /* The bench is drawn in 320 space and scaled to the element, so the steel
     * and the bevels stay crisp at any panel width without a raster asset. */
    function syncCanvas() {
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      var cssW = 0;
      try {
        cssW = canvas.clientWidth || 0;
      } catch (error) {
        cssW = 0;
      }
      var px = canvas.width || towSize;
      if (cssW) {
        var want = Math.max(towSize, Math.round(cssW * dpr));
        if (canvas.width !== want) {
          canvas.width = want;
          canvas.height = want;
        }
        px = canvas.width;
      }
      ctx.setTransform(px / towSize, 0, 0, px / towSize, 0, 0);
    }

    function steel(x0, x1) {
      var g = ctx.createLinearGradient(x0, 0, x1, 0);
      g.addColorStop(0, "hsl(" + theme.hue + ", 20%, 18%)");
      g.addColorStop(0.2, "hsl(" + theme.hue + ", 24%, 58%)");
      g.addColorStop(0.42, "hsl(" + theme.hue + ", 16%, 84%)");
      g.addColorStop(0.68, "hsl(" + theme.hue + ", 22%, 42%)");
      g.addColorStop(1, "hsl(" + theme.hue + ", 26%, 16%)");
      return g;
    }

    function drawBackdrop(geo) {
      var h = theme.hue;
      var g = ctx.createLinearGradient(0, 0, 0, towSize);
      if (theme.light) {
        g.addColorStop(0, "hsl(" + h + ", 36%, 90%)");
        g.addColorStop(0.55, "hsl(" + h + ", 28%, 77%)");
        g.addColorStop(1, "hsl(" + h + ", 24%, 61%)");
      } else {
        g.addColorStop(0, "hsl(" + h + ", 34%, 13%)");
        g.addColorStop(0.6, "hsl(" + h + ", 30%, 9%)");
        g.addColorStop(1, "hsl(" + (h + 14) + ", 28%, 6%)");
      }
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, towSize, towSize);

      var lamp = ctx.createRadialGradient(84, -34, 10, 84, -34, 300);
      lamp.addColorStop(0, theme.light ? "rgba(255,255,255,0.72)" : "hsla(" + h + ", 90%, 70%, 0.22)");
      lamp.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = lamp;
      ctx.fillRect(0, 0, towSize, towSize);

      var pad = ctx.createRadialGradient(geo.lane[2], geo.baseY, 4, geo.lane[2], geo.baseY, 130);
      pad.addColorStop(0, "rgba(163, 230, 53, " + (theme.light ? 0.22 : 0.16) + ")");
      pad.addColorStop(1, "rgba(163, 230, 53, 0)");
      ctx.fillStyle = pad;
      ctx.fillRect(0, 0, towSize, towSize);

      /* measured ground: a rule grid, plus a dashed plumb line per lane */
      ctx.lineWidth = 1;
      ctx.strokeStyle = theme.light ? "rgba(30, 52, 76, 0.1)" : "rgba(180, 220, 255, 0.055)";
      for (var y = 18; y < towSize; y += 22) {
        ctx.beginPath();
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(towSize, y + 0.5);
        ctx.stroke();
      }
      ctx.strokeStyle = theme.light ? "rgba(30, 52, 76, 0.2)" : "rgba(180, 220, 255, 0.09)";
      ctx.setLineDash([3, 5]);
      for (var p = 0; p < 3; p += 1) {
        ctx.beginPath();
        ctx.moveTo(geo.lane[p] + 0.5, ROD_TOP - 26);
        ctx.lineTo(geo.lane[p] + 0.5, geo.baseY - 1);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    function drawVignette() {
      var g = ctx.createRadialGradient(towSize / 2, towSize * 0.44, 84, towSize / 2, towSize * 0.5, 232);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, theme.light ? "rgba(24, 40, 60, 0.14)" : "rgba(0,0,0,0.44)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, towSize, towSize);
    }

    function drawBeam(geo) {
      var y = geo.baseY;
      var x = 8;
      var w = towSize - 16;
      ctx.save();
      ctx.globalAlpha = theme.light ? 0.18 : 0.5;
      ctx.fillStyle = "#04070c";
      roundPath(x + 4, y + BEAM_H - 3, w - 8, 9, 5);
      ctx.fill();
      ctx.restore();

      /* each rod seats in a machined collar on the deck */
      for (var p = 0; p < 3; p += 1) {
        oval(geo.lane[p], y + 2, 34, 5);
        ctx.fillStyle = theme.light ? "rgba(40, 60, 84, 0.26)" : "rgba(4, 8, 14, 0.55)";
        ctx.fill();
        ctx.lineWidth = 1.4;
        ctx.strokeStyle = "hsla(" + theme.hue + ", 60%, " + (theme.light ? "34%, 0.5" : "86%, 0.34") + ")";
        ctx.stroke();
      }

      var g = ctx.createLinearGradient(0, y, 0, y + BEAM_H);
      g.addColorStop(0, "hsl(" + theme.hue + ", 18%, " + (theme.light ? "86%" : "74%") + ")");
      g.addColorStop(0.26, "hsl(" + theme.hue + ", 20%, " + (theme.light ? "70%" : "52%") + ")");
      g.addColorStop(0.62, "hsl(" + theme.hue + ", 24%, " + (theme.light ? "50%" : "30%") + ")");
      g.addColorStop(1, "hsl(" + theme.hue + ", 26%, " + (theme.light ? "32%" : "16%") + ")");
      roundPath(x, y, w, BEAM_H, 4);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = theme.light ? "rgba(28, 46, 68, 0.5)" : "rgba(4, 8, 14, 0.8)";
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fillRect(x + 3, y + 1, w - 6, 1.4);
      ctx.fillStyle = "rgba(0,0,0,0.34)";
      ctx.fillRect(x + 3, y + BEAM_H - 2.4, w - 6, 1.4);

      var bolts = [x + 9, geo.lane[0], geo.lane[1], geo.lane[2], x + w - 9];
      for (var b = 0; b < bolts.length; b += 1) {
        var bx = bolts[b];
        var by = y + BEAM_H / 2 + 1;
        ctx.beginPath();
        ctx.arc(bx, by, 2.6, 0, Math.PI * 2);
        ctx.fillStyle = "hsl(" + theme.hue + ", 16%, " + (theme.light ? "38%" : "22%") + ")";
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.34)";
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(bx - 1.6, by - 1);
        ctx.lineTo(bx + 1.6, by + 1);
        ctx.stroke();
      }
    }

    function rodGlow(geo, p, strength) {
      if (strength <= 0) {
        return;
      }
      var w = 32;
      var top = geo.rodTop - 10;
      var g = ctx.createLinearGradient(0, top, 0, geo.baseY);
      g.addColorStop(0, "hsla(" + theme.hue + ", 96%, 70%, " + 0.03 * strength + ")");
      g.addColorStop(1, "hsla(" + theme.hue + ", 96%, 70%, " + 0.22 * strength + ")");
      ctx.fillStyle = g;
      ctx.fillRect(geo.lane[p] - w / 2, top, w, geo.baseY - top);
    }

    function drawRod(geo, p, now) {
      var jitter = pegJitter[p];
      var cx = geo.lane[p] + (jitter > 0 ? Math.sin(now / 26) * 2.4 * jitter : 0);
      var w = 9;
      var heldHere = lifted !== null && liftedFrom === p;
      var chosen = lifted !== null && previewPeg() === p && liftedFrom !== p;
      rodGlow(geo, p, heldHere ? 0.9 : chosen ? 0.55 : p === 2 ? 0.3 : 0.12);

      /* flange the rod is bolted to */
      ctx.beginPath();
      ctx.moveTo(cx - 15, geo.baseY + 2);
      ctx.lineTo(cx - 7, geo.baseY - 7);
      ctx.lineTo(cx + 7, geo.baseY - 7);
      ctx.lineTo(cx + 15, geo.baseY + 2);
      ctx.closePath();
      var fg = ctx.createLinearGradient(cx - 15, 0, cx + 15, 0);
      fg.addColorStop(0, "hsl(" + theme.hue + ", 20%, 22%)");
      fg.addColorStop(0.45, "hsl(" + theme.hue + ", 16%, 66%)");
      fg.addColorStop(1, "hsl(" + theme.hue + ", 22%, 20%)");
      ctx.fillStyle = fg;
      ctx.fill();
      ctx.strokeStyle = "rgba(4, 8, 14, 0.7)";
      ctx.lineWidth = 1;
      ctx.stroke();

      /* turned shaft */
      roundPath(cx - w / 2, geo.rodTop, w, geo.baseY - geo.rodTop - 4, w / 2);
      ctx.fillStyle = steel(cx - w / 2, cx + w / 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(4, 8, 14, 0.55)";
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.strokeStyle = "rgba(4, 8, 14, 0.26)";
      ctx.lineWidth = 0.7;
      for (var gy = geo.rodTop + 8; gy < geo.baseY - 8; gy += 9) {
        ctx.beginPath();
        ctx.moveTo(cx - w / 2 + 0.6, gy);
        ctx.lineTo(cx + w / 2 - 0.6, gy);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.fillRect(cx - w / 2 + 2, geo.rodTop + 4, 1.5, geo.baseY - geo.rodTop - 12);

      /* domed cap */
      oval(cx, geo.rodTop + 1, w / 2 + 0.8, 3.1);
      ctx.fillStyle = "hsl(" + theme.hue + ", 14%, " + (theme.light ? "88%" : "78%") + ")";
      ctx.fill();
      ctx.strokeStyle = "rgba(4, 8, 14, 0.5)";
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.beginPath();
      ctx.arc(cx - 1.6, geo.rodTop + 0.2, 0.9, 0, Math.PI * 2);
      ctx.fill();
    }

    /* A disc is a machined bar: bevelled, bored with the rod showing through,
     * and debossed with its size at both ends. */
    function drawDisc(cx, cy, size, geo, opt) {
      var o = opt || {};
      var w = discWidth(size);
      var h = o.h || geo.discH;
      var p = discPalette(size);
      var sx = o.sx === undefined ? 1 : o.sx;
      var sy = o.sy === undefined ? 1 : o.sy;
      ctx.save();
      ctx.globalAlpha *= o.alpha === undefined ? 1 : o.alpha;
      ctx.translate(cx, cy);
      if (o.tilt) {
        ctx.rotate((o.tilt * Math.PI) / 180);
      }
      if (sx !== 1 || sy !== 1) {
        ctx.scale(sx, sy);
      }
      var x = -w / 2;
      var y = -h / 2;
      var r = Math.min(h / 2 - 0.4, 7);

      roundPath(x, y, w, h, r);
      var g = ctx.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, p.lit);
      g.addColorStop(0.34, p.main);
      g.addColorStop(0.66, p.main);
      g.addColorStop(1, p.deep);
      ctx.fillStyle = g;
      if (o.glow) {
        ctx.shadowColor = p.glow;
        ctx.shadowBlur = o.glow;
      }
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.save();
      roundPath(x, y, w, h, r);
      ctx.clip();
      /* chamfer catching the shop light, shade pooling at the foot */
      ctx.fillStyle = "rgba(255,255,255,0.36)";
      ctx.fillRect(x, y, w, Math.max(2, h * 0.24));
      ctx.fillStyle = "rgba(0,0,0,0.12)";
      ctx.fillRect(x, y + h * 0.24, w, Math.max(1, h * 0.12));
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.fillRect(x, y + h - Math.max(2, h * 0.26), w, Math.max(2, h * 0.26));
      if (w >= 42) {
        var bw = Math.min(11, h * 0.6);
        roundPath(-bw / 2, y + 1.6, bw, h - 3.2, bw / 2);
        ctx.fillStyle = "rgba(6, 10, 16, 0.62)";
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.2)";
        ctx.fillRect(-bw / 2 + 1.4, y + 1.6, 1.4, h - 3.2);
      }
      var gx = w * 0.3;
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(0,0,0,0.26)";
      ctx.beginPath();
      ctx.moveTo(-gx, y + 1.4);
      ctx.lineTo(-gx, y + h - 1.4);
      ctx.moveTo(gx, y + 1.4);
      ctx.lineTo(gx, y + h - 1.4);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.26)";
      ctx.beginPath();
      ctx.moveTo(-gx + 1.2, y + 1.4);
      ctx.lineTo(-gx + 1.2, y + h - 1.4);
      ctx.moveTo(gx + 1.2, y + 1.4);
      ctx.lineTo(gx + 1.2, y + h - 1.4);
      ctx.stroke();
      ctx.restore();

      roundPath(x, y, w, h, r);
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = p.line;
      ctx.stroke();

      var fs = Math.max(7, Math.min(11, Math.round(h * 0.62)));
      ctx.font = "800 " + fs + "px 'JetBrains Mono', ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      var spots = w >= 42 ? [-w * 0.185, w * 0.185] : [0];
      for (var i = 0; i < spots.length; i += 1) {
        ctx.fillStyle = "rgba(255,255,255,0.42)";
        ctx.fillText(String(size), spots[i], 0.9);
        ctx.fillStyle = "rgba(8, 12, 20, 0.78)";
        ctx.fillText(String(size), spots[i], 0);
      }
      ctx.restore();
    }

    function shadowUnder(geo, cx, w, cy) {
      var lift = clampNum(0, 1, (geo.baseY - cy) / Math.max(1, geo.baseY - geo.hoverY));
      ctx.save();
      ctx.globalAlpha = (theme.light ? 0.24 : 0.5) * (1 - lift * 0.6);
      ctx.fillStyle = "#05080e";
      oval(cx, geo.baseY + 2.5, w * 0.5 * (1 - lift * 0.22), 4.4 * (1 - lift * 0.3));
      ctx.fill();
      ctx.restore();
    }

    /* While the tower is being built, a disc still hanging above its slot comes
     * back as how far above it is and how faint it should read. */
    function entranceOffset(index) {
      if (entrance < 0) {
        return null;
      }
      var start = 90 + index * beat(70);
      var dur = beat(300);
      if (dur <= 0 || entrance >= start + dur) {
        return null;
      }
      if (entrance < start) {
        return { dy: 240, alpha: 0 };
      }
      var k = (entrance - start) / dur;
      return { dy: 240 * (1 - easeOut(k)), alpha: 0.3 + 0.7 * Math.min(1, k * 2.2) };
    }

    function entranceLand(peg, index, size, geo) {
      var key = peg + ":" + index;
      if (landedFlags[key]) {
        return;
      }
      landedFlags[key] = 1;
      visBySize[size] = beat(200);
      emit(geo.lane[peg], geo.baseY - index * geo.discH, "dust", calm() ? 3 : 6);
      if (index % 2 === 0) {
        sfx("step");
      }
    }

    function drawStack(geo, now) {
      for (var p = 0; p < 3; p += 1) {
        var stack = pegs[p];
        for (var d = 0; d < stack.length; d += 1) {
          var size = stack[d];
          var settle = visBySize[size] || 0;
          var sx = 1;
          var sy = 1;
          if (settle > 0) {
            var q = Math.sin(Math.PI * clampNum(0, 1, 1 - settle / 200));
            sx = 1 + 0.1 * q;
            sy = 1 - 0.12 * q;
          }
          var jitter = pegJitter[p];
          var hang = entranceOffset(d);
          var cx = geo.lane[p] + (jitter > 0 ? Math.sin(now / 22 + d) * 1.8 * jitter : 0);
          var cy = slotY(geo, p, d) - (hang ? hang.dy : 0);
          if (hang && hang.dy <= 8) {
            entranceLand(p, d, size, geo);
          }
          drawDisc(cx, cy, size, geo, {
            h: geo.discH,
            sx: sx,
            sy: sy,
            alpha: hang ? hang.alpha : 1,
            glow: d === stack.length - 1 ? 6 : 3,
          });
        }
      }
    }

    function previewPeg() {
      if (hover >= 0) {
        return hover;
      }
      return focused ? caretPeg : -1;
    }

    /* The drop preview: an outlined slot where the held disc would land, and a
     * no-entry mark when the rule says it cannot. */
    function drawGhost(geo) {
      if (lifted === null || flight) {
        return;
      }
      var target = previewPeg();
      if (target < 0 || target === liftedFrom) {
        return;
      }
      var top = pegs[target][pegs[target].length - 1];
      var illegal = top !== undefined && top < lifted;
      var w = discWidth(lifted);
      var cy = slotY(geo, target, pegs[target].length);
      ctx.save();
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = illegal ? "rgba(251, 113, 133, 0.9)" : "hsla(" + theme.hue + ", 96%, 76%, 0.85)";
      roundPath(geo.lane[target] - w / 2, cy - geo.discH / 2, w, geo.discH, 5);
      ctx.stroke();
      ctx.setLineDash([]);
      if (illegal) {
        noEntry(geo.lane[target], cy - geo.discH * 1.6, 9, "rgba(251, 113, 133, 0.95)");
      }
      ctx.restore();
    }

    function noEntry(cx, cy, r, color) {
      ctx.save();
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.7, cy + r * 0.7);
      ctx.lineTo(cx + r * 0.7, cy - r * 0.7);
      ctx.stroke();
      ctx.restore();
    }

    function drawFlying(geo, now) {
      if (lifted === null) {
        return;
      }
      var cx = geo.lane[liftedFrom];
      var cy = geo.hoverY;
      var tilt = 0;
      var sx = 1;
      var sy = 1;
      if (flight) {
        var p = pose(flight, geo);
        cx = p.x;
        cy = p.y;
        tilt = p.tilt;
        sx = p.sx;
        sy = p.sy;
      } else if (!motionOff()) {
        cy += Math.sin(now / 240) * 3;
        tilt = Math.sin(now / 430) * 2.4;
      }
      shadowUnder(geo, cx, discWidth(lifted), cy);
      drawDisc(cx, cy, lifted, geo, { h: geo.discH, tilt: tilt, sx: sx, sy: sy, glow: 16 });
    }

    /* The refused move stays on screen long enough to read: the two sizes and a
     * cross, so the explanation is not carried by colour alone. */
    function drawBlocked(geo) {
      if (!blocked) {
        return;
      }
      var a = clampNum(0, 1, blocked.life);
      var lane = geo.lane[blocked.peg];
      var top = Math.max(0, pegs[blocked.peg].length - 1);
      var cy = slotY(geo, blocked.peg, top) - geo.discH * 0.5;
      ctx.save();
      ctx.globalAlpha = a;
      noEntry(lane, cy, 12 + 6 * (1 - a), "rgba(251, 113, 133, 0.95)");
      var chipW = 48;
      var chipY = cy - geo.discH * 1.9 - 6;
      roundPath(lane - chipW / 2, chipY - 8, chipW, 16, 8);
      ctx.fillStyle = "rgba(6, 10, 18, 0.84)";
      ctx.fill();
      ctx.strokeStyle = "rgba(251, 113, 133, 0.85)";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.font = "800 9px 'JetBrains Mono', ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#fda4af";
      ctx.fillText(String(blocked.big) + " \u2715 " + String(blocked.small), lane, chipY + 0.5);
      ctx.restore();
    }

    /* The peg numbers double as the keyboard keys the hint promises. */
    function drawKeys(geo) {
      var y = geo.baseY + BEAM_H + 7;
      var h = 17;
      for (var p = 0; p < 3; p += 1) {
        var cx = geo.lane[p];
        var on = (focused && caretPeg === p) || (lifted !== null && liftedFrom === p);
        roundPath(cx - 13, y, 26, h, 5);
        var g = ctx.createLinearGradient(0, y, 0, y + h);
        g.addColorStop(0, on ? "hsla(" + theme.hue + ", 90%, 64%, 0.95)" : "rgba(148, 163, 184, 0.16)");
        g.addColorStop(1, on ? "hsla(" + theme.hue + ", 90%, 34%, 0.95)" : "rgba(15, 23, 42, 0.34)");
        ctx.fillStyle = g;
        ctx.fill();
        ctx.lineWidth = on ? 1.3 : 1;
        ctx.strokeStyle = on ? "hsla(" + theme.hue + ", 96%, 82%, 0.9)" : "rgba(148, 163, 184, 0.3)";
        ctx.stroke();
        ctx.font = "800 10px 'JetBrains Mono', ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = on ? (theme.light ? "#0b1220" : "#f8fbff") : "rgba(226, 232, 240, 0.78)";
        ctx.fillText(String(p + 1), cx, y + h / 2 + 0.5);
      }
    }

    function drawGoalMark(geo, now) {
      var cx = geo.lane[2];
      var pulse = motionOff() ? 0.7 : 0.5 + 0.4 * Math.abs(Math.sin(now / 520));
      var y = geo.rodTop - 24;
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.fillStyle = "#a3e635";
      ctx.strokeStyle = "rgba(8, 20, 4, 0.6)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 9, y - 6);
      ctx.lineTo(cx + 9, y - 6);
      ctx.lineTo(cx, y + 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.globalAlpha = pulse * 0.45;
      ctx.fillRect(cx - 10, y - 12, 20, 2.4);
      ctx.restore();
    }

    function draw(now) {
      var geo = geometry();
      syncCanvas();
      ctx.clearRect(0, 0, towSize, towSize);
      drawBackdrop(geo);
      ctx.save();
      if (jolt > 0) {
        ctx.translate((Math.random() - 0.5) * 7 * jolt, (Math.random() - 0.5) * 4 * jolt);
      }
      drawBeam(geo);
      for (var p = 0; p < 3; p += 1) {
        drawRod(geo, p, now);
      }
      drawStack(geo, now);
      drawGhost(geo);
      drawFlying(geo, now);
      drawBlocked(geo);
      drawParticles();
      drawKeys(geo);
      drawGoalMark(geo, now);
      ctx.restore();
      drawVignette();
    }

    /* ---------------------------------------------------------------- the loop */

    function settling() {
      for (var k in visBySize) {
        if (Object.prototype.hasOwnProperty.call(visBySize, k) && visBySize[k] > 0) {
          return true;
        }
      }
      return false;
    }

    /* Anything in motion, a held disc, a running clock or a fading mark keeps the
     * loop alive; a settled bench stops it rather than spinning rAF. */
    function needsFrame() {
      return !!(
        flight ||
        lifted !== null ||
        entrance >= 0 ||
        ripples.length ||
        jolt > 0 ||
        (blocked && !motionOff()) ||
        clockRunning ||
        pegJitter[0] > 0 ||
        pegJitter[1] > 0 ||
        pegJitter[2] > 0 ||
        settling()
      );
    }

    function step(dt) {
      if (entrance >= 0) {
        entrance += dt;
        if (entrance > 90 + level.discs * beat(70) + beat(300)) {
          entrance = -1;
          landedFlags = {};
          visBySize = {};
        }
      }
      for (var s in visBySize) {
        if (Object.prototype.hasOwnProperty.call(visBySize, s) && visBySize[s] > 0) {
          visBySize[s] = Math.max(0, visBySize[s] - dt);
        }
      }
      for (var p = 0; p < 3; p += 1) {
        if (pegJitter[p] > 0) {
          pegJitter[p] = Math.max(0, pegJitter[p] - dt / 260);
        }
      }
      if (jolt > 0) {
        jolt = Math.max(0, jolt - dt / 240);
      }
      if (blocked && !motionOff()) {
        blocked.life -= dt / 620;
        if (blocked.life <= 0) {
          blocked = null;
        }
      }
      stepFlight(dt, geometry());
      stepParticles(dt);
      renderTime();
    }

    function frame() {
      if (rafId === null) {
        return;
      }
      var hidden = !!(panelEl && panelEl.hidden) || !!document.hidden;
      if (hidden) {
        wasHidden = true;
        rafId = window.requestAnimationFrame(frame);
        return;
      }
      if (wasHidden) {
        /* back on the bench: re-measure and repaint before anything animates */
        wasHidden = false;
        lastAt = 0;
        syncTheme(true);
        draw(Date.now());
        rafId = window.requestAnimationFrame(frame);
        return;
      }
      var now = Date.now();
      var dt = lastAt ? clampNum(1, 64, now - lastAt) : 16.7;
      lastAt = now;
      syncTheme(false);
      step(dt);
      draw(now);
      if (!needsFrame()) {
        rafId = null;
        return;
      }
      rafId = window.requestAnimationFrame(frame);
    }

    function pump() {
      if (rafId !== null) {
        return;
      }
      lastAt = 0;
      rafId = window.requestAnimationFrame(frame);
    }

    /* ------------------------------------------------------------------ input */

    function pegFromEvent(event) {
      var rect = canvas.getBoundingClientRect();
      if (!rect.width) {
        return -1;
      }
      var px = ((event.clientX || 0) - rect.left) * (towSize / rect.width);
      var geo = geometry();
      for (var p = 0; p < 3; p += 1) {
        if (px >= geo.pegX[p] - 4 && px <= geo.pegX[p] + geo.pegW + 4) {
          return p;
        }
      }
      return -1;
    }

    canvas.addEventListener("pointerdown", function (event) {
      if (event.preventDefault) {
        event.preventDefault();
      }
      var peg = pegFromEvent(event);
      if (peg >= 0) {
        hover = peg;
        caretPeg = peg;
      }
      tapPeg(peg);
    });

    canvas.addEventListener("pointermove", function (event) {
      var peg = pegFromEvent(event);
      if (peg !== hover) {
        hover = peg;
        pump();
      }
    });

    canvas.addEventListener("pointerleave", function () {
      hover = -1;
      pump();
    });

    canvas.addEventListener("focus", function () {
      focused = true;
      pump();
    });

    canvas.addEventListener("blur", function () {
      focused = false;
      pump();
    });

    canvas.addEventListener("keydown", function (event) {
      var key = event.key;
      if (key === "1" || key === "2" || key === "3") {
        if (event.preventDefault) {
          event.preventDefault();
        }
        focused = true;
        caretPeg = parseInt(key, 10) - 1;
        tapPeg(caretPeg);
        return;
      }
      if (key === "ArrowLeft" || key === "ArrowRight") {
        if (event.preventDefault) {
          event.preventDefault();
        }
        focused = true;
        caretPeg = (caretPeg + (key === "ArrowRight" ? 1 : 2)) % 3;
        sfx("tap");
        pump();
        return;
      }
      if (key === "Enter" || key === " ") {
        if (event.preventDefault) {
          event.preventDefault();
        }
        focused = true;
        tapPeg(caretPeg);
      }
    });

    selectEl.addEventListener("change", function () {
      var index = campaign.indexOf(selectEl.value);
      if (index >= 0 && campaign.isUnlocked(selectEl.value)) {
        settleFlightNow();
        loadLevel(towLevels[index]);
        sfx("flip");
      }
    });

    startBtn.addEventListener("click", function () {
      settleFlightNow();
      loadLevel(level);
      sfx("tap");
      fx("sweep", [startBtn]);
    });

    /* The drawer hides this panel and calls quietReset; the tab click is the only
     * notice the game gets that it is visible again. */
    var tabEl = getElement("gameTabGlyphTower");
    if (tabEl && tabEl.addEventListener) {
      tabEl.addEventListener("click", function () {
        wasHidden = true;
        syncTheme(true);
        pump();
      });
    }

    App.quietResetGlyphTower = function () {
      clearTimers();
      if (pendingNext) {
        var next = pendingNext;
        pendingNext = null;
        loadLevel(next);
      }
      settleFlightNow();
      clockRunning = false;
      hover = -1;
      queuedTap = null;
      resultEl.textContent = t("towPaused");
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
      lastAt = 0;
      syncTheme(true);
      draw(Date.now());
    };

    buildPlaque();
    loadLevel(towLevels[campaign.indexOf(campaign.nextLevelId())]);
  }


  /* Exported for the other modules. */
  App.initGlyphTowerGame = initGlyphTowerGame;
})(window.CapitalConvert = window.CapitalConvert || {});
