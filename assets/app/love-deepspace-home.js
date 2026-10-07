/* Original fan adaptation of shared meals and a home for earned keepsakes. */
(function (App) {
  "use strict";
  var partners = ["xavier", "zayne", "rafayel", "sylus", "caleb"];
  var recipes = [
    { id: "soup", key: "ldhSoup", symbol: "🥣", items: ["carrot", "mushroom", "herb"], target: [48, 68], speed: 16 },
    { id: "toast", key: "ldhToast", symbol: "🍞", items: ["bread", "apple", "honey"], target: [35, 53], speed: 19 },
    { id: "pudding", key: "ldhPudding", symbol: "🍮", items: ["milk", "egg", "honey"], target: [62, 79], speed: 14 }
  ];
  var ingredients = { carrot: ["🥕", "ldhCarrot"], mushroom: ["🍄", "ldhMushroom"], herb: ["🌿", "ldhHerb"], bread: ["🍞", "ldhBread"], apple: ["🍎", "ldhApple"], honey: ["🍯", "ldhHoney"], milk: ["🥛", "ldhMilk"], egg: ["🥚", "ldhEgg"] };
  var objects = { none: ["＋", "ldhEmpty"], plant: ["🪴", "ldhPlant"], book: ["📚", "ldhBook"], lamp: ["💡", "ldhLamp"], rabbit: ["🐰", "ldhRabbit"], badge: ["♧", "ldhBadge"], photo: ["▣", "ldhPhoto"], letter: ["✉", "ldhLetter"], chef: ["🏆", "ldhChef"] };
  function readHome(raw) {
    var out = { version: 1, homes: {} }, saved;
    try { saved = JSON.parse(raw || "null"); } catch (_) {}
    partners.forEach(function (id) {
      var s = saved && saved.version === 1 && saved.homes && saved.homes[id] || {};
      var home = { theme: ["morning", "sunset", "night"].indexOf(s.theme) >= 0 ? s.theme : "sunset", slots: ["plant", "book", "lamp", "none"], records: {} };
      if (Array.isArray(s.slots)) { home.slots = home.slots.map(function (value, i) { return Object.prototype.hasOwnProperty.call(objects, s.slots[i]) ? s.slots[i] : value; }); }
      recipes.forEach(function (r) { var n = s.records && s.records[r.id]; home.records[r.id] = Number.isInteger(n) && n >= 0 && n <= 3 ? n : 0; });
      out.homes[id] = home;
    });
    return out;
  }
  function createCooking(id) {
    var recipe = recipes.find(function (r) { return r.id === id; }) || recipes[0];
    return { recipe: recipe.id, phase: "prep", prepared: 0, mistakes: 0, heat: 0, helped: false, assist: 0, stars: 0 };
  }
  function cookingAction(s, action) {
    var r = recipes.find(function (recipe) { return recipe.id === s.recipe; });
    if (s.phase === "prep" && action.indexOf("add:") === 0) {
      if (action.slice(4) === r.items[s.prepared]) { s.prepared++; if (s.prepared === 3) { s.phase = "ready"; } }
      else { s.mistakes++; }
    } else if (action === "heat" && (s.phase === "ready" || s.phase === "paused")) { s.phase = "heating"; }
    else if (action === "pause" && s.phase === "heating") { s.phase = "paused"; }
    else if (action === "assist" && s.phase === "heating" && !s.helped) { s.helped = true; s.assist = 1.8; }
    else if (action === "serve" && (s.phase === "heating" || s.phase === "paused")) {
      s.phase = "done";
      s.stars = s.heat >= r.target[0] && s.heat <= r.target[1] ? (s.mistakes === 0 ? 3 : 2) : s.heat >= r.target[0] - 12 && s.heat <= r.target[1] + 12 ? 1 : 0;
    }
    return s;
  }
  function stepCooking(s, dt) {
    if (s.phase !== "heating" || !Number.isFinite(dt) || dt <= 0) { return s; }
    var r = recipes.find(function (recipe) { return recipe.id === s.recipe; });
    dt = Math.min(dt, .1);
    s.heat = Math.min(100, s.heat + dt * r.speed * (s.assist > 0 ? .4 : 1)); s.assist = Math.max(0, s.assist - dt);
    if (s.heat === 100) { s.phase = "done"; s.stars = 0; }
    return s;
  }
  function mountHome(pages, options) {
    var t = App.t, progress = readHome(App.storage.getItem("love-deepspace-home-v1"));
    var partner = null, cooking = createCooking("soup"), chosenSlot = 0, raf = null, last = 0, outcomeSaved = false;
    function el(tag, cls, key, parent) { var n = document.createElement(tag); n.className = cls || ""; if (key) { n.setAttribute("data-i18n", key); n.textContent = t(key); } if (parent) { parent.appendChild(n); } return n; }
    function btn(cls, key, parent, handler) { var b = el("button", cls, key, parent); b.type = "button"; b.addEventListener("click", handler); return b; }
    function save() { App.storage.setItem("love-deepspace-home-v1", JSON.stringify(progress)); }
    function cancel() { if (raf !== null) { window.cancelAnimationFrame(raf); raf = null; } }
    function owned(id) {
      var dates = options.getDates(), home = progress.homes[partner.id];
      return ["none", "plant", "book", "lamp"].indexOf(id) >= 0 || id === "rabbit" && dates.plushies[partner.id].indexOf("rabbit") >= 0 || id === "badge" && dates.badges[partner.id] || id === "photo" && dates.snapshots[partner.id] || id === "letter" && dates.stories[partner.id].length > 0 || id === "chef" && recipes.every(function (r) { return home.records[r.id] > 0; });
    }
    el("h4", "", "ldhHomeTitle", pages.home); el("p", "lds-date-hint", "ldhHomeIntro", pages.home);
    var themeRow = el("div", "ldh-options", null, pages.home), themes = {};
    ["morning", "sunset", "night"].forEach(function (theme) { themes[theme] = btn("lds-small-button", "ldh" + theme.charAt(0).toUpperCase() + theme.slice(1), themeRow, function () { progress.homes[partner.id].theme = theme; save(); renderRoom(); }); });
    var scene = el("div", "ldh-room-scene", null, pages.home);
    var view = el("div", "ldh-window", null, scene); el("i", "ldh-moon", null, view); el("i", "ldh-skyline", null, view);
    var roomPortrait = el("img", "ldh-room-portrait", null, scene); roomPortrait.alt = "";
    var roomName = el("strong", "ldh-room-name", null, scene);
    el("div", "ldh-room-sofa", null, scene); el("div", "ldh-room-rug", null, scene);
    var shelf = el("div", "ldh-room-shelf", null, scene), slots = [];
    for (var i = 0; i < 4; i++) { (function (index) { slots.push(btn("ldh-slot", null, shelf, function () { chosenSlot = index; renderRoom(); chooser.focus({ preventScroll: true }); })); })(i); }
    var chooser = el("div", "ldh-options ldh-inventory", null, pages.home); chooser.tabIndex = -1; chooser.setAttribute("role", "group"); chooser.setAttribute("aria-label", t("ldhDecorate"));
    var decorButtons = {};
    Object.keys(objects).forEach(function (id) { var b = btn("lds-small-button", null, chooser, function () { if (owned(id)) { progress.homes[partner.id].slots[chosenSlot] = id; save(); renderRoom(); slots[chosenSlot].focus({ preventScroll: true }); } }); b.setAttribute("data-decoration", id); decorButtons[id] = b; });
    var unlocks = el("p", "lds-date-hint", "ldhUnlockHint", pages.home);
    var links = el("div", "ldh-options", null, pages.home);
    ["cook", "photo", "chat"].forEach(function (id) { btn("lds-small-button", "ldsDate" + id.charAt(0).toUpperCase() + id.slice(1), links, function () { options.onSelect(id); }); });
    var roomRecords = el("div", "ldh-recipe-records", null, pages.home);
    function renderRoom() {
      if (!partner) { return; } var home = progress.homes[partner.id];
      scene.setAttribute("data-light", home.theme); roomPortrait.src = App.ldsSceneArt(partner.id, 0).src; roomName.textContent = t(partner.nameKey);
      Object.keys(themes).forEach(function (theme) { themes[theme].setAttribute("aria-pressed", String(theme === home.theme)); });
      slots.forEach(function (b, index) {
        var id = owned(home.slots[index]) ? home.slots[index] : "none";
        b.textContent = objects[id][0];
        if (id === "photo") {
          var dates = options.getDates(), snapshot = dates.photos.find(function (p) { return p.partner === partner.id; });
          var strip = dates.strips.find(function (p) { return p.partner === partner.id; });
          snapshot = snapshot || strip && strip.shots[0] || { art: 0, zoom: 1, scene: "studio", sticker: "heart" };
          var art = App.ldsSceneArt(partner.id, snapshot.art);
          b.textContent = "";
          var frame = el("span", "ldh-room-photo", null, b); frame.setAttribute("data-light", snapshot.scene);
          var image = el("img", "", null, frame); image.alt = ""; image.src = art.src;
          image.style.objectPosition = (snapshot.pan === undefined ? art.x : snapshot.pan) * 100 + "% " + art.y * 100 + "%";
          image.style.transform = "scale(" + snapshot.zoom + ")";
          el("span", "ldh-photo-sticker", null, frame).textContent = { heart: "♡", star: "✦", flower: "✿" }[snapshot.sticker];
        }
        b.setAttribute("aria-label", t("ldhSlot", { n: index + 1, item: t(objects[id][1]) })); b.setAttribute("aria-pressed", String(index === chosenSlot));
      });
      Object.keys(decorButtons).forEach(function (id) { var b = decorButtons[id]; b.disabled = !owned(id); b.textContent = objects[id][0] + " " + t(objects[id][1]) + (b.disabled ? " · " + t("ldhLocked") : ""); b.setAttribute("aria-pressed", String(id === home.slots[chosenSlot])); });
      while (roomRecords.firstChild) { roomRecords.removeChild(roomRecords.firstChild); }
      recipes.forEach(function (r) { var card = el("div", "ldh-recipe-record", null, roomRecords); el("span", "", null, card).textContent = r.symbol + " " + t(r.key); el("strong", "", null, card).textContent = "★".repeat(home.records[r.id]) + "☆".repeat(3 - home.records[r.id]); });
    }
    el("h4", "", "ldhKitchenTitle", pages.cook); el("p", "lds-date-hint", "ldhKitchenIntro", pages.cook);
    var recipeRow = el("div", "ldh-options", null, pages.cook), recipeButtons = {};
    recipes.forEach(function (r) { recipeButtons[r.id] = btn("lds-small-button", r.key, recipeRow, function () { pause(); cooking = createCooking(r.id); outcomeSaved = false; feedback.textContent = t("ldhPrepHint"); renderCooking(); }); });
    var kitchen = el("div", "ldh-kitchen-scene", null, pages.cook);
    var pot = el("div", "ldh-pot", null, kitchen); el("i", "ldh-steam", null, pot); var dish = el("span", "ldh-dish", null, pot);
    var cookPortrait = el("img", "ldh-cook-portrait", null, kitchen); cookPortrait.alt = "";
    var cookLine = el("p", "ldh-cook-line", null, pages.cook);
    var prep = el("ol", "ldh-prep-list", null, pages.cook);
    var pantry = el("div", "ldh-pantry", null, pages.cook), ingredientButtons = {};
    Object.keys(ingredients).forEach(function (id) { var b = btn("lds-small-button", null, pantry, function () { var before = cooking.prepared; cookingAction(cooking, "add:" + id); feedback.textContent = t(cooking.prepared > before ? "ldhAdded" : "ldhWrongIngredient", { item: t(ingredients[id][1]) }); renderCooking(); }); b.textContent = ingredients[id][0] + " " + t(ingredients[id][1]); b.setAttribute("data-ingredient", id); ingredientButtons[id] = b; });
    var heatLabel = el("p", "", "ldhHeatHint", pages.cook);
    var meter = el("div", "ldh-heat-meter", null, pages.cook); meter.setAttribute("role", "meter"); meter.setAttribute("aria-label", t("ldhHeat")); meter.setAttribute("aria-valuemin", "0"); meter.setAttribute("aria-valuemax", "100");
    var zone = el("i", "ldh-heat-zone", null, meter), needle = el("i", "ldh-heat-needle", null, meter);
    var heatReadout = el("strong", "ldh-heat-value", null, pages.cook);
    var controls = el("div", "ldh-options", null, pages.cook);
    var heatButton = btn("lds-small-button", "ldhStartHeat", controls, function () { if (cooking.phase === "heating") { pause(); } else { cookingAction(cooking, "heat"); if (cooking.phase === "heating") { last = performance.now(); raf = window.requestAnimationFrame(frame); options.onRunning(true); renderCooking(); } } });
    var assistButton = btn("lds-small-button", "ldhAssist", controls, function () { cookingAction(cooking, "assist"); cookLine.textContent = t(voiceKey("Assist")); renderCooking(); });
    var serveButton = btn("lds-small-button", "ldhServe", controls, function () { cookingAction(cooking, "serve"); finish(); });
    btn("lds-small-button", "ldhNewMeal", controls, function () { pause(); cooking = createCooking(cooking.recipe); outcomeSaved = false; feedback.textContent = t("ldhPrepHint"); renderCooking(); });
    var feedback = el("p", "ldh-feedback", null, pages.cook); feedback.setAttribute("role", "status"); feedback.setAttribute("aria-live", "polite");
    function voiceKey(ending) { return "ldh" + partner.id.charAt(0).toUpperCase() + partner.id.slice(1) + ending; }
    function renderCooking() {
      if (!partner) { return; } var r = recipes.find(function (recipe) { return recipe.id === cooking.recipe; });
      cookPortrait.src = App.ldsSceneArt(partner.id, 0).src; dish.textContent = r.symbol; kitchen.setAttribute("data-phase", cooking.phase);
      if (cooking.phase !== "done" && !(cooking.phase === "heating" && cooking.helped)) { cookLine.textContent = t(voiceKey("Begin")); }
      Object.keys(recipeButtons).forEach(function (id) { recipeButtons[id].setAttribute("aria-pressed", String(id === cooking.recipe)); });
      while (prep.firstChild) { prep.removeChild(prep.firstChild); }
      r.items.forEach(function (id, index) { var item = el("li", "", null, prep); item.textContent = ingredients[id][0] + " " + t(ingredients[id][1]) + (index < cooking.prepared ? " ✓" : ""); item.setAttribute("data-ready", String(index < cooking.prepared)); });
      Object.keys(ingredientButtons).forEach(function (id) { ingredientButtons[id].disabled = cooking.phase !== "prep"; });
      zone.style.left = r.target[0] + "%"; zone.style.width = r.target[1] - r.target[0] + "%"; needle.style.left = cooking.heat + "%";
      meter.setAttribute("aria-valuenow", String(Math.round(cooking.heat))); meter.setAttribute("aria-valuetext", t("ldhHeatValue", { n: Math.round(cooking.heat), a: r.target[0], b: r.target[1] }));
      heatReadout.textContent = t("ldhHeatValue", { n: Math.round(cooking.heat), a: r.target[0], b: r.target[1] });
      heatButton.textContent = t(cooking.phase === "heating" ? "ldhPauseHeat" : cooking.phase === "paused" ? "ldhResumeHeat" : "ldhStartHeat");
      heatButton.disabled = ["ready", "heating", "paused"].indexOf(cooking.phase) < 0;
      serveButton.disabled = ["heating", "paused"].indexOf(cooking.phase) < 0; assistButton.disabled = cooking.phase !== "heating" || cooking.helped;
    }
    function finish() {
      if (cooking.phase !== "done") { return; } cancel(); options.onRunning(false);
      if (!outcomeSaved) {
        outcomeSaved = true; var home = progress.homes[partner.id], first = home.records[cooking.recipe] === 0 && cooking.stars > 0;
        home.records[cooking.recipe] = Math.max(home.records[cooking.recipe], cooking.stars); save();
        if (first) { options.onReward("cooking", cooking.recipe); }
        options.onMoment(cooking.stars ? "Win" : "Miss");
      }
      feedback.textContent = t(cooking.stars ? "ldhMealDone" : "ldhMealMiss", { n: cooking.stars });
      cookLine.textContent = t(voiceKey(cooking.stars ? "Finish" : "Begin")); renderCooking(); renderRoom();
    }
    function frame(now) {
      raf = null; if (cooking.phase !== "heating") { return; }
      if (document.hidden || options.isHidden() || pages.cook.hidden || now - last > 1000) { pause(); return; }
      stepCooking(cooking, Math.max(0, (now - last) / 1000)); last = now; renderCooking();
      if (cooking.phase === "done") { finish(); } else { raf = window.requestAnimationFrame(frame); }
    }
    function pause() { cancel(); cookingAction(cooking, "pause"); options.onRunning(false); renderCooking(); }
    pages.cook.addEventListener("keydown", function (event) { if (event.target.tagName === "BUTTON") { return; } if (event.key === " " && !serveButton.disabled) { event.preventDefault(); serveButton.click(); } if (event.key === "Escape" && cooking.phase === "heating") { event.preventDefault(); event.stopPropagation(); pause(); } });
    return { pause: pause, refresh: renderRoom, setPartner: function (next) { pause(); partner = next; chosenSlot = 0; cooking = createCooking("soup"); outcomeSaved = false; feedback.textContent = t("ldhPrepHint"); renderCooking(); renderRoom(); }, inspect: function () { return { cooking: cooking, progress: progress }; } };
  }
  var copy = {
    "ldsDateHome": ["⌂ Our room", "⌂ 我们的小屋"], "ldsDateCook": ["♨ Cook together", "♨ 一起下厨"],
    "ldhHomeTitle": ["A place for our days", "把日常留在这里"], "ldhHomeIntro": ["Choose the light, then a shelf position. Your date keepsakes belong here.", "选一种光线，再选一个陈列位置。把约会收获摆进你们的小屋。"],
    "ldhMorning": ["Morning", "晨光"], "ldhSunset": ["Sunset", "夕照"], "ldhNight": ["Night", "星夜"],
    "ldhDecorate": ["Shelf decorations", "陈列物品"], "ldhSlot": ["Shelf {n}: {item}", "陈列位 {n}：{item}"],
    "ldhEmpty": ["Empty space", "留白"], "ldhPlant": ["Plant", "绿植"], "ldhBook": ["Books", "书籍"], "ldhLamp": ["Lamp", "台灯"], "ldhRabbit": ["Plush rabbit", "兔子玩偶"], "ldhBadge": ["Kitty badge", "喵喵徽章"], "ldhPhoto": ["Photo frame", "合照相框"], "ldhLetter": ["Date letter", "约会信笺"], "ldhChef": ["Shared-meal trophy", "共餐奖杯"], "ldhLocked": ["Locked", "未获得"],
    "ldhUnlockHint": ["Catch the rabbit, win Kitty Cards, save a photo, or finish a date story to unlock keepsakes. Clear all three recipes with this partner for the meal trophy.", "抓到兔子、赢喵喵牌、保存照片或完成约会故事，都能解锁陈列物。与当前角色完成三道食谱，可以获得共餐奖杯。"],
    "ldhKitchenTitle": ["Dinner, made together", "一起做一顿晚餐"], "ldhKitchenIntro": ["Prepare ingredients in order. Start the heat, then serve inside the green band. A clean prep and perfect heat earn three stars.", "按顺序备料，开火后在绿色区间出锅。备料无误、火候恰好，可得三星。"],
    "ldhSoup": ["Garden soup", "田园浓汤"], "ldhToast": ["Apple toast", "苹果吐司"], "ldhPudding": ["Honey pudding", "蜂蜜布丁"],
    "ldhCarrot": ["Carrot", "胡萝卜"], "ldhMushroom": ["Mushroom", "蘑菇"], "ldhHerb": ["Herbs", "香草"], "ldhBread": ["Bread", "面包"], "ldhApple": ["Apple", "苹果"], "ldhHoney": ["Honey", "蜂蜜"], "ldhMilk": ["Milk", "牛奶"], "ldhEgg": ["Egg", "鸡蛋"],
    "ldhPrepHint": ["Follow the three ingredients from left to right.", "从左到右，按食谱准备三份食材。"], "ldhAdded": ["{item} is ready. Next ingredient!", "{item}准备好了，继续下一份！"], "ldhWrongIngredient": ["That isn't the next ingredient. Check the recipe; this meal can still earn two stars.", "下一份不是这个。再看看食谱，这一餐仍然可以得到两星。"],
    "ldhHeatHint": ["Serve in the green band. His assist slows the heat once per meal.", "在绿色区间出锅。他的帮助每餐可用一次，让火候上升得慢一点。"], "ldhHeat": ["Cooking heat", "烹饪火候"], "ldhHeatValue": ["Heat {n} · serve at {a}–{b}", "火候 {n} · 最佳区间 {a}–{b}"],
    "ldhStartHeat": ["Start heat", "开火"], "ldhPauseHeat": ["Pause", "暂停"], "ldhResumeHeat": ["Resume heat", "继续加热"], "ldhAssist": ["Ask for help", "请他帮忙"], "ldhServe": ["Serve · Space", "出锅 · 空格"], "ldhNewMeal": ["New meal", "再做一餐"], "ldhMealDone": ["Dinner is ready · {n} stars. Your best result is in the room's recipe book.", "晚餐做好了 · {n}星。最佳成绩已记入小屋的食谱。"], "ldhMealMiss": ["The heat wasn't right this time. Try another meal; the saved recipe record is safe.", "这次火候没掌握好，再做一餐吧。已有的食谱成绩会保留。"],
    "ldhXavierBegin": ["I'll keep an eye on the stove. You might want to keep an eye on me, too.", "我来盯着炉子。你可能也需要盯着我一点。"], "ldhXavierAssist": ["A smaller flame. We have time—I'm still awake.", "火调小一点。还有时间，我还醒着。"], "ldhXavierFinish": ["It smells good. Shall we sit by the window before it gets cold?", "闻起来很香。趁还热着，坐到窗边一起吃吧？"],
    "ldhZayneBegin": ["Ingredients first, then heat. I'll set out two bowls.", "先备料，再开火。我去摆好两只碗。"], "ldhZayneAssist": ["Steady heat. Watch the band; I'll handle the flame.", "保持稳定。你看着刻度，我来控制火焰。"], "ldhZayneFinish": ["Well done. Put the recipe aside. Dinner deserves your attention now.", "做得很好。先放下食谱，现在该认真吃饭了。"],
    "ldhRafayelBegin": ["A little colour on the plate! But yes, I'll follow your recipe this time.", "盘子里要有点颜色！好吧，这次我会按你的食谱来。"], "ldhRafayelAssist": ["A gentler flame, like glazing a painting. See? I can be useful in a kitchen.", "小一点的火，就像给画面罩染。看，我在厨房也能帮上忙。"], "ldhRafayelFinish": ["We made that? Wait, don't eat yet. This deserves a photograph.", "这是我们做的？等等，先别吃，值得拍张照片。"],
    "ldhSylusBegin": ["You're in charge tonight. Tell me what to prepare.", "今晚听你的。告诉我先准备什么。"], "ldhSylusAssist": ["Easy. I'll take the heat down. You decide when it's ready.", "别急，我把火调小。什么时候出锅，由你决定。"], "ldhSylusFinish": ["Not bad. Next time you pick the recipe again; I rather like this arrangement.", "不错。下次食谱也由你选，这样分工，我挺喜欢。"],
    "ldhCalebBegin": ["One for you, one for me. I'll try not to snack on the ingredients first.", "一份你的，一份我的。我尽量不提前偷吃食材。"], "ldhCalebAssist": ["I've got the stove. Keep your eyes on the timing—we're nearly there.", "炉子交给我。你看好时间，快要做好了。"], "ldhCalebFinish": ["Teamwork tastes pretty good. Save me a seat, and the bigger spoon.", "一起做的饭果然香。给我留个座位，还有那把大勺子。"]
  };
  var strings = { en: {}, zh: {} }; Object.keys(copy).forEach(function (key) { strings.en[key] = copy[key][0]; strings.zh[key] = copy[key][1]; }); App.addStrings(strings);
  App.ldsHomeRecipes = recipes; App.ldsReadHome = readHome; App.ldsCreateCooking = createCooking; App.ldsCookingAction = cookingAction; App.ldsStepCooking = stepCooking; App.mountLdsHome = mountHome;
})(window.CapitalConvert = window.CapitalConvert || {});
