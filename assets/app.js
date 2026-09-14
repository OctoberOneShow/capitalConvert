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
      "tabReflex": "Reflex Tap",
      "hudTime": "Time",
      "hudWpm": "WPM",
      "hudAcc": "Acc",
      "hudMoves": "Moves",
      "hudPairs": "Pairs",
      "hudScore": "Score",
      "hudBest": "Best",
      "hudLast": "Last",
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
      "reflexPadIdle": "Press Start",
      "reflexPadWaiting": "Wait...",
      "reflexPadReady": "Tap!",
      "reflexPrompt": "Start a round, then tap when the panel turns green.",
      "reflexWaiting": "Get ready. Do not tap yet.",
      "reflexTooSoon": "Too soon! Start another round and wait for green.",
      "reflexResult": "Your reaction time was {n} ms.",
      "reflexHint": "Use the button, Space, or Enter. A new best is the lowest time.",
      "logReflex": "Reflex Tap: {n} ms",
      "tabCaretDash": "Caret Dash",
      "btnStart": "Start",
      "hudSpeed": "Speed",
      "caretFieldLabel":
        "Caret Dash play area. Space or Arrow Up jumps, Arrow Down ducks.",
      "caretPrompt":
        "Press Start, then jump the glitch punctuation and duck under the floating glyphs.",
      "caretGo":
        "Running. Jump the glitch punctuation and duck under the floating glyphs.",
      "caretOverReady": "Game over",
      "caretOver": "Game over at {n}",
      "caretOverResult": "Game over at {n} m.",
      "caretBest": "Best {n} m",
      "caretHint":
        "Tap or click the field to jump and hold to duck. Space or Arrow Up jumps higher the longer you hold it.",
      "btnJump": "Jump",
      "btnDuck": "Duck",
      "logCaretDash": "Caret Dash: {n} m",
      "petTitle": "Companion",
      "petAdoptTitle": "Adopt a companion",
      "petAdoptBody":
        "Choose a species and give it a name. It lives in the corner of every page and remembers you between visits.",
      "petSpeciesLabel": "Species",
      "petNameLabel": "Name",
      "petNamePlaceholder": "Name your companion",
      "petRenamePlaceholder": "New name",
      "petAdoptConfirm": "Adopt",
      "petAdoptLater": "Not now",
      "petDefaultName": "Pip",
      "petSpeciesBracko": "Bracko",
      "petSpeciesQuillop": "Quillop",
      "petSpeciesTagling": "Tagling",
      "petSpeciesBrackoDesc":
        "A brace-shaped hugger that keeps code blocks tidy.",
      "petSpeciesQuillopDesc":
        "A pen-nib drifter that sips leftover ink.",
      "petSpeciesTaglingDesc":
        "A tag-shaped scout that labels everything it finds.",
      "petMoodHappy": "Happy",
      "petMoodNeutral": "Content",
      "petMoodHungry": "Hungry",
      "petMoodSleepy": "Sleepy",
      "petStatusHappy": "{name} is feeling great.",
      "petStatusNeutral": "{name} is doing fine.",
      "petStatusHungry": "{name} is getting hungry.",
      "petStatusSleepy": "{name} is getting sleepy.",
      "petButtonAria": "Pet {name}. Right now {name} is {mood}.",
      "petTapHint": "Pet {name}",
      "petAway": "You were away for {n}. {name} missed you.",
      "petLevel": "Lv {n}",
      "petXp": "{n} XP",
      "petStatHappiness": "Happiness",
      "petStatHunger": "Hunger",
      "petStatEnergy": "Energy",
      "petStatsLabel": "Companion needs",
      "petControlsLabel": "Companion actions",
      "petBtnFeed": "Feed",
      "petBtnPlay": "Play",
      "petBtnRest": "Rest",
      "petBtnRename": "Rename",
      "petBtnSpecies": "Switch",
      "petBtnHide": "Hide",
      "petBtnReset": "Reset",
      "petBtnCollapse": "Collapse companion panel",
      "petBtnExpand": "Expand companion panel",
      "petBtnRestore": "Show companion",
      "petBtnRenameConfirm": "Save",
      "petBtnRenameCancel": "Cancel",
      "petResetArmed": "Confirm reset?",
      "petReactionPet": "You pet {name}.",
      "petReactionFeed": "You fed {name}.",
      "petReactionPlay": "You played with {name}.",
      "petReactionRest": "{name} had a good rest.",
      "petReactionTired": "{name} is too tired to play.",
      "petReactionFull": "{name} is not hungry right now.",
      "petReactionRested": "{name} already has full energy.",
      "petReactionCooldown": "{name} is still enjoying that.",
      "petReactionRenamed": "Now called {name}.",
      "petReactionSpecies": "{name} shifted into a {species}.",
      "petReactionReset": "Adoption reset. Pick a new companion.",
      "petReactionAdopted": "Welcome, {name}!",
      "petReactionMissed": "{name} missed you.",
      "petReactionLevel": "{name} reached level {n}!",
      "petAwayHours": "{n} h",
      "petAwayMinutes": "{n} min",
      "petBtnTreat": "Give treat",
      "petBtnBrush": "Brush",
      "petBtnTalk": "Talk",
      "petBtnTricks": "Tricks",
      "petBtnGames": "Games",
      "petBtnStats": "Stats",
      "petBtnBack": "Back",
      "petBtnDrag": "Drag companion",
      "petMoveHandle": "Move companion (drag or use the arrow keys)",
      "petReactionMoved": "{name} moved to the {corner} corner.",
      "petCornerBr": "bottom-right",
      "petCornerBl": "bottom-left",
      "petCornerTr": "top-right",
      "petCornerTl": "top-left",
      "petBtnSound": "Sound",
      "petSoundOn": "Sound on",
      "petSoundOff": "Sound off",
      "petTreatsLabel": "Treats",
      "petTreatCount": "{n}",
      "petReactionTreat": "You gave {name} a treat.",
      "petReactionNoTreat": "{name} has no treats to spare.",
      "petReactionBrush": "You brushed {name}.",
      "petReactionTrickTeach": "{name} learned {trick}!",
      "petReactionTrickNone": "{name} already knows every trick.",
      "petReactionTrickLocked": "Teach {trick} at level {n}.",
      "petReactionTrickPerform": "{name} performs {trick}!",
      "petReactionTrickUnknown": "{name} does not know that trick yet.",
      "petReactionStage": "{name} evolved into {stage}!",
      "petReactionCombo": "Combo x{n}!",
      "petComboLabel": "x{n}",
      "petReactionMuted": "Sound muted.",
      "petReactionUnmuted": "Sound on.",
      "petReactionAcc": "{name} wears the {acc}.",
      "petReactionHue": "You recoloured {name}.",
      "petReactionCheer": "{name} cheers you on!",
      "petReactionCheerBest": "{name} is wowed by your new best!",
      "petReactionTyping": "Keep typing, you are doing great!",
      "petReactionWoke": "{name} wakes up.",
      "petReactionSleep": "{name} dozed off.",
      "petStageBaby": "Baby",
      "petStageGrown": "Grown",
      "petStageElder": "Elder",
      "petTrickJump": "Jump",
      "petTrickSpin": "Spin",
      "petTrickSing": "Sing",
      "petTrickWave": "Wave",
      "petTalkMorning": "Good morning!",
      "petTalkAfternoon": "Good afternoon.",
      "petTalkEvening": "Good evening.",
      "petTalkNight": "It is late...",
      "petTalkHappy": "I feel wonderful today.",
      "petTalkNeutral": "What shall we do next?",
      "petTalkHungry": "My tummy is rumbling.",
      "petTalkSleepy": "I could use a little nap.",
      "petTalkPageFormatter": "Let us tidy some text together.",
      "petTalkPageFilter": "Chinese characters, begone!",
      "petTalkPagePunctuation": "Let us fix those punctuation marks.",
      "petTalkPageReplacer": "Time to swap a few words.",
      "petStatsTitle": "Companion stats",
      "petStatLevel": "Level",
      "petStatStage": "Stage",
      "petStatXp": "Experience",
      "petStatTreats": "Treats",
      "petStatDays": "Days visited",
      "petStatStreak": "Day streak",
      "petStatTricks": "Tricks",
      "petStatCombo": "Best combo",
      "petStatAchievements": "Achievements",
      "petAchievementsCount": "{n}/{total}",
      "petAchievementUnlocked": "{name} earned: {title}",
      "petAchFirstPet": "New friend",
      "petAchFirstPetDesc": "Adopt your first companion.",
      "petAchFed10": "Well fed",
      "petAchFed10Desc": "Feed your companion 10 times.",
      "petAchLevel5": "Rising star",
      "petAchLevel5Desc": "Reach level 5.",
      "petAchLevel10": "Elder bond",
      "petAchLevel10Desc": "Reach level 10.",
      "petAchMiniWin": "Playmate",
      "petAchMiniWinDesc": "Finish a mini-game.",
      "petAchTrickster": "Trickster",
      "petAchTricksterDesc": "Teach your companion a trick.",
      "petAchStreak3": "Loyal friend",
      "petAchStreak3Desc": "Visit three days in a row.",
      "petAchTreats25": "Treat hoarder",
      "petAchTreats25Desc": "Hold 25 treats at once.",
      "petAchCombo5": "On a roll",
      "petAchCombo5Desc": "Reach a 5x petting combo.",
      "petAchEvolved": "Evolution",
      "petAchEvolvedDesc": "Evolve to the grown stage.",
      "petAchDressed": "Dressed up",
      "petAchDressedDesc": "Put on an accessory.",
      "petGamesTitle": "Mini-games",
      "petGameTreatToss": "Treat Toss",
      "petGameTrickTrainer": "Trick Trainer",
      "petGameChoose": "Pick a mini-game",
      "petGameExit": "Leave game",
      "petGameTossHint": "Stop the marker in the glowing zone.",
      "petGameTossStart": "Start tossing",
      "petGameTossBtn": "Toss",
      "petGameTossRound": "Round {n}/{total}",
      "petGameTossPerfect": "Perfect!",
      "petGameTossGood": "Nice!",
      "petGameTossOk": "Okay.",
      "petGameTossMiss": "Missed.",
      "petGameTossScore": "Score {n}",
      "petGameTossResult": "Treat Toss: {n} points, +{treats} treats.",
      "petGameTossAria": "Treat Toss timing bar.",
      "petGameSimonHint": "Watch the sequence, then repeat it.",
      "petGameSimonWatch": "Watch...",
      "petGameSimonGo": "Your turn!",
      "petGameSimonRound": "Sequence {n}",
      "petGameSimonWrong": "Not quite. Try again next time.",
      "petGameSimonResult": "Trick Trainer: sequence {n}, +{treats} treats.",
      "petGameSimonAria": "Trick Trainer memory game.",
      "petAccLabel": "Accessory",
      "petAccNone": "None",
      "petAccHat": "Party hat",
      "petAccScarf": "Scarf",
      "petAccGlasses": "Glasses",
      "petAccCrown": "Crown",
      "petAccAura": "Aura",
      "petHueLabel": "Coat",
      "petHueDefault": "Classic",
      "petHueMint": "Mint",
      "petHueRose": "Rose",
      "petHueGold": "Gold",
      "petLockedAtLevel": "Unlocks at level {n}",
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
      "tabReflex": "反应点击",
      "hudTime": "时间",
      "hudWpm": "WPM",
      "hudAcc": "准确率",
      "hudMoves": "步数",
      "hudPairs": "配对",
      "hudScore": "得分",
      "hudBest": "最佳",
      "hudLast": "上次",
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
      "reflexPadIdle": "点击开始",
      "reflexPadWaiting": "请等待…",
      "reflexPadReady": "快点！",
      "reflexPrompt": "开始一局，在面板变绿时立即点击。",
      "reflexWaiting": "准备好，暂时不要点击。",
      "reflexTooSoon": "太早了！请重新开始并等待绿色出现。",
      "reflexResult": "你的反应时间是 {n} 毫秒。",
      "reflexHint": "可点击按钮或按空格键、回车键；用时越短越好。",
      "logReflex": "反应点击：{n} 毫秒",
      "tabCaretDash": "光标疾驰",
      "btnStart": "开始",
      "hudSpeed": "速度",
      "caretFieldLabel": "光标疾驰游戏区。空格键或方向上键跳跃，方向下键下蹲。",
      "caretPrompt": "点击开始，跳过乱码标点，再从悬浮字符下方穿过。",
      "caretGo": "奔跑中。跳过乱码标点，俯身穿过悬浮字符。",
      "caretOverReady": "游戏结束",
      "caretOver": "游戏结束，跑了 {n}",
      "caretOverResult": "游戏结束，本次 {n} 米。",
      "caretBest": "最佳 {n} 米",
      "caretHint":
        "轻点或点击游戏区跳跃，按住下蹲。空格键或方向上键按得越久跳得越高。",
      "btnJump": "跳跃",
      "btnDuck": "下蹲",
      "logCaretDash": "光标疾驰：{n} 米",
      "petTitle": "伙伴",
      "petAdoptTitle": "领养伙伴",
      "petAdoptBody":
        "选择一种形态并取个名字。它会住在每个页面的角落，并记得你上次的来访。",
      "petSpeciesLabel": "形态",
      "petNameLabel": "名字",
      "petNamePlaceholder": "给伙伴取个名字",
      "petRenamePlaceholder": "新名字",
      "petAdoptConfirm": "领养",
      "petAdoptLater": "稍后再说",
      "petDefaultName": "小豆",
      "petSpeciesBracko": "括弧灵",
      "petSpeciesQuillop": "笔尖灵",
      "petSpeciesTagling": "标签灵",
      "petSpeciesBrackoDesc": "括号形状的抱抱怪，喜欢把代码块收拾整齐。",
      "petSpeciesQuillopDesc": "笔尖形状的漂流者，会啜饮剩下的墨水。",
      "petSpeciesTaglingDesc": "标签形状的探索者，见到什么都要贴上标记。",
      "petMoodHappy": "很开心",
      "petMoodNeutral": "还不错",
      "petMoodHungry": "有点饿",
      "petMoodSleepy": "有点困",
      "petStatusHappy": "{name} 感觉棒极了。",
      "petStatusNeutral": "{name} 状态还不错。",
      "petStatusHungry": "{name} 有点饿了。",
      "petStatusSleepy": "{name} 有点困了。",
      "petButtonAria": "抚摸 {name}。{name} 现在{mood}。",
      "petTapHint": "抚摸 {name}",
      "petAway": "你离开了 {n}，{name} 想你了。",
      "petLevel": "等级 {n}",
      "petXp": "{n} 经验",
      "petStatHappiness": "心情",
      "petStatHunger": "饥饿",
      "petStatEnergy": "精力",
      "petStatsLabel": "伙伴状态",
      "petControlsLabel": "伙伴操作",
      "petBtnFeed": "喂食",
      "petBtnPlay": "玩耍",
      "petBtnRest": "休息",
      "petBtnRename": "改名",
      "petBtnSpecies": "换形态",
      "petBtnHide": "隐藏",
      "petBtnReset": "重置",
      "petBtnCollapse": "收起伙伴面板",
      "petBtnExpand": "展开伙伴面板",
      "petBtnRestore": "显示伙伴",
      "petBtnRenameConfirm": "保存",
      "petBtnRenameCancel": "取消",
      "petResetArmed": "确认重置？",
      "petReactionPet": "你抚摸了 {name}。",
      "petReactionFeed": "你喂了 {name}。",
      "petReactionPlay": "你和 {name} 玩了一会儿。",
      "petReactionRest": "{name} 好好休息了一下。",
      "petReactionTired": "{name} 太累了，玩不动。",
      "petReactionFull": "{name} 现在还不饿。",
      "petReactionRested": "{name} 的精力已经满了。",
      "petReactionCooldown": "{name} 还在回味呢。",
      "petReactionRenamed": "名字改成了 {name}。",
      "petReactionSpecies": "{name} 变成了{species}。",
      "petReactionReset": "已重置领养，请重新选择伙伴。",
      "petReactionAdopted": "欢迎，{name}！",
      "petReactionMissed": "{name} 想你了。",
      "petReactionLevel": "{name} 升到了等级 {n}！",
      "petAwayHours": "{n} 小时",
      "petAwayMinutes": "{n} 分钟",
      "petBtnTreat": "投喂零食",
      "petBtnBrush": "梳毛",
      "petBtnTalk": "聊天",
      "petBtnTricks": "动作",
      "petBtnGames": "小游戏",
      "petBtnStats": "状态",
      "petBtnBack": "返回",
      "petBtnDrag": "拖动伙伴",
      "petMoveHandle": "移动伙伴（拖动或使用方向键）",
      "petReactionMoved": "「{name}」移动到了{corner}角。",
      "petCornerBr": "右下",
      "petCornerBl": "左下",
      "petCornerTr": "右上",
      "petCornerTl": "左上",
      "petBtnSound": "音效",
      "petSoundOn": "音效开",
      "petSoundOff": "音效关",
      "petTreatsLabel": "零食",
      "petTreatCount": "{n}",
      "petReactionTreat": "你投喂了 {name} 一个零食。",
      "petReactionNoTreat": "{name} 已经没有零食了。",
      "petReactionBrush": "你给 {name} 梳了毛。",
      "petReactionTrickTeach": "{name} 学会了{trick}！",
      "petReactionTrickNone": "{name} 已经学会所有动作了。",
      "petReactionTrickLocked": "等级 {n} 可教{trick}。",
      "petReactionTrickPerform": "{name} 表演了{trick}！",
      "petReactionTrickUnknown": "{name} 还不会这个动作。",
      "petReactionStage": "{name} 进化成了{stage}！",
      "petReactionCombo": "连击 x{n}！",
      "petComboLabel": "x{n}",
      "petReactionMuted": "音效已关闭。",
      "petReactionUnmuted": "音效已开启。",
      "petReactionAcc": "{name} 戴上了{acc}。",
      "petReactionHue": "你给 {name} 换了毛色。",
      "petReactionCheer": "{name} 为你加油！",
      "petReactionCheerBest": "{name} 被你的新纪录惊呆了！",
      "petReactionTyping": "继续打字，你做得很棒！",
      "petReactionWoke": "{name} 醒来了。",
      "petReactionSleep": "{name} 打起了瞌睡。",
      "petStageBaby": "幼体",
      "petStageGrown": "成长体",
      "petStageElder": "长老体",
      "petTrickJump": "跳跃",
      "petTrickSpin": "转圈",
      "petTrickSing": "唱歌",
      "petTrickWave": "挥手",
      "petTalkMorning": "早上好！",
      "petTalkAfternoon": "下午好。",
      "petTalkEvening": "晚上好。",
      "petTalkNight": "已经很晚了……",
      "petTalkHappy": "我今天感觉超棒。",
      "petTalkNeutral": "接下来做点什么呢？",
      "petTalkHungry": "肚子咕咕叫了。",
      "petTalkSleepy": "有点想打个盹。",
      "petTalkPageFormatter": "一起把文字整理干净吧。",
      "petTalkPageFilter": "中文字符，退散！",
      "petTalkPagePunctuation": "来修一修标点符号吧。",
      "petTalkPageReplacer": "该替换一些词语了。",
      "petStatsTitle": "伙伴状态",
      "petStatLevel": "等级",
      "petStatStage": "阶段",
      "petStatXp": "经验",
      "petStatTreats": "零食",
      "petStatDays": "到访天数",
      "petStatStreak": "连续天数",
      "petStatTricks": "动作",
      "petStatCombo": "最高连击",
      "petStatAchievements": "成就",
      "petAchievementsCount": "{n}/{total}",
      "petAchievementUnlocked": "{name} 获得了：{title}",
      "petAchFirstPet": "初次相遇",
      "petAchFirstPetDesc": "领养第一个伙伴。",
      "petAchFed10": "喂养达人",
      "petAchFed10Desc": "喂食伙伴 10 次。",
      "petAchLevel5": "崭露头角",
      "petAchLevel5Desc": "达到等级 5。",
      "petAchLevel10": "羁绊长老",
      "petAchLevel10Desc": "达到等级 10。",
      "petAchMiniWin": "游戏伙伴",
      "petAchMiniWinDesc": "完成一次小游戏。",
      "petAchTrickster": "动作大师",
      "petAchTricksterDesc": "教会伙伴一个动作。",
      "petAchStreak3": "忠实伙伴",
      "petAchStreak3Desc": "连续到访三天。",
      "petAchTreats25": "零食收藏家",
      "petAchTreats25Desc": "一次拥有 25 个零食。",
      "petAchCombo5": "连击高手",
      "petAchCombo5Desc": "达成 5 连击。",
      "petAchEvolved": "进化",
      "petAchEvolvedDesc": "进化到成长体。",
      "petAchDressed": "盛装打扮",
      "petAchDressedDesc": "戴上任意配饰。",
      "petGamesTitle": "小游戏",
      "petGameTreatToss": "抛零食",
      "petGameTrickTrainer": "动作训练",
      "petGameChoose": "选择一个小游戏",
      "petGameExit": "退出游戏",
      "petGameTossHint": "在发光区域停下标记。",
      "petGameTossStart": "开始抛掷",
      "petGameTossBtn": "抛掷",
      "petGameTossRound": "第 {n}/{total} 轮",
      "petGameTossPerfect": "完美！",
      "petGameTossGood": "不错！",
      "petGameTossOk": "还行。",
      "petGameTossMiss": "没中。",
      "petGameTossScore": "得分 {n}",
      "petGameTossResult": "抛零食：{n} 分，+{treats} 零食。",
      "petGameTossAria": "抛零食计时条。",
      "petGameSimonHint": "记住顺序，然后重复一遍。",
      "petGameSimonWatch": "观看……",
      "petGameSimonGo": "轮到你了！",
      "petGameSimonRound": "序列 {n}",
      "petGameSimonWrong": "差一点，下次再来。",
      "petGameSimonResult": "动作训练：序列 {n}，+{treats} 零食。",
      "petGameSimonAria": "动作训练记忆游戏。",
      "petAccLabel": "配饰",
      "petAccNone": "无",
      "petAccHat": "派对帽",
      "petAccScarf": "围巾",
      "petAccGlasses": "眼镜",
      "petAccCrown": "王冠",
      "petAccAura": "光环",
      "petHueLabel": "毛色",
      "petHueDefault": "经典",
      "petHueMint": "薄荷",
      "petHueRose": "玫瑰",
      "petHueGold": "鎏金",
      "petLockedAtLevel": "等级 {n} 解锁",
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
  var quietResetReflex = null;
  var quietResetCaretDash = null;

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
  var reflexBestKey = "reflex-tap-best";
  var caretDashBestKey = "caret-dash-best";

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
    var tabReflex = getElement("gameTabReflex");
    var tabCaretDash = getElement("gameTabCaretDash");
    var panelTyping = getElement("gamePanelTyping");
    var panelMemory = getElement("gamePanelMemory");
    var panel2048 = getElement("gamePanel2048");
    var panelReflex = getElement("gamePanelReflex");
    var panelCaretDash = getElement("gamePanelCaretDash");
    if (
      !dialog ||
      !backdrop ||
      !closeBtn ||
      !tabTyping ||
      !tabMemory ||
      !tab2048 ||
      !tabReflex ||
      !tabCaretDash ||
      !panelTyping ||
      !panelMemory ||
      !panel2048 ||
      !panelReflex ||
      !panelCaretDash
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
      petNotifyGame(isBest);

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
      { name: "reflex", tab: tabReflex, panel: panelReflex },
      { name: "caretDash", tab: tabCaretDash, panel: panelCaretDash },
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

      if (quietResetReflex) {
        quietResetReflex();
      }

      if (quietResetCaretDash) {
        quietResetCaretDash();
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

    tabReflex.addEventListener("click", function () {
      selectTab("reflex");
    });

    tabCaretDash.addEventListener("click", function () {
      selectTab("caretDash");
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

      if (quietResetReflex) {
        quietResetReflex();
      }

      if (quietResetCaretDash) {
        quietResetCaretDash();
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
      petNotifyGame(isBest);

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
        petNotifyGame(score > 0 && score > bestAtStart);
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

  function initReflexGame() {
    var pad = getElement("reflexPad");
    var padText = getElement("reflexPadText");
    var lastEl = getElement("reflexLast");
    var bestEl = getElement("reflexBest");
    var resultEl = getElement("reflexResult");
    var startBtn = getElement("reflexStartBtn");
    if (!pad || !padText || !lastEl || !bestEl || !resultEl || !startBtn) {
      return;
    }

    var state = "idle";
    var readyAt = 0;
    var waitId = null;

    function readBest() {
      var value = parseInt(localStorage.getItem(reflexBestKey), 10);
      return isNaN(value) ? 0 : value;
    }

    function renderBest() {
      var best = readBest();
      bestEl.textContent = best ? best + " ms" : "—";
    }

    function setPad(nextState, labelKey) {
      state = nextState;
      pad.classList.remove("is-waiting", "is-ready", "is-early");
      if (nextState === "waiting") {
        pad.classList.add("is-waiting");
      } else if (nextState === "ready") {
        pad.classList.add("is-ready");
      } else if (nextState === "early") {
        pad.classList.add("is-early");
      }
      padText.textContent = t(labelKey);
    }

    function resetRound() {
      window.clearTimeout(waitId);
      waitId = null;
      readyAt = 0;
      setPad("idle", "reflexPadIdle");
    }

    function startRound() {
      window.clearTimeout(waitId);
      lastEl.textContent = "—";
      resultEl.textContent = t("reflexWaiting");
      setPad("waiting", "reflexPadWaiting");

      var delay = 1200 + Math.floor(Math.random() * 2200);
      waitId = window.setTimeout(function () {
        waitId = null;
        readyAt = performance.now();
        setPad("ready", "reflexPadReady");
        resultEl.textContent = t("reflexPadReady");
      }, delay);
      pad.focus();
    }

    function tapPad() {
      if (state === "waiting") {
        window.clearTimeout(waitId);
        waitId = null;
        readyAt = 0;
        setPad("early", "reflexPadIdle");
        resultEl.textContent = t("reflexTooSoon");
        return;
      }

      if (state !== "ready") {
        startRound();
        return;
      }

      var reaction = Math.max(1, Math.round(performance.now() - readyAt));
      var previousBest = readBest();
      var isBest = !previousBest || reaction < previousBest;
      if (isBest) {
        localStorage.setItem(reflexBestKey, String(reaction));
      }

      lastEl.textContent = reaction + " ms";
      resultEl.textContent =
        t("reflexResult", { n: reaction }) + (isBest ? " " + t("newBest") : "");
      setPad("idle", "reflexPadIdle");
      renderBest();
      logAction(t("logReflex", { n: reaction }));

      if (isBest) {
        var rect = pad.getBoundingClientRect();
        createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      }
      petNotifyGame(isBest);
    }

    startBtn.addEventListener("click", startRound);
    pad.addEventListener("click", tapPad);

    quietResetReflex = function () {
      if (state === "waiting" || state === "ready") {
        resetRound();
        resultEl.textContent = t("reflexPrompt");
      }
    };

    renderBest();
    resetRound();
  }

  function initCaretDash() {
    var field = getElement("caretField");
    var driftFar = getElement("caretDriftFar");
    var driftNear = getElement("caretDriftNear");
    var obstaclesEl = getElement("caretObstacles");
    var playerEl = getElement("caretPlayer");
    var railFill = getElement("caretRailFill");
    var overlayEl = getElement("caretOverlay");
    var overlayText = getElement("caretOverlayText");
    var retryBtn = getElement("caretRetryBtn");
    var againBtn = getElement("caretAgainBtn");
    var startBtn = getElement("caretStartBtn");
    var jumpBtn = getElement("caretJumpBtn");
    var duckBtn = getElement("caretDuckBtn");
    var scoreEl = getElement("caretScore");
    var bestStatEl = getElement("caretBestStat");
    var speedEl = getElement("caretSpeed");
    var resultEl = getElement("caretResult");
    var bestEl = getElement("caretBest");
    var panel = getElement("gamePanelCaretDash");
    if (
      !field ||
      !driftFar ||
      !driftNear ||
      !obstaclesEl ||
      !playerEl ||
      !railFill ||
      !overlayEl ||
      !overlayText ||
      !retryBtn ||
      !againBtn ||
      !startBtn ||
      !jumpBtn ||
      !duckBtn ||
      !scoreEl ||
      !bestStatEl ||
      !speedEl ||
      !resultEl ||
      !bestEl ||
      !panel
    ) {
      return;
    }

    // Layout is expressed in the same pixel units the CSS uses, so the hit
    // boxes below stay in sync with what the player sees.
    var GROUND_INSET = 28;
    var PLAYER_X_RATIO = 0.15;
    var PLAYER_W = 6;
    var PLAYER_H = 30;
    var DUCK_H = 12;
    var FLOAT_GAP = 22;
    var BASE_SPEED = 168;
    var SPEED_GAIN = 0.09;
    var MAX_SPEED = 430;
    var GRAVITY = 1850;
    var HOLD_GRAVITY = 980;
    var DUCK_GRAVITY = 2700;
    var JUMP_V = -520;
    var CUT_V = -230;
    var PIXELS_PER_METRE = 12;
    var DUCK_HOLD_MS = 170;
    var STEP_CAP = 0.034;

    var groundGlyphs = [
      "\u00b6",
      "\u00a7",
      "\u00bf",
      "\u00a1",
      "\u00a4",
      "\u00ac",
      "\u00a6",
      "\u00d7",
      "\u00f7",
      "\u2020",
      "\u2021",
      "\u2030",
      "\u00b5",
      "\u00b7",
    ];
    var floatGlyphs = [
      "\ufffd",
      "\u2400",
      "\u240a",
      "\u2421",
      "\u2318",
      "\u2301",
      "\u235f",
      "\u238b",
      "\u259a",
      "\u25ca",
    ];

    var state = "idle";
    var obstacles = [];
    var obsSeq = 0;
    var travelled = 0;
    var speedNow = BASE_SPEED;
    var jumpOffset = 0;
    var velY = 0;
    var onGround = true;
    var ducking = false;
    var jumpHeld = false;
    var rafId = null;
    var lastTs = 0;
    var spawnGap = 0;
    var fieldW = 0;
    var fieldH = 0;
    var shakeId = null;
    var holdId = null;
    var holdTimer = null;
    var holdDucked = false;

    function fillDrift(element, pattern, repeat) {
      var text = "";
      for (var i = 0; i < repeat; i += 1) {
        text += pattern;
      }
      element.textContent = text;
    }

    fillDrift(driftFar, " . : ; \u00b6 \u00a7 \u00a4 \u00ac \u00b7 \u2020 \u2030 ", 26);
    fillDrift(
      driftNear,
      " const caret = line[i] \u2192 index++ \u2591\u2592\u2593 ",
      18,
    );
    field.style.setProperty("--caret-ground-y", GROUND_INSET + "px");

    function readBest() {
      var value = parseInt(localStorage.getItem(caretDashBestKey), 10);
      return isNaN(value) ? 0 : value;
    }

    function renderBest() {
      var best = readBest();
      bestStatEl.textContent = String(best);
      bestEl.textContent = best ? t("caretBest", { n: best }) : t("noBest");
    }

    function playerX() {
      return Math.round(fieldW * PLAYER_X_RATIO);
    }

    function currentScore() {
      return Math.floor(travelled / PIXELS_PER_METRE);
    }

    function resetPlayerVisual() {
      playerEl.style.transform = "translateY(0px)";
      playerEl.classList.remove("is-ducking");
    }

    function measure() {
      var previous = fieldW;
      fieldW = field.clientWidth || 396;
      fieldH = field.clientHeight || 150;
      if (previous && previous !== fieldW) {
        var ratio = fieldW / previous;
        obstacles.forEach(function (obstacle) {
          obstacle.x *= ratio;
        });
      }
      playerEl.style.left = playerX() + "px";
      playerEl.style.bottom = GROUND_INSET + "px";
    }

    function hitBox(step) {
      var height = ducking ? DUCK_H : PLAYER_H;
      var bottom = fieldH - GROUND_INSET - jumpOffset;
      return {
        x: playerX(),
        y: bottom - height,
        w: PLAYER_W + step,
        h: height,
      };
    }

    function obstacleBox(obstacle) {
      var bottom =
        fieldH - GROUND_INSET - (obstacle.floating ? FLOAT_GAP : 0);
      return {
        x: obstacle.x,
        y: bottom - obstacle.h,
        w: obstacle.w,
        h: obstacle.h,
      };
    }

    function overlaps(a, b) {
      return (
        a.x < b.x + b.w &&
        b.x < a.x + a.w &&
        a.y < b.y + b.h &&
        b.y < a.y + a.h
      );
    }

    function render() {
      playerEl.style.transform = "translateY(" + -jumpOffset + "px)";
      playerEl.classList.toggle("is-ducking", ducking);
      obstacles.forEach(function (obstacle) {
        obstacle.el.style.transform = "translateX(" + obstacle.x + "px)";
      });
    }

    function updateHud() {
      scoreEl.textContent = String(currentScore());
      speedEl.textContent = (speedNow / BASE_SPEED).toFixed(1) + "x";
      var progress = (speedNow - BASE_SPEED) / (MAX_SPEED - BASE_SPEED);
      railFill.style.width = Math.round(Math.min(1, Math.max(0, progress)) * 100) + "%";
    }

    function clearObstacles() {
      obstacles.forEach(function (obstacle) {
        if (obstacle.el && obstacle.el.parentNode) {
          obstacle.el.parentNode.removeChild(obstacle.el);
        }
      });
      obstacles = [];
      obstaclesEl.textContent = "";
    }

    function clearShake() {
      if (shakeId !== null) {
        window.clearTimeout(shakeId);
        shakeId = null;
      }
      field.classList.remove("is-shaking");
    }

    function stopLoop() {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
      lastTs = 0;
    }

    function startLoop() {
      if (rafId !== null || state !== "running") {
        return;
      }
      lastTs = 0;
      rafId = window.requestAnimationFrame(frame);
    }

    function spawnObstacle() {
      var floating = Math.random() < 0.34;
      var width;
      var height;
      if (floating) {
        width = 20 + Math.random() * 16;
        height = 20 + Math.random() * 8;
      } else {
        width = 16 + Math.random() * 22;
        height = 20 + Math.random() * 14;
      }

      var glyphs = floating ? floatGlyphs : groundGlyphs;
      var element = document.createElement("span");
      element.className =
        "caret-obstacle " + (floating ? "is-floating" : "is-ground");
      element.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
      element.style.width = Math.round(width) + "px";
      element.style.height = Math.round(height) + "px";
      element.style.bottom =
        GROUND_INSET + (floating ? FLOAT_GAP : 0) + "px";
      element.style.transform = "translateX(" + (fieldW + 14) + "px)";

      var obstacle = {
        id: (obsSeq += 1),
        x: fieldW + 14,
        w: Math.round(width),
        h: Math.round(height),
        floating: floating,
        el: element,
      };
      obstaclesEl.appendChild(element);
      obstacles.push(obstacle);

      var seconds = 1.02 - Math.min(0.34, travelled / 11000);
      spawnGap = speedNow * (seconds + Math.random() * 0.5);
    }

    function endRound() {
      state = "over";
      stopLoop();
      setDuck(false);
      jumpHeld = false;

      var score = currentScore();
      var previousBest = readBest();
      var isBest = score > previousBest;
      if (isBest) {
        localStorage.setItem(caretDashBestKey, String(score));
      }

      overlayText.textContent = t("caretOver", { n: score });
      overlayEl.hidden = false;
      resultEl.textContent =
        t("caretOverResult", { n: score }) +
        (isBest ? " " + t("newBest") : "");
      renderBest();
      logAction(t("logCaretDash", { n: score }));

      if (!isMotionOff()) {
        field.classList.add("is-shaking");
        shakeId = window.setTimeout(function () {
          shakeId = null;
          field.classList.remove("is-shaking");
        }, 300);
      }

      if (isBest) {
        var rect = field.getBoundingClientRect();
        createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      }
      petNotifyGame(isBest);

      retryBtn.focus();
    }

    function step(dt) {
      travelled += speedNow * dt;

      if (!onGround) {
        var gravity = GRAVITY;
        if (ducking) {
          gravity = DUCK_GRAVITY;
        } else if (jumpHeld && velY < 0) {
          gravity = HOLD_GRAVITY;
        }
        velY += gravity * dt;
        jumpOffset -= velY * dt;
        if (jumpOffset <= 0) {
          jumpOffset = 0;
          velY = 0;
          onGround = true;
        }
      }

      speedNow = Math.min(MAX_SPEED, BASE_SPEED + travelled * SPEED_GAIN);

      spawnGap -= speedNow * dt;
      if (spawnGap <= 0) {
        spawnObstacle();
      }

      var stepPx = speedNow * dt;
      for (var index = obstacles.length - 1; index >= 0; index -= 1) {
        var obstacle = obstacles[index];
        obstacle.x -= stepPx;
        if (obstacle.x + obstacle.w < -12) {
          if (obstacle.el.parentNode) {
            obstacle.el.parentNode.removeChild(obstacle.el);
          }
          obstacles.splice(index, 1);
        }
      }

      var box = hitBox(stepPx);
      for (var other = 0; other < obstacles.length; other += 1) {
        if (overlaps(box, obstacleBox(obstacles[other]))) {
          endRound();
          return;
        }
      }

      updateHud();
    }

    function frame(timestamp) {
      rafId = null;
      if (state !== "running") {
        return;
      }
      if (document.hidden || panel.hidden) {
        return;
      }
      if (!lastTs) {
        lastTs = timestamp;
      }
      var dt = (timestamp - lastTs) / 1000;
      lastTs = timestamp;
      if (dt < 0) {
        dt = 0;
      }
      if (dt > STEP_CAP) {
        dt = STEP_CAP;
      }
      step(dt);
      render();
      if (state === "running") {
        rafId = window.requestAnimationFrame(frame);
      }
    }

    function doJump() {
      if (state !== "running" || !onGround) {
        return;
      }
      velY = JUMP_V;
      jumpOffset = 0.01;
      onGround = false;
    }

    function cutJump() {
      if (velY < 0) {
        velY = Math.max(velY, CUT_V);
      }
    }

    function setDuck(value) {
      var next = state === "running" ? value : false;
      if (next === ducking) {
        return;
      }
      ducking = next;
      playerEl.classList.toggle("is-ducking", ducking);
    }

    function startRound() {
      stopLoop();
      clearShake();
      clearObstacles();
      measure();

      state = "running";
      travelled = 0;
      speedNow = BASE_SPEED;
      jumpOffset = 0;
      velY = 0;
      onGround = true;
      jumpHeld = false;
      holdDucked = false;
      if (holdTimer !== null) {
        window.clearTimeout(holdTimer);
        holdTimer = null;
      }
      holdId = null;
      spawnGap = fieldW * 0.85;

      overlayEl.hidden = true;
      ducking = false;
      resetPlayerVisual();
      render();
      scoreEl.textContent = "0";
      speedEl.textContent = "1.0x";
      railFill.style.width = "0%";
      resultEl.textContent = t("caretGo");
      startLoop();
      field.focus();
    }

    function resetQuiet() {
      state = "idle";
      stopLoop();
      clearShake();
      clearObstacles();
      if (holdTimer !== null) {
        window.clearTimeout(holdTimer);
        holdTimer = null;
      }
      holdId = null;
      holdDucked = false;
      travelled = 0;
      speedNow = BASE_SPEED;
      jumpOffset = 0;
      velY = 0;
      onGround = true;
      ducking = false;
      jumpHeld = false;
      overlayEl.hidden = true;
      resetPlayerVisual();
      scoreEl.textContent = "0";
      speedEl.textContent = "1.0x";
      railFill.style.width = "0%";
      resultEl.textContent = t("caretPrompt");
      renderBest();
    }

    function releaseHold(pointerId) {
      if (holdId !== null && pointerId !== undefined && holdId !== pointerId) {
        return;
      }
      if (holdTimer !== null) {
        window.clearTimeout(holdTimer);
        holdTimer = null;
      }
      var wasDucked = holdDucked;
      holdId = null;
      holdDucked = false;
      if (wasDucked) {
        setDuck(false);
      }
      return wasDucked;
    }

    field.addEventListener("pointerdown", function (event) {
      if (state !== "running" || holdId !== null) {
        return;
      }
      holdId = event.pointerId;
      holdDucked = false;
      if (field.setPointerCapture) {
        try {
          field.setPointerCapture(event.pointerId);
        } catch (error) {
          /* no-op: capture is a nicety, the listeners still fire */
        }
      }
      holdTimer = window.setTimeout(function () {
        holdTimer = null;
        if (holdId === event.pointerId && state === "running") {
          holdDucked = true;
          setDuck(true);
        }
      }, DUCK_HOLD_MS);
    });

    field.addEventListener("pointerup", function (event) {
      if (holdId !== event.pointerId) {
        return;
      }
      var wasDucked = releaseHold(event.pointerId);
      if (!wasDucked && state === "running") {
        doJump();
      }
    });

    field.addEventListener("pointercancel", function (event) {
      releaseHold(event.pointerId);
    });

    field.addEventListener("keydown", function (event) {
      if (
        event.key === " " ||
        event.key === "Spacebar" ||
        event.key === "ArrowUp"
      ) {
        event.preventDefault();
        if (event.repeat || state !== "running") {
          return;
        }
        jumpHeld = true;
        doJump();
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        if (state === "running") {
          setDuck(true);
        }
      }
    });

    field.addEventListener("keyup", function (event) {
      if (
        event.key === " " ||
        event.key === "Spacebar" ||
        event.key === "ArrowUp"
      ) {
        jumpHeld = false;
        cutJump();
        return;
      }

      if (event.key === "ArrowDown") {
        setDuck(false);
      }
    });

    field.addEventListener("blur", function () {
      jumpHeld = false;
      setDuck(false);
    });

    function bindJumpButton(button) {
      button.addEventListener("pointerdown", function (event) {
        event.preventDefault();
        if (state !== "running") {
          return;
        }
        jumpHeld = true;
        doJump();
      });
      button.addEventListener("pointerup", function () {
        jumpHeld = false;
        cutJump();
      });
      button.addEventListener("pointercancel", function () {
        jumpHeld = false;
      });
      button.addEventListener("pointerleave", function () {
        if (jumpHeld) {
          jumpHeld = false;
          cutJump();
        }
      });
      button.addEventListener("keydown", function (event) {
        if (
          event.key !== " " &&
          event.key !== "Spacebar" &&
          event.key !== "ArrowUp" &&
          event.key !== "Enter"
        ) {
          return;
        }
        event.preventDefault();
        if (event.repeat || state !== "running") {
          return;
        }
        jumpHeld = true;
        doJump();
      });
      button.addEventListener("keyup", function (event) {
        if (
          event.key !== " " &&
          event.key !== "Spacebar" &&
          event.key !== "ArrowUp" &&
          event.key !== "Enter"
        ) {
          return;
        }
        jumpHeld = false;
        cutJump();
      });
    }

    function bindDuckButton(button) {
      button.addEventListener("pointerdown", function (event) {
        event.preventDefault();
        setDuck(true);
      });
      button.addEventListener("pointerup", function () {
        setDuck(false);
      });
      button.addEventListener("pointercancel", function () {
        setDuck(false);
      });
      button.addEventListener("pointerleave", function () {
        setDuck(false);
      });
      button.addEventListener("keydown", function (event) {
        if (
          event.key !== " " &&
          event.key !== "Spacebar" &&
          event.key !== "ArrowDown"
        ) {
          return;
        }
        event.preventDefault();
        setDuck(true);
      });
      button.addEventListener("keyup", function (event) {
        if (
          event.key !== " " &&
          event.key !== "Spacebar" &&
          event.key !== "ArrowDown"
        ) {
          return;
        }
        event.preventDefault();
        setDuck(false);
      });
    }

    bindJumpButton(jumpBtn);
    bindDuckButton(duckBtn);
    jumpBtn.addEventListener("blur", function () {
      jumpHeld = false;
    });
    duckBtn.addEventListener("blur", function () {
      setDuck(false);
    });

    startBtn.addEventListener("click", startRound);
    retryBtn.addEventListener("click", startRound);
    againBtn.addEventListener("click", function () {
      resetQuiet();
      startBtn.focus();
    });

    function handleVisibility() {
      if (document.hidden) {
        stopLoop();
      } else if (state === "running" && !panel.hidden) {
        startLoop();
      }
    }

    document.addEventListener("visibilitychange", handleVisibility);

    window.addEventListener("resize", function () {
      if (state === "running") {
        measure();
        render();
      }
    });

    quietResetCaretDash = resetQuiet;

    measure();
    resetQuiet();
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

  /* ------------------------------------------------------------------
   * Pet companion
   * A small original creature injected into every page. Its needs decay
   * with real elapsed time and its whole state lives in one storage key.
   * ------------------------------------------------------------------ */

  var petStorageKey = "capitalconvert-pet";
  var petSpeciesOrder = ["bracko", "quillop", "tagling"];
  var petSvgNamespace = "http://www.w3.org/2000/svg";
  var petTickMs = 30000;
  var petCooldownMs = 900;
  var petReactionMs = 620;
  var petFxMs = 900;
  var petStatusRevertMs = 4200;
  var petNameMax = 16;
  var petDecayCapMs = 12 * 60 * 60 * 1000;
  var petDecayPerHour = { happiness: 6, hunger: 9, energy: 5 };
  var petStartStats = { happiness: 72, hunger: 24, energy: 80 };
  var petStartTreats = 3;
  var petComboWindowMs = 2600;
  var petIdleSleepMs = 3 * 60 * 1000;
  var petTypingCooldownMs = 22000;
  var petCursorThrottleMs = 90;
  var petTossRounds = 5;
  var petTossPeriodMs = 1400;
  var petTossTickMs = 40;
  var petSimonStepMs = 620;
  var petToastMs = 4200;

  /* Cumulative XP required to *reach* each level; index 0 is level 1. */
  var petLevelXpTable = [0, 20, 50, 90, 140, 200, 280, 380, 500, 650];
  var petMaxLevel = petLevelXpTable.length;
  var petStageOrder = ["baby", "grown", "elder"];
  var petStageMaxLevel = { baby: 3, grown: 7, elder: petMaxLevel };
  var petTrickOrder = ["jump", "spin", "sing", "wave"];
  var petTrickLevel = { jump: 1, spin: 2, sing: 4, wave: 6 };
  var petTrickClass = {
    jump: "pet-trick-jump",
    spin: "pet-trick-spin",
    sing: "pet-trick-sing",
    wave: "pet-trick-wave",
  };
  var petAccessoryOrder = ["none", "hat", "scarf", "glasses", "crown", "aura"];
  var petAccessoryLevel = {
    none: 1,
    hat: 2,
    scarf: 4,
    glasses: 6,
    crown: 8,
    aura: 10,
  };
  var petAccessoryClass = {
    none: "pet-acc-none",
    hat: "pet-acc-hat",
    scarf: "pet-acc-scarf",
    glasses: "pet-acc-glasses",
    crown: "pet-acc-crown",
    aura: "pet-acc-aura",
  };
  var petHueOrder = ["default", "mint", "rose", "gold"];
  var petHueLevel = { default: 1, mint: 3, rose: 5, gold: 7 };
  var petCornerOrder = ["br", "bl", "tr", "tl"];
  var petStageClass = {
    baby: "pet-stage-baby",
    grown: "pet-stage-grown",
    elder: "pet-stage-elder",
  };
  var petParticleShapes = {
    happy: "is-heart",
    fed: "is-food",
    playing: "is-star",
    resting: "is-sleep",
    treat: "is-food",
    brush: "is-star",
    level: "is-spark",
    achievement: "is-spark",
    cheer: "is-star",
  };
  var petAchievements = [
    { id: "firstPet", titleKey: "petAchFirstPet", descKey: "petAchFirstPetDesc", icon: "M12 20c-4.1 0-7.4-2.7-7.4-6.1 0-2.6 2.1-4.6 4.7-4.6.9 0 1.7.3 2.4.8A4.1 4.1 0 0 1 19.4 14c0 3.4-3.3 6-7.4 6z" },
    { id: "fed10", titleKey: "petAchFed10", descKey: "petAchFed10Desc", icon: "M4 11h13a4 4 0 0 1 0 8H8a4 4 0 0 1-4-4z" },
    { id: "level5", titleKey: "petAchLevel5", descKey: "petAchLevel5Desc", icon: "M12 3l2.6 6.1L21 10l-4.8 4.3L17.4 21 12 17.7 6.6 21l1.2-6.7L3 10l6.4-.9z" },
    { id: "level10", titleKey: "petAchLevel10", descKey: "petAchLevel10Desc", icon: "M5 18h14M7 18V9l5-4 5 4v9" },
    { id: "miniWin", titleKey: "petAchMiniWin", descKey: "petAchMiniWinDesc", icon: "M12 4l2 4.4 4.8.6-3.5 3.3.9 4.7L12 14.8 7.8 17l.9-4.7L5.2 9l4.8-.6z" },
    { id: "trickster", titleKey: "petAchTrickster", descKey: "petAchTricksterDesc", icon: "M12 3v10m0 0l-4 4m4-4l4 4" },
    { id: "streak3", titleKey: "petAchStreak3", descKey: "petAchStreak3Desc", icon: "M12 21s-7-4.4-7-9.5A4.5 4.5 0 0 1 12 8a4.5 4.5 0 0 1 7 3.5C19 16.6 12 21 12 21z" },
    { id: "treats25", titleKey: "petAchTreats25", descKey: "petAchTreats25Desc", icon: "M6 8h12l-1 11H7zM9 8V6a3 3 0 0 1 6 0v2" },
    { id: "combo5", titleKey: "petAchCombo5", descKey: "petAchCombo5Desc", icon: "M4 13h4l2-7 4 13 2-6h4" },
    { id: "evolved", titleKey: "petAchEvolved", descKey: "petAchEvolvedDesc", icon: "M12 3l4 5-4 3-4-3zM7 21l1-6h8l1 6z" },
    { id: "dressed", titleKey: "petAchDressed", descKey: "petAchDressedDesc", icon: "M5 9l4-3 3 2 3-2 4 3-3 3v7H8v-7z" },
  ];
  var petAchievementIds = petAchievements.map(function (definition) {
    return definition.id;
  });

  var petState = null;
  var petEls = null;
  var petCollapsed = false;
  var petRenameOpen = false;
  var petResetArmed = false;
  var petAdoptionDismissed = false;
  var petStorageBlocked = false;
  var petDecayTimer = null;
  var petStatusTimer = null;
  var petReactionTimer = null;
  var petResetTimer = null;
  var petComboTimer = null;
  var petToastTimer = null;
  var petCooldownUntil = 0;
  var petStatusText = "";
  var petTrackedTimeouts = [];
  var petSelectedSpecies = petSpeciesOrder[0];
  var petRenderedSpecies = "";
  var petView = "main";
  var petCombo = 0;
  var petAsleep = false;
  var petLastInteraction = 0;
  var petTypingAt = 0;
  var petCursorAt = 0;
  var petLookX = 0;
  var petLookY = 0;
  var petMini = null;
  var petMiniTimers = [];
  var petAudio = null;
  var petDrag = null;
  var petListenersBound = false;

  function petClamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function petToNumber(value, fallback) {
    var number = typeof value === "number" ? value : parseFloat(value);
    return isFinite(number) ? number : fallback;
  }

  function petIsSpecies(value) {
    return petSpeciesOrder.indexOf(value) !== -1;
  }

  function petSpeciesKey(species) {
    return "petSpecies" + species.charAt(0).toUpperCase() + species.slice(1);
  }

  function petMoodKey(mood) {
    return "petMood" + mood.charAt(0).toUpperCase() + mood.slice(1);
  }

  function petMoodStatusKey(mood) {
    return "petStatus" + mood.charAt(0).toUpperCase() + mood.slice(1);
  }

  function petStageKey(stage) {
    return "petStage" + stage.charAt(0).toUpperCase() + stage.slice(1);
  }

  function petTrickKey(trick) {
    return "petTrick" + trick.charAt(0).toUpperCase() + trick.slice(1);
  }

  function petHueKey(hue) {
    return "petHue" + hue.charAt(0).toUpperCase() + hue.slice(1);
  }

  function petAccessoryKey(accessory) {
    return "petAcc" + accessory.charAt(0).toUpperCase() + accessory.slice(1);
  }

  function petPickFrom(order, value, fallback) {
    return order.indexOf(value) !== -1 ? value : fallback;
  }

  function petAchievementById(id) {
    for (var index = 0; index < petAchievements.length; index += 1) {
      if (petAchievements[index].id === id) {
        return petAchievements[index];
      }
    }
    return null;
  }

  function petLocalDay(now) {
    var date = new Date(now);
    try {
      return (
        date.getFullYear() +
        "-" +
        (date.getMonth() + 1) +
        "-" +
        date.getDate()
      );
    } catch (error) {
      return "";
    }
  }

  function petSanitizeName(value) {
    if (typeof value !== "string") {
      return "";
    }
    return value
      .replace(/[\u0000-\u001f\u007f<>]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, petNameMax);
  }

  /*
   * Defensive migration: this runs against every save, including the older
   * schema (no treats / tricks / achievements / streak / accessory). Every
   * field gets a sane default and out-of-range values are clamped, so a
   * partial or corrupt payload can never throw.
   */
  function petNormalizeState(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return null;
    }
    if (!petIsSpecies(raw.species)) {
      return null;
    }
    var tricks = [];
    if (Array.isArray(raw.tricks)) {
      petTrickOrder.forEach(function (trick) {
        if (raw.tricks.indexOf(trick) !== -1) {
          tricks.push(trick);
        }
      });
    }
    var achievements = {};
    if (
      raw.achievements &&
      typeof raw.achievements === "object" &&
      !Array.isArray(raw.achievements)
    ) {
      petAchievementIds.forEach(function (id) {
        var stamp = petToNumber(raw.achievements[id], 0);
        if (stamp > 0) {
          achievements[id] = Math.floor(stamp);
        }
      });
    }
    return {
      species: raw.species,
      name: petSanitizeName(raw.name) || t("petDefaultName"),
      happiness: petClamp(
        petToNumber(raw.happiness, petStartStats.happiness),
        0,
        100,
      ),
      hunger: petClamp(petToNumber(raw.hunger, petStartStats.hunger), 0, 100),
      energy: petClamp(petToNumber(raw.energy, petStartStats.energy), 0, 100),
      xp: Math.max(0, Math.floor(petToNumber(raw.xp, 0))),
      treats: petClamp(Math.floor(petToNumber(raw.treats, petStartTreats)), 0, 9999),
      tricks: tricks,
      achievements: achievements,
      accessory: petPickFrom(petAccessoryOrder, raw.accessory, "none"),
      hue: petPickFrom(petHueOrder, raw.hue, "default"),
      daysVisited: petClamp(Math.floor(petToNumber(raw.daysVisited, 1)), 1, 1000000),
      streak: petClamp(Math.floor(petToNumber(raw.streak, 1)), 1, 1000000),
      lastDay: typeof raw.lastDay === "string" ? raw.lastDay.slice(0, 24) : "",
      totalFeeds: Math.max(0, Math.floor(petToNumber(raw.totalFeeds, 0))),
      totalBrush: Math.max(0, Math.floor(petToNumber(raw.totalBrush, 0))),
      totalTricks: Math.max(0, Math.floor(petToNumber(raw.totalTricks, 0))),
      bestCombo: Math.max(0, Math.floor(petToNumber(raw.bestCombo, 0))),
      miniGamesFinished: Math.max(
        0,
        Math.floor(petToNumber(raw.miniGamesFinished, 0)),
      ),
      pos: petPickFrom(petCornerOrder, raw.pos, "br"),
      sound: raw.sound === true,
      lastSeen: petToNumber(raw.lastSeen, Date.now()),
      hidden: raw.hidden === true,
    };
  }

  function petReadState() {
    var rawText = null;
    try {
      rawText = localStorage.getItem(petStorageKey);
    } catch (error) {
      petStorageBlocked = true;
      return null;
    }
    if (!rawText) {
      return null;
    }
    try {
      return petNormalizeState(JSON.parse(rawText));
    } catch (error) {
      return null;
    }
  }

  function petWriteState() {
    if (!petState || petStorageBlocked) {
      return;
    }
    try {
      localStorage.setItem(petStorageKey, JSON.stringify(petState));
    } catch (error) {
      petStorageBlocked = true;
    }
  }

  function petRemoveState() {
    try {
      localStorage.removeItem(petStorageKey);
    } catch (error) {
      petStorageBlocked = true;
    }
  }

  function petLevelValue() {
    if (!petState) {
      return 1;
    }
    var xp = Math.max(0, petState.xp);
    var level = 1;
    for (var index = 1; index < petLevelXpTable.length; index += 1) {
      if (xp >= petLevelXpTable[index]) {
        level = index + 1;
      }
    }
    return level;
  }

  function petLevelProgress() {
    var level = petLevelValue();
    var base = petLevelXpTable[level - 1];
    var atMax = level >= petMaxLevel;
    var next = atMax ? base : petLevelXpTable[level];
    var span = Math.max(1, next - base);
    var into = atMax ? span : petClamp(petState.xp - base, 0, span);
    return {
      level: level,
      into: into,
      span: span,
      percent: Math.round((into / span) * 100),
    };
  }

  function petStageValue(level) {
    var value = level === undefined ? petLevelValue() : level;
    for (var index = 0; index < petStageOrder.length; index += 1) {
      var stage = petStageOrder[index];
      if (value <= petStageMaxLevel[stage]) {
        return stage;
      }
    }
    return petStageOrder[petStageOrder.length - 1];
  }

  function petStageIndex(stage) {
    return petStageOrder.indexOf(stage === undefined ? petStageValue() : stage);
  }

  function petAccessoryUnlocked(accessory, level) {
    var value = level === undefined ? petLevelValue() : level;
    return value >= (petAccessoryLevel[accessory] || 1);
  }

  function petHueUnlocked(hue, level) {
    var value = level === undefined ? petLevelValue() : level;
    return value >= (petHueLevel[hue] || 1);
  }

  function petLearnedTrick(trick) {
    return !!petState && petState.tricks.indexOf(trick) !== -1;
  }

  function petNextTrick() {
    for (var index = 0; index < petTrickOrder.length; index += 1) {
      if (!petLearnedTrick(petTrickOrder[index])) {
        return petTrickOrder[index];
      }
    }
    return "";
  }

  function petMood() {
    if (!petState) {
      return "neutral";
    }
    if (petState.energy < 30) {
      return "sleepy";
    }
    if (petState.hunger >= 65) {
      return "hungry";
    }
    if (petState.happiness >= 65 && petState.hunger < 50) {
      return "happy";
    }
    return "neutral";
  }

  function petTimeOfDay(now) {
    var hour = 12;
    try {
      hour = new Date(now === undefined ? Date.now() : now).getHours();
    } catch (error) {
      hour = 12;
    }
    if (hour >= 5 && hour < 12) {
      return "morning";
    }
    if (hour >= 12 && hour < 18) {
      return "afternoon";
    }
    if (hour >= 18 && hour < 23) {
      return "evening";
    }
    return "night";
  }

  function petTalkLine() {
    if (!petState) {
      return "";
    }
    var page = document.documentElement.getAttribute("data-page") || "formatter";
    var pageKey = "petTalkPage" + page.charAt(0).toUpperCase() + page.slice(1);
    var mood = petMood();
    var time = petTimeOfDay();
    var moodKey = "petTalk" + mood.charAt(0).toUpperCase() + mood.slice(1);
    var timeKey = "petTalk" + time.charAt(0).toUpperCase() + time.slice(1);
    if (time === "night" && mood !== "sleepy") {
      return t(timeKey) + " " + t(pageKey);
    }
    return t(moodKey) + " " + t(timeKey) + " " + t(pageKey);
  }

  function petApplyDecay(now) {
    if (!petState) {
      return 0;
    }
    var elapsed = now - petState.lastSeen;
    petState.lastSeen = now;
    if (!isFinite(elapsed) || elapsed <= 0) {
      return 0;
    }
    var hours = Math.min(elapsed, petDecayCapMs) / 3600000;
    petState.happiness = petClamp(
      petState.happiness - petDecayPerHour.happiness * hours,
      0,
      100,
    );
    petState.hunger = petClamp(
      petState.hunger + petDecayPerHour.hunger * hours,
      0,
      100,
    );
    petState.energy = petClamp(
      petState.energy - petDecayPerHour.energy * hours,
      0,
      100,
    );
    return hours;
  }

  function petFormatAway(hours) {
    if (hours >= 1) {
      return t("petAwayHours", { n: Math.round(hours) });
    }
    return t("petAwayMinutes", { n: Math.max(1, Math.round(hours * 60)) });
  }

  function petTrackTimeout(callback, delay) {
    var id = window.setTimeout(function () {
      petUntrackTimeout(id);
      callback();
    }, delay);
    petTrackedTimeouts.push(id);
    return id;
  }

  function petUntrackTimeout(id) {
    var index = petTrackedTimeouts.indexOf(id);
    if (index !== -1) {
      petTrackedTimeouts.splice(index, 1);
    }
  }

  function petClearTrackedTimeouts() {
    petTrackedTimeouts.forEach(function (id) {
      window.clearTimeout(id);
    });
    petTrackedTimeouts = [];
    if (petStatusTimer !== null) {
      window.clearTimeout(petStatusTimer);
      petStatusTimer = null;
    }
    if (petReactionTimer !== null) {
      window.clearTimeout(petReactionTimer);
      petReactionTimer = null;
    }
    if (petResetTimer !== null) {
      window.clearTimeout(petResetTimer);
      petResetTimer = null;
    }
    if (petComboTimer !== null) {
      window.clearTimeout(petComboTimer);
      petComboTimer = null;
    }
    if (petToastTimer !== null) {
      window.clearTimeout(petToastTimer);
      petToastTimer = null;
    }
  }

  function petStartTimer() {
    if (petDecayTimer !== null || !petState || petState.hidden) {
      return;
    }
    if (document.hidden) {
      return;
    }
    petDecayTimer = window.setInterval(petOnTick, petTickMs);
  }

  function petStopTimer() {
    if (petDecayTimer === null) {
      return;
    }
    window.clearInterval(petDecayTimer);
    petDecayTimer = null;
  }

  function petOnTick() {
    if (!petState || petState.hidden) {
      petStopTimer();
      return;
    }
    var now = Date.now();
    var changed = petApplyDecay(now) > 0;
    changed = petRefreshIdleSleep(now) || changed;
    if (changed) {
      petWriteState();
      petRender();
    }
  }

  function petRefreshIdleSleep(now) {
    if (!petState || petState.hidden) {
      return false;
    }
    var shouldSleep =
      now - petLastInteraction > petIdleSleepMs ||
      (petTimeOfDay(now) === "night" && now - petLastInteraction > 60000);
    if (shouldSleep && !petAsleep) {
      petAsleep = true;
      petSpawnParticles("sleep");
      petRender();
      petSetStatus(t("petReactionSleep", { name: petState.name }));
      return true;
    }
    return false;
  }

  function petHandleVisibility() {
    if (document.hidden) {
      petStopTimer();
      petMiniStop();
      if (petState) {
        petApplyDecay(Date.now());
        petWriteState();
      }
      return;
    }
    if (petState) {
      petApplyDecay(Date.now());
      petRender();
    }
    petStartTimer();
  }

  function petPersistNow() {
    if (!petState) {
      return;
    }
    petApplyDecay(Date.now());
    petWriteState();
  }

  /* --- progression, visits, achievements --------------------------- */

  function petTouchVisit() {
    if (!petState) {
      return 0;
    }
    var today = petLocalDay(Date.now());
    if (!petState.lastDay) {
      petState.lastDay = today;
      petState.daysVisited = Math.max(1, petState.daysVisited);
      petState.streak = Math.max(1, petState.streak);
      return 0;
    }
    if (petState.lastDay === today) {
      return 0;
    }
    var yesterday = petLocalDay(Date.now() - 86400000);
    petState.streak = petState.lastDay === yesterday ? petState.streak + 1 : 1;
    petState.daysVisited += 1;
    petState.lastDay = today;
    return petAddTreats(2);
  }

  function petAddTreats(amount) {
    if (!petState) {
      return 0;
    }
    var before = petState.treats;
    petState.treats = petClamp(Math.floor(petState.treats + amount), 0, 9999);
    return petState.treats - before;
  }

  function petUnlockedCount() {
    var count = 0;
    if (!petState) {
      return 0;
    }
    petAchievementIds.forEach(function (id) {
      if (petState.achievements[id]) {
        count += 1;
      }
    });
    return count;
  }

  function petCheckAchievements() {
    var unlocked = [];
    if (!petState) {
      return unlocked;
    }
    var level = petLevelValue();
    var stage = petStageIndex(petStageValue(level));
    petAchievements.forEach(function (definition) {
      if (petState.achievements[definition.id]) {
        return;
      }
      var ok = false;
      if (definition.id === "firstPet") {
        ok = true;
      } else if (definition.id === "fed10") {
        ok = petState.totalFeeds >= 10;
      } else if (definition.id === "level5") {
        ok = level >= 5;
      } else if (definition.id === "level10") {
        ok = level >= 10;
      } else if (definition.id === "miniWin") {
        ok = petState.miniGamesFinished >= 1;
      } else if (definition.id === "trickster") {
        ok = petState.tricks.length >= 1;
      } else if (definition.id === "streak3") {
        ok = petState.streak >= 3;
      } else if (definition.id === "treats25") {
        ok = petState.treats >= 25;
      } else if (definition.id === "combo5") {
        ok = petState.bestCombo >= 5;
      } else if (definition.id === "evolved") {
        ok = stage >= 1;
      } else if (definition.id === "dressed") {
        ok = petState.accessory !== "none";
      }
      if (ok) {
        petState.achievements[definition.id] = Date.now();
        unlocked.push(definition.id);
      }
    });
    return unlocked;
  }

  function petCelebrateAchievement(id) {
    var definition = petAchievementById(id);
    if (!definition || !petState) {
      return;
    }
    if (petEls && petEls.toast) {
      petEls.toast.textContent = t("petAchievementUnlocked", {
        name: petState.name,
        title: t(definition.titleKey),
      });
      petEls.toast.hidden = false;
      if (petToastTimer !== null) {
        window.clearTimeout(petToastTimer);
      }
      petToastTimer = window.setTimeout(function () {
        petToastTimer = null;
        if (petEls && petEls.toast) {
          petEls.toast.hidden = true;
          petEls.toast.textContent = "";
        }
      }, petToastMs);
    }
    petSpawnParticles("achievement");
    petRenderBadges();
    petBlip("win");
  }

  /* --- petting combo ----------------------------------------------- */

  function petBumpCombo() {
    petCombo += 1;
    if (petState && petCombo > petState.bestCombo) {
      petState.bestCombo = petCombo;
    }
    if (petComboTimer !== null) {
      window.clearTimeout(petComboTimer);
    }
    petComboTimer = window.setTimeout(function () {
      petComboTimer = null;
      petCombo = 0;
      petRenderCombo();
    }, petComboWindowMs);
    petRenderCombo();
    if (petCombo % 3 === 0) {
      petAddTreats(1);
    }
    return petCombo;
  }

  function petRenderCombo() {
    if (!petEls || !petEls.combo) {
      return;
    }
    if (petCombo >= 2) {
      petEls.combo.textContent = t("petComboLabel", { n: petCombo });
      petEls.combo.hidden = false;
      return;
    }
    petEls.combo.hidden = true;
    petEls.combo.textContent = "";
  }

  /* --- idle / wake / wake-up awareness ----------------------------- */

  function petTouchInteraction() {
    petLastInteraction = Date.now();
    if (petAsleep) {
      petAsleep = false;
      petRender();
      petSetStatus(t("petReactionWoke", { name: petState ? petState.name : "" }));
    }
  }

  function petSleepNow() {
    if (!petState || petAsleep) {
      return;
    }
    petAsleep = true;
    petSpawnParticles("sleep");
    petRender();
  }

  /* --- optional WebAudio blips (off by default, no external files) -- */

  function petSoundEnabled() {
    return !!(petState && petState.sound === true);
  }

  function petBlip(kind) {
    if (!petSoundEnabled()) {
      return;
    }
    try {
      var Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) {
        return;
      }
      if (!petAudio) {
        petAudio = new Ctor();
      }
      if (petAudio.state === "suspended" && typeof petAudio.resume === "function") {
        petAudio.resume();
      }
      var at = petAudio.currentTime;
      var osc = petAudio.createOscillator();
      var gain = petAudio.createGain();
      var frequency = kind === "win" ? 880 : kind === "bad" ? 240 : 620;
      osc.type = "sine";
      osc.frequency.setValueAtTime(frequency, at);
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.05, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.18);
      osc.connect(gain);
      gain.connect(petAudio.destination);
      osc.start(at);
      osc.stop(at + 0.2);
    } catch (error) {
      /* audio is purely optional */
    }
  }

  /* --- mini-game lifecycle (timers only live while a game is open) -- */

  function petMiniTrack(callback, delay) {
    var id = window.setTimeout(function () {
      var index = petMiniTimers.indexOf(id);
      if (index !== -1) {
        petMiniTimers.splice(index, 1);
      }
      callback();
    }, delay);
    petMiniTimers.push(id);
    return id;
  }

  function petMiniClearTimers() {
    petMiniTimers.forEach(function (id) {
      window.clearTimeout(id);
    });
    petMiniTimers = [];
  }

  function petMiniStop() {
    petMiniClearTimers();
    petMini = null;
    if (petEls && petEls.gameHost) {
      while (petEls.gameHost.firstChild) {
        petEls.gameHost.removeChild(petEls.gameHost.firstChild);
      }
    }
    if (petEls && petEls.gameMenu) {
      petEls.gameMenu.hidden = false;
    }
    if (petEls && petEls.gameExit) {
      petEls.gameExit.hidden = true;
    }
  }

  function petMiniFinish(resultKey, vars, treats, xp) {
    if (!petState) {
      return;
    }
    /* Baseline at game start, so per-round grants are part of the total. */
    var treatsAtStart =
      petMini && typeof petMini.treatsAtStart === "number"
        ? petMini.treatsAtStart
        : petState.treats;
    petState.miniGamesFinished += 1;
    petAddTreats(treats);
    var gain = petAddXp(xp);
    petMiniClearTimers();
    petMini = null;
    petBlip("win");
    petCommit({ gain: gain, status: "" });
    /* Announce exactly the treats that reached the balance in this game, once.
     * Per-round grants and level-up bonuses are already counted here, so the
     * result line can never diverge from what the player actually received. */
    var granted = petState.treats - treatsAtStart;
    if (petEls && petEls.gameResult) {
      var merged = {};
      Object.keys(vars || {}).forEach(function (name) {
        merged[name] = vars[name];
      });
      merged.treats = granted;
      petEls.gameResult.textContent = t(resultKey, merged);
    }
  }

  /* --- pointer tracking + page awareness --------------------------- */

  function petBindAwareness() {
    if (petListenersBound) {
      return;
    }
    petListenersBound = true;
    document.addEventListener("pointermove", petOnPointerMove, { passive: true });
    document.addEventListener("input", petOnPageInput, true);
  }

  function petOnPointerMove(event) {
    if (!petState || !petEls || petEls.widget.hidden || isMotionOff()) {
      return;
    }
    var now = Date.now();
    if (now - petCursorAt < petCursorThrottleMs) {
      return;
    }
    petCursorAt = now;
    var centerX = 0;
    var centerY = 0;
    try {
      var rect = petEls.button.getBoundingClientRect();
      centerX = rect.left + rect.width / 2;
      centerY = rect.top + rect.height / 2;
    } catch (error) {
      return;
    }
    var lookX = petClamp((event.clientX - centerX) / 120, -1, 1) * 2.4;
    var lookY = petClamp((event.clientY - centerY) / 140, -1, 1) * 1.4;
    if (lookX === petLookX && lookY === petLookY) {
      return;
    }
    petLookX = lookX;
    petLookY = lookY;
    petEls.widget.style.setProperty("--pet-look-x", lookX.toFixed(2) + "px");
    petEls.widget.style.setProperty("--pet-look-y", lookY.toFixed(2) + "px");
  }

  function petOnPageInput(event) {
    if (!petState || !petEls || petEls.widget.hidden) {
      return;
    }
    var target = event && event.target;
    if (!target || !target.tagName) {
      return;
    }
    var tag = String(target.tagName).toUpperCase();
    if (tag !== "TEXTAREA" && tag !== "INPUT") {
      return;
    }
    if (petEls.widget.contains(target)) {
      return;
    }
    var now = Date.now();
    if (now - petTypingAt < petTypingCooldownMs) {
      return;
    }
    petTypingAt = now;
    petLastInteraction = now;
    if (petAsleep) {
      petAsleep = false;
      petRender();
    }
    petSetStatus(t("petReactionTyping"));
    petReact("cheer");
  }

  /* --- draggable widget (snaps to a persisted corner) -------------- */

  function petCornerFromPoint(x, y) {
    var right = x >= (window.innerWidth || 0) / 2;
    var bottom = y >= (window.innerHeight || 0) / 2;
    return (bottom ? "b" : "t") + (right ? "r" : "l");
  }

  function petApplyCorner(corner) {
    if (!petEls || !petEls.widget) {
      return;
    }
    var value = corner === undefined
      ? (petState ? petState.pos : "br")
      : corner;
    petEls.widget.setAttribute("data-corner", value);
  }

  function petOnDragStart(event) {
    if (!petState || (event && event.button > 0)) {
      return;
    }
    if (petMini) {
      return;
    }
    petDrag = {
      startX: event ? event.clientX : 0,
      startY: event ? event.clientY : 0,
      moved: false,
    };
    document.addEventListener("pointermove", petOnDragMove);
    document.addEventListener("pointerup", petOnDragEnd);
    document.addEventListener("pointercancel", petOnDragEnd);
  }

  function petOnDragMove(event) {
    if (!petDrag) {
      return;
    }
    var dx = event.clientX - petDrag.startX;
    var dy = event.clientY - petDrag.startY;
    if (!petDrag.moved && Math.abs(dx) + Math.abs(dy) < 6) {
      return;
    }
    petDrag.moved = true;
    if (petEls && petEls.widget) {
      petEls.widget.setAttribute("data-dragging", "true");
      petApplyCorner(petCornerFromPoint(event.clientX, event.clientY));
    }
    if (event && typeof event.preventDefault === "function") {
      event.preventDefault();
    }
  }

  function petOnDragEnd(event) {
    document.removeEventListener("pointermove", petOnDragMove);
    document.removeEventListener("pointerup", petOnDragEnd);
    document.removeEventListener("pointercancel", petOnDragEnd);
    if (!petDrag) {
      return;
    }
    var dragged = petDrag.moved;
    petDrag = null;
    if (petEls && petEls.widget) {
      petEls.widget.setAttribute("data-dragging", "false");
    }
    if (!petState || !dragged) {
      petApplyCorner();
      return;
    }
    petState.pos = petCornerFromPoint(
      event ? event.clientX : 0,
      event ? event.clientY : 0,
    );
    petWriteState();
    petLastInteraction = Date.now();
    petApplyCorner();
  }

  function petIsCorner(value) {
    return petCornerOrder.indexOf(value) !== -1;
  }

  function petCornerKey(corner) {
    if (corner === "bl") {
      return "petCornerBl";
    }
    if (corner === "tr") {
      return "petCornerTr";
    }
    if (corner === "tl") {
      return "petCornerTl";
    }
    return "petCornerBr";
  }

  function petMoveCorner(next) {
    if (!petState || !petIsCorner(next) || petState.pos === next) {
      return;
    }
    petState.pos = next;
    petWriteState();
    petTouchInteraction();
    petApplyCorner();
    petSetStatus(
      t("petReactionMoved", {
        name: petState.name,
        corner: t(petCornerKey(next)),
      }),
    );
  }

  function petOnHandleKeydown(event) {
    if (!event || !petState) {
      return;
    }
    var key = event.key;
    var corner = petIsCorner(petState.pos) ? petState.pos : "br";
    var row = corner.charAt(0);
    var column = corner.charAt(1);
    var next = null;
    if (key === "ArrowLeft") {
      next = row + "l";
    } else if (key === "ArrowRight") {
      next = row + "r";
    } else if (key === "ArrowUp") {
      next = "t" + column;
    } else if (key === "ArrowDown") {
      next = "b" + column;
    } else {
      return;
    }
    if (typeof event.preventDefault === "function") {
      event.preventDefault();
    }
    petMoveCorner(next);
  }

  /* --- artwork ----------------------------------------------------- */

  function petSvg(tag, attrs) {
    var node = document.createElementNS(petSvgNamespace, tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (name) {
        node.setAttribute(name, String(attrs[name]));
      });
    }
    return node;
  }

  function petAppendAll(parent, nodes) {
    nodes.forEach(function (node) {
      if (!node) {
        return;
      }
      if (Array.isArray(node)) {
        petAppendAll(parent, node);
        return;
      }
      parent.appendChild(node);
    });
    return parent;
  }

  function petEye(cx, cy) {
    return [
      petSvg("circle", { class: "pet-eye", cx: cx, cy: cy, r: 6.4 }),
      petSvg("circle", {
        class: "pet-eye-shine",
        cx: cx + 2.2,
        cy: cy - 2.2,
        r: 1.9,
      }),
    ];
  }

  function petCheek(cx, cy) {
    return petSvg("circle", { class: "pet-cheek", cx: cx, cy: cy, r: 4.4 });
  }

  function petMouthSet(cx, cy) {
    return [
      petSvg("path", {
        class: "pet-mouth pet-mouth-happy",
        d:
          "M" + (cx - 8) + " " + (cy - 2) + "c2.6 6.4 13.4 6.4 16 0",
      }),
      petSvg("path", {
        class: "pet-mouth pet-mouth-neutral",
        d: "M" + (cx - 6) + " " + cy + "h12",
      }),
      petSvg("ellipse", {
        class: "pet-mouth pet-mouth-hungry",
        cx: cx,
        cy: cy + 1,
        rx: 6.4,
        ry: 7.4,
      }),
      petSvg("path", {
        class: "pet-mouth pet-mouth-sleepy",
        d:
          "M" + (cx - 6) + " " + cy + "c2-3.2 4-3.2 6 0s4 3.2 6 0",
      }),
    ];
  }

  function petZzz(x, y) {
    var group = petSvg("g", { class: "pet-zzz" });
    return petAppendAll(group, [
      petSvg("path", { d: "M" + x + " " + y + "h9l-9 9h9" }),
      petSvg("path", {
        d: "M" + (x + 14) + " " + (y - 9) + "h6.5l-6.5 6.5h6.5",
      }),
    ]);
  }

  function petLook(nodes) {
    var group = petSvg("g", { class: "pet-look" });
    return petAppendAll(group, nodes);
  }

  /* All evolution stages are rendered; CSS reveals the active one. */
  function petStageParts() {
    return petStageOrder.map(function (stage) {
      var group = petSvg("g", {
        class: "pet-stage-part " + petStageClass[stage],
        "data-stage": stage,
      });
      if (stage === "baby") {
        petAppendAll(group, [
          petSvg("path", { d: "M50 20c-5-5-4-11 0-13 3 3 4 9 0 13z" }),
        ]);
      } else if (stage === "grown") {
        petAppendAll(group, [
          petSvg("path", { d: "M33 68c10 7 24 7 34 0" }),
        ]);
      } else {
        petAppendAll(group, [
          petSvg("circle", { cx: 50, cy: 52, r: 45 }),
          petSvg("path", { d: "M38 22l-4-12 8 6z" }),
          petSvg("path", { d: "M62 22l4-12-8 6z" }),
        ]);
      }
      return group;
    });
  }

  /* All accessories are rendered; CSS reveals the equipped one. */
  function petAccessoryParts() {
    return petAccessoryOrder.map(function (accessory) {
      if (accessory === "none") {
        return null;
      }
      var group = petSvg("g", {
        class: "pet-acc " + petAccessoryClass[accessory],
        "data-acc": accessory,
      });
      if (accessory === "hat") {
        petAppendAll(group, [
          petSvg("path", { d: "M50 2l14 14H36z" }),
          petSvg("path", { d: "M33 16h34" }),
        ]);
      } else if (accessory === "scarf") {
        petAppendAll(group, [
          petSvg("path", { d: "M31 68c12 8 26 8 38 0" }),
          petSvg("path", { d: "M62 72l4 10-8-3z" }),
        ]);
      } else if (accessory === "glasses") {
        petAppendAll(group, [
          petSvg("circle", { cx: 41, cy: 50, r: 9 }),
          petSvg("circle", { cx: 59, cy: 50, r: 9 }),
          petSvg("path", { d: "M50 50h0" }),
        ]);
      } else if (accessory === "crown") {
        petAppendAll(group, [
          petSvg("path", { d: "M34 18l6-10 5 7 5-10 5 10 5-7 6 10z" }),
        ]);
      } else {
        petAppendAll(group, [
          petSvg("circle", { cx: 50, cy: 50, r: 40 }),
        ]);
      }
      return group;
    });
  }

  function petCreateArt(species, className) {
    var svg = petSvg("svg", {
      viewBox: "0 0 100 100",
      class: className || "pet-svg",
      "aria-hidden": "true",
      focusable: "false",
      "data-species": species,
    });

    if (species === "quillop") {
      petAppendAll(svg, [
        petSvg("path", {
          class: "pet-accent pet-drop",
          d: "M50 4c3.4 4.6 5.4 7.2 5.4 10.2a5.4 5.4 0 0 1-10.8 0c0-3 2-5.6 5.4-10.2z",
        }),
        petSvg("path", {
          class: "pet-limb",
          d: "M27 58c-6 1-10 5-11 9 5.2 1 10.4-1 13.4-4.2",
        }),
        petSvg("path", {
          class: "pet-limb",
          d: "M73 58c6 1 10 5 11 9-5.2 1-10.4-1-13.4-4.2",
        }),
        petSvg("path", {
          class: "pet-body",
          d: "M50 14c15 17.4 23.5 28.6 23.5 40.2a23.5 23.5 0 0 1-47 0C26.5 42.6 35 31.4 50 14z",
        }),
        petSvg("path", { class: "pet-seam", d: "M50 42v28" }),
        petSvg("circle", {
          class: "pet-accent pet-breather",
          cx: 50,
          cy: 72,
          r: 3.4,
        }),
        petLook([petEye(42, 50), petEye(58, 50)]),
        petCheek(30, 61),
        petCheek(70, 61),
        petMouthSet(50, 62),
        petStageParts(),
        petAccessoryParts(),
        petZzz(70, 22),
      ]);
      return svg;
    }

    if (species === "tagling") {
      petAppendAll(svg, [
        petSvg("path", {
          class: "pet-body",
          d: "M30 18h30l20 20v32a12 12 0 0 1-12 12H30a12 12 0 0 1-12-12V30a12 12 0 0 1 12-12z",
        }),
        petSvg("circle", { class: "pet-hole", cx: 30, cy: 33, r: 5 }),
        petSvg("path", { class: "pet-limb", d: "M38 62l-6 5.5 6 5.5" }),
        petSvg("path", { class: "pet-limb", d: "M64 62l6 5.5-6 5.5" }),
        petSvg("rect", {
          class: "pet-foot",
          x: 36,
          y: 78,
          width: 10,
          height: 11,
          rx: 5,
        }),
        petSvg("rect", {
          class: "pet-foot",
          x: 54,
          y: 78,
          width: 10,
          height: 11,
          rx: 5,
        }),
        petLook([petEye(44, 44), petEye(60, 44)]),
        petCheek(33, 55),
        petCheek(71, 55),
        petMouthSet(52, 56),
        petStageParts(),
        petAccessoryParts(),
        petZzz(74, 16),
      ]);
      return svg;
    }

    petAppendAll(svg, [
      petSvg("path", { class: "pet-limb", d: "M50 30V17" }),
      petSvg("circle", {
        class: "pet-accent pet-antenna",
        cx: 50,
        cy: 13,
        r: 4.4,
      }),
      petSvg("path", {
        class: "pet-limb",
        d: "M28 42c-8 0-4 8-12 8 8 0 4 8 12 8",
      }),
      petSvg("path", {
        class: "pet-limb",
        d: "M72 42c8 0 4 8 12 8-8 0-4 8-12 8",
      }),
      petSvg("rect", {
        class: "pet-body",
        x: 22,
        y: 28,
        width: 56,
        height: 54,
        rx: 24,
      }),
      petSvg("rect", {
        class: "pet-foot",
        x: 34,
        y: 74,
        width: 11,
        height: 12,
        rx: 5.5,
      }),
      petSvg("rect", {
        class: "pet-foot",
        x: 55,
        y: 74,
        width: 11,
        height: 12,
        rx: 5.5,
      }),
      petLook([petEye(41, 50), petEye(59, 50)]),
      petCheek(31, 61),
      petCheek(69, 61),
      petMouthSet(50, 63),
      petStageParts(),
      petAccessoryParts(),
      petZzz(74, 20),
    ]);
    return svg;
  }

  function petIcon(pathData) {
    var svg = petSvg("svg", {
      viewBox: "0 0 24 24",
      class: "pet-icon",
      "aria-hidden": "true",
      focusable: "false",
    });
    svg.appendChild(petSvg("path", { d: pathData }));
    return svg;
  }

  /* --- markup ------------------------------------------------------ */

  function petCreate(tag, className) {
    var node = document.createElement(tag);
    if (className) {
      node.className = className;
    }
    return node;
  }

  function petCreateStat(key, labelKey) {
    var row = petCreate("div", "pet-stat");
    var label = petCreate("span", "pet-stat-label");
    label.setAttribute("data-i18n", labelKey);
    var bar = petCreate("span", "pet-bar");
    var fill = petCreate("i", "pet-bar-fill");
    fill.setAttribute("id", "petBar" + key.charAt(0).toUpperCase() + key.slice(1));
    bar.appendChild(fill);
    var value = petCreate("span", "pet-stat-value");
    value.setAttribute("id", "petStatValue" + key.charAt(0).toUpperCase() + key.slice(1));
    return { row: row, fill: fill, value: value, label: label, bar: bar };
  }

  function petAddI18nText(parent, key, tag, className) {
    var node = petCreate(tag || "span", className);
    node.setAttribute("data-i18n", key);
    parent.appendChild(node);
    return node;
  }

  function petCreateSubview(id, titleKey, backId) {
    var view = petCreate("div", "pet-subview");
    view.setAttribute("id", id);
    view.hidden = true;
    var bar = petCreate("div", "pet-sub-head");
    petAddI18nText(bar, titleKey, "span", "pet-sub-title");
    var back = petCreate("button", "pet-action pet-back");
    back.type = "button";
    back.setAttribute("id", backId);
    back.setAttribute("data-i18n", "petBtnBack");
    back.setAttribute("data-view", "main");
    bar.appendChild(back);
    view.appendChild(bar);
    return { view: view, back: back };
  }

  function petBuildDom() {
    var widget = petCreate("div", "pet-widget");
    widget.setAttribute("id", "petWidget");
    widget.setAttribute("role", "region");
    widget.setAttribute("aria-label", t("petTitle"));
    widget.setAttribute("data-species", petSpeciesOrder[0]);
    widget.setAttribute("data-mood", "neutral");
    widget.hidden = true;

    /* companion card */
    var panel = petCreate("div", "pet-panel");
    panel.setAttribute("id", "petPanel");

    var head = petCreate("div", "pet-head pet-handle");
    head.setAttribute("id", "petHead");
    head.setAttribute("tabindex", "0");
    head.setAttribute("aria-label", t("petMoveHandle"));
    head.setAttribute("title", t("petMoveHandle"));
    petAddI18nText(head, "petTitle", "span", "pet-title");
    var collapseBtn = petCreate("button", "pet-icon-btn");
    collapseBtn.type = "button";
    collapseBtn.setAttribute("id", "petCollapseBtn");
    collapseBtn.setAttribute("aria-expanded", "true");
    collapseBtn.setAttribute("aria-label", t("petBtnCollapse"));
    collapseBtn.appendChild(petIcon("M6 9l6 6 6-6"));
    head.appendChild(collapseBtn);
    panel.appendChild(head);

    var stage = petCreate("div", "pet-stage");
    var button = petCreate("button", "pet-button");
    button.type = "button";
    button.setAttribute("id", "petButton");
    var art = petCreate("span", "pet-art");
    art.setAttribute("id", "petArt");
    button.appendChild(art);
    var fx = petCreate("div", "pet-fx");
    fx.setAttribute("id", "petFx");
    fx.setAttribute("aria-hidden", "true");
    stage.appendChild(button);
    stage.appendChild(fx);
    panel.appendChild(stage);

    var bodyPanel = petCreate("div", "pet-body-panel");
    var status = petCreate("p", "pet-status");
    status.setAttribute("id", "petStatus");
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    bodyPanel.appendChild(status);

    var combo = petCreate("span", "pet-combo");
    combo.setAttribute("id", "petCombo");
    combo.setAttribute("role", "status");
    combo.setAttribute("aria-live", "polite");
    combo.hidden = true;
    bodyPanel.appendChild(combo);

    var stats = petCreate("div", "pet-stats");
    stats.setAttribute("role", "group");
    stats.setAttribute("aria-label", t("petStatsLabel"));
    var statDefs = [
      ["happiness", "petStatHappiness"],
      ["hunger", "petStatHunger"],
      ["energy", "petStatEnergy"],
    ];
    var bars = {};
    var statValues = {};
    statDefs.forEach(function (definition) {
      var stat = petCreateStat(definition[0], definition[1]);
      bars[definition[0]] = stat.fill;
      statValues[definition[0]] = stat.value;
      stat.row.appendChild(stat.label);
      stat.row.appendChild(stat.bar);
      stat.row.appendChild(stat.value);
      stats.appendChild(stat.row);
    });
    bodyPanel.appendChild(stats);

    var levelRow = petCreate("div", "pet-level");
    var levelText = petCreate("span", "pet-level-text");
    levelText.setAttribute("id", "petLevelText");
    var xpBar = petCreate("span", "pet-xp-bar");
    var xpFill = petCreate("i", "pet-xp-fill");
    xpFill.setAttribute("id", "petXpFill");
    xpBar.appendChild(xpFill);
    var xpText = petCreate("span", "pet-xp-text");
    xpText.setAttribute("id", "petXpText");
    levelRow.appendChild(levelText);
    levelRow.appendChild(xpBar);
    levelRow.appendChild(xpText);
    bodyPanel.appendChild(levelRow);

    var treatsRow = petCreate("div", "pet-treats");
    var treatsChip = petCreate("span", "pet-treat-chip");
    treatsChip.setAttribute("aria-hidden", "true");
    treatsChip.appendChild(petIcon("M6 8h12l-1 11H7zM9 8V6a3 3 0 0 1 6 0v2"));
    var treatsValue = petCreate("span", "pet-treat-value");
    treatsValue.setAttribute("id", "petTreatValue");
    var treatsLabel = petCreate("span", "pet-treat-label");
    treatsLabel.setAttribute("data-i18n", "petTreatsLabel");
    treatsRow.appendChild(treatsChip);
    treatsRow.appendChild(treatsValue);
    treatsRow.appendChild(treatsLabel);
    bodyPanel.appendChild(treatsRow);

    var actions = petCreate("div", "pet-actions");
    actions.setAttribute("role", "group");
    actions.setAttribute("aria-label", t("petControlsLabel"));
    var actionDefs = [
      ["Feed", "petFeedBtn", "petBtnFeed"],
      ["Play", "petPlayBtn", "petBtnPlay"],
      ["Rest", "petRestBtn", "petBtnRest"],
      ["Treat", "petTreatBtn", "petBtnTreat"],
      ["Brush", "petBrushBtn", "petBtnBrush"],
      ["Talk", "petTalkBtn", "petBtnTalk"],
      ["Tricks", "petTricksBtn", "petBtnTricks"],
      ["Games", "petGamesBtn", "petBtnGames"],
      ["Stats", "petStatsBtn", "petBtnStats"],
      ["Rename", "petRenameBtn", "petBtnRename"],
      ["Species", "petSpeciesBtn", "petBtnSpecies"],
      ["Sound", "petSoundBtn", "petBtnSound"],
      ["Reset", "petResetBtn", "petBtnReset"],
      ["Hide", "petHideBtn", "petBtnHide"],
    ];
    var actionButtons = {};
    actionDefs.forEach(function (definition) {
      var action = petCreate("button", "pet-action");
      action.type = "button";
      action.setAttribute("id", definition[1]);
      action.setAttribute("data-i18n", definition[2]);
      actions.appendChild(action);
      actionButtons[definition[0]] = action;
    });
    bodyPanel.appendChild(actions);

    var renameForm = petCreate("form", "pet-rename");
    renameForm.setAttribute("id", "petRenameForm");
    renameForm.hidden = true;
    var renameInput = petCreate("input", "pet-name-input");
    renameInput.type = "text";
    renameInput.setAttribute("id", "petRenameInput");
    renameInput.setAttribute("maxlength", String(petNameMax));
    renameInput.setAttribute("data-i18n-placeholder", "petRenamePlaceholder");
    renameInput.setAttribute("aria-label", t("petNameLabel"));
    var renameActions = petCreate("div", "pet-rename-actions");
    var renameSave = petCreate("button", "pet-action is-primary");
    renameSave.type = "submit";
    renameSave.setAttribute("id", "petRenameSave");
    renameSave.setAttribute("data-i18n", "petBtnRenameConfirm");
    var renameCancel = petCreate("button", "pet-action");
    renameCancel.type = "button";
    renameCancel.setAttribute("id", "petRenameCancel");
    renameCancel.setAttribute("data-i18n", "petBtnRenameCancel");
    renameActions.appendChild(renameSave);
    renameActions.appendChild(renameCancel);
    renameForm.appendChild(renameInput);
    renameForm.appendChild(renameActions);
    bodyPanel.appendChild(renameForm);

    /* stats view */
    var statsView = petCreateSubview("petStatsView", "petStatsTitle", "petBackStats");
    var statsFields = petCreate("div", "pet-fields");
    var fieldDefs = [
      ["petStatLevel", "petStatLevelValue"],
      ["petStatStage", "petStatStageValue"],
      ["petStatXp", "petStatXpValue"],
      ["petStatTreats", "petStatTreatsValue"],
      ["petStatDays", "petStatDaysValue"],
      ["petStatStreak", "petStatStreakValue"],
      ["petStatTricks", "petStatTricksValue"],
      ["petStatCombo", "petStatComboValue"],
    ];
    var fieldValues = {};
    fieldDefs.forEach(function (definition) {
      var field = petCreate("div", "pet-field");
      var label = petCreate("span", "pet-field-label");
      label.setAttribute("data-i18n", definition[0]);
      var value = petCreate("span", "pet-field-value");
      value.setAttribute("id", definition[1]);
      field.appendChild(label);
      field.appendChild(value);
      statsFields.appendChild(field);
      fieldValues[definition[1]] = value;
    });
    statsView.view.appendChild(statsFields);

    var achHead = petCreate("div", "pet-sub-head");
    petAddI18nText(achHead, "petStatAchievements", "span", "pet-sub-title");
    var achCount = petCreate("span", "pet-field-value");
    achCount.setAttribute("id", "petAchievementsCount");
    achHead.appendChild(achCount);
    statsView.view.appendChild(achHead);
    var badges = petCreate("div", "pet-badges");
    badges.setAttribute("id", "petBadges");
    badges.setAttribute("role", "list");
    statsView.view.appendChild(badges);

    var accHead = petCreate("div", "pet-sub-head");
    petAddI18nText(accHead, "petAccLabel", "span", "pet-sub-title");
    statsView.view.appendChild(accHead);
    var accGrid = petCreate("div", "pet-acc-grid");
    accGrid.setAttribute("id", "petAccGrid");
    accGrid.setAttribute("role", "group");
    accGrid.setAttribute("aria-label", t("petAccLabel"));
    statsView.view.appendChild(accGrid);

    var hueHead = petCreate("div", "pet-sub-head");
    petAddI18nText(hueHead, "petHueLabel", "span", "pet-sub-title");
    statsView.view.appendChild(hueHead);
    var hueGrid = petCreate("div", "pet-acc-grid");
    hueGrid.setAttribute("id", "petHueGrid");
    hueGrid.setAttribute("role", "group");
    hueGrid.setAttribute("aria-label", t("petHueLabel"));
    statsView.view.appendChild(hueGrid);
    bodyPanel.appendChild(statsView.view);

    /* tricks view */
    var tricksView = petCreateSubview("petTricksView", "petBtnTricks", "petBackTricks");
    var trickTeach = petCreate("button", "pet-action is-primary");
    trickTeach.type = "button";
    trickTeach.setAttribute("id", "petTrickTeachBtn");
    tricksView.view.appendChild(trickTeach);
    var trickList = petCreate("div", "pet-trick-list");
    trickList.setAttribute("id", "petTrickList");
    trickList.setAttribute("role", "group");
    trickList.setAttribute("aria-label", t("petBtnTricks"));
    tricksView.view.appendChild(trickList);
    bodyPanel.appendChild(tricksView.view);

    /* games view */
    var gamesView = petCreateSubview("petGamesView", "petGamesTitle", "petBackGames");
    var gameMenu = petCreate("div", "pet-game-menu");
    gameMenu.setAttribute("id", "petGameMenu");
    var tossStart = petCreate("button", "pet-action pet-game-choice");
    tossStart.type = "button";
    tossStart.setAttribute("id", "petGameTossStart");
    tossStart.setAttribute("data-i18n", "petGameTreatToss");
    var simonStart = petCreate("button", "pet-action pet-game-choice");
    simonStart.type = "button";
    simonStart.setAttribute("id", "petGameSimonStart");
    simonStart.setAttribute("data-i18n", "petGameTrickTrainer");
    gameMenu.appendChild(tossStart);
    gameMenu.appendChild(simonStart);
    gamesView.view.appendChild(gameMenu);
    var gameHost = petCreate("div", "pet-game-host");
    gameHost.setAttribute("id", "petGameHost");
    gamesView.view.appendChild(gameHost);
    var gameResult = petCreate("p", "pet-game-result");
    gameResult.setAttribute("id", "petGameResult");
    gameResult.setAttribute("role", "status");
    gameResult.setAttribute("aria-live", "polite");
    gamesView.view.appendChild(gameResult);
    var gameExit = petCreate("button", "pet-action");
    gameExit.type = "button";
    gameExit.setAttribute("id", "petGameExitBtn");
    gameExit.setAttribute("data-i18n", "petGameExit");
    gameExit.hidden = true;
    gamesView.view.appendChild(gameExit);
    bodyPanel.appendChild(gamesView.view);

    panel.appendChild(bodyPanel);
    widget.appendChild(panel);

    var toast = petCreate("p", "pet-toast");
    toast.setAttribute("id", "petToast");
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    toast.hidden = true;
    widget.appendChild(toast);

    /* adoption card */
    var adoptForm = petCreate("form", "pet-adopt");
    adoptForm.setAttribute("id", "petAdoptForm");
    adoptForm.setAttribute("role", "dialog");
    adoptForm.setAttribute("aria-labelledby", "petAdoptHeading");
    adoptForm.hidden = true;
    var adoptHeading = petAddI18nText(
      adoptForm,
      "petAdoptTitle",
      "h2",
      "pet-adopt-heading",
    );
    adoptHeading.setAttribute("id", "petAdoptHeading");
    petAddI18nText(adoptForm, "petAdoptBody", "p", "pet-adopt-body");

    var speciesGroup = petCreate("div", "pet-species");
    speciesGroup.setAttribute("id", "petSpeciesGroup");
    speciesGroup.setAttribute("role", "radiogroup");
    speciesGroup.setAttribute("aria-label", t("petSpeciesLabel"));
    var speciesInputs = [];
    petSpeciesOrder.forEach(function (species) {
      var option = petCreate("label", "pet-species-option");
      option.setAttribute("for", "petSpeciesInput-" + species);
      option.setAttribute("data-species", species);
      var input = petCreate("input", "pet-species-input");
      input.type = "radio";
      input.setAttribute("name", "petSpecies");
      input.setAttribute("id", "petSpeciesInput-" + species);
      input.value = species;
      var frame = petCreate("span", "pet-species-frame");
      frame.setAttribute("aria-hidden", "true");
      var name = petCreate("span", "pet-species-name");
      name.textContent = t(petSpeciesKey(species));
      var desc = petCreate("span", "pet-species-desc");
      desc.textContent = t(petSpeciesKey(species) + "Desc");
      petAppendAll(option, [
        input,
        frame,
        petCreateArt(species, "pet-svg pet-svg-mini"),
        name,
        desc,
      ]);
      speciesGroup.appendChild(option);
      speciesInputs.push(input);
    });
    adoptForm.appendChild(speciesGroup);

    var nameLabel = petCreate("label", "pet-name-label");
    nameLabel.setAttribute("for", "petAdoptName");
    nameLabel.setAttribute("data-i18n", "petNameLabel");
    adoptForm.appendChild(nameLabel);
    var adoptName = petCreate("input", "pet-name-input");
    adoptName.type = "text";
    adoptName.setAttribute("id", "petAdoptName");
    adoptName.setAttribute("maxlength", String(petNameMax));
    adoptName.setAttribute("data-i18n-placeholder", "petNamePlaceholder");
    adoptForm.appendChild(adoptName);

    var adoptActions = petCreate("div", "pet-adopt-actions");
    var adoptConfirm = petCreate("button", "pet-action is-primary");
    adoptConfirm.type = "submit";
    adoptConfirm.setAttribute("id", "petAdoptConfirm");
    adoptConfirm.setAttribute("data-i18n", "petAdoptConfirm");
    var adoptLater = petCreate("button", "pet-action");
    adoptLater.type = "button";
    adoptLater.setAttribute("id", "petAdoptLater");
    adoptLater.setAttribute("data-i18n", "petAdoptLater");
    adoptActions.appendChild(adoptConfirm);
    adoptActions.appendChild(adoptLater);
    adoptForm.appendChild(adoptActions);

    var adoptStatus = petCreate("p", "pet-status");
    adoptStatus.setAttribute("id", "petAdoptStatus");
    adoptStatus.setAttribute("role", "status");
    adoptStatus.setAttribute("aria-live", "polite");
    adoptForm.appendChild(adoptStatus);
    widget.appendChild(adoptForm);

    /* restore pill */
    var restore = petCreate("button", "pet-restore");
    restore.type = "button";
    restore.setAttribute("id", "petRestoreBtn");
    restore.hidden = true;
    restore.appendChild(petIcon("M12 3l2.4 5.6L20 11l-5.6 2.4L12 19l-2.4-5.6L4 11l5.6-2.4z"));
    var restoreLabel = petCreate("span", "pet-restore-label");
    restoreLabel.setAttribute("id", "petRestoreLabel");
    restore.appendChild(restoreLabel);
    widget.appendChild(restore);

    document.body.appendChild(widget);

    petEls = {
      widget: widget,
      panel: panel,
      collapse: collapseBtn,
      button: button,
      art: art,
      fx: fx,
      status: status,
      stats: stats,
      bars: bars,
      statValues: statValues,
      level: levelText,
      xpFill: xpFill,
      xpText: xpText,
      actions: actionButtons,
      renameForm: renameForm,
      renameInput: renameInput,
      renameCancel: renameCancel,
      adoptForm: adoptForm,
      adoptName: adoptName,
      adoptStatus: adoptStatus,
      adoptLater: adoptLater,
      speciesGroup: speciesGroup,
      speciesInputs: speciesInputs,
      restore: restore,
      restoreLabel: restoreLabel,
      head: head,
      combo: combo,
      treatsValue: treatsValue,
      treatsLabel: treatsLabel,
      treatsRow: treatsRow,
      actionsNode: actions,
      statsView: statsView,
      fieldValues: fieldValues,
      badges: badges,
      achCount: achCount,
      accGrid: accGrid,
      hueGrid: hueGrid,
      tricksView: tricksView,
      trickTeach: trickTeach,
      trickList: trickList,
      gamesView: gamesView,
      gameMenu: gameMenu,
      gameHost: gameHost,
      gameResult: gameResult,
      gameExit: gameExit,
      tossStart: tossStart,
      simonStart: simonStart,
      toast: toast,
    };
    petWireEvents();
  }

  function petWireEvents() {
    petEls.button.addEventListener("click", petOnPetClick);
    petEls.collapse.addEventListener("click", function () {
      petCollapsed = !petCollapsed;
      if (petCollapsed && petMini) {
        petMiniStop();
        petSetView("main");
      }
      petSyncVisibility();
    });

    petEls.actions.Feed.addEventListener("click", petOnFeed);
    petEls.actions.Play.addEventListener("click", petOnPlay);
    petEls.actions.Rest.addEventListener("click", petOnRest);
    petEls.actions.Treat.addEventListener("click", petOnTreat);
    petEls.actions.Brush.addEventListener("click", petOnBrush);
    petEls.actions.Talk.addEventListener("click", petOnTalk);
    petEls.actions.Tricks.addEventListener("click", function () {
      petSetView(petView === "tricks" ? "main" : "tricks");
    });
    petEls.actions.Games.addEventListener("click", function () {
      petSetView(petView === "games" ? "main" : "games");
    });
    petEls.actions.Stats.addEventListener("click", function () {
      petSetView(petView === "stats" ? "main" : "stats");
    });
    petEls.actions.Rename.addEventListener("click", function () {
      petToggleRename(!petRenameOpen);
    });
    petEls.actions.Species.addEventListener("click", petOnSwitchSpecies);
    petEls.actions.Sound.addEventListener("click", petOnToggleSound);
    petEls.actions.Reset.addEventListener("click", petOnResetClick);
    petEls.actions.Hide.addEventListener("click", petOnHide);

    petEls.head.addEventListener("pointerdown", petOnDragStart);
    petEls.head.addEventListener("keydown", petOnHandleKeydown);
    petEls.statsView.back.addEventListener("click", function () {
      petSetView("main");
    });
    petEls.tricksView.back.addEventListener("click", function () {
      petSetView("main");
    });
    petEls.gamesView.back.addEventListener("click", function () {
      petSetView("main");
    });
    petEls.trickTeach.addEventListener("click", petOnTeachTrick);
    petEls.tossStart.addEventListener("click", petStartToss);
    petEls.simonStart.addEventListener("click", petStartSimon);
    petEls.gameExit.addEventListener("click", function () {
      petMiniStop();
      petSetView("games");
      petEls.tossStart.focus();
    });
    petEls.widget.addEventListener("keydown", petOnKeydown);

    petEls.renameForm.addEventListener("submit", function (event) {
      if (event && typeof event.preventDefault === "function") {
        event.preventDefault();
      }
      petOnRenameSubmit();
    });
    petEls.renameCancel.addEventListener("click", function () {
      petToggleRename(false);
      petEls.button.focus();
    });

    petEls.adoptForm.addEventListener("submit", function (event) {
      if (event && typeof event.preventDefault === "function") {
        event.preventDefault();
      }
      petOnAdoptConfirm();
    });
    petEls.adoptLater.addEventListener("click", function () {
      petAdoptionDismissed = true;
      petSyncVisibility();
    });

    petEls.speciesInputs.forEach(function (input) {
      input.addEventListener("change", function () {
        if (input.checked) {
          petSelectedSpecies = input.value;
        }
      });
    });

    petEls.restore.addEventListener("click", function () {
      if (petState) {
        petState.hidden = false;
        petAdoptionDismissed = false;
        petWriteState();
        petRender();
        petSyncVisibility();
        petEls.button.focus();
        return;
      }
      petAdoptionDismissed = false;
      petSyncVisibility();
      petEls.adoptName.focus();
    });

    document.addEventListener("visibilitychange", petHandleVisibility);
    window.addEventListener("pagehide", petPersistNow);
  }

  /* --- rendering --------------------------------------------------- */

  function petRenderStatus() {
    if (!petEls) {
      return;
    }
    var text = petStatusText;
    if (!text && petState) {
      text = t(petMoodStatusKey(petMood()), { name: petState.name });
    }
    petEls.status.textContent = text || "";
    petEls.adoptStatus.textContent = petStatusText || "";
  }

  function petSetStatus(text) {
    if (!petEls) {
      return;
    }
    petStatusText = text || "";
    if (petStatusTimer !== null) {
      window.clearTimeout(petStatusTimer);
      petStatusTimer = null;
    }
    if (petStatusText) {
      petStatusTimer = window.setTimeout(function () {
        petStatusTimer = null;
        petStatusText = "";
        petRenderStatus();
      }, petStatusRevertMs);
    }
    petRenderStatus();
  }

  function petSyncArt() {
    if (!petEls || !petState || petRenderedSpecies === petState.species) {
      return;
    }
    petRenderedSpecies = petState.species;
    while (petEls.art.firstChild) {
      petEls.art.removeChild(petEls.art.firstChild);
    }
    petEls.art.appendChild(petCreateArt(petState.species, "pet-svg pet-idle"));
  }

  function petRender() {
    if (!petEls) {
      return;
    }
    if (!petState) {
      petRenderStatus();
      return;
    }
    var mood = petMood();
    petEls.widget.setAttribute("data-mood", mood);
    petEls.widget.setAttribute("data-species", petState.species);
    petSyncArt();

    var statKeys = ["happiness", "hunger", "energy"];
    statKeys.forEach(function (key) {
      var rounded = Math.round(petState[key]);
      petEls.bars[key].style.width = rounded + "%";
      petEls.bars[key].setAttribute("data-value", String(rounded));
      petEls.statValues[key].textContent = String(rounded);
    });

    var level = petLevelValue();
    var progress = petLevelProgress();
    petEls.level.textContent = t("petLevel", { n: level });
    petEls.xpText.textContent = t("petXp", { n: petState.xp });
    petEls.xpFill.style.width = progress.percent + "%";
    petEls.widget.setAttribute("data-stage", petStageValue(level));
    petEls.widget.setAttribute("data-acc", petState.accessory);
    petEls.widget.setAttribute("data-hue", petState.hue);
    petEls.widget.setAttribute("data-asleep", petAsleep ? "true" : "false");
    petEls.widget.setAttribute("data-night", petTimeOfDay() === "night" ? "true" : "false");
    petEls.treatsValue.textContent = String(petState.treats);
    petEls.treatsLabel.textContent = t("petTreatsLabel");
    petEls.treatsValue.setAttribute(
      "aria-label",
      t("petTreatsLabel") + " " + petState.treats,
    );
    petRenderCombo();
    petRenderSubviewData();
    petEls.button.setAttribute(
      "aria-label",
      t("petButtonAria", {
        name: petState.name,
        mood: t(petMoodKey(mood)),
      }),
    );
    petEls.button.setAttribute("title", t("petTapHint", { name: petState.name }));
    petEls.renameInput.setAttribute("aria-label", t("petNameLabel"));
    petRenderStatus();
  }

  function petRenderSubviewData() {
    if (!petEls || !petState) {
      return;
    }
    var level = petLevelValue();
    var stage = petStageValue(level);
    var values = petEls.fieldValues;
    values.petStatLevelValue.textContent = String(level);
    values.petStatStageValue.textContent = t(petStageKey(stage));
    values.petStatXpValue.textContent = String(petState.xp);
    values.petStatTreatsValue.textContent = String(petState.treats);
    values.petStatDaysValue.textContent = String(petState.daysVisited);
    values.petStatStreakValue.textContent = String(petState.streak);
    values.petStatTricksValue.textContent = String(petState.tricks.length);
    values.petStatComboValue.textContent = String(petState.bestCombo);
    petEls.achCount.textContent = t("petAchievementsCount", {
      n: petUnlockedCount(),
      total: petAchievements.length,
    });
    petRenderBadges();
    petRenderAccessories();
    petRenderTricks();
  }

  function petCreateBadgeElement(definition) {
    var unlocked = !!petState.achievements[definition.id];
    var badge = petCreate("span", "pet-badge" + (unlocked ? "" : " is-locked"));
    badge.setAttribute("role", "listitem");
    var icon = petSvg("svg", {
      viewBox: "0 0 24 24",
      class: "pet-badge-icon",
      "aria-hidden": "true",
      focusable: "false",
    });
    icon.appendChild(petSvg("path", { d: definition.icon }));
    var label = petCreate("span", "pet-badge-label");
    label.textContent = t(definition.titleKey);
    badge.setAttribute("title", t(definition.titleKey) + " - " + t(definition.descKey));
    badge.setAttribute("aria-label", t(definition.titleKey) + (unlocked ? "" : " " + t(definition.descKey)));
    badge.appendChild(icon);
    badge.appendChild(label);
    return badge;
  }

  function petRenderBadges() {
    if (!petEls || !petEls.badges || !petState) {
      return;
    }
    var host = petEls.badges;
    while (host.firstChild) {
      host.removeChild(host.firstChild);
    }
    petAchievements.forEach(function (definition) {
      host.appendChild(petCreateBadgeElement(definition));
    });
  }

  function petRenderAccessories() {
    if (!petEls || !petState) {
      return;
    }
    var level = petLevelValue();
    var accGrid = petEls.accGrid;
    while (accGrid.firstChild) {
      accGrid.removeChild(accGrid.firstChild);
    }
    petAccessoryOrder.forEach(function (accessory) {
      var unlocked = petAccessoryUnlocked(accessory, level);
      var option = petCreate("button", "pet-acc-option");
      option.type = "button";
      option.setAttribute("data-acc", accessory);
      option.setAttribute("aria-pressed", petState.accessory === accessory ? "true" : "false");
      if (petState.accessory === accessory) {
        option.classList.add("is-selected");
      }
      var label = t(petAccessoryKey(accessory));
      option.textContent = unlocked ? label : label + " " + t("petLockedAtLevel", { n: petAccessoryLevel[accessory] });
      option.disabled = !unlocked;
      option.addEventListener("click", function () {
        petSelectAccessory(accessory);
      });
      accGrid.appendChild(option);
    });

    var hueGrid = petEls.hueGrid;
    while (hueGrid.firstChild) {
      hueGrid.removeChild(hueGrid.firstChild);
    }
    petHueOrder.forEach(function (hue) {
      var unlocked = petHueUnlocked(hue, level);
      var option = petCreate("button", "pet-acc-option");
      option.type = "button";
      option.setAttribute("data-hue", hue);
      option.setAttribute("aria-pressed", petState.hue === hue ? "true" : "false");
      if (petState.hue === hue) {
        option.classList.add("is-selected");
      }
      var label = t(petHueKey(hue));
      option.textContent = unlocked ? label : label + " " + t("petLockedAtLevel", { n: petHueLevel[hue] });
      option.disabled = !unlocked;
      option.addEventListener("click", function () {
        petSelectHue(hue);
      });
      hueGrid.appendChild(option);
    });
  }

  function petRenderTricks() {
    if (!petEls || !petState) {
      return;
    }
    var level = petLevelValue();
    var next = petNextTrick();
    if (!next) {
      petEls.trickTeach.hidden = true;
    } else {
      petEls.trickTeach.hidden = false;
      var unlockLevel = petTrickLevel[next] || 1;
      if (level >= unlockLevel) {
        petEls.trickTeach.textContent =
          t("petBtnTricks") + ": " + t(petTrickKey(next));
        petEls.trickTeach.disabled = false;
      } else {
        petEls.trickTeach.textContent = t("petReactionTrickLocked", {
          trick: t(petTrickKey(next)),
          n: unlockLevel,
        });
        petEls.trickTeach.disabled = true;
      }
    }
    var host = petEls.trickList;
    while (host.firstChild) {
      host.removeChild(host.firstChild);
    }
    if (!petState.tricks.length) {
      return;
    }
    petState.tricks.forEach(function (trick) {
      var btn = petCreate("button", "pet-action pet-trick-btn " + petTrickClass[trick]);
      btn.type = "button";
      btn.setAttribute("data-trick", trick);
      btn.textContent = t(petTrickKey(trick));
      btn.addEventListener("click", function () {
        petOnPerformTrick(trick);
      });
      host.appendChild(btn);
    });
  }

  function petSyncVisibility() {
    if (!petEls) {
      return;
    }
    var adopting = !petState && !petAdoptionDismissed;
    var petHidden = !!petState && petState.hidden === true;
    var showRestore = !adopting && (!petState || petHidden);

    petEls.adoptForm.hidden = !adopting;
    petEls.panel.hidden = adopting || petHidden;
    petEls.restore.hidden = !showRestore;
    petEls.widget.hidden = !(adopting || petState || showRestore);
    petEls.widget.setAttribute("data-collapsed", petCollapsed ? "true" : "false");
    petEls.collapse.setAttribute("aria-expanded", petCollapsed ? "false" : "true");
    petEls.collapse.setAttribute(
      "aria-label",
      t(petCollapsed ? "petBtnExpand" : "petBtnCollapse"),
    );

    if (showRestore) {
      var label = petState ? t("petBtnRestore") : t("petAdoptTitle");
      petEls.restoreLabel.textContent = label;
      petEls.restore.setAttribute("aria-label", label);
      petEls.restore.setAttribute("title", label);
    }

    if (petState && !petHidden && !adopting) {
      petStartTimer();
    } else {
      petStopTimer();
      petClearTrackedTimeouts();
      if (petMini) {
        petMiniStop();
      }
      if (petHidden) {
        petSetView("main");
      }
    }
    petSyncView();
  }

  function petSetView(view) {
    var next = view === "stats" || view === "tricks" || view === "games"
      ? view
      : "main";
    if (next !== "games" && petMini) {
      petMiniStop();
    }
    petView = next;
    petSyncView();
  }

  function petSyncView() {
    if (!petEls) {
      return;
    }
    petEls.widget.setAttribute("data-view", petView);
    petEls.statsView.view.hidden = petView !== "stats";
    petEls.tricksView.view.hidden = petView !== "tricks";
    petEls.gamesView.view.hidden = petView !== "games";
    if (petEls.actionsNode) {
      petEls.actionsNode.hidden = petView !== "main";
    }
    if (petEls.renameForm) {
      petEls.renameForm.hidden = !petRenameOpen || petView !== "main";
    }
    if (petView === "stats" && petState) {
      petRenderSubviewData();
    }
  }

  /* --- interactions ------------------------------------------------ */

  function petRemover(node) {
    return function () {
      if (node.parentNode) {
        node.parentNode.removeChild(node);
      }
    };
  }

  function petSpawnParticles(kind) {
    if (!petEls || isMotionOff()) {
      return;
    }
    var count = isMotionCalm() ? 3 : 6;
    for (var index = 0; index < count; index += 1) {
      var particle = document.createElement("span");
      particle.className = "pet-particle " + (petParticleShapes[kind] || "is-star");
      particle.setAttribute("aria-hidden", "true");
      var angle = (Math.PI * (index + 0.5)) / count;
      particle.style.setProperty(
        "--pet-fx-x",
        Math.round(Math.cos(angle) * (18 + Math.random() * 26)) + "px",
      );
      particle.style.setProperty(
        "--pet-fx-y",
        "-" + Math.round(46 + Math.sin(angle) * 30) + "px",
      );
      particle.style.setProperty("--pet-fx-delay", index * 45 + "ms");
      petEls.fx.appendChild(particle);
      petTrackTimeout(
        petRemover(particle),
        petFxMs + 160 + index * 45,
      );
    }
  }

  function petReact(kind) {
    if (!petEls) {
      return;
    }
    var className = "is-" + kind;
    var classes = [
      "is-happy",
      "is-fed",
      "is-playing",
      "is-resting",
      "is-treat",
      "is-brush",
      "is-trick",
      "is-cheer",
    ];
    classes.forEach(function (name) {
      petEls.button.classList.remove(name);
    });
    void petEls.button.offsetWidth;
    petEls.button.classList.add(className);
    if (petReactionTimer !== null) {
      window.clearTimeout(petReactionTimer);
    }
    petReactionTimer = window.setTimeout(function () {
      petReactionTimer = null;
      petEls.button.classList.remove(className);
    }, petReactionMs);
    petSpawnParticles(kind);
  }

  function petAddXp(amount) {
    var before = petLevelValue();
    var beforeStage = petStageIndex(petStageValue(before));
    petState.xp = Math.max(0, petState.xp + amount);
    var after = petLevelValue();
    return {
      levels: Math.max(0, after - before),
      stageChanged: petStageIndex(petStageValue(after)) > beforeStage,
    };
  }

  function petCommit(result) {
    if (!petState) {
      return;
    }
    var gain = result && result.gain
      ? result.gain
      : { levels: 0, stageChanged: false };
    if (gain.levels > 0) {
      petAddTreats(gain.levels);
    }
    var unlocked = petCheckAchievements();
    petWriteState();
    petRender();
    if (unlocked.length) {
      petCelebrateAchievement(unlocked[0]);
    }
    if (gain.stageChanged) {
      petSetStatus(
        t("petReactionStage", {
          name: petState.name,
          stage: t(petStageKey(petStageValue())),
        }),
      );
      return;
    }
    if (gain.levels > 0) {
      petSetStatus(
        t("petReactionLevel", { name: petState.name, n: petLevelValue() }),
      );
      return;
    }
    petSetStatus(result ? result.status : "");
  }

  function petOnPetClick() {
    if (!petState) {
      return;
    }
    var now = Date.now();
    if (now < petCooldownUntil) {
      petSetStatus(t("petReactionCooldown", { name: petState.name }));
      return;
    }
    petCooldownUntil = now + petCooldownMs;
    petTouchInteraction();
    petState.happiness = petClamp(petState.happiness + 6, 0, 100);
    var gain = petAddXp(2);
    var combo = petBumpCombo();
    petReact("happy");
    petBlip("pet");
    petCommit({
      gain: gain,
      status: combo >= 2
        ? t("petReactionCombo", { n: combo })
        : t("petReactionPet", { name: petState.name }),
    });
  }

  function petOnFeed() {
    if (!petState) {
      return;
    }
    if (petState.hunger <= 4) {
      petSetStatus(t("petReactionFull", { name: petState.name }));
      return;
    }
    petTouchInteraction();
    petState.hunger = petClamp(petState.hunger - 30, 0, 100);
    petState.happiness = petClamp(petState.happiness + 3, 0, 100);
    petState.totalFeeds += 1;
    var gain = petAddXp(4);
    petReact("fed");
    petBlip("pet");
    petCommit({
      gain: gain,
      status: t("petReactionFeed", { name: petState.name }),
    });
  }

  function petOnPlay() {
    if (!petState) {
      return;
    }
    if (petState.energy < 15) {
      petSetStatus(t("petReactionTired", { name: petState.name }));
      return;
    }
    petTouchInteraction();
    petState.happiness = petClamp(petState.happiness + 12, 0, 100);
    petState.hunger = petClamp(petState.hunger + 8, 0, 100);
    petState.energy = petClamp(petState.energy - 10, 0, 100);
    var gain = petAddXp(6);
    petReact("playing");
    petBlip("pet");
    petCommit({
      gain: gain,
      status: t("petReactionPlay", { name: petState.name }),
    });
  }

  function petOnRest() {
    if (!petState) {
      return;
    }
    if (petState.energy >= 98) {
      petSetStatus(t("petReactionRested", { name: petState.name }));
      return;
    }
    petTouchInteraction();
    petState.energy = petClamp(petState.energy + 45, 0, 100);
    petState.happiness = petClamp(petState.happiness + 4, 0, 100);
    petAsleep = false;
    var gain = petAddXp(3);
    petReact("resting");
    petCommit({
      gain: gain,
      status: t("petReactionRest", { name: petState.name }),
    });
  }

  function petOnTreat() {
    if (!petState) {
      return;
    }
    if (petState.treats <= 0) {
      petSetStatus(t("petReactionNoTreat", { name: petState.name }));
      return;
    }
    petTouchInteraction();
    petAddTreats(-1);
    petState.happiness = petClamp(petState.happiness + 14, 0, 100);
    petState.hunger = petClamp(petState.hunger - 12, 0, 100);
    var gain = petAddXp(8);
    petReact("treat");
    petBlip("win");
    petCommit({
      gain: gain,
      status: t("petReactionTreat", { name: petState.name }),
    });
  }

  function petOnBrush() {
    if (!petState) {
      return;
    }
    petTouchInteraction();
    petState.happiness = petClamp(petState.happiness + 7, 0, 100);
    petState.totalBrush += 1;
    var gain = petAddXp(5);
    petReact("brush");
    petBlip("pet");
    petCommit({
      gain: gain,
      status: t("petReactionBrush", { name: petState.name }),
    });
  }

  function petOnTalk() {
    if (!petState) {
      return;
    }
    petTouchInteraction();
    var gain = petAddXp(1);
    petCommit({ gain: gain, status: petTalkLine() });
  }

  function petOnTeachTrick() {
    if (!petState) {
      return;
    }
    var next = petNextTrick();
    if (!next) {
      petSetStatus(t("petReactionTrickNone", { name: petState.name }));
      return;
    }
    var unlockLevel = petTrickLevel[next] || 1;
    if (petLevelValue() < unlockLevel) {
      petSetStatus(
        t("petReactionTrickLocked", { trick: t(petTrickKey(next)), n: unlockLevel }),
      );
      return;
    }
    petTouchInteraction();
    petState.tricks.push(next);
    petState.totalTricks += 1;
    var gain = petAddXp(10);
    petReact("trick");
    petBlip("win");
    petCommit({
      gain: gain,
      status: t("petReactionTrickTeach", {
        name: petState.name,
        trick: t(petTrickKey(next)),
      }),
    });
  }

  function petOnPerformTrick(trick) {
    if (!petState) {
      return;
    }
    if (!petLearnedTrick(trick)) {
      petSetStatus(t("petReactionTrickUnknown", { name: petState.name }));
      return;
    }
    petTouchInteraction();
    petState.totalTricks += 1;
    var gain = petAddXp(2);
    petReact("trick");
    petBlip("pet");
    petCommit({
      gain: gain,
      status: t("petReactionTrickPerform", {
        name: petState.name,
        trick: t(petTrickKey(trick)),
      }),
    });
  }

  function petOnToggleSound() {
    if (!petState) {
      return;
    }
    petState.sound = petState.sound !== true;
    petWriteState();
    petRender();
    petSetStatus(t(petState.sound ? "petReactionUnmuted" : "petReactionMuted"));
  }

  function petSelectAccessory(accessory) {
    if (!petState || !petAccessoryUnlocked(accessory)) {
      return;
    }
    petTouchInteraction();
    petState.accessory = accessory;
    var gain = petAddXp(0);
    petCommit({
      gain: gain,
      status: accessory === "none"
        ? t("petReactionAcc", { name: petState.name, acc: t(petAccessoryKey("none")) })
        : t("petReactionAcc", {
            name: petState.name,
            acc: t(petAccessoryKey(accessory)),
          }),
    });
  }

  function petSelectHue(hue) {
    if (!petState || !petHueUnlocked(hue)) {
      return;
    }
    petTouchInteraction();
    petState.hue = hue;
    var gain = petAddXp(0);
    petCommit({ gain: gain, status: t("petReactionHue", { name: petState.name }) });
  }

  /* --- mini-game: Treat Toss (timing) ------------------------------ */

  function petTossPhase(elapsed) {
    var phase = (elapsed % (petTossPeriodMs * 2)) / petTossPeriodMs;
    return phase <= 1 ? phase : 2 - phase;
  }

  function petTossHud() {
    if (!petMini || petMini.id !== "toss" || !petMini.hud) {
      return;
    }
    petMini.hud.textContent =
      t("petGameTossRound", { n: petMini.round, total: petTossRounds }) +
      " · " +
      t("petGameTossScore", { n: petMini.score });
  }

  function petTossTick() {
    if (!petMini || petMini.id !== "toss" || !petMini.active) {
      return;
    }
    var pos = petTossPhase(Date.now() - petMini.start);
    petMini.marker.style.left = (pos * 100).toFixed(2) + "%";
    petMini.marker.setAttribute("data-pos", pos.toFixed(3));
    petMiniTrack(petTossTick, petTossTickMs);
  }

  function petStartToss() {
    if (!petState || !petEls) {
      return;
    }
    petMiniStop();
    petMini = {
      id: "toss",
      round: 1,
      score: 0,
      treats: 0,
      treatsAtStart: petState.treats,
      active: true,
      start: Date.now(),
      marker: null,
      hud: null,
      zone: null,
    };
    var wrap = petCreate("div", "pet-game pet-game-toss");
    wrap.setAttribute("role", "group");
    wrap.setAttribute("aria-label", t("petGameTossAria"));
    var hud = petCreate("p", "pet-game-hud");
    hud.setAttribute("id", "petGameHud");
    hud.setAttribute("role", "status");
    hud.setAttribute("aria-live", "polite");
    var track = petCreate("div", "pet-game-track");
    var zone = petCreate("span", "pet-game-zone");
    zone.setAttribute("aria-hidden", "true");
    var marker = petCreate("span", "pet-game-marker");
    marker.setAttribute("aria-hidden", "true");
    marker.setAttribute("data-pos", "0.5");
    track.appendChild(zone);
    track.appendChild(marker);
    var tossBtn = petCreate("button", "pet-action is-primary pet-toss-btn");
    tossBtn.type = "button";
    tossBtn.setAttribute("id", "petGameTossBtn");
    tossBtn.textContent = t("petGameTossBtn");
    wrap.appendChild(hud);
    wrap.appendChild(track);
    wrap.appendChild(tossBtn);
    petEls.gameHost.appendChild(wrap);
    petEls.gameMenu.hidden = true;
    petEls.gameExit.hidden = false;
    petEls.gameResult.textContent = t("petGameTossHint");
    petMini.hud = hud;
    petMini.marker = marker;
    petMini.zone = zone;
    tossBtn.addEventListener("click", petTossStop);
    petTossHud();
    petTossTick();
    tossBtn.focus();
  }

  function petTossStop() {
    if (!petMini || petMini.id !== "toss" || !petMini.active) {
      return;
    }
    var pos = petTossPhase(Date.now() - petMini.start);
    var dist = Math.abs(pos - 0.5);
    var label = "petGameTossMiss";
    var points = 0;
    if (dist <= 0.06) {
      label = "petGameTossPerfect";
      points = 3;
      petMini.treats += 1;
    } else if (dist <= 0.16) {
      label = "petGameTossGood";
      points = 2;
    } else if (dist <= 0.32) {
      label = "petGameTossOk";
      points = 1;
    }
    petMini.active = false;
    petMini.score += points;
    petMiniClearTimers();
    petMini.marker.setAttribute("data-pos", pos.toFixed(3));
    petMini.marker.setAttribute("data-hit", label);
    petEls.gameResult.textContent = t(label);
    petBlip(points > 0 ? "win" : "bad");
    if (petMini.round >= petTossRounds) {
      petTossFinish();
      return;
    }
    petMini.round += 1;
    petTossHud();
    petMiniTrack(petTossNextRound, petReactionMs);
  }

  function petTossNextRound() {
    if (!petMini || petMini.id !== "toss") {
      return;
    }
    petMini.active = true;
    petMini.start = Date.now();
    petEls.gameResult.textContent = t("petGameTossHint");
    petTossHud();
    petTossTick();
  }

  function petTossFinish() {
    if (!petMini || petMini.id !== "toss") {
      return;
    }
    var score = petMini.score;
    var treats = petMini.treats + Math.max(0, Math.floor(score / 4));
    petMiniFinish(
      "petGameTossResult",
      { n: score, treats: treats },
      treats,
      10 + score * 2,
    );
    petReact("cheer");
    if (petEls.gameExit) {
      petEls.gameExit.focus();
    }
  }

  /* --- mini-game: Trick Trainer (memory) --------------------------- */

  function petSimonHud() {
    if (!petMini || petMini.id !== "simon" || !petMini.hud) {
      return;
    }
    petMini.hud.textContent = t("petGameSimonRound", { n: petMini.round });
  }

  function petStartSimon() {
    if (!petState || !petEls) {
      return;
    }
    petMiniStop();
    petMini = {
      id: "simon",
      sequence: [],
      round: 0,
      treats: 0,
      treatsAtStart: petState.treats,
      watching: true,
      index: 0,
      host: null,
      hud: null,
      buttons: {},
    };
    var wrap = petCreate("div", "pet-game pet-game-simon");
    wrap.setAttribute("role", "group");
    wrap.setAttribute("aria-label", t("petGameSimonAria"));
    var hud = petCreate("p", "pet-game-hud");
    hud.setAttribute("id", "petGameHud");
    hud.setAttribute("role", "status");
    hud.setAttribute("aria-live", "polite");
    var seqWrap = petCreate("div", "pet-seq");
    var buttons = {};
    petTrickOrder.forEach(function (trick) {
      var btn = petCreate("button", "pet-action pet-seq-btn " + petTrickClass[trick]);
      btn.type = "button";
      btn.setAttribute("data-trick", trick);
      btn.textContent = t(petTrickKey(trick));
      btn.addEventListener("click", function () {
        petSimonInput(trick);
      });
      seqWrap.appendChild(btn);
      buttons[trick] = btn;
    });
    wrap.appendChild(hud);
    wrap.appendChild(seqWrap);
    petEls.gameHost.appendChild(wrap);
    petEls.gameMenu.hidden = true;
    petEls.gameExit.hidden = false;
    petEls.gameResult.textContent = t("petGameSimonHint");
    petMini.host = wrap;
    petMini.hud = hud;
    petMini.buttons = buttons;
    petSimonGrow();
  }

  function petSimonGrow() {
    if (!petMini || petMini.id !== "simon") {
      return;
    }
    petMini.round += 1;
    petMini.sequence.push(
      petTrickOrder[Math.floor(Math.random() * petTrickOrder.length)],
    );
    petMini.index = 0;
    petMini.watching = true;
    petMini.host.setAttribute("data-sequence", petMini.sequence.join(","));
    petMini.host.setAttribute("data-watching", "true");
    petSimonHud();
    petSimonPlay(0);
  }

  function petSimonPlay(index) {
    if (!petMini || petMini.id !== "simon") {
      return;
    }
    var keys = Object.keys(petMini.buttons);
    if (index >= petMini.sequence.length) {
      petMini.watching = false;
      petMini.host.setAttribute("data-watching", "false");
      keys.forEach(function (key) {
        petMini.buttons[key].disabled = false;
      });
      petMini.buttons[petMini.sequence[0]].focus();
      petEls.gameResult.textContent = t("petGameSimonGo");
      return;
    }
    var trick = petMini.sequence[index];
    var btn = petMini.buttons[trick];
    keys.forEach(function (key) {
      petMini.buttons[key].disabled = true;
      petMini.buttons[key].classList.remove("is-active");
    });
    void btn.offsetWidth;
    btn.classList.add("is-active");
    petBlip("pet");
    petMiniTrack(function () {
      btn.classList.remove("is-active");
      petMiniTrack(function () {
        petSimonPlay(index + 1);
      }, 140);
    }, petSimonStepMs);
  }

  function petSimonInput(trick) {
    if (!petMini || petMini.id !== "simon" || petMini.watching) {
      return;
    }
    if (trick !== petMini.sequence[petMini.index]) {
      petSimonFail();
      return;
    }
    petMini.index += 1;
    var btn = petMini.buttons[trick];
    if (btn) {
      btn.classList.add("is-active");
      petMiniTrack(function () {
        btn.classList.remove("is-active");
      }, 200);
    }
    petBlip("win");
    if (petMini.index >= petMini.sequence.length) {
      petMini.treats += 1;
      petAddTreats(1);
      petAddXp(4);
      petWriteState();
      petRender();
      petMini.watching = true;
      petEls.gameResult.textContent = t("petGameSimonRound", {
        n: petMini.round + 1,
      });
      petMiniTrack(petSimonGrow, 700);
    }
  }

  function petSimonFail() {
    if (!petMini || petMini.id !== "simon") {
      return;
    }
    var round = petMini.round;
    var treats = petMini.treats;
    petBlip("bad");
    /* Each completed round already banked one treat, so the finish grants
     * nothing extra: one coherent per-round rule, no double count. */
    petMiniFinish(
      "petGameSimonResult",
      { n: round, treats: treats },
      0,
      4,
    );
    petReact("cheer");
    if (petEls.gameExit) {
      petEls.gameExit.focus();
    }
  }

  function petOnKeydown(event) {
    if (!event || event.key !== "Escape") {
      return;
    }
    if (petMini) {
      if (typeof event.preventDefault === "function") {
        event.preventDefault();
      }
      petMiniStop();
      petSetView("games");
      if (petEls.tossStart) {
        petEls.tossStart.focus();
      }
      return;
    }
    if (!petState || petState.hidden === true) {
      return;
    }
    if (typeof event.preventDefault === "function") {
      event.preventDefault();
    }
    petOnHide();
  }

  /* --- game awareness (called by the site's games, never the reverse) */

  function petNotifyGame(isBest) {
    if (!petState || !petEls || petEls.widget.hidden) {
      return;
    }
    petLastInteraction = Date.now();
    petAsleep = false;
    petAddTreats(isBest ? 2 : 1);
    var gain = petAddXp(isBest ? 6 : 3);
    petReact("cheer");
    petBlip(isBest ? "win" : "pet");
    petCommit({
      gain: gain,
      status: isBest
        ? t("petReactionCheerBest", { name: petState.name })
        : t("petReactionCheer", { name: petState.name }),
    });
  }


  function petToggleRename(open) {
    petRenameOpen = open;
    petEls.renameForm.hidden = !open;
    if (open && petState) {
      petEls.renameInput.value = petState.name;
      petEls.renameInput.focus();
      if (typeof petEls.renameInput.select === "function") {
        petEls.renameInput.select();
      }
      return;
    }
    petEls.renameInput.value = "";
  }

  function petOnRenameSubmit() {
    if (!petState) {
      return;
    }
    var next = petSanitizeName(petEls.renameInput.value) || t("petDefaultName");
    petState.name = next;
    var gain = petAddXp(2);
    petToggleRename(false);
    petCommit({
      gain: gain,
      status: t("petReactionRenamed", { name: next }),
    });
  }

  function petOnSwitchSpecies() {
    if (!petState) {
      return;
    }
    var index = petSpeciesOrder.indexOf(petState.species);
    var next = petSpeciesOrder[(index + 1) % petSpeciesOrder.length];
    petState.species = next;
    var gain = petAddXp(2);
    petCommit({
      gain: gain,
      status: t("petReactionSpecies", {
        name: petState.name,
        species: t(petSpeciesKey(next)),
      }),
    });
  }

  function petDisarmReset() {
    petResetArmed = false;
    if (petResetTimer !== null) {
      window.clearTimeout(petResetTimer);
      petResetTimer = null;
    }
    petEls.actions.Reset.textContent = t("petBtnReset");
    petEls.actions.Reset.classList.remove("is-armed");
  }

  function petOnResetClick() {
    if (!petResetArmed) {
      petResetArmed = true;
      petEls.actions.Reset.textContent = t("petResetArmed");
      petEls.actions.Reset.classList.add("is-armed");
      petResetTimer = window.setTimeout(petDisarmReset, 4000);
      return;
    }
    petDisarmReset();
    petState = null;
    petRenderedSpecies = "";
    petCollapsed = false;
    petRenameOpen = false;
    petCombo = 0;
    petAsleep = false;
    petSelectedSpecies = petSpeciesOrder[0];
    petMiniStop();
    petStopTimer();
    petClearTrackedTimeouts();
    petRemoveState();
    petEls.renameForm.hidden = true;
    petEls.adoptName.value = t("petDefaultName");
    petSelectSpeciesInput(petSelectedSpecies);
    petSetView("main");
    petRenderCombo();
    petSyncVisibility();
    petSetStatus(t("petReactionReset"));
  }

  function petOnHide() {
    if (!petState) {
      return;
    }
    petState.hidden = true;
    petWriteState();
    petToggleRename(false);
    petMiniStop();
    petSetView("main");
    petSyncVisibility();
    petEls.restore.focus();
  }

  function petSelectSpeciesInput(species) {
    petEls.speciesInputs.forEach(function (input) {
      input.checked = input.value === species;
    });
  }

  function petOnAdoptConfirm() {
    var name = petSanitizeName(petEls.adoptName.value) || t("petDefaultName");
    var species = petIsSpecies(petSelectedSpecies)
      ? petSelectedSpecies
      : petSpeciesOrder[0];
    if (petEls.speciesInputs.length) {
      petEls.speciesInputs.forEach(function (input) {
        if (input.checked) {
          species = input.value;
        }
      });
    }
    petState = {
      species: species,
      name: name,
      happiness: petStartStats.happiness,
      hunger: petStartStats.hunger,
      energy: petStartStats.energy,
      xp: 0,
      treats: petStartTreats,
      tricks: [],
      achievements: {},
      accessory: "none",
      hue: "default",
      daysVisited: 1,
      streak: 1,
      lastDay: petLocalDay(Date.now()),
      totalFeeds: 0,
      totalBrush: 0,
      totalTricks: 0,
      bestCombo: 0,
      miniGamesFinished: 0,
      pos: "br",
      sound: false,
      lastSeen: Date.now(),
      hidden: false,
    };
    petSelectedSpecies = species;
    petAdoptionDismissed = false;
    petCollapsed = false;
    petCombo = 0;
    petAsleep = false;
    petLastInteraction = Date.now();
    petRenderedSpecies = "";
    petBindAwareness();
    petApplyCorner();
    var unlocked = petCheckAchievements();
    petWriteState();
    petRender();
    petSyncVisibility();
    petSetStatus(t("petReactionAdopted", { name: name }));
    if (unlocked.length) {
      petCelebrateAchievement(unlocked[0]);
    }
  }

  function initPet() {
    if (!document.body) {
      return;
    }

    var saved = petReadState();
    var awayHours = 0;
    var dailyTreats = 0;
    if (saved) {
      petState = saved;
      petSelectedSpecies = saved.species;
      awayHours = petApplyDecay(Date.now());
      dailyTreats = petTouchVisit();
      petCheckAchievements();
      petWriteState();
    }

    petBuildDom();
    applyI18nDom();
    petBindAwareness();
    petApplyCorner();
    petLastInteraction = Date.now();

    if (petState) {
      petRender();
      petSyncVisibility();
      petRefreshIdleSleep(Date.now());
      if (dailyTreats > 0) {
        petSetStatus(
          t("petReactionTreat", { name: petState.name }),
        );
      } else if (awayHours >= 1 / 60) {
        petSetStatus(
          t("petAway", {
            name: petState.name,
            n: petFormatAway(awayHours),
          }),
        );
      } else {
        petSetStatus(petTalkLine());
      }
      return;
    }

    petSelectSpeciesInput(petSelectedSpecies);
    petEls.adoptName.value = t("petDefaultName");
    petSyncVisibility();
  }

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
