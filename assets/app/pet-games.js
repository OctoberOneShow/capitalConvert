/* Pet mini-games - Treat Toss and Trick Trainer on top of the shared lifecycle timers. */
(function (App) {
  var Pet = App.Pet;
  /* Shared names from the other modules (see window.CapitalConvert). */
  function petAddTreats() { return App.petAddTreats.apply(null, arguments); }
  function petAddXp() { return App.petAddXp.apply(null, arguments); }
  function petBlip() { return App.petBlip.apply(null, arguments); }
  function petCommit() { return App.petCommit.apply(null, arguments); }
  function petCreate() { return App.petCreate.apply(null, arguments); }
  function petReact() { return App.petReact.apply(null, arguments); }
  var petReactionMs = App.petReactionMs;
  function petRender() { return App.petRender.apply(null, arguments); }
  var petSimonStepMs = App.petSimonStepMs;
  var petTossPeriodMs = App.petTossPeriodMs;
  var petTossRounds = App.petTossRounds;
  var petTossTickMs = App.petTossTickMs;
  var petTrickClass = App.petTrickClass;
  function petTrickKey() { return App.petTrickKey.apply(null, arguments); }
  var petTrickOrder = App.petTrickOrder;
  function petWriteState() { return App.petWriteState.apply(null, arguments); }
  var t = App.t;
  /* --- mini-game lifecycle (timers only live while a game is open) -- */

  function petMiniTrack(callback, delay) {
    var id = window.setTimeout(function () {
      var index = Pet.miniTimers.indexOf(id);
      if (index !== -1) {
        Pet.miniTimers.splice(index, 1);
      }
      callback();
    }, delay);
    Pet.miniTimers.push(id);
    return id;
  }

  function petMiniClearTimers() {
    Pet.miniTimers.forEach(function (id) {
      window.clearTimeout(id);
    });
    Pet.miniTimers = [];
  }

  function petMiniStop() {
    petMiniClearTimers();
    Pet.mini = null;
    if (Pet.els && Pet.els.gameHost) {
      while (Pet.els.gameHost.firstChild) {
        Pet.els.gameHost.removeChild(Pet.els.gameHost.firstChild);
      }
    }
    if (Pet.els && Pet.els.gameMenu) {
      Pet.els.gameMenu.hidden = false;
    }
    if (Pet.els && Pet.els.gameExit) {
      Pet.els.gameExit.hidden = true;
    }
  }

  function petMiniFinish(resultKey, vars, treats, xp) {
    if (!Pet.state) {
      return;
    }
    /* Baseline at game start, so per-round grants are part of the total. */
    var treatsAtStart =
      Pet.mini && typeof Pet.mini.treatsAtStart === "number"
        ? Pet.mini.treatsAtStart
        : Pet.state.treats;
    Pet.state.miniGamesFinished += 1;
    petAddTreats(treats);
    var gain = petAddXp(xp);
    petMiniClearTimers();
    Pet.mini = null;
    petBlip("win");
    petCommit({ gain: gain, status: "" });
    /* Announce exactly the treats that reached the balance in this game, once.
     * Per-round grants and level-up bonuses are already counted here, so the
     * result line can never diverge from what the player actually received. */
    var granted = Pet.state.treats - treatsAtStart;
    if (Pet.els && Pet.els.gameResult) {
      var merged = {};
      Object.keys(vars || {}).forEach(function (name) {
        merged[name] = vars[name];
      });
      merged.treats = granted;
      Pet.els.gameResult.textContent = t(resultKey, merged);
    }
  }

  /* --- mini-game: Treat Toss (timing) ------------------------------ */

  function petTossPhase(elapsed) {
    var phase = (elapsed % (petTossPeriodMs * 2)) / petTossPeriodMs;
    return phase <= 1 ? phase : 2 - phase;
  }

  function petTossHud() {
    if (!Pet.mini || Pet.mini.id !== "toss" || !Pet.mini.hud) {
      return;
    }
    Pet.mini.hud.textContent =
      t("petGameTossRound", { n: Pet.mini.round, total: petTossRounds }) +
      " · " +
      t("petGameTossScore", { n: Pet.mini.score });
  }

  function petTossTick() {
    if (!Pet.mini || Pet.mini.id !== "toss" || !Pet.mini.active) {
      return;
    }
    var pos = petTossPhase(Date.now() - Pet.mini.start);
    Pet.mini.marker.style.left = (pos * 100).toFixed(2) + "%";
    Pet.mini.marker.setAttribute("data-pos", pos.toFixed(3));
    petMiniTrack(petTossTick, petTossTickMs);
  }

  function petStartToss() {
    if (!Pet.state || !Pet.els) {
      return;
    }
    petMiniStop();
    Pet.mini = {
      id: "toss",
      round: 1,
      score: 0,
      treats: 0,
      treatsAtStart: Pet.state.treats,
      active: true,
      start: Date.now(),
      marker: null,
      hud: null,
      zone: null,
    };
    var wrap = petCreate("div", "pet-game pet-game-toss");
    wrap.setAttribute("role", "group");
    wrap.setAttribute("aria-label", t("petGameTossAria"));
    var hud = petCreate("p", "pet-game-hud");
    hud.setAttribute("id", "petGameHud");
    hud.setAttribute("role", "status");
    hud.setAttribute("aria-live", "polite");
    var track = petCreate("div", "pet-game-track");
    var zone = petCreate("span", "pet-game-zone");
    zone.setAttribute("aria-hidden", "true");
    var marker = petCreate("span", "pet-game-marker");
    marker.setAttribute("aria-hidden", "true");
    marker.setAttribute("data-pos", "0.5");
    track.appendChild(zone);
    track.appendChild(marker);
    var tossBtn = petCreate("button", "pet-action is-primary pet-toss-btn");
    tossBtn.type = "button";
    tossBtn.setAttribute("id", "petGameTossBtn");
    tossBtn.textContent = t("petGameTossBtn");
    wrap.appendChild(hud);
    wrap.appendChild(track);
    wrap.appendChild(tossBtn);
    Pet.els.gameHost.appendChild(wrap);
    Pet.els.gameMenu.hidden = true;
    Pet.els.gameExit.hidden = false;
    Pet.els.gameResult.textContent = t("petGameTossHint");
    Pet.mini.hud = hud;
    Pet.mini.marker = marker;
    Pet.mini.zone = zone;
    tossBtn.addEventListener("click", petTossStop);
    petTossHud();
    petTossTick();
    tossBtn.focus();
  }

  function petTossStop() {
    if (!Pet.mini || Pet.mini.id !== "toss" || !Pet.mini.active) {
      return;
    }
    var pos = petTossPhase(Date.now() - Pet.mini.start);
    var dist = Math.abs(pos - 0.5);
    var label = "petGameTossMiss";
    var points = 0;
    if (dist <= 0.06) {
      label = "petGameTossPerfect";
      points = 3;
      Pet.mini.treats += 1;
    } else if (dist <= 0.16) {
      label = "petGameTossGood";
      points = 2;
    } else if (dist <= 0.32) {
      label = "petGameTossOk";
      points = 1;
    }
    Pet.mini.active = false;
    Pet.mini.score += points;
    petMiniClearTimers();
    Pet.mini.marker.setAttribute("data-pos", pos.toFixed(3));
    Pet.mini.marker.setAttribute("data-hit", label);
    Pet.els.gameResult.textContent = t(label);
    petBlip(points > 0 ? "win" : "bad");
    if (Pet.mini.round >= petTossRounds) {
      petTossFinish();
      return;
    }
    Pet.mini.round += 1;
    petTossHud();
    petMiniTrack(petTossNextRound, petReactionMs);
  }

  function petTossNextRound() {
    if (!Pet.mini || Pet.mini.id !== "toss") {
      return;
    }
    Pet.mini.active = true;
    Pet.mini.start = Date.now();
    Pet.els.gameResult.textContent = t("petGameTossHint");
    petTossHud();
    petTossTick();
  }

  function petTossFinish() {
    if (!Pet.mini || Pet.mini.id !== "toss") {
      return;
    }
    var score = Pet.mini.score;
    var treats = Pet.mini.treats + Math.max(0, Math.floor(score / 4));
    petMiniFinish(
      "petGameTossResult",
      { n: score, treats: treats },
      treats,
      10 + score * 2,
    );
    petReact("cheer");
    if (Pet.els.gameExit) {
      Pet.els.gameExit.focus();
    }
  }

  /* --- mini-game: Trick Trainer (memory) --------------------------- */

  function petSimonHud() {
    if (!Pet.mini || Pet.mini.id !== "simon" || !Pet.mini.hud) {
      return;
    }
    Pet.mini.hud.textContent = t("petGameSimonRound", { n: Pet.mini.round });
  }

  function petStartSimon() {
    if (!Pet.state || !Pet.els) {
      return;
    }
    petMiniStop();
    Pet.mini = {
      id: "simon",
      sequence: [],
      round: 0,
      treats: 0,
      treatsAtStart: Pet.state.treats,
      watching: true,
      index: 0,
      host: null,
      hud: null,
      buttons: {},
    };
    var wrap = petCreate("div", "pet-game pet-game-simon");
    wrap.setAttribute("role", "group");
    wrap.setAttribute("aria-label", t("petGameSimonAria"));
    var hud = petCreate("p", "pet-game-hud");
    hud.setAttribute("id", "petGameHud");
    hud.setAttribute("role", "status");
    hud.setAttribute("aria-live", "polite");
    var seqWrap = petCreate("div", "pet-seq");
    var buttons = {};
    petTrickOrder.forEach(function (trick) {
      var btn = petCreate("button", "pet-action pet-seq-btn " + petTrickClass[trick]);
      btn.type = "button";
      btn.setAttribute("data-trick", trick);
      btn.textContent = t(petTrickKey(trick));
      btn.addEventListener("click", function () {
        petSimonInput(trick);
      });
      seqWrap.appendChild(btn);
      buttons[trick] = btn;
    });
    wrap.appendChild(hud);
    wrap.appendChild(seqWrap);
    Pet.els.gameHost.appendChild(wrap);
    Pet.els.gameMenu.hidden = true;
    Pet.els.gameExit.hidden = false;
    Pet.els.gameResult.textContent = t("petGameSimonHint");
    Pet.mini.host = wrap;
    Pet.mini.hud = hud;
    Pet.mini.buttons = buttons;
    petSimonGrow();
  }

  function petSimonGrow() {
    if (!Pet.mini || Pet.mini.id !== "simon") {
      return;
    }
    Pet.mini.round += 1;
    Pet.mini.sequence.push(
      petTrickOrder[Math.floor(Math.random() * petTrickOrder.length)],
    );
    Pet.mini.index = 0;
    Pet.mini.watching = true;
    Pet.mini.host.setAttribute("data-sequence", Pet.mini.sequence.join(","));
    Pet.mini.host.setAttribute("data-watching", "true");
    petSimonHud();
    petSimonPlay(0);
  }

  function petSimonPlay(index) {
    if (!Pet.mini || Pet.mini.id !== "simon") {
      return;
    }
    var keys = Object.keys(Pet.mini.buttons);
    if (index >= Pet.mini.sequence.length) {
      Pet.mini.watching = false;
      Pet.mini.host.setAttribute("data-watching", "false");
      keys.forEach(function (key) {
        Pet.mini.buttons[key].disabled = false;
      });
      Pet.mini.buttons[Pet.mini.sequence[0]].focus();
      Pet.els.gameResult.textContent = t("petGameSimonGo");
      return;
    }
    var trick = Pet.mini.sequence[index];
    var btn = Pet.mini.buttons[trick];
    keys.forEach(function (key) {
      Pet.mini.buttons[key].disabled = true;
      Pet.mini.buttons[key].classList.remove("is-active");
    });
    void btn.offsetWidth;
    btn.classList.add("is-active");
    petBlip("pet");
    petMiniTrack(function () {
      btn.classList.remove("is-active");
      petMiniTrack(function () {
        petSimonPlay(index + 1);
      }, 140);
    }, petSimonStepMs);
  }

  function petSimonInput(trick) {
    if (!Pet.mini || Pet.mini.id !== "simon" || Pet.mini.watching) {
      return;
    }
    if (trick !== Pet.mini.sequence[Pet.mini.index]) {
      petSimonFail();
      return;
    }
    Pet.mini.index += 1;
    var btn = Pet.mini.buttons[trick];
    if (btn) {
      btn.classList.add("is-active");
      petMiniTrack(function () {
        btn.classList.remove("is-active");
      }, 200);
    }
    petBlip("win");
    if (Pet.mini.index >= Pet.mini.sequence.length) {
      Pet.mini.treats += 1;
      petAddTreats(1);
      petAddXp(4);
      petWriteState();
      petRender();
      Pet.mini.watching = true;
      Pet.els.gameResult.textContent = t("petGameSimonRound", {
        n: Pet.mini.round + 1,
      });
      petMiniTrack(petSimonGrow, 700);
    }
  }

  function petSimonFail() {
    if (!Pet.mini || Pet.mini.id !== "simon") {
      return;
    }
    var round = Pet.mini.round;
    var treats = Pet.mini.treats;
    petBlip("bad");
    /* Each completed round already banked one treat, so the finish grants
     * nothing extra: one coherent per-round rule, no double count. */
    petMiniFinish(
      "petGameSimonResult",
      { n: round, treats: treats },
      0,
      4,
    );
    petReact("cheer");
    if (Pet.els.gameExit) {
      Pet.els.gameExit.focus();
    }
  }


  /* Exported for the other modules. */
  App.petMiniStop = petMiniStop;
  App.petStartSimon = petStartSimon;
  App.petStartToss = petStartToss;
})(window.CapitalConvert = window.CapitalConvert || {});
