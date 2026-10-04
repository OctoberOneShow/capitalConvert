/* Paper Bridge - the construct-and-test game in the shared game drawer.
 * The cart only cares about three things: can it roll across, is every beam
 * short enough to carry itself, and is every deck node tied into two supports
 * that do not line up with it. All three are a graph walk, so a bridge either
 * stands on paper or it does not - and every authored span ships the beam set
 * that proves it stands. Registered through the game registry, so it needs no
 * markup in the four HTML pages. */
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

  var pbrCols = 12;
  var pbrRows = 6;
  var pbrStep = 30;
  var pbrPad = 13;
  var pbrWide = pbrPad * 2 + (pbrCols - 1) * pbrStep;
  var pbrTall = pbrPad * 2 + (pbrRows - 1) * pbrStep;
  var pbrMaxBeam = 4;
  /* A beam longer than this needs a node carrying its middle. */
  var pbrSlender = 3;
  var pbrRollMs = 90;
  var pbrRollSlice = 5;

  /* A span is authored as rock ledges [x0, x1, row] plus the beam set that proves it
   * stands, written as [x1, y1, x2, y2] so the schedule stays readable. */
  var pbrLevels = [
    {
      id: "b1", labelKey: "pbrZ1", grip: 1, limit: 4,
      startAt: [4, 3], targetAt: [6, 3],
      ground: [[0, 4, 3], [6, 11, 3]],
      solution: [[4, 3, 6, 3]],
    },
    {
      id: "b2", labelKey: "pbrZ2", grip: 1, limit: 6,
      startAt: [3, 3], targetAt: [7, 3],
      ground: [[0, 3, 3], [7, 11, 3], [5, 6, 5]],
      solution: [[3, 3, 5, 3], [5, 3, 7, 3], [5, 3, 5, 5]],
    },
    {
      id: "b3", labelKey: "pbrZ3", grip: 0, limit: 7,
      startAt: [2, 3], targetAt: [8, 3],
      ground: [[0, 2, 3], [8, 11, 3]],
      solution: [[2, 3, 5, 0], [8, 3, 5, 0], [2, 3, 5, 3], [5, 3, 8, 3], [5, 0, 5, 3]],
    },
    {
      id: "b4", labelKey: "pbrZ4", grip: 1, limit: 5,
      startAt: [2, 3], targetAt: [9, 3],
      ground: [[0, 2, 3], [5, 6, 4], [9, 11, 3]],
      solution: [[2, 3, 3, 4], [3, 4, 5, 4], [6, 4, 7, 3], [7, 3, 9, 3]],
    },
    {
      id: "b5", labelKey: "pbrZ5", grip: 1, limit: 7,
      startAt: [2, 2], targetAt: [8, 4],
      ground: [[0, 2, 2], [8, 11, 4], [4, 6, 5]],
      solution: [[2, 2, 4, 4], [4, 4, 4, 5], [4, 4, 5, 5], [6, 5, 7, 4], [7, 4, 8, 4]],
    },
  ];

  function pbrAt(x, y) {
    return y * pbrCols + x;
  }

  /* One build per level: every lattice point is a node and the ledge spans say
   * which of them stand on rock. */
  function pbrNodes(level) {
    if (level.nodes) {
      return level.nodes;
    }
    var nodes = [];
    var y;
    var x;
    for (y = 0; y < pbrRows; y += 1) {
      for (x = 0; x < pbrCols; x += 1) {
        nodes.push({ x: x, y: y, ground: false, id: nodes.length });
      }
    }
    (level.ground || []).forEach(function (span) {
      for (var sx = span[0]; sx <= span[1]; sx += 1) {
        if (sx >= 0 && sx < pbrCols && span[2] >= 0 && span[2] < pbrRows) {
          nodes[pbrAt(sx, span[2])].ground = true;
        }
      }
    });
    level.nodes = nodes;
    level.startIndex = pbrAt(level.startAt[0], level.startAt[1]);
    level.targetIndex = pbrAt(level.targetAt[0], level.targetAt[1]);
    level.par = level.solution.length;
    return nodes;
  }

  function pbrBeamIndex(pair) {
    return [pbrAt(pair[0], pair[1]), pbrAt(pair[2], pair[3])];
  }

  function pbrLen(a, b) {
    return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
  }

  function pbrAligned(a, b) {
    var dx = b.x - a.x;
    var dy = b.y - a.y;
    if (dx === 0 && dy === 0) {
      return false;
    }
    return dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy);
  }

  function pbrBeamOk(nodes, beams, a, b) {
    if (a === b || a < 0 || b < 0 || a >= nodes.length || b >= nodes.length) {
      return "off";
    }
    if (!pbrAligned(nodes[a], nodes[b])) {
      return "angle";
    }
    if (pbrLen(nodes[a], nodes[b]) > pbrMaxBeam) {
      return "long";
    }
    var dup = (beams || []).some(function (other) {
      return (other[0] === a && other[1] === b) || (other[0] === b && other[1] === a);
    });
    return dup ? "same" : "ok";
  }

  function pbrAdjacency(nodes, beams) {
    var adj = [];
    var i;
    for (i = 0; i < nodes.length; i += 1) {
      adj.push([]);
    }
    (beams || []).forEach(function (beam, index) {
      if (beam[0] >= 0 && beam[1] >= 0 && beam[0] < nodes.length && beam[1] < nodes.length) {
        adj[beam[0]].push({ at: beam[1], beam: index });
        adj[beam[1]].push({ at: beam[0], beam: index });
      }
    });
    /* The cart rolls across bare rock as well, so neighbouring ledge nodes on
     * one shelf act as deck without spending a beam. */
    for (i = 0; i < nodes.length; i += 1) {
      var node = nodes[i];
      if (!node.ground || node.x + 1 >= pbrCols) {
        continue;
      }
      var east = nodes[i + 1];
      if (east.ground) {
        adj[i].push({ at: east.id, beam: -1 });
        adj[east.id].push({ at: i, beam: -1 });
      }
    }
    return adj;
  }

  /* A node stands when two supported places hold it and those two are not in
   * one straight line through it - which is why a flat span needs a brace. */
  function pbrSupport(nodes, adj) {
    var supported = {};
    nodes.forEach(function (node) {
      if (node.ground) {
        supported[node.id] = true;
      }
    });
    var grew = true;
    var round = 0;
    while (grew && round <= nodes.length) {
      grew = false;
      round += 1;
      nodes.forEach(function (node) {
        if (supported[node.id]) {
          return;
        }
        var vectors = [];
        var hit = false;
        adj[node.id].forEach(function (link) {
          if (!supported[link.at]) {
            return;
          }
          var other = nodes[link.at];
          var vx = other.x - node.x;
          var vy = other.y - node.y;
          vectors.forEach(function (prev) {
            if (vx * prev.y - vy * prev.x !== 0) {
              hit = true;
            }
          });
          vectors.push({ x: vx, y: vy });
        });
        if (hit) {
          supported[node.id] = true;
          grew = true;
        }
      });
    }
    return supported;
  }

  /* Breadth-first along beams. `forward` keeps the cart driving toward the far
   * bank and `grip` refuses steps steeper than the wheels can hold. */
  function pbrWalk(nodes, adj, start, target, forward, grip) {
    var seen = {};
    var queue = [[start]];
    seen[start] = true;
    while (queue.length) {
      var walk = queue.shift();
      var head = walk[walk.length - 1];
      if (head === target) {
        return walk;
      }
      adj[head].forEach(function (link) {
        if (seen[link.at]) {
          return;
        }
        var from = nodes[head];
        var to = nodes[link.at];
        var dx = to.x - from.x;
        if (forward && dx <= 0) {
          return;
        }
        if (grip !== null && Math.abs(to.y - from.y) > grip * Math.abs(dx)) {
          return;
        }
        seen[link.at] = true;
        queue.push(walk.concat([link.at]));
      });
    }
    return null;
  }

  function pbrMidSupport(nodes, beams, beam, a, b) {
    var vx = b.x - a.x;
    var vy = b.y - a.y;
    var steps = pbrLen(a, b);
    for (var s = 1; s < steps; s += 1) {
      var mx = a.x + (vx * s) / steps;
      var my = a.y + (vy * s) / steps;
      if (mx % 1 || my % 1) {
        continue;
      }
      var at = pbrAt(mx, my);
      var tied = beams.some(function (other) {
        return other !== beam && (other[0] === at || other[1] === at);
      });
      if (tied) {
        return at;
      }
    }
    return -1;
  }

  function pbrName(nodes, at) {
    return t("pbrNodeLabel", { x: nodes[at].x + 1, y: nodes[at].y + 1 });
  }

  function pbrCap(word) {
    return word.charAt(0).toUpperCase() + word.slice(1);
  }

  /* The whole test with no DOM at all: deck, then slope, then slenderness,
   * then support. The first failure names its segment. */
  function bridgeCheck(nodes, beams, span) {
    var list = beams || [];
    var start = span.start;
    var target = span.target;
    var grip = span.grip === undefined ? 1 : span.grip;
    var adj = pbrAdjacency(nodes, list);
    var path = pbrWalk(nodes, adj, start, target, true, grip);
    var count = list.length;
    if (!path) {
      var loose = pbrWalk(nodes, adj, start, target, true, null);
      if (loose) {
        var steep = { a: start, b: target };
        for (var s = 0; s + 1 < loose.length; s += 1) {
          var from = nodes[loose[s]];
          var to = nodes[loose[s + 1]];
          if (Math.abs(to.y - from.y) > grip * Math.abs(to.x - from.x)) {
            steep = { a: loose[s], b: loose[s + 1] };
            break;
          }
        }
        return { ok: false, fail: "slope", segment: steep, path: [], beams: count };
      }
      var reached = pbrWalk(nodes, adj, start, start === target ? target : start, false, null) || [start];
      var last = reached[0];
      reached.forEach(function (at) {
        if (nodes[at].x >= nodes[last].x) {
          last = at;
        }
      });
      return { ok: false, fail: "gap", segment: { a: last, b: target }, path: [], beams: count };
    }
    for (var i = 0; i + 1 < path.length; i += 1) {
      var link = adj[path[i]].filter(function (other) {
        return other.at === path[i + 1] && other.beam >= 0;
      })[0];
      if (!link) {
        continue;
      }
      var beam = list[link.beam];
      var a = nodes[beam[0]];
      var b = nodes[beam[1]];
      if (pbrLen(a, b) > pbrSlender && pbrMidSupport(nodes, list, beam, a, b) < 0) {
        return { ok: false, fail: "buckle", segment: { a: beam[0], b: beam[1] }, path: path, beams: count };
      }
    }
    var supported = pbrSupport(nodes, adj);
    for (i = 0; i < path.length; i += 1) {
      if (!supported[path[i]]) {
        return {
          ok: false,
          fail: "collapse",
          segment: { a: path[i], b: path[Math.min(path.length - 1, i + 1)] },
          path: path,
          beams: count,
        };
      }
    }
    if (span.limit !== undefined && count > span.limit) {
      return { ok: false, fail: "weight", segment: { a: start, b: target }, path: path, beams: count };
    }
    return { ok: true, fail: "none", segment: null, path: path, beams: count };
  }

  /* Snap the aimed node onto the nearest lattice line through the start node,
   * so a slightly off click still lays a straight beam. */
  function bridgeSnap(nodes, a, x, y) {
    var best = -1;
    var bestScore = Infinity;
    for (var i = 0; i < nodes.length; i += 1) {
      if (i === a || !pbrAligned(nodes[a], nodes[i]) || pbrLen(nodes[a], nodes[i]) > pbrMaxBeam) {
        continue;
      }
      var dx = nodes[i].x - x;
      var dy = nodes[i].y - y;
      var score = dx * dx + dy * dy;
      if (score < bestScore) {
        bestScore = score;
        best = i;
      }
    }
    return best;
  }

  function pbrSpan(level) {
    return {
      start: level.startIndex,
      target: level.targetIndex,
      grip: level.grip === undefined ? 1 : level.grip,
      limit: level.limit,
    };
  }

  function initPaperBridgeGame(panelEl) {
    if (!panelEl) {
      return;
    }

    var campaign = createCampaign({ key: "paper-bridge-campaign", levels: pbrLevels });
    var level = pbrLevels[campaign.indexOf(campaign.nextLevelId())] || pbrLevels[0];
    var nodes = pbrNodes(level);
    var beams = [];
    var cursor = { x: 3, y: 3 };
    var pick = -1;
    var roll = 0;
    var rollPath = null;
    var running = false;
    var done = false;
    var timerId = null;
    var rafId = null;
    var par = level.par;

    function el(tag, className, key) {
      var node = document.createElement(tag);
      if (className) {
        node.className = className;
      }
      if (key) {
        node.setAttribute("data-i18n", key);
        node.textContent = t(key);
      }
      return node;
    }

    function makeStat(key, valueEl) {
      var stat = el("div", "game-stat");
      stat.appendChild(el("span", "", key));
      stat.appendChild(valueEl);
      return stat;
    }

    /* --- markup: built with createElement so the headless harness sees it --- */
    var hud = el("div", "game-hud");
    var beamEl = el("strong");
    var parEl = el("strong");
    var gapEl = el("strong");
    var draftEl = el("strong");
    hud.appendChild(makeStat("pbrBeamLabel", beamEl));
    hud.appendChild(makeStat("pbrParLabel", parEl));
    hud.appendChild(makeStat("pbrGapLabel", gapEl));
    hud.appendChild(makeStat("pbrDraftLabel", draftEl));

    var canvas = el("canvas", "pbr-canvas");
    canvas.width = pbrWide;
    canvas.height = pbrTall;
    canvas.setAttribute("tabindex", "0");
    canvas.setAttribute("role", "application");
    canvas.setAttribute("aria-label", t("pbrFieldLabel"));
    var ctx = canvas.getContext("2d");

    var legend = el("p", "pbr-legend");

    var result = el("p", "game-result");
    result.setAttribute("role", "status");

    var spanRow = el("div", "elements-row");
    var spanLabel = el("label", "elements-label", "pbrSpanSelectLabel");
    spanLabel.setAttribute("for", "pbrSpanSel");
    var spanSel = el("select", "elements-select");
    spanSel.id = "pbrSpanSel";
    spanRow.appendChild(spanLabel);
    spanRow.appendChild(spanSel);

    var actions = el("div", "game-actions");
    var rollBtn = el("button", "primary");
    rollBtn.type = "button";
    var rollLabel = el("span", "", "pbrBtnRoll");
    var rollContent = el("span", "button-content");
    rollContent.appendChild(rollLabel);
    rollBtn.appendChild(rollContent);
    var bestEl = el("p", "game-best");
    actions.appendChild(rollBtn);
    actions.appendChild(bestEl);

    var hint = el("p", "game-hint", "pbrHint");

    [hud, canvas, legend, result, spanRow, actions, hint].forEach(function (node) {
      panelEl.appendChild(node);
    });

    function point(node) {
      return { x: pbrPad + node.x * pbrStep, y: pbrPad + node.y * pbrStep };
    }

    function renderHud() {
      beamEl.textContent = t("pbrBeamValue", { n: beams.length, max: level.limit });
      parEl.textContent = t("pbrParValue", { n: par });
      gapEl.textContent = t("pbrGapValue", {
        a: nodes[level.startIndex].x + 1,
        b: nodes[level.targetIndex].x + 1,
      });
      draftEl.textContent = pick < 0 ? t("pbrStateIdle") : t("pbrStatePick");
    }

    function refreshPicker() {
      fillCampaignPicker(
        spanSel,
        campaign,
        function (def) {
          return t(def.labelKey);
        },
        t("elementsLocked"),
      );
      spanSel.value = level.id;
      bestEl.textContent = t("campaignStars", { n: campaign.totalStars(), max: campaign.maxStars() });
    }

    function testBridge() {
      return bridgeCheck(nodes, beams, pbrSpan(level));
    }

    function failText(check) {
      return t("pbrFail" + pbrCap(check.fail), {
        a: pbrName(nodes, check.segment.a),
        b: pbrName(nodes, check.segment.b),
      });
    }

    function placeBeam(a, b) {
      if (running || done) {
        result.textContent = t("pbrLocked");
        return;
      }
      if (beams.length >= level.limit) {
        result.textContent = t("pbrTooMany", { n: level.limit });
        pick = -1;
        renderHud();
        return;
      }
      var why = pbrBeamOk(nodes, beams, a, b);
      if (why !== "ok") {
        result.textContent = t("pbrNo" + pbrCap(why));
        return;
      }
      beams.push([a, b]);
      pick = -1;
      renderHud();
      render();
      result.textContent = t("pbrBeamPlaced", { n: pbrLen(nodes[a], nodes[b]), left: level.limit - beams.length });
    }

    function chooseNode(at) {
      if (running || done) {
        result.textContent = t("pbrLocked");
        return;
      }
      if (at < 0 || at >= nodes.length) {
        return;
      }
      cursor = { x: nodes[at].x, y: nodes[at].y };
      if (pick < 0) {
        pick = at;
        result.textContent = t("pbrPickEnd", { x: nodes[at].x + 1, y: nodes[at].y + 1 });
        renderHud();
        render();
        return;
      }
      if (at === pick) {
        pick = -1;
        result.textContent = t("pbrPickCancelled");
        renderHud();
        render();
        return;
      }
      var snapped = bridgeSnap(nodes, pick, nodes[at].x, nodes[at].y);
      if (snapped < 0) {
        pick = -1;
        result.textContent = t("pbrNoAngle");
        renderHud();
        render();
        return;
      }
      placeBeam(pick, snapped);
    }

    function removeLast() {
      if (running || done) {
        return;
      }
      if (pick >= 0) {
        pick = -1;
        result.textContent = t("pbrPickCancelled");
        renderHud();
        render();
        return;
      }
      if (!beams.length) {
        result.textContent = t("pbrNothingToUndo");
        return;
      }
      beams.pop();
      renderHud();
      render();
    }

    function rollCart() {
      if (running || done || timerId !== null) {
        return;
      }
      var check = testBridge();
      if (!check.ok) {
        rollPath = null;
        result.textContent = failText(check);
        render();
        return;
      }
      running = true;
      roll = 0;
      rollPath = check.path;
      setRollLabel("pbrBtnRolling");
      timerId = window.setInterval(stepRoll, pbrRollMs);
      startLoop();
    }

    /* The cart advances a fixed slice per beat, so the crossing reads the same
     * every time and never rides on frame luck. */
    function stepRoll() {
      if (panelEl.hidden || document.hidden || !running) {
        return;
      }
      roll += 1;
      render();
      if (rollPath && roll >= (rollPath.length - 1) * pbrRollSlice) {
        finish();
      }
    }

    function finish() {
      running = false;
      if (timerId !== null) {
        window.clearInterval(timerId);
        timerId = null;
      }
      done = true;
      stopLoop();
      var starsWon = starsFor(beams.length, [par, par + 1, par + 3], "low");
      var outcome = campaign.record(level.id, { stars: starsWon, best: beams.length, better: "low" });
      var message = t("pbrCrossed", { n: beams.length, par: par, s: starsWon });
      if (outcome.isBest) {
        message += " " + t("newBest");
      }
      if (outcome.unlockedNext) {
        message += " " + t("pbrNextSpan");
      } else if (campaign.clearedCount() === pbrLevels.length) {
        message += " " + t("pbrLineDone");
      }
      result.textContent = message;
      logAction(t("logPaperBridge", { n: beams.length }));
      var rect = rollBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      setRollLabel("pbrBtnAgain");
      refreshPicker();
      renderHud();
      render();
    }

    function setRollLabel(key) {
      rollLabel.setAttribute("data-i18n", key);
      rollLabel.textContent = t(key);
    }

    function loadSpan(def) {
      if (timerId !== null) {
        window.clearInterval(timerId);
        timerId = null;
      }
      stopLoop();
      level = def;
      nodes = pbrNodes(def);
      beams = [];
      pick = -1;
      roll = 0;
      rollPath = null;
      running = false;
      done = false;
      par = def.par;
      cursor = { x: nodes[def.startIndex].x, y: nodes[def.startIndex].y };
      renderHud();
      refreshPicker();
      var plan = def.solution.map(function (pair) {
        return pbrBeamIndex(pair);
      });
      var proof = bridgeCheck(nodes, plan, pbrSpan(def));
      result.textContent = proof.ok
        ? t("pbrPrompt", { name: t(def.labelKey), p: def.par, n: def.limit })
        : t("pbrUnproven", { name: t(def.labelKey), why: proof.fail });
      setRollLabel("pbrBtnRoll");
      startLoop();
      render();
    }

    function dashFor(len) {
      return [[4, 0], [6, 3], [3, 3], [2, 3], [1, 4]][Math.max(1, Math.min(5, len)) - 1];
    }

    function render() {
      var check = running || done ? null : testBridge();
      var bad = check && !check.ok && check.segment ? check.segment : null;
      ctx.clearRect(0, 0, pbrWide, pbrTall);
      ctx.fillStyle = "rgba(8, 12, 20, 0.92)";
      ctx.fillRect(0, 0, pbrWide, pbrTall);

      /* Rock first, so the chasm reads as a hole rather than empty space. */
      (level.ground || []).forEach(function (span) {
        var left = point({ x: span[0], y: span[2] });
        var right = point({ x: span[1], y: span[2] });
        ctx.fillStyle = "rgba(51, 65, 85, 0.92)";
        ctx.fillRect(left.x - 12, left.y, right.x - left.x + 24, pbrTall - left.y);
        ctx.strokeStyle = "rgba(148, 163, 184, 0.75)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(left.x - 12, left.y);
        ctx.lineTo(right.x + 12, left.y);
        ctx.stroke();
      });

      nodes.forEach(function (node) {
        var pt = point(node);
        ctx.fillStyle = node.ground ? "rgba(226, 232, 240, 0.9)" : "rgba(148, 163, 184, 0.45)";
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, node.ground ? 3 : 2, 0, Math.PI * 2);
        ctx.fill();
      });

      beams.forEach(function (beam) {
        var a = point(nodes[beam[0]]);
        var b = point(nodes[beam[1]]);
        var len = pbrLen(nodes[beam[0]], nodes[beam[1]]);
        var isBad = !!bad && ((bad.a === beam[0] && bad.b === beam[1]) || (bad.a === beam[1] && bad.b === beam[0]));
        ctx.strokeStyle = isBad ? "#fb7185" : len > pbrSlender ? "#fbbf24" : "#e2e8f0";
        ctx.lineWidth = isBad ? 4 : 3;
        ctx.setLineDash(dashFor(len));
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.setLineDash([]);
        /* The length is printed on the beam, so dashes are never the only cue. */
        ctx.fillStyle = isBad ? "#fb7185" : "#94a3b8";
        ctx.font = "bold 9px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(len), (a.x + b.x) / 2 + 9, (a.y + b.y) / 2 - 9);
      });

      /* S and F mark where the cart starts and where it has to land. */
      [level.startIndex, level.targetIndex].forEach(function (at, index) {
        var pt = point(nodes[at]);
        ctx.strokeStyle = "rgba(0, 242, 255, 0.9)";
        ctx.lineWidth = 2;
        ctx.strokeRect(pt.x - 7, pt.y - 15, 14, 14);
        ctx.fillStyle = "#22d3ee";
        ctx.font = "bold 9px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(index === 0 ? "S" : "F", pt.x, pt.y - 17);
      });

      if (pick >= 0) {
        var chosen = point(nodes[pick]);
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = "rgba(255, 107, 53, 0.95)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(chosen.x, chosen.y, 9, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      var cross = point(cursor);
      ctx.setLineDash([2, 3]);
      ctx.strokeStyle = "rgba(0, 242, 255, 0.8)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(cross.x - 7, cross.y - 7, 14, 14);
      ctx.setLineDash([]);

      if ((running || done) && rollPath && rollPath.length > 1) {
        var step = Math.min(rollPath.length - 1, Math.floor(roll / pbrRollSlice));
        var frac = (roll % pbrRollSlice) / pbrRollSlice;
        var stop = Math.min(rollPath.length - 1, step);
        var next = Math.min(rollPath.length - 1, stop + 1);
        var a2 = point(nodes[rollPath[stop]]);
        var b2 = point(nodes[rollPath[next]]);
        var cartX = a2.x + (b2.x - a2.x) * frac;
        var cartY = a2.y + (b2.y - a2.y) * frac;
        ctx.fillStyle = "#a3e635";
        ctx.fillRect(cartX - 6, cartY - 15, 12, 10);
        ctx.fillStyle = "#0f172a";
        ctx.font = "bold 8px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("C", cartX, cartY - 10);
      }

      legend.textContent =
        t("pbrLegendBeams", { n: beams.length, max: level.limit, par: par }) +
        " \u00b7 " +
        t(level.grip === 0 ? "pbrGripLevel" : "pbrGripRamp");
    }

    function frame() {
      if (rafId === null) {
        return;
      }
      /* A hidden span skips the frame but keeps its slot in the loop. */
      if (panelEl.hidden || document.hidden) {
        rafId = window.requestAnimationFrame(frame);
        return;
      }
      if (!isMotionOff() && !running && !done) {
        render();
      }
      rafId = window.requestAnimationFrame(frame);
    }

    function startLoop() {
      if (rafId !== null) {
        return;
      }
      rafId = window.requestAnimationFrame(frame);
    }

    function stopLoop() {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
    }

    function nodeFromEvent(event) {
      var rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        return -1;
      }
      var px = (event.clientX - rect.left) * (canvas.width / rect.width);
      var py = (event.clientY - rect.top) * (canvas.height / rect.height);
      var gx = Math.round((px - pbrPad) / pbrStep);
      var gy = Math.round((py - pbrPad) / pbrStep);
      if (gx < 0 || gy < 0 || gx >= pbrCols || gy >= pbrRows) {
        return -1;
      }
      return pbrAt(gx, gy);
    }

    canvas.addEventListener("pointerdown", function (event) {
      event.preventDefault();
      var at = nodeFromEvent(event);
      if (at >= 0) {
        chooseNode(at);
      }
    });

    canvas.addEventListener("pointermove", function (event) {
      var at = nodeFromEvent(event);
      if (at >= 0 && !running && !done && (nodes[at].x !== cursor.x || nodes[at].y !== cursor.y)) {
        cursor = { x: nodes[at].x, y: nodes[at].y };
        render();
      }
    });

    canvas.addEventListener("keydown", function (event) {
      var key = event.key;
      if (key === "ArrowLeft" || key === "ArrowRight" || key === "ArrowUp" || key === "ArrowDown") {
        event.preventDefault();
        cursor = {
          x: Math.max(0, Math.min(pbrCols - 1, cursor.x + (key === "ArrowLeft" ? -1 : key === "ArrowRight" ? 1 : 0))),
          y: Math.max(0, Math.min(pbrRows - 1, cursor.y + (key === "ArrowUp" ? -1 : key === "ArrowDown" ? 1 : 0))),
        };
        render();
        return;
      }
      if (key === "Enter" || key === " ") {
        event.preventDefault();
        chooseNode(pbrAt(cursor.x, cursor.y));
        return;
      }
      if (key === "r" || key === "R") {
        event.preventDefault();
        if (done) {
          loadSpan(level);
        } else {
          rollCart();
        }
        return;
      }
      if (key === "Escape") {
        event.preventDefault();
        if (pick >= 0) {
          pick = -1;
          result.textContent = t("pbrPickCancelled");
          renderHud();
          render();
        }
        return;
      }
      if (key === "Backspace" || key === "u" || key === "U") {
        event.preventDefault();
        removeLast();
      }
    });

    rollBtn.addEventListener("click", function () {
      if (done) {
        loadSpan(level);
        return;
      }
      rollCart();
    });

    spanSel.addEventListener("change", function () {
      var index = campaign.indexOf(spanSel.value);
      if (index >= 0 && campaign.isUnlocked(spanSel.value)) {
        loadSpan(pbrLevels[index]);
        return;
      }
      spanSel.value = level.id;
      result.textContent = t("pbrLockedSpan");
    });

    /* The drawing is the player's work: a pause lifts the cart off the span
     * without touching a single beam. */
    App.quietResetPaperBridge = function () {
      if (timerId !== null) {
        window.clearInterval(timerId);
        timerId = null;
      }
      running = false;
      stopLoop();
      if (!done) {
        setRollLabel("pbrBtnRoll");
      }
      renderHud();
      render();
    };

    loadSpan(level);
  }

  App.addStrings({
    en: {
      "tabPaperBridge": "Paper Bridge",
      "pbrZ1": "Short Gap",
      "pbrZ2": "The Mid Pier",
      "pbrZ3": "Triangle Brace",
      "pbrZ4": "Two Ledges",
      "pbrZ5": "Uneven Landing",
      "pbrBeamLabel": "Beams",
      "pbrParLabel": "Par",
      "pbrGapLabel": "Span",
      "pbrDraftLabel": "Drafting",
      "pbrSpanSelectLabel": "Span",
      "pbrBeamValue": "{n}/{max}",
      "pbrParValue": "{n} beams",
      "pbrGapValue": "col {a} to {b}",
      "pbrStateIdle": "pick a start node",
      "pbrStatePick": "pick an end node",
      "pbrNodeLabel": "col {x} row {y}",
      "pbrFieldLabel": "Side view of the chasm: arrow keys move the node cursor, Enter picks a start node and then an end node to lay a beam, Backspace lifts the last beam, R rolls the cart",
      "pbrBtnRoll": "Roll The Cart",
      "pbrBtnRolling": "Rolling",
      "pbrBtnAgain": "New Span",
      "pbrLegendBeams": "{n} of {max} beams laid, par {par}",
      "pbrGripLevel": "this cart only rolls on a level deck - no climbing",
      "pbrGripRamp": "this cart can climb one row per column; beams longer than 3 nodes need a node under their middle",
      "pbrPrompt": "{name}: span the chasm in {p} beams - the yard hands out {n}. Pick a node, then pick the node to reach.",
      "pbrPickEnd": "Beam starts at column {x}, row {y} - now pick the far end.",
      "pbrPickCancelled": "Start node put back, nothing laid.",
      "pbrBeamPlaced": "Beam of {n} nodes laid. {left} more may be laid.",
      "pbrTooMany": "The yard only allows {n} beams - lift one first.",
      "pbrLocked": "The cart is already on the span - press New Span to draw again.",
      "pbrNothingToUndo": "No beams standing to take down.",
      "pbrNoOff": "A beam needs two different nodes.",
      "pbrNoAngle": "Beams only run along the eight directions from a node - pick the start again.",
      "pbrNoLong": "That is longer than four nodes - no paper beam reaches it.",
      "pbrNoSame": "A beam already runs there.",
      "pbrFailGap": "The deck ends at {a} while the far bank waits at {b} - the cart has nowhere to roll.",
      "pbrFailSlope": "The step from {a} to {b} is too steep for the cart's grip.",
      "pbrFailBuckle": "Beam {a} to {b} is longer than three nodes with nothing under its middle, so it buckles.",
      "pbrFailCollapse": "The deck at {a} (by {b}) is held along only one line - brace it or prop it.",
      "pbrFailWeight": "The span stands, but it is carrying more beams than the weight limit allows.",
      "pbrCrossed": "The cart rolled across on {n} beams (par {par}) - {s} stars.",
      "pbrNextSpan": "Next span unlocked.",
      "pbrLineDone": "The whole line is bridged.",
      "pbrLockedSpan": "That span is still sealed - cross the one before it.",
      "pbrUnproven": "The stored plan for {name} now fails ({why}), so this span ships unproven.",
      "pbrHint": "A deck node only stands when two supports hold it from directions that are not one straight line, so a flat span needs a pier underneath or a triangle beside it. Beams run along the eight lattice directions, and one longer than three nodes buckles unless a node carries its middle.",
      "logPaperBridge": "Bridged a span with {n} beams",
    },
    zh: {
      "tabPaperBridge": "纸桥工程",
      "pbrZ1": "短缺口",
      "pbrZ2": "中立柱",
      "pbrZ3": "三角撑",
      "pbrZ4": "两道崖台",
      "pbrZ5": "落点不齐",
      "pbrBeamLabel": "梁数",
      "pbrParLabel": "标准",
      "pbrGapLabel": "跨距",
      "pbrDraftLabel": "制图",
      "pbrSpanSelectLabel": "桥跨",
      "pbrBeamValue": "{n}/{max}",
      "pbrParValue": "{n} 根",
      "pbrGapValue": "第 {a} 列到第 {b} 列",
      "pbrStateIdle": "选起点",
      "pbrStatePick": "选终点",
      "pbrNodeLabel": "第 {x} 列第 {y} 行",
      "pbrFieldLabel": "峡谷侧视图：方向键移动节点光标，回车先定起点再定终点就能放梁，退格拆掉最后一根，R 放小车过桥",
      "pbrBtnRoll": "放小车过桥",
      "pbrBtnRolling": "过桥中",
      "pbrBtnAgain": "重画一跨",
      "pbrLegendBeams": "已放 {n}/{max} 根梁，标准 {par} 根",
      "pbrGripLevel": "这辆小车只走平桥面，不会爬坡",
      "pbrGripRamp": "这辆小车能一格进一格地爬；长过 3 个节点的梁要在中部有节点撑着",
      "pbrPrompt": "{name}：这一跨的标准是 {p} 根梁——料场最多给你 {n} 根。先点一个节点，再点要连到的节点。",
      "pbrPickEnd": "梁的起点在第 {x} 列、第 {y} 行——再点选远端。",
      "pbrPickCancelled": "起点已放回，没有放梁。",
      "pbrBeamPlaced": "放下长度为 {n} 的梁，还能再放 {left} 根。",
      "pbrTooMany": "料场只给 {n} 根梁——先拆掉一根。",
      "pbrLocked": "小车已经在桥上了——按“重画一跨”再画一次。",
      "pbrNothingToUndo": "没有架好的梁可拆。",
      "pbrNoOff": "一根梁要连两个不同的节点。",
      "pbrNoAngle": "梁只能沿节点的八个方向走——请重选起点。",
      "pbrNoLong": "那超过四个节点长，纸梁够不着。",
      "pbrNoSame": "那里已经有一根梁了。",
      "pbrFailGap": "桥面停在{a}，对岸在{b}——小车没有路可走。",
      "pbrFailSlope": "从{a}到{b}太陡，小车的轮子抓不住。",
      "pbrFailBuckle": "{a}到{b}这根梁长过三个节点，中部又没人托着，会压弯。",
      "pbrFailCollapse": "{a}（挨着{b}）这段桥面只有一条线撑着——加个斜撑或者立根柱子。",
      "pbrFailWeight": "桥是站住了，但用的梁超过了承重上限。",
      "pbrCrossed": "小车用 {n} 根梁滚过对岸（标准 {par} 根）- 获得 {s} 星。",
      "pbrNextSpan": "解锁下一跨。",
      "pbrLineDone": "整条线路都架通了。",
      "pbrLockedSpan": "这一跨还没开放——先跨过前面那一跨。",
      "pbrUnproven": "{name} 存档的架法现在检查不过（{why}），这一跨未获证明。",
      "pbrHint": "桥面上的节点要被两个不在同一直线上的支撑拉住才站得住，所以平铺一跨必须下面立柱或旁边加三角撑。梁只能沿格点八方向走，长过三个节点而中部没节点承托就会失稳。",
      "logPaperBridge": "用 {n} 根梁架好了一跨",
    },
  });

  App.registerGame({
    name: "paperBridge",
    tabKey: "tabPaperBridge",
    init: initPaperBridgeGame,
    guide: {
      svg:
        '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="6" y="6" width="108" height="64" rx="5" fill="rgba(30,41,59,.8)" stroke="rgba(148,163,184,.45)"/>' +
        '<path d="M6 44h26v32H6z M88 44h32v32H88z" fill="rgba(71,85,105,.9)"/>' +
        '<path d="M32 44h56" stroke="#e2e8f0" stroke-width="3"/>' +
        '<path d="M32 44 60 60 88 44" fill="none" stroke="#22d3ee" stroke-width="2" stroke-dasharray="4 3"/>' +
        '<path d="M60 44v16" stroke="#fbbf24" stroke-width="2" stroke-dasharray="2 2"/>' +
        '<rect x="52" y="36" width="11" height="7" fill="#a3e635"/>' +
        '<text x="74" y="36" font-size="8" fill="#94a3b8">2</text></svg>',
      en: [
        "Aim: lay beams until the cart can roll from this abutment to the far one.",
        "Action: pick a node, then pick a second node - the beam snaps onto the nearest of the eight lattice directions. Arrows move the node cursor, Enter picks start then end, Backspace lifts the last beam, R rolls the cart.",
        "Rule: a deck node stands only when two supports hold it from directions that are not one straight line, so a flat span needs a pier underneath or a triangle beside it.",
        "Watch out: a beam longer than three nodes buckles unless a node carries its middle, the cart cannot climb steeper than one cell per cell, and the yard only hands out so many beams.",
        "Feedback: every beam prints its own length and uses its own dash pattern, and a failed roll names the guilty segment in words.",
        "Scoring: crossing on par beams is three stars; every extra beam left in the drawing costs you.",
      ],
      zh: [
        "目标：架好梁，让小车能从这侧桥头一直滚到对岸。",
        "操作：先点一个节点，再点第二个——梁会自动贴到八方向里最近的那条线上。方向键移动节点光标，回车先定起点再定终点，退格拆掉最后一根，R 放小车。",
        "规则：桥面上的节点只有被两个方向不在同一直线上的支撑拉住才站得住，所以平铺一跨必须下面立柱或旁边加三角撑。",
        "小心：长过三个节点的梁若中部没人托着就会压弯；小车爬不了比一格进一格更陡的坡；料场也只给这么多根梁。",
        "反馈：每根梁都印着自己的长度并使用独有的虚线样式，过桥失败时会用文字点名出问题的那一段。",
        "计分：用标准根数过桥就是三星；图纸上多留一根就要扣一点。",
      ],
    },
  });

  /* Exported for the other modules and for the headless checks. */
  App.initPaperBridgeGame = initPaperBridgeGame;
  App.bridgeCheck = bridgeCheck;
  App.bridgeSnap = bridgeSnap;
  App.bridgeBeamOk = pbrBeamOk;
  App.bridgeSupport = pbrSupport;
  App.bridgeNodes = pbrNodes;
  App.bridgeSpan = pbrSpan;
  App.bridgeLevels = pbrLevels;
})(window.CapitalConvert = window.CapitalConvert || {});
