#!/usr/bin/env node
/*
 * Registry game linker. Idempotent, and the only sanctioned way to wire a
 * registry game into the pages:
 *
 *   1. make sure the drawer loads assets/app/game-registry.js
 *   2. make sure every module that calls App.registerGame( is loaded on all
 *      four pages, before game-guide.js so the guides can see the panels
 *   3. merge the scratch stylesheets under tools/tmp-css into games.css
 *
 * Usage: node tools/link-registry-games.js
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.join(__dirname, "..");
const PAGES = [
  "index.html",
  "english_filter.html",
  "chinese_punctuation.html",
  "words_replacing.html",
];
const VERSION = 61;
const APP_DIR = path.join(root, "assets", "app");
const CSS_DIR = path.join(root, "tools", "tmp-css");
const GAMES_CSS = path.join(root, "assets", "styles", "games.css");
const REGISTRY = "game-registry";
const GUIDE = "game-guide";

function parsesClean(file) {
  try {
    execFileSync(process.execPath, ["--check", file], { stdio: "ignore" });
    return true;
  } catch (error) {
    return false;
  }
}

function listRegistryModules() {
  const skipped = [];
  const linked = fs
    .readdirSync(APP_DIR)
    .filter((name) => name.endsWith(".js") && name !== REGISTRY + ".js")
    .filter((name) =>
      fs.readFileSync(path.join(APP_DIR, name), "utf8").includes("App.registerGame("),
    )
    .map((name) => name.replace(/\.js$/, ""))
    .filter((name) => {
      /* A module still being written by another worker can half-save, and since
       * every game shares one boot chain a single parse error would take the
       * whole drawer and the pet down with it. Only ship what parses. */
      if (parsesClean(path.join(APP_DIR, name + ".js"))) {
        return true;
      }
      skipped.push(name);
      return false;
    })
    .sort();
  if (skipped.length) {
    console.log(`skipped (does not parse yet): ${skipped.join(", ")}`);
  }
  return linked;
}

function tagFor(name) {
  return `assets/app/${name}.js?v=${VERSION}`;
}

/* The pages are stored with CRLF endings, so every insert has to keep whatever
 * the file already uses instead of flattening the whole document to LF. */
function eolOf(text) {
  return text.indexOf("\r\n") !== -1 ? "\r\n" : "\n";
}

function scriptLine(name) {
  return `    <script src="${tagFor(name)}"></script>`;
}

/* A previous build spliced an array as a single element, which join() then
 * stringified into one line of comma-separated script tags. Split any such line
 * back into one tag per line so the pages heal instead of staying corrupt. */
function repairTagLines(lines) {
  const out = [];
  let repaired = 0;
  lines.forEach((line) => {
    if (!/<\/script>,/.test(line)) {
      out.push(line);
      return;
    }
    line
      .split(/,\s*(?=<script)/)
      .map((piece) => piece.trim().replace(/,+$/, ""))
      .forEach((piece) => {
        if (/^<script /.test(piece)) out.push(`    ${piece}`);
        else out.push(piece);
        repaired += 1;
      });
  });
  return { lines: out, repaired };
}

function linkPage(page, modules) {
  const file = path.join(root, page);
  const html = fs.readFileSync(file, "utf8");
  const eol = eolOf(html);
  let lines = html.split(/\r?\n/);
  const changed = [];

  const healed = repairTagLines(lines);
  if (healed.repaired) {
    lines = healed.lines;
    console.log(`${page}: repaired ${healed.repaired} joined script lines`);
  }

  const hasTag = (name) => lines.some((line) => line.includes(tagFor(name)));

  if (!hasTag(REGISTRY)) {
    const anchor = lines.findIndex((line) => line.includes(tagFor("game-campaign")));
    if (anchor === -1) {
      throw new Error(`${page}: no game-campaign.js tag to anchor the registry`);
    }
    lines.splice(anchor + 1, 0, scriptLine(REGISTRY));
    changed.push(REGISTRY);
  }

  const missing = modules.filter((name) => !hasTag(name));
  if (missing.length) {
    const anchor = lines.findIndex((line) => line.includes(tagFor(GUIDE)));
    if (anchor === -1) {
      throw new Error(`${page}: no ${GUIDE}.js tag to anchor the registry games`);
    }
    lines.splice(anchor, 0, ...missing.map(scriptLine));
    changed.push(...missing);
  }

  if (changed.length || healed.repaired) {
    fs.writeFileSync(file, lines.join(eol), "utf8");
  }
  return changed;
}

function mergeCss() {
  if (!fs.existsSync(CSS_DIR)) {
    return [];
  }
  const sheets = fs
    .readdirSync(CSS_DIR)
    .filter((name) => name.endsWith(".css"))
    .sort();
  if (!sheets.length) {
    return [];
  }
  const original = fs.readFileSync(GAMES_CSS, "utf8");
  const eol = eolOf(original);
  let css = original;
  const merged = [];
  const refreshed = [];

  sheets.forEach((name) => {
    const banner = `/* ${name.replace(/\.css$/, "")} (registry game) */`;
    const body = fs
      .readFileSync(path.join(CSS_DIR, name), "utf8")
      .trim()
      /* A sheet may still carry its own banner line from authoring; the merged
       * block adds the header, so the sheet's copy is dropped here. */
      .replace(/^\/\*[^*]*\(registry game\) \*\/\r?\n/, "")
      .replace(/\r\n/g, "\n")
      .split("\n")
      .join(eol);
    if (!body) {
      return;
    }
    const at = css.indexOf(banner);
    if (at === -1) {
      css = css + eol + banner + eol + body + eol;
      merged.push(name);
      return;
    }
    /* The block runs to the next sheet with a different name, so a run that
     * finds the banner doubled - or the whole block repeated by an earlier
     * merge - heals the region in one shot instead of growing it again. */
    const tail = css.slice(at + banner.length);
    const headerPattern = /\/\* ([a-z0-9-]+) \(registry game\) \*\//g;
    let end = css.length;
    let header;
    while ((header = headerPattern.exec(tail))) {
      if (header[1] !== name.replace(/\.css$/, "")) {
        end = at + banner.length + header.index;
        break;
      }
    }
    const block = css.slice(at, end);
    const rebuilt = banner + eol + body + eol + eol;
    if (block !== rebuilt && block.replace(/\s+$/, "") !== rebuilt.replace(/\s+$/, "")) {
      css = css.slice(0, at) + rebuilt + css.slice(end);
      refreshed.push(name);
    }
  });

  if (merged.length || refreshed.length) {
    fs.writeFileSync(GAMES_CSS, css, "utf8");
  }
  if (refreshed.length) {
    console.log(`games.css: refreshed ${refreshed.join(", ")}`);
  }
  return merged;
}

function unlinkModule(slug) {
  if (slug === REGISTRY) {
    console.error(`refusing to unlink ${REGISTRY}: the drawer needs its registry`);
    process.exit(2);
  }
  if (!fs.existsSync(path.join(APP_DIR, slug + ".js"))) {
    console.error(`unknown module: ${slug}`);
    process.exit(2);
  }
  PAGES.forEach((page) => {
    const file = path.join(root, page);
    const html = fs.readFileSync(file, "utf8");
    const eol = eolOf(html);
    const kept = html
      .split(/\r?\n/)
      .filter((line) => !line.includes(tagFor(slug)));
    if (kept.length !== html.split(/\r?\n/).length) {
      fs.writeFileSync(file, kept.join(eol), "utf8");
    }
    console.log(`${page}: unlinked ${slug}`);
  });
}

function main() {
  const argv = process.argv.slice(2);
  const unlinkAt = argv.indexOf("--unlink");
  if (unlinkAt !== -1) {
    const slug = argv[unlinkAt + 1];
    if (!slug) {
      console.error("usage: node tools/link-registry-games.js --unlink <module-slug>");
      process.exit(2);
    }
    unlinkModule(slug);
    return;
  }

  /* --only links the named modules and leaves everything else as it stands, so
   * a game held back from the pages cannot be swept back in by accident. */
  const onlyAt = argv.indexOf("--only");
  const modules =
    onlyAt !== -1
      ? argv.slice(onlyAt + 1).filter((name) => {
          if (!fs.existsSync(path.join(APP_DIR, name + ".js"))) {
            console.error(`unknown module: ${name}`);
            return false;
          }
          return true;
        })
      : listRegistryModules();
  let added = 0;
  PAGES.forEach((page) => {
    const changed = linkPage(page, modules);
    if (changed.length) {
      added += changed.length;
      console.log(`${page}: linked ${changed.join(", ")}`);
    } else {
      console.log(`${page}: already linked`);
    }
  });
  const merged = mergeCss();
  if (merged.length) {
    console.log(`games.css: merged ${merged.join(", ")}`);
  } else {
    console.log("games.css: nothing new to merge");
  }
  console.log(`registry modules on disk: ${modules.length} (${modules.join(", ")})`);
  console.log(`links added: ${added}`);
}

main();
