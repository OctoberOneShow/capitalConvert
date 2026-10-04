/* Love and Deepspace: Starbond Relay - route-planning romance battles for
 * the shared game drawer. Each turn you pick one action card to balance
 * energy, trust and resonance before mission time runs out. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  var t = App.t;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  var createCampaign = App.createCampaign;
  var fillCampaignPicker = App.fillCampaignPicker;
  var starsFor = App.starsFor;

  var ldsRoutes = [
    { id: "lds1", labelKey: "ldsRoute1", turns: 6, target: 62, stars: [3, 4, 5] },
    { id: "lds2", labelKey: "ldsRoute2", turns: 7, target: 72, stars: [4, 5, 6] },
    { id: "lds3", labelKey: "ldsRoute3", turns: 8, target: 82, stars: [5, 6, 7] },
    { id: "lds4", labelKey: "ldsRoute4", turns: 9, target: 92, stars: [6, 7, 8] },
  ];

  var ldsPartners = [
    {
      id: "xavier",
      nameKey: "ldsPartnerXavier",
      perkKey: "ldsPerkXavier",
      boost: "focus",
      bonus: { resonance: 5 },
    },
    {
      id: "zayne",
      nameKey: "ldsPartnerZayne",
      perkKey: "ldsPerkZayne",
      boost: "guard",
      bonus: { trust: 4, energy: 2 },
    },
    {
      id: "rafayel",
      nameKey: "ldsPartnerRafayel",
      perkKey: "ldsPerkRafayel",
      boost: "heart",
      bonus: { trust: 6 },
    },
    {
      id: "sylus",
      nameKey: "ldsPartnerSylus",
      perkKey: "ldsPerkSylus",
      boost: "focus",
      bonus: { energy: 5 },
    },
  ];

  var ldsMoves = [
    {
      id: "focus",
      labelKey: "ldsMoveFocus",
      detailKey: "ldsMoveFocusDetail",
      stats: { energy: -16, trust: -3, resonance: 20 },
    },
    {
      id: "guard",
      labelKey: "ldsMoveGuard",
      detailKey: "ldsMoveGuardDetail",
      stats: { energy: -10, trust: 5, resonance: 11 },
    },
    {
      id: "heart",
      labelKey: "ldsMoveHeart",
      detailKey: "ldsMoveHeartDetail",
      stats: { energy: -12, trust: 9, resonance: 14 },
    },
  ];

  var ldsEvents = [
    { key: "ldsEventMeteor", ideal: "focus", pressure: 7 },
    { key: "ldsEventStatic", ideal: "guard", pressure: 8 },
    { key: "ldsEventPulse", ideal: "heart", pressure: 6 },
    { key: "ldsEventRift", ideal: "guard", pressure: 10 },
    { key: "ldsEventPhantom", ideal: "focus", pressure: 9 },
    { key: "ldsEventEcho", ideal: "heart", pressure: 7 },
  ];

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function byId(list, id) {
    for (var i = 0; i < list.length; i += 1) {
      if (list[i].id === id) {
        return list[i];
      }
    }
    return list[0];
  }

  function pickEvent(round) {
    return ldsEvents[(Math.floor(Math.random() * ldsEvents.length) + round) % ldsEvents.length];
  }

  function initLoveDeepspaceGame(panelEl) {
    if (!panelEl) {
      return;
    }

    var campaign = createCampaign({ key: "love-deepspace-campaign", levels: ldsRoutes });
    var route = ldsRoutes[campaign.indexOf(campaign.nextLevelId())];
    var partner = ldsPartners[0];
    var event = pickEvent(0);
    var turn = 0;
    var energy = 72;
    var trust = 56;
    var resonance = 0;
    var done = false;
    var missionLog = [];

    var stage = document.createElement("div");
    stage.className = "lds-stage";

    var topRow = document.createElement("div");
    topRow.className = "lds-top";

    var routeRow = document.createElement("div");
    routeRow.className = "elements-row";
    var routeLabel = document.createElement("label");
    routeLabel.className = "elements-label";
    routeLabel.setAttribute("for", "ldsRouteSel");
    routeLabel.setAttribute("data-i18n", "ldsRouteLabel");
    routeLabel.textContent = t("ldsRouteLabel");
    var routeSel = document.createElement("select");
    routeSel.className = "elements-select";
    routeSel.id = "ldsRouteSel";
    routeRow.appendChild(routeLabel);
    routeRow.appendChild(routeSel);

    var partnerRow = document.createElement("div");
    partnerRow.className = "elements-row";
    var partnerLabel = document.createElement("label");
    partnerLabel.className = "elements-label";
    partnerLabel.setAttribute("for", "ldsPartnerSel");
    partnerLabel.setAttribute("data-i18n", "ldsPartnerLabel");
    partnerLabel.textContent = t("ldsPartnerLabel");
    var partnerSel = document.createElement("select");
    partnerSel.className = "elements-select";
    partnerSel.id = "ldsPartnerSel";
    partnerRow.appendChild(partnerLabel);
    partnerRow.appendChild(partnerSel);

    topRow.appendChild(routeRow);
    topRow.appendChild(partnerRow);

    var hud = document.createElement("div");
    hud.className = "lds-hud";
    var turnsStat = statCard("ldsTurnsLabel");
    var energyStat = statCard("ldsEnergyLabel");
    var trustStat = statCard("ldsTrustLabel");
    var resonanceStat = statCard("ldsResonanceLabel");
    hud.appendChild(turnsStat.card);
    hud.appendChild(energyStat.card);
    hud.appendChild(trustStat.card);
    hud.appendChild(resonanceStat.card);

    var bars = document.createElement("div");
    bars.className = "lds-bars";
    var energyBar = makeBar("ldsEnergyLabel", "lds-bar-energy");
    var trustBar = makeBar("ldsTrustLabel", "lds-bar-trust");
    var resonanceBar = makeBar("ldsResonanceLabel", "lds-bar-resonance");
    bars.appendChild(energyBar.wrap);
    bars.appendChild(trustBar.wrap);
    bars.appendChild(resonanceBar.wrap);

    var eventCard = document.createElement("div");
    eventCard.className = "lds-event";
    var eventTitle = document.createElement("strong");
    var eventBody = document.createElement("p");
    var perkLine = document.createElement("p");
    perkLine.className = "lds-perk";
    eventCard.appendChild(eventTitle);
    eventCard.appendChild(eventBody);
    eventCard.appendChild(perkLine);

    var moves = document.createElement("div");
    moves.className = "lds-moves";
    var moveButtons = [];
    ldsMoves.forEach(function (move) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "lds-move";
      var title = document.createElement("strong");
      title.setAttribute("data-i18n", move.labelKey);
      title.textContent = t(move.labelKey);
      var detail = document.createElement("span");
      detail.setAttribute("data-i18n", move.detailKey);
      detail.textContent = t(move.detailKey);
      button.appendChild(title);
      button.appendChild(detail);
      button.addEventListener("click", function () {
        applyMove(move);
      });
      moveButtons.push(button);
      moves.appendChild(button);
    });

    var result = document.createElement("p");
    result.className = "game-result";
    result.setAttribute("role", "status");

    var actions = document.createElement("div");
    actions.className = "game-actions";
    var restartBtn = document.createElement("button");
    restartBtn.type = "button";
    restartBtn.className = "primary";
    var restartLabel = document.createElement("span");
    restartLabel.setAttribute("data-i18n", "ldsRestart");
    restartLabel.textContent = t("ldsRestart");
    var restartContent = document.createElement("span");
    restartContent.className = "button-content";
    restartContent.appendChild(restartLabel);
    restartBtn.appendChild(restartContent);
    var starsEl = document.createElement("p");
    starsEl.className = "game-best";
    actions.appendChild(restartBtn);
    actions.appendChild(starsEl);

    var logBox = document.createElement("div");
    logBox.className = "lds-log";
    var logTitle = document.createElement("h4");
    logTitle.setAttribute("data-i18n", "ldsLogLabel");
    logTitle.textContent = t("ldsLogLabel");
    var logList = document.createElement("ul");
    logBox.appendChild(logTitle);
    logBox.appendChild(logList);

    var hint = document.createElement("p");
    hint.className = "game-hint";
    hint.setAttribute("data-i18n", "ldsHint");
    hint.textContent = t("ldsHint");

    [topRow, hud, bars, eventCard, moves, result, actions, logBox, hint].forEach(function (node) {
      stage.appendChild(node);
    });
    panelEl.appendChild(stage);

    ldsPartners.forEach(function (entry) {
      var option = document.createElement("option");
      option.value = entry.id;
      option.textContent = t(entry.nameKey);
      partnerSel.appendChild(option);
    });

    function statCard(labelKey) {
      var card = document.createElement("div");
      card.className = "game-stat";
      var label = document.createElement("span");
      label.setAttribute("data-i18n", labelKey);
      label.textContent = t(labelKey);
      var value = document.createElement("strong");
      card.appendChild(label);
      card.appendChild(value);
      return { card: card, value: value };
    }

    function makeBar(labelKey, extraClass) {
      var wrap = document.createElement("div");
      wrap.className = "lds-meter " + extraClass;
      var title = document.createElement("span");
      title.className = "lds-meter-title";
      title.setAttribute("data-i18n", labelKey);
      title.textContent = t(labelKey);
      var track = document.createElement("div");
      track.className = "lds-meter-track";
      var fill = document.createElement("span");
      fill.className = "lds-meter-fill";
      track.appendChild(fill);
      wrap.appendChild(title);
      wrap.appendChild(track);
      return { wrap: wrap, fill: fill };
    }

    function syncRoutePicker() {
      fillCampaignPicker(
        routeSel,
        campaign,
        function (def) {
          return t(def.labelKey);
        },
        t("elementsLocked"),
      );
      routeSel.value = route.id;
    }

    function syncHud() {
      turnsStat.value.textContent = t("ldsTurnsValue", {
        n: Math.max(route.turns - turn, 0),
        m: route.turns,
      });
      energyStat.value.textContent = String(energy);
      trustStat.value.textContent = String(trust);
      resonanceStat.value.textContent = t("ldsResonanceValue", {
        n: resonance,
        m: route.target,
      });
      energyBar.fill.style.width = clamp(energy, 0, 100) + "%";
      trustBar.fill.style.width = clamp(trust, 0, 100) + "%";
      resonanceBar.fill.style.width = clamp(Math.round((resonance / route.target) * 100), 0, 100) + "%";
      eventTitle.textContent = t("ldsEventTitle", { n: turn + 1, m: route.turns });
      eventBody.textContent = t(event.key);
      perkLine.textContent = t("ldsPerkLine", {
        name: t(partner.nameKey),
        perk: t(partner.perkKey),
      });
      starsEl.textContent = t("campaignStars", {
        n: campaign.totalStars(),
        max: campaign.maxStars(),
      });
      for (var i = 0; i < moveButtons.length; i += 1) {
        moveButtons[i].disabled = done;
      }
    }

    function syncLog() {
      while (logList.firstChild) {
        logList.removeChild(logList.firstChild);
      }
      if (!missionLog.length) {
        var empty = document.createElement("li");
        empty.setAttribute("data-i18n", "ldsLogEmpty");
        empty.textContent = t("ldsLogEmpty");
        logList.appendChild(empty);
        return;
      }
      missionLog.slice(-5).forEach(function (line) {
        var item = document.createElement("li");
        item.textContent = line;
        logList.appendChild(item);
      });
    }

    function addLog(text) {
      missionLog.push(text);
      syncLog();
    }

    function startRoute(routeDef, keepPartner) {
      route = routeDef;
      turn = 0;
      energy = 72;
      trust = 56;
      resonance = 0;
      done = false;
      missionLog = [];
      event = pickEvent(0);
      if (!keepPartner) {
        partner = ldsPartners[0];
        partnerSel.value = partner.id;
      }
      syncRoutePicker();
      result.textContent = t("ldsMissionIntro", {
        route: t(route.labelKey),
        name: t(partner.nameKey),
        n: route.target,
      });
      addLog(t("ldsLogStart", { route: t(route.labelKey), name: t(partner.nameKey) }));
      syncHud();
    }

    function applyMove(move) {
      if (done) {
        return;
      }
      var turnsLeftBefore = route.turns - turn;
      var gain = {
        energy: move.stats.energy,
        trust: move.stats.trust,
        resonance: move.stats.resonance,
      };
      if (move.id === event.ideal) {
        gain.trust += 4;
        gain.resonance += 8;
      } else {
        gain.trust -= Math.ceil(event.pressure / 3);
        gain.energy -= Math.floor(event.pressure / 2);
      }
      if (partner.boost === move.id) {
        gain.energy += partner.bonus.energy || 0;
        gain.trust += partner.bonus.trust || 0;
        gain.resonance += partner.bonus.resonance || 0;
      }

      energy = clamp(energy + gain.energy, 0, 100);
      trust = clamp(trust + gain.trust, 0, 100);
      resonance = clamp(resonance + gain.resonance, 0, 120);

      addLog(
        t("ldsLogTurn", {
          n: turn + 1,
          move: t(move.labelKey),
          r: gain.resonance,
          e: gain.energy,
          t: gain.trust,
        }),
      );

      turn += 1;
      var turnsLeft = route.turns - turn;

      if (resonance >= route.target && trust >= 24) {
        done = true;
        var used = route.turns - turnsLeft;
        var starsWon = starsFor(used, route.stars, "low");
        var outcome = campaign.record(route.id, {
          stars: starsWon,
          best: used,
          better: "low",
        });
        var message = t("ldsWin", {
          name: t(partner.nameKey),
          n: used,
          s: starsWon,
        });
        if (outcome.isBest) {
          message += " " + t("newBest");
        }
        if (outcome.unlockedNext) {
          message += " " + t("ldsUnlocked");
        } else if (campaign.clearedCount() === ldsRoutes.length) {
          message += " " + t("ldsAllClear");
        }
        result.textContent = message;
        logAction(t("logLoveDeepspace", { name: t(partner.nameKey), n: used }));
        var rect = restartBtn.getBoundingClientRect();
        createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
        petNotifyGame(outcome.isBest || outcome.firstClear);
      } else if (energy <= 0 || trust <= 0 || turnsLeft <= 0) {
        done = true;
        if (energy <= 0) {
          result.textContent = t("ldsLoseEnergy");
        } else if (trust <= 0) {
          result.textContent = t("ldsLoseTrust");
        } else {
          result.textContent = t("ldsLoseTurns", { n: route.target - resonance });
        }
      } else {
        result.textContent = t("ldsTurnResult", {
          n: turnsLeft,
          k: event.pressure,
        });
      }

      event = pickEvent(turn + turnsLeftBefore);
      syncRoutePicker();
      syncHud();
    }

    routeSel.addEventListener("change", function () {
      var index = campaign.indexOf(routeSel.value);
      if (index >= 0 && campaign.isUnlocked(routeSel.value)) {
        startRoute(ldsRoutes[index], true);
      }
    });

    partnerSel.addEventListener("change", function () {
      partner = byId(ldsPartners, partnerSel.value);
      result.textContent = t("ldsPartnerSwap", {
        name: t(partner.nameKey),
      });
      syncHud();
    });

    restartBtn.addEventListener("click", function () {
      startRoute(route, true);
    });

    startRoute(route, true);
    syncLog();
  }

  App.addStrings({
    en: {
      "tabLoveDeepspace": "Love and Deepspace",
      "ldsRouteLabel": "Mission route",
      "ldsPartnerLabel": "Lead partner",
      "ldsTurnsLabel": "Turns",
      "ldsEnergyLabel": "Energy",
      "ldsTrustLabel": "Trust",
      "ldsResonanceLabel": "Resonance",
      "ldsTurnsValue": "{n}/{m}",
      "ldsResonanceValue": "{n}/{m}",
      "ldsRoute1": "Nebula Pier",
      "ldsRoute2": "Chrono Orbit",
      "ldsRoute3": "Abyss Corridor",
      "ldsRoute4": "Heartstar Zenith",
      "ldsPartnerXavier": "Xavier",
      "ldsPartnerZayne": "Zayne",
      "ldsPartnerRafayel": "Rafayel",
      "ldsPartnerSylus": "Sylus",
      "ldsPerkXavier": "focus actions gain +5 resonance",
      "ldsPerkZayne": "guard actions gain +2 energy +4 trust",
      "ldsPerkRafayel": "heart actions gain +6 trust",
      "ldsPerkSylus": "focus actions refund +5 energy",
      "ldsMoveFocus": "Star Focus",
      "ldsMoveGuard": "Pulse Guard",
      "ldsMoveHeart": "Heartline Sync",
      "ldsMoveFocusDetail": "High resonance, high drain",
      "ldsMoveGuardDetail": "Stabilize shield and trust",
      "ldsMoveHeartDetail": "Build bond for safer bursts",
      "ldsEventTitle": "Encounter {n}/{m}",
      "ldsEventMeteor": "Meteor rain tears the lane open.",
      "ldsEventStatic": "Neural static scrambles your targeting.",
      "ldsEventPulse": "A memory pulse calls for a calm response.",
      "ldsEventRift": "A gravity rift bends your route.",
      "ldsEventPhantom": "Phantom mechs lock onto your wake.",
      "ldsEventEcho": "An echo beacon amplifies every emotion.",
      "ldsPerkLine": "{name} perk: {perk}",
      "ldsMissionIntro": "{route} begins. Team with {name} and reach {n} resonance.",
      "ldsTurnResult": "Mission continues: {n} turns left. Pressure {k}.",
      "ldsWin": "{name} cleared the route in {n} turns - {s} stars.",
      "ldsUnlocked": "Next route unlocked.",
      "ldsAllClear": "All routes completed.",
      "ldsLoseEnergy": "Energy exhausted. The shuttle has to retreat.",
      "ldsLoseTrust": "Trust collapsed. Rebuild the link and try again.",
      "ldsLoseTurns": "Mission timeout. Missing {n} resonance.",
      "ldsRestart": "Restart Route",
      "ldsLogLabel": "Mission log",
      "ldsLogEmpty": "No actions yet.",
      "ldsLogStart": "Route {route} launched with {name}.",
      "ldsLogTurn": "Turn {n}: {move} | Resonance {r}, Energy {e}, Trust {t}.",
      "ldsHint": "Match your move to the encounter to chain resonance quickly.",
      "ldsPartnerSwap": "Switched lead partner to {name}.",
      "logLoveDeepspace": "Cleared Love and Deepspace route with {name} in {n} turns",
    },
    zh: {
      "tabLoveDeepspace": "恋与深空",
      "ldsRouteLabel": "任务航线",
      "ldsPartnerLabel": "主导搭档",
      "ldsTurnsLabel": "回合",
      "ldsEnergyLabel": "能量",
      "ldsTrustLabel": "默契",
      "ldsResonanceLabel": "共鸣",
      "ldsTurnsValue": "{n}/{m}",
      "ldsResonanceValue": "{n}/{m}",
      "ldsRoute1": "星雾码头",
      "ldsRoute2": "时序轨道",
      "ldsRoute3": "深渊走廊",
      "ldsRoute4": "心曜天顶",
      "ldsPartnerXavier": "沈星回",
      "ldsPartnerZayne": "黎深",
      "ldsPartnerRafayel": "祁煜",
      "ldsPartnerSylus": "秦彻",
      "ldsPerkXavier": "专注行动额外 +5 共鸣",
      "ldsPerkZayne": "防御行动额外 +2 能量 +4 默契",
      "ldsPerkRafayel": "心链行动额外 +6 默契",
      "ldsPerkSylus": "专注行动返还 +5 能量",
      "ldsMoveFocus": "星轨专注",
      "ldsMoveGuard": "脉冲护盾",
      "ldsMoveHeart": "心链同步",
      "ldsMoveFocusDetail": "高共鸣，高消耗",
      "ldsMoveGuardDetail": "稳住护盾与默契",
      "ldsMoveHeartDetail": "先积累默契再爆发",
      "ldsEventTitle": "遭遇 {n}/{m}",
      "ldsEventMeteor": "流星雨撕开了航道。",
      "ldsEventStatic": "神经干扰让瞄准失真。",
      "ldsEventPulse": "回忆脉冲需要你先冷静回应。",
      "ldsEventRift": "引力裂缝扭曲了路线。",
      "ldsEventPhantom": "幻影机群锁定了尾迹。",
      "ldsEventEcho": "回声信标放大了每种情绪。",
      "ldsPerkLine": "{name} 特性：{perk}",
      "ldsMissionIntro": "{route} 开始。与 {name} 协作，达成 {n} 点共鸣。",
      "ldsTurnResult": "任务继续：剩余 {n} 回合。当前压力 {k}。",
      "ldsWin": "{name} 在 {n} 回合内通关 - 获得 {s} 星。",
      "ldsUnlocked": "已解锁下一条航线。",
      "ldsAllClear": "全部航线完成。",
      "ldsLoseEnergy": "能量耗尽，穿梭机被迫返航。",
      "ldsLoseTrust": "默契崩溃，请重建联结再试一次。",
      "ldsLoseTurns": "任务超时，还差 {n} 点共鸣。",
      "ldsRestart": "重开航线",
      "ldsLogLabel": "任务日志",
      "ldsLogEmpty": "还没有行动记录。",
      "ldsLogStart": "航线 {route} 已启动，搭档 {name}。",
      "ldsLogTurn": "第 {n} 回合：{move}｜共鸣 {r}、能量 {e}、默契 {t}。",
      "ldsHint": "行动与遭遇类型匹配时，会更快连锁共鸣。",
      "ldsPartnerSwap": "已切换主导搭档为 {name}。",
      "logLoveDeepspace": "与 {name} 在 {n} 回合内完成了恋与深空任务",
    },
  });

  App.registerGame({
    name: "loveDeepspace",
    tabKey: "tabLoveDeepspace",
    init: initLoveDeepspaceGame,
    guide: {
      svg:
        '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' +
        '<defs><linearGradient id="ldsG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5b7cfa"/><stop offset="1" stop-color="#f472b6"/></linearGradient></defs>' +
        '<rect x="6" y="6" width="108" height="64" rx="7" fill="rgba(15,23,42,.8)" stroke="rgba(148,163,184,.45)"/>' +
        '<path d="M16 56l18-16 16 8 18-20 16 9 20-17" fill="none" stroke="url(#ldsG)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<circle cx="34" cy="40" r="4" fill="#60a5fa"/><circle cx="68" cy="28" r="4" fill="#c084fc"/><circle cx="104" cy="20" r="4" fill="#fb7185"/>' +
        '<rect x="14" y="14" width="36" height="12" rx="6" fill="rgba(96,165,250,.2)" stroke="#60a5fa"/>' +
        '<text x="32" y="22" text-anchor="middle" font-size="7" fill="#bfdbfe">R 82</text></svg>',
      en: [
        "Aim: clear each route by reaching its resonance target before turns run out.",
        "Pick a partner first; each one buffs one action style and changes your rhythm.",
        "Every encounter prefers one action card. Matching it grants a combo boost; mismatching costs extra trust and energy.",
        "Keep all three meters alive: zero energy retreats, zero trust breaks the link, and low resonance misses the mission.",
        "Win with fewer turns to earn more stars and unlock harder routes.",
      ],
      zh: [
        "目标：在回合耗尽前达到该航线的共鸣目标并通关。",
        "先选搭档；每位搭档都会强化一种行动节奏。",
        "每次遭遇都有偏好的行动卡，匹配会连锁加成，不匹配会额外消耗默契与能量。",
        "三条数值都要守住：能量归零会撤退，默契归零会断联，共鸣不足会超时失败。",
        "用更少回合获胜可拿更多星，并解锁更高难度航线。",
      ],
    },
  });

  /* Exported for the other modules. */
  App.initLoveDeepspaceGame = initLoveDeepspaceGame;
})(window.CapitalConvert = window.CapitalConvert || {});
