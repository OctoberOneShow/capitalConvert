/* Pinball Courier - the routing arcade game in the shared game drawer.
 * The plunger sends a ball over the arc and onto the sorter rail; exactly one
 * rail gate is open at a time, so the ball drops down one delivery shaft and is
 * scanned there. The manifest names the order the parcels must be delivered in,
 * and the only way to change the open route is to flip the live ball through a
 * one-way switch zone - so opening one route closes another.
 * Physics: fixed-step swept integrator, sub-stepped, clamped, no tunnelling.
 * The three extended tables ship stored input programs; the prover replays
 * them through the same step function before their par is trusted. */
(function (App) {
  var t = App.t;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  var createCampaign = App.createCampaign;
  var fillCampaignPicker = App.fillCampaignPicker;
  var starsFor = App.starsFor;

  /* ---------------- simulation constants ---------------- */
  var PBC_W = 320;
  var PBC_H = 460;
  var PBC_R = 7;
  var PBC_GRAV = 780;
  var PBC_MAX_V = 950;
  var PBC_FIXED = 1 / 240;
  var PBC_MAX_SUB = 16;
  var PBC_E = 0.5;
  var PBC_FRIC = 0.94;
  var PBC_BUMP_KICK = 205;
  var PBC_SLING_KICK = 175;
  var PBC_FLIP_LEN = 54;
  /* The blade is a line inflated by the ball radius only, so an inlane that is
   * collinear with it stays one continuous surface: the ball rolls off the rail
   * onto the blade instead of wedging at a step or the pivot cap. */
  var PBC_FLIP_R = 0;
  var PBC_FLIP_DRAW = 9;
  var PBC_L_REST = 0.349;
  var PBC_L_UP = -0.42;
  var PBC_R_REST = Math.PI - 0.349;
  var PBC_R_UP = Math.PI + 0.42;
  var PBC_L_SPEED = 26;
  var PBC_R_SPEED = 26;
  var PBC_LPX = 98;
  var PBC_LPY = 406;
  var PBC_RPX = 222;
  var PBC_RPY = 406;
  var PBC_DRAIN_Y = 452;
  var PBC_STUCK = 1.1;
  var PBC_TICK = 1 / 60;
  var PBC_CAP = 4000;

  /* ---------------- geometry ---------------- *
   * segs: [ax, ay, bx, by, hold] - hold 0 is always solid; 1..3 are the three
   * route gates (solid unless that route is open); 4 is the uphill trade: the
   * return rail closes whenever the RIDGE route (0) is the open one.          */
  function pbcSegs() {
    return [
      /* shell */
      [6, 84, 6, 456, 0],
      [314, 84, 314, 456, 0],
      [6, 84, 44, 46, 0],
      [44, 46, 104, 24, 0],
      [104, 24, 176, 16, 0],
      [176, 16, 248, 26, 0],
      [248, 26, 300, 52, 0],
      [300, 52, 314, 84, 0],
      /* shooter lane */
      [288, 200, 288, 456, 0],
      [288, 456, 314, 456, 0],
      /* sorter rail: four fixed panels ... */
      [6, 112, 50, 119, 0],
      [92, 126, 130, 132, 0],
      [172, 139, 210, 145, 0],
      [252, 152, 288, 158, 0],
      /* ... and three gated panels, one open at a time */
      [50, 119, 92, 126, 1],
      [130, 132, 172, 139, 2],
      [210, 145, 252, 152, 3],
      /* shaft 0 walls */
      [46, 133, 46, 214, 0],
      [96, 140, 96, 214, 0],
      /* shaft 1 walls */
      [126, 146, 126, 214, 0],
      [176, 153, 176, 214, 0],
      /* shaft 2 walls */
      [206, 159, 206, 214, 0],
      [256, 167, 256, 214, 0],
      /* inlanes, collinear with the flippers at rest and running up to each
       * pivot, so the ball rolls straight off the rail onto the blade */
      [6, 372, 98, 406, 0],
      [288, 382, 222, 406, 0],
    ];
  }

  /* circles: [cx, cy, r, kind, hold] - kind 0 post, 1 bumper, 2 sling/pad that
   * adds speed; hold uses the same bits as the segments. */
  function pbcCircles() {
    return [
      [70, 252, 14, 1, 0],
      [150, 258, 14, 1, 0],
      [232, 252, 14, 1, 0],
      [118, 360, 13, 2, 0],
      [204, 360, 13, 2, 0],
      /* the return lane: a pad in the left gutter that saves a trickled ball -
       * and it retracts the moment the uphill gate is lit, which is the trade */
      [26, 428, 13, 2, 4],
    ];
  }

  /* zones: { route, ax, ay, bx, by, kind, needUp } - fields, no collision. */
  function pbcZones() {
    return [
      { route: 0, ax: 48, ay: 148, bx: 94, by: 210, kind: "bin", needUp: false },
      { route: 1, ax: 128, ay: 148, bx: 174, by: 210, kind: "bin", needUp: false },
      { route: 2, ax: 208, ay: 148, bx: 254, by: 210, kind: "bin", needUp: false },
      /* forward ratchet: the corridor a left-flipper shot climbs (up, right) */
      { route: -1, ax: 176, ay: 290, bx: 250, by: 350, kind: "fwd", needUp: true },
      /* backward ratchet: the corridor a right-flipper shot climbs (up, left) */
      { route: -1, ax: 70, ay: 290, bx: 144, by: 350, kind: "back", needUp: true },
    ];
  }

  /* ---------------- small math ---------------- */
  function pbcClamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function pbcOk(n) { return typeof n === "number" && n === n && n < 1e9 && n > -1e9; }

  /* A real speed cap: clamping the axes alone would still allow MAX_V * sqrt(2),
   * and a ball that fast outruns the sub-step length. */
  function pbcLimit(state) {
    var sp = Math.sqrt(state.vx * state.vx + state.vy * state.vy);
    if (sp > PBC_MAX_V && sp > 0) {
      state.vx *= PBC_MAX_V / sp;
      state.vy *= PBC_MAX_V / sp;
    }
    state.vx = pbcClamp(state.vx, -PBC_MAX_V, PBC_MAX_V);
    state.vy = pbcClamp(state.vy, -PBC_MAX_V, PBC_MAX_V);
  }

  /* Closest point of capsule AB to P, plus the squared distance. */
  function pbcClosest(px, py, ax, ay, bx, by) {
    var dx = bx - ax;
    var dy = by - ay;
    var lenSq = dx * dx + dy * dy;
    if (lenSq < 1e-6) { return [ax, ay, (px - ax) * (px - ax) + (py - ay) * (py - ay)]; }
    var u = pbcClamp(((px - ax) * dx + (py - ay) * dy) / lenSq, 0, 1);
    var cx = ax + u * dx;
    var cy = ay + u * dy;
    return [cx, cy, (px - cx) * (px - cx) + (py - cy) * (py - cy)];
  }

  /* Earliest impact of a centre path (x0,y0) -> (x1,y1) inflated by `pad`
   * against the capsule AB, as [t, nx, ny] or null. Both round caps and the
   * slab are solved, so a thin wall cannot be skipped in one long sub-step. */
  function pbcSweepSeg(x0, y0, x1, y1, pad, ax, ay, bx, by) {
    var vx = x1 - x0;
    var vy = y1 - y0;
    var best = -1;
    var bnx = 0;
    var bny = 0;
    var cp = pbcClosest(x0, y0, ax, ay, bx, by);
    if (cp[2] < pad * pad) {
      var sd = Math.sqrt(cp[2]) || 0.0001;
      return [0, (x0 - cp[0]) / sd, (y0 - cp[1]) / sd];
    }
    var ends = [[ax, ay], [bx, by]];
    var e;
    var ox;
    var oy;
    var b;
    var c;
    var disc;
    var tt;
    for (e = 0; e < 2; e += 1) {
      ox = x0 - ends[e][0];
      oy = y0 - ends[e][1];
      b = ox * vx + oy * vy;
      c = ox * ox + oy * oy - pad * pad;
      disc = b * b - c;
      if (disc < 0) { continue; }
      tt = -b - Math.sqrt(disc);
      if (tt >= 0 && tt <= 1 && (best < 0 || tt < best)) {
        var chx = ox + vx * tt;
        var chy = oy + vy * tt;
        var chn = Math.sqrt(chx * chx + chy * chy) || 0.0001;
        best = tt;
        bnx = chx / chn;
        bny = chy / chn;
      }
    }
    var sdx = bx - ax;
    var sdy = by - ay;
    var slen = Math.sqrt(sdx * sdx + sdy * sdy);
    if (slen > 0.01) {
      var snx = -sdy / slen;
      var sny = sdx / slen;
      var d0 = (x0 - ax) * snx + (y0 - ay) * sny;
      var dv = vx * snx + vy * sny;
      if (Math.abs(d0) >= pad - 0.001 && Math.abs(dv) > 1e-7) {
        var sign = d0 > 0 ? 1 : -1;
        tt = (pad * sign - d0) / dv;
        if (tt >= 0 && tt <= 1 && (best < 0 || tt < best)) {
          var lc = pbcClosest(x0 + vx * tt, y0 + vy * tt, ax, ay, bx, by);
          var ldn = Math.sqrt(lc[2]) || 0.0001;
          if (lc[2] < (pad + 0.6) * (pad + 0.6)) {
            best = tt;
            bnx = (x0 + vx * tt - lc[0]) / ldn;
            bny = (y0 + vy * tt - lc[1]) / ldn;
          }
        }
      }
    }
    return best < 0 ? null : [best, bnx, bny];
  }

  /* Earliest impact against a static circle of radius cr. */
  function pbcSweepCirc(x0, y0, x1, y1, pad, ccx, ccy, cr) {
    var reach = pad + cr;
    var vx = x1 - x0;
    var vy = y1 - y0;
    var ox = x0 - ccx;
    var oy = y0 - ccy;
    var dSq = ox * ox + oy * oy;
    if (dSq < reach * reach) {
      var d0 = Math.sqrt(dSq) || 0.0001;
      return [0, ox / d0, oy / d0];
    }
    var b = ox * vx + oy * vy;
    var disc = b * b - (dSq - reach * reach);
    if (disc < 0) { return null; }
    var tt = -b - Math.sqrt(disc);
    if (tt < 0 || tt > 1) { return null; }
    var hx = ox + vx * tt;
    var hy = oy + vy * tt;
    var hn = Math.sqrt(hx * hx + hy * hy) || 0.0001;
    return [tt, hx / hn, hy / hn];
  }

  /* Which route-controlled pieces are solid right now. */
  function pbcHeld(hold, route) {
    if (hold === 0) {
      return true;
    }
    if (hold === 1 || hold === 2 || hold === 3) {
      return route !== hold - 1;
    }
    if (hold === 4) {
      return route !== 0;
    }
    return true;
  }

  /* Segments the ball can hit for a given route. */
  function pbcSolids(segs, route) {
    var out = [];
    var i;
    for (i = 0; i < segs.length; i += 1) {
      if (pbcHeld(segs[i][4], route)) { out.push(segs[i]); }
    }
    return out;
  }

  /* The gate panel that the given route leaves open, for drawing the gap. */
  function pbcGateSeg(segs, route) {
    var i;
    for (i = 0; i < segs.length; i += 1) {
      if (segs[i][4] === route + 1) { return segs[i]; }
    }
    return null;
  }

  function pbcTip(pivotX, pivotY, angle) {
    return [pivotX + Math.cos(angle) * PBC_FLIP_LEN, pivotY + Math.sin(angle) * PBC_FLIP_LEN];
  }

  /* ---------------- tables ---------------- */
  function pbcTable(id, labelKey, manifest, balls, startRoute, program) {
    return {
      id: id, labelKey: labelKey, manifest: manifest, balls: balls,
      startRoute: startRoute, powers: [770, 850, 930], program: program || [],
      segs: pbcSegs(), circles: pbcCircles(), zones: pbcZones(),
    };
  }

  /* Stored input scripts for the three extended tables. Each was built tick by
   * tick against this step function; the prover replays it through the same
   * step function before the table's par is trusted, so the measured par
   * climbs 5, 6, 7 launches - one launch per stop. */
  var pbcProg4 = [
    { launch: true, dur: 1 },
    { dur: 128 },
    { flipL: true, dur: 2 },
    { dur: 664 },
    { launch: true, dur: 1 },
    { dur: 411 },
    { flipR: true, dur: 8 },
    { dur: 113 },
    { flipR: true, dur: 13 },
    { launch: true, dur: 1 },
    { dur: 276 },
    { flipR: true, dur: 16 },
    { dur: 27 },
    { flipR: true, dur: 2 },
    { dur: 64 },
    { flipR: true, dur: 24 },
    { dur: 26 },
    { flipR: true, dur: 14 },
    { dur: 4 },
    { flipR: true, dur: 18 },
    { dur: 25 },
    { flipR: true, dur: 31 },
    { launch: true, dur: 1 },
    { dur: 389 },
    { flipR: true, dur: 20 },
    { dur: 4 },
    { launch: true, dur: 1 },
    { dur: 72 },
  ];

  var pbcProg5 = [
    { launch: true, dur: 1 },
    { dur: 128 },
    { flipL: true, dur: 2 },
    { dur: 664 },
    { launch: true, dur: 1 },
    { dur: 389 },
    { flipR: true, dur: 20 },
    { dur: 4 },
    { launch: true, dur: 1 },
    { dur: 137 },
    { flipL: true, dur: 3 },
    { launch: true, dur: 1 },
    { dur: 276 },
    { flipR: true, dur: 16 },
    { dur: 27 },
    { flipR: true, dur: 2 },
    { dur: 64 },
    { flipR: true, dur: 24 },
    { dur: 26 },
    { flipR: true, dur: 14 },
    { dur: 4 },
    { flipR: true, dur: 18 },
    { dur: 25 },
    { flipR: true, dur: 31 },
    { launch: true, dur: 1 },
    { dur: 389 },
    { flipR: true, dur: 20 },
    { dur: 4 },
    { launch: true, dur: 1 },
    { dur: 72 },
  ];

  var pbcProg6 = [
    { launch: true, dur: 1 },
    { dur: 128 },
    { flipL: true, dur: 2 },
    { dur: 664 },
    { launch: true, dur: 1 },
    { dur: 411 },
    { flipR: true, dur: 8 },
    { dur: 113 },
    { flipR: true, dur: 13 },
    { launch: true, dur: 1 },
    { dur: 276 },
    { flipR: true, dur: 16 },
    { dur: 27 },
    { flipR: true, dur: 2 },
    { dur: 64 },
    { flipR: true, dur: 24 },
    { dur: 26 },
    { flipR: true, dur: 14 },
    { dur: 4 },
    { flipR: true, dur: 18 },
    { dur: 25 },
    { flipR: true, dur: 31 },
    { launch: true, dur: 1 },
    { dur: 389 },
    { flipR: true, dur: 20 },
    { dur: 4 },
    { launch: true, dur: 1 },
    { dur: 137 },
    { flipL: true, dur: 3 },
    { launch: true, dur: 1 },
    { dur: 276 },
    { flipR: true, dur: 16 },
    { dur: 27 },
    { flipR: true, dur: 2 },
    { dur: 64 },
    { flipR: true, dur: 24 },
    { dur: 26 },
    { flipR: true, dur: 14 },
    { dur: 4 },
    { flipR: true, dur: 18 },
    { dur: 25 },
    { flipR: true, dur: 31 },
    { launch: true, dur: 1 },
    { dur: 185 },
  ];

  var pbcTables = [
    pbcTable("pbcT1", "pbcTbl1", [0, 1, 2], 4, 0),
    pbcTable("pbcT2", "pbcTbl2", [2, 1, 0], 5, 0),
    pbcTable("pbcT3", "pbcTbl3", [1, 0, 2], 5, 0),
    pbcTable("pbcT4", "pbcTbl4", [0, 1, 2, 1, 0], 6, 0, pbcProg4),
    pbcTable("pbcT5", "pbcTbl5", [0, 1, 0, 2, 1, 0], 7, 0, pbcProg5),
    pbcTable("pbcT6", "pbcTbl6", [0, 1, 2, 1, 0, 2, 1], 8, 0, pbcProg6),
  ];

  function pbcFresh(table) {
    return {
      table: table, x: 301, y: 449, vx: 0, vy: 0, inLane: true,
      route: table.startRoute, deliveries: 0, launches: 0, rejects: 0,
      ballsLeft: table.balls, manifest: table.manifest.slice(),
      running: false, won: false, lost: false, power: 2, scanned: false,
      la: PBC_L_REST, ra: PBC_R_REST, laPrev: PBC_L_REST, raPrev: PBC_R_REST,
      timers: table.zones.map(function () { return 0; }),
      kicks: table.circles.map(function () { return 0; }),
      stuck: 0, substeps: 0, lastEvent: t("pbcEvReady"),
    };
  }

  /* ---------------- core: gate, deliver, step ---------------- */
  function pbcGate(state, id) {
    if (!state || state.won || state.lost) { return state; }
    var named = { ridge: 0, curb: 1, market: 2 };
    if (id === 0 || id === 1 || id === 2) {
      state.route = id;
    } else if (typeof id === "string" && named[id] !== undefined) {
      state.route = named[id];
    } else if (id === "fwd" || id === "next") {
      state.route = (state.route + 1) % 3;
    } else if (id === "back" || id === "prev") {
      state.route = (state.route + 2) % 3;
    }
    return state;
  }

  function pbcBinName(route) {
    return t("pbcBin" + (route + 1));
  }

  function pbcDeliver(state, id) {
    if (!state || state.won || state.lost || state.scanned) {
      return state;
    }
    var route = typeof id === "number" ? id : state.route;
    var want = state.manifest[state.deliveries];
    state.scanned = true;
    if (route === want) {
      state.deliveries += 1;
      state.lastEvent = t("pbcEvDeliver", { d: state.deliveries, name: pbcBinName(route) });
      if (state.deliveries >= state.manifest.length) {
        state.won = true;
        state.running = false;
      }
    } else {
      state.rejects += 1;
      state.lastEvent = t("pbcEvReject", {
        got: pbcBinName(route),
        pos: state.deliveries + 1,
        total: state.manifest.length,
        want: typeof want === "number" ? pbcBinName(want) : pbcBinName(route),
      });
    }
    return state;
  }

  function pbcLaunch(state) {
    if (!state || !state.inLane || state.won || state.lost) { return state; }
    var pw = state.table.powers[pbcClamp(state.power, 0, 2)];
    state.vy = -pw;
    state.vx = 0;
    state.inLane = false;
    state.scanned = false;
    state.stuck = 0;
    state.launches += 1;
    state.running = true;
    state.lastEvent = t("pbcEvLaunch", { n: state.launches, p: state.power + 1 });
    return state;
  }

  /* One sub-step: integrate, then resolve the earliest impact repeatedly. The
   * remaining time is re-swept after every hit, so a fast ball leaving a bumper
   * still cannot pass through the next wall it meets in the same step. */
  function pbcSubstep(state, h, solids) {
    var circles = state.table.circles;
    var zones = state.table.zones;
    var i;

    state.vy += PBC_GRAV * h;
    pbcLimit(state);

    var px = state.x;
    var py = state.y;
    var left = 1;
    var pass;
    var flipL = [PBC_LPX, PBC_LPY, state.laPrev, state.la];
    var flipR = [PBC_RPX, PBC_RPY, state.raPrev, state.ra];
    for (pass = 0; pass < 6 && left > 0.0004; pass += 1) {
      var nx = px + state.vx * h * left;
      var ny = py + state.vy * h * left;
      var bt = 1.0001;
      var bnx = 0;
      var bny = 0;
      var kind = 0;
      var idx = -1;
      for (i = 0; i < solids.length; i += 1) {
        var sg = solids[i];
        var hs = pbcSweepSeg(px, py, nx, ny, PBC_R, sg[0], sg[1], sg[2], sg[3]);
        if (hs && hs[0] < bt) {
          bt = hs[0]; bnx = hs[1]; bny = hs[2]; kind = 1; idx = i;
        }
      }
      for (i = 0; i < 2; i += 1) {
        var fp = i === 0 ? flipL : flipR;
        var tipNow = pbcTip(fp[0], fp[1], fp[3]);
        var tipPrev = pbcTip(fp[0], fp[1], fp[2]);
        /* test both the previous and current blade; the earlier hit wins */
        var hf = pbcSweepSeg(px, py, nx, ny, PBC_R + PBC_FLIP_R, fp[0], fp[1], tipPrev[0], tipPrev[1]);
        if (hf && hf[0] < bt) {
          bt = hf[0]; bnx = hf[1]; bny = hf[2]; kind = 2; idx = i;
        }
        var hg = pbcSweepSeg(px, py, nx, ny, PBC_R + PBC_FLIP_R, fp[0], fp[1], tipNow[0], tipNow[1]);
        if (hg && hg[0] < bt) {
          bt = hg[0]; bnx = hg[1]; bny = hg[2]; kind = 2; idx = i;
        }
      }
      for (i = 0; i < circles.length; i += 1) {
        var cc = circles[i];
        if (!pbcHeld(cc[4], state.route)) {
          continue;
        }
        var hc = pbcSweepCirc(px, py, nx, ny, PBC_R, cc[0], cc[1], cc[2]);
        if (hc && hc[0] < bt) {
          bt = hc[0]; bnx = hc[1]; bny = hc[2]; kind = 3; idx = i;
        }
      }

      if (kind === 0) {
        px = nx;
        py = ny;
        left = 0;
        break;
      }

      var tc = pbcClamp(bt, 0, 1);
      px += (nx - px) * tc;
      py += (ny - py) * tc;
      left *= 1 - tc;

      if (kind === 3 && (circles[idx][3] === 1 || circles[idx][3] === 2)) {
        /* bumpers and slings add speed instead of taking it - but only on a
         * real hit, or a ball resting against one would be kicked forever */
        var bite = state.vx * bnx + state.vy * bny;
        if (state.kicks[idx] <= 0 && bite < -70) {
          var kick = circles[idx][3] === 1 ? PBC_BUMP_KICK : PBC_SLING_KICK;
          state.kicks[idx] = circles[idx][3] === 1 ? 0.2 : 0.16;
          state.vx = bnx * kick;
          state.vy = bny * kick;
          px += bnx * 0.6;
          py += bny * 0.6;
          continue;
        }
      }

      if (kind === 2) {
        var piv = idx === 0 ? flipL : flipR;
        var omega = (piv[3] - piv[2]) / Math.max(h, 1e-5);
        var svx = -(py - piv[1]) * omega;
        var svy = (px - piv[0]) * omega;
        var rvx = state.vx - svx;
        var rvy = state.vy - svy;
        var dot = rvx * bnx + rvy * bny;
        if (dot < 0) {
          state.vx = rvx - 2 * dot * bnx + svx * 0.35;
          state.vy = rvy - 2 * dot * bny + svy * 0.35;
        }
        px += bnx * 0.4;
        py += bny * 0.4;
        pbcLimit(state);
        continue;
      }

      /* walls: reflect the normal component, scrub a little of the tangential */
      var vn = state.vx * bnx + state.vy * bny;
      var tx = -bny;
      var ty = bnx;
      var vt = state.vx * tx + state.vy * ty;
      if (vn < 0) {
        var bite = Math.min(1, -vn / 260);
        vt *= 1 - 0.08 * bite;
        vn = -vn * PBC_E;
        state.vx = bnx * vn + tx * vt;
        state.vy = bny * vn + ty * vt;
      }
      px += bnx * 0.35;
      py += bny * 0.35;
    }

    /* depenetrate: a ball must never end a step buried in geometry */
    var k;
    var sd;
    var cp;
    for (k = 0; k < solids.length; k += 1) {
      sd = solids[k];
      cp = pbcClosest(px, py, sd[0], sd[1], sd[2], sd[3]);
      if (cp[2] < PBC_R * PBC_R) {
        var dd = Math.sqrt(cp[2]) || 0.0001;
        px = cp[0] + (px - cp[0]) / dd * PBC_R;
        py = cp[1] + (py - cp[1]) / dd * PBC_R;
      }
    }
    for (k = 0; k < circles.length; k += 1) {
      var cb = circles[k];
      if (!pbcHeld(cb[4], state.route)) { continue; }
      var reach = PBC_R + cb[2];
      var ox = px - cb[0];
      var oy = py - cb[1];
      var od = Math.sqrt(ox * ox + oy * oy);
      if (od < reach) {
        if (od > 0.0001) {
          px = cb[0] + ox / od * reach;
          py = cb[1] + oy / od * reach;
        } else {
          px = cb[0];
          py = cb[1] - reach;
        }
      }
    }

    state.x = px;
    state.y = py;

    /* zone fields: they never push the ball, they only read it */
    for (i = 0; i < zones.length; i += 1) {
      if (state.timers[i] > 0) { continue; }
      var z = zones[i];
      if (px < z.ax || px > z.bx || py < z.ay || py > z.by) { continue; }
      if (z.needUp && state.vy > -30) { continue; }
      state.timers[i] = z.kind === "bin" ? 1.4 : 0.9;
      if (z.kind === "bin") {
        pbcDeliver(state, z.route);
      } else {
        pbcGate(state, z.kind === "fwd" ? "fwd" : "back");
        state.lastEvent = t(z.kind === "fwd" ? "pbcEvSwitchF" : "pbcEvSwitchB", {
          r: state.route + 1,
          name: pbcBinName(state.route),
        });
      }
    }
  }

  function pbcStep(state, input, dt) {
    if (!state || state.won || state.lost) {
      return state;
    }
    var raw = typeof dt === "number" && pbcOk(dt) ? dt : PBC_TICK;
    var span = pbcClamp(raw, 0, 0.05);
    if (span <= 0) {
      return state;
    }
    var hold = input || {};
    if (hold.launch) {
      pbcLaunch(state);
    }
    if (!state.running) {
      return state;
    }

    var steps = Math.min(PBC_MAX_SUB, Math.max(1, Math.ceil(span / PBC_FIXED)));
    var h = span / steps;
    state.substeps = steps;

    var i;
    for (i = 0; i < state.timers.length; i += 1) {
      state.timers[i] = Math.max(0, state.timers[i] - span);
    }
    for (i = 0; i < state.kicks.length; i += 1) {
      state.kicks[i] = Math.max(0, state.kicks[i] - span);
    }

    var solids = pbcSolids(state.table.segs, state.route);
    var wantL = !!hold.flipL;
    var wantR = !!hold.flipR;

    for (i = 0; i < steps; i += 1) {
      state.laPrev = state.la;
      state.la = wantL
        ? Math.max(PBC_L_UP, state.la - PBC_L_SPEED * h)
        : Math.min(PBC_L_REST, state.la + PBC_L_SPEED * h);
      state.raPrev = state.ra;
      state.ra = wantR
        ? Math.min(PBC_R_UP, state.ra + PBC_R_SPEED * h)
        : Math.max(PBC_R_REST, state.ra - PBC_R_SPEED * h);

      pbcSubstep(state, h, solids);

      if (state.won || state.lost) {
        break;
      }

      /* a launch that never clears the arc drops back into the lane: the ball
       * is reloaded there, but the launch it burned is still counted */
      if (state.x > 290 && state.y > 400 && Math.abs(state.vx) < 70 && state.vy > -20) {
        state.x = pbcClamp(state.x, 295, 307);
        if (Math.abs(state.vy) < 90) {
          state.inLane = true;
          state.running = false;
          state.vx = 0;
          state.vy = 0;
          state.y = 449;
          state.lastEvent = t("pbcEvRollback", { n: state.launches });
        }
      }

      /* draining costs a ball and loads the next one into the plunger */
      if (state.y > PBC_DRAIN_Y && state.x < 288) {
        state.ballsLeft -= 1;
        state.x = 301;
        state.y = 449;
        state.vx = 0;
        state.vy = 0;
        state.inLane = true;
        state.running = false;
        state.lastEvent = t("pbcEvDrain", { n: state.ballsLeft });
        if (state.ballsLeft <= 0) {
          state.lost = true;
        }
        break;
      }

      /* ball search: a parcel that crawls is tossed back into flipper reach */
      var spd = Math.sqrt(state.vx * state.vx + state.vy * state.vy);
      if (spd < 60) {
        state.stuck += h;
        if (state.stuck > PBC_STUCK) {
          state.stuck = 0;
          state.vy -= 40;
          state.vx += state.x < 160 ? 150 : -150;
          pbcLimit(state);
        }
      } else {
        state.stuck = 0;
      }
    }

    if (!pbcOk(state.x) || !pbcOk(state.y) || !pbcOk(state.vx) || !pbcOk(state.vy)) {
      state.x = 301;
      state.y = 449;
      state.vx = 0;
      state.vy = 0;
      state.inLane = true;
      state.running = false;
      state.lastEvent = t("pbcEvReady");
    }
    state.x = pbcClamp(state.x, -40, PBC_W + 40);
    state.y = pbcClamp(state.y, -40, PBC_H + 40);
    pbcLimit(state);
    return state;
  }

  /* ---------------- exported proof API ---------------- */
  App.courierStep = pbcStep;
  App.courierGate = pbcGate;
  App.courierDeliver = pbcDeliver;
  App.courierLaunch = pbcLaunch;
  App.courierTables = pbcTables;
  App.courierFresh = pbcFresh;

  /* Replay a scripted input program through the same step function the panel
   * drives, so every published number is measured rather than invented. */
  App.courierReplay = function (table, program) {
    var state = pbcFresh(table);
    var list = program || [];
    var ticks = 0;
    var live = function () { return !state.won && !state.lost && ticks < PBC_CAP; };
    var pi;
    var si;
    for (pi = 0; pi < list.length && live(); pi += 1) {
      var item = list[pi];
      var dur = Math.max(1, item.dur || 1);
      for (si = 0; si < dur && live(); si += 1) {
        pbcStep(state, item, PBC_TICK);
        ticks += 1;
      }
    }
    while (live()) {
      pbcStep(state, {}, PBC_TICK);
      ticks += 1;
    }
    return {
      deliveries: state.deliveries, launches: state.launches, rejects: state.rejects,
      ballsLeft: state.ballsLeft, won: state.won, lost: state.lost,
      ticks: ticks, route: state.route, state: state,
    };
  };

  /* A stored program must actually complete every delivery, in order. */
  App.courierSolvable = function (table) {
    if (!table || !table.program || !table.program.length) {
      return false;
    }
    var run = App.courierReplay(table, table.program);
    return !!run.won && run.deliveries >= table.manifest.length;
  };

  /* Random-input fuzzing over the same step function: state must stay finite,
   * bounded and inside the table. Returns the worst thing it saw. */
  App.courierFuzz = function (table, seed, runs, steps) {
    var v = (seed || 1) >>> 0;
    function rng() {
      v = (v + 0x6d2b79f5) >>> 0;
      var m = Math.imul(v ^ (v >>> 15), 1 | v);
      m = (m + Math.imul(m ^ (m >>> 7), 61 | m)) ^ m;
      return ((m ^ (m >>> 14)) >>> 0) / 4294967296;
    }
    var worstSpeed = 0;
    var bad = 0;
    var escape = 0;
    var stall = 0;
    var trap = 0;
    var total = 0;
    var r;
    var i;
    for (r = 0; r < (runs || 100); r += 1) {
      var state = pbcFresh(table);
      state.power = Math.floor(rng() * 3);
      var idle = 0;
      var hist = [];
      for (i = 0; i < (steps || 1200); i += 1) {
        var dt = rng() * 0.06;
        pbcStep(state, {
          flipL: rng() < 0.25,
          flipR: rng() < 0.25,
          launch: rng() < 0.05,
        }, dt);
        total += 1;
        if (!pbcOk(state.x) || !pbcOk(state.y) || !pbcOk(state.vx) || !pbcOk(state.vy)) {
          bad += 1;
          break;
        }
        if (state.x < 0 || state.x > PBC_W || state.y < 0 || state.y > PBC_H + 12) {
          escape += 1;
          break;
        }
        var sp = Math.sqrt(state.vx * state.vx + state.vy * state.vy);
        if (sp > worstSpeed) { worstSpeed = sp; }
        if (sp < 60) { idle += 1; } else { idle = 0; }
        if (!state.running) {
          hist.length = 0;
          idle = 0;
        } else {
          if (idle > 200) { stall += 1; break; }
          hist.push([state.x, state.y]);
          if (hist.length > 150) {
            hist.shift();
            var xlo = hist[0][0];
            var xhi = hist[0][0];
            var ylo = hist[0][1];
            var yhi = hist[0][1];
            var j;
            for (j = 0; j < hist.length; j += 1) {
              if (hist[j][0] < xlo) { xlo = hist[j][0]; }
              if (hist[j][0] > xhi) { xhi = hist[j][0]; }
              if (hist[j][1] < ylo) { ylo = hist[j][1]; }
              if (hist[j][1] > yhi) { yhi = hist[j][1]; }
            }
            if (xhi - xlo < 26 && yhi - ylo < 26) { trap += 1; break; }
          }
        }
        if (state.won || state.lost) { break; }
      }
    }
    return {
      bad: bad,
      escape: escape,
      stall: stall,
      trap: trap,
      steps: total,
      worstSpeed: Math.round(worstSpeed),
      cap: PBC_MAX_V,
    };
  };

  /* Star bands come from the stored program's measured launch count. */
  var pbcBandCache = {};
  App.courierBands = function (table) {
    if (!table) {
      return [4, 6, 8];
    }
    if (pbcBandCache[table.id]) {
      return pbcBandCache[table.id];
    }
    var run = table.program && table.program.length
      ? App.courierReplay(table, table.program)
      : null;
    var par = run && run.won ? run.launches : table.manifest.length + 1;
    var bands = [par, par + 1, par + 2];
    pbcBandCache[table.id] = bands;
    return bands;
  };

  /* ---------------- panel ---------------- */
  function initPinballCourierGame(panelEl) {
    if (!panelEl) {
      return;
    }

    var campaign = createCampaign({ key: "pinball-courier-campaign", levels: pbcTables });
    var startIdx = Math.max(0, campaign.indexOf(campaign.nextLevelId()));
    var table = pbcTables[startIdx];
    var state = pbcFresh(table);
    var rafId = null;
    var lastFrame = 0;
    var slow = 0;
    var trail = [];
    var heldL = false;
    var heldR = false;

    /* HUD */
    var hud = document.createElement("div");
    hud.className = "game-hud";
    var ballsEl = document.createElement("strong");
    var stopEl = document.createElement("strong");
    var launchEl = document.createElement("strong");
    hud.appendChild(stat("pbcHudBalls", ballsEl));
    hud.appendChild(stat("pbcHudStops", stopEl));
    hud.appendChild(stat("pbcHudLaunch", launchEl));

    /* table */
    var canvas = document.createElement("canvas");
    canvas.className = "pbc-canvas";
    canvas.width = PBC_W;
    canvas.height = PBC_H;
    canvas.setAttribute("tabindex", "0");
    canvas.setAttribute("role", "application");
    canvas.setAttribute("aria-label", t("pbcFieldLabel"));

    /* route panel */
    var route = document.createElement("div");
    route.className = "pbc-route";
    route.setAttribute("role", "group");
    route.setAttribute("aria-label", t("pbcRouteLabel"));
    var gateLine = document.createElement("p");
    gateLine.className = "pbc-route-line pbc-route-gate";
    var stopLine = document.createElement("p");
    stopLine.className = "pbc-route-line pbc-route-stops";
    var ballLine = document.createElement("p");
    ballLine.className = "pbc-route-line pbc-route-ball";
    var eventLine = document.createElement("p");
    eventLine.className = "pbc-route-line pbc-route-event";
    [gateLine, stopLine, ballLine, eventLine].forEach(function (n) {
      route.appendChild(n);
    });

    var result = document.createElement("p");
    result.className = "game-result";
    result.setAttribute("role", "status");

    var pickerRow = document.createElement("div");
    pickerRow.className = "elements-row";
    var pickerLabel = document.createElement("label");
    pickerLabel.className = "elements-label";
    pickerLabel.setAttribute("for", "pbcTblSel");
    pickerLabel.setAttribute("data-i18n", "pbcTblSelectLabel");
    pickerLabel.textContent = t("pbcTblSelectLabel");
    var picker = document.createElement("select");
    picker.className = "elements-select";
    picker.id = "pbcTblSel";
    pickerRow.appendChild(pickerLabel);
    pickerRow.appendChild(picker);

    var actions = document.createElement("div");
    actions.className = "game-actions";
    var launchBtn = document.createElement("button");
    launchBtn.type = "button";
    launchBtn.className = "primary";
    var btnLabel = document.createElement("span");
    btnLabel.setAttribute("data-i18n", "pbcBtnLaunch");
    btnLabel.textContent = t("pbcBtnLaunch");
    var btnBody = document.createElement("span");
    btnBody.className = "button-content";
    btnBody.appendChild(btnLabel);
    launchBtn.appendChild(btnBody);
    var bestEl = document.createElement("p");
    bestEl.className = "game-best";
    actions.appendChild(launchBtn);
    actions.appendChild(bestEl);

    var hint = document.createElement("p");
    hint.className = "game-hint";
    hint.setAttribute("data-i18n", "pbcHint");
    hint.textContent = t("pbcHint");

    [hud, canvas, route, result, pickerRow, actions, hint].forEach(function (n) {
      panelEl.appendChild(n);
    });

    function stat(key, valueEl) {
      var box = document.createElement("div");
      box.className = "game-stat";
      var lab = document.createElement("span");
      lab.setAttribute("data-i18n", key);
      lab.textContent = t(key);
      box.appendChild(lab);
      box.appendChild(valueEl);
      return box;
    }

    var ctx = canvas.getContext("2d");

    function gateWord(route) {
      return route === 0 ? t("pbcGateUp") : route === 1 ? t("pbcGateMid") : t("pbcGateLow");
    }

    function speedWord(sp) {
      if (sp < 20) { return t("pbcSpdHeld"); }
      if (sp < 180) { return t("pbcSpdSlow"); }
      if (sp < 420) { return t("pbcSpdMed"); }
      return t("pbcSpdFast");
    }

    function signed(n) {
      var v = Math.round(n);
      return (v < 0 ? "-" : "+") + Math.abs(v);
    }

    function renderHud() {
      ballsEl.textContent = t("pbcBallsCount", { n: state.ballsLeft });
      stopEl.textContent = state.deliveries + " / " + state.manifest.length;
      launchEl.textContent = String(state.launches);
    }

    function renderRoute() {
      var closed = [];
      var r;
      for (r = 0; r < 3; r += 1) {
        if (r !== state.route) {
          closed.push(pbcBinName(r));
        }
      }
      gateLine.textContent =
        t("pbcGateNow") + " " + (state.route + 1) + " " + t("pbcGateOf") +
        " - " + gateWord(state.route) + " " + t("pbcIsOpen") +
        " | " + t("pbcGateClosedList") + ": " + closed.join(" + ") +
        " | " + t("pbcReturnLane") + " " +
        (state.route === 0 ? t("pbcIsClosed") : t("pbcIsOpen")) +
        " | " + t("pbcPowerLabel") + " " + (state.power + 1);

      var parts = [];
      var i;
      for (i = 0; i < state.manifest.length; i += 1) {
        var mark = i < state.deliveries ? t("pbcMarkDone")
          : i === state.deliveries ? t("pbcMarkNext") : t("pbcMarkWait");
        parts.push(mark + " " + (i + 1) + " " + pbcBinName(state.manifest[i]));
      }
      stopLine.textContent = t("pbcManifestLabel") + ": " + parts.join(" \u2192 ");

      var sp = Math.sqrt(state.vx * state.vx + state.vy * state.vy);
      ballLine.textContent =
        t("pbcBallPos") + " x " + Math.round(state.x) + " y " + Math.round(state.y) +
        " | " + t("pbcBallVel") + " vx " + signed(state.vx) + " vy " + signed(state.vy) +
        " | " + t("pbcBallSpeed") + " " + Math.round(sp) + " " + speedWord(sp) +
        " | " + (state.inLane ? t("pbcBallLane") : t("pbcBallPlay"));

      eventLine.textContent = state.lastEvent;
    }

    function refreshPicker() {
      fillCampaignPicker(
        picker,
        campaign,
        function (def) {
          return t(def.labelKey);
        },
        t("elementsLocked"),
      );
      picker.value = table.id;
      bestEl.textContent = t("campaignStars", {
        n: campaign.totalStars(),
        max: campaign.maxStars(),
      });
    }

    function draw() {
      var solids = pbcSolids(state.table.segs, state.route);
      var i;
      ctx.clearRect(0, 0, PBC_W, PBC_H);
      ctx.fillStyle = "#0b1020";
      ctx.fillRect(0, 0, PBC_W, PBC_H);
      if (App.world) { App.world.backdrop(ctx, PBC_W, PBC_H, "neon"); }

      /* rail + shafts plates */
      ctx.fillStyle = "rgba(30, 41, 59, 0.8)";
      ctx.fillRect(6, 108, 288, 10);
      for (i = 0; i < 3; i += 1) {
        ctx.fillRect(46 + i * 80, 120, 50, 94);
      }

      /* solid walls */
      ctx.strokeStyle = "rgba(148, 163, 184, 0.6)";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      for (i = 0; i < solids.length; i += 1) {
        var s = solids[i];
        ctx.beginPath();
        ctx.moveTo(s[0], s[1]);
        ctx.lineTo(s[2], s[3]);
        ctx.stroke();
      }

      /* open gates: a dashed gap in the rail */
      ctx.strokeStyle = "rgba(0, 242, 255, 0.5)";
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 1.5;
      for (i = 0; i < 3; i += 1) {
        if (i !== state.route) {
          continue;
        }
        var g = null;
        var gi;
        for (gi = 0; gi < state.table.segs.length; gi += 1) {
          if (state.table.segs[gi][4] === i + 1) {
            g = state.table.segs[gi];
            break;
          }
        }
        if (!g) {
          continue;
        }
        ctx.beginPath();
        ctx.moveTo(g[0], g[1]);
        ctx.lineTo(g[2], g[3]);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      /* bins */
      var binColors = ["#22d3ee", "#fbbf24", "#a3e635"];
      for (i = 0; i < 3; i += 1) {
        var z = state.table.zones[i];
        var live = i === state.route;
        ctx.globalAlpha = live ? 0.28 : 0.1;
        ctx.fillStyle = binColors[i];
        ctx.fillRect(z.ax, z.ay, z.bx - z.ax, z.by - z.ay);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = binColors[i];
        ctx.lineWidth = live ? 2 : 1;
        ctx.strokeRect(z.ax, z.ay, z.bx - z.ax, z.by - z.ay);
        ctx.fillStyle = live ? binColors[i] : "rgba(148, 163, 184, 0.6)";
        ctx.font = "bold 11px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(i + 1), (z.ax + z.bx) / 2, z.by - 14);
      }

      /* switch fields */
      for (i = 3; i < 5; i += 1) {
        var sz = state.table.zones[i];
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = i === 3 ? "rgba(34, 211, 238, 0.55)" : "rgba(251, 191, 36, 0.55)";
        ctx.lineWidth = 1;
        ctx.strokeRect(sz.ax, sz.ay, sz.bx - sz.ax, sz.by - sz.ay);
        ctx.setLineDash([]);
      }

      /* bumpers and slings */
      for (i = 0; i < state.table.circles.length; i += 1) {
        var cc = state.table.circles[i];
        var hot = state.kicks[i] > 0;
        ctx.beginPath();
        ctx.arc(cc[0], cc[1], cc[2] + (hot ? 2 : 0), 0, Math.PI * 2);
        ctx.fillStyle = hot
          ? "#fb923c"
          : cc[3] === 1 ? "rgba(251, 146, 60, 0.55)" : "rgba(0, 242, 255, 0.4)";
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = cc[3] === 1 ? "#fb923c" : "#22d3ee";
        ctx.stroke();
      }

      /* flippers */
      var lt = pbcTip(PBC_LPX, PBC_LPY, state.la);
      var rt = pbcTip(PBC_RPX, PBC_RPY, state.ra);
      ctx.lineWidth = PBC_FLIP_DRAW;
      ctx.strokeStyle = "#e2e8f0";
      ctx.beginPath();
      ctx.moveTo(PBC_LPX, PBC_LPY);
      ctx.lineTo(lt[0], lt[1]);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(PBC_RPX, PBC_RPY);
      ctx.lineTo(rt[0], rt[1]);
      ctx.stroke();

      /* trail + ball */
      trail.push({ x: state.x, y: state.y });
      if (trail.length > 9) {
        trail.shift();
      }
      for (i = 0; i < trail.length; i += 1) {
        ctx.globalAlpha = (i / trail.length) * 0.35;
        ctx.beginPath();
        ctx.arc(trail[i].x, trail[i].y, PBC_R * 0.7, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(state.x, state.y, PBC_R, 0, Math.PI * 2);
      ctx.fillStyle = "#f8fafc";
      ctx.fill();

      /* route strip in words at the top of the table */
      ctx.fillStyle = "rgba(2, 6, 23, 0.72)";
      ctx.fillRect(96, 60, 148, 16);
      ctx.fillStyle = binColors[state.route];
      ctx.font = "bold 10px 'JetBrains Mono', monospace";
      ctx.textAlign = "left";
      ctx.fillText(gateWord(state.route).toUpperCase() + " OPEN", 102, 68);
    }

    function frame(now) {
      if (rafId === null) {
        return;
      }
      if (panelEl.hidden || document.hidden) {
        rafId = window.requestAnimationFrame(frame);
        return;
      }
      var dt = (now - lastFrame) / 1000;
      lastFrame = now;
      if (!pbcOk(dt) || dt <= 0) {
        dt = PBC_TICK;
      }
      pbcStep(state, { flipL: heldL, flipR: heldR }, Math.min(dt, 0.05));
      renderHud();
      slow += 1;
      if (slow % 5 === 0) {
        renderRoute();
      }
      draw();
      if (state.won) {
        onWin();
        return;
      }
      if (state.lost) {
        onLose();
        return;
      }
      rafId = window.requestAnimationFrame(frame);
    }

    function startLoop() {
      if (rafId !== null) {
        return;
      }
      lastFrame = performance.now();
      rafId = window.requestAnimationFrame(frame);
    }

    function stopLoop() {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
    }

    /* A paused (quietReset) table wakes on the next player input. */
    function wake() {
      if (!state.won && !state.lost) {
        startLoop();
      }
    }

    function onWin() {
      stopLoop();
      var bands = App.courierBands(table);
      var starsWon = Math.max(1, starsFor(state.launches, bands, "low"));
      var outcome = campaign.record(table.id, {
        stars: starsWon,
        best: state.launches,
        better: "low",
      });
      var message = t("pbcWin", { n: state.launches, s: starsWon, r: state.rejects });
      if (outcome.isBest) {
        message += " " + t("newBest");
      }
      if (outcome.unlockedNext) {
        message += " " + t("pbcNextTable");
      } else if (campaign.clearedCount() === pbcTables.length) {
        message += " " + t("pbcAllDone");
      }
      renderHud();
      renderRoute();
      result.textContent = message;
      logAction(t("logPinballCourier", { n: state.launches }));
      var rect = launchBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      refreshPicker();
    }

    function onLose() {
      stopLoop();
      renderHud();
      renderRoute();
      draw();
      result.textContent = t("pbcLose", {
        d: state.deliveries,
        total: state.manifest.length,
        n: state.launches,
      });
    }

    function launch() {
      if (state.won || state.lost) {
        return;
      }
      if (!state.inLane) {
        result.textContent = t("pbcBusy");
        return;
      }
      pbcLaunch(state);
      renderHud();
      renderRoute();
      startLoop();
      canvas.focus();
    }

    function loadTable(def) {
      stopLoop();
      table = def;
      state = pbcFresh(table);
      trail = [];
      heldL = false;
      heldR = false;
      renderHud();
      renderRoute();
      refreshPicker();
      draw();
      result.textContent = t("pbcReady", {
        name: t(table.labelKey),
        stops: table.manifest.length,
        order: table.manifest.map(pbcBinName).join(" \u2192 "),
        balls: table.balls,
      });
    }

    var keys = {
      ArrowLeft: "flipL",
      a: "flipL",
      A: "flipL",
      z: "flipL",
      Z: "flipL",
      ArrowRight: "flipR",
      d: "flipR",
      D: "flipR",
      m: "flipR",
      M: "flipR",
    };

    canvas.addEventListener("keydown", function (event) {
      var k = event.key;
      wake();
      if (keys[k] === "flipL") {
        event.preventDefault();
        heldL = true;
        return;
      }
      if (keys[k] === "flipR") {
        event.preventDefault();
        heldR = true;
        return;
      }
      if (k === " " || k === "Enter") {
        event.preventDefault();
        launch();
        return;
      }
      if (k === "r" || k === "R") {
        event.preventDefault();
        loadTable(table);
        return;
      }
      if (k === "ArrowUp") {
        event.preventDefault();
        state.power = pbcClamp(state.power + 1, 0, 2);
        renderRoute();
        return;
      }
      if (k === "ArrowDown") {
        event.preventDefault();
        state.power = pbcClamp(state.power - 1, 0, 2);
        renderRoute();
      }
    });

    canvas.addEventListener("keyup", function (event) {
      var k = event.key;
      if (keys[k] === "flipL") {
        heldL = false;
      }
      if (keys[k] === "flipR") {
        heldR = false;
      }
    });

    function flipFromEvent(event) {
      var rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        return;
      }
      var px = (event.clientX - rect.left) * (PBC_W / rect.width);
      if (px < PBC_W / 2) {
        heldL = true;
        heldR = false;
      } else {
        heldR = true;
        heldL = false;
      }
    }

    canvas.addEventListener("pointerdown", function (event) {
      event.preventDefault();
      flipFromEvent(event);
      canvas.focus();
      wake();
    });

    canvas.addEventListener("pointermove", function (event) {
      if (event.buttons) {
        flipFromEvent(event);
      }
    });

    canvas.addEventListener("pointerup", function (event) {
      event.preventDefault();
      heldL = false;
      heldR = false;
    });

    launchBtn.addEventListener("click", launch);

    picker.addEventListener("change", function () {
      var index = campaign.indexOf(picker.value);
      if (index >= 0 && campaign.isUnlocked(picker.value)) {
        loadTable(pbcTables[index]);
      }
    });

    /* Leaving the drawer stops the clock and freezes the ball where it lies.
     * Deliveries, launches, balls and the open route all survive the pause -
     * a parcel already delivered is never discarded. */
    App.quietResetPinballCourier = function () {
      stopLoop();
      heldL = false;
      heldR = false;
      if (state.running) {
        state.vx = 0;
        state.vy = 0;
        state.stuck = 0;
        renderHud();
        renderRoute();
        draw();
      }
    };

    /* The loop only ever runs while the panel is open: nothing is armed here. */
    loadTable(pbcTables[startIdx]);
  }

  /* ---------------- bilingual pack ---------------- */
  App.addStrings({
    en: {
      "tabPinballCourier": "Pinball Courier",
      "pbcTbl1": "Night Shift",
      "pbcTbl2": "Rush Hour",
      "pbcTbl3": "Last Drop",
      "pbcTbl4": "Round Trip",
      "pbcTbl5": "Cross Town",
      "pbcTbl6": "First Light",
      "pbcTblSelectLabel": "Choose a table",
      "pbcBin1": "Ridge",
      "pbcBin2": "Curb",
      "pbcBin3": "Market",
      "pbcHudBalls": "Balls",
      "pbcHudStops": "Delivered",
      "pbcHudLaunch": "Launches",
      "pbcBallsCount": "{n} left",
      "pbcBtnLaunch": "Launch",
      "pbcFieldLabel": "Pinball table. The plunger sends the ball onto the sorter rail; the open route decides which delivery shaft it drops down.",
      "pbcRouteLabel": "Route, manifest and ball state",
      "pbcGateNow": "Route",
      "pbcGateOf": "of 3 open",
      "pbcGateUp": "Uphill gate",
      "pbcGateMid": "Middle gate",
      "pbcGateLow": "Low gate",
      "pbcIsOpen": "open",
      "pbcIsClosed": "closed",
      "pbcGateClosedList": "Closed",
      "pbcReturnLane": "Return rail",
      "pbcPowerLabel": "Plunger",
      "pbcManifestLabel": "Manifest",
      "pbcMarkDone": "done",
      "pbcMarkNext": "NEXT",
      "pbcMarkWait": "then",
      "pbcBallPos": "Ball",
      "pbcBallVel": "Velocity",
      "pbcBallSpeed": "speed",
      "pbcBallLane": "in the plunger lane",
      "pbcBallPlay": "in play",
      "pbcSpdHeld": "held",
      "pbcSpdSlow": "slow",
      "pbcSpdMed": "medium",
      "pbcSpdFast": "fast",
      "pbcEvReady": "Ball loaded - press Space to launch",
      "pbcEvLaunch": "Launch {n} at plunger {p}",
      "pbcEvDrain": "Drained. {n} balls left",
      "pbcEvRollback": "Launch {n} was too weak - the ball rolled back into the lane",
      "pbcEvSwitchF": "Route stepped forward - now {r} - {name}",
      "pbcEvSwitchB": "Route stepped back - now {r} - {name}",
      "pbcEvDeliver": "Stop {d} delivered: {name}",
      "pbcEvReject": "{got} refused - stop {pos} of {total} is {want}",
      "pbcWin": "All {n} launches counted, every parcel delivered - {s} stars, {r} refusals.",
      "pbcLose": "Out of balls - {d} of {total} stops delivered in {n} launches.",
      "pbcNextTable": "Next table unlocked.",
      "pbcAllDone": "Every route run.",
      "pbcBusy": "The ball is still in play - keep it alive or let it drain.",
      "pbcReady": "{name}: deliver {stops} stops in the order {order}. {balls} balls.",
      "pbcHint": "Left/Right or A/D or Z/M flip, Space launches, Up/Down sets the plunger, R restarts, and tapping the left or right half of the table flips too.",
      "logPinballCourier": "Ran Pinball Courier in {n} launches",
    },
    zh: {
      "tabPinballCourier": "弹珠快递",
      "pbcTbl1": "夜班台面",
      "pbcTbl2": "高峰台面",
      "pbcTbl3": "末班台面",
      "pbcTbl4": "往返台面",
      "pbcTbl5": "穿城台面",
      "pbcTbl6": "破晓台面",
      "pbcTblSelectLabel": "选择台面",
      "pbcBin1": "山脊",
      "pbcBin2": "路边",
      "pbcBin3": "市场",
      "pbcHudBalls": "球数",
      "pbcHudStops": "已送达",
      "pbcHudLaunch": "发射",
      "pbcBallsCount": "剩 {n}",
      "pbcBtnLaunch": "发射",
      "pbcFieldLabel": "弹珠台面：发射器把球送上分拣轨，开启的路线决定球落入哪条投递井。",
      "pbcRouteLabel": "路线、清单与弹珠状态",
      "pbcGateNow": "路线",
      "pbcGateOf": "共三条，开一",
      "pbcGateUp": "上坡闸门",
      "pbcGateMid": "中段闸门",
      "pbcGateLow": "低段闸门",
      "pbcIsOpen": "开启",
      "pbcIsClosed": "关闭",
      "pbcGateClosedList": "已关闭",
      "pbcReturnLane": "回球轨",
      "pbcPowerLabel": "发射力度",
      "pbcManifestLabel": "清单",
      "pbcMarkDone": "已送",
      "pbcMarkNext": "下一站",
      "pbcMarkWait": "之后",
      "pbcBallPos": "弹珠",
      "pbcBallVel": "速度",
      "pbcBallSpeed": "速率",
      "pbcBallLane": "在发射道",
      "pbcBallPlay": "在台面上",
      "pbcSpdHeld": "静止",
      "pbcSpdSlow": "慢",
      "pbcSpdMed": "中",
      "pbcSpdFast": "快",
      "pbcEvReady": "球已就位 - 按空格发射",
      "pbcEvLaunch": "第 {n} 次发射，力度 {p}",
      "pbcEvDrain": "球落袋，还剩 {n} 球",
      "pbcEvRollback": "第 {n} 次发射太弱 - 球滚回发射道",
      "pbcEvSwitchF": "路线前进一格 - {name}",
      "pbcEvSwitchB": "路线后退一格 - 第 {r} 条 - {name}",
      "pbcEvDeliver": "第 {d} 站已送达：{name}",
      "pbcEvReject": "{got} 被拒 - 第 {pos}/{total} 站应为 {want}",
      "pbcWin": "{n} 次发射完成全部投递 - {s} 星，{r} 次被拒。",
      "pbcLose": "球数耗尽 - {n} 次发射送达 {d}/{total} 站。",
      "pbcNextTable": "解锁下一台面。",
      "pbcAllDone": "全部路线完成。",
      "pbcBusy": "球还在台面上 - 先接住它或等它落袋。",
      "pbcReady": "{name}：按 {order} 的顺序送达 {stops} 站，共 {balls} 球。",
      "pbcHint": "左/右或 A/D 或 Z/M 控制挡板，空格发射，上/下调整力度，R 重新开始；点击台面左/右半区同样可以控制挡板。",
      "logPinballCourier": "用 {n} 次发射完成弹珠快递",
    },
  });

  /* ---------------- registration ---------------- */
  App.registerGame({
    name: "pinballCourier",
    tabKey: "tabPinballCourier",
    init: function (panelEl) {
      initPinballCourierGame(panelEl);
    },
    guide: {
      svg:
        '<svg viewBox="0 0 120 84" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="6" y="4" width="108" height="76" rx="7" fill="rgba(11,16,32,.92)" stroke="rgba(148,163,184,.5)"/>' +
        '<path d="M10 22 Q26 8 60 7 Q94 8 110 22" fill="none" stroke="rgba(148,163,184,.5)" stroke-width="1.6"/>' +
        '<path d="M10 30 L110 44" stroke="rgba(148,163,184,.7)" stroke-width="2"/>' +
        '<rect x="20" y="31" width="12" height="22" fill="none" stroke="#22d3ee"/>' +
        '<rect x="54" y="36" width="12" height="22" fill="none" stroke="rgba(251,191,36,.6)"/>' +
        '<rect x="86" y="41" width="12" height="22" fill="none" stroke="rgba(163,230,53,.5)"/>' +
        '<line x1="20" y1="31" x2="32" y2="33" stroke="#fb7185" stroke-width="2" stroke-dasharray="2 2"/>' +
        '<circle cx="60" cy="66" r="3.4" fill="#fff"/>' +
        '<line x1="42" y1="70" x2="52" y2="76" stroke="#e2e8f0" stroke-width="4" stroke-linecap="round"/>' +
        '<line x1="78" y1="70" x2="68" y2="76" stroke="#e2e8f0" stroke-width="4" stroke-linecap="round"/>' +
        '<text x="26" y="47" font-size="6" fill="#22d3ee" text-anchor="middle">1</text></svg>',
      en: [
        "Goal: deliver every parcel in the order the manifest names, using one ball at a time on a pinball table.",
        "Action: press Space to plunger the ball up the right lane; the arc drops it onto the sorter rail at the top.",
        "Rule: only one rail gate is open at a time, so the ball drops down that route's shaft and is scanned there - Ridge, Curb or Market.",
        "Choice: a route only changes when the live ball is flipped up through a switch field, and opening one gate closes the others - the uphill gate also shuts the return rail.",
        "Watch out: arriving at the wrong stop is refused and the reason is printed; draining costs a ball, so plan the order before you launch.",
        "Scoring: stars come from launches used, and par is measured by replaying a stored input program through the same step function.",
      ],
      zh:
        [
          "目标：用一次一颗弹珠，按清单顺序把每个包裹送达。",
          "操作：按空格把球从右侧发射道弹射出去，顶部弧线会把球放到上方的分拣轨上。",
          "规则：分拣轨上同时只开一道闸门，球只会顺该路线的投递井下落并被扫描 - 山脊、路边或市场。",
          "选择：只有把活球用挡板顶过切换区时路线才会改变，开一条就关另一条 - 上坡闸门还会关掉回球轨。",
          "小心：顺序错误会被拒绝并写明原因；落袋要扣一颗球，所以发射前先排好顺序。",
          "计分：星级看发射次数，标准杆由存储的脚本输入经同一步进函数复现实测得出。",
        ],
    },
  });

  App.initPinballCourierGame = initPinballCourierGame;
})(window.CapitalConvert = window.CapitalConvert || {});
