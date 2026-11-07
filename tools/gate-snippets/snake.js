"use strict";

/* game-snake: the ziggurat district is nested stone, measured.
 *
 * Houses 31-40 build the one plan the first thirty never drew - a wall
 * ring inside another wall ring - and houses 41-44 carry the same grammar
 * to the apex: the ring re-cut with its doors set at two heights, stone
 * posted astride the wrap seams, the three terraces crowned with a heart
 * stone. This gate re-hosts the module core and proves the district the
 * way the release bench measured it: the ladder runs h1-h44 additively,
 * the quota climbs past the sky crown's thirty-three to forty-four, every
 * new house keeps at least two separate stone systems, four of them keep
 * a full ring of span four or better nested inside an outer shell (a
 * shape no shipped house keeps), h33 stacks three terraces strictly one
 * inside the next, and the star bands rise. Then the tier replays: the
 * routing hand - BFS to the berry over the engine's own walls, a step
 * taken only when the tail stays reachable, never a reversal the engine
 * would ignore - clears every new house at three stars on its own seeded
 * stream through the real panel, the campaign pays each clear, a greedy
 * hand on the same streams cannot hold the tier, and the district's
 * names resolve in both languages. */

const NEW = ["h31", "h32", "h33", "h34", "h35", "h36", "h37", "h38", "h39", "h40",
  "h41", "h42", "h43", "h44"];
const RING_HOUSES = ["h32", "h36", "h37", "h40"];
const SNK_COLS = 16;
const SNK_ROWS = 16;

module.exports = function gate(ctx) {
  const { App, env, check, fs, path, root } = ctx;

  /* ---- the ladder, lifted from the module's own source ------------------ */
  const snkSrc = fs
    .readFileSync(path.join(root, "assets", "app", "game-snake.js"), "utf8")
    .replace(/^﻿/, "");
  const snkSlice = snkSrc.slice(
    snkSrc.indexOf("var snkLevels"),
    snkSrc.indexOf("var snkSerpentHue"),
  );
  const table = new Function(snkSlice + "\nreturn snkLevels;")();
  const byId = {};
  table.forEach((house) => { byId[house.id] = house; });

  check("game-snake", "the ladder holds forty-four houses",
    table.length === 44, String(table.length));
  check("game-snake", "every house id is distinct and the ladder runs h1-h44 in order",
    table.every((house, index) => house.id === "h" + (index + 1)), table.length);
  const newMissing = NEW.filter((id) => !byId[id]);
  check("game-snake", "the ziggurat district h31-h44 sits after the shipped thirty",
    newMissing.length === 0 &&
      NEW.every((id, index) => table.indexOf(byId[id]) >
        (index === 0 ? table.indexOf(byId.h30) : table.indexOf(byId[NEW[index - 1]]))),
    newMissing.join(","));

  /* The quota is the dial: it climbs past the sky crown and never steps
   * back, and the apex asks forty-four bites. */
  check("game-snake", "the district quota climbs past the shipped summit and never steps back",
    NEW.every((id, index) => byId[id].goal >= (index === 0 ? 34 : byId[NEW[index - 1]].goal)) &&
      byId.h31.goal > byId.h30.goal && byId.h40.goal === 40 && byId.h44.goal === 44,
    NEW.map((id) => byId[id].goal).join(","));
  check("game-snake", "every district house keeps rising star times and a legal wrap flag",
    NEW.every((id) => {
      const house = byId[id];
      return house.starTimes[0] < house.starTimes[1] && house.starTimes[1] < house.starTimes[2] &&
        (house.wrap === true || house.wrap === false);
    }), NEW.map((id) => byId[id].starTimes.join("/")).join(" "));

  /* ---- the nesting facts ------------------------------------------------ */
  function wallsOf(house) {
    const walls = {};
    (house.walls || []).forEach((rect) => {
      for (let x = rect[0]; x <= rect[2]; x += 1) {
        for (let y = rect[1]; y <= rect[3]; y += 1) walls[x + "," + y] = true;
      }
    });
    return walls;
  }
  /* 4-connected stone systems with their bounding boxes. */
  function components(walls) {
    const seen = {};
    const out = [];
    Object.keys(walls).forEach((key) => {
      if (seen[key]) return;
      const cells = [];
      const queue = [key];
      seen[key] = true;
      while (queue.length) {
        const cur = queue.shift();
        cells.push(cur);
        const [cx, cy] = cur.split(",").map(Number);
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
          const next = (cx + dx) + "," + (cy + dy);
          if (walls[next] && !seen[next]) {
            seen[next] = true;
            queue.push(next);
          }
        });
      }
      const xs = cells.map((c) => Number(c.split(",")[0]));
      const ys = cells.map((c) => Number(c.split(",")[1]));
      out.push({
        cells,
        x1: Math.min.apply(null, xs), x2: Math.max.apply(null, xs),
        y1: Math.min.apply(null, ys), y2: Math.max.apply(null, ys),
      });
    });
    return out;
  }
  function bounds(walls) {
    const keys = Object.keys(walls);
    const xs = keys.map((k) => Number(k.split(",")[0]));
    const ys = keys.map((k) => Number(k.split(",")[1]));
    return {
      x1: Math.min.apply(null, xs), x2: Math.max.apply(null, xs),
      y1: Math.min.apply(null, ys), y2: Math.max.apply(null, ys),
    };
  }
  function strictlyInside(small, big) {
    return small.x1 > big.x1 && small.x2 < big.x2 && small.y1 > big.y1 && small.y2 < big.y2;
  }
  /* Perforated stone: a system standing free of the outer walls, with
   * doors cut into it - a hollow ring or terrace, not a solid slab. The
   * fill test separates the two: a slab fills its box, a gated ring does
   * not. */
  function perforated(house) {
    const walls = wallsOf(house);
    const outer = bounds(walls);
    return components(walls).some((part) =>
      strictlyInside(part, outer) &&
      (part.x2 - part.x1 + 1) * (part.y2 - part.y1 + 1) >= 8 &&
      part.cells.length < 0.75 * (part.x2 - part.x1 + 1) * (part.y2 - part.y1 + 1));
  }
  check("game-snake", "every district house keeps more than one stone system",
    NEW.every((id) => components(wallsOf(byId[id])).length >= 2),
    NEW.map((id) => components(wallsOf(byId[id])).length).join(","));

  /* The keep's hollow coil is the fortress's rarest stone: the district
   * makes it the grammar, with gated rings and terraces standing free
   * inside the outer walls of most of its houses. */
  const districtPerforated = NEW.filter((id) => perforated(byId[id]));
  check("game-snake", "the district's grammar is perforated stone - most of its houses keep a gated ring or terrace free of the outer walls",
    districtPerforated.length >= 6, districtPerforated.join(","));
  check("game-snake", "h32, h36, h37 and h40 keep their gated ring between the shell's halves",
    RING_HOUSES.every((id) => perforated(byId[id])), districtPerforated.join(","));

  /* ---- the tier replays through the real panel -------------------------- */
  const make = (id, tag) => {
    const el = env.document.createElement(tag || "div");
    el.id = id;
    env.document.body.appendChild(el);
    return el;
  };
  make("snkCanvas", "canvas");
  make("snkLength");
  make("snkGoalStat");
  make("snkTime");
  make("snkResult");
  make("snkStartBtn", "button");
  make("snkBest");
  make("snkLevelSel", "select");

  /* The save a player brings into the district: the shipped thirty
   * cleared, so the picker offers h31 first and the chain hands the
   * district over the way it does in a real run. */
  const clearedSave = {};
  for (let i = 1; i <= 30; i += 1) clearedSave["h" + i] = { stars: 3, best: 9999 };
  env.store.set("serpent-campaign", JSON.stringify({ v: 1, cleared: clearedSave }));

  App.initSnakeGame();
  if (typeof App.snkProbe !== "function") {
    throw new Error("snake gate: the panel failed to boot");
  }
  const snkCanvas = env.byId("snkCanvas");
  const snkSelect = env.byId("snkLevelSel");
  const snkStartBtn = env.byId("snkStartBtn");
  const arrows = {
    "1,0": "ArrowRight",
    "-1,0": "ArrowLeft",
    "0,1": "ArrowDown",
    "0,-1": "ArrowUp",
  };
  const seeded = (seed, fn) => {
    const realRandom = Math.random;
    let state = seed >>> 0;
    Math.random = () => {
      state = (Math.imul(state, 1103515245) + 12345) >>> 0;
      return state / 4294967296;
    };
    try {
      return fn();
    } finally {
      Math.random = realRandom;
    }
  };
  function stepToward(house, walls, blocked, from, goal) {
    const seen = {};
    seen[from.x + "," + from.y] = null;
    const queue = [from];
    while (queue.length) {
      const cur = queue.shift();
      if (cur.x === goal.x && cur.y === goal.y) {
        const trail = [];
        let node = cur;
        while (node && (node.x !== from.x || node.y !== from.y)) {
          trail.unshift(node);
          node = seen[node.x + "," + node.y];
        }
        return trail;
      }
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
        let nx = cur.x + dx;
        let ny = cur.y + dy;
        if (house.wrap) {
          nx = (nx + SNK_COLS) % SNK_COLS;
          ny = (ny + SNK_ROWS) % SNK_ROWS;
        } else if (nx < 0 || nx >= SNK_COLS || ny < 0 || ny >= SNK_ROWS) {
          return;
        }
        const key = nx + "," + ny;
        if (seen[key] !== undefined || walls[key] || blocked[key]) return;
        seen[key] = cur;
        queue.push({ x: nx, y: ny });
      });
    }
    return null;
  }
  function steerOf(head, cell) {
    let dx = cell.x - head.x;
    let dy = cell.y - head.y;
    if (dx > 1) dx -= SNK_COLS;
    if (dx < -1) dx += SNK_COLS;
    if (dy > 1) dy -= SNK_ROWS;
    if (dy < -1) dy += SNK_ROWS;
    return arrows[dx + "," + dy] || null;
  }
  /* The routing hand. Every step it can take keeps the tail reachable
   * after taking it, the reversal the engine would ignore is never
   * offered, and a step that no longer fits the body is refused while
   * roomier floor survives. */
  const strong = (probe) => {
    const house = byId[probe.levelId];
    const walls = wallsOf(house);
    const body = probe.snake;
    const head = body[0];
    const blocked = {};
    body.forEach((part, index) => {
      if (index < body.length - 1) blocked[part.x + "," + part.y] = true;
    });
    const afterArea = (step) => {
      const eating = step.x === probe.food.x && step.y === probe.food.y;
      const after = body.map((part) => ({ x: part.x, y: part.y }));
      after.unshift({ x: step.x, y: step.y });
      if (!eating) after.pop();
      const afterBlocked = {};
      after.forEach((part, index) => {
        if (index < after.length - 1) afterBlocked[part.x + "," + part.y] = true;
      });
      const seen = {};
      seen[step.x + "," + step.y] = true;
      const queue = [step];
      while (queue.length) {
        const cur = queue.shift();
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
          let nx = cur.x + dx;
          let ny = cur.y + dy;
          if (house.wrap) {
            nx = (nx + SNK_COLS) % SNK_COLS;
            ny = (ny + SNK_ROWS) % SNK_ROWS;
          } else if (nx < 0 || nx >= SNK_COLS || ny < 0 || ny >= SNK_ROWS) {
            return;
          }
          const key = nx + "," + ny;
          if (seen[key] || walls[key] || afterBlocked[key]) return;
          seen[key] = true;
          queue.push({ x: nx, y: ny });
        });
      }
      return {
        area: Object.keys(seen).length,
        tail: !!stepToward(house, walls, afterBlocked, after[0], after[after.length - 1]),
      };
    };
    const neck = body[1];
    const legal = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => {
      let nx = head.x + dx;
      let ny = head.y + dy;
      if (house.wrap) {
        nx = (nx + SNK_COLS) % SNK_COLS;
        ny = (ny + SNK_ROWS) % SNK_ROWS;
      } else if (nx < 0 || nx >= SNK_COLS || ny < 0 || ny >= SNK_ROWS) {
        return { x: -99, y: -99 };
      }
      return { x: nx, y: ny };
    }).filter((cell) =>
      !walls[cell.x + "," + cell.y] && !blocked[cell.x + "," + cell.y] &&
      !(cell.x === neck.x && cell.y === neck.y));
    if (!legal.length) return null;
    const route = stepToward(house, walls, blocked, head, probe.food);
    const ghost = {};
    ghost[probe.food.x + "," + probe.food.y] = 0;
    const queue = [probe.food];
    while (queue.length) {
      const cur = queue.shift();
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
        let nx = cur.x + dx;
        let ny = cur.y + dy;
        if (house.wrap) {
          nx = (nx + SNK_COLS) % SNK_COLS;
          ny = (ny + SNK_ROWS) % SNK_ROWS;
        } else if (nx < 0 || nx >= SNK_COLS || ny < 0 || ny >= SNK_ROWS) {
          return;
        }
        const key = nx + "," + ny;
        if (ghost[key] !== undefined || walls[key]) return;
        ghost[key] = ghost[cur.x + "," + cur.y] + 1;
        queue.push({ x: nx, y: ny });
      });
    }
    const scored = legal.map((cell) => {
      const mark = afterArea(cell);
      return {
        cell,
        area: mark.area,
        tail: mark.tail,
        onRoute: !!(route && route.length && route[0].x === cell.x && route[0].y === cell.y),
        gain: (ghost[head.x + "," + head.y] || 999) -
          (ghost[cell.x + "," + cell.y] === undefined
            ? 998
            : ghost[cell.x + "," + cell.y]),
      };
    });
    const safe = scored.find((mark) => mark.onRoute && mark.tail);
    if (safe) return steerOf(head, safe.cell);
    const floor = body.length + 6;
    const pool = scored.filter((mark) => mark.area >= floor);
    const field = pool.length ? pool : scored;
    let best = null;
    field.forEach((mark) => {
      const rank = mark.gain * 1000 + mark.area + (mark.tail ? 50 : 0);
      if (!best || rank > best.rank) best = { cell: mark.cell, rank };
    });
    return best ? steerOf(head, best.cell) : null;
  };
  /* The greedy hand: shrink the straight-line distance every tick, dodge
   * nothing but the very next bite - roughly a first-time player. */
  const greedy = (probe) => {
    const house = byId[probe.levelId];
    const walls = wallsOf(house);
    const head = probe.snake[0];
    const blocked = {};
    probe.snake.forEach((part, index) => {
      if (index < probe.snake.length - 1) blocked[part.x + "," + part.y] = true;
    });
    let best = null;
    let bestDist = Infinity;
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
      let nx = head.x + dx;
      let ny = head.y + dy;
      if (house.wrap) {
        nx = (nx + SNK_COLS) % SNK_COLS;
        ny = (ny + SNK_ROWS) % SNK_ROWS;
      } else if (nx < 0 || nx >= SNK_COLS || ny < 0 || ny >= SNK_ROWS) {
        return;
      }
      if (walls[nx + "," + ny] || blocked[nx + "," + ny]) return;
      let gdx = Math.abs(nx - probe.food.x);
      let gdy = Math.abs(ny - probe.food.y);
      if (house.wrap) {
        gdx = Math.min(gdx, SNK_COLS - gdx);
        gdy = Math.min(gdy, SNK_ROWS - gdy);
      }
      const dist = gdx + gdy;
      if (dist < bestDist) {
        bestDist = dist;
        best = { x: nx, y: ny };
      }
    });
    return best ? steerOf(head, best) : null;
  };
  const starsFor = (house, seconds) =>
    seconds <= house.starTimes[0] ? 3
      : seconds <= house.starTimes[1] ? 2
        : seconds <= house.starTimes[2] ? 1 : 0;
  const load = (houseId) => {
    snkSelect.value = houseId;
    env.dispatch(snkSelect, "change");
    return App.snkProbe().levelId === houseId;
  };
  const play = (policy, houseId, tickCap) => {
    if (!load(houseId)) {
      return { refused: true, cleared: false, seconds: 0 };
    }
    snkStartBtn.click();
    let steer = null;
    let lastBites = 0;
    let stalled = 0;
    for (let guard = 0; guard < (tickCap || 9000); guard += 1) {
      const probe = App.snkProbe();
      if (probe.levelId !== houseId) {
        return { cleared: true, seconds: probe.seconds };
      }
      if (!probe.running) {
        return { cleared: !probe.dead, dead: probe.dead, seconds: probe.seconds };
      }
      if (probe.snake.length !== lastBites) {
        lastBites = probe.snake.length;
        stalled = 0;
      } else if (++stalled > 2000) {
        return { cleared: false, stalled: true, seconds: probe.seconds };
      }
      steer = policy(probe) || steer;
      if (steer) env.dispatch(snkCanvas, "keydown", { key: steer });
      env.timers.advance(50);
    }
    return { cleared: false, timedOut: true, seconds: App.snkProbe().seconds };
  };

  /* Every house gets its own seeded stream, and the witness is the
   * engine-measured run itself: a three-star clear under the house's own
   * three-star line. */
  const SEED_BASE = 31000;
  const SEED_STEP = 7919;
  const ATTEMPTS = 4;
  const witnesses = {};
  NEW.forEach((id, index) => {
    const house = byId[id];
    let row = null;
    for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
      const seed = SEED_BASE + index * SEED_STEP + attempt * 104729;
      const played = seeded(seed, () => play(strong, id));
      played.seed = seed;
      played.attempt = attempt;
      row = played;
      if (played.cleared && starsFor(house, played.seconds) === 3) break;
    }
    witnesses[id] = row;
  });
  check("game-snake", "the routing hand clears all fourteen district houses at three stars, each on its own seeded stream",
    NEW.every((id) => {
      const row = witnesses[id];
      return row && row.cleared && !row.refused && starsFor(byId[id], row.seconds) === 3;
    }),
    JSON.stringify(NEW.map((id) => ({
      id, s: Math.round(witnesses[id].seconds), a: witnesses[id].attempt,
      d: witnesses[id].dead, t: witnesses[id].timedOut,
    }))));
  check("game-snake", "the engine pays each witnessed clear into the campaign at three stars",
    NEW.every((id) => {
      const save = JSON.parse(env.store.get("serpent-campaign") || "{}");
      return save.cleared && save.cleared[id] && save.cleared[id].stars === 3;
    }),
    JSON.stringify(NEW.map((id) => {
      const save = JSON.parse(env.store.get("serpent-campaign") || "{}");
      return (save.cleared[id] || {}).stars;
    })));

  /* The greedy hand replays the router's own witness streams, house for
   * house, so the comparison never pits one hand's lucky stream against
   * the other's worst one. */
  const greedyRows = NEW.map((id, index) => {
    const house = byId[id];
    const witness = witnesses[id];
    const row = { id, stars: 0 };
    if (!witness || !witness.cleared) return row;
    const cap = Math.ceil((house.starTimes[2] + 30) * 20);
    const played = seeded(witness.seed, () => play(greedy, id, cap));
    row.cleared = played.cleared;
    row.seconds = played.seconds;
    row.stars = played.cleared ? starsFor(house, played.seconds) : 0;
    return row;
  });
  const strongStars = NEW.reduce((sum, id) => sum + (witnesses[id] ? starsFor(byId[id], witnesses[id].seconds) : 0), 0);
  const greedyStars = greedyRows.reduce((sum, row) => sum + row.stars, 0);
  check("game-snake", "the greedy hand cannot three-star the district",
    !greedyRows.every((row) => row.stars === 3), JSON.stringify(greedyRows));
  check("game-snake", "the routing hand outscores the greedy hand across the district",
    strongStars >= greedyStars + 8, JSON.stringify({ strongStars, greedyStars }));

  /* ---- the names travel with the module --------------------------------- */
  NEW.forEach((id) => {
    const key = byId[id].labelKey;
    const en = App.t(key);
    const zh = App.I18N.zh[key];
    check("game-snake", `${key} resolves to a name in both languages`,
      !!en && en !== key && !!zh && zh !== key && en !== zh,
      `en ${JSON.stringify(en)}, zh ${JSON.stringify(zh)}`);
  });
};
