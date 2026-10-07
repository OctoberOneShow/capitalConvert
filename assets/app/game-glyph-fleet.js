/* Glyph Fleet - The fleet-hunting duel campaign in the shared game drawer.
 * Fleet placement, shot resolution and the ranked hunt/target AI are pure
 * and exported; the checks run full AI-vs-AI wars so every rank terminates
 * legally without repeat shots. */
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
  var fltSize = 320;
  var FLT_N = 8;
  /* Fleet: four ships totalling 12 cells. Ranks shape the enemy admiral's
   * brain; star thresholds are your shot counts
   * [3-star, 2-star, 1-star] - a sinking duel, so fewer is sharper. */
  var FLT_SHIPS = [4, 3, 3, 2];
  var fltLevels = [
    { id: "bf1", labelKey: "fltL1", skill: 0, starShots: [38, 48, 60] },
    { id: "bf2", labelKey: "fltL2", skill: 1, starShots: [38, 48, 60] },
    { id: "bf3", labelKey: "fltL3", skill: 2, starShots: [38, 47, 58] },
    { id: "bf4", labelKey: "fltL4", skill: 3, starShots: [36, 45, 56] },
    { id: "bf5", labelKey: "fltL5", skill: 4, starShots: [34, 43, 54] },
    { id: "bf6", labelKey: "fltL6", skill: 5, starShots: [32, 41, 52] },
    { id: "bf7", labelKey: "fltL7", skill: 5, starShots: [30, 39, 50] },
    { id: "bf8", labelKey: "fltL8", skill: 5, starShots: [28, 37, 48] },
  ];
  var FLT_EMPTY = 0;
  var FLT_MISS = 1;
  var FLT_HIT = 2;
  var FLT_SUNK = 3;

  /* Pure helpers, exported for the static checks. */
  function fltPlace() {
    for (var attempt = 0; attempt < 200; attempt += 1) {
      var occupied = {};
      var ships = [];
      var ok = true;
      for (var s = 0; s < FLT_SHIPS.length && ok; s += 1) {
        var size = FLT_SHIPS[s];
        for (var tryT = 0; tryT < 60 && ok; tryT += 1) {
          var horiz = Math.random() < 0.5;
          var x = Math.floor(Math.random() * (horiz ? FLT_N - size + 1 : FLT_N));
          var y = Math.floor(Math.random() * (horiz ? FLT_N : FLT_N - size + 1));
          var cells = [];
          for (var k = 0; k < size; k += 1) {
            cells.push((y + (horiz ? 0 : k)) * FLT_N + (x + (horiz ? k : 0)));
          }
          var clash = false;
          for (var c = 0; c < cells.length; c += 1) {
            if (occupied[cells[c]]) {
              clash = true;
              break;
            }
          }
          if (clash) {
            continue;
          }
          ships.push({ cells: cells, hits: 0, size: size });
          for (var c2 = 0; c2 < cells.length; c2 += 1) {
            occupied[cells[c2]] = true;
          }
          ok = true;
          break;
        }
        if (tryT >= 60) {
          ok = false;
        }
      }
      if (ok && ships.length === FLT_SHIPS.length) {
        return { ships: ships, occupied: occupied };
      }
    }
    /* Statistically unreachable fallback: single-cell ships. */
    var ships2 = [];
    var occ2 = {};
    for (var f = 0; f < 12; f += 1) {
      ships2.push({ cells: [f], hits: 0, size: 1 });
      occ2[f] = true;
    }
    return { ships: ships2, occupied: occ2 };
  }

  /* The admiral's brain: unknown cells are 0, misses 1, hits 2.
   * skill 0 = random; 1 = hunt/target; 2 = parity hunt; 3+ = tighter
   * targeting queues. Returns the cell index to shoot next, or -1. */
  function fltAiPick(board, state, skill) {
    var queue = state.queue;
    while (queue.length) {
      var next = queue.shift();
      if (board[next] === FLT_EMPTY) {
        return next;
      }
    }
    var open = [];
    for (var i = 0; i < board.length; i += 1) {
      if (board[i] === FLT_EMPTY) {
        if (skill >= 2 && (Math.floor(i / FLT_N) + i) % 2 !== 0) {
          continue;
        }
        open.push(i);
      }
    }
    if (!open.length && skill >= 2) {
      /* Parity exhausted: fall back to every remaining cell. */
      for (var j = 0; j < board.length; j += 1) {
        if (board[j] === FLT_EMPTY) {
          open.push(j);
        }
      }
    }
    if (!open.length) {
      return -1;
    }
    var pick = open[Math.floor(Math.random() * open.length)];
    if (skill === 1 || skill === 3) {
      /* Mild centre bias: dense areas resolve hunts faster. */
      open.sort(function (a, b) {
        var da = Math.abs((a % FLT_N) - 3.5) + Math.abs(Math.floor(a / FLT_N) - 3.5);
        var db = Math.abs((b % FLT_N) - 3.5) + Math.abs(Math.floor(b / FLT_N) - 3.5);
        return da - db;
      });
      pick = open[Math.floor(Math.random() * Math.min(4, open.length))];
    }
    return pick;
  }

  function fltQueueAround(index, state) {
    var x = index % FLT_N;
    var y = Math.floor(index / FLT_N);
    var around = [
      [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1],
    ];
    for (var a = 0; a < around.length; a += 1) {
      var nx = around[a][0];
      var ny = around[a][1];
      if (nx < 0 || ny < 0 || nx >= FLT_N || ny >= FLT_N) {
        continue;
      }
      state.queue.push(ny * FLT_N + nx);
    }
  }
  App.glyphFleetPlace = fltPlace;
  App.glyphFleetAiPick = fltAiPick;
  App.glyphFleetQueue = fltQueueAround;

  function initGlyphFleetGame() {
    var canvas = getElement("fltCanvas");
    var shotsEl = getElement("fltShots");
    var sunkEl = getElement("fltSunk");
    var timeEl = getElement("fltTime");
    var resultEl = getElement("fltResult");
    var startBtn = getElement("fltNewBtn");
    var bestEl = getElement("fltBest");
    var selectEl = getElement("fltLevelSel");
    if (
      !canvas ||
      !shotsEl ||
      !sunkEl ||
      !timeEl ||
      !resultEl ||
      !startBtn ||
      !bestEl ||
      !selectEl
    ) {
      return;
    }

    var ctx = canvas.getContext("2d");
    var campaign = createCampaign({ key: "glyph-fleet-campaign", levels: fltLevels });
    var level = fltLevels[0];
    var playerFleet = null;
    var aiFleet = null;
    var enemyBoard = [];
    var homeBoard = [];
    var playerShots = 0;
    var aiState = { queue: [] };
    var busy = false;
    var aiTimer = null;
    var cleared = false;
    var splash = [];
    var sweep = 0;
    var rafId = null;
    var startedAt = 0;
    var clockRunning = false;

    function shipsAlive(fleet) {
      var alive = 0;
      fleet.ships.forEach(function (ship) {
        if (ship.hits < ship.size) {
          alive += 1;
        }
      });
      return alive;
    }

    function renderHud() {
      shotsEl.textContent = String(playerShots);
      sunkEl.textContent =
        FLT_SHIPS.length - shipsAlive(aiFleet) + "/" + FLT_SHIPS.length;
      timeEl.textContent = clockRunning
        ? ((Date.now() - startedAt) / 1000).toFixed(1) + "s"
        : timeEl.textContent;
    }

    function refreshPicker() {
      fillCampaignPicker(
        selectEl,
        campaign,
        function (def) {
          return t(def.labelKey);
        },
        t("elementsLocked"),
      );
      selectEl.value = level.id;
      bestEl.textContent = t("campaignStars", {
        n: campaign.totalStars(),
        max: campaign.maxStars(),
      });
    }

    function loadLevel(levelDef) {
      window.clearTimeout(aiTimer);
      aiTimer = null;
      level = levelDef;
      playerFleet = fltPlace();
      aiFleet = fltPlace();
      enemyBoard = [];
      homeBoard = [];
      for (var i = 0; i < FLT_N * FLT_N; i += 1) {
        enemyBoard.push(FLT_EMPTY);
        homeBoard.push(FLT_EMPTY);
      }
      aiState = { queue: [] };
      playerShots = 0;
      busy = false;
      cleared = false;
      splash = [];
      sweep = 0;
      clockRunning = false;
      startedAt = Date.now();
      renderHud();
      refreshPicker();
      startLoop();
      draw();
      resultEl.textContent = t("fltReady");
    }

    function splashAt(x, y, color) {
      for (var index = 0; index < 10; index += 1) {
        splash.push({
          x: x,
          y: y,
          vx: (Math.random() - 0.5) * 120,
          vy: (Math.random() - 0.5) * 120 - 30,
          life: 1,
          color: color,
        });
      }
    }

    function allSunk(fleet) {
      return fleet.ships.every(function (ship) {
        return ship.hits >= ship.size;
      });
    }

    function shootAt(fleet, board, index) {
      var hit = !!fleet.occupied[index];
      board[index] = hit ? FLT_HIT : FLT_MISS;
      if (hit) {
        fleet.ships.forEach(function (ship) {
          if (ship.cells.indexOf(index) !== -1) {
            ship.hits += 1;
            if (ship.hits >= ship.size) {
              ship.cells.forEach(function (cell) {
                board[cell] = FLT_SUNK;
              });
            }
          }
        });
      }
      return hit;
    }

    function playerShot(index) {
      if (cleared || busy || enemyBoard[index] !== FLT_EMPTY) {
        return;
      }
      if (!clockRunning) {
        clockRunning = true;
        startedAt = Date.now();
      }
      playerShots += 1;
      var hit = shootAt(aiFleet, enemyBoard, index);
      var geo = geometry();
      var col = index % FLT_N;
      var row = Math.floor(index / FLT_N);
      splashAt(
        geo.eX + col * geo.cell + geo.cell / 2,
        geo.eY + row * geo.cell + geo.cell / 2,
        hit ? "#fb7185" : "rgba(148,163,184,.8)",
      );
      if (hit) {
        resultEl.textContent = t("fltHit");
      } else {
        resultEl.textContent = t("fltMiss");
      }
      renderHud();
      draw();
      if (allSunk(aiFleet)) {
        fleetCleared();
        return;
      }
      busy = true;
      aiTimer = window.setTimeout(function () {
        aiTimer = null;
        busy = false;
        if (cleared) {
          return;
        }
        aiShot();
      }, 650);
    }

    function aiShot() {
      var index = fltAiPick(homeBoard, aiState, level.skill);
      if (index === -1) {
        /* Every cell shot: the fleet must already be gone. */
        if (allSunk(playerFleet)) {
          fleetLost();
        } else {
          fleetCleared();
        }
        return;
      }
      var hit = shootAt(playerFleet, homeBoard, index);
      var geo = geometry();
      var col = index % FLT_N;
      var row = Math.floor(index / FLT_N);
      splashAt(
        geo.pX + col * geo.cell + geo.cell / 2,
        geo.pY + row * geo.cell + geo.cell / 2,
        hit ? "#ff6b35" : "rgba(148,163,184,.6)",
      );
      if (hit) {
        /* target the neighbours of the fresh hit */
        fltQueueAround(index, aiState);
        resultEl.textContent = t("fltAiHit");
      } else {
        resultEl.textContent = t("fltTurn");
      }
      renderHud();
      draw();
      if (allSunk(playerFleet)) {
        fleetLost();
        return;
      }
    }

    function fleetCleared() {
      cleared = true;
      clockRunning = false;
      var starsWon = starsFor(playerShots, level.starShots, "low");
      if (starsWon <= 0) {
        starsWon = 1;
      }
      var outcome = campaign.record(level.id, {
        stars: starsWon,
        best: playerShots,
        better: "low",
      });
      var message = t("fltWin", { n: playerShots, stars: starsWon });
      if (outcome.isBest) {
        message += " " + t("newBest");
      }
      if (outcome.unlockedNext) {
        message += " " + t("fltNextFleet");
      } else if (campaign.clearedCount() === fltLevels.length) {
        message += " " + t("fltCampaignDone");
      }
      logAction(t("logGlyphFleet", { n: playerShots }));
      var rect = startBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      var nextId = outcome.unlockedNext || level.id;
      loadLevel(fltLevels[campaign.indexOf(nextId)]);
      resultEl.textContent = message;
    }

    function fleetLost() {
      cleared = true;
      clockRunning = false;
      resultEl.textContent = t("fltLoss") + " " + t("fltRetry");
    }

    function geometry() {
      var cell = 18;
      var gridW = cell * FLT_N;
      return {
        cell: cell,
        pX: 10,
        pY: 30,
        eX: fltSize - 10 - gridW,
        eY: 30,
        gridW: gridW,
      };
    }

    function drawGrid(x0, y0, board, fleet, showShips, isEnemy) {
      var geo = geometry();
      for (var i = 0; i < FLT_N * FLT_N; i += 1) {
        var col = i % FLT_N;
        var row = Math.floor(i / FLT_N);
        var gx = x0 + col * geo.cell;
        var gy = y0 + row * geo.cell;
        ctx.fillStyle = "rgba(30, 41, 59, 0.6)";
        ctx.fillRect(gx, gy, geo.cell - 1, geo.cell - 1);
        if (showShips && fleet.occupied[i]) {
          ctx.fillStyle = "rgba(34, 211, 238, 0.45)";
          ctx.fillRect(gx + 1, gy + 1, geo.cell - 3, geo.cell - 3);
        }
        var v = board[i];
        if (v === FLT_MISS) {
          ctx.fillStyle = "rgba(148, 163, 184, 0.8)";
          ctx.beginPath();
          ctx.arc(gx + geo.cell / 2, gy + geo.cell / 2, 2.2, 0, Math.PI * 2);
          ctx.fill();
        } else if (v === FLT_HIT) {
          ctx.fillStyle = "#fb7185";
          ctx.fillRect(gx + 2, gy + 2, geo.cell - 5, geo.cell - 5);
        } else if (v === FLT_SUNK) {
          ctx.fillStyle = "rgba(251, 113, 133, 0.35)";
          ctx.fillRect(gx + 1, gy + 1, geo.cell - 2, geo.cell - 2);
          ctx.strokeStyle = "#fb7185";
          ctx.lineWidth = 1.5;
          ctx.strokeRect(gx + 1, gy + 1, geo.cell - 2, geo.cell - 2);
        }
      }
      ctx.strokeStyle = "rgba(148, 163, 184, 0.4)";
      ctx.strokeRect(x0, y0, geo.gridW, geo.gridW);
      if (isEnemy) {
        /* radar sweep line */
        var sx = x0 + ((Date.now() / 14) % geo.gridW);
        ctx.strokeStyle = "rgba(163, 230, 53, 0.35)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sx, y0);
        ctx.lineTo(sx, y0 + geo.gridW);
        ctx.stroke();
      }
    }

    function draw() {
      var geo = geometry();
      ctx.clearRect(0, 0, fltSize, fltSize);
      if (App.world) { App.world.backdrop(ctx, fltSize, fltSize, "ocean"); }
      ctx.font = "bold 10px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#22d3ee";
      ctx.textAlign = "left";
      ctx.fillText(t("revYouLabel"), geo.pX, 20);
      ctx.fillStyle = "#ff6b35";
      ctx.fillText(t("revAiLabel"), geo.eX, 20);
      drawGrid(geo.pX, geo.pY, homeBoard, playerFleet, true, false);
      drawGrid(geo.eX, geo.eY, enemyBoard, aiFleet, false, true);
      splash.forEach(function (s) {
        ctx.globalAlpha = Math.max(0, s.life);
        ctx.fillStyle = s.color;
        ctx.fillRect(s.x - 2, s.y - 2, 4, 4);
      });
      ctx.globalAlpha = 1;
    }

    function frame() {
      if (rafId === null) {
        return;
      }
      if (
        document.getElementById("gamePanelGlyphFleet").hidden ||
        document.hidden
      ) {
        rafId = window.requestAnimationFrame(frame);
        return;
      }
      if (clockRunning) {
        renderHud();
      }
      var alive = [];
      for (var index = 0; index < splash.length; index += 1) {
        var s = splash[index];
        s.x += s.vx * 0.016;
        s.y += s.vy * 0.016;
        s.vy += 160 * 0.016;
        s.life -= 0.03;
        if (s.life > 0) {
          alive.push(s);
        }
      }
      splash = alive;
      draw();
      rafId = window.requestAnimationFrame(frame);
    }

    function startLoop() {
      if (rafId !== null) {
        return;
      }
      rafId = window.requestAnimationFrame(frame);
    }

    canvas.addEventListener("pointerdown", function (event) {
      event.preventDefault();
      if (cleared || busy) {
        return;
      }
      var rect = canvas.getBoundingClientRect();
      var scaleX = canvas.width / rect.width;
      var scaleY = canvas.height / rect.height;
      var px = (event.clientX - rect.left) * scaleX;
      var py = (event.clientY - rect.top) * scaleY;
      var geo = geometry();
      var col = Math.floor((px - geo.eX) / geo.cell);
      var row = Math.floor((py - geo.eY) / geo.cell);
      if (col < 0 || row < 0 || col >= FLT_N || row >= FLT_N) {
        return;
      }
      playerShot(row * FLT_N + col);
    });

    selectEl.addEventListener("change", function () {
      var index = campaign.indexOf(selectEl.value);
      if (index >= 0 && campaign.isUnlocked(selectEl.value)) {
        loadLevel(fltLevels[index]);
      }
    });

    startBtn.addEventListener("click", function () {
      loadLevel(level);
    });

    App.quietResetGlyphFleet = function () {
      clockRunning = false;
      resultEl.textContent = t("fltPaused");
    };

    loadLevel(fltLevels[campaign.indexOf(campaign.nextLevelId())]);
  }


  /* Exported for the other modules. */
  App.initGlyphFleetGame = initGlyphFleetGame;
})(window.CapitalConvert = window.CapitalConvert || {});
