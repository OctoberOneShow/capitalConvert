/* Crosswind Kites - the tethered flight mini-game in the shared game drawer.
 * A kite hangs off a line over a city skyline, and the sky is sheared into three
 * wind layers. Line length decides the arc you sweep and the layer you can
 * reach, so the same corner is a tight turn on a short line and a wide slide on
 * a long one. Ribbons drift downwind: hook them to buy more air time, while a
 * rival kite works the same sky. Par is not guessed - a scripted pilot flies the
 * identical stepper at 60Hz and its measured catch count sets the star bands.
 * Registered through the game registry, so it needs no page markup. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  var t = App.t;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  var createCampaign = App.createCampaign;
  var fillCampaignPicker = App.fillCampaignPicker;
  var starsFor = App.starsFor;
  var isMotionOff = App.isMotionOff;

  /* Sky plate: the winch sits at the bottom centre, the rooftops start at
   * kctRoof above it, and the line may never swing wider than kctSwing. */
  var kctW = 440;
  var kctH = 390;
  var kctAx = 220;
  var kctAy = 352;
  var kctRoof = 34;
  var kctSwing = 1.18;
  var kctCross = kctW + 48;

  /* Tuning, shared by the frame loop and by the scripted par replay. */
  var kctGravity = 200;
  var kctWindAccel = 0.9;
  var kctDamp = 1.9;
  var kctReelRate = 55;
  var kctPumpReel = 1.9;
  var kctPumpTurn = 1.6;
  var kctQRef = 300;
  var kctPumpDrain = 42;
  var kctPumpFill = 17;
  var kctSnag = 2;
  var kctDt = 1 / 60;
  /* The longest tick either entry point will honour. Anything longer, or
   * anything that is not a finite number, is a broken frame rather than a
   * fast one, so it is read as no time at all. */
  var kctMaxTick = 0.032;

  /* Wind layers: the altitude band they own, their steady speed, the gust size
   * and its period. The shear between them is the whole puzzle. */
  var kctLayers = [
    { mid: 55, low: 0, high: 92, base: 52, gust: 20, period: 3.4 },
    { mid: 135, low: 92, high: 182, base: 104, gust: 14, period: 5.1 },
    { mid: 232, low: 182, high: 300, base: 168, gust: 26, period: 7.7 },
  ];

  /* The three ribbon decks, as altitudes: low is easy but the wind there is
   * feeble, high pays the same and takes a long line to reach. */
  var kctDecks = [
    { low: 44, span: 34, step: 13 },
    { low: 118, span: 44, step: 13 },
    { low: 196, span: 40, step: 11 },
  ];

  /* Flights: line range, pull, capture reach, air time, the ribbon stream and
   * the rival's own skill (including the deck it prefers). `basePar` is only the
   * safety net - the star ladder itself is hung off the measured scripted line. */
  var kctFlights = [
    {
      id: "k1", labelKey: "kctF1", lineMin: 88, lineMax: 214, turn: 400, grab: 26,
      start: 18, bonus: 2.8, shear: 1, basePar: 8,
      rival: { gain: 0.86, lead: 0.75, speed: 148, react: 0.4, lane: 0 },
      stream: [
        { at: 0.6, lane: 0, speed: 64 },
        { at: 2.9, lane: 1, speed: 60 },
        { at: 5.2, lane: 0, speed: 66 },
        { at: 7.5, lane: 2, speed: 58 },
        { at: 9.8, lane: 1, speed: 63 },
        { at: 12.1, lane: 0, speed: 68 },
        { at: 14.4, lane: 2, speed: 59 },
        { at: 16.7, lane: 1, speed: 62 },
        { at: 19, lane: 0, speed: 67 },
        { at: 21.3, lane: 2, speed: 58 },
        { at: 23.6, lane: 1, speed: 64 },
        { at: 25.9, lane: 0, speed: 66 },
      ],
    },
    {
      id: "k2", labelKey: "kctF2", lineMin: 82, lineMax: 226, turn: 415, grab: 25,
      start: 18, bonus: 2.7, shear: 1.2, basePar: 9,
      rival: { gain: 0.92, lead: 0.85, speed: 162, react: 0.3, lane: 1 },
      stream: [
        { at: 0.5, lane: 1, speed: 58 },
        { at: 2.6, lane: 2, speed: 55 },
        { at: 4.7, lane: 0, speed: 60 },
        { at: 6.8, lane: 1, speed: 57 },
        { at: 8.9, lane: 2, speed: 54 },
        { at: 11, lane: 0, speed: 62 },
        { at: 13.1, lane: 1, speed: 58 },
        { at: 15.2, lane: 2, speed: 55 },
        { at: 17.3, lane: 0, speed: 61 },
        { at: 19.4, lane: 1, speed: 57 },
        { at: 21.5, lane: 2, speed: 54 },
        { at: 23.6, lane: 0, speed: 62 },
        { at: 25.7, lane: 1, speed: 58 },
        { at: 27.8, lane: 2, speed: 55 },
      ],
    },
    {
      id: "k3", labelKey: "kctF3", lineMin: 76, lineMax: 230, turn: 425, grab: 24,
      start: 19, bonus: 2.6, shear: 1.35, basePar: 10,
      rival: { gain: 0.96, lead: 0.9, speed: 172, react: 0.22, lane: 1 },
      stream: [
        { at: 0.5, lane: 2, speed: 60 },
        { at: 2.5, lane: 0, speed: 66 },
        { at: 4.5, lane: 1, speed: 62 },
        { at: 6.5, lane: 2, speed: 58 },
        { at: 8.5, lane: 0, speed: 68 },
        { at: 10.5, lane: 1, speed: 63 },
        { at: 12.5, lane: 2, speed: 59 },
        { at: 14.5, lane: 0, speed: 67 },
        { at: 16.5, lane: 1, speed: 62 },
        { at: 18.5, lane: 2, speed: 58 },
        { at: 20.5, lane: 0, speed: 68 },
        { at: 22.5, lane: 1, speed: 63 },
        { at: 24.5, lane: 2, speed: 59 },
        { at: 26.5, lane: 0, speed: 67 },
        { at: 28.5, lane: 1, speed: 62 },
        { at: 30.5, lane: 2, speed: 58 },
      ],
    },
    {
      id: "k4", labelKey: "kctF4", lineMin: 70, lineMax: 236, turn: 440, grab: 23,
      start: 20, bonus: 2.5, shear: 1.5, basePar: 13,
      rival: { gain: 1, lead: 1, speed: 182, react: 0.14, lane: 2 },
      stream: [
        { at: 0.4, lane: 1, speed: 66 },
        { at: 2.3, lane: 2, speed: 62 },
        { at: 4.2, lane: 0, speed: 70 },
        { at: 6.1, lane: 1, speed: 67 },
        { at: 8, lane: 2, speed: 61 },
        { at: 9.9, lane: 0, speed: 71 },
        { at: 11.8, lane: 1, speed: 66 },
        { at: 13.7, lane: 2, speed: 62 },
        { at: 15.6, lane: 0, speed: 70 },
        { at: 17.5, lane: 1, speed: 67 },
        { at: 19.4, lane: 2, speed: 61 },
        { at: 21.3, lane: 0, speed: 71 },
        { at: 23.2, lane: 1, speed: 66 },
        { at: 25.1, lane: 2, speed: 62 },
        { at: 27, lane: 0, speed: 70 },
        { at: 28.9, lane: 1, speed: 67 },
        { at: 30.8, lane: 2, speed: 61 },
        { at: 32.7, lane: 0, speed: 71 },
        { at: 34.6, lane: 1, speed: 66 },
        { at: 36.5, lane: 2, speed: 62 },
        { at: 38.4, lane: 0, speed: 70 },
        { at: 40.3, lane: 1, speed: 67 },
      ],
    },
    {
      id: "k5", labelKey: "kctF5", lineMin: 70, lineMax: 236, turn: 450, grab: 22,
      start: 20, bonus: 2.4, shear: 1.7, basePar: 14,
      rival: { gain: 1, lead: 1, speed: 190, react: 0.06, lane: 2 },
      stream: [
        { at: 0.4, lane: 2, speed: 64 },
        { at: 2.2, lane: 0, speed: 74 },
        { at: 4, lane: 1, speed: 69 },
        { at: 5.8, lane: 2, speed: 63 },
        { at: 7.6, lane: 0, speed: 75 },
        { at: 9.4, lane: 1, speed: 70 },
        { at: 11.2, lane: 2, speed: 64 },
        { at: 13, lane: 0, speed: 74 },
        { at: 14.8, lane: 1, speed: 69 },
        { at: 16.6, lane: 2, speed: 63 },
        { at: 18.4, lane: 0, speed: 75 },
        { at: 20.2, lane: 1, speed: 70 },
        { at: 22, lane: 2, speed: 64 },
        { at: 23.8, lane: 0, speed: 74 },
        { at: 25.6, lane: 1, speed: 69 },
        { at: 27.4, lane: 2, speed: 63 },
        { at: 29.2, lane: 0, speed: 75 },
        { at: 31, lane: 1, speed: 70 },
        { at: 32.8, lane: 2, speed: 64 },
        { at: 34.6, lane: 0, speed: 74 },
        { at: 36.4, lane: 1, speed: 69 },
        { at: 38.2, lane: 2, speed: 63 },
        { at: 40, lane: 0, speed: 75 },
        { at: 41.8, lane: 1, speed: 70 },
      ],
    },
    {
      id: "k6", labelKey: "kctF6", lineMin: 76, lineMax: 236, turn: 455, grab: 21,
      start: 21, bonus: 2.35, shear: 1.85, basePar: 15,
      rival: { gain: 1, lead: 1, speed: 194, react: 0.05, lane: 2 },
      stream: [
        { at: 0.5, lane: 0, speed: 66 },
        { at: 2.35, lane: 2, speed: 60 },
        { at: 4.2, lane: 1, speed: 68 },
        { at: 6.05, lane: 0, speed: 70 },
        { at: 7.9, lane: 2, speed: 58 },
        { at: 9.75, lane: 1, speed: 64 },
        { at: 11.6, lane: 0, speed: 66 },
        { at: 13.45, lane: 2, speed: 60 },
        { at: 15.3, lane: 1, speed: 68 },
        { at: 17.15, lane: 0, speed: 70 },
        { at: 19, lane: 2, speed: 58 },
        { at: 20.85, lane: 1, speed: 64 },
        { at: 22.7, lane: 0, speed: 66 },
        { at: 24.55, lane: 2, speed: 60 },
        { at: 26.4, lane: 1, speed: 68 },
        { at: 28.25, lane: 0, speed: 70 },
        { at: 30.1, lane: 2, speed: 58 },
        { at: 31.95, lane: 1, speed: 64 },
        { at: 33.8, lane: 0, speed: 66 },
        { at: 35.65, lane: 2, speed: 60 },
        { at: 37.5, lane: 1, speed: 68 },
        { at: 39.35, lane: 0, speed: 70 },
        { at: 41.2, lane: 2, speed: 58 },
        { at: 43.05, lane: 1, speed: 64 },
        { at: 44.9, lane: 0, speed: 66 },
        { at: 46.75, lane: 2, speed: 60 },
      ],
    },
    {
      id: "k7", labelKey: "kctF7", lineMin: 72, lineMax: 234, turn: 450, grab: 21,
      start: 21, bonus: 2.3, shear: 2, basePar: 16,
      rival: { gain: 1, lead: 1, speed: 198, react: 0.04, lane: 2 },
      stream: [
        { at: 0.5, lane: 1, speed: 64 },
        { at: 2.3, lane: 0, speed: 68 },
        { at: 4.1, lane: 2, speed: 60 },
        { at: 5.9, lane: 1, speed: 68 },
        { at: 7.7, lane: 0, speed: 62 },
        { at: 9.5, lane: 2, speed: 64 },
        { at: 11.3, lane: 1, speed: 64 },
        { at: 13.1, lane: 0, speed: 68 },
        { at: 14.9, lane: 2, speed: 60 },
        { at: 16.7, lane: 1, speed: 68 },
        { at: 18.5, lane: 0, speed: 62 },
        { at: 20.3, lane: 2, speed: 64 },
        { at: 22.1, lane: 1, speed: 64 },
        { at: 23.9, lane: 0, speed: 68 },
        { at: 25.7, lane: 2, speed: 60 },
        { at: 27.5, lane: 1, speed: 68 },
        { at: 29.3, lane: 0, speed: 62 },
        { at: 31.1, lane: 2, speed: 64 },
        { at: 32.9, lane: 1, speed: 64 },
        { at: 34.7, lane: 0, speed: 68 },
        { at: 36.5, lane: 2, speed: 60 },
        { at: 38.3, lane: 1, speed: 68 },
        { at: 40.1, lane: 0, speed: 62 },
        { at: 41.9, lane: 2, speed: 64 },
        { at: 43.7, lane: 1, speed: 64 },
        { at: 45.5, lane: 0, speed: 68 },
        { at: 47.3, lane: 2, speed: 60 },
        { at: 49.1, lane: 1, speed: 68 },
      ],
    },
    {
      id: "k8", labelKey: "kctF8", lineMin: 104, lineMax: 246, turn: 460, grab: 20,
      start: 21, bonus: 2.25, shear: 2.1, basePar: 17,
      rival: { gain: 1, lead: 1, speed: 202, react: 0.04, lane: 0 },
      stream: [
        { at: 0.4, lane: 2, speed: 62 },
        { at: 2.2, lane: 1, speed: 68 },
        { at: 4, lane: 0, speed: 72 },
        { at: 5.8, lane: 2, speed: 60 },
        { at: 7.6, lane: 1, speed: 66 },
        { at: 9.4, lane: 0, speed: 70 },
        { at: 11.2, lane: 2, speed: 62 },
        { at: 13, lane: 1, speed: 68 },
        { at: 14.8, lane: 0, speed: 72 },
        { at: 16.6, lane: 2, speed: 60 },
        { at: 18.4, lane: 1, speed: 66 },
        { at: 20.2, lane: 0, speed: 70 },
        { at: 22, lane: 2, speed: 62 },
        { at: 23.8, lane: 1, speed: 68 },
        { at: 25.6, lane: 0, speed: 72 },
        { at: 27.4, lane: 2, speed: 60 },
        { at: 29.2, lane: 1, speed: 66 },
        { at: 31, lane: 0, speed: 70 },
        { at: 32.8, lane: 2, speed: 62 },
        { at: 34.6, lane: 1, speed: 68 },
        { at: 36.4, lane: 0, speed: 72 },
        { at: 38.2, lane: 2, speed: 60 },
        { at: 40, lane: 1, speed: 66 },
        { at: 41.8, lane: 0, speed: 70 },
        { at: 43.6, lane: 2, speed: 62 },
        { at: 45.4, lane: 1, speed: 68 },
        { at: 47.2, lane: 0, speed: 72 },
        { at: 49, lane: 2, speed: 60 },
      ],
    },
    {
      id: "k9", labelKey: "kctF9", lineMin: 92, lineMax: 240, turn: 460, grab: 20,
      start: 21, bonus: 2.2, shear: 2.25, basePar: 18,
      rival: { gain: 1, lead: 1, speed: 204, react: 0.03, lane: 0 },
      stream: [
        { at: 0.4, lane: 2, speed: 60 },
        { at: 2.2, lane: 1, speed: 66 },
        { at: 4, lane: 0, speed: 70 },
        { at: 5.8, lane: 2, speed: 58 },
        { at: 7.6, lane: 1, speed: 64 },
        { at: 9.4, lane: 0, speed: 68 },
        { at: 11.2, lane: 2, speed: 60 },
        { at: 13, lane: 1, speed: 66 },
        { at: 14.8, lane: 0, speed: 70 },
        { at: 16.6, lane: 2, speed: 58 },
        { at: 18.4, lane: 1, speed: 64 },
        { at: 20.2, lane: 0, speed: 68 },
        { at: 22, lane: 2, speed: 60 },
        { at: 23.8, lane: 1, speed: 66 },
        { at: 25.6, lane: 0, speed: 70 },
        { at: 27.4, lane: 2, speed: 58 },
        { at: 29.2, lane: 1, speed: 64 },
        { at: 31, lane: 0, speed: 68 },
        { at: 32.8, lane: 2, speed: 60 },
        { at: 34.6, lane: 1, speed: 66 },
        { at: 36.4, lane: 0, speed: 70 },
        { at: 38.2, lane: 2, speed: 58 },
        { at: 40, lane: 1, speed: 64 },
        { at: 41.8, lane: 0, speed: 68 },
        { at: 43.6, lane: 2, speed: 60 },
        { at: 45.4, lane: 1, speed: 66 },
        { at: 47.2, lane: 0, speed: 70 },
        { at: 49, lane: 2, speed: 58 },
        { at: 50.8, lane: 1, speed: 64 },
        { at: 52.6, lane: 0, speed: 68 },
      ],
    },
    {
      id: "k10", labelKey: "kctF10", lineMin: 96, lineMax: 248, turn: 465, grab: 19,
      start: 22, bonus: 2.15, shear: 2.4, basePar: 19,
      rival: { gain: 1, lead: 1, speed: 210, react: 0.02, lane: 0 },
      stream: [
        { at: 0.4, lane: 2, speed: 60 },
        { at: 2.2, lane: 1, speed: 66 },
        { at: 4, lane: 0, speed: 70 },
        { at: 5.8, lane: 2, speed: 58 },
        { at: 7.6, lane: 1, speed: 64 },
        { at: 9.4, lane: 0, speed: 68 },
        { at: 11.2, lane: 1, speed: 62 },
        { at: 13, lane: 2, speed: 60 },
        { at: 14.8, lane: 2, speed: 60 },
        { at: 16.6, lane: 1, speed: 66 },
        { at: 18.4, lane: 0, speed: 70 },
        { at: 20.2, lane: 2, speed: 58 },
        { at: 22, lane: 1, speed: 64 },
        { at: 23.8, lane: 0, speed: 68 },
        { at: 25.6, lane: 1, speed: 62 },
        { at: 27.4, lane: 2, speed: 60 },
        { at: 29.2, lane: 2, speed: 60 },
        { at: 31, lane: 1, speed: 66 },
        { at: 32.8, lane: 0, speed: 70 },
        { at: 34.6, lane: 2, speed: 58 },
        { at: 36.4, lane: 1, speed: 64 },
        { at: 38.2, lane: 0, speed: 68 },
        { at: 40, lane: 1, speed: 62 },
        { at: 41.8, lane: 2, speed: 60 },
        { at: 43.6, lane: 2, speed: 60 },
        { at: 45.4, lane: 1, speed: 66 },
        { at: 47.2, lane: 0, speed: 70 },
        { at: 49, lane: 2, speed: 58 },
      ],
    },
  ];

  /* --- pure core ---------------------------------------------------------- */

  /* A reading is only usable if it is a finite number: NaN or Infinity from a
   * stray caller must not be able to poison the kite's state, so anything that
   * is not a number reads as 0. */
  function kctNumber(value) {
    return typeof value === "number" && isFinite(value) ? value : 0;
  }

  /* Every tick length funnels through here, so a broken frame cannot leap the
   * clock past the sky or hand the stepper an unbounded dt. */
  function kctTick(dt) {
    var raw = kctNumber(dt);
    return raw > 0 ? Math.min(raw, kctMaxTick) : 0;
  }

  /* A layer value read at an altitude, blended across the boundary so the shear
   * is continuous instead of a step the kite can fall off. */
  function kctBlend(alt, key) {
    for (var i = 0; i < kctLayers.length; i += 1) {
      var layer = kctLayers[i];
      if (alt <= layer.low) {
        return layer[key];
      }
      if (alt < layer.high) {
        var next = kctLayers[i + 1] || layer;
        var k = (alt - layer.low) / (layer.high - layer.low || 1);
        return layer[key] + (next[key] - layer[key]) * k;
      }
    }
    var top = kctLayers[kctLayers.length - 1];
    return top[key];
  }

  /* The gust field. No randomness anywhere: the same clock reading is the same
   * sky for the scripted replay and for the player. */
  function kctWind(alt, tsec, def) {
    var clamped = alt > 0 ? alt : 0;
    var clock = kctNumber(tsec);
    var steady = kctBlend(clamped, "base");
    var gust = kctBlend(clamped, "gust");
    var period = kctBlend(clamped, "period");
    var shear = def && def.shear > 0 ? def.shear : 1;
    var swell = gust * shear;
    return Math.max(
      8,
      steady + swell * Math.sin((2 * Math.PI * clock) / period) + swell * 0.45 * Math.sin(clock * 1.9 + clamped / 70),
    );
  }

  function kctLayerOf(alt) {
    for (var i = 0; i < kctLayers.length; i += 1) {
      if (alt < kctLayers[i].high) {
        return i;
      }
    }
    return kctLayers.length - 1;
  }

  function kctDist(ax, ay, bx, by) {
    var dx = ax - bx;
    var dy = ay - by;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function kctPlace(line, theta) {
    return {
      x: kctAx + line * Math.sin(theta),
      y: kctAy - line * Math.cos(theta),
    };
  }

  /* A kite is a polar state on the line: how much line is out, how far around
   * the winch it sits, and how fast that angle is changing. */
  function kctStart(def, theta, line) {
    var spot = kctPlace(line, theta);
    return {
      x: spot.x,
      y: spot.y,
      line: line,
      theta: theta,
      omega: 0,
      reel: 0,
      pump: false,
      meter: 100,
      score: 0,
      snagged: false,
    };
  }

  function kctClone(kite) {
    return {
      x: kite.x,
      y: kite.y,
      line: kite.line,
      theta: kite.theta,
      omega: kite.omega,
      reel: kite.reel,
      pump: !!kite.pump,
      meter: kite.meter,
      score: kite.score,
      snagged: !!kite.snagged,
    };
  }

  /* Apparent wind is what the kite actually feels: the layer's flow minus its
   * own motion. Sweeping across the sky multiplies it, and that is the pull the
   * bridle buys - the crosswind of the title. */
  function kctApparent(kite, def, tsec) {
    var wind = kctWind(kctAy - kite.y, tsec, def);
    var sin = Math.sin(kite.theta);
    var cos = Math.cos(kite.theta);
    var vx = kite.reel * sin + kite.line * kite.omega * cos;
    var vy = kite.reel * cos - kite.line * kite.omega * sin;
    var dx = wind - vx;
    return { wind: wind, q: Math.sqrt(dx * dx + vy * vy) };
  }

  /* Line strength: pumping multiplies the pull and the reel speed, and it is the
   * only thing that eats the meter. Let go and it climbs back. */
  function kctPumpMeter(meter, pumping, dt) {
    var value = pumping ? meter - kctPumpDrain * dt : meter + kctPumpFill * dt;
    return value < 0 ? 0 : value > 100 ? 100 : value;
  }

  /* The two runaway speeds the plate can ever need, with room to spare: the
   * reel is at most kctReelRate * kctPumpReel and the measured sweep on the
   * shortest line stays well under the cap, so these only ever catch a state
   * that was handed in broken. */
  var kctReelCap = kctReelRate * kctPumpReel;
  var kctOmegaCap = 20;

  /* Read a kite back inside the plate before it is integrated. Positions are
   * derived from line and theta, so bounding those two bounds the sky as well:
   * nothing a caller hands in can carry a NaN or an unbounded speed forward. */
  function kctSettle(kite, def) {
    var floor = def.lineMin > 0 ? def.lineMin : 1;
    var ceil = def.lineMax > floor ? def.lineMax : floor + 1;
    kite.line = Math.min(ceil, Math.max(floor, kctNumber(kite.line)));
    kite.theta = Math.min(kctSwing, Math.max(-kctSwing, kctNumber(kite.theta)));
    kite.omega = Math.min(kctOmegaCap, Math.max(-kctOmegaCap, kctNumber(kite.omega)));
    kite.reel = Math.min(kctReelCap, Math.max(-kctReelCap, kctNumber(kite.reel)));
    kite.meter = Math.min(100, Math.max(0, kctNumber(kite.meter)));
    kite.score = Math.floor(kctNumber(kite.score));
  }

  /* One physics tick for a single kite. `input` is {steer, reel, pump}. */
  function kctStep(kite, input, def, tsec, dt) {
    var step = kctTick(dt);
    var want = input || {};
    var next = kctClone(kite);
    kctSettle(next, def);
    var pump = !!want.pump && kite.meter >= kctPumpDrain * 0.35;
    var air = kctApparent(kite, def, tsec);
    var pull = def.turn * (0.3 + (0.7 * Math.min(air.q, kctQRef)) / kctQRef);
    if (pump) {
      pull *= kctPumpTurn;
    }
    var steer = Math.max(-1, Math.min(1, kctNumber(want.steer)));
    var pay = Math.max(-1, Math.min(1, kctNumber(want.reel)));
    /* Same pull, longer line: the torque is thin, so the turn radius grows. */
    next.omega += ((steer * pull) / next.line) * step;
    next.omega += ((kctWindAccel * air.wind * Math.cos(next.theta)) / next.line) * step;
    next.omega -= ((kctGravity * Math.sin(next.theta)) / next.line) * step;
    next.omega /= 1 + kctDamp * step;
    next.theta += next.omega * step;
    if (next.theta > kctSwing) {
      next.theta = kctSwing;
      next.omega *= -0.2;
    } else if (next.theta < -kctSwing) {
      next.theta = -kctSwing;
      next.omega *= -0.2;
    }
    next.reel = pay * kctReelRate * (pump ? kctPumpReel : 1);
    next.line += next.reel * step;
    if (next.line < def.lineMin) {
      next.line = def.lineMin;
    }
    if (next.line > def.lineMax) {
      next.line = def.lineMax;
    }
    next.meter = kctPumpMeter(kite.meter, pump, step);
    next.pump = pump;
    if (kctAy - kctPlace(next.line, next.theta).y < kctRoof) {
      /* The rooftops: fold the swing back to the edge of the window and mark the
       * dip, so the cost is charged once on the way in, not every frame. */
      var reach = next.line > kctRoof + 4 ? next.line : kctRoof + 4;
      var edge = Math.acos(Math.min(1, kctRoof / reach));
      next.theta = next.theta > 0 ? edge : -edge;
      next.omega *= -0.2;
      next.snagged = true;
    } else if (kctAy - kctPlace(next.line, next.theta).y > kctRoof + 22) {
      next.snagged = false;
    }
    var spot = kctPlace(next.line, next.theta);
    next.x = spot.x;
    next.y = spot.y;
    return next;
  }

  function kctFreshRibbon(rb, index) {
    var deck = kctDecks[rb.lane] || kctDecks[0];
    return {
      at: rb.at,
      lane: rb.lane,
      speed: rb.speed,
      alt: deck.low + ((index * deck.step) % deck.span),
      sway: rb.lane === 1 ? 10 : 6,
      phase: rb.at * 0.7 + rb.lane,
      x: -60,
      y: 0,
      gone: false,
      taken: "",
    };
  }

  function kctLayRibbon(rb, tsec) {
    var since = tsec - rb.at;
    var x = since > 0 ? -24 + rb.speed * since : -60;
    return {
      x: x,
      y: kctAy - rb.alt - rb.sway * Math.sin(rb.phase + tsec * 1.1),
      gone: rb.speed * since > kctCross,
    };
  }

  function kctCloneRibbon(rb, tsec) {
    var spot = kctLayRibbon(rb, tsec);
    return {
      at: rb.at,
      lane: rb.lane,
      speed: rb.speed,
      alt: rb.alt,
      sway: rb.sway,
      phase: rb.phase,
      x: spot.x,
      y: spot.y,
      gone: spot.gone,
      taken: rb.taken,
    };
  }

  /* Ribbons still up for grabs, yours or the rival's: once none are left the
   * sky is empty and the flight is over. */
  function kctRemaining(world) {
    var n = 0;
    for (var i = 0; i < world.stream.length; i += 1) {
      if (!world.stream[i].taken && !world.stream[i].gone) {
        n += 1;
      }
    }
    return n;
  }

  function kctOnWing(world) {
    var n = 0;
    for (var i = 0; i < world.stream.length; i += 1) {
      var rb = world.stream[i];
      if (!rb.taken && !rb.gone && rb.x > -30 && rb.x < kctW + 20) {
        n += 1;
      }
    }
    return n;
  }

  function kctWorld(def) {
    var stream = [];
    for (var i = 0; i < def.stream.length; i += 1) {
      stream.push(kctCloneRibbon(kctFreshRibbon(def.stream[i], i), 0));
    }
    return {
      t: 0,
      clock: def.start,
      you: kctStart(def, 0.42, def.lineMin + 46),
      foe: kctStart(def, -0.3, def.lineMin + 30),
      stream: stream,
      over: false,
    };
  }

  /* Advance the whole sky one tick: both kites, the drifting stream, the
   * captures and the clock. The frame loop and the par replay both come through
   * here, which is what makes the measured par a real number. */
  function kctAdvance(world, def, player, rival, dt) {
    var tick = kctTick(dt);
    var out = {
      t: kctNumber(world.t) + tick,
      clock: kctNumber(world.clock) - tick,
      you: kctClone(world.you),
      foe: kctClone(world.foe),
      stream: [],
      over: false,
    };
    var events = { got: 0, stolen: 0, snags: 0, over: false };
    for (var i = 0; i < world.stream.length; i += 1) {
      out.stream.push(kctCloneRibbon(world.stream[i], out.t));
    }
    var wasYours = world.you.snagged;
    var wasTheirs = world.foe.snagged;
    out.you = kctStep(world.you, player, def, world.t, tick);
    out.foe = kctStep(world.foe, rival, def, world.t, tick);
    if (out.you.snagged && !wasYours) {
      events.snags += 1;
    }
    if (out.foe.snagged && !wasTheirs) {
      events.snags += 1;
    }
    out.clock -= events.snags * kctSnag;
    for (var r = 0; r < out.stream.length; r += 1) {
      var rb = out.stream[r];
      if (rb.taken || rb.gone || rb.x < -20) {
        continue;
      }
      var yours = kctDist(out.you.x, out.you.y, rb.x, rb.y);
      var theirs = kctDist(out.foe.x, out.foe.y, rb.x, rb.y);
      if (yours <= def.grab && yours <= theirs) {
        rb.taken = "you";
        out.you.score += 1;
        out.clock += kctNumber(def.bonus);
        events.got += 1;
      } else if (theirs <= def.grab) {
        rb.taken = "foe";
        out.foe.score += 1;
        events.stolen += 1;
      }
    }
    if (out.clock <= 0 || kctRemaining(out) === 0) {
      out.clock = out.clock > 0 ? out.clock : 0;
      out.over = true;
      events.over = true;
    }
    return { world: out, events: events };
  }

  /* The target point in window terms: an angle off vertical, and a radius. */
  function kctWant(x, y) {
    var dx = x - kctAx;
    var up = kctAy - y;
    return {
      theta: Math.atan2(dx, up > 6 ? up : 6),
      line: Math.sqrt(dx * dx + (up > 6 ? up : 6) * (up > 6 ? up : 6)),
    };
  }

  /* Where a ribbon will be when the kite gets there: the lead is iterated on the
   * kite's own reachable speed, because a pilot aims where the ribbon is going.
   * The rival asks the same question with a smaller `lead` - its handicap. */
  function kctAhead(world, kite, rb, lead, vmax) {
    var want = lead > 0 ? lead : 1;
    var dist = kctDist(kite.x, kite.y, rb.x, rb.y);
    var tt = (dist / vmax) * want;
    var x = rb.x;
    var y = rb.y;
    for (var i = 0; i < 3; i += 1) {
      x = rb.x + rb.speed * tt;
      y = kctAy - rb.alt - rb.sway * Math.sin(rb.phase + (world.t + tt) * 1.1);
      dist = kctDist(kite.x, kite.y, x, y);
      tt = (dist / vmax) * want;
    }
    return { x: x, y: y, time: tt };
  }

  /* The ribbon that can be hooked soonest. A ribbon already past the edge of the
   * frame is not a target, the deck it sits on only breaks a tie, and a pilot
   * assigned to a deck flies the sky it was given. */
  function kctChase(world, kite, lead, vmax, prefer) {
    var best = null;
    var cost = Infinity;
    for (var i = 0; i < world.stream.length; i += 1) {
      var rb = world.stream[i];
      if (rb.taken || rb.gone || rb.x < -14 || rb.x > kctW + 14) {
        continue;
      }
      if (prefer >= 0 && rb.lane !== prefer) {
        continue;
      }
      var aim = kctAhead(world, kite, rb, lead, vmax);
      var need = aim.time + rb.lane * 0.18 + (rb.x + rb.speed * aim.time > kctW + 10 ? 0.4 : 0);
      if (need < cost) {
        cost = need;
        best = { ribbon: rb, aim: aim, cost: cost };
      }
    }
    return best;
  }

  /* The scripted pilot: pick the soonest ribbon, ask for the velocity that would
   * meet it, and split that velocity into the two things a line can do - swing
   * around the winch, and roll line in or out. It only ever calls the pure
   * stepper, which is what turns par from a guess into a measurement. */
  function kctPilot(world, kite, opts) {
    var o = opts || {};
    var gain = o.gain > 0 ? o.gain : 1;
    var lead = o.lead > 0 ? o.lead : 1;
    var react = o.react > 0 ? o.react : 0;
    var vmax = o.speed > 0 ? o.speed : 190;
    var last = o.last || { steer: 0, reel: 0, pump: false };
    if (react && world.t - (o.was || 0) < react) {
      return { steer: last.steer, reel: last.reel, pump: false, was: o.was || 0, hold: last };
    }
    var chase = kctChase(world, kite, lead, vmax, o.prefer >= 0 ? o.prefer : -1);
    if (!chase) {
      return { steer: 0, reel: 0, pump: false, was: world.t, hold: { steer: 0, reel: 0, pump: false } };
    }
    var dx = chase.aim.x - kite.x;
    var dy = chase.aim.y - kite.y;
    var dist = Math.sqrt(dx * dx + dy * dy) || 1;
    /* Ask for less speed as the gap closes, so the kite arrives instead of
     * flying past the ribbon. */
    var want = dist / 0.42;
    if (want > vmax) {
      want = vmax;
    }
    var dvx = (dx / dist) * want;
    var dvy = (dy / dist) * want;
    var sin = Math.sin(kite.theta);
    var cos = Math.cos(kite.theta);
    /* A line is never shorter than a flight's lineMin in play, so this floor
     * only catches a state that was handed in broken. */
    var arm = kite.line > 1 ? kctNumber(kite.line) : 1;
    var needOmega = (dvx * cos + dvy * sin) / arm;
    var needReel = dvx * sin - dvy * cos;
    var oops = needOmega - kite.omega;
    var hold = {
      steer: oops > 1 ? 1 : oops < -1 ? -1 : oops * 1.45 * gain,
      reel: (needReel - kite.reel) / 60,
      pump: o.pump === false ? false : (Math.abs(oops) > 0.42 || dist > 150) && kite.meter > 26,
    };
    if (hold.reel > 1) {
      hold.reel = 1;
    } else if (hold.reel < -1) {
      hold.reel = -1;
    }
    return {
      steer: hold.steer,
      reel: hold.reel,
      pump: hold.pump,
      was: world.t,
      hold: hold,
    };
  }

  var kctRunCache = {};

  /* The reference pilot is always the same scripted flyer, so a flight's par is
   * a property of the sky and not of the tuning of the day. */
  var kctReference = { gain: 1, lead: 1, speed: 190, pump: true };

  function kctRivalOf(def) {
    return def.rival || { gain: 0.8, lead: 0.4, speed: 140, react: 0.5 };
  }

  /* One whole flight, ticked on the fixed 60Hz grid: the par measurement and
   * the demo line both come from here, so the number on the HUD is the number
   * the recorded line actually flew. */
  function kctRun(def) {
    var world = kctWorld(def);
    var rival = kctRivalOf(def);
    var pilot = { was: 0, last: { steer: 0, reel: 0, pump: false } };
    var foe = { was: 0, last: { steer: 0, reel: 0, pump: false } };
    var trace = [];
    var steps = 0;
    var ceiling = 60 * 120;
    while (!world.over && steps < ceiling) {
      var you = kctPilot(world, world.you, {
        gain: kctReference.gain,
        lead: kctReference.lead,
        speed: kctReference.speed,
        prefer: -1,
        pump: kctReference.pump,
        was: pilot.was,
        last: pilot.last,
      });
      var rivalInput = kctPilot(world, world.foe, {
        gain: rival.gain,
        lead: rival.lead,
        speed: rival.speed,
        react: rival.react,
        prefer: rival.lane >= 0 ? rival.lane : -1,
        pump: false,
        was: foe.was,
        last: foe.last,
      });
      pilot.was = you.was;
      pilot.last = you.hold;
      foe.was = rivalInput.was;
      foe.last = rivalInput.hold;
      var step = kctAdvance(world, def, you, rivalInput, kctDt);
      world = step.world;
      trace.push({ x: world.you.x, y: world.you.y, t: world.t });
      steps += 1;
    }
    return { world: world, trace: trace, timedOut: steps >= ceiling };
  }

  function kctPar(def) {
    if (!def) {
      return null;
    }
    if (!kctRunCache[def.id]) {
      var run = kctRun(def);
      var caught = run.world.you.score;
      /* A line that runs out of sky or catches nothing describes a broken
       * stream, not an easy one: keep the authored reference off the bands. */
      var par = caught > 0 && !run.timedOut ? caught : def.basePar;
      kctRunCache[def.id] = { par: par, trace: run.trace, rival: run.world.foe.score };
    }
    return kctRunCache[def.id].par;
  }

  function kctParOf(def) {
    var par = kctPar(def);
    return par > 0 ? par : def.basePar;
  }

  function kctTrace(def) {
    kctPar(def);
    return kctRunCache[def.id].trace;
  }

  /* Ladder off the measurement: three stars is one ribbon short of the scripted
   * line, two about 65 per cent of it, one about 40 per cent. The top rung is
   * always below what the stream holds, so no flight can be three-starred by
   * emptying the sky, and the rungs never touch. */
  function kctBands(def) {
    var par = kctParOf(def);
    var three = Math.max(2, Math.min(def.stream.length - 1, par - 1));
    var two = Math.max(1, Math.min(three - 1, Math.round(par * 0.65)));
    var one = Math.max(1, Math.min(two - 1, Math.round(par * 0.4)));
    return [three, two, one];
  }

  function kctClock(seconds) {
    var raw = kctNumber(seconds);
    var safe = raw > 0 ? raw : 0;
    var whole = Math.floor(safe);
    var tenths = Math.floor((safe - whole) * 10);
    var mins = Math.floor(whole / 60);
    var secs = whole % 60;
    return (mins < 10 ? "0" : "") + mins + ":" + (secs < 10 ? "0" : "") + secs + "." + tenths;
  }

  function kctDeckName(lane) {
    return lane === 2 ? t("kctLayerHigh") : lane === 1 ? t("kctLayerMid") : t("kctLayerLow");
  }

  App.kiteStep = kctStep;
  App.kiteAdvance = kctAdvance;
  App.kiteWorld = kctWorld;
  App.kitePilot = kctPilot;
  App.kiteWind = kctWind;
  App.kitePar = kctPar;
  App.kiteBands = kctBands;
  App.kitePump = kctPumpMeter;
  App.kiteClock = kctClock;
  App.kiteLayers = kctLayers;
  App.kiteFlights = kctFlights;

  function initCrosswindKitesGame(panelEl) {
    if (!panelEl) {
      return;
    }

    var campaign = createCampaign({ key: "crosswind-kites-campaign", levels: kctFlights });
    var open = campaign.indexOf(campaign.nextLevelId());
    var flight = kctFlights[open < 0 ? 0 : open];
    var bands = kctBands(flight);
    var par = kctParOf(flight);
    var trace = kctTrace(flight);
    var world = kctWorld(flight);
    var keys = {};
    var pointer = { x: 0, y: 0, down: false };
    var pumping = false;
    var autom = false;
    var pilot = { was: 0, last: { steer: 0, reel: 0, pump: false } };
    var rival = { was: 0, last: { steer: 0, reel: 0, pump: false } };
    var sparks = [];
    var rafId = null;
    var lastFrame = 0;
    var paused = false;

    /* --- markup: built with createElement so the headless harness sees it --- */
    var hud = document.createElement("div");
    hud.className = "game-hud";
    var clockEl = document.createElement("strong");
    var catchEl = document.createElement("strong");
    var lineStatEl = document.createElement("strong");
    var windStatEl = document.createElement("strong");
    hud.appendChild(makeStat("kctClockLabel", clockEl));
    hud.appendChild(makeStat("kctCatchLabel", catchEl));
    hud.appendChild(makeStat("kctLineLabel", lineStatEl));
    hud.appendChild(makeStat("kctWindLabel", windStatEl));

    var canvas = document.createElement("canvas");
    canvas.className = "kct-canvas";
    canvas.width = kctW;
    canvas.height = kctH;
    canvas.setAttribute("tabindex", "0");
    canvas.setAttribute("role", "application");
    canvas.setAttribute("aria-label", t("kctFieldLabel"));

    /* Two gauges: the line's strength on the left, the breeze on the right. The
     * numbers are written by the frame loop, so only the names carry i18n hooks. */
    var gauges = document.createElement("div");
    gauges.className = "kct-gauges";
    var strength = makeGauge("kctGaugeStrength");
    var breeze = makeGauge("kctGaugeBreeze");
    gauges.appendChild(strength.row);
    gauges.appendChild(breeze.row);

    var readout = document.createElement("p");
    readout.className = "kct-line";

    var result = document.createElement("p");
    result.className = "game-result";
    result.setAttribute("role", "status");

    /* Flight pickers use the shared row/label/select shape the shipped panels
     * use, so the festival menu looks and behaves like every other one. */
    var flightRow = document.createElement("div");
    flightRow.className = "elements-row";
    var flightLabel = document.createElement("label");
    flightLabel.className = "elements-label";
    flightLabel.setAttribute("for", "kctFlightSel");
    flightLabel.setAttribute("data-i18n", "kctFlightSelectLabel");
    flightLabel.textContent = t("kctFlightSelectLabel");
    var flightSel = document.createElement("select");
    flightSel.className = "elements-select";
    flightSel.id = "kctFlightSel";
    flightRow.appendChild(flightLabel);
    flightRow.appendChild(flightSel);

    var tools = document.createElement("div");
    tools.className = "kct-tools";
    var pumpBtn = makeToggle("kctBtnPump", "kctPumpOn", "kctPumpOff", "kct-pump-btn");
    var autoBtn = makeToggle("kctBtnAuto", "kctAutoOn", "kctAutoOff", "kct-auto-btn");
    tools.appendChild(pumpBtn.btn);
    tools.appendChild(autoBtn.btn);

    var actions = document.createElement("div");
    actions.className = "game-actions";
    var launchBtn = document.createElement("button");
    launchBtn.type = "button";
    launchBtn.className = "primary";
    var launchLabel = document.createElement("span");
    launchLabel.setAttribute("data-i18n", "kctBtnLaunch");
    launchLabel.textContent = t("kctBtnLaunch");
    var launchContent = document.createElement("span");
    launchContent.className = "button-content";
    launchContent.appendChild(launchLabel);
    launchBtn.appendChild(launchContent);
    var starsEl = document.createElement("p");
    starsEl.className = "game-best";
    actions.appendChild(launchBtn);
    actions.appendChild(starsEl);

    var hint = document.createElement("p");
    hint.className = "game-hint";
    hint.setAttribute("data-i18n", "kctHint");
    hint.textContent = t("kctHint");

    [hud, canvas, gauges, readout, result, flightRow, tools, actions, hint].forEach(function (node) {
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

    function makeGauge(nameKey) {
      var row = document.createElement("div");
      row.className = "kct-gauge";
      var name = document.createElement("span");
      name.className = "kct-gauge-name";
      name.setAttribute("data-i18n", nameKey);
      name.textContent = t(nameKey);
      var bar = document.createElement("span");
      bar.className = "kct-bar";
      var fill = document.createElement("span");
      fill.className = "kct-bar-fill";
      fill.style.width = "0%";
      bar.appendChild(fill);
      var value = document.createElement("strong");
      value.className = "kct-gauge-value";
      value.textContent = "";
      row.appendChild(name);
      row.appendChild(bar);
      row.appendChild(value);
      return { row: row, fill: fill, value: value };
    }

    /* Both tools are hold-or-off switches, so they carry their state as a word
     * and an aria-pressed, never as a colour alone. */
    function makeToggle(labelKey, onKey, offKey, className) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = className;
      btn.setAttribute("aria-pressed", "false");
      var label = document.createElement("span");
      label.setAttribute("data-i18n", labelKey);
      label.textContent = t(labelKey);
      var state = document.createElement("span");
      state.className = "kct-toggle-state";
      state.textContent = t(offKey);
      var content = document.createElement("span");
      content.className = "button-content";
      content.appendChild(label);
      content.appendChild(state);
      btn.appendChild(content);
      return { btn: btn, state: state, onKey: onKey, offKey: offKey };
    }

    var ctx = canvas.getContext("2d");

    function setToggle(toggle, on) {
      toggle.btn.setAttribute("aria-pressed", on ? "true" : "false");
      toggle.state.textContent = t(on ? toggle.onKey : toggle.offKey);
      if (on) {
        toggle.btn.classList.add("is-on");
      } else {
        toggle.btn.classList.remove("is-on");
      }
    }

    /* --- one flight at a time -------------------------------------------- */
    function arm() {
      world = kctWorld(flight);
      trace = kctTrace(flight);
      pilot = { was: 0, last: { steer: 0, reel: 0, pump: false } };
      rival = { was: 0, last: { steer: 0, reel: 0, pump: false } };
      sparks = [];
      renderHud();
      draw();
    }

    function objective() {
      return t("kctObjective", {
        name: t(flight.labelKey),
        p: par,
        three: bands[0],
        b: kctClock(flight.start),
        s: flight.bonus,
        n: flight.stream.length,
      });
    }

    function loadFlight(def) {
      flight = def;
      bands = kctBands(flight);
      par = kctParOf(flight);
      refreshPicker();
      arm();
      result.textContent = objective();
      readout.textContent = t("kctArmed", { n: kctRemaining(world), w: flight.grab });
    }

    function refreshPicker() {
      fillCampaignPicker(
        flightSel,
        campaign,
        function (def) {
          return t(def.labelKey);
        },
        t("elementsLocked"),
      );
      flightSel.value = flight.id;
      starsEl.textContent = t("campaignStars", {
        n: campaign.totalStars(),
        max: campaign.maxStars(),
      });
    }

    function renderHud() {
      var alt = kctAy - world.you.y;
      var wind = kctWind(alt, world.t, flight);
      clockEl.textContent = kctClock(world.clock);
      catchEl.textContent = t("kctCatchValue", { n: world.you.score, r: world.foe.score });
      lineStatEl.textContent = t("kctLineValue", { n: Math.round(world.you.line) });
      windStatEl.textContent = t("kctWindValue", { n: Math.round(wind), l: kctDeckName(kctLayerOf(alt)) });
      setGauge(strength, world.you.meter / 100, t("kctStrengthValue", { n: Math.round(world.you.meter) }), world.you.meter < 26);
      setGauge(breeze, wind / 230, t("kctBreezeValue", { n: Math.round(wind / 10) }), false);
    }

    function setGauge(gauge, ratio, text, low) {
      var filled = ratio > 1 ? 1 : ratio < 0 ? 0 : ratio;
      gauge.fill.style.width = (filled * 100).toFixed(1) + "%";
      gauge.value.textContent = text;
      if (low) {
        gauge.row.classList.add("is-low");
      } else {
        gauge.row.classList.remove("is-low");
      }
    }

    /* --- input ----------------------------------------------------------- */
    function keyInput() {
      var left = keys.left ? 1 : 0;
      var right = keys.right ? 1 : 0;
      var inLine = keys.in ? 1 : 0;
      var outLine = keys.out ? 1 : 0;
      return {
        steer: right - left,
        reel: outLine - inLine,
        pump: pumping,
      };
    }

    /* Drag anywhere in the sky for the point you want: the same angle/radius
     * errors the scripted pilot works with, so pointer play is not a second
     * physics model. */
    function dragInput() {
      var want = kctWant(pointer.x, pointer.y);
      var steer = (want.theta - world.you.theta) * 1.7 - world.you.omega * 0.5;
      var reel = (want.line - world.you.line) / 30;
      return { steer: steer, reel: reel };
    }

    function pilotInput() {
      var you = kctPilot(world, world.you, {
        gain: kctReference.gain,
        lead: kctReference.lead,
        speed: kctReference.speed,
        pump: kctReference.pump,
        was: pilot.was,
        last: pilot.last,
      });
      pilot.was = you.was;
      pilot.last = you.hold;
      return you;
    }

    function rivalInput() {
      var foe = kctPilot(world, world.foe, {
        gain: flight.rival.gain,
        lead: flight.rival.lead,
        speed: flight.rival.speed,
        react: flight.rival.react,
        prefer: flight.rival.lane >= 0 ? flight.rival.lane : -1,
        pump: false,
        was: rival.was,
        last: rival.last,
      });
      rival.was = foe.was;
      rival.last = foe.hold;
      return foe;
    }

    function currentInput() {
      if (autom) {
        return pilotInput();
      }
      var manual = keyInput();
      if (!pointer.down) {
        return manual;
      }
      var drag = dragInput();
      return {
        steer: manual.steer !== 0 ? manual.steer : drag.steer,
        reel: manual.reel !== 0 ? manual.reel : drag.reel,
        pump: manual.pump,
      };
    }

    function update(dt) {
      if (world.over) {
        return;
      }
      var step = kctAdvance(world, flight, currentInput(), rivalInput(), dt);
      world = step.world;
      if (step.events.got) {
        var rect = canvas.getBoundingClientRect();
        readout.textContent = t("kctCaught", {
          n: world.you.score,
          s: flight.bonus,
          left: kctRemaining(world),
        });
        createConfetti(rect.left + world.you.x, rect.top + world.you.y);
        if (!isMotionOff()) {
          sparks.push({ x: world.you.x, y: world.you.y, age: 0 });
        }
      }
      if (step.events.stolen) {
        readout.textContent = t("kctStolen", { n: world.foe.score });
      }
      if (step.events.snags) {
        readout.textContent = t("kctSnagged", { s: kctSnag });
      }
      for (var s = sparks.length - 1; s >= 0; s -= 1) {
        sparks[s].age += dt * 1.4;
        if (sparks[s].age >= 1) {
          sparks.splice(s, 1);
        }
      }
      if (world.over) {
        finish();
      }
    }

    function finish() {
      var caught = world.you.score;
      var starsWon = 0;
      var outcome = { isBest: false, firstClear: false, unlockedNext: null };
      /* An empty sky is not a clear: only a flight that hooked something banks
       * stars and pushes the chain forward. */
      if (caught > 0) {
        starsWon = starsFor(caught, bands, "high");
        outcome = campaign.record(flight.id, { stars: starsWon, best: caught, better: "high" });
      }
      var message = t("kctLanded", {
        n: caught,
        r: world.foe.score,
        p: par,
        s: starsWon,
      });
      if (caught > 0 && caught > world.foe.score) {
        message += " " + t("kctBeatRival");
      }
      if (outcome.isBest) {
        message += " " + t("newBest");
      }
      if (outcome.unlockedNext) {
        message += " " + t("kctNextFlight");
      } else if (outcome.firstClear && campaign.clearedCount() === kctFlights.length) {
        message += " " + t("kctCampaignDone");
      }
      result.textContent = message;
      logAction(t("logCrosswindKites", { n: caught, r: world.foe.score }));
      petNotifyGame(outcome.isBest || outcome.firstClear);
      refreshPicker();
    }

    /* --- drawing --------------------------------------------------------- */
    function drawSky() {
      for (var i = 0; i < kctLayers.length; i += 1) {
        var layer = kctLayers[i];
        var top = kctAy - layer.high;
        var height = layer.high - layer.low;
        ctx.fillStyle = i === 2 ? "rgba(0, 242, 255, 0.05)" : i === 1 ? "rgba(148, 163, 184, 0.07)" : "rgba(255, 107, 53, 0.05)";
        ctx.fillRect(0, top, kctW, height);
        if (layer.low > 0) {
          ctx.strokeStyle = "rgba(148, 163, 184, 0.22)";
          ctx.lineWidth = 1;
          ctx.setLineDash([5, 9]);
          ctx.beginPath();
          ctx.moveTo(0, kctAy - layer.low);
          ctx.lineTo(kctW, kctAy - layer.low);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        ctx.font = "bold 9px 'JetBrains Mono', monospace";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "rgba(185, 193, 204, 0.6)";
        ctx.fillText(kctDeckName(i) + " " + Math.round(kctWind(layer.mid, world.t, flight)), 6, kctAy - (layer.low + layer.high) / 2);
      }
      if (isMotionOff()) {
        return;
      }
      /* Streaks ride the layer they sit in, so a gust you are about to feel is a
       * gust you can see coming. */
      for (var s = 0; s < kctLayers.length; s += 1) {
        var lane = kctLayers[s];
        var flow = kctWind(lane.mid, world.t, flight);
        var y = kctAy - lane.mid;
        for (var n = 0; n < 7; n += 1) {
          var drift = (world.t * flow + n * 71 + s * 29) % (kctW + 44);
          ctx.strokeStyle = "rgba(148, 163, 184, 0.16)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(drift - 26, y + (n % 3) * 10 - 10);
          ctx.lineTo(drift - 2, y + (n % 3) * 10 - 10);
          ctx.stroke();
        }
      }
    }

    function drawCity() {
      var blocks = [
        [0, 26, 18],
        [44, 34, 26],
        [80, 22, 14],
        [110, 40, 30],
        [172, 30, 22],
        [238, 36, 28],
        [292, 24, 16],
        [330, 44, 32],
        [392, 28, 20],
      ];
      ctx.fillStyle = "rgba(15, 23, 42, 0.8)";
      for (var i = 0; i < blocks.length; i += 1) {
        var block = blocks[i];
        var top = kctAy - block[2];
        ctx.fillRect(block[0], top, block[1], kctH - top);
      }
      /* The rooftop line the kite must stay above, dashed so it reads as a rule
       * rather than as another building. */
      ctx.strokeStyle = "rgba(255, 138, 128, 0.5)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.moveTo(0, kctAy - kctRoof);
      ctx.lineTo(kctW, kctAy - kctRoof);
      ctx.stroke();
      ctx.setLineDash([]);
      /* The winch, and the reach of the line as the wind window's edge. */
      ctx.beginPath();
      ctx.arc(kctAx, kctAy, world.you.line, Math.PI / 2 - kctSwing, Math.PI / 2 + kctSwing);
      ctx.strokeStyle = "rgba(0, 242, 255, 0.2)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = "#b9c1cc";
      ctx.fillRect(kctAx - 4, kctAy - 8, 8, 16);
    }

    function drawRibbon(rb) {
      if (rb.taken === "you") {
        return;
      }
      var stolen = rb.taken === "foe";
      ctx.globalAlpha = stolen ? 0.35 : 1;
      ctx.strokeStyle = stolen ? "#4b5a72" : rb.lane === 2 ? "#00f2ff" : rb.lane === 1 ? "#ffd166" : "#ff6b35";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(rb.x, rb.y);
      for (var s = 1; s <= 4; s += 1) {
        ctx.lineTo(rb.x - s * 9, rb.y + (stolen || isMotionOff() ? s * 1.5 : Math.sin(world.t * 5 + s * 0.9 + rb.phase) * 3 + s * 1.5));
      }
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(rb.x, rb.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = stolen ? "#4b5a72" : "#f8fafc";
      ctx.fill();
      if (stolen) {
        ctx.font = "bold 9px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#94a3b8";
        ctx.fillText("R", rb.x, rb.y - 11);
      }
      ctx.globalAlpha = 1;
    }

    function drawKite(kite, tint, tag) {
      ctx.strokeStyle = "rgba(148, 163, 184, 0.5)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(kctAx, kctAy);
      ctx.lineTo(kite.x, kite.y);
      ctx.stroke();
      var heading = Math.atan2(kite.y - kctAy, kite.x - kctAx);
      ctx.save();
      ctx.translate(kite.x, kite.y);
      ctx.rotate(heading + Math.PI / 2);
      ctx.fillStyle = tint;
      ctx.beginPath();
      if (tag === "R") {
        ctx.rect(-8, -8, 16, 16);
      } else {
        ctx.moveTo(0, -11);
        ctx.lineTo(9, 0);
        ctx.lineTo(0, 11);
        ctx.lineTo(-9, 0);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(7, 11, 20, 0.8)";
      ctx.stroke();
      ctx.restore();
      ctx.font = "bold 10px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#0b1018";
      ctx.fillText(tag, kite.x, kite.y);
      /* The tail streams with the apparent wind, so its length is a reading. */
      var air = kctApparent(kite, flight, world.t);
      var tail = Math.min(34, 8 + air.q / 9);
      ctx.strokeStyle = tint;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(kite.x, kite.y + 10);
      for (var s = 1; s <= 3; s += 1) {
        ctx.lineTo(
          kite.x + ((tail / 3) * s) / 2,
          kite.y + 10 + (tail / 3) * s + (isMotionOff() ? 0 : Math.sin(world.t * 6 + s) * 2),
        );
      }
      ctx.stroke();
    }

    function draw() {
      ctx.clearRect(0, 0, kctW, kctH);
      ctx.fillStyle = "#080d17";
      ctx.fillRect(0, 0, kctW, kctH);
      drawSky();
      drawCity();
      for (var i = 0; i < world.stream.length; i += 1) {
        var rb = world.stream[i];
        if (!rb.gone && rb.x > -30 && rb.x < kctW + 26) {
          drawRibbon(rb);
        }
      }
      /* The measured line itself: a faint kite at the point the scripted pilot
       * reached at this same clock reading. */
      if (trace.length > 1) {
        var at = 0;
        while (at + 1 < trace.length && trace[at + 1].t <= world.t) {
          at += 1;
        }
        var ref = trace[at];
        if (ref.t <= world.t) {
          ctx.globalAlpha = 0.3;
          ctx.fillStyle = "#b9c1cc";
          ctx.beginPath();
          ctx.arc(ref.x, ref.y, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.font = "bold 9px 'JetBrains Mono', monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = "rgba(185, 193, 204, 0.7)";
          ctx.fillText("PAR", ref.x, ref.y);
        }
      }
      for (var s = sparks.length - 1; s >= 0; s -= 1) {
        var spark = sparks[s];
        ctx.strokeStyle = "rgba(255, 209, 102, " + (0.8 * (1 - spark.age)).toFixed(3) + ")";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(spark.x, spark.y, 8 + spark.age * 26, 0, Math.PI * 2);
        ctx.stroke();
      }
      drawKite(world.foe, "#ff6b35", "R");
      drawKite(world.you, world.you.pump ? "#ffd166" : "#00f2ff", "K");
      /* Numbers on the plate too, so the sky is never the only read-out. */
      ctx.font = "bold 11px 'JetBrains Mono', monospace";
      ctx.textBaseline = "alphabetic";
      ctx.textAlign = "left";
      ctx.fillStyle = "#b9c1cc";
      ctx.fillText("YOU " + world.you.score + "  RIVAL " + world.foe.score + "  ON WING " + kctOnWing(world), 8, 18);
      ctx.textAlign = "right";
      ctx.fillText(kctClock(world.clock), kctW - 8, 18);
      ctx.textAlign = "center";
      if (autom) {
        ctx.fillStyle = "#ffd166";
        ctx.fillText(t("kctAutoTag"), kctW / 2, 18);
      }
      if (world.over) {
        ctx.fillStyle = "rgba(248, 250, 252, 0.9)";
        ctx.font = "bold 14px 'JetBrains Mono', monospace";
        ctx.fillText(t("kctOverTag"), kctW / 2, 44);
      }
    }

    function frame(now) {
      if (rafId === null) {
        return;
      }
      var dt = Math.min(0.032, (now - lastFrame) / 1000 || 0.016);
      lastFrame = now;
      if (!panelEl || panelEl.hidden || document.hidden) {
        rafId = window.requestAnimationFrame(frame);
        return;
      }
      update(dt);
      renderHud();
      draw();
      rafId = window.requestAnimationFrame(frame);
    }

    function startLoop() {
      if (rafId !== null) {
        return;
      }
      lastFrame = performance.now();
      rafId = window.requestAnimationFrame(frame);
    }

    function stopLoop() {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
    }

    function wake() {
      if (paused) {
        paused = false;
        startLoop();
      }
    }

    function setPump(on) {
      pumping = on;
      setToggle(pumpBtn, on);
    }

    function setAuto(on) {
      autom = on;
      setToggle(autoBtn, on);
      readout.textContent = on
        ? t("kctAutoRunning", { p: par, three: bands[0] })
        : t("kctArmed", { n: kctRemaining(world), w: flight.grab });
    }

    canvas.addEventListener("keydown", function (event) {
      wake();
      var key = event.key;
      if (key === "ArrowLeft" || key === "a" || key === "A") {
        keys.left = true;
        event.preventDefault();
      } else if (key === "ArrowRight" || key === "d" || key === "D") {
        keys.right = true;
        event.preventDefault();
      } else if (key === "ArrowUp" || key === "w" || key === "W") {
        keys.in = true;
        event.preventDefault();
      } else if (key === "ArrowDown" || key === "s" || key === "S") {
        keys.out = true;
        event.preventDefault();
      } else if (key === " " || key === "Enter") {
        event.preventDefault();
        setPump(!pumping);
      } else if (key === "x" || key === "X") {
        setAuto(!autom);
      } else if (key === "r" || key === "R") {
        event.preventDefault();
        arm();
      }
    });

    canvas.addEventListener("keyup", function (event) {
      var key = event.key;
      if (key === "ArrowLeft" || key === "a" || key === "A") {
        keys.left = false;
      } else if (key === "ArrowRight" || key === "d" || key === "D") {
        keys.right = false;
      } else if (key === "ArrowUp" || key === "w" || key === "W") {
        keys.in = false;
      } else if (key === "ArrowDown" || key === "s" || key === "S") {
        keys.out = false;
      }
    });

    function pointerFromEvent(event) {
      var rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        return;
      }
      pointer.x = (event.clientX - rect.left) * (canvas.width / rect.width);
      pointer.y = (event.clientY - rect.top) * (canvas.height / rect.height);
    }

    canvas.addEventListener("pointerdown", function (event) {
      event.preventDefault();
      wake();
      pointer.down = true;
      pointerFromEvent(event);
    });

    canvas.addEventListener("pointermove", function (event) {
      if (!pointer.down) {
        return;
      }
      pointerFromEvent(event);
    });

    function releasePointer() {
      pointer.down = false;
    }

    canvas.addEventListener("pointerup", releasePointer);
    canvas.addEventListener("pointercancel", releasePointer);

    pumpBtn.btn.addEventListener("click", function () {
      wake();
      setPump(!pumping);
    });

    autoBtn.btn.addEventListener("click", function () {
      wake();
      setAuto(!autom);
    });

    flightSel.addEventListener("change", function () {
      var index = campaign.indexOf(flightSel.value);
      if (index >= 0 && campaign.isUnlocked(flightSel.value)) {
        wake();
        loadFlight(kctFlights[index]);
      }
    });

    launchBtn.addEventListener("click", function () {
      wake();
      arm();
      result.textContent = objective();
      readout.textContent = t("kctArmed", { n: kctRemaining(world), w: flight.grab });
    });

    /* Leaving the tab takes the sky down: the loop stops, the kite goes back on
     * its line, and the ribbons and stars already banked stay untouched. */
    App.quietResetCrosswindKites = function () {
      stopLoop();
      keys = {};
      releasePointer();
      setPump(false);
      sparks = [];
      paused = true;
      if (!world.over) {
        arm();
        result.textContent = t("kctPaused");
        readout.textContent = t("kctArmed", { n: kctRemaining(world), w: flight.grab });
      }
    };

    loadFlight(flight);
    startLoop();
  }

  /* Bilingual copy travels with the game: addStrings only fills keys i18n.js
   * does not already own, so the shared dictionary stays authoritative. */
  App.addStrings({
    en: {
      "tabCrosswindKites": "Crosswind Kites",
      "kctF1": "Backyard Lift",
      "kctF2": "Rooftop Shear",
      "kctF3": "Gusty Terrace",
      "kctF4": "Jet Stream Edge",
      "kctF5": "The Rival Sky",
      "kctF6": "High Deck Run",
      "kctF7": "Gust Corridor",
      "kctF8": "Long Line Reach",
      "kctF9": "Shear Ladder",
      "kctF10": "Festival Finale",
      "kctClockLabel": "Air Time",
      "kctCatchLabel": "You / Rival",
      "kctLineLabel": "Line",
      "kctWindLabel": "Wind",
      "kctFlightSelectLabel": "Choose a flight",
      "kctCatchValue": "{n} / {r}",
      "kctLineValue": "{n}px",
      "kctWindValue": "{n} {l}",
      "kctGaugeStrength": "Line",
      "kctGaugeBreeze": "Breeze",
      "kctStrengthValue": "{n}%",
      "kctBreezeValue": "{n} m/s",
      "kctBtnLaunch": "Launch Again",
      "kctBtnPump": "Pump",
      "kctPumpOn": "pumping",
      "kctPumpOff": "idle",
      "kctBtnAuto": "Demo Line",
      "kctAutoOn": "flying",
      "kctAutoOff": "off",
      "kctAutoTag": "DEMO LINE",
      "kctOverTag": "LANDED",
      "kctLayerLow": "low",
      "kctLayerMid": "mid",
      "kctLayerHigh": "high",
      "kctFieldLabel": "Kite sky: left and right swing the kite across the wind, up hauls the line in, down pays it out, space toggles pumping, and dragging the sky steers toward the point",
      "kctObjective": "{name}: a rival kite works this sky too. Measured par is {p} ribbons and {three} wins three stars. You get {b} of air time, every ribbon adds {s}, and the stream holds {n}.",
      "kctArmed": "{n} ribbons will fly this sky. The hook reaches {w}px.",
      "kctCaught": "Ribbon {n} hooked - {s} more seconds of air, {left} still out there.",
      "kctStolen": "The rival took one: {n} to it.",
      "kctSnagged": "Wingtip in the rooftops: {s} seconds gone.",
      "kctLanded": "{n} ribbons against the rival's {r}, par was {p} - {s} stars.",
      "kctBeatRival": "You out-flew the rival.",
      "kctNextFlight": "Next flight unlocked.",
      "kctCampaignDone": "Every sky in the festival is flown.",
      "kctPaused": "Line down - the sky is still here.",
      "kctAutoRunning": "Flying the measured line that set par {p}. {three} of them wins three stars.",
      "kctHint": "Steering pull comes from apparent wind: sweep the kite across the sky to build it, then turn into the ribbon.",
      "logCrosswindKites": "Hooked {n} ribbons over the rival's {r}",
    },
    zh: {
      "tabCrosswindKites": "横风纸鸢",
      "kctF1": "后院起风",
      "kctF2": "屋顶切变",
      "kctF3": "阵风平台",
      "kctF4": "急流边缘",
      "kctF5": "对手的天空",
      "kctF6": "高台巡航",
      "kctF7": "阵风走廊",
      "kctF8": "长线远天",
      "kctF9": "切变阶梯",
      "kctF10": "风筝节压轴",
      "kctClockLabel": "留空",
      "kctCatchLabel": "你 / 对手",
      "kctLineLabel": "线长",
      "kctWindLabel": "风",
      "kctFlightSelectLabel": "选择场次",
      "kctCatchValue": "{n} / {r}",
      "kctLineValue": "{n} 像素",
      "kctWindValue": "{n} {l}",
      "kctGaugeStrength": "线",
      "kctGaugeBreeze": "风",
      "kctStrengthValue": "{n}%",
      "kctBreezeValue": "{n} 米/秒",
      "kctBtnLaunch": "再放一次",
      "kctBtnPump": "抽线",
      "kctPumpOn": "抽线中",
      "kctPumpOff": "已收手",
      "kctBtnAuto": "示范线",
      "kctAutoOn": "飞行中",
      "kctAutoOff": "未开",
      "kctAutoTag": "示范线",
      "kctOverTag": "已落地",
      "kctLayerLow": "低层",
      "kctLayerMid": "中层",
      "kctLayerHigh": "高层",
      "kctFieldLabel": "纸鸢天空：左右让鸢横穿风向，上收线，下放线，空格切换抽线；在天上拖动就是朝那一点飞",
      "kctObjective": "{name}：对手的鸢也在这片天上。实测标准 {p} 条，{three} 条可拿三星。留空 {b}，每抓到一条再加 {s} 秒，一共放出 {n} 条。",
      "kctArmed": "这场会放出 {n} 条飘带。钩取范围 {w} 像素。",
      "kctCaught": "钩到第 {n} 条——多留空 {s} 秒，外面还有 {left} 条。",
      "kctStolen": "被对手抢走一条：它已有 {n} 条。",
      "kctSnagged": "鸢角擦到屋顶：损失 {s} 秒。",
      "kctLanded": "{n} 条，对手 {r} 条，标准 {p} 条 - 获得 {s} 星。",
      "kctBeatRival": "你飞赢了对手。",
      "kctNextFlight": "解锁下一场。",
      "kctCampaignDone": "风筝节的所有天空都飞完了。",
      "kctPaused": "线已放下，天空还在。",
      "kctAutoRunning": "正在飞那条测出标准 {p} 条的线。钩到 {three} 条可拿三星。",
      "kctHint": "转向的力气来自相对风：先把鸢横着扫出去攒速度，再转身切向飘带。",
      "logCrosswindKites": "钩到 {n} 条飘带，对手 {r} 条",
    },
  });

  App.registerGame({
    name: "crosswindKites",
    tabKey: "tabCrosswindKites",
    init: initCrosswindKitesGame,
    guide: {
      svg:
        '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="4" y="4" width="112" height="68" rx="5" fill="rgba(8,13,23,.92)" stroke="rgba(148,163,184,.45)"/>' +
        '<path d="M4 30h112M4 48h112" stroke="rgba(148,163,184,.22)" stroke-dasharray="5 6"/>' +
        '<path d="M12 22h20M70 40h22M26 58h18" stroke="rgba(0,242,255,.45)" stroke-width="1"/>' +
        '<path d="M60 70a36 36 0 0 1 33 -19" fill="none" stroke="rgba(0,242,255,.35)" stroke-dasharray="3 4"/>' +
        '<line x1="60" y1="70" x2="83" y2="31" stroke="rgba(148,163,184,.6)"/>' +
        '<path d="M83 20l9 11-9 11-9-11z" fill="#00f2ff"/>' +
        '<path d="M83 42c4 4 2 6 6 9" fill="none" stroke="#00f2ff" stroke-width="1.5"/>' +
        '<circle cx="33" cy="38" r="3" fill="#f8fafc"/>' +
        '<path d="M33 38c-6 3-9 5-14 4" fill="none" stroke="#ff6b35" stroke-width="1.5"/>' +
        '<rect x="6" y="63" width="11" height="9" fill="rgba(148,163,184,.35)"/>' +
        '<rect x="21" y="59" width="15" height="13" fill="rgba(148,163,184,.35)"/>' +
        '<text x="96" y="16" font-size="9" fill="#b9c1cc">4/2</text></svg>',
      en: [
        "Goal: hook the ribbons drifting downwind before your air time runs out; every ribbon buys more seconds.",
        "Action: left and right swing the kite across the wind, up hauls the line in, down pays it out, space toggles pumping.",
        "Rule: three wind layers blow at different speeds, and only the line you have paid out reaches the high decks.",
        "Rule: a long line is a wide turning radius, and steering pull comes from apparent wind, so sweep across the sky to build speed.",
        "Costs: dipping under the rooftop line costs 2 seconds, and pumping drains the line strength the gauge shows.",
        "Scoring: par is measured by flying a scripted line through this same physics, while the rival - the square kite marked R - works one deck of the sky and lets the others be."
      ],
      zh: [
        "目标：在留空耗尽前钩下顺风的飘带；每抓到一条就多几秒。",
        "操作：左右让鸢横穿风向，上收线，下放线，空格切换抽线。",
        "规则：三层风速度不同，只有放出去的线才够得着高层的飘带。",
        "规则：线越长转弯半径越大，而转向的力气来自相对风，所以先横着扫出去攒速度。",
        "代价：鸢角擦到屋顶线罚 2 秒，抽线会消耗仪表上的线力。",
        "计分：标准是用一条编排好的线跑同一套物理实测出来的；而对手（标着 R 的方形鸢）只守着一层飘带，其余两层归你抢。"
      ],
    },
  });

  /* Exported for the other modules. */
  App.initCrosswindKitesGame = initCrosswindKitesGame;
})(window.CapitalConvert = window.CapitalConvert || {});
