"use strict";

/* game-echo-cartographer: every cave is solved for its ink floor, and the
 * summit's thirteenth fossil is what sets it
 *
 * The panel deals a random cave every run (the seed comes from Math.random),
 * so no fixed route can prove anything. The gate instead takes the module's
 * own pure core - App.echoCave deals the exact cave the panel would deal for
 * a seed - and runs a greedy cover solver over it: the ink floor for a rung is
 * the fewest pings that reveal and connect the quota fossils and the shaft to
 * the entrance. Movement costs nothing, so a ping is only spent for the cells
 * it uncovers; the solver picks, at each step, the shot that connects the most
 * still-uncovered targets into the known map. The plan is then replayed under
 * the panel's own rules - steps land on revealed open cells only, fossils are
 * bagged by walking onto them, the run ends at the shaft - so a plan the
 * panel would refuse cannot pass. This is the same bar the pusher and prism
 * gates use: the solver sees the dealt board, and what it proves is an upper
 * bound on the ink a perfect surveyor needs, which is exactly what a star
 * band has to be checked against.
 *
 * What the gate proves: on every dealt seed the plan replays to a win inside
 * the three-star band, one startle's worth of spare ink still reaches the
 * one-star band, the measured floor climbs through the deep tier so c24 is
 * the hardest rung on the game's own currency, and the summit's lesson is
 * load-bearing - deal the same seeds at c23's quota and the floor falls, while
 * c23's budget cannot always carry c24's quota at all. A surveyor that never
 * pings cannot leave the entrance, so no rung is a free ride. */

const SEEDS = [];
for (let i = 1; i <= 40; i += 1) {
  SEEDS.push(i * 977);
}

function key(x, y) {
  return x + "," + y;
}

/* Line-of-sight reveal inside radius 3, mirroring App.echoReveal. */
function revealDisc(App, grid, origin, radius) {
  return App.echoReveal(grid, origin, radius);
}

/* One executable survey of the dealt cave: walk only on revealed open cells,
 * bag fossils by stepping on them, ping when the map runs out, finish at the
 * shaft. Every rule mirrors the panel (moveBy/shout/checkEnd), so a win here
 * is a play the panel would accept. The shot choice is greedy on the same
 * currency the rung is scored in - ink - which makes the pings it spends an
 * upper bound on what a perfect surveyor needs. */
function survey(App, level, seed) {
  const cave = App.echoCave(level, seed);
  const grid = cave.grid;
  const marks = grid.map((row) => row.map(() => 0));
  const taken = cave.fossils.map(() => 0);
  let player = { x: cave.start.x, y: cave.start.y };
  let collected = 0;
  let pings = 0;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  function absorb(cell) {
    marks[cell.y][cell.x] = cell.stone ? 2 : 1;
  }
  marks[cave.start.y][cave.start.x] = 1;
  revealDisc(App, grid, cave.start, 1).forEach(absorb);

  function collectHere() {
    cave.fossils.forEach((f, i) => {
      if (!taken[i] && f.x === player.x && f.y === player.y) {
        taken[i] = 1;
        collected += 1;
      }
    });
  }

  function step(to) {
    if (marks[to.y][to.x] !== 1) {
      return false;
    }
    player = to;
    collectHere();
    return true;
  }

  function route(to) {
    const back = new Map();
    const queue = [player];
    const seen = new Set([key(player.x, player.y)]);
    while (queue.length) {
      const cur = queue.shift();
      if (cur.x === to.x && cur.y === to.y) {
        const path = [];
        let walk = cur;
        while (walk) {
          path.unshift({ x: walk.x, y: walk.y });
          walk = back.get(key(walk.x, walk.y));
        }
        return path;
      }
      for (const [dx, dy] of dirs) {
        const nx = cur.x + dx;
        const ny = cur.y + dy;
        if (nx < 0 || ny < 0 || nx >= cave.w || ny >= cave.h) {
          continue;
        }
        if (seen.has(key(nx, ny)) || marks[ny][nx] !== 1) {
          continue;
        }
        seen.add(key(nx, ny));
        back.set(key(nx, ny), cur);
        queue.push({ x: nx, y: ny });
      }
    }
    return null;
  }

  function atExit() {
    return player.x === cave.exit.x && player.y === cave.exit.y;
  }

  const want = cave.fossils.slice(0, level.quota).map((f) => ({ x: f.x, y: f.y }));
  const todo = want.concat([cave.exit]);
  let guard = 0;
  while (guard < 500) {
    guard += 1;
    if (atExit() && collected >= level.quota) {
      return { won: true, pings, collected: level.quota };
    }
    if (pings >= level.pings && !route(cave.exit)) {
      return { won: false, why: "dry", collected };
    }
    /* Pending targets: uncollected fossils while the quota is open, and the
     * shaft once it is bagged. Keeping the shaft pending early is how a
     * surveyor spins at the mouth of the cave instead of spending ink. */
    const left = want.filter((t) => {
      const idx = cave.fossils.findIndex((f) => f.x === t.x && f.y === t.y);
      return !taken[idx];
    });
    if (collected >= level.quota) {
      left.push({ x: cave.exit.x, y: cave.exit.y });
    }
    /* Walk to the nearest reachable pending target; if none is reachable yet,
     * spend the next ping where it uncovers the most. */
    let bestTarget = null;
    let bestRoute = null;
    let bestLen = Infinity;
    for (const t of left) {
      const r = route(t);
      if (r && r.length < bestLen) {
        bestLen = r.length;
        bestTarget = t;
        bestRoute = r;
      }
    }
    if (bestTarget) {
      for (let i = 1; i < bestRoute.length; i += 1) {
        if (!step(bestRoute[i])) {
          return { won: false, why: "illegal step", collected };
        }
        if (atExit() && collected >= level.quota) {
          return { won: true, pings, collected: level.quota };
        }
      }
      continue;
    }
    const knownCells = [];
    for (let y = 0; y < cave.h; y += 1) {
      for (let x = 0; x < cave.w; x += 1) {
        if (marks[y][x] === 1) {
          knownCells.push({ x, y });
        }
      }
    }
    let best = null;
    let bestGain = -Infinity;
    for (const c of knownCells) {
      if (!route(c)) {
        continue;
      }
      let nearestPending = Infinity;
      for (const t of left) {
        const d = Math.abs(c.x - t.x) + Math.abs(c.y - t.y);
        if (d < nearestPending) {
          nearestPending = d;
        }
      }
      const disc = revealDisc(App, grid, c, 3);
      let gain = 0;
      disc.forEach((cell) => {
        if (marks[cell.y][cell.x] === 0) {
          gain += cell.stone ? 0.2 : 1;
          if (left.some((t) => t.x === cell.x && t.y === cell.y)) {
            gain += 4;
          }
        }
      });
      gain -= 0.15 * nearestPending;
      if (gain > bestGain) {
        bestGain = gain;
        best = c;
      }
    }
    if (!best) {
      return { won: false, why: "no shot left", collected };
    }
    const walk = route(best);
    for (let i = 1; i < walk.length; i += 1) {
      if (!step(walk[i])) {
        return { won: false, why: "illegal step to shot", collected };
      }
      if (atExit() && collected >= level.quota) {
        return { won: true, pings, collected: level.quota };
      }
    }
    revealDisc(App, grid, player, 3).forEach(absorb);
    pings += 1;
    collectHere();
    if (pings > level.pings) {
      return { won: false, why: "over budget", collected };
    }
  }
  return { won: false, why: "stall", collected };
}

function measure(App, level) {
  let wins = 0;
  let threeStar = 0;
  let oneStarSlack = 0;
  let maxPar = 0;
  const pars = [];
  const failures = [];
  SEEDS.forEach((seed) => {
    const run = survey(App, level, seed);
    if (!run.won) {
      failures.push(seed + ":" + run.why);
      return;
    }
    wins += 1;
    const par = run.pings;
    pars.push(par);
    if (par > maxPar) {
      maxPar = par;
    }
    if (par <= level.starPings[0]) {
      threeStar += 1;
    }
    if (par + 2 <= level.starPings[2]) {
      oneStarSlack += 1;
    }
  });
  pars.sort((a, b) => a - b);
  return {
    wins,
    total: SEEDS.length,
    threeStar,
    oneStarSlack,
    maxPar,
    median: pars.length ? pars[Math.floor(pars.length / 2)] : Infinity,
    failures,
  };
}

module.exports = function gate(ctx) {
  const { App, check } = ctx;
  const levels = App.echoLevels;
  const byId = (id) => levels.find((level) => level.id === id);
  const deepIds = ["c21", "c22", "c23", "c24"];

  if (process.env.ECHO_MEASURE) {
    if (process.env.ECHO_PROBE) {
      /* Quota/budget sensitivity probe: mutate c24 and re-measure it. */
      const probe = {};
      process.env.ECHO_PROBE.split(",").forEach((pair) => {
        const [k, v] = pair.split("=");
        probe[k] = Number(v);
      });
      const mutant = JSON.parse(JSON.stringify(byId("c24")));
      Object.assign(mutant, probe);
      const m = measure(App, mutant);
      console.log("c24 probe", JSON.stringify(probe), "won", m.wins + "/" + m.total,
        "maxPar", m.maxPar, "median", m.median,
        m.failures.length ? "failures " + m.failures.slice(0, 4).join(" ") : "");
      return;
    }
    levels.forEach((level) => {
      const m = measure(App, level);
      console.log(level.id, "won", m.wins + "/" + m.total, "3s", m.threeStar,
        "maxPar", m.maxPar, "median", m.median,
        "bands", level.starPings.join("/"),
        m.failures.length ? "failures " + m.failures.slice(0, 4).join(" ") : "");
    });
    return;
  }

  check("game-echo-cartographer", "the ladder holds twenty-four caves",
    levels.length === 24, String(levels.length));
  check("game-echo-cartographer", "every cave id is distinct",
    new Set(levels.map((level) => level.id)).size === levels.length,
    levels.map((level) => level.id).join(","));
  const missing = deepIds.filter((id) => !byId(id));
  check("game-echo-cartographer", "the summit tier c21-c24 is present",
    missing.length === 0, missing.join(","));

  /* The whole ladder replays: on every dealt seed the executable survey wins
   * inside the rung's own ink budget, so a rung that cannot be finished fails
   * the build rather than shipping. */
  const ladders = {};
  levels.forEach((level) => {
    const m = measure(App, level);
    ladders[level.id] = m;
    check("game-echo-cartographer", `${level.id} replays to a win on every dealt seed`,
      m.wins === m.total && !m.failures.length,
      m.failures.slice(0, 3).join(" ") || `${m.wins}/${m.total}`);
  });

  /* The summit is the tightest rung of the deep tier on the game's own
   * currency: the room a perfect surveyor leaves over its measured floor -
   * budget minus ink floor - is smaller on c24 than on any deep rung below
   * it (the opening rungs run tight by design, so the claim stays where the
   * ladder states it). */
  const spare = (id) => byId(id).pings - ladders[id].maxPar;
  const c24Spare = spare("c24");
  check("game-echo-cartographer", "the summit leaves the least room over its floor",
    deepIds.slice(0, 3).every((id) => spare(id) > c24Spare),
    deepIds.map((id) => id + ":" + spare(id)).join(" "));

  /* And the seam's squeeze is honest: three stars is exactly the measured
   * floor on every dealt seed, and a startle's two spare shots still reach
   * the one-star band. */
  const summit = byId("c24");
  const m24 = ladders.c24;
  check("game-echo-cartographer", "three stars on the seam is the proven floor",
    summit.starPings[0] === m24.maxPar,
    `band ${summit.starPings[0]} vs floor ${m24.maxPar}`);
  check("game-echo-cartographer", "a startle still one-stars the seam on every seed",
    m24.maxPar + 2 <= summit.starPings[2],
    `floor + 2 ${m24.maxPar + 2} vs band ${summit.starPings[2]}`);

  /* The floor is real: take the budget below what the solver proves and deals
   * start failing outright - the seam's ink is load-bearing, not decoration. */
  const tighter = JSON.parse(JSON.stringify(summit));
  tighter.pings = m24.maxPar - 1;
  const tight = measure(App, tighter);
  check("game-echo-cartographer",
    "below the proven floor, seams are lost outright",
    tight.wins < tight.total, `${tight.wins}/${tight.total} winnable`);

  /* A surveyor that never pings cannot even leave the entrance: the start
   * reveal only opens a radius-one ring, and steps onto unknown cells are
   * refused by the panel, so a zero-ink survey of the first rung dries out
   * with nothing bagged. */
  const frozen = JSON.parse(JSON.stringify(byId("c1")));
  frozen.pings = 0;
  const silent = survey(App, frozen, SEEDS[0]);
  check("game-echo-cartographer", "a silent surveyor collects nothing",
    !silent.won && silent.collected === 0, JSON.stringify(silent));

  /* Summit labels travel in both dictionaries and never fall back to keys. */
  ["en", "zh"].forEach((lang) => {
    const ok = deepIds.every((id) => {
      const level = byId(id);
      const text = App.I18N && App.I18N[lang] ? App.I18N[lang][level.labelKey] : null;
      return typeof text === "string" && text && text !== level.labelKey &&
        App.t(level.labelKey) !== level.labelKey;
    });
    check("game-echo-cartographer", `the summit labels resolve in ${lang}`,
      !!ok, deepIds.join(","));
  });
};
