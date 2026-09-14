(function () {
  function getFileName(path) {
    try {
      return path.split("/").pop().split("\\").pop();
    } catch (error) {
      return path;
    }
  }

  try {
    if (
      document.documentElement.getAttribute("data-motion") === "off" &&
      "onpageswap" in window
    ) {
      window.addEventListener("pageswap", function (event) {
        if (event.viewTransition) {
          event.viewTransition.skipTransition();
        }
      });
      window.addEventListener("pagereveal", function (event) {
        if (event.viewTransition) {
          event.viewTransition.skipTransition();
        }
      });
    }
  } catch (error) {
    /* no-op: view transition skip is a progressive enhancement */
  }

  var I18N = {
    en: {
      "langLabel": "Language",
      "navFormatter": "Text Formatter",
      "navFilter": "English Filter",
      "navPunctuation": "Chinese Converter",
      "navReplacer": "Words Replacer",
      "motionLabel": "Motion",
      "motionFull": "Full",
      "motionCalm": "Calm",
      "motionOff": "Off",
      "btnResetLayout": "Reset Layout",
      "btnUndo": "Undo",
      "openGames": "Open games",
      "toLight": "Switch to light theme",
      "toDark": "Switch to dark theme",
      "historyToggle": "History",
      "recentActivity": "Recent Activity",
      "btnClearHistory": "Clear",
      "noRecent": "No recent actions yet.",
      "noActions": "No actions recorded yet.",
      "inputLabel": "Input Text",
      "drag": "Drag",
      "dragTitle": "Drag to move, or click for position buttons",
      "repositionInput": "Reposition input card",
      "repositionOutput": "Reposition output card",
      "repositionRules": "Reposition rules card",
      "btnPaste": "Paste",
      "btnClear": "Clear",
      "btnCopy": "Copy",
      "btnDownload": "Download",
      "btnSwap": "Swap Back",
      "summaryDefault": "Summary will appear after you run a tool.",
      "previewChanges": "Preview changes",
      "diffBefore": "Before",
      "diffAfter": "After",
      "noInputYet": "No input yet.",
      "noOutputYet": "No output yet.",
      "footer": "Made with care by capitalConvert",
      "formatter.docTitle": "Text Formatter",
      "formatter.title": "Text Formatter",
      "formatter.desc":
        "This tool converts informal text to proper sentence case, fixes contractions, removes brackets, and filters non-English characters while preserving Chinese text.",
      "formatter.outputLabel": "Formatted Text",
      "formatter.primary": "Format Text",
      "formatter.phInput": "Enter your informal text here...",
      "formatter.phOutput": "Formatted text will appear here...",
      "filter.docTitle": "English Letter Filter",
      "filter.title": "English Letter Filter",
      "filter.desc":
        "This tool filters out Chinese characters while preserving English letters, numbers, and all punctuation marks. Perfect for cleaning mixed-language text.",
      "filter.outputLabel": "Filtered Text",
      "filter.primary": "Filter Text",
      "filter.phInput": "Enter your mixed text here (English + Chinese)...",
      "filter.phOutput": "Filtered text will appear here...",
      "punctuation.docTitle": "Chinese Punctuation Remover",
      "punctuation.title": "Chinese Punctuation Remover",
      "punctuation.desc":
        "This tool removes Chinese punctuation marks and strips unwanted characters from the text. Perfect for cleaning Chinese text before further formatting.",
      "punctuation.outputLabel": "Cleaned Text",
      "punctuation.primary": "Remove Punctuation",
      "punctuation.phInput": "Enter text with Chinese punctuation marks...",
      "punctuation.phOutput": "Cleaned text will appear here...",
      "replacer.docTitle": "Words Replacer",
      "replacer.title": "Words Replacer",
      "replacer.desc":
        "This tool applies selectable default word-replacement rules. For example, the preset can replace 主 with 天 automatically.",
      "replacer.rulesLabel": "Default Rules",
      "replacer.presetLabel": "Preset",
      "replacer.browseRules": "Browse Rules",
      "replacer.primary": "Replace Words",
      "replacer.phInput": "Enter text to apply the selected replacement rules...",
      "replacer.phOutput": "Replaced text will appear here...",
      "replacer.phSearch": "Search source, replacement, or category...",
      "unitCharacters": "characters",
      "unitCharacter": "character",
      "unitLines": "lines",
      "unitLine": "line",
      "counterFormat": "{chars} {charUnit} | {lines} {lineUnit}",
      "statusTheme": "Theme updated.",
      "statusMotion": "Motion level updated.",
      "statusHistoryCleared": "History cleared.",
      "statusNothingCopy": "Nothing to copy yet.",
      "statusCopied": "Output copied to clipboard.",
      "statusCopyFail": "Copy failed. Try selecting the text manually.",
      "statusNoPasteSupport": "Clipboard paste is not available in this browser.",
      "statusPasted": "Clipboard pasted into input.",
      "statusPasteDenied": "Paste permission was not granted.",
      "statusInputCleared": "Input cleared.",
      "statusInputRestored": "Input restored.",
      "statusOutputCleared": "Output cleared.",
      "statusOutputRestored": "Output restored.",
      "statusOutputClearedSummary":
        "Output cleared. Run a tool to generate a fresh summary.",
      "statusNothingDownload": "Nothing to download yet.",
      "statusDownloaded": "Downloaded {name}.",
      "statusNothingSwap": "Nothing to swap back yet.",
      "statusSwapped": "Input and output swapped.",
      "swapSummary":
        "Swapped the current output back into input for another pass.",
      "shortcutHint": "Shortcut: Ctrl+Enter",
      "statusLayoutReset": "Layout reset to its original position.",
      "statusLayoutRestored": "Previous layout restored.",
      "statusCardReset": "{name} card position reset.",
      "statusCardRestored": "{name} card position restored.",
      "statusPresetUpdated": "Replacement preset updated.",
      "statusNoPasteGame": "No pasting during a sprint. Type it out!",
      "logAt": "{msg} at {time}.",
      "logMotion": "Changed motion to {value}",
      "logCopied": "Copied output",
      "logPasted": "Pasted clipboard into input",
      "logClearedInput": "Cleared input",
      "logClearedOutput": "Cleared output",
      "logDownloaded": "Downloaded {name}",
      "logSwapped": "Swapped input and output",
      "logResetLayout": "Reset layout",
      "logUndoLayout": "Undid layout reset",
      "logUndoInput": "Undid input clear",
      "logUndoOutput": "Undid output clear",
      "logPreset": "Selected preset {name}",
      "logReplacedWith": "Replaced words with {name}",
      "logResetCard": "Reset {name} card position",
      "logUndoCard": "Undid card position reset",
      "logTyping": "Typing Sprint: {n} WPM",
      "logMemory": "Glyph Match in {s}s",
      "logActionDone": "{action} text",
      "changeSummary":
        "{action} {inLines} lines into {outLines} lines and {delta}.",
      "deltaSteady": "kept the character count steady",
      "deltaAdded": "added {n} characters",
      "deltaRemoved": "removed {n} characters",
      "noChangeSummary":
        "No replacements were needed. None of the selected rules matched.",
      "replacementsSummary": "{n} {nUnit} across {m} {mUnit}.",
      "unitReplacements": "replacements",
      "unitReplacement": "replacement",
      "unitRules": "matched rules",
      "unitRule": "matched rule",
      "noContent": "No content.",
      "actionFormatted": "Formatted",
      "actionFiltered": "Filtered",
      "actionConverted": "Converted",
      "actionReplaced": "Replaced",
      "statusDone": "{action} {n} lines.",
      "presetDefault": "Default Rule",
      "presetSpeaker": "Speaker Tags Removal",
      "catFaith": "Faith & Religion",
      "catSubstances": "Substances",
      "catAdult": "Adult & Body Terms",
      "catPeople": "People & Language",
      "catSpeakerTags": "Speaker Tags",
      "catExemptions": "Exemptions",
      "catGeneral": "General",
      "rulesCount": "{n} rules",
      "rulesWithProtected": "{n} rules · {m} protected",
      "rulesShown": "{n} shown",
      "noRulesMatch": "No rules match your search.",
      "noRulesLoaded": "No rules loaded yet.",
      "matchedRulesLabel": "Matched replacement rules",
      "ruleRemove": "Remove",
      "keepTerm": "Keep {term}",
      "padGroup": "Move {name} card",
      "padUp": "Move card up",
      "padDown": "Move card down",
      "padLeft": "Move card left",
      "padRight": "Move card right",
      "padReset": "Return card to its default position",
      "padHint":
        "Arrow keys move the card while the handle is focused. Hold Shift for larger steps.",
      "dirUp": "up",
      "dirDown": "down",
      "dirLeft": "left",
      "dirRight": "right",
      "announceMoved": "{name} card moved {dir}.",
      "announceReset": "{name} card returned to its default position.",
      "announceAlreadyDefault":
        "{name} card is already at its default position.",
      "gamesTitle": "Games",
      "closeGames": "Close games",
      "tablistLabel": "Choose a game",
      "tabTyping": "Typing Sprint",
      "tabMemory": "Glyph Match",
      "tab2048": "2048",
      "hudTime": "Time",
      "hudWpm": "WPM",
      "hudAcc": "Acc",
      "hudMoves": "Moves",
      "hudPairs": "Pairs",
      "hudScore": "Score",
      "hudBest": "Best",
      "typingPrompt": "Type the first character to start the clock.",
      "typingFinished":
        "Finished in {s}s at {wpm} WPM with {acc}% accuracy.",
      "typingTimeUp": "Time up at {wpm} WPM with {acc}% accuracy.",
      "newBest": "New best!",
      "bestWpm": "Best {n} WPM",
      "noBest": "No best yet",
      "hintTyping":
        "A 10-second typing dash. The clock starts on your first keystroke.",
      "btnNewRound": "New Round",
      "gamePhInput": "Start typing to begin...",
      "memoryPrompt": "Flip two cards. Match all six pairs as fast as you can.",
      "memoryCleared": "Cleared in {s}s with {n} {unit}.",
      "unitMoves": "moves",
      "unitMove": "move",
      "cardDown": "Card {n}, face down",
      "cardGlyph": "Card {n}, {glyph}",
      "cardMatched": "Card {n}, {glyph}, matched",
      "btnNewShuffle": "New Shuffle",
      "memoryGridLabel": "Memory cards, find the matching pairs",
      "bestTime": "Best {s}s",
      "g2048Prompt":
        "Arrow keys or swipe slide the tiles. Match numbers to reach 2048!",
      "g2048BoardLabel":
        "2048 board. Focus here and use the arrow keys to slide the tiles.",
      "g2048Over": "Game over at {n}",
      "g2048Win": "You reached 2048!",
      "g2048WinContinue": "You reached 2048! Keep going for a higher score.",
      "g2048OverResult": "Game over at {n}.",
      "btnTryAgain": "Try Again",
      "btnKeepGoing": "Keep Going",
      "btnNewGame": "New Game",
    },
    zh: {
      "langLabel": "语言",
      "navFormatter": "文本格式化",
      "navFilter": "英文过滤",
      "navPunctuation": "中文标点",
      "navReplacer": "词语替换",
      "motionLabel": "动效",
      "motionFull": "完整",
      "motionCalm": "舒缓",
      "motionOff": "关闭",
      "btnResetLayout": "重置布局",
      "btnUndo": "撤销",
      "openGames": "打开游戏",
      "toLight": "切换到浅色主题",
      "toDark": "切换到深色主题",
      "historyToggle": "历史记录",
      "recentActivity": "最近操作",
      "btnClearHistory": "清空",
      "noRecent": "暂无最近操作。",
      "noActions": "暂无操作记录。",
      "inputLabel": "输入文本",
      "drag": "拖动",
      "dragTitle": "拖拽移动，或点击打开移动按钮",
      "repositionInput": "移动输入卡片",
      "repositionOutput": "移动输出卡片",
      "repositionRules": "移动规则卡片",
      "btnPaste": "粘贴",
      "btnClear": "清空",
      "btnCopy": "复制",
      "btnDownload": "下载",
      "btnSwap": "换回",
      "summaryDefault": "运行工具后将在此显示摘要。",
      "previewChanges": "预览更改",
      "diffBefore": "之前",
      "diffAfter": "之后",
      "noInputYet": "暂无输入。",
      "noOutputYet": "暂无输出。",
      "footer": "由 capitalConvert 用心制作",
      "formatter.docTitle": "文本格式化工具",
      "formatter.title": "文本格式化",
      "formatter.desc":
        "该工具将非正式文本转换为规范的句首大写，修正缩写，移除方括号，并在保留中文的同时过滤非英文字符。",
      "formatter.outputLabel": "格式化文本",
      "formatter.primary": "格式化文本",
      "formatter.phInput": "在此输入非正式文本...",
      "formatter.phOutput": "格式化结果将显示在这里...",
      "filter.docTitle": "英文字符过滤",
      "filter.title": "英文字符过滤",
      "filter.desc":
        "该工具在保留英文字母、数字和全部标点的同时过滤中文字符，适合清理中英混排文本。",
      "filter.outputLabel": "过滤结果",
      "filter.primary": "过滤文本",
      "filter.phInput": "在此输入中英混排文本...",
      "filter.phOutput": "过滤结果将显示在这里...",
      "punctuation.docTitle": "中文标点清除",
      "punctuation.title": "中文标点清除",
      "punctuation.desc":
        "该工具移除中文标点并清理多余字符，适合在进一步排版前整理中文文本。",
      "punctuation.outputLabel": "清理结果",
      "punctuation.primary": "移除标点",
      "punctuation.phInput": "在此输入含中文标点的文本...",
      "punctuation.phOutput": "清理结果将显示在这里...",
      "replacer.docTitle": "词语替换",
      "replacer.title": "词语替换",
      "replacer.desc":
        "该工具应用可选的默认词语替换规则，例如自动将 主 替换为 天。",
      "replacer.rulesLabel": "默认规则",
      "replacer.presetLabel": "预设",
      "replacer.browseRules": "浏览规则",
      "replacer.primary": "替换词语",
      "replacer.phInput": "输入要应用替换规则的文本...",
      "replacer.phOutput": "替换结果将显示在这里...",
      "replacer.phSearch": "搜索原词、替换词或分类...",
      "unitCharacters": "字符",
      "unitCharacter": "字符",
      "unitLines": "行",
      "unitLine": "行",
      "counterFormat": "{chars} 字符 | {lines} 行",
      "statusTheme": "主题已切换。",
      "statusMotion": "动效已更新。",
      "statusHistoryCleared": "历史已清空。",
      "statusNothingCopy": "暂无可复制的内容。",
      "statusCopied": "已复制到剪贴板。",
      "statusCopyFail": "复制失败，请手动选择文本。",
      "statusNoPasteSupport": "当前浏览器不支持读取剪贴板。",
      "statusPasted": "剪贴板内容已粘贴到输入框。",
      "statusPasteDenied": "未授予剪贴板读取权限。",
      "statusInputCleared": "输入已清空。",
      "statusInputRestored": "输入已恢复。",
      "statusOutputCleared": "输出已清空。",
      "statusOutputRestored": "输出已恢复。",
      "statusOutputClearedSummary": "输出已清空。运行工具可生成新的摘要。",
      "statusNothingDownload": "暂无可下载的内容。",
      "statusDownloaded": "已下载 {name}。",
      "statusNothingSwap": "暂无可换回的内容。",
      "statusSwapped": "输入与输出已互换。",
      "swapSummary": "已将当前输出换回输入，可再次处理。",
      "shortcutHint": "快捷键：Ctrl+Enter",
      "statusLayoutReset": "布局已重置到初始位置。",
      "statusLayoutRestored": "已恢复之前的布局。",
      "statusCardReset": "「{name}」卡片位置已重置。",
      "statusCardRestored": "「{name}」卡片位置已恢复。",
      "statusPresetUpdated": "替换预设已更新。",
      "statusNoPasteGame": "冲刺中禁止粘贴，请手动输入！",
      "logAt": "{msg}（{time}）",
      "logMotion": "动效切换为 {value}",
      "logCopied": "复制输出",
      "logPasted": "粘贴剪贴板到输入框",
      "logClearedInput": "清空输入",
      "logClearedOutput": "清空输出",
      "logDownloaded": "下载 {name}",
      "logSwapped": "互换输入与输出",
      "logResetLayout": "重置布局",
      "logUndoLayout": "撤销布局重置",
      "logUndoInput": "撤销清空输入",
      "logUndoOutput": "撤销清空输出",
      "logPreset": "选择预设 {name}",
      "logReplacedWith": "以 {name} 替换词语",
      "logResetCard": "重置{name}卡片位置",
      "logUndoCard": "撤销卡片位置重置",
      "logTyping": "打字冲刺：{n} WPM",
      "logMemory": "灵符配对：{s} 秒完成",
      "logActionDone": "已{action}文本",
      "changeSummary": "{action} {inLines} 行为 {outLines} 行，{delta}。",
      "deltaSteady": "字符数保持不变",
      "deltaAdded": "新增 {n} 个字符",
      "deltaRemoved": "移除 {n} 个字符",
      "noChangeSummary": "无需替换，所选规则均未命中。",
      "replacementsSummary": "共替换 {n} {nUnit}，命中 {m} {mUnit}。",
      "unitReplacements": "处",
      "unitReplacement": "处",
      "unitRules": "条规则",
      "unitRule": "条规则",
      "noContent": "无内容。",
      "actionFormatted": "格式化",
      "actionFiltered": "过滤",
      "actionConverted": "转换",
      "actionReplaced": "替换",
      "statusDone": "已{action} {n} 行。",
      "presetDefault": "默认规则",
      "presetSpeaker": "移除说话人标签",
      "catFaith": "宗教信仰",
      "catSubstances": "毒品相关",
      "catAdult": "成人与身体词汇",
      "catPeople": "人身与称谓",
      "catSpeakerTags": "说话人标签",
      "catExemptions": "豁免词",
      "catGeneral": "通用",
      "rulesCount": "{n} 条规则",
      "rulesWithProtected": "{n} 条规则 · {m} 个保护词",
      "rulesShown": "已显示 {n} 条",
      "noRulesMatch": "没有符合搜索的规则。",
      "noRulesLoaded": "规则尚未加载。",
      "matchedRulesLabel": "命中的替换规则",
      "ruleRemove": "删除",
      "keepTerm": "保留{term}",
      "padGroup": "移动{name}卡片",
      "padUp": "上移卡片",
      "padDown": "下移卡片",
      "padLeft": "左移卡片",
      "padRight": "右移卡片",
      "padReset": "恢复卡片默认位置",
      "padHint": "手柄聚焦时可用方向键移动卡片；按住 Shift 可大幅移动。",
      "dirUp": "上移",
      "dirDown": "下移",
      "dirLeft": "左移",
      "dirRight": "右移",
      "announceMoved": "「{name}」卡片已{dir}。",
      "announceReset": "「{name}」卡片已恢复默认位置。",
      "announceAlreadyDefault": "「{name}」卡片已在默认位置。",
      "gamesTitle": "游戏",
      "closeGames": "关闭游戏",
      "tablistLabel": "选择游戏",
      "tabTyping": "打字冲刺",
      "tabMemory": "灵符配对",
      "tab2048": "2048",
      "hudTime": "时间",
      "hudWpm": "WPM",
      "hudAcc": "准确率",
      "hudMoves": "步数",
      "hudPairs": "配对",
      "hudScore": "得分",
      "hudBest": "最佳",
      "typingPrompt": "输入第一个字符开始计时。",
      "typingFinished": "{s} 秒完成，{wpm} WPM，准确率 {acc}%。",
      "typingTimeUp": "时间到：{wpm} WPM，准确率 {acc}%。",
      "newBest": "新纪录！",
      "bestWpm": "最佳 {n} WPM",
      "noBest": "暂无纪录",
      "hintTyping": "10 秒打字冲刺，从敲下第一个字符开始计时。",
      "btnNewRound": "新一局",
      "gamePhInput": "输入即可开始...",
      "memoryPrompt": "翻开两张卡片，尽快配齐六对。",
      "memoryCleared": "用时 {s} 秒，{n} {unit}完成。",
      "unitMoves": "步",
      "unitMove": "步",
      "cardDown": "第 {n} 张，未翻开",
      "cardGlyph": "第 {n} 张，{glyph}",
      "cardMatched": "第 {n} 张，{glyph}，已配对",
      "btnNewShuffle": "重新洗牌",
      "memoryGridLabel": "记忆卡片，找出所有配对",
      "bestTime": "最佳 {s} 秒",
      "g2048Prompt": "方向键或滑动屏幕移动方块，合出 2048！",
      "g2048BoardLabel": "2048 棋盘。聚焦后使用方向键移动方块。",
      "g2048Over": "游戏结束，得分 {n}",
      "g2048Win": "你合成了 2048！",
      "g2048WinContinue": "你合成了 2048！继续挑战更高分。",
      "g2048OverResult": "游戏结束，得分 {n}。",
      "btnTryAgain": "再来一局",
      "btnKeepGoing": "继续游戏",
      "btnNewGame": "新游戏",
    },
  };

  var currentLang = (function () {
    var saved = null;
    try {
      saved = localStorage.getItem("lang");
    } catch (error) {
      saved = null;
    }
    if (saved === "en" || saved === "zh") {
      return saved;
    }
    return (navigator.language || "").toLowerCase().indexOf("zh") === 0
      ? "zh"
      : "en";
  })();

  function t(key, vars) {
    var dict = I18N[currentLang] || I18N.en;
    var text = dict[key];
    if (text == null) {
      text = I18N.en[key];
    }
    if (text == null) {
      text = key;
    }
    if (vars) {
      Object.keys(vars).forEach(function (name) {
        text = text.split("{" + name + "}").join(String(vars[name]));
      });
    }
    return text;
  }

  function applyI18nDom() {
    var pageName =
      document.documentElement.getAttribute("data-page") || "formatter";
    document.documentElement.lang = currentLang === "zh" ? "zh-CN" : "en";
    document.title = t(pageName + ".docTitle");

    document.querySelectorAll("[data-i18n]").forEach(function (element) {
      element.textContent = t(element.getAttribute("data-i18n"));
    });
    document
      .querySelectorAll("[data-i18n-placeholder]")
      .forEach(function (element) {
        element.setAttribute(
          "placeholder",
          t(element.getAttribute("data-i18n-placeholder")),
        );
      });
    document.querySelectorAll("[data-i18n-aria]").forEach(function (element) {
      element.setAttribute("aria-label", t(element.getAttribute("data-i18n-aria")));
    });
    document.querySelectorAll("[data-i18n-title]").forEach(function (element) {
      element.setAttribute("title", t(element.getAttribute("data-i18n-title")));
    });
  }

  function initLanguagePicker() {
    var select = getElement("langSelect");
    if (!select) {
      return;
    }

    select.value = currentLang;
    select.addEventListener("change", function () {
      try {
        localStorage.setItem("lang", select.value);
      } catch (error) {
        /* no-op: language falls back to the browser preference */
      }
      location.reload();
    });
  }

  function getElement(id) {
    return document.getElementById(id);
  }

  function getLayoutStorageKey() {
    return "card-layout:" + getFileName(location.pathname || "index.html");
  }

  function getHistoryStorageKey() {
    return "action-history:" + getFileName(location.pathname || "index.html");
  }

  function getMotionStorageKey() {
    return "motion-level";
  }

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

  function getLineCount(text) {
    return text.length === 0 ? 0 : text.split("\n").length;
  }

  function updateCounter(textarea, counter) {
    if (!textarea || !counter) {
      return;
    }

    var chars = textarea.value.length;
    var lines = getLineCount(textarea.value);
    var charLabel = chars === 1 ? t("unitCharacter") : t("unitCharacters");
    var lineLabel = lines === 1 ? t("unitLine") : t("unitLines");
    var nextText = t("counterFormat", {
      chars: chars,
      charUnit: charLabel,
      lines: lines,
      lineUnit: lineLabel,
    });

    if (counter.textContent !== nextText) {
      counter.textContent = nextText;
      counter.classList.remove("counter-tick");
      void counter.offsetWidth;
      counter.classList.add("counter-tick");
    }
  }

  function updateAllCounters() {
    updateCounter(getElement("inputText"), getElement("inputCounter"));
    updateCounter(getElement("outputText"), getElement("outputCounter"));
  }

  var lastUndoAction = null;
  var actionHistory = [];

  function updateUndoButton() {
    var undoButton = getElement("undoBtn");
    if (!undoButton) {
      return;
    }

    var wasDisabled = undoButton.disabled;
    undoButton.disabled = !lastUndoAction;

    if (wasDisabled && !undoButton.disabled) {
      undoButton.classList.remove("button-enabled");
      void undoButton.offsetWidth;
      undoButton.classList.add("button-enabled");
    }
  }

  function saveUndoAction(action) {
    lastUndoAction = action;
    updateUndoButton();
  }

  function clearUndoAction() {
    lastUndoAction = null;
    updateUndoButton();
  }

  function getTimestampLabel() {
    return new Date().toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function setRecentAction(message) {
    var recentAction = getElement("recentAction");
    if (!recentAction) {
      return;
    }

    recentAction.textContent = message;
  }

  function readActionHistory() {
    try {
      return JSON.parse(localStorage.getItem(getHistoryStorageKey()) || "[]");
    } catch (error) {
      return [];
    }
  }

  function writeActionHistory(history) {
    localStorage.setItem(getHistoryStorageKey(), JSON.stringify(history));
  }

  function renderActionHistory() {
    var historyList = getElement("historyList");
    if (!historyList) {
      return;
    }

    historyList.innerHTML = "";
    if (actionHistory.length === 0) {
      historyList.innerHTML = "<li>" + t("noActions") + "</li>";
      return;
    }

    actionHistory.forEach(function (entry) {
      var item = document.createElement("li");
      item.textContent = entry;
      historyList.appendChild(item);
    });
  }

  function setStatus(message, tone) {
    var status = getElement("statusMessage");
    if (!status) {
      return;
    }

    status.textContent = message || "";
    status.className = "status-message" + (tone ? " " + tone : "");
    status.style.animation = "none";
    void status.offsetWidth;
    status.style.removeProperty("animation");
  }

  function logAction(message) {
    var entry = t("logAt", { msg: message, time: getTimestampLabel() });
    setRecentAction(entry);
    actionHistory.unshift(entry);
    actionHistory = actionHistory.slice(0, 8);
    writeActionHistory(actionHistory);
    renderActionHistory();
  }

  function getMotionLevel() {
    return document.documentElement.getAttribute("data-motion") || "full";
  }

  function applyMotionLevel(level) {
    document.documentElement.setAttribute("data-motion", level);
  }

  function isMotionOff() {
    return getMotionLevel() === "off";
  }

  function isMotionCalm() {
    return getMotionLevel() === "calm";
  }

  function setChangeSummary(text) {
    var summary = getElement("changeSummary");
    if (!summary) {
      return;
    }

    summary.textContent = text;
    summary.style.animation = "none";
    void summary.offsetWidth;
    summary.style.removeProperty("animation");
  }

  function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function renderHighlightedText(container, text, highlightTerms) {
    var terms = [];
    var seen = {};

    (highlightTerms || []).forEach(function (term) {
      if (!term || seen[term]) {
        return;
      }
      seen[term] = true;
      terms.push(term);
    });

    if (!terms.length) {
      container.textContent = text;
      return;
    }

    terms.sort(function (left, right) {
      return right.length - left.length;
    });

    var pattern = new RegExp(
      "(" + terms.map(escapeRegExp).join("|") + ")",
      "g",
    );
    var highlighted = {};
    terms.forEach(function (term) {
      highlighted[term] = true;
    });

    container.textContent = "";
    text.split(pattern).forEach(function (part) {
      if (highlighted[part]) {
        var mark = document.createElement("mark");
        mark.className = "diff-highlight";
        mark.textContent = part;
        container.appendChild(mark);
      } else {
        container.appendChild(document.createTextNode(part));
      }
    });
  }

  function setDiffPreview(beforeText, afterText, highlightTerms) {
    var preview = getElement("diffPreview");
    var before = getElement("diffBefore");
    var after = getElement("diffAfter");
    if (!preview || !before || !after) {
      return;
    }

    before.textContent = beforeText || "No input yet.";
    renderHighlightedText(after, afterText || "No output yet.", highlightTerms);
    preview.open = !!beforeText || !!afterText;
  }

  function renderMatchedRuleSummary(matchedRules) {
    var container = getElement("matchedRuleSummary");
    if (!container) {
      return;
    }

    container.innerHTML = "";
    container.hidden = !matchedRules.length;

    matchedRules.forEach(function (match) {
      var chip = document.createElement("span");
      chip.className = "matched-rule-chip";

      var mapping = document.createElement("span");
      mapping.textContent = match.from + " \u2192 " + (match.to || t("ruleRemove"));

      var count = document.createElement("strong");
      count.textContent = "\u00d7" + match.count;

      chip.appendChild(mapping);
      chip.appendChild(count);
      container.appendChild(chip);
    });
  }

  function buildChangeSummary(actionLabel, inputValue, outputValue) {
    var inputLines = getLineCount(inputValue);
    var outputLines = getLineCount(outputValue);
    var inputChars = inputValue.length;
    var outputChars = outputValue.length;
    var delta = outputChars - inputChars;
    var deltaLabel =
      delta === 0
        ? t("deltaSteady")
        : delta > 0
          ? t("deltaAdded", { n: delta })
          : t("deltaRemoved", { n: Math.abs(delta) });
    return t("changeSummary", {
      action: actionLabel,
      inLines: inputLines,
      outLines: outputLines,
      delta: deltaLabel,
    });
  }

  function buildDiffSnippet(text) {
    var snippet = text.trim();
    if (!snippet) {
      return t("noContent");
    }

    snippet = snippet.split("\n").slice(0, 4).join("\n");
    if (snippet.length > 260) {
      snippet = snippet.slice(0, 257) + "...";
    }
    return snippet;
  }

  function setActiveNav() {
    var current = getFileName(location.pathname || "index.html");
    document.querySelectorAll("nav a").forEach(function (link) {
      var hrefFile = getFileName(link.getAttribute("href") || "");
      if (!hrefFile) {
        return;
      }

      if (current === "" && hrefFile === "index.html") {
        link.classList.add("active");
        return;
      }

      if (current === hrefFile) {
        link.classList.add("active");
      }
    });
  }

  function applyTheme(theme) {
    var toggle = getElement("themeToggle");
    document.documentElement.setAttribute("data-theme", theme);
    if (toggle) {
      var isDark = theme === "dark";
      toggle.setAttribute("aria-pressed", String(isDark));
      toggle.setAttribute("aria-label", isDark ? t("toLight") : t("toDark"));
      toggle.setAttribute(
        "title",
        isDark ? t("toLight") : t("toDark"),
      );
    }
  }

  function initTheme() {
    var preferred = localStorage.getItem("theme");
    var systemDark =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    var theme = preferred || (systemDark ? "dark" : "light");
    var toggle = getElement("themeToggle");

    applyTheme(theme);

    if (toggle) {
      toggle.addEventListener("click", function () {
        var current =
          document.documentElement.getAttribute("data-theme") === "dark"
            ? "dark"
            : "light";
        var next = current === "dark" ? "light" : "dark";
        localStorage.setItem("theme", next);
        applyTheme(next);
        setStatus(t("statusTheme"), "success");
      });
    }
  }

  function initMotionControls() {
    var motionLevel = getElement("motionLevel");
    var savedLevel = localStorage.getItem(getMotionStorageKey());

    if (!savedLevel) {
      var prefersReducedMotion =
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      savedLevel = prefersReducedMotion ? "off" : "full";
    }

    applyMotionLevel(savedLevel);

    if (!motionLevel) {
      return;
    }

    motionLevel.value = savedLevel;
    motionLevel.addEventListener("change", function () {
      localStorage.setItem(getMotionStorageKey(), motionLevel.value);
      applyMotionLevel(motionLevel.value);
      setStatus(t("statusMotion"), "success");
      logAction(t("logMotion", { value: motionLevel.value }));
    });
  }

  function initHistoryDrawer() {
    var toggle = getElement("historyToggle");
    var drawer = getElement("historyDrawer");
    var clearButton = getElement("clearHistoryBtn");

    actionHistory = readActionHistory();
    renderActionHistory();
    if (actionHistory.length > 0) {
      setRecentAction(actionHistory[0]);
    } else {
      setRecentAction(t("noRecent"));
    }

    if (toggle && drawer) {
      toggle.addEventListener("click", function () {
        var nextHidden = !drawer.hidden;
        drawer.hidden = nextHidden;
        toggle.setAttribute("aria-expanded", String(!nextHidden));
      });
    }

    if (clearButton) {
      clearButton.addEventListener("click", function () {
        actionHistory = [];
        writeActionHistory(actionHistory);
        renderActionHistory();
        setRecentAction(t("noRecent"));
        setStatus(t("statusHistoryCleared"), "success");
      });
    }
  }

  function createRipple(event, button) {
    if (!event || !button) {
      return;
    }

    var circle = document.createElement("span");
    var diameter = Math.max(button.clientWidth, button.clientHeight);
    var radius = diameter / 2;
    var rect = button.getBoundingClientRect();

    circle.style.width = diameter + "px";
    circle.style.height = diameter + "px";
    circle.style.left = event.clientX - rect.left - radius + "px";
    circle.style.top = event.clientY - rect.top - radius + "px";
    circle.classList.add("ripple");

    var existing = button.getElementsByClassName("ripple")[0];
    if (existing) {
      existing.remove();
    }

    button.appendChild(circle);
  }

  function createConfetti(x, y) {
    if (isMotionOff()) {
      return;
    }

    var palette = ["#00f2ff", "#ff6b35", "#ff0055", "#ffd166"];

    for (var index = 0; index < 34; index += 1) {
      var particle = document.createElement("div");
      var size = 5 + Math.random() * 5;
      particle.style.position = "fixed";
      particle.style.left = x + "px";
      particle.style.top = y + "px";
      particle.style.width = size + "px";
      particle.style.height = (index % 3 === 0 ? size * 1.6 : size) + "px";
      particle.style.backgroundColor =
        palette[Math.floor(Math.random() * palette.length)];
      particle.style.borderRadius = index % 3 === 0 ? "2px" : "50%";
      particle.style.boxShadow = "0 0 8px rgba(0, 242, 255, 0.35)";
      particle.style.pointerEvents = "none";
      particle.style.zIndex = "9999";
      document.body.appendChild(particle);

      var angle = Math.random() * Math.PI * 2;
      var velocity = Math.random() * 130 + 70;
      var tx = Math.cos(angle) * velocity;
      var ty = Math.sin(angle) * velocity;
      var spin = Math.random() * 720 - 360;

      var animation = particle.animate(
        [
          { transform: "translate(0, 0) rotate(0deg) scale(1)", opacity: 1 },
          {
            transform:
              "translate(" +
              tx * 0.75 +
              "px, " +
              (ty * 0.75 - 42) +
              "px) rotate(" +
              spin * 0.5 +
              "deg) scale(1)",
            opacity: 1,
            offset: 0.45,
          },
          {
            transform:
              "translate(" +
              tx +
              "px, " +
              (ty + 95) +
              "px) rotate(" +
              spin +
              "deg) scale(0.1)",
            opacity: 0,
          },
        ],
        {
          duration: 950 + Math.random() * 500,
          easing: "cubic-bezier(0.16, 0.84, 0.44, 1)",
        },
      );
      animation.onfinish = (function (node) {
        return function () {
          node.remove();
        };
      })(particle);
    }
  }

  function createPageClickFX(x, y) {
    if (isMotionOff()) {
      return;
    }

    var bloom = document.createElement("div");
    bloom.className = "click-bloom";
    bloom.style.left = x + "px";
    bloom.style.top = y + "px";
    document.body.appendChild(bloom);

    bloom.addEventListener("animationend", function () {
      bloom.remove();
    });

    ["", " ring-warm"].forEach(function (extraClass) {
      var ring = document.createElement("div");
      ring.className = "click-ring" + extraClass;
      ring.style.left = x + "px";
      ring.style.top = y + "px";
      document.body.appendChild(ring);
      ring.addEventListener("animationend", function () {
        ring.remove();
      });
    });

    for (var index = 0; index < 8; index += 1) {
      var spark = document.createElement("div");
      var angle = (Math.PI * 2 * index) / 8;
      var distance = 26 + Math.random() * 22;
      var duration = 420 + Math.random() * 180;
      var offsetX = Math.cos(angle) * distance;
      var offsetY = Math.sin(angle) * distance;

      spark.className = "click-spark";
      spark.style.left = x + "px";
      spark.style.top = y + "px";
      document.body.appendChild(spark);

      var animation = spark.animate(
        [
          { transform: "translate(0, 0) scale(1)", opacity: 1 },
          {
            transform:
              "translate(" + offsetX + "px, " + offsetY + "px) scale(0.2)",
            opacity: 0,
          },
        ],
        {
          duration: duration,
          easing: "cubic-bezier(0.16, 1, 0.3, 1)",
        },
      );

      animation.onfinish = (function (node) {
        return function () {
          node.remove();
        };
      })(spark);
    }
  }

  function initBackground() {
    if (isMotionOff()) {
      return;
    }

    var canvas = document.createElement("canvas");
    canvas.id = "bg-canvas";
    canvas.setAttribute("aria-hidden", "true");
    document.body.prepend(canvas);

    var context = canvas.getContext("2d");
    var particles = [];
    var width;
    var height;
    var pointerX = -9999;
    var pointerY = -9999;
    var pointerActive = false;

    document.addEventListener("mousemove", function (event) {
      pointerX = event.clientX;
      pointerY = event.clientY;
      pointerActive = true;
    });

    document.addEventListener("mouseleave", function () {
      pointerActive = false;
      pointerX = -9999;
      pointerY = -9999;
    });

    function resize() {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    }

    function Particle() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.vx = (Math.random() - 0.5) * 0.5;
      this.vy = (Math.random() - 0.5) * 0.5;
      this.bvx = this.vx;
      this.bvy = this.vy;
      this.size = Math.random() * 2 + 1;
      this.color =
        Math.random() > 0.5 ? "rgba(0, 242, 255, " : "rgba(255, 107, 53, ";
    }

    Particle.prototype.update = function (calmMode) {
      if (pointerActive && !calmMode) {
        var dx = pointerX - this.x;
        var dy = pointerY - this.y;
        var dist = Math.hypot(dx, dy);
        if (dist < 260 && dist > 1) {
          var pull = (1 - dist / 260) * 0.05;
          this.vx += (dx / dist) * pull - (dy / dist) * pull * 0.55;
          this.vy += (dy / dist) * pull + (dx / dist) * pull * 0.55;
        }
      }

      this.vx += (this.bvx - this.vx) * 0.015;
      this.vy += (this.bvy - this.vy) * 0.015;

      var speed = Math.hypot(this.vx, this.vy);
      if (speed > 2.4) {
        this.vx = (this.vx / speed) * 2.4;
        this.vy = (this.vy / speed) * 2.4;
      }

      this.x += this.vx;
      this.y += this.vy;

      if (this.x < 0 || this.x > width) {
        this.vx *= -1;
        this.bvx *= -1;
      }

      if (this.y < 0 || this.y > height) {
        this.vy *= -1;
        this.bvy *= -1;
      }
    };

    Particle.prototype.draw = function () {
      var glow = 0.5;
      var size = this.size;

      if (pointerActive) {
        var dist = Math.hypot(pointerX - this.x, pointerY - this.y);
        if (dist < 200) {
          var boost = 1 - dist / 200;
          glow = 0.5 + boost * 0.5;
          size = this.size + boost * 1.8;
        }
      }

      context.beginPath();
      context.arc(this.x, this.y, size, 0, Math.PI * 2);
      context.fillStyle = this.color + glow + ")";
      context.fill();
    };

    function animate() {
      if (isMotionOff()) {
        requestAnimationFrame(animate);
        return;
      }

      context.clearRect(0, 0, width, height);
      var calmMode = isMotionCalm();

      particles.forEach(function (particle, particleIndex) {
        particle.update(calmMode);
        particle.draw();

        for (
          var nextIndex = particleIndex + 1;
          nextIndex < particles.length;
          nextIndex += 1
        ) {
          var nearby = particles[nextIndex];
          var distance = Math.hypot(
            particle.x - nearby.x,
            particle.y - nearby.y,
          );
          if (distance < 150) {
            context.beginPath();
            context.strokeStyle =
              particle.color + (1 - distance / 150) * 0.2 + ")";
            context.lineWidth = 0.5;
            context.moveTo(particle.x, particle.y);
            context.lineTo(nearby.x, nearby.y);
            context.stroke();
          }
        }
      });

      if (pointerActive && !calmMode) {
        particles.forEach(function (particle) {
          var dist = Math.hypot(pointerX - particle.x, pointerY - particle.y);
          if (dist < 170) {
            context.beginPath();
            context.strokeStyle = particle.color + (1 - dist / 170) * 0.5 + ")";
            context.lineWidth = 0.9;
            context.moveTo(pointerX, pointerY);
            context.lineTo(particle.x, particle.y);
            context.stroke();
          }
        });
      }

      requestAnimationFrame(animate);
    }

    window.addEventListener("resize", resize);
    resize();

    for (var index = 0; index < 50; index += 1) {
      particles.push(new Particle());
    }

    animate();
  }

  function initAmbientOrbs() {
    if (isMotionOff()) {
      return;
    }

    var orbOne = document.createElement("div");
    var orbTwo = document.createElement("div");
    orbOne.className = "ambient-orb orb-one";
    orbTwo.className = "ambient-orb orb-two";
    orbOne.setAttribute("aria-hidden", "true");
    orbTwo.setAttribute("aria-hidden", "true");
    document.body.prepend(orbTwo);
    document.body.prepend(orbOne);
  }

  function initAnimations() {
    var elements = document.querySelectorAll(
      ".topbar, .page-title, .description, .section",
    );
    elements.forEach(function (element, index) {
      element.classList.add("fade-in-up");
      element.style.animationDelay = index * 100 + "ms";
      element.addEventListener(
        "animationend",
        function () {
          element.classList.remove("fade-in-up");
          element.style.removeProperty("animation-delay");
        },
        { once: true },
      );
    });

    document.querySelectorAll("button").forEach(function (button) {
      button.addEventListener("click", function (event) {
        createRipple(event, button);
      });
    });
  }

  function initTypingEffect() {
    document.querySelectorAll("textarea").forEach(function (textarea) {
      var timeoutId;

      textarea.addEventListener("input", function () {
        textarea.classList.add("typing");
        window.clearTimeout(timeoutId);
        timeoutId = window.setTimeout(function () {
          textarea.classList.remove("typing");
        }, 220);
      });
    });
  }

  function initSectionParallax() {
    if (
      isMotionOff() ||
      (window.matchMedia && window.matchMedia("(pointer: coarse)").matches)
    ) {
      return;
    }

    document.querySelectorAll(".section").forEach(function (section) {
      section.addEventListener("mousemove", function (event) {
        if (section.classList.contains("dragging")) {
          return;
        }

        var rect = section.getBoundingClientRect();
        var offsetX = ((event.clientX - rect.left) / rect.width - 0.5) * 16;
        var offsetY = ((event.clientY - rect.top) / rect.height - 0.5) * 16;
        section.style.setProperty("--tilt-x", -offsetY / 2 + "deg");
        section.style.setProperty("--tilt-y", offsetX / 2 + "deg");
        section.style.setProperty("--sheen-x", offsetX * 2 + "px");
        section.style.setProperty("--sheen-y", offsetY * 2 + "px");
        section.style.setProperty("--section-glow", "1");
      });

      section.addEventListener("mouseleave", function () {
        section.style.removeProperty("--tilt-x");
        section.style.removeProperty("--tilt-y");
        section.style.removeProperty("--sheen-x");
        section.style.removeProperty("--sheen-y");
        section.style.removeProperty("--section-glow");
      });
    });
  }

  function readSavedLayout() {
    try {
      return JSON.parse(localStorage.getItem(getLayoutStorageKey()) || "{}");
    } catch (error) {
      return {};
    }
  }

  function writeSavedLayout(layout) {
    localStorage.setItem(getLayoutStorageKey(), JSON.stringify(layout));
  }

  function applySavedLayout() {
    var saved = readSavedLayout();
    document
      .querySelectorAll(".section[data-card-id]")
      .forEach(function (section) {
        var cardId = section.getAttribute("data-card-id");
        var position = saved[cardId];
        if (!position) {
          return;
        }

        section.style.setProperty("--drag-x", position.x + "px");
        section.style.setProperty("--drag-y", position.y + "px");
      });
  }

  function initDraggableSections() {
    var activeCard = null;
    var startX = 0;
    var startY = 0;
    var baseX = 0;
    var baseY = 0;
    var highestZ = 10;
    var moveStep = 10;
    var moveStepLarge = 50;
    var dragThreshold = 4;
    var svgNamespace = "http://www.w3.org/2000/svg";
    var activePad = null;
    var activePadHandle = null;
    var didDrag = false;
    var wasPadOpen = false;
    var suppressHandleClick = false;
    var openPad = null;
    var nudgeCommitTimer = null;

    var moveStatus = document.createElement("p");
    moveStatus.className = "visually-hidden";
    moveStatus.setAttribute("role", "status");
    moveStatus.setAttribute("aria-live", "polite");
    document.body.appendChild(moveStatus);

    function getCurrentOffset(section, axis) {
      var value = getComputedStyle(section).getPropertyValue(axis).trim();
      return value ? parseFloat(value) : 0;
    }

    function getClientPoint(event) {
      if (event.touches && event.touches.length > 0) {
        return { x: event.touches[0].clientX, y: event.touches[0].clientY };
      }
      if (event.changedTouches && event.changedTouches.length > 0) {
        return {
          x: event.changedTouches[0].clientX,
          y: event.changedTouches[0].clientY,
        };
      }
      return { x: event.clientX, y: event.clientY };
    }

    function getSectionLabel(section) {
      var label = section.querySelector(".card-header label");
      return label && label.textContent ? label.textContent.trim() : "Card";
    }

    function setCardOffset(section, x, y) {
      section.style.setProperty("--drag-x", x + "px");
      section.style.setProperty("--drag-y", y + "px");
    }

    function saveCardOffset(section) {
      var saved = readSavedLayout();
      saved[section.getAttribute("data-card-id")] = {
        x: getCurrentOffset(section, "--drag-x"),
        y: getCurrentOffset(section, "--drag-y"),
      };
      writeSavedLayout(saved);
    }

    function nudgeCard(section, dx, dy, direction) {
      setCardOffset(
        section,
        getCurrentOffset(section, "--drag-x") + dx,
        getCurrentOffset(section, "--drag-y") + dy,
      );

      window.clearTimeout(nudgeCommitTimer);
      nudgeCommitTimer = window.setTimeout(function () {
        saveCardOffset(section);
        moveStatus.textContent = t("announceMoved", {
          name: getSectionLabel(section),
          dir: t("dir" + direction),
        });
      }, 200);
    }

    function closeMovePad(pad, handle) {
      pad.hidden = true;
      handle.setAttribute("aria-expanded", "false");
      if (openPad && openPad.pad === pad) {
        openPad = null;
      }
    }

    function toggleMovePad(pad, handle, force) {
      var nextOpen = typeof force === "boolean" ? force : pad.hidden;

      if (!nextOpen) {
        closeMovePad(pad, handle);
        return;
      }

      if (openPad && openPad.pad !== pad) {
        closeMovePad(openPad.pad, openPad.handle);
      }

      pad.hidden = false;
      handle.setAttribute("aria-expanded", "true");
      openPad = { pad: pad, handle: handle };

      var firstButton = pad.querySelector("button");
      if (firstButton) {
        firstButton.focus();
      }
    }

    function resetCardPosition(section) {
      var cardId = section.getAttribute("data-card-id");
      var sectionLabel = getSectionLabel(section);
      var previousOffset = {
        x: getCurrentOffset(section, "--drag-x"),
        y: getCurrentOffset(section, "--drag-y"),
      };

      if (previousOffset.x === 0 && previousOffset.y === 0) {
        moveStatus.textContent = t("announceAlreadyDefault", {
          name: sectionLabel,
        });
        return;
      }

      var savedLayout = readSavedLayout();
      delete savedLayout[cardId];
      writeSavedLayout(savedLayout);
      window.clearTimeout(nudgeCommitTimer);
      section.style.removeProperty("--drag-x");
      section.style.removeProperty("--drag-y");
      moveStatus.textContent = t("announceReset", { name: sectionLabel });
      setStatus(t("statusCardReset", { name: sectionLabel }), "success");
      logAction(t("logResetCard", { name: sectionLabel }));
      saveUndoAction(function () {
        setCardOffset(section, previousOffset.x, previousOffset.y);
        var restoredLayout = readSavedLayout();
        restoredLayout[cardId] = previousOffset;
        writeSavedLayout(restoredLayout);
        setStatus(t("statusCardRestored", { name: sectionLabel }), "success");
        logAction(t("logUndoCard"));
      });
    }

    function createPadButton(direction) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "move-pad-button " + direction.className;
      button.setAttribute("aria-label", direction.label);
      button.setAttribute("title", direction.label);

      direction.paths.forEach(function (pathData) {
        var svg = document.createElementNS(svgNamespace, "svg");
        svg.setAttribute("class", "icon");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("aria-hidden", "true");

        var path = document.createElementNS(svgNamespace, "path");
        path.setAttribute("d", pathData);
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", "currentColor");
        path.setAttribute("stroke-width", "2");
        path.setAttribute("stroke-linecap", "round");
        path.setAttribute("stroke-linejoin", "round");

        svg.appendChild(path);
        button.appendChild(svg);
      });

      return button;
    }

    function buildMovePad(section, handle) {
      var cardId = section.getAttribute("data-card-id");
      var sectionLabel = getSectionLabel(section);

      var pad = document.createElement("div");
      pad.className = "move-pad";
      pad.id = "move-pad-" + cardId;
      pad.setAttribute("role", "group");
      pad.setAttribute("aria-label", t("padGroup", { name: sectionLabel }));
      pad.hidden = true;

      var grid = document.createElement("div");
      grid.className = "move-pad-grid";

      var directions = [
        {
          className: "move-pad-up",
          label: t("padUp"),
          direction: "up",
          dx: 0,
          dy: -moveStep,
          paths: ["m6 14 6-6 6 6"],
        },
        {
          className: "move-pad-left",
          label: t("padLeft"),
          direction: "left",
          dx: -moveStep,
          dy: 0,
          paths: ["m14 6-6 6 6 6"],
        },
        {
          className: "move-pad-reset",
          label: t("padReset"),
          direction: "",
          reset: true,
          paths: ["M4 12a8 8 0 1 0 2.34-5.66L4 9", "M4 4v5h5"],
        },
        {
          className: "move-pad-right",
          label: t("padRight"),
          direction: "right",
          dx: moveStep,
          dy: 0,
          paths: ["m10 6 6 6-6 6"],
        },
        {
          className: "move-pad-down",
          label: t("padDown"),
          direction: "down",
          dx: 0,
          dy: moveStep,
          paths: ["m6 10 6 6 6-6"],
        },
      ];

      directions.forEach(function (direction) {
        var button = createPadButton(direction);
        grid.appendChild(button);

        if (direction.reset) {
          button.addEventListener("click", function () {
            resetCardPosition(section);
          });
          return;
        }

        var repeatDelay = null;
        var repeatTimer = null;

        function stopRepeat() {
          window.clearTimeout(repeatDelay);
          window.clearInterval(repeatTimer);
          repeatDelay = null;
          repeatTimer = null;
        }

        button.addEventListener("click", function () {
          nudgeCard(section, direction.dx, direction.dy, direction.direction);
        });

        button.addEventListener("pointerdown", function (event) {
          if (event.pointerType === "mouse" && event.button !== 0) {
            return;
          }

          repeatDelay = window.setTimeout(function () {
            repeatTimer = window.setInterval(function () {
              nudgeCard(
                section,
                direction.dx,
                direction.dy,
                direction.direction,
              );
            }, 90);
          }, 350);
        });

        ["pointerup", "pointerleave", "pointercancel"].forEach(function (
          type,
        ) {
          button.addEventListener(type, stopRepeat);
        });
      });

      pad.appendChild(grid);

      var hint = document.createElement("p");
      hint.className = "move-pad-hint";
      hint.textContent = t("padHint");
      pad.appendChild(hint);

      pad.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
          event.stopPropagation();
          closeMovePad(pad, handle);
          handle.focus();
        }
      });

      var cardHeader = section.querySelector(".card-header");
      if (cardHeader) {
        cardHeader.insertAdjacentElement("afterend", pad);
      } else {
        section.appendChild(pad);
      }

      handle.setAttribute("aria-controls", pad.id);

      return pad;
    }

    document.addEventListener("click", function (event) {
      if (!openPad) {
        return;
      }

      if (
        !openPad.pad.contains(event.target) &&
        !openPad.handle.contains(event.target)
      ) {
        closeMovePad(openPad.pad, openPad.handle);
      }
    });

    function onDragMove(event) {
      if (!activeCard) {
        return;
      }

      var point = getClientPoint(event);
      if (
        !didDrag &&
        (Math.abs(point.x - startX) > dragThreshold ||
          Math.abs(point.y - startY) > dragThreshold)
      ) {
        didDrag = true;
        suppressHandleClick = true;
      }

      var nextX = baseX + (point.x - startX);
      var nextY = baseY + (point.y - startY);
      activeCard.style.setProperty("--drag-x", nextX + "px");
      activeCard.style.setProperty("--drag-y", nextY + "px");

      if (event.cancelable) {
        event.preventDefault();
      }
    }

    function onDragEnd(event) {
      if (!activeCard) {
        return;
      }

      var saved = readSavedLayout();
      var cardId = activeCard.getAttribute("data-card-id");
      saved[cardId] = {
        x: getCurrentOffset(activeCard, "--drag-x"),
        y: getCurrentOffset(activeCard, "--drag-y"),
      };
      writeSavedLayout(saved);
      activeCard.classList.remove("dragging");
      document.body.classList.remove("layout-dragging");
      activeCard = null;
      window.removeEventListener("mousemove", onDragMove);
      window.removeEventListener("mouseup", onDragEnd);
      window.removeEventListener("touchmove", onDragMove);
      window.removeEventListener("touchend", onDragEnd);
      window.removeEventListener("touchcancel", onDragEnd);

      if (!didDrag && activePad && event.type !== "touchcancel") {
        suppressHandleClick = true;
        toggleMovePad(activePad, activePadHandle, !wasPadOpen);
      }

      activePad = null;
      activePadHandle = null;
    }

    document
      .querySelectorAll(".section[data-card-id]")
      .forEach(function (section) {
        var handle = section.querySelector(".drag-handle");
        if (!handle) {
          return;
        }

        var pad = buildMovePad(section, handle);
        handle.setAttribute("aria-expanded", "false");

        function beginDrag(event) {
          if (event.type === "mousedown" && event.button !== 0) {
            return;
          }

          event.preventDefault();
          didDrag = false;
          suppressHandleClick = false;
          wasPadOpen = !pad.hidden;

          if (wasPadOpen) {
            closeMovePad(pad, handle);
          }

          if (openPad && openPad.pad !== pad) {
            closeMovePad(openPad.pad, openPad.handle);
          }

          activePad = pad;
          activePadHandle = handle;

          var point = getClientPoint(event);
          activeCard = section;
          startX = point.x;
          startY = point.y;
          baseX = getCurrentOffset(section, "--drag-x");
          baseY = getCurrentOffset(section, "--drag-y");
          highestZ += 1;
          section.style.zIndex = String(highestZ);
          section.classList.add("dragging");
          document.body.classList.add("layout-dragging");
          window.addEventListener("mousemove", onDragMove);
          window.addEventListener("mouseup", onDragEnd);
          window.addEventListener("touchmove", onDragMove, { passive: false });
          window.addEventListener("touchend", onDragEnd);
          window.addEventListener("touchcancel", onDragEnd);
        }

        handle.addEventListener("keydown", function (event) {
          suppressHandleClick = false;

          if ((event.key === "Enter" || event.key === " ") && !event.repeat) {
            event.preventDefault();
            toggleMovePad(pad, handle);
            return;
          }

          var step = event.shiftKey ? moveStepLarge : moveStep;
          var move = null;

          if (event.key === "ArrowLeft") {
            move = { dx: -step, dy: 0, direction: "left" };
          } else if (event.key === "ArrowRight") {
            move = { dx: step, dy: 0, direction: "right" };
          } else if (event.key === "ArrowUp") {
            move = { dx: 0, dy: -step, direction: "up" };
          } else if (event.key === "ArrowDown") {
            move = { dx: 0, dy: step, direction: "down" };
          }

          if (move) {
            event.preventDefault();
            nudgeCard(section, move.dx, move.dy, move.direction);
            return;
          }

          if (event.key === "Escape" && !pad.hidden) {
            closeMovePad(pad, handle);
          }
        });

        handle.addEventListener("click", function () {
          if (suppressHandleClick) {
            suppressHandleClick = false;
            return;
          }

          toggleMovePad(pad, handle);
        });

        handle.addEventListener("mousedown", beginDrag);
        handle.addEventListener("touchstart", beginDrag, { passive: false });
      });
  }

  function initResetLayout() {
    var resetButton = getElement("resetLayoutBtn");
    if (!resetButton) {
      return;
    }

    resetButton.addEventListener("click", function () {
      var savedLayout = readSavedLayout();
      localStorage.removeItem(getLayoutStorageKey());
      document
        .querySelectorAll(".section[data-card-id]")
        .forEach(function (section) {
          section.style.removeProperty("--drag-x");
          section.style.removeProperty("--drag-y");
          section.style.removeProperty("z-index");
          section.classList.remove("resetting");
          void section.offsetWidth;
          section.classList.add("resetting");
          window.setTimeout(function () {
            section.classList.remove("resetting");
          }, 600);
        });
      setStatus(t("statusLayoutReset"), "success");
      logAction(t("logResetLayout"));
      saveUndoAction(function () {
        writeSavedLayout(savedLayout);
        applySavedLayout();
        setStatus(t("statusLayoutRestored"), "success");
        logAction(t("logUndoLayout"));
      });
    });
  }

  function initUndo() {
    var undoButton = getElement("undoBtn");
    if (!undoButton) {
      return;
    }

    updateUndoButton();
    undoButton.addEventListener("click", function () {
      if (!lastUndoAction) {
        return;
      }

      var action = lastUndoAction;
      clearUndoAction();
      action();
    });
  }

  function initCursorEffect() {
    if (
      isMotionOff() ||
      (window.matchMedia && window.matchMedia("(pointer: coarse)").matches)
    ) {
      return;
    }

    var aura = document.createElement("div");
    var dot = document.createElement("div");
    var lastTrailTime = 0;
    var prevX = window.innerWidth / 2;
    var prevY = window.innerHeight / 2;
    var auraX = window.innerWidth / 2;
    var auraY = window.innerHeight / 2;
    var dotX = auraX;
    var dotY = auraY;
    var targetX = auraX;
    var targetY = auraY;

    aura.className = "cursor-aura";
    dot.className = "cursor-dot";
    aura.setAttribute("aria-hidden", "true");
    dot.setAttribute("aria-hidden", "true");
    document.body.appendChild(aura);
    document.body.appendChild(dot);

    function spawnTrail(x, y, vx, vy) {
      var speed = Math.min(Math.hypot(vx, vy), 60);
      var angle = Math.atan2(vy, vx) * (180 / Math.PI);
      var stretch = 1 + speed / 12;

      var particle = document.createElement("div");
      particle.className = "trail-particle";
      particle.style.left = x + "px";
      particle.style.top = y + "px";
      document.body.appendChild(particle);

      var animation = particle.animate(
        [
          {
            transform:
              "translate(0, 0) rotate(" +
              angle +
              "deg) scaleX(" +
              stretch * 0.55 +
              ") scaleY(1)",
            opacity: 0.9,
          },
          {
            transform:
              "translate(" +
              vx * 0.16 +
              "px, " +
              vy * 0.16 +
              "px) rotate(" +
              angle +
              "deg) scaleX(" +
              stretch +
              ") scaleY(0.55)",
            opacity: 0.4,
            offset: 0.45,
          },
          {
            transform:
              "translate(" +
              vx * 0.28 +
              "px, " +
              vy * 0.28 +
              "px) rotate(" +
              angle +
              "deg) scaleX(" +
              stretch * 0.7 +
              ") scaleY(0)",
            opacity: 0,
          },
        ],
        {
          duration: 480,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        },
      );

      animation.onfinish = (function (node) {
        return function () {
          node.remove();
        };
      })(particle);
    }

    function render() {
      if (isMotionOff()) {
        requestAnimationFrame(render);
        return;
      }

      dotX += (targetX - dotX) * 0.28;
      dotY += (targetY - dotY) * 0.28;
      auraX += (targetX - auraX) * 0.14;
      auraY += (targetY - auraY) * 0.14;

      dot.style.transform =
        "translate(" + dotX + "px, " + dotY + "px) scale(var(--cursor-scale))";
      aura.style.transform =
        "translate(" +
        auraX +
        "px, " +
        auraY +
        "px) scale(var(--cursor-scale))";
      requestAnimationFrame(render);
    }

    document.addEventListener("mousemove", function (event) {
      targetX = event.clientX;
      targetY = event.clientY;
      document.body.classList.add("cursor-active");

      var vx = event.clientX - prevX;
      var vy = event.clientY - prevY;
      prevX = event.clientX;
      prevY = event.clientY;

      if (
        !isMotionCalm() &&
        Date.now() - lastTrailTime > 28 &&
        Math.abs(vx) + Math.abs(vy) > 2
      ) {
        spawnTrail(event.clientX, event.clientY, vx, vy);
        lastTrailTime = Date.now();
      }
    });

    document.addEventListener("mouseleave", function () {
      document.body.classList.remove("cursor-active");
      document.body.classList.remove("cursor-hover");
    });

    document
      .querySelectorAll("button, a, textarea, label")
      .forEach(function (element) {
        element.addEventListener("mouseenter", function () {
          document.body.classList.add("cursor-hover");
        });

        element.addEventListener("mouseleave", function () {
          document.body.classList.remove("cursor-hover");
        });
      });

    render();
  }

  function initPageClickEffect() {
    if (
      isMotionOff() ||
      (window.matchMedia && window.matchMedia("(pointer: coarse)").matches)
    ) {
      return;
    }

    document.addEventListener("click", function (event) {
      createPageClickFX(event.clientX, event.clientY);
    });
  }

  function initAmbientDust() {
    if (isMotionOff()) {
      return;
    }

    var count = isMotionCalm() ? 6 : 14;

    for (var index = 0; index < count; index += 1) {
      var dust = document.createElement("div");
      dust.className = "ambient-dust";
      dust.setAttribute("aria-hidden", "true");
      dust.style.setProperty(
        "--dust-x",
        (Math.random() * 100).toFixed(2) + "%",
      );
      dust.style.setProperty(
        "--dust-size",
        (3 + Math.random() * 4).toFixed(2) + "px",
      );
      dust.style.setProperty(
        "--dust-drift",
        (Math.random() * 120 - 60).toFixed(1) + "px",
      );
      dust.style.setProperty(
        "--dust-duration",
        (16 + Math.random() * 14).toFixed(2) + "s",
      );
      dust.style.setProperty(
        "--dust-delay",
        (-Math.random() * 26).toFixed(2) + "s",
      );
      dust.style.setProperty(
        "--dust-opacity",
        (0.3 + Math.random() * 0.35).toFixed(2),
      );
      document.body.appendChild(dust);
    }
  }

  function initHoverSparks() {
    if (
      isMotionOff() ||
      (window.matchMedia && window.matchMedia("(pointer: coarse)").matches)
    ) {
      return;
    }

    document
      .querySelectorAll("button, .nav-left a")
      .forEach(function (element) {
        element.addEventListener("mouseenter", function () {
          if (isMotionCalm()) {
            return;
          }

          var rect = element.getBoundingClientRect();

          for (var index = 0; index < 6; index += 1) {
            var spark = document.createElement("div");
            spark.className = "trail-particle";
            spark.style.width = "10px";
            spark.style.height = "3px";
            spark.style.left = rect.left + Math.random() * rect.width + "px";
            spark.style.top =
              rect.top + rect.height * (0.25 + Math.random() * 0.6) + "px";
            document.body.appendChild(spark);

            var rise = 16 + Math.random() * 18;
            var drift = Math.random() * 22 - 11;
            var angle = Math.atan2(-rise, drift) * (180 / Math.PI);

            var animation = spark.animate(
              [
                {
                  transform:
                    "translate(0, 0) rotate(" + angle + "deg) scaleX(1)",
                  opacity: 0.85,
                },
                {
                  transform:
                    "translate(" +
                    drift +
                    "px, " +
                    -rise +
                    "px) rotate(" +
                    angle +
                    "deg) scaleX(0.4)",
                  opacity: 0,
                },
              ],
              {
                duration: 520 + Math.random() * 240,
                easing: "cubic-bezier(0.16, 1, 0.3, 1)",
              },
            );

            animation.onfinish = (function (node) {
              return function () {
                node.remove();
              };
            })(spark);
          }
        });
      });
  }

  function triggerConvertFX() {
    var button = getElement("primaryBtn");
    if (!button) {
      return;
    }

    var rect = button.getBoundingClientRect();
    createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
  }

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

  var typingRoundSeconds = 10;
  var typingBestKey = "typing-sprint-best";

  var quietResetTyping = null;
  var quietResetMemory = null;
  var quietReset2048 = null;

  var memoryBestKey = "glyph-match-best";
  var memoryMatchPairs = 6;
  var memoryGlyphs = [
    "\u5929",
    "\u4e3b",
    "\u795e",
    "\u5149",
    "\u5723",
    "\u7075",
  ];

  var g2048BestKey = "g2048-best";
  var g2048StateKey = "g2048-state";

  var typingPhrases = [
    "Paste your messy notes and let the formatter sweep every bracket away.",
    "Neon lights, clean text, and a caret blinking through the dark.",
    "Convert the punctuation, filter the noise, copy the result, move on.",
    "Small sharp tools beat heavy suites when the queue keeps growing.",
    "Type fast, fix nothing later, and let the regex do the heavy lifting.",
    "A tidy sentence is a gift to whoever reads it next in the pipeline.",
    "Every stray fullwidth comma becomes a space before you can blink.",
    "Keep the best words, drop the clutter, and ship the clean version.",
  ];

  function initTypingGame() {
    var targetEl = getElement("typingTarget");
    var targetTextEl = getElement("typingTargetText");
    var input = getElement("typingInput");
    var startBtn = getElement("gameStartBtn");
    var timeEl = getElement("gameTime");
    var wpmEl = getElement("gameWpm");
    var accEl = getElement("gameAcc");
    var trackFill = getElement("gameTrackFill");
    var resultEl = getElement("gameResult");
    var bestEl = getElement("gameBest");
    var modal = getElement("gameModal");
    var openBtn = getElement("gameToggleBtn");
    if (!targetEl || !targetTextEl || !input || !startBtn || !timeEl) {
      return;
    }

    if (!modal || !openBtn) {
      return;
    }

    var dialog = modal.querySelector(".game-dialog");
    var backdrop = getElement("gameBackdrop");
    var closeBtn = getElement("gameCloseBtn");
    openBtn.setAttribute("aria-label", t("openGames"));
    var tabTyping = getElement("gameTabTyping");
    var tabMemory = getElement("gameTabMemory");
    var tab2048 = getElement("gameTab2048");
    var panelTyping = getElement("gamePanelTyping");
    var panelMemory = getElement("gamePanelMemory");
    var panel2048 = getElement("gamePanel2048");
    if (
      !dialog ||
      !backdrop ||
      !closeBtn ||
      !tabTyping ||
      !tabMemory ||
      !tab2048 ||
      !panelTyping ||
      !panelMemory ||
      !panel2048
    ) {
      return;
    }

    var phrase = "";
    var roundActive = false;
    var roundStarted = false;
    var startedAt = 0;
    var timerId = null;

    function readBest() {
      var value = parseInt(localStorage.getItem(typingBestKey), 10);
      return isNaN(value) ? 0 : value;
    }

    function renderBest() {
      var best = readBest();
      bestEl.textContent = best ? t("bestWpm", { n: best }) : t("noBest");
    }

    function buildTarget() {
      phrase = typingPhrases[Math.floor(Math.random() * typingPhrases.length)];
      targetEl.textContent = "";
      for (var index = 0; index < phrase.length; index += 1) {
        var span = document.createElement("span");
        span.className = "char-pending";
        span.textContent = phrase[index];
        targetEl.appendChild(span);
      }
      targetTextEl.textContent = phrase;
      input.maxLength = phrase.length;
    }

    function roundStats() {
      var typed = input.value;
      var correct = 0;
      for (var index = 0; index < typed.length; index += 1) {
        if (typed[index] === phrase[index]) {
          correct += 1;
        }
      }
      var elapsed = roundStarted ? (Date.now() - startedAt) / 1000 : 0;
      var wpm = 0;
      if (roundStarted && elapsed > 0) {
        wpm = Math.round(correct / 5 / (elapsed / 60));
      }
      var accuracy = typed.length
        ? Math.round((correct / typed.length) * 100)
        : 100;
      return {
        correct: correct,
        typed: typed.length,
        elapsed: elapsed,
        wpm: wpm,
        accuracy: accuracy,
      };
    }

    function updateHud() {
      var stats = roundStats();
      var remaining = Math.max(typingRoundSeconds - stats.elapsed, 0);
      timeEl.textContent = remaining.toFixed(1) + "s";
      wpmEl.textContent = String(stats.wpm);
      accEl.textContent = stats.accuracy + "%";
      trackFill.style.width =
        Math.min((stats.elapsed / typingRoundSeconds) * 100, 100) + "%";
      return stats;
    }

    function setCharClasses() {
      var typed = input.value;
      var spans = targetEl.children;
      for (var index = 0; index < spans.length; index += 1) {
        var nextClass = "char-pending";
        if (index < typed.length) {
          nextClass =
            typed[index] === phrase[index] ? "char-correct" : "char-wrong";
        } else if (index === typed.length) {
          nextClass = "char-pending char-current";
        }
        if (spans[index].className !== nextClass) {
          spans[index].className = nextClass;
        }
      }
    }

    function endRound(finished) {
      if (!roundActive) {
        return;
      }

      roundActive = false;
      window.clearInterval(timerId);
      timerId = null;
      input.disabled = true;

      var stats = updateHud();
      var isBest = finished && stats.wpm > 0 && stats.wpm > readBest();
      var message = finished
        ? t("typingFinished", {
            s: stats.elapsed.toFixed(1),
            wpm: stats.wpm,
            acc: stats.accuracy,
          })
        : t("typingTimeUp", { wpm: stats.wpm, acc: stats.accuracy });

      if (isBest) {
        localStorage.setItem(typingBestKey, String(stats.wpm));
        message += " " + t("newBest");
        var rect = startBtn.getBoundingClientRect();
        createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      }

      resultEl.textContent = message;
      renderBest();
      logAction(t("logTyping", { n: stats.wpm }));
      startBtn.focus();
    }

    function tick() {
      var stats = updateHud();
      if (stats.elapsed >= typingRoundSeconds) {
        endRound(false);
      }
    }

    function startRound(shouldFocus) {
      window.clearInterval(timerId);
      timerId = null;
      buildTarget();
      input.disabled = false;
      input.value = "";
      roundActive = true;
      roundStarted = false;
      startedAt = 0;
      timeEl.textContent = typingRoundSeconds.toFixed(1) + "s";
      wpmEl.textContent = "0";
      accEl.textContent = "100%";
      trackFill.style.width = "0%";
      resultEl.textContent = t("typingPrompt");
      setCharClasses();

      if (shouldFocus !== false) {
        input.focus();
      }
    }

    startBtn.addEventListener("click", function () {
      startRound(true);
    });

    input.addEventListener("input", function () {
      if (!roundActive) {
        return;
      }

      if (!roundStarted && input.value.length > 0) {
        roundStarted = true;
        startedAt = Date.now();
        timerId = window.setInterval(tick, 100);
      }

      setCharClasses();
      var stats = updateHud();

      if (input.value.length >= phrase.length) {
        endRound(true);
      } else if (roundStarted && stats.elapsed >= typingRoundSeconds) {
        endRound(false);
      }
    });

    input.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
          if (!roundActive) {
            startRound(true);
          }
      }
    });

    input.addEventListener("paste", function (event) {
      event.preventDefault();
      setStatus(t("statusNoPasteGame"), "error");
    });

    var gameTabEntries = [
      { name: "typing", tab: tabTyping, panel: panelTyping },
      { name: "memory", tab: tabMemory, panel: panelMemory },
      { name: "2048", tab: tab2048, panel: panel2048 },
    ];
    var activeTabName = "typing";

    function selectTab(selected, shouldFocus) {
      activeTabName = selected;

      gameTabEntries.forEach(function (entry) {
        var isSelected = entry.name === selected;
        entry.tab.setAttribute("aria-selected", String(isSelected));
        entry.tab.tabIndex = isSelected ? 0 : -1;
        entry.panel.hidden = !isSelected;
      });

      if (quietResetTyping) {
        quietResetTyping();
      }

      if (quietResetMemory) {
        quietResetMemory();
      }

      if (quietReset2048) {
        quietReset2048();
      }

      if (shouldFocus) {
        gameTabEntries.forEach(function (entry) {
          if (entry.name === selected) {
            entry.tab.focus();
          }
        });
      }
    }

    tabTyping.addEventListener("click", function () {
      selectTab("typing");
    });

    tabMemory.addEventListener("click", function () {
      selectTab("memory");
    });

    tab2048.addEventListener("click", function () {
      selectTab("2048");
    });

    tabTyping.parentElement.addEventListener("keydown", function (event) {
      var nextName = null;
      var count = gameTabEntries.length;
      var index = 0;

      for (var i = 0; i < count; i += 1) {
        if (gameTabEntries[i].name === activeTabName) {
          index = i;
          break;
        }
      }

      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        nextName = gameTabEntries[(index + 1) % count].name;
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        nextName = gameTabEntries[(index + count - 1) % count].name;
      } else if (event.key === "Home") {
        nextName = gameTabEntries[0].name;
      } else if (event.key === "End") {
        nextName = gameTabEntries[count - 1].name;
      }

      if (nextName) {
        event.preventDefault();
        selectTab(nextName, true);
      }
    });

    quietResetTyping = function () {
      if (!roundActive || !roundStarted) {
        return;
      }

      window.clearInterval(timerId);
      timerId = null;
      roundStarted = false;
      startedAt = 0;
      input.value = "";
      timeEl.textContent = typingRoundSeconds.toFixed(1) + "s";
      wpmEl.textContent = "0";
      accEl.textContent = "100%";
      trackFill.style.width = "0%";
      resultEl.textContent = t("typingPrompt");
      setCharClasses();
    };

    function openModal() {
      if (!modal.hidden) {
        return;
      }

      modal.hidden = false;
      document.body.classList.add("game-modal-open");
      openBtn.setAttribute("aria-expanded", "true");

      if (input.disabled) {
        startBtn.focus();
      } else {
        input.focus();
      }
    }

    function closeModal() {
      if (modal.hidden) {
        return;
      }

      modal.hidden = true;
      document.body.classList.remove("game-modal-open");
      openBtn.setAttribute("aria-expanded", "false");

      if (quietResetTyping) {
        quietResetTyping();
      }

      if (quietResetMemory) {
        quietResetMemory();
      }

      openBtn.focus();
    }

    openBtn.addEventListener("click", openModal);
    closeBtn.addEventListener("click", closeModal);
    backdrop.addEventListener("click", closeModal);

    dialog.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        event.stopPropagation();
        closeModal();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      var focusables = Array.prototype.filter.call(
        dialog.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ),
        function (element) {
          return element.offsetParent !== null;
        },
      );
      if (!focusables.length) {
        return;
      }

      var first = focusables[0];
      var last = focusables[focusables.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    buildTarget();
    renderBest();
    roundActive = true;
  }

  function initMemoryGame() {
    var grid = getElement("memoryGrid");
    var movesEl = getElement("memoryMoves");
    var timeEl = getElement("memoryTime");
    var pairsEl = getElement("memoryPairs");
    var resultEl = getElement("memoryResult");
    var startBtn = getElement("memoryStartBtn");
    var bestEl = getElement("memoryBest");
    if (
      !grid ||
      !movesEl ||
      !timeEl ||
      !pairsEl ||
      !resultEl ||
      !startBtn ||
      !bestEl
    ) {
      return;
    }

    var firstCard = null;
    var lockBoard = false;
    var moves = 0;
    var matchedPairs = 0;
    var roundStarted = false;
    var startedAt = 0;
    var timerId = null;

    function readBest() {
      var value = parseFloat(localStorage.getItem(memoryBestKey));
      return isNaN(value) ? 0 : value;
    }

    function renderBest() {
      var best = readBest();
      bestEl.textContent = best
        ? t("bestTime", { s: best.toFixed(1) })
        : t("noBest");
    }

    function elapsed() {
      return roundStarted ? (Date.now() - startedAt) / 1000 : 0;
    }

    function tick() {
      timeEl.textContent = elapsed().toFixed(1) + "s";
    }

    function setCardFace(card, revealed) {
      var face = card.firstChild;
      var glyph = card.getAttribute("data-glyph");
      face.textContent = revealed ? glyph : "?";

      var state = t("cardDown", { n: card.getAttribute("data-position") });
      if (card.classList.contains("matched")) {
        state = t("cardMatched", {
          n: card.getAttribute("data-position"),
          glyph: glyph,
        });
      } else if (revealed) {
        state = t("cardGlyph", {
          n: card.getAttribute("data-position"),
          glyph: glyph,
        });
      }
      card.setAttribute("aria-label", state);
    }

    function buildBoard() {
      var deck = memoryGlyphs.concat(memoryGlyphs);
      for (var i = deck.length - 1; i > 0; i -= 1) {
        var j = Math.floor(Math.random() * (i + 1));
        var swap = deck[i];
        deck[i] = deck[j];
        deck[j] = swap;
      }

      grid.innerHTML = "";
      deck.forEach(function (glyph, index) {
        var card = document.createElement("button");
        card.type = "button";
        card.className = "memory-card";
        card.setAttribute("data-glyph", glyph);
        card.setAttribute("data-position", String(index + 1));
        card.setAttribute(
          "aria-label",
          t("cardDown", { n: String(index + 1) }),
        );

        var face = document.createElement("span");
        face.setAttribute("aria-hidden", "true");
        face.textContent = "?";
        card.appendChild(face);

        card.addEventListener("click", function () {
          flipCard(card);
        });
        grid.appendChild(card);
      });

      firstCard = null;
      lockBoard = false;
      moves = 0;
      matchedPairs = 0;
      movesEl.textContent = "0";
      pairsEl.textContent = "0/" + memoryMatchPairs;
      timeEl.textContent = "0.0s";
    }

    function flipCard(card) {
      if (
        lockBoard ||
        card.classList.contains("flipped") ||
        card.classList.contains("matched")
      ) {
        return;
      }

      if (!roundStarted) {
        roundStarted = true;
        startedAt = Date.now();
        timerId = window.setInterval(tick, 100);
      }

      card.classList.add("flipped");
      setCardFace(card, true);

      if (!firstCard) {
        firstCard = card;
        return;
      }

      var pair = firstCard;
      firstCard = null;
      moves += 1;
      movesEl.textContent = String(moves);

      if (pair.getAttribute("data-glyph") === card.getAttribute("data-glyph")) {
        pair.classList.remove("flipped");
        card.classList.remove("flipped");
        pair.classList.add("matched");
        card.classList.add("matched");
        setCardFace(pair, true);
        setCardFace(card, true);
        matchedPairs += 1;
        pairsEl.textContent = matchedPairs + "/" + memoryMatchPairs;

        if (matchedPairs === memoryMatchPairs) {
          endRound(true);
        }
        return;
      }

      lockBoard = true;
      window.setTimeout(function () {
        pair.classList.remove("flipped");
        card.classList.remove("flipped");
        setCardFace(pair, false);
        setCardFace(card, false);
        lockBoard = false;
      }, 700);
    }

    function endRound(finished) {
      if (!roundStarted) {
        return;
      }

      var seconds = elapsed();
      roundStarted = false;
      window.clearInterval(timerId);
      timerId = null;
      timeEl.textContent = seconds.toFixed(1) + "s";

      var best = readBest();
      var isBest = finished && seconds > 0 && (best === 0 || seconds < best);
      var message = t("memoryCleared", {
        s: seconds.toFixed(1),
        n: moves,
        unit: moves === 1 ? t("unitMove") : t("unitMoves"),
      });

      if (isBest) {
        localStorage.setItem(memoryBestKey, seconds.toFixed(2));
        message += " " + t("newBest");
        var rect = startBtn.getBoundingClientRect();
        createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      }

      resultEl.textContent = message;
      renderBest();
      logAction(t("logMemory", { s: seconds.toFixed(1) }));
      startBtn.focus();
    }

    function resetBoard() {
      window.clearInterval(timerId);
      timerId = null;
      roundStarted = false;
      startedAt = 0;
      buildBoard();
      resultEl.textContent = t("memoryPrompt");
    }

    startBtn.addEventListener("click", function () {
      resetBoard();
      startBtn.focus();
    });

    quietResetMemory = function () {
      if (!roundStarted) {
        return;
      }

      resetBoard();
    };

    buildBoard();
    renderBest();
  }

  function initG2048() {
    var boardEl = getElement("g2048Board");
    var cellsEl = getElement("g2048Cells");
    var tilesEl = getElement("g2048Tiles");
    var overlayEl = getElement("g2048Overlay");
    var overlayText = getElement("g2048OverlayText");
    var retryBtn = getElement("g2048RetryBtn");
    var keepBtn = getElement("g2048KeepBtn");
    var scoreEl = getElement("g2048Score");
    var bestStatEl = getElement("g2048BestStat");
    var resultEl = getElement("g2048Result");
    var newBtn = getElement("g2048NewBtn");
    if (
      !boardEl ||
      !cellsEl ||
      !tilesEl ||
      !overlayEl ||
      !overlayText ||
      !retryBtn ||
      !keepBtn ||
      !scoreEl ||
      !bestStatEl ||
      !resultEl ||
      !newBtn
    ) {
      return;
    }

    var grid = emptyGrid();
    var score = 0;
    var won = false;
    var over = false;
    var tileSeq = 0;
    var bestAtStart = 0;

    function emptyGrid() {
      var rows = [];
      for (var r = 0; r < 4; r += 1) {
        rows.push([null, null, null, null]);
      }
      return rows;
    }

    function readBest() {
      var value = parseInt(localStorage.getItem(g2048BestKey), 10);
      return isNaN(value) ? 0 : value;
    }

    function renderBest() {
      bestStatEl.textContent = String(readBest());
    }

    function positionTile(tile) {
      tile.el.style.setProperty("--x", String(tile.c));
      tile.el.style.setProperty("--y", String(tile.r));
    }

    function createTile(tile, animate) {
      var el = document.createElement("div");
      el.className = "g2048-tile" + (animate ? " g2048-tile-new" : "");
      el.setAttribute("data-v", String(tile.value));
      el.textContent = String(tile.value);
      tile.el = el;
      positionTile(tile);
      tilesEl.appendChild(el);
    }

    function removeTileLater(el) {
      window.setTimeout(function () {
        if (el && el.parentNode) {
          el.parentNode.removeChild(el);
        }
      }, 150);
    }

    function spawnTile() {
      var spots = [];
      for (var r = 0; r < 4; r += 1) {
        for (var c = 0; c < 4; c += 1) {
          if (!grid[r][c]) {
            spots.push({ r: r, c: c });
          }
        }
      }
      if (!spots.length) {
        return;
      }

      var spot = spots[Math.floor(Math.random() * spots.length)];
      var tile = {
        id: (tileSeq += 1),
        value: Math.random() < 0.9 ? 2 : 4,
        r: spot.r,
        c: spot.c,
        el: null,
      };
      grid[spot.r][spot.c] = tile;
      createTile(tile, true);
    }

    function canMove() {
      for (var r = 0; r < 4; r += 1) {
        for (var c = 0; c < 4; c += 1) {
          var tile = grid[r][c];
          if (!tile) {
            return true;
          }
          if (c < 3 && grid[r][c + 1] && grid[r][c + 1].value === tile.value) {
            return true;
          }
          if (r < 3 && grid[r + 1][c] && grid[r + 1][c].value === tile.value) {
            return true;
          }
        }
      }
      return false;
    }

    function hasValue(value) {
      for (var r = 0; r < 4; r += 1) {
        for (var c = 0; c < 4; c += 1) {
          if (grid[r][c] && grid[r][c].value === value) {
            return true;
          }
        }
      }
      return false;
    }

    function showOverlay(text, winMode) {
      overlayText.textContent = text;
      keepBtn.hidden = !winMode;
      overlayEl.hidden = false;
      retryBtn.focus();
    }

    function saveState() {
      var values = grid.map(function (row) {
        return row.map(function (tile) {
          return tile ? tile.value : 0;
        });
      });
      localStorage.setItem(
        g2048StateKey,
        JSON.stringify({ grid: values, score: score, won: won, over: over }),
      );
    }

    function restoreState() {
      var data = null;
      try {
        data = JSON.parse(localStorage.getItem(g2048StateKey) || "null");
      } catch (error) {
        data = null;
      }

      if (!data || data.over || !Array.isArray(data.grid)) {
        return false;
      }

      grid = emptyGrid();
      var hasTile = false;
      for (var r = 0; r < 4 && r < data.grid.length; r += 1) {
        var row = data.grid[r] || [];
        for (var c = 0; c < 4 && c < row.length; c += 1) {
          var value = row[c];
          if (value > 0) {
            var tile = {
              id: (tileSeq += 1),
              value: value,
              r: r,
              c: c,
              el: null,
            };
            grid[r][c] = tile;
            createTile(tile, true);
            hasTile = true;
          }
        }
      }

      if (!hasTile) {
        return false;
      }

      score = data.score || 0;
      won = !!data.won;
      over = false;
      scoreEl.textContent = String(score);
      return true;
    }

    function newGame() {
      tilesEl.innerHTML = "";
      grid = emptyGrid();
      score = 0;
      won = false;
      over = false;
      bestAtStart = readBest();
      overlayEl.hidden = true;
      scoreEl.textContent = "0";
      resultEl.textContent = t("g2048Prompt");
      spawnTile();
      spawnTile();
      saveState();
    }

    function move(direction) {
      if (over) {
        return;
      }

      var lines = [];
      for (var i = 0; i < 4; i += 1) {
        var line = [];
        for (var j = 0; j < 4; j += 1) {
          if (direction === "left") {
            line.push({ r: i, c: j });
          } else if (direction === "right") {
            line.push({ r: i, c: 3 - j });
          } else if (direction === "up") {
            line.push({ r: j, c: i });
          } else {
            line.push({ r: 3 - j, c: i });
          }
        }
        lines.push(line);
      }

      var moved = false;
      var gained = 0;
      var merged = [];

      lines.forEach(function (line) {
        var tiles = [];
        line.forEach(function (pos) {
          if (grid[pos.r][pos.c]) {
            tiles.push(grid[pos.r][pos.c]);
          }
        });

        var mergedLine = [];
        for (var k = 0; k < tiles.length; k += 1) {
          if (
            k + 1 < tiles.length &&
            tiles[k].value === tiles[k + 1].value
          ) {
            var combined = {
              id: (tileSeq += 1),
              value: tiles[k].value * 2,
              r: 0,
              c: 0,
              el: null,
            };
            gained += combined.value;
            merged.push({
              tile: combined,
              sources: [tiles[k], tiles[k + 1]],
            });
            mergedLine.push(combined);
            k += 1;
          } else {
            mergedLine.push(tiles[k]);
          }
        }

        line.forEach(function (pos, index) {
          var nextTile = mergedLine[index] || null;
          if (grid[pos.r][pos.c] !== nextTile) {
            moved = true;
          }
          grid[pos.r][pos.c] = nextTile;
          if (nextTile) {
            nextTile.r = pos.r;
            nextTile.c = pos.c;
          }
        });
      });

      if (!moved) {
        return;
      }

      score += gained;
      scoreEl.textContent = String(score);
      if (score > readBest()) {
        localStorage.setItem(g2048BestKey, String(score));
        renderBest();
      }

      grid.forEach(function (row) {
        row.forEach(function (tile) {
          if (tile && tile.el) {
            positionTile(tile);
          }
        });
      });

      merged.forEach(function (entry) {
        entry.sources.forEach(function (source) {
          if (source.el) {
            positionTile(source);
            removeTileLater(source.el);
            source.el = null;
          }
        });
        createTile(entry.tile, true);
      });

      spawnTile();

      if (!won && hasValue(2048)) {
        won = true;
        resultEl.textContent = t("g2048WinContinue");
        showOverlay(t("g2048Win"), true);
      } else if (!canMove()) {
        over = true;
        resultEl.textContent =
          t("g2048OverResult", { n: score }) +
          (score > 0 && score > bestAtStart ? " " + t("newBest") : "");
        showOverlay(t("g2048Over", { n: score }), false);
      }

      saveState();
    }

    for (var cellIndex = 0; cellIndex < 16; cellIndex += 1) {
      cellsEl.appendChild(document.createElement("span"));
    }

    boardEl.addEventListener("keydown", function (event) {
      var directions = {
        ArrowLeft: "left",
        ArrowRight: "right",
        ArrowUp: "up",
        ArrowDown: "down",
      };
      var direction = directions[event.key];
      if (!direction) {
        return;
      }
      event.preventDefault();
      move(direction);
    });

    var swipeStart = null;
    boardEl.addEventListener("pointerdown", function (event) {
      swipeStart = { x: event.clientX, y: event.clientY };
    });
    boardEl.addEventListener("pointerup", function (event) {
      if (!swipeStart) {
        return;
      }
      var dx = event.clientX - swipeStart.x;
      var dy = event.clientY - swipeStart.y;
      swipeStart = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) {
        return;
      }
      if (Math.abs(dx) > Math.abs(dy)) {
        move(dx > 0 ? "right" : "left");
      } else {
        move(dy > 0 ? "down" : "up");
      }
    });

    retryBtn.addEventListener("click", newGame);
    keepBtn.addEventListener("click", function () {
      overlayEl.hidden = true;
      boardEl.focus();
    });
    newBtn.addEventListener("click", function () {
      newGame();
      boardEl.focus();
    });

    quietReset2048 = function () {
      saveState();
    };

    renderBest();
    if (!restoreState()) {
      newGame();
    } else {
      bestAtStart = readBest();
    }
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

  document.addEventListener("DOMContentLoaded", function () {
    applyI18nDom();
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
})();
