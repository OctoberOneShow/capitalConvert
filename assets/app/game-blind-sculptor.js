/* Blind Sculptor - the cross-section deduction game in the shared game drawer.
 * A hidden 3x3x3 solid is rebuilt from slice readings that each cost a probe:
 * the block count is free information, every reading is a plain sentence plus a
 * digit grid (never a colour), and the star bands are cut against a greedy
 * solver's measured par, so no level ships a band a player cannot reach.
 * Registered through the game registry, so it needs no markup in the pages. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  var t = App.t;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  var createCampaign = App.createCampaign;
  var fillCampaignPicker = App.fillCampaignPicker;
  var starsFor = App.starsFor;

  var bldCells = 27; /* a cell is z * 9 + y * 3 + x */
  var bldAll = (1 << 27) - 1;
  var bldAxes = ["z", "y", "x"]; /* top / front / side */
  var bldRevealCost = 2;

  /* want = deal flavour, minPar/maxPar bound the measured par, slack turns that
   * par into a probe budget, tries = how many submissions the level allows.
   * Ten rungs, and no rung loosens anything the rung before it asked for: the
   * measured par window never drops, the wasted-probe allowance (slack) never
   * grows, submissions never grow and the solid never shrinks. Three slices of
   * one axis already cover all 27 cells, so par saturates at 4 once the solid
   * sits at the crowded mid density where the free count pins nothing; past
   * that ceiling the rungs tighten on solid size and on allowed guesses. */
  var bldLevels = [
    { id: "b1", labelKey: "bldL1", noteKey: "bldN1", blocks: 3, want: "flat", minPar: 1, maxPar: 2, slack: 2, tries: 3, seed: 11 },
    { id: "b2", labelKey: "bldL2", noteKey: "bldN2", blocks: 4, want: "two", minPar: 2, maxPar: 3, slack: 2, tries: 3, seed: 212 },
    { id: "b3", labelKey: "bldL3", noteKey: "bldN3", blocks: 5, want: "topview", minPar: 2, maxPar: 3, slack: 2, tries: 3, seed: 333 },
    { id: "b4", labelKey: "bldL4", noteKey: "bldN4", blocks: 6, want: "overhang", minPar: 3, maxPar: 4, slack: 2, tries: 2, seed: 444 },
    { id: "b5", labelKey: "bldL5", noteKey: "bldN5", blocks: 6, want: "order", minPar: 3, maxPar: 4, slack: 1, tries: 2, seed: 555 },
    { id: "b6", labelKey: "bldL6", noteKey: "bldN6", blocks: 7, want: "topview", minPar: 3, maxPar: 3, slack: 1, tries: 2, seed: 666 },
    { id: "b7", labelKey: "bldL7", noteKey: "bldN7", blocks: 8, want: "overhang", minPar: 3, maxPar: 3, slack: 1, tries: 2, seed: 777 },
    { id: "b8", labelKey: "bldL8", noteKey: "bldN8", blocks: 10, want: "order", minPar: 3, maxPar: 3, slack: 1, tries: 2, seed: 888 },
    { id: "b9", labelKey: "bldL9", noteKey: "bldN9", blocks: 13, want: "topview", minPar: 4, maxPar: 4, slack: 1, tries: 1, seed: 999 },
    { id: "b10", labelKey: "bldL10", noteKey: "bldN10", blocks: 14, want: "order", minPar: 4, maxPar: 5, slack: 1, tries: 1, seed: 1010 },
  ];

  /* --- geometry, all pure --- */
  function bldIndex(x, y, z) { return z * 9 + y * 3 + x; }
  function bldX(i) { return i % 3; }
  function bldY(i) { return Math.floor(i / 3) % 3; }
  function bldZ(i) { return Math.floor(i / 9); }
  function bldAxisOk(a) { return a === "y" || a === "x" ? a : "z"; }
  function bldClamp(i) {
    var n = parseInt(i, 10);
    return isNaN(n) ? 0 : Math.max(0, Math.min(2, n));
  }
  /* Keys are 1-based for the player, so "Z2" is the middle layer. */
  function bldKey(axis, index) { return bldAxisOk(axis).toUpperCase() + (bldClamp(index) + 1); }
  function bldKeyAxis(k) { return bldAxisOk(String(k || "").charAt(0).toLowerCase()); }
  function bldKeyIndex(k) {
    var n = parseInt(String(k || "").slice(1), 10);
    return isNaN(n) ? 0 : bldClamp(n - 1);
  }
  function bldAxisWord(a) { return t(bldAxisOk(a) === "y" ? "bldAxisFront" : bldAxisOk(a) === "x" ? "bldAxisSide" : "bldAxisTop"); }
  function bldCapWord(a) { return t(bldAxisOk(a) === "y" ? "bldCapY" : bldAxisOk(a) === "x" ? "bldCapX" : "bldCapZ"); }

  /* A slice is the plane of nine cells at right angles to the axis, in
   * (row, column) order for that view: top = depth/width, front and side =
   * height/width and height/depth. */
  function bldPlaneCells(axis, index) {
    var a = bldAxisOk(axis), i = bldClamp(index), out = [], r, c;
    for (r = 0; r < 3; r += 1) {
      for (c = 0; c < 3; c += 1) {
        out.push(a === "y" ? bldIndex(c, i, r) : a === "x" ? bldIndex(i, c, r) : bldIndex(c, r, i));
      }
    }
    return out;
  }

  function bldPlaneMask(axis, index) {
    var cells = bldPlaneCells(axis, index), mask = 0, i;
    for (i = 0; i < 9; i += 1) mask |= 1 << cells[i];
    return mask;
  }

  function bldCount(mask) {
    var n = (mask || 0) >>> 0, c = 0;
    while (n) { n &= n - 1; c += 1; }
    return c;
  }

  function bldChoose(n, k) {
    if (n < 0 || k < 0 || k > n) return 0;
    var take = k > n - k ? n - k : k, acc = 1, i;
    for (i = 0; i < take; i += 1) acc = (acc * (n - i)) / (i + 1);
    return Math.round(acc);
  }

  /* Shapes arrive as a 27-bit mask, a list of cell numbers, a list of {x,y,z}
   * blocks, a 27-flag row, or anything generated returning {mask}. */
  function bldMaskOf(shape) {
    var mask = 0, i, v;
    if (typeof shape === "number") return shape & bldAll;
    if (!shape) return 0;
    if (typeof shape.mask === "number") return shape.mask & bldAll;
    if (typeof shape.length !== "number") {
      if (!shape.cells || typeof shape.cells.length !== "number") return 0;
      shape = shape.cells;
    }
    if (shape.length === bldCells) {
      for (i = 0; i < bldCells; i += 1) if (shape[i]) mask |= 1 << i;
      return mask;
    }
    for (i = 0; i < shape.length; i += 1) {
      v = shape[i];
      if (typeof v === "number") {
        if (v >= 0 && v < bldCells) mask |= 1 << v;
      } else if (v && typeof v.x === "number") {
        mask |= 1 << bldIndex(v.x, v.y, v.z);
      }
    }
    return mask;
  }

  function bldCellListOf(mask) {
    var out = [], i;
    for (i = 0; i < bldCells; i += 1) if (mask & (1 << i)) out.push(i);
    return out;
  }

  function bldWhere(cell) {
    return t("bldAt", { z: bldZ(cell) + 1, y: bldY(cell) + 1, x: bldX(cell) + 1 });
  }

  function bldWhereList(cells) {
    var out = [], i;
    for (i = 0; i < cells.length; i += 1) out.push(bldWhere(cells[i]));
    return out.join("; ");
  }

  /* --- readings: one sentence plus a digit grid, never colour --- */
  function bldRowText(row, at) {
    if (!at.length) return t("bldRowEmpty", { r: row });
    var list = at.join(", ");
    return at.length === 1 ? t("bldRowOne", { r: row, at: list }) : t("bldRowAt", { r: row, at: list });
  }

  /* Pure: the deterministic text + grid result of reading one slice. */
  function sculptorSlice(shape, axis, index) {
    var a = bldAxisOk(axis), i = bldClamp(index), mask = bldMaskOf(shape);
    var cells = bldPlaneCells(a, i), bits = [], grid = [], rows = [], parts = [], filled = 0;
    var r, c, at, line, on;
    for (r = 0; r < 3; r += 1) {
      line = "";
      at = [];
      for (c = 0; c < 3; c += 1) {
        on = mask & (1 << cells[r * 3 + c]) ? 1 : 0;
        bits.push(on);
        line += on ? "1" : "0";
        if (on) { at.push(c + 1); filled += 1; }
      }
      grid.push(line);
      rows.push({ row: r + 1, at: at });
      parts.push(bldRowText(r + 1, at));
    }
    return {
      key: bldKey(a, i), axis: a, index: i, cells: cells, bits: bits, grid: grid,
      rows: rows, filled: filled,
      text: t("bldSliceName", { key: bldKey(a, i) }) + ": " + parts.join("; ") + ".",
    };
  }

  /* A reading may come back as {bits}, {grid}, a nine-character row or a
   * 0..511 signature, so notebook data and test data both read the same way. */
  function bldBitsOf(src) {
    var out = [], i;
    if (!src && src !== 0) return null;
    if (typeof src === "number") {
      for (i = 0; i < 9; i += 1) out.push(src & (1 << i) ? 1 : 0);
      return out;
    }
    if (src.bits && src.bits.length === 9) return src.bits.slice(0);
    if (typeof src === "string") {
      if (src.length !== 9) return null;
      for (i = 0; i < 9; i += 1) out.push(src.charAt(i) === "1" ? 1 : 0);
      return out;
    }
    if (src.grid && src.grid.length === 3) {
      for (i = 0; i < 9; i += 1) {
        out.push(String(src.grid[Math.floor(i / 3)]).charAt(i % 3) === "1" ? 1 : 0);
      }
      return out;
    }
    if (typeof src.length === "number" && src.length === 9) return src.slice(0);
    return null;
  }

  /* Reduce readings to the cells they pin down: whole planes, plus any single
   * cell bought with a reveal. Conflicting readings mean nothing fits at all. */
  function bldReadings(axisSet, givenSlices, extraMask) {
    var covered = 0, filled = 0, clash = false, j, bit;
    var list = givenSlices && typeof givenSlices.length === "number" ? givenSlices : [];
    var i, entry, tag, axis, index, bits, cells;
    for (i = 0; i < list.length; i += 1) {
      entry = list[i] || {};
      tag = axisSet && axisSet[i] ? axisSet[i] : entry;
      if (typeof tag === "string") {
        axis = bldKeyAxis(tag);
        index = bldKeyIndex(tag);
      } else if (tag && typeof tag.axis === "string") {
        axis = bldAxisOk(tag.axis);
        index = bldClamp(tag.index);
      } else {
        axis = bldAxisOk(entry.axis);
        index = bldClamp(entry.index);
      }
      bits = bldBitsOf(entry);
      if (!bits) { clash = true; continue; }
      cells = bldPlaneCells(axis, index);
      for (j = 0; j < 9; j += 1) {
        bit = 1 << cells[j];
        if (covered & bit) {
          if ((filled & bit) !== (bits[j] ? bit : 0)) clash = true;
        } else {
          covered |= bit;
          if (bits[j]) filled |= bit;
        }
      }
    }
    extraMask = bldMaskOf(extraMask);
    for (i = 0; i < bldCells; i += 1) {
      bit = 1 << i;
      if (!(extraMask & bit)) continue;
      if ((covered & bit) && !(filled & bit)) clash = true;
      covered |= bit;
      filled |= bit;
    }
    return { covered: covered, filled: filled, clash: clash };
  }

  /* Pure: a read only ever fixes whole cells, so the solids that still fit are
   * exactly "place the quota blocks into the cells nobody has looked at". */
  function sculptorStatus(covered, filled, blocks) {
    var cov = (covered || 0) & bldAll, fin = (filled || 0) & cov;
    var unknown = bldCells - bldCount(cov);
    var known = typeof blocks === "number" && !isNaN(blocks);
    var quota = known ? blocks - bldCount(fin) : unknown;
    var shapes = known ? (quota < 0 ? 0 : bldChoose(unknown, quota)) : Math.pow(2, Math.min(unknown, 30));
    return { covered: cov, found: fin, unknown: unknown, quota: quota, shapes: shapes, unique: shapes === 1 };
  }

  /* Pure: how many solids still fit the measurements taken so far. */
  function sculptorCandidates(axisSet, givenSlices, blocks, extraMask) {
    var read = bldReadings(axisSet, givenSlices, extraMask);
    if (read.clash) return 0;
    return sculptorStatus(read.covered, read.filled, blocks).shapes;
  }

  /* --- the prover: the greedy the player is meant to imitate --- */
  function bldBestProbe(mask, covered, status) {
    var best = null, a, i, pmask, add, gain, count;
    for (a = 0; a < 3; a += 1) {
      for (i = 0; i < 3; i += 1) {
        pmask = bldPlaneMask(bldAxes[a], i);
        add = bldCount(pmask & ~covered & bldAll);
        if (!add) continue; /* a read plane is fully known, so it tells nothing */
        gain = bldCount(pmask & mask & ~covered);
        count = bldChoose(status.unknown - add, status.quota - gain);
        if (!best || count < best.count || (count === best.count && add > best.add)) {
          best = { axis: bldAxes[a], index: i, key: bldKey(bldAxes[a], i), count: count, add: add };
        }
      }
    }
    return best;
  }

  function bldSolve(mask, blocks, cap) {
    var covered = 0, steps = 0, order = [], guard = 0, status, pick;
    while (guard < 12) {
      guard += 1;
      status = sculptorStatus(covered, covered & mask, blocks);
      if (status.quota <= 0 || status.unknown <= 0) {
        return { probes: steps, order: order, unique: true };
      }
      pick = bldBestProbe(mask, covered, status);
      if (!pick) break;
      order.push(pick.key);
      covered = (covered | bldPlaneMask(pick.axis, pick.index)) & bldAll;
      steps += 1;
      if (cap && steps > cap) break;
    }
    return { probes: steps, order: order, unique: false };
  }

  /* Pure: the measured optimum the bands are cut against. A dealt shape keeps
   * the number its own proof produced; anything else is re-proved. */
  function sculptorMinProbes(shape, level) {
    var cap = level && typeof level.probes === "number" ? level.probes : 0;
    var run, mask, blocks;
    if (shape && typeof shape.par === "number") return shape.par;
    mask = bldMaskOf(shape);
    blocks = level && typeof level.blocks === "number" ? level.blocks : bldCount(mask);
    run = bldSolve(mask, blocks, cap);
    return run.unique ? run.probes : (cap || bldCells) + 1;
  }

  /* --- deal flavours --- */
  function bldHeightSpan(mask) {
    var seen = [0, 0, 0], n = 0, i;
    for (i = 0; i < bldCells; i += 1) {
      if ((mask & (1 << i)) && !seen[bldZ(i)]) { seen[bldZ(i)] = 1; n += 1; }
    }
    return n;
  }

  /* An overhang is a block whose neighbour below it is empty. */
  function bldHasOverhang(mask) {
    var i;
    for (i = 3; i < bldCells; i += 1) {
      if ((mask & (1 << i)) && !(mask & (1 << (i - 9)))) return true;
    }
    return false;
  }

  /* Two solids share a top view whenever one column holds neither none nor all
   * three blocks: that column restacks without moving the silhouette. */
  function bldTopViewAmbiguous(mask) {
    var counts = [], i, k;
    for (i = 0; i < 9; i += 1) counts.push(0);
    for (i = 0; i < bldCells; i += 1) {
      if (mask & (1 << i)) counts[bldY(i) * 3 + bldX(i)] += 1;
    }
    for (i = 0; i < 9; i += 1) {
      k = counts[i];
      if (k > 0 && k < 3) return true;
    }
    return false;
  }

  function bldFlavorOk(mask, want) {
    if (want === "flat") return bldHeightSpan(mask) === 1;
    if (want === "two") return bldHeightSpan(mask) === 2;
    if (want === "topview") return bldHeightSpan(mask) >= 2 && bldTopViewAmbiguous(mask);
    if (want === "overhang") return bldHeightSpan(mask) >= 2 && bldHasOverhang(mask);
    return bldHeightSpan(mask) >= 2;
  }

  /* A Lehmer generator: never Math.random, so a printed seed replays a deal. */
  function bldRng(seed) {
    var state = (Math.abs(Math.round(seed || 0)) % 2147483646) + 1;
    return function () {
      state = (state * 48271) % 2147483647;
      return (state - 1) / 2147483646;
    };
  }

  function bldPool(rng, want) {
    var pool = [], i, a, b;
    if (want === "flat") {
      a = Math.floor(rng() * 3);
      for (i = 0; i < 9; i += 1) pool.push(a * 9 + i);
      return pool;
    }
    if (want === "two") {
      a = Math.floor(rng() * 3);
      b = (a + 1 + Math.floor(rng() * 2)) % 3;
      for (i = 0; i < 9; i += 1) { pool.push(a * 9 + i); pool.push(b * 9 + i); }
      return pool;
    }
    for (i = 0; i < bldCells; i += 1) pool.push(i);
    return pool;
  }

  function bldDeal(rng, blocks, pool) {
    var mask = 0, need = Math.min(blocks, pool.length), guard = 0;
    if (!pool.length) return 0;
    while (bldCount(mask) < need && guard < 300) {
      guard += 1;
      mask |= 1 << pool[Math.floor(rng() * pool.length)];
    }
    return bldCount(mask) === need ? mask : 0;
  }

  /* Safety net if a seed never lands a flavour inside the band: a fixed
   * staircase holding exactly the wanted number of blocks. */
  function bldFixedMask(blocks) {
    var walk = [4, 13, 22, 3, 12, 21, 6, 15, 24, 1, 10, 19, 0, 9, 18, 2, 11, 20, 5, 14, 23, 7, 16, 25, 8, 17, 26];
    var mask = 0, i;
    for (i = 0; i < blocks && i < walk.length; i += 1) mask |= 1 << walk[i];
    return mask;
  }

  /* Pure, seeded: only ever returns solids the probe budget can pin down - the
   * prover rejects any shape whose candidates do not close to exactly one. */
  function sculptorGenerate(side, blocks, seed, filter) {
    var want = filter && filter.want ? filter.want : "any";
    var minPar = filter && typeof filter.minPar === "number" ? filter.minPar : 1;
    var maxPar = filter && typeof filter.maxPar === "number" ? filter.maxPar : 4;
    var slack = filter && typeof filter.slack === "number" ? filter.slack : 1;
    var need = Math.max(1, Math.min(bldCells - 1, Math.round(blocks) || 3));
    var rng = bldRng(seed), attempt, mask, run;
    for (attempt = 0; attempt < 400; attempt += 1) {
      mask = bldDeal(rng, need, bldPool(rng, want));
      if (!mask || bldCount(mask) !== need || !bldFlavorOk(mask, want)) continue;
      run = bldSolve(mask, need, 0);
      if (!run.unique || run.probes < minPar || run.probes > maxPar) continue;
      return { mask: mask, cells: bldCellListOf(mask), par: run.probes, order: run.order, probes: run.probes + slack, blocks: need };
    }
    mask = bldFixedMask(need);
    run = bldSolve(mask, bldCount(mask), 0);
    return { mask: mask, cells: bldCellListOf(mask), par: run.probes, order: run.order, probes: run.probes + slack, blocks: bldCount(mask) };
  }

  function bldDiff(maskA, maskB) {
    var miss = [], extra = [], i, bit;
    for (i = 0; i < bldCells; i += 1) {
      bit = 1 << i;
      if ((maskA & bit) && !(maskB & bit)) miss.push(i);
      else if (!(maskA & bit) && (maskB & bit)) extra.push(i);
    }
    return { miss: miss, extra: extra, bad: miss.length > 0 || extra.length > 0 };
  }

  function initBlindSculptorGame(panelEl) {
    if (!panelEl) return;

    var campaign = createCampaign({ key: "blind-sculptor-campaign", levels: bldLevels });
    var rounds = {};
    var st = null;
    var axisEls = [], indexEls = [], cellEls = [], readSpans = [];
    var axisNameKeys = ["bldAxisTop", "bldAxisFront", "bldAxisSide"];
    var i;

    /* --- helpers: every node through createElement, never innerHTML --- */
    function el(tag, cls, parent, text) {
      var node = document.createElement(tag);
      if (cls) node.className = cls;
      if (text !== undefined && text !== null) node.textContent = text;
      if (parent) parent.appendChild(node);
      return node;
    }

    function lab(tag, cls, parent, key) {
      var node = el(tag, cls, parent, t(key));
      node.setAttribute("data-i18n", key);
      return node;
    }

    function stat(key, valueEl) {
      var box = el("div", "game-stat", null);
      el("span", null, box, t(key)).setAttribute("data-i18n", key);
      box.appendChild(valueEl);
      return box;
    }

    function btn(cls, parent, key, handler) {
      var node = el("button", "bld-btn" + (cls ? " " + cls : ""), parent);
      node.type = "button";
      var content = el("span", "button-content", node);
      if (key) {
        el("span", null, content, t(key)).setAttribute("data-i18n", key);
      }
      if (handler) node.addEventListener("click", handler);
      return node;
    }

    function digits(box, count, cls) {
      var out = [], i;
      for (i = 0; i < count; i += 1) {
        out.push(el("span", "bld-digit" + (cls ? " " + cls : ""), box, "\u00b7"));
      }
      return out;
    }

    function fillDigits(spans, bits) {
      var i, on;
      for (i = 0; i < spans.length; i += 1) {
        on = bits && bits[i] ? 1 : 0;
        spans[i].textContent = bits ? (on ? "1" : "0") : "\u00b7";
        spans[i].classList.toggle("is-on", !!on);
      }
    }

    function clearBox(box) {
      while (box.firstChild) box.removeChild(box.firstChild);
    }

    /* --- markup, in the drawer's panel order --- */
    var hud = el("div", "game-hud", panelEl);
    var probesEl = el("strong");
    var targetEl = el("strong");
    var placedEl = el("strong");
    var shapesEl = el("strong");
    hud.appendChild(stat("bldProbeLabel", probesEl));
    hud.appendChild(stat("bldTargetLabel", targetEl));
    hud.appendChild(stat("bldPlacedLabel", placedEl));
    hud.appendChild(stat("bldShapesLabel", shapesEl));

    var probeBox = el("div", "bld-probe", panelEl);
    probeBox.tabIndex = 0;
    probeBox.setAttribute("role", "group");
    probeBox.setAttribute("aria-label", t("bldProbeAria"));
    var axisRow = el("div", "bld-row", probeBox);
    lab("span", "bld-cap", axisRow, "bldAxisLabel");
    bldAxes.forEach(function (axis, k) {
      var node = btn("bld-axis", axisRow, axisNameKeys[k], function () {
        if (!st) return;
        st.axis = axis;
        renderAll();
      });
      node.setAttribute("data-axis", axis);
      axisEls.push(node);
    });
    var indexRow = el("div", "bld-row", probeBox);
    lab("span", "bld-cap", indexRow, "bldSliceLabel");
    for (i = 0; i < 3; i += 1) {
      (function (n) {
        var node = btn("bld-index", indexRow, null, function () {
          if (!st) return;
          st.index = n;
          renderAll();
        });
        el("span", "bld-idx-num", node.firstChild, String(n + 1));
        indexEls.push(node);
      })(i);
    }
    var probeBtn = btn("bld-go primary", probeBox, "bldBtnProbe", doProbe);
    var readout = el("div", "bld-readout", probeBox);
    var readLine = el("p", "bld-read", readout);
    readLine.setAttribute("aria-live", "polite");
    var readGrid = el("div", "bld-grid", readout);
    readGrid.setAttribute("aria-hidden", "true");
    readSpans = digits(readGrid, 9);
    var readCap = el("p", "bld-gridcap", readout);
    var forecastEl = el("p", "bld-forecast", readout);
    var notebook = el("div", "bld-notebook", probeBox);
    lab("p", "bld-note-cap", notebook, "bldNoteCap");
    var noteList = el("div", "bld-notes", notebook);

    var build = el("div", "bld-build", panelEl);
    build.tabIndex = 0;
    build.setAttribute("role", "group");
    build.setAttribute("aria-label", t("bldBuildAria"));
    for (i = 2; i >= 0; i -= 1) {
      (function (layer) {
        var box = el("div", "bld-layer", build);
        el("p", "bld-layer-cap", box, t("bldLayerCap", { n: layer + 1 }));
        var rows = el("div", "bld-cells", box);
        var y, x;
        for (y = 0; y < 3; y += 1) {
          for (x = 0; x < 3; x += 1) {
            (function (cell) {
              cellEls[cell] = btn("bld-cell", rows, null, function () {
                toggleCell(cell);
              });
              cellEls[cell].dataset.cell = String(cell);
            })(bldIndex(x, y, layer));
          }
        }
      })(i);
    }
    var result = el("p", "game-result", panelEl);
    result.setAttribute("role", "status");

    var pickRow = el("div", "elements-row", panelEl);
    var pickLabel = el("label", "elements-label", pickRow, t("bldSelectLabel"));
    pickLabel.setAttribute("for", "bldBlockSel");
    pickLabel.setAttribute("data-i18n", "bldSelectLabel");
    var pickSel = el("select", "elements-select", pickRow);
    pickSel.id = "bldBlockSel";

    var actions = el("div", "game-actions", panelEl);
    var submitBtn = btn("primary", actions, "bldBtnSubmit", submitBuild);
    btn("", actions, "bldBtnClear", clearBuild);
    btn("", actions, "bldBtnReveal", revealBlock);
    btn("", actions, "btnNewRound", function () {
      var id = st ? st.def.id : campaign.nextLevelId();
      rounds[id] = (rounds[id] || 0) + 1;
      loadRound(levelOf(id), rounds[id]);
    });
    var bestEl = el("p", "game-best", actions);

    lab("p", "game-hint", panelEl, "bldHint");

    /* --- state reads --- */
    function levelOf(id) {
      var i;
      for (i = 0; i < bldLevels.length; i += 1) {
        if (bldLevels[i].id === id) return bldLevels[i];
      }
      return bldLevels[0];
    }

    function buildMask() {
      var mask = 0, i;
      for (i = 0; i < bldCells; i += 1) if (st.build[i]) mask |= 1 << i;
      return mask;
    }

    function noteAt(axis, index) {
      var i;
      for (i = 0; i < st.notes.length; i += 1) {
        if (st.notes[i].axis === bldAxisOk(axis) && st.notes[i].index === bldClamp(index)) return i;
      }
      return -1;
    }

    function noteKeys() {
      return st.notes.map(function (n) { return n.key; });
    }

    /* The live reading of the notebook: what is pinned down and what still fits. */
    function cover() {
      var keys = noteKeys();
      var read = bldReadings(keys, st.notes, st.hintMask);
      var status = sculptorStatus(read.covered, read.filled, st.blocks);
      status.shapes = read.clash ? 0 : sculptorCandidates(keys, st.notes, st.blocks, st.hintMask);
      status.unique = status.shapes === 1;
      return status;
    }

    function band() { return [st.par, st.par + 1, st.budget]; }

    function say(key, vars) {
      result.textContent = t(key, vars);
    }

    /* --- spending a probe --- */
    function doProbe() {
      if (!st) return;
      if (st.phase !== "play") { say("bldDone"); return; }
      var at = noteAt(st.axis, st.index);
      if (at >= 0) {
        st.pin = at;
        say("bldAlready", { key: st.notes[at].key, n: st.notes[at].filled });
        renderAll();
        return;
      }
      if (st.probes <= 0) { say("bldNoProbe"); return; }
      var slice = sculptorSlice(st.mask, st.axis, st.index);
      st.probes -= 1;
      st.notes.push({
        key: slice.key, axis: slice.axis, index: slice.index, bits: slice.bits,
        grid: slice.grid, filled: slice.filled, text: slice.text, locked: false,
      });
      st.pin = st.notes.length - 1;
      var status = cover();
      say("bldRead", { key: slice.key, n: slice.filled, shapes: status.shapes, left: st.probes });
      if (status.unique) result.textContent += " " + t("bldOnlyOne");
      else if (st.probes <= 0) result.textContent += " " + t("bldNoProbe");
      renderAll();
    }

    /* --- the player's own grid --- */
    function toggleCell(cell) {
      if (!st) return;
      if (st.phase !== "play") { say("bldDone"); return; }
      if (cell < 0 || cell >= bldCells) return;
      st.cursor = { x: bldX(cell), y: bldY(cell), z: bldZ(cell) };
      if (st.build[cell]) {
        st.build[cell] = 0;
        st.placed -= 1;
      } else {
        st.build[cell] = 1;
        st.placed += 1;
      }
      renderAll();
    }

    function clearBuild() {
      if (!st) return;
      if (st.phase !== "play") { say("bldDone"); return; }
      st.build = [];
      var i;
      for (i = 0; i < bldCells; i += 1) st.build[i] = 0;
      st.placed = 0;
      say("bldCleared", { shapes: cover().shapes });
      renderAll();
    }

    /* A reveal buys one true cell outright - useful, never required. */
    function revealBlock() {
      if (!st) return;
      if (st.phase !== "play") { say("bldDone"); return; }
      if (st.probes < bldRevealCost) {
        say("bldRevealCost", { n: bldRevealCost, left: st.probes });
        return;
      }
      var status = cover(), found = -1, i;
      for (i = 0; i < bldCells; i += 1) {
        if ((st.mask & (1 << i)) && !(status.covered & (1 << i))) { found = i; break; }
      }
      if (found < 0) { say("bldRevealNone", { shapes: status.shapes }); return; }
      st.probes -= bldRevealCost;
      st.hintMask |= 1 << found;
      st.hints.push(t("bldReveal", { where: bldWhere(found) }) + " " + t("bldRevealPaid", { n: bldRevealCost, left: st.probes }));
      renderAll();
    }

    /* --- submitting --- */
    function submitBuild() {
      if (!st) return;
      if (st.phase !== "play") { say("bldDone"); return; }
      if (st.placed <= 0) { say("bldEmptyBuild"); return; }
      if (st.placed !== st.blocks) {
        say("bldWrongCount", { n: st.placed, blocks: st.blocks });
        return;
      }
      var diff = bldDiff(st.mask, buildMask());
      if (!diff.bad) { winRound(); return; }
      st.tries -= 1;
      if (st.tries <= 0) { loseRound(); return; }
      say("bldMiss", {
        a: diff.miss.length, b: diff.extra.length, tries: st.tries,
        list: bldWhereList(diff.miss.concat(diff.extra)),
      });
      renderAll();
    }

    function winRound() {
      var used = st.budget - st.probes;
      var starsWon = starsFor(used, band(), "low");
      var outcome = campaign.record(st.def.id, { stars: starsWon, best: used, better: "low" });
      st.phase = "won";
      var message = t("bldWon", { n: used, par: st.par, s: starsWon });
      if (outcome.isBest) message += " " + t("newBest");
      if (outcome.unlockedNext) message += " " + t("bldNextBlock");
      else if (campaign.clearedCount() === bldLevels.length) message += " " + t("bldCampaignDone");
      result.textContent = message;
      logAction(t("logBlindSculptor", { n: used }));
      var rect = submitBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      renderAll();
    }

    function loseRound() {
      st.phase = "lost";
      say("bldLost", { list: bldWhereList(bldCellListOf(st.mask)), par: st.par });
      renderAll();
    }

    /* --- rendering --- */
    function renderHud() {
      var status = cover(), best = campaign.best(st.def.id);
      probesEl.textContent = t("bldProbesLeft", { n: st.probes, max: st.budget });
      targetEl.textContent = t("bldTargetOf", { n: st.blocks });
      placedEl.textContent = t("bldPlacedOf", { n: st.placed, max: st.blocks });
      shapesEl.textContent = t("bldShapesOf", { n: status.shapes, par: st.par });
      bestEl.textContent =
        t("campaignStars", { n: campaign.totalStars(), max: campaign.maxStars() }) +
        " \u00b7 " + (best > 0 ? t("bldBestProbes", { n: best }) : t("noBest")) +
        " \u00b7 " + t("bldTriesLeft", { n: st.tries });
    }

    /* The forecast is the strategy: what a slice could still leave open, worked
     * out from paid measurements only, so it gives nothing away for free. */
    function renderReadout() {
      var status = cover(), picked = bldKey(st.axis, st.index);
      var cells = bldPlaneCells(st.axis, st.index), at = noteAt(st.axis, st.index);
      var shown = st.pin >= 0 && st.pin < st.notes.length ? st.notes[st.pin] : at >= 0 ? st.notes[at] : null;
      var add = 0, i, f, value, low = null, high = null, lo = 0, hi = 0;
      for (i = 0; i < 9; i += 1) if (!(status.covered & (1 << cells[i]))) add += 1;
      if (shown) {
        readLine.textContent = shown.text;
        fillDigits(readSpans, shown.bits);
        readCap.textContent = bldCapWord(shown.axis);
      } else {
        readLine.textContent = t("bldReadEmpty", { key: picked });
        fillDigits(readSpans, null);
        readCap.textContent = bldCapWord(st.axis);
      }
      if (status.unique) {
        forecastEl.textContent = t("bldOnlyOne");
        return;
      }
      if (at >= 0) {
        forecastEl.textContent = t("bldAlready", { key: picked, n: st.notes[at].filled });
        return;
      }
      if (st.probes <= 0) {
        forecastEl.textContent = t("bldNoProbe");
        return;
      }
      if (!add) {
        forecastEl.textContent = t("bldNoForecast", { left: st.placed });
        return;
      }
      lo = Math.max(0, status.quota - status.unknown + add);
      hi = Math.min(add, status.quota);
      for (f = lo; f <= hi; f += 1) {
        value = bldChoose(status.unknown - add, status.quota - f);
        if (low === null || value < low) low = value;
        if (high === null || value > high) high = value;
      }
      forecastEl.textContent = t("bldForecast", {
        key: picked, min: low === null ? 0 : low, max: high === null ? 0 : high, cells: add,
      });
    }

    function renderNotes() {
      clearBox(noteList);
      if (!st.notes.length && !st.hints.length) {
        el("p", "bld-note-empty", noteList, t("bldNoteEmpty"));
        return;
      }
      st.notes.forEach(function (note, index) {
        var row = el("div", "bld-entry" + (note.locked ? " is-pinned" : ""), noteList);
        el("p", "bld-entry-line", row, note.text);
        if (note.locked) {
          var grid = el("div", "bld-grid bld-grid-mini-box", row);
          grid.setAttribute("aria-hidden", "true");
          fillDigits(digits(grid, 9, "bld-digit-mini"), note.bits);
        }
        btn("bld-lock", row, note.locked ? "bldBtnUnpin" : "bldBtnPin", function () {
          note.locked = !note.locked;
          st.pin = note.locked ? index : st.pin === index ? -1 : st.pin;
          renderAll();
        });
      });
      st.hints.forEach(function (text) {
        el("p", "bld-entry bld-entry-hint", noteList, text);
      });
    }

    function renderBuild() {
      var i, node, on, here;
      for (i = 0; i < bldCells; i += 1) {
        node = cellEls[i];
        if (!node) continue;
        on = st.build[i] ? 1 : 0;
        here = st.cursor.x === bldX(i) && st.cursor.y === bldY(i) && st.cursor.z === bldZ(i);
        node.textContent = on ? "\u25a0" : "\u00b7";
        node.className = "bld-btn bld-cell" + (on ? " is-on" : "") + (here ? " is-cursor" : "");
        node.setAttribute("aria-pressed", on ? "true" : "false");
        node.setAttribute("aria-label", t("bldCellAria", {
          z: bldZ(i) + 1, y: bldY(i) + 1, x: bldX(i) + 1,
          state: on ? t("bldBlockOn") : t("bldBlockOff"),
        }));
      }
    }

    function renderPicks() {
      var i, node, done;
      for (i = 0; i < axisEls.length; i += 1) {
        node = axisEls[i];
        done = node.getAttribute("data-axis") === st.axis;
        node.className = "bld-btn bld-axis" + (done ? " is-picked" : "");
        node.setAttribute("aria-pressed", done ? "true" : "false");
      }
      for (i = 0; i < indexEls.length; i += 1) {
        node = indexEls[i];
        done = noteAt(st.axis, i) >= 0;
        node.className = "bld-btn bld-index" + (i === st.index ? " is-picked" : "") + (done ? " is-read" : "");
        node.setAttribute("aria-pressed", i === st.index ? "true" : "false");
        node.setAttribute("aria-label", t("bldIndexAria", { a: bldAxisWord(st.axis), n: i + 1 }) + (done ? " \u2713" : ""));
      }
      probeBtn.className = "bld-btn bld-go primary" + (st.probes > 0 ? "" : " is-spent");
      probeBtn.setAttribute("aria-label", t("bldProbeAria"));
    }

    function renderAll() {
      if (!st) return;
      renderHud();
      renderPicks();
      renderReadout();
      renderNotes();
      renderBuild();
    }

    /* --- dealing --- */
    function loadRound(def, seedIndex) {
      var round = seedIndex || 1;
      var dealt = sculptorGenerate(3, def.blocks, def.seed + round * 101, def);
      var par = sculptorMinProbes(dealt, { blocks: def.blocks });
      var budget = Math.max(par + 1, dealt.probes || par + def.slack);
      st = {
        def: def, mask: dealt.mask, blocks: def.blocks, par: par, budget: budget,
        probes: budget, tries: def.tries, notes: [], hints: [], hintMask: 0,
        build: [], placed: 0, axis: "z", index: 0, cursor: { x: 0, y: 0, z: 0 },
        pin: -1, phase: "play", round: round,
      };
      for (i = 0; i < bldCells; i += 1) st.build[i] = 0;
      fillCampaignPicker(
        pickSel,
        campaign,
        function (row) { return t(row.labelKey); },
        t("elementsLocked"),
      );
      pickSel.value = def.id;
      renderAll();
      say("bldPrompt", {
        name: t(def.labelKey), blocks: def.blocks, probes: budget,
        par: par, note: t(def.noteKey),
      });
    }

    /* --- keyboard: a whole game is playable without a pointer --- */
    probeBox.addEventListener("keydown", function (event) {
      if (!st || (event.target && event.target.tagName === "BUTTON")) return;
      var back = event.key === "ArrowLeft" || event.key === "ArrowUp";
      var forth = event.key === "ArrowRight" || event.key === "ArrowDown";
      var step = back || forth ? forth ? 1 : -1 : 0;
      if (step) {
        event.preventDefault();
        st.axis = bldAxes[(bldAxes.indexOf(st.axis) + step + 3) % 3];
        renderAll();
        return;
      }
      if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
        event.preventDefault();
        doProbe();
      }
    });

    build.addEventListener("keydown", function (event) {
      if (!st || (event.target && event.target.tagName === "BUTTON")) return;
      var moves = {
        ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
        ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 },
      };
      if (moves[event.key]) {
        event.preventDefault();
        st.cursor.x = Math.max(0, Math.min(2, st.cursor.x + moves[event.key].x));
        st.cursor.y = Math.max(0, Math.min(2, st.cursor.y + moves[event.key].y));
        renderBuild();
        return;
      }
      if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
        event.preventDefault();
        toggleCell(bldIndex(st.cursor.x, st.cursor.y, st.cursor.z));
        return;
      }
      if (event.key === "z" || event.key === "Z" || event.key === "x" || event.key === "X") {
        event.preventDefault();
        var up = event.key === "x" || event.key === "X";
        st.cursor.z = Math.max(0, Math.min(2, st.cursor.z + (up ? 1 : -1)));
        renderBuild();
        say("bldLayerNow", { n: st.cursor.z + 1 });
        return;
      }
      if (event.key === "Escape") {
        say("bldEscape", { left: st.probes, placed: st.placed, shapes: cover().shapes, par: st.par });
      }
    });

    pickSel.addEventListener("change", function () {
      var index = campaign.indexOf(pickSel.value);
      if (index < 0) return;
      if (!campaign.isUnlocked(pickSel.value)) {
        pickSel.value = st.def.id;
        say("bldLocked", { name: t(bldLevels[index].labelKey) });
        return;
      }
      rounds[bldLevels[index].id] = rounds[bldLevels[index].id] || 0;
      loadRound(bldLevels[index], rounds[bldLevels[index].id]);
    });

    /* Turn-based with no clock: the readings survive every tab switch whole. */
    App.quietResetBlindSculptor = function () {
      if (st && st.phase === "play") {
        say("bldPaused", { probes: st.probes, shapes: cover().shapes });
      }
    };

    loadRound(levelOf(campaign.nextLevelId()), 1);
  }

  /* Bilingual copy travels with the game: addStrings only fills keys i18n.js
   * does not already own, so the shared dictionary stays authoritative. */
  App.addStrings({
    en: {
      "tabBlindSculptor": "Blind Sculptor",
      "bldL1": "Flat Tray",
      "bldL2": "Two Shelves",
      "bldL3": "Twin Top Views",
      "bldL4": "Overhang",
      "bldL5": "Master Block",
      "bldL6": "Silhouette Seven",
      "bldL7": "Balcony Eight",
      "bldL8": "Tenfold Stack",
      "bldL9": "Thirteen Shadows",
      "bldL10": "Half the Cube",
      "bldN1": "Every block of this solid sits in one height.",
      "bldN2": "This solid uses exactly two heights.",
      "bldN3": "A second solid shares this one's top view, so height alone will not do it.",
      "bldN4": "Some block hangs over the empty space beneath it.",
      "bldN5": "Read the block count as closely as the slices.",
      "bldN6": "Seven blocks, and a second solid shares this one's top view.",
      "bldN7": "Eight blocks, and at least one hangs over the empty air below it.",
      "bldN8": "Ten blocks stand on more than one height: the free count does half the work.",
      "bldN9": "Thirteen blocks share their top view with another solid, so the count alone settles nothing.",
      "bldN10": "Fourteen blocks is past half the cube - the crowded middle, where the count narrows least.",
      "bldProbeLabel": "Probes",
      "bldTargetLabel": "Blocks",
      "bldPlacedLabel": "Placed",
      "bldShapesLabel": "Still fits",
      "bldAxisLabel": "Axis",
      "bldSliceLabel": "Slice",
      "bldAxisTop": "Top",
      "bldAxisFront": "Front",
      "bldAxisSide": "Side",
      "bldBtnProbe": "Read slice",
      "bldBtnSubmit": "Submit build",
      "bldBtnClear": "Clear build",
      "bldBtnReveal": "Reveal one",
      "bldBtnPin": "Pin",
      "bldBtnUnpin": "Unpin",
      "bldSelectLabel": "Choose a solid",
      "bldNoteCap": "Measurements notebook",
      "bldNoteEmpty": "No slice read yet.",
      "bldSliceName": "Slice {key}",
      "bldRowEmpty": "row {r} is empty",
      "bldRowOne": "row {r} has a block at {at}",
      "bldRowAt": "row {r} has blocks at {at}",
      "bldAt": "height {z}, row {y}, column {x}",
      "bldCapZ": "Top view: row 1 is the front, column 1 is the left.",
      "bldCapY": "Front view: row 1 is the lowest height, column 1 is the left.",
      "bldCapX": "Side view: row 1 is the lowest height, column 1 is the front.",
      "bldLayerCap": "Height {n}",
      "bldBlockOn": "block placed",
      "bldBlockOff": "empty",
      "bldCellAria": "Height {z}, row {y}, column {x}: {state}",
      "bldIndexAria": "{a} slice {n}",
      "bldProbesLeft": "{n} of {max}",
      "bldTargetOf": "{n} hidden",
      "bldPlacedOf": "{n}/{max}",
      "bldShapesOf": "{n} shapes (par {par})",
      "bldTriesLeft": "{n} guesses",
      "bldBestProbes": "best {n} probes",
      "bldProbeAria": "Slice probe: arrows pick the axis, Enter reads the picked slice.",
      "bldBuildAria": "Build grid: arrows move the cursor, Enter places or removes a block, z and x change height, Escape reads the summary.",
      "bldReadEmpty": "Picked {key}: nothing read yet.",
      "bldForecast": "{key} would bring {cells} fresh cells to hand: between {min} and {max} shapes would still fit.",
      "bldNoForecast": "That read would teach nothing new - {left} blocks are placed so far.",
      "bldRead": "{key}: {n} block(s) in this slice. {shapes} shapes still fit, {left} probes left.",
      "bldOnlyOne": "Only one shape fits - copy it and submit.",
      "bldNoProbe": "No probes left - the notebook holds every reading you paid for.",
      "bldAlready": "{key} is already read ({n} blocks). No probe was spent.",
      "bldEmptyBuild": "Nothing is placed yet: read a slice, then set some blocks.",
      "bldWrongCount": "You placed {n} blocks; this solid holds exactly {blocks}. Match the count or read again.",
      "bldMiss": "Wrong: {a} missing, {b} extra ({list}). {tries} guesses left.",
      "bldWon": "Rebuilt in {n} probes (par {par}) - {s} stars.",
      "bldLost": "No guesses left. The hidden solid was {list} Par was {par} probes.",
      "bldRevealCost": "A reveal costs {n} probes and you hold {left}.",
      "bldReveal": "A block sits at {where}.",
      "bldRevealPaid": "Costs {n} probes, {left} left.",
      "bldRevealNone": "Every block is already fixed by your readings - the reveal would be wasted.",
      "bldCleared": "Build emptied. {shapes} shapes still fit your readings.",
      "bldPrompt": "{name}: {blocks} blocks hidden, {probes} probes, par {par} of them. {note}",
      "bldDone": "This solid is finished - start a new round or pick another one.",
      "bldNextBlock": "Next solid unlocked.",
      "bldCampaignDone": "Ten solids, all rebuilt blind.",
      "bldLocked": "{name} waits until the solid before it is rebuilt.",
      "bldLayerNow": "Building height {n}.",
      "bldEscape": "{left} probes left, {placed} blocks placed, {shapes} shapes still fit (par {par}).",
      "bldPaused": "Bench paused - {probes} probes and every reading are kept ({shapes} shapes fit).",
      "bldHint": "Height 1 is the floor. The block count is free: once your readings show every block, every cell nobody has probed must be empty.",
      "logBlindSculptor": "Rebuilt a hidden solid in {n} probes",
    },
    zh: {
      "tabBlindSculptor": "盲眼雕刻家",
      "bldL1": "平托盘",
      "bldL2": "两层搁板",
      "bldL3": "相同俯视图",
      "bldL4": "悬挑",
      "bldL5": "大师方块",
      "bldL6": "七块剪影",
      "bldL7": "八块挑檐",
      "bldL8": "十块叠塔",
      "bldL9": "十三重影",
      "bldL10": "半壁立方",
      "bldN1": "这个立体的所有方块都在同一个高度。",
      "bldN2": "这个立体刚好用到两个高度。",
      "bldN3": "有另一个立体和它俯视图相同，所以只看一层不够。",
      "bldN4": "有方块悬在它下方那块空位之上。",
      "bldN5": "方块数量和切面一样值得细读。",
      "bldN6": "七个方块，另有立体与它们俯视图相同。",
      "bldN7": "八个方块，至少有一块悬在下方空位之上。",
      "bldN8": "十个方块不止占一个高度：免费的方块数能替你办一半的事。",
      "bldN9": "十三个方块与另一个立体俯视图相同，光靠数量定不下来。",
      "bldN10": "十四块已超过半个立方体，正是最挤的中间密度，数量筛掉的东西最少。",
      "bldProbeLabel": "探针",
      "bldTargetLabel": "方块数",
      "bldPlacedLabel": "已放",
      "bldShapesLabel": "仍符合",
      "bldAxisLabel": "轴向",
      "bldSliceLabel": "切面",
      "bldAxisTop": "俯视",
      "bldAxisFront": "正视",
      "bldAxisSide": "侧视",
      "bldBtnProbe": "读取切面",
      "bldBtnSubmit": "提交作品",
      "bldBtnClear": "清空作品",
      "bldBtnReveal": "揭示一块",
      "bldBtnPin": "钉住",
      "bldBtnUnpin": "取消钉住",
      "bldSelectLabel": "选择立体",
      "bldNoteCap": "测量记录本",
      "bldNoteEmpty": "还没有读取过任何切面。",
      "bldSliceName": "切面 {key}",
      "bldRowEmpty": "第 {r} 行是空的",
      "bldRowOne": "第 {r} 行在 {at} 有一个方块",
      "bldRowAt": "第 {r} 行在 {at} 有方块",
      "bldAt": "第 {z} 层、第 {y} 行、第 {x} 列",
      "bldCapZ": "俯视图：第 1 行是前面，第 1 列是左边。",
      "bldCapY": "正视图：第 1 行是最底层，第 1 列是左边。",
      "bldCapX": "侧视图：第 1 行是最底层，第 1 列是前面。",
      "bldLayerCap": "第 {n} 层",
      "bldBlockOn": "已放方块",
      "bldBlockOff": "空",
      "bldCellAria": "第 {z} 层、第 {y} 行、第 {x} 列：{state}",
      "bldIndexAria": "{a}第 {n} 个切面",
      "bldProbesLeft": "{n} / 共 {max}",
      "bldTargetOf": "藏着 {n} 块",
      "bldPlacedOf": "{n}/{max}",
      "bldShapesOf": "还剩 {n} 种形状（标准 {par} 次）",
      "bldTriesLeft": "可交 {n} 次",
      "bldBestProbes": "最佳 {n} 次探针",
      "bldProbeAria": "切面探测：方向键换轴，回车读取选中的切面。",
      "bldBuildAria": "搭建网格：方向键移动光标，回车放或取方块，z 和 x 换层，Escape 读出概况。",
      "bldReadEmpty": "选中 {key}：还没读取。",
      "bldForecast": "{key} 会新看清 {cells} 格：读完后仍有 {min} 到 {max} 种形状符合。",
      "bldNoForecast": "这一刀学不到新东西——目前只放了 {left} 块。",
      "bldRead": "{key}：这一层有 {n} 个方块。仍有 {shapes} 种形状符合，还剩 {left} 次探针。",
      "bldOnlyOne": "只剩一种符合的形状——照它摆好再提交。",
      "bldNoProbe": "没有探针了——记录本里就是你花钱买到的全部读数。",
      "bldAlready": "{key} 已经读过（{n} 块），这次不花探针。",
      "bldEmptyBuild": "作品还是空的：先读一个切面，再放方块。",
      "bldWrongCount": "你放了 {n} 块，而这个立体正好 {blocks} 块。先把数量对上，或者再读一刀。",
      "bldMiss": "不对：缺 {a} 块、多 {b} 块（{list}）。还能交 {tries} 次。",
      "bldWon": "用 {n} 次探针重建完成（标准 {par}）- 获得 {s} 星。",
      "bldLost": "次数用完。隐藏的立体是 {list} 标准是 {par} 次探针。",
      "bldRevealCost": "揭示一次要花 {n} 次探针，你只剩 {left} 次。",
      "bldReveal": "有一个方块在{where}。",
      "bldRevealPaid": "花了 {n} 次探针，还剩 {left} 次。",
      "bldRevealNone": "每个方块都已被你的读数定住，这次揭示是浪费。",
      "bldCleared": "作品已清空。你的读数下仍有 {shapes} 种形状符合。",
      "bldPrompt": "{name}：藏着 {blocks} 个方块，给你 {probes} 次探针，标准 {par} 次。{note}",
      "bldDone": "这个立体已经重建好了——换下一个或者开一局新的。",
      "bldNextBlock": "解锁下一个立体。",
      "bldCampaignDone": "十个立体全部盲眼重建完毕。",
      "bldLocked": "「{name}」要等前一个立体重建完才开放。",
      "bldLayerNow": "正在搭建第 {n} 层。",
      "bldEscape": "还剩 {left} 次探针，已放 {placed} 块，仍有 {shapes} 种形状符合（标准 {par} 次）。",
      "bldPaused": "工作台暂停——保留 {probes} 次探针和全部读数（{shapes} 种形状符合）。",
      "bldHint": "第 1 层是地面。方块数量是免费信息：一旦读数里已经凑齐全部方块，没探过的格子就只能空着。",
      "logBlindSculptor": "用 {n} 次探针重建了隐藏的立体",
    },
  });

  App.registerGame({
    name: "blindSculptor",
    tabKey: "tabBlindSculptor",
    init: initBlindSculptorGame,
    guide: {
      svg:
        '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="6" y="6" width="108" height="64" rx="5" fill="rgba(30,41,59,.75)" stroke="rgba(148,163,184,.45)"/>' +
        '<path d="M20 30l14-7 14 7v18l-14 7-14-7z" fill="none" stroke="#22d3ee" stroke-width="1.6"/>' +
        '<path d="M20 30l14 7 14-7M34 37v18" fill="none" stroke="rgba(148,163,184,.5)" stroke-width="1.2"/>' +
        '<path d="M27 24v20M41 24v20" fill="none" stroke="rgba(148,163,184,.28)" stroke-width="1"/>' +
        '<rect x="70" y="16" width="11" height="11" fill="#a3e635"/><rect x="83" y="16" width="11" height="11" fill="rgba(148,163,184,.18)"/>' +
        '<rect x="96" y="16" width="11" height="11" fill="rgba(148,163,184,.18)"/><rect x="70" y="29" width="11" height="11" fill="rgba(148,163,184,.18)"/>' +
        '<rect x="83" y="29" width="11" height="11" fill="#a3e635"/><rect x="96" y="29" width="11" height="11" fill="rgba(148,163,184,.18)"/>' +
        '<text x="70" y="53" font-size="9" fill="#fbbf24">101 100 000</text>' +
        '<text x="70" y="64" font-size="8" fill="#94a3b8">slice Z2</text></svg>',
      en: [
        "Aim: rebuild a hidden 3x3x3 solid. How many blocks it holds is printed in the panel and costs nothing.",
        "Probe: pick an axis (Top, Front, Side) and a slice number, then read it for one probe - the answer is a sentence and a grid of 1s and 0s, never a colour.",
        "Rule: one slice fixes nine cells exactly; cells no slice has touched stay unknown, so choose which nine are worth the probe.",
        "Count: once your readings show every block, every untouched cell must be empty - that step is what turns slices into one shape.",
        "Build: place blocks on your own grid (click, or arrows plus Enter, z and x for height), then submit; missing and extra blocks are both named in words.",
        "Scoring: probes used are graded against a solver's measured par; a reveal costs two probes and is never required.",
      ],
      zh: [
        "目标：重建一个隐藏的 3x3x3 立体。它由几个方块组成会写在面板上，这部分不要钱。",
        "探测：先选轴向（俯视、正视、侧视）再选第几个切面，读一次花一次探针——答案是一句话加一格 1 和 0，不靠颜色。",
        "规则：一刀正好看清九格，没被任何切面扫到的格子仍然未知，所以要把探针花在最有价值的九格上。",
        "计数：当读数里的方块已经凑满总数，没探过的格子就必然空着——这一步才把切面变成一个形状。",
        "搭建：在自己的网格上放或取方块（点击，或方向键加回车，z 和 x 换层），然后提交；缺哪块、多哪块都会用文字念出来。",
        "计分：用掉的探针次数和解题器实测的标准次数对比给星；揭示一次要花两次探针，但从不必需。",
      ],
    },
  });

  /* Exported for the other modules. */
  App.initBlindSculptorGame = initBlindSculptorGame;
  App.sculptorSlice = sculptorSlice;
  App.sculptorCandidates = sculptorCandidates;
  App.sculptorMinProbes = sculptorMinProbes;
  App.sculptorGenerate = sculptorGenerate;
  App.sculptorStatus = sculptorStatus;
  App.sculptorLevels = bldLevels;
  App.sculptorCellIndex = bldIndex;
})(window.CapitalConvert = window.CapitalConvert || {});
