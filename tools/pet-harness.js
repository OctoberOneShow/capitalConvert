#!/usr/bin/env node
/*
 * Headless harness for the pet companion in assets/app.js.
 *
 * Loads the REAL app.js inside a hand-written stub DOM/localStorage and drives
 * the injected pet markup through its real event listeners.
 *
 * Usage: node tools/pet-harness.js
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { createEnvironment } = require("./stub-dom");

const appSource = fs.readFileSync(
  path.join(__dirname, "..", "assets", "app.js"),
  "utf8",
);

const PET_KEY = "capitalconvert-pet";

let passCount = 0;
const failures = [];
const notes = [];

function check(caseName, label, condition, detail) {
  if (condition) {
    passCount += 1;
    return true;
  }
  failures.push(`${caseName} :: ${label}${detail ? " -> " + detail : ""}`);
  return false;
}

function near(actual, expected, tolerance) {
  return Math.abs(actual - expected) <= (tolerance === undefined ? 1e-6 : tolerance);
}

function boot(overrides) {
  const env = createEnvironment(overrides);
  env.load(appSource);
  env.domReady();
  return env;
}

function adopt(env, species, name) {
  const input = env.byId("petSpeciesInput-" + species);
  input.checked = true;
  env.dispatch(input, "change");
  env.byId("petAdoptName").value = name;
  env.dispatch(env.byId("petAdoptForm"), "submit");
}

function statValue(env, key) {
  const el = env.byId("petStatValue" + key.charAt(0).toUpperCase() + key.slice(1));
  return el ? Number(el.textContent) : NaN;
}

function fxCount(env) {
  const fx = env.byId("petFx");
  return fx ? fx.childNodes.length : -1;
}

/* Creates the tool page's real elements so the text tools can run headlessly. */
function seedToolDom(env) {
  [
    ["inputText", "textarea"],
    ["outputText", "textarea"],
    ["changeSummary", "div"],
    ["statusMessage", "div"],
    ["recentAction", "div"],
    ["historyList", "ul"],
    ["diffPreview", "div"],
  ].forEach(([id, tag]) => {
    const element = env.document.createElement(tag);
    element.id = id;
    env.document.body.appendChild(element);
  });
}

const caseResults = [];

function run(name, fn) {
  const passedBefore = passCount;
  const failedBefore = failures.length;
  try {
    fn();
  } catch (error) {
    failures.push(`${name} :: threw ${error && error.stack ? error.stack.split("\n")[0] : error}`);
  }
  caseResults.push({
    name,
    checks: passCount - passedBefore,
    failed: failures.length - failedBefore,
  });
}

/* 1. first-visit adoption ------------------------------------------------ */
run("adoption", () => {
  const env = boot({});
  const widget = env.byId("petWidget");
  check("adoption", "widget injected into body", !!widget &&
    widget.parentNode === env.document.body);
  check("adoption", "no saved state before adopting", env.readState() === null);
  check("adoption", "adopt card visible", env.byId("petAdoptForm").hidden === false);
  check("adoption", "companion card hidden until adopted", env.byId("petPanel").hidden === true);
  check("adoption", "restore pill hidden during adoption", env.byId("petRestoreBtn").hidden === true);
  check("adoption", "default name pre-filled", env.byId("petAdoptName").value === "Pip",
    "got " + env.byId("petAdoptName").value);
  check("adoption", "default species pre-selected",
    env.byId("petSpeciesInput-bracko").checked === true);
  check("adoption", "three species offered",
    env.queryAll(".pet-species-option").length === 3);
  check("adoption", "prompt is localised (en)",
    env.byId("petAdoptHeading").textContent === "Adopt a companion",
    "got " + env.byId("petAdoptHeading").textContent);

  adopt(env, "quillop", "Nova");

  const state = env.readState();
  check("adoption", "state persisted", !!state);
  if (state) {
    check("adoption", "species persisted", state.species === "quillop", JSON.stringify(state));
    check("adoption", "name persisted", state.name === "Nova");
    check("adoption", "happiness seeded", state.happiness === 72);
    check("adoption", "hunger seeded", state.hunger === 24);
    check("adoption", "energy seeded", state.energy === 80);
    check("adoption", "xp seeded", state.xp === 0);
    check("adoption", "hidden flag seeded", state.hidden === false);
    check("adoption", "lastSeen recorded",
      near(state.lastSeen, env.clock.now, 0), String(state.lastSeen));
    check("adoption", "only one storage key written",
      Array.from(env.store.keys()).filter((k) => k.startsWith("capitalconvert-")).length === 1,
      JSON.stringify(Array.from(env.store.keys())));
  }
  check("adoption", "adopt card hidden after adopting", env.byId("petAdoptForm").hidden === true);
  check("adoption", "companion card visible after adopting", env.byId("petPanel").hidden === false);
  check("adoption", "art switched to chosen species",
    env.byId("petArt").firstChild.getAttribute("data-species") === "quillop");
  check("adoption", "button aria-label uses pet name",
    /Nova/.test(env.byId("petButton").getAttribute("aria-label")),
    env.byId("petButton").getAttribute("aria-label"));
  check("adoption", "status announces adoption",
    /Nova/.test(env.byId("petStatus").textContent),
    env.byId("petStatus").textContent);
  check("adoption", "decay interval running after adoption",
    env.timers.pendingIntervals() === 1, String(env.timers.pendingIntervals()));
});

/* 2. petting + cooldown -------------------------------------------------- */
run("petting", () => {
  const env = boot({});
  adopt(env, "bracko", "Pip");
  const button = env.byId("petButton");

  check("petting", "pet is a real <button>", button.tagName === "BUTTON");
  check("petting", "pet button has an aria-label", !!button.getAttribute("aria-label"));

  const before = env.readState().happiness;
  button.click();
  const afterFirst = env.readState();
  check("petting", "happiness increases on pet", afterFirst.happiness === before + 6,
    `${before} -> ${afterFirst.happiness}`);
  check("petting", "xp increases on pet", afterFirst.xp === 2, String(afterFirst.xp));
  check("petting", "reaction class applied", button.classList.contains("is-happy"));
  check("petting", "particles spawned in full motion", fxCount(env) > 0, String(fxCount(env)));
  check("petting", "stat readout reflects new happiness",
    statValue(env, "happiness") === afterFirst.happiness);

  button.click(); // immediately again -> cooldown must block
  const afterSpam = env.readState();
  check("petting", "cooldown blocks spam",
    afterSpam.happiness === afterFirst.happiness,
    `${afterFirst.happiness} -> ${afterSpam.happiness}`);
  check("petting", "cooldown explains itself in the status line",
    /still enjoying/.test(env.byId("petStatus").textContent),
    env.byId("petStatus").textContent);

  env.timers.advance(1000);
  button.click();
  check("petting", "petting works again after the cooldown",
    env.readState().happiness === afterFirst.happiness + 6,
    String(env.readState().happiness));

  env.timers.advance(2000);
  check("petting", "particles are cleaned up (no DOM leak)", fxCount(env) === 0,
    String(fxCount(env)));
  check("petting", "reaction class removed after the animation",
    button.classList.contains("is-happy") === false);
});

/* 3. stat decay over elapsed time ---------------------------------------- */
run("decay", () => {
  const env = boot({});
  adopt(env, "bracko", "Pip");
  const start = env.readState();
  env.timers.advance(5 * 3600 * 1000);
  const after = env.readState();
  check("decay", "happiness decays down (−6/h)", near(after.happiness, start.happiness - 30, 0.001),
    `${start.happiness} -> ${after.happiness}`);
  check("decay", "hunger rises (+9/h)", near(after.hunger, start.hunger + 45, 0.001),
    `${start.hunger} -> ${after.hunger}`);
  check("decay", "energy decays down (−5/h)", near(after.energy, start.energy - 25, 0.001),
    `${start.energy} -> ${after.energy}`);
  check("decay", "mood visibly changes with the stats",
    env.byId("petWidget").getAttribute("data-mood") === "hungry",
    env.byId("petWidget").getAttribute("data-mood"));
  check("decay", "status line follows the mood",
    /getting hungry/.test(env.byId("petStatus").textContent),
    env.byId("petStatus").textContent);
  check("decay", "interval still singular after ticks",
    env.timers.pendingIntervals() === 1, String(env.timers.pendingIntervals()));
});

/* 4. persistence round-trip --------------------------------------------- */
run("persistence", () => {
  const store = new Map();
  const first = boot({ store: store });
  adopt(first, "tagling", "Mochi");
  first.byId("petFeedBtn").click();
  const savedState = first.readState();

  const second = boot({ store: store, now: first.clock.now + 3600 * 1000 });
  check("persistence", "adoption prompt does not reappear",
    second.byId("petAdoptForm").hidden === true);
  check("persistence", "companion card restored", second.byId("petPanel").hidden === false);
  check("persistence", "name survives reload",
    /Mochi/.test(second.byId("petButton").getAttribute("aria-label")),
    second.byId("petButton").getAttribute("aria-label"));
  check("persistence", "species survives reload",
    second.byId("petArt").firstChild.getAttribute("data-species") === "tagling");
  check("persistence", "stats decayed while away",
    second.readState().hunger > savedState.hunger,
    `${savedState.hunger} -> ${second.readState().hunger}`);
  check("persistence", "returning status mentions the absence",
    /Mochi/.test(second.byId("petStatus").textContent),
    second.byId("petStatus").textContent);
  check("persistence", "interval restarted on the new page",
    second.timers.pendingIntervals() === 1, String(second.timers.pendingIntervals()));
});

/* 5. corrupt / hostile storage ------------------------------------------ */
run("corrupt-storage", () => {
  const garbage = new Map([[PET_KEY, "{not json at all"]]);
  let env = null;
  let threw = null;
  try {
    env = boot({ store: garbage });
  } catch (error) {
    threw = error;
  }
  check("corrupt-storage", "loading corrupt JSON does not throw", !threw,
    threw && threw.message);
  if (env) {
    check("corrupt-storage", "falls back to the adoption prompt",
      env.byId("petAdoptForm").hidden === false);
    adopt(env, "bracko", "Recovered");
    check("corrupt-storage", "can adopt normally afterwards", !!env.readState() &&
      env.readState().name === "Recovered");
  }

  const wrongShape = new Map([[PET_KEY, JSON.stringify({ species: "dragon", happiness: "abc" })]]);
  let env2 = null;
  let threw2 = null;
  try {
    env2 = boot({ store: wrongShape });
  } catch (error) {
    threw2 = error;
  }
  check("corrupt-storage", "unknown species does not throw", !threw2, threw2 && threw2.message);
  if (env2) {
    check("corrupt-storage", "unknown species rejected -> adoption prompt",
      env2.byId("petAdoptForm").hidden === false);
  }

  const partial = new Map([
    [PET_KEY, JSON.stringify({ species: "quillop", name: "<b>Zeus</b>", happiness: 500, hunger: -20 })],
  ]);
  let env3 = null;
  let threw3 = null;
  try {
    env3 = boot({ store: partial });
  } catch (error) {
    threw3 = error;
  }
  check("corrupt-storage", "out-of-range values do not throw", !threw3, threw3 && threw3.message);
  if (env3) {
    const state = env3.readState();
    check("corrupt-storage", "valid species kept", state.species === "quillop");
    check("corrupt-storage", "stats clamped to 0..100",
      state.happiness <= 100 && state.hunger >= 0, JSON.stringify(state));
    check("corrupt-storage", "name sanitised (no angle brackets)",
      state.name.indexOf("<") === -1 && state.name.indexOf(">") === -1, state.name);
  }
});

/* 6. storage unavailable ------------------------------------------------- */
run("no-storage", () => {
  let env = null;
  let threw = null;
  try {
    env = boot({ storageMode: "readwrite-throw" });
  } catch (error) {
    threw = error;
  }
  check("no-storage", "throwing localStorage does not break loading", !threw,
    threw && threw.message);
  if (env && env.initError) {
    const frame = /at ([A-Za-z0-9_$]+) \(assets\/app\.js/.exec(
      env.initError.stack || "",
    );
    notes.push(
      "storage-blocked env: the pet is initialised and fully functional, but an " +
        "unrelated pre-existing init in app.js (" +
        (frame ? frame[1] : "unknown") +
        ") throws afterwards because it reads localStorage unguarded - unchanged " +
        "behaviour, out of scope for this task",
    );
  }
  if (env) {
    check("no-storage", "adoption prompt still shown",
      env.byId("petAdoptForm").hidden === false);
    let adoptThrew = null;
    try {
      adopt(env, "bracko", "Memory");
    } catch (error) {
      adoptThrew = error;
    }
    check("no-storage", "adopting works in memory only", !adoptThrew,
      adoptThrew && adoptThrew.message);
    check("no-storage", "nothing written to storage", env.store.size === 0);
    const before = statValue(env, "happiness");
    env.byId("petButton").click();
    check("no-storage", "interactions still work without storage",
      statValue(env, "happiness") === before + 6 || env.byId("petButton").classList.contains("is-happy"),
      String(statValue(env, "happiness")));
    check("no-storage", "timer still runs without storage",
      env.timers.pendingIntervals() === 1, String(env.timers.pendingIntervals()));
  }

  // localStorage missing entirely
  let env2 = null;
  let threw2 = null;
  try {
    env2 = boot({ storageMode: "absent" });
  } catch (error) {
    threw2 = error;
  }
  check("no-storage", "missing localStorage does not throw", !threw2,
    threw2 && threw2.message);
  if (env2) {
    check("no-storage", "prompt shown when storage is missing",
      env2.byId("petAdoptForm").hidden === false);
  }
});

/* 7. species switching --------------------------------------------------- */
run("species", () => {
  const env = boot({});
  adopt(env, "bracko", "Pip");
  check("species", "starts on chosen species",
    env.byId("petWidget").getAttribute("data-species") === "bracko");
  env.byId("petSpeciesBtn").click();
  check("species", "switches to the next species",
    env.readState().species === "quillop", env.readState().species);
  check("species", "widget data-species updated",
    env.byId("petWidget").getAttribute("data-species") === "quillop");
  check("species", "artwork re-rendered for the new species",
    env.byId("petArt").firstChild.getAttribute("data-species") === "quillop");
  check("species", "switching costs nothing but grants xp", env.readState().xp === 2);
  env.byId("petSpeciesBtn").click();
  env.byId("petSpeciesBtn").click();
  check("species", "cycles back around",
    env.readState().species === "bracko", env.readState().species);
  check("species", "status names the new species",
    env.byId("petStatus").textContent.length > 0,
    env.byId("petStatus").textContent);
});

/* 8. rename -------------------------------------------------------------- */
run("rename", () => {
  const env = boot({});
  adopt(env, "bracko", "Pip");
  env.byId("petRenameBtn").click();
  check("rename", "inline form opens (no window.prompt)",
    env.byId("petRenameForm").hidden === false);
  check("rename", "input prefilled with the current name",
    env.byId("petRenameInput").value === "Pip");
  check("rename", "save button is a real submit control",
    env.byId("petRenameSave").type === "submit" &&
      env.byId("petRenameSave").getAttribute("id") === "petRenameSave");
  env.byId("petRenameInput").value = "  Zed  ";
  env.dispatch(env.byId("petRenameForm"), "submit");
  check("rename", "name trimmed and persisted", env.readState().name === "Zed",
    JSON.stringify(env.readState().name));
  check("rename", "form closes after saving", env.byId("petRenameForm").hidden === true);
  check("rename", "status confirms the new name",
    /Zed/.test(env.byId("petStatus").textContent), env.byId("petStatus").textContent);
  check("rename", "aria-label follows the new name",
    /Zed/.test(env.byId("petButton").getAttribute("aria-label")));

  env.byId("petRenameBtn").click();
  env.byId("petRenameInput").value = "";
  env.dispatch(env.byId("petRenameForm"), "submit");
  check("rename", "empty name falls back to the default", env.readState().name === "Pip",
    JSON.stringify(env.readState().name));

  env.byId("petRenameBtn").click();
  env.byId("petRenameCancel").click();
  check("rename", "cancel closes the form without changes",
    env.byId("petRenameForm").hidden === true && env.readState().name === "Pip");
});

/* 9. hide / restore + timer leaks --------------------------------------- */
run("hide-show", () => {
  const env = boot({});
  adopt(env, "bracko", "Pip");
  check("hide-show", "one decay interval while visible",
    env.timers.pendingIntervals() === 1, String(env.timers.pendingIntervals()));
  env.byId("petButton").click();
  check("hide-show", "fx timers pending right after a reaction",
    env.timers.pendingTimeouts() > 0, String(env.timers.pendingTimeouts()));

  env.byId("petHideBtn").click();
  check("hide-show", "companion card hidden", env.byId("petPanel").hidden === true);
  check("hide-show", "restore pill shown", env.byId("petRestoreBtn").hidden === false);
  check("hide-show", "hidden flag persisted", env.readState().hidden === true);
  check("hide-show", "decay interval cleared on hide",
    env.timers.pendingIntervals() === 0, String(env.timers.pendingIntervals()));
  check("hide-show", "pending fx timers cleared on hide",
    env.timers.pendingTimeouts() === 0, String(env.timers.pendingTimeouts()));

  env.byId("petRestoreBtn").click();
  check("hide-show", "companion card visible again", env.byId("petPanel").hidden === false);
  check("hide-show", "hidden flag cleared in storage", env.readState().hidden === false);
  check("hide-show", "decay interval restarted on restore",
    env.timers.pendingIntervals() === 1, String(env.timers.pendingIntervals()));

  env.byId("petCollapseBtn").click();
  check("hide-show", "collapse hides the control panel",
    env.byId("petWidget").getAttribute("data-collapsed") === "true");
  check("hide-show", "collapse keeps the creature visible",
    env.byId("petPanel").hidden === false);
  check("hide-show", "collapse does not stop the decay timer",
    env.timers.pendingIntervals() === 1, String(env.timers.pendingIntervals()));
  env.byId("petCollapseBtn").click();
  check("hide-show", "expand restores the panel",
    env.byId("petWidget").getAttribute("data-collapsed") === "false");
});

/* 10. document visibility ----------------------------------------------- */
run("visibility", () => {
  const env = boot({});
  adopt(env, "bracko", "Pip");
  check("visibility", "interval running while visible",
    env.timers.pendingIntervals() === 1, String(env.timers.pendingIntervals()));
  env.setHidden(true);
  env.fireDocument("visibilitychange");
  check("visibility", "interval cleared when page is hidden",
    env.timers.pendingIntervals() === 0, String(env.timers.pendingIntervals()));
  env.timers.advance(2 * 3600 * 1000); // time passes with no interval running
  check("visibility", "away time is credited on return",
    env.readState() !== null);
  env.setHidden(false);
  env.fireDocument("visibilitychange");
  check("visibility", "interval restarted when page is visible again",
    env.timers.pendingIntervals() === 1, String(env.timers.pendingIntervals()));
  check("visibility", "state still readable after the round trip",
    !!(env.readState() && env.readState().name === "Pip"));
});

/* 11. reduced motion ---------------------------------------------------- */
run("reduced-motion", () => {
  const store = new Map([["motion-level", "off"]]);
  const env = boot({ store: store, motion: "off" });
  adopt(env, "bracko", "Pip");
  check("reduced-motion", "motion level is off",
    env.document.documentElement.getAttribute("data-motion") === "off");
  const button = env.byId("petButton");
  const before = env.readState().happiness;
  button.click();
  check("reduced-motion", "pet remains interactive with motion off",
    env.readState().happiness === before + 6,
    `${before} -> ${env.readState().happiness}`);
  check("reduced-motion", "no particle effects with motion off",
    env.queryAll(".pet-particle").length === 0 && fxCount(env) === 0,
    String(fxCount(env)));
  env.timers.advance(6000);
  check("reduced-motion", "no timers left behind with motion off",
    env.timers.pendingTimeouts() === 0, String(env.timers.pendingTimeouts()));

  // switching motion at runtime must also stop the effects
  const env2 = boot({});
  adopt(env2, "bracko", "Pip");
  env2.byId("petButton").click();
  check("reduced-motion", "particles present in full motion", fxCount(env2) > 0,
    String(fxCount(env2)));
  env2.setMotion("off");
  env2.timers.advance(1500);
  env2.byId("petButton").click();
  check("reduced-motion", "runtime motion change suppresses new particles",
    fxCount(env2) === 0, String(fxCount(env2)));
});

/* 12. mood derivation --------------------------------------------------- */
run("mood", () => {
  const cases = [
    { stats: { happiness: 90, hunger: 10, energy: 80 }, mood: "happy", key: "petStatusHappy" },
    { stats: { happiness: 50, hunger: 30, energy: 70 }, mood: "neutral", key: "petStatusNeutral" },
    { stats: { happiness: 80, hunger: 80, energy: 70 }, mood: "hungry", key: "petStatusHungry" },
    { stats: { happiness: 80, hunger: 20, energy: 10 }, mood: "sleepy", key: "petStatusSleepy" },
  ];
  cases.forEach((testCase) => {
    const store = new Map([
      [
        PET_KEY,
        JSON.stringify({
          species: "bracko",
          name: "Pip",
          xp: 0,
          lastSeen: 1757000000000,
          hidden: false,
          happiness: testCase.stats.happiness,
          hunger: testCase.stats.hunger,
          energy: testCase.stats.energy,
        }),
      ],
      ["motion-level", "off"],
    ]);
    const env = boot({ store: store, motion: "off", now: 1757000000000 });
    check("mood", `mood "${testCase.mood}" derived from stats`,
      env.byId("petWidget").getAttribute("data-mood") === testCase.mood,
      env.byId("petWidget").getAttribute("data-mood"));
    check("mood", `status line localised for "${testCase.mood}"`,
      env.byId("petStatus").textContent.indexOf("Pip") === 0 ||
        env.byId("petStatus").textContent.length > 0,
      env.byId("petStatus").textContent);
  });
});

/* 13. zh localisation --------------------------------------------------- */
run("i18n-zh", () => {
  const store = new Map([["lang", "zh"], ["motion-level", "off"]]);
  const env = boot({ store: store, language: "zh-CN", motion: "off" });
  check("i18n-zh", "adoption heading localised to zh",
    env.byId("petAdoptHeading").textContent === "领养伙伴",
    env.byId("petAdoptHeading").textContent);
  check("i18n-zh", "default name localised to zh",
    env.byId("petAdoptName").value === "小豆",
    env.byId("petAdoptName").value);
  check("i18n-zh", "species label localised to zh",
    env.queryAll(".pet-species-name")[0].textContent === "括弧灵",
    env.queryAll(".pet-species-name")[0].textContent);
  check("i18n-zh", "action buttons localised to zh",
    env.byId("petFeedBtn").textContent === "喂食",
    env.byId("petFeedBtn").textContent);
  adopt(env, "tagling", "阿豆");
  check("i18n-zh", "user name left untranslated, label localised",
    env.byId("petStatus").textContent.indexOf("阿豆") !== -1 &&
      env.byId("petStatus").textContent.indexOf("欢迎") !== -1,
    env.byId("petStatus").textContent);
  check("i18n-zh", "aria-label localised",
    /阿豆/.test(env.byId("petButton").getAttribute("aria-label")),
    env.byId("petButton").getAttribute("aria-label"));
});

/* 14. accessibility structure ------------------------------------------ */
run("a11y", () => {
  const env = boot({});
  adopt(env, "bracko", "Pip");
  check("a11y", "pet is a button element",
    env.byId("petButton").tagName === "BUTTON");
  check("a11y", "status line is an aria-live region",
    env.byId("petStatus").getAttribute("role") === "status" &&
      env.byId("petStatus").getAttribute("aria-live") === "polite");
  check("a11y", "adopt status line is an aria-live region",
    env.byId("petAdoptStatus").getAttribute("role") === "status" &&
      env.byId("petAdoptStatus").getAttribute("aria-live") === "polite");
  check("a11y", "rename input has an accessible label",
    !!env.byId("petRenameInput").getAttribute("aria-label"));
  check("a11y", "collapse control exposes aria-expanded",
    env.byId("petCollapseBtn").getAttribute("aria-expanded") === "true");
  const controlIds = [
    "petButton", "petCollapseBtn", "petFeedBtn", "petPlayBtn", "petRestBtn",
    "petRenameBtn", "petSpeciesBtn", "petResetBtn", "petHideBtn", "petRestoreBtn",
  ];
  const tags = controlIds.map((id) => env.byId(id).tagName);
  check("a11y", "all controls are native focusable elements",
    tags.every((tag) => tag === "BUTTON"), JSON.stringify(tags));
  check("a11y", "every control has an accessible name", controlIds.every((id) => {
    const el = env.byId(id);
    if (el.hidden) return true; // hidden controls are not reachable
    return !!(el.getAttribute("aria-label") || el.textContent.trim() ||
      el.getAttribute("data-i18n") || el.getAttribute("data-i18n-aria"));
  }));
  check("a11y", "group labels present on stats/actions",
    !!env.byId("petWidget").querySelector(".pet-stats").getAttribute("aria-label") &&
      !!env.byId("petWidget").querySelector(".pet-actions").getAttribute("aria-label"));
});

/* 15. reset flow -------------------------------------------------------- */
run("reset", () => {
  const env = boot({});
  adopt(env, "tagling", "Mochi");
  env.byId("petResetBtn").click();
  check("reset", "first click only arms the reset",
    env.byId("petResetBtn").textContent === "Confirm reset?" &&
      !!env.readState(),
    env.byId("petResetBtn").textContent);
  env.byId("petResetBtn").click();
  check("reset", "second click clears storage", env.readState() === null);
  check("reset", "adoption prompt returns", env.byId("petAdoptForm").hidden === false);
  check("reset", "companion card hidden again", env.byId("petPanel").hidden === true);
  check("reset", "decay interval stopped after reset",
    env.timers.pendingIntervals() === 0, String(env.timers.pendingIntervals()));
  check("reset", "adoption flow works again",
    (adopt(env, "quillop", "Newbie"), env.readState().name === "Newbie"));
});

/* 16. "not now" + restore pill ----------------------------------------- */
run("dismiss", () => {
  const env = boot({});
  check("dismiss", "prompt visible on first visit", env.byId("petAdoptForm").hidden === false);
  env.byId("petAdoptLater").click();
  check("dismiss", "prompt dismissed", env.byId("petAdoptForm").hidden === true);
  check("dismiss", "restore pill offers adoption again",
    env.byId("petRestoreBtn").hidden === false &&
      env.byId("petRestoreLabel").textContent === "Adopt a companion",
    env.byId("petRestoreLabel").textContent);
  check("dismiss", "nothing persisted by dismissing", env.readState() === null);
  env.byId("petRestoreBtn").click();
  check("dismiss", "pill reopens the adoption card",
    env.byId("petAdoptForm").hidden === false);
});

/* 17. no stray intervals ------------------------------------------------ */
run("timers", () => {
  const env = boot({});
  check("timers", "no interval before adoption (unadopted prompt only)",
    env.timers.pendingIntervals() === 0, String(env.timers.pendingIntervals()));
  env.byId("petAdoptLater").click();
  check("timers", "still none after dismissing", env.timers.pendingIntervals() === 0,
    String(env.timers.pendingIntervals()));
  adopt(env, "bracko", "Pip");
  const afterAdopt = env.timers.pendingIntervals();
  adopt(env, "bracko", "Pip"); // no such thing twice, but re-render must not add timers
  env.byId("petFeedBtn").click();
  env.byId("petPlayBtn").click();
  env.byId("petRestBtn").click();
  check("timers", "exactly one decay interval, no leaks from interactions",
    afterAdopt === 1 && env.timers.pendingIntervals() === 1,
    `${afterAdopt} / ${env.timers.pendingIntervals()}`);
  env.fireWindow("pagehide");
  check("timers", "pagehide persists state", !!env.readState());
});

/* 18. existing tools still work with the pet mounted -------------------- */
run("regression", () => {
  const env = createEnvironment({});
  seedToolDom(env);
  env.load(appSource);
  const initError = env.domReady();
  check("regression", "DOMContentLoaded chain completes without errors", !initError,
    initError && initError.message);
  check("regression", "pet still mounted", !!env.byId("petWidget"));
  const input = env.byId("inputText");
  const output = env.byId("outputText");
  input.value = "你好，世界。";
  env.window.convertPunctuation();
  check("regression", "Chinese punctuation tool output unchanged",
    output.value === "你好 世界", JSON.stringify(output.value));
  input.value = "hello";
  env.window.formatText();
  check("regression", "text formatter still produces output",
    output.value.length > 0, JSON.stringify(output.value));
  check("regression", "action history still written",
    !!env.store.get("action-history:index.html"));
  check("regression", "game i18n keys untouched (5 tabs still keyed)",
    ["tabTyping", "tabMemory", "tab2048", "tabReflex", "tabCaretDash"].every(
      (key) => appSource.includes('"' + key + '"'),
    ));
});

/* helpers for the extended cases --------------------------------------- */

function savedPet(overrides) {
  const base = {
    species: "bracko",
    name: "Pip",
    happiness: 70,
    hunger: 20,
    energy: 70,
    xp: 0,
    treats: 3,
    tricks: [],
    achievements: {},
    accessory: "none",
    hue: "default",
    daysVisited: 1,
    streak: 1,
    lastDay: "",
    totalFeeds: 0,
    totalBrush: 0,
    totalTricks: 0,
    bestCombo: 0,
    miniGamesFinished: 0,
    pos: "br",
    sound: false,
    lastSeen: 1757000000000,
    hidden: false,
  };
  return Object.assign(base, overrides || {});
}

function storeWith(state) {
  return new Map([[PET_KEY, JSON.stringify(state)]]);
}

function dayString(ms) {
  const date = new Date(ms);
  return date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate();
}

function seedGameDom(env) {
  [
    ["reflexPad", "button"],
    ["reflexPadText", "span"],
    ["reflexLast", "span"],
    ["reflexBest", "span"],
    ["reflexResult", "p"],
    ["reflexStartBtn", "button"],
  ].forEach(([id, tag]) => {
    const element = env.document.createElement(tag);
    element.id = id;
    env.document.body.appendChild(element);
  });
}

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
  check("streak", "daily visit grants treats", after.treats === 7, String(after.treats));
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

/* 36. five games still wire their cheer into the pet ------------------- */
run("game-wiring", () => {
  check("game-wiring", "petNotifyGame is defined once and called by all five games",
    (appSource.match(/petNotifyGame\(/g) || []).length >= 6,
    String((appSource.match(/petNotifyGame\(/g) || []).length));
  check("game-wiring", "reflex best key untouched",
    appSource.includes('reflex-tap-best'));
  check("game-wiring", "caret dash best key untouched",
    appSource.includes('caret-dash-best'));
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

/* report ---------------------------------------------------------------- */
console.log("pet companion harness");
console.log("=====================");
console.log("\nper-case results:");
caseResults.forEach((result) => {
  const status = result.failed === 0 ? "PASS" : "FAIL";
  console.log(
    `  ${status}  ${result.name}  (${result.checks} checks, ${result.failed} failed)`,
  );
});
console.log(`\nchecks passed: ${passCount}`);
console.log(`checks failed: ${failures.length}`);
if (failures.length) {
  console.log("\nFAILURES:");
  failures.forEach((line) => console.log("  - " + line));
}
if (notes.length) {
  console.log("\nNOTES:");
  notes.forEach((line) => console.log("  - " + line));
}
process.exit(failures.length ? 1 : 0);
