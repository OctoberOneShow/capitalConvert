/* Character dates: original fan adaptations of Playtime, snapshots and companionship.
 * Local portraits are official; dialogue, mini-games and collectible art are original. */
(function (App) {
  var ids = ["xavier", "zayne", "rafayel", "sylus", "caleb"];
  var chatMoodKeys = { happy: "ldsChatMoodHappy", tired: "ldsChatMoodTired", worried: "ldsChatMoodWorried" };
  var artTitles = {
    xavier: ["Fallen Crown", "Celestial Yearn", "Seeker Of Light", "A Day Of Snow", "Cosmic Encounter", "Unreturned Traveler", "Lost Signal", "Enlightenment"],
    zayne: ["Edge of Continuum", "Frost Salvation", "Doomsday", "Neon Night", "Cosmic Encounter", "Silent Poem", "Dawn's Shadows", "Glittering Lights"],
    rafayel: ["Submerged Eclipse", "Eventide Recitative", "Glistening Hearts", "Whalefall Lament", "Cosmic Encounter", "Promised Wildfire", "Daybreak's Touch", "Flowery Words"],
    sylus: ["Where Silverwings Rest", "Grasped Dominion", "Wild Gaze", "Razor's Dance", "Cosmic Encounter", "Approaching Dusk", "Continuous Symphony", "Tender Curve"],
    caleb: ["Ghosts' Final March", "Verdant Wetlands", "Summer's Echo", "Longtime Moments", "Cosmic Encounter", "Secret Touch", "Dreamsong", "A Perfect Rumor"]
  };
  var artFocus = { xavier: [.5, .27, .3, .37, .29], zayne: [.5, .45, .52, .7, .34], rafayel: [.5, .45, .35, .28, .4], sylus: [.5, .45, .29, .27, .33], caleb: [.5, .45, .28, .28, .35] };
  function sceneArt(id, index) {
    id = ids.indexOf(id) >= 0 ? id : "xavier"; index = Number.isInteger(index) && index >= 0 && index < App.ldsArtCount ? index : 0;
    var extension = id === "caleb" && index >= 6 ? ".png" : ".jpg";
    return { index: index, src: "assets/media/love-deepspace/" + id + (index ? "-scene-" + index + extension : ".webp"),
      title: index ? artTitles[id][index - 1] : App.t("ldsLookOriginal"), x: index ? .5 : id === "rafayel" ? .34 : .62, y: artFocus[id][index] == null ? .5 : artFocus[id][index] };
  }
  App.ldsArtCount = 9;
  App.ldsSceneArt = sceneArt;
  var toys = ["rabbit", "cat", "fox", "whale", "star"];
  var toySymbols = ["🐰", "🐱", "🦊", "🐳", "⭐"];
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function readDates(raw) {
    var result = { version: 1, plushies: {}, badges: {}, stories: {}, photos: [], snapshots: {}, focus: {}, clawBest: {}, journal: [], strips: [] }, saved;
    ids.forEach(function (id) { result.plushies[id] = []; result.badges[id] = false; result.stories[id] = []; result.snapshots[id] = false; result.focus[id] = 0; result.clawBest[id] = 0; });
    try { saved = JSON.parse(raw || "null"); } catch (error) { return result; }
    if (!saved || saved.version !== 1) { return result; }
    ids.forEach(function (id) {
      var list = saved.plushies && saved.plushies[id];
      result.plushies[id] = Array.isArray(list) ? toys.filter(function (toy) { return list.indexOf(toy) >= 0; }) : [];
      result.badges[id] = !!(saved.badges && saved.badges[id] === true);
      result.snapshots[id] = !!(saved.snapshots && saved.snapshots[id] === true);
      var endings = saved.stories && saved.stories[id];
      result.stories[id] = Array.isArray(endings) ? ["quiet", "adventure"].filter(function (ending) { return endings.indexOf(ending) >= 0; }) : [];
      var count = saved.focus && saved.focus[id];
      result.focus[id] = typeof count === "number" && isFinite(count) ? clamp(Math.floor(count), 0, 999) : 0;
      var best = saved.clawBest && saved.clawBest[id]; result.clawBest[id] = typeof best === "number" && isFinite(best) ? clamp(Math.floor(best), 0, 2000) : 0;
    });
    if (Array.isArray(saved.photos)) {
      saved.photos.slice(0, 12).forEach(function (p) {
        if (!p || ids.indexOf(p.partner) < 0 || ["night", "sunset", "studio"].indexOf(p.scene) < 0 ||
            ["plain", "polaroid", "stars"].indexOf(p.frame) < 0) { return; }
        result.photos.push({ partner: p.partner, scene: p.scene, frame: p.frame,
          sticker: ["heart", "star", "flower"].indexOf(p.sticker) >= 0 ? p.sticker : "heart",
          zoom: typeof p.zoom === "number" && isFinite(p.zoom) ? clamp(p.zoom, 1, 1.8) : 1,
          pan: typeof p.pan === "number" && isFinite(p.pan) ? clamp(p.pan, 0, 1) : .62,
          art: Number.isInteger(p.art) && p.art >= 0 && p.art < App.ldsArtCount ? p.art : 0 });
        result.snapshots[p.partner] = true;
      });
    }
    if (Array.isArray(saved.journal)) {
      saved.journal.slice(0, 20).forEach(function (entry) {
        if (!entry || ids.indexOf(entry.partner) < 0 || ["happy", "tired", "worried"].indexOf(entry.mood) < 0 || (entry.choice !== 0 && entry.choice !== 1)) { return; }
        if (result.journal.some(function (item) { return item.partner === entry.partner && item.mood === entry.mood && item.choice === entry.choice; })) { return; }
        result.journal.push({ partner: entry.partner, mood: entry.mood, choice: entry.choice, favorite: entry.favorite === true });
      });
    }
    if (Array.isArray(saved.strips)) {
      saved.strips.slice(0, 4).forEach(function (strip) {
        if (!strip || ids.indexOf(strip.partner) < 0 || !Array.isArray(strip.shots) || strip.shots.length !== 4) { return; }
        var shots = strip.shots.map(normalizeStripShot);
        if (shots.every(Boolean)) { result.strips.push({ partner: strip.partner, shots: shots }); result.snapshots[strip.partner] = true; }
      });
    }
    return result;
  }
  function normalizeStripShot(p) {
    if (!p || ["night", "sunset", "studio"].indexOf(p.scene) < 0 || ["plain", "polaroid", "stars"].indexOf(p.frame) < 0) { return null; }
    return { scene: p.scene, frame: p.frame, sticker: ["heart", "star", "flower"].indexOf(p.sticker) >= 0 ? p.sticker : "heart", art: Number.isInteger(p.art) && p.art >= 0 && p.art < App.ldsArtCount ? p.art : 0, zoom: typeof p.zoom === "number" && isFinite(p.zoom) ? clamp(p.zoom, 1, 1.8) : 1, pan: typeof p.pan === "number" && isFinite(p.pan) ? clamp(p.pan, 0, 1) : .62 };
  }

  function createClaw(partner, challenge) {
    return { partner: partner, x: 300, y: 65, elapsed: 0, phase: "aim", phaseTime: 0,
      attempts: 5, caught: [], target: null, help: 0, helped: false, done: false, events: [],
      challenge: !!challenge, remaining: 60, grip: 0, combo: 0, score: 0, perfect: false,
      toys: toys.map(function (id, i) { return { id: id, index: i, x: 100 + i * 100, y: 253, taken: false }; }) };
  }
  function stepClaw(s, delta, input) {
    if (s.done) { return s; }
    var dt = clamp(Number(delta) || 0, 0, .05); if (!dt) { return s; }
    input = input || {}; s.events = []; s.elapsed += dt;
    if (s.challenge) {
      s.remaining = Math.max(0, s.remaining - dt);
      if (!s.remaining) { s.done = true; if (s.target && !s.caught.includes(s.target.id)) { s.target.taken = false; } s.target = null; s.events.push({ kind: "finish" }); return s; }
    }
    if (input.help && !s.helped) { s.helped = true; s.help = 2; s.events.push({ kind: "help" }); }
    s.help = Math.max(0, s.help - dt);
    if (s.help <= 0) {
      s.toys.forEach(function (toy) { if (!toy.taken) { toy.x = 100 + toy.index * 100 + Math.sin(s.elapsed * (s.challenge ? 1.7 : 1) * (1.2 + toy.index * .1) + toy.index) * (s.challenge ? 42 : 32); } });
    }
    if (s.phase === "aim") {
      s.x = clamp(typeof input.aim === "number" ? input.aim : s.x + clamp(input.x || 0, -1, 1) * dt * 215, 50, 550);
      if (input.drop && s.attempts > 0) { s.phase = "drop"; s.phaseTime = 0; s.attempts--; s.target = null; }
    } else {
      s.phaseTime += dt;
      if (s.phase === "drop") {
        s.y = 65 + clamp(s.phaseTime / .8, 0, 1) * 188;
        if (s.phaseTime >= .8) {
          var nearest = null, best = 24;
          s.toys.forEach(function (toy) { if (!toy.taken && Math.abs(toy.x - s.x) < best) { nearest = toy; best = Math.abs(toy.x - s.x); } });
          s.target = nearest; s.perfect = false;
          if (nearest && !s.challenge) { nearest.taken = true; }
          s.phase = nearest && s.challenge ? "grip" : "lift"; s.phaseTime = 0; s.grip = 0;
        }
      } else if (s.phase === "grip") {
        s.grip = clamp(s.phaseTime / .9, 0, 1);
        if (input.grip || s.grip >= 1) {
          var distance = Math.abs(s.grip - .5);
          if (input.grip && distance <= .22) { s.target.taken = true; s.perfect = distance <= .09; s.events.push({ kind: s.perfect ? "perfect" : "grip" }); }
          else { s.target = null; s.events.push({ kind: "slip" }); }
          s.phase = "lift"; s.phaseTime = 0;
        }
      } else if (s.phase === "lift") {
        s.y = 253 - clamp(s.phaseTime / 1, 0, 1) * 188;
        if (s.phaseTime >= 1) { s.phase = "deliver"; s.phaseTime = 0; s.fromX = s.x; }
      } else if (s.phase === "deliver") {
        s.x = s.fromX + (55 - s.fromX) * clamp(s.phaseTime / .7, 0, 1);
        if (s.phaseTime >= .7) {
          if (s.target) { s.caught.push(s.target.id); s.combo++; s.score += (s.perfect ? 150 : 100) + s.combo * 25; s.events.push({ kind: "catch", toy: s.target.id }); }
          else { s.combo = 0; s.events.push({ kind: "miss" }); }
          s.target = null; s.phase = "aim"; s.phaseTime = 0; s.y = 65;
          if (!s.attempts || s.caught.length === toys.length) { s.done = true; s.events.push({ kind: "finish" }); }
        }
      }
    }
    return s;
  }

  // Twelve cups and alternating turns. Matching a cup colour doubles its card.
  function createKitty(partner, advanced, seed) {
    var s = { partner: partner, advanced: !!advanced, seed: (seed || 7321) >>> 0, turn: "you", selected: 0,
      hand: [], otherHand: [], score: [0, 0], assist: [true, true], tactics: [2, 2], done: false, winner: "", events: [],
      cups: Array.from({ length: 12 }, function (_, i) { return { color: i % 3, owner: null, card: null, shield: false }; }) };
    function card() {
      s.seed = (Math.imul(s.seed, 1664525) + 1013904223) >>> 0;
      return { value: 1 + (s.seed >>> 12) % 6, color: (s.seed >>> 20) % 3 };
    }
    s.draw = card;
    for (var i = 0; i < 3; i++) { s.hand.push(card()); s.otherHand.push(card()); }
    return s;
  }
  function kittyScores(s) {
    s.score = [0, 0];
    s.cups.forEach(function (cup) { if (cup.card) { s.score[cup.owner === "you" ? 0 : 1] += cup.card.value * (cup.color === cup.card.color ? 2 : 1); } });
    if (s.cups.every(function (cup) { return cup.owner !== null; })) {
      s.done = true; s.turn = "done"; s.winner = s.score[0] > s.score[1] ? "you" : s.score[0] < s.score[1] ? "partner" : "tie";
    }
  }
  function kittyPlay(s, index, shield) {
    if (s.done || s.turn !== "you" || !s.cups[index] || s.cups[index].owner !== null || !s.hand[s.selected]) { return false; }
    s.cups[index].owner = "you"; s.cups[index].card = s.hand.splice(s.selected, 1)[0];
    if (shield && s.advanced && s.assist[0]) { s.cups[index].shield = true; s.assist[0] = false; }
    s.hand.push(s.draw()); s.selected = 0; s.events = [{ kind: "place", owner: "you", index: index }];
    kittyScores(s); if (!s.done) { s.turn = "partner"; } return true;
  }
  function kittyAssist(s, index) {
    if (!s.advanced || s.done || s.turn !== "you" || !s.assist[0] || !s.cups[index] || s.cups[index].owner !== "you" || s.cups[index].shield) { return false; }
    s.cups[index].shield = true; s.assist[0] = false; s.events = [{ kind: "shield", index: index }]; return true;
  }
  function kittyTactic(s, action, index) {
    if (!s.advanced || s.done || s.turn !== "you" || !s.tactics[0]) { return false; }
    var cup = s.cups[index];
    if (action === "redraw" && s.hand[s.selected]) { s.hand[s.selected] = s.draw(); }
    else if (action === "boost" && cup && cup.owner === "you" && cup.card.value < 8) { cup.card.value = Math.min(8, cup.card.value + 2); }
    else if (action === "repaint" && cup && cup.owner && !(cup.owner === "partner" && cup.shield)) { cup.color = (cup.color + 1) % 3; }
    else { return false; }
    s.tactics[0]--; s.events = [{ kind: action, index: index }]; kittyScores(s); return true;
  }
  function kittyPartner(s) {
    if (s.done || s.turn !== "partner") { return false; }
    var best = null, score = -Infinity;
    s.cups.forEach(function (cup, ci) {
      if (cup.owner !== null) { return; }
      s.otherHand.forEach(function (card, hi) {
        var value = card.value * (card.color === cup.color ? 2 : 1);
        if (value > score) { score = value; best = { cup: ci, hand: hi }; }
      });
    });
    s.events = [];
    if (s.advanced && s.assist[1]) {
      var target = s.cups.filter(function (cup) { return cup.owner === "you" && !cup.shield && cup.card.value > 3; })[0];
      if (target) { target.card = { color: target.card.color, value: Math.max(1, target.card.value - 2) }; s.assist[1] = false; s.events.push({ kind: "nudge" }); }
    }
    if (best) {
      s.cups[best.cup].owner = "partner"; s.cups[best.cup].card = s.otherHand.splice(best.hand, 1)[0];
      s.otherHand.push(s.draw()); s.events.push({ kind: "place", owner: "partner", index: best.cup });
    }
    if (s.advanced && s.tactics[1]) {
      var tactic = null, benefit = 0;
      s.cups.forEach(function (cup, index) {
        if (!cup.card) { return; }
        var boost = cup.owner === "partner" ? Math.min(2, 8 - cup.card.value) * (cup.color === cup.card.color ? 2 : 1) : 0;
        var repaint = cup.owner === "you" && !cup.shield && cup.color === cup.card.color ? cup.card.value : 0;
        if (boost > benefit) { benefit = boost; tactic = { index: index, kind: "boost" }; }
        if (repaint > benefit) { benefit = repaint; tactic = { index: index, kind: "repaint" }; }
      });
      if (tactic) { var chosen = s.cups[tactic.index]; if (tactic.kind === "boost") { chosen.card.value += Math.min(2, 8 - chosen.card.value); } else { chosen.color = (chosen.color + 1) % 3; }
        s.tactics[1]--; s.events.push({ kind: tactic.kind, index: tactic.index, owner: "partner" }); }
    }
    kittyScores(s); if (!s.done) { s.turn = "you"; } return true;
  }

  function mountDates(host, options) {
    var t = App.t, progress = readDates(App.storage.getItem("love-deepspace-dates-v1"));
    var partner, mode = "claw", claw, kitty, active = false, paused = false, raf = null, last = 0;
    var keys = {}, held = 0, aimed = null, drop = false, grip = false, help = false, kittyWait = 0, guard = false, kittyAction = "";
    var kittySession = 0;
    var storyStep = 0, storyScore = 0, storyChoices = [], focusElapsed = 0, focusLimit = 60, focusDone = false;
    var photo = { scene: "night", frame: "polaroid", sticker: "heart", zoom: 1, pan: .62, art: 0 }, photoDrag = null;
    function el(tag, cls, key, parent) {
      var n = document.createElement(tag); if (cls) { n.className = cls; }
      if (key) { n.setAttribute("data-i18n", key); n.textContent = t(key); } if (parent) { parent.appendChild(n); } return n;
    }
    function btn(cls, key, parent, handler) { var n = el("button", cls, key, parent); n.type = "button"; if (handler) { n.addEventListener("click", handler); } return n; }
    function save() { App.storage.setItem("love-deepspace-dates-v1", JSON.stringify(progress)); }
    function reduced() { return document.documentElement.getAttribute("data-motion") === "off" || (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); }
    function cancel() { if (raf !== null) { window.cancelAnimationFrame(raf); raf = null; } }
    function clearInputs() { keys = {}; held = 0; aimed = null; drop = false; grip = false; help = false; photoDrag = null; }
    function reward(kind, value) {
      var fresh = false, id = partner.id;
      if (kind === "plushie" && progress.plushies[id].indexOf(value) < 0) { progress.plushies[id].push(value); fresh = true; }
      if (kind === "badge" && !progress.badges[id]) { progress.badges[id] = true; fresh = true; }
      if (kind === "story" && progress.stories[id].indexOf(value) < 0) { progress.stories[id].push(value); fresh = true; }
      if (kind === "focus") { fresh = !progress.focus[id]; progress.focus[id] = Math.min(999, progress.focus[id] + 1); }
      save(); if (fresh) { options.onReward(kind, value); } options.onMoment(fresh ? "Win" : "Talk"); renderShelf(); return fresh;
    }
    var root = el("section", "lds-dates", null, host); root.tabIndex = -1;
    var intro = el("div", "lds-date-intro", null, root);
    el("strong", "", "ldsDateTitle", intro); el("p", "", "ldsDateIntro", intro);
    var nav = el("div", "lds-date-nav", null, root); nav.setAttribute("role", "group"); nav.setAttribute("aria-label", t("ldsDateTitle"));
    var tabs = {}, pages = {};
    ["claw", "kitty", "story", "photo", "focus", "chat", "home", "cook", "starpath"].forEach(function (id) {
      var key = "ldsDate" + id.charAt(0).toUpperCase() + id.slice(1);
      tabs[id] = btn("lds-date-tab", key, nav, function () { select(id); });
      tabs[id].setAttribute("data-date", id);
      pages[id] = el("div", "lds-date-page lds-date-" + id, null, root); pages[id].hidden = id !== mode;
    });
    var homeGame = App.mountLdsHome(pages, {
      getDates: function () { return progress; }, onSelect: select,
      isHidden: function () { return options.isHidden() || root.hidden; },
      onRunning: options.onRunning, onMoment: options.onMoment, onReward: options.onReward
    });
    var starpathGame = App.mountLdsStarpath(pages.starpath, {
      isHidden: function () { return options.isHidden() || root.hidden || pages.starpath.hidden; },
      onReward: options.onReward, onMoment: options.onMoment
    });
    var journey = App.mountLdsJourney(root, {
      getPartner: function () { return partner; },
      getState: function () { return { album: options.getAlbum ? options.getAlbum() : {}, dates: progress, home: homeGame.inspect().progress, starpath: starpathGame.getProgress() }; },
      go: function (id) { if (id === "mission") { if (options.onMission) { options.onMission(); } } else { select(id); } }
    });
    root.insertBefore(journey.element, nav);
    root.addEventListener("click", function () { if (partner) { journey.refresh(); } });
    var toolbar = el("div", "lds-date-toolbar", null, root);
    var pauseBtn = btn("lds-small-button", null, toolbar, function () { if (active) { pause(); } else { start(); } });
    var restartBtn = btn("lds-small-button", "ldsDateRestart", toolbar, function () { resetActivity(); });
    var status = el("p", "lds-date-status", null, root); status.setAttribute("role", "status"); status.setAttribute("aria-live", "polite");
    var shelf = el("div", "lds-date-shelf", null, root);
    function tell(key, data) { status.textContent = t(key, data); }

    // A real moving machine. Its rope, claw, and lifted prize follow simulation state.
    var challengeLabel = el("label", "lds-kitty-mode", null, pages.claw);
    var challenge = el("input", "", null, challengeLabel); challenge.type = "checkbox";
    el("span", "", "ldsClawChallenge", challengeLabel); challenge.addEventListener("change", resetActivity);
    el("p", "lds-date-hint", "ldsClawHint", pages.claw);
    var challengeHint = el("p", "lds-date-hint", "ldsClawChallengeHint", pages.claw); challengeHint.hidden = true;
    var clawHud = el("div", "lds-date-score", null, pages.claw);
    var machine = el("div", "lds-claw-machine", null, pages.claw); machine.tabIndex = 0;
    machine.setAttribute("role", "application"); machine.setAttribute("aria-label", t("ldsClawHint"));
    var machineTitle = el("span", "lds-claw-sign", "ldsClawSign", machine);
    var rope = el("i", "lds-claw-rope", null, machine);
    var clawArm = el("span", "lds-claw-arm", null, machine); clawArm.textContent = "⌁"; clawArm.setAttribute("aria-hidden", "true");
    var lifted = el("span", "lds-claw-lifted", null, machine); lifted.setAttribute("aria-hidden", "true");
    var chute = el("div", "lds-claw-chute", "ldsClawChute", machine);
    var toyNodes = toys.map(function (id, i) { var toy = el("span", "lds-claw-toy", null, machine); toy.textContent = toySymbols[i]; toy.setAttribute("aria-label", t("ldsToy" + i)); return toy; });
    var clawControls = el("div", "lds-claw-controls", null, pages.claw);
    var leftBtn = btn("lds-small-button", "ldsClawLeft", clawControls, function () { if (active && claw.phase === "aim") { claw.x = clamp(claw.x - 24, 50, 550); syncClaw(); } });
    var dropBtn = btn("primary", null, clawControls, function () { if (active) { machine.focus({ preventScroll: true }); if (claw.phase === "grip") { grip = true; } else { drop = true; } } });
    var rightBtn = btn("lds-small-button", "ldsClawRight", clawControls, function () { if (active && claw.phase === "aim") { claw.x = clamp(claw.x + 24, 50, 550); syncClaw(); } });
    var helpBtn = btn("lds-small-button", "ldsDateEvol", clawControls, function () { if (active) { machine.focus({ preventScroll: true }); help = true; } });
    [leftBtn, rightBtn].forEach(function (button, index) {
      button.addEventListener("pointerdown", function (e) { if (active) { e.preventDefault(); held = index ? 1 : -1; if (button.setPointerCapture) { button.setPointerCapture(e.pointerId); } } });
      ["pointerup", "pointercancel", "lostpointercapture"].forEach(function (name) { button.addEventListener(name, function () { held = 0; }); });
    });
    var gripMeter = el("div", "lds-grip-meter", null, pages.claw); gripMeter.hidden = true;
    el("span", "lds-grip-zone", null, gripMeter); var gripNeedle = el("i", "", null, gripMeter);
    gripMeter.setAttribute("role", "meter"); gripMeter.setAttribute("aria-label", t("ldsGripTiming")); gripMeter.setAttribute("aria-valuemin", "0"); gripMeter.setAttribute("aria-valuemax", "100");
    function positionAim(e) { var r = machine.getBoundingClientRect(); aimed = clamp((e.clientX - r.left) / r.width * 600, 50, 550); }
    machine.addEventListener("pointerdown", function (e) { if (!active || claw.phase !== "aim") { return; } e.preventDefault(); machine.focus({ preventScroll: true }); photoDrag = e.pointerId; positionAim(e); if (machine.setPointerCapture) { machine.setPointerCapture(e.pointerId); } });
    machine.addEventListener("pointermove", function (e) { if (photoDrag === e.pointerId) { positionAim(e); } });
    ["pointerup", "pointercancel", "lostpointercapture"].forEach(function (name) { machine.addEventListener(name, function (e) { if (photoDrag === e.pointerId) { photoDrag = null; } }); });
    function syncClaw() {
      clawHud.textContent = t("ldsClawStats", { n: claw.attempts, c: claw.caught.length }) + (claw.challenge ? " · " + t("ldsChallengeStats", { s: claw.score, n: claw.combo, t: Math.ceil(claw.remaining) }) : "");
      challengeHint.hidden = !claw.challenge; challenge.disabled = active;
      gripMeter.hidden = claw.phase !== "grip"; gripNeedle.style.left = claw.grip * 100 + "%"; gripMeter.setAttribute("aria-valuenow", String(Math.round(claw.grip * 100)));
      machine.style.setProperty("--claw-x", claw.x / 6 + "%"); machine.style.setProperty("--claw-y", claw.y / 3.2 + "%");
      machine.setAttribute("data-phase", claw.phase); machine.setAttribute("data-help", String(claw.help > 0));
      toyNodes.forEach(function (n, i) { n.hidden = claw.toys[i].taken; n.style.left = claw.toys[i].x / 6 + "%"; });
      lifted.hidden = !claw.target || !claw.target.taken; if (claw.target) { lifted.textContent = toySymbols[claw.target.index]; }
      dropBtn.textContent = t(claw.phase === "grip" ? "ldsClawGrip" : "ldsClawDrop"); dropBtn.disabled = !active || (claw.phase !== "aim" && claw.phase !== "grip") || claw.done;
      helpBtn.disabled = !active || claw.helped || claw.done;
      leftBtn.disabled = !active || claw.phase !== "aim"; rightBtn.disabled = leftBtn.disabled;
    }

    el("p", "lds-date-hint", "ldsKittyHint", pages.kitty);
    var kittyMode = el("label", "lds-kitty-mode", null, pages.kitty);
    var advanced = el("input", "", null, kittyMode); advanced.type = "checkbox";
    el("span", "", "ldsKittyAdvanced", kittyMode);
    advanced.addEventListener("change", resetActivity);
    var kittyHud = el("div", "lds-date-score", null, pages.kitty);
    var cups = el("div", "lds-kitty-cups", null, pages.kitty);
    var cupBtns = Array.from({ length: 12 }, function (_, index) {
      var n = btn("lds-kitty-cup", null, cups, function () {
        if (paused || mode !== "kitty") { return; }
        var tacticTurn = !!kittyAction;
        var valid = tacticTurn ? kittyTactic(kitty, kittyAction, index) : guard && kitty.cups[index].owner === "you" ? kittyAssist(kitty, index) : kittyPlay(kitty, index, guard);
        // Keep focus inside the activity before the played cup becomes disabled.
        // Otherwise native focusout would pause the partner's automatic turn.
        if (valid) { root.focus({ preventScroll: true }); guard = false; kittyAction = ""; kittyWait = .65; renderKitty(); if (kitty.done) { finishKitty(); } else if (kitty.turn === "partner") { tell("ldsKittyThinking"); start(); } else if (tacticTurn) { tell("ldsTacticUsed"); options.onMoment("Skill"); } }
      }); n.style.setProperty("--cup-color", ["#e0a8c9", "#9dcddd", "#d9c290"][index % 3]); return n;
    });
    var hand = el("div", "lds-kitty-hand", null, pages.kitty);
    var handBtns = Array.from({ length: 3 }, function (_, index) {
      return btn("lds-kitty-card", null, hand, function () { kitty.selected = index; guard = false; kittyAction = ""; renderKitty(); });
    });
    var guardBtn = btn("lds-small-button", "ldsKittyGuard", pages.kitty, function () { guard = !guard; kittyAction = ""; renderKitty(); tell(guard ? "ldsKittyGuardHint" : "ldsKittyYourTurn"); });
    var tacticsRow = el("div", "lds-kitty-tactics", null, pages.kitty), tacticsHud = el("p", "lds-date-hint", null, tacticsRow), tacticButtons = {};
    ["redraw", "boost", "repaint"].forEach(function (action) {
      tacticButtons[action] = btn("lds-small-button", "ldsTactic" + action.charAt(0).toUpperCase() + action.slice(1), tacticsRow, function () {
        if (action === "redraw") { if (kittyTactic(kitty, action)) { root.focus({ preventScroll: true }); options.onMoment("Skill"); tell("ldsTacticUsed"); } }
        else { guard = false; kittyAction = kittyAction === action ? "" : action; tell(kittyAction ? "ldsTacticTarget" : "ldsKittyYourTurn"); }
        renderKitty();
      });
    });
    function renderKitty() {
      kittyHud.textContent = t("ldsKittyScore", { a: kitty.score[0], b: kitty.score[1], name: t(partner.nameKey) });
      cupBtns.forEach(function (n, i) {
        var cup = kitty.cups[i], color = t("ldsKittyColor" + cup.color);
        n.style.setProperty("--cup-color", ["#e0a8c9", "#9dcddd", "#d9c290"][cup.color]);
        n.textContent = cup.card ? (cup.owner === "you" ? "♡ " : partner.symbol + " ") + cup.card.value + (cup.color === cup.card.color ? " ×2" : "") + (cup.shield ? " ◈" : "") : "☕";
        n.setAttribute("data-owner", cup.owner || "empty"); n.setAttribute("data-last", String(kitty.events.some(function (e) { return e.index === i; })));
        n.setAttribute("aria-label", t("ldsKittyCup", { n: i + 1, color: color }) + " · " + (cup.owner ? t(cup.owner === "you" ? "ldsKittyYou" : partner.nameKey) + " " + cup.card.value : t("ldsKittyEmpty")));
        var illegal = kittyAction === "boost" ? cup.owner !== "you" || cup.card.value >= 8 : kittyAction === "repaint" ? !cup.owner || cup.owner === "partner" && cup.shield : guard ? cup.owner === "partner" || cup.shield : cup.owner !== null;
        n.disabled = paused || kitty.done || kitty.turn !== "you" || illegal;
      });
      kitty.hand.forEach(function (card, index) {
        var n = handBtns[index];
        n.textContent = "♧ " + card.value + " · " + t("ldsKittyColor" + card.color);
        n.style.setProperty("--cup-color", ["#e0a8c9", "#9dcddd", "#d9c290"][card.color]);
        n.setAttribute("aria-pressed", String(index === kitty.selected)); n.disabled = paused || kitty.done || kitty.turn !== "you";
      });
      guardBtn.hidden = !kitty.advanced; guardBtn.disabled = paused || kitty.done || kitty.turn !== "you" || !kitty.assist[0];
      guardBtn.setAttribute("aria-pressed", String(guard));
      tacticsRow.hidden = !kitty.advanced; tacticsHud.textContent = t("ldsTacticCount", { n: kitty.tactics[0], p: kitty.tactics[1] });
      Object.keys(tacticButtons).forEach(function (action) { tacticButtons[action].disabled = paused || kitty.done || kitty.turn !== "you" || !kitty.tactics[0]; tacticButtons[action].setAttribute("aria-pressed", String(kittyAction === action)); });
    }
    function finishKitty() {
      active = false; paused = false; cancel(); clearInputs(); options.onRunning(false);
      if (kitty.winner === "you") { var fresh = reward("badge", "kitty"); tell(fresh ? "ldsKittyWonBadge" : "ldsKittyWon"); }
      else { tell(kitty.winner === "tie" ? "ldsKittyTie" : "ldsKittyLost"); options.onMoment("Talk"); }
      renderKitty(); syncToolbar();
    }

    // An original, choice-led heart-to-heart. Saved entries contain IDs only;
    // changing language replays the same keepsake in the current language.
    var chatMood = null, chatChoice = null;
    var chatHead = el("div", "lds-chat-head", null, pages.chat);
    var chatPortrait = el("img", "lds-chat-portrait", null, chatHead); chatPortrait.alt = "";
    var chatHeading = el("div", "", null, chatHead);
    var chatName = el("strong", "", null, chatHeading);
    el("p", "", "ldsChatIntro", chatHeading);
    var moodRow = el("div", "lds-chat-moods", null, pages.chat); moodRow.setAttribute("role", "group"); moodRow.setAttribute("aria-label", t("ldsChatMoodLabel"));
    var moodButtons = {};
    ["happy", "tired", "worried"].forEach(function (mood) {
      moodButtons[mood] = btn("lds-small-button", chatMoodKeys[mood], moodRow, function () { chatMood = mood; chatChoice = null; renderChat(); });
      moodButtons[mood].setAttribute("data-mood", mood);
    });
    var chatBubble = el("p", "lds-chat-bubble", null, pages.chat); chatBubble.setAttribute("role", "status"); chatBubble.setAttribute("aria-live", "polite");
    var chatReplies = el("div", "lds-chat-replies", null, pages.chat);
    [0, 1].forEach(function (choice) {
      var reply = btn("lds-story-choice", choice ? "ldsChatPlan" : "ldsChatStay", chatReplies, function () {
        if (!chatMood || chatChoice !== null) { return; }
        chatChoice = choice;
        var prior = progress.journal.find(function (entry) { return entry.partner === partner.id && entry.mood === chatMood && entry.choice === choice; });
        progress.journal = progress.journal.filter(function (entry) { return entry !== prior; });
        progress.journal.unshift({ partner: partner.id, mood: chatMood, choice: choice, favorite: prior ? prior.favorite : false });
        progress.journal = progress.journal.slice(0, 20); save(); options.onMoment("Talk"); renderChat();
        tell("ldsChatSaved");
      });
      reply.setAttribute("data-chat-choice", String(choice));
    });
    el("strong", "", "ldsChatJournal", pages.chat);
    var journal = el("div", "lds-chat-journal", null, pages.chat);
    function chatKey(id, ending) { return "lds" + "Chat" + id.charAt(0).toUpperCase() + id.slice(1) + ending; }
    function renderChat() {
      if (!partner) { return; }
      chatPortrait.src = sceneArt(partner.id, 0).src; chatName.textContent = t(partner.nameKey);
      Object.keys(moodButtons).forEach(function (mood) { moodButtons[mood].setAttribute("aria-pressed", String(mood === chatMood)); });
      chatBubble.textContent = !chatMood ? t("ldsChatPrompt") : t(chatKey(partner.id, chatMood.charAt(0).toUpperCase() + chatMood.slice(1))) + (chatChoice === null ? "" : "\n\n" + t(chatKey(partner.id, chatChoice ? "Plan" : "Stay")));
      chatReplies.hidden = !chatMood || chatChoice !== null;
      while (journal.firstChild) { journal.removeChild(journal.firstChild); }
      var entries = progress.journal.filter(function (entry) { return entry.partner === partner.id; });
      entries.sort(function (a, b) { return Number(b.favorite) - Number(a.favorite); });
      if (!entries.length) { el("p", "lds-chat-empty", "ldsChatEmpty", journal); }
      entries.forEach(function (entry) {
        var row = el("div", "lds-chat-entry", null, journal);
        var replay = btn("lds-small-button lds-chat-replay", null, row, function () { chatMood = entry.mood; chatChoice = entry.choice; renderChat(); chatBubble.focus({ preventScroll: true }); });
        replay.textContent = t(chatMoodKeys[entry.mood]) + " · " + t(entry.choice ? "ldsChatPlan" : "ldsChatStay");
        var pin = btn("lds-small-button lds-chat-pin", null, row, function () { entry.favorite = !entry.favorite; save(); renderChat(); });
        pin.textContent = entry.favorite ? "★" : "☆"; pin.setAttribute("aria-pressed", String(entry.favorite)); pin.setAttribute("aria-label", t("ldsChatPin"));
      });
    }
    chatBubble.tabIndex = -1;

    // Original branching vignettes; partner-specific lines surround three choices.
    var storyTitle = el("h4", "", null, pages.story);
    var storyText = el("p", "lds-story-text", null, pages.story);
    var storyNav = el("div", "lds-story-choices", null, pages.story);
    function renderStory() {
      storyTitle.textContent = t("ldsStoryTitle", { name: t(partner.nameKey), n: Math.min(3, storyStep + 1) });
      while (storyNav.firstChild) { storyNav.removeChild(storyNav.firstChild); }
      if (storyStep === 3) {
        var ending = storyScore >= 2 ? "adventure" : "quiet";
        storyText.textContent = t(ending === "adventure" ? "ldsStoryAdventureEnd" : "ldsStoryQuietEnd", { name: t(partner.nameKey) });
        reward("story", ending); tell("ldsStorySaved"); return;
      }
      var selected = storyChoices.length ? t("ldsStoryReply" + storyChoices[storyChoices.length - 1], { name: t(partner.nameKey) }) + " " : "";
      storyText.textContent = selected + t("ldsStoryScene" + storyStep, { name: t(partner.nameKey) }) + " " + t("ldsDateLine" + partner.id.charAt(0).toUpperCase() + partner.id.slice(1));
      [0, 1].forEach(function (choice) {
        btn("lds-story-choice", "ldsStoryChoice" + storyStep + choice, storyNav, function () {
          storyChoices.push(choice); storyScore += choice; storyStep++; options.onMoment(choice ? "Skill" : "Talk"); renderStory();
        });
      });
    }

    // All exported photographs are rendered from local portrait pixels, never a remote video.
    el("p", "lds-date-hint", "ldsPhotoHint", pages.photo);
    var photoControls = el("div", "lds-photo-settings", null, pages.photo);
    var photoSelects = {};
    function choosePhoto(field, values, key) {
      var label = el("label", "", null, photoControls); el("span", "", key, label);
      var select = el("select", "", null, label);
      select.setAttribute("aria-label", t(key)); values.forEach(function (value) { var o = el("option", "", "ldsPhoto" + value.charAt(0).toUpperCase() + value.slice(1), select); o.value = value; });
      select.addEventListener("change", function () { photo[field] = select.value; drawPhoto(); }); photoSelects[field] = select;
    }
    choosePhoto("scene", ["night", "sunset", "studio"], "ldsPhotoScene");
    choosePhoto("frame", ["plain", "polaroid", "stars"], "ldsPhotoFrame");
    choosePhoto("sticker", ["heart", "star", "flower"], "ldsPhotoSticker");
    var artLabel = el("label", "", null, photoControls); el("span", "", "ldsPhotoArt", artLabel);
    var artSelect = el("select", "", null, artLabel); artSelect.setAttribute("aria-label", t("ldsPhotoArt"));
    artSelect.addEventListener("change", function () { photo.art = Number(artSelect.value); photo.pan = sceneArt(partner.id, photo.art).x; updatePhotoImage(); if (options.onArt) { options.onArt(photo.art); } });
    var zoomLabel = el("label", "", null, photoControls); el("span", "", "ldsPhotoZoom", zoomLabel);
    var zoom = el("input", "", null, zoomLabel);
    zoom.type = "range"; zoom.min = "1"; zoom.max = "1.8"; zoom.step = ".05"; zoom.value = "1";
    zoom.setAttribute("aria-label", t("ldsPhotoZoom")); zoom.addEventListener("input", function () { photo.zoom = clamp(Number(zoom.value) || 1, 1, 1.8); drawPhoto(); });
    var canvas = el("canvas", "lds-photo-canvas", null, pages.photo); canvas.width = 600; canvas.height = 600;
    canvas.tabIndex = 0; canvas.setAttribute("aria-label", t("ldsPhotoCanvas")); canvas.textContent = t("ldsPhotoCanvas");
    var photoImage = el("img", "lds-photo-source", null, pages.photo); photoImage.hidden = true; photoImage.alt = "";
    photoImage.addEventListener("load", drawPhoto);
    var photoActions = el("div", "lds-photo-actions", null, pages.photo);
    btn("primary", "ldsPhotoSave", photoActions, function () {
      var first = !progress.snapshots[partner.id]; progress.snapshots[partner.id] = true;
      progress.photos.unshift({ partner: partner.id, scene: photo.scene, frame: photo.frame, sticker: photo.sticker, zoom: photo.zoom, pan: photo.pan, art: photo.art });
      progress.photos = progress.photos.slice(0, 12); save(); renderPhotoGallery(); renderShelf();
      if (first) { options.onReward("photo", "snapshot"); } options.onMoment("Talk"); tell("ldsPhotoSaved");
      pages.photo.setAttribute("data-flash", "true");
    });
    pages.photo.addEventListener("animationend", function () { pages.photo.removeAttribute("data-flash"); });
    var downloadBtn = btn("lds-small-button", "ldsPhotoDownload", photoActions, function () {
      var filename = "starbond-" + partner.id + ".png";
      function download(href) { var link = el("a", "", null, root); link.download = filename; link.href = href; link.click(); link.remove(); tell("ldsPhotoDownloaded"); }
      try {
        canvas.toBlob(function (blob) {
          if (!blob) { tell("ldsPhotoUnavailable"); return; }
          var url = window.URL.createObjectURL(blob); download(url);
          window.setTimeout(function () { window.URL.revokeObjectURL(url); }, 1000);
        }, "image/png");
      }
      catch (error) { tell("ldsPhotoUnavailable"); }
    });
    var gallery = el("div", "lds-photo-gallery", null, pages.photo);
    var stripShots = [], stripImages = [];
    var stripSection = el("section", "lds-strip-section", null, pages.photo);
    el("strong", "", "ldsStripTitle", stripSection); el("p", "lds-date-hint", "ldsStripHint", stripSection);
    var stripControls = el("div", "lds-gallery-tools", null, stripSection);
    var captureStrip = btn("lds-small-button", "ldsStripCapture", stripControls, function () {
      if (stripShots.length >= 4 || !(photoImage.complete && photoImage.naturalWidth > 0)) { return; }
      stripShots.push(normalizeStripShot(photo)); loadStripImages();
      if (stripShots.length === 4) {
        var first = !progress.snapshots[partner.id]; progress.snapshots[partner.id] = true;
        progress.strips.unshift({ partner: partner.id, shots: stripShots.map(function (s) { return normalizeStripShot(s); }) }); progress.strips = progress.strips.slice(0, 4); save();
        if (first) { options.onReward("photo", "snapshot"); } options.onMoment("Talk"); renderShelf(); renderStripGallery(); tell("ldsStripSaved");
      }
      syncStrip();
    });
    btn("lds-small-button", "ldsStripNew", stripControls, function () { stripShots = []; stripImages = []; syncStrip(); });
    var stripDownload = btn("lds-small-button", "ldsStripDownload", stripControls, function () {
      if (stripDownload.disabled) { return; }
      var filename = "starbond-four-moments-" + partner.id + ".png";
      try { stripCanvas.toBlob(function (blob) { if (!blob) { tell("ldsPhotoUnavailable"); return; } var url = window.URL.createObjectURL(blob), link = el("a", "", null, root); link.download = filename; link.href = url; link.click(); link.remove(); window.setTimeout(function () { window.URL.revokeObjectURL(url); }, 1000); tell("ldsPhotoDownloaded"); }, "image/png"); } catch (_) { tell("ldsPhotoUnavailable"); }
    });
    var stripCount = el("p", "lds-strip-count", null, stripSection); stripCount.setAttribute("role", "status");
    var stripCanvas = el("canvas", "lds-strip-canvas", null, stripSection); stripCanvas.width = 300; stripCanvas.height = 1260; stripCanvas.setAttribute("aria-label", t("ldsStripTitle"));
    var stripGallery = el("div", "lds-strip-gallery", null, stripSection);
    function loadStripImages() {
      stripImages = stripShots.map(function (shot) { var img = document.createElement("img"); img.addEventListener("load", syncStrip); img.addEventListener("error", syncStrip); img.src = sceneArt(partner.id, shot.art).src; return img; });
    }
    function syncStrip() {
      captureStrip.disabled = stripShots.length === 4 || !(photoImage.complete && photoImage.naturalWidth > 0);
      stripDownload.disabled = stripShots.length !== 4 || stripImages.some(function (img) { return !img.complete || !img.naturalWidth; });
      stripCount.textContent = t("ldsStripCount", { n: stripShots.length }); stripCanvas.hidden = stripShots.length === 0;
      var ctx = stripCanvas.getContext("2d"); if (!ctx || !partner) { return; }
      ctx.fillStyle = "#f5edf0"; ctx.fillRect(0, 0, 300, 1260);
      for (var i = 0; i < 4; i++) {
        var y = 18 + i * 294, shot = stripShots[i], img = stripImages[i];
        ctx.fillStyle = "#d8cedd"; ctx.fillRect(18, y, 264, 264);
        if (shot && img && img.complete && img.naturalWidth > 0) {
          var sh = Math.min(img.naturalHeight, img.naturalWidth) / shot.zoom;
          var sx = clamp(img.naturalWidth * shot.pan - sh / 2, 0, img.naturalWidth - sh), sy = clamp(img.naturalHeight * sceneArt(partner.id, shot.art).y - sh / 2, 0, img.naturalHeight - sh);
          ctx.drawImage(img, sx, sy, sh, sh, 18, y, 264, 264);
          ctx.fillStyle = shot.scene === "night" ? "#3b2d6b22" : shot.scene === "sunset" ? "#e9987833" : "#b4d9e811"; ctx.fillRect(18, y, 264, 264);
          ctx.strokeStyle = shot.frame === "polaroid" ? "#fff8f3" : partner.color; ctx.lineWidth = shot.frame === "polaroid" ? 5 : 2; ctx.strokeRect(20, y + 2, 260, 260);
          if (shot.frame === "stars") { ctx.fillStyle = "#ffe4f1"; ctx.font = "16px sans-serif"; ctx.textAlign = "left"; ctx.fillText("✧ ✦ ✧", 30, y + 250); }
          ctx.fillStyle = "#ffe4f1"; ctx.font = "28px sans-serif"; ctx.textAlign = "right"; ctx.fillText({ heart: "♡", star: "✦", flower: "✿" }[shot.sticker], 267, y + 36);
        }
        ctx.fillStyle = "#655371"; ctx.font = "12px sans-serif"; ctx.textAlign = "left"; ctx.fillText("0" + (i + 1), 22, y + 279);
      }
      ctx.fillStyle = "#3a2e4e"; ctx.font = "17px sans-serif"; ctx.textAlign = "center"; ctx.fillText(t(partner.nameKey) + " · " + t("ldsStripCaption"), 150, 1212);
      ctx.font = "8px sans-serif"; ctx.fillText(t("ldsCredit"), 150, 1246);
    }
    function renderStripGallery() {
      while (stripGallery.firstChild) { stripGallery.removeChild(stripGallery.firstChild); }
      progress.strips.filter(function (strip) { return strip.partner === partner.id; }).forEach(function (strip, index) { btn("lds-small-button", null, stripGallery, function () { stripShots = strip.shots.map(normalizeStripShot); loadStripImages(); syncStrip(); }).textContent = t("ldsStripOpen", { n: index + 1 }); });
    }
    photoImage.addEventListener("load", syncStrip); photoImage.addEventListener("error", syncStrip);
    function renderPhotoGallery() {
      while (gallery.firstChild) { gallery.removeChild(gallery.firstChild); }
      progress.photos.forEach(function (p, index) {
        var n = btn("lds-photo-thumb", null, gallery, function () {
          if (p.partner !== partner.id) { options.onPartner(p.partner); select("photo"); }
          photo = { scene: p.scene, frame: p.frame, sticker: p.sticker, zoom: p.zoom, pan: p.pan, art: p.art }; syncPhotoControls(); updatePhotoImage(); if (options.onArt) { options.onArt(photo.art); } tell("ldsPhotoOpened");
        });
        var img = el("img", "", null, n); img.src = sceneArt(p.partner, p.art).src; img.alt = "";
        img.style.objectPosition = p.pan * 100 + "% " + sceneArt(p.partner, p.art).y * 100 + "%";
        el("span", "", null, n).textContent = "0" + (index + 1) + " · " + t("ldsPartner" + p.partner.charAt(0).toUpperCase() + p.partner.slice(1));
      });
      renderStripGallery();
    }
    function syncPhotoControls() { Object.keys(photoSelects).forEach(function (key) { photoSelects[key].value = photo[key]; }); zoom.value = String(photo.zoom); artSelect.value = String(photo.art); }
    function updatePhotoImage() { var next = sceneArt(partner.id, photo.art).src; if (photoImage.getAttribute("src") !== next) { downloadBtn.disabled = true; photoImage.src = next; } drawPhoto(); syncStrip(); }
    function drawPhoto() {
      if (!partner) { return; }
      var ctx = canvas.getContext("2d"); if (!ctx) { return; }
      downloadBtn.disabled = !(photoImage.complete && photoImage.naturalWidth > 0);
      var backgrounds = { night: ["#1e2343", "#59496e"], sunset: ["#d69a98", "#724e83"], studio: ["#a3bdc9", "#e7dbe2"] };
      var bg = ctx.createLinearGradient(0, 0, 600, 600); bg.addColorStop(0, backgrounds[photo.scene][0]); bg.addColorStop(1, backgrounds[photo.scene][1]);
      ctx.fillStyle = bg; ctx.fillRect(0, 0, 600, 600);
      var margin = photo.frame === "plain" ? 20 : 38, bottom = photo.frame === "polaroid" ? 108 : 52;
      var width = 600 - margin * 2, height = 600 - margin - bottom;
      ctx.save(); ctx.beginPath(); ctx.rect(margin, margin, width, height); ctx.clip();
      if (photoImage.complete && photoImage.naturalWidth > 0) {
        var aspect = width / height, sh = Math.min(photoImage.naturalHeight, photoImage.naturalWidth / aspect) / photo.zoom, sw = sh * aspect;
        var sx = clamp(photoImage.naturalWidth * photo.pan - sw / 2, 0, photoImage.naturalWidth - sw);
        var sy = clamp(photoImage.naturalHeight * (photo.art ? sceneArt(partner.id, photo.art).y : .42) - sh / 2, 0, photoImage.naturalHeight - sh);
        ctx.drawImage(photoImage, sx, sy, sw, sh, margin, margin, width, height);
      }
      ctx.fillStyle = photo.scene === "night" ? "#3b2d6b22" : photo.scene === "sunset" ? "#e9987833" : "#b4d9e811"; ctx.fillRect(margin, margin, width, height);
      ctx.restore();
      ctx.strokeStyle = photo.frame === "polaroid" ? "#f7edf0" : partner.color; ctx.lineWidth = photo.frame === "polaroid" ? 14 : 2; ctx.strokeRect(margin - 6, margin - 6, width + 12, height + 12);
      ctx.fillStyle = "#fff4ed"; ctx.font = "24px sans-serif"; ctx.textAlign = "center"; ctx.fillText(t(partner.nameKey) + " · " + t("ldsPhotoCaption"), 300, 600 - bottom / 2);
      ctx.font = "10px sans-serif"; ctx.fillText(t("ldsCredit"), 300, 590);
      ctx.font = "44px sans-serif"; ctx.fillStyle = "#ffd3e8"; ctx.fillText({ heart: "♡", star: "✦", flower: "✿" }[photo.sticker], 530, 75);
      if (photo.frame === "stars") { ctx.font = "24px sans-serif"; [60, 180, 300, 420, 540].forEach(function (x, i) { ctx.fillText(i % 2 ? "✧" : "✦", x, 570); }); }
    }
    canvas.addEventListener("pointerdown", function (e) { e.preventDefault(); canvas.focus({ preventScroll: true }); photoDrag = { id: e.pointerId, x: e.clientX, pan: photo.pan }; if (canvas.setPointerCapture) { canvas.setPointerCapture(e.pointerId); } pages.photo.removeAttribute("data-flash"); });
    canvas.addEventListener("pointermove", function (e) { if (photoDrag && photoDrag.id === e.pointerId) { var r = canvas.getBoundingClientRect(); photo.pan = clamp(photoDrag.pan - (e.clientX - photoDrag.x) / r.width * .7, 0, 1); drawPhoto(); } });
    ["pointerup", "pointercancel", "lostpointercapture"].forEach(function (name) { canvas.addEventListener(name, function () { photoDrag = null; }); });
    canvas.addEventListener("keydown", function (e) { if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); photo.pan = clamp(photo.pan + (e.key === "ArrowLeft" ? -.04 : .04), 0, 1); drawPhoto(); } });

    el("p", "lds-date-hint", "ldsFocusHint", pages.focus);
    var focusRow = el("label", "lds-focus-duration", null, pages.focus); el("span", "", "ldsFocusDuration", focusRow);
    var duration = el("select", "", null, focusRow); duration.setAttribute("aria-label", t("ldsFocusDuration"));
    [60, 300, 900].forEach(function (seconds) { var o = el("option", "", null, duration); o.value = String(seconds); o.textContent = t("ldsFocusMinutes", { n: seconds / 60 }); });
    duration.addEventListener("change", function () { focusLimit = Number(duration.value); resetActivity(); });
    var clock = el("div", "lds-focus-clock", null, pages.focus);
    var clockValue = el("strong", "", null, clock), clockCaption = el("span", "", "ldsFocusTogether", clock);
    var focusProgress = el("div", "lds-focus-progress", null, pages.focus), focusFill = el("i", "", null, focusProgress);
    function syncFocus() { var remaining = Math.max(0, Math.ceil(focusLimit - focusElapsed)); clockValue.textContent = Math.floor(remaining / 60) + ":" + String(remaining % 60).padStart(2, "0"); focusFill.style.width = Math.min(100, focusElapsed / focusLimit * 100) + "%"; duration.disabled = active; }
    function renderShelf() {
      if (!partner) { return; } var id = partner.id;
      while (shelf.firstChild) { shelf.removeChild(shelf.firstChild); }
      el("strong", "", null, shelf).textContent = t("ldsDateCollection", { name: t(partner.nameKey) });
      var row = el("div", "lds-date-collection", null, shelf);
      toys.forEach(function (toy, i) { var n = el("span", "lds-date-collected", null, row); var owned = progress.plushies[id].indexOf(toy) >= 0; n.textContent = owned ? toySymbols[i] : "?"; n.setAttribute("data-owned", String(owned)); n.setAttribute("aria-label", t("ldsToy" + i) + " · " + t(owned ? "ldsDateCollected" : "ldsMemoryLocked")); });
      el("p", "", null, shelf).textContent = t("ldsDateCollectionStats", { n: progress.plushies[id].length, b: progress.badges[id] ? 1 : 0, s: progress.stories[id].length, f: progress.focus[id] });
      el("p", "lds-challenge-record", null, shelf).textContent = t("ldsChallengeBest", { n: progress.clawBest[id] });
    }
    function syncToolbar() {
      toolbar.hidden = ["photo", "chat", "home", "cook", "starpath"].indexOf(mode) >= 0; pauseBtn.hidden = mode === "story";
      pauseBtn.textContent = t(active ? "ldsBattlePause" : paused ? "ldsDateResume" : "ldsDateStart");
      pauseBtn.disabled = mode === "claw" && claw.done || mode === "kitty" && kitty.done || mode === "focus" && focusDone;
      root.setAttribute("data-active", String(active)); root.setAttribute("data-paused", String(paused));
      if (mode === "kitty") { renderKitty(); }
      if (mode === "claw") { syncClaw(); }
      if (mode === "focus") { syncFocus(); }
    }
    function pause() {
      homeGame.pause();
      starpathGame.pause();
      if (!active) { clearInputs(); return; } active = false; paused = true; cancel(); clearInputs();
      tell("ldsDatePaused"); syncToolbar(); options.onRunning(false);
    }
    function frame(now) {
      raf = null; if (!active) { return; }
      if (document.hidden || options.isHidden() || now - last > 1000) { pause(); return; }
      var elapsed = Math.max(0, (now - last) / 1000), dt = clamp(elapsed, 0, .05); last = now;
      if (mode === "claw") {
        stepClaw(claw, dt, { x: held || ((keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0)), aim: aimed, drop: drop, grip: grip, help: help }); drop = false; grip = false; help = false;
        claw.events.forEach(function (e) {
          if (e.kind === "help") { tell("ldsClawHelp"); options.onMoment("Skill"); }
          if (e.kind === "catch") { var fresh = reward("plushie", e.toy); tell(fresh ? "ldsClawCollected" : "ldsClawDuplicate", { toy: t("ldsToy" + toys.indexOf(e.toy)) }); }
          if (e.kind === "miss") { tell("ldsClawMiss"); options.onMoment("Miss"); }
          if (e.kind === "perfect" || e.kind === "grip" || e.kind === "slip") { tell(e.kind === "perfect" ? "ldsGripPerfect" : e.kind === "grip" ? "ldsGripGood" : "ldsGripMiss"); options.onMoment(e.kind === "slip" ? "Miss" : "Skill"); }
          if (e.kind === "finish") { active = false; paused = false; options.onRunning(false); if (claw.challenge) { progress.clawBest[partner.id] = Math.max(progress.clawBest[partner.id], claw.score); save(); renderShelf(); } tell(claw.challenge ? "ldsChallengeEnd" : "ldsClawFinished", { n: claw.caught.length, s: claw.score }); }
        }); syncClaw();
      } else if (mode === "kitty") {
        if (kitty.turn === "partner") { kittyWait -= dt; if (kittyWait <= 0) { kittyPartner(kitty); renderKitty(); options.onMoment("Talk"); if (kitty.done) { finishKitty(); } else { tell(kitty.events.some(function (e) { return e.kind === "boost" || e.kind === "repaint"; }) ? "ldsPartnerTactic" : kitty.events.some(function (e) { return e.kind === "nudge"; }) ? "ldsKittyNudged" : "ldsKittyYourTurn"); } } }
      } else if (mode === "focus") {
        focusElapsed += elapsed; syncFocus();
        if (focusElapsed >= focusLimit) { focusDone = true; active = false; paused = false; reward("focus", "session"); tell("ldsFocusComplete"); options.onRunning(false); }
      }
      if (mode !== "kitty") { syncToolbar(); } if (active) { raf = window.requestAnimationFrame(frame); }
    }
    function start() {
      if (active || pauseBtn.disabled || ["story", "photo", "chat", "home", "cook", "starpath"].indexOf(mode) >= 0) { return; }
      active = true; paused = false; clearInputs(); last = performance.now(); syncToolbar(); options.onRunning(true);
      tell(mode === "claw" ? "ldsClawReady" : mode === "kitty" ? (kitty.turn === "you" ? "ldsKittyYourTurn" : "ldsKittyThinking") : "ldsFocusStarted");
      if (mode === "claw") { machine.focus({ preventScroll: true }); }
      raf = window.requestAnimationFrame(frame);
    }
    function resetActivity() {
      active = false; paused = false; cancel(); clearInputs(); guard = false; kittyAction = ""; options.onRunning(false);
      claw = createClaw(partner.id, challenge.checked);
      kitty = createKitty(partner.id, advanced.checked, (Date.now() ^ Math.imul(++kittySession, 2654435761)) >>> 0);
      storyStep = 0; storyScore = 0; storyChoices = []; focusElapsed = 0; focusDone = false;
      chatMood = null; chatChoice = null; renderChat();
      renderKitty(); renderStory(); syncFocus(); syncClaw(); renderShelf(); syncToolbar();
      tell("ldsDateReady", { name: t(partner.nameKey) });
    }
    function select(id) {
      if (!pages[id]) { return; }
      pause(); mode = id;
      Object.keys(pages).forEach(function (key) { pages[key].hidden = key !== id; tabs[key].setAttribute("aria-pressed", String(key === id)); });
      if (id === "photo") { updatePhotoImage(); renderPhotoGallery(); }
      if (id === "chat") { renderChat(); }
      if (id === "home" || id === "cook") { homeGame.refresh(); }
      if (id === "starpath") { starpathGame.refresh(); }
      if (partner) { journey.refresh(); }
      syncToolbar();
      if (id === "kitty" && kitty.done) { tell(kitty.winner === "you" ? "ldsKittyWon" : kitty.winner === "tie" ? "ldsKittyTie" : "ldsKittyLost"); }
      else if (id === "claw" && claw.done) { tell(claw.challenge ? "ldsChallengeEnd" : "ldsClawFinished", { n: claw.caught.length, s: claw.score }); }
      else if (id === "focus" && focusDone) { tell("ldsFocusComplete"); }
      else { tell(id === "starpath" ? "lspReady" : id === "home" ? "ldhHomeIntro" : id === "cook" ? "ldhKitchenIntro" : id === "chat" ? "ldsChatPrompt" : id === "story" ? "ldsStoryHint" : id === "photo" ? "ldsPhotoHint" : paused ? "ldsDatePaused" : "ldsDateReady", { name: t(partner.nameKey) }); }
    }
    function setPartner(next) {
      partner = next;
      // readDates normalizes all partner dictionaries, including fresh saves.
      if (!progress.plushies[partner.id]) { progress.plushies[partner.id] = []; }
      if (!progress.stories[partner.id]) { progress.stories[partner.id] = []; }
      if (!progress.focus[partner.id]) { progress.focus[partner.id] = 0; }
      root.style.setProperty("--lds-date-accent", partner.color);
      homeGame.setPartner(partner);
      starpathGame.setPartner(partner);
      stripShots = []; stripImages = []; syncStrip();
      photo.art = options.getArt ? options.getArt(partner.id) : 0; photo.pan = sceneArt(partner.id, photo.art).x;
      while (artSelect.firstChild) { artSelect.removeChild(artSelect.firstChild); }
      for (var i = 0; i < App.ldsArtCount; i++) { var artOption = el("option", "", null, artSelect); artOption.value = String(i); artOption.textContent = sceneArt(partner.id, i).title; }
      updatePhotoImage();
      resetActivity(); syncPhotoControls(); drawPhoto(); renderPhotoGallery(); select(mode);
    }
    root.addEventListener("keydown", function (e) {
      var key = String(e.key).toLowerCase();
      if ((key === "p" || key === "escape") && active) { e.preventDefault(); e.stopPropagation(); pause(); return; }
      if (mode !== "claw" || !active || ["a", "d", "arrowleft", "arrowright", " ", "e"].indexOf(key) < 0) { return; }
      e.preventDefault(); e.stopPropagation(); keys[key] = true; aimed = null;
      if (!e.repeat && key === " ") { if (claw.phase === "grip") { grip = true; } else { drop = true; } }
      if (!e.repeat && key === "e") { help = true; }
    });
    root.addEventListener("keyup", function (e) { delete keys[String(e.key).toLowerCase()]; });
    root.addEventListener("focusout", function (e) {
      if (!e.relatedTarget || (!root.contains(e.relatedTarget) && !(mode === "focus" && options.isCompanionTarget(e.relatedTarget)))) { pause(); }
    });
    return { element: root, pause: pause, setPartner: setPartner, select: select, start: start, refresh: function () { if (!partner) { return; } journey.refresh(); if (mode === "starpath") { starpathGame.refresh(); } },
      setArt: function (index) { photo.art = sceneArt(partner.id, index).index; photo.pan = sceneArt(partner.id, index).x; syncPhotoControls(); updatePhotoImage(); },
      inspect: function () { return { claw: claw, kitty: kitty, progress: progress, active: active, paused: paused, mode: mode, focusElapsed: focusElapsed, home: homeGame.inspect(), starpath: starpathGame.getProgress(), stripShots: stripShots }; } };
  }
  App.addStrings({
    en: {
      "ldsLookOriginal": "Classic portrait",
      "ldsDateChat": "♡ Heart to heart",
      "ldsChatIntro": "A quiet corner. Your mood, his reply, a moment to keep.",
      "ldsChatMoodLabel": "How was your day?",
      "ldsChatMoodHappy": "A good day",
      "ldsChatMoodTired": "A tiring day",
      "ldsChatMoodWorried": "Something on my mind",
      "ldsChatPrompt": "Choose how your day felt. He'll meet you there.",
      "ldsChatStay": "Stay with me a little",
      "ldsChatPlan": "Let's make a small plan",
      "ldsChatJournal": "Our little moments",
      "ldsChatEmpty": "Finish a conversation to keep it here. Each partner has their own journal.",
      "ldsChatSaved": "Moment saved. You can revisit it or mark it as a favourite.",
      "ldsChatPin": "Favourite this moment",
      "ldsStripTitle": "Four little moments",
      "ldsStripHint": "Change the artwork, framing or light between captures. Four shots make a saved photo strip.",
      "ldsStripCapture": "Capture next shot",
      "ldsStripNew": "New strip",
      "ldsStripDownload": "Download photo strip",
      "ldsStripCount": "{n}/4 snapshots",
      "ldsStripSaved": "Four moments saved. Your strip is ready to revisit or download.",
      "ldsStripCaption": "Our day together",
      "ldsStripOpen": "Open strip {n}",
      "ldsDateResume": "Resume",
      "ldsGalleryTitle": "Character scenes",
      "ldsGalleryPrev": "‹ Previous scene",
      "ldsGalleryNext": "Next scene ›",
      "ldsGalleryAuto": "Scenes react to play",
      "ldsGalleryCount": "Scene {n}/{max} · {title}",
      "ldsPhotoArt": "Character artwork",
      "ldsClawChallenge": "Challenge · 60 seconds + grip timing",
      "ldsClawChallengeHint": "Faster plushies. After the claw reaches a prize, press Space again when the needle enters the mint zone. Centre hits are Perfect and increase combo points. Five drops or 60 seconds ends the challenge.",
      "ldsClawGrip": "Grip! · Space",
      "ldsGripTiming": "Grip timing: aim for the centre",
      "ldsGripPerfect": "Perfect grip! Keep the combo going.",
      "ldsGripGood": "Good grip! The prize is on its way.",
      "ldsGripMiss": "The plushie slipped. Grip in the mint zone next time.",
      "ldsChallengeStats": "{s} points · ×{n} combo · {t}s",
      "ldsChallengeBest": "Claw challenge best · {n} points",
      "ldsChallengeEnd": "Challenge complete · {n} plushies · {s} points. Try a new session to beat your record.",
      "ldsTacticRedraw": "↻ Redraw selected card",
      "ldsTacticBoost": "↑ Boost your cup +2",
      "ldsTacticRepaint": "◐ Rotate a cup colour",
      "ldsTacticCount": "Tactic charges · You {n} / Partner {p}. Use before placing a card. Boost caps at 8; rotate cycles Rose → Sky → Honey. Shields block enemy colour changes.",
      "ldsTacticTarget": "Choose an enabled occupied cup for your tactic; press the ability again to cancel.",
      "ldsTacticUsed": "Tactic played. You can still place your number card this turn.",
      "ldsPartnerTactic": "Your partner used a tactic! Check the changed cup, then take your turn.",
      "ldsDateTab": "Together",
      "ldsDateTitle": "A little more time with you",
      "ldsDateIntro": "Play, make memories, or simply stay a while. Choose a date with your partner.",
      "ldsDateClaw": "🧸 Claw machine",
      "ldsDateKitty": "☕ Kitty Cards",
      "ldsDateStory": "♡ Date story",
      "ldsDatePhoto": "📷 Photo studio",
      "ldsDateFocus": "◷ Quality time",
      "ldsDateStart": "Start together",
      "ldsDateRestart": "New session",
      "ldsDateReady": "{name} is ready. Choose Start together when you're ready to play.",
      "ldsDatePaused": "Paused. Your session is saved here until you resume.",
      "ldsDateEvol": "Evol assist · E",
      "ldsDateCollected": "Collected",
      "ldsDateCollection": "Keepsakes with {name}",
      "ldsDateCollectionStats": "Plushies {n}/5 · Kitty badge {b}/1 · Story endings {s}/2 · Focus sessions {f}",
      "ldsDateReward": "A new keepsake together · Affinity +2",
      "ldsDatePhotoReward": "Your first snapshot together · Affinity +2",
      "ldsClawHint": "Hold A / D or the arrows to move, or drag inside the machine. Space drops the claw. Aim ahead of the moving plushies! E steadies them for two seconds, once per session. P / Esc pauses.",
      "ldsClawSign": "LINKON · PLUSHIE DATE",
      "ldsClawChute": "PRIZE",
      "ldsClawLeft": "◀ Move",
      "ldsClawRight": "Move ▶",
      "ldsClawDrop": "Drop · Space",
      "ldsClawStats": "Drops left {n}/5 · Caught {c}/5",
      "ldsClawReady": "The plushies are moving. Line up the claw and drop at the right moment.",
      "ldsClawHelp": "Evol assist! The plushies hold still for two seconds.",
      "ldsClawCollected": "Caught {toy}! Added to your partner's keepsakes.",
      "ldsClawDuplicate": "Caught {toy} again. Your best friend has a twin!",
      "ldsClawMiss": "Just missed. Watch how the plushie moves before the next drop.",
      "ldsClawFinished": "Date complete · {n} plushies caught. Start a new session to collect the others.",
      "ldsToy0": "Moon rabbit",
      "ldsToy1": "Sleepy kitten",
      "ldsToy2": "Little fox",
      "ldsToy3": "Ocean whale",
      "ldsToy4": "Pocket star",
      "ldsKittyHint": "Pick a number card, then an empty cup. Matching the card and cup colour doubles its points. Your partner takes the next turn. Fill all 12 cups; the highest score wins a keepsake badge.",
      "ldsKittyAdvanced": "Advanced · shields, nudges and tactical abilities",
      "ldsKittyScore": "You {a} · {name} {b}",
      "ldsKittyCup": "Cup {n} · {color}",
      "ldsKittyColor0": "Rose",
      "ldsKittyColor1": "Sky",
      "ldsKittyColor2": "Honey",
      "ldsKittyYou": "You",
      "ldsKittyEmpty": "Empty",
      "ldsKittyGuard": "◈ Shield a cup",
      "ldsKittyGuardHint": "Place your selected card in an empty cup with a shield, or protect one of your occupied cups.",
      "ldsKittyYourTurn": "Your turn. Pick a card, then choose a cup.",
      "ldsKittyThinking": "Your partner is choosing a card…",
      "ldsKittyNudged": "Your partner used a nudge: one unshielded card lost 2 points. Your turn!",
      "ldsKittyWonBadge": "You won! A Kitty badge joins your keepsakes. Affinity +2.",
      "ldsKittyWon": "You won again! Your Kitty badge is already in the collection.",
      "ldsKittyLost": "Your partner wins this round. Try saving your strongest cards for matching cups.",
      "ldsKittyTie": "A tie. Another cup of tea and a rematch?",
      "ldsStoryTitle": "A Linkon evening with {name} · {n}/3",
      "ldsStoryHint": "Follow the evening through three choices. Explore both endings to collect two keepsakes.",
      "ldsStoryScene0": "The hunt is over. Outside the station, {name} waits under the amber streetlights. There is still time before the last train.",
      "ldsStoryScene1": "A tiny stall offers warm drinks and paper stars. Across the road, music drifts from the night market. {name} leaves the next step to you.",
      "ldsStoryScene2": "The sky clears above the waterfront. {name} slows his pace to match yours. One last moment before you both head home.",
      "ldsStoryChoice00": "Take the quiet riverside path",
      "ldsStoryChoice01": "Explore the lantern market",
      "ldsStoryChoice10": "Share a warm drink",
      "ldsStoryChoice11": "Challenge him to find the brightest star",
      "ldsStoryChoice20": "Stay and watch the water together",
      "ldsStoryChoice21": "Promise another adventure tomorrow",
      "ldsStoryReply0": "{name} smiles and lets the silence linger between you.",
      "ldsStoryReply1": "{name} accepts your challenge with a spark in his eyes.",
      "ldsStoryQuietEnd": "Quiet constellation. You and {name} watch the last reflections fade on the river. No grand promise is needed; the walk home together is enough.",
      "ldsStoryAdventureEnd": "Lantern promise. You and {name} turn the evening into a small adventure, then tuck a paper star into your pocket—a promise to find the next one together.",
      "ldsStorySaved": "This ending is saved in your keepsakes. Replay to find the other ending.",
      "ldsDateLineXavier": "“We can take the long way. I'm not in a hurry.”",
      "ldsDateLineZayne": "“It's cooler by the water. Stay close.”",
      "ldsDateLineRafayel": "“An ordinary evening? Only if you insist. I have ideas.”",
      "ldsDateLineSylus": "“Lead the way. I'll keep up.”",
      "ldsDateLineCaleb": "“Same city, new route. Let's see where this one takes us.”",
      "ldsPhotoHint": "Choose a scene, frame, and sticker. Drag the portrait to reframe it, or use the arrow keys. Zoom in for a close-up. Save up to 12 snapshots or download your picture.",
      "ldsPhotoScene": "Lighting",
      "ldsPhotoFrame": "Frame",
      "ldsPhotoSticker": "Sticker",
      "ldsPhotoZoom": "Close-up",
      "ldsPhotoNight": "Starlight",
      "ldsPhotoSunset": "Sunset",
      "ldsPhotoStudio": "Soft studio",
      "ldsPhotoPlain": "Minimal",
      "ldsPhotoPolaroid": "Polaroid",
      "ldsPhotoStars": "Constellation",
      "ldsPhotoHeart": "Heart ♡",
      "ldsPhotoStar": "Star ✦",
      "ldsPhotoFlower": "Flower ✿",
      "ldsPhotoCanvas": "Character photo. Drag to reframe, or use left and right arrows.",
      "ldsPhotoSave": "Save snapshot",
      "ldsPhotoDownload": "Download PNG",
      "ldsPhotoCaption": "Our little moment",
      "ldsPhotoSaved": "Snapshot saved. Open a thumbnail to recreate the picture.",
      "ldsPhotoDownloaded": "Your snapshot is ready to download.",
      "ldsPhotoOpened": "Saved snapshot opened.",
      "ldsPhotoUnavailable": "Download is unavailable here. Your saved snapshot stays in the album.",
      "ldsFocusHint": "Study, work, or take a quiet break together. The timer counts only while this page stays visible. Pause whenever you need; enable Animate character above for the official character loop.",
      "ldsFocusDuration": "Time together",
      "ldsFocusMinutes": "{n} minute(s)",
      "ldsFocusTogether": "A little space for just the two of you",
      "ldsFocusStarted": "Your time together has begun. Take a breath and settle in.",
      "ldsFocusComplete": "Session complete. Your first session with this partner earns affinity; every completed session is remembered.",
      "ldsCompanionHint": "Move across the scene to change the viewpoint. Choose Animate character to see the official character video.",
    },
    zh: {
      "ldsLookOriginal": "经典肖像",
      "ldsDateChat": "♡ 倾心之谈",
      "ldsChatIntro": "找个安静的角落，说说今天，留下一段属于你们的时光。",
      "ldsChatMoodLabel": "今天过得怎么样？",
      "ldsChatMoodHappy": "今天很开心",
      "ldsChatMoodTired": "有一点累",
      "ldsChatMoodWorried": "有些心事",
      "ldsChatPrompt": "选择今天的心情，听听他的回应。",
      "ldsChatStay": "再陪我一会儿",
      "ldsChatPlan": "一起定个小计划",
      "ldsChatJournal": "我们的小小瞬间",
      "ldsChatEmpty": "聊完一段话，就能留在这里。每位角色都有自己的回忆簿。",
      "ldsChatSaved": "这一刻已保存，可以重温，也可以标为心选。",
      "ldsChatPin": "将这一刻标为心选",
      "ldsStripTitle": "四个小小瞬间",
      "ldsStripHint": "每拍一张，可以更换画面、取景或光线。四张照片组成一份可保存的大头贴。",
      "ldsStripCapture": "拍下下一张",
      "ldsStripNew": "新的一组",
      "ldsStripDownload": "下载四连拍",
      "ldsStripCount": "已拍 {n}/4 张",
      "ldsStripSaved": "四个瞬间已保存，可以重温，也可以下载。",
      "ldsStripCaption": "一起度过的今天",
      "ldsStripOpen": "打开四连拍 {n}",
      "ldsDateResume": "继续游玩",
      "ldsGalleryTitle": "角色画面",
      "ldsGalleryPrev": "‹ 上一张",
      "ldsGalleryNext": "下一张 ›",
      "ldsGalleryAuto": "画面随游玩变化",
      "ldsGalleryCount": "画面 {n}/{max} · {title}",
      "ldsPhotoArt": "角色画面",
      "ldsClawChallenge": "挑战 · 60 秒 + 握爪时机",
      "ldsClawChallengeHint": "娃娃移动更快。爪子触到娃娃后，在指针进入薄荷色区域时再按一次空格握爪。命中中心可获完美判定和连击加分。用完五次机会或满 60 秒即结束挑战。",
      "ldsClawGrip": "握爪！· 空格",
      "ldsGripTiming": "握爪时机：瞄准中心",
      "ldsGripPerfect": "完美握爪！继续保持连击。",
      "ldsGripGood": "握住啦！娃娃正在送往出口。",
      "ldsGripMiss": "娃娃滑走了，下次在薄荷色区域握爪吧。",
      "ldsChallengeStats": "{s} 分 · ×{n} 连击 · {t}秒",
      "ldsChallengeBest": "抓娃娃挑战纪录 · {n} 分",
      "ldsChallengeEnd": "挑战完成 · {n} 个娃娃 · {s} 分。再开一局挑战自己的纪录吧。",
      "ldsTacticRedraw": "↻ 重抽所选手牌",
      "ldsTacticBoost": "↑ 己方杯中牌 +2",
      "ldsTacticRepaint": "◐ 轮换杯子颜色",
      "ldsTacticCount": "战术次数 · 你 {n} / 搭档 {p}。放牌前使用，加分上限为 8；颜色按玫瑰→天空→蜂蜜轮换。护盾可阻挡对方改色。",
      "ldsTacticTarget": "选择亮起的已放牌杯子使用战术，再次点击该战术即可取消。",
      "ldsTacticUsed": "战术已生效，本回合仍可放置数字牌。",
      "ldsPartnerTactic": "搭档使用了战术！留意变化的杯子，然后轮到你。",
      "ldsDateTab": "陪伴",
      "ldsDateTitle": "再陪你一会儿",
      "ldsDateIntro": "一起玩、留下回忆，或安静地待一会儿。选择今天与他的约会。",
      "ldsDateClaw": "🧸 抓娃娃",
      "ldsDateKitty": "☕ 喵喵牌",
      "ldsDateStory": "♡ 约会故事",
      "ldsDatePhoto": "📷 拍照馆",
      "ldsDateFocus": "◷ 专属陪伴",
      "ldsDateStart": "一起开始",
      "ldsDateRestart": "新的一局",
      "ldsDateReady": "{name} 已准备好了，点击「一起开始」后就能玩。",
      "ldsDatePaused": "已暂停，继续时会从这里接着玩。",
      "ldsDateEvol": "Evol 助力 · E",
      "ldsDateCollected": "已收藏",
      "ldsDateCollection": "与 {name} 的纪念品",
      "ldsDateCollectionStats": "娃娃 {n}/5 · 喵喵徽章 {b}/1 · 故事结局 {s}/2 · 陪伴次数 {f}",
      "ldsDateReward": "一起收获了新的纪念品 · 羁绊 +2",
      "ldsDatePhotoReward": "第一次一起拍照 · 羁绊 +2",
      "ldsClawHint": "按住 A / D 或方向键移动，也可以在机器内拖动。空格放下爪子，预判移动中的娃娃！E 可让娃娃静止两秒，每局限一次。P / Esc 暂停。",
      "ldsClawSign": "临空 · 娃娃约会",
      "ldsClawChute": "取物口",
      "ldsClawLeft": "◀ 移动",
      "ldsClawRight": "移动 ▶",
      "ldsClawDrop": "下爪 · 空格",
      "ldsClawStats": "剩余下爪 {n}/5 · 已抓到 {c}/5",
      "ldsClawReady": "娃娃在移动，瞄准它们，抓住时机下爪。",
      "ldsClawHelp": "Evol 助力！娃娃将静止两秒。",
      "ldsClawCollected": "抓到 {toy}！已加入你们的纪念品。",
      "ldsClawDuplicate": "又抓到 {toy}，现在它有个双胞胎啦！",
      "ldsClawMiss": "差一点！下一次下爪前，先看看娃娃的移动方向。",
      "ldsClawFinished": "约会完成 · 抓到 {n} 个娃娃。再开一局收集其他娃娃吧。",
      "ldsToy0": "月亮兔",
      "ldsToy1": "困困猫",
      "ldsToy2": "小狐狸",
      "ldsToy3": "海洋鲸",
      "ldsToy4": "口袋星星",
      "ldsKittyHint": "先选数字牌，再选空杯。牌与杯子颜色相同，分数翻倍。随后由搭档出牌，填满 12 个杯子后分数更高的一方获胜，并获得纪念徽章。",
      "ldsKittyAdvanced": "进阶 · 护盾、干扰与战术能力",
      "ldsKittyScore": "你 {a} · {name} {b}",
      "ldsKittyCup": "杯子 {n} · {color}",
      "ldsKittyColor0": "玫瑰",
      "ldsKittyColor1": "天空",
      "ldsKittyColor2": "蜂蜜",
      "ldsKittyYou": "你",
      "ldsKittyEmpty": "空杯",
      "ldsKittyGuard": "◈ 给杯子加护盾",
      "ldsKittyGuardHint": "选空杯放下当前数字牌并加上护盾，也可以保护一个已经属于你的杯子。",
      "ldsKittyYourTurn": "轮到你了，先选牌，再选杯子。",
      "ldsKittyThinking": "搭档正在思考出哪张牌……",
      "ldsKittyNudged": "搭档使用了干扰，一张没有护盾的牌减了 2 分。轮到你啦！",
      "ldsKittyWonBadge": "你赢了！喵喵徽章已加入纪念品，羁绊 +2。",
      "ldsKittyWon": "你又赢啦！喵喵徽章已经在收藏里了。",
      "ldsKittyLost": "这局搭档赢了，试试把高分牌留给同色杯子吧。",
      "ldsKittyTie": "平局，再喝杯茶，然后来一局？",
      "ldsStoryTitle": "与 {name} 的临空之夜 · {n}/3",
      "ldsStoryHint": "三次选择决定今晚的走向，探索两种结局，收藏两份纪念。",
      "ldsStoryScene0": "狩猎结束了，{name} 在车站外的暖色路灯下等你。距离末班车还有一点时间。",
      "ldsStoryScene1": "小摊卖着热饮和纸星星，马路对面传来夜市的音乐。{name} 把下一步交给你决定。",
      "ldsStoryScene2": "海滨的天空终于放晴，{name} 放慢脚步与你并肩。回家之前，还剩最后一段相处时光。",
      "ldsStoryChoice00": "沿安静的河边散步",
      "ldsStoryChoice01": "去探索灯笼夜市",
      "ldsStoryChoice10": "一起喝杯暖暖的饮料",
      "ldsStoryChoice11": "比一比谁先找到最亮的星星",
      "ldsStoryChoice20": "留下来一起看看水面",
      "ldsStoryChoice21": "约好明天再来一次冒险",
      "ldsStoryReply0": "{name} 微微笑着，让安静的时光在你们之间停留。",
      "ldsStoryReply1": "{name} 接下你的挑战，眼睛里闪过一点笑意。",
      "ldsStoryQuietEnd": "静谧星座。你与 {name} 看着河面上最后的倒影渐渐散去。不需要盛大的约定，一起走回家的这一段路就足够了。",
      "ldsStoryAdventureEnd": "灯笼之约。你与 {name} 把夜晚变成一场小小的冒险，将纸星星放进口袋，约定下一次还要一起寻找。",
      "ldsStorySaved": "这个结局已加入纪念品，重新体验可找到另一个结局。",
      "ldsDateLineXavier": "「可以绕远一点，我不着急。」",
      "ldsDateLineZayne": "「水边比较凉，靠近我一点。」",
      "ldsDateLineRafayel": "「普通的夜晚？那可未必，我有很多想法。」",
      "ldsDateLineSylus": "「你带路，我跟着。」",
      "ldsDateLineCaleb": "「同一座城市，新的路线。走走看？」",
      "ldsPhotoHint": "选择光线、相框和贴纸。拖动角色调整构图，也可用方向键；放大查看近景。最多保存 12 张快照，也可下载图片。",
      "ldsPhotoScene": "光线",
      "ldsPhotoFrame": "相框",
      "ldsPhotoSticker": "贴纸",
      "ldsPhotoZoom": "近景",
      "ldsPhotoNight": "星光",
      "ldsPhotoSunset": "日落",
      "ldsPhotoStudio": "柔光",
      "ldsPhotoPlain": "简约",
      "ldsPhotoPolaroid": "拍立得",
      "ldsPhotoStars": "星座",
      "ldsPhotoHeart": "爱心 ♡",
      "ldsPhotoStar": "星星 ✦",
      "ldsPhotoFlower": "花朵 ✿",
      "ldsPhotoCanvas": "角色照片，可以拖动调整构图，或使用左右方向键。",
      "ldsPhotoSave": "保存快照",
      "ldsPhotoDownload": "下载 PNG",
      "ldsPhotoCaption": "我们的小小瞬间",
      "ldsPhotoSaved": "快照已保存，点击缩略图可以还原画面。",
      "ldsPhotoDownloaded": "你的快照已准备好下载。",
      "ldsPhotoOpened": "已打开保存的快照。",
      "ldsPhotoUnavailable": "这里暂时无法下载，保存的快照仍然会留在相册中。",
      "ldsFocusHint": "一起学习、工作，或安静地休息。计时仅在当前页面可见时进行，需要时随时暂停。点击上方「播放角色动画」可观看官方角色片段。",
      "ldsFocusDuration": "陪伴时长",
      "ldsFocusMinutes": "{n} 分钟",
      "ldsFocusTogether": "留一小段只属于你们的时间",
      "ldsFocusStarted": "陪伴时光开始了，深呼吸，慢慢进入状态。",
      "ldsFocusComplete": "陪伴完成。与这位搭档的第一次陪伴会增加羁绊，每次完成都会记录。",
      "ldsCompanionHint": "移动指针可调整视角，点击「播放角色动画」可观看官方角色视频。",
    },
  });
  // Original fan-written conversations; these are not official game dialogue.
  var chatVoices = {
    xavier: [
      ["Tell me the best part. I'll try not to fall asleep before you finish. We could celebrate with something warm from the bakery.", "把最开心的那一段讲给我听吧。我会努力在听完之前不睡着。要不要再去买一份热乎乎的面包？"],
      ["Then let's stop here for a while. The stars aren't going anywhere. Lean back; I'll keep watch.", "那就在这里停一会儿吧。星星不会跑掉。你靠着休息，我来守着。"],
      ["You don't have to find the right words straight away. Start with the smallest thing. I'm listening.", "不用一下子找到最合适的话。从最小的一件事说起就好，我在听。"],
      ["All right. No mission, no last train to chase. Just you, me, and one more minute beneath this sky.", "好。没有任务，也不用赶末班车。只有你和我，在这片天空下再待一会儿。"],
      ["One small plan: a short walk, and the bakery on the corner. I'll remember the way back this time.", "那就定个小计划：散一小段步，再去街角的面包店。这次我会记住回去的路。"]
    ],
    zayne: [
      ["That's worth remembering. Tell me what happened before you forget the details. We can save the evening for a celebration.", "值得记下来。在忘掉细节之前，先讲给我听。今晚可以留一点时间，好好庆祝。"],
      ["You've done enough for today. Sit down, have some water, and leave the unfinished list until tomorrow. I'll stay.", "今天已经做得够多了。坐下来，喝一点水。没完成的清单可以留到明天，我会陪着你。"],
      ["We don't need to solve everything tonight. Tell me which part you want me to hear first.", "不必在今晚解决所有事。先告诉我，你最想让我听的是哪一部分。"],
      ["Of course. I've put my phone away. Take your time; there is no appointment to hurry through here.", "当然。我已经把手机收起来了。慢慢说，这里没有需要匆忙结束的预约。"],
      ["Choose one thing for tomorrow, not ten. I'll write it down with you. The rest can wait.", "给明天选一件事就好，不必选十件。我陪你记下来，其余的先放一放。"]
    ],
    rafayel: [
      ["A good day? Now you have to tell me. This evening was terribly dull without you. What colour would you paint it?", "开心的一天？那你可得告诉我。没有你的晚上实在太无聊了。你会给今天涂上什么颜色？"],
      ["Come look at the sea with me. You don't even have to say anything—though I may do enough talking for both of us.", "陪我看看海吧。不说话也可以——不过，我可能会把两个人的话都说完。"],
      ["Some things look different when you step back from the canvas. Tell me what's crowding yours. I'll listen before offering dramatic opinions.", "退离画布一点，有些东西就会变得不同。说说什么挤满了你的画布吧。我会先听，再发表夸张意见。"],
      ["Stay? I thought you'd never ask. I'll move these sketches. There's room beside me, and the tide has a long story tonight.", "留下来？我还以为你不打算开口呢。我把这些画稿挪开。身边的位置是你的，今晚的潮水还有很长的故事。"],
      ["A tiny expedition: pick one colour, find it somewhere outside, and bring the story back. I'll come along if you insist.", "来一次小小探险：选一种颜色，在外面找到它，再把故事带回来。要是你坚持，我也可以同行。"]
    ],
    sylus: [
      ["There it is—that look suits you. Tell me what went your way. I might even let you choose where we go tonight.", "就是这个表情，很适合你。说说今天有什么顺心的事。今晚去哪里，也许可以由你决定。"],
      ["You can stop proving how much you can carry. Sit beside me. For once, let the evening ask nothing of you.", "不必再证明自己能扛下多少。坐到我身边来。这一次，让夜晚什么都不向你索取。"],
      ["Name it if you want. Or don't. Either way, I'm not leaving because the conversation became inconvenient.", "想说就说出来。不想也没关系。不会因为话题变得棘手，我就转身离开。"],
      ["A little longer, then. Pick the music. I'll be here when the last track ends, too.", "那就再待一会儿。音乐由你选。最后一首结束时，我也会在这里。"],
      ["Pick one move you actually want to make. Not the impressive one—the one that's yours. I'll help you clear some room for it.", "选一个你真正想走的下一步。不必漂亮，要是你自己的选择。我陪你给它腾出一点空间。"]
    ],
    caleb: [
      ["Hey, save some of that good mood for me. Tell me everything while I find us a snack. You get first pick.", "喂，好心情也分我一点。你慢慢讲，我去找点吃的。这次让你先选。"],
      ["Long day? I've got the chair, the snacks, and absolutely no intention of making you do anything useful right now.", "今天很长吧？椅子和零食都准备好了，而且我现在完全不打算让你做任何正经事。"],
      ["You can say it badly the first time. I'll still get the important part. Want to start, or should we take a walk first?", "第一次说得乱一点也没关系，重要的部分我会听懂。现在说，还是先去走走？"],
      ["I'm here. We can talk, argue about the best snack, or sit quietly. I won't mistake the quiet for goodbye.", "我在。可以聊天，也可以争论哪种零食最好吃，或者安静坐着。我不会把安静当作再见。"],
      ["Tomorrow's first stop: breakfast together. After that, one small thing at a time. I'll even let you choose the route.", "明天的第一站，先一起吃早餐。之后一件一件来。路线也让你选，怎么样？"]
    ]
  };
  var chatStrings = { en: {}, zh: {} };
  Object.keys(chatVoices).forEach(function (id) {
    ["Happy", "Tired", "Worried", "Stay", "Plan"].forEach(function (ending, index) {
      var key = "lds" + "Chat" + id.charAt(0).toUpperCase() + id.slice(1) + ending;
      chatStrings.en[key] = chatVoices[id][index][0]; chatStrings.zh[key] = chatVoices[id][index][1];
    });
  });
  App.addStrings(chatStrings);
  App.ldsReadDates = readDates;
  App.ldsCreateClaw = createClaw; App.ldsStepClaw = stepClaw;
  App.ldsCreateKitty = createKitty; App.ldsKittyPlay = kittyPlay; App.ldsKittyAssist = kittyAssist; App.ldsKittyPartner = kittyPartner; App.ldsKittyTactic = kittyTactic;
  App.mountLdsDates = mountDates;
})(window.CapitalConvert = window.CapitalConvert || {});
