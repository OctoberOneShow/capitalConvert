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
   * Densities are tuned for a casual curve: roughly 1.2 notes per second on
   * the first track up to about 3.5 on the last, and buildNotes additionally
   * refuses same-lane notes on adjacent steps so charts never machine-gun. */
  var beatLevels = [
    { id: "t1", labelKey: "beatL1", bpm: 92, bars: 12, seed: 11, density: [0.07, 0.03, 0.04, 0.008] },
    { id: "t2", labelKey: "beatL2", bpm: 104, bars: 14, seed: 23, density: [0.08, 0.045, 0.06, 0.015] },
    { id: "t3", labelKey: "beatL3", bpm: 116, bars: 14, seed: 37, density: [0.09, 0.05, 0.08, 0.025] },
    { id: "t4", labelKey: "beatL4", bpm: 128, bars: 16, seed: 53, density: [0.085, 0.05, 0.08, 0.025] },
    { id: "t5", labelKey: "beatL5", bpm: 140, bars: 16, seed: 71, density: [0.095, 0.06, 0.095, 0.035] },
    { id: "t6", labelKey: "beatL6", bpm: 152, bars: 18, seed: 97, density: [0.105, 0.07, 0.11, 0.045] },
    { id: "t7", labelKey: "beatL7", bpm: 164, bars: 18, seed: 113, density: [0.11, 0.075, 0.12, 0.05] },
    { id: "t8", labelKey: "beatL8", bpm: 176, bars: 20, seed: 131, density: [0.115, 0.08, 0.13, 0.055] },
    { id: "t9", labelKey: "lvlNum9", bpm: 184, bars: 22, seed: 138, density: [0.115, 0.08, 0.13, 0.055] },
    { id: "t10", labelKey: "lvlNum10", bpm: 190, bars: 24, seed: 145, density: [0.115, 0.08, 0.13, 0.055] },
    { id: "t11", labelKey: "lvlNum11", bpm: 190, bars: 26, seed: 152, density: [0.115, 0.08, 0.13, 0.055] },
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

    /* Wall clock on purpose: every drum sound fires on the hit itself, so
     * nothing needs the audio clock, and a suspended AudioContext (a
     * backgrounded page can be muted by the host) must never freeze the
     * falling notes. */
    function nowSec() {
      return performance.now() / 1000;
    }

    function buildNotes() {
      var rng = mulberry32(level.seed);
      var stepSec = 60 / level.bpm / 4;
      var laneNotes = [[], [], [], []];
      /* No lane may fire on two adjacent steps: it keeps the chart human
       * (fastest repeat is every other 16th) and kills random machine-gun
       * clusters. The rng is still consumed every step, so the seeds keep
       * producing the same charts. */
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
                time: globalStep * stepSec,
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
      notes = laneNotes;
      lanePointers = [0, 0, 0, 0];
      totalNotes =
        notes[0].length + notes[1].length + notes[2].length + notes[3].length;
      var last = 0;
      for (var scan = 0; scan < beatLanes; scan += 1) {
        if (notes[scan].length) {
          last = Math.max(last, notes[scan][notes[scan].length - 1].time);
        }
      }
      endAt = last + 0.8;
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
})(window.CapitalConvert = window.CapitalConvert || {});
