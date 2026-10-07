/* Glyph Match - The memory-pair mini-game in the shared game drawer. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  var localStorage = App.storage;
  var t = App.t;
  var getElement = App.getElement;
  var logAction = App.logAction;
  var petNotifyGame = App.petNotifyGame;
  var memoryBestKey = "glyph-match-best";
  var memoryStoreVersion = 2;
  var memoryMaxSeconds = 3600;
  /* The ladder replaces the old fixed 6-pair board: each rung is a pair count
   * plus the column count that keeps its cards legible inside the ~390px
   * drawer panel. Rung 3 (6 pairs) is the original board. */
  var memoryLegacyPairs = 6;
  var memoryLevels = [
    { pairs: 3, cols: 3 },
    { pairs: 4, cols: 4 },
    { pairs: 6, cols: 4 },
    { pairs: 8, cols: 4 },
    { pairs: 10, cols: 5 },
    { pairs: 11, cols: 6 },
    { pairs: 12, cols: 6 },
  ];
  /* Glyph pool: the first six are the original board's glyphs, the rest widen
   * the pool so the largest rung has enough distinct faces. */
  var memoryGlyphs = [
    "\u5929",
    "\u4e3b",
    "\u795e",
    "\u5149",
    "\u5723",
    "\u7075",
    "\u661f",
    "\u6708",
    "\u4e91",
    "\u96f7",
    "\u7389",
    "\u7384",
  ];
  /* One identity per glyph: a motif from the art bank plus the hue its plate is
   * bevelled in. The character stays the fact a pair is matched on - the motif
   * and hue are there so a face reads as a drawn plaque instead of a letter on a
   * grey square, and so two faces differ by shape as well as by colour. */
  var memoryFaces = {
    "\u5929": { icon: "sun", hue: 36 }, // sky: the sun is the sky's face
    "\u4e3b": { icon: "crown", hue: 12 }, // lord
    "\u795e": { icon: "sparkle", hue: 286 }, // spirit
    "\u5149": { icon: "bulb", hue: 54 }, // light
    "\u5723": { icon: "cross", hue: 198 }, // holy
    "\u7075": { icon: "feather", hue: 150 }, // soul
    "\u661f": { icon: "star", hue: 266 }, // star
    "\u6708": { icon: "moon", hue: 222 }, // moon
    "\u4e91": { icon: "cloud", hue: 182 }, // cloud
    "\u96f7": { icon: "bolt", hue: 312 }, // thunder
    "\u7389": { icon: "gem", hue: 128 }, // jade
    "\u7384": { icon: "prism", hue: 342 }, // the dark and unknowable
  };
  var memoryFaceFallback = { icon: "gem", hue: 196 };
  /* The deck's own back colour. It matches the --gp-hue the shared art-direction
   * layer gives this panel; the game reads the real value off the panel at init
   * and only uses this as the fallback. */
  var memoryBackHue = 196;
  var svgNS = "http://www.w3.org/2000/svg";

  /* The drawer loads game-fx.js and game-art.js before this module, so App.fx
   * and App.art are normally present. The headless fixtures boot a game against
   * a bare App, though, and nothing here may throw because the feel layer was
   * not on the page: these stubs keep the three calls the game's *state* depends
   * on (the two-face structure, its turned class, and a HUD number's final text)
   * and no-op the rest, which is decoration. */
  function feelLayer() {
    var fx = App.fx;
    if (fx) {
      return fx;
    }
    var stub = {
      cardEl: function (down, up) {
        var outer = document.createElement("div");
        outer.className = "fx-card";
        var inner = document.createElement("div");
        inner.className = "fx-card-inner";
        var back = document.createElement("div");
        back.className = "fx-face fx-face-back";
        back.appendChild(down);
        var front = document.createElement("div");
        front.className = "fx-face fx-face-front";
        front.appendChild(up);
        inner.appendChild(back);
        inner.appendChild(front);
        outer.appendChild(inner);
        return outer;
      },
      flipCard: function (host, turned) {
        if (!host || !host.classList) {
          return false;
        }
        var on =
          turned === undefined
            ? !host.classList.contains("is-turned")
            : !!turned;
        host.classList[on ? "add" : "remove"]("is-turned");
        return on;
      },
      countUp: function (el, from, to, opts) {
        if (el) {
          el.textContent =
            opts && opts.format ? opts.format(to) : String(to);
        }
      },
    };
    "pop shake ring burst floatText stagger sweep jolt flash ceremony callout".split(
      " ",
    ).forEach(function (name) {
      stub[name] = function () {};
    });
    return stub;
  }

  function initMemoryGame() {
    var grid = getElement("memoryGrid");
    var movesEl = getElement("memoryMoves");
    var timeEl = getElement("memoryTime");
    var pairsEl = getElement("memoryPairs");
    var resultEl = getElement("memoryResult");
    var startBtn = getElement("memoryStartBtn");
    var bestEl = getElement("memoryBest");
    if (
      !grid ||
      !movesEl ||
      !timeEl ||
      !pairsEl ||
      !resultEl ||
      !startBtn ||
      !bestEl
    ) {
      return;
    }

    var fx = feelLayer();
    var art = App.art || null;
    var playSfx = App.playSfx || function () {};
    var panelEl = grid.closest ? grid.closest(".game-panel") : null;
    var boardHue = readPanelHue();

    var totalLevels = memoryLevels.length;
    var legacyLevel = 1;
    memoryLevels.forEach(function (info, index) {
      if (info.pairs === memoryLegacyPairs) {
        legacyLevel = index + 1;
      }
    });

    var progress = readProgress();
    var level = progress.level; // rung whose board is on screen
    var nextLevel = progress.level; // rung a "next level" click / reload resumes on
    var bests = progress.bests;
    var levelCleared = false;

    var firstCard = null;
    var lockBoard = false;
    var moves = 0;
    var matchedPairs = 0;
    var roundStarted = false;
    var startedAt = 0;
    var timerId = null;
    var mismatchTimer = null;
    var ceremonyDismiss = null;

    var primaryLabel = startBtn.querySelector("[data-i18n]");
    var levelStat = buildLevelStat();

    /* The hue is steered centrally (see games.css art direction), so the drawn
     * art asks the panel for it instead of hard-coding a second palette. */
    function readPanelHue() {
      var host = panelEl || grid;
      var raw = "";
      if (host && host.ownerDocument && host.ownerDocument.defaultView) {
        raw = host.ownerDocument.defaultView
          .getComputedStyle(host)
          .getPropertyValue("--gp-hue");
      }
      var value = parseInt(raw, 10);
      return value >= 0 && value <= 360 ? value : memoryBackHue;
    }

    function clampLevel(value) {
      var parsed = parseInt(value, 10);
      if (isNaN(parsed) || parsed < 1) {
        return 1;
      }
      return parsed > totalLevels ? totalLevels : parsed;
    }

    /* Reads the ladder progress. Version 1 of the key held one scalar best
     * time for the fixed 6-pair board: that value migrates to the best of the
     * rung that reproduces that board. Corrupt or out-of-range data falls back
     * to the defaults instead of throwing. `stale` means the stored text is not
     * in the current shape yet, so it is rewritten once on init. */
    function readProgress() {
      var blank = function (stale) {
        return { level: 1, bests: {}, stale: stale };
      };
      var raw = null;
      try {
        raw = localStorage.getItem(memoryBestKey);
      } catch (error) {
        return blank(false);
      }
      if (raw === null || raw === undefined) {
        return blank(false);
      }

      var text = String(raw).trim();
      if (!text) {
        return blank(true);
      }

      if (/^\d+(\.\d+)?$/.test(text)) {
        var legacy = parseFloat(text);
        var migrated = blank(true);
        if (legacy > 0 && legacy <= memoryMaxSeconds) {
          migrated.bests[String(legacyLevel)] = legacy;
        }
        return migrated;
      }

      var parsed = null;
      try {
        parsed = JSON.parse(text);
      } catch (error) {
        return blank(true);
      }
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return blank(true);
      }

      var storedBests = {};
      var source = parsed.bests;
      if (source && typeof source === "object" && !Array.isArray(source)) {
        Object.keys(source).forEach(function (key) {
          if (!/^\d+$/.test(key)) {
            return;
          }
          var index = parseInt(key, 10);
          var value = parseFloat(source[key]);
          if (index < 1 || index > totalLevels) {
            return;
          }
          if (!isFinite(value) || value <= 0 || value > memoryMaxSeconds) {
            return;
          }
          storedBests[key] = value;
        });
      }

      return {
        level: clampLevel(parsed.level),
        bests: storedBests,
        stale: parsed.v !== memoryStoreVersion,
      };
    }

    function writeProgress() {
      try {
        localStorage.setItem(
          memoryBestKey,
          JSON.stringify({
            v: memoryStoreVersion,
            level: nextLevel,
            bests: bests,
          }),
        );
      } catch (error) {
        /* no-op: progress stays in memory for this page view */
      }
    }

    function levelBest(index) {
      var value = bests[String(index)];
      return isFinite(value) && value > 0 ? value : 0;
    }

    function currentLevel() {
      return memoryLevels[level - 1];
    }

    function renderBest() {
      var best = levelBest(level);
      bestEl.textContent = best
        ? t("bestTime", { s: best.toFixed(1) })
        : t("noBest");
    }

    function levelLabel() {
      return t("memoryLevelAria", { n: level, total: totalLevels });
    }

    function renderLevel() {
      var info = currentLevel();
      if (levelStat) {
        levelStat.value.textContent = level + "/" + totalLevels;
        levelStat.stat.setAttribute("aria-label", levelLabel());
      }
      grid.setAttribute("data-cols", String(info.cols));
      grid.setAttribute(
        "aria-label",
        t("memoryGridLevelLabel", { aria: levelLabel() }),
      );
    }

    /* The level HUD cell is injected here rather than hard-coded in the four
     * pages, so their game drawer markup stays byte-identical. */
    function buildLevelStat() {
      var panel = grid.closest ? grid.closest(".game-panel") : null;
      var hud = panel ? panel.querySelector(".game-hud") : null;
      if (!hud) {
        return null;
      }

      var stat = document.createElement("div");
      stat.className = "game-stat memory-level-stat";
      stat.setAttribute("role", "group");
      stat.setAttribute("aria-label", t("hudLevel"));

      var label = document.createElement("span");
      label.setAttribute("data-i18n", "hudLevel");
      label.textContent = t("hudLevel");

      var value = document.createElement("strong");
      value.id = "memoryLevel";

      stat.appendChild(label);
      stat.appendChild(value);
      hud.insertBefore(stat, hud.firstChild);
      return { stat: stat, value: value };
    }

    function setPrimaryLabel(key) {
      if (primaryLabel) {
        primaryLabel.setAttribute("data-i18n", key);
        primaryLabel.textContent = t(key);
      } else {
        startBtn.setAttribute("aria-label", t(key));
      }
    }

    function elapsed() {
      return roundStarted ? (Date.now() - startedAt) / 1000 : 0;
    }

    function tick() {
      timeEl.textContent = elapsed().toFixed(1) + "s";
    }

    /* A card's state is carried by its classes, and its aria-label says the same
     * thing in words: the turn itself is what the eye reads, the label is what
     * the screen reader gets. */
    function setCardLabel(card) {
      var n = card.getAttribute("data-position");
      var glyph = card.getAttribute("data-glyph");
      var state = t("cardDown", { n: n });
      if (card.classList.contains("matched")) {
        state = t("cardMatched", {
          n: n,
          glyph: glyph,
        });
      } else if (card.classList.contains("flipped")) {
        state = t("cardGlyph", {
          n: n,
          glyph: glyph,
        });
      }
      card.setAttribute("aria-label", state);
    }

    function cardHue(card) {
      var raw =
        card.style && card.style.getPropertyValue
          ? card.style.getPropertyValue("--mc-hue")
          : "";
      var value = parseInt(raw, 10);
      return isNaN(value) ? boardHue : value;
    }

    function svgNode(tag, attrs, cls) {
      var el = document.createElementNS(svgNS, tag);
      if (attrs) {
        for (var key in attrs) {
          if (
            Object.prototype.hasOwnProperty.call(attrs, key) &&
            attrs[key] !== null &&
            attrs[key] !== undefined
          ) {
            el.setAttribute(key, String(attrs[key]));
          }
        }
      }
      if (cls) {
        el.setAttribute("class", cls);
      }
      return el;
    }

    function drawIcon(name, cls, hue) {
      if (!art) {
        return null;
      }
      var node = art.icon(name, { hue: hue, size: "100%" });
      if (node && node.setAttribute && cls) {
        node.setAttribute("class", node.getAttribute("class") + " " + cls);
      }
      return node;
    }

    function drawSurface(cls) {
      if (!art) {
        return null;
      }
      var node = art.pattern("scales", { hue: boardHue, tile: 13 });
      if (node && node.setAttribute && cls) {
        node.setAttribute("class", node.getAttribute("class") + " " + cls);
      }
      return node;
    }

    /* The plate is drawn here instead of using art.tile because the card is 3:4
     * and art.tile is a square plate: stretched to a card's shape a square reads
     * as a rectangle again. Its parts carry classes, so the stylesheet - not
     * this file - decides what a card, a face-up card and a matched card are made
     * of, which is what keeps both themes working. */
    function buildPlate() {
      var plate = svgNode(
        "svg",
        { viewBox: "0 0 30 40", "aria-hidden": "true", focusable: "false" },
        "mc-plate",
      );
      plate.appendChild(
        svgNode("rect", { x: 0.7, y: 0.7, width: 28.6, height: 38.6, rx: 4.4 }, "mc-body"),
      );
      plate.appendChild(
        svgNode("rect", { x: 2.6, y: 2.6, width: 24.8, height: 34.8, rx: 3.2 }, "mc-well"),
      );
      plate.appendChild(
        svgNode("path", { d: "M4.2 4.2h21.6v5.4a3 3 0 0 1-3 3H7.2a3 3 0 0 1-3-3z" }, "mc-lit"),
      );
      plate.appendChild(
        svgNode("path", { d: "M4.2 30.4h21.6v3.2a2.8 2.8 0 0 1-2.8 2.8H7a2.8 2.8 0 0 1-2.8-2.8z" }, "mc-shade"),
      );
      plate.appendChild(
        svgNode("rect", { x: 2.6, y: 2.6, width: 24.8, height: 34.8, rx: 3.2 }, "mc-rim"),
      );
      return plate;
    }

    /* Face down: the deck's own back - a bevelled plate over a woven surface,
     * with the card-back crest and its four corner pips on top. */
    function buildBackFace() {
      var down = document.createElement("div");
      down.className = "mc-down";
      down.appendChild(buildPlate());
      var surface = document.createElement("div");
      surface.className = "mc-surface";
      var weave = drawSurface("mc-weave");
      if (weave) {
        surface.appendChild(weave);
      }
      down.appendChild(surface);
      var crest = drawIcon("card-back", "mc-crest", boardHue);
      if (crest) {
        down.appendChild(crest);
      }
      return down;
    }

    /* Face up: the same plate lit as a plaque, the glyph cut into its well, the
     * glyph's motif behind it and as a corner pip, and a seal that only appears
     * once the pair is locked in. */
    function buildFrontFace(glyph, face) {
      var up = document.createElement("div");
      up.className = "mc-up";
      up.appendChild(buildPlate());
      var mark = drawIcon(face.icon, "mc-mark", face.hue);
      if (mark) {
        up.appendChild(mark);
      }
      var value = document.createElement("span");
      value.className = "mc-glyph";
      value.setAttribute("aria-hidden", "true");
      value.textContent = glyph;
      up.appendChild(value);
      var pip = drawIcon(face.icon, "mc-pip", face.hue);
      if (pip) {
        up.appendChild(pip);
      }
      var seal = document.createElement("div");
      seal.className = "mc-seal";
      seal.setAttribute("aria-hidden", "true");
      var stamp = drawIcon("stamp", "mc-seal-mark", 142);
      if (stamp) {
        seal.appendChild(stamp);
      }
      up.appendChild(seal);
      return up;
    }

    /* A random subset of distinct glyphs: the same glyph never appears twice
     * on one board except as the pair it is there to make. */
    function pickGlyphs(count) {
      var pool = memoryGlyphs.slice();
      for (var i = pool.length - 1; i > 0; i -= 1) {
        var j = Math.floor(Math.random() * (i + 1));
        var swap = pool[i];
        pool[i] = pool[j];
        pool[j] = swap;
      }
      return pool.slice(0, count);
    }

    function buildBoard(dealt) {
      var info = currentLevel();
      var glyphs = pickGlyphs(info.pairs);
      var deck = glyphs.concat(glyphs);
      for (var i = deck.length - 1; i > 0; i -= 1) {
        var j = Math.floor(Math.random() * (i + 1));
        var swap = deck[i];
        deck[i] = deck[j];
        deck[j] = swap;
      }

      while (grid.firstChild) {
        grid.removeChild(grid.firstChild);
      }
      var cards = [];
      deck.forEach(function (glyph, index) {
        var face = memoryFaces[glyph] || memoryFaceFallback;
        var card = document.createElement("button");
        card.type = "button";
        card.className = "memory-card";
        card.setAttribute("data-glyph", glyph);
        card.setAttribute("data-position", String(index + 1));
        card.setAttribute(
          "aria-label",
          t("cardDown", { n: String(index + 1) }),
        );
        /* The hue is the face's only per-glyph style hook: the sheet paints the
         * plate, the ink and the glow from it. */
        card.style.setProperty("--mc-hue", String(face.hue));
        card.__fxCard = fx.cardEl(
          buildBackFace(),
          buildFrontFace(glyph, face),
        );
        card.appendChild(card.__fxCard);

        card.addEventListener("click", function () {
          flipCard(card);
        });
        grid.appendChild(card);
        cards.push(card);
      });

      firstCard = null;
      lockBoard = false;
      moves = 0;
      matchedPairs = 0;
      movesEl.textContent = "0";
      pairsEl.textContent = "0/" + info.pairs;
      timeEl.textContent = "0.0s";
      pairsEl.parentNode.classList.remove("is-good");
      renderLevel();
      renderBest();
      /* A deck arrives dealt, not printed: the cards drop in from the shoe. */
      fx.stagger(cards, { step: 24, kind: "drop", ms: 280 });
      if (dealt) {
        playSfx("select");
      }
    }

    function turnCard(card, turned) {
      fx.flipCard(card.__fxCard, turned);
    }

    function startRound() {
      roundStarted = true;
      startedAt = Date.now();
      timerId = window.setInterval(tick, 100);
      /* The clock is the one number that is always running, so the board says
       * out loud when it starts. */
      timeEl.parentNode.classList.add("is-ticking");
      fx.pop(timeEl, { scale: 1.16, ms: 240 });
      playSfx("tick");
    }

    function markMatch(card) {
      card.classList.remove("flipped");
      card.classList.add("matched");
      setCardLabel(card);
    }

    /* Everything the player did: the pair locks in with a ring, a spray, a
     * punch and the running pair count rising at the card that finished it. */
    function celebratePair(first, second) {
      var hue = cardHue(second);
      markMatch(first);
      markMatch(second);
      playSfx("match");
      fx.ring(second, { hue: hue });
      fx.ring(first, { hue: cardHue(first) });
      fx.burst(second, { kind: "star", count: 10, hue: hue });
      fx.burst(first, { kind: "star", count: 8, hue: cardHue(first) });
      fx.pop(second, { scale: 1.12, ms: 300 });
      fx.pop(first, { scale: 1.08, ms: 300 });
      fx.flash(grid, { hue: hue, ms: 420 });
      fx.floatText(
        second,
        matchedPairs + "/" + currentLevel().pairs,
        { kind: "good" },
      );
    }

    function rejectPair(first, second) {
      playSfx("miss");
      fx.shake(first, { dist: 6 });
      fx.shake(second, { dist: 6 });
      fx.flash(first, { hue: 2, ms: 340 });
      fx.flash(second, { hue: 2, ms: 340 });
    }

    function flipCard(card) {
      var info = currentLevel();

      if (
        lockBoard ||
        card.classList.contains("flipped") ||
        card.classList.contains("matched")
      ) {
        return;
      }

      if (!roundStarted) {
        startRound();
      }

      card.classList.add("flipped");
      turnCard(card, true);
      fx.pop(card, { scale: 1.05, ms: 200 });
      playSfx("flip");
      setCardLabel(card);

      if (!firstCard) {
        firstCard = card;
        card.classList.add("is-pick");
        fx.ring(card, { hue: cardHue(card) });
        return;
      }

      var pair = firstCard;
      firstCard = null;
      pair.classList.remove("is-pick");
      moves += 1;
      fx.countUp(movesEl, moves - 1, moves);

      if (pair.getAttribute("data-glyph") === card.getAttribute("data-glyph")) {
        matchedPairs += 1;
        pairsEl.parentNode.classList.toggle(
          "is-good",
          matchedPairs === info.pairs,
        );
        fx.countUp(pairsEl, matchedPairs - 1, matchedPairs, {
          format: function (value) {
            return value + "/" + info.pairs;
          },
        });
        celebratePair(pair, card);

        if (matchedPairs === info.pairs) {
          endRound(true);
        }
        return;
      }

      rejectPair(pair, card);
      lockBoard = true;
      mismatchTimer = window.setTimeout(function () {
        mismatchTimer = null;
        pair.classList.remove("flipped");
        card.classList.remove("flipped");
        turnCard(pair, false);
        turnCard(card, false);
        setCardLabel(pair);
        setCardLabel(card);
        playSfx("flip");
        lockBoard = false;
      }, 700);
    }

    /* Presentation only: the round's real score is still the stored time and the
     * counted moves. The star row reads off how much of the deck was wasted -
     * a perfect round is one move per pair - because the guide promises that
     * fewer moves earn more stars. */
    function starJudgement() {
      var ideal = currentLevel().pairs;
      if (moves <= ideal + Math.ceil(ideal * 0.4)) {
        return 3;
      }
      return moves <= ideal * 2 ? 2 : 1;
    }

    /* fx.ceremony hands back its own dismiss, so a reshuffle or a tab switch can
     * take the scrim off instead of waiting for its own timeout. */
    function dismissCeremony() {
      var dismiss = ceremonyDismiss;
      ceremonyDismiss = null;
      if (typeof dismiss === "function") {
        dismiss();
      }
    }

    /* A round ends as a ceremony over the board, with the result line kept as
     * the live-region copy of what happened. */
    function ceremonyLines(seconds, isBest, finalLevel) {
      var lines = [
        t("memoryCleared", {
          s: seconds.toFixed(1),
          n: moves,
          unit: moves === 1 ? t("unitMove") : t("unitMoves"),
        }),
      ];
      if (isBest) {
        lines.push(t("newBest"));
      } else if (levelBest(level)) {
        lines.push(t("bestTime", { s: levelBest(level).toFixed(1) }));
      }
      lines.push(
        finalLevel
          ? t("memoryAllComplete", { total: totalLevels })
          : t("memoryNextUp", { n: level + 1, total: totalLevels }),
      );
      return lines;
    }

    function runCeremony(seconds, isBest, finalLevel) {
      ceremonyDismiss =
        fx.ceremony(panelEl || grid.parentNode || grid, {
          tone: "win",
          stars: starJudgement(),
          title: t("memoryLevelCleared", { n: level, total: totalLevels }),
          lines: ceremonyLines(seconds, isBest, finalLevel),
        }) || null;
    }

    function endRound(finished) {
      if (!roundStarted) {
        return;
      }

      var seconds = elapsed();
      roundStarted = false;
      window.clearInterval(timerId);
      timerId = null;
      timeEl.textContent = seconds.toFixed(1) + "s";
      timeEl.parentNode.classList.remove("is-ticking");

      var finalLevel = level >= totalLevels;
      var best = levelBest(level);
      var isBest = finished && seconds > 0 && (best === 0 || seconds < best);
      var message =
        t("memoryLevelCleared", { n: level, total: totalLevels }) +
        " " +
        t("memoryCleared", {
          s: seconds.toFixed(1),
          n: moves,
          unit: moves === 1 ? t("unitMove") : t("unitMoves"),
        });

      if (isBest) {
        bests[String(level)] = seconds;
        message += " " + t("newBest");
      }

      if (finalLevel) {
        message += " " + t("memoryAllComplete", { total: totalLevels });
      } else {
        message +=
          " " +
          t("memoryNextUp", { n: level + 1, total: totalLevels });
      }

      /* The cleared board stays on screen until the player advances, but the
       * rung after it is already the resume point, so a reload lands there. */
      levelCleared = true;
      nextLevel = finalLevel ? 1 : level + 1;
      writeProgress();
      setPrimaryLabel(finalLevel ? "btnReplayLevels" : "btnNextLevel");

      petNotifyGame(isBest);

      resultEl.textContent = message;
      renderBest();
      logAction(t("logMemory", { s: seconds.toFixed(1) }));

      /* The last pair lands the board, the best chip punches, and the verb that
       * is now affordable catches the light before the ceremony covers it. */
      fx.jolt(grid, { dist: 3 });
      if (isBest) {
        fx.pop(bestEl, { scale: 1.12, ms: 300 });
      }
      fx.sweep(startBtn);
      runCeremony(seconds, isBest, finalLevel);
      startBtn.focus();
    }

    /* Moves the player onto the rung the finished round unlocked (or back to
     * the first rung after the last one). */
    function advanceLevel() {
      level = nextLevel;
      resetBoard(true);
      if (levelStat) {
        fx.pop(levelStat.value, { scale: 1.2, ms: 320 });
      }
    }

    function resetBoard(dealt) {
      window.clearTimeout(mismatchTimer);
      mismatchTimer = null;
      window.clearInterval(timerId);
      timerId = null;
      roundStarted = false;
      startedAt = 0;
      levelCleared = false;
      timeEl.parentNode.classList.remove("is-ticking");
      dismissCeremony();
      setPrimaryLabel("btnNewShuffle");
      buildBoard(dealt);
      resultEl.textContent = t("memoryPrompt");
    }

    startBtn.addEventListener("click", function () {
      if (levelCleared) {
        advanceLevel();
      } else {
        resetBoard(true);
      }
      startBtn.focus();
    });

    App.quietResetMemory = function () {
      /* A hidden panel keeps neither the clock nor the ceremony. */
      dismissCeremony();
      if (!roundStarted) {
        return;
      }

      resetBoard(false);
    };

    buildBoard(false);
    resultEl.textContent = t("memoryPrompt");
    if (progress.stale) {
      writeProgress();
    }
  }

  /* Exported for the other modules. */
  App.initMemoryGame = initMemoryGame;
})(window.CapitalConvert = window.CapitalConvert || {});
