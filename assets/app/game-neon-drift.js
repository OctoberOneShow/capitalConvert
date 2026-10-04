/* Neon Drift - a top-down momentum time trial.
 * The car carries forward and lateral velocity separately, so grip decides how
 * much of a corner the car bites: lift the throttle too late and the rear steps
 * out. Par is not guessed - a scripted driver line runs the same pure stepper at
 * 60 Hz and its measured lap sets the star bands. */
(function (App) {
  var t = App.t;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  var createCampaign = App.createCampaign;
  var fillCampaignPicker = App.fillCampaignPicker;
  var starsFor = App.starsFor;

  var nirW = 420;
  var nirH = 400;
  var nirAccel = 330;
  var nirBoostAccel = 210;
  var nirBrake = 460;
  var nirTop = 250;
  var nirBoostTop = 320;
  var nirTurn = 4.2;
  var nirTurnFalloff = 150;
  var nirDrag = 0.5;
  var nirSlide = 0.62;
  var nirGrip = 4.6;
  var nirClipPenalty = 1.5;
  var nirBoostTime = 1.2;
  var nirPadRadius = 22;

  /* Five authored centre lines. `limit` is only a safety net: the real bands
   * come from nirPar() measuring the scripted line on the same stepper. */
  var nirCourses = [
    {
      id: "n1", labelKey: "nirZ1", width: 34, limit: 30, basePar: 9,
      points: [{ x: 40, y: 356 }, { x: 200, y: 356 }, { x: 340, y: 350 }, { x: 384, y: 296 }, { x: 352, y: 238 }, { x: 220, y: 234 }, { x: 150, y: 232 }, { x: 120, y: 150 }, { x: 170, y: 66 }, { x: 290, y: 44 }],
      pads: [{ x: 120, y: 356 }, { x: 368, y: 266 }],
    },
    {
      id: "n2", labelKey: "nirZ2", width: 36, limit: 30, basePar: 5,
      points: [{ x: 44, y: 356 }, { x: 150, y: 344 }, { x: 250, y: 308 }, { x: 330, y: 248 }, { x: 374, y: 168 }, { x: 352, y: 86 }, { x: 262, y: 44 }, { x: 160, y: 52 }, { x: 86, y: 110 }],
      pads: [{ x: 200, y: 326 }, { x: 363, y: 127 }],
    },
    {
      id: "n3", labelKey: "nirZ3", width: 32, limit: 32, basePar: 10,
      points: [{ x: 34, y: 330 }, { x: 120, y: 330 }, { x: 178, y: 252 }, { x: 250, y: 330 }, { x: 330, y: 258 }, { x: 386, y: 318 }, { x: 386, y: 192 }, { x: 300, y: 112 }, { x: 170, y: 96 }],
      pads: [{ x: 78, y: 330 }, { x: 344, y: 152 }],
    },
    {
      id: "n4", labelKey: "nirZ4", width: 26, limit: 34, basePar: 12,
      points: [{ x: 44, y: 370 }, { x: 44, y: 270 }, { x: 152, y: 270 }, { x: 152, y: 172 }, { x: 262, y: 172 }, { x: 262, y: 78 }, { x: 376, y: 78 }],
      pads: [{ x: 44, y: 330 }, { x: 207, y: 172 }],
    },
    {
      id: "n5", labelKey: "nirZ5", width: 30, limit: 38, basePar: 12,
      points: [{ x: 40, y: 356 }, { x: 200, y: 356 }, { x: 340, y: 350 }, { x: 384, y: 268 }, { x: 356, y: 180 }, { x: 240, y: 150 }, { x: 120, y: 180 }, { x: 56, y: 120 }, { x: 120, y: 52 }, { x: 250, y: 40 }],
      pads: [{ x: 270, y: 353 }, { x: 370, y: 224 }],
    },
  ];

  /* --- pure core ---------------------------------------------------------- */
  function nirClone(car) {
    return {
      x: car.x,
      y: car.y,
      angle: car.angle,
      vx: car.vx,
      vy: car.vy,
      fwd: car.fwd,
      lat: car.lat,
      boost: car.boost,
      scraping: !!car.scraping,
    };
  }

  function nirSpeed(car) {
    return Math.sqrt(car.vx * car.vx + car.vy * car.vy);
  }

  /* One physics tick. `input` is {throttle, brake, steer}, all clamped 0..1 /
   * -1..1; steering authority falls with speed and lateral grip loosens too, so
   * the same corner taken fast becomes a slide instead of a turn. */
  function nirStep(car, input, dt) {
    var step = dt > 0 ? Math.min(dt, 0.032) : 0;
    var next = nirClone(car);
    var gas = input && input.throttle ? 1 : 0;
    var ped = input && input.brake ? 1 : 0;
    var wheel = input && input.steer ? Math.max(-1, Math.min(1, input.steer)) : 0;
    var cos = Math.cos(next.angle);
    var sin = Math.sin(next.angle);
    var fwd = next.vx * cos + next.vy * sin;
    var lat = -next.vx * sin + next.vy * cos;
    var boosting = next.boost > 0;
    if (gas) {
      fwd += (boosting ? nirAccel + nirBoostAccel : nirAccel) * step;
    }
    if (ped) {
      fwd -= nirBrake * step;
    }
    if (!gas && !ped) {
      fwd -= fwd * 0.7 * step;
    }
    fwd -= fwd * nirDrag * step * (gas ? 0.35 : 1);
    if (fwd < -30) {
      fwd = -30;
    }
    var ceiling = boosting ? nirBoostTop : nirTop;
    if (fwd > ceiling) {
      fwd = ceiling;
    }
    var speed = Math.abs(fwd);
    var authority = nirTurn / (1 + speed / nirTurnFalloff);
    var rate = wheel * authority;
    next.angle += rate * step;
    /* The corner pushes the body sideways; grip eats it back, and grip is what
     * runs out first when the car is moving fast. */
    lat -= rate * fwd * step * nirSlide;
    var bite = Math.max(0.9, nirGrip - speed / 90);
    lat /= 1 + bite * step;
    if (lat > 260) {
      lat = 260;
    }
    if (lat < -260) {
      lat = -260;
    }
    cos = Math.cos(next.angle);
    sin = Math.sin(next.angle);
    next.vx = fwd * cos - lat * sin;
    next.vy = fwd * sin + lat * cos;
    next.x += next.vx * step;
    next.y += next.vy * step;
    next.fwd = fwd;
    next.lat = lat;
    next.boost = boosting ? Math.max(0, next.boost - step) : 0;
    return next;
  }

  function nirSegDistSq(p, a, b) {
    var bx = b.x - a.x;
    var by = b.y - a.y;
    var len = bx * bx + by * by;
    var k = len > 0 ? ((p.x - a.x) * bx + (p.y - a.y) * by) / len : 0;
    k = k < 0 ? 0 : k > 1 ? 1 : k;
    var dx = a.x + bx * k - p.x;
    var dy = a.y + by * k - p.y;
    return dx * dx + dy * dy;
  }

  /* Distance from a point to the corridor centre line: outside `width` is wall. */
  function nirWallGap(course, p) {
    var best = Infinity;
    for (var i = 0; i < course.points.length - 1; i += 1) {
      var d = nirSegDistSq(p, course.points[i], course.points[i + 1]);
      if (d < best) {
        best = d;
      }
    }
    return Math.sqrt(best);
  }

  function nirIntersect(p0, p1, p2, p3) {
    var s1x = p1.x - p0.x;
    var s1y = p1.y - p0.y;
    var s2x = p3.x - p2.x;
    var s2y = p3.y - p2.y;
    var den = s1x * s2y - s1y * s2x;
    if (!den) {
      return false;
    }
    var t = ((p2.x - p0.x) * s2y - (p2.y - p0.y) * s2x) / den;
    var u = ((p2.x - p0.x) * s1y - (p2.y - p0.y) * s1x) / den;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
  }

  /* Each interior waypoint is a gate stretched across the corridor; the pylons
   * are its ends, so the player can see the line they must cross next. */
  function nirGates(course) {
    var gates = [];
    for (var i = 1; i < course.points.length; i += 1) {
      var prev = course.points[i - 1];
      var here = course.points[i];
      var ahead = course.points[i + 1] || here;
      var dx = ahead.x - prev.x;
      var dy = ahead.y - prev.y;
      var len = Math.sqrt(dx * dx + dy * dy) || 1;
      var px = -dy / len;
      var py = dx / len;
      gates.push({
        index: i,
        center: { x: here.x, y: here.y },
        a: { x: here.x + px * course.width, y: here.y + py * course.width },
        b: { x: here.x - px * course.width, y: here.y - py * course.width },
      });
    }
    return gates;
  }

  function nirStart(course) {
    var a = course.points[0];
    var b = course.points[1];
    return {
      x: a.x,
      y: a.y,
      angle: Math.atan2(b.y - a.y, b.x - a.x),
      vx: 0,
      vy: 0,
      fwd: 0,
      lat: 0,
      boost: 0,
    };
  }

  /* Composes the stepper with the course rules so the frame loop and the par
   * measurement share one truth: returns the new car plus what happened. */
  function nirAdvance(course, gates, gateIndex, car, input, dt) {
    var from = { x: car.x, y: car.y };
    var next = nirStep(car, input, dt);
    var result = { car: next, gate: gateIndex, clipped: false, pad: false };
    var gap = nirWallGap(course, next);
    if (gap > course.width - 6) {
      /* Push back onto the tape once and charge the penalty only on the way in,
       * so grinding a wall costs 1.5s and not 1.5s every frame. */
      var anchor = nearestOnLine(course, next);
      var nx = next.x - anchor.x;
      var ny = next.y - anchor.y;
      var nl = Math.sqrt(nx * nx + ny * ny) || 1;
      var reach = course.width - 7;
      next.x = anchor.x + (nx / nl) * reach;
      next.y = anchor.y + (ny / nl) * reach;
      if (!car.scraping) {
        result.clipped = true;
        next.fwd *= 0.34;
        next.lat *= 0.2;
        next.vx = next.fwd * Math.cos(next.angle) - next.lat * Math.sin(next.angle);
        next.vy = next.fwd * Math.sin(next.angle) + next.lat * Math.cos(next.angle);
      }
      next.scraping = true;
      result.car = next;
    } else if (gap < course.width - 14 && car.scraping) {
      next.scraping = false;
      result.car = next;
    }
    if (gateIndex < gates.length) {
      var gate = gates[gateIndex];
      if (nirIntersect(from, { x: next.x, y: next.y }, gate.a, gate.b)) {
        result.gate = gateIndex + 1;
      }
    }
    for (var p = 0; p < course.pads.length; p += 1) {
      var pad = course.pads[p];
      var dx = next.x - pad.x;
      var dy = next.y - pad.y;
      if (dx * dx + dy * dy < nirPadRadius * nirPadRadius && next.boost <= 0) {
        next.boost = nirBoostTime;
        result.pad = true;
      }
    }
    return result;
  }

  function nearestOnLine(course, p) {
    var best = { x: course.points[0].x, y: course.points[0].y };
    var bestD = Infinity;
    for (var i = 0; i < course.points.length - 1; i += 1) {
      var a = course.points[i];
      var b = course.points[i + 1];
      var bx = b.x - a.x;
      var by = b.y - a.y;
      var len = bx * bx + by * by;
      var k = len > 0 ? ((p.x - a.x) * bx + (p.y - a.y) * by) / len : 0;
      k = k < 0 ? 0 : k > 1 ? 1 : k;
      var cx = a.x + bx * k;
      var cy = a.y + by * k;
      var d = (cx - p.x) * (cx - p.x) + (cy - p.y) * (cy - p.y);
      if (d < bestD) {
        bestD = d;
        best = { x: cx, y: cy };
      }
    }
    return best;
  }

  var nirShapeCache = {};

  function nirShape(course) {
    if (nirShapeCache[course.id]) {
      return nirShapeCache[course.id];
    }
    var cum = [0];
    var len = [];
    var total = 0;
    for (var i = 0; i < course.points.length - 1; i += 1) {
      var a = course.points[i];
      var b = course.points[i + 1];
      var l = Math.sqrt((b.x - a.x) * (b.x - a.x) + (b.y - a.y) * (b.y - a.y));
      len.push(l);
      total += l;
      cum.push(total);
    }
    var shape = { cum: cum, len: len, total: total };
    nirShapeCache[course.id] = shape;
    return shape;
  }

  /* Arc length along the centre line under the car: the driver thinks in
   * distance-to-go, not in waypoint indexes. */
  function nirLocate(shape, course, p) {
    var bestS = 0;
    var bestD = Infinity;
    for (var i = 0; i < shape.len.length; i += 1) {
      var a = course.points[i];
      var b = course.points[i + 1];
      var bx = b.x - a.x;
      var by = b.y - a.y;
      var k = ((p.x - a.x) * bx + (p.y - a.y) * by) / (bx * bx + by * by || 1);
      k = k < 0 ? 0 : k > 1 ? 1 : k;
      var cx = a.x + bx * k;
      var cy = a.y + by * k;
      var d = (cx - p.x) * (cx - p.x) + (cy - p.y) * (cy - p.y);
      if (d < bestD) {
        bestD = d;
        bestS = shape.cum[i] + k * shape.len[i];
      }
    }
    return bestS;
  }

  function nirPointAt(shape, course, s) {
    var want = s < 0 ? 0 : s > shape.total - 0.01 ? shape.total - 0.01 : s;
    for (var i = 0; i < shape.len.length; i += 1) {
      if (want <= shape.cum[i] + shape.len[i]) {
        var k = (want - shape.cum[i]) / (shape.len[i] || 1);
        var a = course.points[i];
        var b = course.points[i + 1];
        return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
      }
    }
    var last = course.points[course.points.length - 1];
    return { x: last.x, y: last.y };
  }

  /* Total heading change over the next span: how hard the road bends ahead. */
  function nirBend(shape, course, s, span) {
    var hops = 5;
    var bend = 0;
    var prevDir = null;
    for (var i = 0; i < hops; i += 1) {
      var a = nirPointAt(shape, course, s + (span * i) / hops);
      var b = nirPointAt(shape, course, s + (span * (i + 1)) / hops);
      var dx = b.x - a.x;
      var dy = b.y - a.y;
      if (dx * dx + dy * dy < 0.5) {
        continue;
      }
      var dir = Math.atan2(dy, dx);
      if (prevDir !== null) {
        var delta = dir - prevDir;
        while (delta > Math.PI) {
          delta -= Math.PI * 2;
        }
        while (delta < -Math.PI) {
          delta += Math.PI * 2;
        }
        bend += Math.abs(delta);
      }
      prevDir = dir;
    }
    return bend;
  }

  /* The scripted line: aim far enough down the road that the heading error is
   * small, and cap the speed by the bend measured over the next span. Only ever
   * calls the pure stepper, which is what makes the par a measurement. */
  function nirDriveLine(course, gates, gateIndex, car) {
    var shape = nirShape(course);
    var speed = nirSpeed(car);
    var s = nirLocate(shape, course, car);
    /* Keep the lookahead just beyond the next required gate. Cutting far across
     * a bend can skip that gate, leaving the reference car chasing a checkpoint
     * behind it and replacing a measured lap with an arbitrary fallback. */
    var aim = nirPointAt(shape, course, Math.min(s + 60 + speed * 0.5, shape.cum[gateIndex + 1] + 6));
    var want = Math.atan2(aim.y - car.y, aim.x - car.x);
    var diff = want - car.angle;
    while (diff > Math.PI) {
      diff -= Math.PI * 2;
    }
    while (diff < -Math.PI) {
      diff += Math.PI * 2;
    }
    var bend = nirBend(shape, course, s, 130);
    var target = nirTop / (1 + bend * 1.35);
    if (gateIndex >= gates.length - 1) {
      target = nirTop;
    }
    return {
      throttle: speed < target ? 1 : 0,
      brake: speed > target * 1.12 ? 1 : 0,
      steer: Math.max(-1, Math.min(1, diff * 3.2)),
    };
  }

  var nirParCache = {};

  function nirPar(course) {
    if (!course) {
      return null;
    }
    if (nirParCache[course.id]) {
      return nirParCache[course.id];
    }
    var gates = nirGates(course);
    var car = nirStart(course);
    var gateIndex = 0;
    var clock = 0;
    var steps = 0;
    var ceiling = 60 * 70;
    while (gateIndex < gates.length && steps < ceiling) {
      var input = nirDriveLine(course, gates, gateIndex, car);
      var step = nirAdvance(course, gates, gateIndex, car, input, 1 / 60);
      car = step.car;
      gateIndex = step.gate;
      clock += 1 / 60;
      if (step.clipped) {
        clock += nirClipPenalty;
      }
      steps += 1;
    }
    if (gateIndex < gates.length) {
      /* A line that cannot finish is a broken course, not a slow one: fall back
       * to the authored reference so no band is ever built on NaN. */
      nirParCache[course.id] = course.basePar;
      return course.basePar;
    }
    var measured = Math.round(clock * 10) / 10;
    nirParCache[course.id] = measured;
    return measured;
  }

  function nirBands(course) {
    var par = nirParOf(course);
    return [Math.round(par * 10) / 10, Math.round(par * 1.18 * 10) / 10, Math.round(par * 1.5 * 10) / 10];
  }

  /* Bands and limit both hang off the measurement, so a course that fails its
   * own scripted line falls back to the authored reference instead of shipping
   * a run nobody can finish. */
  function nirParOf(course) {
    var par = nirPar(course);
    return par > 0 ? par : course.basePar;
  }

  function nirLimit(course) {
    return Math.max(course.limit, Math.ceil(nirParOf(course) * 1.9));
  }

  function nirClock(seconds) {
    var safe = seconds > 0 ? seconds : 0;
    var whole = Math.floor(safe);
    var tenths = Math.floor((safe - whole) * 10);
    var mins = Math.floor(whole / 60);
    var secs = whole % 60;
    return (mins < 10 ? "0" : "") + mins + ":" + (secs < 10 ? "0" : "") + secs + "." + tenths;
  }

  App.driftStep = nirStep;
  App.driftPar = nirPar;
  App.driftGates = nirGates;
  App.driftAdvance = nirAdvance;
  App.driftWall = nirWallGap;
  App.driftClock = nirClock;
  App.driftCourses = nirCourses;

  function initNeonDriftGame(panelEl) {
    if (!panelEl) {
      return;
    }

    var campaign = createCampaign({ key: "neon-drift-campaign", levels: nirCourses });
    var start = campaign.indexOf(campaign.nextLevelId());
    var course = nirCourses[start < 0 ? 0 : start];
    var gates = nirGates(course);
    var car = nirStart(course);
    var band = nirBands(course);
    var limit = nirLimit(course);
    var gateIndex = 0;
    var clock = 0;
    var scraps = 0;
    var running = false;
    var over = false;
    var samples = [];
    var ghost = [];
    var ghostAt = 0;
    var keys = {};
    var pointer = { steer: 0, throttle: 0, down: false };
    var skids = [];
    var rafId = null;
    var lastFrame = 0;
    var paused = false;

    /* --- markup ---------------------------------------------------------- */
    var hud = document.createElement("div");
    hud.className = "game-hud";
    var clockEl = document.createElement("strong");
    var gateEl = document.createElement("strong");
    var scrapEl = document.createElement("strong");
    var parEl = document.createElement("strong");
    hud.appendChild(makeStat("nirClockLabel", clockEl));
    hud.appendChild(makeStat("nirGateLabel", gateEl));
    hud.appendChild(makeStat("nirScrapLabel", scrapEl));
    hud.appendChild(makeStat("nirParLabel", parEl));

    var canvas = document.createElement("canvas");
    canvas.className = "nir-canvas";
    canvas.width = nirW;
    canvas.height = nirH;
    canvas.setAttribute("tabindex", "0");
    canvas.setAttribute("role", "application");
    canvas.setAttribute("aria-label", t("nirFieldLabel"));

    var line = document.createElement("p");
    line.className = "nir-line";

    var result = document.createElement("p");
    result.className = "game-result";
    result.setAttribute("role", "status");

    var trackRow = document.createElement("div");
    trackRow.className = "elements-row";
    var trackLabel = document.createElement("label");
    trackLabel.className = "elements-label";
    trackLabel.setAttribute("for", "nirTrackSel");
    trackLabel.setAttribute("data-i18n", "nirTrackSelectLabel");
    trackLabel.textContent = t("nirTrackSelectLabel");
    var trackSel = document.createElement("select");
    trackSel.className = "elements-select";
    trackSel.id = "nirTrackSel";
    trackRow.appendChild(trackLabel);
    trackRow.appendChild(trackSel);

    var actions = document.createElement("div");
    actions.className = "game-actions";
    var resetBtn = document.createElement("button");
    resetBtn.type = "button";
    resetBtn.className = "primary";
    var resetLabel = document.createElement("span");
    resetLabel.setAttribute("data-i18n", "nirBtnReset");
    resetLabel.textContent = t("nirBtnReset");
    var resetContent = document.createElement("span");
    resetContent.className = "button-content";
    resetContent.appendChild(resetLabel);
    resetBtn.appendChild(resetContent);
    var bestEl = document.createElement("p");
    bestEl.className = "game-best";
    actions.appendChild(resetBtn);
    actions.appendChild(bestEl);

    var hint = document.createElement("p");
    hint.className = "game-hint";
    hint.setAttribute("data-i18n", "nirHint");
    hint.textContent = t("nirHint");

    [hud, canvas, line, result, trackRow, actions, hint].forEach(function (node) {
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

    var ctx = canvas.getContext("2d");

    function refreshPicker() {
      fillCampaignPicker(
        trackSel,
        campaign,
        function (def) {
          return t(def.labelKey);
        },
        t("elementsLocked"),
      );
      trackSel.value = course.id;
      var ds = campaign.best(course.id);
      bestEl.textContent = ds > 0 ? t("nirBestTime", { v: nirClock(ds / 10) }) : t("noBest");
    }

    function renderHud() {
      clockEl.textContent = nirClock(clock);
      gateEl.textContent = gateIndex + "/" + gates.length;
      scrapEl.textContent = String(scraps);
      parEl.textContent = nirClock(band[0]) + " / " + nirClock(limit);
    }

    function currentInput() {
      var left = keys.left || pointer.steer < -0.2;
      var right = keys.right || pointer.steer > 0.2;
      return {
        throttle: keys.up || pointer.throttle > 0 ? 1 : 0,
        brake: keys.down ? 1 : 0,
        steer: (right ? 1 : 0) + (left ? -1 : 0),
      };
    }

    function arm() {
      car = nirStart(course);
      gateIndex = 0;
      clock = 0;
      scraps = 0;
      samples = [];
      skids = [];
      running = false;
      over = false;
      ghostAt = 0;
      renderHud();
      line.textContent = t("nirArmed", { n: gates.length, p: nirClock(band[0]) });
      draw();
    }

    function loadCourse(def) {
      course = def;
      gates = nirGates(course);
      band = nirBands(course);
      limit = nirLimit(course);
      ghost = [];
      refreshPicker();
      arm();
      result.textContent = t("nirObjective", {
        name: t(course.labelKey),
        w: course.width,
        p: nirClock(band[0]),
        limit: nirClock(limit),
      });
    }

    function update(dt) {
      if (over) {
        return;
      }
      var input = currentInput();
      if (!running && (input.throttle || input.brake || input.steer)) {
        running = true;
      }
      if (!running) {
        return;
      }
      var step = nirAdvance(course, gates, gateIndex, car, input, dt);
      car = step.car;
      clock += dt;
      while (ghostAt + 1 < ghost.length && ghost[ghostAt + 1].t <= clock) {
        ghostAt += 1;
      }
      if (step.clipped) {
        scraps += 1;
        clock += nirClipPenalty;
        line.textContent = t("nirScraped", { n: scraps, s: nirClipPenalty });
      }
      if (step.pad) {
        line.textContent = t("nirPadded", { s: nirBoostTime });
      }
      if (step.gate !== gateIndex) {
        gateIndex = step.gate;
        line.textContent = t("nirGated", { n: gateIndex, total: gates.length });
      }
      if (!App.isMotionOff() && Math.abs(car.lat) > 55) {
        skids.push({ x: car.x, y: car.y, age: 0 });
        if (skids.length > 90) {
          skids.shift();
        }
      }
      samples.push({ x: car.x, y: car.y, angle: car.angle, t: clock });
      if (samples.length > 4200) {
        samples.shift();
      }
      if (gateIndex >= gates.length) {
        finish();
        return;
      }
      if (clock >= limit) {
        over = true;
        running = false;
        result.textContent = t("nirTimeout", { p: nirClock(limit), n: gateIndex, total: gates.length });
      }
    }

    function finish() {
      over = true;
      running = false;
      var decis = Math.round(clock * 10);
      var time = decis / 10;
      var starsWon = starsFor(time, band, "low");
      var outcome = campaign.record(course.id, { stars: starsWon, best: decis, better: "low" });
      if (outcome.isBest || !ghost.length) {
        ghost = samples.slice();
      }
      var message = t("nirFinished", { v: nirClock(time), s: starsWon, k: scraps });
      if (outcome.isBest) {
        message += " " + t("newBest");
      }
      if (outcome.unlockedNext) {
        message += " " + t("nirNextTrack");
      } else if (campaign.clearedCount() === nirCourses.length) {
        message += " " + t("nirAllClean");
      }
      result.textContent = message;
      line.textContent = ghost.length ? t("nirGhostSet") : t("nirGhostNone");
      logAction(t("logNeonDrift", { v: nirClock(time), k: scraps }));
      var rect = resetBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      refreshPicker();
    }

    /* --- drawing --------------------------------------------------------- */
    function drawTrack() {
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(course.points[0].x, course.points[0].y);
      for (var i = 1; i < course.points.length; i += 1) {
        ctx.lineTo(course.points[i].x, course.points[i].y);
      }
      ctx.strokeStyle = "#141d2e";
      ctx.lineWidth = course.width * 2;
      ctx.stroke();
      ctx.strokeStyle = "rgba(148, 163, 184, 0.35)";
      ctx.lineWidth = 2;
      ctx.setLineDash([9, 11]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    function drawPylons() {
      ctx.font = "bold 11px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (var i = 0; i < gates.length; i += 1) {
        var gate = gates[i];
        var done = i < gateIndex;
        var now = i === gateIndex;
        ctx.strokeStyle = done ? "rgba(75, 90, 114, 0.5)" : now ? "rgba(0, 242, 255, 0.9)" : "rgba(148, 163, 184, 0.55)";
        ctx.lineWidth = now ? 3 : 2;
        ctx.beginPath();
        ctx.moveTo(gate.a.x, gate.a.y);
        ctx.lineTo(gate.b.x, gate.b.y);
        ctx.stroke();
        /* Pylons plus the printed gate number: never colour alone. */
        ctx.fillStyle = done ? "#4b5a72" : now ? "#00f2ff" : "#94a3b8";
        ctx.beginPath();
        ctx.arc(gate.a.x, gate.a.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(gate.b.x, gate.b.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillText(String(gate.index), gate.center.x, gate.center.y - course.width - 8);
      }
    }

    function drawPads() {
      for (var i = 0; i < course.pads.length; i += 1) {
        var pad = course.pads[i];
        ctx.beginPath();
        ctx.arc(pad.x, pad.y, nirPadRadius, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255, 209, 102, 0.85)";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = "#ffd166";
        ctx.font = "bold 13px 'JetBrains Mono', monospace";
        ctx.fillText(">>", pad.x, pad.y);
      }
    }

    function drawCar(x, y, angle, alpha, tint) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillStyle = tint;
      ctx.fillRect(-11, -7, 22, 14);
      ctx.fillStyle = "rgba(7, 11, 20, 0.9)";
      ctx.fillRect(1, -5, 6, 10);
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    function draw() {
      ctx.clearRect(0, 0, nirW, nirH);
      ctx.fillStyle = "#080d17";
      ctx.fillRect(0, 0, nirW, nirH);
      drawTrack();
      drawPads();
      drawPylons();
      for (var s = 0; s < skids.length; s += 1) {
        var mark = skids[s];
        ctx.fillStyle = "rgba(148, 163, 184, " + (0.3 * (1 - mark.age)).toFixed(3) + ")";
        ctx.fillRect(mark.x - 2, mark.y - 2, 4, 4);
      }
      if (ghost.length > 1) {
        var at = Math.min(ghost.length - 1, ghostAt);
        var g = ghost[at];
        drawCar(g.x, g.y, g.angle, 0.35, "#94a3b8");
      }
      drawCar(car.x, car.y, car.angle, 1, car.boost > 0 ? "#ffd166" : "#00f2ff");
      /* Slip angle read-out so the loss of grip is a number, not a hue. */
      if (running) {
        ctx.font = "bold 10px 'JetBrains Mono', monospace";
        ctx.textAlign = "left";
        ctx.fillStyle = "#b9c1cc";
        ctx.fillText("SLIP " + Math.round(Math.abs(car.lat)), 10, 16);
        ctx.fillText(
          car.boost > 0 ? "BOOST " + car.boost.toFixed(1) : "SPD " + Math.round(nirSpeed(car)),
          10,
          nirH - 10,
        );
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
      for (var s = skids.length - 1; s >= 0; s -= 1) {
        skids[s].age += dt * 0.4;
        if (skids[s].age >= 1) {
          skids.splice(s, 1);
        }
      }
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

    /* --- input ----------------------------------------------------------- */
    canvas.addEventListener("keydown", function (event) {
      wake();
      var key = event.key;
      if (key === "ArrowUp" || key === "w" || key === "W") {
        keys.up = true;
        event.preventDefault();
      } else if (key === "ArrowDown" || key === "s" || key === "S") {
        keys.down = true;
        event.preventDefault();
      } else if (key === "ArrowLeft" || key === "a" || key === "A") {
        keys.left = true;
        event.preventDefault();
      } else if (key === "ArrowRight" || key === "d" || key === "D") {
        keys.right = true;
        event.preventDefault();
      } else if (key === "r" || key === "R") {
        event.preventDefault();
        arm();
      }
    });

    canvas.addEventListener("keyup", function (event) {
      var key = event.key;
      if (key === "ArrowUp" || key === "w" || key === "W") {
        keys.up = false;
      } else if (key === "ArrowDown" || key === "s" || key === "S") {
        keys.down = false;
      } else if (key === "ArrowLeft" || key === "a" || key === "A") {
        keys.left = false;
      } else if (key === "ArrowRight" || key === "d" || key === "D") {
        keys.right = false;
      }
    });

    function pointerFromEvent(event) {
      var rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        return;
      }
      var px = (event.clientX - rect.left) * (canvas.width / rect.width);
      var py = (event.clientY - rect.top) * (canvas.height / rect.height);
      /* Hold the lower half left or right to steer; the top strip is gas. */
      pointer.steer = px < canvas.width / 2 ? -1 : 1;
      pointer.throttle = py < canvas.height * 0.34 ? 1 : 0;
      if (py > canvas.height * 0.34 && px > canvas.width * 0.8) {
        pointer.throttle = 0;
      }
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
      pointer.steer = 0;
      pointer.throttle = 0;
    }

    canvas.addEventListener("pointerup", releasePointer);
    canvas.addEventListener("pointercancel", releasePointer);

    trackSel.addEventListener("change", function () {
      var index = campaign.indexOf(trackSel.value);
      if (index >= 0 && campaign.isUnlocked(trackSel.value)) {
        wake();
        loadCourse(nirCourses[index]);
      }
    });

    resetBtn.addEventListener("click", function () {
      wake();
      arm();
    });

    /* A pause is a pit stop: the loop halts, the car is put back on the grid,
     * the ghost and every star already banked stay untouched. */
    App.quietResetNeonDrift = function () {
      stopLoop();
      keys = {};
      releasePointer();
      skids = [];
      paused = true;
      running = false;
      if (!over) {
        car = nirStart(course);
        gateIndex = 0;
        clock = 0;
        samples = [];
        renderHud();
        draw();
        result.textContent = t("nirPaused");
      }
    };

    loadCourse(course);
    startLoop();
  }

  App.addStrings({
    en: {
      "tabNeonDrift": "Neon Drift",
      "nirZ1": "Hairpin Straight",
      "nirZ2": "Sweeper Arc",
      "nirZ3": "Boost Chicane",
      "nirZ4": "No-Margin Tunnel",
      "nirZ5": "The Night Ring",
      "nirClockLabel": "Clock",
      "nirGateLabel": "Gates",
      "nirScrapLabel": "Scrapes",
      "nirParLabel": "Par / Limit",
      "nirTrackSelectLabel": "Choose a course",
      "nirBtnReset": "Back To Grid",
      "nirBestTime": "Best lap {v}",
      "nirFieldLabel": "Top down course: up or W throttles, down brakes, left and right steer, R resets",
      "nirTrackLabel": "Course width {w}",
      "nirArmed": "Cross all {n} gates. Measured par {p}.",
      "nirObjective": "{name}: a {w}px corridor. Par {p}, time limit {limit}.",
      "nirGated": "Gate {n}/{total} cleared.",
      "nirScraped": "Wall contact {n} - plus {s}s and the speed is gone.",
      "nirPadded": "Boost pad - {s}s of extra shove.",
      "nirFinished": "Lap {v} with {k} scrapes - {s} stars.",
      "nirTimeout": "Limit hit at {p} after {n}/{total} gates.",
      "nirGhostSet": "Your clean lap is now the ghost.",
      "nirGhostNone": "No ghost yet - set a lap first.",
      "nirNextTrack": "Next course unlocked.",
      "nirAllClean": "Every course on the grid is beaten.",
      "nirPaused": "Back on the grid - the clock is cold again.",
      "nirHint": "Brake before the gate, not in it: steering authority drops as speed climbs.",
      "logNeonDrift": "Ran a {v} lap with {k} scrapes",
    },
    zh: {
      "tabNeonDrift": "霓虹漂移",
      "nirZ1": "发夹直道",
      "nirZ2": "大弧线",
      "nirZ3": "加速连续弯",
      "nirZ4": "无余量隧道",
      "nirZ5": "夜晚环路",
      "nirClockLabel": "计时",
      "nirGateLabel": "门",
      "nirScrapLabel": "撞墙",
      "nirParLabel": "标准 / 限时",
      "nirTrackSelectLabel": "选择赛道",
      "nirBtnReset": "回到发车格",
      "nirBestTime": "最快圈 {v}",
      "nirFieldLabel": "俯视赛道：上或 W 加油，下刹车，左右转向，R 重置",
      "nirTrackLabel": "赛道宽 {w}",
      "nirArmed": "依次穿过 {n} 个门。实测标准圈速 {p}。",
      "nirObjective": "{name}：走廊宽 {w} 像素。标准 {p}，限时 {limit}。",
      "nirGated": "已过第 {n}/{total} 个门。",
      "nirScraped": "第 {n} 次刮墙——罚 {s} 秒，速度也被抹掉。",
      "nirPadded": "吃到加速板——额外推 {s} 秒。",
      "nirFinished": "圈速 {v}，刮墙 {k} 次 - 获得 {s} 星。",
      "nirTimeout": "限时 {p} 用尽，只过了 {n}/{total} 个门。",
      "nirGhostSet": "你这一圈已录成全息对手。",
      "nirGhostNone": "还没有对手影像——先跑完一圈。",
      "nirNextTrack": "解锁下一条赛道。",
      "nirAllClean": "发车格上的赛道全部跑穿。",
      "nirPaused": "回到发车格，计时重新归零。",
      "nirHint": "刹车要在门前，不在门里：速度越快，转向权限越小。",
      "logNeonDrift": "跑出 {v} 的单圈，刮墙 {k} 次",
    },
  });

  App.registerGame({
    name: "neonDrift",
    tabKey: "tabNeonDrift",
    init: initNeonDriftGame,
    guide: {
      svg:
        '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="4" y="4" width="112" height="68" rx="5" fill="rgba(8,13,23,.92)" stroke="rgba(148,163,184,.45)"/>' +
        '<path d="M14 60h44l22-18V22" fill="none" stroke="#141d2e" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path d="M14 60h44l22-18V22" fill="none" stroke="rgba(148,163,184,.35)" stroke-width="1" stroke-dasharray="5 6"/>' +
        '<path d="M40 52v16M78 14v16" stroke="rgba(0,242,255,.8)" stroke-width="2"/>' +
        '<circle cx="40" cy="52" r="3" fill="#00f2ff"/><circle cx="40" cy="68" r="3" fill="#00f2ff"/>' +
        '<circle cx="78" cy="14" r="3" fill="#94a3b8"/><circle cx="78" cy="30" r="3" fill="#94a3b8"/>' +
        '<rect x="24" y="56" width="10" height="6" rx="2" fill="#00f2ff"/>' +
        '<text x="86" y="58" font-size="9" fill="#b9c1cc">3/7</text></svg>',
      en: [
        "Goal: cross every gate in order as fast as you can, then beat the ghost of your best lap.",
        "Action: up or W throttles, down brakes, left and right steer; R puts you back on the grid.",
        "Pointer alternative: hold the left or right half of the canvas to steer and the top strip for throttle.",
        "Rule: steering authority shrinks with speed and grip shrinks faster, so a fast corner slides wide instead of turning.",
        "Costs: a wall scrape adds 1.5s and kills your momentum, while a boost pad shoves you for 1.2s.",
        "Scoring: par is measured by driving a scripted line through the same physics, so the star bands are real laps, not guesses.",
      ],
      zh: [
        "目标：按顺序穿过每一个门，越快越好，然后赢过你自己最快圈的全息残影。",
        "操作：上或 W 加油，下刹车，左右转向；R 直接回到发车格。",
        "指针玩法：按住画面左半或右半转向，上半屏给油。",
        "规则：速度越快转向权限越小，而抓地力掉得更快，所以高速弯是推出去而不是拐进去。",
        "代价：刮墙罚 1.5 秒并清空动量，加速板则多推你 1.2 秒。",
        "计分：标准圈速是用一条编排好的走线跑同一套物理实测出来的，星级门槛来自真圈速，不是拍脑袋。",
      ],
    },
  });

  /* Exported for the other modules. */
  App.initNeonDriftGame = initNeonDriftGame;
})(window.CapitalConvert = window.CapitalConvert || {});
