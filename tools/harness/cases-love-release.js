"use strict";
const fs = require("fs"), path = require("path");
const { createEnvironment, check, run } = require("./lib");
const names = ["i18n", "core", "game-campaign", "game-registry", "love-deepspace-combat", "love-deepspace-home", "love-deepspace-release", "love-deepspace-starpath", "love-deepspace-dates", "game-love-deepspace"];
const source = names.map(name => fs.readFileSync(path.join(__dirname, "../../assets/app", name + ".js"), "utf8")).join("\n");
function boot(options) {
  const env = createEnvironment(options); env.load("window.CapitalConvert={petNotifyGame:function(){}};"); env.load(source);
  env.window.CapitalConvert.initRegistryGames(); env.panel = env.byId("gamePanelLoveDeepspace"); env.panel.hidden = false;
  return env;
}
run("Love release save compatibility", () => {
  const env = boot(), App = env.window.CapitalConvert;
  for (const raw of [null, "{bad", "[]", '{"version":9}']) {
    const save = App.ldsReadGallery(raw);
    check("Love release save compatibility", "corrupt favorites recover: " + raw, Object.values(save.favorites).every(list => list.length === 0));
  }
  const favorite = App.ldsReadGallery('{"version":1,"favorites":{"xavier":[0,8,8,9,-1,"3",null],"caleb":[6,7],"unknown":[1]}}');
  check("Love release save compatibility", "favorites reject duplicates, invalid indexes and unknown partners", favorite.favorites.xavier.join() === "0,8" && !favorite.favorites.unknown && favorite.favorites.caleb.join() === "6,7");
  const dates = App.ldsReadDates(JSON.stringify({version:1, photos:[{partner:"caleb",scene:"night",frame:"stars",art:8}], strips:[{partner:"caleb",shots:Array.from({length:4},()=>({scene:"night",frame:"stars",art:6}))}]}));
  check("Love release save compatibility", "new PNG artwork survives snapshot and photo-strip saves", dates.photos[0].art === 8 && dates.strips[0].shots.every(shot => shot.art === 6));
  check("Love release save compatibility", "legacy looks and expanded looks both survive", App.ldsReadLooks('{"version":1,"scenes":{"xavier":4,"caleb":8}}').scenes.caleb === 8 && App.ldsReadLooks('{"version":1,"scenes":{"xavier":4}}').scenes.xavier === 4);
  check("Love release save compatibility", "PNG originals use their actual extension", App.ldsSceneArt("caleb", 6).src.endsWith(".png") && App.ldsSceneArt("caleb", 5).src.endsWith(".jpg"));
  for (const storageMode of ["absent", "readwrite-throw"]) {
    const blocked = boot({storageMode}), p = blocked.panel;
    check("Love release save compatibility", storageMode + " clearly announces session-only progress", p.querySelector(".ldr-save-state").getAttribute("data-persistent") === "false");
    p.querySelector('[data-i18n="ldsGalleryTab"]').click(); p.querySelector('.ldr-art-card[data-art="8"]').click(); p.querySelector(".ldr-view-favorite").click();
    check("Love release save compatibility", storageMode + " still supports favorites during this session", JSON.parse(blocked.window.CapitalConvert.storage.getItem("love-deepspace-gallery-v1")).favorites.xavier[0] === 8);
  }
});
run("Love release authentic journey progress", () => {
  const App = boot().window.CapitalConvert, partner = App.ldsPartners[0];
  const album = {memories:{"caleb:lds1":3}}, dates = {snapshots:{caleb:true}, stories:{caleb:["quiet"]}, badges:{caleb:true}};
  check("Love release authentic journey progress", "another partner's collections do not complete this journey", App.ldsJourneyGoals(partner,album,dates,{},{}).every(goal=>!goal.done));
  check("Love release authentic journey progress", "an empty room save is harmless", !App.ldsJourneyGoals(partner,album,dates,{homes:{xavier:{}}},{}).find(goal=>goal.id==="cook").done);
  album.memories["xavier:lds1"]=1; dates.snapshots.xavier=true; dates.stories.xavier=["quiet"]; dates.badges.xavier=true;
  const completed = App.ldsJourneyGoals(partner,album,dates,{homes:{xavier:{records:{soup:2}}}},{cleared:1});
  check("Love release authentic journey progress", "all six goals derive from existing collections", completed.length === 6 && completed.every(goal=>goal.done));
  const env = boot(); env.panel.querySelector(".ldr-journey-continue").click();
  check("Love release authentic journey progress", "recommendation opens and focuses the first unfinished activity", !env.panel.querySelector(".lds-date-photo").hidden && env.panel.querySelector(".lds-date-photo").contains(env.document.activeElement));
});
run("Love release gallery controls and hidden media", () => {
  const env = boot(), p = env.panel;
  check("Love release gallery controls and hidden media", "landing foregrounds playable Starpath", !p.querySelector(".lds-date-starpath").hidden && p.querySelector('[data-date="starpath"]').getAttribute("aria-pressed") === "true");
  p.querySelector('[data-i18n="ldsGalleryTab"]').click();
  check("Love release gallery controls and hidden media", "gallery view isolates a complete nine-artwork collection", p.getAttribute("data-view") === "gallery" && p.querySelectorAll(".ldr-art-card").length === 9 && p.querySelector(".lds-dates").hidden);
  p.querySelector('.ldr-art-card[data-art="8"]').click();
  env.dispatch(p.querySelector(".ldr-viewer"), "keydown", {key:"ArrowRight"});
  check("Love release gallery controls and hidden media", "keyboard wraps to the first original", p.querySelector(".ldr-viewer").getAttribute("data-art") === "0");
  env.dispatch(p.querySelector(".ldr-viewer"), "keydown", {key:"Escape"});
  check("Love release gallery controls and hidden media", "closing viewer focuses the rebuilt opening card", env.document.activeElement.getAttribute("data-art") === "8" && env.document.activeElement.parentNode === p.querySelector(".ldr-gallery-grid"));
  p.querySelector('.lds-partner-card[data-partner="caleb"]').click(); p.querySelector('.ldr-art-card[data-art="8"]').click();
  check("Love release gallery controls and hidden media", "download preserves PNG format in its filename", p.querySelector(".ldr-view-download").download.endsWith(".png"));
  p.querySelector('.lds-together-tab').click(); env.setMotion("full");
  const video = p.querySelector("video"); let pauses = 0; video.play = () => ({catch(){}}); video.pause = () => {pauses++;};
  p.querySelector('[data-i18n="ldsWatch"]').click(); const before = pauses;
  env.setHidden(true); env.fireDocument("visibilitychange");
  check("Love release gallery controls and hidden media", "hiding the browser pauses and conceals the playing video", video.hidden && pauses > before);
  env.setHidden(false); env.fireDocument("visibilitychange");
  check("Love release gallery controls and hidden media", "returning never restarts media without an explicit action", video.hidden);
});
run("Love release bilingual copy", () => {
  const helper = fs.readFileSync(path.join(__dirname,"../../assets/app/love-deepspace-release.js"),"utf8");
  const keys = [...helper.matchAll(/\b(ldr[A-Za-z]+|ldsGalleryTab):\s*\[/g)].map(m=>m[1]);
  for (const language of ["en-US","zh-CN"]) {
    const App = boot({language}).window.CapitalConvert;
    for (const key of keys) check("Love release bilingual copy", language+" resolves "+key, App.t(key)!==key && !App.t(key).includes("undefined"));
  }
});
if (require.main === module) {
  const lib=require("./lib"); console.log("Release checks passed: "+lib.passCount+"; failed: "+lib.failures.length);
  lib.failures.forEach(message=>console.error(message)); process.exitCode=lib.failures.length?1:0;
}
