#!/usr/bin/env node
/*
 * Headless harness for the pet companion and the shared games in assets/app/.
 * Loads the REAL app modules inside a hand-written stub DOM/localStorage and
 * drives the injected markup through its real event listeners.
 *
 * Usage: node tools/pet-harness.js
 */
"use strict";

const lib = require("./harness/lib");
require("./harness/cases-pet");
require("./harness/cases-progression");
require("./harness/cases-glyph");
require("./harness/cases-elements-sim");
require("./harness/cases-elements-ui");

/* report ---------------------------------------------------------------- */
console.log("pet companion harness");
console.log("=====================");
console.log("\nper-case results:");
lib.caseResults.forEach((result) => {
  const status = result.failed === 0 ? "PASS" : "FAIL";
  console.log(
    `  ${status}  ${result.name}  (${result.checks} checks, ${result.failed} failed)`,
  );
});
console.log(`\nchecks passed: ${lib.passCount}`);
console.log(`checks failed: ${lib.failures.length}`);
if (lib.failures.length) {
  console.log("\nFAILURES:");
  lib.failures.forEach((line) => console.log("  - " + line));
}
if (lib.notes.length) {
  console.log("\nNOTES:");
  lib.notes.forEach((line) => console.log("  - " + line));
}
process.exit(lib.failures.length ? 1 : 0);
