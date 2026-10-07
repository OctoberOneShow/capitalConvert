/* Reflex Tap - The reaction-time mini-game in the shared game drawer.
 *
 * The play surface is a shot berth rather than a coloured rectangle: a scope
 * drawn here with createElementNS (corner brackets, a dashed ranging hoop, tick
 * rails, a target disc, a foul cross) with a state lamp above the word and a
 * measured-time readout on its own strip. Four moments carry the feel - the
 * berth arms and breathes while the shot is held back, the disc arrives with a
 * pop and a ring when it opens, a jumped trigger stamps a cross and throws the
 * frame back, and a landing shot rolls its milliseconds into the HUD beside the
 * player's best mark. */
(function (App) {
  var localStorage = App.storage;
  /* Shared names from the other modules (see window.CapitalConvert). */
  var t = App.t;
  var getElement = App.getElement;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  var reflexBestKey = "reflex-tap-best";
  var svgNS = "http://www.w3.org/2000/svg";

  /* One hue per loud moment. The plate, the drawn art, the ring and the flash
   * read the same number, so a state change tints the whole berth at once. */
  var HUE_ARM = 28;
  var HUE_GO = 150;
  var HUE_FOUL = 2;
  var HUE_REST = 200;

  /* The lamp changes motif with the state: the berth never says a state in
   * colour alone. */
  var LAMPS = {
    idle: { name: "hand", hue: HUE_REST },
    waiting: { name: "hourglass", hue: HUE_ARM },
    ready: { name: "target", hue: HUE_GO },
    early: { name: "bolt", hue: HUE_FOUL },
  };

  /* The scope's four brackets, in a 280x180 box with the disc at 140,90. They
   * are written out rather than rotated because a wide box has no four-fold
   * symmetry about its centre. */
  var BRACKETS = [
    "M12 46V24a12 12 0 0 1 12-12h22",
    "M268 46V24a12 12 0 0 0-12-12h-22",
    "M12 134v22a12 12 0 0 0 12 12h22",
    "M268 134v22a12 12 0 0 1-12 12h-22",
  ];

  function noop() {}

  /* game-fx.js and game-art.js load before this module in the page, but the
   * per-module fixtures boot a game against a bare App. Everything reflex asks
   * of the feel layer is decoration except countUp, whose stub still has to land
   * the HUD number, so the fallback keeps the round playable. */
  function feel() {
    var fx = App.fx;
    if (fx) {
      return fx;
    }
    return {
      pop: noop,
      shake: noop,
      ring: noop,
      burst: noop,
      flash: noop,
      floatText: noop,
      ceremony: noop,
      countUp: function (el, from, to, opts) {
        if (el) {
          el.textContent = opts && opts.format ? opts.format(to) : String(to);
        }
      },
    };
  }

  function sound(name) {
    if (App.playSfx) {
      App.playSfx(name);
    }
  }

  function msText(value) {
    return value + " ms";
  }

  /* A phrasing-level node: the whole berth lives inside a <button>, so it is
   * built from spans rather than divs. */
  function node(cls) {
    var out = document.createElement("span");
    out.className = cls;
    out.setAttribute("aria-hidden", "true");
    return out;
  }

  function svgNode(tag, attrs, kids) {
    var out = document.createElementNS(svgNS, tag);
    var key;
    var i;
    if (attrs) {
      for (key in attrs) {
        if (!Object.prototype.hasOwnProperty.call(attrs, key)) {
          continue;
        }
        if (attrs[key] === null || attrs[key] === undefined) {
          continue;
        }
        out.setAttribute(key, String(attrs[key]));
      }
    }
    if (kids) {
      for (i = 0; i < kids.length; i += 1) {
        if (kids[i]) {
          out.appendChild(kids[i]);
        }
      }
    }
    return out;
  }

  /* Only classes and currentColor are used here, so the sheet can retint and
   * animate every part per state without the module ever rebuilding the art. */
  function buildScope() {
    var svg = svgNode("svg", {
      viewBox: "0 0 280 180",
      preserveAspectRatio: "xMidYMid meet",
      class: "rx-art",
      "aria-hidden": "true",
      focusable: "false",
    });
    var i;

    var frame = svgNode("g", { class: "rx-frame" });
    for (i = 0; i < BRACKETS.length; i += 1) {
      frame.appendChild(
        svgNode("path", { class: "rx-bracket", d: BRACKETS[i] })
      );
    }

    var rails = svgNode("g", { class: "rx-rails" }, [
      svgNode("line", { class: "rx-rail", x1: 16, y1: 90, x2: 76, y2: 90 }),
      svgNode("line", { class: "rx-rail", x1: 204, y1: 90, x2: 264, y2: 90 }),
    ]);

    var ticks = svgNode("g", { class: "rx-ticks" });
    for (i = 0; i < 360; i += 15) {
      ticks.appendChild(
        svgNode("line", {
          class: i % 45 === 0 ? "rx-tick rx-tick-major" : "rx-tick",
          x1: 140,
          y1: 6,
          x2: 140,
          y2: i % 45 === 0 ? 19 : 13,
          transform: "rotate(" + i + " 140 90)",
        })
      );
    }

    var parts = [
      frame,
      rails,
      ticks,
      svgNode("circle", { class: "rx-hoop", cx: 140, cy: 90, r: 68 }),
      svgNode("g", { class: "rx-sweep" }, [
        svgNode("line", { class: "rx-sweep-arm", x1: 140, y1: 90, x2: 140, y2: 28 }),
        svgNode("circle", { class: "rx-sweep-head", cx: 140, cy: 28, r: 4 }),
      ]),
      svgNode("circle", { class: "rx-pulse", cx: 140, cy: 90, r: 56 }),
      svgNode("g", { class: "rx-disc" }, [
        svgNode("circle", { class: "rx-disc-face", cx: 140, cy: 90, r: 56 }),
        svgNode("circle", { class: "rx-band", cx: 140, cy: 90, r: 40 }),
        svgNode("circle", { class: "rx-band rx-band-inner", cx: 140, cy: 90, r: 24 }),
      ]),
      svgNode("g", { class: "rx-cross" }, [
        svgNode("line", { x1: 140, y1: 20, x2: 140, y2: 30 }),
        svgNode("line", { x1: 140, y1: 150, x2: 140, y2: 160 }),
        svgNode("line", { x1: 70, y1: 90, x2: 80, y2: 90 }),
        svgNode("line", { x1: 200, y1: 90, x2: 210, y2: 90 }),
      ]),
      svgNode("g", { class: "rx-foul" }, [
        svgNode("line", { x1: 114, y1: 64, x2: 166, y2: 116 }),
        svgNode("line", { x1: 166, y1: 64, x2: 114, y2: 116 }),
      ]),
    ];
    for (i = 0; i < parts.length; i += 1) {
      svg.appendChild(parts[i]);
    }
    return svg;
  }

  function initReflexGame() {
    var pad = getElement("reflexPad");
    var padText = getElement("reflexPadText");
    var lastEl = getElement("reflexLast");
    var bestEl = getElement("reflexBest");
    var resultEl = getElement("reflexResult");
    var startBtn = getElement("reflexStartBtn");
    if (!pad || !padText || !lastEl || !bestEl || !resultEl || !startBtn) {
      return;
    }

    var state = "idle";
    var readyAt = 0;
    var waitId = null;
    var scope = null;
    var anchor = null;
    var lamp = null;
    var mark = null;
    var markTime = null;
    var markDelta = null;
    var dismissCeremony = null;

    function readBest() {
      var value = parseInt(localStorage.getItem(reflexBestKey), 10);
      return isNaN(value) ? 0 : value;
    }

    function renderBest() {
      var best = readBest();
      bestEl.textContent = best ? best + " ms" : "—";
    }

    /* The engraved chip a HUD value sits in, or null in the fixtures, which hang
     * the game's elements straight off the body. */
    function chipOf(value) {
      var chip = value && value.parentNode;
      return chip && chip.classList && chip.classList.contains("game-stat")
        ? chip
        : null;
    }

    /* A chip that moved says so with a tint *and* the readout strip below it, so
     * the state is never carried by colour alone. */
    function markChip(value, tone) {
      var chip = chipOf(value);
      if (!chip) {
        return;
      }
      chip.classList.remove("is-good", "is-warn");
      if (tone === "good") {
        chip.classList.add("is-good");
      }
    }

    /* The berth, built once: the scope behind the word, the lamp above it and
     * the readout strip under it. The first paint is a composed instrument, not
     * an empty box waiting for a round to start. */
    function buildBerth() {
      scope = buildScope();
      var gate = node("rx-gate");
      gate.appendChild(scope);
      /* fx.ring sizes itself to its host's box, so the go-ring gets a square
       * anchor of its own at the disc centre instead of the wide pad. */
      anchor = node("rx-anchor");
      gate.appendChild(anchor);

      lamp = node("rx-lamp");
      var face = node("rx-face");
      face.appendChild(lamp);

      mark = node("rx-mark");
      markTime = node("rx-mark-time");
      markDelta = node("rx-mark-delta");
      mark.appendChild(markTime);
      mark.appendChild(markDelta);

      pad.insertBefore(gate, padText);
      pad.insertBefore(face, padText);
      face.appendChild(padText);
      pad.appendChild(mark);
    }

    /* art.icon bakes its palette into attributes, so the lamp is redrawn on a
     * state change; a round only changes state a handful of times. */
    function drawLamp(nextState) {
      var art = App.art;
      var pick = LAMPS[nextState] || LAMPS.idle;
      if (!lamp || !art || typeof art.icon !== "function") {
        return;
      }
      while (lamp.firstChild) {
        lamp.removeChild(lamp.firstChild);
      }
      lamp.setAttribute("data-motif", pick.name);
      lamp.appendChild(
        art.icon(pick.name, { hue: pick.hue, sat: 72, tone: "soft", size: 24 })
      );
    }

    function hideMark() {
      if (mark) {
        mark.className = "rx-mark";
        markTime.textContent = "";
        markDelta.textContent = "";
      }
    }

    /* The result as a measurement: the time, the direction it moved in, and the
     * mark it is being read against. */
    function showMark(reaction, previousBest, isBest) {
      if (!mark) {
        return;
      }
      var band = "rx-mark";
      if (previousBest) {
        var diff = reaction - previousBest;
        markDelta.textContent =
          (diff < 0 ? "▼ " : diff > 0 ? "▲ +" : "— ") +
          Math.abs(diff) +
          " ms · " +
          t("hudBest") +
          " " +
          msText(isBest ? reaction : previousBest);
        band += diff < 0 ? " is-fell" : diff > 0 ? " is-over" : " is-even";
      } else {
        markDelta.textContent = "★ " + t("hudBest") + " " + msText(reaction);
        band += " is-first";
      }
      markTime.textContent = msText(reaction);
      mark.className = band;
    }

    /* Presentation-only band: reflex scores nothing, so the ceremony's stars say
     * how far the old mark fell rather than how the round went. */
    function starsFor(previousBest, reaction) {
      if (!previousBest) {
        return 3;
      }
      var fell = (previousBest - reaction) / previousBest;
      if (fell >= 0.1) {
        return 3;
      }
      return fell >= 0.04 ? 2 : 1;
    }

    function clearCeremony() {
      var dismiss = dismissCeremony;
      dismissCeremony = null;
      if (typeof dismiss === "function") {
        dismiss();
      }
    }

    /* The ceremony wants the panel, so the plate arrives over the whole berth.
     * Walking for .game-panel instead of matching one keeps the fixtures, where
     * the pad has no panel at all, from handing fx an undefined host. */
    function berthHost() {
      var fallback = pad.parentNode;
      var probe = fallback;
      while (probe && probe !== document.body) {
        if (probe.classList && probe.classList.contains("game-panel")) {
          return probe;
        }
        probe = probe.parentNode;
      }
      return fallback || document.body;
    }

    function setPad(nextState, labelKey) {
      state = nextState;
      pad.classList.remove("is-waiting", "is-ready", "is-early");
      if (nextState === "waiting") {
        pad.classList.add("is-waiting");
      } else if (nextState === "ready") {
        pad.classList.add("is-ready");
      } else if (nextState === "early") {
        pad.classList.add("is-early");
      }
      padText.textContent = t(labelKey);
      drawLamp(nextState);

      var fx = feel();
      if (nextState === "ready") {
        /* The defining beat: the target arrives instead of the box changing
         * colour. The disc scales in on its own animation, the scope takes the
         * punch, the ring snaps out around it, the berth lights in one voice. */
        sound("shoot");
        fx.pop(scope, { scale: 1.14, ms: 300 });
        fx.ring(anchor, { hue: HUE_GO });
        fx.flash(pad, { hue: HUE_GO, ms: 380 });
      } else if (nextState === "early") {
        sound("wrong");
        fx.shake(pad, { dist: 11, ms: 380 });
        fx.flash(pad, { hue: HUE_FOUL, ms: 420 });
        fx.floatText(pad, "✕", { kind: "bad" });
      }
    }

    function resetRound() {
      window.clearTimeout(waitId);
      waitId = null;
      readyAt = 0;
      setPad("idle", "reflexPadIdle");
    }

    function startRound() {
      window.clearTimeout(waitId);
      clearCeremony();
      lastEl.textContent = "—";
      resultEl.textContent = t("reflexWaiting");
      setPad("waiting", "reflexPadWaiting");
      hideMark();
      markChip(lastEl, null);
      sound("select");
      feel().flash(pad, { hue: HUE_ARM, ms: 420 });

      var delay = 1200 + Math.floor(Math.random() * 2200);
      waitId = window.setTimeout(function () {
        waitId = null;
        readyAt = performance.now();
        setPad("ready", "reflexPadReady");
        resultEl.textContent = t("reflexPadReady");
      }, delay);
      pad.focus();
    }

    function tapPad() {
      if (state === "waiting") {
        window.clearTimeout(waitId);
        waitId = null;
        readyAt = 0;
        setPad("early", "reflexPadIdle");
        resultEl.textContent = t("reflexTooSoon");
        return;
      }

      if (state !== "ready") {
        startRound();
        return;
      }

      var reaction = Math.max(1, Math.round(performance.now() - readyAt));
      var previousBest = readBest();
      var isBest = !previousBest || reaction < previousBest;
      if (isBest) {
        localStorage.setItem(reflexBestKey, String(reaction));
      }

      var fx = feel();
      /* The number rolls into the chip instead of teleporting: a measured time
       * should look measured. */
      var shown = parseInt(lastEl.textContent, 10);
      fx.countUp(lastEl, isNaN(shown) ? 0 : shown, reaction, {
        format: msText,
        ms: 420,
      });
      markChip(lastEl, isBest ? "good" : null);
      resultEl.textContent =
        t("reflexResult", { n: reaction }) + (isBest ? " " + t("newBest") : "");
      setPad("idle", "reflexPadIdle");
      renderBest();
      markChip(bestEl, isBest ? "good" : null);
      showMark(reaction, previousBest, isBest);
      logAction(t("logReflex", { n: reaction }));
      sound(isBest ? "star" : "score");
      fx.burst(pad, { kind: "spark", count: isBest ? 20 : 12, hue: HUE_GO });
      fx.floatText(pad, msText(reaction), { kind: isBest ? "good" : "callout" });

      if (isBest) {
        var rect = pad.getBoundingClientRect();
        createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
        var lines = [t("reflexResult", { n: reaction })];
        if (previousBest) {
          lines.push(
            t("hudBest") + " " + previousBest + " ms → " + reaction + " ms"
          );
        }
        dismissCeremony = fx.ceremony(berthHost(), {
          tone: "clear",
          stars: starsFor(previousBest, reaction),
          title: t("newBest"),
          lines: lines,
        });
      }
      petNotifyGame(isBest);
    }

    startBtn.addEventListener("click", startRound);
    pad.addEventListener("click", tapPad);

    App.quietResetReflex = function () {
      clearCeremony();
      if (state === "waiting" || state === "ready") {
        resetRound();
        resultEl.textContent = t("reflexPrompt");
      }
    };

    buildBerth();
    renderBest();
    resetRound();
  }


  /* Exported for the other modules. */
  App.initReflexGame = initReflexGame;
})(window.CapitalConvert = window.CapitalConvert || {});
