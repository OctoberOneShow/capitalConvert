/* An original four-lane rhythm duet. All music is synthesized locally. */
(function (App) {
  "use strict";
  var ids = ["xavier", "zayne", "rafayel", "sylus", "caleb"], storageKey = "love-deepspace-duet-v1";
  var levels = [{ bpm: 84, beats: 32, window: .24, perfect: .09 }, { bpm: 108, beats: 40, window: .19, perfect: .075 }, { bpm: 132, beats: 48, window: .16, perfect: .06 }];
  var motifs = [[0, 1, 2, 1, 3, 2, 1, 0], [0, 3, 1, 2, 0, 2, 1, 3], [1, 2, 3, 2, 0, 3, 1, 0], [3, 0, 2, 1, 3, 1, 0, 2], [0, 2, 1, 3, 2, 0, 3, 1]];
  function create(partner, difficulty) {
    var p = ids.indexOf(partner); if (p < 0) { p = 0; } difficulty = Number.isInteger(difficulty) && difficulty >= 0 && difficulty < 3 ? difficulty : 0;
    var cfg = levels[difficulty], beat = 60 / cfg.bpm, notes = [], motif = motifs[p];
    for (var i = 0; i < cfg.beats; i++) {
      var lane = motif[i % 8], hold = i % 8 === 3 || difficulty === 2 && i % 8 === 6;
      notes.push({ time: 3 + i * beat, lane: lane, duration: hold ? beat * .7 : 0, status: "pending", head: "" });
      if (difficulty > 0 && i % 8 === 0) { notes.push({ time: 3 + i * beat, lane: (lane + 2) % 4, duration: 0, status: "pending", head: "" }); }
      if (difficulty === 2 && i % 8 === 5) { notes.push({ time: 3 + (i + .5) * beat, lane: (lane + 1) % 4, duration: 0, status: "pending", head: "" }); }
    }
    notes.sort(function (a, b) { return a.time - b.time || a.lane - b.lane; });
    return { partner: ids[p], difficulty: difficulty, notes: notes, time: 0, end: 3 + cfg.beats * beat + .5, held: [false, false, false, false],
      combo: 0, maxCombo: 0, perfect: 0, good: 0, missed: 0, ghosts: 0, score: 0, done: false, events: [],
      units: notes.reduce(function (n, note) { return n + (note.duration ? 2 : 1); }, 0) };
  }
  function judge(s, kind, lane) {
    if (kind === "miss") { s.missed++; s.combo = 0; }
    else { s[kind]++; s.combo++; s.maxCombo = Math.max(s.combo, s.maxCombo); s.score += (kind === "perfect" ? 1000 : 700) + Math.min(50, s.combo) * 10; }
    s.events.push({ kind: kind, lane: lane });
  }
  function step(s, seconds) {
    s.events = []; if (s.done || !Number.isFinite(seconds) || seconds < 0) { return s; }
    s.time += seconds;
    s.notes.forEach(function (note) {
      if (note.status === "pending" && s.time > note.time + levels[s.difficulty].window) { note.status = "miss"; judge(s, "miss", note.lane); if (note.duration) { judge(s, "miss", note.lane); } }
      else if (note.status === "holding" && s.time >= note.time + note.duration) { note.status = s.held[note.lane] ? "hit" : "miss"; judge(s, note.status === "hit" ? note.head : "miss", note.lane); }
    });
    if (s.time >= s.end) { s.done = true; s.held = [false, false, false, false]; }
    return s;
  }
  function press(s, lane, offset) {
    s.events = []; if (s.done || !Number.isInteger(lane) || lane < 0 || lane > 3 || s.held[lane]) { return false; }
    s.held[lane] = true;
    if (s.notes.some(function (note) { return note.status === "holding" && note.lane === lane; })) { return true; }
    var best = null, distance = Infinity, time = s.time + (Number.isFinite(offset) ? Math.max(-.12, Math.min(.12, offset)) : 0);
    s.notes.forEach(function (note) { var d = Math.abs(note.time - time); if (note.status === "pending" && note.lane === lane && d <= levels[s.difficulty].window && d < distance) { best = note; distance = d; } });
    if (!best) { if (s.time >= 2) { s.ghosts++; s.combo = 0; s.score = Math.max(0, s.score - 50); s.events.push({ kind: "early", lane: lane }); } return false; }
    best.head = distance <= levels[s.difficulty].perfect ? "perfect" : "good"; best.status = best.duration ? "holding" : "hit"; judge(s, best.head, lane); return true;
  }
  function release(s, lane) {
    s.events = []; if (s.done || !Number.isInteger(lane) || lane < 0 || lane > 3) { return; } s.held[lane] = false;
    s.notes.forEach(function (note) { if (note.lane === lane && note.status === "holding") { note.status = "miss"; judge(s, "miss", lane); } });
  }
  function result(s) {
    var accuracy = Math.round((s.perfect + s.good * .7) / (s.units + s.ghosts) * 1000) / 10;
    return { score: s.score, accuracy: accuracy, combo: s.maxCombo, grade: accuracy >= 95 ? "S" : accuracy >= 85 ? "A" : accuracy >= 70 ? "B" : accuracy >= 50 ? "C" : "D", stars: accuracy >= 95 ? 3 : accuracy >= 85 ? 2 : accuracy >= 70 ? 1 : 0 };
  }
  function read(raw) {
    var out = { version: 1, partners: {} }, saved;
    try { saved = JSON.parse(raw || "null"); } catch (_) { saved = null; }
    ids.forEach(function (id) {
      out.partners[id] = [null, null, null];
      if (!saved || saved.version !== 1 || !saved.partners || !Array.isArray(saved.partners[id])) { return; }
      saved.partners[id].slice(0, 3).forEach(function (r, i) {
        if (!r || !Number.isFinite(r.accuracy) || r.accuracy < 0 || r.accuracy > 100 || !Number.isFinite(r.score) || r.score < 0 || r.score > 10000000 || !Number.isInteger(r.combo) || r.combo < 0 || r.combo > 500) { return; }
        var a = r.accuracy; out.partners[id][i] = { accuracy: a, score: Math.floor(r.score), combo: r.combo, grade: a >= 95 ? "S" : a >= 85 ? "A" : a >= 70 ? "B" : a >= 50 ? "C" : "D", stars: a >= 95 ? 3 : a >= 85 ? 2 : a >= 70 ? 1 : 0 };
      });
    }); return out;
  }
  function record(progress, state) {
    if (!state.done) { return { fresh: false, improved: false }; }
    if (state.practice) { return { fresh: false, improved: false, result: result(state) }; }
    var r = result(state), old = progress.partners[state.partner][state.difficulty], fresh = r.stars > 0 && (!old || !old.stars);
    var improved = !old || r.accuracy > old.accuracy || r.accuracy === old.accuracy && r.score > old.score;
    if (improved) { progress.partners[state.partner][state.difficulty] = r; } return { fresh: fresh, improved: improved, result: r };
  }
  function mount(host, options) {
    var t = App.t, partner = null, state = create("xavier", 0), progress = read(App.storage.getItem(storageKey));
    var active = false, paused = false, raf = null, last = 0, audio = null, sound = false, voices = [], lastBeat = -1, feedbackTime = 0, offset = 0, playback = 1;
    function el(tag, cls, key, parent) { var n = document.createElement(tag); n.className = cls || ""; if (key) { n.setAttribute("data-i18n", key); n.textContent = t(key); } if (parent) { parent.appendChild(n); } return n; }
    function button(key, parent, fn) { var n = el("button", "lds-small-button", key, parent); n.type = "button"; n.addEventListener("click", fn); return n; }
    var root = el("section", "ldd-duet", null, host);
    el("p", "ldd-eyebrow", "lddTag", root); el("h4", "", "lddTitle", root); el("p", "lds-date-hint", "lddIntro", root);
    var settings = el("div", "ldd-settings", null, root), levelLabel = el("label", "", null, settings); el("span", "", "lddDifficulty", levelLabel);
    var difficulty = el("select", "", null, levelLabel); difficulty.setAttribute("aria-label", t("lddDifficulty"));
    ["lddCalm", "lddPulse", "lddNova"].forEach(function (key, index) { var n = el("option", "", key, difficulty); n.value = String(index); });
    difficulty.addEventListener("change", reset);
    var modeLabel = el("label", "", null, settings); el("span", "", "lddMode", modeLabel);
    var modeSelect = el("select", "ldd-mode", null, modeLabel); modeSelect.setAttribute("aria-label", t("lddMode"));
    ["ranked", "practice"].forEach(function (value) { var n = el("option", "", value === "ranked" ? "lddRanked" : "lddPractice", modeSelect); n.value = value; }); modeSelect.value = "ranked"; modeSelect.addEventListener("change", reset);
    var speedLabel = el("label", "ldd-speed-label", null, settings); el("span", "", "lddPracticeSpeed", speedLabel);
    var speed = el("select", "ldd-speed", null, speedLabel); speed.setAttribute("aria-label", t("lddPracticeSpeed"));
    [.5, .75, 1].forEach(function (value) { var n = el("option", "", null, speed); n.value = String(value); n.textContent = value * 100 + "%"; }); speed.value = "0.75"; speed.addEventListener("change", reset);
    var mirrorLabel = el("label", "ldd-mirror-label", null, settings), mirror = el("input", "ldd-mirror", null, mirrorLabel); mirror.type = "checkbox"; el("span", "", "lddMirror", mirrorLabel); mirror.addEventListener("change", reset);
    var timingLabel = el("label", "", null, settings); el("span", "", "lddOffset", timingLabel);
    var timing = el("select", "", null, timingLabel); timing.setAttribute("aria-label", t("lddOffset"));
    [-80, -40, 0, 40, 80].forEach(function (ms) { var n = el("option", "", null, timing); n.value = String(ms); n.textContent = ms === 0 ? t("lddDefaultTiming") : (ms > 0 ? "+" : "") + ms + " ms"; }); timing.value = "0";
    timing.addEventListener("change", function () { offset = Number(timing.value) / 1000; });
    var soundButton = button("lddSoundOff", settings, function () {
      try { var Audio = window.AudioContext || window.webkitAudioContext; if (!Audio) { throw Error("audio"); } if (!audio) { audio = new Audio(); } if (audio.state === "suspended") { var pending = audio.resume(); if (pending && pending.catch) { pending.catch(function () { sound = false; soundButton.textContent = t("lddSoundOff"); tell("lddAudioError"); }); } } sound = !sound; if (!sound) { silence(); } soundButton.textContent = t(sound ? "lddSoundOn" : "lddSoundOff"); soundButton.setAttribute("aria-pressed", String(sound)); }
      catch (_) { sound = false; tell("lddAudioError"); }
    }); soundButton.setAttribute("aria-pressed", "false");
    var hud = el("div", "ldd-hud", null, root), accuracy = el("strong", "", null, hud), combo = el("span", "", null, hud), timer = el("span", "", null, hud);
    var runway = el("div", "ldd-runway", null, root); runway.tabIndex = 0; runway.setAttribute("role", "application"); runway.setAttribute("aria-label", t("lddControls"));
    var lanes = [], noteNodes = [], keys = ["d", "f", "j", "k"], pointerLanes = {};
    for (var lane = 0; lane < 4; lane++) { var track = el("div", "ldd-lane", null, runway); track.style.setProperty("--lane", String(lane)); lanes.push(track); }
    var hitline = el("div", "ldd-hitline", null, runway); hitline.setAttribute("aria-hidden", "true");
    var stamp = el("strong", "ldd-stamp", null, runway); stamp.setAttribute("aria-hidden", "true");
    var pads = el("div", "ldd-pads", null, root);
    var padButtons = keys.map(function (key, index) {
      var pad = button(null, pads, function (e) { if (!e.detail) { down(index); up(index); } }); pad.textContent = key.toUpperCase(); pad.style.setProperty("--lane", String(index)); pad.setAttribute("aria-label", t("lddPad", { key: key.toUpperCase() }));
      pad.addEventListener("pointerdown", function (e) { if (!active) { return; } e.preventDefault(); runway.focus({ preventScroll: true }); pointerLanes[e.pointerId] = index; if (pad.setPointerCapture) { pad.setPointerCapture(e.pointerId); } down(index); });
      ["pointerup", "pointercancel", "lostpointercapture"].forEach(function (type) { pad.addEventListener(type, function (e) { if (pointerLanes[e.pointerId] === index) { delete pointerLanes[e.pointerId]; up(index); } }); }); return pad;
    });
    el("p", "lds-date-hint", "lddControls", root);
    var actions = el("div", "ldd-actions", null, root), playButton = button("lddStart", actions, function () { if (active) { pause(); } else { start(); } }), retry = button("lddRestart", actions, reset);
    var status = el("p", "ldd-status", null, root); status.setAttribute("role", "status"); status.setAttribute("aria-live", "polite");
    var best = el("p", "ldd-best", null, root), records = el("div", "ldd-records", null, root);
    var recordCards = levels.map(function () { return el("span", "ldd-record", null, records); });
    function tell(key, vars) { status.textContent = t(key, vars); }
    function silence() { voices.forEach(function (voice) { try { voice.stop(); } catch (_) {} }); voices = []; }
    function tone(frequency, seconds, volume) {
      if (!sound || !audio || audio.state !== "running" || voices.length > 12) { return; }
      try { var oscillator = audio.createOscillator(), gain = audio.createGain(), now = audio.currentTime; oscillator.type = "sine"; oscillator.frequency.value = frequency; gain.gain.setValueAtTime(.001, now); gain.gain.exponentialRampToValueAtTime(volume, now + .01); gain.gain.exponentialRampToValueAtTime(.001, now + seconds); oscillator.connect(gain); gain.connect(audio.destination); voices.push(oscillator); oscillator.onended = function () { oscillator.disconnect(); gain.disconnect(); voices = voices.filter(function (v) { return v !== oscillator; }); }; oscillator.start(); oscillator.stop(now + seconds + .02); }
      catch (_) { sound = false; soundButton.textContent = t("lddSoundOff"); silence(); }
    }
    function build() {
      noteNodes.forEach(function (n) { n.remove(); });
      noteNodes = state.notes.map(function (note) { var n = el("i", "ldd-note", null, lanes[note.lane]); n.setAttribute("aria-hidden", "true"); n.setAttribute("data-key", keys[note.lane].toUpperCase()); if (note.duration) { n.classList.add("ldd-hold"); } return n; });
    }
    function paint() {
      var r = result(state), judged = state.perfect + state.good + state.missed + state.ghosts;
      var liveAccuracy = state.done ? r.accuracy : judged ? Math.round((state.perfect + state.good * .7) / judged * 1000) / 10 : 100;
      var remaining = Math.max(0, Math.ceil((state.end - state.time) / playback)); accuracy.textContent = t("lddAccuracy", { n: liveAccuracy }); combo.textContent = t("lddCombo", { n: state.combo }); timer.textContent = remaining + "s";
      runway.setAttribute("data-running", String(active));
      runway.setAttribute("data-practice", String(!!state.practice));
      state.notes.forEach(function (note, index) {
        var until = note.time - state.time, n = noteNodes[index], visible = (note.status === "pending" || note.status === "holding") && until < 1.9 && until + note.duration > -.3;
        n.hidden = !visible; if (!visible) { return; }
        n.style.bottom = 18 + until / 1.9 * 82 + "%"; n.style.height = note.duration ? note.duration / 1.9 * 82 + "%" : "10px"; n.setAttribute("data-holding", String(note.status === "holding"));
      });
      padButtons.forEach(function (pad, index) { pad.setAttribute("aria-pressed", String(state.held[index])); });
      stamp.textContent = state.time < 2.5 && active ? String(Math.max(1, Math.ceil(3 - state.time))) : feedbackTime > 0 ? stamp.textContent : "";
    }
    function controls() {
      difficulty.disabled = active || paused; timing.disabled = active || paused; playButton.disabled = state.done;
      modeSelect.disabled = active || paused; speed.disabled = active || paused; mirror.disabled = active || paused;
      speedLabel.hidden = !state.practice; mirrorLabel.hidden = !state.practice;
      playButton.textContent = t(active ? "lddPause" : paused ? "lddResume" : "lddStart");
      var record = partner && progress.partners[partner.id][state.difficulty]; best.textContent = record ? t("lddBest", { grade: record.grade, a: record.accuracy, c: record.combo }) : t("lddNoBest");
      recordCards.forEach(function (card, index) { var r = partner && progress.partners[partner.id][index], stars = r ? r.stars : 0; card.setAttribute("data-stars", String(stars)); card.textContent = t(["lddStrollName", "lddPulseName", "lddNovaName"][index]) + " · " + "★".repeat(stars) + "☆".repeat(3 - stars) + (r ? " · " + r.grade + " " + r.accuracy + "%" : ""); });
      padButtons.forEach(function (pad) { pad.disabled = !active; });
    }
    function feedback() {
      if (!state.events.length) { return; } var lastEvent = state.events[state.events.length - 1];
      stamp.textContent = t(lastEvent.kind === "perfect" ? "lddPerfect" : lastEvent.kind === "good" ? "lddGood" : lastEvent.kind === "early" ? "lddEarly" : "lddMiss");
      stamp.setAttribute("data-judge", lastEvent.kind); feedbackTime = .5;
      state.events.forEach(function (e) { if (e.kind === "perfect" || e.kind === "good") { tone([261.63, 329.63, 392, 523.25][e.lane], .13, .055); } });
    }
    function complete() {
      active = false; paused = false; cancel(); silence(); options.onRunning(false);
      if (state.practice) { var practiceResult = result(state); tell("lddPracticeFinished", { a: practiceResult.accuracy, c: state.maxCombo }); options.onMoment("Talk"); controls(); paint(); return; }
      var saved = record(progress, state); App.storage.setItem(storageKey, JSON.stringify(progress));
      if (saved.fresh) { options.onReward("duet", String(state.difficulty)); }
      if (saved.result.stars) { options.onMoment("Win"); }
      tell(saved.result.stars ? "lddClear" : "lddTryAgain", { grade: saved.result.grade, a: saved.result.accuracy, p: state.perfect, g: state.good, m: state.missed, c: state.maxCombo }); controls(); paint();
    }
    function advance(now) {
      if (!active) { return; } if (document.hidden || options.isHidden() || now - last > 500) { pause(); return; }
      var dt = Math.max(0, (now - last) / 1000); last = now; step(state, dt * playback); feedbackTime = Math.max(0, feedbackTime - dt); feedback();
      var beat = Math.floor((state.time - 3) * levels[state.difficulty].bpm / 60);
      if (beat >= 0 && beat !== lastBeat) { lastBeat = beat; tone(beat % 4 ? 660 : 880, .04, .025); if (beat % 4 === 0) { tone([130.81, 146.83, 164.81, 196][Math.floor(beat / 4) % 4], .3, .035); } }
      if (state.done) { complete(); } else { paint(); }
    }
    function frame(now) { raf = null; advance(now); if (active) { raf = window.requestAnimationFrame(frame); } }
    function cancel() { if (raf !== null) { window.cancelAnimationFrame(raf); raf = null; } }
    function pause() { if (!active) { return; } active = false; paused = true; cancel(); state.held = [false, false, false, false]; pointerLanes = {}; silence(); options.onRunning(false); tell("lddPaused"); controls(); paint(); }
    function start() { if (!partner || active || state.done || options.isHidden()) { return; } active = true; paused = false; last = performance.now(); lastBeat = Math.floor((state.time - 3) * levels[state.difficulty].bpm / 60); runway.focus({ preventScroll: true }); controls(); options.onRunning(true); tell(state.practice ? "lddPracticePlaying" : "lddPlaying"); raf = window.requestAnimationFrame(frame); }
    function reset() { pause(); paused = false; state = create(partner ? partner.id : "xavier", Number(difficulty.value)); state.practice = modeSelect.value === "practice"; playback = state.practice ? Number(speed.value) || .75 : 1; if (state.practice && mirror.checked) { state.notes.forEach(function (note) { note.lane = 3 - note.lane; }); } lastBeat = -1; feedbackTime = 0; pointerLanes = {}; build(); controls(); paint(); tell(state.practice ? "lddPracticeReady" : "lddReady"); }
    function down(lane) { if (!active) { return; } advance(performance.now()); if (!active) { return; } press(state, lane, offset * playback); feedback(); paint(); }
    function up(lane) { if (!active) { return; } advance(performance.now()); if (!active) { return; } release(state, lane); feedback(); paint(); }
    root.addEventListener("keydown", function (e) { var key = String(e.key).toLowerCase(), lane = keys.indexOf(key); if (active && (key === "p" || key === "escape")) { e.preventDefault(); e.stopPropagation(); pause(); } else if (active && lane >= 0) { e.preventDefault(); e.stopPropagation(); if (!e.repeat) { down(lane); } } });
    root.addEventListener("keyup", function (e) { var lane = keys.indexOf(String(e.key).toLowerCase()); if (active && lane >= 0) { e.preventDefault(); e.stopPropagation(); up(lane); } });
    root.addEventListener("focusout", function (e) { if (!e.relatedTarget || !root.contains(e.relatedTarget)) { pause(); } });
    return { pause: pause, start: start, reset: reset, setPartner: function (next) { pause(); partner = next; root.style.setProperty("--ldd-accent", next.color); reset(); }, refresh: function () { controls(); }, getProgress: function () { return progress; }, inspect: function () { return { state: state, active: active, paused: paused, progress: progress }; } };
  }
  var copy = {
    ldsDateDuet: ["♫ Resonance duet", "♫ 心动合拍"], lddTag: ["A SONG FOR TWO", "把心跳合成一首歌"], lddTitle: ["Resonance duet", "心动合拍"],
    lddIntro: ["Four lanes. One rhythm. Play a different melody with each partner: tap the notes, hold the long ones, and catch chords together.", "四条轨道，一起合拍。每位搭档都有不同旋律：轻触音符、按住长条，同时接住和弦。"],
    lddDifficulty: ["Chart", "谱面"], lddCalm: ["Stroll · 84 BPM", "漫步 · 84 BPM"], lddPulse: ["Heartbeat · 108 BPM", "心跳 · 108 BPM"], lddNova: ["Meteor · 132 BPM", "流星 · 132 BPM"],
    lddStrollName: ["Stroll", "漫步"], lddPulseName: ["Heartbeat", "心跳"], lddNovaName: ["Meteor", "流星"],
    lddMode: ["Play mode", "游玩模式"], lddRanked: ["Performance · saves records", "正式合拍 · 保存成绩"], lddPractice: ["Practice · no records", "练习 · 不计成绩"], lddPracticeSpeed: ["Practice speed", "练习速度"], lddMirror: ["Mirror practice lanes", "镜像练习轨道"],
    lddPracticeReady: ["Practise at 50%, 75%, or full speed. Mirror the lanes to train the other hand. Practice never changes records, stars, or affinity.", "可以用 50%、75% 或原速练习，也可镜像轨道训练另一只手。练习不会改变纪录、星级或羁绊。"],
    lddPracticePlaying: ["Practice round. Take your time and find the rhythm; your performance records stay as they are.", "练习中。慢慢找到节拍，你的正式成绩会保持不变。"],
    lddPracticeFinished: ["Practice complete · {a}% · longest combo ×{c}. Switch to Performance when you're ready to earn a rank.", "练习完成 · {a}% · 最长连击 ×{c}。准备好后切换正式合拍，挑战你的评级吧。"],
    lddOffset: ["Input timing", "输入校准"], lddDefaultTiming: ["Default · 0 ms", "默认 · 0 毫秒"], lddSoundOff: ["♫ Sound off", "♫ 音乐关闭"], lddSoundOn: ["♫ Sound on", "♫ 音乐开启"],
    lddControls: ["D / F / J / K, or the four touch pads. Hit when a note reaches the line; keep holding long notes until the tail passes it. P / Esc pauses. Sound is optional. Timing adjustment takes effect on your next round.", "按 D / F / J / K，或使用下方四个触屏键。音符到达判定线时按下，长条需一直按到尾部通过。P / Esc 暂停，音乐可选。校准会用于下一局。"],
    lddPad: ["Lane {key}: press and hold for long notes", "{key} 轨道：长条需按住"], lddAccuracy: ["{n}% accuracy", "准确率 {n}%"], lddCombo: ["×{n} combo", "×{n} 连击"],
    lddStart: ["Start duet", "一起合拍"], lddRestart: ["New round", "新的一曲"], lddPause: ["Pause", "暂停"], lddResume: ["Resume duet", "继续合拍"],
    lddReady: ["Ready when you are. A three-second lead-in lets you find the rhythm. Reach 70% accuracy for a first-clear keepsake on each chart.", "准备好就开始。三秒预备让你找到节拍；准确率达到 70%，即可收藏该谱面的首次合拍纪念。"],
    lddPlaying: ["Listen, watch, and meet him on the beat.", "听节拍，看音符，和他在同一拍相遇。"], lddPaused: ["Paused. Notes and music stop here. Resume when ready; re-hold any long note you were playing.", "已暂停，音符和音乐都停在这里。准备好再继续；若正在演奏长条，请重新按住对应键。"],
    lddPerfect: ["PERFECT", "完美"], lddGood: ["GOOD", "合拍"], lddEarly: ["NO NOTE", "未到拍点"], lddMiss: ["MISS", "错过"],
    lddBest: ["Best · {grade} · {a}% · ×{c} longest combo", "最佳表现 · {grade} · {a}% · 最长 ×{c} 连击"], lddNoBest: ["Your first performance is waiting. Best accuracy is saved for each partner and chart.", "第一场合奏正等你开启。每位搭档、每张谱面都会保存最高准确率。"],
    lddClear: ["Duet complete · {grade} · {a}% · Perfect {p} / Good {g} / Miss {m} · Longest combo ×{c}. First clears earn affinity once; replay to improve your rank.", "合拍完成 · {grade} · {a}% · 完美 {p} / 合拍 {g} / 错过 {m} · 最长连击 ×{c}。每张谱面的首次通关增加一次羁绊，重玩可挑战更高评级。"],
    lddTryAgain: ["One more song? · {grade} · {a}% · Perfect {p} / Good {g} / Miss {m}. Try Stroll or adjust timing. Reach 70% to earn the keepsake.", "再来一曲吧 · {grade} · {a}% · 完美 {p} / 合拍 {g} / 错过 {m}。试试漫步谱或调整校准，达到 70% 即可收藏纪念。"], lddAudioError: ["Sound is unavailable here. The visual rhythm game still works.", "当前无法开启声音，仍可根据画面节拍游玩。"]
  };
  var strings = { en: {}, zh: {} }; Object.keys(copy).forEach(function (key) { strings.en[key] = copy[key][0]; strings.zh[key] = copy[key][1]; }); App.addStrings(strings);
  App.ldsDuet = { create: create, step: step, press: press, release: release, result: result, read: read, record: record, levels: levels };
  App.mountLdsDuet = mount;
})(window.CapitalConvert = window.CapitalConvert || {});
