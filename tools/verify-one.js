#!/usr/bin/env node
"use strict";

/* Single-snippet gate runner: verify one or more games' gate snippets in
 * worker threads, exactly the way verify-parallel.js runs them, without
 * sweeping the whole drawer. Usage:
 *
 *   node tools/verify-one.js glyph-leap peg-splash
 *   node tools/verify-one.js --list
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const { Worker, isMainThread, parentPort, workerData } = require("worker_threads");

const root = path.join(__dirname, "..");
const snippetsDir = path.join(__dirname, "gate-snippets");

function loadAppSource() {
  const pageHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const APP_MODULES = Array.from(
    pageHtml.matchAll(/assets\/app\/([a-z0-9-]+)\.js\?v=\d+/g),
  ).map((match) => match[1]);
  return APP_MODULES.map((name) =>
    fs
      .readFileSync(path.join(root, "assets", "app", name + ".js"), "utf8")
      .replace(/^\uFEFF/, ""),
  ).join("\n");
}

if (isMainThread) {
  const args = process.argv.slice(2);
  const available = fs
    .readdirSync(snippetsDir)
    .filter((f) => f.endsWith(".js") && !f.startsWith("_"))
    .map((f) => f.slice(0, -3));

  if (args.length === 0 || args.includes("--help")) {
    console.log("usage: node tools/verify-one.js <slug> [<slug> ...]");
    console.log("       node tools/verify-one.js --list");
    console.log("\navailable slugs:");
    console.log(available.join("\n"));
    process.exit(args.length === 0 ? 1 : 0);
  }
  if (args.includes("--list")) {
    console.log(available.join("\n"));
    return;
  }

  const slugs = [];
  const unknown = [];
  args.forEach((arg) => (available.includes(arg) ? slugs.push(arg) : unknown.push(arg)));
  if (unknown.length) {
    console.error("unknown snippet slug(s): " + unknown.join(", "));
    console.error("run with --list to see the available slugs");
    process.exit(1);
  }

  const appSource = loadAppSource();
  const concurrency = Math.min(os.cpus().length || 4, slugs.length);
  const startTime = Date.now();

  let active = 0;
  let index = 0;
  let totalPass = 0;
  const allFailures = [];

  function runNext() {
    if (index >= slugs.length) {
      if (active === 0) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`\n${slugs.length} gate suite(s) in ${elapsed}s across ${concurrency} thread(s)`);
        console.log(`Pass: ${totalPass}, Fail: ${allFailures.length}`);
        if (allFailures.length > 0) {
          allFailures.forEach((f) => console.log("FAIL: " + f));
          process.exitCode = 1;
        }
      }
      return;
    }

    const slug = slugs[index++];
    active++;

    const worker = new Worker(__filename, {
      workerData: { slug, root, snippetsDir, appSource },
    });

    worker.on("message", (msg) => {
      totalPass += msg.pass;
      if (msg.failures && msg.failures.length > 0) {
        allFailures.push(...msg.failures);
      }
      process.stdout.write(msg.failures.length === 0 ? "." : "F");
    });

    worker.on("error", (err) => {
      allFailures.push(`${slug} worker error: ${err.message}`);
      process.stdout.write("E");
    });

    worker.on("exit", () => {
      active--;
      runNext();
    });
  }

  for (let i = 0; i < concurrency; i++) runNext();
} else {
  const { slug, root: appRoot, snippetsDir: dir, appSource } = workerData;
  const { createEnvironment } = require("./stub-dom");

  const env = createEnvironment({});
  env.load(appSource);
  env.domReady();
  const App = env.sandbox.CapitalConvert || env.window.CapitalConvert;

  let pass = 0;
  const failures = [];
  function check(caseName, label, ok, detail) {
    if (ok) {
      pass++;
    } else {
      failures.push(`${caseName} :: ${label}${detail ? " -> " + detail : ""}`);
    }
  }

  try {
    const snippetFile = path.join(dir, slug + ".js");
    const gate = require(snippetFile);
    gate({ App, env, check, fs, path, root: appRoot });
  } catch (err) {
    failures.push(`${slug} exception: ${err.stack || err.message}`);
  }

  parentPort.postMessage({ slug, pass, failures });
}
