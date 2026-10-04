/* Tether Salvage - the cable-tow physics campaign in the shared game drawer.
 * One tug, one wreck on the end of a line, one dock that only accepts what it
 * can stop: cargo mass and cable tension rewrite how the tug handles, and
 * cutting the line is the one move that always saves the pilot. The whole
 * simulation lives in the pure exports, and every scene ships a stored input
 * line that is replayed through them, so a scene is only dealt when the tow is
 * provably finishable. Registered through the game registry, so it needs no
 * markup in the four HTML pages. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  var t = App.t;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  var createCampaign = App.createCampaign;
  var fillCampaignPicker = App.fillCampaignPicker;
  var starsFor = App.starsFor;

  /* Tuning: the yard is 320 square and every number is px or px/s. */
  var ttsW = 320, ttsH = 320, ttsPad = 10;
  var ttsThrust = 175, ttsTurn = 2.5, ttsDrag = 0.7, ttsBurn = 3.6;
  var ttsStiff = 62, ttsCableDamp = 4, ttsLoad = 0.46, ttsSwing = 8;
  var ttsLead = 0.6, ttsReelStep = 13, ttsReelMin = 24, ttsReelCool = 0.35;
  var ttsReelTension = 46, ttsTugR = 6, ttsTugMass = 2.4, ttsDockSpeed = 26;
  var ttsMaxSpeed = 155, ttsDt = 1 / 60, ttsBudget = 4600, ttsDrift = 2.6;

  /* Shapes: mass is what the tug must accelerate, bar is the length of a spar
   * (its ends swing wide), r is the collision radius. */
  var ttsShapes = {
    slab: { m: 3, r: 12, bar: 0, pend: 0, damp: 0, label: "ttsShapeSlab" },
    spar: { m: 1.7, r: 7, bar: 46, pend: 6.5, damp: 1.7, label: "ttsShapeSpar" },
    shell: { m: 0.85, r: 20, bar: 0, pend: 0, damp: 0, label: "ttsShapeShell" },
  };

  /* The recovery ladder. `program` is the stored winning line, one phase per
   * heading target with a burn and a stop condition. The rungs are written here
   * in id order and the proof pass at the foot of the table replays every one
   * of them, drops any line that fails to dock, and hangs the ladder on what
   * that replay measured: the maneuvering steps of the best line. */
  var ttsScenes = [
    {
      id: "s1", labelKey: "ttsS1", briefKey: "ttsB1",
      fuel: 44, cable: 58, snap: 340, need: 1,
      tug: { x: 52, y: 262, angle: -0.8 },
      dock: { x: 252, y: 60, r: 28 },
      cargos: [{ shape: "slab", x: 128, y: 206 }],
      program: [
        { go: "cargo", thr: 1, stop: "reach", max: 700 },
        { go: "stay", hook: 1, thr: 0.3, stop: "hooked", max: 220 },
        { go: "lead", thr: 0.8, reel: 4, stop: "docked", max: 1000 },
      ],
    },
    {
      id: "s2", labelKey: "ttsS2", briefKey: "ttsB2",
      fuel: 52, cable: 60, snap: 340, need: 1,
      tug: { x: 46, y: 268, angle: -0.6 },
      dock: { x: 266, y: 54, r: 27 },
      cargos: [{ shape: "slab", x: 96, y: 226 }],
      rocks: { seed: 7, count: 3, gap: 47, size: 17 },
      program: [
        { go: "cargo", thr: 1, stop: "reach", max: 700 },
        { go: "stay", hook: 1, thr: 0.3, stop: "hooked", max: 220 },
        { go: "lead", thr: 0.75, reel: 4, stop: "docked", max: 1200 },
      ],
    },
    {
      id: "s3", labelKey: "ttsS3", briefKey: "ttsB3",
      fuel: 46, cable: 54, snap: 340, need: 1,
      tug: { x: 262, y: 268, angle: 3.6 },
      dock: { x: 160, y: 160, r: 30 },
      cargos: [{ shape: "slab", x: 84, y: 84 }],
      program: [
        { go: "cargo", thr: 1, stop: "reach", max: 700 },
        { go: "stay", hook: 1, thr: 0.3, stop: "hooked", max: 220 },
        { go: "lead", thr: 0.9, reel: 4, stop: "docked", max: 1100 },
      ],
    },
    {
      id: "s4", labelKey: "ttsS4", briefKey: "ttsB4",
      fuel: 62, cable: 58, snap: 340, need: 1,
      tug: { x: 44, y: 60, angle: 0.6 },
      dock: { x: 272, y: 268, r: 28 },
      cargos: [{ shape: "slab", x: 108, y: 108 }],
      wells: [{ x: 168, y: 168, g: 38000, r: 15 }],
      program: [
        { go: "cargo", thr: 1, stop: "reach", max: 800 },
        { go: "stay", hook: 1, thr: 0.3, stop: "hooked", max: 220 },
        { go: "leg", thr: 0.85, stop: "near", max: 600 },
        { go: "lead", thr: 0.8, reel: 4, stop: "docked", max: 1300 },
      ],
    },
    {
      id: "s5", labelKey: "ttsS5", briefKey: "ttsB5",
      fuel: 70, cable: 62, snap: 330, need: 1,
      tug: { x: 40, y: 56, angle: 1.2 },
      dock: { x: 286, y: 164, r: 25 },
      cargos: [{ shape: "spar", x: 150, y: 164 }],
      blocks: [{ x: 96, y: 112, w: 160, h: 12 }, { x: 96, y: 204, w: 160, h: 12 }],
      hazards: [
        { x: 252, y: 130, r: 9 }, { x: 252, y: 198, r: 9 },
      ],
      wells: [], legs: [{ x: 58, y: 164 }],
      program: [
        { go: "leg", leg: 0, thr: 0.8, stop: "near", max: 420 },
        { go: "cargo", thr: 0.8, stop: "reach", max: 500 },
        { go: "stay", hook: 1, thr: 0.3, stop: "hooked", max: 220 },
        { go: "lead", thr: 0.55, reel: 4, stop: "docked", max: 1400 },
      ],
    },
    {
      id: "s6", labelKey: "ttsS6", briefKey: "ttsB6",
      fuel: 100, cable: 44, snap: 340, need: 2,
      tug: { x: 36, y: 150, angle: 0 },
      dock: { x: 252, y: 62, r: 27 },
      cargos: [{ shape: "shell", x: 118, y: 74 }, { shape: "slab", x: 118, y: 240 }],
      hazards: [
        { x: 60, y: 60, r: 14 }, { x: 60, y: 252, r: 13 }, { x: 196, y: 40, r: 13 },
      ],
      program: [
        { go: "cargo", thr: 1, stop: "reach", max: 700 },
        { go: "stay", hook: 1, thr: 0.3, stop: "hooked", max: 220 },
        { go: "lead", thr: 0.62, reel: 3, stop: "docked", max: 1700 },
        { go: "cargo", thr: 1, stop: "reach", max: 700 },
        { go: "stay", hook: 1, thr: 0.3, stop: "hooked", max: 220 },
        { go: "lead", thr: 0.62, reel: 3, stop: "docked", max: 2000 },
      ],
    },
    {
      id: "s7", labelKey: "ttsS7", briefKey: "ttsB7",
      fuel: 70, cable: 60, snap: 340, need: 1,
      tug: { x: 44, y: 282, angle: -0.75 },
      dock: { x: 272, y: 46, r: 26 },
      cargos: [{ shape: "slab", x: 100, y: 228 }],
      rocks: { seed: 23, count: 4, gap: 52, size: 15 },
      program: [
        { go: "cargo", thr: 1, stop: "reach", max: 700 },
        { go: "stay", hook: 1, thr: 0.3, stop: "hooked", max: 240 },
        { go: "lead", thr: 0.65, reel: 4, stop: "docked", max: 2400 },
      ],
    },
    {
      id: "s8", labelKey: "ttsS8", briefKey: "ttsB8",
      fuel: 40, cable: 66, snap: 340, need: 1,
      tug: { x: 36, y: 48, angle: 0.6 },
      dock: { x: 280, y: 268, r: 27 },
      cargos: [{ shape: "shell", x: 100, y: 92 }],
      wells: [{ x: 176, y: 158, g: 42000, r: 15 }],
      legs: [{ x: 240, y: 142 }, { x: 256, y: 212 }],
      program: [
        { go: "cargo", thr: 1, stop: "reach", max: 700 },
        { go: "stay", hook: 1, thr: 0.3, stop: "hooked", max: 240 },
        { go: "leg", leg: 0, thr: 0.7, stop: "near", max: 400 },
        { go: "leg", leg: 1, thr: 0.7, stop: "near", max: 400 },
        { go: "lead", thr: 0.28, reel: 4, stop: "docked", max: 2600 },
      ],
    },
    {
      id: "s9", labelKey: "ttsS9", briefKey: "ttsB9",
      fuel: 32, cable: 72, snap: 330, need: 1,
      tug: { x: 42, y: 44, angle: 0.9 },
      dock: { x: 288, y: 208, r: 25 },
      cargos: [{ shape: "spar", x: 152, y: 152 }],
      blocks: [{ x: 88, y: 100, w: 158, h: 12 }, { x: 88, y: 204, w: 158, h: 12 }],
      hazards: [
        { x: 258, y: 172, r: 8 }, { x: 258, y: 246, r: 8 }, { x: 120, y: 258, r: 10 },
      ],
      legs: [{ x: 60, y: 152 }],
      program: [
        { go: "leg", leg: 0, thr: 0.8, stop: "near", max: 420 },
        { go: "cargo", thr: 0.8, stop: "reach", max: 520 },
        { go: "stay", hook: 1, thr: 0.3, stop: "hooked", max: 240 },
        { go: "lead", thr: 0.24, reel: 6, stop: "docked", max: 2600 },
      ],
    },
    {
      id: "s10", labelKey: "ttsS10", briefKey: "ttsB10",
      fuel: 93, cable: 42, snap: 340, need: 2,
      tug: { x: 34, y: 286, angle: -1.1 },
      dock: { x: 226, y: 66, r: 27 },
      cargos: [{ shape: "shell", x: 150, y: 146 }, { shape: "slab", x: 262, y: 158 }],
      hazards: [
        { x: 120, y: 232, r: 11 }, { x: 296, y: 92, r: 10 },
      ],
      program: [
        { go: "cargo", thr: 1, stop: "reach", max: 700 },
        { go: "stay", hook: 1, thr: 0.3, stop: "hooked", max: 240 },
        { go: "lead", thr: 0.85, reel: 3, stop: "docked", max: 1000 },
        { go: "cargo", thr: 1, stop: "reach", max: 700 },
        { go: "stay", hook: 1, thr: 0.3, stop: "hooked", max: 240 },
        { go: "lead", thr: 0.85, reel: 3, stop: "docked", max: 1300 },
      ],
    },
    {
      id: "s11", labelKey: "ttsS11", briefKey: "ttsB11",
      fuel: 97, cable: 48, snap: 330, need: 2,
      tug: { x: 40, y: 48, angle: 0.7 },
      dock: { x: 268, y: 258, r: 26 },
      cargos: [{ shape: "shell", x: 104, y: 116 }, { shape: "spar", x: 204, y: 150 }],
      wells: [{ x: 168, y: 204, g: 36000, r: 14 }],
      hazards: [
        { x: 248, y: 116, r: 12 }, { x: 84, y: 252, r: 11 },
      ],
      program: [
        { go: "cargo", thr: 1, stop: "reach", max: 700 },
        { go: "stay", hook: 1, thr: 0.3, stop: "hooked", max: 240 },
        { go: "lead", thr: 0.6, reel: 3, stop: "docked", max: 1500 },
        { go: "cargo", thr: 0.9, stop: "reach", max: 900 },
        { go: "stay", hook: 1, thr: 0.3, stop: "hooked", max: 240 },
        { go: "lead", thr: 0.6, reel: 3, stop: "docked", max: 2000 },
      ],
    },
    {
      id: "s12", labelKey: "ttsS12", briefKey: "ttsB12",
      fuel: 150, cable: 50, snap: 340, need: 3,
      tug: { x: 30, y: 162, angle: 0 },
      dock: { x: 250, y: 56, r: 26 },
      cargos: [
        { shape: "slab", x: 112, y: 104 },
        { shape: "shell", x: 112, y: 224 },
        { shape: "spar", x: 206, y: 172 },
      ],
      hazards: [
        { x: 52, y: 62, r: 11 }, { x: 52, y: 250, r: 11 }, { x: 170, y: 150, r: 10 },
      ],
      program: [
        { go: "cargo", thr: 1, stop: "reach", max: 700 },
        { go: "stay", hook: 1, thr: 0.3, stop: "hooked", max: 240 },
        { go: "lead", thr: 0.8, reel: 3, stop: "docked", max: 1400 },
        { go: "cargo", thr: 1, stop: "reach", max: 700 },
        { go: "stay", hook: 1, thr: 0.3, stop: "hooked", max: 240 },
        { go: "lead", thr: 0.8, reel: 3, stop: "docked", max: 1600 },
        { go: "cargo", thr: 0.9, stop: "reach", max: 800 },
        { go: "stay", hook: 1, thr: 0.3, stop: "hooked", max: 240 },
        { go: "lead", thr: 0.8, reel: 3, stop: "docked", max: 1800 },
      ],
    },
  ];

  /* --- NaN-proof helpers ------------------------------------------------ */
  function ttsNum(v, fallback) {
    var n = typeof v === "number" ? v : Number(v);
    return isFinite(n) ? n : fallback;
  }

  function ttsClamp(v, lo, hi) {
    var n = ttsNum(v, lo);
    return n < lo ? lo : n > hi ? hi : n;
  }

  function ttsWrap(a) {
    var v = ttsNum(a, 0);
    while (v > Math.PI) {
      v -= Math.PI * 2;
    }
    while (v < -Math.PI) {
      v += Math.PI * 2;
    }
    return v;
  }

  function ttsDist(a, b) {
    var dx = ttsNum(a.x, 0) - ttsNum(b.x, 0);
    var dy = ttsNum(a.y, 0) - ttsNum(b.y, 0);
    return Math.sqrt(dx * dx + dy * dy);
  }

  function ttsSpeed(b) {
    var vx = ttsNum(b.vx, 0);
    var vy = ttsNum(b.vy, 0);
    return Math.sqrt(vx * vx + vy * vy);
  }

  /* Clamping each axis on its own still lets a diagonal run at sqrt(2) times
   * the cap, and a snapping cable kicks a wreck hard enough to find that. The
   * cap has to bite on the magnitude, or a tick can carry a body past the rock
   * the wall test would have caught. */
  function ttsCapSpeed(b) {
    var sp = ttsSpeed(b);
    if (sp > ttsMaxSpeed) {
      var k = ttsMaxSpeed / sp;
      b.vx *= k;
      b.vy *= k;
    }
  }

  function ttsFlagged(st, flag) {
    var n = 0;
    for (var i = 0; i < st.cargos.length; i += 1) {
      if (st.cargos[i][flag]) {
        n += 1;
      }
    }
    return n;
  }

  function ttsDocked(st) {
    return ttsFlagged(st, "docked");
  }

  function ttsTowed(st) {
    var te = st.tether;
    if (!te.on || te.idx < 0) {
      return null;
    }
    var c = st.cargos[te.idx];
    return c && !c.docked && !c.lost ? c : null;
  }

  /* Tiny LCG: rock jitter and the drift of a cut wreck. Never Math.random, so
   * a dealt scene and its stored line stay reproducible. */
  function ttsRng(seed) {
    var s = (ttsNum(seed, 1) >>> 0) || 1;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  /* Two rocks per gate, one on each shoulder of the tow line: a straight haul
   * clears them, a wide swing on a long line does not. */
  function ttsDealRocks(scene) {
    scene.hazards = scene.hazards || [];
    scene.blocks = scene.blocks || [];
    scene.wells = scene.wells || [];
    if (!scene.rocks || scene.hazards.length) {
      return;
    }
    var pick = ttsRng(scene.rocks.seed);
    var from = scene.cargos[0];
    var ux = scene.dock.x - from.x;
    var uy = scene.dock.y - from.y;
    var span = Math.sqrt(ux * ux + uy * uy) || 1;
    ux /= span;
    uy /= span;
    for (var i = 0; i < scene.rocks.count; i += 1) {
      var along = span * (0.3 + 0.55 * (i / scene.rocks.count)) + (pick() - 0.5) * 12;
      var gap = scene.rocks.gap + (pick() - 0.5) * 10;
      var size = scene.rocks.size + pick() * 5;
      for (var side = -1; side <= 1; side += 2) {
        scene.hazards.push({
          x: Math.round(from.x + ux * along - uy * side * gap),
          y: Math.round(from.y + uy * along + ux * side * gap),
          r: Math.round(size),
        });
      }
    }
  }

  ttsScenes.forEach(ttsDealRocks);

  function ttsMakeState(scene) {
    var list = scene.cargos || [];
    var cargos = [];
    for (var i = 0; i < list.length; i += 1) {
      var shape = ttsShapes[list[i].shape] || ttsShapes.slab;
      cargos.push({
        i: i,
        shape: list[i].shape,
        m: shape.m,
        r: shape.r,
        bar: shape.bar,
        pend: shape.pend,
        damp: shape.damp,
        x: ttsClamp(list[i].x, ttsPad, ttsW - ttsPad),
        y: ttsClamp(list[i].y, ttsPad, ttsH - ttsPad),
        vx: ttsNum(list[i].vx, 0),
        vy: ttsNum(list[i].vy, 0),
        angle: ttsNum(list[i].angle, 0.4),
        omega: 0,
        docked: false,
        lost: false,
        adrift: false,
      });
    }
    return {
      scene: scene,
      tug: {
        x: ttsClamp(scene.tug.x, ttsPad, ttsW - ttsPad),
        y: ttsClamp(scene.tug.y, ttsPad, ttsH - ttsPad),
        vx: 0,
        vy: 0,
        angle: ttsWrap(scene.tug.angle),
      },
      cargos: cargos,
      tether: {
        on: false, idx: -1, lead: 0,
        len: ttsNum(scene.cable, 55),
        snap: ttsNum(scene.snap, 340),
        broken: false, cool: 0, red: 0, reel: 0, tension: 0,
      },
      fuel: ttsNum(scene.fuel, 44),
      status: "fly",
      ticks: 0,
      rng: ttsRng(11 + cargos.length),
    };
  }

  /* The wreck a hook would take: the nearest one still towable. */
  function ttsHookTarget(st) {
    var best = null;
    for (var i = 0; i < st.cargos.length; i += 1) {
      var c = st.cargos[i];
      if (!c.docked && !c.lost && (!best || ttsDist(st.tug, c) < ttsDist(st.tug, best))) {
        best = c;
      }
    }
    return best;
  }

  function ttsInReach(st, c) {
    return ttsDist(st.tug, c) - c.r <= st.tether.len;
  }

  /* Cable tension: the number the HUD prints, the force the bodies feel and
   * the quantity the snap test reads. A zero-length line divides nothing. */
  function ttsTension(st) {
    var te = st && st.tether;
    var c = te && te.on ? ttsTowed(st) : null;
    if (!c) {
      return 0;
    }
    var dx = st.tug.x - c.x;
    var dy = st.tug.y - c.y;
    var d = Math.sqrt(dx * dx + dy * dy);
    if (!(d > 0.001)) {
      return 0;
    }
    var stretch = d - c.r - te.len;
    var f = ttsSwing * c.m * Math.abs(c.omega) * (1 + c.bar / 44);
    if (stretch > 0) {
      var rv = ((st.tug.vx - c.vx) * dx + (st.tug.vy - c.vy) * dy) / d;
      f += ttsStiff * stretch + ttsCableDamp * (rv > 0 ? rv : 0);
    }
    if (te.reel > 0) {
      f += ttsReelTension;
    }
    return ttsClamp(f, 0, 999);
  }

  /* The yard wall: every body bounces and stays inside the plate. */
  function ttsBounce(b, r) {
    var lo = ttsPad + r;
    var east = ttsW - lo;
    var south = ttsH - lo;
    if (b.x < lo) {
      b.x = lo;
      b.vx = Math.abs(b.vx) * 0.4;
    } else if (b.x > east) {
      b.x = east;
      b.vx = -Math.abs(b.vx) * 0.4;
    }
    if (b.y < lo) {
      b.y = lo;
      b.vy = Math.abs(b.vy) * 0.4;
    } else if (b.y > south) {
      b.y = south;
      b.vy = -Math.abs(b.vy) * 0.4;
    }
  }

  /* Solid girder: push out along the shallowest axis, then bleed speed. */
  function ttsBlockHit(b, r, bl) {
    var cx = ttsClamp(b.x, bl.x, bl.x + bl.w);
    var cy = ttsClamp(b.y, bl.y, bl.y + bl.h);
    var dx = b.x - cx;
    var dy = b.y - cy;
    if (dx * dx + dy * dy > r * r) {
      return false;
    }
    var left = Math.abs(b.x - bl.x);
    var right = Math.abs(bl.x + bl.w - b.x);
    var up = Math.abs(b.y - bl.y);
    var down = Math.abs(bl.y + bl.h - b.y);
    var shallow = Math.min(left, right, up, down);
    if (shallow === left) {
      b.x = bl.x - r;
      b.vx = -Math.abs(b.vx) * 0.4;
    } else if (shallow === right) {
      b.x = bl.x + bl.w + r;
      b.vx = Math.abs(b.vx) * 0.4;
    } else if (shallow === up) {
      b.y = bl.y - r;
      b.vy = -Math.abs(b.vy) * 0.4;
    } else {
      b.y = bl.y + bl.h + r;
      b.vy = Math.abs(b.vy) * 0.4;
    }
    return true;
  }

  function ttsHazardAt(st, x, y, r) {
    var list = st.scene.hazards || [];
    for (var i = 0; i < list.length; i += 1) {
      var h = list[i];
      var dx = x - h.x;
      var dy = y - h.y;
      var rr = ttsNum(h.r, 12) + r;
      if (dx * dx + dy * dy < rr * rr) {
        return true;
      }
    }
    return false;
  }

  function ttsWellAcc(st, x, y, out) {
    var list = st.scene.wells || [];
    out.x = 0;
    out.y = 0;
    for (var i = 0; i < list.length; i += 1) {
      var w = list[i];
      var dx = w.x - x;
      var dy = w.y - y;
      var d = Math.sqrt(dx * dx + dy * dy) || 1;
      /* Inverse square, floored at the core radius so a body at the centre
       * cannot divide by zero or get a slingshot kick. */
      var g = ttsNum(w.g, 0) / Math.max(d * d, 1600);
      out.x += (dx / d) * g;
      out.y += (dy / d) * g;
    }
  }

  function ttsEnds(c) {
    if (!(c.bar > 0)) {
      return [];
    }
    var half = c.bar / 2;
    return [
      { x: c.x + Math.cos(c.angle) * half, y: c.y + Math.sin(c.angle) * half },
      { x: c.x - Math.cos(c.angle) * half, y: c.y - Math.sin(c.angle) * half },
    ];
  }

  /* One deterministic tick: commands, handling, cable, collisions, outcome. */
  function ttsStep(st, input, dt) {
    if (!st || !st.scene || st.status !== "fly") {
      return st;
    }
    var h = ttsClamp(dt, 0, 0.032);
    if (!(h > 0)) {
      return st;
    }
    var inp = input || {};
    var tug = st.tug;
    var te = st.tether;
    var sc = st.scene;
    var i;
    var held = te.idx >= 0 ? st.cargos[te.idx] : null;
    if (held && (held.docked || held.lost)) {
      te.on = false;
      te.idx = -1;
      te.lead = 0;
    }
    var car = ttsTowed(st);

    if (inp.hook && !te.on && !te.broken && te.lead <= 0) {
      var want = ttsHookTarget(st);
      if (want && ttsInReach(st, want)) {
        te.idx = want.i;
        te.lead = ttsLead;
      }
    }
    if (te.lead > 0) {
      var target = te.idx >= 0 ? st.cargos[te.idx] : null;
      if (!target || target.docked || target.lost || !ttsInReach(st, target)) {
        te.lead = 0;
        te.idx = -1;
      } else {
        te.lead = Math.max(0, te.lead - h);
        te.on = te.lead === 0;
      }
    }
    if (inp.cut && te.on && car) {
      te.on = false;
      te.idx = -1;
      te.lead = 0;
      car.adrift = true;
      car = null;
    }
    if (inp.reel && te.on && car && te.cool <= 0 && te.len > ttsReelMin) {
      var back = Math.min(ttsReelStep, te.len - ttsReelMin);
      var hx = tug.x - car.x;
      var hy = tug.y - car.y;
      var hd = Math.sqrt(hx * hx + hy * hy) || 1;
      /* The line only hauls in the slack it just took up, no more. */
      var take = Math.min(back, Math.max(0, hd - car.r - te.len));
      te.len -= back;
      te.cool = ttsReelCool;
      te.reel = 0.45;
      car.x += (hx / hd) * take;
      car.y += (hy / hd) * take;
    }
    te.cool = Math.max(0, te.cool - h);
    te.reel = Math.max(0, te.reel - h);

    /* A loaded tug answers late: less rudder, and thrust moves both bodies. */
    car = ttsTowed(st);
    var load = car ? car.m : 0;
    var rudder = ttsTurn * (te.on ? 0.62 : 1) / (1 + 0.06 * load);
    tug.angle = ttsWrap(tug.angle + ttsClamp(inp.rot, -1, 1) * rudder * h);
    var thrust = ttsClamp(inp.thr, -1, 1);
    var accel = (ttsThrust / (1 + ttsLoad * load)) * thrust;
    var nose = thrust < 0 ? Math.PI : 0;
    var field = { x: 0, y: 0 };
    ttsWellAcc(st, tug.x, tug.y, field);
    tug.vx += (Math.cos(tug.angle + nose) * accel + field.x) * h;
    tug.vy += (Math.sin(tug.angle + nose) * accel + field.y) * h;

    te.tension = ttsTension(st);
    var force = Math.min(te.tension, te.snap * 1.1);
    if (te.on && car) {
      var fdx = tug.x - car.x;
      var fdy = tug.y - car.y;
      var fd = Math.sqrt(fdx * fdx + fdy * fdy);
      if (fd > 0.001) {
        var fx = (fdx / fd) * force;
        var fy = (fdy / fd) * force;
        car.vx += (fx / car.m) * h;
        car.vy += (fy / car.m) * h;
        tug.vx -= (fx / ttsTugMass) * h;
        tug.vy -= (fy / ttsTugMass) * h;
        te.red = te.tension >= te.snap ? te.red + h : Math.max(0, te.red - h * 1.5);
        if (te.red > 0.4) {
          te.on = false;
          te.broken = true;
          te.idx = -1;
          te.tension = 0;
          car.adrift = true;
          car.vx += (fx * 3) / car.m;
          car.vy += (fy * 3) / car.m;
          car.omega = ttsClamp(car.omega + (st.rng() - 0.5) * 3, -6, 6);
        }
      }
    }

    var damp = 1 / (1 + ttsDrag * h);
    tug.vx = ttsClamp(tug.vx * damp, -ttsMaxSpeed, ttsMaxSpeed);
    tug.vy = ttsClamp(tug.vy * damp, -ttsMaxSpeed, ttsMaxSpeed);
    ttsCapSpeed(tug);
    tug.x += tug.vx * h;
    tug.y += tug.vy * h;
    for (i = 0; i < st.cargos.length; i += 1) {
      var c = st.cargos[i];
      if (c.docked || c.lost) {
        continue;
      }
      ttsWellAcc(st, c.x, c.y, field);
      c.vx = (c.vx + field.x * h) * damp;
      c.vy = (c.vy + field.y * h) * damp;
      if (c.adrift && !te.on) {
        c.vx += (st.rng() - 0.5) * ttsDrift * h;
        c.vy += (st.rng() - 0.5) * ttsDrift * h;
      }
      c.vx = ttsClamp(c.vx, -ttsMaxSpeed, ttsMaxSpeed);
      c.vy = ttsClamp(c.vy, -ttsMaxSpeed, ttsMaxSpeed);
      ttsCapSpeed(c);
      c.x += c.vx * h;
      c.y += c.vy * h;
      if (c.bar > 0) {
        /* A spar swings: the cable drags its nose around and the tail follows. */
        var aim = te.idx === c.i
          ? Math.atan2(tug.y - c.y, tug.x - c.x)
          : Math.atan2(c.vy, c.vx + 0.0001);
        c.omega = ttsClamp(
          c.omega + (ttsWrap(aim - c.angle) * c.pend - c.omega * (c.damp + 1)) * h, -6, 6);
        c.angle = ttsWrap(c.angle + c.omega * h);
      }
    }

    var blocks = sc.blocks || [];
    ttsBounce(tug, ttsTugR);
    for (i = 0; i < blocks.length; i += 1) {
      ttsBlockHit(tug, ttsTugR, blocks[i]);
    }
    if (ttsHazardAt(st, tug.x, tug.y, ttsTugR)) {
      st.status = "wrecked";
      st.ticks += 1;
      return st;
    }
    for (i = 0; i < st.cargos.length; i += 1) {
      var b = st.cargos[i];
      if (b.docked || b.lost) {
        continue;
      }
      for (var q = 0; q < blocks.length; q += 1) {
        ttsBlockHit(b, b.r, blocks[q]);
      }
      ttsBounce(b, b.r);
      var ends = ttsEnds(b);
      var doomed = ttsHazardAt(st, b.x, b.y, b.r);
      for (var e = 0; !doomed && e < ends.length; e += 1) {
        doomed = ttsHazardAt(st, ends[e].x, ends[e].y, 4);
      }
      if (doomed) {
        b.lost = true;
        if (te.idx === b.i) {
          te.on = false;
          te.idx = -1;
          te.lead = 0;
        }
        continue;
      }
      var span = ttsDist(tug, b);
      var overlap = span - b.r - ttsTugR;
      if (overlap < 0) {
        /* The tug is the light body, so it is the one that gets
         * pushed off the wreck; the load keeps its own momentum. */
        var px = (tug.x - b.x) / (span || 1);
        var py = (tug.y - b.y) / (span || 1);
        tug.x -= px * overlap;
        tug.y -= py * overlap;
      }
    }

    var dock = sc.dock;
    for (i = 0; i < st.cargos.length; i += 1) {
      var d = st.cargos[i];
      if (!d.docked && !d.lost && ttsDist(d, dock) <= ttsNum(dock.r, 26) && ttsSpeed(d) <= ttsDockSpeed) {
        d.docked = true;
        d.adrift = false;
        d.vx = 0;
        d.vy = 0;
        d.omega = 0;
        if (te.idx === d.i) {
          te.on = false;
          te.idx = -1;
          te.lead = 0;
        }
      }
    }
    st.fuel = Math.max(0, st.fuel - ttsBurn * Math.abs(thrust) * h);
    var got = ttsDocked(st);
    var need = ttsNum(sc.need, 1);
    if (got >= need) {
      st.status = "docked";
    } else if (te.broken) {
      st.status = "snapped";
    } else if (st.cargos.length - ttsFlagged(st, "lost") < need) {
      st.status = "adrift";
    } else if (st.fuel <= 0) {
      st.status = "dry";
    }
    st.ticks += 1;
    return st;
  }

  /* --- the stored line, and the pilot that replays it ------------------- */
  function ttsWaypoint(st, phase, run) {
    var dock = st.scene.dock;
    var car = ttsHookTarget(st);
    var tug = st.tug;
    var go = phase.go;
    var x = tug.x;
    var y = tug.y;
    var stop = 0;
    var haul = false;
    if (go === "stay" && run.anchor) {
      x = run.anchor.x;
      y = run.anchor.y;
    } else if (go === "leg") {
      var leg = (st.scene.legs || [])[ttsNum(phase.leg, 0)] || dock;
      x = leg.x;
      y = leg.y;
    } else if (car && go === "cargo") {
      /* Come alongside, never on top, on the bearing the tug arrived on. */
      var ax = (run.anchor ? run.anchor.x : tug.x) - car.x;
      var ay = (run.anchor ? run.anchor.y : tug.y) - car.y;
      var al = Math.sqrt(ax * ax + ay * ay) || 1;
      var hold = st.tether.len * 0.55;
      x = car.x + (ax / al) * hold;
      y = car.y + (ay / al) * hold;
      stop = 16;
    } else if (car) {
      /* "lead": berth just beyond the dock on the load's bearing. The wreck
       * settles contact - berth back from the centre, so reeling the line in
       * short is what actually drags it inside the ring. The bearing is latched
       * when the phase opens: chasing a direction that swings with the load
       * would put the tug in orbit instead of the wreck in the dock. */
      haul = true;
      var loose = st.tether.len + car.r + 12;
      if (!run.berth || run.berth.i !== car.i || run.used === 0 || ttsDist(car, dock) > loose) {
        var dx = dock.x - car.x;
        var dy = dock.y - car.y;
        var dd = Math.sqrt(dx * dx + dy * dy) || 0.001;
        var span = Math.max(4, st.tether.len + car.r - ttsNum(dock.r, 26) * 0.55);
        run.berth = {
          i: car.i,
          x: ttsClamp(dock.x + (dx / dd) * span, ttsPad + ttsTugR, ttsW - ttsPad - ttsTugR),
          y: ttsClamp(dock.y + (dy / dd) * span, ttsPad + ttsTugR, ttsH - ttsPad - ttsTugR),
        };
      }
      x = run.berth.x;
      y = run.berth.y;
    }
    var err = ttsWrap(Math.atan2(y - tug.y, x - tug.x) - tug.angle);
    return {
      x: x,
      y: y,
      stop: stop,
      haul: haul,
      brake: !haul && go !== "stay" && Math.abs(err) < 1.1 && ttsDist(tug, { x: x, y: y }) < ttsSpeed(tug) / ttsDrag,
    };
  }

  function ttsPilot(st, phase, run, jitter) {
    var want = ttsWaypoint(st, phase, run);
    var tug = st.tug;
    var dx = want.x - tug.x;
    var dy = want.y - tug.y;
    var d = Math.sqrt(dx * dx + dy * dy) || 0.001;
    var err = ttsWrap(Math.atan2(dy, dx) - tug.angle + ttsNum(jitter, 0));
    var rot = ttsClamp(err * 2.6, -1, 1);
    var thr = Math.abs(err) < 0.5 ? ttsClamp(phase.thr, 0, 1) : 0.1;
    if (want.brake) {
      var back = ttsWrap(Math.atan2(-tug.vy, -tug.vx) - tug.angle);
      rot = ttsClamp(back * 2.6, -1, 1);
      thr = Math.abs(back) < 0.6 ? 0.85 : 0.15;
    }
    if (want.stop && d < want.stop) {
      thr = 0;
      rot = 0;
    }
    /* The line's own governor: ease off before the cable goes red. */
    var band = st.tether.snap;
    var load2 = ttsTowed(st) ? st.tether.tension : 0;
    if (!want.brake && load2 > band * (want.haul ? 0.6 : 0.5) && thr > 0.35) {
      thr = 0.35;
    } else if (!want.brake && !want.haul && load2 > band * 0.28 && thr > 0.7) {
      thr = 0.7;
    }
    return { thr: thr, rot: rot, hook: phase.hook ? 1 : 0, reel: 0, cut: 0 };
  }

  function ttsStopHit(st, phase, run) {
    var car = ttsHookTarget(st);
    if (phase.stop === "docked") {
      return st.status !== "fly";
    }
    if (phase.stop === "hooked") {
      return st.tether.on;
    }
    if (phase.stop === "reach") {
      return !!car && ttsInReach(st, car);
    }
    if (phase.stop === "near") {
      var leg = (st.scene.legs || [])[ttsNum(phase.leg, 0)] || st.scene.dock;
      return ttsDist(st.tug, leg) < 48 || (!!car && ttsDist(car, leg) < 60);
    }
  }

  /* Replays a scene's stored winning line through tetherStep. */
  function ttsReplay(scene, jitter, seed) {
    var st = ttsMakeState(scene);
    var phases = scene.program || [];
    var run = { i: 0, used: 0, reels: 0, anchor: null };
    var rng = ttsRng(seed || 1);
    var ticks = 0;
    while (st.status === "fly" && ticks < ttsBudget) {
      var phase = phases[run.i];
      if (!phase) {
        break;
      }
      if (run.used === 0) {
        run.anchor = { x: st.tug.x, y: st.tug.y };
      }
      var input = ttsPilot(st, phase, run, jitter ? (rng() - 0.5) * jitter : 0);
      if (phase.reel && run.used % 70 === 0 && run.reels < phase.reel) {
        input.reel = 1;
        run.reels += 1;
      }
      ttsStep(st, input, ttsDt);
      run.used += 1;
      ticks += 1;
      if (run.used > ttsNum(phase.max, 600) || ttsStopHit(st, phase, run)) {
        run.i += 1;
        run.used = 0;
        run.reels = 0;
      }
    }
    return {
      won: st.status === "docked",
      status: st.status,
      fuel: Math.round(ttsNum(st.fuel, 0) * 10) / 10,
      ticks: ticks,
      state: st,
    };
  }

  function ttsSceneSolvable(scene) {
    return ttsReplay(scene, 0, 1).won;
  }

  /* Star bands are measured, not invented: the stored line replayed clean,
   * then again with a jittered heading that burns more fuel for the same tow. */
  var ttsMeasured = {};
  var ttsBest = {};
  function ttsBestOf(scene) {
    if (!ttsBest[scene.id]) {
      ttsBest[scene.id] = ttsReplay(scene, 0, 1);
    }
    return ttsBest[scene.id];
  }

  function ttsMeasure(scene) {
    if (!ttsMeasured[scene.id]) {
      var best = ttsBestOf(scene);
      var slop = ttsReplay(scene, 0.16, 9);
      var hi = Math.max(2, Math.round(ttsNum(best.fuel, 2)));
      var lo = slop.won
        ? Math.max(1, Math.round(ttsNum(slop.fuel, 1)))
        : Math.max(1, Math.round(hi * 0.5));
      if (lo >= hi) {
        lo = Math.max(1, hi - 5);
      }
      var top = Math.max(lo + 1, hi - Math.max(2, Math.round(hi * 0.12)));
      ttsMeasured[scene.id] = {
        won: best.won,
        best: hi,
        steps: ttsNum(best.ticks, 0),
        slop: lo,
        bands: [top, Math.max(1, Math.min(lo, top - 1)), 1],
      };
    }
    return ttsMeasured[scene.id];
  }

  /* Ship only proven scenes, in the order the physics puts them. A rung joins
   * the ladder only when its stored line docks the cargo through the same
   * tetherStep the player drives, and the rungs are then ordered by what that
   * replay measured - the maneuvering steps of the best line, so the ladder
   * rises with no rung easier than the one before it. An unproven rung is
   * dropped rather than dealt, and every id travels with its own scene, so a
   * saved campaign still points at the same recovery. */
  var ttsProven = ttsScenes.filter(function (scene) {
    return ttsBestOf(scene).won;
  });
  ttsProven.sort(function (a, b) {
    return ttsBestOf(a).ticks - ttsBestOf(b).ticks;
  });
  ttsScenes = ttsProven;

  var ttsTagKeys = {
    docked: "ttsTagDocked",
    snapped: "ttsTagSnapped",
    wrecked: "ttsTagWrecked",
    adrift: "ttsTagAdrift",
    dry: "ttsTagDry",
  };

  App.tetherStep = ttsStep;
  App.tetherTension = ttsTension;
  App.tetherSceneSolvable = ttsSceneSolvable;
  App.tetherReplay = ttsReplay;
  App.tetherMeasure = ttsMeasure;
  App.tetherPilot = ttsPilot;
  App.tetherWaypoint = ttsWaypoint;
  App.tetherStopHit = ttsStopHit;
  App.tetherMakeState = ttsMakeState;
  App.tetherHookTarget = ttsHookTarget;
  App.tetherTowed = ttsTowed;
  App.tetherDocked = ttsDocked;
  App.tetherScenes = ttsScenes;
  App.tetherShapes = ttsShapes;
  App.tetherRng = ttsRng;
  App.tetherField = { w: ttsW, h: ttsH, pad: ttsPad };
  App.tetherConstants = {
    thrust: ttsThrust, drag: ttsDrag, stiff: ttsStiff, burn: ttsBurn,
    lead: ttsLead, reelStep: ttsReelStep, reelMin: ttsReelMin, dockSpeed: ttsDockSpeed,
  };

  var ttsStars = [];
  var sprinkle = ttsRng(4);
  for (var twinkle = 0; twinkle < 42; twinkle += 1) {
    ttsStars.push({ x: sprinkle() * ttsW, y: sprinkle() * ttsH, r: sprinkle() * 1.4 + 0.4 });
  }

  function initTetherSalvageGame(panelEl) {
    if (!panelEl) {
      return;
    }
    var campaign = createCampaign({ key: "tether-salvage-campaign", levels: ttsScenes });
    var scene = ttsScenes[0];
    var state = ttsMakeState(scene);
    var settled = false;
    var rafId = null;
    var running = false;
    var lastFrame = 0;
    var keys = {};
    var pending = {};
    var aim = null;

    /* --- markup, all createElement so the headless harness can drive it -- */
    var hud = document.createElement("div");
    hud.className = "game-hud";
    var fuelEl = document.createElement("strong");
    var tensionEl = document.createElement("strong");
    var massEl = document.createElement("strong");
    var cableEl = document.createElement("strong");
    var holdEl = document.createElement("strong");
    var readouts = [
      ["ttsFuelLabel", fuelEl], ["ttsTensionLabel", tensionEl],
      ["ttsMassLabel", massEl], ["ttsCableLabel", cableEl],
      ["ttsSalvageLabel", holdEl],
    ];
    readouts.forEach(function (pair) {
      var stat = document.createElement("div");
      stat.className = "game-stat";
      var statLabel = document.createElement("span");
      statLabel.setAttribute("data-i18n", pair[0]);
      statLabel.textContent = t(pair[0]);
      stat.appendChild(statLabel);
      stat.appendChild(pair[1]);
      hud.appendChild(stat);
    });

    var canvas = document.createElement("canvas");
    canvas.className = "tts-canvas";
    canvas.width = ttsW;
    canvas.height = ttsH;
    canvas.setAttribute("tabindex", "0");
    canvas.setAttribute("role", "application");
    canvas.setAttribute("aria-label", t("ttsFieldLabel"));

    var result = document.createElement("p");
    result.className = "game-result";
    result.setAttribute("role", "status");

    var row = document.createElement("div");
    row.className = "elements-row";
    var rowLabel = document.createElement("label");
    rowLabel.className = "elements-label";
    rowLabel.setAttribute("for", "ttsSceneSel");
    rowLabel.setAttribute("data-i18n", "ttsSceneSelectLabel");
    rowLabel.textContent = t("ttsSceneSelectLabel");
    var select = document.createElement("select");
    select.className = "elements-select";
    select.id = "ttsSceneSel";
    row.appendChild(rowLabel);
    row.appendChild(select);

    var actions = document.createElement("div");
    actions.className = "game-actions tts-tools";
    var newBtn = makeButton("primary", "btnNewRound");
    var hookBtn = makeButton("", "ttsBtnHook");
    var cutBtn = makeButton("", "ttsBtnCut");
    var reelBtn = makeButton("", "ttsBtnReel");
    var bestEl = document.createElement("p");
    bestEl.className = "game-best";
    [newBtn, hookBtn, cutBtn, reelBtn, bestEl].forEach(function (node) {
      actions.appendChild(node);
    });

    var hint = document.createElement("p");
    hint.className = "game-hint";
    hint.setAttribute("data-i18n", "ttsHint");
    hint.textContent = t("ttsHint");

    [hud, canvas, result, row, actions, hint].forEach(function (node) {
      panelEl.appendChild(node);
    });
    var ctx = canvas.getContext("2d");

    function makeButton(extra, key) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = extra;
      btn.setAttribute("aria-label", t(key));
      var content = document.createElement("span");
      content.className = "button-content";
      var label = document.createElement("span");
      label.setAttribute("data-i18n", key);
      label.textContent = t(key);
      content.appendChild(label);
      btn.appendChild(content);
      return btn;
    }

    /* --- readouts ------------------------------------------------------- */
    function readHud() {
      var te = state.tether;
      var car = ttsTowed(state) || ttsHookTarget(state);
      fuelEl.textContent = t("ttsFuelLeft", { n: Math.round(state.fuel) });
      tensionEl.textContent = t("ttsTensionRead", {
        n: Math.round(te.tension), max: Math.round(te.snap),
      });
      massEl.textContent = car
        ? t("ttsMassRead", { m: car.m.toFixed(1), s: t((ttsShapes[car.shape] || ttsShapes.slab).label) })
        : t("ttsMassNone");
      cableEl.textContent = t("ttsCableRead", { n: Math.round(te.len) });
      holdEl.textContent = t("ttsSalvageRead", {
        n: ttsDocked(state), max: ttsNum(scene.need, 1),
      });
      hookBtn.disabled = state.status !== "fly" || te.broken;
      cutBtn.disabled = !te.on;
      reelBtn.disabled = !te.on || te.len <= ttsReelMin;
    }

    function refreshPicker() {
      fillCampaignPicker(select, campaign, function (def) {
        return t(def.labelKey);
      }, t("elementsLocked"));
      select.value = scene.id;
      var stars = campaign.totalStars();
      bestEl.textContent = stars > 0
        ? t("campaignStars", { n: stars, max: campaign.maxStars() })
        : t("ttsNoStars");
    }

    function tag(status) {
      return t(ttsTagKeys[status] || "ttsTagDocked");
    }

    /* --- drawing -------------------------------------------------------- */
    function digits(text, x, y, color, size) {
      ctx.fillStyle = color;
      ctx.font = "bold " + (size || 10) + "px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, x, y);
    }

    function ring(x, y, r, color, dash, width) {
      ctx.setLineDash(dash || []);
      ctx.strokeStyle = color;
      ctx.lineWidth = width || 1;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    function draw() {
      var te = state.tether;
      var dock = scene.dock;
      var dockR = ttsNum(dock.r, 26);
      var i;
      ctx.clearRect(0, 0, ttsW, ttsH);
      ctx.fillStyle = "rgba(8, 12, 20, 0.86)";
      ctx.fillRect(0, 0, ttsW, ttsH);
      ctx.fillStyle = "rgba(148, 163, 184, 0.45)";
      for (i = 0; i < ttsStars.length; i += 1) {
        ctx.fillRect(ttsStars[i].x, ttsStars[i].y, ttsStars[i].r, ttsStars[i].r);
      }
      ctx.strokeStyle = "rgba(148, 163, 184, 0.25)";
      ctx.lineWidth = 1;
      ctx.strokeRect(ttsPad * 0.5, ttsPad * 0.5, ttsW - ttsPad, ttsH - ttsPad);

      for (i = 0; i < (scene.wells || []).length; i += 1) {
        var well = scene.wells[i];
        for (var band = 1; band <= 3; band += 1) {
          ring(well.x, well.y, 14 + band * 15, "rgba(167, 139, 250, 0.5)", [4, 5], 1);
        }
        ctx.fillStyle = "rgba(167, 139, 250, 0.85)";
        ctx.beginPath();
        ctx.arc(well.x, well.y, ttsNum(well.r, 12), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "rgba(148, 163, 184, 0.26)";
      ctx.strokeStyle = "rgba(148, 163, 184, 0.6)";
      var blocks = scene.blocks || [];
      for (i = 0; i < blocks.length; i += 1) {
        ctx.fillRect(blocks[i].x, blocks[i].y, blocks[i].w, blocks[i].h);
        ctx.strokeRect(blocks[i].x, blocks[i].y, blocks[i].w, blocks[i].h);
      }
      var rocks = scene.hazards || [];
      ctx.strokeStyle = "rgba(251, 113, 133, 0.9)";
      for (i = 0; i < rocks.length; i += 1) {
        var hk = rocks[i];
        var hr = ttsNum(hk.r, 12);
        ctx.beginPath();
        ctx.arc(hk.x, hk.y, hr, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(148, 163, 184, 0.2)";
        ctx.fill();
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(hk.x - hr * 0.6, hk.y - hr * 0.6);
        ctx.lineTo(hk.x + hr * 0.6, hk.y + hr * 0.6);
        ctx.moveTo(hk.x + hr * 0.6, hk.y - hr * 0.6);
        ctx.lineTo(hk.x - hr * 0.6, hk.y + hr * 0.6);
        ctx.stroke();
      }

      /* The dock: a dashed ring with the salvage tally as digits. The ring
       * breathes only while motion is allowed; the digits never move. */
      ring(dock.x, dock.y, dockR + (App.isMotionOff() ? 0 : Math.sin(state.ticks / 12) * 2),
        "rgba(0, 242, 255, 0.75)", [6, 4], 2);
      digits(t("ttsDockTag"), dock.x, dock.y - dockR - 8, "rgba(0, 242, 255, 0.95)", 9);
      digits(ttsDocked(state) + "/" + ttsNum(scene.need, 1), dock.x, dock.y + dockR + 9,
        "rgba(0, 242, 255, 0.95)");

      /* Cargo: the shape, plus its mass as a digit. */
      for (i = 0; i < state.cargos.length; i += 1) {
        var car = state.cargos[i];
        if (car.lost) {
          continue;
        }
        ctx.fillStyle = "rgba(251, 191, 36, 0.2)";
        ctx.strokeStyle = "rgba(251, 191, 36, 0.95)";
        ctx.lineWidth = 1.5;
        if (car.bar > 0) {
          ctx.save();
          ctx.translate(car.x, car.y);
          ctx.rotate(car.angle);
          ctx.fillRect(-car.bar / 2, -car.r, car.bar, car.r * 2);
          ctx.strokeRect(-car.bar / 2, -car.r, car.bar, car.r * 2);
          ctx.restore();
        } else {
          ctx.beginPath();
          if (car.shape === "slab") {
            ctx.rect(car.x - car.r, car.y - car.r, car.r * 2, car.r * 2);
          } else {
            ctx.arc(car.x, car.y, car.r, 0, Math.PI * 2);
          }
          ctx.fill();
          ctx.stroke();
        }
        digits(car.m.toFixed(1), car.x, car.y, "rgba(255, 255, 255, 0.95)");
        if (car.docked) {
          digits("ok", car.x + car.r + 9, car.y, "rgba(109, 226, 122, 0.95)");
        }
      }

      /* The line: dashes, plus the tension it is carrying as a number. */
      var towed = ttsTowed(state);
      if (towed) {
        ctx.setLineDash([5, 3]);
        ctx.strokeStyle = te.tension > te.snap * 0.7
          ? "rgba(255, 138, 128, 0.95)"
          : "rgba(0, 242, 255, 0.85)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(state.tug.x, state.tug.y);
        ctx.lineTo(towed.x, towed.y);
        ctx.stroke();
        ctx.setLineDash([]);
        digits(Math.round(te.tension) + "/" + Math.round(te.snap),
          (state.tug.x + towed.x) / 2, (state.tug.y + towed.y) / 2 - 9,
          "rgba(255, 255, 255, 0.95)");
      } else if (te.lead > 0 && !te.broken) {
        ring(state.tug.x, state.tug.y, Math.max(1, te.len), "rgba(0, 242, 255, 0.55)", [2, 4], 1.5);
        digits(String(Math.ceil(te.lead * 10)), state.tug.x, state.tug.y - 15,
          "rgba(0, 242, 255, 0.9)");
      }

      var tug = state.tug;
      ctx.save();
      ctx.translate(tug.x, tug.y);
      ctx.rotate(tug.angle);
      ctx.beginPath();
      ctx.moveTo(9, 0);
      ctx.lineTo(-6, 6);
      ctx.lineTo(-3, 0);
      ctx.lineTo(-6, -6);
      ctx.closePath();
      ctx.fillStyle = "rgba(109, 226, 122, 0.9)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
      if (aim) {
        ring(aim.x, aim.y, 8, "rgba(255, 107, 53, 0.9)", [3, 3], 1.5);
      }
      if (state.status !== "fly") {
        digits(tag(state.status), ttsW / 2, 24, "rgba(255, 255, 255, 0.95)", 12);
      }
    }

    /* --- loop ----------------------------------------------------------- */
    function control() {
      var rot = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
      var thr = (keys.up ? 1 : 0) - (keys.down ? 1 : 0);
      if (aim && !rot && !thr && state.status === "fly") {
        /* An arrive controller: a clicked heading is a promise to stop there,
         * which matters because a loaded tug coasts twice its speed in px. The
         * wanted accel is projected on the nose, so a negative reading means
         * the retro thruster, not a full turn about. */
        var gap = ttsDist(state.tug, aim);
        var ux = (aim.x - state.tug.x) / (gap || 1);
        var uy = (aim.y - state.tug.y) / (gap || 1);
        var pace = Math.min(90, gap * 2.2);
        var ax = (ux * pace - state.tug.vx) * 2.6;
        var ay = (uy * pace - state.tug.vy) * 2.6;
        var want = Math.atan2(ay, ax);
        rot = ttsClamp(ttsWrap(want - state.tug.angle) * 2.2, -1, 1);
        thr = ttsClamp((ax * Math.cos(state.tug.angle) + ay * Math.sin(state.tug.angle)) / ttsThrust, -1, 1);
        if (gap <= 10 && ttsSpeed(state.tug) < 12) {
          aim = null;
          thr = 0;
          rot = 0;
        }
      }
      var input = {
        thr: ttsClamp(thr, -1, 1),
        rot: ttsClamp(rot, -1, 1),
        hook: pending.hook || 0,
        cut: pending.cut || 0,
        reel: pending.reel || 0,
      };
      pending = {};
      return input;
    }

    function pump(dt) {
      if (state.status !== "fly") {
        return;
      }
      ttsStep(state, control(), dt);
      readHud();
      draw();
      if (state.status !== "fly") {
        settle();
      }
    }

    function frame(now) {
      rafId = null;
      if (!running) {
        return;
      }
      var dt = Math.min(0.032, (now - lastFrame) / 1000 || 0.016);
      lastFrame = ttsNum(now, lastFrame);
      /* A hidden panel skips the work but keeps its loop slot. */
      if (panelEl.hidden || document.hidden) {
        rafId = window.requestAnimationFrame(frame);
        return;
      }
      pump(dt);
      rafId = window.requestAnimationFrame(frame);
    }

    function wake() {
      if (running || state.status !== "fly") {
        return;
      }
      running = true;
      lastFrame = Date.now();
      rafId = window.requestAnimationFrame(frame);
    }

    function sleep() {
      running = false;
      if (rafId !== null && window.cancelAnimationFrame) {
        window.cancelAnimationFrame(rafId);
      }
      rafId = null;
    }

    /* A command lands on the next tick, even while the scene sits frozen. */
    function send(kind) {
      pending[kind] = 1;
      var was = running;
      wake();
      if (!was) {
        pump(ttsDt);
      }
    }

    /* --- round flow ----------------------------------------------------- */
    function settle() {
      if (settled) {
        return;
      }
      settled = true;
      sleep();
      var left = Math.round(state.fuel);
      if (state.status === "docked") {
        var stars = starsFor(left, ttsMeasure(scene).bands, "high");
        var outcome = campaign.record(scene.id, { stars: stars, best: left, better: "high" });
        var message = t("ttsWin", { n: left, s: stars });
        if (outcome.isBest) {
          message += " " + t("newBest");
        }
        if (outcome.unlockedNext) {
          message += " " + t("ttsNextScene");
        } else if (campaign.clearedCount() === ttsScenes.length) {
          message += " " + t("ttsCampaignDone");
        }
        result.textContent = message;
        logAction(t("logTetherSalvage", { n: t(scene.labelKey), f: left }));
        var rect = newBtn.getBoundingClientRect();
        createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
        petNotifyGame(outcome.isBest || outcome.firstClear);
      } else {
        result.textContent = tag(state.status) + " " + t("ttsFailTail", {
          n: ttsDocked(state), max: ttsNum(scene.need, 1),
        });
        petNotifyGame(false);
      }
      readHud();
      refreshPicker();
    }

    function loadScene(def) {
      scene = def || scene;
      state = ttsMakeState(scene);
      settled = false;
      keys = {};
      pending = {};
      aim = null;
      sleep();
      result.textContent = t("ttsPrompt", {
        name: t(scene.labelKey),
        brief: t(scene.briefKey),
        fuel: ttsMeasure(scene).best,
      });
      readHud();
      refreshPicker();
      draw();
    }

    /* --- input ---------------------------------------------------------- */
    function fieldFromEvent(event) {
      var rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        return null;
      }
      return {
        x: ttsClamp(((ttsNum(event.clientX, 0) - rect.left) * canvas.width) / rect.width, 0, ttsW),
        y: ttsClamp(((ttsNum(event.clientY, 0) - rect.top) * canvas.height) / rect.height, 0, ttsH),
      };
    }

    canvas.addEventListener("pointerdown", function (event) {
      /* A click sets a heading target; every action also has a key and a button. */
      var spot = fieldFromEvent(event);
      if (!spot) {
        return;
      }
      if (event.preventDefault) {
        event.preventDefault();
      }
      if (state.status !== "fly") {
        loadScene(scene);
        return;
      }
      aim = spot;
      wake();
    });
    canvas.addEventListener("pointermove", function (event) {
      var spot = aim ? fieldFromEvent(event) : null;
      if (spot) {
        aim = spot;
      }
    });

    var moves = {
      ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down",
      a: "left", d: "right", w: "up", s: "down",
      A: "left", D: "right", W: "up", S: "down",
    };

    canvas.addEventListener("keydown", function (event) {
      var key = event.key;
      var claim = true;
      if (moves[key]) {
        keys[moves[key]] = true;
        aim = null;
        wake();
      } else if (key === " " || key === "Enter") {
        send(state.tether.on ? "cut" : "hook");
      } else if (key === "e" || key === "E") {
        send("reel");
      } else if (key === "x" || key === "X") {
        send("cut");
      } else if (key === "z" || key === "Z") {
        send("hook");
      } else if (key === "Escape") {
        sleep();
        keys = {};
        result.textContent = t("ttsPaused");
      } else {
        claim = false;
      }
      if (claim && event.preventDefault) {
        event.preventDefault();
      }
    });

    canvas.addEventListener("keyup", function (event) {
      if (moves[event.key]) {
        keys[moves[event.key]] = false;
      }
    });

    hookBtn.addEventListener("click", function () {
      send("hook");
    });
    cutBtn.addEventListener("click", function () {
      send("cut");
    });
    reelBtn.addEventListener("click", function () {
      send("reel");
    });
    newBtn.addEventListener("click", function () {
      loadScene(scene);
    });
    select.addEventListener("change", function () {
      var index = campaign.indexOf(select.value);
      if (index >= 0 && campaign.isUnlocked(select.value)) {
        loadScene(ttsScenes[index]);
      }
    });

    /* Shell pause: freeze the scene but never the tow, so coming back to the
     * tab resumes the same cable under the same load. */
    App.quietResetTetherSalvage = function () {
      sleep();
      keys = {};
      pending = {};
      if (state.status === "fly" && !settled) {
        result.textContent = t("ttsPaused");
      }
    };

    loadScene(ttsScenes[Math.max(0, campaign.indexOf(campaign.nextLevelId()))] || ttsScenes[0]);
  }

  /* Bilingual copy travels with the game: addStrings only fills keys i18n.js
   * does not already hold, so the shared dictionary stays authoritative. */
  App.addStrings({
    en: {
      "tabTetherSalvage": "Tether Salvage",
      "ttsS1": "Cold Start",
      "ttsS2": "Rock Gate",
      "ttsS3": "Dead Weight",
      "ttsS4": "Well Slingshot",
      "ttsS5": "Long Spar",
      "ttsS6": "Yard Shift",
      "ttsS7": "Boulder Belt",
      "ttsS8": "Tidal Berth",
      "ttsS9": "Girder Alley",
      "ttsS10": "Second Pass",
      "ttsS11": "Deep Water",
      "ttsS12": "Full Manifest",
      "ttsB1": "An open tow: learn what the line costs you.",
      "ttsB2": "Thread the belt; a wide swing puts the load on a rock.",
      "ttsB3": "Three tonnes of slab sail past the dock if you do not slow them.",
      "ttsB4": "Let the well bend the tow instead of fighting it.",
      "ttsB5": "A spar swings on its line and its ends clip the girders.",
      "ttsB6": "Two wrecks, one dock, one tank. Spend it.",
      "ttsB7": "Four gates on one bearing: hold the line straight or the slab finds a rock.",
      "ttsB8": "A light shell, two legs and a well pulling - patience wins the berth.",
      "ttsB9": "Down the girder alley a spar swings wider than the gate it came through.",
      "ttsB10": "A short line means a close escort: one wreck, then the other.",
      "ttsB11": "The well holds the shell while the spar has to be worked around it.",
      "ttsB12": "Three salvage runs on one cable, and a tank that stops counting.",
      "ttsFuelLabel": "Fuel",
      "ttsTensionLabel": "Tension",
      "ttsMassLabel": "Cargo",
      "ttsCableLabel": "Cable",
      "ttsSalvageLabel": "Salvage",
      "ttsSceneSelectLabel": "Choose a recovery scene",
      "ttsFuelLeft": "{n}",
      "ttsTensionRead": "{n}/{max}",
      "ttsMassRead": "{m} t {s}",
      "ttsMassNone": "unhooked",
      "ttsCableRead": "{n} m",
      "ttsSalvageRead": "{n}/{max}",
      "ttsShapeSlab": "slab",
      "ttsShapeSpar": "spar",
      "ttsShapeShell": "shell",
      "ttsFieldLabel": "Salvage field: fly the tug, hook the wreck with Space and tow it into the dashed dock ring",
      "ttsBtnHook": "Attach",
      "ttsBtnCut": "Cut",
      "ttsBtnReel": "Reel",
      "ttsDockTag": "DOCK",
      "ttsTagDocked": "Salvage docked",
      "ttsTagSnapped": "Cable snapped",
      "ttsTagWrecked": "Tug wrecked",
      "ttsTagDry": "Fuel window closed",
      "ttsTagAdrift": "Nothing left to tow",
      "ttsPrompt": "{name} - {brief} The replayed best line docks with {fuel} fuel left.",
      "ttsWin": "Docked with {n} fuel left - {s} stars.",
      "ttsFailTail": "Salvage delivered {n}/{max}.",
      "ttsNextScene": "Next scene unlocked.",
      "ttsCampaignDone": "All twelve recoveries logged.",
      "ttsPaused": "Scene frozen - the tow is intact. Press a key to resume.",
      "ttsNoStars": "No salvage logged yet.",
      "ttsHint": "Reel in before the dock: a long line leaves the wreck outside the ring, and a tension number near the limit means the cable is about to go.",
      "logTetherSalvage": "Towed {n} into the dock with {f} fuel left",
    },
    zh: {
      "tabTetherSalvage": "绳索拖带回收",
      "ttsS1": "冷启动",
      "ttsS2": "碎石门",
      "ttsS3": "死重",
      "ttsS4": "引力弹弓",
      "ttsS5": "长桁",
      "ttsS6": "船坞夜班",
      "ttsS7": "巨石带",
      "ttsS8": "潮汐泊位",
      "ttsS9": "钢梁巷",
      "ttsS10": "第二趟",
      "ttsS11": "深水回收",
      "ttsS12": "满载清单",
      "ttsB1": "一次开阔的拖带：先弄明白绳索让你付出了什么。",
      "ttsB2": "穿过碎石带；转弯幅度一大，货物就会撞上石块。",
      "ttsB3": "三吨重的板块若不减速，会直接冲过船坞。",
      "ttsB4": "让引力把拖带的弧线绕过去，而不是硬拼。",
      "ttsB5": "长桁会在绳上摆动，两端会刮到钢梁。",
      "ttsB6": "两艘残骸、一个船坞、一箱燃料，省着花。",
      "ttsB7": "四道闸门在同一条航线上：绳子走直，否则板块就会撞上石头。",
      "ttsB8": "轻薄的浮舱、两个中转点、一口引力井：耐心才能停进泊位。",
      "ttsB9": "长桁要从钢梁巷穿过去；它两端摆开的幅度比巷口还宽。",
      "ttsB10": "绳索一短就得贴身押运：先把一件停进船坞，再回去取另一件。",
      "ttsB11": "引力井拽着浮舱，同时还得把长桁从旁边绕过去。",
      "ttsB12": "一根绳索跑三趟回收，而燃料眼看就要见底。",
      "ttsFuelLabel": "燃料",
      "ttsTensionLabel": "张力",
      "ttsMassLabel": "货物",
      "ttsCableLabel": "绳索",
      "ttsSalvageLabel": "回收",
      "ttsSceneSelectLabel": "选择回收场景",
      "ttsFuelLeft": "{n}",
      "ttsTensionRead": "{n}/{max}",
      "ttsMassRead": "{m} 吨 {s}",
      "ttsMassNone": "未挂钩",
      "ttsCableRead": "{n} 米",
      "ttsSalvageRead": "{n}/{max}",
      "ttsShapeSlab": "板块",
      "ttsShapeSpar": "长桁",
      "ttsShapeShell": "薄壳",
      "ttsFieldLabel": "回收场：驾驶拖船，用空格钩住残骸，把它拖进虚线船坞圈",
      "ttsBtnHook": "挂钩",
      "ttsBtnCut": "割绳",
      "ttsBtnReel": "收绳",
      "ttsDockTag": "船坞",
      "ttsTagDocked": "货物已入坞",
      "ttsTagSnapped": "绳索被拉断",
      "ttsTagWrecked": "拖船被撞毁",
      "ttsTagDry": "燃料窗口关闭",
      "ttsTagAdrift": "已无可回收货物",
      "ttsPrompt": "{name} - {brief} 重放的参考航线入坞时还剩 {fuel} 燃料。",
      "ttsWin": "入坞时还剩 {n} 燃料 - 获得 {s} 星。",
      "ttsFailTail": "已回收 {n}/{max}。",
      "ttsNextScene": "解锁下一个场景。",
      "ttsCampaignDone": "十二次回收全部记录在案。",
      "ttsPaused": "场景已冻结——拖带还在。按任意键继续。",
      "ttsNoStars": "还没有回收记录。",
      "ttsHint": "进坞前要收绳：绳太长，货物会停在船坞圈外；张力数字逼近限值，说明绳索快断了。",
      "logTetherSalvage": "把「{n}」拖进船坞，剩下 {f} 燃料",
    },
  });

  App.registerGame({
    name: "tetherSalvage",
    tabKey: "tabTetherSalvage",
    init: initTetherSalvageGame,
    guide: {
      svg:
        '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' +
        '<circle cx="100" cy="18" r="13" fill="none" stroke="rgba(0,242,255,.75)" stroke-dasharray="4 3"/>' +
        '<text x="100" y="21" font-size="8" fill="#00f2ff" text-anchor="middle">1/1</text>' +
        '<path d="M18 58 L70 36" stroke="rgba(0,242,255,.85)" stroke-width="1.6" stroke-dasharray="5 3"/>' +
        '<text x="44" y="38" font-size="8" fill="#e2e8f0" text-anchor="middle">128/340</text>' +
        '<rect x="64" y="26" width="18" height="18" fill="rgba(251,191,36,.25)" stroke="rgba(251,191,36,.95)"/>' +
        '<text x="73" y="39" font-size="8" fill="#fff" text-anchor="middle">3.0</text>' +
        '<path d="M18 50 L28 58 L18 66 L15 58 Z" fill="rgba(109,226,122,.9)" stroke="rgba(255,255,255,.8)"/>' +
        '<circle cx="48" cy="66" r="6" fill="rgba(148,163,184,.25)" stroke="rgba(251,113,133,.9)"/>' +
        '<path d="M44 62 L52 70 M52 62 L44 70" stroke="rgba(251,113,133,.9)"/></svg>',
      en: [
        "Goal: tow the wreck into the dashed dock ring before the fuel window closes.",
        "Action: arrows or WASD fly the tug, Space hooks the cable or cuts it, E reels one step in, clicking sets a heading target.",
        "Rule: a hooked wreck rewrites the tug - thrust now accelerates both bodies, turns arrive late, and momentum keeps sliding the load after you.",
        "Rule: the number riding on the cable is its tension. Reel in for a tighter radius and to haul the load inside the ring, but hold the redline and the cable snaps for good.",
        "Watch out: cutting is the escape hatch - the wreck drifts free, the tug flies clean again, and you can hook it a second time.",
        "Scoring: fuel left when the cargo settles into the dock sets your stars, measured against the replayed best line.",
      ],
      zh: [
        "目标：在燃料窗口关闭前，把残骸拖进虚线船坞圈。",
        "操作：方向键或 WASD 驾驶拖船，空格挂钩或割绳，E 收绳一格，点击画面设定航向。",
        "规则：挂钩之后拖船就变了——推力要带动两个物体，转弯来得晚，惯性还会拽着货物往前滑。",
        "规则：绳索上那个数字是张力。收绳能换来更小的转弯半径、把货物拉进船坞圈，但一直顶着红线，绳索就会彻底断裂。",
        "小心：割绳是逃生手段——残骸漂走，拖船重新灵活，你还能再钩它一次。",
        "计分：货物停进船坞时剩余的燃料决定星数，标准取自重放的参考航线。",
      ],
    },
  });

  /* Exported for the other modules. */
  App.initTetherSalvageGame = initTetherSalvageGame;
})(window.CapitalConvert = window.CapitalConvert || {});
