"use strict";

/* game-dream-orchestra: every target is a legal line by construction, so the
 * gate proves the hard tier the way the module defines winning
 *
 * The module deals each piece's target from a seeded legal line at load and
 * stores it on the level, and the panel's own checkWin is "the exported
 * matcher matches every marked beat and the exported violation scanner is
 * quiet". So the gate replays the dealt line of all twenty-four pieces
 * through those exported functions - the same functions the keys and the
 * pointer drive - and then beats the four new pieces through the real panel:
 * select the piece, click the target's cells, read three stars off the
 * result line and the campaign save. A fresh piece records nothing until a
 * note is placed (the no-op check), and an empty pattern can never match.
 *
 * Each new piece advertises one rule dial pushed past every shipped piece,
 * measured on the dealt targets, not the dials: d21's bells wait 14 steps
 * between rings (no shipped target stretches past 12), d22's bass walks five
 * straight steps (shipped peak three), d23 rings the first bell trio (shipped
 * peak two), d24's rest rule skips 44% of the marked bar (shipped quietest
 * 33%). The mechanic cut here cannot delete notes - the win is "match the
 * target exactly", so a target dealt under a different rule is simply a
 * different puzzle. The honest cut is a re-deal: the same seed dealt under
 * the shipped dial produces a different line whose exercised value falls
 * back under the record, which is exactly the claim "this dial shaped this
 * piece". Difficulty also climbs inside the tier the one way the engine
 * measures it: the tempo walks 144 -> 142 -> 141 -> 140 ms, ending at the
 * documented 140 ms playability floor, over the full sixteen-beat bar.
 *
 * The summit d25-d30 adds rule families the shipped set never read: an echo
 * window between bells and strings, a rest leash on each voice, a coda law
 * that only bites in the closing half, and a hush that empties steps
 * outright. Each rung's family is proven by re-dealing the same seed with
 * that family lifted: the deal must change and the line it produces must
 * break the shipped law with a violation of exactly that family's kind. */
module.exports = function gate(ctx) {
  const { App, env, check } = ctx;
  const levels = App.drmLevels;
  const tierIds = ["d21", "d22", "d23", "d24"];
  const summitIds = ["d25", "d26", "d27", "d28", "d29", "d30"];
  const byId = (id) => levels.find((level) => level.id === id);

  /* ---- ladder shape ---- */
  check("game-dream-orchestra", "the ladder holds at least thirty pieces",
    levels.length >= 30, String(levels.length));
  check("game-dream-orchestra", "every piece id is distinct",
    new Set(levels.map((level) => level.id)).size === levels.length,
    levels.map((level) => level.id).join(","));
  const missing = tierIds.concat(summitIds).filter((id) => !byId(id));
  check("game-dream-orchestra", "the hard tier d21-d24 and the summit d25-d30 are present",
    missing.length === 0, missing.join(","));

  /* ---- the load-time deal still holds for every piece ---- */
  const patternOf = (level) => {
    const pattern = App.orchestraEmptyPattern();
    level.target.forEach((note, step) => {
      if (note) {
        pattern[note.v][step] = note.r;
      }
    });
    return pattern;
  };
  const dealProblems = [];
  levels.forEach((level) => {
    const m = App.orchestraMatch(patternOf(level), level.target);
    const breaks = App.orchestraViolations(patternOf(level), level.rules);
    if (!m.done || breaks.length) {
      dealProblems.push(level.id + ":" + m.matched + "/" + m.total + "+" + breaks.length);
    }
    const par = App.orchestraPar(level);
    if (!level.starCredits || level.starCredits.join(",") !== par.join(",") ||
        level.starCredits[0] !== m.total) {
      dealProblems.push(level.id + ":bands " + (level.starCredits || []).join("/") +
        " vs par " + par.join("/") + " notes " + m.total);
    }
  });
  check("game-dream-orchestra", "every dealt line replays to a win through the exported " +
      "matcher and violation scanner, and every star band is the measured par",
    dealProblems.length === 0, dealProblems.join(" "));

  /* The bands are demanding: three stars is the exact minimum, one extra
   * note drops a star, and five extra notes pay nothing. */
  const bandProblems = [];
  tierIds.concat(summitIds).forEach((id) => {
    const level = byId(id);
    const par = level.starCredits[0];
    if (App.starsFor(par, level.starCredits, "low") !== 3 ||
        App.starsFor(par + 1, level.starCredits, "low") !== 2 ||
        App.starsFor(par + 5, level.starCredits, "low") !== 0) {
      bandProblems.push(id);
    }
  });
  check("game-dream-orchestra", "the tier's bands pay three stars only for the exact " +
      "par line and nothing for five extra notes",
    bandProblems.length === 0, bandProblems.join(","));  /* ---- the advertised dials, measured on the dealt targets ---- */
  const exercised = (level) => {
    const bell = [];
    const bass = [];
    level.target.forEach((note, step) => {
      if (note && note.v === "bell") bell.push(step);
      if (note && note.v === "bass") bass.push(step);
    });
    let gap = 0;
    for (let i = 1; i < bell.length; i += 1) gap = Math.max(gap, bell[i] - bell[i - 1]);
    let run = bass.length ? 1 : 0;
    let maxBassRun = run;
    for (let i = 1; i < bass.length; i += 1) {
      run = bass[i] === bass[i - 1] + 1 ? run + 1 : 1;
      maxBassRun = Math.max(maxBassRun, run);
    }
    run = bell.length ? 1 : 0;
    let maxBellRun = run;
    for (let i = 1; i < bell.length; i += 1) {
      run = bell[i] === bell[i - 1] + 1 ? run + 1 : 1;
      maxBellRun = Math.max(maxBellRun, run);
    }
    const count = level.target.filter(Boolean).length;
    return { gap, maxBassRun, maxBellRun, count, skip: 1 - count / level.beats.length };
  };
  const measured = {};
  levels.forEach((level) => { measured[level.id] = exercised(level); });
  const bestAmong = (ids, pick) => Math.max.apply(null, ids.map((id) => pick(measured[id])));
  const shippedIds = levels.slice(0, 20).map((level) => level.id);
  const otherTierIds = tierIds.filter((id) => id !== "d21");
  const d21 = byId("d21");
  const d22 = byId("d22");
  const d23 = byId("d23");
  const d24 = byId("d24");

  check("game-dream-orchestra", "d21's vigil is exercised at " + measured.d21.gap +
      " steps - past every other piece in the campaign",
    measured.d21.gap >= d21.rules.bellGap &&
      measured.d21.gap > bestAmong(shippedIds.concat(otherTierIds), (m) => m.gap),
    "d21 " + measured.d21.gap + " vs best other " +
      bestAmong(shippedIds.concat(otherTierIds), (m) => m.gap));
  check("game-dream-orchestra", "d22's bass walk is exercised at " + measured.d22.maxBassRun +
      " steps - past every other piece in the campaign",
    measured.d22.maxBassRun === d22.rules.bassRun &&
      measured.d22.maxBassRun > bestAmong(shippedIds.concat(["d21", "d23", "d24"]), (m) => m.maxBassRun),
    "d22 " + measured.d22.maxBassRun + " vs best other " +
      bestAmong(shippedIds.concat(["d21", "d23", "d24"]), (m) => m.maxBassRun));
  check("game-dream-orchestra", "d23's bell trio is exercised at " + measured.d23.maxBellRun +
      " rings - past every other piece in the campaign",
    measured.d23.maxBellRun === d23.rules.bellRun &&
      measured.d23.maxBellRun > bestAmong(shippedIds.concat(["d21", "d22", "d24"]), (m) => m.maxBellRun),
    "d23 " + measured.d23.maxBellRun + " vs best other " +
      bestAmong(shippedIds.concat(["d21", "d22", "d24"]), (m) => m.maxBellRun));
  check("game-dream-orchestra", "d24's rest rule is exercised at " +
      (measured.d24.skip * 100).toFixed(0) + "% of the bar - the quietest deal in the campaign",
    measured.d24.skip > bestAmong(shippedIds.concat(["d21", "d22", "d23"]), (m) => m.skip),
    (measured.d24.skip * 100).toFixed(1) + "% vs best other " +
      (bestAmong(shippedIds.concat(["d21", "d22", "d23"]), (m) => m.skip) * 100).toFixed(1) + "%");
  const tierSteps = tierIds.map((id) => byId(id).stepMs);
  check("game-dream-orchestra", "the tier holds the full bar and walks the tempo down to " +
      "the documented 140 ms floor: " + tierSteps.join(" -> "),
    tierIds.every((id) => byId(id).beats.length === 16) &&
      tierSteps.every((ms, index) => index === 0 || ms < tierSteps[index - 1]) &&
      tierSteps[3] === 140,
    tierSteps.join(","));

  /* ---- the honest cut: re-deal the same seed under the shipped dial ---- */
  const cloneOf = (level, patch) => {
    const clone = JSON.parse(JSON.stringify({
      id: level.id, seed: level.seed, voices: level.voices, beats: level.beats,
      rest: level.rest, rules: level.rules, stepMs: level.stepMs,
    }));
    return Object.assign(clone, patch);
  };
  const redeal = (level, patch) => {
    const clone = cloneOf(level, patch);
    return { target: App.orchestraDeal(clone), level: clone };
  };
  const compact = (target) => target.map((note) => note ? note.v + note.r : "-").join(",");

  {
    const cut = redeal(d21, { rules: Object.assign({}, d21.rules, { bellGap: 8 }) });
    const cutMeasure = exercised({ target: cut.target, beats: d21.beats });
    check("game-dream-orchestra", "d21's vigil shapes the piece: the same seed dealt under " +
        "the shipped 8-step gap deals a different line whose wait falls under the record",
      compact(cut.target) !== compact(d21.target) && cutMeasure.gap < measured.d21.gap,
      "cut wait " + cutMeasure.gap + " vs " + measured.d21.gap);
  }
  {
    const cut = redeal(d22, { rules: Object.assign({}, d22.rules, { bassRun: 4 }) });
    const cutMeasure = exercised({ target: cut.target, beats: d22.beats });
    check("game-dream-orchestra", "d22's five-step walk shapes the piece: under the shipped " +
        "4-step cap the same seed never walks that far",
      compact(cut.target) !== compact(d22.target) && cutMeasure.maxBassRun <= 4,
      "cut walk " + cutMeasure.maxBassRun);
  }
  {
    const cut = redeal(d23, { rules: Object.assign({}, d23.rules, { bellRun: 2 }) });
    const cutMeasure = exercised({ target: cut.target, beats: d23.beats });
    check("game-dream-orchestra", "d23's bell trio shapes the piece: under the shipped " +
        "2-ring cap the same seed never rings three",
      compact(cut.target) !== compact(d23.target) && cutMeasure.maxBellRun <= 2,
      "cut trio " + cutMeasure.maxBellRun);
  }
  {
    const cut = redeal(d24, { rest: 0 });
    const cutMeasure = exercised({ target: cut.target, beats: d24.beats });
    check("game-dream-orchestra", "d24's quiet bar shapes the piece: with the rest rule off " +
        "the same seed deals a full bar - the silence is the puzzle",
      compact(cut.target) !== compact(d24.target) &&
        cutMeasure.skip === 0 && measured.d24.skip > 0.4 && measured.d24.count <= 10,
      "cut skip " + cutMeasure.skip + " vs " + measured.d24.skip.toFixed(2) +
        ", notes " + measured.d24.count);
  }

  /* ---- the summit: each new family is proven by re-dealing without it ---- */
  const lifted = {
    d25: { echoGap: undefined },
    d26: { strGap: undefined },
    d27: { codaFrom: undefined, codaStrRun: undefined },
    d28: { hushFrom: undefined, hushTo: undefined },
    d29: { bassGap: undefined, strGap: undefined },
    d30: { bassGap: undefined, echoGap: undefined, codaFrom: undefined,
      codaStrRun: undefined, hushFrom: undefined, hushTo: undefined },
  };
  const familyKind = { d25: "echo", d26: "rest", d27: "coda", d28: "hush", d29: "rest",
    d30: ["rest", "echo", "coda", "hush"] };
  const summitCutProblems = [];
  summitIds.forEach((id) => {
    const level = byId(id);
    const cut = redeal(level, { rules: Object.assign({}, level.rules, lifted[id]) });
    const cutPattern = App.orchestraEmptyPattern();
    cut.target.forEach((note, step) => {
      if (note) cutPattern[note.v][step] = note.r;
    });
    const breaks = App.orchestraViolations(cutPattern, level.rules);
    const kinds = new Set(breaks.map((entry) => entry.kind));
    const wanted = [].concat(familyKind[id]);
    const missingKinds = wanted.filter((kind) => !kinds.has(kind));
    if (compact(cut.target) === compact(level.target) || missingKinds.length) {
      summitCutProblems.push(id + ":" + (compact(cut.target) === compact(level.target)
        ? "same-deal" : "missing " + missingKinds.join("+")) +
        " (" + (breaks.map((entry) => entry.kind).join(",") || "no breaks") + ")");
    }
  });
  check("game-dream-orchestra", "every summit family is live: lifting it re-deals the same " +
      "seed into a line the shipped law rejects with that family's own violation",
    summitCutProblems.length === 0, summitCutProblems.join(" "));

  /* d24's four families against the summit's: d30 keeps four of the new
   * families live in one piece, which no shipped piece does. */
  const liveSummit = ["bassGap", "echoGap", "codaFrom", "hushFrom"];
  const d30Live = liveSummit.filter((key) => {
    const rules = Object.assign({}, byId("d30").rules);
    delete rules[key];
    const cut = App.orchestraDeal(Object.assign(cloneOf(byId("d30"), {}), { rules: rules }));
    return compact(cut) !== compact(byId("d30").target);
  });
  check("game-dream-orchestra", "d30 keeps four new rule families live at once: " +
      d30Live.join("/"),
    d30Live.length === liveSummit.length, d30Live.join(","));

  /* ---- beat the new pieces through the real panel ---- */
  const doc = env.document;
  const panel = doc.createElement("div");
  doc.body.appendChild(panel);
  const cleared = {};
  for (let d = 1; d <= 20; d += 1) cleared["d" + d] = { stars: 3, best: 1 };
  env.store.set("dream-orchestra-campaign", JSON.stringify({ v: 1, cleared: cleared }));
  App.initDreamOrchestraGame(panel);
  const sel = panel.querySelector("select");
  const cells = panel.querySelectorAll(".drm-cell");
  const resultEl = panel.querySelector(".game-result");
  const readSave = () => JSON.parse(env.store.get("dream-orchestra-campaign") || "{}");

  const tierProblems = [];
  tierIds.forEach((id) => {
    const level = byId(id);
    sel.value = id;
    env.dispatch(sel, "change");
    if (sel.value !== id) {
      tierProblems.push(id + ":locked");
      return;
    }
    /* A fresh piece records nothing: doing nothing is not a win. */
    if (readSave().cleared[id]) {
      tierProblems.push(id + ":free-clear");
    }
    /* Place exactly the dealt line through the real cells. */
    level.target.forEach((note, step) => {
      if (note) cells[(7 - note.r) * 16 + step].click();
    });
    const won = /(\d) stars!/.exec(resultEl.textContent);
    const stars = won ? Number(won[1]) : 0;
    const saved = readSave().cleared[id];
    if (stars !== 3 || !saved || saved.stars !== 3) {
      tierProblems.push(id + ":replay " + stars + "/" + JSON.stringify(saved || null));
    }
    /* The par line is exactly what the panel asked for. */
    if (!new RegExp("with " + measured[id].count + " notes").test(resultEl.textContent)) {
      tierProblems.push(id + ":par " + resultEl.textContent.slice(0, 60));
    }
  });
  check("game-dream-orchestra", "d21-d24 each replay their dealt line through the real " +
      "cells to three stars, record it, and pay nothing for an untouched board",
    tierProblems.length === 0, tierProblems.join(" | "));

  /* The summit unlocks behind the tier, so the same panel is driven again:
   * select each new piece, click its dealt line, read three stars and the
   * save. */
  const summitProblems = [];
  summitIds.forEach((id) => {
    const level = byId(id);
    sel.value = id;
    env.dispatch(sel, "change");
    if (sel.value !== id) {
      summitProblems.push(id + ":locked");
      return;
    }
    level.target.forEach((note, step) => {
      if (note) cells[(7 - note.r) * 16 + step].click();
    });
    const won = /(\d) stars!/.exec(resultEl.textContent);
    const stars = won ? Number(won[1]) : 0;
    const saved = readSave().cleared[id];
    if (stars !== 3 || !saved || saved.stars !== 3) {
      summitProblems.push(id + ":replay " + stars + "/" + JSON.stringify(saved || null));
    }
  });
  check("game-dream-orchestra", "d25-d30 each replay their dealt line through the real " +
      "cells to three stars and record it",
    summitProblems.length === 0, summitProblems.join(" | "));

  /* An empty pattern can never match: the engine's own matcher on the
   * tier's targets. */
  const emptyProblems = tierIds.filter((id) => {
    const empty = App.orchestraEmptyPattern();
    return App.orchestraMatch(empty, byId(id).target).done;
  });
  check("game-dream-orchestra", "an empty board matches no new piece",
    emptyProblems.length === 0, emptyProblems.join(","));

  /* Copy travels with the module. */
  const copyKeys = ["drmP21", "drmP22", "drmP23", "drmP24",
    "drmP25", "drmP26", "drmP27", "drmP28", "drmP29", "drmP30"];
  const copyProblems = copyKeys.filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-dream-orchestra", "the ten piece names resolve in both languages",
    copyProblems.length === 0, copyProblems.join(","));
};
