#!/usr/bin/env node
/*
 * i18n key audit for assets/app.js.
 *
 * Extracts the `en:` and `zh:` key sets from the I18N dictionary, asserts they
 * are 1:1, and (when a baseline file is given) asserts no previously-existing
 * key was removed.
 *
 * Usage:
 *   node tools/i18n-keys.js                     # report counts + 1:1 check
 *   node tools/i18n-keys.js --baseline <file>   # also compare against baseline
 *   node tools/i18n-keys.js --write-baseline <file>
 */
"use strict";

const fs = require("fs");
const path = require("path");

const APP_JS = path.join(__dirname, "..", "assets", "app.js");

function extractDicts(source) {
  const start = source.indexOf("var I18N = {");
  const end = source.indexOf("\n  var currentLang");
  if (start === -1 || end === -1) {
    throw new Error("could not locate the I18N dictionary region");
  }
  const region = source.slice(start, end);
  const enStart = region.indexOf("en: {");
  const zhStart = region.indexOf("zh: {");
  if (enStart === -1 || zhStart === -1) {
    throw new Error("could not locate en:/zh: sub-dictionaries");
  }
  const keyRe = /^\s{6}"((?:[^"\\]|\\.)*)"\s*:/gm;
  const read = (body) => {
    const out = [];
    let m;
    keyRe.lastIndex = 0;
    while ((m = keyRe.exec(body)) !== null) {
      out.push(m[1]);
    }
    return out;
  };
  return {
    en: read(region.slice(enStart, zhStart)),
    zh: read(region.slice(zhStart)),
  };
}

function main() {
  const argv = process.argv.slice(2);
  const baselineIdx = argv.indexOf("--baseline");
  const writeIdx = argv.indexOf("--write-baseline");
  const source = fs.readFileSync(APP_JS, "utf8");
  const { en, zh } = extractDicts(source);

  const enSet = new Set(en);
  const zhSet = new Set(zh);
  const onlyEn = en.filter((k) => !zhSet.has(k));
  const onlyZh = zh.filter((k) => !enSet.has(k));

  let failures = 0;

  if (writeIdx !== -1) {
    const target = argv[writeIdx + 1];
    fs.writeFileSync(target, JSON.stringify(en.slice().sort(), null, 2));
    console.log(`baseline written: ${target} (${en.length} keys)`);
  }

  console.log(`en keys: ${en.length}`);
  console.log(`zh keys: ${zh.length}`);
  console.log(`duplicate en keys: ${en.length - enSet.size}`);
  console.log(`duplicate zh keys: ${zh.length - zhSet.size}`);

  if (onlyEn.length || onlyZh.length) {
    failures += 1;
    console.error(`FAIL en/zh key sets differ`);
    if (onlyEn.length) console.error(`  only in en: ${onlyEn.join(", ")}`);
    if (onlyZh.length) console.error(`  only in zh: ${onlyZh.join(", ")}`);
  } else {
    console.log("PASS en/zh key sets are identical (1:1)");
  }

  if (baselineIdx !== -1) {
    const baselinePath = argv[baselineIdx + 1];
    const before = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
    const beforeSet = new Set(before);
    const removed = before.filter((k) => !enSet.has(k));
    const added = en.filter((k) => !beforeSet.has(k));
    console.log(
      `before: ${before.length} keys | after: ${en.length} keys | added: ${added.length} | removed: ${removed.length}`,
    );
    if (added.length) console.log(`  added keys: ${added.join(", ")}`);
    if (removed.length) {
      failures += 1;
      console.error(`FAIL previously-existing keys were removed: ${removed.join(", ")}`);
    } else {
      console.log("PASS no previously-existing key was removed");
    }
  }

  process.exit(failures ? 1 : 0);
}

main();
