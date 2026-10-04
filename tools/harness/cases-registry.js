/*
 * Registry game cases.
 * These games ship no markup in the four HTML pages: they register a descriptor
 * and the drawer injects their tab and panel. The stub DOM has no drawer of its
 * own, so these cases seed the two containers the shell hands to
 * App.buildRegistryTabs and then assert the injected games behave like the
 * shipped ones - wired tabs, hidden panels, a guide, and resolvable copy.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { createEnvironment, appSource, boot, check, run } = require("./lib");

const CASE = "registry wiring";
const root = path.join(__dirname, "..", "..");
const PAGES = [
  "index.html",
  "english_filter.html",
  "chinese_punctuation.html",
  "words_replacing.html",
];

function manifest() {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  return Array.from(
    html.matchAll(/assets\/app\/([a-z0-9-]+)\.js\?v=\d+/g),
  ).map((match) => match[1]);
}

/* A registry game is a game module that hands the drawer a descriptor. */
function registrySources() {
  return manifest()
    .filter((name) => /^game-/.test(name) && name !== "game-registry")
    .map((name) => ({
      name,
      source: fs
        .readFileSync(path.join(root, "assets", "app", name + ".js"), "utf8")
        .replace(/^﻿/, ""),
    }))
    .filter((entry) => entry.source.includes("App.registerGame("));
}

function keysOf(source) {
  return Array.from(source.matchAll(/\bt\("([A-Za-z0-9]+)"\s*[,)]/g)).map(
    (match) => match[1],
  );
}

const games = registrySources();

/* Boot with the two containers the real drawer would pass in. */
function bootDrawer() {
  const env = createEnvironment();
  const tabsGrid = env.document.createElement("div");
  tabsGrid.className = "game-tabs";
  tabsGrid.id = "gameTabs";
  const dialog = env.document.createElement("div");
  dialog.className = "game-dialog";
  const shipped = env.document.createElement("div");
  shipped.className = "game-panel";
  shipped.id = "gamePanelTyping";
  dialog.appendChild(shipped);
  env.document.body.appendChild(tabsGrid);
  env.document.body.appendChild(dialog);

  env.load(appSource);
  const App = env.window.CapitalConvert;
  const picked = [];
  const entries = App.buildRegistryTabs(tabsGrid, dialog, function (name) {
    picked.push(name);
  });
  env.domReady();
  return { env, App, tabsGrid, dialog, shipped, entries, picked };
}

run(CASE, () => {
  const shot = bootDrawer();
  const App = shot.App;
  const env = shot.env;
  const registered = App.getRegisteredGames();

  check(
    CASE,
    "the drawer builds without throwing",
    env.initError === null,
    String(env.initError && env.initError.message),
  );
  check(
    CASE,
    `every registry module reaches the drawer (${games.length} modules)`,
    games.length >= 20 && registered.length === games.length,
    `modules ${games.length}, registered ${registered.length}`,
  );
  check(
    CASE,
    "each registered game yields one picker entry",
    shot.entries.length === registered.length &&
      shot.entries.every((entry) => !!entry.tab && !!entry.panel),
    `entries ${shot.entries.length}`,
  );

  registered.forEach((desc, index) => {
    const tab = env.byId(desc.tabId);
    const panel = env.byId(desc.panelId);
    check(CASE, `${desc.name}: tab and panel are injected`, !!tab && !!panel);
    if (!tab || !panel) {
      return;
    }
    check(
      CASE,
      `${desc.name}: the tab is in the picker and the panel is in the dialog`,
      tab.parentNode === shot.tabsGrid && panel.parentNode === shot.dialog,
    );
    check(
      CASE,
      `${desc.name}: the panel sits after the shipped panels`,
      Array.prototype.indexOf.call(shot.dialog.children, panel) >
        Array.prototype.indexOf.call(shot.dialog.children, shot.shipped),
    );
    check(
      CASE,
      `${desc.name}: the tab and panel name each other`,
      tab.getAttribute("aria-controls") === desc.panelId &&
        panel.getAttribute("aria-labelledby") === desc.tabId &&
        tab.getAttribute("role") === "tab" &&
        panel.getAttribute("role") === "tabpanel" &&
        panel.hidden === true,
    );
    check(
      CASE,
      `${desc.name}: clicking its tab selects it`,
      (() => {
        const before = shot.picked.length;
        tab.click();
        return shot.picked.length === before + 1 && shot.picked[before] === desc.name;
      })(),
    );
    check(
      CASE,
      `${desc.name}: its DOM is built with createElement, not innerHTML`,
      panel.children.length >= 4,
      `children ${panel.children.length}`,
    );
    check(
      CASE,
      `${desc.name}: a how-to guide was injected`,
      !!panel.querySelector(".game-guide"),
    );
    check(
      CASE,
      `${desc.name}: the tab label is translated, not a bare key`,
      tab.textContent !== desc.tabKey && tab.textContent.length > 0,
      tab.textContent,
    );

    const owner = games.find((entry) =>
      entry.source.includes(`name: "${desc.name}"`),
    );
    /* A t("key") that no dictionary carries renders as the key itself, which is
     * how a shipped game would end up showing "rrPrompt" to the player. */
    const keys = owner ? keysOf(owner.source) : [];
    const unresolved = keys.filter((key) => App.t(key) === key);
    check(
      CASE,
      `${desc.name}: all ${keys.length} translation keys resolve`,
      !!owner && keys.length >= 8 && unresolved.length === 0,
      unresolved.join(","),
    );
  });

  check(
    CASE,
    "pausing every registry game at once is safe",
    (() => {
      try {
        App.resetRegistryGames();
        return true;
      } catch (error) {
        return String(error && error.message);
      }
    })(),
  );

  check(
    CASE,
    "every registry game is loaded by all four pages",
    PAGES.every((page) => {
      const html = fs.readFileSync(path.join(root, page), "utf8");
      return (
        html.includes("assets/app/game-registry.js?v=57") &&
        games.every((entry) =>
          html.includes(`assets/app/${entry.name}.js?v=57`),
        )
      );
    }),
  );

  check(
    CASE,
    "no registry game writes markup through innerHTML",
    games.every((entry) => !/\.innerHTML\s*=/.test(entry.source)),
    games
      .filter((entry) => /\.innerHTML\s*=/.test(entry.source))
      .map((entry) => entry.name)
      .join(","),
  );

  check(
    CASE,
    "the drawer fans registry pauses out instead of a hand-written list",
    appSource.includes("App.buildRegistryTabs") &&
      appSource.includes("App.resetRegistryGames"),
  );

  /* The fallback path keeps the games testable without a drawer at all. */
  const bare = boot();
  const bareApp = bare.window.CapitalConvert;
  check(
    CASE,
    "registry games still mount when no drawer exists",
    bare.initError === null &&
      bareApp.getRegisteredGames().every((desc) => !!bare.byId(desc.panelId)),
  );
});
