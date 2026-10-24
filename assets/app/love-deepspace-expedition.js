/* An original, untimed signal-card expedition. Every resource change is a
 * replayable rule action; records accept only a complete legal expedition. */
(function (App) {
  "use strict";
  var partners = ["xavier", "zayne", "rafayel", "sylus", "caleb"];
  var storageKey = "love-deepspace-expedition-v1";
  var cards = {
    strike: { cost: 1, attack: 7 }, surge: { cost: 2, attack: 13 },
    pulse: { cost: 1, attack: 4, guard: 4 }, guard: { cost: 1, guard: 8 },
    ward: { cost: 1, guard: 5, heal: 3 }, mend: { cost: 1, heal: 7 },
    focus: { cost: 0, energy: 1 }
  };
  var skills = {
    xavier: { attack: 11, guard: 4 }, zayne: { guard: 10, heal: 7 },
    rafayel: { attack: 16, pierce: true }, sylus: { attack: 21, healthCost: 3 },
    caleb: { attack: 9, guard: 9 }
  };
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function validTier(n) { return Number.isInteger(n) && n >= 0 && n < 3; }
  function heal(state, amount) { var before = state.hp; state.hp = Math.min(state.maxHp, state.hp + amount); return state.hp - before; }
  function draw(state) {
    /* Three balanced signal piles, not a random all-defense hand. The seed
     * changes their order and rotation without removing the attack outlet. */
    var n = state.seed + partners.indexOf(state.partner) * 11 + state.tier * 7 + state.node * 3 + state.battleTurn;
    var hand = [["strike", "surge", "pulse"][n % 3], ["guard", "ward"][n % 2], ["mend", "focus", "strike"][Math.floor(n / 2) % 3]];
    state.hand = hand.slice(n % 3).concat(hand.slice(0, n % 3));
  }
  function beginBattle(state, node) {
    var battle = node / 2;
    state.node = node; state.phase = "battle"; state.battleTurn = 1;
    state.energy = 3; state.guard = 0; state.chain = 0;
    state.foe = { hp: [18, 29, 42][battle] + state.tier * [6, 8, 10][battle], maxHp: 0, guard: 0 };
    state.foe.maxHp = state.foe.hp; state.turns++; draw(state);
  }
  function create(partner, tier, seed) {
    var state = { partner: partners.indexOf(partner) >= 0 ? partner : "xavier", tier: validTier(tier) ? tier : 0,
      seed: Number.isInteger(seed) && seed >= 0 && seed <= 999983 ? seed : 1,
      phase: "battle", node: 0, hp: 50, maxHp: 50, energy: 3, guard: 0, charge: 0, chain: 0,
      turns: 0, battleTurn: 1, battles: 0, damageTaken: 0, attackBonus: 0, guardBonus: 0, healBonus: 0,
      risk: false, perks: [], hand: [], foe: null, history: [], last: { key: "lxeReady", vars: {} } };
    beginBattle(state, 0); return state;
  }
  function intent(state) {
    if (!state || state.phase !== "battle") { return { kind: "none", attack: 0, guard: 0 }; }
    var battle = state.node / 2, pattern = [["attack", "heavy", "guard"], ["guard", "attack", "heavy"], ["heavy", "guard", "attack", "heavy"]][battle];
    var kind = pattern[(state.battleTurn - 1) % pattern.length];
    return { kind: kind, attack: kind === "guard" ? 0 : 4 + battle * 2 + state.tier * 2 + (kind === "heavy" ? 3 : 0), guard: kind === "guard" ? 5 + state.tier * 2 : 0 };
  }
  function card(state, id) {
    var base = cards[id]; if (!base) { return null; }
    return { id: id, cost: base.cost, attack: base.attack ? base.attack + state.attackBonus : 0,
      guard: base.guard ? base.guard + state.guardBonus : 0, heal: base.heal ? base.heal + state.healBonus : 0, energy: base.energy || 0 };
  }
  function hit(state, amount, pierce) {
    var blocked = pierce ? 0 : Math.min(state.foe.guard, amount);
    state.foe.guard -= blocked; var dealt = Math.min(state.foe.hp, amount - blocked);
    state.foe.hp -= dealt; return dealt;
  }
  function checkBattle(state) {
    if (state.foe.hp > 0) { return; }
    state.battles++; state.guard = 0; state.energy = 0; state.chain = 0;
    state.phase = state.node === 4 ? "won" : "draft";
    state.last = { key: state.phase === "won" ? "lxeVictory" : "lxeBattleWon", vars: {} };
  }
  function play(state, slot) {
    if (!state || state.phase !== "battle" || !Number.isInteger(slot) || slot < 0 || slot > 2 || !state.hand[slot]) { return false; }
    var item = card(state, state.hand[slot]); if (!item || state.energy < item.cost) { return false; }
    state.history.push({ action: "play", value: slot }); state.energy -= item.cost; state.hand[slot] = null;
    var damage = item.attack ? hit(state, item.attack + (state.chain ? 2 : 0), false) : 0;
    state.chain = item.attack ? state.chain + 1 : 0;
    state.guard += item.guard; var restored = heal(state, item.heal);
    state.energy += item.energy; state.charge = Math.min(4, state.charge + 1);
    state.last = { key: "lxePlayed", vars: { name: item.id, damage: damage, guard: item.guard, heal: restored } };
    checkBattle(state); return true;
  }
  function skill(state) {
    if (!state || state.phase !== "battle" || state.charge < 4) { return false; }
    var ability = skills[state.partner]; if (ability.healthCost && state.hp <= ability.healthCost) { return false; }
    state.history.push({ action: "skill" }); state.charge -= 4;
    state.hp -= ability.healthCost || 0; state.damageTaken += ability.healthCost || 0;
    var damage = ability.attack ? hit(state, ability.attack, ability.pierce) : 0;
    state.guard += ability.guard || 0; var restored = heal(state, ability.heal || 0);
    state.last = { key: "lxeSkillUsed", vars: { damage: damage, guard: ability.guard || 0, heal: restored } };
    checkBattle(state); return true;
  }
  function endTurn(state) {
    if (!state || state.phase !== "battle") { return false; }
    var next = intent(state), damage = Math.max(0, next.attack - state.guard);
    state.history.push({ action: "end" }); state.hp = Math.max(0, state.hp - damage); state.damageTaken += damage;
    state.guard = 0; state.chain = 0; state.foe.guard = next.guard;
    state.last = { key: next.kind === "guard" ? "lxeEnemyGuarded" : "lxeEnemyHit", vars: { damage: damage, guard: next.guard } };
    if (!state.hp || state.turns >= 99) { state.phase = "lost"; return true; }
    state.battleTurn++; state.turns++; state.energy = 3; draw(state); return true;
  }
  function choices(state) {
    if (state.phase === "draft") { return ["lens", "aegis", "spring"]; }
    if (state.phase === "route") { return ["quiet", "rift"]; }
    if (state.phase === "camp") { return ["rest", "attune"]; }
    return [];
  }
  function choose(state, id) {
    if (!state || choices(state).indexOf(id) < 0 || (id === "rift" && state.hp <= 6)) { return false; }
    state.history.push({ action: "choose", value: id });
    if (state.phase === "draft") {
      state.perks.push(id);
      if (id === "lens") { state.attackBonus += 2; }
      if (id === "aegis") { state.guardBonus += 3; }
      if (id === "spring") { state.healBonus += 3; }
      state.node++; state.phase = state.node === 1 ? "route" : "camp";
    } else if (state.phase === "route") {
      if (id === "quiet") { heal(state, 8); }
      else { state.hp -= 6; state.damageTaken += 6; state.attackBonus += 2; state.charge = Math.max(2, state.charge); state.risk = true; }
      beginBattle(state, 2);
    } else {
      if (id === "rest") { heal(state, 16); }
      else { heal(state, 6); state.charge = 4; state.attackBonus++; }
      beginBattle(state, 4);
    }
    state.last = { key: "lxeChoiceTaken", vars: { name: id } }; return true;
  }
  function stars(state) {
    if (!state || state.phase !== "won") { return 0; }
    var healthy = state.hp >= state.maxHp * .6, swift = state.turns <= 15;
    return healthy && swift ? 3 : healthy || swift ? 2 : 1;
  }
  function read(raw) {
    var saved, out = { version: 1, partners: {} }; try { saved = JSON.parse(raw || "null"); } catch (_) {}
    partners.forEach(function (id) {
      var values = saved && saved.version === 1 && saved.partners && saved.partners[id], blocked = false;
      out.partners[id] = [0, 1, 2].map(function (tier) {
        var entry = Array.isArray(values) && values[tier];
        var valid = !blocked && entry && Number.isInteger(entry.stars) && entry.stars >= 1 && entry.stars <= 3 && Number.isInteger(entry.turns) && entry.turns >= 3 && entry.turns <= 99;
        if (!valid) { blocked = true; return { stars: 0, turns: 0 }; }
        return { stars: entry.stars, turns: entry.turns };
      });
    }); return out;
  }
  function progressFor(progress, partner) {
    var rows = progress.partners[partner] || progress.partners.xavier, cleared = rows.filter(function (entry) { return entry.stars > 0; }).length;
    return { partner: partner, cleared: cleared, totalStars: rows.reduce(function (sum, entry) { return sum + entry.stars; }, 0), unlocked: Math.min(3, cleared + 1), records: clone(rows), stars: rows.map(function (entry) { return entry.stars; }) };
  }
  function verify(state) {
    if (!state || state.phase !== "won" || partners.indexOf(state.partner) < 0 || !validTier(state.tier) || !Number.isInteger(state.seed) || state.seed < 0 || state.seed > 999983 || !Array.isArray(state.history) || state.history.length > 600) { return false; }
    var replay = create(state.partner, state.tier, state.seed);
    for (var i = 0; i < state.history.length; i++) {
      var event = state.history[i], accepted = event && (event.action === "play" ? play(replay, event.value) : event.action === "end" ? endTurn(replay) : event.action === "skill" ? skill(replay) : event.action === "choose" ? choose(replay, event.value) : false);
      if (!accepted) { return false; }
    }
    return JSON.stringify(replay) === JSON.stringify(state);
  }
  function record(progress, state) {
    if (!verify(state) || state.tier >= progressFor(progress, state.partner).unlocked) { return false; }
    var entry = progress.partners[state.partner][state.tier], first = !entry.stars;
    entry.stars = Math.max(entry.stars, stars(state)); entry.turns = entry.turns ? Math.min(entry.turns, state.turns) : state.turns;
    return first;
  }
  var rules = { partners: partners.slice(), cards: clone(cards), skills: clone(skills), create: create, intent: intent, card: card,
    play: play, skill: skill, endTurn: endTurn, choices: choices, choose: choose, stars: stars, read: read, progress: progressFor, verify: verify, record: record };
  function mount(host, options) {
    options = options || {};
    var partner = { id: "xavier", nameKey: "ldsPartnerXavier" }, selectedTier = 0, seed = 1, state = create(partner.id, 0, seed), started = false, paused = false, settled = false;
    function saved() { var raw; try { raw = App.storage.getItem(storageKey); } catch (_) {} return read(raw); }
    var progress = saved();
    function el(tag, cls, key, parent) { var n = document.createElement(tag); if (cls) { n.className = cls; } if (key) { n.setAttribute("data-i18n", key); n.textContent = App.t(key); } if (parent) { parent.appendChild(n); } return n; }
    function button(cls, key, parent, action) { var n = el("button", cls, key, parent); n.type = "button"; n.addEventListener("click", action); n.addEventListener("keydown", function (event) { if (event.repeat && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); } }); return n; }
    var root = el("section", "lxe-game", null, host); root.setAttribute("data-partner", partner.id);
    function hidden() { return !!(document.hidden || root.hidden || host.hidden || (options.isHidden && options.isHidden())); }
    function canAct() { return !paused && !hidden(); }
    function name() { return App.t(partner.nameKey || "ldsPartner" + partner.id.charAt(0).toUpperCase() + partner.id.slice(1)); }
    var heading = el("div", "lxe-heading", null, root);
    el("span", "lxe-eyebrow", "lxeEyebrow", heading); el("h4", "lxe-title", "lxeTitle", heading); el("p", "lxe-intro", "lxeIntro", heading);
    var tierNav = el("div", "lxe-tiers", null, root); tierNav.setAttribute("role", "group");
    var tierButtons = [0, 1, 2].map(function (tier) {
      var b = button("lxe-tier", null, tierNav, function () { if (!canAct() || (started && !settled) || tier >= getProgress().unlocked) { return; } selectedTier = tier; started = false; state = create(partner.id, tier, seed); settled = false; render(); });
      b.setAttribute("data-expedition-tier", String(tier)); return { button: b, name: el("strong", "", null, b), best: el("span", "", null, b) };
    });
    var briefing = el("div", "lxe-briefing", null, root), briefingTitle = el("h5", "", null, briefing);
    el("p", "", "lxeBriefing", briefing); var startButton = button("lxe-primary", null, briefing, start); startButton.setAttribute("data-expedition-action", "start");
    var map = el("ol", "lxe-map", null, root), mapNodes = [0, 1, 2, 3, 4].map(function (index) { var n = el("li", "", null, map); n.setAttribute("data-node", String(index)); el("span", "lxe-map-icon", null, n).textContent = ["✧", "⋈", "◇", "☽", "✦"][index]; return { element: n, label: el("span", "", null, n) }; });
    var hud = el("div", "lxe-hud", null, root), health = el("div", "lxe-health", null, hud), hpLabel = el("span", "", null, health), healthTrack = el("div", "lxe-health-track", null, health), healthFill = el("i", "", null, healthTrack);
    healthTrack.setAttribute("role", "meter"); healthTrack.setAttribute("aria-valuemin", "0"); healthTrack.setAttribute("aria-valuemax", "50");
    var energyLabel = el("span", "lxe-energy", null, hud), guardLabel = el("span", "lxe-guard", null, hud), chargeLabel = el("span", "lxe-charge", null, hud);
    var field = el("div", "lxe-field", null, root), fieldTop = el("div", "lxe-field-top", null, field), encounterName = el("strong", "", null, fieldTop), turnLabel = el("span", "", null, fieldTop);
    var apparition = el("div", "lxe-apparition", null, field); apparition.setAttribute("aria-hidden", "true");
    ["orbit", "wing left", "wing right", "core"].forEach(function (part) { el("i", "lxe-foe-" + part.replace(/ /g, " lxe-foe-"), null, apparition); });
    var foeLabel = el("p", "lxe-foe-health", null, field), foeTrack = el("div", "lxe-foe-track", null, field), foeFill = el("i", "", null, foeTrack);
    var intentLabel = el("p", "lxe-intent", null, field); intentLabel.setAttribute("role", "status");
    var hand = el("div", "lxe-hand", null, root); hand.setAttribute("role", "group");
    var cardButtons = [0, 1, 2].map(function (slot) {
      var b = button("lxe-card", null, hand, function () { act(function () { return play(state, slot); }); }); b.setAttribute("data-expedition-card", String(slot));
      return { button: b, cost: el("span", "lxe-card-cost", null, b), icon: el("span", "lxe-card-icon", null, b), name: el("strong", "", null, b), description: el("span", "lxe-card-description", null, b) };
    });
    var battleControls = el("div", "lxe-battle-controls", null, root), skillButton = button("lxe-skill", null, battleControls, function () { act(function () { return skill(state); }); }); skillButton.setAttribute("data-expedition-action", "skill");
    var skillName = el("strong", "", null, skillButton), skillDescription = el("span", "", null, skillButton);
    var endButton = button("lxe-primary lxe-end", "lxeEndTurn", battleControls, function () { act(function () { return endTurn(state); }); }); endButton.setAttribute("data-expedition-action", "end");
    var choicePanel = el("div", "lxe-choice-panel", null, root), choiceTitle = el("h5", "", null, choicePanel), choiceIntro = el("p", "", null, choicePanel), choiceGrid = el("div", "lxe-choices", null, choicePanel);
    var choiceButtons = [0, 1, 2].map(function (index) {
      var b = button("lxe-choice", null, choiceGrid, function () { var id = choices(state)[index]; act(function () { return choose(state, id); }); });
      return { button: b, title: el("strong", "", null, b), description: el("span", "", null, b) };
    });
    var result = el("div", "lxe-result", null, root), resultStars = el("div", "lxe-result-stars", null, result), resultTitle = el("h5", "", null, result), resultCopy = el("p", "", null, result);
    var replayButton = button("lxe-primary", "lxeReplay", result, start); replayButton.setAttribute("data-expedition-action", "replay");
    var nextButton = button("lxe-secondary", "lxeNextTier", result, function () { if (!canAct() || selectedTier >= 2 || selectedTier + 1 >= getProgress().unlocked) { return; } selectedTier++; start(); }); nextButton.setAttribute("data-expedition-action", "next");
    var perksLabel = el("p", "lxe-perks", null, root), status = el("p", "lxe-status", null, root); status.setAttribute("role", "status"); status.setAttribute("aria-live", "polite");
    var resumeButton = button("lxe-secondary", "lxeResume", root, function () { if (!hidden()) { paused = false; render(); } }); resumeButton.setAttribute("data-expedition-action", "resume");
    var controls = el("div", "lxe-footer", null, root), restartButton = button("lxe-text-button", "lxeRestart", controls, start); restartButton.setAttribute("data-expedition-action", "restart");
    var recordLabel = el("span", "lxe-record", null, controls);
    var guide = el("details", "lxe-guide", null, root); el("summary", "", "lxeGuide", guide); el("p", "", "lxeRules", guide); el("p", "", "lxeRatings", guide); el("p", "", "lxeDeck", guide);
    function focusAction() {
      if (!started || !canAct()) { return; }
      var target;
      if (state.phase === "battle") { target = cardButtons.filter(function (entry) { return !entry.button.disabled; })[0]; target = target ? target.button : endButton; }
      else if (choices(state).length) { target = choiceButtons.filter(function (entry) { return !entry.button.hidden && !entry.button.disabled; })[0]; target = target && target.button; }
      else if (settled) { target = replayButton; }
      if (target && target.focus) { target.focus({ preventScroll: true }); }
    }
    function start() { if (!canAct()) { return; } state = create(partner.id, selectedTier, seed); started = true; settled = false; stateReward = false; render(); focusAction(); }
    function getProgress() { return progressFor(progress, partner.id); }
    function act(action) {
      if (!started || !canAct() || !action()) { return; }
      if ((state.phase === "won" || state.phase === "lost") && !settled) {
        settled = true;
        if (state.phase === "won") {
          progress = saved(); var fresh = record(progress, state);
          try { App.storage.setItem(storageKey, JSON.stringify(progress)); } catch (_) {}
          stateReward = fresh;
          if (fresh && options.onReward) { options.onReward("expedition", "tier-" + (selectedTier + 1)); }
        }
        if (options.onMoment) { options.onMoment(state.phase === "won" ? "Win" : "Miss"); }
      }
      render(); focusAction();
    }
    var stateReward = false;
    function render() {
      var t = App.t, info = getProgress(), fighting = started && state.phase === "battle", selecting = started && choices(state).length > 0;
      root.setAttribute("data-partner", partner.id); root.setAttribute("data-phase", started ? state.phase : "briefing");
      root.querySelectorAll("[data-i18n]").forEach(function (n) { n.textContent = t(n.getAttribute("data-i18n")); });
      tierNav.setAttribute("aria-label", t("lxeChooseTier")); hand.setAttribute("aria-label", t("lxeHand"));
      tierButtons.forEach(function (entry, i) {
        entry.name.textContent = t("lxeTier" + i); entry.best.textContent = i >= info.unlocked ? t("lxeLocked") : info.records[i].stars ? "★".repeat(info.records[i].stars) + "☆".repeat(3 - info.records[i].stars) : t("lxeUncharted");
        entry.button.setAttribute("aria-pressed", String(i === selectedTier)); entry.button.disabled = !canAct() || i >= info.unlocked || (started && !settled);
      });
      briefing.hidden = started; briefingTitle.textContent = t("lxeDepartTitle", { partner: name(), tier: t("lxeTier" + selectedTier) }); startButton.textContent = t("lxeStart"); startButton.disabled = !canAct();
      map.hidden = !started; hud.hidden = !started;
      mapNodes.forEach(function (entry, i) { entry.label.textContent = t("lxeNode" + i); entry.element.setAttribute("data-state", i < state.node ? "done" : i === state.node ? "current" : "ahead"); if (i === state.node) { entry.element.setAttribute("aria-current", "step"); } else { entry.element.removeAttribute("aria-current"); } });
      hpLabel.textContent = t("lxeHp", { n: state.hp, max: state.maxHp }); healthFill.style.width = state.hp / state.maxHp * 100 + "%"; healthTrack.setAttribute("aria-valuenow", String(state.hp)); healthTrack.setAttribute("aria-label", t("lxeHealth"));
      energyLabel.textContent = t("lxeEnergy", { n: state.energy }); guardLabel.textContent = t("lxeGuard", { n: state.guard }); chargeLabel.textContent = t("lxeCharge", { n: state.charge });
      field.hidden = !fighting; hand.hidden = !fighting; battleControls.hidden = !fighting;
      if (fighting) {
        var next = intent(state); encounterName.textContent = t("lxeFoe" + state.node / 2); turnLabel.textContent = t("lxeTurn", { n: state.battleTurn, total: state.turns });
        apparition.setAttribute("data-boss", String(state.node === 4)); foeLabel.textContent = t("lxeFoeHp", { hp: state.foe.hp, max: state.foe.maxHp, guard: state.foe.guard }); foeFill.style.width = state.foe.hp / state.foe.maxHp * 100 + "%";
        intentLabel.textContent = t(next.kind === "guard" ? "lxeIntentGuard" : "lxeIntentAttack", { n: next.kind === "guard" ? next.guard : next.attack }); intentLabel.setAttribute("data-intent", next.kind);
        cardButtons.forEach(function (entry, slot) {
          var item = card(state, state.hand[slot]); entry.button.disabled = !canAct() || !item || state.energy < item.cost; entry.button.setAttribute("data-signal", item ? item.id : "spent");
          entry.cost.textContent = item ? t("lxeCost", { n: item.cost }) : "✓"; entry.icon.textContent = item ? item.attack ? "✧" : item.guard ? "◇" : item.heal ? "❋" : "✦" : "·";
          entry.name.textContent = t(item ? "lxeCard" + item.id : "lxeSpent");
          var effects = item ? [item.attack ? t("lxeEffectAttack", { n: item.attack + (state.chain ? 2 : 0) }) : "", item.guard ? t("lxeEffectGuard", { n: item.guard }) : "", item.heal ? t("lxeEffectHeal", { n: item.heal }) : "", item.energy ? t("lxeEffectEnergy", { n: item.energy }) : ""].filter(Boolean) : [];
          entry.description.textContent = effects.join(" · "); entry.button.setAttribute("aria-label", [entry.name.textContent, entry.cost.textContent, entry.description.textContent].join(". "));
        });
        skillName.textContent = t("lxeSkill" + partner.id); skillDescription.textContent = t("lxeSkillDescription" + partner.id);
        skillButton.disabled = !canAct() || state.charge < 4 || (partner.id === "sylus" && state.hp <= 3); endButton.disabled = !canAct();
      }
      choicePanel.hidden = !selecting;
      if (selecting) {
        choiceTitle.textContent = t("lxeChoiceTitle" + state.phase); choiceIntro.textContent = t("lxeChoiceIntro" + state.phase);
        choiceButtons.forEach(function (entry, index) { var id = choices(state)[index]; entry.button.hidden = !id; if (!id) { return; } entry.button.setAttribute("data-expedition-choice", id); entry.title.textContent = t("lxeChoice" + id); entry.description.textContent = t("lxeChoiceDescription" + id); entry.button.disabled = !canAct() || (id === "rift" && state.hp <= 6); });
      }
      result.hidden = !started || !settled;
      if (settled) {
        var won = state.phase === "won"; resultStars.textContent = won ? "★".repeat(stars(state)) + "☆".repeat(3 - stars(state)) : "◇";
        resultTitle.textContent = t(won ? "lxeVictory" : "lxeDefeat"); resultCopy.textContent = t(won ? stateReward ? selectedTier === 2 ? "lxeFirstClearFinal" : "lxeFirstClear" : "lxeRepeatClear" : "lxeTryAgain", { turns: state.turns, hp: state.hp });
        nextButton.hidden = !won || selectedTier >= 2; nextButton.disabled = !canAct() || selectedTier + 1 >= info.unlocked; replayButton.disabled = !canAct();
      }
      perksLabel.hidden = !started || !state.perks.length; perksLabel.textContent = t("lxePerks", { list: state.perks.map(function (id) { return t("lxeChoice" + id); }).join(" · ") });
      var vars = Object.assign({}, state.last.vars); if (vars.name) { vars.name = t((state.last.key === "lxePlayed" ? "lxeCard" : "lxeChoice") + vars.name); }
      status.textContent = paused ? t("lxePaused") : !started ? t("lxeReady") : t(state.last.key, vars);
      resumeButton.hidden = !paused; resumeButton.disabled = hidden(); restartButton.hidden = !started || settled; restartButton.disabled = !canAct();
      recordLabel.textContent = t("lxeRecord", { cleared: info.cleared, stars: info.totalStars });
    }
    function pause() { paused = true; render(); }
    function refresh() { progress = saved(); if (!hidden()) { paused = false; } render(); }
    if (App.onDocumentHidden) { App.onDocumentHidden(pause); }
    render();
    return { element: root, pause: pause, refresh: refresh, getProgress: getProgress,
      setPartner: function (next) { if (!next || partners.indexOf(next.id) < 0) { return; } partner = next; progress = saved(); selectedTier = Math.min(getProgress().cleared, 2); state = create(partner.id, selectedTier, seed); started = false; settled = false; paused = false; stateReward = false; render(); },
      inspect: function () { return { state: clone(state), started: started, paused: paused, tier: selectedTier, progress: getProgress() }; }
    };
  }
  var copy = {
    ldsDateExpedition: ["✦ Expedition", "✦ 星夜远征"], lxeEyebrow: ["FIVE SIGNALS · ONE WAY HOME", "五段星途，一起归航"],
    lxeTitle: ["Starlight expedition", "星夜远征"], lxeIntro: ["Read the next threat. Shape your hand. Cross the night together in a short, untimed card adventure.", "看清下一次威胁，安排手中的信号卡。与你的搭档一起，完成一场没有倒计时的短途卡牌冒险。"],
    lxeChooseTier: ["Expedition difficulty", "远征难度"], lxeTier0: ["I · First light", "Ⅰ · 初光"], lxeTier1: ["II · Deep orbit", "Ⅱ · 深空"], lxeTier2: ["III · Event horizon", "Ⅲ · 临界"],
    lxeLocked: ["Clear the previous tier", "先通关前一难度"], lxeUncharted: ["Uncharted", "等待启程"], lxeDepartTitle: ["{partner} · {tier}", "{partner} · {tier}"],
    lxeBriefing: ["Three encounters, a fork in the path, and a quiet camp. Health carries between battles. Draft two lasting upgrades and decide when to recover or take a risk.", "三场遭遇战，一处分岔，一次营地休整。生命值会延续到下一场战斗。挑选两次持续强化，决定何时恢复、何时冒险。"],
    lxeStart: ["Begin expedition →", "开启远征 →"], lxeReady: ["Every turn is yours to consider. Nothing moves until you choose.", "每一回合，都可以慢慢考虑。只有你做出选择，远征才会向前。"],
    lxeNode0: ["Fringe", "星缘"], lxeNode1: ["Crossing", "岔路"], lxeNode2: ["Sentinel", "哨卫"], lxeNode3: ["Camp", "营地"], lxeNode4: ["Night core", "夜核"],
    lxeHp: ["Health {n} / {max}", "生命 {n} / {max}"], lxeHealth: ["Expedition health", "远征生命值"], lxeEnergy: ["Energy {n}", "能量 {n}"], lxeGuard: ["Guard {n}", "护盾 {n}"], lxeCharge: ["Evol {n} / 4", "Evol {n} / 4"],
    lxeFoe0: ["Drifting shard", "漂流碎影"], lxeFoe1: ["Prism sentinel", "棱镜哨卫"], lxeFoe2: ["Nightbound core", "长夜之核"], lxeTurn: ["Round {n} · run turn {total}", "第 {n} 回合 · 远征累计 {total} 回合"],
    lxeFoeHp: ["Integrity {hp} / {max} · shield {guard}", "完整度 {hp} / {max} · 护盾 {guard}"], lxeIntentAttack: ["NEXT · Deal {n} damage. Your guard absorbs it.", "下次行动 · 造成 {n} 点伤害，可用护盾抵挡。"], lxeIntentGuard: ["NEXT · No attack. Raise {n} shield instead.", "下次行动 · 不攻击，改为获得 {n} 点护盾。"],
    lxeHand: ["Three signal cards; choose their order and spend energy", "三张信号卡：安排顺序，消耗能量"], lxeCost: ["{n} energy", "{n} 能量"], lxeSpent: ["Signal used", "信号已使用"],
    lxeCardstrike: ["Star lance", "星芒"], lxeCardsurge: ["Nova surge", "新星爆发"], lxeCardpulse: ["Counterpulse", "逆向脉冲"], lxeCardguard: ["Orbit shield", "轨道护盾"], lxeCardward: ["Quiet harbor", "静谧港湾"], lxeCardmend: ["Mending light", "疗愈微光"], lxeCardfocus: ["Deep focus", "凝神"],
    lxeEffectAttack: ["Deal {n}", "造成 {n} 伤害"], lxeEffectGuard: ["Guard {n}", "获得 {n} 护盾"], lxeEffectHeal: ["Heal {n}", "恢复 {n} 生命"], lxeEffectEnergy: ["Gain {n} energy", "获得 {n} 能量"],
    lxeSkillxavier: ["Starlight rendezvous · 4 Evol", "星光会合 · 4 Evol"], lxeSkillDescriptionxavier: ["Deal 11 damage and gain 4 guard.", "造成 11 点伤害，获得 4 点护盾。"],
    lxeSkillzayne: ["Frost shelter · 4 Evol", "霜雪庇护 · 4 Evol"], lxeSkillDescriptionzayne: ["Gain 10 guard and heal 7 health.", "获得 10 点护盾，恢复 7 点生命。"],
    lxeSkillrafayel: ["Tidal flame · 4 Evol", "潮焰 · 4 Evol"], lxeSkillDescriptionrafayel: ["Deal 16 damage, ignoring enemy shields.", "造成 16 点伤害，无视敌方护盾。"],
    lxeSkillsylus: ["Crimson pact · 4 Evol", "绯色契约 · 4 Evol"], lxeSkillDescriptionsylus: ["Spend 3 health to deal 21 damage. Requires more than 3 health.", "消耗 3 点生命，造成 21 点伤害。生命须高于 3 点。"],
    lxeSkillcaleb: ["Gravity anchor · 4 Evol", "引力锚点 · 4 Evol"], lxeSkillDescriptioncaleb: ["Deal 9 damage and gain 9 guard.", "造成 9 点伤害，获得 9 点护盾。"],
    lxeEndTurn: ["End turn →", "结束回合 →"], lxePlayed: ["{name}: {damage} damage · {guard} guard · {heal} health restored. +1 Evol.", "{name}：造成 {damage} 伤害 · 获得 {guard} 护盾 · 恢复 {heal} 生命。Evol +1。"],
    lxeSkillUsed: ["Together: {damage} damage · {guard} guard · {heal} health restored.", "搭档共鸣：造成 {damage} 伤害 · 获得 {guard} 护盾 · 恢复 {heal} 生命。"],
    lxeEnemyGuarded: ["The enemy raised {guard} shield. A fresh hand and 3 energy are ready.", "敌方获得 {guard} 点护盾。新手牌与 3 点能量已就绪。"], lxeEnemyHit: ["You took {damage} damage after guard. A fresh hand and 3 energy are ready.", "护盾抵挡后，你受到 {damage} 点伤害。新手牌与 3 点能量已就绪。"],
    lxeBattleWon: ["Encounter cleared. Choose one upgrade for the rest of this expedition.", "遭遇战获胜。选择一项强化，在本次远征中持续生效。"], lxeChoiceTitledraft: ["Carry a little more light", "带上更多星光"], lxeChoiceIntrodraft: ["Choose one. It upgrades every matching card for the rest of this run; effects stack.", "选择一项，强化本次远征中所有对应卡牌；效果可叠加。"],
    lxeChoicelens: ["Prismatic lens", "棱光透镜"], lxeChoiceDescriptionlens: ["Every attack card deals +2 damage.", "所有攻击卡额外造成 2 点伤害。"], lxeChoiceaegis: ["Silver aegis", "银辉屏障"], lxeChoiceDescriptionaegis: ["Every guard card grants +3 guard.", "所有护盾卡额外获得 3 点护盾。"], lxeChoicespring: ["Dawn spring", "破晓之泉"], lxeChoiceDescriptionspring: ["Every healing card restores +3 health.", "所有治疗卡额外恢复 3 点生命。"],
    lxeChoiceTitleroute: ["Which way through the stars?", "选择穿过星夜的方向"], lxeChoiceIntroroute: ["Recovery buys safety. The rift trades health for lasting attack power.", "恢复可以稳住状态；裂隙则以生命换取持续的攻击强化。"],
    lxeChoicequiet: ["Quiet crossing", "宁静渡口"], lxeChoiceDescriptionquiet: ["Heal 8 health, then face the sentinel.", "恢复 8 点生命，继续挑战哨卫。"], lxeChoicerift: ["Rift shortcut", "裂隙捷径"], lxeChoiceDescriptionrift: ["Spend 6 health. Attack cards gain +2 damage; raise Evol to at least 2. Requires more than 6 health.", "消耗 6 点生命。攻击卡伤害 +2；Evol 至少升至 2。生命须高于 6 点。"],
    lxeChoiceTitlecamp: ["A moment before the last light", "决战前的片刻安宁"], lxeChoiceIntrocamp: ["The boss is ahead. Choose your final preparation.", "前方就是首领，选择最后的准备。"],
    lxeChoicerest: ["Rest beside him", "在他身边休息"], lxeChoiceDescriptionrest: ["Heal 16 health before the final encounter.", "恢复 16 点生命，再进入最终遭遇战。"], lxeChoiceattune: ["Resonance watch", "共鸣守夜"], lxeChoiceDescriptionattune: ["Heal 6 health, fill Evol to 4, and give attack cards +1 damage.", "恢复 6 点生命，Evol 补满至 4，攻击卡伤害 +1。"],
    lxeChoiceTaken: ["{name} is yours. The next signal is waiting.", "已选择「{name}」。下一段星途在等你。"], lxeVictory: ["Home, under the same stars", "在同一片星空下归航"], lxeDefeat: ["A signal to try another way", "换一种走法，再度启程"],
    lxeFirstClear: ["{turns} turns · {hp} health left. Your first-clear memory is collected, and the next difficulty is open.", "累计 {turns} 回合 · 剩余 {hp} 生命。已获得首次通关纪念，下一难度已解锁。"],
    lxeFirstClearFinal: ["{turns} turns · {hp} health left. All three difficulties are complete. Your final first-clear memory is collected; return to improve your records.", "累计 {turns} 回合 · 剩余 {hp} 生命。三个难度全部通关，最终首通纪念已收好。还可以再来，刷新自己的记录。"],
    lxeRepeatClear: ["{turns} turns · {hp} health left. Best stars and fewest turns are saved. This tier's first-clear memory is already collected.", "累计 {turns} 回合 · 剩余 {hp} 生命。最佳星数与最少回合已保存，本难度的首次通关纪念已领取。"],
    lxeTryAgain: ["Your saved records are safe. Watch the intent, guard heavy attacks, and save a healing signal for the right moment.", "已有成绩会保留。留意敌方意图，用护盾应对重击，在合适的时候使用治疗信号。"], lxeReplay: ["Replay this route", "重试同一路线"], lxeNextTier: ["Next difficulty →", "下一难度 →"], lxeRestart: ["Restart expedition", "重新开始远征"],
    lxePerks: ["Equipped · {list}", "已装备 · {list}"], lxeRecord: ["Partner record · {cleared}/3 cleared · {stars}/9 stars", "搭档记录 · 已通关 {cleared}/3 · 星数 {stars}/9"], lxePaused: ["Expedition paused. Your hand and resources are kept.", "远征已暂停，手牌与资源已保留。"], lxeResume: ["Resume expedition", "继续远征"],
    lxeGuide: ["Field guide · cards, combos & ratings", "远征指南 · 卡牌、连击与评价"],
    lxeRules: ["Play cards with your 3 energy, then end the turn. The enemy performs its displayed intent. Guard absorbs that attack, then expires. Each card grants 1 Evol, up to 4; spend 4 on your partner's skill. Consecutive attack cards in the same turn gain +2 damage after the first; a non-attack card breaks the chain. Skills neither advance nor break it. Unspent cards and energy reset each turn; health, Evol and upgrades carry between encounters.", "每回合有 3 点能量。出牌后结束回合，敌方就会执行显示的意图。护盾抵挡本次攻击后清空。每张卡获得 1 点 Evol，上限为 4；消耗 4 点可发动搭档技能。同一回合连续打出攻击卡时，从第二张起伤害 +2；非攻击卡会中断连击，搭档技能不影响连击。每回合重置未用手牌与能量；生命、Evol 和强化在遭遇战之间保留。"],
    lxeRatings: ["★★★ Win with at least 30/50 health in 15 battle turns or fewer. ★★ Meet either target. ★ Every other victory. Tiers unlock in order; first-clear memories are awarded once per partner and tier. Replays can improve either record.", "★★★ 通关时生命至少 30/50，且战斗总回合不超过 15。★★ 满足其中一项目标。★ 其他胜利。难度依次解锁；每位搭档、每个难度仅获得一次首通纪念。重玩可刷新最佳星数与最少回合。"],
    lxeDeck: ["Balanced signal deck: each turn draws one attack (Star lance, Nova surge or Counterpulse), one defense (Orbit shield or Quiet harbor), and one support (Mending light, Deep focus or Star lance). The route uses a fixed seed, so replaying lets you refine your decisions. Nothing runs on a timer.", "平衡信号牌组：每回合获得一张攻击牌（星芒、新星爆发或逆向脉冲）、一张防御牌（轨道护盾或静谧港湾），以及一张支援牌（疗愈微光、凝神或星芒）。路线采用固定种子，重玩可以优化自己的决策。全程没有计时压力。"]
  };
  var strings = { en: {}, zh: {} }; Object.keys(copy).forEach(function (key) { strings.en[key] = copy[key][0]; strings.zh[key] = copy[key][1]; }); App.addStrings(strings);
  App.ldsExpeditionRules = rules; App.mountLdsExpedition = mount;
})(window.CapitalConvert = window.CapitalConvert || {});
