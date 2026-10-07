/* Echo Cartographer - survey a cave by shouting into it.
 * A ping maps the cells it can hear, the map fades from fresh to remembered,
 * and a blind cave fish walks toward the last sound. The turn logic is event
 * driven (a move or a ping is one turn) and rAF only draws, so a hidden tab can
 * never eat a turn or teleport the fish. */
(function (App) {
  var t = App.t;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  var createCampaign = App.createCampaign;
  var fillCampaignPicker = App.fillCampaignPicker;
  var starsFor = App.starsFor;

  var echW = 17;
  var echH = 13;
  var echCell = 24;
  var echWid = echW * echCell;
  var echHit = echH * echCell;
  var echRadius = 3;
  var echFade = 8;
  var echHear = 6;

  /* pings is the hard ink budget, starPings the [3,2,1] star bands measured
   * with the oracle survey, fish 0 none / 1 hunts / 2 hunts twice a turn. */
  var echLevels = [
    { id: "c1", labelKey: "echZ1", style: "rooms", pings: 10, quota: 2, starPings: [5, 7, 9], fish: 0 },
    { id: "c2", labelKey: "echZ2", style: "fork", pings: 10, quota: 3, starPings: [5, 7, 9], fish: 0 },
    { id: "c3", labelKey: "echZ3", style: "hall", pings: 11, quota: 3, starPings: [6, 8, 10], fish: 1 },
    { id: "c4", labelKey: "echZ4", style: "pinch", pings: 12, quota: 4, starPings: [7, 9, 11], fish: 1 },
    { id: "c5", labelKey: "echZ5", style: "deep", pings: 10, quota: 4, starPings: [6, 8, 10], fish: 2 },
  ];

  /* --- pure core ----------------------------------------------------------
   * A linear congruential generator, so a seed always replays the same cave. */
  function echRng(seed) {
    var state = (seed >>> 0) + 1;
    return function next() {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }

  function echBlank(w, h, value) {
    var rows = [];
    for (var y = 0; y < h; y += 1) {
      var line = [];
      for (var x = 0; x < w; x += 1) {
        line.push(value);
      }
      rows.push(line);
    }
    return rows;
  }

  /* Straight interior cells between two points, endpoints excluded. A ping
   * stops at the first stone it crosses, which is what gives rooms and
   * corridors their shape instead of a plain filled circle. */
  function echSegment(from, to) {
    var cells = [];
    var dx = to.x - from.x;
    var dy = to.y - from.y;
    var steps = Math.max(Math.abs(dx), Math.abs(dy));
    if (steps < 2) {
      return cells;
    }
    for (var i = 1; i < steps; i += 1) {
      cells.push({
        x: Math.round(from.x + (dx * i) / steps),
        y: Math.round(from.y + (dy * i) / steps),
      });
    }
    return cells;
  }

  function echReveal(grid, origin, radius) {
    var found = [];
    if (!grid || !grid.length || !origin) {
      return found;
    }
    var w = grid[0].length;
    var h = grid.length;
    var reach = radius > 0 ? radius : echRadius;
    for (var dy = -reach; dy <= reach; dy += 1) {
      for (var dx = -reach; dx <= reach; dx += 1) {
        if (!dx && !dy) {
          continue;
        }
        var x = origin.x + dx;
        var y = origin.y + dy;
        if (x < 0 || y < 0 || x >= w || y >= h) {
          continue;
        }
        var blocked = false;
        var path = echSegment(origin, { x: x, y: y });
        for (var p = 0; p < path.length; p += 1) {
          var cell = path[p];
          if (cell.x >= 0 && cell.y >= 0 && cell.x < w && cell.y < h && grid[cell.y][cell.x]) {
            blocked = true;
            break;
          }
        }
        if (!blocked) {
          found.push({ x: x, y: y, stone: grid[y][x] ? 1 : 0 });
        }
      }
    }
    return found;
  }

  /* 4-neighbour BFS over open cells; returns the visited set as a grid. */
  function echFlood(grid, from) {
    var w = grid[0].length;
    var h = grid.length;
    var seen = echBlank(w, h, 0);
    if (!from || grid[from.y][from.x]) {
      return seen;
    }
    var queue = [from];
    var head = 0;
    seen[from.y][from.x] = 1;
    while (head < queue.length) {
      var cur = queue[head];
      head += 1;
      for (var d = 0; d < echDirs.length; d += 1) {
        var nx = cur.x + echDirs[d].x;
        var ny = cur.y + echDirs[d].y;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h || seen[ny][nx] || grid[ny][nx]) {
          continue;
        }
        seen[ny][nx] = 1;
        queue.push({ x: nx, y: ny });
      }
    }
    return seen;
  }

  var echDirs = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];

  /* Path over the cells the surveyor already knows are open - the same test the
   * dead-end check and the pointer walk use. */
  function echPath(map, from, to) {
    var w = map[0].length;
    var h = map.length;
    if (!from || !to || from.x < 0 || from.y < 0 || to.x < 0 || to.y < 0) {
      return null;
    }
    if (to.x >= w || to.y >= h || map[to.y][to.x] !== 1) {
      return null;
    }
    var seen = echBlank(w, h, 0);
    var back = {};
    var queue = [from];
    var head = 0;
    seen[from.y][from.x] = 1;
    while (head < queue.length) {
      var cur = queue[head];
      head += 1;
      if (cur.x === to.x && cur.y === to.y) {
        var route = [];
        var walk = cur;
        while (walk) {
          route.unshift({ x: walk.x, y: walk.y });
          walk = back[walk.y + ":" + walk.x];
        }
        return route;
      }
      for (var d = 0; d < echDirs.length; d += 1) {
        var nx = cur.x + echDirs[d].x;
        var ny = cur.y + echDirs[d].y;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h || seen[ny][nx] || map[ny][nx] !== 1) {
          continue;
        }
        seen[ny][nx] = 1;
        back[ny + ":" + nx] = cur;
        queue.push({ x: nx, y: ny });
      }
    }
    return null;
  }

  function echCarveRoom(grid, x, y, w, h) {
    for (var cy = y; cy < y + h; cy += 1) {
      for (var cx = x; cx < x + w; cx += 1) {
        if (cx > 0 && cy > 0 && cx < grid[0].length - 1 && cy < grid.length - 1) {
          grid[cy][cx] = 0;
        }
      }
    }
  }

  function echTunnel(grid, from, to, wide) {
    var x = from.x;
    var y = from.y;
    var stepX = x < to.x ? 1 : -1;
    var stepY = y < to.y ? 1 : -1;
    while (x !== to.x) {
      x += stepX;
      grid[y][x] = 0;
      if (wide && y + 1 < grid.length - 1) {
        grid[y + 1][x] = 0;
      }
    }
    while (y !== to.y) {
      y += stepY;
      grid[y][x] = 0;
      if (wide && x + 1 < grid[0].length - 1) {
        grid[y][x + 1] = 0;
      }
    }
  }

  function echOpenCells(grid) {
    var cells = [];
    for (var y = 0; y < grid.length; y += 1) {
      for (var x = 0; x < grid[0].length; x += 1) {
        if (!grid[y][x]) {
          cells.push({ x: x, y: y });
        }
      }
    }
    return cells;
  }

  /* Two BFS hops from any open cell land on a pair near the cave's diameter,
   * so the entrance and the shaft never end up next to each other. */
  function echDiameter(grid) {
    var open = echOpenCells(grid);
    if (open.length < 8) {
      return null;
    }
    var first = echFlood(grid, open[0]);
    var best = null;
    var bestScore = -1;
    var i;
    for (i = 0; i < open.length; i += 1) {
      var cell = open[i];
      var ring = Math.abs(cell.x - open[0].x) + Math.abs(cell.y - open[0].y);
      if (first[cell.y][cell.x] && ring > bestScore) {
        bestScore = ring;
        best = cell;
      }
    }
    if (!best) {
      return null;
    }
    var second = echFlood(grid, best);
    var far = null;
    var farScore = -1;
    for (i = 0; i < open.length; i += 1) {
      var cand = open[i];
      var dist = Math.abs(cand.x - best.x) + Math.abs(cand.y - best.y);
      if (second[cand.y][cand.x] && dist > farScore) {
        farScore = dist;
        far = cand;
      }
    }
    if (!far || farScore < 8) {
      return null;
    }
    return { a: best, b: far, reach: second };
  }

  /* The generator per cave flavour. All of them start solid and get carved,
   * so nothing can leak into the unexplored void. */
  function echCarve(style, rng) {
    var grid = echBlank(echW, echH, 1);
    var slots = [];
    var i;
    if (style === "hall") {
      echCarveRoom(grid, 4, 3, 9, 7);
      slots = [{ x: 1, y: 1, w: 3, h: 3 }, { x: 13, y: 1, w: 3, h: 3 }, { x: 1, y: 9, w: 3, h: 3 }, { x: 13, y: 9, w: 3, h: 3 }];
      for (i = 0; i < slots.length; i += 1) {
        echCarveRoom(grid, slots[i].x, slots[i].y, slots[i].w, slots[i].h);
        echTunnel(grid, { x: slots[i].x + 1, y: slots[i].y + 1 }, { x: 5 + (i % 3) * 3, y: 4 + Math.floor(i / 3) * 3 });
      }
      for (i = 0; i < 5; i += 1) {
        var pillarX = 5 + i * 2;
        if (pillarX < echW - 4) {
          grid[6][pillarX] = 1;
        }
      }
    } else if (style === "pinch") {
      var chambers = [
        { x: 1, y: 1, w: 5, h: 4 },
        { x: 11, y: 1, w: 5, h: 4 },
        { x: 1, y: 8, w: 5, h: 4 },
        { x: 11, y: 8, w: 5, h: 4 },
        { x: 6, y: 5, w: 5, h: 3 },
      ];
      for (i = 0; i < chambers.length; i += 1) {
        echCarveRoom(grid, chambers[i].x, chambers[i].y, chambers[i].w, chambers[i].h);
      }
      /* One-cell pinches: the echo only whispers through them. */
      echTunnel(grid, { x: 4, y: 4 }, { x: 7, y: 5 });
      echTunnel(grid, { x: 13, y: 4 }, { x: 10, y: 5 });
      echTunnel(grid, { x: 4, y: 8 }, { x: 7, y: 7 });
      echTunnel(grid, { x: 13, y: 8 }, { x: 10, y: 7 });
      echTunnel(grid, { x: 6, y: 6 }, { x: 3, y: 6 });
      echTunnel(grid, { x: 10, y: 6 }, { x: 13, y: 6 });
    } else if (style === "fork") {
      var trunkY = 3 + Math.floor(rng() * 4);
      echCarveRoom(grid, 1, trunkY - 1, 3, 3);
      for (i = 2; i < echW - 2; i += 1) {
        grid[trunkY][i] = 0;
      }
      grid[trunkY][echW - 2] = 0;
      echCarveRoom(grid, echW - 4, trunkY - 1, 3, 3);
      var branches = [4, 7, 10, 13];
      for (i = 0; i < branches.length; i += 1) {
        var bx = branches[i];
        var dir = i % 2 === 0 ? 1 : -1;
        for (var by = trunkY; by !== 1 && by !== echH - 2 && (by - trunkY) * dir < 4; by += dir) {
          grid[by][bx] = 0;
        }
        grid[by][bx] = 0;
        echCarveRoom(grid, Math.max(1, bx - 1), Math.max(1, Math.min(by - 1, echH - 4)), 3, 3);
      }
    } else {
      /* rooms / deep: a jittered lattice of chambers joined in a chain. */
      var cols = 3;
      var rows = 2;
      var centres = [];
      var slotW = Math.floor((echW - 2) / cols);
      var slotH = Math.floor((echH - 2) / rows);
      for (var r = 0; r < rows; r += 1) {
        for (var c = 0; c < cols; c += 1) {
          var rw = (style === "deep" ? 3 : 4) + Math.floor(rng() * 2);
          var rh = (style === "deep" ? 2 : 3) + Math.floor(rng() * 2);
          var rx = 1 + c * slotW + Math.floor(rng() * Math.max(1, slotW - rw - 1));
          var ry = 1 + r * slotH + Math.floor(rng() * Math.max(1, slotH - rh - 1));
          rx = Math.max(1, Math.min(rx, echW - rw - 1));
          ry = Math.max(1, Math.min(ry, echH - rh - 1));
          echCarveRoom(grid, rx, ry, rw, rh);
          centres.push({ x: rx + Math.floor(rw / 2), y: ry + Math.floor(rh / 2) });
        }
      }
      var links = style === "deep" ? centres.length : centres.length - 1;
      for (i = 0; i < links; i += 1) {
        echTunnel(grid, centres[i], centres[(i + 1) % centres.length], style === "rooms");
      }
      if (style === "deep") {
        echTunnel(grid, centres[0], centres[centres.length - 1]);
      }
    }
    return grid;
  }

  function echPlaceFossils(grid, reach, from, count, rng) {
    var pool = [];
    var open = echOpenCells(grid);
    var i;
    for (i = 0; i < open.length; i += 1) {
      var cell = open[i];
      if (reach[cell.y][cell.x] && (Math.abs(cell.x - from.x) + Math.abs(cell.y - from.y)) > 3) {
        pool.push(cell);
      }
    }
    var chosen = [];
    var guard = 0;
    while (chosen.length < count && pool.length && guard < 400) {
      guard += 1;
      var pick = pool[Math.floor(rng() * pool.length)];
      var tooClose = false;
      for (i = 0; i < chosen.length; i += 1) {
        if (Math.abs(chosen[i].x - pick.x) + Math.abs(chosen[i].y - pick.y) < 3) {
          tooClose = true;
          break;
        }
      }
      if (!tooClose) {
        chosen.push({ x: pick.x, y: pick.y });
      }
    }
    return chosen;
  }

  /* Builds one cave and only returns it once BFS proves the entrance, the
   * shaft, the fossils and the fish den sit in one connected component;
   * otherwise the next seed is dealt. */
  function echCave(side, seed) {
    var style = "rooms";
    var quota = 3;
    var w = echW;
    var h = echH;
    if (side && typeof side === "object") {
      style = side.style || style;
      quota = typeof side.quota === "number" ? side.quota : quota;
    } else if (typeof side === "number" && side > 0) {
      w = Math.max(9, Math.round(side));
      h = Math.max(7, Math.round(side * 0.76));
    }
    var tries = 0;
    while (tries < 60) {
      tries += 1;
      var rng = echRng((Number(seed) || 1) + tries * 7919);
      var grid = echCarve(style, rng);
      if (grid[0].length !== w || grid.length !== h) {
        var trimmed = echBlank(w, h, 1);
        for (var y = 0; y < h; y += 1) {
          for (var x = 0; x < w; x += 1) {
            trimmed[y][x] = y < grid.length && x < grid[0].length ? grid[y][x] : 1;
          }
        }
        grid = trimmed;
      }
      var pair = echDiameter(grid);
      if (!pair) {
        continue;
      }
      var reach = echFlood(grid, pair.a);
      var fossils = echPlaceFossils(grid, reach, pair.a, quota + 1, rng);
      if (fossils.length < quota) {
        continue;
      }
      var den = null;
      var denTries = 0;
      while (!den && denTries < 120) {
        denTries += 1;
        var cand = fossils[Math.floor(rng() * fossils.length)];
        if (cand && Math.abs(cand.x - pair.a.x) + Math.abs(cand.y - pair.a.y) > 6) {
          den = { x: cand.x, y: cand.y };
        }
      }
      if (!den) {
        den = { x: pair.b.x, y: pair.b.y };
      }
      var probe = echFlood(grid, pair.a);
      var ok = probe[pair.b.y][pair.b.x] && probe[den.y][den.x];
      var i;
      for (i = 0; ok && i < fossils.length; i += 1) {
        ok = !!probe[fossils[i].y][fossils[i].x];
      }
      if (ok) {
        return {
          w: w,
          h: h,
          style: style,
          seed: (Number(seed) || 1) + tries * 7919,
          grid: grid,
          start: { x: pair.a.x, y: pair.a.y },
          exit: { x: pair.b.x, y: pair.b.y },
          fossils: fossils,
          den: den,
        };
      }
    }
    /* A fully open shell is always solvable, so a bad roll can never hang or
     * deal an unwinnable cave. */
    var safe = echBlank(w, h, 1);
    echCarveRoom(safe, 1, 1, w - 2, h - 2);
    var safeFossils = [];
    for (var f = 0; f < quota; f += 1) {
      safeFossils.push({ x: 2 + f * 2, y: 2 + (f % 3) });
    }
    return {
      w: w,
      h: h,
      style: style,
      seed: Number(seed) || 1,
      grid: safe,
      start: { x: 1, y: 1 },
      exit: { x: w - 2, y: h - 2 },
      fossils: safeFossils,
      den: { x: Math.floor(w / 2), y: Math.floor(h / 2) },
    };
  }

  function echChebyshev(a, b) {
    return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
  }

  /* Fish step: greedy toward the last heard ping over open cells. */
  function echFishStep(grid, fish, target) {
    var best = { x: fish.x, y: fish.y };
    var bestDist = echChebyshev(fish, target);
    for (var d = 0; d < echDirs.length; d += 1) {
      var nx = fish.x + echDirs[d].x;
      var ny = fish.y + echDirs[d].y;
      if (nx < 0 || ny < 0 || nx >= grid[0].length || ny >= grid.length || grid[ny][nx]) {
        continue;
      }
      var dist = echChebyshev({ x: nx, y: ny }, target);
      if (dist < bestDist) {
        bestDist = dist;
        best = { x: nx, y: ny };
      }
    }
    return best;
  }

  App.echoReveal = echReveal;
  App.echoCave = echCave;
  App.echoPath = echPath;
  App.echoFlood = echFlood;
  App.echoLevels = echLevels;

  function initEchoCartographerGame(panelEl) {
    if (!panelEl) {
      return;
    }

    var campaign = createCampaign({ key: "echo-cartographer-campaign", levels: echLevels });
    var levelIndex = campaign.indexOf(campaign.nextLevelId());
    var level = echLevels[levelIndex < 0 ? 0 : levelIndex];

    var cave = null;
    var marks = null;
    var seenAt = null;
    var taken = null;
    var player = { x: 0, y: 0 };
    var fish = null;
    var pingsLeft = 0;
    var collected = 0;
    var moves = 0;
    var nerves = 2;
    var hunt = 0;
    var heard = -1;
    var over = false;
    var rings = [];
    var rafId = null;
    var lastFrame = 0;
    var paused = false;

    /* --- markup ---------------------------------------------------------- */
    var hud = document.createElement("div");
    hud.className = "game-hud";
    var pingEl = document.createElement("strong");
    var fossilEl = document.createElement("strong");
    var stepEl = document.createElement("strong");
    var earEl = document.createElement("strong");
    hud.appendChild(makeStat("echPingLabel", pingEl));
    hud.appendChild(makeStat("echFossilLabel", fossilEl));
    hud.appendChild(makeStat("echStepLabel", stepEl));
    hud.appendChild(makeStat("echEarLabel", earEl));

    var canvas = document.createElement("canvas");
    canvas.className = "ech-canvas";
    canvas.width = echWid;
    canvas.height = echHit;
    canvas.setAttribute("tabindex", "0");
    canvas.setAttribute("role", "application");
    canvas.setAttribute("aria-label", t("echFieldLabel"));

    var echoLine = document.createElement("p");
    echoLine.className = "ech-echo";

    var result = document.createElement("p");
    result.className = "game-result";
    result.setAttribute("role", "status");

    var caveRow = document.createElement("div");
    caveRow.className = "elements-row";
    var caveLabel = document.createElement("label");
    caveLabel.className = "elements-label";
    caveLabel.setAttribute("for", "echCaveSel");
    caveLabel.setAttribute("data-i18n", "echCaveSelectLabel");
    caveLabel.textContent = t("echCaveSelectLabel");
    var caveSel = document.createElement("select");
    caveSel.className = "elements-select";
    caveSel.id = "echCaveSel";
    caveRow.appendChild(caveLabel);
    caveRow.appendChild(caveSel);

    var actions = document.createElement("div");
    actions.className = "game-actions";
    var surveyBtn = document.createElement("button");
    surveyBtn.type = "button";
    surveyBtn.className = "primary";
    var surveyLabel = document.createElement("span");
    surveyLabel.setAttribute("data-i18n", "echBtnSurvey");
    surveyLabel.textContent = t("echBtnSurvey");
    var surveyContent = document.createElement("span");
    surveyContent.className = "button-content";
    surveyContent.appendChild(surveyLabel);
    surveyBtn.appendChild(surveyContent);
    var bestEl = document.createElement("p");
    bestEl.className = "game-best";
    actions.appendChild(surveyBtn);
    actions.appendChild(bestEl);

    var hint = document.createElement("p");
    hint.className = "game-hint";
    hint.setAttribute("data-i18n", "echHint");
    hint.textContent = t("echHint");

    [hud, canvas, echoLine, result, caveRow, actions, hint].forEach(function (node) {
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
        caveSel,
        campaign,
        function (def) {
          return t(def.labelKey);
        },
        t("elementsLocked"),
      );
      caveSel.value = level.id;
      bestEl.textContent = t("campaignStars", {
        n: campaign.totalStars(),
        max: campaign.maxStars(),
      });
    }

    function renderHud() {
      pingEl.textContent = String(pingsLeft);
      fossilEl.textContent = collected + "/" + level.quota;
      stepEl.textContent = String(moves);
      earEl.textContent = heard < 0 ? t("echEarSilent") : t("echEarNear", { n: heard });
    }

    /* --- survey ---------------------------------------------------------- */
    function shout() {
      if (over || pingsLeft <= 0) {
        return;
      }
      pingsLeft -= 1;
      var cells = echReveal(cave.grid, player, echRadius);
      for (var i = 0; i < cells.length; i += 1) {
        var cell = cells[i];
        marks[cell.y][cell.x] = cell.stone ? 2 : 1;
        seenAt[cell.y][cell.x] = moves;
      }
      rings.push({ x: player.x, y: player.y, born: performance.now() });
      if (level.fish && fish) {
        var gap = echChebyshev(fish, player);
        if (gap <= echHear) {
          hunt = 9;
          fish.target = { x: player.x, y: player.y };
          for (var c = 0; c < cells.length; c += 1) {
            if (cells[c].x === fish.x && cells[c].y === fish.y) {
              fish.spotted = true;
            }
          }
        }
      }
      collectHere();
      echoLine.textContent = t("echShout", {
        n: countFresh(),
        left: pingsLeft,
      });
      checkEnd();
      renderHud();
      draw();
    }

    function countFresh() {
      var fresh = 0;
      for (var y = 0; y < cave.h; y += 1) {
        for (var x = 0; x < cave.w; x += 1) {
          if (marks[y][x] === 1 && moves - seenAt[y][x] <= echFade) {
            fresh += 1;
          }
        }
      }
      return fresh;
    }

    function collectHere() {
      for (var i = 0; i < cave.fossils.length; i += 1) {
        var f = cave.fossils[i];
        if (!taken[i] && f.x === player.x && f.y === player.y) {
          taken[i] = 1;
          collected += 1;
          echoLine.textContent = t("echFossilFound", { n: collected, need: level.quota - collected });
        }
      }
    }

    function stepFish() {
      if (!level.fish || !fish) {
        return;
      }
      var steps = level.fish === 2 && hunt > 0 ? 2 : 1;
      for (var s = 0; s < steps; s += 1) {
        if (hunt > 0 && fish.target) {
          var glide = echFishStep(cave.grid, fish, fish.target);
          fish.x = glide.x;
          fish.y = glide.y;
          if (fish.x === fish.target.x && fish.y === fish.target.y) {
            hunt = 0;
          }
        } else if (moves % 3 === 0) {
          var drift = echDirs[Math.floor(Math.random() * echDirs.length)];
          var nx = fish.x + drift.x;
          var ny = fish.y + drift.y;
          if (nx > 0 && ny > 0 && nx < cave.w - 1 && ny < cave.h - 1 && !cave.grid[ny][nx]) {
            fish.x = nx;
            fish.y = ny;
          }
        }
      }
      if (hunt > 0) {
        hunt -= 1;
      }
      heard = echChebyshev(fish, player);
      if (fish.x === player.x && fish.y === player.y) {
        startle();
      }
    }

    function startle() {
      nerves -= 1;
      fish.x = cave.den.x;
      fish.y = cave.den.y;
      fish.spotted = false;
      hunt = 0;
      if (nerves <= 0) {
        over = true;
        result.textContent = t("echLost", { x: cave.exit.x + 1, y: cave.exit.y + 1 });
        renderHud();
        return;
      }
      pingsLeft = Math.max(0, pingsLeft - 2);
      echoLine.textContent = t("echStartle", { n: 2 });
      checkEnd();
      renderHud();
    }

    function moveBy(dx, dy) {
      if (over) {
        return;
      }
      var nx = player.x + dx;
      var ny = player.y + dy;
      if (nx < 0 || ny < 0 || nx >= cave.w || ny >= cave.h) {
        echoLine.textContent = t("echEdge");
        return;
      }
      if (marks[ny][nx] !== 1) {
        /* Never step into a cell the echo has not confirmed as open. */
        echoLine.textContent = t("echUnknown");
        return;
      }
      player.x = nx;
      player.y = ny;
      moves += 1;
      collectHere();
      stepFish();
      checkEnd();
      renderHud();
      draw();
    }

    function walkTo(target) {
      if (over) {
        return;
      }
      var known = marks;
      var route = echPath(known, player, target);
      if (!route || route.length < 2) {
        echoLine.textContent = t("echNoRoute");
        draw();
        return;
      }
      for (var i = 1; i < route.length; i += 1) {
        if (over) {
          return;
        }
        var next = route[i];
        moveBy(next.x - player.x, next.y - player.y);
      }
    }

    function checkEnd() {
      if (over) {
        return;
      }
      var atExit = player.x === cave.exit.x && player.y === cave.exit.y;
      if (atExit && collected >= level.quota) {
        finish();
        return;
      }
      if (pingsLeft <= 0 && !echPath(marks, player, cave.exit)) {
        over = true;
        result.textContent = t("echDry", {
          need: Math.max(0, level.quota - collected),
          x: cave.exit.x + 1,
          y: cave.exit.y + 1,
        });
      }
    }

    function finish() {
      over = true;
      var used = level.pings - pingsLeft;
      var starsWon = starsFor(used, level.starPings, "low");
      var outcome = campaign.record(level.id, {
        stars: starsWon,
        best: used,
        better: "low",
      });
      var message = t("echDone", { n: used, s: starsWon, f: collected });
      if (outcome.isBest) {
        message += " " + t("newBest");
      }
      if (outcome.unlockedNext) {
        message += " " + t("echNextCave");
      } else if (campaign.clearedCount() === echLevels.length) {
        message += " " + t("echAllMapped");
      }
      result.textContent = message;
      echoLine.textContent = t("echQuiet");
      logAction(t("logEchoCartographer", { n: used, f: collected }));
      var rect = surveyBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      refreshPicker();
    }

    function loadCave(def) {
      level = def;
      cave = echCave(level, Math.floor(Math.random() * 100000) + 1);
      marks = echBlank(cave.w, cave.h, 0);
      seenAt = echBlank(cave.w, cave.h, 0);
      taken = [];
      for (var f = 0; f < cave.fossils.length; f += 1) {
        taken.push(0);
      }
      player = { x: cave.start.x, y: cave.start.y };
      /* The entrance and its ring of cells are known: you stood there. */
      marks[cave.start.y][cave.start.x] = 1;
      seenAt[cave.start.y][cave.start.x] = 0;
      var seedCells = echReveal(cave.grid, cave.start, 1);
      for (var i = 0; i < seedCells.length; i += 1) {
        marks[seedCells[i].y][seedCells[i].x] = seedCells[i].stone ? 2 : 1;
      }
      fish = level.fish ? { x: cave.den.x, y: cave.den.y, target: null, spotted: false } : null;
      pingsLeft = level.pings;
      collected = 0;
      moves = 0;
      nerves = 2;
      hunt = 0;
      heard = -1;
      over = false;
      rings = [];
      paused = false;
      renderHud();
      refreshPicker();
      echoLine.textContent = t("echArmed", {
        name: t(level.labelKey),
        q: level.quota,
      });
      result.textContent = t("echObjective", {
        p: level.pings,
        q: level.quota,
        par: level.starPings[1],
      });
      draw();
    }

    /* --- drawing --------------------------------------------------------- */
    function shade(x, y) {
      var mark = marks[y][x];
      if (!mark) {
        return "#070b14";
      }
      var fresh = moves - seenAt[y][x] <= echFade;
      if (mark === 2) {
        return fresh ? "#3d4c66" : "#222a3a";
      }
      return fresh ? "#172845" : "#0e1626";
    }

    function draw() {
      if (!cave || !marks) {
        return;
      }
      ctx.clearRect(0, 0, echWid, echHit);
      ctx.fillStyle = "#070b14";
      ctx.fillRect(0, 0, echWid, echHit);
      if (App.world) { App.world.backdrop(ctx, echWid, echHit, "ocean"); }
      var x;
      var y;
      for (y = 0; y < cave.h; y += 1) {
        for (x = 0; x < cave.w; x += 1) {
          ctx.fillStyle = shade(x, y);
          ctx.fillRect(x * echCell, y * echCell, echCell - 1, echCell - 1);
        }
      }
      ctx.font = "bold 13px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      /* Fossils only appear where the echo has reached them. */
      for (var i = 0; i < cave.fossils.length; i += 1) {
        var f = cave.fossils[i];
        if (marks[f.y][f.x] !== 1) {
          continue;
        }
        ctx.fillStyle = taken[i] ? "#4b5a72" : "#fbbf24";
        ctx.fillText(taken[i] ? "\u00b7" : "\u25c6", f.x * echCell + echCell / 2, f.y * echCell + echCell / 2);
      }
      if (marks[cave.exit.y][cave.exit.x] === 1) {
        ctx.fillStyle = "#a3e635";
        ctx.fillText("E", cave.exit.x * echCell + echCell / 2, cave.exit.y * echCell + echCell / 2);
      }
      if (fish && fish.spotted) {
        ctx.fillStyle = "#fb7185";
        ctx.fillText("?", fish.x * echCell + echCell / 2, fish.y * echCell + echCell / 2);
      }
      drawRings();
      ctx.fillStyle = "#00f2ff";
      ctx.fillText("@", player.x * echCell + echCell / 2, player.y * echCell + echCell / 2);
    }

    /* Decorative only: the echo rings shrink away and stand still when the
     * player has motion switched off. */
    function drawRings() {
      if (!rings.length) {
        return;
      }
      var now = performance.now();
      var keep = [];
      for (var i = 0; i < rings.length; i += 1) {
        var ring = rings[i];
        var age = App.isMotionOff() ? 0.5 : (now - ring.born) / 1400;
        if (age >= 1) {
          continue;
        }
        keep.push(ring);
        var cx = ring.x * echCell + echCell / 2;
        var cy = ring.y * echCell + echCell / 2;
        ctx.beginPath();
        ctx.arc(cx, cy, age * echRadius * echCell, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(0, 242, 255, " + (0.55 * (1 - age)).toFixed(3) + ")";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      rings = keep;
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
      /* Turns only happen on input, so the frame merely plays out the fading
       * echo rings; dt keeps the clock honest if the tab was away. */
      if (rings.length) {
        draw();
      }
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
        draw();
      }
    }

    function cellFromEvent(event) {
      var rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        return null;
      }
      var px = (event.clientX - rect.left) * (canvas.width / rect.width);
      var py = (event.clientY - rect.top) * (canvas.height / rect.height);
      var x = Math.floor(px / echCell);
      var y = Math.floor(py / echCell);
      if (x < 0 || y < 0 || x >= cave.w || y >= cave.h) {
        return null;
      }
      return { x: x, y: y };
    }

    canvas.addEventListener("pointerdown", function (event) {
      event.preventDefault();
      wake();
      if (!cave) {
        return;
      }
      var hit = cellFromEvent(event);
      if (!hit) {
        return;
      }
      var gap = Math.abs(hit.x - player.x) + Math.abs(hit.y - player.y);
      if (gap === 1) {
        moveBy(hit.x - player.x, hit.y - player.y);
      } else if (gap > 1) {
        walkTo(hit);
      } else {
        shout();
      }
    });

    canvas.addEventListener("keydown", function (event) {
      wake();
      var stepMap = {
        ArrowLeft: { x: -1, y: 0 },
        KeyA: { x: -1, y: 0 },
        ArrowRight: { x: 1, y: 0 },
        KeyD: { x: 1, y: 0 },
        ArrowUp: { x: 0, y: -1 },
        KeyW: { x: 0, y: -1 },
        ArrowDown: { x: 0, y: 1 },
        KeyS: { x: 0, y: 1 },
      };
      var code = event.code || "";
      var step = stepMap[event.key] || stepMap[code];
      if (step) {
        event.preventDefault();
        moveBy(step.x, step.y);
        return;
      }
      if (event.key === " " || event.key === "Enter" || code === "Space") {
        event.preventDefault();
        shout();
      }
    });

    caveSel.addEventListener("change", function () {
      var index = campaign.indexOf(caveSel.value);
      if (index >= 0 && campaign.isUnlocked(caveSel.value)) {
        wake();
        loadCave(echLevels[index]);
      }
    });

    surveyBtn.addEventListener("click", function () {
      wake();
      loadCave(level);
    });

    /* Pausing must cost nothing: the loop stops, the survey waits, and the
     * first keystroke or tap re-arms the same cave. */
    App.quietResetEchoCartographer = function () {
      stopLoop();
      rings = [];
      paused = true;
      if (!over) {
        result.textContent = t("echPaused");
      }
    };

    loadCave(level);
    startLoop();
  }

  App.addStrings({
    en: {
      "tabEchoCartographer": "Echo Cartographer",
      "echZ1": "Room Cluster",
      "echZ2": "Forked Run",
      "echZ3": "Dark Hall",
      "echZ4": "Pinch Chambers",
      "echZ5": "The Deep System",
      "echPingLabel": "Ink",
      "echFossilLabel": "Fossils",
      "echStepLabel": "Steps",
      "echEarLabel": "Echo ear",
      "echCaveSelectLabel": "Choose a cave",
      "echBtnSurvey": "New Survey",
      "echFieldLabel": "Cave grid: arrows move, space pings, click a lit cell to walk there",
      "echEarSilent": "silent",
      "echEarNear": "rustling {n} away",
      "echArmed": "Standing in {name}. Collect {q} fossils, then reach the shaft.",
      "echObjective": "{p} pings of ink, {q} fossils, par {par} pings.",
      "echShout": "Echo returned {n} open cells. {left} pings left.",
      "echFossilFound": "Fossil {n} bagged. {need} more for the quota.",
      "echUnknown": "That cell is still guesswork - no step.",
      "echEdge": "The cave wall ends here.",
      "echNoRoute": "No known open route to that cell.",
      "echStartle": "Something slams past! {n} pings of ink spill.",
      "echLost": "Startled blind. The shaft was at column {x}, row {y}.",
      "echDry": "Ink spent and the way out unmapped. {need} fossils short; shaft at {x},{y}.",
      "echDone": "Survey filed with {n} pings and {f} fossils - {s} stars.",
      "echQuiet": "The cave is quiet now.",
      "echNextCave": "Next cave unlocked.",
      "echAllMapped": "Every cave on the sheet.",
      "echPaused": "Survey paused - your map waits exactly where you left it.",
      "echHint": "Ping, note where the walls are, then walk. Faded cells are still known ground.",
      "logEchoCartographer": "Filed a cave survey in {n} pings with {f} fossils",
    },
    zh: {
      "tabEchoCartographer": "回声测绘师",
      "echZ1": "石室群",
      "echZ2": "分叉长道",
      "echZ3": "黑暗大厅",
      "echZ4": "狭口厅堂",
      "echZ5": "深层系统",
      "echPingLabel": "墨量",
      "echFossilLabel": "化石",
      "echStepLabel": "步数",
      "echEarLabel": "耳感",
      "echCaveSelectLabel": "选择洞穴",
      "echBtnSurvey": "重新测绘",
      "echFieldLabel": "洞穴网格：方向键移动，空格回声定位，点击已探明格子走过去",
      "echEarSilent": "寂静",
      "echEarNear": "异响距 {n} 格",
      "echArmed": "你站在「{name}」入口。采齐 {q} 枚化石再去竖井。",
      "echObjective": "{p} 次回声墨量，{q} 枚化石，标准 {par} 次。",
      "echShout": "回声带回 {n} 个空格。还剩 {left} 次。",
      "echFossilFound": "收到第 {n} 枚化石。配额还差 {need} 枚。",
      "echUnknown": "那格还只是猜测，不能迈步。",
      "echEdge": "洞壁到此为止。",
      "echNoRoute": "没有已探明的通路能到那里。",
      "echStartle": "有东西撞过来！泼掉了 {n} 次墨量。",
      "echLost": "惊吓之下测绘中断。竖井在第 {x} 列、第 {y} 行。",
      "echDry": "墨尽而退路未明。还差 {need} 枚化石；竖井在 {x},{y}。",
      "echDone": "测绘完成：{n} 次回声、{f} 枚化石 - 获得 {s} 星。",
      "echQuiet": "洞穴重新安静下来。",
      "echNextCave": "解锁下一个洞穴。",
      "echAllMapped": "图纸上的洞穴都画完了。",
      "echPaused": "测绘已暂停，你的地图停在原处。",
      "echHint": "先敲回声，看清洞壁再迈步；变淡的格子依然是走过的实地。",
      "logEchoCartographer": "用 {n} 次回声完成测绘，收到 {f} 枚化石",
    },
  });

  App.registerGame({
    name: "echoCartographer",
    tabKey: "tabEchoCartographer",
    init: initEchoCartographerGame,
    guide: {
      svg:
        '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="4" y="4" width="112" height="68" rx="5" fill="rgba(7,11,20,.9)" stroke="rgba(148,163,184,.45)"/>' +
        '<path d="M14 14h26v18H14z" fill="none" stroke="rgba(0,242,255,.6)" stroke-width="2"/>' +
        '<path d="M40 23h34M74 23v30M74 53h30" fill="none" stroke="rgba(148,163,184,.4)" stroke-width="2" stroke-dasharray="3 3"/>' +
        '<circle cx="27" cy="23" r="16" fill="none" stroke="rgba(0,242,255,.35)"/>' +
        '<text x="27" y="27" font-size="11" fill="#00f2ff" text-anchor="middle">@</text>' +
        '<text x="92" y="50" font-size="10" fill="#a3e635" text-anchor="middle">E</text>' +
        '<text x="60" y="16" font-size="10" fill="#fbbf24" text-anchor="middle">\u25c6</text></svg>',
      en: [
        "Goal: map the cave by sound, bag the fossil quota, then reach the shaft marked E.",
        "Action: arrows or WASD step one cell; Space or Enter spends a ping that maps every cell the echo can hear.",
        "Rule: you only ever walk into cells the echo already confirmed as open - stone and guesswork are both impassable.",
        "Memory: a mapped cell fades to remembered after 8 steps and is drawn fainter, but it stays known ground.",
        "Watch out: a blind fish swims toward any ping it hears; the ear line counts down its distance and ? marks where you last heard it.",
        "Scoring: fewer pings earn more stars, so ping where you plan to walk instead of everywhere.",
      ],
      zh: [
        "目标：用回声画出洞穴，采齐化石配额，然后走到标着 E 的竖井。",
        "操作：方向键或 WASD 走一格；空格或回车花一次回声，探明所有听得见的格子。",
        "规则：只能走进回声确认过的空格，未探明和石壁一样迈不进去。",
        "记忆：探明的格子过 8 步会转成淡色记忆，但依然是已知的实地。",
        "小心：盲鱼会朝你最后一次回声游来；耳感行会报出它的距离，? 是它上次被听到的位置。",
        "计分：用的回声越少星越多，所以只朝要去的方向敲回声，别处处都试。",
      ],
    },
  });

  /* Exported for the other modules. */
  App.initEchoCartographerGame = initEchoCartographerGame;
})(window.CapitalConvert = window.CapitalConvert || {});
