/* Hue Hunter - the colour-perception mini-game in the shared game drawer.
 * Every tile on the board is mixed from one colour and exactly one is a
 * shade off. Finding it keeps a streak alive, missing it costs one of three
 * hearts, and clearing a zone's rounds banks stars and unlocks the next
 * zone on the ladder. Registered through the game registry, so it needs no
 * markup in the four HTML pages. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  var t = App.t;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  var createCampaign = App.createCampaign;
  var fillCampaignPicker = App.fillCampaignPicker;
  var starsFor = App.starsFor;

  var hhMaxHearts = 3;
  /* The ladder: fifty graded levels. The grid grows from 3x3 toward 7x7,
   * the shade gap shrinks per decade, the impostor's hue starts tilting in
   * the third decade, and every level paints inside one of ten hue venues
   * so a run keeps changing mood. Names compose from five perception tiers
   * across the ten venues, in both languages. */
  var hhZoneAdjectives = [
    "hhAdjQuiet",
    "hhAdjGentle",
    "hhAdjKeen",
    "hhAdjSharp",
    "hhAdjEagle",
  ];
  var hhZoneNouns = [
    "hhNounKiln",
    "hhNounStudio",
    "hhNounMoss",
    "hhNounFern",
    "hhNounLagoon",
    "hhNounIce",
    "hhNounVault",
    "hhNounLoft",
    "hhNounOrchid",
    "hhNounSalon",
  ];
  var hhBands = [
    [0, 36], [36, 72], [72, 108], [108, 144], [144, 180],
    [180, 216], [216, 252], [252, 288], [288, 324], [324, 360],
  ];

  function hhBuildZones() {
    var deltas = [14, 10, 7.5, 5.5, 4];
    var nudges = [0, 5, 8, 10, 12];
    var sats = [62, 65, 55, 45, 60];
    var lights = [54, 50, 56, 70, 52];
    var zones = [];
    for (var index = 1; index <= 50; index += 1) {
      var tier = Math.floor((index - 1) / 10);
      zones.push({
        id: "hh" + index,
        adjKey: hhZoneAdjectives[tier],
        nounKey: hhZoneNouns[(index - 1) % 10],
        side: Math.min(7, 3 + Math.floor((index - 1) / 12)),
        rounds: 5 + Math.floor((index - 1) / 12) + (index % 10 === 0 ? 1 : 0),
        delta: deltas[tier],
        hueNudge: nudges[tier],
        sat: sats[tier],
        light: lights[tier],
        hues: hhBands[(index - 1) % 10],
      });
    }
    return zones;
  }

  var hhZones = hhBuildZones();
  /* Stars per cleared zone, read from mistakes spent: none -> 3 stars,
   * one -> 2, two -> 1. Three misses ends the run, so bands never lie. */
  var hhStarBands = [0, 1, 2];

  function hhClamp(value, low, high) {
    return Math.max(low, Math.min(high, value));
  }

  function hhRound1(value) {
    return Math.round(value * 10) / 10;
  }

  function hhHsl(hue, sat, light) {
    var wrapped = ((hue % 360) + 360) % 360;
    return (
      "hsl(" +
      Math.round(wrapped) +
      ", " +
      Math.round(hhClamp(sat, 20, 85)) +
      "%, " +
      hhRound1(hhClamp(light, 16, 88)) +
      "%)"
    );
  }

  function hhGlyphs(ch, count) {
    var out = "";
    for (var index = 0; index < count; index += 1) {
      out += ch;
    }
    return out;
  }

  function hhGlyphs(ch, count) {
    var out = "";
    for (var index = 0; index < count; index += 1) {
      out += ch;
    }
    return out;
  }

  /* Level names compose per language: "Eagle Rose Salon" reads as one
   * name in English, 鹰眼玫瑰沙龙 in Chinese. */
  function zoneName(def) {
    return t("hhZoneName", { a: t(def.adjKey), b: t(def.nounKey) });
  }

  function initHueHunterGame(panelEl) {
    if (!panelEl) {
      return;
    }

    var campaign = createCampaign({ key: "hue-hunter-campaign", levels: hhZones, version: 2 });
    var zone = hhZones[Math.max(0, campaign.indexOf(campaign.nextLevelId()))];
    var runActive = false;
    var roundOpen = false;
    var round = 1;
    var hearts = hhMaxHearts;
    var score = 0;
    var streak = 0;
    var mistakes = 0;
    var oddIndex = 0;
    var judged = {};
    var dealId = null;
    var shakeId = null;
    var puffId = null;

    /* --- markup: built with createElement so the headless harness sees it --- */
    var hud = document.createElement("div");
    hud.className = "game-hud";
    var roundEl = document.createElement("strong");
    var heartsEl = document.createElement("strong");
    var scoreEl = document.createElement("strong");
    hud.appendChild(makeStat("hhRoundLabel", roundEl));
    hud.appendChild(makeStat("hhHeartsLabel", heartsEl));
    hud.appendChild(makeStat("hhScoreLabel", scoreEl));

    var board = document.createElement("div");
    board.className = "hh-board";
    board.setAttribute("role", "group");
    board.setAttribute("aria-label", t("hhBoardLabel"));
    var stage = document.createElement("div");
    stage.className = "hh-stage";
    stage.appendChild(board);

    var result = document.createElement("p");
    result.className = "game-result";
    result.setAttribute("role", "status");

    /* Campaign pickers use the shared row/label/select shape the shipped
     * panels use, so the zone menu looks like every other one. */
    var zoneRow = document.createElement("div");
    zoneRow.className = "elements-row";
    var zoneLabel = document.createElement("label");
    zoneLabel.className = "elements-label";
    zoneLabel.setAttribute("for", "hhZoneSel");
    zoneLabel.setAttribute("data-i18n", "hhZoneSelectLabel");
    zoneLabel.textContent = t("hhZoneSelectLabel");
    var zoneSel = document.createElement("select");
    zoneSel.className = "elements-select";
    zoneSel.id = "hhZoneSel";
    zoneRow.appendChild(zoneLabel);
    zoneRow.appendChild(zoneSel);

    var actions = document.createElement("div");
    actions.className = "game-actions";
    var newBtn = document.createElement("button");
    newBtn.type = "button";
    newBtn.className = "primary";
    var newLabel = document.createElement("span");
    newLabel.setAttribute("data-i18n", "hhBtnNew");
    newLabel.textContent = t("hhBtnNew");
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
    hint.setAttribute("data-i18n", "hhHint");
    hint.textContent = t("hhHint");

    [hud, stage, result, zoneRow, actions, hint].forEach(function (node) {
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

    function refreshPicker() {
      fillCampaignPicker(
        zoneSel,
        campaign,
        function (def) {
          return zoneName(def);
        },
        t("elementsLocked"),
      );
      zoneSel.value = zone.id;
      var best = campaign.best(zone.id);
      bestEl.textContent =
        (best ? t("hhBest", { n: best }) + " \u00b7 " : "") +
        t("campaignStars", {
          n: campaign.totalStars(),
          max: campaign.maxStars(),
        });
    }

    function updateHud() {
      roundEl.textContent = t("hhRoundStat", {
        n: Math.min(round, zone.rounds),
        total: zone.rounds,
      });
      heartsEl.textContent =
        hhGlyphs("\u2665", Math.max(0, hearts)) +
        hhGlyphs("\u2661", Math.max(0, hhMaxHearts - hearts));
      heartsEl.setAttribute("aria-label", t("hhHeartsLeft", { n: hearts }));
      scoreEl.textContent = String(score);
      board.classList.toggle("is-hot", streak >= 3);
    }

    /* One board per round: a fresh colour is mixed, the impostor gets a
     * lightness gap (plus a hue tilt in the deeper zones), and the tiles
     * deal in with a staggered rise. */
    function buildRound() {
      window.clearTimeout(dealId);
      dealId = null;
      board.textContent = "";
      judged = {};
      roundOpen = true;

      var hue = zone.hues[0] + Math.random() * (zone.hues[1] - zone.hues[0]);
      var sat = zone.sat + Math.random() * 8 - 4;
      var light = zone.light + Math.random() * 10 - 5;
      var gap = zone.delta * (0.8 + Math.random() * 0.4);
      var tilt =
        zone.hueNudge *
        (0.8 + Math.random() * 0.4) *
        (Math.random() < 0.5 ? -1 : 1);
      var rise = Math.random() < 0.5 ? -1 : 1;
      var total = zone.side * zone.side;
      oddIndex = Math.floor(Math.random() * total);

      var baseLight = hhClamp(light, 20, 82);
      var oddLight = hhClamp(baseLight + gap * rise, 16, 88);

      board.style.setProperty("--hh-side", String(zone.side));
      for (var index = 0; index < total; index += 1) {
        var tile = document.createElement("button");
        tile.type = "button";
        tile.className = "hh-tile hh-in";
        tile.setAttribute("aria-label", t("hhTileLabel", { n: index + 1 }));
        tile.style.setProperty(
          "background",
          index === oddIndex
            ? hhHsl(hue + tilt, sat, oddLight)
            : hhHsl(hue, sat, baseLight),
        );
        tile.style.setProperty("animation-delay", index * 14 + "ms");
        tile.addEventListener("click", makeTileHandler(index, tile));
        board.appendChild(tile);
      }
      updateHud();
    }

    function makeTileHandler(index, tile) {
      return function () {
        judge(index, tile);
      };
    }

    function judge(index, tile) {
      if (!runActive || !roundOpen || judged[index]) {
        return;
      }
      /* The deal stagger must not delay the pop or the shake. */
      tile.style.removeProperty("animation-delay");
      judged[index] = true;
      if (index === oddIndex) {
        hit(tile);
      } else {
        miss(tile);
      }
    }

    function hit(tile) {
      roundOpen = false;
      streak += 1;
      var gained = Math.min(300, 100 + (streak - 1) * 25);
      score += gained;
      round += 1;
      tile.classList.add("is-hit");
      floatPoints(tile, "+" + gained);
      updateHud();
      if (streak >= 3) {
        result.textContent =
          t("hhHit", { n: gained }) + " " + t("hhStreak", { n: streak });
      } else {
        result.textContent = t("hhHit", { n: gained });
      }
      if (round > zone.rounds) {
        zoneCleared();
      } else {
        dealId = window.setTimeout(buildRound, 480);
      }
    }

    function miss(tile) {
      hearts -= 1;
      streak = 0;
      mistakes += 1;
      tile.classList.add("is-miss");
      board.classList.remove("is-shaking");
      void board.offsetWidth;
      board.classList.add("is-shaking");
      window.clearTimeout(shakeId);
      shakeId = window.setTimeout(function () {
        board.classList.remove("is-shaking");
      }, 440);
      updateHud();
      if (hearts <= 0) {
        runOut();
      } else {
        result.textContent =
          hearts === 1 ? t("hhLastHeart") : t("hhWrong");
      }
    }

    /* The point award floats up from the tile it was earned on. */
    function floatPoints(tile, text) {
      var puff = document.createElement("span");
      puff.className = "hh-float";
      puff.textContent = text;
      var cx = (tile.offsetLeft || 0) + (tile.offsetWidth || 0) / 2;
      var cy = (tile.offsetTop || 0) + (tile.offsetHeight || 0) / 2;
      puff.style.setProperty("left", cx + "px");
      puff.style.setProperty("top", cy + "px");
      board.appendChild(puff);
      window.clearTimeout(puffId);
      puffId = window.setTimeout(function () {
        if (puff.parentNode) {
          puff.parentNode.removeChild(puff);
        }
      }, 920);
    }

    /* Out of hearts: the run ends and the impostor lights up so the miss
     * becomes a lesson. Nothing is recorded on a failed run. */
    function runOut() {
      runActive = false;
      roundOpen = false;
      window.clearTimeout(dealId);
      dealId = null;
      var tiles = board.querySelectorAll(".hh-tile");
      if (tiles[oddIndex]) {
        tiles[oddIndex].classList.add("is-reveal");
      }
      result.textContent = t("hhRunOut", {
        n: score,
        r: Math.min(round - 1, zone.rounds),
      });
    }

    function zoneCleared() {
      runActive = false;
      var starsWon = starsFor(mistakes, hhStarBands, "low");
      var outcome = campaign.record(zone.id, {
        stars: starsWon,
        best: score,
        better: "high",
      });
      var message = t("hhCleared", {
        name: zoneName(zone),
        s: starsWon,
        n: score,
      });
      if (outcome.isBest) {
        message += " " + t("newBest");
      }
      if (outcome.unlockedNext) {
        message += " " + t("hhNextZone");
      } else if (campaign.clearedCount() === hhZones.length) {
        message += " " + t("hhAllZones");
      }
      result.textContent = message;
      logAction(t("logHueHunter", { name: zoneName(zone), s: starsWon, n: score }));
      var rect = newBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear || starsWon === 3);
      refreshPicker();
    }

    function startRun() {
      window.clearTimeout(dealId);
      dealId = null;
      round = 1;
      hearts = hhMaxHearts;
      score = 0;
      streak = 0;
      mistakes = 0;
      runActive = true;
      result.textContent = t("hhPrompt", {
        name: zoneName(zone),
        n: zone.rounds,
      });
      refreshPicker();
      buildRound();
    }

    newBtn.addEventListener("click", startRun);

    zoneSel.addEventListener("change", function () {
      var index = campaign.indexOf(zoneSel.value);
      if (index >= 0 && campaign.isUnlocked(zoneSel.value)) {
        zone = hhZones[index];
        startRun();
      } else {
        zoneSel.value = zone.id;
      }
    });

    App.quietResetHueHunter = function () {
      window.clearTimeout(dealId);
      window.clearTimeout(shakeId);
      window.clearTimeout(puffId);
      dealId = null;
      shakeId = null;
      puffId = null;
      startRun();
    };

    startRun();
  }

  /* Bilingual copy travels with the game: addStrings only fills keys i18n.js
   * does not already own, so the shared dictionary stays authoritative. */
  App.addStrings({
    en: {
      "tabHueHunter": "Hue Hunter",
      "hhRoundLabel": "Round",
      "hhHeartsLabel": "Hearts",
      "hhScoreLabel": "Score",
      "hhZoneSelectLabel": "Choose a level",
      "hhZoneName": "{a} {b}",
      "hhAdjQuiet": "Quiet",
      "hhAdjGentle": "Gentle",
      "hhAdjKeen": "Keen",
      "hhAdjSharp": "Sharp",
      "hhAdjEagle": "Eagle",
      "hhNounKiln": "Ember Kiln",
      "hhNounStudio": "Dye Studio",
      "hhNounMoss": "Moss Garden",
      "hhNounFern": "Fern House",
      "hhNounLagoon": "Lagoon",
      "hhNounIce": "Ice Room",
      "hhNounVault": "Ink Vault",
      "hhNounLoft": "Violet Loft",
      "hhNounOrchid": "Orchid Bar",
      "hhNounSalon": "Rose Salon",
      "hhRoundStat": "{n}/{total}",
      "hhHeartsLeft": "{n} of 3 hearts left",
      "hhBtnNew": "New run",
      "hhPrompt": "{name}: one tile is a shade off. {n} rounds, three hearts.",
      "hhHit": "+{n} points.",
      "hhStreak": "{n} in a row!",
      "hhWrong": "Not that one - a heart fades.",
      "hhLastHeart": "Last heart - make it count.",
      "hhRunOut": "Out of hearts at {n} points after {r} rounds. The impostor is lit.",
      "hhCleared": "{name} cleared - {s} stars, {n} points.",
      "hhNextZone": "Next level unlocked.",
      "hhAllZones": "All fifty levels are hunted down.",
      "hhBest": "Best {n}",
      "hhBoardLabel": "Colour board - exactly one tile is a slightly different colour",
      "hhTileLabel": "Tile {n}",
      "hhHint": "Squint, dim the screen, or step back - the impostor pops out when you stop staring.",
      "logHueHunter": "Hunted {name} for {s} stars and {n} points",
    },
    zh: {
      "tabHueHunter": "觅色猎人",
      "hhRoundLabel": "回合",
      "hhHeartsLabel": "红心",
      "hhScoreLabel": "得分",
      "hhZoneSelectLabel": "选择等级",
      "hhZoneName": "{a}{b}",
      "hhAdjQuiet": "安静",
      "hhAdjGentle": "轻柔",
      "hhAdjKeen": "敏锐",
      "hhAdjSharp": "锐利",
      "hhAdjEagle": "鹰眼",
      "hhNounKiln": "炭窑",
      "hhNounStudio": "染坊",
      "hhNounMoss": "苔园",
      "hhNounFern": "蕨室",
      "hhNounLagoon": "泻湖",
      "hhNounIce": "冰室",
      "hhNounVault": "蓝库",
      "hhNounLoft": "紫阁",
      "hhNounOrchid": "兰吧",
      "hhNounSalon": "玫瑰沙龙",
      "hhRoundStat": "{n}/{total}",
      "hhHeartsLeft": "还剩 {n} 颗红心",
      "hhBtnNew": "重新开始",
      "hhPrompt": "「{name}」：有一块颜色不同。共 {n} 轮，三颗红心。",
      "hhHit": "+{n} 分。",
      "hhStreak": "连中 {n} 块！",
      "hhWrong": "不是这块 - 熄灭一颗红心。",
      "hhLastHeart": "最后一颗红心 - 稳住。",
      "hhRunOut": "红心用尽：{r} 轮后共 {n} 分。异色块已点亮。",
      "hhCleared": "「{name}」通关 - {s} 星，{n} 分。",
      "hhNextZone": "下一级已解锁。",
      "hhAllZones": "五十级全部猎获。",
      "hhBest": "最佳 {n}",
      "hhBoardLabel": "色板 - 恰好有一块颜色略有不同",
      "hhTileLabel": "第 {n} 块",
      "hhHint": "眯起眼睛、调暗屏幕或退后一步 - 异色块会自己浮现。",
      "logHueHunter": "以 {s} 星、{n} 分猎获「{name}」",
    },
  });

  App.registerGame({
    name: "hueHunter",
    tabKey: "tabHueHunter",
    init: initHueHunterGame,
    guide: {
      svg:
        '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="6" y="6" width="108" height="64" rx="5" fill="rgba(30,41,59,.75)" stroke="rgba(148,163,184,.45)"/>' +
        '<rect x="34" y="12" width="16" height="16" rx="3" fill="hsl(265,60%,52%)"/>' +
        '<rect x="52" y="12" width="16" height="16" rx="3" fill="hsl(265,60%,52%)"/>' +
        '<rect x="70" y="12" width="16" height="16" rx="3" fill="hsl(265,60%,52%)"/>' +
        '<rect x="34" y="30" width="16" height="16" rx="3" fill="hsl(265,60%,52%)"/>' +
        '<rect x="52" y="30" width="16" height="16" rx="3" fill="hsl(265,62%,66%)" stroke="#fbbf24" stroke-width="2"/>' +
        '<rect x="70" y="30" width="16" height="16" rx="3" fill="hsl(265,60%,52%)"/>' +
        '<rect x="34" y="48" width="16" height="16" rx="3" fill="hsl(265,60%,52%)"/>' +
        '<rect x="52" y="48" width="16" height="16" rx="3" fill="hsl(265,60%,52%)"/>' +
        '<rect x="70" y="48" width="16" height="16" rx="3" fill="hsl(265,60%,52%)"/>' +
        '<path d="M96 38h10m0 0-4-4m4 4-4 4" stroke="#fbbf24" stroke-width="2" fill="none" stroke-linecap="round"/></svg>',
      en: [
        "Aim: every tile is mixed from one colour - exactly one is a shade off. Find it.",
        "Action: tap the tile that looks different; a fresh board deals the moment you are right.",
        "Rule: streaks raise the award for each find, but a wrong tap costs one of three hearts.",
        "Watch out: deeper zones shrink the shade gap, grow the grid, and tilt the impostor's hue too.",
        "Scoring: clear every round in a zone to bank stars - flawless runs earn three - and unlock the next zone.",
      ],
      zh: [
        "目标：所有色块由同一颜色调出——恰好有一块色度不同。找出它。",
        "操作：点击看起来不一样的色块，答对后立刻发下一板。",
        "规则：连中会提高每次得分，点错则熄灭一颗红心（共三颗）。",
        "小心：更深的区域色差更小、格子更多，异色块还会轻微偏色。",
        "计分：清空整区轮次即可获得星星——零失误得三星——并解锁下一区域。",
      ],
    },
  });

  /* Exported for the other modules. */
  App.initHueHunterGame = initHueHunterGame;
})(window.CapitalConvert = window.CapitalConvert || {});
