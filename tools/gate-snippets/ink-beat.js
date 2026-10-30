"use strict";

/* game-ink-beat: the hard tier is played, not parsed
 *
 * App.beatLevels is the module's own table and App.beatChart its own
 * seed->notes builder, so every number below is measured on the chart the
 * engine really falls. The four new tracks are then beaten through the real
 * panel (select, start button, keydown path, virtual clock) three ways so
 * the star bands land from both directions: frame-perfect play must read
 * 100% and three stars, dropping one note in seven must land two stars, and
 * a beat-late hand must still clear at one star. Doing nothing must read
 * 0/3 stars and record nothing.
 *
 * The advertised mechanic is load-bearing by replacement, not deletion:
 * deleting notes is invisible to this engine (accuracy counts the chart's
 * own notes, and a plan that covers the survivors still reads 100%), so each
 * cut swaps the rung's lever back to the ladder's shipped shape and replays
 * the rung's own frame-perfect plan through the untouched engine. t21 and
 * t24 lose their hot pair and collapse to one star; t22's even wall is split
 * into a hot/quiet pair and collapses to one star. t23's mechanic is
 * its length, and a shorter chart is a strictly easier song in this engine -
 * so for t23 the gate uses the honest alternative: the cut chart's measured
 * load falls below the shipped summit (the rung stops being the hard tier),
 * and the win condition is shown to require the rung's defining resource
 * (three stars demands 253 of the 274 notes - more hits than any shipped
 * track asks for).
 *
 * The summit tier t25-t30 gets the same three hands, and its curve is
 * measured off the engine's own builder: the wall's density climbs strictly
 * through the six and opens past the hard tier's peak, with per-rung records
 * the gate re-measures on every run (t25's no-rest lane, t27's
 * bars/notes/demand, t29's plain speed, t30's tempo+swing+nps peak). The
 * summit's cuts are honest alternatives, and the header says why: a summit
 * plan is denser than any chart the ladder ships, so the plan's taps blanket
 * every sparse replacement and no density cut can fail the replay (the
 * shipped taper leaves zero cut notes outside a hit window of a tap). So
 * t27's length and the walls are proved by load the way t23 is: cut the
 * lever and the rung's measured load falls under the bar it climbed (t27's
 * burn drops under the summit walls around it; a wall cut to the shipped
 * taper falls under the hard tier's peak), t27's three-star line demands
 * more hits than any earlier track holds notes, and quieting one lane to
 * the shipped floor takes the no-rest record down with the wall. */
module.exports = function gate(ctx) {
  const { App, env, check } = ctx;
  const levels = App.beatLevels;
  const tierIds = ["t21", "t22", "t23", "t24"];
  const summitIds = ["t25", "t26", "t27", "t28", "t29", "t30"];
  const byId = (id) => levels.find((level) => level.id === id);
  const KEYS = ["d", "f", "j", "k"];

  /* ---- ladder shape ---- */
  check("game-ink-beat", "the ladder holds all thirty tracks",
    levels.length >= 30, String(levels.length));
  check("game-ink-beat", "every track id is distinct",
    new Set(levels.map((level) => level.id)).size === levels.length,
    levels.map((level) => level.id).join(","));
  const missing = tierIds.filter((id) => !byId(id));
  check("game-ink-beat", "the hard tier t21-t24 is present",
    missing.length === 0, missing.join(","));
  const missingSummit = summitIds.filter((id) => !byId(id));
  check("game-ink-beat", "the summit tier t25-t30 is present",
    missingSummit.length === 0, missingSummit.join(","));

  /* ---- measured load, straight off the engine's chart builder ---- */
  const stats = (def) => {
    const chart = App.beatChart(def);
    const lanes = chart.lanes.map((lane) => lane.length);
    return {
      total: chart.total,
      nps: chart.total / chart.end,
      lanes,
      topPair: (lanes[2] + lanes[3]) / chart.total,
      minLane: Math.min.apply(null, lanes),
    };
  };
  const shipped = levels.slice(0, 20).map((level) => stats(level));
  const shippedMax = (pick) => Math.max.apply(null, shipped.map(pick));
  const shippedMaxTotal = shippedMax((s) => s.total);
  const shippedMaxNps = shippedMax((s) => s.nps);
  const shippedMaxTopPair = shippedMax((s) => s.topPair);
  const shippedMaxMinLane = shippedMax((s) => s.minLane);
  const shippedMaxBars = Math.max.apply(null, levels.slice(0, 20).map((level) => level.bars));
  const shippedMaxBpm = Math.max.apply(null, levels.slice(0, 20).map((level) => level.bpm));
  const shippedMaxSwing = Math.max.apply(null, levels.slice(0, 20).map((level) => level.swing || 0));

  const tierStats = {};
  tierIds.forEach((id) => { tierStats[id] = stats(byId(id)); });
  const totals = tierIds.map((id) => tierStats[id].total);
  const npss = tierIds.map((id) => tierStats[id].nps);
  const climbs = (list) => list.every((value, index) => index === 0 || value > list[index - 1]);
  check("game-ink-beat", "the tier's measured load climbs: " + totals.join(" -> ") + " notes",
    climbs(totals), totals.join(","));
  check("game-ink-beat", "the tier's density climbs: " +
      npss.map((n) => n.toFixed(2)).join(" -> ") + " notes a second",
    climbs(npss), npss.map((n) => n.toFixed(3)).join(","));
  check("game-ink-beat", "t22-t24 carry more notes than any shipped track",
    totals.slice(1).every((total) => total > shippedMaxTotal),
    "tier " + totals.join("/") + " vs shipped " + shippedMaxTotal);
  check("game-ink-beat", "t23 and t24 are denser than any shipped track",
    npss[2] > shippedMaxNps && npss[3] > shippedMaxNps,
    npss.map((n) => n.toFixed(2)).join("/") + " vs shipped " + shippedMaxNps.toFixed(2));
  check("game-ink-beat", "t21 is the top-pair record: its J/K lanes carry " +
      (tierStats.t21.topPair * 100).toFixed(0) + "% of the chart",
    tierStats.t21.topPair > shippedMaxTopPair,
    (tierStats.t21.topPair * 100).toFixed(1) + "% vs shipped " + (shippedMaxTopPair * 100).toFixed(1) + "%");
  check("game-ink-beat", "t22 is the no-rest-lane record: its quietest lane lands " +
      tierStats.t22.minLane + " notes",
    tierStats.t22.minLane > shippedMaxMinLane,
    tierStats.t22.minLane + " vs shipped " + shippedMaxMinLane);
  check("game-ink-beat", "t23 is the length record and t24 the tempo, swing and density record",
    byId("t23").bars > shippedMaxBars && byId("t24").bpm > shippedMaxBpm &&
      byId("t24").swing > shippedMaxSwing && tierStats.t24.total > shippedMaxTotal,
    "bars " + byId("t23").bars + " vs " + shippedMaxBars + ", bpm " + byId("t24").bpm +
      " vs " + shippedMaxBpm + ", swing " + byId("t24").swing + " vs " + shippedMaxSwing);

  /* ---- stage the real panel in the stub DOM ---- */
  const doc = env.document;
  const make = (id, tag) => {
    const el = doc.createElement(tag || "div");
    el.id = id;
    doc.body.appendChild(el);
    return el;
  };
  make("beatCanvas", "canvas");
  make("beatScore");
  make("beatCombo");
  make("beatAcc");
  const resultEl = make("beatResult");
  make("beatStartBtn", "button");
  make("beatBest");
  const sel = make("beatSongSel", "select");
  for (let pad = 0; pad < 4; pad += 1) make("beatPad" + pad, "button");
  const canvas = env.byId("beatCanvas");

  const frames = new Map();
  let nextFrame = 1;
  env.window.requestAnimationFrame = (fn) => {
    const id = nextFrame++;
    frames.set(id, fn);
    return id;
  };
  env.window.cancelAnimationFrame = (id) => frames.delete(id);
  const pump = () => {
    const queue = Array.from(frames.entries());
    queue.forEach(([id, fn]) => frames.delete(id));
    queue.forEach(([, fn]) => fn(env.clock.now));
  };

  const cleared = {};
  /* Rungs 1-20 cleared - exactly the save a player brings into the hard
   * tier. Anything less and the picker ignores the tier: the change handler
   * only loads a rung whose predecessor is cleared. */
  for (let t = 1; t <= 20; t += 1) cleared["t" + t] = { stars: 3, best: 100 };
  env.store.set("ink-beat-campaign", JSON.stringify({ v: 1, cleared: cleared }));
  App.initInkBeatGame();

  /* Replay one policy through the real engine. The plan comes from the
   * chart of the def passed in - usually the live rung, once the cut clone
   * - and the keydowns land on the panel's own canvas at the plan's times. */
  function playTrack(levelId, chart, policy) {
    sel.value = levelId;
    env.dispatch(sel, "change");
    const selected = sel.value === levelId;
    env.dispatch(env.byId("beatStartBtn"), "click");
    const notes = [];
    for (let lane = 0; lane < 4; lane += 1) {
      chart.lanes[lane].forEach((note) => notes.push({ lane, time: note.time }));
    }
    notes.sort((a, b) => a.time - b.time);
    const startAtMs = env.clock.now + 1200;
    notes.forEach((note, index) => {
      if (!policy.play(index)) return;
      env.timers.advance(startAtMs + (note.time + policy.deltaMs / 1000) * 1000 - env.clock.now);
      pump();
      env.dispatch(canvas, "keydown", { key: KEYS[note.lane] });
    });
    env.timers.advance(startAtMs + chart.end * 1000 + 200 - env.clock.now);
    pump();
    const text = resultEl.textContent;
    const stars = /(\d)\/3 stars/.exec(text);
    const acc = /(\d+)% accuracy/.exec(text);
    return {
      selected,
      stars: stars ? Number(stars[1]) : 0,
      acc: acc ? Number(acc[1]) : -1,
      text,
    };
  }

  const readSave = () => JSON.parse(env.store.get("ink-beat-campaign") || "{}");
  const fullChart = {};
  tierIds.forEach((id) => { fullChart[id] = App.beatChart(byId(id)); });

  for (const id of tierIds) {
    const level = byId(id);

    /* A rung that plays itself is not a rung: no inputs, no stars, no save. */
    const idle = playTrack(id, fullChart[id], { play: () => false, deltaMs: 0 });
    check("game-ink-beat", id + ": doing nothing reads 0/3 stars and records nothing",
      idle.selected && idle.stars === 0 && !readSave().cleared[id],
      JSON.stringify({ selected: idle.selected, stars: idle.stars, text: idle.text.slice(0, 40) }));

    /* The star bands from both directions. */
    const perfect = playTrack(id, fullChart[id], { play: () => true, deltaMs: -20 });
    check("game-ink-beat", id + ": frame-perfect play reads 100% and three stars",
      perfect.selected && perfect.stars === 3 && perfect.acc === 100,
      JSON.stringify(perfect));
    const steady = playTrack(id, fullChart[id], { play: (i) => i % 7 !== 3, deltaMs: -20 });
    check("game-ink-beat", id + ": dropping one note in seven lands two stars, not three",
      steady.stars === 2 && steady.acc >= 78 && steady.acc < 92,
      JSON.stringify(steady));
    const casual = playTrack(id, fullChart[id], { play: () => true, deltaMs: 100 });
    check("game-ink-beat", id + ": a beat-late hand still clears at one star",
      casual.stars === 1 && casual.acc === 60, JSON.stringify(casual));

    /* The next rung unlocks only through the clear this rung just recorded. */
    const index = tierIds.indexOf(id);
    if (index + 1 < tierIds.length) {
      const nextId = tierIds[index + 1];
      sel.value = nextId;
      env.dispatch(sel, "change");
      check("game-ink-beat", nextId + " unlocks once " + id + " is cleared",
        sel.value === nextId, sel.value);
    }

    /* Mechanic proof by replacement: swap the lever back to the ladder's
     * shipped shape on the LIVE def (the panel's closure shares this
     * object), replay the rung's own perfect plan, then restore. */
    const saved = JSON.parse(JSON.stringify(level));
    const cutHow = id === "t21"
      ? "the hot pair replaced by the ladder's standard taper"
      : id === "t22"
        ? "the even wall split into a hot/quiet pair at double the shipped spread"
        : id === "t24"
          ? "the hot pair replaced by the shipped taper trimmed under t19's melody lane"
          : "the 36 bars cut to the shipped 30";
    if (id === "t21") {
      level.density = [0.14, 0.105, 0.155, 0.08];
    } else if (id === "t22") {
      level.density = [0.22, 0.03, 0.22, 0.03];
    } else if (id === "t24") {
      level.density = [0.14, 0.105, 0.14, 0.08];
    } else {
      level.bars = 30;
    }
    const cut = playTrack(id, fullChart[id], { play: () => true, deltaMs: -20 });
    Object.assign(level, saved);
    sel.value = id;
    env.dispatch(sel, "change");
    if (id === "t23") {
      /* Length cannot be deleted, only shortened - and a shorter song is
       * not harder in this engine (the plan still covers every surviving
       * note, and the accuracy denominator shrinks with it, so the replay
       * above still reads 100%). The honest proof instead: the cut chart's
       * measured load falls below the shipped summit - the rung stops being
       * the hard tier without its length - and the win condition requires
       * the rung's defining resource: three stars on the real rung demands
       * more hits than any shipped track contains notes. */
      const cutTotal = App.beatChart(Object.assign({}, level, { bars: 30 })).total;
      check("game-ink-beat", "t23: shortening alone cannot fail the plan (the replay " +
          "still reads 100%), so length is proved by load and demand",
        cut.acc === 100 && cut.stars === 3,
        "cut replay " + cut.acc + "%/" + cut.stars + " stars");
      check("game-ink-beat", "t23's 36 bars are the lesson: cut to the shipped 30, " +
          "the chart's load falls below the shipped summit",
        cutTotal < fullChart[id].total && cutTotal < shippedMaxTotal,
        "cut " + cutTotal + " notes vs full " + fullChart[id].total + " vs shipped " + shippedMaxTotal);
      check("game-ink-beat", "t23's win requires its " + fullChart[id].total + " notes: " +
          "three stars demands " + Math.ceil(fullChart[id].total * 0.92) +
          " hits, more than any shipped track holds",
        perfect.acc === 100 && Math.ceil(fullChart[id].total * 0.92) > shippedMaxTotal,
        "demands " + Math.ceil(fullChart[id].total * 0.92) + " of " + fullChart[id].total +
          " vs shipped max " + shippedMaxTotal);
    } else {
      check("game-ink-beat", id + " (" + cutHow + "): the same perfect hand collapses " +
          "below the two-star line",
        cut.stars <= 1 && cut.acc < 78,
        "cut acc " + cut.acc + "%, stars " + cut.stars);
    }

    /* The clear survived the cut and idle attempts: best stars are kept. */
    check("game-ink-beat", id + " stays cleared at three stars in the campaign save",
      readSave().cleared[id] && readSave().cleared[id].stars === 3,
      JSON.stringify(readSave().cleared[id] || null));
  }

  /* ---- the summit tier: the four-lane wall, measured and played ---- */
  const summitStats = {};
  summitIds.forEach((id) => {
    summitStats[id] = stats(byId(id));
    fullChart[id] = App.beatChart(byId(id));
  });
  const summitNps = summitIds.map((id) => summitStats[id].nps);
  const allNps = levels.map((level) => stats(level).nps);
  check("game-ink-beat", "the summit's measured density climbs: " +
      summitNps.map((n) => n.toFixed(2)).join(" -> ") + " notes a second",
    climbs(summitNps), summitNps.map((n) => n.toFixed(3)).join(","));
  check("game-ink-beat", "the summit opens past the hard tier's peak (" +
      summitNps[0].toFixed(2) + " vs t24 " + tierStats.t24.nps.toFixed(2) +
      ") and t30 ends the ladder as its densest track",
    summitNps[0] > tierStats.t24.nps &&
      summitNps[summitNps.length - 1] === Math.max.apply(null, allNps),
    "summit " + summitNps.map((n) => n.toFixed(2)).join("/") + ", ladder peak " +
      Math.max.apply(null, allNps).toFixed(2));
  check("game-ink-beat", "t25 is the first no-rest wall past the shipped peak: its quietest lane lands " +
      summitStats.t25.minLane + " notes",
    summitStats.t25.nps > tierStats.t24.nps && summitStats.t25.minLane > shippedMaxMinLane,
    "minLane " + summitStats.t25.minLane + " vs shipped " + shippedMaxMinLane);
  check("game-ink-beat", "t26 hangs the shipped swing on a faster wall than the hard tier's",
    byId("t26").swing === 0.34 && byId("t26").bpm > byId("t24").bpm &&
      summitStats.t26.nps > tierStats.t24.nps,
    "bpm " + byId("t26").bpm + ", swing " + byId("t26").swing);
  check("game-ink-beat", "t27 is the burn record: " + byId("t27").bars + " bars and " +
      summitStats.t27.total + " notes",
    byId("t27").bars > Math.max(shippedMaxBars, byId("t23").bars) &&
      summitStats.t27.total > Math.max(tierStats.t24.total, shippedMaxTotal),
    "bars " + byId("t27").bars + ", notes " + summitStats.t27.total);
  const t27Demand = Math.ceil(summitStats.t27.total * 0.92);
  check("game-ink-beat", "t27's win requires its length: three stars demands " + t27Demand +
      " hits, more than any earlier track holds notes",
    t27Demand > tierStats.t24.total && t27Demand > shippedMaxTotal,
    "demands " + t27Demand + " vs t24 " + tierStats.t24.total + " vs shipped " + shippedMaxTotal);
  check("game-ink-beat", "t28 swings deeper than anything shipped without trading the wall away",
    byId("t28").swing > shippedMaxSwing && byId("t28").swing < byId("t24").swing &&
      summitStats.t28.nps > tierStats.t24.nps,
    "swing " + byId("t28").swing + ", nps " + summitStats.t28.nps.toFixed(2));
  check("game-ink-beat", "t29 is the fastest plain wall: no swing, " +
      summitStats.t29.nps.toFixed(2) + " notes a second at " + byId("t29").bpm + " BPM",
    !byId("t29").swing && byId("t29").bpm > byId("t24").bpm &&
      summitStats.t29.nps > tierStats.t24.nps,
    "bpm " + byId("t29").bpm + ", nps " + summitStats.t29.nps.toFixed(2));
  check("game-ink-beat", "t30 closes at the top tempo and the deepest swing together",
    byId("t30").bpm === Math.max.apply(null, levels.map((level) => level.bpm)) &&
      byId("t30").swing === Math.max.apply(null, levels.map((level) => level.swing || 0)) &&
      summitStats.t30.nps > tierStats.t24.nps,
    "bpm " + byId("t30").bpm + ", swing " + byId("t30").swing +
      ", nps " + summitStats.t30.nps.toFixed(2));

  /* The save walks into this section holding t21-t24 at three stars from the
   * hard tier above, so the picker sells t25 immediately; each summit clear
   * then unlocks the next rung the same way. */
  summitIds.forEach((id) => {
    const level = byId(id);

    /* A rung that plays itself is not a rung. */
    const idle = playTrack(id, fullChart[id], { play: () => false, deltaMs: 0 });
    check("game-ink-beat", id + ": doing nothing reads 0/3 stars and records nothing",
      idle.selected && idle.stars === 0 && !readSave().cleared[id],
      JSON.stringify({ selected: idle.selected, stars: idle.stars, text: idle.text.slice(0, 40) }));

    /* The star bands from both directions. */
    const perfect = playTrack(id, fullChart[id], { play: () => true, deltaMs: -20 });
    check("game-ink-beat", id + ": frame-perfect play reads 100% and three stars",
      perfect.selected && perfect.stars === 3 && perfect.acc === 100,
      JSON.stringify(perfect));
    const steady = playTrack(id, fullChart[id], { play: (i) => i % 7 !== 3, deltaMs: -20 });
    check("game-ink-beat", id + ": dropping one note in seven lands two stars, not three",
      steady.stars === 2 && steady.acc >= 78 && steady.acc < 92,
      JSON.stringify(steady));
    const casual = playTrack(id, fullChart[id], { play: () => true, deltaMs: 100 });
    check("game-ink-beat", id + ": a beat-late hand still clears at one star",
      casual.stars === 1 && casual.acc === 60, JSON.stringify(casual));

    /* The next rung unlocks only through the clear this rung just recorded. */
    const index = summitIds.indexOf(id);
    if (index + 1 < summitIds.length) {
      const nextId = summitIds[index + 1];
      sel.value = nextId;
      env.dispatch(sel, "change");
      check("game-ink-beat", nextId + " unlocks once " + id + " is cleared",
        sel.value === nextId, sel.value);
    }

    /* Mechanic proof. t27 keeps the honest alternative for its length lever,
     * the way t23 does above. The wall rungs keep it too, for a measured
     * reason: a summit plan is denser than any chart the ladder ships, so
     * the plan's taps blanket every sparse cut and a density replacement
     * cannot fail the replay (probed: the shipped taper leaves zero cut
     * notes more than a hit-window from a tap). The wall is therefore proved
     * by load, again the t23 way: cut it back to the shipped taper and the
     * rung's measured density falls under the hard tier's peak - the rung
     * stops being the summit - and quieting any one lane to the shipped
     * floor takes the no-rest record down with it, so the wall itself, not
     * the seed, is what keeps every lane busy. */
    const saved = JSON.parse(JSON.stringify(level));
    let cut = null;
    let cutTotal = null;
    if (id === "t27") {
      level.bars = 30;
      cut = playTrack(id, fullChart[id], { play: () => true, deltaMs: -20 });
      Object.assign(level, saved);
      sel.value = id;
      env.dispatch(sel, "change");
      cutTotal = App.beatChart(Object.assign({}, level, { bars: 30 })).total;
      check("game-ink-beat", "t27: shortening alone cannot fail the plan (the replay " +
          "still reads 100%), so length is proved by load and demand",
        cut.acc === 100 && cut.stars === 3,
        "cut replay " + cut.acc + "%/" + cut.stars + " stars");
      check("game-ink-beat", "t27's 40 bars are the lesson: cut to the shipped 30, the " +
          "burn falls under the summit walls around it (" + cutTotal + " notes vs " +
          summitStats.t29.total + " and " + summitStats.t30.total + ")",
        cutTotal < summitStats.t29.total && cutTotal < summitStats.t30.total,
        "cut " + cutTotal + " vs t29 " + summitStats.t29.total + ", t30 " + summitStats.t30.total);
    } else {
      const cutShape = Object.assign({}, level, { density: [0.14, 0.105, 0.155, 0.08] });
      const cutChart = App.beatChart(cutShape);
      const cutNps = cutChart.total / cutChart.end;
      check("game-ink-beat", id + " (wall cut to the shipped taper): the measured load falls " +
          "under the hard tier's peak - the rung stops being the summit",
        cutNps < tierStats.t24.nps,
        "cut " + cutNps.toFixed(2) + " nps vs t24 " + tierStats.t24.nps.toFixed(2));
      /* Lane 0 is the builder's forced downbeat (it fires every bar's first
       * step whatever its density), so the lane that can actually rest is
       * lane 1: quiet it to the shipped floor and the chart's quietest lane
       * falls under the shipped no-rest record. */
      const quietShape = level.density.slice();
      quietShape[1] = 0.03;
      const quietChart = App.beatChart(Object.assign({}, level, { density: quietShape }));
      check("game-ink-beat", id + " (the hats lane quieted to the shipped floor): the " +
          "no-rest record goes with the wall",
        Math.min.apply(null, quietChart.lanes.map((lane) => lane.length)) < shippedMaxMinLane,
        "quieted minLane " + Math.min.apply(null, quietChart.lanes.map((lane) => lane.length)) +
          " vs shipped " + shippedMaxMinLane);
      cut = null;
      cutTotal = null;
    }

    /* The clear survived the cut and idle attempts: best stars are kept. */
    check("game-ink-beat", id + " stays cleared at three stars in the campaign save",
      readSave().cleared[id] && readSave().cleared[id].stars === 3,
      JSON.stringify(readSave().cleared[id] || null));
  });
  const saveAfter = readSave().cleared || {};
  const clearedCount = Object.keys(saveAfter).filter((id) => saveAfter[id] && saveAfter[id].stars >= 1).length;
  check("game-ink-beat", "the summit ends the campaign: all thirty tracks sit cleared in the save",
    clearedCount === 30, String(clearedCount));

  /* Copy travels with the module. */
  const copyKeys = ["beatL21", "beatL22", "beatL23", "beatL24",
    "beatL25", "beatL26", "beatL27", "beatL28", "beatL29", "beatL30"];
  const copyProblems = copyKeys.filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-ink-beat", "the ten deep track names resolve in both languages",
    copyProblems.length === 0, copyProblems.join(","));
};
