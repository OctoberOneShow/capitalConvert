/* The fan edition's gallery and partner journey. Artwork stays local; objectives
 * are derived from the actual collections rather than a second reward ledger. */
(function (App) {
  "use strict";
  var ids = ["xavier", "zayne", "rafayel", "sylus", "caleb"];
  function node(tag, cls, key, parent) {
    var n = document.createElement(tag); if (cls) { n.className = cls; }
    if (key) { n.setAttribute("data-i18n", key); n.textContent = App.t(key); }
    if (parent) { parent.appendChild(n); } return n;
  }
  function button(cls, key, parent, action) {
    var n = node("button", cls, key, parent); n.type = "button";
    n.addEventListener("click", action); return n;
  }
  function readGallery(raw) {
    var out = { version: 1, favorites: {} }, saved;
    try { saved = JSON.parse(raw || "null"); } catch (_) {}
    ids.forEach(function (id) {
      var list = saved && saved.version === 1 && saved.favorites && saved.favorites[id];
      out.favorites[id] = Array.isArray(list) ? list.filter(function (n, i) {
        return Number.isInteger(n) && n >= 0 && n < App.ldsArtCount && list.indexOf(n) === i;
      }) : [];
    }); return out;
  }
  function journeyGoals(partner, album, dates, home, starpath) {
    var id = partner.id, room = home && home.homes && home.homes[id];
    return [
      { id: "photo", key: "ldrGoalPhoto", detail: "ldrGoalPhotoHint", done: !!(dates.snapshots && dates.snapshots[id]) },
      { id: "story", key: "ldrGoalStory", detail: "ldrGoalStoryHint", done: !!(dates.stories && dates.stories[id] && dates.stories[id].length) },
      { id: "starpath", key: "ldrGoalStarpath", detail: "ldrGoalStarpathHint", done: !!(starpath && starpath.cleared) },
      { id: "kitty", key: "ldrGoalKitty", detail: "ldrGoalKittyHint", done: !!(dates.badges && dates.badges[id]) },
      { id: "cook", key: "ldrGoalCook", detail: "ldrGoalCookHint", done: !!(room && Object.keys(room.records).some(function (key) { return room.records[key] > 0; })) },
      { id: "mission", key: "ldrGoalMission", detail: "ldrGoalMissionHint", done: Object.keys(album.memories || {}).some(function (key) { return key.indexOf(id + ":") === 0; }) }
    ];
  }
  function mountJourney(host, options) {
    var root = node("section", "ldr-journey", null, host);
    var top = node("div", "ldr-journey-top", null, root);
    var heading = node("div", "", null, top);
    node("span", "ldr-overline", "ldrJourneyTag", heading);
    var title = node("h4", "", null, heading), count = node("span", "ldr-journey-count", null, top);
    var track = node("div", "ldr-journey-track", null, root), fill = node("i", "", null, track);
    track.setAttribute("role", "progressbar"); track.setAttribute("aria-valuemin", "0"); track.setAttribute("aria-valuemax", "6");
    var next = node("p", "ldr-journey-next", null, root), recommendation;
    var go = button("ldr-journey-continue", null, root, function () { options.go(recommendation); });
    var details = node("details", "ldr-journey-details", null, root);
    node("summary", "", "ldrJourneyAll", details);
    var goals = node("div", "ldr-goals", null, details);
    function refresh() {
      var p = options.getPartner(), state = options.getState();
      var list = journeyGoals(p, state.album || {}, state.dates || {}, state.home || {}, state.starpath || {});
      var done = list.filter(function (goal) { return goal.done; }).length;
      recommendation = (list.find(function (goal) { return !goal.done; }) || { id: "starpath" }).id;
      title.textContent = App.t("ldrJourneyTitle", { name: App.t(p.nameKey) });
      count.textContent = done + " / 6"; fill.style.width = done / 6 * 100 + "%";
      track.setAttribute("aria-valuenow", String(done)); track.setAttribute("aria-label", title.textContent);
      next.textContent = App.t(done === 6 ? "ldrJourneyComplete" : list.find(function (goal) { return !goal.done; }).detail);
      go.textContent = App.t(done === 6 ? "ldrJourneyExplore" : "ldrJourneyContinue");
      while (goals.firstChild) { goals.removeChild(goals.firstChild); }
      list.forEach(function (goal) {
        var b = button("ldr-goal", null, goals, function () { options.go(goal.id); });
        b.setAttribute("data-goal", goal.id); b.setAttribute("data-complete", String(goal.done));
        node("span", "ldr-goal-mark", null, b).textContent = goal.done ? "✓" : "◇";
        node("span", "", null, b).textContent = App.t(goal.key);
        b.setAttribute("aria-label", App.t(goal.key) + " · " + App.t(goal.done ? "ldrCompleted" : "ldrAvailable"));
      });
    }
    return { element: root, refresh: refresh };
  }
  function mountGallery(host, options) {
    var root = node("section", "ldr-gallery", null, host);
    var saved = readGallery(App.storage.getItem("love-deepspace-gallery-v1"));
    var selected = 0, opened = false, restoreTarget = null, epoch = 0;
    var header = node("div", "ldr-gallery-header", null, root), heading = node("div", "", null, header);
    node("span", "ldr-overline", "ldrGalleryTag", heading);
    var title = node("h4", "", null, heading), subtitle = node("p", "", null, heading);
    var filterLabel = node("label", "ldr-filter-label", null, header);
    node("span", "", "ldrGalleryFilter", filterLabel);
    var filter = node("select", "ldr-gallery-filter", null, filterLabel);
    filter.setAttribute("aria-label", App.t("ldrGalleryFilter"));
    ["all", "favorites"].forEach(function (value) {
      var o = node("option", "", value === "all" ? "ldrGalleryAll" : "ldrGalleryFavorites", filter); o.value = value;
    }); filter.value = "all";
    filter.addEventListener("change", renderCards);
    var grid = node("div", "ldr-gallery-grid", null, root), empty = node("p", "ldr-gallery-empty", "ldrGalleryEmpty", root);
    var viewer = node("section", "ldr-viewer", null, root); viewer.hidden = true; viewer.tabIndex = -1;
    viewer.setAttribute("aria-label", App.t("ldrViewer"));
    var tools = node("div", "ldr-view-tools", null, viewer);
    var close = button("lds-small-button ldr-view-close", "ldrViewClose", tools, closeViewer);
    var favorite = button("lds-small-button ldr-view-favorite", null, tools, function () {
      var list = saved.favorites[options.getPartner().id], index = list.indexOf(selected);
      if (index < 0) { list.push(selected); } else { list.splice(index, 1); }
      App.storage.setItem("love-deepspace-gallery-v1", JSON.stringify(saved)); syncFavorite(); renderCards();
    });
    var download = node("a", "lds-small-button ldr-view-download", "ldrDownloadOriginal", tools);
    var viewport = node("div", "ldr-view-viewport", null, viewer);
    var picture = node("img", "ldr-view-image", null, viewport); picture.decoding = "async";
    var loading = node("p", "ldr-view-loading", null, viewport);
    var caption = node("div", "ldr-view-caption", null, viewer);
    var artTitle = node("h5", "", null, caption), position = node("span", "ldr-view-position", null, caption);
    var dimensions = node("p", "ldr-view-status", null, viewer); dimensions.setAttribute("role", "status");
    var controls = node("div", "ldr-view-controls", null, viewer);
    button("lds-small-button ldr-view-prev", "ldsGalleryPrev", controls, function () { openArt((selected + App.ldsArtCount - 1) % App.ldsArtCount); });
    var zoomLabel = node("label", "ldr-view-zoom-label", null, controls);
    node("span", "", "ldrViewZoom", zoomLabel);
    var zoom = node("input", "ldr-view-zoom", null, zoomLabel); zoom.type = "range"; zoom.min = "1"; zoom.max = "2"; zoom.step = ".1"; zoom.value = "1";
    zoom.setAttribute("aria-label", App.t("ldrViewZoom"));
    zoom.addEventListener("input", function () {
      var value = Math.max(1, Math.min(2, Number(zoom.value) || 1));
      picture.style.width = value * 100 + "%"; picture.style.maxWidth = "none";
      picture.style.height = value * 100 + "%";
    });
    button("lds-small-button ldr-view-next", "ldsGalleryNext", controls, function () { openArt((selected + 1) % App.ldsArtCount); });
    button("lds-small-button ldr-view-photo", "ldrUsePhoto", viewer, function () { options.onPhoto(selected); });
    node("p", "ldr-gallery-note", "ldrGalleryNote", root);
    function syncFavorite() {
      var active = saved.favorites[options.getPartner().id].indexOf(selected) >= 0;
      favorite.textContent = App.t(active ? "ldrFavoriteRemove" : "ldrFavoriteAdd"); favorite.setAttribute("aria-pressed", String(active));
    }
    function openArt(index, target) {
      selected = index; opened = true; if (target) { restoreTarget = target; }
      var p = options.getPartner(), art = App.ldsSceneArt(p.id, index), token = ++epoch;
      grid.hidden = true; empty.hidden = true; viewer.hidden = false; filterLabel.hidden = true;
      viewer.setAttribute("data-art", String(index));
      loading.textContent = App.t("ldrLoading"); loading.hidden = false; picture.hidden = true;
      dimensions.textContent = ""; zoom.value = "1"; picture.style.width = "100%"; picture.style.height = "100%";
      viewport.scrollTop = 0; viewport.scrollLeft = 0; download.hidden = true;
      picture.onload = function () {
        if (token !== epoch) { return; }
        picture.hidden = false; loading.hidden = true; download.hidden = false;
        dimensions.textContent = picture.naturalWidth + " × " + picture.naturalHeight + " · " + App.t("ldrOriginalSize");
      };
      picture.onerror = function () { if (token === epoch) { picture.hidden = true; loading.textContent = App.t("ldrImageError"); dimensions.textContent = App.t("ldrImageError"); } };
      picture.src = art.src; picture.alt = App.t(p.nameKey) + " · " + art.title;
      artTitle.textContent = art.title; position.textContent = (index + 1) + " / " + App.ldsArtCount;
      download.href = art.src; download.download = p.id + "-" + index + (index ? ".jpg" : ".webp");
      syncFavorite(); options.onArt(index); if (target) { close.focus({ preventScroll: true }); }
    }
    function closeViewer() {
      var restoreIndex = restoreTarget && restoreTarget.getAttribute("data-art");
      opened = false; ++epoch; viewer.hidden = true; filterLabel.hidden = false; renderCards();
      var target = restoreIndex != null && grid.querySelector('[data-art="' + restoreIndex + '"]');
      (target || filter).focus({ preventScroll: true });
    }
    function renderCards() {
      var p = options.getPartner(), list = saved.favorites[p.id];
      while (grid.firstChild) { grid.removeChild(grid.firstChild); }
      for (var i = 0; i < App.ldsArtCount; i++) {
        if (filter.value === "favorites" && list.indexOf(i) < 0) { continue; }
        (function (index) {
          var art = App.ldsSceneArt(p.id, index), card = button("ldr-art-card", null, grid, function () { openArt(index, card); });
          card.setAttribute("data-art", String(index)); card.setAttribute("aria-label", App.t("ldrOpenArt", { title: art.title }));
          var image = node("img", "", null, card); image.src = art.thumb; image.alt = ""; image.loading = "lazy"; image.decoding = "async";
          image.style.objectPosition = art.x * 100 + "% " + art.y * 100 + "%";
          node("span", "ldr-art-title", null, card).textContent = art.title;
          node("span", "ldr-art-index", null, card).textContent = String(index + 1).padStart(2, "0") + (list.indexOf(index) >= 0 ? " ♡" : " ↗");
        })(i);
      }
      grid.hidden = opened; empty.hidden = opened || grid.children.length > 0;
    }
    function refresh(reset) {
      var p = options.getPartner(); title.textContent = App.t("ldrGalleryTitle", { name: App.t(p.nameKey) });
      subtitle.textContent = App.t("ldrGalleryIntro", { n: App.ldsArtCount });
      filter.setAttribute("aria-label", App.t("ldrGalleryFilter")); viewer.setAttribute("aria-label", App.t("ldrViewer"));
      zoom.setAttribute("aria-label", App.t("ldrViewZoom"));
      if (reset) { opened = false; viewer.hidden = true; filterLabel.hidden = false; restoreTarget = null; ++epoch; }
      renderCards(); if (opened) { syncFavorite(); }
    }
    viewer.addEventListener("keydown", function (event) {
      if (!opened || options.isHidden()) { return; }
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); closeViewer(); return; }
      if (event.target && /INPUT|SELECT/.test(event.target.tagName)) { return; }
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault(); event.stopPropagation(); openArt((selected + (event.key === "ArrowRight" ? 1 : App.ldsArtCount - 1)) % App.ldsArtCount);
      }
    });
    return { element: root, refresh: refresh, close: closeViewer, inspect: function () { return { selected: selected, opened: opened, favorites: saved }; } };
  }
  var copy = {
    ldsGalleryTab: ["Gallery", "高清画廊"], ldrBrand: ["Love and Deepspace", "恋与深空"],
    ldrEdition: ["STARBOND · 1.0 FAN EDITION", "星间羁绊 · 1.0 同人版"],
    ldrSaveLocal: ["Progress saved on this browser", "进度保存在当前浏览器"], ldrSaveSession: ["Session progress · browser saving unavailable", "本次游玩进度 · 浏览器暂时无法保存"],
    ldrGalleryTag: ["THE MOMENTS WE KEEP", "把心动定格"], ldrGalleryTitle: ["{name} · The collection", "{name} · 光影收藏"],
    ldrGalleryIntro: ["{n} local artworks. Open a photograph to see every detail.", "{n} 张本地画面，展开照片，细看每一处心动。"],
    ldrGalleryFilter: ["Show", "筛选"], ldrGalleryAll: ["All artwork", "全部画面"], ldrGalleryFavorites: ["Favourites", "心动收藏"],
    ldrGalleryEmpty: ["A favourite is waiting to be found. Open an artwork and tap the heart.", "心动还未定格。打开画面，点亮爱心，留住喜欢的瞬间。"],
    ldrViewer: ["Original artwork viewer", "原图浏览"], ldrViewClose: ["← Collection", "← 返回画廊"],
    ldrViewZoom: ["Zoom", "放大"], ldrDownloadOriginal: ["↓ Original", "↓ 下载原图"], ldrUsePhoto: ["Compose a snapshot →", "去拍照馆创作 →"],
    ldrFavoriteAdd: ["♡ Favourite", "♡ 收藏心动"], ldrFavoriteRemove: ["♥ Favourited", "♥ 已收藏"],
    ldrOriginalSize: ["Original resolution", "原始分辨率"], ldrLoading: ["Opening your moment…", "正在展开这一刻…"],
    ldrImageError: ["This artwork could not be loaded. Choose another photograph or try again.", "这张画面暂时无法加载，可切换照片或重新打开。"],
    ldrOpenArt: ["Open {title}", "打开 {title}"], ldrGalleryNote: ["Official artwork © Infold / Papergames. Gallery and original fan gameplay by this project.", "官方角色画面 © Infold / 叠纸。本项目为同人画廊与原创玩法。"],
    ldrJourneyTag: ["A LITTLE CLOSER", "慢慢靠近"], ldrJourneyTitle: ["Your journey with {name}", "与{name}的心动旅程"],
    ldrJourneyAll: ["Six moments to discover", "展开六个心动目标"], ldrJourneyContinue: ["Make our next memory →", "留下下一个回忆 →"],
    ldrJourneyExplore: ["Explore the constellations →", "继续探索星轨 →"], ldrJourneyComplete: ["Six moments, one shared journey. Keep exploring for better stars and new memories.", "六个瞬间，一段共同的旅程。继续探索，收集更多星光与回忆。"],
    ldrGoalPhoto: ["Our first photograph", "第一张合照"], ldrGoalPhotoHint: ["Start with a photograph. Choose an artwork, frame it your way, and save the moment.", "从一张照片开始：选择画面，调整构图，保存你们的瞬间。"],
    ldrGoalStory: ["A story for two", "双人故事"], ldrGoalStoryHint: ["Choose how a date unfolds and discover your first story ending.", "决定约会的走向，收藏第一个故事结局。"],
    ldrGoalStarpath: ["A constellation between us", "星光相连"], ldrGoalStarpathHint: ["Rotate the stars and guide a thread of light to your partner in Starpath.", "旋转星点，让一束光沿着星轨抵达搭档身边。"],
    ldrGoalKitty: ["A playful victory", "默契胜局"], ldrGoalKittyHint: ["Earn a Kitty Cards badge. Matching cup colours double your card's value.", "赢得喵喵牌徽章。同色杯子会让卡牌分值翻倍。"],
    ldrGoalCook: ["Made with care", "亲手做的心意"], ldrGoalCookHint: ["Prepare a meal together and serve it inside the green timing band.", "一起准备一份料理，在绿色温度区间出锅。"],
    ldrGoalMission: ["Into the deep, together", "并肩深入深空"], ldrGoalMissionHint: ["Complete a mission in Action or Strategy to collect a route memory.", "完成动作或策略任务，收藏一段航线回忆。"],
    ldrCompleted: ["Completed", "已完成"], ldrAvailable: ["Ready to explore", "等待探索"]
  };
  var strings = { en: {}, zh: {} }; Object.keys(copy).forEach(function (key) { strings.en[key] = copy[key][0]; strings.zh[key] = copy[key][1]; }); App.addStrings(strings);
  App.ldsReadGallery = readGallery; App.ldsJourneyGoals = journeyGoals;
  App.mountLdsGallery = mountGallery; App.mountLdsJourney = mountJourney;
})(window.CapitalConvert = window.CapitalConvert || {});
