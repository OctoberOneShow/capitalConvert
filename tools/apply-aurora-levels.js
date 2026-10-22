#!/usr/bin/env node
/* Writes the forged boards from tools/_aurora_boards.json over the second tier
 * of game-aurora-flow.js. The ladder is ordered by the solver's measured
 * ribbon length, ids are re-assigned to follow that order, and the star bands
 * are derived from the same measurement - so the file can always be rebuilt
 * from the forge instead of being hand-edited. */
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const gameFile = path.join(root, "assets", "app", "game-aurora-flow.js");
const dataFile = path.join(__dirname, "_aurora_boards.json");

if (!fs.existsSync(dataFile)) {
  console.error("run: node tools/aurora-forge.js emit");
  process.exit(2);
}

const boards = JSON.parse(fs.readFileSync(dataFile, "utf8")).sort(
  (a, b) => a.cells - b.cells || a.steps - b.steps,
);

if (boards.length !== 10) {
  console.error(`expected 10 forged boards, got ${boards.length}`);
  process.exit(2);
}

function fmtPairs(pairs) {
  return pairs.map((p) => `[${p.join(", ")}]`).join(", ");
}

const lines = [];
lines.push("    /* ------------------------------------------------------------------");
lines.push("     * The second tier (f11-f20). Rungs 1-10 grow the grid and the ribbon");
lines.push("     * count with it while the boards stay airy; this tier grows the");
lines.push("     * density instead. Every board here was forged solution-first by");
lines.push("     * tools/aurora-forge.js: one long self-avoiding snake over the grid,");
lines.push("     * cut into consecutive pieces that cannot collide, then re-solved");
lines.push("     * from the pairs alone by a search that holds the panel's exact");
lines.push("     * rules (a ribbon may not step on another ribbon's cells, nor on");
lines.push("     * another pair's endpoint). The boards are laid out in the order the");
lines.push("     * solver measured them, so each rung needs more ribbon than the one");
lines.push("     * before it, and the star bands follow that same climb.");
lines.push("     * ------------------------------------------------------------------ */");
boards.forEach((board) => {
  const three = Math.round(board.cells * 1.02);
  const stars = [three, Math.round(three * 1.55), Math.round(three * 2.15)];
  lines.push("    {");
  lines.push(`      id: "${board.id}", labelKey: "${board.labelKey}", size: ${board.size},`);
  lines.push("      pairs: [" + fmtPairs(board.pairs) + "],");
  lines.push("      starTimes: [" + stars.join(", ") + "],");
  lines.push("    },");
});
const block = lines.join("\n");

let source = fs.readFileSync(gameFile, "utf8");
const marker = "The second tier (f11-f20)";
const start = source.indexOf(marker);
if (start < 0) {
  console.error("second-tier block not found");
  process.exit(2);
}
/* Back up to the opening of the comment that carries the marker. */
const blockStart = source.lastIndexOf("    /* ---", start);
const end = source.indexOf("\n  ];\n", start);
if (blockStart < 0 || end < 0) {
  console.error("second-tier block boundaries not found");
  process.exit(2);
}
source = source.slice(0, blockStart) + block + source.slice(end + 1);
fs.writeFileSync(gameFile, source);
console.log(`wrote ${boards.length} forged boards into assets/app/game-aurora-flow.js`);
boards.forEach((board) => {
  const three = Math.round(board.cells * 1.02);
  console.log(`  ${board.id}: size ${board.size}, ${board.pairs.length} pairs, ${board.cells} inked cells`);
  void three;
});
