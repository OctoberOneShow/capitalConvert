/* Pet companion - Care actions, adoption, reset and init glue. */
(function (App) {
  var Pet = App.Pet;
  /* Shared names from the other modules (see window.CapitalConvert). */
  var applyI18nDom = App.applyI18nDom;
  function petAccessoryKey() { return App.petAccessoryKey.apply(null, arguments); }
  function petAccessoryUnlocked() { return App.petAccessoryUnlocked.apply(null, arguments); }
  function petAddTreats() { return App.petAddTreats.apply(null, arguments); }
  function petApplyCorner() { return App.petApplyCorner.apply(null, arguments); }
  function petApplyDecay() { return App.petApplyDecay.apply(null, arguments); }
  function petApplyVisitReward() { return App.petApplyVisitReward.apply(null, arguments); }
  function petBindAwareness() { return App.petBindAwareness.apply(null, arguments); }
  function petBlip() { return App.petBlip.apply(null, arguments); }
  function petBuildDom() { return App.petBuildDom.apply(null, arguments); }
  function petBumpCombo() { return App.petBumpCombo.apply(null, arguments); }
  function petCelebrateAchievement() { return App.petCelebrateAchievement.apply(null, arguments); }
  function petCheckAchievements() { return App.petCheckAchievements.apply(null, arguments); }
  function petClamp() { return App.petClamp.apply(null, arguments); }
  function petClearTrackedTimeouts() { return App.petClearTrackedTimeouts.apply(null, arguments); }
  var petCooldownMs = App.petCooldownMs;
  function petEvaluateAttention() { return App.petEvaluateAttention.apply(null, arguments); }
  function petFormatAway() { return App.petFormatAway.apply(null, arguments); }
  function petHueUnlocked() { return App.petHueUnlocked.apply(null, arguments); }
  function petIsSpecies() { return App.petIsSpecies.apply(null, arguments); }
  function petLearnedTrick() { return App.petLearnedTrick.apply(null, arguments); }
  function petLevelValue() { return App.petLevelValue.apply(null, arguments); }
  function petLocalDay() { return App.petLocalDay.apply(null, arguments); }
  function petMiniStop() { return App.petMiniStop.apply(null, arguments); }
  function petNextTrick() { return App.petNextTrick.apply(null, arguments); }
  function petReact() { return App.petReact.apply(null, arguments); }
  function petReadState() { return App.petReadState.apply(null, arguments); }
  function petRefreshIdleSleep() { return App.petRefreshIdleSleep.apply(null, arguments); }
  function petRemoveState() { return App.petRemoveState.apply(null, arguments); }
  function petRender() { return App.petRender.apply(null, arguments); }
  function petRenderCombo() { return App.petRenderCombo.apply(null, arguments); }
  function petRenderRepair() { return App.petRenderRepair.apply(null, arguments); }
  var petRepairCost = App.petRepairCost;
  function petSanitizeName() { return App.petSanitizeName.apply(null, arguments); }
  function petSetStatus() { return App.petSetStatus.apply(null, arguments); }
  function petSetView() { return App.petSetView.apply(null, arguments); }
  function petSpeciesKey() { return App.petSpeciesKey.apply(null, arguments); }
  var petSpeciesOrder = App.petSpeciesOrder;
  function petStageIndex() { return App.petStageIndex.apply(null, arguments); }
  function petStageKey() { return App.petStageKey.apply(null, arguments); }
  function petStageValue() { return App.petStageValue.apply(null, arguments); }
  var petStartStats = App.petStartStats;
  var petStartTreats = App.petStartTreats;
  function petStopEmote() { return App.petStopEmote.apply(null, arguments); }
  function petStopTimer() { return App.petStopTimer.apply(null, arguments); }
  function petSyncVisibility() { return App.petSyncVisibility.apply(null, arguments); }
  function petTalkLine() { return App.petTalkLine.apply(null, arguments); }
  function petToNumber() { return App.petToNumber.apply(null, arguments); }
  function petTouchInteraction() { return App.petTouchInteraction.apply(null, arguments); }
  function petTouchVisit() { return App.petTouchVisit.apply(null, arguments); }
  function petTrickKey() { return App.petTrickKey.apply(null, arguments); }
  var petTrickLevel = App.petTrickLevel;
  function petWelcomeBack() { return App.petWelcomeBack.apply(null, arguments); }
  function petWriteState() { return App.petWriteState.apply(null, arguments); }
  var t = App.t;
  function petAddXp(amount) {
    var before = petLevelValue();
    var beforeStage = petStageIndex(petStageValue(before));
    Pet.state.xp = Math.max(0, Pet.state.xp + amount);
    var after = petLevelValue();
    return {
      levels: Math.max(0, after - before),
      stageChanged: petStageIndex(petStageValue(after)) > beforeStage,
    };
  }

  function petCommit(result) {
    if (!Pet.state) {
      return;
    }
    var gain = result && result.gain
      ? result.gain
      : { levels: 0, stageChanged: false };
    if (gain.levels > 0) {
      petAddTreats(gain.levels);
    }
    var unlocked = petCheckAchievements();
    petWriteState();
    petRender();
    if (unlocked.length) {
      petCelebrateAchievement(unlocked[0]);
    }
    if (gain.stageChanged) {
      petSetStatus(
        t("petReactionStage", {
          name: Pet.state.name,
          stage: t(petStageKey(petStageValue())),
        }),
      );
      return;
    }
    if (gain.levels > 0) {
      petSetStatus(
        t("petReactionLevel", { name: Pet.state.name, n: petLevelValue() }),
      );
      return;
    }
    petSetStatus(result ? result.status : "");
  }

  function petOnPetClick() {
    if (!Pet.state) {
      return;
    }
    var now = Date.now();
    if (now < Pet.cooldownUntil) {
      petSetStatus(t("petReactionCooldown", { name: Pet.state.name }));
      return;
    }
    Pet.cooldownUntil = now + petCooldownMs;
    petTouchInteraction();
    /* Gentle two-resource tension: petting costs a little energy and the
     * happiness it gives diminishes across a fast combo, so mashing is not
     * strictly optimal - but the first few pets stay as generous as before. */
    var gainHappiness = Pet.combo <= 2 ? 6 : Math.max(2, 6 - (Pet.combo - 2));
    Pet.state.happiness = petClamp(Pet.state.happiness + gainHappiness, 0, 100);
    Pet.state.energy = petClamp(Pet.state.energy - (Pet.combo >= 4 ? 2 : 1), 0, 100);
    var gain = petAddXp(2);
    var combo = petBumpCombo();
    petReact("happy");
    petBlip("pet");
    petCommit({
      gain: gain,
      status: combo >= 2
        ? t("petReactionCombo", { n: combo })
        : t("petReactionPet", { name: Pet.state.name }),
    });
  }

  function petOnFeed() {
    if (!Pet.state) {
      return;
    }
    if (Pet.state.hunger <= 4) {
      petSetStatus(t("petReactionFull", { name: Pet.state.name }));
      return;
    }
    petTouchInteraction();
    Pet.state.hunger = petClamp(Pet.state.hunger - 30, 0, 100);
    Pet.state.happiness = petClamp(Pet.state.happiness + 3, 0, 100);
    Pet.state.totalFeeds += 1;
    var gain = petAddXp(4);
    petReact("fed");
    petBlip("pet");
    petCommit({
      gain: gain,
      status: t("petReactionFeed", { name: Pet.state.name }),
    });
  }

  function petOnPlay() {
    if (!Pet.state) {
      return;
    }
    if (Pet.state.energy < 15) {
      petSetStatus(t("petReactionTired", { name: Pet.state.name }));
      return;
    }
    petTouchInteraction();
    Pet.state.happiness = petClamp(Pet.state.happiness + 12, 0, 100);
    Pet.state.hunger = petClamp(Pet.state.hunger + 8, 0, 100);
    Pet.state.energy = petClamp(Pet.state.energy - 10, 0, 100);
    var gain = petAddXp(6);
    petReact("playing");
    petBlip("pet");
    petCommit({
      gain: gain,
      status: t("petReactionPlay", { name: Pet.state.name }),
    });
  }

  function petOnRest() {
    if (!Pet.state) {
      return;
    }
    if (Pet.state.energy >= 98) {
      petSetStatus(t("petReactionRested", { name: Pet.state.name }));
      return;
    }
    petTouchInteraction();
    Pet.state.energy = petClamp(Pet.state.energy + 45, 0, 100);
    Pet.state.happiness = petClamp(Pet.state.happiness + 4, 0, 100);
    Pet.asleep = false;
    var gain = petAddXp(3);
    petReact("resting");
    petCommit({
      gain: gain,
      status: t("petReactionRest", { name: Pet.state.name }),
    });
  }

  function petOnTreat() {
    if (!Pet.state) {
      return;
    }
    if (Pet.state.treats <= 0) {
      petSetStatus(t("petReactionNoTreat", { name: Pet.state.name }));
      return;
    }
    petTouchInteraction();
    petAddTreats(-1);
    Pet.state.happiness = petClamp(Pet.state.happiness + 14, 0, 100);
    Pet.state.hunger = petClamp(Pet.state.hunger - 12, 0, 100);
    var gain = petAddXp(8);
    petReact("treat");
    petBlip("win");
    petCommit({
      gain: gain,
      status: t("petReactionTreat", { name: Pet.state.name }),
    });
  }

  function petOnBrush() {
    if (!Pet.state) {
      return;
    }
    petTouchInteraction();
    Pet.state.happiness = petClamp(Pet.state.happiness + 7, 0, 100);
    Pet.state.totalBrush += 1;
    var gain = petAddXp(5);
    petReact("brush");
    petBlip("pet");
    petCommit({
      gain: gain,
      status: t("petReactionBrush", { name: Pet.state.name }),
    });
  }

  function petOnTalk() {
    if (!Pet.state) {
      return;
    }
    petTouchInteraction();
    var gain = petAddXp(1);
    petCommit({ gain: gain, status: petTalkLine() });
  }

  function petOnTeachTrick() {
    if (!Pet.state) {
      return;
    }
    var next = petNextTrick();
    if (!next) {
      petSetStatus(t("petReactionTrickNone", { name: Pet.state.name }));
      return;
    }
    var unlockLevel = petTrickLevel[next] || 1;
    if (petLevelValue() < unlockLevel) {
      petSetStatus(
        t("petReactionTrickLocked", { trick: t(petTrickKey(next)), n: unlockLevel }),
      );
      return;
    }
    petTouchInteraction();
    Pet.state.tricks.push(next);
    Pet.state.totalTricks += 1;
    var gain = petAddXp(10);
    petReact("trick");
    petBlip("win");
    petCommit({
      gain: gain,
      status: t("petReactionTrickTeach", {
        name: Pet.state.name,
        trick: t(petTrickKey(next)),
      }),
    });
  }

  function petOnPerformTrick(trick) {
    if (!Pet.state) {
      return;
    }
    if (!petLearnedTrick(trick)) {
      petSetStatus(t("petReactionTrickUnknown", { name: Pet.state.name }));
      return;
    }
    petTouchInteraction();
    Pet.state.totalTricks += 1;
    var gain = petAddXp(2);
    petReact("trick");
    petBlip("pet");
    petCommit({
      gain: gain,
      status: t("petReactionTrickPerform", {
        name: Pet.state.name,
        trick: t(petTrickKey(trick)),
      }),
    });
  }

  function petOnToggleSound() {
    if (!Pet.state) {
      return;
    }
    Pet.state.sound = Pet.state.sound !== true;
    petWriteState();
    petRender();
    petSetStatus(t(Pet.state.sound ? "petReactionUnmuted" : "petReactionMuted"));
  }

  function petSelectAccessory(accessory) {
    if (!Pet.state || !petAccessoryUnlocked(accessory)) {
      return;
    }
    petTouchInteraction();
    Pet.state.accessory = accessory;
    var gain = petAddXp(0);
    petCommit({
      gain: gain,
      status: accessory === "none"
        ? t("petReactionAcc", { name: Pet.state.name, acc: t(petAccessoryKey("none")) })
        : t("petReactionAcc", {
            name: Pet.state.name,
            acc: t(petAccessoryKey(accessory)),
          }),
    });
  }

  function petSelectHue(hue) {
    if (!Pet.state || !petHueUnlocked(hue)) {
      return;
    }
    petTouchInteraction();
    Pet.state.hue = hue;
    var gain = petAddXp(0);
    petCommit({ gain: gain, status: t("petReactionHue", { name: Pet.state.name }) });
  }

  /* --- streak repair (one tap, or let it reset) -------------------- */

  function petOnRepair() {
    if (!Pet.state || Pet.state.repairStreak <= 0) {
      return;
    }
    if (Pet.state.treats < petRepairCost) {
      petSetStatus(t("petRepairPoor"));
      petRenderRepair();
      return;
    }
    petTouchInteraction();
    petAddTreats(-petRepairCost);
    Pet.state.streak = Pet.state.repairStreak + 1;
    Pet.state.repairStreak = 0;
    Pet.state.daysVisited += 1;
    Pet.state.lastDay = petLocalDay(Date.now());
    var result = petApplyVisitReward();
    var gain = petAddXp(2);
    petCommit({
      gain: gain,
      status: result.unlock
        ? t("petReactionUnlockMedal", { name: Pet.state.name })
        : t("petReactionStreakRepaired", {
            n: Pet.state.streak,
            treats: result.treats,
          }),
    });
  }

  function petOnRepairDecline() {
    if (!Pet.state || Pet.state.repairStreak <= 0) {
      return;
    }
    petTouchInteraction();
    Pet.state.repairStreak = 0;
    Pet.state.streak = 1;
    Pet.state.daysVisited += 1;
    Pet.state.lastDay = petLocalDay(Date.now());
    var result = petApplyVisitReward();
    var gain = petAddXp(0);
    petCommit({
      gain: gain,
      status: t("petReactionStreakReset", { treats: result.treats }),
    });
  }

  function petOnKeydown(event) {
    if (!event || event.key !== "Escape") {
      return;
    }
    if (Pet.mini) {
      if (typeof event.preventDefault === "function") {
        event.preventDefault();
      }
      petMiniStop();
      petSetView("games");
      if (Pet.els.tossStart) {
        Pet.els.tossStart.focus();
      }
      return;
    }
    if (!Pet.state || Pet.state.hidden === true) {
      return;
    }
    if (typeof event.preventDefault === "function") {
      event.preventDefault();
    }
    petOnHide();
  }

  /* --- game awareness (called by the site's games, never the reverse) */

  function petNotifyGame(isBest) {
    if (!Pet.state || !Pet.els || Pet.els.widget.hidden) {
      return;
    }
    Pet.lastInteraction = Date.now();
    Pet.asleep = false;
    petAddTreats(isBest ? 2 : 1);
    var gain = petAddXp(isBest ? 6 : 3);
    petReact("cheer");
    petBlip(isBest ? "win" : "pet");
    petCommit({
      gain: gain,
      status: isBest
        ? t("petReactionCheerBest", { name: Pet.state.name })
        : t("petReactionCheer", { name: Pet.state.name }),
    });
  }


  function petToggleRename(open) {
    Pet.renameOpen = open;
    Pet.els.renameForm.hidden = !open;
    if (open && Pet.state) {
      Pet.els.renameInput.value = Pet.state.name;
      Pet.els.renameInput.focus();
      if (typeof Pet.els.renameInput.select === "function") {
        Pet.els.renameInput.select();
      }
      return;
    }
    Pet.els.renameInput.value = "";
  }

  function petOnRenameSubmit() {
    if (!Pet.state) {
      return;
    }
    var next = petSanitizeName(Pet.els.renameInput.value) || t("petDefaultName");
    Pet.state.name = next;
    var gain = petAddXp(2);
    petToggleRename(false);
    petCommit({
      gain: gain,
      status: t("petReactionRenamed", { name: next }),
    });
  }

  function petOnSwitchSpecies() {
    if (!Pet.state) {
      return;
    }
    var index = petSpeciesOrder.indexOf(Pet.state.species);
    var next = petSpeciesOrder[(index + 1) % petSpeciesOrder.length];
    Pet.state.species = next;
    var gain = petAddXp(2);
    petCommit({
      gain: gain,
      status: t("petReactionSpecies", {
        name: Pet.state.name,
        species: t(petSpeciesKey(next)),
      }),
    });
  }

  function petDisarmReset() {
    Pet.resetArmed = false;
    if (Pet.resetTimer !== null) {
      window.clearTimeout(Pet.resetTimer);
      Pet.resetTimer = null;
    }
    Pet.els.actions.Reset.textContent = t("petBtnReset");
    Pet.els.actions.Reset.classList.remove("is-armed");
  }

  function petOnResetClick() {
    if (!Pet.resetArmed) {
      Pet.resetArmed = true;
      Pet.els.actions.Reset.textContent = t("petResetArmed");
      Pet.els.actions.Reset.classList.add("is-armed");
      Pet.resetTimer = window.setTimeout(petDisarmReset, 4000);
      return;
    }
    petDisarmReset();
    Pet.state = null;
    Pet.renderedSpecies = "";
    Pet.collapsed = false;
    Pet.renameOpen = false;
    Pet.combo = 0;
    Pet.asleep = false;
    Pet.selectedSpecies = petSpeciesOrder[0];
    petMiniStop();
    petStopTimer();
    petClearTrackedTimeouts();
    petStopEmote();
    petRemoveState();
    Pet.els.renameForm.hidden = true;
    Pet.els.adoptName.value = t("petDefaultName");
    petSelectSpeciesInput(Pet.selectedSpecies);
    petSetView("main");
    petRenderCombo();
    petSyncVisibility();
    petSetStatus(t("petReactionReset"));
  }

  function petOnHide() {
    if (!Pet.state) {
      return;
    }
    Pet.state.hidden = true;
    petWriteState();
    petToggleRename(false);
    petMiniStop();
    petSetView("main");
    petSyncVisibility();
    Pet.els.restore.focus();
  }

  function petSelectSpeciesInput(species) {
    Pet.els.speciesInputs.forEach(function (input) {
      input.checked = input.value === species;
    });
  }

  function petOnAdoptConfirm() {
    var name = petSanitizeName(Pet.els.adoptName.value) || t("petDefaultName");
    var species = petIsSpecies(Pet.selectedSpecies)
      ? Pet.selectedSpecies
      : petSpeciesOrder[0];
    if (Pet.els.speciesInputs.length) {
      Pet.els.speciesInputs.forEach(function (input) {
        if (input.checked) {
          species = input.value;
        }
      });
    }
    Pet.state = {
      species: species,
      name: name,
      happiness: petStartStats.happiness,
      hunger: petStartStats.hunger,
      energy: petStartStats.energy,
      xp: 0,
      treats: petStartTreats,
      tricks: [],
      achievements: {},
      accessory: "none",
      hue: "default",
      daysVisited: 1,
      streak: 1,
      lastDay: petLocalDay(Date.now()),
      totalFeeds: 0,
      totalBrush: 0,
      totalTricks: 0,
      bestCombo: 0,
      miniGamesFinished: 0,
      pos: "br",
      sound: false,
      lastSeen: Date.now(),
      hidden: false,
      careMistakes: 0,
      careEpisodes: {},
      streakUnlocks: {},
      repairStreak: 0,
    };
    Pet.selectedSpecies = species;
    Pet.adoptionDismissed = false;
    Pet.collapsed = false;
    Pet.combo = 0;
    Pet.asleep = false;
    Pet.lastInteraction = Date.now();
    Pet.emoteAt = Date.now();
    Pet.renderedSpecies = "";
    petBindAwareness();
    petApplyCorner();
    var unlocked = petCheckAchievements();
    petWriteState();
    petRender();
    petSyncVisibility();
    petSetStatus(t("petReactionAdopted", { name: name }));
    if (unlocked.length) {
      petCelebrateAchievement(unlocked[0]);
    }
  }

  function initPet() {
    if (!document.body) {
      return;
    }

    var saved = petReadState();
    var awayMs = 0;
    var awayHours = 0;
    var visit = { treats: 0, unlock: false, deferred: false };
    if (saved) {
      awayMs = Math.max(0, Date.now() - petToNumber(saved.lastSeen, Date.now()));
      Pet.state = saved;
      Pet.selectedSpecies = saved.species;
      awayHours = petApplyDecay(Date.now());
      visit = petTouchVisit(Date.now());
      petEvaluateAttention(Date.now());
      petCheckAchievements();
      petWriteState();
    }

    petBuildDom();
    applyI18nDom();
    petBindAwareness();
    petApplyCorner();
    Pet.lastInteraction = Date.now();
    Pet.emoteAt = Date.now();

    if (Pet.state) {
      var welcome = petWelcomeBack(awayMs);
      if (welcome) {
        petAddTreats(welcome.treats);
        petCheckAchievements();
        petWriteState();
      }
      petRender();
      petSyncVisibility();
      petRefreshIdleSleep(Date.now());
      if (visit.deferred) {
        petSetStatus(
          t("petRepairBody", { n: Pet.state.repairStreak, cost: petRepairCost }),
        );
      } else if (visit.unlock) {
        petSetStatus(t("petReactionUnlockMedal", { name: Pet.state.name }));
      } else if (visit.treats > 0) {
        petSetStatus(
          t("petReactionStreak", {
            name: Pet.state.name,
            n: Pet.state.streak,
            treats: visit.treats,
          }),
        );
      } else if (welcome) {
        petSetStatus(welcome.text);
      } else if (awayHours >= 1 / 60) {
        petSetStatus(
          t("petAway", { name: Pet.state.name, n: petFormatAway(awayHours) }),
        );
      } else {
        petSetStatus(petTalkLine());
      }
      return;
    }

    petSelectSpeciesInput(Pet.selectedSpecies);
    Pet.els.adoptName.value = t("petDefaultName");
    petSyncVisibility();
  }

  /* Exported for the other modules. */
  App.initPet = initPet;
  App.petAddXp = petAddXp;
  App.petCommit = petCommit;
  App.petNotifyGame = petNotifyGame;
  App.petOnAdoptConfirm = petOnAdoptConfirm;
  App.petOnBrush = petOnBrush;
  App.petOnFeed = petOnFeed;
  App.petOnHide = petOnHide;
  App.petOnKeydown = petOnKeydown;
  App.petOnPerformTrick = petOnPerformTrick;
  App.petOnPetClick = petOnPetClick;
  App.petOnPlay = petOnPlay;
  App.petOnRenameSubmit = petOnRenameSubmit;
  App.petOnRepair = petOnRepair;
  App.petOnRepairDecline = petOnRepairDecline;
  App.petOnResetClick = petOnResetClick;
  App.petOnRest = petOnRest;
  App.petOnSwitchSpecies = petOnSwitchSpecies;
  App.petOnTalk = petOnTalk;
  App.petOnTeachTrick = petOnTeachTrick;
  App.petOnToggleSound = petOnToggleSound;
  App.petOnTreat = petOnTreat;
  App.petSelectAccessory = petSelectAccessory;
  App.petSelectHue = petSelectHue;
  App.petToggleRename = petToggleRename;
})(window.CapitalConvert = window.CapitalConvert || {});
