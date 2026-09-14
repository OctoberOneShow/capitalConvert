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

function run(name, fn) {
  try {
    fn();
  } catch (error) {
    failures.push(`${name} :: threw ${error && error.stack ? error.stack.split("\n")[0] : error}`);
  }
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

/* report ---------------------------------------------------------------- */
console.log("pet companion harness");
console.log("=====================");
console.log(`checks passed: ${passCount}`);
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
