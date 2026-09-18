/* Pet lifecycle - Timers, achievements, combos, idle sleep, emotes, sound and awareness. */
(function (App) {
  var Pet = App.Pet;
  /* Shared names from the other modules (see window.CapitalConvert). */
  var isMotionOff = App.isMotionOff;
  function petAchievementById() { return App.petAchievementById.apply(null, arguments); }
  var petAchievementIds = App.petAchievementIds;
  var petAchievements = App.petAchievements;
  function petApplyDecay() { return App.petApplyDecay.apply(null, arguments); }
  function petApplyVisitReward() { return App.petApplyVisitReward.apply(null, arguments); }
  function petAttentionChanged() { return App.petAttentionChanged.apply(null, arguments); }
  function petClamp() { return App.petClamp.apply(null, arguments); }
  var petComboWindowMs = App.petComboWindowMs;
  var petCornerOrder = App.petCornerOrder;
  var petCursorThrottleMs = App.petCursorThrottleMs;
  var petEmoteEveryMs = App.petEmoteEveryMs;
  var petEmoteHideMs = App.petEmoteHideMs;
  function petEvaluateAttention() { return App.petEvaluateAttention.apply(null, arguments); }
  var petIdleSleepMs = App.petIdleSleepMs;
  function petLevelValue() { return App.petLevelValue.apply(null, arguments); }
  function petLocalDay() { return App.petLocalDay.apply(null, arguments); }
  function petMiniStop() { return App.petMiniStop.apply(null, arguments); }
  function petMood() { return App.petMood.apply(null, arguments); }
  function petReact() { return App.petReact.apply(null, arguments); }
  function petRender() { return App.petRender.apply(null, arguments); }
  function petRenderBadges() { return App.petRenderBadges.apply(null, arguments); }
  var petRepairCost = App.petRepairCost;
  function petSetStatus() { return App.petSetStatus.apply(null, arguments); }
  function petSpawnParticles() { return App.petSpawnParticles.apply(null, arguments); }
  function petStageIndex() { return App.petStageIndex.apply(null, arguments); }
  function petStageValue() { return App.petStageValue.apply(null, arguments); }
  var petTickMs = App.petTickMs;
  function petTimeOfDay() { return App.petTimeOfDay.apply(null, arguments); }
  var petToastMs = App.petToastMs;
  var petTypingCooldownMs = App.petTypingCooldownMs;
  function petWriteState() { return App.petWriteState.apply(null, arguments); }
  var t = App.t;
  function petTrackTimeout(callback, delay) {
    var id = window.setTimeout(function () {
      petUntrackTimeout(id);
      callback();
    }, delay);
    Pet.trackedTimeouts.push(id);
    return id;
  }

  function petUntrackTimeout(id) {
    var index = Pet.trackedTimeouts.indexOf(id);
    if (index !== -1) {
      Pet.trackedTimeouts.splice(index, 1);
    }
  }

  function petClearTrackedTimeouts() {
    Pet.trackedTimeouts.forEach(function (id) {
      window.clearTimeout(id);
    });
    Pet.trackedTimeouts = [];
    if (Pet.statusTimer !== null) {
      window.clearTimeout(Pet.statusTimer);
      Pet.statusTimer = null;
    }
    if (Pet.reactionTimer !== null) {
      window.clearTimeout(Pet.reactionTimer);
      Pet.reactionTimer = null;
    }
    if (Pet.resetTimer !== null) {
      window.clearTimeout(Pet.resetTimer);
      Pet.resetTimer = null;
    }
    if (Pet.comboTimer !== null) {
      window.clearTimeout(Pet.comboTimer);
      Pet.comboTimer = null;
    }
    if (Pet.toastTimer !== null) {
      window.clearTimeout(Pet.toastTimer);
      Pet.toastTimer = null;
    }
    Pet.emoteHideTimer = null;
  }

  function petStartTimer() {
    if (Pet.decayTimer !== null || !Pet.state || Pet.state.hidden) {
      return;
    }
    if (document.hidden) {
      return;
    }
    Pet.decayTimer = window.setInterval(petOnTick, petTickMs);
  }

  function petStopTimer() {
    if (Pet.decayTimer === null) {
      return;
    }
    window.clearInterval(Pet.decayTimer);
    Pet.decayTimer = null;
  }

  function petOnTick() {
    if (!Pet.state || Pet.state.hidden) {
      petStopTimer();
      return;
    }
    var now = Date.now();
    var changed = petApplyDecay(now) > 0;
    changed = petRefreshIdleSleep(now) || changed;
    var attention = petEvaluateAttention(now);
    changed = petAttentionChanged(attention) || changed;
    petEmoteBeat(now);
    if (changed) {
      petWriteState();
      petRender();
    }
    if (attention.logged.length) {
      petBlip("bad");
      petSetStatus(t("petCareMistakeLogged", { name: Pet.state.name }));
      return;
    }
    if (attention.recovered.length && !Pet.statusText && !Pet.asleep) {
      petSetStatus(t("petCareRecovered", { name: Pet.state.name }));
    }
  }

  function petRefreshIdleSleep(now) {
    if (!Pet.state || Pet.state.hidden) {
      return false;
    }
    var shouldSleep =
      now - Pet.lastInteraction > petIdleSleepMs ||
      (petTimeOfDay(now) === "night" && now - Pet.lastInteraction > 60000);
    if (shouldSleep && !Pet.asleep) {
      Pet.asleep = true;
      petSpawnParticles("sleep");
      petRender();
      petSetStatus(t("petReactionSleep", { name: Pet.state.name }));
      return true;
    }
    return false;
  }

  function petHandleVisibility() {
    if (document.hidden) {
      petStopTimer();
      petMiniStop();
      petStopEmote();
      if (Pet.state) {
        petApplyDecay(Date.now());
        petWriteState();
      }
      return;
    }
    if (Pet.state) {
      Pet.emoteAt = Date.now();
      petApplyDecay(Date.now());
      petEvaluateAttention(Date.now());
      petWriteState();
      petRender();
    }
    petStartTimer();
  }

  function petPersistNow() {
    if (!Pet.state) {
      return;
    }
    petApplyDecay(Date.now());
    petWriteState();
  }

  /* --- progression, visits, achievements --------------------------- */

  /*
   * Resolves the daily visit. A missed day is offered a repair (when the streak
   * is worth keeping and affordable) instead of silently resetting; the visit
   * stays deferred until the player decides.
   */
  function petTouchVisit(now) {
    if (!Pet.state) {
      return { treats: 0, unlock: false, deferred: false };
    }
    var at = now === undefined ? Date.now() : now;
    var today = petLocalDay(at);
    if (Pet.state.repairStreak > 0) {
      return { treats: 0, unlock: false, deferred: true };
    }
    if (!Pet.state.lastDay) {
      Pet.state.lastDay = today;
      Pet.state.daysVisited = Math.max(1, Pet.state.daysVisited);
      Pet.state.streak = Math.max(1, Pet.state.streak);
      return { treats: 0, unlock: false, deferred: false };
    }
    if (Pet.state.lastDay === today) {
      return { treats: 0, unlock: false, deferred: false };
    }
    var yesterday = petLocalDay(at - 86400000);
    var missed = Pet.state.lastDay !== yesterday;
    if (missed && Pet.state.streak >= 2 && Pet.state.treats >= petRepairCost) {
      Pet.state.repairStreak = Pet.state.streak;
      return { treats: 0, unlock: false, deferred: true };
    }
    Pet.state.streak = missed ? 1 : Pet.state.streak + 1;
    Pet.state.daysVisited += 1;
    Pet.state.lastDay = today;
    var result = petApplyVisitReward();
    result.deferred = false;
    return result;
  }

  function petAddTreats(amount) {
    if (!Pet.state) {
      return 0;
    }
    var before = Pet.state.treats;
    Pet.state.treats = petClamp(Math.floor(Pet.state.treats + amount), 0, 9999);
    return Pet.state.treats - before;
  }

  function petUnlockedCount() {
    var count = 0;
    if (!Pet.state) {
      return 0;
    }
    petAchievementIds.forEach(function (id) {
      if (Pet.state.achievements[id]) {
        count += 1;
      }
    });
    return count;
  }

  function petCheckAchievements() {
    var unlocked = [];
    if (!Pet.state) {
      return unlocked;
    }
    var level = petLevelValue();
    var stage = petStageIndex(petStageValue(level));
    petAchievements.forEach(function (definition) {
      if (Pet.state.achievements[definition.id]) {
        return;
      }
      var ok = false;
      if (definition.id === "firstPet") {
        ok = true;
      } else if (definition.id === "fed10") {
        ok = Pet.state.totalFeeds >= 10;
      } else if (definition.id === "level5") {
        ok = level >= 5;
      } else if (definition.id === "level10") {
        ok = level >= 10;
      } else if (definition.id === "miniWin") {
        ok = Pet.state.miniGamesFinished >= 1;
      } else if (definition.id === "trickster") {
        ok = Pet.state.tricks.length >= 1;
      } else if (definition.id === "streak3") {
        ok = Pet.state.streak >= 3;
      } else if (definition.id === "treats25") {
        ok = Pet.state.treats >= 25;
      } else if (definition.id === "combo5") {
        ok = Pet.state.bestCombo >= 5;
      } else if (definition.id === "evolved") {
        ok = stage >= 1;
      } else if (definition.id === "dressed") {
        ok = Pet.state.accessory !== "none";
      }
      if (ok) {
        Pet.state.achievements[definition.id] = Date.now();
        unlocked.push(definition.id);
      }
    });
    return unlocked;
  }

  function petCelebrateAchievement(id) {
    var definition = petAchievementById(id);
    if (!definition || !Pet.state) {
      return;
    }
    if (Pet.els && Pet.els.toast) {
      Pet.els.toast.textContent = t("petAchievementUnlocked", {
        name: Pet.state.name,
        title: t(definition.titleKey),
      });
      Pet.els.toast.hidden = false;
      if (Pet.toastTimer !== null) {
        window.clearTimeout(Pet.toastTimer);
      }
      Pet.toastTimer = window.setTimeout(function () {
        Pet.toastTimer = null;
        if (Pet.els && Pet.els.toast) {
          Pet.els.toast.hidden = true;
          Pet.els.toast.textContent = "";
        }
      }, petToastMs);
    }
    petSpawnParticles("achievement");
    petRenderBadges();
    petBlip("win");
  }

  /* --- petting combo ----------------------------------------------- */

  function petBumpCombo() {
    Pet.combo += 1;
    if (Pet.state && Pet.combo > Pet.state.bestCombo) {
      Pet.state.bestCombo = Pet.combo;
    }
    if (Pet.comboTimer !== null) {
      window.clearTimeout(Pet.comboTimer);
    }
    Pet.comboTimer = window.setTimeout(function () {
      Pet.comboTimer = null;
      Pet.combo = 0;
      petRenderCombo();
    }, petComboWindowMs);
    petRenderCombo();
    if (Pet.combo % 3 === 0) {
      petAddTreats(1);
    }
    return Pet.combo;
  }

  function petRenderCombo() {
    if (!Pet.els || !Pet.els.combo) {
      return;
    }
    if (Pet.combo >= 2) {
      Pet.els.combo.textContent = t("petComboLabel", { n: Pet.combo });
      Pet.els.combo.hidden = false;
      return;
    }
    Pet.els.combo.hidden = true;
    Pet.els.combo.textContent = "";
  }

  /* --- idle / wake / wake-up awareness ----------------------------- */

  function petTouchInteraction() {
    Pet.lastInteraction = Date.now();
    if (Pet.asleep) {
      Pet.asleep = false;
      petRender();
      petSetStatus(t("petReactionWoke", { name: Pet.state ? Pet.state.name : "" }));
    }
  }

  function petSleepNow() {
    if (!Pet.state || Pet.asleep) {
      return;
    }
    Pet.asleep = true;
    petSpawnParticles("sleep");
    petRender();
  }

  /* --- idle emote bubble: tick-driven so it owns no permanent timer -- */

  function petEmoteLine() {
    if (!Pet.state) {
      return "";
    }
    var mood = petMood();
    return t("petEmote" + mood.charAt(0).toUpperCase() + mood.slice(1));
  }

  function petHideEmote() {
    if (!Pet.els || !Pet.els.emote) {
      return;
    }
    Pet.els.emote.hidden = true;
    Pet.els.emote.textContent = "";
    Pet.els.emote.classList.remove("is-pop");
  }

  function petShowEmote() {
    if (!Pet.els || !Pet.els.emote || !Pet.state || Pet.state.hidden) {
      return false;
    }
    if (Pet.els.widget.hidden || Pet.collapsed || Pet.asleep || document.hidden) {
      return false;
    }
    Pet.els.emote.textContent = petEmoteLine();
    /* Reduced motion: text only, never an animated pop. */
    Pet.els.emote.classList.toggle("is-pop", !isMotionOff());
    Pet.els.emote.hidden = false;
    if (Pet.emoteHideTimer !== null) {
      window.clearTimeout(Pet.emoteHideTimer);
      petUntrackTimeout(Pet.emoteHideTimer);
    }
    Pet.emoteHideTimer = petTrackTimeout(function () {
      Pet.emoteHideTimer = null;
      petHideEmote();
    }, petEmoteHideMs);
    return true;
  }

  /*
   * Called from the existing decay tick, so the pet never owns a permanent
   * timer: at most one bubble every petEmoteEveryMs, and a short tracked
   * timeout only while a bubble is actually on screen.
   */
  function petEmoteBeat(now) {
    if (!Pet.state || Pet.state.hidden || document.hidden) {
      return false;
    }
    if (now - Pet.emoteAt < petEmoteEveryMs) {
      return false;
    }
    if (!petShowEmote()) {
      return false;
    }
    Pet.emoteAt = now;
    return true;
  }

  function petStopEmote() {
    if (Pet.emoteHideTimer !== null) {
      window.clearTimeout(Pet.emoteHideTimer);
      petUntrackTimeout(Pet.emoteHideTimer);
      Pet.emoteHideTimer = null;
    }
    petHideEmote();
  }

  /* --- optional WebAudio blips (off by default, no external files) -- */

  function petSoundEnabled() {
    return !!(Pet.state && Pet.state.sound === true);
  }

  function petBlip(kind) {
    if (!petSoundEnabled()) {
      return;
    }
    try {
      var Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) {
        return;
      }
      if (!Pet.audio) {
        Pet.audio = new Ctor();
      }
      if (Pet.audio.state === "suspended" && typeof Pet.audio.resume === "function") {
        Pet.audio.resume();
      }
      var at = Pet.audio.currentTime;
      var osc = Pet.audio.createOscillator();
      var gain = Pet.audio.createGain();
      var frequency = kind === "win" ? 880 : kind === "bad" ? 240 : 620;
      osc.type = "sine";
      osc.frequency.setValueAtTime(frequency, at);
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.05, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.18);
      osc.connect(gain);
      gain.connect(Pet.audio.destination);
      osc.start(at);
      osc.stop(at + 0.2);
    } catch (error) {
      /* audio is purely optional */
    }
  }

  /* --- pointer tracking + page awareness --------------------------- */

  function petBindAwareness() {
    if (Pet.listenersBound) {
      return;
    }
    Pet.listenersBound = true;
    document.addEventListener("pointermove", petOnPointerMove, { passive: true });
    document.addEventListener("input", petOnPageInput, true);
  }

  function petOnPointerMove(event) {
    if (!Pet.state || !Pet.els || Pet.els.widget.hidden || isMotionOff()) {
      return;
    }
    var now = Date.now();
    if (now - Pet.cursorAt < petCursorThrottleMs) {
      return;
    }
    Pet.cursorAt = now;
    var centerX = 0;
    var centerY = 0;
    try {
      var rect = Pet.els.button.getBoundingClientRect();
      centerX = rect.left + rect.width / 2;
      centerY = rect.top + rect.height / 2;
    } catch (error) {
      return;
    }
    var lookX = petClamp((event.clientX - centerX) / 120, -1, 1) * 2.4;
    var lookY = petClamp((event.clientY - centerY) / 140, -1, 1) * 1.4;
    if (lookX === Pet.lookX && lookY === Pet.lookY) {
      return;
    }
    Pet.lookX = lookX;
    Pet.lookY = lookY;
    Pet.els.widget.style.setProperty("--pet-look-x", lookX.toFixed(2) + "px");
    Pet.els.widget.style.setProperty("--pet-look-y", lookY.toFixed(2) + "px");
  }

  function petOnPageInput(event) {
    if (!Pet.state || !Pet.els || Pet.els.widget.hidden) {
      return;
    }
    var target = event && event.target;
    if (!target || !target.tagName) {
      return;
    }
    var tag = String(target.tagName).toUpperCase();
    if (tag !== "TEXTAREA" && tag !== "INPUT") {
      return;
    }
    if (Pet.els.widget.contains(target)) {
      return;
    }
    var now = Date.now();
    if (now - Pet.typingAt < petTypingCooldownMs) {
      return;
    }
    Pet.typingAt = now;
    Pet.lastInteraction = now;
    if (Pet.asleep) {
      Pet.asleep = false;
      petRender();
    }
    petSetStatus(t("petReactionTyping"));
    petReact("cheer");
  }

  /* --- draggable widget (snaps to a persisted corner) -------------- */

  function petCornerFromPoint(x, y) {
    var right = x >= (window.innerWidth || 0) / 2;
    var bottom = y >= (window.innerHeight || 0) / 2;
    return (bottom ? "b" : "t") + (right ? "r" : "l");
  }

  function petApplyCorner(corner) {
    if (!Pet.els || !Pet.els.widget) {
      return;
    }
    var value = corner === undefined
      ? (Pet.state ? Pet.state.pos : "br")
      : corner;
    Pet.els.widget.setAttribute("data-corner", value);
  }

  function petOnDragStart(event) {
    if (!Pet.state || (event && event.button > 0)) {
      return;
    }
    if (Pet.mini) {
      return;
    }
    Pet.drag = {
      startX: event ? event.clientX : 0,
      startY: event ? event.clientY : 0,
      moved: false,
    };
    document.addEventListener("pointermove", petOnDragMove);
    document.addEventListener("pointerup", petOnDragEnd);
    document.addEventListener("pointercancel", petOnDragEnd);
  }

  function petOnDragMove(event) {
    if (!Pet.drag) {
      return;
    }
    var dx = event.clientX - Pet.drag.startX;
    var dy = event.clientY - Pet.drag.startY;
    if (!Pet.drag.moved && Math.abs(dx) + Math.abs(dy) < 6) {
      return;
    }
    Pet.drag.moved = true;
    if (Pet.els && Pet.els.widget) {
      Pet.els.widget.setAttribute("data-dragging", "true");
      petApplyCorner(petCornerFromPoint(event.clientX, event.clientY));
    }
    if (event && typeof event.preventDefault === "function") {
      event.preventDefault();
    }
  }

  function petOnDragEnd(event) {
    document.removeEventListener("pointermove", petOnDragMove);
    document.removeEventListener("pointerup", petOnDragEnd);
    document.removeEventListener("pointercancel", petOnDragEnd);
    if (!Pet.drag) {
      return;
    }
    var dragged = Pet.drag.moved;
    Pet.drag = null;
    if (Pet.els && Pet.els.widget) {
      Pet.els.widget.setAttribute("data-dragging", "false");
    }
    if (!Pet.state || !dragged) {
      petApplyCorner();
      return;
    }
    Pet.state.pos = petCornerFromPoint(
      event ? event.clientX : 0,
      event ? event.clientY : 0,
    );
    petWriteState();
    Pet.lastInteraction = Date.now();
    petApplyCorner();
  }

  function petIsCorner(value) {
    return petCornerOrder.indexOf(value) !== -1;
  }

  function petCornerKey(corner) {
    if (corner === "bl") {
      return "petCornerBl";
    }
    if (corner === "tr") {
      return "petCornerTr";
    }
    if (corner === "tl") {
      return "petCornerTl";
    }
    return "petCornerBr";
  }

  function petMoveCorner(next) {
    if (!Pet.state || !petIsCorner(next) || Pet.state.pos === next) {
      return;
    }
    Pet.state.pos = next;
    petWriteState();
    petTouchInteraction();
    petApplyCorner();
    petSetStatus(
      t("petReactionMoved", {
        name: Pet.state.name,
        corner: t(petCornerKey(next)),
      }),
    );
  }

  function petOnHandleKeydown(event) {
    if (!event || !Pet.state) {
      return;
    }
    var key = event.key;
    var corner = petIsCorner(Pet.state.pos) ? Pet.state.pos : "br";
    var row = corner.charAt(0);
    var column = corner.charAt(1);
    var next = null;
    if (key === "ArrowLeft") {
      next = row + "l";
    } else if (key === "ArrowRight") {
      next = row + "r";
    } else if (key === "ArrowUp") {
      next = "t" + column;
    } else if (key === "ArrowDown") {
      next = "b" + column;
    } else {
      return;
    }
    if (typeof event.preventDefault === "function") {
      event.preventDefault();
    }
    petMoveCorner(next);
  }


  /* Exported for the other modules. */
  App.petAddTreats = petAddTreats;
  App.petApplyCorner = petApplyCorner;
  App.petBindAwareness = petBindAwareness;
  App.petBlip = petBlip;
  App.petBumpCombo = petBumpCombo;
  App.petCelebrateAchievement = petCelebrateAchievement;
  App.petCheckAchievements = petCheckAchievements;
  App.petClearTrackedTimeouts = petClearTrackedTimeouts;
  App.petHandleVisibility = petHandleVisibility;
  App.petOnDragStart = petOnDragStart;
  App.petOnHandleKeydown = petOnHandleKeydown;
  App.petPersistNow = petPersistNow;
  App.petRefreshIdleSleep = petRefreshIdleSleep;
  App.petRenderCombo = petRenderCombo;
  App.petStartTimer = petStartTimer;
  App.petStopEmote = petStopEmote;
  App.petStopTimer = petStopTimer;
  App.petTouchInteraction = petTouchInteraction;
  App.petTouchVisit = petTouchVisit;
  App.petTrackTimeout = petTrackTimeout;
  App.petUnlockedCount = petUnlockedCount;
})(window.CapitalConvert = window.CapitalConvert || {});
