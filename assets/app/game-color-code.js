/* Color Code - the Mastermind-style deduction mini-game in the shared game drawer.

   This game only ever says four things - which colour sits in which hole, and how
   many of them are right - so the pegs have to carry all of it, and they are drawn
   rather than tinted. A code peg is a glossy turned face seated in a recessed well
   in one moulded plate, and every colour also wears a stamped silhouette, so a row
   can be read in greyscale. The key pegs change shape as well as hue: a solid round
   disc stamped with a check for "right colour, right place", a hollow ivory diamond
   for "right colour, wrong place" - which is what "solid" and "hollow" mean in the
   rules text, and the reason hue is never the only channel.

   A submitted row lands instead of appearing: the key pegs drop into the mould one
   at a time and the grid stamps down. A row that scores nothing is thrown back at
   the player - shake, board jolt, red flash and a strike across its wells that
   stays for the rest of the round. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  var localStorage = App.storage;
  var t = App.t;
  var getElement = App.getElement;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  /* App.fx and App.playSfx are the shared feel layer. They are always loaded by
   * the pages, but a game that boots without them must still be playable. */
  var fx = App.fx || {};
  var playSfx = App.playSfx || function () {};
  var NS = "http://www.w3.org/2000/svg";
  var ccBestKey = "color-code-best";
  var ccStreakKey = "color-code-streak";
  var ccSlots = 4;
  var ccMaxTries = 10;
  var ccColorKeys = [
    "ccColor0",
    "ccColor1",
    "ccColor2",
    "ccColor3",
    "ccColor4",
    "ccColor5",
  ];
  var ccColors = ["#22d3ee", "#fbbf24", "#f472b6", "#a3e635", "#a78bfa", "#e2e8f0"];
  /* A hue to light the particles with, one per swatch, so a spark matches the
   * peg it came off. The order tracks ccColors. */
  var ccHues = [189, 38, 330, 84, 255, 213];
  /* One silhouette per colour, over the same 24x24 box as the icon bank. The
   * shape is the greyscale-safe half of a code peg: dot, wedge, block, lozenge,
   * glint, cross. */
  var ccShapes = [
    "M12 6.2a5.8 5.8 0 1 0 0 11.6 5.8 5.8 0 0 0 0-11.6z",
    "M12 5.4l6.6 13.2H5.4z",
    "M6.6 6.6h10.8v10.8H6.6z",
    "M12 4.8l7.2 7.2L12 19.2 4.8 12z",
    "M12 3.4l2.4 6.2 6.2 2.4-6.2 2.4-2.4 6.2-2.4-6.2-6.2-2.4 6.2-2.4z",
    "M9.6 4.2h4.8v5.4h5.4v4.8h-5.4v5.4H9.6v-5.4H4.2V9.6h5.4z",
  ];

  function ccScore(guess, secret) {
    var exact = 0;
    var white = 0;
    var usedSecret = [];
    var usedGuess = [];
    var index;
    for (index = 0; index < ccSlots; index += 1) {
      if (guess[index] === secret[index]) {
        exact += 1;
        usedSecret[index] = true;
        usedGuess[index] = true;
      }
    }
    for (index = 0; index < ccSlots; index += 1) {
      if (usedGuess[index]) {
        continue;
      }
      for (var other = 0; other < ccSlots; other += 1) {
        if (!usedSecret[other] && guess[index] === secret[other]) {
          white += 1;
          usedSecret[other] = true;
          break;
        }
      }
    }
    return { exact: exact, white: white };
  }

  function initColorCodeGame() {
    var paletteEl = getElement("ccPalette");
    var boardEl = getElement("ccBoard");
    var tryEl = getElement("ccTryStat");
    var streakEl = getElement("ccStreakStat");
    var bestStatEl = getElement("ccBestStat");
    var resultEl = getElement("ccResult");
    var checkBtn = getElement("ccCheckBtn");
    var newBtn = getElement("ccNewBtn");
    if (
      !paletteEl ||
      !boardEl ||
      !tryEl ||
      !streakEl ||
      !bestStatEl ||
      !resultEl ||
      !checkBtn ||
      !newBtn
    ) {
      return;
    }

    var secret = [];
    var guesses = [];
    var current = [null, null, null, null];
    var selectedColor = 0;
    var over = false;
    /* The row that has not played its snap-in yet, and -1 once it has. Only the
     * newest row animates, because the whole plate is rebuilt on every paint. */
    var snapRow = -1;
    var swatches = Array.prototype.slice.call(paletteEl.children);
    var rowEls = [];
    var liveRowEl = null;
    var railEl = null;
    var ghosts = [];
    var hostEl = null;
    var dismissCeremony = null;

    /* One door for every feel-layer call: App.fx is optional here, and its
     * helpers do not all share the (el, opts) signature - countUp takes the
     * numbers, stagger takes a list - so the call is forwarded whole. */
    function beat(name) {
      var run = fx[name];
      if (typeof run !== "function") {
        return null;
      }
      return run.apply(null, Array.prototype.slice.call(arguments, 1));
    }

    function node(tag, className) {
      var el = document.createElement(tag);
      if (className) {
        el.className = className;
      }
      return el;
    }

    function svgNode(tag, attrs) {
      var el = document.createElementNS(NS, tag);
      for (var key in attrs) {
        if (Object.prototype.hasOwnProperty.call(attrs, key)) {
          el.setAttribute(key, String(attrs[key]));
        }
      }
      return el;
    }

    /* The silhouette is laid down twice, a light copy under the ink copy, so it
     * reads as pressed into the plastic rather than printed on top of it. */
    function shapeMark(index) {
      var d = ccShapes[index % ccShapes.length];
      var svg = svgNode("svg", {
        viewBox: "0 0 24 24",
        class: "cc-mark",
        "aria-hidden": "true",
        focusable: "false",
      });
      svg.appendChild(
        svgNode("path", { d: d, class: "cc-mark-lit", transform: "translate(0 1.1)" }),
      );
      svg.appendChild(svgNode("path", { d: d, class: "cc-mark-ink" }));
      return svg;
    }

    function checkMark() {
      var svg = svgNode("svg", {
        viewBox: "0 0 24 24",
        class: "cc-mark is-check",
        "aria-hidden": "true",
        focusable: "false",
      });
      svg.appendChild(
        svgNode("path", {
          d: "M5.8 12.6l4.4 4.4 8-9.2",
          class: "cc-check",
        }),
      );
      return svg;
    }

    /* A code peg: colour inline, gloss and silhouette in the sheet. */
    function pegEl(color) {
      var peg = node("span", "cc-peg");
      peg.style.background = ccColors[color];
      peg.appendChild(shapeMark(color));
      return peg;
    }

    /* The faint next peg shown in an unfilled hole of the row being built, so the
     * current swatch is visible on the board and not only in the picker. */
    function ghostEl() {
      var ghost = node("span", "cc-ghost");
      ghosts.push(ghost);
      paintGhost(ghost);
      return ghost;
    }

    function paintGhost(ghost) {
      ghost.textContent = "";
      ghost.style.background = ccColors[selectedColor];
      ghost.appendChild(shapeMark(selectedColor));
    }

    function paintGhosts() {
      for (var index = 0; index < ghosts.length; index += 1) {
        paintGhost(ghosts[index]);
      }
    }

    /* One hole of the plate. "live" is a real button, because that is the thing
     * the player presses; every other kind is moulded plastic and hidden from
     * readers, which get the same facts from the row's own labels. */
    function wellEl(index, color, kind) {
      var well;
      if (kind === "live") {
        well = document.createElement("button");
        well.type = "button";
        well.setAttribute("data-slot", String(index));
        well.setAttribute(
          "aria-label",
          t("ccSlotLabel", {
            n: index + 1,
            color: color === null ? t("ccEmpty") : t(ccColorKeys[color]),
          }),
        );
        well.addEventListener("click", function () {
          paintSlot(index);
        });
      } else {
        well = node("span", "cc-slot");
        well.setAttribute("aria-hidden", "true");
      }
      well.className =
        "cc-slot is-" + kind + (color === null || color === undefined ? " is-vacant" : " is-set");
      if (kind === "live" && color === null) {
        well.appendChild(ghostEl());
      } else if (color !== null && color !== undefined) {
        well.appendChild(pegEl(color));
      }
      return well;
    }

    /* The 2x2 key mould. Four holes always, so the count of what is missing is
     * as legible as the count of what landed. */
    function pegsEl(feedback) {
      var wrap = node("span", "cc-pegs");
      wrap.setAttribute("role", "img");
      wrap.setAttribute(
        "aria-label",
        t("ccFeedback", { e: feedback.exact, w: feedback.white }),
      );
      for (var index = 0; index < ccSlots; index += 1) {
        var hole = node("span", "cc-keyhole");
        var kind = "is-void";
        if (index < feedback.exact) {
          kind = "is-hit";
        } else if (index < feedback.exact + feedback.white) {
          kind = "is-near";
        }
        var key = node("span", "cc-key " + kind);
        if (kind === "is-hit") {
          key.appendChild(checkMark());
        }
        hole.appendChild(key);
        wrap.appendChild(hole);
      }
      return wrap;
    }

    function makeRow(index, entry, kind) {
      var row = node("div", "cc-row is-" + kind);
      if (index === snapRow) {
        row.className += " is-fresh";
      }
      if (entry && entry.feedback.exact + entry.feedback.white === 0) {
        row.className += " is-blank";
      }

      var num = node("span", "cc-row-num");
      num.setAttribute("aria-hidden", "true");
      num.textContent = String(index + 1);
      row.appendChild(num);

      var holes = node("div", "cc-holes");
      var pegs = entry ? entry.guess : current;
      for (var slot = 0; slot < ccSlots; slot += 1) {
        holes.appendChild(
          wellEl(slot, kind === "waiting" ? null : pegs[slot], kind),
        );
      }
      row.appendChild(holes);

      row.appendChild(node("span", "cc-ridge"));
      row.appendChild(
        pegsEl(entry ? entry.feedback : { exact: 0, white: 0 }),
      );
      if (kind === "waiting") {
        row.setAttribute("aria-hidden", "true");
      }
      rowEls.push(row);
      return row;
    }

    function codeRail() {
      var rail = node("div", "cc-rail is-" + (over ? "open" : "shut"));
      var label = node("span", "cc-rail-label");
      label.textContent = t("ccSecretLabel");
      rail.appendChild(label);
      var holes = node("div", "cc-rail-holes");
      for (var index = 0; index < ccSlots; index += 1) {
        var hole = node("span", "cc-slot is-code");
        hole.setAttribute("aria-hidden", over ? "false" : "true");
        if (over) {
          /* The shutters are gone and the pegs beneath them turn over, dealt
           * left to right so the last look of a round is a reveal, not a list. */
          var peg = pegEl(secret[index]);
          peg.className += " is-revealed";
          peg.style.animationDelay = (index * 90) + "ms";
          hole.appendChild(peg);
        } else {
          hole.appendChild(node("span", "cc-shutter"));
        }
        holes.appendChild(hole);
      }
      rail.appendChild(holes);
      /* Purely a moulded seam in the plate - drawn by the sheet, carries no copy,
       * so it stays out of the accessibility tree. */
      var note = node("span", "cc-rail-note");
      note.setAttribute("aria-hidden", "true");
      rail.appendChild(note);
      return rail;
    }

    function readIntKey(key) {
      var value = parseInt(localStorage.getItem(key), 10);
      return isNaN(value) ? 0 : value;
    }

    function newSecret() {
      secret = [];
      for (var index = 0; index < ccSlots; index += 1) {
        secret.push(Math.floor(Math.random() * ccColors.length));
      }
    }

    function codeText(code) {
      return code
        .map(function (color) {
          return t(ccColorKeys[color]);
        })
        .join(" \u00b7 ");
    }

    function renderStats(rollTry) {
      var tryNo = Math.min(guesses.length + 1, ccMaxTries);
      if (rollTry && tryNo > 1) {
        beat("countUp", tryEl, tryNo - 1, tryNo, {
          format: function (value) {
            return value + "/" + ccMaxTries;
          },
        });
      } else {
        tryEl.textContent = tryNo + "/" + ccMaxTries;
      }
      streakEl.textContent = String(readIntKey(ccStreakKey));
      var best = readIntKey(ccBestKey);
      bestStatEl.textContent = best ? t("ccBestLine", { n: best }) : t("noBest");
      /* The Try chip is the only pressure gauge the game has, so two tries from
       * the end it starts wearing the warning plate. */
      var chip = tryEl.parentNode;
      if (chip && chip.classList) {
        chip.classList.toggle("is-warn", !over && tryNo > ccMaxTries - 2);
      }
    }

    function renderBoard() {
      /* Painting a hole replaces the row's buttons, so hand the keyboard back to
       * the hole it was standing on once the new plate is built. */
      var active = document.activeElement;
      var wasOn =
        active &&
        active.getAttribute &&
        typeof boardEl.contains === "function" &&
        boardEl.contains(active)
          ? active.getAttribute("data-slot")
          : null;

      boardEl.textContent = "";
      rowEls = [];
      ghosts = [];
      liveRowEl = null;

      railEl = codeRail();
      boardEl.appendChild(railEl);

      /* Every try row is moulded into the plate from the first paint: a real
       * board shows the ten rows it has, empty ones included. */
      for (var index = 0; index < ccMaxTries; index += 1) {
        if (index < guesses.length) {
          boardEl.appendChild(makeRow(index, guesses[index], "played"));
        } else if (index === guesses.length && !over) {
          liveRowEl = makeRow(index, null, "live");
          boardEl.appendChild(liveRowEl);
        } else {
          boardEl.appendChild(makeRow(index, null, "waiting"));
        }
      }

      if (wasOn !== null && liveRowEl) {
        var target = liveRowEl.querySelector('[data-slot="' + wasOn + '"]');
        if (target) {
          target.focus();
        }
      }
    }

    function rowAt(index) {
      return rowEls[index] || null;
    }

    function paintSlot(index) {
      current[index] = selectedColor;
      renderBoard();
      var slot = liveRowEl
        ? liveRowEl.querySelector('[data-slot="' + index + '"]')
        : null;
      playSfx("place");
      if (slot) {
        beat("pop", slot.firstChild || slot, { scale: 1.22, ms: 240 });
      }
    }

    /* The beat a submitted row deserves: each key peg drops into the mould in
     * turn, the grid stamps down over them, and a row that came back empty is
     * shrugged off the board rather than merely labelled wrong. */
    function settleRow() {
      var row = rowAt(snapRow);
      if (!row) {
        return;
      }
      var entry = guesses[snapRow];
      var feedback = entry ? entry.feedback : { exact: 0, white: 0 };
      var pegs = row.querySelector(".cc-pegs");
      var keys = pegs ? pegs.querySelectorAll(".cc-key") : [];
      beat("stagger", keys, { kind: "drop", step: 64, ms: 240 });

      if (feedback.exact + feedback.white === 0) {
        playSfx("wrong");
        beat("shake", row, { dist: 8 });
        beat("jolt", boardEl, { dist: 4 });
        beat("flash", row, { hue: 2 });
        return;
      }
      if (feedback.exact > 0) {
        playSfx("score");
        beat("burst", pegs, {
          kind: "star",
          count: 3 + feedback.exact * 4,
          hue: 140,
        });
      } else {
        playSfx("pop");
      }
      beat("pop", row, { scale: 1.035, ms: 260 });
    }

    function hostPanel() {
      if (hostEl) {
        return hostEl;
      }
      var walker = boardEl.parentNode;
      while (walker && walker.className) {
        if (/(^|\s)game-panel(\s|$)/.test(String(walker.className))) {
          hostEl = walker;
          break;
        }
        walker = walker.parentNode;
      }
      return hostEl;
    }

    function closeCeremony() {
      if (typeof dismissCeremony === "function") {
        dismissCeremony();
      }
      dismissCeremony = null;
    }

    /* Three stars for an early crack, fewer for a grind. Display only: this game
     * keeps a best-tries record, not a score. */
    function starsFor(tries) {
      return tries <= 4 ? 3 : tries <= 7 ? 2 : 1;
    }

    function win() {
      over = true;
      var tries = guesses.length;
      var previousBest = readIntKey(ccBestKey);
      var isBest = !previousBest || tries < previousBest;
      if (isBest) {
        localStorage.setItem(ccBestKey, String(tries));
      }
      var previousStreak = readIntKey(ccStreakKey);
      localStorage.setItem(ccStreakKey, String(previousStreak + 1));
      resultEl.textContent =
        t("ccWin", { n: tries }) + (isBest ? " " + t("newBest") : "");
      logAction(t("logCC", { n: tries }));
      var rect = checkBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(isBest);
      renderBoard();
      renderStats();
      beat("countUp", streakEl, previousStreak, previousStreak + 1, { ms: 520 });
      settleRow();
      /* A crack is worth the whole plate lighting up: the code it was opens, the
       * winning row rings, and the round closes as a ceremony. */
      beat("flash", boardEl, { hue: 140, ms: 620 });
      beat("ring", rowAt(snapRow), { hue: 140 });
      /* Sparks, not a third round of confetti: the ceremony and the button each
       * already throw one, and the rail needs its own register. */
      beat("burst", railEl, { kind: "spark", count: 14, hue: 140 });
      dismissCeremony = beat("ceremony", hostPanel(), {
        tone: "win",
        stars: starsFor(tries),
        title: t("ccWin", { n: tries }),
        lines: [isBest ? t("newBest") : t("ccBestLine", { n: previousBest })],
      });
    }

    function lose() {
      over = true;
      var previousStreak = readIntKey(ccStreakKey);
      localStorage.setItem(ccStreakKey, "0");
      resultEl.textContent = t("ccLost", { code: codeText(secret) });
      logAction(t("logCC", { n: "\u2014" }));
      petNotifyGame(false);
      renderBoard();
      renderStats();
      settleRow();
      beat("shake", railEl, { dist: 4, kind: "y" });
      beat("flash", boardEl, { hue: 2, ms: 620 });
      dismissCeremony = beat("ceremony", hostPanel(), {
        tone: "lose",
        stars: 0,
        title: t("ccSecretLabel"),
        lines: [codeText(secret), t("hudStreak") + ": " + previousStreak],
      });
    }

    function check() {
      if (over) {
        return;
      }
      var missing = -1;
      for (var index = 0; index < ccSlots; index += 1) {
        if (current[index] === null && missing < 0) {
          missing = index;
        }
      }
      if (missing >= 0) {
        resultEl.textContent = t("ccNoFill");
        playSfx("wrong");
        beat("shake", liveRowEl, { dist: 7 });
        var vacant = liveRowEl
          ? liveRowEl.querySelector('[data-slot="' + missing + '"]')
          : null;
        beat("ring", vacant || liveRowEl, { hue: 38 });
        return;
      }
      var feedback = ccScore(current, secret);
      guesses.push({ guess: current.slice(), feedback: feedback });
      snapRow = guesses.length - 1;
      current = [null, null, null, null];
      renderStats(true);

      if (feedback.exact === ccSlots) {
        win();
        snapRow = -1;
        return;
      }
      if (guesses.length >= ccMaxTries) {
        lose();
        snapRow = -1;
        return;
      }
      resultEl.textContent = t("ccFeedback", {
        e: feedback.exact,
        w: feedback.white,
      });
      renderBoard();
      settleRow();
      snapRow = -1;
    }

    function newRound() {
      closeCeremony();
      over = false;
      guesses = [];
      current = [null, null, null, null];
      snapRow = -1;
      newSecret();
      renderBoard();
      renderStats();
      resultEl.textContent = t("ccPrompt");
      /* The plate deals itself in row by row over closed shutters, so the round
       * starts as a board rather than as an empty box. */
      beat("stagger", rowEls, { kind: "drop", step: 24, ms: 260 });
      playSfx("flip");
      checkBtn.focus();
    }

    /* Each swatch wears the same silhouette as the pegs it paints, so the picker
     * teaches the shape code before the first guess exists. */
    function dressPalette() {
      swatches.forEach(function (swatch, index) {
        if (swatch.querySelector && swatch.querySelector(".cc-mark")) {
          return;
        }
        swatch.appendChild(shapeMark(index));
      });
    }

    dressPalette();

    swatches.forEach(function (swatch, index) {
      swatch.addEventListener("click", function () {
        selectedColor = index;
        swatches.forEach(function (other, otherIndex) {
          other.setAttribute("aria-pressed", String(otherIndex === index));
          other.classList.toggle("is-selected", otherIndex === index);
        });
        paintGhosts();
        playSfx("select");
        beat("pop", swatch, { scale: 1.16, ms: 220 });
      });
    });

    checkBtn.addEventListener("click", check);
    newBtn.addEventListener("click", newRound);

    /* Turn-based: nothing ticks behind a hidden panel. The hook is here so the
     * drawer can close a ceremony that was left standing on a tab switch, and it
     * touches no state. */
    App.quietResetColorCode = function () {
      closeCeremony();
    };

    newRound();
  }


  /* Exported for the other modules. */
  App.initColorCodeGame = initColorCodeGame;
})(window.CapitalConvert = window.CapitalConvert || {});
