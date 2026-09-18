/* Shared campaign core - level lists, unlock chains, star ratings, and versioned progress storage. No timers; safe to run headless. */
(function (App) {
  /* Stars from a value against [3-star, 2-star, 1-star] thresholds.
   * better: "high" means bigger values are better, "low" means smaller. */
  function starsFor(value, thresholds, better) {
    if (!thresholds || thresholds.length < 3) {
      return value > 0 ? 1 : 0;
    }
    if (better === "low") {
      if (value <= thresholds[0]) {
        return 3;
      }
      if (value <= thresholds[1]) {
        return 2;
      }
      return value <= thresholds[2] ? 1 : 0;
    }
    if (value >= thresholds[0]) {
      return 3;
    }
    if (value >= thresholds[1]) {
      return 2;
    }
    return value >= thresholds[2] ? 1 : 0;
  }

  /* One campaign = an ordered level list plus a versioned storage record:
   * { v, cleared: { levelId: { stars, best } } }. A level unlocks when the
   * one before it is cleared, so the chain is derived, never stored. */
  function createCampaign(options) {
    var levels = options.levels || [];
    var key = options.key;
    var version = options.version || 1;
    /* Node (the static checks) has no localStorage: the campaign then runs
     * in memory, which is exactly the headless-test mode. */
    var store = typeof localStorage !== "undefined" ? localStorage : null;
    var progress = read();

    function read() {
      var raw = "";
      try {
        raw = (store && store.getItem(key)) || "";
      } catch (error) {
        raw = "";
      }
      if (!raw) {
        return { v: version, cleared: {} };
      }
      try {
        var parsed = JSON.parse(String(raw));
        if (
          parsed &&
          typeof parsed === "object" &&
          parsed.v === version &&
          parsed.cleared &&
          typeof parsed.cleared === "object"
        ) {
          return parsed;
        }
      } catch (error) {
        /* a corrupt or foreign record starts the campaign fresh */
      }
      return { v: version, cleared: {} };
    }

    function save() {
      try {
        if (store) {
          store.setItem(key, JSON.stringify(progress));
        }
      } catch (error) {
        /* unrecorded progress is survivable */
      }
    }

    function indexOf(id) {
      for (var index = 0; index < levels.length; index += 1) {
        if (levels[index].id === id) {
          return index;
        }
      }
      return -1;
    }

    function entry(id) {
      return progress.cleared[id] || null;
    }

    function isCleared(id) {
      return !!entry(id);
    }

    function isUnlocked(id) {
      var index = indexOf(id);
      if (index <= 0) {
        return index === 0;
      }
      return isCleared(levels[index - 1].id);
    }

    function stars(id) {
      var record = entry(id);
      var value = record ? parseInt(record.stars, 10) : 0;
      return isNaN(value) ? 0 : Math.min(3, Math.max(0, value));
    }

    function best(id) {
      var record = entry(id);
      var value = record ? parseInt(record.best, 10) : 0;
      return isNaN(value) ? 0 : value;
    }

    function clearedCount() {
      return levels.filter(function (level) {
        return isCleared(level.id);
      }).length;
    }

    function totalStars() {
      return levels.reduce(function (sum, level) {
        return sum + stars(level.id);
      }, 0);
    }

    function maxStars() {
      return levels.length * 3;
    }

    /* The level a fresh session should play: the first uncleared one, or
     * the last level once the whole campaign is done. */
    function nextLevelId() {
      for (var index = 0; index < levels.length; index += 1) {
        if (!isCleared(levels[index].id)) {
          return levels[index].id;
        }
      }
      return levels.length ? levels[levels.length - 1].id : null;
    }

    /* result: { stars, best, better } - keeps the best-of-each-attempt
     * record and the best stars, and reports what this run changed. */
    function record(id, result) {
      var current = entry(id) || { stars: 0, best: 0 };
      var isBest = false;
      if (typeof result.best === "number" && result.best > 0) {
        var better = result.better === "low";
        if (
          !current.best ||
          (better ? result.best < current.best : result.best > current.best)
        ) {
          current.best = result.best;
          isBest = true;
        }
      }
      var firstClear = !isCleared(id);
      current.stars = Math.max(current.stars || 0, result.stars || 0);
      progress.cleared[id] = current;
      save();
      var index = indexOf(id);
      return {
        isBest: isBest,
        firstClear: firstClear,
        unlockedNext:
          firstClear && index >= 0 && index + 1 < levels.length
            ? levels[index + 1].id
            : null,
      };
    }

    return {
      levels: levels,
      indexOf: indexOf,
      isCleared: isCleared,
      isUnlocked: isUnlocked,
      stars: stars,
      best: best,
      clearedCount: clearedCount,
      totalStars: totalStars,
      maxStars: maxStars,
      nextLevelId: nextLevelId,
      record: record,
    };
  }

  /* Shared picker filler: every campaign select reads the same way -
   * "label · ★★☆", or the locked word when the chain has not reached it. */
  function starDots(campaign, id) {
    var value = campaign.stars(id);
    var dots = "";
    for (var index = 0; index < 3; index += 1) {
      dots += index < value ? "\u2605" : "\u2606";
    }
    return dots;
  }

  function fillCampaignPicker(select, campaign, labelFor, lockedText) {
    if (!select || !campaign) {
      return;
    }
    select.textContent = "";
    campaign.levels.forEach(function (level) {
      var option = document.createElement("option");
      option.value = level.id;
      option.textContent = campaign.isUnlocked(level.id)
        ? labelFor(level) + " \u00b7 " + starDots(campaign, level.id)
        : labelFor(level) + " \u00b7 " + lockedText;
      option.disabled = !campaign.isUnlocked(level.id);
      select.appendChild(option);
    });
  }

  /* Exported for the other modules. */
  App.starsFor = starsFor;
  App.createCampaign = createCampaign;
  App.fillCampaignPicker = fillCampaignPicker;
})(window.CapitalConvert = window.CapitalConvert || {});
