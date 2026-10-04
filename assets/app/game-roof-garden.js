/* Roof Garden - the idle planting mini-game in the shared game drawer. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  var t = App.t;
  var getElement = App.getElement;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  var createCampaign = App.createCampaign;
  var fillCampaignPicker = App.fillCampaignPicker;
  var starsFor = App.starsFor;
  var isMotionOff = App.isMotionOff;
  var gdnPlots = 4;
  /* Growth is read from the clock rather than a timer, so a garden keeps
   * ripening while the drawer is closed and nothing polls in the background.
   * `start` must cover one `cost` or the bed cannot be sown at all; starTimes
   * are seconds from the first sow to meeting the goal. */
  var gdnBeds = [
    { id: "g1", labelKey: "gdnB1", cost: 5, crop: 8, start: 12, growMs: 12000, goal: 60, starTimes: [95, 140, 210] },
    { id: "g2", labelKey: "gdnB2", cost: 8, crop: 14, start: 20, growMs: 16000, goal: 140, starTimes: [160, 230, 340] },
    { id: "g3", labelKey: "gdnB3", cost: 12, crop: 22, start: 28, growMs: 21000, goal: 280, starTimes: [240, 340, 490] },
    { id: "g4", labelKey: "gdnB4", cost: 18, crop: 34, start: 40, growMs: 27000, goal: 520, starTimes: [390, 540, 760] },
    { id: "g5", labelKey: "gdnB5", cost: 26, crop: 50, start: 56, growMs: 34000, goal: 880, starTimes: [560, 760, 1060] },
  ];

  function gdnRipe(plots, index, now, bed) {
    return plots[index] > 0 && now - plots[index] >= bed.growMs;
  }

  /* Greedy floor: always sow whenever a plot is free and coins allow. */
  function gdnSecondsToGoal(bed) {
    var coins = bed.start;
    var busy = [0, 0, 0, 0];
    var now = 0;
    var stepMs = 1000;
    var ticks = 0;
    while (coins < bed.goal && ticks < 20000) {
      for (var index = 0; index < gdnPlots; index += 1) {
        if (busy[index] && now >= busy[index]) {
          coins += bed.crop;
          busy[index] = 0;
        }
        if (!busy[index] && coins >= bed.cost) {
          coins -= bed.cost;
          busy[index] = now + bed.growMs / stepMs;
        }
      }
      now += 1;
      ticks += 1;
    }
    return coins >= bed.goal ? now : -1;
  }

  function initRoofGardenGame() {
    var plotsEl = getElement("gdnPlots");
    var coinsEl = getElement("gdnCoinsStat");
    var busyEl = getElement("gdnBusyStat");
    var resultEl = getElement("gdnResult");
    var resetBtn = getElement("gdnResetBtn");
    var bestEl = getElement("gdnBest");
    var bedEl = getElement("gdnBedSel");
    if (!plotsEl || !coinsEl || !busyEl || !resultEl || !resetBtn || !bestEl || !bedEl) {
      return;
    }

    var campaign = createCampaign({ key: "roof-garden-campaign", levels: gdnBeds });
    var bed = gdnBeds[campaign.indexOf(campaign.nextLevelId())];
    var plots = [0, 0, 0, 0];
    var coins = bed.start;
    var startedAt = 0;
    var done = false;
    var nodes = [];

    function renderHud() {
      coinsEl.textContent = String(coins);
      var growing = plots.filter(function (planted) {
        return planted > 0;
      }).length;
      busyEl.textContent = String(growing);
    }

    /* The bar and the bloom are driven by a CSS animation timed to the grow
     * window, so ripeness shows up without a timer of ours polling the clock. */
    function ripen(index) {
      var node = nodes[index];
      if (isMotionOff()) {
        return;
      }
      node.style.setProperty("--gdn-run", bed.growMs + "ms");
      node.classList.remove("is-ripening");
      void node.offsetWidth;
      node.classList.add("is-ripening");
    }

    function renderPlots() {
      var now = Date.now();
      nodes.forEach(function (node, index) {
        var planted = plots[index];
        var state = !planted ? "Empty" : gdnRipe(plots, index, now, bed) ? "Ripe" : "Growing";
        node.className =
          "gdn-plot is-" +
          state.toLowerCase() +
          (state === "Growing" && node.classList.contains("is-ripening")
            ? " is-ripening"
            : "");
        node.querySelector(".gdn-sprite").textContent =
          state === "Ripe" ? "\uD83C\uDF3B" : state === "Growing" ? "\uD83C\uDF31" : "\u00B7";
        node.setAttribute(
          "aria-label",
          t("gdnPlotAria", { n: index + 1, state: t("gdnState" + state) }),
        );
      });
      renderHud();
    }

    function buildPlots() {
      plotsEl.textContent = "";
      nodes = [];
      for (var index = 0; index < gdnPlots; index += 1) {
        var plot = document.createElement("button");
        plot.type = "button";
        plot.className = "gdn-plot";
        var sprite = document.createElement("span");
        sprite.className = "gdn-sprite";
        var bloom = document.createElement("span");
        bloom.className = "gdn-bloom";
        bloom.textContent = "\uD83C\uDF3B";
        bloom.setAttribute("aria-hidden", "true");
        var bar = document.createElement("span");
        bar.className = "gdn-bar";
        plot.appendChild(sprite);
        plot.appendChild(bloom);
        plot.appendChild(bar);
        (function (cell) {
          plot.addEventListener("click", function () {
            tend(cell);
          });
        })(index);
        plotsEl.appendChild(plot);
        nodes.push(plot);
      }
      renderPlots();
    }

    function refreshBed() {
      fillCampaignPicker(
        bedEl,
        campaign,
        function (def) {
          return t(def.labelKey);
        },
        t("elementsLocked"),
      );
      bedEl.value = bed.id;
      bestEl.textContent = t("campaignStars", {
        n: campaign.totalStars(),
        max: campaign.maxStars(),
      });
    }

    function finish() {
      done = true;
      var seconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
      var starsWon = starsFor(seconds, bed.starTimes, "low");
      var outcome = campaign.record(bed.id, {
        stars: starsWon,
        best: seconds,
        better: "low",
      });
      var message =
        t("gdnGoalMet", { n: seconds, goal: bed.goal, s: starsWon }) +
        (outcome.isBest ? " " + t("newBest") : "");
      if (outcome.unlockedNext) {
        message += " " + t("gdnNextBed");
      } else if (campaign.clearedCount() === gdnBeds.length) {
        message += " " + t("gdnAllBeds");
      }
      resultEl.textContent = message;
      logAction(t("logGarden", { n: coins }));
      var rect = resetBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      refreshBed();
      renderPlots();
    }

    function tend(index) {
      if (done) {
        return;
      }
      var now = Date.now();
      if (!startedAt) {
        startedAt = now;
      }
      if (plots[index]) {
        if (!gdnRipe(plots, index, now, bed)) {
          resultEl.textContent = t("gdnNotRipe");
          return;
        }
        coins += bed.crop;
        plots[index] = 0;
        renderPlots();
        if (coins >= bed.goal) {
          finish();
          return;
        }
        resultEl.textContent = t("gdnHarvested", { n: bed.crop, coins: coins });
        return;
      }
      if (coins < bed.cost) {
        resultEl.textContent = t("gdnTooPoor", { n: bed.cost });
        return;
      }
      coins -= bed.cost;
      plots[index] = now;
      renderPlots();
      ripen(index);
      resultEl.textContent = t("gdnSowed", { n: bed.cost, coins: coins });
    }

    function loadBed(bedDef) {
      bed = bedDef || bed;
      plots = [0, 0, 0, 0];
      coins = bed.start;
      startedAt = 0;
      done = false;
      buildPlots();
      refreshBed();
      resultEl.textContent = t("gdnPrompt", {
        name: t(bed.labelKey),
        goal: bed.goal,
        secs: Math.round(bed.growMs / 1000),
      });
    }

    resetBtn.addEventListener("click", function () {
      loadBed();
    });

    bedEl.addEventListener("change", function () {
      var index = campaign.indexOf(bedEl.value);
      if (index >= 0 && campaign.isUnlocked(bedEl.value)) {
        loadBed(gdnBeds[index]);
      }
    });

    loadBed(bed);
  }


  /* Exported for the other modules. */
  App.gardenSecondsToGoal = gdnSecondsToGoal;
  App.gardenRipe = gdnRipe;
  App.initRoofGardenGame = initRoofGardenGame;
})(window.CapitalConvert = window.CapitalConvert || {});
