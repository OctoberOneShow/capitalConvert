/* Rooftop Radio - the deduction mini-game in the shared game drawer.
 * A hidden transmitter hums somewhere on the city grid; every ping returns a
 * signal-strength percentage, and the player triangulates it within a battery
 * budget. Registered through the game registry, so it needs no markup in the
 * four HTML pages. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  var t = App.t;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  var createCampaign = App.createCampaign;
  var fillCampaignPicker = App.fillCampaignPicker;
  var starsFor = App.starsFor;
  var rrSize = 320;
  var rrPad = 8;
  /* Zones: grid side, battery budget and the scan counts that earn
   * [3-star, 2-star, 1-star]. `drift` hops the transmitter every N scans. */
  var rrLevels = [
    { id: "r1", labelKey: "rrZ1", side: 6, scans: 8, starScans: [3, 5, 7], drift: 0 },
    { id: "r2", labelKey: "rrZ2", side: 8, scans: 10, starScans: [4, 6, 9], drift: 0 },
    { id: "r3", labelKey: "rrZ3", side: 10, scans: 12, starScans: [5, 8, 11], drift: 0 },
    { id: "r4", labelKey: "rrZ4", side: 12, scans: 13, starScans: [6, 9, 12], drift: 3 },
    { id: "r5", labelKey: "rrZ5", side: 14, scans: 15, starScans: [7, 10, 13], drift: 2 },
  ];

  /* Pure core, exported for the harness: distance is measured between cell
   * centres, and the reading is the share of the longest diagonal left. */
  function rrDistance(a, b) {
    var dx = a.x - b.x;
    var dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function rrStrength(a, b, side) {
    var max = rrDistance({ x: 0, y: 0 }, { x: side - 1, y: side - 1 });
    var pct = Math.round(100 * (1 - rrDistance(a, b) / max));
    return Math.max(1, Math.min(100, pct));
  }

  /* A hop keeps the transmitter inside the grid and never on the cell that was
   * just pinged, so a reading can never be a free answer. */
  function rrHop(target, side, avoid) {
    var options = [];
    for (var dy = -1; dy <= 1; dy += 1) {
      for (var dx = -1; dx <= 1; dx += 1) {
        if (!dx && !dy) {
          continue;
        }
        var nx = target.x + dx;
        var ny = target.y + dy;
        if (nx < 0 || ny < 0 || nx >= side || ny >= side) {
          continue;
        }
        if (avoid && nx === avoid.x && ny === avoid.y) {
          continue;
        }
        options.push({ x: nx, y: ny });
      }
    }
    if (!options.length) {
      return { x: target.x, y: target.y };
    }
    return options[Math.floor(Math.random() * options.length)];
  }

  function rrDeal(side) {
    return {
      x: Math.floor(Math.random() * side),
      y: Math.floor(Math.random() * side),
    };
  }
  App.radioStrength = rrStrength;
  App.radioDistance = rrDistance;
  App.radioHop = rrHop;
  App.radioLevels = rrLevels;

  function initRooftopRadioGame(panelEl) {
    if (!panelEl) {
      return;
    }

    var campaign = createCampaign({ key: "rooftop-radio-campaign", levels: rrLevels });
    var level = rrLevels[campaign.indexOf(campaign.nextLevelId())];
    var cell = Math.floor((rrSize - rrPad * 2) / level.side);
    var target = rrDeal(level.side);
    var pings = [];
    var scansLeft = level.scans;
    var cursor = { x: Math.floor(level.side / 2), y: Math.floor(level.side / 2) };
    var found = false;
    var lost = false;
    var rafId = null;

    /* --- markup: built with createElement so the headless harness sees it --- */
    var hud = document.createElement("div");
    hud.className = "game-hud";
    var batteryEl = document.createElement("strong");
    var zoneEl = document.createElement("strong");
    hud.appendChild(makeStat("rrBatteryLabel", batteryEl));
    hud.appendChild(makeStat("rrZoneLabel", zoneEl));

    var canvas = document.createElement("canvas");
    canvas.className = "rr-canvas";
    canvas.width = rrSize;
    canvas.height = rrSize;
    canvas.setAttribute("tabindex", "0");
    canvas.setAttribute("role", "application");
    canvas.setAttribute("aria-label", t("rrFieldLabel"));

    var legend = document.createElement("p");
    legend.className = "rr-legend";
    legend.setAttribute("aria-hidden", "true");

    var result = document.createElement("p");
    result.className = "game-result";
    result.setAttribute("role", "status");

    var actions = document.createElement("div");
    actions.className = "game-actions";
    var sweepBtn = document.createElement("button");
    sweepBtn.type = "button";
    sweepBtn.className = "primary";
    var sweepLabel = document.createElement("span");
    sweepLabel.setAttribute("data-i18n", "rrBtnSweep");
    sweepLabel.textContent = t("rrBtnSweep");
    var sweepContent = document.createElement("span");
    sweepContent.className = "button-content";
    sweepContent.appendChild(sweepLabel);
    sweepBtn.appendChild(sweepContent);
    var starsEl = document.createElement("p");
    starsEl.className = "game-best";
    actions.appendChild(sweepBtn);
    actions.appendChild(starsEl);

    /* Campaign pickers use the shared row/label/select shape the shipped panels
     * use, so the zone menu looks and behaves like every other one. */
    var zoneRow = document.createElement("div");
    zoneRow.className = "elements-row";
    var zoneLabel = document.createElement("label");
    zoneLabel.className = "elements-label";
    zoneLabel.setAttribute("for", "rrZoneSel");
    zoneLabel.setAttribute("data-i18n", "rrZoneSelectLabel");
    zoneLabel.textContent = t("rrZoneSelectLabel");
    var zoneSel = document.createElement("select");
    zoneSel.className = "elements-select";
    zoneSel.id = "rrZoneSel";
    zoneRow.appendChild(zoneLabel);
    zoneRow.appendChild(zoneSel);

    var hint = document.createElement("p");
    hint.className = "game-hint";
    hint.setAttribute("data-i18n", "rrHint");
    hint.textContent = t("rrHint");

    [hud, canvas, legend, result, zoneRow, actions, hint].forEach(function (node) {
      panelEl.appendChild(node);
    });

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

    var ctx = canvas.getContext("2d");

    function geometry() {
      cell = Math.floor((rrSize - rrPad * 2) / level.side);
      var span = cell * level.side;
      var x0 = Math.floor((rrSize - span) / 2);
      var y0 = Math.floor((rrSize - span) / 2);
      return { x0: x0, y0: y0, span: span };
    }

    function renderHud() {
      batteryEl.textContent = t("rrScansLeft", { n: scansLeft });
      zoneEl.textContent = t("rrZoneCells", { n: level.side });
    }

    function refreshPicker() {
      fillCampaignPicker(
        zoneSel,
        campaign,
        function (def) {
          return t(def.labelKey);
        },
        t("elementsLocked"),
      );
      zoneSel.value = level.id;
      starsEl.textContent = t("campaignStars", {
        n: campaign.totalStars(),
        max: campaign.maxStars(),
      });
    }

    function ping(x, y) {
      if (found || lost) {
        return;
      }
      if (x < 0 || y < 0 || x >= level.side || y >= level.side) {
        return;
      }
      if (scansLeft <= 0) {
        return;
      }
      cursor = { x: x, y: y };
      scansLeft -= 1;
      var strength = rrStrength({ x: x, y: y }, target, level.side);
      pings.push({ x: x, y: y, strength: strength });
      renderHud();
      if (strength >= 99) {
        found = true;
        finish();
        render();
        return;
      }
      result.textContent = t("rrPing", { n: strength });
      if (level.drift && scansLeft > 0 && (level.scans - scansLeft) % level.drift === 0) {
        target = rrHop(target, level.side, { x: x, y: y });
        result.textContent = result.textContent + " " + t("rrDrift");
      }
      if (!found && scansLeft <= 0) {
        lost = true;
        result.textContent = t("rrOut", { x: target.x + 1, y: target.y + 1 });
      }
      render();
    }

    function finish() {
      var used = level.scans - scansLeft;
      var starsWon = starsFor(used, level.starScans, "low");
      var outcome = campaign.record(level.id, {
        stars: starsWon,
        best: used,
        better: "low",
      });
      var message = t("rrFound", { n: used, s: starsWon });
      if (outcome.isBest) {
        message += " " + t("newBest");
      }
      if (outcome.unlockedNext) {
        message += " " + t("rrNextZone");
      } else if (campaign.clearedCount() === rrLevels.length) {
        message += " " + t("rrCampaignDone");
      }
      result.textContent = message;
      logAction(t("logRooftopRadio", { n: used }));
      var rect = sweepBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      refreshPicker();
    }

    function loadZone(levelDef) {
      level = levelDef;
      target = rrDeal(level.side);
      pings = [];
      scansLeft = level.scans;
      found = false;
      lost = false;
      cursor = { x: Math.floor(level.side / 2), y: Math.floor(level.side / 2) };
      renderHud();
      refreshPicker();
      result.textContent = t("rrPrompt", {
        name: t(level.labelKey),
        n: level.scans,
      });
      render();
    }

    function heatColor(pct) {
      /* Cold cyan through amber into hot rose, so a reading reads at a glance. */
      if (pct >= 80) {
        return "#fb7185";
      }
      if (pct >= 60) {
        return "#ff6b35";
      }
      if (pct >= 40) {
        return "#fbbf24";
      }
      return "#22d3ee";
    }

    function render() {
      var geo = geometry();
      var time = Date.now();
      ctx.clearRect(0, 0, rrSize, rrSize);
      /* City blocks: a faint grid with every street drawn. */
      ctx.fillStyle = "rgba(15, 23, 42, 0.55)";
      ctx.fillRect(geo.x0, geo.y0, geo.span, geo.span);
      ctx.strokeStyle = "rgba(148, 163, 184, 0.22)";
      ctx.lineWidth = 1;
      for (var i = 0; i <= level.side; i += 1) {
        ctx.beginPath();
        ctx.moveTo(geo.x0 + i * cell, geo.y0);
        ctx.lineTo(geo.x0 + i * cell, geo.y0 + geo.span);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(geo.x0, geo.y0 + i * cell);
        ctx.lineTo(geo.x0 + geo.span, geo.y0 + i * cell);
        ctx.stroke();
      }
      /* Past pings: a ring sized by the reading plus the number itself. */
      pings.forEach(function (ping) {
        var cx = geo.x0 + ping.x * cell + cell / 2;
        var cy = geo.y0 + ping.y * cell + cell / 2;
        var color = heatColor(ping.strength);
        ctx.beginPath();
        ctx.arc(cx, cy, (cell / 2) * (0.35 + ping.strength / 160), 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.75;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = color;
        ctx.font = "bold " + Math.max(9, Math.floor(cell * 0.42)) + "px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(ping.strength), cx, cy);
      });
      /* The cursor: a dashed crosshair, so the keyboard path is visible. */
      if (!found) {
        var kx = geo.x0 + cursor.x * cell;
        var ky = geo.y0 + cursor.y * cell;
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = "rgba(0, 242, 255, 0.85)";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(kx + 1.5, ky + 1.5, cell - 3, cell - 3);
        ctx.setLineDash([]);
      }
      /* The transmitter only shows once the sweep is over. */
      if (found || lost) {
        var tx = geo.x0 + target.x * cell + cell / 2;
        var ty = geo.y0 + target.y * cell + cell / 2;
        var pulse = found ? 1 + Math.sin(time / 240) * 0.16 : 1;
        ctx.beginPath();
        ctx.arc(tx, ty, (cell / 2) * 0.8 * pulse, 0, Math.PI * 2);
        ctx.strokeStyle = found ? "#a3e635" : "#fb7185";
        ctx.lineWidth = 2.5;
        ctx.shadowColor = found ? "#a3e635" : "#fb7185";
        ctx.shadowBlur = 12;
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = found ? "#a3e635" : "#fb7185";
        ctx.beginPath();
        ctx.arc(tx, ty, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      /* Legend: the four bands the readings fall into. */
      var words = [
        { pct: 90, key: "rrHot" },
        { pct: 65, key: "rrWarm" },
        { pct: 40, key: "rrCool" },
        { pct: 15, key: "rrCold" },
      ];
      legend.textContent = words
        .map(function (w) {
          return t(w.key);
        })
        .join(" \u00b7 ");
    }

    function frame() {
      if (rafId === null) {
        return;
      }
      if (panelEl.hidden || document.hidden) {
        rafId = window.requestAnimationFrame(frame);
        return;
      }
      if (found || lost) {
        render();
      }
      rafId = window.requestAnimationFrame(frame);
    }

    function cellFromEvent(event) {
      var rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        return null;
      }
      var geo = geometry();
      var px = (event.clientX - rect.left) * (canvas.width / rect.width);
      var py = (event.clientY - rect.top) * (canvas.height / rect.height);
      var x = Math.floor((px - geo.x0) / cell);
      var y = Math.floor((py - geo.y0) / cell);
      if (x < 0 || y < 0 || x >= level.side || y >= level.side) {
        return null;
      }
      return { x: x, y: y };
    }

    canvas.addEventListener("pointerdown", function (event) {
      event.preventDefault();
      var hit = cellFromEvent(event);
      if (hit) {
        ping(hit.x, hit.y);
      }
    });

    canvas.addEventListener("keydown", function (event) {
      var moves = {
        ArrowLeft: { x: -1, y: 0 },
        ArrowRight: { x: 1, y: 0 },
        ArrowUp: { x: 0, y: -1 },
        ArrowDown: { x: 0, y: 1 },
      };
      if (moves[event.key]) {
        event.preventDefault();
        var step = moves[event.key];
        cursor = {
          x: Math.max(0, Math.min(level.side - 1, cursor.x + step.x)),
          y: Math.max(0, Math.min(level.side - 1, cursor.y + step.y)),
        };
        render();
        return;
      }
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        ping(cursor.x, cursor.y);
      }
    });

    zoneSel.addEventListener("change", function () {
      var index = campaign.indexOf(zoneSel.value);
      if (index >= 0 && campaign.isUnlocked(zoneSel.value)) {
        loadZone(rrLevels[index]);
      }
    });

    sweepBtn.addEventListener("click", function () {
      loadZone(level);
    });

    loadZone(rrLevels[campaign.indexOf(campaign.nextLevelId())]);
    rafId = window.requestAnimationFrame(frame);
  }

  /* Bilingual copy travels with the game: addStrings only fills keys i18n.js
   * does not already own, so the shared dictionary stays authoritative. */
  App.addStrings({
    en: {
      "tabRooftopRadio": "Rooftop Radio",
      "rrZ1": "Backyard",
      "rrZ2": "Rooftops",
      "rrZ3": "Downtown",
      "rrZ4": "Harbor",
      "rrZ5": "Old Town",
      "rrBatteryLabel": "Battery",
      "rrZoneLabel": "Grid",
      "rrZoneSelectLabel": "Choose a zone",
      "rrScansLeft": "{n} pings",
      "rrZoneCells": "{n}x{n}",
      "rrFieldLabel": "City grid, ping a block to read its signal strength",
      "rrBtnSweep": "New Sweep",
      "rrPrompt": "A transmitter hides in {name}. {n} pings to find it.",
      "rrPing": "Signal {n}%.",
      "rrDrift": "It moved.",
      "rrFound": "Found in {n} pings - {s} stars.",
      "rrOut": "Battery dead. It sat at column {x}, row {y}.",
      "rrNextZone": "Next zone unlocked.",
      "rrCampaignDone": "All zones swept.",
      "rrHot": "hot",
      "rrWarm": "warm",
      "rrCool": "cool",
      "rrCold": "cold",
      "rrHint": "Two pings and a straight line between them is enough to start.",
      "logRooftopRadio": "Swept the airwaves in {n} pings",
    },
    zh: {
      "tabRooftopRadio": "屋顶电台",
      "rrZ1": "后院",
      "rrZ2": "天台",
      "rrZ3": "市区",
      "rrZ4": "港口",
      "rrZ5": "老城",
      "rrBatteryLabel": "电量",
      "rrZoneLabel": "网格",
      "rrZoneSelectLabel": "选择区域",
      "rrScansLeft": "还剩 {n} 次",
      "rrZoneCells": "{n}×{n}",
      "rrFieldLabel": "城市网格：点击街区以读取信号强度",
      "rrBtnSweep": "重新搜寻",
      "rrPrompt": "一台电台藏在「{name}」。你有 {n} 次探测机会。",
      "rrPing": "信号 {n}%。",
      "rrDrift": "它移动了。",
      "rrFound": "{n} 次探测找到 - 获得 {s} 星。",
      "rrOut": "电量耗尽。它藏在第 {x} 列、第 {y} 行。",
      "rrNextZone": "解锁下一区域。",
      "rrCampaignDone": "所有区域搜寻完毕。",
      "rrHot": "强",
      "rrWarm": "中",
      "rrCool": "弱",
      "rrCold": "极弱",
      "rrHint": "两次探测连成一条线，就能开始缩小范围。",
      "logRooftopRadio": "用 {n} 次探测找到了电台",
    },
  });

  App.registerGame({
    name: "rooftopRadio",
    tabKey: "tabRooftopRadio",
    init: initRooftopRadioGame,
    guide: {
      svg:
        '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="6" y="6" width="108" height="64" rx="5" fill="rgba(30,41,59,.75)" stroke="rgba(148,163,184,.45)"/>' +
        '<path d="M24 12v52M46 12v52M68 12v52M90 12v52M12 26h96M12 42h96M12 58h96" stroke="rgba(148,163,184,.22)"/>' +
        '<circle cx="46" cy="42" r="13" fill="none" stroke="#fb7185" stroke-width="2"/>' +
        '<text x="46" y="45" font-size="9" fill="#fb7185" text-anchor="middle">82</text>' +
        '<circle cx="78" cy="26" r="8" fill="none" stroke="#22d3ee" stroke-width="2"/>' +
        '<text x="78" y="29" font-size="8" fill="#22d3ee" text-anchor="middle">41</text>' +
        '<circle cx="96" cy="58" r="3" fill="#a3e635"/></svg>',
      en: [
        "Aim: find the hidden transmitter before the battery runs out.",
        "Action: click any block to ping it - the number is signal strength, where 100 means you are standing on it.",
        "Rule: strength falls off with distance, so two pings draw a line and a third fixes the corner.",
        "Watch out: the higher zones hop the transmitter after a few scans, so old readings go stale.",
        "Scoring: fewer pings earn more stars; clearing a zone unlocks the next one.",
      ],
      zh: [
        "目标：在电量耗尽之前找到隐藏的电台。",
        "操作：点击任意街区进行探测——数字是信号强度，100 表示就在脚下。",
        "规则：强度随距离衰减，两次探测能画出一条线，第三次就能锁定拐角。",
        "小心：高级区域里，电台会在几次探测后跳格，旧读数会失效。",
        "计分：探测次数越少星越多；通关一个区域就解锁下一个。",
      ],
    },
  });

  /* Exported for the other modules. */
  App.initRooftopRadioGame = initRooftopRadioGame;
})(window.CapitalConvert = window.CapitalConvert || {});
