/* Pet render - Status, stats, badges and particle rendering. */
(function (App) {
  var Pet = App.Pet;
  /* Shared names from the other modules (see window.CapitalConvert). */
  var isMotionCalm = App.isMotionCalm;
  var isMotionOff = App.isMotionOff;
  function petAccessoryKey() { return App.petAccessoryKey.apply(null, arguments); }
  var petAccessoryLevel = App.petAccessoryLevel;
  var petAccessoryOrder = App.petAccessoryOrder;
  function petAccessoryUnlocked() { return App.petAccessoryUnlocked.apply(null, arguments); }
  var petAchievements = App.petAchievements;
  function petAttentionNeeds() { return App.petAttentionNeeds.apply(null, arguments); }
  function petAttentionStatusText() { return App.petAttentionStatusText.apply(null, arguments); }
  function petClearTrackedTimeouts() { return App.petClearTrackedTimeouts.apply(null, arguments); }
  function petCreate() { return App.petCreate.apply(null, arguments); }
  function petCreateArt() { return App.petCreateArt.apply(null, arguments); }
  var petExclusiveAccessories = App.petExclusiveAccessories;
  var petFxMs = App.petFxMs;
  function petHueKey() { return App.petHueKey.apply(null, arguments); }
  var petHueLevel = App.petHueLevel;
  var petHueOrder = App.petHueOrder;
  function petHueUnlocked() { return App.petHueUnlocked.apply(null, arguments); }
  function petHungerWordKey() { return App.petHungerWordKey.apply(null, arguments); }
  function petLevelProgress() { return App.petLevelProgress.apply(null, arguments); }
  function petLevelValue() { return App.petLevelValue.apply(null, arguments); }
  function petMiniStop() { return App.petMiniStop.apply(null, arguments); }
  function petMood() { return App.petMood.apply(null, arguments); }
  function petMoodKey() { return App.petMoodKey.apply(null, arguments); }
  function petMoodStatusKey() { return App.petMoodStatusKey.apply(null, arguments); }
  function petMoodWordKey() { return App.petMoodWordKey.apply(null, arguments); }
  function petNextTrick() { return App.petNextTrick.apply(null, arguments); }
  function petOnPerformTrick() { return App.petOnPerformTrick.apply(null, arguments); }
  var petParticleShapes = App.petParticleShapes;
  var petReactionMs = App.petReactionMs;
  function petRenderCombo() { return App.petRenderCombo.apply(null, arguments); }
  var petRepairCost = App.petRepairCost;
  function petSeason() { return App.petSeason.apply(null, arguments); }
  function petSelectAccessory() { return App.petSelectAccessory.apply(null, arguments); }
  function petSelectHue() { return App.petSelectHue.apply(null, arguments); }
  function petStageKey() { return App.petStageKey.apply(null, arguments); }
  function petStageValue() { return App.petStageValue.apply(null, arguments); }
  function petStartTimer() { return App.petStartTimer.apply(null, arguments); }
  var petStatusRevertMs = App.petStatusRevertMs;
  function petStopEmote() { return App.petStopEmote.apply(null, arguments); }
  function petStopTimer() { return App.petStopTimer.apply(null, arguments); }
  function petSvg() { return App.petSvg.apply(null, arguments); }
  function petTimeOfDay() { return App.petTimeOfDay.apply(null, arguments); }
  function petTrackTimeout() { return App.petTrackTimeout.apply(null, arguments); }
  var petTrickClass = App.petTrickClass;
  function petTrickKey() { return App.petTrickKey.apply(null, arguments); }
  var petTrickLevel = App.petTrickLevel;
  function petUnlockedCount() { return App.petUnlockedCount.apply(null, arguments); }
  var t = App.t;
  /* --- rendering --------------------------------------------------- */

  function petRenderStatus() {
    if (!Pet.els) {
      return;
    }
    var text = Pet.statusText;
    if (!text && Pet.state) {
      text = petAttentionStatusText() || t(petMoodStatusKey(petMood()), {
        name: Pet.state.name,
      });
    }
    Pet.els.status.textContent = text || "";
    Pet.els.adoptStatus.textContent = Pet.statusText || "";
  }

  function petSetStatus(text) {
    if (!Pet.els) {
      return;
    }
    Pet.statusText = text || "";
    if (Pet.statusTimer !== null) {
      window.clearTimeout(Pet.statusTimer);
      Pet.statusTimer = null;
    }
    if (Pet.statusText) {
      Pet.statusTimer = window.setTimeout(function () {
        Pet.statusTimer = null;
        Pet.statusText = "";
        petRenderStatus();
      }, petStatusRevertMs);
    }
    petRenderStatus();
  }

  function petSyncArt() {
    if (!Pet.els || !Pet.state || Pet.renderedSpecies === Pet.state.species) {
      return;
    }
    Pet.renderedSpecies = Pet.state.species;
    while (Pet.els.art.firstChild) {
      Pet.els.art.removeChild(Pet.els.art.firstChild);
    }
    Pet.els.art.appendChild(petCreateArt(Pet.state.species, "pet-svg pet-idle"));
  }

  function petRender() {
    if (!Pet.els) {
      return;
    }
    if (!Pet.state) {
      petRenderStatus();
      return;
    }
    var mood = petMood();
    Pet.els.widget.setAttribute("data-mood", mood);
    Pet.els.widget.setAttribute("data-species", Pet.state.species);
    petSyncArt();

    var statKeys = ["happiness", "hunger", "energy"];
    statKeys.forEach(function (key) {
      var rounded = Math.round(Pet.state[key]);
      Pet.els.bars[key].style.width = rounded + "%";
      Pet.els.bars[key].setAttribute("data-value", String(rounded));
      Pet.els.statValues[key].textContent = String(rounded);
    });

    var level = petLevelValue();
    var progress = petLevelProgress();
    Pet.els.level.textContent = t("petLevel", { n: level });
    Pet.els.xpText.textContent = t("petXp", { n: Pet.state.xp });
    Pet.els.xpFill.style.width = progress.percent + "%";
    Pet.els.widget.setAttribute("data-stage", petStageValue(level));
    Pet.els.widget.setAttribute("data-acc", Pet.state.accessory);
    Pet.els.widget.setAttribute("data-hue", Pet.state.hue);
    Pet.els.widget.setAttribute("data-asleep", Pet.asleep ? "true" : "false");
    Pet.els.widget.setAttribute("data-night", petTimeOfDay() === "night" ? "true" : "false");
    Pet.els.widget.setAttribute("data-season", petSeason());
    var attention = petAttentionNeeds();
    if (attention.length) {
      Pet.els.widget.setAttribute("data-attention", attention.join(" "));
    } else {
      Pet.els.widget.removeAttribute("data-attention");
    }
    if (Pet.els.attention) {
      Pet.els.attention.textContent = t("petAttentionLabel");
      Pet.els.attention.hidden = attention.length === 0;
    }
    Pet.els.treatsValue.textContent = String(Pet.state.treats);
    Pet.els.treatsLabel.textContent = t("petTreatsLabel");
    Pet.els.treatsValue.setAttribute(
      "aria-label",
      t("petTreatsLabel") + " " + Pet.state.treats,
    );
    petRenderCombo();
    petRenderSubviewData();
    petRenderRepair();
    Pet.els.button.setAttribute(
      "aria-label",
      t("petButtonAria", {
        name: Pet.state.name,
        mood: t(petMoodKey(mood)),
      }),
    );
    Pet.els.button.setAttribute("title", t("petTapHint", { name: Pet.state.name }));
    Pet.els.renameInput.setAttribute("aria-label", t("petNameLabel"));
    petRenderStatus();
  }

  function petRenderRepair() {
    if (!Pet.els || !Pet.els.repair || !Pet.state) {
      return;
    }
    var pending = Pet.state.repairStreak > 0;
    Pet.els.repair.hidden = !pending;
    if (!pending) {
      return;
    }
    Pet.els.repairText.textContent = t("petRepairBody", {
      n: Pet.state.repairStreak,
      cost: petRepairCost,
    });
    Pet.els.repairBtn.textContent = t("petBtnRepair", { cost: petRepairCost });
    Pet.els.repairDecline.textContent = t("petBtnRepairDecline");
  }

  function petRenderSubviewData() {
    if (!Pet.els || !Pet.state) {
      return;
    }
    var level = petLevelValue();
    var stage = petStageValue(level);
    var values = Pet.els.fieldValues;
    values.petStatLevelValue.textContent = String(level);
    values.petStatStageValue.textContent = t(petStageKey(stage));
    values.petStatXpValue.textContent = String(Pet.state.xp);
    values.petStatTreatsValue.textContent = String(Pet.state.treats);
    values.petStatDaysValue.textContent = String(Pet.state.daysVisited);
    values.petStatStreakValue.textContent = String(Pet.state.streak);
    values.petStatTricksValue.textContent = String(Pet.state.tricks.length);
    values.petStatComboValue.textContent = String(Pet.state.bestCombo);
    values.petStatMoodValue.textContent = t(petMoodWordKey());
    values.petStatHungerValue.textContent = t(petHungerWordKey());
    values.petStatCareMistakesValue.textContent = String(Pet.state.careMistakes);
    Pet.els.achCount.textContent = t("petAchievementsCount", {
      n: petUnlockedCount(),
      total: petAchievements.length,
    });
    petRenderBadges();
    petRenderAccessories();
    petRenderTricks();
  }

  function petCreateBadgeElement(definition) {
    var unlocked = !!Pet.state.achievements[definition.id];
    var badge = petCreate("span", "pet-badge" + (unlocked ? "" : " is-locked"));
    badge.setAttribute("role", "listitem");
    var icon = petSvg("svg", {
      viewBox: "0 0 24 24",
      class: "pet-badge-icon",
      "aria-hidden": "true",
      focusable: "false",
    });
    icon.appendChild(petSvg("path", { d: definition.icon }));
    var label = petCreate("span", "pet-badge-label");
    label.textContent = t(definition.titleKey);
    badge.setAttribute("title", t(definition.titleKey) + " - " + t(definition.descKey));
    badge.setAttribute("aria-label", t(definition.titleKey) + (unlocked ? "" : " " + t(definition.descKey)));
    badge.appendChild(icon);
    badge.appendChild(label);
    return badge;
  }

  function petRenderBadges() {
    if (!Pet.els || !Pet.els.badges || !Pet.state) {
      return;
    }
    var host = Pet.els.badges;
    while (host.firstChild) {
      host.removeChild(host.firstChild);
    }
    petAchievements.forEach(function (definition) {
      host.appendChild(petCreateBadgeElement(definition));
    });
  }

  function petRenderAccessories() {
    if (!Pet.els || !Pet.state) {
      return;
    }
    var level = petLevelValue();
    var accGrid = Pet.els.accGrid;
    while (accGrid.firstChild) {
      accGrid.removeChild(accGrid.firstChild);
    }
    petAccessoryOrder.forEach(function (accessory) {
      var unlocked = petAccessoryUnlocked(accessory, level);
      var option = petCreate("button", "pet-acc-option");
      option.type = "button";
      option.setAttribute("data-acc", accessory);
      option.setAttribute("aria-pressed", Pet.state.accessory === accessory ? "true" : "false");
      if (Pet.state.accessory === accessory) {
        option.classList.add("is-selected");
      }
      var label = t(petAccessoryKey(accessory));
      var lockedSuffix = petExclusiveAccessories[accessory]
        ? t("petLockedExclusive")
        : t("petLockedAtLevel", { n: petAccessoryLevel[accessory] });
      option.textContent = unlocked ? label : label + " " + lockedSuffix;
      option.disabled = !unlocked;
      option.addEventListener("click", function () {
        petSelectAccessory(accessory);
      });
      accGrid.appendChild(option);
    });

    var hueGrid = Pet.els.hueGrid;
    while (hueGrid.firstChild) {
      hueGrid.removeChild(hueGrid.firstChild);
    }
    petHueOrder.forEach(function (hue) {
      var unlocked = petHueUnlocked(hue, level);
      var option = petCreate("button", "pet-acc-option");
      option.type = "button";
      option.setAttribute("data-hue", hue);
      option.setAttribute("aria-pressed", Pet.state.hue === hue ? "true" : "false");
      if (Pet.state.hue === hue) {
        option.classList.add("is-selected");
      }
      var label = t(petHueKey(hue));
      option.textContent = unlocked ? label : label + " " + t("petLockedAtLevel", { n: petHueLevel[hue] });
      option.disabled = !unlocked;
      option.addEventListener("click", function () {
        petSelectHue(hue);
      });
      hueGrid.appendChild(option);
    });
  }

  function petRenderTricks() {
    if (!Pet.els || !Pet.state) {
      return;
    }
    var level = petLevelValue();
    var next = petNextTrick();
    if (!next) {
      Pet.els.trickTeach.hidden = true;
    } else {
      Pet.els.trickTeach.hidden = false;
      var unlockLevel = petTrickLevel[next] || 1;
      if (level >= unlockLevel) {
        Pet.els.trickTeach.textContent =
          t("petBtnTricks") + ": " + t(petTrickKey(next));
        Pet.els.trickTeach.disabled = false;
      } else {
        Pet.els.trickTeach.textContent = t("petReactionTrickLocked", {
          trick: t(petTrickKey(next)),
          n: unlockLevel,
        });
        Pet.els.trickTeach.disabled = true;
      }
    }
    var host = Pet.els.trickList;
    while (host.firstChild) {
      host.removeChild(host.firstChild);
    }
    if (!Pet.state.tricks.length) {
      return;
    }
    Pet.state.tricks.forEach(function (trick) {
      var btn = petCreate("button", "pet-action pet-trick-btn " + petTrickClass[trick]);
      btn.type = "button";
      btn.setAttribute("data-trick", trick);
      btn.textContent = t(petTrickKey(trick));
      btn.addEventListener("click", function () {
        petOnPerformTrick(trick);
      });
      host.appendChild(btn);
    });
  }

  function petSyncVisibility() {
    if (!Pet.els) {
      return;
    }
    var adopting = !Pet.state && !Pet.adoptionDismissed;
    var petHidden = !!Pet.state && Pet.state.hidden === true;
    var showRestore = !adopting && (!Pet.state || petHidden);

    Pet.els.adoptForm.hidden = !adopting;
    Pet.els.panel.hidden = adopting || petHidden;
    Pet.els.restore.hidden = !showRestore;
    Pet.els.widget.hidden = !(adopting || Pet.state || showRestore);
    Pet.els.widget.setAttribute("data-collapsed", Pet.collapsed ? "true" : "false");
    Pet.els.collapse.setAttribute("aria-expanded", Pet.collapsed ? "false" : "true");
    Pet.els.collapse.setAttribute(
      "aria-label",
      t(Pet.collapsed ? "petBtnExpand" : "petBtnCollapse"),
    );

    if (showRestore) {
      var label = Pet.state ? t("petBtnRestore") : t("petAdoptTitle");
      Pet.els.restoreLabel.textContent = label;
      Pet.els.restore.setAttribute("aria-label", label);
      Pet.els.restore.setAttribute("title", label);
    }

    if (Pet.state && !petHidden && !adopting) {
      petStartTimer();
    } else {
      petStopTimer();
      petClearTrackedTimeouts();
      petStopEmote();
      if (Pet.mini) {
        petMiniStop();
      }
      if (petHidden) {
        petSetView("main");
      }
    }
    petSyncView();
  }

  function petSetView(view) {
    var next = view === "stats" || view === "tricks" || view === "games"
      ? view
      : "main";
    if (next !== "games" && Pet.mini) {
      petMiniStop();
    }
    Pet.view = next;
    petSyncView();
  }

  function petSyncView() {
    if (!Pet.els) {
      return;
    }
    Pet.els.widget.setAttribute("data-view", Pet.view);
    Pet.els.statsView.view.hidden = Pet.view !== "stats";
    Pet.els.tricksView.view.hidden = Pet.view !== "tricks";
    Pet.els.gamesView.view.hidden = Pet.view !== "games";
    if (Pet.els.actionsNode) {
      Pet.els.actionsNode.hidden = Pet.view !== "main";
    }
    if (Pet.els.renameForm) {
      Pet.els.renameForm.hidden = !Pet.renameOpen || Pet.view !== "main";
    }
    if (Pet.view === "stats" && Pet.state) {
      petRenderSubviewData();
    }
  }

  /* --- interactions ------------------------------------------------ */

  function petRemover(node) {
    return function () {
      if (node.parentNode) {
        node.parentNode.removeChild(node);
      }
    };
  }

  function petSpawnParticles(kind) {
    if (!Pet.els || isMotionOff()) {
      return;
    }
    var count = isMotionCalm() ? 3 : 6;
    for (var index = 0; index < count; index += 1) {
      var particle = document.createElement("span");
      particle.className = "pet-particle " + (petParticleShapes[kind] || "is-star");
      particle.setAttribute("aria-hidden", "true");
      var angle = (Math.PI * (index + 0.5)) / count;
      particle.style.setProperty(
        "--pet-fx-x",
        Math.round(Math.cos(angle) * (18 + Math.random() * 26)) + "px",
      );
      particle.style.setProperty(
        "--pet-fx-y",
        "-" + Math.round(46 + Math.sin(angle) * 30) + "px",
      );
      particle.style.setProperty("--pet-fx-delay", index * 45 + "ms");
      Pet.els.fx.appendChild(particle);
      petTrackTimeout(
        petRemover(particle),
        petFxMs + 160 + index * 45,
      );
    }
  }

  function petReact(kind) {
    if (!Pet.els) {
      return;
    }
    var className = "is-" + kind;
    var classes = [
      "is-happy",
      "is-fed",
      "is-playing",
      "is-resting",
      "is-treat",
      "is-brush",
      "is-trick",
      "is-cheer",
    ];
    classes.forEach(function (name) {
      Pet.els.button.classList.remove(name);
    });
    void Pet.els.button.offsetWidth;
    Pet.els.button.classList.add(className);
    if (Pet.reactionTimer !== null) {
      window.clearTimeout(Pet.reactionTimer);
    }
    Pet.reactionTimer = window.setTimeout(function () {
      Pet.reactionTimer = null;
      Pet.els.button.classList.remove(className);
    }, petReactionMs);
    petSpawnParticles(kind);
  }


  /* Exported for the other modules. */
  App.petReact = petReact;
  App.petRender = petRender;
  App.petRenderBadges = petRenderBadges;
  App.petRenderRepair = petRenderRepair;
  App.petSetStatus = petSetStatus;
  App.petSetView = petSetView;
  App.petSpawnParticles = petSpawnParticles;
  App.petSyncVisibility = petSyncVisibility;
})(window.CapitalConvert = window.CapitalConvert || {});
