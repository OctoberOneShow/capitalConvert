/* Letter Vault - The daily five-letter word lock in the shared game drawer.

 * The panel is built as a bank door: a riveted steel plate, a combination dial
 * that throws one notch per guess, a hex-bolt meter for the six tries, and two
 * leaves that split apart when the word is cracked. A guess is not a row of
 * recoloured squares - each tile is a two-face plate that turns over on its own
 * delay, so a submitted word lands as a wave travelling left to right. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  var localStorage = App.storage;
  var t = App.t;
  var getElement = App.getElement;
  var logAction = App.logAction;
  var petNotifyGame = App.petNotifyGame;
  var vaultStreakKey = "vault-streak";
  var vaultBestKey = "vault-best-streak";

  /* Illustration helpers. tools/static-checks.js proves the duplicate counting by
   * evaluating this file from the width constant down to the init export as a
   * standalone function body, so everything drawn lives above that line and
   * touches App.art / App.fx only when it is called, never at load. */
  var vaultNs = "http://www.w3.org/2000/svg";

  function vaultSvg(tag, attrs) {
    var node = document.createElementNS(vaultNs, tag);
    for (var key in attrs) {
      if (Object.prototype.hasOwnProperty.call(attrs, key)) {
        node.setAttribute(key, String(attrs[key]));
      }
    }
    return node;
  }

  /* A verdict is a silhouette before it is a colour: correct rides proud of the
   * plate with a bolt thrown at each corner, present is half seated behind a
   * dashed keyline, absent sinks into the door and is struck through. The hues
   * are decoration on top of three shapes that already differ. */
  var vaultStyle = {
    green: { state: "glow", hue: 145, sat: 72, tone: "" },
    yellow: { state: "up", hue: 42, sat: 78, tone: "" },
    gray: { state: "down", hue: 214, sat: 14, tone: "deep" },
  };
  var vaultCapStyle = { state: "up", hue: 200, sat: 24, tone: "" };
  var vaultWellStyle = { state: "empty", hue: 200, sat: 18, tone: "" };

  function vaultPlate(style) {
    var art = App.art;
    if (art && typeof art.tile === "function") {
      return art.tile({
        hue: style.hue,
        sat: style.sat,
        tone: style.tone || undefined,
        state: style.state,
        cls: "vault-plate",
      });
    }
    var bare = document.createElement("span");
    bare.className = "art-tile vault-plate";
    return bare;
  }

  function vaultIcon(name, hue, cls) {
    var art = App.art;
    if (art && typeof art.icon === "function") {
      return art.icon(name, { hue: hue, cls: cls });
    }
    var bare = document.createElement("span");
    bare.className = "art-icon " + cls;
    return bare;
  }

  /* The dial: a toothed ring on a pointer arm, drawn on the same 24 grid as the
   * art bank so its line weight matches the rest of the panel. The triangle is
   * the fixed index mark, outside the rotating group. */
  function vaultDial() {
    var svg = vaultSvg("svg", {
      viewBox: "0 0 24 24",
      class: "vault-dial",
      "aria-hidden": "true",
      focusable: "false",
    });
    var face = vaultSvg("g", { class: "vault-dial-face" });
    face.appendChild(
      vaultSvg("circle", {
        cx: 12, cy: 12, r: 9, fill: "none",
        stroke: "currentColor", "stroke-width": 1.4,
      }),
    );
    for (var i = 0; i < 8; i += 1) {
      var a = (i * Math.PI) / 4;
      face.appendChild(
        vaultSvg("line", {
          x1: 12 + Math.cos(a) * 6.4, y1: 12 + Math.sin(a) * 6.4,
          x2: 12 + Math.cos(a) * 9, y2: 12 + Math.sin(a) * 9,
          stroke: "currentColor", "stroke-width": 1.4, "stroke-linecap": "round",
        }),
      );
    }
    svg.appendChild(face);
    svg.appendChild(
      vaultSvg("circle", {
        cx: 12, cy: 12, r: 3, fill: "none",
        stroke: "currentColor", "stroke-width": 1.2, opacity: 0.72,
      }),
    );
    svg.appendChild(vaultSvg("path", { d: "M12 1.4 14.2 6h-4.4z", fill: "currentColor" }));
    return { node: svg, face: face };
  }

  /* The door seen through the grid: concentric machined rings, a rim of bolt
   * holes and the seam the leaves split along. The tiles sit on top of it, so it
   * reads as the plate the game is bolted to rather than as content. */
  function vaultMachine() {
    var svg = vaultSvg("svg", {
      viewBox: "0 0 100 100",
      preserveAspectRatio: "xMidYMid slice",
      class: "vault-machine",
      "aria-hidden": "true",
      focusable: "false",
    });
    var rings = [45, 34, 23];
    for (var r = 0; r < rings.length; r += 1) {
      svg.appendChild(
        vaultSvg("circle", {
          cx: 50, cy: 50, r: rings[r], fill: "none",
          stroke: "rgba(255,255,255," + (0.08 - r * 0.02).toFixed(3) + ")",
          "stroke-width": r === 0 ? 1.6 : 1,
        }),
      );
    }
    for (var i = 0; i < 24; i += 1) {
      var a = (i * Math.PI) / 12;
      svg.appendChild(
        vaultSvg("circle", {
          cx: 50 + Math.cos(a) * 45, cy: 50 + Math.sin(a) * 45, r: 1.05,
          fill: "rgba(0,0,0,0.36)", stroke: "rgba(255,255,255,0.16)", "stroke-width": 0.4,
        }),
      );
    }
    svg.appendChild(
      vaultSvg("line", {
        x1: 50, y1: 3, x2: 50, y2: 97,
        stroke: "rgba(0,0,0,0.42)", "stroke-width": 1.3,
      }),
    );
    return svg;
  }

  /* Answers only. Guesses accept any five letters - the honest shortcut
   * that keeps a full dictionary out of a build-free repo. */
  var vaultWidth = 5;
  var vaultRows = 6;
  var vaultWords = [
    "vault", "glyph", "merge", "parse", "regex", "clean", "swift", "brave",
    "cider", "delta", "ember", "flame", "grape", "house", "ivory", "jolly",
    "koala", "lemon", "mango", "noble", "ocean", "piano", "queen", "raven",
    "stone", "tiger", "unity", "vivid", "whale", "yacht", "zebra", "amber",
    "bloom", "crisp", "dwell", "eager", "fiber", "glide", "haste", "index",
    "joker", "kneel", "lunar", "magic", "nerve", "onion", "prism", "quilt",
    "rally", "royal", "solar", "truce", "venom", "woven", "xenon", "yield",
    "zonal", "actor", "badge", "charm", "drift", "eagle", "frost", "gauge",
    "honey", "input", "jewel", "knack", "laser", "maple", "novel", "olive",
    "pearl", "query", "radio", "satin", "token", "usual", "valid", "wagon",
    "youth", "zesty", "beach", "cloud", "dance", "field", "grain", "heart",
    "knife", "light", "music", "north", "orbit", "pilot", "quest", "shine",
    "voice", "watch", "world", "write", "young", "alarm", "bench", "craft",
    "doubt", "elect", "frame", "giant", "hover", "image", "jelly", "karma",
    "label", "major", "night", "opera", "panel", "quote", "ruler", "shift",
    "table", "uncle", "video", "yearn", "acute", "brake", "civic", "dizzy",
    "elite", "focal", "genre", "humor", "ideal", "knave", "loyal", "modal",
    "nifty", "picky", "quirk", "risky", "squad", "tidal", "unify", "vocal",
    "wrist", "witty", "yummy", "blend", "cargo", "dummy", "equip", "flake",
    "globe", "inlet", "lobby", "meter", "niche", "poker", "sleek", "tense",
    "vigor", "agile", "bored", "crane", "debut", "feast", "glory", "joint",
    "lucky", "merry", "nasty", "organ", "pulse", "storm", "tough", "unbox",
    "vapor", "whiff", "candy", "dairy", "fairy", "grill", "happy", "judge",
    "melon", "panda", "sushi", "tulip", "villa", "water", "aisle", "baste",
    "cabin", "erase", "flask", "guppy", "hedge", "infer", "kiosk", "mocha",
    "nurse", "otter", "pouch", "quack", "rhino", "skate", "tooth", "alpha",
    "bagel", "clove", "drape", "elbow", "greet", "haven", "juice", "kayak",
    "linen", "nacho", "panda", "solar", "timid", "uncut", "vaunt", "whine",
    "yodel", "basil", "cress", "dingo", "fjord", "gully", "hyena", "igloo",
    "jaunt", "koala", "llama", "moist", "nacho",
    "prowl", "quasi", "rogue", "sulky", "tacky", "udder", "vista", "waltz",
    "yeast", "amble", "brunt", "cleft", "dowel", "epoch", "filth",
    "gaudy", "hoard", "impel", "jaunt", "krill", "lucid", "mucus", "nadir",
    "ochre", "prank", "quell", "rouge", "slump", "talon", "udder", "venal",
    "waltz", "xenon", "yacht", "zonal",
  ];
  var vaultRowsKeys = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];

  /* Clean the roster down: five lowercase letters only, deduped. */
  var vaultPool = (function () {
    var seen = {};
    var list = [];
    vaultWords.forEach(function (word) {
      var clean = String(word).toLowerCase().replace(/[^a-z]/g, "");
      if (clean.length === vaultWidth && !seen[clean]) {
        seen[clean] = true;
        list.push(clean);
      }
    });
    return list;
  })();

  function vaultTodayKey() {
    var now = new Date();
    return now.getFullYear() + "-" + (now.getMonth() + 1) + "-" + now.getDate();
  }

  /* Same date, same vault - deterministic across every page. */
  function vaultDailyIndex() {
    var key = vaultTodayKey();
    var hash = 0;
    for (var i = 0; i < key.length; i += 1) {
      hash = (hash * 31 + key.charCodeAt(i)) % 999331;
    }
    return hash % vaultPool.length;
  }

  function vaultLetterStatus(answer, guess) {
    /* Wordle counting: exact matches first, then colour the leftovers
     * only while copies of the letter remain unclaimed. */
    var status = [];
    var left = {};
    var i;
    for (i = 0; i < vaultWidth; i += 1) {
      if (guess[i] === answer[i]) {
        status[i] = "green";
      } else {
        status[i] = "gray";
        left[answer[i]] = (left[answer[i]] || 0) + 1;
      }
    }
    for (i = 0; i < vaultWidth; i += 1) {
      if (status[i] !== "green" && left[guess[i]]) {
        status[i] = "yellow";
        left[guess[i]] -= 1;
      }
    }
    return status;
  }

  function initVaultGame() {
    var boardEl = getElement("vaultBoard");
    var kbEl = getElement("vaultKb");
    var guessEl = getElement("vaultGuessStat");
    var streakEl = getElement("vaultStreakStat");
    var resultEl = getElement("vaultResult");
    var dailyBtn = getElement("vaultDailyBtn");
    var newBtn = getElement("vaultNewBtn");
    var bestEl = getElement("vaultBest");
    if (
      !boardEl ||
      !kbEl ||
      !guessEl ||
      !streakEl ||
      !resultEl ||
      !dailyBtn ||
      !newBtn ||
      !bestEl
    ) {
      return;
    }

    var fx = App.fx || {};
    var panelEl = boardEl.parentNode;
    /* Reveal timing lives here and is pushed into the sheet as custom
     * properties, so the CSS wave and the JS callbacks can never drift apart. */
    var vaultStep = 120;
    var vaultFlip = 330;

    var answer = "";
    var guesses = [];
    var current = "";
    var over = false;
    var isNewBest = false;
    var tileRows = [];
    var rowEls = [];
    var keyNodes = {};
    var pipNodes = [];
    var dialFace = null;
    var dialSpin = null;
    var lockSlot = null;
    var pending = [];
    var ceremonyDismiss = null;
    var shownGuesses = -1;
    var shownStreak = -1;

    function motionOff() {
      if (typeof App.isMotionOff === "function") {
        return App.isMotionOff();
      }
      return document.documentElement.getAttribute("data-motion") === "off";
    }

    function play(name) {
      if (typeof App.playSfx === "function") {
        App.playSfx(name);
      }
    }

    function beat(name, el, opts) {
      if (typeof fx[name] === "function") {
        fx[name](el, opts);
      }
    }

    function countTo(el, from, to, format) {
      if (typeof fx.countUp === "function") {
        fx.countUp(el, from, to, { format: format });
      } else {
        el.textContent = format ? format(to) : String(to);
      }
    }

    /* A one-shot that belongs to the game, not to the page: every id is tracked
     * so a new round - or the shell pausing the drawer - drops the work that has
     * not landed yet instead of firing it over a board that moved on. */
    function later(ms, fn) {
      if (!ms || motionOff()) {
        fn();
        return;
      }
      var id = setTimeout(function () {
        var at = pending.indexOf(id);
        if (at !== -1) {
          pending.splice(at, 1);
        }
        fn();
      }, ms);
      pending.push(id);
    }

    function clearPending() {
      for (var i = 0; i < pending.length; i += 1) {
        clearTimeout(pending[i]);
      }
      pending = [];
    }

    /* The two-face plate. fx.cardEl builds the 3D plumbing, the per-column
     * --vault-delay in the sheet staggers the turn across the row. */
    function vaultCard(front, back) {
      if (typeof fx.cardEl === "function") {
        return fx.cardEl(front, back);
      }
      var outer = document.createElement("div");
      outer.className = "fx-card";
      var inner = document.createElement("div");
      inner.className = "fx-card-inner";
      var a = document.createElement("div");
      a.className = "fx-face fx-face-back";
      a.appendChild(front);
      var b = document.createElement("div");
      b.className = "fx-face fx-face-front";
      b.appendChild(back);
      inner.appendChild(a);
      inner.appendChild(b);
      outer.appendChild(inner);
      return outer;
    }

    function turnTile(tile) {
      if (typeof fx.flipCard === "function") {
        fx.flipCard(tile, true);
      } else {
        tile.classList.add("is-turned");
      }
    }

    function swapPlate(holder, oldPlate, style) {
      var plate = vaultPlate(style);
      holder.replaceChild(plate, oldPlate);
      return plate;
    }

    function makeCell(row, col) {
      var tile = document.createElement("span");
      tile.className = "vault-tile";
      tile.style.setProperty("--vault-delay", col * vaultStep + "ms");

      var typeFace = document.createElement("div");
      typeFace.className = "vault-face vault-face-type";
      var typePlate = vaultPlate(vaultWellStyle);
      var typeLetter = document.createElement("span");
      typeLetter.className = "vault-letter";
      typeFace.appendChild(typePlate);
      typeFace.appendChild(typeLetter);

      var resultFace = document.createElement("div");
      resultFace.className = "vault-face vault-face-result";
      var resultPlate = vaultPlate(vaultWellStyle);
      var resultLetter = document.createElement("span");
      resultLetter.className = "vault-letter";
      var mark = document.createElement("span");
      mark.className = "vault-mark";
      resultFace.appendChild(resultPlate);
      resultFace.appendChild(resultLetter);
      resultFace.appendChild(mark);

      tile.appendChild(vaultCard(typeFace, resultFace));
      tile.__vault = {
        typeFace: typeFace,
        typePlate: typePlate,
        typeLetter: typeLetter,
        filled: false,
        resultFace: resultFace,
        resultPlate: resultPlate,
        resultLetter: resultLetter,
      };
      return tile;
    }

    function buildCrown() {
      var bar = document.createElement("div");
      bar.className = "vault-crown";

      var dialSlot = document.createElement("div");
      dialSlot.className = "vault-dial-spin";
      var dial = vaultDial();
      dialFace = dial.face;
      dialSpin = dialSlot;
      dialSlot.appendChild(dial.node);

      var meter = document.createElement("div");
      meter.className = "vault-pips";
      pipNodes = [];
      for (var i = 0; i < vaultRows; i += 1) {
        var pip = document.createElement("span");
        pip.className = "vault-pip";
        meter.appendChild(pip);
        pipNodes.push(pip);
      }

      lockSlot = document.createElement("div");
      lockSlot.className = "vault-lock-slot";
      setLockMark("lock");

      bar.appendChild(dialSlot);
      bar.appendChild(meter);
      bar.appendChild(lockSlot);
      return bar;
    }

    function setLockMark(name) {
      if (!lockSlot) {
        return;
      }
      lockSlot.textContent = "";
      lockSlot.appendChild(vaultIcon(name, name === "key" ? 46 : 198, "vault-lock-icon"));
      lockSlot.setAttribute("data-mark", name);
      if (name === "key") {
        beat("pop", lockSlot, { scale: 1.4, ms: 340 });
      }
    }

    function buildBoard() {
      boardEl.textContent = "";
      boardEl.classList.remove("is-open", "is-locked");
      boardEl.style.setProperty("--vault-step", vaultStep + "ms");
      boardEl.style.setProperty("--vault-flip", vaultFlip + "ms");
      tileRows = [];
      rowEls = [];

      boardEl.appendChild(vaultMachine());

      var light = document.createElement("div");
      light.className = "vault-light";
      boardEl.appendChild(light);

      boardEl.appendChild(buildCrown());

      for (var row = 0; row < vaultRows; row += 1) {
        var rowEl = document.createElement("div");
        rowEl.className = "vault-row";
        var tiles = [];
        for (var col = 0; col < vaultWidth; col += 1) {
          var tile = makeCell(row, col);
          rowEl.appendChild(tile);
          tiles.push(tile);
        }
        boardEl.appendChild(rowEl);
        tileRows.push(tiles);
        rowEls.push(rowEl);
      }

      /* The door leaves ride above the grid and are invisible until the vault is
       * cracked; the sheet closes them, holds, then bursts them apart. */
      var leaves = document.createElement("div");
      leaves.className = "vault-leaves";
      var left = document.createElement("div");
      left.className = "vault-leaf is-left";
      var right = document.createElement("div");
      right.className = "vault-leaf is-right";
      leaves.appendChild(left);
      leaves.appendChild(right);
      boardEl.appendChild(leaves);

      var all = [];
      for (var r = 0; r < tileRows.length; r += 1) {
        all = all.concat(tileRows[r]);
      }
      beat("stagger", all, { step: 18, kind: "drop" });
    }

    function buildKeyboard() {
      kbEl.textContent = "";
      keyNodes = {};
      vaultRowsKeys.forEach(function (letters) {
        var line = document.createElement("div");
        line.className = "vault-kb-row";
        for (var i = 0; i < letters.length; i += 1) {
          (function (letter) {
            var key = document.createElement("button");
            key.type = "button";
            key.className = "vault-key";
            key.textContent = letter;
            key.setAttribute("aria-label", letter);
            key.addEventListener("click", function () {
              typeLetter(letter);
            });
            line.appendChild(key);
            keyNodes[letter] = key;
          })(letters[i]);
        }
        kbEl.appendChild(line);
      });
      var action = document.createElement("div");
      action.className = "vault-kb-row";
      var enter = document.createElement("button");
      enter.type = "button";
      enter.className = "vault-key is-wide";
      enter.textContent = t("vaultEnter");
      enter.appendChild(vaultIcon("arrow", 198, "vault-key-icon"));
      enter.addEventListener("click", function () {
        submitGuess();
      });
      var back = document.createElement("button");
      back.type = "button";
      back.className = "vault-key is-wide";
      back.textContent = t("vaultBack");
      back.appendChild(vaultIcon("arrow", 198, "vault-key-icon is-flipped"));
      back.addEventListener("click", function () {
        deleteLetter();
      });
      action.appendChild(enter);
      action.appendChild(back);
      kbEl.appendChild(action);
    }

    function paintCurrentRow() {
      var row = Math.min(guesses.length, vaultRows - 1);
      for (var col = 0; col < vaultWidth; col += 1) {
        var tile = tileRows[row][col];
        var cell = tile.__vault;
        var ch = current.charAt(col) || "";
        cell.typeLetter.textContent = ch;
        tile.classList.toggle("is-filled", !!ch);
        if (cell.filled !== !!ch) {
          cell.filled = !!ch;
          cell.typePlate = swapPlate(cell.typeFace, cell.typePlate, ch ? vaultCapStyle : vaultWellStyle);
        }
      }
      markActiveRow();
    }

    function markActiveRow() {
      var active = over ? -1 : Math.min(guesses.length, vaultRows - 1);
      for (var i = 0; i < vaultRows; i += 1) {
        rowEls[i].classList.toggle("is-active", i === active);
        rowEls[i].classList.toggle("is-done", i < guesses.length);
      }
    }

    function readInt(key) {
      var value = parseInt(localStorage.getItem(key), 10);
      return isNaN(value) ? 0 : value;
    }

    function guessText(value) {
      return value + "/" + vaultRows;
    }

    function renderStats() {
      var used = guesses.length;
      if (shownGuesses !== used) {
        countTo(guessEl, shownGuesses < 0 ? 0 : shownGuesses, used, guessText);
        beat("pop", guessEl, { scale: 1.12, ms: 200 });
        shownGuesses = used;
      } else {
        guessEl.textContent = guessText(used);
      }
      for (var i = 0; i < pipNodes.length; i += 1) {
        var spent = i < used;
        if (pipNodes[i].classList.contains("is-spent") !== spent) {
          pipNodes[i].classList.toggle("is-spent", spent);
          if (spent) {
            beat("pop", pipNodes[i], { scale: 1.5, ms: 260 });
          }
        }
        pipNodes[i].classList.toggle("is-last", used === vaultRows - 1 && i === vaultRows - 1);
      }

      var streak = readInt(vaultStreakKey);
      if (shownStreak !== streak) {
        countTo(streakEl, shownStreak < 0 ? 0 : shownStreak, streak);
        shownStreak = streak;
      }
      streakEl.parentNode.classList.toggle("is-good", streak > 0);
      guessEl.parentNode.classList.toggle("is-warn", !over && used >= vaultRows - 1);

      var best = readInt(vaultBestKey);
      bestEl.textContent = "";
      bestEl.appendChild(vaultIcon(best ? "crown" : "star", best ? 46 : 210, "vault-best-icon"));
      var label = document.createElement("span");
      label.textContent = best ? t("vaultBestLine", { n: best }) : t("noBest");
      bestEl.appendChild(label);
    }

    function startRound(useDaily) {
      clearPending();
      if (ceremonyDismiss) {
        ceremonyDismiss();
        ceremonyDismiss = null;
      }
      guesses = [];
      current = "";
      over = false;
      shownGuesses = -1;
      shownStreak = -1;
      answer = useDaily
        ? vaultPool[vaultDailyIndex()]
        : vaultPool[Math.floor(Math.random() * vaultPool.length)];
      buildBoard();
      buildKeyboard();
      renderStats();
      if (dialFace) {
        dialFace.style.transform = "rotate(0deg)";
      }
      dailyBtn.setAttribute("aria-pressed", String(useDaily));
      newBtn.setAttribute("aria-pressed", String(!useDaily));
      resultEl.classList.remove("is-win", "is-lose");
      resultEl.textContent = t(useDaily ? "vaultPromptDaily" : "vaultPromptRandom");
      beat("sweep", dailyBtn);
    }

    function pressKey(letter) {
      var key = keyNodes[letter];
      if (key) {
        beat("pop", key, { scale: 1.22, ms: 190 });
      }
    }

    function typeLetter(letter) {
      if (over || current.length >= vaultWidth) {
        return;
      }
      current += letter;
      paintCurrentRow();
      var row = Math.min(guesses.length, vaultRows - 1);
      beat("pop", tileRows[row][current.length - 1].__vault.typeLetter, { scale: 1.45, ms: 220 });
      pressKey(letter);
      play("tap");
    }

    function deleteLetter() {
      if (over || !current.length) {
        return;
      }
      var at = current.length - 1;
      current = current.slice(0, -1);
      paintCurrentRow();
      var row = Math.min(guesses.length, vaultRows - 1);
      beat("pop", tileRows[row][at], { scale: 1.07, ms: 180 });
      play("click");
    }

    function markKey(letter, status) {
      var key = keyNodes[letter];
      if (!key) {
        return;
      }
      var rank = { green: 3, yellow: 2, gray: 1 };
      var now = key.classList.contains("is-green")
        ? 3
        : key.classList.contains("is-yellow")
          ? 2
          : key.classList.contains("is-gray")
            ? 1
            : 0;
      /* A key is stamped "used" whatever the verdict says; the verdict can only
       * ever upgrade, and the sheet draws used keys flat with a corner tick. */
      key.classList.add("is-used");
      if (rank[status] > now) {
        key.classList.remove("is-green", "is-yellow", "is-gray");
        key.classList.add("is-" + status);
        if (now !== rank[status]) {
          beat("pop", key, { scale: 1.2, ms: 240 });
        }
      }
    }

    function revealRow(row, guess, status) {
      var greens = 0;
      var yellows = 0;
      for (var col = 0; col < vaultWidth; col += 1) {
        var tile = tileRows[row][col];
        var cell = tile.__vault;
        var state = status[col];
        cell.resultLetter.textContent = guess.charAt(col);
        cell.resultPlate = swapPlate(cell.resultFace, cell.resultPlate, vaultStyle[state]);
        tile.classList.add("is-" + state);
        if (state === "green") {
          greens += 1;
        } else if (state === "yellow") {
          yellows += 1;
        }
        markKey(guess.charAt(col), state);
        turnTile(tile);
      }
      return { greens: greens, yellows: yellows };
    }

    /* The row has landed once the last tile finishes its turn - the same
     * arithmetic the sheet uses for its staggered delay. */
    function settleMs() {
      return (vaultWidth - 1) * vaultStep + vaultFlip + 120;
    }

    function rowVoice(score) {
      if (score.greens > 0) {
        play("match");
      } else if (score.yellows > 0) {
        play("score");
      } else {
        play("miss");
      }
    }

    function starsFor(rows) {
      return rows <= 2 ? 3 : rows <= 4 ? 2 : 1;
    }

    function holdCeremony(tone, stars, title, lines) {
      if (typeof fx.ceremony !== "function") {
        return;
      }
      ceremonyDismiss = fx.ceremony(panelEl, {
        tone: tone,
        stars: stars,
        title: title,
        lines: lines,
      }) || null;
    }

    function openVault(rows, streak, score) {
      rowVoice(score);
      boardEl.classList.add("is-open");
      boardEl.classList.remove("is-locked");
      setLockMark("key");
      if (dialSpin) {
        dialSpin.classList.add("is-spinning");
      }
      play("hit");
      beat("burst", lockSlot, { kind: "spark", count: 16, hue: 46 });
      beat("ring", tileRows[rows - 1][vaultWidth - 1], { hue: 145 });
      later(Math.round(vaultFlip * 2.2), function () {
        holdCeremony("win", starsFor(rows), answer.toUpperCase(), [
          t("vaultWin", { n: rows, s: streak }),
        ]);
        if (isNewBest) {
          beat("ring", bestEl, { hue: 46 });
        }
      });
    }

    function closeUp(score) {
      rowVoice(score);
      boardEl.classList.add("is-locked");
      beat("flash", boardEl, { hue: 0 });
      beat("shake", boardEl, { dist: 5 });
      later(vaultFlip, function () {
        holdCeremony("lose", 0, answer.toUpperCase(), [
          t("vaultLoss", { word: answer.toUpperCase() }),
        ]);
      });
    }

    function submitGuess() {
      if (over) {
        return;
      }
      if (current.length < vaultWidth) {
        resultEl.textContent = t("vaultTooShort");
        beat("shake", rowEls[Math.min(guesses.length, vaultRows - 1)], { dist: 7 });
        play("wrong");
        return;
      }
      var guess = current;
      var status = vaultLetterStatus(answer, guess);
      var score = revealRow(guesses.length, guess, status);
      guesses.push(guess);
      current = "";
      paintCurrentRow();
      renderStats();
      if (dialFace) {
        dialFace.style.transform = "rotate(" + guesses.length * 47 + "deg)";
      }

      if (guess === answer) {
        over = true;
        isNewBest = false;
        var streak = readInt(vaultStreakKey) + 1;
        localStorage.setItem(vaultStreakKey, String(streak));
        if (streak > readInt(vaultBestKey)) {
          localStorage.setItem(vaultBestKey, String(streak));
          isNewBest = true;
        }
        resultEl.textContent = t("vaultWin", { n: guesses.length, s: streak });
        logAction(t("logVault", { w: guess.toUpperCase() }));
        petNotifyGame(true);
        renderStats();
        markActiveRow();
        resultEl.classList.add("is-win");
        later(settleMs(), function () {
          openVault(guesses.length, streak, score);
        });
        return;
      }
      if (guesses.length >= vaultRows) {
        over = true;
        localStorage.setItem(vaultStreakKey, "0");
        resultEl.textContent = t("vaultLoss", { word: answer.toUpperCase() });
        logAction(t("logVault", { w: "\u2014" }));
        petNotifyGame(false);
        renderStats();
        markActiveRow();
        resultEl.classList.add("is-lose");
        later(settleMs(), function () {
          closeUp(score);
        });
      } else {
        later(settleMs(), function () {
          rowVoice(score);
        });
      }
    }

    kbEl.parentNode.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        submitGuess();
      } else if (event.key === "Backspace") {
        event.preventDefault();
        deleteLetter();
      } else if (/^[a-zA-Z]$/.test(event.key)) {
        typeLetter(event.key.toLowerCase());
      }
    });

    dailyBtn.addEventListener("click", function () {
      startRound(true);
    });
    newBtn.addEventListener("click", function () {
      startRound(false);
    });

    /* Quiet reset: the drawer calls it on every tab switch. It drops the reveal
     * callbacks that have not landed and keeps the round - a hidden panel must
     * not fire a ceremony over a board the player never saw. */
    App.quietResetVault = function () {
      clearPending();
    };

    startRound(true);
  }


  /* Exported for the other modules. */
  App.initVaultGame = initVaultGame;
  App.vaultLetterStatus = vaultLetterStatus;
})(window.CapitalConvert = window.CapitalConvert || {});
