"use strict";

/* glyph-bastion: the deep tier 31-40 is proven by the shipped prover.
 *
 * Every rung of the ladder is replayed through App.bastionSolvable, the same
 * purse loop the build and run buttons drive: the whole plan has to be bought
 * and the board has to stay under its leak allowance. The ten new rungs face
 * the stricter bar - a clean finish, their star band priced off the measured
 * App.bastionCost as [cost, cost + 2, cost + 4], and the plan standing off
 * every road. Their shape is the tier's promise: four or five roads, eleven to
 * fourteen waves in an order no earlier rung uses, a 13-14 stand cap, and a
 * purse that tightens to zero at the summit (g35 is the late levy, one wave's
 * pay short until the first hold pays out).
 *
 * A shape check alone cannot tell a chokepoint from decoration, so each new
 * rung is also cut: one specific tower is dropped from a clone of the authored
 * plan and the clone must reach the leak allowance on the recorded wave. The
 * two rungs where an on-road shift is meaningful (g36's tail, g40's needle)
 * are shifted onto the road and must lose the hold there too. Finally the ten
 * names and twists must resolve in both languages and the how-to guide must
 * announce the tier.
 *
 * Engine ceiling, recorded here so the tier is not misread: continuous tower
 * fire means the shipped engine can clear the deepest board with fewer stands
 * than the cap, so 13-14 is a purse-bound ceiling, not a pressure-bound one.
 * The gate therefore proves the plan and its cost, not that every slot is
 * forced; the cuts prove the lesson-carrying stands are load-bearing. */

module.exports = function gate(ctx) {
  const { App, check } = ctx;
  const CASE = "glyph-bastion";
  const COLS = 9;
  const ROWS = 6;
  const KINDS = ["piercer", "smoulder", "snare"];
  const UNIT_KINDS = Object.keys(App.bastionUnits);
  const levels = App.bastionLevels;
  const NEW_IDS = ["g31", "g32", "g33", "g34", "g35",
    "g36", "g37", "g38", "g39", "g40"];

  check(CASE, "the ladder holds at least forty rungs",
    levels.length >= 40, levels.length + " rungs");

  const byId = {};
  const duplicateIds = [];
  levels.forEach((level) => {
    if (byId[level.id]) duplicateIds.push(level.id);
    byId[level.id] = level;
  });
  const missing = NEW_IDS.filter((id) => !byId[id]);
  check(CASE, "the deep tier g31-g40 is on the ladder",
    missing.length === 0, missing.join(","));
  if (missing.length) return;
  const newRows = NEW_IDS.map((id) => byId[id]);

  /* ---- the whole ladder's shape, in the module's own 9x6 grammar ---- */
  const shapeProblems = [];
  levels.forEach((level) => {
    const tag = level.id;
    const isNew = NEW_IDS.indexOf(tag) !== -1;
    if (!Array.isArray(level.paths) || !level.paths.length) {
      shapeProblems.push(tag + " has no paths");
      return;
    }
    if (!Array.isArray(level.waves) || !level.waves.length) {
      shapeProblems.push(tag + " has no waves");
      return;
    }
    if (!Array.isArray(level.solution) || !level.solution.length) {
      shapeProblems.push(tag + " has no plan");
      return;
    }
    if (!Number.isInteger(level.budget) || level.budget < 1 ||
        !Number.isInteger(level.maxTowers) || level.maxTowers < 1 ||
        !Number.isInteger(level.leaks) || level.leaks < 1) {
      shapeProblems.push(tag + " has a broken purse, cap or leak allowance");
    }
    if (!Array.isArray(level.starGlyphs) || level.starGlyphs.length !== 3 ||
        !(level.starGlyphs[0] < level.starGlyphs[1] &&
          level.starGlyphs[1] < level.starGlyphs[2])) {
      shapeProblems.push(tag + " star bands do not climb");
    }
    level.paths.forEach((line, pathIndex) => {
      if (!Array.isArray(line) || line.length < 2) {
        shapeProblems.push(tag + " path " + pathIndex + " is too short");
        return;
      }
      line.forEach((cell, cellIndex) => {
        if (!Array.isArray(cell) || cell.length !== 2 ||
            !Number.isInteger(cell[0]) || !Number.isInteger(cell[1]) ||
            cell[0] < 0 || cell[0] >= COLS || cell[1] < 0 || cell[1] >= ROWS) {
          shapeProblems.push(tag + " path " + pathIndex + " cell " + cellIndex + " is off the field");
          return;
        }
        if (cellIndex && isNew) {
          const prev = line[cellIndex - 1];
          const stepX = Math.abs(cell[0] - prev[0]);
          const stepY = Math.abs(cell[1] - prev[1]);
          if (stepX > 1 || stepY > 1 || (!stepX && !stepY)) {
            shapeProblems.push(tag + " path " + pathIndex + " jumps at " + cell.join(","));
          }
        }
      });
    });
    let priorStart = -1;
    level.waves.forEach((wave, waveIndex) => {
      if (!wave || UNIT_KINDS.indexOf(wave.kind) === -1 ||
          !Number.isInteger(wave.count) || wave.count < 1 ||
          !Number.isInteger(wave.gap) || wave.gap < 0 ||
          !Number.isInteger(wave.start) || wave.start <= priorStart) {
        shapeProblems.push(tag + " wave " + waveIndex + " is malformed or out of order");
      } else {
        priorStart = wave.start;
      }
    });
    const cells = new Set();
    level.solution.forEach((tower, towerIndex) => {
      const key = tower.x + "," + tower.y;
      if (KINDS.indexOf(tower.kind) === -1 ||
          !Number.isInteger(tower.x) || tower.x < 0 || tower.x >= COLS ||
          !Number.isInteger(tower.y) || tower.y < 0 || tower.y >= ROWS ||
          cells.has(key)) {
        shapeProblems.push(tag + " tower " + towerIndex + " is malformed or doubled");
      }
      cells.add(key);
    });
    if (level.solution.length > level.maxTowers) {
      shapeProblems.push(tag + " plan " + level.solution.length + " exceeds cap " + level.maxTowers);
    }
  });
  check(CASE, "every rung is a legal 9x6 board with an ordered wave list and a distinct plan",
    shapeProblems.length === 0, shapeProblems.slice(0, 6).join(" | "));

  /* No authored plan stands on a road cell on any rung. */
  const roadProblems = [];
  levels.forEach((level) => {
    const roads = new Set();
    level.paths.forEach((line) => line.forEach(([x, y]) => roads.add(x + "," + y)));
    const onRoad = level.solution.filter((tower) => roads.has(tower.x + "," + tower.y));
    if (onRoad.length) {
      roadProblems.push(level.id + " " + onRoad.map((tower) => tower.x + "," + tower.y).join(";"));
    }
  });
  check(CASE, "every authored plan stands off every road",
    roadProblems.length === 0, roadProblems.join(" | "));

  /* ---- the whole ladder through the real prover ---- */
  const proofProblems = [];
  levels.forEach((level) => {
    const out = App.bastionSolvable(level);
    const cost = App.bastionCost(level.solution);
    if (!(out.insideBudget && out.bought === out.planned &&
          out.leaks < level.leaks && out.cost === cost)) {
      proofProblems.push(level.id + " bought " + out.bought + "/" + out.planned +
        " leaks " + out.leaks + "/" + level.leaks + " cost " + out.cost + "/" + cost +
        " wave " + out.wave);
    }
  });
  check(CASE, "every rung buys its whole plan and stays under its leak allowance",
    proofProblems.length === 0, proofProblems.slice(0, 6).join(" | "));

  const cleanProblems = [];
  newRows.forEach((level) => {
    const out = App.bastionSolvable(level);
    if (!(out.cleared && out.leaks === 0)) {
      cleanProblems.push(level.id + " leaks " + out.leaks + " at wave " + out.wave);
    }
  });
  check(CASE, "the ten new rungs finish clean on the authored plan",
    cleanProblems.length === 0, cleanProblems.join(" | "));

  /* ---- the new tier's purse, cap, leak and wave laws ---- */
  const tierProblems = [];
  newRows.forEach((level, index) => {
    const tag = level.id;
    if (level.budget < 38 || level.budget > 50) {
      tierProblems.push(tag + " budget " + level.budget);
    }
    if (level.maxTowers < 12 || level.maxTowers > 14) {
      tierProblems.push(tag + " cap " + level.maxTowers);
    }
    if (level.leaks < 1 || level.leaks > 2) {
      tierProblems.push(tag + " leaks " + level.leaks);
    }
    if (level.waves.length < 11 || level.waves.length > 14) {
      tierProblems.push(tag + " waves " + level.waves.length);
    }
    if (level.paths.length < 4 || level.paths.length > 5) {
      tierProblems.push(tag + " roads " + level.paths.length);
    }
    if (level.solution.length !== level.maxTowers) {
      tierProblems.push(tag + " plan " + level.solution.length + " does not fill cap " + level.maxTowers);
    }
    if (level.labelKey !== "gstZ" + (31 + index) ||
        level.twistKey !== "gstTwist" + (31 + index)) {
      tierProblems.push(tag + " key names " + level.labelKey + "/" + level.twistKey);
    }
  });
  check(CASE, "the new tier stays inside 38-50 glyphs, 12-14 stands, 1-2 leaks, 11-14 waves and four or five roads",
    tierProblems.length === 0, tierProblems.join(" | "));

  /* The wave order is new on every rung: no earlier board walks the same
   * sequence of unit kinds. */
  const orderProblems = [];
  newRows.forEach((level) => {
    const order = level.waves.map((wave) => wave.kind).join(">");
    levels.forEach((other) => {
      if (other.id !== level.id &&
          other.waves.map((wave) => wave.kind).join(">") === order) {
        orderProblems.push(level.id + " reuses " + other.id);
      }
    });
  });
  check(CASE, "each new rung walks a wave order no other board uses",
    orderProblems.length === 0, orderProblems.join(" | "));

  /* The star band is anchored on the measured plan, not copied or rounded. */
  const starProblems = [];
  const costs = [];
  newRows.forEach((level) => {
    const cost = App.bastionCost(level.solution);
    costs.push(cost);
    const expected = [cost, cost + 2, cost + 4];
    if (level.starGlyphs.join(",") !== expected.join(",")) {
      starProblems.push(level.id + " stars " + level.starGlyphs.join("/") +
        " for cost " + cost);
    }
  });
  check(CASE, "every new star band is [cost, cost + 2, cost + 4] off the measured cost",
    starProblems.length === 0, starProblems.join(" | "));

  const rising = costs.every((cost, index) => index === 0 || cost > costs[index - 1]);
  check(CASE, "the deep tier's plan cost rises strictly from g31 to g40",
    rising, costs.join(","));

  /* Slack = budget - cost. It tightens 6,5,4,3, then the levy runs one wave's
   * pay short (-3), then 2,1,1,1 and zero at the summit. */
  const slack = newRows.map((level) => level.budget - App.bastionCost(level.solution));
  const stepwise = (values) => values.every((value, index) =>
    index === 0 || value <= values[index - 1]);
  check(CASE, "the purse tightens to zero at the summit, with g35 the one-wave levy",
    slack[0] >= 3 &&
      stepwise(slack.slice(0, 4)) &&
      slack[4] === -3 &&
      stepwise(slack.slice(5)) &&
      slack[slack.length - 1] === 0,
    slack.join(","));
  const levy = byId.g35;
  check(CASE, "g35 costs exactly one wave's pay more than the purse it opens with",
    App.bastionCost(levy.solution) === levy.budget + 3 &&
      App.bastionSolvable(levy).insideBudget,
    "cost " + App.bastionCost(levy.solution) + " budget " + levy.budget);

  /* ---- cuts: remove the lesson-carrying stand and the hold breaks ----
   * The index and wave were measured against the authored plan; the clone
   * keeps the row's own purse and leak allowance, so the cut is the only
   * change. */
  const CUTS = {
    g31: { index: 2, kind: "snare", wave: 3 },
    g32: { index: 2, kind: "snare", wave: 0 },
    g33: { index: 2, kind: "snare", wave: 2 },
    g34: { index: 0, kind: "snare", wave: 3 },
    g35: { index: 2, kind: "snare", wave: 4 },
    g36: { index: 5, kind: "smoulder", wave: 13 },
    g37: { index: 3, kind: "snare", wave: 2 },
    g38: { index: 3, kind: "snare", wave: 1 },
    g39: { index: 4, kind: "smoulder", wave: 13 },
    g40: { index: 0, kind: "snare", wave: 2 },
  };
  NEW_IDS.forEach((id) => {
    const level = byId[id];
    const cut = CUTS[id];
    const tower = level.solution[cut.index];
    const clone = Object.assign({}, level, {
      solution: level.solution.filter((item, index) => index !== cut.index),
    });
    const out = App.bastionSolvable(clone);
    const detail = "dropped " + tower.kind + " at " + tower.x + "," + tower.y +
      " -> leaks " + out.leaks + "/" + level.leaks + " at wave " + out.wave;
    check(CASE, id + ": dropping its " + cut.kind + " breaks the hold on wave " + cut.wave,
      tower.kind === cut.kind && out.leaks >= level.leaks && out.wave === cut.wave,
      detail);
  });

  /* ---- where an on-road shift is meaningful, it loses too ----
   * g36's tail and g40's needle are the two rungs where a one-cell shift onto
   * the road strips real coverage; the clone is otherwise the authored plan. */
  const SHIFTS = [
    { id: "g36", index: 0, x: 4, y: 5, wave: 4 },
    { id: "g40", index: 0, x: 3, y: 4, wave: 2 },
  ];
  SHIFTS.forEach((shift) => {
    const level = byId[shift.id];
    const tower = level.solution[shift.index];
    const roads = new Set();
    level.paths.forEach((line) => line.forEach(([x, y]) => roads.add(x + "," + y)));
    const moved = level.solution.map((item, index) =>
      (index === shift.index ? { x: shift.x, y: shift.y, kind: item.kind } : item));
    const out = App.bastionSolvable(Object.assign({}, level, { solution: moved }));
    check(CASE, shift.id + ": shifting its " + tower.kind + " onto the road at " +
      shift.x + "," + shift.y + " loses the hold on wave " + shift.wave,
      roads.has(shift.x + "," + shift.y) &&
        out.leaks >= level.leaks && out.wave === shift.wave,
      "leaks " + out.leaks + "/" + level.leaks + " at wave " + out.wave);
  });

  /* ---- the ten new names and twists, in both languages ---- */
  const copyProblems = [];
  const labelsEn = new Set();
  const labelsZh = new Set();
  newRows.forEach((level) => {
    [level.labelKey, level.twistKey].forEach((key) => {
      const en = App.I18N && App.I18N.en && App.I18N.en[key];
      const zh = App.I18N && App.I18N.zh && App.I18N.zh[key];
      if (!en || !zh || en === key || zh === key || en === zh) {
        copyProblems.push(key + " en " + JSON.stringify(en) + " zh " + JSON.stringify(zh));
      }
      if (key === level.labelKey) {
        labelsEn.add(en);
        labelsZh.add(zh);
      }
    });
  });
  if (labelsEn.size !== newRows.length || labelsZh.size !== newRows.length) {
    copyProblems.push("duplicate new names");
  }
  check(CASE, "the ten new names and twists resolve in both languages, all distinct",
    copyProblems.length === 0, copyProblems.join(" | "));

  /* ---- the how-to guide announces the tier it now carries ---- */
  const guide = App.getRegistryGuides &&
    App.getRegistryGuides().filter((entry) => entry.id === "glyphBastion")[0];
  const guideEn = guide && guide.en && guide.en[guide.en.length - 1] || "";
  const guideZh = guide && guide.zh && guide.zh[guide.zh.length - 1] || "";
  check(CASE, "the guide's last line announces boards 31-40 in both languages",
    guideEn.indexOf("New tier:") === 0 && /31/.test(guideEn) && /40/.test(guideEn) &&
      /thirteen/.test(guideEn) &&
      guideZh.indexOf("新层级：") === 0 && /31/.test(guideZh) && /40/.test(guideZh) &&
      /十三/.test(guideZh),
    "en " + JSON.stringify(guideEn) + " zh " + JSON.stringify(guideZh));
};
