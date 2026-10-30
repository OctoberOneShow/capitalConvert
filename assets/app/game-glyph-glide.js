/* Glyph Glide - The ice-slide maze campaign in the shared game drawer.
 * Boards come from a generator that only returns deals its BFS has solved
 * inside the level's par window, so every board is provably passable; the
 * checks replay the solver headless.
 *
 * The renderer keeps that contract intact: a pressed direction resolves the
 * whole run exactly the way the solver does, and the skid, the blur and the
 * wall spray only animate a move that has already been earned. */
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
  var glideSize = 320;
  var GLIDE_DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  /* Levels: width, height, star count, and the par window the generator
   * must hit. Star thresholds are moves [3-star, 2-star, 1-star] derived
   * from the deal's par. */
  var glideLevels = [
    { id: "i1", labelKey: "glL1", w: 8, h: 6, stars: 0, minPar: 3, maxPar: 5 },
    { id: "i2", labelKey: "glL2", w: 8, h: 6, stars: 1, minPar: 4, maxPar: 7 },
    { id: "i3", labelKey: "glL3", w: 9, h: 7, stars: 2, minPar: 5, maxPar: 9 },
    { id: "i4", labelKey: "glL4", w: 9, h: 7, stars: 2, minPar: 7, maxPar: 11 },
    { id: "i5", labelKey: "glL5", w: 10, h: 8, stars: 3, minPar: 7, maxPar: 15 },
    { id: "i6", labelKey: "glL6", w: 10, h: 8, stars: 3, minPar: 8, maxPar: 18 },
    { id: "i7", labelKey: "glL7", w: 11, h: 9, stars: 4, minPar: 9, maxPar: 19 },
    { id: "i8", labelKey: "glL8", w: 12, h: 9, stars: 5, minPar: 10, maxPar: 21 },
    { id: "i9", labelKey: "glL9", w: 13, h: 10, stars: 4, minPar: 12, maxPar: 30 },
    { id: "i10", labelKey: "glL10", w: 14, h: 11, stars: 4, minPar: 10, maxPar: 26 },
    /* The white rinks. Every one is dealt around a measured trail rather than
     * random star cells, and the par window climbs from 10-26 to 20-44 while
     * the board adds five columns. Five and six-star rinks demand a route that
     * doubles back for one last socket; none is accepted unless the BFS finds
     * that route inside the printed window. */
    { id: "i11", labelKey: "glL11", w: 14, h: 11, stars: 4, minPar: 10, maxPar: 26, trail: true, density: 0.22 },
    { id: "i12", labelKey: "glL12", w: 15, h: 11, stars: 5, minPar: 12, maxPar: 28, trail: true, density: 0.22 },
    { id: "i13", labelKey: "glL13", w: 15, h: 12, stars: 5, minPar: 13, maxPar: 30, trail: true, density: 0.22 },
    { id: "i14", labelKey: "glL14", w: 16, h: 12, stars: 5, minPar: 14, maxPar: 32, trail: true, density: 0.22 },
    { id: "i15", labelKey: "glL15", w: 16, h: 13, stars: 6, minPar: 14, maxPar: 34, trail: true, density: 0.22 },
    { id: "i16", labelKey: "glL16", w: 17, h: 13, stars: 5, minPar: 16, maxPar: 36, trail: true, density: 0.22 },
    { id: "i17", labelKey: "glL17", w: 17, h: 14, stars: 6, minPar: 16, maxPar: 38, trail: true, density: 0.22 },
    { id: "i18", labelKey: "glL18", w: 18, h: 14, stars: 5, minPar: 18, maxPar: 40, trail: true, density: 0.22 },
    { id: "i19", labelKey: "glL19", w: 18, h: 15, stars: 6, minPar: 18, maxPar: 42, trail: true, density: 0.22 },
    { id: "i20", labelKey: "glL20", w: 19, h: 15, stars: 6, minPar: 20, maxPar: 44, trail: true, density: 0.22 },
    /* The deep tier - the crown beneath the summit. Its one lesson is one no
     * rung 1-20 teaches: the stopping law breaks. Every earlier rink stops
     * the skate at walls alone, so the stop map is just the walls; here
     * `drifts` sows snowdrifts into open ice and a ride that crosses one ends
     * on it mid-floor - the long glide lines the white rinks are built around
     * break short, and the stop map has to be re-read on every push-off. The
     * drifts are sown on the measured trail itself, and no deal ships unless
     * the BFS prices it strictly above the same board without drifts, so the
     * drifts are the proven cost, never decoration. The par floor climbs past
     * the shipped peak's 20 - 22, 24, 26, 28 - and i24 raises seven stars,
     * one more than any rink before it asked for. */
    /* i21 - three drifts on the measured trail: the ride the deal was laid
     * around already breaks once, and the par floor steps past i20 for the
     * first time. */
    { id: "i21", labelKey: "glL21", w: 19, h: 16, stars: 6, minPar: 22, maxPar: 46, trail: true, density: 0.22, drifts: 3 },
    /* i22 - four drifts on a wider floor: two long rides now end short, and
     * the honest line has to be re-planned around stops that no wall put
     * there. */
    { id: "i22", labelKey: "glL22", w: 20, h: 16, stars: 6, minPar: 24, maxPar: 48, trail: true, density: 0.22, drifts: 4 },
    /* i23 - five drifts: with this much snow in the ice, whole corridors ride
     * one drift at a time, and the driftless line is no longer even a sketch
     * of the answer. */
    { id: "i23", labelKey: "glL23", w: 20, h: 17, stars: 6, minPar: 26, maxPar: 50, trail: true, density: 0.22, drifts: 5 },
    /* i24 - six drifts and seven stars: the crown breaks the ride and doubles
     * the errands, so the proven par floor lands at 28 - the deepest demand
     * beneath the summit. */
    { id: "i24", labelKey: "glL24", w: 21, h: 17, stars: 7, minPar: 28, maxPar: 54, trail: true, density: 0.22, drifts: 6 },
    /* Rinks 25-30 are the summit tier, and its one law is the deep tier's own
     * dial carried all the way up: one more drift per rung, seven through
     * twelve, every snowpack deeper than the crown's six, while the errands
     * and the floor grow underneath - seven to ten sockets, 22x18 out to
     * 23x20, and a par floor that steps 29 - 39 past i24's 28. Every number
     * was measured through the module's own drift dealer on the gate's pinned
     * stream, seed 88000 + trial*37 + drifts, eight deals a rung: all
     * forty-eight deals ship as true drift boards, the mean proven par climbs
     * strictly 30.9 - 34.6 - 35.5 - 38.0 - 38.8 - 42.3 against i24's 29.5 on
     * the same stream, and no rung's floor is reachable without its snow -
     * strip the drifts off the dealt boards and the driftless replay prices
     * below the printed floor on every rung (means 26.8, 29.3, 29.9, 31.0,
     * 30.1, 32.5 against floors 29-39), so the summit's demand is bought by
     * the drifts, never by the bare ice. */
    /* i25 - the first drift past the crown: seven sown, the first 22-wide
     * floor, and the par floor steps to 29. */
    { id: "i25", labelKey: "glL25", w: 22, h: 18, stars: 7, minPar: 29, maxPar: 58, trail: true, density: 0.22, drifts: 7 },
    /* i26 - eight drifts and the campaign's first eight-socket rink: eight
     * errands under the deepest snowpack yet. */
    { id: "i26", labelKey: "glL26", w: 22, h: 18, stars: 8, minPar: 31, maxPar: 60, trail: true, density: 0.22, drifts: 8 },
    /* i27 - nine drifts on the first 23-wide floor, and the par floor steps
     * to 33. */
    { id: "i27", labelKey: "glL27", w: 23, h: 18, stars: 8, minPar: 33, maxPar: 62, trail: true, density: 0.22, drifts: 9 },
    /* i28 - ten drifts, nine sockets and the deepest floor yet at nineteen
     * rows. */
    { id: "i28", labelKey: "glL28", w: 23, h: 19, stars: 9, minPar: 35, maxPar: 64, trail: true, density: 0.22, drifts: 10 },
    /* i29 - eleven drifts on the same deep floor: nothing new but snow, and
     * the snow alone pushes the mean proven par past thirty-eight. */
    { id: "i29", labelKey: "glL29", w: 23, h: 19, stars: 9, minPar: 37, maxPar: 66, trail: true, density: 0.22, drifts: 11 },
    /* i30 - twelve drifts, ten sockets, the deepest floor the ladder holds,
     * and the close at 39 - the highest floor and the highest mean par the
     * campaign asks for. */
    { id: "i30", labelKey: "glL30", w: 23, h: 20, stars: 10, minPar: 39, maxPar: 68, trail: true, density: 0.22, drifts: 12 },
  ];

  /* Pure generator + solver, exported for the static checks. Board walls
   * are a flat 0/1 array; the solver returns the minimal slide count. The
   * sixth argument is the deep tier's drift mask - a flat 0/1 array the same
   * shape as the wall, marking snowdrifts that stop a ride mid-floor. A ride
   * still ends where ice meets a wall, and now also where it crosses a
   * drift. Omitted (every rung 1-20 and both shipped generators call it
   * without one), the extra test never fires and the search is exactly the
   * solver that has always priced the rinks. */
  function glideSolve(wall, w, h, start, goal, stars, drift) {
    var dirs = GLIDE_DIRS;
    function slide(pos, d) {
      var x = pos % w;
      var y = Math.floor(pos / w);
      var steps = 0;
      for (;;) {
        var nx = x + dirs[d][0];
        var ny = y + dirs[d][1];
        if (ny < 0 || ny >= h || nx < 0 || nx >= w || wall[ny * w + nx]) {
          break;
        }
        x = nx;
        y = ny;
        steps += 1;
        if (drift && drift[y * w + x]) {
          break;
        }
      }
      return { pos: y * w + x, steps: steps };
    }
    var seen = {};
    var startMask = 0;
    seen[start * 4096 + startMask] = true;
    var queue = [{ p: start, m: startMask, d: 0 }];
    while (queue.length) {
      var st = queue.shift();
      var hasAll = true;
      for (var s = 0; s < stars.length; s += 1) {
        if (!((st.m >> s) & 1)) {
          hasAll = false;
          break;
        }
      }
      if (st.p === goal && hasAll) {
        return st.d;
      }
      for (var d = 0; d < 4; d += 1) {
        var res = slide(st.p, d);
        if (!res.steps) {
          continue;
        }
        var m = st.m;
        for (var s2 = 0; s2 < stars.length; s2 += 1) {
          if (res.pos === stars[s2]) {
            m |= 1 << s2;
          }
        }
        var k = res.pos * 4096 + m;
        if (seen[k]) {
          continue;
        }
        seen[k] = true;
        queue.push({ p: res.pos, m: m, d: st.d + 1 });
      }
    }
    return -1;
  }

  function glideGenerate(w, h, starCount, minPar, maxPar) {
    var bestDeal = null;
    var bestMiss = Infinity;
    for (var attempt = 0; attempt < 600; attempt += 1) {
      var density = w >= 10 ? 0.17 : 0.22;
      var wall = [];
      for (var i = 0; i < w * h; i += 1) {
        var x = i % w;
        var y = Math.floor(i / w);
        wall.push(
          x === 0 || y === 0 || x === w - 1 || y === h - 1 || Math.random() < density ? 1 : 0,
        );
      }
      var cells = [];
      for (var c = 0; c < w * h; c += 1) {
        if (!wall[c]) {
          cells.push(c);
        }
      }
      if (cells.length < 10) {
        continue;
      }
      for (var sh = cells.length - 1; sh > 0; sh -= 1) {
        var j = Math.floor(Math.random() * (sh + 1));
        var tmp = cells[sh];
        cells[sh] = cells[j];
        cells[j] = tmp;
      }
      var start = cells[0];
      var goal = cells[1];
      var stars = cells.slice(2, 2 + starCount);
      var par = glideSolve(wall, w, h, start, goal, stars);
      if (par < minPar || par > maxPar) {
        /* Keep the closest solvable deal as a graceful fallback. */
        var miss = par < minPar ? minPar - par : par - maxPar;
        if (par > 0 && miss < bestMiss) {
          bestMiss = miss;
          bestDeal = { wall: wall, start: start, goal: goal, stars: stars, par: par };
        }
        continue;
      }
      return { wall: wall, start: start, goal: goal, stars: stars, par: par };
    }
    if (bestDeal) {
      return bestDeal;
    }
    /* Fallback: an open ring board, one slide from any wall cell. */
    var safe = [];
    for (var f = 0; f < w * h; f += 1) {
      var fx = f % w;
      var fy = Math.floor(f / w);
      safe.push(fx === 0 || fy === 0 || fx === w - 1 || fy === h - 1 ? 1 : 0);
    }
    var fStart = 1 * w + 1;
    var fGoal = (h - 2) * w + (w - 2);
    var fStars = [];
    return { wall: safe, start: fStart, goal: fGoal, stars: fStars, par: 2 };
  }
  /* The deeper rinks are laid out around a measured trail instead of dropping
   * stars at random. A random slide-walk supplies the route; its stops become
   * the stars and the last stop the goal, then the BFS prices the shortest line
   * that still collects every star. A deal only ships when that price lands in
   * the rung's par window, so the printed par is always a line the solver has
   * replayed. The old generator stays untouched for the shipped ten. */
  function glideTrailGenerate(w, h, starCount, minPar, maxPar, density) {
    for (var attempt = 0; attempt < 180; attempt += 1) {
      var wall = [];
      for (var i = 0; i < w * h; i += 1) {
        var x = i % w;
        var y = Math.floor(i / w);
        wall.push(
          x === 0 || y === 0 || x === w - 1 || y === h - 1 || Math.random() < density ? 1 : 0,
        );
      }
      var cells = [];
      for (var c = 0; c < w * h; c += 1) {
        if (!wall[c]) {
          cells.push(c);
        }
      }
      if (cells.length < 20) {
        continue;
      }
      var start = cells[Math.floor(Math.random() * cells.length)];
      var target = maxPar + 4;
      var pos = start;
      var lastDir = -1;
      var stops = [];
      var guard = 0;
      while (stops.length < target && guard < target * 10) {
        guard += 1;
        var options = [];
        for (var d = 0; d < 4; d += 1) {
          if (d !== lastDir) {
            options.push(d);
          }
        }
        var dir = options[Math.floor(Math.random() * options.length)];
        var res = slideOn(wall, w, h, pos, dir);
        if (!res.steps) {
          continue;
        }
        pos = res.pos;
        stops.push(pos);
        lastDir = dir;
      }
      if (stops.length < target) {
        continue;
      }
      var goal = stops[stops.length - 1];
      var stars = [];
      for (var s = 0; s < starCount; s += 1) {
        var at = Math.floor(((s + 1) * stops.length) / (starCount + 1));
        var stop = stops[at];
        if (stop !== start && stop !== goal && stars.indexOf(stop) < 0) {
          stars.push(stop);
        }
      }
      if (stars.length < starCount) {
        continue;
      }
      var par = glideSolve(wall, w, h, start, goal, stars);
      if (par >= minPar && par <= maxPar) {
        return { wall: wall, start: start, goal: goal, stars: stars, par: par };
      }
    }
    /* Kept playable even if the rink refuses every trail. */
    return glideGenerate(w, h, starCount, minPar, maxPar);
  }

  function slideOn(wall, w, h, pos, dir) {
    var x = pos % w;
    var y = Math.floor(pos / w);
    var steps = 0;
    for (;;) {
      var nx = x + GLIDE_DIRS[dir][0];
      var ny = y + GLIDE_DIRS[dir][1];
      if (ny < 0 || ny >= h || nx < 0 || nx >= w || wall[ny * w + nx]) {
        break;
      }
      x = nx;
      y = ny;
      steps += 1;
    }
    return { pos: y * w + x, steps: steps };
  }

  /* The deep tier's dealer: the trail dealer plus snowdrifts. The board and
   * the measured trail are laid exactly as glideTrailGenerate lays them, but
   * the walk also records every cell the ride crosses, and the drifts are
   * sown on that ridden ice - so every drift sits where long slides actually
   * travel and is guaranteed to break something. The BFS then prices the
   * deal twice, once through the drifts and once across the same board with
   * the snow cleared, and the deal only ships when the priced par lands in
   * the rung's window AND costs strictly more than the driftless line: the
   * drifts are load-bearing by construction, not decoration. If the rink
   * refuses, the untouched trail dealer takes over and the rung stays
   * playable. */
  function glideDriftTrailGenerate(w, h, starCount, minPar, maxPar, density, driftCount) {
    for (var attempt = 0; attempt < 300; attempt += 1) {
      var wall = [];
      for (var i = 0; i < w * h; i += 1) {
        var x = i % w;
        var y = Math.floor(i / w);
        wall.push(
          x === 0 || y === 0 || x === w - 1 || y === h - 1 || Math.random() < density ? 1 : 0,
        );
      }
      var cells = [];
      for (var c = 0; c < w * h; c += 1) {
        if (!wall[c]) {
          cells.push(c);
        }
      }
      if (cells.length < 20) {
        continue;
      }
      var start = cells[Math.floor(Math.random() * cells.length)];
      var target = maxPar + 4;
      var pos = start;
      var lastDir = -1;
      var stops = [];
      var ridden = {};
      var guard = 0;
      while (stops.length < target && guard < target * 10) {
        guard += 1;
        var options = [];
        for (var d = 0; d < 4; d += 1) {
          if (d !== lastDir) {
            options.push(d);
          }
        }
        var dir = options[Math.floor(Math.random() * options.length)];
        var res = slideOn(wall, w, h, pos, dir);
        if (!res.steps) {
          continue;
        }
        var step = pos;
        for (var k = 0; k < res.steps; k += 1) {
          step += GLIDE_DIRS[dir][0] + GLIDE_DIRS[dir][1] * w;
          ridden[step] = 1;
        }
        pos = res.pos;
        stops.push(pos);
        lastDir = dir;
      }
      if (stops.length < target) {
        continue;
      }
      var goal = stops[stops.length - 1];
      var stars = [];
      for (var s = 0; s < starCount; s += 1) {
        var at = Math.floor(((s + 1) * stops.length) / (starCount + 1));
        var stop = stops[at];
        if (stop !== start && stop !== goal && stars.indexOf(stop) < 0) {
          stars.push(stop);
        }
      }
      if (stars.length < starCount) {
        continue;
      }
      /* Drift sites: ridden ice, clear of the start, the goal and the stars,
       * so a drift never doubles as a socket. */
      var sites = [];
      for (var r = 0; r < cells.length; r += 1) {
        if (ridden[cells[r]] && cells[r] !== start && cells[r] !== goal && stars.indexOf(cells[r]) < 0) {
          sites.push(cells[r]);
        }
      }
      if (sites.length < driftCount) {
        continue;
      }
      var drift = [];
      for (var z = 0; z < w * h; z += 1) {
        drift.push(0);
      }
      var pool = sites.slice();
      for (var p = 0; p < driftCount; p += 1) {
        var pick = Math.floor(Math.random() * pool.length);
        drift[pool[pick]] = 1;
        pool.splice(pick, 1);
      }
      var par = glideSolve(wall, w, h, start, goal, stars, drift);
      if (par < minPar || par > maxPar) {
        continue;
      }
      var open = glideSolve(wall, w, h, start, goal, stars);
      /* The trail walk is itself a driftless play, so the driftless price is
       * always real; the deal ships only when the snow provably costs. */
      if (open < 1 || open >= par) {
        continue;
      }
      return { wall: wall, start: start, goal: goal, stars: stars, drifts: drift, par: par };
    }
    /* Kept playable even if the rink refuses every sowing. */
    return glideTrailGenerate(w, h, starCount, minPar, maxPar, density);
  }

  App.glyphGlideGenerate = glideGenerate;
  App.glyphGlideTrailGenerate = glideTrailGenerate;
  App.glyphGlideDriftGenerate = glideDriftTrailGenerate;
  App.glyphGlideSolve = glideSolve;
  /* The ladder itself, for the checks: the gate walks the unlock chain the
   * campaign derives rather than trusting the picker. */
  App.glyphGlideLevels = glideLevels;

  /* Bilingual copy for the white rinks, the deep tier and the summit. The
   * shipped ten names stay in the shared dictionary; addStrings only fills
   * the keys it does not own. */
  App.addStrings({
    en: {
      "glL11": "Rime Run", "glL12": "The Glass Stair", "glL13": "Frost Fingers",
      "glL14": "The Hollow Flue", "glL15": "Six-Star Vault",
      "glL16": "The Weeping Wall", "glL17": "Glacier Gate",
      "glL18": "The Long Crevasse", "glL19": "Whiteout Gallery",
      "glL20": "The Frozen Crown",
      "glL21": "First Drifts", "glL22": "The Snowbound Corridors",
      "glL23": "The Buried Rink", "glL24": "The White Summit",
      "glL25": "The Seventh Drift", "glL26": "The Eight-Star Snowfield",
      "glL27": "The Ninth Drift", "glL28": "The Ten-Drift Vault",
      "glL29": "Above the Snowline", "glL30": "The Sky Rink",
    },
    zh: {
      "glL11": "\u971c\u75d5\u6ed1\u9053", "glL12": "\u7409\u7483\u9636",
      "glL13": "\u971c\u6307", "glL14": "\u7a7a\u5fc3\u51b0\u9053",
      "glL15": "\u516d\u661f\u51b0\u7a96", "glL16": "\u6cea\u5899",
      "glL17": "\u51b0\u5ddd\u4e4b\u95e8", "glL18": "\u957f\u88c2\u9699",
      "glL19": "\u767d\u76f2\u957f\u5eca", "glL20": "\u51b0\u5c01\u738b\u51a0",
      "glL21": "\u521d\u96ea\u5806", "glL22": "\u96ea\u5c01\u56de\u5eca",
      "glL23": "\u57cb\u96ea\u51b0\u573a", "glL24": "\u767d\u96ea\u4e4b\u5dc5",
      "glL25": "\u7b2c\u4e03\u91cd\u96ea", "glL26": "\u516b\u661f\u96ea\u539f",
      "glL27": "\u7b2c\u4e5d\u91cd\u96ea", "glL28": "\u5341\u96ea\u51b0\u7a96",
      "glL29": "\u96ea\u7ebf\u4e4b\u4e0a", "glL30": "\u5929\u9876\u51b0\u573a",
    },
  });

  /* ------------------------------------------------------------------ feel */
  /* The shared layer is loaded before this module in every page, but a missing
   * effect must never cost a run, so the calls are resolved once into a local
   * object with no-op holes. */
  var FX_API = [
    "pop", "shake", "ring", "burst", "floatText", "stagger",
    "countUp", "sweep", "jolt", "flash", "ceremony", "callout",
  ];

  function noop() {}

  function feelFx() {
    var shared = App.fx || {};
    var out = {};
    for (var i = 0; i < FX_API.length; i += 1) {
      out[FX_API[i]] = typeof shared[FX_API[i]] === "function" ? shared[FX_API[i]] : noop;
    }
    return out;
  }

  function closestPanel(node) {
    var walk = node;
    while (walk) {
      if (walk.classList && walk.classList.contains && walk.classList.contains("game-panel")) {
        return walk;
      }
      walk = walk.parentNode;
    }
    return null;
  }

  function initGlyphGlideGame() {
    var canvas = getElement("glCanvas");
    var movesEl = getElement("glMoves");
    var starsEl = getElement("glStars");
    var timeEl = getElement("glTime");
    var resultEl = getElement("glResult");
    var startBtn = getElement("glNewBtn");
    var bestEl = getElement("glBest");
    var selectEl = getElement("glLevelSel");
    if (
      !canvas ||
      !movesEl ||
      !starsEl ||
      !timeEl ||
      !resultEl ||
      !startBtn ||
      !bestEl ||
      !selectEl
    ) {
      return;
    }

    var ctx = canvas.getContext("2d");
    var panel = closestPanel(canvas);
    var fx = feelFx();
    var art = App.art || null;
    var play = typeof App.playSfx === "function" ? App.playSfx : noop;
    var campaign = createCampaign({ key: "glyph-glide-campaign", levels: glideLevels });
    var level = glideLevels[0];
    var w = 8;
    var h = 6;
    var wall = [];
    var player = 0;
    var goal = 0;
    var stars = [];
    var drifts = [];
    var collected = {};
    var collectedAt = {};
    var par = 3;
    var moves = 0;
    var solved = false;
    var facing = [1, 0];
    var rafId = null;
    var startedAt = 0;
    var clockRunning = false;

    /* Presentation state. The logic above owns the board; everything below is
     * only ever a picture of a run that has already been decided. */
    var MARGIN = 9;
    var RIM = 5;
    var cs = 30;
    var x0 = 10;
    var y0 = 14;
    var viewH = 320;
    var scale = 1;
    var plate = document.createElement("canvas");
    var plateKey = "";
    var PAL = null;
    var run = null;
    var marks = [];
    var chips = [];
    var puffs = [];
    var flakes = [];
    var hover = null;
    var nudge = null;
    var wallTap = null;
    var dealtAt = 0;
    var settleAt = -9999;
    var dealSeq = 0;
    var lastTheme = "";
    var lastTimeText = "";
    var lastShown = true;
    var timers = [];
    var tick = 0;

    function motionOff() {
      return !!(App.isMotionOff && App.isMotionOff());
    }

    function calm() {
      return !!(App.isMotionCalm && App.isMotionCalm());
    }

    /* Every timeout this module arms is tracked, so the shell's pause can
     * take the lot away without touching the deal. */
    function later(fn, ms) {
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

    function dropTimers() {
      for (var i = 0; i < timers.length; i += 1) {
        window.clearTimeout(timers[i]);
      }
      timers = [];
    }

    /* ------------------------------------------------------------- geometry */
    function layout() {
      cs = Math.floor((glideSize - MARGIN * 2) / w);
      viewH = Math.round(cs * h + MARGIN * 2 + 10);
      x0 = Math.floor((glideSize - cs * w) / 2);
      y0 = Math.round(MARGIN + (viewH - MARGIN * 2 - cs * h) / 2);
    }

    function syncSize() {
      var before = viewH;
      layout();
      var rect = canvas.getBoundingClientRect();
      var dpr = window.devicePixelRatio || 1;
      var wanted = rect.width ? Math.max(1, Math.min((rect.width * dpr) / glideSize, 3)) : 1;
      if (wanted === scale && before === viewH && plateKey) {
        return;
      }
      scale = wanted;
      canvas.width = Math.round(glideSize * scale);
      canvas.height = Math.round(viewH * scale);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      plateKey = "";
    }

    function pointAt(cx, cy) {
      return [x0 + cx * cs + cs / 2, y0 + cy * cs + cs / 2];
    }

    function sheet() {
      return { x: x0 - RIM, y: y0 - RIM, w: cs * w + RIM * 2, h: cs * h + RIM * 2 };
    }

    function isWall(cx, cy) {
      if (cy < 0 || cy >= h || cx < 0 || cx >= w) {
        return true;
      }
      return !!wall[cy * w + cx];
    }

    /* Mirrors the solver's rule read-only: a run ends where ice meets a wall,
     * and on the deep rinks also where it crosses a snowdrift - the pressed
     * direction resolves exactly the way glideSolve prices it. */
    function slideFrom(cx, cy, d) {
      var steps = 0;
      for (;;) {
        var nx = cx + d[0];
        var ny = cy + d[1];
        if (ny < 0 || ny >= h || nx < 0 || nx >= w || wall[ny * w + nx]) {
          break;
        }
        cx = nx;
        cy = ny;
        steps += 1;
        if (drifts[cy * w + cx]) {
          break;
        }
      }
      return { x: cx, y: cy, steps: steps };
    }

    /* The push-off bites, then the blade coasts at an almost constant speed;
     * the wall, not friction, is what ends the run - so the curve is C1 at the
     * hand-over and stops dead at 1. */
    function skidEase(k) {
      var ramp = 0.3;
      var a = ramp / (2 - ramp);
      if (k <= 0) {
        return 0;
      }
      if (k >= 1) {
        return 1;
      }
      if (k <= ramp) {
        var u = k / ramp;
        return a * u * u;
      }
      return a + (1 - a) * ((k - ramp) / (1 - ramp));
    }

    /* ---------------------------------------------------------------- colour */
    function rinkPalette() {
      var light = document.documentElement.getAttribute("data-theme") === "light";
      var hue = 196;
      if (panel && window.getComputedStyle) {
        var parsed = parseInt(window.getComputedStyle(panel).getPropertyValue("--gp-hue"), 10);
        if (parsed === parsed && parsed > -720 && parsed < 720) {
          hue = parsed;
        }
      }
      var H = hue;
      var ice = light ? 90 : 84;
      function hsl(h, s, l, a) {
        var body = h + "," + s + "%," + l + "%";
        return a === undefined ? "hsl(" + body + ")" : "hsla(" + body + "," + a + ")";
      }
      return {
        light: light,
        hue: H,
        arenaHi: hsl(H, 32, light ? 24 : 15),
        arenaLo: hsl(H + 6, 40, light ? 12 : 5),
        sheetGlow: hsl(H, 92, 68, light ? 0.22 : 0.3),
        iceHi: hsl(H - 10, 44, ice),
        iceMid: hsl(H - 2, 40, ice - 11),
        iceLo: hsl(H + 8, 38, ice - 24),
        iceEdge: hsl(H + 4, 46, ice - 38, 0.75),
        scratch: hsl(H - 14, 30, 100, light ? 0.5 : 0.38),
        scrape: hsl(H + 6, 44, 26, 0.16),
        paint: hsl(H + 16, 52, 22, 0.2),
        lineWarm: hsl(8, 76, 46, 0.22),
        lineCool: hsl(H + 22, 72, 40, 0.24),
        boardFace: hsl(H + 14, 26, light ? 30 : 22),
        boardTop: hsl(H + 10, 24, light ? 46 : 36),
        boardDeep: hsl(H + 16, 30, light ? 16 : 10),
        boardSeam: hsl(H + 16, 30, 4, 0.34),
        rail: hsl(H, 84, light ? 66 : 58),
        kick: hsl(44, 84, light ? 58 : 52),
        snow: hsl(H - 12, 40, 100, light ? 0.86 : 0.78),
        cast: hsl(H + 10, 40, 8, 0.22),
        goalShut: hsl(H + 8, 22, light ? 40 : 48),
        goalOpen: hsl(96, 78, light ? 52 : 58),
        goalBeacon: hsl(84, 90, 66, 0.5),
        starCore: hsl(48, 94, 66),
        starMid: hsl(40, 90, 54),
        starEdge: hsl(28, 72, 28),
        starGlow: hsl(46, 96, 62, 0.55),
        body: hsl(H + 4, 58, light ? 22 : 18),
        bodyHi: hsl(H - 6, 62, 44),
        bodyLo: hsl(H + 10, 60, 10),
        rim: hsl(H - 4, 92, light ? 62 : 56),
        skin: hsl(H - 20, 26, 94),
        scarf: hsl(14, 88, 58),
        scarfLo: hsl(6, 74, 42),
        chip: hsl(H - 10, 40, 100, 0.9),
        blur: hsl(H, 88, 72, 0.34),
        groove: hsl(H - 8, 46, 100, 0.5),
        flake: hsl(H - 12, 30, 100, light ? 0.5 : 0.42),
      };
    }

    function ensurePalette() {
      var theme = document.documentElement.getAttribute("data-theme") || "";
      if (!PAL || theme !== lastTheme) {
        lastTheme = theme;
        PAL = rinkPalette();
        plateKey = "";
      }
    }

    /* ------------------------------------------------------------- the sheet */
    function rr(c, x, y, bw, bh, r) {
      var rad = Math.max(0, Math.min(r, Math.min(bw, bh) / 2));
      c.beginPath();
      c.moveTo(x + rad, y);
      c.lineTo(x + bw - rad, y);
      c.quadraticCurveTo(x + bw, y, x + bw, y + rad);
      c.lineTo(x + bw, y + bh - rad);
      c.quadraticCurveTo(x + bw, y + bh, x + bw - rad, y + bh);
      c.lineTo(x + rad, y + bh);
      c.quadraticCurveTo(x, y + bh, x, y + bh - rad);
      c.lineTo(x, y + rad);
      c.quadraticCurveTo(x, y, x + rad, y);
      c.closePath();
    }

    function starPath(c, cx, cy, r, spin) {
      c.beginPath();
      for (var i = 0; i < 10; i += 1) {
        var ang = spin + (Math.PI / 5) * i - Math.PI / 2;
        var rad = i % 2 ? r * 0.44 : r;
        var px = cx + Math.cos(ang) * rad;
        var py = cy + Math.sin(ang) * rad;
        if (i) {
          c.lineTo(px, py);
        } else {
          c.moveTo(px, py);
        }
      }
      c.closePath();
    }

    /* Deterministic grit: the scratches must not crawl between frames, so the
     * sheet texture is seeded from the level and drawn once into the cache. */
    function grain(seed) {
      var s = seed || 1;
      return function () {
        s ^= s << 13;
        s ^= s >>> 17;
        s ^= s << 5;
        return ((s >>> 0) % 100000) / 100000;
      };
    }

    function drawEdgeDecor(p, side, bx, by, bw, bh) {
      var C = PAL;
      /* Boards stand on the ice, so the boundary gets three things: a shadow
       * the boards throw, the yellow kickplate at ice height, and the snow
       * bank raked up along the foot of the wall. */
      var cx = bx + bw / 2;
      var cy = by + bh / 2;
      p.save();
      p.lineCap = "round";
      var horiz = side === "top" || side === "bottom";
      var len = horiz ? bw : bh;
      var at = horiz ? (side === "top" ? by : by + bh) : side === "left" ? bx : bx + bw;
      var into = horiz ? (side === "top" ? -1 : 1) : side === "left" ? -1 : 1;

      p.strokeStyle = C.cast;
      p.lineWidth = Math.max(2, cs * 0.16);
      p.beginPath();
      if (horiz) {
        p.moveTo(bx, at + into * p.lineWidth * 0.5);
        p.lineTo(bx + bw, at + into * p.lineWidth * 0.5);
      } else {
        p.moveTo(at + into * p.lineWidth * 0.5, by);
        p.lineTo(at + into * p.lineWidth * 0.5, by + bh);
      }
      p.stroke();

      p.strokeStyle = C.kick;
      p.lineWidth = Math.max(1.6, cs * 0.09);
      p.beginPath();
      if (horiz) {
        p.moveTo(bx, at - into * p.lineWidth * 0.4);
        p.lineTo(bx + bw, at - into * p.lineWidth * 0.4);
      } else {
        p.moveTo(at - into * p.lineWidth * 0.4, by);
        p.lineTo(at - into * p.lineWidth * 0.4, by + bh);
      }
      p.stroke();

      p.strokeStyle = C.rail;
      p.lineWidth = Math.max(1, cs * 0.05);
      p.beginPath();
      if (horiz) {
        p.moveTo(bx, at + into * cs * 0.03);
        p.lineTo(bx + bw, at + into * cs * 0.03);
      } else {
        p.moveTo(at + into * cs * 0.03, by);
        p.lineTo(at + into * cs * 0.03, by + bh);
      }
      p.stroke();

      p.fillStyle = C.snow;
      var step = Math.max(3, cs * 0.22);
      for (var d = step * 0.5; d < len; d += step) {
        var wob = 0.62 + Math.sin(d * 0.7 + (cx + cy) * 0.11) * 0.38;
        var r = cs * 0.12 * wob;
        p.beginPath();
        if (horiz) {
          p.arc(bx + d, at - into * r * 0.35, r, 0, Math.PI * 2);
        } else {
          p.arc(at - into * r * 0.35, by + d, r, 0, Math.PI * 2);
        }
        p.fill();
      }
      p.restore();
    }

    function buildPlate() {
      var C = PAL;
      var S = sheet();
      plate.width = canvas.width;
      plate.height = canvas.height;
      var p = plate.getContext("2d");
      p.setTransform(scale, 0, 0, scale, 0, 0);
      p.clearRect(0, 0, glideSize, viewH);

      /* The arena: a dark hall with a lamp above the sheet. */
      var bg = p.createLinearGradient(0, 0, 0, viewH);
      bg.addColorStop(0, C.arenaHi);
      bg.addColorStop(1, C.arenaLo);
      p.fillStyle = bg;
      p.fillRect(0, 0, glideSize, viewH);
      var glow = p.createRadialGradient(glideSize / 2, S.y + S.h / 2, cs, glideSize / 2, S.y + S.h / 2, S.w * 0.82);
      glow.addColorStop(0, C.sheetGlow);
      glow.addColorStop(1, "rgba(0,0,0,0)");
      p.fillStyle = glow;
      p.fillRect(0, 0, glideSize, viewH);

      /* Dasher boards: the shell the walls are built out of. */
      rr(p, S.x - 4, S.y - 4, S.w + 8, S.h + 8, 16);
      p.fillStyle = C.boardDeep;
      p.fill();

      /* The sheet itself. */
      rr(p, S.x, S.y, S.w, S.h, 11);
      var ice = p.createLinearGradient(S.x, S.y, S.x, S.y + S.h);
      ice.addColorStop(0, C.iceHi);
      ice.addColorStop(0.45, C.iceMid);
      ice.addColorStop(1, C.iceLo);
      p.fillStyle = ice;
      p.fill();

      p.save();
      rr(p, S.x, S.y, S.w, S.h, 11);
      p.clip();

      /* Painted rink markings, kept faint enough to never read as rules. */
      p.strokeStyle = C.lineCool;
      p.lineWidth = Math.max(1.5, cs * 0.1);
      p.beginPath();
      p.moveTo(S.x + S.w * 0.3, S.y);
      p.lineTo(S.x + S.w * 0.3, S.y + S.h);
      p.moveTo(S.x + S.w * 0.7, S.y);
      p.lineTo(S.x + S.w * 0.7, S.y + S.h);
      p.stroke();
      p.strokeStyle = C.lineWarm;
      p.setLineDash([cs * 0.4, cs * 0.32]);
      p.beginPath();
      p.moveTo(S.x + S.w * 0.5, S.y);
      p.lineTo(S.x + S.w * 0.5, S.y + S.h);
      p.stroke();
      p.setLineDash([]);

      /* Skate grit: short scrapes and a couple of long coasting arcs. */
      var rnd = grain(w * 131 + h * 977 + level.id.charCodeAt(level.id.length - 1) * 37);
      p.lineCap = "round";
      var i;
      for (i = 0; i < 30; i += 1) {
        var gx = S.x + rnd() * S.w;
        var gy = S.y + rnd() * S.h;
        var gl = cs * (0.3 + rnd() * 1.4);
        var ga = (rnd() - 0.5) * 0.7;
        p.strokeStyle = i % 4 === 0 ? C.scratch : C.scrape;
        p.lineWidth = 0.6 + rnd() * 0.9;
        p.beginPath();
        p.moveTo(gx, gy);
        p.lineTo(gx + Math.cos(ga) * gl, gy + Math.sin(ga) * gl * 0.4);
        p.stroke();
      }
      p.strokeStyle = C.scratch;
      p.globalAlpha = 0.16;
      p.lineWidth = 1.8;
      for (i = 0; i < 3; i += 1) {
        p.beginPath();
        p.arc(S.x + S.w * (0.2 + i * 0.3), S.y + S.h * 0.5, S.h * (0.28 + i * 0.12), 0.4, 2.6);
        p.stroke();
      }
      p.globalAlpha = 1;

      /* The wall mass: one gradient across the whole sheet so the boards read
       * as a single lit object, then seams and chipped ice. */
      var body = p.createLinearGradient(0, S.y, 0, S.y + S.h);
      body.addColorStop(0, C.boardTop);
      body.addColorStop(0.5, C.boardFace);
      body.addColorStop(1, C.boardDeep);
      var cells = w * h;
      var cx2;
      var cy2;
      for (i = 0; i < cells; i += 1) {
        if (!wall[i]) {
          continue;
        }
        cx2 = i % w;
        cy2 = Math.floor(i / w);
        p.fillStyle = body;
        p.fillRect(x0 + cx2 * cs, y0 + cy2 * cs, cs, cs);
      }
      p.strokeStyle = C.boardSeam;
      p.lineWidth = 1;
      for (i = 0; i < cells; i += 1) {
        if (!wall[i]) {
          continue;
        }
        cx2 = i % w;
        cy2 = Math.floor(i / w);
        p.beginPath();
        if (cx2 % 2 === 0) {
          p.moveTo(x0 + cx2 * cs + 0.5, y0 + cy2 * cs);
          p.lineTo(x0 + cx2 * cs + 0.5, y0 + cy2 * cs + cs);
        }
        if (cy2 % 2 === 0) {
          p.moveTo(x0 + cx2 * cs, y0 + cy2 * cs + 0.5);
          p.lineTo(x0 + cx2 * cs + cs, y0 + cy2 * cs + 0.5);
        }
        p.stroke();
      }
      /* Top of the boards catches the lamp wherever the mass is exposed. */
      p.strokeStyle = C.rail;
      p.lineWidth = Math.max(1.4, cs * 0.07);
      for (i = 0; i < cells; i += 1) {
        if (!wall[i] || isWall(i % w, Math.floor(i / w) - 1)) {
          continue;
        }
        cx2 = i % w;
        cy2 = Math.floor(i / w);
        p.beginPath();
        p.moveTo(x0 + cx2 * cs + 1, y0 + cy2 * cs + 1);
        p.lineTo(x0 + cx2 * cs + cs - 1, y0 + cy2 * cs + 1);
        p.stroke();
      }
      /* Chipped ice flung up against the boards. */
      p.fillStyle = C.snow;
      p.globalAlpha = 0.5;
      for (i = 0; i < cells; i += 1) {
        if (!wall[i]) {
          continue;
        }
        var px2 = x0 + (i % w) * cs;
        var py2 = y0 + Math.floor(i / w) * cs;
        for (var k2 = 0; k2 < 3; k2 += 1) {
          var rx = px2 + rnd() * cs;
          var ry = py2 + rnd() * cs;
          p.beginPath();
          p.arc(rx, ry, 0.6 + rnd() * 1.5, 0, Math.PI * 2);
          p.fill();
        }
      }
      p.globalAlpha = 1;

      /* Every ice/wall boundary gets the kickplate, the rail and a snow bank. */
      for (i = 0; i < cells; i += 1) {
        if (!wall[i]) {
          continue;
        }
        cx2 = i % w;
        cy2 = Math.floor(i / w);
        var bx = x0 + cx2 * cs;
        var by = y0 + cy2 * cs;
        if (!isWall(cx2, cy2 + 1)) {
          drawEdgeDecor(p, "bottom", bx, by + cs, cs, 0);
        }
        if (!isWall(cx2, cy2 - 1)) {
          drawEdgeDecor(p, "top", bx, by, cs, 0);
        }
        if (!isWall(cx2 + 1, cy2)) {
          drawEdgeDecor(p, "right", bx + cs, by, 0, cs);
        }
        if (!isWall(cx2 - 1, cy2)) {
          drawEdgeDecor(p, "left", bx, by, 0, cs);
        }
      }

      /* The deep rinks' snowdrifts: a ride ends on one, so a drift is a stop
       * point, not decoration - heaped snow on open ice, legible in both
       * themes and dead centre of the cell the solver stops on. */
      for (i = 0; i < cells; i += 1) {
        if (!drifts[i]) {
          continue;
        }
        var dcx = x0 + (i % w) * cs + cs / 2;
        var dcy = y0 + Math.floor(i / w) * cs + cs / 2;
        var jx = ((i * 37) % 7) - 3;
        var jy = ((i * 53) % 5) - 2;
        p.fillStyle = C.cast;
        p.globalAlpha = 0.5;
        p.beginPath();
        p.arc(dcx + jx * 0.4, dcy + cs * 0.14, cs * 0.26, 0, Math.PI * 2);
        p.fill();
        p.globalAlpha = 1;
        p.fillStyle = C.snow;
        for (var b2 = 0; b2 < 3; b2 += 1) {
          var bang = (Math.PI * 2 * b2) / 3 + (i % 2 ? 0.5 : 0);
          p.beginPath();
          p.arc(
            dcx + jx * 0.4 + Math.cos(bang) * cs * 0.13,
            dcy + jy * 0.4 + Math.sin(bang) * cs * 0.09 - cs * 0.02,
            cs * (0.12 + (b2 % 2) * 0.05),
            0, Math.PI * 2,
          );
          p.fill();
        }
        p.strokeStyle = C.rim;
        p.globalAlpha = 0.35;
        p.lineWidth = Math.max(0.8, cs * 0.04);
        p.beginPath();
        p.arc(dcx + jx * 0.4, dcy + jy * 0.4, cs * 0.24, 0, Math.PI * 2);
        p.stroke();
        p.globalAlpha = 1;
      }

      /* Goal: a face-off circle etched into the ice, always there. */
      var gc = pointAt(goal % w, Math.floor(goal / w));
      p.strokeStyle = C.paint;
      p.lineWidth = Math.max(1.2, cs * 0.07);
      p.beginPath();
      p.arc(gc[0], gc[1], cs * 0.34, 0, Math.PI * 2);
      p.stroke();
      p.lineWidth = Math.max(1, cs * 0.05);
      p.beginPath();
      p.moveTo(gc[0] - cs * 0.44, gc[1]);
      p.lineTo(gc[0] + cs * 0.44, gc[1]);
      p.moveTo(gc[0], gc[1] - cs * 0.44);
      p.lineTo(gc[0], gc[1] + cs * 0.44);
      p.stroke();
      p.fillStyle = C.paint;
      for (i = 0; i < 4; i += 1) {
        var ta = (Math.PI / 2) * i + Math.PI / 4;
        p.beginPath();
        p.arc(gc[0] + Math.cos(ta) * cs * 0.28, gc[1] + Math.sin(ta) * cs * 0.28, cs * 0.045, 0, Math.PI * 2);
        p.fill();
      }

      /* Star sockets stay in the ice after the glyph is taken. */
      p.strokeStyle = C.paint;
      p.setLineDash([cs * 0.14, cs * 0.14]);
      p.lineWidth = Math.max(1, cs * 0.05);
      for (i = 0; i < stars.length; i += 1) {
        var sc = pointAt(stars[i] % w, Math.floor(stars[i] / w));
        p.beginPath();
        p.arc(sc[0], sc[1], cs * 0.3, 0, Math.PI * 2);
        p.stroke();
      }
      p.setLineDash([]);
      p.restore();

      rr(p, S.x, S.y, S.w, S.h, 11);
      p.strokeStyle = C.iceEdge;
      p.lineWidth = 2;
      p.stroke();
    }

    /* -------------------------------------------------------------- the scene */
    function seedFlakes() {
      flakes = [];
      var count = calm() ? 8 : 16;
      for (var i = 0; i < count; i += 1) {
        flakes.push({
          x: Math.random() * glideSize,
          y: Math.random() * viewH,
          r: 0.7 + Math.random() * 1.5,
          vy: 5 + Math.random() * 12,
          vx: (Math.random() - 0.5) * 8,
          ph: Math.random() * 6.28,
        });
      }
    }

    function spawnChips(x, y, dirX, dirY, count, power, warm) {
      for (var i = 0; i < count; i += 1) {
        var spread = (Math.random() - 0.5) * 1.5;
        var vx = -dirX * power * (0.35 + Math.random() * 0.8) - dirY * spread * power * 0.5;
        var vy = -dirY * power * (0.35 + Math.random() * 0.8) - dirX * spread * power * 0.5;
        chips.push({
          x: x,
          y: y,
          vx: vx,
          vy: vy - 12 * Math.random(),
          born: Date.now(),
          life: 260 + Math.random() * 320,
          r: cs * (0.045 + Math.random() * 0.075),
          warm: !!warm,
        });
        if (chips.length > 150) {
          chips.shift();
        }
      }
    }

    function drawGrooves(now) {
      var C = PAL;
      ctx.lineCap = "round";
      for (var i = 0; i < marks.length; i += 1) {
        var m = marks[i];
        var age = (now - m.born) / m.life;
        if (age >= 1) {
          continue;
        }
        var fade = Math.pow(1 - age, 1.6);
        ctx.strokeStyle = C.groove;
        ctx.globalAlpha = 0.34 * fade;
        ctx.lineWidth = cs * 0.42 * (0.5 + 0.5 * fade);
        ctx.beginPath();
        ctx.moveTo(m.x1, m.y1);
        ctx.lineTo(m.x2, m.y2);
        ctx.stroke();
        ctx.strokeStyle = C.chip;
        ctx.globalAlpha = 0.3 * fade;
        ctx.lineWidth = Math.max(1, cs * 0.08);
        ctx.beginPath();
        ctx.moveTo(m.x1, m.y1);
        ctx.lineTo(m.x2, m.y2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      if (run) {
        /* The groove being cut right now, from the push-off to the skate. */
        var pos = skaterPos(now);
        var a = pointAt(run.sx, run.sy);
        var b = pointAt(pos.x, pos.y);
        var grad = ctx.createLinearGradient(a[0], a[1], b[0], b[1]);
        grad.addColorStop(0, "hsla(" + PAL.hue + ", 60%, 100%, 0.06)");
        grad.addColorStop(1, "hsla(" + PAL.hue + ", 60%, 100%, 0.42)");
        ctx.strokeStyle = grad;
        ctx.lineWidth = cs * 0.4;
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.stroke();
      }
    }

    function drawChips(now) {
      var C = PAL;
      for (var i = 0; i < chips.length; i += 1) {
        var c = chips[i];
        var age = (now - c.born) / c.life;
        if (age > 1) {
          continue;
        }
        ctx.globalAlpha = Math.pow(1 - age, 1.4);
        ctx.fillStyle = c.warm ? C.starCore : C.chip;
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r * (1 - age * 0.4), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      for (var q = 0; q < puffs.length; q += 1) {
        var pf = puffs[q];
        var pk = (now - pf.t0) / pf.dur;
        if (pk > 1) {
          continue;
        }
        ctx.strokeStyle = pf.hue === "warm" ? C.starGlow : C.snow;
        ctx.globalAlpha = 0.55 * Math.pow(1 - pk, 1.5);
        ctx.lineWidth = Math.max(1, cs * 0.09 * (1 - pk));
        ctx.beginPath();
        ctx.arc(pf.x, pf.y, cs * (0.18 + pk * 0.5), 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = C.snow;
        ctx.globalAlpha = 0.28 * Math.pow(1 - pk, 2);
        for (var s2 = 0; s2 < 5; s2 += 1) {
          var ang = (Math.PI * 2 * s2) / 5 + pf.seed;
          ctx.beginPath();
          ctx.arc(pf.x + Math.cos(ang) * cs * 0.3 * pk, pf.y + Math.sin(ang) * cs * 0.22 * pk, cs * 0.13 * (1 - pk * 0.6), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }

    function drawGoal(now) {
      var C = PAL;
      var open = allCollected() || !stars.length;
      var gc = pointAt(goal % w, Math.floor(goal / w));
      var beat = (now % 1400) / 1400;
      if (!open) {
        /* Shut: a flat ring plus the number of stars still wanted, so the
         * lock is legible without leaning on the colour. */
        ctx.strokeStyle = C.goalShut;
        ctx.lineWidth = Math.max(1.6, cs * 0.09);
        ctx.setLineDash([cs * 0.2, cs * 0.16]);
        ctx.beginPath();
        ctx.arc(gc[0], gc[1], cs * 0.3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = C.paint;
        ctx.font = "800 " + Math.round(cs * 0.44) + 'px "JetBrains Mono", monospace';
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(stars.length - collectedCount()), gc[0], gc[1] + cs * 0.04);
        starPath(ctx, gc[0] + cs * 0.26, gc[1] - cs * 0.24, cs * 0.12, 0.3);
        ctx.fillStyle = C.goalShut;
        ctx.fill();
        return;
      }
      /* Open: the ring breathes, dashes wheel round it, a beacon lifts. */
      var pulse = 0.55 + Math.sin(now / 260) * 0.25;
      var beam = ctx.createRadialGradient(gc[0], gc[1], cs * 0.05, gc[0], gc[1], cs * 0.9);
      beam.addColorStop(0, C.goalBeacon);
      beam.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalAlpha = 0.35 + pulse * 0.25;
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.arc(gc[0], gc[1], cs * 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = C.goalOpen;
      ctx.lineWidth = Math.max(2, cs * 0.11);
      ctx.beginPath();
      ctx.arc(gc[0], gc[1], cs * (0.3 + pulse * 0.03), 0, Math.PI * 2);
      ctx.stroke();
      ctx.save();
      ctx.translate(gc[0], gc[1]);
      ctx.rotate(beat * Math.PI * 2);
      ctx.strokeStyle = C.goalOpen;
      ctx.lineWidth = Math.max(1.2, cs * 0.06);
      for (var i = 0; i < 6; i += 1) {
        var a = (Math.PI / 3) * i;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * cs * 0.38, Math.sin(a) * cs * 0.38);
        ctx.lineTo(Math.cos(a) * cs * 0.5, Math.sin(a) * cs * 0.5);
        ctx.stroke();
      }
      ctx.restore();
      /* A ring leaving the circle on every beat says "come here". */
      ctx.globalAlpha = 0.5 * (1 - beat);
      ctx.strokeStyle = C.goalOpen;
      ctx.lineWidth = Math.max(1, cs * 0.05);
      ctx.beginPath();
      ctx.arc(gc[0], gc[1], cs * (0.3 + beat * 0.34), 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    function drawStars(now) {
      var C = PAL;
      for (var i = 0; i < stars.length; i += 1) {
        var cellIdx = stars[i];
        var sc = pointAt(cellIdx % w, Math.floor(cellIdx / w));
        var born = collected[cellIdx] ? collectedAt[cellIdx] || 0 : 0;
        if (collected[cellIdx]) {
          var gone = (now - born) / 420;
          if (gone >= 1) {
            continue;
          }
          /* Taken: the glyph punches out of the socket in a burst of glitter. */
          ctx.globalAlpha = 1 - gone;
          starPath(ctx, sc[0], sc[1] - cs * 0.55 * gone, cs * 0.22 * (1 + gone), gone * 3);
          ctx.fillStyle = C.starMid;
          ctx.fill();
          ctx.globalAlpha = 1;
          continue;
        }
        var inT = Math.max(0, Math.min(1, (now - dealtAt - i * 70) / 260));
        if (inT <= 0) {
          continue;
        }
        var pop = 0.4 + 0.6 * (1 - Math.pow(1 - inT, 3));
        var bob = Math.sin(now / 520 + i * 1.7) * cs * 0.05;
        var r = cs * 0.24 * pop;
        ctx.save();
        ctx.translate(sc[0], sc[1] + bob);
        var shade = ctx.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.1, 0, 0, r * 1.5);
        shade.addColorStop(0, C.starCore);
        shade.addColorStop(1, C.starMid);
        ctx.shadowColor = C.starGlow;
        ctx.shadowBlur = cs * 0.5 * pop;
        starPath(ctx, 0, 0, r, now / 1600 + i);
        ctx.fillStyle = shade;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = C.starEdge;
        ctx.lineWidth = Math.max(1, r * 0.16);
        ctx.stroke();
        starPath(ctx, 0, 0, r * 0.55, now / 1600 + i);
        ctx.strokeStyle = "rgba(255,255,255,0.5)";
        ctx.lineWidth = Math.max(0.6, r * 0.1);
        ctx.stroke();
        ctx.restore();
      }
    }

    /* Where the skate is right now, in cells. */
    function skaterPos(now) {
      if (!run) {
        return { x: player % w, y: Math.floor(player / w), k: 1, speed: 0 };
      }
      var k = (now - run.t0) / run.dur;
      if (k < 0) {
        k = 0;
      }
      if (k > 1) {
        k = 1;
      }
      var e = skidEase(k);
      return {
        x: run.sx + (run.ex - run.sx) * e,
        y: run.sy + (run.ey - run.sy) * e,
        k: k,
        speed: run.steps > 1 ? 1 - Math.pow(k, 2) * 0.35 : 0,
      };
    }

    function bodyAt(x, y, r, alpha) {
      var C = PAL;
      ctx.globalAlpha = alpha;
      var g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.45, r * 0.15, x, y, r * 1.1);
      g.addColorStop(0, C.bodyHi);
      g.addColorStop(0.6, C.body);
      g.addColorStop(1, C.bodyLo);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    function drawSkater(now) {
      var C = PAL;
      var pos = skaterPos(now);
      var at = pointAt(pos.x, pos.y);
      var dirX = run ? Math.sign(run.ex - run.sx) || facing[0] : facing[0];
      var dirY = run ? Math.sign(run.ey - run.sy) || facing[1] : facing[1];
      var r = cs * 0.3;
      var push = 0;
      if (nudge) {
        var nk = (now - nudge.t0) / 220;
        if (nk >= 1) {
          nudge = null;
        } else {
          push = Math.sin(nk * Math.PI) * cs * 0.12;
          dirX = nudge.dx;
          dirY = nudge.dy;
        }
      }
      var squash = 0;
      var sq = (now - settleAt) / 200;
      if (sq >= 0 && sq < 1) {
        squash = Math.pow(1 - sq, 2) * 0.34;
      }
      var bob = pos.speed > 0 ? 0 : Math.sin(now / 620) * cs * 0.022;
      var px = at[0] + dirX * push;
      var py = at[1] + dirY * push + bob;
      var parallel = 1 - squash * 0.55;
      var across = 1 + squash * 0.42;
      var sx = Math.abs(dirX) > 0 ? parallel : across;
      var sy = Math.abs(dirX) > 0 ? across : parallel;

      /* Motion blur: a smear along the run plus ghosted bodies behind it. */
      if (run && !motionOff()) {
        var tail = skidEase(Math.max(0, pos.k - 0.2));
        var tx = run.sx + (run.ex - run.sx) * tail;
        var ty = run.sy + (run.ey - run.sy) * tail;
        var from = pointAt(tx, ty);
        var smear = ctx.createLinearGradient(from[0], from[1], at[0], at[1]);
        smear.addColorStop(0, "hsla(" + C.hue + ", 80%, 70%, 0)");
        smear.addColorStop(1, C.blur);
        ctx.fillStyle = smear;
        ctx.strokeStyle = smear;
        ctx.lineCap = "round";
        ctx.lineWidth = r * 1.7;
        ctx.beginPath();
        ctx.moveTo(from[0], from[1]);
        ctx.lineTo(at[0], at[1]);
        ctx.stroke();
        for (var i = 1; i <= 4; i += 1) {
          var gk = skidEase(Math.max(0, pos.k - i * 0.06));
          var gp = pointAt(run.sx + (run.ex - run.sx) * gk, run.sy + (run.ey - run.sy) * gk);
          bodyAt(gp[0], gp[1], r * (1 - i * 0.09), 0.2 - i * 0.035);
        }
      }

      /* Cast shadow on the ice. */
      ctx.fillStyle = C.cast;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(px + cs * 0.06, py + cs * 0.16, r * (sx + across) * 0.44, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate((dirX !== 0 ? 0 : dirY * 0.1) + (dirX !== 0 ? dirX * 0.06 * (1 + pos.speed) : 0));
      ctx.scale(sx, sy);
      /* Scarf trails opposite the travel, and streams out on a long run. */
      var scarfLen = cs * (0.26 + 0.55 * pos.speed);
      ctx.strokeStyle = C.scarf;
      ctx.lineWidth = Math.max(1.6, cs * 0.11);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-dirX * r * 0.5, -dirY * r * 0.5);
      ctx.quadraticCurveTo(
        -dirX * scarfLen * 0.7 + Math.sin(now / 180) * cs * 0.06 - dirY * cs * 0.1,
        -dirY * scarfLen * 0.7 + Math.cos(now / 210) * cs * 0.06 + dirX * cs * 0.1,
        -dirX * scarfLen - dirY * Math.sin(now / 160) * cs * 0.08,
        -dirY * scarfLen + dirX * Math.sin(now / 160) * cs * 0.08,
      );
      ctx.stroke();
      bodyAt(0, 0, r, 1);
      ctx.strokeStyle = C.rim;
      ctx.lineWidth = Math.max(1, cs * 0.045);
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
      /* Blades: two short bright runners under the feet, square to travel. */
      ctx.strokeStyle = C.skin;
      ctx.lineWidth = Math.max(1, cs * 0.055);
      var perpX = dirY !== 0 ? 1 : 0;
      var perpY = dirX !== 0 ? 1 : 0;
      for (var b = -1; b <= 1; b += 2) {
        ctx.beginPath();
        ctx.moveTo(perpX * r * 0.5 * b - dirX * r * 0.35, perpY * r * 0.55 * b - dirY * r * 0.35);
        ctx.lineTo(perpX * r * 0.5 * b + dirX * r * 0.4, perpY * r * 0.55 * b + dirY * r * 0.4);
        ctx.stroke();
      }
      /* Eyes look where the run is going. */
      ctx.fillStyle = C.skin;
      var ex = dirX * r * 0.34;
      var ey = dirY * r * 0.34;
      for (var e2 = -1; e2 <= 1; e2 += 2) {
        ctx.beginPath();
        ctx.arc(ex + (dirY !== 0 ? e2 * r * 0.3 : 0), ey + (dirX !== 0 ? e2 * r * 0.3 : 0), Math.max(1, r * 0.17), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    function drawGuides(now) {
      if (moves !== 0 || solved || run) {
        return;
      }
      /* The waiting state teaches the one rule that matters: you stop at walls. */
      var C = PAL;
      var at = pointAt(player % w, Math.floor(player / w));
      var beat = 0.4 + Math.sin(now / 400) * 0.18;
      for (var d = 0; d < 4; d += 1) {
        var res = slideFrom(player % w, Math.floor(player / w), GLIDE_DIRS[d]);
        if (!res.steps) {
          continue;
        }
        var end = pointAt(res.x, res.y);
        ctx.strokeStyle = "hsla(" + C.hue + ", 80%, 76%, " + beat * 0.5 + ")";
        ctx.lineWidth = Math.max(1, cs * 0.05);
        ctx.setLineDash([cs * 0.18, cs * 0.2]);
        ctx.beginPath();
        ctx.moveTo(at[0] + GLIDE_DIRS[d][0] * cs * 0.42, at[1] + GLIDE_DIRS[d][1] * cs * 0.42);
        ctx.lineTo(end[0], end[1]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeStyle = "hsla(" + C.hue + ", 84%, 80%, " + (beat + 0.2) + ")";
        ctx.lineWidth = Math.max(1.2, cs * 0.06);
        ctx.beginPath();
        ctx.arc(end[0], end[1], cs * 0.2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(end[0] - cs * 0.1, end[1] - cs * 0.1);
        ctx.lineTo(end[0] + cs * 0.1, end[1] + cs * 0.1);
        ctx.moveTo(end[0] + cs * 0.1, end[1] - cs * 0.1);
        ctx.lineTo(end[0] - cs * 0.1, end[1] + cs * 0.1);
        ctx.stroke();
      }
    }

    function drawHover(now) {
      if (!hover || solved || run) {
        return;
      }
      var C = PAL;
      var d = GLIDE_DIRS[hover];
      var res = slideFrom(player % w, Math.floor(player / w), d);
      if (!res.steps) {
        return;
      }
      var at = pointAt(player % w, Math.floor(player / w));
      var end = pointAt(res.x, res.y);
      ctx.save();
      ctx.strokeStyle = "hsla(" + C.hue + ", 90%, 82%, 0.7)";
      ctx.lineWidth = Math.max(1.4, cs * 0.07);
      ctx.setLineDash([cs * 0.22, cs * 0.18]);
      ctx.lineDashOffset = -(now / 26) % 100;
      ctx.beginPath();
      ctx.moveTo(at[0], at[1]);
      ctx.lineTo(end[0], end[1]);
      ctx.stroke();
      ctx.setLineDash([]);
      /* Where the skate will fetch up: a bracket, not a filled cell. */
      var br = cs * 0.3;
      ctx.beginPath();
      for (var i = 0; i < 4; i += 1) {
        var ang = (Math.PI / 2) * i;
        var ox = Math.cos(ang) * br;
        var oy = Math.sin(ang) * br;
        ctx.moveTo(end[0] + ox - Math.cos(ang + 1.2) * br * 0.5, end[1] + oy - Math.sin(ang + 1.2) * br * 0.5);
        ctx.lineTo(end[0] + ox, end[1] + oy);
        ctx.lineTo(end[0] + ox - Math.cos(ang - 1.2) * br * 0.5, end[1] + oy - Math.sin(ang - 1.2) * br * 0.5);
      }
      ctx.stroke();
      ctx.restore();
    }

    function drawFlakes(now, dt) {
      var C = PAL;
      ctx.fillStyle = C.flake;
      for (var i = 0; i < flakes.length; i += 1) {
        var f = flakes[i];
        f.y += (f.vy * dt) / 1000;
        f.x += ((f.vx + Math.sin(now / 900 + f.ph) * 6) * dt) / 1000;
        if (f.y > viewH + 2) {
          f.y = -2;
          f.x = Math.random() * glideSize;
        }
        if (f.x > glideSize + 2) {
          f.x = -2;
        } else if (f.x < -2) {
          f.x = glideSize + 2;
        }
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function drawDeal(now) {
      var k = (now - dealtAt) / 620;
      if (k < 0 || k > 1) {
        return;
      }
      /* Fresh sheet: the lamp sweeps down the rink as the boards go up. */
      var S = sheet();
      var sweep = Math.pow(k, 0.75);
      var cxp = S.x - S.w * 0.4 + sweep * S.w * 1.8;
      var band = ctx.createLinearGradient(cxp - cs * 2.2, 0, cxp + cs * 2.2, 0);
      band.addColorStop(0, "rgba(255,255,255,0)");
      band.addColorStop(0.5, "rgba(255,255,255," + 0.3 * (1 - k) + ")");
      band.addColorStop(1, "rgba(255,255,255,0)");
      ctx.save();
      rr(ctx, S.x, S.y, S.w, S.h, 11);
      ctx.clip();
      ctx.fillStyle = band;
      ctx.fillRect(S.x, S.y, S.w, S.h);
      ctx.restore();
    }

    function draw() {
      ensurePalette();
      var key = [w, h, level.id, goal, stars.join("."), drifts.join("."), PAL.hue, PAL.light ? 1 : 0, scale.toFixed(2), viewH].join("|");
      if (key !== plateKey) {
        plateKey = key;
        buildPlate();
      }
      var now = Date.now();
      ctx.clearRect(0, 0, glideSize, viewH);
      ctx.drawImage(plate, 0, 0, glideSize, viewH);
      drawGrooves(now);
      drawHover(now);
      drawGuides(now);
      drawGoal(now);
      drawStars(now);
      drawChips(now);
      drawSkater(now);
      drawDeal(now);
      if (!motionOff()) {
        drawFlakes(now, 16);
      }
    }

    /* ------------------------------------------------------------------ HUD */
    var movesChip = movesEl.parentNode;
    var starsChip = starsEl.parentNode;
    var board = document.createElement("div");
    board.className = "gl-board";
    var boardCap = document.createElement("div");
    boardCap.className = "gl-board-cap";
    var markSlot = document.createElement("span");
    markSlot.className = "gl-mark";
    if (art && art.icon) {
      markSlot.appendChild(art.icon("target", { hue: 196, size: 17 }));
    }
    var capLabel = document.createElement("span");
    capLabel.className = "gl-cap-label";
    capLabel.textContent = t("hudPar");
    var parValue = document.createElement("strong");
    parValue.className = "gl-par-value";
    boardCap.appendChild(markSlot);
    boardCap.appendChild(capLabel);
    boardCap.appendChild(parValue);
    var track = document.createElement("div");
    track.className = "gl-meter";
    track.setAttribute("aria-hidden", "true");
    var deltaEl = document.createElement("div");
    deltaEl.className = "gl-delta";
    var deltaValue = document.createElement("strong");
    deltaValue.className = "gl-delta-value";
    deltaValue.textContent = "E";
    var deltaMark = document.createElement("span");
    deltaMark.className = "gl-mark gl-mark-flag";
    if (art && art.icon) {
      deltaMark.appendChild(art.icon("flag", { hue: 14, size: 15 }));
    }
    deltaEl.appendChild(deltaValue);
    deltaEl.appendChild(deltaMark);
    board.appendChild(boardCap);
    board.appendChild(track);
    board.appendChild(deltaEl);

    /* The panel ships a bare canvas; the stage gives the rink boards to sit in,
     * a frost veil over the glass and one anchor for position-accurate fx. */
    var stage = document.createElement("div");
    stage.className = "gl-stage";
    var veil = document.createElement("div");
    veil.className = "gl-veil";
    var anchor = document.createElement("div");
    anchor.className = "gl-anchor";
    var host = canvas.parentNode;
    if (host && host.insertBefore) {
      host.insertBefore(stage, canvas);
      stage.appendChild(canvas);
      stage.appendChild(veil);
      stage.appendChild(anchor);
    }
    if (panel && stage.parentNode === panel) {
      panel.insertBefore(board, stage);
    } else if (host && host.insertBefore) {
      host.insertBefore(board, host === stage ? stage : canvas.parentNode === host ? stage : board.parentNode);
    }
    var pipEls = [];

    function buildPips() {
      while (track.firstChild) {
        track.removeChild(track.firstChild);
      }
      pipEls = [];
      var count = Math.max(1, Math.min(par, 24));
      for (var i = 0; i < count; i += 1) {
        var pip = document.createElement("i");
        pip.className = "gl-pip";
        track.appendChild(pip);
        pipEls.push(pip);
      }
    }

    /* The live over/under count: golf shorthand, so it reads the same in both
     * languages and never leans on colour alone. */
    function paintBoard(bump) {
      parValue.textContent = String(par);
      var gap = moves - par;
      deltaValue.textContent = gap === 0 ? "E" : gap > 0 ? "+" + gap : "\u2212" + -gap;
      board.className = "gl-board" + (gap > 0 ? " is-over" : gap < 0 ? " is-under" : " is-even");
      for (var i = 0; i < pipEls.length; i += 1) {
        pipEls[i].className = "gl-pip" + (i < moves ? " is-used" : "") + (i === moves - 1 ? " is-now" : "");
      }
      if (movesChip && movesChip.classList) {
        movesChip.className = "game-stat" + (gap > 0 ? " is-warn" : gap < 0 ? " is-good" : "");
      }
      if (bump) {
        fx.pop(deltaEl, { scale: 1.24, ms: 240 });
      }
    }

    function writeHud() {
      movesEl.textContent = String(moves);
      starsEl.textContent = collectedCount() + "/" + stars.length;
      if (starsChip && starsChip.classList) {
        starsChip.className = "game-stat" + (stars.length && collectedCount() === stars.length ? " is-good" : "");
      }
    }

    function renderHud() {
      var text = clockRunning ? ((Date.now() - startedAt) / 1000).toFixed(1) + "s" : timeEl.textContent;
      if (text !== lastTimeText) {
        lastTimeText = text;
        timeEl.textContent = text;
      }
    }

    function collectedCount() {
      var got = 0;
      for (var i = 0; i < stars.length; i += 1) {
        if (collected[stars[i]]) {
          got += 1;
        }
      }
      return got;
    }

    function allCollected() {
      return stars.every(function (s) {
        return collected[s];
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

    /* fx hangs effects off an element's box, so this hidden stud is parked over
     * the cell an action happened on - rings and particles land on the tile
     * instead of on the middle of the rink. */
    function anchorAt(logicalX, logicalY) {
      var rect = canvas.getBoundingClientRect();
      /* The sheet makes the stage the anchor's offset parent, so the fx stud
       * is placed in stage space - it wraps the canvas exactly. */
      var prect = stage && stage.getBoundingClientRect ? stage.getBoundingClientRect() : rect;
      if (!rect.width || !rect.height) {
        return anchor;
      }
      anchor.style.left = Math.round(rect.left - prect.left + (logicalX / glideSize) * rect.width - 10) + "px";
      anchor.style.top = Math.round(rect.top - prect.top + (logicalY / viewH) * rect.height - 10) + "px";
      return anchor;
    }

    function anchorCell(cx, cy) {
      var at = pointAt(cx, cy);
      return anchorAt(at[0], at[1]);
    }

    /* ------------------------------------------------------------------ deal */
    function loadLevel(levelDef) {
      level = levelDef;
      var deal = level.drifts
        ? glideDriftTrailGenerate(level.w, level.h, level.stars, level.minPar, level.maxPar, level.density, level.drifts)
        : level.trail
          ? glideTrailGenerate(level.w, level.h, level.stars, level.minPar, level.maxPar, level.density)
          : glideGenerate(level.w, level.h, level.stars, level.minPar, level.maxPar);
      w = level.w;
      h = level.h;
      wall = deal.wall;
      player = deal.start;
      goal = deal.goal;
      stars = deal.stars;
      drifts = deal.drifts || [];
      collected = {};
      collectedAt = {};
      par = deal.par;
      moves = 0;
      solved = false;
      facing = [1, 0];
      clockRunning = false;
      startedAt = Date.now();
      run = null;
      marks = [];
      chips = [];
      puffs = [];
      hover = null;
      nudge = null;
      dealSeq += 1;
      syncSize();
      writeHud();
      renderHud();
      buildPips();
      paintBoard(false);
      refreshPicker();
      dealtAt = Date.now();
      settleAt = -9999;
      seedFlakes();
      resultEl.className = "game-result";
      resultEl.textContent = t("glReady", { n: par });
      lastResult = resultEl.textContent;
      startLoop();
      draw();
      if (motionOff()) {
        return;
      }
      play("splash");
      fx.sweep(stage);
      fx.stagger(pipEls, { kind: "drop", step: 24 });
      fx.callout(stage, t("glGo"));
    }

    /* --------------------------------------------------------------- the run */
    function blocked(dirIndex) {
      var d = GLIDE_DIRS[dirIndex];
      nudge = { dx: d[0], dy: d[1], t0: Date.now() };
      var at = pointAt(player % w, Math.floor(player / w));
      wallTap = { x: at[0] + d[0] * cs * 0.55, y: at[1] + d[1] * cs * 0.55, t0: Date.now() };
      fx.shake(stage, { dist: 5 });
      play("miss");
      draw();
    }

    function requestSlide(dirIndex) {
      if (solved) {
        return;
      }
      var seq = dealSeq;
      if (run) {
        landRun();
        if (dealSeq !== seq || solved) {
          draw();
          return;
        }
      }
      var d = GLIDE_DIRS[dirIndex];
      var from = { x: player % w, y: Math.floor(player / w) };
      var res = slideFrom(from.x, from.y, d);
      if (!res.steps) {
        blocked(dirIndex);
        return;
      }
      facing = d;
      var before = moves;
      moves += 1;
      if (!clockRunning) {
        clockRunning = true;
        startedAt = Date.now();
      }
      fx.countUp(movesEl, before, moves);
      paintBoard(true);
      renderHud();
      if (motionOff() || calm() && res.steps === 1) {
        player = res.y * w + res.x;
        settleAt = Date.now();
        landRun();
        return;
      }
      run = {
        sx: from.x,
        sy: from.y,
        ex: res.x,
        ey: res.y,
        dx: d[0],
        dy: d[1],
        steps: res.steps,
        t0: Date.now(),
        dur: Math.min(430, 130 + res.steps * 38) * (calm() ? 0.6 : 1),
      };
      /* The landing is armed on a timer, not on a frame, so a run still commits
       * in an environment where requestAnimationFrame never calls back. */
      var timer = run.t0 + run.dur;
      later(function () {
        landRun();
        draw();
      }, run.dur + 8);
      play("shoot");
      draw();
    }

    function landRun() {
      if (!run) {
        return;
      }
      var r = run;
      run = null;
      player = r.ey * w + r.ex;
      settleAt = Date.now();
      var a = pointAt(r.sx, r.sy);
      var b = pointAt(r.ex, r.ey);
      marks.push({ x1: a[0], y1: a[1], x2: b[0], y2: b[1], born: Date.now(), life: 3400 });
      while (marks.length > 8) {
        marks.shift();
      }
      var hard = r.steps >= 4 && !motionOff();
      if (!motionOff()) {
        spawnChips(b[0] - r.dx * cs * 0.3, b[1] - r.dy * cs * 0.3, r.dx, r.dy, hard ? 14 : 8, 0.22 * cs + r.steps * 3);
        puffs.push({ x: b[0], y: b[1], t0: Date.now(), dur: 460, seed: Math.random() * 6 });
        while (puffs.length > 4) {
          puffs.shift();
        }
      }
      play(hard ? "hit" : "land");
      fx.jolt(stage, { dist: hard ? 5 : 3 });
      if (hard) {
        fx.flash(canvas, { hue: PAL ? PAL.hue : 196 });
      }
      if (stars.indexOf(player) !== -1 && !collected[player]) {
        collect(player);
      }
      checkCleared();
    }

    function collect(cellIdx) {
      collected[cellIdx] = true;
      collectedAt[cellIdx] = Date.now();
      var before = collectedCount() - 1;
      var got = collectedCount();
      fx.countUp(starsEl, before, got, {
        format: function (v) {
          return v + "/" + stars.length;
        },
      });
      if (starsChip && starsChip.classList) {
        starsChip.className = "game-stat is-good";
      }
      var at = pointAt(cellIdx % w, Math.floor(cellIdx / w));
      var node = anchorAt(at[0], at[1]);
      play("coin");
      if (!motionOff()) {
        fx.ring(node, { hue: 46 });
        fx.burst(node, { kind: "star", count: 12, hue: 46 });
        fx.floatText(node, "\u2605", { kind: "good", rise: true });
        spawnChips(at[0], at[1], 0, -1, 10, 0.3 * cs);
        for (var i = 0; i < chips.length; i += 1) {
          if (chips[i].born >= Date.now() - 5) {
            chips[i].warm = true;
          }
        }
      }
      if (stars.length && got === stars.length && player !== goal) {
        var g = pointAt(goal % w, Math.floor(goal / w));
        fx.ring(anchorAt(g[0], g[1]), { hue: 96 });
        play("levelup");
      }
      if (!motionOff()) {
        later(draw, 60);
      }
    }

    var lastResult = "";

    function checkCleared() {
      if (solved || player !== goal || !allCollected()) {
        return;
      }
      solved = true;
      clockRunning = false;
      var starsWon = starsFor(moves, [par + 1, par + 3, par + 7], "low");
      if (starsWon <= 0) {
        starsWon = 1;
      }
      var outcome = campaign.record(level.id, {
        stars: starsWon,
        best: moves,
        better: "low",
      });
      var message = t("glCleared", { n: moves, stars: starsWon });
      if (outcome.isBest) {
        message += " " + t("newBest");
      }
      if (outcome.unlockedNext) {
        message += " " + t("glNextRink");
      } else if (campaign.clearedCount() === glideLevels.length) {
        message += " " + t("glCampaignDone");
      }
      logAction(t("logGlyphGlide", { n: moves }));
      var rect = startBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      var nextId = outcome.unlockedNext || level.id;
      /* Everything the ceremony says is read off the deal that just finished,
       * before the next one takes the board away. */
      var rinkName = t(level.labelKey);
      var parGap = moves - par;
      var lines = [
        message,
        t("hudPar") + " " + par + "  " + moves + "   " + (parGap === 0 ? "E" : parGap > 0 ? "+" + parGap : "\u2212" + -parGap),
      ];
      if (outcome.unlockedNext) {
        lines.push(t("glNextRink"));
      } else if (campaign.clearedCount() === glideLevels.length) {
        lines.push(t("glCampaignDone"));
      }
      var goalAt = pointAt(goal % w, Math.floor(goal / w));
      var goalNode = anchorAt(goalAt[0], goalAt[1]);
      loadLevel(glideLevels[campaign.indexOf(nextId)]);
      resultEl.className = "game-result is-win";
      resultEl.textContent = message;
      lastResult = message;
      if (motionOff()) {
        return;
      }
      fx.burst(goalNode, { kind: "confetti", count: 26, hue: 96 });
      later(function () {
        fx.ceremony(panel || stage, {
          tone: starsWon >= 3 ? "win" : "clear",
          stars: starsWon,
          title: rinkName,
          lines: lines,
        });
      }, 260);
    }

    /* ----------------------------------------------------------------- loop */
    var lastFrame = Date.now();

    function step(now) {
      var dt = Math.max(8, Math.min(64, now - lastFrame));
      lastFrame = now;
      if (run) {
        var pos = skaterPos(now);
        var at = pointAt(pos.x, pos.y);
        if (pos.k > 0.06 && pos.k < 0.98 && chips.length < 120) {
          spawnChips(at[0] - run.dx * cs * 0.28, at[1] - run.dy * cs * 0.28, run.dx, run.dy, 1, 0.12 * cs);
        }
        if (now - run.t0 >= run.dur) {
          landRun();
        }
      }
      for (var i = chips.length - 1; i >= 0; i -= 1) {
        var c = chips[i];
        if (now - c.born >= c.life) {
          chips.splice(i, 1);
          continue;
        }
        c.x += (c.vx * dt) / 1000;
        c.y += (c.vy * dt) / 1000;
        c.vy += dt * 0.09;
        c.vx *= 0.985;
      }
      for (var m = marks.length - 1; m >= 0; m -= 1) {
        if (now - marks[m].born >= marks[m].life) {
          marks.splice(m, 1);
        }
      }
      for (var pf = puffs.length - 1; pf >= 0; pf -= 1) {
        if (now - puffs[pf].t0 >= puffs[pf].dur) {
          puffs.splice(pf, 1);
        }
      }
      if (wallTap && now - wallTap.t0 > 300) {
        wallTap = null;
      }
    }

    function drawWallTap(now) {
      if (!wallTap) {
        return;
      }
      var k = (now - wallTap.t0) / 300;
      ctx.strokeStyle = "hsla(" + PAL.hue + ", 90%, 85%, " + 0.6 * (1 - k) + ")";
      ctx.lineWidth = Math.max(1, cs * 0.06);
      ctx.beginPath();
      ctx.arc(wallTap.x, wallTap.y, cs * (0.12 + k * 0.3), 0, Math.PI * 2);
      ctx.stroke();
    }

    function frame() {
      if (rafId === null) {
        return;
      }
      rafId = window.requestAnimationFrame(frame);
      var shown = !document.hidden && !(panel && panel.hidden);
      if (!shown) {
        lastShown = false;
        return;
      }
      if (!lastShown) {
        lastShown = true;
        /* The shell paused the tab and wrote its own line into the read-out;
         * coming back should show the rink's own news again. */
        if (lastResult && resultEl.textContent && resultEl.textContent.indexOf(t("glPaused").slice(0, 4)) === 0) {
          resultEl.textContent = lastResult;
        }
        syncSize();
      }
      if (document.documentElement.getAttribute("data-theme") !== lastTheme) {
        ensurePalette();
        syncSize();
      }
      if (motionOff()) {
        if (run) {
          landRun();
          draw();
        }
        return;
      }
      tick += 1;
      if (tick % 45 === 0) {
        syncSize();
      }
      var now = Date.now();
      if (clockRunning) {
        renderHud();
      }
      step(now);
      draw();
      drawWallTap(now);
    }

    function startLoop() {
      if (rafId !== null) {
        return;
      }
      lastFrame = Date.now();
      rafId = window.requestAnimationFrame(frame);
    }

    /* --------------------------------------------------------------- controls */
    var KEYMAP = { ArrowUp: 2, ArrowDown: 3, ArrowLeft: 1, ArrowRight: 0, w: 2, s: 3, a: 1, d: 0 };

    function localPoint(event) {
      var rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        return null;
      }
      return {
        x: ((event.clientX - rect.left) / rect.width) * glideSize,
        y: ((event.clientY - rect.top) / rect.height) * viewH,
      };
    }

    function cellUnder(point) {
      if (!point) {
        return null;
      }
      var c = Math.floor((point.x - x0) / cs);
      var r = Math.floor((point.y - y0) / cs);
      if (c < 0 || r < 0 || c >= w || r >= h) {
        return null;
      }
      return { x: c, y: r };
    }

    /* Tap a cell in the skater's row or column to ride that way. */
    function aimDir(cell) {
      if (!cell) {
        return undefined;
      }
      var px = player % w;
      var py = Math.floor(player / w);
      if (cell.y === py && cell.x !== px) {
        return cell.x > px ? 0 : 1;
      }
      if (cell.x === px && cell.y !== py) {
        return cell.y > py ? 3 : 2;
      }
      return undefined;
    }

    canvas.addEventListener("keydown", function (event) {
      var dir = KEYMAP[event.key];
      if (dir !== undefined) {
        event.preventDefault();
        requestSlide(dir);
      }
    });

    canvas.addEventListener("pointerdown", function (event) {
      event.preventDefault();
      if (canvas.focus) {
        canvas.focus();
      }
      var dir = aimDir(cellUnder(localPoint(event)));
      if (dir === undefined) {
        if (player !== 0 || moves) {
          blocked(facing[0] !== 0 || facing[1] !== 0 ? 0 : 0);
        }
        return;
      }
      hover = null;
      requestSlide(dir);
    });

    canvas.addEventListener("pointermove", function (event) {
      var dir = aimDir(cellUnder(localPoint(event)));
      if (dir === hover) {
        return;
      }
      hover = dir === undefined ? null : dir;
      if (!motionOff()) {
        return;
      }
      draw();
    });

    function forgetAim() {
      if (hover !== null) {
        hover = null;
        draw();
      }
    }

    canvas.addEventListener("pointerleave", forgetAim);
    canvas.addEventListener("pointercancel", forgetAim);

    selectEl.addEventListener("change", function () {
      var index = campaign.indexOf(selectEl.value);
      if (index >= 0 && campaign.isUnlocked(selectEl.value)) {
        play("select");
        loadLevel(glideLevels[index]);
      }
    });

    startBtn.addEventListener("click", function () {
      play("tap");
      loadLevel(level);
    });

    App.quietResetGlyphGlide = function () {
      clockRunning = false;
      if (run) {
        landRun();
      }
      dropTimers();
      chips = [];
      puffs = [];
      hover = null;
      lastShown = false;
      resultEl.textContent = t("glPaused");
      draw();
    };

    loadLevel(glideLevels[campaign.indexOf(campaign.nextLevelId())]);
  }


  /* Exported for the other modules. */
  App.initGlyphGlideGame = initGlyphGlideGame;
})(window.CapitalConvert = window.CapitalConvert || {});
