/* Coral Architect - the draft-and-place reef game in the shared game drawer.
 * Three tiles are offered each turn, one is picked, and it grows where it was
 * planted and never moves again. Every species carries an edge rule written in
 * the legend, so the score at the end of the run is arithmetic the player could
 * have done in advance. Offers are scripted per level, which is what lets the
 * module prove a reef is clearable before dealing it. Registered through the
 * game registry, so it needs no markup in the four HTML pages. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  var t = App.t;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  var createCampaign = App.createCampaign;
  var fillCampaignPicker = App.fillCampaignPicker;
  var starsFor = App.starsFor;
  var isMotionOff = App.isMotionOff;

  var corCols = 7;
  var corRows = 6;
  var corCell = 46;
  var corPad = 8;
  var corWide = corPad * 2 + corCols * corCell;
  var corTall = corPad * 2 + corRows * corCell;
  var corDX = [1, 0, -1, 0];
  var corDY = [0, 1, 0, -1];
  var corFloor = -6;

  var corSpecies = {
    F: { key: "corFan", glyph: "F", shape: "fan", low: 2, high: 11, base: 5 },
    P: { key: "corPillar", glyph: "P", shape: "bar", low: 11, high: 30, base: 2, each: 2 },
    S: { key: "corSponge", glyph: "S", shape: "diamond", low: 0, high: 30, base: 1, open: 6 },
    N: { key: "corNursery", glyph: "N", shape: "ring", low: 7, high: 19, base: 3, each: 4, chain: true },
    X: { key: "corUrchin", glyph: "X", shape: "star", low: 0, high: 30, base: -2, steal: 2 },
  };
  var corRoster = ["F", "P", "S", "N", "X"];

  /* Depth only ever depends on the row, so it is printed once per row and the
   * player can plan bands in their head. */
  function corDepth(y) {
    return 3 + y * 4;
  }

  function corFreshGrid() {
    var cells = [];
    for (var i = 0; i < corCols * corRows; i += 1) {
      cells.push(null);
    }
    return { cols: corCols, rows: corRows, cells: cells };
  }

  function corNeighbours(grid, index) {
    var x = index % corCols;
    var y = Math.floor(index / corCols);
    var out = [];
    for (var d = 0; d < 4; d += 1) {
      var nx = x + corDX[d];
      var ny = y + corDY[d];
      if (nx < 0 || ny < 0 || nx >= corCols || ny >= corRows) {
        continue;
      }
      out.push({ at: ny * corCols + nx, kind: grid.cells[ny * corCols + nx], dir: d });
    }
    return out;
  }

  function corSides(index) {
    var x = index % corCols;
    var y = Math.floor(index / corCols);
    var n = 2;
    if (x > 0 && x < corCols - 1) {
      n += 1;
    }
    if (y > 0 && y < corRows - 1) {
      n += 1;
    }
    return n;
  }

  /* One tile's worth of score. The whole reef is the sum of these, so the
   * number printed on a tile is exactly what it contributes. */
  function corTileScore(grid, index) {
    var kind = grid.cells[index];
    if (!kind) {
      return 0;
    }
    var sp = corSpecies[kind];
    var list = corNeighbours(grid, index);
    var filled = 0;
    var same = 0;
    var urchin = 0;
    list.forEach(function (nb) {
      if (!nb.kind) {
        return;
      }
      filled += 1;
      if (nb.kind === kind) {
        same += 1;
      }
      if (nb.kind === "X") {
        urchin += 1;
      }
    });
    var score = sp.base;
    if (kind === "P") {
      score += sp.each * filled;
    }
    if (kind === "S" && corSides(index) - filled >= 3) {
      score += sp.open;
    }
    if (kind === "N") {
      score += sp.each * same;
    }
    if (kind !== "X") {
      score -= corSpecies.X.steal * urchin;
    }
    return Math.max(corFloor, score);
  }

  function reefScore(grid) {
    var total = 0;
    for (var i = 0; i < grid.cells.length; i += 1) {
      total += corTileScore(grid, i);
    }
    return total;
  }

  function reefPoolFor(level) {
    return (level.offers || []).slice(0, level.turns);
  }

  function corHasNursery(grid) {
    return grid.cells.some(function (kind) {
      return kind === "N";
    });
  }

  function corLegalAt(grid, kind, index) {
    if (!kind || !corSpecies[kind]) {
      return "bad";
    }
    if (index < 0 || index >= grid.cells.length) {
      return "off";
    }
    if (grid.cells[index]) {
      return "taken";
    }
    var depth = corDepth(Math.floor(index / corCols));
    var sp = corSpecies[kind];
    if (depth < sp.low || depth > sp.high) {
      return "depth";
    }
    if (sp.chain) {
      var touching = corNeighbours(grid, index).some(function (nb) {
        return nb.kind === "N";
      });
      if (!touching && corHasNursery(grid)) {
        return "chain";
      }
    }
    return "ok";
  }

  function corPlaceable(grid, kind) {
    for (var i = 0; i < grid.cells.length; i += 1) {
      if (corLegalAt(grid, kind, i) === "ok") {
        return true;
      }
    }
    return false;
  }

  /* The draft is only fair if an offer can always be planted somewhere, so the
   * check walks the scripted offers over many plausible reefs. */
  function reefFair(level, tries, seed) {
    var offers = reefPoolFor(level);
    var rng = corRandom(seed || 20240101 + level.id.length * 977);
    var dead = 0;
    var best = -999;
    for (var play = 0; play < (tries || 60); play += 1) {
      var grid = corFreshGrid();
      for (var turn = 0; turn < offers.length; turn += 1) {
        var legal = offers[turn]
          .split("")
          .filter(function (kind) {
            return corPlaceable(grid, kind);
          });
        if (!legal.length) {
          dead += 1;
          break;
        }
        var kind = legal[Math.floor(rng() * legal.length)];
        var spots = [];
        for (var i = 0; i < grid.cells.length; i += 1) {
          if (corLegalAt(grid, kind, i) === "ok") {
            spots.push(i);
          }
        }
        grid.cells[spots[Math.floor(rng() * spots.length)]] = kind;
      }
      best = Math.max(best, reefScore(grid));
    }
    var greedy = reefGreedy(level);
    return { fair: dead === 0, deadOffers: dead, greedy: greedy.score, random: best, where: greedy.where };
  }

  /* Greedy line through the scripted draft: the score a careful player can
   * always reach, which is what the star bands are cut against. */
  function reefGreedy(level) {
    var offers = reefPoolFor(level);
    var grid = corFreshGrid();
    var where = [];
    for (var turn = 0; turn < offers.length; turn += 1) {
      var bestPick = null;
      offers[turn]
        .split("")
        .forEach(function (kind) {
          for (var i = 0; i < grid.cells.length; i += 1) {
            if (corLegalAt(grid, kind, i) !== "ok") {
              continue;
            }
            grid.cells[i] = kind;
            var gain = reefScore(grid);
            grid.cells[i] = null;
            if (!bestPick || gain > bestPick.gain) {
              bestPick = { kind: kind, at: i, gain: gain };
            }
          }
        });
      if (!bestPick) {
        break;
      }
      grid.cells[bestPick.at] = bestPick.kind;
      where.push({ kind: bestPick.kind, at: bestPick.at, turn: turn });
    }
    return { score: reefScore(grid), where: where, grid: grid };
  }

  function corRandom(seed) {
    var state = seed % 2147483647;
    if (state <= 0) {
      state += 2147483646;
    }
    return function () {
      state = (state * 16807) % 2147483647;
      return (state - 1) / 2147483646;
    };
  }

  var corLevels = [
    {
      id: "c1",
      labelKey: "corZ1",
      turns: 10,
      stars: [62, 48, 36],
      offers: ["SSF", "SFS", "FSS", "SFS", "SSF", "FSS", "SFS", "SSF", "SFS", "FSS"],
    },
    {
      id: "c2",
      labelKey: "corZ2",
      turns: 12,
      stars: [80, 64, 48],
      offers: ["FPS", "SPF", "FPS", "PSF", "SFN", "FPS", "SPF", "NFS", "FPS", "SPF", "FNS", "PSF"],
    },
    {
      id: "c3",
      labelKey: "corZ3",
      turns: 12,
      stars: [86, 70, 52],
      offers: ["SFX", "XSF", "PSX", "SXF", "XPS", "FSX", "SXP", "XSF", "PSX", "SXF", "XPS", "FSX"],
    },
    {
      id: "c4",
      labelKey: "corZ4",
      turns: 13,
      stars: [120, 95, 70],
      offers: ["SNS", "NNS", "SNN", "NFS", "SNN", "NNS", "FPS", "NNS", "SNN", "NFS", "SNN", "NNS", "FNS"],
    },
    {
      id: "c5",
      labelKey: "corZ5",
      turns: 14,
      stars: [100, 82, 62],
      offers: ["FPN", "SXF", "NPS", "FPN", "XSN", "NPS", "FNS", "SPX", "NFP", "SXF", "NPS", "FNS", "PNX", "SFP"],
    },
  ];

  function initCoralArchitectGame(panelEl) {
    if (!panelEl) {
      return;
    }

    var campaign = createCampaign({ key: "coral-architect-campaign", levels: corLevels });
    var level = corLevels[campaign.indexOf(campaign.nextLevelId())] || corLevels[0];
    var grid = corFreshGrid();
    var offers = reefPoolFor(level);
    var turn = 0;
    var hand = -1;
    var moves = [];
    var cursor = { x: 3, y: 2 };
    var rafId = null;
    var settled = false;

    function el(tag, className, key) {
      var node = document.createElement(tag);
      if (className) {
        node.className = className;
      }
      if (key) {
        node.setAttribute("data-i18n", key);
        node.textContent = t(key);
      }
      return node;
    }

    function makeStat(key, valueEl) {
      var stat = el("div", "game-stat");
      stat.appendChild(el("span", "", key));
      stat.appendChild(valueEl);
      return stat;
    }

    /* --- markup: built with createElement so the headless harness sees it --- */
    var hud = el("div", "game-hud");
    var turnEl = el("strong");
    var scoreEl = el("strong");
    var handEl = el("strong");
    var goalEl = el("strong");
    hud.appendChild(makeStat("corTurnLabel", turnEl));
    hud.appendChild(makeStat("corScoreLabel", scoreEl));
    hud.appendChild(makeStat("corHandLabel", handEl));
    hud.appendChild(makeStat("corGoalLabel", goalEl));

    var canvas = el("canvas", "cor-canvas");
    canvas.width = corWide;
    canvas.height = corTall;
    canvas.setAttribute("tabindex", "0");
    canvas.setAttribute("role", "application");
    canvas.setAttribute("aria-label", t("corFieldLabel"));
    var ctx = canvas.getContext("2d");

    var draftRow = el("div", "elements-tools cor-draft");
    var draftLabel = el("span", "cor-dirlabel", "corDraftLabel");
    draftRow.appendChild(draftLabel);
    var draftButtons = [0, 1, 2].map(function (slot) {
      var btn = el("button", "cor-draft-btn");
      btn.type = "button";
      btn.addEventListener("click", function () {
        pickHand(slot);
      });
      draftRow.appendChild(btn);
      return btn;
    });

    var legend = el("div", "cor-legend");
    corRoster.forEach(function (kind) {
      var line = el("p", "cor-rule");
      var mark = el("span", "cor-glyph");
      mark.textContent = kind;
      line.appendChild(mark);
      var name = el("span", "cor-name", corSpecies[kind].key);
      line.appendChild(name);
      var rule = el("span", "cor-ruletext", corSpecies[kind].key + "Rule");
      line.appendChild(rule);
      legend.appendChild(line);
    });

    var result = el("p", "game-result");
    result.setAttribute("role", "status");

    var reefRow = el("div", "elements-row");
    var reefLabel = el("label", "elements-label", "corReefSelectLabel");
    reefLabel.setAttribute("for", "corReefSel");
    var reefSel = el("select", "elements-select");
    reefSel.id = "corReefSel";
    reefRow.appendChild(reefLabel);
    reefRow.appendChild(reefSel);

    var actions = el("div", "game-actions");
    var againBtn = el("button", "primary");
    againBtn.type = "button";
    var againLabel = el("span", "", "corBtnAgain");
    var againContent = el("span", "button-content");
    againContent.appendChild(againLabel);
    againBtn.appendChild(againContent);
    var bestEl = el("p", "game-best");
    actions.appendChild(againBtn);
    actions.appendChild(bestEl);

    var hint = el("p", "game-hint", "corHint");

    [hud, canvas, draftRow, result, legend, reefRow, actions, hint].forEach(function (node) {
      panelEl.appendChild(node);
    });

    function handKind() {
      if (hand < 0 || !offers[turn]) {
        return null;
      }
      return offers[turn].charAt(hand);
    }

    function renderHud() {
      turnEl.textContent = t("corTurnValue", { n: turn, max: level.turns });
      scoreEl.textContent = t("corScoreValue", { n: reefScore(grid) });
      goalEl.textContent = t("corGoalValue", { n: level.stars[2], high: level.stars[0] });
      var kind = handKind();
      handEl.textContent = kind ? kind + " " + t(corSpecies[kind].key) : t("corHandNone");
    }

    function refreshPicker() {
      fillCampaignPicker(
        reefSel,
        campaign,
        function (def) {
          return t(def.labelKey);
        },
        t("elementsLocked"),
      );
      reefSel.value = level.id;
      bestEl.textContent = t("campaignStars", { n: campaign.totalStars(), max: campaign.maxStars() });
    }

    function paintDraft() {
      var line = offers[turn] || "";
      draftButtons.forEach(function (btn, slot) {
        var kind = line.charAt(slot);
        btn.textContent = kind ? kind + " " + t(corSpecies[kind].key) : "-";
        if (kind && App.art) { btn.insertBefore(App.art.icon(kind === "S" ? "shell" : kind === "P" ? "rock" : "coral", { hue: kind === "N" ? 120 : kind === "X" ? 12 : 190, cls: "world-draft-art" }), btn.firstChild); }
        btn.className = "cor-draft-btn" + (hand === slot ? " is-on" : "");
        btn.setAttribute("aria-label", t("corDraftPick") + " " + (slot + 1) + " " + (kind || ""));
        btn.setAttribute("aria-pressed", hand === slot ? "true" : "false");
        btn.disabled = settled || !kind;
      });
    }

    function pickHand(slot) {
      if (settled) {
        return;
      }
      var line = offers[turn] || "";
      if (slot >= line.length) {
        return;
      }
      hand = hand === slot ? -1 : slot;
      renderHud();
      paintDraft();
      render();
    }

    function place(index) {
      if (settled) {
        result.textContent = t("corSettled");
        return;
      }
      if (hand < 0) {
        result.textContent = t("corNoHand");
        return;
      }
      var kind = handKind();
      var why = corLegalAt(grid, kind, index);
      if (why !== "ok") {
        result.textContent = t("corNo" + why.charAt(0).toUpperCase() + why.slice(1), {
          name: t(corSpecies[kind].key),
          d: corDepth(Math.floor(index / corCols)),
        });
        return;
      }
      grid.cells[index] = kind;
      moves.push({ at: index, turn: turn });
      hand = -1;
      turn += 1;
      renderHud();
      paintDraft();
      render();
      if (turn >= level.turns) {
        settle();
      } else {
        result.textContent = t("corPlaced", {
          name: t(corSpecies[kind].key),
          s: corTileScore(grid, index),
          left: level.turns - turn,
        });
      }
    }

    function cancelOrUndo() {
      if (settled) {
        return;
      }
      if (hand >= 0) {
        hand = -1;
        renderHud();
        paintDraft();
        render();
        return;
      }
      var last = moves.pop();
      if (!last) {
        result.textContent = t("corNothingToUndo");
        return;
      }
      grid.cells[last.at] = null;
      turn = last.turn;
      hand = -1;
      renderHud();
      paintDraft();
      render();
    }

    function settle() {
      settled = true;
      var score = reefScore(grid);
      var starsWon = starsFor(score, level.stars, "high");
      var outcome = campaign.record(level.id, { stars: starsWon, best: score, better: "high" });
      if (starsWon <= 0) {
        result.textContent = t("corWeak", { n: score, need: level.stars[2] });
        renderHud();
        render();
        return;
      }
      var message = t("corWin", { n: score, s: starsWon });
      if (outcome.isBest) {
        message += " " + t("newBest");
      }
      if (outcome.unlockedNext) {
        message += " " + t("corNextReef");
      } else if (campaign.clearedCount() === corLevels.length) {
        message += " " + t("corReefDone");
      }
      result.textContent = message;
      logAction(t("logCoralArchitect", { n: score }));
      var rect = againBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      refreshPicker();
      renderHud();
      render();
    }

    function loadReef(def) {
      level = def;
      offers = reefPoolFor(def);
      grid = corFreshGrid();
      turn = 0;
      hand = -1;
      moves = [];
      cursor = { x: 3, y: 2 };
      settled = false;
      renderHud();
      refreshPicker();
      paintDraft();
      var proof = reefFair(def, 40);
      var topLine = Math.max(proof.greedy, proof.random);
      result.textContent = !proof.fair
        ? t("corUnfair", { name: t(def.labelKey) })
        : topLine < def.stars[2]
          ? t("corUnreachable", { name: t(def.labelKey), need: def.stars[2], hit: topLine })
          : t("corPrompt", { name: t(def.labelKey), n: def.turns, need: def.stars[2], high: def.stars[0] });
      startLoop();
      render();
    }

    function cellRect(index) {
      var x = index % corCols;
      var y = Math.floor(index / corCols);
      return { x: corPad + x * corCell, y: corPad + y * corCell };
    }

    function drawShape(cx, cy, shape, colour) {
      if (App.world) { App.world.piece(ctx, "coral", cx, cy, 31, colour, shape); return; }
      ctx.strokeStyle = colour;
      ctx.fillStyle = colour;
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (shape === "fan") {
        ctx.moveTo(cx - 11, cy + 9);
        ctx.lineTo(cx, cy - 11);
        ctx.lineTo(cx + 11, cy + 9);
        ctx.closePath();
        ctx.stroke();
      } else if (shape === "bar") {
        ctx.rect(cx - 5, cy - 12, 10, 24);
        ctx.stroke();
      } else if (shape === "diamond") {
        ctx.moveTo(cx, cy - 11);
        ctx.lineTo(cx + 11, cy);
        ctx.lineTo(cx, cy + 11);
        ctx.lineTo(cx - 11, cy);
        ctx.closePath();
        ctx.stroke();
      } else if (shape === "ring") {
        ctx.arc(cx, cy, 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy, 4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        for (var p = 0; p < 5; p += 1) {
          var a = -Math.PI / 2 + (p * 2 * Math.PI) / 5;
          var bx = cx + Math.cos(a) * 11;
          var by = cy + Math.sin(a) * 11;
          if (p === 0) {
            ctx.moveTo(bx, by);
          } else {
            ctx.lineTo(bx, by);
          }
        }
        ctx.closePath();
        ctx.stroke();
      }
    }

    function render() {
      var now = Date.now();
      ctx.clearRect(0, 0, corWide, corTall);
      ctx.fillStyle = "rgba(6, 20, 30, 0.94)";
      ctx.fillRect(0, 0, corWide, corTall);
      if (App.world) { App.world.backdrop(ctx, corWide, corTall, "ocean"); }
      for (var y = 0; y < corRows; y += 1) {
        for (var x = 0; x < corCols; x += 1) {
          var index = y * corCols + x;
          var box = cellRect(index);
          var depth = corDepth(y);
          /* Depth is a number in every cell, never a shade alone. */
          ctx.fillStyle = "rgba(23, 58, 78, " + (0.35 + (depth / 27) * 0.5).toFixed(2) + ")";
          ctx.fillRect(box.x, box.y, corCell - 1, corCell - 1);
          ctx.fillStyle = "rgba(148, 163, 184, 0.85)";
          ctx.font = "9px 'JetBrains Mono', monospace";
          ctx.textAlign = "left";
          ctx.textBaseline = "top";
          ctx.fillText("d" + depth, box.x + 3, box.y + 3);
          var kind = grid.cells[index];
          if (kind) {
            var sp = corSpecies[kind];
            var colour = kind === "X" ? "#fb7185" : kind === "N" ? "#a3e635" : kind === "S" ? "#38bdf8" : kind === "P" ? "#fbbf24" : "#f472b6";
            drawShape(box.x + corCell / 2, box.y + corCell / 2 + 3, sp.shape, colour);
            ctx.fillStyle = colour;
            ctx.font = "bold 10px 'JetBrains Mono', monospace";
            ctx.textAlign = "right";
            ctx.textBaseline = "top";
            ctx.fillText(kind, box.x + corCell - 4, box.y + 3);
            ctx.fillStyle = "rgba(226, 232, 240, 0.95)";
            ctx.font = "9px 'JetBrains Mono', monospace";
            ctx.textAlign = "right";
            ctx.textBaseline = "bottom";
            ctx.fillText(String(corTileScore(grid, index)), box.x + corCell - 4, box.y + corCell - 3);
          } else if (hand >= 0 && cursor.x === x && cursor.y === y) {
            var pick = handKind();
            var ok = pick ? corLegalAt(grid, pick, index) === "ok" : false;
            ctx.setLineDash([3, 3]);
            ctx.strokeStyle = ok ? "rgba(0, 242, 255, 0.95)" : "rgba(251, 113, 133, 0.95)";
            ctx.lineWidth = 2;
            ctx.strokeRect(box.x + 1, box.y + 1, corCell - 3, corCell - 3);
            ctx.setLineDash([]);
            if (!isMotionOff() && ok) {
              var wob = Math.sin(now / 260 + index) * 2;
              ctx.strokeStyle = "rgba(0, 242, 255, 0.35)";
              ctx.beginPath();
              ctx.arc(box.x + corCell / 2, box.y + corCell / 2 + wob, 6, 0, Math.PI * 2);
              ctx.stroke();
            }
          }
        }
      }
      if (!isMotionOff()) {
        /* Rising bubbles are decoration only. */
        for (var b = 0; b < 4; b += 1) {
          var rise = (now / 26 + b * 70) % corTall;
          ctx.fillStyle = "rgba(226, 232, 240, 0.12)";
          ctx.beginPath();
          ctx.arc(corPad + 14 + b * 82, corTall - rise, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    function frame() {
      if (rafId === null) {
        return;
      }
      /* A hidden reef skips the frames but keeps its slot. */
      if (panelEl.hidden || document.hidden || isMotionOff() || settled) {
        rafId = window.requestAnimationFrame(frame);
        return;
      }
      render();
      rafId = window.requestAnimationFrame(frame);
    }

    function startLoop() {
      if (rafId !== null) {
        return;
      }
      rafId = window.requestAnimationFrame(frame);
    }

    function stopLoop() {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
    }

    function indexFromEvent(event) {
      var rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        return -1;
      }
      var px = (event.clientX - rect.left) * (canvas.width / rect.width);
      var py = (event.clientY - rect.top) * (canvas.height / rect.height);
      var gx = Math.floor((px - corPad) / corCell);
      var gy = Math.floor((py - corPad) / corCell);
      if (gx < 0 || gy < 0 || gx >= corCols || gy >= corRows) {
        return -1;
      }
      return gy * corCols + gx;
    }

    canvas.addEventListener("pointerdown", function (event) {
      event.preventDefault();
      var at = indexFromEvent(event);
      if (at < 0) {
        return;
      }
      cursor = { x: at % corCols, y: Math.floor(at / corCols) };
      if (hand < 0) {
        pickHand(0);
        if (hand < 0) {
          return;
        }
      }
      place(at);
    });

    canvas.addEventListener("pointermove", function (event) {
      var at = indexFromEvent(event);
      if (at >= 0 && hand >= 0) {
        cursor = { x: at % corCols, y: Math.floor(at / corCols) };
        render();
      }
    });

    canvas.addEventListener("keydown", function (event) {
      var key = event.key;
      if (key === "ArrowLeft" || key === "ArrowRight" || key === "ArrowUp" || key === "ArrowDown") {
        event.preventDefault();
        cursor = {
          x: Math.max(0, Math.min(corCols - 1, cursor.x + (key === "ArrowLeft" ? -1 : key === "ArrowRight" ? 1 : 0))),
          y: Math.max(0, Math.min(corRows - 1, cursor.y + (key === "ArrowUp" ? -1 : key === "ArrowDown" ? 1 : 0))),
        };
        render();
        return;
      }
      if (key === "1" || key === "2" || key === "3") {
        event.preventDefault();
        pickHand(Number(key) - 1);
        return;
      }
      if (key === "Enter" || key === " ") {
        event.preventDefault();
        place(cursor.y * corCols + cursor.x);
        return;
      }
      if (key === "Backspace" || key === "u" || key === "U") {
        event.preventDefault();
        cancelOrUndo();
      }
    });

    againBtn.addEventListener("click", function () {
      loadReef(level);
    });

    reefSel.addEventListener("change", function () {
      var index = campaign.indexOf(reefSel.value);
      if (index >= 0 && campaign.isUnlocked(reefSel.value)) {
        stopLoop();
        loadReef(corLevels[index]);
        return;
      }
      reefSel.value = level.id;
      result.textContent = t("corLockedReef");
    });

    /* The reef is the player's blueprint: a pause only stops the bubbles. */
    App.quietResetCoralArchitect = function () {
      stopLoop();
      paintDraft();
      renderHud();
      render();
    };

    loadReef(level);
  }

  App.addStrings({
    en: {
      "tabCoralArchitect": "Coral Architect",
      "corZ1": "Shallow Shelf",
      "corZ2": "Depth Bands",
      "corZ3": "Fence the Urchin",
      "corZ4": "Nursery Chain",
      "corZ5": "The Full Lagoon",
      "corTurnLabel": "Turn",
      "corScoreLabel": "Reef",
      "corHandLabel": "In hand",
      "corGoalLabel": "Bands",
      "corReefSelectLabel": "Reef",
      "corTurnValue": "{n}/{max}",
      "corScoreValue": "{n} pts",
      "corGoalValue": "{n}-{high}",
      "corHandNone": "none",
      "corDraftLabel": "Draft",
      "corDraftPick": "Offered tile",
      "corFieldLabel": "Reef grid: depth is printed in every cell; arrow keys move the planter, 1 2 3 take a tile from the draft, Enter plants it, Backspace cancels",
      "corFan": "Fan",
      "corPillar": "Pillar",
      "corSponge": "Sponge",
      "corNursery": "Nursery",
      "corUrchin": "Urchin",
      "corFanRule": "5 pts, needs depth 2-11",
      "corPillarRule": "2 pts plus 2 per touching tile, needs depth 11 or more",
      "corSpongeRule": "1 pt, or 7 with three open sides",
      "corNurseryRule": "3 pts plus 4 per nursery beside it, needs depth 7-19 and must touch a nursery",
      "corUrchinRule": "minus 2 pts, and steals 2 from every tile it touches",
      "corBtnAgain": "New Reef",
      "corPrompt": "{name}: {n} turns of draft. A reef of {need} points clears and {high} is the three-star line.",
      "corPlaced": "{name} planted for {s} points. {left} turns of draft left.",
      "corNoHand": "Take a tile from the draft first: keys 1, 2, 3 or the buttons above the reef.",
      "corNoBad": "That tile cannot be planted here.",
      "corNoOff": "That is outside the reef.",
      "corNoTaken": "That spot already has coral growing in it.",
      "corNoDepth": "{name} cannot live at depth {d} - check its band in the legend.",
      "corNoChain": "{name} must touch a nursery already on the reef.",
      "corNothingToUndo": "Nothing planted yet to take back.",
      "corSettled": "This reef is finished - press New Reef to draft again.",
      "corWin": "The reef reads {n} points - {s} stars.",
      "corWeak": "The reef only reached {n} points - {need} clears it. Take another draft.",
      "corNextReef": "Next reef unlocked.",
      "corReefDone": "The whole lagoon is built and thriving.",
      "corLockedReef": "That reef is still sealed - finish the one before it.",
      "corUnfair": "{name} was dealt with an offer nobody could plant, so it is on hold.",
      "corUnreachable": "{name} no longer pays {need} points - the best line found reached {hit}.",
      "corHint": "Planting is permanent, so read the band on each tile first: sponges want open water beside them, pillars want crowded ones, nurseries have to touch a nursery, and an urchin is worth parking in a corner where it touches nothing.",
      "logCoralArchitect": "Grew a {n} point reef",
    },
    zh: {
      "tabCoralArchitect": "珊瑚建筑师",
      "corZ1": "浅水架",
      "corZ2": "深浅分层",
      "corZ3": "围住海胆",
      "corZ4": "育苗链",
      "corZ5": "整片潟湖",
      "corTurnLabel": "回合",
      "corScoreLabel": "珊瑚",
      "corHandLabel": "手上",
      "corGoalLabel": "分档",
      "corReefSelectLabel": "礁盘",
      "corTurnValue": "{n}/{max}",
      "corScoreValue": "{n} 分",
      "corGoalValue": "{n}-{high}",
      "corHandNone": "空",
      "corDraftLabel": "三选",
      "corDraftPick": "备选牌",
      "corFieldLabel": "礁盘网格：每格都写着水深；方向键移动种植光标，1 2 3 从三选里取一张，回车种下，退格取消",
      "corFan": "柳珊瑚",
      "corPillar": "柱珊瑚",
      "corSponge": "海绵",
      "corNursery": "育苗床",
      "corUrchin": "海胆",
      "corFanRule": "5 分，需要水深 2 到 11",
      "corPillarRule": "2 分，每相邻一块再加 2 分，需要水深 11 以上",
      "corSpongeRule": "1 分，若三面空着则 7 分",
      "corNurseryRule": "3 分，每邻一块育苗床加 4 分；需要水深 7 到 19，且必须贴住已有的育苗床",
      "corUrchinRule": "扣 2 分，并把它挨到的每块珊瑚抢掉 2 分",
      "corBtnAgain": "重造珊瑚礁",
      "corPrompt": "{name}：共 {n} 轮三选。珊瑚礁到 {need} 分过关，{high} 分是三星线。",
      "corPlaced": "种下{name}，这块得 {s} 分。还剩 {left} 轮三选。",
      "corNoHand": "先从三选里拿一张牌：按 1、2、3 或点礁盘上方的按钮。",
      "corNoBad": "这张牌不能种在这里。",
      "corNoOff": "那里在礁盘之外。",
      "corNoTaken": "那处已经有珊瑚长着了。",
      "corNoDepth": "{name} 活不到水深 {d}，请对照图例里的水深带。",
      "corNoChain": "{name} 必须贴住礁盘上已有的育苗床。",
      "corNothingToUndo": "还没有种下的东西可以收回。",
      "corSettled": "这片礁已经造完——按“重造珊瑚礁”再来一轮。",
      "corWin": "珊瑚礁合计 {n} 分 - 获得 {s} 星。",
      "corWeak": "珊瑚礁只有 {n} 分 - 要到 {need} 分才过关，再造一片吧。",
      "corNextReef": "解锁下一片礁盘。",
      "corReefDone": "整片潟湖都造好了，长得也旺。",
      "corLockedReef": "这片礁盘还没开放——先完成前一片。",
      "corUnfair": "{name} 曾发出没人能种的三选，所以暂缓开放。",
      "corUnreachable": "{name} 现在到不了 {need} 分——找到的最好一条只拿到 {hit} 分。",
      "corHint": "种下去就不能挪，所以先读每张牌的水深带：海绵要身旁空着，柱珊瑚要挤在一起，育苗床必须贴着育苗床，海胆最好停在角落谁也挨不着。",
      "logCoralArchitect": "造出 {n} 分的珊瑚礁",
    },
  });

  App.registerGame({
    name: "coralArchitect",
    tabKey: "tabCoralArchitect",
    init: initCoralArchitectGame,
    guide: {
      svg:
        '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="6" y="6" width="108" height="64" rx="5" fill="rgba(13,40,54,.85)" stroke="rgba(148,163,184,.45)"/>' +
        '<path d="M6 26h108M6 46h108" stroke="rgba(148,163,184,.25)"/>' +
        '<path d="M42 6v64M78 6v64" stroke="rgba(148,163,184,.2)"/>' +
        '<path d="M20 20l6-9 6 9z" fill="none" stroke="#f472b6" stroke-width="2"/>' +
        '<rect x="52" y="32" width="9" height="20" fill="none" stroke="#fbbf24" stroke-width="2"/>' +
        '<circle cx="94" cy="20" r="7" fill="none" stroke="#a3e635" stroke-width="2"/>' +
        '<path d="M28 56l3 6 6 1-4 4 1 6-6-3-6 3 1-6-4-4 6-1z" fill="none" stroke="#fb7185" stroke-width="1.6"/>' +
        '<text x="60" y="70" font-size="7" fill="#94a3b8" text-anchor="middle">d3 d11 d19 d23</text></svg>',
      en: [
        "Aim: grow a reef whose final score reaches the level's band - three stars is the top line.",
        "Action: each turn three tiles are offered; take one with keys 1, 2, 3 or its button, then plant it with Enter or a click.",
        "Rule: depth is printed in every cell and every species has a band; planting is permanent and the legend states each tile's edge rule.",
        "Watch out: the urchin is negative - it loses points itself and steals two from every tile it touches, so park it somewhere it reaches nothing.",
        "Undo: Backspace puts an in-hand tile back, or lifts the last coral out again before the draft is spent.",
        "Scoring: the number on each tile is exactly what it contributes, so the total is arithmetic you can plan in advance.",
      ],
      zh: [
        "目标：把珊瑚礁养到本关的分数线——顶档就是三星。",
        "操作：每轮发三张牌，用 1、2、3 或点按钮取一张，再按回车或点击把它种下。",
        "规则：每格都写着水深，每个种类都有自己的水深带；种下就不能挪，图例里写清了每块牌的邻接规则。",
        "小心：海胆是负分——它自己扣分，还从挨到的每块珊瑚抢两分，所以要把它安置在谁也碰不着的地方。",
        "悔手：退格键先把手上的牌放回三选；已经种下的最后一块也能起出来，趁这一轮的三选还没用完。",
        "计分：每块牌上显示的数字就是它的贡献，所以总分是你能提前算清的算术。",
      ],
    },
  });

  /* Exported for the other modules and for the headless checks. */
  App.initCoralArchitectGame = initCoralArchitectGame;
  App.reefScore = reefScore;
  App.reefPoolFor = reefPoolFor;
  App.reefFair = reefFair;
  App.reefGreedy = reefGreedy;
  App.reefLegalAt = corLegalAt;
  App.reefTileScore = corTileScore;
  App.reefFresh = corFreshGrid;
  App.reefSpecies = corSpecies;
  App.reefLevels = corLevels;
})(window.CapitalConvert = window.CapitalConvert || {});
