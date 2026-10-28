/* Pocket Detective - a logic-grid deduction case in the shared game drawer.
 * Every case is carved down from a pinned clue list while the answer stays
 * unique, exactly the way the shipped mini-sudoku carves its boards, so the
 * grid always has one right answer and the clue text always says something
 * true about it. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  var t = App.t;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  var createCampaign = App.createCampaign;
  var fillCampaignPicker = App.fillCampaignPicker;
  var starsFor = App.starsFor;

  var pdkCats = 3;
  var pdkYes = 1;
  var pdkNo = 2;
  var pdkPer = 4;
  /* `n` is the suspect count; the three categories all hold n items. */
  var pdkRungs = [
    { id: "c1", labelKey: "pdkC1", n: 3, clues: 6, starTimes: [45, 80, 130] },
    { id: "c2", labelKey: "pdkC2", n: 3, clues: 8, starTimes: [55, 95, 150] },
    { id: "c3", labelKey: "pdkC3", n: 4, clues: 10, starTimes: [90, 150, 230] },
    { id: "c4", labelKey: "pdkC4", n: 4, clues: 12, starTimes: [110, 180, 270] },
    { id: "c5", labelKey: "pdkC5", n: 5, clues: 15, starTimes: [170, 260, 380] },
    /* The board only lays out three, four or five names, so the back half of
     * the campaign keeps the widest grid and lengthens the brief instead. Each
     * step is a different job for the same grid: a line the case can lose, a
     * pair of eliminations that only land in sequence, a shape that sits one
     * clue away from a two-way tie, a long brief that is all grunt work, and
     * finally every kind of line the engine can write at once. */
    { id: "c6", labelKey: "pdkC6", n: 5, clues: 16, starTimes: [180, 270, 390] },
    { id: "c7", labelKey: "pdkC7", n: 5, clues: 18, starTimes: [195, 290, 405] },
    { id: "c8", labelKey: "pdkC8", n: 5, clues: 20, starTimes: [210, 305, 420] },
    { id: "c9", labelKey: "pdkC9", n: 5, clues: 22, starTimes: [225, 315, 425] },
    { id: "c10", labelKey: "pdkC10", n: 5, clues: 25, starTimes: [245, 350, 470] },
    /* Volume two lengthens the brief instead of widening the grid. The
     * four-name board returns for half the steps so reading and cross-checking
     * carry the difficulty, and the last two cases stay wide for the biggest
     * briefs in the campaign. */
    { id: "c11", labelKey: "pdkC11", n: 5, clues: 26, starTimes: [260, 370, 495] },
    { id: "c12", labelKey: "pdkC12", n: 4, clues: 27, starTimes: [245, 350, 465] },
    { id: "c13", labelKey: "pdkC13", n: 5, clues: 27, starTimes: [270, 385, 515] },
    { id: "c14", labelKey: "pdkC14", n: 4, clues: 28, starTimes: [250, 355, 475] },
    { id: "c15", labelKey: "pdkC15", n: 5, clues: 28, starTimes: [280, 400, 530] },
    { id: "c16", labelKey: "pdkC16", n: 4, clues: 29, starTimes: [260, 370, 495] },
    { id: "c17", labelKey: "pdkC17", n: 5, clues: 29, starTimes: [290, 410, 550] },
    { id: "c18", labelKey: "pdkC18", n: 4, clues: 30, starTimes: [270, 385, 515] },
    { id: "c19", labelKey: "pdkC19", n: 5, clues: 31, starTimes: [310, 440, 590] },
    { id: "c20", labelKey: "pdkC20", n: 5, clues: 32, starTimes: [320, 455, 610] },
    /* Volume three raises the brief in two steps of two rungs and carries each
     * step on both boards, four names first and five names second, so the page
     * count is the only thing two neighbouring cases share. c21 and c22 hold
     * nine pages of brief - the first briefs in the campaign longer than any
     * shipped case - and c23 and c24 hold ten. On the narrow board the lines
     * outnumber the cells (34 and 38 lines for 48 boxes), so the grid closes
     * by ruling pairs out; on the wide board the same pages have 27 more boxes
     * to cross-check and the plain statements run out before the grid does.
     * Every rung keeps the shipped five fields: the dealer reads n and clues,
     * the campaign reads id and labelKey, and the clock reads starTimes. */
    { id: "c21", labelKey: "pdkC21", n: 4, clues: 34, starTimes: [305, 435, 580] },
    { id: "c22", labelKey: "pdkC22", n: 5, clues: 36, starTimes: [360, 510, 685] },
    { id: "c23", labelKey: "pdkC23", n: 4, clues: 38, starTimes: [340, 485, 645] },
    { id: "c24", labelKey: "pdkC24", n: 5, clues: 40, starTimes: [400, 570, 760] },
  ];
  /* Removal order for the carve: the plainest clues go first so the mixed
   * negative / same-owner / hour-gap lines stay in the brief. */
  var pdkFlavour = { direct: 0, neg: 2, same: 1, order: 3 };

  function pdkList(key) {
    var raw = String(t(key) || "").split(",");
    var out = [];
    for (var i = 0; i < raw.length; i += 1) {
      out.push(raw[i].replace(/^\s+/, "").replace(/\s+$/, ""));
    }
    return out;
  }

  function pdkNames() {
    return { who: pdkList("pdkSuspects"), items: [pdkList("pdkPlaces"), pdkList("pdkObjects"), pdkList("pdkHours")] };
  }

  /* Every permutation of 0..n-1, in a stable order (n <= 5 -> 120 max). */
  function pdkPerms(n) {
    var out = [];
    function walk(prefix, rest) {
      if (!rest.length) {
        out.push(prefix.slice());
        return;
      }
      for (var i = 0; i < rest.length; i += 1) {
        var nextRest = rest.slice(0, i).concat(rest.slice(i + 1));
        prefix.push(rest[i]);
        walk(prefix, nextRest);
        prefix.pop();
      }
    }
    var seed = [];
    for (var v = 0; v < n; v += 1) {
      seed.push(v);
    }
    walk([], seed);
    return out;
  }

  function pdkShuffle(list) {
    var out = list.slice();
    for (var i = out.length - 1; i > 0; i -= 1) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
    return out;
  }

  function pdkSolo(clue, cat) {
    return (clue.kind === "direct" || clue.kind === "neg") && clue.cat === cat;
  }

  function pdkSoloOk(clue, cat, perm) {
    var holds = perm[clue.who] === clue.item;
    return clue.kind === "direct" ? holds : !holds;
  }

  /* A clue is checkable from two categories alone when it only ever mentions
   * items of those two - that is what keeps the counter fast. */
  function pdkPairOk(clue, ca, cb) {
    if (clue.kind === "same") {
      return (clue.ca === ca && clue.cb === cb) || (clue.ca === cb && clue.cb === ca);
    }
    if (clue.kind === "order") {
      return (clue.cat === ca && clue.hcat === cb) || (clue.cat === cb && clue.hcat === ca);
    }
    return false;
  }

  function pdkClueHolds(clue, assign) {
    var i;
    if (clue.kind === "direct") {
      return assign[clue.cat][clue.who] === clue.item;
    }
    if (clue.kind === "neg") {
      return assign[clue.cat][clue.who] !== clue.item;
    }
    if (clue.kind === "same") {
      for (i = 0; i < assign[0].length; i += 1) {
        if (assign[clue.ca][i] === clue.ia && assign[clue.cb][i] === clue.ib) {
          return true;
        }
      }
      return false;
    }
    /* order: the owner of (cat,item) booked dir hours after hour item `h`. */
    for (i = 0; i < assign[0].length; i += 1) {
      if (assign[clue.cat][i] === clue.item) {
        return assign[clue.hcat][i] === clue.h + clue.dir;
      }
    }
    return false;
  }

  /* Pure: how many assignments fit every clue, counted up to `limit`
   * (default 2) so a carved list is proven to hold exactly one answer. */
  function pdkCountSolutions(clues, categories, limit) {
    var n = categories.n;
    var stop = limit || 2;
    var perms = pdkPerms(n);
    var pools = [];
    var budget = 260000;
    var cat;
    var i;
    for (cat = 0; cat < pdkCats; cat += 1) {
      var keep = [];
      for (i = 0; i < perms.length; i += 1) {
        var ok = true;
        for (var s = 0; s < clues.length; s += 1) {
          if (!pdkSolo(clues[s], cat)) {
            continue;
          }
          if (budget <= 0) {
            return stop;
          }
          budget -= 1;
          if (!pdkSoloOk(clues[s], cat, perms[i])) {
            ok = false;
            break;
          }
        }
        if (ok) {
          keep.push(perms[i]);
        }
      }
      pools.push(keep);
      if (!keep.length) {
        return 0;
      }
    }
    var pairs = [[0, 1], [0, 2], [1, 2]];
    var count = 0;
    var pa;
    var pb;
    var pc;
    for (i = 0; i < pools[0].length && budget > 0; i += 1) {
      pa = pools[0][i];
      for (var b = 0; b < pools[1].length && budget > 0; b += 1) {
        pb = pools[1][b];
        if (!pdkPairPass(clues, 0, 1, pa, pb)) {
          continue;
        }
        budget -= 1;
        for (var c = 0; c < pools[2].length && budget > 0; c += 1) {
          pc = pools[2][c];
          if (!pdkPairPass(clues, 0, 2, pa, pc) || !pdkPairPass(clues, 1, 2, pb, pc)) {
            continue;
          }
          budget -= 1;
          var done = true;
          for (var k = 0; k < clues.length; k += 1) {
            if (!pdkClueHolds(clues[k], [pa, pb, pc])) {
              done = false;
              break;
            }
          }
          if (done) {
            count += 1;
            if (count >= stop) {
              return count;
            }
          }
        }
      }
    }
    return count;
  }

  /* The counter only ever tests a two-category pair, so each clue has to be
   * answerable from exactly those two permutations. */
  function pdkPairPass(clues, ca, cb, permA, permB) {
    for (var i = 0; i < clues.length; i += 1) {
      var clue = clues[i];
      if (!pdkPairOk(clue, ca, cb)) {
        continue;
      }
      var first = clue.ca === undefined ? null : clue.ca;
      var second = clue.cb === undefined ? null : clue.cb;
      if (clue.kind === "order") {
        first = clue.cat;
        second = clue.hcat;
      }
      var permForFirst = first === ca ? permA : permB;
      var permForSecond = second === ca ? permA : permB;
      var found = false;
      for (var w = 0; w < permForFirst.length; w += 1) {
        if (clue.kind === "same") {
          if (permForFirst[w] === clue.ia && permForSecond[w] === clue.ib) {
            found = true;
            break;
          }
          continue;
        }
        if (permForFirst[w] === clue.item && permForSecond[w] === clue.h + clue.dir) {
          found = true;
          break;
        }
      }
      if (!found) {
        return false;
      }
    }
    return true;
  }

  /* One suspect owns one item per category, so the answer is three
   * permutations and every clue below is derived from it. */
  function pdkCase(rung) {
    var n = rung.n;
    var solution = [];
    var cat;
    for (cat = 0; cat < pdkCats; cat += 1) {
      solution.push(pdkShuffle(range(n)));
    }
    var direct = [];
    var other = [];
    for (cat = 0; cat < pdkCats; cat += 1) {
      for (var who = 0; who < n; who += 1) {
        direct.push({ kind: "direct", cat: cat, who: who, item: solution[cat][who] });
        for (var item = 0; item < n; item += 1) {
          if (item !== solution[cat][who]) {
            other.push({ kind: "neg", cat: cat, who: who, item: item });
          }
        }
      }
    }
    for (var ca = 0; ca < pdkCats; ca += 1) {
      for (var cb = ca + 1; cb < pdkCats; cb += 1) {
        for (var w = 0; w < n; w += 1) {
          other.push({ kind: "same", ca: ca, cb: cb, ia: solution[ca][w], ib: solution[cb][w] });
        }
      }
    }
    var hours = solution[2];
    for (var hc = 0; hc < 2; hc += 1) {
      for (var ws = 0; ws < n; ws += 1) {
        for (var dir = -1; dir <= 1; dir += 2) {
          var href = hours[ws] - dir;
          if (href >= 0 && href < n) {
            other.push({ kind: "order", cat: hc, item: solution[hc][ws], hcat: 2, h: href, dir: dir });
          }
        }
      }
    }
    var directShuffled = pdkShuffle(direct);
    var otherShuffled = pdkShuffle(other);
    var want = Math.min(rung.clues, direct.length + other.length);
    var flavour = Math.max(2, Math.round(want * 0.4));
    var directTake = Math.min(directShuffled.length, Math.max(1, want - flavour));
    var clues = directShuffled.slice(0, directTake);
    clues = clues.concat(otherShuffled.slice(0, Math.min(otherShuffled.length, flavour)));
    /* Past 25 lines at n=5 (past 20 at n=4) the direct pool is already spent,
     * so the old 40% flavour share would leave the brief short of the rung's
     * count. Top it up from the mixed pool instead: the direct pins above
     * already fix the one answer, so extra true lines cannot add a second
     * solution, and pdkCarve can still trade plain lines for mixed ones. */
    if (clues.length < want) {
      clues = clues.concat(otherShuffled.slice(flavour, flavour + (want - clues.length)));
    }
    var fill = directTake;
    var guard = 0;
    /* Plain "X did it" lines are the reliable pins: add them, one at a time,
     * until the carve target below has exactly one answer to work from. */
    while (guard < 30 && pdkCountSolutions(clues, { n: n }) !== 1) {
      guard += 1;
      if (fill >= directShuffled.length) {
        break;
      }
      var pin = directShuffled[fill];
      fill += 1;
      if (indexOfClue(clues, pin) === -1) {
        clues.push(pin);
      }
    }
    if (pdkCountSolutions(clues, { n: n }) !== 1) {
      clues = direct.slice();
    }
    /* Carve while the answer stays unique, and swap plain lines for flavour. */
    clues = pdkCarve(clues, solution, n, want);
    return { solution: solution, clues: clues, n: n };
  }

  function indexOfClue(list, clue) {
    for (var i = 0; i < list.length; i += 1) {
      if (sameClue(list[i], clue)) {
        return i;
      }
    }
    return -1;
  }

  function sameClue(a, b) {
    return (
      a.kind === b.kind &&
      a.cat === b.cat &&
      a.who === b.who &&
      a.item === b.item &&
      a.ca === b.ca &&
      a.cb === b.cb &&
      a.ia === b.ia &&
      a.ib === b.ib &&
      a.h === b.h &&
      a.dir === b.dir
    );
  }

  function range(n) {
    var out = [];
    for (var i = 0; i < n; i += 1) {
      out.push(i);
    }
    return out;
  }

  function pdkMentioned(clues, n) {
    var who = [];
    var cat = [0, 0, 0];
    var i;
    for (i = 0; i < n; i += 1) {
      who.push(false);
    }
    for (i = 0; i < clues.length; i += 1) {
      var clue = clues[i];
      if (clue.kind === "direct" || clue.kind === "neg") {
        who[clue.who] = true;
        cat[clue.cat] += 1;
      } else if (clue.kind === "same") {
        cat[clue.ca] += 1;
        cat[clue.cb] += 1;
      } else {
        cat[clue.cat] += 1;
        cat[clue.hcat] += 1;
      }
    }
    for (i = 0; i < n; i += 1) {
      if (!who[i]) {
        return false;
      }
    }
    for (i = 0; i < pdkCats; i += 1) {
      if (!cat[i]) {
        return false;
      }
    }
    return true;
  }

  /* Cutter order: plainest kind first, shuffled inside a kind, so the brief
   * keeps its mixed lines as long as uniqueness still holds. */
  function pdkCarveOrder(list) {
    var order = [];
    for (var i = 0; i < list.length; i += 1) {
      order.push(i);
    }
    order = pdkShuffle(order);
    order.sort(function (a, b) {
      return pdkFlavour[list[a].kind] - pdkFlavour[list[b].kind];
    });
    return order;
  }

  function pdkCarve(clues, solution, n, want) {
    var keep = clues.slice();
    var order = pdkCarveOrder(keep);
    for (var o = 0; o < order.length; o += 1) {
      if (keep.length <= want) {
        break;
      }
      var trial = keep.slice(0, order[o]).concat(keep.slice(order[o] + 1));
      if (pdkCountSolutions(trial, { n: n }) === 1 && pdkMentioned(trial, n)) {
        keep = trial;
        order = pdkCarveOrder(keep);
        o = -1;
      }
    }
    /* Swap: a plain "X did it" line only goes if a mixed line pins as hard.
     * The bank keeps each category pair in canonical order so a swap cannot
     * add the same line the brief already carries backwards. */
    var bank = [];
    for (var ca = 0; ca < pdkCats; ca += 1) {
      for (var cb = ca + 1; cb < pdkCats; cb += 1) {
        for (var who = 0; who < n; who += 1) {
          bank.push({ kind: "same", ca: ca, cb: cb, ia: solution[ca][who], ib: solution[cb][who] });
        }
      }
    }
    bank = pdkShuffle(bank);
    var tries = 0;
    for (var i = 0; i < keep.length && tries < 8; i += 1) {
      if (keep[i].kind !== "direct") {
        continue;
      }
      var pick = bank[tries % bank.length];
      tries += 1;
      if (indexOfClue(keep, pick) !== -1) {
        continue;
      }
      var swap = keep.slice();
      swap[i] = pick;
      if (pdkCountSolutions(swap, { n: n }) === 1 && pdkMentioned(swap, n)) {
        keep = swap;
      }
    }
    return keep;
  }

  /* Pure: the grid is graded against the unique answer, never against a clue. */
  function pdkGrade(notes, solution, n) {
    var wrong = 0;
    var missing = 0;
    var placed = 0;
    for (var cat = 0; cat < pdkCats; cat += 1) {
      for (var item = 0; item < n; item += 1) {
        for (var who = 0; who < n; who += 1) {
          var truth = solution[cat][who] === item;
          var mark = notes[cat * n * n + item * n + who] || 0;
          if (mark === pdkYes) {
            placed += 1;
            if (!truth) {
              wrong += 1;
            }
          } else if (mark === pdkNo) {
            if (truth) {
              wrong += 1;
            }
          } else if (truth) {
            missing += 1;
          }
        }
      }
    }
    return { wrong: wrong, missing: missing, placed: placed, solved: wrong === 0 && missing === 0 };
  }

  function pdkClueText(clue, names) {
    var who = names.who;
    var items = names.items;
    if (clue.kind === "direct") {
      return t("pdkClueYes" + clue.cat, {
        a: who[clue.who],
        b: items[clue.cat][clue.item],
      });
    }
    if (clue.kind === "neg") {
      return t("pdkClueNo" + clue.cat, {
        a: who[clue.who],
        b: items[clue.cat][clue.item],
      });
    }
    if (clue.kind === "same") {
      return t("pdkClueSame", {
        a: items[clue.ca][clue.ia],
        b: items[clue.cb][clue.ib],
      });
    }
    return t(clue.dir > 0 ? "pdkClueAfter" : "pdkClueBefore", {
      a: items[clue.cat][clue.item],
      b: items[clue.hcat][clue.h],
    });
  }
  App.detectiveCountSolutions = pdkCountSolutions;
  App.detectiveHolds = pdkClueHolds;
  App.detectiveCase = pdkCase;
  App.detectiveGrade = pdkGrade;
  App.detectivePerms = pdkPerms;
  App.detectiveRungs = pdkRungs;

  function initPocketDetectiveGame(panelEl) {
    if (!panelEl) {
      return;
    }

    var campaign = createCampaign({ key: "pocket-detective-campaign", levels: pdkRungs });
    var start = campaign.indexOf(campaign.nextLevelId());
    var rung = pdkRungs[start < 0 ? 0 : start];
    var names = pdkNames();
    var caseData = pdkCase(rung);
    var texts = [];
    var notes = [];
    var pages = 1;
    var page = 0;
    var read = {};
    var cursor = { cat: 0, row: 0, col: 0 };
    var solved = false;
    var seconds = 0;
    var startedAt = 0;
    var rafId = null;
    var cellEls = [];
    var clueEls = [];

    var hud = document.createElement("div");
    hud.className = "game-hud";
    var timeEl = document.createElement("strong");
    var briefEl = document.createElement("strong");
    hud.appendChild(makeStat("pdkTimeLabel", timeEl));
    hud.appendChild(makeStat("pdkBriefLabel", briefEl));

    var board = document.createElement("div");
    board.className = "pdk-board";
    board.setAttribute("tabindex", "0");
    board.setAttribute("role", "application");
    board.setAttribute("aria-label", t("pdkFieldLabel"));

    var brief = document.createElement("div");
    brief.className = "pdk-brief";
    var pageBtn = document.createElement("button");
    pageBtn.type = "button";
    pageBtn.className = "pdk-page";
    var pageText = document.createElement("span");
    pageText.className = "pdk-page-text";
    pageBtn.appendChild(pageText);
    pageBtn.setAttribute("aria-label", t("pdkPageNext"));
    brief.appendChild(pageBtn);
    for (var line = 0; line < pdkPer; line += 1) {
      var clueEl = document.createElement("p");
      clueEl.className = "pdk-clue";
      clueEl.setAttribute("aria-live", "off");
      brief.appendChild(clueEl);
      clueEls.push(clueEl);
    }

    var result = document.createElement("p");
    result.className = "game-result";
    result.setAttribute("role", "status");

    var rungRow = document.createElement("div");
    rungRow.className = "elements-row";
    var rungLabel = document.createElement("label");
    rungLabel.className = "elements-label";
    rungLabel.setAttribute("for", "pdkRungSel");
    rungLabel.setAttribute("data-i18n", "pdkRungSelectLabel");
    rungLabel.textContent = t("pdkRungSelectLabel");
    var rungSel = document.createElement("select");
    rungSel.className = "elements-select";
    rungSel.id = "pdkRungSel";
    rungRow.appendChild(rungLabel);
    rungRow.appendChild(rungSel);

    var actions = document.createElement("div");
    actions.className = "game-actions";
    var checkBtn = makeButton("primary", "pdkBtnCheck", t("pdkBtnCheck"));
    var resetBtn = makeButton("", "btnNewRound", t("btnNewRound"));
    var bestEl = document.createElement("p");
    bestEl.className = "game-best";
    actions.appendChild(checkBtn);
    actions.appendChild(resetBtn);
    actions.appendChild(bestEl);

    var hint = document.createElement("p");
    hint.className = "game-hint";
    hint.setAttribute("data-i18n", "pdkHint");
    hint.textContent = t("pdkHint");

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

    function makeButton(extra, key, text) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = extra;
      var span = document.createElement("span");
      span.setAttribute("data-i18n", key);
      span.textContent = text;
      var content = document.createElement("span");
      content.className = "button-content";
      content.appendChild(span);
      btn.appendChild(content);
      return btn;
    }

    [hud, board, brief, result, rungRow, actions, hint].forEach(function (node) {
      panelEl.appendChild(node);
    });

    function stateMark(value) {
      if (value === pdkYes) {
        return "\u2713";
      }
      if (value === pdkNo) {
        return "\u2717";
      }
      return "\u00b7";
    }

    function stateWord(value) {
      return value === pdkYes ? t("pdkWordYes") : value === pdkNo ? t("pdkWordNo") : t("pdkWordMaybe");
    }

    function buildBoard() {
      while (board.firstChild) {
        board.removeChild(board.firstChild);
      }
      cellEls = [];
      var head = document.createElement("div");
      head.className = "pdk-row pdk-head";
      var corner = document.createElement("span");
      corner.className = "pdk-corner";
      corner.textContent = t("pdkCorner");
      head.appendChild(corner);
      for (var w = 0; w < rung.n; w += 1) {
        var who = document.createElement("span");
        who.className = "pdk-name";
        who.textContent = names.who[w];
        head.appendChild(who);
      }
      board.appendChild(head);

      for (var cat = 0; cat < pdkCats; cat += 1) {
        var group = document.createElement("div");
        group.className = "pdk-group";
        group.textContent = t("pdkCat" + cat);
        board.appendChild(group);
        for (var item = 0; item < rung.n; item += 1) {
          var row = document.createElement("div");
          row.className = "pdk-row";
          var rowLabel = document.createElement("span");
          rowLabel.className = "pdk-item";
          rowLabel.textContent = names.items[cat][item];
          row.appendChild(rowLabel);
          for (var col = 0; col < rung.n; col += 1) {
            var cell = document.createElement("button");
            cell.type = "button";
            cell.className = "pdk-cell";
            cell.dataset.cat = String(cat);
            (function (c, r, k) {
              cell.addEventListener("click", function () {
                cycle(c, r, k);
              });
            })(cat, item, col);
            row.appendChild(cell);
            cellEls.push(cell);
          }
          row.dataset.n = String(rung.n);
          board.appendChild(row);
        }
      }
      board.dataset.cols = String(rung.n);
      paintCells();
    }

    function cellAt(cat, item, col) {
      var index = (cat * rung.n + item) * rung.n + col;
      return cellEls[index] || null;
    }

    function paintCells() {
      var stride = rung.n * rung.n;
      for (var cat = 0; cat < pdkCats; cat += 1) {
        for (var item = 0; item < rung.n; item += 1) {
          for (var col = 0; col < rung.n; col += 1) {
            var cell = cellAt(cat, item, col);
            if (!cell) {
              continue;
            }
            var mark = notes[cat * stride + item * rung.n + col] || 0;
            cell.textContent = stateMark(mark);
            cell.className =
              "pdk-cell" +
              (mark === pdkYes ? " is-yes" : "") +
              (mark === pdkNo ? " is-no" : "") +
              (cursor.cat === cat && cursor.row === item && cursor.col === col ? " is-cursor" : "");
            cell.setAttribute(
              "aria-label",
              t("pdkCellLabel", {
                a: names.items[cat][item],
                b: names.who[col],
                c: stateWord(mark),
              }),
            );
          }
        }
      }
    }

    function renderBrief() {
      var shown = texts.slice(page * pdkPer, page * pdkPer + pdkPer);
      for (var i = 0; i < pdkPer; i += 1) {
        clueEls[i].textContent = shown[i] === undefined ? "" : shown[i];
      }
      pageText.textContent = t("pdkPageLabel", { p: page + 1, n: pages });
      pageBtn.setAttribute("aria-label", t("pdkPageNext"));
      read[page] = true;
      var seen = 0;
      for (var k in read) {
        if (read[k]) {
          seen += 1;
        }
      }
      briefEl.textContent = t("pdkCluesRead", { n: seen, max: pages });
    }

    function renderHud() {
      timeEl.textContent = t("pdkSeconds", { n: Math.floor(seconds) });
    }

    function refreshPicker() {
      fillCampaignPicker(
        rungSel,
        campaign,
        function (def) {
          return t(def.labelKey);
        },
        t("elementsLocked"),
      );
      rungSel.value = rung.id;
      var best = campaign.best(rung.id);
      bestEl.textContent =
        t("campaignStars", { n: campaign.totalStars(), max: campaign.maxStars() }) +
        " \u00b7 " +
        (best > 0 ? t("pdkBestTime", { n: best }) : t("noBest"));
    }

    function frame() {
      if (rafId === null) {
        return;
      }
      if (solved || panelEl.hidden || document.hidden) {
        /* Hidden time is not solve time: keep re-anchoring the start so the
         * clock resumes where the player left it instead of jumping. */
        startedAt = Date.now() - seconds * 1000;
        rafId = window.requestAnimationFrame(frame);
        return;
      }
      seconds = Math.max(0, (Date.now() - startedAt) / 1000);
      renderHud();
      rafId = window.requestAnimationFrame(frame);
    }

    /* The clock is the only thing this game owns, so the shell hook stops the
     * loop and the next note restarts it - notes never get wiped. */
    function startClock() {
      if (rafId !== null || solved) {
        return;
      }
      startedAt = Date.now() - seconds * 1000;
      rafId = window.requestAnimationFrame(frame);
    }

    function stopClock() {
      if (rafId === null) {
        return;
      }
      seconds = Math.max(0, (Date.now() - startedAt) / 1000);
      window.cancelAnimationFrame(rafId);
      rafId = null;
    }

    /* The win can arrive between two frames, so read the clock directly. */
    function elapsed() {
      return rafId === null ? seconds : Math.max(0, (Date.now() - startedAt) / 1000);
    }

    function cycle(cat, item, col) {
      if (solved) {
        return;
      }
      startClock();
      var stride = rung.n * rung.n;
      var index = cat * stride + item * rung.n + col;
      var value = (notes[index] || 0) + 1;
      if (value > pdkNo) {
        value = 0;
      }
      notes[index] = value;
      cursor = { cat: cat, row: item, col: col };
      paintCells();
    }

    function turnPage(step) {
      if (solved) {
        return;
      }
      startClock();
      page = (page + step + pages) % pages;
      renderBrief();
    }

    function moveCursor(dx, dy) {
      if (solved) {
        return;
      }
      startClock();
      var stride = rung.n * rung.n;
      var index = cursor.cat * stride + cursor.row * rung.n + cursor.col;
      index += dx + dy * rung.n;
      var max = pdkCats * stride;
      if (dx > 0 && index % rung.n === 0) {
        index -= 1;
      } else if (dx < 0 && (index + 1) % rung.n === 0) {
        index += 1;
      }
      if (dy > 0 && index >= max) {
        index = 0;
      } else if (dy < 0 && index < 0) {
        index = max - 1;
      }
      index = Math.max(0, Math.min(max - 1, index));
      cursor = {
        cat: Math.floor(index / stride),
        row: Math.floor((index % stride) / rung.n),
        col: index % rung.n,
      };
      paintCells();
      var focused = cellAt(cursor.cat, cursor.row, cursor.col);
      if (focused) {
        focused.focus();
      }
    }

    function deal(def) {
      stopClock();
      rung = def;
      caseData = pdkCase(rung);
      texts = [];
      for (var i = 0; i < caseData.clues.length; i += 1) {
        texts.push(pdkClueText(caseData.clues[i], names));
      }
      pages = Math.max(1, Math.ceil(texts.length / pdkPer));
      page = 0;
      read = {};
      notes = [];
      solved = false;
      seconds = 0;
      cursor = { cat: 0, row: 0, col: 0 };
      buildBoard();
      renderBrief();
      renderHud();
      refreshPicker();
      startClock();
      result.textContent = t("pdkReady", {
        name: t(rung.labelKey),
        n: texts.length,
        m: rung.n,
      });
    }

    function finish() {
      var used = Math.max(1, Math.round(elapsed()));
      var starsWon = starsFor(used, rung.starTimes, "low");
      var outcome = campaign.record(rung.id, {
        stars: starsWon,
        best: used,
        better: "low",
      });
      var message = t("pdkCleared", { n: used, s: starsWon });
      if (outcome.isBest) {
        message += " " + t("newBest");
      }
      if (outcome.unlockedNext) {
        message += " " + t("pdkNextRung");
      } else if (campaign.clearedCount() === pdkRungs.length) {
        message += " " + t("pdkCampaignDone");
      }
      result.textContent = message;
      logAction(t("logPocketDetective", { n: texts.length }));
      var rect = checkBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      refreshPicker();
    }

    function check() {
      if (solved) {
        result.textContent = t("pdkAlready", { name: t(rung.labelKey) });
        return;
      }
      var grade = pdkGrade(notes, caseData.solution, rung.n);
      if (grade.solved) {
        solved = true;
        stopClock();
        finish();
        return;
      }
      result.textContent = t("pdkGrade", { w: grade.wrong, m: grade.missing });
    }

    checkBtn.addEventListener("click", check);
    resetBtn.addEventListener("click", function () {
      deal(rung);
    });
    pageBtn.addEventListener("click", function () {
      turnPage(1);
    });

    board.addEventListener("keydown", function (event) {
      var focusedIndex = cellEls.indexOf(event.target);
      if (focusedIndex >= 0) {
        var stride = rung.n * rung.n;
        cursor = {
          cat: Math.floor(focusedIndex / stride),
          row: Math.floor((focusedIndex % stride) / rung.n),
          col: focusedIndex % rung.n,
        };
      }
      var moves = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
      };
      if (moves[event.key]) {
        event.preventDefault();
        moveCursor(moves[event.key][0], moves[event.key][1]);
        return;
      }
      if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
        event.preventDefault();
        cycle(cursor.cat, cursor.row, cursor.col);
        return;
      }
      if (event.key === "q" || event.key === "Q") {
        event.preventDefault();
        turnPage(-1);
        return;
      }
      if (event.key === "w" || event.key === "W") {
        event.preventDefault();
        turnPage(1);
      }
    });

    board.addEventListener("pointerdown", function () {
      board.focus({ preventScroll: true });
    });

    rungSel.addEventListener("change", function () {
      var pick = campaign.indexOf(rungSel.value);
      if (pick < 0) {
        return;
      }
      if (!campaign.isUnlocked(rungSel.value)) {
        rungSel.value = rung.id;
        result.textContent = t("pdkLocked", { name: t(pdkRungs[pick].labelKey) });
        return;
      }
      deal(pdkRungs[pick]);
    });

    /* Shell pause: only the clock goes quiet, the player's grid stays. */
    App.quietResetPocketDetective = function () {
      stopClock();
      renderHud();
    };

    deal(rung);
  }

  /* Bilingual copy travels with the game: addStrings only fills keys i18n.js
   * does not already own, so the shared dictionary stays authoritative. */
  App.addStrings({
    en: {
      "tabPocketDetective": "Pocket Detective",
      "pdkC1": "First Beat",
      "pdkC2": "Second Round",
      "pdkC3": "Third Degree",
      "pdkC4": "Fourth Wall",
      "pdkC5": "Closing Argument",
      "pdkC6": "Red Herring",
      "pdkC7": "Chain Reaction",
      "pdkC8": "Hung Jury",
      "pdkC9": "Beat the Clock",
      "pdkC10": "The Full Brief",
      "pdkC11": "Cold Trail",
      "pdkC12": "Cross Check",
      "pdkC13": "Long Watch",
      "pdkC14": "Narrow Margin",
      "pdkC15": "Paper Storm",
      "pdkC16": "Deep Ledger",
      "pdkC17": "Silent Partner",
      "pdkC18": "The Missing Hour",
      "pdkC19": "Closing Net",
      "pdkC20": "Final Verdict",
      "pdkC21": "Narrow Ledger",
      "pdkC22": "Wide Sweep",
      "pdkC23": "Dense File",
      "pdkC24": "The Final Docket",
      "pdkTimeLabel": "Elapsed",
      "pdkBriefLabel": "Brief",
      "pdkRungSelectLabel": "Pick a rung",
      "pdkBtnCheck": "Check notes",
      "pdkSeconds": "{n}s",
      "pdkCluesRead": "{n}/{max} pages",
      "pdkFieldLabel": "Cross-reference grid: click a box to cycle tick, cross, maybe. Arrows move, Enter cycles, Q and W turn the brief pages.",
      "pdkCorner": "who / what",
      "pdkCat0": "Where they were",
      "pdkCat1": "What they carried",
      "pdkCat2": "When they slipped out",
      "pdkWordYes": "yes",
      "pdkWordNo": "no",
      "pdkWordMaybe": "maybe",
      "pdkCellLabel": "{a} with {b}: {c}",
      "pdkPageLabel": "Brief {p}/{n}",
      "pdkPageNext": "Next brief page",
      "pdkSuspects": "Ash,Bex,Cyd,Dov,Ela",
      "pdkPlaces": "the gallery,the jetty,the chapel,the depot,the terrace",
      "pdkObjects": "the ledger,the compass,the lantern,the brass key,the mirror",
      "pdkHours": "dusk,9 pm,midnight,2 am,dawn",
      "pdkClueYes0": "{a} was seen at {b}.",
      "pdkClueYes1": "{a} turned up with {b}.",
      "pdkClueYes2": "{a} slipped out at {b}.",
      "pdkClueNo0": "{a} was nowhere near {b}.",
      "pdkClueNo1": "{a} was not carrying {b}.",
      "pdkClueNo2": "{a} was still in view at {b}.",
      "pdkClueSame": "{a} and {b} point at the same name.",
      "pdkClueAfter": "Whoever had {a} moved one hour after {b}.",
      "pdkClueBefore": "Whoever had {a} moved one hour before {b}.",
      "pdkReady": "{name}: {n} lines of brief, {m} names. Fill the grid, then check your notes.",
      "pdkGrade": "{w} mark(s) contradict the case and {m} match(es) are still blank.",
      "pdkCleared": "Case closed in {n}s - {s} stars.",
      "pdkBestTime": "best {n}s",
      "pdkAlready": "{name} is already closed - pick a rung or take a new case.",
      "pdkNextRung": "Next rung open.",
      "pdkCampaignDone": "All twenty-four rungs worked. You keep the notebook.",
      "pdkLocked": "{name} is sealed until the rung before it closes.",
      "pdkHint": "Tick a box and its row and column fill with crosses in your head - a tick is only safe once nothing else can reach that row.",
      "logPocketDetective": "Closed a {n}-line case",
    },
    zh: {
      "tabPocketDetective": "口袋侦探",
      "pdkC1": "第一档",
      "pdkC2": "第二档",
      "pdkC3": "第三档",
      "pdkC4": "第四档",
      "pdkC5": "结案陈词",
      "pdkC6": "假线索",
      "pdkC7": "连环推理",
      "pdkC8": "陪审僵局",
      "pdkC9": "限时追凶",
      "pdkC10": "完整卷宗",
      "pdkC11": "冷线索",
      "pdkC12": "交叉核对",
      "pdkC13": "长夜蹲守",
      "pdkC14": "毫厘之差",
      "pdkC15": "卷宗如雪",
      "pdkC16": "深层账目",
      "pdkC17": "沉默同伙",
      "pdkC18": "消失的一小时",
      "pdkC19": "收网",
      "pdkC20": "最终裁决",
      "pdkC21": "窄格长卷",
      "pdkC22": "广域清查",
      "pdkC23": "密档压卷",
      "pdkC24": "终审全卷",
      "pdkTimeLabel": "用时",
      "pdkBriefLabel": "卷宗",
      "pdkRungSelectLabel": "选择难度",
      "pdkBtnCheck": "核对笔记",
      "pdkSeconds": "{n} 秒",
      "pdkCluesRead": "第 {n}/{max} 页",
      "pdkFieldLabel": "交叉推理表：点格子在勾、叉、待定之间循环；方向键移动光标，回车循环，Q 与 W 翻卷宗。",
      "pdkCorner": "人 / 物",
      "pdkCat0": "到过何处",
      "pdkCat1": "带了什么",
      "pdkCat2": "何时离开",
      "pdkWordYes": "是",
      "pdkWordNo": "不是",
      "pdkWordMaybe": "待定",
      "pdkCellLabel": "{a} 对应 {b}：{c}",
      "pdkPageLabel": "卷宗 {p}/{n}",
      "pdkPageNext": "下一页卷宗",
      "pdkSuspects": "阿竹,小满,老柴,南星,青禾",
      "pdkPlaces": "画廊,码头,小教堂,库房,露台",
      "pdkObjects": "账册,罗盘,提灯,铜钥匙,铜镜",
      "pdkHours": "黄昏,晚上九点,午夜,凌晨两点,破晓",
      "pdkClueYes0": "{a}被人看到在{b}。",
      "pdkClueYes1": "{a}带着{b}出现。",
      "pdkClueYes2": "{a}是在{b}离开的。",
      "pdkClueNo0": "{a}根本没去过{b}。",
      "pdkClueNo1": "{a}身上没有{b}。",
      "pdkClueNo2": "{a}在{b}还露过面。",
      "pdkClueSame": "{a}与{b}指向同一个人。",
      "pdkClueAfter": "带着{a}的人比{b}晚一个小时。",
      "pdkClueBefore": "带着{a}的人比{b}早一个小时。",
      "pdkReady": "{name}：卷宗共 {n} 条线索、{m} 个嫌疑人。填满表格后再核对笔记。",
      "pdkGrade": "{w} 处标记与案情矛盾，还有 {m} 组对应没填。",
      "pdkCleared": "{n} 秒结案 - 获得 {s} 星。",
      "pdkBestTime": "最佳 {n} 秒",
      "pdkAlready": "「{name}」已经结案——换个难度或重开一件。",
      "pdkNextRung": "解锁下一档。",
      "pdkCampaignDone": "二十四档全部办结，笔记本归你了。",
      "pdkLocked": "「{name}」还封存着——先办结前面那一档。",
      "pdkHint": "打一个勾，同行同列就都该是叉；只有当这一行再无别处可去时，勾才算稳。",
      "logPocketDetective": "办结了 {n} 条线索的案子",
    },
  });

  App.registerGame({
    name: "pocketDetective",
    tabKey: "tabPocketDetective",
    init: initPocketDetectiveGame,
    guide: {
      svg:
        '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="6" y="6" width="108" height="64" rx="5" fill="rgba(30,41,59,.75)" stroke="rgba(148,163,184,.45)"/>' +
        '<path d="M36 12v52M58 12v52M80 12v52M100 12v52M12 30h100M12 48h100" stroke="rgba(148,163,184,.25)"/>' +
        '<text x="47" y="26" font-size="11" fill="#a3e635" text-anchor="middle">\u2713</text>' +
        '<text x="69" y="44" font-size="11" fill="#fb7185" text-anchor="middle">\u2717</text>' +
        '<text x="90" y="26" font-size="10" fill="rgba(226,232,240,.55)" text-anchor="middle">\u00b7</text>' +
        '<text x="24" y="44" font-size="8" fill="#94a3b8" text-anchor="middle">clue</text></svg>',
      en: [
        "Aim: work out which place, object and hour belongs to each suspect.",
        "Read: the brief below the grid is plain text - turn its pages with Q and W, or the page button.",
        "Mark: click a box, or move the cursor with arrows and press Enter, to cycle tick, cross, maybe.",
        "Rule: every case is carved down while its answer stays unique, so a contradiction means a mark is wrong, not that the deal is broken.",
        "Watch out: only the ticks are graded - a tick on a false pairing costs you, a careful cross never does.",
        "Scoring: Check notes grades the grid; solve it faster for more stars, and a new case waits under New Round.",
      ],
      zh: [
        "目标：推出每个嫌疑人到过何处、带了什么、何时离开。",
        "读题：表格下方就是线索原文——用 Q 和 W 或翻页按钮翻看卷宗。",
        "标记：点击格子，或用方向键移动光标后按回车，在勾、叉、待定之间循环。",
        "规则：每桩案子都是在保证答案唯一的前提下削减线索得来的，出现矛盾说明你标错了，不是题出错。",
        "注意：只有那些勾会被判定——勾在错误的配对上要算失误，谨慎打的叉不吃亏。",
        "计分：按“核对笔记”判定表格；越快结案星越多，点“新的一局”换一件新案子。",
      ],
    },
  });

  /* Exported for the other modules. */
  App.initPocketDetectiveGame = initPocketDetectiveGame;
})(window.CapitalConvert = window.CapitalConvert || {});
