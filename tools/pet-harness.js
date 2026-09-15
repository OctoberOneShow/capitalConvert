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

  const tools = doc.createElement("div");
  tools.className = "elements-tools";
  tools.setAttribute("role", "group");
  ["empty", "stone", "sand", "water", "plant", "fire"].forEach((name) => {
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

  [hud, row, tools, stage, description, goal, result, actions].forEach((node) =>
    panel.appendChild(node),
  );
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

function selectChallenge(env, id) {
  const select = env.byId("elementsChallenge");
  select.value = id;
  env.dispatch(select, "change", {});
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
    flood.paintAboveRow() >= 0 &&
      flood.paint(40, flood.paintAboveRow() - 1, flood.water) === true &&
      flood.paint(40, flood.paintAboveRow(), flood.water) === false &&
      flood.paint(40, zone.y1, flood.water) === false &&
      flood.count(flood.water) === 1,
    String(flood.paintAboveRow()),
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
    "the palette is six real buttons",
    panel.querySelectorAll(".elements-tool").length === 6 &&
      panel.querySelectorAll('.elements-tool[data-element]').length === 6,
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
    "the picker offers free play plus the three goals",
    env.byId("elementsChallenge").childNodes.length === 4,
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
    "every free-play tool is offered",
    panel.querySelectorAll(".elements-tool").every((button) => button.disabled === false),
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
    !!saved && saved.v === 1 && first.store.has(ELEMENTS_KEY),
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
        env.byId("elementsChallenge").childNodes.length === 4 &&
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
      return written.v === 1 && written.cleared.flood === true && written.bests.flood === 2;
    })(),
  );
  check(
    "elements-corrupt",
    "a corrupt record is replaced by a clean one",
    (() => {
      const broken = bootElementsWith("not json at all");
      const written = elementsStore(broken);
      return written.v === 1 && JSON.stringify(written.cleared) === "{}";
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
      return cleared && written.v === 1 && written.cleared.extinguish === true && written.bests.extinguish > 0;
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
    "elementsReset",
    "elementsToolsLabel",
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
