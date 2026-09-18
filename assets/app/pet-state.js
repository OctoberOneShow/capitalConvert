/* Pet state - Saved state, migration, levels, decay, attention and visit rewards. */
(function (App) {
  var Pet = App.Pet;
  /* Shared names from the other modules (see window.CapitalConvert). */
  var petAccessoryLevel = App.petAccessoryLevel;
  var petAccessoryOrder = App.petAccessoryOrder;
  var petAchievementIds = App.petAchievementIds;
  var petAchievements = App.petAchievements;
  function petAddTreats() { return App.petAddTreats.apply(null, arguments); }
  var petAwayRewardMax = App.petAwayRewardMax;
  var petAwayThresholdMs = App.petAwayThresholdMs;
  var petCareGraceMs = App.petCareGraceMs;
  var petCareHappinessMin = App.petCareHappinessMin;
  var petCareHungerMax = App.petCareHungerMax;
  var petCareNeedOrder = App.petCareNeedOrder;
  var petCornerOrder = App.petCornerOrder;
  var petDecayCapMs = App.petDecayCapMs;
  var petDecayPerHour = App.petDecayPerHour;
  var petExclusiveAccessories = App.petExclusiveAccessories;
  var petExclusiveAccessory = App.petExclusiveAccessory;
  var petExclusiveStreak = App.petExclusiveStreak;
  var petHueLevel = App.petHueLevel;
  var petHueOrder = App.petHueOrder;
  var petLevelXpTable = App.petLevelXpTable;
  var petMaxLevel = App.petMaxLevel;
  var petNameMax = App.petNameMax;
  var petSpeciesOrder = App.petSpeciesOrder;
  var petStageMaxLevel = App.petStageMaxLevel;
  var petStageOrder = App.petStageOrder;
  var petStartStats = App.petStartStats;
  var petStartTreats = App.petStartTreats;
  var petStorageKey = App.petStorageKey;
  var petStreakRewards = App.petStreakRewards;
  var petTrickOrder = App.petTrickOrder;
  var t = App.t;
  function petClamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function petToNumber(value, fallback) {
    var number = typeof value === "number" ? value : parseFloat(value);
    return isFinite(number) ? number : fallback;
  }

  function petIsSpecies(value) {
    return petSpeciesOrder.indexOf(value) !== -1;
  }

  function petSpeciesKey(species) {
    return "petSpecies" + species.charAt(0).toUpperCase() + species.slice(1);
  }

  function petMoodKey(mood) {
    return "petMood" + mood.charAt(0).toUpperCase() + mood.slice(1);
  }

  function petMoodStatusKey(mood) {
    return "petStatus" + mood.charAt(0).toUpperCase() + mood.slice(1);
  }

  function petStageKey(stage) {
    return "petStage" + stage.charAt(0).toUpperCase() + stage.slice(1);
  }

  function petTrickKey(trick) {
    return "petTrick" + trick.charAt(0).toUpperCase() + trick.slice(1);
  }

  function petHueKey(hue) {
    return "petHue" + hue.charAt(0).toUpperCase() + hue.slice(1);
  }

  function petAccessoryKey(accessory) {
    return "petAcc" + accessory.charAt(0).toUpperCase() + accessory.slice(1);
  }

  function petPickFrom(order, value, fallback) {
    return order.indexOf(value) !== -1 ? value : fallback;
  }

  function petAchievementById(id) {
    for (var index = 0; index < petAchievements.length; index += 1) {
      if (petAchievements[index].id === id) {
        return petAchievements[index];
      }
    }
    return null;
  }

  function petLocalDay(now) {
    var date = new Date(now);
    try {
      return (
        date.getFullYear() +
        "-" +
        (date.getMonth() + 1) +
        "-" +
        date.getDate()
      );
    } catch (error) {
      return "";
    }
  }

  function petSanitizeName(value) {
    if (typeof value !== "string") {
      return "";
    }
    return value
      .replace(/[\u0000-\u001f\u007f<>]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, petNameMax);
  }

  /*
   * Attention episodes survive reloads: each entry is an absolute grace window
   * (`since` / `deadline` in real ms) plus a `logged` latch so one episode can
   * only ever record a single care mistake.
   */
  function petNormalizeEpisodes(raw) {
    var out = {};
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return out;
    }
    petCareNeedOrder.forEach(function (need) {
      var entry = raw[need];
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return;
      }
      var since = petToNumber(entry.since, 0);
      var deadline = petToNumber(entry.deadline, 0);
      if (since <= 0 || deadline <= 0) {
        return;
      }
      out[need] = {
        since: Math.floor(since),
        deadline: Math.floor(deadline),
        logged: entry.logged === true,
      };
    });
    return out;
  }

  function petNormalizeUnlocks(raw) {
    var out = {};
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return out;
    }
    var stamp = petToNumber(raw.week7, 0);
    if (stamp > 0) {
      out.week7 = Math.floor(stamp);
    }
    return out;
  }

  /*
   * Defensive migration: this runs against every save, including the older
   * schema (no treats / tricks / achievements / streak / accessory). Every
   * field gets a sane default and out-of-range values are clamped, so a
   * partial or corrupt payload can never throw.
   */
  function petNormalizeState(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return null;
    }
    if (!petIsSpecies(raw.species)) {
      return null;
    }
    var tricks = [];
    if (Array.isArray(raw.tricks)) {
      petTrickOrder.forEach(function (trick) {
        if (raw.tricks.indexOf(trick) !== -1) {
          tricks.push(trick);
        }
      });
    }
    var achievements = {};
    if (
      raw.achievements &&
      typeof raw.achievements === "object" &&
      !Array.isArray(raw.achievements)
    ) {
      petAchievementIds.forEach(function (id) {
        var stamp = petToNumber(raw.achievements[id], 0);
        if (stamp > 0) {
          achievements[id] = Math.floor(stamp);
        }
      });
    }
    return {
      species: raw.species,
      name: petSanitizeName(raw.name) || t("petDefaultName"),
      happiness: petClamp(
        petToNumber(raw.happiness, petStartStats.happiness),
        0,
        100,
      ),
      hunger: petClamp(petToNumber(raw.hunger, petStartStats.hunger), 0, 100),
      energy: petClamp(petToNumber(raw.energy, petStartStats.energy), 0, 100),
      xp: Math.max(0, Math.floor(petToNumber(raw.xp, 0))),
      treats: petClamp(Math.floor(petToNumber(raw.treats, petStartTreats)), 0, 9999),
      tricks: tricks,
      achievements: achievements,
      accessory: petPickFrom(petAccessoryOrder, raw.accessory, "none"),
      hue: petPickFrom(petHueOrder, raw.hue, "default"),
      daysVisited: petClamp(Math.floor(petToNumber(raw.daysVisited, 1)), 1, 1000000),
      streak: petClamp(Math.floor(petToNumber(raw.streak, 1)), 1, 1000000),
      lastDay: typeof raw.lastDay === "string" ? raw.lastDay.slice(0, 24) : "",
      totalFeeds: Math.max(0, Math.floor(petToNumber(raw.totalFeeds, 0))),
      totalBrush: Math.max(0, Math.floor(petToNumber(raw.totalBrush, 0))),
      totalTricks: Math.max(0, Math.floor(petToNumber(raw.totalTricks, 0))),
      bestCombo: Math.max(0, Math.floor(petToNumber(raw.bestCombo, 0))),
      miniGamesFinished: Math.max(
        0,
        Math.floor(petToNumber(raw.miniGamesFinished, 0)),
      ),
      pos: petPickFrom(petCornerOrder, raw.pos, "br"),
      sound: raw.sound === true,
      lastSeen: petToNumber(raw.lastSeen, Date.now()),
      hidden: raw.hidden === true,
      careMistakes: Math.max(0, Math.floor(petToNumber(raw.careMistakes, 0))),
      careEpisodes: petNormalizeEpisodes(raw.careEpisodes),
      streakUnlocks: petNormalizeUnlocks(raw.streakUnlocks),
      repairStreak: Math.max(0, Math.floor(petToNumber(raw.repairStreak, 0))),
    };
  }

  function petReadState() {
    var rawText = null;
    try {
      rawText = localStorage.getItem(petStorageKey);
    } catch (error) {
      Pet.storageBlocked = true;
      return null;
    }
    if (!rawText) {
      return null;
    }
    try {
      return petNormalizeState(JSON.parse(rawText));
    } catch (error) {
      return null;
    }
  }

  function petWriteState() {
    if (!Pet.state || Pet.storageBlocked) {
      return;
    }
    try {
      localStorage.setItem(petStorageKey, JSON.stringify(Pet.state));
    } catch (error) {
      Pet.storageBlocked = true;
    }
  }

  function petRemoveState() {
    try {
      localStorage.removeItem(petStorageKey);
    } catch (error) {
      Pet.storageBlocked = true;
    }
  }

  function petLevelValue() {
    if (!Pet.state) {
      return 1;
    }
    var xp = Math.max(0, Pet.state.xp);
    var level = 1;
    for (var index = 1; index < petLevelXpTable.length; index += 1) {
      if (xp >= petLevelXpTable[index]) {
        level = index + 1;
      }
    }
    return level;
  }

  function petLevelProgress() {
    var level = petLevelValue();
    var base = petLevelXpTable[level - 1];
    var atMax = level >= petMaxLevel;
    var next = atMax ? base : petLevelXpTable[level];
    var span = Math.max(1, next - base);
    var into = atMax ? span : petClamp(Pet.state.xp - base, 0, span);
    return {
      level: level,
      into: into,
      span: span,
      percent: Math.round((into / span) * 100),
    };
  }

  function petStageValue(level) {
    var value = level === undefined ? petLevelValue() : level;
    for (var index = 0; index < petStageOrder.length; index += 1) {
      var stage = petStageOrder[index];
      if (value <= petStageMaxLevel[stage]) {
        return stage;
      }
    }
    return petStageOrder[petStageOrder.length - 1];
  }

  function petStageIndex(stage) {
    return petStageOrder.indexOf(stage === undefined ? petStageValue() : stage);
  }

  function petExclusiveUnlocked(id) {
    return !!(Pet.state && Pet.state.streakUnlocks && Pet.state.streakUnlocks[id]);
  }

  function petAccessoryUnlocked(accessory, level) {
    if (petExclusiveAccessories[accessory]) {
      return petExclusiveUnlocked(petExclusiveAccessories[accessory]);
    }
    var value = level === undefined ? petLevelValue() : level;
    return value >= (petAccessoryLevel[accessory] || 1);
  }

  function petHueUnlocked(hue, level) {
    var value = level === undefined ? petLevelValue() : level;
    return value >= (petHueLevel[hue] || 1);
  }

  function petLearnedTrick(trick) {
    return !!Pet.state && Pet.state.tricks.indexOf(trick) !== -1;
  }

  function petNextTrick() {
    for (var index = 0; index < petTrickOrder.length; index += 1) {
      if (!petLearnedTrick(petTrickOrder[index])) {
        return petTrickOrder[index];
      }
    }
    return "";
  }

  function petMood() {
    if (!Pet.state) {
      return "neutral";
    }
    if (Pet.state.energy < 30) {
      return "sleepy";
    }
    if (Pet.state.hunger >= 65) {
      return "hungry";
    }
    if (Pet.state.happiness >= 65 && Pet.state.hunger < 50) {
      return "happy";
    }
    return "neutral";
  }

  function petTimeOfDay(now) {
    var hour = 12;
    try {
      hour = new Date(now === undefined ? Date.now() : now).getHours();
    } catch (error) {
      hour = 12;
    }
    if (hour >= 5 && hour < 12) {
      return "morning";
    }
    if (hour >= 12 && hour < 18) {
      return "afternoon";
    }
    if (hour >= 18 && hour < 23) {
      return "evening";
    }
    return "night";
  }

  function petSeason(now) {
    var month = 0;
    try {
      month = new Date(now === undefined ? Date.now() : now).getMonth();
    } catch (error) {
      month = 0;
    }
    if (month === 11 || month <= 1) {
      return "winter";
    }
    if (month <= 4) {
      return "spring";
    }
    if (month <= 7) {
      return "summer";
    }
    return "autumn";
  }

  function petSeasonKey(season) {
    return "petSeason" + season.charAt(0).toUpperCase() + season.slice(1);
  }

  /* Purely local date math: no network, no server, no other players. */
  function petDateKey(now) {
    var date = null;
    try {
      date = new Date(now === undefined ? Date.now() : now);
    } catch (error) {
      return "";
    }
    if (date.getMonth() === 0 && date.getDate() === 1) {
      return "petDateNewYear";
    }
    if (date.getMonth() === 11 && date.getDate() === 25) {
      return "petDateHoliday";
    }
    if (date.getDate() === 1) {
      return "petDateNewMonth";
    }
    return "";
  }

  /* Evocative words the bars cannot say. */
  function petHungerWordKey() {
    if (!Pet.state) {
      return "petWordFine";
    }
    if (Pet.state.hunger >= 85) {
      return "petWordFamished";
    }
    if (Pet.state.hunger >= 65) {
      return "petWordHungry";
    }
    if (Pet.state.hunger >= 35) {
      return "petWordFine";
    }
    if (Pet.state.hunger >= 15) {
      return "petWordFull";
    }
    return "petWordBloated";
  }

  function petMoodWordKey() {
    if (!Pet.state) {
      return "petWordContent";
    }
    if (Pet.state.happiness >= 85) {
      return "petWordDelighted";
    }
    if (Pet.state.happiness >= 60) {
      return "petWordContent";
    }
    if (Pet.state.happiness >= 35) {
      return "petWordOkay";
    }
    if (Pet.state.happiness >= 15) {
      return "petWordGlum";
    }
    return "petWordMiserable";
  }

  function petTalkLine() {
    if (!Pet.state) {
      return "";
    }
    var page = document.documentElement.getAttribute("data-page") || "formatter";
    var pageKey = "petTalkPage" + page.charAt(0).toUpperCase() + page.slice(1);
    var mood = petMood();
    var time = petTimeOfDay();
    var moodKey = "petTalk" + mood.charAt(0).toUpperCase() + mood.slice(1);
    var timeKey = "petTalk" + time.charAt(0).toUpperCase() + time.slice(1);
    var seasonKey = petSeasonKey(petSeason());
    var dateKey = petDateKey();
    var prefix = dateKey ? t(dateKey) + " " : "";
    if (time === "night" && mood !== "sleepy") {
      return prefix + t(timeKey) + " " + t(seasonKey) + " " + t(pageKey);
    }
    return (
      prefix + t(moodKey) + " " + t(timeKey) + " " + t(seasonKey) + " " + t(pageKey)
    );
  }

  function petApplyDecay(now) {
    if (!Pet.state) {
      return 0;
    }
    var elapsed = now - Pet.state.lastSeen;
    Pet.state.lastSeen = now;
    if (!isFinite(elapsed) || elapsed <= 0) {
      return 0;
    }
    var hours = Math.min(elapsed, petDecayCapMs) / 3600000;
    Pet.state.happiness = petClamp(
      Pet.state.happiness - petDecayPerHour.happiness * hours,
      0,
      100,
    );
    Pet.state.hunger = petClamp(
      Pet.state.hunger + petDecayPerHour.hunger * hours,
      0,
      100,
    );
    Pet.state.energy = petClamp(
      Pet.state.energy - petDecayPerHour.energy * hours,
      0,
      100,
    );
    return hours;
  }

  function petFormatAway(hours) {
    if (hours >= 1) {
      return t("petAwayHours", { n: Math.round(hours) });
    }
    return t("petAwayMinutes", { n: Math.max(1, Math.round(hours * 60)) });
  }

  /* --- attention / grace window (Care & Return) -------------------- */

  function petCareNeedCritical(need) {
    if (!Pet.state) {
      return false;
    }
    if (need === "hunger") {
      return Pet.state.hunger >= petCareHungerMax;
    }
    return Pet.state.happiness <= petCareHappinessMin;
  }

  function petAttentionNeeds() {
    var out = [];
    petCareNeedOrder.forEach(function (need) {
      if (petCareNeedCritical(need)) {
        out.push(need);
      }
    });
    return out;
  }

  /*
   * Runs after decay, on every tick and on load. Returns the needs that just
   * logged a mistake (at most once per episode) plus the needs that recovered,
   * so a satisfied need clears its episode and can arm again later.
   */
  function petEvaluateAttention(now) {
    var result = { logged: [], recovered: [], started: false };
    if (!Pet.state) {
      return result;
    }
    if (!Pet.state.careEpisodes || typeof Pet.state.careEpisodes !== "object") {
      Pet.state.careEpisodes = {};
    }
    petCareNeedOrder.forEach(function (need) {
      var critical = petCareNeedCritical(need);
      var episode = Pet.state.careEpisodes[need];
      if (!critical) {
        if (episode) {
          delete Pet.state.careEpisodes[need];
          result.recovered.push(need);
        }
        return;
      }
      if (!episode) {
        Pet.state.careEpisodes[need] = {
          since: now,
          deadline: now + petCareGraceMs,
          logged: false,
        };
        result.started = true;
        return;
      }
      if (!episode.logged && now >= episode.deadline) {
        episode.logged = true;
        Pet.state.careMistakes =
          Math.max(0, Math.floor(petToNumber(Pet.state.careMistakes, 0))) + 1;
        result.logged.push(need);
      }
    });
    return result;
  }

  function petAttentionChanged(result) {
    return !!(
      result &&
      (result.logged.length || result.recovered.length || result.started)
    );
  }

  function petAttentionStatusText() {
    var needs = petAttentionNeeds();
    if (!needs.length || !Pet.state) {
      return "";
    }
    return needs.indexOf("hunger") !== -1
      ? t("petStatusAttentionHunger", { name: Pet.state.name })
      : t("petStatusAttentionHappiness", { name: Pet.state.name });
  }

  /* --- welcome back (a purely local catch-up, no server involved) --- */

  function petWelcomeBack(awayMs) {
    if (!Pet.state || !isFinite(awayMs) || awayMs < petAwayThresholdMs) {
      return null;
    }
    var hours = Math.min(awayMs, petDecayCapMs) / 3600000;
    var treats = petClamp(Math.round(hours), 1, petAwayRewardMax);
    var mood = petMood();
    var key = "petWelcomeBackShort";
    if (mood === "hungry") {
      key = "petWelcomeBackHungry";
    } else if (mood === "sleepy") {
      key = "petWelcomeBackSleepy";
    } else if (awayMs >= 6 * 3600000) {
      key = "petWelcomeBackLong";
    } else if (awayMs >= 2 * 3600000) {
      key = "petWelcomeBackMedium";
    }
    return {
      treats: treats,
      text: t(key, {
        name: Pet.state.name,
        n: petFormatAway(hours),
        treats: treats,
      }),
    };
  }

  /* --- streak escalation, exclusive unlock, repair ----------------- */

  function petStreakReward(streak) {
    var index =
      petClamp(Math.floor(petToNumber(streak, 1)), 1, petStreakRewards.length) - 1;
    return petStreakRewards[index];
  }

  function petGrantExclusive() {
    if (!Pet.state) {
      return false;
    }
    if (!Pet.state.streakUnlocks || typeof Pet.state.streakUnlocks !== "object") {
      Pet.state.streakUnlocks = {};
    }
    if (Pet.state.streakUnlocks.week7) {
      return false;
    }
    Pet.state.streakUnlocks.week7 = Date.now();
    /* Actually applied: the exclusive medal goes on at once and is persisted. */
    Pet.state.accessory = petExclusiveAccessory;
    return true;
  }

  function petApplyVisitReward() {
    var granted = petAddTreats(petStreakReward(Pet.state.streak));
    var unlock = false;
    if (Pet.state.streak >= petExclusiveStreak) {
      unlock = petGrantExclusive();
    }
    return { treats: granted, unlock: unlock };
  }


  /* Exported for the other modules. */
  App.petAccessoryKey = petAccessoryKey;
  App.petAccessoryUnlocked = petAccessoryUnlocked;
  App.petAchievementById = petAchievementById;
  App.petApplyDecay = petApplyDecay;
  App.petApplyVisitReward = petApplyVisitReward;
  App.petAttentionChanged = petAttentionChanged;
  App.petAttentionNeeds = petAttentionNeeds;
  App.petAttentionStatusText = petAttentionStatusText;
  App.petClamp = petClamp;
  App.petEvaluateAttention = petEvaluateAttention;
  App.petFormatAway = petFormatAway;
  App.petHueKey = petHueKey;
  App.petHueUnlocked = petHueUnlocked;
  App.petHungerWordKey = petHungerWordKey;
  App.petIsSpecies = petIsSpecies;
  App.petLearnedTrick = petLearnedTrick;
  App.petLevelProgress = petLevelProgress;
  App.petLevelValue = petLevelValue;
  App.petLocalDay = petLocalDay;
  App.petMood = petMood;
  App.petMoodKey = petMoodKey;
  App.petMoodStatusKey = petMoodStatusKey;
  App.petMoodWordKey = petMoodWordKey;
  App.petNextTrick = petNextTrick;
  App.petReadState = petReadState;
  App.petRemoveState = petRemoveState;
  App.petSanitizeName = petSanitizeName;
  App.petSeason = petSeason;
  App.petSpeciesKey = petSpeciesKey;
  App.petStageIndex = petStageIndex;
  App.petStageKey = petStageKey;
  App.petStageValue = petStageValue;
  App.petTalkLine = petTalkLine;
  App.petTimeOfDay = petTimeOfDay;
  App.petToNumber = petToNumber;
  App.petTrickKey = petTrickKey;
  App.petWelcomeBack = petWelcomeBack;
  App.petWriteState = petWriteState;
})(window.CapitalConvert = window.CapitalConvert || {});
