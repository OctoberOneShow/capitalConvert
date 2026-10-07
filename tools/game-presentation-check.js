#!/usr/bin/env node
/* Browser acceptance: all game panels, real layout, filtering, localization,
 * protected panels, motion preferences, and representative screenshots. */
"use strict";
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const ROOT = path.resolve(__dirname, "..");
const PORT = 9363;
const pause = ms => new Promise(r => setTimeout(r, ms));
async function main() {
  const out = path.join(ROOT, "tools", "shots", "completed"); fs.mkdirSync(out, { recursive: true });
  const proc = spawn("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--remote-allow-origins=*", "--allow-file-access-from-files", "--remote-debugging-port=" + PORT, "--user-data-dir=" + path.join(ROOT, "tools", ".chrome-profile-" + PORT), "about:blank"], { stdio: "ignore" });
  let ws;
  try {
    let target;
    for (let i = 0; i < 50; i++) { await pause(200); try { target = (await (await fetch("http://127.0.0.1:" + PORT + "/json/list")).json()).find(t => t.type === "page"); if (target) break; } catch (_) {} }
    if (!target) throw Error("Browser did not start");
    ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
    let id = 0; const pending = new Map(); const errors = [];
    ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } if (m.method === "Runtime.exceptionThrown") errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text); };
    const send = (method, params = {}) => new Promise((resolve, reject) => { const n = ++id; const timeout = setTimeout(() => { pending.delete(n); reject(Error("Timeout: " + method)); }, 25000); pending.set(n, m => { clearTimeout(timeout); if (m.error) reject(Error(JSON.stringify(m.error))); else resolve(m.result); }); ws.send(JSON.stringify({ id: n, method, params })); });
    const evaluate = async expression => { const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
    await send("Page.enable"); await send("Runtime.enable");
    const failures = []; let checks = 0;
    function check(label, ok, data) { checks++; if (!ok) failures.push({ label, data }); }
    async function load(page, language) {
      await send("Page.addScriptToEvaluateOnNewDocument", { source: "localStorage.setItem('lang'," + JSON.stringify(language) + ");localStorage.setItem('game-tabs-expanded','0');localStorage.setItem('motion-level','off');" });
      await send("Page.navigate", { url: "file:///" + path.join(ROOT, page).replace(/\\/g, "/") });
      for (let i = 0; i < 80; i++) { await pause(100); if (await evaluate("!!document.querySelector('.world-heading')")) break; }
      await evaluate("document.getElementById('gameToggleBtn').click(); [...document.querySelectorAll('button')].find(x=>/稍后再说|Later/.test(x.textContent))?.click()");
      return await evaluate("({tabs:document.querySelectorAll('.game-tab').length,heads:document.querySelectorAll('.world-heading').length,missing:[...document.querySelectorAll('.game-panel')].filter(p=>!['gamePanelItemQuest','gamePanelLoveDeepspace'].includes(p.id)&&!p.querySelector('.world-heading')).map(p=>p.id)})");
    }
    await send("Emulation.setDeviceMetricsOverride", { width: 860, height: 1200, deviceScaleFactor: 1, mobile: false });
    const boot = await load("index.html", "en");
    check("98 games remain available", boot.tabs === 98, boot); check("All 96 requested games have artwork", boot.heads === 96 && !boot.missing.length, boot);
    const ids = await evaluate("[...document.querySelectorAll('.game-tab')].map(t=>t.id)");
    const layouts = [];
    for (const width of [860, 390, 320]) {
      await send("Emulation.setDeviceMetricsOverride", { width, height: width === 860 ? 1200 : 844, deviceScaleFactor: 1, mobile: width !== 860 });
      for (const tab of ids) {
        const result = await evaluate(`(() => {const t=document.getElementById(${JSON.stringify(tab)}); t.click(); const p=document.getElementById(t.getAttribute('aria-controls')); const b=p.getBoundingClientRect(); const dialog=p.closest('.game-dialog'); const excluded=['gamePanelItemQuest','gamePanelLoveDeepspace'].includes(p.id); return {id:p.id,excluded,visible:!p.hidden,overflow:p.scrollWidth-p.clientWidth,dialogOverflow:dialog.scrollWidth-dialog.clientWidth,left:b.left,right:b.right,world:p.getAttribute('data-world'),art:p.querySelectorAll('.world-heading svg').length,leak:/NaN|undefined/.test(p.textContent)||p.textContent.includes('[object Object]')};})()`);
        check(width + " " + tab + " opens cleanly", result.visible && !result.leak, result);
        if (!result.excluded) { check(width + " " + tab + " fits", result.overflow <= 2 && result.dialogOverflow <= 2 && result.left >= 0 && result.right <= width + 1, result); }
        else { check(tab + " protected artwork untouched", result.art === 0 && !result.world, result); }
        layouts.push({ width, ...result });
      }
      console.log("Inspected all 98 games at " + width + "px.");
    }
    await evaluate("document.getElementById('gameTabTyping').click(); document.getElementById('gameTabsToggle').click()");
    check("Search shown when library expands", await evaluate("!document.getElementById('worldLibraryTools').hidden"));
    await evaluate("const q=document.getElementById('worldGameSearch');q.value='珊瑚';q.dispatchEvent(new Event('input',{bubbles:true}))");
    check("Search finds names in either language", (await evaluate("[...document.querySelectorAll('.game-tab')].filter(t=>!t.hidden).map(t=>t.id)")).join() === "gameTabCoralArchitect");
    await evaluate("document.getElementById('worldGameSearch').value='unlikely-no-game-xyz';document.getElementById('worldGameSearch').dispatchEvent(new Event('input'))");
    check("Empty search has an explanation", await evaluate("!document.querySelector('.world-library-empty').hidden"));
    await evaluate("document.getElementById('worldGameSearch').value='';document.getElementById('worldGameSearch').dispatchEvent(new Event('input'));document.querySelector('[data-category=music]').click()");
    check("Category filtering", await evaluate("[...document.querySelectorAll('.game-tab')].filter(t=>!t.hidden).every(t=>t.dataset.genre==='music')"));
    await evaluate("document.getElementById('gameTabsToggle').click()");
    check("Collapsing library resets filters", await evaluate("[...document.querySelectorAll('.game-tab')].every(t=>!t.hidden)"));
    await evaluate("document.documentElement.setAttribute('data-motion','off');document.getElementById('gameTabWhisperDeck').click()");
    check("Motion off suppresses presentation animation", await evaluate("getComputedStyle(document.querySelector('#gamePanelWhisperDeck .world-heading-copy')).animationName==='none'"));
    check("Cards have readable illustrated faces", await evaluate("document.querySelectorAll('#gamePanelWhisperDeck .world-card-art').length===6 && [...document.querySelectorAll('#gamePanelWhisperDeck .world-card-name')].every(n=>n.textContent.length>0)"));
    await evaluate("CapitalConvert.presentGameAchievement({stars:3},true)");
    check("Achievement shows earned stars", await evaluate("document.querySelector('.world-achievement strong').textContent==='★★★'"));
    await evaluate("document.getElementById('gameTabCoralArchitect').click()");
    check("Switching games removes achievement", await evaluate("!document.querySelector('.world-achievement')"));
    const representatives = ["WhisperDeck", "CoralArchitect", "WeatherLoom", "GlyphRaid", "GlyphReversi", "LanternHeist", "GlyphBlocks", "EmberDelve", "GlyphBastion", "CircuitScribe", "TeaHouse", "Typing"];
    for (const language of ["en", "zh"]) {
      await send("Emulation.setDeviceMetricsOverride", { width: 860, height: 1200, deviceScaleFactor: 1, mobile: false });
      await load("index.html", language);
      check(language + " objectives translate", await evaluate("[...document.querySelectorAll('.world-objective')].every(n=>n.textContent.length>0&&!n.textContent.startsWith('worldGoal'))"));
      for (const game of representatives) {
        await evaluate("document.getElementById('gameTab" + game + "').click();document.querySelector('.game-dialog').scrollTop=0"); await pause(70);
        const shot = await send("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(path.join(out, language + "-" + game + ".png"), Buffer.from(shot.data, "base64"));
      }
      console.log("Saved " + language + " game previews.");
    }
    for (const page of ["english_filter.html", "chinese_punctuation.html", "words_replacing.html"]) { const b = await load(page, "en"); check(page + " shares the complete presentation", b.heads === 96 && b.tabs === 98, b); }
    check("No browser exceptions", errors.length === 0, errors);
    const report = { checks, passed: checks - failures.length, failures, errors, layouts };
    fs.writeFileSync(path.join(out, "browser-report.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ checks, passed: report.passed, failures: failures.slice(0, 20), errors }, null, 2));
    process.exitCode = failures.length ? 1 : 0;
  } finally { if (ws) ws.close(); proc.kill(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
