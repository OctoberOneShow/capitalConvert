#!/usr/bin/env node
/*
 * Loopwright forge.
 *
 * Every floor is authored with the run list that clears it and validated at
 * load time, so the only way to add a floor is to prove it solvable - this
 * tool runs that same lpwSolved over the whole shipped ladder and, for the
 * deep tier, measures the runs the way the panel scores them: it replays each
 * authored list through App.loopSim keeping the receipts (per-run reason,
 * step count, final cell, plate state) and then searches the movement
 * alphabet the chips offer for any shorter winning final run. A floor only
 * stays in the game while every probe here comes back clean.
 *
 *   node tools/loopwright-forge.js           audit the whole ladder
 *   node tools/loopwright-forge.js --deep    add the deep-tier searches
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { createEnvironment } = require("./stub-dom");

const root = path.join(__dirname, "..");
let booted = null;

/* Boot the real app in the stub DOM once and hand back the live App. */
function load() {
  if (booted) {
    return booted;
  }
  const pageHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const APP_MODULES = Array.from(
    pageHtml.matchAll(/assets\/app\/([a-z0-9-]+)\.js\?v=\d+/g),
  ).map((match) => match[1]);
  const appSource = APP_MODULES.map((name) =>
    fs
      .readFileSync(path.join(root, "assets", "app", name + ".js"), "utf8")
      .replace(/^﻿/, ""),
  ).join("\n");
  const env = createEnvironment({});
  env.load(appSource);
  env.domReady();
  booted = { env, App: env.sandbox.CapitalConvert || env.window.CapitalConvert };
  return booted;
}

/* The grid lpwSim wants: the parsed floor plus whatever ghosts exist so far. */
function gridWith(base, ghosts) {
  return {
    w: base.w, h: base.h, walls: base.walls, plates: base.plates, doors: base.doors,
    crates: base.crates, pads: base.pads, pistons: base.pistons, goal: base.goal,
    start: base.start, ghosts: ghosts,
  };
}

/* Replay an authored run list exactly the way lpwSolved does, but keep the
 * receipts: for every run the reason it ended, its step count, where the
 * worker finished, and whether every plate was held at that final frame. */
function replayRuns(floor) {
  const { App } = load();
  const base = App.loopParse(floor);
  const ghosts = [];
  const runs = [];
  for (let i = 0; i < floor.programs.length; i += 1) {
    const sim = App.loopSim(gridWith(base, ghosts), floor.programs[i], 64);
    const last = sim.frames[sim.frames.length - 1];
    runs.push({
      run: i + 1,
      reason: sim.reason,
      win: sim.win === true,
      steps: sim.steps,
      end: { x: last.w.x, y: last.w.y },
      allPlates: last.press.every(Boolean),
    });
    if (i < floor.programs.length - 1) {
      if (sim.reason !== "done") {
        break;
      }
      ghosts.push(sim.frames);
    }
  }
  const complete = runs.length === floor.programs.length;
  return {
    base,
    runs,
    ghosts,
    complete,
    solved: complete && runs[runs.length - 1].win === true,
  };
}

/* The ghosts the authored prefix leaves behind (null when a prefix run ends
 * early - a floor whose setup crashes has no ghost set to search against). */
function prefixGhosts(floor) {
  const replay = replayRuns(floor);
  return replay.complete ? replay.ghosts : null;
}

/* Exhaustive bounded search: does ANY program over `alphabet` of length
 * `maxLen` or shorter win the final run, given these ghosts? Returns the
 * shortest winner it finds, or null. The alphabet is the chip set the panel
 * itself offers, so a hit here is a run the game could actually play - and a
 * miss proves the authored final run is the measured minimum over that set. */
function searchMinimum(floor, options) {
  const { App } = load();
  const opts = options || {};
  const alphabet = opts.alphabet || ["F", "B", "L", "R", "W"];
  const maxLen = opts.maxLen || 8;
  const base = App.loopParse(floor);
  const ghosts = opts.ghosts !== undefined ? opts.ghosts : prefixGhosts(floor);
  if (ghosts === null) {
    return { error: "prefix-crashed" };
  }
  const width = alphabet.length;
  for (let len = 1; len <= maxLen; len += 1) {
    const total = Math.pow(width, len);
    for (let n = 0; n < total; n += 1) {
      const program = new Array(len);
      let rest = n;
      for (let i = 0; i < len; i += 1) {
        program[i] = alphabet[rest % width];
        rest = (rest / width) | 0;
      }
      const sim = App.loopSim(gridWith(base, ghosts), program, 64);
      if (sim.win) {
        return { length: len, program };
      }
    }
  }
  return null;
}

module.exports = { load, replayRuns, prefixGhosts, searchMinimum, gridWith };

/* ---- CLI audit -----------------------------------------------------------
 * Whole-ladder table through the game's own solver, plus - with --deep - the
 * measured-minimum and signature-op searches over the 21-24 tier. */
if (require.main === module) {
  const { App } = load();
  const floors = App.lpwFloors;
  let bad = 0;
  console.log(`loopwright ladder: ${floors.length} floors`);
  floors.forEach((floor) => {
    const ok = App.loopSolved(floor) === true;
    if (!ok) {
      bad += 1;
    }
    console.log(
      `${floor.id}: solved=${ok}  runs=${floor.parRuns} ops=${floor.parOps}` +
        ` stars=${floor.starRuns.join("/")}` +
        (floor.valid ? "" : "  <-- LOAD-TIME PROOF FAILED"),
    );
  });

  /* The deep tier's receipts: what each authored run actually did, and the
   * searches that hold the tier to its design brief. Each floor names the
   * op its brief leans on; the necessity search reruns without it. */
  const tier = floors.filter((floor) =>
    ["f21", "f22", "f23", "f24"].indexOf(floor.id) !== -1);
  tier.forEach((floor) => {
    const replay = replayRuns(floor);
    replay.runs.forEach((run) => {
      console.log(
        `  ${floor.id} run${run.run}: reason=${run.reason} win=${run.win}` +
          ` steps=${run.steps} end=(${run.end.x},${run.end.y})` +
          ` allPlates=${run.allPlates}`,
      );
    });
  });

  if (process.argv.includes("--deep")) {
    /* Deep-tier probes, each honest about what the chips can do:
     * - min: no program over the movement chips wins in fewer than parOps
     *   ops, given the authored ghosts. (f22 carries no items, so its idle
     *   chips P/G/D can only duplicate W and are left out; elsewhere P stays
     *   because it shoves. The J marker only skips or idles - it can never
     *   add a move - so it cannot beat the minimum either.)
     * - without: the op the design brief leans on, removed from the alphabet
     *   at full par length - a hit would mean the brief's verb is optional.
     * - straight: the naive no-delay walk, measured to die on the ram or
     *   gate whose phase the authored run has to respect. */
    const CHIPS = ["F", "B", "L", "R", "W", "P", "G", "D"];
    const probes = [
      { id: "f21", full: ["F", "B", "L", "R", "W", "P"], without: ["F", "L", "R", "W", "P"], note: "no-B" },
      { id: "f22", full: ["F", "B", "L", "R", "W"], straight: ["F", "F", "F", "F", "F", "F", "R", "F"], note: "straight walk" },
      { id: "f23", full: CHIPS, without: ["F", "B", "L", "R", "W", "P"], note: "no-carry" },
      { id: "f24", full: ["F", "B", "L", "R", "W", "P"], straight: ["F", "F", "F", "F", "F", "R", "F"], note: "straight walk" },
    ];
    probes.forEach((probe) => {
      const floor = floors.find((f) => f.id === probe.id);
      if (!floor) {
        return;
      }
      const ghosts = prefixGhosts(floor);
      const shorter = searchMinimum(floor, { ghosts, alphabet: probe.full, maxLen: floor.parOps - 1 });
      const shorterOk = shorter === null;
      let extraOk = true;
      let extraNote = "";
      if (probe.without) {
        const sans = searchMinimum(floor, { ghosts, alphabet: probe.without, maxLen: floor.parOps });
        extraOk = sans === null;
        extraNote = ` ${probe.note}<=${floor.parOps}=${extraOk ? "proven" : "BROKEN " + JSON.stringify(sans)}`;
      }
      if (probe.straight) {
        const sim = App.loopSim(gridWith(App.loopParse(floor), ghosts), probe.straight, 64);
        extraOk = sim.reason === "wall" && !sim.win;
        extraNote = ` ${probe.note}=${sim.reason} at the gate${extraOk ? "" : " <-- WALKED STRAIGHT THROUGH"}`;
      }
      if (!shorterOk || !extraOk) {
        bad += 1;
      }
      console.log(
        `  ${floor.id}: min>${floor.parOps - 1} over chips=${shorterOk ? "proven" : "BROKEN " + JSON.stringify(shorter)}` +
          extraNote,
      );
    });
  }

  console.log(bad === 0 ? "forge audit: all clean" : `forge audit: ${bad} problem(s)`);
  process.exitCode = bad === 0 ? 0 : 1;
}
