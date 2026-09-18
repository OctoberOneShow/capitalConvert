/*
 * Glyph Match cases.
 * The level ladder, the glyph pool and progress migration via real initMemoryGame.
 */
"use strict";

const { createEnvironment, appSource, GLYPH_KEY, check, run } = require("./lib");

/* --- Glyph Match level ladder ----------------------------------------- */

/* The memory panel markup lives in the four HTML pages; seed the same shape so
 * initMemoryGame wires itself up (the level cell itself is JS-injected). */
function seedMemoryDom(env) {
  const panel = env.document.createElement("div");
  panel.className = "game-panel";
  panel.id = "gamePanelMemory";

  const hud = env.document.createElement("div");
  hud.className = "game-hud";
  [
    ["memoryMoves", "Moves", "0"],
    ["memoryTime", "Time", "0.0s"],
    ["memoryPairs", "Pairs", "0/6"],
  ].forEach(([id, text, value]) => {
    const stat = env.document.createElement("div");
    stat.className = "game-stat";
    const label = env.document.createElement("span");
    label.textContent = text;
    const strong = env.document.createElement("strong");
    strong.id = id;
    strong.textContent = value;
    stat.appendChild(label);
    stat.appendChild(strong);
    hud.appendChild(stat);
  });

  const grid = env.document.createElement("div");
  grid.className = "memory-grid";
  grid.id = "memoryGrid";
  grid.setAttribute("role", "group");
  grid.setAttribute("aria-label", "Memory cards, find the matching pairs");
  grid.setAttribute("data-i18n-aria", "memoryGridLabel");

  const result = env.document.createElement("p");
  result.className = "game-result";
  result.id = "memoryResult";
  result.setAttribute("role", "status");
  result.setAttribute("data-i18n", "memoryPrompt");

  const startBtn = env.document.createElement("button");
  startBtn.id = "memoryStartBtn";
  const content = env.document.createElement("span");
  content.className = "button-content";
  const label = env.document.createElement("span");
  label.setAttribute("data-i18n", "btnNewShuffle");
  label.textContent = "New Shuffle";
  content.appendChild(label);
  startBtn.appendChild(content);

  const best = env.document.createElement("p");
  best.className = "game-best";
  best.id = "memoryBest";
  best.setAttribute("data-i18n", "noBest");
  best.textContent = "No best yet";

  [hud, grid, result, startBtn, best].forEach((node) => panel.appendChild(node));
  env.document.body.appendChild(panel);
  return { panel, hud, grid, result, startBtn, label, best };
}

function bootMemory(options) {
  const env = createEnvironment(options || {});
  seedMemoryDom(env);
  env.load(appSource);
  env.domReady();
  return env;
}

function memoryStore(level, bests) {
  return new Map([
    [GLYPH_KEY, JSON.stringify({ v: 2, level: level, bests: bests || {} })],
  ]);
}

function bootMemoryAtLevel(level, bests) {
  return bootMemory({ store: memoryStore(level, bests) });
}

function boardCards(env) {
  return env.byId("memoryGrid").children;
}

function boardGlyphs(env) {
  return boardCards(env).map((card) => card.getAttribute("data-glyph"));
}

/* Clicks one pair at a time, so no mismatch ever locks the board, and spends
 * `seconds` on the virtual clock before the last pair lands. */
function playRung(env, seconds) {
  const byGlyph = new Map();
  boardCards(env).forEach((card) => {
    const glyph = card.getAttribute("data-glyph");
    if (!byGlyph.has(glyph)) byGlyph.set(glyph, []);
    byGlyph.get(glyph).push(card);
  });
  const pairs = Array.from(byGlyph.values());
  pairs[0][0].click();
  env.timers.advance(seconds * 1000);
  pairs.forEach((pair) => pair.forEach((card) => card.click()));
  return pairs.length;
}

const MEMORY_RUNGS = [
  { level: 1, pairs: 3, cols: "3", cards: 6 },
  { level: 2, pairs: 4, cols: "4", cards: 8 },
  { level: 3, pairs: 6, cols: "4", cards: 12 },
  { level: 4, pairs: 8, cols: "4", cards: 16 },
  { level: 5, pairs: 10, cols: "5", cards: 20 },
];

/* 38. deck shape of every rung ----------------------------------------- */
run("glyph-levels", () => {
  MEMORY_RUNGS.forEach((rung) => {
    const env = bootMemoryAtLevel(rung.level);
    const cards = boardCards(env);
    const glyphs = boardGlyphs(env);
    const distinct = new Set(glyphs);
    const name = `level ${rung.level}`;

    check("glyph-levels", `${name}: the deck is 2 x ${rung.pairs} cards`,
      cards.length === rung.cards, String(cards.length));
    check("glyph-levels", `${name}: every glyph is distinct within the board`,
      distinct.size === rung.pairs, `${distinct.size} distinct of ${glyphs.length}`);
    check("glyph-levels", `${name}: each glyph appears exactly twice`,
      Array.from(distinct).every((glyph) =>
        glyphs.filter((value) => value === glyph).length === 2),
      glyphs.join(" "));
    check("glyph-levels", `${name}: the pair counter targets ${rung.pairs}`,
      env.byId("memoryPairs").textContent === "0/" + rung.pairs,
      env.byId("memoryPairs").textContent);
    check("glyph-levels", `${name}: the level indicator reads ${rung.level}/5`,
      env.byId("memoryLevel").textContent === rung.level + "/5",
      env.byId("memoryLevel").textContent);
    check("glyph-levels", `${name}: the grid asks for ${rung.cols} columns`,
      env.byId("memoryGrid").getAttribute("data-cols") === rung.cols,
      env.byId("memoryGrid").getAttribute("data-cols"));
    check("glyph-levels", `${name}: the grid's name carries the level`,
      (env.byId("memoryGrid").getAttribute("aria-label") || "").includes(
        `Level ${rung.level} of 5`),
      env.byId("memoryGrid").getAttribute("aria-label"));
    check("glyph-levels", `${name}: the level cell exposes the level`,
      env.byId("memoryLevel").parentNode.getAttribute("aria-label") ===
        `Level ${rung.level} of 5`,
      env.byId("memoryLevel").parentNode.getAttribute("aria-label"));
    check("glyph-levels", `${name}: every card is a labelled button`,
      cards.every((card) =>
        card.tagName === "BUTTON" && !!card.getAttribute("aria-label")),
      cards.map((card) => card.tagName).join(","));
  });
});

/* 39. glyph pool depth + no intra-level repeats ------------------------- */
run("glyph-pool", () => {
  const env = bootMemoryAtLevel(5);
  const glyphs = boardGlyphs(env);
  check("glyph-pool", "the widest rung draws 10 distinct glyphs",
    new Set(glyphs).size === 10, `${new Set(glyphs).size}`);
  check("glyph-pool", "the pool is therefore larger than the original six",
    new Set(glyphs).size > 6, `${new Set(glyphs).size}`);

  let repeats = 0;
  const sequences = new Set();
  for (let round = 0; round < 25; round += 1) {
    env.byId("memoryStartBtn").click();
    const next = boardGlyphs(env);
    if (new Set(next).size !== 10 || next.length !== 20) repeats += 1;
    sequences.add(next.join(""));
  }
  check("glyph-pool", "25 reshuffles of the widest rung never repeat a glyph",
    repeats === 0, `${repeats} bad boards`);
  check("glyph-pool", "reshuffling produces new boards",
    sequences.size > 1, `${sequences.size} distinct boards`);

  const low = bootMemoryAtLevel(1);
  check("glyph-pool", "the easiest rung is a 3-glyph subset of the pool",
    new Set(boardGlyphs(low)).size === 3, boardGlyphs(low).join(" "));
});

/* 40. advancing + reshuffling reset the round counters ------------------ */
run("glyph-reset", () => {
  const env = bootMemory({});
  playRung(env, 4);
  env.byId("memoryStartBtn").click(); // "Next Level"
  check("glyph-reset", "advancing moves to the next rung",
    env.byId("memoryLevel").textContent === "2/5",
    env.byId("memoryLevel").textContent);
  check("glyph-reset", "advancing resets moves", env.byId("memoryMoves").textContent === "0",
    env.byId("memoryMoves").textContent);
  check("glyph-reset", "advancing resets the clock", env.byId("memoryTime").textContent === "0.0s",
    env.byId("memoryTime").textContent);
  check("glyph-reset", "advancing resets the pair counter to the new target",
    env.byId("memoryPairs").textContent === "0/4",
    env.byId("memoryPairs").textContent);
  check("glyph-reset", "advancing builds the new rung's deck",
    boardCards(env).length === 8, String(boardCards(env).length));
  check("glyph-reset", "advancing clears the timer",
    env.timers.pendingIntervals() === 0, String(env.timers.pendingIntervals()));
  check("glyph-reset", "advancing shows the prompt again",
    /Flip two cards/.test(env.byId("memoryResult").textContent),
    env.byId("memoryResult").textContent);

  const cards = boardCards(env).slice();
  cards[0].click();
  cards[1].click();
  env.timers.advance(1200);
  check("glyph-reset", "a round in progress counts moves and time",
    env.byId("memoryMoves").textContent === "1" &&
      env.byId("memoryTime").textContent === "1.2s",
    `${env.byId("memoryMoves").textContent} / ${env.byId("memoryTime").textContent}`);

  env.byId("memoryStartBtn").click(); // "New Shuffle"
  check("glyph-reset", "New Shuffle keeps the current rung",
    env.byId("memoryLevel").textContent === "2/5" &&
      boardCards(env).length === 8,
    `${env.byId("memoryLevel").textContent} / ${boardCards(env).length}`);
  check("glyph-reset", "New Shuffle resets the counters",
    env.byId("memoryMoves").textContent === "0" &&
      env.byId("memoryTime").textContent === "0.0s" &&
      env.byId("memoryPairs").textContent === "0/4",
    `${env.byId("memoryMoves").textContent} / ${env.byId("memoryTime").textContent} / ${env.byId("memoryPairs").textContent}`);
  check("glyph-reset", "New Shuffle leaves no stray interval",
    env.timers.pendingIntervals() === 0, String(env.timers.pendingIntervals()));
});

/* 41. clearing offers the next rung, the last rung completes ------------ */
run("glyph-progression", () => {
  const env = bootMemory({});
  playRung(env, 4);
  const cleared = env.byId("memoryResult").textContent;
  check("glyph-progression", "the result announces the cleared rung",
    cleared.includes("Level 1/5 cleared!"), cleared);
  check("glyph-progression", "the result carries the time and moves",
    cleared.includes("4.0s") && cleared.includes("3 moves"), cleared);
  check("glyph-progression", "the result offers the next level",
    cleared.includes("Next up: level 2/5"), cleared);
  check("glyph-progression", "the first clear was a personal best",
    cleared.includes("New best!"), cleared);
  check("glyph-progression", "the primary button becomes Next Level",
    env.byId("memoryStartBtn").querySelector("[data-i18n]").textContent === "Next Level",
    env.byId("memoryStartBtn").querySelector("[data-i18n]").textContent);
  check("glyph-progression", "the result line is still the live region",
    env.byId("memoryResult").getAttribute("role") === "status");
  check("glyph-progression", "the cleared rung shows its best time",
    env.byId("memoryBest").textContent === "Best 4.0s",
    env.byId("memoryBest").textContent);

  const final = bootMemoryAtLevel(5, { 1: 4, 2: 6, 3: 9, 4: 12 });
  playRung(final, 30);
  const done = final.byId("memoryResult").textContent;
  check("glyph-progression", "clearing the last rung announces the completion",
    done.includes("All 5 levels cleared"), done);
  check("glyph-progression", "the completion keeps the rung's own result line",
    done.includes("Level 5/5 cleared!"), done);
  check("glyph-progression", "the primary button becomes Play Again",
    final.byId("memoryStartBtn").querySelector("[data-i18n]").textContent === "Play Again",
    final.byId("memoryStartBtn").querySelector("[data-i18n]").textContent);
  check("glyph-progression", "the completion records the final best",
    final.byId("memoryBest").textContent === "Best 30.0s",
    final.byId("memoryBest").textContent);
  check("glyph-progression", "every rung's best is kept after completion",
    JSON.parse(final.store.get(GLYPH_KEY)).bests["4"] === 12,
    final.store.get(GLYPH_KEY));

  final.byId("memoryStartBtn").click();
  check("glyph-progression", "Play Again restarts the ladder at rung 1",
    final.byId("memoryLevel").textContent === "1/5" &&
      boardCards(final).length === 6,
    `${final.byId("memoryLevel").textContent} / ${boardCards(final).length}`);
  check("glyph-progression", "the restarted ladder keeps the old bests",
    final.byId("memoryStartBtn").querySelector("[data-i18n]").textContent === "New Shuffle" &&
      JSON.parse(final.store.get(GLYPH_KEY)).bests["5"] === 30,
    final.store.get(GLYPH_KEY));
});

/* 42. per-level bests persist across visits ---------------------------- */
run("glyph-persistence", () => {
  const store = new Map();
  const first = bootMemory({ store });
  playRung(first, 4);
  check("glyph-persistence", "the rung's best is written under the legacy key",
    (first.store.get(GLYPH_KEY) || "").length > 0, String(first.store.get(GLYPH_KEY)));

  const resumed = bootMemory({ store });
  check("glyph-persistence", "a reload resumes on the remembered rung",
    resumed.byId("memoryLevel").textContent === "2/5",
    resumed.byId("memoryLevel").textContent);
  check("glyph-persistence", "the resumed rung has no best of its own yet",
    resumed.byId("memoryBest").textContent === "No best yet",
    resumed.byId("memoryBest").textContent);

  const rung3 = bootMemoryAtLevel(3, { 1: 4, 3: 9.5 });
  check("glyph-persistence", "a stored per-level best is shown for its rung",
    rung3.byId("memoryBest").textContent === "Best 9.5s",
    rung3.byId("memoryBest").textContent);
  playRung(rung3, 12);
  check("glyph-persistence", "a slower run does not overwrite the best",
    rung3.byId("memoryBest").textContent === "Best 9.5s" &&
      !rung3.byId("memoryResult").textContent.includes("New best!"),
    rung3.byId("memoryResult").textContent);
  check("glyph-persistence", "a slower run still advances the ladder",
    JSON.parse(rung3.store.get(GLYPH_KEY)).level === 4,
    rung3.store.get(GLYPH_KEY));

  const rung4 = bootMemoryAtLevel(4, { 4: 20 });
  playRung(rung4, 3);
  check("glyph-persistence", "a faster run replaces that rung's best",
    rung4.byId("memoryBest").textContent === "Best 3.0s",
    rung4.byId("memoryBest").textContent);
  check("glyph-persistence", "one rung's best never touches another's",
    JSON.parse(rung4.store.get(GLYPH_KEY)).bests["4"] === 3 &&
      !("3" in JSON.parse(rung4.store.get(GLYPH_KEY)).bests),
    rung4.store.get(GLYPH_KEY));
});

/* 43. migration from the old scalar best ------------------------------- */
run("glyph-migration", () => {
  const legacyStore = new Map([[GLYPH_KEY, "12.34"]]);
  const migrated = bootMemory({ store: legacyStore });
  const rewritten = JSON.parse(legacyStore.get(GLYPH_KEY));
  check("glyph-migration", "an old scalar best does not throw",
    migrated.byId("memoryLevel").textContent === "1/5",
    migrated.byId("memoryLevel").textContent);
  check("glyph-migration", "the old scalar lands on the 6-pair rung",
    rewritten.bests["3"] === 12.34, JSON.stringify(rewritten.bests));
  check("glyph-migration", "the migrated record is versioned",
    rewritten.v === 2 && rewritten.level === 1, legacyStore.get(GLYPH_KEY));
  check("glyph-migration", "a migrated player still starts at rung 1",
    migrated.byId("memoryBest").textContent === "No best yet" &&
      boardCards(migrated).length === 6,
    `${migrated.byId("memoryLevel").textContent} / ${boardCards(migrated).length}`);

  const rung3 = bootMemory({ store: memoryStore(3, rewritten.bests) });
  check("glyph-migration", "the migrated best is used by the 6-pair rung",
    rung3.byId("memoryBest").textContent === "Best 12.3s",
    rung3.byId("memoryBest").textContent);

  [["0", "a zero best"], ["999999", "an out-of-range best"], ["", "an empty value"],
    ["not json", "a non-JSON value"], ["[]", "a JSON array"], ["null", "JSON null"],
    ["true", "a JSON boolean"]].forEach(([raw, label]) => {
    const store = new Map([[GLYPH_KEY, raw]]);
    let threw = null;
    let env = null;
    try {
      env = bootMemory({ store });
    } catch (error) {
      threw = error;
    }
    check("glyph-migration", `${label} falls back to defaults`,
      !threw && !!env && env.byId("memoryLevel").textContent === "1/5" &&
        env.byId("memoryBest").textContent === "No best yet" &&
        boardCards(env).length === 6,
      threw ? threw.message : env && env.byId("memoryLevel").textContent);
  });

  const v1Store = new Map([[GLYPH_KEY, JSON.stringify({ v: 1, level: 2, bests: { 3: 7 } })]]);
  const v1 = bootMemory({ store: v1Store });
  const upgraded = JSON.parse(v1Store.get(GLYPH_KEY));
  check("glyph-migration", "an unversioned record is upgraded in place",
    upgraded.v === 2 && upgraded.bests["3"] === 7 && v1.byId("memoryLevel").textContent === "2/5",
    v1Store.get(GLYPH_KEY));

  const junk = bootMemoryAtLevel(99, {
    0: 3,
    2: "abc",
    3: -5,
    4: 8,
    5: 99999,
    9: 1,
    x: 2,
  });
  check("glyph-migration", "a level beyond the ladder clamps to the last rung",
    junk.byId("memoryLevel").textContent === "5/5",
    junk.byId("memoryLevel").textContent);
  check("glyph-migration", "out-of-range bests are dropped, valid ones survive",
    junk.byId("memoryBest").textContent === "No best yet" &&
      bootMemoryAtLevel(4, { 4: 8 }).byId("memoryBest").textContent === "Best 8.0s",
    junk.byId("memoryBest").textContent);

  /* Blocked storage is injected per key: the page's other inits read storage
   * unguarded (pre-existing), so only the Glyph Match key may throw. */
  const blockedRead = createEnvironment({});
  seedMemoryDom(blockedRead);
  const readItem = blockedRead.localStorage.getItem.bind(blockedRead.localStorage);
  blockedRead.localStorage.getItem = (key) => {
    if (key === GLYPH_KEY) throw new Error("storage blocked");
    return readItem(key);
  };
  blockedRead.load(appSource);
  let readThrew = null;
  try {
    blockedRead.domReady();
  } catch (error) {
    readThrew = error;
  }
  check("glyph-migration", "a throwing storage read falls back to rung 1",
    !readThrew && blockedRead.byId("memoryLevel").textContent === "1/5" &&
      boardCards(blockedRead).length === 6,
    readThrew ? readThrew.message : String(blockedRead.byId("memoryLevel").textContent));

  const blockedWrite = bootMemory({});
  const writeItem = blockedWrite.localStorage.setItem.bind(blockedWrite.localStorage);
  blockedWrite.localStorage.setItem = (key, value) => {
    if (key === GLYPH_KEY) throw new Error("storage blocked");
    return writeItem(key, value);
  };
  let writeThrew = null;
  try {
    playRung(blockedWrite, 5);
  } catch (error) {
    writeThrew = error;
  }
  check("glyph-migration", "a throwing storage write still clears the rung",
    !writeThrew &&
      blockedWrite.byId("memoryResult").textContent.includes("Level 1/5 cleared!") &&
      blockedWrite.byId("memoryLevel").textContent === "1/5",
    writeThrew ? writeThrew.message : blockedWrite.byId("memoryResult").textContent);
});
