/* Pet DOM - Widget markup construction and event wiring. */
(function (App) {
  var Pet = App.Pet;
  /* Shared names from the other modules (see window.CapitalConvert). */
  function petAddI18nText() { return App.petAddI18nText.apply(null, arguments); }
  function petAppendAll() { return App.petAppendAll.apply(null, arguments); }
  function petCreate() { return App.petCreate.apply(null, arguments); }
  function petCreateArt() { return App.petCreateArt.apply(null, arguments); }
  function petCreateStat() { return App.petCreateStat.apply(null, arguments); }
  function petCreateSubview() { return App.petCreateSubview.apply(null, arguments); }
  function petHandleVisibility() { return App.petHandleVisibility.apply(null, arguments); }
  function petIcon() { return App.petIcon.apply(null, arguments); }
  function petMiniStop() { return App.petMiniStop.apply(null, arguments); }
  var petNameMax = App.petNameMax;
  function petOnAdoptConfirm() { return App.petOnAdoptConfirm.apply(null, arguments); }
  function petOnBrush() { return App.petOnBrush.apply(null, arguments); }
  function petOnDragStart() { return App.petOnDragStart.apply(null, arguments); }
  function petOnFeed() { return App.petOnFeed.apply(null, arguments); }
  function petOnHandleKeydown() { return App.petOnHandleKeydown.apply(null, arguments); }
  function petOnHide() { return App.petOnHide.apply(null, arguments); }
  function petOnKeydown() { return App.petOnKeydown.apply(null, arguments); }
  function petOnPetClick() { return App.petOnPetClick.apply(null, arguments); }
  function petOnPlay() { return App.petOnPlay.apply(null, arguments); }
  function petOnRenameSubmit() { return App.petOnRenameSubmit.apply(null, arguments); }
  function petOnRepair() { return App.petOnRepair.apply(null, arguments); }
  function petOnRepairDecline() { return App.petOnRepairDecline.apply(null, arguments); }
  function petOnResetClick() { return App.petOnResetClick.apply(null, arguments); }
  function petOnRest() { return App.petOnRest.apply(null, arguments); }
  function petOnSwitchSpecies() { return App.petOnSwitchSpecies.apply(null, arguments); }
  function petOnTalk() { return App.petOnTalk.apply(null, arguments); }
  function petOnTeachTrick() { return App.petOnTeachTrick.apply(null, arguments); }
  function petOnToggleSound() { return App.petOnToggleSound.apply(null, arguments); }
  function petOnTreat() { return App.petOnTreat.apply(null, arguments); }
  function petPersistNow() { return App.petPersistNow.apply(null, arguments); }
  function petRender() { return App.petRender.apply(null, arguments); }
  function petSetView() { return App.petSetView.apply(null, arguments); }
  function petSpeciesKey() { return App.petSpeciesKey.apply(null, arguments); }
  var petSpeciesOrder = App.petSpeciesOrder;
  function petStartSimon() { return App.petStartSimon.apply(null, arguments); }
  function petStartToss() { return App.petStartToss.apply(null, arguments); }
  function petStopEmote() { return App.petStopEmote.apply(null, arguments); }
  function petSyncVisibility() { return App.petSyncVisibility.apply(null, arguments); }
  function petToggleRename() { return App.petToggleRename.apply(null, arguments); }
  function petWriteState() { return App.petWriteState.apply(null, arguments); }
  var t = App.t;
  function petBuildDom() {
    var widget = petCreate("div", "pet-widget");
    widget.setAttribute("id", "petWidget");
    widget.setAttribute("role", "region");
    widget.setAttribute("aria-label", t("petTitle"));
    widget.setAttribute("data-species", petSpeciesOrder[0]);
    widget.setAttribute("data-mood", "neutral");
    widget.hidden = true;

    /* companion card */
    var panel = petCreate("div", "pet-panel");
    panel.setAttribute("id", "petPanel");

    var head = petCreate("div", "pet-head pet-handle");
    head.setAttribute("id", "petHead");
    head.setAttribute("tabindex", "0");
    head.setAttribute("aria-label", t("petMoveHandle"));
    head.setAttribute("title", t("petMoveHandle"));
    petAddI18nText(head, "petTitle", "span", "pet-title");
    var collapseBtn = petCreate("button", "pet-icon-btn");
    collapseBtn.type = "button";
    collapseBtn.setAttribute("id", "petCollapseBtn");
    collapseBtn.setAttribute("aria-expanded", "true");
    collapseBtn.setAttribute("aria-label", t("petBtnCollapse"));
    collapseBtn.appendChild(petIcon("M6 9l6 6 6-6"));
    head.appendChild(collapseBtn);
    panel.appendChild(head);

    var stage = petCreate("div", "pet-stage");
    var button = petCreate("button", "pet-button");
    button.type = "button";
    button.setAttribute("id", "petButton");
    var art = petCreate("span", "pet-art");
    art.setAttribute("id", "petArt");
    button.appendChild(art);
    var fx = petCreate("div", "pet-fx");
    fx.setAttribute("id", "petFx");
    fx.setAttribute("aria-hidden", "true");
    stage.appendChild(button);
    stage.appendChild(fx);
    panel.appendChild(stage);

    var bodyPanel = petCreate("div", "pet-body-panel");
    var status = petCreate("p", "pet-status");
    status.setAttribute("id", "petStatus");
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    bodyPanel.appendChild(status);

    var combo = petCreate("span", "pet-combo");
    combo.setAttribute("id", "petCombo");
    combo.setAttribute("role", "status");
    combo.setAttribute("aria-live", "polite");
    combo.hidden = true;
    bodyPanel.appendChild(combo);

    /* Visual counterpart of the attention status line (not announced twice). */
    var attention = petCreate("span", "pet-attention");
    attention.setAttribute("id", "petAttention");
    attention.setAttribute("aria-hidden", "true");
    attention.hidden = true;
    bodyPanel.appendChild(attention);

    var stats = petCreate("div", "pet-stats");
    stats.setAttribute("role", "group");
    stats.setAttribute("aria-label", t("petStatsLabel"));
    var statDefs = [
      ["happiness", "petStatHappiness"],
      ["hunger", "petStatHunger"],
      ["energy", "petStatEnergy"],
    ];
    var bars = {};
    var statValues = {};
    statDefs.forEach(function (definition) {
      var stat = petCreateStat(definition[0], definition[1]);
      bars[definition[0]] = stat.fill;
      statValues[definition[0]] = stat.value;
      stat.row.appendChild(stat.label);
      stat.row.appendChild(stat.bar);
      stat.row.appendChild(stat.value);
      stats.appendChild(stat.row);
    });
    bodyPanel.appendChild(stats);

    var levelRow = petCreate("div", "pet-level");
    var levelText = petCreate("span", "pet-level-text");
    levelText.setAttribute("id", "petLevelText");
    var xpBar = petCreate("span", "pet-xp-bar");
    var xpFill = petCreate("i", "pet-xp-fill");
    xpFill.setAttribute("id", "petXpFill");
    xpBar.appendChild(xpFill);
    var xpText = petCreate("span", "pet-xp-text");
    xpText.setAttribute("id", "petXpText");
    levelRow.appendChild(levelText);
    levelRow.appendChild(xpBar);
    levelRow.appendChild(xpText);
    bodyPanel.appendChild(levelRow);

    var treatsRow = petCreate("div", "pet-treats");
    var treatsChip = petCreate("span", "pet-treat-chip");
    treatsChip.setAttribute("aria-hidden", "true");
    treatsChip.appendChild(petIcon("M6 8h12l-1 11H7zM9 8V6a3 3 0 0 1 6 0v2"));
    var treatsValue = petCreate("span", "pet-treat-value");
    treatsValue.setAttribute("id", "petTreatValue");
    var treatsLabel = petCreate("span", "pet-treat-label");
    treatsLabel.setAttribute("data-i18n", "petTreatsLabel");
    treatsRow.appendChild(treatsChip);
    treatsRow.appendChild(treatsValue);
    treatsRow.appendChild(treatsLabel);
    bodyPanel.appendChild(treatsRow);

    /* streak-repair offer: only visible while a repair is pending */
    var repair = petCreate("div", "pet-repair");
    repair.setAttribute("id", "petRepair");
    repair.setAttribute("role", "group");
    repair.setAttribute("aria-label", t("petRepairTitle"));
    repair.hidden = true;
    var repairText = petCreate("p", "pet-repair-text");
    repairText.setAttribute("id", "petRepairText");
    repair.appendChild(repairText);
    var repairActions = petCreate("div", "pet-repair-actions");
    var repairBtn = petCreate("button", "pet-action is-primary");
    repairBtn.type = "button";
    repairBtn.setAttribute("id", "petRepairBtn");
    var repairDecline = petCreate("button", "pet-action");
    repairDecline.type = "button";
    repairDecline.setAttribute("id", "petRepairDeclineBtn");
    repairActions.appendChild(repairBtn);
    repairActions.appendChild(repairDecline);
    repair.appendChild(repairActions);
    bodyPanel.appendChild(repair);

    var actions = petCreate("div", "pet-actions");
    actions.setAttribute("role", "group");
    actions.setAttribute("aria-label", t("petControlsLabel"));
    var actionDefs = [
      ["Feed", "petFeedBtn", "petBtnFeed"],
      ["Play", "petPlayBtn", "petBtnPlay"],
      ["Rest", "petRestBtn", "petBtnRest"],
      ["Treat", "petTreatBtn", "petBtnTreat"],
      ["Brush", "petBrushBtn", "petBtnBrush"],
      ["Talk", "petTalkBtn", "petBtnTalk"],
      ["Tricks", "petTricksBtn", "petBtnTricks"],
      ["Games", "petGamesBtn", "petBtnGames"],
      ["Stats", "petStatsBtn", "petBtnStats"],
      ["Rename", "petRenameBtn", "petBtnRename"],
      ["Species", "petSpeciesBtn", "petBtnSpecies"],
      ["Sound", "petSoundBtn", "petBtnSound"],
      ["Reset", "petResetBtn", "petBtnReset"],
      ["Hide", "petHideBtn", "petBtnHide"],
    ];
    var actionButtons = {};
    actionDefs.forEach(function (definition) {
      var action = petCreate("button", "pet-action");
      action.type = "button";
      action.setAttribute("id", definition[1]);
      action.setAttribute("data-i18n", definition[2]);
      actions.appendChild(action);
      actionButtons[definition[0]] = action;
    });
    bodyPanel.appendChild(actions);

    var renameForm = petCreate("form", "pet-rename");
    renameForm.setAttribute("id", "petRenameForm");
    renameForm.hidden = true;
    var renameInput = petCreate("input", "pet-name-input");
    renameInput.type = "text";
    renameInput.setAttribute("id", "petRenameInput");
    renameInput.setAttribute("maxlength", String(petNameMax));
    renameInput.setAttribute("data-i18n-placeholder", "petRenamePlaceholder");
    renameInput.setAttribute("aria-label", t("petNameLabel"));
    var renameActions = petCreate("div", "pet-rename-actions");
    var renameSave = petCreate("button", "pet-action is-primary");
    renameSave.type = "submit";
    renameSave.setAttribute("id", "petRenameSave");
    renameSave.setAttribute("data-i18n", "petBtnRenameConfirm");
    var renameCancel = petCreate("button", "pet-action");
    renameCancel.type = "button";
    renameCancel.setAttribute("id", "petRenameCancel");
    renameCancel.setAttribute("data-i18n", "petBtnRenameCancel");
    renameActions.appendChild(renameSave);
    renameActions.appendChild(renameCancel);
    renameForm.appendChild(renameInput);
    renameForm.appendChild(renameActions);
    bodyPanel.appendChild(renameForm);

    /* stats view */
    var statsView = petCreateSubview("petStatsView", "petStatsTitle", "petBackStats");
    var statsFields = petCreate("div", "pet-fields");
    var fieldDefs = [
      ["petStatLevel", "petStatLevelValue"],
      ["petStatStage", "petStatStageValue"],
      ["petStatXp", "petStatXpValue"],
      ["petStatTreats", "petStatTreatsValue"],
      ["petStatDays", "petStatDaysValue"],
      ["petStatStreak", "petStatStreakValue"],
      ["petStatTricks", "petStatTricksValue"],
      ["petStatCombo", "petStatComboValue"],
      ["petStatMoodWord", "petStatMoodValue"],
      ["petStatHungerWord", "petStatHungerValue"],
      ["petStatCareMistakes", "petStatCareMistakesValue"],
    ];
    var fieldValues = {};
    fieldDefs.forEach(function (definition) {
      var field = petCreate("div", "pet-field");
      var label = petCreate("span", "pet-field-label");
      label.setAttribute("data-i18n", definition[0]);
      var value = petCreate("span", "pet-field-value");
      value.setAttribute("id", definition[1]);
      field.appendChild(label);
      field.appendChild(value);
      statsFields.appendChild(field);
      fieldValues[definition[1]] = value;
    });
    statsView.view.appendChild(statsFields);

    var achHead = petCreate("div", "pet-sub-head");
    petAddI18nText(achHead, "petStatAchievements", "span", "pet-sub-title");
    var achCount = petCreate("span", "pet-field-value");
    achCount.setAttribute("id", "petAchievementsCount");
    achHead.appendChild(achCount);
    statsView.view.appendChild(achHead);
    var badges = petCreate("div", "pet-badges");
    badges.setAttribute("id", "petBadges");
    badges.setAttribute("role", "list");
    statsView.view.appendChild(badges);

    var accHead = petCreate("div", "pet-sub-head");
    petAddI18nText(accHead, "petAccLabel", "span", "pet-sub-title");
    statsView.view.appendChild(accHead);
    var accGrid = petCreate("div", "pet-acc-grid");
    accGrid.setAttribute("id", "petAccGrid");
    accGrid.setAttribute("role", "group");
    accGrid.setAttribute("aria-label", t("petAccLabel"));
    statsView.view.appendChild(accGrid);

    var hueHead = petCreate("div", "pet-sub-head");
    petAddI18nText(hueHead, "petHueLabel", "span", "pet-sub-title");
    statsView.view.appendChild(hueHead);
    var hueGrid = petCreate("div", "pet-acc-grid");
    hueGrid.setAttribute("id", "petHueGrid");
    hueGrid.setAttribute("role", "group");
    hueGrid.setAttribute("aria-label", t("petHueLabel"));
    statsView.view.appendChild(hueGrid);
    bodyPanel.appendChild(statsView.view);

    /* tricks view */
    var tricksView = petCreateSubview("petTricksView", "petBtnTricks", "petBackTricks");
    var trickTeach = petCreate("button", "pet-action is-primary");
    trickTeach.type = "button";
    trickTeach.setAttribute("id", "petTrickTeachBtn");
    tricksView.view.appendChild(trickTeach);
    var trickList = petCreate("div", "pet-trick-list");
    trickList.setAttribute("id", "petTrickList");
    trickList.setAttribute("role", "group");
    trickList.setAttribute("aria-label", t("petBtnTricks"));
    tricksView.view.appendChild(trickList);
    bodyPanel.appendChild(tricksView.view);

    /* games view */
    var gamesView = petCreateSubview("petGamesView", "petGamesTitle", "petBackGames");
    var gameMenu = petCreate("div", "pet-game-menu");
    gameMenu.setAttribute("id", "petGameMenu");
    var tossStart = petCreate("button", "pet-action pet-game-choice");
    tossStart.type = "button";
    tossStart.setAttribute("id", "petGameTossStart");
    tossStart.setAttribute("data-i18n", "petGameTreatToss");
    var simonStart = petCreate("button", "pet-action pet-game-choice");
    simonStart.type = "button";
    simonStart.setAttribute("id", "petGameSimonStart");
    simonStart.setAttribute("data-i18n", "petGameTrickTrainer");
    gameMenu.appendChild(tossStart);
    gameMenu.appendChild(simonStart);
    gamesView.view.appendChild(gameMenu);
    var gameHost = petCreate("div", "pet-game-host");
    gameHost.setAttribute("id", "petGameHost");
    gamesView.view.appendChild(gameHost);
    var gameResult = petCreate("p", "pet-game-result");
    gameResult.setAttribute("id", "petGameResult");
    gameResult.setAttribute("role", "status");
    gameResult.setAttribute("aria-live", "polite");
    gamesView.view.appendChild(gameResult);
    var gameExit = petCreate("button", "pet-action");
    gameExit.type = "button";
    gameExit.setAttribute("id", "petGameExitBtn");
    gameExit.setAttribute("data-i18n", "petGameExit");
    gameExit.hidden = true;
    gamesView.view.appendChild(gameExit);
    bodyPanel.appendChild(gamesView.view);

    panel.appendChild(bodyPanel);
    widget.appendChild(panel);

    /* idle speech bubble: sits above the card, near the creature */
    var emote = petCreate("p", "pet-emote");
    emote.setAttribute("id", "petEmote");
    emote.setAttribute("role", "status");
    emote.setAttribute("aria-live", "polite");
    emote.hidden = true;
    widget.insertBefore(emote, widget.firstChild);

    var toast = petCreate("p", "pet-toast");
    toast.setAttribute("id", "petToast");
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    toast.hidden = true;
    widget.appendChild(toast);

    /* adoption card */
    var adoptForm = petCreate("form", "pet-adopt");
    adoptForm.setAttribute("id", "petAdoptForm");
    adoptForm.setAttribute("role", "dialog");
    adoptForm.setAttribute("aria-labelledby", "petAdoptHeading");
    adoptForm.hidden = true;
    var adoptHeading = petAddI18nText(
      adoptForm,
      "petAdoptTitle",
      "h2",
      "pet-adopt-heading",
    );
    adoptHeading.setAttribute("id", "petAdoptHeading");
    petAddI18nText(adoptForm, "petAdoptBody", "p", "pet-adopt-body");

    var speciesGroup = petCreate("div", "pet-species");
    speciesGroup.setAttribute("id", "petSpeciesGroup");
    speciesGroup.setAttribute("role", "radiogroup");
    speciesGroup.setAttribute("aria-label", t("petSpeciesLabel"));
    var speciesInputs = [];
    petSpeciesOrder.forEach(function (species) {
      var option = petCreate("label", "pet-species-option");
      option.setAttribute("for", "petSpeciesInput-" + species);
      option.setAttribute("data-species", species);
      var input = petCreate("input", "pet-species-input");
      input.type = "radio";
      input.setAttribute("name", "petSpecies");
      input.setAttribute("id", "petSpeciesInput-" + species);
      input.value = species;
      var frame = petCreate("span", "pet-species-frame");
      frame.setAttribute("aria-hidden", "true");
      var name = petCreate("span", "pet-species-name");
      name.textContent = t(petSpeciesKey(species));
      var desc = petCreate("span", "pet-species-desc");
      desc.textContent = t(petSpeciesKey(species) + "Desc");
      petAppendAll(option, [
        input,
        frame,
        petCreateArt(species, "pet-svg pet-svg-mini"),
        name,
        desc,
      ]);
      speciesGroup.appendChild(option);
      speciesInputs.push(input);
    });
    adoptForm.appendChild(speciesGroup);

    var nameLabel = petCreate("label", "pet-name-label");
    nameLabel.setAttribute("for", "petAdoptName");
    nameLabel.setAttribute("data-i18n", "petNameLabel");
    adoptForm.appendChild(nameLabel);
    var adoptName = petCreate("input", "pet-name-input");
    adoptName.type = "text";
    adoptName.setAttribute("id", "petAdoptName");
    adoptName.setAttribute("maxlength", String(petNameMax));
    adoptName.setAttribute("data-i18n-placeholder", "petNamePlaceholder");
    adoptForm.appendChild(adoptName);

    var adoptActions = petCreate("div", "pet-adopt-actions");
    var adoptConfirm = petCreate("button", "pet-action is-primary");
    adoptConfirm.type = "submit";
    adoptConfirm.setAttribute("id", "petAdoptConfirm");
    adoptConfirm.setAttribute("data-i18n", "petAdoptConfirm");
    var adoptLater = petCreate("button", "pet-action");
    adoptLater.type = "button";
    adoptLater.setAttribute("id", "petAdoptLater");
    adoptLater.setAttribute("data-i18n", "petAdoptLater");
    adoptActions.appendChild(adoptConfirm);
    adoptActions.appendChild(adoptLater);
    adoptForm.appendChild(adoptActions);

    var adoptStatus = petCreate("p", "pet-status");
    adoptStatus.setAttribute("id", "petAdoptStatus");
    adoptStatus.setAttribute("role", "status");
    adoptStatus.setAttribute("aria-live", "polite");
    adoptForm.appendChild(adoptStatus);
    widget.appendChild(adoptForm);

    /* restore pill */
    var restore = petCreate("button", "pet-restore");
    restore.type = "button";
    restore.setAttribute("id", "petRestoreBtn");
    restore.hidden = true;
    restore.appendChild(petIcon("M12 3l2.4 5.6L20 11l-5.6 2.4L12 19l-2.4-5.6L4 11l5.6-2.4z"));
    var restoreLabel = petCreate("span", "pet-restore-label");
    restoreLabel.setAttribute("id", "petRestoreLabel");
    restore.appendChild(restoreLabel);
    widget.appendChild(restore);

    document.body.appendChild(widget);

    Pet.els = {
      widget: widget,
      panel: panel,
      collapse: collapseBtn,
      button: button,
      art: art,
      fx: fx,
      status: status,
      stats: stats,
      bars: bars,
      statValues: statValues,
      level: levelText,
      xpFill: xpFill,
      xpText: xpText,
      actions: actionButtons,
      renameForm: renameForm,
      renameInput: renameInput,
      renameCancel: renameCancel,
      adoptForm: adoptForm,
      adoptName: adoptName,
      adoptStatus: adoptStatus,
      adoptLater: adoptLater,
      speciesGroup: speciesGroup,
      speciesInputs: speciesInputs,
      restore: restore,
      restoreLabel: restoreLabel,
      head: head,
      combo: combo,
      attention: attention,
      emote: emote,
      repair: repair,
      repairText: repairText,
      repairBtn: repairBtn,
      repairDecline: repairDecline,
      treatsValue: treatsValue,
      treatsLabel: treatsLabel,
      treatsRow: treatsRow,
      actionsNode: actions,
      statsView: statsView,
      fieldValues: fieldValues,
      badges: badges,
      achCount: achCount,
      accGrid: accGrid,
      hueGrid: hueGrid,
      tricksView: tricksView,
      trickTeach: trickTeach,
      trickList: trickList,
      gamesView: gamesView,
      gameMenu: gameMenu,
      gameHost: gameHost,
      gameResult: gameResult,
      gameExit: gameExit,
      tossStart: tossStart,
      simonStart: simonStart,
      toast: toast,
    };
    petWireEvents();
  }

  function petWireEvents() {
    Pet.els.button.addEventListener("click", petOnPetClick);
    Pet.els.collapse.addEventListener("click", function () {
      Pet.collapsed = !Pet.collapsed;
      if (Pet.collapsed && Pet.mini) {
        petMiniStop();
        petSetView("main");
      }
      if (Pet.collapsed) {
        petStopEmote();
      }
      petSyncVisibility();
    });

    Pet.els.actions.Feed.addEventListener("click", petOnFeed);
    Pet.els.actions.Play.addEventListener("click", petOnPlay);
    Pet.els.actions.Rest.addEventListener("click", petOnRest);
    Pet.els.actions.Treat.addEventListener("click", petOnTreat);
    Pet.els.actions.Brush.addEventListener("click", petOnBrush);
    Pet.els.actions.Talk.addEventListener("click", petOnTalk);
    Pet.els.actions.Tricks.addEventListener("click", function () {
      petSetView(Pet.view === "tricks" ? "main" : "tricks");
    });
    Pet.els.actions.Games.addEventListener("click", function () {
      petSetView(Pet.view === "games" ? "main" : "games");
    });
    Pet.els.actions.Stats.addEventListener("click", function () {
      petSetView(Pet.view === "stats" ? "main" : "stats");
    });
    Pet.els.actions.Rename.addEventListener("click", function () {
      petToggleRename(!Pet.renameOpen);
    });
    Pet.els.repairBtn.addEventListener("click", petOnRepair);
    Pet.els.repairDecline.addEventListener("click", petOnRepairDecline);
    Pet.els.actions.Species.addEventListener("click", petOnSwitchSpecies);
    Pet.els.actions.Sound.addEventListener("click", petOnToggleSound);
    Pet.els.actions.Reset.addEventListener("click", petOnResetClick);
    Pet.els.actions.Hide.addEventListener("click", petOnHide);

    Pet.els.head.addEventListener("pointerdown", petOnDragStart);
    Pet.els.head.addEventListener("keydown", petOnHandleKeydown);
    Pet.els.statsView.back.addEventListener("click", function () {
      petSetView("main");
    });
    Pet.els.tricksView.back.addEventListener("click", function () {
      petSetView("main");
    });
    Pet.els.gamesView.back.addEventListener("click", function () {
      petSetView("main");
    });
    Pet.els.trickTeach.addEventListener("click", petOnTeachTrick);
    Pet.els.tossStart.addEventListener("click", petStartToss);
    Pet.els.simonStart.addEventListener("click", petStartSimon);
    Pet.els.gameExit.addEventListener("click", function () {
      petMiniStop();
      petSetView("games");
      Pet.els.tossStart.focus();
    });
    Pet.els.widget.addEventListener("keydown", petOnKeydown);

    Pet.els.renameForm.addEventListener("submit", function (event) {
      if (event && typeof event.preventDefault === "function") {
        event.preventDefault();
      }
      petOnRenameSubmit();
    });
    Pet.els.renameCancel.addEventListener("click", function () {
      petToggleRename(false);
      Pet.els.button.focus();
    });

    Pet.els.adoptForm.addEventListener("submit", function (event) {
      if (event && typeof event.preventDefault === "function") {
        event.preventDefault();
      }
      petOnAdoptConfirm();
    });
    Pet.els.adoptLater.addEventListener("click", function () {
      Pet.adoptionDismissed = true;
      petSyncVisibility();
    });

    Pet.els.speciesInputs.forEach(function (input) {
      input.addEventListener("change", function () {
        if (input.checked) {
          Pet.selectedSpecies = input.value;
        }
      });
    });

    Pet.els.restore.addEventListener("click", function () {
      if (Pet.state) {
        Pet.state.hidden = false;
        Pet.adoptionDismissed = false;
        petWriteState();
        petRender();
        petSyncVisibility();
        Pet.els.button.focus();
        return;
      }
      Pet.adoptionDismissed = false;
      petSyncVisibility();
      Pet.els.adoptName.focus();
    });

    document.addEventListener("visibilitychange", petHandleVisibility);
    window.addEventListener("pagehide", petPersistNow);
  }

  /* Exported for the other modules. */
  App.petBuildDom = petBuildDom;
})(window.CapitalConvert = window.CapitalConvert || {});
