/* Whisper Deck - the positional micro deckbuilder in the shared game drawer.
 * Three lanes, a six card hand, three breath per turn, and an ECHO clause on
 * every card that reads the previous card you played in the same turn. Played cards
 * exhaust and are gone until the rest between duels, so a big opening really
 * does cost. The game is a pure state machine (whisperPlay / whisperEndTurn /
 * whisperAiMove), which is how whisperSolvable proves each deck can win. */
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

  var HAND = 6;
  var YOUR_RESOLVE = 30;
  var TURN_CAP = 18;
  var REST_MEND = 6;
  var STRAIN = 2;
  var LANE_BONUS = 2;
  var DUELS = 4;
  var TYPES = { strike: "strike", guard: "guard", flow: "flow" };

  /* lane: -1 accepts any lane. power/guard/draw/mend are the base effects and
   * echo fires when this turn's previous card was echo.type. */
  var wsdCards = {
    gust: { glyph: "\u301c", type: TYPES.strike, lane: -1, cost: 1, power: 4, echo: { type: TYPES.flow, power: 3 } },
    claw: { glyph: "\u2039", type: TYPES.strike, lane: 0, cost: 1, power: 3, echo: { type: TYPES.strike, power: 3 } },
    fang: { glyph: "\u203a", type: TYPES.strike, lane: 2, cost: 1, power: 3, echo: { type: TYPES.strike, power: 3 } },
    lance: { glyph: "\u2191", type: TYPES.strike, lane: 1, cost: 2, power: 9, echo: { type: TYPES.flow, power: 3 } },
    riposte: { glyph: "\u2694", type: TYPES.strike, lane: -1, cost: 2, power: 6, guard: 3, echo: { type: TYPES.guard, power: 4 } },
    wall: { glyph: "\u25a4", type: TYPES.guard, lane: -1, cost: 1, guard: 4, echo: { type: TYPES.strike, guard: 2 } },
    sidewall: { glyph: "\u25e8", type: TYPES.guard, lane: 0, cost: 1, guard: 5, echo: { type: TYPES.guard, guard: 3 } },
    bulwark: { glyph: "\u25eb", type: TYPES.guard, lane: 2, cost: 1, guard: 5, echo: { type: TYPES.strike, guard: 2 } },
    shell: { glyph: "\u25f2", type: TYPES.guard, lane: 1, cost: 2, guard: 10, echo: { type: TYPES.flow, guard: 4 } },
    sip: { glyph: "\u25e6", type: TYPES.flow, lane: -1, cost: 0, draw: 1, echo: { type: TYPES.flow, draw: 1 } },
    airy: { glyph: "\u00b0", type: TYPES.flow, lane: -1, cost: 1, draw: 2, echo: { type: TYPES.strike, draw: 1 } },
    hush: { glyph: "\u2727", type: TYPES.flow, lane: 1, cost: 1, mend: 4, echo: { type: TYPES.guard, draw: 1 } },
  };

  /* The foe never rolls a die: resolve, power and whether it eats cards are all
   * a level writes down, and the intent comes out of whisperAiMove. */
  var wsdFoes = {
    murmur: { glyph: "\u00b6", resolve: 20, power: 5, waste: false },
    caller: { glyph: "\u266a", resolve: 24, power: 6, waste: false },
    antiphon: { glyph: "\u2044", resolve: 26, power: 6, waste: false },
    choir: { glyph: "\u2261", resolve: 28, power: 6, waste: false },
    deacon: { glyph: "\u25d0", resolve: 33, power: 7, waste: false },
    hollow: { glyph: "\u25ce", resolve: 28, power: 6, waste: true },
    wraith: { glyph: "\u2620", resolve: 34, power: 7, waste: true },
    thunder: { glyph: "\u26a1", resolve: 40, power: 8, waste: false },
  };

  /* Five chambers: the starter deck, an extra echo card, a tighter breath, a
   * card eating foe, and the full four act ladder. */
  var wsdLevels = [
    {
      id: "w1", labelKey: "wsdZ1", twistKey: "wsdTwist1", seed: 811, breath: 3, starResolve: [24, 18, 10],
      deck: ["gust", "gust", "gust", "claw", "claw", "fang", "fang", "wall", "wall", "lance", "sip", "airy"],
      foes: ["murmur", "caller", "choir", "deacon"],
    },
    {
      id: "w2", labelKey: "wsdZ2", twistKey: "wsdTwist2", seed: 977, breath: 3, starResolve: [24, 17, 9],
      deck: ["gust", "gust", "claw", "claw", "fang", "fang", "wall", "wall", "sidewall", "lance", "sip", "airy", "riposte"],
      foes: ["murmur", "caller", "choir", "deacon"],
    },
    {
      id: "w3", labelKey: "wsdZ3", twistKey: "wsdTwist3", seed: 1201, breath: 2, starResolve: [14, 8, 3],
      deck: ["gust", "gust", "claw", "fang", "wall", "bulwark", "lance", "sip", "sip", "airy", "hush"],
      foes: ["murmur", "caller", "antiphon", "choir"],
    },
    {
      id: "w4", labelKey: "wsdZ4", twistKey: "wsdTwist4", seed: 1601, breath: 3, starResolve: [24, 18, 10],
      deck: ["gust", "gust", "gust", "claw", "fang", "wall", "wall", "shell", "lance", "sip", "airy", "hush"],
      foes: ["murmur", "hollow", "choir", "wraith"],
    },
    {
      id: "w5", labelKey: "wsdZ5", twistKey: "wsdTwist5", seed: 2049, breath: 3, starResolve: [22, 15, 8],
      deck: ["gust", "gust", "claw", "claw", "fang", "fang", "wall", "sidewall", "bulwark", "shell", "lance", "riposte", "sip", "airy", "hush"],
      foes: ["antiphon", "caller", "hollow", "thunder"],
    },
  ];

  function wsdInt(value) {
    var num = Number(value);
    return isFinite(num) ? Math.round(num) : 0;
  }

  function wsdCard(id) {
    return wsdCards[id] || wsdCards.gust;
  }

  function wsdFoe(key) {
    return wsdFoes[key] || wsdFoes.murmur;
  }

  function wsdLaneText(lane) {
    if (lane === 0) {
      return t("wsdLaneLeft");
    }
    if (lane === 2) {
      return t("wsdLaneRight");
    }
    return t("wsdLaneMiddle");
  }

  /* A hash rather than Math.random keeps every shuffle a function of the state,
   * so a seed replays a duel card for card. */
  function wsdHash(seed, duel, turn, salt) {
    var x = (wsdInt(seed) ^ 0x9e3779b9) >>> 0;
    x = (x + wsdInt(duel) * 2654435761) >>> 0;
    x = (x + wsdInt(turn) * 40503) >>> 0;
    x = (x + wsdInt(salt) * 1274126177) >>> 0;
    x = (x ^ (x >>> 13)) >>> 0;
    x = (x * 1274126177) >>> 0;
    x = (x ^ (x >>> 16)) >>> 0;
    return x / 4294967296;
  }

  function wsdShuffle(list, seed, duel, turn) {
    var out = list.slice();
    for (var index = out.length - 1; index > 0; index -= 1) {
      var pick = Math.max(0, Math.min(index, Math.floor(wsdHash(seed, duel, turn, index + 7) * (index + 1))));
      var hold = out[index];
      out[index] = out[pick];
      out[pick] = hold;
    }
    return out;
  }

  function wsdCopy(card) {
    var parts = [];
    if (card.power) {
      parts.push(t("wsdPowerWord", { n: card.power }));
    }
    if (card.guard) {
      parts.push(t("wsdGuardWord", { n: card.guard }));
    }
    if (card.draw) {
      parts.push(t("wsdDrawWord", { n: card.draw }));
    }
    if (card.mend) {
      parts.push(t("wsdMendWord", { n: card.mend }));
    }
    return parts.join(" ");
  }

  function wsdEchoCopy(card) {
    if (!card.echo) {
      return t("wsdNoEchoCard");
    }
    var bonus = [];
    if (card.echo.power) {
      bonus.push(t("wsdPowerWord", { n: card.echo.power }));
    }
    if (card.echo.guard) {
      bonus.push(t("wsdGuardWord", { n: card.echo.guard }));
    }
    if (card.echo.draw) {
      bonus.push(t("wsdDrawWord", { n: card.echo.draw }));
    }
    return t("wsdEchoWord", { y: t("wsdType" + card.echo.type), v: bonus.join(" ") });
  }

  function wsdClone(state) {
    var copy = {
      level: state.level,
      seed: state.seed,
      duel: state.duel,
      duelsWon: state.duelsWon,
      turn: state.turn,
      breath: state.breath,
      breathMax: state.breathMax,
      lane: state.lane,
      resolve: state.resolve,
      maxResolve: state.maxResolve,
      guard: [wsdInt(state.guard[0]), wsdInt(state.guard[1]), wsdInt(state.guard[2])],
      foe: {
        key: state.foe.key,
        glyph: state.foe.glyph,
        resolve: wsdInt(state.foe.resolve),
        maxResolve: wsdInt(state.foe.maxResolve),
        power: wsdInt(state.foe.power),
        waste: !!state.foe.waste,
        intent: {
          kind: state.foe.intent.kind,
          lane: wsdInt(state.foe.intent.lane),
          value: wsdInt(state.foe.intent.value),
        },
      },
      draw: state.draw.slice(),
      hand: state.hand.slice(),
      discard: state.discard.slice(),
      exhaust: state.exhaust.slice(),
      echoType: state.echoType,
      over: state.over,
      events: [],
      strains: state.strains,
    };
    return copy;
  }

  /* Deal one duel out of the level's deck. Exhaust only bites inside a duel -
   * the rest between duels brings every card home. */
  function wsdDeal(level, seed, duelIndex) {
    var foes = level.foes && level.foes.length ? level.foes : ["murmur"];
    var key = foes[Math.min(duelIndex, foes.length - 1)];
    var foe = wsdFoe(key);
    var pile = wsdShuffle(level.deck, seed, duelIndex, 1);
    return {
      level: level,
      seed: seed,
      duel: duelIndex,
      duelsWon: duelIndex,
      turn: 1,
      breath: Math.max(1, wsdInt(level.breath) || 3),
      breathMax: Math.max(1, wsdInt(level.breath) || 3),
      lane: 1,
      resolve: YOUR_RESOLVE,
      maxResolve: YOUR_RESOLVE,
      guard: [0, 0, 0],
      foe: {
        key: key,
        glyph: foe.glyph,
        resolve: foe.resolve,
        maxResolve: foe.resolve,
        power: foe.power,
        waste: foe.waste,
        intent: { kind: "strike", lane: 0, value: foe.power },
      },
      draw: pile.slice(HAND),
      hand: pile.slice(0, HAND),
      discard: [],
      exhaust: [],
      echoType: null,
      over: null,
      events: [],
      strains: 0,
    };
  }

  /* The whole personality of the AI, as a pure read of the board: it hits the
   * lane you left barest, mends when it is almost out, eats a card every third
   * turn when it is a Gobbler, and crushes on every fourth turn. */
  function wsdAiMove(state) {
    var guard = state.guard || [0, 0, 0];
    var lane = 0;
    for (var index = 1; index < 3; index += 1) {
      if (wsdInt(guard[index]) < wsdInt(guard[lane])) {
        lane = index;
      }
    }
    var foe = state.foe;
    var turn = Math.max(1, wsdInt(state.turn));
    if (foe.resolve > 0 && foe.resolve <= Math.ceil(foe.maxResolve * 0.3) && turn >= 3) {
      return { kind: "mend", lane: lane, value: 4 };
    }
    if (foe.waste && turn % 3 === 0) {
      return { kind: "waste", lane: lane, value: 1 };
    }
    if (turn % 4 === 0) {
      return { kind: "crush", lane: lane, value: foe.power + 4 + Math.floor(turn / 4) };
    }
    return { kind: "strike", lane: lane, value: foe.power + Math.floor(turn / 4) };
  }

  function wsdBlocked(state, card) {
    if (state.over) {
      return t("wsdBlockedOver");
    }
    if (card.lane >= 0 && card.lane !== state.lane) {
      return t("wsdBlockedLane", { l: wsdLaneText(card.lane) });
    }
    if (card.cost > state.breath) {
      return t("wsdBlockedBreath", { n: card.cost });
    }
    return "";
  }

  function wsdWeakest(state) {
    var lane = 0;
    if (wsdInt(state.guard[1]) < wsdInt(state.guard[lane])) {
      lane = 1;
    }
    if (wsdInt(state.guard[2]) < wsdInt(state.guard[lane])) {
      lane = 2;
    }
    return lane;
  }

  /* Draw up to count. An empty pile spends the Second Breath rule: the exhausted
   * cards come back and the strain costs resolve, clamped to 1 so the strain can
   * never lose the duel for you. That is the floor that keeps a deck of twelve
   * cards from ever running out of answers. */
  function wsdDraw(state, count) {
    for (var step = 0; step < Math.max(0, wsdInt(count)); step += 1) {
      if (state.hand.length >= HAND + 3) {
        return;
      }
      if (!state.draw.length) {
        if (!state.exhaust.length) {
          return;
        }
        state.draw = wsdShuffle(state.exhaust, state.seed, state.duel, state.turn * 17 + step);
        state.exhaust = [];
        state.strains += 1;
        state.resolve = Math.max(1, state.resolve - STRAIN);
        state.events.push(t("wsdSecondBreath", { n: STRAIN }));
      }
      state.hand.push(state.draw.shift());
    }
  }

  function wsdApply(state, card, bonus) {
    var power = wsdInt(card.power) + (bonus && card.echo ? wsdInt(card.echo.power) : 0);
    var guard = wsdInt(card.guard) + (bonus && card.echo ? wsdInt(card.echo.guard) : 0);
    var draw = wsdInt(card.draw) + (bonus && card.echo ? wsdInt(card.echo.draw) : 0);
    if (power) {
      var extra = state.lane === state.foe.intent.lane ? LANE_BONUS : 0;
      state.foe.resolve = Math.max(0, state.foe.resolve - power - extra);
      state.events.push(t("wsdDealt", { n: power + extra, h: state.foe.resolve }));
    }
    if (guard) {
      var lane = card.lane >= 0 ? card.lane : state.lane;
      state.guard[lane] = wsdInt(state.guard[lane]) + guard;
      state.events.push(t("wsdGuarded", { l: wsdLaneText(lane), n: state.guard[lane] }));
    }
    if (card.mend) {
      state.resolve = Math.min(state.maxResolve, state.resolve + wsdInt(card.mend));
      state.events.push(t("wsdMended", { n: card.mend, h: state.resolve }));
    }
    if (draw) {
      state.events.push(t("wsdDrew", { n: draw }));
      wsdDraw(state, draw);
    }
  }

  /* Play the card at `position` into `lane`. Pure: state in, state out. A
   * refused play never moves your stance, so a wasted click is free. */
  function whisperPlay(state, position, lane) {
    var next = wsdClone(state);
    var want = lane === 0 || lane === 1 || lane === 2 ? lane : next.lane;
    var id = next.hand[position];
    if (!id || next.over) {
      return next;
    }
    var card = wsdCard(id);
    var probe = wsdClone(next);
    probe.lane = want;
    var blocked = wsdBlocked(probe, card);
    if (blocked) {
      next.events.push(blocked);
      return next;
    }
    next.lane = want;
    next.hand.splice(position, 1);
    next.exhaust.push(id);
    next.breath -= card.cost;
    var bonus = !!next.echoType && !!card.echo && card.echo.type === next.echoType;
    if (bonus) {
      next.events.push(t("wsdEchoFired", { y: t("wsdType" + card.echo.type) }));
    }
    wsdApply(next, card, bonus);
    next.echoType = card.type;
    if (next.foe.resolve <= 0) {
      next.over = "duel";
    }
    return next;
  }

  /* End of turn: the telegraphed intent lands, every guard is spent, the hand
   * refills and the next intent is read off the fresh board. */
  function whisperEndTurn(state) {
    var next = wsdClone(state);
    if (next.over) {
      return next;
    }
    var intent = next.foe.intent;
    if (intent.kind === "mend") {
      next.foe.resolve = Math.min(next.foe.maxResolve, next.foe.resolve + intent.value);
      next.events.push(t("wsdFoeMend", { g: next.foe.glyph, n: intent.value }));
    } else if (intent.kind === "waste") {
      var worst = -1;
      var dear = -1;
      for (var card = 0; card < next.hand.length; card += 1) {
        if (wsdCard(next.hand[card]).cost > dear) {
          dear = wsdCard(next.hand[card]).cost;
          worst = card;
        }
      }
      if (worst >= 0) {
        next.discard.push(next.hand.splice(worst, 1)[0]);
        next.events.push(t("wsdFoeWaste", { g: next.foe.glyph, c: t("wsdC" + next.discard[next.discard.length - 1]) }));
      }
    } else {
      var lane = Math.max(0, Math.min(2, wsdInt(intent.lane)));
      var left = wsdInt(intent.value);
      var soaked = Math.min(next.guard[lane], left);
      left -= soaked;
      if (left > 0) {
        next.resolve = Math.max(0, next.resolve - left);
        next.events.push(t("wsdFoeHit", { g: next.foe.glyph, l: wsdLaneText(lane), n: left, h: next.resolve }));
      } else {
        next.events.push(t("wsdFoeStopped", { g: next.foe.glyph, l: wsdLaneText(lane), n: soaked }));
      }
    }
    next.guard = [0, 0, 0];
    next.turn += 1;
    if (next.resolve <= 0) {
      next.over = "lost";
      return next;
    }
    if (next.turn > TURN_CAP) {
      next.over = "lost";
      next.events.push(t("wsdDrowned"));
      return next;
    }
    next.breath = next.breathMax;
    next.echoType = null;
    wsdDraw(next, HAND - next.hand.length);
    next.foe.intent = wsdAiMove(next);
    return next;
  }

  function wsdIncoming(state) {
    var intent = state.foe.intent;
    return intent.kind === "strike" || intent.kind === "crush" ? intent.value : 0;
  }

  function wsdLaneChoices(state, card) {
    var options = [state.lane, state.foe.intent.lane, wsdWeakest(state), 0, 1, 2];
    var seen = [];
    for (var index = 0; index < options.length; index += 1) {
      var lane = card.lane >= 0 ? card.lane : options[index];
      if (seen.indexOf(lane) === -1) {
        seen.push(lane);
      }
    }
    return seen;
  }

  /* Greedy one-turn plan: every (card, lane) pair is scored through the real
   * resolver, so what the test proves is the same rule the buttons use. */
  function wsdBestLine(state) {
    var line = [];
    var probe = wsdClone(state);
    for (var step = 0; step < HAND + 3; step += 1) {
      var bestMove = null;
      var bestScore = -1e9;
      for (var position = 0; position < probe.hand.length; position += 1) {
        var card = wsdCard(probe.hand[position]);
        var lanes = wsdLaneChoices(probe, card);
        for (var l = 0; l < lanes.length; l += 1) {
          var trial = whisperPlay(probe, position, lanes[l]);
          if (trial.exhaust.length === probe.exhaust.length) {
            continue;
          }
          var score = 0;
          var needGuard = probe.resolve <= wsdIncoming(probe) + 2 ? 4 : 1;
          score += (probe.foe.resolve - trial.foe.resolve) * (trial.foe.resolve <= 0 ? 200 : 6);
          score += (trial.guard[trial.foe.intent.lane] - probe.guard[probe.foe.intent.lane]) * needGuard * 2;
          score += (probe.resolve - trial.resolve) * -3;
          score += (trial.hand.length - probe.hand.length) * 2;
          score -= card.cost * 0.4;
          if (score > bestScore) {
            bestScore = score;
            bestMove = { position: position, lane: lanes[l] };
          }
        }
      }
      if (!bestMove) {
        break;
      }
      line.push(bestMove);
      probe = whisperPlay(probe, bestMove.position, bestMove.lane);
      if (probe.over) {
        break;
      }
    }
    return line;
  }

  function wsdAutoDuel(state) {
    var live = wsdClone(state);
    for (var turn = 0; turn < TURN_CAP + 2; turn += 1) {
      var line = wsdBestLine(live);
      for (var step = 0; step < line.length; step += 1) {
        live = whisperPlay(live, line[step].position, line[step].lane);
        if (live.over) {
          break;
        }
      }
      if (live.over) {
        break;
      }
      live = whisperEndTurn(live);
      if (live.over) {
        break;
      }
    }
    return live;
  }

  /* The scripted best-play line through all four duels, rest included. */
  function wsdAutoRun(level, attempt) {
    var state = wsdDeal(level, (level.seed + wsdInt(attempt) * 31) >>> 0, 0);
    var duels = 0;
    for (var duel = 0; duel < DUELS; duel += 1) {
      state = wsdAutoDuel(state);
      if (state.over !== "duel") {
        return { won: false, duels: duels, resolve: state.resolve, turns: state.turn };
      }
      duels += 1;
      if (duel + 1 >= DUELS) {
        return { won: true, duels: duels, resolve: state.resolve, turns: state.turn };
      }
      var carried = Math.min(YOUR_RESOLVE, state.resolve + REST_MEND);
      state = wsdDeal(level, state.seed, duel + 1);
      state.resolve = Math.max(1, carried);
    }
    return { won: false, duels: duels, resolve: state.resolve, turns: state.turn };
  }

  /* Campaign proof: the measured band a greedy line leaves you on. */
  function whisperSolvable(level) {
    var wins = 0;
    var low = YOUR_RESOLVE;
    var high = 0;
    var runs = 10;
    for (var index = 0; index < runs; index += 1) {
      var result = wsdAutoRun(level, index);
      if (result.won) {
        wins += 1;
        low = Math.min(low, result.resolve);
        high = Math.max(high, result.resolve);
      }
    }
    return { wins: wins, runs: runs, lowResolve: low, highResolve: high };
  }

  function initWhisperDeckGame(panelEl) {
    if (!panelEl) {
      return;
    }

    var campaign = createCampaign({ key: "whisper-deck-campaign", levels: wsdLevels });
    var levelDef = wsdLevels[Math.max(0, campaign.indexOf(campaign.nextLevelId()))];
    var state = null;
    var runs = 0;
    var laneCells = [];
    var handCells = [];

    var hud = document.createElement("div");
    hud.className = "game-hud";
    var breathEl = document.createElement("strong");
    var resolveEl = document.createElement("strong");
    var duelEl = document.createElement("strong");
    hud.appendChild(wsdStat("wsdBreathLabel", breathEl));
    hud.appendChild(wsdStat("wsdResolveLabel", resolveEl));
    hud.appendChild(wsdStat("wsdDuelLabel", duelEl));

    var stage = document.createElement("div");
    stage.className = "wsd-stage";
    stage.setAttribute("tabindex", "0");
    stage.setAttribute("role", "application");
    stage.setAttribute("aria-label", t("wsdFieldLabel"));

    var foeLine = document.createElement("p");
    foeLine.className = "wsd-foe";
    stage.appendChild(foeLine);

    var laneRow = document.createElement("div");
    laneRow.className = "wsd-lanes";
    laneRow.setAttribute("role", "group");
    laneRow.setAttribute("aria-label", t("wsdLaneGroupLabel"));
    [0, 1, 2].forEach(function (lane) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "wsd-lane";
      button.addEventListener("click", function () {
        chooseLane(lane);
      });
      laneRow.appendChild(button);
      laneCells.push(button);
    });
    stage.appendChild(laneRow);

    var zones = document.createElement("p");
    zones.className = "wsd-zones";
    stage.appendChild(zones);

    var handRow = document.createElement("div");
    handRow.className = "wsd-hand";
    handRow.setAttribute("role", "group");
    handRow.setAttribute("aria-label", t("wsdHandLabel"));
    for (var slot = 0; slot < HAND; slot += 1) {
      var cardButton = document.createElement("button");
      cardButton.type = "button";
      cardButton.className = "wsd-card";
      (function (position) {
        cardButton.addEventListener("click", function () {
          play(position);
        });
      })(slot);
      handRow.appendChild(cardButton);
      handCells.push(cardButton);
    }

    var echoLine = document.createElement("p");
    echoLine.className = "wsd-echo";

    var controls = document.createElement("div");
    controls.className = "wsd-controls";
    controls.appendChild(wsdButton("wsd-btn", "btnNewRound", function () {
      startRun();
    }));

    var log = document.createElement("p");
    log.className = "wsd-log";

    var result = document.createElement("p");
    result.className = "game-result";
    result.setAttribute("role", "status");

    var pickerRow = document.createElement("div");
    pickerRow.className = "elements-row";
    var pickerLabel = document.createElement("label");
    pickerLabel.className = "elements-label";
    pickerLabel.setAttribute("for", "wsdDeckSel");
    pickerLabel.setAttribute("data-i18n", "wsdDeckSelectLabel");
    pickerLabel.textContent = t("wsdDeckSelectLabel");
    var picker = document.createElement("select");
    picker.className = "elements-select";
    picker.id = "wsdDeckSel";
    pickerRow.appendChild(pickerLabel);
    pickerRow.appendChild(picker);

    var actions = document.createElement("div");
    actions.className = "game-actions";
    var endBtn = wsdButton("primary", "wsdBtnEnd", function () {
      endTurn();
    });
    var bestEl = document.createElement("p");
    bestEl.className = "game-best";
    actions.appendChild(endBtn);
    actions.appendChild(bestEl);

    var hint = document.createElement("p");
    hint.className = "game-hint";
    hint.setAttribute("data-i18n", "wsdHint");
    hint.textContent = t("wsdHint");

    [hud, stage, handRow, echoLine, controls, log, result, pickerRow, actions, hint].forEach(function (node) {
      panelEl.appendChild(node);
    });

    stage.addEventListener("keydown", function (event) {
      if (!state) {
        return;
      }
      var key = event.key;
      if (key === "ArrowLeft") {
        event.preventDefault();
        chooseLane(Math.max(0, state.lane - 1));
        return;
      }
      if (key === "ArrowRight") {
        event.preventDefault();
        chooseLane(Math.min(2, state.lane + 1));
        return;
      }
      if (key === "Enter" || key === " ") {
        event.preventDefault();
        endTurn();
        return;
      }
      var digit = Number(key);
      if (isFinite(digit) && digit >= 1 && digit <= state.hand.length) {
        event.preventDefault();
        play(digit - 1);
      }
    });

    function wsdButton(extra, key, handler) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = extra;
      var label = document.createElement("span");
      label.setAttribute("data-i18n", key);
      label.textContent = t(key);
      var content = document.createElement("span");
      content.className = "button-content";
      content.appendChild(label);
      button.appendChild(content);
      button.addEventListener("click", function () {
        handler();
      });
      return button;
    }

    function wsdStat(key, valueEl) {
      var stat = document.createElement("div");
      stat.className = "game-stat";
      var label = document.createElement("span");
      label.setAttribute("data-i18n", key);
      label.textContent = t(key);
      stat.appendChild(label);
      stat.appendChild(valueEl);
      return stat;
    }

    function startRun() {
      runs += 1;
      state = wsdDeal(levelDef, (levelDef.seed + runs * 31) >>> 0, 0);
      state.events = [t("wsdOpen", { n: t(levelDef.twistKey) })];
      result.textContent = t("wsdPrompt", { n: DUELS, b: state.breathMax, cap: TURN_CAP });
      render();
    }

    function chooseLane(lane) {
      if (!state || state.over) {
        return;
      }
      state.lane = Math.max(0, Math.min(2, wsdInt(lane)));
      render();
    }

    function play(position) {
      if (!state || state.over) {
        return;
      }
      state = whisperPlay(state, position, state.lane);
      if (state.over === "duel") {
        winDuel();
      }
      render();
    }

    function endTurn() {
      if (!state) {
        return;
      }
      if (state.over) {
        return;
      }
      state = whisperEndTurn(state);
      if (state.over === "lost") {
        result.textContent = t("wsdLost", { d: state.duel + 1, total: DUELS, s: state.seed });
      }
      if (!isMotionOff()) {
        stage.classList.add("wsd-turn");
      }
      render();
    }

    function winDuel() {
      state.duelsWon = Math.min(DUELS, state.duel + 1);
      if (state.duel + 1 >= DUELS) {
        finishRun();
        return;
      }
      var carried = Math.min(state.maxResolve, state.resolve + REST_MEND);
      state = wsdDeal(levelDef, state.seed, state.duel + 1);
      state.resolve = Math.max(1, carried);
      state.events = [t("wsdRest", { n: REST_MEND })];
      result.textContent = t("wsdDuelWon", { d: state.duel + 1, total: DUELS });
    }

    function finishRun() {
      state.over = "run";
      var stars = starsFor(state.resolve, levelDef.starResolve, "high");
      var outcome = campaign.record(levelDef.id, { stars: stars, best: state.resolve, better: "high" });
      var message = t("wsdWon", { d: DUELS, h: state.resolve, s: stars });
      if (outcome.isBest) {
        message += " " + t("newBest");
      }
      if (outcome.unlockedNext) {
        message += " " + t("wsdNext");
      } else if (campaign.clearedCount() === wsdLevels.length) {
        message += " " + t("wsdDone");
      }
      result.textContent = message;
      logAction(t("logWhisperDeck", { n: state.resolve }));
      var rect = endBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      refreshPicker();
    }

    function intentCopy(intent) {
      if (!intent) {
        return "";
      }
      if (intent.kind === "mend") {
        return t("wsdIntentMend", { n: intent.value });
      }
      if (intent.kind === "waste") {
        return t("wsdIntentWaste");
      }
      if (intent.kind === "crush") {
        return t("wsdIntentCrush", { l: wsdLaneText(intent.lane), n: intent.value });
      }
      return t("wsdIntentStrike", { l: wsdLaneText(intent.lane), n: intent.value });
    }

    function render() {
      if (!state) {
        return;
      }
      breathEl.textContent = t("wsdBreathValue", { n: state.breath, max: state.breathMax });
      resolveEl.textContent = t("wsdResolveValue", { n: state.resolve, max: state.maxResolve });
      duelEl.textContent = t("wsdDuelValue", {
        n: Math.min(DUELS, state.duel + 1),
        total: DUELS,
        w: state.duelsWon,
        t: Math.max(0, TURN_CAP - state.turn + 1),
      });

      foeLine.textContent = t("wsdFoeLine", {
        g: state.foe.glyph,
        h: state.foe.resolve,
        m: state.foe.maxResolve,
      }) + " " + intentCopy(state.foe.intent);

      for (var lane = 0; lane < 3; lane += 1) {
        laneCells[lane].textContent = t("wsdLaneCell", {
          l: wsdLaneText(lane),
          g: state.guard[lane],
          m: state.foe.intent.lane === lane ? "\u25b2" : "\u00b7",
        });
        laneCells[lane].className = "wsd-lane" + (state.lane === lane ? " wsd-here" : "") + (state.foe.intent.lane === lane ? " wsd-aimed" : "");
        laneCells[lane].setAttribute("aria-label", t("wsdLaneAria", {
          l: wsdLaneText(lane),
          g: state.guard[lane],
          a: state.foe.intent.lane === lane ? t("wsdAimed") : t("wsdNotAimed"),
        }));
      }
      zones.textContent = t("wsdZones", { d: state.draw.length, x: state.exhaust.length, f: state.discard.length, s: state.strains });

      for (var slot = 0; slot < HAND; slot += 1) {
        var button = handCells[slot];
        var id = state.hand[slot];
        if (!id) {
          button.textContent = "\u00b7";
          button.className = "wsd-card wsd-empty";
          button.disabled = true;
          button.setAttribute("aria-label", t("wsdEmptySlot", { n: slot + 1 }));
          continue;
        }
        var card = wsdCard(id);
        var blocked = wsdBlocked(state, card);
        var armed = !!state.echoType && !!card.echo && card.echo.type === state.echoType;
        button.textContent = t("wsdCardLine", {
          n: slot + 1,
          g: card.glyph,
          y: t("wsdType" + card.type),
          c: card.cost,
          l: card.lane >= 0 ? wsdLaneText(card.lane) : "\u00b0",
          e: wsdCopy(card),
        });
        if (App.art) {
          button.textContent = "";
          var cost = document.createElement("span"); cost.className = "world-card-cost"; cost.textContent = String(card.cost); button.appendChild(cost);
          button.appendChild(App.art.icon(card.type === TYPES.strike ? "sword" : card.type === TYPES.guard ? "shield" : "wave", { hue: card.type === TYPES.strike ? 340 : card.type === TYPES.guard ? 175 : 265, cls: "world-card-art" }));
          var name = document.createElement("strong"); name.className = "world-card-name"; name.textContent = t("wsdC" + id); button.appendChild(name);
          var effect = document.createElement("span"); effect.className = "world-card-effect"; effect.textContent = wsdCopy(card); button.appendChild(effect);
          var echo = document.createElement("span"); echo.className = "world-card-echo"; echo.textContent = wsdEchoCopy(card); button.appendChild(echo);
        }
        button.className = "wsd-card wsd-" + card.type + (blocked ? " wsd-dud" : "") + (armed ? " wsd-armed" : "");
        button.disabled = false;
        button.setAttribute("aria-label", t("wsdCardAria", {
          n: slot + 1,
          name: t("wsdC" + id),
          c: card.cost,
          e: wsdCopy(card),
          h: wsdEchoCopy(card),
          r: blocked || t("wsdPlayable"),
        }));
      }
      echoLine.textContent = state.echoType ? t("wsdLastWas", { y: t("wsdType" + state.echoType) }) : t("wsdNoEchoYet");
      log.textContent = state.events && state.events.length ? state.events.join(" / ") : t("wsdSilence");
      endBtn.disabled = !!state.over && state.over !== "duel";
    }

    function refreshPicker() {
      fillCampaignPicker(
        picker,
        campaign,
        function (def) {
          return t(def.labelKey) + " \u00b7 " + t(def.twistKey);
        },
        t("elementsLocked"),
      );
      picker.value = levelDef.id;
      var best = campaign.best(levelDef.id);
      bestEl.textContent = t("campaignStars", { n: campaign.totalStars(), max: campaign.maxStars() }) + " \u00b7 " + (best ? t("wsdBest", { h: best }) : t("noBest"));
    }

    picker.addEventListener("change", function () {
      var position = campaign.indexOf(picker.value);
      if (position < 0 || !campaign.isUnlocked(picker.value)) {
        refreshPicker();
        return;
      }
      levelDef = wsdLevels[position];
      startRun();
      refreshPicker();
    });

    startRun();
    refreshPicker();
  }

  /* Bilingual copy travels with the game (see core.js addStrings). */
  App.addStrings({
    en: {
      "tabWhisperDeck": "Whisper Deck",
      "wsdZ1": "First Breath",
      "wsdZ2": "Echo Chamber",
      "wsdZ3": "Thin Air",
      "wsdZ4": "The Gobbler",
      "wsdZ5": "Four Act Chorus",
      "wsdTwist1": "the starter deck",
      "wsdTwist2": "one more echo card",
      "wsdTwist3": "two breath a turn",
      "wsdTwist4": "a foe that eats cards",
      "wsdTwist5": "the full ladder",
      "wsdBreathLabel": "Breath",
      "wsdResolveLabel": "Resolve",
      "wsdDuelLabel": "Duel",
      "wsdBreathValue": "{n}/{max}",
      "wsdResolveValue": "{n}/{max}",
      "wsdDuelValue": "{n}/{total} (won {w}) - {t} turns left",
      "wsdFieldLabel": "Duel stage: choose a lane with the arrow keys or the lane buttons, press 1 to 6 to play that card, Space or Enter ends the turn.",
      "wsdLaneGroupLabel": "The three lanes",
      "wsdLaneLeft": "left",
      "wsdLaneMiddle": "middle",
      "wsdLaneRight": "right",
      "wsdLaneCell": "{l} lane - guard {g} {m}",
      "wsdLaneAria": "{l} lane holding {g} guard. The foe {a} it.",
      "wsdAimed": "is aiming at",
      "wsdNotAimed": "is not aiming at",
      "wsdHandLabel": "Your hand of six cards",
      "wsdCardLine": "{n}. {g} {y} {c} breath [{l}] {e}",
      "wsdCardAria": "Card {n}, {name}, costs {c} breath. {e} Echo: {h} {r}",
      "wsdEmptySlot": "Card slot {n} is empty",
      "wsdPlayable": "Ready to play.",
      "wsdPowerWord": "{n} damage",
      "wsdGuardWord": "{n} guard",
      "wsdDrawWord": "draw {n}",
      "wsdMendWord": "mend {n}",
      "wsdTypestrike": "strike",
      "wsdTypeguard": "guard",
      "wsdTypeflow": "flow",
      "wsdEchoWord": "if the previous card this turn was a {y} card, also {v}",
      "wsdNoEchoCard": "no echo",
      "wsdZones": "deck {d} - exhausted {x} - discarded {f} - second breaths {s}",
      "wsdLastWas": "Your previous card this turn was a {y} card, so {y} echoes are armed.",
      "wsdNoEchoYet": "Nothing played yet this turn, so no echo is armed.",
      "wsdBtnEnd": "End Turn",
      "wsdDeckSelectLabel": "Chamber",
      "wsdBlockedOver": "This duel is already over.",
      "wsdBlockedLane": "That card only works in the {l} lane - switch lanes first.",
      "wsdBlockedBreath": "Not enough breath: it costs {n}.",
      "wsdSecondBreath": "Second Breath: the exhausted cards return and the strain costs {n} resolve.",
      "wsdDealt": "you whisper for {n} (foe at {h})",
      "wsdGuarded": "{l} lane now holds {n} guard",
      "wsdMended": "you mend {n} (resolve {h})",
      "wsdDrew": "you draw {n}",
      "wsdEchoFired": "echo answers your {y} card",
      "wsdFoeMend": "{g} mends {n}",
      "wsdFoeWaste": "{g} swallows your dearest card, {c} - it waits in the discard until the rest",
      "wsdFoeHit": "{g} breaks through the {l} lane for {n} (resolve {h})",
      "wsdFoeStopped": "{g} breaks on the {l} lane guard ({n} soaked)",
      "wsdDrowned": "The chorus finishes before you do.",
      "wsdIntentStrike": "Intent: {l} strike for {n}",
      "wsdIntentCrush": "Intent: {l} CRUSH for {n}",
      "wsdIntentMend": "Intent: mend {n}",
      "wsdIntentWaste": "Intent: swallow one of your cards",
      "wsdFoeLine": "{g} foe at {h}/{m} resolve",
      "wsdOpen": "{n}: four duels, one deck, and every card you play is spent until the rest.",
      "wsdPrompt": "{n} duels, {b} breath a turn, {cap} turns per duel. Take the foe to 0; hit 0 yourself and the run is over.",
      "wsdRest": "You rest between duels: the exhausted cards return and you recover {n} resolve.",
      "wsdDuelWon": "Duel {d} of {total} is yours. Breathe - the next voice answers.",
      "wsdWon": "All {d} duels held with {h} resolve left - {s} stars.",
      "wsdLost": "You unravelled in duel {d} of {total}. Seed {s} replays it.",
      "wsdNext": "Next chamber unlocked.",
      "wsdDone": "Every chamber has heard you.",
      "wsdBest": "best {h} resolve",
      "wsdSilence": "The room waits.",
      "wsdHint": "Guard the lane the arrow points at, and keep a cheap card back so an echo has something to answer.",
      "logWhisperDeck": "Held four duels with {n} resolve",
      "wsdCgust": "Gust",
      "wsdCclaw": "Left Claw",
      "wsdCfang": "Right Fang",
      "wsdClance": "Lance",
      "wsdCriposte": "Riposte",
      "wsdCwall": "Wall",
      "wsdCsidewall": "Side Wall",
      "wsdCbulwark": "Bulwark",
      "wsdCshell": "Shell",
      "wsdCsip": "Sip",
      "wsdCairy": "Air",
      "wsdChush": "Hush",
    },
    zh: {
      "tabWhisperDeck": "低语牌局",
      "wsdZ1": "第一口气",
      "wsdZ2": "回音室",
      "wsdZ3": "稀薄之气",
      "wsdZ4": "吞牌者",
      "wsdZ5": "四幕合唱",
      "wsdTwist1": "起始牌组",
      "wsdTwist2": "多一张回音牌",
      "wsdTwist3": "每回合两口气",
      "wsdTwist4": "会吞牌的对手",
      "wsdTwist5": "完整四幕阶梯",
      "wsdBreathLabel": "气息",
      "wsdResolveLabel": "心气",
      "wsdDuelLabel": "对决",
      "wsdBreathValue": "{n}/{max}",
      "wsdResolveValue": "{n}/{max}",
      "wsdDuelValue": "第 {n}/{total} 场（已胜 {w}）- 还剩 {t} 回合",
      "wsdFieldLabel": "对决台：用方向键或车道按钮选道，按 1 到 6 打出对应的牌，空格或回车结束回合。",
      "wsdLaneGroupLabel": "三条车道",
      "wsdLaneLeft": "左",
      "wsdLaneMiddle": "中",
      "wsdLaneRight": "右",
      "wsdLaneCell": "{l}道 - 防护 {g} {m}",
      "wsdLaneAria": "{l}车道，现有 {g} 点防护。对手{a}它。",
      "wsdAimed": "正瞄准",
      "wsdNotAimed": "没有瞄准",
      "wsdHandLabel": "你的手牌（六张）",
      "wsdCardLine": "{n}. {g} {y} {c} 气 [{l}] {e}",
      "wsdCardAria": "第 {n} 张：{name}，花费 {c} 口气。{e} 回音：{h} {r}",
      "wsdEmptySlot": "第 {n} 个牌位是空的",
      "wsdPlayable": "可以打出。",
      "wsdPowerWord": "{n} 点伤害",
      "wsdGuardWord": "{n} 点防护",
      "wsdDrawWord": "抽 {n} 张",
      "wsdMendWord": "回 {n} 点心气",
      "wsdTypestrike": "攻击",
      "wsdTypeguard": "防护",
      "wsdTypeflow": "流转",
      "wsdEchoWord": "若本回合上一张是{y}牌，则额外 {v}",
      "wsdNoEchoCard": "无回音",
      "wsdZones": "牌堆 {d} - 已耗尽 {x} - 已弃置 {f} - 二次呼吸 {s} 次",
      "wsdLastWas": "本回合你上一张打出的是{y}牌，因此{y}类回音已上膛。",
      "wsdNoEchoYet": "本回合还没出牌，没有回音被上膛。",
      "wsdBtnEnd": "结束回合",
      "wsdDeckSelectLabel": "经堂",
      "wsdBlockedOver": "这场对决已经结束。",
      "wsdBlockedLane": "这张牌只能放在{l}车道——先切换车道。",
      "wsdBlockedBreath": "气息不够：它要 {n} 口气。",
      "wsdSecondBreath": "二次呼吸：耗尽的牌回到牌堆，代价是 {n} 点心气。",
      "wsdDealt": "你的低语造成 {n} 点（对手剩 {h}）",
      "wsdGuarded": "{l}车道现在有 {n} 点防护",
      "wsdMended": "你回 {n} 点心气（现 {h}）",
      "wsdDrew": "你抽了 {n} 张",
      "wsdEchoFired": "回音接上了你的{y}牌",
      "wsdFoeMend": "{g} 恢复了 {n} 点",
      "wsdFoeWaste": "{g} 吞掉你最贵的一张牌 {c}——歇息之前它在弃置堆里等着",
      "wsdFoeHit": "{g} 击穿{l}车道，造成 {n} 点（心气剩 {h}）",
      "wsdFoeStopped": "{g} 撞在{l}车道的防护上（吃掉 {n} 点）",
      "wsdDrowned": "合唱先把你淹没了。",
      "wsdIntentStrike": "意图：从{l}道重击 {n} 点",
      "wsdIntentCrush": "意图：从{l}道碾碎 {n} 点",
      "wsdIntentMend": "意图：恢复 {n} 点",
      "wsdIntentWaste": "意图：吞你一张牌",
      "wsdFoeLine": "{g} 对手心气 {h}/{m}",
      "wsdOpen": "{n}——四场对决、一副牌，打出的牌在歇息前都不会回来。",
      "wsdPrompt": "共 {n} 场对决，每回合 {b} 口气，每场最多 {cap} 回合。把对手打到 0；你自己到 0 就算输。",
      "wsdRest": "对决之间你歇了口气：耗尽的牌全部回堆，回复 {n} 点心气。",
      "wsdDuelWon": "第 {d}/{total} 场归你。喘口气——下一个声音会回答。",
      "wsdWon": "四场全部守住，还剩 {h} 点心气 - 获得 {s} 星。",
      "wsdLost": "你在第 {d}/{total} 场散架了。种子 {s} 可完整重放。",
      "wsdNext": "解锁下一间经堂。",
      "wsdDone": "每一间经堂都听见了你。",
      "wsdBest": "最佳 {h} 点心气",
      "wsdSilence": "房间在等。",
      "wsdHint": "箭头顶着哪条道就守哪条，手里留一张便宜牌，回音才有东西可接。",
      "logWhisperDeck": "守住四场对决，余 {n} 点心气",
      "wsdCgust": "阵风",
      "wsdCclaw": "左爪",
      "wsdCfang": "右牙",
      "wsdClance": "长枪",
      "wsdCriposte": "还击",
      "wsdCwall": "壁垒",
      "wsdCsidewall": "侧壁",
      "wsdCbulwark": "墩台",
      "wsdCshell": "硬壳",
      "wsdCsip": "小口",
      "wsdCairy": "通风",
      "wsdChush": "静默",
    },
  });

  App.registerGame({
    name: "whisperDeck",
    tabKey: "tabWhisperDeck",
    init: initWhisperDeckGame,
    guide: {
      svg:
        '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="6" y="6" width="108" height="64" rx="5" fill="rgba(30,41,59,.75)" stroke="rgba(148,163,184,.45)"/>' +
        '<path d="M40 12v52M80 12v52" stroke="rgba(148,163,184,.25)"/>' +
        '<rect x="14" y="44" width="20" height="18" rx="3" fill="rgba(34,211,238,.22)" stroke="#22d3ee"/>' +
        '<text x="24" y="56" font-size="10" fill="#22d3ee" text-anchor="middle">\u25e85</text>' +
        '<rect x="50" y="44" width="20" height="18" rx="3" fill="rgba(251,191,36,.2)" stroke="#fbbf24"/>' +
        '<text x="60" y="56" font-size="10" fill="#fbbf24" text-anchor="middle">\u301c4</text>' +
        '<rect x="86" y="44" width="20" height="18" rx="3" fill="rgba(34,211,238,.22)" stroke="#22d3ee"/>' +
        '<text x="96" y="56" font-size="10" fill="#22d3ee" text-anchor="middle">\u203a3</text>' +
        '<text x="60" y="24" font-size="13" fill="#fb7185" text-anchor="middle">\u00b6</text>' +
        '<text x="60" y="35" font-size="8" fill="#fb7185" text-anchor="middle">aim middle 6</text></svg>',
      en: [
        "Aim: win four duels in a row by taking the foe to 0 resolve. Reach 0 of your own and the run ends.",
        "Turn: you get three breath (two in Thin Air). Spend them on cards, then End Turn - the telegraphed intent lands on the lane it names, and every guard is spent.",
        "Position: a card printed with a lane only plays there, and striking into the aimed lane adds 2 damage. Arrows or the lane buttons move your stance.",
        "Echo: each card reads the previous card you played in the same turn, so play a cheap card first to chain into Lance or Riposte. Ending the turn clears the echo.",
        "Cost: played cards exhaust and are gone until the rest between duels. If the deck runs dry mid duel, Second Breath returns it for 2 resolve - clamped so it can never kill you, which is the floor that keeps every duel winnable.",
        "Scoring: the resolve you still hold after the fourth duel sets the stars, and the foe is a fixed function of the board, so its next hit can always be read.",
      ],
      zh: [
        "目标：连下四场对决，把对手的心气打到 0；你自己的心气归零，这局就结束。",
        "回合：每回合三口气（稀薄之气只有两口），花在牌上，然后结束回合——预告的那一击落在它点名的车道，所有防护同时清空。",
        "站位：牌面印了车道的只能放在那一车道，朝被瞄准的车道出击额外加 2 点伤害。方向键或车道按钮切换你的站位。",
        "回音：每张牌读的是你本回合上一张打出的牌，所以先打一张便宜牌，再接上长枪或还击。结束回合会清空回音。",
        "代价：打出的牌即被耗尽，要到两场对决之间的歇息才回来。牌堆中途空了，二次呼吸会把整堆送回，只扣 2 点心气——而且这 2 点永远杀不死你，这就是每场对决都可赢的底线。",
        "计分：第四场结束时剩余的心气决定星级。对手是盘面的固定函数，它下一击永远读得出来。",
      ],
    },
  });

  /* Exported for the other modules and the headless tests. */
  App.initWhisperDeckGame = initWhisperDeckGame;
  App.whisperAiMove = wsdAiMove;
  App.whisperPlay = whisperPlay;
  App.whisperEndTurn = whisperEndTurn;
  App.whisperDeal = wsdDeal;
  App.whisperBestLine = wsdBestLine;
  App.whisperAutoDuel = wsdAutoDuel;
  App.whisperAutoRun = wsdAutoRun;
  App.whisperSolvable = whisperSolvable;
  App.whisperCards = wsdCards;
  App.whisperLevels = wsdLevels;
})(window.CapitalConvert = window.CapitalConvert || {});
