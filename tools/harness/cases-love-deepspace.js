"use strict";

const fs = require("fs");
const path = require("path");
const { createEnvironment, check, run } = require("./lib");
const source = ["i18n", "core", "game-campaign", "game-registry", "love-deepspace-combat", "game-love-deepspace", "game-guide"]
  .map(name => fs.readFileSync(path.join(__dirname, "../../assets/app", name + ".js"), "utf8")).join("\n");
function boot(options, live) {
  const env = createEnvironment(options);
  if (live) {
    env.frames = new Map();
    let next = 1;
    env.window.requestAnimationFrame = fn => { const id = next++; env.frames.set(id, fn); return id; };
    env.window.cancelAnimationFrame = id => env.frames.delete(id);
    env.tick = (ms = 16) => {
      env.timers.advance(ms);
      const callbacks = Array.from(env.frames.values()); env.frames.clear();
      callbacks.forEach(fn => fn(env.window.performance.now()));
    };
  }
  env.load("window.CapitalConvert = { petNotifyGame: function () {} };");
  env.load(source);
  if (live) {
    const mount = env.window.CapitalConvert.mountLdsCombat;
    env.window.CapitalConvert.mountLdsCombat = (host, settings) => { env.combat = mount(host, settings); return env.combat; };
  }
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
  check("Love and Deepspace mission and media lifecycle", "shared guide mounts beside a nested hint", panel.querySelector(".game-guide").parentNode === panel.querySelector(".lds-strategy"));
  panel.querySelectorAll(".lds-mode-button")[1].click();
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
    p.querySelectorAll(".lds-mode-button")[1].click();
    p.querySelectorAll(".lds-partner-card")[1].click();
    let count = 0;
    while (!p.querySelector(".lds-move").disabled && count++ < 10) { p.querySelector(".lds-move.is-counter").click(); }
    check("Love and Deepspace mission and media lifecycle", "blocked storage still allows mission completion: " + storageMode, p.querySelector(".game-result").textContent.includes("memory saved"));
  });
});

run("Love and Deepspace arena rules", () => {
  const App = boot().window.CapitalConvert;
  const fresh = id => App.ldsCreateCombat(0, id || "xavier");
  const step = (s, input, n = 1) => { for (let i = 0; i < n; i++) App.ldsStepCombat(s, 1 / 60, input); };
  const straight = fresh(), diagonal = fresh();
  step(straight, { x: 1 }); step(diagonal, { x: 1, y: 1 });
  check("Love and Deepspace arena rules", "diagonal movement has the same speed", Math.abs(Math.hypot(diagonal.player.x - 400, diagonal.player.y - 310) - (straight.player.x - 400)) < 1e-6);
  step(straight, { x: 1, y: 1 }, 180);
  check("Love and Deepspace arena rules", "movement stays inside the arena", straight.player.x === 780 && straight.player.y === 420);
  const dodge = fresh(); dodge.player.invulnerable = 0;
  dodge.bullets = [{ x: 400, y: 300, vx: 0, vy: 135, life: 6 }];
  step(dodge, { dodge: true, x: 1 });
  check("Love and Deepspace arena rules", "a timed dodge grants charge, slows enemies, and prevents damage", dodge.dodges === 1 && dodge.charge === 16 && dodge.slow > 0 && dodge.player.hp === 100);
  const stamina = dodge.player.stamina;
  step(dodge, { dodge: true });
  check("Love and Deepspace arena rules", "dodge cooldown prevents repeat spending", dodge.player.stamina > stamina && dodge.dodges === 1);
  const low = fresh(); low.player.stamina = 0; step(low, { dodge: true });
  check("Love and Deepspace arena rules", "an empty stamina gauge prevents dodging", low.player.dash === 0);
  const uncharged = fresh(); step(uncharged, { ultimate: true });
  check("Love and Deepspace arena rules", "Evol needs a full charge", uncharged.ultimate === 0 && uncharged.enemies.every(e => e.hp === e.maxHp));
  App.ldsPartners.forEach(partner => {
    const skill = fresh(partner.id); skill.charge = 100; skill.player.hp = 50;
    skill.enemies.forEach(e => { e.hp = 300; e.maxHp = 300; });
    skill.bullets.push({ x: 10, y: 10, vx: 0, vy: 0, life: 5 });
    skill.hazards.push({ x: 10, y: 10, radius: 10, timer: 1 });
    const beforeX = skill.enemies[1].x;
    step(skill, { ultimate: true, aim: { x: 400, y: 180 } });
    check("Love and Deepspace arena rules", partner.id + " consumes charge and clears threats", skill.charge === 18 && !skill.bullets.length && !skill.hazards.length && skill.ultimate > 0);
    if (partner.id === "zayne") check("Love and Deepspace arena rules", "ice heals and freezes", skill.player.hp === 72 && skill.enemies.every(e => e.freeze > 2));
    if (partner.id === "sylus") check("Love and Deepspace arena rules", "energy siphon heals", skill.player.hp === 62);
    if (partner.id === "caleb") check("Love and Deepspace arena rules", "gravity gathers and freezes the formation", Math.abs(skill.enemies[1].x - 400) < Math.abs(beforeX - 400) && skill.enemies.every(e => e.freeze > 2));
    if (partner.id === "rafayel") {
      const hp = skill.enemies[0].hp; step(skill, {}, 30);
      check("Love and Deepspace arena rules", "flame burn deals damage over time", skill.enemies[0].hp < hp);
    }
  });
  const collision = fresh(); collision.player.invulnerable = 0;
  collision.bullets = [{ x: 365, y: 310, vx: 1400, vy: 0, life: 1 }];
  App.ldsStepCombat(collision, .05, {});
  check("Love and Deepspace arena rules", "swept collisions catch fast projectiles crossing the player", collision.player.hp === 91 && collision.bullets.length === 0);
  const timeout = fresh(); timeout.elapsed = 64.99; step(timeout, {});
  const snapshot = JSON.stringify(timeout); step(timeout, { attack: true, ultimate: true, x: 1 }, 60);
  check("Love and Deepspace arena rules", "timeout has no stars and ignores all later input", timeout.outcome === "timeout" && App.ldsCombatStars(timeout) === 0 && JSON.stringify(timeout) === snapshot);
  // Exercise every full mission using only reachable movement, attacks and skills.
  App.ldsPartners.forEach(partner => {
    for (let level = 0; level < 4; level++) {
      const s = App.ldsCreateCombat(level, partner.id);
      for (let frame = 0; frame < 4000 && !s.done; frame++) {
        const angle = s.elapsed * .7;
        const tx = 400 + Math.cos(angle) * 220, ty = 245 + Math.sin(angle) * 135;
        const vx = tx - s.player.x, vy = ty - s.player.y, length = Math.hypot(vx, vy);
        const threat = s.bullets.some(b => Math.hypot(b.x - s.player.x, b.y - s.player.y) < 55) ||
          s.hazards.some(h => h.timer < .25 && Math.hypot(h.x - s.player.x, h.y - s.player.y) < h.radius);
        step(s, { x: vx / Math.max(1, length), y: vy / Math.max(1, length), attack: true, dodge: threat, ultimate: s.charge >= 100 });
      }
      check("Love and Deepspace arena rules", partner.id + " can defeat waves and boss on route " + (level + 1), s.outcome === "win" && s.bossSpawned && s.kills === s.goal + 1 && s.elapsed < s.limit, s.outcome + ", " + s.elapsed.toFixed(1) + "s, HP " + s.player.hp);
      check("Love and Deepspace arena rules", "combat effects remain bounded", s.particles.length <= 120 && s.floats.length <= 24 && s.bullets.length <= 70 && s.bolts.length <= 36);
    }
  });
});

run("Love and Deepspace arena lifecycle", () => {
  const env = boot({}, true), combat = env.combat, root = combat.element;
  const panel = env.byId("gamePanelLoveDeepspace"); panel.hidden = false;
  const keys = (type, key) => env.dispatch(root, type, { key, target: root });
  check("Love and Deepspace arena lifecycle", "action is the default and waits for explicit start", !root.hidden && panel.querySelector(".lds-strategy").hidden && env.frames.size === 0);
  root.querySelector(".lds-battle-start").click();
  keys("keydown", "j"); keys("keydown", "d");
  for (let i = 0; i < 30; i++) env.tick();
  check("Love and Deepspace arena lifecycle", "held input moves and fires continuously", combat.state().player.x > 480 && combat.state().shots >= 3 && env.frames.size === 1);
  keys("keydown", "p"); const x = combat.state().player.x, elapsed = combat.state().elapsed;
  env.tick(500);
  check("Love and Deepspace arena lifecycle", "pause cancels animation and stops the clock", env.frames.size === 0 && combat.state().elapsed === elapsed && root.getAttribute("data-state") === "paused");
  combat.start(); env.tick();
  check("Love and Deepspace arena lifecycle", "resume clears held keys", combat.state().player.x === x);
  env.tick(1001);
  check("Love and Deepspace arena lifecycle", "background-sized frame gaps pause instead of advancing time", root.getAttribute("data-state") === "paused" && env.frames.size === 0);
  combat.start(); env.setHidden(true); env.tick(); env.setHidden(false);
  check("Love and Deepspace arena lifecycle", "a hidden document pauses its hunt", root.getAttribute("data-state") === "paused" && env.frames.size === 0);
  combat.start(); env.dispatch(root, "focusout", { relatedTarget: env.document.body });
  check("Love and Deepspace arena lifecycle", "leaving the arena clears inputs and pauses", env.frames.size === 0);
  combat.start(); env.window.CapitalConvert.quietResetLoveDeepspace();
  check("Love and Deepspace arena lifecycle", "drawer reset cancels the hunt loop", root.getAttribute("data-state") === "paused" && env.frames.size === 0);
  root.querySelector(".lds-small-button").click();
  const canvas = root.querySelector("canvas"); canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 440 });
  env.dispatch(canvas, "pointerdown", { pointerId: 1, button: 0, clientX: 730, clientY: 220 });
  const shots = combat.state().shots; for (let i = 0; i < 30; i++) env.tick();
  check("Love and Deepspace arena lifecycle", "holding pointer aim fires repeatedly", combat.state().shots >= shots + 2);
  env.dispatch(canvas, "pointercancel", { pointerId: 1 });
  const releasedShots = combat.state().shots; for (let i = 0; i < 20; i++) env.tick();
  check("Love and Deepspace arena lifecycle", "pointer cancellation stops firing", combat.state().shots === releasedShots);
  panel.querySelectorAll(".lds-partner-card")[1].click();
  check("Love and Deepspace arena lifecycle", "changing partner resets combat and cancels stale frames", combat.state().partner === "zayne" && combat.state().elapsed === 0 && env.frames.size === 0);
  combat.start(); combat.state().elapsed = 64.99; env.tick();
  check("Love and Deepspace arena lifecycle", "losing grants no memory or campaign star", combat.state().outcome === "timeout" && !env.store.has("love-deepspace-campaign") && !JSON.parse(env.store.get("love-deepspace-album-v1")).memories["zayne:lds1"]);
  combat.start();
  // Set up the final hit of an already cleared wave, then resolve it through the real controller.
  const state = combat.state(), boss = state.enemies[0];
  Object.assign(boss, { kind: "boss", x: state.player.x, y: state.player.y - 60, radius: 34, hp: 1, maxHp: 480, clock: 2, open: 1 });
  state.enemies = [boss]; state.bossSpawned = true; state.spawned = state.goal; state.kills = state.goal;
  keys("keydown", "j"); for (let i = 0; i < 20; i++) env.tick();
  const saved = JSON.parse(env.store.get("love-deepspace-album-v1"));
  check("Love and Deepspace arena lifecycle", "arena victory saves the selected partner memory and bond", state.outcome === "win" && saved.memories["zayne:lds1"] === 3 && saved.bonds.zayne === 2);
  check("Love and Deepspace arena lifecycle", "arena victory unlocks the next route", !panel.querySelectorAll(".lds-route-stop")[1].disabled && root.querySelector(".lds-arena-overlay").textContent.includes("memory saved"));
  const finalSave = env.store.get("love-deepspace-album-v1"); for (let i = 0; i < 30; i++) env.tick();
  check("Love and Deepspace arena lifecycle", "finished hunts cancel frames and award exactly once", env.frames.size === 0 && env.store.get("love-deepspace-album-v1") === finalSave);
  panel.querySelectorAll(".lds-mode-button")[1].click();
  check("Love and Deepspace arena lifecycle", "strategy stays available with combat stopped", root.hidden && !panel.querySelector(".lds-strategy").hidden && env.frames.size === 0);
  let turns = 0;
  while (!panel.querySelector(".lds-move").disabled && turns++ < 10) panel.querySelector(".lds-move.is-counter").click();
  const bestTurns = JSON.parse(env.store.get("love-deepspace-campaign")).cleared.lds1.best;
  panel.querySelectorAll(".lds-mode-button")[0].click(); combat.start(); combat.start();
  check("Love and Deepspace arena lifecycle", "repeated start never duplicates the animation loop", env.frames.size === 1);
  const stick = root.querySelector(".lds-joystick"), fire = root.querySelector(".lds-battle-fire");
  stick.getBoundingClientRect = () => ({ left: 0, top: 0, width: 80, height: 80 });
  env.dispatch(stick, "pointerdown", { pointerId: 3, clientX: 76, clientY: 40 });
  env.dispatch(fire, "pointerdown", { pointerId: 4 });
  for (let i = 0; i < 30; i++) env.tick();
  check("Love and Deepspace arena lifecycle", "two touch pointers can move and fire simultaneously", combat.state().player.x > 480 && combat.state().shots >= 3);
  env.dispatch(stick, "pointercancel", { pointerId: 3 });
  const touchX = combat.state().player.x, touchShots = combat.state().shots;
  for (let i = 0; i < 30; i++) env.tick();
  check("Love and Deepspace arena lifecycle", "releasing movement leaves the other touch firing", combat.state().player.x === touchX && combat.state().shots > touchShots);
  env.dispatch(fire, "lostpointercapture", { pointerId: 4 });
  const stoppedShots = combat.state().shots; for (let i = 0; i < 30; i++) env.tick();
  check("Love and Deepspace arena lifecycle", "lost fire capture stops held fire", combat.state().shots === stoppedShots);
  env.setMotion("off"); combat.state().charge = 100; keys("keydown", "e"); env.tick();
  check("Love and Deepspace arena lifecycle", "motion-off preserves skills while suppressing cut-ins", combat.state().ultimate > 0 && root.querySelector(".lds-battle-cutin").hidden);
  const last = combat.state(), lastBoss = env.window.CapitalConvert.ldsCreateCombat(0, "zayne").enemies[0];
  Object.assign(lastBoss, { kind: "boss", x: last.player.x, y: last.player.y - 60, radius: 34, hp: 1, maxHp: 480, clock: 2, open: 1 });
  last.enemies = [lastBoss]; last.bossSpawned = true; last.spawned = last.goal; last.kills = last.goal; last.player.hp = 10;
  keys("keydown", "j"); for (let i = 0; i < 20; i++) env.tick();
  const progress = JSON.parse(env.store.get("love-deepspace-campaign")).cleared.lds1;
  check("Love and Deepspace arena lifecycle", "a weaker arena win preserves the best stars and strategy turn record", last.outcome === "win" && progress.stars === 3 && progress.best === bestTurns && bestTurns > 0);
});

run("Love and Deepspace arena translations", () => {
  const helper = fs.readFileSync(path.join(__dirname, "../../assets/app/love-deepspace-combat.js"), "utf8");
  const keys = new Set(Array.from(helper.matchAll(/"(lds[A-Z][a-zA-Z]+)"/g), match => match[1]));
  keys.delete("ldsBattlePerk"); keys.delete("ldsCombatInstructions");
  for (const language of ["en-US", "zh-CN"]) {
    const App = boot({ language }).window.CapitalConvert;
    for (const key of keys) check("Love and Deepspace arena translations", language + " resolves " + key, App.t(key) !== key && !App.t(key).includes("undefined"));
  }
});

if (require.main === module) {
  const lib = require("./lib");
  lib.caseResults.forEach(result => console.log((result.failed ? "FAIL" : "PASS") + "  " + result.name + " (" + result.checks + " checks)"));
  lib.failures.forEach(failure => console.error(failure));
  console.log("Passed: " + lib.passCount + "; failed: " + lib.failures.length);
  process.exitCode = lib.failures.length ? 1 : 0;
}
