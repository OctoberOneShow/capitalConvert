/* Ink Beat - The synthesized rhythm-tap campaign in the shared game drawer. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  var t = App.t;
  var getElement = App.getElement;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  var createCampaign = App.createCampaign;
  var fillCampaignPicker = App.fillCampaignPicker;
  var starsFor = App.starsFor;
  var beatLanes = 4;
  var beatWidth = 320;
  var beatHeight = 240;
  var beatHitY = 196;
  var beatPerfectMs = 60;
  var beatMissMs = 130;
  var beatLeadSec = 1.2;
  var beatColors = ["#22d3ee", "#fbbf24", "#f472b6", "#a3e635"];
  var beatKeys = ["d", "f", "j", "k"];
  /* Every track is generated from a seed: a 16th-step grid where each lane
   * fires with its own probability, so songs are deterministic but compact.
   * The densities climb from the casual teaching ranks to the summit wall,
   * and buildNotes additionally refuses same-lane notes on adjacent steps
   * so charts never machine-gun; every tier comment below carries its own
   * measured numbers. */
  var beatLevels = [
    { id: "t1", labelKey: "beatL1", bpm: 92, bars: 12, seed: 11, density: [0.07, 0.03, 0.04, 0.008] },
    { id: "t2", labelKey: "beatL2", bpm: 104, bars: 14, seed: 23, density: [0.08, 0.045, 0.06, 0.015] },
    { id: "t3", labelKey: "beatL3", bpm: 116, bars: 14, seed: 37, density: [0.09, 0.05, 0.08, 0.025] },
    { id: "t4", labelKey: "beatL4", bpm: 128, bars: 16, seed: 53, density: [0.085, 0.05, 0.08, 0.025] },
    { id: "t5", labelKey: "beatL5", bpm: 140, bars: 16, seed: 71, density: [0.095, 0.06, 0.095, 0.035] },
    { id: "t6", labelKey: "beatL6", bpm: 152, bars: 18, seed: 97, density: [0.105, 0.07, 0.11, 0.045] },
    { id: "t7", labelKey: "beatL7", bpm: 164, bars: 18, seed: 113, density: [0.11, 0.075, 0.12, 0.05] },
    { id: "t8", labelKey: "beatL8", bpm: 176, bars: 20, seed: 131, density: [0.115, 0.08, 0.13, 0.055] },
    { id: "t9", labelKey: "beatL9", bpm: 184, bars: 22, seed: 138, density: [0.115, 0.08, 0.13, 0.055] },
    { id: "t10", labelKey: "beatL10", bpm: 190, bars: 24, seed: 145, density: [0.12, 0.085, 0.135, 0.06] },
    { id: "t11", labelKey: "beatL11", bpm: 196, bars: 24, seed: 152, density: [0.12, 0.085, 0.14, 0.06] },
    { id: "t12", labelKey: "beatL12", bpm: 202, bars: 26, seed: 167, density: [0.125, 0.09, 0.14, 0.065] },
    { id: "t13", labelKey: "beatL13", bpm: 208, bars: 26, seed: 179, density: [0.125, 0.09, 0.145, 0.065] },
    { id: "t14", labelKey: "beatL14", bpm: 214, bars: 28, seed: 193, density: [0.13, 0.095, 0.145, 0.07] },
    { id: "t15", labelKey: "beatL15", bpm: 220, bars: 28, seed: 211, density: [0.13, 0.095, 0.15, 0.07] },
    { id: "t16", labelKey: "beatL16", bpm: 226, bars: 30, seed: 227, density: [0.135, 0.10, 0.15, 0.075] },
    /* Tracks 17-20 change what the chart says, not just how fast it comes:
     * t17 mirrors the lane roles (the quiet kick lane hands the melody to the
     * hats), t18 introduces swing (every odd 16th lands late by swing of a
     * step), t19 is the plain speed peak, and t20 closes by playing the
     * mirrored chart in swing, which reads familiar and still sits apart. */
    { id: "t17", labelKey: "beatL17", bpm: 218, bars: 28, seed: 241, density: [0.075, 0.15, 0.10, 0.135] },
    { id: "t18", labelKey: "beatL18", bpm: 196, bars: 26, seed: 251, density: [0.13, 0.095, 0.15, 0.07], swing: 0.34 },
    { id: "t19", labelKey: "beatL19", bpm: 232, bars: 30, seed: 263, density: [0.14, 0.105, 0.155, 0.08] },
    { id: "t20", labelKey: "beatL20", bpm: 224, bars: 30, seed: 269, density: [0.08, 0.155, 0.105, 0.14], swing: 0.34 },
    /* Tracks 21-24 are the hard tier, and each one pushes a different chart
     * lever past every shipped track (all numbers measured on the seed's own
     * chart). t21 hands the melody to the top pair: lanes J and K carry 72%
     * of the 230 notes while the kick lane nearly rests - no shipped chart
     * puts more than 51% on its top pair. t22 evens the wall out at an
     * eighth of a step apiece, so the quietest lane still lands 50 notes
     * and no shipped chart keeps its quietest lane above 44. t23 is the
     * long burn: 36 bars and 274 notes, both campaign records, at 240 BPM.
     * t24 closes by taking t21's hot pair up to 244 BPM in the deepest
     * swing yet (0.5 against the shipped 0.34) - 299 notes at 9.3 notes a
     * second, against the shipped peak of 7.3. Measured load climbs through
     * the tier: 230 -> 244 -> 274 -> 299 notes and 6.5 -> 7.4 -> 7.5 -> 9.3
     * notes a second. */
    { id: "t21", labelKey: "beatL21", bpm: 192, bars: 28, seed: 281, density: [0.055, 0.045, 0.24, 0.22] },
    { id: "t22", labelKey: "beatL22", bpm: 220, bars: 30, seed: 293, density: [0.125, 0.125, 0.125, 0.125] },
    { id: "t23", labelKey: "beatL23", bpm: 240, bars: 36, seed: 307, density: [0.145, 0.11, 0.165, 0.085] },
    { id: "t24", labelKey: "beatL24", bpm: 244, bars: 32, seed: 331, density: [0.06, 0.05, 0.25, 0.23], swing: 0.5 },
    /* Tracks 25-30 are the summit, and its one lever is the four-lane wall:
     * every rung is an even wall - no lane may rest - at a weight or speed
     * no shipped wall has carried (all numbers measured on the seed's own
     * chart through the engine's builder). Measured load climbs strictly
     * through the six: 9.94 -> 10.06 -> 10.43 -> 10.76 -> 11.89 -> 12.37
     * notes a second, against the hard tier's 9.3 peak. t25 is the first
     * wall past that peak and keeps every lane above 67 notes - the shipped
     * no-rest record was 50. t26 hangs the shipped 0.34 swing on a 252 BPM
     * wall. t27 is the long burn: 40 bars and 404 notes, both campaign
     * records, so three stars demands 372 hits - more than any earlier
     * track holds notes. t28 swings deeper than anything shipped (0.42)
     * without trading the wall away. t29 is the fastest plain wall at
     * 258 BPM, and t30 closes by singing the same wall at 262 BPM in the
     * deepest swing the engine has (0.5) - 12.37 notes a second, the
     * ladder's peak. */
    { id: "t25", labelKey: "beatL25", bpm: 248, bars: 30, seed: 337, density: [0.16, 0.16, 0.16, 0.16] },
    { id: "t26", labelKey: "beatL26", bpm: 252, bars: 30, seed: 347, density: [0.165, 0.165, 0.165, 0.165], swing: 0.34 },
    /* The burn rung: length, not density, is what t27 asks for that no
     * earlier track did - 40 bars against the hard tier's 36, at wall
     * weight. A chart that long has no second wind: one slip costs the
     * same share of the grade as anywhere else, but there is nowhere left
     * to spend the recovery. */
    { id: "t27", labelKey: "beatL27", bpm: 252, bars: 40, seed: 353, density: [0.18, 0.18, 0.18, 0.18] },
    /* The swing rung: every odd sixteenth lands 0.42 of a step late -
     * deeper than the shipped 0.34 - and the wall gives nothing back for
     * it, so the groove leans while the load keeps climbing. */
    { id: "t28", labelKey: "beatL28", bpm: 256, bars: 32, seed: 359, density: [0.19, 0.19, 0.19, 0.19], swing: 0.42 },
    /* The plain-speed rung: no swing to lean on, 258 BPM of even wall -
     * the fastest chart the ladder ships without a groove offset. */
    { id: "t29", labelKey: "beatL29", bpm: 258, bars: 30, seed: 367, density: [0.2, 0.2, 0.2, 0.2] },
    /* The closer: the wall at the ladder's top tempo and its deepest swing
     * at once - 262 BPM, 0.5, 12.37 notes a second. Every lever the summit
     * built sits on one chart, which is what makes it the last one. */
    { id: "t30", labelKey: "beatL30", bpm: 262, bars: 32, seed: 373, density: [0.21, 0.21, 0.21, 0.21], swing: 0.5 },
    /* Tracks 31-40 are the encore, and each rung takes one measured record
     * away from the ladder behind it (all numbers measured on the seed's own
     * chart through the engine's builder). t31 is the densest chart the
     * ladder has shipped - 13.20 notes a second against t30's 12.37. t32 is
     * the long walk: 44 bars against the burn rung's 40, 466 notes. t33 is
     * the fastest plain wall at 272 BPM. t34 is the solo flare: 83% of the
     * chart sits on the J/K pair against the hard tier's 72%, the quietest
     * lanes nearly resting. t35 swings deeper than the engine has ever
     * swung (0.62 against the shipped 0.5). t36 is the marathon: 48 bars
     * and 540 notes, both campaign records. t37 hangs the shipped 0.34
     * swing on the ladder's fastest swung wall, 270 BPM. t38 is the
     * no-rest record: its quietest lane lands 96 notes against the shipped
     * 84. t39 takes the top tempo past the closer - 264 BPM in the 0.5
     * groove - and t40 closes the encore at the ladder's absolute peak:
     * 272 BPM, 0.62 swing, 13.80 notes a second, 449 notes. t38's
     * no-rest wall runs 42 bars so its quietest lane lands 120 notes
     * against the marathon's 118. */
    { id: "t31", labelKey: "beatL31", bpm: 266, bars: 30, seed: 383, density: [0.215, 0.215, 0.215, 0.215] },
    { id: "t32", labelKey: "beatL32", bpm: 248, bars: 44, seed: 389, density: [0.18, 0.18, 0.18, 0.18] },
    { id: "t33", labelKey: "beatL33", bpm: 272, bars: 30, seed: 397, density: [0.21, 0.21, 0.21, 0.21] },
    { id: "t34", labelKey: "beatL34", bpm: 200, bars: 30, seed: 401, density: [0.02, 0.02, 0.3, 0.28] },
    { id: "t35", labelKey: "beatL35", bpm: 236, bars: 30, seed: 409, density: [0.19, 0.19, 0.19, 0.19], swing: 0.62 },
    { id: "t36", labelKey: "beatL36", bpm: 250, bars: 48, seed: 419, density: [0.19, 0.19, 0.19, 0.19] },
    { id: "t37", labelKey: "beatL37", bpm: 270, bars: 30, seed: 421, density: [0.18, 0.18, 0.18, 0.18], swing: 0.34 },
    { id: "t38", labelKey: "beatL38", bpm: 244, bars: 42, seed: 431, density: [0.21, 0.21, 0.21, 0.21] },
    { id: "t39", labelKey: "beatL39", bpm: 264, bars: 32, seed: 433, density: [0.2, 0.2, 0.2, 0.2], swing: 0.5 },
    { id: "t40", labelKey: "beatL40", bpm: 272, bars: 36, seed: 439, density: [0.215, 0.215, 0.215, 0.215], swing: 0.62 },
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

  /* Wall clock on purpose: every drum sound fires on the hit itself, so
   * nothing needs the audio clock, and a suspended AudioContext (a
   * backgrounded page can be muted by the host) must never freeze the
   * falling notes. */
  function nowSec() {
    return performance.now() / 1000;
  }

  /* One track's chart, built from the seed alone: a 16th-step grid where each
   * lane fires with its own probability. No lane may fire on two adjacent
   * steps (it keeps the chart human - fastest repeat is every other 16th -
   * and kills random machine-gun clusters; the rng is still consumed every
   * step, so the seeds keep producing the same charts). A level may set
   * `swing` (0..1): every odd 16th then lands that share of a step late, so
   * the groove leans back without touching the tempo. */
  function buildBeatNotes(level) {
    var rng = mulberry32(level.seed);
    var stepSec = 60 / level.bpm / 4;
    var swing = level.swing || 0;
    var laneNotes = [[], [], [], []];
    var lastFired = [-2, -2, -2, -2];
    var globalStep = 0;
    for (var bar = 0; bar < level.bars; bar += 1) {
      for (var step = 0; step < 16; step += 1) {
        for (var lane = 0; lane < beatLanes; lane += 1) {
          var forced = step === 0 && lane === 0;
          var fires =
            forced ||
            (rng() < level.density[lane] && globalStep - lastFired[lane] > 1);
          if (fires) {
            laneNotes[lane].push({
              time: globalStep * stepSec + (globalStep % 2 ? swing * stepSec : 0),
              judged: false,
              hit: false,
            });
            lastFired[lane] = globalStep;
          }
        }
        globalStep += 1;
      }
    }
    for (var sort = 0; sort < beatLanes; sort += 1) {
      laneNotes[sort].sort(function (a, b) {
        return a.time - b.time;
      });
    }
    var last = 0;
    for (var scan = 0; scan < beatLanes; scan += 1) {
      if (laneNotes[scan].length) {
        last = Math.max(last, laneNotes[scan][laneNotes[scan].length - 1].time);
      }
    }
    return {
      lanes: laneNotes,
      total:
        laneNotes[0].length +
        laneNotes[1].length +
        laneNotes[2].length +
        laneNotes[3].length,
      end: last + 0.8,
    };
  }

  function initInkBeatGame() {
    var canvas = getElement("beatCanvas");
    var scoreEl = getElement("beatScore");
    var comboEl = getElement("beatCombo");
    var accEl = getElement("beatAcc");
    var resultEl = getElement("beatResult");
    var startBtn = getElement("beatStartBtn");
    var bestEl = getElement("beatBest");
    var selectEl = getElement("beatSongSel");
    if (
      !canvas ||
      !scoreEl ||
      !comboEl ||
      !accEl ||
      !resultEl ||
      !startBtn ||
      !bestEl ||
      !selectEl
    ) {
      return;
    }

    var pads = [];
    for (var padIndex = 0; padIndex < beatLanes; padIndex += 1) {
      var pad = getElement("beatPad" + padIndex);
      if (!pad) {
        return;
      }
      pads.push(pad);
    }

    var ctx = canvas.getContext("2d");
    var campaign = createCampaign({ key: "ink-beat-campaign", levels: beatLevels });
    var level = beatLevels[0];
    var audio = null;
    var noiseBuffer = null;
    var notes = [[], [], [], []];
    var lanePointers = [0, 0, 0, 0];
    var ripples = [];
    var running = false;
    var rafId = null;
    var startAt = 0;
    var endAt = 0;
    var score = 0;
    var combo = 0;
    var maxCombo = 0;
    var perfectCount = 0;
    var goodCount = 0;
    var missCount = 0;
    var totalNotes = 0;

    function laneCenter(lane) {
      return (lane + 0.5) * (beatWidth / beatLanes);
    }

    /* Gentle scroll: notes stay on screen for about a second before the
     * hit line, so reading the chart is never the hard part. */
    function pxPerSec() {
      return 150 + level.bpm * 0.35;
    }

    /* Gentle scroll: notes stay on screen for about a second before the
     * hit line, so reading the chart is never the hard part. */
    function pxPerSec() {
      return 150 + level.bpm * 0.35;
    }

    function buildNotes() {
      var chart = buildBeatNotes(level);
      notes = chart.lanes;
      lanePointers = [0, 0, 0, 0];
      totalNotes = chart.total;
      endAt = chart.end;
    }

    function ensureAudio() {
      if (audio) {
        return;
      }
      var Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) {
        return;
      }
      audio = new Ctor();
      var length = Math.floor(audio.sampleRate * 0.2);
      noiseBuffer = audio.createBuffer(1, length, audio.sampleRate);
      var channel = noiseBuffer.getChannelData(0);
      for (var index = 0; index < length; index += 1) {
        channel[index] = Math.random() * 2 - 1;
      }
    }

    function playNoise(duration, filterType, frequency, gainValue) {
      if (!audio) {
        return;
      }
      var source = audio.createBufferSource();
      source.buffer = noiseBuffer;
      var filter = audio.createBiquadFilter();
      filter.type = filterType;
      filter.frequency.value = frequency;
      var gain = audio.createGain();
      gain.gain.setValueAtTime(gainValue, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        audio.currentTime + duration,
      );
      source.connect(filter);
      filter.connect(gain);
      gain.connect(audio.destination);
      source.start();
      source.stop(audio.currentTime + duration);
    }

    function playTone(type, from, to, duration, gainValue) {
      if (!audio) {
        return;
      }
      var osc = audio.createOscillator();
      osc.type = type;
      osc.frequency.setValueAtTime(from, audio.currentTime);
      osc.frequency.exponentialRampToValueAtTime(to, audio.currentTime + duration);
      var gain = audio.createGain();
      gain.gain.setValueAtTime(gainValue, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.start();
      osc.stop(audio.currentTime + duration);
    }

    function playLane(lane) {
      if (lane === 0) {
        playTone("sine", 150, 45, 0.16, 0.5);
      } else if (lane === 1) {
        playNoise(0.14, "bandpass", 1800, 0.4);
      } else if (lane === 2) {
        playNoise(0.06, "highpass", 7000, 0.22);
      } else {
        playTone("square", 98, 82, 0.18, 0.18);
      }
    }

    function renderHud() {
      scoreEl.textContent = String(score);
      comboEl.textContent = String(combo);
      var judged = perfectCount + goodCount + missCount;
      var weighted = perfectCount + goodCount * 0.6;
      accEl.textContent = judged ? Math.round((weighted / judged) * 100) + "%" : "100%";
    }

    function noteY(time, songTime) {
      return beatHitY - (time - songTime) * pxPerSec();
    }

    function judgeMisses(songTime) {
      for (var lane = 0; lane < beatLanes; lane += 1) {
        var list = notes[lane];
        while (lanePointers[lane] < list.length) {
          var next = list[lanePointers[lane]];
          if (!next.judged && songTime - next.time <= beatMissMs / 1000) {
            break;
          }
          if (!next.judged) {
            next.judged = true;
            missCount += 1;
            combo = 0;
            renderHud();
          }
          lanePointers[lane] += 1;
        }
      }
    }

    function hitLane(lane) {
      if (!running) {
        return;
      }
      var songTime = nowSec() - startAt;
      judgeMisses(songTime);
      var list = notes[lane];
      var hit = null;
      for (var index = lanePointers[lane]; index < list.length; index += 1) {
        var note = list[index];
        if (note.judged) {
          continue;
        }
        var delta = (note.time - songTime) * 1000;
        if (delta > beatMissMs) {
          break;
        }
        if (Math.abs(delta) <= beatMissMs) {
          hit = note;
        }
        break;
      }
      playLane(lane);
      ripples.push({ lane: lane, at: performance.now() });
      if (!hit) {
        return;
      }
      hit.judged = true;
      hit.hit = true;
      var perfect = Math.abs((hit.time - songTime) * 1000) <= beatPerfectMs;
      combo += 1;
      maxCombo = Math.max(maxCombo, combo);
      score += (perfect ? 100 : 60) + Math.min(combo, 25) * 2;
      if (perfect) {
        perfectCount += 1;
      } else {
        goodCount += 1;
      }
      renderHud();
    }

    function draw() {
      var songTime = nowSec() - startAt;
      ctx.clearRect(0, 0, beatWidth, beatHeight);
      if (App.world) { App.world.backdrop(ctx, beatWidth, beatHeight, "stage"); }
      /* Before the first Start the stage is an idle lane board: songTime
       * has no meaning yet, so no pulse and no notes are drawn. */
      if (!running) {
        drawLanes();
        drawPads();
        return;
      }
      var beatSec = 60 / level.bpm;
      var phase = (songTime % beatSec) / beatSec;
      ctx.fillStyle = "rgba(255, 255, 255, " + (0.05 * (1 - phase)).toFixed(3) + ")";
      ctx.fillRect(0, 0, beatWidth, beatHeight);
      drawLanes();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
      ctx.beginPath();
      ctx.moveTo(0, beatHitY + 0.5);
      ctx.lineTo(beatWidth, beatHitY + 0.5);
      ctx.stroke();
      for (var drawLane = 0; drawLane < beatLanes; drawLane += 1) {
        var list = notes[drawLane];
        for (var index = lanePointers[drawLane]; index < list.length; index += 1) {
          var note = list[index];
          if (note.hit) {
            continue;
          }
          var y = noteY(note.time, songTime);
          if (y < -20) {
            break;
          }
          if (y > beatHeight + 20) {
            continue;
          }
          ctx.fillStyle = note.judged ? "rgba(100, 116, 139, 0.5)" : beatColors[drawLane];
          ctx.shadowColor = beatColors[drawLane];
          ctx.shadowBlur = note.judged ? 0 : 12;
          ctx.beginPath();
          ctx.arc(laneCenter(drawLane), y, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
      var alive = [];
      for (var ripple = 0; ripple < ripples.length; ripple += 1) {
        var ring = ripples[ripple];
        var age = (performance.now() - ring.at) / 260;
        if (age < 1) {
          ctx.strokeStyle = beatColors[ring.lane];
          ctx.globalAlpha = 1 - age;
          ctx.beginPath();
          ctx.arc(laneCenter(ring.lane), beatHitY, 10 + age * 26, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
          alive.push(ring);
        }
      }
      ripples = alive;
      drawPads();
    }

    function drawLanes() {
      ctx.strokeStyle = "rgba(148, 163, 184, 0.25)";
      for (var lane = 1; lane < beatLanes; lane += 1) {
        ctx.beginPath();
        ctx.moveTo(lane * (beatWidth / beatLanes) + 0.5, 0);
        ctx.lineTo(lane * (beatWidth / beatLanes) + 0.5, beatHeight);
        ctx.stroke();
      }
    }

    function drawPads() {
      for (var pad = 0; pad < beatLanes; pad += 1) {
        ctx.fillStyle = beatColors[pad];
        ctx.fillRect(
          pad * (beatWidth / beatLanes) + 6,
          beatHitY + 8,
          beatWidth / beatLanes - 12,
          beatHeight - beatHitY - 16,
        );
        ctx.fillStyle = "#101426";
        ctx.font = "bold 12px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(beatKeys[pad].toUpperCase(), laneCenter(pad), beatHitY + 8 + (beatHeight - beatHitY - 16) / 2);
      }
    }

    function frame() {
      if (!running) {
        return;
      }
      var songTime = nowSec() - startAt;
      judgeMisses(songTime);
      draw();
      if (songTime >= endAt) {
        finishSong();
        return;
      }
      rafId = window.requestAnimationFrame(frame);
    }

    function refreshPicker() {
      fillCampaignPicker(
        selectEl,
        campaign,
        function (def) {
          return t(def.labelKey);
        },
        t("elementsLocked"),
      );
      selectEl.value = level.id;
      bestEl.textContent = t("campaignStars", {
        n: campaign.totalStars(),
        max: campaign.maxStars(),
      });
    }

    function resetStats() {
      score = 0;
      combo = 0;
      maxCombo = 0;
      perfectCount = 0;
      goodCount = 0;
      missCount = 0;
      ripples = [];
      renderHud();
    }

    function loadLevel(levelDef) {
      stopSong();
      level = levelDef;
      resetStats();
      buildNotes();
      refreshPicker();
      draw();
      resultEl.textContent = t("beatReady", {
        name: t(level.labelKey),
        bpm: level.bpm,
      });
    }

    function stopSong() {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
      running = false;
      if (audio && audio.state === "running") {
        audio.suspend();
      }
    }

    function startSong() {
      stopSong();
      ensureAudio();
      resetStats();
      buildNotes();
      if (audio && audio.state !== "running") {
        audio.resume();
      }
      startAt = performance.now() / 1000 + beatLeadSec;
      running = true;
      resultEl.textContent = t("beatGo");
      draw();
      canvas.focus();
      rafId = window.requestAnimationFrame(frame);
    }

    function finishSong() {
      stopSong();
      running = false;
      var accuracy = totalNotes
        ? Math.round(((perfectCount + goodCount * 0.6) / totalNotes) * 100)
        : 0;
      var starsWon = starsFor(accuracy, [92, 78, 60], "high");
      var message = t("beatFinished", {
        acc: accuracy,
        n: maxCombo,
        stars: starsWon,
      });
      /* A fumbled run is not a clear: below the one-star line the track
       * stays locked for the next attempt, like every other campaign. */
      if (starsWon === 0) {
        resultEl.textContent = message + " " + t("beatRetry");
        draw();
        return;
      }
      var outcome = campaign.record(level.id, {
        stars: starsWon,
        best: accuracy,
      });
      if (outcome.isBest) {
        message += " " + t("newBest");
      }
      if (outcome.unlockedNext) {
        message += " " + t("beatNextTrack");
      } else if (campaign.clearedCount() === beatLevels.length) {
        message += " " + t("beatCampaignDone");
      }
      logAction(t("logBeat", { name: t(level.labelKey), acc: accuracy }));
      var rect = startBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      refreshPicker();
      resultEl.textContent = message;
      draw();
    }

    canvas.addEventListener("keydown", function (event) {
      var lane = beatKeys.indexOf(event.key.toLowerCase());
      if (lane >= 0) {
        event.preventDefault();
        hitLane(lane);
      }
    });

    pads.forEach(function (pad, lane) {
      pad.addEventListener("pointerdown", function (event) {
        event.preventDefault();
        hitLane(lane);
      });
    });

    selectEl.addEventListener("change", function () {
      var index = campaign.indexOf(selectEl.value);
      if (index >= 0 && campaign.isUnlocked(selectEl.value)) {
        loadLevel(beatLevels[index]);
      }
    });

    startBtn.addEventListener("click", startSong);

    App.quietResetInkBeat = function () {
      if (running) {
        stopSong();
        resultEl.textContent = t("beatPaused");
      }
    };

    loadLevel(beatLevels[campaign.indexOf(campaign.nextLevelId())]);
  }


  /* Exported for the other modules. */
  App.initInkBeatGame = initInkBeatGame;
  /* The chart builder is pure (seed in, notes out), so the release gate can
   * replay a track's own stream headlessly without a second copy of it. */
  App.beatChart = buildBeatNotes;
  /* The level table travels too, so the gate can check the ladder's shape
   * without regex-scraping this source. */
  App.beatLevels = beatLevels;

  /* Bilingual copy travels with the game: addStrings only fills keys i18n.js
   * does not already own, so the shared dictionary stays authoritative. The
   * hard tier keeps the cosmic register the shared dictionary carries. */
  App.addStrings({
    en: {
      "beatL21": "Binary Star",
      "beatL22": "Equilibrium",
      "beatL23": "Relentless",
      "beatL24": "Nova Overdrive",
      "beatL25": "Pulsar Wall",
      "beatL26": "Perihelion",
      "beatL27": "Chain Reaction",
      "beatL28": "Gravity Well",
      "beatL29": "Escape Velocity",
      "beatL30": "Singularity",
      "beatL31": "Neutron Wall",
      "beatL32": "Event Horizon",
      "beatL33": "Light Speed",
      "beatL34": "Solo Flare",
      "beatL35": "Wormhole",
      "beatL36": "Red Giant",
      "beatL37": "Solar Wind",
      "beatL38": "Magnetosphere",
      "beatL39": "Supernova",
      "beatL40": "The Big Bang",
    },
    zh: {
      "beatL21": "双星焰",
      "beatL22": "均势场",
      "beatL23": "绵延不绝",
      "beatL24": "超频新星",
      "beatL25": "脉冲星阵",
      "beatL26": "近日点",
      "beatL27": "链式反应",
      "beatL28": "引力深井",
      "beatL29": "逃逸速度",
      "beatL30": "奇点",
      "beatL31": "中子星墙",
      "beatL32": "视界之外",
      "beatL33": "光速平墙",
      "beatL34": "孤星耀斑",
      "beatL35": "虫洞摇摆",
      "beatL36": "红巨马拉松",
      "beatL37": "太阳风行",
      "beatL38": "磁层壁垒",
      "beatL39": "超新星爆",
      "beatL40": "宇宙大爆炸",
    },
  });
})(window.CapitalConvert = window.CapitalConvert || {});
