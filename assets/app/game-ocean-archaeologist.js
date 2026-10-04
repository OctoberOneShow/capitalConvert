/* Ocean Archaeologist - dive a wreck, then build it back.
 *
 * Two acts in one panel. The dive: a dark survey grid, a ping that reads nearby
 * cells plus any find's position and depth, and a strict air budget whose return
 * leg is a straight-line cost the HUD shows at any moment. Standing on a find you
 * either DOCUMENT it (slow, hungry on air - it records the berth, the depth and
 * what it lay beside) or LIFT it (fast, and the bag carries nothing but the gauge
 * reading; on a silt dive it loses even that).
 *
 * The load-bearing twist: the survey grid is drawn in cells and the wreck plan is
 * drawn in ship parts, so a position never names a berth - only a record does. A
 * hurried line still fills the display and still scores, but its ceiling is lower,
 * and neither line is mandatory.
 *
 * Turns happen on input only. rAF merely plays a ping ring out, the loop stops
 * with the drawer, and quietReset never discards a recovered fragment. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  var t = App.t;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  var createCampaign = App.createCampaign;
  var fillCampaignPicker = App.fillCampaignPicker;
  var starsFor = App.starsFor;

  var ocnWid = 360;
  var ocnHit = 264;
  var ocnLook = 1.5;
  var ocnParts = 10;
  var ocnDirs = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
  var ocnPolicies = ["doc", "lift", "value", "quick"];

  /* One row per dive: grid, find count, the slope that turns rows into depth, the
   * air economy, and the star bands.
   *
   * starQuality is MEASURED, never invented. Each band is the lowest score an
   * exported scripted line reached over a 360-seed sample of that level (the 60
   * probe seeds App.diveBeatable replays plus 300 deterministic extras), so the
   * probe clears every band by construction:
   *   [0] 3 stars = min App.divePlan, the best of the four lines, so the anchor is
   *       always reachable on a dealt wreck (ocnDeal filters on it);
   *   [1] 2 stars = min App.diveLiftLine - record nothing, bag all you can afford,
   *       keep the return reserve;
   *   [2] 1 star  = min App.diveQuickLine - a hurried sweep near the lift line that
   *       spends the air it should have kept for the ascent.
   * bays switches the plan from row bands to finds growing outward, which is what
   * makes depth stop separating fragments from dive 3 on. The air economy tightens
   * down the ladder: the share of the site's ceiling (3 points a find) the best
   * measured line still reaches falls 0.999, 0.940, 0.848, 0.710, 0.593, 0.501,
   * 0.473, 0.443, 0.410, 0.370 for d1..d10, so no later dive lets a weaker line
   * score what an earlier one managed. At air 64 dive 1 never scores below 11 of
   * its 12; at air 92 dive 10 never scores above 12 of its 30. */
  var ocnLevels = [
    { id: "d1", labelKey: "ocnZ1", w: 12, h: 9, finds: 4, base: 6, slope: 3, debris: 9, spread: 5, air: 64,
      pingRadius: 3, pingCost: 2, docCost: 4, liftCost: 2, silt: 0, bays: 0, ambig: 0, quickReach: 6, starQuality: [11, 8, 2] },
    { id: "d2", labelKey: "ocnZ2", w: 14, h: 10, finds: 5, base: 11, slope: 2, debris: 14, spread: 5, air: 81,
      pingRadius: 3, pingCost: 3, docCost: 5, liftCost: 2, silt: 0, bays: 0, ambig: 0, quickReach: 6, starQuality: [12, 8, 2] },
    { id: "d3", labelKey: "ocnZ3", w: 15, h: 11, finds: 6, base: 15, slope: 1, debris: 20, spread: 4, air: 87,
      pingRadius: 3, pingCost: 3, docCost: 5, liftCost: 2, silt: 0, bays: 1, ambig: 2, quickReach: 6, starQuality: [12, 5, 1] },
    { id: "d4", labelKey: "ocnZ4", w: 16, h: 12, finds: 7, base: 19, slope: 1, debris: 20, spread: 4, air: 94,
      pingRadius: 2, pingCost: 4, docCost: 6, liftCost: 3, silt: 1, bays: 1, ambig: 3, quickReach: 6, starQuality: [12, 5, 1] },
    { id: "d5", labelKey: "ocnZ5", w: 18, h: 13, finds: 10, base: 24, slope: 1, debris: 26, spread: 4, air: 120,
      pingRadius: 3, pingCost: 5, docCost: 7, liftCost: 3, silt: 0, bays: 1, ambig: 5, quickReach: 7, starQuality: [15, 7, 1] },
    { id: "d6", labelKey: "ocnZ6", w: 18, h: 13, finds: 10, base: 26, slope: 1, debris: 28, spread: 5, air: 112,
      pingRadius: 3, pingCost: 5, docCost: 8, liftCost: 3, silt: 0, bays: 1, ambig: 6, quickReach: 7, starQuality: [13, 6, 1] },
    { id: "d7", labelKey: "ocnZ7", w: 19, h: 14, finds: 10, base: 28, slope: 1, debris: 28, spread: 4, air: 104,
      pingRadius: 2, pingCost: 5, docCost: 8, liftCost: 3, silt: 0, bays: 1, ambig: 6, quickReach: 7, starQuality: [12, 6, 1] },
    { id: "d8", labelKey: "ocnZ8", w: 19, h: 14, finds: 10, base: 30, slope: 1, debris: 30, spread: 4, air: 100,
      pingRadius: 3, pingCost: 5, docCost: 8, liftCost: 3, silt: 1, bays: 1, ambig: 7, quickReach: 7, starQuality: [12, 5, 1] },
    { id: "d9", labelKey: "ocnZ9", w: 20, h: 14, finds: 10, base: 32, slope: 1, debris: 30, spread: 4, air: 100,
      pingRadius: 2, pingCost: 6, docCost: 8, liftCost: 3, silt: 0, bays: 1, ambig: 7, quickReach: 6, starQuality: [10, 4, 1] },
    { id: "d10", labelKey: "ocnZ10", w: 20, h: 14, finds: 10, base: 34, slope: 1, debris: 32, spread: 4, air: 92,
      pingRadius: 2, pingCost: 6, docCost: 9, liftCost: 3, silt: 1, bays: 1, ambig: 8, quickReach: 6, starQuality: [9, 4, 1] },
  ];

  /* --- pure core ---------------------------------------------------------
   * One linear congruential generator drives every roll, so a seed always replays
   * the same wreck and nothing in here ever calls Math.random. */
  function ocnRng(seed) {
    var state = ((Number(seed) || 1) >>> 0) + 1;
    return function next() {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }

  function ocnBlank(w, h, value) {
    var rows = [];
    for (var y = 0; y < h; y += 1) {
      var line = [];
      for (var x = 0; x < w; x += 1) { line.push(value); }
      rows.push(line);
    }
    return rows;
  }

  /* Accepts a level row or a bare grid side, and always hands back a full shape. */
  function ocnShape(side) {
    var row = side && typeof side === "object" && typeof side.w === "number" ? side : ocnLevels[0];
    var shape = {
      w: row.w, h: row.h, finds: row.finds, base: row.base, slope: row.slope,
      debris: row.debris, spread: row.spread, air: row.air, pingRadius: row.pingRadius,
      pingCost: row.pingCost, docCost: row.docCost, liftCost: row.liftCost, silt: row.silt,
      bays: row.bays, quickReach: row.quickReach, ambig: row.ambig || 0,
      starQuality: row.starQuality, id: row.id, labelKey: row.labelKey,
    };
    if (typeof side === "number" && side > 6) {
      shape.w = Math.max(9, Math.round(side));
      shape.h = Math.max(8, Math.round(side * 0.74));
      shape.finds = Math.max(3, Math.min(ocnParts, Math.round(side / 2)));
      shape.spread = 4;
      shape.air = Math.round(side * 6.6);
    }
    return shape;
  }

  /* The site tilts: depth is a straight function of the row, which is what makes
   * a gauge reading a usable - if imperfect - clue in the second act. */
  function ocnDepth(shape, y) { return shape.base + y * shape.slope; }

  /* Air for the ascent: the lift line pulls you to the boat in a straight line,
   * so the number is planable and never maze-dependent. */
  function ocnAscent(wreck, cell) {
    var dx = cell.x - wreck.entry.x;
    var dy = cell.y - wreck.entry.y;
    return Math.max(1, Math.ceil(Math.sqrt(dx * dx + dy * dy)));
  }

  /* Swim steps over open sand from any cell; -1 means unreachable. */
  function ocnField(target, from) {
    var w = target.w;
    var h = target.h;
    var grid = target.grid;
    var dist = ocnBlank(w, h, -1);
    var d;
    var nx;
    var ny;
    if (!from || from.x < 0 || from.y < 0 || from.x >= w || from.y >= h || grid[from.y][from.x]) {
      return dist;
    }
    dist[from.y][from.x] = 0;
    var queue = [from];
    var head = 0;
    while (head < queue.length) {
      var cur = queue[head];
      head += 1;
      for (d = 0; d < ocnDirs.length; d += 1) {
        nx = cur.x + ocnDirs[d].x;
        ny = cur.y + ocnDirs[d].y;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h || grid[ny][nx] || dist[ny][nx] >= 0) { continue; }
        dist[ny][nx] = dist[cur.y][cur.x] + 1;
        queue.push({ x: nx, y: ny });
      }
    }
    return dist;
  }

  function ocnAllReach(target, entry, cells) {
    var field = ocnField(target, entry);
    for (var i = 0; i < cells.length; i += 1) {
      if (field[cells[i].y][cells[i].x] < 0) { return false; }
    }
    return true;
  }

  /* How many berth bands hold this reading? One means a bagged fragment is still
   * placeable; two or more means only a record can tell them apart. */
  function ocnBandCount(wreck, depth) {
    if (depth === null || depth === undefined) { return 0; }
    var hits = 0;
    for (var i = 0; i < wreck.berths.length; i += 1) {
      if (depth >= wreck.berths[i].lo && depth <= wreck.berths[i].hi) { hits += 1; }
    }
    return hits;
  }

  /* What a scripted line can argue a bagged, unrecorded fragment is worth: a
   * unique reading lands on its own berth (2), an overlapping band earns only the
   * plausible mount (1), and on silt nothing was ever read (1, never cited). */
  function ocnLiftGain(wreck, art) {
    if (wreck.silt) { return 1; }
    return ocnBandCount(wreck, art.depth) === 1 ? 2 : 1;
  }

  /* Deterministic draw of `take` distinct numbers under `count`. */
  function ocnPick(rng, count, take) {
    var pool = [];
    var i;
    var j;
    var keep;
    for (i = 0; i < count; i += 1) { pool.push(i); }
    for (i = pool.length - 1; i > 0; i -= 1) {
      j = Math.floor(rng() * (i + 1));
      keep = pool[i];
      pool[i] = pool[j];
      pool[j] = keep;
    }
    return pool.slice(0, take);
  }

  /* One site build. Finds go down first, then the broken hull is dropped cell by
   * cell and any cell that would seal a find away is put back, so a wreck is
   * connected by construction rather than by luck. */
  function ocnSite(shape, seed) {
    var w = shape.w;
    var h = shape.h;
    var rng = ocnRng(seed);
    var grid = ocnBlank(w, h, 0);
    var x;
    var y;
    var i;
    for (x = 0; x < w; x += 1) { grid[0][x] = 1; grid[h - 1][x] = 1; }
    for (y = 0; y < h; y += 1) { grid[y][0] = 1; grid[y][w - 1] = 1; }
    var entry = { x: 1 + Math.floor(rng() * 2), y: 1 };
    var cells = [];
    var guard = 0;
    var ok;
    while (cells.length < shape.finds && guard < 700) {
      guard += 1;
      x = 1 + Math.floor(rng() * (w - 2));
      y = 1 + Math.floor(rng() * (h - 2));
      if (x === entry.x && y === entry.y) { continue; }
      if (Math.abs(x - entry.x) + Math.abs(y - entry.y) < 4) { continue; }
      ok = true;
      for (i = 0; i < cells.length; i += 1) {
        if (Math.abs(cells[i].x - x) + Math.abs(cells[i].y - y) < shape.spread) { ok = false; break; }
        /* Row berths need one find per row, or two niches would share a band. */
        if (!shape.bays && cells[i].y === y) { ok = false; break; }
      }
      if (ok) { cells.push({ x: x, y: y }); }
    }
    if (cells.length < shape.finds) { return null; }
    var placed = 0;
    var tries = 0;
    var busy;
    while (placed < shape.debris && tries < 700) {
      tries += 1;
      x = 1 + Math.floor(rng() * (w - 2));
      y = 1 + Math.floor(rng() * (h - 2));
      if (grid[y][x]) { continue; }
      busy = x === entry.x && y === entry.y;
      for (i = 0; i < cells.length; i += 1) {
        if (cells[i].x === x && cells[i].y === y) { busy = true; }
      }
      if (busy) { continue; }
      grid[y][x] = 1;
      if (!ocnAllReach({ w: w, h: h, grid: grid }, entry, cells)) { grid[y][x] = 0; }
      else { placed += 1; }
    }

    /* Berths. Row bands give each find its own depth span, so a bagged reading
     * still places well. Bays grow outward from the finds and interleave across
     * the slope: look-alikes that only a record can tell apart. */
    var berthAt = ocnBlank(w, h, -1);
    var owner = [];
    if (shape.bays) {
      var queue = [];
      var head = 0;
      var held;
      var nx;
      var ny;
      for (i = 0; i < cells.length; i += 1) {
        berthAt[cells[i].y][cells[i].x] = i;
        queue.push(cells[i]);
      }
      while (head < queue.length) {
        var cur = queue[head];
        head += 1;
        held = berthAt[cur.y][cur.x];
        for (var d = 0; d < ocnDirs.length; d += 1) {
          nx = cur.x + ocnDirs[d].x;
          ny = cur.y + ocnDirs[d].y;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h || grid[ny][nx] || berthAt[ny][nx] !== -1) { continue; }
          berthAt[ny][nx] = held;
          queue.push({ x: nx, y: ny });
        }
      }
      for (i = 0; i < cells.length; i += 1) { owner[i] = i; }
    } else {
      var rows = [];
      var bounds = [];
      for (i = 0; i < cells.length; i += 1) { rows.push(cells[i].y); }
      rows.sort(function (a, b) { return a - b; });
      for (i = 0; i + 1 < rows.length; i += 1) { bounds.push(Math.floor((rows[i] + rows[i + 1]) / 2)); }
      var bandOf = [];
      var band;
      for (y = 0; y < h; y += 1) {
        band = 0;
        while (band < bounds.length && y > bounds[band]) { band += 1; }
        bandOf[y] = band;
      }
      /* A band belongs to the one find inside it, so a niche index is always the
       * index of the fragment that belongs there. */
      var bandOwner = [];
      for (i = 0; i < cells.length; i += 1) {
        if (bandOwner[bandOf[cells[i].y]] !== undefined) { return null; }
        bandOwner[bandOf[cells[i].y]] = i;
      }
      for (y = 0; y < h; y += 1) {
        for (x = 0; x < w; x += 1) {
          if (!grid[y][x]) { berthAt[y][x] = bandOwner[bandOf[y]]; }
        }
      }
      for (i = 0; i < cells.length; i += 1) { owner[i] = bandOwner[bandOf[cells[i].y]]; }
    }

    var parts = ocnPick(rng, ocnParts, cells.length);
    var finds = ocnPick(rng, ocnParts, cells.length);
    var berths = [];
    var metre;
    for (i = 0; i < cells.length; i += 1) { berths.push({ index: i, part: parts[i], lo: 999, hi: -1 }); }
    for (y = 0; y < h; y += 1) {
      for (x = 0; x < w; x += 1) {
        var at = berthAt[y][x];
        if (at < 0 || at === undefined || grid[y][x]) { continue; }
        metre = ocnDepth(shape, y);
        if (metre < berths[at].lo) { berths[at].lo = metre; }
        if (metre > berths[at].hi) { berths[at].hi = metre; }
      }
    }
    var arts = [];
    for (i = 0; i < cells.length; i += 1) {
      var cell = cells[i];
      var depth = ocnDepth(shape, cell.y);
      if (berths[i].lo > berths[i].hi) { berths[i].lo = depth; berths[i].hi = depth; }
      arts.push({
        x: cell.x, y: cell.y, berth: i, part: parts[i], find: finds[i], depth: depth,
        unique: false, beside: 0, letter: String.fromCharCode(65 + i),
      });
    }
    /* The neighbour note and the look-alike test, both read off this very site. */
    var gap;
    var bestDist;
    var bestIndex;
    for (i = 0; i < arts.length; i += 1) {
      var nearField = ocnField({ w: w, h: h, grid: grid }, arts[i]);
      bestDist = -1;
      bestIndex = arts.length > 1 ? (i === 0 ? 1 : 0) : i;
      for (var m = 0; m < arts.length; m += 1) {
        if (m === i) { continue; }
        gap = nearField[arts[m].y][arts[m].x];
        if (gap > 0 && (bestDist < 0 || gap < bestDist)) { bestDist = gap; bestIndex = m; }
      }
      arts[i].beside = arts[bestIndex].part;
      arts[i].unique = ocnBandCount({ berths: berths }, arts[i].depth) === 1;
    }
    var ambiguous = 0;
    var near = 0;
    for (i = 0; i < arts.length; i += 1) {
      if (!arts[i].unique) { ambiguous += 1; }
      if (ocnAscent({ entry: entry }, arts[i]) <= shape.quickReach) { near += 1; }
    }
    return {
      w: w, h: h, seed: seed, silt: shape.silt ? 1 : 0, bays: shape.bays ? 1 : 0,
      air: shape.air, quickReach: shape.quickReach, pingRadius: shape.pingRadius,
      costs: { step: 1, ping: shape.pingCost, doc: shape.docCost, lift: shape.liftCost },
      grid: grid, entry: entry, artifacts: arts, berths: berths, berthAt: berthAt,
      ambiguous: ambiguous, near: near,
    };
  }

  /* A wreck comes back whole: every find placed, at least the promised pair of
   * look-alikes on the broken sites, and one find close enough for even a hurried
   * sweep to bag. The open sand shelf covers the rare seed that rolls none. */
  function ocnWreck(side, seed) {
    var shape = ocnShape(side);
    var base = (Number(seed) || 1) >>> 0;
    var want = shape.ambig || 0;
    var tries = 0;
    var last = null;
    var built;
    while (tries < 48) {
      tries += 1;
      built = ocnSite(shape, base + tries * 7919);
      if (!built) { continue; }
      last = built;
      if (built.ambiguous >= want && built.near >= 1) { return built; }
    }
    if (last) { return last; }
    var w = shape.w;
    var h = shape.h;
    var grid = ocnBlank(w, h, 0);
    var x;
    var y;
    var arts = [];
    var berths = [];
    var across = Math.max(1, w - 4);
    var fy;
    var metre;
    for (x = 0; x < w; x += 1) { grid[0][x] = 1; grid[h - 1][x] = 1; }
    for (y = 0; y < h; y += 1) { grid[y][0] = 1; grid[y][w - 1] = 1; }
    for (var i = 0; i < shape.finds; i += 1) {
      fy = Math.min(h - 2, 2 + Math.floor(i / across) * 2);
      metre = ocnDepth(shape, fy);
      arts.push({
        x: 2 + (i % across), y: fy, berth: i, part: i, find: i % ocnParts, depth: metre,
        unique: true, beside: (i + 1) % shape.finds, letter: String.fromCharCode(65 + i),
      });
      berths.push({ index: i, part: i, lo: metre, hi: metre });
    }
    return {
      w: w, h: h, seed: base, silt: 0, bays: 0, air: shape.air, quickReach: shape.quickReach,
      pingRadius: shape.pingRadius, grid: grid, entry: { x: 1, y: 1 }, artifacts: arts,
      berths: berths, berthAt: ocnBlank(w, h, 0), ambiguous: 0, near: arts.length ? 1 : 0,
      costs: { step: 1, ping: shape.pingCost, doc: shape.docCost, lift: shape.liftCost },
    };
  }

  /* Proof one: every find can be swum to, bagged, and the diver can still pay the
   * straight-line ascent afterwards. */
  function ocnReachable(wreck) {
    if (!wreck || !wreck.artifacts || !wreck.artifacts.length) { return false; }
    var field = ocnField(wreck, wreck.entry);
    if (field[wreck.entry.y][wreck.entry.x] < 0) { return false; }
    for (var i = 0; i < wreck.artifacts.length; i += 1) {
      var art = wreck.artifacts[i];
      var steps = field[art.y][art.x];
      if (steps < 0) { return false; }
      if (steps * wreck.costs.step + wreck.costs.ping + wreck.costs.lift + ocnAscent(wreck, art) > wreck.air) { return false; }
    }
    return true;
  }

  /* A scripted dive: the same costs, the same return reserve and the same point
   * table the screen uses. "doc" never lifts, "lift" never records, "value" mixes
   * by points per air, "quick" sweeps the lift line and spends the reserve. */
  function ocnLine(wreck, policy) {
    var empty = { policy: policy, quality: 0, documented: 0, recovered: 0, airUsed: 0, airLeft: 0, line: [] };
    if (!wreck || !wreck.artifacts.length) { return empty; }
    var air = wreck.air;
    var pos = { x: wreck.entry.x, y: wreck.entry.y };
    var left = [];
    var got = [];
    var used = 0;
    var guard = 0;
    var i;
    for (i = 0; i < wreck.artifacts.length; i += 1) { left.push(i); }
    while (left.length && guard < 64) {
      guard += 1;
      var field = ocnField(wreck, pos);
      var best = null;
      for (var k = 0; k < left.length; k += 1) {
        var art = wreck.artifacts[left[k]];
        var steps = field[art.y][art.x];
        if (steps < 0) { continue; }
        var back = ocnAscent(wreck, art);
        if (policy === "quick" && back > wreck.quickReach) { continue; }
        var travel = steps * wreck.costs.step;
        /* A leg is planned the way a dive is planned: one ping to read where the
         * find lies, the swim, then the action. The bill the screen charges. */
        var bill = travel + wreck.costs.ping;
        var options = [];
        if (policy === "doc" || policy === "value") {
          options.push({ action: "doc", cost: bill + wreck.costs.doc, gain: 3 });
        }
        if (policy !== "doc") {
          options.push({ action: "lift", cost: bill + wreck.costs.lift, gain: ocnLiftGain(wreck, art) });
        }
        for (var o = 0; o < options.length; o += 1) {
          var opt = options[o];
          if (opt.cost > air) { continue; }
          if (policy !== "quick" && opt.cost + back > air) { continue; }
          var score = policy === "value" ? (opt.gain * 1000) / (opt.cost + 1) : opt.gain * 1000 - opt.cost;
          if (!best || score > best.score) { best = { score: score, index: left[k], opt: opt, art: art }; }
        }
      }
      if (!best) { break; }
      air -= best.opt.cost;
      used += best.opt.cost;
      pos = { x: best.art.x, y: best.art.y };
      got.push({ index: best.index, action: best.opt.action });
      left.splice(left.indexOf(best.index), 1);
    }
    var quality = 0;
    var documented = 0;
    for (i = 0; i < got.length; i += 1) {
      if (got[i].action === "doc") { quality += 3; documented += 1; }
      else { quality += ocnLiftGain(wreck, wreck.artifacts[got[i].index]); }
    }
    return {
      policy: policy, quality: quality, documented: documented, recovered: got.length,
      airUsed: used, airLeft: air, line: got,
    };
  }

  /* The star metric: display quality first, fragments recovered as the tie-break.
   * Proof two, and the 3-star anchor, is the best measured line on this wreck. */
  function ocnPlan(wreck) {
    var best = null;
    for (var p = 0; p < ocnPolicies.length; p += 1) {
      var line = ocnLine(wreck, ocnPolicies[p]);
      var rank = line.quality * 100 + line.recovered;
      var top = best ? best.quality * 100 + best.recovered : -1;
      if (rank > top) { best = line; }
    }
    return best || ocnLine(wreck, "quick");
  }

  function ocnLiftLine(wreck) { return ocnLine(wreck, "lift"); }

  function ocnQuickLine(wreck) { return ocnLine(wreck, "quick"); }

  /* Proof three: the bands in the table really were reached, on the same seeds the
   * measurement ran - never asserted from thin air. */
  function ocnBeatable(level) {
    var row = level && typeof level.finds === "number" ? level : ocnLevels[0];
    var bands = row.starQuality;
    if (!bands || bands.length < 3) { return false; }
    if (!(bands[0] >= bands[1]) || !(bands[1] >= bands[2]) || !(bands[2] >= 1)) { return false; }
    var seen = 0;
    for (var s = 1; s <= 60; s += 1) {
      var wreck = ocnWreck(row, s * 104729 + 11);
      if (!ocnReachable(wreck)) { continue; }
      seen += 1;
      if (ocnPlan(wreck).quality < bands[0]) { return false; }
      if (ocnLiftLine(wreck).quality < bands[1]) { return false; }
      if (ocnQuickLine(wreck).quality < bands[2]) { return false; }
    }
    return seen >= 10;
  }

  /* Deal only wrecks that pass every proof, so the 3-star band is always live. */
  function ocnDeal(level, seed) {
    var row = level || ocnLevels[0];
    var base = (Number(seed) || 1) >>> 0;
    var loose = null;
    for (var attempt = 0; attempt < 30; attempt += 1) {
      var wreck = ocnWreck(row, base + attempt * 3301);
      if (!ocnReachable(wreck)) { continue; }
      if (ocnPlan(wreck).quality >= row.starQuality[0]) { return wreck; }
      if (!loose) { loose = wreck; }
    }
    return loose || ocnWreck(row, base);
  }

  /* The point table both acts read from: where a fragment lay is worth a third of
   * its score on its own, and the record of it is worth the rest. */
  function ocnPoints(wreck, entry) {
    if (!entry || entry.niche === null || entry.niche === undefined) { return 0; }
    if (entry.doc) { return entry.niche === entry.art ? 3 : 1; }
    if (entry.niche === entry.art) { return 2; }
    var band = wreck.berths[entry.niche];
    if (!band) { return 0; }
    if (entry.depth === null || entry.depth === undefined) { return 1; }
    return entry.depth >= band.lo && entry.depth <= band.hi ? 1 : 0;
  }

  App.diveWreck = ocnWreck;
  App.diveReachable = ocnReachable;
  App.divePlan = ocnPlan;
  App.diveBeatable = ocnBeatable;
  App.diveLiftLine = ocnLiftLine;
  App.diveQuickLine = ocnQuickLine;
  App.diveLine = ocnLine;
  App.diveAscent = ocnAscent;
  App.divePoints = ocnPoints;
  App.diveLevels = ocnLevels;

  function initOceanArchaeologistGame(panelEl) {
    if (!panelEl) { return; }

    var campaign = createCampaign({ key: "ocean-archaeologist-campaign", levels: ocnLevels });
    var startIndex = campaign.indexOf(campaign.nextLevelId());
    var level = ocnLevels[startIndex < 0 ? 0 : startIndex];
    var wreck = null;
    var survey = null;
    var detected = null;
    var taken = null;
    var entries = [];
    var mount = [];
    var pos = { x: 0, y: 0 };
    var airLeft = 0;
    var phase = "dive";
    var sel = -1;
    var filed = null;
    var rings = [];
    var rafId = null;
    var lastFrame = 0;
    var paused = false;

    /* --- markup: every node built with createElement, never innerHTML --- */
    function el(tag, cls, key) {
      var node = document.createElement(tag);
      if (cls) { node.className = cls; }
      if (key) {
        node.setAttribute("data-i18n", key);
        node.textContent = t(key);
      }
      return node;
    }

    function makeStat(key, valueEl) {
      var stat = el("div", "game-stat");
      stat.appendChild(el("span", null, key));
      stat.appendChild(valueEl);
      return stat;
    }

    function makeTool(cls, key, handler) {
      var btn = el("button", cls);
      var label = el("span", null, key);
      var content = el("span", "button-content");
      btn.type = "button";
      content.appendChild(label);
      btn.appendChild(content);
      btn._label = label;
      btn.addEventListener("click", function () {
        wake();
        handler();
      });
      return btn;
    }

    var hud = el("div", "game-hud");
    var airEl = el("strong");
    var depthEl = el("strong");
    var ascentEl = el("strong");
    var findsEl = el("strong");
    hud.appendChild(makeStat("ocnAirLabel", airEl));
    hud.appendChild(makeStat("ocnDepthLabel", depthEl));
    hud.appendChild(makeStat("ocnAscentLabel", ascentEl));
    hud.appendChild(makeStat("ocnFindsLabel", findsEl));

    var canvas = el("canvas", "ocn-canvas");
    canvas.width = ocnWid;
    canvas.height = ocnHit;
    canvas.setAttribute("tabindex", "0");
    canvas.setAttribute("role", "application");
    canvas.setAttribute("aria-label", t("ocnFieldLabel"));

    /* Second act: the wreck plan. Hidden while the dive is still running. */
    var build = el("div", "ocn-build");
    var buildTitle = el("p", "ocn-head");
    var trayTitle = el("p", "ocn-sub", "ocnTrayTitle");
    var tray = el("div", "ocn-list");
    var planTitle = el("p", "ocn-sub", "ocnBerthsTitle");
    var plan = el("div", "ocn-list");
    var note = el("p", "ocn-note");
    tray.setAttribute("role", "group");
    tray.setAttribute("aria-label", t("ocnTrayTitle"));
    plan.setAttribute("role", "group");
    plan.setAttribute("aria-label", t("ocnBerthsTitle"));
    note.setAttribute("aria-live", "polite");
    build.hidden = true;
    [buildTitle, trayTitle, tray, planTitle, plan, note].forEach(function (node) { build.appendChild(node); });

    var result = el("p", "game-result");
    result.setAttribute("role", "status");

    var diveRow = el("div", "elements-row");
    var diveLabel = el("label", "elements-label", "ocnDiveSelectLabel");
    var diveSel = el("select", "elements-select");
    diveLabel.setAttribute("for", "ocnDiveSel");
    diveSel.id = "ocnDiveSel";
    diveRow.appendChild(diveLabel);
    diveRow.appendChild(diveSel);

    var actions = el("div", "game-actions ocn-actions");
    var pingBtn = makeTool("ocn-tool", "ocnBtnPing", function () { ping(); });
    var docBtn = makeTool("ocn-tool", "ocnBtnDocument", function () { recover(true); });
    var liftBtn = makeTool("ocn-tool", "ocnBtnLift", function () { recover(false); });
    var upBtn = makeTool("ocn-tool", "ocnBtnAscend", function () { ascend(); });
    var primaryBtn = makeTool("primary ocn-primary", "ocnBtnNewDive", function () {
      if (phase === "build") { fileDisplay(); }
      else { loadDive(level); }
    });
    var bestEl = el("p", "game-best");
    var hint = el("p", "game-hint", "ocnHint");
    [pingBtn, docBtn, liftBtn, upBtn, primaryBtn, bestEl].forEach(function (node) { actions.appendChild(node); });
    [hud, canvas, build, result, diveRow, actions, hint].forEach(function (node) { panelEl.appendChild(node); });

    var ctx = canvas.getContext("2d");

    function partName(index) { return t("ocnBerth" + index); }
    function findName(index) { return t("ocnArt" + index); }
    function totalFinds() { return wreck ? wreck.artifacts.length : 0; }

    /* The denominator never rides on an empty site. */
    function maxPoints() { return Math.max(1, 3 * totalFinds()); }

    function ascentNow() { return wreck ? ocnAscent(wreck, pos) : 0; }

    function findHere() {
      if (!wreck) { return -1; }
      for (var i = 0; i < wreck.artifacts.length; i += 1) {
        if (wreck.artifacts[i].x === pos.x && wreck.artifacts[i].y === pos.y) { return i; }
      }
      return -1;
    }

    /* The survey reads the whole circle, debris included, plus every marker in it,
     * so the second act can be planned while the first is still running. */
    function look(radius, at) {
      var r2 = radius * radius;
      var span = Math.ceil(radius);
      var x;
      var y;
      for (y = -span; y <= span; y += 1) {
        for (x = -span; x <= span; x += 1) {
          if (x * x + y * y > r2) { continue; }
          var cx = at.x + x;
          var cy = at.y + y;
          if (cx < 0 || cy < 0 || cx >= wreck.w || cy >= wreck.h) { continue; }
          survey[cy][cx] = wreck.grid[cy][cx] ? 2 : 1;
        }
      }
      for (var i = 0; i < wreck.artifacts.length; i += 1) {
        var art = wreck.artifacts[i];
        var dx = art.x - at.x;
        var dy = art.y - at.y;
        if (dx * dx + dy * dy <= r2) { detected[i] = 1; }
      }
    }

    function hereLine() {
      var index = findHere();
      if (index < 0) { return t("ocnHereClear"); }
      var art = wreck.artifacts[index];
      if (taken[index]) { return t("ocnHereBagged", { letter: art.letter }); }
      return t(wreck.silt ? "ocnHereSilt" : "ocnHereFind", {
        letter: art.letter, d: art.depth, dc: wreck.costs.doc, lc: wreck.costs.lift,
      });
    }

    /* The status line is the dive's readout: it says in words and digits what the
     * plate says in shapes, so nothing here needs eyes to play. */
    function report(sentence) {
      result.textContent = sentence + " " + t("ocnStatus", {
        n: airLeft, a: ascentNow(), f: entries.length, total: totalFinds(),
      }) + " " + hereLine();
    }

    function noteSay(key, vars) { note.textContent = t(key, vars); }

    function renderHud() {
      airEl.textContent = t("ocnAirValue", { n: airLeft, max: wreck ? wreck.air : airLeft });
      depthEl.textContent = t("ocnDepthValue", { n: wreck ? ocnDepth(level, pos.y) : 0 });
      ascentEl.textContent = t("ocnAscentValue", { n: ascentNow() });
      findsEl.textContent = t("ocnFindsValue", { n: entries.length, total: totalFinds() });
    }

    function refreshPicker() {
      fillCampaignPicker(diveSel, campaign, function (def) {
        return t(def.labelKey);
      }, t("elementsLocked"));
      diveSel.value = level.id;
      bestEl.textContent = t("campaignStars", { n: campaign.totalStars(), max: campaign.maxStars() });
    }

    function setTools() {
      var diving = phase === "dive";
      pingBtn.disabled = !diving;
      docBtn.disabled = !diving;
      liftBtn.disabled = !diving;
      upBtn.disabled = !diving;
      var key = phase === "build" ? "ocnBtnFile" : "ocnBtnNewDive";
      primaryBtn._label.setAttribute("data-i18n", key);
      primaryBtn._label.textContent = t(key);
    }

    /* --- the dive -------------------------------------------------------- */
    function moveBy(dx, dy, quiet) {
      if (phase !== "dive" || !wreck) { return false; }
      var nx = pos.x + dx;
      var ny = pos.y + dy;
      if (nx < 0 || ny < 0 || nx >= wreck.w || ny >= wreck.h) {
        if (!quiet) { report(t("ocnEdge")); }
        return false;
      }
      if (wreck.grid[ny][nx]) {
        if (!quiet) { report(t("ocnWall")); }
        return false;
      }
      if (airLeft <= 0) { return false; }
      pos = { x: nx, y: ny };
      airLeft -= wreck.costs.step;
      look(ocnLook, pos);
      renderHud();
      if (airLeft <= 0) {
        airLeft = 0;
        endDive("out", t("ocnMove"));
        return true;
      }
      if (!quiet) { report(t("ocnMove")); }
      draw();
      return true;
    }

    /* A click swims the same cells the arrows swim, over ground the survey already
     * proved open, and pays the same 1 air per cell. */
    function walkTo(target) {
      if (phase !== "dive" || !wreck) { return; }
      var passable = { w: wreck.w, h: wreck.h, grid: ocnBlank(wreck.w, wreck.h, 1) };
      var x;
      var y;
      for (y = 0; y < wreck.h; y += 1) {
        for (x = 0; x < wreck.w; x += 1) {
          if (survey[y][x] === 1) { passable.grid[y][x] = 0; }
        }
      }
      var guard = 0;
      while (phase === "dive" && (pos.x !== target.x || pos.y !== target.y) && guard < 400) {
        guard += 1;
        var here = ocnField(passable, pos);
        if (here[target.y][target.x] < 0) { break; }
        var bestStep = null;
        for (var d = 0; d < ocnDirs.length; d += 1) {
          var nx = pos.x + ocnDirs[d].x;
          var ny = pos.y + ocnDirs[d].y;
          if (nx < 0 || ny < 0 || nx >= wreck.w || ny >= wreck.h) { continue; }
          if (survey[ny][nx] !== 1 || here[ny][nx] < 0) { continue; }
          if (!bestStep || here[ny][nx] < bestStep.gap) {
            bestStep = { dx: nx - pos.x, dy: ny - pos.y, gap: here[ny][nx] };
          }
        }
        if (!bestStep) { report(t("ocnNoRoute")); return; }
        moveBy(bestStep.dx, bestStep.dy, true);
      }
      if (phase === "dive") { report(t("ocnMove")); }
      draw();
    }

    function ping() {
      if (phase !== "dive" || !wreck) { return; }
      var cost = wreck.costs.ping;
      if (cost > airLeft) {
        report(t("ocnNoAir", { c: cost, n: airLeft }));
        return;
      }
      airLeft -= cost;
      look(wreck.pingRadius, pos);
      var cells = 0;
      var known = 0;
      var marks = [];
      for (var y = 0; y < wreck.h; y += 1) {
        for (var x = 0; x < wreck.w; x += 1) {
          if (survey[y][x]) { cells += 1; }
        }
      }
      for (var i = 0; i < wreck.artifacts.length; i += 1) {
        if (!detected[i]) { continue; }
        known += 1;
        if (!taken[i]) { marks.push(wreck.artifacts[i].letter + " " + wreck.artifacts[i].depth); }
      }
      rings.push({ x: pos.x, y: pos.y, age: 0 });
      renderHud();
      var sentence = t("ocnPingSay", {
        cells: cells, marks: marks.length ? marks.join(", ") : t("ocnNoMarks"), known: known,
      });
      if (airLeft <= 0) { endDive("out", sentence); return; }
      report(sentence);
      draw();
    }

    /* The choice the whole game turns on: the record costs more air and buys the
     * berth name, or the bag is fast and buys only a reading. */
    function recover(asRecord) {
      if (phase !== "dive" || !wreck) { return; }
      var index = findHere();
      if (index < 0) {
        report(t("ocnHereClear"));
        return;
      }
      if (taken[index]) {
        report(t("ocnAlready", { letter: wreck.artifacts[index].letter }));
        return;
      }
      var art = wreck.artifacts[index];
      var cost = asRecord ? wreck.costs.doc : wreck.costs.lift;
      if (cost > airLeft) {
        report(t("ocnNoAir", { c: cost, n: airLeft }));
        return;
      }
      airLeft -= cost;
      taken[index] = 1;
      entries.push({
        art: index, doc: !!asRecord, find: art.find, letter: art.letter, niche: null,
        depth: !asRecord && wreck.silt ? null : art.depth,
      });
      renderHud();
      var sentence;
      if (asRecord) {
        sentence = t("ocnDocSay", {
          letter: art.letter, name: partName(art.part), d: art.depth, beside: partName(art.beside),
        });
      } else if (wreck.silt) {
        sentence = t("ocnLiftSilt", { letter: art.letter });
      } else {
        sentence = t("ocnLiftSay", { letter: art.letter, name: findName(art.find), d: art.depth });
      }
      if (airLeft <= 0) { endDive("out", sentence); return; }
      report(sentence);
      draw();
    }

    function ascend() {
      if (phase !== "dive" || !wreck) { return; }
      var cost = ascentNow();
      var spare = airLeft - cost;
      airLeft = spare < 0 ? 0 : spare;
      endDive(spare >= 0 ? "boat" : "line", t("ocnSwam", { n: cost }));
    }

    function endDive(reason, extra) {
      if (phase !== "dive") { return; }
      phase = "build";
      rings = [];
      renderHud();
      var closing = reason === "boat"
        ? t("ocnSurfaced", { n: airLeft, f: entries.length })
        : reason === "line"
          ? t("ocnLineAbort", { f: entries.length })
          : t("ocnAbort", { f: entries.length });
      result.textContent = (extra ? extra + " " : "") + closing;
      openBuild();
      draw();
    }

    /* --- the wreck plan -------------------------------------------------- */
    function openBuild() {
      build.hidden = false;
      sel = -1;
      mount = [];
      for (var i = 0; i < totalFinds(); i += 1) { mount.push(-1); }
      buildTitle.textContent = t("ocnPlanTitle", { n: entries.length, total: totalFinds() });
      buildLists();
      noteSay(entries.length ? "ocnBuildHint" : "ocnEmptyTray");
      setTools();
    }

    function clearList(box) {
      while (box.firstChild) { box.removeChild(box.firstChild); }
      box._chips = [];
    }

    function chip(handler) {
      var btn = el("button", "ocn-chip");
      btn.type = "button";
      btn.addEventListener("click", function () {
        wake();
        handler();
      });
      return btn;
    }

    /* Tray and berth labels carry the two things the dive produced: what the
     * fragment is, and what - if anything - was recorded about where it lay. */
    function entryLabel(entry) {
      var art = wreck.artifacts[entry.art];
      var head = t("ocnTrayItem", { n: entries.indexOf(entry) + 1, name: findName(entry.find) });
      if (entry.doc) {
        return head + " - " + t("ocnTagRecorded", {
          berth: partName(art.part), d: entry.depth, beside: partName(art.beside),
        });
      }
      if (entry.depth === null) { return head + " - " + t("ocnTagSilt"); }
      return head + " - " + t("ocnTagDepth", { d: entry.depth, fits: ocnBandCount(wreck, entry.depth) });
    }

    function nicheLabel(index) {
      var band = wreck.berths[index];
      var head = t("ocnNiche", { n: index + 1, berth: partName(band.part), lo: band.lo, hi: band.hi });
      var holder = mount[index];
      if (holder < 0) { return head + " - " + t("ocnStateEmpty"); }
      var entry = entries[holder];
      var tag = entry.doc
        ? t("ocnTagFromRecord")
        : entry.depth === null ? t("ocnTagSilt") : t("ocnTagGauge", { d: entry.depth });
      var verdict = filed ? " - " + t(verdictKey(ocnPoints(wreck, entry))) : "";
      return head + " - " + t("ocnHolds", { n: holder + 1 }) + " (" + tag + ")" + verdict;
    }

    /* Shape changes with the verdict as well as colour: a wrong mount goes dotted
     * and the chip names the verdict in words. */
    function verdictKey(points) {
      if (points === 3) { return "ocnStateRecorded"; }
      if (points === 2) { return "ocnStateUncited"; }
      return points === 1 ? "ocnStatePlausible" : "ocnStateMismatch";
    }

    function verdictClass(points) {
      if (points === 3) { return "chip-ok"; }
      if (points === 2) { return "chip-mid"; }
      return points === 1 ? "chip-soft" : "chip-bad";
    }

    /* Chips keep their elements and only swap text, so keyboard focus survives a
     * re-paint instead of jumping back up the panel. */
    function buildLists() {
      clearList(tray);
      clearList(plan);
      if (!entries.length) { tray.appendChild(el("p", "ocn-sub", "ocnEmptyTray")); }
      for (var i = 0; i < entries.length; i += 1) {
        (function (index) { tray._chips.push(chip(function () { pickEntry(index); })); })(i);
      }
      for (var k = 0; k < totalFinds(); k += 1) {
        (function (index) { plan._chips.push(chip(function () { placeAt(index); })); })(k);
      }
      paintLists();
    }

    function paintLists() {
      var i;
      var extra;
      for (i = 0; i < tray._chips.length; i += 1) {
        var entry = entries[i];
        var loose = entry.niche === null || entry.niche === undefined;
        tray._chips[i].textContent = entryLabel(entry);
        tray._chips[i].className = "ocn-chip ocn-traychip" + (loose ? " ocn-chip-loose" : " ocn-chip-set") +
          (entry.doc ? " ocn-chip-doc" : " ocn-chip-bare") + (sel === i ? " ocn-chip-sel" : "");
      }
      for (i = 0; i < plan._chips.length; i += 1) {
        var holder = mount[i];
        plan._chips[i].textContent = nicheLabel(i);
        extra = " ocn-chip-empty";
        if (holder >= 0) {
          extra = filed ? " ocn-" + verdictClass(ocnPoints(wreck, entries[holder]))
            : entries[holder].doc ? " ocn-chip-doc" : " ocn-chip-set";
        }
        plan._chips[i].className = "ocn-chip ocn-nichechip" + extra;
      }
    }

    function mountInto(niche, entry) {
      var previous = mount[niche];
      if (previous >= 0 && previous !== entries.indexOf(entry)) { entries[previous].niche = null; }
      if (entry.niche !== null && entry.niche !== undefined && entry.niche !== niche) {
        mount[entry.niche] = -1;
      }
      mount[niche] = entries.indexOf(entry);
      entry.niche = niche;
    }

    function snapSay(index) {
      var entry = entries[index];
      var art = wreck.artifacts[entry.art];
      noteSay("ocnSnapSay", {
        n: index + 1, name: findName(entry.find), berth: partName(art.part),
        d: entry.depth, beside: partName(art.beside),
      });
    }

    function pickEntry(index) {
      if (phase !== "build") { return; }
      var entry = entries[index];
      if (!entry) { return; }
      var from = entry.niche;
      /* The record names its own berth, so that mount is fixed. */
      if (from !== null && from !== undefined) {
        if (entry.doc) {
          sel = -1;
          snapSay(index);
          paintLists();
          return;
        }
        mount[from] = -1;
        entry.niche = null;
        sel = index;
        noteSay("ocnPullSay", { n: index + 1, berth: partName(wreck.berths[from].part) });
        paintLists();
        return;
      }
      if (entry.doc) {
        mountInto(entry.art, entry);
        sel = -1;
        snapSay(index);
        paintLists();
        return;
      }
      sel = index;
      if (entry.depth === null) { noteSay("ocnSelSilt", { n: index + 1 }); }
      else { noteSay("ocnSelSay", { n: index + 1, d: entry.depth, fits: ocnBandCount(wreck, entry.depth) }); }
      paintLists();
    }

    /* Evidence, never an oracle: the note says what the reading fits and what it
     * cannot. Whether a guess was right stays hidden until the display is filed, so
     * a bagged fragment cannot be tried berth by berth for its 2 points. */
    function mountSay(selIndex, entry, niche) {
      var band = wreck.berths[niche];
      var points = ocnPoints(wreck, entry);
      if (entry.depth === null) {
        noteSay("ocnWhyNoReading", { n: selIndex + 1, berth: partName(band.part), lo: band.lo, hi: band.hi });
      } else if (points === 2) {
        noteSay("ocnWhyUnique", { n: selIndex + 1, d: entry.depth, berth: partName(band.part) });
      } else if (points === 1) {
        noteSay("ocnWhyOverlap", {
          n: selIndex + 1, d: entry.depth, berth: partName(band.part),
          lo: band.lo, hi: band.hi, fits: ocnBandCount(wreck, entry.depth),
        });
      } else {
        noteSay("ocnWhyOutOfBand", {
          n: selIndex + 1, d: entry.depth, berth: partName(band.part), lo: band.lo, hi: band.hi,
        });
      }
    }

    function placeAt(niche) {
      if (phase !== "build") { return; }
      var held = mount[niche];
      if (held >= 0 && entries[held] && entries[held].doc) {
        noteSay("ocnHeldByRecord", { n: held + 1 });
        return;
      }
      if (sel < 0) {
        if (held >= 0) {
          mount[niche] = -1;
          entries[held].niche = null;
          sel = held;
          noteSay("ocnPullSay", { n: held + 1, berth: partName(wreck.berths[niche].part) });
          paintLists();
          return;
        }
        noteSay("ocnPickFirst");
        return;
      }
      var entry = entries[sel];
      mountInto(niche, entry);
      mountSay(sel, entry, niche);
      sel = -1;
      paintLists();
    }

    function fileDisplay() {
      if (phase !== "build") { return; }
      var points = 0;
      var counts = { rec: 0, unc: 0, plaus: 0, bad: 0, loose: 0 };
      var worst = null;
      var worstPoints = 4;
      for (var i = 0; i < entries.length; i += 1) {
        var entry = entries[i];
        var value = ocnPoints(wreck, entry);
        var mounted = entry.niche !== null && entry.niche !== undefined;
        points += value;
        if (!mounted) { counts.loose += 1; }
        else if (value === 3) { counts.rec += 1; }
        else if (value === 2) { counts.unc += 1; }
        else if (value === 1) { counts.plaus += 1; }
        else { counts.bad += 1; }
        if (mounted && value < worstPoints) { worstPoints = value; worst = entry; }
      }
      var max = maxPoints();
      var bar = level.starQuality[2];
      var stars = starsFor(points, level.starQuality, "high");
      filed = { points: points, max: max, stars: stars };
      phase = "filed";
      var summary = t("ocnFileSay", {
        p: points, max: max, pct: Math.round((100 * points) / max), f: entries.length,
        rec: counts.rec, unc: counts.unc, plaus: counts.plaus, bad: counts.bad, loose: counts.loose,
      });
      var par = t("ocnParSay", { par: level.starQuality[0], p: points });
      var review = worst
        ? " " + t("ocnReviewWorst", { n: entries.indexOf(worst) + 1, berth: partName(wreck.berths[worst.niche].part) })
        : "";
      if (points < bar) {
        result.textContent = summary + " " + t("ocnLose", { p: points, need: bar });
        note.textContent = par;
        setTools();
        paintLists();
        return;
      }
      /* Stars come from display quality; the campaign best keeps fragments
       * recovered underneath it, so quality leads and recovery breaks the draw. */
      var outcome = campaign.record(level.id, {
        stars: stars, best: points * 100 + entries.length, better: "high",
      });
      var won = t("ocnWin", { p: points, max: max, s: stars, f: entries.length });
      if (outcome.isBest) { won += " " + t("newBest"); }
      if (outcome.unlockedNext) { won += " " + t("ocnNextDive"); }
      else if (campaign.clearedCount() === ocnLevels.length) { won += " " + t("ocnAllDived"); }
      result.textContent = summary + " " + won;
      note.textContent = par + review;
      logAction(t("logOceanArchaeologist", { p: points, f: entries.length }));
      var rect = primaryBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      refreshPicker();
      setTools();
      paintLists();
    }

    function loadDive(def) {
      level = def;
      wreck = ocnDeal(level, Math.floor(Math.random() * 100000) + 1);
      survey = ocnBlank(wreck.w, wreck.h, 0);
      detected = [];
      taken = [];
      for (var i = 0; i < wreck.artifacts.length; i += 1) {
        detected.push(0);
        taken.push(0);
      }
      entries = [];
      mount = [];
      sel = -1;
      filed = null;
      pos = { x: wreck.entry.x, y: wreck.entry.y };
      airLeft = wreck.air;
      phase = "dive";
      rings = [];
      paused = false;
      build.hidden = true;
      clearList(tray);
      clearList(plan);
      look(ocnLook, pos);
      renderHud();
      refreshPicker();
      setTools();
      result.textContent = t("ocnPrompt", {
        name: t(level.labelKey), n: totalFinds(), air: wreck.air,
        par: level.starQuality[0], max: maxPoints(),
      });
      draw();
    }

    /* --- drawing --------------------------------------------------------- */
    function geometry() {
      var cell = Math.max(6, Math.floor(Math.min(ocnWid / wreck.w, ocnHit / wreck.h)));
      var spanW = cell * wreck.w;
      var spanH = cell * wreck.h;
      return {
        cell: cell, spanW: spanW, spanH: spanH,
        x0: Math.floor((ocnWid - spanW) / 2), y0: Math.floor((ocnHit - spanH) / 2),
      };
    }

    function stroke(x1, y1, x2, y2, color, dashed) {
      ctx.setLineDash(dashed ? [3, 3] : []);
      ctx.strokeStyle = color;
      ctx.lineWidth = dashed ? 1.5 : 1;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    function setFont(size) {
      ctx.font = "bold " + size + "px 'JetBrains Mono', monospace";
    }

    function draw() {
      if (!wreck || !survey) { return; }
      var geo = geometry();
      var cell = geo.cell;
      var x;
      var y;
      ctx.clearRect(0, 0, ocnWid, ocnHit);
      ctx.fillStyle = "#050b14";
      ctx.fillRect(0, 0, ocnWid, ocnHit);
      ctx.fillStyle = "#0b1526";
      ctx.fillRect(geo.x0, geo.y0, geo.spanW, geo.spanH);
      for (y = 0; y < wreck.h; y += 1) {
        for (x = 0; x < wreck.w; x += 1) {
          var px = geo.x0 + x * cell;
          var py = geo.y0 + y * cell;
          var seen = survey[y][x];
          ctx.fillStyle = !seen ? "#070d18" : seen === 2 ? "#3b4a63" : "#152742";
          ctx.fillRect(px + 1, py + 1, cell - 2, cell - 2);
          /* Debris keeps a notch as well as a tone: a shape cue, not a colour cue. */
          if (seen === 2) {
            ctx.fillStyle = "#1d283a";
            ctx.fillRect(px + 3, py + cell - 6, Math.max(1, cell - 6), 2);
          }
        }
      }
      for (x = 0; x <= wreck.w; x += 1) { stroke(geo.x0 + x * cell, geo.y0, geo.x0 + x * cell, geo.y0 + geo.spanH, "rgba(148, 163, 184, 0.18)", false); }
      for (y = 0; y <= wreck.h; y += 1) { stroke(geo.x0, geo.y0 + y * cell, geo.x0 + geo.spanW, geo.y0 + y * cell, "rgba(148, 163, 184, 0.18)", false); }
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      setFont(Math.max(9, Math.floor(cell * 0.52)));
      var ex = geo.x0 + wreck.entry.x * cell + cell / 2;
      var ey = geo.y0 + wreck.entry.y * cell + cell / 2;
      var dx = geo.x0 + pos.x * cell + cell / 2;
      var dy = geo.y0 + pos.y * cell + cell / 2;
      /* The ascent is drawn as the straight pull it costs. */
      stroke(ex, ey, dx, dy, "rgba(163, 230, 53, 0.55)", true);
      ctx.fillStyle = "#a3e635";
      ctx.fillText("L", ex, ey);
      var glyph = wreck.silt ? "±" : "◇";
      for (var i = 0; i < wreck.artifacts.length; i += 1) {
        var art = wreck.artifacts[i];
        if (!detected[i] || !survey[art.y][art.x]) { continue; }
        var ax = geo.x0 + art.x * cell + cell / 2;
        var ay = geo.y0 + art.y * cell + cell / 2;
        ctx.fillStyle = taken[i] ? "#4b5a72" : "#fbbf24";
        ctx.fillText(taken[i] ? "·" : glyph, ax, ay - Math.floor(cell * 0.12));
        ctx.fillText(art.letter, ax, ay + Math.floor(cell * 0.28));
      }
      drawRings(geo);
      if (phase !== "dive") { return; }
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = "rgba(0, 242, 255, 0.85)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(geo.x0 + pos.x * cell + 1.5, geo.y0 + pos.y * cell + 1.5, cell - 3, cell - 3);
      ctx.setLineDash([]);
      ctx.fillStyle = "#00f2ff";
      setFont(Math.max(9, Math.floor(cell * 0.55)));
      ctx.fillText("@", dx, dy);
    }

    /* Decorative only: the ping ring widens out and stands still when the player
     * has motion switched off. */
    function drawRings(geo) {
      if (!rings.length) { return; }
      var keep = [];
      for (var i = 0; i < rings.length; i += 1) {
        var ring = rings[i];
        if (ring.age >= 1) { continue; }
        keep.push(ring);
        ctx.beginPath();
        ctx.arc(
          geo.x0 + ring.x * geo.cell + geo.cell / 2,
          geo.y0 + ring.y * geo.cell + geo.cell / 2,
          ring.age * wreck.pingRadius * geo.cell, 0, Math.PI * 2
        );
        ctx.strokeStyle = "rgba(0, 242, 255, " + (0.6 * (1 - ring.age)).toFixed(3) + ")";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      rings = keep;
    }

    function frame(now) {
      if (rafId === null) { return; }
      var dt = Math.min(0.032, (now - lastFrame) / 1000 || 0.016);
      lastFrame = now;
      if (panelEl.hidden || document.hidden) {
        rafId = window.requestAnimationFrame(frame);
        return;
      }
      if (rings.length) {
        var calm = App.isMotionOff && App.isMotionOff();
        for (var i = 0; i < rings.length; i += 1) { rings[i].age += calm ? 1 : dt / 1.1; }
        draw();
      }
      rafId = window.requestAnimationFrame(frame);
    }

    function startLoop() {
      if (rafId !== null) { return; }
      lastFrame = performance.now();
      rafId = window.requestAnimationFrame(frame);
    }

    function stopLoop() {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
    }

    /* A pause costs nothing: the loop stopped and the air clock stopped, so the
     * first tap or keystroke picks the same dive straight back up. */
    function wake() {
      if (paused) {
        paused = false;
        startLoop();
        draw();
      }
    }

    function cellFromEvent(event) {
      var rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) { return null; }
      var geo = geometry();
      var px = (event.clientX - rect.left) * (canvas.width / rect.width);
      var py = (event.clientY - rect.top) * (canvas.height / rect.height);
      var x = Math.floor((px - geo.x0) / geo.cell);
      var y = Math.floor((py - geo.y0) / geo.cell);
      if (!isFinite(x) || !isFinite(y) || x < 0 || y < 0 || x >= wreck.w || y >= wreck.h) { return null; }
      return { x: x, y: y };
    }

    canvas.addEventListener("pointerdown", function (event) {
      event.preventDefault();
      wake();
      if (!wreck || phase !== "dive") { return; }
      var hit = cellFromEvent(event);
      if (!hit) { return; }
      var gap = Math.abs(hit.x - pos.x) + Math.abs(hit.y - pos.y);
      if (gap === 1) { moveBy(hit.x - pos.x, hit.y - pos.y, false); }
      else if (gap > 1) { walkTo(hit); }
      else { ping(); }
    });

    /* One table for both key names and key codes, so a browser that reports only
     * one of them never locks a dive action out. */
    var ocnKeys = {
      ArrowLeft: { move: { x: -1, y: 0 } }, ArrowRight: { move: { x: 1, y: 0 } },
      ArrowUp: { move: { x: 0, y: -1 } }, ArrowDown: { move: { x: 0, y: 1 } },
      " ": { act: "ping" }, Enter: { act: "ping" }, Space: { act: "ping" },
      d: { act: "record" }, D: { act: "record" }, KeyD: { act: "record" },
      l: { act: "lift" }, L: { act: "lift" }, KeyL: { act: "lift" },
      q: { act: "ascend" }, Q: { act: "ascend" }, KeyQ: { act: "ascend" },
    };

    canvas.addEventListener("keydown", function (event) {
      wake();
      if (phase !== "dive") { return; }
      var hit = ocnKeys[event.key] || ocnKeys[event.code || ""];
      if (!hit) { return; }
      event.preventDefault();
      if (hit.move) {
        moveBy(hit.move.x, hit.move.y, false);
      } else if (hit.act === "ping") {
        ping();
      } else if (hit.act === "record") {
        recover(true);
      } else if (hit.act === "lift") {
        recover(false);
      } else {
        ascend();
      }
    });

    diveSel.addEventListener("change", function () {
      var index = campaign.indexOf(diveSel.value);
      if (index >= 0 && campaign.isUnlocked(diveSel.value)) {
        wake();
        loadDive(ocnLevels[index]);
      }
    });

    /* Pausing stops motion and nothing else: air, map and every recovered
     * fragment stay exactly where the diver left them. */
    App.quietResetOceanArchaeologist = function () {
      stopLoop();
      rings = [];
      paused = true;
      if (phase === "dive") {
        result.textContent = t("ocnPaused");
      }
    };

    loadDive(level);
    startLoop();
  }

  /* Bilingual copy travels with the game: addStrings only fills keys i18n.js does
   * not already own, so the shared dictionary stays authoritative. The berth and
   * find vocabularies are numbered slots the generator draws from, so a record can
   * name a place in words in either language. */
  App.addStrings({
    en: {
      "tabOceanArchaeologist": "Ocean Archaeologist",
      "ocnZ1": "Shallow Shelf",
      "ocnZ2": "The Tilt",
      "ocnZ3": "Broken Hull",
      "ocnZ4": "Silt Field",
      "ocnZ5": "The Deep Wreck",
      "ocnZ6": "Twin Wrecks",
      "ocnZ7": "The Echo Ridge",
      "ocnZ8": "The Silt Choke",
      "ocnZ9": "The Muted Drop",
      "ocnZ10": "The Abyss Gate",
      "ocnAirLabel": "Air",
      "ocnDepthLabel": "Depth",
      "ocnAscentLabel": "Ascent",
      "ocnFindsLabel": "Tray",
      "ocnAirValue": "{n} of {max}",
      "ocnDepthValue": "{n} metres",
      "ocnAscentValue": "{n} air home",
      "ocnFindsValue": "{n} of {total}",
      "ocnDiveSelectLabel": "Choose a dive",
      "ocnBtnNewDive": "New Dive",
      "ocnBtnFile": "File the Display",
      "ocnBtnPing": "Ping",
      "ocnBtnDocument": "Document",
      "ocnBtnLift": "Lift",
      "ocnBtnAscend": "Ascend",
      "ocnFieldLabel": "Wreck survey grid: arrows swim, space pings, D records a find, L bags it, Q ascends",
      "ocnStatus": "Air {n} left, ascent costs {a}, tray holds {f} of {total}.",
      "ocnHereClear": "Nothing to recover at your fins.",
      "ocnHereFind": "Marker {letter} lies here at {d} metres - document costs {dc} air, lift costs {lc}.",
      "ocnHereSilt": "Marker {letter} lies here at {d} metres under silt - lifting loses the reading, document costs {dc}.",
      "ocnHereBagged": "Marker {letter} was already recovered.",
      "ocnPrompt": "Diving {name}: {n} finds on the site, {air} air, par {par} of {max} quality points.",
      "ocnMove": "You swim one cell - 1 air.",
      "ocnEdge": "The site edge is there.",
      "ocnWall": "Hull debris blocks that way.",
      "ocnNoRoute": "No surveyed open route to that cell.",
      "ocnNoAir": "Not enough air: that costs {c} and you have {n}.",
      "ocnAlready": "Marker {letter} is already in the tray.",
      "ocnPingSay": "Ping read {cells} cells of the site. Markers with you, in metres: {marks}. {known} markers known in total.",
      "ocnNoMarks": "none",
      "ocnDocSay": "Recorded marker {letter}: berth {name}, {d} metres, lying beside the {beside}.",
      "ocnLiftSay": "Bagged marker {letter}, a {name}, no record. Your gauge says {d} metres.",
      "ocnLiftSilt": "Bagged marker {letter} - the silt took the reading. No record, no depth.",
      "ocnSwam": "You pulled along the lift line: {n} air.",
      "ocnSurfaced": "You reached the boat with {n} air spare and {f} fragments aboard.",
      "ocnLineAbort": "Out of air on the line: the lift bag came up on the tether with {f} fragments.",
      "ocnAbort": "Out of air: the safety stop pulled you up with {f} fragments.",
      "ocnPaused": "Dive paused - your air, your map and every bagged fragment wait here.",
      "ocnPlanTitle": "Wreck plan - set {n} fragments into {total} berths.",
      "ocnTrayTitle": "Tray",
      "ocnBerthsTitle": "Berths on the plan",
      "ocnBuildHint": "A recorded fragment snaps to its berth. An unrecorded one is yours to guess: click it, then click a berth.",
      "ocnEmptyTray": "The tray is empty: nothing was recovered, so the plan stays blank.",
      "ocnTrayItem": "Fragment {n}, a {name}",
      "ocnTagRecorded": "recorded: berth {berth}, {d} metres, beside the {beside}",
      "ocnTagDepth": "no record - gauge {d} metres, which fits {fits} berths",
      "ocnTagSilt": "no record, no reading - the silt took it",
      "ocnTagFromRecord": "from a record",
      "ocnTagGauge": "gauge only, {d} metres",
      "ocnNiche": "Berth {n}: {berth}, {lo} to {hi} metres",
      "ocnHolds": "holds fragment {n}",
      "ocnHeldByRecord": "That berth is held by fragment {n} and its record - the mount is fixed.",
      "ocnStateEmpty": "empty",
      "ocnStateRecorded": "recorded berth",
      "ocnStateUncited": "right berth, no record to cite",
      "ocnStatePlausible": "wrong berth, depth band fits",
      "ocnStateMismatch": "wrong berth, depth does not fit",
      "ocnPickFirst": "Pick a fragment from the tray first.",
      "ocnSnapSay": "Fragment {n}, the {name}, snapped into its recorded berth {berth} at {d} metres, beside the {beside}.",
      "ocnSelSay": "Holding fragment {n}. The reading says {d} metres, which fits {fits} berths - pick one.",
      "ocnSelSilt": "Holding fragment {n} with no reading at all, so every berth fits and none is proven.",
      "ocnPullSay": "Fragment {n} came off berth {berth} and is back in the tray.",
      "ocnWhyUnique": "Fragment {n} sits in {berth}: your {d} metre reading falls in one berth band only, so the guess is worth a mount - with no record to cite.",
      "ocnWhyOverlap": "Fragment {n} sits in {berth}, which spans {lo} to {hi} metres and holds your {d} metre reading - but {fits} berths hold it. Plausible, not proven.",
      "ocnWhyOutOfBand": "Fragment {n} reads {d} metres; berth {berth} spans {lo} to {hi}. That joint is outside your band, so the mount is wrong.",
      "ocnWhyNoReading": "Fragment {n} is mounted in {berth} ({lo} to {hi} metres) with nothing to check it against - the silt took the reading.",
      "ocnFileSay": "Display filed: {p} of {max} quality points ({pct}%). {rec} recorded, {unc} right but uncited, {plaus} plausible yet mis-set, {bad} out of band, {loose} left in the tray, {f} fragments recovered.",
      "ocnWin": "That clears the bar - {s} stars with {f} fragments recovered.",
      "ocnLose": "Under the bar: you have {p} points and need {need}. Recover more, or record more of what you carry.",
      "ocnReviewWorst": "Weakest mount: fragment {n} sits in {berth}, and no record exists to prove it.",
      "ocnParSay": "The measured best line on this kind of site scores {par}; you scored {p}.",
      "ocnNextDive": "Next dive unlocked.",
      "ocnAllDived": "All dives filed.",
      "ocnHint": "Ping to plan, then spend air on records: a grid cell never names a berth, only the record does.",
      "logOceanArchaeologist": "Filed a wreck display at {p} quality points with {f} fragments",
      "ocnBerth0": "bow",
      "ocnBerth1": "helm",
      "ocnBerth2": "mast step",
      "ocnBerth3": "anchor well",
      "ocnBerth4": "port gunwale",
      "ocnBerth5": "starboard gunwale",
      "ocnBerth6": "cargo hold",
      "ocnBerth7": "galley",
      "ocnBerth8": "cabin",
      "ocnBerth9": "stern",
      "ocnArt0": "clay jar",
      "ocnArt1": "bronze lamp",
      "ocnArt2": "ship's bell",
      "ocnArt3": "iron anchor",
      "ocnArt4": "copper coin",
      "ocnArt5": "navigation dividers",
      "ocnArt6": "glass bottle",
      "ocnArt7": "lead weight",
      "ocnArt8": "pewter plate",
      "ocnArt9": "cannon breech",
    },
    zh: {
      "tabOceanArchaeologist": "海洋考古学家",
      "ocnZ1": "浅水平台",
      "ocnZ2": "倾斜带",
      "ocnZ3": "破船壳",
      "ocnZ4": "淤泥场",
      "ocnZ5": "深水沉船",
      "ocnZ6": "双子沉船",
      "ocnZ7": "回声脊",
      "ocnZ8": "淤塞峡",
      "ocnZ9": "哑声深沟",
      "ocnZ10": "深渊之门",
      "ocnAirLabel": "气瓶",
      "ocnDepthLabel": "深度",
      "ocnAscentLabel": "返程",
      "ocnFindsLabel": "托盘",
      "ocnAirValue": "{n} / 共 {max}",
      "ocnDepthValue": "{n} 米",
      "ocnAscentValue": "返程 {n} 气",
      "ocnFindsValue": "{n} / 共 {total}",
      "ocnDiveSelectLabel": "选择下潜",
      "ocnBtnNewDive": "再次下潜",
      "ocnBtnFile": "提交展陈",
      "ocnBtnPing": "声呐",
      "ocnBtnDocument": "记录",
      "ocnBtnLift": "起捞",
      "ocnBtnAscend": "上浮",
      "ocnFieldLabel": "沉船测绘网格：方向键游动，空格声呐，D 记录，L 起捞，Q 上浮",
      "ocnStatus": "剩气 {n}，返程需 {a}，托盘里有 {total} 件中的 {f} 件。",
      "ocnHereClear": "脚边没有可打捞的文物。",
      "ocnHereFind": "标记 {letter} 就在脚下，深 {d} 米——记录耗气 {dc}，起捞耗气 {lc}。",
      "ocnHereSilt": "标记 {letter} 埋在脚下 {d} 米的淤泥里——直接起捞会丢失读数，记录耗气 {dc}。",
      "ocnHereBagged": "标记 {letter} 已经打捞过了。",
      "ocnPrompt": "下潜「{name}」：遗址有 {n} 件文物、{air} 气量，标准线为 {max} 分中的 {par} 分。",
      "ocnMove": "游过一格，耗气 1。",
      "ocnEdge": "遗址边界到了。",
      "ocnWall": "船壳碎片挡住了这条路。",
      "ocnNoRoute": "没有已测绘的空路可以走到那一格。",
      "ocnNoAir": "气量不够：这需要 {c}，你只剩 {n}。",
      "ocnAlready": "标记 {letter} 已在托盘里。",
      "ocnPingSay": "声呐读回 {cells} 格遗址。你周围的标记（单位为米）：{marks}。总共已知 {known} 个标记。",
      "ocnNoMarks": "没有",
      "ocnDocSay": "已记录标记 {letter}：舱位「{name}」，深 {d} 米，紧挨着「{beside}」。",
      "ocnLiftSay": "起捞标记 {letter}，一件{name}，没有记录。深度表显示 {d} 米。",
      "ocnLiftSilt": "起捞了标记 {letter}——淤泥吞掉了读数，既无记录也无深度。",
      "ocnSwam": "你沿升降绳上浮：耗气 {n}。",
      "ocnSurfaced": "你回到船上，余气 {n}，带回 {f} 件碎片。",
      "ocnLineAbort": "上浮途中气尽：打捞袋沿安全绳被拉了上来，袋里有 {f} 件碎片。",
      "ocnAbort": "气量耗尽：安全程序把你拉上浮，带回 {f} 件碎片。",
      "ocnPaused": "下潜已暂停：气量、测绘图与已捞起的碎片都原样等着。",
      "ocnPlanTitle": "沉船复原图——把 {n} 件碎片放进 {total} 个舱位。",
      "ocnTrayTitle": "托盘",
      "ocnBerthsTitle": "复原图上的舱位",
      "ocnBuildHint": "有记录的碎片会自动归位；没有记录的只能靠你判断——先点碎片，再点舱位。",
      "ocnEmptyTray": "托盘是空的：什么都没捞到，复原图也就一片空白。",
      "ocnTrayItem": "碎片 {n}，一件{name}",
      "ocnTagRecorded": "有记录：舱位「{berth}」，深 {d} 米，紧挨「{beside}」",
      "ocnTagDepth": "无记录——深度表读数 {d} 米，可放进 {fits} 个舱位",
      "ocnTagSilt": "无记录也无读数——被淤泥吞掉了",
      "ocnTagFromRecord": "来自记录",
      "ocnTagGauge": "只有深度表，{d} 米",
      "ocnNiche": "舱位 {n}：{berth}，{lo} 至 {hi} 米",
      "ocnHolds": "已放入碎片 {n}",
      "ocnHeldByRecord": "那个舱位已被碎片 {n} 连同它的记录占住——这个摆放固定不动。",
      "ocnStateEmpty": "空着",
      "ocnStateRecorded": "记录舱位",
      "ocnStateUncited": "位置对了，但没有记录可引",
      "ocnStatePlausible": "舱位错了，深度范围相符",
      "ocnStateMismatch": "舱位错了，深度范围不符",
      "ocnPickFirst": "先在托盘里选一件碎片。",
      "ocnSnapSay": "碎片 {n}（{name}）已自动归入记录舱位「{berth}」，深 {d} 米，紧挨「{beside}」。",
      "ocnSelSay": "手持碎片 {n}：读数是 {d} 米，符合 {fits} 个舱位——挑一个。",
      "ocnSelSilt": "手持碎片 {n}，完全没有读数，所以哪个舱位都塞得下，也哪个都证明不了。",
      "ocnPullSay": "碎片 {n} 已从舱位「{berth}」取下，回到托盘。",
      "ocnWhyUnique": "碎片 {n} 放进了「{berth}」：{d} 米的读数只落在一个舱位的范围里，所以这个摆放算成立——只是没有记录可引。",
      "ocnWhyOverlap": "碎片 {n} 放进了「{berth}」，它的范围是 {lo} 至 {hi} 米，确实容得下你 {d} 米的读数——可 {fits} 个舱位都容得下。像真的，但没被证明。",
      "ocnWhyOutOfBand": "碎片 {n} 的读数是 {d} 米，而舱位「{berth}」的范围是 {lo} 至 {hi} 米。接口在你的深度带之外，这个摆放是错的。",
      "ocnWhyNoReading": "碎片 {n} 已放进「{berth}」（{lo} 至 {hi} 米），却没有任何读数可核对——淤泥把记录吞了。",
      "ocnFileSay": "展陈已提交：{max} 分中得到 {p} 分（{pct}%）。{rec} 件有记录，{unc} 件摆对却无可引，{plaus} 件深度相符但舱位错了，{bad} 件超出深度带，{loose} 件仍在托盘，共带回 {f} 件碎片。",
      "ocnWin": "达到展陈标准——获得 {s} 星，共带回 {f} 件碎片。",
      "ocnLose": "未达标：你有 {p} 分，需要 {need} 分。多捞一些，或者把手上的都记录清楚。",
      "ocnReviewWorst": "最弱的一处：碎片 {n} 放在「{berth}」，却没有留下能够证明它的记录。",
      "ocnParSay": "这类遗址实测最佳路线能得 {par} 分；你得到 {p} 分。",
      "ocnNextDive": "解锁下一次下潜。",
      "ocnAllDived": "全部下潜均已提交。",
      "ocnHint": "先用声呐规划路线，再把气花在记录上：网格坐标永远叫不出舱位名，只有记录可以。",
      "logOceanArchaeologist": "提交展陈，获得 {p} 个质量分，带回 {f} 件碎片",
      "ocnBerth0": "船首",
      "ocnBerth1": "舵位",
      "ocnBerth2": "桅座",
      "ocnBerth3": "锚池",
      "ocnBerth4": "左舷缘",
      "ocnBerth5": "右舷缘",
      "ocnBerth6": "货舱",
      "ocnBerth7": "厨房",
      "ocnBerth8": "船舱",
      "ocnBerth9": "船尾",
      "ocnArt0": "陶罐",
      "ocnArt1": "铜灯",
      "ocnArt2": "船钟",
      "ocnArt3": "铁锚",
      "ocnArt4": "铜币",
      "ocnArt5": "航海圆规",
      "ocnArt6": "玻璃瓶",
      "ocnArt7": "铅锤",
      "ocnArt8": "锡盘",
      "ocnArt9": "炮尾",
    },
  });

  App.registerGame({
    name: "oceanArchaeologist",
    tabKey: "tabOceanArchaeologist",
    init: initOceanArchaeologistGame,
    guide: {
      svg:
        '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="4" y="4" width="70" height="68" rx="5" fill="rgba(7,11,20,.92)" stroke="rgba(148,163,184,.45)"/>' +
        '<path d="M14 4v68M28 4v68M42 4v68M56 4v68M70 4v68M4 22h70M4 40h70M4 58h70" stroke="rgba(148,163,184,.18)"/>' +
        '<path d="M18 30h10v10H18z" fill="rgba(148,163,184,.45)"/>' +
        '<circle cx="42" cy="40" r="15" fill="none" stroke="rgba(0,242,255,.35)"/>' +
        '<text x="42" y="44" font-size="11" fill="#fbbf24" text-anchor="middle">\u25c7 D</text>' +
        '<text x="24" y="18" font-size="10" fill="#00f2ff" text-anchor="middle">@</text>' +
        '<path d="M24 12v6" stroke="#a3e635" stroke-dasharray="2 2"/>' +
        '<rect x="80" y="10" width="36" height="20" rx="4" fill="none" stroke="rgba(148,163,184,.5)"/>' +
        '<text x="98" y="23" font-size="8" fill="#b9c1cc" text-anchor="middle">helm 21m</text>' +
        '<rect x="80" y="36" width="36" height="20" rx="4" fill="none" stroke="#00f2ff" stroke-width="2"/>' +
        '<text x="98" y="49" font-size="8" fill="#00f2ff" text-anchor="middle">hold 24m</text>' +
        '<path d="M74 20h6M74 46h6" stroke="rgba(148,163,184,.5)"/></svg>',
      en: [
        "Goal: recover fragments from the wreck, then set them into the site plan as well as you can before your air runs out.",
        "Action: arrows or a click swim cell to cell at 1 air each; Space or the Ping button spends a survey ping that reads nearby cells plus any marker's position and depth.",
        "Record: standing on a marker choose Document (slow, more air - it logs the berth, the depth and what it lay beside) or Lift (fast, and the bag carries only your gauge reading).",
        "Ascent: the air home to the boat is a straight-line cost the HUD shows live; running out aborts the dive with whatever you already reached.",
        "Watch out: the plan is drawn in ship parts, the survey in grid cells - a position never names a berth, only a record does, and on a silt dive lifting first loses the reading entirely.",
        "Scoring: display quality decides the stars - a recorded fragment is worth 3 points, an unrecorded one 2 at best, and fewer when the depth band does not hold. Fragments recovered break ties.",
      ],
      zh: [
        "目标：从沉船上取回碎片，并在气量耗尽之前尽量把它们摆进遗址复原图。",
        "操作：方向键或点击逐格游动，每格 1 气；空格或「声呐」按钮花一次气，读出附近的格子以及每个标记的位置和深度。",
        "记录：站在标记上有两种选择——「记录」（慢、耗气多，但会留下舱位、深度和它挨着什么）或「起捞」（快，可袋里只有深度表读数）。",
        "上浮：回到船边的返程是数据条实时显示的直线耗气量；气量归零就中止下潜，只保留已经到手的东西。",
        "小心：复原图按船体部位划分，测绘图按网格划分——坐标永远叫不出舱位名，只有记录可以；而在淤泥潜点里先起捞会连读数一起丢掉。",
        "计分：展陈质量决定星级——有记录的碎片值 3 分，无记录最多 2 分，深度带对不上还要更低；带回碎片数量用于平分决胜。",
      ],
    },
  });

  /* Exported for the other modules. */
  App.initOceanArchaeologistGame = initOceanArchaeologistGame;
})(window.CapitalConvert = window.CapitalConvert || {});
