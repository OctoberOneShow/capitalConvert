#!/usr/bin/env node
/*
 * Loopwright forge.
 *
 * Every floor is authored with the run list that clears it and validated at load
 * time, so the only way to add a floor is to prove it solvable - this tool runs
 * that same lpwSolved on candidate floors and reports, for each, whether the
 * shipped runs win and where the worker actually ends up. A floor only goes into
 * the game once it reports solved here.
 *
 *   node tools/loopwright-forge.js
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { createEnvironment } = require("./stub-dom");

const root = path.join(__dirname, "..");
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
const App = env.sandbox.CapitalConvert || env.window.CapitalConvert;

/* Candidate floors for f14..f20. Each is a full floor object, built the same
 * way the shipped ones are; the comment next to it is the intended walk. */
const CANDIDATES = [
  {
    id: "f14", labelKey: "lpwF14",
    map: ["########",
          "#......#",
          "#..G...#",
          "#......#",
          "#......#",
          "#......#",
          "#.W....#",
          "########"],
    doorPlates: [], pistonOffsets: [],
    programs: [["F", "F", "F", "F", "R", "F"]],
  },
  {
    id: "f15", labelKey: "lpwF15",
    map: ["########",
          "#..G...#",
          "#.######",
          "#.######",
          "#.######",
          "#.######",
          "#W....##",
          "########"],
    doorPlates: [], pistonOffsets: [],
    programs: [["F", "F", "F", "F", "F", "R", "F", "F"]],
  },
  {
    id: "f16", labelKey: "lpwF16",
    map: ["########",
          "#.G....#",
          "#.######",
          "#.######",
          "#.######",
          "#.######",
          "#W######",
          "########"],
    doorPlates: [], pistonOffsets: [],
    programs: [["F", "F", "F", "F", "F", "R", "F"]],
  },
  {
    id: "f17", labelKey: "lpwF17",
    map: ["########",
          "#P.....#",
          "#......#",
          "#......#",
          "#......#",
          "#......#",
          "#WDG...#",
          "########"],
    doorPlates: [0], pistonOffsets: [],
    programs: [["F", "F", "F", "F", "F"], ["R", "W", "W", "W", "W", "F", "F"]],
  },
  {
    id: "f18", labelKey: "lpwF18",
    map: ["########",
          "#DG....#",
          "#.######",
          "#P######",
          "#.######",
          "#.######",
          "#W....##",
          "########"],
    doorPlates: [0], pistonOffsets: [],
    programs: [["F", "F", "F"], ["F", "F", "F", "F", "F", "R", "F"]],
  },
  {
    id: "f19", labelKey: "lpwF19",
    map: ["########",
          "#..G...#",
          "###D####",
          "#..P...#",
          "#.######",
          "#W######",
          "########",
          "########"],
    doorPlates: [0], pistonOffsets: [],
    programs: [["F", "F", "R", "F", "F"], ["F", "F", "R", "F", "F", "L", "F", "F"]],
  },
  {
    id: "f20", labelKey: "lpwF20",
    map: ["########",
          "########",
          "#...G###",
          "#.######",
          "#.######",
          "#.######",
          "#W######",
          "########"],
    doorPlates: [], pistonOffsets: [],
    programs: [["F", "F", "F", "F", "R", "F", "F", "F"]],
  },
];

CANDIDATES.forEach((floor) => {
  const base = App.loopParse ? App.loopParse(floor) : floor;
  const ok = App.loopSolved(floor);
  const goals = `goal(${base.goal.x},${base.goal.y}) start(${base.start.x},${base.start.y})`;
  console.log(
    `${floor.id}: solved=${ok}  ${goals}  programs=${floor.programs.length}`,
  );
  if (!ok && App.loopSim) {
    let ghosts = [];
    floor.programs.forEach((program, index) => {
      const sim = App.loopSim(base, program, ghosts);
      console.log(
        `   run${index + 1}: reason=${sim.reason} win=${sim.win} allPlates=${sim.allPlates}`,
      );
      ghosts = sim.frames;
    });
  }
});
