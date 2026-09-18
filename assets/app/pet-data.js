/* Pet data - Tuning constants, level tables, achievements and the shared Pet store. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  /* Shared mutable pet state: all pet submodules read/write via Pet.*. */
  var Pet = (App.Pet = App.Pet || {});
  /* ------------------------------------------------------------------
   * Pet companion
   * A small original creature injected into every page. Its needs decay
   * with real elapsed time and its whole state lives in one storage key.
   * ------------------------------------------------------------------ */

  var petStorageKey = "capitalconvert-pet";
  var petSpeciesOrder = ["bracko", "quillop", "tagling"];
  var petSvgNamespace = "http://www.w3.org/2000/svg";
  var petTickMs = 30000;
  var petCooldownMs = 900;
  var petReactionMs = 620;
  var petFxMs = 900;
  var petStatusRevertMs = 4200;
  var petNameMax = 16;
  var petDecayCapMs = 12 * 60 * 60 * 1000;
  var petDecayPerHour = { happiness: 6, hunger: 9, energy: 5 };
  var petStartStats = { happiness: 72, hunger: 24, energy: 80 };
  var petStartTreats = 3;
  var petComboWindowMs = 2600;
  var petIdleSleepMs = 3 * 60 * 1000;
  var petTypingCooldownMs = 22000;
  var petCursorThrottleMs = 90;
  var petTossRounds = 5;
  var petTossPeriodMs = 1400;
  var petTossTickMs = 40;
  var petSimonStepMs = 620;
  var petToastMs = 4200;

  /* Care & Return tuning. */
  var petCareNeedOrder = ["hunger", "happiness"];
  var petCareGraceMs = 15 * 60 * 1000;
  var petCareHungerMax = 85;
  var petCareHappinessMin = 10;
  var petAwayThresholdMs = 30 * 60 * 1000;
  var petAwayRewardMax = 5;
  var petRepairCost = 3;
  var petExclusiveStreak = 7;
  var petExclusiveAccessory = "medal";
  var petEmoteEveryMs = 3 * 60 * 1000;
  var petEmoteHideMs = 5200;
  /* Treats granted for reaching streak day 1..7 (index 0 is day 1). */
  var petStreakRewards = [2, 3, 4, 5, 6, 8, 12];

  /* Cumulative XP required to *reach* each level; index 0 is level 1. */
  var petLevelXpTable = [0, 20, 50, 90, 140, 200, 280, 380, 500, 650];
  var petMaxLevel = petLevelXpTable.length;
  var petStageOrder = ["baby", "grown", "elder"];
  var petStageMaxLevel = { baby: 3, grown: 7, elder: petMaxLevel };
  var petTrickOrder = ["jump", "spin", "sing", "wave"];
  var petTrickLevel = { jump: 1, spin: 2, sing: 4, wave: 6 };
  var petTrickClass = {
    jump: "pet-trick-jump",
    spin: "pet-trick-spin",
    sing: "pet-trick-sing",
    wave: "pet-trick-wave",
  };
  var petAccessoryOrder = ["none", "hat", "scarf", "glasses", "crown", "aura", "medal"];
  var petAccessoryLevel = {
    none: 1,
    hat: 2,
    scarf: 4,
    glasses: 6,
    crown: 8,
    aura: 10,
    medal: 1,
  };
  var petAccessoryClass = {
    none: "pet-acc-none",
    hat: "pet-acc-hat",
    scarf: "pet-acc-scarf",
    glasses: "pet-acc-glasses",
    crown: "pet-acc-crown",
    aura: "pet-acc-aura",
    medal: "pet-acc-medal",
  };
  /* Accessories that are not level-gated but earned another way. */
  var petExclusiveAccessories = { medal: "week7" };
  var petHueOrder = ["default", "mint", "rose", "gold"];
  var petHueLevel = { default: 1, mint: 3, rose: 5, gold: 7 };
  var petCornerOrder = ["br", "bl", "tr", "tl"];
  var petStageClass = {
    baby: "pet-stage-baby",
    grown: "pet-stage-grown",
    elder: "pet-stage-elder",
  };
  var petParticleShapes = {
    happy: "is-heart",
    fed: "is-food",
    playing: "is-star",
    resting: "is-sleep",
    treat: "is-food",
    brush: "is-star",
    level: "is-spark",
    achievement: "is-spark",
    cheer: "is-star",
  };
  var petAchievements = [
    { id: "firstPet", titleKey: "petAchFirstPet", descKey: "petAchFirstPetDesc", icon: "M12 20c-4.1 0-7.4-2.7-7.4-6.1 0-2.6 2.1-4.6 4.7-4.6.9 0 1.7.3 2.4.8A4.1 4.1 0 0 1 19.4 14c0 3.4-3.3 6-7.4 6z" },
    { id: "fed10", titleKey: "petAchFed10", descKey: "petAchFed10Desc", icon: "M4 11h13a4 4 0 0 1 0 8H8a4 4 0 0 1-4-4z" },
    { id: "level5", titleKey: "petAchLevel5", descKey: "petAchLevel5Desc", icon: "M12 3l2.6 6.1L21 10l-4.8 4.3L17.4 21 12 17.7 6.6 21l1.2-6.7L3 10l6.4-.9z" },
    { id: "level10", titleKey: "petAchLevel10", descKey: "petAchLevel10Desc", icon: "M5 18h14M7 18V9l5-4 5 4v9" },
    { id: "miniWin", titleKey: "petAchMiniWin", descKey: "petAchMiniWinDesc", icon: "M12 4l2 4.4 4.8.6-3.5 3.3.9 4.7L12 14.8 7.8 17l.9-4.7L5.2 9l4.8-.6z" },
    { id: "trickster", titleKey: "petAchTrickster", descKey: "petAchTricksterDesc", icon: "M12 3v10m0 0l-4 4m4-4l4 4" },
    { id: "streak3", titleKey: "petAchStreak3", descKey: "petAchStreak3Desc", icon: "M12 21s-7-4.4-7-9.5A4.5 4.5 0 0 1 12 8a4.5 4.5 0 0 1 7 3.5C19 16.6 12 21 12 21z" },
    { id: "treats25", titleKey: "petAchTreats25", descKey: "petAchTreats25Desc", icon: "M6 8h12l-1 11H7zM9 8V6a3 3 0 0 1 6 0v2" },
    { id: "combo5", titleKey: "petAchCombo5", descKey: "petAchCombo5Desc", icon: "M4 13h4l2-7 4 13 2-6h4" },
    { id: "evolved", titleKey: "petAchEvolved", descKey: "petAchEvolvedDesc", icon: "M12 3l4 5-4 3-4-3zM7 21l1-6h8l1 6z" },
    { id: "dressed", titleKey: "petAchDressed", descKey: "petAchDressedDesc", icon: "M5 9l4-3 3 2 3-2 4 3-3 3v7H8v-7z" },
  ];
  var petAchievementIds = petAchievements.map(function (definition) {
    return definition.id;
  });


  /* Initialise the shared store (moved from the old single-file vars). */
  Pet.state = null;
  Pet.els = null;
  Pet.collapsed = false;
  Pet.renameOpen = false;
  Pet.resetArmed = false;
  Pet.adoptionDismissed = false;
  Pet.storageBlocked = false;
  Pet.decayTimer = null;
  Pet.statusTimer = null;
  Pet.reactionTimer = null;
  Pet.resetTimer = null;
  Pet.comboTimer = null;
  Pet.toastTimer = null;
  Pet.cooldownUntil = 0;
  Pet.statusText = "";
  Pet.trackedTimeouts = [];
  Pet.selectedSpecies = petSpeciesOrder[0];
  Pet.renderedSpecies = "";
  Pet.view = "main";
  Pet.combo = 0;
  Pet.asleep = false;
  Pet.lastInteraction = 0;
  Pet.typingAt = 0;
  Pet.cursorAt = 0;
  Pet.lookX = 0;
  Pet.lookY = 0;
  Pet.mini = null;
  Pet.miniTimers = [];
  Pet.audio = null;
  Pet.drag = null;
  Pet.listenersBound = false;
  Pet.emoteHideTimer = null;
  Pet.emoteAt = 0;

  /* Exported for the other modules. */
  App.petStorageKey = petStorageKey;
  App.petSpeciesOrder = petSpeciesOrder;
  App.petSvgNamespace = petSvgNamespace;
  App.petTickMs = petTickMs;
  App.petCooldownMs = petCooldownMs;
  App.petReactionMs = petReactionMs;
  App.petFxMs = petFxMs;
  App.petStatusRevertMs = petStatusRevertMs;
  App.petNameMax = petNameMax;
  App.petDecayCapMs = petDecayCapMs;
  App.petDecayPerHour = petDecayPerHour;
  App.petStartStats = petStartStats;
  App.petStartTreats = petStartTreats;
  App.petComboWindowMs = petComboWindowMs;
  App.petIdleSleepMs = petIdleSleepMs;
  App.petTypingCooldownMs = petTypingCooldownMs;
  App.petCursorThrottleMs = petCursorThrottleMs;
  App.petTossRounds = petTossRounds;
  App.petTossPeriodMs = petTossPeriodMs;
  App.petTossTickMs = petTossTickMs;
  App.petSimonStepMs = petSimonStepMs;
  App.petToastMs = petToastMs;
  App.petCareNeedOrder = petCareNeedOrder;
  App.petCareGraceMs = petCareGraceMs;
  App.petCareHungerMax = petCareHungerMax;
  App.petCareHappinessMin = petCareHappinessMin;
  App.petAwayThresholdMs = petAwayThresholdMs;
  App.petAwayRewardMax = petAwayRewardMax;
  App.petRepairCost = petRepairCost;
  App.petExclusiveStreak = petExclusiveStreak;
  App.petExclusiveAccessory = petExclusiveAccessory;
  App.petEmoteEveryMs = petEmoteEveryMs;
  App.petEmoteHideMs = petEmoteHideMs;
  App.petStreakRewards = petStreakRewards;
  App.petLevelXpTable = petLevelXpTable;
  App.petMaxLevel = petMaxLevel;
  App.petStageOrder = petStageOrder;
  App.petStageMaxLevel = petStageMaxLevel;
  App.petTrickOrder = petTrickOrder;
  App.petTrickLevel = petTrickLevel;
  App.petTrickClass = petTrickClass;
  App.petAccessoryOrder = petAccessoryOrder;
  App.petAccessoryLevel = petAccessoryLevel;
  App.petAccessoryClass = petAccessoryClass;
  App.petExclusiveAccessories = petExclusiveAccessories;
  App.petHueOrder = petHueOrder;
  App.petHueLevel = petHueLevel;
  App.petCornerOrder = petCornerOrder;
  App.petStageClass = petStageClass;
  App.petParticleShapes = petParticleShapes;
  App.petAchievements = petAchievements;
  App.petAchievementIds = petAchievementIds;
  App.Pet = Pet;
})(window.CapitalConvert = window.CapitalConvert || {});
