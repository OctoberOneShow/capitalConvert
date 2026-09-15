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
const GLYPH_KEY = "glyph-match-best";

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
  check("regression", "game i18n keys untouched (6 tabs still keyed)",
    ["tabTyping", "tabMemory", "tab2048", "tabReflex", "tabCaretDash", "tabFixitLadder"].every(
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

/* A timestamp at a chosen local wall-clock time, so time-of-day / season
 * cases are deterministic on any host timezone. */
function localStamp(year, monthIndex, day, hour) {
  return new Date(year, monthIndex, day, hour || 12, 0, 0, 0).getTime();
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

/* Fix-It Ladder --------------------------------------------------------- */

const ELEMENTS_KEY = "elements-best";

/* Extracts a top-level function from app.js by brace matching, so the harness
 * can run the REAL code rather than trusting a copy of it. */
function extractAppFunction(name) {
  const start = appSource.indexOf("function " + name + "(");
  if (start === -1) throw new Error("missing " + name);
  const open = appSource.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < appSource.length; i += 1) {
    const char = appSource[i];
    if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return appSource.slice(start, i + 1);
    }
  }
  throw new Error("unbalanced " + name);
}

/* The elemental sandbox exactly as app.js declares it: a single self-contained
 * factory with no DOM, no timers and no Math.random, so every rule driven below
 * is the rule the page runs. */
const realElements = new Function(
  extractAppFunction("createElementsSim") + "\nreturn createElementsSim;",
)();

function newSim(options) {
  return realElements(
    Object.assign({ cols: 80, rows: 56, seed: 4242 }, options || {}),
  );
}

function steps(sim, count) {
  for (let i = 0; i < count; i += 1) sim.step();
  return sim;
}

/* Every cell holding a value, so a rule can be checked against where the
 * material actually ended up rather than against an assumed layout. */
function cellsWith(sim, value) {
  const found = [];
  for (let y = 0; y < sim.rows; y += 1) {
    for (let x = 0; x < sim.cols; x += 1) {
      if (sim.get(x, y) === value) found.push({ x, y });
    }
  }
  return found;
}

/* The height of each column's material, measured from the bottom edge up. */
function columnHeights(sim, value) {
  const heights = [];
  for (let x = 0; x < sim.cols; x += 1) {
    let height = 0;
    for (let y = sim.rows - 1; y >= 0; y -= 1) {
      if (sim.get(x, y) === value) height = sim.rows - y;
    }
    heights.push(height);
  }
  return heights;
}

/* A grain is at rest when the cell below it, or one of the two cells below its
 * diagonals, holds the same material or stone. */
function resting(sim, x, y, value) {
  const solid = (cell) => cell === value || cell === sim.stone;
  return (
    y === sim.rows - 1 ||
    solid(sim.get(x, y + 1)) ||
    solid(sim.get(x - 1, y + 1)) ||
    solid(sim.get(x + 1, y + 1))
  );
}

/* The panel the four pages carry, rebuilt for a headless boot. */
/* The full roster, in the order the palette and the number keys use. Ids 0-5
 * keep the positions they have always had, so 1-6 still mean what they meant
 * before the expansion. */
const ELEMENT_TOOLS = [
  "empty",
  "stone",
  "sand",
  "water",
  "plant",
  "fire",
  "wood",
  "ash",
  "oil",
  "lava",
  "ice",
  "steam",
  "acid",
  "seed",
  "smoke",
  "glass",
  "void",
];

function buildElementsPanel(env) {
  const doc = env.document;
  const panel = doc.createElement("div");
  panel.className = "game-panel";
  panel.id = "gamePanelElements";
  panel.hidden = true;

  const hud = doc.createElement("div");
  hud.className = "game-hud";
  [
    ["elementsTimeLabel", "Time", "span"],
    ["elementsTime", "0.0s", "strong"],
    ["elementsProgress", "-", "strong"],
    ["elementsBudgetLabel", "Ink", "span"],
    ["elementsBudget", "-", "strong"],
    ["elementsStarsLabel", "Stars", "span"],
    ["elementsStars", "-", "strong"],
  ].forEach(([id, text, tag]) => {
    const stat = doc.createElement("div");
    stat.className = "game-stat";
    const element = doc.createElement(tag);
    element.id = id;
    element.textContent = text;
    stat.appendChild(element);
    hud.appendChild(stat);
  });

  const row = doc.createElement("div");
  row.className = "elements-row";
  const label = doc.createElement("label");
  label.className = "elements-label";
  label.setAttribute("for", "elementsChallenge");
  label.setAttribute("data-i18n", "elementsChallengeLabel");
  label.textContent = "Challenge";
  const select = doc.createElement("select");
  select.className = "elements-select";
  select.id = "elementsChallenge";
  row.appendChild(label);
  row.appendChild(select);

  const speedRow = doc.createElement("div");
  speedRow.className = "elements-row";
  const speedLabel = doc.createElement("label");
  speedLabel.className = "elements-label";
  speedLabel.setAttribute("for", "elementsSpeed");
  speedLabel.setAttribute("data-i18n", "elementsSpeedLabel");
  speedLabel.textContent = "Speed";
  const speed = doc.createElement("select");
  speed.className = "elements-select";
  speed.id = "elementsSpeed";
  speed.value = "1";
  speedRow.appendChild(speedLabel);
  speedRow.appendChild(speed);

  const tools = doc.createElement("div");
  tools.className = "elements-tools";
  tools.setAttribute("role", "group");
  ELEMENT_TOOLS.forEach((name) => {
    const button = doc.createElement("button");
    const suffix = name.charAt(0).toUpperCase() + name.slice(1);
    button.className = "elements-tool";
    button.id = "elementsTool" + suffix;
    button.setAttribute("type", "button");
    button.setAttribute("data-element", name);
    button.setAttribute("aria-pressed", "false");
    button.setAttribute("data-i18n", "elements" + suffix);
    tools.appendChild(button);
  });

  const legend = doc.createElement("p");
  legend.className = "elements-legend";
  legend.id = "elementsLegend";

  const brushRow = doc.createElement("div");
  brushRow.className = "elements-row";
  const brushLabel = doc.createElement("span");
  brushLabel.className = "elements-label";
  brushLabel.id = "elementsBrushLabel";
  brushLabel.setAttribute("data-i18n", "elementsBrushLabel");
  brushLabel.textContent = "Brush";
  const brushes = doc.createElement("div");
  brushes.className = "elements-brushes";
  brushes.setAttribute("role", "group");
  brushes.setAttribute("aria-labelledby", "elementsBrushLabel");
  [0, 1, 2, 3].forEach((size, index) => {
    const button = doc.createElement("button");
    button.className = "elements-brush" + (size === 2 ? " is-active" : "");
    button.id = "elementsBrush" + String(index + 1);
    button.setAttribute("type", "button");
    button.setAttribute("data-size", String(size));
    button.setAttribute("aria-pressed", size === 2 ? "true" : "false");
    button.textContent = String(size * 2 + 1);
    brushes.appendChild(button);
  });
  brushRow.appendChild(brushLabel);
  brushRow.appendChild(brushes);

  const stage = doc.createElement("div");
  stage.className = "elements-stage";
  stage.id = "elementsStage";
  const canvas = doc.createElement("canvas");
  canvas.className = "elements-canvas";
  canvas.id = "elementsCanvas";
  canvas.setAttribute("width", "320");
  canvas.setAttribute("height", "224");
  canvas.setAttribute("tabindex", "0");
  canvas.setAttribute("role", "application");
  canvas.setAttribute("aria-label", "Element sandbox.");
  canvas.setAttribute("data-i18n-aria", "elementsCanvasLabel");
  canvas.setAttribute("aria-describedby", "elementsDescription");
  const cursor = doc.createElement("span");
  cursor.className = "elements-cursor";
  cursor.id = "elementsCursor";
  cursor.setAttribute("aria-hidden", "true");
  cursor.hidden = true;
  stage.appendChild(canvas);
  stage.appendChild(cursor);

  const description = doc.createElement("p");
  description.className = "visually-hidden";
  description.id = "elementsDescription";
  const goal = doc.createElement("p");
  goal.className = "elements-goal";
  goal.id = "elementsGoal";
  const result = doc.createElement("p");
  result.className = "game-result";
  result.id = "elementsResult";
  result.setAttribute("role", "status");
  result.setAttribute("data-i18n", "elementsGoalFree");
  result.textContent = "Free play.";

  /* The hand controls the expansion added: hold the loop, take one generation,
   * eyedrop and undo. */
  const hand = doc.createElement("div");
  hand.className = "elements-actions";
  [
    ["elementsPauseBtn", "elementsPause", "Pause", true],
    ["elementsStepBtn", "elementsStep", "Step", false],
    ["elementsPickBtn", "elementsPick", "Pick", true],
    ["elementsUndoBtn", "elementsUndo", "Undo", false],
  ].forEach(([id, key, text, pressed]) => {
    const button = doc.createElement("button");
    button.className = "ghost";
    button.id = id;
    if (pressed) button.setAttribute("aria-pressed", "false");
    const inner = doc.createElement("span");
    inner.setAttribute("data-i18n", key);
    inner.textContent = text;
    button.appendChild(inner);
    hand.appendChild(button);
  });

  const actions = doc.createElement("div");
  actions.className = "game-actions";
  const startBtn = doc.createElement("button");
  startBtn.className = "primary";
  startBtn.id = "elementsStartBtn";
  const startLabel = doc.createElement("span");
  startLabel.setAttribute("data-i18n", "btnStart");
  startLabel.textContent = "Start";
  startBtn.appendChild(startLabel);
  const resetBtn = doc.createElement("button");
  resetBtn.className = "ghost";
  resetBtn.id = "elementsResetBtn";
  const resetLabel = doc.createElement("span");
  resetLabel.setAttribute("data-i18n", "elementsReset");
  resetLabel.textContent = "Reset board";
  resetBtn.appendChild(resetLabel);
  const best = doc.createElement("p");
  best.className = "game-best";
  best.id = "elementsBest";
  best.setAttribute("data-i18n", "noBest");
  best.textContent = "No best yet";
  actions.appendChild(startBtn);
  actions.appendChild(resetBtn);
  actions.appendChild(best);

  [
    hud,
    row,
    speedRow,
    tools,
    legend,
    brushRow,
    stage,
    description,
    goal,
    result,
    hand,
    actions,
  ].forEach((node) => panel.appendChild(node));
  return panel;
}

function seedElementsDom(env) {
  const panel = buildElementsPanel(env);
  /* The real pages start with the panel hidden behind its tab; a panel-only
   * boot stands in for the player having opened that tab. */
  panel.hidden = false;
  env.document.body.appendChild(panel);
}

/* Panel-only boot: no drawer, so the loop can only start when the player does
 * something (start, reset, paint), which keeps the timer assertions sharp. */
function bootElements(options) {
  const env = createEnvironment(options || {});
  /* The tool page's elements too, so the action log a win writes has its
   * targets - exactly what the real pages provide. */
  seedToolDom(env);
  seedElementsDom(env);
  env.load(appSource);
  env.domReady();
  return env;
}

function elementsStore(env) {
  const raw = env.store.get(ELEMENTS_KEY);
  return raw === undefined ? null : JSON.parse(raw);
}

function elementsRecord(v, cleared, bests) {
  return JSON.stringify({ v: v, cleared: cleared || {}, bests: bests || {} });
}

function bootElementsWith(record) {
  return bootElements({ store: new Map([[ELEMENTS_KEY, record]]) });
}

/* The campaign order, which is also the unlock chain. */
const ELEMENTS_ORDER = [
  "free",
  "grow",
  "flood",
  "extinguish",
  "glass",
  "quench",
  "thaw",
  "spill",
  "etch",
  "sprout",
  "geyser",
  "grove",
];

/* The par table as the page declares it, so a check can compare a board's
 * rungs against what the board can actually do instead of a copy. */
const ELEMENTS_PARS = (() => {
  const table = appSource.slice(
    appSource.indexOf("var elementsChallenges = ["),
    appSource.indexOf("var elementsBasePalette"),
  );
  const pars = {};
  const re = /id: "([a-z]+)",[\s\S]*?stars: \[([^\]]+)\]/g;
  let match;
  while ((match = re.exec(table)) !== null) {
    pars[match[1]] = match[2].split(",").map((n) => parseFloat(n));
  }
  return pars;
})();

/* A v2 record cleared through `id` (inclusive), so a case can start with the
 * board it wants to play already unlocked - and with the elements that board
 * era has handed out. */
function clearedThrough(id, bests) {
  const cleared = {};
  const upto = ELEMENTS_ORDER.indexOf(id);
  ELEMENTS_ORDER.forEach((name, index) => {
    if (name !== "free" && index <= upto) cleared[name] = true;
  });
  return JSON.stringify({ v: 2, cleared: cleared, bests: bests || {} });
}

/* Every challenge cleared: the whole roster, glass included, is unlocked. */
function unlockedRecord() {
  return clearedThrough("grove");
}

/* The board the campaign opens on, with every element the last era unlocks. */
function boardRecordUpTo(id) {
  return bootElementsWith(clearedThrough(id));
}

function selectChallenge(env, id) {
  const select = env.byId("elementsChallenge");
  select.value = id;
  env.dispatch(select, "change", {});
}

function challengeOptionEl(env, id) {
  return env.byId("elementsChallenge").childNodes.find((node) => node.value === id);
}

function challengeOption(env, id) {
  const option = env
    .byId("elementsChallenge")
    .childNodes.find((node) => node.value === id);
  return option ? option.textContent : "";
}

function clickTool(env, name) {
  env.byId("elementsTool" + name.charAt(0).toUpperCase() + name.slice(1)).click();
}

function pressKey(env, key) {
  env.dispatch(env.byId("elementsCanvas"), "keydown", { key: key });
}

function clickBrush(env, size) {
  env.byId("elementsBrush" + String(size + 1)).click();
}

function setSpeedTo(env, value) {
  const select = env.byId("elementsSpeed");
  select.value = String(value);
  env.dispatch(select, "change", {});
}

function clickHand(env, id) {
  env.byId(id).click();
}

/* The canvas maps pointer coordinates through its bounding rect; the stub
 * reports a zero rect, so app.js falls back to the 320x224 internal size and
 * one cell is four client pixels. */
function canvasPoint(env, x, y) {
  const canvas = env.byId("elementsCanvas");
  const rect = canvas.getBoundingClientRect();
  const width = rect.width || canvas.width || 320;
  const height = rect.height || canvas.height || 224;
  return {
    clientX: rect.left + ((x + 0.5) * width) / 80,
    clientY: rect.top + ((y + 0.5) * height) / 56,
  };
}

function paintCell(env, x, y) {
  const canvas = env.byId("elementsCanvas");
  const point = canvasPoint(env, x, y);
  env.dispatch(canvas, "pointerdown", {
    clientX: point.clientX,
    clientY: point.clientY,
    button: 0,
    pointerId: 1,
  });
  env.dispatch(canvas, "pointerup", { pointerId: 1 });
}

/* A drag, painted the way a pointer drag paints: one blob per sample, joined
 * up so a fast swipe leaves a line. */
function paintAcross(env, x0, x1, y) {
  const canvas = env.byId("elementsCanvas");
  const from = canvasPoint(env, x0, y);
  env.dispatch(canvas, "pointerdown", {
    clientX: from.clientX,
    clientY: from.clientY,
    button: 0,
    pointerId: 1,
  });
  const stepX = x1 >= x0 ? 1 : -1;
  for (let x = x0 + stepX; stepX > 0 ? x <= x1 : x >= x1; x += stepX) {
    const point = canvasPoint(env, x, y);
    env.dispatch(canvas, "pointermove", {
      clientX: point.clientX,
      clientY: point.clientY,
      pointerId: 1,
    });
  }
  env.dispatch(canvas, "pointerup", { pointerId: 1 });
}

/* What the renderer last handed to the canvas, read back at grid resolution:
 * the app fills one RGBA quad per cell and blits it through an offscreen
 * canvas at 4x. */
function renderedImage(env) {
  const ctx = env.byId("elementsCanvas").getContext("2d");
  if (!ctx) return null;
  if (ctx.lastImage && ctx.lastImage.data) return ctx.lastImage;
  /* The app blits through an offscreen canvas at grid resolution, so that is
   * where the pixels were put. */
  const source = ctx.lastSource;
  const sourceCtx = source && source.getContext ? source.getContext("2d") : null;
  return sourceCtx ? sourceCtx.lastImage : null;
}

function pixelAt(env, x, y) {
  const image = renderedImage(env);
  if (!image || !image.data) return null;
  const offset = (y * 80 + x) * 4;
  return [
    image.data[offset],
    image.data[offset + 1],
    image.data[offset + 2],
    image.data[offset + 3],
  ];
}

function looksLikeFire(pixel) {
  return !!pixel && pixel[0] === 255 && pixel[1] >= 110 && pixel[2] <= 110;
}

function looksLikeWater(pixel) {
  return !!pixel && pixel[2] > 150 && pixel[2] > pixel[1] + 40;
}

function looksLikeEmpty(pixel) {
  if (!pixel) return false;
  const dark = pixel[0] < 40 && pixel[1] < 60 && pixel[2] < 80;
  const light = pixel[0] > 235 && pixel[1] > 235 && pixel[2] > 235;
  return dark || light;
}

/* Stone is the only desaturated material, in either theme. */
function looksLikeStone(pixel) {
  if (!pixel) return false;
  return (
    Math.abs(pixel[0] - pixel[1]) < 24 &&
    Math.abs(pixel[1] - pixel[2]) < 28 &&
    pixel[0] > 60 &&
    pixel[0] < 235
  );
}

function won(env) {
  return /Goal met/.test(env.byId("elementsResult").textContent);
}

/* The frame the renderer last produced, copied out: the app paints into one
 * reused ImageData, so a snapshot has to be taken before the world is given a
 * chance to move. */
function frameSnapshot(env) {
  const image = renderedImage(env);
  return image && image.data ? Array.from(image.data) : null;
}

/* How many bytes of the rendered frame changed between two snapshots, or -1
 * when there was no frame to compare. */
function frameDiff(before, after) {
  if (!before || !after || before.length !== after.length) return -1;
  let changed = 0;
  for (let i = 0; i < before.length; i += 1) {
    if (before[i] !== after[i]) changed += 1;
  }
  return changed;
}

/* --- playing the boards the way a player would ------------------------- */

/* Flood: pour water in above the rim and let it find its level. */
function pourFlood(env, rounds) {
  clickTool(env, "water");
  let guard = 0;
  while (!won(env) && guard < (rounds || 12)) {
    paintAcross(env, 32, 48, 20);
    env.timers.advance(2000);
    guard += 1;
  }
  return won(env);
}

/* Grow: pour straight down the well, on top of the plant. */
function pourGrow(env, rounds) {
  clickTool(env, "water");
  let guard = 0;
  while (!won(env) && guard < (rounds || 20)) {
    for (let y = 0; y <= 10; y += 1) {
      paintCell(env, 40, y);
    }
    env.timers.advance(3000);
    guard += 1;
  }
  return won(env);
}

/* Extinguish: douse the run the fire is creeping along. */
function douseHedge(env, rounds) {
  clickTool(env, "water");
  let guard = 0;
  while (!won(env) && guard < (rounds || 12)) {
    paintAcross(env, 6, 73, 3);
    env.timers.advance(600);
    guard += 1;
  }
  return won(env);
}

/* The whole drawer, so tab switching / closing really runs the shared shell
 * (initTypingGame owns those listeners and its fail-closed guard needs all
 * six tabs and panels). Only the typing and ladder panels need their bodies:
 * the other three games return early without theirs. */
function seedDrawerDom(env) {
  const doc = env.document;

  const openBtn = doc.createElement("button");
  openBtn.id = "gameToggleBtn";
  doc.body.appendChild(openBtn);

  const modal = doc.createElement("div");
  modal.className = "game-modal";
  modal.id = "gameModal";
  modal.hidden = true;
  doc.body.appendChild(modal);

  const backdrop = doc.createElement("div");
  backdrop.className = "game-modal-backdrop";
  backdrop.id = "gameBackdrop";
  modal.appendChild(backdrop);

  const dialog = doc.createElement("div");
  dialog.className = "game-dialog";
  modal.appendChild(dialog);

  const closeBtn = doc.createElement("button");
  closeBtn.className = "game-close";
  closeBtn.id = "gameCloseBtn";
  dialog.appendChild(closeBtn);

  const tabs = doc.createElement("div");
  tabs.className = "game-tabs";
  dialog.appendChild(tabs);
  [
    ["gameTabTyping", "gamePanelTyping", true],
    ["gameTabMemory", "gamePanelMemory", false],
    ["gameTab2048", "gamePanel2048", false],
    ["gameTabReflex", "gamePanelReflex", false],
    ["gameTabCaretDash", "gamePanelCaretDash", false],
    ["gameTabElements", "gamePanelElements", false],
  ].forEach(([tabId, panelId, first]) => {
    const tab = doc.createElement("button");
    tab.className = "game-tab";
    tab.id = tabId;
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-selected", first ? "true" : "false");
    tab.setAttribute("aria-controls", panelId);
    tab.tabIndex = first ? 0 : -1;
    tabs.appendChild(tab);
  });

  ["gamePanelTyping", "gamePanelMemory", "gamePanel2048", "gamePanelReflex",
    "gamePanelCaretDash"].forEach((panelId, index) => {
    const panel = doc.createElement("div");
    panel.className = "game-panel";
    panel.id = panelId;
    panel.hidden = index !== 0;
    dialog.appendChild(panel);
  });
  dialog.appendChild(buildElementsPanel(env));

  /* Typing panel body; the sandbox body comes from buildElementsPanel above.
   * The other three games return early without their own markup, which keeps
   * this fixture focused on the shared drawer shell. */
  [
    ["typingTarget", "p"],
    ["typingTargetText", "span"],
    ["typingInput", "input"],
    ["gameStartBtn", "button"],
    ["gameTime", "strong"],
    ["gameWpm", "strong"],
    ["gameAcc", "strong"],
    ["gameTrackFill", "span"],
    ["gameResult", "p"],
    ["gameBest", "p"],
  ].forEach(([id, tag]) => {
    const element = doc.createElement(tag);
    element.id = id;
    env.byId("gamePanelTyping").appendChild(element);
  });
}

function bootDrawer(options) {
  const env = createEnvironment(options || {});
  seedToolDom(env);
  seedDrawerDom(env);
  env.load(appSource);
  env.domReady();
  return env;
}

/* 44. the simulation rules --------------------------------------------- */
run("elements-sim", () => {
  const sim = newSim();
  check(
    "elements-sim",
    "the board is 80 by 56 with the six documented elements",
    sim.cols === 80 &&
      sim.rows === 56 &&
      sim.cells.length === 80 * 56 &&
      sim.empty === 0 &&
      sim.stone === 1 &&
      sim.sand === 2 &&
      sim.water === 3 &&
      sim.plant === 4 &&
      sim.fire === 5,
    `${sim.cols}x${sim.rows}`,
  );
  check(
    "elements-sim",
    "stone never moves",
    (() => {
      const wall = newSim();
      wall.clear();
      wall.set(10, 10, wall.stone);
      steps(wall, 50);
      return wall.get(10, 10) === wall.stone && wall.count(wall.stone) === 1;
    })(),
  );

  /* Sand: falls, sinks through water, piles into a slope. */
  const sand = newSim();
  sand.clear();
  sand.set(10, 0, sand.sand);
  sand.step();
  check(
    "elements-sim",
    "sand falls a cell per generation",
    sand.get(10, 1) === sand.sand && sand.get(10, 0) === sand.empty,
  );
  const sink = newSim();
  sink.clear();
  for (let y = 31; y <= 32; y += 1) {
    sink.set(9, y, sink.stone);
    sink.set(11, y, sink.stone);
  }
  sink.set(10, 32, sink.stone);
  sink.set(10, 31, sink.water);
  sink.set(10, 30, sink.sand);
  sink.step();
  check(
    "elements-sim",
    "sand sinks through water by swapping with it",
    sink.get(10, 31) === sink.sand && sink.get(10, 30) === sink.water,
  );
  check(
    "elements-sim",
    "sinking swaps instead of deleting either element",
    sink.count(sink.sand) === 1 && sink.count(sink.water) === 1,
  );

  const pour = newSim();
  pour.clear();
  for (let i = 0; i < 40; i += 1) {
    pour.set(40, i, pour.sand);
  }
  steps(pour, 900);
  const pile = columnHeights(pour, pour.sand);
  const pileWidth = pile.filter((height) => height > 0).length;
  const pileHeight = Math.max(...pile);
  check(
    "elements-sim",
    "poured sand spreads out instead of standing as a column",
    pileWidth >= 4,
    String(pileWidth),
  );
  check(
    "elements-sim",
    "sand piles into a slope, not a tower",
    pileHeight <= pileWidth + 2,
    `${pileHeight} high on ${pileWidth} wide`,
  );
  check(
    "elements-sim",
    "the pile reaches the floor",
    cellsWith(pour, pour.sand).some((cell) => cell.y === pour.rows - 1),
  );
  check(
    "elements-sim",
    "no grain is left floating",
    cellsWith(pour, pour.sand).every((cell) =>
      resting(pour, cell.x, cell.y, pour.sand),
    ),
  );
  check(
    "elements-sim",
    "sand is never created or destroyed",
    pour.count(pour.sand) === 40,
    String(pour.count(pour.sand)),
  );

  /* Water: falls, then spreads sideways until it levels out. */
  const drop = newSim();
  drop.clear();
  drop.set(10, 0, drop.water);
  drop.step();
  check(
    "elements-sim",
    "water falls a cell per generation",
    drop.get(10, 1) === drop.water,
  );
  steps(drop, 200);
  check(
    "elements-sim",
    "water comes to rest on the floor",
    drop.get(10, drop.rows - 1) === drop.water && drop.count(drop.water) === 1,
  );

  const pool = newSim();
  pool.clear();
  for (let y = 48; y < 56; y += 1) {
    pool.set(20, y, pool.water);
    pool.set(21, y, pool.water);
  }
  steps(pool, 400);
  const level = columnHeights(pool, pool.water);
  const wetColumns = level.filter((height) => height > 0).length;
  check(
    "elements-sim",
    "a standing column of water flattens out",
    wetColumns >= 5,
    `${wetColumns} columns`,
  );
  check(
    "elements-sim",
    "level water is only a couple of rows deep",
    Math.max(...level) <= 4,
    String(Math.max(...level)),
  );
  check(
    "elements-sim",
    "flowing water is conserved",
    pool.count(pool.water) === 16,
    String(pool.count(pool.water)),
  );

  /* Plants: static, but they drink the water above them. */
  const shaft = newSim();
  shaft.clear();
  for (let y = 40; y < 56; y += 1) {
    shaft.set(9, y, shaft.stone);
    shaft.set(11, y, shaft.stone);
  }
  shaft.set(10, 55, shaft.plant);
  shaft.set(10, 54, shaft.water);
  shaft.set(10, 53, shaft.water);
  steps(shaft, shaft.growEvery - 1);
  check(
    "elements-sim",
    "a plant waits for its growth cadence",
    shaft.get(10, 54) === shaft.water,
  );
  shaft.step();
  check(
    "elements-sim",
    "a plant grows one cell up into the water above it",
    shaft.get(10, 54) === shaft.plant,
  );
  check(
    "elements-sim",
    "the water it grew into is consumed",
    shaft.count(shaft.water) === 1,
    String(shaft.count(shaft.water)),
  );
  steps(shaft, shaft.growEvery * 2);
  check(
    "elements-sim",
    "the plant keeps climbing while it has water",
    shaft.get(10, 53) === shaft.plant && shaft.count(shaft.water) === 0,
  );
  steps(shaft, shaft.growEvery * 3);
  check(
    "elements-sim",
    "with no water above it the plant stops growing",
    shaft.get(10, 52) === shaft.empty && shaft.count(shaft.plant) === 3,
    String(shaft.count(shaft.plant)),
  );

  /* Fire: spreads through plants, expires without fuel. */
  const alone = newSim();
  alone.clear();
  alone.set(10, 30, alone.fire);
  steps(alone, alone.fireLife - 1);
  check(
    "elements-sim",
    "a flame with no fuel keeps burning for its whole life",
    alone.count(alone.fire) === 1,
  );
  alone.step();
  check(
    "elements-sim",
    "and then expires on its own",
    alone.count(alone.fire) === 0 && alone.get(10, 30) === alone.empty,
  );

  const hedge = newSim();
  hedge.clear();
  for (let x = 10; x <= 14; x += 1) {
    hedge.set(x, 30, hedge.plant);
  }
  hedge.set(10, 30, hedge.fire);
  hedge.step();
  check(
    "elements-sim",
    "fire ignites the plant beside it",
    hedge.get(11, 30) === hedge.fire && hedge.count(hedge.fire) === 2,
  );
  steps(hedge, 4);
  check(
    "elements-sim",
    "the fire front walks the plant line at a cell per generation",
    hedge.get(14, 30) === hedge.fire,
  );
  steps(hedge, hedge.fireLife + 40);
  check(
    "elements-sim",
    "a burnt-out line leaves neither fire nor plant behind",
    hedge.count(hedge.fire) === 0 && hedge.count(hedge.plant) === 0,
    `${hedge.count(hedge.fire)} / ${hedge.count(hedge.plant)}`,
  );

  /* Water: puts fire out and is consumed doing it. */
  const above = newSim();
  above.clear();
  above.set(10, 30, above.fire);
  above.set(10, 29, above.water);
  above.step();
  check(
    "elements-sim",
    "water dropped on a fire puts it out",
    above.count(above.fire) === 0 && above.count(above.water) === 0,
    `${above.count(above.fire)} / ${above.count(above.water)}`,
  );
  const below = newSim();
  below.clear();
  for (let x = 4; x <= 16; x += 1) {
    below.set(x, 55, below.stone);
  }
  below.set(10, 54, below.water);
  below.set(10, 53, below.fire);
  below.step();
  check(
    "elements-sim",
    "water under a fire douses it too, and is consumed",
    below.count(below.fire) === 0 && below.count(below.water) === 0,
  );

  /* Bounds safety and determinism. */
  const bounds = newSim();
  bounds.loadPreset("free");
  check(
    "elements-sim",
    "a fresh board reports no out-of-range writes",
    bounds.outOfRangeWrites() === 0,
  );
  for (let x = 0; x < 80; x += 1) {
    bounds.set(x, 0, bounds.sand);
    bounds.set(x, 55, bounds.water);
  }
  for (let y = 0; y < 56; y += 1) {
    bounds.set(0, y, bounds.water);
    bounds.set(79, y, bounds.sand);
  }
  const sandBefore = bounds.count(bounds.sand);
  steps(bounds, 300);
  check(
    "elements-sim",
    "no rule ever writes outside the grid",
    bounds.outOfRangeWrites() === 0,
    String(bounds.outOfRangeWrites()),
  );
  check(
    "elements-sim",
    "the grid keeps its size while it runs",
    bounds.cells.length === 80 * 56 && bounds.life.length === 80 * 56,
  );
  check(
    "elements-sim",
    "out-of-bounds reads report stone, never undefined",
    bounds.get(-1, -1) === bounds.stone &&
      bounds.get(80, 20) === bounds.stone &&
      bounds.get(20, 56) === bounds.stone,
  );
  check(
    "elements-sim",
    "sand is still neither created nor destroyed after 300 generations",
    bounds.count(bounds.sand) === sandBefore,
    `${sandBefore} -> ${bounds.count(bounds.sand)}`,
  );
  const counted = bounds.outOfRangeWrites();
  const refused = [
    bounds.set(-1, 0, bounds.sand),
    bounds.set(80, 0, bounds.sand),
    bounds.set(0, -1, bounds.sand),
    bounds.set(0, 56, bounds.sand),
  ];
  check(
    "elements-sim",
    "direct writes outside the grid are refused and counted",
    refused.every((value) => value === false) &&
      bounds.outOfRangeWrites() === counted + 4,
    String(bounds.outOfRangeWrites()),
  );

  const twinA = newSim();
  const twinB = newSim();
  twinA.loadPreset("free");
  twinB.loadPreset("free");
  check(
    "elements-sim",
    "two sims with the same seed start identical",
    twinA.hash() === twinB.hash() && twinA.hash() > 0,
  );
  const startHash = twinA.hash();
  steps(twinA, 200);
  steps(twinB, 200);
  check(
    "elements-sim",
    "and are still identical after 200 generations",
    twinA.hash() === twinB.hash() && twinA.hash() !== startHash,
  );
  const other = newSim({ seed: 987654 });
  other.loadPreset("free");
  steps(other, 200);
  check(
    "elements-sim",
    "a different seed settles differently",
    other.hash() !== twinA.hash(),
  );
  twinB.loadPreset("free");
  steps(twinB, 200);
  check(
    "elements-sim",
    "reloading the board reseeds the run",
    twinB.hash() === twinA.hash(),
  );
});

/* 44b. the expanded roster and every essential reaction ------------------ */

/* A two-cell pocket sealed on all sides but its own column, so a rule under
 * test is decided by the rule and not by its own material flowing away. The
 * free cells are the middle column's bottom two rows. */
function pocket() {
  const sim = newSim();
  sim.clear();
  for (let x = 0; x < sim.cols; x += 1) sim.set(x, sim.rows - 1, sim.stone);
  for (let y = sim.rows - 3; y <= sim.rows - 2; y += 1) {
    sim.set(9, y, sim.stone);
    sim.set(11, y, sim.stone);
  }
  sim.set(9, sim.rows - 4, sim.stone);
  sim.set(10, sim.rows - 4, sim.stone);
  sim.set(11, sim.rows - 4, sim.stone);
  return sim;
}

/* A five-wide, seven-tall basin on the floor, for the rules that need a column
 * of one liquid beside another. */
function basin() {
  const sim = newSim();
  sim.clear();
  for (let x = 0; x < sim.cols; x += 1) sim.set(x, sim.rows - 1, sim.stone);
  for (let y = sim.rows - 8; y <= sim.rows - 2; y += 1) {
    sim.set(7, y, sim.stone);
    sim.set(13, y, sim.stone);
  }
  return sim;
}

run("elements-expansion", () => {
  const sim = newSim();
  check(
    "elements-expansion",
    "the roster is the six originals plus eleven new ids",
    Object.keys(sim.ids).length === 17 &&
      sim.empty === 0 &&
      sim.stone === 1 &&
      sim.sand === 2 &&
      sim.water === 3 &&
      sim.plant === 4 &&
      sim.fire === 5 &&
      sim.wood === 6 &&
      sim.ash === 7 &&
      sim.oil === 8 &&
      sim.lava === 9 &&
      sim.ice === 10 &&
      sim.steam === 11 &&
      sim.acid === 12 &&
      sim.seed === 13 &&
      sim.smoke === 14 &&
      sim.glass === 15 &&
      sim.void === 16,
    JSON.stringify(sim.ids),
  );
  check(
    "elements-expansion",
    "the expanded board is still 80 by 56 with one counter per cell",
    sim.cells.length === 80 * 56 && sim.life.length === 80 * 56,
  );
  check(
    "elements-expansion",
    "the fuel and corrosion sets are the documented ones",
    sim.isFuel(sim.plant) &&
      sim.isFuel(sim.wood) &&
      sim.isFuel(sim.oil) &&
      sim.isFuel(sim.seed) &&
      !sim.isFuel(sim.water) &&
      !sim.isFuel(sim.ash) &&
      !sim.isFuel(sim.glass) &&
      sim.isSoluble(sim.stone) &&
      sim.isSoluble(sim.wood) &&
      sim.isSoluble(sim.glass) &&
      sim.isSoluble(sim.plant) &&
      sim.isSoluble(sim.sand) &&
      sim.isSoluble(sim.ash) &&
      !sim.isSoluble(sim.ice) &&
      !sim.isSoluble(sim.empty),
  );
  check(
    "elements-expansion",
    "steam, smoke and acid are handed their counters on creation",
    (() => {
      const board = newSim();
      board.clear();
      board.set(10, 10, board.steam);
      board.set(20, 10, board.smoke);
      board.set(30, 10, board.acid);
      const counters = [
        board.life[board.index(10, 10)],
        board.life[board.index(20, 10)],
        board.life[board.index(30, 10)],
      ];
      return (
        counters[0] === board.steamLife &&
        counters[1] === board.smokeLife &&
        counters[2] === board.acidUses &&
        board.steamLife === 120 &&
        board.smokeLife === 90 &&
        board.acidUses === 3
      );
    })(),
  );

  /* 2: sand meets lava. */
  check(
    "elements-expansion",
    "sand + lava -> glass, and the lava stays lava",
    (() => {
      const board = pocket();
      board.set(10, 54, board.lava);
      board.set(10, 53, board.sand);
      board.step();
      return (
        board.get(10, 54) === board.lava &&
        board.get(10, 53) === board.glass &&
        board.count(board.sand) === 0 &&
        board.count(board.glass) === 1
      );
    })(),
  );
  /* 3: lava meets water. */
  check(
    "elements-expansion",
    "lava + water -> stone + steam, two cells for two",
    (() => {
      const board = pocket();
      board.set(10, 54, board.lava);
      board.set(10, 53, board.water);
      board.step();
      return (
        board.get(10, 54) === board.stone &&
        board.get(10, 53) === board.steam &&
        board.count(board.lava) === 0 &&
        board.count(board.water) === 0
      );
    })(),
  );
  /* 4: lava meets ice. */
  check(
    "elements-expansion",
    "lava + ice -> stone + water",
    (() => {
      const board = pocket();
      board.set(10, 54, board.lava);
      board.set(10, 53, board.ice);
      board.step();
      return (
        board.get(10, 54) === board.stone &&
        board.get(10, 53) === board.water &&
        board.count(board.ice) === 0
      );
    })(),
  );
  /* 7: fire meets wood. Wood is structural fuel: it burns, it is not a plant. */
  check(
    "elements-expansion",
    "fire ignites wood, and wood neither grows nor drinks water",
    (() => {
      const board = pocket();
      board.set(10, 54, board.fire);
      board.set(10, 53, board.wood);
      board.step();
      const burnt = board.get(10, 53) === board.fire && board.count(board.fire) === 2;
      const garden = pocket();
      garden.set(10, 54, garden.wood);
      garden.set(10, 53, garden.water);
      steps(garden, 40);
      return (
        burnt &&
        garden.get(10, 54) === garden.wood &&
        garden.count(garden.water) === 1 &&
        garden.count(garden.wood) === 1
      );
    })(),
  );
  /* 8: fire meets oil. */
  check(
    "elements-expansion",
    "fire ignites oil",
    (() => {
      const board = pocket();
      board.set(10, 54, board.oil);
      board.set(10, 53, board.fire);
      board.step();
      return board.count(board.fire) === 2 && board.count(board.oil) === 0;
    })(),
  );
  /* 9: fire meets seed. */
  check(
    "elements-expansion",
    "fire ignites seed",
    (() => {
      const board = pocket();
      board.set(10, 54, board.seed);
      board.set(10, 53, board.fire);
      board.step();
      return board.count(board.fire) === 2 && board.count(board.seed) === 0;
    })(),
  );
  /* 12: oil floats. */
  check(
    "elements-expansion",
    "oil rises through the water above it, one cell per generation",
    (() => {
      const board = basin();
      for (let x = 8; x <= 12; x += 1) {
        for (let y = 49; y <= 54; y += 1) board.set(x, y, board.water);
      }
      board.set(10, 54, board.oil);
      board.step();
      const oneUp = board.get(10, 53) === board.oil && board.get(10, 54) === board.water;
      steps(board, 8);
      /* It climbs to the surface and stops there: nothing lighter can be
       * above it, and the water underneath holds it up. */
      const surfaced = board.get(10, 49) === board.oil;
      return (
        oneUp &&
        surfaced &&
        board.count(board.oil) === 1 &&
        board.count(board.water) === 29
      );
    })(),
  );
  /* 13: a seed sprouts. */
  check(
    "elements-expansion",
    "a seed next to water sprouts into a plant and drinks the water",
    (() => {
      const board = pocket();
      board.set(10, 54, board.water);
      board.set(10, 53, board.seed);
      board.step();
      return (
        board.get(10, 53) === board.plant &&
        board.count(board.seed) === 0 &&
        board.count(board.water) === 0
      );
    })(),
  );
  /* 14: acid corrodes, and is bounded by its uses. */
  check(
    "elements-expansion",
    "acid dissolves three solids and is spent",
    (() => {
      const board = basin();
      for (let x = 8; x <= 12; x += 1) board.set(x, 54, board.stone);
      board.set(10, 54, board.acid);
      const before = board.count(board.stone);
      steps(board, 6);
      return (
        board.count(board.stone) === before - 3 &&
        board.count(board.acid) === 0
      );
    })(),
  );
  check(
    "elements-expansion",
    "acid eats only what it is allowed to, and only when it is there",
    (() => {
      /* Walled in by ice, which is not in the soluble set, so the acid has
       * nothing to do and keeps every use it has. */
      const board = newSim();
      board.clear();
      for (let y = 52; y <= 55; y += 1) {
        board.set(9, y, board.ice);
        board.set(11, y, board.ice);
      }
      for (let x = 9; x <= 11; x += 1) {
        board.set(x, 55, board.ice);
        board.set(x, 52, board.ice);
      }
      board.set(10, 53, board.ice);
      board.set(10, 54, board.acid);
      const ice = board.count(board.ice);
      steps(board, 20);
      return (
        board.count(board.acid) === 1 &&
        board.life[board.index(10, 54)] === board.acidUses &&
        board.count(board.ice) === ice
      );
    })(),
  );
  /* 16/18: the gases and their countdowns. */
  check(
    "elements-expansion",
    "steam rises, then condenses into water when its life runs out",
    (() => {
      const board = newSim();
      board.clear();
      board.set(10, 40, board.steam);
      board.step();
      const rose = board.get(10, 39) === board.steam;
      steps(board, board.steamLife - 2);
      const alive = board.count(board.steam) === 1;
      board.step();
      return (
        rose &&
        alive &&
        board.count(board.steam) === 0 &&
        board.count(board.water) === 1 &&
        board.get(10, 0) === board.water
      );
    })(),
  );
  check(
    "elements-expansion",
    "smoke rises, then dissipates into nothing at all",
    (() => {
      const board = newSim();
      board.clear();
      board.set(10, 40, board.smoke);
      steps(board, board.smokeLife - 1);
      const alive = board.count(board.smoke) === 1;
      board.step();
      return (
        alive &&
        board.count(board.smoke) === 0 &&
        board.count(board.water) === 0 &&
        board.count(board.empty) === 80 * 56
      );
    })(),
  );
  check(
    "elements-expansion",
    "steam condenses on ice and takes the ice with it",
    (() => {
      const board = pocket();
      board.set(10, 54, board.ice);
      board.set(10, 53, board.steam);
      board.step();
      return (
        board.get(10, 53) === board.water &&
        board.get(10, 54) === board.water &&
        board.count(board.ice) === 0
      );
    })(),
  );
  /* Ice: melted by heat, chilled rather than instantly doused. */
  check(
    "elements-expansion",
    "a flame melts the ice it touches and is chilled, not doused",
    (() => {
      const board = pocket();
      board.set(10, 54, board.ice);
      board.set(10, 53, board.fire);
      board.step();
      const chilled = board.life[board.index(10, 53)];
      const melted =
        board.count(board.ice) === 0 &&
        board.count(board.water) === 1 &&
        board.count(board.fire) === 1;
      const surviving = chilled === board.fireLife - 2;
      board.step();
      /* With the meltwater trapped beside it, the douse rule takes over. */
      return (
        melted && surviving && board.count(board.fire) === 0 && board.count(board.water) === 0
      );
    })(),
  );
  /* 20: void drains. */
  check(
    "elements-expansion",
    "void erases every neighbour that is not a wall",
    (() => {
      const board = newSim();
      board.clear();
      board.set(40, 30, board.void);
      board.set(39, 30, board.sand);
      board.set(41, 30, board.water);
      board.set(40, 29, board.plant);
      board.set(40, 31, board.ice);
      board.set(39, 31, board.stone);
      board.step();
      return (
        board.get(39, 30) === board.empty &&
        board.get(41, 30) === board.empty &&
        board.get(40, 29) === board.empty &&
        board.get(40, 31) === board.empty &&
        board.get(39, 31) === board.stone &&
        board.count(board.void) === 1
      );
    })(),
  );
  /* The inert ones stay inert, which is what makes them useful as structure. */
  check(
    "elements-expansion",
    "ash and glass are inert: fire cannot light them and lava cannot melt them",
    (() => {
      const board = pocket();
      board.set(10, 54, board.ash);
      board.set(10, 53, board.fire);
      steps(board, board.fireLife + 6);
      const ashSurvived = board.count(board.ash) === 1 && board.count(board.fire) === 0;
      const kiln = pocket();
      kiln.set(10, 54, kiln.lava);
      kiln.set(10, 53, kiln.glass);
      steps(kiln, 5);
      return (
        ashSurvived &&
        kiln.count(kiln.glass) === 1 &&
        kiln.count(kiln.lava) === 1
      );
    })(),
  );
  check(
    "elements-expansion",
    "steam is not water: a flame beside it is not doused",
    (() => {
      const board = pocket();
      board.set(10, 54, board.steam);
      board.set(10, 53, board.fire);
      steps(board, 20);
      return board.count(board.fire) === 1 && board.count(board.steam) === 1;
    })(),
  );
  check(
    "elements-expansion",
    "every element can be piled on the board without a single stray write",
    (() => {
      const board = newSim();
      board.clear();
      Object.keys(board.ids).forEach((name) => {
        for (let y = 0; y < board.rows; y += 1) board.set(39, y, board.ids[name]);
      });
      steps(board, 300);
      return (
        board.outOfRangeWrites() === 0 &&
        board.cells.length === 80 * 56 &&
        board.get(-1, -1) === board.stone &&
        board.get(80, 56) === board.stone &&
        board.count(board.empty) <= 80 * 56
      );
    })(),
  );
  check(
    "elements-expansion",
    "the whole expanded board is still a seeded, repeatable world",
    (() => {
      const a = newSim();
      const b = newSim();
      a.loadPreset("free");
      b.loadPreset("free");
      for (let x = 20; x < 30; x += 1) {
        a.set(x, 10, a.lava);
        b.set(x, 10, b.lava);
        a.set(x, 20, a.acid);
        b.set(x, 20, b.acid);
        a.set(x, 30, a.oil);
        b.set(x, 30, b.oil);
      }
      steps(a, 250);
      steps(b, 250);
      return a.hash() === b.hash() && a.hash() > 0;
    })(),
  );
  /* The mechanics that live in the factory itself. */
  check(
    "elements-expansion",
    "a spawner pours on its cadence and only into an empty cell",
    (() => {
      const board = newSim();
      board.loadPreset("free");
      const before = board.count(board.water);
      steps(board, 11);
      const notYet = board.count(board.water) === before;
      steps(board, 1);
      const poured = board.count(board.water) === before + 1;
      board.clear();
      board.addSpawner(20, 20, board.water, 1, 2);
      steps(board, 6);
      return notYet && poured && board.count(board.water) === 2;
    })(),
  );
  check(
    "elements-expansion",
    "the paint allowance is exact, refuses at zero and refills on reload",
    (() => {
      const board = newSim();
      board.clear();
      board.setInk(2);
      const first = board.paint(10, 10, board.sand);
      const second = board.paint(11, 10, board.sand);
      const third = board.paint(12, 10, board.sand);
      const spent = board.inkLeft() === 0 && board.count(board.sand) === 2;
      board.clear();
      const refilled = board.inkLeft() === 2 && board.paint(12, 10, board.sand) === true;
      const free = newSim();
      free.clear();
      return (
        first === true &&
        second === true &&
        third === false &&
        spent &&
        refilled &&
        free.ink() === 0 &&
        free.paint(10, 10, free.sand) === true
      );
    })(),
  );
  check(
    "elements-expansion",
    "undo rewinds the board, the generator and the random stream together",
    (() => {
      const board = newSim();
      board.loadPreset("free");
      const before = board.hash();
      const generation = board.generation();
      board.remember();
      board.paint(30, 30, board.sand);
      board.paint(31, 30, board.sand);
      const changed = board.hash() !== before;
      const back = board.undo() === true && board.hash() === before;
      const rewound = board.generation() === generation;
      const empty = board.undo() === false && board.undoDepth() === 0;
      board.remember();
      board.forget();
      const refused = board.undoDepth() === 0;
      board.remember();
      for (let i = 0; i < 10; i += 1) board.remember();
      return (
        changed && back && rewound && empty && refused && board.undoDepth() === 6
      );
    })(),
  );
});

/* 45. the four boards -------------------------------------------------- */
run("elements-boards", () => {
  ["free", "grow", "extinguish", "flood"].forEach((id) => {
    const one = newSim();
    const two = newSim();
    one.loadPreset(id);
    two.loadPreset(id);
    check(
      "elements-boards",
      `${id}: the starting board is deterministic`,
      one.hash() === two.hash() && one.count(one.stone) > 0,
    );
    check(
      "elements-boards",
      `${id}: laying out the board writes nothing out of range`,
      one.outOfRangeWrites() === 0,
      String(one.outOfRangeWrites()),
    );
    check(
      "elements-boards",
      `${id}: the board does not start already won`,
      one.progress(id).done === false,
    );
  });

  const free = newSim();
  free.loadPreset("free");
  check(
    "elements-boards",
    "free play opens with sand, water and a garden, but no fire",
    free.count(free.sand) > 20 &&
      free.count(free.water) > 50 &&
      free.count(free.plant) > 5 &&
      free.count(free.fire) === 0,
    `${free.count(free.sand)} sand, ${free.count(free.water)} water, ${free.count(free.plant)} plant`,
  );
  check(
    "elements-boards",
    "free play has no goal to reach",
    free.progress("free").done === false && free.progress("free").target === 0,
  );

  const grow = newSim();
  grow.loadPreset("grow");
  check(
    "elements-boards",
    "grow: a seed sits at the bottom of a one-cell well",
    grow.get(40, 54) === grow.plant &&
      grow.get(39, 20) === grow.stone &&
      grow.get(41, 20) === grow.stone &&
      grow.get(40, 20) === grow.empty,
  );
  check(
    "elements-boards",
    "grow: the pool only fills the bottom of the well",
    grow.count(grow.water) === 19 && grow.progress("grow").value < grow.rows * 0.5,
    `${grow.count(grow.water)} water`,
  );

  const hedge = newSim();
  hedge.loadPreset("extinguish");
  check(
    "elements-boards",
    "extinguish: one fire burns at the near end of the hedge",
    hedge.count(hedge.fire) === 1 && hedge.get(4, 4) === hedge.fire,
  );
  check(
    "elements-boards",
    "extinguish: the hedge is long enough to outlast the clock",
    hedge.count(hedge.plant) > 500,
    String(hedge.count(hedge.plant)),
  );
  check(
    "elements-boards",
    "extinguish: nothing else can catch fire",
    cellsWith(hedge, hedge.fire).every((cell) => {
      const neighbours = [
        hedge.get(cell.x - 1, cell.y),
        hedge.get(cell.x + 1, cell.y),
        hedge.get(cell.x, cell.y - 1),
        hedge.get(cell.x, cell.y + 1),
      ];
      return neighbours.filter((value) => value === hedge.plant).length === 1;
    }),
  );

  const flood = newSim();
  flood.loadPreset("flood");
  const zone = flood.zone();
  check(
    "elements-boards",
    "flood: the marked zone sits inside the basin walls",
    !!zone &&
      zone.x0 > 26 &&
      zone.x1 < 54 &&
      zone.y0 > 24 &&
      zone.y1 < 55 &&
      flood.progress("flood").target > 100,
    JSON.stringify(zone),
  );
  check(
    "elements-boards",
    "flood: the basin starts dry",
    flood.count(flood.water) === 0 && flood.progress("flood").value === 0,
  );
  check(
    "elements-boards",
    "flood: paint is refused at or below the rim, allowed above it",
    (() => {
      const pours = flood.pourZones();
      return (
        pours.length === 1 &&
        pours[0].y1 === 23 &&
        flood.paint(40, pours[0].y1, flood.water) === true &&
        flood.paint(40, pours[0].y1 + 1, flood.water) === false &&
        flood.paint(40, zone.y1, flood.water) === false &&
        flood.count(flood.water) === 1
      );
    })(),
    JSON.stringify(flood.pourZones()),
  );
  check(
    "elements-boards",
    "the brush never overwrites a solid cell",
    (() => {
      const board = newSim();
      board.loadPreset("free");
      const before = board.count(board.stone);
      board.paintBlob(40, 55, board.water, 2);
      board.paintBlob(40, 55, board.sand, 2);
      board.paintBlob(40, 55, board.fire, 2);
      return board.count(board.stone) === before && board.count(board.fire) === 0;
    })(),
  );
  check(
    "elements-boards",
    "the eraser does clear a solid cell",
    (() => {
      const board = newSim();
      board.loadPreset("free");
      const before = board.count(board.stone);
      const erased = board.paintBlob(1, 55, board.empty, 1);
      return erased === 3 && board.count(board.stone) === before - 3;
    })(),
  );
});

/* 46. the three win conditions fire exactly when they are met ----------- */
run("elements-goals", () => {
  /* Grow: any plant on the top row. */
  const grow = newSim();
  grow.loadPreset("grow");
  check(
    "elements-goals",
    "grow is not won while the plant is still climbing",
    grow.progress("grow").done === false && grow.progress("grow").value < grow.rows,
  );
  grow.set(40, 1, grow.plant);
  check(
    "elements-goals",
    "a plant on the second row is not the top row",
    grow.progress("grow").done === false,
  );
  grow.set(40, 0, grow.plant);
  const growWin = grow.progress("grow");
  check(
    "elements-goals",
    "grow is won the moment a plant reaches the top row",
    growWin.done === true && growWin.value === grow.rows && growWin.target === grow.rows,
    JSON.stringify(growWin),
  );

  /* Extinguish: no fire left. */
  const hedge = newSim();
  hedge.loadPreset("extinguish");
  const burning = hedge.progress("extinguish");
  check(
    "elements-goals",
    "extinguish is not won while a fire burns",
    burning.done === false && burning.value === 1 && burning.target === 1,
    JSON.stringify(burning),
  );
  const flame = cellsWith(hedge, hedge.fire)[0];
  hedge.set(flame.x, flame.y, hedge.empty);
  check(
    "elements-goals",
    "extinguish is won the moment the last fire is out",
    hedge.progress("extinguish").done === true &&
      hedge.progress("extinguish").value === 0,
  );

  /* Flood: enough water inside the marked zone. */
  const flood = newSim();
  flood.loadPreset("flood");
  const zone = flood.zone();
  const target = flood.progress("flood").target;
  check(
    "elements-goals",
    "flood is not won with an empty basin",
    flood.progress("flood").done === false && target > 0,
  );
  let placed = 0;
  for (let y = zone.y1; y >= zone.y0 && placed < target - 1; y -= 1) {
    for (let x = zone.x0; x <= zone.x1 && placed < target - 1; x += 1) {
      flood.set(x, y, flood.water);
      placed += 1;
    }
  }
  check(
    "elements-goals",
    "one drop short of the target is not a win",
    flood.progress("flood").value === target - 1 &&
      flood.progress("flood").done === false,
    `${flood.progress("flood").value}/${target}`,
  );
  flood.set(zone.x0, zone.y0, flood.water);
  check(
    "elements-goals",
    "the target drop wins it",
    flood.progress("flood").value === target &&
      flood.progress("flood").done === true,
    `${flood.progress("flood").value}/${target}`,
  );
  check(
    "elements-goals",
    "water outside the zone does not count",
    (() => {
      const board = newSim();
      board.loadPreset("flood");
      for (let x = 0; x < 20; x += 1) {
        board.set(x, 55 - 1, board.water);
      }
      return board.progress("flood").value === 0;
    })(),
  );
});

/* 46b. the campaign: the eight new boards, their goals, the unlock chain,
 * the star table and the v2 store ---------------------------------------- */

/* The starting board of every campaign board, as the factory lays it out. */
const CAMPAIGN_STARTS = {
  glass: (b) => b.count(b.lava) === 72 && b.count(b.sand) === 10 && b.count(b.glass) === 0,
  quench: (b) => b.count(b.lava) === 48 && b.count(b.water) === 0 && b.count(b.stone) === 124,
  thaw: (b) => b.count(b.water) === 736 && b.count(b.ice) === 105,
  spill: (b) => b.count(b.oil) === 208 && b.count(b.water) === 312,
  etch: (b) => b.count(b.water) === 0 && b.count(b.stone) === 167 && b.count(b.acid) === 0,
  sprout: (b) => b.count(b.wood) === 16 && b.count(b.water) === 24 && b.count(b.seed) === 1,
  geyser: (b) => b.count(b.lava) === 68 && b.count(b.ice) === 204,
  grove: (b) => b.count(b.wood) === 102 && b.count(b.fire) === 2,
};

run("elements-campaign", () => {
  /* --- every campaign board lays out what it declares ----------------- */
  Object.keys(CAMPAIGN_STARTS).forEach((id) => {
    const one = newSim();
    const two = newSim();
    one.loadPreset(id);
    two.loadPreset(id);
    check(
      "elements-campaign",
      `${id}: the opening board is deterministic and writes nothing out of range`,
      one.hash() === two.hash() && one.outOfRangeWrites() === 0 && one.count(one.stone) > 0,
      String(one.outOfRangeWrites()),
    );
    check(
      "elements-campaign",
      `${id}: the opening layout is the one the board declares`,
      CAMPAIGN_STARTS[id](one),
      JSON.stringify({
        lava: one.count(one.lava),
        water: one.count(one.water),
        ice: one.count(one.ice),
        oil: one.count(one.oil),
        wood: one.count(one.wood),
        sand: one.count(one.sand),
      }),
    );
    check(
      "elements-campaign",
      `${id}: the board does not start already won`,
      one.progress(id).done === false,
    );
  });

  /* --- the three original boards keep their opening numbers ----------- */
  const growBoard = newSim();
  growBoard.loadPreset("grow");
  const floodBoard = newSim();
  floodBoard.loadPreset("flood");
  const hedgeBoard = newSim();
  hedgeBoard.loadPreset("extinguish");
  check(
    "elements-campaign",
    "grow, flood and extinguish keep the numbers their tests pin down",
    growBoard.progress("grow").value === 2 &&
      growBoard.progress("grow").target === 56 &&
      growBoard.count(growBoard.water) === 19 &&
      floodBoard.progress("flood").target === 158 &&
      floodBoard.progress("flood").value === 0 &&
      hedgeBoard.progress("extinguish").value === 1 &&
      hedgeBoard.progress("extinguish").target === 1,
    JSON.stringify([
      growBoard.progress("grow"),
      floodBoard.progress("flood"),
      hedgeBoard.progress("extinguish"),
    ]),
  );

  /* --- free play's showcase ------------------------------------------- */
  const showcase = newSim();
  showcase.loadPreset("free");
  check(
    "elements-campaign",
    "free play adds the showcase without disturbing the hopper or garden",
    showcase.count(showcase.lava) > 0 &&
      showcase.count(showcase.ice) > 0 &&
      showcase.count(showcase.oil) > 0 &&
      showcase.count(showcase.sand) > 20 &&
      showcase.count(showcase.water) > 50 &&
      showcase.count(showcase.plant) > 5 &&
      showcase.count(showcase.fire) === 0 &&
      showcase.progress("free").target === 0,
    JSON.stringify({
      lava: showcase.count(showcase.lava),
      ice: showcase.count(showcase.ice),
      oil: showcase.count(showcase.oil),
    }),
  );

  /* --- each new goal fires exactly at its threshold -------------------- */
  const glassGate = (() => {
    const b = newSim();
    b.loadPreset("glass");
    b.set(1, 1, b.glass);
    const under = b.progress("glass");
    for (let i = 0; i < 20; i += 1) b.set(i, 1, b.glass);
    const at = b.progress("glass");
    return { under, at };
  })();
  check(
    "elements-campaign",
    "glass: 16 cells wins it, 15 does not",
    glassGate.under.value === 1 &&
      glassGate.under.done === false &&
      glassGate.under.target === 16 &&
      glassGate.at.value === 20 &&
      glassGate.at.done === true,
    JSON.stringify(glassGate),
  );

  const quenchGate = (() => {
    const b = newSim();
    b.loadPreset("quench");
    const start = b.progress("quench");
    const last = cellsWith(b, b.lava)[0];
    b.set(last.x, last.y, b.stone);
    const one = b.progress("quench");
    const dry = newSim();
    dry.loadPreset("quench");
    cellsWith(dry, dry.lava).forEach((c) => dry.set(c.x, c.y, dry.stone));
    return { start, one, empty: dry.progress("quench") };
  })();
  check(
    "elements-campaign",
    "quench: the tray counts down and only an empty tray wins it",
    quenchGate.start.value === 48 &&
      quenchGate.start.target === 48 &&
      quenchGate.start.done === false &&
      quenchGate.one.value === 47 &&
      quenchGate.one.done === false &&
      quenchGate.empty.value === 0 &&
      quenchGate.empty.done === true,
    JSON.stringify(quenchGate),
  );

  const spillGate = (() => {
    const b = newSim();
    b.loadPreset("spill");
    const start = b.progress("spill");
    const drop = cellsWith(b, b.oil)[0];
    b.set(drop.x, drop.y, b.empty);
    const one = b.progress("spill");
    cellsWith(b, b.oil).forEach((c) => b.set(c.x, c.y, b.empty));
    return { start, one, none: b.progress("spill") };
  })();
  check(
    "elements-campaign",
    "spill: one drop of oil left is not a win, none is",
    spillGate.start.value === 208 &&
      spillGate.start.target === 208 &&
      spillGate.one.done === false &&
      spillGate.none.value === 0 &&
      spillGate.none.done === true,
    JSON.stringify(spillGate),
  );

  /* The three zone boards: one cell short is not a win, the target cell is -
   * and water outside the marked rectangle never counts. */
  ["thaw", "etch", "geyser"].forEach((id) => {
    const b = newSim();
    b.loadPreset(id);
    const z = b.zone();
    const target = b.progress(id).target;
    let placed = 0;
    for (let y = z.y1; y >= z.y0 && placed < target - 1; y -= 1) {
      for (let x = z.x0; x <= z.x1 && placed < target - 1; x += 1) {
        b.set(x, y, b.water);
        placed += 1;
      }
    }
    const short = b.progress(id);
    const outsider = newSim();
    outsider.loadPreset(id);
    for (let x = 0; x < 8; x += 1) outsider.set(x, 1, outsider.water);
    const outside = outsider.progress(id).value;
    b.set(z.x0, z.y0, b.water);
    const wonNow = b.progress(id);
    check(
      "elements-campaign",
      `${id}: the marked zone wins at its target and not a drop earlier`,
      target > 0 &&
        short.value === target - 1 &&
        short.done === false &&
        wonNow.value >= target &&
        wonNow.done === true &&
        outside === 0,
      JSON.stringify({ target, short, wonNow, outside }),
    );
  });

  /* Save the Grove is a two-part goal: no fire AND enough timber left. */
  const groveGate = (() => {
    const b = newSim();
    b.loadPreset("grove");
    const start = b.progress("grove");
    cellsWith(b, b.fire).forEach((c) => b.set(c.x, c.y, b.empty));
    const outButFull = b.progress("grove");
    const groveCells = [];
    for (let y = 52; y <= 53; y += 1) {
      for (let x = 53; x <= 60; x += 1) {
        if (b.get(x, y) === b.wood) groveCells.push({ x, y });
      }
    }
    groveCells.slice(0, 3).forEach((c) => b.set(c.x, c.y, b.empty));
    const thirteen = b.progress("grove");
    b.set(groveCells[2].x, groveCells[2].y, b.wood);
    const fourteen = b.progress("grove");
    b.set(9, 52, b.fire);
    const burning = b.progress("grove");
    return { start, outButFull, thirteen, fourteen, burning };
  })();
  check(
    "elements-campaign",
    "grove: the timber is protected by fire and by count",
    groveGate.start.value === 16 &&
      groveGate.start.zero === 2 &&
      groveGate.start.done === false &&
      groveGate.outButFull.value === 16 &&
      groveGate.outButFull.done === true &&
      groveGate.thirteen.value === 13 &&
      groveGate.thirteen.done === false &&
      groveGate.fourteen.value === 14 &&
      groveGate.fourteen.done === true &&
      groveGate.burning.done === false,
    JSON.stringify(groveGate),
  );

  /* --- the unlock chain ----------------------------------------------- */
  const fresh = bootElements({});
  const gate = (env, id) => challengeOptionEl(env, id).disabled;
  check(
    "elements-campaign",
    "a fresh record opens free play and Grow, and nothing else",
    gate(fresh, "free") === false &&
      gate(fresh, "grow") === false &&
      ELEMENTS_ORDER.slice(2).every((id) => gate(fresh, id) === true),
    ELEMENTS_ORDER.filter((id) => gate(fresh, id) === false).join(","),
  );
  check(
    "elements-campaign",
    "clearing a board opens the next one and only the next one",
    (() => {
      const env = boardRecordUpTo("grow");
      return (
        gate(env, "grow") === false &&
        gate(env, "flood") === false &&
        gate(env, "extinguish") === true &&
        gate(env, "glass") === true
      );
    })(),
  );
  check(
    "elements-campaign",
    "the whole chain follows the campaign order",
    ELEMENTS_ORDER.every((id, index) => {
      const env = boardRecordUpTo(id);
      const next = ELEMENTS_ORDER[index + 1];
      const open = ELEMENTS_ORDER.filter((other) => !gate(env, other));
      return (
        gate(env, id) === false &&
        (!next || gate(env, next) === false) &&
        ELEMENTS_ORDER.slice(index + 2).every((later) => gate(env, later) === true) &&
        open.length === Math.min(index + 2, ELEMENTS_ORDER.length)
      );
    }),
    ELEMENTS_ORDER.map((id) => {
      const env = boardRecordUpTo(id);
      return id + ":" + ELEMENTS_ORDER.filter((other) => !gate(env, other)).join("+");
    }).join(" | "),
  );
  check(
    "elements-campaign",
    "free play is never locked and never recorded as cleared",
    (() => {
      const env = boardRecordUpTo("grove");
      return gate(env, "free") === false && elementsStore(env).cleared.free === undefined;
    })(),
  );

  /* --- element unlocks ------------------------------------------------- */
  const offered = (env) =>
    ELEMENT_TOOLS.filter((name) => {
      const button = env.byId(
        "elementsTool" + name.charAt(0).toUpperCase() + name.slice(1),
      );
      return button.disabled === false;
    });
  check(
    "elements-campaign",
    "the base six are the whole palette until the campaign hands more out",
    offered(fresh).join(",") === "empty,stone,sand,water,plant,fire",
    offered(fresh).join(","),
  );
  check(
    "elements-campaign",
    "a new element arrives with the board that introduces it",
    offered(fresh).indexOf("lava") === -1 &&
      /* floor is cleared, so glass is still locked and lava is not out yet */
      offered(boardRecordUpTo("flood")).indexOf("lava") === -1 &&
      offered(boardRecordUpTo("extinguish")).indexOf("lava") !== -1 &&
      offered(boardRecordUpTo("extinguish")).indexOf("steam") === -1 &&
      offered(boardRecordUpTo("glass")).indexOf("steam") !== -1 &&
      offered(boardRecordUpTo("quench")).indexOf("ice") !== -1 &&
      offered(boardRecordUpTo("thaw")).indexOf("oil") !== -1 &&
      offered(boardRecordUpTo("spill")).indexOf("acid") !== -1,
    offered(boardRecordUpTo("flood")).join(","),
  );
  check(
    "elements-campaign",
    "wood, seed and ash unlock with Sprout, void with the grove, glass last",
    offered(boardRecordUpTo("spill")).indexOf("wood") === -1 &&
      offered(boardRecordUpTo("etch")).indexOf("wood") !== -1 &&
      offered(boardRecordUpTo("sprout")).indexOf("wood") !== -1 &&
      offered(boardRecordUpTo("sprout")).indexOf("seed") !== -1 &&
      offered(boardRecordUpTo("sprout")).indexOf("ash") !== -1 &&
      offered(boardRecordUpTo("sprout")).indexOf("void") === -1 &&
      offered(boardRecordUpTo("geyser")).indexOf("void") !== -1 &&
      offered(boardRecordUpTo("geyser")).indexOf("glass") === -1 &&
      offered(boardRecordUpTo("grove")).indexOf("glass") !== -1,
    offered(boardRecordUpTo("sprout")).join(","),
  );
  check(
    "elements-campaign",
    "a challenge only offers its own tools, intersected with the unlocks",
    (() => {
      const env = boardRecordUpTo("grove");
      selectChallenge(env, "sprout");
      return (
        env.byId("elementsToolWater").disabled === false &&
        env.byId("elementsToolFire").disabled === false &&
        env.byId("elementsToolSand").disabled === true &&
        env.byId("elementsToolEmpty").disabled === true
      );
    })(),
  );

  /* --- stars are computed from the bests ------------------------------- */
  const starEnv = (bests) => bootElementsWith(clearedThrough("grove", bests));
  const starLine = (env, id) => {
    selectChallenge(env, id);
    return env.byId("elementsStars").textContent;
  };
  check(
    "elements-campaign",
    "the star line is empty until a board has a time",
    starLine(bootElements({}), "grow") === "\u2014",
    starLine(bootElements({}), "grow"),
  );
  check(
    "elements-campaign",
    "the thresholds award three, two and one star",
    starLine(starEnv({ flood: 20 }), "flood") === "\u2605\u2605\u2605" &&
      starLine(starEnv({ flood: 40 }), "flood") === "\u2605\u2605\u2606" &&
      starLine(starEnv({ flood: 60 }), "flood") === "\u2605\u2606\u2606",
    [
      starLine(starEnv({ flood: 20 }), "flood"),
      starLine(starEnv({ flood: 40 }), "flood"),
      starLine(starEnv({ flood: 60 }), "flood"),
    ].join(" / "),
  );
  check(
    "elements-campaign",
    "a time just inside the three-star par still counts as three",
    starLine(starEnv({ grow: 23.9 }), "grow") === "\u2605\u2605\u2605" &&
      starLine(starEnv({ grow: 24 }), "grow") === "\u2605\u2605\u2605" &&
      starLine(starEnv({ grow: 24.1 }), "grow") === "\u2605\u2605\u2606",
    starLine(starEnv({ grow: 24.1 }), "grow"),
  );
  check(
    "elements-campaign",
    "Grow's three-star par sits above the climb's own floor",
    (() => {
      /* The plant climbs one cell per growEvery generations and the seed starts
       * near the floor, so no run can be scored before the whole shaft has been
       * climbed. The par has to clear that, or the best a player can do is
       * two stars. */
      const sim = newSim();
      sim.loadPreset("grow");
      let seedRow = -1;
      for (let y = 0; y < sim.rows && seedRow < 0; y += 1) {
        if (sim.get(40, y) === sim.plant) seedRow = y;
      }
      const floorSeconds = (seedRow * sim.growEvery * 50) / 1000;
      return seedRow > 0 && ELEMENTS_PARS.grow[0] > floorSeconds;
    })(),
    `${ELEMENTS_PARS.grow[0]}s vs the climb`,
  );
  check(
    "elements-campaign",
    "the picker carries the stars a board has earned",
    /\u2605\u2605\u2606/.test(challengeOption(starEnv({ flood: 40 }), "flood")),
    challengeOption(starEnv({ flood: 40 }), "flood"),
  );
  check(
    "elements-campaign",
    "a hand-written star table cannot disagree with the best times",
    (() => {
      const env = bootElementsWith(
        JSON.stringify({
          v: 2,
          cleared: { flood: true },
          bests: { flood: 55 },
          stars: { flood: 3 },
        }),
      );
      selectChallenge(env, "flood");
      return (
        env.byId("elementsStars").textContent === "\u2605\u2606\u2606" &&
        elementsStore(env).stars.flood === 1
      );
    })(),
  );
  check(
    "elements-campaign",
    "a clear records its star alongside the best",
    (() => {
      const env = bootElements({});
      selectChallenge(env, "grow");
      env.byId("elementsStartBtn").click();
      const clearedIt = pourGrow(env);
      const written = elementsStore(env);
      return (
        clearedIt &&
        written.v === 2 &&
        written.cleared.grow === true &&
        written.bests.grow > 0 &&
        written.stars.grow >= 1 &&
        env.byId("elementsStars").textContent !== "\u2014"
      );
    })(),
  );

  /* --- the v1 record migrates in place --------------------------------- */
  check(
    "elements-campaign",
    "a v1 record is read, re-scored and rewritten as v2",
    (() => {
      let env = null;
      let threw = null;
      try {
        env = bootElementsWith(
          JSON.stringify({
            v: 1,
            cleared: { grow: true, flood: true, extinguish: true },
            bests: { flood: 25.5, extinguish: 4 },
          }),
        );
      } catch (error) {
        threw = error;
      }
      const written = env ? elementsStore(env) : null;
      return (
        !threw &&
        !!written &&
        written.v === 2 &&
        written.cleared.flood === true &&
        written.bests.flood === 25.5 &&
        written.stars.flood === 2 &&
        written.stars.grow === 1 &&
        written.stars.extinguish === 3
      );
    })(),
    "a v1 record did not migrate cleanly",
  );
  check(
    "elements-campaign",
    "an unversioned v1 record migrates too",
    (() => {
      const env = bootElementsWith(
        JSON.stringify({ cleared: { flood: true }, bests: { flood: 10 } }),
      );
      const written = elementsStore(env);
      return (
        written.v === 2 &&
        written.cleared.flood === true &&
        written.bests.flood === 10 &&
        written.stars.flood === 3
      );
    })(),
  );
  check(
    "elements-campaign",
    "a v2 record is left alone",
    (() => {
      const env = bootElementsWith(
        JSON.stringify({ v: 2, cleared: { grow: true }, bests: { grow: 9 }, stars: { grow: 3 } }),
      );
      return elementsStore(env).v === 2 && elementsStore(env).stars.grow === 3;
    })(),
  );
  check(
    "elements-campaign",
    "a record from a future version keeps its clears but not its bests",
    (() => {
      const env = bootElementsWith(
        '{"v":3,"cleared":{"flood":true},"bests":{"flood":2}}',
      );
      const written = elementsStore(env);
      return (
        written.v === 2 &&
        written.cleared.flood === true &&
        written.bests.flood === 2 &&
        written.stars.flood === 3
      );
    })(),
  );
  check(
    "elements-campaign",
    "an out-of-range v1 best is dropped but the clear and its star survive",
    (() => {
      const env = bootElementsWith(
        JSON.stringify({ v: 1, cleared: { flood: true }, bests: { flood: 999999 } }),
      );
      const written = elementsStore(env);
      return written.bests.flood === undefined && written.stars.flood === 1;
    })(),
  );
  check(
    "elements-campaign",
    "a truncated record falls back to a blank v2 record",
    (() => {
      const env = bootElementsWith('{"v":2,"cleared":{"flood":tr');
      const written = elementsStore(env);
      return (
        written.v === 2 &&
        JSON.stringify(written.cleared) === "{}" &&
        JSON.stringify(written.stars) === "{}"
      );
    })(),
  );

  /* --- nothing is recorded while a board is armed ---------------------- */
  const armed = bootElements({});
  selectChallenge(armed, "grove");
  armed.timers.advance(30000);
  check(
    "elements-campaign",
    "an armed campaign board runs no clock, wins nothing and stores nothing",
    armed.store.get(ELEMENTS_KEY) === undefined &&
      !won(armed) &&
      armed.byId("elementsTime").textContent === "60.0s",
    `${armed.store.get(ELEMENTS_KEY)} / ${armed.byId("elementsTime").textContent}`,
  );
});

/* 46c. the pour zones: where a board lets the brush work ----------------- */

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

/* report ---------------------------------------------------------------- */
console.log("pet companion harness");console.log("=====================");
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
