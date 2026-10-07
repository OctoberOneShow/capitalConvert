/* Game FX - the shared feel layer every game in the drawer can call.

 * Two halves. Sound: a synthesised voice bank (no audio files, no network) so a
 * tap, a flip, a match and a win each have a voice, with a mute switch that
 * lives beside the motion control. Motion: the small animations that separate a
 * game from a form - a card that turns in 3D, a tile that punches when it
 * merges, a ring that snaps around the thing you just found, a score that rolls
 * up, a win that arrives as a ceremony instead of a sentence.

 * Everything here is defensive by design: the headless harness has no visible
 * surface, so getBoundingClientRect can legitimately return zeros and
 * requestAnimationFrame may never fire. Each effect therefore removes its own
 * nodes on a timer as well as on the animation's finish event, and none of them
 * keep a repeating timer alive - a game that is hidden must not leave work
 * running behind it. */
(function (App) {
  var documentRef = document;
  var root = documentRef.documentElement;

  /* ------------------------------------------------------------------ sound */

  var soundStorageKey = "sound-level";
  var audio = null;
  var master = null;
  var noiseBuffer = null;

  function getSoundLevel() {
    return root.getAttribute("data-sound") || "on";
  }

  function applySoundLevel(level) {
    root.setAttribute("data-sound", level);
  }

  function isSoundOn() {
    return getSoundLevel() !== "off";
  }

  function ensureAudio() {
    if (audio) {
      return audio;
    }
    var Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) {
      return null;
    }
    try {
      audio = new Ctor();
    } catch (error) {
      return null;
    }
    master = audio.createGain();
    master.gain.value = 0.5;
    master.connect(audio.destination);
    var length = Math.floor(audio.sampleRate * 0.25);
    noiseBuffer = audio.createBuffer(1, length, audio.sampleRate);
    var channel = noiseBuffer.getChannelData(0);
    for (var i = 0; i < length; i += 1) {
      channel[i] = Math.random() * 2 - 1;
    }
    return audio;
  }

  /* Browsers start the context suspended until a gesture. Every voice is fired
   * from a click or a key press, so resuming here is both safe and required. */
  function openGate() {
    var ctx = ensureAudio();
    if (ctx && ctx.state === "suspended" && ctx.resume) {
      ctx.resume().catch(function () { /* a later gesture will open it */ });
    }
    return ctx;
  }

  function tone(opts) {
    var ctx = audio;
    if (!ctx) {
      return;
    }
    var t0 = ctx.currentTime + (opts.at || 0);
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = opts.type || "sine";
    osc.frequency.setValueAtTime(opts.from, t0);
    if (opts.to && opts.to !== opts.from) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.to), t0 + opts.dur);
    }
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(opts.gain || 0.2, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + opts.dur + 0.02);
  }

  function hiss(opts) {
    var ctx = audio;
    if (!ctx || !noiseBuffer) {
      return;
    }
    var t0 = ctx.currentTime + (opts.at || 0);
    var src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    var filter = ctx.createBiquadFilter();
    filter.type = opts.filter || "bandpass";
    filter.frequency.setValueAtTime(opts.freq || 1600, t0);
    if (opts.sweepTo) {
      filter.frequency.exponentialRampToValueAtTime(opts.sweepTo, t0 + opts.dur);
    }
    filter.Q.value = opts.q || 1;
    var gain = ctx.createGain();
    gain.gain.setValueAtTime(opts.gain || 0.2, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t0);
    src.stop(t0 + opts.dur + 0.02);
  }

  /* A voice is a short recipe, not a sample. Names read as game verbs so a
   * call site says what happened rather than what frequency to play. */
  var VOICES = {
    tap: function () { tone({ type: "triangle", from: 520, to: 380, dur: 0.07, gain: 0.16 }); },
    click: function () { tone({ type: "square", from: 900, to: 700, dur: 0.04, gain: 0.07 }); },
    select: function () { tone({ type: "sine", from: 660, to: 880, dur: 0.09, gain: 0.12 }); },
    flip: function () { hiss({ freq: 2200, sweepTo: 900, dur: 0.11, gain: 0.14, q: 0.7 }); },
    place: function () { tone({ type: "sine", from: 300, to: 190, dur: 0.11, gain: 0.18 }); },
    pop: function () { tone({ type: "triangle", from: 700, to: 1150, dur: 0.08, gain: 0.16 }); },
    match: function () {
      tone({ type: "sine", from: 660, dur: 0.1, gain: 0.16 });
      tone({ type: "sine", from: 880, dur: 0.14, gain: 0.14, at: 0.07 });
      tone({ type: "sine", from: 1320, dur: 0.18, gain: 0.1, at: 0.14 });
    },
    merge: function () {
      tone({ type: "triangle", from: 420, to: 720, dur: 0.12, gain: 0.18 });
      tone({ type: "sine", from: 980, dur: 0.1, gain: 0.09, at: 0.06 });
    },
    clear: function () {
      for (var i = 0; i < 4; i += 1) {
        tone({ type: "sine", from: 520 + i * 180, dur: 0.12, gain: 0.11, at: i * 0.05 });
      }
    },
    coin: function () {
      tone({ type: "square", from: 1046, dur: 0.06, gain: 0.1 });
      tone({ type: "square", from: 1568, dur: 0.12, gain: 0.1, at: 0.05 });
    },
    score: function () { tone({ type: "sine", from: 780, to: 1180, dur: 0.1, gain: 0.11 }); },
    miss: function () { tone({ type: "sawtooth", from: 220, to: 140, dur: 0.14, gain: 0.11 }); },
    wrong: function () {
      tone({ type: "square", from: 180, to: 120, dur: 0.2, gain: 0.13 });
      hiss({ freq: 400, dur: 0.16, gain: 0.07 });
    },
    error: function () { tone({ type: "square", from: 140, dur: 0.18, gain: 0.12 }); },
    shoot: function () { hiss({ freq: 1200, sweepTo: 3200, dur: 0.08, gain: 0.1 }); },
    hit: function () {
      tone({ type: "square", from: 260, to: 90, dur: 0.1, gain: 0.16 });
      hiss({ freq: 900, dur: 0.08, gain: 0.1 });
    },
    explode: function () {
      hiss({ freq: 700, sweepTo: 90, dur: 0.42, gain: 0.26, filter: "lowpass", q: 0.5 });
      tone({ type: "sawtooth", from: 160, to: 40, dur: 0.4, gain: 0.14 });
    },
    land: function () { tone({ type: "sine", from: 200, to: 90, dur: 0.16, gain: 0.16 }); },
    splash: function () { hiss({ freq: 600, sweepTo: 2400, dur: 0.2, gain: 0.12, q: 0.6 }); },
    step: function () { tone({ type: "triangle", from: 340, to: 260, dur: 0.05, gain: 0.09 }); },
    tick: function () { tone({ type: "square", from: 1400, dur: 0.02, gain: 0.05 }); },
    heal: function () {
      tone({ type: "sine", from: 520, to: 780, dur: 0.16, gain: 0.12 });
      tone({ type: "sine", from: 780, to: 1040, dur: 0.18, gain: 0.09, at: 0.1 });
    },
    danger: function () {
      tone({ type: "sawtooth", from: 300, to: 220, dur: 0.3, gain: 0.13 });
      tone({ type: "sawtooth", from: 300, to: 220, dur: 0.3, gain: 0.11, at: 0.34 });
    },
    levelup: function () {
      var steps = [523, 659, 784, 1046];
      for (var i = 0; i < steps.length; i += 1) {
        tone({ type: "triangle", from: steps[i], dur: 0.18, gain: 0.14, at: i * 0.08 });
      }
    },
    win: function () {
      var steps = [523, 659, 784, 1046, 1318];
      for (var i = 0; i < steps.length; i += 1) {
        tone({ type: "sine", from: steps[i], dur: 0.3, gain: 0.15, at: i * 0.1 });
        tone({ type: "triangle", from: steps[i] / 2, dur: 0.3, gain: 0.07, at: i * 0.1 });
      }
    },
    lose: function () {
      var steps = [440, 370, 294, 220];
      for (var i = 0; i < steps.length; i += 1) {
        tone({ type: "triangle", from: steps[i], dur: 0.26, gain: 0.13, at: i * 0.13 });
      }
    },
    star: function () { tone({ type: "sine", from: 1200, to: 1800, dur: 0.16, gain: 0.12 }); },
  };

  function playSfx(name, opts) {
    if (!isSoundOn()) {
      return;
    }
    var voice = VOICES[name];
    if (!voice) {
      return;
    }
    if (!openGate()) {
      return;
    }
    try {
      voice(opts || {});
    } catch (error) {
      /* Audio is decoration; it must never break a turn. */
    }
  }

  /* ---------------------------------------------------------------- motion */

  function motionOff() {
    return App.isMotionOff ? App.isMotionOff() : root.getAttribute("data-motion") === "off";
  }

  function calm() {
    return App.isMotionCalm ? App.isMotionCalm() : root.getAttribute("data-motion") === "calm";
  }

  /* Calm mode keeps the information and drops the spectacle. */
  function scale(count) {
    return calm() ? Math.max(1, Math.round(count * 0.35)) : count;
  }

  function dur(ms) {
    return calm() ? Math.round(ms * 0.6) : ms;
  }

  function animate(el, frames, options) {
    if (!el || typeof el.animate !== "function") {
      return null;
    }
    try {
      return el.animate(frames, options);
    } catch (error) {
      return null;
    }
  }

  /* A node that must leave the document even if the animation never reports
   * finishing - a hidden tab throttles timers and pauses rAF. */
  function ephemeral(node, ms) {
    documentRef.body.appendChild(node);
    var done = false;
    var wipe = function () {
      if (done) {
        return;
      }
      done = true;
      if (node.parentNode) {
        node.parentNode.removeChild(node);
      }
    };
    setTimeout(wipe, ms + 260);
    return wipe;
  }

  function centerOf(el) {
    var rect = el && el.getBoundingClientRect ? el.getBoundingClientRect() : null;
    if (rect && rect.width) {
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, w: rect.width, h: rect.height };
    }
    return { x: 0, y: 0, w: 0, h: 0 };
  }

  function hueOf(el) {
    var node = el;
    while (node && node.getAttribute) {
      var v = node.style && node.style.getPropertyValue ? node.style.getPropertyValue("--gp-hue") : "";
      if (v) {
        return parseInt(v, 10) || 192;
      }
      node = node.parentNode;
    }
    return 192;
  }

  var fx = {};

  /* A punch: grow past 1 then settle. The single most used beat in the drawer -
   * every tile that appears, merges or scores wants exactly this. */
  fx.pop = function (el, opts) {
    if (motionOff()) {
      return;
    }
    var o = opts || {};
    var peak = o.scale || 1.18;
    animate(el, [
      { transform: "scale(1)" },
      { transform: "scale(" + peak + ")", offset: 0.4 },
      { transform: "scale(1)" },
    ], { duration: dur(o.ms || 260), easing: "cubic-bezier(0.34,1.56,0.64,1)" });
  };

  /* A shake: the "no" gesture. kind 'x' rattles sideways, 'y' bobs. */
  fx.shake = function (el, opts) {
    if (motionOff()) {
      return;
    }
    var o = opts || {};
    var d = o.dist || 6;
    var frames = o.kind === "y"
      ? [{ transform: "translateY(0)" }, { transform: "translateY(-" + d + "px)" }, { transform: "translateY(" + d + "px)" }, { transform: "translateY(0)" }]
      : [{ transform: "translateX(0)" }, { transform: "translateX(-" + d + "px)" }, { transform: "translateX(" + d + "px)" }, { transform: "translateX(-" + (d / 2) + "px)" }, { transform: "translateX(0)" }];
    animate(el, frames, { duration: dur(o.ms || 320), easing: "ease-out" });
  };

  /* A ring that snaps around a target - the hidden-object "you found it" beat,
   * and the cleanest way to point at one cell of a board. */
  fx.ring = function (el, opts) {
    if (motionOff()) {
      return;
    }
    var o = opts || {};
    var c = centerOf(el);
    var hue = o.hue || hueOf(el);
    var node = documentRef.createElement("div");
    node.className = "fx-ring";
    node.style.left = c.x + "px";
    node.style.top = c.y + "px";
    node.style.width = Math.max(24, c.w) + "px";
    node.style.height = Math.max(24, c.h) + "px";
    node.style.borderColor = "hsla(" + hue + ", 95%, 70%, 0.95)";
    node.style.boxShadow = "0 0 22px hsla(" + hue + ", 95%, 65%, 0.55)";
    var wipe = ephemeral(node, 620);
    var anim = animate(node, [
      { transform: "translate(-50%,-50%) scale(0.6)", opacity: 1 },
      { transform: "translate(-50%,-50%) scale(1.9)", opacity: 0 },
    ], { duration: dur(600), easing: "cubic-bezier(0.2,0.7,0.3,1)" });
    if (anim && anim.finished) {
      anim.finished.then(wipe).catch(wipe);
    }
  };

  /* Particles. kind picks the physics: spark flies out and falls, star rises,
   * bubble floats up wide, confetti tumbles, ember drifts, petal spirals. */
  fx.burst = function (el, opts) {
    if (motionOff()) {
      return;
    }
    var o = opts || {};
    var kind = o.kind || "spark";
    var count = scale(o.count || (kind === "confetti" ? 26 : 14));
    var c = centerOf(el);
    var hue = o.hue || hueOf(el);
    for (var i = 0; i < count; i += 1) {
      var node = documentRef.createElement("div");
      node.className = "fx-particle fx-" + kind;
      var size = 4 + Math.random() * (kind === "confetti" ? 6 : 4);
      node.style.left = c.x + "px";
      node.style.top = c.y + "px";
      node.style.width = size + "px";
      node.style.height = (kind === "confetti" && i % 3 === 0 ? size * 1.7 : size) + "px";
      node.style.background = "hsl(" + (hue + (Math.random() * 44 - 22)) + ", 92%, " + (58 + Math.random() * 18) + "%)";
      var wipe = ephemeral(node, 1100);
      var angle = Math.random() * Math.PI * 2;
      var power = 40 + Math.random() * (kind === "confetti" ? 150 : 90);
      var dx = Math.cos(angle) * power;
      var dy = Math.sin(angle) * power;
      var frames;
      if (kind === "star" || kind === "bubble" || kind === "ember") {
        frames = [
          { transform: "translate(-50%,-50%) scale(0.4)", opacity: 0.9 },
          { transform: "translate(" + (dx * 0.5 - 50) + "%," + (-50 - power * 0.9) + "px) scale(1)", opacity: 1, offset: 0.5 },
          { transform: "translate(" + (dx - 50) + "%," + (-50 - power * 1.7) + "px) scale(0.2)", opacity: 0 },
        ];
      } else {
        frames = [
          { transform: "translate(-50%,-50%) scale(1) rotate(0deg)", opacity: 1 },
          { transform: "translate(" + (dx * 0.6 - 50) + "%," + (dy * 0.6 - 50) + "%) scale(1.05) rotate(180deg)", opacity: 1, offset: 0.45 },
          { transform: "translate(" + (dx - 50) + "%," + (dy + 110 - 50) + "%) scale(0.3) rotate(" + (kind === "confetti" ? 540 : 300) + "deg)", opacity: 0 },
        ];
      }
      var anim = animate(node, frames, {
        duration: dur(kind === "confetti" ? 1100 : 700),
        easing: kind === "spark" ? "cubic-bezier(0.15,0.7,0.35,1)" : "cubic-bezier(0.25,0.6,0.35,1)",
      });
      if (anim && anim.finished) {
        anim.finished.then(wipe).catch(wipe);
      }
    }
  };

  /* A rising value: +10, "nice", "-1 heart". The number the player cares about,
   * shown where the action happened. */
  fx.floatText = function (el, text, opts) {
    if (motionOff()) {
      return;
    }
    var o = opts || {};
    var c = centerOf(el);
    var node = documentRef.createElement("div");
    node.className = "fx-float" + (o.kind ? " is-" + o.kind : "");
    node.textContent = String(text);
    node.style.left = c.x + "px";
    node.style.top = (c.y - (o.rise ? 12 : 0)) + "px";
    if (o.hue) {
      node.style.color = "hsl(" + o.hue + ", 92%, 72%)";
    }
    var wipe = ephemeral(node, 900);
    var anim = animate(node, [
      { transform: "translate(-50%,-50%) scale(0.7)", opacity: 0 },
      { transform: "translate(-50%,-90%) scale(1.12)", opacity: 1, offset: 0.28 },
      { transform: "translate(-50%,-190%) scale(1)", opacity: 0 },
    ], { duration: dur(880), easing: "cubic-bezier(0.2,0.7,0.3,1)" });
    if (anim && anim.finished) {
      anim.finished.then(wipe).catch(wipe);
    }
  };

  /* Entrance cascade: a board dealing itself in rather than popping into being. */
  fx.stagger = function (list, opts) {
    if (motionOff() || !list || !list.length) {
      return;
    }
    var o = opts || {};
    var step = o.step || 26;
    for (var i = 0; i < list.length; i += 1) {
      animate(list[i], [
        { transform: o.kind === "drop" ? "translateY(-14px) scale(0.9)" : "translateY(10px) scale(0.94)", opacity: 0 },
        { transform: "translateY(0) scale(1)", opacity: 1 },
      ], { duration: dur(o.ms || 300), delay: Math.min(i * step, 700), easing: "cubic-bezier(0.34,1.4,0.64,1)", fill: "backwards" });
    }
  };

  /* The HUD number rolling to its new value instead of teleporting. */
  fx.countUp = function (el, from, to, opts) {
    if (!el) {
      return;
    }
    var o = opts || {};
    var start = Number(from) || 0;
    var end = Number(to) || 0;
    if (motionOff() || start === end) {
      el.textContent = o.format ? o.format(end) : String(end);
      return;
    }
    var ms = dur(o.ms || 420);
    var t0 = Date.now();
    var step = function () {
      var k = Math.min(1, (Date.now() - t0) / ms);
      var eased = 1 - Math.pow(1 - k, 3);
      var value = Math.round(start + (end - start) * eased);
      el.textContent = o.format ? o.format(value) : String(value);
      if (k < 1) {
        setTimeout(step, 30);
      } else if (o.punch !== false) {
        fx.pop(el, { scale: 1.14, ms: 200 });
      }
    };
    step();
  };

  /* A shine travelling across a surface - the "this is premium" cue, used on the
   * primary button and on a card that just became affordable. */
  fx.sweep = function (el) {
    if (motionOff() || !el || !el.getBoundingClientRect || !el.getBoundingClientRect().width) {
      return;
    }
    var node = documentRef.createElement("div");
    node.className = "fx-sweep";
    el.appendChild(node);
    var wipe = function () {
      if (node.parentNode) {
        node.parentNode.removeChild(node);
      }
    };
    setTimeout(wipe, 760);
    animate(node, [
      { transform: "translateX(-120%) skewX(-18deg)", opacity: 0.0 },
      { transform: "translateX(0%) skewX(-18deg)", opacity: 0.75, offset: 0.4 },
      { transform: "translateX(140%) skewX(-18deg)", opacity: 0 },
    ], { duration: dur(720), easing: "ease-out" });
  };

  /* Whole-panel impact: used by the canvas games when something crashes. */
  fx.jolt = function (el, opts) {
    if (motionOff()) {
      return;
    }
    var o = opts || {};
    var d = o.dist || 4;
    animate(el, [
      { transform: "translate(0,0)" },
      { transform: "translate(" + (-d) + "px," + d + "px)" },
      { transform: "translate(" + d + "px," + (-d) + "px)" },
      { transform: "translate(0,0)" },
    ], { duration: dur(o.ms || 220), easing: "ease-out" });
  };

  /* One-shot flash over a surface, e.g. the board when a round is lost. */
  fx.flash = function (el, opts) {
    if (motionOff() || !el) {
      return;
    }
    var o = opts || {};
    var hue = o.hue || 0;
    animate(el, [
      { boxShadow: "inset 0 0 0 999px hsla(" + hue + ", 95%, 65%, 0)" },
      { boxShadow: "inset 0 0 0 999px hsla(" + hue + ", 95%, 65%, 0.32)", offset: 0.25 },
      { boxShadow: "inset 0 0 0 999px hsla(" + hue + ", 95%, 65%, 0)" },
    ], { duration: dur(o.ms || 460), easing: "ease-out" });
  };

  /* A real card turn. Games that only tint a rectangle do not read as a memory
   * game; this gives them the 3D flip with one call. */
  fx.flipCard = function (host, flipped) {
    if (!host || !host.classList) {
      return;
    }
    if (flipped === undefined) {
      flipped = !host.classList.contains("is-turned");
    }
    if (flipped) {
      host.classList.add("is-turned");
    } else {
      host.classList.remove("is-turned");
    }
    return flipped;
  };

  /* Build the two-face structure so a game never hand-rolls the transform
   * hierarchy: fx.cardEl(front, back) -> .fx-card > .fx-card-inner > faces. */
  fx.cardEl = function (front, back) {
    var outer = documentRef.createElement("div");
    outer.className = "fx-card";
    var inner = documentRef.createElement("div");
    inner.className = "fx-card-inner";
    var a = documentRef.createElement("div");
    a.className = "fx-face fx-face-back";
    a.appendChild(front);
    var b = documentRef.createElement("div");
    b.className = "fx-face fx-face-front";
    b.appendChild(back);
    inner.appendChild(a);
    inner.appendChild(b);
    outer.appendChild(inner);
    return outer;
  };

  /* The ceremony: a round ending should feel like one. Stars stamp in one by
   * one over a scrim, the title lands, the score rolls. tone picks the palette:
   * win, clear (a level done without fuss), lose. */
  fx.ceremony = function (host, opts) {
    if (!host) {
      return;
    }
    var o = opts || {};
    var tone = o.tone || "win";
    var stars = Math.max(0, Math.min(3, o.stars === undefined ? 3 : o.stars));
    var scrim = documentRef.createElement("div");
    scrim.className = "fx-ceremony is-" + tone;
    var plate = documentRef.createElement("div");
    plate.className = "fx-plate";

    var ribbon = documentRef.createElement("div");
    ribbon.className = "fx-ribbon";
    ribbon.textContent = o.title || "";
    plate.appendChild(ribbon);

    var starRow = documentRef.createElement("div");
    starRow.className = "fx-stars";
    for (var i = 0; i < 3; i += 1) {
      var s = documentRef.createElement("span");
      s.className = "fx-star" + (i < stars ? " is-earned" : "");
      s.textContent = i < stars ? "★" : "☆";
      starRow.appendChild(s);
    }
    plate.appendChild(starRow);

    if (o.lines && o.lines.length) {
      var lines = documentRef.createElement("div");
      lines.className = "fx-lines";
      for (var j = 0; j < o.lines.length; j += 1) {
        var line = documentRef.createElement("div");
        line.className = "fx-line";
        line.textContent = String(o.lines[j]);
        lines.appendChild(line);
      }
      plate.appendChild(lines);
    }

    scrim.appendChild(plate);
    host.appendChild(scrim);

    var dismiss = function () {
      if (scrim.parentNode) {
        scrim.parentNode.removeChild(scrim);
      }
      host.removeEventListener("click", dismiss);
    };
    /* The player taps through it; a timeout keeps a forgotten ceremony from
     * covering the board forever in a hidden tab. */
    host.addEventListener("click", dismiss);
    setTimeout(dismiss, 5200);
    scrim.__dismiss = dismiss;

    if (motionOff()) {
      return dismiss;
    }
    animate(plate, [
      { transform: "translateY(16px) scale(0.86)", opacity: 0 },
      { transform: "translateY(0) scale(1.04)", opacity: 1, offset: 0.6 },
      { transform: "translateY(0) scale(1)", opacity: 1 },
    ], { duration: dur(460), easing: "cubic-bezier(0.34,1.5,0.64,1)" });
    var earned = starRow.querySelectorAll(".fx-star.is-earned");
    for (var k = 0; k < earned.length; k += 1) {
      (function (node, index) {
        setTimeout(function () {
          animate(node, [
            { transform: "scale(0) rotate(-60deg)", opacity: 0 },
            { transform: "scale(1.35) rotate(8deg)", opacity: 1, offset: 0.6 },
            { transform: "scale(1) rotate(0deg)", opacity: 1 },
          ], { duration: dur(420), easing: "cubic-bezier(0.34,1.6,0.64,1)" });
          playSfx("star");
        }, 260 + index * 240);
      })(earned[k], k);
    }
    if (tone === "win") {
      setTimeout(function () { fx.burst(host, { kind: "confetti", count: 30 }); playSfx("win"); }, 240);
    } else if (tone === "lose") {
      setTimeout(function () { playSfx("lose"); }, 200);
    } else {
      setTimeout(function () { playSfx("levelup"); }, 240);
    }
    return dismiss;
  };

  /* A short-lived word that appears where the board is, then fades - the
   * non-blocking alternative to writing status into a sentence. */
  fx.callout = function (el, text, opts) {
    fx.floatText(el, text, Object.assign ? Object.assign({ kind: "callout" }, opts || {}) : { kind: "callout" });
  };

  App.playSfx = playSfx;
  App.isSoundOn = isSoundOn;
  App.getSoundLevel = getSoundLevel;
  App.applySoundLevel = applySoundLevel;
  App.soundStorageKey = soundStorageKey;
  App.fx = fx;
  App.fxVoices = VOICES;
})(window.CapitalConvert = window.CapitalConvert || {});
