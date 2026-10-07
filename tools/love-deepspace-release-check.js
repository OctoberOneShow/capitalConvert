#!/usr/bin/env node
/* Real-browser release acceptance for the Love and Deepspace fan adventure.
 * Uses local HTTP, a disposable Chrome profile and a newly attached CDP target.
 * Usage: node tools/love-deepspace-release-check.js [--chrome=/path/to/chrome]
 * Reports and screenshots: tools/shots/love-deepspace-release/.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const http = require("http");
const { spawn } = require("child_process");
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "tools", "shots", "love-deepspace-release");
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
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "capitalconvert-love-release-"));
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
    inspectFailure = () => evaluate("({url:location.href,title:document.title,exceptions:[],game:document.querySelector('#gamePanelLoveDeepspace')?.textContent.slice(0,3500)})");
    captureFailure = () => screenshot("failure");
    let preload;
    async function load(page, language = "en", fresh = true) {
      if (fresh) await send("Storage.clearDataForOrigin", { origin, storageTypes: "local_storage" });
      if (preload) await send("Page.removeScriptToEvaluateOnNewDocument", { identifier: preload });
      preload = (await send("Page.addScriptToEvaluateOnNewDocument", { source: `localStorage.setItem('lang',${JSON.stringify(language)});localStorage.setItem('motion-level','off')` })).identifier;
      await send("Page.navigate", { url: origin + "/" + page + "?game=love-deepspace" });
      await waitFor("!!document.querySelector('.ldr-gallery')", page + " release features");
      await evaluate("document.documentElement.setAttribute('data-motion','off')");
      check(page + " boots in " + language, await evaluate("CapitalConvert.currentLang") === language);
      await evaluate("[...document.querySelectorAll('button')].find(n=>/^(Later|稍后再说)$/.test(n.textContent.trim()))?.click()");
    }
    await resize(1100);
    for (const page of PAGES) {
      await load(page);
      check(page + " direct launch opens the game", await evaluate("!document.querySelector('#gamePanelLoveDeepspace').hidden&&!document.querySelector('#gameModal').hidden"));
      check(page + " includes gallery, journey and Starpath", await evaluate("!!document.querySelector('.ldr-gallery')&&!!document.querySelector('.ldr-journey')&&!!document.querySelector('[data-date=starpath]')"));
      await click('[data-starpath-tile="4"]');
      check(page + " landing puzzle is playable immediately", await evaluate("document.querySelector('.lsp-observatory').getAttribute('data-complete')==='true'"));
      await click(".lsp-controls [data-i18n=lspReset]");
      await click("#gameCloseBtn"); await click("#gameToggleBtn");
      await click('[data-starpath-tile="4"]');
      check(page + " puzzle remains playable after drawer reopen", await evaluate("document.querySelector('.lsp-observatory').getAttribute('data-complete')==='true'"));
    }
    await load("index.html");
    await click("[data-i18n=ldsGalleryTab]");
    const images = [], previews = [];
    for (const partner of PARTNERS) {
      await click('[data-partner="' + partner + '"].lds-partner-card');
      const entries = await evaluate(`[...document.querySelectorAll('.ldr-art-card')].map(n=>CapitalConvert.ldsSceneArt(${JSON.stringify(partner)},Number(n.getAttribute('data-art'))).src)`);
      check(partner + " has nine gallery artworks", entries.length === 9, entries.length);
      images.push(...entries);
      previews.push(...await evaluate("[...document.querySelectorAll('.ldr-art-card img')].map(n=>n.getAttribute('src'))"));
    }
    const decoded = await evaluate(`Promise.all(${JSON.stringify(images)}.map(src=>new Promise(resolve=>{const i=new Image();i.onload=()=>resolve({src,width:i.naturalWidth,height:i.naturalHeight});i.onerror=()=>resolve({src,width:0,height:0});i.src=src})))`);
    check("all 45 bundled artworks decode", decoded.length === 45 && decoded.every(item => item.width > 0 && item.height > 0), decoded.filter(item => !item.width));
    check("gallery images have distinct local paths", new Set(images).size === 45 && images.every(src => src.startsWith("assets/media/love-deepspace/")));
    const newArt = decoded.filter(item => /-scene-[5-8]\.(jpg|png)$/.test(item.src));
    check("all twenty new artworks are native Full HD or larger", newArt.length === 20 && newArt.every(item => Math.max(item.width, item.height) >= 1920), newArt);
    const previewPixels = await evaluate(`Promise.all(${JSON.stringify(previews)}.map(src=>new Promise(resolve=>{const i=new Image();i.onload=()=>resolve({width:i.naturalWidth,height:i.naturalHeight});i.onerror=()=>resolve({width:0,height:0});i.src=src})))`);
    const previewBytes = previews.reduce((sum, src) => sum + fs.statSync(path.join(ROOT, src)).size, 0);
    check("all 45 gallery previews decode and total less than 1 MB", previews.length === 45 && previews.every(src => src.includes("/thumbs/")) && previewPixels.every(item => item.width > 0 && Math.max(item.width, item.height) <= 480) && previewBytes < 1000000, previewBytes);
    await click('.ldr-art-card[data-art="6"]');
    check("Caleb's PNG original keeps its PNG download extension", await evaluate("document.querySelector('.ldr-view-download').download.endsWith('.png')&&document.querySelector('.ldr-view-download').getAttribute('href').endsWith('.png')"));
    await click(".ldr-view-close");
    await click('.lds-partner-card[data-partner="xavier"]');
    await click(".ldr-art-card");
    await waitFor("document.querySelector('.ldr-view-image').complete&&document.querySelector('.ldr-view-image').naturalWidth>0", "full-size viewer image");
    const viewer = await evaluate("(() => {const d=document.querySelector('.ldr-viewer'),i=d.querySelector('.ldr-view-image');return {open:!d.hidden,label:d.getAttribute('aria-label'),contain:getComputedStyle(i).objectFit,focused:d.contains(document.activeElement),width:i.naturalWidth,height:i.naturalHeight}})()");
    check("viewer opens an uncropped accessible image", viewer.open && !!viewer.label && viewer.contain === "contain" && viewer.focused, viewer);
    const before = await evaluate("document.querySelector('.ldr-view-image').src");
    await key("ArrowRight", "ArrowRight", 39);
    check("Right arrow advances the artwork", await evaluate("document.querySelector('.ldr-view-image').src") !== before);
    await key("ArrowLeft", "ArrowLeft", 37);
    check("Left arrow returns to the previous artwork", await evaluate("document.querySelector('.ldr-view-image').src") === before);
    await click(".ldr-view-favorite");
    check("a favourite has an announced selected state", await evaluate("document.querySelector('.ldr-view-favorite').getAttribute('aria-pressed')==='true'"));
    check("original artwork can be downloaded", await evaluate("document.querySelector('.ldr-view-download').hasAttribute('download')&&document.querySelector('.ldr-view-download').getAttribute('href').includes('assets/media/love-deepspace/')"));
    await evaluate("(() => {const z=document.querySelector('.ldr-view-zoom');z.value='4';z.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('.ldr-view-close').focus()})()");
    check("400% zoom has visible and announced detail magnification", await evaluate("document.querySelector('.ldr-view-zoom').value==='4'&&document.querySelector('.ldr-view-zoom').getAttribute('aria-valuetext')==='400%'&&document.querySelector('.ldr-view-zoom-value').textContent==='400%'"));
    await key("Tab", "Tab", 9);
    check("Tab reaches a real viewer control", await evaluate("document.activeElement.classList.contains('ldr-view-favorite')"));
    await key("Escape", "Escape", 27);
    check("Escape closes viewer and restores gallery focus", await evaluate("document.querySelector('.ldr-viewer').hidden&&document.activeElement.classList.contains('ldr-art-card')"));
    await evaluate("(() => {const s=document.querySelector('.ldr-gallery-filter');s.value='favorites';s.dispatchEvent(new Event('change',{bubbles:true}))})()");
    check("favourite filter keeps the selected artwork", await evaluate("[...document.querySelectorAll('.ldr-art-card')].filter(n=>!n.hidden).length===1"));
    await click('.lds-partner-card[data-partner="caleb"]');
    check("favourites belong to their selected partner", await evaluate("[...document.querySelectorAll('.ldr-art-card')].filter(n=>!n.hidden).length===0"));
    await click('.lds-partner-card[data-partner="xavier"]');
    await load("index.html", "en", false);
    await click("[data-i18n=ldsGalleryTab]");
    await evaluate("(() => {const s=document.querySelector('.ldr-gallery-filter');s.value='favorites';s.dispatchEvent(new Event('change',{bubbles:true}))})()");
    check("favourite persists across page reload", await evaluate("[...document.querySelectorAll('.ldr-art-card')].filter(n=>!n.hidden).length===1"));
    await screenshot("gallery-favourites-desktop");
    await click(".ldr-art-card"); await click(".ldr-view-photo");
    check("gallery artwork opens and focuses the photo studio", await evaluate("!document.querySelector('.lds-dates').hidden&&!document.querySelector('.lds-date-photo').hidden&&document.activeElement.classList.contains('lds-photo-canvas')"));
    await click(".lds-together-tab");
    check("journey presents six connected goals", await evaluate("document.querySelectorAll('.ldr-goal').length===6"));
    await click(".ldr-journey-details summary");
    await click('[data-goal="story"]');
    check("a Journey story goal opens the story activity", await evaluate("!document.querySelector('.lds-date-story').hidden"));
    for (let i = 0; i < 3; i++) await click(".lds-story-choices button");
    check("finishing a story updates its actual collection", await evaluate("JSON.parse(localStorage.getItem('love-deepspace-dates-v1')).stories.xavier.length>0"));
    check("Journey reflects the completed story", await evaluate("document.querySelector('[data-goal=story]').getAttribute('data-complete')==='true'"));
    await click('[data-goal="photo"]');
    await evaluate("(() => {const s=document.querySelector('.lds-photo-settings').querySelectorAll('select')[3];s.value='8';s.dispatchEvent(new Event('change',{bubbles:true}))})()");
    await waitFor("document.querySelector('.lds-photo-source').complete&&document.querySelector('.lds-photo-source').naturalWidth>0&&document.querySelector('.lds-photo-source').src.includes('-scene-8.jpg')", "loaded new photo source");
    await click("[data-i18n=ldsPhotoSave]");
    check("photo goal saves a real snapshot of the new artwork", await evaluate("(() => {const d=JSON.parse(localStorage.getItem('love-deepspace-dates-v1'));return d.snapshots.xavier===true&&d.photos[0].art===8})()"));
    check("Journey reflects the saved photograph", await evaluate("document.querySelector('[data-goal=photo]').getAttribute('data-complete')==='true'"));
    check("photo studio offers all nine artworks", await evaluate("document.querySelector('.lds-photo-settings').querySelectorAll('select')[3].options.length===9"));
    const photoFile = path.join(OUT, "starbond-xavier.png");
    if (fs.existsSync(photoFile)) fs.unlinkSync(photoFile);
    await send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: OUT }, null);
    await click("[data-i18n=ldsPhotoDownload]");
    for (let i = 0; i < 50 && !fs.existsSync(photoFile); i++) await pause(100);
    const photoBytes = fs.existsSync(photoFile) ? fs.readFileSync(photoFile) : Buffer.alloc(0);
    check("new artwork exports a real composed PNG", photoBytes.length > 10000 && photoBytes.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex")), photoBytes.length);
    await click('[data-goal="mission"]');
    await click("[data-i18n=ldsStrategyMode]");
    await evaluate("for(let n=0;n<10;n++){const c=document.querySelector('.lds-move.is-counter');if(!c||c.disabled)break;c.click()}");
    check("strategy route still completes and saves its memory", await evaluate("JSON.parse(localStorage.getItem('love-deepspace-album-v1')).memories['xavier:lds1']>0"));
    await click(".lds-together-tab");
    check("Journey reflects the route memory", await evaluate("document.querySelector('[data-goal=mission]').getAttribute('data-complete')==='true'"));
    await click('[data-goal="starpath"]');
    check("Starpath presents twelve unlockable constellations", await evaluate("document.querySelectorAll('[data-starpath-stage]').length===12"));
    await click('[data-starpath-stage="0"]');
    const oldBond = await evaluate("JSON.parse(localStorage.getItem('love-deepspace-album-v1')).bonds.xavier||0");
    await click('[data-starpath-tile="4"]');
    check("a legal rotation completes the first constellation", await evaluate("!document.querySelector('[data-starpath-stage=\"1\"]').disabled&&document.querySelector('[data-goal=starpath]').getAttribute('data-complete')==='true'"));
    const earnedBond = await evaluate("JSON.parse(localStorage.getItem('love-deepspace-album-v1')).bonds.xavier||0");
    check("a first constellation awards its collection affinity", earnedBond === oldBond + 2, { oldBond, earnedBond });
    await click(".lsp-controls [data-i18n=lspReset]"); await click('[data-starpath-tile="4"]');
    check("replaying a constellation cannot farm affinity", await evaluate("JSON.parse(localStorage.getItem('love-deepspace-album-v1')).bonds.xavier||0") === earnedBond);
    await screenshot("starpath-completed-desktop");
    await click('[data-date="cook"]');
    for (const ingredient of ["carrot", "mushroom", "herb"]) await click('[data-ingredient="' + ingredient + '"]');
    await click("[data-i18n=ldhStartHeat]");
    await pause(250);
    await click('[data-date="home"]');
    const heat = await evaluate("document.querySelector('.ldh-heat-meter').getAttribute('aria-valuenow')");
    await pause(250);
    check("leaving the kitchen pauses its heat", await evaluate("document.querySelector('.ldh-heat-meter').getAttribute('aria-valuenow')") === heat);
    await click('[data-date="cook"]'); await click("[data-i18n=ldhStartHeat]");
    await waitFor("Number(document.querySelector('.ldh-heat-meter').getAttribute('aria-valuenow'))>=54", "meal serving temperature");
    await click("[data-i18n=ldhServe]");
    check("a properly prepared meal updates the Journey", await evaluate("document.querySelector('[data-goal=cook]').getAttribute('data-complete')==='true'&&JSON.parse(localStorage.getItem('love-deepspace-home-v1')).homes.xavier.records.soup===3"));
    await load("index.html", "en", false);
    check("completed Journey goals survive reload", await evaluate("['photo','story','starpath','cook','mission'].every(id=>document.querySelector('[data-goal='+id+']').getAttribute('data-complete')==='true')"));
    await click('[data-date="focus"]'); await click(".lds-date-toolbar button");
    check("quality time starts only on player action", await evaluate("document.querySelector('.lds-dates').getAttribute('data-active')==='true'"));
    const other = await send("Target.createTarget", { url: "about:blank" }, null);
    await send("Target.activateTarget", { targetId: other.targetId }, null);
    await pause(200);
    const hiddenState = await evaluate("({hidden:document.hidden,paused:document.querySelector('.lds-dates').getAttribute('data-active')==='false',videoStopped:document.querySelector('.lds-scene-video').hidden})");
    check("hiding the browser tab pauses quality time", hiddenState.hidden && hiddenState.paused && hiddenState.videoStopped, hiddenState);
    await send("Target.activateTarget", { targetId: target.targetId }, null); await send("Page.bringToFront");
    await send("Target.closeTarget", { targetId: other.targetId }, null);
    check("returning to the tab keeps quality time paused", await evaluate("document.querySelector('.lds-dates').getAttribute('data-active')==='false'"));
    // Real layout in both languages/themes, including the full-artwork viewer.
    for (const language of ["en", "zh"]) {
      await load("index.html", language);
      for (const theme of ["dark", "light"]) {
        await evaluate(`document.documentElement.setAttribute('data-theme',${JSON.stringify(theme)})`);
        for (const width of [1100, 390, 320]) {
          await resize(width);
          for (const view of ["gallery", "dates"]) {
            await click(view === "gallery" ? "[data-i18n=ldsGalleryTab]" : ".lds-together-tab");
            if (view === "dates") await click('[data-date="starpath"]');
            const bounds = await evaluate("(() => {const p=document.querySelector('#gamePanelLoveDeepspace'),d=p.closest('.game-dialog');return {panelOverflow:p.scrollWidth-p.clientWidth,dialogOverflow:d.scrollWidth-d.clientWidth,textLeak:/undefined|NaN|\\[object Object\\]/.test(p.textContent)}})()");
            check(language + " " + theme + " " + width + " " + view + " fits", bounds.panelOverflow <= 2 && bounds.dialogOverflow <= 2 && !bounds.textLeak, bounds);
          }
          await click("[data-i18n=ldsGalleryTab]"); await click(".ldr-art-card");
          const bounds = await evaluate("(() => {const d=document.querySelector('.ldr-viewer');const b=d.getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,bottom:b.bottom,overflow:d.scrollWidth-d.clientWidth}})()");
          check(language + " " + theme + " " + width + " viewer fits", bounds.left >= -1 && bounds.right <= width + 1 && bounds.overflow <= 2, bounds);
          if (language === "zh" && theme === "dark") await screenshot("zh-gallery-viewer-" + width);
          if (width === 320) {
            await evaluate("(() => {const z=document.querySelector('.ldr-view-zoom');z.value='4';z.dispatchEvent(new Event('input',{bubbles:true}))})()");
            const magnified = await evaluate("(() => {const v=document.querySelector('.ldr-view-viewport'),d=document.querySelector('.ldr-viewer'),p=document.querySelector('#gamePanelLoveDeepspace');return {zoom:document.querySelector('.ldr-view-zoom').value,imageWidth:v.scrollWidth,viewportWidth:v.clientWidth,viewerOverflow:d.scrollWidth-d.clientWidth,panelOverflow:p.scrollWidth-p.clientWidth}})()");
            check(language + " " + theme + " 320px keeps 400% detail inside the image viewport", magnified.zoom === "4" && magnified.imageWidth >= magnified.viewportWidth * 3.9 && magnified.viewerOverflow <= 2 && magnified.panelOverflow <= 2, magnified);
          }
          await key("Escape", "Escape", 27);
        }
      }
      console.log("Checked release layouts in " + language + ".");
    }
    await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
    await evaluate("document.documentElement.setAttribute('data-motion','full')");
    await click(".lds-together-tab"); await click("[data-i18n=ldsWatch]");
    check("reduced motion prevents character video playback", await evaluate("document.querySelector('.lds-scene-video').hidden"));
    await evaluate("window.__ldsReleaseNativeSet=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new DOMException('Storage rejected for acceptance test','QuotaExceededError')}");
    await click('.lds-partner-card[data-partner="zayne"]'); await click(".lds-together-tab");
    check("unavailable storage is explained to the player", await evaluate("document.querySelector('.ldr-save-state').getAttribute('data-persistent')==='false'"));
    await click('[data-date="starpath"]'); await click('[data-starpath-stage="0"]'); await click('[data-starpath-tile="4"]');
    check("storage failure preserves playable session progress", await evaluate("(() => {const a=JSON.parse(CapitalConvert.storage.getItem('love-deepspace-album-v1'));return a.selected==='zayne'&&a.bonds.zayne===2&&document.querySelector('[data-goal=starpath]').getAttribute('data-complete')==='true'})()"));
    await evaluate("Storage.prototype.setItem=window.__ldsReleaseNativeSet;delete window.__ldsReleaseNativeSet");
    check("no uncaught browser exceptions", exceptions.length === 0, exceptions);
    fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify({ passed: results.length - failures.length, failed: failures.length, results, imageDimensions: decoded, exceptions }, null, 2));
    console.log("Release checks passed: " + (results.length - failures.length) + "; failed: " + failures.length);
    failures.forEach(item => console.log("FAIL " + item.label + ": " + JSON.stringify(item.detail)));
    console.log("Report: " + path.join(OUT, "report.json"));
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
    if (resolved.startsWith(tmpRoot) && path.basename(resolved).startsWith("capitalconvert-love-release-")) {
      try { fs.rmSync(resolved, { recursive: true, force: true }); } catch (_) { /* Browser lock may outlast termination. */ }
    }
  }
}
main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
