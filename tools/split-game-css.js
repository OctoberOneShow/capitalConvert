#!/usr/bin/env node
/*
 * Per-game stylesheet splitter.
 *
 * games.css grew as one file, so every hand-wired game's skin is tangled in it
 * and two workers cannot restyle two different games at the same time. This
 * moves each game's own rules into tools/tmp-css/<module>.css - already the
 * linker's input for registry games - and leaves games.css holding the drawer
 * shell plus rules more than one game shares.
 *
 * The move is offset-exact: each rule travels with the comment lines above it,
 * byte for byte, and games.css is rebuilt by deleting ranges rather than by
 * re-printing rules, so no hand-written comment can be lost.
 *
 * Ownership comes from the markup, not from guessed prefixes: a class belongs
 * to a game when only that game's panel subtree (index.html) or module source
 * (registry games) mentions it.
 *
 *   node tools/split-game-css.js --dry     report the split, write nothing
 *   node tools/split-game-css.js           rewrite games.css and emit sheets
 *   node tools/split-game-css.js --audit   report only games whose rules stay
 */
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const GAMES_CSS = path.join(root, "assets", "styles", "games.css");
const CSS_DIR = path.join(root, "tools", "tmp-css");
const APP_DIR = path.join(root, "assets", "app");
const PAGE = path.join(root, "index.html");

const dry = process.argv.includes("--dry");
const audit = process.argv.includes("--audit");

/* ---------- tokenize with offsets ---------- */

function tokenize(src) {
  const units = [];
  const stack = [];
  let i = 0;
  let selStart = 0;
  const n = src.length;
  while (i < n) {
    const ch = src[i];
    if (ch === "/" && src[i + 1] === "*") {
      const end = src.indexOf("*/", i + 2);
      i = end + 2;
      continue;
    }
    if (ch === "{") {
      const head = src.slice(selStart, i).trim();
      if (/^@(media|supports|container|layer)/.test(head)) {
        stack.push({ head, start: findLineStart(src, selStart) });
        i += 1;
        selStart = i;
        continue;
      }
      /* a rule or an at-rule block: read to its matching close brace */
      let depth = 1;
      let j = i + 1;
      while (j < n && depth > 0) {
        if (src[j] === "{") depth += 1;
        else if (src[j] === "}") depth -= 1;
        j += 1;
      }
      const start = findLineStart(src, selStart);
      units.push({
        head: head.replace(/\s+/g, " "),
        context: stack.map((s) => s.head),
        start,
        end: j,
      });
      i = j;
      selStart = j;
      continue;
    }
    if (ch === "}") {
      const open = stack.pop();
      if (open) open.end = i + 1;
      i += 1;
      selStart = i;
      continue;
    }
    i += 1;
  }
  return units;
}

function findLineStart(src, pos) {
  let k = pos;
  while (k > 0 && src[k] !== "\n") k -= 1;
  return k + 1;
}

/* A unit's real start includes the comment lines glued above it, but never past
 * a blank-line gap that separates it from the previous rule, and never into the
 * file's opening banner. */
function absorbComments(src, start, floor) {
  let k = start;
  for (;;) {
    if (k <= floor) {
      return Math.max(k, floor);
    }
    const before = src.slice(0, k).replace(/[ \t\r\n]+$/, "");
    if (!before.endsWith("*/")) break;
    const open = before.lastIndexOf("/*");
    if (open < 0 || open < floor) break;
    const gap = src.slice(before.length, k);
    if (gap.includes("\n\n")) break;
    k = findLineStart(src, open);
  }
  return k;
}

function classesOf(head) {
  const out = new Set();
  const re = /\.([A-Za-z_][A-Za-z0-9_-]*)/g;
  let m;
  while ((m = re.exec(head))) out.add(m[1]);
  return [...out];
}

/* ---------- ownership ---------- */

function panelSubtrees(html) {
  const out = [];
  const re = /<div class="game-panel[^"]*" id="([A-Za-z0-9]+)"/g;
  let m;
  while ((m = re.exec(html))) {
    let depth = 0;
    const tag = /<\/?div\b/g;
    tag.lastIndex = m.index;
    let t;
    let end = html.length;
    while ((t = tag.exec(html))) {
      if (t[0] === "<div") depth += 1;
      else depth -= 1;
      if (depth === 0) { end = tag.lastIndex; break; }
    }
    out.push({ id: m[1], text: html.slice(m.index, end) });
  }
  return out;
}

/* Panels whose game carries a different name than the panel id suffix. */
const PANEL_OVERRIDES = {
  Nim: "game-ember-sticks",
  Kalah: "game-kalah-row",
  Garden: "game-roof-garden",
  Republic: "game-republic-quiz",
  Dots: "game-glyph-dots",
};

function moduleForPanelSuffix(suffix) {
  if (PANEL_OVERRIDES[suffix]) return PANEL_OVERRIDES[suffix];
  const kebab = suffix.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
  const name = "game-" + kebab;
  return fs.existsSync(path.join(APP_DIR, name + ".js")) ? name : null;
}

function buildOwnership() {
  const html = fs.readFileSync(PAGE, "utf8");
  const owner = new Map();
  const add = (cls, mod) => {
    if (!owner.has(cls)) owner.set(cls, new Set());
    owner.get(cls).add(mod);
  };

  for (const p of panelSubtrees(html)) {
    const suffix = p.id.replace(/^gamePanel/, "");
    const mod = moduleForPanelSuffix(suffix);
    if (!mod) {
      console.log("UNMAPPED PANEL: " + p.id);
      continue;
    }
    const re = /class="([^"]+)"/g;
    let m;
    while ((m = re.exec(p.text))) {
      for (const c of m[1].split(/\s+/)) if (c) add(c, mod);
    }
  }

  for (const f of fs.readdirSync(APP_DIR).filter((x) => x.startsWith("game-") && x.endsWith(".js"))) {
    const src = fs.readFileSync(path.join(APP_DIR, f), "utf8");
    const mod = f.replace(/\.js$/, "");
    const re = /["'`]([^"'`\n]{1,160})["'`]/g;
    let m;
    while ((m = re.exec(src))) {
      for (const tok of m[1].split(/[\s,]+/)) {
        if (/^[a-z][a-z0-9]*(?:-[a-z0-9]+){1,6}$/.test(tok)) add(tok, mod);
      }
    }
  }
  return owner;
}

const SHELL = /^(game-panel|game-tab|game-dialog|game-modal|game-stat|game-hint|game-note|game-result|game-tools|game-head|game-board|game-canvas|game-screen|game-stage|guide-|game-guide)/;

/* ---------- main ---------- */

function main() {
  const owner = buildOwnership();
  const src = fs.readFileSync(GAMES_CSS, "utf8").replace(/\r\n/g, "\n");
  /* Nothing may absorb past the file's own header line. */
  const bannerFloor = src.startsWith("/*") ? src.indexOf("\n") + 1 : 0;
  const units = tokenize(src);

  const byGame = new Map();
  const keep = [];
  let ambiguous = 0;
  let keyframes = 0;

  /* A sheet that already exists is authoritative - the linker generated its
   * games.css block from it, and rebuilding it here could only ever lose the
   * rules whose selectors this map cannot resolve back to the game. */
  const hasSheet = (g) => fs.existsSync(path.join(CSS_DIR, g + ".css"));

  for (const u of units) {
    if (/^@keyframes/.test(u.head)) keyframes += 1;
    /* A rule inside @media travels with its wrapper, and a wrapper may mix games,
     * so nested rules always stay in games.css. */
    if (u.context.length) { keep.push(u); continue; }
    const cls = classesOf(u.head);
    if (!cls.length) { keep.push(u); continue; }
    const games = new Set();
    for (const c of cls) {
      const o = owner.get(c);
      if (o && o.size === 1) games.add([...o][0]);
    }
    const shell = cls.some((c) => SHELL.test(c));
    if (games.size === 1 && !shell && !hasSheet([...games][0])) {
      const g = [...games][0];
      if (!byGame.has(g)) byGame.set(g, []);
      byGame.get(g).push(u);
    } else {
      if (games.size > 1) ambiguous += 1;
      keep.push(u);
    }
  }

  const stats = [...byGame.entries()].map(([g, us]) => ({ g, n: us.length })).sort((a, b) => b.n - a.n);
  console.log("css units          : " + units.length + "  (keyframes: " + keyframes + ")");
  console.log("stay in games.css  : " + keep.length);
  console.log("cross-game rules   : " + ambiguous);
  console.log("games collected    : " + byGame.size);
  if (!audit) console.log(stats.map((s) => "  " + s.g.padEnd(32) + s.n).join("\n"));
  if (audit) {
    const noSheet = stats.filter((s) => !fs.existsSync(path.join(CSS_DIR, s.g + ".css")));
    console.log("games with rules but no sheet: " + noSheet.length);
    console.log(noSheet.slice(0, 60).map((s) => "  " + s.g + " (" + s.n + ")").join("\n"));
  }
  if (dry || audit) return;

  /* emit sheets, then rebuild games.css by deleting the moved ranges */
  for (const [g, us] of byGame) {
    const file = path.join(CSS_DIR, g + ".css");
    const prev = fs.existsSync(file) ? fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n") : "";
    const src0 = fs.existsSync(path.join(APP_DIR, g + ".js"))
      ? fs.readFileSync(path.join(APP_DIR, g + ".js"), "utf8")
      : "";
    const isRegistry = src0.includes("App.registerGame(");
    const own = prev.match(/^\/\* [a-z0-9-]+ \((?:registry|drawer) game\) \*\//);
    const banner = own ? own[0] : "/* " + g + " (" + (isRegistry ? "registry" : "drawer") + " game) */";
    const body = us
      .map((u) => src.slice(absorbComments(src, u.start, bannerFloor), u.end))
      .join("\n\n")
      .replace(/^\s*\/\*[^\n]*\((?:registry|drawer) game\)[^\n]*\n/, "");
    fs.writeFileSync(file, banner + "\n" + body + "\n");
  }

  const ranges = [];
  for (const [, us] of byGame) for (const u of us) ranges.push([absorbComments(src, u.start, bannerFloor), u.end]);
  ranges.sort((a, b) => a[0] - b[0]);
  let moved = 0;
  let prevEnd = 0;
  for (const [s, e] of ranges) {
    if (s < prevEnd) {
      console.error("ABORT: comment absorption overlapped a neighbouring rule at " + s);
      process.exit(1);
    }
    prevEnd = e;
    moved += e - s;
  }
  let out = "";
  let at = 0;
  for (const [s, e] of ranges) {
    out += src.slice(at, s).replace(/\/\*[^\n]*\((?:registry|drawer) game\) \*\/\n+$/, "");
    at = e;
  }
  out += src.slice(at);
  out = out.replace(/\n{4,}/g, "\n\n\n").replace(/[ \t]+\n/g, "\n");
  const accounted = out.replace(/\n{4,}/g, "\n\n\n").replace(/[ \t]+\n/g, "\n").length + moved;
  if (Math.abs(accounted - src.length) > src.length * 0.02) {
    console.error("ABORT: byte accounting is off - kept " + out.length + " + moved " + moved + " vs original " + src.length);
    process.exit(1);
  }
  /* An unbalanced stylesheet is worse than a messy one: the browser drops every
   * rule after the break without a word of complaint. */
  let depth = 0;
  let skip = false;
  for (let i = 0; i < out.length; i += 1) {
    const two = out.slice(i, i + 2);
    if (skip) {
      if (two === "*/") { skip = false; i += 1; }
      continue;
    }
    if (two === "/*") { skip = true; i += 1; continue; }
    if (out[i] === "{") depth += 1;
    else if (out[i] === "}") {
      depth -= 1;
      if (depth < 0) {
        console.error("ABORT: unbalanced brace at kept-text offset " + i);
        process.exit(1);
      }
    }
  }
  if (depth !== 0) {
    console.error("ABORT: rebuilt games.css would end " + depth + " brace(s) open");
    process.exit(1);
  }
  fs.writeFileSync(GAMES_CSS, out.replace(/\n/g, "\r\n"));
  console.log("written: games.css " + keep.length + " units, " + byGame.size + " sheets, moved " + moved + " bytes");
}

main();
