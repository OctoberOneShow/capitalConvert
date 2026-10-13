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
   * are seconds from the first sow to meeting the goal.
   *
   * Three of these fields set the shape of a rung, and cost alone does not:
   * Math.floor(start / cost) is how many of the four plots sow on tick zero,
   * crop / cost is what a harvest pays back on its seed, and growMs is both the
   * wait and the length of the animation that draws it. Rungs 1-5 all open two
   * plots, return under two for one and grow the wait with the goal, so they
   * read as one curve. Rungs 6-10 break one lever each instead of scaling the
   * ladder, which is why their three-star lines are not comparable across beds:
   * a bigger goal can still be the quicker bed. */
  var gdnBeds = [
    { id: "g1", labelKey: "gdnB1", cost: 5, crop: 8, start: 12, growMs: 12000, goal: 60, starTimes: [95, 140, 210] },
    { id: "g2", labelKey: "gdnB2", cost: 8, crop: 14, start: 20, growMs: 16000, goal: 140, starTimes: [160, 230, 340] },
    { id: "g3", labelKey: "gdnB3", cost: 12, crop: 22, start: 28, growMs: 21000, goal: 280, starTimes: [240, 340, 490] },
    { id: "g4", labelKey: "gdnB4", cost: 18, crop: 34, start: 40, growMs: 27000, goal: 520, starTimes: [390, 540, 760] },
    { id: "g5", labelKey: "gdnB5", cost: 26, crop: 50, start: 56, growMs: 34000, goal: 880, starTimes: [560, 760, 1060] },
    /* Opens all four plots on tick zero and leaves the pocket empty: the board,
     * not the money, sets the pace, so this rung banks a goal larger than any
     * before it in barely over half the clock rung 5 needs, on 24 harvests
     * against rung 5's 42. */
    { id: "g6", labelKey: "gdnB6", cost: 32, crop: 96, start: 128, growMs: 30000, goal: 1500, starTimes: [215, 295, 400] },
    /* One vine at a time: start covers a single sowing, the turnover is the
     * fattest on the ladder and the window is the longest, so the run is a
     * handful of huge harvests instead of a grind of small ones. */
    { id: "g7", labelKey: "gdnB7", cost: 44, crop: 198, start: 66, growMs: 72000, goal: 2200, starTimes: [420, 570, 800] },
    /* The even ledger: the harvest is exactly three seeds and the goal is
     * exactly twenty harvests, the one rung whose seed, crop and target divide
     * into each other, so a playthrough crosses on a ripe plot with the bank
     * landing on the number itself and not a coin over it. */
    { id: "g8", labelKey: "gdnB8", cost: 56, crop: 168, start: 168, growMs: 36000, goal: 3360, starTimes: [340, 460, 650] },
    /* The market garden: an eighteen-second window and two seeds back per seed
     * sown, so a plot is worth three percent of the target - the thinnest
     * harvest on the ladder. It takes four times the crops rung 7 asks for on
     * twice its goal, and reads as a long chain of cheap rounds. */
    { id: "g9", labelKey: "gdnB9", cost: 66, crop: 132, start: 132, growMs: 18000, goal: 4400, starTimes: [380, 515, 720] },
    /* The capstone starts on the exact edge of the sowing rule, start equal to
     * cost, so tick zero is one plot and an empty pocket and only a harvest can
     * widen the board; it is the longest run in the garden and the deepest
     * target, more than seventy-five of its own seeds. */
    { id: "g10", labelKey: "gdnB10", cost: 78, crop: 273, start: 78, growMs: 54000, goal: 6000, starTimes: [570, 770, 1080] },
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


  /* Bilingual copy travels with the game: addStrings only fills keys i18n.js
   * does not already own, and the shared dictionary named rungs 1-5 first, so
   * only the five new beds ride here. */
  App.addStrings({
    en: {
      "gdnB6": "Greenhouse Row",
      "gdnB7": "Tower Trellis",
      "gdnB8": "Cloud Terrace",
      "gdnB9": "Stratosphere Plot",
      "gdnB10": "Star Canopy",
    },
    zh: {
      "gdnB6": "\u6e29\u5ba4\u5784",
      "gdnB7": "\u5854\u67b6\u85e4",
      "gdnB8": "\u4e91\u9732\u53f0",
      "gdnB9": "\u5e73\u6d41\u7566",
      "gdnB10": "\u661f\u51a0\u56ed",
    },
  });

  /* Exported for the other modules. */
  App.gardenSecondsToGoal = gdnSecondsToGoal;
  App.gardenRipe = gdnRipe;
  App.initRoofGardenGame = initRoofGardenGame;
})(window.CapitalConvert = window.CapitalConvert || {});
