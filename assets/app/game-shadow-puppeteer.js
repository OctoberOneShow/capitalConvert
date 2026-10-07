/* Shadow Puppeteer - the projection mini-game in the shared game drawer.
 * The player never touches the shadow: they move a lamp and a two-joint
 * puppet hinge, and the silhouette on the back wall is a consequence. Each
 * endpoint casts its shadow point by intersecting the ray lamp->point with
 * the wall line, so scale (lamp near the puppet) and shear (lamp off the
 * axis) fall out of the geometry instead of being faked. Registered through
 * the game registry, so it needs no markup in the four HTML pages. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  var t = App.t;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  var createCampaign = App.createCampaign;
  var fillCampaignPicker = App.fillCampaignPicker;
  var starsFor = App.starsFor;
  var shpW = 340;
  var shpH = 300;
  var shpWall = 300;
  var shpPass = 85;
  var shpPosStep = 5;
  var shpAngStep = 5;
  var shpMinDx = 2;
  var shpMaxT = 60;
  var shpMaxY = 1600;
  var shpLampMinX = 15;
  var shpLampMaxX = 260;
  var shpLampMinY = 15;
  var shpLampMaxY = 285;
  var shpRodMin = 120;
  var shpRodMax = 220;

  /* Poses: id, story beat, the rigid hinge (base height + two segment
   * lengths), the starting pose, one stored solution per beat, the ghost
   * target each stored solution projects to, and the star bands measured
   * from that stored solution's nudge count (see tools loop, never invented). */
  var shpPuzzles = [
    {
      id: "p1", labelKey: "shpP1", briefKey: "shpB1",
      baseY: 120, l1: 26, l2: 22,
      start: { lampX: 50, lampY: 110, ang1: 90, ang2: 90, baseX: 170 },
      solutions: [{ lampX: 85, lampY: 95, ang1: 90, ang2: 90, baseX: 170 }],
      targets: [{ baseY: 158, aY: 224, bY: 280, tol: 60 }],
      starNudges: [10, 14, 19],
    },
    {
      id: "p2", labelKey: "shpP2", briefKey: "shpB2",
      baseY: 110, l1: 50, l2: 40,
      start: { lampX: 60, lampY: 160, ang1: 85, ang2: -35, baseX: 150 },
      solutions: [{ lampX: 40, lampY: 120, ang1: 95, ang2: -55, baseX: 150 }],
      targets: [{ baseY: 96, aY: 218, bY: 134, tol: 60 }],
      starNudges: [18, 22, 27],
    },
    {
      id: "p3", labelKey: "shpP3", briefKey: "shpB3",
      baseY: 140, l1: 28, l2: 24,
      start: { lampX: 60, lampY: 160, ang1: 90, ang2: 75, baseX: 160 },
      solutions: [{ lampX: 95, lampY: 150, ang1: 90, ang2: 90, baseX: 160 }],
      targets: [{ baseY: 119, aY: 207, bY: 283, tol: 60 }],
      starNudges: [12, 16, 21],
    },
    {
      id: "p4", labelKey: "shpP4", briefKey: "shpB4",
      baseY: 105, l1: 45, l2: 45,
      start: { lampX: 60, lampY: 115, ang1: 80, ang2: 90, baseX: 150 },
      solutions: [{ lampX: 60, lampY: 85, ang1: 90, ang2: 50, baseX: 150 }],
      targets: [{ baseY: 138, aY: 258, bY: 286, tol: 60 }],
      starNudges: [16, 20, 25],
    },
    {
      id: "p5", labelKey: "shpP5", briefKey: "shpB5",
      baseY: 125, l1: 35, l2: 30, baseMovable: true,
      start: { lampX: 15, lampY: 150, ang1: 90, ang2: 80, baseX: 125 },
      solutions: [
        { lampX: 15, lampY: 150, ang1: 95, ang2: 40, baseX: 140 },
        { lampX: 15, lampY: 150, ang1: 115, ang2: -10, baseX: 185 },
      ],
      targets: [
        { baseY: 93, aY: 173, bY: 207, tol: 60 },
        { baseY: 108, aY: 162, bY: 152, tol: 60 },
      ],
      starNudges: [35, 39, 44],
    },
    {
      id: "p6", labelKey: "shpP6", briefKey: "shpB6",
      baseY: 135, l1: 42, l2: 26,
      start: { lampX: 50, lampY: 135, ang1: 95, ang2: -20, baseX: 165 },
      solutions: [{ lampX: 90, lampY: 130, ang1: 140, ang2: -95, baseX: 165 }],
      targets: [{ baseY: 144, aY: 287, bY: 162, tol: 22 }],
      starNudges: [33, 37, 42],
    },
    {
      id: "p7", labelKey: "shpP7", briefKey: "shpB7",
      baseY: 150, l1: 48, l2: 36,
      start: { lampX: 40, lampY: 95, ang1: 100, ang2: 25, baseX: 160 },
      solutions: [{ lampX: 90, lampY: 160, ang1: 80, ang2: -20, baseX: 160 }],
      targets: [{ baseY: 130, aY: 260, bY: 207, tol: 22 }],
      starNudges: [36, 40, 45],
    },
    {
      id: "p8", labelKey: "shpP8", briefKey: "shpB8",
      baseY: 150, l1: 48, l2: 36,
      start: { lampX: 45, lampY: 100, ang1: 100, ang2: 25, baseX: 160 },
      solutions: [{ lampX: 100, lampY: 170, ang1: 75, ang2: -25, baseX: 160 }],
      targets: [{ baseY: 103, aY: 243, bY: 191, tol: 26 }],
      starNudges: [40, 44, 49],
    },
    {
      id: "p9", labelKey: "shpP9", briefKey: "shpB9",
      baseY: 150, l1: 48, l2: 36,
      start: { lampX: 40, lampY: 95, ang1: 100, ang2: 25, baseX: 160 },
      solutions: [{ lampX: 100, lampY: 170, ang1: 70, ang2: -30, baseX: 160 }],
      targets: [{ baseY: 103, aY: 236, bY: 183, tol: 22 }],
      starNudges: [44, 48, 53],
    },
    {
      id: "p10", labelKey: "shpP10", briefKey: "shpB10",
      baseY: 150, l1: 48, l2: 36,
      start: { lampX: 50, lampY: 105, ang1: 100, ang2: 25, baseX: 160 },
      solutions: [{ lampX: 110, lampY: 180, ang1: 70, ang2: -30, baseX: 160 }],
      targets: [{ baseY: 66, aY: 223, bY: 174, tol: 26 }],
      starNudges: [44, 48, 53],
    },
    {
      id: "p11", labelKey: "shpP11", briefKey: "shpB11",
      baseY: 165, l1: 48, l2: 36,
      start: { lampX: 40, lampY: 95, ang1: 100, ang2: 25, baseX: 175 },
      solutions: [{ lampX: 125, lampY: 195, ang1: 60, ang2: -45, baseX: 175 }],
      targets: [{ baseY: 90, aY: 222, bY: 171, tol: 28 }],
      starNudges: [59, 63, 68],
    },
    {
      id: "p12", labelKey: "shpP12", briefKey: "shpB12",
      baseY: 165, l1: 48, l2: 36,
      start: { lampX: 40, lampY: 95, ang1: 100, ang2: 25, baseX: 175 },
      solutions: [{ lampX: 135, lampY: 205, ang1: 50, ang2: -55, baseX: 175 }],
      targets: [{ baseY: 40, aY: 197, bY: 146, tol: 28 }],
      starNudges: [67, 71, 76],
    },
  ];
  /* The free performance stage: no target, same geometry, same controls. */
  var shpFreePuppet = {
    id: "free", labelKey: "shpPFree", briefKey: "shpBFree",
    baseY: 130, l1: 40, l2: 34, baseMovable: true,
    start: { lampX: 90, lampY: 80, ang1: 90, ang2: 60, baseX: 160 },
    solutions: null, targets: null, starNudges: null,
  };

  /* --- pure geometry, exported so the dev loop can prove every puzzle --- */
  function shpClamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  function shpFinite(v, fallback) {
    var n = Number(v);
    return isFinite(n) ? n : fallback;
  }

  function shpDeg(deg) {
    var r = (deg * Math.PI) / 180;
    return { x: Math.cos(r), y: Math.sin(r) };
  }

  function shpSnapPos(v) {
    return Math.round(v / shpPosStep) * shpPosStep;
  }

  function shpSnapAng(v) {
    var a = Math.round(v / shpAngStep) * shpAngStep;
    while (a > 175) {
      a -= 360;
    }
    while (a < -175) {
      a += 360;
    }
    return a;
  }

  function shpAngle(from, to) {
    return shpSnapAng((Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI);
  }

  /* Hinge math: a fixed base through joint A out to the tip B. */
  function shpJoints(puzzle, pose) {
    var base = { x: shpFinite(pose.baseX, 160), y: shpFinite(puzzle.baseY, 120) };
    var u1 = shpDeg(shpFinite(pose.ang1, 90));
    var u2 = shpDeg(shpFinite(pose.ang2, 90));
    var a = { x: base.x + puzzle.l1 * u1.x, y: base.y + puzzle.l1 * u1.y };
    var b = { x: a.x + puzzle.l2 * u2.x, y: a.y + puzzle.l2 * u2.y };
    return { base: base, a: a, b: b };
  }

  /* The one honest projection: where the ray lamp->P meets the wall line.
   * A lamp sitting exactly on a point's vertical keeps a signed minimum dx;
   * t and y are then clamped so no division can ever print an un-renderable
   * number - the shadow just flies off past the strip. */
  function shpProjectPoint(lamp, p) {
    var dx = p.x - lamp.x;
    if (Math.abs(dx) < shpMinDx) {
      dx = dx < 0 ? -shpMinDx : shpMinDx;
    }
    var t = shpClamp(shpFinite((shpWall - lamp.x) / dx, shpMaxT), -shpMaxT, shpMaxT);
    var y = shpClamp(shpFinite(lamp.y + t * (p.y - lamp.y), 0), -shpMaxY, shpMaxY);
    return { x: shpWall, y: y };
  }

  /* App.shadowProject(lamp, joints): the three wall points (the two movable
   * joints and the base's) plus the derived segment lengths and shear angle.
   * len1/len2 are the shadow's two strokes; shear is how unevenly the wall
   * stretched them: atan((k1-k2)/(k1+k2)) with k = projected/true length. */
  function shpProject(lamp, joints) {
    var wallBase = shpProjectPoint(lamp, joints.base);
    var wallA = shpProjectPoint(lamp, joints.a);
    var wallB = shpProjectPoint(lamp, joints.b);
    var true1 = Math.max(shpLen(joints.base, joints.a), 1);
    var true2 = Math.max(shpLen(joints.a, joints.b), 1);
    var len1 = Math.abs(wallA.y - wallBase.y);
    var len2 = Math.abs(wallB.y - wallA.y);
    var k1 = len1 / true1;
    var k2 = len2 / true2;
    var shear = (Math.atan((k1 - k2) / Math.max(k1 + k2, 1e-4)) * 180) / Math.PI;
    return {
      base: wallBase, a: wallA, b: wallB,
      len1: len1, len2: len2, shear: shpFinite(shear, 0),
    };
  }

  function shpLen(p, q) {
    var dx = p.x - q.x;
    var dy = p.y - q.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /* App.shadowFit(target, projected): the very percentage the panel prints.
   * target = {baseY, aY, bY, tol} as stored on the puzzle. */
  function shpFit(target, projected) {
    if (!target || !projected) {
      return 0;
    }
    var err =
      (Math.abs(projected.base.y - target.baseY) +
        Math.abs(projected.a.y - target.aY) +
        Math.abs(projected.b.y - target.bY)) /
      3;
    return shpClamp(
      shpFinite(Math.round(100 * (1 - err / Math.max(target.tol, 1))), 0),
      0,
      100,
    );
  }

  /* App.shadowSolvable(puzzle): the stored solution must clear the bar on
   * every beat. A puzzle whose own solution fails must not ship. */
  function shpSolvable(puzzle) {
    if (!puzzle || !puzzle.solutions || !puzzle.targets) {
      return true;
    }
    for (var i = 0; i < puzzle.solutions.length; i += 1) {
      var sol = puzzle.solutions[i];
      var projected = shpProject(
        { x: sol.lampX, y: sol.lampY },
        shpJoints(puzzle, sol),
      );
      if (shpFit(puzzle.targets[i], projected) < shpPass) {
        return false;
      }
    }
    return true;
  }

  /* The star bands' anchor: one nudge = one grid step of one lever, which is
   * exactly what a key press or a snapped drag consumes. */
  function shpNudgeSpan(a, b) {
    return (
      (Math.abs(a.baseX - b.baseX) +
        Math.abs(a.lampX - b.lampX) +
        Math.abs(a.lampY - b.lampY)) /
        shpPosStep +
      (Math.abs(a.ang1 - b.ang1) + Math.abs(a.ang2 - b.ang2)) / shpAngStep
    );
  }

  function shpCopyPose(p) {
    return {
      lampX: p.lampX, lampY: p.lampY,
      ang1: p.ang1, ang2: p.ang2, baseX: p.baseX,
    };
  }

  App.shadowProject = shpProject;
  App.shadowFit = shpFit;
  App.shadowSolvable = shpSolvable;
  App.shadowJoints = shpJoints;
  App.shadowNudgeSpan = shpNudgeSpan;
  App.shadowPuzzles = shpPuzzles;
  App.shadowPassFit = shpPass;

  function initShadowPuppeteerGame(panelEl) {
    if (!panelEl) {
      return;
    }

    var campaign = createCampaign({ key: "shadow-puppeteer-campaign", levels: shpPuzzles });
    var puzzle = shpPuzzles[campaign.indexOf(campaign.nextLevelId())] || shpPuzzles[0];
    var pose = shpCopyPose(puzzle.start);
    var beat = 0;
    var nudges = 0;
    var done = false;
    var lever = 0;
    var dragging = false;
    var rafId = null;
    var lastFrame = 0;
    var pulseLeft = 0;

    /* --- markup: built with createElement so the headless harness sees it --- */
    function makeStat(key, valueEl, rowClass, capClass) {
      var stat = document.createElement("div");
      stat.className = rowClass ? "game-stat " + rowClass : "game-stat";
      var label = document.createElement("span");
      if (capClass) {
        label.className = capClass;
      }
      label.setAttribute("data-i18n", key);
      label.textContent = t(key);
      stat.appendChild(label);
      stat.appendChild(valueEl);
      return stat;
    }

    var hud = document.createElement("div");
    hud.className = "game-hud";
    var leverEl = document.createElement("strong");
    var nudgesEl = document.createElement("strong");
    var beatEl = document.createElement("strong");
    hud.appendChild(makeStat("shpLeverLabel", leverEl));
    hud.appendChild(makeStat("shpNudgesLabel", nudgesEl));
    hud.appendChild(makeStat("shpBeatLabel", beatEl));

    var canvas = document.createElement("canvas");
    canvas.className = "shp-canvas";
    canvas.width = shpW;
    canvas.height = shpH;
    canvas.setAttribute("tabindex", "0");
    canvas.setAttribute("role", "application");
    canvas.setAttribute("aria-label", t("shpFieldLabel"));

    /* Control-scheme row: pick a lever, then nudge it with the arrows.
     * Lamp and rod move in x/y; the arms rotate their segment angle. */
    var leversRow = document.createElement("div");
    leversRow.className = "shp-levers";
    var leverKeys = ["shpLvLamp", "shpLvArm", "shpLvForearm", "shpLvRod"];
    var leverBtns = [];
    leverKeys.forEach(function (key, index) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "shp-lever";
      btn.setAttribute("data-i18n", key);
      btn.textContent = t(key);
      btn.addEventListener("click", function () {
        pickLever(index);
      });
      leversRow.appendChild(btn);
      leverBtns.push(btn);
    });

    var readout = document.createElement("div");
    readout.className = "shp-readout";
    var fitEl = document.createElement("strong");
    fitEl.className = "shp-val shp-fit";
    var lenAEl = document.createElement("strong");
    var lenBEl = document.createElement("strong");
    var shearEl = document.createElement("strong");
    readout.appendChild(makeStat("shpFitLabel", fitEl, "shp-stat", "shp-cap"));
    readout.appendChild(makeStat("shpLenALabel", lenAEl, "shp-stat", "shp-cap"));
    readout.appendChild(makeStat("shpLenBLabel", lenBEl, "shp-stat", "shp-cap"));
    readout.appendChild(makeStat("shpShearLabel", shearEl, "shp-stat", "shp-cap"));
    [lenAEl, lenBEl, shearEl].forEach(function (el) {
      el.className = "shp-val";
    });

    var result = document.createElement("p");
    result.className = "game-result";
    result.setAttribute("role", "status");

    var poseRow = document.createElement("div");
    poseRow.className = "elements-row";
    var poseLabel = document.createElement("label");
    poseLabel.className = "elements-label";
    poseLabel.setAttribute("for", "shpPoseSel");
    poseLabel.setAttribute("data-i18n", "shpSelectLabel");
    poseLabel.textContent = t("shpSelectLabel");
    var poseSel = document.createElement("select");
    poseSel.className = "elements-select";
    poseSel.id = "shpPoseSel";
    poseRow.appendChild(poseLabel);
    poseRow.appendChild(poseSel);

    var actions = document.createElement("div");
    actions.className = "game-actions";
    var lockBtn = document.createElement("button");
    lockBtn.type = "button";
    lockBtn.className = "primary";
    var lockLabel = document.createElement("span");
    lockLabel.setAttribute("data-i18n", "shpBtnLock");
    lockLabel.textContent = t("shpBtnLock");
    var lockContent = document.createElement("span");
    lockContent.className = "button-content";
    lockContent.appendChild(lockLabel);
    lockBtn.appendChild(lockContent);
    var starsEl = document.createElement("p");
    starsEl.className = "game-best";
    actions.appendChild(lockBtn);
    actions.appendChild(starsEl);

    var hint = document.createElement("p");
    hint.className = "game-hint";
    hint.setAttribute("data-i18n", "shpHint");
    hint.textContent = t("shpHint");

    [hud, canvas, leversRow, readout, result, poseRow, actions, hint].forEach(function (node) {
      panelEl.appendChild(node);
    });

    var ctx = canvas.getContext("2d");

    /* --- state readers --------------------------------------------------- */
    function beats() {
      return puzzle.targets ? puzzle.targets.length : 1;
    }

    function isFree() {
      return !puzzle.targets;
    }

    function currentTarget() {
      return isFree() ? null : puzzle.targets[beat];
    }

    function currentProjected() {
      return shpProject(
        { x: pose.lampX, y: pose.lampY },
        shpJoints(puzzle, pose),
      );
    }

    function currentFit() {
      var target = currentTarget();
      return target ? shpFit(target, currentProjected()) : -1;
    }

    function leversFor() {
      return puzzle.baseMovable ? 4 : 3;
    }

    function shpNum(v, digits) {
      var n = shpFinite(v, 0);
      return n.toFixed(digits || 0);
    }

    /* --- text ------------------------------------------------------------- */
    function renderHud() {
      leverEl.textContent = t(leverKeys[lever]);
      leverBtns.forEach(function (btn, index) {
        if (btn.classList) {
          if (index === lever && !btn.hidden) {
            btn.classList.add("is-on");
          } else {
            btn.classList.remove("is-on");
          }
        }
      });
      nudgesEl.textContent = String(nudges);
      beatEl.textContent = String(beat + 1) + "/" + String(beats());
      var projected = currentProjected();
      var target = currentTarget();
      fitEl.textContent = target ? shpNum(shpFit(target, projected)) + "%" : t("shpNoTarget");
      if (fitEl.classList) {
        if (target && shpFit(target, projected) < shpPass) {
          fitEl.classList.add("is-low");
        } else {
          fitEl.classList.remove("is-low");
        }
      }
      lenAEl.textContent = shpNum(projected.len1, 1);
      lenBEl.textContent = shpNum(projected.len2, 1);
      shearEl.textContent = shpNum(projected.shear, 1) + "\u00b0";
    }

    function refreshPicker() {
      fillCampaignPicker(
        poseSel,
        campaign,
        function (def) {
          return t(def.labelKey);
        },
        t("elementsLocked"),
      );
      var freeOpt = document.createElement("option");
      freeOpt.value = shpFreePuppet.id;
      freeOpt.textContent = t(shpFreePuppet.labelKey);
      poseSel.appendChild(freeOpt);
      poseSel.value = puzzle.id;
      starsEl.textContent = t("campaignStars", {
        n: campaign.totalStars(),
        max: campaign.maxStars(),
      });
    }

    /* --- loading ----------------------------------------------------------- */
    function loadPuzzle(def) {
      puzzle = def;
      pose = shpCopyPose(def.start);
      beat = 0;
      nudges = 0;
      done = false;
      dragging = false;
      pulseLeft = 0;
      if (lever >= leversFor()) {
        lever = 0;
      }
      leverBtns[3].hidden = !def.baseMovable;
      result.textContent = isFree()
        ? t("shpFreePrompt")
        : t("shpPrompt", { name: t(def.labelKey), brief: t(def.briefKey) });
      renderHud();
      refreshPicker();
      draw();
    }

    /* --- moving levers -----------------------------------------------------
     * Every change is grid-snapped, so a stored solution is reachable with
     * exactly shpNudgeSpan(start, solution) key nudges - the star anchor. */
    function accountAndSet(next) {
      if (done) {
        return;
      }
      var spent = Math.round(
        (Math.abs(next.baseX - pose.baseX) +
          Math.abs(next.lampX - pose.lampX) +
          Math.abs(next.lampY - pose.lampY)) /
          shpPosStep +
          (Math.abs(shpAngleDelta(next.ang1, pose.ang1)) +
            Math.abs(shpAngleDelta(next.ang2, pose.ang2))) /
            shpAngStep,
      );
      if (!spent) {
        return;
      }
      pose = next;
      nudges += spent;
      renderHud();
      draw();
    }

    function shpAngleDelta(a, b) {
      var d = a - b;
      while (d > 180) {
        d -= 360;
      }
      while (d < -180) {
        d += 360;
      }
      return d;
    }

    function pickLever(index) {
      lever = index % leversFor();
      renderHud();
      draw();
    }

    function nudge(dirX, dirY) {
      var next = shpCopyPose(pose);
      if (lever === 0) {
        next.lampX = shpClamp(shpSnapPos(next.lampX + dirX * shpPosStep), shpLampMinX, shpLampMaxX);
        next.lampY = shpClamp(shpSnapPos(next.lampY + dirY * shpPosStep), shpLampMinY, shpLampMaxY);
      } else if (lever === 1) {
        next.ang1 = shpSnapAng(next.ang1 + dirX * shpAngStep);
      } else if (lever === 2) {
        next.ang2 = shpSnapAng(next.ang2 + dirX * shpAngStep);
      } else {
        next.baseX = shpClamp(shpSnapPos(next.baseX + dirX * shpPosStep), shpRodMin, shpRodMax);
      }
      accountAndSet(next);
    }

    function dragTo(spot) {
      var next = shpCopyPose(pose);
      var j = shpJoints(puzzle, pose);
      if (lever === 0) {
        next.lampX = shpClamp(shpSnapPos(spot.x), shpLampMinX, shpLampMaxX);
        next.lampY = shpClamp(shpSnapPos(spot.y), shpLampMinY, shpLampMaxY);
      } else if (lever === 1) {
        next.ang1 = shpAngle(j.base, spot);
      } else if (lever === 2) {
        next.ang2 = shpAngle(j.a, spot);
      } else {
        next.baseX = shpClamp(shpSnapPos(spot.x), shpRodMin, shpRodMax);
      }
      accountAndSet(next);
    }

    function nearestLever(spot) {
      var j = shpJoints(puzzle, pose);
      var points = [
        { i: 0, p: { x: pose.lampX, y: pose.lampY } },
        { i: 1, p: j.a },
        { i: 2, p: j.b },
      ];
      if (puzzle.baseMovable) {
        points.push({ i: 3, p: j.base });
      }
      var best = points[0];
      var bestD = 1e9;
      points.forEach(function (cand) {
        var d = shpLen(cand.p, spot);
        if (d < bestD) {
          best = cand;
          bestD = d;
        }
      });
      return best.i;
    }

    /* --- locking a pose ---------------------------------------------------- */
    function lockPose() {
      if (isFree()) {
        result.textContent = t("shpFreeLock");
        return;
      }
      var fitNow = currentFit();
      if (done) {
        result.textContent = t("shpHeld");
        return;
      }
      if (fitNow < shpPass) {
        result.textContent = t("shpTooLow", { n: shpNum(fitNow) });
        return;
      }
      pulseLeft = 1.5;
      startLoop();
      var last = beat + 1 >= beats();
      if (!last) {
        beat += 1;
        result.textContent = t("shpBeatHeld", { b: String(beat), n: shpNum(fitNow) });
      } else {
        done = true;
        var starsWon = starsFor(nudges, puzzle.starNudges, "low");
        var outcome = campaign.record(puzzle.id, {
          stars: starsWon,
          best: nudges,
          better: "low",
        });
        var message = t("shpCleared", { n: shpNum(fitNow), s: String(starsWon) });
        if (outcome.isBest) {
          message += " " + t("newBest");
        }
        if (outcome.unlockedNext) {
          message += " " + t("shpNextPose");
        } else if (campaign.clearedCount() === shpPuzzles.length) {
          message += " " + t("shpCampaignDone");
        }
        result.textContent = message;
        logAction(t("logShadowPuppeteer", { n: nudges }));
        var rect = lockBtn.getBoundingClientRect();
        createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
        petNotifyGame(outcome.isBest || outcome.firstClear);
      }
      renderHud();
      refreshPicker();
      draw();
    }

    function restartPose() {
      pose = shpCopyPose(puzzle.start);
      beat = 0;
      nudges = 0;
      done = false;
      dragging = false;
      result.textContent = isFree()
        ? t("shpFreePrompt")
        : t("shpResetMsg") + " " + t("shpPrompt", {
            name: t(puzzle.labelKey),
            brief: t(puzzle.briefKey),
          });
      renderHud();
      draw();
    }

    /* --- drawing -----------------------------------------------------------
     * Side view: lamp and puppet live left of the wall line; their shadow is
     * drawn ON the wall as the projected strokes, the ghost target beside it. */
    function draw() {
      ctx.clearRect(0, 0, shpW, shpH);
      ctx.fillStyle = "#0c1327";
      ctx.fillRect(0, 0, shpW, shpH);
      if (App.world) { App.world.backdrop(ctx, shpW, shpH, "stage"); }
      /* The wall strip. */
      ctx.fillStyle = "#d9c493";
      ctx.fillRect(288, 6, 44, shpH - 12);
      ctx.strokeStyle = "rgba(30, 41, 59, 0.55)";
      ctx.lineWidth = 1;
      ctx.strokeRect(288, 6, 44, shpH - 12);
      var j = shpJoints(puzzle, pose);
      var lamp = { x: pose.lampX, y: pose.lampY };
      var projected = shpProject(lamp, j);
      /* Rays: lamp through each endpoint out to the wall. */
      ctx.strokeStyle = "rgba(251, 191, 36, 0.28)";
      ctx.lineWidth = 1;
      [j.base, j.a, j.b].forEach(function (p, index) {
        var wall = [projected.base, projected.a, projected.b][index];
        ctx.beginPath();
        ctx.moveTo(lamp.x, lamp.y);
        ctx.lineTo(wall.x, shpClamp(wall.y, -60, shpH + 60));
        ctx.stroke();
      });
      /* Ghost target: dashed strokes + ticks beside the wall line. */
      var target = currentTarget();
      if (target) {
        ctx.setLineDash([4, 3]);
        ctx.strokeStyle = "#22d3ee";
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.moveTo(314, target.baseY);
        ctx.lineTo(314, target.aY);
        ctx.lineTo(314, target.bY);
        ctx.stroke();
        [target.baseY, target.aY, target.bY].forEach(function (y) {
          ctx.beginPath();
          ctx.moveTo(309, y);
          ctx.lineTo(319, y);
          ctx.stroke();
        });
        ctx.globalAlpha = 1;
        ctx.setLineDash([]);
      }
      /* The shadow itself: segments between the projected points. */
      var shadowHeld = done || pulseLeft > 0;
      ctx.strokeStyle = shadowHeld ? "#12233a" : "#101826";
      ctx.lineWidth = 7;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(shpWall, shpClamp(projected.base.y, -40, shpH + 40));
      ctx.lineTo(shpWall, shpClamp(projected.a.y, -40, shpH + 40));
      ctx.lineTo(shpWall, shpClamp(projected.b.y, -40, shpH + 40));
      ctx.stroke();
      ctx.lineCap = "butt";
      /* Beat pips for the two-beat story. */
      if (beats() > 1) {
        for (var pi = 0; pi < beats(); pi += 1) {
          ctx.beginPath();
          ctx.arc(296 + pi * 12, 14, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = pi < beat ? "#a3e635" : "rgba(30, 41, 59, 0.6)";
          ctx.fill();
        }
      }
      /* The rod the base hangs from. */
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(j.base.x, 8);
      ctx.lineTo(j.base.x, j.base.y);
      ctx.stroke();
      /* The puppet hinge itself. */
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(j.base.x, j.base.y);
      ctx.lineTo(j.a.x, j.a.y);
      ctx.lineTo(j.b.x, j.b.y);
      ctx.stroke();
      ctx.lineCap = "butt";
      /* Lamp with a glow. */
      if (ctx.createRadialGradient) {
        var glow = ctx.createRadialGradient(lamp.x, lamp.y, 2, lamp.x, lamp.y, 26);
        glow.addColorStop(0, "rgba(251, 191, 36, 0.7)");
        glow.addColorStop(1, "rgba(251, 191, 36, 0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(lamp.x, lamp.y, 26, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath();
      ctx.arc(lamp.x, lamp.y, 6, 0, Math.PI * 2);
      ctx.fill();
      /* Handles: L lamp, S rod, A joint, B tip; the picked one wears a ring. */
      var handles = [
        { i: 0, p: lamp, ch: "L" },
        { i: 1, p: j.a, ch: "A" },
        { i: 2, p: j.b, ch: "B" },
      ];
      if (puzzle.baseMovable) {
        handles.push({ i: 3, p: j.base, ch: "S" });
      }
      ctx.font = "bold 9px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      handles.forEach(function (h) {
        ctx.fillStyle = h.i === 0 ? "#fbbf24" : "#f8fafc";
        ctx.beginPath();
        ctx.arc(h.p.x, h.p.y, 3.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#cbd5e1";
        ctx.fillText(h.ch, h.p.x + 8, h.p.y - 8);
        if (h.i === lever) {
          ctx.beginPath();
          ctx.arc(h.p.x, h.p.y, 9, 0, Math.PI * 2);
          ctx.strokeStyle = "#00f2ff";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      });
      /* Lock pulse: a ring sweeping off the wall points. */
      if (pulseLeft > 0) {
        var grow = (1.5 - pulseLeft) / 1.5;
        ctx.globalAlpha = Math.max(0, 0.7 - grow * 0.7);
        ctx.strokeStyle = "#a3e635";
        ctx.lineWidth = 2;
        [projected.base.y, projected.a.y, projected.b.y].forEach(function (y) {
          ctx.beginPath();
          ctx.arc(shpWall, y, 6 + grow * 26, 0, Math.PI * 2);
          ctx.stroke();
        });
        ctx.globalAlpha = 1;
      }
    }

    /* --- the one frame loop: only the lock pulse animates, dt clamped ------ */
    function frame(now) {
      if (rafId === null) {
        return;
      }
      rafId = null;
      var dt = Math.min(0.032, ((now || lastFrame + 16) - lastFrame) / 1000 || 0.016);
      lastFrame = now || lastFrame;
      if (panelEl.hidden || document.hidden) {
        rafId = window.requestAnimationFrame(frame);
        return;
      }
      pulseLeft = Math.max(0, pulseLeft - dt);
      draw();
      renderHud();
      if (pulseLeft > 0) {
        rafId = window.requestAnimationFrame(frame);
      }
    }

    function startLoop() {
      if (rafId !== null) {
        return;
      }
      lastFrame = Date.now();
      rafId = window.requestAnimationFrame(frame);
    }

    function stopLoop() {
      if (rafId !== null && window.cancelAnimationFrame) {
        window.cancelAnimationFrame(rafId);
      }
      rafId = null;
    }

    /* --- input ------------------------------------------------------------- */
    function spotFromEvent(event) {
      var rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        return null;
      }
      var px = ((shpNum(event.clientX, 0) - rect.left) * shpW) / rect.width;
      var py = ((shpNum(event.clientY, 0) - rect.top) * shpH) / rect.height;
      return { x: px, y: py };
    }

    canvas.addEventListener("pointerdown", function (event) {
      var spot = spotFromEvent(event);
      if (!spot) {
        return;
      }
      if (event.preventDefault) {
        event.preventDefault();
      }
      if (done) {
        return;
      }
      lever = nearestLever(spot);
      dragging = true;
      if (canvas.setPointerCapture && event.pointerId !== undefined) {
        try {
          canvas.setPointerCapture(event.pointerId);
        } catch (error) {
          /* no capture this time; the canvas listeners still fire */
        }
      }
      dragTo(spot);
    });

    canvas.addEventListener("pointermove", function (event) {
      if (!dragging) {
        return;
      }
      var spot = spotFromEvent(event);
      if (spot) {
        dragTo(spot);
      }
    });

    canvas.addEventListener("pointerup", function () {
      dragging = false;
    });

    canvas.addEventListener("pointercancel", function () {
      dragging = false;
    });

    canvas.addEventListener("keydown", function (event) {
      var key = event.key;
      if (key === "ArrowLeft") {
        event.preventDefault();
        nudge(-1, 0);
      } else if (key === "ArrowRight") {
        event.preventDefault();
        nudge(1, 0);
      } else if (key === "ArrowUp") {
        event.preventDefault();
        nudge(0, -1);
      } else if (key === "ArrowDown") {
        event.preventDefault();
        nudge(0, 1);
      } else if (key === "z" || key === "Z") {
        event.preventDefault();
        lever = (lever + leversFor() - 1) % leversFor();
        pickLever(lever);
      } else if (key === "x" || key === "X") {
        event.preventDefault();
        pickLever(lever + 1);
      } else if (key === "u" || key === "U") {
        event.preventDefault();
        restartPose();
      } else if (key === "Escape") {
        dragging = false;
        pulseLeft = 0;
        stopLoop();
      } else if (key === " " || key === "Enter") {
        event.preventDefault();
        lockPose();
      }
    });

    lockBtn.addEventListener("click", function () {
      lockPose();
    });

    poseSel.addEventListener("change", function () {
      if (poseSel.value === shpFreePuppet.id) {
        loadPuzzle(shpFreePuppet);
        return;
      }
      var index = campaign.indexOf(poseSel.value);
      if (index >= 0 && campaign.isUnlocked(poseSel.value)) {
        loadPuzzle(shpPuzzles[index]);
      } else {
        poseSel.value = puzzle.id;
      }
    });

    /* Shell pause: the pulse stops, the arrangement stays exactly as posed. */
    App.quietResetShadowPuppeteer = function () {
      dragging = false;
      pulseLeft = 0;
      stopLoop();
    };

    loadPuzzle(shpPuzzles[campaign.indexOf(campaign.nextLevelId())] || shpPuzzles[0]);
  }

  /* Bilingual copy travels with the game: addStrings only fills keys i18n.js
   * does not already own, so the shared dictionary stays authoritative. */
  App.addStrings({
    en: {
      "tabShadowPuppeteer": "Shadow Puppeteer",
      "shpP1": "The straight bow",
      "shpP2": "The heron lifts its head",
      "shpP3": "The boat leans in the wind",
      "shpP4": "The camel kneels",
      "shpP5": "King and hound",
      "shpP6": "The dragon curls",
      "shpP7": "The stag rears",
      "shpP8": "The crane stoops",
      "shpP9": "The wolf howls",
      "shpP10": "The fox listens",
      "shpP11": "The knight bows",
      "shpP12": "The final curtain",
      "shpPFree": "Free performance",
      "shpB1": "one long, even shadow",
      "shpB2": "the head folds back up",
      "shpB3": "a low bar longer than the puppet",
      "shpB4": "one segment stretched, one crushed",
      "shpB5": "two beats - the rod moves too",
      "shpB6": "every lever at once",
      "shpB7": "antlers thrown high and back",
      "shpB8": "the long neck dives to the water",
      "shpB9": "muzzle up, body held low",
      "shpB10": "ears pricked, listening at the wall",
      "shpB11": "a deep bow as the curtain falls",
      "shpB12": "one long silhouette closes the play",
      "shpBFree": "no ghost, just rays",
      "shpLeverLabel": "Lever",
      "shpNudgesLabel": "Nudges",
      "shpBeatLabel": "Beat",
      "shpLvLamp": "Lamp",
      "shpLvArm": "Upper arm",
      "shpLvForearm": "Forearm",
      "shpLvRod": "Rod",
      "shpFitLabel": "Fit",
      "shpLenALabel": "Shadow A",
      "shpLenBLabel": "Shadow B",
      "shpShearLabel": "Shear",
      "shpNoTarget": "free",
      "shpBtnLock": "Lock Pose",
      "shpSelectLabel": "Choose a pose",
      "shpPrompt": "{name}: {brief}. Cover the dashed ghost on the wall.",
      "shpFreePrompt": "Free stage: no ghost, no stars. Move the lamp and the joints and watch the rays.",
      "shpTooLow": "The wall says {n}% - keep nudging.",
      "shpBeatHeld": "Beat {b} held at {n}%. Now throw the next story beat.",
      "shpHeld": "The pose is already on the wall. Press U to try again.",
      "shpCleared": "Pose holds at {n}% - {s} stars.",
      "shpNextPose": "Next pose unlocked.",
      "shpCampaignDone": "The whole play is staged.",
      "shpFreeLock": "Nothing to lock on the free stage - the wall keeps whatever you pose.",
      "shpResetMsg": "Back to the starting pose; the nudge counter is clear.",
      "shpFieldLabel": "Shadow wall: lamp, puppet and its projected silhouette",
      "shpHint": "A bigger shadow means the lamp moves toward the puppet - limbs never grow. A leaning shadow means the lamp moves off-axis, not the joint.",
      "logShadowPuppeteer": "Held a shadow pose in {n} nudges",
    },
    zh: {
      "tabShadowPuppeteer": "皮影戏",
      "shpP1": "长弓直影",
      "shpP2": "苍鹭抬头",
      "shpP3": "风中倾船",
      "shpP4": "骆驼跪影",
      "shpP5": "王与猎犬",
      "shpP6": "游龙盘影",
      "shpP7": "惊鹿昂首",
      "shpP8": "白鹤俯身",
      "shpP9": "孤狼啸月",
      "shpP10": "狐立听风",
      "shpP11": "骑士谢幕",
      "shpP12": "终幕定场",
      "shpPFree": "自由演出",
      "shpB1": "一道匀长的影子",
      "shpB2": "头颅折回上方",
      "shpB3": "比木偶还长的低横影",
      "shpB4": "一段拉长、一段压扁",
      "shpB5": "两个节拍 - 连支杆也要动",
      "shpB6": "四根杆臂一起用",
      "shpB7": "鹿角向高处扬起",
      "shpB8": "长颈俯向水面",
      "shpB9": "口鼻朝天，身姿低伏",
      "shpB10": "竖耳肃立，静听墙影",
      "shpB11": "垂幕前的一折深躬",
      "shpB12": "一道长影，为全剧收官",
      "shpBFree": "没有目标，只有光线",
      "shpLeverLabel": "操作杆",
      "shpNudgesLabel": "挪动",
      "shpBeatLabel": "节拍",
      "shpLvLamp": "灯",
      "shpLvArm": "上臂",
      "shpLvForearm": "前臂",
      "shpLvRod": "支杆",
      "shpFitLabel": "贴合",
      "shpLenALabel": "影段甲",
      "shpLenBLabel": "影段乙",
      "shpShearLabel": "错切角",
      "shpNoTarget": "自由",
      "shpBtnLock": "定格造型",
      "shpSelectLabel": "选择造型",
      "shpPrompt": "{name}：{brief}。让影子盖住墙上虚线的幽灵造型。",
      "shpFreePrompt": "自由舞台：没有幽灵，也没有星。移动灯和关节，看光线如何作画。",
      "shpTooLow": "墙上的贴合度只有 {n}% - 继续微调。",
      "shpBeatHeld": "第 {b} 拍以 {n}% 定住。现在摆出下一拍。",
      "shpHeld": "造型已经定格在墙上。按 U 重新开始。",
      "shpCleared": "造型以 {n}% 定格 - 获得 {s} 星。",
      "shpNextPose": "解锁下一造型。",
      "shpCampaignDone": "整出戏已全部上演。",
      "shpFreeLock": "自由舞台没有可定格的造型 - 墙永远保留你摆出的样子。",
      "shpResetMsg": "已回到起始造型，挪动次数清零。",
      "shpFieldLabel": "皮影墙：灯、木偶与它的投影",
      "shpHint": "影子要变大，得把灯移近木偶 - 肢体从不变长；影子要倾斜，得把灯移离轴线，而不是掰关节。",
      "logShadowPuppeteer": "用 {n} 次挪动定格了一个皮影造型",
    },
  });

  App.registerGame({
    name: "shadowPuppeteer",
    tabKey: "tabShadowPuppeteer",
    init: initShadowPuppeteerGame,
    guide: {
      svg:
        '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="6" y="6" width="108" height="64" rx="5" fill="rgba(12,19,39,.9)" stroke="rgba(148,163,184,.45)"/>' +
        '<rect x="88" y="10" width="20" height="56" fill="rgba(217,196,147,.5)"/>' +
        '<path d="M98 14v48" stroke="#101826" stroke-width="5" stroke-linecap="round"/>' +
        '<path d="M106 18v30M106 48v10" stroke="#22d3ee" stroke-width="1.6" stroke-dasharray="3 2"/>' +
        '<circle cx="24" cy="40" r="5" fill="#fbbf24"/>' +
        '<path d="M24 40 58 24M24 40 70 44M24 40 92 20M24 40 96 52" stroke="rgba(251,191,36,.35)" stroke-width="1"/>' +
        '<path d="M58 24 62 8M58 24 70 44" stroke="#e2e8f0" stroke-width="2.4" stroke-linecap="round"/>' +
        '<circle cx="58" cy="24" r="2.6" fill="#f8fafc"/>' +
        '<circle cx="70" cy="44" r="2.6" fill="#f8fafc"/>' +
        '<text x="12" y="16" font-size="7" fill="#94a3b8">L? A? B?</text></svg>',
      en: [
        "Aim: the wall carries a dashed ghost pose - make the solid shadow cover it, then press Lock Pose.",
        "You never touch the shadow: pick a lever (Lamp, Upper arm, Forearm, sometimes the Rod) with the buttons or Z/X, then drag its handle or nudge with the arrows.",
        "Scale is honest geometry: the lamp close to the puppet throws a bigger shadow - no limb ever grows, and the two Shadow A/B digits show the result.",
        "Shear is honest geometry too: an off-axis lamp stretches one projected segment and crushes the other - move the lamp, not the joint, when the Shear digit is wrong.",
        "The fit percentage plus the length and shear digits tell you how close you are; colour alone never carries the news. U starts the pose over.",
        "Scoring: the stars count the nudges used to reach the locked pose, anchored on the solution's own measured path; clearing a pose unlocks the next.",
      ],
      zh: [
        "目标：墙上有一条虚线幽灵造型 - 让实心影子盖住它，再按定格造型。",
        "你从不能直接碰影子：用按钮或 Z/X 选一根操作杆（灯、上臂、前臂，有时还有支杆），拖它的把手或用方向键微调。",
        "缩放是诚实的几何：灯离木偶越近影子越大 - 肢体永远不会变长，影段甲/乙的数字会说话。",
        "错切也是诚实的几何：灯一偏离轴线，两段投影就会被拉一压 - 错切角不对时移动灯，而不是掰关节。",
        "贴合百分比加上两段长度和错切角的数字告诉你有多接近；消息从不只靠颜色传达。按 U 重新开始这一造型。",
        "计分：星级看你定格造型用了几次挪动，锚定在解法自身实测的步数上；完成一个造型就解锁下一个。",
      ],
    },
  });

  /* Exported for the other modules. */
  App.initShadowPuppeteerGame = initShadowPuppeteerGame;
})(window.CapitalConvert = window.CapitalConvert || {});
