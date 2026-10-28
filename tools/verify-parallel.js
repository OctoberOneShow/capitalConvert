#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const { Worker, isMainThread, parentPort, workerData } = require("worker_threads");

const root = path.join(__dirname, "..");
const snippetsDir = path.join(__dirname, "gate-snippets");

if (isMainThread) {
  const pageHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const APP_MODULES = Array.from(
    pageHtml.matchAll(/assets\/app\/([a-z0-9-]+)\.js\?v=\d+/g),
  ).map((match) => match[1]);

  const appSource = APP_MODULES.map((name) =>
    fs
      .readFileSync(path.join(root, "assets", "app", name + ".js"), "utf8")
      .replace(/^\uFEFF/, ""),
  ).join("\n");

  const snippets = fs.readdirSync(snippetsDir)
    .filter((f) => f.endsWith(".js") && !f.startsWith("_"))
    .map((f) => f.slice(0, -3));

  const concurrency = Math.min(os.cpus().length || 4, snippets.length);
  const startTime = Date.now();

  let active = 0;
  let index = 0;
  let totalPass = 0;
  const allFailures = [];

  function runNext() {
    if (index >= snippets.length) {
      if (active === 0) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`\n========================================`);
        console.log(`Parallel verification complete in ${elapsed}s across ${concurrency} threads`);
        console.log(`Pass: ${totalPass}, Fail: ${allFailures.length}`);
        if (allFailures.length > 0) {
          allFailures.forEach((f) => console.log("FAIL: " + f));
          process.exitCode = 1;
        } else {
          console.log(`ALL GATES PASSED CLEANLY!`);
        }
      }
      return;
    }

    const slug = snippets[index++];
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

  console.log(`Running ${snippets.length} gate verification suites in parallel (${concurrency} threads)...`);
  for (let i = 0; i < concurrency; i++) {
    runNext();
  }
} else {
  // Worker thread
  const { slug, root, snippetsDir, appSource } = workerData;
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
    const snippetFile = path.join(snippetsDir, slug + ".js");
    const gate = require(snippetFile);
    gate({ App, env, check, fs, path, root });
  } catch (err) {
    failures.push(`${slug} exception: ${err.stack || err.message}`);
  }

  parentPort.postMessage({ slug, pass, failures });
}
