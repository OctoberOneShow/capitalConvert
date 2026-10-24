"use strict";
const fs = require("fs");
const path = require("path");
const { createEnvironment, check, run } = require("./lib");
const source = ["i18n", "core", "love-deepspace-expedition"].map(name => fs.readFileSync(path.join(__dirname, "../../assets/app", name + ".js"), "utf8")).join("\n");
const key = "love-deepspace-expedition-v1";
const copy = value => JSON.parse(JSON.stringify(value));
function boot(options) { const env = createEnvironment(options); env.load(source); env.App = env.window.CapitalConvert; env.rules = env.App.ldsExpeditionRules; return env; }

/* Independently enumerate legal orders within one visible hand. This planner
 * knows no future cards or private target sequence: it only values surviving
 * the displayed intent, damage dealt, and held Evol. Browser acceptance can
 * use these commands through actual visible buttons as well. */
function planTurn(R, state) {
  let best = null; const seen = new Set();
  function visit(s, actions) {
    const signature = JSON.stringify([s.hp, s.energy, s.guard, s.charge, s.chain, s.hand, s.foe.hp, s.foe.guard, s.phase]);
    if (seen.has(signature)) return; seen.add(signature);
    const next = copy(s), terminal = next.phase !== "battle";
    if (!terminal) R.endTurn(next);
    const score = next.phase === "lost" ? -100000 : next.phase === "won" ? 100000 + next.hp * 3 + next.charge : next.phase === "draft" ? 50000 + next.hp * 3 + next.charge : next.hp * 3 - next.foe.hp * 2 + next.charge * .7;
    const candidate = { score, actions: terminal ? actions : actions.concat({ action: "end" }) };
    if (!best || score > best.score) best = candidate;
    if (terminal || actions.length > 5) return;
    for (let slot = 0; slot < 3; slot++) { const played = copy(s); if (R.play(played, slot)) visit(played, actions.concat({ action: "play", value: slot })); }
    const together = copy(s); if (R.skill(together)) visit(together, actions.concat({ action: "skill" }));
  }
  visit(copy(state), []); return best.actions;
}
function chooseFor(state, risk) { return state.phase === "draft" ? "lens" : state.phase === "route" ? risk && state.hp > 6 ? "rift" : "quiet" : risk && state.hp >= 30 ? "attune" : "rest"; }
function complete(R, state, risk) {
  let safety = 0;
  while (!["won", "lost"].includes(state.phase) && safety++ < 100) {
    if (state.phase !== "battle") { R.choose(state, chooseFor(state, risk)); continue; }
    for (const action of planTurn(R, state)) {
      const ok = action.action === "play" ? R.play(state, action.value) : action.action === "skill" ? R.skill(state) : R.endTurn(state);
      if (!ok) throw Error("Planner produced an illegal " + action.action);
    }
  }
  return state.phase === "won";
}
function mount(env, options) {
  const host = env.document.createElement("div"); env.document.body.appendChild(host);
  const rewards = [], moments = [];
  const game = env.App.mountLdsExpedition(host, Object.assign({ isHidden: () => false, onReward: (kind, token) => rewards.push([kind, token]), onMoment: moment => moments.push(moment) }, options));
  return { host, game, rewards, moments };
}
function completeUI(env, mounted, risk) {
  if (!mounted.game.inspect().started) mounted.host.querySelector('[data-expedition-action="start"]').click();
  let safety = 0;
  while (!['won', 'lost'].includes(mounted.game.inspect().state.phase) && safety++ < 100) {
    const state = mounted.game.inspect().state;
    if (state.phase !== "battle") { mounted.host.querySelector('[data-expedition-choice="' + chooseFor(state, risk) + '"]').click(); continue; }
    for (const action of planTurn(env.rules, state)) {
      const selector = action.action === "play" ? '[data-expedition-card="' + action.value + '"]' : '[data-expedition-action="' + action.action + '"]';
      mounted.host.querySelector(selector).click();
    }
  }
  return mounted.game.inspect().state.phase === "won";
}

run("Expedition legal decks and resource spending", () => {
  const { rules: R } = boot(), state = R.create("xavier", 0, 1), same = R.create("xavier", 0, 1);
  check("Expedition legal decks and resource spending", "the route and deck reproduce from a seed", JSON.stringify(state) === JSON.stringify(same));
  check("Expedition legal decks and resource spending", "invalid partner, tier and seed normalize to a legal first route", R.create("other", -1, NaN).partner === "xavier" && R.create("other", -1, NaN).tier === 0 && R.create("other", -1, NaN).seed === 1);
  const untouched = JSON.stringify(state);
  check("Expedition legal decks and resource spending", "invalid card indices and unavailable skill do not mutate resources", !R.play(state, -1) && !R.play(state, 1.5) && !R.play(state, 8) && !R.skill(state) && JSON.stringify(state) === untouched);
  state.hand = ["surge", "guard", "mend"]; state.hp = 30;
  R.play(state, 0); const afterSurge = copy(state);
  check("Expedition legal decks and resource spending", "a two-energy card spends exactly two and cannot be played twice", state.energy === 1 && state.charge === 1 && !R.play(state, 0) && JSON.stringify(state) === JSON.stringify(afterSurge));
  R.play(state, 1); const afterGuard = JSON.stringify(state);
  check("Expedition legal decks and resource spending", "insufficient energy cannot heal or add charge", state.energy === 0 && !R.play(state, 2) && state.hp === 30 && state.charge === 2 && JSON.stringify(state) === afterGuard);
  const focus = R.create("xavier", 0, 4); focus.hand = ["focus", "surge", "mend"]; focus.hp = 49; focus.charge = 4;
  R.play(focus, 0); R.play(focus, 1); R.play(focus, 2);
  check("Expedition legal decks and resource spending", "focus adds spendable energy, healing caps at max, Evol caps at four", focus.energy === 1 && focus.hp === 50 && focus.charge === 4);
  const combo = R.create("xavier", 0, 2); combo.foe.hp = combo.foe.maxHp = 50; combo.hand = ["strike", "strike", "guard"];
  R.play(combo, 0); R.play(combo, 1);
  const broken = R.create("xavier", 0, 2); broken.foe.hp = broken.foe.maxHp = 50; broken.hand = ["strike", "guard", "strike"];
  R.play(broken, 0); R.play(broken, 1); R.play(broken, 2);
  check("Expedition legal decks and resource spending", "consecutive attacks gain two; an intervening guard breaks the chain", combo.foe.hp === 34 && broken.foe.hp === 36);
});

run("Expedition telegraphs, skills and honest choices", () => {
  const { rules: R } = boot(), guarded = R.create("zayne", 2, 1);
  guarded.guard = 6; guarded.energy = 0; const predicted = R.intent(guarded); R.endTurn(guarded);
  check("Expedition telegraphs, skills and honest choices", "the displayed intent deals exactly the unguarded remainder then expires guard", predicted.attack === 8 && guarded.hp === 48 && guarded.guard === 0 && guarded.energy === 3 && guarded.hand.every(Boolean));
  guarded.battleTurn = 3; const peaceful = R.intent(guarded), before = guarded.hp; R.endTurn(guarded);
  check("Expedition telegraphs, skills and honest choices", "guard intent has no hidden attack and raises the stated shield", peaceful.attack === 0 && guarded.hp === before && guarded.foe.guard === peaceful.guard);
  const shielded = R.create("xavier", 0, 1); shielded.foe.guard = 10; shielded.hand[0] = "strike"; R.play(shielded, 0);
  check("Expedition telegraphs, skills and honest choices", "enemy shield honestly absorbs card damage", shielded.foe.hp === 18 && shielded.foe.guard === 3);
  const flame = R.create("rafayel", 2, 1); flame.foe.guard = 50; flame.charge = 4; R.skill(flame);
  check("Expedition telegraphs, skills and honest choices", "Rafayel pierces shields and spends four Evol", flame.foe.hp === 14 && flame.foe.guard === 50 && flame.charge === 0);
  const pact = R.create("sylus", 2, 1); pact.charge = 4; pact.hp = 3; const pactBefore = JSON.stringify(pact);
  check("Expedition telegraphs, skills and honest choices", "Sylus cannot spend the player's final three health", !R.skill(pact) && JSON.stringify(pact) === pactBefore);
  pact.hp = 4; R.skill(pact);
  check("Expedition telegraphs, skills and honest choices", "Sylus spends exactly three health when affordable", pact.hp === 1 && pact.charge === 0 && pact.foe.hp === 9);
  const route = R.create("caleb", 0, 1); route.phase = "route"; route.node = 1; route.hp = 6;
  const routeBefore = JSON.stringify(route);
  check("Expedition telegraphs, skills and honest choices", "an unaffordable rift and unknown choice leave state untouched", !R.choose(route, "rift") && !R.choose(route, "free-health") && JSON.stringify(route) === routeBefore);
  R.choose(route, "quiet");
  check("Expedition telegraphs, skills and honest choices", "the safe route heals eight and begins the elite encounter", route.hp === 14 && route.node === 2 && route.phase === "battle");
  const risky = R.create("caleb", 0, 1); risky.phase = "route"; risky.node = 1; risky.hp = 20; R.choose(risky, "rift");
  check("Expedition telegraphs, skills and honest choices", "risk pays health immediately for the promised lasting upgrade", risky.hp === 14 && risky.attackBonus === 2 && risky.charge === 2 && risky.risk);
  risky.phase = "camp"; risky.node = 3; R.choose(risky, "attune");
  check("Expedition telegraphs, skills and honest choices", "camp attunement heals six, fills Evol and adds one attack", risky.hp === 20 && risky.charge === 4 && risky.attackBonus === 3 && risky.node === 4);
});

run("Expedition all partners and difficulties are winnable", () => {
  const { rules: R } = boot();
  for (const partner of R.partners) for (let tier = 0; tier < 3; tier++) for (const seed of [0, 1, 7, 31]) {
    const state = R.create(partner, tier, seed), won = complete(R, state, seed === 7);
    check("Expedition all partners and difficulties are winnable", `${partner} tier${tier + 1} seed${seed} wins through legal visible-information decisions`, won && R.verify(state) && state.battles === 3 && state.perks.length === 2 && state.hp > 0 && R.stars(state) >= 1);
    if (seed === 1) check("Expedition all partners and difficulties are winnable", `${partner} tier${tier + 1} has an attainable three-star route`, R.stars(state) === 3);
    const stopped = JSON.stringify(state);
    check("Expedition all partners and difficulties are winnable", `${partner} tier${tier + 1} seed${seed} rejects inputs after completion`, !R.play(state, 0) && !R.skill(state) && !R.endTurn(state) && !R.choose(state, "lens") && JSON.stringify(state) === stopped);
  }
});

run("Expedition ratings and replay-validated records", () => {
  const { rules: R } = boot(), progress = R.read(null), state = R.create("xavier", 0, 1); complete(R, state);
  check("Expedition ratings and replay-validated records", "legal first clear grants a record and unlocks exactly the next tier", R.record(progress, state) && R.progress(progress, "xavier").cleared === 1 && R.progress(progress, "xavier").unlocked === 2);
  check("Expedition ratings and replay-validated records", "replaying a legal clear never reports a fresh reward", !R.record(progress, state) && R.progress(progress, "xavier").cleared === 1);
  const forged = copy(state); forged.hp++;
  const shortHistory = copy(state); shortHistory.history.pop();
  check("Expedition ratings and replay-validated records", "altered resources and truncated action histories cannot forge a record", !R.verify(forged) && !R.record(progress, forged) && !R.verify(shortHistory));
  const high = R.create("zayne", 2, 1); complete(R, high);
  check("Expedition ratings and replay-validated records", "a valid win cannot skip locked tiers", !R.record(progress, high) && R.progress(progress, "zayne").cleared === 0);
  const snapshot = R.progress(progress, "xavier"); snapshot.records[0].stars = 0; snapshot.stars[0] = 0;
  check("Expedition ratings and replay-validated records", "progress inspection is detached from saved records", R.progress(progress, "xavier").totalStars > 0);
  const rating = copy(state); rating.hp = 30; rating.turns = 15;
  check("Expedition ratings and replay-validated records", "three-star health and turn boundaries are inclusive", R.stars(rating) === 3);
  rating.hp = 29; check("Expedition ratings and replay-validated records", "one rating target awards two stars", R.stars(rating) === 2); rating.turns = 16;
  check("Expedition ratings and replay-validated records", "other victories award one star", R.stars(rating) === 1); rating.phase = "lost";
  check("Expedition ratings and replay-validated records", "defeat awards no stars", R.stars(rating) === 0);
  for (const raw of ["{broken", "null", '{"version":99,"partners":{"xavier":[{"stars":3,"turns":3}]}}', '{"version":1,"partners":{"xavier":[{"stars":4,"turns":3},{"stars":3,"turns":3}]}}', '{"version":1,"partners":{"xavier":[{"stars":3,"turns":-1}]}}', '{"version":1,"partners":{"xavier":[{"stars":0,"turns":0},{"stars":3,"turns":3}]}}']) {
    check("Expedition ratings and replay-validated records", "malformed or noncontiguous storage cannot unlock tiers: " + raw.slice(0, 35), R.progress(R.read(raw), "xavier").cleared === 0);
  }
  const defeated = R.create("xavier", 2, 1); let rounds = 0; while (defeated.phase === "battle" && rounds++ < 20) R.endTurn(defeated);
  check("Expedition ratings and replay-validated records", "ignoring attacks can lose, awards no record, and stops accepting battle actions", defeated.phase === "lost" && R.stars(defeated) === 0 && !R.record(progress, defeated) && !R.endTurn(defeated) && !R.play(defeated, 0));
});

run("Expedition visible controls, persistence and partner records", () => {
  const env = boot(), m = mount(env), stale = mount(env);
  check("Expedition visible controls, persistence and partner records", "three explicit tiers start at a clear briefing", m.host.querySelectorAll(".lxe-tier").length === 3 && !m.game.inspect().started && m.host.querySelector('[data-expedition-tier="1"]').disabled);
  check("Expedition visible controls, persistence and partner records", "a first expedition wins through actual card, skill, turn and choice buttons", completeUI(env, m) && m.rewards.length === 1 && m.moments.join() === "Win" && m.game.getProgress().cleared === 1);
  check("Expedition visible controls, persistence and partner records", "an already mounted view rereads records before first-clear settlement", completeUI(env, stale) && stale.rewards.length === 0);
  m.host.querySelector('[data-expedition-action="replay"]').click(); completeUI(env, m);
  check("Expedition visible controls, persistence and partner records", "replay preserves the first-clear reward count", m.rewards.length === 1);
  m.host.querySelector('[data-expedition-action="next"]').click(); completeUI(env, m); m.host.querySelector('[data-expedition-action="next"]').click(); completeUI(env, m);
  check("Expedition visible controls, persistence and partner records", "all tiers have separate once-only rewards and persistent stars", m.game.getProgress().cleared === 3 && m.rewards.length === 3 && new Set(m.rewards.map(r => r.join())).size === 3 && JSON.parse(env.store.get(key)).partners.xavier.every(r => r.stars > 0));
  m.game.setPartner({ id: "zayne", nameKey: "ldsPartnerZayne" }); completeUI(env, m);
  check("Expedition visible controls, persistence and partner records", "a different partner has an independent first tier and reward", m.game.getProgress().cleared === 1 && m.rewards.length === 4);
  m.game.setPartner({ id: "xavier", nameKey: "ldsPartnerXavier" });
  check("Expedition visible controls, persistence and partner records", "switching back restores that partner's full record", m.game.getProgress().cleared === 3);
  const reopened = mount(env);
  check("Expedition visible controls, persistence and partner records", "reopening loads the saved records", reopened.game.getProgress().cleared === 3);
  for (const storageMode of ["absent", "readwrite-throw"]) {
    const blocked = boot({ storageMode }), first = mount(blocked); completeUI(blocked, first); const second = mount(blocked); completeUI(blocked, second);
    check("Expedition visible controls, persistence and partner records", storageMode + " storage keeps in-session play and reward protection", first.game.getProgress().cleared === 1 && first.rewards.length === 1 && second.rewards.length === 0);
  }
});

run("Expedition pauses, hidden guards and translation", () => {
  const env = boot(); let hidden = true; const m = mount(env, { isHidden: () => hidden });
  m.host.querySelector('[data-expedition-action="start"]').click();
  check("Expedition pauses, hidden guards and translation", "a hidden activity cannot start", !m.game.inspect().started);
  hidden = false; m.game.refresh(); m.host.querySelector('[data-expedition-action="start"]').click();
  check("Expedition pauses, hidden guards and translation", "starting places keyboard focus on a playable card", env.document.activeElement && env.document.activeElement.getAttribute("data-expedition-card") !== null && !env.document.activeElement.disabled);
  const before = JSON.stringify(m.game.inspect().state); m.game.pause(); m.host.querySelector('[data-expedition-action="end"]').click();
  check("Expedition pauses, hidden guards and translation", "pause keeps the exact hand and rejects turn input", m.game.inspect().paused && JSON.stringify(m.game.inspect().state) === before);
  hidden = true; m.game.refresh(); m.host.querySelector('[data-expedition-action="resume"]').click();
  check("Expedition pauses, hidden guards and translation", "hidden refresh and resume cannot bypass pause", m.game.inspect().paused);
  hidden = false; m.host.querySelector('[data-expedition-action="resume"]').click();
  check("Expedition pauses, hidden guards and translation", "explicit visible resume restores the same hand", !m.game.inspect().paused && JSON.stringify(m.game.inspect().state) === before);
  env.setHidden(true); env.fireDocument("visibilitychange"); m.host.querySelector('[data-expedition-action="end"]').click(); env.setHidden(false);
  check("Expedition pauses, hidden guards and translation", "background visibility pauses without consuming a turn", m.game.inspect().paused && JSON.stringify(m.game.inspect().state) === before);
  m.game.refresh(); const inspected = m.game.inspect(); inspected.state.hp = 1;
  check("Expedition pauses, hidden guards and translation", "inspection cannot mutate live resources", m.game.inspect().state.hp === 50);
  m.host.hidden = true; m.host.querySelector('[data-expedition-action="end"]').click(); m.host.hidden = false;
  check("Expedition pauses, hidden guards and translation", "hidden host blocks otherwise enabled buttons", JSON.stringify(m.game.inspect().state) === before);
  const playable = [...m.host.querySelectorAll(".lxe-card")].find(button => !button.disabled); playable.click();
  check("Expedition pauses, hidden guards and translation", "playing a card moves focus to a usable control instead of a spent card", env.document.activeElement && !env.document.activeElement.disabled && !env.document.activeElement.hidden);
  const chinese = boot({ language: "zh-CN" }), translated = mount(chinese); translated.host.querySelector('[data-expedition-action="start"]').click();
  check("Expedition pauses, hidden guards and translation", "headings, card costs, intent and skill translate", translated.host.querySelector(".lxe-title").textContent === "星夜远征" && translated.host.querySelector(".lxe-card-cost").textContent.includes("能量") && translated.host.querySelector(".lxe-intent").textContent.includes("下次行动") && translated.host.querySelector(".lxe-skill").textContent.includes("星光会合"));
});

module.exports = { planTurn, chooseFor, complete };
if (require.main === module) { const lib = require("./lib"); console.log("Expedition checks passed: " + lib.passCount + "; failed: " + lib.failures.length); lib.failures.forEach(failure => console.log(failure)); process.exitCode = lib.failures.length ? 1 : 0; }
