/*
 * Elements cases (part 2).
 * Pouring, painting, challenges and persistence; reuses the panel helpers
 * from cases-elements-sim.js.
 */
"use strict";

const { createEnvironment, appSource, check, boot, adopt, seedToolDom, run, notes } = require("./lib");
const { ELEMENTS_KEY, newSim, ELEMENT_TOOLS, seedElementsDom, bootElements, elementsStore, elementsRecord, bootElementsWith, ELEMENTS_ORDER, ELEMENTS_PARS, unlockedRecord, selectChallenge, challengeOption, clickTool, pressKey, clickBrush, setSpeedTo, clickHand, paintCell, paintAcross, renderedImage, pixelAt, looksLikeFire, looksLikeWater, looksLikeEmpty, looksLikeStone, won, frameSnapshot, frameDiff, pourFlood, pourGrow, douseHedge, bootDrawer, pocket, basin } = require("./cases-elements-sim");

/* Every timed board's fence, exactly as the campaign declares it. Free play is
 * the one board with an empty list: the sandbox stays completely open. No
 * timed board's fence overlaps the place its goal is scored in, which is what
 * stops a board being won by painting the winning material straight into the
 * target: the elements have to flow, react or travel there instead. */
const POUR_ZONES = {
  free: [],
  grow: [[40, 0, 40, 54]],
  flood: [[0, 0, 79, 23]],
  extinguish: [
    [0, 0, 79, 3],
    [0, 5, 79, 9],
    [0, 11, 79, 15],
    [0, 17, 79, 21],
    [0, 23, 79, 27],
    [0, 29, 79, 33],
    [0, 35, 79, 39],
    [0, 41, 79, 45],
    [0, 47, 79, 55],
  ],
  glass: [[31, 0, 48, 50]],
  quench: [[16, 0, 63, 43]],
  thaw: [[39, 20, 43, 54]],
  spill: [[14, 43, 65, 53]],
  etch: [[28, 0, 70, 42]],
  sprout: [[39, 0, 39, 39], [36, 42, 37, 54], [41, 42, 43, 54]],
  geyser: [[6, 37, 9, 53], [71, 37, 73, 53]],
  grove: [[10, 45, 79, 55]],
};

/* Each board's clock and ink, read out of the campaign table the page declares
 * rather than copied, so a scripted run is held to the numbers on the page. */
const ELEMENTS_LIMITS = (() => {
  const table = appSource.slice(
    appSource.indexOf("var elementsChallenges = ["),
    appSource.indexOf("var elementsBasePalette"),
  );
  const found = {};
  const re = /id: "([a-z]+)",[\s\S]*?limit: (\d+),\s*budget: (\d+)/g;
  let match;
  while ((match = re.exec(table)) !== null) {
    found[match[1]] = { limit: parseFloat(match[2]), budget: parseFloat(match[3]) };
  }
  return found;
})();

/* The strokes the fence exists to refuse. Each is a body of open air the old
 * brush would have taken, or the eraser on the board's own goal material, and
 * every one of them used to be reachable in a stroke or two: water painted
 * straight into the basin, the gauge or the valley; the fire or the lava
 * deleted; the dam taken out from under the reservoir. */
const FENCE_PROBES = {
  grow: [
    { x: 30, y: 2, value: "water", why: "water painted beside the well" },
    { x: 39, y: 30, value: "empty", why: "the well's wall erased" },
  ],
  flood: [{ x: 40, y: 40, value: "water", why: "water painted inside the basin" }],
  extinguish: [
    { x: 4, y: 4, value: "empty", why: "the fire the board lit, erased" },
    { x: 40, y: 10, value: "empty", why: "a cell of hedge erased" },
  ],
  glass: [{ x: 20, y: 20, value: "sand", why: "sand poured outside the crucible" }],
  quench: [
    { x: 40, y: 54, value: "empty", why: "the lava cell erased" },
    { x: 40, y: 50, value: "water", why: "water painted over the tray" },
  ],
  thaw: [
    { x: 38, y: 44, value: "empty", why: "the dam's last layer erased" },
    { x: 50, y: 50, value: "water", why: "water painted into the valley" },
  ],
  spill: [
    { x: 5, y: 50, value: "fire", why: "fire lit outside the basin" },
    { x: 40, y: 30, value: "oil", why: "oil painted in over the basin" },
  ],
  etch: [
    { x: 40, y: 50, value: "water", why: "water painted into the roofed basin" },
    { x: 40, y: 43, value: "empty", why: "the stone roof erased" },
  ],
  sprout: [
    { x: 39, y: 53, value: "water", why: "water poured into the well below the shelf" },
    { x: 39, y: 53, value: "fire", why: "fire lit inside the well below the shelf" },
  ],
  geyser: [
    { x: 40, y: 52, value: "water", why: "water painted into the gauge" },
    { x: 40, y: 54, value: "empty", why: "the lava bed erased" },
  ],
  grove: [
    { x: 9, y: 52, value: "empty", why: "the fire the board lit, erased" },
    { x: 40, y: 30, value: "water", why: "water poured in above the timber" },
  ],
};

/* A cell inside each fence the board leaves empty and empty-able, so a paint
 * there has to land. */
const INSIDE_PROBE = {
  grow: [40, 4],
  flood: [40, 20],
  extinguish: [40, 30],
  glass: [40, 20],
  quench: [40, 43],
  thaw: [41, 30],
  spill: [20, 43],
  etch: [40, 20],
  sprout: [39, 20],
  geyser: [7, 45],
  grove: [12, 51],
};

/* The intended solution of each timed board, played through the real paint
 * path with the board's own budget, exactly as its goal text describes it.
 * Every one of them has to reach the goal inside the board's limit. */
const POUR_SOLUTIONS = {
  grow(sim) {
    /* Keep the top of the well wet: every drop falls the shaft onto the plant,
     * which drinks one cell every `growEvery` generations. */
    for (let y = 0; y <= 6; y += 1) {
      if (sim.get(40, y) === sim.empty) sim.paint(40, y, sim.water);
    }
  },
  flood(sim) {
    for (let x = 27; x <= 53; x += 1) {
      for (let y = 20; y <= 23; y += 1) {
        if (sim.get(x, y) === sim.empty) sim.paint(x, y, sim.water);
      }
    }
  },
  extinguish(sim) {
    /* Rain on the hedge where the front is walking. */
    for (let x = 6; x <= 73; x += 1) {
      if (sim.get(x, 3) === sim.empty) sim.paint(x, 3, sim.water);
    }
  },
  glass(sim) {
    for (let x = 31; x <= 48; x += 1) {
      if (sim.get(x, 50) === sim.empty) sim.paint(x, 50, sim.sand);
    }
  },
  quench(sim) {
    for (let x = 16; x <= 63; x += 1) {
      if (sim.get(x, 43) === sim.empty) sim.paint(x, 43, sim.water);
    }
  },
  thaw(sim) {
    /* Eat the cut through the dam's outer face, at a row the water can run
     * away from, one layer at a time. */
    [41, 40, 39].forEach((x) => {
      if (sim.get(x, 44) === sim.empty) sim.paint(x, 44, sim.fire);
    });
  },
  spill(sim, state) {
    /* Light the slick in a few places, then hunt what the water doused. */
    if (!state.sparked) {
      [16, 24, 32, 40, 48, 56, 64].forEach((x) => sim.paint(x, 43, sim.fire));
      state.sparked = true;
      return;
    }
    if (sim.count(sim.oil) > 0 && sim.count(sim.fire) === 0) {
      const dirs = [[0, -1], [-1, 0], [1, 0], [0, 1]];
      for (let y = 0; y < sim.rows; y += 1) {
        for (let x = 0; x < sim.cols; x += 1) {
          if (sim.get(x, y) !== sim.oil) continue;
          for (let d = 0; d < dirs.length; d += 1) {
            const nx = x + dirs[d][0];
            const ny = y + dirs[d][1];
            if (sim.get(nx, ny) === sim.empty) {
              sim.paint(nx, ny, sim.fire);
              break;
            }
          }
        }
      }
    }
  },
  etch(sim) {
    /* Acid opens the holes, then the water is poured down them. */
    const holes = [33, 38, 43, 48, 53, 58, 63];
    holes.forEach((h) => {
      if (sim.get(h, 42) === sim.empty) sim.paint(h, 42, sim.acid);
    });
    holes.forEach((h) => {
      for (let y = 38; y <= 42; y += 1) {
        if (sim.get(h, y) === sim.empty) sim.paint(h, y, sim.water);
      }
    });
  },
  sprout(sim) {
    /* Burn the shelf open from the pocket under it, then feed the well. */
    if (sim.count(sim.wood) > 0) {
      if (sim.get(36, 42) === sim.empty) sim.paint(36, 42, sim.fire);
      return;
    }
    for (let y = 0; y <= 39; y += 1) {
      if (sim.get(39, y) === sim.empty) sim.paint(39, y, sim.water);
    }
  },
  geyser(sim) {
    /* Pour down the pockets at the foot of the walls and let the steam climb,
     * rain and fill the gauge. */
    [
      [6, 9],
      [71, 73],
    ].forEach((band) => {
      for (let x = band[0]; x <= band[1]; x += 1) {
        for (let y = 37; y <= 53; y += 1) {
          if (sim.get(x, y) === sim.empty) sim.paint(x, y, sim.water);
        }
      }
    });
  },
  grove(sim) {
    /* Take the fuel out of the flames' path and soak what is left. */
    [52, 53].forEach((y) => {
      if (sim.get(12, y) === sim.wood) sim.paint(12, y, sim.empty);
    });
    for (let x = 10; x <= 75; x += 1) {
      if (sim.get(x, 51) === sim.empty) sim.paint(x, 51, sim.water);
    }
  },
};

/* Plays a board's intended solution through the real simulation, so a board
 * can be held against its own clock limit rather than an assumed one. */
function playBoard(board) {
  const sim = newSim();
  const info = ELEMENTS_LIMITS[board];
  sim.setInk(info.budget);
  sim.loadPreset(board);
  const state = {};
  let generations = 0;
  const cap = Math.max(1, info.limit) * 40;
  while (!sim.progress(board).done && generations < cap) {
    POUR_SOLUTIONS[board](sim, state);
    sim.step();
    generations += 1;
  }
  return {
    board,
    generations,
    seconds: (generations * 50) / 1000,
    done: sim.progress(board).done,
    limit: info.limit,
    inkLeft: sim.inkLeft(),
  };
}

/* A board's frame, read back cell by cell. The theme is set after boot
 * because the page's own theme init reads the system preference, and the
 * points are grid cells rather than pixels so a case reads as the board it is
 * looking at. */
function boardPixels(board, theme, points, motion) {
  const env = createEnvironment({ theme: theme, motion: motion || "full" });
  seedToolDom(env);
  seedElementsDom(env);
  env.load(appSource);
  env.domReady();
  env.setTheme(theme);
  /* Bounce through another board first: the picker ignores a change to the
   * board it is already showing, and a frame has to be drawn after the theme
   * is set for the pixels to mean anything. */
  selectChallenge(env, board === "grow" ? "flood" : "grow");
  selectChallenge(env, board);
  return points.map((point) => pixelAt(env, point[0], point[1]));
}

const samePixel = (a, b) =>
  !!a && !!b && a[0] === b[0] && a[1] === b[1] && a[2] === b[2];

run("elements-pour", () => {
  /* --- every board declares its fence, and only the sandbox has none --- */
  check(
    "elements-pour",
    "every timed board declares a pour zone and free play declares none",
    ELEMENTS_ORDER.every(
      (id) => (id === "free" ? POUR_ZONES.free.length === 0 : POUR_ZONES[id].length > 0),
    ),
  );
  ELEMENTS_ORDER.forEach((id) => {
    const sim = newSim();
    sim.loadPreset(id);
    const declared = sim
      .pourZones()
      .map((r) => [r.x0, r.y0, r.x1, r.y1])
      .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const expected = POUR_ZONES[id].slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    check(
      "elements-pour",
      `${id}: the board declares its fence exactly`,
      JSON.stringify(declared) === JSON.stringify(expected),
      JSON.stringify(declared),
    );
  });

  /* --- the strokes the fence is for are refused, and change nothing --- */
  ELEMENTS_ORDER.forEach((id) => {
    if (id === "free") return;
    FENCE_PROBES[id].forEach((probe) => {
      const sim = newSim();
      sim.loadPreset(id);
      const before = sim.hash();
      const countBefore = sim.tally()[sim.ids[probe.value]];
      const refused = sim.paint(probe.x, probe.y, sim.ids[probe.value]) === false;
      const unchanged = sim.hash() === before && sim.tally()[sim.ids[probe.value]] === countBefore;
      check(
        "elements-pour",
        `${id}: ${probe.why} is refused and changes nothing`,
        refused && unchanged && sim.progress(id).done === false,
        `${probe.value} at ${probe.x},${probe.y} -> refused=${refused} changed=${!unchanged}`,
      );
    });
  });

  /* The hedge is fenced off, but the connector the fire walks down is not:
   * the firebreak the board is designed around is still playable. */
  check(
    "elements-pour",
    "extinguish still lets the eraser cut the hedge's connector",
    (() => {
      const sim = newSim();
      sim.loadPreset("extinguish");
      const before = sim.count(sim.plant);
      const cut = sim.paint(75, 7, sim.empty);
      return cut === true && sim.count(sim.plant) === before - 1;
    })(),
  );

  /* --- and the brush still works inside the fence --------------------- */
  ELEMENTS_ORDER.forEach((id) => {
    if (id === "free") return;
    const inside = INSIDE_PROBE[id];
    const sim = newSim();
    sim.loadPreset(id);
    const before = sim.hash();
    const waterBefore = sim.count(sim.water);
    const landed = sim.paint(inside[0], inside[1], sim.water) === true;
    check(
      "elements-pour",
      `${id}: a paint inside the fence lands`,
      landed && sim.hash() !== before && sim.count(sim.water) === waterBefore + 1,
      `${inside} -> ${landed}`,
    );
  });

  /* --- a fence never covers the place the goal is scored ---------------- */
  ELEMENTS_ORDER.forEach((id) => {
    const sim = newSim();
    sim.loadPreset(id);
    const target = sim.zone();
    if (!target) return;
    const shared = sim.pourZones().filter(
      (r) =>
        r.x0 <= target.x1 && r.x1 >= target.x0 && r.y0 <= target.y1 && r.y1 >= target.y0,
    );
    check(
      "elements-pour",
      `${id}: the fence does not overlap the zone that scores the goal`,
      shared.length === 0,
      `${JSON.stringify(shared)} vs ${JSON.stringify(target)}`,
    );
  });

  /* --- free play is still the sandbox ---------------------------------- */
  check(
    "elements-pour",
    "free play takes a stroke anywhere on the board, corners included",
    (() => {
      const sim = newSim();
      sim.loadPreset("free");
      /* The three open corners take water; the two floor corners are stone
       * and refuse it; and the eraser clears the floor exactly as it used to. */
      const before = sim.count(sim.water);
      const air = [[0, 0], [79, 0], [40, 30]];
      const floor = [[0, 55], [79, 55]];
      const placed = air.filter(([x, y]) => sim.paint(x, y, sim.water)).length;
      const refused = floor.filter(([x, y]) => sim.paint(x, y, sim.water)).length;
      const stone = sim.count(sim.stone);
      const erased = sim.paint(0, 55, sim.empty);
      return (
        sim.pourZones().length === 0 &&
        placed === 3 &&
        refused === 0 &&
        erased === true &&
        sim.count(sim.water) === before + 3 &&
        sim.count(sim.stone) === stone - 1
      );
    })(),
  );

  /* --- the eraser's allowance is still capped by the board's ink ------ */
  check(
    "elements-pour",
    "the slick board rations less ink than the eraser would need to clear it",
    (() => {
      const sim = newSim();
      sim.loadPreset("spill");
      return ELEMENTS_LIMITS.spill.budget < sim.count(sim.oil);
    })(),
    `budget ${ELEMENTS_LIMITS.spill.budget} vs the slick`,
  );

  /* --- every board is still winnable by its intended solution ---------- */
  const solved = ELEMENTS_ORDER.filter((id) => id !== "free").map(playBoard);
  check(
    "elements-pour",
    "every timed board is still winnable by its intended solution inside its limit",
    solved.every((run) => run.done && run.seconds < run.limit),
    solved.map((run) => `${run.board} ${run.seconds.toFixed(2)}s/${run.limit}s`).join(", "),
  );
  check(
    "elements-pour",
    "and every one of them still clears three stars under the par table",
    solved.every((run) => run.seconds <= ELEMENTS_PARS[run.board][0]),
    solved
      .map((run) => `${run.board} ${run.seconds.toFixed(2)}s vs ${ELEMENTS_PARS[run.board][0]}s`)
      .join(", "),
  );
  /* The times the intended solutions actually took, recorded on the run so the
   * gate carries the evidence a board is still playable inside its clock. */
  notes.push(
    "elements-pour: intended solutions " +
      solved
        .map(
          (run) =>
            `${run.board} ${run.seconds.toFixed(2)}s/${run.limit}s (${run.generations} generations, ${run.inkLeft} ink left)`,
        )
        .join(", "),
  );

  /* The two boards whose clock is a wall rather than a nudge: neither can be
   * scored before the plant has climbed all 54 cells of its well, so their
   * scripted runs have to sit above that floor. That is what proves the fence
   * handed back no shortcut. */
  const climbFloor = (54 * 8 * 50) / 1000;
  check(
    "elements-pour",
    "Grow and Sprout still pay the plant's whole climb",
    solved.every((run) => run.board !== "grow" || run.seconds >= climbFloor - 0.05) &&
      solved.every((run) => run.board !== "sprout" || run.seconds >= climbFloor - 0.05),
    solved
      .filter((run) => run.board === "grow" || run.board === "sprout")
      .map((run) => `${run.board} ${run.seconds.toFixed(2)}s vs floor ${climbFloor}s`)
      .join(", "),
  );

  /* --- the fence is drawn where the brush may work --------------------- */
  /* Quench: the air over the tray is inside the fence, the tray itself is not,
   * so the two empty cells must come out in two different colours in both
   * themes. Nothing about the tint animates, so motion off cannot lose it. */
  const TINT_IN = [40, 20]; /* quench: the air over the tray, in the fence */
  const TINT_OUT = [40, 50]; /* quench: the tray's own air, outside it */
  check(
    "elements-pour",
    "the pour zone is tinted on the canvas in both themes, motion on or off",
    [["dark", "full"], ["light", "full"], ["dark", "off"], ["light", "off"]].every(
      (mode) => {
        const pixels = boardPixels("quench", mode[0], [TINT_IN, TINT_OUT], mode[1]);
        return !samePixel(pixels[0], pixels[1]);
      },
    ),
    JSON.stringify({
      dark: boardPixels("quench", "dark", [TINT_IN, TINT_OUT]),
      light: boardPixels("quench", "light", [TINT_IN, TINT_OUT]),
      darkMotionOff: boardPixels("quench", "dark", [TINT_IN, TINT_OUT], "off"),
      lightMotionOff: boardPixels("quench", "light", [TINT_IN, TINT_OUT], "off"),
    }),
  );
  check(
    "elements-pour",
    "free play has no tint at all, because it has no fence",
    ["dark", "light"].every((theme) => {
      /* The sandbox's empty air has to match a cell that is provably outside
       * the fence on the board that has one, in the same theme: the untinted
       * empty colour. */
      const free = boardPixels("free", theme, [[40, 30]])[0];
      const untinted = boardPixels("quench", theme, [TINT_OUT])[0];
      return samePixel(free, untinted);
    }),
    JSON.stringify({
      dark: boardPixels("free", "dark", [[40, 30]]),
      light: boardPixels("free", "light", [[40, 30]]),
      untintedDark: boardPixels("quench", "dark", [TINT_OUT]),
      untintedLight: boardPixels("quench", "light", [TINT_OUT]),
    }),
  );

  /* --- the fence is words as well as pixels ---------------------------- */
  check(
    "elements-pour",
    "a fenced board says so on its goal line, free play does not",
    (() => {
      const env = bootElements({});
      const freeGoal = env.byId("elementsGoal").textContent;
      selectChallenge(env, "grow");
      const fencedGoal = env.byId("elementsGoal").textContent;
      const fencedResult = env.byId("elementsResult").textContent;
      return (
        freeGoal.indexOf("Pour inside") === -1 &&
        fencedGoal.indexOf("Pour inside") !== -1 &&
        fencedGoal === fencedResult
      );
    })(),
  );

  /* --- a refused stroke on an armed board still starts nothing --------- */
  const armedFence = bootElements({});
  selectChallenge(armedFence, "grow");
  clickTool(armedFence, "water");
  const armedBefore = frameSnapshot(armedFence);
  paintCell(armedFence, 20, 20); /* open air, outside the well */
  check(
    "elements-pour",
    "a stroke the fence refuses leaves an armed board frozen, uncharged and unrecorded",
    frameDiff(armedBefore, frameSnapshot(armedFence)) === 0 &&
      armedFence.byId("elementsTime").textContent === "60.0s" &&
      armedFence.byId("elementsResult").textContent.indexOf("Pour inside") !== -1 &&
      armedFence.byId("elementsUndoBtn").disabled === true &&
      !armedFence.store.has(ELEMENTS_KEY),
    `${armedFence.byId("elementsTime").textContent} / ${armedFence.byId("elementsResult").textContent}`,
  );
  paintCell(armedFence, 40, 0); /* inside the well */
  armedFence.timers.advance(500);
  check(
    "elements-pour",
    "and a stroke inside it starts the run exactly as it always did",
    /Clock running/.test(armedFence.byId("elementsResult").textContent) &&
      armedFence.byId("elementsTime").textContent === "59.5s",
    `${armedFence.byId("elementsTime").textContent} / ${armedFence.byId("elementsResult").textContent}`,
  );

  /* --- the fence holds on the keyboard path too ------------------------ */
  const keys = bootElements({});
  selectChallenge(keys, "grow");
  clickTool(keys, "water");
  keys.dispatch(keys.byId("elementsCanvas"), "focus", {});
  const keysBefore = frameSnapshot(keys);
  for (let i = 0; i < 10; i += 1) pressKey(keys, "ArrowLeft");
  pressKey(keys, " ");
  check(
    "elements-pour",
    "the keyboard cursor cannot place anything outside the fence either",
    frameDiff(keysBefore, frameSnapshot(keys)) === 0 &&
      keys.byId("elementsTime").textContent === "60.0s" &&
      keys.byId("elementsUndoBtn").disabled === true,
    keys.byId("elementsTime").textContent,
  );
  for (let i = 0; i < 10; i += 1) pressKey(keys, "ArrowRight");
  pressKey(keys, " ");
  keys.timers.advance(500);
  check(
    "elements-pour",
    "and inside it the keyboard places the element and starts the run",
    /Clock running/.test(keys.byId("elementsResult").textContent) &&
      keys.byId("elementsTime").textContent === "59.5s" &&
      keys.byId("elementsUndoBtn").disabled === false,
    `${keys.byId("elementsTime").textContent} / ${keys.byId("elementsResult").textContent}`,
  );
});

/* 47. the panel: chrome, palette and clock ------------------------------ */
run("elements-ui", () => {
  const env = bootDrawer({});
  env.byId("gameToggleBtn").click();
  check(
    "elements-ui",
    "the drawer wiring boots without an init error",
    !env.initError,
    env.initError && env.initError.message,
  );
  const tab = env.byId("gameTabElements");
  check("elements-ui", "the sixth tab exists", !!tab);
  check(
    "elements-ui",
    "nothing ticks before the sandbox is shown",
    env.timers.pendingIntervals() === 0,
    String(env.timers.pendingIntervals()),
  );

  tab.click();
  check(
    "elements-ui",
    "selecting Elements shows its panel and hides the others",
    env.byId("gamePanelElements").hidden === false &&
      tab.getAttribute("aria-selected") === "true" &&
      env.byId("gamePanelTyping").hidden === true &&
      env.byId("gameTabTyping").getAttribute("aria-selected") === "false",
  );
  check(
    "elements-ui",
    "the sandbox ticks while its panel is up",
    env.timers.pendingIntervals() === 1,
    String(env.timers.pendingIntervals()),
  );

  const panel = env.byId("gamePanelElements");
  check(
    "elements-ui",
    "the palette is seventeen real buttons",
    panel.querySelectorAll(".elements-tool").length === 17 &&
      panel.querySelectorAll('.elements-tool[data-element]').length === 17 &&
      ELEMENT_TOOLS.every(
        (name) =>
          panel.querySelectorAll('.elements-tool[data-element="' + name + '"]')
            .length === 1,
      ),
  );
  check(
    "elements-ui",
    "the canvas is 320x224 internal pixels",
    env.byId("elementsCanvas").width === 320 &&
      env.byId("elementsCanvas").height === 224 &&
      env.byId("elementsCanvas").getAttribute("tabindex") === "0",
  );
  check(
    "elements-ui",
    "the picker offers free play plus all eleven campaign boards",
    env.byId("elementsChallenge").childNodes.length === 12,
    String(env.byId("elementsChallenge").childNodes.length),
  );
  check(
    "elements-ui",
    "the board opens on free play",
    /Free/i.test(challengeOption(env, "free")),
    challengeOption(env, "free"),
  );
  check(
    "elements-ui",
    "the goal is written out as its own text",
    /Free play/.test(env.byId("elementsGoal").textContent),
    env.byId("elementsGoal").textContent,
  );
  check(
    "elements-ui",
    "the goal is announced on the status line",
    env.byId("elementsResult").textContent === env.byId("elementsGoal").textContent,
    env.byId("elementsResult").textContent,
  );
  check(
    "elements-ui",
    "the time HUD starts at zero",
    env.byId("elementsTime").textContent === "0.0s" &&
      env.byId("elementsTimeLabel").textContent === "Time",
    env.byId("elementsTime").textContent,
  );
  check(
    "elements-ui",
    "free play shows no goal fraction",
    env.byId("elementsProgress").textContent === "\u2014",
    env.byId("elementsProgress").textContent,
  );
  check(
    "elements-ui",
    "free play starts on the sand brush",
    env.byId("elementsToolSand").getAttribute("aria-pressed") === "true" &&
      env.byId("elementsToolWater").getAttribute("aria-pressed") === "false",
  );
  check(
    "elements-ui",
    "free play opens on the base palette and locks the rest",
    panel.querySelectorAll(".elements-tool").length === 17 &&
      ELEMENT_TOOLS.slice(0, 6).every(
        (name) =>
          env.byId("elementsTool" + name.charAt(0).toUpperCase() + name.slice(1))
            .disabled === false,
      ) &&
      ELEMENT_TOOLS.slice(6).every(
        (name) =>
          env.byId("elementsTool" + name.charAt(0).toUpperCase() + name.slice(1))
            .disabled === true,
      ),
  );
  check(
    "elements-ui",
    "the best line starts empty",
    env.byId("elementsBest").textContent === "No best yet",
    env.byId("elementsBest").textContent,
  );
  check(
    "elements-ui",
    "the description counts what is on the board",
    /\d+ Sand/.test(env.byId("elementsDescription").textContent),
    env.byId("elementsDescription").textContent,
  );
  check(
    "elements-ui",
    "clicking a palette button picks that element",
    (() => {
      env.byId("elementsToolPlant").click();
      return (
        env.byId("elementsToolPlant").getAttribute("aria-pressed") === "true" &&
        env.byId("elementsToolSand").getAttribute("aria-pressed") === "false"
      );
    })(),
  );

  env.timers.advance(1000);
  check(
    "elements-ui",
    "the free-play clock counts the time it actually ran",
    env.byId("elementsTime").textContent === "1.0s",
    env.byId("elementsTime").textContent,
  );
  env.timers.advance(1500);
  check(
    "elements-ui",
    "and keeps counting",
    env.byId("elementsTime").textContent === "2.5s",
    env.byId("elementsTime").textContent,
  );

  /* A challenge gates the palette and runs its own countdown. */
  selectChallenge(env, "grow");
  check(
    "elements-ui",
    "switching boards loads that goal and its own clock",
    /shaft/.test(env.byId("elementsGoal").textContent) &&
      env.byId("elementsTime").textContent === "60.0s" &&
      env.byId("elementsTimeLabel").textContent === "Left",
    `${env.byId("elementsGoal").textContent} / ${env.byId("elementsTime").textContent}`,
  );
  check(
    "elements-ui",
    "Grow offers water and the eraser only",
    env.byId("elementsToolWater").disabled === false &&
      env.byId("elementsToolEmpty").disabled === false &&
      env.byId("elementsToolSand").disabled === true &&
      env.byId("elementsToolStone").disabled === true &&
      env.byId("elementsToolPlant").disabled === true &&
      env.byId("elementsToolFire").disabled === true,
  );
  check(
    "elements-ui",
    "a gated element cannot be selected",
    (() => {
      env.byId("elementsToolFire").click();
      return (
        env.byId("elementsToolFire").getAttribute("aria-pressed") === "false" &&
        env.byId("elementsToolWater").getAttribute("aria-pressed") === "true"
      );
    })(),
  );
  check(
    "elements-ui",
    "the goal readout tracks the plant",
    env.byId("elementsProgress").textContent === "2/56",
    env.byId("elementsProgress").textContent,
  );
  check(
    "elements-ui",
    "the primary button offers Start for a challenge",
    env.byId("elementsStartBtn").querySelector("[data-i18n]").textContent === "Start",
    env.byId("elementsStartBtn").querySelector("[data-i18n]").textContent,
  );
  env.byId("elementsStartBtn").click();
  check(
    "elements-ui",
    "starting announces the running clock",
    /Clock running/.test(env.byId("elementsResult").textContent),
    env.byId("elementsResult").textContent,
  );
  env.timers.advance(1000);
  check(
    "elements-ui",
    "the challenge clock counts down",
    env.byId("elementsTime").textContent === "59.0s",
    env.byId("elementsTime").textContent,
  );
  check(
    "elements-ui",
    "the plant starts climbing on its own",
    parseInt(env.byId("elementsProgress").textContent, 10) > 2,
    env.byId("elementsProgress").textContent,
  );

  env.byId("elementsResetBtn").click();
  check(
    "elements-ui",
    "reset restores the opening board and the full clock",
    env.byId("elementsProgress").textContent === "2/56" &&
      env.byId("elementsTime").textContent === "60.0s" &&
      env.timers.pendingIntervals() === 1,
    `${env.byId("elementsProgress").textContent} / ${env.byId("elementsTime").textContent}`,
  );
  selectChallenge(env, "free");
  check(
    "elements-ui",
    "free play relabels the clock and offers a new board",
    env.byId("elementsTimeLabel").textContent === "Time" &&
      env.byId("elementsStartBtn").querySelector("[data-i18n]").textContent === "New Game",
    env.byId("elementsStartBtn").querySelector("[data-i18n]").textContent,
  );
});

/* 48. painting, rendering and the keyboard path -------------------------- */
run("elements-paint", () => {
  const env = bootDrawer({});
  env.byId("gameToggleBtn").click();
  env.byId("gameTabElements").click();
  const canvas = env.byId("elementsCanvas");

  const image = renderedImage(env);
  check(
    "elements-paint",
    "a frame is one RGBA quad per cell at grid resolution",
    !!image && image.width === 80 && image.height === 56 && image.data.length === 80 * 56 * 4,
    image ? `${image.width}x${image.height} ${image.data.length}` : "no image",
  );
  check(
    "elements-paint",
    "and it is blitted scaled onto the 320x224 canvas",
    (() => {
      const ctx = canvas.getContext("2d");
      return !!ctx.lastSource && ctx.lastSource.width === 80 && ctx.draws > 0;
    })(),
  );
  check(
    "elements-paint",
    "the stone floor is painted, the sky is not",
    looksLikeStone(pixelAt(env, 40, 55)) && looksLikeEmpty(pixelAt(env, 2, 2)),
    `${JSON.stringify(pixelAt(env, 40, 55))} / ${JSON.stringify(pixelAt(env, 2, 2))}`,
  );

  /* Pointer painting, mapped through a CSS-scaled rect. */
  canvas.getBoundingClientRect = () => ({
    left: 100,
    top: 50,
    width: 640,
    height: 448,
    right: 740,
    bottom: 498,
    x: 100,
    y: 50,
  });
  clickTool(env, "fire");
  paintCell(env, 10, 20);
  check(
    "elements-paint",
    "a press paints the cell under the pointer, through the CSS scale",
    looksLikeFire(pixelAt(env, 10, 20)),
    JSON.stringify(pixelAt(env, 10, 20)),
  );
  check(
    "elements-paint",
    "the brush covers the cells around it",
    looksLikeFire(pixelAt(env, 8, 18)) && looksLikeFire(pixelAt(env, 12, 22)),
  );
  check(
    "elements-paint",
    "and nothing further out",
    looksLikeEmpty(pixelAt(env, 4, 20)) && looksLikeEmpty(pixelAt(env, 16, 20)),
  );
  check(
    "elements-paint",
    "the description follows the board",
    /\d+ Fire/.test(env.byId("elementsDescription").textContent),
    env.byId("elementsDescription").textContent,
  );

  /* The fallback path: a canvas with no layout rect at all. */
  canvas.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    right: 0,
    bottom: 0,
    x: 0,
    y: 0,
  });
  clickTool(env, "water");
  paintAcross(env, 4, 20, 30);
  check(
    "elements-paint",
    "a drag leaves a line, not a dotted trail",
    looksLikeWater(pixelAt(env, 4, 30)) &&
      looksLikeWater(pixelAt(env, 12, 30)) &&
      looksLikeWater(pixelAt(env, 20, 30)),
    `${JSON.stringify(pixelAt(env, 4, 30))} ${JSON.stringify(pixelAt(env, 12, 30))}`,
  );
  check(
    "elements-paint",
    "a release stops the paint",
    (() => {
      env.dispatch(canvas, "pointermove", { clientX: 40, clientY: 160, pointerId: 1 });
      return looksLikeEmpty(pixelAt(env, 10, 40));
    })(),
  );

  /* Keyboard: pick, move, place, erase. */
  env.dispatch(canvas, "focus", {});
  check(
    "elements-paint",
    "focus reveals the keyboard cursor",
    env.byId("elementsCursor").hidden === false,
  );
  const startLeft = env.byId("elementsCursor").style.left;
  pressKey(env, "ArrowRight");
  check(
    "elements-paint",
    "an arrow key moves the cursor exactly one cell",
    env.byId("elementsCursor").style.left === (41 / 80) * 100 + "%" &&
      env.byId("elementsCursor").style.left !== startLeft,
    env.byId("elementsCursor").style.left,
  );
  pressKey(env, "ArrowUp");
  check(
    "elements-paint",
    "and the cursor has two axes",
    env.byId("elementsCursor").style.top === (27 / 56) * 100 + "%",
    env.byId("elementsCursor").style.top,
  );
  pressKey(env, "6");
  check(
    "elements-paint",
    "a number key picks the matching element",
    env.byId("elementsToolFire").getAttribute("aria-pressed") === "true",
  );
  pressKey(env, " ");
  check(
    "elements-paint",
    "Space places the chosen element at the cursor",
    looksLikeFire(pixelAt(env, 41, 27)),
    JSON.stringify(pixelAt(env, 41, 27)),
  );
  pressKey(env, "1");
  check(
    "elements-paint",
    "the eraser is on 1",
    env.byId("elementsToolEmpty").getAttribute("aria-pressed") === "true",
  );
  pressKey(env, "Enter");
  check(
    "elements-paint",
    "Enter erases at the cursor too",
    looksLikeEmpty(pixelAt(env, 41, 27)),
    JSON.stringify(pixelAt(env, 41, 27)),
  );
  env.dispatch(canvas, "blur", {});
  check(
    "elements-paint",
    "blurring hides the keyboard cursor again",
    env.byId("elementsCursor").hidden === true,
  );
  check(
    "elements-paint",
    "the cursor never leaves the grid",
    (() => {
      for (let i = 0; i < 100; i += 1) {
        pressKey(env, "ArrowLeft");
        pressKey(env, "ArrowUp");
      }
      return (
        env.byId("elementsCursor").style.left === "0%" &&
        env.byId("elementsCursor").style.top === "0%"
      );
    })(),
    `${env.byId("elementsCursor").style.left} / ${env.byId("elementsCursor").style.top}`,
  );
});

/* 49. each challenge can be played to its win through the real UI -------- */
run("elements-challenges", () => {
  /* Grow: pour water down the well. */
  const grow = bootElements({});
  selectChallenge(grow, "grow");
  grow.byId("elementsStartBtn").click();
  check(
    "elements-challenges",
    "Grow starts un-won with the pool it was given",
    !won(grow) && grow.byId("elementsProgress").textContent === "2/56",
    grow.byId("elementsProgress").textContent,
  );
  check(
    "elements-challenges",
    "Grow is won by pouring water down the well",
    pourGrow(grow),
    grow.byId("elementsResult").textContent,
  );
  check(
    "elements-challenges",
    "the win reports the time it took",
    /Goal met in \d+\.\ds!/.test(grow.byId("elementsResult").textContent),
    grow.byId("elementsResult").textContent,
  );
  check(
    "elements-challenges",
    "the first clear is announced as a best",
    /New best!/.test(grow.byId("elementsResult").textContent),
    grow.byId("elementsResult").textContent,
  );
  check(
    "elements-challenges",
    "the win stops every timer",
    grow.timers.pendingIntervals() === 0 && grow.timers.pendingTimeouts() === 0,
  );
  check(
    "elements-challenges",
    "the winning board is frozen on the winning frame",
    (() => {
      const before = grow.byId("elementsProgress").textContent;
      grow.timers.advance(5000);
      return grow.byId("elementsProgress").textContent === before;
    })(),
  );
  check(
    "elements-challenges",
    "Try Again reloads the board and rewinds the clock",
    (() => {
      grow.byId("elementsStartBtn").click();
      return (
        grow.byId("elementsProgress").textContent === "2/56" &&
        grow.byId("elementsTime").textContent === "60.0s" &&
        grow.timers.pendingIntervals() === 1
      );
    })(),
    `${grow.byId("elementsProgress").textContent} / ${grow.byId("elementsTime").textContent}`,
  );
  check(
    "elements-challenges",
    "Grow can run out of time when the water is not topped up",
    (() => {
      grow.timers.advance(60000);
      return /Out of time/.test(grow.byId("elementsResult").textContent) &&
        grow.timers.pendingIntervals() === 0;
    })(),
    grow.byId("elementsResult").textContent,
  );

  /* Flood: pour water in above the rim. */
  const flood = bootElements({});
  selectChallenge(flood, "flood");
  check(
    "elements-challenges",
    "Flood keeps stone and water but not sand",
    flood.byId("elementsToolStone").disabled === false &&
      flood.byId("elementsToolWater").disabled === false &&
      flood.byId("elementsToolSand").disabled === true,
  );
  check(
    "elements-challenges",
    "the basin starts empty",
    flood.byId("elementsProgress").textContent === "0/158",
    flood.byId("elementsProgress").textContent,
  );
  flood.byId("elementsStartBtn").click();
  clickTool(flood, "water");
  paintCell(flood, 40, 48);
  check(
    "elements-challenges",
    "water cannot be painted straight into the zone",
    flood.byId("elementsProgress").textContent === "0/158",
    flood.byId("elementsProgress").textContent,
  );
  check(
    "elements-challenges",
    "Flood is won by pouring water in from above the rim",
    pourFlood(flood),
    flood.byId("elementsResult").textContent,
  );
  check(
    "elements-challenges",
    "the basin reports the water it holds",
    parseInt(flood.byId("elementsProgress").textContent, 10) >= 158,
    flood.byId("elementsProgress").textContent,
  );

  /* Extinguish: douse the creeping fire. */
  const fire = bootElements({});
  selectChallenge(fire, "extinguish");
  check(
    "elements-challenges",
    "Extinguish counts the fires rather than filling a fraction",
    fire.byId("elementsProgress").textContent === "1",
    fire.byId("elementsProgress").textContent,
  );
  check(
    "elements-challenges",
    "Extinguish offers water and the eraser only",
    fire.byId("elementsToolWater").disabled === false &&
      fire.byId("elementsToolPlant").disabled === true &&
      fire.byId("elementsToolFire").disabled === true,
  );
  fire.byId("elementsStartBtn").click();
  check(
    "elements-challenges",
    "the hedge is not already out",
    !won(fire) && parseInt(fire.byId("elementsProgress").textContent, 10) >= 1,
  );
  fire.timers.advance(3000);
  check(
    "elements-challenges",
    "the fire front keeps walking the hedge",
    parseInt(fire.byId("elementsProgress").textContent, 10) > 1,
    fire.byId("elementsProgress").textContent,
  );
  check(
    "elements-challenges",
    "Extinguish is won by dousing the flames",
    douseHedge(fire),
    fire.byId("elementsResult").textContent,
  );
  check(
    "elements-challenges",
    "no fire is left on the winning board",
    fire.byId("elementsProgress").textContent === "0",
    fire.byId("elementsProgress").textContent,
  );

  /* Free play has no goal at all. */
  const free = bootElements({});
  clickTool(free, "fire");
  free.byId("elementsStartBtn").click();
  free.timers.advance(5000);
  check(
    "elements-challenges",
    "free play has no win condition",
    !won(free) && free.byId("elementsProgress").textContent === "\u2014",
  );
  check(
    "elements-challenges",
    "free play never stores a result",
    free.store.get(ELEMENTS_KEY) === undefined,
    String(free.store.get(ELEMENTS_KEY)),
  );
});

/* 50. best times and clears persist ------------------------------------- */
run("elements-persistence", () => {
  const store = new Map();
  const first = bootElements({ store });
  selectChallenge(first, "flood");
  check(
    "elements-persistence",
    "the first attempt has no best yet",
    first.byId("elementsBest").textContent === "No best yet",
    first.byId("elementsBest").textContent,
  );
  first.byId("elementsStartBtn").click();
  check("elements-persistence", "the challenge can be cleared", pourFlood(first));
  const saved = elementsStore(first);
  check(
    "elements-persistence",
    "the win is stored under its own versioned key",
    !!saved && saved.v === 2 && first.store.has(ELEMENTS_KEY),
    String(first.store.get(ELEMENTS_KEY)),
  );
  check(
    "elements-persistence",
    "the cleared challenge is recorded",
    saved.cleared.flood === true,
    JSON.stringify(saved.cleared),
  );
  check(
    "elements-persistence",
    "the winning time is recorded as its best",
    saved.bests.flood > 0 && saved.bests.flood < 60,
    String(saved.bests.flood),
  );
  check(
    "elements-persistence",
    "the panel shows the new best",
    /Best \d/.test(first.byId("elementsBest").textContent),
    first.byId("elementsBest").textContent,
  );
  check(
    "elements-persistence",
    "the picker ticks the cleared challenge",
    /\u2713/.test(challengeOption(first, "flood")),
    challengeOption(first, "flood"),
  );
  check(
    "elements-persistence",
    "free play is never recorded as cleared",
    saved.cleared.free === undefined && saved.bests.free === undefined,
    JSON.stringify(saved),
  );

  const reload = bootElements({
    store: new Map([[ELEMENTS_KEY, first.store.get(ELEMENTS_KEY)]]),
  });
  selectChallenge(reload, "flood");
  check(
    "elements-persistence",
    "the best survives a reload",
    reload.byId("elementsBest").textContent === first.byId("elementsBest").textContent,
    `${reload.byId("elementsBest").textContent} vs ${first.byId("elementsBest").textContent}`,
  );
  check(
    "elements-persistence",
    "the cleared tick survives a reload",
    /\u2713/.test(challengeOption(reload, "flood")),
    challengeOption(reload, "flood"),
  );

  /* A slower clear keeps the older best but still counts as a clear. */
  const slower = bootElementsWith(elementsRecord(1, { flood: true }, { flood: 0.2 }));
  selectChallenge(slower, "flood");
  check(
    "elements-persistence",
    "the seeded best is shown on its own challenge",
    /Best 0.2s/.test(slower.byId("elementsBest").textContent),
    slower.byId("elementsBest").textContent,
  );
  slower.byId("elementsStartBtn").click();
  const slowerWon = pourFlood(slower);
  check(
    "elements-persistence",
    "a slower clear still wins",
    slowerWon && slower.byId("elementsProgress").textContent !== "0/158",
  );
  check(
    "elements-persistence",
    "a slower clear does not replace the best",
    elementsStore(slower).bests.flood === 0.2 &&
      !/New best/.test(slower.byId("elementsResult").textContent),
    slower.store.get(ELEMENTS_KEY),
  );
  check(
    "elements-persistence",
    "a slower clear keeps the challenge marked as cleared",
    elementsStore(slower).cleared.flood === true,
  );

  /* A best on one challenge is not a best on another. */
  check(
    "elements-persistence",
    "each challenge keeps its own best",
    (() => {
      selectChallenge(slower, "grow");
      return /No best yet/.test(slower.byId("elementsBest").textContent);
    })(),
    slower.byId("elementsBest").textContent,
  );
});

/* 51. hostile and foreign stored values --------------------------------- */
run("elements-corrupt", () => {
  [
    "",
    "   ",
    "12.34",
    "not json",
    "[]",
    "null",
    "true",
    '"a string"',
    "-1",
    "{}",
    '{"v":1}',
    '{"v":1,"cleared":"x","bests":"x"}',
    '{"v":1,"cleared":{"flood":true,"free":true,"nope":true},"bests":{"flood":-5}}',
    '{"v":1,"cleared":{},"bests":{"flood":"fast"}}',
    '{"v":1,"cleared":{},"bests":{"flood":999999}}',
    '{"v":1,"cleared":[],"bests":[]}',
    '{"v":9,"cleared":{"flood":true},"bests":{"flood":2}}',
    '{"v":1,"cleared":{"__proto__":true},"bests":{"__proto__":1,"grow":3}}',
    JSON.stringify({ v: 1, cleared: { flood: true }, bests: { flood: 3 }, junk: [1, 2] }),
  ].forEach((raw) => {
    let threw = null;
    let env = null;
    try {
      env = bootElementsWith(raw);
    } catch (error) {
      threw = error;
    }
    const label = JSON.stringify(raw).slice(0, 34);
    check("elements-corrupt", `${label} does not throw`, !threw, threw ? threw.message : "");
    check(
      "elements-corrupt",
      `${label} still boots a playable board`,
      !threw &&
        !!env &&
        env.byId("elementsChallenge").childNodes.length === 12 &&
        env.byId("elementsGoal").textContent.length > 0 &&
        env.byId("elementsCanvas").width === 320 &&
        env.byId("elementsToolSand").disabled === false,
      !env ? "no env" : "",
    );
  });

  const cleaned = bootElementsWith(
    '{"v":1,"cleared":{"flood":true,"free":true},"bests":{"flood":-5,"free":3,"grow":12.5}}',
  );
  check(
    "elements-corrupt",
    "a negative best is dropped rather than shown",
    (() => {
      selectChallenge(cleaned, "flood");
      return /No best yet/.test(cleaned.byId("elementsBest").textContent);
    })(),
    cleaned.byId("elementsBest").textContent,
  );
  check(
    "elements-corrupt",
    "a foreign id is never ticked as cleared",
    !/\u2713/.test(challengeOption(cleaned, "free")),
    challengeOption(cleaned, "free"),
  );
  check(
    "elements-corrupt",
    "a real clear is still ticked",
    /\u2713/.test(challengeOption(cleaned, "flood")),
    challengeOption(cleaned, "flood"),
  );
  check(
    "elements-corrupt",
    "the surviving best is shown on its own challenge",
    (() => {
      selectChallenge(cleaned, "grow");
      return /Best 12.5s/.test(cleaned.byId("elementsBest").textContent);
    })(),
    cleaned.byId("elementsBest").textContent,
  );
  check(
    "elements-corrupt",
    "a foreign store version is rewritten once in the current shape",
    (() => {
      const old = bootElementsWith('{"v":0,"cleared":{"flood":true},"bests":{"flood":2}}');
      const written = elementsStore(old);
      return written.v === 2 && written.cleared.flood === true && written.bests.flood === 2;
    })(),
  );
  check(
    "elements-corrupt",
    "a corrupt record is replaced by a clean one",
    (() => {
      const broken = bootElementsWith("not json at all");
      const written = elementsStore(broken);
      return written.v === 2 && JSON.stringify(written.cleared) === "{}";
    })(),
  );
  check(
    "elements-corrupt",
    "a run on top of corrupt data still works and stores cleanly",
    (() => {
      const env = bootElementsWith("{ not json");
      selectChallenge(env, "extinguish");
      env.byId("elementsStartBtn").click();
      const cleared = douseHedge(env);
      const written = elementsStore(env);
      return cleared && written.v === 2 && written.cleared.extinguish === true && written.bests.extinguish > 0;
    })(),
  );
  check(
    "elements-corrupt",
    "a storage read that throws does not break a run",
    (() => {
      const env = createEnvironment({});
      seedElementsDom(env);
      const readItem = env.localStorage.getItem.bind(env.localStorage);
      env.localStorage.getItem = (key) => {
        if (key === ELEMENTS_KEY) throw new Error("storage blocked");
        return readItem(key);
      };
      env.load(appSource);
      env.domReady();
      selectChallenge(env, "extinguish");
      env.byId("elementsStartBtn").click();
      return douseHedge(env) && elementsStore(env).cleared.extinguish === true;
    })(),
  );
  check(
    "elements-corrupt",
    "a storage write that throws still clears the challenge on screen",
    (() => {
      const env = bootElementsWith("{}");
      const writeItem = env.localStorage.setItem.bind(env.localStorage);
      env.localStorage.setItem = (key, value) => {
        if (key === ELEMENTS_KEY) throw new Error("storage blocked");
        return writeItem(key, value);
      };
      selectChallenge(env, "extinguish");
      env.byId("elementsStartBtn").click();
      const cleared = douseHedge(env);
      const written = JSON.parse(env.store.get(ELEMENTS_KEY));
      return cleared && written.cleared.extinguish === undefined;
    })(),
  );
});

/* 52. switching away, closing and hiding are clean ---------------------- */
run("elements-cleanup", () => {
  const env = bootDrawer({});
  env.byId("gameToggleBtn").click();
  env.byId("gameTabElements").click();
  check(
    "elements-cleanup",
    "the sandbox runs while its panel is up",
    env.timers.pendingIntervals() === 1 && env.timers.pendingTimeouts() === 0,
    String(env.timers.pendingIntervals()),
  );
  env.timers.advance(1000);
  const clock = env.byId("elementsTime").textContent;
  check("elements-cleanup", "the clock is running", clock === "1.0s", clock);

  env.byId("gameTabMemory").click();
  check(
    "elements-cleanup",
    "leaving the tab stops the sandbox",
    env.timers.pendingIntervals() === 0 && env.timers.pendingTimeouts() === 0,
    String(env.timers.pendingIntervals()),
  );
  const idleClock = env.byId("elementsTime").textContent;
  env.timers.advance(10000);
  check(
    "elements-cleanup",
    "and it does not step behind another game",
    env.byId("elementsTime").textContent === idleClock,
    env.byId("elementsTime").textContent + " vs " + idleClock + " (was " + clock + ")",
  );
  env.byId("gameTabElements").click();
  check(
    "elements-cleanup",
    "coming back restarts it with a fresh board",
    env.timers.pendingIntervals() === 1 &&
      env.byId("elementsTime").textContent === "0.0s",
    `${env.timers.pendingIntervals()} / ${env.byId("elementsTime").textContent}`,
  );

  /* A running challenge is abandoned by a tab switch. */
  selectChallenge(env, "extinguish");
  env.byId("elementsStartBtn").click();
  env.timers.advance(2000);
  check(
    "elements-cleanup",
    "the challenge clock is counting down",
    env.byId("elementsTime").textContent === "18.0s",
    env.byId("elementsTime").textContent,
  );
  env.byId("gameTabTyping").click();
  check(
    "elements-cleanup",
    "a tab switch stops the run's timer",
    env.timers.pendingIntervals() === 0 && env.timers.pendingTimeouts() === 0,
  );
  env.byId("gameTabElements").click();
  check(
    "elements-cleanup",
    "and the board comes back idle",
    env.byId("elementsTime").textContent === "20.0s" &&
      env.byId("elementsResult").textContent === env.byId("elementsGoal").textContent,
    `${env.byId("elementsTime").textContent} / ${env.byId("elementsResult").textContent}`,
  );
  check(
    "elements-cleanup",
    "abandoning a run records no progress",
    env.store.get(ELEMENTS_KEY) === undefined,
    String(env.store.get(ELEMENTS_KEY)),
  );

  /* Closing the drawer. */
  env.byId("elementsStartBtn").click();
  env.timers.advance(1500);
  check(
    "elements-cleanup",
    "the reopened run really is counting down",
    env.timers.pendingIntervals() === 1 && env.byId("elementsTime").textContent === "18.5s",
    `${env.timers.pendingIntervals()} / ${env.byId("elementsTime").textContent}`,
  );
  env.byId("gameCloseBtn").click();
  check(
    "elements-cleanup",
    "closing the drawer stops the sandbox",
    env.timers.pendingIntervals() === 0 && env.timers.pendingTimeouts() === 0,
  );
  env.timers.advance(5000);
  check(
    "elements-cleanup",
    "nothing ticks behind the closed drawer",
    env.timers.pendingIntervals() === 0,
    String(env.timers.pendingIntervals()),
  );
  env.byId("gameToggleBtn").click();
  check(
    "elements-cleanup",
    "reopening alone leaves it stopped",
    env.timers.pendingIntervals() === 0,
    String(env.timers.pendingIntervals()),
  );
  paintCell(env, 20, 10);
  check(
    "elements-cleanup",
    "painting on the reopened board starts it again",
    env.timers.pendingIntervals() === 1,
    String(env.timers.pendingIntervals()),
  );

  /* The document going hidden. */
  env.setHidden(true);
  env.fireDocument("visibilitychange");
  check(
    "elements-cleanup",
    "hiding the document stops the sandbox",
    env.timers.pendingIntervals() === 0 && env.timers.pendingTimeouts() === 0,
  );
  const hiddenClock = env.byId("elementsTime").textContent;
  env.timers.advance(300000);
  check(
    "elements-cleanup",
    "five hidden minutes step nothing and cost no time",
    env.byId("elementsTime").textContent === hiddenClock,
    `${env.byId("elementsTime").textContent} vs ${hiddenClock}`,
  );
  env.setHidden(false);
  env.fireDocument("visibilitychange");
  check(
    "elements-cleanup",
    "coming back resumes with no leaked timers",
    env.timers.pendingIntervals() === 1 && env.timers.pendingTimeouts() === 0,
    String(env.timers.pendingIntervals()),
  );
  env.byId("gameCloseBtn").click();
  check(
    "elements-cleanup",
    "and closing afterwards leaves nothing behind",
    env.timers.pendingIntervals() === 0 && env.timers.pendingTimeouts() === 0,
  );
});

/* 53. the pet hears about a completed challenge ------------------------- */
run("elements-pet", () => {
  const env = bootElements({});
  adopt(env, "bracko", "Pip");
  const before = env.readState();
  selectChallenge(env, "extinguish");
  env.byId("elementsStartBtn").click();
  check(
    "elements-pet",
    "an unfinished challenge does not cheer yet",
    env.readState().treats === before.treats && env.readState().xp === before.xp,
    `${env.readState().treats} / ${env.readState().xp}`,
  );
  check("elements-pet", "the challenge is cleared", douseHedge(env));
  const after = env.readState();
  check(
    "elements-pet",
    "a first clear cheers once, as a best",
    after.treats === before.treats + 2 && after.xp === before.xp + 6,
    `${after.treats} / ${after.xp}`,
  );
  check(
    "elements-pet",
    "and the run is logged",
    env.byId("recentAction").textContent.length > 0,
    env.byId("recentAction").textContent,
  );

  const slower = bootElementsWith(elementsRecord(1, { extinguish: true }, { extinguish: 0.02 }));
  adopt(slower, "quillop", "Nova");
  const slowerBefore = slower.readState();
  selectChallenge(slower, "extinguish");
  slower.byId("elementsStartBtn").click();
  check("elements-pet", "a slower clear still finishes", douseHedge(slower));
  const slowerAfter = slower.readState();
  check(
    "elements-pet",
    "a slower clear cheers softly, exactly once",
    slowerAfter.treats === slowerBefore.treats + 1 &&
      slowerAfter.xp === slowerBefore.xp + 3,
    `${slowerAfter.treats} / ${slowerAfter.xp}`,
  );
  check(
    "elements-pet",
    "and it is not announced as a best",
    !/New best/.test(slower.byId("elementsResult").textContent),
    slower.byId("elementsResult").textContent,
  );
});

/* 54. both languages ---------------------------------------------------- */
run("elements-i18n", () => {
  const en = bootElements({ language: "en-US" });
  const zh = bootElements({ language: "zh-CN" });
  check(
    "elements-i18n",
    "the palette is translated",
    en.byId("elementsToolWater").textContent === "Water" &&
      zh.byId("elementsToolWater").textContent === "\u6c34",
    `${en.byId("elementsToolWater").textContent} / ${zh.byId("elementsToolWater").textContent}`,
  );
  check(
    "elements-i18n",
    "the goal is translated",
    en.byId("elementsGoal").textContent !== zh.byId("elementsGoal").textContent &&
      /[\u4e00-\u9fff]/.test(zh.byId("elementsGoal").textContent),
    zh.byId("elementsGoal").textContent,
  );
  check(
    "elements-i18n",
    "the challenge names are translated in the picker",
    challengeOption(zh, "flood") !== "Flood" &&
      /[\u4e00-\u9fff]/.test(challengeOption(zh, "flood")),
    challengeOption(zh, "flood"),
  );
  check(
    "elements-i18n",
    "the canvas keeps a translated accessible name",
    /[\u4e00-\u9fff]/.test(zh.byId("elementsCanvas").getAttribute("aria-label")),
    zh.byId("elementsCanvas").getAttribute("aria-label"),
  );
  check(
    "elements-i18n",
    "the canvas description is translated",
    /[\u4e00-\u9fff]/.test(zh.byId("elementsDescription").textContent),
    zh.byId("elementsDescription").textContent,
  );
  check(
    "elements-i18n",
    "the controls are translated",
    zh.byId("elementsResetBtn").textContent !== en.byId("elementsResetBtn").textContent &&
      /[\u4e00-\u9fff]/.test(zh.byId("elementsResetBtn").textContent),
    zh.byId("elementsResetBtn").textContent,
  );
  [
    "tabElements",
    "hudGoal",
    "elementsEmpty",
    "elementsStone",
    "elementsSand",
    "elementsWater",
    "elementsPlant",
    "elementsFire",
    "elementsWood",
    "elementsAsh",
    "elementsOil",
    "elementsLava",
    "elementsIce",
    "elementsSteam",
    "elementsAcid",
    "elementsSeed",
    "elementsSmoke",
    "elementsGlass",
    "elementsVoid",
    "elementsReset",
    "elementsToolsLabel",
    "elementsSpeedLabel",
    "elementsBrushLabel",
    "elementsPause",
    "elementsResume",
    "elementsStep",
    "elementsPick",
    "elementsPickHint",
    "elementsUndo",
    "elementsBudgetLabel",
    "elementsBudgetUnlimited",
    "elementsLegend",
    "elementsClassStatic",
    "elementsClassPowder",
    "elementsClassLiquid",
    "elementsClassGas",
    "elementsPicked",
    "elementsPickBlocked",
    "elementsUndone",
    "elementsUndoEmpty",
    "elementsPaused",
    "elementsResumed",
    "elementsChallengeLabel",
    "elementsChallengeFree",
    "elementsChallengeGrow",
    "elementsChallengeExtinguish",
    "elementsChallengeFlood",
    "elementsGoalFree",
    "elementsGoalGrow",
    "elementsGoalExtinguish",
    "elementsGoalFlood",
    "elementsCanvasLabel",
    "elementsDescription",
    "elementsCountNone",
    "elementsGo",
    "elementsWin",
    "elementsTimeUp",
    "elementsLog",
    "elementsHint",
  ].forEach((key) => {
    check(
      "elements-i18n",
      `the "${key}" key exists in both dictionaries`,
      appSource.split('"' + key + '":').length - 1 === 2,
      String(appSource.split('"' + key + '":').length - 1),
    );
  });
  check(
    "elements-i18n",
    "the retired Fix-It Ladder keys are kept in both dictionaries",
    appSource.split('"tabFixitLadder":').length - 1 === 2 &&
      appSource.split('"fixitLog":').length - 1 === 2 &&
      appSource.includes("\u4fee\u6587\u9636\u68af"),
  );
});

/* 55. the countdown waits for the player -------------------------------- */
run("elements-clock", () => {
  const env = bootElements({});
  selectChallenge(env, "grow");
  check(
    "elements-clock",
    "a picked board shows its goal and its full limit, frozen",
    env.byId("elementsTime").textContent === "60.0s" &&
      env.byId("elementsTimeLabel").textContent === "Left" &&
      env.byId("elementsResult").textContent === env.byId("elementsGoal").textContent,
    `${env.byId("elementsTime").textContent} / ${env.byId("elementsResult").textContent}`,
  );

  /* A whole minute of ticking with no board action has to cost nothing. The
   * grow board cannot win unaided - the pool it is handed runs out - so a run
   * here would have to (incorrectly) time out if the clock were charging it. */
  env.timers.advance(65000);
  check(
    "elements-clock",
    "time passing with no player action never moves the clock",
    env.byId("elementsTime").textContent === "60.0s",
    env.byId("elementsTime").textContent,
  );
  check(
    "elements-clock",
    "an untouched board never runs out of time",
    !/Out of time/.test(env.byId("elementsResult").textContent) && !won(env),
    env.byId("elementsResult").textContent,
  );
  check(
    "elements-clock",
    "and no best time is recorded",
    env.byId("elementsBest").textContent === "No best yet" &&
      !env.store.has(ELEMENTS_KEY),
    `${env.byId("elementsBest").textContent} / ${env.store.get(ELEMENTS_KEY)}`,
  );

  /* The first paint that changes the grid is what starts the run. */
  paintCell(env, 40, 12);
  check(
    "elements-clock",
    "the first paint starts the clock",
    /Clock running/.test(env.byId("elementsResult").textContent),
    env.byId("elementsResult").textContent,
  );
  env.timers.advance(1000);
  check(
    "elements-clock",
    "and the countdown runs from there",
    env.byId("elementsTime").textContent === "59.0s",
    env.byId("elementsTime").textContent,
  );

  /* Reset arms the board again and the clock goes back to frozen. */
  env.byId("elementsResetBtn").click();
  check(
    "elements-clock",
    "reset reloads the board frozen at its full limit",
    env.byId("elementsProgress").textContent === "2/56" &&
      env.byId("elementsTime").textContent === "60.0s",
    `${env.byId("elementsProgress").textContent} / ${env.byId("elementsTime").textContent}`,
  );
  env.timers.advance(4000);
  check(
    "elements-clock",
    "and it stays frozen until the player paints again",
    env.byId("elementsTime").textContent === "60.0s",
    env.byId("elementsTime").textContent,
  );
  paintCell(env, 40, 12);
  env.timers.advance(500);
  check(
    "elements-clock",
    "the next paint starts a fresh countdown",
    env.byId("elementsTime").textContent === "59.5s",
    env.byId("elementsTime").textContent,
  );

  /* A paint the board refuses (the flood basin is sealed below its rim) moves
   * nothing, so it must not start the clock either. */
  selectChallenge(env, "flood");
  clickTool(env, "water");
  paintCell(env, 40, 48);
  env.timers.advance(2000);
  check(
    "elements-clock",
    "a paint the board refuses costs no time",
    env.byId("elementsProgress").textContent === "0/158" &&
      env.byId("elementsTime").textContent === "60.0s" &&
      !/Clock running/.test(env.byId("elementsResult").textContent),
    `${env.byId("elementsProgress").textContent} / ${env.byId("elementsTime").textContent}`,
  );

  /* The keyboard is the other way into a run, and it gets the same rule: the
   * cursor sits inside the sealed basin, so placing there is refused, and the
   * clock only starts once the cursor is above the rim. */
  pressKey(env, "ArrowUp");
  pressKey(env, " ");
  env.timers.advance(2000);
  check(
    "elements-clock",
    "a keyboard placement the board refuses costs no time",
    env.byId("elementsTime").textContent === "60.0s" &&
      !/Clock running/.test(env.byId("elementsResult").textContent),
    env.byId("elementsTime").textContent,
  );
  for (let press = 0; press < 6; press += 1) {
    pressKey(env, "ArrowUp");
  }
  pressKey(env, " ");
  check(
    "elements-clock",
    "a keyboard placement above the rim starts the clock",
    /Clock running/.test(env.byId("elementsResult").textContent),
    env.byId("elementsResult").textContent,
  );
  env.timers.advance(1000);
  check(
    "elements-clock",
    "and that countdown runs from there",
    env.byId("elementsTime").textContent === "59.0s",
    env.byId("elementsTime").textContent,
  );
});

/* 56. an armed timed board is frozen, not merely unpaid ----------------- */
run("elements-frozen", () => {
  /* Extinguish is the sharpest proof: a fire left alone walks the hedge and
   * burns the whole board out in about 33s, so if the world ran while armed an
   * idle player would win for free. */
  const fire = bootElements({});
  selectChallenge(fire, "extinguish");
  check(
    "elements-frozen",
    "picking a timed board arms it with the sandbox still up",
    fire.timers.pendingIntervals() === 1 &&
      fire.byId("elementsProgress").textContent === "1" &&
      fire.byId("elementsTime").textContent === "20.0s" &&
      !/Clock running/.test(fire.byId("elementsResult").textContent),
    `${fire.timers.pendingIntervals()} intervals / ${fire.byId("elementsProgress").textContent} fires / ${fire.byId("elementsTime").textContent}`,
  );

  const armedFire = frameSnapshot(fire);
  fire.timers.advance(40000);
  check(
    "elements-frozen",
    "40s of ticks while armed burn nothing: no fire spreads, no pixel moves",
    fire.byId("elementsProgress").textContent === "1" &&
      frameDiff(armedFire, frameSnapshot(fire)) === 0,
    `${fire.byId("elementsProgress").textContent} fires, ${frameDiff(armedFire, frameSnapshot(fire))} pixels changed`,
  );
  check(
    "elements-frozen",
    "and its clock is still frozen at the full limit",
    fire.byId("elementsTime").textContent === "20.0s",
    fire.byId("elementsTime").textContent,
  );
  check(
    "elements-frozen",
    "so an idle player cannot win, time out or record a best",
    !won(fire) &&
      !/Out of time/.test(fire.byId("elementsResult").textContent) &&
      fire.byId("elementsResult").textContent === fire.byId("elementsGoal").textContent &&
      fire.byId("elementsBest").textContent === "No best yet" &&
      !fire.store.has(ELEMENTS_KEY),
    `${fire.byId("elementsResult").textContent} / best ${fire.byId("elementsBest").textContent} / store ${fire.store.get(ELEMENTS_KEY)}`,
  );

  /* Grow proves it for the other rule: the plant climbs on its own once the
   * world runs, so a frozen board must hold its opening reading. */
  const grow = bootElements({});
  selectChallenge(grow, "grow");
  const armedGrow = frameSnapshot(grow);
  grow.timers.advance(30000);
  check(
    "elements-frozen",
    "an armed Grow board does not climb either",
    grow.byId("elementsProgress").textContent === "2/56" &&
      frameDiff(armedGrow, frameSnapshot(grow)) === 0,
    `${grow.byId("elementsProgress").textContent}, ${frameDiff(armedGrow, frameSnapshot(grow))} pixels changed`,
  );

  /* The other two timed boards get the same treatment past their own limit:
   * the reading, the frame, the clock, the result line and the store all have
   * to be exactly where they were. */
  [
    { id: "grow", reading: "2/56", left: "60.0s" },
    { id: "extinguish", reading: "1", left: "20.0s" },
    { id: "flood", reading: "0/158", left: "60.0s" },
  ].forEach((board) => {
    const idle = bootElements({});
    selectChallenge(idle, board.id);
    const before = frameSnapshot(idle);
    idle.timers.advance(65000);
    check(
      "elements-frozen",
      `idle past its limit, "${board.id}" is unchanged, unwon and unrecorded`,
      idle.byId("elementsProgress").textContent === board.reading &&
        idle.byId("elementsTime").textContent === board.left &&
        !won(idle) &&
        !/Out of time/.test(idle.byId("elementsResult").textContent) &&
        idle.byId("elementsBest").textContent === "No best yet" &&
        !idle.store.has(ELEMENTS_KEY) &&
        frameDiff(before, frameSnapshot(idle)) === 0,
      `${idle.byId("elementsProgress").textContent} / ${idle.byId("elementsTime").textContent} / ${idle.byId("elementsResult").textContent} / store ${idle.store.get(ELEMENTS_KEY)}`,
    );
  });

  /* The first paint that changes a cell starts world and clock. Had the hedge
   * been allowed to burn down while armed, this one paint would have started
   * an already-finished run and banked a ~0.0s best. */
  paintCell(fire, 60, 3);
  check(
    "elements-frozen",
    "the first board-changing paint starts a run that is not already won",
    /Clock running/.test(fire.byId("elementsResult").textContent) &&
      !won(fire) &&
      !fire.store.has(ELEMENTS_KEY),
    `${fire.byId("elementsResult").textContent} / store ${fire.store.get(ELEMENTS_KEY)}`,
  );
  const playingFire = frameSnapshot(fire);
  fire.timers.advance(1000);
  check(
    "elements-frozen",
    "and from there the world advances normally (the fire front moves)",
    parseInt(fire.byId("elementsProgress").textContent, 10) > 1 &&
      frameDiff(playingFire, frameSnapshot(fire)) > 0 &&
      fire.byId("elementsTime").textContent === "19.0s",
    `${fire.byId("elementsProgress").textContent} fires / ${fire.byId("elementsTime").textContent} / ${frameDiff(playingFire, frameSnapshot(fire))} pixels`,
  );

  /* Free play has no clock, so it is never armed: with the panel up and the
   * player doing nothing at all, the sandbox still pours and settles. */
  const free = bootDrawer({});
  free.byId("gameToggleBtn").click();
  free.byId("gameTabElements").click();
  const idleFree = frameSnapshot(free);
  free.timers.advance(2000);
  check(
    "elements-frozen",
    "free play keeps evolving while idle",
    frameDiff(idleFree, frameSnapshot(free)) > 0 &&
      !/Clock running/.test(free.byId("elementsResult").textContent) &&
      free.byId("elementsTime").textContent === "2.0s",
    `${frameDiff(idleFree, frameSnapshot(free))} pixels / ${free.byId("elementsTime").textContent}`,
  );
});

/* 57. the hand controls: brush, speed, pause, step, pick and undo -------- */
run("elements-controls", () => {
  const env = bootElementsWith(unlockedRecord());
  check(
    "elements-controls",
    "the sandbox opens on the 5x5 brush and a 1x tick",
    env.byId("elementsBrush3").getAttribute("aria-pressed") === "true" &&
      env.byId("elementsBrush1").getAttribute("aria-pressed") === "false" &&
      env.byId("elementsSpeed").value === "1",
  );
  check(
    "elements-controls",
    "the legend names the chosen element and its family",
    /Sand/.test(env.byId("elementsLegend").textContent) &&
      /piles/.test(env.byId("elementsLegend").textContent),
    env.byId("elementsLegend").textContent,
  );
  clickTool(env, "lava");
  check(
    "elements-controls",
    "and follows the palette",
    /Lava/.test(env.byId("elementsLegend").textContent) &&
      /spreads/.test(env.byId("elementsLegend").textContent),
    env.byId("elementsLegend").textContent,
  );

  /* Brush sizes: the pointer blob is the chip that is lit. */
  clickTool(env, "fire");
  paintCell(env, 60, 20);
  check(
    "elements-controls",
    "the 5x5 chip paints two cells out and no further",
    looksLikeFire(pixelAt(env, 58, 18)) &&
      looksLikeFire(pixelAt(env, 62, 22)) &&
      looksLikeEmpty(pixelAt(env, 56, 20)),
  );
  clickBrush(env, 3);
  check(
    "elements-controls",
    "the 7x7 chip is a lit toggle",
    env.byId("elementsBrush4").getAttribute("aria-pressed") === "true" &&
      env.byId("elementsBrush3").getAttribute("aria-pressed") === "false",
  );
  paintCell(env, 30, 12);
  check(
    "elements-controls",
    "and really does paint three cells out",
    looksLikeFire(pixelAt(env, 27, 9)) &&
      looksLikeFire(pixelAt(env, 33, 15)) &&
      looksLikeEmpty(pixelAt(env, 25, 12)),
  );
  clickBrush(env, 0);
  paintCell(env, 45, 20);
  check(
    "elements-controls",
    "the 1x1 chip paints the one cell under the pointer",
    looksLikeFire(pixelAt(env, 45, 20)) &&
      looksLikeEmpty(pixelAt(env, 44, 20)) &&
      looksLikeEmpty(pixelAt(env, 46, 20)),
  );
  clickBrush(env, 2);

  /* Speed: the loop is still one tracked interval, and the clock counts
   * generations rather than the wall-clock seconds they were run in. */
  const clockValue = () => parseFloat(env.byId("elementsTime").textContent);
  env.timers.advance(1000);
  const atOne = clockValue();
  setSpeedTo(env, "0.5");
  env.timers.advance(1000);
  const atHalf = clockValue() - atOne;
  setSpeedTo(env, "4");
  env.timers.advance(1000);
  const atFour = clockValue() - atOne - atHalf;
  check(
    "elements-controls",
    "half speed runs half the generations in the same second",
    Math.abs(atHalf - 0.5) < 1e-6 && atOne === 1.0,
    `${atOne} then +${atHalf}`,
  );
  check(
    "elements-controls",
    "four times the speed runs several times the generations, still one interval",
    atFour > 3 && atFour < 4.2 && env.timers.pendingIntervals() === 1,
    `+${atFour} over 1s, ${env.timers.pendingIntervals()} intervals`,
  );
  setSpeedTo(env, "1");

  /* Pause holds both the world and the clock. A fresh board starts the clock
   * at zero, so one stepped generation is a visible tenth of a second. */
  const hand = bootElements({});
  clickHand(hand, "elementsPauseBtn");
  const pausedFrame = frameSnapshot(hand);
  const pausedClock = hand.byId("elementsTime").textContent;
  check(
    "elements-controls",
    "pause stops the interval and says so",
    hand.timers.pendingIntervals() === 0 &&
      hand.byId("elementsPauseBtn").getAttribute("aria-pressed") === "true" &&
      /Resume/.test(hand.byId("elementsPauseBtn").textContent) &&
      /Paused/.test(hand.byId("elementsResult").textContent),
    hand.byId("elementsResult").textContent,
  );
  hand.timers.advance(5000);
  check(
    "elements-controls",
    "five paused seconds move neither the board nor the clock",
    frameDiff(pausedFrame, frameSnapshot(hand)) === 0 &&
      hand.byId("elementsTime").textContent === pausedClock &&
      pausedClock === "0.0s",
    `${hand.byId("elementsTime").textContent} vs ${pausedClock}`,
  );
  /* One generation on demand, with the loop still held. */
  clickHand(hand, "elementsStepBtn");
  check(
    "elements-controls",
    "step advances exactly one generation without restarting the loop",
    hand.timers.pendingIntervals() === 0 &&
      hand.byId("elementsTime").textContent === "0.1s" &&
      frameDiff(pausedFrame, frameSnapshot(hand)) > 0,
    `${hand.byId("elementsTime").textContent} / ${hand.timers.pendingIntervals()} intervals`,
  );
  clickHand(hand, "elementsPauseBtn");
  const resumed = frameSnapshot(hand);
  hand.timers.advance(500);
  check(
    "elements-controls",
    "resume starts the world again from where it was held",
    hand.timers.pendingIntervals() === 1 &&
      hand.byId("elementsPauseBtn").getAttribute("aria-pressed") === "false" &&
      frameDiff(resumed, frameSnapshot(hand)) > 0 &&
      hand.byId("elementsTime").textContent === "0.6s",
    hand.byId("elementsTime").textContent,
  );

  /* Step on an armed board is the go, exactly like the first paint. */
  const armed = bootElements({});
  selectChallenge(armed, "grow");
  const armedFrame = frameSnapshot(armed);
  clickHand(armed, "elementsStepBtn");
  check(
    "elements-controls",
    "a step on an armed board starts the run rather than advancing it behind the player",
    /Clock running/.test(armed.byId("elementsResult").textContent) &&
      armed.byId("elementsProgress").textContent === "2/56" &&
      !armed.store.has(ELEMENTS_KEY),
    armed.byId("elementsResult").textContent,
  );
  armed.timers.advance(500);
  check(
    "elements-controls",
    "and from there the world and the countdown both run",
    armed.byId("elementsTime").textContent === "59.5s" &&
      armed.byId("elementsProgress").textContent !== "2/56" &&
      frameDiff(armedFrame, frameSnapshot(armed)) > 0,
    `${armed.byId("elementsTime").textContent} / ${armed.byId("elementsProgress").textContent}`,
  );

  /* The eyedropper: it paints nothing, so it starts nothing. */
  const drop = bootElements({});
  selectChallenge(drop, "extinguish");
  const dropFrame = frameSnapshot(drop);
  clickHand(drop, "elementsPickBtn");
  check(
    "elements-controls",
    "pick is a lit toggle",
    drop.byId("elementsPickBtn").getAttribute("aria-pressed") === "true",
  );
  paintCell(drop, 40, 30);
  check(
    "elements-controls",
    "picking an empty cell takes the eraser and paints nothing",
    drop.byId("elementsToolEmpty").getAttribute("aria-pressed") === "true" &&
      frameDiff(dropFrame, frameSnapshot(drop)) === 0 &&
      !/Clock running/.test(drop.byId("elementsResult").textContent),
    drop.byId("elementsResult").textContent,
  );
  drop.timers.advance(3000);
  check(
    "elements-controls",
    "and an armed board is still frozen and uncharged after a pick",
    drop.byId("elementsTime").textContent === "20.0s" &&
      drop.byId("elementsProgress").textContent === "1" &&
      frameDiff(dropFrame, frameSnapshot(drop)) === 0 &&
      !drop.store.has(ELEMENTS_KEY),
    `${drop.byId("elementsTime").textContent} / ${drop.byId("elementsProgress").textContent}`,
  );
  clickHand(drop, "elementsPickBtn");
  paintCell(drop, 1, 55);
  check(
    "elements-controls",
    "an element the board does not offer is refused, and the brush is left alone",
    /not part of this board/.test(drop.byId("elementsResult").textContent) &&
      drop.byId("elementsToolEmpty").getAttribute("aria-pressed") === "true" &&
      drop.byId("elementsPickBtn").getAttribute("aria-pressed") === "false",
    drop.byId("elementsResult").textContent,
  );

  /* Undo takes back a stroke, and a refused stroke costs nothing. */
  const undo = bootElements({});
  selectChallenge(undo, "extinguish");
  const before = frameSnapshot(undo);
  check(
    "elements-controls",
    "undo starts disabled with nothing to take back",
    undo.byId("elementsUndoBtn").disabled === true,
  );
  clickTool(undo, "water");
  paintCell(undo, 40, 30);
  check(
    "elements-controls",
    "a stroke enables undo",
    undo.byId("elementsUndoBtn").disabled === false &&
      frameDiff(before, frameSnapshot(undo)) > 0,
  );
  clickHand(undo, "elementsUndoBtn");
  check(
    "elements-controls",
    "undo puts the board back exactly where it was",
    frameDiff(before, frameSnapshot(undo)) === 0 &&
      undo.byId("elementsUndoBtn").disabled === true &&
      /Undone/.test(undo.byId("elementsResult").textContent),
    undo.byId("elementsResult").textContent,
  );
  clickHand(undo, "elementsUndoBtn");
  check(
    "elements-controls",
    "and says so when there is nothing left to undo",
    /Nothing to undo/.test(undo.byId("elementsResult").textContent),
    undo.byId("elementsResult").textContent,
  );
  selectChallenge(undo, "flood");
  clickTool(undo, "water");
  paintCell(undo, 40, 48);
  check(
    "elements-controls",
    "a stroke the board refuses costs the player no undo",
    undo.byId("elementsUndoBtn").disabled === true,
  );

  /* The allowance is reported even on a board that rations nothing, and the
   * controls cannot advance an armed board. */
  const armedFree = bootElements({});
  check(
    "elements-controls",
    "the HUD reports the paint allowance on every board",
    armedFree.byId("elementsBudget").textContent === "unlimited" &&
      /Budget|Ink/.test(
        armedFree.byId("gamePanelElements").querySelector(".game-hud")
          .textContent,
      ),
    armedFree.byId("elementsBudget").textContent,
  );
  const idle = bootElements({});
  selectChallenge(idle, "grow");
  const idleFrame = frameSnapshot(idle);
  clickBrush(idle, 3);
  clickBrush(idle, 0);
  setSpeedTo(idle, "4");
  setSpeedTo(idle, "1");
  clickHand(idle, "elementsPickBtn");
  clickHand(idle, "elementsPickBtn");
  clickHand(idle, "elementsPauseBtn");
  clickHand(idle, "elementsPauseBtn");
  idle.timers.advance(40000);
  check(
    "elements-controls",
    "no control can advance, charge or unwin an armed board",
    idle.byId("elementsTime").textContent === "60.0s" &&
      idle.byId("elementsProgress").textContent === "2/56" &&
      !won(idle) &&
      !/Out of time/.test(idle.byId("elementsResult").textContent) &&
      idle.byId("elementsBest").textContent === "No best yet" &&
      !idle.store.has(ELEMENTS_KEY) &&
      frameDiff(idleFrame, frameSnapshot(idle)) === 0,
    `${idle.byId("elementsTime").textContent} / ${idle.byId("elementsProgress").textContent} / ${idle.byId("elementsResult").textContent}`,
  );

  /* The translated controls. */
  const zh = bootElements({ language: "zh-CN" });
  check(
    "elements-controls",
    "the hand controls are translated",
    /[\u4e00-\u9fff]/.test(zh.byId("elementsPauseBtn").textContent) &&
      /[\u4e00-\u9fff]/.test(zh.byId("elementsStepBtn").textContent) &&
      /[\u4e00-\u9fff]/.test(zh.byId("elementsPickBtn").textContent) &&
      /[\u4e00-\u9fff]/.test(zh.byId("elementsUndoBtn").textContent) &&
      /[\u4e00-\u9fff]/.test(zh.byId("elementsLegend").textContent) &&
      /[\u4e00-\u9fff]/.test(zh.byId("elementsBrushLabel").textContent),
    zh.byId("elementsLegend").textContent,
  );
  check(
    "elements-controls",
    "the expanded palette is translated",
    zh.byId("elementsToolLava").textContent === "\u5ca9\u6d46" &&
      zh.byId("elementsToolVoid").textContent === "\u865a\u7a7a" &&
      zh.byId("elementsBudget").textContent !== "unlimited",
    `${zh.byId("elementsToolLava").textContent} / ${zh.byId("elementsBudget").textContent}`,
  );
});
