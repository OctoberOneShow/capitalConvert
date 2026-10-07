/* Gravity Badminton - the rotating-gravity rally game in the shared game drawer.
 * A rally is simulated in court-local space, where the floor is always v = 0 and
 * gravity always pulls along -v. The current gravity turns that local frame back
 * into the arena, so the court you see is redrawn rotated toward the next wall
 * after every point while the physics stay one pure, testable step.
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

  /* --- the court, in court-local units ---------------------------------
   * u runs along the floor from your baseline to the opponent's, v is the
   * height above it. The renderer and the pure exports share these numbers,
   * which is what makes a replayed point provable without pixels. */
  var gbmSize = 320, gbmLen = 250, gbmHigh = 198;
  var gbmNetU = 125, gbmNetH = 34, gbmNetW = 6, gbmSide = 115, gbmPad = 10;
  var gbmRacketV = 22, gbmReach = 24, gbmHitV = 58, gbmMinV = 3;
  var gbmYouMin = 12, gbmYouMax = 112, gbmFoeMin = 138, gbmFoeMax = 238;
  var gbmYouSpeed = 126, gbmYouReact = 0.22, gbmGravity = 430, gbmDrag = 1.05;
  var gbmShotMin = 120, gbmShotMax = 330, gbmMinAngle = -0.8, gbmMaxAngle = 1.42;
  /* A shuttle survives about five exchanges: past that it droops, falls short
   * and nets, so a long rally is decided by a shot and not by a shot clock. */
  var gbmMaxHits = 16, gbmDroop = 0.85, gbmSlowScale = 0.58, gbmAssistReach = 1.3;
  var gbmFlightCap = 6, gbmHold = 0.75, gbmToWin = 7;
  var gbmTickDt = 1 / 60, gbmProjectDt = 1 / 50, gbmPredEvery = 0.12, gbmMaxDt = 0.032;

  /* The four pulls, as arena directions: down, left, up, right. */
  var gbmG = [{ x: 0, y: 1 }, { x: -1, y: 0 }, { x: 0, y: -1 }, { x: 1, y: 0 }];
  var gbmDirKeys = ["gbmPullDown", "gbmPullLeft", "gbmPullUp", "gbmPullRight"];

  /* Ten opponents, all data, so a level can be replayed and measured:
   *   speed/reach/height  baseline slide, reach, and the height it can swing at
   *   lock                gravity indexes where it never miscues (the wall)
   *   offLock             its speed multiplier while the pull is sideways
   *   err                 chance of gifting the point with a shot that sails out
   *   freeze              seconds it stays committed to the aim it already read
   *   cap                 rallies allowed before the match is called
   *   line                the scripted routine that wins the match, rally by rally
   *     { u: stand here, target: land it here, track: hold the movement key } */
  var gbmLevels = [
    {
      id: "b1", labelKey: "gbmL1", style: "sitter", seed: 90210, cap: 30,
      speed: 56, reach: 18, height: 44, power: 0.5, err: 0.25, offLock: 1, freeze: 0,
      react: 0.3, spread: 0.2, lock: [], targets: [62], baseBands: [2, 4, 6],
      line: [{ u: 60, target: 142, track: true }, { u: 60, target: 236, track: true },
        { u: 44, target: 200, track: true }],
    },
    {
      id: "b2", labelKey: "gbmL2", style: "mover", seed: 31337, cap: 32,
      speed: 96, reach: 15, height: 50, power: 0.6, err: 0.2, offLock: 1, freeze: 0,
      react: 0.08, spread: 0.7, lock: [], targets: [30, 100], baseBands: [3, 5, 7],
      line: [{ u: 52, target: 138, track: true }, { u: 52, target: 240, track: true },
        { u: 88, target: 176, track: true }, { u: 36, target: 220, track: true }],
    },
    {
      id: "b3", labelKey: "gbmL3", style: "counter", seed: 42421, cap: 32,
      speed: 120, reach: 19, height: 54, power: 0.7, err: 0.16, offLock: 1, freeze: 0,
      react: 0.1, spread: 1, lock: [], targets: [26, 106], baseBands: [4, 6, 8],
      line: [{ u: 74, target: 148, track: true }, { u: 74, target: 230, track: true },
        { u: 44, target: 190, track: true }, { u: 96, target: 214, track: true }],
    },
    {
      id: "b4", labelKey: "gbmL4", style: "wall", seed: 77101, cap: 34,
      speed: 96, reach: 19, height: 54, power: 0.9, err: 0.32, offLock: 0.5, freeze: 0,
      react: 0.2, spread: 0.9, lock: [0, 2], targets: [46, 96, 24], baseBands: [4, 6, 8],
      line: [{ u: 64, target: 138, track: true }, { u: 64, target: 240, track: true },
        { u: 100, target: 168, track: true }, { u: 30, target: 224, track: true }],
    },
    {
      id: "b5", labelKey: "gbmL5", style: "reader", seed: 55501, cap: 36,
      speed: 126, reach: 23, height: 58, power: 0.95, err: 0.06, offLock: 1, freeze: 0.2,
      react: 0.08, spread: 1.1, lock: [], targets: [22, 110, 64], baseBands: [5, 7, 9],
      line: [{ u: 56, target: 240, track: true }, { u: 56, target: 134, track: true },
        { u: 84, target: 202, track: true }, { u: 40, target: 152, track: true },
        { u: 68, target: 226, track: true }, { u: 50, target: 144, track: true }],
    },
    {
      id: "b6", labelKey: "gbmL6", style: "sitter", seed: 13579, cap: 38,
      speed: 170, reach: 30, height: 66, power: 1.05, err: 0.02, offLock: 1, freeze: 0,
      react: 0.2, spread: 1.6, lock: [], targets: [22, 112, 60, 80], baseBands: [6, 8, 10],
      line: [{ u: 36, target: 170, track: true }, { u: 24, target: 134, track: true },
        { u: 74, target: 202, track: true }, { u: 24, target: 152, track: true }],
    },
    {
      id: "b7", labelKey: "gbmL7", style: "counter", seed: 24680, cap: 38,
      speed: 132, reach: 21, height: 56, power: 0.85, err: 0.08, offLock: 1, freeze: 0.1,
      react: 0.06, spread: 1.5, lock: [], targets: [26, 106], baseBands: [6, 8, 10],
      line: [{ u: 64, target: 202, track: true }, { u: 64, target: 134, track: true },
        { u: 64, target: 202, track: true }, { u: 64, target: 152, track: true },
        { u: 68, target: 226, track: true }, { u: 64, target: 202, track: true }],
    },
    {
      id: "b8", labelKey: "gbmL8", style: "mover", seed: 60317, cap: 40,
      speed: 150, reach: 16, height: 52, power: 0.75, err: 0.1, offLock: 1, freeze: 0,
      react: 0.05, spread: 1, lock: [], targets: [30, 100], baseBands: [6, 8, 10],
      line: [{ u: 74, target: 240, track: true }, { u: 44, target: 134, track: true },
        { u: 84, target: 202, track: true }, { u: 60, target: 152, track: true },
        { u: 24, target: 226, track: true }, { u: 36, target: 144, track: true }],
    },
    {
      id: "b9", labelKey: "gbmL9", style: "reader", seed: 55502, cap: 40,
      speed: 140, reach: 25, height: 60, power: 1, err: 0.04, offLock: 1, freeze: 0.25,
      react: 0.06, spread: 1.2, lock: [], targets: [22, 110, 64], baseBands: [6, 8, 10],
      line: [{ u: 74, target: 240, track: true }, { u: 44, target: 134, track: true },
        { u: 84, target: 164, track: true }, { u: 64, target: 152, track: true }],
    },
    {
      id: "b10", labelKey: "gbmL10", style: "wall", seed: 81233, cap: 42,
      speed: 130, reach: 21, height: 56, power: 0.95, err: 0.14, offLock: 0.62, freeze: 0,
      react: 0.12, spread: 1, lock: [0, 2], targets: [46, 96, 24], baseBands: [6, 8, 10],
      line: [{ u: 68, target: 240, track: true }, { u: 56, target: 134, track: true },
        { u: 84, target: 202, track: true }, { u: 24, target: 152, track: true }],
    },
  ];

  /* --- tiny pure helpers ------------------------------------------------ */
  function gbmClamp(value, lo, hi) {
    var n = Number(value);
    return !isFinite(n) ? lo : n < lo ? lo : n > hi ? hi : n;
  }
  function gbmNum(value, fallback) {
    var n = Number(value);
    return isFinite(n) ? n : fallback;
  }
  function gbmSign(value) { return value > 0 ? 1 : value < 0 ? -1 : 0; }
  function gbmAngle(value) { return gbmClamp(value, gbmMinAngle, gbmMaxAngle); }

  /* A Lehmer generator carried inside the state, so a replayed rally is always
   * the same rally. Never Math.random. */
  function gbmRand(state) {
    var seed = ((state.seed % 2147483647) * 48271) % 2147483647;
    state.seed = seed <= 0 ? seed + 2147483646 : seed;
    return state.seed / 2147483647;
  }

  /* --- the court frame -------------------------------------------------- */
  /* Which pull a request means: an index, or a direction snapped to the nearest
   * wall. A zero-length direction has no answer, so it returns -1 and no NaN. */
  function gbmIndex(gravity) {
    if (typeof gravity === "number") {
      return isFinite(gravity) ? ((Math.round(gravity) % 4) + 4) % 4 : 0;
    }
    if (!gravity || !isFinite(gravity.x) || !isFinite(gravity.y)) { return -1; }
    var len = Math.sqrt(gravity.x * gravity.x + gravity.y * gravity.y);
    if (!len) { return -1; }
    var best = 0, bestDot = -2;
    for (var i = 0; i < 4; i += 1) {
      var dot = (gravity.x / len) * gbmG[i].x + (gravity.y / len) * gbmG[i].y;
      if (dot > bestDot) { bestDot = dot; best = i; }
    }
    return best;
  }

  /* ev points away from the floor (against gravity), eu along it toward the
   * opponent: a rotation of the square, never a mirror. */
  function gbmBasis(index) {
    var g = gbmG[index < 0 ? 0 : index % 4];
    var ev = { x: -g.x, y: -g.y };
    return { g: g, ev: ev, eu: { x: -ev.y, y: ev.x } };
  }
  function gbmToArena(u, v, index) {
    var b = gbmBasis(index), cu = u - gbmLen / 2, cv = v - gbmHigh / 2;
    return { x: gbmSize / 2 + b.eu.x * cu + b.ev.x * cv, y: gbmSize / 2 + b.eu.y * cu + b.ev.y * cv };
  }
  function gbmToLocal(x, y, index) {
    var b = gbmBasis(index), dx = x - gbmSize / 2, dy = y - gbmSize / 2;
    return { u: dx * b.eu.x + dy * b.eu.y + gbmLen / 2, v: dx * b.ev.x + dy * b.ev.y + gbmHigh / 2 };
  }

  /* --- the projector ---------------------------------------------------- */
  function gbmShotVelocity(shot) {
    var power = gbmClamp(gbmNum(shot.power, 0.5), 0, 1);
    var speed = gbmNum(shot.speed, gbmShotMin + power * (gbmShotMax - gbmShotMin));
    if (!isFinite(speed) || speed <= 0) { speed = gbmShotMin; }
    if (isFinite(shot.vu) && isFinite(shot.vv)) {
      return { vu: Number(shot.vu), vv: Number(shot.vv) };
    }
    if (isFinite(shot.angle)) {
      var a = gbmAngle(shot.angle);
      return { vu: Math.cos(a) * speed, vv: Math.sin(a) * speed };
    }
    var du = isFinite(shot.dirU) ? shot.dirU : shot.dirX;
    var dv = isFinite(shot.dirV) ? shot.dirV : shot.dirY;
    if (!isFinite(du) || !isFinite(dv)) { return null; }
    var len = Math.sqrt(du * du + dv * dv);
    if (!len) { return null; }
    return { vu: (du / len) * speed, vv: (dv / len) * speed };
  }

  function gbmExit(out, code, u, v, index, clock, peak, ok) {
    var at = gbmToArena(u, v, index);
    out.code = code; out.u = u; out.v = v; out.ok = !!ok;
    out.x = at.x; out.y = at.y; out.seconds = clock; out.peak = peak;
    return out;
  }

  /* Where does this shot land, and does it count? No canvas, no clock.
   * shot = { u| x, v| y, angle + power | dirU + dirV | vu + vv, from } and
   * gravity is an index or a direction. Codes: in, net, own, deep, wide, roof,
   * stall, invalid. */
  function gbmLand(shot, gravity) {
    var out = { ok: false, code: "invalid", u: 0, v: 0, x: 0, y: 0, seconds: 0, peak: 0, clear: 999, gravity: 0 };
    var index = gbmIndex(gravity);
    if (index < 0 || !shot) { return out; }
    out.gravity = index;
    var u = gbmNum(shot.u, NaN), v = gbmNum(shot.v, NaN);
    if (!isFinite(u) || !isFinite(v)) {
      if (!isFinite(shot.x) || !isFinite(shot.y)) { return out; }
      var start = gbmToLocal(shot.x, shot.y, index);
      u = start.u; v = start.v;
    }
    var vel = gbmShotVelocity(shot);
    if (!vel) { return out; }
    var fromFar = shot.from === "far" || u > gbmNetU;
    var flip = fromFar ? -1 : 1;
    var given = isFinite(shot.vu) && isFinite(shot.vv);
    var vu = given ? Number(shot.vu) : Math.abs(vel.vu) * flip;
    var vv = given ? Number(shot.vv) : vel.vv;
    var dt = gbmProjectDt, damp = Math.max(0.2, 1 - gbmDrag * dt);
    var clock = 0, peak = v, prevU = u, prevV = v;
    for (var step = 0; step < 300; step += 1) {
      vv -= gbmGravity * dt;
      vu *= damp; vv *= damp;
      prevU = u; prevV = v;
      u += vu * dt; v += vv * dt;
      clock += dt;
      peak = Math.max(peak, v);
      if ((prevU - gbmNetU) * (u - gbmNetU) < 0) {
        var denom = u - prevU;
        var frac = Math.abs(denom) < 1e-9 ? 0 : (gbmNetU - prevU) / denom;
        var over = prevV + (v - prevV) * frac;
        if (over < gbmNetH) {
          return gbmExit(out, "net", gbmNetU, Math.max(over, 1), index, clock, peak, false);
        }
        out.clear = Math.min(out.clear, over - gbmNetH);
      }
      var rel = (u - gbmNetU) * flip;
      if (v <= 0 && vv < 0) {
        var code = rel < 0 ? "own" : rel > gbmSide ? "deep" : "in";
        return gbmExit(out, code, u, 0, index, clock, peak, code === "in");
      }
      if (v > gbmHigh) { return gbmExit(out, "roof", u, v, index, clock, peak, false); }
      if (u < -gbmPad || u > gbmLen + gbmPad) {
        return gbmExit(out, rel > gbmSide ? "deep" : "wide", u, v, index, clock, peak, false);
      }
      if (clock > gbmFlightCap) { return gbmExit(out, "stall", u, v, index, clock, peak, false); }
    }
    return gbmExit(out, "stall", u, v, index, clock, peak, false);
  }

  /* The aim that lands nearest a spot, found by scanning the projector and
   * memoised on the rounded contact, so a replay never pays for a scan twice.
   * Above the band it also tries downward angles: that is the smash, and the
   * short flight it buys is what outruns an opponent covering the baseline. */
  var gbmAimCache = {};
  function gbmAimFor(u, v, target, index, from) {
    var key = Math.round(u) + "/" + Math.round(v) + "/" + Math.round(target) + "/" + index + "/" + (from || "near");
    if (gbmAimCache[key]) { return { angle: gbmAimCache[key].angle, power: gbmAimCache[key].power }; }
    var angles = [0.26, 0.44, 0.62, 0.82, 1.02, 1.22];
    if (v > gbmNetH + 2) { angles = angles.concat([0.04, -0.18, -0.4, -0.62]); }
    var powers = [0.24, 0.42, 0.6, 0.78, 0.96];
    var best = null, near = null;
    for (var a = 0; a < angles.length; a += 1) {
      for (var p = 0; p < powers.length; p += 1) {
        var land = gbmLand({ u: u, v: v, angle: angles[a], power: powers[p], from: from || "near" }, index);
        if (land.code === "net" || land.code === "invalid") { continue; }
        var err = Math.abs(land.u - target);
        /* A shot that gets there sooner is worth a little accuracy: that is the
         * difference between a winner and a free return. */
        var score = err + land.seconds * 45 + (land.clear > 6 ? 0 : 30);
        if (land.ok && (!best || score < best.score)) {
          best = { score: score, err: err, angle: angles[a], power: powers[p] };
        }
        if (!best && (!near || err < near.err)) { near = { err: err, angle: angles[a], power: powers[p] }; }
      }
    }
    var found = best || near || { angle: 0.62, power: 0.55 };
    gbmAimCache[key] = { angle: found.angle, power: found.power };
    return { angle: found.angle, power: found.power };
  }

  /* --- state ------------------------------------------------------------ */
  function gbmNewState(level, options) {
    var def = level || gbmLevels[0];
    var opts = options || {};
    var open = gbmAimFor(56, gbmRacketV, 192, 0, "near");
    return {
      levelId: def.id, style: def.style, gravity: 0, rallies: 0, clock: 0, hold: 0,
      phase: "ready", seed: def.seed, cap: def.cap, outcome: null,
      score: { you: 0, foe: 0 }, you: { u: 56 },
      foe: {
        u: 196, want: 196, read: 196, commit: 0, telegraph: 0, speed: def.speed,
        reach: def.reach, height: def.height, power: def.power, err: def.err,
        offLock: def.offLock, freeze: def.freeze || 0, react: 0, reactBase: def.react || 0,
        spread: def.spread || 0.4, targets: def.targets, lock: def.lock,
      },
      aim: { angle: open.angle, power: open.power },
      shuttle: { u: 56, v: gbmRacketV, vu: 0, vv: 0, live: false, lastHit: "you", age: 0, hits: 0 },
      pred: { u: 196, ok: true, code: "in", t: 0 },
      options: { slow: !!opts.slow, assist: opts.assist !== false },
    };
  }

  /* A step never touches the state it was handed: every box is copied, while
   * the opponent's tuning and the last outcome travel by reference (read-only),
   * which is also how the panel notices a fresh point. */
  function gbmBox(box) {
    var out = {};
    for (var key in box) {
      if (Object.prototype.hasOwnProperty.call(box, key)) { out[key] = box[key]; }
    }
    return out;
  }
  function gbmClone(state) {
    var next = gbmBox(state);
    next.score = gbmBox(state.score);
    next.you = gbmBox(state.you);
    next.foe = gbmBox(state.foe);
    next.aim = gbmBox(state.aim);
    next.shuttle = gbmBox(state.shuttle);
    next.pred = gbmBox(state.pred);
    next.options = gbmBox(state.options);
    return next;
  }

  function gbmLocked(state) {
    var lock = state.foe.lock || [];
    for (var i = 0; i < lock.length; i += 1) {
      if (lock[i] === state.gravity) { return true; }
    }
    return false;
  }
  function gbmSideways(index) { return index === 1 || index === 3; }

  /* Re-read where the shot - or the aim held before a serve - is going, ten
   * times a second rather than every frame. */
  function gbmPredict(state, sec) {
    state.pred.t -= sec;
    if (state.pred.t > 0) { return; }
    state.pred.t = gbmPredEvery;
    var s = state.shuttle;
    var land = state.phase === "flight" && s.live
      ? gbmLand({ u: s.u, v: s.v, vu: s.vu, vv: s.vv, from: s.lastHit === "foe" ? "far" : "near" }, state.gravity)
      : gbmLand({ u: s.u, v: s.v, angle: state.aim.angle, power: state.aim.power, from: "near" }, state.gravity);
    state.pred.code = land.code;
    state.pred.ok = land.ok;
    state.pred.u = gbmClamp(land.u, -gbmLen, gbmLen * 2);
    if (state.style === "reader") {
      /* One look per refresh, with a small misread: that window is the whole
       * chance a player has to hit where the champion is not. */
      state.foe.read = gbmClamp(state.pred.u + (gbmRand(state) - 0.5) * 44, gbmFoeMin, gbmFoeMax);
    }
  }

  function gbmMoveYou(state, input, sec) {
    var dir = 0;
    if (input) {
      if (input.track && state.phase === "flight" && state.shuttle.lastHit === "foe") {
        /* A routine that holds the movement key still owes a reaction time,
         * otherwise nothing could ever hit past it. */
        if (state.shuttle.age < gbmYouReact) {
          dir = 0;
        } else {
          var gap = state.pred.u - state.you.u;
          dir = Math.abs(gap) < 4 ? 0 : gbmSign(gap);
        }
      } else if (input.move) {
        dir = gbmSign(input.move);
      }
    }
    state.you.u = gbmClamp(state.you.u + dir * gbmYouSpeed * sec, gbmYouMin, gbmYouMax);
  }

  function gbmMoveFoe(state, sec, flight) {
    var foe = state.foe;
    if (flight && foe.react > 0) {
      /* It has not decided yet: the shot it is reading is still on its way. */
      foe.react -= sec;
      foe.want = foe.u;
    } else if (foe.commit > 0) {
      /* Committed to the read it made before the shot: it has to run rather
       * than re-think, which is what a late change of aim punishes. */
      foe.commit -= sec;
    } else {
      foe.want = gbmFoeWant(state, flight);
    }
    var speed = foe.speed * (state.style === "wall" && !gbmLocked(state) ? foe.offLock : 1);
    var gap = foe.want - foe.u;
    foe.u = gbmClamp(foe.u + gbmSign(gap) * Math.min(Math.abs(gap), speed * sec), gbmFoeMin, gbmFoeMax);
    /* The arrow it draws points exactly where it is about to slide. */
    foe.telegraph = Math.abs(gap) < 5 ? 0 : gbmSign(gap);
  }

  /* Where the opponent means to be. Every style answers before the shot is
   * played, and that answer is the telegraph the player is meant to read. */
  function gbmFoeWant(state, flight) {
    var track = gbmClamp(state.pred.u, gbmFoeMin, gbmFoeMax);
    if (state.style === "sitter") { return 190; }
    if (state.style === "counter") { return state.you.u < 62 ? 228 : 156; }
    if (state.style === "mover") { return flight ? track : 190; }
    if (state.style === "wall") { return flight ? track : 198; }
    return gbmClamp(state.foe.read, gbmFoeMin, gbmFoeMax);
  }

  /* A contact is only legal on the hitter's own side of the band, and only once
   * the shuttle is falling: that is what lets a fast shot run past a defender
   * instead of being volleyed back the instant it crosses the net. */
  var gbmNetMargin = 10;
  function gbmCanHitYou(state) {
    var s = state.shuttle;
    if (!s.live || s.lastHit === "you" || state.phase !== "flight" || s.hits >= gbmMaxHits) { return false; }
    if (s.u > gbmNetU - gbmNetMargin || s.v > gbmHitV || s.v < gbmMinV || s.vv > 0) { return false; }
    var reach = gbmReach * (state.options.assist ? gbmAssistReach : 1);
    return Math.abs(s.u - state.you.u) <= reach;
  }

  /* The counter-puncher exploits the rotation: while the pull is sideways it
   * reaches further, so a shot that used to run past it is now inside its swing.
   * The wall is the other way round - the sideways pull is its bad court. */
  function gbmFoeReach(state) {
    var reach = state.foe.reach;
    if (gbmSideways(state.gravity)) {
      if (state.style === "counter") { reach += 6; }
      if (state.style === "wall") { reach -= 5; }
    }
    return Math.max(8, reach);
  }

  function gbmCanHitFoe(state) {
    var s = state.shuttle;
    if (!s.live || s.lastHit === "foe" || state.phase !== "flight" || s.hits >= gbmMaxHits) { return false; }
    if (s.u < gbmNetU + gbmNetMargin || s.v > state.foe.height || s.v < gbmMinV || s.vv > 0) { return false; }
    return Math.abs(s.u - state.foe.u) <= gbmFoeReach(state);
  }

  /* Aim assist keeps the direction you chose and hunts for the power that turns
   * it into a good shot: the shuttle lands, the aim stays yours. */
  function gbmAssistShot(state) {
    var angle = state.aim.angle, power = state.aim.power, s = state.shuttle;
    if (gbmLand({ u: s.u, v: s.v, angle: angle, power: power, from: "near" }, state.gravity).ok) {
      return { angle: angle, power: power };
    }
    var best = null;
    var powers = [0.2, 0.32, 0.44, 0.56, 0.68, 0.8, 0.92, 1];
    var bends = [0, -0.16, 0.16, -0.32, 0.32, -0.5, 0.5, -0.7, 0.7];
    for (var b = 0; b < bends.length; b += 1) {
      for (var p = 0; p < powers.length; p += 1) {
        var tryAngle = gbmAngle(angle + bends[b]);
        var land = gbmLand({ u: s.u, v: s.v, angle: tryAngle, power: powers[p], from: "near" }, state.gravity);
        if (!land.ok) { continue; }
        var cost = Math.abs(tryAngle - angle) * 3 + Math.abs(powers[p] - power) + (land.clear > 6 ? 0 : 30);
        if (!best || cost < best.cost) { best = { cost: cost, angle: tryAngle, power: powers[p] }; }
      }
    }
    return best || { angle: angle, power: power };
  }

  function gbmStrike(state, who) {
    var s = state.shuttle;
    s.live = true;
    s.age = 0;
    s.hits += 1;
    if (who === "you") {
      if (state.phase !== "flight") {
        /* A serve starts on the racket; a return is hit where the shuttle is,
         * which is what turns a high contact into a smash and a low one a lift. */
        s.u = state.you.u;
        s.v = gbmRacketV;
      }
      var angle = state.aim.angle, power = state.aim.power;
      if (state.options.assist) {
        var fixed = gbmAssistShot(state);
        angle = fixed.angle;
        power = fixed.power;
      }
      var speed = gbmShotMin + gbmClamp(power, 0, 1) * (gbmShotMax - gbmShotMin);
      s.vu = Math.cos(gbmAngle(angle)) * speed;
      s.vv = Math.sin(gbmAngle(angle)) * speed;
      s.lastHit = "you";
      state.phase = "flight";
      state.foe.commit = state.foe.freeze;
      state.foe.react = state.foe.reactBase;
      return;
    }
    var targets = state.foe.targets;
    var pick = targets[Math.floor(gbmRand(state) * targets.length) % targets.length];
    if (state.style === "counter") {
      pick = state.you.u < 62 ? 106 : 24;
    }
    /* Spread scales the aim about the middle of your half: a narrow opponent
     * drops it to you, a wide one pins you to the two extremes. */
    var middle = gbmNetU / 2;
    pick = gbmClamp(middle + (pick - middle) * (0.6 + state.foe.spread), 6, gbmNetU - 8);
    var found = gbmAimFor(s.u, s.v, pick, state.gravity, "far");
    var factor = 0.7 + state.foe.power;
    if (gbmSideways(state.gravity) && state.style === "counter") {
      factor += 0.16;
    }
    if (!gbmLocked(state) && gbmRand(state) < state.foe.err) {
      factor += 0.5;
    }
    var foeSpeed = gbmShotMin + gbmClamp(found.power * factor, 0.05, 1.15) * (gbmShotMax - gbmShotMin);
    s.vu = -Math.cos(gbmAngle(found.angle)) * foeSpeed;
    s.vv = Math.sin(gbmAngle(found.angle)) * foeSpeed;
    s.lastHit = "foe";
  }

  /* One resolved rally: the point, the reason, and the hold before the court
   * turns toward the next wall. */
  function gbmResolve(state, code) {
    var hitter = state.shuttle.lastHit === "foe" ? "foe" : "you";
    var winner = code === "in" ? hitter : hitter === "you" ? "foe" : "you";
    state.shuttle.live = false;
    state.shuttle.vu = 0;
    state.shuttle.vv = 0;
    state.shuttle.v = Math.max(state.shuttle.v, 0);
    state.phase = "over";
    state.hold = gbmHold;
    if (winner === "you") { state.score.you += 1; } else { state.score.foe += 1; }
    state.outcome = { point: winner, code: code, by: hitter };
  }

  function gbmStartRally(state) {
    if (state.score.you >= gbmToWin || state.score.foe >= gbmToWin || state.rallies >= state.cap) {
      state.phase = "done";
      return;
    }
    /* The twist: the pull swings to the next wall and the court turns with it. */
    state.gravity = (state.gravity + 1) % 4;
    state.rallies += 1;
    state.phase = "ready";
    state.foe.commit = 0;
    state.foe.react = 0;
    state.shuttle.u = state.you.u;
    state.shuttle.v = gbmRacketV;
    state.shuttle.vu = 0;
    state.shuttle.vv = 0;
    state.shuttle.live = false;
    state.shuttle.lastHit = "you";
    state.shuttle.age = 0;
    state.shuttle.hits = 0;
    gbmPredict(state, 1);
    gbmMoveFoe(state, 0, false);
  }

  function gbmFly(state, sec) {
    var s = state.shuttle;
    s.age += sec;
    s.vv -= gbmGravity * sec;
    var drag = gbmDrag + Math.max(0, s.hits - 5) * gbmDroop;
    var damp = Math.max(0.2, 1 - drag * sec);
    s.vu *= damp;
    s.vv *= damp;
    var prevU = s.u, prevV = s.v;
    s.u += s.vu * sec;
    s.v += s.vv * sec;
    var flip = s.lastHit === "foe" ? -1 : 1;
    var rel = (s.u - gbmNetU) * flip;
    if ((prevU - gbmNetU) * (s.u - gbmNetU) < 0) {
      var denom = s.u - prevU;
      var frac = Math.abs(denom) < 1e-9 ? 0 : (gbmNetU - prevU) / denom;
      var over = prevV + (s.v - prevV) * frac;
      if (over < gbmNetH) {
        s.u = gbmNetU - flip * 3;
        s.v = Math.max(over, 1);
        gbmResolve(state, "net");
        return;
      }
    }
    if (s.v <= 0 && s.vv <= 0) {
      s.v = 0;
      gbmResolve(state, rel < 0 ? "own" : rel > gbmSide ? "deep" : "in");
      return;
    }
    if (s.v > gbmHigh) { gbmResolve(state, "roof"); }
    else if (s.u < -gbmPad || s.u > gbmLen + gbmPad) { gbmResolve(state, rel > gbmSide ? "deep" : "wide"); }
    else if (s.age > gbmFlightCap || s.hits >= gbmMaxHits) { gbmResolve(state, "stall"); }
  }

  /* One deterministic tick of everything: shuttle, both players, gravity. */
  function gbmStep(state, input, dt) {
    if (!state) { return null; }
    var next = gbmClone(state);
    var sec = gbmClamp(dt, 0, gbmMaxDt) * (next.options.slow ? gbmSlowScale : 1);
    if (input) {
      if (isFinite(input.angle)) { next.aim.angle = gbmAngle(input.angle); }
      if (isFinite(input.power)) { next.aim.power = gbmClamp(input.power, 0, 1); }
    }
    if (next.phase === "done") { return next; }
    gbmMoveYou(next, input, sec);
    if (next.phase === "over") {
      gbmMoveFoe(next, sec, false);
      next.hold -= sec;
      if (next.hold <= 0) { gbmStartRally(next); }
      return next;
    }
    next.clock += sec;
    gbmPredict(next, sec);
    gbmMoveFoe(next, sec, next.phase === "flight");
    if (input && input.smash && (next.phase === "ready" || gbmCanHitYou(next))) {
      gbmStrike(next, "you");
    }
    if (next.phase === "flight") {
      /* Assist takes the return itself, but only once the shuttle is falling,
       * so the contact - and the shot it allows - is still worth setting up. */
      if (next.options.assist && gbmCanHitYou(next) && next.shuttle.vv <= 0 && next.shuttle.v < gbmHitV - 12) {
        gbmStrike(next, "you");
      }
      gbmFly(next, sec);
      if (next.phase === "flight" && gbmCanHitFoe(next)) { gbmStrike(next, "foe"); }
    }
    return next;
  }

  /* --- the replay runner -------------------------------------------------
   * A program is data: where to stand, the spot you are hitting to (or an
   * explicit angle and power), and whether to hold the movement key. */
  function gbmRally(state, program) {
    if (!state) { return null; }
    var line = program && program.length ? program : [{ u: 56, target: 192, track: true }];
    var run = gbmClone(state);
    var points = [];
    var seen = run.outcome;
    var guard = 0;
    while (run.phase !== "done" && guard < 40000) {
      guard += 1;
      if (run.phase === "over") {
        run = gbmStep(run, {}, gbmTickDt);
        continue;
      }
      var entry = line[run.rallies % line.length] || line[0];
      run.you.u = gbmClamp(gbmNum(entry.u, 56), gbmYouMin, gbmYouMax);
      run.shuttle.u = run.you.u;
      run.shuttle.v = gbmRacketV;
      var want = isFinite(entry.target)
        ? gbmAimFor(run.you.u, gbmRacketV, entry.target, run.gravity, "near")
        : { angle: gbmNum(entry.angle, 0.62), power: gbmNum(entry.power, 0.5) };
      run.aim.angle = gbmAngle(want.angle);
      run.aim.power = gbmClamp(want.power, 0, 1);
      run = gbmStep(run, { smash: true }, gbmTickDt);
      var rally = run.rallies;
      var steps = 0;
      while (run.phase !== "done" && run.rallies === rally && steps < 4000) {
        steps += 1;
        run = gbmStep(run, { track: !!entry.track, move: entry.move }, gbmTickDt);
        if (run.outcome && run.outcome !== seen) {
          seen = run.outcome;
          points.push(run.outcome);
        }
      }
    }
    if (run.outcome && run.outcome !== seen) { points.push(run.outcome); }
    return {
      state: run, points: points, done: run.phase === "done",
      won: run.score.you, conceded: run.score.foe, rallies: run.rallies,
    };
  }

  /* --- measured bands ----------------------------------------------------
   * The scripted line replayed through the same stepper the pixels use: the
   * points it concedes are the measurement, never a guess. */
  var gbmParCache = {};
  var gbmBandCache = {};
  function gbmPar(level) {
    var def = level || gbmLevels[0];
    if (gbmParCache[def.id] !== undefined) { return gbmParCache[def.id]; }
    var run = gbmRally(gbmNewState(def, { slow: false, assist: true }), def.line);
    gbmParCache[def.id] = run && run.won >= gbmToWin && run.conceded < gbmToWin ? run.conceded : null;
    return gbmParCache[def.id];
  }
  function gbmBands(level) {
    var def = level || gbmLevels[0];
    if (!gbmBandCache[def.id]) {
      var par = gbmPar(def);
      gbmBandCache[def.id] = par === null ? def.baseBands : [par, par + 2, par + 4];
    }
    return gbmBandCache[def.id];
  }
  function gbmSolvable(level) {
    var def = level || gbmLevels[0];
    if (!def.line || !def.line.length) { return false; }
    var run = gbmRally(gbmNewState(def, { slow: false, assist: true }), def.line);
    return !!run && run.won >= gbmToWin && run.conceded < gbmToWin && run.rallies <= def.cap;
  }

  /* --- the panel ---------------------------------------------------------- */
  function initGravityBadmintonGame(panelEl) {
    if (!panelEl) { return; }
    var campaign = createCampaign({ key: "gravity-badminton-campaign", levels: gbmLevels });
    var open = campaign.indexOf(campaign.nextLevelId());
    var level = gbmLevels[open < 0 ? 0 : open];
    var pinned = { slow: false, assist: true };
    var state = gbmNewState(level, pinned);
    var band = gbmBands(level);
    var trail = [];
    var rafId = null, lastFrame = 0, rafTicks = 0, seenTicks = 0;
    var matchLive = false, finished = false, aiming = false, pendingSmash = false;
    var shownOutcome = null;
    var keys = { left: false, right: false };

    var hud = el("div", "game-hud");
    var scoreEl = el("strong");
    var pullEl = el("strong");
    var powerEl = el("strong");
    var rallyEl = el("strong");
    [stat("gbmScoreLabel", scoreEl), stat("gbmPullLabel", pullEl),
      stat("gbmPowerLabel", powerEl), stat("gbmRallyLabel", rallyEl)].forEach(function (box) {
      hud.appendChild(box);
    });

    var canvas = el("canvas", "gbm-canvas");
    canvas.width = gbmSize;
    canvas.height = gbmSize;
    canvas.setAttribute("tabindex", "0");
    canvas.setAttribute("role", "application");
    canvas.setAttribute("aria-label", t("gbmFieldLabel"));

    /* The two accessibility options the design asks for, as real controls.
     * Both are written into the sim, so a test can pin either one. */
    var slowBtn = toggle("gbmBtnSlow");
    var assistBtn = toggle("gbmBtnAssist");
    var optionsRow = el("div", "gbm-options");
    optionsRow.appendChild(slowBtn);
    optionsRow.appendChild(assistBtn);

    var line = el("p", "gbm-line");
    var result = el("p", "game-result");
    result.setAttribute("role", "status");

    /* The opponent picker keeps the shared row / label / select shape the
     * shipped panels use, so the drawer sees one more campaign menu. */
    var foeRow = el("div", "elements-row");
    var foeLabel = labelled("label", "gbmFoeSelectLabel");
    var foeSel = el("select", "elements-select");
    foeSel.id = "gbmFoeSel";
    foeLabel.setAttribute("for", "gbmFoeSel");
    foeRow.appendChild(foeLabel);
    foeRow.appendChild(foeSel);

    var matchBtn = el("button", "primary");
    matchBtn.type = "button";
    var matchContent = el("span", "button-content");
    matchContent.appendChild(labelled("span", "btnNewRound"));
    matchBtn.appendChild(matchContent);
    var bestEl = el("p", "game-best");
    var actions = el("div", "game-actions");
    actions.appendChild(matchBtn);
    actions.appendChild(bestEl);

    var hint = labelled("p", "gbmHint");
    hint.className = "game-hint";

    [hud, canvas, optionsRow, line, result, foeRow, actions, hint].forEach(function (node) {
      panelEl.appendChild(node);
    });

    function el(tag, cls, text) {
      var node = document.createElement(tag);
      if (cls) { node.className = cls; }
      if (text) { node.textContent = text; }
      return node;
    }

    /* A node whose words travel with the shared i18n pass. */
    function labelled(tag, key) {
      var node = el(tag);
      node.setAttribute("data-i18n", key);
      node.textContent = t(key);
      return node;
    }

    function stat(key, valueEl) {
      var box = el("div", "game-stat");
      box.appendChild(labelled("span", key));
      box.appendChild(valueEl);
      return box;
    }

    function toggle(key) {
      var btn = el("button", "gbm-toggle");
      btn.type = "button";
      btn.setAttribute("aria-pressed", "false");
      btn.setAttribute("data-name", t(key));
      btn.textContent = t(key);
      btn.set = function (on) {
        btn.setAttribute("aria-pressed", on ? "true" : "false");
        btn.classList.toggle("is-on", !!on);
        btn.textContent = t("gbmToggleState", {
          name: btn.getAttribute("data-name"),
          state: t(on ? "gbmStateOn" : "gbmStateOff"),
        });
      };
      return btn;
    }

    var ctx = canvas.getContext("2d");

    function dirWord(index) {
      return t(gbmDirKeys[gbmClamp(index, 0, 3)]);
    }

    function refreshPicker() {
      fillCampaignPicker(foeSel, campaign, function (def) {
        return t(def.labelKey);
      }, t("elementsLocked"));
      foeSel.value = level.id;
      bestEl.textContent = t("campaignStars", { n: campaign.totalStars(), max: campaign.maxStars() });
      if (campaign.isCleared(level.id)) {
        bestEl.textContent += " \u00b7 " + t("gbmBestLine", { n: campaign.best(level.id) });
      }
    }

    function renderHud() {
      scoreEl.textContent = state.score.you + " : " + state.score.foe;
      pullEl.textContent = dirWord(state.gravity);
      powerEl.textContent = Math.round(state.aim.power * 100) + "%";
      rallyEl.textContent = state.rallies + 1 + "/" + state.cap;
    }

    /* The score is printed as digits and the pull as a word beside an arrow, so
     * neither reading depends on colour alone. */
    var reasonKeys = {
      in: ["gbmWonIn", "gbmLoseIn"], net: ["gbmWonNet", "gbmLoseNet"],
      own: ["gbmWonOwn", "gbmLoseOwn"], deep: ["gbmWonOut", "gbmLoseOut"],
      wide: ["gbmWonOut", "gbmLoseOut"], roof: ["gbmWonOut", "gbmLoseOut"],
      stall: ["gbmWonStall", "gbmLoseStall"],
    };

    function announce() {
      var outcome = state.outcome;
      if (!outcome || outcome === shownOutcome) { return; }
      shownOutcome = outcome;
      var pair = reasonKeys[outcome.code] || reasonKeys.stall;
      var text = t(outcome.point === "you" ? pair[0] : pair[1]);
      text += " " + t("gbmScoreNow", { a: state.score.you, b: state.score.foe });
      if (state.phase !== "done") {
        text += " " + t("gbmRotation", { dir: dirWord((state.gravity + 1) % 4) });
      }
      result.textContent = text;
      result.classList.toggle("gbm-lost", outcome.point !== "you");
      line.classList.toggle("is-flash", !App.isMotionOff());
    }

    function intentLine() {
      var foe = state.foe;
      var key = foe.telegraph < 0 ? "gbmFoeToNet" : foe.telegraph > 0 ? "gbmFoeToBack" : "gbmFoeHold";
      return t(key, { name: t(level.labelKey) });
    }

    function loadLevel(def) {
      stopLoop();
      level = def;
      band = gbmBands(level);
      state = gbmNewState(level, pinned);
      trail = [];
      finished = false;
      shownOutcome = null;
      matchLive = false;
      aiming = false;
      pendingSmash = false;
      keys = { left: false, right: false };
      slowBtn.set(state.options.slow);
      assistBtn.set(state.options.assist);
      refreshPicker();
      renderHud();
      line.textContent = intentLine();
      result.classList.remove("gbm-lost");
      result.textContent = t("gbmPrompt", { name: t(level.labelKey), n: gbmToWin, b: band[0] });
      draw();
    }

    /* --- the match -------------------------------------------------------- */
    function currentInput() {
      var input = { move: (keys.right ? 1 : 0) + (keys.left ? -1 : 0), smash: pendingSmash };
      pendingSmash = false;
      return input;
    }

    function simulate(dt) {
      if (!matchLive || state.phase === "done") { return; }
      state = gbmStep(state, currentInput(), dt);
      if (state.shuttle.live) {
        trail.push({ u: state.shuttle.u, v: state.shuttle.v });
        if (trail.length > 26) { trail.shift(); }
      }
      announce();
      line.textContent = intentLine();
      renderHud();
      if (state.phase === "done") { finishMatch(); }
    }

    function finishMatch() {
      if (finished) { return; }
      finished = true;
      matchLive = false;
      stopLoop();
      var won = state.score.you >= gbmToWin;
      var against = state.score.foe;
      if (!won) {
        result.textContent = against >= gbmToWin
          ? t("gbmYouLose", { a: state.score.you, b: against, name: t(level.labelKey) })
          : t("gbmCapHit", { a: state.score.you, b: against, n: state.cap });
        draw();
        return;
      }
      var starsWon = starsFor(against, band, "low");
      var outcome = campaign.record(level.id, { stars: starsWon, best: against, better: "low" });
      var message = t("gbmYouWin", { a: state.score.you, b: against, s: starsWon });
      if (outcome.isBest) { message += " " + t("newBest"); }
      logAction(t("logGravityBadminton", { a: state.score.you, b: against, name: t(level.labelKey) }));
      var rect = matchBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      if (outcome.unlockedNext) {
        message += " " + t("gbmNextFoe");
      } else if (campaign.clearedCount() === gbmLevels.length) {
        message += " " + t("gbmAllBeat");
      }
      var next = campaign.indexOf(outcome.unlockedNext || level.id);
      loadLevel(gbmLevels[Math.max(0, next)]);
      result.textContent = message;
    }

    /* --- drawing ---------------------------------------------------------- */
    function pt(u, v) { return gbmToArena(u, v, state.gravity); }

    function quad(list, fill, stroke, width) {
      ctx.beginPath();
      for (var i = 0; i < list.length; i += 1) {
        var p = pt(list[i][0], list[i][1]);
        if (i) { ctx.lineTo(p.x, p.y); } else { ctx.moveTo(p.x, p.y); }
      }
      ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width || 1; ctx.stroke(); }
    }

    function segment(u0, v0, u1, v1, color, width, dash) {
      var a = pt(u0, v0), b = pt(u1, v1);
      if (dash) { ctx.setLineDash(dash); }
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.stroke();
      if (dash) { ctx.setLineDash([]); }
    }

    /* An arrow drawn along the court's own axes: your aim and the opponent's
     * telegraph are shapes, never a colour alone. */
    function arrow(u, v, du, dv, color, width) {
      var len = Math.sqrt(du * du + dv * dv);
      if (!len) { return; }
      var ux = du / len, vx = dv / len, wing = 6;
      var tail = pt(u, v), tip = pt(u + ux * 20, v + vx * 20), back = pt(u + ux * 12, v + vx * 12);
      ctx.beginPath();
      ctx.moveTo(tail.x, tail.y);
      ctx.lineTo(tip.x, tip.y);
      ctx.lineTo(back.x - vx * wing, back.y + ux * wing);
      ctx.moveTo(tip.x, tip.y);
      ctx.lineTo(back.x + vx * wing, back.y - ux * wing);
      ctx.strokeStyle = color;
      ctx.lineWidth = width || 2;
      ctx.stroke();
    }

    function draw() {
      var time = Date.now();
      ctx.clearRect(0, 0, gbmSize, gbmSize);
      if (App.world) { App.world.backdrop(ctx, gbmSize, gbmSize, "space"); }
      quad([[0, 0], [gbmNetU, 0], [gbmNetU, gbmHigh], [0, gbmHigh]], "rgba(34, 211, 238, 0.1)", null, 0);
      quad([[gbmNetU, 0], [gbmLen, 0], [gbmLen, gbmHigh], [gbmNetU, gbmHigh]], "rgba(255, 107, 53, 0.1)", null, 0);
      quad([[0, 0], [gbmLen, 0], [gbmLen, gbmHigh], [0, gbmHigh]], null, "rgba(148, 163, 184, 0.4)", 1.5);
      /* The floor is the wall gravity pulls everything into: drawn heaviest. */
      segment(0, 0, gbmLen, 0, "rgba(226, 232, 240, 0.75)", 3);
      segment(0, 0, 0, gbmHigh, "rgba(148, 163, 184, 0.5)", 1.5);
      segment(gbmLen, 0, gbmLen, gbmHigh, "rgba(148, 163, 184, 0.5)", 1.5);
      segment(gbmLen - gbmPad, 0, gbmLen - gbmPad, 112, "rgba(163, 230, 53, 0.4)", 1, [4, 4]);
      segment(gbmPad, 0, gbmPad, 112, "rgba(251, 113, 133, 0.4)", 1, [4, 4]);
      quad([[gbmNetU - gbmNetW / 2, 0], [gbmNetU + gbmNetW / 2, 0],
        [gbmNetU + gbmNetW / 2, gbmNetH], [gbmNetU - gbmNetW / 2, gbmNetH]],
      "rgba(226, 232, 240, 0.85)", "rgba(2, 6, 23, 0.6)", 1);

      /* Where this shot lands, printed as a cross on the floor. */
      if (state.options.assist && state.phase !== "done") {
        var tone = state.pred.ok ? "#a3e635" : "#fb7185";
        var mark = pt(gbmClamp(state.pred.u, -20, gbmLen + 20), 0);
        dot(mark.x, mark.y, 8 + (App.isMotionOff() ? 0 : Math.sin(time / 260) * 1.6), null, tone, 1.5);
        segment(state.pred.u - 5, 0, state.pred.u + 5, 0, tone, 2);
        segment(state.pred.u, -5, state.pred.u, 5, tone, 2);
      }

      if (state.phase === "ready" || state.phase === "over") {
        var reach = 30 + state.aim.power * 74;
        segment(state.you.u, gbmRacketV, state.you.u + Math.cos(state.aim.angle) * reach,
          gbmRacketV + Math.sin(state.aim.angle) * reach, "rgba(0, 242, 255, 0.8)", 2, [5, 4]);
        arrow(state.you.u, gbmRacketV, Math.cos(state.aim.angle), Math.sin(state.aim.angle), "#00f2ff", 2);
      }

      for (var i = 0; i < trail.length; i += 1) {
        ctx.globalAlpha = (i / (trail.length || 1)) * 0.5;
        var drop = pt(trail[i].u, trail[i].v);
        dot(drop.x, drop.y, 2.4, "#22d3ee", null, 0);
      }
      ctx.globalAlpha = 1;
      var ball = pt(state.shuttle.u, state.shuttle.v);
      ctx.shadowColor = "#fbbf24";
      ctx.shadowBlur = state.shuttle.live ? 12 : 4;
      dot(ball.x, ball.y, 5, "#fde68a", "rgba(2, 6, 23, 0.55)", 1);
      ctx.shadowBlur = 0;

      /* You: a circle with a racket. It: a diamond. Shape as well as colour. */
      var youP = pt(state.you.u, 12);
      dot(youP.x, youP.y, 9, "#22d3ee", null, 0);
      segment(state.you.u, 4, state.you.u, gbmRacketV + 6, "rgba(0, 242, 255, 0.85)", 2);
      if (gbmCanHitYou(state)) {
        var ring = pt(state.you.u, state.shuttle.v);
        dot(ring.x, ring.y, 13, null, "#a3e635", 2);
      }
      var foeP = pt(state.foe.u, 12);
      diamond(foeP.x, foeP.y, 9, 10, "#ff6b35");
      if (state.foe.telegraph !== 0) {
        arrow(state.foe.u, 32, state.foe.telegraph, 0, "#fb7185", 2.5);
      }

      /* Upright text and the pull arrow, drawn in arena space. */
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.font = "bold 13px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#e2e8f0";
      ctx.fillText(state.score.you + " - " + state.score.foe, 10, 18);
      ctx.font = "10px 'JetBrains Mono', monospace";
      ctx.fillStyle = "rgba(148, 163, 184, 0.9)";
      ctx.fillText(t("gbmPullWord", { dir: dirWord(state.gravity) }), 10, 31);
      pullBadge(gbmSize - 26, 24, gbmG[state.gravity] || gbmG[0]);
      if (state.phase === "done") {
        ctx.fillStyle = "rgba(2, 6, 23, 0.45)";
        ctx.fillRect(0, 0, gbmSize, gbmSize);
      }
    }

    function dot(x, y, r, fill, stroke, width) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
    }

    function diamond(x, y, half, tall, fill) {
      ctx.beginPath();
      ctx.moveTo(x, y - tall);
      ctx.lineTo(x + half, y);
      ctx.lineTo(x, y + tall);
      ctx.lineTo(x - half, y);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
    }

    /* The current gravity, as a glyph in the corner: an arrow in a ring,
     * pointing where the floor is, with the word printed next to the digits. */
    function pullBadge(x, y, g) {
      dot(x - g.x * 9, y - g.y * 9, 13, null, "rgba(148, 163, 184, 0.5)", 1.5);
      ctx.beginPath();
      ctx.moveTo(x - g.x * 12, y - g.y * 12);
      ctx.lineTo(x + g.x * 14, y + g.y * 14);
      ctx.lineTo(x + g.x * 7 - g.y * 5, y + g.y * 7 + g.x * 5);
      ctx.moveTo(x + g.x * 14, y + g.y * 14);
      ctx.lineTo(x + g.x * 7 + g.y * 5, y + g.y * 7 - g.x * 5);
      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    /* --- the loop --------------------------------------------------------- */
    function frame(now) {
      if (rafId === null) { return; }
      rafId = null;
      var dt = Math.min(gbmMaxDt, (now - lastFrame) / 1000 || gbmTickDt);
      lastFrame = now;
      /* A hidden panel keeps its loop slot but does no work, so a rally never
       * ticks on behind another game's tab. */
      if (!panelEl || panelEl.hidden || document.hidden) {
        if (matchLive) { rafId = window.requestAnimationFrame(frame); }
        return;
      }
      rafTicks += 1;
      simulate(dt);
      draw();
      if (matchLive) { rafId = window.requestAnimationFrame(frame); }
    }

    function startLoop() {
      if (rafId !== null) { return; }
      lastFrame = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
      rafId = window.requestAnimationFrame(frame);
    }

    function stopLoop() {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
    }

    /* One input event advances a tick whenever no frame is painting, so a
     * headless run can play a whole match on the keyboard alone. */
    function pump() {
      if (rafTicks !== seenTicks) {
        seenTicks = rafTicks;
        return;
      }
      simulate(gbmTickDt);
      draw();
    }

    function smash() {
      if (state.phase === "done") { return; }
      /* The clock starts here: nothing runs before the first serve. */
      matchLive = true;
      pendingSmash = true;
      startLoop();
      simulate(gbmTickDt);
      draw();
    }

    /* --- input ------------------------------------------------------------ */
    var slideKeys = {
      ArrowLeft: "left", a: "left", A: "left",
      ArrowRight: "right", d: "right", D: "right",
    };

    function onKey(event, down) {
      var key = event.key;
      if (slideKeys[key]) {
        keys[slideKeys[key]] = down;
        event.preventDefault();
        if (down) { pump(); }
        return;
      }
      if (!down) { return; }
      if (key === "ArrowUp" || key === "w" || key === "W") {
        state.aim.angle = gbmAngle(state.aim.angle + 0.07);
      } else if (key === "ArrowDown" || key === "s" || key === "S") {
        state.aim.angle = gbmAngle(state.aim.angle - 0.07);
      } else if (key === "e" || key === "E") {
        state.aim.power = gbmClamp(state.aim.power + 0.05, 0, 1);
      } else if (key === "q" || key === "Q") {
        state.aim.power = gbmClamp(state.aim.power - 0.05, 0, 1);
      } else if (key === " " || key === "Enter") {
        event.preventDefault();
        smash();
        return;
      } else {
        return;
      }
      event.preventDefault();
      gbmPredict(state, 1);
      renderHud();
      draw();
    }

    canvas.addEventListener("keydown", function (event) { onKey(event, true); });
    canvas.addEventListener("keyup", function (event) { onKey(event, false); });

    function aimFromEvent(event) {
      var rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) { return; }
      var px = (event.clientX - rect.left) * (canvas.width / rect.width);
      var py = (event.clientY - rect.top) * (canvas.height / rect.height);
      var local = gbmToLocal(px, py, state.gravity);
      var du = local.u - state.you.u;
      var dv = local.v - gbmRacketV;
      var len = Math.sqrt(du * du + dv * dv);
      if (!len) { return; }
      state.aim.angle = gbmAngle(Math.atan2(dv, du));
      state.aim.power = gbmClamp(len / 150, 0.12, 1);
      gbmPredict(state, 1);
    }

    canvas.addEventListener("pointerdown", function (event) {
      if (state.phase === "done") { return; }
      event.preventDefault();
      aiming = true;
      aimFromEvent(event);
      /* Capture only keeps the aim alive past the canvas edge, so a stale
       * pointer id must not abort the whole handler. */
      if (canvas.setPointerCapture && event.pointerId !== undefined) {
        try { canvas.setPointerCapture(event.pointerId); } catch (error) { /* no capture */ }
      }
      renderHud();
      draw();
    });

    canvas.addEventListener("pointermove", function (event) {
      if (!aiming) { return; }
      aimFromEvent(event);
      renderHud();
      draw();
    });

    function releasePointer() {
      if (!aiming) { return; }
      aiming = false;
      if (state.phase === "ready" || gbmCanHitYou(state)) { smash(); } else { draw(); }
    }

    canvas.addEventListener("pointerup", releasePointer);
    canvas.addEventListener("pointercancel", function () { aiming = false; });

    slowBtn.addEventListener("click", function () {
      state.options.slow = !state.options.slow;
      pinned.slow = state.options.slow;
      slowBtn.set(state.options.slow);
      draw();
    });

    assistBtn.addEventListener("click", function () {
      state.options.assist = !state.options.assist;
      pinned.assist = state.options.assist;
      assistBtn.set(state.options.assist);
      draw();
    });

    foeSel.addEventListener("change", function () {
      var index = campaign.indexOf(foeSel.value);
      if (index >= 0 && campaign.isUnlocked(foeSel.value)) { loadLevel(gbmLevels[index]); }
    });

    matchBtn.addEventListener("click", function () { loadLevel(level); });

    /* A pause freezes the rally where it stands: the shuttle keeps its place in
     * the air and the score is never touched. */
    App.quietResetGravityBadminton = function () {
      stopLoop();
      matchLive = false;
      aiming = false;
      pendingSmash = false;
      keys = { left: false, right: false };
      if (!finished) { result.textContent = t("gbmPaused"); }
      draw();
    };

    loadLevel(level);
  }

  /* Bilingual copy travels with the game: addStrings only fills keys i18n.js
   * does not already own, so the shared dictionary stays authoritative. */
  App.addStrings({
    en: {
      "tabGravityBadminton": "Gravity Badminton",
      "gbmL1": "Sitting Bird",
      "gbmL2": "Baseline Mover",
      "gbmL3": "Counter Puncher",
      "gbmL4": "Sideways Wall",
      "gbmL5": "Aim Reader",
      "gbmL6": "Iron Sitter",
      "gbmL7": "Crosscourt Trapper",
      "gbmL8": "Baseline Sprinter",
      "gbmL9": "Rotation Reader",
      "gbmL10": "Turning Bulwark",
      "gbmScoreLabel": "Score",
      "gbmPullLabel": "Pull",
      "gbmPowerLabel": "Power",
      "gbmRallyLabel": "Rally",
      "gbmPullDown": "down",
      "gbmPullLeft": "left",
      "gbmPullUp": "up",
      "gbmPullRight": "right",
      "gbmPullWord": "pull: {dir}",
      "gbmFieldLabel":
        "Gravity badminton court. Arrow keys slide and raise the aim, Q and E set power, Space smashes.",
      "gbmFoeSelectLabel": "Opponent",
      "gbmBtnSlow": "Slow shuttle",
      "gbmBtnAssist": "Aim assist",
      "gbmToggleState": "{name}: {state}",
      "gbmStateOn": "on",
      "gbmStateOff": "off",
      "gbmPrompt":
        "First to {n} points against {name}. After every rally the pull swings to the next wall and the court turns with it. Concede {b} or fewer for three stars.",
      "gbmPaused": "Frozen - the rally is held in mid-air and the score is kept.",
      "gbmBestLine": "Fewest conceded: {n}",
      "gbmFoeToNet": "{name} steps in towards the net.",
      "gbmFoeToBack": "{name} drops back to its baseline.",
      "gbmFoeHold": "{name} holds the middle of its court.",
      "gbmWonIn": "Your shuttle landed in their court.",
      "gbmWonNet": "Their shot hit the net band.",
      "gbmWonOwn": "Their shot fell back on their own side.",
      "gbmWonOut": "Their shot left the court.",
      "gbmWonStall": "Their shuttle died inside the rally.",
      "gbmLoseIn": "Their shuttle landed on your side.",
      "gbmLoseNet": "Your shot hit the net band.",
      "gbmLoseOwn": "Your shot fell back on your own side.",
      "gbmLoseOut": "Your shot left the court.",
      "gbmLoseStall": "Your shuttle died inside the rally.",
      "gbmScoreNow": "Now {a}-{b}.",
      "gbmRotation": "The court turns - {dir}.",
      "gbmYouWin": "Match won {a}-{b} - {s} stars.",
      "gbmYouLose": "Match lost {a}-{b}. {name} reads the rotation better.",
      "gbmCapHit": "The rally cap of {n} was reached at {a}-{b}, so the match is dropped.",
      "gbmNextFoe": "Next opponent unlocked.",
      "gbmAllBeat": "All ten opponents beaten.",
      "gbmHint":
        "Read the arrow, not the memory: every rally turns the court. Slide under the shuttle, raise the aim, then smash.",
      "logGravityBadminton": "Beat {name} in gravity badminton {a}-{b}",
    },
    zh: {
      "tabGravityBadminton": "重力羽毛球",
      "gbmL1": "站桩球手",
      "gbmL2": "底线跑动者",
      "gbmL3": "反击手",
      "gbmL4": "横向铁壁",
      "gbmL5": "读线者",
      "gbmL6": "站桩铁人",
      "gbmL7": "斜线伏击手",
      "gbmL8": "底线疾行者",
      "gbmL9": "旋转读线者",
      "gbmL10": "转向壁垒",
      "gbmScoreLabel": "比分",
      "gbmPullLabel": "引力",
      "gbmPowerLabel": "力量",
      "gbmRallyLabel": "回合",
      "gbmPullDown": "向下",
      "gbmPullLeft": "向左",
      "gbmPullUp": "向上",
      "gbmPullRight": "向右",
      "gbmPullWord": "引力：{dir}",
      "gbmFieldLabel": "重力羽毛球场：方向键移动并调整瞄准角，Q 和 E 设置力量，空格键扣杀。",
      "gbmFoeSelectLabel": "对手",
      "gbmBtnSlow": "慢速球",
      "gbmBtnAssist": "瞄准辅助",
      "gbmToggleState": "{name}：{state}",
      "gbmStateOn": "开",
      "gbmStateOff": "关",
      "gbmPrompt":
        "与「{name}」对战，先得 {n} 分者胜。每一回合后引力都会转向下一面墙，球场也随之旋转。失分不超过 {b} 可得三星。",
      "gbmPaused": "已暂停：球停在半空，比分保持不变。",
      "gbmBestLine": "最少失分：{n}",
      "gbmFoeToNet": "{name} 正逼近网前。",
      "gbmFoeToBack": "{name} 正退向底线。",
      "gbmFoeHold": "{name} 守在场地中间。",
      "gbmWonIn": "你的球落在对方场地内。",
      "gbmWonNet": "对方的球撞上了网带。",
      "gbmWonOwn": "对方的球落回了它自己一侧。",
      "gbmWonOut": "对方的球出了界。",
      "gbmWonStall": "对方在回合里把球打死了。",
      "gbmLoseIn": "对方的球落在你这一侧。",
      "gbmLoseNet": "你的球撞上了网带。",
      "gbmLoseOwn": "你的球落回了自己一侧。",
      "gbmLoseOut": "你的球出了界。",
      "gbmLoseStall": "你在回合里把球打死了。",
      "gbmScoreNow": "现在 {a}-{b}。",
      "gbmRotation": "球场旋转：{dir}。",
      "gbmYouWin": "以 {a}-{b} 获胜 - 得到 {s} 星。",
      "gbmYouLose": "以 {a}-{b} 落败。「{name}」更懂得利用旋转。",
      "gbmCapHit": "打到 {n} 回合的上限，比分 {a}-{b}，本局作废。",
      "gbmNextFoe": "解锁下一位对手。",
      "gbmAllBeat": "十位对手全部取胜。",
      "gbmHint": "要看箭头而不是凭记忆：每一回合球场都会旋转。跑到球下，抬高瞄准角，再扣杀。",
      "logGravityBadminton": "在重力羽毛球中以 {a}-{b} 战胜了「{name}」",
    },
  });

  App.registerGame({
    name: "gravityBadminton",
    tabKey: "tabGravityBadminton",
    init: initGravityBadmintonGame,
    guide: {
      svg:
        '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="8" y="10" width="104" height="56" rx="6" fill="rgba(30,41,59,.75)" stroke="rgba(148,163,184,.45)"/>' +
        '<rect x="57" y="26" width="6" height="40" fill="rgba(226,232,240,.85)"/>' +
        '<path d="M12 66h96" stroke="rgba(226,232,240,.8)" stroke-width="3"/>' +
        '<path d="M22 40 L44 24" stroke="#00f2ff" stroke-width="2" stroke-dasharray="4 3"/>' +
        '<path d="M44 24 l-7 1 4 6 z" fill="#00f2ff"/>' +
        '<circle cx="22" cy="60" r="6" fill="#22d3ee"/>' +
        '<path d="M96 52 l6 8 -6 8 -6 -8 z" fill="#ff6b35"/>' +
        '<path d="M70 18 a16 16 0 0 1 16 16" fill="none" stroke="#fbbf24" stroke-width="2"/>' +
        '<path d="M86 34 l-8 -2 2 8 z" fill="#fbbf24"/>' +
        '<circle cx="70" cy="30" r="3.5" fill="#fde68a"/></svg>',
      en: [
        "Aim: win the rally by making the shuttle land in the court beyond the net band.",
        "Action: slide with Arrow Left and Right (or A and D), raise or lower the aim with Arrow Up and Down, set power with Q and E, then smash with Space or by dragging and releasing on the court.",
        "Rule: gravity pulls toward one wall, and after every point it swings to the next - the court is redrawn rotated with it, so read the yellow arrow again.",
        "Watch out: the opponent telegraphs its next slide with a red arrow, so answer it with one short rally and one deep rally instead of the same shot twice.",
        "Scoring: first to 7 points. You lose a point when the shuttle lands on your side, your shot hits the net band, or your shot leaves play, and the stars count the points you concede.",
        "Access: the Slow shuttle and Aim assist switches under the court are game options, and both are written into the exported sim.",
      ],
      zh: [
        "目标：让球落在网带另一侧的场区内，就赢下这一回合。",
        "操作：左右方向键（或 A、D）移动，上下方向键抬高或压低瞄准角，Q 和 E 调整力量，空格键扣杀，也可以在球场上拖拽瞄准后松开。",
        "规则：引力朝着某一面墙拉，每一分之后都会换到下一面墙，球场跟着旋转，所以要重新看那个黄色箭头。",
        "注意：对手会用红色箭头预告它下一步往哪走，一回合打短、一回合打深，别连着打同一板球。",
        "计分：先得 7 分者胜。球落在你这一侧、你的球撞网、或你的球出界都会丢分，星数按整局丢掉的分数计算。",
        "无障碍：球场下方的慢速球和瞄准辅助是游戏选项，两者都会写进对外导出的模拟里。",
      ],
    },
  });

  /* Exported for the other modules. */
  App.initGravityBadmintonGame = initGravityBadmintonGame;
  App.badmintonStep = gbmStep;
  App.badmintonLand = gbmLand;
  App.badmintonRally = gbmRally;
  App.badmintonSolvable = gbmSolvable;
  App.badmintonState = gbmNewState;
  App.badmintonAim = gbmAimFor;
  App.badmintonBands = gbmBands;
  App.badmintonPar = gbmPar;
  App.badmintonArena = gbmToArena;
  App.badmintonLocal = gbmToLocal;
  App.badmintonLevels = gbmLevels;
  App.badmintonCourt = {
    length: gbmLen, height: gbmHigh, netU: gbmNetU, netH: gbmNetH, side: gbmSide,
    gravity: gbmGravity, toWin: gbmToWin, racketV: gbmRacketV, maxHits: gbmMaxHits,
  };
})(window.CapitalConvert = window.CapitalConvert || {});
