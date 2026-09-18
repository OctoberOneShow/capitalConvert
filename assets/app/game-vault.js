/* Letter Vault - The daily five-letter word lock in the shared game drawer. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  var t = App.t;
  var getElement = App.getElement;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  var vaultStreakKey = "vault-streak";
  var vaultBestKey = "vault-best-streak";
  var vaultWidth = 5;
  var vaultRows = 6;
  /* Answers only. Guesses accept any five letters - the honest shortcut
   * that keeps a full dictionary out of a build-free repo. */
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

    var answer = "";
    var guesses = [];
    var current = "";
    var over = false;
    var tileRows = [];
    var keyNodes = {};

    function readInt(key) {
      var value = parseInt(localStorage.getItem(key), 10);
      return isNaN(value) ? 0 : value;
    }

    function buildBoard() {
      boardEl.textContent = "";
      tileRows = [];
      for (var row = 0; row < vaultRows; row += 1) {
        var rowEl = document.createElement("div");
        rowEl.className = "vault-row";
        var tiles = [];
        for (var col = 0; col < vaultWidth; col += 1) {
          var tile = document.createElement("span");
          tile.className = "vault-tile";
          rowEl.appendChild(tile);
          tiles.push(tile);
        }
        boardEl.appendChild(rowEl);
        tileRows.push(tiles);
      }
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
      enter.addEventListener("click", function () {
        submitGuess();
      });
      var back = document.createElement("button");
      back.type = "button";
      back.className = "vault-key is-wide";
      back.textContent = t("vaultBack");
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
        var ch = current[col] || "";
        tileRows[row][col].textContent = ch;
        tileRows[row][col].classList.toggle("is-filled", !!ch);
      }
    }

    function renderStats() {
      guessEl.textContent = guesses.length + "/" + vaultRows;
      streakEl.textContent = String(readInt(vaultStreakKey));
      var best = readInt(vaultBestKey);
      bestEl.textContent = best ? t("vaultBestLine", { n: best }) : t("noBest");
    }

    function startRound(useDaily) {
      guesses = [];
      current = "";
      over = false;
      answer = useDaily
        ? vaultPool[vaultDailyIndex()]
        : vaultPool[Math.floor(Math.random() * vaultPool.length)];
      buildBoard();
      buildKeyboard();
      renderStats();
      dailyBtn.setAttribute("aria-pressed", String(useDaily));
      newBtn.setAttribute("aria-pressed", String(!useDaily));
      resultEl.textContent = t(useDaily ? "vaultPromptDaily" : "vaultPromptRandom");
    }

    function typeLetter(letter) {
      if (over || current.length >= vaultWidth) {
        return;
      }
      current += letter;
      paintCurrentRow();
    }

    function deleteLetter() {
      if (over || !current.length) {
        return;
      }
      current = current.slice(0, -1);
      paintCurrentRow();
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
      if (rank[status] > now) {
        key.className = "vault-key is-" + status;
      }
    }

    function submitGuess() {
      if (over) {
        return;
      }
      if (current.length < vaultWidth) {
        resultEl.textContent = t("vaultTooShort");
        return;
      }
      var guess = current;
      var status = vaultLetterStatus(answer, guess);
      for (var col = 0; col < vaultWidth; col += 1) {
        var tile = tileRows[guesses.length][col];
        tile.textContent = guess[col];
        tile.className = "vault-tile is-" + status[col];
        markKey(guess[col], status[col]);
      }
      guesses.push(guess);
      current = "";
      renderStats();

      if (guess === answer) {
        over = true;
        var streak = readInt(vaultStreakKey) + 1;
        localStorage.setItem(vaultStreakKey, String(streak));
        if (streak > readInt(vaultBestKey)) {
          localStorage.setItem(vaultBestKey, String(streak));
        }
        resultEl.textContent = t("vaultWin", { n: guesses.length, s: streak });
        logAction(t("logVault", { w: guess.toUpperCase() }));
        var rect = dailyBtn.getBoundingClientRect();
        createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
        petNotifyGame(true);
        renderStats();
        return;
      }
      if (guesses.length >= vaultRows) {
        over = true;
        localStorage.setItem(vaultStreakKey, "0");
        resultEl.textContent = t("vaultLoss", { word: answer.toUpperCase() });
        logAction(t("logVault", { w: "\u2014" }));
        petNotifyGame(false);
        renderStats();
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

    buildBoard();
    buildKeyboard();
    startRound(true);
  }


  /* Exported for the other modules. */
  App.initVaultGame = initVaultGame;
  App.vaultLetterStatus = vaultLetterStatus;
})(window.CapitalConvert = window.CapitalConvert || {});
