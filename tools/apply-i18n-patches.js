#!/usr/bin/env node
"use strict";

/* Merge tmp/wave/patches/<slug>.json key patches into assets/app/i18n.js.
 *
 * Each patch file maps "key" -> { en, zh }. Keys are appended at the end of
 * the en block and the end of the zh block, so the dictionaries stay 1:1 and
 * no hand-editing of the shared file is needed while parallel agents work.
 *
 *   node tools/apply-i18n-patches.js [--dry-run]
 */

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const target = path.join(root, "assets", "app", "i18n.js");
const patchesDir = path.join(root, "tmp", "wave", "patches");
const dryRun = process.argv.includes("--dry-run");

const source = fs.readFileSync(target, "utf8").replace(/^\uFEFF/, "");
/* i18n.js may ship LF or CRLF; match whatever the file uses so the merge
 * never mixes line endings. */
const eol = source.includes("\r\n") ? "\r\n" : "\n";
const enAnchor = "    }," + eol + "    zh: {";
const zhAnchor = "    }," + eol + "  };";
const enAt = source.indexOf(enAnchor);
const zhAt = source.lastIndexOf(zhAnchor);
if (enAt < 0 || zhAt < 0 || zhAt < enAt) {
  console.error("i18n.js block anchors not found (en@" + enAt + ", zh@" + zhAt + ")");
  process.exit(1);
}

const patchFiles = fs.existsSync(patchesDir)
  ? fs.readdirSync(patchesDir).filter((f) => f.endsWith(".json")).sort()
  : [];
if (!patchFiles.length) {
  console.log("no patch files under tmp/wave/patches — nothing to merge");
  return;
}

const enLines = [];
const zhLines = [];
const duplicates = [];
let keyCount = 0;

patchFiles.forEach((file) => {
  const data = JSON.parse(fs.readFileSync(path.join(patchesDir, file), "utf8"));
  Object.keys(data).forEach((key) => {
    const pair = data[key];
    if (!pair || typeof pair.en !== "string" || typeof pair.zh !== "string") {
      console.error(file + " :: " + key + " needs both en and zh strings");
      process.exit(1);
    }
    if (source.indexOf('"' + key + '"') >= 0) {
      duplicates.push(key);
    }
    enLines.push("      " + JSON.stringify(key) + ": " + JSON.stringify(pair.en) + ",");
    zhLines.push("      " + JSON.stringify(key) + ": " + JSON.stringify(pair.zh) + ",");
    keyCount += 1;
  });
});

if (duplicates.length) {
  console.error("keys already present in i18n.js: " + duplicates.join(", "));
  process.exit(1);
}

/* Insert at the later anchor first so the earlier offset stays valid:
 * the zh splice sits past enAt, so enAt is still correct afterwards. */
const zhBlock = zhLines.join(eol) + eol;
const enBlock = enLines.join(eol) + eol;
let out = source.slice(0, zhAt) + zhBlock + source.slice(zhAt);
out = out.slice(0, enAt) + enBlock + out.slice(enAt);

console.log("patches: " + patchFiles.length + " file(s), " + keyCount + " key(s)");
console.log("en +" + enLines.length + ", zh +" + zhLines.length);
if (dryRun) {
  console.log("dry run — no file written");
  return;
}
fs.writeFileSync(target, out);
console.log("merged into " + path.relative(root, target));
