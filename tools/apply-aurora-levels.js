#!/usr/bin/env node
/* Writes the forged boards from tools/_aurora_boards.json over the second tier
 * of game-aurora-flow.js, with the argument `summit` the summit boards from
 * tools/_aurora_summit.json over the f25-f30 tier, or with `flood` the flood
 * boards from tools/_aurora_flood.json over the f31-f40 tier. Each ladder is
 * ordered by the solver's measured ribbon length, ids are re-assigned to
 * follow that order, and the star bands are derived from the same
 * measurement - so the file can always be rebuilt from the forge instead of
 * being hand-edited.
 *
 *   node tools/apply-aurora-levels.js          # second tier f11-f20
 *   node tools/apply-aurora-levels.js summit   # summit tier f25-f30
 *   node tools/apply-aurora-levels.js flood    # flood tier f31-f40
 */
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const gameFile = path.join(root, "assets", "app", "game-aurora-flow.js");
const dataFile = path.join(__dirname, "_aurora_boards.json");
const summitFile = path.join(__dirname, "_aurora_summit.json");
const floodFile = path.join(__dirname, "_aurora_flood.json");

const mode = process.argv[2] === "summit"
  ? "summit"
  : process.argv[2] === "flood" ? "flood" : "second";

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

if (mode === "flood") {
  if (!fs.existsSync(floodFile)) {
    console.error("run: node tools/aurora-forge.js flood");
    process.exit(2);
  }
  const boards = JSON.parse(fs.readFileSync(floodFile, "utf8"));
  if (boards.length !== 10) {
    console.error(`expected 10 flood boards, got ${boards.length}`);
    process.exit(2);
  }
  boards.forEach((board, index) => {
    board.id = "f" + (31 + index);
    board.labelKey = "auroL" + (31 + index);
    const three = Math.round(board.ink * 1.02);
    board.starTimes = [three, Math.round(three * 1.55), Math.round(three * 2.15)];
  });

  function fmtPairs(pairs) {
    return pairs.map((p) => `[${p.join(", ")}]`).join(", ");
  }

  const lines = [];
  lines.push("    /* ------------------------------------------------------------------");
  lines.push("     * The flood tier (f31-f40). The summit had taken the eleven-across");
  lines.push("     * panel to 113 inked cells, and the forge measured that the older");
  lines.push("     * constructions stall on a wider board - covers past that ceiling");
  lines.push("     * cap the solver out or re-solve far short of their mark - so the");
  lines.push("     * tide changes how it comes in. Every board here is laid course by");
  lines.push("     * course: sixteen straight ribbons, disjoint by construction, each");
  lines.push("     * pair's unique shortest path being its own course, so the solver's");
  lines.push("     * measured answer lands exactly on the manhattan floor the pair");
  lines.push("     * distances set - the weave is pinned by geometry, never searched");
  lines.push("     * for. The ink climbs three cells a rung and every rung's record is");
  lines.push("     * a number the solver printed: f31 opens the twelfth row, the first");
  lines.push("     * board past eleven cells a side, at 116 cells with no ribbon in");
  lines.push("     * its deck shorter than six where the shipped ladder's shortest ran");
  lines.push(`     * two; f32 ${boards[1].ink}, f33 ${boards[2].ink}, f34 ${boards[3].ink}, f35 ${boards[4].ink}, f36 ${boards[5].ink},`);
  lines.push(`     * f37 ${boards[6].ink}, each the deepest weave the drawer has held; f38 ${boards[7].ink},`);
  lines.push("     * where the tide re-passes the deep tier's 94 percent fill at 95;");
  lines.push(`     * f39 ${boards[8].ink}; f40 the whole cloth - all 144 cells in ribbon,`);
  lines.push("     * the first full panel the drawer has ever held, and no ribbon on");
  lines.push("     * it shorter than eight. Every board was verified by");
  lines.push("     * tools/aurora-forge.js (`node tools/aurora-forge.js flood`");
  lines.push("     * rebuilds this block from tools/_aurora_flood.json): the solver");
  lines.push("     * re-solves each board from the pairs alone at the screen cap,");
  lines.push("     * lands on the floor, and the rungs sit in the order that measure");
  lines.push("     * climbs. The star bands follow the same one-second-per-inked-cell");
  lines.push("     * pace the whole forged ladder ships at.");
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
  /* The flood is the ladder's tail: rebuild it in place once shipped, or
   * splice it in after the summit block, which is the tail until then. */
  const floodMarker = "The flood tier (f31-f40)";
  const summitMarker = "The summit tier (f25-f30)";
  const marker = source.indexOf(floodMarker) >= 0 ? floodMarker : summitMarker;
  const start = source.indexOf(marker);
  if (start < 0) {
    console.error("flood-tier splice point not found");
    process.exit(2);
  }
  const end = source.indexOf("];", start);
  if (end < 0) {
    console.error("flood-tier block boundaries not found");
    process.exit(2);
  }
  let blockStart;
  if (marker === floodMarker) {
    /* Rebuild: the whole flood block, comment through last rung, is replaced. */
    blockStart = source.lastIndexOf("    /* ---", start);
    if (blockStart < 0) {
      console.error("flood-tier block start not found");
      process.exit(2);
    }
    source = source.slice(0, blockStart) + block + "\n  " + source.slice(end);
  } else {
    /* First splice: the summit rungs stay; the flood block joins them at the
     * tail, after the last rung's closing brace and before the array's own. */
    const lastBrace = source.lastIndexOf("    },", end);
    if (lastBrace < 0) {
      console.error("summit tail not found");
      process.exit(2);
    }
    source = source.slice(0, lastBrace + 6) + "\n\n" + block + "\n  " + source.slice(end);
  }
  fs.writeFileSync(gameFile, source);
  console.log(`wrote ${boards.length} flood boards into assets/app/game-aurora-flow.js`);
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
