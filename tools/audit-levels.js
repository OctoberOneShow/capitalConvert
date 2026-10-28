#!/usr/bin/env node
/*
 * Audit: catalog every shipped game and its current campaign level count.
 *
 * For every campaign a game declares (createCampaign({ key, levels })) the
 * level table is resolved to its literal and evaluated, so nested sub-arrays
 * (waves, guests, rungs, knot stages) can never inflate a count, and the
 * number is exactly what the player sees in the campaign picker.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const appDir = path.join(root, "assets", "app");
const pageHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");

const APP_MODULES = Array.from(
  pageHtml.matchAll(/assets\/app\/([a-z0-9-]+)\.js\?v=\d+/g),
).map((match) => match[1]);

const sources = new Map(
  APP_MODULES.map((name) => [
    name,
    fs.readFileSync(path.join(appDir, name + ".js"), "utf8").replace(/^﻿/, ""),
  ]),
);

const partsSource = APP_MODULES.map((name) => sources.get(name)).join("\n");

/* Brace/bracket match that ignores string, template and comment contents. */
function skipString(src, index) {
  const quote = src[index];
  let i = index + 1;
  while (i < src.length) {
    if (src[i] === "\\") {
      i += 2;
      continue;
    }
    if (src[i] === quote) {
      return i + 1;
    }
    if (quote === "`" && src[i] === "$" && src[i + 1] === "{") {
      i = matchBrace(src, i + 1);
      continue;
    }
    i += 1;
  }
  return src.length;
}

function matchBrace(src, openIndex) {
  const closers = { "(": ")", "[": "]", "{": "}" };
  const open = src[openIndex];
  const close = closers[open];
  if (!close) return -1;
  let depth = 0;
  let i = openIndex;
  while (i < src.length) {
    const ch = src[i];
    if (ch === '"' || ch === "'" || ch === "`") {
      i = skipString(src, i);
      continue;
    }
    if (ch === "/" && src[i + 1] === "/") {
      const nl = src.indexOf("\n", i);
      i = nl < 0 ? src.length : nl + 1;
      continue;
    }
    if (ch === "/" && src[i + 1] === "*") {
      const end = src.indexOf("*/", i + 2);
      i = end < 0 ? src.length : end + 2;
      continue;
    }
    if (ch === open) depth += 1;
    else if (ch === close) {
      depth -= 1;
      if (depth === 0) return i + 1;
    }
    i += 1;
  }
  return -1;
}

/* Counts the top-level entries of an array literal by scanning depth, for
 * tables that call a helper inside the literal and so cannot be evaluated. */
function countByScan(literal) {
  const openIndex = literal.indexOf("[");
  if (openIndex < 0) return null;
  const end = matchBrace(literal, openIndex);
  if (end < 0) return null;
  const body = literal.slice(openIndex + 1, end - 1);
  let depth = 0;
  let count = 0;
  let inEntry = false;
  let i = 0;
  while (i < body.length) {
    const ch = body[i];
    if (ch === '"' || ch === "'" || ch === "`") {
      i = skipString(body, i);
      continue;
    }
    if (ch === "/" && body[i + 1] === "/") {
      const nl = body.indexOf("\n", i);
      i = nl < 0 ? body.length : nl + 1;
      continue;
    }
    if (ch === "/" && body[i + 1] === "*") {
      const stop = body.indexOf("*/", i + 2);
      i = stop < 0 ? body.length : stop + 2;
      continue;
    }
    if (ch === "{" || ch === "[" || ch === "(") {
      depth += 1;
      if (depth === 1) inEntry = true;
    } else if (ch === "}" || ch === "]" || ch === ")") {
      depth -= 1;
    } else if (ch === "," && depth === 0 && inEntry) {
      count += 1;
      inEntry = false;
    } else if (depth === 0 && !inEntry && /\S/.test(ch)) {
      inEntry = true;
    }
    i += 1;
  }
  if (inEntry) count += 1;
  return count;
}

/* Resolves `var NAME = <expr>;` anywhere in the app sources. A table that is
 * produced by a builder function is unwrapped to the array it returns. */
function resolveArray(name, fromModule) {
  const order = [fromModule].concat(
    APP_MODULES.filter((m) => m !== fromModule),
  );
  for (const moduleName of order) {
    const src = sources.get(moduleName);
    if (!src) continue;
    const re = new RegExp(
      "(?:^|[\\s;])(?:var|let|const)\\s+" + name + "\\s*=",
      "m",
    );
    const m = re.exec(src);
    if (!m) continue;
    let i = m.index + m[0].length;
    let depth = 0;
    let end = -1;
    while (i < src.length) {
      const ch = src[i];
      if (ch === '"' || ch === "'" || ch === "`") {
        i = skipString(src, i);
        continue;
      }
      if (ch === "/" && src[i + 1] === "/") {
        const nl = src.indexOf("\n", i);
        i = nl < 0 ? src.length : nl + 1;
        continue;
      }
      if (ch === "/" && src[i + 1] === "*") {
        const end = src.indexOf("*/", i + 2);
        i = end < 0 ? src.length : end + 2;
        continue;
      }
      if (ch === "(" || ch === "[" || ch === "{") depth += 1;
      else if (ch === ")" || ch === "]" || ch === "}") depth -= 1;
      else if (ch === ";" && depth === 0) {
        end = i;
        break;
      }
      i += 1;
    }
    if (end < 0) end = src.length;
    const expr = src.slice(m.index + m[0].length, end).trim();
    if (expr.charAt(0) === "[") {
      return { module: moduleName, literal: expr };
    }
    const call = /^([A-Za-z_$][\w$]*)\s*\(/.exec(expr);
    if (call) {
      const fn = new RegExp(
        "function\\s+" + call[1] + "\\s*\\([^)]*\\)\\s*\\{",
      ).exec(src);
      if (fn) {
        const bodyStart = fn.index + fn[0].length;
        const bodyEnd = matchBrace(src, fn.index + fn[0].length - 1);
        const body = src.slice(bodyStart, bodyEnd - 1);
        const ret = /return\s*(\[)/.exec(body);
        if (ret) {
          const openIndex = bodyStart + ret.index + ret[0].length - 1;
          const arrEnd = matchBrace(src, openIndex);
          return { module: moduleName, literal: src.slice(openIndex, arrEnd) };
        }
      }
    }
    return { module: moduleName, literal: expr };
  }
  return null;
}

const EVAL_GLOBALS = {
  Array,
  Object,
  Math,
  JSON,
  String,
  Number,
  Boolean,
  parseInt,
  parseFloat,
  isNaN,
};

function countLiteral(literal) {
  if (literal.charAt(0) === "[") {
    try {
      return vm.runInNewContext("(" + literal + ").length", EVAL_GLOBALS, {
        timeout: 5000,
      });
    } catch (error) {
      /* fall through to the scanner */
    }
  }
  return countByScan(literal);
}

/* ---- Runtime pass --------------------------------------------------------
 * Registry games sometimes build their table with a generator, which static
 * parsing cannot follow. Booting the real app in the stub DOM catches those,
 * so the audit merges both sources by campaign key. */
const runtimeCounts = new Map();
try {
  const { createEnvironment } = require("./stub-dom");
  const env = createEnvironment({});
  env.sandbox.__LEVEL_AUDIT = [];
  env.window.__LEVEL_AUDIT = env.sandbox.__LEVEL_AUDIT;
  const hooked = partsSource.replace(
    "App.fillCampaignPicker = fillCampaignPicker;",
    "App.fillCampaignPicker = fillCampaignPicker;\n" +
      "(function(){var __r=App.createCampaign;App.createCampaign=function(o){var c=__r(o);window.__LEVEL_AUDIT.push({key:o&&o.key,count:c.levels.length});return c;};})();",
  );
  env.load(hooked);
  env.domReady();
  (env.sandbox.__LEVEL_AUDIT || []).forEach((entry) => {
    if (entry && entry.key) runtimeCounts.set(entry.key, entry.count);
  });
} catch (error) {
  console.error("runtime pass skipped: " + error.message);
}

const rows = [];
APP_MODULES.filter((m) => /^game-/.test(m)).forEach((moduleName) => {
  const src = sources.get(moduleName);
  const re = /createCampaign\s*\(/g;
  let m;
  let campaigns = 0;
  let total = 0;
  const keys = [];
  while ((m = re.exec(src))) {
    const braceAt = src.indexOf("{", m.index);
    if (braceAt < 0) continue;
    const end = matchBrace(src, braceAt);
    if (end < 0) continue;
    const opts = src.slice(braceAt, end);
    const keyMatch = /key\s*:\s*"([^"]+)"/.exec(opts);
    const inline = /(?:^|[\s,{])levels\s*:\s*(\[)/.exec(opts);
    let literal = null;
    if (inline) {
      const openIndex = braceAt + inline.index + inline[0].length - 1;
      const arrEnd = matchBrace(src, openIndex);
      literal = src.slice(openIndex, arrEnd);
    } else {
      const named = /(?:^|[\s,{])levels\s*:\s*([A-Za-z_$][\w$]*)/.exec(opts);
      if (named) {
        const found = resolveArray(named[1], moduleName);
        literal = found && found.literal;
      }
    }
    const key = keyMatch ? keyMatch[1] : "?";
    let count = literal ? countLiteral(literal) : null;
    if (count === null || count === 0) {
      const fromRuntime = runtimeCounts.get(key);
      if (fromRuntime) count = fromRuntime;
    }
    if (count === null || (count === 0 && !literal)) {
      keys.push(key + "(unparsed)");
      continue;
    }
    campaigns += 1;
    total += count;
    keys.push((keyMatch ? keyMatch[1] : "?") + "(" + count + ")");
  }
  rows.push({ module: moduleName, campaigns, total, keys: keys.join(", ") });
});

rows.sort((a, b) => a.total - b.total || a.module.localeCompare(b.module));

console.log("levels  module                             campaigns  campaigns/keys");
rows.forEach((r) => {
  console.log(
    String(r.total).padStart(6) +
      "  " +
      r.module.padEnd(34) +
      String(r.campaigns).padStart(10) +
      "  " +
      r.keys,
  );
});

console.log("\ngame modules: " + rows.length);
console.log("with campaigns: " + rows.filter((r) => r.campaigns > 0).length);

/* ---- Markdown catalog ----------------------------------------------------
 * `node tools/audit-levels.js --md` prints the table LEVEL_AUDIT.md carries,
 * so the catalog can never drift from the code it describes. */
if (process.argv.includes("--md")) {
  const NAME_OVERRIDES = {
    "inkball-campaign": "Inkball",
    "serpent-campaign": "Serpent",
    "ember-campaign": "Ember Dice",
    "nim-campaign": "Ember Sticks",
    "dots-campaign": "Glyph Dots",
    "republic-quiz-campaign": "Republic Rewind",
    "love-deepspace-campaign": "Love and Deepspace",
    "prism-path-campaign": "Prism Path",
    "traffic-campaign": "Traffic Jam",
    "glyph-fifteen-campaign": "Glyph Fifteen",
    "glyph-four-campaign": "Glyph Four",
    "archive-escape-campaign": "Archive Escape",
    "item-quest-campaign": "Item Quest",
  };
  const title = (key) =>
    key
      .replace(/-campaign$/, "")
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  console.log("\n| Levels | Game | Module | Campaign key |");
  console.log("| ---: | --- | --- | --- |");
  rows
    .filter((r) => r.campaigns > 0)
    .sort((a, b) => a.total - b.total || a.module.localeCompare(b.module))
    .forEach((r) => {
      const key = (r.keys.match(/^([^(]+)\(/) || [])[1] || "?";
      if (key === "?") return; /* a mention in a comment, not a real campaign */
      const name = NAME_OVERRIDES[key] || title(key);
      console.log(`| ${r.total} | ${name} | \`${r.module}.js\` | \`${key}\` |`);
    });
  console.log("\nNo campaign ladder: " + rows.filter((r) => !r.campaigns).length + " modules");
}
