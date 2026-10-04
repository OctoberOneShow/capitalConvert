/* Game Registry - the drawer's extension point. A module registers a descriptor
 * here and the shell injects its tab and panel, runs its init and pauses it
 * through the usual quietReset hook, so adding a game never touches the four
 * HTML pages. Panel contents are built with createElement (never innerHTML) so
 * the headless harness can drive them too. */
(function (App) {
  var games = [];
  var byName = {};

  function pascal(name) {
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  function registerGame(desc) {
    if (!desc || !desc.name || typeof desc.init !== "function" || byName[desc.name]) {
      return false;
    }
    desc.tabId = "gameTab" + pascal(desc.name);
    desc.panelId = "gamePanel" + pascal(desc.name);
    desc.panelEl = null;
    desc.started = false;
    byName[desc.name] = desc;
    games.push(desc);
    return true;
  }

  function createPanel(desc) {
    var panel = document.createElement("div");
    panel.className = "game-panel";
    panel.id = desc.panelId;
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-labelledby", desc.tabId);
    panel.hidden = true;
    desc.panelEl = panel;
    return panel;
  }

  /* Tabs go into the picker grid, panels next to the panels the pages already
   * ship. Without a drawer (headless cases) the panel is mounted on the body so
   * getElement still resolves the ids a game builds inside it. */
  function buildRegistryTabs(tabsGrid, dialog, onSelect) {
    var entries = [];
    var anchor = null;
    if (dialog) {
      var shipped = dialog.querySelectorAll(".game-panel");
      anchor = shipped.length ? shipped[shipped.length - 1] : null;
    }
    games.forEach(function (desc) {
      var tab = document.createElement("button");
      tab.type = "button";
      tab.className = "game-tab";
      tab.id = desc.tabId;
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-selected", "false");
      tab.setAttribute("aria-controls", desc.panelId);
      tab.tabIndex = -1;
      tab.setAttribute("data-i18n", desc.tabKey);
      tab.textContent = App.t ? App.t(desc.tabKey) : desc.tabKey;
      tab.addEventListener("click", function () {
        if (onSelect) {
          onSelect(desc.name);
        }
      });

      var panel = createPanel(desc);
      if (tabsGrid) {
        tabsGrid.appendChild(tab);
      }
      if (dialog) {
        if (anchor && anchor.parentNode === dialog) {
          dialog.insertBefore(panel, anchor.nextSibling);
        } else {
          dialog.appendChild(panel);
        }
      } else {
        document.body.appendChild(panel);
      }
      entries.push({ name: desc.name, tab: tab, panel: panel });
    });
    /* The injected subtree carries data-i18n hooks like the shipped markup, so
     * one shared pass translates it in whichever language the page loaded in. */
    if (App.applyI18nDom && games.length) {
      App.applyI18nDom();
    }
    return entries;
  }

  function initRegistryGames() {
    games.forEach(function (desc) {
      if (desc.started) {
        return;
      }
      desc.started = true;
      if (!desc.panelEl) {
        document.body.appendChild(createPanel(desc));
      }
      desc.init(desc.panelEl);
    });
  }

  /* Shell pause: every registered game may expose App.quietReset<Name>, the
   * same hook the shipped games use when the drawer switches tab or closes. */
  function resetRegistryGames() {
    games.forEach(function (desc) {
      var hook = App["quietReset" + pascal(desc.name)];
      if (typeof hook === "function") {
        hook();
      }
    });
  }

  function getRegistryGuides() {
    return games
      .filter(function (desc) {
        return !!desc.guide;
      })
      .map(function (desc) {
        return {
          id: desc.name,
          panel: desc.panelId,
          svg: desc.guide.svg,
          en: desc.guide.en,
          zh: desc.guide.zh,
        };
      });
  }

  function getRegisteredGames() {
    return games.slice();
  }

  /* Exported for the other modules. */
  App.registerGame = registerGame;
  App.buildRegistryTabs = buildRegistryTabs;
  App.initRegistryGames = initRegistryGames;
  App.resetRegistryGames = resetRegistryGames;
  App.getRegistryGuides = getRegistryGuides;
  App.getRegisteredGames = getRegisteredGames;
})(window.CapitalConvert = window.CapitalConvert || {});
