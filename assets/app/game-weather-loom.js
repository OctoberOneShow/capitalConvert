/* Weather Loom - the climate steering game in the shared game drawer.
 * Heat and moisture are numbers on a grid, and the player weaves with them one
 * season at a time: spend loom points on wind, heat and shade, then run twenty
 * fixed steps and read what each village collected. The same stepper proves an
 * authored season's weave before it is dealt. Registered through the game
 * registry, so it needs no markup in the four HTML pages. */
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

  var wlkCols = 10;
  var wlkRows = 8;
  var wlkCell = 34;
  var wlkPad = 12;
  var wlkWide = wlkPad * 2 + wlkCols * wlkCell;
  var wlkTall = wlkPad * 2 + wlkRows * wlkCell;
  /* Wind directions as grid offsets: 0 east, 1 south, 2 west, 3 north. */
  var wlkDX = [1, 0, -1, 0];
  var wlkDY = [0, 1, 0, -1];
  var wlkArrows = ["\u2192", "\u2193", "\u2190", "\u2191"];
  var wlkCost = { w: 1, h: 2, s: 1 };
  var wlkKinds = ["w", "h", "s"];
  var wlkStepMs = 200;

  var wlkBase = {
    ambient: 50,
    drift: 0.12,
    source: 6,
    lakeSource: 5,
    creep: 0.03,
    wind: 0.5,
    heater: 9,
    lift: 0.35,
    shade: 9,
    dryHeat: 58,
    wetHeat: 45,
    dry: 3,
    wet: 3.5,
    drain: 0.9,
    rainAt: 58,
    dump: 0.55,
    floodLimit: 92,
    floodWeight: 1,
  };

  /* Small constructors keep an authored season readable: one line of tools is
   * one line of weather. */
  function wlkWind(x, y, dir) {
    return { x: x, y: y, kind: "w", dir: dir === undefined ? 0 : dir };
  }

  function wlkShade(x, y) {
    return { x: x, y: y, kind: "s", dir: 0 };
  }

  function wlkVillage(x, y, min, max) {
    return { x: x, y: y, min: min, max: max };
  }

  function wlkSpot(x, y) {
    return { x: x, y: y };
  }

  /* Every season ships the weave that clears it, so a deal can be proved and no
   * level asks for rain nothing can reach. The bands sit around what that weave
   * really collects across the twenty steps. */
  var wlkLevels = [
    {
      id: "w1", labelKey: "wlkZ1", points: 8, ticks: 20, cfg: {},
      villages: [wlkVillage(4, 2, 22, 50), wlkVillage(3, 5, 22, 50)],
      plan: [wlkWind(0, 2), wlkWind(1, 2), wlkWind(2, 2), wlkWind(3, 2), wlkWind(0, 5), wlkWind(1, 5), wlkWind(2, 5)],
    },
    {
      id: "w2", labelKey: "wlkZ2", points: 10, ticks: 20, cfg: { source: 7 },
      ridge: [wlkSpot(3, 2), wlkSpot(3, 3), wlkSpot(3, 4)],
      villages: [wlkVillage(2, 3, 45, 90), wlkVillage(5, 3, 22, 48)],
      plan: [wlkWind(0, 3), wlkWind(1, 3), wlkWind(0, 5), wlkWind(1, 5), wlkWind(2, 5), wlkWind(3, 5), wlkWind(4, 5), wlkWind(5, 5, 3), wlkWind(5, 4, 3)],
    },
    {
      id: "w3", labelKey: "wlkZ3", points: 11, ticks: 20,
      cfg: { ambient: 62, source: 5, dryHeat: 58, wetHeat: 56, drain: 1.4, rainAt: 55 },
      villages: [wlkVillage(3, 2, 22, 44), wlkVillage(4, 6, 22, 44)],
      plan: [wlkWind(0, 2), wlkWind(1, 2), wlkWind(2, 2), wlkShade(3, 2), wlkWind(0, 6), wlkWind(1, 6), wlkWind(2, 6), wlkWind(3, 6), wlkShade(4, 6)],
    },
    {
      id: "w4", labelKey: "wlkZ4", points: 13, ticks: 20,
      cfg: { source: 11, rainAt: 54, floodLimit: 80, floodWeight: 2 },
      villages: [wlkVillage(3, 3, 42, 78), wlkVillage(6, 2, 42, 78)],
      plan: [wlkWind(0, 6), wlkWind(1, 6), wlkWind(2, 6), wlkWind(3, 6, 3), wlkWind(3, 5, 3), wlkWind(3, 4, 3),
        wlkWind(0, 2), wlkWind(1, 2), wlkWind(2, 2), wlkWind(3, 2), wlkWind(4, 2), wlkWind(5, 2)],
    },
    {
      id: "w5", labelKey: "wlkZ5", points: 14, ticks: 20, cfg: { source: 9, lakeSource: 3 },
      lake: [wlkSpot(9, 3), wlkSpot(9, 6)],
      villages: [wlkVillage(4, 1, 45, 78), wlkVillage(4, 4, 45, 78), wlkVillage(7, 3, 50, 78), wlkVillage(7, 6, 50, 78)],
      plan: [wlkWind(0, 1), wlkWind(1, 1), wlkWind(2, 1), wlkWind(3, 1), wlkWind(0, 4), wlkWind(1, 4), wlkWind(2, 4), wlkWind(3, 4),
        wlkWind(9, 3, 2), wlkWind(8, 3, 2), wlkWind(9, 6, 2), wlkWind(8, 6, 2)],
    },
  ];

  function wlkCfg(level) {
    if (!level.cfgCache) {
      var cfg = {};
      Object.keys(wlkBase).forEach(function (key) {
        cfg[key] = wlkBase[key];
      });
      var over = level.cfg || {};
      Object.keys(over).forEach(function (key) {
        cfg[key] = over[key];
      });
      level.cfgCache = cfg;
    }
    return level.cfgCache;
  }

  function wlkAt(x, y) {
    return y * wlkCols + x;
  }

  function wlkClamp(value, low, high) {
    var n = Number(value);
    if (!isFinite(n)) {
      return low;
    }
    return n < low ? low : n > high ? high : n;
  }

  /* Fields are flat arrays built from the level alone, so a season always
   * starts the same way and a weave replays exactly. */
  function wlkFresh(level) {
    var cfg = wlkCfg(level);
    var heat = [];
    var moist = [];
    var rain = [];
    var block = {};
    var water = {};
    var i;
    for (i = 0; i < wlkCols * wlkRows; i += 1) {
      heat.push(cfg.ambient);
      moist.push(18);
      rain.push(0);
    }
    (level.wet || []).forEach(function (cell) {
      moist[wlkAt(cell.x, cell.y)] = cell.moist === undefined ? 70 : cell.moist;
    });
    (level.hot || []).forEach(function (cell) {
      heat[wlkAt(cell.x, cell.y)] = cell.heat === undefined ? 76 : cell.heat;
    });
    (level.ridge || []).forEach(function (cell) {
      var at = wlkAt(cell.x, cell.y);
      block[at] = 1;
      heat[at] = cfg.ambient - 12;
      moist[at] = 0;
    });
    /* Water cells are refilled every step and rain over them floods nothing. */
    for (i = 0; i < wlkRows; i += 1) {
      water[wlkAt(0, i)] = cfg.source;
    }
    (level.lake || []).forEach(function (cell) {
      var at = wlkAt(cell.x, cell.y);
      if (!block[at]) {
        water[at] = cfg.lakeSource;
        moist[at] = 80;
      }
    });
    return { heat: heat, moist: moist, rain: rain, block: block, water: water, tick: 0, cfg: cfg };
  }

  /* One deterministic step over the whole weave, so the season never depends
   * on the order the tools were placed in or on wall clock. */
  function loomStep(state, actions) {
    var cfg = state.cfg;
    var heat = state.heat.slice();
    var moist = state.moist.slice();
    var rain = state.rain.slice();
    var block = state.block || {};
    var supply = state.water || {};
    var before = moist.slice();
    var delta = [];
    var move = function (from, to, amount) {
      delta[to] += amount;
      delta[from] -= amount;
    };
    var i;
    var x;
    var y;
    for (i = 0; i < before.length; i += 1) {
      delta.push(0);
      heat[i] += (cfg.ambient - heat[i]) * cfg.drift;
    }
    (actions || []).forEach(function (act) {
      var at = wlkAt(act.x, act.y);
      if (block[at]) {
        return;
      }
      if (act.kind === "h") {
        heat[at] += cfg.heater;
        if (act.y > 0 && !block[at - wlkCols]) {
          move(at, at - wlkCols, before[at] * cfg.lift);
        } else {
          delta[at] -= before[at] * cfg.lift;
        }
        return;
      }
      if (act.kind === "s") {
        heat[at] -= cfg.shade;
        return;
      }
      var dir = act.dir === undefined ? 0 : act.dir;
      x = act.x + wlkDX[dir];
      y = act.y + wlkDY[dir];
      if (x < 0 || y < 0 || x >= wlkCols || y >= wlkRows || block[wlkAt(x, y)]) {
        return;
      }
      move(at, wlkAt(x, y), before[at] * cfg.wind);
    });
    Object.keys(supply).forEach(function (where) {
      var at = Number(where);
      if (!block[at]) {
        delta[at] += supply[at];
      }
    });
    for (y = 0; y < wlkRows; y += 1) {
      for (x = 0; x < wlkCols - 1; x += 1) {
        i = wlkAt(x, y);
        if (!block[i] && !block[i + 1]) {
          move(i, i + 1, before[i] * cfg.creep);
        }
      }
    }
    for (i = 0; i < moist.length; i += 1) {
      moist[i] += delta[i];
      if (block[i]) {
        heat[i] = cfg.ambient - 12;
        moist[i] = 0;
        rain[i] = wlkClamp(rain[i], 0, 400);
        continue;
      }
      if (heat[i] >= cfg.dryHeat) {
        moist[i] -= cfg.dry;
      } else if (heat[i] <= cfg.wetHeat) {
        moist[i] += cfg.wet;
      }
      moist[i] -= cfg.drain;
      if (moist[i] >= cfg.rainAt) {
        var dump = moist[i] * cfg.dump;
        moist[i] -= dump;
        rain[i] += dump;
      }
      heat[i] = wlkClamp(heat[i], 0, 100);
      moist[i] = wlkClamp(moist[i], 0, 160);
      rain[i] = wlkClamp(rain[i], 0, 400);
    }
    return { heat: heat, moist: moist, rain: rain, block: block, water: supply, tick: state.tick + 1, cfg: cfg };
  }

  /* Under the band is drought, over the flood line is a flood, and a flooded
   * cell always costs - doubly in a storm year. */
  function loomScore(state, villages, cfg) {
    var rules = cfg || (state && state.cfg) || wlkBase;
    var limit = rules.floodLimit === undefined ? 92 : rules.floodLimit;
    var supply = state.water || {};
    var home = {};
    var fed = 0;
    var missed = 0;
    var flooded = 0;
    (villages || []).forEach(function (village, index) {
      var at = wlkAt(village.x, village.y);
      var got = state.rain[at] || 0;
      home[at] = index;
      if (got > limit) {
        flooded += 1;
      }
      if (got >= village.min && got <= village.max) {
        fed += 1;
      } else {
        missed += 1;
      }
    });
    for (var i = 0; i < state.rain.length; i += 1) {
      /* Rain over open water floods nothing. */
      var open = supply[i] !== undefined || i % wlkCols === 0;
      if (!open && home[i] === undefined && state.rain[i] > limit) {
        flooded += 1;
      }
    }
    var count = (villages || []).length;
    return {
      fed: fed,
      missed: missed,
      flooded: flooded,
      value: fed * 10 - flooded * (rules.floodWeight || 1) * 4,
      top: count * 10,
    };
  }

  function wlkBands(level) {
    var n = level.villages.length;
    return [n * 10, n * 10 - 4, (n - 1) * 10];
  }

  /* Replays a whole season from scratch: the proof a level is dealt on. */
  function loomRun(level, actions, ticks) {
    var state = wlkFresh(level);
    var steps = ticks === undefined ? level.ticks || 20 : ticks;
    for (var tick = 0; tick < steps; tick += 1) {
      state = loomStep(state, actions || []);
    }
    var bands = wlkBands(level);
    var score = loomScore(state, level.villages, level.cfgCache);
    return { state: state, score: score, bands: bands, stars: starsFor(score.value, bands, "high") };
  }

  function loomLegal(level, state, act, placed) {
    if (!act || act.x < 0 || act.y < 0 || act.x >= wlkCols || act.y >= wlkRows) {
      return "Off";
    }
    var list = placed || [];
    if (state && state.block && state.block[wlkAt(act.x, act.y)]) {
      return "Ridge";
    }
    if (
      list.some(function (other) {
        return other.x === act.x && other.y === act.y;
      })
    ) {
      return "Taken";
    }
    var used = list.reduce(function (sum, other) {
      return sum + (wlkCost[other.kind] || 1);
    }, 0);
    if (used + (wlkCost[act.kind] || 1) > level.points) {
      return "Spent";
    }
    return "Ok";
  }

  function initWeatherLoomGame(panelEl) {
    if (!panelEl) {
      return;
    }

    var campaign = createCampaign({ key: "weather-loom-campaign", levels: wlkLevels });
    var level = wlkLevels[campaign.indexOf(campaign.nextLevelId())] || wlkLevels[0];
    var bands = wlkBands(level);
    var state = wlkFresh(level);
    var plan = [];
    var tool = "w";
    var wind = 0;
    var cursor = { x: 2, y: 3 };
    var running = false;
    var done = false;
    var timerId = null;
    var rafId = null;

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
    var seasonEl = el("strong");
    var pointsEl = el("strong");
    var fedEl = el("strong");
    var floodEl = el("strong");
    hud.appendChild(makeStat("wlkSeasonLabel", seasonEl));
    hud.appendChild(makeStat("wlkPointsLabel", pointsEl));
    hud.appendChild(makeStat("wlkFedLabel", fedEl));
    hud.appendChild(makeStat("wlkFloodLabel", floodEl));

    var canvas = el("canvas", "wlk-canvas");
    canvas.width = wlkWide;
    canvas.height = wlkTall;
    canvas.setAttribute("tabindex", "0");
    canvas.setAttribute("role", "application");
    canvas.setAttribute("aria-label", t("wlkFieldLabel"));
    var ctx = canvas.getContext("2d");

    var legend = el("p", "wlk-legend");

    var toolsRow = el("div", "elements-tools wlk-tools");
    var toolButtons = wlkKinds.map(function (kind) {
      var key = "wlkTool" + kind.toUpperCase();
      var btn = el("button", "wlk-tool", key);
      btn.type = "button";
      btn.addEventListener("click", function () {
        pickTool(kind);
      });
      toolsRow.appendChild(btn);
      return btn;
    });
    var clearBtn = el("button", "wlk-clear", "wlkBtnClear");
    clearBtn.type = "button";
    clearBtn.addEventListener("click", clearPlan);
    toolsRow.appendChild(clearBtn);

    /* Wind is a direction, so it gets real labelled buttons instead of hiding
     * half the tool behind an unannounced key. */
    var dirRow = el("div", "elements-tools wlk-tools");
    dirRow.appendChild(el("span", "wlk-dirlabel", "wlkDirLabel"));
    var dirButtons = [0, 1, 2, 3].map(function (dir) {
      var btn = el("button", "wlk-dir");
      btn.type = "button";
      btn.setAttribute("aria-label", t("wlkDir" + dir));
      btn.textContent = wlkArrows[dir];
      btn.addEventListener("click", function () {
        wind = dir;
        pickTool("w");
      });
      dirRow.appendChild(btn);
      return btn;
    });

    var result = el("p", "game-result");
    result.setAttribute("role", "status");

    var seasonRow = el("div", "elements-row");
    var seasonLabel = el("label", "elements-label", "wlkSeasonSelectLabel");
    seasonLabel.setAttribute("for", "wlkSeasonSel");
    var seasonSel = el("select", "elements-select");
    seasonSel.id = "wlkSeasonSel";
    seasonRow.appendChild(seasonLabel);
    seasonRow.appendChild(seasonSel);

    var actions = el("div", "game-actions");
    var runBtn = el("button", "primary");
    runBtn.type = "button";
    var runLabel = el("span", "", "wlkBtnRun");
    var runContent = el("span", "button-content");
    runContent.appendChild(runLabel);
    runBtn.appendChild(runContent);
    var bestEl = el("p", "game-best");
    actions.appendChild(runBtn);
    actions.appendChild(bestEl);

    var hint = el("p", "game-hint", "wlkHint");

    [hud, canvas, legend, toolsRow, dirRow, result, seasonRow, actions, hint].forEach(function (node) {
      panelEl.appendChild(node);
    });

    function spent() {
      return plan.reduce(function (sum, act) {
        return sum + (wlkCost[act.kind] || 1);
      }, 0);
    }

    function setRunLabel(key) {
      runLabel.setAttribute("data-i18n", key);
      runLabel.textContent = t(key);
    }

    function renderHud() {
      var score = loomScore(state, level.villages, level.cfgCache);
      seasonEl.textContent = t("wlkSeasonValue", { n: state.tick, max: level.ticks });
      pointsEl.textContent = t("wlkPointsValue", { n: Math.max(0, level.points - spent()), max: level.points });
      fedEl.textContent = t("wlkFedValue", { n: score.fed, max: level.villages.length });
      floodEl.textContent = t("wlkFloodValue", { n: score.flooded });
    }

    function refreshPicker() {
      fillCampaignPicker(
        seasonSel,
        campaign,
        function (def) {
          return t(def.labelKey);
        },
        t("elementsLocked"),
      );
      seasonSel.value = level.id;
      bestEl.textContent = t("campaignStars", { n: campaign.totalStars(), max: campaign.maxStars() });
    }

    function villageLine() {
      return level.villages
        .map(function (village, index) {
          var got = Math.round(state.rain[wlkAt(village.x, village.y)] || 0);
          return String.fromCharCode(65 + index) + " " + got + "/" + village.min + "-" + village.max;
        })
        .join(" \u00b7 ");
    }

    function paintTools() {
      toolButtons.forEach(function (btn, index) {
        var on = tool === wlkKinds[index];
        btn.className = "wlk-tool" + (on ? " is-on" : "");
        btn.setAttribute("aria-pressed", on ? "true" : "false");
      });
      dirButtons.forEach(function (btn, index) {
        var on = tool === "w" && wind === index;
        btn.className = "wlk-dir" + (on ? " is-on" : "");
        btn.setAttribute("aria-pressed", on ? "true" : "false");
      });
    }

    function pickTool(kind) {
      tool = kind;
      paintTools();
      render();
    }

    function place(x, y) {
      if (running || done) {
        result.textContent = t("wlkLocked");
        return;
      }
      var act = { x: x, y: y, kind: tool, dir: wind };
      var check = loomLegal(level, state, act, plan);
      if (check !== "Ok") {
        result.textContent = t("wlkNo" + check);
        return;
      }
      plan.push(act);
      cursor = { x: x, y: y };
      renderHud();
      render();
    }

    function undo() {
      if (running || done || !plan.length) {
        return;
      }
      plan.pop();
      renderHud();
      render();
    }

    function clearPlan() {
      if (running || done) {
        return;
      }
      plan = [];
      renderHud();
      render();
    }

    function runSeason() {
      if (running || done || timerId !== null) {
        return;
      }
      running = true;
      setRunLabel("wlkBtnRunning");
      timerId = window.setInterval(stepSeason, wlkStepMs);
      startLoop();
    }

    /* Twenty fixed steps, one per beat. A hidden panel skips the beat instead
     * of banking it, so a season never fast-forwards through the tab switch. */
    function stepSeason() {
      if (panelEl.hidden || document.hidden || !running) {
        return;
      }
      state = loomStep(state, plan);
      renderHud();
      render();
      if (state.tick >= (level.ticks || 20)) {
        settle();
      }
    }

    function settle() {
      running = false;
      if (timerId !== null) {
        window.clearInterval(timerId);
        timerId = null;
      }
      done = true;
      var score = loomScore(state, level.villages, level.cfgCache);
      var starsWon = starsFor(score.value, bands, "high");
      setRunLabel("wlkBtnAgain");
      if (starsWon <= 0) {
        result.textContent = t("wlkFailed", {
          fed: score.fed,
          max: level.villages.length,
          need: bands[2],
          value: score.value,
        });
        renderHud();
        render();
        return;
      }
      var outcome = campaign.record(level.id, { stars: starsWon, best: score.value, better: "high" });
      var message = t("wlkHarvest", { fed: score.fed, max: level.villages.length, flood: score.flooded, s: starsWon });
      if (outcome.isBest) {
        message += " " + t("newBest");
      }
      if (outcome.unlockedNext) {
        message += " " + t("wlkNextSeason");
      } else if (campaign.clearedCount() === wlkLevels.length) {
        message += " " + t("wlkLoomDone");
      }
      result.textContent = message;
      logAction(t("logWeatherLoom", { n: score.fed, max: level.villages.length }));
      var rect = runBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      refreshPicker();
      renderHud();
      render();
    }

    function loadSeason(def) {
      if (timerId !== null) {
        window.clearInterval(timerId);
        timerId = null;
      }
      stopLoop();
      level = def;
      bands = wlkBands(def);
      state = wlkFresh(def);
      plan = [];
      running = false;
      done = false;
      cursor = { x: 2, y: Math.floor(wlkRows / 2) - 1 };
      renderHud();
      refreshPicker();
      paintTools();
      var proof = loomRun(def, def.plan);
      result.textContent =
        proof.stars > 0
          ? t("wlkPrompt", { name: t(def.labelKey), p: def.points, v: def.villages.length })
          : t("wlkUnproven", { name: t(def.labelKey) });
      setRunLabel("wlkBtnRun");
      startLoop();
      render();
    }

    function tint(heat, moist) {
      var warm = Math.max(0, Math.min(1, (Number(heat) - 40) / 45)) || 0;
      var wet = Math.max(0, Math.min(1, Number(moist) / 80)) || 0;
      return (
        "rgb(" +
        Math.round(24 + warm * 120) +
        "," +
        Math.round(34 + wet * 60) +
        "," +
        Math.round(58 + wet * 90) +
        ")"
      );
    }

    function render() {
      var i;
      var x;
      var y;
      ctx.clearRect(0, 0, wlkWide, wlkTall);
      ctx.fillStyle = "rgba(8, 12, 20, 0.92)";
      ctx.fillRect(0, 0, wlkWide, wlkTall);
      for (y = 0; y < wlkRows; y += 1) {
        for (x = 0; x < wlkCols; x += 1) {
          i = wlkAt(x, y);
          var px = wlkPad + x * wlkCell;
          var py = wlkPad + y * wlkCell;
          var stone = !!(state.block && state.block[i]);
          var open = !!(state.water && state.water[i] !== undefined);
          ctx.fillStyle = stone ? "rgba(71, 85, 105, 0.9)" : open ? "rgba(14, 116, 144, 0.85)" : tint(state.heat[i], state.moist[i]);
          ctx.fillRect(px, py, wlkCell - 1, wlkCell - 1);
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          if (stone || open) {
            ctx.fillStyle = "rgba(226, 232, 240, 0.8)";
            ctx.font = "bold 13px 'JetBrains Mono', monospace";
            ctx.fillText(stone ? "^" : "=", px + wlkCell / 2, py + 10);
          } else {
            ctx.fillStyle = "rgba(255, 214, 165, 0.95)";
            ctx.font = "9px 'JetBrains Mono', monospace";
            ctx.fillText(String(Math.round(wlkClamp(state.heat[i], 0, 100))), px + wlkCell / 2, py + 2);
            ctx.fillStyle = "rgba(125, 211, 252, 0.95)";
            ctx.fillText(String(Math.round(wlkClamp(state.moist[i], 0, 160))), px + wlkCell / 2, py + 22);
            if (state.rain[i] > 0.5) {
              ctx.fillStyle = "rgba(163, 230, 53, 0.95)";
              ctx.font = "8px 'JetBrains Mono', monospace";
              ctx.textAlign = "left";
              ctx.fillText("r" + Math.round(state.rain[i]), px + 2, py + 12);
            }
          }
        }
      }

      /* A placement shows its glyph and its letter, never colour alone. */
      plan.forEach(function (act) {
        var at = wlkAt(act.x, act.y);
        var px = wlkPad + act.x * wlkCell;
        var py = wlkPad + act.y * wlkCell;
        ctx.strokeStyle = "rgba(0, 242, 255, 0.85)";
        ctx.lineWidth = 2;
        ctx.strokeRect(px + 1, py + 1, wlkCell - 3, wlkCell - 3);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 14px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(act.kind === "h" ? "+" : act.kind === "s" ? "#" : wlkArrows[act.dir || 0], px + wlkCell / 2, py + wlkCell / 2 - 6);
        ctx.font = "8px 'JetBrains Mono', monospace";
        ctx.fillStyle = "rgba(0, 242, 255, 0.95)";
        ctx.fillText(act.kind.toUpperCase(), px + wlkCell / 2, py + wlkCell - 7);
      });

      level.villages.forEach(function (village, index) {
        var at = wlkAt(village.x, village.y);
        var px = wlkPad + village.x * wlkCell;
        var py = wlkPad + village.y * wlkCell;
        var got = Math.round(state.rain[at] || 0);
        var over = got > level.cfgCache.floodLimit;
        var inside = got >= village.min && got <= village.max;
        ctx.strokeStyle = over ? "#fb7185" : inside ? "#a3e635" : "rgba(226, 232, 240, 0.7)";
        ctx.lineWidth = 2;
        ctx.strokeRect(px + 2, py + 2, wlkCell - 5, wlkCell - 5);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 11px 'JetBrains Mono', monospace";
        ctx.textAlign = "right";
        ctx.textBaseline = "top";
        ctx.fillText(String.fromCharCode(65 + index), px + wlkCell - 3, py + 2);
        ctx.font = "8px 'JetBrains Mono', monospace";
        ctx.fillText((over ? "!" : "") + got, px + wlkCell - 3, py + 13);
      });

      if (!running && !done) {
        var cx = wlkPad + cursor.x * wlkCell;
        var cy = wlkPad + cursor.y * wlkCell;
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = "rgba(255, 107, 53, 0.95)";
        ctx.lineWidth = 2;
        ctx.strokeRect(cx, cy, wlkCell - 1, wlkCell - 1);
        ctx.setLineDash([]);
      }

      /* Drifting vapour is decoration: the season itself only moves on beats. */
      if (!isMotionOff()) {
        var drift = (Date.now() / 40) % (wlkWide + 70);
        ctx.strokeStyle = "rgba(226, 232, 240, 0.1)";
        ctx.lineWidth = 3;
        for (i = 0; i < 3; i += 1) {
          var wy = wlkPad + 22 + i * 90;
          ctx.beginPath();
          ctx.moveTo(drift - 60 - i * 24, wy);
          ctx.lineTo(drift + 24 - i * 24, wy);
          ctx.stroke();
        }
      }

      legend.textContent =
        t("wlkLegendTool") +
        ": " +
        t("wlkTool" + tool.toUpperCase()) +
        (tool === "w" ? " " + wlkArrows[wind] : "") +
        " \u00b7 " +
        villageLine();
    }

    function frame() {
      if (rafId === null) {
        return;
      }
      /* A hidden loom skips the work but keeps its slot in the loop. */
      if (panelEl.hidden || document.hidden || done) {
        rafId = window.requestAnimationFrame(frame);
        return;
      }
      if (!isMotionOff() && !running) {
        render();
      }
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

    function cellFromEvent(event) {
      var rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        return null;
      }
      var px = (event.clientX - rect.left) * (canvas.width / rect.width);
      var py = (event.clientY - rect.top) * (canvas.height / rect.height);
      var gx = Math.floor((px - wlkPad) / wlkCell);
      var gy = Math.floor((py - wlkPad) / wlkCell);
      if (gx < 0 || gy < 0 || gx >= wlkCols || gy >= wlkRows) {
        return null;
      }
      return { x: gx, y: gy };
    }

    canvas.addEventListener("pointerdown", function (event) {
      event.preventDefault();
      var hit = cellFromEvent(event);
      if (hit) {
        place(hit.x, hit.y);
      }
    });

    canvas.addEventListener("pointermove", function (event) {
      var hit = cellFromEvent(event);
      if (hit && !running && !done && (hit.x !== cursor.x || hit.y !== cursor.y)) {
        cursor = hit;
        render();
      }
    });

    canvas.addEventListener("keydown", function (event) {
      var key = event.key;
      if (key === "ArrowLeft" || key === "ArrowRight" || key === "ArrowUp" || key === "ArrowDown") {
        event.preventDefault();
        cursor = {
          x: Math.max(0, Math.min(wlkCols - 1, cursor.x + (key === "ArrowLeft" ? -1 : key === "ArrowRight" ? 1 : 0))),
          y: Math.max(0, Math.min(wlkRows - 1, cursor.y + (key === "ArrowUp" ? -1 : key === "ArrowDown" ? 1 : 0))),
        };
        render();
        return;
      }
      if (key === "1" || key === "2" || key === "3") {
        event.preventDefault();
        pickTool(wlkKinds[Number(key) - 1]);
        return;
      }
      if (key === "Enter" || key === " ") {
        event.preventDefault();
        place(cursor.x, cursor.y);
        return;
      }
      if (key === "r" || key === "R") {
        event.preventDefault();
        if (done) {
          loadSeason(level);
        } else {
          runSeason();
        }
        return;
      }
      if (key === "d" || key === "D") {
        event.preventDefault();
        wind = (wind + 1) % 4;
        paintTools();
        render();
        return;
      }
      if (key === "z" || key === "Z" || key === "u" || key === "U" || key === "Backspace") {
        event.preventDefault();
        undo();
      }
    });

    runBtn.addEventListener("click", function () {
      if (done) {
        loadSeason(level);
        return;
      }
      runSeason();
    });

    seasonSel.addEventListener("change", function () {
      var index = campaign.indexOf(seasonSel.value);
      if (index >= 0 && campaign.isUnlocked(seasonSel.value)) {
        loadSeason(wlkLevels[index]);
        return;
      }
      seasonSel.value = level.id;
      result.textContent = t("wlkLockedSeason");
    });

    /* The weave is the player's work: pausing only stills the season. */
    App.quietResetWeatherLoom = function () {
      if (timerId !== null) {
        window.clearInterval(timerId);
        timerId = null;
      }
      running = false;
      stopLoop();
      if (!done) {
        setRunLabel("wlkBtnRun");
      }
      paintTools();
      render();
    };

    loadSeason(level);
  }

  App.addStrings({
    en: {
      "tabWeatherLoom": "Weather Loom",
      "wlkZ1": "Two Villages",
      "wlkZ2": "The Ridge",
      "wlkZ3": "Dust Year",
      "wlkZ4": "Storm Year",
      "wlkZ5": "Twin Fronts",
      "wlkSeasonLabel": "Season",
      "wlkPointsLabel": "Loom",
      "wlkFedLabel": "Fed",
      "wlkFloodLabel": "Floods",
      "wlkSeasonSelectLabel": "Season",
      "wlkSeasonValue": "{n}/{max} steps",
      "wlkPointsValue": "{n}/{max} left",
      "wlkFedValue": "{n}/{max}",
      "wlkFloodValue": "{n}",
      "wlkFieldLabel": "Region map: every cell prints its heat and moisture as numbers; arrow keys move the cursor, 1 2 3 pick wind, heat or shade, Enter weaves, R runs the season",
      "wlkToolW": "Wind",
      "wlkToolH": "Heat",
      "wlkToolS": "Shade",
      "wlkDirLabel": "Wind blows",
      "wlkDir0": "Wind blowing east",
      "wlkDir1": "Wind blowing south",
      "wlkDir2": "Wind blowing west",
      "wlkDir3": "Wind blowing north",
      "wlkBtnRun": "Run Season",
      "wlkBtnRunning": "Weaving",
      "wlkBtnAgain": "New Season",
      "wlkBtnClear": "Clear Plan",
      "wlkLegendTool": "In hand",
      "wlkPrompt": "{name}: {p} loom points to weave rain for {v} villages. Each one needs its own band - not less, not more.",
      "wlkLocked": "The season is already running - press New Season to weave again.",
      "wlkNoOff": "That is outside the region.",
      "wlkNoRidge": "Ridge: nothing can be woven on stone.",
      "wlkNoTaken": "A tool already sits on that cell.",
      "wlkNoSpent": "Not enough loom points left for that tool.",
      "wlkHarvest": "{fed} of {max} villages fed, {flood} cells flooded - {s} stars.",
      "wlkFailed": "The season failed: {fed}/{max} villages fed, score {value} - {need} clears it.",
      "wlkNextSeason": "Next season unlocked.",
      "wlkLoomDone": "Every season on the loom is balanced.",
      "wlkLockedSeason": "That season is still sealed - finish the one before it.",
      "wlkUnproven": "The stored weave for {name} no longer clears the bands, so this season ships unproven.",
      "wlkHint": "Wind shoves half of a cell's moisture into the next cell; heat lifts it one row up; shade cools the air until it lets go as rain. Water cells refill every step, so a chain of wind is a canal - and a long canal delivers less. D turns the arrow, Z undoes the last weave.",
      "logWeatherLoom": "Wove a season: {n}/{max} villages fed",
    },
    zh: {
      "tabWeatherLoom": "气候织机",
      "wlkZ1": "两个村庄",
      "wlkZ2": "山脊挡凤",
      "wlkZ3": "干旱之年",
      "wlkZ4": "风暴之年",
      "wlkZ5": "双锋之年",
      "wlkSeasonLabel": "季度",
      "wlkPointsLabel": "织点",
      "wlkFedLabel": "灌足",
      "wlkFloodLabel": "洪灾",
      "wlkSeasonSelectLabel": "季度",
      "wlkSeasonValue": "{n}/{max} 步",
      "wlkPointsValue": "剩 {n}/{max}",
      "wlkFedValue": "{n}/{max}",
      "wlkFloodValue": "{n}",
      "wlkFieldLabel": "区域图：每格都用数字写着自己的温度与湿度；方向键移动光标，1 2 3 选风、热、荫，回车织入，R 运行季度",
      "wlkToolW": "风",
      "wlkToolH": "热",
      "wlkToolS": "荫",
      "wlkDirLabel": "风向",
      "wlkDir0": "向东的风",
      "wlkDir1": "向南的风",
      "wlkDir2": "向西的风",
      "wlkDir3": "向北的风",
      "wlkBtnRun": "运行季度",
      "wlkBtnRunning": "织造中",
      "wlkBtnAgain": "重新织季",
      "wlkBtnClear": "清空布置",
      "wlkLegendTool": "手上",
      "wlkPrompt": "{name}：有 {p} 点织数，要为 {v} 个村庄织出雨水。每个村庄都得落在自己的区间里——不能少，也不能多。",
      "wlkLocked": "这一季已经在跑了——按“重新织季”再摆一次。",
      "wlkNoOff": "那里在区域之外。",
      "wlkNoRidge": "山脊：岩石上织不出东西。",
      "wlkNoTaken": "那一格已经有工具了。",
      "wlkNoSpent": "织点数不够放这件工具。",
      "wlkHarvest": "{max} 个村庄灌足 {fed} 个，{flood} 格受淹 - 获得 {s} 星。",
      "wlkFailed": "这一季失手：灌足 {fed}/{max}，得分 {value} - 要到 {need} 分才过关。",
      "wlkNextSeason": "解锁下一季。",
      "wlkLoomDone": "织机上的每一季都平衡了。",
      "wlkLockedSeason": "这一季还没开放——先完成上一季。",
      "wlkUnproven": "{name} 存档的织法已经落不进区间，这一季未获证明。",
      "wlkHint": "风把一格湿度的一半推进相邻格；热把水汽抬高一行；荫把空气冷却到兜不住水，于是落雨。水域每步都会补满，所以一连串风就是一条水渠——渠越长，送到尽头的水越少。D 转风向，Z 撤销最近一次织入。",
      "logWeatherLoom": "织完一季：灌足 {n}/{max} 个村庄",
    },
  });

  App.registerGame({
    name: "weatherLoom",
    tabKey: "tabWeatherLoom",
    init: initWeatherLoomGame,
    guide: {
      svg:
        '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="6" y="6" width="108" height="64" rx="5" fill="rgba(30,41,59,.8)" stroke="rgba(148,163,184,.45)"/>' +
        '<rect x="12" y="12" width="14" height="52" fill="rgba(56,189,248,.3)"/>' +
        '<text x="19" y="40" font-size="7" fill="#38bdf8" text-anchor="middle">=</text>' +
        '<path d="M30 30h12M38 26l6 4-6 4" fill="none" stroke="#22d3ee" stroke-width="2"/>' +
        '<path d="M48 30h12M56 26l6 4-6 4" fill="none" stroke="#22d3ee" stroke-width="2"/>' +
        '<rect x="66" y="22" width="18" height="18" rx="3" fill="none" stroke="#a3e635" stroke-width="2"/>' +
        '<text x="75" y="31" font-size="8" fill="#a3e635" text-anchor="middle">A</text>' +
        '<text x="75" y="47" font-size="7" fill="#e2e8f0" text-anchor="middle">31/22-50</text>' +
        '<text x="36" y="64" font-size="7" fill="#ffb26b" text-anchor="middle">50</text>' +
        '<text x="36" y="72" font-size="7" fill="#7dd3fc" text-anchor="middle">18</text></svg>',
      en: [
        "Aim: every village must finish the season with rain inside its own band.",
        "Action: pick wind, heat or shade and place it on a cell - click, or move the cursor and press Enter. Each tool spends loom points.",
        "Rule: wind pushes half of a cell's moisture one step along its arrow, heat lifts a third of it a row up, and shade cools the air until it dumps rain. Water cells refill every step, so arrows in a line are a canal.",
        "Watch out: rain above the band floods the cell and floods cost you, double in a storm year; a canal that is too short delivers more than a village can hold.",
        "Run: Run Season steps the loom twenty fixed times. Every cell prints heat above and moisture below, so colour is never the only clue.",
        "Scoring: all villages fed with no flood is three stars, one short still clears, and Z undoes a weave before you run.",
      ],
      zh: [
        "目标：季度结束时，每个村庄收到的雨量都要落在自己的区间内。",
        "操作：先选风、热或荫，再点击一格或在光标处按回车；每件工具都要花织点数。",
        "规则：风把本格湿度的一半沿箭头推进一步，热把三分之一抬高一行，荫让空气凉到兜不住水便落雨。水域每步补满，所以一排箭头就是一条水渠。",
        "小心：雨量高过区间就是淹，淹一格要扣分，风暴之年还要翻倍；水渠太短送来的水会超过村庄能装的量。",
        "运行：按运行季度会推进固定的二十步。每格上方写着温度、下方写着湿度，绝不只靠颜色传信。",
        "计分：所有村庄灌足且没有一格受淹是三星，少灌一个村庄也能过关；运行前用 Z 可以撤掉一次织入。",
      ],
    },
  });

  /* Exported for the other modules and for the headless checks. */
  App.initWeatherLoomGame = initWeatherLoomGame;
  App.loomStep = loomStep;
  App.loomScore = loomScore;
  App.loomRun = loomRun;
  App.loomLegal = loomLegal;
  App.loomLevels = wlkLevels;
  App.loomBase = wlkBase;
})(window.CapitalConvert = window.CapitalConvert || {});
