/*
 * Pet companion cases (part 2).
 * Cases 19-45: treats, levels, achievements, streaks, awareness and mini-games.
 */
"use strict";

const { createEnvironment, appSource, PET_KEY, check, boot, adopt, seedToolDom, run, savedPet, storeWith, dayString, localStamp, seedGameDom } = require("./lib");

/* 19. treats + spending ------------------------------------------------ */
run("treats", () => {
  const env = boot({});
  adopt(env, "bracko", "Pip");
  check("treats", "adoption grants starting treats",
    env.readState().treats === 3, String(env.readState().treats));
  check("treats", "treat count rendered",
    env.byId("petTreatValue").textContent === "3",
    env.byId("petTreatValue").textContent);

  const before = env.readState().happiness;
  env.byId("petTreatBtn").click();
  const afterOne = env.readState();
  check("treats", "giving a treat spends one", afterOne.treats === 2, String(afterOne.treats));
  check("treats", "treat boosts happiness by more than petting",
    afterOne.happiness === before + 14, `${before} -> ${afterOne.happiness}`);
  check("treats", "treat grants xp", afterOne.xp === 8, String(afterOne.xp));
  check("treats", "status confirms the treat", /Pip/.test(env.byId("petStatus").textContent));

  let guard = 0;
  while (env.readState().treats > 0 && guard < 30) {
    env.byId("petTreatBtn").click();
    guard += 1;
  }
  check("treats", "treats can be spent down to zero", env.readState().treats === 0,
    String(env.readState().treats));
  env.byId("petTreatBtn").click();
  check("treats", "no treats -> explains itself",
    /spare/.test(env.byId("petStatus").textContent),
    env.byId("petStatus").textContent);
  check("treats", "no treats -> nothing spent", env.readState().treats === 0);
});

/* 20. xp -> level -> evolution stage ----------------------------------- */
run("progression", () => {
  [
    { xp: 0, level: 1, stage: "baby" },
    { xp: 20, level: 2, stage: "baby" },
    { xp: 90, level: 4, stage: "grown" },
    { xp: 650, level: 10, stage: "elder" },
  ].forEach((testCase) => {
    const state = savedPet({ xp: testCase.xp });
    const env = boot({ store: storeWith(state), now: state.lastSeen });
    check("progression", `xp ${testCase.xp} -> level ${testCase.level}`,
      env.byId("petLevelText").textContent === "Lv " + testCase.level,
      env.byId("petLevelText").textContent);
    check("progression", `xp ${testCase.xp} -> stage ${testCase.stage}`,
      env.byId("petWidget").getAttribute("data-stage") === testCase.stage,
      env.byId("petWidget").getAttribute("data-stage"));
  });

  const levelUp = boot({});
  adopt(levelUp, "bracko", "Pip");
  levelUp.byId("petTreatBtn").click();
  levelUp.byId("petTreatBtn").click();
  levelUp.byId("petTreatBtn").click();
  check("progression", "level-up is celebrated in the status line",
    /level 2/i.test(levelUp.byId("petStatus").textContent),
    levelUp.byId("petStatus").textContent);
  check("progression", "level chip updates",
    levelUp.byId("petLevelText").textContent === "Lv 2",
    levelUp.byId("petLevelText").textContent);
  check("progression", "level-up grants bonus treats",
    levelUp.readState().treats >= 1, String(levelUp.readState().treats));

  const evolved = boot({ store: storeWith(savedPet({ xp: 89 })), now: 1757000000000 });
  evolved.byId("petBrushBtn").click();
  check("progression", "crossing a stage boundary announces evolution",
    /Grown/i.test(evolved.byId("petStatus").textContent),
    evolved.byId("petStatus").textContent);
  check("progression", "stage attribute follows the level",
    evolved.byId("petWidget").getAttribute("data-stage") === "grown",
    evolved.byId("petWidget").getAttribute("data-stage"));
});

/* 21. every new interaction -------------------------------------------- */
run("interactions", () => {
  const env = boot({});
  adopt(env, "bracko", "Pip");

  const happinessBefore = env.readState().happiness;
  env.byId("petBrushBtn").click();
  check("interactions", "brush raises happiness",
    env.readState().happiness === happinessBefore + 7,
    `${happinessBefore} -> ${env.readState().happiness}`);
  check("interactions", "brush is counted", env.readState().totalBrush === 1);

  const xpBefore = env.readState().xp;
  env.byId("petTalkBtn").click();
  check("interactions", "talk grants xp", env.readState().xp === xpBefore + 1);
  check("interactions", "talk says something",
    env.byId("petStatus").textContent.length > 0);

  env.byId("petTricksBtn").click();
  check("interactions", "tricks view opens", env.byId("petTricksView").hidden === false);
  check("interactions", "teach control is offered",
    env.byId("petTrickTeachBtn").hidden === false);
  env.byId("petTrickTeachBtn").click();
  check("interactions", "teaching unlocks the first trick",
    env.readState().tricks.join(",") === "jump", env.readState().tricks.join(","));
  const trickBtn = env.byId("petTrickList").querySelector('[data-trick="jump"]');
  check("interactions", "known trick gets a perform button", !!trickBtn);
  if (trickBtn) {
    trickBtn.click();
    check("interactions", "performing a trick works",
      env.readState().totalTricks >= 1, String(env.readState().totalTricks));
  }
  env.byId("petBackTricks").click();
  check("interactions", "back returns to the main view",
    env.byId("petTricksView").hidden === true);
});

/* 22. stats view ------------------------------------------------------- */
run("stats-view", () => {
  const env = boot({});
  adopt(env, "bracko", "Pip");
  env.byId("petStatsBtn").click();
  check("stats-view", "stats view opens", env.byId("petStatsView").hidden === false);
  check("stats-view", "main actions hidden while in stats",
    env.byId("petWidget").querySelector(".pet-actions").hidden === true);
  check("stats-view", "level field populated",
    env.byId("petStatLevelValue").textContent === "1");
  check("stats-view", "stage field populated",
    env.byId("petStatStageValue").textContent === "Baby",
    env.byId("petStatStageValue").textContent);
  check("stats-view", "treats field populated",
    env.byId("petStatTreatsValue").textContent === "3");
  check("stats-view", "days visited populated",
    env.byId("petStatDaysValue").textContent === "1");
  const badges = env.queryAll(".pet-badge");
  check("stats-view", "achievement grid rendered",
    badges.length === 11, String(badges.length));
  const unlocked = badges.filter((badge) => !badge.classList.contains("is-locked"));
  check("stats-view", "first achievement is unlocked on adoption",
    unlocked.length >= 1, String(unlocked.length));
  env.byId("petBackStats").click();
  check("stats-view", "back returns to the main view",
    env.byId("petStatsView").hidden === true);
});

/* 23. accessories / colours locked by level ---------------------------- */
run("customise", () => {
  const state = savedPet({ xp: 200 }); // level 5
  const env = boot({ store: storeWith(state), now: state.lastSeen });
  check("customise", "level gating unlocks accessories",
    env.queryAll(".pet-acc-option").some((option) => !option.disabled));
  const hat = env.byId("petAccGrid").querySelector('[data-acc="hat"]');
  check("customise", "unlocked accessory is selectable", !!hat && hat.disabled === false);
  if (hat) {
    hat.click();
    check("customise", "accessory persisted", env.readState().accessory === "hat",
      env.readState().accessory);
    check("customise", "widget reflects the accessory",
      env.byId("petWidget").getAttribute("data-acc") === "hat");
    check("customise", "dressed achievement unlocked",
      !!env.readState().achievements.dressed);
  }
  const crown = env.byId("petAccGrid").querySelector('[data-acc="crown"]');
  check("customise", "level-locked accessory is disabled", !!crown && crown.disabled === true);
  if (crown) {
    crown.click();
    check("customise", "locked accessory cannot be equipped",
      env.readState().accessory === "hat");
  }
  const mint = env.byId("petHueGrid").querySelector('[data-hue="mint"]');
  check("customise", "unlocked colour is selectable", !!mint && mint.disabled === false);
  if (mint) {
    mint.click();
    check("customise", "colour persists", env.readState().hue === "mint", env.readState().hue);
    check("customise", "widget reflects the colour",
      env.byId("petWidget").getAttribute("data-hue") === "mint");
  }
});

/* 24. petting combo ---------------------------------------------------- */
run("combo", () => {
  const env = boot({});
  adopt(env, "bracko", "Pip");
  const button = env.byId("petButton");
  button.click();
  env.timers.advance(950);
  button.click();
  env.timers.advance(950);
  button.click();
  check("combo", "combo bubble appears after repeats",
    env.byId("petCombo").hidden === false);
  check("combo", "combo count is rendered",
    env.byId("petCombo").textContent === "x3",
    env.byId("petCombo").textContent);
  check("combo", "combo milestone grants a treat",
    env.readState().treats === 4, String(env.readState().treats));
  check("combo", "best combo tracked", env.readState().bestCombo >= 3);
  check("combo", "combo status is a live region",
    env.byId("petCombo").getAttribute("role") === "status");
  env.timers.advance(3200);
  check("combo", "combo lapses after the window",
    env.byId("petCombo").hidden === true);
});

/* 25. achievements ----------------------------------------------------- */
run("achievements", () => {
  const env = boot({});
  adopt(env, "bracko", "Pip");
  check("achievements", "first pet unlocks on adoption",
    !!env.readState().achievements.firstPet);
  check("achievements", "unlock shows a toast", env.byId("petToast").hidden === false);
  check("achievements", "toast names the achievement",
    env.byId("petToast").textContent.length > 0 &&
      /Pip/.test(env.byId("petToast").textContent),
    env.byId("petToast").textContent);

  const fed = savedPet({ totalFeeds: 9, hunger: 50 });
  const fedEnv = boot({ store: storeWith(fed), now: fed.lastSeen });
  fedEnv.byId("petFeedBtn").click();
  check("achievements", "10th feed unlocks the achievement",
    !!fedEnv.readState().achievements.fed10);

  const level = savedPet({ xp: 650 });
  const levelEnv = boot({ store: storeWith(level), now: level.lastSeen });
  check("achievements", "level 10 unlocks the elder achievement",
    !!levelEnv.readState().achievements.level10 && !!levelEnv.readState().achievements.level5);

  const combo = boot({});
  adopt(combo, "bracko", "Pip");
  for (let index = 0; index < 5; index += 1) {
    combo.byId("petButton").click();
    combo.timers.advance(950);
  }
  check("achievements", "5x combo unlocks the achievement",
    !!combo.readState().achievements.combo5);
});

/* 26. streak / days visited -------------------------------------------- */
run("streak", () => {
  // Anchor at local noon so a +1h hop can never cross midnight on any host.
  const date = new Date(1757000000000);
  const now = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    12,
    0,
    0,
  ).getTime();
  const state = savedPet({
    lastDay: dayString(now - 86400000),
    streak: 2,
    daysVisited: 4,
    treats: 5,
    lastSeen: now,
  });
  const env = boot({ store: storeWith(state), now });
  const after = env.readState();
  check("streak", "streak increments on a new day", after.streak === 3, String(after.streak));
  check("streak", "days visited increments", after.daysVisited === 5, String(after.daysVisited));
  /* Escalation changed this: day 1..7 now pay 2,3,4,5,6,8,12 treats, so a
   * 3-day streak grants 4 (was a flat 2). Updated intentionally. */
  check("streak", "daily visit grants the escalating day-3 reward (4)",
    after.treats === 9, String(after.treats));
  check("streak", "3-day streak unlocks an achievement",
    !!after.achievements.streak3);
  env.byId("petStatsBtn").click();
  check("streak", "streak shown in the stats view",
    env.byId("petStatStreakValue").textContent === "3",
    env.byId("petStatStreakValue").textContent);

  const sameDay = boot({ store: storeWith(after), now: now + 3600000 });
  check("streak", "same day does not double count",
    sameDay.readState().daysVisited === 5,
    String(sameDay.readState().daysVisited));
});

/* 27. state migration from the OLD save format ------------------------- */
run("migration", () => {
  const old = {
    species: "quillop",
    name: "Legacy",
    happiness: 55,
    hunger: 30,
    energy: 65,
    xp: 10,
    lastSeen: 1757000000000,
    hidden: false,
  };
  let env = null;
  let threw = null;
  try {
    env = boot({ store: new Map([[PET_KEY, JSON.stringify(old)]]), now: 1757000000000 });
  } catch (error) {
    threw = error;
  }
  check("migration", "old save loads without throwing", !threw, threw && threw.message);
  if (env) {
    const state = env.readState();
    check("migration", "identity preserved",
      state.species === "quillop" && state.name === "Legacy", JSON.stringify(state));
    check("migration", "xp preserved", state.xp === 10, String(state.xp));
    check("migration", "treats defaulted", state.treats === 3, String(state.treats));
    check("migration", "tricks defaulted",
      Array.isArray(state.tricks) && state.tricks.length === 0);
    check("migration", "achievements defaulted",
      state.achievements && typeof state.achievements === "object");
    check("migration", "accessory defaulted", state.accessory === "none");
    check("migration", "colour defaulted", state.hue === "default");
    check("migration", "day counters defaulted",
      state.daysVisited === 1 && state.streak === 1);
    check("migration", "drag position defaulted", state.pos === "br");
    check("migration", "sound off by default", state.sound === false);
    check("migration", "counters defaulted",
      state.totalFeeds === 0 && state.bestCombo === 0 && state.miniGamesFinished === 0);
    check("migration", "usable straight after migration",
      (env.byId("petBrushBtn").click(), env.readState().totalBrush === 1));
    check("migration", "new fields are written back",
      Object.prototype.hasOwnProperty.call(env.readState(), "miniGamesFinished"));
  }

  const bad = savedPet({
    treats: -50,
    bestCombo: "abc",
    accessory: "dragon",
    hue: "rainbow",
    pos: "middle",
    daysVisited: 1e12,
    tricks: ["jump", "dragon", 42],
    achievements: { nope: 5, fed10: "x" },
  });
  let env2 = null;
  let threw2 = null;
  try {
    env2 = boot({ store: storeWith(bad), now: bad.lastSeen });
  } catch (error) {
    threw2 = error;
  }
  check("migration", "out-of-range new fields do not throw", !threw2, threw2 && threw2.message);
  if (env2) {
    const state = env2.readState();
    check("migration", "negative treats clamped", state.treats === 0, String(state.treats));
    check("migration", "huge day count clamped", state.daysVisited <= 1000000);
    check("migration", "unknown accessory rejected", state.accessory === "none");
    check("migration", "unknown colour rejected", state.hue === "default");
    check("migration", "unknown position rejected", state.pos === "br");
    check("migration", "unknown tricks filtered", state.tricks.join(",") === "jump",
      state.tricks.join(","));
    check("migration", "unknown achievements dropped",
      !state.achievements.nope && !!state.achievements.fed10 === false);
  }
});

/* 28. site awareness: page / cursor / idle / typing -------------------- */
run("awareness", () => {
  const greetEnv = boot({ store: storeWith(savedPet({ lastSeen: 1757000000000 })) });
  check("awareness", "loads with a contextual (time + page) greeting",
    /tidy some text/.test(greetEnv.byId("petStatus").textContent),
    greetEnv.byId("petStatus").textContent);

  const pageEnv = boot({ page: "punctuation" });
  adopt(pageEnv, "bracko", "Pip");
  pageEnv.byId("petTalkBtn").click();
  check("awareness", "talk references the current page",
    /punctuation marks/i.test(pageEnv.byId("petStatus").textContent),
    pageEnv.byId("petStatus").textContent);

  const cursorEnv = boot({});
  adopt(cursorEnv, "bracko", "Pip");
  cursorEnv.dispatch(cursorEnv.document, "pointermove", { clientX: 1000, clientY: 700 });
  check("awareness", "pointer tracking writes a look offset",
    cursorEnv.byId("petWidget").style.getPropertyValue("--pet-look-x") !== "",
    cursorEnv.byId("petWidget").style.getPropertyValue("--pet-look-x"));

  const stillEnv = boot({
    store: new Map([["motion-level", "off"]]),
    motion: "off",
  });
  adopt(stillEnv, "bracko", "Pip");
  stillEnv.dispatch(stillEnv.document, "pointermove", { clientX: 1000, clientY: 700 });
  check("awareness", "pointer tracking disabled under reduced motion",
    stillEnv.byId("petWidget").style.getPropertyValue("--pet-look-x") === "");

  const idleEnv = boot({});
  adopt(idleEnv, "bracko", "Pip");
  idleEnv.timers.advance(4 * 60 * 1000);
  check("awareness", "pet falls asleep when idle",
    idleEnv.byId("petWidget").getAttribute("data-asleep") === "true",
    idleEnv.byId("petWidget").getAttribute("data-asleep"));
  idleEnv.byId("petBrushBtn").click();
  check("awareness", "an interaction wakes the pet",
    idleEnv.byId("petWidget").getAttribute("data-asleep") === "false");

  const typingEnv = createEnvironment({});
  seedToolDom(typingEnv);
  typingEnv.load(appSource);
  typingEnv.domReady();
  adopt(typingEnv, "bracko", "Pip");
  const textarea = typingEnv.byId("inputText");
  textarea.value = "hello world";
  const notPrevented = typingEnv.dispatch(textarea, "input", {});
  check("awareness", "typing event is not intercepted", notPrevented === true);
  check("awareness", "pet reacts to typing",
    /typing/i.test(typingEnv.byId("petStatus").textContent),
    typingEnv.byId("petStatus").textContent);
  check("awareness", "textarea content is never modified",
    textarea.value === "hello world", textarea.value);
});

/* 29. mini-game: Treat Toss -------------------------------------------- */
run("treat-toss", () => {
  const env = boot({});
  adopt(env, "bracko", "Pip");
  env.byId("petGamesBtn").click();
  check("treat-toss", "games view opens", env.byId("petGamesView").hidden === false);
  check("treat-toss", "game menu offered", env.byId("petGameMenu").hidden === false);
  env.byId("petGameTossStart").click();
  check("treat-toss", "toss board built", !!env.queryAll(".pet-game-toss").length);
  check("treat-toss", "menu hidden while playing", env.byId("petGameMenu").hidden === true);
  check("treat-toss", "exit control shown", env.byId("petGameExitBtn").hidden === false);
  check("treat-toss", "loop is running while active",
    env.timers.pendingTimeouts() > 0, String(env.timers.pendingTimeouts()));

  const treatBtn = env.byId("petGameTossBtn");
  const treatsBefore = env.readState().treats;
  for (let round = 0; round < 5; round += 1) {
    if (round > 0) {
      env.timers.advance(620); // let the next round begin
    }
    env.timers.advance(700); // marker reaches the centre
    treatBtn.click();
  }
  const state = env.readState();
  check("treat-toss", "five rounds scored", /Treat Toss/.test(env.byId("petGameResult").textContent),
    env.byId("petGameResult").textContent);
  check("treat-toss", "mini-game finish is recorded", state.miniGamesFinished === 1);
  check("treat-toss", "treats awarded", state.treats > treatsBefore,
    `${treatsBefore} -> ${state.treats}`);
  check("treat-toss", "xp awarded", state.xp > 0, String(state.xp));
  check("treat-toss", "mini-game achievement unlocked",
    !!state.achievements.miniWin);
  env.timers.advance(6000);
  check("treat-toss", "no timers leak after the game finishes",
    env.timers.pendingTimeouts() === 0, String(env.timers.pendingTimeouts()));
  check("treat-toss", "single decay interval still running",
    env.timers.pendingIntervals() === 1, String(env.timers.pendingIntervals()));

  env.byId("petGameExitBtn").click();
  check("treat-toss", "exit clears the board", env.queryAll(".pet-game-toss").length === 0);
  check("treat-toss", "exit restores the menu", env.byId("petGameMenu").hidden === false);
  check("treat-toss", "exit hides the exit button", env.byId("petGameExitBtn").hidden === true);
  check("treat-toss", "no timers leak after exit",
    env.timers.pendingTimeouts() === 0, String(env.timers.pendingTimeouts()));

  // Escape leaves a running game
  env.byId("petGameTossStart").click();
  env.timers.advance(200);
  env.dispatch(env.byId("petGamesView"), "keydown", { key: "Escape" });
  check("treat-toss", "Escape exits the mini-game",
    env.queryAll(".pet-game-toss").length === 0);
  check("treat-toss", "Escape leaves no timers",
    env.timers.pendingTimeouts() === 0, String(env.timers.pendingTimeouts()));

  // tab hidden stops the loop
  env.byId("petGameTossStart").click();
  env.timers.advance(120);
  env.setHidden(true);
  env.fireDocument("visibilitychange");
  check("treat-toss", "tab hidden stops and clears the mini-game",
    env.queryAll(".pet-game-toss").length === 0 && env.timers.pendingTimeouts() === 0,
    String(env.timers.pendingTimeouts()));
  env.setHidden(false);
  env.fireDocument("visibilitychange");
  check("treat-toss", "returning restarts the decay interval",
    env.timers.pendingIntervals() === 1, String(env.timers.pendingIntervals()));

  // leaving the games view through Back must also stop the loop
  env.byId("petGameTossStart").click();
  env.timers.advance(200);
  env.byId("petBackGames").click();
  check("treat-toss", "Back out of the games view stops the mini-game",
    env.queryAll(".pet-game-toss").length === 0 &&
      env.timers.pendingTimeouts() === 0,
    String(env.timers.pendingTimeouts()));

  // Hide stops the loop too
  env.byId("petGamesBtn").click();
  env.byId("petGameTossStart").click();
  env.byId("petHideBtn").click();
  check("treat-toss", "hiding clears the mini-game and its timers",
    env.queryAll(".pet-game-toss").length === 0 &&
      env.timers.pendingTimeouts() === 0 &&
      env.timers.pendingIntervals() === 0,
    `${env.timers.pendingTimeouts()} / ${env.timers.pendingIntervals()}`);
});

/* 30. mini-game: Trick Trainer ----------------------------------------- */
run("trick-trainer", () => {
  const env = boot({});
  adopt(env, "bracko", "Pip");
  env.byId("petGamesBtn").click();
  env.byId("petGameSimonStart").click();
  const host = env.byId("petGameHost").querySelector(".pet-game-simon");
  check("trick-trainer", "sequence board built", !!host);
  check("trick-trainer", "loop timers pending during playback",
    env.timers.pendingTimeouts() > 0, String(env.timers.pendingTimeouts()));

  env.timers.advance(4000); // let playback finish
  check("trick-trainer", "playback hands control to the player",
    host.getAttribute("data-watching") === "false",
    host.getAttribute("data-watching"));
  const sequence = host.getAttribute("data-sequence").split(",");
  check("trick-trainer", "sequence uses the four tricks",
    sequence.every((trick) => ["jump", "spin", "sing", "wave"].includes(trick)),
    sequence.join(","));

  const treatsBefore = env.readState().treats;
  sequence.forEach((trick) => {
    host.querySelector('[data-trick="' + trick + '"]').click();
  });
  check("trick-trainer", "repeating the sequence grows it",
    env.readState().treats === treatsBefore + 1,
    `${treatsBefore} -> ${env.readState().treats}`);
  env.timers.advance(4000);
  const longer = host.getAttribute("data-sequence").split(",");
  check("trick-trainer", "sequence lengthens after a success",
    longer.length === sequence.length + 1,
    `${sequence.length} -> ${longer.length}`);

  // deliberately fail the next sequence
  env.timers.advance(4000);
  const expected = host.getAttribute("data-sequence").split(",");
  const wrong = ["jump", "spin", "sing", "wave"].find((trick) => trick !== expected[0]);
  host.querySelector('[data-trick="' + wrong + '"]').click();
  check("trick-trainer", "a wrong input ends the game",
    /Trick Trainer/.test(env.byId("petGameResult").textContent),
    env.byId("petGameResult").textContent);
  check("trick-trainer", "the failed attempt is recorded",
    env.readState().miniGamesFinished === 1);
  env.timers.advance(6000);
  check("trick-trainer", "no timers leak after the game ends",
    env.timers.pendingTimeouts() === 0, String(env.timers.pendingTimeouts()));

  env.byId("petGameExitBtn").click();
  check("trick-trainer", "exit clears the board",
    env.queryAll(".pet-game-simon").length === 0);
  check("trick-trainer", "exit leaves no timers",
    env.timers.pendingTimeouts() === 0, String(env.timers.pendingTimeouts()));
});

/* 31. reduced motion keeps the mini-games playable --------------------- */
run("reduced-motion-games", () => {
  const env = boot({
    store: new Map([["motion-level", "off"]]),
    motion: "off",
  });
  adopt(env, "bracko", "Pip");
  env.byId("petGamesBtn").click();
  env.byId("petGameTossStart").click();
  env.timers.advance(700);
  env.byId("petGameTossBtn").click();
  check("reduced-motion-games", "toss is still playable with motion off",
    /Perfect|Nice|Okay|Missed/.test(env.byId("petGameResult").textContent),
    env.byId("petGameResult").textContent);
  check("reduced-motion-games", "no particles spawned with motion off",
    env.queryAll(".pet-particle").length === 0);
  env.byId("petGameExitBtn").click();
  env.timers.advance(6000);
  check("reduced-motion-games", "no timers leak with motion off",
    env.timers.pendingTimeouts() === 0, String(env.timers.pendingTimeouts()));
});

/* 32. a real game still works with the pet mounted (game awareness) ---- */
run("game-awareness", () => {
  const env = createEnvironment({
    motion: "off",
    store: new Map([["motion-level", "off"]]),
  });
  seedToolDom(env);
  seedGameDom(env);
  const initError = (env.load(appSource), env.domReady());
  check("game-awareness", "page boots with games and pet together", !initError,
    initError && initError.message);
  adopt(env, "bracko", "Pip");
  const treatsBefore = env.readState().treats;
  const xpBefore = env.readState().xp;
  env.byId("reflexStartBtn").click();
  env.timers.advance(4000);
  env.byId("reflexPad").click();
  check("game-awareness", "the game still reports its result",
    env.byId("reflexResult").textContent.length > 0,
    env.byId("reflexResult").textContent);
  const after = env.readState();
  check("game-awareness", "a new best rewards the pet with treats",
    after.treats === treatsBefore + 2, `${treatsBefore} -> ${after.treats}`);
  check("game-awareness", "the pet gains xp from the game",
    after.xp === xpBefore + 6, `${xpBefore} -> ${after.xp}`);
  check("game-awareness", "the pet cheers in its status line",
    env.byId("petStatus").textContent.length > 0 &&
      /Pip/.test(env.byId("petStatus").textContent),
    env.byId("petStatus").textContent);
  check("game-awareness", "best score still persisted by the game",
    env.store.get("reflex-tap-best") !== undefined,
    String(env.store.get("reflex-tap-best")));
});

/* 33. new controls are accessible -------------------------------------- */
run("a11y-new", () => {
  const env = boot({});
  adopt(env, "bracko", "Pip");
  const ids = [
    "petTreatBtn", "petBrushBtn", "petTalkBtn", "petTricksBtn",
    "petGamesBtn", "petStatsBtn", "petSoundBtn",
  ];
  const tags = ids.map((id) => env.byId(id).tagName);
  check("a11y-new", "new action controls are native buttons",
    tags.every((tag) => tag === "BUTTON"), JSON.stringify(tags));
  check("a11y-new", "new action controls have accessible names",
    ids.every((id) => !!env.byId(id).getAttribute("data-i18n")));
  check("a11y-new", "mini-game result is a live region",
    env.byId("petGameResult").getAttribute("role") === "status" &&
      env.byId("petGameResult").getAttribute("aria-live") === "polite");
  check("a11y-new", "toast is a live region",
    env.byId("petToast").getAttribute("role") === "status");
  check("a11y-new", "drag handle is labelled",
    !!env.byId("petHead").getAttribute("aria-label"));
  check("a11y-new", "pet is still a real button",
    env.byId("petButton").tagName === "BUTTON");
});

/* 34. draggable widget snaps to a persisted corner --------------------- */
run("drag", () => {
  const env = boot({});
  adopt(env, "bracko", "Pip");
  check("drag", "default corner is bottom-right",
    env.byId("petWidget").getAttribute("data-corner") === "br");
  const head = env.byId("petHead");
  env.dispatch(head, "pointerdown", { button: 0, clientX: 1200, clientY: 760 });
  env.dispatch(env.document, "pointermove", { clientX: 80, clientY: 60 });
  env.dispatch(env.document, "pointerup", { clientX: 80, clientY: 60 });
  check("drag", "dragging persists the nearest corner",
    env.readState().pos === "tl", env.readState().pos);
  check("drag", "widget reflects the new corner",
    env.byId("petWidget").getAttribute("data-corner") === "tl");

  const reloaded = boot({ store: storeWith(env.readState()), now: env.clock.now });
  check("drag", "corner survives a reload",
    reloaded.byId("petWidget").getAttribute("data-corner") === "tl",
    reloaded.byId("petWidget").getAttribute("data-corner"));

  // a mini-game open must not start a drag
  env.byId("petGamesBtn").click();
  env.byId("petGameTossStart").click();
  const before = env.readState().pos;
  env.dispatch(env.byId("petHead"), "pointerdown", { button: 0, clientX: 1200, clientY: 760 });
  env.dispatch(env.document, "pointermove", { clientX: 60, clientY: 60 });
  env.dispatch(env.document, "pointerup", { clientX: 60, clientY: 60 });
  check("drag", "dragging is ignored while a mini-game is open",
    env.readState().pos === before, `${before} -> ${env.readState().pos}`);
  env.byId("petGameExitBtn").click();
});

/* 35. optional sound (off by default, no external assets) -------------- */
run("sound", () => {
  const env = boot({});
  adopt(env, "bracko", "Pip");
  check("sound", "sound is off by default", env.readState().sound === false);
  env.byId("petSoundBtn").click();
  check("sound", "sound can be toggled on", env.readState().sound === true);
  check("sound", "toggle is announced",
    /Sound on/.test(env.byId("petStatus").textContent),
    env.byId("petStatus").textContent);
  env.byId("petButton").click();
  check("sound", "enabled sound does not throw without an AudioContext",
    true);
  env.byId("petSoundBtn").click();
  check("sound", "sound can be toggled off", env.readState().sound === false);
});

/* 36. six games still wire their cheer into the pet -------------------- */
run("game-wiring", () => {
  check("game-wiring", "petNotifyGame is defined once and called by all six games",
    (appSource.match(/petNotifyGame\(/g) || []).length >= 7,
    String((appSource.match(/petNotifyGame\(/g) || []).length));
  check("game-wiring", "reflex best key untouched",
    appSource.includes('reflex-tap-best'));
  check("game-wiring", "caret dash best key untouched",
    appSource.includes('caret-dash-best'));
  check("game-wiring", "elements best key present",
    appSource.includes('elements-best'));
});

/* 37. Trick Trainer announces exactly the treats it actually grants ---- */
run("treat-accounting", () => {
  function playSuccesses(env, successes) {
    env.byId("petGamesBtn").click();
    env.byId("petGameSimonStart").click();
    const host = env.byId("petGameHost").querySelector(".pet-game-simon");
    env.timers.advance(4000); // finish the first playback
    for (let round = 0; round < successes; round += 1) {
      const sequence = host.getAttribute("data-sequence").split(",");
      sequence.forEach((trick) => {
        host.querySelector('[data-trick="' + trick + '"]').click();
      });
      env.timers.advance(12000); // grow the sequence, then play it back
    }
    return host;
  }

  [0, 1, 2, 4, 5].forEach((successes) => {
    const env = boot({});
    adopt(env, "bracko", "Pip");
    const treatsBefore = env.readState().treats;
    const host = playSuccesses(env, successes);
    const expected = host.getAttribute("data-sequence").split(",");
    const wrong = ["jump", "spin", "sing", "wave"].find(
      (trick) => trick !== expected[0],
    );
    host.querySelector('[data-trick="' + wrong + '"]').click();
    const announced = /\+(\d+)\s+treats/.exec(
      env.byId("petGameResult").textContent,
    );
    const granted = env.readState().treats - treatsBefore;
    check(
      "treat-accounting",
      `${successes} successes: announced treats equal the balance change`,
      !!announced && Number(announced[1]) === granted,
      `announced=${announced && announced[1]} granted=${granted}`,
    );
    check(
      "treat-accounting",
      `${successes} successes: at least the per-round treats landed`,
      granted >= successes,
      `granted=${granted}`,
    );
  });
});

/* 38. the drag handle changes corners from the keyboard ---------------- */
run("keyboard-corner", () => {
  const env = boot({});
  adopt(env, "bracko", "Pip");
  const head = env.byId("petHead");
  check("keyboard-corner", "drag handle is keyboard focusable",
    head.getAttribute("tabindex") === "0");
  check("keyboard-corner", "drag handle has an accessible name",
    !!head.getAttribute("aria-label"));
  check("keyboard-corner", "starts bottom-right",
    env.byId("petWidget").getAttribute("data-corner") === "br");

  env.dispatch(head, "keydown", { key: "ArrowLeft" });
  check("keyboard-corner", "ArrowLeft moves to the left column",
    env.byId("petWidget").getAttribute("data-corner") === "bl",
    env.byId("petWidget").getAttribute("data-corner"));
  check("keyboard-corner", "keyboard move is persisted",
    env.readState().pos === "bl", env.readState().pos);

  env.dispatch(head, "keydown", { key: "ArrowUp" });
  check("keyboard-corner", "ArrowUp moves to the top row",
    env.byId("petWidget").getAttribute("data-corner") === "tl",
    env.byId("petWidget").getAttribute("data-corner"));

  const reloaded = boot({ store: storeWith(env.readState()), now: env.clock.now });
  check("keyboard-corner", "keyboard-chosen corner survives a reload",
    reloaded.byId("petWidget").getAttribute("data-corner") === "tl",
    reloaded.byId("petWidget").getAttribute("data-corner"));

  env.dispatch(head, "keydown", { key: "ArrowUp" });
  env.dispatch(head, "keydown", { key: "ArrowLeft" });
  check("keyboard-corner", "arrow keys at the edge are a safe no-op",
    env.readState().pos === "tl", env.readState().pos);

  env.dispatch(head, "pointerdown", { button: 0, clientX: 80, clientY: 760 });
  env.dispatch(env.document, "pointermove", { clientX: 1200, clientY: 60 });
  env.dispatch(env.document, "pointerup", { clientX: 1200, clientY: 60 });
  check("keyboard-corner", "pointer drag still snaps to a corner",
    env.readState().pos === "tr", env.readState().pos);
  check("keyboard-corner", "widget reflects the dragged corner",
    env.byId("petWidget").getAttribute("data-corner") === "tr");
});

/* 39. Escape is deterministic: game -> menu, else close the panel ------- */
run("escape", () => {
  const env = boot({});
  adopt(env, "bracko", "Pip");

  env.dispatch(env.byId("petWidget"), "keydown", { key: "Escape" });
  check("escape", "Escape closes the panel when no mini-game is open",
    env.byId("petPanel").hidden === true);
  check("escape", "closing reveals the restore pill",
    env.byId("petRestoreBtn").hidden === false);
  check("escape", "closing is persisted", env.readState().hidden === true);
  check("escape", "focus lands on the restore control",
    env.document.activeElement === env.byId("petRestoreBtn"));

  env.dispatch(env.byId("petWidget"), "keydown", { key: "Escape" });
  check("escape", "Escape is a no-op while the panel is already closed",
    env.byId("petPanel").hidden === true &&
      env.byId("petRestoreBtn").hidden === false);

  env.byId("petRestoreBtn").click();
  check("escape", "the restore pill reopens the panel",
    env.byId("petPanel").hidden === false);

  env.byId("petGamesBtn").click();
  env.byId("petGameTossStart").click();
  env.dispatch(env.byId("petGamesView"), "keydown", { key: "Escape" });
  check("escape", "Escape exits a running mini-game",
    env.queryAll(".pet-game-toss").length === 0);
  check("escape", "the pet panel stays open after leaving the mini-game",
    env.byId("petPanel").hidden === false &&
      env.byId("petGamesView").hidden === false);
  check("escape", "focus returns to the game menu",
    env.document.activeElement === env.byId("petGameTossStart"));

  // Finish a game, then Escape must still be meaningful (was a no-op).
  env.byId("petGameTossStart").click();
  for (let round = 0; round < 5; round += 1) {
    if (round > 0) {
      env.timers.advance(620);
    }
    env.timers.advance(700);
    env.byId("petGameTossBtn").click();
  }
  check("escape", "the mini-game reports a finished result",
    /Treat Toss/.test(env.byId("petGameResult").textContent),
    env.byId("petGameResult").textContent);
  env.dispatch(env.byId("petGameExitBtn"), "keydown", { key: "Escape" });
  check("escape", "Escape after a finished mini-game closes the panel",
    env.byId("petPanel").hidden === true);
  check("escape", "the finished game left no timers behind",
    env.timers.pendingTimeouts() === 0, String(env.timers.pendingTimeouts()));
});

/* 40. care attention / grace window ------------------------------------ */
run("attention", () => {
  const now = localStamp(2025, 8, 10, 12); // local noon, any host timezone
  const store = new Map([
    [
      PET_KEY,
      JSON.stringify(
        savedPet({
          hunger: 86,
          happiness: 70,
          energy: 70,
          lastDay: dayString(now),
          lastSeen: now,
          careMistakes: 0,
        }),
      ),
    ],
    ["motion-level", "off"],
  ]);
  const env = boot({ store, motion: "off", now });
  const attentionAttr = () => env.byId("petWidget").getAttribute("data-attention");

  check("attention", "an extreme need arms the attention state",
    attentionAttr() === "hunger", String(attentionAttr()));
  check("attention", "attention has a visible signal",
    env.byId("petAttention").hidden === false &&
      env.byId("petAttention").textContent.length > 0,
    env.byId("petAttention").textContent);
  check("attention", "arriving with an extreme need logs nothing yet",
    env.readState().careMistakes === 0, String(env.readState().careMistakes));

  env.timers.advance(10 * 60 * 1000); // inside the 15 min grace window
  check("attention", "no mistake inside the grace window",
    env.readState().careMistakes === 0, String(env.readState().careMistakes));
  check("attention", "the status line names the need",
    /starving|feed/i.test(env.byId("petStatus").textContent),
    env.byId("petStatus").textContent);

  env.timers.advance(5 * 60 * 1000); // the deadline lands exactly on a tick
  check("attention", "exactly one mistake after the window expires",
    env.readState().careMistakes === 1, String(env.readState().careMistakes));
  check("attention", "the mistake is announced once",
    /care mistake/i.test(env.byId("petStatus").textContent),
    env.byId("petStatus").textContent);

  env.timers.advance(30 * 60 * 1000); // same unaddressed episode
  check("attention", "the episode never logs a second mistake",
    env.readState().careMistakes === 1, String(env.readState().careMistakes));

  // tend the need -> the episode clears
  env.byId("petFeedBtn").click();
  env.timers.advance(60 * 1000);
  check("attention", "feeding clears the attention signal",
    attentionAttr() === null, String(attentionAttr()));
  const afterFeed = env.readState().careMistakes;
  env.timers.advance(20 * 60 * 1000);
  check("attention", "a satisfied need does not re-log the old episode",
    env.readState().careMistakes === afterFeed, String(env.readState().careMistakes));

  // drop again -> a fresh episode arms, then logs exactly one more
  env.timers.advance(130 * 60 * 1000);
  check("attention", "dropping again re-arms the need",
    attentionAttr() === "hunger", String(attentionAttr()));
  check("attention", "re-arming alone logs nothing new",
    env.readState().careMistakes === afterFeed, String(env.readState().careMistakes));
  env.timers.advance(20 * 60 * 1000);
  check("attention", "the fresh episode logs exactly one more",
    env.readState().careMistakes === afterFeed + 1,
    String(env.readState().careMistakes));
});

/* 41. escalating streak + 7-day exclusive ------------------------------ */
run("streak-escalation", () => {
  const now = localStamp(2025, 8, 10, 12);

  let env = boot({
    store: storeWith(
      savedPet({
        lastDay: dayString(now - 86400000),
        streak: 1,
        treats: 3,
        lastSeen: now,
      }),
    ),
    now,
  });
  check("streak-escalation", "day 2 pays the escalating 3 treats",
    env.readState().treats === 6, String(env.readState().treats));
  check("streak-escalation", "the streak line is shown",
    /streak/i.test(env.byId("petStatus").textContent),
    env.byId("petStatus").textContent);

  env = boot({
    store: storeWith(
      savedPet({
        lastDay: dayString(now - 86400000),
        streak: 6,
        treats: 3,
        lastSeen: now,
      }),
    ),
    now,
  });
  const state = env.readState();
  check("streak-escalation", "day 7 pays the big reward (12)",
    state.treats === 15, String(state.treats));
  check("streak-escalation", "day 7 unlocks the exclusive",
    !!(state.streakUnlocks && state.streakUnlocks.week7),
    JSON.stringify(state.streakUnlocks));
  check("streak-escalation", "the exclusive is actually applied",
    state.accessory === "medal", String(state.accessory));
  check("streak-escalation", "the widget shows the medal",
    env.byId("petWidget").getAttribute("data-acc") === "medal",
    String(env.byId("petWidget").getAttribute("data-acc")));
  check("streak-escalation", "the unlock is announced",
    /medal/i.test(env.byId("petStatus").textContent),
    env.byId("petStatus").textContent);

  const reloaded = boot({ store: storeWith(state), now: now + 1000 });
  check("streak-escalation", "the exclusive survives a reload",
    !!reloaded.readState().streakUnlocks.week7 &&
      reloaded.byId("petWidget").getAttribute("data-acc") === "medal");
  reloaded.byId("petStatsBtn").click();
  const medal = reloaded.byId("petAccGrid").querySelector('[data-acc="medal"]');
  check("streak-escalation", "the medal becomes selectable once earned",
    !!medal && medal.disabled === false);
  const crown = reloaded.byId("petAccGrid").querySelector('[data-acc="crown"]');
  check("streak-escalation", "level-locked accessories stay gated",
    !!crown && crown.disabled === true);
});

/* 42. streak repair (affordable / decline / unaffordable) -------------- */
run("streak-repair", () => {
  const now = localStamp(2025, 8, 10, 12);
  const missed = dayString(now - 2 * 86400000);

  let env = boot({
    store: storeWith(
      savedPet({ lastDay: missed, streak: 4, treats: 5, lastSeen: now }),
    ),
    now,
  });
  check("streak-repair", "a missed day offers a repair",
    env.byId("petRepair").hidden === false);
  check("streak-repair", "the offer names the streak and the cost",
    /4/.test(env.byId("petRepairText").textContent) &&
      /3/.test(env.byId("petRepairText").textContent),
    env.byId("petRepairText").textContent);
  check("streak-repair", "the streak is preserved while undecided",
    env.readState().streak === 4 && env.readState().repairStreak === 4,
    JSON.stringify(env.readState()));
  check("streak-repair", "repair has its own labelled control",
    env.byId("petRepairBtn").tagName === "BUTTON" &&
      env.byId("petRepairBtn").textContent.length > 0,
    env.byId("petRepairBtn").textContent);
  env.byId("petRepairBtn").click();
  const repaired = env.readState();
  check("streak-repair", "repair spends 3 treats then pays day-5 (6)",
    repaired.treats === 8, String(repaired.treats));
  check("streak-repair", "repair continues the streak",
    repaired.streak === 5 && repaired.repairStreak === 0, JSON.stringify(repaired));
  check("streak-repair", "the offer closes after repairing",
    env.byId("petRepair").hidden === true);
  check("streak-repair", "repair is announced",
    /saved|streak/i.test(env.byId("petStatus").textContent),
    env.byId("petStatus").textContent);

  env = boot({
    store: storeWith(
      savedPet({ lastDay: missed, streak: 4, treats: 5, lastSeen: now }),
    ),
    now,
  });
  env.byId("petRepairDeclineBtn").click();
  const reset = env.readState();
  check("streak-repair", "declining resets the streak",
    reset.streak === 1 && reset.repairStreak === 0, JSON.stringify(reset));
  check("streak-repair", "declining still pays the day-1 reward (2)",
    reset.treats === 7, String(reset.treats));

  env = boot({
    store: storeWith(
      savedPet({ lastDay: missed, streak: 4, treats: 2, lastSeen: now }),
    ),
    now,
  });
  check("streak-repair", "an unaffordable miss never offers a repair",
    env.byId("petRepair").hidden === true);
  check("streak-repair", "an unaffordable miss resets the streak",
    env.readState().streak === 1, String(env.readState().streak));
  check("streak-repair", "an unaffordable miss pays the day-1 reward (2)",
    env.readState().treats === 4, String(env.readState().treats));
});

/* 43. welcome back: threshold, scaling, cap, honesty ------------------- */
run("welcome-back", () => {
  const now = localStamp(2025, 8, 10, 12);
  const today = dayString(now);
  function awayEnv(hours) {
    return boot({
      store: storeWith(
        savedPet({ lastDay: today, lastSeen: now - hours * 3600000 }),
      ),
      now,
    });
  }

  const brief = awayEnv(0.4); // 24 min: under the 30 min threshold
  check("welcome-back", "a short absence is not a welcome-back event",
    brief.readState().treats === 3, String(brief.readState().treats));

  [
    [1, 1],
    [2, 2],
    [4, 4],
    [12, 5],
  ].forEach(([hours, treats]) => {
    const env = awayEnv(hours);
    check("welcome-back", `${hours}h away pays ${treats} treats`,
      env.readState().treats === 3 + treats, String(env.readState().treats));
    check("welcome-back", `${hours}h away gets a local, personal line`,
      /away|welcome back|missed/i.test(env.byId("petStatus").textContent) &&
        /Pip/.test(env.byId("petStatus").textContent),
      env.byId("petStatus").textContent);
    check("welcome-back", `${hours}h line never implies a server or players`,
      !/server|online|player/i.test(env.byId("petStatus").textContent),
      env.byId("petStatus").textContent);
  });

  const capped = awayEnv(24); // far beyond the 12h decay cap
  check("welcome-back", "the reward is capped by the 12h decay cap",
    capped.readState().treats === 8, String(capped.readState().treats));
});

/* 44. petting energy tension (cooldown still intact) ------------------- */
run("petting-tension", () => {
  const env = boot({});
  adopt(env, "bracko", "Pip");
  const button = env.byId("petButton");
  const energy0 = env.readState().energy;

  button.click();
  check("petting-tension", "the first pet still gives the full +6",
    env.readState().happiness === 78, String(env.readState().happiness));
  check("petting-tension", "petting draws a little energy",
    env.readState().energy === energy0 - 1, String(env.readState().energy));

  button.click(); // inside the cooldown
  check("petting-tension", "the cooldown still blocks spam",
    env.readState().energy === energy0 - 1 &&
      env.readState().happiness === 78,
    JSON.stringify(env.readState()));

  const gains = [];
  const costs = [];
  for (let index = 0; index < 4; index += 1) {
    env.timers.advance(1000);
    const before = env.readState();
    button.click();
    const after = env.readState();
    gains.push(after.happiness - before.happiness);
    costs.push(before.energy - after.energy);
  }
  check("petting-tension", "happiness gains diminish across a fast combo",
    gains.join(",") === "6,6,5,4", gains.join(","));
  check("petting-tension", "energy costs stay gentle but grow",
    costs.join(",") === "1,1,1,2", costs.join(","));
  check("petting-tension", "mashing is not free: energy is drawn down",
    env.readState().energy === energy0 - 6, String(env.readState().energy));
});

/* 45. tiered verbal words ---------------------------------------------- */
run("word-tiers", () => {
  const now = localStamp(2025, 8, 10, 12);
  const today = dayString(now);
  function wordsEnv(stats) {
    return boot({
      store: storeWith(
        savedPet(Object.assign({ lastDay: today, lastSeen: now }, stats)),
      ),
      now,
      motion: "off",
    });
  }

  [
    [90, "Famished"],
    [70, "Hungry"],
    [50, "Fine"],
    [20, "Full"],
    [5, "Bloated"],
  ].forEach(([hunger, word]) => {
    const env = wordsEnv({ hunger, happiness: 70, energy: 70 });
    env.byId("petStatsBtn").click();
    check("word-tiers", `hunger ${hunger} reads "${word}"`,
      env.byId("petStatHungerValue").textContent === word,
      env.byId("petStatHungerValue").textContent);
  });

  [
    [90, "Delighted"],
    [70, "Content"],
    [45, "So-so"],
    [20, "Glum"],
    [5, "Miserable"],
  ].forEach(([happiness, word]) => {
    const env = wordsEnv({ hunger: 20, happiness, energy: 70 });
    env.byId("petStatsBtn").click();
    check("word-tiers", `happiness ${happiness} reads "${word}"`,
      env.byId("petStatMoodValue").textContent === word,
      env.byId("petStatMoodValue").textContent);
  });

  const stats = wordsEnv({ hunger: 50, happiness: 70, energy: 70 });
  stats.byId("petStatsBtn").click();
  check("word-tiers", "care mistakes are surfaced in the stats view",
    stats.byId("petStatCareMistakesValue").textContent === "0",
    stats.byId("petStatCareMistakesValue").textContent);
});

/* 46. idle emote: throttling + reduced motion + cleanup ---------------- */
run("emote", () => {
  /* Anchor at local afternoon so the pet is awake (not night-sleeping). */
  const noon = localStamp(2025, 8, 10, 14);
  const env = boot({ now: noon });
  adopt(env, "bracko", "Pip");
  check("emote", "no bubble right after adopting",
    env.byId("petEmote").hidden === true);
  check("emote", "the bubble is a polite live region",
    env.byId("petEmote").getAttribute("role") === "status" &&
      env.byId("petEmote").getAttribute("aria-live") === "polite");

  env.timers.advance(3 * 60 * 1000);
  check("emote", "an idle bubble appears after the throttle window",
    env.byId("petEmote").hidden === false &&
      env.byId("petEmote").textContent.length > 0,
    env.byId("petEmote").textContent);
  check("emote", "the bubble is contextual (kaomoji from mood)",
    /^\(/.test(env.byId("petEmote").textContent),
    env.byId("petEmote").textContent);
  check("emote", "full motion uses the pop animation class",
    env.byId("petEmote").classList.contains("is-pop") === true,
    env.byId("petEmote").classList.value);

  env.timers.advance(10 * 1000);
  check("emote", "the bubble hides itself again",
    env.byId("petEmote").hidden === true);
  env.timers.advance(60 * 1000);
  check("emote", "no second bubble inside the throttle window",
    env.byId("petEmote").hidden === true);
  env.byId("petBrushBtn").click(); // wake it for the next beat
  env.timers.advance(110 * 1000);
  check("emote", "the next throttled beat does fire",
    env.byId("petEmote").hidden === false,
    env.byId("petEmote").textContent);

  const still = boot({
    store: new Map([["motion-level", "off"]]),
    motion: "off",
    now: noon,
  });
  adopt(still, "bracko", "Pip");
  still.timers.advance(3 * 60 * 1000);
  check("emote", "reduced motion still shows the text bubble",
    still.byId("petEmote").hidden === false &&
      still.byId("petEmote").textContent.length > 0,
    still.byId("petEmote").textContent);
  check("emote", "reduced motion never pops the bubble",
    still.byId("petEmote").classList.contains("is-pop") === false);

  const collapsed = boot({ now: noon });
  adopt(collapsed, "bracko", "Pip");
  collapsed.timers.advance(3 * 60 * 1000);
  check("emote", "a bubble owns a timer only while on screen",
    collapsed.timers.pendingTimeouts() > 0,
    String(collapsed.timers.pendingTimeouts()));
  collapsed.byId("petCollapseBtn").click();
  check("emote", "collapsing clears the bubble and its timer",
    collapsed.byId("petEmote").hidden === true &&
      collapsed.timers.pendingTimeouts() === 0,
    String(collapsed.timers.pendingTimeouts()));

  const hidden = boot({ now: noon });
  adopt(hidden, "bracko", "Pip");
  hidden.timers.advance(3 * 60 * 1000);
  hidden.setHidden(true);
  hidden.fireDocument("visibilitychange");
  check("emote", "hiding the tab clears the bubble and its timer",
    hidden.byId("petEmote").hidden === true &&
      hidden.timers.pendingTimeouts() === 0,
    String(hidden.timers.pendingTimeouts()));
});

/* 47. time of day / season / date-specific lines ----------------------- */
run("time-and-season", () => {
  function at(year, monthIndex, day, hour) {
    const now = localStamp(year, monthIndex, day, hour);
    return boot({
      store: storeWith(savedPet({ lastDay: dayString(now), lastSeen: now })),
      now,
    });
  }

  [
    [0, "winter"],
    [3, "spring"],
    [6, "summer"],
    [9, "autumn"],
  ].forEach(([monthIndex, season]) => {
    const env = at(2025, monthIndex, 15, 12);
    check("time-and-season", `month ${monthIndex + 1} wears the ${season} accent`,
      env.byId("petWidget").getAttribute("data-season") === season,
      String(env.byId("petWidget").getAttribute("data-season")));
  });

  [
    [9, "Good morning!"],
    [14, "Good afternoon."],
    [20, "Good evening."],
    [2, "It is late..."],
  ].forEach(([hour, greeting]) => {
    const env = at(2025, 6, 15, hour);
    check("time-and-season", `${hour}:00 greets with "${greeting}"`,
      env.byId("petStatus").textContent.indexOf(greeting) !== -1,
      env.byId("petStatus").textContent);
  });

  const newYear = at(2025, 0, 1, 12);
  check("time-and-season", "Jan 1 has a date-specific line",
    /Happy New Year/.test(newYear.byId("petStatus").textContent),
    newYear.byId("petStatus").textContent);
  const monthStart = at(2025, 6, 1, 12);
  check("time-and-season", "the 1st of a month has a line",
    /fresh month/.test(monthStart.byId("petStatus").textContent),
    monthStart.byId("petStatus").textContent);
  const holiday = at(2025, 11, 25, 12);
  check("time-and-season", "Dec 25 has a seasonal greeting",
    /greetings/.test(holiday.byId("petStatus").textContent),
    holiday.byId("petStatus").textContent);
});

/* 48. migration from the CURRENT-format save + episode restore --------- */
run("migration-current", () => {
  const now = localStamp(2025, 8, 10, 12);
  /* Exactly the schema shipped before this release: no care / streak fields. */
  const current = {
    species: "tagling",
    name: "Mochi",
    happiness: 64,
    hunger: 31,
    energy: 58,
    xp: 210,
    treats: 6,
    tricks: ["jump", "spin"],
    achievements: { firstPet: 1, fed10: 1 },
    accessory: "scarf",
    hue: "mint",
    daysVisited: 9,
    streak: 4,
    lastDay: dayString(now),
    totalFeeds: 12,
    totalBrush: 3,
    totalTricks: 5,
    bestCombo: 7,
    miniGamesFinished: 2,
    pos: "bl",
    sound: true,
    lastSeen: now,
    hidden: false,
  };
  let env = null;
  let threw = null;
  try {
    env = boot({ store: storeWith(current), now });
  } catch (error) {
    threw = error;
  }
  check("migration-current", "the current-format save loads without throwing",
    !threw, threw && threw.message);
  if (env) {
    const state = env.readState();
    check("migration-current", "existing fields are preserved",
      state.species === "tagling" && state.name === "Mochi" &&
        state.xp === 210 && state.streak === 4 && state.accessory === "scarf" &&
        state.hue === "mint" && state.pos === "bl" && state.sound === true,
      JSON.stringify(state));
    check("migration-current", "careMistakes defaults to 0",
      state.careMistakes === 0, String(state.careMistakes));
    check("migration-current", "careEpisodes defaults to an empty object",
      state.careEpisodes && typeof state.careEpisodes === "object" &&
        Object.keys(state.careEpisodes).length === 0,
      JSON.stringify(state.careEpisodes));
    check("migration-current", "streakUnlocks defaults to an empty object",
      state.streakUnlocks && typeof state.streakUnlocks === "object" &&
        Object.keys(state.streakUnlocks).length === 0,
      JSON.stringify(state.streakUnlocks));
    check("migration-current", "repairStreak defaults to 0",
      state.repairStreak === 0, String(state.repairStreak));
    check("migration-current", "the pet is fully interactive after migration",
      (env.byId("petBrushBtn").click(), env.readState().totalBrush === 4));
    check("migration-current", "the new fields are written back",
      Object.prototype.hasOwnProperty.call(env.readState(), "careEpisodes") &&
        Object.prototype.hasOwnProperty.call(env.readState(), "streakUnlocks"));
  }

  let bad = null;
  let badThrew = null;
  try {
    bad = boot({
      store: storeWith(
        savedPet({
          careMistakes: -5,
          careEpisodes: "not-an-object",
          streakUnlocks: 42,
          repairStreak: "abc",
          lastSeen: now,
        }),
      ),
      now,
    });
  } catch (error) {
    badThrew = error;
  }
  check("migration-current", "corrupt new fields do not throw", !badThrew,
    badThrew && badThrew.message);
  if (bad) {
    const state = bad.readState();
    check("migration-current", "negative careMistakes clamped",
      state.careMistakes === 0, String(state.careMistakes));
    check("migration-current", "non-object careEpisodes dropped",
      state.careEpisodes && Object.keys(state.careEpisodes).length === 0,
      JSON.stringify(state.careEpisodes));
    check("migration-current", "non-object streakUnlocks dropped",
      state.streakUnlocks && Object.keys(state.streakUnlocks).length === 0,
      JSON.stringify(state.streakUnlocks));
    check("migration-current", "invalid repairStreak clamped",
      state.repairStreak === 0, String(state.repairStreak));
  }

  const expired = boot({
    store: storeWith(
      savedPet({
        hunger: 92,
        lastDay: dayString(now),
        lastSeen: now,
        careEpisodes: {
          hunger: {
            since: now - 40 * 60 * 1000,
            deadline: now - 20 * 60 * 1000,
            logged: false,
          },
        },
      }),
    ),
    now,
  });
  check("migration-current", "an episode expired while away logs one mistake",
    expired.readState().careMistakes === 1,
    String(expired.readState().careMistakes));
  check("migration-current", "the restored episode is latched as logged",
    !!(expired.readState().careEpisodes.hunger &&
      expired.readState().careEpisodes.hunger.logged === true),
    JSON.stringify(expired.readState().careEpisodes));

  const latched = boot({
    store: storeWith(
      savedPet({
        hunger: 92,
        careMistakes: 3,
        lastDay: dayString(now),
        lastSeen: now,
        careEpisodes: {
          hunger: {
            since: now - 40 * 60 * 1000,
            deadline: now - 20 * 60 * 1000,
            logged: true,
          },
        },
      }),
    ),
    now,
  });
  check("migration-current", "an already-logged episode never logs again",
    latched.readState().careMistakes === 3,
    String(latched.readState().careMistakes));

  const inGrace = boot({
    store: storeWith(
      savedPet({
        hunger: 92,
        lastDay: dayString(now),
        lastSeen: now,
        careEpisodes: {
          hunger: {
            since: now - 5 * 60 * 1000,
            deadline: now + 10 * 60 * 1000,
            logged: false,
          },
        },
      }),
    ),
    now,
  });
  check("migration-current", "a live episode restored mid-grace logs nothing",
    inGrace.readState().careMistakes === 0,
    String(inGrace.readState().careMistakes));
});
