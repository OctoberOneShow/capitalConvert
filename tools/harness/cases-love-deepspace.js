"use strict";

const fs = require("fs");
const path = require("path");
const { createEnvironment, check, run } = require("./lib");
const source = ["i18n", "core", "game-campaign", "game-registry", "game-love-deepspace", "game-guide"]
  .map(name => fs.readFileSync(path.join(__dirname, "../../assets/app", name + ".js"), "utf8")).join("\n");
function boot(options) {
  const env = createEnvironment(options);
  env.load("window.CapitalConvert = { petNotifyGame: function () {} };");
  env.load(source);
  env.window.CapitalConvert.initRegistryGames();
  env.window.CapitalConvert.initGameGuides();
  return env;
}

run("Love and Deepspace turn rules", () => {
  const App = boot().window.CapitalConvert;
  const initial = { energy: 72, trust: 56, resonance: 0, turn: 0, chain: 0, charge: 0, done: false };
  const guard = App.ldsMoves.find(move => move.id === "guard");
  const focus = App.ldsMoves.find(move => move.id === "focus");
  const recover = App.ldsMoves.find(move => move.id === "recover");
  const route = App.ldsRoutes[3];
  const encounter = { ideal: "guard", pressure: 10 };
  const before = JSON.stringify(initial);
  const matched = App.ldsAdvance(initial, guard, App.ldsPartners[0], encounter, route);
  const missed = App.ldsAdvance(initial, focus, App.ldsPartners[0], encounter, route);
  check("Love and Deepspace turn rules", "resolution does not mutate its input", JSON.stringify(initial) === before);
  check("Love and Deepspace turn rules", "a counter charges Evol and starts a streak", matched.charge === 1 && matched.chain === 1 && matched.resonance === 19);
  check("Love and Deepspace turn rules", "a mismatch pays encounter pressure", missed.energy === 51 && missed.trust === 49 && missed.chain === 0);
  check("Love and Deepspace turn rules", "uncharged skills do nothing", App.ldsAdvance(initial, { id: "skill" }, App.ldsPartners[0], encounter, route) === initial);
  const restored = App.ldsAdvance({ ...initial, energy: 90, chain: 2, charge: 2 }, recover, App.ldsPartners[0], encounter, route);
  check("Love and Deepspace turn rules", "recovery costs a turn and caps energy", restored.turn === 1 && restored.energy === 100 && restored.gain.energy === 10);
  check("Love and Deepspace turn rules", "recovery breaks the streak without losing charge", restored.chain === 0 && restored.charge === 2 && restored.resonance === 0);
  const depleted = App.ldsAdvance({ ...initial, energy: 1, resonance: 90 }, focus, App.ldsPartners[0], encounter, route);
  check("Love and Deepspace turn rules", "zero energy retreats even after reaching the target", depleted.resonance >= route.target && depleted.outcome === "energy");
  const exhausted = App.ldsAdvance({ ...initial, turn: route.turns - 1 }, recover, App.ldsPartners[0], encounter, route);
  check("Love and Deepspace turn rules", "recovery cannot bypass the turn limit", exhausted.done && exhausted.outcome === "timeout");
  check("Love and Deepspace turn rules", "finished missions ignore further inputs", App.ldsAdvance(exhausted, guard, App.ldsPartners[0], encounter, route) === exhausted);

  App.ldsPartners.forEach(partner => {
    const skill = App.ldsAdvance({ ...initial, charge: 3 }, { id: "skill" }, partner, encounter, route);
    check("Love and Deepspace turn rules", partner.id + " has the correct charged skill", skill.turn === 1 && skill.charge === 0 && skill.gain.resonance === partner.skill.resonance);
    App.ldsRoutes.forEach(level => {
      let state = { ...initial };
      while (!state.done) { state = App.ldsAdvance(state, guard, partner, encounter, level); }
      check("Love and Deepspace turn rules", partner.id + " can clear " + level.id + " with legal counters", state.outcome === "win" && state.energy > 0 && state.turn <= level.turns);
    });
  });
});

run("Love and Deepspace saved album", () => {
  const App = boot().window.CapitalConvert;
  [null, "{broken", "null", "[]", '{"version":99}'].forEach(raw => {
    const album = App.ldsReadAlbum(raw);
    check("Love and Deepspace saved album", "invalid save recovers: " + raw, album.selected === "xavier" && Object.keys(album.memories).length === 0);
  });
  const save = App.ldsReadAlbum(JSON.stringify({ version: 1, selected: "caleb", bonds: { caleb: 99999, sylus: -5, zayne: "bad" }, memories: { "caleb:lds1": 5, "xavier:lds2": 2, "zayne:lds3": "bad", "unknown:lds9": 3 } }));
  check("Love and Deepspace saved album", "valid selected partner survives", save.selected === "caleb");
  check("Love and Deepspace saved album", "bond values are validated and bounded", save.bonds.caleb === 999 && save.bonds.sylus === 0 && save.bonds.zayne === undefined);
  check("Love and Deepspace saved album", "only known memories with numeric stars survive", Object.keys(save.memories).length === 2 && save.memories["caleb:lds1"] === 3);
});

run("Love and Deepspace mission and media lifecycle", () => {
  const env = boot();
  const App = env.window.CapitalConvert;
  const panel = env.byId("gamePanelLoveDeepspace");
  check("Love and Deepspace mission and media lifecycle", "shared guide mounts beside a nested hint", panel.querySelector(".game-guide").parentNode === panel.querySelector(".lds-mission"));
  const hud = () => Array.from(panel.querySelectorAll(".lds-stat strong")).map(el => el.textContent);
  const talk = panel.querySelector(".lds-scene-actions button");
  talk.click(); talk.click();
  check("Love and Deepspace mission and media lifecycle", "a quiet moment applies once per mission", hud()[2] === "60" && talk.disabled);
  let safety = 0;
  while (!panel.querySelector(".lds-move").disabled && safety++ < 10) { panel.querySelector(".lds-move.is-counter").click(); }
  const saved = JSON.parse(env.store.get("love-deepspace-album-v1"));
  check("Love and Deepspace mission and media lifecycle", "winning saves the lead partner's memory and bond", saved.memories["xavier:lds1"] >= 1 && saved.bonds.xavier === 2);
  check("Love and Deepspace mission and media lifecycle", "winning unlocks the next route", !panel.querySelectorAll(".lds-route-stop")[1].disabled);
  check("Love and Deepspace mission and media lifecycle", "completed encounter number never exceeds the turn limit", panel.querySelector(".lds-event strong").textContent === App.t("ldsMissionComplete"));
  panel.querySelectorAll(".lds-view-button")[1].click();
  check("Love and Deepspace mission and media lifecycle", "album shows one collected and three locked memories", panel.querySelector(".lds-mission").hidden && !panel.querySelector(".lds-album").hidden && panel.querySelectorAll(".lds-memory.is-unlocked").length === 1);
  panel.querySelectorAll(".lds-partner-card")[4].click();
  check("Love and Deepspace mission and media lifecycle", "changing partner updates scene and resets mission", panel.querySelector(".lds-scene").getAttribute("data-partner") === "caleb" && hud().join(",") === "6/6,72,56,0/62");
  check("Love and Deepspace mission and media lifecycle", "other partners cannot claim the collected memory", panel.querySelectorAll(".lds-memory.is-unlocked").length === 0);
  panel.querySelectorAll(".lds-view-button")[0].click();
  const video = panel.querySelector("video");
  let paused = 0;
  video.play = () => ({ catch() {} });
  video.pause = () => { paused++; };
  const watch = panel.querySelectorAll(".lds-scene-actions button")[1];
  watch.click();
  check("Love and Deepspace mission and media lifecycle", "animation starts only on explicit interaction", !video.hidden && watch.getAttribute("aria-pressed") === "true");
  App.quietResetLoveDeepspace();
  check("Love and Deepspace mission and media lifecycle", "drawer pause stops media and removes combat particles", video.hidden && paused > 0 && panel.querySelectorAll(".lds-effect").length === 0);
  env.setMotion("off"); watch.click();
  check("Love and Deepspace mission and media lifecycle", "motion-off blocks media playback", video.hidden && watch.getAttribute("aria-pressed") === "false");
  const reloaded = boot({ store: env.store });
  const restoredPanel = reloaded.byId("gamePanelLoveDeepspace");
  check("Love and Deepspace mission and media lifecycle", "selected partner and album survive reload", restoredPanel.querySelector(".lds-scene").getAttribute("data-partner") === "caleb" && JSON.parse(reloaded.store.get("love-deepspace-album-v1")).memories["xavier:lds1"] >= 1);
  ["absent", "readwrite-throw"].forEach(storageMode => {
    const blocked = boot({ storageMode });
    const p = blocked.byId("gamePanelLoveDeepspace");
    p.querySelectorAll(".lds-partner-card")[1].click();
    let count = 0;
    while (!p.querySelector(".lds-move").disabled && count++ < 10) { p.querySelector(".lds-move.is-counter").click(); }
    check("Love and Deepspace mission and media lifecycle", "blocked storage still allows mission completion: " + storageMode, p.querySelector(".game-result").textContent.includes("memory saved"));
  });
});
