/* Stack! - The drop-and-trim tower mini-game in the shared game drawer. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  var t = App.t;
  var getElement = App.getElement;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  var stackBestKey = "stack-tower-best";
  var stackBlockH = 18;
  var stackBaseW = 96;
  var stackMinW = 14;
  var stackPerfectTol = 5;
  var stackBaseSpeed = 88;
  var stackSpeedGain = 3.2;
  var stackMaxSpeed = 260;
  var stackVisible = 9;
  var stackTickMs = 16;
  var stackPalette = [
    "#22d3ee",
    "#fbbf24",
    "#f472b6",
    "#a3e635",
    "#a78bfa",
    "#e2e8f0",
  ];

  function initStackGame() {
    var field = getElement("stackField");
    var towerEl = getElement("stackTower");
    var blockEl = getElement("stackBlock");
    var heightEl = getElement("stackHeight");
    var streakEl = getElement("stackStreak");
    var bestStatEl = getElement("stackBestStat");
    var resultEl = getElement("stackResult");
    var startBtn = getElement("stackStartBtn");
    var bestEl = getElement("stackBest");
    if (
      !field ||
      !towerEl ||
      !blockEl ||
      !heightEl ||
      !streakEl ||
      !bestStatEl ||
      !resultEl ||
      !startBtn ||
      !bestEl
    ) {
      return;
    }

    var blocks = [];
    var running = false;
    var intervalId = null;
    var sliderX = 0;
    var sliderW = stackBaseW;
    var dir = 1;
    var streak = 0;

    function fieldW() {
      return field.clientWidth || 360;
    }

    function readBest() {
      var value = parseInt(localStorage.getItem(stackBestKey), 10);
      return isNaN(value) ? 0 : value;
    }

    function renderBest() {
      var best = readBest();
      bestStatEl.textContent = String(best);
      bestEl.textContent = best ? String(best) : t("noBest");
    }

    function cameraShift() {
      return Math.max(0, blocks.length - stackVisible) * stackBlockH;
    }

    function blockBottom(index) {
      return index * stackBlockH - cameraShift();
    }

    function paintBlock(node, block, index) {
      node.style.left = block.x + "px";
      node.style.width = Math.max(4, block.w) + "px";
      node.style.bottom = blockBottom(index) + "px";
      node.style.background = stackPalette[block.tint % stackPalette.length];
    }

    function renderTower() {
      towerEl.textContent = "";
      for (var index = 0; index < blocks.length; index += 1) {
        var node = document.createElement("span");
        node.className = "stack-tile";
        paintBlock(node, blocks[index], index);
        towerEl.appendChild(node);
      }
      var top = blocks[blocks.length - 1];
      blockEl.hidden = false;
      blockEl.style.background = stackPalette[top.tint % stackPalette.length];
    }

    function currentSpeed() {
      return Math.min(
        stackMaxSpeed,
        stackBaseSpeed + blocks.length * stackSpeedGain,
      );
    }

    function spawnSlider() {
      var top = blocks[blocks.length - 1];
      sliderW = top.w;
      dir = blocks.length % 2 === 0 ? 1 : -1;
      sliderX = dir === 1 ? -sliderW : fieldW();
      blockEl.style.width = sliderW + "px";
      blockEl.style.left = sliderX + "px";
      blockEl.style.bottom = blockBottom(blocks.length) + "px";
    }

    function resetBoard() {
      window.clearInterval(intervalId);
      intervalId = null;
      running = false;
      streak = 0;
      blocks = [
        {
          x: (fieldW() - stackBaseW) / 2,
          w: stackBaseW,
          tint: Math.floor(Math.random() * stackPalette.length),
        },
      ];
      renderTower();
      heightEl.textContent = "0";
      streakEl.textContent = "0";
      renderBest();
      resultEl.textContent = t("stackPrompt");
    }

    function startRound() {
      resetBoard();
      running = true;
      spawnSlider();
      resultEl.textContent = t("stackGo");
      intervalId = window.setInterval(tick, stackTickMs);
      field.focus();
    }

    function gameOver() {
      window.clearInterval(intervalId);
      intervalId = null;
      running = false;
      blockEl.hidden = true;

      var height = blocks.length - 1;
      var previousBest = readBest();
      var isBest = height > 0 && height > previousBest;
      if (isBest) {
        localStorage.setItem(stackBestKey, String(height));
      }
      resultEl.textContent =
        t("stackOver", { n: height }) + (isBest ? " " + t("newBest") : "");
      renderBest();
      logAction(t("logStack", { n: height }));

      if (isBest) {
        var rect = startBtn.getBoundingClientRect();
        createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      }
      petNotifyGame(isBest);
    }

    function tick() {
      if (!running) {
        return;
      }
      sliderX += dir * (currentSpeed() * stackTickMs) / 1000;
      var maxX = fieldW() - sliderW;
      if (sliderX <= -sliderW * 0.4 && dir < 0) {
        dir = 1;
      } else if (sliderX >= maxX + sliderW * 0.4 && dir > 0) {
        dir = -1;
      }
      blockEl.style.left = sliderX + "px";
    }

    function drop() {
      if (!running) {
        return;
      }
      var top = blocks[blocks.length - 1];
      var left = Math.max(sliderX, top.x);
      var right = Math.min(sliderX + sliderW, top.x + top.w);
      var overlap = right - left;

      if (overlap < stackMinW) {
        gameOver();
        return;
      }

      var perfect = Math.abs(sliderX - top.x) <= stackPerfectTol;
      if (perfect) {
        streak += 1;
        blocks.push({ x: top.x, w: top.w, tint: top.tint + 1 });
        resultEl.textContent = t("stackPerfect", { n: streak });
      } else {
        streak = 0;
        blocks.push({ x: left, w: overlap, tint: top.tint + 1 });
      }

      heightEl.textContent = String(blocks.length - 1);
      streakEl.textContent = String(streak);
      renderTower();
      spawnSlider();
    }

    startBtn.addEventListener("click", startRound);
    field.addEventListener("click", drop);
    field.addEventListener("keydown", function (event) {
      if (event.key === " " || event.key === "Enter" || event.key === "ArrowDown") {
        event.preventDefault();
        drop();
      }
    });

    App.quietResetStack = function () {
      if (running) {
        resetBoard();
      }
    };

    resetBoard();
  }


  /* Exported for the other modules. */
  App.initStackGame = initStackGame;
})(window.CapitalConvert = window.CapitalConvert || {});
