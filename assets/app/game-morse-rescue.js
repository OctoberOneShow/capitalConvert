/* Morse Rescue - the communication/decoding mini-game in the shared game drawer.
 * A stranded crew taps out its rescue coordinate in dots and dashes; noise eats
 * parts of the signal and the player spends scarce battery to replay groups,
 * or infers the rest from what still fits. Every clue the audio carries is also
 * printed, so the game is fully playable in silence. Registered through the
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

  /* The table holds only the characters the ten missions deal, so the legend
   * fits without scrolling and nobody needs prior Morse knowledge. */
  var mrsTable = {
    "E": ".", "T": "-", "I": "..", "A": ".-", "N": "-.", "M": "--",
    "S": "...", "U": "..-", "R": ".-.", "W": ".--", "K": "-.-", "D": "-..",
    "O": "---", "1": ".----", "2": "..---", "3": "...--", "4": "....-",
    "5": ".....", "6": "-....", "7": "--...", "8": "---..", "9": "----.", "0": "-----"
  };
  var mrsByCode = {};
  Object.keys(mrsTable).forEach(function (ch) {
    mrsByCode[mrsTable[ch]] = ch;
  });

  var mrsUnit = 0.16;
  var mrsVoid = "?";
  /* One replayed group is worth three tries, because battery is the scarce
   * resource the design doc puts first in the star metric. */
  var mrsBatteryWeight = 3;

  /* Mission table: groups = coordinate length, noise = groups the static
   * damages, deducible = damaged groups that must stay solvable by pure
   * inference, drain = window seconds a replay burns.
   * The star bands are read off the morseSolve line rather than guessed: a
   * mission whose groups all deduce costs 1, one bought with a single replay
   * costs mrsBatteryWeight + 1, and the floor band is the worst still winnable
   * line - every spendable replay (min(battery, noise), since only a noisy
   * group can burn battery) plus every send. Lists rise, because the metric is
   * scored "low".
   * Where full deduction is a lottery at the mission's noise and vocabulary
   * (m8 measured 0.4% of deals, m10 0.3%), the top band instead reads "deduce
   * everything, or deduce all but one and buy the last group" (m8 8.5%, m10
   * 3.8% of broadcasts): still hard, but a line a real player can hit. The
   * harness case walks each mission's real deal stream and holds every top
   * band above a 2% floor.
   * The ladder is ordered by that same measurement: par, the worst cost the
   * static can force, and the ceiling never falls as the list goes down, while
   * the window seconds per group only shrink. */
  var mrsLevels = [
    { id: "m1", labelKey: "mrsL1", vocab: ["E", "T", "I", "A", "N", "M"], groups: 3, noise: 0, deducible: 0,
      battery: 1, attempts: 3, window: 75, drain: 0, unit: 1.25, seed: 101, starCost: [1, 2, 3] },
    { id: "m2", labelKey: "mrsL2", vocab: ["1", "2", "3", "6", "7", "8"], groups: 3, noise: 0, deducible: 0,
      battery: 1, attempts: 3, window: 75, drain: 0, unit: 1.1, seed: 202, starCost: [1, 2, 3] },
    { id: "m3", labelKey: "mrsL3", vocab: ["S", "U", "R", "W", "K", "D", "N"], groups: 3, noise: 1, deducible: 0,
      battery: 1, attempts: 3, window: 65, drain: 3, unit: 1, seed: 303, starCost: [1, 4, 6] },
    { id: "m4", labelKey: "mrsL4", vocab: ["E", "T", "A", "R", "S", "O", "4", "5", "7"], groups: 4, noise: 2, deducible: 1,
      battery: 2, attempts: 4, window: 70, drain: 3, unit: 1, seed: 404, starCost: [1, 4, 10] },
    { id: "m5", labelKey: "mrsL5", vocab: ["S", "O", "E", "T", "4", "5", "6", "7"], groups: 4, noise: 2, deducible: 1,
      battery: 2, attempts: 4, window: 45, drain: 6, unit: 0.9, seed: 505, starCost: [1, 4, 10] },
    { id: "m6", labelKey: "mrsL6", vocab: ["S", "O", "E", "T", "4", "5", "7", "N", "M", "I"], groups: 5, noise: 3, deducible: 1,
      battery: 2, attempts: 4, window: 55, drain: 6, unit: 0.9, seed: 606, starCost: [1, 4, 10] },
    { id: "m7", labelKey: "mrsL7", vocab: ["E", "T", "A", "R", "S", "O", "4", "5", "7", "N", "M", "I"], groups: 5, noise: 3, deducible: 0,
      battery: 3, attempts: 5, window: 50, drain: 7, unit: 0.85, seed: 707, starCost: [1, 4, 14] },
    { id: "m8", labelKey: "mrsL8", vocab: ["A", "N", "M", "S", "U", "R", "W", "K", "D", "O"], groups: 6, noise: 3, deducible: 0,
      battery: 3, attempts: 5, window: 55, drain: 7, unit: 0.85, seed: 808, starCost: [4, 7, 14] },
    { id: "m9", labelKey: "mrsL9", vocab: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"], groups: 6, noise: 4, deducible: 0,
      battery: 4, attempts: 6, window: 54, drain: 7, unit: 0.8, seed: 909, starCost: [1, 4, 18] },
    { id: "m10", labelKey: "mrsL10", vocab: ["S", "U", "R", "W", "K", "D", "O", "M", "A"], groups: 6, noise: 4, deducible: 0,
      battery: 4, attempts: 6, window: 50, drain: 7, unit: 0.8, seed: 1010, starCost: [4, 10, 18] }
  ];

  /* --- pure core, exported for the harness ---------------------------------
   * A 32-bit LCG: the same seed always corrupts the same way, so a mission the
   * player resumes after a reload is byte-identical to the one they left. */
  function mrsLcg(seed) {
    var state = Math.floor(Number(seed));
    if (!isFinite(state)) {
      state = 1;
    }
    state = (Math.abs(state) % 2147483646) + 1;
    return function () {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    };
  }

  function morseEncode(text) {
    var src = text == null ? "" : String(text).toUpperCase();
    var codes = [];
    for (var i = 0; i < src.length; i += 1) {
      var code = mrsTable[src.charAt(i)];
      if (code) {
        codes.push(code);
      }
    }
    return codes;
  }

  /* Decode answers with "?" for anything the table does not hold, never with
   * undefined, so a corrupted group cannot poison a readback. */
  function morseDecode(groups) {
    var list = typeof groups === "string" ? groups.split(" ") : groups || [];
    var out = [];
    for (var i = 0; i < list.length; i += 1) {
      var code = list[i] == null ? "" : String(list[i]);
      out.push(mrsByCode[code] || mrsVoid);
    }
    return out;
  }

  function mrsFits(pattern, code) {
    if (!pattern || !code || pattern.length !== code.length) {
      return false;
    }
    for (var i = 0; i < code.length; i += 1) {
      var seen = pattern.charAt(i);
      if (seen !== mrsVoid && seen !== code.charAt(i)) {
        return false;
      }
    }
    return true;
  }

  function mrsCandidates(pattern, vocab) {
    var list = vocab || Object.keys(mrsTable);
    return list.filter(function (ch) {
      return mrsFits(pattern, mrsTable[ch]);
    });
  }

  /* Deterministic static: pick the requested number of groups, then open one or
   * two element holes in each. Holes are printed as "?" - the element arrived
   * corrupted, so the player knows the shape of the group but not that one mark. */
  function morseNoise(message, seed, count) {
    var codes = typeof message === "string" ? morseEncode(message) : (message || []).slice();
    var damaged = Math.max(0, Math.floor(Number(count) || 0));
    var rand = mrsLcg(seed);
    var order = [];
    for (var i = 0; i < codes.length; i += 1) {
      order.push(i);
    }
    for (var j = order.length - 1; j > 0; j -= 1) {
      var k = Math.floor(rand() * (j + 1));
      var swap = order[j];
      order[j] = order[k];
      order[k] = swap;
    }
    order.slice(0, Math.min(damaged, order.length)).forEach(function (index) {
      var chars = String(codes[index]).split("");
      /* One hole keeps inference alive; a second is only worth opening on a
       * group long enough to still say something about its shape. */
      var want = chars.length >= 4 && rand() < 0.34 ? 2 : 1;
      var guard = 0;
      while (want > 0 && guard < 20) {
        guard += 1;
        var pos = Math.floor(rand() * chars.length);
        if (chars[pos] === mrsVoid) {
          continue;
        }
        chars[pos] = mrsVoid;
        want -= 1;
      }
      codes[index] = chars.join("");
    });
    return codes;
  }

  /* The best line through a mission: everything uniquely resolvable is deduced
   * for free, each ambiguous group costs one battery unit, and the coordinate
   * is submitted once. Returns null when the mission cannot be won. */
  function morseSolve(mission) {
    if (!mission || !mission.received || !mission.answer) {
      return null;
    }
    if (mission.received.length !== String(mission.answer).length) {
      return null;
    }
    var vocab = mission.vocab || [];
    var need = 0;
    var deduced = 0;
    var options = [];
    for (var i = 0; i < mission.received.length; i += 1) {
      var pattern = String(mission.received[i]);
      var fits = mrsCandidates(pattern, vocab);
      if (!fits.length) {
        return null;
      }
      options.push(fits);
      if (fits.length > 1) {
        need += 1;
      } else if (pattern.indexOf(mrsVoid) !== -1) {
        deduced += 1;
      }
    }
    if (need > Math.max(0, Number(mission.battery) || 0)) {
      return null;
    }
    if (deduced < (Number(mission.deducible) || 0)) {
      return null;
    }
    var cost = need * mrsBatteryWeight + 1;
    return {
      batterySpent: need,
      attempts: 1,
      deduced: deduced,
      cost: cost,
      stars: starsFor(cost, mission.starCost || [], "low"),
      options: options
    };
  }

  function morseSolvable(mission) {
    return morseSolve(mission) !== null;
  }

  /* A mission is the crew's coordinate plus what actually reached the set. */
  function mrsDeal(level, index) {
    var seed = (Number(level.seed) || 1) + Math.max(0, Math.floor(Number(index))) * 977;
    var rand = mrsLcg(seed + 7);
    var vocab = level.vocab || [];
    var letters = [];
    var wanted = Math.max(1, Math.floor(Number(level.groups)) || 1);
    for (var i = 0; i < wanted; i += 1) {
      letters.push(vocab[Math.floor(rand() * vocab.length)] || vocab[0]);
    }
    var answer = letters.join("");
    var codes = morseEncode(answer);
    return {
      levelId: level.id,
      vocab: vocab.slice(),
      answer: answer,
      codes: codes,
      received: morseNoise(codes, seed, level.noise),
      battery: level.battery,
      attempts: level.attempts,
      deducible: level.deducible,
      starCost: level.starCost,
      index: Math.max(0, Math.floor(Number(index))),
      seed: seed
    };
  }

  /* Deal until the corrupted message is proven winnable, then hand back the
   * cursor so the next broadcast is a different one. */
  function mrsDealSolvable(level, cursor) {
    var at = Math.max(0, Math.floor(Number(cursor)));
    for (var step = 0; step < 96; step += 1) {
      var mission = mrsDeal(level, at + step);
      if (morseSolvable(mission)) {
        return { mission: mission, next: at + step + 1 };
      }
    }
    return { mission: mrsDeal(level, at), next: at + 1 };
  }

  function initMorseRescueGame(panelEl) {
    if (!panelEl) {
      return;
    }

    var campaign = createCampaign({ key: "morse-rescue-campaign", levels: mrsLevels });
    var level = mrsLevels[campaign.indexOf(campaign.nextLevelId())] || mrsLevels[0];
    var cursors = {};
    var mission = mrsDealSolvable(level, 0).mission;
    var slots = [];
    var slotAt = 0;
    var groupAt = 0;
    var batteryLeft = level.battery;
    var triesUsed = 0;
    var msLeft = level.window * 1000;
    var armed = false;
    var verdict = null;
    var over = "";
    var unitSec = mrsUnit * (Number(level.unit) || 1);
    var play = null;
    var rafId = null;
    var loopOn = false;
    var lastNow = 0;
    var audio = null;
    var nodes = [];
    var soundOn = true;

    /* --- markup: built with createElement so the headless harness sees it --- */
    var hud = mrsNode("div", "game-hud");
    var windowEl = mrsNode("strong");
    var batteryEl = mrsNode("strong");
    var tryEl = mrsNode("strong");
    var crewEl = mrsNode("strong");
    [
      ["mrsWindowLabel", windowEl], ["mrsBatteryLabel", batteryEl],
      ["mrsTryLabel", tryEl], ["mrsCrewLabel", crewEl],
    ].forEach(function (pair) {
      hud.appendChild(mrsStat(pair[0], pair[1]));
    });

    var stage = mrsNode("div", "mrs-stage");
    stage.setAttribute("tabindex", "0");
    stage.setAttribute("role", "application");
    stage.setAttribute("aria-label", t("mrsStageLabel"));

    var lamp = mrsNode("div", "mrs-lamp");
    lamp.setAttribute("aria-hidden", "true");
    var lampText = mrsNode("span", "mrs-lamp-text", t("mrsIdle"));
    var lampRow = mrsNode("div", "mrs-row mrs-row-lamp");
    lampRow.appendChild(lamp);
    lampRow.appendChild(lampText);

    var meterFill = mrsNode("span", "mrs-meter-fill");
    var meter = mrsNode("div", "mrs-meter");
    meter.setAttribute("role", "img");
    meter.appendChild(meterFill);

    var strip = mrsNode("div", "mrs-strip");
    strip.setAttribute("role", "group");
    strip.setAttribute("aria-label", t("mrsStripLabel"));
    var slotsRow = mrsNode("div", "mrs-slots");
    slotsRow.setAttribute("role", "group");
    slotsRow.setAttribute("aria-label", t("mrsAnswerLabel"));
    var reading = mrsNode("p", "mrs-reading");
    reading.setAttribute("aria-live", "polite");
    var legend = mrsNode("div", "mrs-legend");
    legend.setAttribute("role", "group");
    legend.setAttribute("aria-label", t("mrsLegendLabel"));

    var replayBtn = mrsButton("mrs-btn mrs-btn-tool", "mrsBtnReplay");
    var soundBtn = mrsButton("mrs-btn mrs-btn-tool", "mrsSoundOn");
    soundBtn.setAttribute("aria-pressed", "true");
    var newBtn = mrsButton("mrs-btn mrs-btn-tool", "btnNewRound");
    var tools = mrsNode("div", "mrs-row mrs-tools");
    tools.appendChild(replayBtn);
    tools.appendChild(soundBtn);
    tools.appendChild(newBtn);

    [lampRow, meter, strip, slotsRow, reading, legend, tools].forEach(function (node) {
      stage.appendChild(node);
    });

    var result = mrsNode("p", "game-result");
    result.setAttribute("role", "status");

    /* The campaign picker keeps the shared row/label/select shape the shipped
     * panels use, so the mission menu reads like every other one. */
    var pickLabel = mrsNode("label", "elements-label", t("mrsMissionSelectLabel"));
    pickLabel.setAttribute("for", "mrsMissionSel");
    pickLabel.setAttribute("data-i18n", "mrsMissionSelectLabel");
    var pickSel = mrsNode("select", "elements-select");
    pickSel.id = "mrsMissionSel";
    var pickRow = mrsNode("div", "elements-row");
    pickRow.appendChild(pickLabel);
    pickRow.appendChild(pickSel);

    var sendBtn = mrsButton("primary", "mrsBtnSend");
    var bestEl = mrsNode("p", "game-best");
    var actions = mrsNode("div", "game-actions");
    actions.appendChild(sendBtn);
    actions.appendChild(bestEl);

    var hint = mrsNode("p", "game-hint", t("mrsHint"));
    hint.setAttribute("data-i18n", "mrsHint");

    [hud, stage, result, pickRow, actions, hint].forEach(function (node) {
      panelEl.appendChild(node);
    });

    function mrsNode(tag, className, text) {
      var node = document.createElement(tag);
      if (className) {
        node.className = className;
      }
      if (text) {
        node.textContent = text;
      }
      return node;
    }

    function mrsI18n(node, key) {
      node.setAttribute("data-i18n", key);
      node.textContent = t(key);
      return node;
    }

    function mrsStat(key, valueEl) {
      var stat = mrsNode("div", "game-stat");
      stat.appendChild(mrsI18n(mrsNode("span"), key));
      stat.appendChild(valueEl);
      return stat;
    }

    /* Controls are real buttons carrying their own translated span, so the
     * shared i18n pass can relabel the panel when the page language flips. */
    function mrsButton(className, key) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = className;
      btn.appendChild(mrsI18n(mrsNode("span"), key));
      return btn;
    }

    function wholeNumber(value) {
      var n = Math.floor(Number(value));
      return isFinite(n) && n > 0 ? n : 0;
    }

    /* --- mission state ------------------------------------------------------ */
    function optionsFor(index) {
      var raw = mission.received[index];
      return raw === undefined || raw === null ? [] : mrsCandidates(String(raw), mission.vocab);
    }

    function damagedCount() {
      return mission.received.filter(function (pattern) {
        return String(pattern).indexOf(mrsVoid) !== -1;
      }).length;
    }

    function filledCount() {
      return slots.filter(function (value) {
        return !!value;
      }).length;
    }

    function secondsLeft() {
      return Math.max(0, Math.ceil(msLeft / 1000));
    }

    /* --- rendering ---------------------------------------------------------- */
    function renderHud() {
      windowEl.textContent = t("mrsSeconds", { n: secondsLeft() });
      batteryEl.textContent = t("mrsBattery", { n: Math.max(0, batteryLeft) });
      tryEl.textContent = t("mrsTries", { n: Math.max(0, wholeNumber(level.attempts) - triesUsed) });
      crewEl.textContent = t("mrsGroups", { n: mission.received.length, s: damagedCount() });
      var span = Math.max(1, wholeNumber(level.window) * 1000);
      meterFill.style.width = Math.max(0, Math.min(100, Math.round((msLeft / span) * 100))) + "%";
      meter.setAttribute("aria-label", t("mrsWindowAria", { n: secondsLeft() }));
    }

    function renderStrip() {
      strip.textContent = "";
      mission.received.forEach(function (pattern, index) {
        var raw = String(pattern);
        var wholeGroup = raw.indexOf(mrsVoid) === -1;
        var tile = document.createElement("button");
        tile.type = "button";
        tile.className = "mrs-group" + (index === groupAt ? " is-cursor" : "") +
          (wholeGroup ? " is-whole" : "");
        tile.setAttribute("aria-pressed", index === groupAt ? "true" : "false");
        tile.setAttribute("aria-label", t("mrsGroupAria", { n: index + 1, marks: mrsReadable(raw) }));
        tile.appendChild(mrsNode("span", "mrs-group-tag", t("mrsGroupNo", { n: index + 1 })));

        var marks = mrsNode("span", "mrs-marks");
        raw.split("").forEach(function (chr, pos) {
          var live = play && play.index === index && play.at === pos;
          marks.appendChild(mrsNode("span", "mrs-mark " + (chr === mrsVoid
            ? "is-void" : chr === "-" ? "is-dash" : "is-dot") + (live ? " is-live" : ""),
            mrsGlyph(chr)));
        });
        tile.appendChild(marks);

        /* The playhead: how far the lamp has got through this group, so a
         * player who cannot hear the rhythm still knows which mark is talking. */
        var head = mrsNode("span", "mrs-head");
        if (play && play.index === index) {
          head.className = "mrs-head is-moving";
          head.style.width = Math.round(((play.at + 1) / Math.max(1, raw.length)) * 100) + "%";
        }
        tile.appendChild(head);

        var fits = Math.max(1, optionsFor(index).length);
        tile.appendChild(mrsNode("span", "mrs-fits",
          wholeGroup ? t("mrsFitsClean") : t(fits === 1 ? "mrsFitsOne" : "mrsFitsMany", { n: fits })));
        tile.addEventListener("click", function () {
          selectGroup(index);
          playGroup(index, false);
        });
        strip.appendChild(tile);
      });
    }

    function renderSlots() {
      slotsRow.textContent = "";
      slots.forEach(function (value, index) {
        var state = verdict ? verdict.states[index] : "";
        var slot = document.createElement("button");
        slot.type = "button";
        slot.className = "mrs-slot" + (index === slotAt && !over ? " is-cursor" : "") +
          (state ? (state === "ok" ? " is-right" : " is-wrong") : "");
        slot.setAttribute("aria-label", t("mrsSlotAria", { n: index + 1, c: value || t("mrsSlotEmpty") }));
        slot.appendChild(mrsNode("span", "mrs-slot-char", value || "\u25a1"));
        slot.appendChild(mrsNode("span", "mrs-slot-flag",
          state ? t(state === "ok" ? "mrsFlagOk" : "mrsFlagNo") : String(index + 1)));
        slot.addEventListener("click", function () {
          slotAt = index;
          arm();
          renderSlots();
          renderReading();
        });
        slotsRow.appendChild(slot);
      });
    }

    function renderLegend() {
      legend.textContent = "";
      mission.vocab.forEach(function (ch) {
        var key = document.createElement("button");
        key.type = "button";
        key.className = "mrs-key";
        key.setAttribute("aria-label", t("mrsKeyAria", { c: ch, marks: mrsReadable(mrsTable[ch]) }));
        key.appendChild(mrsNode("span", "mrs-key-char", ch));
        key.appendChild(mrsNode("span", "mrs-key-code", mrsGlyphs(mrsTable[ch])));
        key.addEventListener("click", function () {
          fillSlot(ch);
        });
        legend.appendChild(key);
      });
    }

    function renderReading() {
      var raw = String(mission.received[groupAt] || "");
      var fits = Math.max(1, optionsFor(groupAt).length);
      var parts = [t("mrsReadingGroup", { n: groupAt + 1, marks: mrsReadable(raw), len: raw.length })];
      parts.push(raw.indexOf(mrsVoid) === -1
        ? t("mrsReadingClean")
        : t(fits === 1 ? "mrsReadingDeduce" : "mrsReadingAsk", { n: fits }));
      parts.push(t("mrsReadingShape", {
        n: mission.received.length, c: filledCount(), b: Math.max(0, batteryLeft),
      }));
      reading.textContent = parts.join(" \u00b7 ");
    }

    function refreshPicker() {
      fillCampaignPicker(
        pickSel,
        campaign,
        function (def) {
          return t(def.labelKey);
        },
        t("elementsLocked"),
      );
      pickSel.value = level.id;
      bestEl.textContent = t("campaignStars", {
        n: campaign.totalStars(),
        max: campaign.maxStars(),
      });
    }

    function render() {
      renderHud();
      renderStrip();
      renderSlots();
      renderReading();
    }

    /* Dots and dashes also exist as words, for screen readers and for the
     * player who would rather read the marks than watch the lamp. */
    function mrsReadable(pattern) {
      var chars = String(pattern || "").split("");
      if (!chars.length) {
        return t("mrsNoMarks");
      }
      return chars.map(function (chr) {
        return chr === mrsVoid ? t("mrsMarkVoid") : chr === "-" ? t("mrsMarkDash") : t("mrsMarkDot");
      }).join(" ");
    }

    /* The visible marks use the same glyphs in the bar and in the legend, so a
     * group can be compared against the alphabet at a glance. */
    function mrsGlyph(chr) {
      return chr === mrsVoid ? "?" : chr === "-" ? "\u2015" : "\u00b7";
    }

    function mrsGlyphs(pattern) {
      return String(pattern || "").split("").map(mrsGlyph).join(" ");
    }

    /* --- the clock and the lamp --------------------------------------------
     * One rAF loop is the only clock: the broadcast window, the lamp and the
     * playhead all read from it, it sleeps while the drawer does, and the first
     * player action wakes it - nothing ticks from boot. */
    function loop() {
      if (!loopOn) {
        return;
      }
      rafId = window.requestAnimationFrame(loop);
      if (panelEl.hidden || document.hidden) {
        return;
      }
      var now = Date.now();
      var dt = Math.min(0.032, Math.max(0, (now - lastNow) / 1000));
      lastNow = now;
      if (armed && !over) {
        msLeft = Math.max(0, msLeft - dt * 1000);
        if (msLeft <= 0) {
          lose("time");
          return;
        }
      }
      stepPlayback(dt);
      renderHud();
    }

    function wake() {
      loopOn = true;
      if (rafId === null || rafId === undefined) {
        lastNow = Date.now();
        rafId = window.requestAnimationFrame(loop);
      }
    }

    function sleep() {
      loopOn = false;
      if (rafId !== null && rafId !== undefined) {
        window.cancelAnimationFrame(rafId);
      }
      rafId = null;
    }

    function arm() {
      if (!over) {
        armed = true;
      }
      wake();
    }

    /* A group becomes a list of light segments measured in seconds, and the
     * audio scheduler walks the very same list so ear and eye cannot drift. */
    function mrsTimeline(pattern) {
      var segments = [];
      var at = 0;
      String(pattern || "").split("").forEach(function (chr, pos) {
        var dur;
        if (chr === mrsVoid) {
          /* Two short blinks around a gap: static in the middle of the group,
           * and the hollow mark in the bar points at the same slot. */
          dur = unitSec * 0.5;
          segments.push({ on: true, at: at, dur: dur, pos: pos, grainy: true });
          at += unitSec * 0.9;
          segments.push({ on: true, at: at, dur: dur, pos: pos, grainy: true });
          at += dur;
        } else {
          dur = unitSec * (chr === "-" ? 3 : 1);
          segments.push({ on: true, at: at, dur: dur, pos: pos, grainy: false });
          at += dur;
        }
        segments.push({ on: false, at: at, dur: unitSec, pos: pos, grainy: false });
        at += unitSec;
      });
      return { segments: segments, total: at + unitSec * 2 };
    }

    function stepPlayback(dt) {
      if (!play) {
        return;
      }
      play.t += dt;
      var seen = null;
      for (var i = 0; i < play.line.segments.length; i += 1) {
        var seg = play.line.segments[i];
        if (play.t >= seg.at && play.t < seg.at + seg.dur) {
          seen = seg;
          break;
        }
      }
      if (!isMotionOff()) {
        lamp.className = seen && seen.on ? "mrs-lamp is-on" : "mrs-lamp";
      }
      var pos = seen ? seen.pos : -1;
      if (pos !== play.at) {
        play.at = pos;
        renderStrip();
      }
      if (play.t >= play.line.total) {
        stopPlayback();
      }
    }

    /* Audio only exists after a gesture, and every call below is a no-op when
     * the browser (or the headless harness) has no AudioContext at all. */
    function ensureAudio() {
      if (audio || !soundOn) {
        return;
      }
      var Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) {
        return;
      }
      try {
        audio = new Ctor();
        if (audio.state !== "running" && typeof audio.resume === "function") {
          audio.resume();
        }
      } catch (error) {
        audio = null;
      }
    }

    function startSound(line) {
      if (!audio || !soundOn) {
        return;
      }
      var base = audio.currentTime + 0.05;
      line.segments.forEach(function (seg) {
        if (seg.on) {
          mrsTone(base + seg.at, seg.dur, seg.grainy);
        }
      });
    }

    function mrsTone(at, dur, grainy) {
      if (!audio) {
        return;
      }
      try {
        var osc = audio.createOscillator();
        var gain = audio.createGain();
        osc.type = grainy ? "square" : "sine";
        osc.frequency.value = grainy ? 392 : 660;
        gain.gain.setValueAtTime(0.0001, at);
        gain.gain.linearRampToValueAtTime(0.16, at + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + Math.max(0.05, dur));
        osc.connect(gain);
        gain.connect(audio.destination);
        osc.start(at);
        osc.stop(at + Math.max(0.06, dur) + 0.02);
        nodes.push(osc);
      } catch (error) {
        /* a refused tone must not stop the broadcast */
      }
    }

    function stopSound() {
      for (var i = 0; i < nodes.length; i += 1) {
        try {
          nodes[i].stop();
        } catch (error) {
          /* already finished */
        }
      }
      nodes = [];
    }

    function stopPlayback() {
      play = null;
      stopSound();
      lamp.className = "mrs-lamp";
      renderStrip();
    }

    function playGroup(index, clean) {
      if (over || index < 0 || index >= mission.received.length) {
        return;
      }
      var raw = String(clean ? mission.codes[index] : mission.received[index] || "");
      if (!raw) {
        return;
      }
      arm();
      stopSound();
      play = { index: index, at: -1, t: 0, line: mrsTimeline(raw) };
      lastNow = Date.now();
      ensureAudio();
      startSound(play.line);
      lampText.textContent = t("mrsPlaying", { n: index + 1, marks: mrsReadable(raw) });
      renderStrip();
      renderReading();
    }

    /* --- player actions ----------------------------------------------------- */
    function selectGroup(index) {
      if (index < 0 || index >= mission.received.length) {
        return;
      }
      groupAt = index;
      arm();
      render();
    }

    /* The cursor parks on the next empty slot, so typing a coordinate is a
     * straight run of keystrokes with no housekeeping in between. */
    function fillSlot(ch) {
      if (over) {
        return;
      }
      if (mission.vocab.indexOf(ch) === -1) {
        reading.textContent = t("mrsNotInAlphabet", { c: ch });
        return;
      }
      arm();
      slots[Math.min(slotAt, slots.length - 1)] = ch;
      var next = slots.length - 1;
      for (var i = 0; i < slots.length; i += 1) {
        if (!slots[i]) {
          next = i;
          break;
        }
      }
      slotAt = next;
      verdict = null;
      render();
    }

    function clearSlot() {
      if (over) {
        return;
      }
      var index = -1;
      for (var i = slots.length - 1; i >= 0; i -= 1) {
        if (slots[i]) {
          index = i;
          break;
        }
      }
      if (index === -1) {
        return;
      }
      slots[index] = "";
      slotAt = index;
      verdict = null;
      arm();
      render();
    }

    /* One battery unit buys a clean replay: the group's true marks replace the
     * corrupted ones on both channels, and the transmission costs window time. */
    function replayGroup() {
      if (over) {
        return;
      }
      if (String(mission.received[groupAt]).indexOf(mrsVoid) === -1) {
        reading.textContent = t("mrsAlreadyClean", { n: groupAt + 1 });
        return;
      }
      if (batteryLeft <= 0) {
        reading.textContent = t("mrsNoBattery");
        return;
      }
      batteryLeft -= 1;
      msLeft = Math.max(0, msLeft - wholeNumber(level.drain) * 1000);
      mission.received[groupAt] = mission.codes[groupAt];
      playGroup(groupAt, true);
      renderHud();
      if (msLeft <= 0) {
        lose("time");
      }
    }

    /* Grading is per slot on purpose: the success criterion is that the player
     * can say why a coordinate was accepted or rejected. */
    function grade() {
      var states = [];
      var notes = [];
      var right = 0;
      slots.forEach(function (got, i) {
        var want = String(mission.answer).charAt(i);
        if (got === want) {
          right += 1;
          states.push("ok");
          notes.push(t("mrsWhyRight", { s: i + 1, c: got }));
        } else if (!got) {
          states.push("void");
          notes.push(t("mrsWhyEmpty", { s: i + 1 }));
        } else {
          states.push("no");
          notes.push(t("mrsWhyWrong", { s: i + 1, c: got, marks: mrsReadable(mission.received[i]) }));
        }
      });
      return { states: states, right: right, notes: notes };
    }

    function submit() {
      if (over) {
        return;
      }
      var filled = filledCount();
      if (filled < slots.length) {
        result.textContent = t("mrsIncomplete", { n: slots.length, c: filled, s: slots.indexOf("") + 1 });
        render();
        return;
      }
      arm();
      triesUsed += 1;
      var report = grade();
      verdict = report;
      if (report.right === slots.length) {
        win(report);
        return;
      }
      if (triesUsed >= wholeNumber(level.attempts)) {
        lose("tries", report);
        return;
      }
      result.textContent = t("mrsRejected", {
        n: triesUsed, max: wholeNumber(level.attempts), ok: report.right,
        total: slots.length, detail: report.notes.join(" \u00b7 "),
      });
      render();
    }

    function win(report) {
      over = "win";
      var spentBattery = Math.max(0, wholeNumber(level.battery) - batteryLeft);
      var cost = spentBattery * mrsBatteryWeight + triesUsed;
      var starsWon = starsFor(cost, level.starCost, "low");
      var outcome = campaign.record(level.id, { stars: starsWon, best: cost, better: "low" });
      var message = t("mrsAccepted", {
        code: mission.answer, ok: report.right, b: spentBattery, n: triesUsed, s: starsWon,
      });
      if (outcome.isBest) {
        message += " " + t("newBest");
      }
      if (outcome.unlockedNext) {
        message += " " + t("mrsNextMission");
      } else if (campaign.clearedCount() === mrsLevels.length) {
        message += " " + t("mrsCampaignDone");
      }
      result.textContent = message + " " + report.notes.join(" \u00b7 ");
      logAction(t("logMorseRescue", { code: mission.answer, b: spentBattery, n: triesUsed }));
      var rect = sendBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      finish();
      refreshPicker();
    }

    function lose(reason, report) {
      over = "lose";
      result.textContent = reason === "time"
        ? t("mrsLostTime", { code: mission.answer, w: wholeNumber(level.window) })
        : t("mrsLostTries", {
          code: mission.answer, max: wholeNumber(level.attempts),
          detail: report ? report.notes.join(" \u00b7 ") : t("mrsWhyNone"),
        });
      lampText.textContent = t("mrsSilent");
      finish();
    }

    /* Both endings stop the broadcast: the lamp dies, the clock goes quiet and
     * the board freezes so the player can read what the coordinate was. */
    function finish() {
      stopPlayback();
      sleep();
      render();
    }

    function loadLevel(def) {
      var dealt = mrsDealSolvable(def, cursors[def.id] || 0);
      level = def;
      mission = dealt.mission;
      cursors[def.id] = dealt.next;
      unitSec = mrsUnit * (Number(def.unit) || 1);
      slots = [];
      for (var i = 0; i < mission.received.length; i += 1) {
        slots.push("");
      }
      slotAt = 0;
      groupAt = 0;
      batteryLeft = wholeNumber(def.battery);
      triesUsed = 0;
      msLeft = wholeNumber(def.window) * 1000;
      armed = false;
      verdict = null;
      over = "";
      stopPlayback();
      lampText.textContent = t("mrsIdle");
      renderLegend();
      refreshPicker();
      render();
      result.textContent = t("mrsPrompt", {
        name: t(def.labelKey), n: mission.received.length,
        d: damagedCount(), b: wholeNumber(def.battery),
      });
    }

    /* --- wiring ------------------------------------------------------------- */
    replayBtn.addEventListener("click", replayGroup);
    sendBtn.addEventListener("click", submit);
    newBtn.addEventListener("click", function () {
      loadLevel(level);
    });

    soundBtn.addEventListener("click", function () {
      soundOn = !soundOn;
      soundBtn.setAttribute("aria-pressed", soundOn ? "true" : "false");
      soundBtn.firstChild.textContent = t(soundOn ? "mrsSoundOn" : "mrsSoundOff");
      if (!soundOn) {
        stopSound();
      }
    });

    pickSel.addEventListener("change", function () {
      var pick = campaign.indexOf(pickSel.value);
      if (pick < 0) {
        return;
      }
      if (!campaign.isUnlocked(pickSel.value)) {
        pickSel.value = level.id;
        result.textContent = t("mrsLocked", { name: t(mrsLevels[pick].labelKey) });
        return;
      }
      loadLevel(mrsLevels[pick]);
    });

    /* Keys are read on the panel, so an answer can be typed from any control:
     * arrows walk the groups, Enter/Space play the current one (a focused
     * button already does that natively), letters and digits fill the slot.
     * The picker and any field keep their own keyboard behaviour. */
    panelEl.addEventListener("keydown", function (event) {
      var tag = event.target && event.target.tagName ? String(event.target.tagName) : "";
      if (tag === "SELECT" || tag === "INPUT" || tag === "TEXTAREA") {
        return;
      }
      var key = event.key;
      if (key === "ArrowLeft" || key === "ArrowUp" || key === "ArrowRight" || key === "ArrowDown") {
        event.preventDefault();
        var step = key === "ArrowLeft" || key === "ArrowUp" ? -1 : 1;
        selectGroup((groupAt + step + mission.received.length) % mission.received.length);
        return;
      }
      if (key === "Enter" || key === " ") {
        if (tag === "BUTTON") {
          return;
        }
        event.preventDefault();
        playGroup(groupAt, false);
        return;
      }
      if (key === "Backspace") {
        event.preventDefault();
        clearSlot();
        return;
      }
      if (!key || key.length !== 1 || key === "Tab" || key === "Escape") {
        return;
      }
      var ch = key.toUpperCase();
      if (!mrsTable[ch]) {
        reading.textContent = t("mrsNotInAlphabet", { c: ch });
        return;
      }
      event.preventDefault();
      fillSlot(ch);
    });

    loadLevel(mrsLevels[campaign.indexOf(campaign.nextLevelId())] || mrsLevels[0]);

    /* Shell pause: only the clock, the lamp and the sound go quiet - never the
     * board the player has already transcribed. */
    App.quietResetMorseRescue = function () {
      stopPlayback();
      sleep();
      renderHud();
    };
  }

  /* Bilingual copy travels with the game: addStrings only fills keys i18n.js
   * does not already own, so the shared dictionary stays authoritative. */
  App.addStrings({
    en: {
      "tabMorseRescue": "Morse Rescue",
      "mrsL1": "First Call",
      "mrsL2": "Number Station",
      "mrsL3": "One Bad Group",
      "mrsL4": "Longer Coordinate",
      "mrsL5": "Distress Window",
      "mrsL6": "Three Noisy Groups",
      "mrsL7": "Three Replays",
      "mrsL8": "Six Group Coordinate",
      "mrsL9": "Number Storm",
      "mrsL10": "Last Broadcast",
      "mrsWindowLabel": "Window",
      "mrsBatteryLabel": "Battery",
      "mrsTryLabel": "Sends",
      "mrsCrewLabel": "Signal",
      "mrsMissionSelectLabel": "Choose a mission",
      "mrsSeconds": "{n}s",
      "mrsBattery": "{n}",
      "mrsTries": "{n}",
      "mrsGroups": "{n} groups, {s} noisy",
      "mrsWindowAria": "Broadcast window: {n} seconds left",
      "mrsStageLabel": "Signal receiver: play the groups, then fill in the coordinate",
      "mrsStripLabel": "Received signal groups",
      "mrsAnswerLabel": "Coordinate slots",
      "mrsLegendLabel": "Signal alphabet for this mission",
      "mrsGroupNo": "{n}",
      "mrsGroupAria": "Group {n}: {marks}",
      "mrsFitsClean": "clean",
      "mrsFitsOne": "1 fits",
      "mrsFitsMany": "{n} fit",
      "mrsSlotAria": "Slot {n}: {c}",
      "mrsSlotEmpty": "empty",
      "mrsFlagOk": "ok",
      "mrsFlagNo": "no",
      "mrsKeyAria": "{c} is {marks}",
      "mrsMarkDot": "dot",
      "mrsMarkDash": "dash",
      "mrsMarkVoid": "static",
      "mrsNoMarks": "no marks",
      "mrsBtnReplay": "Replay (battery)",
      "mrsBtnSend": "Send coordinate",
      "mrsSoundOn": "Sound: on",
      "mrsSoundOff": "Sound: off",
      "mrsIdle": "Lamp idle",
      "mrsPlaying": "Group {n}: {marks}",
      "mrsSilent": "Channel silent",
      "mrsReadingGroup": "Group {n} reads {marks} ({len} marks)",
      "mrsReadingClean": "this group arrived whole",
      "mrsReadingDeduce": "only {n} letter in the legend fits - deduction is enough",
      "mrsReadingAsk": "{n} letters fit - replay it, or reason about the rest",
      "mrsReadingShape": "the coordinate is {n} slots, {c} filled, {b} replay budget left",
      "mrsPrompt": "{name}: the crew taps {n} groups and {d} came through noisy. {b} replay budget in the bank.",
      "mrsNotInAlphabet": "{c} is not in this mission's alphabet.",
      "mrsIncomplete": "Rejected - the coordinate needs {n} characters and has {c}. Slot {s} is still empty.",
      "mrsAlreadyClean": "Group {n} already arrived whole - no battery spent.",
      "mrsNoBattery": "Battery is empty. Read the groups again and infer the rest.",
      "mrsWhyRight": "slot {s} = {c} ok",
      "mrsWhyWrong": "slot {s} is not {c}; the group reads {marks}",
      "mrsWhyEmpty": "slot {s} left empty",
      "mrsWhyNone": "no submission on the record",
      "mrsRejected": "Rejected on send {n}/{max}: {ok} of {total} slots are right. {detail}",
      "mrsAccepted": "{code} accepted - all {ok} slots right. Battery spent: {b}. Sends used: {n}. Stars: {s}.",
      "mrsLostTries": "The crew fell silent after {max} sends. The coordinate was {code}. {detail}",
      "mrsLostTime": "The window closed after {w}s. The coordinate was {code}.",
      "mrsLocked": "{name} is still locked - clear the mission before it first.",
      "mrsNextMission": "Next mission unlocked.",
      "mrsCampaignDone": "Every crew heard and answered.",
      "mrsHint": "Read the mark bar first: a group that only one legend letter fits needs no battery, so spend it where several fit.",
      "logMorseRescue": "Answered the crew with {code} in {n} sends"
    },
    zh: {
      "tabMorseRescue": "摩尔斯求救",
      "mrsL1": "初次呼叫",
      "mrsL2": "数字电台",
      "mrsL3": "一组杂音",
      "mrsL4": "更长的坐标",
      "mrsL5": "求救窗口",
      "mrsL6": "三组杂音",
      "mrsL7": "三次重播",
      "mrsL8": "六组坐标",
      "mrsL9": "数字风暴",
      "mrsL10": "最后一次播发",
      "mrsWindowLabel": "窗口",
      "mrsBatteryLabel": "电量",
      "mrsTryLabel": "发送",
      "mrsCrewLabel": "信号",
      "mrsMissionSelectLabel": "选择任务",
      "mrsSeconds": "{n} 秒",
      "mrsBattery": "{n}",
      "mrsTries": "{n}",
      "mrsGroups": "{n} 组，{s} 组有杂音",
      "mrsWindowAria": "播发窗口：还剩 {n} 秒",
      "mrsStageLabel": "信号接收台：播放信号组，然后填入坐标",
      "mrsStripLabel": "收到的信号组",
      "mrsAnswerLabel": "坐标填写格",
      "mrsLegendLabel": "本次任务使用的字符表",
      "mrsGroupNo": "{n}",
      "mrsGroupAria": "第 {n} 组：{marks}",
      "mrsFitsClean": "完整",
      "mrsFitsOne": "只匹配 1 个",
      "mrsFitsMany": "匹配 {n} 个",
      "mrsSlotAria": "第 {n} 格：{c}",
      "mrsSlotEmpty": "空格",
      "mrsFlagOk": "对",
      "mrsFlagNo": "错",
      "mrsKeyAria": "{c} 的编码是 {marks}",
      "mrsMarkDot": "点",
      "mrsMarkDash": "划",
      "mrsMarkVoid": "杂音",
      "mrsNoMarks": "没有信号",
      "mrsBtnReplay": "重播（耗电）",
      "mrsBtnSend": "发送坐标",
      "mrsSoundOn": "声音：开",
      "mrsSoundOff": "声音：关",
      "mrsIdle": "信号灯待机",
      "mrsPlaying": "第 {n} 组：{marks}",
      "mrsSilent": "频道已静音",
      "mrsReadingGroup": "第 {n} 组收到 {marks}（共 {len} 个信号）",
      "mrsReadingClean": "这一组完整到达",
      "mrsReadingDeduce": "字符表里只有 {n} 个字母合得上，直接推理即可",
      "mrsReadingAsk": "有 {n} 个字母都合得上——要么重播，要么靠其余线索排除",
      "mrsReadingShape": "坐标共 {n} 格，已填 {c} 格，还剩 {b} 次重播",
      "mrsPrompt": "{name}：受困船员发来 {n} 组信号，其中 {d} 组被杂音破坏。电库里还有 {b} 次重播。",
      "mrsNotInAlphabet": "本次任务的字符表里没有 {c}。",
      "mrsIncomplete": "已拒收——坐标需要 {n} 个字符，现在只有 {c} 个，第 {s} 格还空着。",
      "mrsAlreadyClean": "第 {n} 组本来就完整，没有耗电。",
      "mrsNoBattery": "电量用完了，请重读信号并推理剩下的格子。",
      "mrsWhyRight": "第 {s} 格 {c} 正确",
      "mrsWhyWrong": "第 {s} 格不是 {c}，该组收到的是 {marks}",
      "mrsWhyEmpty": "第 {s} 格留空",
      "mrsWhyNone": "没有提交记录",
      "mrsRejected": "第 {n}/{max} 次发送被拒收：{total} 格里有 {ok} 格是对的。{detail}",
      "mrsAccepted": "{code} 已接受——{ok} 格全部正确。用电重播 {b} 次，发送 {n} 次，获得 {s} 星。",
      "mrsLostTries": "发送 {max} 次之后，船员的信号消失了。正确坐标是 {code}。{detail}",
      "mrsLostTime": "{w} 秒的窗口关上了。正确坐标是 {code}。",
      "mrsLocked": "{name} 还没解锁——先通过它前面的任务。",
      "mrsNextMission": "解锁下一个任务。",
      "mrsCampaignDone": "所有求救信号都已回应。",
      "mrsHint": "先读标记条：只有一个字符能对上的那组不用耗电，把电量留给有多个字符都能上的那一组。",
      "logMorseRescue": "用 {n} 次发送回出了坐标 {code}"
    },
  });

  App.registerGame({
    name: "morseRescue",
    tabKey: "tabMorseRescue",
    init: initMorseRescueGame,
    guide: {
      svg:
        '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="6" y="6" width="108" height="64" rx="5" fill="rgba(30,41,59,.75)" stroke="rgba(148,163,184,.45)"/>' +
        '<circle cx="22" cy="24" r="7" fill="#fbbf24"/>' +
        '<g fill="#22d3ee">' +
        '<circle cx="42" cy="24" r="3"/><circle cx="52" cy="24" r="3"/><circle cx="62" cy="24" r="3"/>' +
        '<rect x="72" y="21" width="12" height="6" rx="3"/><rect x="88" y="21" width="12" height="6" rx="3"/>' +
        '<circle cx="106" cy="24" r="3"/></g>' +
        '<rect x="18" y="40" width="16" height="22" rx="3" fill="none" stroke="rgba(148,163,184,.55)"/>' +
        '<rect x="40" y="40" width="16" height="22" rx="3" fill="none" stroke="#a3e635" stroke-width="2"/>' +
        '<rect x="62" y="40" width="16" height="22" rx="3" fill="none" stroke="rgba(148,163,184,.55)"/>' +
        '<text x="26" y="55" font-size="11" fill="#e2e8f0" text-anchor="middle">S</text>' +
        '<text x="48" y="55" font-size="11" fill="#a3e635" text-anchor="middle">O</text>' +
        '<text x="70" y="55" font-size="11" fill="rgba(251,113,133,1)" text-anchor="middle">?</text></svg>',
      en: [
        "Goal: transcribe the crew's dots and dashes into the rescue coordinate before the broadcast window closes.",
        "Action: open a group with the lamp or its mark bar, then click a legend letter or type it to fill the next slot, and send the coordinate.",
        "Rule: static replaces a mark with '?', so the group still shows its shape - the badge tells you how many letters in the legend can fit it.",
        "Watch out: Replay (battery) restores one group cleanly but costs battery and seconds, so spend it on the groups where several letters fit.",
        "Scoring: battery spent then tries used set your stars, and the slot flags spell out exactly why a coordinate was accepted or rejected.",
        "Tip: the game never needs sound - every flash the lamp sends is printed as dot, dash or static."
      ],
      zh: [
        "目标：在播发窗口关闭之前，把船员发出的点与划抄成救援坐标。",
        "操作：点亮某一组信号（或用标记条查看），再点击字符表或直接键盘输入填满下一格，然后发送坐标。",
        "规则：杂音会把某个信号替换成问号，该组的长度仍在——角标会告诉你字符表里有几个字母合得上。",
        "注意：重播会耗电并缩短窗口，只能用来救那些有多个字母都合得上的组。",
        "计分：按剩余电量优先、发送次数其次评星，每一格的对错标记会说明坐标为何被接受或被拒收。",
        "提示：完全不需要声音——信号灯闪的每一下都会写成点、划或杂音。"
      ],
    },
  });

  /* Exported for the other modules. */
  App.initMorseRescueGame = initMorseRescueGame;
  App.morseEncode = morseEncode;
  App.morseDecode = morseDecode;
  App.morseNoise = morseNoise;
  App.morseCandidates = mrsCandidates;
  App.morseSolve = morseSolve;
  App.morseSolvable = morseSolvable;
  App.morseDeal = mrsDeal;
  App.morseLevels = mrsLevels;
})(window.CapitalConvert = window.CapitalConvert || {});
