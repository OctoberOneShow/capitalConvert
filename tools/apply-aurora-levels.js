#!/usr/bin/env node
/* Writes the forged boards from tools/_aurora_boards.json over the second tier
 * of game-aurora-flow.js, or - with the argument `summit` - the summit boards
 * from tools/_aurora_summit.json over the f25-f30 tier. Each ladder is ordered
 * by the solver's measured ribbon length, ids are re-assigned to follow that
 * order, and the star bands are derived from the same measurement - so the
 * file can always be rebuilt from the forge instead of being hand-edited.
 *
 *   node tools/apply-aurora-levels.js          # second tier f11-f20
 *   node tools/apply-aurora-levels.js summit   # summit tier f25-f30
 */
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const gameFile = path.join(root, "assets", "app", "game-aurora-flow.js");
const dataFile = path.join(__dirname, "_aurora_boards.json");
const summitFile = path.join(__dirname, "_aurora_summit.json");

const mode = process.argv[2] === "summit" ? "summit" : "second";

if (mode === "summit") {
  if (!fs.existsSync(summitFile)) {
    console.error("run: node tools/aurora-forge.js summit");
    process.exit(2);
  }
  const boards = JSON.parse(fs.readFileSync(summitFile, "utf8")).sort(
    (a, b) => a.ink - b.ink || a.steps - b.steps,
  );
  if (boards.length !== 6) {
    console.error(`expected 6 summit boards, got ${boards.length}`);
    process.exit(2);
  }
  boards.forEach((board, index) => {
    board.id = "f" + (25 + index);
    board.labelKey = "auroL" + (25 + index);
    const three = Math.round(board.ink * 1.02);
    board.starTimes = [three, Math.round(three * 1.55), Math.round(three * 2.15)];
  });

  function fmtPairs(pairs) {
    return pairs.map((p) => `[${p.join(", ")}]`).join(", ");
  }

  const fills = boards.map((b) => ((b.ink / (b.size * b.size)) * 100).toFixed(0));
  const lines = [];
  lines.push("    /* ------------------------------------------------------------------");
  lines.push("     * The summit tier (f25-f30). The deep tier had taken the ten-across");
  lines.push("     * panel as far as density would go - the forge measured that no");
  lines.push("     * shipped-size board re-solves above its 94 inked cells - so this tier");
  lines.push("     * opens the grid to 11x11, a size no earlier rung used, and keeps the");
  lines.push(`     * sixteen-ribbon cap: the same ribbons now weave a bigger panel, so`);
  lines.push(`     * every ribbon runs longer and the solver's own answer climbs`);
  lines.push(`     * ${boards[0].ink} up to ${boards[5].ink} inked cells (${fills[0]}% up to ${fills[5]}% of the`);
  lines.push("     * panel) against the deep tier's ceiling of 94. Every board was forged");
  lines.push("     * solution-first by tools/aurora-forge.js (`node");
  lines.push("     * tools/aurora-forge.js summit` rebuilds this block from");
  lines.push("     * tools/_aurora_summit.json) and re-solved from the pairs alone; a");
  lines.push("     * candidate only ships when that solver proves it at the screen cap,");
  lines.push("     * because a board the solver cannot prove in half a million steps is");
  lines.push("     * too slow a neighbour for every future gate run. The rungs sit in the");
  lines.push("     * order that re-solve measured - no rung needs less ribbon than the");
  lines.push("     * one before it - and the star bands follow the same");
  lines.push("     * one-second-per-inked-cell pace the whole forged ladder ships at.");
  lines.push("     * ------------------------------------------------------------------ */");
  boards.forEach((board) => {
    lines.push("    {");
    lines.push(`      id: "${board.id}", labelKey: "${board.labelKey}", size: ${board.size},`);
    lines.push("      pairs: [" + fmtPairs(board.pairs) + "],");
    lines.push("      starTimes: [" + board.starTimes.join(", ") + "],");
    lines.push("    },");
  });
  const block = lines.join("\n");

  let source = fs.readFileSync(gameFile, "utf8");
  const marker = "The summit tier (f25-f30)";
  const start = source.indexOf(marker);
  if (start < 0) {
    console.error("summit-tier block not found");
    process.exit(2);
  }
  /* Back up to the opening of the comment that carries the marker, and run
   * to the close of the level array - the summit is the ladder's tail. */
  const blockStart = source.lastIndexOf("    /* ---", start);
  const end = source.indexOf("\n  ];\n", start);
  if (blockStart < 0 || end < 0) {
    console.error("summit-tier block boundaries not found");
    process.exit(2);
  }
  source = source.slice(0, blockStart) + block + source.slice(end + 1);
  fs.writeFileSync(gameFile, source);
  console.log(`wrote ${boards.length} summit boards into assets/app/game-aurora-flow.js`);
  boards.forEach((board) => {
    console.log(`  ${board.id}: size ${board.size}, ${board.pairs.length} pairs, ${board.ink} inked cells`);
  });
  process.exit(0);
}

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
/* Back up to the opening of the comment that carries the marker. The block
 * ends where the deep tier's own comment opens - the tiers that shipped
 * after this one live below it and must never be clobbered by a rebuild. */
const blockStart = source.lastIndexOf("    /* ---", start);
const deepMarker = source.indexOf("The deep tier (f21-f24)", start);
const end = deepMarker < 0
  ? source.indexOf("\n  ];\n", start)
  : source.lastIndexOf("    /* ---", deepMarker);
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
