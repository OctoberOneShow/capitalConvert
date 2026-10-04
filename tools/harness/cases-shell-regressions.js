/* Gameplay/startup regressions: persistence is optional and quiz choices are
 * shuffled without losing their answer identities. Runs standalone or in the
 * shared pet/game harness. */
"use strict";

const { createEnvironment, appSource, check, run } = require("./lib");

function seed(env, pairs) {
  pairs.forEach(([id, tag]) => {
    const node = env.document.createElement(tag);
    node.id = id;
    env.document.body.appendChild(node);
  });
}

run("optional game storage", () => {
  ["absent", "readwrite-throw", "readonly"].forEach((storageMode) => {
    const env = createEnvironment({ storageMode });
    env.load(appSource);
    env.domReady();
    check("optional game storage", storageMode + ": bootstrap reaches all games", !env.initError,
      env.initError && env.initError.message);
    const App = env.window.CapitalConvert;
    App.storage.setItem("score-probe", "42");
    check("optional game storage", storageMode + ": session score survives failed persistence",
      App.storage.getItem("score-probe") === "42");
    App.storage.removeItem("score-probe");
    check("optional game storage", storageMode + ": removal hides the old score",
      App.storage.getItem("score-probe") === null);
    const campaign = App.createCampaign({ key: "campaign-probe", levels: [{ id: "a" }, { id: "b" }] });
    campaign.record("a", { stars: 2, best: 4 });
    const reopened = App.createCampaign({ key: "campaign-probe", levels: [{ id: "a" }, { id: "b" }] });
    check("optional game storage", storageMode + ": campaign survives reopening in this session",
      reopened.stars("a") === 2 && reopened.isUnlocked("b"));
  });

  const env = createEnvironment();
  env.load(appSource);
  env.window.CapitalConvert.storage.setItem("score-probe", "17");
  check("optional game storage", "normal storage still persists to the browser",
    env.store.get("score-probe") === "17");
  env.store.set("score-probe", "23");
  check("optional game storage", "normal reads pick up external score updates",
    env.window.CapitalConvert.storage.getItem("score-probe") === "23");

  const denied = createEnvironment();
  Object.defineProperty(denied.window, "localStorage", { get() { throw new Error("access denied"); } });
  denied.load(appSource);
  denied.domReady();
  check("optional game storage", "a denied storage property does not abort startup", !denied.initError);
});

run("corrupt game history", () => {
  ["null", "{}", "17", '"old record"', '["valid",null,17,{"bad":true}]'].forEach((raw) => {
    const env = createEnvironment({ store: new Map([["action-history:index.html", raw]]) });
    seed(env, [["historyList", "ul"], ["recentAction", "p"]]);
    env.load(appSource);
    const App = env.window.CapitalConvert;
    App.initHistoryDrawer();
    App.logAction("finished a game");
    const history = JSON.parse(env.store.get("action-history:index.html"));
    check("corrupt game history", raw + ": a result can still be logged",
      Array.isArray(history) && history.every((entry) => typeof entry === "string") &&
      history[0].includes("finished a game"));
    check("corrupt game history", raw + ": only valid old entries are retained",
      history.length === (raw.startsWith("[") ? 2 : 1));
  });
});

run("Republic choice identity", () => {
  const env = createEnvironment({ storageMode: "readwrite-throw" });
  seed(env, [["rqQuestion", "p"], ["rqOptions", "div"], ["rqNote", "p"],
    ["rqProgress", "span"], ["rqScore", "span"], ["rqStreak", "span"],
    ["rqResult", "p"], ["rqNextBtn", "button"], ["rqNewBtn", "button"],
    ["rqBest", "span"], ["rqDeckSel", "select"]]);
  env.load(appSource);
  env.load("Math = Object.create(Math); Math.random = function () { return 0; };");
  const App = env.window.CapitalConvert;
  App.initRepublicQuizGame();
  const cards = App.republicDecks[0].cards;
  function current() {
    return cards.find((card) => card.q.en === env.byId("rqQuestion").textContent);
  }
  const card = current();
  const options = env.byId("rqOptions").children;
  check("Republic choice identity", "answer choices are shuffled independently of questions",
    options.map((node) => node.textContent).join("|") !== card.o.map((pair) => pair.en).join("|"));
  const correct = options.find((node) => node.textContent === card.o[card.a].en);
  correct.click();
  check("Republic choice identity", "a shuffled correct answer scores and is revealed correctly",
    env.byId("rqScore").textContent === "1" && correct.classList.contains("is-right"));
  check("Republic choice identity", "blocked storage does not prevent the explanation or streak",
    env.byId("rqNote").textContent === card.note.en && env.byId("rqStreak").textContent === "1");
  env.byId("rqNextBtn").click();
  const next = current();
  const nextOptions = env.byId("rqOptions").children;
  const wrong = nextOptions.find((node) => node.textContent !== next.o[next.a].en);
  const nextCorrect = nextOptions.find((node) => node.textContent === next.o[next.a].en);
  wrong.click();
  check("Republic choice identity", "a shuffled miss marks the chosen and correct visible buttons",
    wrong.classList.contains("is-wrong") && nextCorrect.classList.contains("is-right") &&
    !wrong.classList.contains("is-right") && env.byId("rqScore").textContent === "1");
});

/* A cleared rung must repaint its picker on the spot: the old star line used to
 * sit stale until a reload, so the player watched their fresh win not appear. */
run("campaign picker refresh", () => {
  const env = createEnvironment();
  env.load(appSource);
  env.domReady();
  const App = env.window.CapitalConvert;
  const select = env.document.createElement("select");
  env.document.body.appendChild(select);
  const campaign = App.createCampaign({
    key: "picker-probe",
    levels: [{ id: "a" }, { id: "b" }, { id: "c" }],
  });
  App.fillCampaignPicker(select, campaign, (level) => "level-" + level.id, "locked");
  const fresh = Array.from(select.children);
  check("campaign picker refresh", "a fresh picker shows stars on the open rung and lock words below",
    fresh.length === 3 &&
      fresh[0].textContent === "level-a \u00b7 \u2606\u2606\u2606" &&
      fresh[0].disabled === false &&
      fresh[1].textContent === "level-b \u00b7 locked" && fresh[1].disabled === true &&
      fresh[2].disabled === true);
  select.value = "a";
  campaign.record("a", { stars: 2, best: 7 });
  const painted = Array.from(select.children);
  check("campaign picker refresh", "recording a win repaints its stars on the same select",
    painted[0].textContent === "level-a \u00b7 \u2605\u2605\u2606" &&
      painted[1].disabled === false &&
      painted[1].textContent === "level-b \u00b7 \u2606\u2606\u2606" &&
      painted[2].disabled === true);
  check("campaign picker refresh", "the player's selection survives the repaint",
    select.value === "a");
  campaign.record("b", { stars: 3, best: 9 });
  const twice = Array.from(select.children);
  check("campaign picker refresh", "a second win unlocks the next rung without a reload",
    twice[1].textContent === "level-b \u00b7 \u2605\u2605\u2605" &&
      twice[2].disabled === false &&
      twice[2].textContent === "level-c \u00b7 \u2606\u2606\u2606");
});

if (require.main === module) {
  const lib = require("./lib");
  lib.caseResults.forEach((result) => console.log(`${result.failed ? "FAIL" : "PASS"} ${result.name}: ${result.checks} checks`));
  lib.failures.forEach((failure) => console.error(failure));
  process.exitCode = lib.failures.length ? 1 : 0;
}
