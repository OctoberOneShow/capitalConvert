/* Tiny Blacksmith - the forge-and-quench precision mini-game in the shared game
 * drawer. A bar of steel rides a swinging pyrometer: a blow only bites inside
 * the amber band, the bright core takes two units off instead of one, every one
 * of the five positions has to land on its mark, and the whole thing has to be
 * quenched inside its own window. Registered through the game registry, so it
 * needs no markup in the four HTML pages. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  var t = App.t;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  var createCampaign = App.createCampaign;
  var fillCampaignPicker = App.fillCampaignPicker;
  var starsFor = App.starsFor;

  /* The bar is read at five positions, tip first, and the money is fixed:
   * what a band blow and a core blow take off, and what straying off the mark
   * or cracking the steel costs the quality score. */
  var tbsSpots = [
    { key: "tbsSpotTip" },
    { key: "tbsSpotPoint" },
    { key: "tbsSpotMid" },
    { key: "tbsSpotHeel" },
    { key: "tbsSpotTang" },
  ];
  var tbsWorkBite = 1;
  var tbsSweetBite = 2;
  var tbsErrorCost = 6;
  var tbsFlawCost = 8;
  /* The hammer has to come back up between two blows, so a mashed button buys
   * nothing a steady hand would not. The beat is counted in the same frame loop
   * as the needle, so a hidden panel costs the forge nothing. */
  var tbsCoolTime = 0.24;

  /* Levels, one per blade pattern. Doubled from six to twelve through the same
   * construction path - every row is still plain data the panel reads:
   *   "targets"  the pattern each position has to come down to from the same
   *              starting thickness, so a 0 blow (target == start) is a real
   *              instruction: that section must be left standing
   *   "band"     the workable window on the rail, "core" that window's sweet
   *              share, "quench" the clean-cool window
   *   "drift"    how far the band slides every "driftEvery" blows, "slack" the
   *              spare blows handed out on top of the exact plan
   *   "line"     the stored strike/cool sequence that forges this pattern - one
   *              entry per action: { w: frames the hand rests, s: the position
   *              the hammer takes }, and a last { w: frames, q: 1 } for the
   *              quench. A frame is the panel's own dt (tbsTick), so w always
   *              carries the beat the hammer needs to come back up.
   *   "stars"    cut from that measured line, never invented: 3 is one stray
   *              blow off a perfect shape (100 - 8), 2 is half the pattern's
   *              own error allowance plus a flaw, and 1 is the exact
   *              serviceable boundary (100 - 6 * ceil(need / 2)) - so "hammer
   *              it to within half rough" and "the rung unlocks" are the same
   *              measured number.
   *
   * The ladder is ordered by measured difficulty: the blow count the proof
   * lands (App.forgeMeasure) climbs rung by rung, the band's low edge walks up
   * the rail as the window narrows, and the drift takes hold sooner. Later
   * patterns also pair a section that must take one single-unit blow on the
   * cooler edge of the band with a neighbour that wants the hot core, which is
   * the one furnace's whole point - a greedy blow on the wrong section ruins an
   * otherwise good shape, and steel never grows back. */
  var tbsLevels = [
    { id: "f1", labelKey: "tbsL1", start: 7, targets: [2, 3, 5, 6, 7], band: [18, 82], core: [0.3, 0.62], quench: [6, 94], speed: 54, drift: 0, driftEvery: 5, slack: 5, stars: [92, 74, 64], line: [] },
    { id: "f2", labelKey: "tbsL2", start: 7, targets: [1, 3, 5, 6, 7], band: [22, 82], core: [0.3, 0.62], quench: [56, 88], speed: 58, drift: 4, driftEvery: 5, slack: 4, stars: [92, 68, 58], line: [] },
    { id: "f3", labelKey: "tbsL3", start: 8, targets: [4, 2, 5, 7, 8], band: [26, 82], core: [0.3, 0.62], quench: [44, 72], speed: 62, drift: 5, driftEvery: 4, slack: 4, stars: [92, 68, 58], line: [] },
    { id: "f4", labelKey: "tbsL4", start: 8, targets: [2, 3, 5, 7, 8], band: [30, 82], core: [0.32, 0.64], quench: [38, 66], speed: 66, drift: 5, driftEvery: 4, slack: 3, stars: [92, 68, 52], line: [] },
    { id: "f5", labelKey: "tbsL5", start: 8, targets: [3, 5, 1, 6, 8], band: [34, 82], core: [0.34, 0.66], quench: [30, 58], speed: 70, drift: 6, driftEvery: 3, slack: 3, stars: [92, 62, 46], line: [] },
    { id: "f6", labelKey: "tbsL6", start: 8, targets: [4, 2, 5, 3, 8], band: [38, 82], core: [0.36, 0.68], quench: [26, 52], speed: 74, drift: 7, driftEvery: 3, slack: 3, stars: [92, 62, 46], line: [] },
    { id: "f7", labelKey: "tbsL7", start: 9, targets: [2, 4, 5, 6, 9], band: [42, 82], core: [0.38, 0.7], quench: [20, 46], speed: 78, drift: 8, driftEvery: 3, slack: 3, stars: [92, 62, 40], line: [] },
    { id: "f8", labelKey: "tbsL8", start: 10, targets: [1, 3, 7, 9, 10], band: [46, 82], core: [0.4, 0.74], quench: [16, 42], speed: 80, drift: 8, driftEvery: 3, slack: 3, stars: [92, 62, 40], line: [] },
    { id: "f9", labelKey: "tbsL9", start: 10, targets: [1, 3, 5, 9, 10], band: [50, 82], core: [0.42, 0.78], quench: [58, 84], speed: 82, drift: 9, driftEvery: 3, slack: 2, stars: [92, 56, 34], line: [] },
    { id: "f10", labelKey: "tbsL10", start: 11, targets: [2, 4, 6, 8, 11], band: [54, 82], core: [0.44, 0.82], quench: [50, 76], speed: 84, drift: 9, driftEvery: 2, slack: 2, stars: [92, 56, 28], line: [] },
    { id: "f11", labelKey: "tbsL11", start: 11, targets: [2, 4, 6, 7, 10], band: [58, 84], core: [0.42, 0.85], quench: [8, 34], speed: 86, drift: 10, driftEvery: 2, slack: 2, stars: [92, 50, 22], line: [] },
    { id: "f12", labelKey: "tbsL12", start: 12, targets: [1, 3, 7, 9, 11], band: [62, 86], core: [0.42, 0.9], quench: [26, 50], speed: 88, drift: 10, driftEvery: 2, slack: 2, stars: [92, 44, 10], line: [] },
  ];

  /* Keys 1..5 point the hammer, exactly like the five cards on the anvil. */
  var tbsKeySpots = { "1": 0, "2": 1, "3": 2, "4": 3, "5": 4 };

  /* The four bands the needle can be standing in. */
  var tbsZoneWords = {
    cold: "tbsWordCold",
    work: "tbsWordWork",
    sweet: "tbsWordSweet",
    burn: "tbsWordBurn",
  };

  function num(value) {
    var n = Number(value);
    return isNaN(n) ? 0 : n;
  }

  function clamp(value, low, high) {
    return Math.max(low, Math.min(high, value));
  }

  /* --- pure core, exported for the harness ----------------------------- */

  /* The needle bounces between the two ends of the pyrometer, so a sweep is
   * always the same length and the band can be read as a slice of time. */
  function forgeSwing(temp, dir, speed, dt) {
    var way = num(dir) < 0 ? -1 : 1;
    var next = num(temp) + way * num(speed) * num(dt);
    if (next <= 0) {
      next = -next;
      way = 1;
    } else if (next >= 100) {
      next = 200 - next;
      way = -1;
    }
    return { temp: clamp(next, 0, 100), dir: way };
  }

  /* The perfect core sits at a fixed share of the band, so sliding the band
   * drags the core with it and only one window is ever stored. */
  function forgeSweet(band, ratio) {
    var lo = num(band && band[0]);
    var hi = num(band && band[1]);
    var width = Math.max(0, hi - lo);
    var r0 = clamp(num(ratio && ratio[0]), 0, 1);
    var r1 = clamp(num(ratio && ratio[1]), r0, 1);
    return [lo + width * r0, lo + width * r1];
  }

  function forgeZone(temp, band, sweet) {
    var value = num(temp);
    var lo = num(band && band[0]);
    var hi = num(band && band[1]);
    if (value > hi) {
      return "burn";
    }
    if (value < lo) {
      return "cold";
    }
    return value >= num(sweet && sweet[0]) && value <= num(sweet && sweet[1])
      ? "sweet"
      : "work";
  }

  function forgeBite(zone) {
    if (zone === "sweet") {
      return tbsSweetBite;
    }
    return zone === "work" ? tbsWorkBite : 0;
  }

  /* Worked steel changes colour and the useful window walks along with it. */
  function forgeSlide(band, delta) {
    var lo = num(band && band[0]);
    var hi = num(band && band[1]);
    var width = Math.max(0, hi - lo);
    var next = clamp(lo + num(delta), 2, Math.max(2, 98 - width));
    return [next, next + width];
  }

  /* A bar is dealt at one thickness everywhere; the pattern is what the marks
   * say, so a position may also have to be left alone entirely. */
  function forgeMake(start, targets) {
    var thick = clamp(num(start), 0, 99);
    var list = targets || [];
    var out = [];
    for (var index = 0; index < tbsSpots.length; index += 1) {
      out.push({ stock: thick, target: clamp(num(list[index]), 0, thick) });
    }
    return out;
  }

  function forgeShape(segs, index, bite) {
    var out = [];
    for (var i = 0; i < segs.length; i += 1) {
      var stock = num(segs[i].stock);
      if (i === index) {
        stock = Math.max(0, stock - num(bite));
      }
      out.push({ stock: stock, target: num(segs[i].target) });
    }
    return out;
  }

  /* Still to hammer off, and how far off the pattern the blade ended up. */
  function forgeLeft(segs) {
    var sum = 0;
    (segs || []).forEach(function (seg) {
      sum += Math.max(0, num(seg.stock) - num(seg.target));
    });
    return sum;
  }

  function forgeError(segs) {
    var sum = 0;
    (segs || []).forEach(function (seg) {
      sum += Math.abs(num(seg.stock) - num(seg.target));
    });
    return sum;
  }

  function forgeNeed(level) {
    var start = num(level && level.start);
    var list = (level && level.targets) || [];
    var sum = 0;
    for (var index = 0; index < tbsSpots.length; index += 1) {
      sum += Math.max(0, start - clamp(num(list[index]), 0, start));
    }
    return sum;
  }

  function forgeBlows(level) {
    return forgeNeed(level) + Math.max(0, num(level && level.slack));
  }

  function forgeQuality(error, flaws) {
    return Math.round(
      clamp(
        100 - num(error) * tbsErrorCost - num(flaws) * tbsFlawCost,
        0,
        100,
      ),
    );
  }

  /* A blade that is still more than half rough is not a blade: it goes back in
   * the bin however tidy the arithmetic looks, so a cheap early quench can
   * never buy the next pattern. */
  function forgeServiceable(error, level) {
    return num(error) <= Math.ceil(forgeNeed(level) / 2);
  }

  function forgeQuenchOk(temp, level) {
    var win = (level && level.quench) || [0, 100];
    return num(temp) >= num(win[0]) && num(temp) <= num(win[1]);
  }

  function forgeStars(quality, level) {
    return starsFor(quality, (level && level.stars) || forgeBands(level), "high");
  }

  /* --- the stored line, and the proof that it holds ---------------------- */

  /* One frame of the panel's own clock: a stored rest counts frames, so the
   * replay and a real hand at 60fps are watching the same needle. */
  var tbsTick = 1 / 60;

  /* The honesty floor. A pattern may be tight, but no blow and no quench may
   * need less than this much time, or the rung is asking for a reflex instead
   * of a read. forgeReplay measures the tightest window a line actually uses. */
  var tbsHonestWindow = 0.1;

  /* One frame, exactly as the loop runs it: the needle travels first, then the
   * hammer comes back up. */
  function forgeFrame(state, level, dt) {
    var swing = forgeSwing(state.temp, state.dir, num(level.speed), dt);
    state.temp = swing.temp;
    state.dir = swing.dir;
    state.cool = Math.max(0, num(state.cool) - dt);
    state.frame += 1;
    return state;
  }

  /* How many frames ahead the needle keeps reading the same zone, with the band
   * frozen - a drift only happens under a blow, and the blow being counted has
   * not landed yet. */
  function forgeSpan(temp, dir, zone, band, sweet, speed, dt) {
    var frames = 0;
    var probe = temp;
    var way = dir;
    for (var guard = 0; guard < 1200; guard += 1) {
      var swing = forgeSwing(probe, way, speed, dt);
      probe = swing.temp;
      way = swing.dir;
      if (forgeZone(probe, band, sweet) !== zone) {
        break;
      }
      frames += 1;
    }
    return frames;
  }

  /* Replay a pattern's stored strike/cool sequence through the very functions the
   * panel runs: forgeSwing for the needle, forgeZone and forgeBite for the blow,
   * forgeShape for the steel, forgeSlide for the drift, then forgeQuenchOk,
   * forgeError, forgeServiceable, forgeQuality and forgeStars for the fire. It
   * touches no DOM, so the proof and the pixels cannot disagree. */
  function forgeReplay(level, dt) {
    var step = num(dt) > 0 ? num(dt) : tbsTick;
    var report = {
      id: level ? String(level.id) : "",
      ok: false, why: "",
      strikes: 0, frames: 0, budget: 0, spares: 0, need: 0,
      strays: 0, blocked: 0, error: 0, left: 0, flaws: 0,
      quality: 0, stars: 0, ceiling: 0, margin: 0,
      serviceable: false, quenched: false, dry: false,
      dwell: 0, dwellMs: 0, dwellUnits: 0, temp: 0, quenchTemp: 0, segs: [],
    };
    var line = (level && level.line) || [];
    if (!level || !line.length) {
      report.why = "no stored line";
      return report;
    }
    var segs = forgeMake(level.start, level.targets);
    var band = [num((level.band || [])[0]), num((level.band || [])[1])];
    var sweet = forgeSweet(band, level.core);
    var speed = num(level.speed);
    var state = { temp: 0, dir: 1, cool: 0, frame: 0 };
    var blows = forgeBlows(level);
    var swings = 0;
    var flaws = 0;
    var driftWay = 1;
    var runZone = "";
    var runFrom = 0;
    var tight = 0;
    for (var i = 0; i < line.length; i += 1) {
      var move = line[i] || {};
      var rest = Math.max(0, Math.round(num(move.w)));
      for (var k = 0; k < rest; k += 1) {
        forgeFrame(state, level, step);
        var seen = forgeZone(state.temp, band, sweet);
        if (seen !== runZone) {
          runZone = seen;
          runFrom = state.frame;
        }
      }
      var zone = forgeZone(state.temp, band, sweet);
      var span = state.frame - runFrom + 1 +
        forgeSpan(state.temp, state.dir, zone, band, sweet, speed, step);
      if (!tight || span < tight) {
        tight = span;
      }
      if (num(move.q) > 0) {
        /* the hammer is down and the blade goes in the barrel: no blow, no cost */
        report.quenchTemp = state.temp;
        report.quenched = forgeQuenchOk(state.temp, level);
        continue;
      }
      if (blows <= 0) {
        report.dry = true;
        break;
      }
      if (num(state.cool) > 0) {
        /* the panel would swallow this blow - the hammer is still coming up,
         * so a line that leans on it is not a line a hand could play */
        report.blocked += 1;
      }
      var spot = clamp(num(move.s), 0, tbsSpots.length - 1);
      var bite = forgeBite(zone);
      blows -= 1;
      swings += 1;
      report.strikes += 1;
      state.cool = tbsCoolTime;
      if (bite > 0) {
        segs = forgeShape(segs, spot, bite);
      } else {
        flaws += 1;
        report.strays += 1;
      }
      if (num(level.drift) > 0 && swings % Math.max(1, num(level.driftEvery)) === 0) {
        var moved = forgeSlide(band, driftWay * num(level.drift));
        if (num(moved[0]) === num(band[0])) {
          driftWay = -driftWay;
          moved = forgeSlide(band, driftWay * num(level.drift));
        }
        band = moved;
        sweet = forgeSweet(band, level.core);
        /* the window just walked off, so nothing behind this frame counts */
        runZone = "";
        runFrom = state.frame + 1;
      }
    }
    report.frames = state.frame;
    report.temp = state.temp;
    report.segs = segs;
    report.need = forgeNeed(level);
    report.budget = forgeBlows(level);
    report.spares = Math.max(0, blows);
    report.error = forgeError(segs);
    report.left = forgeLeft(segs);
    report.flaws = flaws;
    report.quality = forgeQuality(report.error, flaws);
    report.serviceable = forgeServiceable(report.error, level);
    report.stars = forgeStars(report.quality, level);
    report.ceiling = Math.ceil(report.need / 2);
    report.margin = Math.max(0, report.ceiling - report.error);
    report.dwell = tight;
    report.dwellMs = Math.round(tight * step * 1000);
    report.dwellUnits = Math.round(tight * step * speed * 10) / 10;
    var reason = [];
    if (report.dry) {
      reason.push("the hammer ran dry before the line ended");
    }
    if (report.blocked) {
      reason.push(report.blocked + " blows inside the cooldown");
    }
    if (report.strays) {
      reason.push(report.strays + " stray blows");
    }
    if (report.error > 0) {
      reason.push(report.error + " off the marks");
    }
    if (!report.quenched) {
      reason.push("quenched outside the window");
    }
    if (!report.serviceable) {
      reason.push("not serviceable");
    }
    if (report.stars < 3) {
      reason.push("only " + report.stars + " stars");
    }
    if (report.dwellMs < tbsHonestWindow * 1000) {
      reason.push("tightest window " + report.dwellMs + "ms");
    }
    report.ok = !report.dry && report.blocked === 0 && report.strays === 0 &&
      report.error === 0 && report.left === 0 && report.quenched &&
      report.serviceable && report.stars >= 3 &&
      report.dwellMs >= tbsHonestWindow * 1000;
    report.why = report.ok ? "proved" : reason.join(", ");
    return report;
  }

  /* The replay is cached per pattern: the bands, the par an order line quotes
   * and the proof all read the same measured number. */
  var tbsMeasured = {};
  function forgeMeasure(level) {
    var id = level && level.id ? String(level.id) : "";
    if (id && tbsMeasured[id]) {
      return tbsMeasured[id];
    }
    var report = forgeReplay(level);
    if (id) {
      tbsMeasured[id] = report;
    }
    return report;
  }

  /* A pattern only ships if its stored line forges it: every mark met, no stray
   * blows, the hammer still up for the quench, the blade serviceable, three
   * stars, and no window shorter than the honesty floor. */
  function forgeSolvable(level) {
    return !!forgeMeasure(level).ok;
  }

  /* The measured blow count the proven line lands, which is what the order line
   * quotes as par. A pattern with no line falls back to the exact plan. */
  function forgePar(level) {
    var strikes = num(forgeMeasure(level).strikes);
    return strikes > 0 ? strikes : forgeNeed(level);
  }

  /* The bands, cut from the pattern's own arithmetic: 3 stars is the proven
   * shape with one stray blow, 2 is half the serviceable error allowance plus
   * that flaw, and 1 is the serviceable boundary itself - which is also the
   * line the next rung unlocks behind. */
  function forgeBands(level) {
    var ceiling = Math.ceil(forgeNeed(level) / 2);
    var top = clamp(100 - tbsFlawCost, 1, 100);
    var mid = clamp(100 - tbsFlawCost - tbsErrorCost * Math.ceil(ceiling / 2), 1, top - 1);
    var low = clamp(100 - tbsErrorCost * ceiling, 0, mid - 1);
    return [top, mid, low];
  }

  /* --- the panel ------------------------------------------------------- */
  function initTinyBlacksmithGame(panelEl) {
    if (!panelEl) {
      return;
    }

    var campaign = createCampaign({ key: "tiny-blacksmith-campaign", levels: tbsLevels });
    var level = tbsLevels[Math.max(0, campaign.indexOf(campaign.nextLevelId()))];
    var segs = forgeMake(level.start, level.targets);
    var band = [num((level.band || [])[0]), num((level.band || [])[1])];
    var sweet = forgeSweet(band, level.core);
    var temp = 0;
    var dir = 1;
    var blows = forgeBlows(level);
    var flaws = 0;
    var swings = 0;
    var cool = 0;
    var driftWay = 1;
    var selected = 2;
    var running = false;
    var held = false;
    var rafId = null;
    var lastFrame = Date.now();

    /* --- markup: built with createElement so the headless harness sees it --- */
    function el(tag, cls, key) {
      var node = document.createElement(tag);
      if (cls) {
        node.className = cls;
      }
      if (key) {
        node.setAttribute("data-i18n", key);
        node.textContent = t(key);
      }
      return node;
    }

    function add(parent, kids) {
      for (var i = 0; i < kids.length; i += 1) {
        parent.appendChild(kids[i]);
      }
      return parent;
    }

    function button(cls, label) {
      var node = el("button", cls);
      node.type = "button";
      var span = el("span", "button-content");
      span.textContent = label;
      return add(node, [span]);
    }

    function stat(key, valueEl) {
      return add(el("div", "game-stat"), [el("span", "", key), valueEl]);
    }

    /* The panel only ever writes text it has already computed, so a value that
     * is missing reads as 0 rather than leaking into the HUD. */
    function setText(node, text) {
      if (node._tbs !== text) {
        node._tbs = text;
        node.textContent = text;
      }
    }

    function spotName(index) {
      var spot = tbsSpots[clamp(index, 0, tbsSpots.length - 1)];
      return t(spot.key);
    }

    function makeSpot(index, parent) {
      var stock = el("div", "tbs-stock");
      var mark = el("span", "tbs-mark");
      var gauge = add(el("div", "tbs-gauge"), [stock, mark]);
      var read = el("p", "tbs-read");
      var hot = el("span", "tbs-hot");
      hot.setAttribute("aria-hidden", "true");
      hot.textContent = String(index + 1);
      var card = el("button", "tbs-spot");
      card.type = "button";
      card.setAttribute("aria-pressed", "false");
      add(card, [
        add(el("div", "tbs-spot-top"), [el("span", "tbs-spot-name", tbsSpots[index].key), hot]),
        gauge,
        read,
      ]);
      card.addEventListener("click", function () {
        tapSpot(index);
      });
      parent.appendChild(card);
      return { card: card, stock: stock, mark: mark, read: read };
    }

    var heatEl = el("strong");
    var blowsEl = el("strong");
    var flawsEl = el("strong");
    var shapeEl = el("strong");
    var qualityEl = el("strong");
    var hud = add(el("div", "game-hud"), [
      stat("tbsHeatLabel", heatEl),
      stat("tbsBlowsLabel", blowsEl),
      stat("tbsFlawsLabel", flawsEl),
      stat("tbsShapeLabel", shapeEl),
      stat("tbsQualityLabel", qualityEl),
    ]);

    var coldEl = el("div", "tbs-cold");
    var burnEl = el("div", "tbs-burn");
    var bandEl = el("div", "tbs-band");
    var sweetEl = el("div", "tbs-sweet");
    var quenchEl = el("div", "tbs-quench");
    var needleEl = el("div", "tbs-needle");
    var rail = add(el("div", "tbs-rail"), [
      coldEl, burnEl, bandEl, sweetEl, quenchEl, needleEl,
    ]);
    rail.setAttribute("role", "img");
    rail.setAttribute("aria-label", t("tbsRailAria"));

    var wordEl = el("p", "tbs-word");
    wordEl.setAttribute("aria-hidden", "true");
    var legendEl = el("p", "tbs-legend");
    legendEl.setAttribute("aria-hidden", "true");
    legendEl.textContent = [
      t("tbsWordCold"), t("tbsWordWork"), t("tbsWordSweet"),
      t("tbsWordBurn"), t("tbsWordQuench"),
    ].join(" \u00b7 ");
    /* The three windows on the rail are strips of colour, so their numbers ride
     * in words and digits beside them: a band is never only a shade. */
    var windowEl = el("p", "tbs-legend");
    var forge = add(el("div", "tbs-forge"), [
      el("p", "tbs-railtitle", "tbsRailTitle"),
      rail,
      add(el("div", "tbs-lines"), [wordEl, legendEl, windowEl]),
    ]);

    var anvil = el("div", "tbs-anvil");
    anvil.setAttribute("role", "group");
    anvil.setAttribute("aria-label", t("tbsAnvilAria"));
    var spots = [];
    for (var s = 0; s < tbsSpots.length; s += 1) {
      spots.push(makeSpot(s, anvil));
    }

    var result = el("p", "game-result");
    result.setAttribute("role", "status");

    var benchLabel = el("label", "elements-label", "tbsBenchLabel");
    benchLabel.setAttribute("for", "tbsBenchSel");
    var benchSel = el("select", "elements-select");
    benchSel.id = "tbsBenchSel";
    var benchRow = add(el("div", "elements-row"), [benchLabel, benchSel]);

    var strikeBtn = button("primary tbs-strike", t("tbsBtnStrike"));
    var quenchBtn = button("tbs-quench-btn", t("tbsBtnQuench"));
    var newBtn = button("tbs-new-btn", t("tbsBtnNew"));
    var starsEl = el("p", "game-best");
    var actions = add(el("div", "game-actions"), [
      strikeBtn, quenchBtn, newBtn, starsEl,
    ]);

    add(panelEl, [
      hud, forge, anvil, result, benchRow, actions,
      el("p", "game-hint", "tbsHint"),
    ]);

    /* --- what the player sees ----------------------------------------- */
    function paint() {
      var lo = clamp(num(band[0]), 0, 100);
      var hi = clamp(num(band[1]), 0, 100);
      var core = sweet || [lo, hi];
      coldEl.style.left = "0%";
      coldEl.style.width = lo + "%";
      burnEl.style.left = hi + "%";
      burnEl.style.width = Math.max(0, 100 - hi) + "%";
      bandEl.style.left = lo + "%";
      bandEl.style.width = Math.max(0, hi - lo) + "%";
      sweetEl.style.left = clamp(num(core[0]), 0, 100) + "%";
      sweetEl.style.width = Math.max(0, num(core[1]) - num(core[0])) + "%";
      var win = level.quench || [0, 0];
      quenchEl.style.left = clamp(num(win[0]), 0, 100) + "%";
      quenchEl.style.width = Math.max(0, clamp(num(win[1]), 0, 100) - clamp(num(win[0]), 0, 100)) + "%";
      needleEl.style.left = num(temp).toFixed(2) + "%";

      var zone = forgeZone(temp, band, sweet);
      rail.className = "tbs-rail is-" + zone +
        (zone === "work" || zone === "sweet" ? " is-open" : "");
      setText(wordEl, t(tbsZoneWords[zone] || "tbsWordCold"));

      setText(heatEl, String(Math.round(num(temp))));
      setText(blowsEl, t("tbsBlowsLeft", { n: Math.max(0, num(blows)) }));
      setText(flawsEl, String(Math.max(0, num(flaws))));
      setText(shapeEl, t("tbsShapeLeft", { n: forgeLeft(segs) }));
      setText(qualityEl, String(forgeQuality(forgeError(segs), flaws)));
      setText(windowEl, t("tbsWindowRead", {
        a: Math.round(lo), b: Math.round(hi),
        c: Math.round(num(core[0])), d: Math.round(num(core[1])),
        e: Math.round(num(win[0])), f: Math.round(num(win[1])),
      }));

      var start = num(level.start) || 1;
      for (var i = 0; i < spots.length; i += 1) {
        var view = spots[i];
        var stock = clamp(num(segs[i] && segs[i].stock), 0, start);
        var mark = clamp(num(segs[i] && segs[i].target), 0, start);
        view.stock.style.height = (stock / start) * 100 + "%";
        view.mark.style.bottom = (mark / start) * 100 + "%";
        setText(view.read, t("tbsSegRead", { a: stock, b: mark }));
        view.card.className = "tbs-spot" +
          (i === selected ? " is-selected" : "") +
          (stock === mark ? " is-true" : stock < mark ? " is-over" : "");
        view.card.setAttribute("aria-pressed", i === selected ? "true" : "false");
      }
    }

    function refreshPicker() {
      fillCampaignPicker(
        benchSel,
        campaign,
        function (def) {
          return t(def.labelKey);
        },
        t("elementsLocked"),
      );
      benchSel.value = level.id;
      setText(starsEl, t("campaignStars", {
        n: campaign.totalStars(),
        max: campaign.maxStars(),
      }));
    }

    /* --- the hammer ---------------------------------------------------- */
    function slideBand() {
      var step = driftWay * num(level.drift);
      var moved = forgeSlide(band, step);
      if (num(moved[0]) === num(band[0])) {
        driftWay = -driftWay;
        moved = forgeSlide(band, driftWay * num(level.drift));
      }
      band = moved;
      sweet = forgeSweet(band, level.core);
    }

    function swingAt(index) {
      if (!running) {
        /* the line on the panel already says what to do next */
        return;
      }
      if (blows <= 0) {
        return;
      }
      /* The hammer is still coming back up: no blow, no cost, no message. */
      if (cool > 0) {
        return;
      }
      cool = tbsCoolTime;
      var spot = clamp(num(index), 0, tbsSpots.length - 1);
      var zone = forgeZone(temp, band, sweet);
      var bite = forgeBite(zone);
      blows -= 1;
      swings += 1;
      var word;
      if (bite > 0) {
        segs = forgeShape(segs, spot, bite);
        var stock = num(segs[spot] && segs[spot].stock);
        var mark = num((level.targets || [])[spot]);
        if (stock < mark) {
          word = t("tbsMsgOver", { spot: spotName(spot) });
        } else if (zone === "sweet") {
          word = t("tbsMsgSweet", { spot: spotName(spot), n: forgeLeft(segs) });
        } else {
          word = t("tbsMsgWork", { spot: spotName(spot), n: forgeLeft(segs) });
        }
      } else if (zone === "burn") {
        flaws += 1;
        word = t("tbsMsgBurn", { spot: spotName(spot) });
      } else {
        flaws += 1;
        word = t("tbsMsgCold", { spot: spotName(spot) });
      }
      if (num(level.drift) > 0 && swings % Math.max(1, num(level.driftEvery)) === 0) {
        slideBand();
        word += " " + t("tbsMsgDrift");
      }
      if (blows <= 0) {
        paint();
        finish("dry");
        return;
      }
      result.textContent = word;
      paint();
    }

    function tapSpot(index) {
      if (!running) {
        /* the line on the panel already says what to do next */
        return;
      }
      if (index === selected) {
        swingAt(index);
        return;
      }
      selected = index;
      result.textContent = t("tbsMsgAim", { spot: spotName(index), n: index + 1 });
      paint();
    }

    function quench() {
      if (!running) {
        /* the line on the panel already says what to do next */
        return;
      }
      finish(forgeQuenchOk(temp, level) ? "clean" : "warp");
    }

    /* --- round flow ---------------------------------------------------- */
    function finish(reason) {
      if (!running) {
        return;
      }
      running = false;
      held = false;
      var warped = reason === "warp";
      if (warped) {
        flaws += 1;
      }
      var error = forgeError(segs);
      var quality = forgeQuality(error, flaws);
      var name = t(level.labelKey);
      var floor = num((level.stars || [])[2]);
      var message;
      if (quality >= floor && forgeServiceable(error, level)) {
        var won = forgeStars(quality, level);
        var outcome = campaign.record(level.id, {
          stars: won, best: quality, better: "high",
        });
        message = t("tbsMsgDone", {
          name: name, q: quality, s: won, e: error, f: flaws,
        });
        if (outcome.isBest) {
          message += " " + t("newBest");
        }
        if (outcome.unlockedNext) {
          message += " " + t("tbsNextPattern");
        } else if (campaign.clearedCount() === tbsLevels.length) {
          message += " " + t("tbsCampaignDone");
        }
        logAction(t("logTinyBlacksmith", { name: name, q: quality }));
        var rect = newBtn.getBoundingClientRect();
        createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
        petNotifyGame(outcome.isBest || outcome.firstClear);
      } else {
        message = t("tbsMsgScrap", { name: name, q: quality, e: error, f: flaws });
        petNotifyGame(false);
      }
      if (reason === "dry") {
        message += " " + t("tbsMsgDry");
      }
      if (warped) {
        message += " " + t("tbsMsgWarp");
      }
      result.textContent = message;
      refreshPicker();
      paint();
    }

    function heatBar(def) {
      level = def || level;
      segs = forgeMake(level.start, level.targets);
      band = [num((level.band || [])[0]), num((level.band || [])[1])];
      sweet = forgeSweet(band, level.core);
      temp = 0;
      dir = 1;
      blows = forgeBlows(level);
      flaws = 0;
      swings = 0;
      cool = 0;
      driftWay = 1;
      selected = 2;
      running = true;
      held = false;
      lastFrame = Date.now();
      result.textContent = t("tbsMsgOrder", {
        name: t(level.labelKey), b: forgeNeed(level), n: blows, p: forgePar(level),
      });
      refreshPicker();
      paint();
    }

    /* One loop for the whole panel: the needle only travels while the drawer is
     * actually showing this game, so a hidden forge never burns frames. */
    function frame() {
      if (rafId === null) {
        return;
      }
      var visible = !panelEl.hidden && !document.hidden;
      if (visible && held) {
        /* the drawer took the panel away mid-forge; the blade waits for nothing
         * else, so the sweep simply picks up where it stopped */
        held = false;
        running = true;
        lastFrame = Date.now();
        result.textContent = t("tbsMsgLive", {
          n: Math.max(0, num(blows)), b: forgeLeft(segs),
        });
      }
      if (running && visible) {
        var now = Date.now();
        var dt = clamp((now - lastFrame) / 1000, 0.001, 0.05);
        lastFrame = now;
        var swing = forgeSwing(temp, dir, num(level.speed), dt);
        temp = swing.temp;
        dir = swing.dir;
        cool = Math.max(0, num(cool) - dt);
        paint();
      } else {
        lastFrame = Date.now();
      }
      rafId = window.requestAnimationFrame(frame);
    }

    function stop(event) {
      if (event && event.preventDefault) {
        event.preventDefault();
      }
    }

    /* Keys live on the panel: the rail is a visual, and a focused button already
     * answers Space/Enter itself, so the swing is not doubled. */
    function onKey(event) {
      var tag = event.target && event.target.tagName;
      if (tag === "SELECT" || tag === "INPUT" || tag === "TEXTAREA") {
        return;
      }
      var key = event.key;
      if (!key) {
        return;
      }
      if (key === "ArrowLeft" || key === "ArrowRight" || key === "a" || key === "d") {
        stop(event);
        selected = clamp(selected + (key === "ArrowLeft" || key === "a" ? -1 : 1), 0, tbsSpots.length - 1);
        result.textContent = t("tbsMsgAim", { spot: spotName(selected), n: selected + 1 });
        paint();
        return;
      }
      if (Object.prototype.hasOwnProperty.call(tbsKeySpots, key)) {
        stop(event);
        selected = tbsKeySpots[key];
        result.textContent = t("tbsMsgAim", { spot: spotName(selected), n: selected + 1 });
        paint();
        return;
      }
      if (key === " " || key === "Enter") {
        if (tag === "BUTTON") {
          return;
        }
        stop(event);
        swingAt(selected);
        return;
      }
      if (key === "q" || key === "Q") {
        stop(event);
        quench();
        return;
      }
      if (key === "n" || key === "N") {
        stop(event);
        heatBar(level);
      }
    }

    strikeBtn.addEventListener("click", function () {
      swingAt(selected);
    });
    quenchBtn.addEventListener("click", quench);
    newBtn.addEventListener("click", function () {
      heatBar(level);
    });
    rail.addEventListener("pointerdown", function (event) {
      stop(event);
      swingAt(selected);
    });
    benchSel.addEventListener("change", function () {
      var index = campaign.indexOf(benchSel.value);
      if (index >= 0 && campaign.isUnlocked(benchSel.value)) {
        heatBar(tbsLevels[index]);
      }
    });
    panelEl.addEventListener("keydown", onKey);

    App.quietResetTinyBlacksmith = function () {
      if (running) {
        running = false;
        held = true;
        result.textContent = t("tbsMsgPaused");
        paint();
      }
    };

    heatBar(level);
    rafId = window.requestAnimationFrame(frame);
  }

  /* Bilingual copy travels with the game: addStrings only fills keys i18n.js
   * does not already own, so the shared dictionary stays authoritative. */
  App.addStrings({
    en: {
      "tabTinyBlacksmith": "Tiny Blacksmith",
      "tbsL1": "Nail",
      "tbsL2": "Chisel",
      "tbsL3": "Cleaver",
      "tbsL4": "Sickle",
      "tbsL5": "Falx",
      "tbsL6": "Longsword",
      "tbsL7": "Sabre",
      "tbsL8": "Rapier",
      "tbsL9": "War Axe",
      "tbsL10": "Halberd",
      "tbsL11": "Claymore",
      "tbsL12": "Meteor Greatsword",
      "tbsHeatLabel": "Heat",
      "tbsBlowsLabel": "Hammer",
      "tbsFlawsLabel": "Flaws",
      "tbsShapeLabel": "To shape",
      "tbsQualityLabel": "Quality",
      "tbsBlowsLeft": "{n} blows",
      "tbsShapeLeft": "{n} units",
      "tbsRailTitle": "Forge rail",
      "tbsRailAria": "Blade temperature rail: the needle swings between cold and burning, and the amber band is where steel takes a shape.",
      "tbsAnvilAria": "The five hammer positions on the bar, tip first",
      "tbsBenchLabel": "Choose a pattern",
      "tbsBtnStrike": "Strike",
      "tbsBtnQuench": "Quench",
      "tbsBtnNew": "New Blade",
      "tbsWordCold": "too cold",
      "tbsWordWork": "workable",
      "tbsWordSweet": "straw - perfect",
      "tbsWordBurn": "burning",
      "tbsWordQuench": "quench",
      "tbsSpotTip": "Tip",
      "tbsSpotPoint": "Point",
      "tbsSpotMid": "Middle",
      "tbsSpotHeel": "Heel",
      "tbsSpotTang": "Tang",
      "tbsSegRead": "{a} to {b}",
      "tbsWindowRead": "Workable {a}-{b}, core {c}-{d}, quench {e}-{f}.",
      "tbsMsgOrder": "Order: {name}. Hammer {b} units off this bar and quench it clean - {n} blows on the clock, and the proven line lands it in {p}.",
      "tbsMsgAim": "Hammer held over {spot} (position {n}).",
      "tbsMsgWork": "Good blow on {spot} - {n} units left to shape.",
      "tbsMsgSweet": "Straw-coloured blow on {spot}: two units off, {n} left to shape.",
      "tbsMsgOver": "{spot} is thinner than its mark now - steel never grows back.",
      "tbsMsgCold": "Too cold: the blow rings off {spot} and leaves a crack.",
      "tbsMsgBurn": "Too hot: {spot} scorches and the blow takes nothing off.",
      "tbsMsgDrift": "The steel changed colour - the band slid along the rail.",
      "tbsMsgDone": "{name} leaves the anvil: quality {q}, {s} stars, {e} off the marks, {f} flaws.",
      "tbsMsgScrap": "{name} goes back to the scrap bin: quality {q} ({e} off the marks, {f} flaws).",
      "tbsMsgDry": "The hammer ran dry.",
      "tbsMsgWarp": "Quenched outside the window - the blade warped.",
      "tbsMsgPaused": "The drawer took you away - the forge waits exactly where you left it.",
      "tbsMsgLive": "Back at the anvil: {n} blows left, {b} units still to shape.",
      "tbsNextPattern": "Next pattern unlocked.",
      "tbsCampaignDone": "Every pattern on the bench is forged.",
      "tbsHint": "Point at a position, then swing while the needle is inside the amber band - the bright core takes two units off, and the hammer needs a beat to come back up between blows. Each card shows its thickness over the mark it must reach, and the last swing has to land in the dashed quench window. All twelve patterns are forged as one hot bar: a section that has to stay put, or come down by a single unit, is struck on the dull shoulder of the band while its neighbour waits for the core, and one greedy blow ruins the shape for good. The line under the rail prints all three windows as numbers, so a band is never only a colour.",
      "logTinyBlacksmith": "Forged a {name} at quality {q}",
    },
    zh: {
      "tabTinyBlacksmith": "小铁匠",
      "tbsL1": "铁钉",
      "tbsL2": "凿子",
      "tbsL3": "菜刀",
      "tbsL4": "镰刀",
      "tbsL5": "弯刀",
      "tbsL6": "长剑",
      "tbsL7": "马刀",
      "tbsL8": "刺剑",
      "tbsL9": "战斧",
      "tbsL10": "长戟",
      "tbsL11": "双手大剑",
      "tbsL12": "陨铁巨剑",
      "tbsHeatLabel": "炉温",
      "tbsBlowsLabel": "锤数",
      "tbsFlawsLabel": "瑕疵",
      "tbsShapeLabel": "待锻",
      "tbsQualityLabel": "品质",
      "tbsBlowsLeft": "还剩 {n} 锤",
      "tbsShapeLeft": "{n} 个单位",
      "tbsRailTitle": "炉温标尺",
      "tbsRailAria": "刀坯温度标尺：指针在冰冷与烧红之间来回摆动，琥珀色区间才是铁吃得住房的地方。",
      "tbsAnvilAria": "铁砧上的五个锻打位置，从刀尖到柄脚",
      "tbsBenchLabel": "选择刀样",
      "tbsBtnStrike": "落锤",
      "tbsBtnQuench": "淬火",
      "tbsBtnNew": "重新起坯",
      "tbsWordCold": "太冷",
      "tbsWordWork": "可锻",
      "tbsWordSweet": "稻草色 - 正好",
      "tbsWordBurn": "烧过了",
      "tbsWordQuench": "淬火窗",
      "tbsSpotTip": "刀尖",
      "tbsSpotPoint": "前段",
      "tbsSpotMid": "中段",
      "tbsSpotHeel": "后段",
      "tbsSpotTang": "柄脚",
      "tbsSegRead": "{a} / {b}",
      "tbsWindowRead": "可锻 {a}-{b} · 核心 {c}-{d} · 淬火 {e}-{f}",
      "tbsMsgOrder": "订单：{name}。这根坯料要锻掉 {b} 个单位并干净淬火 - 你有 {n} 锤，而验证过的路线只落 {p} 锤。",
      "tbsMsgAim": "锤子对准{spot}（第 {n} 位）。",
      "tbsMsgWork": "{spot}挨了一记好锤 - 还差 {n} 个单位。",
      "tbsMsgSweet": "稻草色正中：{spot}一次去掉两个单位，还差 {n} 个。",
      "tbsMsgOver": "{spot}已经比刻度还薄了 - 铁长不回来。",
      "tbsMsgCold": "温度不够：这一锤从{spot}弹开，留下一道裂口。",
      "tbsMsgBurn": "太热了：{spot}被烧糊，这一锤什么也没打掉。",
      "tbsMsgDrift": "钢色变了 - 可锻区间在标尺上挪了位置。",
      "tbsMsgDone": "{name}下砧：品质 {q}，{s} 星，比刻度差 {e}，瑕疵 {f} 处。",
      "tbsMsgScrap": "{name}被丢回废料筐：品质 {q}（差 {e} 个单位，{f} 处瑕疵）。",
      "tbsMsgDry": "锤子用完了。",
      "tbsMsgWarp": "没在窗口里下火 - 刀身翘曲了。",
      "tbsMsgPaused": "你离开了抽屉 - 炉子就停在你放下的地方。",
      "tbsMsgLive": "回到铁砧前：还剩 {n} 锤，还要锻 {b} 个单位。",
      "tbsNextPattern": "解锁下一个刀样。",
      "tbsCampaignDone": "案上所有刀样都锻完了。",
      "tbsHint": "先选定一个位置，再趁指针停在琥珀色区间里落锤 - 更亮的那段核心一次去掉两个单位，而锤子每挨一记都要一点工夫抬回来。每张卡片上的数字是当前厚度 / 要锻到的刻度，最后一锤之前还要把指针停在虚线淬火窗里下火。",
      "logTinyBlacksmith": "锻好一把{name}，品质 {q}",
    },
  });

  App.registerGame({
    name: "tinyBlacksmith",
    tabKey: "tabTinyBlacksmith",
    init: initTinyBlacksmithGame,
    guide: {
      svg:
        '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="6" y="9" width="108" height="13" rx="6.5" fill="rgba(30,41,59,.75)" stroke="rgba(148,163,184,.45)"/>' +
        '<rect x="40" y="11" width="44" height="9" rx="4.5" fill="rgba(255,107,53,.28)"/>' +
        '<rect x="56" y="11" width="14" height="9" rx="4" fill="#ff6b35"/>' +
        '<rect x="88" y="11" width="9" height="9" rx="2" fill="none" stroke="#22d3ee" stroke-dasharray="3 2"/>' +
        '<path d="M63 6v19" stroke="#e2e8f0" stroke-width="2"/>' +
        '<g fill="rgba(148,163,184,.3)"><rect x="14" y="40" width="14" height="26" rx="3"/><rect x="35" y="40" width="14" height="26" rx="3"/><rect x="56" y="40" width="14" height="26" rx="3"/><rect x="77" y="40" width="14" height="26" rx="3"/><rect x="98" y="40" width="14" height="26" rx="3"/></g>' +
        '<g fill="#ff6b35"><rect x="14" y="58" width="14" height="8" rx="3"/><rect x="35" y="53" width="14" height="13" rx="3"/><rect x="56" y="46" width="14" height="20" rx="3"/><rect x="77" y="43" width="14" height="23" rx="3"/><rect x="98" y="40" width="14" height="26" rx="3"/></g>' +
        '<g stroke="#a3e635" stroke-width="1.6" stroke-dasharray="3 2"><path d="M14 56h14"/><path d="M35 56h14"/><path d="M56 56h14"/><path d="M77 56h14"/><path d="M98 56h14"/></g>' +
        '<text x="21" y="74" font-size="7" fill="#94a3b8" text-anchor="middle">1</text>' +
        '<text x="42" y="74" font-size="7" fill="#94a3b8" text-anchor="middle">2</text>' +
        '<text x="63" y="74" font-size="7" fill="#94a3b8" text-anchor="middle">3</text>' +
        '<text x="84" y="74" font-size="7" fill="#94a3b8" text-anchor="middle">4</text>' +
        '<text x="105" y="74" font-size="7" fill="#94a3b8" text-anchor="middle">5</text></svg>',
      en: [
        "Aim: hammer the bar down onto the mark at all five positions, then quench it clean.",
        "Controls: click a position (or press 1-5) to point the hammer - click the one already lit, or press Space, to swing, and the hammer needs a beat to come back up. Q quenches, N heats a fresh bar.",
        "Timing: the needle is the bar's temperature. Blows only bite inside the amber band, and the brighter core takes two units off instead of one.",
        "Watch out: a cold blow rings off and cracks the steel, a burning one scorches it, and each wastes a blow from the budget; over-thinned metal never comes back, and a quench outside the dashed window warps the blade.",
        "Twist: as the colour changes the whole band slides along the rail, so the window you learned is not the window you get.",
        "Scoring: quality starts at 100, every unit off its mark costs 6 and every flaw 8; a bar still half rough is scrap, so the pattern has to be finished before a quench counts.",
      ],
      zh: [
        "目标：把坯料在五个位置上都锻到各自的刻度线，再来一次干净的淬火。",
        "操作：点击一个位置（或按 1-5）把锤子对准它；再点一次同一个位置、或按空格就是落锤，而锤子每落一记都要费一点工夫抬回来。Q 淬火，N 重新起坯。",
        "时机：指针就是刀坯的温度。只有在琥珀色区间里落锤才吃得住，更亮的那段核心一锤去掉两个单位。",
        "小心：太冷的锤会弹开并留下裂口，太热的会烧糊，两种都白废一锤；锻薄的铁永远长不回来，不在虚线窗口里下火则会让刀身翘曲。",
        "变化：钢一变色，整段可锻区间就会在标尺上滑动，你记住的窗口不是下一锤的窗口。",
        "计分：品质从 100 起算，每个没到位的单位扣 6 分，每处瑕疵扣 8 分；还剩一半以上没锻的就是废料，所以先把图案锻到位再谈淬火。",
      ],
    },
  });

  /* Exported for the other modules. */
  App.initTinyBlacksmithGame = initTinyBlacksmithGame;
  App.forgeLevels = tbsLevels;
  App.forgeSpots = tbsSpots;
  App.forgeCoolTime = tbsCoolTime;
  App.forgeSwing = forgeSwing;
  App.forgeSweet = forgeSweet;
  App.forgeZone = forgeZone;
  App.forgeBite = forgeBite;
  App.forgeSlide = forgeSlide;
  App.forgeMake = forgeMake;
  App.forgeShape = forgeShape;
  App.forgeLeft = forgeLeft;
  App.forgeError = forgeError;
  App.forgeNeed = forgeNeed;
  App.forgeBlows = forgeBlows;
  App.forgeQuality = forgeQuality;
  App.forgeServiceable = forgeServiceable;
  App.forgeQuenchOk = forgeQuenchOk;
  App.forgeStars = forgeStars;
})(window.CapitalConvert = window.CapitalConvert || {});
