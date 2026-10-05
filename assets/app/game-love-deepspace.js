/* Love and Deepspace: Starbond Hunt and Relay - live combat, route battles, five partner
 * scenes, and a persistent memory album in the shared game drawer.
 * Official local portraits and optional remote videos are credited in
 * assets/media/love-deepspace/CREDITS.md. Dialogue and gameplay are original. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  var t = App.t;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  var createCampaign = App.createCampaign;
  var fillCampaignPicker = App.fillCampaignPicker;
  var starsFor = App.starsFor;

  var ldsRoutes = [
    { id: "lds1", labelKey: "ldsRoute1", turns: 6, target: 62, stars: [3, 4, 5] },
    { id: "lds2", labelKey: "ldsRoute2", turns: 7, target: 72, stars: [4, 5, 6] },
    { id: "lds3", labelKey: "ldsRoute3", turns: 8, target: 82, stars: [5, 6, 7] },
    { id: "lds4", labelKey: "ldsRoute4", turns: 9, target: 92, stars: [6, 7, 8] },
  ];

  var ldsPartners = [
    {
      id: "xavier",
      nameKey: "ldsPartnerXavier",
      perkKey: "ldsPerkXavier",
      boost: "focus",
      bonus: { resonance: 5 },
      color: "#b6bdff", evolKey: "ldsEvolLight", roleKey: "ldsRoleXavier", symbol: "✦",
      skill: { energy: -6, trust: 4, resonance: 27 },
      video: "https://assets.papegames.com/resources/cdn/20240624/ff40d89c1c0c31d0.mp4",
    },
    {
      id: "zayne",
      nameKey: "ldsPartnerZayne",
      perkKey: "ldsPerkZayne",
      boost: "guard",
      bonus: { trust: 4, energy: 2 },
      color: "#91dfef", evolKey: "ldsEvolIce", roleKey: "ldsRoleZayne", symbol: "❄",
      skill: { energy: 14, trust: 8, resonance: 12 },
      video: "https://assets.papegames.com/resources/cdn/20240624/a677537908fdeeb9.mp4",
    },
    {
      id: "rafayel",
      nameKey: "ldsPartnerRafayel",
      perkKey: "ldsPerkRafayel",
      boost: "heart",
      bonus: { trust: 6 },
      color: "#eeadce", evolKey: "ldsEvolFire", roleKey: "ldsRoleRafayel", symbol: "♨",
      skill: { energy: -4, trust: 14, resonance: 23 },
      video: "https://assets.papegames.com/resources/cdn/20240624/6c5e58f3ca96defe.mp4",
    },
    {
      id: "sylus",
      nameKey: "ldsPartnerSylus",
      perkKey: "ldsPerkSylus",
      boost: "focus",
      bonus: { energy: 5 },
      color: "#f39b9f", evolKey: "ldsEvolEnergy", roleKey: "ldsRoleSylus", symbol: "⟡",
      skill: { energy: 6, trust: -4, resonance: 28 },
      video: "https://assets.papegames.com/resources/cdn/20240702/d09aa652a8efa75a.mp4",
    },
    {
      id: "caleb", nameKey: "ldsPartnerCaleb", perkKey: "ldsPerkCaleb",
      boost: "guard", bonus: { energy: 5, resonance: 3 },
      color: "#c1b1ff", evolKey: "ldsEvolGravity", roleKey: "ldsRoleCaleb", symbol: "◎",
      skill: { energy: 10, trust: 6, resonance: 18 },
      video: "https://assets.papegames.com/resources/cdn/20250110/0b4c400df8a78d7f.mp4",
    },
  ];

  var ldsMoves = [
    {
      id: "focus",
      labelKey: "ldsMoveFocus",
      detailKey: "ldsMoveFocusDetail",
      stats: { energy: -16, trust: -3, resonance: 20 },
    },
    {
      id: "guard",
      labelKey: "ldsMoveGuard",
      detailKey: "ldsMoveGuardDetail",
      stats: { energy: -10, trust: 5, resonance: 11 },
    },
    {
      id: "heart",
      labelKey: "ldsMoveHeart",
      detailKey: "ldsMoveHeartDetail",
      stats: { energy: -12, trust: 9, resonance: 14 },
    },
    {
      id: "recover", labelKey: "ldsMoveRecover", detailKey: "ldsMoveRecoverDetail",
      stats: { energy: 22, trust: 3, resonance: 0 },
    },
  ];

  var ldsEvents = [
    { key: "ldsEventMeteor", ideal: "focus", pressure: 7 },
    { key: "ldsEventStatic", ideal: "guard", pressure: 8 },
    { key: "ldsEventPulse", ideal: "heart", pressure: 6 },
    { key: "ldsEventRift", ideal: "guard", pressure: 10 },
    { key: "ldsEventPhantom", ideal: "focus", pressure: 9 },
    { key: "ldsEventEcho", ideal: "heart", pressure: 7 },
  ];

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function byId(list, id) {
    for (var i = 0; i < list.length; i += 1) {
      if (list[i].id === id) {
        return list[i];
      }
    }
    return list[0];
  }

  function pickEvent(round) {
    return ldsEvents[(Math.floor(Math.random() * ldsEvents.length) + round) % ldsEvents.length];
  }

  /* Pure turn resolution is shared by move previews and the gameplay checks. */
  function ldsAdvance(state, move, partner, encounter, route) {
    if (state.done || (move.id === "skill" && state.charge < 3)) { return state; }
    var special = move.id === "skill";
    var recover = move.id === "recover";
    var matched = move.id === encounter.ideal;
    var stats = special ? partner.skill : move.stats;
    var gain = { energy: stats.energy, trust: stats.trust, resonance: stats.resonance };
    var chain = matched ? state.chain + 1 : 0;
    if (matched) {
      gain.trust += 4;
      gain.resonance += 8 + Math.min(chain - 1, 3) * 2;
    } else if (!recover && !special) {
      gain.trust -= Math.ceil(encounter.pressure / 3);
      gain.energy -= Math.floor(encounter.pressure / 2);
    }
    if (partner.boost === move.id) {
      Object.keys(gain).forEach(function (key) { gain[key] += partner.bonus[key] || 0; });
    }
    var next = {
      energy: clamp(state.energy + gain.energy, 0, 100),
      trust: clamp(state.trust + gain.trust, 0, 100),
      resonance: clamp(state.resonance + gain.resonance, 0, 120),
      turn: state.turn + 1,
      charge: special ? 0 : Math.min(3, state.charge + (matched ? 1 : 0)),
      chain: chain, done: false, outcome: "", matched: matched,
    };
    // A depleted team must retreat even when its last action reaches the target.
    if (next.energy <= 0) { next.outcome = "energy"; }
    else if (next.trust <= 0) { next.outcome = "trust"; }
    else if (next.resonance >= route.target && next.trust >= 24) { next.outcome = "win"; }
    else if (next.turn >= route.turns) { next.outcome = "timeout"; }
    next.done = !!next.outcome;
    next.gain = {
      energy: next.energy - state.energy, trust: next.trust - state.trust,
      resonance: next.resonance - state.resonance,
    };
    return next;
  }

  function ldsReadAlbum(raw) {
    var album = { version: 1, selected: "xavier", bonds: {}, memories: {} };
    var saved;
    try { saved = JSON.parse(raw || "null"); } catch (error) { saved = null; }
    if (!saved || saved.version !== 1) { return album; }
    ldsPartners.forEach(function (entry) {
      if (entry.id === saved.selected) { album.selected = entry.id; }
      var bond = saved.bonds && saved.bonds[entry.id];
      if (typeof bond === "number" && isFinite(bond)) {
        album.bonds[entry.id] = clamp(Math.floor(bond), 0, 999);
      }
      ldsRoutes.forEach(function (route) {
        var key = entry.id + ":" + route.id;
        var stars = saved.memories && saved.memories[key];
        if (typeof stars === "number" && isFinite(stars) && stars >= 1) {
          album.memories[key] = clamp(Math.floor(stars), 1, 3);
        }
      });
    });
    return album;
  }

  function ldsReadLooks(raw) {
    var looks = { version: 1, auto: true, scenes: {} }, saved;
    try { saved = JSON.parse(raw || "null"); } catch (error) { saved = null; }
    ldsPartners.forEach(function (partner) { var index = saved && saved.version === 1 && saved.scenes && saved.scenes[partner.id]; looks.scenes[partner.id] = Number.isInteger(index) && index >= 0 && index <= 4 ? index : partner.id === "zayne" ? 4 : 3; });
    if (saved && saved.version === 1 && typeof saved.auto === "boolean") { looks.auto = saved.auto; } return looks;
  }
  function initLoveDeepspaceGame(panelEl) {
    if (!panelEl) { return; }
    var campaign = createCampaign({ key: "love-deepspace-campaign", levels: ldsRoutes });
    var albumKey = "love-deepspace-album-v1";
    var album = ldsReadAlbum(App.storage.getItem(albumKey));
    var looks = ldsReadLooks(App.storage.getItem("love-deepspace-looks-v1"));
    var route = ldsRoutes[campaign.indexOf(campaign.nextLevelId())];
    var partner = byId(ldsPartners, album.selected);
    var state, event, talked, missionLog = [], portraitPartner = "", watching = false;
    var dialogueMood = "Intro", effect = null, mediaEpoch = 0;
    var rosterButtons = [], moveButtons = [], routeDots = [], combat = null, combatMode = "action", dates = null, viewMode = "dates";

    function node(tag, className, key, parent) {
      var el = document.createElement(tag);
      if (className) { el.className = className; }
      if (key) { el.setAttribute("data-i18n", key); el.textContent = t(key); }
      if (parent) { parent.appendChild(el); }
      return el;
    }
    function button(className, key, parent, handler) {
      var el = node("button", className, key, parent);
      el.type = "button";
      if (handler) { el.addEventListener("click", handler); }
      return el;
    }
    function signed(value) { return (value > 0 ? "+" : "") + value; }
    function saveAlbum() { App.storage.setItem(albumKey, JSON.stringify(album)); }
    function motionOff() {
      return document.documentElement.getAttribute("data-motion") === "off" ||
        (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    }
    function stopVideo() {
      mediaEpoch += 1;
      watching = false;
      if (typeof video.pause === "function") { video.pause(); }
      video.hidden = true;
      watchBtn.textContent = t("ldsWatch");
      watchBtn.setAttribute("aria-pressed", "false");
    }
    function clearEffect() {
      if (effect && effect.parentNode) { effect.parentNode.removeChild(effect); }
      effect = null;
    }
    function animate(kind, message) {
      clearEffect();
      scene.setAttribute("data-action", kind);
      effect = node("div", "lds-effect lds-effect-" + kind, null, scene);
      effect.setAttribute("aria-hidden", "true");
      node("span", "lds-effect-ring", null, effect);
      for (var i = 0; i < 8; i += 1) {
        var spark = node("i", "lds-effect-particle", null, effect);
        spark.style.setProperty("--i", String(i));
        spark.textContent = kind === "heart" ? "♡" : partner.symbol;
      }
      effect.addEventListener("animationend", function (ev) {
        if (ev.target === effect) { clearEffect(); }
      });
      feedback.textContent = message;
    }
    function say(mood) {
      dialogueMood = mood;
      dialogue.textContent = t("ldsLine" + partner.id.charAt(0).toUpperCase() + partner.id.slice(1) + mood);
    }

    panelEl.classList.add("lds-stage");
    panelEl.classList.add("lds-character-focus");
    var scene = node("div", "lds-scene", null, panelEl);
    scene.setAttribute("aria-label", t("ldsCompanionHint"));
    scene.addEventListener("pointermove", function (ev) {
      if (motionOff() || viewMode !== "dates") { return; }
      var rect = scene.getBoundingClientRect();
      scene.style.setProperty("--lds-look-x", ((ev.clientX - rect.left) / rect.width - .5) * 10 + "px");
      scene.style.setProperty("--lds-look-y", ((ev.clientY - rect.top) / rect.height - .5) * 6 + "px");
    });
    scene.addEventListener("pointerleave", function () { scene.style.setProperty("--lds-look-x", "0px"); scene.style.setProperty("--lds-look-y", "0px"); });
    var fallback = node("div", "lds-scene-fallback", null, scene);
    fallback.setAttribute("aria-hidden", "true");
    for (var s = 0; s < 14; s += 1) {
      var star = node("i", "lds-scene-star", null, fallback);
      star.style.left = (s * 37 % 100) + "%";
      star.style.top = (s * 23 % 83) + "%";
      star.style.animationDelay = (s % 5) + "s";
    }
    var portrait = node("img", "lds-scene-portrait", null, scene);
    portrait.decoding = "async";
    portrait.addEventListener("load", function () { if (!motionOff()) { portrait.classList.remove("lds-art-reveal"); void portrait.offsetWidth; portrait.classList.add("lds-art-reveal"); } });
    portrait.addEventListener("animationend", function (event) { if (event.animationName === "lds-art-reveal") { portrait.classList.remove("lds-art-reveal"); } });
    portrait.addEventListener("error", function () { portrait.hidden = true; });
    var video = node("video", "lds-scene-video", null, scene);
    video.hidden = true;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = "none";
    video.setAttribute("playsinline", "");
    video.setAttribute("aria-hidden", "true");
    video.addEventListener("error", function () { stopVideo(); mediaStatus.textContent = t("ldsMediaError"); });
    var veil = node("div", "lds-scene-veil", null, scene);
    veil.setAttribute("aria-hidden", "true");
    var sceneTop = node("div", "lds-scene-top", null, scene);
    node("span", "lds-eyebrow", "ldsBannerTag", sceneTop);
    node("span", "lds-edition", "ldsFanEdition", sceneTop);
    var identity = node("div", "lds-identity", null, scene);
    var evol = node("span", "lds-evol", null, identity);
    var characterName = node("h3", "lds-name", null, identity);
    var characterRole = node("p", "lds-role", null, identity);
    var bondLabel = node("span", "lds-affinity", null, identity);
    var dialogueBox = node("div", "lds-dialogue", null, panelEl);
    var speaker = node("strong", "lds-speaker", null, dialogueBox);
    var dialogue = node("p", "", null, dialogueBox);
    dialogue.setAttribute("role", "status");
    var sceneActions = node("div", "lds-scene-actions", null, dialogueBox);
    var talkBtn = button("lds-small-button", "ldsTalk", sceneActions, function () {
      if (talked || state.done) { return; }
      talked = true;
      state.trust = clamp(state.trust + 4, 0, 100);
      say("Talk");
      animate("heart", t("ldsTalkGain"));
      syncHud();
    });
    var watchBtn = button("lds-small-button", "ldsWatch", sceneActions, function () {
      if (watching) { stopVideo(); return; }
      if (motionOff()) { mediaStatus.textContent = t("ldsMotionDisabled"); return; }
      if (typeof video.play !== "function") { mediaStatus.textContent = t("ldsMediaError"); return; }
      video.src = partner.video;
      video.poster = portraitPath(partner);
      video.hidden = false;
      watching = true;
      var currentEpoch = mediaEpoch;
      watchBtn.textContent = t("ldsStopWatch");
      watchBtn.setAttribute("aria-pressed", "true");
      mediaStatus.textContent = t("ldsMediaOnline");
      var playback = video.play();
      if (playback && playback.catch) {
        playback.catch(function () {
          if (watching && currentEpoch === mediaEpoch) { stopVideo(); mediaStatus.textContent = t("ldsMediaError"); }
        });
      }
    });
    watchBtn.setAttribute("aria-pressed", "false");
    var mediaStatus = node("span", "lds-media-status", null, sceneActions);
    button("lds-small-button lds-greeting-button", "ldsGreet", sceneActions, function () {
      if (viewMode !== "dates") { return; }
      dialogue.textContent = t("ldsDateLine" + partner.id.charAt(0).toUpperCase() + partner.id.slice(1));
      if (!motionOff()) {
        animate("heart", "");
        if (!watching && typeof video.play === "function") { watchBtn.click(); }
      }
    });
    var gallery = node("div", "lds-scene-gallery", null, dialogueBox);
    node("span", "lds-gallery-label", "ldsGalleryTitle", gallery);
    var galleryCount = node("p", "lds-gallery-count", null, gallery);
    var galleryThumbs = node("div", "lds-scene-thumbs", null, gallery), artButtons = [];
    for (var artIndex = 0; artIndex < 5; artIndex++) {
      (function (index) {
        var thumb = button("lds-art-thumb", null, galleryThumbs, function () { chooseArt(index, true); });
        thumb.setAttribute("data-art", String(index)); node("img", "", null, thumb).alt = ""; artButtons.push(thumb);
      })(artIndex);
    }
    var galleryTools = node("div", "lds-gallery-tools", null, gallery);
    button("lds-small-button", "ldsGalleryPrev", galleryTools, function () { chooseArt((looks.scenes[partner.id] + 4) % 5, true); });
    button("lds-small-button", "ldsGalleryNext", galleryTools, function () { chooseArt((looks.scenes[partner.id] + 1) % 5, true); });
    var reactionLabel = node("label", "lds-art-auto", null, galleryTools), reactionToggle = node("input", "", null, reactionLabel);
    reactionToggle.type = "checkbox"; reactionToggle.checked = looks.auto; node("span", "", "ldsGalleryAuto", reactionLabel);
    reactionToggle.addEventListener("change", function () { looks.auto = reactionToggle.checked; saveLooks(); });
    var feedback = node("p", "lds-feedback", null, panelEl);
    feedback.setAttribute("role", "status");

    var roster = node("div", "lds-roster", null, panelEl);
    roster.setAttribute("role", "group");
    roster.setAttribute("aria-label", t("ldsPartnerLabel"));
    ldsPartners.forEach(function (entry) {
      var card = button("lds-partner-card", null, roster, function () { choosePartner(entry.id); });
      card.setAttribute("data-partner", entry.id);
      var image = node("img", "", null, card);
      image.src = portraitPath(entry);
      image.alt = "";
      image.loading = "lazy";
      image.addEventListener("error", function () { image.hidden = true; });
      var name = node("span", "", entry.nameKey, card);
      name.style.setProperty("--partner-color", entry.color);
      rosterButtons.push(card);
    });

    var viewNav = node("div", "lds-view-nav", null, panelEl);
    var missionBtn = button("lds-view-button", "ldsMissionTab", viewNav, function () { switchView(false); });
    var memoryBtn = button("lds-view-button", "ldsMemoryTab", viewNav, function () { switchView(true); });
    var dateBtn = button("lds-view-button lds-together-tab", "ldsDateTab", viewNav, function () { switchView("dates"); });
    var gamesListBtn = button("lds-game-picker-button", "ldsOtherGames", viewNav, function () {
      var focused = panelEl.classList.toggle("lds-character-focus");
      gamesListBtn.textContent = t(focused ? "ldsOtherGames" : "ldsHideGameList");
      gamesListBtn.setAttribute("aria-expanded", String(!focused));
    });
    gamesListBtn.setAttribute("aria-expanded", "false");
    var mission = node("div", "lds-mission", null, panelEl);
    var book = node("div", "lds-album", null, panelEl);
    book.hidden = true;
    var bookTitle = node("h4", "", null, book);
    var bookCount = node("p", "lds-album-count", null, book);
    var memoryGrid = node("div", "lds-memory-grid", null, book);
    function switchView(memories) {
      stopVideo(); clearEffect();
      if (combat) { combat.pause(); }
      if (dates) { dates.pause(); }
      panelEl.classList.remove("lds-in-combat");
      viewMode = memories === "dates" ? "dates" : memories ? "memories" : "missions";
      panelEl.setAttribute("data-view", viewMode);
      mission.hidden = viewMode !== "missions"; book.hidden = viewMode !== "memories";
      if (dates) { dates.element.hidden = viewMode !== "dates"; }
      missionBtn.setAttribute("aria-pressed", String(viewMode === "missions"));
      memoryBtn.setAttribute("aria-pressed", String(viewMode === "memories"));
      dateBtn.setAttribute("aria-pressed", String(viewMode === "dates"));
      if (viewMode === "memories") { syncAlbum(); }
    }
    function portraitPath(entry) { return "assets/media/love-deepspace/" + entry.id + ".webp"; }

    var modeNav = node("div", "lds-mode-nav", null, mission);
    var actionModeBtn = button("lds-mode-button", "ldsActionMode", modeNav, function () { switchMode("action"); });
    var strategyModeBtn = button("lds-mode-button", "ldsStrategyMode", modeNav, function () { switchMode("strategy"); });
    function switchMode(mode) {
      combatMode = mode;
      if (combat) { combat.pause(); combat.element.hidden = mode !== "action"; }
      panelEl.classList.remove("lds-in-combat");
      panelEl.classList.toggle("lds-action-mode", mode === "action");
      strategy.hidden = mode !== "strategy";
      actionModeBtn.setAttribute("aria-pressed", String(mode === "action"));
      strategyModeBtn.setAttribute("aria-pressed", String(mode === "strategy"));
    }

    var top = node("div", "lds-top", null, mission);
    function picker(id, key) {
      var row = node("div", "elements-row", null, top);
      var label = node("label", "elements-label", key, row);
      label.setAttribute("for", id);
      var select = node("select", "elements-select", null, row);
      select.id = id;
      return select;
    }
    var routeSel = picker("ldsRouteSel", "ldsRouteLabel");
    var partnerSel = picker("ldsPartnerSel", "ldsPartnerLabel");
    ldsPartners.forEach(function (entry) {
      var option = node("option", "", entry.nameKey, partnerSel);
      option.value = entry.id;
    });
    var routeMap = node("div", "lds-route-map", null, mission);
    ldsRoutes.forEach(function (entry) {
      var dot = button("lds-route-stop", null, routeMap, function () {
        if (campaign.isUnlocked(entry.id)) { startRoute(entry); }
      });
      dot.setAttribute("aria-label", t(entry.labelKey));
      routeDots.push(dot);
    });
    var strategy = node("div", "lds-strategy", null, mission);
    var hud = node("div", "lds-hud", null, strategy);
    function stat(key, kind, max) {
      var card = node("div", "lds-stat lds-bar-" + kind, null, hud);
      node("span", "lds-stat-label", key, card);
      var value = node("strong", "", null, card);
      var track = node("div", "lds-meter-track", null, card);
      track.setAttribute("role", "progressbar");
      track.setAttribute("aria-label", t(key));
      track.setAttribute("aria-valuemin", "0");
      track.setAttribute("aria-valuemax", String(max));
      var fill = node("span", "lds-meter-fill", null, track);
      return { value: value, fill: fill, track: track };
    }
    var turnsStat = stat("ldsTurnsLabel", "turns", route.turns);
    var energyStat = stat("ldsEnergyLabel", "energy", 100);
    var trustStat = stat("ldsTrustLabel", "trust", 100);
    var resonanceStat = stat("ldsResonanceLabel", "resonance", route.target);
    var eventCard = node("div", "lds-event", null, strategy);
    var eventTitle = node("strong", "", null, eventCard);
    var eventBody = node("p", "", null, eventCard);
    var eventCue = node("span", "lds-event-cue", null, eventCard);
    var perkLine = node("p", "lds-perk", null, eventCard);
    var moves = node("div", "lds-moves", null, strategy);
    ldsMoves.forEach(function (move) {
      var btn = button("lds-move", null, moves, function () { applyMove(move); });
      btn.setAttribute("data-move", move.id);
      node("strong", "", move.labelKey, btn);
      node("span", "", move.detailKey, btn);
      var preview = node("span", "lds-move-preview", null, btn);
      moveButtons.push({ btn: btn, move: move, preview: preview });
    });
    var skillBtn = button("lds-skill", null, strategy, function () { applyMove({ id: "skill", labelKey: "ldsSkillName" }); });
    var skillLabel = node("strong", "", null, skillBtn);
    var skillDetail = node("span", "", null, skillBtn);
    var skillPips = node("span", "lds-charge-pips", null, skillBtn);
    skillPips.setAttribute("aria-hidden", "true");
    var result = node("p", "game-result", null, strategy);
    result.setAttribute("role", "status");
    var actions = node("div", "game-actions", null, strategy);
    var restartBtn = button("primary", "ldsRestart", actions, function () { startRoute(route); });
    var nextBtn = button("lds-small-button", "ldsNextRoute", actions, function () {
      var next = ldsRoutes[campaign.indexOf(route.id) + 1];
      if (next && campaign.isUnlocked(next.id)) { startRoute(next); }
    });
    var starsEl = node("p", "game-best", null, actions);
    var logBox = node("details", "lds-log", null, strategy);
    node("summary", "", "ldsLogLabel", logBox);
    var logList = node("ul", "", null, logBox);
    node("p", "game-hint", "ldsHint", strategy);
    combat = App.mountLdsCombat(mission, {
      routeLabel: function () { return route.labelKey; },
      isHidden: function () { return panelEl.hidden || mission.hidden || combat.element.hidden || !!panelEl.closest("[hidden]"); },
      onFocus: function (focused) {
        panelEl.classList.toggle("lds-in-combat", focused);
        if (focused) { stopVideo(); }
      },
      onMoment: say,
      onFinish: function (battle, starsWon) {
        if (battle.outcome !== "win") { say("Miss"); return ""; }
        var reward = awardRoute(starsWon);
        logAction(t("ldsLogBattle", { name: t(partner.nameKey), n: battle.score }));
        syncRoutePicker(); syncCharacter(); syncAlbum();
        return reward.message + (reward.outcome.unlockedNext ? " " + t("ldsUnlocked") : "");
      },
    });
    mission.insertBefore(combat.element, strategy);
    // The landing screen foregrounds the official character scene and its dates.
    panelEl.insertBefore(viewNav, scene);
    dates = App.mountLdsDates(panelEl, {
      isHidden: function () { return panelEl.hidden || dates.element.hidden || !!panelEl.closest("[hidden]"); },
      isCompanionTarget: function (target) { return scene.contains(target) || dialogueBox.contains(target); },
      onRunning: function (running) { panelEl.classList.toggle("lds-date-running", running); },
      onPartner: choosePartner,
      onMoment: function (mood) { say(mood); if (looks.auto) { chooseArt(mood === "Win" ? 2 : mood === "Skill" ? 4 : mood === "Miss" ? 0 : partner.id === "zayne" ? 4 : 3, false); } if (!motionOff()) { animate(mood === "Win" ? "win" : mood === "Skill" ? "skill" : "heart", feedback.textContent); } },
      getArt: function (id) { return looks.scenes[id]; },
      onArt: function (index) { chooseArt(index, false); },
      onReward: function (kind) {
        album.bonds[partner.id] = Math.min(999, (album.bonds[partner.id] || 0) + 2);
        saveAlbum(); syncCharacter(); petNotifyGame(true);
        feedback.textContent = t(kind === "photo" ? "ldsDatePhotoReward" : "ldsDateReward");
      },
    });
    panelEl.insertBefore(dates.element, mission);
    var credit = node("p", "lds-credit", null, panelEl);
    node("span", "", "ldsCredit", credit);
    var creditLink = node("a", "", "ldsOfficialSite", credit);
    creditLink.href = "https://loveanddeepspace.infoldgames.com/en-EN/home";
    creditLink.target = "_blank";
    creditLink.rel = "noopener noreferrer";

    function syncCharacter() {
      scene.style.setProperty("--lds-accent", partner.color);
      panelEl.style.setProperty("--lds-accent", partner.color);
      scene.setAttribute("data-partner", partner.id);
      if (portraitPartner !== partner.id) {
        stopVideo();
        portraitPartner = partner.id;
        portrait.hidden = false;
        applyArt();
        mediaStatus.textContent = "";
      }
      evol.textContent = partner.symbol + " " + t(partner.evolKey);
      characterName.textContent = t(partner.nameKey);
      characterRole.textContent = t(partner.roleKey);
      speaker.textContent = t(partner.nameKey);
      bondLabel.textContent = t("ldsBondValue", { n: album.bonds[partner.id] || 0 });
      partnerSel.value = partner.id;
      rosterButtons.forEach(function (btn) {
        btn.setAttribute("aria-pressed", String(btn.getAttribute("data-partner") === partner.id));
      });
      say(dialogueMood);
    }
    function saveLooks() { App.storage.setItem("love-deepspace-looks-v1", JSON.stringify(looks)); }
    function applyArt() {
      var art = App.ldsSceneArt(partner.id, looks.scenes[partner.id]);
      portrait.hidden = false; portrait.src = art.src; portrait.alt = t("ldsPortraitAlt", { name: t(partner.nameKey) }) + " · " + art.title;
      portrait.style.objectPosition = art.x * 100 + "% " + art.y * 100 + "%";
      scene.setAttribute("data-art", String(art.index)); galleryCount.textContent = t("ldsGalleryCount", { n: art.index + 1, title: art.title });
      artButtons.forEach(function (button, index) { var preview = App.ldsSceneArt(partner.id, index), image = button.querySelector("img"); image.src = preview.src; image.loading = "lazy"; image.style.objectPosition = preview.x * 100 + "% " + preview.y * 100 + "%"; button.setAttribute("aria-label", preview.title); button.setAttribute("aria-pressed", String(index === art.index)); });
    }
    function chooseArt(index, manual) {
      if (!Number.isInteger(index) || index < 0 || index > 4) { return; }
      if (looks.scenes[partner.id] !== index || watching) { stopVideo(); looks.scenes[partner.id] = index; applyArt(); saveLooks(); }
      if (manual && dates && dates.setArt) { dates.setArt(index); }
    }
    function syncAlbum() {
      while (memoryGrid.firstChild) { memoryGrid.removeChild(memoryGrid.firstChild); }
      bookTitle.textContent = t("ldsAlbumTitle", { name: t(partner.nameKey) });
      bookCount.textContent = t("ldsAlbumCount", { n: Object.keys(album.memories).length, max: ldsPartners.length * ldsRoutes.length });
      ldsRoutes.forEach(function (entry, index) {
        var stars = album.memories[partner.id + ":" + entry.id] || 0;
        var card = node("article", "lds-memory" + (stars ? " is-unlocked" : ""), null, memoryGrid);
        var art = node("div", "lds-memory-art", null, card);
        if (stars) {
          var image = node("img", "", null, art);
          image.src = portraitPath(partner); image.alt = ""; image.loading = "lazy";
        }
        node("span", "lds-memory-number", null, art).textContent = "0" + (index + 1);
        node("h5", "", null, card).textContent = t(entry.labelKey);
        node("span", "lds-memory-stars", null, card).textContent = stars ? "★".repeat(stars) : t("ldsMemoryLocked");
        node("p", "", null, card).textContent = stars ? t("ldsMemory" + (index + 1), { name: t(partner.nameKey) }) : t("ldsMemoryUnlock", { name: t(partner.nameKey) });
      });
    }
    function syncRoutePicker() {
      fillCampaignPicker(routeSel, campaign, function (def) { return t(def.labelKey); }, t("elementsLocked"));
      routeSel.value = route.id;
      routeDots.forEach(function (dot, index) {
        var def = ldsRoutes[index];
        dot.disabled = !campaign.isUnlocked(def.id);
        dot.setAttribute("aria-current", def.id === route.id ? "step" : "false");
        dot.textContent = "0" + (index + 1) + " · " + t(def.labelKey);
      });
    }
    function setStat(stat, value, max, text) {
      stat.value.textContent = text || String(value);
      stat.fill.style.width = clamp(value / max * 100, 0, 100) + "%";
      stat.track.setAttribute("aria-valuenow", String(clamp(value, 0, max)));
      stat.track.setAttribute("aria-valuetext", text || String(value));
      stat.track.setAttribute("aria-valuemax", String(max));
    }
    function previewText(gain) {
      return t("ldsGainPreview", { e: signed(gain.energy), t: signed(gain.trust), r: signed(gain.resonance) });
    }
    function syncHud() {
      setStat(turnsStat, Math.max(0, route.turns - state.turn), route.turns, t("ldsTurnsValue", { n: Math.max(0, route.turns - state.turn), m: route.turns }));
      setStat(energyStat, state.energy, 100);
      setStat(trustStat, state.trust, 100);
      setStat(resonanceStat, state.resonance, route.target, t("ldsResonanceValue", { n: state.resonance, m: route.target }));
      eventTitle.textContent = state.done ? t("ldsMissionComplete") : t("ldsEventTitle", { n: state.turn + 1, m: route.turns });
      eventBody.textContent = state.done ? t(state.outcome === "win" ? "ldsEncounterWon" : "ldsEncounterLost") : t(event.key);
      eventCue.textContent = state.done ? "" : t("ldsCounterHint", { move: t(byId(ldsMoves, event.ideal).labelKey), n: state.chain });
      perkLine.textContent = t("ldsPerkLine", { name: t(partner.nameKey), perk: t(partner.perkKey) });
      starsEl.textContent = t("campaignStars", { n: campaign.totalStars(), max: campaign.maxStars() });
      talkBtn.disabled = talked || state.done;
      moveButtons.forEach(function (entry) {
        entry.btn.disabled = state.done;
        entry.btn.classList.toggle("is-counter", !state.done && event.ideal === entry.move.id);
        var preview = ldsAdvance(state, entry.move, partner, event, route);
        entry.preview.textContent = state.done ? "" : previewText(preview.gain);
      });
      skillBtn.disabled = state.done || state.charge < 3;
      skillLabel.textContent = t("ldsSkillName", { evol: t(partner.evolKey) });
      skillDetail.textContent = state.charge === 3 && !state.done ? t("ldsSkillReady") + " · " + previewText(ldsAdvance(state, { id: "skill" }, partner, event, route).gain) : t("ldsSkillCharge", { n: state.charge });
      skillPips.textContent = "●".repeat(state.charge) + "○".repeat(3 - state.charge);
      var next = ldsRoutes[campaign.indexOf(route.id) + 1];
      nextBtn.hidden = !(state.outcome === "win" && next && campaign.isUnlocked(next.id));
      syncCharacter();
    }
    function addLog(key, params) {
      missionLog.push({ key: key, params: params });
      while (logList.firstChild) { logList.removeChild(logList.firstChild); }
      missionLog.slice(-6).forEach(function (line) { node("li", "", null, logList).textContent = t(line.key, line.params); });
    }
    function startRoute(def) {
      stopVideo(); clearEffect();
      panelEl.classList.remove("lds-in-combat");
      route = def;
      state = { turn: 0, energy: 72, trust: 56, resonance: 0, charge: 0, chain: 0, done: false, outcome: "" };
      talked = false; missionLog = []; event = pickEvent(0);
      feedback.textContent = "";
      scene.setAttribute("data-action", "idle");
      say("Intro");
      result.textContent = t("ldsMissionIntro", { route: t(route.labelKey), name: t(partner.nameKey), n: route.target });
      addLog("ldsLogStart", { route: t(route.labelKey), name: t(partner.nameKey) });
      syncRoutePicker(); syncHud(); syncAlbum();
      if (combat) { combat.reset(campaign.indexOf(route.id), partner); }
      if (dates) { dates.setPartner(partner); }
    }
    function choosePartner(id) {
      if (partner.id === id) { return; }
      partner = byId(ldsPartners, id);
      album.selected = partner.id; saveAlbum();
      startRoute(route);
      feedback.textContent = t("ldsPartnerRestart", { name: t(partner.nameKey) });
    }
    function applyMove(move) {
      if (combatMode !== "strategy") { return; }
      var next = ldsAdvance(state, move, partner, event, route);
      if (next === state) { return; }
      state = next;
      say(move.id === "skill" ? "Skill" : move.id === "recover" ? "Talk" : state.matched ? "Match" : "Miss");
      animate(move.id, previewText(state.gain));
      addLog("ldsLogTurn", { n: state.turn, move: move.id === "skill" ? t("ldsSkillName", { evol: t(partner.evolKey) }) : t(move.labelKey), r: signed(state.gain.resonance), e: signed(state.gain.energy), t: signed(state.gain.trust) });
      if (state.outcome === "win") {
        var starsWon = starsFor(state.turn, route.stars, "low");
        var reward = awardRoute(starsWon, state.turn);
        var outcome = reward.outcome;
        result.textContent = t("ldsWin", { name: t(partner.nameKey), n: state.turn, s: starsWon }) + " " +
          reward.message +
          (outcome.unlockedNext ? " " + t("ldsUnlocked") : campaign.clearedCount() === ldsRoutes.length ? " " + t("ldsAllClear") : "");
        logAction(t("logLoveDeepspace", { name: t(partner.nameKey), n: state.turn }));
        if (!motionOff()) {
          var rect = restartBtn.getBoundingClientRect();
          createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
        }
        animate("win", reward.message); syncAlbum();
      } else if (state.done) {
        result.textContent = state.outcome === "energy" ? t("ldsLoseEnergy") : state.outcome === "trust" ? t("ldsLoseTrust") :
          state.resonance >= route.target ? t("ldsLoseBond") : t("ldsLoseTurns", { n: route.target - state.resonance });
      } else {
        result.textContent = t("ldsTurnResult", { n: route.turns - state.turn, k: event.pressure });
        event = pickEvent(state.turn);
      }
      syncRoutePicker(); syncHud();
    }
    function awardRoute(starsWon, turnsUsed) {
      var record = { stars: starsWon };
      if (typeof turnsUsed === "number") { record.best = turnsUsed; record.better = "low"; }
      var outcome = campaign.record(route.id, record);
      var memoryKey = partner.id + ":" + route.id;
      var newMemory = !album.memories[memoryKey];
      album.memories[memoryKey] = Math.max(album.memories[memoryKey] || 0, starsWon);
      album.bonds[partner.id] = Math.min(999, (album.bonds[partner.id] || 0) + (newMemory ? 2 : 1));
      saveAlbum(); say("Win"); petNotifyGame(outcome.isBest || outcome.firstClear);
      return { outcome: outcome, message: t(newMemory ? "ldsMemoryEarned" : "ldsBondEarned") };
    }
    routeSel.addEventListener("change", function () {
      if (campaign.isUnlocked(routeSel.value)) { startRoute(byId(ldsRoutes, routeSel.value)); }
      else { routeSel.value = route.id; }
    });
    partnerSel.addEventListener("change", function () { choosePartner(partnerSel.value); });
    App.quietResetLoveDeepspace = function () { stopVideo(); clearEffect(); combat.pause(); dates.pause(); };
    // Stop media when motion preferences change or the containing panel is hidden.
    if (typeof MutationObserver !== "undefined") {
      var observer = new MutationObserver(function (records) {
        if (watching && (motionOff() || panelEl.hidden || panelEl.closest("[hidden]"))) { stopVideo(); }
        if (panelEl.hidden || panelEl.closest("[hidden]")) { combat.pause(); dates.pause(); }
        if (!panelEl.hidden && records.some(function (record) { return record.target === panelEl && record.attributeName === "hidden"; })) {
          var gameDialog = panelEl.closest(".game-dialog"); if (gameDialog) { gameDialog.scrollTop = 0; }
        }
      });
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-motion"] });
      observer.observe(panelEl, { attributes: true, attributeFilter: ["hidden"] });
    }
    if (window.matchMedia) {
      var preference = window.matchMedia("(prefers-reduced-motion: reduce)");
      if (preference.addEventListener) { preference.addEventListener("change", function () { if (preference.matches) { stopVideo(); } }); }
    }
    switchView("dates"); switchMode("action"); startRoute(route);
  }

  App.addStrings({
    en: {
      "ldsOtherGames": "All games ↗",
      "ldsHideGameList": "Hide game list",
      "ldsGreet": "♡ Say hello",
      "ldsActionMode": "Action · Starbond Hunt",
      "ldsStrategyMode": "Strategy · Starbond Relay",
      "ldsArenaTitle": "STARBOND HUNT",
      "ldsArenaControls": "WASD / arrows: move · Hold J or the mouse to fire · Space: dodge · E: Evol · P / Esc: pause. Touch: drag the joystick and hold Fire. Keyboard fire aims at the nearest enemy.",
      "ldsBattleReady": "Enter the Deepspace breach",
      "ldsBattleIntro": "Fight two enemy waves, then defeat the Wanderer core. Keep moving while firing. Red lines and rings reveal the next attack; dodge just before impact for a perfect evade.",
      "ldsBattleStart": "Start hunt",
      "ldsBattlePause": "Pause",
      "ldsBattleResume": "Resume",
      "ldsBattlePaused": "Hunt paused",
      "ldsBattlePauseHint": "Your hunt is waiting. Resume when you're ready; the mission clock is stopped.",
      "ldsBattleVictory": "BREACH SEALED",
      "ldsBattleDefeat": "SIGNAL LOST",
      "ldsBattleAgain": "Hunt again",
      "ldsBattleScore": "{s} stars · Score {n} · Best combo {c} · Perfect evades {d}",
      "ldsBattleRetryHint": "Watch the attack warnings, keep moving, and use Evol when your bond gauge fills.",
      "ldsBattleTimeout": "The breach outlasted the mission clock. Hold fire and use the boss's exposed-core window.",
      "ldsReturnCharacter": "Return to character",
      "ldsBattleFire": "Fire · J",
      "ldsBattleDodge": "Dodge · Space",
      "ldsBattleEvol": "Evol · E · {n}%",
      "ldsJoystickLabel": "Movement joystick. Drag to move; WASD and arrow keys also work in the arena.",
      "ldsHealth": "Health",
      "ldsStamina": "Dodge stamina",
      "ldsBattleTime": "Time",
      "ldsWave": "Wave",
      "ldsCombo": "Combo",
      "ldsBossShort": "BOSS",
      "ldsBossName": "WANDERER · CORE SHIELDED",
      "ldsBossExposed": "CORE EXPOSED · ATTACK NOW",
      "ldsBossWarning": "Wanderer incoming. Dodge the fan of bolts and the red impact ring.",
      "ldsPerfectDodge": "PERFECT EVADE · Time slows · Evol +16",
      "ldsEvolReleased": "EVOL LINK · Partner skill released",
      "ldsSoundOff": "Sound off",
      "ldsSoundOn": "Sound on",
      "ldsAudioUnavailable": "Sound is unavailable here. You can still play using the visual cues.",
      "ldsBattlePerkXavier": "Lightblade: strikes every enemy and exposes the boss core. Hold fire during the opening.",
      "ldsBattlePerkZayne": "Frozen sanctuary: freezes enemies, clears incoming attacks, and restores 22 health.",
      "ldsBattlePerkRafayel": "Ocean flame: hits every enemy and leaves a three-second burn.",
      "ldsBattlePerkSylus": "Crimson siphon: strikes the enemy formation and restores 12 health.",
      "ldsBattlePerkCaleb": "Gravity well: gathers smaller enemies, slows the formation, and exposes the core.",
      "ldsLogBattle": "Sealed a Deepspace breach with {name} · Score {n}",
      "ldsFanEdition": "FAN-MADE · MINI ADVENTURE",
      "ldsPortraitAlt": "Official {name} character portrait",
      "ldsPartnerCaleb": "Caleb",
      "ldsPerkCaleb": "guard actions refund +5 energy and gain +3 resonance",
      "ldsEvolLight": "Light",
      "ldsEvolIce": "Ice",
      "ldsEvolFire": "Fire",
      "ldsEvolEnergy": "Energy manipulation",
      "ldsEvolGravity": "Gravity",
      "ldsRoleXavier": "Deepspace Hunter · A light in the quiet",
      "ldsRoleZayne": "Cardiac surgeon · A calm beyond the storm",
      "ldsRoleRafayel": "Artist · Where the ocean meets the flame",
      "ldsRoleSylus": "Onychinus leader · Into the crimson night",
      "ldsRoleCaleb": "Deepspace Pilot · Your way back home",
      "ldsBondValue": "♡ Affinity {n}",
      "ldsTalk": "♡ A quiet moment",
      "ldsTalkGain": "+4 trust · once per mission",
      "ldsWatch": "▷ Animate character",
      "ldsStopWatch": "Ⅱ Pause animation",
      "ldsMediaOnline": "Official animation · internet required · muted",
      "ldsMediaError": "Animation unavailable. Your local portrait is still here.",
      "ldsMotionDisabled": "Enable motion in settings to watch character animation.",
      "ldsMissionTab": "Missions",
      "ldsMemoryTab": "Memories",
      "ldsAlbumTitle": "Memories with {name}",
      "ldsAlbumCount": "{n} / {max} memories collected across all partners",
      "ldsMemoryLocked": "◇ Undiscovered",
      "ldsMemoryUnlock": "Clear this route with {name} to keep this moment.",
      "ldsMemoryEarned": "A new memory saved. Affinity +2.",
      "ldsBondEarned": "Your bond grows. Affinity +1.",
      "ldsMemory1": "The shuttle settles at Nebula Pier. For a moment, you and {name} watch the lights without checking the time.",
      "ldsMemory2": "The clocks fall quiet in Chrono Orbit. {name} stays beside you until the stars begin moving again.",
      "ldsMemory3": "Beyond the Abyss Corridor, a signal finds its way home. You recognize {name}'s footsteps before the door opens.",
      "ldsMemory4": "Heartstar Zenith glows on the horizon. You keep one small promise with {name}: another journey, together.",
      "ldsMoveRecover": "Catch Your Breath",
      "ldsMoveRecoverDetail": "Restore energy; spends one turn",
      "ldsGainPreview": "Energy {e} · Trust {t} · Resonance {r}",
      "ldsCounterHint": "Counter: {move} · matching streak {n}",
      "ldsSkillName": "Evol · {evol}",
      "ldsSkillReady": "Ready · uses one turn",
      "ldsSkillCharge": "Match encounters to charge · {n}/3",
      "ldsNextRoute": "Next route →",
      "ldsMissionComplete": "Mission ended",
      "ldsEncounterWon": "Signal restored. This moment belongs to both of you.",
      "ldsEncounterLost": "Return to base, regroup, and try a different rhythm.",
      "ldsLoseBond": "Target reached, but trust is below 24. Rebuild your bond and try again.",
      "ldsPartnerRestart": "A fresh mission with {name}. Energy and trust reset.",
      "ldsCredit": "Fan-made gameplay and dialogue. Character media © Infold / Papergames. ",
      "ldsOfficialSite": "Official site ↗",
      "ldsLineXavierIntro": "The stars can wait. Let's find our way through this together.",
      "ldsLineXavierTalk": "Stay here a little longer. There's nowhere I'd rather be.",
      "ldsLineXavierMatch": "There. The opening we needed. I'll follow your lead.",
      "ldsLineXavierMiss": "A small detour. Keep your eyes on the next light.",
      "ldsLineXavierSkill": "I'll light the path. Just stay close to me.",
      "ldsLineXavierWin": "We made it. Shall we watch the sunrise before heading home?",
      "ldsLineZayneIntro": "Check your energy before we leave. I'll take care of the rest.",
      "ldsLineZayneTalk": "Your hands are cold. Take a moment; the mission can wait.",
      "ldsLineZayneMatch": "Steady breathing. Your timing was exactly right.",
      "ldsLineZayneMiss": "Don't rush the next decision. We still have room to recover.",
      "ldsLineZayneSkill": "The storm stops here. You're safe beside me.",
      "ldsLineZayneWin": "A good result. Now, promise me you'll get some rest.",
      "ldsLineRafayelIntro": "A sky like this deserves a painting. Try to keep up, won't you?",
      "ldsLineRafayelTalk": "You noticed the colors too? I was hoping you'd say that.",
      "ldsLineRafayelMatch": "Now that's a beautiful rhythm. Again, together!",
      "ldsLineRafayelMiss": "A little too much improvisation. Let's try a different brushstroke.",
      "ldsLineRafayelSkill": "Watch carefully. This flame is just for our grand finale.",
      "ldsLineRafayelWin": "You're taking me to the shore after this. Consider it our reward.",
      "ldsLineSylusIntro": "An interesting route. Show me what you've got.",
      "ldsLineSylusTalk": "You came closer on your own. I could get used to that.",
      "ldsLineSylusMatch": "Good. You saw the weakness before I pointed it out.",
      "ldsLineSylusMiss": "They won't wait for us. Take a breath, then make your next move count.",
      "ldsLineSylusSkill": "My turn. Keep watching; you might learn something.",
      "ldsLineSylusWin": "A deal well kept. Pick the next destination; I'm coming with you.",
      "ldsLineCalebIntro": "Flight checks complete. Ready to take the long way home?",
      "ldsLineCalebTalk": "I saved you the window seat. Some things never change.",
      "ldsLineCalebMatch": "Perfect approach. I knew we still made a good team.",
      "ldsLineCalebMiss": "A little turbulence won't stop us. I've got the controls.",
      "ldsLineCalebSkill": "Gravity's on our side now. Let's bring you home.",
      "ldsLineCalebWin": "Touchdown. Come on, there's dinner waiting for us.",
      "tabLoveDeepspace": "Love and Deepspace",
      "ldsBannerTitle": "Love and Deepspace",
      "ldsBannerTag": "Love and Deepspace",
      "ldsBannerAlt": "A nebula cradling two bonded planets linked by a glowing thread",
      "ldsCharAlt": "An illustrated spacefarer companion glowing softly among the stars",
      "ldsRouteLabel": "Mission route",
      "ldsPartnerLabel": "Lead partner",
      "ldsTurnsLabel": "Turns",
      "ldsEnergyLabel": "Energy",
      "ldsTrustLabel": "Trust",
      "ldsResonanceLabel": "Resonance",
      "ldsTurnsValue": "{n}/{m}",
      "ldsResonanceValue": "{n}/{m}",
      "ldsRoute1": "Nebula Pier",
      "ldsRoute2": "Chrono Orbit",
      "ldsRoute3": "Abyss Corridor",
      "ldsRoute4": "Heartstar Zenith",
      "ldsPartnerXavier": "Xavier",
      "ldsPartnerZayne": "Zayne",
      "ldsPartnerRafayel": "Rafayel",
      "ldsPartnerSylus": "Sylus",
      "ldsPerkXavier": "focus actions gain +5 resonance",
      "ldsPerkZayne": "guard actions gain +2 energy +4 trust",
      "ldsPerkRafayel": "heart actions gain +6 trust",
      "ldsPerkSylus": "focus actions refund +5 energy",
      "ldsMoveFocus": "Star Focus",
      "ldsMoveGuard": "Pulse Guard",
      "ldsMoveHeart": "Heartline Sync",
      "ldsMoveFocusDetail": "High resonance, high drain",
      "ldsMoveGuardDetail": "Stabilize shield and trust",
      "ldsMoveHeartDetail": "Build bond for safer bursts",
      "ldsEventTitle": "Encounter {n}/{m}",
      "ldsEventMeteor": "Meteor rain tears the lane open.",
      "ldsEventStatic": "Neural static scrambles your targeting.",
      "ldsEventPulse": "A memory pulse calls for a calm response.",
      "ldsEventRift": "A gravity rift bends your route.",
      "ldsEventPhantom": "Phantom mechs lock onto your wake.",
      "ldsEventEcho": "An echo beacon amplifies every emotion.",
      "ldsPerkLine": "{name} perk: {perk}",
      "ldsMissionIntro": "{route} begins. Team with {name} and reach {n} resonance.",
      "ldsTurnResult": "Mission continues: {n} turns left. Pressure {k}.",
      "ldsWin": "{name} cleared the route in {n} turns - {s} stars.",
      "ldsUnlocked": "Next route unlocked.",
      "ldsAllClear": "All routes completed.",
      "ldsLoseEnergy": "Energy exhausted. The shuttle has to retreat.",
      "ldsLoseTrust": "Trust collapsed. Rebuild the link and try again.",
      "ldsLoseTurns": "Mission timeout. Missing {n} resonance.",
      "ldsRestart": "Restart Route",
      "ldsLogLabel": "Mission log",
      "ldsLogEmpty": "No actions yet.",
      "ldsLogStart": "Route {route} launched with {name}.",
      "ldsLogTurn": "Turn {n}: {move} | Resonance {r}, Energy {e}, Trust {t}.",
      "ldsHint": "Match the highlighted counter to build a streak and charge Evol. Recover costs a turn. Reach the target with energy above 0 and trust at least 24. Switching partners restarts the mission.",
      "ldsPartnerSwap": "Switched lead partner to {name}.",
      "logLoveDeepspace": "Cleared Love and Deepspace route with {name} in {n} turns",
    },
    zh: {
      "ldsOtherGames": "所有游戏 ↗",
      "ldsHideGameList": "收起游戏列表",
      "ldsGreet": "♡ 和他打个招呼",
      "ldsActionMode": "动作 · 深空狩猎",
      "ldsStrategyMode": "策略 · 星缘接力",
      "ldsArenaTitle": "深空狩猎",
      "ldsArenaControls": "WASD / 方向键移动 · 按住 J 或鼠标持续射击 · 空格闪避 · E 释放 Evol · P / Esc 暂停。触屏：拖动摇杆并按住射击。键盘射击自动瞄准最近的敌人。",
      "ldsBattleReady": "进入深空裂隙",
      "ldsBattleIntro": "击败两波敌人，再摧毁流浪体核心。边射击边移动，红线与圆环会预告下一次攻击；在命中前闪避可触发完美闪避。",
      "ldsBattleStart": "开始狩猎",
      "ldsBattlePause": "暂停",
      "ldsBattleResume": "继续狩猎",
      "ldsBattlePaused": "狩猎已暂停",
      "ldsBattlePauseHint": "战斗正在等你。准备好后继续，任务计时已暂停。",
      "ldsBattleVictory": "裂隙已封锁",
      "ldsBattleDefeat": "信号中断",
      "ldsBattleAgain": "再次狩猎",
      "ldsBattleScore": "{s} 星 · 得分 {n} · 最高连击 {c} · 完美闪避 {d} 次",
      "ldsBattleRetryHint": "留意攻击预警，保持移动，并在羁绊槽充满时释放 Evol。",
      "ldsBattleTimeout": "任务时间已耗尽。持续射击，并抓住首领核心暴露的时机。",
      "ldsReturnCharacter": "返回角色界面",
      "ldsBattleFire": "射击 · J",
      "ldsBattleDodge": "闪避 · 空格",
      "ldsBattleEvol": "Evol · E · {n}%",
      "ldsJoystickLabel": "移动摇杆。拖动移动，也可在战场使用 WASD 或方向键。",
      "ldsHealth": "生命",
      "ldsStamina": "闪避体力",
      "ldsBattleTime": "时间",
      "ldsWave": "波次",
      "ldsCombo": "连击",
      "ldsBossShort": "首领",
      "ldsBossName": "流浪体 · 核心护盾",
      "ldsBossExposed": "核心暴露 · 全力攻击",
      "ldsBossWarning": "流浪体出现！闪避扇形弹幕与红色冲击圆环。",
      "ldsPerfectDodge": "完美闪避 · 时间减缓 · Evol +16",
      "ldsEvolReleased": "Evol 联结 · 搭档技能已释放",
      "ldsSoundOff": "音效关闭",
      "ldsSoundOn": "音效开启",
      "ldsAudioUnavailable": "当前无法播放音效，仍可通过视觉提示继续战斗。",
      "ldsBattlePerkXavier": "光刃：攻击所有敌人并暴露首领核心，抓住时机持续射击。",
      "ldsBattlePerkZayne": "冰封庇护：冻结敌人、清除来袭攻击，并恢复 22 点生命。",
      "ldsBattlePerkRafayel": "海焰：攻击所有敌人，并留下持续三秒的灼烧。",
      "ldsBattlePerkSylus": "绯红汲取：打击敌方阵列，并恢复 12 点生命。",
      "ldsBattlePerkCaleb": "引力场：聚拢小型敌人、减缓敌方行动，并暴露核心。",
      "ldsLogBattle": "与 {name} 封锁深空裂隙 · 得分 {n}",
      "ldsFanEdition": "同人制作 · 迷你冒险",
      "ldsPortraitAlt": "{name} 的官方角色肖像",
      "ldsPartnerCaleb": "夏以昼",
      "ldsPerkCaleb": "防御行动返还 +5 能量并额外 +3 共鸣",
      "ldsEvolLight": "光",
      "ldsEvolIce": "冰",
      "ldsEvolFire": "火",
      "ldsEvolEnergy": "能量操控",
      "ldsEvolGravity": "引力",
      "ldsRoleXavier": "深空猎人 · 静夜里的那束光",
      "ldsRoleZayne": "心脏外科医生 · 风暴之外的安宁",
      "ldsRoleRafayel": "艺术家 · 海与火交汇之处",
      "ldsRoleSylus": "暗点组织首领 · 走入绯红之夜",
      "ldsRoleCaleb": "深空飞行员 · 带你回家的航线",
      "ldsBondValue": "♡ 羁绊值 {n}",
      "ldsTalk": "♡ 片刻陪伴",
      "ldsTalkGain": "+4 默契 · 每次任务限一次",
      "ldsWatch": "▷ 播放角色动画",
      "ldsStopWatch": "Ⅱ 暂停动画",
      "ldsMediaOnline": "官方动画 · 需联网 · 静音播放",
      "ldsMediaError": "动画暂时无法播放，本地肖像仍可查看。",
      "ldsMotionDisabled": "请先在设置中启用动态效果，再播放角色动画。",
      "ldsMissionTab": "任务航线",
      "ldsMemoryTab": "回忆收藏",
      "ldsAlbumTitle": "与 {name} 的回忆",
      "ldsAlbumCount": "所有搭档共收集 {n} / {max} 段回忆",
      "ldsMemoryLocked": "◇ 尚未发现",
      "ldsMemoryUnlock": "与 {name} 完成这条航线，留住这一刻。",
      "ldsMemoryEarned": "新回忆已收藏，羁绊 +2。",
      "ldsBondEarned": "与你的联结更深了，羁绊 +1。",
      "ldsMemory1": "穿梭机停靠星雾码头。你与 {name} 静静看着灯光，暂时忘记了时间。",
      "ldsMemory2": "时序轨道里的钟声停了。{name} 陪你等到星光重新流动。",
      "ldsMemory3": "深渊走廊外，一道信号终于找到归途。舱门打开前，你已认出 {name} 的脚步声。",
      "ldsMemory4": "心曜天顶在远方亮起。你与 {name} 留下一个小小的约定：下次也一起出发。",
      "ldsMoveRecover": "稍作休整",
      "ldsMoveRecoverDetail": "恢复能量，消耗一个回合",
      "ldsGainPreview": "能量 {e} · 默契 {t} · 共鸣 {r}",
      "ldsCounterHint": "应对：{move} · 连续匹配 {n} 次",
      "ldsSkillName": "Evol · {evol}",
      "ldsSkillReady": "已就绪 · 消耗一个回合",
      "ldsSkillCharge": "匹配遭遇以充能 · {n}/3",
      "ldsNextRoute": "下一条航线 →",
      "ldsMissionComplete": "任务结束",
      "ldsEncounterWon": "信号恢复。这一刻属于你们两个人。",
      "ldsEncounterLost": "返回基地，调整状态，再尝试新的节奏。",
      "ldsLoseBond": "共鸣已达标，但默契低于 24。重建联结后再试一次。",
      "ldsPartnerRestart": "与 {name} 重新出发，能量和默契已重置。",
      "ldsCredit": "同人玩法与原创对白。角色素材 © Infold / 叠纸。",
      "ldsOfficialSite": "官方网站 ↗",
      "ldsLineXavierIntro": "星星可以等一等。我们一起找到前面的路吧。",
      "ldsLineXavierTalk": "再待一会儿吧。我想去的地方，就是你身边。",
      "ldsLineXavierMatch": "找到了。就是这个时机，我会跟上你。",
      "ldsLineXavierMiss": "只是绕了一点路。看着下一束光就好。",
      "ldsLineXavierSkill": "我来照亮前路。靠近我一点。",
      "ldsLineXavierWin": "到了。回去之前，要一起等日出吗？",
      "ldsLineZayneIntro": "出发前检查一下能量。剩下的交给我。",
      "ldsLineZayneTalk": "你的手有点凉。休息一下，任务不急。",
      "ldsLineZayneMatch": "保持呼吸。刚才的时机判断得很好。",
      "ldsLineZayneMiss": "下一步不用急。我们还有调整的余地。",
      "ldsLineZayneSkill": "风暴到此为止。待在我身边，你是安全的。",
      "ldsLineZayneWin": "结果不错。现在答应我，回去好好休息。",
      "ldsLineRafayelIntro": "这样的天空值得画下来。可别跟丢了啊。",
      "ldsLineRafayelTalk": "你也看见那些颜色了？我就等你这句话呢。",
      "ldsLineRafayelMatch": "这个节奏真漂亮。再来一次，一起！",
      "ldsLineRafayelMiss": "这次即兴有点过头了。换个笔触试试。",
      "ldsLineRafayelSkill": "看仔细了。这簇火，是我们谢幕的礼物。",
      "ldsLineRafayelWin": "结束之后陪我去海边。这是我们的奖励。",
      "ldsLineSylusIntro": "航线有点意思。让我看看你的本事。",
      "ldsLineSylusTalk": "这次是你自己走近的。我倒是不介意。",
      "ldsLineSylusMatch": "不错。还没等我开口，你就发现了破绽。",
      "ldsLineSylusMiss": "他们可不会等我们。缓口气，让下一步更准一点。",
      "ldsLineSylusSkill": "轮到我了。看着，说不定能学到点东西。",
      "ldsLineSylusWin": "约定完成。下一站你来选，我跟你去。",
      "ldsLineCalebIntro": "飞行检查完成。准备好绕一点远路回家了吗？",
      "ldsLineCalebTalk": "靠窗的位置给你留着。有些习惯一直没变。",
      "ldsLineCalebMatch": "进场时机完美。我就知道，我们还是很有默契。",
      "ldsLineCalebMiss": "一点气流而已。操纵杆在我手上，放心。",
      "ldsLineCalebSkill": "现在引力也站在我们这边。走，带你回家。",
      "ldsLineCalebWin": "平安降落。走吧，晚饭还等着我们呢。",
      "tabLoveDeepspace": "恋与深空",
      "ldsBannerTitle": "恋与深空",
      "ldsBannerTag": "恋与深空",
      "ldsBannerAlt": "星云中两颗以光丝相连的行星",
      "ldsCharAlt": "一位在星海中散发柔光的太空旅人插画",
      "ldsRouteLabel": "任务航线",
      "ldsPartnerLabel": "主导搭档",
      "ldsTurnsLabel": "回合",
      "ldsEnergyLabel": "能量",
      "ldsTrustLabel": "默契",
      "ldsResonanceLabel": "共鸣",
      "ldsTurnsValue": "{n}/{m}",
      "ldsResonanceValue": "{n}/{m}",
      "ldsRoute1": "星雾码头",
      "ldsRoute2": "时序轨道",
      "ldsRoute3": "深渊走廊",
      "ldsRoute4": "心曜天顶",
      "ldsPartnerXavier": "沈星回",
      "ldsPartnerZayne": "黎深",
      "ldsPartnerRafayel": "祁煜",
      "ldsPartnerSylus": "秦彻",
      "ldsPerkXavier": "专注行动额外 +5 共鸣",
      "ldsPerkZayne": "防御行动额外 +2 能量 +4 默契",
      "ldsPerkRafayel": "心链行动额外 +6 默契",
      "ldsPerkSylus": "专注行动返还 +5 能量",
      "ldsMoveFocus": "星轨专注",
      "ldsMoveGuard": "脉冲护盾",
      "ldsMoveHeart": "心链同步",
      "ldsMoveFocusDetail": "高共鸣，高消耗",
      "ldsMoveGuardDetail": "稳住护盾与默契",
      "ldsMoveHeartDetail": "先积累默契再爆发",
      "ldsEventTitle": "遭遇 {n}/{m}",
      "ldsEventMeteor": "流星雨撕开了航道。",
      "ldsEventStatic": "神经干扰让瞄准失真。",
      "ldsEventPulse": "回忆脉冲需要你先冷静回应。",
      "ldsEventRift": "引力裂缝扭曲了路线。",
      "ldsEventPhantom": "幻影机群锁定了尾迹。",
      "ldsEventEcho": "回声信标放大了每种情绪。",
      "ldsPerkLine": "{name} 特性：{perk}",
      "ldsMissionIntro": "{route} 开始。与 {name} 协作，达成 {n} 点共鸣。",
      "ldsTurnResult": "任务继续：剩余 {n} 回合。当前压力 {k}。",
      "ldsWin": "{name} 在 {n} 回合内通关 - 获得 {s} 星。",
      "ldsUnlocked": "已解锁下一条航线。",
      "ldsAllClear": "全部航线完成。",
      "ldsLoseEnergy": "能量耗尽，穿梭机被迫返航。",
      "ldsLoseTrust": "默契崩溃，请重建联结再试一次。",
      "ldsLoseTurns": "任务超时，还差 {n} 点共鸣。",
      "ldsRestart": "重开航线",
      "ldsLogLabel": "任务日志",
      "ldsLogEmpty": "还没有行动记录。",
      "ldsLogStart": "航线 {route} 已启动，搭档 {name}。",
      "ldsLogTurn": "第 {n} 回合：{move}｜共鸣 {r}、能量 {e}、默契 {t}。",
      "ldsHint": "匹配高亮的应对行动可累积连击并为 Evol 充能。休整消耗一回合。能量须大于 0、默契至少 24 才能通关。切换搭档会重开任务。",
      "ldsPartnerSwap": "已切换主导搭档为 {name}。",
      "logLoveDeepspace": "与 {name} 在 {n} 回合内完成了恋与深空任务",
    },
  });

  App.registerGame({
    name: "loveDeepspace",
    tabKey: "tabLoveDeepspace",
    init: initLoveDeepspaceGame,
    guide: {
      svg:
        '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' +
        '<defs><linearGradient id="ldsG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5b7cfa"/><stop offset="1" stop-color="#f472b6"/></linearGradient></defs>' +
        '<rect x="6" y="6" width="108" height="64" rx="7" fill="rgba(15,23,42,.8)" stroke="rgba(148,163,184,.45)"/>' +
        '<path d="M16 56l18-16 16 8 18-20 16 9 20-17" fill="none" stroke="url(#ldsG)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<circle cx="34" cy="40" r="4" fill="#60a5fa"/><circle cx="68" cy="28" r="4" fill="#c084fc"/><circle cx="104" cy="20" r="4" fill="#fb7185"/>' +
        '<rect x="14" y="14" width="36" height="12" rx="6" fill="rgba(96,165,250,.2)" stroke="#60a5fa"/>' +
        '<text x="32" y="22" text-anchor="middle" font-size="7" fill="#bfdbfe">R 82</text></svg>',
      en: [
        "Together: each partner has five local images. Switch the scene thumbnails, or enable scene reactions to change artwork during play. Photo studio saves the selected artwork. Say hello optionally plays a muted official character video.",
        "Playtime: aim the moving claw with A/D, arrows or touch, then drop with Space. Kitty Cards doubles colour matches and lets you shield a card in Advanced mode. Collected plushies and your first win badge raise affinity.",
        "Claw Challenge: collect prizes in 60 seconds. Press Space again in the mint grip zone; centre hits earn Perfect bonuses. Consecutive catches add combo points, and each partner's best record is saved.",
        "Advanced Kitty Cards: both sides get two tactics. Redraw a hand card, boost your cup by two up to eight, or rotate a filled cup's colour before placing a number card. Shields protect against enemy colour changes.",
        "Dates: three story choices lead to two saved endings. Reframe a portrait in Photo studio, save a snapshot, or download a PNG. Quality time offers a visible-page timer; your first completed session with each partner raises affinity.",
        "Action: Starbond Hunt is the default mode. Move with WASD or arrows, hold J to auto-aim and fire, or hold the mouse to aim manually. On touch screens, drag the joystick and hold Fire.",
        "Dodge: press Space just before a bolt or impact ring hits. A perfect evade slows enemy time and charges Evol. Press E at 100% for your partner's skill. P or Escape pauses; resume manually after closing the drawer.",
        "Boss: defeat two enemy waves, then the Wanderer. Attack during its exposed-core window. A win saves a route memory and unlocks the next route; clear in 40 seconds with at least 75 health for three stars.",
        "Strategy mode: clear each route by reaching its resonance target before turns run out.",
        "Pick one of five partners. Each has a unique perk, Evol skill, and dialogue. Changing partners restarts the current mission.",
        "Every encounter prefers one action card. Matching it grants a combo boost; mismatching costs extra trust and energy.",
        "Keep all three meters alive: zero energy retreats, zero trust breaks the link, and low resonance misses the mission.",
        "Three matching counters charge Evol. Its partner-specific skill uses one turn; recovery restores energy but also uses a turn. A quiet moment grants trust once per mission.",
        "Win with fewer turns to earn more stars and unlock harder routes. Each partner can collect four saved memories; find them in Memories.",
        "Animate character plays an optional muted official video online. Local portraits work offline; motion settings and closing the drawer pause the video.",
      ],
      zh: [
        "陪伴：每位搭档都有五张本地画面，可点缩略图切换或启用游玩画面反应，拍照馆也会保存所选画面。打招呼可播放静音官方角色视频。",
        "游玩：A/D、方向键或触屏瞄准移动中的娃娃，空格下爪。喵喵牌同色翻倍，进阶模式可用护盾保护一张牌。收藏新娃娃及首次获胜徽章会增加羁绊。",
        "抓娃娃挑战：60 秒内抓取娃娃，在薄荷色握爪区再按空格，命中中心可获完美加分。连续抓取积累连击，每位搭档的最佳纪录都会保存。",
        "进阶喵喵牌：双方各有两次战术，可重抽手牌、给己方杯中牌加二分（上限八），或轮换已有牌杯子的颜色，然后照常放牌。护盾会阻挡对方改色。",
        "约会：三次选择通向两个可收藏结局；拍照馆可调整构图、保存快照或下载 PNG。专属陪伴仅在页面可见时计时，与每位搭档首次完成陪伴会增加羁绊。",
        "动作模式：默认进入深空狩猎。WASD 或方向键移动，按住 J 自动瞄准射击，也可按住鼠标手动瞄准。触屏可拖动摇杆并按住射击。",
        "闪避：弹幕或冲击圆环命中前按空格。完美闪避可减缓敌人并为 Evol 充能，充满后按 E 释放搭档技能。P 或 Esc 暂停，关闭面板后须手动继续。",
        "首领：击败两波敌人后挑战流浪体，抓住核心暴露的时机攻击。胜利可收藏回忆并解锁新航线；40 秒内通关且剩余至少 75 点生命可获得三星。",
        "策略模式：在回合耗尽前达到该航线的共鸣目标并通关。",
        "选择五位搭档之一；每位都有独特特性、Evol 技能和对白。切换搭档会重开当前任务。",
        "每次遭遇都有偏好的行动卡，匹配会连锁加成，不匹配会额外消耗默契与能量。",
        "三条数值都要守住：能量归零会撤退，默契归零会断联，共鸣不足会超时失败。",
        "匹配三次遭遇即可为 Evol 充满能量；专属技能与恢复能量的休整均消耗一回合。片刻陪伴每次任务可增加一次默契。",
        "用更少回合获胜可拿更多星并解锁新航线。每位搭档可收藏四段回忆，在回忆收藏中查看。",
        "角色动画为可选的联网静音官方视频。本地肖像可离线查看；关闭动态效果或游戏面板会暂停视频。",
      ],
    },
  });

  /* Exported for the other modules. */
  App.initLoveDeepspaceGame = initLoveDeepspaceGame;
  App.ldsAdvance = ldsAdvance;
  App.ldsReadAlbum = ldsReadAlbum;
  App.ldsReadLooks = ldsReadLooks;
  App.ldsPartners = ldsPartners;
  App.ldsRoutes = ldsRoutes;
  App.ldsMoves = ldsMoves;
})(window.CapitalConvert = window.CapitalConvert || {});
