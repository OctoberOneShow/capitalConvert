/* Microbe Lab - evolution by selection in the shared game drawer.
 * Six microbes, four traits, a capped trait budget, and an environment card
 * that changes every generation. Selection is a pure function of the population
 * and the card, so microbeBeatable can walk the whole ten generation trial with
 * a greedy allocator and prove the culture never has to drop under four. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  var t = App.t;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  var createCampaign = App.createCampaign;
  var fillCampaignPicker = App.fillCampaignPicker;
  var starsFor = App.starsFor;

  var TRAITS = ["heat", "acid", "speed", "defence"];
  var POP = 6;
  var FLOOR = 4;
  /* Every pressure is answered by a PAIR: the named trait plus its partner.
   * The card prints the number the pair has to reach, so investing in one trait
   * only ever half answers a card - the trade-off the capped budget sells. */
  var mcbAlts = { heat: "speed", acid: "defence", speed: "defence", defence: "speed" };
  var mcbMarks = { heat: "\u2600", acid: "\u25cd", speed: "\u224b", defence: "\u25a4" };
  var POINTS = 3;
  /* Combined cards get their own dictionary id so no key carries a plus sign. */
  var mcbIds = {
    heat: "heat",
    acid: "acid",
    speed: "speed",
    defence: "defence",
    "heat+defence": "brand",
    "acid+speed": "empty",
    "defence+speed": "grey",
    "heat+acid": "vinegar",
  };

  /* base + step per generation, and `plan` names the pressures of each card. */
  var mcbLevels = [
    { id: "m1", labelKey: "mcbZ1", twistKey: "mcbTwist1", gens: 10, seed: 4211, cap: 18, traitMax: 7, start: 12, base: 3, step: 3, plan: [["heat"]], starBand: [5750, 5200, 4600] },
    { id: "m2", labelKey: "mcbZ2", twistKey: "mcbTwist2", gens: 10, seed: 5309, cap: 18, traitMax: 7, start: 12, base: 3, step: 3, plan: [["acid"]], starBand: [5750, 5200, 4600] },
    { id: "m3", labelKey: "mcbZ3", twistKey: "mcbTwist3", gens: 10, seed: 6127, cap: 18, traitMax: 7, start: 12, base: 3, step: 3, plan: [["defence"], ["defence"], ["defence"], ["defence"], ["defence"], ["speed"], ["speed"], ["speed"], ["speed"], ["speed"]], starBand: [5700, 5150, 4550] },
    { id: "m4", labelKey: "mcbZ4", twistKey: "mcbTwist4", gens: 10, seed: 7333, cap: 18, traitMax: 7, start: 12, base: 3, step: 3, plan: [["heat"], ["acid"], ["defence"], ["speed"]], starBand: [5500, 4900, 4300] },
    { id: "m5", labelKey: "mcbZ5", twistKey: "mcbTwist5", gens: 10, seed: 8419, cap: 20, traitMax: 7, start: 12, base: 3, step: 3, plan: [["heat", "defence"], ["acid", "speed"], ["defence", "speed"], ["heat", "acid"]], starBand: [5600, 5000, 4400] },
  ];

  function mcbInt(value) {
    var num = Number(value);
    return isFinite(num) ? Math.round(num) : 0;
  }

  function mcbClamp(value, low, high) {
    return Math.max(low, Math.min(high, mcbInt(value)));
  }

  function mcbRandom(seed) {
    var state = mcbInt(seed) >>> 0;
    if (!state) {
      state = 0x5bf03635;
    }
    return function next() {
      state = (state ^ (state << 13)) >>> 0;
      state = (state ^ (state >>> 17)) >>> 0;
      state = (state ^ (state << 5)) >>> 0;
      return state / 4294967296;
    };
  }

  /* Generation g's card: every pressure in its clause list, scaled together. */
  function mcbCard(level, gen) {
    var keys = level.plan[gen % level.plan.length] || ["heat"];
    var req = mcbClamp(level.base + Math.floor(gen / Math.max(1, mcbInt(level.step))), 1, level.traitMax);
    var clauses = [];
    for (var index = 0; index < keys.length; index += 1) {
      clauses.push({ trait: keys[index], alt: mcbAlts[keys[index]] || "speed", req: req, demand: req + 3 });
    }
    var joined = keys.join("+");
    return {
      gen: gen,
      id: mcbIds[joined] || "heat",
      req: req,
      clauses: clauses,
      marks: keys.join(" "),
    };
  }

  function mcbSequence(level) {
    var out = [];
    for (var gen = 0; gen < level.gens; gen += 1) {
      out.push(mcbCard(level, gen));
    }
    return out;
  }

  function mcbCover(microbe, clause) {
    var traits = microbe.traits || {};
    return mcbInt(traits[clause.trait]) + mcbInt(traits[clause.alt]);
  }

  function mcbFit(microbe, clause) {
    return mcbCover(microbe, clause) >= mcbInt(clause.demand);
  }

  function mcbSurvives(microbe, card) {
    var clauses = card.clauses || [];
    for (var index = 0; index < clauses.length; index += 1) {
      if (!mcbFit(microbe, clauses[index])) {
        return false;
      }
    }
    return true;
  }

  function mcbSum(microbe) {
    return TRAITS.reduce(function (total, name) {
      return total + mcbInt(microbe.traits[name]);
    }, 0);
  }

  function mcbClone(microbe) {
    var traits = {};
    TRAITS.forEach(function (name) {
      traits[name] = mcbInt(microbe.traits[name]);
    });
    return { id: microbe.id, name: microbe.name, traits: traits };
  }

  /* The one auto mutation each offspring rolls: the lowest trait that still has
   * room under both the per trait ceiling and the microbe's budget. */
  function mcbOrdered(traits) {
    return TRAITS.slice().sort(function (a, b) {
      if (mcbInt(traits[a]) !== mcbInt(traits[b])) {
        return mcbInt(traits[a]) - mcbInt(traits[b]);
      }
      return TRAITS.indexOf(a) - TRAITS.indexOf(b);
    });
  }

  /* Selection favours what the card rewarded: the offspring's single bounded
   * mutation lifts its strongest trait among the pair the card just scored, and
   * falls back to the strongest trait it has at all. It stalls when the budget
   * is full, which is the pressure the player's own points have to work around. */
  function mcbMutate(microbe, level, card) {
    var out = mcbClone(microbe);
    var wanted = [];
    var clauses = (card && card.clauses) || [];
    for (var c = 0; c < clauses.length; c += 1) {
      if (wanted.indexOf(clauses[c].trait) === -1) {
        wanted.push(clauses[c].trait);
      }
      if (wanted.indexOf(clauses[c].alt) === -1) {
        wanted.push(clauses[c].alt);
      }
    }
    var order = mcbOrdered(out.traits).reverse();
    var ranked = order.slice().sort(function (a, b) {
      var inA = wanted.indexOf(a) === -1 ? 0 : 1;
      var inB = wanted.indexOf(b) === -1 ? 0 : 1;
      if (inA !== inB) {
        return inB - inA;
      }
      return mcbInt(out.traits[b]) - mcbInt(out.traits[a]);
    });
    for (var index = 0; index < ranked.length; index += 1) {
      var name = ranked[index];
      if (mcbInt(out.traits[name]) < mcbInt(level.traitMax) && mcbSum(out) < mcbInt(level.cap)) {
        out.traits[name] = mcbInt(out.traits[name]) + 1;
        return { microbe: out, grew: true };
      }
    }
    return { microbe: out, grew: false };
  }

  /* Selection, exported: who lives, who they clone into, and the count. */
  function microbeSurvive(population, card, level) {
    var list = population || [];
    var stats = level || { cap: 15, traitMax: 7 };
    var survivors = [];
    for (var index = 0; index < list.length; index += 1) {
      if (mcbSurvives(list[index], card)) {
        survivors.push(list[index]);
      }
    }
    var offspring = [];
    var stalled = 0;
    for (var s = 0; s < survivors.length; s += 1) {
      var born = mcbMutate(survivors[s], stats, card);
      offspring.push(born.microbe);
      if (!born.grew) {
        stalled += 1;
      }
    }
    /* A healthy dish blooms: five survivors or more seed a sixth microbe. */
    if (survivors.length >= 5 && offspring.length < POP) {
      offspring.push(mcbMutate(survivors[0], stats, card).microbe);
    }
    return {
      survivors: survivors,
      offspring: offspring,
      count: offspring.length,
      survived: survivors.length,
      stalled: stalled,
      collapsed: survivors.length < FLOOR,
    };
  }

  function microbeName(index) {
    return t("mcbStrain", { i: index + 1, n: t("mcbNames" + index) });
  }

  /* Six strains, jittered from the seed so a culture replays identically while
   * still starting lopsided enough to matter. */
  /* Six strains that all start playable: every trait gets the floor share, the
   * remainder is dealt one at a time, and the seeded jitter only swaps a point
   * between two traits so no strain begins already doomed. */
  function mcbPopulation(level, seed) {
    var rand = mcbRandom(seed);
    var list = [];
    var total = Math.max(TRAITS.length, mcbInt(level.start));
    var floorShare = Math.floor(total / TRAITS.length);
    var extra = total - floorShare * TRAITS.length;
    for (var index = 0; index < POP; index += 1) {
      var traits = {};
      TRAITS.forEach(function (name) {
        traits[name] = mcbClamp(floorShare, 0, mcbInt(level.traitMax));
      });
      for (var e = 0; e < extra; e += 1) {
        var gift = TRAITS[(index + e) % TRAITS.length];
        traits[gift] = mcbInt(traits[gift]) + 1;
      }
      for (var swap = 0; swap < 2; swap += 1) {
        var order = mcbOrdered(traits);
        var from = order[order.length - 1];
        var to = order[0];
        if (from !== to && mcbInt(traits[from]) > 0 && mcbInt(traits[to]) < mcbInt(level.traitMax) && rand() < 0.75) {
          traits[from] = mcbInt(traits[from]) - 1;
          traits[to] = mcbInt(traits[to]) + 1;
        }
      }
      list.push({ id: index, name: microbeName(index), traits: traits });
    }
    return list;
  }

  /* How many points of headroom a microbe still has under the budget. */
  function mcbRoom(microbe, level) {
    return Math.max(0, mcbInt(level.cap) - mcbSum(microbe));
  }

  function mcbRaise(list, pick, trait, level) {
    if (!list[pick] || !mcbTraitKnown(trait)) {
      return null;
    }
    if (mcbInt(list[pick].traits[trait]) >= mcbInt(level.traitMax)) {
      return null;
    }
    if (mcbRoom(list[pick], level) <= 0) {
      return null;
    }
    list[pick].traits[trait] = mcbInt(list[pick].traits[trait]) + 1;
    return list[pick];
  }

  function mcbTraitKnown(name) {
    return TRAITS.indexOf(name) !== -1;
  }

  /* Greedy allocation for one generation: spend each point where it saves the
   * most lives on the card in front of you, then where it buys the longest
   * future. Exported because it is exactly what microbeBeatable runs. */
  function microbeAllocate(list, card, future, points, level) {
    var pool = [];
    var index;
    for (index = 0; index < list.length; index += 1) {
      pool.push(mcbClone(list[index]));
    }
    var spent = 0;
    var waste = 0;
    for (var step = 0; step < Math.max(0, mcbInt(points)); step += 1) {
      var best = null;
      for (var pick = 0; pick < pool.length; pick += 1) {
        for (var ti = 0; ti < TRAITS.length; ti += 1) {
          var trait = TRAITS[ti];
          var trial = [];
          for (index = 0; index < pool.length; index += 1) {
            trial.push(mcbClone(pool[index]));
          }
          if (!mcbRaise(trial, pick, trait, level)) {
            continue;
          }
          var score = microbeSurvive(trial, card, level).survived * 1000;
          score += mcbProspect(trial, future) * 40;
          score += mcbSlack(trial, card) * 4;
          if (!best || score > best.score) {
            best = { score: score, pick: pick, trait: trait, trial: trial };
          }
        }
      }
      if (!best) {
        waste += 1;
        continue;
      }
      pool = best.trial;
      spent += 1;
    }
    return { list: pool, spent: spent, waste: waste };
  }

  /* Total margin against the tightest clause, so equal survivor counts still
   * prefer the dish with the most buffer. */
  function mcbSlack(list, card) {
    var total = 0;
    for (var index = 0; index < list.length; index += 1) {
      var worst = 99;
      var clauses = card.clauses || [];
      for (var c = 0; c < clauses.length; c += 1) {
        var clause = clauses[c];
        var best = mcbCover(list[index], clause) - mcbInt(clause.demand);
        worst = Math.min(worst, best);
      }
      total += worst > 0 ? worst : 0;
    }
    return total;
  }

  /* How far ahead the current dish already reaches: for each upcoming card we
   * credit only the lives above the floor, so a point that buys insurance the
   * colony does not need scores nothing. */
  function mcbProspect(list, future) {
    var cards = future || [];
    var total = 0;
    for (var c = 0; c < cards.length; c += 1) {
      var live = 0;
      for (var index = 0; index < list.length; index += 1) {
        if (mcbSurvives(list[index], cards[c])) {
          live += 1;
        }
      }
      total += Math.max(0, live - (FLOOR - 1));
    }
    return total;
  }

  /* The floor proof: the greedy line, generation by generation. */
  function microbeBeatable(level) {
    var gens = Math.max(1, mcbInt(level.gens));
    var list = mcbPopulation(level, level.seed);
    var total = 0;
    var waste = 0;
    var minSurvivors = POP;
    var cleared = 0;
    for (var gen = 0; gen < gens; gen += 1) {
      var card = mcbCard(level, gen);
      var plan = microbeAllocate(list, card, mcbSequence(level).slice(gen + 1, gen + 4), POINTS, level);
      list = plan.list;
      waste += plan.waste;
      var result = microbeSurvive(list, card, level);
      if (result.collapsed) {
        return { cleared: cleared, minSurvivors: minSurvivors, metric: total * 100 - waste, collapsed: true, gen: gen };
      }
      minSurvivors = Math.min(minSurvivors, result.survived);
      total += result.survived;
      cleared += 1;
      list = result.offspring;
    }
    return {
      cleared: cleared,
      minSurvivors: minSurvivors,
      metric: total * 100 - waste,
      collapsed: false,
      gen: gens,
      survivors: total,
    };
  }

  function microbeMetric(survivors, waste) {
    return Math.max(0, mcbInt(survivors)) * 100 - Math.max(0, mcbInt(waste));
  }

  function initMicrobeLabGame(panelEl) {
    if (!panelEl) {
      return;
    }

    var campaign = createCampaign({ key: "microbe-lab-campaign", levels: mcbLevels });
    var levelDef = mcbLevels[Math.max(0, campaign.indexOf(campaign.nextLevelId()))];
    var run = null;
    var strainRows = [];
    var traitButtons = [];
    var clauseLines = [];

    var hud = document.createElement("div");
    hud.className = "game-hud";
    var genEl = document.createElement("strong");
    var pointEl = document.createElement("strong");
    var popEl = document.createElement("strong");
    hud.appendChild(mcbStat("mcbGenLabel", genEl));
    hud.appendChild(mcbStat("mcbPointLabel", pointEl));
    hud.appendChild(mcbStat("mcbPopLabel", popEl));

    var stage = document.createElement("div");
    stage.className = "mcb-stage";
    stage.setAttribute("tabindex", "0");
    stage.setAttribute("role", "application");
    stage.setAttribute("aria-label", t("mcbFieldLabel"));

    var cardBox = document.createElement("div");
    cardBox.className = "mcb-card";
    var cardTitle = document.createElement("strong");
    var cardText = document.createElement("span");
    cardBox.appendChild(cardTitle);
    cardBox.appendChild(cardText);
    for (var line = 0; line < 2; line += 1) {
      var clause = document.createElement("p");
      clause.className = "mcb-clause";
      cardBox.appendChild(clause);
      clauseLines.push(clause);
    }
    var peekLine = document.createElement("p");
    peekLine.className = "mcb-peek";
    cardBox.appendChild(peekLine);
    stage.appendChild(cardBox);

    var dish = document.createElement("div");
    dish.className = "mcb-dish";
    dish.setAttribute("role", "group");
    dish.setAttribute("aria-label", t("mcbDishLabel"));
    stage.appendChild(dish);

    var info = document.createElement("p");
    info.className = "mcb-info";

    var controls = document.createElement("div");
    controls.className = "mcb-controls";
    var modeBtn = mcbButton("mcb-btn", "mcbModeRaise", function () {
      toggleMode();
    });
    var peekBtn = mcbButton("mcb-btn", "mcbBtnPeek", function () {
      peek();
    });
    var newBtn = mcbButton("mcb-btn", "btnNewRound", function () {
      startRun();
    });
    newBtn.setAttribute("data-i18n", "btnNewRound");
    controls.appendChild(modeBtn);
    controls.appendChild(peekBtn);
    controls.appendChild(newBtn);

    var log = document.createElement("p");
    log.className = "mcb-log";

    var result = document.createElement("p");
    result.className = "game-result";
    result.setAttribute("role", "status");

    var pickerRow = document.createElement("div");
    pickerRow.className = "elements-row";
    var pickerLabel = document.createElement("label");
    pickerLabel.className = "elements-label";
    pickerLabel.setAttribute("for", "mcbCultureSel");
    pickerLabel.setAttribute("data-i18n", "mcbCultureSelectLabel");
    pickerLabel.textContent = t("mcbCultureSelectLabel");
    var picker = document.createElement("select");
    picker.className = "elements-select";
    picker.id = "mcbCultureSel";
    pickerRow.appendChild(pickerLabel);
    pickerRow.appendChild(picker);

    var actions = document.createElement("div");
    actions.className = "game-actions";
    var nextBtn = mcbButton("primary", "mcbBtnNext", function () {
      advance();
    });
    var bestEl = document.createElement("p");
    bestEl.className = "game-best";
    actions.appendChild(nextBtn);
    actions.appendChild(bestEl);

    var hint = document.createElement("p");
    hint.className = "game-hint";
    hint.setAttribute("data-i18n", "mcbHint");
    hint.textContent = t("mcbHint");

    [hud, stage, info, controls, log, result, pickerRow, actions, hint].forEach(function (node) {
      panelEl.appendChild(node);
    });

    stage.addEventListener("keydown", function (event) {
      if (!run) {
        return;
      }
      var key = event.key;
      if (key === "ArrowUp") {
        event.preventDefault();
        apply(1);
        render();
        return;
      }
      if (key === "ArrowDown") {
        event.preventDefault();
        apply(-1);
        render();
        return;
      }
      if (key === "ArrowLeft") {
        event.preventDefault();
        moveTrait(-1);
        return;
      }
      if (key === "ArrowRight") {
        event.preventDefault();
        moveTrait(1);
        return;
      }
      if (key === "Enter") {
        event.preventDefault();
        advance();
        return;
      }
      if (key === " ") {
        event.preventDefault();
        peek();
        return;
      }
      var digit = Number(key);
      if (isFinite(digit) && digit >= 1 && digit <= POP) {
        event.preventDefault();
        run.pick = mcbClamp(digit - 1, 0, run.list.length - 1);
        render();
      }
    });

    function mcbButton(extra, key, handler) {
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

    function mcbStat(key, valueEl) {
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
      run = {
        level: levelDef,
        gen: 0,
        gens: Math.max(1, mcbInt(levelDef.gens)),
        points: POINTS,
        waste: 0,
        survivors: 0,
        list: mcbPopulation(levelDef, (levelDef.seed + runs() * 131) >>> 0),
        pick: 0,
        trait: 0,
        mode: 1,
        peeked: false,
        over: null,
        events: [],
      };
      result.textContent = t("mcbPrompt", {
        name: t(levelDef.labelKey),
        twist: t(levelDef.twistKey),
        floor: FLOOR,
        gens: run.gens,
      });
      render();
    }

    var counted = 0;
    function runs() {
      counted += 1;
      return counted;
    }

    /* The button says which way a click will push, so the mode is never
     * carried by colour or an icon alone. */
    function setModeLabel() {
      var key = run.mode > 0 ? "mcbModeRaise" : "mcbModeLower";
      var label = modeBtn.childNodes[0].childNodes[0];
      label.setAttribute("data-i18n", key);
      label.textContent = t(key);
    }

    function toggleMode() {
      if (!run || run.over) {
        return;
      }
      run.mode = run.mode > 0 ? -1 : 1;
      setModeLabel();
      render();
    }

    function peek() {
      if (!run || run.over) {
        return;
      }
      run.peeked = true;
      info.textContent = t("mcbPeeked", { g: run.gen + 2 });
      render();
    }

    function moveTrait(step) {
      run.trait = (run.trait + mcbInt(step) + TRAITS.length) % TRAITS.length;
      render();
    }

    function apply(step) {
      if (!run || run.over) {
        return;
      }
      var microbe = run.list[run.pick];
      if (!microbe) {
        return;
      }
      var trait = TRAITS[run.trait];
      if (step > 0) {
        if (run.points <= 0) {
          info.textContent = t("mcbNoPoints");
          return;
        }
        var trial = [];
        for (var index = 0; index < run.list.length; index += 1) {
          trial.push(mcbClone(run.list[index]));
        }
        if (!mcbRaise(trial, run.pick, trait, run.level)) {
          info.textContent = t("mcbCapped", { n: mcbInt(run.level.traitMax), c: mcbInt(run.level.cap) });
          return;
        }
        run.list = trial;
        run.points -= 1;
        info.textContent = t("mcbRaised", { s: microbe.name, k: t("mcbT" + trait), n: mcbInt(microbe.traits[trait]) + 1 });
        return;
      }
      if (mcbInt(microbe.traits[trait]) <= 0) {
        info.textContent = t("mcbZero");
        return;
      }
      microbe.traits[trait] = mcbInt(microbe.traits[trait]) - 1;
      run.points += 1;
      info.textContent = t("mcbLowered", { s: microbe.name, k: t("mcbT" + trait), n: mcbInt(microbe.traits[trait]) });
    }

    function advance() {
      if (!run || run.over) {
        return;
      }
      var card = mcbCard(run.level, run.gen);
      run.waste += Math.max(0, run.points);
      var outcome = microbeSurvive(run.list, card, run.level);
      run.events = [t("mcbResolved", {
        name: t("mcbE" + card.id),
        g: run.gen + 1,
        s: outcome.survived,
        n: run.list.length,
      })];
      run.survivors += outcome.survived;
      if (outcome.collapsed) {
        run.over = "lost";
        result.textContent = t("mcbCollapsed", {
          g: run.gen + 1,
          s: outcome.survived,
          n: FLOOR,
          m: microbeMetric(run.survivors, run.waste),
        });
        render();
        return;
      }
      run.list = outcome.offspring;
      run.pick = mcbClamp(run.pick, 0, run.list.length - 1);
      run.gen += 1;
      run.points = POINTS;
      run.peeked = false;
      if (run.gen >= run.gens) {
        winRun();
        return;
      }
      render();
    }

    function winRun() {
      run.over = "won";
      var metric = microbeMetric(run.survivors, run.waste);
      var stars = starsFor(metric, run.level.starBand, "high");
      var outcome = campaign.record(run.level.id, { stars: stars, best: metric, better: "high" });
      var message = t("mcbWon", { g: run.gens, s: run.survivors, w: run.waste, st: stars });
      if (outcome.isBest) {
        message += " " + t("newBest");
      }
      if (outcome.unlockedNext) {
        message += " " + t("mcbNext");
      } else if (campaign.clearedCount() === mcbLevels.length) {
        message += " " + t("mcbDone");
      }
      result.textContent = message;
      logAction(t("logMicrobeLab", { g: run.gens, s: run.survivors }));
      var rect = nextBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      refreshPicker();
    }

    function render() {
      if (!run) {
        return;
      }
      var card = mcbCard(run.level, Math.min(run.gen, run.gens - 1));
      genEl.textContent = t("mcbGenValue", { n: Math.min(run.gen + 1, run.gens), max: run.gens });
      pointEl.textContent = t("mcbPointValue", { n: run.points, w: run.waste });
      popEl.textContent = t("mcbPopValue", { n: run.list.length, floor: FLOOR });

      cardTitle.textContent = t("mcbCardTitle", { g: run.gen + 1, name: t("mcbE" + card.id), m: card.marks });
      cardText.textContent = t("mcbE" + card.id + "Text");
      for (var c = 0; c < clauseLines.length; c += 1) {
        var clause = card.clauses[c];
        clauseLines[c].hidden = !clause;
        clauseLines[c].textContent = clause
          ? t("mcbClause", {
            k: t("mcbT" + clause.trait),
            n: clause.req,
            a: t("mcbT" + clause.alt),
            d: clause.demand,
          })
          : "";
      }
      var next = mcbCard(run.level, run.gen + 1 < run.gens ? run.gen + 1 : run.gen);
      peekLine.textContent = run.peeked
        ? t("mcbPeekOpen", { g: run.gen + 2, name: t("mcbE" + next.id), m: next.marks })
        : t("mcbPeekShut", { g: run.gen + 2 });

      if (dish.childNodes.length !== run.list.length) {
        dish.textContent = "";
        strainRows = [];
        traitButtons = [];
        for (var index = 0; index < run.list.length; index += 1) {
          buildRow(index);
        }
      }
      for (var r = 0; r < strainRows.length; r += 1) {
        var microbe = run.list[r];
        strainRows[r].select.textContent = t("mcbStrainCell", {
          i: r + 1,
          n: microbe.name,
          s: mcbSum(microbe),
          c: mcbInt(run.level.cap),
        });
        strainRows[r].select.className = "mcb-strain" + (run.pick === r ? " mcb-picked" : "") + (mcbSurvives(microbe, card) ? " mcb-fit" : " mcb-unfit");
        strainRows[r].select.setAttribute("aria-label", t("mcbStrainAria", {
          i: r + 1,
          n: microbe.name,
          s: mcbSum(microbe),
          c: mcbInt(run.level.cap),
          v: mcbSurvives(microbe, card) ? t("mcbWillLive") : t("mcbWillDie"),
          t: TRAITS.map(function (name) {
            return t("mcbT" + name) + " " + mcbInt(microbe.traits[name]);
          }).join(", "),
        }));
        for (var ti = 0; ti < TRAITS.length; ti += 1) {
          var trait = TRAITS[ti];
          var cell = traitButtons[r][ti];
          cell.textContent = t("mcbTraitCell", {
            g: mcbMarks[trait],
            v: mcbInt(microbe.traits[trait]),
            d: run.mode > 0 ? "+" : "-",
          });
          cell.className = "mcb-trait" + (run.pick === r && run.trait === ti ? " mcb-focus" : "") + (mcbInt(microbe.traits[trait]) >= mcbInt(run.level.traitMax) ? " mcb-maxed" : "");
          cell.setAttribute("aria-label", t("mcbTraitAria", {
            s: microbe.name,
            k: t("mcbT" + trait),
            v: mcbInt(microbe.traits[trait]),
            x: mcbInt(run.level.traitMax),
            r: mcbRoom(microbe, run.level),
            d: run.mode > 0 ? t("mcbRaiseWord") : t("mcbLowerWord"),
          }));
        }
      }
      modeBtn.disabled = !!run.over;
      setModeLabel();
      peekBtn.disabled = !!run.over || run.peeked;
      nextBtn.disabled = !!run.over;
      log.textContent = run.events && run.events.length ? run.events.join(" / ") : t("mcbSilence");
    }

    function buildRow(index) {
      var row = document.createElement("div");
      row.className = "mcb-row";
      var select = document.createElement("button");
      select.type = "button";
      select.className = "mcb-strain";
      select.addEventListener("click", function () {
        if (run.over) {
          return;
        }
        run.pick = index;
        render();
      });
      row.appendChild(select);
      var cells = [];
      TRAITS.forEach(function (trait) {
        var cell = document.createElement("button");
        cell.type = "button";
        cell.className = "mcb-trait";
        cell.addEventListener("click", function () {
          if (run.over) {
            return;
          }
          run.pick = index;
          run.trait = TRAITS.indexOf(trait);
          apply(run.mode);
          render();
        });
        row.appendChild(cell);
        cells.push(cell);
      });
      dish.appendChild(row);
      strainRows.push({ row: row, select: select });
      traitButtons.push(cells);
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
      bestEl.textContent = t("campaignStars", { n: campaign.totalStars(), max: campaign.maxStars() }) + " \u00b7 " + (best ? t("mcbBest", { n: best }) : t("noBest"));
    }

    picker.addEventListener("change", function () {
      var position = campaign.indexOf(picker.value);
      if (position < 0 || !campaign.isUnlocked(picker.value)) {
        refreshPicker();
        return;
      }
      levelDef = mcbLevels[position];
      startRun();
      refreshPicker();
    });

    startRun();
    refreshPicker();
  }

  /* Bilingual copy travels with the game (see core.js addStrings). */
  App.addStrings({
    en: {
      "tabMicrobeLab": "Microbe Lab",
      "mcbZ1": "Warm Bench",
      "mcbZ2": "Sour Bench",
      "mcbZ3": "Teeth then Thirst",
      "mcbZ4": "Shock Clock",
      "mcbZ5": "Sealed Trial",
      "mcbTwist1": "heat wave only",
      "mcbTwist2": "acid bloom only",
      "mcbTwist3": "predators, then famine",
      "mcbTwist4": "one shock per generation",
      "mcbTwist5": "two pressures at once",
      "mcbGenLabel": "Generation",
      "mcbPointLabel": "Mutations",
      "mcbPopLabel": "Colony",
      "mcbGenValue": "{n}/{max}",
      "mcbPointValue": "{n} left - {w} wasted",
      "mcbPopValue": "{n} alive - floor {floor}",
      "mcbFieldLabel": "Petri dish: 1 to 6 pick a strain, Left and Right move the trait cursor, Up raises the trait, Down lowers it, Enter advances the generation, Space peeks the next environment card.",
      "mcbDishLabel": "The colony, one row per strain",
      "mcbCultureSelectLabel": "Culture",
      "mcbCardTitle": "Gen {g}: {name} {m}",
      "mcbClause": "{k} + {a} must reach {d} together",
      "mcbPeekOpen": "Scouted card {g}: {name} {m}",
      "mcbPeekShut": "Card {g} is still face down - press Space to scout it.",
      "mcbPeeked": "Card {g} is scouted: it stays face up for the rest of the run.",
      "mcbStrain": "Strain {i} {n}",
      "mcbNames0": "Ashlip",
      "mcbNames1": "Brine",
      "mcbNames2": "Cinder",
      "mcbNames3": "Dusk",
      "mcbNames4": "Ember",
      "mcbNames5": "Floe",
      "mcbStrainCell": "{i}. {n} [{s}/{c}]",
      "mcbStrainAria": "{i}. {n}, traits {t}, budget {s} of {c}. Against this card it {v}.",
      "mcbWillLive": "will live",
      "mcbWillDie": "will be culled",
      "mcbTraitCell": "{g}{v}{d}",
      "mcbTraitAria": "{s}: {k} {v} of {x}, {r} budget room left. Click to {d}.",
      "mcbRaiseWord": "raise it",
      "mcbLowerWord": "give the point back",
      "mcbTheat": "heat",
      "mcbTacid": "acid",
      "mcbTspeed": "speed",
      "mcbTdefence": "defence",
      "mcbBtnNext": "Next Generation",
      "mcbBtnPeek": "Scout card",
      "mcbModeRaise": "Mode: raise (+)",
      "mcbModeLower": "Mode: lower (-)",
      "mcbEheat": "Heat wave",
      "mcbEheatText": "The bench cooks: heat tolerance plus speed is what the card measures.",
      "mcbEacid": "Acid bloom",
      "mcbEacidText": "The medium sours: acid tolerance and the defence wall are scored as one pair.",
      "mcbEdefence": "Predator season",
      "mcbEdefenceText": "Grazers arrive: defence and speed together decide who is worth chasing.",
      "mcbEspeed": "Famine",
      "mcbEspeedText": "Food vanishes: how far you forage and how well you hoard are one pair.",
      "mcbEbrand": "Brand and teeth",
      "mcbEbrandText": "Two pressures at once, and speed is the partner in both pairs.",
      "mcbEempty": "Sour and starving",
      "mcbEemptyText": "Sour and starving: acid and defence are asked for by different pairs.",
      "mcbEgrey": "Teeth in a lean year",
      "mcbEgreyText": "Teeth in a lean year: defence and speed are asked to carry both clauses.",
      "mcbEvinegar": "Sauna of vinegar",
      "mcbEvinegarText": "Hot and sour together: heat and acid must both find a partner.",
      "mcbNoPoints": "No mutation points left - advance the generation to bank what you built.",
      "mcbCapped": "That strain is at its ceiling ({n} per trait, {c} total) - spend the point elsewhere.",
      "mcbZero": "That trait is already at zero.",
      "mcbRaised": "{s} gains 1 {k} (now {n})",
      "mcbLowered": "{s} gives back 1 {k} (now {n})",
      "mcbResolved": "Gen {g}, {name}: {s} of {n} strains divided",
      "mcbCollapsed": "Colony fell to {s} at generation {g} - the floor is {n}. Metric {m}.",
      "mcbWon": "{g} generations, {s} divisions, {w} wasted points - metric {m} for {st} stars.",
      "mcbNext": "Next culture unlocked.",
      "mcbDone": "Every dish has grown.",
      "mcbBest": "best metric {n}",
      "mcbSilence": "The incubator hums.",
      "mcbPrompt": "{name} - {twist}. Keep at least {floor} strains alive for {gens} generations.",
      "mcbHint": "Unspent points count as waste, so feed the pair the NEXT card wants before you advance.",
      "logMicrobeLab": "Ran {g} generations with {s} divisions",
    },
    zh: {
      "tabMicrobeLab": "微观培养",
      "mcbZ1": "温箱甲",
      "mcbZ2": "酸槽乙",
      "mcbZ3": "先有牙，后有饥",
      "mcbZ4": "冲击钟",
      "mcbZ5": "封存试炼",
      "mcbTwist1": "只有热浪",
      "mcbTwist2": "只有酸华",
      "mcbTwist3": "捕食季，随后饥荒",
      "mcbTwist4": "每代一种冲击",
      "mcbTwist5": "两种压力同时来",
      "mcbGenLabel": "世代",
      "mcbPointLabel": "突变点",
      "mcbPopLabel": "菌群",
      "mcbGenValue": "{n}/{max}",
      "mcbPointValue": "剩 {n} - 已浪费 {w}",
      "mcbPopValue": "存活 {n} - 下限 {floor}",
      "mcbFieldLabel": "培养皿：数字 1 到 6 选菌株，左右移动性状光标，上键加一点，下键减一点，回车推进世代，空格侦察下一张环境卡。",
      "mcbDishLabel": "菌群，每行一个菌株",
      "mcbCultureSelectLabel": "培养系",
      "mcbCardTitle": "第 {g} 代：{name} {m}",
      "mcbClause": "{k} + {a} 必须合计达到 {d}",
      "mcbPeekOpen": "已侦察第 {g} 张卡：{name} {m}",
      "mcbPeekShut": "第 {g} 张卡还扣着——按空格侦察。",
      "mcbPeeked": "第 {g} 张卡已侦察：本局一直保持翻明。",
      "mcbStrain": "{i} 号菌株 {n}",
      "mcbNames0": "灰唇",
      "mcbNames1": "盐水",
      "mcbNames2": "余烬",
      "mcbNames3": "暮色",
      "mcbNames4": "星火",
      "mcbNames5": "薄冰",
      "mcbStrainCell": "{i}. {n} [{s}/{c}]",
      "mcbStrainAria": "第 {i} 号 {n}，性状 {t}，预算已用 {s}/{c}。面对这张卡它{v}。",
      "mcbWillLive": "能活下来",
      "mcbWillDie": "会被淘汰",
      "mcbTraitCell": "{g}{v}{d}",
      "mcbTraitAria": "{s}：{k} {v}（上限 {x}），预算还剩 {r}。点击可{d}。",
      "mcbRaiseWord": "加一点",
      "mcbLowerWord": "退回这点",
      "mcbTheat": "耐热",
      "mcbTacid": "耐酸",
      "mcbTspeed": "速度",
      "mcbTdefence": "防护",
      "mcbBtnNext": "推进世代",
      "mcbBtnPeek": "侦察下张卡",
      "mcbModeRaise": "模式：加 (+)",
      "mcbModeLower": "模式：减 (-)",
      "mcbEheat": "热浪",
      "mcbEheatText": "温箱在烤：卡上量的是耐热加速度的合计。",
      "mcbEacid": "酸华",
      "mcbEacidText": "培养基变酸：耐酸与防护按一对来计算。",
      "mcbEdefence": "捕食季",
      "mcbEdefenceText": "啃食者来了：防护加速度决定它值得追吗。",
      "mcbEspeed": "饥荒",
      "mcbEspeedText": "食物消失：能走多远和能存多久是一对。",
      "mcbEbrand": "灼热与利牙",
      "mcbEbrandText": "两种压力一起来，而逃生性状能同时接住两边。",
      "mcbEempty": "又酸又饿",
      "mcbEemptyText": "酸华撞上饥荒：耐酸和防护分属不同的两对。",
      "mcbEgrey": "荒年的捕食者",
      "mcbEgreyText": "荒年里的牙齿：防护和速度要同时支撑两个条件。",
      "mcbEvinegar": "醋里蒸桑拿",
      "mcbEvinegarText": "又热又酸：耐热和耐酸都得找到自己的搭档。",
      "mcbNoPoints": "突变点用完了——推进世代，把改好的菌群定下来。",
      "mcbCapped": "这个菌株已经到顶（单项上限 {n}，总预算 {c}）——这点会白白浪费。",
      "mcbZero": "这个性状已经是 0 了。",
      "mcbRaised": "{s} 的 {k} 加 1（现 {n}）",
      "mcbLowered": "{s} 退回 1 点 {k}（现 {n}）",
      "mcbResolved": "第 {g} 代 {name}：{n} 个菌株里 {s} 个完成分裂",
      "mcbCollapsed": "第 {g} 代菌群只剩 {s} 个——下限是 {n}。得分 {m}。",
      "mcbWon": "{g} 代、{s} 次分裂、浪费 {w} 点 - 得分 {m}，获得 {st} 星。",
      "mcbNext": "解锁下一套培养系。",
      "mcbDone": "每个培养皿都长起来了。",
      "mcbBest": "最佳得分 {n}",
      "mcbSilence": "恒温箱嗡嗡作响。",
      "mcbPrompt": "{name}——{twist}。请在 {gens} 代里始终保住至少 {floor} 个菌株。",
      "mcbHint": "没花掉的突变点会算成浪费，推进世代前先把它们填进下一张卡要的那一对性状。",
      "logMicrobeLab": "跑完 {g} 代，共 {s} 次分裂",
    },
  });

  App.registerGame({
    name: "microbeLab",
    tabKey: "tabMicrobeLab",
    init: initMicrobeLabGame,
    guide: {
      svg:
        '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="6" y="6" width="108" height="64" rx="5" fill="rgba(30,41,59,.75)" stroke="rgba(148,163,184,.45)"/>' +
        '<circle cx="60" cy="38" r="27" fill="none" stroke="rgba(148,163,184,.4)"/>' +
        '<text x="30" y="26" font-size="9" fill="#a3e635">\u26005</text>' +
        '<text x="48" y="20" font-size="9" fill="#a3e635">\u25cd2</text>' +
        '<text x="70" y="26" font-size="9" fill="#a3e635">\u224b6</text>' +
        '<text x="86" y="40" font-size="9" fill="#fb7185">\u25a41</text>' +
        '<text x="72" y="58" font-size="9" fill="#a3e635">\u26004</text>' +
        '<text x="44" y="58" font-size="9" fill="#a3e635">\u25cd3</text>' +
        '<text x="24" y="44" font-size="8" fill="#94a3b8">+3 pts</text></svg>',
      en: [
        "Aim: keep at least 4 of the 6 strains dividing for all 10 generations. Drop to 3 and the culture collapses.",
        "Card: every generation an environment hits - heat wave, acid bloom, predator season, famine, and later two at once. The card prints the numbers it needs.",
        "Rule: every card names a PAIR of traits and a total - the strain lives when those two traits add up to the printed demand, which is the card number plus three.",
        "Spend: 3 mutation points per generation, on any strain. Arrow Up raises the focused trait, Arrow Down gives the point back, 1 to 6 switch strain, Left and Right move the trait cursor, Enter advances, Space scouts the next card.",
        "Squeeze: each strain has a trait budget and a per-trait ceiling, so a raise that would break either is refused, and any point you leave unbanked when the card resolves is counted as waste. That is the whole trade-off.",
        "Scoring: metric = divisions x 100 - wasted points, so more survivors first and less waste as the documented tie-break. Selection itself never rolls a die: survivors and their single auto mutation are a pure function of the dish and the card.",
      ],
      zh: [
        "目标：10 代里始终让 6 个菌株中的至少 4 个继续分裂。只剩 3 个，培养就崩溃。",
        "环境卡：每一代换一张——热浪、酸华、捕食季、饥荒，越到后面越是两张叠着来。卡片会把要求的数字写在脸上。",
        "规则：每张卡点名一对性状和一个合计值——这两项加起来达到印出来的需求（卡面数字再加 3），菌株才能活。",
        "花费：每代 3 个突变点，可投给任意菌株。上方向键给当前性状加一点，下方向键把点退回，数字 1 到 6 换菌株，左右移动性状光标，回车推进世代，空格侦察下一张卡。",
        "张力：每个菌株都有性状预算，会顶破上限的加点会被拒绝并记为浪费——没花完的点同样算浪费。这正是本局的取舍所在。",
        "计分：得分 = 分裂数 x 100 - 浪费点数，所以先看存活数，再用浪费点数作明文规定的平手判定。筛选过程完全不靠骰子：存活者与它们那一次自动突变，只是培养盘与环境卡的函数。",
      ],
    },
  });

  /* Exported for the other modules and the headless tests. */
  App.initMicrobeLabGame = initMicrobeLabGame;
  App.microbeSurvive = microbeSurvive;
  App.microbeBeatable = microbeBeatable;
  App.microbeAllocate = microbeAllocate;
  App.microbeCard = mcbCard;
  App.microbeSequence = mcbSequence;
  App.microbePopulation = mcbPopulation;
  App.microbeMetric = microbeMetric;
  App.microbeSurvives = mcbSurvives;
  App.microbeLevels = mcbLevels;
  App.microbeRandom = mcbRandom;
})(window.CapitalConvert = window.CapitalConvert || {});
