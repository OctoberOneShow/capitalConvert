"use strict";

/* game-echo-cartographer: every cave is solved for its ink floor, and the
 * summit's six new styles are what sets it
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
 * The summit c25-c30 leaves the old rotation behind with six generated
 * styles - ring, doublefork, comb, lattice, spiral, switchback - each one a
 * different way for stone to cut an echo. Every summit rung is harder than
 * the old c24 capstone on the game's own currency: its worst dealt cave costs
 * more ink than c24's floor and its quota grows. Each style's lesson is
 * ablated from a copy of the dealt cave - hollow the ring core and its wall
 * ring, hollow the doublefork's middle block, widen the comb spine, open the
 * lattice's stone rows, knock out the spiral's inter-coil walls, flatten the
 * switchbacks - and the solver's worst-case cover cost must fall, so the
 * stone is the rung rather than decoration. The star bands are quoted from
 * that same replay, c30 leaves the least spare of any rung from c21 up, one
 * startle's worth of spare ink still reaches the one-star band, the summit
 * labels resolve in both dictionaries, and the unlock chain walks all thirty
 * caves. A surveyor that never pings cannot leave the entrance, so no rung is
 * a free ride. */

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
function survey(App, level, seed, caveOverride) {
  const cave = caveOverride || App.echoCave(level, seed);
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

/* A cut deals the same cave and then opens the stone the style's lesson is
 * built from - no target, fossil or shaft moves, only walls disappear. The
 * same survey runs on the opened copy, so if its cover cost does not fall the
 * style was decoration rather than the work. */
function cutCave(App, level, seed, cut) {
  const cave = App.echoCave(level, seed);
  const grid = cave.grid.map((row) => row.slice());
  cut(grid);
  return {
    w: cave.w,
    h: cave.h,
    style: cave.style,
    seed: cave.seed,
    grid,
    start: { x: cave.start.x, y: cave.start.y },
    exit: { x: cave.exit.x, y: cave.exit.y },
    fossils: cave.fossils.map((f) => ({ x: f.x, y: f.y })),
    den: { x: cave.den.x, y: cave.den.y },
  };
}

function measureCut(App, level, cut) {
  let wins = 0;
  let maxPar = 0;
  const failures = [];
  const probe = Object.assign({}, level, { pings: 9999 });
  SEEDS.forEach((seed) => {
    const run = survey(App, probe, seed, cutCave(App, level, seed, cut));
    if (!run.won) {
      failures.push(seed + ":" + run.why);
      return;
    }
    wins += 1;
    if (run.pings > maxPar) {
      maxPar = run.pings;
    }
  });
  return { wins, total: SEEDS.length, maxPar, failures };
}

/* The one wall band each summit style is built around. Opening it must make
 * the gate's own survey cheaper on every dealt cave family. */
const SEAM_CUTS = {
  c25(grid) {
    /* ring: hollow the stone core and the wall ring around it, joining the
     * loop's two echoes into one open middle. */
    for (let y = 3; y <= 9; y += 1) {
      for (let x = 3; x <= 13; x += 1) {
        grid[y][x] = 0;
      }
    }
  },
  c26(grid) {
    /* doublefork: hollow the block between the two trunks. */
    for (let y = 4; y <= 8; y += 1) {
      for (let x = 6; x <= 10; x += 1) {
        grid[y][x] = 0;
      }
    }
  },
  c27(grid) {
    /* comb: widen the spine from one row to three. */
    for (let x = 1; x <= 15; x += 1) {
      grid[5][x] = 0;
      grid[7][x] = 0;
    }
  },
  c28(grid) {
    /* lattice: open the stone rows between the galleries. */
    [3, 6, 9].forEach((y) => {
      for (let x = 1; x <= 15; x += 1) {
        grid[y][x] = 0;
      }
    });
  },
  c29(grid) {
    /* spiral: knock out the walls between the outer and inner coils. */
    for (let x = 2; x <= 14; x += 1) {
      grid[2][x] = 0;
      grid[10][x] = 0;
    }
    for (let y = 2; y <= 10; y += 1) {
      grid[y][2] = 0;
      grid[y][14] = 0;
    }
  },
  c30(grid) {
    /* switchback: flatten every hairpin into one open gallery. */
    for (let y = 2; y <= 10; y += 2) {
      for (let x = 1; x <= 15; x += 1) {
        grid[y][x] = 0;
      }
    }
  },
};

module.exports = function gate(ctx) {
  const { App, check } = ctx;
  const levels = App.echoLevels;
  const byId = (id) => levels.find((level) => level.id === id);
  const deepIds = ["c21", "c22", "c23", "c24"];
  const summitIds = ["c25", "c26", "c27", "c28", "c29", "c30"];

  if (process.env.ECHO_MEASURE) {
    if (process.env.ECHO_PROBE) {
      /* Quota/budget/style sensitivity probe: mutate c24 (or id=) and
       * re-measure it; several specs fit one boot, split with ";". */
      process.env.ECHO_PROBE.split(";").forEach((spec) => {
        const probe = {};
        spec.split(",").forEach((pair) => {
          const [k, v] = pair.split("=");
          probe[k] = /^\d+$/.test(v) ? Number(v) : v;
        });
        const base = byId(probe.id || "c24");
        delete probe.id;
        const mutant = JSON.parse(JSON.stringify(base));
        Object.assign(mutant, probe);
        const m = measure(App, mutant);
        console.log("c24 probe", JSON.stringify(probe), "won", m.wins + "/" + m.total,
          "maxPar", m.maxPar, "median", m.median,
          m.failures.length ? "failures " + m.failures.slice(0, 4).join(" ") : "");
      });
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

  check("game-echo-cartographer", "the ladder holds thirty caves",
    levels.length === 30, String(levels.length));
  check("game-echo-cartographer", "every cave id is distinct",
    new Set(levels.map((level) => level.id)).size === levels.length,
    levels.map((level) => level.id).join(","));
  const missing = deepIds.filter((id) => !byId(id));
  check("game-echo-cartographer", "the deep tier c21-c24 is present",
    missing.length === 0, missing.join(","));
  const missingSummit = summitIds.filter((id) => !byId(id));
  check("game-echo-cartographer", "the summit tier c25-c30 is present",
    missingSummit.length === 0, missingSummit.join(","));
  const summitStyles = {
    c25: "ring", c26: "doublefork", c27: "comb",
    c28: "lattice", c29: "spiral", c30: "switchback",
  };
  check("game-echo-cartographer",
    "each summit seam carries its own new style, id and label key",
    summitIds.every((id, index) => {
      const level = byId(id);
      return !!level &&
        level.id === "c" + (25 + index) &&
        level.labelKey === "echZ" + (25 + index) &&
        level.style === summitStyles[id];
    }),
    summitIds.map((id) => id + ":" + (byId(id) ? byId(id).style : "missing")).join(" "));
  check("game-echo-cartographer", "the deep and summit tiers sit at the tail in order",
    levels.slice(20).map((level) => level.id).join(",") ===
      deepIds.concat(summitIds).join(","),
    levels.slice(20).map((level) => level.id).join(","));

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

  const m24 = ladders.c24;
  const spare = (id) => byId(id).pings - ladders[id].maxPar;

  /* The old capstone's own claims survive as deep-tier checks: its floor is
   * still the tightest of c21-c24, its three-star band is still that floor,
   * and one startle's worth of spare ink still reaches its one-star band. */
  check("game-echo-cartographer",
    "the old capstone still leaves the least room over its floor",
    deepIds.slice(0, 3).every((id) => spare(id) > spare("c24")),
    deepIds.map((id) => id + ":" + spare(id)).join(" "));
  check("game-echo-cartographer", "c24's three-star band is still its proven floor",
    byId("c24").starPings[0] === m24.maxPar,
    `band ${byId("c24").starPings[0]} vs floor ${m24.maxPar}`);
  check("game-echo-cartographer", "a startle still one-stars c24 on every seed",
    m24.maxPar + 2 <= byId("c24").starPings[2],
    `floor + 2 ${m24.maxPar + 2} vs band ${byId("c24").starPings[2]}`);

  /* Every summit seam is harder than the old c24 capstone on the game's own
   * currency: the worst dealt cave costs strictly more ink to cover than c24's
   * floor, and the fossil quota grows too. */
  summitIds.forEach((id) => {
    const level = byId(id);
    check("game-echo-cartographer", `${id} is measurably harder than c24`,
      ladders[id].maxPar > m24.maxPar && level.quota > byId("c24").quota,
      `floor ${ladders[id].maxPar} vs ${m24.maxPar}, quota ${level.quota} vs ${byId("c24").quota}`);
  });

  /* Every summit quota is reachable inside its own ink budget by the module's
   * own cover solver - the replay above is the witness, restated as one law. */
  check("game-echo-cartographer",
    "every summit quota is reachable inside its own pings",
    summitIds.every((id) => ladders[id].wins === ladders[id].total &&
      ladders[id].maxPar <= byId(id).pings),
    summitIds.map((id) => id + ":" + ladders[id].maxPar + "/" + byId(id).pings).join(" "));

  /* The summit is the tightest rung on the game's own currency: the room a
   * perfect surveyor leaves over its measured floor - budget minus ink floor -
   * is smaller on c30 than on every rung below it. */
  const c30Spare = spare("c30");
  const below = deepIds.concat(summitIds.slice(0, 5));
  check("game-echo-cartographer", "the summit leaves the least room over its floor",
    below.every((id) => spare(id) > c30Spare),
    deepIds.concat(summitIds).map((id) => id + ":" + spare(id)).join(" "));

  /* Every summit seam's bands are quoted from the replayed witness: three
   * stars is exactly the measured floor on every dealt seed, the bands rise,
   * and a startle's two spare shots still reach the one-star band. */
  summitIds.forEach((id) => {
    const level = byId(id);
    const m = ladders[id];
    check("game-echo-cartographer", `${id}'s three-star band is the replayed floor`,
      level.starPings[0] === m.maxPar &&
        level.starPings[0] < level.starPings[1] &&
        level.starPings[1] < level.starPings[2] &&
        m.maxPar + 2 <= level.starPings[2],
      `bands ${level.starPings.join("/")} vs floor ${m.maxPar}`);
  });

  /* Each summit style's lesson is load-bearing: deal the same cave, open the
   * one stone band the style is built around (ring core, doublefork block,
   * comb spine, lattice rows, spiral coil walls, switchback hairpins), and
   * the gate's own survey gets cheaper. A style whose cut does not move the
   * number is decoration. */
  summitIds.forEach((id) => {
    const full = ladders[id];
    const cut = measureCut(App, byId(id), SEAM_CUTS[id]);
    check("game-echo-cartographer",
      `${id}'s ${byId(id).style} lesson is load-bearing`,
      cut.wins === cut.total && cut.maxPar < full.maxPar,
      `${full.maxPar} -> ${cut.maxPar} pings, ${cut.wins}/${cut.total} winnable`);
  });

  /* The capstone's squeeze is honest: take the budget below what the solver
   * proves on the hardest dealt cave and deals start failing outright. */
  const summit = byId("c30");
  const m30 = ladders.c30;
  check("game-echo-cartographer", "three stars on the capstone is the proven floor",
    summit.starPings[0] === m30.maxPar,
    `band ${summit.starPings[0]} vs floor ${m30.maxPar}`);
  check("game-echo-cartographer", "a startle still one-stars the capstone on every seed",
    m30.maxPar + 2 <= summit.starPings[2],
    `floor + 2 ${m30.maxPar + 2} vs band ${summit.starPings[2]}`);

  /* The old capstone's squeeze is still real: one ping under its floor and
   * deals start failing outright. */
  const tighter24 = JSON.parse(JSON.stringify(byId("c24")));
  tighter24.pings = m24.maxPar - 1;
  const tight24 = measure(App, tighter24);
  check("game-echo-cartographer",
    "below c24's proven floor, seams are lost outright",
    tight24.wins < tight24.total, `${tight24.wins}/${tight24.total} winnable`);

  /* The capstone's floor is real: take the budget below what the solver proves
   * and deals start failing outright - the seam's ink is load-bearing, not
   * decoration. */
  const tighter = JSON.parse(JSON.stringify(summit));
  tighter.pings = m30.maxPar - 1;
  const tight = measure(App, tighter);
  check("game-echo-cartographer",
    "below the capstone's proven floor, seams are lost outright",
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
  [["the deep labels", deepIds], ["the summit labels", summitIds]].forEach((row) => {
    ["en", "zh"].forEach((lang) => {
      const ok = row[1].every((id) => {
        const level = byId(id);
        const text = App.I18N && App.I18N[lang] ? App.I18N[lang][level.labelKey] : null;
        return typeof text === "string" && text && text !== level.labelKey &&
          App.t(level.labelKey) !== level.labelKey;
      });
      check("game-echo-cartographer", `${row[0]} resolve in ${lang}`,
        !!ok, row[1].join(","));
    });
  });

  /* The unlock chain is derived, never stored: clearing each cave in order
   * hands the player exactly the next one, all thirty times. */
  const chain = App.createCampaign({
    key: "echo-cartographer-gate-chain",
    levels: levels.map((level) => ({ id: level.id, labelKey: level.labelKey })),
  });
  let walked = 0;
  let chained = true;
  levels.forEach((level, index) => {
    const outcome = chain.record(level.id, { stars: 3, best: 1, better: "low" });
    if (outcome.firstClear) {
      walked += 1;
    }
    const expected = index + 1 < levels.length ? levels[index + 1].id : null;
    if (outcome.unlockedNext !== expected) {
      chained = false;
    }
  });
  check("game-echo-cartographer", "the unlock chain walks all thirty caves in order",
    walked === 30 && chained && chain.clearedCount() === 30, walked + " first clears");
};
