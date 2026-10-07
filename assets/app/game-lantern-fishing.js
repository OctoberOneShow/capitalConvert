/* Lantern Fishing - depth and tension in a side-view water column.
 * The lure is a weight on a line: hold to sink, release to rise, and every
 * species decides how it comes to bite. Once it is hooked the fight is a
 * tension model with its own rhythm, so no two species land the same way. */
(function (App) {
  var t = App.t;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  var createCampaign = App.createCampaign;
  var fillCampaignPicker = App.fillCampaignPicker;
  var starsFor = App.starsFor;

  var lfsW = 360;
  var lfsH = 420;
  var lfsTop = 58;
  var lfsMpp = 8;
  var lfsSink = 78;
  var lfsRise = 58;
  var lfsDrift = 62;
  var lfsSnapWindow = 0.4;
  var lfsSlackWindow = 1.5;

  /* Each species owns an approach mode and a fight rhythm: `runs` is how many
   * head-shakes it makes before it tires, which is the whole difference between
   * a rhythm you tap and one you have to outlast. `taste` is the widest lantern
   * band it will still work with: the lurker only commits in dim water. */
  var lfsSpecies = {
    glintfin: { tag: "G", nameKey: "lfsSpGlintfin", mode: "curious", taste: 999, window: 1.2, spin: 1.5, close: 13, speed: 46, runs: 2, runLen: 1.3, wait: 1.2, pull: 0.75 },
    razor: { tag: "R", nameKey: "lfsSpRazor", mode: "bold", taste: 999, window: 0.6, spin: 2.4, close: 26, speed: 88, runs: 3, runLen: 0.9, wait: 0.6, pull: 1.15 },
    lurker: { tag: "P", nameKey: "lfsSpLurker", mode: "shy", taste: 68, window: 1.5, spin: 1.1, close: 9, speed: 34, runs: 4, runLen: 1.1, wait: 1.5, pull: 1.35 },
    snatcher: { tag: "S", nameKey: "lfsSpSnatcher", mode: "scavenger", taste: 999, window: 0.9, spin: 3, close: 40, speed: 110, runs: 0, runLen: 0, wait: 0, pull: 0 },
  };

  var lfsLevels = [
    { id: "l1", labelKey: "lfsZ1", need: 3, named: "glintfin", namedNeed: 2, pool: ["glintfin", "glintfin"], fuel: 90, starFuel: [44, 28, 12], band: 100 },
    { id: "l2", labelKey: "lfsZ2", need: 4, named: "razor", namedNeed: 2, pool: ["glintfin", "razor"], fuel: 105, starFuel: [42, 26, 10], band: 94 },
    { id: "l3", labelKey: "lfsZ3", need: 4, named: "lurker", namedNeed: 3, pool: ["lurker", "glintfin"], fuel: 110, starFuel: [40, 24, 10], band: 54 },
    { id: "l4", labelKey: "lfsZ4", need: 4, named: "glintfin", namedNeed: 2, pool: ["glintfin", "razor", "snatcher"], fuel: 110, starFuel: [36, 22, 8], band: 88 },
    { id: "l5", labelKey: "lfsZ5", need: 6, named: "lurker", namedNeed: 2, pool: ["glintfin", "razor", "lurker", "snatcher"], fuel: 140, starFuel: [40, 24, 8], band: 78 },
  ];

  /* --- pure core ---------------------------------------------------------- */
  function lfsRng(seed) {
    var state = (seed >>> 0) + 1;
    return function next() {
      state = (state * 1103515245 + 12345) >>> 0;
      return state / 4294967296;
    };
  }

  function lfsDepth(y) {
    return Math.max(0, (y - lfsTop) / lfsMpp);
  }

  /* The bite choreography. `state` carries the fish plus its surroundings (the
   * lure it is reading and the lit band it can or cannot bear), and the return
   * value is a brand new state with an optional event flag. */
  function lfsApproach(state, dt) {
    var step = dt > 0 ? Math.min(dt, 0.032) : 0;
    var spec = lfsSpecies[state.kind] || lfsSpecies.glintfin;
    var next = {
      id: state.id,
      kind: state.kind,
      x: state.x,
      y: state.y,
      vx: state.vx || 0,
      vy: state.vy || 0,
      phase: state.phase || "roam",
      timer: state.timer || 0,
      angle: state.angle || 0,
      orbit: state.orbit || 46,
      lureX: state.lureX,
      lureY: state.lureY,
      band: state.band,
      event: null,
    };
    var dx = next.lureX - next.x;
    var dy = next.lureY - next.y;
    var dist = Math.sqrt(dx * dx + dy * dy) || 1;

    if (next.phase === "roam") {
      next.timer -= step;
      next.vx += Math.cos(next.angle) * 26 * step;
      next.vy += Math.sin(next.angle * 0.7) * 14 * step;
      if (next.timer <= 0) {
        next.timer = 0.8 + (next.id % 7) * 0.13;
        next.angle = dist > 1 ? Math.atan2(dy, dx) : 1;
      }
      var interest = next.band <= spec.taste;
      if (spec.mode === "scavenger") {
        /* The snatcher only cares when a rival is already committed. */
        if (state.rival && dist < 150) {
          next.phase = "steal";
        }
      } else if (interest && dist < (spec.mode === "bold" ? 150 : 108)) {
        next.phase = spec.mode === "bold" ? "charge" : "circle";
        next.orbit = dist;
        next.angle = Math.atan2(dy, dx);
        next.timer = spec.mode === "curious" ? 2.4 : next.timer;
      } else if (!interest) {
        next.vx -= (dx / dist) * 40 * step;
        next.vy -= (dy / dist) * 40 * step;
      }
    } else if (next.phase === "circle") {
      next.angle += spec.spin * step;
      next.orbit = Math.max(8, next.orbit - spec.close * step);
      var wantX = next.lureX + Math.cos(next.angle) * next.orbit;
      var wantY = next.lureY + Math.sin(next.angle) * next.orbit;
      next.vx = (wantX - next.x) * 2.6;
      next.vy = (wantY - next.y) * 2.6;
      if (!interest) {
        next.phase = "roam";
        next.timer = 1.2;
      }
      if (next.orbit <= 10) {
        next.phase = "close";
      }
    } else if (next.phase === "charge" || next.phase === "steal" || next.phase === "close") {
      next.vx = (dx / dist) * spec.speed;
      next.vy = (dy / dist) * spec.speed;
      if (dist < 10) {
        next.phase = "bite";
        next.timer = spec.window;
        next.event = spec.mode === "scavenger" ? "stole" : "bite";
        next.vx = 0;
        next.vy = 0;
      }
    } else if (next.phase === "bite") {
      next.timer -= step;
      next.x = next.lureX;
      next.y = next.lureY;
      if (next.timer <= 0) {
        next.phase = "gone";
        next.timer = 2.4;
        next.event = "spat";
      }
    } else if (next.phase === "gone") {
      next.timer -= step;
      next.vx = (next.x - next.lureX) * 0.8;
      next.vy = -34;
      if (next.timer <= 0) {
        next.phase = "left";
      }
    }
    next.x += next.vx * step;
    next.y += next.vy * step;
    if (next.x < 14) {
      next.x = 14;
      next.vx = Math.abs(next.vx);
      next.angle = 0;
    }
    if (next.x > lfsW - 14) {
      next.x = lfsW - 14;
      next.vx = -Math.abs(next.vx);
      next.angle = Math.PI;
    }
    if (next.y < lfsTop + 12) {
      next.y = lfsTop + 12;
      next.vy = Math.abs(next.vy) * 0.4;
    }
    if (next.y > lfsH - 12) {
      next.y = lfsH - 12;
      next.vy = -Math.abs(next.vy) * 0.4;
    }
    return next;
  }

  /* The fight. `state` is the line: how hard it is loaded, how tired the fish
   * is, how deep it is coming up. Reeling loads the line and works the fish;
   * over the limit for more than 0.4s and it parts, near zero and the hook
   * slides out. */
  function lfsTension(state, input, dt) {
    var step = dt > 0 ? Math.min(dt, 0.032) : 0;
    var next = {
      kind: state.kind,
      tension: state.tension || 0,
      health: state.health || 100,
      limit: state.limit || 100,
      over: state.over || 0,
      slack: state.slack || 0,
      runs: state.runs || 0,
      runTimer: state.runTimer || 0,
      waitTimer: state.waitTimer || 0,
      inRun: !!state.inRun,
      depth: state.depth || 10,
      reel: input && input.reel ? 1 : 0,
      snapped: false,
      landed: false,
      escaped: false,
    };
    var spec = lfsSpecies[next.kind] || lfsSpecies.glintfin;
    if (next.runs > 0) {
      if (next.inRun) {
        next.runTimer -= step;
        if (next.runTimer <= 0) {
          next.inRun = false;
          next.runs -= 1;
          next.waitTimer = spec.wait;
        }
      } else {
        next.waitTimer -= step;
        if (next.waitTimer <= 0) {
          next.inRun = true;
          next.runTimer = spec.runLen;
        }
      }
    }
    var pull = next.inRun ? spec.pull : 0.22;
    var load = next.reel ? 38 + pull * 62 : -46;
    next.tension += load * step;
    if (next.tension < 0) {
      next.tension = 0;
    }
    if (next.tension > next.limit * 1.5) {
      next.tension = next.limit * 1.5;
    }
    if (next.tension > next.limit) {
      next.over += step;
      next.slack = 0;
    } else {
      next.over = Math.max(0, next.over - step * 2);
      if (next.tension < 9) {
        next.slack += step;
      } else {
        next.slack = 0;
      }
    }
    /* Tiring the fish is the reward for loading it while it is NOT pulling, so
     * the rhythm is: ease off through the run, wind through the pause. */
    if (next.reel && next.tension <= next.limit) {
      next.health -= (11 + (1 - pull) * 26) * step;
      next.depth -= (next.tension > 24 ? 2.6 : 0.7) * step;
    } else if (!next.reel && next.tension > 40) {
      next.depth += 1.1 * step;
    }
    if (next.depth < 0) {
      next.depth = 0;
    }
    if (next.over > lfsSnapWindow) {
      next.snapped = true;
    }
    if (next.slack > lfsSlackWindow) {
      next.escaped = true;
    }
    if (next.health <= 0 || next.depth <= 0.4) {
      next.landed = true;
    }
    next.health = Math.max(0, next.health);
    return next;
  }

  App.fishApproach = lfsApproach;
  App.tensionStep = lfsTension;
  App.lanternDepth = lfsDepth;
  App.lanternSpecies = lfsSpecies;
  App.lanternLevels = lfsLevels;

  function initLanternFishingGame(panelEl) {
    if (!panelEl) {
      return;
    }

    var campaign = createCampaign({ key: "lantern-fishing-campaign", levels: lfsLevels });
    var first = campaign.indexOf(campaign.nextLevelId());
    var level = lfsLevels[first < 0 ? 0 : first];
    var lure = { x: lfsW / 2, y: lfsTop + 70, vy: 0 };
    var pointerTarget = null;
    var fish = [];
    var fight = null;
    var holding = false;
    var reeling = false;
    var steer = 0;
    var fuel = level.fuel;
    var landed = 0;
    var counts = {};
    var stolen = 0;
    var snaps = 0;
    var over = false;
    var bubbles = [];
    var spawnAt = 0;
    var nextId = 1;
    var rng = lfsRng(1);
    var rafId = null;
    var lastFrame = 0;
    var paused = false;

    /* --- markup ---------------------------------------------------------- */
    var hud = document.createElement("div");
    hud.className = "game-hud";
    var fuelEl = document.createElement("strong");
    var haulEl = document.createElement("strong");
    var depthEl = document.createElement("strong");
    var lineEl = document.createElement("strong");
    hud.appendChild(makeStat("lfsFuelLabel", fuelEl));
    hud.appendChild(makeStat("lfsHaulLabel", haulEl));
    hud.appendChild(makeStat("lfsDepthLabel", depthEl));
    hud.appendChild(makeStat("lfsLineLabel", lineEl));

    var canvas = document.createElement("canvas");
    canvas.className = "lfs-canvas";
    canvas.width = lfsW;
    canvas.height = lfsH;
    canvas.setAttribute("tabindex", "0");
    canvas.setAttribute("role", "application");
    canvas.setAttribute("aria-label", t("lfsFieldLabel"));

    var call = document.createElement("p");
    call.className = "lfs-call";

    var result = document.createElement("p");
    result.className = "game-result";
    result.setAttribute("role", "status");

    var bedRow = document.createElement("div");
    bedRow.className = "elements-row";
    var bedLabel = document.createElement("label");
    bedLabel.className = "elements-label";
    bedLabel.setAttribute("for", "lfsBedSel");
    bedLabel.setAttribute("data-i18n", "lfsBedSelectLabel");
    bedLabel.textContent = t("lfsBedSelectLabel");
    var bedSel = document.createElement("select");
    bedSel.className = "elements-select";
    bedSel.id = "lfsBedSel";
    bedRow.appendChild(bedLabel);
    bedRow.appendChild(bedSel);

    var actions = document.createElement("div");
    actions.className = "game-actions";
    var castBtn = document.createElement("button");
    castBtn.type = "button";
    castBtn.className = "primary";
    var castLabel = document.createElement("span");
    castLabel.setAttribute("data-i18n", "lfsBtnCast");
    castLabel.textContent = t("lfsBtnCast");
    var castContent = document.createElement("span");
    castContent.className = "button-content";
    castContent.appendChild(castLabel);
    castBtn.appendChild(castContent);
    var bestEl = document.createElement("p");
    bestEl.className = "game-best";
    actions.appendChild(castBtn);
    actions.appendChild(bestEl);

    var hint = document.createElement("p");
    hint.className = "game-hint";
    hint.setAttribute("data-i18n", "lfsHint");
    hint.textContent = t("lfsHint");

    [hud, canvas, call, result, bedRow, actions, hint].forEach(function (node) {
      panelEl.appendChild(node);
    });

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

    var ctx = canvas.getContext("2d");

    function refreshPicker() {
      fillCampaignPicker(
        bedSel,
        campaign,
        function (def) {
          return t(def.labelKey);
        },
        t("elementsLocked"),
      );
      bedSel.value = level.id;
      bestEl.textContent = t("campaignStars", {
        n: campaign.totalStars(),
        max: campaign.maxStars(),
      });
    }

    function tally() {
      var parts = [];
      var seen = {};
      for (var i = 0; i < level.pool.length; i += 1) {
        var kind = level.pool[i];
        if (seen[kind] || lfsSpecies[kind].mode === "scavenger") {
          continue;
        }
        seen[kind] = 1;
        parts.push(t("lfsTally", { g: t(lfsSpecies[kind].nameKey), n: counts[kind] || 0 }));
      }
      return parts.join(" \u00b7 ");
    }

    function renderHud() {
      fuelEl.textContent = Math.max(0, Math.ceil(fuel)) + "s";
      haulEl.textContent = landed + "/" + level.need;
      depthEl.textContent = lfsDepth(lure.y).toFixed(1) + "m";
      var pct = fight ? Math.round((fight.tension / fight.limit) * 100) : 0;
      lineEl.textContent = pct + "%";
    }

    /* --- casting --------------------------------------------------------- */
    function spawnFish() {
      var kind = level.pool[Math.floor(rng() * level.pool.length)];
      var left = rng() < 0.5;
      var fishOne = {
        id: nextId,
        kind: kind,
        x: left ? 16 : lfsW - 16,
        y: lfsTop + 30 + rng() * (lfsH - lfsTop - 60),
        vx: left ? 24 : -24,
        vy: 0,
        phase: "roam",
        timer: 1,
        angle: left ? 0 : Math.PI,
        orbit: 46,
        lureX: lure.x,
        lureY: lure.y,
        band: litBand(),
      };
      nextId += 1;
      fish.push(fishOne);
    }

    function litBand() {
      /* The lantern dims with its fuel, so a long bed narrows what you can see
       * as well as what you can afford. */
      var share = level.fuel > 0 ? Math.max(0, fuel / level.fuel) : 0;
      return level.band * (0.45 + 0.55 * share);
    }

    function setHook() {
      if (!fight) {
        var biting = null;
        for (var i = 0; i < fish.length; i += 1) {
          if (fish[i].phase === "bite") {
            biting = fish[i];
            break;
          }
        }
        if (!biting) {
          call.textContent = t("lfsEmptyStrike");
          return;
        }
        var spec = lfsSpecies[biting.kind];
        fish.splice(fish.indexOf(biting), 1);
        fight = {
          kind: biting.kind,
          tension: 24,
          health: 100,
          limit: 100,
          over: 0,
          slack: 0,
          runs: spec.runs,
          runTimer: 0,
          waitTimer: spec.wait * 0.5,
          inRun: false,
          depth: lfsDepth(biting.y),
          snapped: false,
          landed: false,
          escaped: false,
        };
        call.textContent = t("lfsHooked", { g: t(spec.nameKey), r: spec.runs });
        renderHud();
        return;
      }
      reeling = true;
    }

    function landIt(kind) {
      counts[kind] = (counts[kind] || 0) + 1;
      landed += 1;
      fight = null;
      spawnAt = 0.7;
      call.textContent = t("lfsLanded", { g: t(lfsSpecies[kind].nameKey), n: landed, need: level.need }) + " \u00b7 " + tally();
      if (goalMet()) {
        finish();
        return;
      }
      var gap = goalGap();
      if (gap) {
        call.textContent = call.textContent + " \u2014 " + gap;
      }
    }

    function goalMet() {
      if (landed < level.need) {
        return false;
      }
      return !level.named || (counts[level.named] || 0) >= level.namedNeed;
    }

    function goalGap() {
      var missing = [];
      var short = level.need - landed;
      if (short > 0) {
        missing.push(t("lfsNeedMore", { n: short }));
      }
      if (level.named) {
        var spec = lfsSpecies[level.named];
        var gap = level.namedNeed - (counts[level.named] || 0);
        if (gap > 0) {
          missing.push(t("lfsNeedNamed", { n: gap, g: t(spec.nameKey) }));
        }
      }
      return missing.join(" ");
    }

    function finish() {
      over = true;
      var left = Math.max(0, Math.round(fuel));
      var starsWon = starsFor(left, level.starFuel, "high");
      var outcome = campaign.record(level.id, { stars: starsWon, best: left, better: "high" });
      var message = t("lfsDone", { n: landed, f: left, s: starsWon, k: stolen });
      if (outcome.isBest) {
        message += " " + t("newBest");
      }
      if (outcome.unlockedNext) {
        message += " " + t("lfsNextBed");
      } else if (campaign.clearedCount() === lfsLevels.length) {
        message += " " + t("lfsAllNets");
      }
      result.textContent = message;
      logAction(t("logLanternFishing", { n: landed, f: left }));
      var rect = castBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      refreshPicker();
    }

    function loadBed(def) {
      level = def;
      lure = { x: lfsW / 2, y: lfsTop + 70, vy: 0 };
      pointerTarget = null;
      fish = [];
      fight = null;
      holding = false;
      reeling = false;
      steer = 0;
      fuel = level.fuel;
      landed = 0;
      counts = {};
      stolen = 0;
      snaps = 0;
      over = false;
      bubbles = [];
      spawnAt = 0;
      paused = false;
      rng = lfsRng(Math.floor(Math.random() * 900000) + 11);
      spawnFish();
      spawnFish();
      renderHud();
      refreshPicker();
      var named = level.named ? t(lfsSpecies[level.named].nameKey) : "";
      result.textContent = t("lfsObjective", {
        name: t(level.labelKey),
        n: level.need,
        g: named,
        need: level.namedNeed,
        f: level.fuel,
      });
      call.textContent = t("lfsArmed", { d: lfsDepth(lure.y).toFixed(1) });
      draw();
    }

    /* --- simulation ------------------------------------------------------ */
    function update(dt) {
      if (over) {
        return;
      }
      fuel -= dt;
      if (fuel <= 0) {
        fuel = 0;
        fail(t("lfsBurned", { n: landed, need: level.need }));
        return;
      }
      var band = litBand();
      if (fight) {
        var step = lfsTension(fight, { reel: reeling }, dt);
        fight = step;
        fight.depth = Math.max(0.4, step.depth);
        lure.x = lure.x + Math.sin(step.depth * 2.2) * (step.inRun ? 1.4 : 0.4);
        if (step.snapped) {
          snaps += 1;
          fight = null;
          spawnAt = 1;
          call.textContent = t("lfsSnapped", { k: snaps, p: Math.round((step.tension / step.limit) * 100) });
        } else if (step.escaped) {
          fight = null;
          spawnAt = 1.4;
          call.textContent = t("lfsSlipped", { g: t(lfsSpecies[step.kind].nameKey) });
        } else if (step.landed) {
          landIt(step.kind);
        }
        renderHud();
        return;
      }
      /* Lure: a weighted line with inertia, so depth is a choice you steer. */
      var target = holding ? lfsSink : -lfsRise;
      lure.vy += (target - lure.vy) * Math.min(1, 2.4 * dt);
      lure.y += lure.vy * dt;
      if (lure.y < lfsTop + 10) {
        lure.y = lfsTop + 10;
        lure.vy = Math.max(0, lure.vy);
      }
      if (lure.y > lfsH - 14) {
        lure.y = lfsH - 14;
        lure.vy = Math.min(0, lure.vy);
      }
      if (holding && pointerTarget !== null) {
        steer = pointerTarget < lure.x - 4 ? -1 : pointerTarget > lure.x + 4 ? 1 : 0;
      }
      lure.x += steer * lfsDrift * dt;
      if (lure.x < 16) {
        lure.x = 16;
      }
      if (lure.x > lfsW - 16) {
        lure.x = lfsW - 16;
      }
      var biting = null;
      for (var f = 0; f < fish.length; f += 1) {
        if (fish[f].phase === "bite" && fish[f].kind !== "snatcher") {
          biting = fish[f];
          break;
        }
      }
      for (var i = fish.length - 1; i >= 0; i -= 1) {
        var one = fish[i];
        one.lureX = lure.x;
        one.lureY = lure.y;
        one.band = band;
        one.rival = biting ? { x: biting.x, y: biting.y, phase: biting.phase } : null;
        var moved = lfsApproach(one, dt);
        if (moved.event === "stole") {
          stolen += 1;
          for (var j = 0; j < fish.length; j += 1) {
            if (fish[j].phase === "bite" || fish[j].phase === "close") {
              fish[j].phase = "gone";
              fish[j].timer = 2;
            }
          }
          moved.phase = "gone";
          moved.timer = 2;
          call.textContent = t("lfsStolen", { k: stolen });
        } else if (moved.event === "bite") {
          call.textContent = t("lfsBite", { g: t(lfsSpecies[moved.kind].nameKey), w: moved.timer.toFixed(1) });
        } else if (moved.event === "spat") {
          call.textContent = t("lfsSpatt");
        }
        if (moved.phase === "left") {
          fish.splice(i, 1);
        } else {
          fish[i] = moved;
        }
      }
      spawnAt -= dt;
      if (spawnAt <= 0 && fish.length < 3) {
        spawnFish();
        spawnAt = 2.2;
      }
      if (!App.isMotionOff() && lure.vy > 24 && Math.random() < dt * 9) {
        bubbles.push({ x: lure.x + (Math.random() - 0.5) * 8, y: lure.y, age: 0 });
        if (bubbles.length > 26) {
          bubbles.shift();
        }
      }
      renderHud();
    }

    function fail(message) {
      over = true;
      fight = null;
      result.textContent = message;
    }

    /* --- drawing --------------------------------------------------------- */
    function draw() {
      var band = litBand();
      ctx.clearRect(0, 0, lfsW, lfsH);
      if (App.world) { App.world.backdrop(ctx, lfsW, lfsH, "ocean"); }
      ctx.fillStyle = "#0a1122";
      ctx.fillRect(0, 0, lfsW, lfsTop);
      ctx.fillStyle = "#0b1a2e";
      ctx.fillRect(0, lfsTop, lfsW, lfsH - lfsTop);
      ctx.strokeStyle = "rgba(148, 163, 184, 0.5)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, lfsTop);
      ctx.lineTo(lfsW, lfsTop);
      ctx.stroke();
      /* Depth ticks: the column is numbered, not shaded. */
      ctx.font = "10px 'JetBrains Mono', monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#5d6b81";
      for (var m = 5; m <= Math.floor(lfsDepth(lfsH)); m += 5) {
        var ty = lfsTop + m * lfsMpp;
        ctx.fillText(m + "m", 6, ty);
        ctx.fillRect(24, ty, 10, 1);
      }
      var glow = ctx.createRadialGradient(lure.x, lure.y, 4, lure.x, lure.y, band);
      glow.addColorStop(0, "rgba(255, 209, 102, 0.34)");
      glow.addColorStop(1, "rgba(255, 209, 102, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(lure.x, lure.y, band, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 209, 102, 0.5)";
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.arc(lure.x, lure.y, band, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      for (var b = 0; b < bubbles.length; b += 1) {
        var bub = bubbles[b];
        ctx.fillStyle = "rgba(185, 193, 204, " + (0.4 * (1 - bub.age)).toFixed(3) + ")";
        ctx.beginPath();
        ctx.arc(bub.x, bub.y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      for (var i = 0; i < fish.length; i += 1) {
        drawFish(fish[i], band);
      }
      drawLine();
      if (fight) {
        drawFight();
      }
    }

    function drawFish(one, band) {
      var dist = Math.sqrt((one.x - lure.x) * (one.x - lure.x) + (one.y - lure.y) * (one.y - lure.y));
      if (dist > band) {
        /* Out of the lantern band the fish is a rumour, and the word says so. */
        if (one.phase !== "left") {
          ctx.fillStyle = "#5d6b81";
          ctx.font = "10px 'JetBrains Mono', monospace";
          ctx.textAlign = "center";
          ctx.fillText("\u25cc " + Math.round(dist / lfsMpp) + "m", one.x, one.y);
        }
        return;
      }
      var spec = lfsSpecies[one.kind];
      var facing = one.vx < 0 ? -1 : 1;
      ctx.save();
      ctx.translate(one.x, one.y);
      ctx.scale(facing, 1);
      ctx.fillStyle = one.kind === "snatcher" ? "#8b5cf6" : "#c8d3e5";
      ctx.beginPath();
      ctx.ellipse(0, 0, 13, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-13, 0);
      ctx.lineTo(-21, -6);
      ctx.lineTo(-21, 6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = "#0a1122";
      ctx.font = "bold 10px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText(spec.tag, one.x, one.y + 1);
      if (one.phase === "bite") {
        ctx.fillStyle = "#ffd166";
        ctx.font = "bold 11px 'JetBrains Mono', monospace";
        ctx.fillText("BITE " + one.timer.toFixed(1), one.x, one.y - 16);
      }
    }

    function drawLine() {
      ctx.strokeStyle = "rgba(226, 232, 240, 0.75)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(lure.x, 12);
      ctx.lineTo(lure.x, lure.y - 8);
      ctx.stroke();
      ctx.fillStyle = "#ff6b35";
      ctx.fillRect(lure.x - 4, 6, 8, 8);
      ctx.fillStyle = "#e2e8f0";
      ctx.beginPath();
      ctx.arc(lure.x, lure.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawFight() {
      var pct = Math.round((fight.tension / fight.limit) * 100);
      ctx.fillStyle = "#ffd166";
      ctx.font = "bold 12px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText(pct + "%", lure.x, lure.y - 18);
      ctx.textAlign = "left";
      ctx.fillText(
        (fight.inRun ? "PULL " : "EASE ") + fight.runs + " | " + fight.depth.toFixed(1) + "m",
        10,
        lure.y + 16,
      );
      ctx.fillStyle = "#c8d3e5";
      ctx.beginPath();
      ctx.ellipse(lure.x, lure.y + 12, 14, 7, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    function frame(now) {
      if (rafId === null) {
        return;
      }
      var dt = Math.min(0.032, (now - lastFrame) / 1000 || 0.016);
      lastFrame = now;
      if (!panelEl || panelEl.hidden || document.hidden) {
        rafId = window.requestAnimationFrame(frame);
        return;
      }
      update(dt);
      for (var b = bubbles.length - 1; b >= 0; b -= 1) {
        bubbles[b].y -= 26 * dt;
        bubbles[b].age += dt * 0.6;
        if (bubbles[b].age >= 1) {
          bubbles.splice(b, 1);
        }
      }
      draw();
      rafId = window.requestAnimationFrame(frame);
    }

    function startLoop() {
      if (rafId !== null) {
        return;
      }
      lastFrame = performance.now();
      rafId = window.requestAnimationFrame(frame);
    }

    function stopLoop() {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
    }

    function wake() {
      if (paused) {
        paused = false;
        startLoop();
      }
    }

    /* --- input ----------------------------------------------------------- */
    canvas.addEventListener("keydown", function (event) {
      wake();
      var key = event.key;
      if (key === " " || key === "ArrowDown" || key === "s" || key === "S") {
        event.preventDefault();
        holding = true;
      }
      if (key === "Enter" || key === "ArrowUp" || key === "w" || key === "W") {
        event.preventDefault();
        if (key === "Enter") {
          setHook();
          reeling = true;
        } else {
          holding = false;
        }
      }
      if (key === "ArrowLeft" || key === "a" || key === "A") {
        event.preventDefault();
        steer = -1;
      } else if (key === "ArrowRight" || key === "d" || key === "D") {
        event.preventDefault();
        steer = 1;
      }
    });

    canvas.addEventListener("keyup", function (event) {
      var key = event.key;
      if (key === " " || key === "ArrowDown" || key === "s" || key === "S") {
        holding = false;
      } else if (key === "Enter") {
        reeling = false;
      } else if (key === "ArrowLeft" || key === "a" || key === "A") {
        if (steer < 0) {
          steer = 0;
        }
      } else if (key === "ArrowRight" || key === "d" || key === "D") {
        if (steer > 0) {
          steer = 0;
        }
      }
    });

    function pointerTo(event) {
      var rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        return;
      }
      var px = (event.clientX - rect.left) * (canvas.width / rect.width);
      /* Holding the water sinks the lure; where you hold picks the column. */
      pointerTarget = Math.max(16, Math.min(lfsW - 16, px));
    }

    canvas.addEventListener("pointerdown", function (event) {
      event.preventDefault();
      wake();
      holding = true;
      pointerTo(event);
    });

    canvas.addEventListener("pointermove", function (event) {
      if (holding) {
        pointerTo(event);
      }
    });

    function releaseHold() {
      holding = false;
      steer = 0;
      pointerTarget = null;
    }

    canvas.addEventListener("pointerup", releaseHold);
    canvas.addEventListener("pointercancel", releaseHold);

    bedSel.addEventListener("change", function () {
      var index = campaign.indexOf(bedSel.value);
      if (index >= 0 && campaign.isUnlocked(bedSel.value)) {
        wake();
        loadBed(lfsLevels[index]);
      }
    });

    castBtn.addEventListener("click", function () {
      wake();
      loadBed(level);
    });

    /* Reeling is a hold, so a tab switch must drop it or the line keeps loading
     * against a key the player already let go of. The catch log survives. */
    App.quietResetLanternFishing = function () {
      stopLoop();
      holding = false;
      reeling = false;
      steer = 0;
      bubbles = [];
      paused = true;
      if (fight) {
        fight = null;
        spawnAt = 1;
        lure.vy = 0;
      }
      if (!over) {
        result.textContent = t("lfsPaused");
        renderHud();
        draw();
      }
    };

    loadBed(level);
    startLoop();
  }

  App.addStrings({
    en: {
      "tabLanternFishing": "Lantern Fishing",
      "lfsZ1": "Shallow Pond",
      "lfsZ2": "Reef Drop-off",
      "lfsZ3": "Black Trench",
      "lfsZ4": "Kelp Bed",
      "lfsZ5": "The Deep Lake",
      "lfsSpGlintfin": "Glintfin",
      "lfsSpRazor": "Razor",
      "lfsSpLurker": "Pale lurker",
      "lfsSpSnatcher": "Snatcher",
      "lfsFuelLabel": "Fuel",
      "lfsHaulLabel": "Haul",
      "lfsDepthLabel": "Depth",
      "lfsLineLabel": "Line",
      "lfsBedSelectLabel": "Choose a bed",
      "lfsBtnCast": "New Night",
      "lfsFieldLabel": "Water column: hold space or pointer to sink, release to rise, Enter reels and sets the hook, arrows drift",
      "lfsTally": "{g} {n}",
      "lfsObjective": "{name}: land {n} fish, {need} of them {g}. The lantern holds {f}s.",
      "lfsArmed": "Lure hanging at {d}m. Hold to sink, let go to rise.",
      "lfsBite": "A {g} has it! Enter within {w}s to set the hook.",
      "lfsHooked": "{g} hooked - {r} runs in it. Wind through the pauses, ease through the pulls.",
      "lfsLanded": "{g} in the net. {n}/{need} for the haul.",
      "lfsSnapped": "Line parted at {p}% - {k} times tonight.",
      "lfsSlipped": "Too slack: the {g} shook the hook out.",
      "lfsStolen": "A snatcher cut in and took the bite. {k} stolen.",
      "lfsSpatt": "It spat the hook before you struck.",
      "lfsEmptyStrike": "Nothing on the end - the hook came up wet.",
      "lfsNeedMore": "{n} more fish",
      "lfsNeedNamed": "{n} more {g}",
      "lfsBurned": "The lantern gutters out with {n}/{need} landed.",
      "lfsDone": "Nets full with {f}s of fuel left - {s} stars, {k} bites stolen.",
      "lfsNextBed": "Next bed unlocked.",
      "lfsAllNets": "Every bed on the lake is fished.",
      "lfsPaused": "Line eased - the night waits for you, the catch log is intact.",
      "lfsHint": "Tension is a percentage, not a colour: stay under 100 while it pulls, wind hard while it rests.",
      "logLanternFishing": "Landed {n} fish with {f}s of fuel left",
    },
    zh: {
      "tabLanternFishing": "提灯钓",
      "lfsZ1": "浅塘",
      "lfsZ2": "礁壁陡坡",
      "lfsZ3": "黑海沟",
      "lfsZ4": "海藻床",
      "lfsZ5": "深湖",
      "lfsSpGlintfin": "闪光鱼",
      "lfsSpRazor": "刀鱼",
      "lfsSpLurker": "白潜鱼",
      "lfsSpSnatcher": "抢食者",
      "lfsFuelLabel": "灯油",
      "lfsHaulLabel": "渔获",
      "lfsDepthLabel": "深度",
      "lfsLineLabel": "线张力",
      "lfsBedSelectLabel": "选择钓点",
      "lfsBtnCast": "重新开始一夜",
      "lfsFieldLabel": "水体剖面：按住空格或按住画面下沉，松开上浮，回车刺鱼并收线，左右键平移饵",
      "lfsTally": "{g} {n} 条",
      "lfsObjective": "{name}：钓满 {n} 条，其中 {g} 要 {need} 条。灯油还能烧 {f} 秒。",
      "lfsArmed": "饵悬在 {d} 米。按住下沉，松开上浮。",
      "lfsBite": "{g} 咬住了！{w} 秒内按回车刺鱼。",
      "lfsHooked": "{g} 上钩——它还有 {r} 次冲刺。它停你收，它冲你松。",
      "lfsLanded": "{g} 入网。渔获 {n}/{need}。",
      "lfsSnapped": "张力到 {p}%，线断了——今晚第 {k} 次。",
      "lfsSlipped": "松过头：{g} 甩掉了钩子。",
      "lfsStolen": "抢食者窜进来把口抢走了。已抢 {k} 次。",
      "lfsSpatt": "它在你刺鱼之前吐了钩。",
      "lfsEmptyStrike": "钩上空无一物，只带上来一身水。",
      "lfsNeedMore": "还差 {n} 条",
      "lfsNeedNamed": "还差 {n} 条{g}",
      "lfsBurned": "灯油耗尽，只钓到 {n}/{need} 条。",
      "lfsDone": "渔篓满了，灯油还剩 {f} 秒 - 获得 {s} 星，被抢口 {k} 次。",
      "lfsNextBed": "解锁下一个钓点。",
      "lfsAllNets": "湖上每个钓点都钓遍了。",
      "lfsPaused": "线已放松——这一夜等着你，渔获记录一条没丢。",
      "lfsHint": "张力看百分比而不是颜色：它冲刺时压在 100% 以下，它歇下来才使劲收。",
      "logLanternFishing": "钓满 {n} 条，灯油还剩 {f} 秒",
    },
  });

  App.registerGame({
    name: "lanternFishing",
    tabKey: "tabLanternFishing",
    init: initLanternFishingGame,
    guide: {
      svg:
        '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="4" y="4" width="112" height="68" rx="5" fill="rgba(10,17,34,.92)" stroke="rgba(148,163,184,.45)"/>' +
        '<path d="M4 18h112" stroke="rgba(148,163,184,.5)"/>' +
        '<path d="M60 18v22" stroke="rgba(226,232,240,.7)"/>' +
        '<circle cx="60" cy="46" r="20" fill="none" stroke="rgba(255,209,102,.6)" stroke-dasharray="3 4"/>' +
        '<circle cx="60" cy="46" r="3" fill="#ffd166"/>' +
        '<ellipse cx="34" cy="34" rx="9" ry="4" fill="#c8d3e5"/><path d="M25 34l-6-4v8z" fill="#c8d3e5"/>' +
        '<ellipse cx="88" cy="60" rx="9" ry="4" fill="#8b5cf6"/><path d="M97 60l6-4v8z" fill="#8b5cf6"/>' +
        '<text x="14" y="30" font-size="8" fill="#5d6b81">5m</text>' +
        '<text x="14" y="64" font-size="8" fill="#5d6b81">20m</text>' +
        '<text x="60" y="70" font-size="9" fill="#ffd166" text-anchor="middle">62%</text></svg>',
      en: [
        "Goal: land the night's haul before the lantern burns out; some beds also name a species you must keep.",
        "Action: hold Space or press the water to sink the lure, release to let it rise, arrows drift it sideways.",
        "Bites: each species arrives differently - the glintfin circles in, the razor charges, and the pale lurker waits until the lantern has dimmed before it commits.",
        "Strike: when the timer shows BITE, Enter sets the hook; miss the window and it spits.",
        "Fight: holding Enter loads the line. Above 100% for more than 0.4s it snaps, near 0% the hook shakes out, so wind during the pause and ease during the pull.",
        "Scoring: stars come from the fuel left when your nets are full, and a snatcher stealing bites costs you that time.",
      ],
      zh: [
        "目标：在灯油耗尽前钓满这一夜的渔获，有些钓点还指定必须留下的鱼。",
        "操作：按住空格或按住水面让饵下沉，松开上浮，左右键把饵平移。",
        "咬口：每种鱼的来法不同——闪光鱼绕圈靠近，刀鱼直接冲，白潜鱼要等灯火暗下来才肯开口。",
        "刺鱼：屏上报出 BITE 计时时按回车刺鱼，错过窗口它就吐钩。",
        "搏鱼：按住回车会给线加载。张力超 100% 撑过 0.4 秒就断线，接近 0% 钩子会被甩掉，所以它停你收、它冲你松。",
        "计分：星级看封网时剩下的灯油秒数，抢食者抢走的每一口都在偷你的时间。",
      ],
    },
  });

  /* Exported for the other modules. */
  App.initLanternFishingGame = initLanternFishingGame;
})(window.CapitalConvert = window.CapitalConvert || {});
