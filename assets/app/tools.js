/* Text tools - Replace presets and rule data, the word-replace pipeline, the text transforms (format / filter / punctuation) and the tool page controls. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  var getFileName = App.getFileName;
  var t = App.t;
  var getElement = App.getElement;
  var getLineCount = App.getLineCount;
  var updateAllCounters = App.updateAllCounters;
  var saveUndoAction = App.saveUndoAction;
  var setStatus = App.setStatus;
  var logAction = App.logAction;
  var setChangeSummary = App.setChangeSummary;
  var setDiffPreview = App.setDiffPreview;
  var renderMatchedRuleSummary = App.renderMatchedRuleSummary;
  var buildChangeSummary = App.buildChangeSummary;
  var buildDiffSnippet = App.buildDiffSnippet;
  var triggerConvertFX = App.triggerConvertFX;
  var wordRuleExemptions = {
    "\u4e3b": [
      "\u6c11\u4e3b",
      "\u4e3b\u8981",
      "\u4e3b\u5bb0",
      "\u516c\u4e3b",
      "\u4e3b\u52a8",
    ],
    "\u795e": [
      "\u7cbe\u795e",
      "\u5fc3\u795e",
      "\u795e\u7ecf",
      "\u773c\u795e",
      "\u795e\u6001",
      "\u795e\u60c5",
      "\u795e\u8272",
      "\u795e\u91c7",
      "\u795e\u79d8",
      "\u795e\u5947",
      "\u795e\u5723",
      "\u795e\u901f",
      "\u795e\u8bdd",
      "\u795e\u6c14",
      "\u795e\u901a",
      "\u795e\u5fd7\u4e0d\u6e05",
      "\u795e\u9b42\u98a0\u5012",
      "\u63d0\u795e",
      "\u4f24\u795e",
      "\u5b89\u795e",
      "\u51dd\u795e",
      "\u8d39\u795e",
    ],
  };

  var wordRuleCategoryTerms = [
    {
      label: "Faith & Religion",
      labelKey: "catFaith",
      terms: [
        "\u5929\u4e3b\u6559",
        "\u4e3b",
        "\u8036\u7a23",
        "\u8036\u548c\u534e",
        "\u57fa\u7763",
        "\u5723\u7ecf",
        "\u5723\u7075",
        "\u5723\u6bcd\u739b\u5229\u4e9a",
        "\u54c8\u5229\u8def\u4e9a",
        "\u963f\u4eec",
        "\u963f\u95e8",
        "\u795e",
        "\u4e0a\u5e1d",
        "\u5341\u5b57\u67b6",
        "\u5723\u7236",
        "\u5929\u7236",
      ],
    },
    {
      label: "Substances",
      labelKey: "catSubstances",
      terms: [
        "\u5927\u9ebb",
        "\u6447\u5934\u4e38",
        "\u53ef\u5361\u56e0",
        "\u53ef\u5f85\u56e0",
        "\u767d\u7c89",
        "\u963f\u7247",
        "\u6d77\u6d1b\u56e0",
        "\u5417\u5561",
        "\u7b11\u6c14",
        "\u6bd2\u54c1",
        "\u5438\u7c89",
        "\u5438\u4e86\u6bd2",
        "\u5438\u6bd2",
        "\u5236\u6bd2",
        "\u85cf\u6bd2",
        "\u5356\u6bd2",
        "\u8d29\u6bd2",
        "\u6bd2\u8d29",
        "\u6bd2\u8d44",
        "\u6bd2\u7269",
        "\u6bd2\u67ad",
        "\u6bd2\u763e",
        "\u6bd2\u7a9d",
      ],
    },
    {
      label: "Adult & Body Terms",
      labelKey: "catAdult",
      terms: [
        "\u8272\u60c5\u7247",
        "\u6027\u5173\u7cfb",
        "\u6027\u4fb5",
        "\u6027\u7231",
        "\u4e73\u4ea4",
        "\u53e3\u6d3b",
        "\u4e73\u623f",
        "\u4e73\u5934",
        "\u777e\u4e38",
        "\u9f9f\u5934",
        "\u9e21\u5df4",
        "\u9633\u5177",
        "\u79c1\u5904",
        "\u5c04\u7cbe",
      ],
    },
    {
      label: "People & Language",
      labelKey: "catPeople",
      terms: [
        "\u599e",
        "\u9a6c\u5b50",
        "\u5a18\u4eec",
        "\u5993\u5973",
        "\u5a3c\u5987",
        "\u8361\u5987",
        "\u540c\u6027\u604b",
        "\u8d31\u4eba",
        "\u8d31\u8d27",
        "\u6df7\u86cb",
        "\u6df7\u8d26",
        "\u5a18\u70ae",
        "\u6742\u788e",
        "\u8f6f\u86cb",
        "\u5a4a\u5b50",
        "\u4ed6\u5988",
        "\u4ed6\u5988\u7684",
      ],
    },
  ];

  var wordReplacePresets = [
    {
      id: "default-replace",
      label: "Default Rule",
      labelKey: "presetDefault",
      rules: [
        { from: "\u5929\u4e3b\u6559", to: "\u5929*\u6559" },
        {
          from: "\u4e3b",
          to: "\u5929",
          pattern: /\u4e3b/g,
          replacer: function (match, offset, text) {
            var exemptions = wordRuleExemptions["\u4e3b"];

            for (var index = 0; index < exemptions.length; index += 1) {
              var phrase = exemptions[index];
              var phraseStart = offset - phrase.indexOf("\u4e3b");
              if (
                phraseStart >= 0 &&
                text.slice(phraseStart, phraseStart + phrase.length) === phrase
              ) {
                return match;
              }
            }

            return "\u5929";
          },
        },
        { from: "\u8036\u7a23", to: "\u8036*" },
        { from: "\u8036\u548c\u534e", to: "\u8036*\u534e" },
        { from: "\u57fa\u7763", to: "\u57fa*" },
        { from: "\u5723\u7ecf", to: "*\u7ecf" },
        { from: "\u5723\u7075", to: "\u7075\u5149" },
        {
          from: "\u5723\u6bcd\u739b\u5229\u4e9a",
          to: "\u5723\u6bcd\u739b*\u4e9a",
        },
        { from: "\u54c8\u5229\u8def\u4e9a", to: "\u54c8**\u4e9a" },
        { from: "\u963f\u4eec", to: "\u8bda\u5fc3\u6240\u613f" },
        { from: "\u963f\u95e8", to: "\u8bda\u5fc3\u6240\u613f" },
        {
          from: "\u795e",
          to: "\u5929",
          pattern: /\u795e/g,
          replacer: function (match, offset, text) {
            var exemptions = wordRuleExemptions["\u795e"];

            for (var index = 0; index < exemptions.length; index += 1) {
              var phrase = exemptions[index];
              var phraseStart = offset - phrase.indexOf("\u795e");
              if (
                phraseStart >= 0 &&
                text.slice(phraseStart, phraseStart + phrase.length) === phrase
              ) {
                return match;
              }
            }

            return "\u5929";
          },
        },
        { from: "\u4e0a\u5e1d", to: "\u4e0a*" },
        { from: "\u5341\u5b57\u67b6", to: "\u5341*\u67b6" },
        { from: "\u5723\u7236", to: "\u5929" },
        { from: "\u5929\u7236", to: "\u5929" },
        { from: "\u5927\u9ebb", to: "\u70df" },
        { from: "\u6447\u5934\u4e38", to: "\u836f" },
        { from: "\u53ef\u5361\u56e0", to: "\u836f\u7269" },
        { from: "\u53ef\u5f85\u56e0", to: "\u836f\u7269" },
        { from: "\u767d\u7c89", to: "\u836f\u7269" },
        { from: "\u963f\u7247", to: "\u8ff7\u5e7b" },
        { from: "\u6d77\u6d1b\u56e0", to: "\u836f\u7269" },
        { from: "\u5417\u5561", to: "\u836f\u7269" },
        { from: "\u7b11\u6c14", to: "\u751c\u7a7a\u6c14" },
        { from: "\u6bd2\u54c1", to: "\u836f\u54c1" },
        { from: "\u5438\u7c89", to: "\u5438\u836f" },
        { from: "\u5438\u4e86\u6bd2", to: "\u78d5\u4e86\u836f" },
        { from: "\u5438\u6bd2", to: "\u55d1\u836f" },
        { from: "\u5236\u6bd2", to: "\u5236\u836f" },
        { from: "\u85cf\u6bd2", to: "\u85cf\u836f" },
        { from: "\u5356\u6bd2", to: "\u5356\u836f" },
        { from: "\u8d29\u6bd2", to: "\u8d29\u836f" },
        { from: "\u6bd2\u8d29", to: "\u836f\u8d29" },
        { from: "\u6bd2\u8d44", to: "\u836f\u94b1" },
        { from: "\u6bd2\u7269", to: "\u836f\u7269" },
        { from: "\u6bd2\u67ad", to: "\u836f\u67ad" },
        { from: "\u6bd2\u763e", to: "\u836f\u763e" },
        { from: "\u6bd2\u7a9d", to: "\u836f\u7a9d" },
        { from: "\u599e", to: "\u5973\u4eba" },
        { from: "\u9a6c\u5b50", to: "\u5973\u4eba" },
        { from: "\u5a18\u4eec", to: "\u5973\u4eba" },
        { from: "\u5993\u5973", to: "\u5973\u4eba" },
        { from: "\u5a3c\u5987", to: "\u5973\u4eba" },
        { from: "\u8361\u5987", to: "\u574f\u5973\u4eba" },
        { from: "\u540c\u6027\u604b", to: "\u5708\u5185\u4eba" },
        {
          from: "\u6b7b\u5c38",
          to: "\u53e6\u4e00\u4e2a\u4e16\u754c\u7684\u4eba",
        },
        { from: "Flow", to: "\u8282\u594f" },
        { from: "flow", to: "\u8282\u594f" },
        { from: "\u8272\u60c5\u7247", to: "\u4e09\u7ea7\u7247" },
        { from: "\u6027\u5173\u7cfb", to: "\u5173\u7cfb" },
        { from: "\u6027\u4fb5", to: "\u4fb5\u72af" },
        { from: "\u6027\u7231", to: "\u7f20\u7ef5" },
        { from: "\u4e73\u4ea4", to: "\u7d27\u8d34" },
        { from: "\u53e3\u6d3b", to: "\u4eb2\u5bc6\u63a5\u89e6" },
        { from: "\u4e73\u623f", to: "\u8eab\u4f53" },
        { from: "\u4e73\u5934", to: "\u8eab\u4f53" },
        { from: "\u777e\u4e38", to: "\u4e24\u4e2a\u7403" },
        { from: "\u9f9f\u5934", to: "\u4e0b\u9762" },
        { from: "\u9e21\u5df4", to: "\u4e0b\u9762" },
        { from: "\u9633\u5177", to: "\u4e0b\u9762" },
        { from: "\u79c1\u5904", to: "\u4e0b\u9762" },
        { from: "\u5c04\u7cbe", to: "\u723d\u4e00\u4e0b" },
        { from: "\u8d31\u4eba", to: "\u574f\u4eba" },
        { from: "\u8d31\u8d27", to: "\u70c2\u4eba" },
        { from: "\u6df7\u86cb", to: "\u574f\u86cb" },
        { from: "\u6df7\u8d26", to: "\u574f" },
        { from: "\u5a18\u70ae", to: "\u5bb6\u4f19" },
        { from: "\u6742\u788e", to: "\u70c2\u4eba" },
        { from: "\u8f6f\u86cb", to: "\u80c6\u5c0f\u9b3c" },
        { from: "\u6253\u7206", to: "\u9524" },
        { from: "\u5a4a\u5b50", to: "\u5973\u4eba" },
        { from: "\u4ed6\u5988", to: "" },
        { from: "\u4ed6\u5988\u7684", to: "" },
      ],
    },
    {
      id: "speaker-tags",
      label: "Speaker Tags Removal",
      labelKey: "presetSpeaker",
      rules: [
        { from: "\uff08\u7537\uff1a\uff09", to: "" },
        { from: "\uff08\u5973\uff1a\uff09", to: "" },
        { from: "\uff08\u5408\uff1a\uff09", to: "" },
        { from: "\u7537\uff1a", to: "" },
        { from: "\u5973\uff1a", to: "" },
        { from: "\u5408\uff1a", to: "" },
        { from: "\u5408:", to: "" },
      ],
    },
  ];

  function getOutputFileName() {
    var current = getFileName(location.pathname || "index.html");
    if (current === "english_filter.html") {
      return "filtered-text.txt";
    }
    if (current === "chinese_punctuation.html") {
      return "converted-punctuation.txt";
    }
    if (current === "words_replacing.html") {
      return "replaced-words.txt";
    }
    return "formatted-text.txt";
  }

  function getSelectedWordPreset() {
    var presetSelect = getElement("rulePreset");
    if (!presetSelect) {
      return null;
    }

    for (var index = 0; index < wordReplacePresets.length; index += 1) {
      if (wordReplacePresets[index].id === presetSelect.value) {
        return wordReplacePresets[index];
      }
    }

    return wordReplacePresets[0] || null;
  }

  function getWordRuleCategory(rule, preset) {
    if (preset.id === "speaker-tags") {
      return t("catSpeakerTags");
    }

    for (var index = 0; index < wordRuleCategoryTerms.length; index += 1) {
      if (wordRuleCategoryTerms[index].terms.indexOf(rule.from) !== -1) {
        return t(wordRuleCategoryTerms[index].labelKey);
      }
    }

    return t("catGeneral");
  }

  function getWordRulePreviewEntries(preset) {
    var entries = preset.rules.map(function (rule) {
      return {
        from: rule.from,
        to: rule.to,
        category: getWordRuleCategory(rule, preset),
        isExemption: false,
      };
    });

    if (preset.id === "default-replace") {
      Object.keys(wordRuleExemptions).forEach(function (sourceTerm) {
        wordRuleExemptions[sourceTerm].forEach(function (phrase) {
          entries.push({
            from: phrase,
            to: t("keepTerm", { term: sourceTerm }),
            category: t("catExemptions"),
            isExemption: true,
          });
        });
      });
    }

    return entries;
  }

  function createRuleValue(value, className) {
    var element = document.createElement("span");
    element.className = className;
    element.textContent = value;
    return element;
  }

  function renderWordPresetPreview() {
    var list = getElement("rulePreviewList");
    var search = getElement("ruleSearch");
    var ruleCount = getElement("ruleCount");
    var matchCount = getElement("ruleMatchCount");
    var preset = getSelectedWordPreset();
    if (!list || !preset) {
      return;
    }

    var entries = getWordRulePreviewEntries(preset);
    var query = search ? search.value.trim().toLocaleLowerCase() : "";
    var visibleEntries = entries.filter(function (entry) {
      if (!query) {
        return true;
      }

      return (
        [entry.from, entry.to, entry.category]
          .join(" ")
          .toLocaleLowerCase()
          .indexOf(query) !== -1
      );
    });

    if (ruleCount) {
      var protectedCount = entries.length - preset.rules.length;
      ruleCount.textContent = protectedCount
        ? t("rulesWithProtected", {
            n: preset.rules.length,
            m: protectedCount,
          })
        : t("rulesCount", { n: preset.rules.length });
    }

    if (matchCount) {
      matchCount.textContent = t("rulesShown", {
        n: visibleEntries.length,
      });
    }

    list.innerHTML = "";

    if (!visibleEntries.length) {
      var empty = document.createElement("p");
      empty.className = "rule-empty";
      empty.textContent = t("noRulesMatch");
      list.appendChild(empty);
      return;
    }

    var groupedEntries = {};
    var categoryOrder = [];

    visibleEntries.forEach(function (entry) {
      if (!groupedEntries[entry.category]) {
        groupedEntries[entry.category] = [];
        categoryOrder.push(entry.category);
      }
      groupedEntries[entry.category].push(entry);
    });

    categoryOrder.forEach(function (category) {
      var group = document.createElement("section");
      group.className = "rule-group";

      var heading = document.createElement("div");
      heading.className = "rule-group-heading";

      var title = document.createElement("h2");
      title.textContent = category;

      var count = document.createElement("span");
      count.textContent = groupedEntries[category].length;

      heading.appendChild(title);
      heading.appendChild(count);
      group.appendChild(heading);

      var grid = document.createElement("div");
      grid.className = "rule-grid";

      groupedEntries[category].forEach(function (entry) {
        var item = document.createElement("div");
        item.className =
          "rule-item" + (entry.isExemption ? " rule-item-exemption" : "");

        item.appendChild(createRuleValue(entry.from, "rule-from"));

        var arrow = document.createElement("span");
        arrow.className = "rule-arrow";
        arrow.setAttribute("aria-hidden", "true");
        arrow.textContent = "\u2192";
        item.appendChild(arrow);

        var targetLabel = entry.to || "Remove";
        item.appendChild(
          createRuleValue(
            targetLabel,
            entry.isExemption ? "rule-to rule-keep" : "rule-to",
          ),
        );
        grid.appendChild(item);
      });

      group.appendChild(grid);
      list.appendChild(group);
    });
  }

  function initWordReplacer() {
    var presetSelect = getElement("rulePreset");
    var ruleSearch = getElement("ruleSearch");
    if (!presetSelect) {
      return;
    }

    presetSelect.innerHTML = "";
    wordReplacePresets.forEach(function (preset) {
      var option = document.createElement("option");
      option.value = preset.id;
      option.textContent = t(preset.labelKey);
      presetSelect.appendChild(option);
    });

    presetSelect.addEventListener("change", function () {
      if (ruleSearch) {
        ruleSearch.value = "";
      }
      renderWordPresetPreview();
      setStatus(t("statusPresetUpdated"), "success");
      logAction(
        t("logPreset", {
          name:
            presetSelect.options[presetSelect.selectedIndex].textContent,
        }),
      );
    });

    if (ruleSearch) {
      ruleSearch.addEventListener("input", renderWordPresetPreview);
    }

    renderWordPresetPreview();
  }

  function focusOutput() {
    var output = getElement("outputText");
    if (!output) {
      return;
    }

    output.focus();
    output.select();
  }

  function initCounters() {
    [getElement("inputText"), getElement("outputText")].forEach(
      function (textarea) {
        if (!textarea) {
          return;
        }

        textarea.addEventListener("input", updateAllCounters);
      },
    );

    updateAllCounters();
  }

  function fallbackCopy(text, textarea) {
    if (textarea) {
      textarea.focus();
      textarea.select();
    }

    return document.execCommand("copy");
  }

  function initUtilityActions() {
    var input = getElement("inputText");
    var output = getElement("outputText");
    var copyButton = getElement("copyBtn");
    var pasteButton = getElement("pasteBtn");
    var clearInputButton = getElement("clearInputBtn");
    var clearOutputButton = getElement("clearOutputBtn");
    var downloadButton = getElement("downloadBtn");
    var swapButton = getElement("swapBtn");

    if (copyButton && output) {
      copyButton.addEventListener("click", function () {
        if (!output.value) {
          setStatus(t("statusNothingCopy"), "error");
          return;
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(output.value).then(
            function () {
              setStatus(t("statusCopied"), "success");
              logAction(t("logCopied"));
            },
            function () {
              if (fallbackCopy(output.value, output)) {
                setStatus(t("statusCopied"), "success");
                logAction(t("logCopied"));
              } else {
                setStatus(t("statusCopyFail"), "error");
              }
            },
          );
          return;
        }

        if (fallbackCopy(output.value, output)) {
          setStatus(t("statusCopied"), "success");
          logAction(t("logCopied"));
        } else {
          setStatus(t("statusCopyFail"), "error");
        }
      });
    }

    if (pasteButton && input) {
      pasteButton.addEventListener("click", function () {
        if (!(navigator.clipboard && navigator.clipboard.readText)) {
          setStatus(t("statusNoPasteSupport"), "error");
          return;
        }

        navigator.clipboard.readText().then(
          function (text) {
            input.value = text;
            updateAllCounters();
            setStatus(t("statusPasted"), "success");
            logAction(t("logPasted"));
            input.focus();
          },
          function () {
            setStatus(t("statusPasteDenied"), "error");
          },
        );
      });
    }

    if (clearInputButton && input) {
      clearInputButton.addEventListener("click", function () {
        var previousValue = input.value;
        input.value = "";
        updateAllCounters();
        setStatus(t("statusInputCleared"), "success");
        logAction(t("logClearedInput"));
        setDiffPreview("", output ? buildDiffSnippet(output.value) : "");
        saveUndoAction(function () {
          input.value = previousValue;
          updateAllCounters();
          setStatus(t("statusInputRestored"), "success");
          logAction(t("logUndoInput"));
          input.focus();
        });
        input.focus();
      });
    }

    if (clearOutputButton && output) {
      clearOutputButton.addEventListener("click", function () {
        var previousValue = output.value;
        output.value = "";
        updateAllCounters();
        setStatus(t("statusOutputCleared"), "success");
        logAction(t("logClearedOutput"));
        setChangeSummary(t("statusOutputClearedSummary"));
        renderMatchedRuleSummary([]);
        setDiffPreview(input ? buildDiffSnippet(input.value) : "", "");
        saveUndoAction(function () {
          output.value = previousValue;
          updateAllCounters();
          setStatus(t("statusOutputRestored"), "success");
          logAction(t("logUndoOutput"));
          focusOutput();
        });
      });
    }

    if (downloadButton && output) {
      downloadButton.addEventListener("click", function () {
        if (!output.value) {
          setStatus(t("statusNothingDownload"), "error");
          return;
        }

        var blob = new Blob([output.value], {
          type: "text/plain;charset=utf-8",
        });
        var link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = getOutputFileName();
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        setStatus(t("statusDownloaded", { name: link.download }), "success");
        logAction(t("logDownloaded", { name: link.download }));
      });
    }

    if (swapButton && input && output) {
      swapButton.addEventListener("click", function () {
        if (!output.value) {
          setStatus(t("statusNothingSwap"), "error");
          return;
        }

        var previousInput = input.value;
        var previousOutput = output.value;
        input.value = previousOutput;
        output.value = previousInput;
        updateAllCounters();
        setStatus(t("statusSwapped"), "success");
        logAction(t("logSwapped"));
        setChangeSummary(t("swapSummary"));
        setDiffPreview(
          buildDiffSnippet(previousInput),
          buildDiffSnippet(previousOutput),
        );
        input.focus();
      });
    }
  }

  function initShortcuts() {
    var input = getElement("inputText");
    var primary = getElement("primaryBtn");

    if (primary) {
      primary.title = t("shortcutHint");
    }

    if (input) {
      input.addEventListener("keydown", function (event) {
        if (event.ctrlKey && (event.key === "Enter" || event.keyCode === 13)) {
          if (primary) {
            primary.click();
          }
        }
      });
    }
  }

  function preserveVisibleCharacters(text) {
    return text
      .split("")
      .map(function (char) {
        if (/[a-zA-Z0-9\s\.,!?`'"\-:;()\[\]{}]/.test(char)) {
          return char;
        }

        if (/[\u2018\u2019\u0027]/.test(char)) {
          return char;
        }

        if (/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(char)) {
          return char;
        }

        return "";
      })
      .join("");
  }

  function finishTransform(outputValue, actionLabel, inputValue, options) {
    var input = getElement("inputText");
    var output = getElement("outputText");
    if (!output) {
      return;
    }

    output.value = outputValue;
    if (input) {
      input.value = "";
    }
    output.classList.remove("output-reveal");
    void output.offsetWidth;
    output.classList.add("output-reveal");
    updateAllCounters();
    setChangeSummary(
      buildChangeSummary(actionLabel, inputValue || "", outputValue),
    );
    setDiffPreview(
      buildDiffSnippet(inputValue || ""),
      buildDiffSnippet(outputValue),
      options && options.highlightTerms ? options.highlightTerms : [],
    );
    focusOutput();
    setStatus(
      t("statusDone", {
        action: actionLabel,
        n: getLineCount(outputValue),
      }),
      "success",
    );
    logAction(t("logActionDone", { action: actionLabel }));
    triggerConvertFX();
  }

  function formatLine(line, shouldNormalizeCase) {
    if (line.trim() === "") {
      return line;
    }

    var formattedLine = shouldNormalizeCase ? line.toLowerCase() : line;
    var hasMultipleCapitalizedWords =
      formattedLine
        .split(" ")
        .filter(function (word) {
          return word.length >= 2;
        })
        .filter(function (word) {
          return (
            word === word.toUpperCase() &&
            /^[A-Z][A-Z'\u2018\u2019\-]*$/.test(word)
          );
        }).length >= 2;

    if (
      hasMultipleCapitalizedWords ||
      /\b[A-Z][A-Z'\u2018\u2019\-]+\b/.test(formattedLine)
    ) {
      formattedLine = formattedLine
        .split(" ")
        .map(function (word) {
          if (
            word.length >= 2 &&
            word === word.toUpperCase() &&
            /^[A-Z][A-Z'\u2018\u2019\-]*$/.test(word)
          ) {
            return word.toLowerCase();
          }
          return word;
        })
        .join(" ");
    }

    formattedLine =
      formattedLine.charAt(0).toUpperCase() + formattedLine.slice(1);

    var replacements = [
      [/\bi\b/g, "I"],
      [/\bIve\b/g, "I've"],
      [/\bIam\b/g, "I am"],
      [/\bIm\b/g, "I'm"],
      [/\bImma\b/g, "I'mma"],
      [/\bI dont\b/g, "I don't"],
      [/\bIll\b/g, "I'll"],
      [/\bId\b/g, "I'd"],
      [/\byoure\b/gi, "you're"],
      [/\byoull\b/gi, "you'll"],
      [/\byoud\b/gi, "you'd"],
      [/\bwont\b/gi, "won't"],
      [/\bcant\b/gi, "can't"],
      [/\bdont\b/gi, "don't"],
      [/\bdidnt\b/gi, "didn't"],
      [/\bwasnt\b/gi, "wasn't"],
      [/\bwerent\b/gi, "weren't"],
      [/\bisnt\b/gi, "isn't"],
      [/\barent\b/gi, "aren't"],
      [/\bhavent\b/gi, "haven't"],
      [/\bhasnt\b/gi, "hasn't"],
      [/\bhadnt\b/gi, "hadn't"],
      [/\bweve\b/gi, "we've"],
      [/\btheyll\b/gi, "they'll"],
      [/\btheyre\b/gi, "they're"],
      [/\btheyve\b/gi, "they've"],
      [/\btheyd\b/gi, "they'd"],
      [/\bwed\b/gi, "we'd"],
      [/\bshes\b/gi, "she's"],
      [/\bhes\b/gi, "he's"],
      [/\bits\b/gi, "it's"],
      [/\bthats\b/gi, "that's"],
      [/\bwhats\b/gi, "what's"],
      [/\bwheres\b/gi, "where's"],
      [/\btheres\b/gi, "there's"],
      [/\bheres\b/gi, "here's"],
    ];

    replacements.forEach(function (pair) {
      formattedLine = formattedLine.replace(pair[0], pair[1]);
    });

    formattedLine = formattedLine.replace(/(?<!')\b(cause)\b/gi, "'cause");
    formattedLine = formattedLine.replace(
      /(?:^|\.\s+)('?)(c)(ause)\b/gi,
      function (match, apostrophe, cLetter) {
        return (
          (apostrophe ? "'" : "'") +
          cLetter.toUpperCase() +
          "ause".toLowerCase()
        );
      },
    );

    formattedLine =
      formattedLine.charAt(0).toUpperCase() + formattedLine.slice(1);
    formattedLine = formattedLine.replace(/\[.*?\]/g, "");

    return preserveVisibleCharacters(formattedLine);
  }

  function convertChinesePunctuation(text) {
    return text
      .replace(/[\u3000\uff0c\u3001\uff1a\uff1b]/g, " ")
      .replace(/[\u3002\uff01\uff1f]/g, " ")
      .replace(
        /[\u3010\u3011\u300c\u300d\u300e\u300f\u300a\u300b\u201c\u201d\u2018\u2019\u2026\u2014\uff5e]/g,
        "",
      )
      .replace(/-/g, " ")
      .replace(/[ ]{2,}/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }


  /* Exported for the other modules. */
  App.initWordReplacer = initWordReplacer;
  App.getSelectedWordPreset = getSelectedWordPreset;
  App.initCounters = initCounters;
  App.initUtilityActions = initUtilityActions;
  App.initShortcuts = initShortcuts;
  App.finishTransform = finishTransform;
  App.formatLine = formatLine;
  App.convertChinesePunctuation = convertChinesePunctuation;
})(window.CapitalConvert = window.CapitalConvert || {});
