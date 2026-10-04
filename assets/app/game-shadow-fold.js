/* Shadow Fold - an ink-stamping puzzle on a folding sheet.
 * Every target is generated FROM a stamp set through the same mirror closure
 * the player has to reason about, so the sheet is always solvable, and a fold
 * that is enabled for no reason is a trap: extra ink outside the target fails. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  var t = App.t;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  var createCampaign = App.createCampaign;
  var fillCampaignPicker = App.fillCampaignPicker;
  var starsFor = App.starsFor;

  var shfBoard = 340;

  /* `line` is twice the crease coordinate, so a gutter between columns k-1 and
   * k is 2k-1 and a mirror maps x to line - x. */
  var shfSheets = [
    {
      id: "f1",
      labelKey: "shfS1",
      side: 4,
      wants: 3,
      par: 1,
      intended: [{ axis: "v", line: 3 }],
      authored: [{ x: 0, y: 0 }, { x: 1, y: 2 }, { x: 0, y: 3 }],
    },
    {
      id: "f2",
      labelKey: "shfS2",
      side: 4,
      wants: 3,
      par: 1,
      intended: [{ axis: "h", line: 3 }],
      authored: [{ x: 0, y: 0 }, { x: 2, y: 1 }, { x: 3, y: 2 }],
    },
    {
      id: "f3",
      labelKey: "shfS3",
      side: 5,
      wants: 3,
      par: 2,
      intended: [
        { axis: "v", line: 3 },
        { axis: "v", line: 5 },
      ],
      authored: [{ x: 1, y: 1 }, { x: 0, y: 3 }, { x: 1, y: 4 }],
    },
    {
      id: "f4",
      labelKey: "shfS4",
      side: 4,
      wants: 2,
      par: 2,
      intended: [
        { axis: "v", line: 3 },
        { axis: "h", line: 3 },
      ],
      authored: [{ x: 0, y: 0 }, { x: 1, y: 2 }],
    },
    {
      id: "f5",
      labelKey: "shfS5",
      side: 6,
      wants: 4,
      par: 2,
      intended: [
        { axis: "v", line: 5 },
        { axis: "h", line: 5 },
      ],
      /* The creases cross through the middle block, and the target keeps it
       * clean: a stamp there blooms four cells of spill. */
      avoid: ["2,2", "3,2", "2,3", "3,3"],
      authored: [{ x: 0, y: 0 }, { x: 1, y: 2 }, { x: 4, y: 1 }, { x: 0, y: 4 }],
    },
  ];

  function shfKey(x, y) {
    return x + "," + y;
  }

  function shfNorm(list) {
    var out = [];
    if (!list || !list.length) {
      return out;
    }
    for (var i = 0; i < list.length; i += 1) {
      var cell = list[i];
      if (typeof cell === "string") {
        var parts = cell.split(",");
        out.push({ x: parseInt(parts[0], 10), y: parseInt(parts[1], 10) });
      } else if (cell && typeof cell.x === "number" && typeof cell.y === "number") {
        out.push({ x: cell.x, y: cell.y });
      }
    }
    return out;
  }

  function shfIn(sheet, x, y, side) {
    return x >= 0 && y >= 0 && x < side && y < side;
  }

  function shfMirror(cell, fold) {
    return fold.axis === "v" ? { x: fold.line - cell.x, y: cell.y } : { x: cell.x, y: fold.line - cell.y };
  }

  /* Pure: the mirror closure - every stamp plus everything it reflects onto,
   * walked until the set stops growing and clipped to the sheet. */
  function shfPositions(stamps, folds, side) {
    var seen = {};
    var out = [];
    var queue = shfNorm(stamps);
    var lines = folds || [];
    while (queue.length) {
      var cell = queue.shift();
      if (!shfIn(null, cell.x, cell.y, side)) {
        continue;
      }
      var key = shfKey(cell.x, cell.y);
      if (seen[key]) {
        continue;
      }
      seen[key] = true;
      out.push({ x: cell.x, y: cell.y });
      for (var f = 0; f < lines.length; f += 1) {
        var twin = shfMirror(cell, lines[f]);
        if (shfIn(null, twin.x, twin.y, side) && !seen[shfKey(twin.x, twin.y)]) {
          queue.push(twin);
        }
      }
    }
    out.sort(function (a, b) {
      return a.y - b.y || a.x - b.x;
    });
    return out;
  }

  function shfSet(cells) {
    var map = {};
    var list = shfNorm(cells);
    for (var i = 0; i < list.length; i += 1) {
      map[shfKey(list[i].x, list[i].y)] = true;
    }
    return map;
  }

  /* Pure: one representative per orbit, which is exactly the region the player
   * gets to stamp - the creases already own the rest of the sheet. */
  function shfUnit(folds, side) {
    var out = [];
    for (var y = 0; y < side; y += 1) {
      for (var x = 0; x < side; x += 1) {
        var orbit = shfPositions([{ x: x, y: y }], folds, side);
        var low = orbit[0];
        if (low && low.x === x && low.y === y) {
          out.push({ x: x, y: y });
        }
      }
    }
    return out;
  }

  /* Pure: quotient the target under the fold group. When the required stamp set
   * mirrors back onto the target exactly, the pattern is solvable as-is. */
  function shfTargetSolvable(target, folds, side) {
    var wanted = shfNorm(target);
    var targetSet = shfSet(wanted);
    var stamps = [];
    var i;
    for (i = 0; i < wanted.length; i += 1) {
      var orbit = shfPositions([wanted[i]], folds, side);
      var low = orbit[0];
      if (low && low.x === wanted[i].x && low.y === wanted[i].y) {
        stamps.push({ x: wanted[i].x, y: wanted[i].y });
      }
    }
    var spread = shfPositions(stamps, folds, side);
    var extra = 0;
    for (i = 0; i < spread.length; i += 1) {
      if (!targetSet[shfKey(spread[i].x, spread[i].y)]) {
        extra += 1;
      }
    }
    var missing = 0;
    for (i = 0; i < wanted.length; i += 1) {
      var covered = false;
      for (var s = 0; s < spread.length; s += 1) {
        if (spread[s].x === wanted[i].x && spread[s].y === wanted[i].y) {
          covered = true;
          break;
        }
      }
      if (!covered) {
        missing += 1;
      }
    }
    return { ok: extra === 0 && missing === 0, stamps: stamps, extra: extra, missing: missing };
  }

  /* Every internal gutter is a crease the player can pull, needed or not. */
  function shfGutters(side) {
    var out = [];
    for (var k = 1; k < side; k += 1) {
      out.push({ axis: "v", line: 2 * k - 1, k: k });
    }
    for (var j = 1; j < side; j += 1) {
      out.push({ axis: "h", line: 2 * j - 1, k: j });
    }
    return out;
  }

  function shfShuffle(list) {
    var out = list.slice();
    for (var i = out.length - 1; i > 0; i -= 1) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
    return out;
  }

  function shfAvoid(sheet) {
    return shfSet(sheet.avoid || []);
  }

  function shfClean(sheet, cells) {
    var avoid = shfAvoid(sheet);
    for (var i = 0; i < cells.length; i += 1) {
      if (avoid[shfKey(cells[i].x, cells[i].y)]) {
        return false;
      }
    }
    return true;
  }

  /* Deal: build the target from a random stamp set inside the unit region, so
   * solvability is a property of the deal and not a hope. */
  function shfDeal(sheet) {
    var side = sheet.side;
    var unit = shfUnit(sheet.intended, side);
    var pool = [];
    var avoid = shfAvoid(sheet);
    for (var i = 0; i < unit.length; i += 1) {
      if (!avoid[shfKey(unit[i].x, unit[i].y)]) {
        pool.push(unit[i]);
      }
    }
    var tries = 0;
    while (tries < 40 && pool.length >= sheet.wants) {
      tries += 1;
      var picks = shfShuffle(pool).slice(0, sheet.wants);
      var target = shfPositions(picks, sheet.intended, side);
      /* The ink budget only covers the folded answer, so a player who enables
       * no crease physically cannot ink the whole target. */
      if (target.length <= picks.length + 1 || !shfClean(sheet, target)) {
        continue;
      }
      var check = shfTargetSolvable(target, sheet.intended, side);
      if (check.ok && check.stamps.length === picks.length) {
        return { stamps: picks, target: target, budget: picks.length + 1 };
      }
    }
    var fallback = shfPositions(sheet.authored, sheet.intended, side);
    return { stamps: sheet.authored.slice(), target: fallback, budget: sheet.authored.length + 1 };
  }
  App.foldPositions = shfPositions;
  App.foldTargetSolvable = shfTargetSolvable;
  App.foldUnit = shfUnit;
  App.foldGutters = shfGutters;
  App.foldDeal = shfDeal;
  App.foldSheets = shfSheets;

  function initShadowFoldGame(panelEl) {
    if (!panelEl) {
      return;
    }

    var campaign = createCampaign({ key: "shadow-fold-campaign", levels: shfSheets });
    var open = campaign.indexOf(campaign.nextLevelId());
    var sheet = shfSheets[open < 0 ? 0 : open];
    var side = sheet.side;
    var deal = shfDeal(sheet);
    var gutters = shfGutters(side);
    var targetSet = shfSet(deal.target);
    var stamps = {};
    var enabled = [];
    var cursor = { x: 0, y: 0 };
    var solved = false;
    var cellEls = {};
    var foldEls = [];

    var hud = document.createElement("div");
    hud.className = "game-hud";
    var inkEl = document.createElement("strong");
    var foldEl = document.createElement("strong");
    hud.appendChild(makeStat("shfInkLabel", inkEl));
    hud.appendChild(makeStat("shfFoldLabel", foldEl));

    var sheetBox = document.createElement("div");
    sheetBox.className = "shf-sheetbox";

    var sheetEl = document.createElement("div");
    sheetEl.className = "shf-sheet";
    sheetEl.dataset.side = String(side);
    sheetEl.setAttribute("tabindex", "0");
    sheetEl.setAttribute("role", "application");
    sheetEl.setAttribute("aria-label", t("shfFieldLabel"));

    var legend = document.createElement("p");
    legend.className = "shf-legend";
    legend.textContent = t("shfLegend");

    var result = document.createElement("p");
    result.className = "game-result";
    result.setAttribute("role", "status");

    var sheetRow = document.createElement("div");
    sheetRow.className = "elements-row";
    var sheetLabel = document.createElement("label");
    sheetLabel.className = "elements-label";
    sheetLabel.setAttribute("for", "shfSheetSel");
    sheetLabel.setAttribute("data-i18n", "shfSheetSelectLabel");
    sheetLabel.textContent = t("shfSheetSelectLabel");
    var sheetSel = document.createElement("select");
    sheetSel.className = "elements-select";
    sheetSel.id = "shfSheetSel";
    sheetRow.appendChild(sheetLabel);
    sheetRow.appendChild(sheetSel);

    var actions = document.createElement("div");
    actions.className = "game-actions";
    var newBtn = document.createElement("button");
    newBtn.type = "button";
    newBtn.className = "primary";
    var newLabel = document.createElement("span");
    newLabel.setAttribute("data-i18n", "shfBtnNew");
    newLabel.textContent = t("shfBtnNew");
    var newContent = document.createElement("span");
    newContent.className = "button-content";
    newContent.appendChild(newLabel);
    newBtn.appendChild(newContent);
    var bestEl = document.createElement("p");
    bestEl.className = "game-best";
    actions.appendChild(newBtn);
    actions.appendChild(bestEl);

    var hint = document.createElement("p");
    hint.className = "game-hint";
    hint.setAttribute("data-i18n", "shfHint");
    hint.textContent = t("shfHint");

    function makeStat(key, valueEl) {
      var stat = document.createElement("div");
      stat.className = "game-stat";
      var label = document.createElement("span");
      label.setAttribute("data-i18n", key);
      label.textContent = t(key);
      stat.appendChild(label);
      stat.appendChild(valueEl);
      return stat;
    }

    [hud, sheetBox, legend, result, sheetRow, actions, hint].forEach(function (node) {
      panelEl.appendChild(node);
    });
    sheetBox.appendChild(sheetEl);

    function unitCells() {
      return shfUnit(enabled, side);
    }

    function buildSheet() {
      while (sheetEl.firstChild) {
        sheetEl.removeChild(sheetEl.firstChild);
      }
      cellEls = {};
      foldEls = [];
      for (var y = 0; y < side; y += 1) {
        for (var x = 0; x < side; x += 1) {
          addCell(x, y, 2 * y + 1, 2 * x + 1);
        }
      }
      /* One crease is one control: it runs the whole length of the gutter,
       * because folding paper never creases a single row at a time. */
      for (var k = 1; k < side; k += 1) {
        addFold("v", 2 * k - 1, "1 / -1", String(2 * k));
      }
      for (var j = 1; j < side; j += 1) {
        addFold("h", 2 * j - 1, String(2 * j), "1 / -1");
      }
    }

    function addCell(x, y, row, col) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "shf-cell";
      btn.style.gridRow = String(row);
      btn.style.gridColumn = String(col);
      (function (px, py) {
        btn.addEventListener("click", function () {
          if (btn.disabled) {
            result.textContent = t("shfCovered");
            return;
          }
          toggleStamp(px, py);
        });
      })(x, y);
      sheetEl.appendChild(btn);
      cellEls[shfKey(x, y)] = btn;
    }

    function addFold(axis, line, row, col) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "shf-fold shf-fold-" + axis;
      (function (a, l) {
        btn.addEventListener("click", function () {
          toggleFold(a, l);
        });
      })(axis, line);
      btn.style.gridRow = String(row);
      btn.style.gridColumn = String(col);
      sheetEl.appendChild(btn);
      foldEls.push({ axis: axis, line: line, el: btn });
    }

    function toggleFold(axis, line) {
      if (solved) {
        result.textContent = t("shfAlready", { name: t(sheet.labelKey) });
        return;
      }
      var at = -1;
      for (var i = 0; i < enabled.length; i += 1) {
        if (enabled[i].axis === axis && enabled[i].line === line) {
          at = i;
        }
      }
      if (at >= 0) {
        enabled.splice(at, 1);
      } else {
        enabled.push({ axis: axis, line: line });
      }
      render();
      result.textContent = enabled.length
        ? t("shfFolded", { a: axisWord(axis), n: enabled.length })
        : t("shfUnfolded");
      /* Pulling the last crease can be the winning move, so a fold is checked
       * too - quietly, so this line stays the player's feedback. */
      check(true);
    }

    function axisWord(axis) {
      return t(axis === "v" ? "shfAxisV" : "shfAxisH");
    }

    function toggleStamp(x, y) {
      if (solved) {
        result.textContent = t("shfAlready", { name: t(sheet.labelKey) });
        return;
      }
      var key = shfKey(x, y);
      if (stamps[key]) {
        delete stamps[key];
      } else if (stampCount() >= deal.budget) {
        result.textContent = t("shfDry", { n: deal.budget });
        return;
      } else {
        stamps[key] = true;
      }
      cursor = { x: x, y: y };
      render();
      check();
    }

    function stampCount() {
      var n = 0;
      for (var key in stamps) {
        if (stamps[key]) {
          n += 1;
        }
      }
      return n;
    }

    function foldCount() {
      return enabled.length;
    }

    function refreshPicker() {
      fillCampaignPicker(
        sheetSel,
        campaign,
        function (def) {
          return t(def.labelKey);
        },
        t("elementsLocked"),
      );
      sheetSel.value = sheet.id;
      var best = campaign.best(sheet.id);
      bestEl.textContent =
        t("campaignStars", { n: campaign.totalStars(), max: campaign.maxStars() }) +
        " \u00b7 " +
        (best > 0 ? t("shfBestFolds", { n: best }) : t("noBest"));
    }

    function render() {
      var ink = shfPositions(keysToCells(stamps), enabled, side);
      var inkSet = shfSet(ink);
      var unit = shfSet(unitCells());
      var avoid = shfAvoid(sheet);
      var spill = 0;
      var filled = 0;
      for (var i = 0; i < ink.length; i += 1) {
        var key = shfKey(ink[i].x, ink[i].y);
        if (!targetSet[key] || avoid[key]) {
          spill += 1;
        } else {
          filled += 1;
        }
      }
      inkEl.textContent = t("shfInkNow", { n: stampCount(), max: deal.budget });
      foldEl.textContent = t("shfFoldNow", { n: foldCount(), par: sheet.par });

      var want = 0;
      var key2;
      for (key2 in targetSet) {
        if (targetSet[key2]) {
          want += 1;
        }
      }
      for (var y = 0; y < side; y += 1) {
        for (var x = 0; x < side; x += 1) {
          var k = shfKey(x, y);
          var el = cellEls[k];
          if (!el) {
            continue;
          }
          var mine = !!stamps[k];
          var lit = !!inkSet[k];
          var wanted = !!targetSet[k];
          var bad = lit && (!wanted || avoid[k]);
          var text = "";
          if (mine) {
            text = bad ? "\u25c6!" : "\u25c6";
          } else if (lit) {
            text = bad ? "\u25a0!" : "\u25a0";
          } else if (wanted) {
            text = "\u25a1";
          }
          el.textContent = text;
          el.disabled = !unit[k] && !mine;
          el.className =
            "shf-cell" +
            (lit ? (bad ? " is-spill" : " is-ink") : "") +
            (wanted && !lit ? " is-want" : "") +
            (el.disabled ? " is-covered" : "") +
            (cursor.x === x && cursor.y === y ? " is-cursor" : "");
          el.setAttribute(
            "aria-label",
            t("shfCellLabel", {
              a: x + 1,
              b: y + 1,
              c: text || t("shfBlank"),
              d: el.disabled ? t("shfCoveredWord") : t("shfOpenWord"),
            }),
          );
        }
      }
      for (var f = 0; f < foldEls.length; f += 1) {
        var item = foldEls[f];
        var on = false;
        for (var e = 0; e < enabled.length; e += 1) {
          if (enabled[e].axis === item.axis && enabled[e].line === item.line) {
            on = true;
          }
        }
        item.el.textContent = on ? "V\u2713" : "V";
        if (item.axis === "h") {
          item.el.textContent = on ? "H\u2713" : "H";
        }
        item.el.className = "shf-fold shf-fold-" + item.axis + (on ? " is-on" : "");
        item.el.setAttribute(
          "aria-label",
          t("shfFoldLabel2", { a: axisWord(item.axis), k: Math.floor((item.line + 1) / 2), s: on ? t("shfOn") : t("shfOff") }),
        );
        item.el.setAttribute("aria-pressed", on ? "true" : "false");
      }
      return { filled: filled, spill: spill, want: want };
    }

    function keysToCells(map) {
      var out = [];
      for (var key in map) {
        if (map[key]) {
          var parts = key.split(",");
          out.push({ x: parseInt(parts[0], 10), y: parseInt(parts[1], 10) });
        }
      }
      return out;
    }

    function check(quiet) {
      if (solved) {
        return;
      }
      var state = render();
      if (state.spill === 0 && state.filled === state.want && state.want > 0) {
        finish();
        return;
      }
      if (quiet) {
        return;
      }
      result.textContent = t("shfTray", {
        lit: state.filled,
        want: state.want,
        spill: state.spill,
      });
    }

    function finish() {
      solved = true;
      var used = foldCount();
      var starsWon = starsFor(used, [sheet.par, sheet.par + 1, sheet.par + 2], "low");
      var outcome = campaign.record(sheet.id, {
        stars: starsWon,
        best: used,
        better: "low",
      });
      var message = t("shfMatched", { n: used, p: sheet.par, s: starsWon });
      if (outcome.isBest) {
        message += " " + t("newBest");
      }
      if (outcome.unlockedNext) {
        message += " " + t("shfNextSheet");
      } else if (campaign.clearedCount() === shfSheets.length) {
        message += " " + t("shfCampaignDone");
      }
      result.textContent = message;
      logAction(t("logShadowFold", { n: used }));
      var rect = newBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      refreshPicker();
    }

    function loadSheet(def) {
      sheet = def;
      side = def.side;
      deal = shfDeal(def);
      targetSet = shfSet(deal.target);
      gutters = shfGutters(side);
      stamps = {};
      enabled = [];
      cursor = { x: 0, y: 0 };
      solved = false;
      sheetEl.dataset.side = String(side);
      buildSheet();
      refreshPicker();
      render();
      result.textContent = t("shfPrompt", {
        name: t(def.labelKey),
        n: deal.target.length,
        p: def.par,
        b: deal.budget,
      });
    }

    /* F folds the crease the cursor is nearest to, vertical winning ties. */
    function foldUnderCursor() {
      var best = null;
      var bestRun = Infinity;
      for (var i = 0; i < gutters.length; i += 1) {
        var fold = gutters[i];
        var run = fold.axis === "v" ? Math.abs(cursor.x - fold.line / 2) : Math.abs(cursor.y - fold.line / 2);
        if (best === null || run < bestRun) {
          best = fold;
          bestRun = run;
        }
      }
      if (best) {
        toggleFold(best.axis, best.line);
      }
    }

    sheetEl.addEventListener("keydown", function (event) {
      var moves = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
      };
      if (moves[event.key]) {
        event.preventDefault();
        cursor = {
          x: Math.max(0, Math.min(side - 1, cursor.x + moves[event.key][0])),
          y: Math.max(0, Math.min(side - 1, cursor.y + moves[event.key][1])),
        };
        render();
        return;
      }
      if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
        event.preventDefault();
        toggleStamp(cursor.x, cursor.y);
        return;
      }
      if (event.key === "f" || event.key === "F") {
        event.preventDefault();
        foldUnderCursor();
      }
    });

    sheetEl.addEventListener("pointerdown", function () {
      sheetEl.focus();
    });

    sheetSel.addEventListener("change", function () {
      var pick = campaign.indexOf(sheetSel.value);
      if (pick < 0) {
        return;
      }
      if (!campaign.isUnlocked(sheetSel.value)) {
        sheetSel.value = sheet.id;
        result.textContent = t("shfLocked", { name: t(shfSheets[pick].labelKey) });
        return;
      }
      loadSheet(shfSheets[pick]);
    });

    newBtn.addEventListener("click", function () {
      loadSheet(sheet);
    });

    loadSheet(shfSheets[open < 0 ? 0 : open]);
  }

  /* Bilingual copy travels with the game: addStrings only fills keys i18n.js
   * does not already own, so the shared dictionary stays authoritative. */
  App.addStrings({
    en: {
      "tabShadowFold": "Shadow Fold",
      "shfS1": "One Crease",
      "shfS2": "Fold Down",
      "shfS3": "Twin Creases",
      "shfS4": "Quarter Plate",
      "shfS5": "The Clean Crossing",
      "shfInkLabel": "Ink",
      "shfFoldLabel": "Creases",
      "shfSheetSelectLabel": "Pick a sheet",
      "shfBtnNew": "New Sheet",
      "shfFieldLabel": "Folding ink sheet: arrows move the cursor, Enter stamps, F pulls the nearest crease. Click a gutter to fold it.",
      "shfInkNow": "{n}/{max} stamps",
      "shfFoldNow": "{n} / par {par}",
      "shfLegend": "\u25a1 wanted \u00b7 \u25a0 mirrored ink \u00b7 \u25c6 your stamp \u00b7 ! spill",
      "shfCellLabel": "Column {a}, row {b}: {c}, {d}",
      "shfFoldLabel2": "{a} crease after line {k}: {s}",
      "shfBlank": "clear",
      "shfOn": "folded",
      "shfOff": "flat",
      "shfOpenWord": "open",
      "shfCoveredWord": "covered",
      "shfAxisV": "vertical",
      "shfAxisH": "horizontal",
      "shfPrompt": "{name}: the target needs {n} inked cells. Budget {b} stamps, par {p} creases.",
      "shfTray": "{lit}/{want} target cells inked, {spill} spilled.",
      "shfCovered": "That block is under a fold - stamp the open unit instead.",
      "shfDry": "The ink tray is dry at {n} stamps. Lift one or pull another crease.",
      "shfFolded": "{a} crease pulled - {n} fold(s) live.",
      "shfUnfolded": "Sheet lies flat again.",
      "shfMatched": "The unfolded ink matches on {n} creases (par {p}) - {s} stars.",
      "shfAlready": "{name} is already pressed - take a new sheet.",
      "shfBestFolds": "best {n} creases",
      "shfNextSheet": "Next sheet unlocked.",
      "shfCampaignDone": "Five sheets pressed clean.",
      "shfLocked": "{name} is still folded away behind the sheet before it.",
      "shfHint": "Extra ink is a failure, so a crease you do not need is a trap - and the crossing cell of two creases often has to stay bare.",
      "logShadowFold": "Pressed a sheet on {n} creases",
    },
    zh: {
      "tabShadowFold": "折影拓印",
      "shfS1": "一道折痕",
      "shfS2": "往下对折",
      "shfS3": "双折痕",
      "shfS4": "四分印板",
      "shfS5": "干净的交叉",
      "shfInkLabel": "墨点",
      "shfFoldLabel": "折痕",
      "shfSheetSelectLabel": "选择纸张",
      "shfBtnNew": "换一张纸",
      "shfFieldLabel": "折叠拓印纸：方向键移动光标，回车盖章，F 折起离光标最近的折线；也可以点行列之间的折缝。",
      "shfInkNow": "印章 {n}/{max}",
      "shfFoldNow": "{n} / 标准 {par}",
      "shfLegend": "\u25a1 目标 \u00b7 \u25a0 折出来的墨 \u00b7 \u25c6 你盖的章 \u00b7 ! 溢墨",
      "shfCellLabel": "第 {a} 列第 {b} 行：{c}，{d}",
      "shfFoldLabel2": "第 {k} 格后的{a}折线：{s}",
      "shfBlank": "空白",
      "shfOn": "已折起",
      "shfOff": "摊平",
      "shfOpenWord": "可盖",
      "shfCoveredWord": "被叠住",
      "shfAxisV": "竖直",
      "shfAxisH": "水平",
      "shfPrompt": "{name}：图案需要 {n} 个墨格。印章只有 {b} 枚，标准用 {p} 道折痕。",
      "shfTray": "已拓中 {lit}/{want} 格，溢墨 {spill} 格。",
      "shfCovered": "那一格被叠在下面——请在还露在外面的单位区盖章。",
      "shfDry": "印章只有 {n} 枚，已经用完了。先揭掉一枚，或者再多折一道。",
      "shfFolded": "折上了{a}折线——现有 {n} 道折痕。",
      "shfUnfolded": "纸又摊平了。",
      "shfMatched": "展开后的墨迹与图案完全吻合，用了 {n} 道折痕（标准 {p}）- 获得 {s} 星。",
      "shfAlready": "「{name}」已经拓好了——换一张纸再来。",
      "shfBestFolds": "最佳 {n} 道折痕",
      "shfNextSheet": "解锁下一张纸。",
      "shfCampaignDone": "五张纸都拓干净了。",
      "shfLocked": "「{name}」还压在上一张纸后面。",
      "shfHint": "多出图案之外的墨就算失败，所以用不上的折痕是个陷阱；两条折线的交叉格常常必须留空。",
      "logShadowFold": "用 {n} 道折痕拓好了一张纸",
    },
  });

  App.registerGame({
    name: "shadowFold",
    tabKey: "tabShadowFold",
    init: initShadowFoldGame,
    guide: {
      svg:
        '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="6" y="6" width="108" height="64" rx="5" fill="rgba(30,41,59,.75)" stroke="rgba(148,163,184,.45)"/>' +
        '<path d="M60 10v56" stroke="#fbbf24" stroke-width="2" stroke-dasharray="5 4"/>' +
        '<rect x="20" y="20" width="12" height="12" fill="#e2e8f0"/><rect x="36" y="20" width="12" height="12" fill="rgba(226,232,240,.35)"/>' +
        '<rect x="72" y="20" width="12" height="12" fill="#e2e8f0"/><rect x="88" y="20" width="12" height="12" fill="rgba(226,232,240,.35)"/>' +
        '<rect x="20" y="44" width="12" height="12" fill="rgba(226,232,240,.35)"/>' +
        '<rect x="72" y="44" width="12" height="12" fill="rgba(251,113,133,.7)"/>' +
        '<text x="78" y="53" font-size="9" fill="#0f172a" text-anchor="middle">!</text></svg>',
      en: [
        "Aim: make the unfolded ink land exactly on the target pattern.",
        "Stamp: click an open cell, or arrow the cursor there and press Enter. Diamonds are your stamps, squares the mirrored ink.",
        "Fold: click a gutter between rows or columns, or press F to pull the crease nearest the cursor. Every stamp reflects across live creases.",
        "Budget: the ink tray holds only a few stamps, so the creases are what let a small pattern cover a big sheet.",
        "Watch out: ink outside the target is a failure, so an unneeded crease - or a stamp on the crossing cell - ruins the print.",
        "Scoring: folds used against par decides the stars, and New Sheet deals a fresh target built from a known answer.",
      ],
      zh: [
        "目标：把纸展开后的墨迹，正好落在图案上。",
        "盖章：点击露在外面的格子，或用方向键把光标移过去再按回车。菱形是你盖的章，方形是折出来的墨。",
        "折叠：点击行列之间的折缝，或按 F 折起离光标最近的折线。每枚印章都会沿所有生效的折线成像。",
        "墨量：印盘里只有几枚印章，所以要靠折线让小小的图案铺满整张纸。",
        "小心：图案之外多出墨就算失败，所以多余的折线——或者压在对齐格上的章——都会毁掉这张拓片。",
        "计分：用的折痕数与标准用量对比决定星级；换一张纸会发一张由已知答案生成的新图案。",
      ],
    },
  });

  /* Exported for the other modules. */
  App.initShadowFoldGame = initShadowFoldGame;
})(window.CapitalConvert = window.CapitalConvert || {});
