/* Tiny Wrestlers - the ring-sport game in the shared game drawer.
 * Two wrestlers circle one mat. Every beat both sides give themselves an order
 * at the same time - three attacks (feint, grab, shove) and three supports
 * (circle back, brace, step in) - and the beat only settles once both orders are
 * locked, so one pure resolver settles a solo bout, a duo bout and the machine's
 * own answer. Foot position is one readable number per wrestler: 0 is the centre
 * line, 2 is the rim, and a third step is out of the ring, while balance is the
 * other way to lose. A missed grab leaves you exposed for a couple of beats, so
 * reaching for empty air costs you the tempo. Registered through the game
 * registry, so it needs no markup in the four HTML pages. The solo ladder is ten
 * ranks of that same machine with less and less slack, and every rung of it is
 * settled by the one resolver below. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  var t = App.t;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  var createCampaign = App.createCampaign;
  var fillCampaignPicker = App.fillCampaignPicker;
  var starsFor = App.starsFor;
  var twrMaxBalance = 6;
  var twrMaxFoot = 2;
  var twrMaxExposed = 3;
  var twrBeatCap = 40;
  var twrStallLimit = 4;
  var twrReadMs = 1700;
  var twrDuoWindow = 4600;
  var twrTicks = 6;
  var twrOrders = ["feint", "grab", "shove", "circle", "brace", "stepin"];
  var twrAttackOf = { feint: true, grab: true, shove: true };
  /* The triangle: a grab catches a shove, a shove plows through a feint and a
   * feint baits a grab. */
  var twrBeatsOrder = { grab: "shove", shove: "feint", feint: "grab" };
  /* Reach is read off the space number: both attacks need an arm of space (2),
   * so at "long" or "apart" they only cost the attacker balance, and a feint is
   * never out of range because it never means to land. */
  var twrReach = { feint: 4, grab: 2, shove: 2, circle: 4, brace: 4, stepin: 4 };
  var twrOrderKeys = {
    feint: "twrOrdFeint", grab: "twrOrdGrab", shove: "twrOrdShove",
    circle: "twrOrdCircle", brace: "twrOrdBrace", stepin: "twrOrdStep",
  };
  var twrWordKeys = {
    grab: "twrWGrab", shove: "twrWShove", feintWorks: "twrWFeintWorks",
    flinch: "twrWFlinch", stumble: "twrWStumble", bothStumble: "twrWBothStumble",
    slipped: "twrWSlipped", blocked: "twrWBlocked", shoveBrace: "twrWShoveBrace",
    nothing: "twrWNothing", clashGrab: "twrWClashGrab", clashShove: "twrWClashShove",
    clashFeint: "twrWClashFeint", move: "twrWMove", breather: "twrWBreather",
    docked: "twrWDocked",
  };
  /* The space between them is the two foot numbers added up, and it is always
   * read as a word plus a digit: 0-1 clinch, 2 reach, 3 long, 4 apart. */
  var twrGapWords = ["twrGapClinch", "twrGapClinch", "twrGapReach", "twrGapLong", "twrGapApart"];
  var twrKeysBlue = { q: "feint", w: "grab", e: "shove", a: "circle", s: "brace", d: "stepin" };
  var twrKeysRed = { u: "feint", i: "grab", o: "shove", j: "circle", k: "brace", l: "stepin" };
  /* Ranks: how much of the machine's guess comes from your own last beats
   * (predict), how early it locks inside the window (rush), how hard it goes for
   * a nearly-down opponent (greed), how much noise it plays with, and the beat
   * counts that earn [3, 2, 1] stars.
   * The ten rungs are one ladder and not two: the machine never changes shape, it
   * only loses slack, so predict climbs 0.15 to 1 while noise falls 0.5 to 0.026.
   * Twelve scripted lines replayed against each rung through twrExchange itself
   * win 36%, 31%, 26%, 19%, 13%, 11%, 9%, 7%, 5% and 3% of those bouts in rung
   * order, and at least six of the twelve lines beat the last rung - every rank
   * is beatable and none is easier than the one before it. The bands were read
   * off the same replay: a rung's wins land in 4 to 6 beats at their median and
   * 7 to 19 at their slowest tenth, so each band sits above its own rung's lengths
   * and no band drops below the rung before. */
  var twrRanks = [
    { id: "w1", labelKey: "twrR1", windowMs: 4200, predict: 0.15, rush: 0.35, greed: 0.3, noise: 0.5, starBeats: [8, 12, 20] },
    { id: "w2", labelKey: "twrR2", windowMs: 3700, predict: 0.3, rush: 0.45, greed: 0.45, noise: 0.32, starBeats: [9, 13, 20] },
    { id: "w3", labelKey: "twrR3", windowMs: 3200, predict: 0.45, rush: 0.55, greed: 0.6, noise: 0.2, starBeats: [9, 14, 21] },
    { id: "w4", labelKey: "twrR4", windowMs: 2800, predict: 0.6, rush: 0.68, greed: 0.75, noise: 0.1, starBeats: [10, 15, 22] },
    { id: "w5", labelKey: "twrR5", windowMs: 2400, predict: 0.82, rush: 0.88, greed: 0.95, noise: 0.06, starBeats: [11, 16, 24] },
    { id: "w6", labelKey: "twrR6", windowMs: 2200, predict: 0.88, rush: 0.9, greed: 1, noise: 0.05, starBeats: [11, 17, 25] },
    { id: "w7", labelKey: "twrR7", windowMs: 2050, predict: 0.9, rush: 0.92, greed: 1, noise: 0.044, starBeats: [12, 18, 26] },
    { id: "w8", labelKey: "twrR8", windowMs: 1900, predict: 0.93, rush: 0.94, greed: 1, noise: 0.038, starBeats: [12, 19, 28] },
    { id: "w9", labelKey: "twrR9", windowMs: 1800, predict: 0.96, rush: 0.97, greed: 1, noise: 0.032, starBeats: [13, 20, 30] },
    { id: "w10", labelKey: "twrR10", windowMs: 1700, predict: 1, rush: 1, greed: 1, noise: 0.026, starBeats: [14, 21, 32] },
  ];

  /* --- pure core, exported for the checks -------------------------- */
  function twrClamp(value, low, high) {
    var n = Number(value);
    if (!isFinite(n)) { return low; }
    n = Math.round(n);
    return n < low ? low : n > high ? high : n;
  }

  /* Rank fractions keep their decimals, so they get a clamping helper of their
   * own instead of the rounding one. */
  function twrUnit(value) {
    var n = Number(value);
    if (!isFinite(n)) { return 0; }
    return n < 0 ? 0 : n > 1 ? 1 : n;
  }

  function twrLegal(order) {
    return twrOrders.indexOf(order) === -1 ? "brace" : order;
  }

  function twrSide(source) {
    var from = source || {};
    return {
      balance: twrClamp(from.balance === undefined ? twrMaxBalance : from.balance, 0, twrMaxBalance),
      foot: twrClamp(from.foot === undefined ? 1 : from.foot, 0, twrMaxFoot),
      exposed: twrClamp(from.exposed === undefined ? 0 : from.exposed, 0, twrMaxExposed),
      gain: 0, fell: "", note: "",
    };
  }

  function twrStartMat() {
    return {
      gap: 2,
      stall: 0,
      a: { balance: twrMaxBalance, foot: 1, exposed: 0 },
      b: { balance: twrMaxBalance, foot: 1, exposed: 0 },
    };
  }

  /* The rules are symmetric, but the machine is worth scoring from its own seat,
   * so the AI flips the mat, thinks, and answers with a plain order that goes
   * back through twrExchange like any other. */
  function twrFlip(mat) {
    var src = mat && mat.a && mat.b ? mat : twrStartMat();
    return {
      gap: twrClamp(src.gap, 0, 4),
      stall: twrClamp(src.stall, 0, twrStallLimit),
      a: { balance: src.b.balance, foot: src.b.foot, exposed: src.b.exposed },
      b: { balance: src.a.balance, foot: src.a.foot, exposed: src.a.exposed },
    };
  }

  /* One beat as pure data: nothing is mutated and nothing is read from the DOM,
   * so the human order, the machine order and a replayed test beat all settle
   * through this single function. `word` names what happened for the narrator. */
  function twrExchange(mat, orderA, orderB) {
    var src = mat && mat.a && mat.b ? mat : twrStartMat();
    var out = { gap: twrClamp(src.gap, 0, 4), a: twrSide(src.a), b: twrSide(src.b), word: "move" };
    var wantA = twrLegal(orderA);
    var wantB = twrLegal(orderB);
    /* An exposed wrestler has already lost the beat: only the brace is legal. */
    var oa = out.a.exposed > 0 ? "brace" : wantA;
    var ob = out.b.exposed > 0 ? "brace" : wantB;
    if (oa !== wantA) { out.a.note = "forced"; }
    if (ob !== wantB) { out.b.note = "forced"; }

    /* Supports resolve first: they set the space the attacks are measured in. */
    function support(side, order) {
      var s = out[side];
      if (order === "brace" || order === "circle") {
        s.balance = Math.min(twrMaxBalance, s.balance + 1);
      }
      if (order === "circle") {
        /* One more step back from the rim is a step out of the ring. */
        if (s.foot >= twrMaxFoot) {
          s.foot = twrMaxFoot + 1;
          s.fell = "stepped";
          s.note = "stepped";
        } else {
          s.foot += 1;
        }
      } else if (order === "stepin") {
        s.foot = Math.max(0, s.foot - 1);
      }
    }

    function bite(side, value) {
      var s = out[side];
      s.balance -= value;
      if (s.balance <= 0) { s.balance = 0; s.fell = "tipped"; }
    }
    function push(side) {
      var s = out[side];
      s.foot += 1;
      if (s.foot > twrMaxFoot) { s.foot = twrMaxFoot + 1; if (!s.fell) { s.fell = "out"; } }
    }
    function pull(side) { out[side].foot = Math.max(0, out[side].foot - 1); }
    /* A shove is paid for with forward steps: the shover arrives where the victim
     * used to stand, which is what keeps the pressure on the rim. */
    function advance(side) { out[side].foot = Math.max(0, out[side].foot - 1); }
    function steadier(side) { out[side].balance = Math.min(twrMaxBalance, out[side].balance + 1); }

    /* A missed grab, a shove at thin air: one point of balance and a beat of
     * exposure, which is the hook the whole game turns on. */
    function stumble(side) { bite(side, 1); out[side].gain += 1; }

    support("a", oa);
    support("b", ob);
    out.gap = twrClamp(out.a.foot + out.b.foot, 0, 4);

    function land(order, def) {
      var atk = def === "a" ? "b" : "a";
      if (order === "grab") { bite(def, 2); pull(def); out[def].gain += 2; return "grab"; }
      if (order === "shove") { bite(def, 2); push(def); advance(atk); out[def].gain += 1; return "shove"; }
      bite(def, 1);
      out[def].gain += 1;
      return "flinch";
    }
    /* A support cannot be dodged twice: retreating slips an attack, bracing eats
     * a shove but smothers a grab, and stepping in walks into the full effect. */
    function againstSupport(order, atk, def, defOrder) {
      if (out.gap > twrReach[order]) { stumble(atk); return "stumble"; }
      if (defOrder === "circle") {
        if (order === "feint") { return "nothing"; }
        stumble(atk);
        return "slipped";
      }
      if (defOrder === "brace") {
        if (order === "grab") { stumble(atk); return "blocked"; }
        if (order === "shove") { bite(def, 1); push(def); advance(atk); return "shoveBrace"; }
        return "nothing";
      }
      return land(order, def);
    }

    var attackA = !!twrAttackOf[oa];
    var attackB = !!twrAttackOf[ob];
    if (attackA && attackB) {
      var inA = out.gap <= twrReach[oa];
      var inB = out.gap <= twrReach[ob];
      if (!inA && !inB) { stumble("a"); stumble("b"); out.word = "bothStumble"; }
      /* Reaching from too far while the other attack stays in range: the lunge
       * is the punishment, so the landed attack settles it on its own. */
      else if (!inA) { out.word = land(ob, "a"); }
      else if (!inB) { out.word = land(oa, "b"); }
      else if (oa === ob) {
        if (oa === "grab") { bite("a", 1); bite("b", 1); out.word = "clashGrab"; }
        else if (oa === "shove") { bite("a", 1); bite("b", 1); push("a"); push("b"); out.word = "clashShove"; }
        else { out.word = "clashFeint"; }
      } else if (twrBeatsOrder[oa] === ob) {
        if (oa === "feint") { bite("b", 2); out.b.gain += 2; steadier("a"); out.word = "feintWorks"; }
        else { out.word = land(oa, "b"); }
      } else if (twrBeatsOrder[ob] === oa) {
        if (ob === "feint") { bite("a", 2); out.a.gain += 2; steadier("b"); out.word = "feintWorks"; }
        else { out.word = land(ob, "a"); }
      } else {
        out.word = "nothing";
      }
    } else if (attackA) {
      out.word = againstSupport(oa, "a", "b", ob);
    } else if (attackB) {
      out.word = againstSupport(ob, "b", "a", oa);
    } else {
      out.word = oa === "brace" && ob === "brace" ? "breather" : "move";
    }

    /* Four beats without anything landing and the referee docks them both: a
     * bout nobody is wrestling is the one result this game refuses to have. */
    var progress = { grab: 1, shove: 1, flinch: 1, feintWorks: 1, clashGrab: 1, clashShove: 1 };
    out.stall = progress[out.word] ? 0 : twrClamp(src.stall, 0, twrStallLimit) + 1;
    if (out.stall >= twrStallLimit) {
      out.stall = 0;
      bite("a", 1);
      bite("b", 1);
      out.word = "docked";
    }

    /* A beat spent bracing pays down one beat of exposure; new exposure stacks
     * on top of what is left, capped so nobody is ever frozen for good. */
    out.a.exposed = Math.min(twrMaxExposed, Math.max(0, out.a.exposed - 1) + out.a.gain);
    out.b.exposed = Math.min(twrMaxExposed, Math.max(0, out.b.exposed - 1) + out.b.gain);
    out.gap = twrClamp(out.a.foot + out.b.foot, 0, 4);
    return out;
  }

  /* History is only ever this module's own array, but the core is exported, so a
   * stranger's argument can never be allowed to throw. */
  function twrList(value) {
    return Object.prototype.toString.call(value) === "[object Array]" ? value : [];
  }

  /* The machine's map of your habits: its own guess table blended with what you
   * actually ordered over the last eight beats, weighted by predict. */
  function twrWeights(history, predict) {
    var base = { feint: 15, grab: 22, shove: 20, circle: 13, brace: 10, stepin: 12 };
    var counts = { feint: 0, grab: 0, shove: 0, circle: 0, brace: 0, stepin: 0 };
    var seen = 0;
    twrList(history).slice(-8).forEach(function (order) {
      if (counts[order] !== undefined) { counts[order] += 1; seen += 1; }
    });
    var odds = twrUnit(predict) * 0.9;
    var weights = {};
    var total = 0;
    twrOrders.forEach(function (order) {
      var share = base[order] / 92;
      var observed = (counts[order] + 0.8) / (seen + 0.8 * 6);
      weights[order] = (1 - odds) * share + odds * observed;
      total += weights[order];
    });
    twrOrders.forEach(function (order) {
      weights[order] = total > 0 ? weights[order] / total : 1 / twrOrders.length;
    });
    return weights;
  }

  /* Every candidate order is replayed against the predicted reply through the
   * real resolver, then scored from the machine's own seat. */
  function twrAiValue(view, mine, theirs, rank) {
    var res = twrExchange(view, mine, theirs);
    var me = res.a;
    var foe = res.b;
    var value = 0;
    value += (view.b.balance - foe.balance) * 3;
    value += (me.balance - view.a.balance) * 3;
    value += Math.max(0, foe.foot - view.b.foot) * 5;
    value -= Math.max(0, me.foot - view.a.foot) * 3;
    value += foe.gain * 2 - me.gain * 3;
    /* Ground is the whole point: a beat that ends out of everyone's reach is a
     * beat nobody wrestled, so the machine pays for closing the space. */
    value += Math.max(0, 3 - res.gap) * 6;
    if (foe.fell) { value += 120; }
    if (me.fell) { value -= 120; }
    if (twrAttackOf[mine] && foe.balance <= 2) { value += 9 * twrUnit(rank.greed); }
    if (mine === "brace" && view.a.balance >= twrMaxBalance) { value -= 4; }
    if (mine === "stepin" && view.a.foot === 0) { value -= 3; }
    return value;
  }

  function twrAiPick(mat, rank, history) {
    var level = rank || twrRanks[0];
    var view = twrFlip(mat);
    if (view.a.exposed > 0) { return "brace"; }
    var weights = twrWeights(history, level.predict);
    var best = "brace";
    var bestValue = -Infinity;
    twrOrders.forEach(function (mine) {
      var value = 0;
      twrOrders.forEach(function (theirs) {
        value += (weights[theirs] || 0) * twrAiValue(view, mine, theirs, level);
      });
      if (level.noise > 0) { value += (Math.random() - 0.5) * level.noise * 40; }
      if (value > bestValue) { bestValue = value; best = mine; }
    });
    return best;
  }
  App.wrestlerExchange = twrExchange;
  App.wrestlerAiPick = twrAiPick;
  App.wrestlerAiValue = twrAiValue;
  App.wrestlerWeights = twrWeights;
  App.wrestlerFlip = twrFlip;
  App.wrestlerStartMat = twrStartMat;
  App.wrestlerOrders = twrOrders;
  App.wrestlerRanks = twrRanks;

  function initTinyWrestlersGame(panelEl) {
    if (!panelEl) { return; }
    var campaign = createCampaign({ key: "tiny-wrestlers-campaign", levels: twrRanks });
    var rank = twrRanks[Math.max(0, campaign.indexOf(campaign.nextLevelId()))];
    var solo = true;
    var mat = twrStartMat();
    var history = [];
    var pick = { a: "", b: "" };
    var locked = { a: false, b: false };
    var aiLocked = false;
    var aiLockAt = 0;
    var beats = 0;
    var phase = "pick";
    var frozen = false;
    var beatClock = 0;
    var lastStamp = 0;
    var rafId = null;
    var beatTimer = null;
    var shownTicks = -1;
    var shownWindow = "";
    var lastTouched = "a";

    function node(tag, cls, text) {
      var el = document.createElement(tag);
      if (cls) { el.className = cls; }
      if (text !== undefined && text !== null) { el.textContent = text; }
      return el;
    }
    /* Anything carrying data-i18n is a leaf: the shared language pass rewrites
     * its textContent, so dynamic copy never sits on one of these nodes. */
    function labelled(cls, key) {
      var el = node("span", cls);
      el.setAttribute("data-i18n", key);
      el.textContent = t(key);
      return el;
    }
    function nowMs() {
      return window.performance && window.performance.now ? window.performance.now() : Date.now();
    }
    function nameFor(side) { return t(side === "a" ? "twrBlueLabel" : "twrRedLabel"); }
    function windowMs() { return solo ? twrClamp(rank.windowMs, 900, 12000) : twrDuoWindow; }
    function readMs() { return App.isMotionOff && App.isMotionOff() ? 900 : twrReadMs; }
    function gapWord(gap) { return t(twrGapWords[twrClamp(gap, 0, 4)]); }

    /* --- markup: built with createElement so the harness can drive it --- */
    function stack(parent, kids) {
      kids.forEach(function (kid) { parent.appendChild(kid); });
      return parent;
    }
    function attrs(el, map) {
      Object.keys(map).forEach(function (name) { el.setAttribute(name, map[name]); });
      return el;
    }
    var balanceAEl = node("strong");
    var balanceBEl = node("strong");
    var beatEl = node("strong");
    var spaceEl = node("strong");
    var lockEl = node("strong");
    var windowEl = node("strong");
    var hud = stack(node("div", "game-hud"), [
      makeStat("twrBlueLabel", balanceAEl), makeStat("twrRedLabel", balanceBEl),
      makeStat("twrBeatLabel", beatEl), makeStat("twrSpaceLabel", spaceEl),
      makeStat("twrLockLabel", lockEl), makeStat("twrWindowLabel", windowEl),
    ]);
    var blueFig = figure("twr-wrestler twr-blue");
    var redFig = figure("twr-wrestler twr-red");
    var spaceTag = node("span", "twr-space-tag");
    var matBox = stack(node("div", "twr-mat"), [
      stack(node("div", "twr-rim twr-rim-left"), [labelled("twr-rim-word", "twrRimWord")]),
      blueFig, spaceTag, redFig,
      stack(node("div", "twr-rim twr-rim-right"), [labelled("twr-rim-word", "twrRimWord")]),
    ]);
    var windowBar = attrs(node("div", "twr-window"), { "aria-hidden": "true" });
    var tickEls = [];
    for (var tickIndex = 0; tickIndex < twrTicks; tickIndex += 1) {
      var tickEl = node("span", "twr-tick");
      windowBar.appendChild(tickEl);
      tickEls.push(tickEl);
    }
    var callEl = node("p", "twr-call");
    var padBlue = orderPad("a", "twrPadBlue", "twrKeysBlueLine");
    var padRed = orderPad("b", "twrPadRed", "twrKeysRedLine");
    var padsBox = stack(node("div", "twr-pads twr-pads-single"), [padBlue.pad, padRed.pad]);
    var keysAlias = node("p", "twr-keys twr-keys-alias");
    /* The arena is the focusable field: it holds the mat, the beat window, the
     * last call in words and one readable line per wrestler. */
    var arena = attrs(node("div", "twr-arena"), {
      tabindex: "0",
      role: "application",
      "data-i18n-aria": "twrArenaLabel",
      "aria-label": t("twrArenaLabel"),
      "aria-describedby": "twrResult",
    });
    stack(arena, [matBox, windowBar, callEl, padsBox, keysAlias]);
    var result = attrs(node("p", "game-result"), { id: "twrResult", role: "status" });

    var modeRow = pickerRow("twrModeSelectLabel", "twrModeSel");
    var modeSel = modeRow.select;
    [["solo", "twrModeSolo"], ["duo", "twrModeDuo"]].forEach(function (pair) {
      var option = node("option");
      option.value = pair[0];
      attrs(option, { "data-i18n": pair[1] });
      option.textContent = t(pair[1]);
      modeSel.appendChild(option);
    });
    modeSel.value = "solo";
    var rankRow = pickerRow("twrRankSelectLabel", "twrRankSel");
    var rankSel = rankRow.select;

    var lockBtn = buttonWith("primary", "twrBtnLock", function () { lockOrder(lastTouched); });
    var takeBtn = buttonWith("twr-plain", "twrBtnTake", function () { takeBack(lastTouched); });
    var boutBtn = buttonWith("twr-plain", "twrBtnBout", function () { loadMatch(rank); });
    var bestEl = node("p", "game-best");
    var actions = stack(node("div", "game-actions"), [lockBtn, takeBtn, boutBtn, bestEl]);
    var hint = attrs(node("p", "game-hint"), { "data-i18n": "twrHint" });
    hint.textContent = t("twrHint");

    /* Panel order is the contract: HUD, arena, result, pickers, actions, hint. */
    stack(panelEl, [hud, arena, result, modeRow.row, rankRow.row, actions, hint]);

    function figure(cls) {
      var el = node("div", cls);
      el.setAttribute("aria-hidden", "true");
      el.appendChild(node("span", "twr-head"));
      return el;
    }
    function makeStat(key, valueEl) {
      var stat = node("div", "game-stat");
      stat.appendChild(labelled(null, key));
      stat.appendChild(valueEl);
      return stat;
    }
    function buttonWith(cls, labelKey, onClick) {
      var btn = node("button", cls);
      btn.type = "button";
      var content = node("span", "button-content");
      content.appendChild(labelled(null, labelKey));
      btn.appendChild(content);
      btn.addEventListener("click", function () { onClick(); });
      return btn;
    }

    function pickerRow(labelKey, selectId) {
      var row = node("div", "elements-row");
      var label = node("label", "elements-label");
      label.setAttribute("for", selectId);
      label.setAttribute("data-i18n", labelKey);
      label.textContent = t(labelKey);
      var select = node("select", "elements-select");
      select.id = selectId;
      row.appendChild(label);
      row.appendChild(select);
      return { row: row, select: select };
    }

    /* One pad per wrestler is the whole story of that wrestler: the name, the
     * balance pips, the state in words and digits, the order being held, the six
     * letter-printed buttons and the key line that says who owns them. */
    function orderPad(side, titleKey, keysKey) {
      var pad = node("div", "twr-pad " + (side === "a" ? "twr-pad-blue" : "twr-pad-red"));
      var pips = attrs(node("div", "twr-pips"), { "aria-hidden": "true" });
      var pipEls = [];
      for (var index = 0; index < twrMaxBalance; index += 1) {
        var pip = node("span", "twr-pip");
        pips.appendChild(pip);
        pipEls.push(pip);
      }
      var keysLine = node("p", "twr-keys");
      keysLine.appendChild(labelled(null, keysKey));
      var tally = node("p", "twr-side-state");
      var state = node("p", "twr-pad-state");
      var cluster = side === "a" ? twrKeysBlue : twrKeysRed;
      var buttons = {};
      var kids = [
        stack(node("div", "twr-pad-head"), [labelled("twr-pad-title", titleKey), pips]),
        keysLine, tally,
      ];
      twrOrders.forEach(function (order) {
        var letter = "";
        Object.keys(cluster).forEach(function (key) {
          if (cluster[key] === order) { letter = key.toUpperCase(); }
        });
        var btn = node("button", "twr-order");
        btn.type = "button";
        btn.appendChild(labelled("twr-order-name", twrOrderKeys[order]));
        btn.appendChild(node("span", "twr-order-key", letter));
        btn.addEventListener("click", function () { choose(side, order); });
        kids.push(btn);
        buttons[order] = btn;
      });
      kids.push(state);
      return {
        pad: stack(pad, kids), buttons: buttons, pips: pipEls, tally: tally, state: state,
      };
    }

    /* --- reading the state into the panel --------------------------- */
    function lockWord(side) {
      if (solo && side === "b") { return t(aiLocked ? "twrMachineLocked" : "twrMachineChoosing"); }
      return t(locked[side] ? "twrLockedWord" : "twrChoosingWord");
    }
    function pickWord(side) {
      /* A shared keyboard means a shown order can be answered, so a duo bout
       * keeps both picks hidden until the beat settles. */
      if (!solo) { return t(pick[side] ? "twrHiddenSet" : "twrPickNone"); }
      return pick[side] ? t(twrOrderKeys[pick[side]]) : t("twrPickNone");
    }
    function footShown(side) {
      return twrClamp(mat[side].foot, 0, twrMaxFoot + 1);
    }
    /* One pass paints one wrestler: pips for the glance, a state line carrying
     * every number in words and digits, the order being held, and which of the
     * six buttons are legal right now. */
    function renderPads() {
      ["a", "b"].forEach(function (side) {
        var pad = side === "a" ? padBlue : padRed;
        var s = mat[side];
        var balance = twrClamp(s.balance, 0, twrMaxBalance);
        for (var index = 0; index < pad.pips.length; index += 1) {
          pad.pips[index].className = "twr-pip" + (index < balance ? " is-on" : "");
        }
        var lines = [t("twrSideState", {
          b: balance, max: twrMaxBalance, f: Math.min(twrMaxFoot, footShown(side)), maxF: twrMaxFoot,
        })];
        lines.push(s.exposed > 0 ? t("twrExposedState", { n: twrClamp(s.exposed, 0, twrMaxExposed) }) : t("twrSteadyState"));
        if (s.note === "forced") { lines.push(t("twrNoteForced")); }
        else if (s.note === "stepped") { lines.push(t("twrNoteStepped")); }
        if (s.fell) { lines.push(t(s.fell === "tipped" ? "twrFallTipped" : "twrOutState")); }
        pad.tally.textContent = lines.join(" \u00b7 ");
        pad.state.textContent = t("twrPadState", { o: pickWord(side), s: lockWord(side) });
        twrOrders.forEach(function (order) {
          var btn = pad.buttons[order];
          var playable = phase === "pick" && !(solo && side === "b") && !locked[side];
          var legal = s.exposed === 0 || order === "brace";
          btn.className = "twr-order" + (solo && pick[side] === order ? " is-pick" : "") +
            (locked[side] ? " is-locked" : "") + (playable && legal ? "" : " is-blocked");
          btn.disabled = !(playable && legal);
        });
        pad.pad.hidden = solo && side === "b";
      });
      padsBox.className = "twr-pads" + (solo ? " twr-pads-single" : " twr-pads-duo");
    }

    function renderWindow() {
      var total = phase === "pick" ? windowMs() : readMs();
      var remain = Math.max(0, total - beatClock);
      var ticks = phase === "over" ? 0 : twrClamp(Math.ceil((remain / Math.max(1, total)) * twrTicks), 0, twrTicks);
      if (ticks !== shownTicks) {
        shownTicks = ticks;
        for (var index = 0; index < tickEls.length; index += 1) {
          tickEls[index].className = "twr-tick" + (index < ticks ? " is-on" : "");
        }
      }
      var text;
      if (phase === "over") { text = t("twrWindowOver"); }
      else if (phase === "read") { text = t("twrWindowSettle"); }
      else { text = t("twrWindowStat", { s: (remain / 1000).toFixed(1), n: ticks, max: twrTicks }); }
      if (text !== shownWindow) { shownWindow = text; windowEl.textContent = text; }
    }

    function renderMat() {
      blueFig.className = figureClass("a", "twr-wrestler twr-blue");
      redFig.className = figureClass("b", "twr-wrestler twr-red");
      spaceTag.textContent = t("twrSpaceStat", { word: gapWord(mat.gap), n: twrClamp(mat.gap, 0, 4) });
    }
    function figureClass(side, base) {
      var s = mat[side];
      var cls = base + " twr-foot-" + footShown(side);
      if (s.fell) { cls += " is-down"; }
      if (locked[side] || (solo && side === "b" && aiLocked)) { cls += " is-locked"; }
      if (phase === "pick" && s.exposed > 0) { cls += " is-exposed"; }
      return cls;
    }
    /* Every number the player reads is words and digits together, which is the
     * whole point of this game: nothing is left to guess from colour alone. */
    function renderHud() {
      balanceAEl.textContent = t("twrBalanceStat", { v: twrClamp(mat.a.balance, 0, twrMaxBalance), max: twrMaxBalance });
      balanceBEl.textContent = t("twrBalanceStat", { v: twrClamp(mat.b.balance, 0, twrMaxBalance), max: twrMaxBalance });
      beatEl.textContent = t("twrBeatStat", { n: twrClamp(beats, 0, 999) });
      spaceEl.textContent = t("twrSpaceStat", { word: gapWord(mat.gap), n: twrClamp(mat.gap, 0, 4) });
      lockEl.textContent = lockWord("a") + " / " + lockWord("b");
      renderPads();
      renderMat();
      renderWindow();
    }

    function refreshPicker() {
      fillCampaignPicker(
        rankSel,
        campaign,
        function (def) { return t(def.labelKey); },
        t("elementsLocked"),
      );
      rankSel.value = rank.id;
      bestEl.textContent = t("campaignStars", { n: campaign.totalStars(), max: campaign.maxStars() });
    }

    /* --- the beat: one state machine, one owner per step ------------- */
    function clearBeat() {
      if (beatTimer !== null) {
        window.clearTimeout(beatTimer);
        beatTimer = null;
      }
    }
    /* The window is driven by rAF. A single re-armed timeout is only a backstop
     * for throttled frames: it can never run ahead of the beat the loop would
     * have reached, and it stands down while the panel is hidden or paused. */
    function armBackstop() {
      /* Hidden means no frames are coming and none are owed either: the boot
       * pass starts a bout while the panel is still hidden, and a timer left
       * pending there would outlive the drawer's own fx-timer cleanup. */
      if (beatTimer !== null || phase === "over" || panelEl.hidden || document.hidden) {
        return;
      }
      var total = phase === "pick" ? windowMs() : readMs();
      var remain = Math.max(0, total - beatClock);
      beatTimer = window.setTimeout(function () { beatTimer = null; catchUp(); }, Math.max(80, remain + 180));
    }
    function catchUp() {
      if (phase === "over" || frozen || panelEl.hidden || document.hidden) { return; }
      lastStamp = nowMs();
      beatClock = phase === "pick" ? windowMs() : readMs();
      stepBeat();
    }
    function stepBeat() {
      if (phase === "pick") {
        renderWindow();
        if (solo && !aiLocked && beatClock >= aiLockAt) { aiAnswer(); }
        if (locked.a && locked.b) { resolveBeat(); return; }
        /* The window closing commits whatever was picked, or a brace. */
        if (beatClock >= windowMs()) { resolveBeat(); }
        return;
      }
      if (phase === "read" && beatClock >= readMs()) { startBeat(); }
    }

    function frame() {
      if (rafId === null) { return; }
      rafId = window.requestAnimationFrame(frame);
      if (panelEl.hidden || document.hidden || frozen) {
        lastStamp = nowMs();
        return;
      }
      var dt = Math.min(0.032, (nowMs() - lastStamp) / 1000);
      lastStamp = nowMs();
      beatClock += dt > 0 ? dt * 1000 : 0;
      stepBeat();
      /* Visible again, so the throttled-frame backstop is owed again; it no-ops
       * while one is already outstanding. */
      armBackstop();
    }

    function ensureLoop() {
      if (rafId !== null) { return; }
      lastStamp = nowMs();
      rafId = window.requestAnimationFrame(frame);
    }
    /* Any interaction wakes the bout up: the drawer pauses every registry game
     * when it switches tabs, and the score stays exactly where it was. */
    function touch() {
      if (panelEl.hidden || document.hidden) { return; }
      frozen = false;
      lastStamp = nowMs();
      ensureLoop();
      if (phase !== "over") { armBackstop(); }
    }
    function startBeat() {
      clearBeat();
      pick.a = "";
      pick.b = "";
      locked.a = false;
      locked.b = false;
      aiLocked = false;
      /* A quicker rank locks earlier in the window, so it pressures the beat. */
      aiLockAt = windowMs() * (0.3 + (1 - twrUnit(rank.rush)) * 0.55);
      phase = "pick";
      beatClock = 0;
      shownTicks = -1;
      shownWindow = "";
      lastStamp = nowMs();
      if (beats > 0) {
        result.textContent = t("twrBeatOpen", { n: beats + 1, s: (windowMs() / 1000).toFixed(1) });
      }
      renderHud();
      armBackstop();
    }

    function refuse(message) { result.textContent = message; }

    /* Every action runs the same gauntlet first: the bout wakes up, the beat has
     * to be open, and the machine's seat is not the player's to give orders to. */
    function gate(side) {
      touch();
      if (phase !== "pick") { refuse(t(phase === "read" ? "twrWindowSettle" : "twrOver")); return false; }
      if (solo && side === "b") { refuse(t("twrRedPadHidden", { x: nameFor("b") })); return false; }
      return true;
    }

    function choose(side, order) {
      if (!gate(side)) { return; }
      if (locked[side]) { refuse(t("twrAlreadyLocked", { x: nameFor(side) })); return; }
      if (mat[side].exposed > 0 && order !== "brace") {
        refuse(t("twrExposedBlock", { n: twrClamp(mat[side].exposed, 0, twrMaxExposed) }));
        return;
      }
      lastTouched = side;
      pick[side] = twrLegal(order);
      renderHud();
    }

    /* The machine's answer, produced by twrAiPick and settled by the same
     * resolver the players use - never by a private shortcut. Only a solo beat
     * ever calls this, because a duo bout has no machine to answer. */
    function aiAnswer() {
      if (aiLocked || phase !== "pick") { return; }
      aiLocked = true;
      pick.b = twrLegal(twrAiPick(mat, rank, history));
      locked.b = true;
      renderHud();
    }
    function lockOrder(side) {
      if (!gate(side)) { return; }
      if (locked[side]) { return; }
      pick[side] = twrLegal(pick[side] || "brace");
      locked[side] = true;
      if (solo && !aiLocked) { aiAnswer(); }
      renderHud();
      if (locked.a && locked.b) { resolveBeat(); return; }
      refuse(t("twrWaiting", { x: nameFor(side), y: nameFor(side === "a" ? "b" : "a") }));
    }

    /* Taking back needs an open beat: once both orders are in, the beat has
     * already settled and there is nothing left to unsay. */
    function takeBack(side) {
      if (!gate(side)) { return; }
      if (!pick[side] && !locked[side]) { return; }
      locked[side] = false;
      pick[side] = "";
      result.textContent = t("twrTakenBack");
      renderHud();
    }

    function resolveBeat() {
      if (phase !== "pick") { return; }
      clearBeat();
      var orderA = twrLegal(pick.a || "brace");
      var orderB = twrLegal(pick.b || "brace");
      var res = twrExchange(mat, orderA, orderB);
      mat = res;
      beats += 1;
      if (solo) { history.push(orderA); }
      phase = "read";
      beatClock = 0;
      shownTicks = -1;
      shownWindow = "";
      lastStamp = nowMs();
      /* The call names the exchange in words; the status line carries the
       * numbers, so nothing about the mat is left implicit. */
      callEl.textContent = t(twrWordKeys[res.word] || "twrWNothing", { x: nameFor("a"), y: nameFor("b") });
      result.textContent = t("twrFootNow", {
        x: nameFor("a"), fx: Math.min(twrMaxFoot, footShown("a")), maxF: twrMaxFoot,
        y: nameFor("b"), fy: Math.min(twrMaxFoot, footShown("b")),
        g: gapWord(res.gap), gn: twrClamp(res.gap, 0, 4),
        b1: twrClamp(res.a.balance, 0, twrMaxBalance),
        b2: twrClamp(res.b.balance, 0, twrMaxBalance),
        max: twrMaxBalance,
      });
      /* The inactivity count is said out loud before it costs anybody a point. */
      if (res.stall >= 2 && !res.a.fell && !res.b.fell) {
        result.textContent += " " + t("twrStallWarn", { n: twrStallLimit - res.stall });
      }
      renderHud();
      if (res.a.fell || res.b.fell || beats >= twrBeatCap) { finish(res); return; }
      armBackstop();
    }

    function finish(res) {
      phase = "over";
      clearBeat();
      var aDown = !!res.a.fell;
      var bDown = !!res.b.fell;
      var blue = nameFor("a");
      var red = nameFor("b");
      var stale = beats >= twrBeatCap && !aDown && !bDown;
      var message;
      if (!solo) {
        /* Two-player bouts settle on the mat and nowhere else: no stars, and
         * the result line says so. */
        if (bDown && !aDown) { message = t("twrDuoWin", { win: red, lose: blue, n: beats }); }
        else if (aDown && !bDown) { message = t("twrDuoWin", { win: blue, lose: red, n: beats }); }
        else { message = t(stale ? "twrDuoStale" : "twrDuoDraw", { n: beats }); }
        result.textContent = result.textContent + " " + message;
        renderHud();
        return;
      }
      if (bDown && !aDown) {
        var starsWon = Math.max(1, starsFor(beats, rank.starBeats, "low"));
        var outcome = campaign.record(rank.id, { stars: starsWon, best: beats, better: "low" });
        message = t(res.b.fell === "tipped" ? "twrWinTipped" : "twrWinOut", {
          win: blue, lose: red, n: beats, s: starsWon,
        });
        if (outcome.isBest) { message += " " + t("newBest"); }
        if (outcome.unlockedNext) {
          message += " " + t("twrRankNext", { label: t(twrRanks[campaign.indexOf(outcome.unlockedNext)].labelKey) });
        } else if (campaign.clearedCount() === twrRanks.length) {
          message += " " + t("twrLadderDone");
        }
        logAction(t("twrLog", { name: red, n: beats }));
        var rect = boutBtn.getBoundingClientRect();
        createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
        petNotifyGame(outcome.isBest || outcome.firstClear);
      } else if (aDown && !bDown) {
        message = t(res.a.fell === "tipped" ? "twrLoseTipped" : "twrLoseOut", { win: red, lose: blue, n: beats });
        petNotifyGame(false);
      } else {
        message = t(stale ? "twrStale" : "twrDraw", { n: beats });
      }
      refreshPicker();
      result.textContent = result.textContent + " " + message;
      renderHud();
    }

    /* Restarting is always allowed, mid-beat included: the whole bout is reset
     * and the ladder record that was already earned stays earned. */
    function loadMatch(level) {
      clearBeat();
      rank = level || rank;
      mat = twrStartMat();
      history = [];
      beats = 0;
      lastTouched = "a";
      aiLocked = false;
      frozen = false;
      callEl.textContent = t("twrCallWait");
      startBeat();
      refreshPicker();
      result.textContent = solo
        ? t("twrPrompt", { name: t(rank.labelKey), x: nameFor("a"), y: nameFor("b") })
        : t("twrDuoPrompt", { x: nameFor("a"), y: nameFor("b") });
      keysAlias.textContent = t(solo ? "twrKeysArrowsSolo" : "twrKeysArrowsDuo");
      renderHud();
      ensureLoop();
    }

    /* --- input: one key listener, on the panel ---------------------- */
    /* The focusable arena bubbles its keys up, so a single press is read
     * exactly once - never locked twice, never settled over the line the player
     * is meant to be reading. */
    panelEl.addEventListener("keydown", function (event) { onKey(event); });
    panelEl.addEventListener("pointerdown", function () { touch(); });

    function cluster(map, key) {
      var value = Object.prototype.hasOwnProperty.call(map, key) ? map[key] : null;
      return typeof value === "string" ? value : null;
    }
    function onKey(event) {
      if (!event || typeof event.key !== "string") { return; }
      var key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      var fromButton = !!(event.target && event.target.tagName === "BUTTON");
      /* A focused button takes Space and Enter through its own click. */
      if (key === " " || key === "Enter") {
        if (fromButton) { return; }
        event.preventDefault();
        if (solo) { lockOrder("a"); return; }
        lockOrder(key === " " ? "a" : "b");
        return;
      }
      if (key === "Escape") {
        event.preventDefault();
        takeBack(solo ? "a" : lastTouched);
        return;
      }
      if (key === "p") {
        event.preventDefault();
        takeBack(solo ? "a" : "b");
        return;
      }
      if (key === "Tab" || key === "ArrowUp") { return; }
      /* Arrows and the right-hand cluster belong to the seat the mode leaves to
       * a human: Red in a duo bout, nobody but Cyan in a solo one. */
      var side = solo ? "a" : "b";
      var order = cluster(twrKeysBlue, key);
      if (order) { side = "a"; }
      else { order = cluster(twrKeysRed, key); }
      if (!order && key === "ArrowLeft") { order = solo ? "circle" : "stepin"; }
      else if (!order && key === "ArrowRight") { order = solo ? "stepin" : "circle"; }
      else if (!order && key === "ArrowDown") { order = "brace"; }
      if (!order) { return; }
      event.preventDefault();
      choose(side, order);
    }

    modeSel.addEventListener("change", function () {
      solo = modeSel.value !== "duo";
      modeSel.value = solo ? "solo" : "duo";
      loadMatch(rank);
    });

    rankSel.addEventListener("change", function () {
      var index = campaign.indexOf(rankSel.value);
      if (index < 0) { rankSel.value = rank.id; return; }
      if (!solo) {
        rankSel.value = rank.id;
        refuse(t("twrSoloOnly"));
        return;
      }
      if (!campaign.isUnlocked(rankSel.value)) {
        rankSel.value = rank.id;
        refuse(t("twrLockedRankMsg", { label: t(twrRanks[index].labelKey) }));
        return;
      }
      loadMatch(twrRanks[index]);
    });

    /* Shell pause: stop the beat, keep the bout exactly as it stands. */
    App.quietResetTinyWrestlers = function () {
      if (phase === "pick" || phase === "read") {
        result.textContent = t("twrPaused");
      }
      frozen = true;
      clearBeat();
      if (rafId !== null) {
        var pending = rafId;
        rafId = null;
        window.cancelAnimationFrame(pending);
      }
      shownTicks = -1;
      shownWindow = "";
    };

    loadMatch(rank);
  }

  /* Bilingual copy travels with the game: addStrings only fills keys i18n.js
   * does not already own, so the shared dictionary stays authoritative. */
  App.addStrings({
    en: {
      "tabTinyWrestlers": "Tiny Wrestlers",
      "twrR1": "Rookie", "twrR2": "Slick", "twrR3": "Iron Arm", "twrR4": "Bulldog", "twrR5": "Champion",
      "twrR6": "Ring Lord", "twrR7": "Shadow Grip", "twrR8": "Iron Wall", "twrR9": "Grand Master", "twrR10": "Legend",
      "twrBlueLabel": "Cyan", "twrRedLabel": "Red",
      "twrBeatLabel": "Exchange", "twrSpaceLabel": "Space", "twrLockLabel": "Locks", "twrWindowLabel": "Window",
      "twrModeSelectLabel": "Bout mode", "twrModeSolo": "Solo bout - you against the machine",
      "twrModeDuo": "Two wrestlers - one keyboard", "twrRankSelectLabel": "Ladder rank",
      "twrBtnLock": "Lock Order", "twrBtnTake": "Take Back", "twrBtnBout": "New Bout",
      "twrOrdFeint": "Feint", "twrOrdGrab": "Grab", "twrOrdShove": "Shove",
      "twrOrdCircle": "Circle back", "twrOrdBrace": "Brace", "twrOrdStep": "Step in",
      "twrGapClinch": "clinch", "twrGapReach": "reach", "twrGapLong": "long", "twrGapApart": "apart",
      "twrBalanceStat": "{v}/{max} balance", "twrBeatStat": "beat {n}",
      "twrSpaceStat": "{word} - space {n}", "twrWindowStat": "{s}s left - window {n}/{max}",
      "twrWindowSettle": "settling the beat", "twrWindowOver": "bout over",
      "twrLockedWord": "locked", "twrChoosingWord": "choosing",
      "twrMachineChoosing": "machine choosing", "twrMachineLocked": "machine locked",
      "twrHiddenSet": "order hidden", "twrPickNone": "no order yet", "twrPadState": "{o} - {s}",
      "twrPadBlue": "Cyan orders", "twrPadRed": "Red orders",
      "twrSideState": "balance {b}/{max}, rim step {f}/{maxF}",       "twrExposedState": "exposed {n} beats",
      "twrSteadyState": "steady", "twrOutState": "out of the ring", "twrFallTipped": "tipped over",
      "twrNoteForced": "exposed, so the brace was forced",
      "twrNoteStepped": "stepped back over the rim on their own", "twrRimWord": "rim",
      "twrArenaLabel": "The mat: Cyan on the left, Red on the right, the numbered space between them, and the rim at each end.",
      "twrKeysBlueLine": "Cyan: Q feint, W grab, E shove, A circle back, S brace, D step in, Space locks, Escape takes back.",
      "twrKeysRedLine": "Red: U feint, I grab, O shove, J circle back, K brace, L step in, Enter locks, P takes back.",
      "twrKeysArrowsSolo": "Solo bout: either cluster drives Cyan, and the arrows follow the mat - Left circles back, Right steps in, Down braces.",
      "twrKeysArrowsDuo": "Duo bout: the arrows belong to Red (Left steps in, Right circles back, Down braces) so the two clusters never fight over one key.",
      "twrCallWait": "No beat yet - both wrestlers stand even, one step off the centre line.",
      "twrPrompt": "{x} and {y} circle the mat. Each beat you both give one order at the same time, and the beat settles once both are locked. Climb the ladder as {name}.",
      "twrDuoPrompt": "Duo bout: {x} on the left keys, {y} on the right. Orders stay hidden until both are locked, and two-player bouts record no ladder stars.",
      "twrBeatOpen": "Beat {n}: give an order and lock it - the window is {s}s.",
      "twrWaiting": "{x} is locked. {y} still has to choose.",
      "twrTakenBack": "Order cleared - pick again before the window closes.",
      "twrAlreadyLocked": "{x} already locked this beat.",
      "twrRedPadHidden": "{x} is the machine in a solo bout - use the Cyan cluster.",
      "twrExposedBlock": "Exposed {n} beats: only the brace is legal until you are steady.",
      "twrOver": "The bout is over - press New Bout to circle again.",
      "twrPaused": "Bout paused with the score kept. Press an order key to resume.",
      "twrSoloOnly": "The ladder is solo only - switch the bout mode back to Solo to climb ranks.",
      "twrLockedRankMsg": "Rank {label} is still locked: clear the rank before it first.",
      "twrFootNow": "{x} balance {b1}/{max} on rim step {fx}/{maxF}, {y} balance {b2}/{max} on step {fy}/{maxF}, space {g} ({gn}).",
      "twrStallWarn": "Inactivity count {n}: the referee will dock both wrestlers.",
      "twrWGrab": "{x} gets the grab and drags {y} off the centre line: balance -2, pulled in, exposed 2 beats.",
      "twrWShove": "{x} gets the shove and walks {y} toward the rim: balance -2, one step closer to the edge, exposed 1 beat.",
      "twrWFeintWorks": "{x} feints, {y} bites and grabs empty air: balance -2 and exposed 2 beats for {y}.",
      "twrWFlinch": "{x} sells the fake and {y} flinches back: balance -1, exposed 1 beat.",
      "twrWStumble": "{x} reaches for nothing and stumbles into the space: balance -1, exposed 1 beat.",
      "twrWBothStumble": "Both reach from too far off and both stumble: balance -1 and exposed 1 beat each.",
      "twrWSlipped": "{y} circles out of reach and {x} swings at air: balance -1 and exposed 1 beat for {x}.",
      "twrWBlocked": "{y} braces and {x}'s grab slides off the hold: balance -1, exposed 1 beat for {x}.",
      "twrWShoveBrace": "{y} braces low and eats the shove: balance -1 and one step toward the rim, but no exposure.",
      "twrWNothing": "{x} fakes at a braced {y} and nothing lands - {y} steadies.",
      "twrWClashGrab": "Both go for the same hold and lock up: balance -1 each.",
      "twrWClashShove": "Two shoves meet head-on: balance -1 each and both slide a step back.",
      "twrWClashFeint": "Both feint, nobody commits, and the circling starts again.",
      "twrWMove": "Both keep their feet: the space changes and nothing is thrown.",
      "twrWBreather": "Both brace and breathe: one point of balance back each.",
      "twrWDocked": "Four beats without a hold landed and the referee docks them both: balance -1 each.",
      "twrWinOut": "{lose} is out of the ring after {n} beats - {win} takes the bout and {s} stars.",
      "twrWinTipped": "{win} tips {lose} over in {n} beats - {s} stars.",
      "twrLoseOut": "{lose} ends up out of the ring after {n} beats. No stars added - never back off from your own rim.",
      "twrLoseTipped": "{win} takes {lose}'s balance away in {n} beats. No stars added - bait the grab, then brace.",
      "twrDraw": "Both wrestlers go down in the same beat ({n}) - a draw, and no stars added.",
      "twrStale": "{n} beats and neither wrestler falls: the referee calls it a draw.",
      "twrDuoWin": "{win} wins the bout in {n} beats - two-player bouts record no ladder stars, so nothing is added to the campaign.",
      "twrDuoDraw": "Both wrestlers are down at beat {n} and the bout is a draw - two-player bouts record no ladder stars.",
      "twrDuoStale": "The referee stops a {n}-beat draw - two-player bouts record no ladder stars.",
      "twrRankNext": "Rank {label} is unlocked - choose it above.",
      "twrLadderDone": "Every rank is cleared - the mat belongs to you.",
      "twrLog": "Threw {name} out of the ring in {n} beats",
      "twrHint": "Circle back and a grab reaches nothing - but the next step back after the rim is the floor.",
    },
    zh: {
      "tabTinyWrestlers": "小小摔跤手",       "twrR1": "新手", "twrR2": "滑头", "twrR3": "铁臂", "twrR4": "蛮牛", "twrR5": "冠军",
      "twrR6": "擂台王", "twrR7": "暗手", "twrR8": "铁壁", "twrR9": "宗师", "twrR10": "传奇",
      "twrBlueLabel": "青角", "twrRedLabel": "红角",
      "twrBeatLabel": "回合", "twrSpaceLabel": "距离", "twrLockLabel": "锁定", "twrWindowLabel": "窗口",
      "twrModeSelectLabel": "赛制", "twrModeSolo": "单人——对阵机器", "twrModeDuo": "双人——共用一块键盘",
      "twrRankSelectLabel": "段位阶梯",       "twrBtnLock": "锁定招式", "twrBtnTake": "收回招式", "twrBtnBout": "新的对决",
      "twrOrdFeint": "假动作", "twrOrdGrab": "抓把", "twrOrdShove": "推",
      "twrOrdCircle": "绕退", "twrOrdBrace": "站稳", "twrOrdStep": "上步",
      "twrGapClinch": "贴身", "twrGapReach": "够手", "twrGapLong": "稍远", "twrGapApart": "拉开",
      "twrBalanceStat": "平衡 {v}/{max}", "twrBeatStat": "第 {n} 拍",
      "twrSpaceStat": "{word}·距离 {n}", "twrWindowStat": "余 {s} 秒·窗口 {n}/{max}",
      "twrWindowSettle": "判定这一拍", "twrWindowOver": "对决已结束",       "twrLockedWord": "已锁定", "twrChoosingWord": "出招中",
      "twrMachineChoosing": "机器出招中", "twrMachineLocked": "机器已锁定",
      "twrHiddenSet": "招式已藏好", "twrPickNone": "还没选招", "twrPadState": "{o}·{s}",
      "twrPadBlue": "青角招式", "twrPadRed": "红角招式", "twrSideState": "平衡 {b}/{max}·边线第 {f}/{maxF} 步",
      "twrExposedState": "破绽 {n} 拍",       "twrSteadyState": "站稳", "twrOutState": "跌出擂台", "twrFallTipped": "被掀翻",
      "twrNoteForced": "有破绽，只能站稳", "twrNoteStepped": "自己退过边线出了擂台", "twrRimWord": "边线",
      "twrArenaLabel": "擂台：青角在左、红角在右，中间的数字是两人距离，两端是边线。",
      "twrKeysBlueLine": "青角：Q 假动作、W 抓把、E 推、A 绕退、S 站稳、D 上步、空格锁定、Esc 收回。",
      "twrKeysRedLine": "红角：U 假动作、I 抓把、O 推、J 绕退、K 站稳、L 上步、回车锁定、P 收回。",
      "twrKeysArrowsSolo": "单人对局：两块按键都能驱动青角，方向键跟着擂台走——左绕退、右上步、下站稳。",
      "twrKeysArrowsDuo": "双人对局：方向键归红角（左=上步、右=绕退、下=站稳），两块按键不会抢同一个键。",       "twrCallWait": "还没开打——两人各站中线外一步，形势持平。",
      "twrPrompt": "{x}与{y}绕着擂台转圈。每一拍双方同时下一道命令，两道都锁定后这一拍才判定。用「{name}」段位往上爬。",
      "twrDuoPrompt": "双人对局：{x}用左边那组键，{y}用右边那组。招式在双方锁定前都不显示，双人对局不计段位星级。",
      "twrBeatOpen": "第 {n} 拍：选好并锁定——窗口 {s} 秒。", "twrWaiting": "{x}已锁定，{y}还在选招。",
      "twrTakenBack": "已收回招式——窗口关之前在选一次。", "twrAlreadyLocked": "{x}这一拍已经锁定了。",
      "twrRedPadHidden": "单人对局里{x}由机器掌控——请用青角那组键。", "twrExposedBlock": "破绽 {n} 拍：站稳之前不许出别的招。",
      "twrOver": "这一局已经结束——按「新的对决」再开战。", "twrPaused": "已暂停，比分原样保留。按任意招式键继续。",
      "twrSoloOnly": "段位阶梯只算单人——把赛制换回单人才能升级。", "twrLockedRankMsg": "「{label}」还没解锁：先打赢它前面的段位。",
      "twrFootNow": "{x}平衡 {b1}/{max}、边线第 {fx}/{maxF} 步；{y}平衡 {b2}/{max}、第 {fy}/{maxF} 步；距离 {g}（{gn}）。",
      "twrStallWarn": "倒计数 {n}：裁判要各扣一分平衡了。",       "twrWGrab": "{x}抓把成功，把{y}从中线拽偏：平衡 -2、被拉近、破绽 2 拍。",
      "twrWShove": "{x}一推把{y}送向边线：平衡 -2、离边线近一步、破绽 1 拍。",       "twrWFeintWorks": "{x}一个假动作，{y}上当抓空：{y}平衡 -2、破绽 2 拍。",
      "twrWFlinch": "{x}骗得{y}后缩：{y}平衡 -1、破绽 1 拍。", "twrWStumble": "{x}伸手抓了个空，踉跄一步：平衡 -1、破绽 1 拍。",
      "twrWBothStumble": "两人都伸得太远，各自踉跄：平衡 -1、破绽 1 拍。",       "twrWSlipped": "{y}绕出掌外，{x}扑了个空：{x}平衡 -1、破绽 1 拍。",
      "twrWBlocked": "{y}站稳护住把位，{x}的抓把滑开：{x}平衡 -1、破绽 1 拍。",       "twrWShoveBrace": "{y}沉身挨下这一推：平衡 -1、退向边线一步，但没有破绽。",
      "twrWNothing": "{x}对着站稳的{y}虚晃一下，什么都没发生——{y}调匀了呼吸。", "twrWClashGrab": "两人抢同一个把位，锁死了：各扣平衡 1。",
      "twrWClashShove": "两记推撞迎上：各扣平衡 1，各退一步。", "twrWClashFeint": "两边都在虚晃，谁都没真上手，绕圈继续。",
      "twrWMove": "两人都顾脚下：距离变了，谁也没被摔出去。", "twrWBreather": "两人都站稳喘口气：各回一点平衡。",       "twrWDocked": "四拍没人真上手，裁判各扣一分平衡。",
      "twrWinOut": "{n} 拍后{lose}出了擂台——{win}赢下这一局，获得 {s} 星。",       "twrWinTipped": "{win}在第 {n} 拍掀翻{lose}——获得 {s} 星。",
      "twrLoseOut": "{n} 拍后{lose}出圈。这一局不加星——别总往自己的边线上退。",
      "twrLoseTipped": "{win}用 {n} 拍掏空了{lose}的平衡。这一局不加星——先骗抓把，再站稳。",
      "twrDraw": "两人在同一拍（第 {n} 拍）双双倒地——判平局，不加星。", "twrStale": "{n} 拍过去谁都没倒，裁判判平局。",
      "twrDuoWin": "{win}在第 {n} 拍赢下这一局——双人对局不计段位星级，阶梯记录保持不变。",       "twrDuoDraw": "第 {n} 拍两人同时倒地，判平局——双人对局不计段位星级。",
      "twrDuoStale": "裁判在第 {n} 拍判了平局——双人对局不计段位星级。", "twrRankNext": "已解锁「{label}」——在上面选它。",
      "twrLadderDone": "十个段位全部通关——这块擂台归你了。", "twrLog": "用 {n} 拍把{name}推出擂台",
      "twrHint": "绕退能让对方的抓把扑空——可边线之后再退一步，就是擂台外了。",
    },
  });

  App.registerGame({
    name: "tinyWrestlers",
    tabKey: "tabTinyWrestlers",
    init: initTinyWrestlersGame,
    guide: {
      svg:
        '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="4" y="10" width="112" height="56" rx="10" fill="none" stroke="rgba(148,163,184,.5)" stroke-width="2"/>' +
        '<path d="M60 14v48" stroke="rgba(148,163,184,.25)" stroke-dasharray="3 3"/>' +
        '<circle cx="44" cy="38" r="9" fill="#00f2ff"/><circle cx="76" cy="38" r="9" fill="#ff6b35"/>' +
        '<path d="M53 38h14" stroke="#a3e635" stroke-width="2"/>' +
        '<text x="60" y="27" font-size="9" fill="#a3e635" text-anchor="middle">space 2</text>' +
        '<text x="44" y="58" font-size="8" fill="#00f2ff" text-anchor="middle">4/6</text>' +
        '<text x="76" y="58" font-size="8" fill="#ff6b35" text-anchor="middle">2/6</text>' +
        '<path d="M96 20l9 6-9 6" fill="none" stroke="#ff8a80" stroke-width="2"/></svg>',
      en: [
        "Aim: throw your opponent over the rim or take their balance to zero before you fall - one beat, one order each.",
        "Orders: feint, grab and shove are the attacks; circle back, brace and step in are the supports, and a grab that misses leaves you exposed.",
        "Position: each wrestler counts rim steps 0 to 2, so the space between them is that pair added up - 2 is reach, 4 is apart.",
        "Keys: Cyan drives Q W E and A S D and locks with Space; Red drives U I O and J K L and locks with Enter.",
        "Watch out: while you are exposed for 2 beats only the brace is legal, circling from step 2 puts you out of the ring, and four landless beats cost you both a point.",
        "Scoring: solo bouts award stars for fewer beats and unlock the next of ten ranks; two-player bouts never touch the ladder.",
      ],
      zh: [
        "目标：把对手推出边线，或把他的平衡清零，别让自己先倒——一拍各下一道命令。",
        "招式：假动作、抓把、推是攻击；绕退、站稳、上步是步法。抓把落空就会露出破绽。",
        "位置：每人从 0 数到 2 步边线，两人距离就是这两个数相加——2 是够手，4 是拉开。",
        "按键：青角用 Q W E 与 A S D，空格锁定；红角用 U I O 与 J K L，回车锁定。",
        "小心：破绽 2 拍期间只能站稳；已在第 2 步再绕退就是走出擂台；连续四拍没人得手，裁判会给双方各扣一分。",
        "计分：单人对局用更少拍数换星，并解锁十个段位里的下一个；双人对局完全不碰段位阶梯。",
      ],
    },
  });

  /* Exported for the other modules. */
  App.initTinyWrestlersGame = initTinyWrestlersGame;
})(window.CapitalConvert = window.CapitalConvert || {});
