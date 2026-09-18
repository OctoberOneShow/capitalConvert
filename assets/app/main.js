/* Page bootstrap - Init order for every feature and the global text-tool entry points. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  var t = App.t;
  var applyI18nDom = App.applyI18nDom;
  var initLanguagePicker = App.initLanguagePicker;
  var getElement = App.getElement;
  var logAction = App.logAction;
  var setChangeSummary = App.setChangeSummary;
  var renderMatchedRuleSummary = App.renderMatchedRuleSummary;
  var setActiveNav = App.setActiveNav;
  var initTheme = App.initTheme;
  var initMotionControls = App.initMotionControls;
  var initHistoryDrawer = App.initHistoryDrawer;
  var initBackground = App.initBackground;
  var initAmbientOrbs = App.initAmbientOrbs;
  var initAnimations = App.initAnimations;
  var initTypingEffect = App.initTypingEffect;
  var initSectionParallax = App.initSectionParallax;
  var applySavedLayout = App.applySavedLayout;
  var initDraggableSections = App.initDraggableSections;
  var initResetLayout = App.initResetLayout;
  var initUndo = App.initUndo;
  var initCursorEffect = App.initCursorEffect;
  var initPageClickEffect = App.initPageClickEffect;
  var initAmbientDust = App.initAmbientDust;
  var initHoverSparks = App.initHoverSparks;
  var getSelectedWordPreset = App.getSelectedWordPreset;
  var initWordReplacer = App.initWordReplacer;
  var initCounters = App.initCounters;
  var initUtilityActions = App.initUtilityActions;
  var initShortcuts = App.initShortcuts;
  var finishTransform = App.finishTransform;
  var formatLine = App.formatLine;
  var convertChinesePunctuation = App.convertChinesePunctuation;
  var initTypingGame = App.initTypingGame;
  var initMemoryGame = App.initMemoryGame;
  var initElements = App.initElements;
  var initG2048 = App.initG2048;
  var initReflexGame = App.initReflexGame;
  var initCaretDash = App.initCaretDash;
  var initPet = App.initPet;
  document.addEventListener("DOMContentLoaded", function () {
    applyI18nDom();
    initPet();
    initLanguagePicker();
    initMotionControls();
    initAmbientOrbs();
    initHistoryDrawer();
    setActiveNav();
    initTheme();
    initWordReplacer();
    initTypingGame();
    initMemoryGame();
    initG2048();
    initReflexGame();
    initCaretDash();
    initElements();
    initCounters();
    initUtilityActions();
    initUndo();
    initShortcuts();
    initBackground();
    initAnimations();
    initTypingEffect();
    initSectionParallax();
    applySavedLayout();
    initDraggableSections();
    initResetLayout();
    initCursorEffect();
    initPageClickEffect();
    initAmbientDust();
    initHoverSparks();
  });

  window.formatText = function () {
    var input = getElement("inputText");
    if (!input) {
      return;
    }

    var inputText = input.value;
    var isAllCaps =
      inputText === inputText.toUpperCase() && inputText.trim().length > 0;
    var formattedLines = inputText.split("\n").map(function (line) {
      return formatLine(line, isAllCaps);
    });

    finishTransform(formattedLines.join("\n"), t("actionFormatted"), inputText);
  };

  window.filterText = function () {
    var input = getElement("inputText");
    if (!input) {
      return;
    }

    var filteredLines = input.value.split("\n").map(function (line) {
      return line
        .split("")
        .map(function (char) {
          if (/[a-zA-Z0-9\s\.,!?`'"\-:;()\[\]{}@#$%^&*+=|\\/<>~_]/.test(char)) {
            return char;
          }

          if (/[\u2018\u2019\u0027]/.test(char)) {
            return char;
          }

          if (/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(char)) {
            return "";
          }

          return char;
        })
        .join("");
    });

    finishTransform(filteredLines.join("\n"), t("actionFiltered"), input.value);
  };

  window.convertPunctuation = function () {
    var input = getElement("inputText");
    if (!input) {
      return;
    }

    finishTransform(
      convertChinesePunctuation(input.value),
      t("actionConverted"),
      input.value,
    );
  };

  window.replaceWords = function () {
    var input = getElement("inputText");
    var preset = getSelectedWordPreset();
    if (!input || !preset) {
      return;
    }

    var originalText = input.value;
    var replacedText = originalText;
    var totalMatches = 0;
    var matchedRules = [];

    preset.rules.forEach(function (rule) {
      if (!rule.from) {
        return;
      }

      var ruleMatches = 0;

      if (rule.pattern) {
        rule.pattern.lastIndex = 0;
        replacedText = replacedText.replace(rule.pattern, function () {
          var replacementValue;

          if (typeof rule.replacer === "function") {
            replacementValue = rule.replacer.apply(null, arguments);
          } else {
            replacementValue =
              typeof rule.replacement !== "undefined"
                ? rule.replacement
                : rule.to;
          }

          if (replacementValue !== arguments[0]) {
            totalMatches += 1;
            ruleMatches += 1;
          }

          return replacementValue;
        });

        if (ruleMatches > 0) {
          matchedRules.push({
            from: rule.from,
            to: rule.to,
            count: ruleMatches,
          });
        }
        return;
      }

      var parts = replacedText.split(rule.from);
      ruleMatches = Math.max(parts.length - 1, 0);
      totalMatches += ruleMatches;
      replacedText = parts.join(rule.to);

      if (ruleMatches > 0) {
        matchedRules.push({ from: rule.from, to: rule.to, count: ruleMatches });
      }
    });

    finishTransform(replacedText, t("actionReplaced"), originalText, {
      highlightTerms: matchedRules.map(function (match) {
        return match.to;
      }),
    });

    if (totalMatches > 0) {
      setChangeSummary(
        t("replacementsSummary", {
          n: totalMatches,
          m: matchedRules.length,
          nUnit:
            totalMatches === 1 ? t("unitReplacement") : t("unitReplacements"),
          mUnit: matchedRules.length === 1 ? t("unitRule") : t("unitRules"),
        }),
      );
    } else {
      setChangeSummary(t("noChangeSummary"));
    }

    renderMatchedRuleSummary(matchedRules);
    logAction(t("logReplacedWith", { name: t(preset.labelKey) }));
  };
})(window.CapitalConvert = window.CapitalConvert || {});
