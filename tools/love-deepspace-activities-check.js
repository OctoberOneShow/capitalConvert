#!/usr/bin/env node
/* Real-browser acceptance for Mosaic, Bouquet and Expedition activities.
 * Uses local HTTP, a disposable Chrome profile and a newly attached CDP target.
 * Usage: node tools/love-deepspace-activities-check.js [--chrome=/path/to/chrome]
 * Reports and screenshots: tools/shots/love-deepspace-activities/.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const http = require("http");
const { spawn } = require("child_process");
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "tools", "shots", "love-deepspace-activities");
const PAGES = ["index.html", "english_filter.html", "chinese_punctuation.html", "words_replacing.html"];
const PARTNERS = ["xavier", "zayne", "rafayel", "sylus", "caleb"];
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const failures = [], results = [], exceptions = [];
function check(label, condition, detail) {
  results.push({ label, passed: !!condition, ...(detail === undefined ? {} : { detail }) });
  if (!condition) failures.push({ label, detail });
}
function chromePath() {
  const arg = process.argv.find(value => value.startsWith("--chrome="));
  const choices = [arg && arg.slice(9), process.env.CHROME_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"];
  return choices.find(value => value && fs.existsSync(value));
}
function createServer() {
  const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8", ".jpg": "image/jpeg", ".webp": "image/webp",
    ".png": "image/png", ".svg": "image/svg+xml", ".json": "application/json" };
  return http.createServer((req, res) => {
    let file;
    try { file = path.resolve(ROOT, "." + decodeURIComponent(new URL(req.url, "http://localhost").pathname)); }
    catch (_) { res.writeHead(400).end(); return; }
    if (!file.startsWith(ROOT + path.sep)) { res.writeHead(403).end(); return; }
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404).end(); return; }
    res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
    fs.createReadStream(file).pipe(res);
  });
}

async function main() {
  const executable = chromePath();
  if (!executable) throw Error("Chrome/Edge not found. Set CHROME_PATH or pass --chrome=/path/to/chrome.");
  fs.mkdirSync(OUT, { recursive: true });
  const server = createServer();
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const origin = "http://127.0.0.1:" + server.address().port;
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "capitalconvert-love-activities-"));
  const browser = spawn(executable, ["--headless=new", "--disable-gpu", "--no-first-run",
    "--no-default-browser-check", "--disable-background-networking", "--remote-debugging-port=0",
    "--remote-allow-origins=*", "--user-data-dir=" + profile, "about:blank"], { stdio: ["ignore", "ignore", "pipe"], windowsHide: true });
  let startupLog = "", ws, session, closed = false, inspectFailure, captureFailure;
  browser.stderr.on("data", data => { startupLog = (startupLog + data.toString()).slice(-4000); });
  browser.on("error", error => { startupLog += error.message; });
  browser.on("exit", () => { closed = true; });
  try {
    const portFile = path.join(profile, "DevToolsActivePort");
    for (let i = 0; i < 100 && !fs.existsSync(portFile) && !closed; i++) await pause(100);
    if (!fs.existsSync(portFile)) throw Error("Browser did not expose its debugger. " + startupLog);
    const port = Number(fs.readFileSync(portFile, "utf8").split(/\r?\n/)[0]);
    const version = await (await fetch("http://127.0.0.1:" + port + "/json/version")).json();
    ws = new WebSocket(version.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
    let sequence = 0;
    const pending = new Map();
    ws.onmessage = event => {
      const message = JSON.parse(event.data);
      if (pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); }
      if (message.method === "Runtime.exceptionThrown") exceptions.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    };
    const send = (method, params = {}, targetSession = session) => new Promise((resolve, reject) => {
      const id = ++sequence, timeout = setTimeout(() => { pending.delete(id); reject(Error("Debugger timeout: " + method)); }, 15000);
      pending.set(id, message => { clearTimeout(timeout); message.error ? reject(Error(JSON.stringify(message.error))) : resolve(message.result); });
      ws.send(JSON.stringify({ id, method, params, ...(targetSession ? { sessionId: targetSession } : {}) }));
    });
    const target = await send("Target.createTarget", { url: "about:blank" }, null);
    session = (await send("Target.attachToTarget", { targetId: target.targetId, flatten: true }, null)).sessionId;
    await send("Page.enable"); await send("Runtime.enable"); await send("Page.bringToFront");
    const evaluate = async expression => {
      const reply = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
      if (reply.exceptionDetails) throw Error(reply.exceptionDetails.exception?.description || reply.exceptionDetails.text);
      return reply.result.value;
    };
    const waitFor = async (expression, label) => {
      for (let i = 0; i < 100; i++) { if (await evaluate(expression)) return; await pause(75); }
      throw Error("Timed out waiting for " + label);
    };
    const click = selector => evaluate(`(() => {const n=document.querySelector(${JSON.stringify(selector)});if(!n)throw Error('Missing control: '+${JSON.stringify(selector)});if(!n.getClientRects().length)throw Error('Hidden control: '+${JSON.stringify(selector)});if(n.disabled)throw Error('Disabled control: '+${JSON.stringify(selector)});n.scrollIntoView({block:'nearest'});n.click();})()`);
    const key = async (value, code, keyCode) => {
      await send("Input.dispatchKeyEvent", { type: "keyDown", key: value, code, windowsVirtualKeyCode: keyCode });
      await send("Input.dispatchKeyEvent", { type: "keyUp", key: value, code, windowsVirtualKeyCode: keyCode });
    };
    const resize = width => send("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: width < 600 });
    const screenshot = async name => {
      const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
      fs.writeFileSync(path.join(OUT, name + ".png"), Buffer.from(shot.data, "base64"));
    };
    inspectFailure = () => evaluate("({url:location.href,title:document.title,activity:document.querySelector('.lds-date-page:not([hidden])')?.textContent.slice(0,5000),games:Object.fromEntries(Object.entries(window.__ldsActivityApis||{}).map(([name,api])=>[name,api.inspect()]))})");
    captureFailure = () => screenshot("failure");
    let preload;
    async function load(page, language = "en", fresh = true) {
      if (fresh) await send("Storage.clearDataForOrigin", { origin, storageTypes: "local_storage" });
      if (preload) await send("Page.removeScriptToEvaluateOnNewDocument", { identifier: preload });
      const hooks = `(() => {window.__ldsActivityApis={};const app=window.CapitalConvert=window.CapitalConvert||{};for(const [name,key] of [['mountLdsMosaic','mosaic'],['mountLdsBouquet','bouquet'],['mountLdsExpedition','expedition']]){let mount;Object.defineProperty(app,name,{configurable:true,get(){if(!mount)return undefined;return function(...args){const api=mount.apply(this,args);window.__ldsActivityApis[key]=api;return api}},set(value){mount=value}});}})();`;
      new Function(hooks); // Parse fixture hooks before injecting them into a page.
      preload = (await send("Page.addScriptToEvaluateOnNewDocument", { source: `localStorage.setItem('lang',${JSON.stringify(language)});localStorage.setItem('motion-level','off');${hooks}` })).identifier;
      await send("Page.navigate", { url: origin + "/" + page + "?game=love-deepspace" });
      await waitFor("!!document.querySelector('.ldx-passport')&&Object.keys(window.__ldsActivityApis||{}).length===3", page + " activity expansion");
      await evaluate("document.documentElement.setAttribute('data-motion','off')");
      check(page + " boots in " + language, await evaluate("CapitalConvert.currentLang") === language);
      await evaluate("[...document.querySelectorAll('button')].find(n=>/^(Later|稍后再说)$/.test(n.textContent.trim()))?.click()");
    }
    const inspect = activity => evaluate(`window.__ldsActivityApis[${JSON.stringify(activity)}].inspect()`);
    const progress = activity => evaluate(`window.__ldsActivityApis[${JSON.stringify(activity)}].getProgress()`);
    const signature = activity => evaluate(`JSON.stringify(window.__ldsActivityApis[${JSON.stringify(activity)}].inspect().state)`);
    const affinity = () => evaluate("JSON.parse(CapitalConvert.storage.getItem('love-deepspace-album-v1')||'{}').bonds?.xavier||0");
    const openActivity = async activity => {
      if (!await evaluate("document.querySelector('.ldx-passport').open")) await click(".ldx-passport summary");
      await click(`[data-passport="${activity}"]`);
      check(activity + " Passport control opens and focuses its activity", await evaluate(`!document.querySelector('.lds-date-${activity}').hidden&&!!document.activeElement.closest('.lds-date-${activity}')`));
    };
    async function solveMosaic() {
      // Read the same piece identity/orientation labels exposed to keyboard users;
      // perform every move through the visible board and rotation controls.
      let state = (await inspect("mosaic")).state;
      if (await evaluate("!!document.querySelector('.ldm-tile[aria-pressed=true]')")) await click(".ldm-tile[aria-pressed=true]");
      for (let destination = 0; destination < state.tiles.length; destination++) {
        state = (await inspect("mosaic")).state;
        if (state.done) return state;
        if (state.tiles[destination].id === destination) continue;
        const source = state.tiles.findIndex(piece => piece.id === destination);
        await click(`[data-mosaic-tile="${destination}"]`);
        await click(`[data-mosaic-tile="${source}"]`);
      }
      state = (await inspect("mosaic")).state;
      for (let position = 0; position < state.tiles.length; position++) {
        const turns = (4 - state.tiles[position].turn) % 4;
        if (!turns) continue;
        await click(`[data-mosaic-tile="${position}"]`);
        for (let turn = 0; turn < turns; turn++) await click(".ldm-controls [data-i18n=ldmRotate]");
        state = (await inspect("mosaic")).state;
        if (state.done) return state;
        if (await evaluate(`document.querySelector('[data-mosaic-tile="${position}"]').getAttribute('aria-pressed')==='true'`)) await click(`[data-mosaic-tile="${position}"]`);
      }
      return (await inspect("mosaic")).state;
    }
    async function winExpedition() {
      for (let step = 0; step < 140; step++) {
        const current = await inspect("expedition"), state = current.state;
        if (state.phase === "won" || state.phase === "lost") return state;
        if (!current.started) { await click('[data-expedition-action="start"]'); continue; }
        if (current.paused) { await click('[data-expedition-action="resume"]'); continue; }
        if (state.phase !== "battle") {
          const choice = state.phase === "draft" ? "lens" : state.phase === "route" ? "quiet" : "rest";
          await click(`[data-expedition-choice="${choice}"]`); continue;
        }
        const intent = await evaluate("CapitalConvert.ldsExpeditionRules.intent(window.__ldsActivityApis.expedition.inspect().state)");
        check("Expedition previews the enemy's next action", await evaluate("document.querySelector('.lxe-intent').textContent.length>10&&document.querySelector('.lxe-intent').getAttribute('data-intent')") === intent.kind);
        // Enumerate legal card orders on independent copies, then execute the
        // chosen sequence through actual controls. No live state is changed here.
        const actions = await evaluate(`(() => {
          const r=CapitalConvert.ldsExpeditionRules,base=window.__ldsActivityApis.expedition.inspect().state;
          const copy=s=>JSON.parse(JSON.stringify(s));let best={score:-Infinity,actions:[]};const seen=new Set();
          function consider(s,actions){
            const after=copy(s),sequence=actions.slice();
            if(after.phase==='battle'){r.endTurn(after);sequence.push(['end']);}
            const score=after.phase==='lost'?-100000:after.phase==='won'?100000+after.hp*3+after.charge:after.phase==='draft'?50000+after.hp*3+after.charge:after.hp*3-after.foe.hp*2+after.charge*.7;
            if(score>best.score){best={score,actions:sequence};}
          }
          function visit(s,actions,depth){const sig=JSON.stringify([s.hp,s.energy,s.guard,s.charge,s.chain,s.hand,s.foe.hp,s.foe.guard,s.phase]);if(seen.has(sig))return;seen.add(sig);consider(s,actions);if(s.phase!=='battle'||depth>=6)return;
            for(let slot=0;slot<3;slot++){const next=copy(s);if(r.play(next,slot))visit(next,actions.concat([['play',slot]]),depth+1);}
            const next=copy(s);if(r.skill(next))visit(next,actions.concat([['skill']]),depth+1);
          }
          visit(copy(base),[],0);return best.actions;
        })()`);
        for (const action of actions) {
          const selector = action[0] === "play" ? `[data-expedition-card="${action[1]}"]` : `[data-expedition-action="${action[0]}"]`;
          await click(selector);
        }
      }
      throw Error("Expedition did not finish within its action budget.");
    }
    async function solveBouquet(verifyPreview = false) {
      const relativeColor = [1,2,1,2,3,0,0,3,1,0,0,2], relativePetals = [0,0,0,0,1,1,2,0,0,1,2,0];
      for (let placement = 0; placement < 12; placement++) {
        const current = await inspect("bouquet"), state = current.state;
        if (state.done) return current;
        const flower = state.hand[0], colors = ["ivory","rose","sky","violet"], petals = [3,5,8];
        const colorOffset = colors.indexOf(current.commission.favorite), petalOffset = petals.indexOf(current.commission.preferredPetals);
        const destination = relativeColor.findIndex((color, index) => !state.board[index] && colors[(color + colorOffset) % 4] === flower.color && petals[(relativePetals[index] + petalOffset) % 3] === flower.petals);
        if (destination < 0) throw Error("Bouquet's visible hand did not fit the verified arrangement.");
        await click('[data-bouquet-hand="0"]'); await click(`[data-bouquet-cell="${destination}"]`);
        if (verifyPreview && placement === 0) {
          const preview = await inspect("bouquet");
          check("Bouquet previews a placement before confirmation", preview.aimed && !preview.state.board[destination] && await evaluate("!document.querySelector('[data-i18n=ldbPlant]').disabled"));
        }
        await click("[data-i18n=ldbPlant]");
      }
      return await inspect("bouquet");
    }
    await resize(1100);
    for (const page of PAGES) {
      await load(page);
      check(page + " retains the existing six Journey goals", await evaluate("document.querySelectorAll('.ldr-goal').length===6"));
      check(page + " offers three Passport activities", await evaluate("['mosaic','bouquet','expedition'].every(id=>!!document.querySelector('[data-passport='+id+']'))"));
      for (const activity of ["mosaic", "bouquet", "expedition"]) {
        await openActivity(activity);
        const before = await signature(activity); await pause(80);
        check(page + " " + activity + " is untimed", await signature(activity) === before);
      }
    }
    await load("index.html"); await openActivity("mosaic");
    check("Mosaic presents nine image puzzles", await evaluate("document.querySelectorAll('[data-mosaic-stage]').length===9"));
    const beforeReference = (await inspect("mosaic")).state;
    await click(".ldm-controls [data-i18n=ldmReference]");
    await waitFor("document.querySelector('.ldm-reference img').complete&&document.querySelector('.ldm-reference img').naturalWidth>0", "Mosaic reference photograph");
    check("Mosaic reference loads without consuming hints or actions", await evaluate("!document.querySelector('.ldm-reference').hidden&&document.querySelector('[data-i18n=ldmReference]').getAttribute('aria-pressed')==='true'") && (await inspect("mosaic")).state.moves === beforeReference.moves && (await inspect("mosaic")).state.hints === beforeReference.hints);
    await click(".ldm-controls [data-i18n=ldmReference]");
    const initialTiles = JSON.stringify((await inspect("mosaic")).state.tiles);
    await click('[data-mosaic-tile="0"]'); await click('[data-mosaic-tile="1"]');
    await click("[data-i18n=ldmUndo]");
    check("Mosaic undo restores pieces while retaining the action count", JSON.stringify((await inspect("mosaic")).state.tiles) === initialTiles && (await inspect("mosaic")).state.moves === 1);
    await click("[data-i18n=ldmReset]");
    const bondBeforeMosaic = await affinity();
    for (let stage = 0; stage < 9; stage++) {
      await click(`[data-mosaic-stage="${stage}"]`);
      const result = await solveMosaic(), record = await progress("mosaic");
      check("Mosaic photograph " + (stage + 1) + " can be completed at its exact target", result.done && result.moves === result.par && result.hints === 0 && record.stars[stage] === 3, { moves:result.moves, par:result.par, stars:record.stars[stage] });
    }
    check("all nine Mosaic first clears award affinity once", await affinity() === bondBeforeMosaic + 18);
    await screenshot("mosaic-completed-desktop");
    await click(".ldm-controls [data-i18n=ldmOriginal]");
    check("completed Mosaic opens the correct HD original", await evaluate("document.querySelector('#gamePanelLoveDeepspace').getAttribute('data-view')==='gallery'&&!document.querySelector('.ldr-viewer').hidden&&document.querySelector('.ldr-view-image').getAttribute('src').includes('xavier-scene-8.jpg')"));
    await click(".lds-together-tab"); await openActivity("mosaic");
    await click('[data-mosaic-stage="0"]'); await solveMosaic();
    check("Mosaic replay preserves best stars without another affinity reward", (await progress("mosaic")).totalStars === 27 && await affinity() === bondBeforeMosaic + 18);
    await click("[data-i18n=ldmReset]");
    for (let n = 0; n < 32 && !(await inspect("mosaic")).state.done; n++) await click("[data-i18n=ldmHint]");
    check("Mosaic assistance caps the attempt at one star without lowering a saved best", (await inspect("mosaic")).state.done && (await inspect("mosaic")).state.hints > 0 && await evaluate("CapitalConvert.ldsMosaicRules.stars(window.__ldsActivityApis.mosaic.inspect().state)") === 1 && (await progress("mosaic")).stars[0] === 3 && await affinity() === bondBeforeMosaic + 18);
    await openActivity("bouquet");
    const bondBeforeBouquet = await affinity();
    check("Bouquet offers six commissions", await evaluate("document.querySelectorAll('[data-bouquet-commission]').length===6"));
    for (let commission = 0; commission < 6; commission++) {
      await click(`[data-bouquet-commission="${commission}"]`);
      const result = await solveBouquet(commission === 0), record = await progress("bouquet");
      check("Bouquet commission " + (commission + 1) + " supports a legal three-star arrangement", result.state.done && result.evaluation.contractsMet && record.stars[commission] === 3, result.evaluation);
    }
    check("six Bouquet first clears award affinity once", await affinity() === bondBeforeBouquet + 12);
    await screenshot("bouquet-completed-desktop");
    await click('[data-bouquet-commission="0"]'); await solveBouquet();
    await click("[data-i18n=ldbUndo]"); await solveBouquet();
    check("Bouquet undo and replay do not farm affinity or lower best stars", await affinity() === bondBeforeBouquet + 12 && (await progress("bouquet")).totalStars === 18);
    await openActivity("expedition");
    const bondBeforeExpedition = await affinity();
    await click('[data-expedition-action="start"]');
    const firstCard = await evaluate("[...document.querySelectorAll('[data-expedition-card]')].find(n=>!n.disabled).getAttribute('data-expedition-card')");
    await click(`[data-expedition-card="${firstCard}"]`);
    const unfinished = await signature("expedition");
    await click("[data-i18n=ldsMissionTab]"); await click(".lds-together-tab"); await openActivity("expedition");
    check("unfinished Expedition resources survive Missions and return", await signature("expedition") === unfinished);
    await click("#gameCloseBtn");
    const hiddenRun = await signature("expedition");
    await evaluate("document.querySelector('[data-expedition-action=end]').click()");
    check("hidden Expedition controls cannot spend a turn", await signature("expedition") === hiddenRun);
    await click("#gameToggleBtn"); await openActivity("expedition");
    check("unfinished Expedition survives drawer close and reopen", await signature("expedition") === unfinished);
    for (let tier = 0; tier < 3; tier++) {
      if (tier > 0) await click(`[data-expedition-tier="${tier}"]`);
      const result = await winExpedition(), record = await progress("expedition");
      check("Expedition tier " + (tier + 1) + " can be won through legal visible decisions", result.phase === "won" && record.stars[tier] >= 1 && await evaluate("CapitalConvert.ldsExpeditionRules.verify(window.__ldsActivityApis.expedition.inspect().state)"), { hp:result.hp, turns:result.turns, stars:record.stars[tier] });
      check("Expedition health readout agrees with the completed run", await evaluate("Number(document.querySelector('.lxe-health-track').getAttribute('aria-valuenow'))") === result.hp);
    }
    check("three Expedition first clears award affinity once", await affinity() === bondBeforeExpedition + 6);
    await screenshot("expedition-completed-desktop");
    await click('[data-expedition-action="replay"]'); await winExpedition();
    check("Expedition replay preserves records without duplicate affinity", await affinity() === bondBeforeExpedition + 6 && (await progress("expedition")).cleared === 3);
    const savedProgress = {};
    for (const activity of ["mosaic", "bouquet", "expedition"]) {
      savedProgress[activity] = await progress(activity);
      check(activity + " Passport reflects its actual stars and clears", await evaluate(`Number(document.querySelector('[data-passport=${activity}]').getAttribute('data-stars'))`) === savedProgress[activity].totalStars && await evaluate(`Number(document.querySelector('[data-passport=${activity}]').getAttribute('data-cleared'))`) === savedProgress[activity].cleared);
    }
    check("new activities do not mark unrelated Journey goals complete", await evaluate("document.querySelectorAll('.ldr-goal[data-complete=true]').length===0"));
    await click('.lds-partner-card[data-partner="caleb"]');
    check("Passport collections stay separate for each partner", await evaluate("[...document.querySelectorAll('[data-passport]')].every(n=>n.getAttribute('data-stars')==='0'&&n.getAttribute('data-cleared')==='0')"));
    await click('.lds-partner-card[data-partner="xavier"]');
    await load("index.html", "en", false);
    for (const activity of ["mosaic", "bouquet", "expedition"]) {
      const record = await progress(activity);
      check(activity + " saved collection survives a real reload", record.totalStars === savedProgress[activity].totalStars && record.cleared === savedProgress[activity].cleared);
    }
    for (const language of ["en", "zh"]) {
      await load("index.html", language);
      for (const theme of ["dark", "light"]) {
        await evaluate(`document.documentElement.setAttribute('data-theme',${JSON.stringify(theme)})`);
        for (const width of [1100,390,320]) {
          await resize(width);
          for (const activity of ["mosaic", "bouquet", "expedition"]) {
            await openActivity(activity);
            if (activity === "expedition" && !(await inspect(activity)).started) await click('[data-expedition-action="start"]');
            const layout = await evaluate(`(() => {const p=document.querySelector('#gamePanelLoveDeepspace'),d=p.closest('.game-dialog'),g=document.querySelector('.lds-date-${activity}');return {panel:p.scrollWidth-p.clientWidth,dialog:d.scrollWidth-d.clientWidth,game:g.scrollWidth-g.clientWidth,leak:/undefined|NaN|\\[object Object\\]|(?:ldm|ldb|lxe|ldx)[A-Z][A-Za-z]+/.test(g.textContent)}})()`);
            check(language + " " + theme + " " + width + " " + activity + " layout and copy", layout.panel <= 2 && layout.dialog <= 2 && layout.game <= 2 && !layout.leak, layout);
            if (language === "zh" && theme === "dark") await screenshot(activity + "-zh-" + width);
          }
        }
      }
      console.log("Checked new companion activities in " + language + ".");
    }
    await evaluate("window.__ldsActivityNativeSet=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new DOMException('Storage rejected for acceptance test','QuotaExceededError')}");
    await openActivity("mosaic"); await solveMosaic();
    check("blocked browser storage keeps new progress playable in this session", (await progress("mosaic")).cleared === 1 && await evaluate("document.querySelector('.ldr-save-state').getAttribute('data-persistent')==='false'"));
    await evaluate("Storage.prototype.setItem=window.__ldsActivityNativeSet;delete window.__ldsActivityNativeSet");
    check("no uncaught browser exceptions", exceptions.length === 0, exceptions);
    fs.writeFileSync(path.join(OUT,"report.json"), JSON.stringify({ passed:results.length-failures.length, failed:failures.length, results, exceptions },null,2));
    console.log("Activity checks passed: " + (results.length-failures.length) + "; failed: " + failures.length);
    failures.forEach(failure => console.log("FAIL " + failure.label + ": " + JSON.stringify(failure.detail)));
    console.log("Report: " + path.join(OUT,"report.json"));
    process.exitCode = failures.length ? 1 : 0;
  } catch (error) {
    let state;
    try { if (inspectFailure) state = await inspectFailure(); if (captureFailure) await captureFailure(); } catch (_) {}
    fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify({ passed: results.length - failures.length, failed: failures.length + 1, results, failures, error: error.stack || String(error), state, exceptions }, null, 2));
    throw error;
  } finally {
    if (ws) ws.close();
    browser.kill();
    await new Promise(resolve => server.close(resolve));
    for (let i = 0; i < 20 && !closed; i++) await pause(50);
    const resolved = path.resolve(profile), tmpRoot = path.resolve(os.tmpdir()) + path.sep;
    if (resolved.startsWith(tmpRoot) && path.basename(resolved).startsWith("capitalconvert-love-activities-")) {
      try { fs.rmSync(resolved, { recursive: true, force: true }); } catch (_) { /* Browser lock may outlast termination. */ }
    }
  }
}
main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
