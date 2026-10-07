"use strict";

const fs = require("fs");
const path = require("path");
const { createEnvironment, check, run } = require("./lib");
const source = ["i18n", "core", "game-campaign", "game-registry", "love-deepspace-combat", "love-deepspace-home", "love-deepspace-dates", "game-love-deepspace", "game-guide"]
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
    const mountDates = env.window.CapitalConvert.mountLdsDates;
    env.window.CapitalConvert.mountLdsDates = (host, settings) => { env.dates = mountDates(host, settings); return env.dates; };
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
  panel.querySelectorAll(".lds-view-button")[0].click();
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
  panel.querySelectorAll(".lds-view-button")[0].click();
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

run("Love and Deepspace date saves", () => {
  const App = boot().window.CapitalConvert;
  for (const raw of [null, "{bad", "null", "[]", '{"version":99}']) {
    const save = App.ldsReadDates(raw);
    check("Love and Deepspace date saves", "invalid save recovers every partner", App.ldsPartners.every(p => save.plushies[p.id].length === 0 && save.focus[p.id] === 0));
  }
  const save = App.ldsReadDates(JSON.stringify({ version: 1, plushies: { xavier: ["rabbit", "rabbit", "unknown"], zayne: "cat" }, badges: { xavier: true, zayne: "true" },
    focus: { xavier: 99999, zayne: -8, caleb: "5" }, stories: { xavier: ["quiet", "unknown", "quiet"] }, snapshots: { caleb: true },
    photos: [{ partner: "xavier", scene: "night", frame: "stars", zoom: 999, pan: -9 }, { partner: "unknown", scene: "night", frame: "stars" }, { partner: "zayne", scene: "bad", frame: "stars" }] }));
  check("Love and Deepspace date saves", "plushies and endings are known, deduplicated IDs", save.plushies.xavier.join() === "rabbit" && save.stories.xavier.join() === "quiet" && !save.plushies.zayne.length);
  check("Love and Deepspace date saves", "counts and flags are validated", save.focus.xavier === 999 && save.focus.zayne === 0 && save.focus.caleb === 0 && save.badges.xavier && !save.badges.zayne);
  check("Love and Deepspace date saves", "photographs are bounded and validated", save.photos.length === 1 && save.photos[0].zoom === 1.8 && save.photos[0].pan === 0 && save.snapshots.xavier && save.snapshots.caleb);
});

run("Love and Deepspace claw rules", () => {
  const App = boot().window.CapitalConvert;
  const step = (s, input, frames = 1) => { for (let i = 0; i < frames; i++) App.ldsStepClaw(s, 1 / 60, input); };
  for (const partner of App.ldsPartners) {
    const s = App.ldsCreateClaw(partner.id); let events = [];
    for (let i = 0; i < 5; i++) {
      // Anticipate the conveyor position when the descending claw reaches it.
      const x = 100 + i * 100 + Math.sin((s.elapsed + .84) * (1.2 + i * .1) + i) * 32;
      step(s, { aim: x, drop: true });
      check("Love and Deepspace claw rules", "a drop uses an attempt before delivering its reward", s.attempts === 4 - i && s.phase === "drop" && s.caught.length === i);
      for (let f = 0; f < 160 && !s.done; f++) { step(s, {}); events.push(...s.events); }
    }
    check("Love and Deepspace claw rules", partner.id + " can collect every moving plushie with legal timing", s.done && new Set(s.caught).size === 5 && s.attempts === 0);
    check("Love and Deepspace claw rules", "each delivery emits one collection event", events.filter(e => e.kind === "catch").length === 5);
    const snapshot = JSON.stringify(s); step(s, { x: 1, drop: true, help: true }, 100);
    check("Love and Deepspace claw rules", "a completed claw session ignores extra actions", JSON.stringify(s) === snapshot);
  }
  const helped = App.ldsCreateClaw("zayne"); step(helped, { help: true });
  const positions = helped.toys.map(toy => toy.x).join(); step(helped, { help: true }, 60);
  check("Love and Deepspace claw rules", "assist freezes plushies without repeated extension", positions === helped.toys.map(toy => toy.x).join() && helped.help < 1.1 && helped.helped);
  step(helped, { help: true }, 120);
  check("Love and Deepspace claw rules", "the conveyor resumes after the one-use assist", helped.help === 0 && positions !== helped.toys.map(toy => toy.x).join());
  step(helped, { x: -1 }, 300);
  check("Love and Deepspace claw rules", "claw movement is constrained to its rail", helped.x === 50);
  const missed = App.ldsCreateClaw("caleb"); step(missed, { aim: 50, drop: true });
  for (let f = 0; f < 160; f++) step(missed, {});
  check("Love and Deepspace claw rules", "misaligned drops consume attempts without a reward", missed.attempts === 4 && missed.caught.length === 0 && missed.phase === "aim");
});

function bestKitty(App, state) {
  let best = { value: -1 };
  state.cups.forEach((cup, ci) => { if (cup.owner !== null) return; state.hand.forEach((card, hi) => {
    const value = card.value * (card.color === cup.color ? 2 : 1);
    if (value > best.value) best = { value, ci, hi };
  }); });
  state.selected = best.hi;
  return best.ci;
}
run("Love and Deepspace Kitty Cards", () => {
  const App = boot().window.CapitalConvert;
  const s = App.ldsCreateKitty("sylus", true);
  s.hand[0] = { value: 6, color: 0 }; s.selected = 0;
  check("Love and Deepspace Kitty Cards", "matching card colour doubles the score", App.ldsKittyPlay(s, 0, true) && s.score[0] === 12 && s.cups[0].shield && !s.assist[0]);
  const before = JSON.stringify(s);
  check("Love and Deepspace Kitty Cards", "a player cannot act during the opponent turn", !App.ldsKittyPlay(s, 1) && JSON.stringify(s) === before);
  App.ldsKittyPartner(s);
  check("Love and Deepspace Kitty Cards", "a shield protects a high-value card from the partner assist", s.cups[0].card.value === 6 && s.assist[1]);
  check("Love and Deepspace Kitty Cards", "occupied cups cannot be overwritten and shields cannot be repeated", !App.ldsKittyPlay(s, 0) && !App.ldsKittyAssist(s, 0));
  s.hand[0] = { value: 5, color: 1 }; s.selected = 0;
  const empty = s.cups.findIndex(cup => cup.owner === null); App.ldsKittyPlay(s, empty); App.ldsKittyPartner(s);
  check("Love and Deepspace Kitty Cards", "the partner uses its nudge once on an unshielded card", !s.assist[1] && s.cups[empty].card.value === 3 && s.cups[0].card.value === 6);
  for (const advanced of [false, true]) {
    let wins = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const match = App.ldsCreateKitty("rafayel", advanced, seed);
      for (let turn = 0; turn < 6 && !match.done; turn++) {
        App.ldsKittyPlay(match, bestKitty(App, match), advanced && turn === 0);
        if (!match.done) App.ldsKittyPartner(match);
      }
      if (match.winner === "you") wins++;
      check("Love and Deepspace Kitty Cards", "all seeded matches complete with 12 occupied cups", match.done && match.cups.filter(c => c.owner === "you").length === 6 && match.cups.filter(c => c.owner === "partner").length === 6);
      const snapshot = JSON.stringify(match); App.ldsKittyPlay(match, 0); App.ldsKittyPartner(match);
      check("Love and Deepspace Kitty Cards", "finished card matches cannot change score", JSON.stringify(match) === snapshot);
    }
    check("Love and Deepspace Kitty Cards", "player strategy can win " + (advanced ? "advanced" : "normal") + " matches", wins > 0);
  }
});

run("Love and Deepspace date native focus", () => {
  const env = boot({}, true), dates = env.dates, root = dates.element;
  env.byId("gamePanelLoveDeepspace").hidden = false;
  let focusStayed = 0; root.focus = () => { focusStayed++; };
  dates.select("kitty");
  root.querySelector(".lds-kitty-cup").click();
  check("Love and Deepspace date native focus", "placing a card keeps focus inside before disabling cups", focusStayed === 1 && dates.inspect().active && dates.inspect().kitty.turn === "partner");
  for (let i = 0; i < 45; i++) env.tick();
  check("Love and Deepspace date native focus", "the partner automatically replies and returns enabled cups", dates.inspect().kitty.turn === "you" && dates.inspect().kitty.cups.filter(c => c.owner === "partner").length === 1 && root.querySelectorAll(".lds-kitty-cup").some(c => !c.disabled));
  dates.pause(); dates.select("claw"); dates.start();
  let machineFocus = 0; root.querySelector(".lds-claw-machine").focus = () => { machineFocus++; };
  root.querySelector(".lds-claw-controls").querySelectorAll("button")[1].click(); env.tick();
  check("Love and Deepspace date native focus", "the drop button transfers focus before becoming disabled", machineFocus === 1 && dates.inspect().active && dates.inspect().claw.phase === "drop");
});

run("Love and Deepspace date activities", () => {
  const env = boot({}, true), App = env.window.CapitalConvert, dates = env.dates, root = dates.element;
  const panel = env.byId("gamePanelLoveDeepspace"); panel.hidden = false;
  const bonds = () => JSON.parse(env.store.get("love-deepspace-album-v1") || '{"bonds":{}}').bonds.xavier || 0;
  const key = (type, value) => env.dispatch(root, type, { key: value, target: root });
  check("Love and Deepspace date activities", "landing view foregrounds character and dates without starting any loop", panel.getAttribute("data-view") === "dates" && !root.hidden && env.frames.size === 0 && panel.classList.contains("lds-character-focus"));
  panel.querySelector(".lds-game-picker-button").click();
  check("Love and Deepspace date activities", "the player can restore the shared game picker", !panel.classList.contains("lds-character-focus"));
  dates.start(); key("keydown", "d"); for (let i = 0; i < 30; i++) env.tick();
  check("Love and Deepspace date activities", "held movement moves the real claw", dates.inspect().claw.x > 390 && env.frames.size === 1);
  key("keydown", "p"); const x = dates.inspect().claw.x, elapsed = dates.inspect().claw.elapsed; env.tick(500);
  check("Love and Deepspace date activities", "pausing cancels the loop and stops the conveyor clock", dates.inspect().paused && env.frames.size === 0 && dates.inspect().claw.elapsed === elapsed);
  dates.start(); env.tick();
  check("Love and Deepspace date activities", "resume clears held movement", dates.inspect().claw.x === x);
  dates.pause(); root.querySelector(".lds-date-toolbar").querySelectorAll("button")[1].click();
  dates.start(); const machine = root.querySelector(".lds-claw-machine"); machine.getBoundingClientRect = () => ({ left: 0, top: 0, width: 600, height: 320 });
  env.dispatch(machine, "pointerdown", { pointerId: 1, clientX: 300 }); env.dispatch(machine, "pointerup", { pointerId: 1 }); key("keydown", "e"); key("keydown", " ");
  for (let i = 0; i < 165; i++) env.tick();
  check("Love and Deepspace date activities", "a successful animated drop saves a plushie and affection", dates.inspect().progress.plushies.xavier.includes("fox") && bonds() === 2);
  dates.select("story");
  check("Love and Deepspace date activities", "switching activities stops the old simulation", env.frames.size === 0);
  for (let i = 0; i < 3; i++) root.querySelector(".lds-story-choice").click();
  check("Love and Deepspace date activities", "three story choices save one ending and affection", dates.inspect().progress.stories.xavier.includes("quiet") && bonds() === 4);
  check("Love and Deepspace date activities", "a completed story exposes its replay control", !root.querySelector(".lds-date-toolbar").hidden);
  root.querySelector(".lds-date-toolbar").querySelectorAll("button")[1].click();
  for (let i = 0; i < 3; i++) root.querySelector(".lds-story-choice").click();
  check("Love and Deepspace date activities", "replaying an ending cannot farm affinity", bonds() === 4);
  root.querySelector(".lds-date-toolbar").querySelectorAll("button")[1].click();
  for (let i = 0; i < 3; i++) root.querySelectorAll(".lds-story-choice")[1].click();
  check("Love and Deepspace date activities", "both branches can be collected", dates.inspect().progress.stories.xavier.length === 2 && bonds() === 6);
  dates.select("photo"); const photoSave = root.querySelector(".lds-photo-actions button");
  for (let i = 0; i < 15; i++) photoSave.click();
  check("Love and Deepspace date activities", "photo gallery stays capped and rewards the first snapshot once", dates.inspect().progress.photos.length === 12 && bonds() === 8 && root.querySelectorAll(".lds-photo-thumb").length === 12);
  const canvas = root.querySelector(".lds-photo-canvas"); canvas.getBoundingClientRect = () => ({ width: 400, height: 400 });
  env.dispatch(canvas, "pointerdown", { pointerId: 2, clientX: 100 }); env.dispatch(canvas, "pointermove", { pointerId: 2, clientX: 200 }); env.dispatch(canvas, "pointerup", { pointerId: 2 });
  photoSave.click();
  check("Love and Deepspace date activities", "dragging actually changes the saved photo composition", dates.inspect().progress.photos[0].pan < .62 && bonds() === 8);
  const modeNames = ["claw", "kitty", "story", "photo", "focus"];
  modeNames.forEach(mode => { dates.select(mode); check("Love and Deepspace date activities", "only the chosen activity is visible: " + mode, root.querySelectorAll(".lds-date-page").filter(p => !p.hidden).length === 1); });
  dates.start(); env.tick(1001);
  check("Love and Deepspace date activities", "a background gap pauses quality time", dates.inspect().focusElapsed === 0 && dates.inspect().paused && !env.frames.size);
  dates.start(); env.tick(500);
  check("Love and Deepspace date activities", "quality time measures visible wall time even when frames are slow", dates.inspect().focusElapsed === .5);
  env.dispatch(root, "focusout", { relatedTarget: panel.querySelectorAll(".lds-scene-actions button")[1] });
  check("Love and Deepspace date activities", "character animation controls can be used during quality time", dates.inspect().active && env.frames.size === 1);
  for (let i = 0; i < 3755; i++) env.tick();
  check("Love and Deepspace date activities", "completing one minute saves a focus session and stops its loop", dates.inspect().progress.focus.xavier === 1 && bonds() === 10 && env.frames.size === 0);
  const reloaded = boot({ store: env.store }, true);
  check("Love and Deepspace date activities", "date keepsakes, snapshots and bonds survive reload", reloaded.dates.inspect().progress.plushies.xavier.includes("fox") && reloaded.dates.inspect().progress.stories.xavier.length === 2 && reloaded.dates.inspect().progress.photos.length === 12 && reloaded.dates.inspect().progress.snapshots.xavier && JSON.parse(reloaded.store.get("love-deepspace-album-v1")).bonds.xavier === 10);
  dates.select("claw"); dates.start(); App.quietResetLoveDeepspace();
  check("Love and Deepspace date activities", "drawer close cancels date animations", dates.inspect().paused && !env.frames.size);
  panel.querySelectorAll(".lds-partner-card")[4].click();
  check("Love and Deepspace date activities", "changing partner clears live input and selects the correct collection", dates.inspect().claw.partner === "caleb" && !dates.inspect().progress.plushies.caleb.length && !env.frames.size);
  App.applyI18nDom();
  check("Love and Deepspace date activities", "translation refresh preserves nested photo and timer controls", root.querySelectorAll(".lds-photo-settings select").length === 4 && root.querySelector(".lds-focus-duration select") !== null);
  for (const storageMode of ["absent", "readwrite-throw"]) {
    const blocked = boot({ storageMode }, true); blocked.dates.select("story");
    for (let i = 0; i < 3; i++) blocked.dates.element.querySelector(".lds-story-choice").click();
    check("Love and Deepspace date activities", "blocked storage still allows date completion: " + storageMode, blocked.dates.inspect().progress.stories.xavier.includes("quiet"));
  }
});

run("Love and Deepspace advanced claw", () => {
  const App = boot().window.CapitalConvert;
  for (const partner of App.ldsPartners) {
    const state = App.ldsCreateClaw(partner.id, true);
    for (let prize = 0; prize < 5; prize++) {
      const x = 100 + prize * 100 + Math.sin((state.elapsed + .84) * 1.7 * (1.2 + prize * .1) + prize) * 42;
      App.ldsStepClaw(state, 1 / 60, { aim: x, drop: true });
      let guard = 0;
      while (!state.done && state.phase !== "aim" && guard++ < 300) App.ldsStepClaw(state, 1 / 60, { grip: state.phase === "grip" && state.phaseTime >= .4 });
    }
    check("Love and Deepspace advanced claw", partner.id + " has a winnable precision challenge with five perfect catches", state.done && state.caught.length === 5 && state.score === 1125 && state.combo === 5);
  }
  const miss = App.ldsCreateClaw("xavier", true);
  App.ldsStepClaw(miss, .05, { aim: 300, help: true, drop: true });
  while (miss.phase !== "grip") App.ldsStepClaw(miss, .05);
  App.ldsStepClaw(miss, .05, { grip: true });
  while (miss.phase !== "aim") App.ldsStepClaw(miss, .05);
  check("Love and Deepspace advanced claw", "an early grip misses without collecting or scoring", !miss.caught.length && miss.score === 0 && miss.combo === 0 && miss.toys.every(t => !t.taken));
  const timeout = App.ldsCreateClaw("xavier", true);
  App.ldsStepClaw(timeout, .05, { aim: 300, help: true, drop: true });
  while (timeout.phase !== "grip") App.ldsStepClaw(timeout, .05);
  timeout.phaseTime = .4; App.ldsStepClaw(timeout, .05, { grip: true }); timeout.remaining = .01;
  App.ldsStepClaw(timeout, .05);
  check("Love and Deepspace advanced claw", "timeout releases an undelivered prize and awards nothing", timeout.done && !timeout.caught.length && timeout.score === 0 && timeout.toys.every(t => !t.taken));
  const env = boot({}, true), dates = env.dates, root = dates.element;
  env.byId("gamePanelLoveDeepspace").hidden = false;
  const checkbox = root.querySelector(".lds-date-claw input"); checkbox.checked = true; env.dispatch(checkbox, "change"); dates.start();
  const state = dates.inspect().claw; state.score = 450; state.remaining = .001; env.tick();
  check("Love and Deepspace advanced claw", "challenge completion persists the best record and stops frames", !env.frames.size && dates.inspect().progress.clawBest.xavier === 450 && JSON.parse(env.store.get("love-deepspace-dates-v1")).clawBest.xavier === 450);
  root.querySelector(".lds-date-toolbar").querySelectorAll("button")[1].click(); dates.start(); dates.inspect().claw.remaining = .001; env.tick();
  check("Love and Deepspace advanced claw", "weaker results preserve the existing record", dates.inspect().progress.clawBest.xavier === 450);
});

run("Love and Deepspace card tactics", () => {
  const App = boot().window.CapitalConvert, state = App.ldsCreateKitty("xavier", true, 7321);
  state.assist[1] = false; state.tactics[1] = 0; state.hand[0] = { value: 4, color: 0 };
  App.ldsKittyPlay(state, 0); App.ldsKittyPartner(state);
  check("Love and Deepspace card tactics", "boost changes the score but keeps the player's placement turn", App.ldsKittyTactic(state, "boost", 0) && state.score[0] === 12 && state.turn === "you" && state.tactics[0] === 1);
  const snapshot = JSON.stringify(state);
  check("Love and Deepspace card tactics", "an illegal boost consumes no charge", !App.ldsKittyTactic(state, "boost", 11) && JSON.stringify(state) === snapshot);
  check("Love and Deepspace card tactics", "rotating colour changes the matching multiplier", App.ldsKittyTactic(state, "repaint", 0) && state.score[0] === 6 && !state.tactics[0]);
  check("Love and Deepspace card tactics", "tactics cannot be used after charges run out", !App.ldsKittyTactic(state, "redraw"));
  const fresh = App.ldsCreateKitty("xavier", true, 21), before = JSON.stringify(fresh.hand);
  check("Love and Deepspace card tactics", "redraw replaces the selected card and spends one action", App.ldsKittyTactic(fresh, "redraw") && fresh.tactics[0] === 1 && JSON.stringify(fresh.hand) !== before && fresh.turn === "you");
  fresh.cups[0] = { owner: "partner", color: 0, card: { value: 6, color: 0 }, shield: true };
  check("Love and Deepspace card tactics", "shielded opponent cups block colour sabotage", !App.ldsKittyTactic(fresh, "repaint", 0) && fresh.tactics[0] === 1);
  const opponent = App.ldsCreateKitty("zayne", true, 11); App.ldsKittyPlay(opponent, 0); App.ldsKittyPartner(opponent);
  check("Love and Deepspace card tactics", "the partner uses a beneficial tactic and spends its own budget", opponent.tactics[1] === 1 && opponent.events.some(e => ["boost", "repaint"].includes(e.kind)));
  const env = boot({}, true), dates = env.dates, root = dates.element; env.byId("gamePanelLoveDeepspace").hidden = false;
  const advanced = root.querySelector(".lds-date-kitty input"); advanced.checked = true; env.dispatch(advanced, "change"); dates.select("kitty");
  root.querySelector(".lds-kitty-tactics button").click();
  check("Love and Deepspace card tactics", "the real redraw control updates the match without starting a background loop", dates.inspect().kitty.tactics[0] === 1 && !env.frames.size);
});

run("Love and Deepspace character gallery", () => {
  const env = boot({}, true), App = env.window.CapitalConvert, panel = env.byId("gamePanelLoveDeepspace"); panel.hidden = false;
  const hashes = new Set(), crypto = require("crypto");
  for (const partner of App.ldsPartners) {
    panel.querySelectorAll(".lds-partner-card").find(p => p.getAttribute("data-partner") === partner.id).click();
    for (let index = 0; index < 5; index++) {
      const art = App.ldsSceneArt(partner.id, index), file = path.join(__dirname, "../..", art.src);
      const pixels = fs.readFileSync(file); hashes.add(crypto.createHash("sha256").update(pixels).digest("hex"));
      check("Love and Deepspace character gallery", partner.id + " scene " + index + " exists with actual image bytes", pixels.length > 10000 && (index ? pixels.subarray(0, 2).toString("hex") === "ffd8" : pixels.subarray(0, 4).toString() === "RIFF"));
      panel.querySelectorAll(".lds-art-thumb")[index].click();
      check("Love and Deepspace character gallery", partner.id + " scene " + index + " switches both hero and photograph", panel.querySelector(".lds-scene-portrait").src === art.src && panel.querySelector(".lds-photo-source").src === art.src && panel.querySelectorAll('.lds-art-thumb[aria-pressed="true"]').length === 1);
    }
  }
  check("Love and Deepspace character gallery", "all 25 portraits and artworks are distinct images", hashes.size === 25);
  const reloaded = boot({ store: env.store }, true);
  check("Love and Deepspace character gallery", "scene choices are restored per partner", Object.values(App.ldsReadLooks(env.store.get("love-deepspace-looks-v1")).scenes).every(i => i === 4) && reloaded.byId("gamePanelLoveDeepspace").querySelector(".lds-scene").getAttribute("data-art") === "4");
  const parsed = App.ldsReadLooks('{"version":1,"auto":false,"scenes":{"xavier":999,"zayne":2}}');
  check("Love and Deepspace character gallery", "appearance saves validate indexes and the reaction preference", parsed.scenes.xavier === 3 && parsed.scenes.zayne === 2 && !parsed.auto);
  const auto = panel.querySelector(".lds-art-auto input"); auto.checked = false; env.dispatch(auto, "change"); env.dates.select("story"); const root = env.dates.element;
  root.querySelector(".lds-story-choice").click();
  check("Love and Deepspace character gallery", "disabling reactions preserves the chosen scene during play", panel.querySelector(".lds-scene").getAttribute("data-art") === "4");
  env.dates.select("photo"); root.querySelector(".lds-photo-actions button").click();
  check("Love and Deepspace character gallery", "saved snapshots include the selected character artwork", env.dates.inspect().progress.photos[0].art === 4);
});

run("Love and Deepspace heart-to-heart journal", () => {
  const env = boot({}, true), App = env.window.CapitalConvert;
  const panel = env.byId("gamePanelLoveDeepspace"), root = env.dates.element;
  const voices = new Set();
  for (const partner of App.ldsPartners) {
    panel.querySelectorAll(".lds-partner-card").find(n => n.getAttribute("data-partner") === partner.id).click();
    env.dates.select("chat");
    for (const mood of ["happy", "tired", "worried"]) {
      for (const choice of [0, 1]) {
        root.querySelector('[data-mood="' + mood + '"]').click();
        const first = root.querySelector(".lds-chat-bubble").textContent; voices.add(first);
        root.querySelector('[data-chat-choice="' + choice + '"]').click();
        check("Love and Deepspace heart-to-heart journal", partner.id + " " + mood + " branch " + choice + " adds its own response", root.querySelector(".lds-chat-bubble").textContent.length > first.length && !root.querySelector(".lds-chat-bubble").textContent.includes("undefined"));
        check("Love and Deepspace heart-to-heart journal", partner.id + " keeps the completed choice", env.dates.inspect().progress.journal.some(n => n.partner === partner.id && n.mood === mood && n.choice === choice));
      }
    }
  }
  check("Love and Deepspace heart-to-heart journal", "all 15 character and mood responses are distinct", voices.size === 15);
  check("Love and Deepspace heart-to-heart journal", "journal storage stays bounded", env.dates.inspect().progress.journal.length === 20);
  const pin = root.querySelector(".lds-chat-pin"); pin.click();
  const pinned = env.dates.inspect().progress.journal.find(n => n.favorite);
  check("Love and Deepspace heart-to-heart journal", "a favourite saves without starting an animation loop", !!pinned && root.querySelector(".lds-chat-pin").getAttribute("aria-pressed") === "true" && env.frames.size === 0);
  root.querySelector(".lds-chat-replay").click();
  check("Love and Deepspace heart-to-heart journal", "saved conversations replay without adding entries", env.dates.inspect().progress.journal.length === 20 && root.querySelector(".lds-chat-replies").hidden);
  const again = boot({store: env.store, language: "zh-CN"}, true);
  again.byId("gamePanelLoveDeepspace").querySelectorAll(".lds-partner-card").find(n => n.getAttribute("data-partner") === pinned.partner).click();
  again.dates.select("chat"); again.dates.element.querySelector(".lds-chat-replay").click();
  check("Love and Deepspace heart-to-heart journal", "reloading preserves favourites and replays in Chinese", again.dates.inspect().progress.journal.some(n => n.favorite) && /[\u4e00-\u9fff]/.test(again.dates.element.querySelector(".lds-chat-bubble").textContent));
  const malformed = App.ldsReadDates(JSON.stringify({version:1,journal:[{partner:"unknown",mood:"happy",choice:0},{partner:"xavier",mood:"happy",choice:99},{partner:"zayne",mood:"tired",choice:1,favorite:true},{partner:"zayne",mood:"tired",choice:1}]}));
  check("Love and Deepspace heart-to-heart journal", "invalid and duplicate journal records are rejected", malformed.journal.length === 1 && malformed.journal[0].favorite);
  check("Love and Deepspace heart-to-heart journal", "old saves remain compatible", App.ldsReadDates('{"version":1}').journal.length === 0);
});

run("Love and Deepspace home and cooking", () => {
  const env = boot({}, true), App = env.window.CapitalConvert, panel = env.byId("gamePanelLoveDeepspace"), root = env.dates.element;
  panel.hidden = false;
  for (const recipe of App.ldsHomeRecipes) {
    const meal = App.ldsCreateCooking(recipe.id);
    App.ldsCookingAction(meal, "serve");
    check("Love and Deepspace home and cooking", recipe.id + " cannot be served before preparation", meal.phase === "prep");
    recipe.items.forEach(id => App.ldsCookingAction(meal, "add:" + id));
    App.ldsCookingAction(meal, "heat");
    while (meal.heat < (recipe.target[0] + recipe.target[1]) / 2) App.ldsStepCooking(meal, .05);
    App.ldsCookingAction(meal, "serve");
    check("Love and Deepspace home and cooking", recipe.id + " earns three stars with the intended ingredients and heat", meal.phase === "done" && meal.stars === 3);
    const miss = App.ldsCreateCooking(recipe.id); App.ldsCookingAction(miss, "add:unknown");
    check("Love and Deepspace home and cooking", recipe.id + " rejects a wrong ingredient without skipping preparation", miss.prepared === 0 && miss.mistakes === 1);
    recipe.items.forEach(id => App.ldsCookingAction(miss, "add:" + id)); App.ldsCookingAction(miss, "heat"); App.ldsCookingAction(miss, "assist");
    App.ldsStepCooking(miss, .1); const slower = miss.heat; App.ldsCookingAction(miss, "assist");
    check("Love and Deepspace home and cooking", recipe.id + " companion help slows heat once", slower < recipe.speed * .1 && miss.helped && miss.assist < 1.8);
    App.ldsCookingAction(miss, "pause"); App.ldsStepCooking(miss, 2);
    check("Love and Deepspace home and cooking", recipe.id + " holds heat while paused", miss.heat === slower);
    App.ldsCookingAction(miss, "heat"); while (miss.phase === "heating") App.ldsStepCooking(miss, .1);
    check("Love and Deepspace home and cooking", recipe.id + " overheats and stops with no stars", miss.phase === "done" && miss.stars === 0);
  }
  for (const partner of App.ldsPartners) {
    panel.querySelectorAll(".lds-partner-card").find(n => n.getAttribute("data-partner") === partner.id).click(); env.dates.select("cook");
    for (const recipe of App.ldsHomeRecipes) {
      root.querySelectorAll(".ldh-options button").find(n => n.getAttribute("data-i18n") === recipe.key).click();
      recipe.items.forEach(id => root.querySelector('[data-ingredient="' + id + '"]').click());
      root.querySelector('[data-i18n="ldhStartHeat"]').click();
      while (env.dates.inspect().home.cooking.heat < (recipe.target[0] + recipe.target[1]) / 2) env.tick(16);
      root.querySelector('[data-i18n="ldhServe"]').click();
      check("Love and Deepspace home and cooking", partner.id + " " + recipe.id + " saves a playable three-star meal", env.dates.inspect().home.progress.homes[partner.id].records[recipe.id] === 3 && env.frames.size === 0);
    }
    env.dates.select("home");
    const trophy = root.querySelectorAll(".ldh-inventory button").find(n => n.textContent.includes(App.t("ldhChef")));
    check("Love and Deepspace home and cooking", partner.id + " unlocks the trophy by completing three meals", trophy && !trophy.disabled);
    trophy.click(); root.querySelectorAll(".ldh-options button").find(n => n.getAttribute("data-i18n") === "ldhNight").click();
    check("Love and Deepspace home and cooking", partner.id + " saves its own room light and trophy", env.dates.inspect().home.progress.homes[partner.id].theme === "night" && env.dates.inspect().home.progress.homes[partner.id].slots[0] === "chef");
  }
  const beforeBond = App.ldsReadAlbum(env.store.get("love-deepspace-album-v1")).bonds.caleb;
  env.dates.select("cook"); root.querySelector('[data-i18n="ldhNewMeal"]').click();
  App.ldsHomeRecipes[2].items.forEach(id => root.querySelector('[data-ingredient="' + id + '"]').click()); root.querySelector('[data-i18n="ldhStartHeat"]').click();
  env.tick(16); const held = env.dates.inspect().home.cooking.heat;
  env.dates.select("home"); env.tick(500);
  check("Love and Deepspace home and cooking", "switching activities stops the stove and preserves heat", env.frames.size === 0 && env.dates.inspect().home.cooking.heat === held && env.dates.inspect().home.cooking.phase === "paused");
  env.dates.select("cook"); root.querySelector('[data-i18n="ldhStartHeat"]').click(); while (env.dates.inspect().home.cooking.heat < 70) env.tick(16); root.querySelector('[data-i18n="ldhServe"]').click();
  check("Love and Deepspace home and cooking", "replaying a recipe doesn't farm affinity", App.ldsReadAlbum(env.store.get("love-deepspace-album-v1")).bonds.caleb === beforeBond);
  const reload = boot({store:env.store}, true);
  check("Love and Deepspace home and cooking", "rooms and meal records survive reload for all five partners", Object.values(reload.dates.inspect().home.progress.homes).every(h => h.theme === "night" && h.slots[0] === "chef" && Object.values(h.records).every(n => n === 3)));
  const invalid = App.ldsReadHome('{"version":1,"homes":{"xavier":{"theme":"bad","slots":["__proto__","invalid"],"records":{"soup":99,"toast":-3}}}}');
  check("Love and Deepspace home and cooking", "corrupt decoration and score data are normalized", invalid.homes.xavier.theme === "sunset" && invalid.homes.xavier.slots[0] === "plant" && invalid.homes.xavier.records.soup === 0);
  const helper = fs.readFileSync(path.join(__dirname,"../../assets/app/love-deepspace-home.js"),"utf8");
  const keys = new Set(Array.from(helper.matchAll(/"(ldh[A-Z][A-Za-z0-9]+|ldsDateHome|ldsDateCook)"/g), m=>m[1]));
  for (const language of ["en-US","zh-CN"]) { const translated = boot({language}).window.CapitalConvert; for (const key of keys) check("Love and Deepspace home and cooking", language + " resolves " + key, translated.t(key) !== key); }
});

run("Love and Deepspace four-shot strips", () => {
  const env = boot({},true), App = env.window.CapitalConvert, root = env.dates.element;
  env.byId("gamePanelLoveDeepspace").hidden = false; env.dates.select("photo");
  const sourceImage = root.querySelector(".lds-photo-source"); sourceImage.complete = true; sourceImage.naturalWidth = 600; sourceImage.naturalHeight = 800; env.dispatch(sourceImage,"load");
  const capture = root.querySelector('[data-i18n="ldsStripCapture"]');
  for (let i=0;i<4;i++) capture.click();
  check("Love and Deepspace four-shot strips", "four captures save exactly one strip and stop capture", env.dates.inspect().progress.strips.length === 1 && env.dates.inspect().stripShots.length === 4 && capture.disabled);
  const saved = App.ldsReadDates(env.store.get("love-deepspace-dates-v1"));
  check("Love and Deepspace four-shot strips", "shot settings persist and unlock the photo keepsake", saved.strips[0].shots.length === 4 && saved.snapshots.xavier);
  root.querySelector('[data-i18n="ldsStripNew"]').click(); root.querySelector(".lds-strip-gallery button").click();
  check("Love and Deepspace four-shot strips", "saved strips reopen without duplicate rewards", env.dates.inspect().stripShots.length === 4 && env.dates.inspect().progress.strips.length === 1);
  env.dates.select("home"); root.querySelector('[data-decoration="photo"]').click();
  check("Love and Deepspace four-shot strips", "a captured strip becomes a photograph on the room shelf", root.querySelector(".ldh-room-photo img").src === App.ldsSceneArt("xavier", saved.strips[0].shots[0].art).src && env.dates.inspect().home.progress.homes.xavier.slots[0] === "photo");
  const reloaded = boot({store:env.store},true); reloaded.dates.select("home");
  check("Love and Deepspace four-shot strips", "the earned room photograph survives reload", !!reloaded.dates.element.querySelector(".ldh-room-photo img"));
  const bad = App.ldsReadDates(JSON.stringify({version:1,strips:[{partner:"bad",shots:[]},{partner:"xavier",shots:[{}, {}, {}, {}]}]}));
  check("Love and Deepspace four-shot strips", "invalid photo strips are rejected", bad.strips.length === 0);
  check("Love and Deepspace four-shot strips", "old saves open with an empty strip album", App.ldsReadDates('{"version":1}').strips.length === 0);
});

run("Love and Deepspace date translations", () => {
  const helper = fs.readFileSync(path.join(__dirname, "../../assets/app/love-deepspace-dates.js"), "utf8");
  const keys = new Set(Array.from(helper.matchAll(/"(lds[A-Z][a-zA-Z0-9]+)"/g), match => match[1]));
  for (const prefix of ["ldsDate", "ldsToy", "ldsKittyColor", "ldsStoryReply", "ldsStoryScene", "ldsStoryChoice", "ldsPhoto", "ldsPartner", "ldsDateLine", "ldsTactic"]) keys.delete(prefix);
  for (const language of ["en-US", "zh-CN"]) {
    const App = boot({ language }).window.CapitalConvert;
    for (const key of keys) check("Love and Deepspace date translations", language + " resolves " + key, App.t(key) !== key && !App.t(key).includes("undefined"));
  }
});

if (require.main === module) {
  const lib = require("./lib");
  lib.caseResults.forEach(result => console.log((result.failed ? "FAIL" : "PASS") + "  " + result.name + " (" + result.checks + " checks)"));
  lib.failures.forEach(failure => console.error(failure));
  console.log("Passed: " + lib.passCount + "; failed: " + lib.failures.length);
  process.exitCode = lib.failures.length ? 1 : 0;
}
