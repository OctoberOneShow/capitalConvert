/* Presentation catalog for every game except the two deliberately preserved
 * experiences. Each entry has its own world, motif and bilingual objective. */
(function (App) {
  "use strict";
  var catalog = {};
  var strings = { en: {}, zh: {} };
  var genres = {
    arcade: ["Arcade", "街机挑战"], puzzle: ["Puzzle", "解谜挑战"],
    strategy: ["Strategy", "策略对决"], explore: ["Adventure", "探索冒险"],
    music: ["Rhythm", "节奏舞台"], cozy: ["Slow moments", "悠闲时光"]
  };
  Object.keys(genres).forEach(function (g) { strings.en["worldGenre" + g] = genres[g][0]; strings.zh["worldGenre" + g] = genres[g][1]; });
  function add(id, world, icon, genre, en, zh) {
    var key = "worldGoal" + id;
    catalog[id] = { world: world, icon: icon, genre: genre, goal: key };
    strings.en[key] = en; strings.zh[key] = zh;
  }
  add("Typing", "archive", "quill", "arcade", "Ten seconds. Every keystroke counts.", "十秒冲刺，让每次敲击都准确落下。");
  add("Memory", "stage", "card-back", "puzzle", "Turn a card. Remember what the others hide.", "翻开一张牌，记住其余牌背后的秘密。");
  add("2048", "workshop", "tile", "puzzle", "Small merges. One extraordinary number.", "从小小合并开始，抵达非凡数字。");
  add("Reflex", "neon", "target", "arcade", "Wait for the signal. Make your moment count.", "等待信号，把握出手的瞬间。");
  add("CaretDash", "neon", "bolt", "arcade", "Leap the punctuation. Keep the streak alive.", "越过标点障碍，延续你的连胜。");
  add("Elements", "laboratory", "atom", "cozy", "Pour, ignite, grow. Build your own little world.", "倾倒、点燃、培育，创造你的小世界。");
  add("SpotDiff", "archive", "eye", "puzzle", "One line has changed. Trust your eye.", "一行悄然改变，考验你的眼力。");
  add("Plumber", "workshop", "pipe", "arcade", "Sort the widths. Keep the pipeline flowing.", "辨别宽度，让标点管道流畅运转。");
  add("Stack", "city", "tile", "arcade", "Find the perfect drop. Reach above the skyline.", "抓住落点，叠出高过天际线的塔。");
  add("ColorCode", "laboratory", "lock", "puzzle", "Read the clues. Crack the hidden spectrum.", "解读线索，破解隐藏的色彩密码。");
  add("Breakout", "space", "gem", "arcade", "Aim the rebound. Shatter the glyph wall.", "掌握反弹，击碎灵符之墙。");
  add("EmberDice", "workshop", "dice", "strategy", "Roll for glory. Bank before the embers bite.", "掷出荣耀，在余烬反噬前存入积分。");
  add("Snake", "forest", "leaf", "arcade", "Follow the feast. Leave yourself a way out.", "追寻食物，也给自己留一条退路。");
  add("Lights", "city", "bulb", "puzzle", "One switch ripples outward. Put the city to sleep.", "一次开关牵动四邻，让城市进入梦乡。");
  add("Mines", "workshop", "flag", "puzzle", "Read the numbers. Bring every explorer home.", "读懂数字，让每位探险者平安归来。");
  add("Gomoku", "tabletop", "stone-dark", "strategy", "Five stones. One line. Think a move ahead.", "五枚棋子，一线胜负，先想好下一步。");
  add("Traffic", "city", "arrow", "puzzle", "Untangle the traffic. Open the escape lane.", "解开拥堵，为出发打开通道。");
  add("Vault", "archive", "key", "puzzle", "Five letters stand between you and the vault.", "五个字母，开启字母密库。");
  add("GlyphBlocks", "neon", "tile", "arcade", "Fit the falling pieces. Clear a path upward.", "安放下落方块，消行向上突破。");
  add("InkCascade", "laboratory", "gem", "puzzle", "Match three. Set off a beautiful chain reaction.", "三枚相连，点燃漂亮的连锁反应。");
  add("InkBeat", "stage", "note", "music", "Feel the pulse. Meet each note on the line.", "跟随脉动，在判定线上接住每个音符。");
  add("BubbleInk", "ocean", "wave", "arcade", "Aim, bank, burst. Let the clusters fall.", "瞄准、反弹、消除，让泡泡簇落下。");
  add("GlyphEcho", "stage", "bell", "music", "Listen closely. Play the melody back.", "仔细倾听，重现刚刚响起的旋律。");
  add("InkSlash", "neon", "sword", "arcade", "One clean swipe. A shower of ink.", "干净利落地一划，墨花四散。");
  add("PegSplash", "ocean", "gem", "arcade", "Find the ricochet. Catch the last bounce.", "寻找反弹路线，接住最后一次弹跳。");
  add("GlyphRaid", "space", "rocket", "arcade", "Hold the line. Send the invaders back to the stars.", "守住防线，把入侵者送回星空。");
  add("GlyphLeap", "forest", "feather", "arcade", "Keep climbing. The next ledge is your lifeline.", "不断向上，下一个平台就是你的生路。");
  add("AuroraFlow", "ice", "wave", "puzzle", "Weave ribbons of light through every square.", "将极光织成丝带，穿过每一格。");
  add("CometGolf", "space", "planet", "arcade", "Bend around gravity. Bring your comet home.", "绕过引力，让彗星落入目标。");
  add("PrismPath", "laboratory", "prism", "puzzle", "Turn the mirrors. Guide a single beam of light.", "转动镜面，引导一束光抵达终点。");
  add("Starfall", "space", "rocket", "arcade", "A little thrust. A gentle landing among the stars.", "轻推引擎，在星光中平稳着陆。");
  add("InkSort", "laboratory", "flask", "puzzle", "Pour with care. Give every colour its own glass.", "谨慎倾倒，让每种颜色各归其瓶。");
  add("GlyphCrossing", "forest", "leaf", "arcade", "Watch the lanes. Hop all the way to safety.", "观察车道，一路跳到安全地带。");
  add("GlyphPusher", "workshop", "crate", "puzzle", "A crate can only be pushed. Plan your way home.", "箱子只能推，先规划再动手。");
  add("GlyphNet", "laboratory", "bulb", "puzzle", "Turn each pipe. Bring the whole network to life.", "转动管道，让整张网络亮起来。");
  add("GlyphSketch", "archive", "quill", "puzzle", "Follow the numbers. Reveal the picture beneath.", "循着数字，揭开格子下的图案。");
  add("GlyphFifteen", "tabletop", "tile", "puzzle", "One empty space. Fifteen pieces finding their places.", "一个空位，十五枚方块各归其位。");
  add("GlyphSudoku", "archive", "scroll", "puzzle", "Every row has a secret. Let the numbers agree.", "每行都有秘密，让数字彼此相容。");
  add("GlyphReversi", "tabletop", "disc", "strategy", "Turn the tide one disc at a time.", "一枚一枚落子，翻转局势。");
  add("GlyphGlide", "ice", "snow", "puzzle", "The ice keeps you moving. Choose where to stop.", "冰面让你滑行，选择好停下的地方。");
  add("GlyphFour", "tabletop", "disc", "strategy", "Drop a disc. Connect four before your rival.", "落下一枚棋子，抢先连成四枚。");
  add("GlyphTower", "archive", "crown", "puzzle", "Move the rings. Build order from a tiny tower.", "移动圆环，重建小塔的秩序。");
  add("GlyphFleet", "ocean", "anchor", "strategy", "Read the waters. Find the fleet in the fog.", "观察海域，在迷雾中发现舰队。");
  add("Nim", "workshop", "flame", "strategy", "Leave the last ember to your opponent.", "把最后一根余烬留给对手。");
  add("Dots", "tabletop", "tile", "strategy", "Draw a line. Claim the squares it closes.", "画下一条线，夺取围成的方格。");
  add("Republic", "archive", "book", "puzzle", "A little history. A new discovery with every card.", "一页历史，每张卡片都有新发现。");
  add("Kalah", "tabletop", "gem", "strategy", "Sow the stones. Bring the harvest to your store.", "播下石子，让收获归入你的粮仓。");
  add("Blackjack", "tabletop", "card", "strategy", "Read the table. Know when to hold.", "观察牌局，掌握停牌的时机。");
  add("Garden", "garden", "sprout", "cozy", "Plant a seed. Come back to something blooming.", "种下一粒种子，回来时花已盛开。");
  add("RooftopRadio", "city", "satellite", "explore", "A faint signal is calling from the rooftops.", "屋顶之间，微弱的信号正呼唤你。");
  add("LanternHeist", "city", "lantern", "explore", "Stay in the shadows. Slip past the lantern guards.", "藏身阴影，绕过提灯守卫。");
  add("PocketDetective", "archive", "magnifier", "puzzle", "Cross off the impossible. Leave only the truth.", "排除不可能，只留下真相。");
  add("CircuitScribe", "laboratory", "battery", "puzzle", "Choose the gates. Make every signal agree.", "选择逻辑门，让每个信号符合预期。");
  add("ShadowFold", "archive", "mirror", "puzzle", "One tiny stamp. A whole pattern in its folds.", "一枚小印章，在折叠中拼出完整图案。");
  add("ClockworkDispatch", "city", "gear", "strategy", "Switch the junctions. Get every train home on time.", "切换道岔，让每列车准时到站。");
  add("WeatherLoom", "garden", "cloud", "strategy", "Weave the winds. Bring rain to the waiting villages.", "编织风向，为等待的村庄带来雨水。");
  add("CoralArchitect", "ocean", "coral", "cozy", "Plant a living reef, one careful choice at a time.", "悉心安放，让一片珊瑚礁生长起来。");
  add("PaperBridge", "workshop", "wrench", "puzzle", "Build light. Make a bridge strong enough to cross.", "轻巧搭建，让纸桥撑起一次旅程。");
  add("EmberDelve", "workshop", "torch", "explore", "Read the enemy's intent. Survive the next room.", "读懂敌人的意图，闯过下一个房间。");
  add("WhisperDeck", "stage", "card-back", "strategy", "Chain your echoes. Outplay the voices in the dark.", "串起回响，战胜暗处的低语。");
  add("GlyphBastion", "forest", "shield", "strategy", "Raise your defenses. Keep the path protected.", "筑起防线，守住这条道路。");
  add("MicrobeLab", "laboratory", "microbe", "strategy", "Adapt your tiny colony to a changing world.", "让微小的菌落适应变化的世界。");
  add("EchoCartographer", "ocean", "radar", "explore", "Listen to the dark. Map what the echoes reveal.", "倾听黑暗，把回声揭示的洞穴绘成地图。");
  add("NeonDrift", "neon", "bolt", "arcade", "Find your racing line. Chase your own ghost.", "找到最佳路线，追上自己的幽灵车。");
  add("LanternFishing", "ocean", "hook", "cozy", "Wait for the bite. Keep the line from breaking.", "静候咬钩，小心别让鱼线绷断。");
  add("ArchiveEscape", "archive", "book", "explore", "Follow the clues through a library after dark.", "循着线索，穿过入夜的藏书馆。");
  add("MoonMarket", "city", "coin", "strategy", "Seven market days. Make every trade matter.", "七天集市，让每次交易都值得。");
  add("DreamOrchestra", "stage", "note", "music", "Arrange the voices. Let the dream find its rhythm.", "编排声部，让梦境奏出自己的节奏。");
  add("Loopwright", "laboratory", "clock", "puzzle", "Your earlier self is the partner you need.", "过去的自己，是此刻最好的搭档。");
  add("HueHunter", "stage", "eye", "puzzle", "One shade is different. Find the quiet outlier.", "一抹色彩不同，找出悄悄藏着的那格。");
  add("SnapshotSleuth", "archive", "camera", "puzzle", "One photograph tells a different story.", "有一张照片，讲述着不同的故事。");
  add("DoubleTake", "archive", "eye", "puzzle", "Look again. The little details make the difference.", "再看一眼，细微之处藏着答案。");
  add("BorrowedBodies", "laboratory", "mask", "explore", "Borrow a new shape. Find a new way through.", "借来新的身躯，找到新的通路。");
  add("RuleThieves", "archive", "key", "puzzle", "Steal a rule. Rewrite what the room allows.", "偷走一条规则，改写房间的可能。");
  add("ParadoxPost", "archive", "envelope", "puzzle", "Deliver a letter through a tangle of time.", "穿过纠缠的时间，把信送达。");
  add("BlindSculptor", "workshop", "hand", "puzzle", "Listen, remember, sculpt what you cannot see.", "倾听、记忆，雕出看不见的形状。");
  add("PocketPhotographer", "garden", "camera", "cozy", "Frame the fleeting moment. Bring the light home.", "定格转瞬即逝的光，把美好带回家。");
  add("TetherSalvage", "space", "chain", "arcade", "Mind the tether. Bring the drifting cargo aboard.", "把握牵引绳，将漂浮货物带回船上。");
  add("CourtroomOfAnimals", "archive", "paw", "strategy", "Hear every witness. Give the forest a fair verdict.", "倾听每位证人，给森林一个公正的裁决。");
  add("WhaleParliament", "ocean", "fish", "strategy", "Find a shared voice beneath the waves.", "在海浪之下，找到共同的声音。");
  add("OneMinuteMayor", "city", "crown", "strategy", "One minute in office. A whole town in your hands.", "任期只有一分钟，整座小镇交给你。");
  add("LostLanguage", "archive", "scroll", "puzzle", "Learn the symbols. Give a lost language its voice.", "学会符号，让失落的语言重新发声。");
  add("MorseRescue", "city", "radar", "music", "Dots and dashes can bring someone home.", "点与划之间，传递归来的希望。");
  add("SwitchboardDuo", "laboratory", "pipe", "puzzle", "Two sides of a switchboard. Keep the calls connected.", "配合接线台两端，让通话保持畅通。");
  add("CounterfeitMuseum", "archive", "magnifier", "puzzle", "An imitation is hiding among the masterpieces.", "杰作之间，藏着一件赝品。");
  add("ShadowPuppeteer", "stage", "mask", "puzzle", "Move the puppet. Tell a story in silhouette.", "移动木偶，用剪影讲述故事。");
  add("PinballCourier", "neon", "envelope", "arcade", "A perfect ricochet delivers the next parcel.", "用漂亮的反弹，送达下一份包裹。");
  add("TinyWrestlers", "stage", "shield", "arcade", "Read the feint. Find your opening in the ring.", "看穿佯攻，抓住擂台上的破绽。");
  add("KitchenRelay", "workshop", "flame", "arcade", "Keep the kitchen moving. Send every order out hot.", "让厨房不停转，每份菜都热腾腾上桌。");
  add("CrosswindKites", "garden", "feather", "arcade", "Catch the crosswind. Keep your kite in the sky.", "迎住侧风，让风筝稳稳留在天空。");
  add("GravityBadminton", "space", "feather", "arcade", "Read the orbit. Return the shuttle through gravity.", "看准轨迹，穿过引力把球打回去。");
  add("DeepFreezeExpedition", "ice", "snow", "explore", "Read the ice. Bring the expedition home.", "观察冰原，让探险队平安归来。");
  add("OceanArchaeologist", "ocean", "shell", "explore", "Brush away the sand. Uncover a forgotten world.", "拂去海沙，发掘被遗忘的世界。");
  add("TinyBlacksmith", "workshop", "wrench", "arcade", "Heat, strike, temper. Forge something worth keeping.", "加热、锤打、淬火，锻出值得珍藏的作品。");
  add("AuctionDungeon", "workshop", "chest", "strategy", "Bid wisely. Carry the right relic into the dungeon.", "明智竞价，带着合适的遗物深入地牢。");
  add("TeaHouse", "garden", "leaf", "cozy", "A warm cup. A good listener. A story shared.", "一杯温茶，静静倾听，交换一段故事。");
  strings.en.worldSearch = "Find a game"; strings.zh.worldSearch = "寻找游戏";
  strings.en.worldAll = "All"; strings.zh.worldAll = "全部";
  strings.en.worldNoGames = "No games match. Try another name or category."; strings.zh.worldNoGames = "暂无匹配游戏，试试其他名称或分类。";
  strings.en.worldClear = "Level complete"; strings.zh.worldClear = "关卡完成";
  strings.en.worldRecord = "New personal best"; strings.zh.worldRecord = "刷新个人最佳";
  if (App.addStrings) { App.addStrings(strings); }
  var nativeArt = /^(2048|ArchiveEscape|AuctionDungeon|AuroraFlow|Blackjack|BlindSculptor|BorrowedBodies|Breakout|BubbleInk|CaretDash|ColorCode|Dots|GlyphFifteen|GlyphFour|GlyphGlide|GlyphTower|Gomoku|Lights|Memory|Mines|Reflex|Snake|Stack|Traffic|Vault)$/;
  var selectedPanel = null;
  var filter = { query: "", genre: "all" };
  var library = null;
  function motionOff() { return App.isMotionOff() || !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); }
  function el(tag, cls, key) {
    var n = document.createElement(tag); n.className = cls || "";
    if (key) { n.setAttribute("data-i18n", key); n.textContent = App.t(key); }
    return n;
  }
  function mount(panel, tab) {
    var id = panel.id.replace("gamePanel", ""); var c = catalog[id];
    if (!c || panel.querySelector(".world-heading")) { return; }
    var p = App.world.palettes[c.world];
    panel.classList.add("world-panel");
    panel.setAttribute("data-world", c.world);
    panel.setAttribute("data-genre", c.genre);
    panel.style.setProperty("--world-hue", p[0]);
    panel.style.setProperty("--world-ink", p[1]);
    panel.style.setProperty("--world-mid", p[2]);
    panel.style.setProperty("--world-light", p[3]);
    panel.style.setProperty("--world-gold", p[4]);
    if (!nativeArt.test(id)) { panel.classList.add("world-renewed"); }
    var head = el("header", "world-heading");
    var seed = id.split("").reduce(function (sum, char) { return sum + char.charCodeAt(0); }, 0);
    head.appendChild(App.world.scene(c.world, seed));
    var copy = el("div", "world-heading-copy");
    copy.appendChild(el("span", "world-eyebrow", "worldGenre" + c.genre));
    var title = el("h3", "world-title", tab && tab.getAttribute("data-i18n"));
    if (!title.textContent) { title.textContent = tab ? tab.textContent : id; }
    copy.appendChild(title); copy.appendChild(el("p", "world-objective", c.goal));
    head.appendChild(copy);
    var emblem = el("div", "world-emblem"); emblem.appendChild(App.art.icon(c.icon, { hue: p[0], tone: "soft" })); head.appendChild(emblem);
    panel.insertBefore(head, panel.firstChild);
    if (tab) { tab.style.setProperty("--library-color", p[3]); tab.setAttribute("data-genre", c.genre); if (!tab.querySelector(".library-icon")) { tab.appendChild(App.art.icon(c.icon, { hue: p[0], cls: "library-icon" })); } }
    panel.addEventListener("pointerdown", function (event) {
      if (panel.hidden || document.hidden || motionOff()) { return; }
      var target = event.target;
      if (target && target.closest) { target = target.closest("button"); }
      if (!target || target.disabled || !panel.contains(target) || !target.animate) { return; }
      target.animate([{ scale: "1" }, { scale: ".96" }, { scale: "1" }], { duration: 180, easing: "ease-out" });
    });
    panel.addEventListener("click", function (event) { var note = panel.querySelector(".world-achievement"); if (note && !note.contains(event.target)) { note.remove(); } });
  }
  function matching(tab) {
    var c = catalog[(tab.getAttribute("aria-controls") || "").replace("gamePanel", "")];
    var name = tab.textContent.toLocaleLowerCase();
    // Search both languages even when the current UI uses the other one.
    var key = tab.getAttribute("data-i18n");
    if (key && App.I18N) { name += " " + ((App.I18N.en || {})[key] || "") + " " + ((App.I18N.zh || {})[key] || ""); }
    return (!filter.query || name.toLocaleLowerCase().indexOf(filter.query) !== -1) && (filter.genre === "all" || (c && c.genre === filter.genre));
  }
  function refreshLibrary() {
    if (!library) { return; }
    var count = 0; var filtered = !!filter.query || filter.genre !== "all";
    library.grid.classList.toggle("world-filtered", filtered);
    library.grid.querySelectorAll(".game-tab").forEach(function (tab) { tab.hidden = !matching(tab); if (!tab.hidden) { count += 1; } });
    library.empty.hidden = count !== 0;
    library.buttons.forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-category") === filter.genre)); });
  }
  function mountLibrary() {
    var grid = document.getElementById("gameTabs"); var toggle = document.getElementById("gameTabsToggle");
    if (!grid || !toggle || document.getElementById("worldLibraryTools")) { return; }
    var box = el("div", "world-library-tools"); box.id = "worldLibraryTools";
    var label = el("label", "world-search-label", "worldSearch"); label.htmlFor = "worldGameSearch";
    var search = el("input", "world-search"); search.type = "search"; search.id = "worldGameSearch"; search.autocomplete = "off";
    box.appendChild(label); box.appendChild(search);
    var row = el("div", "world-categories"); row.setAttribute("role", "group");
    var buttons = ["all"].concat(Object.keys(genres)).map(function (g) {
      var b = el("button", "world-category", g === "all" ? "worldAll" : "worldGenre" + g); b.type = "button"; b.setAttribute("data-category", g); b.setAttribute("aria-pressed", String(g === "all"));
      b.addEventListener("click", function () { filter.genre = g; refreshLibrary(); }); row.appendChild(b); return b;
    });
    box.appendChild(row); grid.parentNode.insertBefore(box, grid);
    var empty = el("p", "world-library-empty", "worldNoGames"); empty.setAttribute("role", "status"); empty.hidden = true; grid.parentNode.insertBefore(empty, grid.nextSibling);
    library = { grid: grid, tools: box, empty: empty, buttons: buttons };
    function showTools() { box.hidden = toggle.getAttribute("aria-expanded") !== "true"; if (box.hidden) { filter.query = ""; filter.genre = "all"; search.value = ""; refreshLibrary(); } }
    toggle.addEventListener("click", showTools); search.addEventListener("input", function () { filter.query = search.value.trim().toLocaleLowerCase(); refreshLibrary(); });
    showTools();
  }
  function update(selected) {
    if (selectedPanel) { var old = selectedPanel.querySelector(".world-achievement"); if (old) { old.remove(); } }
    selectedPanel = document.getElementById("gamePanel" + selected.charAt(0).toUpperCase() + selected.slice(1));
    var dialog = selectedPanel && selectedPanel.closest(".game-dialog");
    if (dialog) { dialog.classList.toggle("world-shell", !!catalog[selectedPanel.id.replace("gamePanel", "")]); }
  }
  function init() {
    document.querySelectorAll(".game-panel").forEach(function (panel) { mount(panel, document.getElementById(panel.getAttribute("aria-labelledby"))); });
    mountLibrary(); update("typing");
    // React to real HUD updates without a polling loop or inferred win state.
    if (window.MutationObserver && !App.presentationObserver) {
      var modal = document.getElementById("gameModal");
      if (modal) {
        var observer = new window.MutationObserver(function (mutations) {
          if (!selectedPanel || selectedPanel.hidden || document.hidden || motionOff() || !selectedPanel.classList.contains("world-renewed")) { return; }
          var visibleModal = selectedPanel.closest(".game-modal"); if (!visibleModal || visibleModal.hidden) { return; }
          var changed = [];
          mutations.forEach(function (m) {
            var node = m.target.nodeType === 3 ? m.target.parentNode : m.target;
            if (!node || !node.closest) { return; }
            var stat = node.closest(".game-stat strong, .game-result");
            if (stat && selectedPanel.contains(stat) && changed.indexOf(stat) < 0 && stat.animate && stat.__worldLastValue !== stat.textContent) {
              changed.push(stat); stat.__worldLastValue = stat.textContent;
              if (stat.__worldAnimation) { stat.__worldAnimation.cancel(); }
              stat.__worldAnimation = stat.animate([{ opacity: .55, transform: "translateY(2px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 200 });
            }
          });
        });
        observer.observe(modal, { childList: true, characterData: true, subtree: true }); App.presentationObserver = observer;
      }
    }
  }
  function achievement(result, isBest) {
    var panel = selectedPanel;
    if (!panel || panel.hidden || document.hidden || !panel.classList.contains("world-renewed")) { return; }
    var modal = panel.closest(".game-modal"); if (!modal || modal.hidden) { return; }
    var old = panel.querySelector(".world-achievement"); if (old) { old.remove(); }
    var note = el("button", "world-achievement"); note.type = "button";
    note.appendChild(App.art.icon("star", { hue: 42 }));
    note.appendChild(el("span", "", isBest ? "worldRecord" : "worldClear"));
    var stars = el("strong"); stars.textContent = "★".repeat(Math.max(0, Math.min(3, result.stars || 0))) + "☆".repeat(3 - Math.max(0, Math.min(3, result.stars || 0))); note.appendChild(stars);
    note.addEventListener("click", function () { note.remove(); }); panel.appendChild(note);
    if (App.playSfx) { App.playSfx("win"); }
  }
  App.initGamePresentation = init;
  App.updateGamePresentation = update;
  App.presentGameAchievement = achievement;
  App.gamePresentationCatalog = catalog;
  App.refreshPresentationLabels = function () {
    if (!library) { return; }
    library.grid.querySelectorAll(".game-tab").forEach(function (tab) {
      var c = catalog[(tab.getAttribute("aria-controls") || "").replace("gamePanel", "")];
      if (c && !tab.querySelector(".library-icon")) { tab.appendChild(App.art.icon(c.icon, { hue: App.world.palettes[c.world][0], cls: "library-icon" })); }
    });
    refreshLibrary();
  };
})(window.CapitalConvert = window.CapitalConvert || {});
