#!/usr/bin/env node
/* Headless screenshot driver: tools/shot.js --game <tabId|slug> [--out f] [--w n] [--h n] [--click sel] [--eval js] [--log]
 * Boots the real app in headless Chrome over CDP and captures the game panel. */
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
/* Parallel workers each pass --port so their Chrome instances never fight over
 * one debugger endpoint; every port gets its own profile dir to match. */
const PORT = parseInt(arg("port", "9333"), 10);
const ROOT = path.resolve(__dirname, "..");

function arg(name, dflt) {
  const i = process.argv.indexOf("--" + name);
  return i >= 0 ? process.argv[i + 1] : dflt;
}
const has = (name) => process.argv.includes("--" + name);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const url = arg("url", "http://127.0.0.1:8765/index.html");
  const out = arg("out", path.join(ROOT, "tools", "shot.png"));
  const w = parseInt(arg("w", "860"), 10);
  const h = parseInt(arg("h", "1200"), 10);
  const game = arg("game", "");
  const preset = arg("preset", "");
  const extraEval = arg("eval", "");
  const cssFile = arg("css", "");
  const shots = parseInt(arg("shots", "1"), 10);

  const proc = spawn(CHROME, [
    "--headless=new", "--disable-gpu", "--hide-scrollbars",
    "--remote-allow-origins=*",
    "--allow-file-access-from-files", "--remote-debugging-port=" + PORT,
    "--user-data-dir=" + path.join(ROOT, "tools", ".chrome-profile-" + PORT),
    "--window-size=" + w + "," + h, "--force-device-scale-factor=1",
    "about:blank",
  ], { stdio: "ignore" });

  let target = null;
  for (let i = 0; i < 60; i++) {
    await sleep(250);
    try {
      const res = await fetch("http://127.0.0.1:" + PORT + "/json/list");
      const list = await res.json();
      target = list.find((t) => t.type === "page");
      if (target) break;
    } catch (e) { /* chrome still booting */ }
  }
  if (!target) { console.log("NO_TARGET"); proc.kill(); return; }

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => { ws.onopen = r; ws.onerror = r; });

  let id = 0;
  const pending = new Map();
  const errors = [];
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    if (m.method === "Runtime.exceptionThrown") {
      errors.push((m.params.exceptionDetails.exception && m.params.exceptionDetails.exception.description) || m.params.exceptionDetails.text);
    }
    if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") {
      errors.push(m.params.args.map((a) => a.value ?? a.description).join(" "));
    }
  };
  const send = (method, params) => new Promise((resolve) => {
    const n = ++id;
    const timer = setTimeout(() => { pending.delete(n); resolve(null); }, 8000);
    pending.set(n, (m) => { clearTimeout(timer); resolve(m); });
    ws.send(JSON.stringify({ id: n, method, params: params || {} }));
  });
  const expr = async (js, awaitPromise) => {
    const r = await send("Runtime.evaluate", { expression: js, returnByValue: true, awaitPromise: !!awaitPromise });
    if (!r || !r.result) return undefined;
    if (r.result.exceptionDetails) errors.push(JSON.stringify(r.result.exceptionDetails).slice(0, 300));
    return r.result.result ? r.result.result.value : undefined;
  };

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Network.enable");
  await send("Network.setCacheDisabled", { cacheDisabled: true });
  await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url });
  await sleep(1800);

  if (preset) await expr(`(() => { const b=[...document.querySelectorAll('button')].find(x=>/${preset}/i.test(x.textContent)); if(b) b.click(); return !!b; })()`);
  else await expr(`(() => { const b=document.getElementById('gameToggleBtn'); if(b) b.click(); const l=[...document.querySelectorAll('button')].find(x=>/稍后再说|Later/i.test(x.textContent)); if(l) l.click(); return !!b; })()`);
  await sleep(400);

  if (cssFile) {
    const css = fs.readFileSync(cssFile, "utf8");
    const applied = await expr(
      "(() => { const s = document.createElement('style'); s.id = 'preview-sheet'; s.textContent = " +
      JSON.stringify(css) +
      "; document.head.appendChild(s); return s.textContent.length; })()"
    );
    console.log("CSS: applied " + applied + " bytes from " + cssFile);
  }

  if (game) {
    const ok = await expr(`(() => {
      const want = ${JSON.stringify(game)};
      const tabs = [...document.querySelectorAll('.game-tab, [id^="gameTab"]')];
      let t = tabs.find(x => x.id === want) || tabs.find(x => (x.id||'').toLowerCase() === 'gametab' + want) ||
              tabs.find(x => x.textContent.trim() === want) || tabs.find(x => (x.textContent||'').toLowerCase().includes(want.toLowerCase()));
      if (!t) return 'TAB_NOT_FOUND:' + want;
      t.scrollIntoView({block:'center'});
      t.click();
      return 'clicked ' + (t.id || t.textContent.trim());
    })()`);
    if (String(ok).startsWith("TAB_NOT_FOUND")) { console.log(ok); ws.close(); proc.kill(); process.exit(3); }
  }
  await sleep(700);
  if (extraEval) {
    const v = await expr(extraEval, true);
    console.log("EVAL: " + JSON.stringify(v));
  }
  await sleep(600);

  for (let s = 0; s < shots; s++) {
    if (s > 0) { await sleep(parseInt(arg("gap", "700"), 10)); }
    const shot = await send("Page.captureScreenshot", { format: "png" });
    if (!shot || !shot.result) { console.log("CAPTURE_FAILED"); continue; }
    const file = shots === 1 ? out : out.replace(/\.png$/, "-" + s + ".png");
    fs.writeFileSync(file, Buffer.from(shot.result.data, "base64"));
    if (shots === 1) console.log(file);
  }
  if (has("log") && errors.length) console.log("ERRORS:\n" + errors.slice(0, 12).join("\n"));
  ws.close();
  proc.kill();
  process.exit(0);
}
main();
