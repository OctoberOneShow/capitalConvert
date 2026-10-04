/* Dream Orchestra - the step-sequencer composition puzzle of the game drawer.
 * Every piece's target is dealt FROM a valid solution, so the puzzle is
 * solvable by construction, and the par (the note count of that solution) is
 * measured with the exported matcher instead of guessed. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  var t = App.t;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  var createCampaign = App.createCampaign;
  var fillCampaignPicker = App.fillCampaignPicker;
  var starsFor = App.starsFor;

  var drmSteps = 16;
  var drmRows = 8;
  var drmRowNames = ["C", "D", "E", "F", "G", "A", "B", "c"];
  /* Registers are disjoint, so a grid row belongs to exactly one voice and a
   * cell click never has to guess which line the player means. */
  var drmVoices = [
    { id: "bass", glyph: "B", keyName: "drmVBass", lo: 0, hi: 2, wave: "triangle", midi: 36 },
    { id: "str", glyph: "S", keyName: "drmVStr", lo: 3, hi: 5, wave: "sawtooth", midi: 51 },
    { id: "bell", glyph: "T", keyName: "drmVBell", lo: 6, hi: 7, wave: "sine", midi: 74 },
  ];

  var drmLevels = [
    { id: "d1", labelKey: "drmP1", seed: 4101, voices: ["bass"], beats: [0, 4, 8, 12],
      rest: 0, rules: { bassRun: 2, strRun: 2, bellRun: 1, bellGap: 3 }, stepMs: 320 },
    { id: "d2", labelKey: "drmP2", seed: 4202, voices: ["bass", "str"], beats: [0, 2, 4, 6, 8, 10, 12, 14],
      rest: 0.35, rules: { bassRun: 2, strRun: 2, bellRun: 1, bellGap: 3 }, stepMs: 300 },
    { id: "d3", labelKey: "drmP3", seed: 4303, voices: ["bass", "bell"], beats: [0, 4, 6, 8, 12, 14],
      rest: 0.2, rules: { bassRun: 2, strRun: 2, bellRun: 1, bellGap: 5 }, stepMs: 280 },
    { id: "d4", labelKey: "drmP4", seed: 4404, voices: ["bass", "str"], beats: [0, 3, 6, 9, 12, 15],
      rest: 0.15, rules: { bassRun: 2, strRun: 2, bellRun: 1, bellGap: 3 }, stepMs: 260 },
    { id: "d5", labelKey: "drmP5", seed: 4505, voices: ["bass", "str", "bell"], beats: [0, 2, 4, 6, 8, 10, 12, 14],
      rest: 0.1, rules: { bassRun: 1, strRun: 2, bellRun: 1, bellGap: 4 }, stepMs: 240 },
  ];

  function mulberry32(seed) {
    var value = seed >>> 0;
    return function () {
      value = (value + 0x6d2b79f5) >>> 0;
      var mixed = Math.imul(value ^ (value >>> 15), 1 | value);
      mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
      return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
    };
  }

  function drmEmptyPattern() {
    var pattern = {};
    drmVoices.forEach(function (voice) {
      var line = [];
      for (var i = 0; i < drmSteps; i += 1) {
        line.push(-1);
      }
      pattern[voice.id] = line;
    });
    return pattern;
  }

  function drmVoiceById(id) {
    for (var i = 0; i < drmVoices.length; i += 1) {
      if (drmVoices[i].id === id) {
        return drmVoices[i];
      }
    }
    return null;
  }

  function drmRowVoice(row) {
    for (var i = 0; i < drmVoices.length; i += 1) {
      if (row >= drmVoices[i].lo && row <= drmVoices[i].hi) {
        return drmVoices[i];
      }
    }
    return null;
  }

  function drmRunLimit(rules, id) {
    if (id === "bass") {
      return rules.bassRun;
    }
    if (id === "str") {
      return rules.strRun;
    }
    return rules.bellRun;
  }

  /* The target is drawn as a legal line of notes on the level's beats: a voice
   * is only picked when the run and rest rules stay happy, so the strong-beat
   * skeleton alone is always a valid solution - that is what makes par real. */
  function drmDealTarget(level) {
    var rng = mulberry32(level.seed);
    var target = [];
    var last = {};
    var run = {};
    var i, j;
    for (i = 0; i < drmSteps; i += 1) {
      target.push(null);
    }
    for (i = 0; i < level.voices.length; i += 1) {
      last[level.voices[i]] = -99;
      run[level.voices[i]] = 0;
    }
    for (j = 0; j < level.beats.length; j += 1) {
      var step = level.beats[j];
      var eligible = [];
      for (i = 0; i < level.voices.length; i += 1) {
        var id = level.voices[i];
        var prevRun = last[id] === step - 1 ? run[id] : 0;
        if (prevRun + 1 > drmRunLimit(level.rules, id)) {
          continue;
        }
        if (id === "bell" && step - last.bell < level.rules.bellGap) {
          continue;
        }
        eligible.push(id);
      }
      var mustPlace = level.beats.length - j <= 4 - drmCountTarget(target);
      if (!eligible.length) {
        continue;
      }
      if (!mustPlace && rng() < level.rest) {
        continue;
      }
      var voiceId = eligible[Math.floor(rng() * eligible.length) % eligible.length];
      var voice = drmVoiceById(voiceId);
      var span = voice.hi - voice.lo + 1;
      var row = voice.lo + Math.floor(rng() * span) % Math.max(1, span);
      target[step] = { v: voiceId, r: row };
      run[voiceId] = last[voiceId] === step - 1 ? run[voiceId] + 1 : 1;
      last[voiceId] = step;
    }
    return target;
  }

  function drmCountTarget(target) {
    var n = 0;
    for (var i = 0; i < target.length; i += 1) {
      if (target[i]) {
        n += 1;
      }
    }
    return n;
  }

  function drmTargetPattern(target) {
    var pattern = drmEmptyPattern();
    for (var i = 0; i < target.length; i += 1) {
      if (target[i]) {
        pattern[target[i].v][i] = target[i].r;
      }
    }
    return pattern;
  }

  /* Per-step pass/fail against the target: on a target step the exact voice
   * and pitch must sound and every other voice must rest, so the "mixed"
   * colour of the reference line is part of the puzzle, not the freedom. */
  function drmMatch(pattern, target) {
    var steps = [];
    var matched = 0;
    var total = 0;
    for (var s = 0; s < drmSteps; s += 1) {
      var want = target[s];
      if (!want) {
        steps.push(true);
        continue;
      }
      total += 1;
      var ok = pattern[want.v] && pattern[want.v][s] === want.r;
      for (var i = 0; ok && i < drmVoices.length; i += 1) {
        var id = drmVoices[i].id;
        if (id !== want.v && pattern[id][s] !== -1) {
          ok = false;
        }
      }
      steps.push(ok);
      if (ok) {
        matched += 1;
      }
    }
    return { steps: steps, matched: matched, total: total, done: total > 0 && matched === total };
  }

  /* Rule breaks as data; the UI turns them into sentences. */
  function drmViolations(pattern, rules) {
    var out = [];
    drmVoices.forEach(function (voice) {
      var line = pattern[voice.id];
      if (!line) {
        return;
      }
      var runLen = 0;
      var lastAt = -99;
      var limit = drmRunLimit(rules, voice.id);
      var gap = voice.id === "bell" ? rules.bellGap : 0;
      for (var s = 0; s < drmSteps; s += 1) {
        if (line[s] === -1) {
          runLen = 0;
          continue;
        }
        runLen = s === lastAt + 1 ? runLen + 1 : 1;
        if (runLen > limit) {
          out.push({ voice: voice.id, step: s, kind: "run", n: limit });
        }
        if (gap && lastAt >= 0 && s - lastAt < gap) {
          out.push({ voice: voice.id, step: s, kind: "gap", n: gap });
        }
        lastAt = s;
      }
    });
    return out;
  }

  /* Measured par: the strong-beat-only pattern is the solution the target was
   * drawn from; verify it is legal, then its note count is the band top. */
  function drmPar(level) {
    var target = level.target || drmDealTarget(level);
    var pattern = drmTargetPattern(target);
    var breaks = drmViolations(pattern, level.rules);
    var m = drmMatch(pattern, target);
    var count = breaks.length === 0 && m.done ? m.total : Math.max(1, drmCountTarget(target));
    return [count, count + 2, count + 4];
  }

  function drmFrequency(voice, row) {
    var midi = voice.midi + (row - voice.lo);
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  function initDreamOrchestraGame(panelEl) {
    if (!panelEl) {
      return;
    }

    var campaign = createCampaign({ key: "dream-orchestra-campaign", levels: drmLevels });
    var level = drmLevels[campaign.indexOf(campaign.nextLevelId())] || drmLevels[0];
    var target = level.target || drmDealTarget(level);
    var pattern = drmEmptyPattern();
    var currentVoice = level.voices[0];
    var cursor = { row: 0, step: 0 };
    var finished = false;
    var playing = false;
    var startAt = 0;
    var lastIdx = -1;
    var rafId = null;
    var muted = false;
    var audio = null;
    var nodes = [];

    var hud = document.createElement("div");
    hud.className = "game-hud";
    var voiceEl = document.createElement("strong");
    var notesEl = document.createElement("strong");
    var matchEl = document.createElement("strong");
    var stepEl = document.createElement("strong");
    hud.appendChild(makeStat("drmVoiceLabel", voiceEl));
    hud.appendChild(makeStat("drmNotesLabel", notesEl));
    hud.appendChild(makeStat("drmMatchLabel", matchEl));
    hud.appendChild(makeStat("drmStepLabel", stepEl));

    var targetRow = document.createElement("div");
    targetRow.className = "drm-target";
    var targetLabel = document.createElement("span");
    targetLabel.setAttribute("data-i18n", "drmTargetLabel");
    targetLabel.textContent = t("drmTargetLabel");
    var targetCells = [];
    var targetLine = document.createElement("div");
    targetLine.className = "drm-targetline";
    targetLine.setAttribute("aria-hidden", "true");
    for (var s0 = 0; s0 < drmSteps; s0 += 1) {
      var cellSpan = document.createElement("span");
      cellSpan.className = "drm-tcell";
      targetLine.appendChild(cellSpan);
      targetCells.push(cellSpan);
    }
    targetRow.appendChild(targetLabel);
    targetRow.appendChild(targetLine);

    var voiceRow = document.createElement("div");
    voiceRow.className = "drm-voices";
    var voiceButtons = [];
    drmVoices.forEach(function (voice, vi) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "drm-voicebtn";
      btn.setAttribute("aria-pressed", "false");
      btn.textContent = voice.glyph + " " + t(voice.keyName);
      btn.addEventListener("click", function () {
        setVoice(voice.id);
      });
      voiceRow.appendChild(btn);
      voiceButtons.push({ btn: btn, voice: voice });
    });

    var grid = document.createElement("div");
    grid.className = "drm-grid";
    grid.setAttribute("tabindex", "0");
    grid.setAttribute("role", "application");
    grid.setAttribute("aria-label", t("drmGridLabel"));

    var transport = document.createElement("div");
    transport.className = "drm-transport";
    var playBtn = document.createElement("button");
    playBtn.type = "button";
    playBtn.setAttribute("data-i18n", "drmBtnPlay");
    playBtn.textContent = t("drmBtnPlay");
    var stopBtn = document.createElement("button");
    stopBtn.type = "button";
    stopBtn.setAttribute("data-i18n", "drmBtnStop");
    stopBtn.textContent = t("drmBtnStop");
    var refBtn = document.createElement("button");
    refBtn.type = "button";
    refBtn.setAttribute("data-i18n", "drmBtnRef");
    refBtn.textContent = t("drmBtnRef");
    var muteBtn = document.createElement("button");
    muteBtn.type = "button";
    muteBtn.setAttribute("aria-pressed", "false");
    muteBtn.textContent = t("drmSoundOn");
    [playBtn, stopBtn, refBtn, muteBtn].forEach(function (btn) {
      transport.appendChild(btn);
    });

    var result = document.createElement("p");
    result.className = "game-result";
    result.setAttribute("role", "status");

    var pieceRow = document.createElement("div");
    pieceRow.className = "elements-row";
    var pieceLabel = document.createElement("label");
    pieceLabel.className = "elements-label";
    pieceLabel.setAttribute("for", "drmPieceSel");
    pieceLabel.setAttribute("data-i18n", "drmPieceSelectLabel");
    pieceLabel.textContent = t("drmPieceSelectLabel");
    var pieceSel = document.createElement("select");
    pieceSel.className = "elements-select";
    pieceSel.id = "drmPieceSel";
    pieceRow.appendChild(pieceLabel);
    pieceRow.appendChild(pieceSel);

    var actions = document.createElement("div");
    actions.className = "game-actions";
    var newBtn = document.createElement("button");
    newBtn.type = "button";
    newBtn.className = "primary";
    var newLabel = document.createElement("span");
    newLabel.setAttribute("data-i18n", "btnNewRound");
    newLabel.textContent = t("btnNewRound");
    var newContent = document.createElement("span");
    newContent.className = "button-content";
    newContent.appendChild(newLabel);
    newBtn.appendChild(newContent);
    var starsEl = document.createElement("p");
    starsEl.className = "game-best";
    actions.appendChild(newBtn);
    actions.appendChild(starsEl);

    var hint = document.createElement("p");
    hint.className = "game-hint";
    hint.setAttribute("data-i18n", "drmHint");
    hint.textContent = t("drmHint");

    [hud, targetRow, voiceRow, grid, transport, result, pieceRow, actions, hint].forEach(function (node) {
      panelEl.appendChild(node);
    });

    function makeStat(key, valueEl) {
      var stat = document.createElement("div");
      stat.className = "game-stat";
      var label = document.createElement("span");
      label.setAttribute("data-i18n", key);
      label.textContent = t(key);
      stat.appendChild(label);
      stat.appendChild(valueEl);
      return stat;
    }

    var cellButtons = [];
    function buildGrid() {
      grid.textContent = "";
      cellButtons = [];
      for (var row = drmRows - 1; row >= 0; row -= 1) {
        var line = document.createElement("div");
        line.className = "drm-line";
        var head = document.createElement("span");
        head.className = "drm-rowname";
        head.textContent = drmRowNames[row];
        line.appendChild(head);
        var byStep = [];
        for (var step = 0; step < drmSteps; step += 1) {
          var btn = document.createElement("button");
          btn.type = "button";
          btn.className = "drm-cell" + (step % 4 === 0 ? " is-strong" : "");
          (function (r, c) {
            btn.addEventListener("pointerdown", function (event) {
              event.preventDefault();
              toggle(r, c);
            });
          })(row, step);
          line.appendChild(btn);
          byStep.push(btn);
        }
        grid.appendChild(line);
        cellButtons.push({ row: row, cells: byStep });
      }
    }

    function placedCount() {
      var n = 0;
      drmVoices.forEach(function (voice) {
        pattern[voice.id].forEach(function (r) {
          if (r !== -1) {
            n += 1;
          }
        });
      });
      return n;
    }

    function renderHud(m, breaks) {
      var voice = drmVoiceById(currentVoice);
      voiceEl.textContent = voice ? t(voice.keyName) : currentVoice;
      var par = level.starCredits ? level.starCredits[0] : 0;
      notesEl.textContent = t("drmNotesCount", { n: placedCount(), par: par });
      matchEl.textContent = t("drmMatchCount", { n: m.matched, total: m.total });
      if (playing) {
        stepEl.textContent = t("drmStepText", { n: lastIdx + 1, total: drmSteps });
      } else {
        stepEl.textContent = t("drmCursorText", { n: cursor.step + 1, pitch: drmRowNames[cursor.row] });
      }
    }

    function renderTarget() {
      for (var s = 0; s < drmSteps; s += 1) {
        var want = target[s];
        targetCells[s].textContent = want
          ? drmVoiceById(want.v).glyph + drmRowNames[want.r]
          : "\u00b7";
      }
    }

    function render() {
      var m = drmMatch(pattern, target);
      var breaks = drmViolations(pattern, level.rules);
      renderHud(m, breaks);
      cellButtons.forEach(function (line) {
        line.cells.forEach(function (btn, s) {
          var row = line.row;
          var owner = drmRowVoice(row);
          var noteRow = owner ? pattern[owner.id][s] : -1;
          var text = "\u00b7";
          var cls = "drm-cell" + (s % 4 === 0 ? " is-strong" : "");
          if (noteRow === row && owner) {
            text = drmRowNames[row] + owner.glyph;
            cls += " has-note";
          } else if (target[s] && target[s].r === row) {
            text = "\u25c7";
            cls += " is-target";
          }
          if (cursor.row === row && cursor.step === s) {
            cls += " is-cursor";
          }
          if (playing && lastIdx === s) {
            cls += " is-caret";
          }
          btn.className = cls;
          btn.textContent = text;
          btn.setAttribute(
            "aria-label",
            t("drmCellAria", {
              step: s + 1,
              pitch: drmRowNames[row],
              voice: owner ? t(owner.keyName) : "",
              state: noteRow === row ? t("drmFilled") : target[s] && target[s].r === row ? t("drmWanted") : t("drmEmptyCell"),
            }),
          );
        });
      });
      voiceButtons.forEach(function (entry) {
        entry.btn.setAttribute("aria-pressed", entry.voice.id === currentVoice ? "true" : "false");
      });
      if (breaks.length) {
        var parts = [];
        for (var i = 0; i < breaks.length && i < 3; i += 1) {
          var b = breaks[i];
          var v = drmVoiceById(b.voice);
          parts.push(
            b.kind === "run"
              ? t("drmViolRun", { voice: t(v.keyName), n: b.n, s: b.step + 1 })
              : t("drmViolGap", { voice: t(v.keyName), n: b.n, s: b.step + 1 }),
          );
        }
        if (!finished) {
          result.textContent = parts.join(" ") + (breaks.length > 3 ? " +" + (breaks.length - 3) : "");
        }
      }
      return m;
    }

    function refreshPicker() {
      fillCampaignPicker(
        pieceSel,
        campaign,
        function (def) {
          return t(def.labelKey);
        },
        t("elementsLocked"),
      );
      pieceSel.value = level.id;
      starsEl.textContent = t("campaignStars", {
        n: campaign.totalStars(),
        max: campaign.maxStars(),
      });
    }

    function setVoice(id) {
      currentVoice = id;
      var voice = drmVoiceById(id);
      if (voice && (cursor.row < voice.lo || cursor.row > voice.hi)) {
        cursor.row = voice.lo;
      }
      render();
    }

    function toggle(row, step) {
      if (finished) {
        return;
      }
      var owner = drmRowVoice(row);
      if (!owner) {
        return;
      }
      cursor.row = row;
      cursor.step = step;
      if (pattern[owner.id][step] === row) {
        pattern[owner.id][step] = -1;
      } else {
        pattern[owner.id][step] = row;
      }
      checkWin(render());
    }

    function clearVoice() {
      if (finished) {
        return;
      }
      for (var s = 0; s < drmSteps; s += 1) {
        pattern[currentVoice][s] = -1;
      }
      checkWin(render());
    }

    function checkWin(m) {
      if (finished || !m.done) {
        return;
      }
      if (drmViolations(pattern, level.rules).length) {
        return;
      }
      finish();
    }

    function finish() {
      finished = true;
      stopPlayback();
      var notes = placedCount();
      var starsWon = starsFor(notes, level.starCredits, "low");
      var outcome = campaign.record(level.id, {
        stars: starsWon,
        best: notes,
        better: "low",
      });
      var message = t("drmWon", { name: t(level.labelKey), n: notes, s: starsWon });
      if (outcome.isBest) {
        message += " " + t("newBest");
      }
      if (outcome.unlockedNext) {
        message += " " + t("drmNextPiece");
      } else if (campaign.clearedCount() === drmLevels.length) {
        message += " " + t("drmAllPieces");
      }
      result.textContent = message;
      logAction(t("logDreamOrchestra", { name: t(level.labelKey), n: notes }));
      var rect = newBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      refreshPicker();
    }

    /* Audio exists only after a gesture, and every call below is a no-op when
     * the browser (or the headless harness) has no AudioContext at all. */
    function ensureAudio() {
      if (audio || muted) {
        return;
      }
      var Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) {
        return;
      }
      audio = new Ctor();
    }

    function scheduleLine(src) {
      if (!audio || muted) {
        return;
      }
      var t0 = audio.currentTime + 0.08;
      for (var s = 0; s < drmSteps; s += 1) {
        var notes = [];
        drmVoices.forEach(function (voice) {
          if (Array.isArray(src)) {
            if (src[s] && src[s].v === voice.id) {
              notes.push({ voice: voice, row: src[s].r });
            }
          } else if (src[voice.id][s] !== -1) {
            notes.push({ voice: voice, row: src[voice.id][s] });
          }
        });
        notes.forEach(function (note) {
          var osc = audio.createOscillator();
          var gain = audio.createGain();
          osc.type = note.voice.wave;
          osc.frequency.value = drmFrequency(note.voice, note.row);
          var at = t0 + (s * level.stepMs) / 1000;
          var len = Math.max(0.06, (level.stepMs / 1000) * 0.85);
          gain.gain.setValueAtTime(note.voice.id === "bell" ? 0.18 : 0.14, at);
          gain.gain.exponentialRampToValueAtTime(0.001, at + len);
          osc.connect(gain);
          gain.connect(audio.destination);
          osc.start(at);
          osc.stop(at + len);
          nodes.push(osc);
        });
      }
    }

    function stopNodes() {
      for (var i = 0; i < nodes.length; i += 1) {
        try {
          nodes[i].stop();
        } catch (error) {
          /* already finished */
        }
      }
      nodes = [];
    }

    function startPlayback(src) {
      ensureAudio();
      if (audio && audio.state !== "running") {
        audio.resume();
      }
      playing = true;
      startAt = performance.now();
      lastIdx = -1;
      startLoop();
      scheduleLine(src);
      render();
    }

    function stopPlayback() {
      playing = false;
      lastIdx = -1;
      stopNodes();
      render();
    }

    function frame() {
      if (rafId === null) {
        return;
      }
      if (panelEl.hidden || document.hidden) {
        if (playing) {
          stopPlayback();
        }
        rafId = window.requestAnimationFrame(frame);
        return;
      }
      if (playing) {
        var idx = Math.floor((performance.now() - startAt) / level.stepMs);
        if (idx >= drmSteps) {
          stopPlayback();
        } else if (idx !== lastIdx) {
          lastIdx = idx;
          renderHud(drmMatch(pattern, target), []);
          render();
        }
      }
      rafId = window.requestAnimationFrame(frame);
    }

    function startLoop() {
      if (rafId !== null) {
        return;
      }
      rafId = window.requestAnimationFrame(frame);
    }

    function stopLoop() {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
    }

    function loadPiece(levelDef) {
      stopPlayback();
      stopLoop();
      level = levelDef;
      target = level.target || drmDealTarget(level);
      pattern = drmEmptyPattern();
      currentVoice = level.voices[0];
      cursor = { row: drmVoiceById(currentVoice).lo, step: 0 };
      finished = false;
      renderTarget();
      refreshPicker();
      render();
      result.textContent = t("drmPrompt", {
        name: t(level.labelKey),
        n: level.starCredits[0],
      });
    }

    playBtn.addEventListener("click", function () {
      if (!playing) {
        startPlayback(pattern);
      }
    });
    stopBtn.addEventListener("click", function () {
      if (playing) {
        stopPlayback();
      }
    });
    refBtn.addEventListener("click", function () {
      if (!playing) {
        startPlayback(target);
      }
    });
    muteBtn.addEventListener("click", function () {
      muted = !muted;
      if (muted) {
        stopNodes();
      }
      muteBtn.setAttribute("aria-pressed", muted ? "true" : "false");
      muteBtn.textContent = muted ? t("drmSoundOff") : t("drmSoundOn");
    });
    newBtn.addEventListener("click", function () {
      loadPiece(level);
    });

    panelEl.addEventListener("keydown", function (event) {
      var key = event.key;
      /* The drawer injects the how-to guide into this same panel; its summary
       * needs Enter/Space natively, so never swallow keys from that subtree. */
      if (event.target && event.target.closest && event.target.closest(".game-guide")) {
        return;
      }
      if (key === "ArrowLeft" || key === "ArrowRight") {
        event.preventDefault();
        cursor.step = (cursor.step + (key === "ArrowRight" ? 1 : drmSteps - 1)) % drmSteps;
        render();
        return;
      }
      if (key === "ArrowUp" || key === "ArrowDown") {
        event.preventDefault();
        cursor.row = cursor.row + (key === "ArrowUp" ? 1 : -1);
        if (cursor.row < 0) {
          cursor.row = 0;
        }
        if (cursor.row > drmRows - 1) {
          cursor.row = drmRows - 1;
        }
        render();
        return;
      }
      if (key === "Enter" || key === " ") {
        event.preventDefault();
        toggle(cursor.row, cursor.step);
        return;
      }
      if (key === "Backspace") {
        event.preventDefault();
        clearVoice();
        return;
      }
      if (key === "1" || key === "2" || key === "3") {
        event.preventDefault();
        var voice = drmVoices[Number(key) - 1];
        if (voice && level.voices.indexOf(voice.id) !== -1) {
          setVoice(voice.id);
        }
        return;
      }
      if (key === "p" || key === "P") {
        event.preventDefault();
        if (!playing) {
          startPlayback(pattern);
        }
        return;
      }
      if (key === "s" || key === "S") {
        event.preventDefault();
        if (playing) {
          stopPlayback();
        }
      }
    });

    pieceSel.addEventListener("change", function () {
      var index = campaign.indexOf(pieceSel.value);
      if (index >= 0 && campaign.isUnlocked(pieceSel.value)) {
        loadPiece(drmLevels[index]);
      } else {
        pieceSel.value = level.id;
      }
    });

    App.quietResetDreamOrchestra = function () {
      var wasPlaying = playing;
      stopPlayback();
      stopLoop();
      if (wasPlaying && !finished) {
        result.textContent = t("drmPaused");
      }
    };

    buildGrid();
    loadPiece(drmLevels[campaign.indexOf(campaign.nextLevelId())] || drmLevels[0]);
    startLoop();
  }

  /* Bilingual copy travels with the game: addStrings only fills keys i18n.js
   * does not already own, so the shared dictionary stays authoritative. */
  App.addStrings({
    en: {
      "tabDreamOrchestra": "Dream Orchestra",
      "drmP1": "Four-Note Bassline",
      "drmP2": "Call and Response",
      "drmP3": "Bell Gardens",
      "drmP4": "Mirror Canon",
      "drmP5": "The Full Dream",
      "drmVBass": "Bass",
      "drmVStr": "Strings",
      "drmVBell": "Bells",
      "drmVoiceLabel": "Voice",
      "drmNotesLabel": "Notes",
      "drmMatchLabel": "Match",
      "drmStepLabel": "Playhead",
      "drmPieceSelectLabel": "Choose a piece",
      "drmGridLabel": "Sixteen-step grid: arrows move the cell, Enter or Space toggles a note, 1-3 switch voice, Backspace clears the voice",
      "drmTargetLabel": "Target on the marked beats:",
      "drmNotesCount": "{n}/{par}",
      "drmMatchCount": "{n}/{total}",
      "drmStepText": "step {n}/{total}",
      "drmCursorText": "at {n}, {pitch}",
      "drmCellAria": "{voice} {pitch} at step {n}, {state}",
      "drmFilled": "note placed",
      "drmWanted": "target wants a note here",
      "drmEmptyCell": "rest",
      "drmBtnPlay": "Play (P)",
      "drmBtnStop": "Stop (S)",
      "drmBtnRef": "Hear the target",
      "drmSoundOn": "Sound: on",
      "drmSoundOff": "Sound: off",
      "drmViolRun": "{voice} sounds more than {n} steps in a row at step {s}.",
      "drmViolGap": "{voice} at step {s} must wait {n} steps after its last ring.",
      "drmPrompt": "Match {name} on the marked beats without breaking a voice rule. Par is {n} notes.",
      "drmWon": "{name} matches every marked beat with {n} notes - {s} stars!",
      "drmPaused": "Playback stopped while you were away; the score is untouched.",
      "drmNextPiece": "Next piece unlocked.",
      "drmAllPieces": "All five pieces scored.",
      "drmHint": "Fewer notes earn more stars: place only what the target asks for. The playhead reads as text, so the puzzle works on mute.",
      "logDreamOrchestra": "Scored {name} with {n} notes",
    },
    zh: {
      "tabDreamOrchestra": "梦境乐团",
      "drmP1": "四音低音线",
      "drmP2": "呼应乐句",
      "drmP3": "钟琴庭院",
      "drmP4": "镜像卡农",
      "drmP5": "完整梦境",
      "drmVBass": "低音",
      "drmVStr": "弦乐",
      "drmVBell": "钟琴",
      "drmVoiceLabel": "声部",
      "drmNotesLabel": "音符",
      "drmMatchLabel": "匹配",
      "drmStepLabel": "播放头",
      "drmPieceSelectLabel": "选择乐曲",
      "drmGridLabel": "十六步音序网格：方向键移动格子，回车或空格放音符，1-3 换声部，退格清空该声部",
      "drmTargetLabel": "重拍上的目标：",
      "drmNotesCount": "{n}/{par}",
      "drmMatchCount": "{n}/{total}",
      "drmStepText": "第 {n}/{total} 步",
      "drmCursorText": "第 {n} 步、{pitch}",
      "drmCellAria": "{voice} {pitch}，第 {n} 步，{state}",
      "drmFilled": "已放音符",
      "drmWanted": "目标要一个音符",
      "drmEmptyCell": "休止",
      "drmBtnPlay": "播放（P）",
      "drmBtnStop": "停止（S）",
      "drmBtnRef": "试听目标",
      "drmSoundOn": "声音：开",
      "drmSoundOff": "声音：关",
      "drmViolRun": "{voice}在第 {s} 步连续响了超过 {n} 步。",
      "drmViolGap": "第 {s} 步的{voice}离上次响铃不足 {n} 步。",
      "drmPrompt": "让{name}在每个重拍上命中目标，且不违反声部规则。标准音符数是 {n}。",
      "drmWon": "{name}全部重拍命中，用了 {n} 个音符——获得 {s} 星！",
      "drmPaused": "离开时已停止播放；你的乐谱原封不动。",
      "drmNextPiece": "解锁下一首乐曲。",
      "drmAllPieces": "五首乐曲全部编完。",
      "drmHint": "音符越少星越多：只放目标要求的音。播放头有文字显示，静音也能解谜。",
      "logDreamOrchestra": "为{name}编了 {n} 个音符",
    },
  });

  /* Deal every piece once and measure its par band from the drawn solution. */
  drmLevels.forEach(function (level) {
    level.target = drmDealTarget(level);
    level.starCredits = drmPar(level);
  });

  App.registerGame({
    name: "dreamOrchestra",
    tabKey: "tabDreamOrchestra",
    init: initDreamOrchestraGame,
    guide: {
      svg:
        '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="6" y="6" width="108" height="64" rx="5" fill="rgba(30,41,59,.75)" stroke="rgba(148,163,184,.45)"/>' +
        '<path d="M14 20h92M14 34h92M14 48h92M14 62h92" stroke="rgba(148,163,184,.25)"/>' +
        '<path d="M36 12v54M60 12v54M84 12v54" stroke="rgba(148,163,184,.4)" stroke-dasharray="3 3"/>' +
        '<rect x="22" y="54" width="10" height="8" fill="#22d3ee"/><rect x="48" y="40" width="10" height="8" fill="#fbbf24"/>' +
        '<rect x="72" y="24" width="10" height="8" fill="#f472b6"/><rect x="96" y="54" width="10" height="8" fill="#22d3ee"/>' +
        '<text x="27" y="52" font-size="7" fill="#e2e8f0" text-anchor="middle">B</text>' +
        '<text x="53" y="38" font-size="7" fill="#e2e8f0" text-anchor="middle">S</text>' +
        '<text x="77" y="22" font-size="7" fill="#e2e8f0" text-anchor="middle">T</text></svg>',
      en: [
        "Aim: make the mixed pattern hit the target on every marked beat while obeying the voice rules.",
        "Controls: click a cell or arrow to it and press Enter/Space to place a note; 1-3 switch voice, Backspace clears the current voice.",
        "Rules: each voice owns a register of rows, no voice may run longer than its limit, and bells must rest between rings.",
        "Playback: P plays your score, S stops, the target can be heard too, and Sound toggles audio - the playhead also reads as text.",
        "Scoring: the target was drawn from a legal solution, so par is measurable; fewer placed notes earn more stars.",
      ],
      zh: [
        "目标：让混合后的音型在每个标记重拍上与目标一致，同时不违反声部规则。",
        "操作：点格子，或用方向键移过去后按回车/空格放音符；1-3 换声部，退格清空当前声部。",
        "规则：每个声部只占自己的音域行，任何声部连续发声不能超过上限，钟琴响后必须休止。",
        "试听：P 播放你的曲子，S 停止，目标旋律也能试听，还能一键静音——播放头同时以文字显示。",
        "计分：目标由一个合法解谱生成，标准音符数可实测；摆放的音越少，星越多。",
      ],
    },
  });

  /* Exported for the other modules and the headless checks. */
  App.initDreamOrchestraGame = initDreamOrchestraGame;
  App.orchestraMatch = drmMatch;
  App.orchestraViolations = drmViolations;
  App.orchestraDeal = drmDealTarget;
  App.orchestraPar = drmPar;
  App.orchestraEmptyPattern = drmEmptyPattern;
  App.orchestraRowVoice = drmRowVoice;
  App.drmLevels = drmLevels;
})(window.CapitalConvert = window.CapitalConvert || {});
