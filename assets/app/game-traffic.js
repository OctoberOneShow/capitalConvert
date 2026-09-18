/* Traffic Jam - The slide-the-grid escape puzzle in the shared game drawer. */
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
  var trafSize = 6;
  var trafTaxiRow = 2;
  /* Each board: cars as [x, y, length, horizontal(1)/vertical(0)].
   * The taxi is always car 0 and escapes through the right wall on
   * its row. Every board is checked by trafficSolvable below. */
  var trafLevels = [
{ id: "j1", par: [7,11,16], cars: [[0, 2, 2, 1], [0, 3, 2, 0], [3, 1, 2, 0]] },
    { id: "j2", par: [10,14,19], cars: [[0, 2, 2, 1], [5, 0, 3, 0], [2, 1, 3, 0]] },
    { id: "j3", par: [9,13,18], cars: [[0, 2, 2, 1], [3, 4, 2, 0], [2, 1, 3, 0], [5, 1, 2, 0]] },
    { id: "j4", par: [8,12,17], cars: [[1, 2, 2, 1], [5, 1, 3, 0], [3, 2, 2, 0], [4, 2, 2, 0]] },
    { id: "j5", par: [9,13,18], cars: [[1, 2, 2, 1], [0, 2, 3, 0], [1, 5, 2, 1], [3, 0, 3, 0], [5, 1, 3, 0]] },
    { id: "j6", par: [10,14,19], cars: [[0, 2, 2, 1], [3, 1, 3, 1], [1, 3, 2, 1], [1, 0, 2, 0], [2, 0, 3, 0]] },
    { id: "j7", par: [11,15,20], cars: [[0, 2, 2, 1], [2, 1, 2, 0], [4, 3, 2, 0], [3, 2, 2, 0], [5, 0, 3, 0]] },
    { id: "j8", par: [11,15,20], cars: [[1, 2, 2, 1], [2, 3, 2, 1], [1, 0, 2, 1], [0, 1, 2, 0], [3, 1, 2, 0], [5, 1, 2, 0]] },
    { id: "j9", par: [12,16,21], cars: [[1, 2, 2, 1], [0, 0, 3, 1], [5, 0, 3, 0], [3, 1, 3, 0], [0, 2, 2, 0], [4, 0, 3, 0]] },
    { id: "j10", par: [12,16,21], cars: [[0, 2, 2, 1], [3, 0, 3, 0], [2, 5, 2, 1], [1, 3, 2, 0], [2, 1, 2, 0], [1, 0, 2, 0]] },
    { id: "j11", par: [13,17,22], cars: [[0, 2, 2, 1], [5, 2, 2, 0], [3, 0, 3, 0], [2, 5, 2, 1], [4, 0, 2, 1], [2, 1, 2, 0]] },
    { id: "j12", par: [13,17,22], cars: [[0, 2, 2, 1], [0, 4, 2, 1], [1, 0, 2, 0], [2, 4, 2, 1], [3, 0, 3, 0], [0, 3, 2, 1], [2, 0, 3, 0]] },
    { id: "j13", par: [13,17,22], cars: [[1, 2, 2, 1], [0, 5, 3, 1], [0, 1, 2, 0], [5, 0, 3, 0], [3, 0, 3, 0], [0, 3, 2, 1], [4, 0, 3, 0]] },
    { id: "j14", par: [13,17,22], cars: [[1, 2, 2, 1], [2, 0, 2, 0], [4, 2, 2, 0], [3, 1, 2, 0], [5, 1, 2, 0], [2, 3, 2, 1], [0, 0, 2, 0]] },
    { id: "j15", par: [15,19,24], cars: [[0, 2, 2, 1], [1, 5, 2, 1], [2, 1, 3, 0], [1, 4, 2, 1], [3, 1, 3, 0], [0, 4, 2, 0], [4, 1, 2, 1]] },
    { id: "j16", par: [15,19,24], cars: [[0, 2, 2, 1], [3, 1, 2, 0], [2, 4, 2, 1], [0, 4, 2, 1], [4, 1, 2, 1], [2, 0, 3, 0], [1, 3, 2, 1], [3, 0, 2, 1]] },
  ];

  function trafGrid(cars) {
    var grid = [];
    for (var i = 0; i < trafSize * trafSize; i += 1) {
      grid.push(-1);
    }
    cars.forEach(function (car, index) {
      for (var step = 0; step < car[2]; step += 1) {
        var x = car[0] + (car[3] ? step : 0);
        var y = car[1] + (car[3] ? 0 : step);
        grid[x + y * trafSize] = index;
      }
    });
    return grid;
  }

  function trafSlide(cars, index, dx, dy) {
    /* How far a car may legally slide along its axis. */
    var car = cars[index];
    var horiz = car[3] === 1;
    var dir = horiz ? dx : dy;
    if (dir === 0) {
      return 0;
    }
    var grid = trafGrid(cars);
    var steps = 0;
    var moving = [];
    for (var s = 0; s < car[2]; s += 1) {
      moving.push([car[0] + (horiz ? s : 0), car[1] + (horiz ? 0 : s)]);
    }
    for (var step = 1; step <= (horiz ? trafSize : trafSize); step += 1) {
      var blocked = false;
      var next = moving.map(function (cell) {
        var x = cell[0] + (horiz ? dir : 0);
        var y = cell[1] + (horiz ? 0 : dir);
        if (x < 0 || x >= trafSize || y < 0 || y >= trafSize) {
          blocked = true;
        } else if (grid[x + y * trafSize] !== -1 && grid[x + y * trafSize] !== index) {
          blocked = true;
        }
        return [x, y];
      });
      if (blocked) {
        break;
      }
      steps += 1;
      moving = next;
    }
    return Math.max(0, dir > 0 ? steps : -steps);
  }

  function trafExitOpen(cars) {
    var taxi = cars[0];
    var grid = trafGrid(cars);
    for (var x = taxi[0] + taxi[2]; x < trafSize; x += 1) {
      if (grid[x + taxi[1] * trafSize] !== -1) {
        return false;
      }
    }
    return true;
  }

  /* An open lane is not an escape: the taxi has to reach the exit wall. */
  function trafTaxiOut(cars) {
    var taxi = cars[0];
    return taxi[0] + taxi[2] >= trafSize && trafExitOpen(cars);
  }

  function trafKey(cars) {
    return cars
      .map(function (car) {
        return car[0] + "," + car[1];
      })
      .join(";");
  }

  /* Breadth-first over slide-one states. Ships with the game so the
   * acceptance checks can prove every board solvable before it ships. */
  function trafficSolvable(level, cap) {
    var limit = cap || 120000;
    var start = level.cars.map(function (car) {
      return car.slice();
    });
    if (trafTaxiOut(start)) {
      return true;
    }
    var queue = [start];
    var seen = {};
    seen[trafKey(start)] = true;
    var visits = 0;
    while (queue.length && visits < limit) {
      var cars = queue.shift();
      visits += 1;
      for (var index = 0; index < cars.length; index += 1) {
        var horiz = cars[index][3] === 1;
        var axes = horiz ? [[-1, 0], [1, 0]] : [[0, -1], [0, 1]];
        for (var a = 0; a < axes.length; a += 1) {
          var reach = trafSlide(cars, index, axes[a][0], axes[a][1]);
          var unit = axes[a][0] !== 0 ? axes[a][0] : axes[a][1];
          for (var step = 1; step <= Math.abs(reach); step += 1) {
            var next = cars.map(function (car) {
              return car.slice();
            });
            next[index][0] += (horiz ? unit * step : 0);
            next[index][1] += (horiz ? 0 : unit * step);
            if (index === 0 && trafTaxiOut(next)) {
              return true;
            }
            var key = trafKey(next);
            if (!seen[key]) {
              seen[key] = true;
              queue.push(next);
            }
          }
        }
      }
    }
    return false;
  }

  function initTrafficGame() {
    var boardEl = getElement("trafBoard");
    var movesEl = getElement("trafMoves");
    var boardStatEl = getElement("trafBoardStat");
    var resultEl = getElement("trafResult");
    var newBtn = getElement("trafNewBtn");
    var bestEl = getElement("trafBest");
    var selectEl = getElement("trafLevelSel");
    if (
      !boardEl ||
      !movesEl ||
      !boardStatEl ||
      !resultEl ||
      !newBtn ||
      !bestEl ||
      !selectEl
    ) {
      return;
    }

    var campaign = createCampaign({ key: "traffic-campaign", levels: trafLevels });
    var level = trafLevels[campaign.indexOf(campaign.nextLevelId())];
    var cars = [];
    var nodes = [];
    var moves = 0;
    var over = false;
    var selected = -1;

    function refreshPicker() {
      fillCampaignPicker(
        selectEl,
        campaign,
        function (def) {
          return t("trafBoardLabelN", { n: campaign.indexOf(def.id) + 1 });
        },
        t("elementsLocked"),
      );
      selectEl.value = level.id;
      bestEl.textContent = t("campaignStars", {
        n: campaign.totalStars(),
        max: campaign.maxStars(),
      });
      boardStatEl.textContent =
        campaign.indexOf(level.id) + 1 + "/" + trafLevels.length;
    }

    function layout() {
      boardEl.textContent = "";
      nodes = [];
      var trafTints = [
        "#fbbf24",
        "#22d3ee",
        "#f472b6",
        "#a3e635",
        "#a78bfa",
        "#67e8f9",
        "#fda4af",
        "#86efac",
        "#c4b5fd",
        "#fcd34d",
        "#5eead4",
      ];
      cars.forEach(function (car, index) {
        var node = document.createElement("button");
        node.type = "button";
        node.className =
          "traf-car" +
          (index === 0 ? " is-taxi" : "") +
          (index === selected ? " is-selected" : "");
        if (index !== 0) {
          node.style.background = trafTints[index % trafTints.length];
        }
        node.style.left = (car[0] / trafSize) * 100 + "%";
        node.style.top = (car[1] / trafSize) * 100 + "%";
        node.style.width =
          ((car[3] ? car[2] : 1) / trafSize) * 100 + "%";
        node.style.height =
          ((car[3] ? 1 : car[2]) / trafSize) * 100 + "%";
        node.setAttribute(
          "aria-label",
          index === 0 ? t("trafTaxi") : t("trafCar", { n: index }),
        );
        node.addEventListener("click", function () {
          selectCar(index);
        });
        node.addEventListener("pointerdown", function (event) {
          beginDrag(index, event);
        });
        boardEl.appendChild(node);
        nodes.push(node);
      });
    }

    function selectCar(index) {
      selected = index;
      nodes.forEach(function (node, nodeIndex) {
        node.classList.toggle("is-selected", nodeIndex === index);
      });
    }

    function commitMove(index, dir, wanted) {
      /* dir: +1/-1 along the car's axis; wanted: cells asked for. */
      if (over || !dir || !wanted) {
        return false;
      }
      var car = cars[index];
      var horiz = car[3] === 1;
      var reach = trafSlide(
        cars,
        index,
        horiz ? dir : 0,
        horiz ? 0 : dir,
      );
      var steps = Math.min(Math.abs(wanted), Math.abs(reach));
      if (steps === 0) {
        return false;
      }
      car[0] += horiz ? dir * steps : 0;
      car[1] += horiz ? 0 : dir * steps;
      moves += steps;
      movesEl.textContent = String(moves);
      layout();
      if (index === 0 && trafTaxiOut(cars)) {
        win();
      }
      return true;
    }

    var drag = null;

    function beginDrag(index, event) {
      if (over) {
        return;
      }
      selectCar(index);
      drag = {
        index: index,
        startX: event.clientX,
        startY: event.clientY,
        moved: false,
      };
      window.addEventListener("pointermove", onDragMove);
      window.addEventListener("pointerup", endDrag);
      if (boardEl.setPointerCapture) {
        try {
          /* Only extends the drag past the board's edge; the window
           * listeners already carry it, so a stale pointerId is benign. */
          boardEl.setPointerCapture(event.pointerId);
        } catch (error) {}
      }
    }

    function onDragMove(event) {
      if (!drag) {
        return;
      }
      var car = cars[drag.index];
      var horiz = car[3] === 1;
      var rect = boardEl.getBoundingClientRect();
      var cell = (rect.width || 360) / trafSize;
      var raw =
        (horiz ? event.clientX - drag.startX : event.clientY - drag.startY) /
        cell;
      var steps = Math.round(raw);
      if (steps === 0) {
        return;
      }
      drag.moved = true;
      var dir = steps > 0 ? 1 : -1;
      var reach = trafSlide(
        cars,
        drag.index,
        horiz ? dir : 0,
        horiz ? 0 : dir,
      );
      var allowed = Math.min(Math.abs(steps), Math.abs(reach)) * dir;
      nodes[drag.index].style.left =
        ((car[0] + (horiz ? allowed : 0)) / trafSize) * 100 + "%";
      nodes[drag.index].style.top =
        ((car[1] + (horiz ? 0 : allowed)) / trafSize) * 100 + "%";
      drag.allowed = allowed;
    }

    function endDrag() {
      window.removeEventListener("pointermove", onDragMove);
      window.removeEventListener("pointerup", endDrag);
      if (drag && drag.moved && drag.allowed) {
        commitMove(
          drag.index,
          drag.allowed > 0 ? 1 : -1,
          Math.abs(drag.allowed),
        );
      }
      drag = null;
    }

    function win() {
      over = true;
      var starsWon = starsFor(moves, level.par, "low");
      var outcome = campaign.record(level.id, {
        stars: starsWon,
        best: moves,
        better: "low",
      });
      var message = t("trafWin", { n: moves, s: starsWon });
      if (outcome.isBest) {
        message += " " + t("newBest");
      }
      if (outcome.unlockedNext) {
        message += " " + t("trafNext");
      } else if (campaign.clearedCount() === trafLevels.length) {
        message += " " + t("trafAllBoards");
      }
      resultEl.textContent = message;
      logAction(t("logTraf", { n: moves }));
      var rect = newBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      var nextId = outcome.unlockedNext || level.id;
      loadLevel(trafLevels[campaign.indexOf(nextId)]);
      resultEl.textContent = message;
    }

    function loadLevel(levelDef) {
      level = levelDef;
      cars = levelDef.cars.map(function (car) {
        return car.slice();
      });
      moves = 0;
      over = false;
      selected = 0;
      movesEl.textContent = "0";
      layout();
      refreshPicker();
      resultEl.textContent = t("trafPrompt");
    }

    boardEl.addEventListener("keydown", function (event) {
      if (selected < 0 || over) {
        return;
      }
      var horiz = cars[selected][3] === 1;
      if (event.key === "ArrowLeft" && horiz) {
        event.preventDefault();
        commitMove(selected, -1, 1);
      } else if (event.key === "ArrowRight" && horiz) {
        event.preventDefault();
        commitMove(selected, 1, 1);
      } else if (event.key === "ArrowUp" && !horiz) {
        event.preventDefault();
        commitMove(selected, -1, 1);
      } else if (event.key === "ArrowDown" && !horiz) {
        event.preventDefault();
        commitMove(selected, 1, 1);
      } else if (event.key === "Tab") {
        /* Tab walks the cars instead of leaving the board. */
        event.preventDefault();
        selectCar((selected + 1) % cars.length);
      }
    });
    boardEl.tabIndex = 0;

    newBtn.addEventListener("click", function () {
      loadLevel(level);
    });

    selectEl.addEventListener("change", function () {
      var index = campaign.indexOf(selectEl.value);
      if (index >= 0 && campaign.isUnlocked(selectEl.value)) {
        loadLevel(trafLevels[index]);
      }
    });

    loadLevel(trafLevels[campaign.indexOf(campaign.nextLevelId())]);
  }


  /* Exported for the other modules. */
  App.trafficSolvable = trafficSolvable;
  App.initTrafficGame = initTrafficGame;
})(window.CapitalConvert = window.CapitalConvert || {});
