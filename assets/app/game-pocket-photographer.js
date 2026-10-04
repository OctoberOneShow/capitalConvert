/* Pocket Photographer - a nature-timing outing at one pond with four shy species
 * and a limited roll of film. A good image needs behaviour, composition and
 * timing at once, so snapping early buys a frame without the behaviour bonus,
 * and a shutter that misses the moment puts the creature up: it relocates onto a
 * different line for the rest of the outing. The scene, the shutter and the star
 * bands all run through the same pure stepper below, and the bands are measured
 * by replaying a scripted best-play line, never guessed.
 * Registered through the game registry, so it needs no markup in the HTML pages. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  var t = App.t;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  var createCampaign = App.createCampaign;
  var fillCampaignPicker = App.fillCampaignPicker;
  var starsFor = App.starsFor;

  var pphW = 420;
  var pphH = 300;
  var pphTapDt = 0.05; /* one key press walks the scene this far */
  var pphPanRate = 176;
  var pphFocusRate = 0.8;
  var pphFineRate = 0.2;
  var pphFocusSpan = 0.2; /* focus error at which the image is fully soft */
  var pphCrispAt = 0.8;
  var pphReedFade = 26;
  var pphMaxStep = 0.032;
  var pphBehMax = 40;
  var pphCompMax = 35;
  var pphTimeMax = 25;
  var pphFlushTime = 3.2;
  var pphSpookShort = 0.6; /* a spooked creature's window shrinks to this */

  var pphGates = { moment: 1, early: 0.42, late: 0.3, idle: 0.14, flush: 0 };

  /* Reed cover: the only thing on the pond that hides a subject. */
  var pphReeds = [
    { x: 0, y: 2, w: 420, h: 36 },
    { x: 6, y: 96, w: 62, h: 86 },
    { x: 336, y: 56, w: 80, h: 64 },
  ];

  /* Two routes per species: the line it works when it trusts you, and the line
   * it switches to once a mis-timed shutter has put it up. Escape lines hug the
   * reeds, so a scared bird is both harder to frame and harder to focus. */
  function pphPt(list) {
    var pts = [];
    for (var i = 0; i < list.length; i += 1) {
      pts.push({ x: list[i][0], y: list[i][1] });
    }
    return pts;
  }

  var pphSpecies = {
    coot: {
      labelKey: "pphSpCoot", letter: "C", speed: 26, head: 12, r: 9, quality: 0.8,
      cycle: [
        { k: "pphBGraze", dur: 2.8, mul: 1, gate: pphGates.idle },
        { k: "pphBWatch", dur: 1.3, mul: 0.25, gate: pphGates.early },
        { k: "pphBPreen", dur: 1.15, mul: 0, gate: pphGates.moment, moment: true },
        { k: "pphBWaddle", dur: 1.5, mul: 1.35, gate: pphGates.late },
      ],
      routes: [
        pphPt([[78, 236], [168, 252], [262, 242], [330, 214], [296, 182], [186, 176], [104, 196]]),
        pphPt([[66, 120], [150, 98], [246, 92], [330, 108], [286, 138], [166, 146]]),
      ],
    },
    warbler: {
      labelKey: "pphSpWarbler", letter: "W", speed: 40, head: 7, r: 5, quality: 0.86,
      cycle: [
        { k: "pphBDart", dur: 1.6, mul: 1.5, gate: pphGates.idle },
        { k: "pphBWary", dur: 1.1, mul: 0.3, gate: pphGates.early },
        { k: "pphBSing", dur: 0.62, mul: 0, gate: pphGates.moment, moment: true },
        { k: "pphBHop", dur: 1.2, mul: 1, gate: pphGates.late },
      ],
      routes: [
        pphPt([[36, 156], [62, 118], [98, 92], [86, 146], [50, 190], [26, 184]]),
        pphPt([[348, 104], [392, 82], [402, 120], [358, 130]]),
      ],
    },
    heron: {
      labelKey: "pphSpHeron", letter: "H", speed: 11, head: 30, r: 12, quality: 1,
      cycle: [
        { k: "pphBStand", dur: 3.4, mul: 0.35, gate: pphGates.idle },
        { k: "pphBLean", dur: 1.5, mul: 0.15, gate: pphGates.early },
        { k: "pphBStrike", dur: 0.7, mul: 0, gate: pphGates.moment, moment: true },
        { k: "pphBSwallow", dur: 1.6, mul: 0.2, gate: pphGates.late },
      ],
      routes: [
        pphPt([[352, 232], [300, 258], [238, 266], [296, 240], [348, 208]]),
        pphPt([[58, 246], [112, 268], [176, 272], [120, 250], [62, 224]]),
      ],
    },
    otter: {
      labelKey: "pphSpOtter", letter: "O", speed: 46, head: 6, r: 10, quality: 0.92,
      cycle: [
        { k: "pphBSwim", dur: 2.4, mul: 1.4, gate: pphGates.idle },
        { k: "pphBWatch", dur: 1, mul: 0.4, gate: pphGates.early },
        { k: "pphBRoll", dur: 0.85, mul: 0.1, gate: pphGates.moment, moment: true },
        { k: "pphBDive", dur: 1.4, mul: 1.7, gate: pphGates.late },
      ],
      routes: [
        pphPt([[120, 140], [218, 158], [318, 150], [356, 178], [250, 196], [148, 182]]),
        pphPt([[96, 86], [196, 74], [300, 80], [344, 60], [240, 52], [130, 60]]),
      ],
    },
  };

  /* Ten outings. `need` is the album target (distinct species with a behaviour
   * shot), `budget` the frames on the roll, `momentScale` how generous the
   * behaviour window is and `drift` how fast focus wanders on its own.
   * The rungs are ordered by the album a scripted best play actually measures
   * (see pphBestLine), so the ladder climbs rung by rung and every star band
   * sits on a number someone really reached. Past "Reedy Corner" the ponds get
   * harder by demanding better frames rather than luckier ones: the roll
   * shortens against the target, the window narrows, the wind freshens, the
   * viewfinder shrinks, the water fills with extra birds - and the quality bar
   * rises, which is what lifts the measured best play from rung to rung. */
  var pphLevels = [
    {
      id: "pph1", labelKey: "pphZ1", seed: 4711, budget: 10, need: 1,
      momentScale: 1.35, drift: 0.016, wind: false, scoreMin: 50, behaviourMin: 22,
      assist: true,
      frameW: 140, frameH: 102, start: { x: 210, y: 216, focus: 0.28 },
      roster: [{ sp: "coot", n: 1 }],
    },
    {
      id: "pph2", labelKey: "pphZ2", seed: 9203, budget: 10, need: 2,
      momentScale: 1.1, drift: 0.024, wind: false, scoreMin: 50, behaviourMin: 22,
      assist: true,
      frameW: 136, frameH: 100, start: { x: 190, y: 200, focus: 0.34 },
      roster: [{ sp: "coot", n: 1 }, { sp: "warbler", n: 1 }],
    },
    {
      id: "pph3", labelKey: "pphZ3", seed: 1555, budget: 10, need: 3,
      momentScale: 1, drift: 0.03, wind: false, scoreMin: 52, behaviourMin: 22,
      frameW: 132, frameH: 96, start: { x: 220, y: 210, focus: 0.3 },
      roster: [{ sp: "coot", n: 1 }, { sp: "warbler", n: 1 }, { sp: "heron", n: 1 }],
    },
    {
      id: "pph4", labelKey: "pphZ4", seed: 6808, budget: 10, need: 3,
      momentScale: 1, drift: 0.062, wind: true, scoreMin: 52, behaviourMin: 22,
      frameW: 130, frameH: 94, start: { x: 210, y: 170, focus: 0.5 },
      roster: [{ sp: "coot", n: 1 }, { sp: "heron", n: 1 }, { sp: "otter", n: 1 }],
    },
    {
      /* The last teaching pond turned finale: same roll, same window, same wind,
       * only the bar for what counts as a behaviour shot was raised, which is
       * what puts its measured album (277) above Windy Reedbank's (273). */
      id: "pph5", labelKey: "pphZ5", seed: 3141, budget: 8, need: 3,
      momentScale: 0.9, drift: 0.042, wind: true, scoreMin: 66, behaviourMin: 24,
      frameW: 126, frameH: 92, start: { x: 200, y: 180, focus: 0.42 },
      roster: [{ sp: "coot", n: 1 }, { sp: "warbler", n: 1 }, { sp: "heron", n: 1 }, { sp: "otter", n: 1 }],
    },
    /* The rest of the ladder asks for the whole chorus: four species, one roll. */
    {
      /* Measured best play: 334 (coot 84, warbler 64, otter 89, heron 97). */
      id: "pph6", labelKey: "pphZ6", seed: 9417, budget: 10, need: 4,
      momentScale: 1, drift: 0.03, wind: false, scoreMin: 54, behaviourMin: 24,
      frameW: 132, frameH: 96, start: { x: 200, y: 180, focus: 0.42 },
      roster: [{ sp: "coot", n: 1 }, { sp: "warbler", n: 1 }, { sp: "heron", n: 1 }, { sp: "otter", n: 1 }],
    },
    {
      /* Measured best play: 338 (otter 83, coot 84, heron 97, warbler 74). */
      id: "pph7", labelKey: "pphZ7", seed: 4188, budget: 9, need: 4,
      momentScale: 0.95, drift: 0.042, wind: true, scoreMin: 62, behaviourMin: 24,
      frameW: 130, frameH: 96, start: { x: 200, y: 180, focus: 0.42 },
      roster: [{ sp: "coot", n: 1 }, { sp: "warbler", n: 1 }, { sp: "heron", n: 1 }, { sp: "otter", n: 1 }],
    },
    {
      /* Two warblers work the reeds and the album has room for one of them.
       * Measured best play: 347 (coot 90, otter 88, heron 96, warbler 73). */
      id: "pph8", labelKey: "pphZ8", seed: 1204, budget: 9, need: 4,
      momentScale: 0.92, drift: 0.05, wind: true, scoreMin: 66, behaviourMin: 26,
      frameW: 128, frameH: 94, start: { x: 200, y: 180, focus: 0.42 },
      roster: [{ sp: "coot", n: 1 }, { sp: "warbler", n: 2 }, { sp: "heron", n: 1 }, { sp: "otter", n: 1 }],
    },
    {
      /* Measured best play: 353 (otter 87, warbler 87, coot 82, heron 97). */
      id: "pph9", labelKey: "pphZ9", seed: 3307, budget: 8, need: 4,
      momentScale: 0.88, drift: 0.062, wind: true, scoreMin: 74, behaviourMin: 28,
      frameW: 126, frameH: 92, start: { x: 200, y: 180, focus: 0.42 },
      roster: [{ sp: "coot", n: 1 }, { sp: "warbler", n: 2 }, { sp: "heron", n: 1 }, { sp: "otter", n: 1 }],
    },
    {
      /* Two warblers and two otters, seven frames, four species: only a clean
       * frame files. Measured best play: 370 (otter 93, coot 89, warbler 91,
       * heron 97) - four exposures, three frames of the roll left. */
      id: "pph10", labelKey: "pphZ10", seed: 8123, budget: 7, need: 4,
      momentScale: 0.86, drift: 0.08, wind: true, scoreMin: 82, behaviourMin: 28,
      frameW: 124, frameH: 90, start: { x: 200, y: 180, focus: 0.42 },
      roster: [{ sp: "coot", n: 1 }, { sp: "warbler", n: 2 }, { sp: "heron", n: 1 }, { sp: "otter", n: 2 }],
    },
  ];

  /* Every control is one tap of the same pure stepper, so a key press and a
   * replayed tick move the scene identically. */
  var pphKeys = {
    ArrowLeft: { panX: -1 },
    ArrowRight: { panX: 1 },
    ArrowUp: { panY: -1 },
    ArrowDown: { panY: 1 },
    z: { focus: -1 },
    Z: { focus: -1 },
    x: { focus: 1 },
    X: { focus: 1 },
    u: { autofocus: true },
    U: { autofocus: true },
    " ": { fine: true },
    Spacebar: { fine: true },
  };

  /* --- pure core ---------------------------------------------------------- */

  /* Seeded and deterministic: an outing built from the same seed replays the
   * same way, and no Math.random survives anywhere in this module. */
  function pphRng(seed) {
    var s = (seed >>> 0) || 1;
    return function () {
      s = (s * 1664525 + 1013904223) % 4294967296;
      return s / 4294967296;
    };
  }

  function pphClamp(v, lo, hi) {
    if (!isFinite(v)) { return lo; }
    return v < lo ? lo : v > hi ? hi : v;
  }

  function pphInt(v) {
    var n = Math.round(Number(v));
    return isFinite(n) ? n : 0;
  }

  function pphHas(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
  }

  var pphRouteCache = {};

  /* A route is a closed polyline plus its arc table. */
  function pphRouteOf(spKey, index) {
    var sp = pphSpecies[spKey];
    var count = sp && sp.routes ? sp.routes.length : 0;
    if (!count) { return null; }
    var want = ((index % count) + count) % count;
    var key = spKey + "#" + want;
    if (pphRouteCache[key]) { return pphRouteCache[key]; }
    var raw = sp.routes[want];
    var pts = [];
    var i;
    var total = 0;
    for (i = 0; i < raw.length; i += 1) { pts.push({ x: raw[i].x, y: raw[i].y }); }
    pts.push({ x: raw[0].x, y: raw[0].y });
    var cum = [0];
    var seg = [];
    for (i = 0; i < pts.length - 1; i += 1) {
      var a = pts[i];
      var b = pts[i + 1];
      var l = Math.sqrt((b.x - a.x) * (b.x - a.x) + (b.y - a.y) * (b.y - a.y));
      seg.push(l);
      total += l;
      cum.push(total);
    }
    pphRouteCache[key] = { pts: pts, cum: cum, seg: seg, len: total > 0 ? total : 1 };
    return pphRouteCache[key];
  }

  function pphAt(route, s) {
    if (!route || !route.pts.length) { return { x: pphW / 2, y: pphH / 2 }; }
    var want = s % route.len;
    if (want < 0) { want += route.len; }
    for (var i = 0; i < route.seg.length; i += 1) {
      if (want <= route.cum[i + 1]) {
        var a = route.pts[i];
        var b = route.pts[i + 1];
        var k = route.seg[i] > 0 ? (want - route.cum[i]) / route.seg[i] : 0;
        return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
      }
    }
    var last = route.pts[route.pts.length - 1];
    return { x: last.x, y: last.y };
  }

  /* Arc position of the point on a route nearest `p`: where a flushed creature
   * re-enters its new line. */
  function pphNearestS(route, p) {
    if (!route || !route.seg.length) { return 0; }
    var best = 0;
    var bestD = Infinity;
    for (var i = 0; i < route.seg.length; i += 1) {
      var a = route.pts[i];
      var b = route.pts[i + 1];
      var bx = b.x - a.x;
      var by = b.y - a.y;
      var den = bx * bx + by * by;
      var k = pphClamp(den > 0 ? ((p.x - a.x) * bx + (p.y - a.y) * by) / den : 0, 0, 1);
      var cx = a.x + bx * k;
      var cy = a.y + by * k;
      var d = (cx - p.x) * (cx - p.x) + (cy - p.y) * (cy - p.y);
      if (d < bestD) { bestD = d; best = route.cum[i] + k * route.seg[i]; }
    }
    return best;
  }

  /* Depth is simply how far up the pond the bird stands: near bank 0, far reeds 1. */
  function pphDistAt(y) {
    return pphClamp(1 - y / (pphH > 0 ? pphH : 1), 0, 1);
  }

  function pphCoverOf(x, y) {
    var cover = 0;
    for (var i = 0; i < pphReeds.length; i += 1) {
      var r = pphReeds[i];
      var dx = Math.max(r.x - x, 0, x - (r.x + r.w));
      var dy = Math.max(r.y - y, 0, y - (r.y + r.h));
      var c = 1 - Math.sqrt(dx * dx + dy * dy) / (pphReedFade > 0 ? pphReedFade : 1);
      if (c > cover) { cover = c; }
    }
    return pphClamp(cover, 0, 1);
  }

  /* The behaviour cycle, with this level's window size and - once a creature has
   * been spooked - a shortened moment. */
  function pphCycleOf(spKey, level, spooked) {
    var sp = pphSpecies[spKey];
    var cyc = [];
    if (!sp) { return cyc; }
    var scale = level && level.momentScale > 0 ? level.momentScale : 1;
    for (var i = 0; i < sp.cycle.length; i += 1) {
      var p = sp.cycle[i];
      var dur = p.moment ? p.dur * scale * (spooked ? pphSpookShort : 1) : p.dur;
      cyc.push({ k: p.k, dur: dur > 0 ? dur : 0.2, mul: p.mul, gate: p.gate, moment: !!p.moment });
    }
    return cyc;
  }

  function pphCycTotal(cyc) {
    var total = 0;
    for (var i = 0; i < cyc.length; i += 1) { total += cyc[i].dur; }
    return total > 0 ? total : 1;
  }

  function pphPhaseOf(subject) {
    var cyc = subject && subject.cyc ? subject.cyc : [];
    var total = subject && subject.total > 0 ? subject.total : pphCycTotal(cyc);
    var beat = subject ? subject.beat % total : 0;
    if (beat < 0) { beat += total; }
    var acc = 0;
    for (var i = 0; i < cyc.length; i += 1) {
      if (beat < acc + cyc[i].dur) {
        return { i: i, phase: cyc[i], inT: beat - acc, left: acc + cyc[i].dur - beat };
      }
      acc += cyc[i].dur;
    }
    var last = cyc.length ? cyc[cyc.length - 1] : { k: "pphBGraze", dur: 1, mul: 1, gate: pphGates.idle, moment: false };
    return { i: cyc.length ? cyc.length - 1 : 0, phase: last, inT: 0, left: last.dur };
  }

  /* The telegraph: how long until the behaviour window opens (0 when it is open). */
  function pphToMoment(subject) {
    var cyc = subject && subject.cyc ? subject.cyc : [];
    var ph = pphPhaseOf(subject);
    if (ph.phase.moment) { return { open: true, left: Math.max(0, ph.left), inT: 0 }; }
    var wait = Math.max(0, ph.left);
    for (var i = 1; i <= cyc.length; i += 1) {
      var q = cyc[(ph.i + i) % cyc.length];
      if (!q) { break; }
      if (q.moment) { return { open: false, left: 0, inT: wait }; }
      wait += q.dur;
    }
    return { open: false, left: 0, inT: wait };
  }

  function pphCopySubject(s) {
    return {
      id: s.id, sp: s.sp, route: s.route, s: s.s, x: s.x, y: s.y, dist: s.dist,
      beat: s.beat, cyc: s.cyc, total: s.total, flushT: s.flushT, spooked: s.spooked,
      cover: s.cover, speed: s.speed,
    };
  }

  function pphCopyState(s) {
    var out = {};
    var key;
    for (key in s) { if (pphHas(s, key)) { out[key] = s[key]; } }
    out.frame = { x: s.frame.x, y: s.frame.y, w: s.frame.w, h: s.frame.h };
    return out;
  }

  function pphCopyAlbum(album) {
    var out = {};
    var key;
    for (key in album) {
      if (pphHas(album, key)) { out[key] = { score: album[key].score, n: album[key].n, beh: album[key].beh }; }
    }
    return out;
  }

  function pphAlbumSum(album) {
    var score = 0;
    var kept = 0;
    var key;
    for (key in album) {
      if (pphHas(album, key)) { kept += 1; score += Number(album[key].score) || 0; }
    }
    return { kept: kept, score: score };
  }

  /* One outing: a roll of film, a framing window and the creatures on the water. */
  function pphMake(level, seed, frameW, frameH) {
    if (!level) { return null; }
    var useSeed = typeof seed === "number" ? seed : level.seed;
    var rng = pphRng(useSeed);
    var subjects = [];
    var roster = level.roster || [];
    for (var r = 0; r < roster.length; r += 1) {
      var sp = pphSpecies[roster[r].sp];
      if (!sp) { continue; }
      var route = pphRouteOf(roster[r].sp, 0);
      var cyc = pphCycleOf(roster[r].sp, level, false);
      var total = pphCycTotal(cyc);
      var count = roster[r].n > 0 ? roster[r].n : 1;
      for (var k = 0; k < count; k += 1) {
        var s = rng() * route.len;
        var at = pphAt(route, s);
        subjects.push({
          id: roster[r].sp + (count > 1 ? String(k + 1) : ""), sp: roster[r].sp, route: 0, s: s,
          x: at.x, y: at.y, dist: pphDistAt(at.y), beat: rng() * total, cyc: cyc, total: total,
          flushT: 0, spooked: false, cover: pphCoverOf(at.x, at.y), speed: sp.speed,
        });
      }
    }
    var fw = pphClamp(Number(frameW) || level.frameW, 40, pphW);
    var fh = pphClamp(Number(frameH) || level.frameH, 40, pphH);
    /* An outing with no start plate still has to open on something finite. */
    var at0 = level.start || { x: pphW / 2, y: pphH / 2, focus: 0.4 };
    return {
      levelId: level.id, level: level, seed: useSeed, time: 0,
      budget: level.budget > 0 ? level.budget : 1, shotsLeft: level.budget > 0 ? level.budget : 1,
      frame: {
        x: pphClamp(at0.x, fw / 2, pphW - fw / 2),
        y: pphClamp(at0.y, fh / 2, pphH - fh / 2), w: fw, h: fh,
      },
      focus: pphClamp(at0.focus, 0, 1), fine: false, shake: 0,
      drift: level.drift > 0 ? level.drift : 0, windPhase: rng() * 6.283,
      subjects: subjects, shots: [], album: {}, kept: 0, albumScore: 0, over: null,
    };
  }

  /* Who is in the frame, and who is merely the closest thing on the pond. The
   * album still decides: an unfiled species wins a contested frame. */
  function pphTarget(state, level) {
    if (!state || !state.subjects || !state.frame) { return null; }
    var frame = state.frame;
    var halfW = frame.w > 0 ? frame.w / 2 : 1;
    var halfH = frame.h > 0 ? frame.h / 2 : 1;
    var wantSp = null;
    var w;
    if (level && level.roster && state.shots) {
      for (w = 0; w < level.roster.length; w += 1) {
        if (!state.album || !state.album[level.roster[w].sp]) {
          wantSp = level.roster[w].sp;
          break;
        }
      }
    }
    var best = null;
    var bestScore = 0;
    var near = null;
    var nearD = Infinity;
    for (var i = 0; i < state.subjects.length; i += 1) {
      var s = state.subjects[i];
      var dx = s.x - frame.x;
      var dy = s.y - frame.y;
      var d = dx * dx + dy * dy;
      if (d < nearD) { nearD = d; near = s; }
      if (Math.abs(dx) > halfW || Math.abs(dy) > halfH) { continue; }
      var rank = -d + (wantSp && s.sp === wantSp ? 100000 : 0);
      if (!best || rank > bestScore) { best = s; bestScore = rank; }
    }
    if (best) { return best; }
    /* Teaching ponds let a near miss count, so the reader still gets numbers for
     * the bird it is steering towards. */
    if (near && level && level.assist && nearD <= halfW * 1.45 * (halfW * 1.45)) { return near; }
    return null;
  }

  /* Closest creature to the centre, framed or not: what the player is steering
   * towards, and what the scripted line uses until something is worth shooting. */
  function pphNearest(state) {
    if (!state || !state.subjects || !state.frame) {
      return null;
    }
    var best = null;
    var bestD = Infinity;
    for (var i = 0; i < state.subjects.length; i += 1) {
      var s = state.subjects[i];
      var dx = s.x - state.frame.x;
      var dy = s.y - state.frame.y;
      var d = dx * dx + dy * dy;
      if (d < bestD) {
        bestD = d;
        best = s;
      }
    }
    return best;
  }

  /* The three numbers, and why. Pure: nothing here touches the state it reads. */
  function pphScore(state, subject, level) {
    var out = {
      behaviour: 0, composition: 0, timing: 0, score: 0,
      moment: false, gate: 0, words: "", toMoment: 0, momentLeft: 0,
      inside: false, headroom: 0, off: 0, cover: 0, focusErr: 0, focusFactor: 0,
      crisp: false, shake: 0, motion: 0, behaviourShot: false, reasons: [],
      reasonKey: "pphREmpty", reasonVars: {},
    };
    if (!state || !state.frame || !subject) {
      out.reasons.push({ k: "pphREmpty", v: {}, w: 100 });
      return out;
    }
    var sp = pphSpecies[subject.sp] || { head: 10, speed: 20, quality: 0.8, labelKey: "pphSpCoot" };
    var halfW = state.frame.w > 0 ? state.frame.w / 2 : 1;
    var halfH = state.frame.h > 0 ? state.frame.h / 2 : 1;
    var dx = subject.x - state.frame.x;
    var dy = subject.y - state.frame.y;
    var cyc = subject.cyc || [];
    var ph = pphPhaseOf(subject);
    var before = cyc.length ? cyc[(ph.i - 1 + cyc.length) % cyc.length] : null;
    var timed = pphToMoment(subject);
    var flushing = (subject.flushT || 0) > 0;
    var isOpen = !!ph.phase.moment && !flushing;
    /* "late" is the beat right after the window shuts; "telegraph" is the phase
     * the moment opens out of. Snapping either one costs the behaviour bonus. */
    var late = !isOpen && !flushing && !!before && !!before.moment && ph.inT <= 1.2;
    var telegraph = !isOpen && !late && !flushing && timed.inT > 0 && timed.inT <= ph.left + 0.01;

    function why(key, vars, loss) {
      out.reasons.push({ k: key, v: vars || {}, w: loss });
    }

    out.words = flushing ? "pphBFlush" : ph.phase.k;
    out.gate = flushing ? pphGates.flush : ph.phase.gate;
    out.moment = isOpen;
    out.toMoment = timed.open ? 0 : Math.round(timed.inT * 10) / 10;
    out.momentLeft = timed.open ? Math.round(Math.max(0, timed.left) * 10) / 10 : 0;

    /* behaviour: only the moment itself pays in full. */
    out.behaviour = pphInt(pphClamp(pphBehMax * out.gate * (sp.quality || 0.8), 0, pphBehMax));
    if (isOpen) {
      why("pphRMoment", { sp: t(sp.labelKey), b: t(out.words) }, 0);
    } else if (flushing) {
      why("pphRFlush", null, pphBehMax);
    } else if (late) {
      why("pphRLate", null, pphBehMax - out.behaviour);
    } else if (telegraph) {
      why("pphREarly", { n: out.toMoment }, pphBehMax - out.behaviour);
    } else {
      why("pphRIdle", { b: t(out.words) }, pphBehMax - out.behaviour);
    }

    /* composition: inside, off the edge, head-room, and reed cover. */
    out.inside = Math.abs(dx) < halfW - 8 && Math.abs(dy) < halfH - 8;
    out.cover = pphClamp(subject.cover || 0, 0, 1);
    out.headroom = subject.y - (sp.head || 10) - (state.frame.y - halfH);
    out.off = pphClamp(Math.abs(dx) / halfW * 0.6 + Math.abs(dy) / halfH * 0.4, 0, 1);
    var lo = 0.1 * state.frame.h;
    var hi = 0.45 * state.frame.h;
    var comp = 0;
    if (out.inside) {
      comp = 14 + 12 * (1 - out.off);
      comp += out.headroom >= lo && out.headroom <= hi ? 9 : out.headroom >= 0 && out.headroom <= hi * 1.6 ? 4 : 0;
    } else if (Math.abs(dx) < halfW && Math.abs(dy) < halfH) {
      comp = 8;
    }
    out.composition = pphInt(pphClamp(comp * (1 - 0.8 * out.cover), 0, pphCompMax));
    if (!out.inside) {
      why("pphROut", { sp: t(sp.labelKey), n: pphInt(Math.max(Math.abs(dx) - halfW, Math.abs(dy) - halfH)) }, pphCompMax - out.composition);
    } else if (out.headroom < 0) {
      why("pphRHead", null, pphCompMax - out.composition);
    } else if (out.headroom > hi * 1.6) {
      why("pphRSky", null, pphCompMax - out.composition);
    } else if (out.off > 0.62) {
      why("pphREdge", null, pphCompMax - out.composition);
    }
    if (out.cover > 0.4) {
      why("pphRReed", { n: pphInt(out.cover * 100) }, pphInt(pphCompMax * 0.8 * out.cover));
    }

    /* timing: the focus plane, how still the camera is, how fast the subject. */
    out.focusErr = Math.abs(state.focus - (subject.dist || 0));
    out.focusFactor = pphClamp(1 - out.focusErr / (pphFocusSpan > 0 ? pphFocusSpan : 1), 0, 1);
    out.crisp = out.focusFactor >= pphCrispAt;
    out.shake = pphClamp(state.shake || 0, 0, 1);
    out.motion = pphClamp((subject.speed || 0) / 70, 0, 1);
    out.timing = pphInt(pphClamp(pphTimeMax * out.focusFactor * (1 - 0.42 * out.shake) * (1 - 0.35 * out.motion), 0, pphTimeMax));
    if (out.focusFactor < 0.62) {
      why("pphRSoft", { n: pphInt(out.focusErr * 100) }, pphTimeMax - out.timing);
    } else if (out.shake > 0.32) {
      why("pphRMove", null, pphTimeMax - out.timing);
    } else if (out.motion > 0.5) {
      why("pphRRuns", { sp: t(sp.labelKey) }, pphTimeMax - out.timing);
    }

    out.score = pphInt(pphClamp(out.behaviour + out.composition + out.timing, 0, 100));
    var hard = level || state.level || null;
    if (hard) {
      out.behaviourShot = out.moment && out.behaviour >= (hard.behaviourMin || 22) && out.score >= (hard.scoreMin || 50);
    }
    /* The reason line names the biggest thing the player lost this frame. */
    var bestReason = { k: "pphREmpty", v: {}, w: -1 };
    for (var i = 0; i < out.reasons.length; i += 1) {
      if (out.reasons[i].w > bestReason.w) { bestReason = out.reasons[i]; }
    }
    out.reasonKey = bestReason.k;
    out.reasonVars = bestReason.v || {};
    return out;
  }

  function pphWalkSubject(subject, step) {
    var out = pphCopySubject(subject);
    var sp = pphSpecies[out.sp];
    var speed = sp ? sp.speed : 20;
    if (out.flushT > 0) {
      out.flushT = Math.max(0, out.flushT - step);
    }
    var ph = pphPhaseOf(out);
    var mul = out.flushT > 0 ? 2.6 : ph.phase.mul;
    var route = pphRouteOf(out.sp, out.route);
    if (!route) {
      out.speed = 0;
      return out;
    }
    out.s = (out.s + speed * mul * step + route.len * 4) % route.len;
    out.beat = (out.beat + step) % pphCycTotal(out.cyc);
    var at = pphAt(route, out.s);
    out.x = at.x;
    out.y = at.y;
    out.dist = pphDistAt(at.y);
    out.cover = pphCoverOf(at.x, at.y);
    out.speed = speed * mul;
    return out;
  }

  /* The whole scene for one tick: camera controls, behaviour clocks, routes and
   * the focus that will not stay where you left it. */
  function pphStep(state, input, dt) {
    if (!state || state.over) { return state; }
    var step = dt > 0 ? Math.min(pphMaxStep, dt) : 0;
    var next = pphCopyState(state);
    var panX = input && input.panX ? pphClamp(input.panX, -1, 1) : 0;
    var panY = input && input.panY ? pphClamp(input.panY, -1, 1) : 0;
    var fIn = input && input.focus ? pphClamp(input.focus, -1, 1) : 0;
    var moved = Math.abs(panX) + Math.abs(panY) + Math.abs(fIn);
    var mark;
    var walked = [];
    var i;
    if (input && input.fine) { next.fine = !state.fine; }
    if (input && input.autofocus) {
      mark = pphTarget(state, state.level);
      if (mark) {
        next.focus = mark.dist;
        next.shake = pphClamp(next.shake + 0.28, 0, 1);
      }
    }
    next.frame.x = pphClamp(next.frame.x + panX * pphPanRate * step, next.frame.w / 2, pphW - next.frame.w / 2);
    next.frame.y = pphClamp(next.frame.y + panY * pphPanRate * step, next.frame.h / 2, pphH - next.frame.h / 2);
    next.focus = pphClamp(next.focus + fIn * (next.fine ? pphFineRate : pphFocusRate) * step, 0, 1);
    /* Handling the camera is what costs the shutter: motion blurs, stillness pays. */
    next.shake = pphClamp(state.shake + (moved * 3 - state.shake * 6) * step, 0, 1);
    if (step <= 0) { return next; }
    for (i = 0; i < state.subjects.length; i += 1) { walked.push(pphWalkSubject(state.subjects[i], step)); }
    next.subjects = walked;
    next.time = state.time + step;
    if (next.drift > 0) {
      next.focus = pphClamp(next.focus + Math.cos((next.time + next.windPhase) * 0.9) * next.drift * step, 0, 1);
    }
    return next;
  }

  /* The scare: a new line for the rest of the outing, a shorter window from now
   * on, and a few seconds of running instead of posing. */
  function pphFlush(state, subject) {
    if (!subject) { return subject; }
    var sp = pphSpecies[subject.sp];
    var variants = sp && sp.routes ? sp.routes.length : 1;
    var route = (subject.route + 1) % (variants > 0 ? variants : 1);
    var to = pphRouteOf(subject.sp, route);
    var out = pphCopySubject(subject);
    var at;
    out.spooked = true;
    out.flushT = pphFlushTime;
    if (to) {
      out.route = route;
      out.s = pphNearestS(to, { x: subject.x, y: subject.y });
      at = pphAt(to, out.s);
      out.x = at.x;
      out.y = at.y;
      out.dist = pphDistAt(at.y);
      out.cover = pphCoverOf(at.x, at.y);
    }
    if (state && state.level) {
      out.cyc = pphCycleOf(subject.sp, state.level, true);
      out.total = pphCycTotal(out.cyc);
      out.beat = out.beat % out.total;
    }
    return out;
  }

  /* Spend one frame of the roll. Returns the next state plus what was taken. */
  function pphTake(state) {
    var out = { state: state, photo: null, spooked: [], shot: null };
    if (!state || state.over || state.shotsLeft <= 0) { return out; }
    var level = state.level || {};
    var subject = pphTarget(state, level);
    var shot = pphScore(state, subject, level);
    var album = pphCopyAlbum(state.album);
    var subjects = state.subjects.slice();
    var photo = {
      n: state.shots.length + 1, sp: subject ? subject.sp : "", words: shot.words,
      beh: shot.behaviour, comp: shot.composition, time: shot.timing, score: shot.score,
      moment: shot.moment, kept: false, reasonKey: shot.reasonKey, reasonVars: shot.reasonVars,
    };
    var prev;
    var near;
    var i;
    if (subject && shot.behaviourShot) {
      prev = album[subject.sp];
      if (!prev || shot.score > prev.score) {
        album[subject.sp] = { score: shot.score, n: photo.n, beh: shot.behaviour };
      }
      photo.kept = true;
    }
    /* The mis-timed shutter: everything close enough to hear it goes up and
     * relocates, so a wasted frame keeps costing frames. */
    if (subject && !shot.moment) {
      near = state.frame;
      for (i = 0; i < subjects.length; i += 1) {
        if (
          Math.abs(subjects[i].x - near.x) < near.w * 0.55 + 12 &&
          Math.abs(subjects[i].y - near.y) < near.h * 0.9
        ) {
          subjects[i] = pphFlush(state, subjects[i]);
          out.spooked.push(subjects[i]);
        }
      }
    }
    var sum = pphAlbumSum(album);
    var next = pphCopyState(state);
    next.shots = state.shots.concat([photo]);
    next.subjects = subjects;
    next.album = album;
    next.kept = sum.kept;
    next.albumScore = sum.score;
    next.shotsLeft = Math.max(0, state.shotsLeft - 1);
    if (next.kept >= (level.need || 1)) { next.over = "win"; } else if (next.shotsLeft <= 0) { next.over = "lose"; }
    out.state = next;
    out.photo = photo;
    out.shot = shot;
    return out;
  }

  function pphMetric(albumScore, shotsLeft) {
    return pphInt(albumScore) * 100 + pphInt(shotsLeft);
  }

  /* --- the scripted best-play line, replayed for the bands ---------------- */

  /* Which creature the best play is working: only species the album still lacks,
   * ranked by how fast the camera can be on it and how soon its window opens. */
  function pphPolicyTarget(state, level) {
    var subjects = state.subjects || [];
    var pool = [];
    var i;
    for (i = 0; i < subjects.length; i += 1) {
      if (!state.album || !state.album[subjects[i].sp]) {
        pool.push(subjects[i]);
      }
    }
    if (!pool.length) {
      for (i = 0; i < subjects.length; i += 1) {
        pool.push(subjects[i]);
      }
    }
    if (!pool.length) {
      return null;
    }
    var framed = pphTarget(state, level);
    if (framed) {
      var hold = pphToMoment(framed);
      for (i = 0; i < pool.length; i += 1) {
        if (pool[i].id === framed.id && (hold.open || hold.inT <= 4)) {
          return framed;
        }
      }
    }
    var best = pool[0];
    var bestRank = Infinity;
    for (i = 0; i < pool.length; i += 1) {
      var s = pool[i];
      var ahead = pphToMoment(s);
      var dx = s.x - state.frame.x;
      var dy = s.y - state.frame.y;
      var rank = Math.sqrt(dx * dx + dy * dy) / (pphPanRate > 0 ? pphPanRate : 1);
      rank += ahead.open ? 0 : Math.min(30, ahead.inT);
      rank += s.spooked ? 2.5 : 0;
      rank += (s.cover || 0) * 2;
      if (rank < bestRank) {
        bestRank = rank;
        best = s;
      }
    }
    return best;
  }

  /* An ideal photographer: steer by whoever is closest, fire only at the creature
   * the shutter would actually take, and only once the whole tripod agrees -
   * window open, subject framed, plane sharp, camera still. */
  function pphPolicy(state) {
    var input = { panX: 0, panY: 0, focus: 0, shoot: false, fine: false };
    if (!state || state.over) {
      return input;
    }
    var level = state.level || {};
    var framed = pphTarget(state, level);
    var need = !framed || !state.album || !state.album[framed.sp];
    var want = need ? framed : null;
    if (!want) {
      want = pphPolicyTarget(state, level) || pphNearest(state);
    }
    if (!want) {
      return input;
    }
    var ahead = pphToMoment(want);
    var dx = want.x - state.frame.x;
    var dy = want.y - state.frame.y;
    var err = state.focus - want.dist;
    var close = Math.abs(err) < 0.05;
    var steady = Math.abs(dx) < 13 && Math.abs(dy) < 13;
    if (!ahead.open || steady) {
      if (dx > 13) {
        input.panX = 1;
      } else if (dx < -13) {
        input.panX = -1;
      }
      if (dy > 13) {
        input.panY = 1;
      } else if (dy < -13) {
        input.panY = -1;
      }
    }
    if (state.fine !== close) {
      input.fine = true;
    }
    if (!close || !ahead.open) {
      if (err > 0.004) {
        input.focus = -1;
      } else if (err < -0.004) {
        input.focus = 1;
      }
    }
    var shot = pphScore(state, want, level);
    if (
      need &&
      framed &&
      framed.id === want.id &&
      ahead.open &&
      shot.moment &&
      shot.inside &&
      shot.score >= (level.scoreMin || 50) + 6 &&
      shot.focusFactor >= 0.9 &&
      state.shake <= 0.3
    ) {
      input.shoot = true;
      input.panX = 0;
      input.panY = 0;
      input.focus = 0;
    }
    return input;
  }

  var pphLineCache = {};

  function pphReplay(level) {
    var run = { win: false, kept: 0, album: 0, shotsLeft: 0, metric: 0, frames: 0, shots: [], spooked: 0, scripted: true };
    if (!level || !level.roster) {
      return run;
    }
    var state = pphMake(level, level.seed);
    var dt = 1 / 60;
    var ceiling = 60 * 200;
    while (state && !state.over && run.frames < ceiling) {
      var input = pphPolicy(state);
      state = pphStep(state, input, dt);
      if (input.shoot) {
        var res = pphTake(state);
        if (res.photo) {
          run.shots.push({
            n: res.photo.n, sp: res.photo.sp, score: res.photo.score,
            beh: res.photo.beh, comp: res.photo.comp, time: res.photo.time, kept: res.photo.kept,
          });
          run.spooked += res.spooked.length;
        }
        state = res.state;
      }
      run.frames += 1;
    }
    run.win = !!(state && state.over === "win");
    run.kept = state ? state.kept : 0;
    run.album = state ? state.albumScore : 0;
    run.shotsLeft = state ? state.shotsLeft : 0;
    run.metric = state ? pphMetric(state.albumScore, state.shotsLeft) : 0;
    run.framesUsed = state ? state.shots.length : 0;
    return run;
  }

  /* The measured line: a scripted best play run through the same stepper the
   * panel uses, so the star bands sit on real album scores. */
  function pphBestLine(level) {
    if (!level) {
      return null;
    }
    if (!pphLineCache[level.id]) {
      pphLineCache[level.id] = pphReplay(level);
    }
    return pphLineCache[level.id];
  }

  function pphFloorMetric(level) {
    var need = level && level.need > 0 ? level.need : 1;
    var min = level && level.scoreMin > 0 ? level.scoreMin : 50;
    return need * min * 100;
  }

  /* 3 stars is the measured line, 1 star is the bare legal album, 2 the middle. */
  function pphBands(level) {
    var floor = pphFloorMetric(level);
    var run = pphBestLine(level);
    var top = run && isFinite(run.metric) && run.metric > floor ? run.metric : floor + 100;
    return [top, Math.round((top + floor) / 2), floor];
  }

  /* Every pond has to prove its target is reachable inside its own budget. */
  function pphBeatable(level) {
    if (!level || !level.roster || !level.roster.length) {
      return false;
    }
    if (level.need > level.roster.length || level.need > level.budget) {
      return false;
    }
    var run = pphBestLine(level);
    return !!(run && run.win && run.frames > 0 && run.metric >= pphBands(level)[2]);
  }

  function pphRosterWords(level) {
    var words = [];
    if (level && level.roster) {
      for (var i = 0; i < level.roster.length; i += 1) {
        var sp = pphSpecies[level.roster[i].sp];
        if (sp) {
          words.push(t(sp.labelKey));
        }
      }
    }
    return words.join(" \u00b7 ");
  }

  /* --- panel -------------------------------------------------------------- */
  function initPocketPhotographerGame(panelEl) {
    if (!panelEl) {
      return;
    }

    var campaign = createCampaign({ key: "pocket-photographer-campaign", levels: pphLevels });
    var rounds = {};
    var level = pphLevels[Math.max(0, campaign.indexOf(campaign.nextLevelId()))];
    var state = null;
    var band = pphBands(level);
    var loopId = null;
    var lastNow = 0;
    var paused = true;
    var dragging = false;
    var ticks = 0;
    var lastLine = "";
    var lastLineAt = -1;

    function el(tag, cls, parent) {
      var node = document.createElement(tag);
      if (cls) {
        node.className = cls;
      }
      if (parent) {
        parent.appendChild(node);
      }
      return node;
    }

    function text(parent, cls, key) {
      var node = el("span", cls, parent);
      if (key) {
        node.setAttribute("data-i18n", key);
        node.textContent = t(key);
      }
      return node;
    }

    function makeButton(cls, key, parent, onClick) {
      var btn = el("button", cls, parent);
      btn.type = "button";
      var content = el("span", "button-content", btn);
      text(content, null, key);
      btn.addEventListener("click", function () {
        onClick();
      });
      return btn;
    }

    /* --- markup: built with createElement so the headless harness sees it --- */
    var hud = el("div", "game-hud pph-hud", panelEl);
    function makeStat(key, valueEl, wide) {
      var stat = el("div", wide ? "game-stat pph-wide" : "game-stat", hud);
      text(stat, null, key);
      stat.appendChild(valueEl);
      return stat;
    }
    var shotsEl = el("strong");
    var albumEl = el("strong");
    var subjectEl = el("strong");
    var focusEl = el("strong");
    var sceneEl = el("span", "pph-state");
    sceneEl.setAttribute("aria-live", "polite");
    [["pphShotsLabel", shotsEl], ["pphAlbumLabel", albumEl], ["pphSubjectLabel", subjectEl], ["pphFocusLabel", focusEl]]
      .forEach(function (pair) { makeStat(pair[0], pair[1]); });
    makeStat("pphSceneLabel", sceneEl, true);

    var canvas = el("canvas", "pph-canvas", panelEl);
    canvas.width = pphW;
    canvas.height = pphH;
    canvas.setAttribute("tabindex", "0");
    canvas.setAttribute("role", "application");
    canvas.setAttribute("aria-label", t("pphFieldLabel"));

    var result = el("p", "game-result", panelEl);
    result.setAttribute("role", "status");
    var sheet = el("span", "pph-sheet", result);

    var pondRow = el("div", "elements-row", panelEl);
    var pondLabel = el("label", "elements-label", pondRow);
    pondLabel.setAttribute("for", "pphPondSel");
    pondLabel.setAttribute("data-i18n", "pphPondSelectLabel");
    pondLabel.textContent = t("pphPondSelectLabel");
    var pondSel = el("select", "elements-select", pondRow);
    pondSel.id = "pphPondSel";

    var actions = el("div", "game-actions", panelEl);
    var shootBtn = makeButton("primary pph-shutter", "pphBtnShoot", actions, function () { shoot(); });
    makeButton("pph-btn-again", "btnNewRound", actions, function () { restartOuting(); });
    var bestEl = el("p", "game-best", actions);

    var hint = el("p", "game-hint", panelEl);
    hint.setAttribute("data-i18n", "pphHint");
    hint.textContent = t("pphHint");

    var ctx = canvas.getContext("2d");

    /* --- reads ------------------------------------------------------------ */
    function num(v) {
      return pphInt(v);
    }

    /* How far the closest edge of the viewfinder still is from a creature. */
    function offFrame(s) {
      if (!s) { return 0; }
      return num(Math.max(Math.abs(s.x - state.frame.x) - state.frame.w / 2, Math.abs(s.y - state.frame.y) - state.frame.h / 2));
    }

    function framingWord(shot, s) {
      if (!s) { return t("pphFNone"); }
      if (!shot.inside) { return t("pphFOut", { n: offFrame(s) }); }
      if (shot.headroom < 0) { return t("pphFHead"); }
      if (shot.cover > 0.4) { return t("pphFReed", { n: num(shot.cover * 100) }); }
      if (shot.off > 0.62) { return t("pphFEdge"); }
      return t("pphFIn");
    }

    function momentWord(shot, s) {
      if (s && (s.flushT || 0) > 0) { return t("pphMFlush"); }
      if (shot.moment) { return t("pphMNow", { n: shot.momentLeft }); }
      return t("pphMIn", { n: shot.toMoment });
    }

    /* The shutter would fire at pphTarget, so that is what every read is about;
     * while the frame is empty the nearest creature is what the player steers by. */
    function readShot() {
      var s = pphTarget(state, level);
      var shot = pphScore(state, s, level);
      var near = s || pphNearest(state);
      return {
        subject: s,
        shot: shot,
        near: near,
        nshot: near === s ? shot : pphScore(state, near, level),
      };
    }

    function speciesWord(s) {
      return s && pphSpecies[s.sp] ? t(pphSpecies[s.sp].labelKey) : t("pphNoSubject");
    }

    function renderHud(immediate) {
      if (!state) {
        return;
      }
      var read = readShot();
      shotsEl.textContent = t("pphShotsLeft", { n: state.shotsLeft, total: state.budget });
      albumEl.textContent = t("pphAlbumCount", {
        n: state.kept,
        need: level.need,
        v: state.albumScore,
      });
      subjectEl.textContent = read.subject
        ? t("pphSubjectRead", { sp: speciesWord(read.subject), b: t(read.shot.words) })
        : t("pphSubjectNone");
      focusEl.textContent = t("pphFocusRead", {
        f: num(state.focus * 100),
        c: read.subject ? num(read.shot.focusFactor * 100) : "--",
        m: state.fine ? t("pphFineOn") : t("pphFineOff"),
      });
      var parts;
      if (read.subject) {
        parts = [
          t("pphLineTarget", { sp: speciesWord(read.subject), b: t(read.shot.words) }),
          momentWord(read.shot, read.subject),
          t("pphLineFrame", { f: framingWord(read.shot, read.subject) }),
          t("pphLineFocus", { c: num(read.shot.focusFactor * 100) }),
          t("pphLineScore", {
            b: read.shot.behaviour,
            c: read.shot.composition,
            t: read.shot.timing,
            s: read.shot.score,
          }),
        ];
      } else {
        parts = [
          t("pphLineNothing"),
          read.near
            ? t("pphLineNearest", {
              sp: speciesWord(read.near),
              b: t(read.nshot.words),
              n: offFrame(read.near),
            })
            : t("pphFNone"),
          read.near ? momentWord(read.nshot, read.near) : t("pphMIn", { n: 0 }),
        ];
      }
      parts.push(t("pphLineShots", { n: state.shotsLeft }));
      var line = parts.join(" \u00b7 ");
      /* An action answers at once; the ticking clock waits its turn, so the
       * polite live region reports five updates a second instead of sixty. */
      if (line !== lastLine && (immediate || state.time - lastLineAt >= 0.2)) {
        lastLine = line;
        lastLineAt = state.time;
        sceneEl.textContent = line;
      }
    }

    function refreshPicker() {
      fillCampaignPicker(
        pondSel,
        campaign,
        function (def) {
          return t(def.labelKey);
        },
        t("elementsLocked"),
      );
      pondSel.value = level.id;
      var best = campaign.best(level.id);
      var stars = t("campaignStars", { n: campaign.totalStars(), max: campaign.maxStars() });
      bestEl.textContent =
        (best ? t("pphBestLine", { v: num(best / 100), n: num(best % 100) }) : t("pphNoBest")) +
        " \u00b7 " +
        stars;
    }

    function clearSheet() {
      while (sheet.firstChild) {
        sheet.removeChild(sheet.firstChild);
      }
    }

    function cell(cls, value, parent) {
      var node = el("span", cls, parent);
      node.textContent = value;
      return node;
    }

    /* A row is never allowed to print "undefined": an exposed frame with nothing
     * in it still shows the empty frame, its three numbers and its reason. */
    function addSheetRow(photo) {
      if (!photo) {
        addEmptyRow();
        return;
      }
      var who = photo.sp && pphSpecies[photo.sp] ? pphSpecies[photo.sp].labelKey : "";
      var row = el("span", photo.kept ? "pph-row is-kept" : "pph-row", sheet);
      var n = el("b", "pph-row-n", row);
      n.textContent = String(num(photo.n));
      cell("pph-row-who", who ? t(who) + " \u00b7 " + t(photo.words || "pphREmpty") : t("pphNoSubject"), row);
      cell("pph-row-nums", t("pphRowNums", { b: num(photo.beh), c: num(photo.comp), t: num(photo.time), s: num(photo.score) }), row);
      cell("pph-row-why", t(photo.reasonKey || "pphREmpty", photo.reasonVars || {}), row);
      cell(photo.kept ? "pph-row-flag is-filed" : "pph-row-flag", photo.kept ? t("pphFiled") : t("pphDropped"), row);
    }

    function addEmptyRow() {
      var row = el("span", "pph-row is-empty", sheet);
      text(row, "pph-row-why", "pphSheetEmpty");
    }

    function rebuildSheet() {
      clearSheet();
      if (!state || !state.shots.length) {
        addEmptyRow();
        return;
      }
      for (var i = 0; i < state.shots.length; i += 1) {
        addSheetRow(state.shots[i]);
      }
    }

    /* --- play ------------------------------------------------------------- */
    function loadLevel(def, round) {
      level = def;
      band = pphBands(level);
      state = pphMake(level, (level.seed + (round || 0) * 131) >>> 0);
      paused = false;
      lastLine = "";
      lastLineAt = -1;
      shootBtn.disabled = false;
      refreshPicker();
      rebuildSheet();
      renderHud(true);
      draw();
      var extra = " " + t("pphBandLine", {
        a: num(band[0] / 100),
        b: num(band[1] / 100),
        c: num(band[2] / 100),
      });
      if (level.assist) {
        extra += " " + t("pphAssistNote");
      }
      if (!pphBeatable(level)) {
        extra += " " + t("pphUnproven");
      }
      result.insertBefore(
        document.createTextNode(
          t("pphPrompt", {
            name: t(level.labelKey),
            n: level.budget,
            need: level.need,
            v: num(band[0] / 100),
            w: level.wind ? t("pphWindy") : t("pphCalm"),
            s: pphRosterWords(level),
          }) + extra,
        ),
        sheet,
      );
    }

    function clearResultText() {
      var kids = [];
      for (var i = 0; i < result.childNodes.length; i += 1) {
        kids.push(result.childNodes[i]);
      }
      for (i = 0; i < kids.length; i += 1) {
        if (kids[i] !== sheet) {
          result.removeChild(kids[i]);
        }
      }
    }

    function say(msg) {
      clearResultText();
      result.insertBefore(document.createTextNode(msg), sheet);
    }

    function restartOuting() {
      wake();
      var r = (rounds[level.id] || 0) + 1;
      rounds[level.id] = r;
      loadLevel(level, r);
    }

    function shoot() {
      if (!state) {
        return;
      }
      wake();
      if (state.over) {
        say(t("pphOutAlready", { n: state.shotsLeft }));
        return;
      }
      var res = pphTake(state);
      if (!res.photo) {
        say(t("pphNoFilm"));
        return;
      }
      state = res.state;
      if (state.shots.length === 1) {
        clearSheet();
      }
      addSheetRow(res.photo);
      renderHud(true);
      draw();
      var names = [];
      for (var i = 0; i < res.spooked.length; i += 1) {
        names.push(speciesWord(res.spooked[i]));
      }
      var msg = t("pphShotLine", {
        n: num(res.photo.n),
        sp: speciesWord({ sp: res.photo.sp }),
        b: num(res.photo.beh),
        c: num(res.photo.comp),
        t: num(res.photo.time),
        s: num(res.photo.score),
        r: t(res.photo.reasonKey || "pphREmpty", res.photo.reasonVars || {}),
      });
      if (names.length) {
        msg += " " + t("pphSpook", { sp: names.join(" / ") });
      }
      say(msg);
      if (state.over) {
        finish();
      } else if (state.shotsLeft <= 0) {
        shootBtn.disabled = true;
      }
    }

    function finish() {
      shootBtn.disabled = true;
      var won = state.over === "win";
      if (!won) {
        say(t("pphLose", { k: state.kept, need: level.need, v: state.albumScore }));
        return;
      }
      var metric = pphMetric(state.albumScore, state.shotsLeft);
      var starsWon = starsFor(metric, band, "high");
      var outcome = campaign.record(level.id, { stars: starsWon, best: metric, better: "high" });
      var msg = t("pphWin", {
        v: state.albumScore,
        k: state.kept,
        n: state.shotsLeft,
        s: starsWon,
      });
      if (outcome.isBest) {
        msg += " " + t("newBest");
      }
      if (outcome.unlockedNext) {
        msg += " " + t("pphNextPond");
      } else if (campaign.clearedCount() === pphLevels.length) {
        msg += " " + t("pphAllPonds");
      }
      say(msg);
      logAction(t("logPocketPhotographer", { v: state.albumScore, k: state.kept }));
      var rect = shootBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      refreshPicker();
    }

    function act(input) {
      if (!state) {
        return;
      }
      wake();
      if (state.over) {
        return;
      }
      state = pphStep(state, input, pphTapDt);
      renderHud(true);
      draw();
    }

    /* --- loop ------------------------------------------------------------- */
    function frame(now) {
      if (loopId === null) {
        return;
      }
      var stamp = typeof now === "number" ? now : nowOf();
      var dt = Math.min(0.032, (stamp - lastNow) / 1000 || 0.016);
      lastNow = stamp;
      if (panelEl.hidden || document.hidden || paused) {
        loopId = window.requestAnimationFrame(frame);
        return;
      }
      if (state && !state.over) {
        state = pphStep(state, {}, dt);
        ticks += 1;
        if (ticks % 5 === 0) {
          renderHud();
        }
      }
      draw();
      loopId = window.requestAnimationFrame(frame);
    }

    function nowOf() {
      return window.performance && window.performance.now ? window.performance.now() : Date.now();
    }

    function startLoop() {
      if (loopId !== null) {
        return;
      }
      lastNow = nowOf();
      loopId = window.requestAnimationFrame(frame);
    }

    function stopLoop() {
      if (loopId !== null) {
        window.cancelAnimationFrame(loopId);
        loopId = null;
      }
    }

    /* The clock starts when the player touches the camera, never at boot. */
    function wake() {
      paused = false;
      startLoop();
    }

    /* --- drawing ---------------------------------------------------------- */
    function pen(fill, stroke, width) {
      if (fill) { ctx.fillStyle = fill; }
      if (stroke) { ctx.strokeStyle = stroke; }
      if (width) { ctx.lineWidth = width; }
    }

    function mono(size, bold) {
      ctx.font = (bold ? "bold " : "") + size + "px 'JetBrains Mono', monospace";
    }

    function place(align, baseline) {
      ctx.textAlign = align;
      ctx.textBaseline = baseline || "alphabetic";
    }

    function strokePath(points) {
      ctx.beginPath();
      for (var i = 0; i < points.length; i += 1) {
        if (i === 0) { ctx.moveTo(points[i][0], points[i][1]); } else { ctx.lineTo(points[i][0], points[i][1]); }
      }
      ctx.stroke();
    }

    function drawPond() {
      var rippleAt = App.isMotionOff() || !state ? 0 : state.time;
      var i;
      var x;
      ctx.clearRect(0, 0, pphW, pphH);
      pen("#0a1524"); ctx.fillRect(0, 0, pphW, pphH);
      pen("rgba(18, 38, 56, 0.9)"); ctx.fillRect(0, 44, pphW, pphH - 44);
      pen(null, "rgba(148, 163, 184, 0.13)", 1);
      for (i = 0; i < 7; i += 1) {
        var yy = 66 + i * 32;
        ctx.beginPath();
        for (x = 8; x <= pphW - 8; x += 12) {
          var wob = Math.sin(x / 46 + i * 1.2 + rippleAt * 0.5) * 2.4;
          if (x === 8) { ctx.moveTo(x, yy + wob); } else { ctx.lineTo(x, yy + wob); }
        }
        ctx.stroke();
      }
      for (i = 0; i < pphReeds.length; i += 1) {
        var r = pphReeds[i];
        pen("rgba(24, 44, 36, 0.92)"); ctx.fillRect(r.x, r.y, r.w, r.h);
        pen(null, "rgba(132, 180, 140, 0.4)", 1);
        ctx.beginPath();
        for (x = r.x + 4; x < r.x + r.w; x += 7) { ctx.moveTo(x, r.y + r.h); ctx.lineTo(x + 2, r.y + 3); }
        ctx.stroke();
        if (r.w < 120) {
          pen("rgba(203, 213, 225, 0.6)"); mono(9); place("left", "top");
          ctx.fillText(t("pphTagReeds"), r.x + 3, r.y + r.h + 2);
        }
      }
    }

    /* The line a creature works, dashed and worded once it has been scared, so
     * the reroute is legible without reading a colour. */
    function drawRoute(s) {
      var route = pphRouteOf(s.sp, s.route);
      if (!route) { return; }
      var pts = [];
      var i;
      for (i = 0; i < route.pts.length; i += 1) { pts.push([route.pts[i].x, route.pts[i].y]); }
      ctx.setLineDash(s.spooked ? [5, 4] : [2, 6]);
      pen(null, s.spooked ? "rgba(255, 107, 53, 0.5)" : "rgba(148, 163, 184, 0.25)", 1);
      strokePath(pts);
      ctx.setLineDash([]);
      if (s.spooked) {
        pen("rgba(255, 107, 53, 0.85)"); mono(8, true); place("left", "top");
        ctx.fillText(t("pphTagNewLine"), route.pts[0].x + 4, route.pts[0].y + 3);
      }
    }

    function drawCreature(s, isTarget) {
      var sp = s ? pphSpecies[s.sp] : null;
      if (!sp) { return; }
      var head = sp.head || 10;
      var rad = sp.r || 8;
      var timed = pphToMoment(s);
      var flushing = (s.flushT || 0) > 0;
      var bWord = flushing ? t("pphBFlush") : t(pphPhaseOf(s).phase.k);
      var flag = flushing ? t("pphBFlush") : timed.open ? t("pphTagNow") : timed.inT <= 2.4 ? String(Math.ceil(timed.inT)) : "";
      pen(isTarget ? "#e2e8f0" : "rgba(203, 213, 225, 0.72)");
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, rad, rad * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(s.x + rad * 0.7, s.y - head + 2, Math.max(3, rad * 0.42), 0, Math.PI * 2);
      ctx.fill();
      /* letter, behaviour word, countdown digit: three readings, no hue alone. */
      mono(10, true); place("center", "middle"); pen("#0a1524");
      ctx.fillText(sp.letter, s.x, s.y);
      mono(9, true); pen(timed.open ? "#a3e635" : "#fbbf24");
      ctx.fillText(flag, s.x, s.y - head - 12);
      pen(isTarget ? "rgba(226, 232, 240, 0.9)" : "rgba(203, 213, 225, 0.6)");
      ctx.fillText(bWord, s.x, s.y + rad + 9);
      if (timed.open || timed.inT <= 2.4) {
        pen(null, timed.open ? "#a3e635" : "rgba(251, 191, 36, 0.85)", 2);
        ctx.beginPath();
        ctx.arc(s.x, s.y - head / 2, rad + 9, -Math.PI / 2, -Math.PI / 2 + (timed.open ? 1 : 1 - timed.inT / 2.4) * Math.PI * 2);
        ctx.stroke();
      }
    }

    /* The viewfinder, with the frame's own three numbers printed above it. */
    function drawView(read) {
      var f = state.frame;
      var x0 = f.x - f.w / 2;
      var y0 = f.y - f.h / 2;
      var xs = [f.w / 3, (f.w * 2) / 3];
      var ys = [f.h / 3, (f.h * 2) / 3];
      var i;
      pen(null, "rgba(0, 242, 255, 0.8)", 2);
      ctx.strokeRect(x0, y0, f.w, f.h);
      pen(null, "rgba(148, 163, 184, 0.3)", 1);
      ctx.beginPath();
      for (i = 0; i < 2; i += 1) {
        ctx.moveTo(x0 + xs[i], y0); ctx.lineTo(x0 + xs[i], y0 + f.h);
        ctx.moveTo(x0, y0 + ys[i]); ctx.lineTo(x0 + f.w, y0 + ys[i]);
      }
      ctx.stroke();
      mono(10, true); place("left", "bottom");
      pen("rgba(0, 242, 255, 0.9)");
      ctx.fillText(read.subject ? t(pphSpecies[read.subject.sp].labelKey) : t("pphNoSubject"), x0 + 2, y0 - 14);
      pen("rgba(226, 232, 240, 0.92)");
      ctx.fillText("B" + read.shot.behaviour + " C" + read.shot.composition + " T" + read.shot.timing + " = " + read.shot.score, x0 + 2, y0 - 3);
    }

    /* The focus ruler: the subject's plane as a bracket with a number in it, so
     * "crisp" is a distance you can read rather than a glow you hope for. */
    function drawFocusBar(read) {
      var y = pphH - 16;
      var span = pphFocusSpan * pphCrispAt;
      var plane;
      var at;
      function toPx(v) { return 10 + pphClamp(v, 0, 1) * (pphW - 20); }
      pen("rgba(8, 13, 20, 0.85)"); ctx.fillRect(0, pphH - 26, pphW, 26);
      pen(null, "rgba(148, 163, 184, 0.5)", 1);
      strokePath([[10, y], [pphW - 10, y]]);
      if (read.subject) {
        plane = read.subject.dist;
        pen(null, "rgba(163, 230, 53, 0.9)", 1);
        strokePath([[toPx(plane - span), y - 5], [toPx(plane - span), y + 5]]);
        strokePath([[toPx(plane + span), y - 5], [toPx(plane + span), y + 5]]);
        strokePath([[toPx(plane - span), y], [toPx(plane + span), y]]);
        pen("#a3e635"); mono(9); place("center", "top");
        ctx.fillText(t("pphTagPlane") + " " + num(plane * 100), toPx(plane), y + 6);
      }
      at = toPx(state.focus);
      pen("#00f2ff");
      ctx.beginPath();
      ctx.moveTo(at, y - 9); ctx.lineTo(at + 4, y - 2); ctx.lineTo(at - 4, y - 2);
      ctx.closePath();
      ctx.fill();
      mono(9, true); place("left", "middle");
      ctx.fillText(t("pphTagFocus") + " " + num(state.focus * 100) + " " + t("pphTagSharp") + " " + num(read.shot.focusFactor * 100), 10, y - 12);
      place("right");
      ctx.fillText((state.fine ? t("pphFineOn") : t("pphFineOff")) + "  " + state.shotsLeft + "/" + state.budget, pphW - 10, y - 12);
      if (level.wind) {
        place("center"); pen("#fbbf24");
        ctx.fillText(t("pphTagWind") + " \u203a\u203a\u203a", pphW / 2, y - 12);
      }
    }

    function drawAlbumStrip(read) {
      var bits = [t("pphTagAlbum") + " " + state.kept + "/" + num(level.need)];
      var roster = level.roster || [];
      for (var i = 0; i < roster.length; i += 1) {
        var key = roster[i].sp;
        if (!pphSpecies[key]) { continue; }
        bits.push(pphSpecies[key].letter + (state.album[key] ? " " + state.album[key].score : " --"));
      }
      mono(10, true); place("left", "top"); pen("rgba(226, 232, 240, 0.9)");
      ctx.fillText(bits.join("  "), 8, 6);
      if (read.shot.moment) {
        place("right"); pen("#a3e635");
        ctx.fillText(t("pphTagMoment"), pphW - 8, 6);
      }
    }

    function draw() {
      if (!state) { return; }
      var read = readShot();
      var i;
      drawPond();
      for (i = 0; i < state.subjects.length; i += 1) { drawRoute(state.subjects[i]); }
      for (i = 0; i < state.subjects.length; i += 1) {
        drawCreature(state.subjects[i], read.subject && state.subjects[i].id === read.subject.id);
      }
      drawView(read);
      drawAlbumStrip(read);
      drawFocusBar(read);
    }

    /* --- controls --------------------------------------------------------- */
    function pondFromEvent(event) {
      var rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        return null;
      }
      var px = (event.clientX - rect.left) * (pphW / rect.width);
      var py = (event.clientY - rect.top) * (pphH / rect.height);
      if (!isFinite(px) || !isFinite(py)) {
        return null;
      }
      return { x: px, y: py };
    }

    /* Dragging places the viewfinder: same rule as the arrow keys, one state
     * built from the last, and the clock starts because the camera was touched. */
    function placeFrame(px, py) {
      if (!state || state.over) {
        return;
      }
      wake();
      var next = pphCopyState(state);
      next.frame.x = pphClamp(px, next.frame.w / 2, pphW - next.frame.w / 2);
      next.frame.y = pphClamp(py, next.frame.h / 2, pphH - next.frame.h / 2);
      next.shake = pphClamp(next.shake + 0.16, 0, 1);
      state = next;
      renderHud(true);
      draw();
    }

    canvas.addEventListener("pointerdown", function (event) {
      event.preventDefault();
      var p = pondFromEvent(event);
      if (!p) {
        return;
      }
      dragging = true;
      placeFrame(p.x, p.y);
    });

    canvas.addEventListener("pointermove", function (event) {
      if (!dragging) {
        return;
      }
      var p = pondFromEvent(event);
      if (!p) {
        return;
      }
      placeFrame(p.x, p.y);
    });

    function releasePointer() {
      dragging = false;
    }

    canvas.addEventListener("pointerup", releasePointer);
    canvas.addEventListener("pointercancel", releasePointer);

    canvas.addEventListener("keydown", function (event) {
      var key = event.key;
      var tap = pphHas(pphKeys, key) ? pphKeys[key] : null;
      if (tap) {
        event.preventDefault();
        act(tap);
        return;
      }
      if (key === "Enter") {
        event.preventDefault();
        shoot();
      } else if (key === "r" || key === "R") {
        event.preventDefault();
        restartOuting();
      }
    });

    pondSel.addEventListener("change", function () {
      var index = campaign.indexOf(pondSel.value);
      if (index >= 0 && campaign.isUnlocked(pondSel.value)) {
        wake();
        loadLevel(pphLevels[index], rounds[pphLevels[index].id] || 0);
      }
    });

    /* The shell's pause: motion stops, the roll of film and the contact sheet
     * stay exactly where the player left them. */
    App.quietResetPocketPhotographer = function () {
      stopLoop();
      releasePointer();
      paused = true;
      if (state && !state.over) {
        say(t("pphPaused", { n: state.shotsLeft }));
      }
    };

    loadLevel(level, 0);
  }

  /* Bilingual copy travels with the game: addStrings only fills keys i18n.js
   * does not already own, so the shared dictionary stays authoritative. */
  App.addStrings({
    en: {
      "tabPocketPhotographer": "Pocket Photographer",
      "pphZ1": "Still Water",
      "pphZ2": "Two Rivals",
      "pphZ3": "Reedy Corner",
      "pphZ4": "Windy Reedbank",
      "pphZ5": "Dawn Chorus",
      "pphZ6": "The Whole Pond",
      "pphZ7": "Gusting Noontide",
      "pphZ8": "Two Warblers",
      "pphZ9": "Narrow Light",
      "pphZ10": "Last Roll",
      "pphSpCoot": "Coot",
      "pphSpWarbler": "Warbler",
      "pphSpHeron": "Heron",
      "pphSpOtter": "Otter",
      "pphBGraze": "grazing",
      "pphBWatch": "watching",
      "pphBPreen": "preening",
      "pphBWaddle": "waddling",
      "pphBDart": "darting",
      "pphBWary": "wary",
      "pphBSing": "singing",
      "pphBHop": "hopping",
      "pphBStand": "standing",
      "pphBLean": "leaning",
      "pphBStrike": "striking",
      "pphBSwallow": "guzzling",
      "pphBSwim": "swimming",
      "pphBRoll": "rolling",
      "pphBDive": "diving",
      "pphBFlush": "flushing",
      "pphShotsLabel": "Film",
      "pphAlbumLabel": "Album",
      "pphSubjectLabel": "In the frame",
      "pphFocusLabel": "Focus",
      "pphSceneLabel": "State line",
      "pphPondSelectLabel": "Choose an outing",
      "pphBtnShoot": "Take The Shot",
      "pphFieldLabel": "Pond: arrow keys pan the viewfinder, z and x turn the focus ring, Space toggles fine focus, U snaps onto the subject, Enter exposes a frame, R starts a new outing",
      "pphShotsLeft": "{n} of {total} left",
      "pphAlbumCount": "{n}/{need} species \u00b7 {v} pts",
      "pphSubjectRead": "{sp}: {b}",
      "pphSubjectNone": "nothing framed",
      "pphNoSubject": "empty frame",
      "pphFocusRead": "{f} / sharp {c} / {m}",
      "pphFineOn": "fine",
      "pphFineOff": "coarse",
      "pphLineTarget": "{sp}: {b}",
      "pphLineNothing": "nothing framed",
      "pphLineNearest": "nearest is {sp} {b}, {n} off the frame",
      "pphLineFrame": "frame {f}",
      "pphLineFocus": "sharp {c}",
      "pphLineScore": "behaviour {b} composition {c} timing {t} = {s}",
      "pphLineShots": "{n} frames left",
      "pphMNow": "moment open for {n}s",
      "pphMIn": "moment in {n}s",
      "pphMFlush": "it is running off",
      "pphFIn": "well placed",
      "pphFEdge": "hard on the edge",
      "pphFHead": "head cropped",
      "pphFSky": "sitting too low",
      "pphFOut": "out of frame by {n}",
      "pphFReed": "blocked {n} percent",
      "pphFNone": "no subject",
      "pphRowNums": "B{b} C{c} T{t} = {s}",
      "pphFiled": "in the album",
      "pphDropped": "not enough",
      "pphSheetEmpty": "Contact sheet: no frames exposed yet.",
      "pphRMoment": "the {sp} caught mid-{b}",
      "pphREarly": "fired {n}s before the moment",
      "pphRLate": "the moment had just gone",
      "pphRIdle": "only {b} to show",
      "pphRFlush": "it was up and running",
      "pphREmpty": "nothing was in the frame",
      "pphROut": "the frame missed the {sp} by {n}",
      "pphREdge": "the subject sits hard on the edge",
      "pphRHead": "the top edge crops the head",
      "pphRSky": "too much sky above the head",
      "pphRReed": "reeds cut {n} percent of it",
      "pphRSoft": "off the focus plane by {n}",
      "pphRMove": "the camera was still moving",
      "pphRRuns": "the {sp} was moving too fast",
      "pphTagReeds": "REEDS",
      "pphTagNewLine": "NEW LINE",
      "pphTagNow": "NOW",
      "pphTagPlane": "PLANE",
      "pphTagFocus": "FOCUS",
      "pphTagSharp": "SHARP",
      "pphTagWind": "WIND",
      "pphTagAlbum": "ALBUM",
      "pphTagMoment": "MOMENT OPEN",
      "pphWindy": "a windy day: the focus ring drifts twice as fast",
      "pphAssistNote": "This pond is forgiving: a subject held just off the viewfinder still counts.",
      "pphCalm": "flat calm",
      "pphPrompt": "{name}: {n} frames, {need} species each with a behaviour shot to file the album. Measured best play {v}. {w}. On this pond: {s}.",
      "pphBandLine": "Stars from the measured line at {a} / {b} / {c} points.",
      "pphShotLine": "Frame {n}: {sp} - behaviour {b}, composition {c}, timing {t} = {s}. {r}.",
      "pphSpook": "A mis-timed shutter put {sp} up: it works a new line for the rest of the outing.",
      "pphNoFilm": "The roll is spent - start a new outing.",
      "pphOutAlready": "This outing is over - {n} frames on the roll were never exposed. Start a new round.",
      "pphWin": "Album filed: {v} points from {k} species with {n} frames left - {s} stars.",
      "pphLose": "Film spent at {v} points: only {k}/{need} species has a behaviour shot.",
      "pphPaused": "Shutter down - the sheet is safe, {n} frames still in the camera.",
      "pphNextPond": "New outing unlocked.",
      "pphAllPonds": "Every pond on the map is photographed.",
      "pphBestLine": "Best album {v} pts with {n} frames left",
      "pphNoBest": "No album yet",
      "pphUnproven": "This pond has not proven its target is reachable.",
      "pphHint": "Read the countdown, then hold still: a moving camera costs timing, and a shutter that misses the moment sends the creature off on a new line.",
      "logPocketPhotographer": "Filed a {v} point album with {k} species",
    },
    zh: {
      "tabPocketPhotographer": "口袋摄影师",
      "pphZ1": "静水塘",
      "pphZ2": "两强相争",
      "pphZ3": "芦苇角",
      "pphZ4": "风起滩",
      "pphZ5": "黎明合唱",
      "pphZ6": "满塘争鸣",
      "pphZ7": "正午阵风",
      "pphZ8": "双莺争枝",
      "pphZ9": "一线天光",
      "pphZ10": "最后一卷",
      "pphSpCoot": "骨顶鸡",
      "pphSpWarbler": "苇莺",
      "pphSpHeron": "苍鹭",
      "pphSpOtter": "水獭",
      "pphBGraze": "觅食",
      "pphBWatch": "张望",
      "pphBPreen": "理羽",
      "pphBWaddle": "摇行",
      "pphBDart": "窜动",
      "pphBWary": "警觉",
      "pphBSing": "鸣唱",
      "pphBHop": "跳蹦",
      "pphBStand": "静立",
      "pphBLean": "俯身",
      "pphBStrike": "出击",
      "pphBSwallow": "吞咽",
      "pphBSwim": "游弋",
      "pphBRoll": "翻腾",
      "pphBDive": "潜入",
      "pphBFlush": "惊飞",
      "pphShotsLabel": "胶卷",
      "pphAlbumLabel": "相册",
      "pphSubjectLabel": "取景中",
      "pphFocusLabel": "对焦",
      "pphSceneLabel": "状态行",
      "pphPondSelectLabel": "选择一次外出",
      "pphBtnShoot": "按下快门",
      "pphFieldLabel": "水塘：方向键平移取景框，Z 与 X 转动对焦环，空格切换精细对焦，U 吸附到主体，回车曝光一张，R 重新开始一次外出",
      "pphShotsLeft": "剩 {n}/{total} 张",
      "pphAlbumCount": "{n}/{need} 种 \u00b7 {v} 分",
      "pphSubjectRead": "{sp}：{b}",
      "pphSubjectNone": "取景框里空空",
      "pphNoSubject": "空镜",
      "pphFocusRead": "{f} / 清晰 {c} / {m}",
      "pphFineOn": "精细",
      "pphFineOff": "粗略",
      "pphLineTarget": "{sp}：{b}",
      "pphLineNothing": "框里还没有主体",
      "pphLineNearest": "最近的是{sp}，正在{b}，离框边 {n}",
      "pphLineFrame": "构图 {f}",
      "pphLineFocus": "清晰 {c}",
      "pphLineScore": "行为 {b} 构图 {c} 时机 {t} = {s}",
      "pphLineShots": "还剩 {n} 张",
      "pphMNow": "精彩时刻还剩 {n} 秒",
      "pphMIn": "{n} 秒后进入精彩时刻",
      "pphMFlush": "它正夺路而逃",
      "pphFIn": "位置妥当",
      "pphFEdge": "紧贴边缘",
      "pphFHead": "头部被裁",
      "pphFSky": "天空留太多",
      "pphFOut": "尚未入框 {n}",
      "pphFReed": "被遮挡 {n}%",
      "pphFNone": "没有主体",
      "pphRowNums": "行{b} 构{c} 时{t} = {s}",
      "pphFiled": "已入册",
      "pphDropped": "不够格",
      "pphSheetEmpty": "样张表：还没有曝光任何一张。",
      "pphRMoment": "抓到了{sp}的{b}瞬间",
      "pphREarly": "比精彩时刻早了 {n} 秒",
      "pphRLate": "精彩时刻刚刚过去",
      "pphRIdle": "只拍到{b}",
      "pphRFlush": "它已经起身逃开",
      "pphREmpty": "取景框里什么都没有",
      "pphROut": "取景框差了 {n} 才到{sp}",
      "pphREdge": "主体死死压在边缘上",
      "pphRHead": "上边缘裁掉了头部",
      "pphRSky": "头顶留白过多",
      "pphRReed": "芦苇挡住了它 {n}%",
      "pphRSoft": "离焦平面差 {n}",
      "pphRMove": "按下快门时相机还在动",
      "pphRRuns": "{sp}动得太快，跟不上",
      "pphTagReeds": "芦苇",
      "pphTagNewLine": "新路线",
      "pphTagNow": "此刻",
      "pphTagPlane": "焦面",
      "pphTagFocus": "焦点",
      "pphTagSharp": "清晰",
      "pphTagWind": "风",
      "pphTagAlbum": "相册",
      "pphTagMoment": "时刻开启",
      "pphWindy": "起风天：对焦环漂移快上一倍",
      "pphAssistNote": "这个水塘更宽容：主体只差一点没进框也算数。",
      "pphCalm": "风平浪静",
      "pphPrompt": "{name}：{n} 张胶卷，要让 {need} 个物种各留下一张行为照才能成册。实测最佳走线 {v} 分。{w}。塘里有什么：{s}。",
      "pphBandLine": "由实测走线定出的星级门槛：{a} / {b} / {c} 分。",
      "pphShotLine": "第 {n} 张：{sp} - 行为 {b}、构图 {c}、时机 {t} = {s}。{r}。",
      "pphSpook": "错误的快门惊起了 {sp}：这次外出它从此换一条路线。",
      "pphNoFilm": "这卷拍完了——重新开始一次外出。",
      "pphOutAlready": "这次外出已经收摊——胶卷里还有 {n} 张没曝光。按“新一局”再来一次。",
      "pphWin": "相册成册：{k} 个物种共 {v} 分，还剩 {n} 张 - 获得 {s} 星。",
      "pphLose": "胶卷用尽，只有 {v} 分：仅 {k}/{need} 个物种有了行为照。",
      "pphPaused": "收起快门——样张表原样保留，相机里还剩 {n} 张。",
      "pphNextPond": "解锁下一次外出。",
      "pphAllPonds": "地图上的水塘都拍遍了。",
      "pphBestLine": "最佳相册 {v} 分，还剩 {n} 张",
      "pphNoBest": "暂无相册",
      "pphUnproven": "这个水塘还没证明目标能在胶卷内达成。",
      "pphHint": "读秒，然后稳住：相机在动就会扣时机分，而错过精彩时刻的快门会把生灵赶到新的路线上。",
      "logPocketPhotographer": "成册 {v} 分，收录 {k} 个物种",
    },
  });

  App.registerGame({
    name: "pocketPhotographer",
    tabKey: "tabPocketPhotographer",
    init: initPocketPhotographerGame,
    guide: {
      svg:
        '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="4" y="4" width="112" height="68" rx="5" fill="rgba(10,21,36,.94)" stroke="rgba(148,163,184,.45)"/>' +
        '<rect x="10" y="8" width="100" height="10" fill="rgba(24,44,36,.9)"/>' +
        '<path d="M14 60h92M18 66h84" stroke="rgba(148,163,184,.22)"/>' +
        '<rect x="34" y="24" width="52" height="34" fill="none" stroke="rgba(0,242,255,.85)" stroke-width="2"/>' +
        '<path d="M34 35h52M34 47h52M51 24v34M69 24v34" stroke="rgba(148,163,184,.25)"/>' +
        '<ellipse cx="58" cy="48" rx="8" ry="5" fill="#e2e8f0"/>' +
        '<circle cx="64" cy="38" r="3" fill="#e2e8f0"/>' +
        '<text x="56" y="51" font-size="7" fill="#0a1524">H</text>' +
        '<circle cx="58" cy="44" r="14" fill="none" stroke="#a3e635" stroke-width="2"/>' +
        '<text x="58" y="21" font-size="8" fill="#a3e635" text-anchor="middle">NOW</text>' +
        '<text x="98" y="30" font-size="8" fill="#b9c1cc" text-anchor="middle">B40</text>' +
        '<text x="98" y="39" font-size="8" fill="#b9c1cc" text-anchor="middle">C31</text>' +
        '<text x="98" y="48" font-size="8" fill="#b9c1cc" text-anchor="middle">T22</text>' +
        '<text x="20" y="70" font-size="8" fill="#fbbf24">2</text>' +
        '<path d="M86 62h26" stroke="rgba(148,163,184,.5)"/>' +
        '<path d="M92 59l4 3-4 3z" fill="#00f2ff"/></svg>',
      en: [
        "Goal: file the pond's album - the named number of species each with one behaviour shot - before the roll of film runs out.",
        "Action: arrows or a drag pan the viewfinder, Z and X turn the focus ring, Space toggles fine focus, U snaps the ring onto your subject, Enter exposes a frame.",
        "Rule: a frame scores three numbers, behaviour, composition and timing, and only the telegraphed moment pays behaviour in full - a countdown rings over each creature.",
        "Cost: a shutter that fires outside the moment spooks everything in the frame, and a spooked creature relocates onto a reedier line with a shorter window for the rest of the outing.",
        "Read it: the state line and the contact sheet print the same words and digits the canvas shows, so you can play it with the screen off.",
        "Scoring: the album is the sum of the best shot per species, with frames left over as the tie-break, and the star bands are measured from a scripted best play.",
      ],
      zh: [
        "目标：在胶卷拍完之前成册——按要求让若干个物种各留下一张行为照。",
        "操作：方向键或拖拽平移取景框，Z 与 X 转对焦环，空格切换精细对焦，U 把对焦环吸附到主体上，回车曝光一张。",
        "规则：一张照片有三个数字——行为、构图、时机；只有被预告的“精彩时刻”才付满行为分，每只生灵头上都有倒数圈。",
        "代价：错过时刻的快门会惊起框里所有生灵，受惊的那只此后改走更藏芦苇的路线，窗口也更短，整次外出都回不来。",
        "读法：状态行与样张表把画布上的字和数字原样写出来，不看画面也能拍。",
        "计分：相册分是每个物种最好一张之和，剩余张数作平手参照；星级门槛由一条编排好的最佳走线实测得出。",
      ],
    },
  });

  /* Exported for the other modules. */
  App.initPocketPhotographerGame = initPocketPhotographerGame;

  /* The pure sim is exported too: the verifier, the measured star bands and a
   * replay of any outing all run through these and nothing else. */
  App.photoStep = pphStep;
  App.photoScore = pphScore;
  App.photoFlush = pphFlush;
  App.photoTake = pphTake;
  App.photoMake = pphMake;
  App.photoTarget = pphTarget;
  App.photoNearest = pphNearest;
  App.photoPhase = pphPhaseOf;
  App.photoToMoment = pphToMoment;
  App.photoCover = pphCoverOf;
  App.photoMetric = pphMetric;
  App.photoPolicy = pphPolicy;
  App.photoPolicyTarget = pphPolicyTarget;
  App.photoBestLine = pphBestLine;
  App.photoBands = pphBands;
  App.photoBeatable = pphBeatable;
  App.photoLevels = pphLevels;
  App.photoSpecies = pphSpecies;
})(window.CapitalConvert = window.CapitalConvert || {});
