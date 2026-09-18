/* Shared runtime - I18n lookups, theme and motion controls, status/history plumbing, the draggable layout, background scenery and page cursor decorations. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  var I18N = App.I18N;
  /* Quiet-reset hooks: every game registers its reset here so the
   * shared drawer can reset all six without knowing them. */
  App.quietResetTyping = null;
  App.quietResetMemory = null;
  App.quietReset2048 = null;
  App.quietResetReflex = null;
  App.quietResetCaretDash = null;
  App.quietResetElements = null;
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

    /* The companion widget is injected before this runs, so a plain
       querySelectorAll("button") also picks up its controls. The ripple is
       positioned against the nearest positioned ancestor, and the pet defines
       none on its buttons: inside #petButton it resolves to .pet-stage and
       inside .pet-action to the fixed .pet-widget, so the 108px circle scales
       to 432px outside its button, overflows the scrolling .pet-panel and
       makes the card's horizontal scrollbar flash at its bottom edge. The page
       ripple stays a page decoration; the pet has its own click feedback. */
    document.querySelectorAll("button").forEach(function (button) {
      if (button.closest && button.closest("#petWidget")) {
        return;
      }
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
          dir: t("dir" + direction.charAt(0).toUpperCase() + direction.slice(1)),
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


  /* Exported for the other modules. */
  App.getFileName = getFileName;
  App.t = t;
  App.applyI18nDom = applyI18nDom;
  App.initLanguagePicker = initLanguagePicker;
  App.getElement = getElement;
  App.getLineCount = getLineCount;
  App.updateAllCounters = updateAllCounters;
  App.saveUndoAction = saveUndoAction;
  App.setStatus = setStatus;
  App.logAction = logAction;
  App.setChangeSummary = setChangeSummary;
  App.setDiffPreview = setDiffPreview;
  App.renderMatchedRuleSummary = renderMatchedRuleSummary;
  App.buildChangeSummary = buildChangeSummary;
  App.buildDiffSnippet = buildDiffSnippet;
  App.triggerConvertFX = triggerConvertFX;
  App.createConfetti = createConfetti;
  App.isMotionOff = isMotionOff;
  App.isMotionCalm = isMotionCalm;
  App.currentLang = currentLang;
  App.setActiveNav = setActiveNav;
  App.initTheme = initTheme;
  App.initMotionControls = initMotionControls;
  App.initHistoryDrawer = initHistoryDrawer;
  App.initBackground = initBackground;
  App.initAmbientOrbs = initAmbientOrbs;
  App.initAnimations = initAnimations;
  App.initTypingEffect = initTypingEffect;
  App.initSectionParallax = initSectionParallax;
  App.applySavedLayout = applySavedLayout;
  App.initDraggableSections = initDraggableSections;
  App.initResetLayout = initResetLayout;
  App.initUndo = initUndo;
  App.initCursorEffect = initCursorEffect;
  App.initPageClickEffect = initPageClickEffect;
  App.initAmbientDust = initAmbientDust;
  App.initHoverSparks = initHoverSparks;
})(window.CapitalConvert = window.CapitalConvert || {});
