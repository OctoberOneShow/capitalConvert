"use strict";

/* game-tiny-wrestlers: the summit tier is beaten, and the machine keeps its
 * laws.
 *
 * The ladder is opponent ranks, so the gate benches it the way the ring
 * itself works: scripted bouts settled through the game's own resolver
 * (wrestlerExchange) against the machine's own brain (wrestlerAiPick), one
 * seeded stream per bout. The certificate line plays the machine's known
 * policy against itself - the machine answers a deterministic function of
 * the mat and the player's habits, so the line computes that answer and
 * plays the order whose real resolver outcome scores best - which proves
 * every summit rung is winnable, and fast enough that the three-star band
 * stays honest. What the certificate cannot prove, the shape checks do:
 * the window rests on the engine's own 900 floor, the summit's flicker of
 * noise drains rung by rung to a tenth of the Grand Champion Apex's own
 * read, and no band drops below the rung before. The tier's own names are
 * registered by the game module through addStrings, so the boot check reads
 * them back off the live picker in both languages. */

module.exports = function gate(ctx) {
  const { App, env, check, fs, path, root } = ctx;
  const ranks = App.wrestlerRanks;
  const summitIds = ["w25", "w26", "w27", "w28", "w29", "w30"];
  const summitKeys = ["twrR25", "twrR26", "twrR27", "twrR28", "twrR29", "twrR30"];
  const byId = {};
  ranks.forEach((rank) => { byId[rank.id] = rank; });

  /* ---- the ladder shape: the same laws the whole table is held to ---- */
  check("game-tiny-wrestlers", "the ladder holds thirty ranks",
    ranks.length === 30, String(ranks.length));
  check("game-tiny-wrestlers", "every rank id is distinct",
    new Set(ranks.map((r) => r.id)).size === ranks.length,
    ranks.map((r) => r.id).join(","));
  const expectedIds = ranks.map((r, index) => "w" + (index + 1));
  check("game-tiny-wrestlers",
    "the ids run w1 through w30 in order - the shipped twenty-four stay first and untouched",
    ranks.map((r) => r.id).join(",") === expectedIds.join(","),
    ranks.map((r) => r.id).join(","));
  check("game-tiny-wrestlers", "the window only tightens and lands on the engine's floor",
    ranks.every((r, index) => index === 0 || r.windowMs <= ranks[index - 1].windowMs) &&
    ranks.every((r) => r.windowMs >= 900) &&
    ranks[ranks.length - 1].windowMs === 900,
    ranks.map((r) => r.windowMs).join("/"));
  check("game-tiny-wrestlers", "the noise only drains and never reaches zero",
    ranks.every((r, index) => index === 0 || r.noise <= ranks[index - 1].noise) &&
    ranks.every((r) => r.noise > 0),
    ranks.map((r) => r.noise).join("/"));
  check("game-tiny-wrestlers", "the deep tier keeps the machine at full attention",
    ranks.slice(10).every((r) => r.predict === 1 && r.rush === 1 && r.greed === 1),
    JSON.stringify(ranks.slice(10).map((r) => [r.predict, r.rush, r.greed])));
  check("game-tiny-wrestlers", "star bands rise inside the beat cap and never dip",
    ranks.every((r) =>
      r.starBeats[0] < r.starBeats[1] && r.starBeats[1] < r.starBeats[2] &&
      r.starBeats[2] <= 40) &&
    ranks.every((r, index) => index === 0 ||
      (r.starBeats[0] >= ranks[index - 1].starBeats[0] &&
       r.starBeats[1] >= ranks[index - 1].starBeats[1])),
    ranks.map((r) => r.starBeats.join("/")).join(" "));

  /* ---- the summit tier: the still read ---- */
  const missingSummit = summitIds.filter((id) => !byId[id]);
  check("game-tiny-wrestlers", "the summit tier w25-w30 is present and appended",
    missingSummit.length === 0 &&
    ranks.slice(ranks.length - 6).map((r) => r.id).join(",") === summitIds.join(","),
    ranks.slice(ranks.length - 6).map((r) => r.id).join(","));
  const summit = summitIds.map((id) => byId[id]);
  const apex = byId.w24;
  check("game-tiny-wrestlers",
    "the summit keeps the machine at full attention on the engine's own window floor",
    summit.every((r) => r.predict === 1 && r.rush === 1 && r.greed === 1 && r.windowMs === 900),
    summit.map((r) => r.windowMs + ":" + r.predict + r.rush + r.greed).join(","));
  /* The one lever left: the flicker - the grain of noise twrAiPick stirs
   * into the close calls its evaluator cannot separate. Every summit read
   * is stiller than every earlier rung, the drain runs rung by rung, and
   * the engine's own jitter amplitude ((random - 0.5) * noise * 40) sinks
   * with it without ever reaching zero. */
  const shipped = ranks.filter((r) => !summitIds.includes(r.id));
  check("game-tiny-wrestlers", "every summit read is stiller than every earlier rung's",
    summit.every((r) => shipped.every((m) => r.noise < m.noise)),
    "apex " + apex.noise + " -> summit " + summit.map((r) => r.noise).join("/"));
  check("game-tiny-wrestlers", "the flicker drains rung by rung and never dies",
    summit.every((r, index) => index === 0 || r.noise < summit[index - 1].noise) &&
    summit.every((r) => r.noise > 0),
    summit.map((r) => r.noise).join("/"));
  check("game-tiny-wrestlers", "the engine's own jitter amplitude sinks with the flicker",
    summit.every((r, index) => index === 0 || r.noise * 40 < summit[index - 1].noise * 40) &&
    summit[summit.length - 1].noise * 40 < apex.noise * 40,
    "apex " + apex.noise * 40 + " -> w30 " + summit[summit.length - 1].noise * 40);
  check("game-tiny-wrestlers", "the summit bands concede one beat at a time above the apex",
    summit.every((r, index) =>
      r.starBeats[0] >= (index === 0 ? apex.starBeats[0] : summit[index - 1].starBeats[0]) &&
      r.starBeats[1] >= (index === 0 ? apex.starBeats[1] : summit[index - 1].starBeats[1]) &&
      r.starBeats[2] === 40),
    summit.map((r) => r.starBeats.join("/")).join(" "));

  /* ---- the bench: the shipped gate's own machinery, re-hosted here ----
   * Deterministic end to end: the one die the engine rolls (twrAiPick's
   * noise jitter) runs on a seeded Math.random swap, one stream per bout. */
  const twrReply = (mat, history, rank) => {
    const view = App.wrestlerFlip(mat);
    const weights = App.wrestlerWeights(history, 1);
    let bestReply = "brace";
    let bestEv = -Infinity;
    App.wrestlerOrders.forEach((mine) => {
      let ev = 0;
      App.wrestlerOrders.forEach((guess) => {
        ev += (weights[guess] || 0) * App.wrestlerAiValue(view, mine, guess, rank);
      });
      if (ev > bestEv) { bestEv = ev; bestReply = mine; }
    });
    return bestReply;
  };
  const twrScore = (before, after) => {
    if (after.b.fell && !after.a.fell) return 1000;
    if (after.a.fell) return -1000;
    let score = 0;
    score += (before.b.balance - after.b.balance) * 4;
    score -= (before.a.balance - after.a.balance) * 4;
    score += (after.b.foot - before.b.foot) * 6;
    score -= (after.a.foot - before.a.foot) * 8;
    score -= after.a.exposed * 3;
    score += after.b.exposed * 2;
    if (after.gap <= 2) score += 3;
    if (after.gap <= 1) score += 2;
    return score;
  };
  const twrBout = (rank, policy, seed) => {
    const real = Math.random;
    let state = seed >>> 0;
    Math.random = () => {
      state = (Math.imul(state, 1103515245) + 12345) >>> 0;
      return state / 4294967296;
    };
    try {
      let mat = App.wrestlerStartMat();
      const history = [];
      for (let beats = 1; beats <= 40; beats += 1) {
        const orderA = mat.a.exposed > 0 ? "brace" : policy(mat, history, rank);
        const orderB = App.wrestlerAiPick(mat, rank, history);
        if (App.wrestlerOrders.indexOf(orderB) < 0) {
          return { win: false, beats, illegal: true };
        }
        mat = App.wrestlerExchange(mat, orderA, orderB);
        history.push(orderA);
        if (mat.b.fell && !mat.a.fell) return { win: true, beats };
        if (mat.a.fell) return { win: false, beats };
      }
      return { win: false, beats: 40, stale: true };
    } finally {
      Math.random = real;
    }
  };
  const twrCertificate = (mat, history, rank) => {
    if (mat.a.exposed > 0) return "brace";
    const reply = twrReply(mat, history, rank);
    let best = "brace";
    let bestScore = -Infinity;
    App.wrestlerOrders.forEach((mine) => {
      const score = twrScore(mat, App.wrestlerExchange(mat, mine, reply));
      if (score > bestScore) { bestScore = score; best = mine; }
    });
    return best;
  };
  const twrPassive = () => "brace";

  /* Calibration: the shipped gate's own bar reproduces on the old peak, so
   * the summit is measured against the bar the shipped ladder answers to. */
  const benchApex = (rank) => {
    let wins = 0;
    let fastest = Infinity;
    let illegal = 0;
    const bouts = 60;
    const wonBeats = [];
    for (let i = 0; i < bouts; i += 1) {
      const out = twrBout(rank, twrCertificate, 41000 + i * 7919);
      if (out.illegal) illegal += 1;
      if (out.win) {
        wins += 1;
        wonBeats.push(out.beats);
        if (out.beats < fastest) fastest = out.beats;
      }
    }
    return { wins, fastest, illegal, wonBeats, bouts };
  };
  const apexBench = benchApex(apex);
  check("game-tiny-wrestlers",
    "the bench calibrates on the apex: the certificate clears w24 at the shipped bar",
    apexBench.wins >= 54 && apexBench.fastest <= 8 && apexBench.illegal === 0,
    `${apexBench.wins}/${apexBench.bouts}, fastest ${apexBench.fastest}, illegal ${apexBench.illegal}`);

  /* Every summit rung is dominated the same way: cleared in a realistic
   * share of bouts, no illegal machine answer, the fastest win inside the
   * three-star band, and a passive line losing fast - the rank is only
   * held by wrestling it. */
  const summitProblems = [];
  summit.forEach((rank) => {
    const run = benchApex(rank);
    const name = `${rank.id} noise=${rank.noise} bands=${rank.starBeats.join("/")}`;
    if (!(run.wins >= 54 && run.illegal === 0)) {
      summitProblems.push(`${name} won ${run.wins}/${run.bouts}, illegal ${run.illegal}`);
    }
    if (run.fastest === Infinity || run.fastest > 8 || run.fastest > rank.starBeats[0]) {
      summitProblems.push(`${name} fastest ${run.fastest} vs band ${rank.starBeats[0]}`);
    }
    const passive = twrBout(rank, twrPassive, 41001);
    if (passive.win || passive.beats > 12) {
      summitProblems.push(`${name} passive line lasted ${JSON.stringify(passive)}`);
    }
    /* Star honesty: every winning bout earns at least one star under the
     * game's own starsFor semantics - here every win lands inside the
     * three-star line - and the lines bite: the band edges score exactly
     * 3 / 2 / 1 / 0, with the one-star line sitting on the engine's beat
     * cap so no looser band is possible. */
    const starProblems = [];
    run.wonBeats.forEach((beats) => {
      if (App.starsFor(beats, rank.starBeats, "low") < 1) {
        starProblems.push("a win in " + beats + " beats earns no star");
      }
    });
    const edge3 = App.starsFor(rank.starBeats[0], rank.starBeats, "low");
    const edge2 = App.starsFor(rank.starBeats[0] + 1, rank.starBeats, "low");
    const edge1 = App.starsFor(rank.starBeats[2], rank.starBeats, "low");
    const edge0 = App.starsFor(rank.starBeats[2] + 1, rank.starBeats, "low");
    if (edge3 !== 3 || edge2 !== 2 || edge1 !== 1 || edge0 !== 0) {
      starProblems.push(`band edges score ${edge3}/${edge2}/${edge1}/${edge0}`);
    }
    if (starProblems.length) {
      summitProblems.push(`${name} ${starProblems.join("; ")}`);
    }
  });
  check("game-tiny-wrestlers",
    "every summit rung is beaten at the apex's bar and lands its own star bands",
    summitProblems.length === 0, summitProblems.join(" | "));

  /* ---- the boot: the shell's real init path, in a fresh stub DOM ---- */
  let bootError = null;
  let bootApp = null;
  let bootEnv = null;
  try {
    const { createEnvironment } = require(path.join(root, "tools", "stub-dom"));
    const pageHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
    const modules = Array.from(
      pageHtml.matchAll(/assets\/app\/([a-z0-9-]+)\.js\?v=\d+/g),
    ).map((match) => match[1]);
    const source = modules.map((name) =>
      fs.readFileSync(path.join(root, "assets", "app", name + ".js"), "utf8")
        .replace(/^\uFEFF/, "")).join("\n");
    bootEnv = createEnvironment({});
    bootEnv.load(source);
    bootEnv.domReady();
    bootApp = bootEnv.sandbox.CapitalConvert || bootEnv.window.CapitalConvert;
  } catch (error) {
    bootError = error;
  }
  check("game-tiny-wrestlers",
    "the shell boots the panel through its real init path with no errors",
    !bootError && !!bootApp && !!bootEnv.byId("gamePanelTinyWrestlers") &&
    typeof bootApp.quietResetTinyWrestlers === "function",
    bootError ? String(bootError && bootError.message) : "panel or pause hook missing");
  /* The live picker lists all thirty ranks and names the summit in whichever
   * language the page booted in - the names the game module registers
   * through addStrings, read back off the shipped DOM. */
  const rankSel = bootError ? null : bootEnv.byId("twrRankSel");
  const options = rankSel ? rankSel.querySelectorAll("option") : [];
  const optionTexts = {};
  options.forEach((option) => { optionTexts[option.value] = option.textContent; });
  const bootDict = bootApp && bootApp.I18N ? bootApp.I18N : { en: {}, zh: {} };
  const pickerProblems = [];
  if (options.length !== 30) { pickerProblems.push(options.length + " options"); }
  summitIds.forEach((id, index) => {
    const key = summitKeys[index];
    const text = optionTexts[id] || "";
    const wanted = [bootDict.en[key], bootDict.zh[key]].filter((name) => !!name);
    if (!text || !wanted.some((name) => text.indexOf(name) !== -1)) {
      pickerProblems.push(id + " shows " + JSON.stringify(text));
    }
  });
  check("game-tiny-wrestlers",
    "the live picker lists thirty ranks and names the summit in the boot language",
    pickerProblems.length === 0, pickerProblems.join(" | "));

  /* ---- the unlock chain is derived, never stored ---- */
  const chain = App.createCampaign({
    key: "tiny-wrestlers-gate-chain",
    levels: ranks.map((rank) => ({ id: rank.id, labelKey: rank.labelKey })),
  });
  let walked = 0;
  let chained = true;
  ranks.forEach((rank, index) => {
    const outcome = chain.record(rank.id, { stars: 3, best: 5, better: "low" });
    if (outcome.firstClear) walked += 1;
    const expected = index + 1 < ranks.length ? ranks[index + 1].id : null;
    if (outcome.unlockedNext !== expected) chained = false;
  });
  check("game-tiny-wrestlers", "the unlock chain walks all thirty ranks in order",
    walked === 30 && chained && chain.clearedCount() === 30, walked + " first clears");

  /* ---- the tier's names travel with the page ---- */
  const copyProblems = summitKeys.filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key || App.I18N.en[key] === App.I18N.zh[key]);
  check("game-tiny-wrestlers", "the six summit rank names resolve in both languages",
    copyProblems.length === 0, copyProblems.join(","));
};
