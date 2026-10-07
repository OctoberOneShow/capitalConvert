/* Traffic Jam - The slide-the-grid escape puzzle in the shared game drawer. */
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
  var trafSize = 6;
  var trafTaxiRow = 2;
  /* The two durations the lot is choreographed to. They are duplicated in
   * game-traffic.css as --traf-slide / --traf-bump, because a slide is a CSS
   * transition and only its *consequences* are JS beats. */
  var trafSlideMs = 180;
  var trafBumpMs = 340;
  /* Each board: cars as [x, y, length, horizontal(1)/vertical(0)].
   * The taxi is always car 0 and escapes through the right wall on
   * its row. Every board is checked by trafficSolvable below. */
  var trafLevels = [
{ id: "j1", par: [7,11,16], cars: [[0, 2, 2, 1], [0, 3, 2, 0], [3, 1, 2, 0]] },
    { id: "j2", par: [10,14,19], cars: [[0, 2, 2, 1], [5, 0, 3, 0], [2, 1, 3, 0]] },
    { id: "j3", par: [9,13,18], cars: [[0, 2, 2, 1], [3, 4, 2, 0], [2, 1, 3, 0], [5, 1, 2, 0]] },
    { id: "j4", par: [8,12,17], cars: [[1, 2, 2, 1], [5, 1, 3, 0], [3, 2, 2, 0], [4, 2, 2, 0]] },
    { id: "j5", par: [9,13,18], cars: [[1, 2, 2, 1], [0, 2, 3, 0], [1, 5, 2, 1], [3, 0, 3, 0], [5, 1, 3, 0]] },
    { id: "j6", par: [10,14,19], cars: [[0, 2, 2, 1], [3, 1, 3, 1], [1, 3, 2, 1], [1, 0, 2, 0], [2, 0, 3, 0]] },
    { id: "j7", par: [11,15,20], cars: [[0, 2, 2, 1], [2, 1, 2, 0], [4, 3, 2, 0], [3, 2, 2, 0], [5, 0, 3, 0]] },
    { id: "j8", par: [11,15,20], cars: [[1, 2, 2, 1], [2, 3, 2, 1], [1, 0, 2, 1], [0, 1, 2, 0], [3, 1, 2, 0], [5, 1, 2, 0]] },
    { id: "j9", par: [12,16,21], cars: [[1, 2, 2, 1], [0, 0, 3, 1], [5, 0, 3, 0], [3, 1, 3, 0], [0, 2, 2, 0], [4, 0, 3, 0]] },
    { id: "j10", par: [12,16,21], cars: [[0, 2, 2, 1], [3, 0, 3, 0], [2, 5, 2, 1], [1, 3, 2, 0], [2, 1, 2, 0], [1, 0, 2, 0]] },
    { id: "j11", par: [13,17,22], cars: [[0, 2, 2, 1], [5, 2, 2, 0], [3, 0, 3, 0], [2, 5, 2, 1], [4, 0, 2, 1], [2, 1, 2, 0]] },
    { id: "j12", par: [13,17,22], cars: [[0, 2, 2, 1], [0, 4, 2, 1], [1, 0, 2, 0], [2, 4, 2, 1], [3, 0, 3, 0], [0, 3, 2, 1], [2, 0, 3, 0]] },
    { id: "j13", par: [13,17,22], cars: [[1, 2, 2, 1], [0, 5, 3, 1], [0, 1, 2, 0], [5, 0, 3, 0], [3, 0, 3, 0], [0, 3, 2, 1], [4, 0, 3, 0]] },
    { id: "j14", par: [13,17,22], cars: [[1, 2, 2, 1], [2, 0, 2, 0], [4, 2, 2, 0], [3, 1, 2, 0], [5, 1, 2, 0], [2, 3, 2, 1], [0, 0, 2, 0]] },
    { id: "j15", par: [15,19,24], cars: [[0, 2, 2, 1], [1, 5, 2, 1], [2, 1, 3, 0], [1, 4, 2, 1], [3, 1, 3, 0], [0, 4, 2, 0], [4, 1, 2, 1]] },
    { id: "j16", par: [15,19,24], cars: [[0, 2, 2, 1], [3, 1, 2, 0], [2, 4, 2, 1], [0, 4, 2, 1], [4, 1, 2, 1], [2, 0, 3, 0], [1, 3, 2, 1], [3, 0, 2, 1]] },
    { id: "j17", par: [11, 15, 20], cars: [[0, 2, 2, 1], [2, 1, 2, 0], [5, 1, 3, 0], [4, 1, 2, 0], [1, 0, 2, 1]] },
    { id: "j18", par: [11, 15, 20], cars: [[0, 2, 2, 1], [3, 5, 2, 1], [3, 0, 3, 0], [4, 0, 2, 1], [0, 4, 2, 0], [2, 1, 2, 0], [4, 3, 2, 0]] },
    { id: "j19", par: [12, 16, 21], cars: [[0, 2, 2, 1], [2, 0, 2, 0], [4, 1, 3, 0], [3, 0, 3, 0], [5, 1, 3, 0]] },
    { id: "j20", par: [12, 16, 21], cars: [[0, 2, 2, 1], [2, 0, 3, 0], [1, 5, 3, 1], [0, 0, 2, 1], [0, 3, 2, 1], [5, 3, 2, 0], [4, 1, 2, 0]] },
    { id: "j21", par: [13, 17, 22], cars: [[0, 2, 2, 1], [0, 3, 3, 1], [2, 0, 3, 0], [4, 2, 2, 0], [3, 0, 2, 0]] },
    { id: "j22", par: [13, 17, 22], cars: [[0, 2, 2, 1], [3, 0, 3, 1], [1, 5, 2, 1], [2, 0, 3, 0], [3, 1, 3, 0]] },
    { id: "j23", par: [14, 18, 23], cars: [[0, 2, 2, 1], [3, 0, 3, 0], [2, 0, 3, 0], [5, 3, 2, 0], [4, 0, 3, 0]] },
    { id: "j24", par: [14, 18, 23], cars: [[0, 2, 2, 1], [2, 0, 3, 0], [1, 5, 3, 1], [1, 3, 3, 1], [1, 4, 3, 1], [3, 0, 2, 0]] },
  ];

  function trafGrid(cars) {
    var grid = [];
    for (var i = 0; i < trafSize * trafSize; i += 1) {
      grid.push(-1);
    }
    cars.forEach(function (car, index) {
      for (var step = 0; step < car[2]; step += 1) {
        var x = car[0] + (car[3] ? step : 0);
        var y = car[1] + (car[3] ? 0 : step);
        grid[x + y * trafSize] = index;
      }
    });
    return grid;
  }

  function trafSlide(cars, index, dx, dy) {
    /* How far a car may legally slide along its axis. */
    var car = cars[index];
    var horiz = car[3] === 1;
    var dir = horiz ? dx : dy;
    if (dir === 0) {
      return 0;
    }
    var grid = trafGrid(cars);
    var steps = 0;
    var moving = [];
    for (var s = 0; s < car[2]; s += 1) {
      moving.push([car[0] + (horiz ? s : 0), car[1] + (horiz ? 0 : s)]);
    }
    for (var step = 1; step <= (horiz ? trafSize : trafSize); step += 1) {
      var blocked = false;
      var next = moving.map(function (cell) {
        var x = cell[0] + (horiz ? dir : 0);
        var y = cell[1] + (horiz ? 0 : dir);
        if (x < 0 || x >= trafSize || y < 0 || y >= trafSize) {
          blocked = true;
        } else if (grid[x + y * trafSize] !== -1 && grid[x + y * trafSize] !== index) {
          blocked = true;
        }
        return [x, y];
      });
      if (blocked) {
        break;
      }
      steps += 1;
      moving = next;
    }
    return dir > 0 ? steps : -steps;
  }

  function trafExitOpen(cars) {
    var taxi = cars[0];
    var grid = trafGrid(cars);
    for (var x = taxi[0] + taxi[2]; x < trafSize; x += 1) {
      if (grid[x + taxi[1] * trafSize] !== -1) {
        return false;
      }
    }
    return true;
  }

  /* An open lane is not an escape: the taxi has to reach the exit wall. */
  function trafTaxiOut(cars) {
    var taxi = cars[0];
    return taxi[0] + taxi[2] >= trafSize && trafExitOpen(cars);
  }

  function trafKey(cars) {
    return cars
      .map(function (car) {
        return car[0] + "," + car[1];
      })
      .join(";");
  }

  /* Breadth-first over slide-one states. Ships with the game so the
   * acceptance checks can prove every board solvable before it ships. */
  function trafficSolvable(level, cap) {
    var limit = cap || 120000;
    var start = level.cars.map(function (car) {
      return car.slice();
    });
    if (trafTaxiOut(start)) {
      return true;
    }
    var queue = [start];
    var seen = {};
    seen[trafKey(start)] = true;
    var visits = 0;
    while (queue.length && visits < limit) {
      var cars = queue.shift();
      visits += 1;
      for (var index = 0; index < cars.length; index += 1) {
        var horiz = cars[index][3] === 1;
        var axes = horiz ? [[-1, 0], [1, 0]] : [[0, -1], [0, 1]];
        for (var a = 0; a < axes.length; a += 1) {
          var reach = trafSlide(cars, index, axes[a][0], axes[a][1]);
          var unit = axes[a][0] !== 0 ? axes[a][0] : axes[a][1];
          for (var step = 1; step <= Math.abs(reach); step += 1) {
            var next = cars.map(function (car) {
              return car.slice();
            });
            next[index][0] += (horiz ? unit * step : 0);
            next[index][1] += (horiz ? 0 : unit * step);
            if (index === 0 && trafTaxiOut(next)) {
              return true;
            }
            var key = trafKey(next);
            if (!seen[key]) {
              seen[key] = true;
              queue.push(next);
            }
          }
        }
      }
    }
    return false;
  }

  /* Which car took the hit when a slide stopped? -1 means the wall did. The lot
   * uses it to mark the car that is in the way, not just the one that pushed. */
  function trafBlocker(cars, index, dir) {
    var car = cars[index];
    var horiz = car[3] === 1;
    var grid = trafGrid(cars);
    var x = car[0] + (horiz ? (dir > 0 ? car[2] : -1) : 0);
    var y = car[1] + (horiz ? 0 : dir > 0 ? car[2] : -1);
    if (x < 0 || x >= trafSize || y < 0 || y >= trafSize) {
      return -1;
    }
    return grid[x + y * trafSize];
  }

  /* --------------------------------------------------------------------- art
   * The lot is drawn, not styled: one SVG road layer under the vehicles (bays,
   * dashed lane centres, the escape lane and the gate) and every car built as a
   * top-down vehicle - tyres under the sills, painted body, glazed cabin, head and
   * tail lamps. createElementNS keeps the harness able to see the art, and the
   * markings are painted with currentColor so the sheet can re-ink them per
   * theme without a second recipe. */
  var trafSvgNS = "http://www.w3.org/2000/svg";
  var trafUid = 0;
  var trafTyre = "#121722";
  var trafInk = "#0a0e15";
  /* Paint rides the car index so a vehicle keeps its identity through a slide.
   * Index 0 is always the taxi and always amber. */
  var trafPaints = [
    "#fbbf24",
    "#22d3ee",
    "#f472b6",
    "#a3e635",
    "#a78bfa",
    "#67e8f9",
    "#fda4af",
    "#86efac",
    "#c4b5fd",
    "#fcd34d",
    "#5eead4",
  ];

  function trafNode(tag, attrs) {
    var node = document.createElementNS(trafSvgNS, tag);
    if (attrs) {
      for (var key in attrs) {
        if (
          Object.prototype.hasOwnProperty.call(attrs, key) &&
          attrs[key] !== null &&
          attrs[key] !== undefined
        ) {
          node.setAttribute(key, String(attrs[key]));
        }
      }
    }
    return node;
  }

  /* One tint, three depths: mixing toward white gives the lit roof and the pale
   * cargo shell, toward black the trim and the cast shadow, so a single paint
   * string still produces a body with a light source on it. */
  function trafShade(hex, amt) {
    var n = parseInt(hex.slice(1), 16);
    var target = amt > 0 ? 255 : 0;
    var k = Math.abs(amt);
    function mix(channel) {
      return Math.round(channel + (target - channel) * k);
    }
    return (
      "rgb(" +
      mix((n >> 16) & 255) +
      "," +
      mix((n >> 8) & 255) +
      "," +
      mix(n & 255) +
      ")"
    );
  }

  function trafRect(g, x, y, w, h, rx, fill, extra) {
    var attrs = { x: x, y: y, width: w, height: h, rx: rx, fill: fill };
    for (var key in extra) {
      if (Object.prototype.hasOwnProperty.call(extra, key)) {
        attrs[key] = extra[key];
      }
    }
    g.appendChild(trafNode("rect", attrs));
    return attrs;
  }

  function trafLine(g, x1, y1, x2, y2, stroke, width, extra) {
    var attrs = { x1: x1, y1: y1, x2: x2, y2: y2, stroke: stroke, "stroke-width": width };
    for (var key in extra) {
      if (Object.prototype.hasOwnProperty.call(extra, key)) {
        attrs[key] = extra[key];
      }
    }
    g.appendChild(trafNode("line", attrs));
  }

  /* Tyres go down before the body so the painted sill laps over them; seen from
   * above that is what makes a rectangle read as a vehicle. */
  function trafTyreAt(g, cx) {
    [16, 84].forEach(function (cy) {
      trafRect(g, cx - 13, cy - 11, 26, 22, 8, trafTyre, {
        stroke: trafInk,
        "stroke-width": 1.6,
      });
      trafLine(g, cx - 7, cy, cx + 7, cy, "rgba(255,255,255,.2)", 2.4, {
        "stroke-linecap": "round",
      });
    });
  }

  /* Nose points along the car's own +x; vertical cars reuse this frame rotated,
   * so the art is never stretched and the headlights still face the way the car
   * can travel. */
  function trafDrawVehicle(g, len, paint, uid, isTaxi) {
    var span = len * 100;
    var isTruck = len >= 3;
    var x0 = 9;
    var x1 = span - 9;
    var yT = 20;
    var yB = 80;
    var dark = trafShade(paint, -0.68);
    var axle = isTruck ? [x1 - 40, 38, 76] : [x1 - 44, 46];
    var i;

    for (i = 0; i < axle.length; i += 1) {
      trafTyreAt(g, axle[i]);
    }

    trafRect(g, x0, yT, x1 - x0, yB - yT, 21, "url(#" + uid + "b)", {
      stroke: dark,
      "stroke-width": 3,
    });
    trafRect(g, x0 + 11, yT + 4, x1 - x0 - 22, 9, 5, "rgba(255,255,255,.3)", {
      opacity: 0.75,
    });
    trafRect(g, x0 + 11, yB - 13, x1 - x0 - 22, 8, 4, "rgba(0,0,0,.24)");

    if (isTruck) {
      /* Cab at the nose, pale ribbed crate behind it: the two-tone box is what
       * separates a truck from a long car at a glance. */
      var cabX = x1 - 86;
      trafRect(g, x0 + 3, yT - 6, cabX - x0 - 13, yB - yT + 12, 9, trafShade(paint, 0.58), {
        stroke: dark,
        "stroke-width": 2.6,
      });
      for (i = x0 + 24; i < cabX - 18; i += 26) {
        trafLine(g, i, yT - 3, i, yB + 3, dark, 2, { opacity: 0.32 });
      }
      trafLine(g, cabX - 7, yT - 5, cabX - 7, yB + 5, dark, 3, { opacity: 0.5 });
      trafRect(g, x1 - 32, yT + 8, 24, yB - yT - 16, 8, "url(#" + uid + "g)");
    } else {
      /* One glazed cabin with a painted roof inset leaves a screen at each end. */
      var cA = x0 + 60;
      var cB = x1 - 42;
      trafRect(g, cA, yT + 5, cB - cA, yB - yT - 10, 15, "url(#" + uid + "g)", {
        stroke: dark,
        "stroke-width": 2,
      });
      trafRect(g, cA + 14, yT + 12, cB - cA - 28, yB - yT - 24, 10, trafShade(paint, 0.14), {
        stroke: dark,
        "stroke-width": 1.4,
        opacity: 0.96,
      });
      trafLine(g, cB - 7, yT + 9, cB - 7, yB - 9, dark, 2, { opacity: 0.45 });
      trafRect(g, cB - 4, 7, 13, 9, 3, dark);
      trafRect(g, cB - 4, yB + 4, 13, 9, 3, dark);
    }

    /* lamps: warm white at the nose with a beam wash, red pairs at the tail */
    g.appendChild(
      trafNode("ellipse", {
        cx: x1 - 16,
        cy: 50,
        rx: 14,
        ry: 27,
        fill: "rgba(255,238,170,.17)",
      }),
    );
    trafRect(g, x1 - 14, yT + 6, 11, 13, 4, "#fff6d8", { stroke: dark, "stroke-width": 1.2 });
    trafRect(g, x1 - 14, yB - 19, 11, 13, 4, "#fff6d8", { stroke: dark, "stroke-width": 1.2 });
    trafRect(g, x0 + 3, yT + 8, 9, 11, 3, "#ff5f52", { stroke: dark, "stroke-width": 1.2 });
    trafRect(g, x0 + 3, yB - 19, 9, 11, 3, "#ff5f52", { stroke: dark, "stroke-width": 1.2 });

    if (isTaxi) {
      /* Checker band, roof lamp and a nose chevron: the taxi is findable by
       * shape as well as by colour. */
      var band = x1 - 50;
      trafRect(g, band, yT + 2, 17, yB - yT - 4, 3, "#10151f", { opacity: 0.92 });
      for (i = 0; i < 4; i += 1) {
        trafRect(
          g,
          band + (i % 2 ? 9 : 1),
          yT + 6 + i * 15,
          7,
          7,
          1,
          "#f8fafc",
          { opacity: 0.95 },
        );
      }
      var signX = isTruck ? x1 - 60 : span * 0.54;
      trafRect(g, signX - 16, 41, 32, 18, 5, "#f7f2df", {
        stroke: dark,
        "stroke-width": 2,
      });
      trafRect(g, signX - 9, 47, 18, 6, 2, "#1b2230");
      g.appendChild(
        trafNode("path", {
          d: "M" + (x1 - 36) + " 40l10 10-10 10",
          fill: "none",
          stroke: dark,
          "stroke-width": 4,
          "stroke-linecap": "round",
          "stroke-linejoin": "round",
          opacity: 0.75,
        }),
      );
    }
  }

  function trafVehicle(len, horiz, paint, isTaxi) {
    var span = len * 100;
    var uid = "traf-" + (trafUid += 1) + "-";
    var svg = trafNode("svg", {
      viewBox: horiz ? "0 0 " + span + " 100" : "0 0 100 " + span,
      class: "traf-art",
      "aria-hidden": "true",
      focusable: "false",
    });
    var defs = trafNode("defs");
    var shell = trafNode("linearGradient", { id: uid + "b", x1: "0", y1: "0", x2: "0", y2: "1" });
    shell.appendChild(trafNode("stop", { offset: "0", "stop-color": trafShade(paint, 0.3) }));
    shell.appendChild(trafNode("stop", { offset: ".45", "stop-color": paint }));
    shell.appendChild(trafNode("stop", { offset: "1", "stop-color": trafShade(paint, -0.44) }));
    defs.appendChild(shell);
    var glass = trafNode("linearGradient", { id: uid + "g", x1: "0", y1: "0", x2: "0", y2: "1" });
    glass.appendChild(trafNode("stop", { offset: "0", "stop-color": "#d7effc", "stop-opacity": ".6" }));
    glass.appendChild(trafNode("stop", { offset: ".42", "stop-color": "#1b2f45" }));
    glass.appendChild(trafNode("stop", { offset: "1", "stop-color": "#0c1724" }));
    defs.appendChild(glass);
    svg.appendChild(defs);

    var frame = trafNode(
      "g",
      horiz ? null : { transform: "translate(0 " + span + ") rotate(-90)" },
    );
    trafDrawVehicle(frame, len, paint, uid, isTaxi);
    svg.appendChild(frame);
    return svg;
  }

  /* The painted road: bay lines, dashed lane centres, the escape lane picked out
   * under the taxi's own colour and a gate bay at the wall with chevrons driving
   * into it. Appended after the cars and stacked under them, so the board's own
   * children stay the vehicles the tests and the tab order walk. */
  function trafLotArt(exitRow) {
    var span = trafSize * 100;
    var row = exitRow * 100;
    var svg = trafNode("svg", {
      viewBox: "0 0 " + span + " " + span,
      preserveAspectRatio: "none",
      class: "traf-lot",
      "aria-hidden": "true",
      focusable: "false",
    });
    var grid = trafNode("g", {
      class: "traf-lot-grid",
      fill: "none",
      stroke: "currentColor",
      "stroke-linecap": "butt",
    });
    var i;
    for (i = 1; i < trafSize; i += 1) {
      trafLine(grid, i * 100, 4, i * 100, span - 4, "currentColor", 2, { opacity: 0.15 });
      trafLine(grid, 4, i * 100, span - 4, i * 100, "currentColor", 2, { opacity: 0.15 });
    }
    for (i = 0; i < trafSize; i += 1) {
      trafLine(grid, 8, i * 100 + 50, span - 8, i * 100 + 50, "currentColor", 3.4, {
        "stroke-dasharray": "26 22",
        opacity: 0.2,
      });
      trafLine(grid, i * 100 + 50, 8, i * 100 + 50, span - 8, "currentColor", 3, {
        "stroke-dasharray": "18 30",
        opacity: 0.1,
      });
    }
    svg.appendChild(grid);

    /* The kerb is one path with a hole in it rather than a closed rect: the gap
     * sits on the taxi's own row, so the exit is a place a car can leave through
     * instead of a colour on the wall. */
    svg.appendChild(
      trafNode("path", {
        class: "traf-kerb",
        d:
          "M" + (span - 4) + " " + row +
          "L" + (span - 4) + " 4L4 4L4 " + (span - 4) +
          "L" + (span - 4) + " " + (span - 4) +
          "L" + (span - 4) + " " + (row + 100),
        fill: "none",
        stroke: "currentColor",
        "stroke-width": 6,
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        opacity: 0.5,
      }),
    );

    var lane = trafNode("g", { class: "traf-lane" });
    trafRect(lane, 0, row + 3, span - 96, 94, 6, "rgba(251,191,36,.1)");
    trafLine(lane, 0, row + 3, span, row + 3, "currentColor", 4, { opacity: 0.5 });
    trafLine(lane, 0, row + 97, span, row + 97, "currentColor", 4, { opacity: 0.5 });
    /* A stop line one car short of the mouth: the lane says "go", the paint says
     * "in single file". */
    trafLine(lane, span - 108, row + 8, span - 108, row + 92, "currentColor", 7, {
      class: "traf-stop",
      opacity: 0.4,
    });
    svg.appendChild(lane);

    var exit = trafNode("g", { class: "traf-exit" });
    /* Painted past the wall - the root svg is overflow: visible from the sheet,
     * so the road visibly continues out of the lot. */
    trafRect(exit, span - 2, row + 10, 52, 80, 8, "rgba(74,222,128,.16)", {
      class: "traf-apron",
      stroke: "rgba(134,239,172,.5)",
      "stroke-width": 2.5,
      "stroke-dasharray": "13 10",
    });
    for (i = 0; i < 3; i += 1) {
      var cx = span - 66 + i * 28;
      exit.appendChild(
        trafNode("path", {
          class: "traf-chevron",
          style: "animation-delay:" + (i * 0.16).toFixed(2) + "s",
          d: "M" + cx + " " + (row + 28) + "l18 22-18 22",
          fill: "none",
          stroke: "rgba(198,246,214,.92)",
          "stroke-width": 6,
          "stroke-linecap": "round",
          "stroke-linejoin": "round",
        }),
      );
    }
    /* The two posts and the boom between them: the sheet rotates the boom up when
     * the lot opens, which is the goal becoming reachable. */
    [row - 6, row + 92].forEach(function (py) {
      trafRect(exit, span - 15, py, 13, 15, 5, "currentColor", {
        class: "traf-post",
        stroke: "rgba(8,12,20,.7)",
        "stroke-width": 2,
      });
      exit.appendChild(
        trafNode("circle", {
          class: "traf-lamp",
          cx: span - 8.5,
          cy: py + 7.5,
          r: 3.2,
          fill: "rgba(248,250,252,.92)",
        }),
      );
    });
    trafRect(exit, span - 12, row + 12, 13, 76, 4, "rgba(74,222,128,.95)", {
      class: "traf-gate",
      stroke: "rgba(240,253,244,.8)",
      "stroke-width": 2,
    });
    svg.appendChild(exit);
    return svg;
  }

  function initTrafficGame() {
    var boardEl = getElement("trafBoard");
    var movesEl = getElement("trafMoves");
    var boardStatEl = getElement("trafBoardStat");
    var resultEl = getElement("trafResult");
    var newBtn = getElement("trafNewBtn");
    var bestEl = getElement("trafBest");
    var selectEl = getElement("trafLevelSel");
    if (
      !boardEl ||
      !movesEl ||
      !boardStatEl ||
      !resultEl ||
      !newBtn ||
      !bestEl ||
      !selectEl
    ) {
      return;
    }

    var campaign = createCampaign({ key: "traffic-campaign", levels: trafLevels });
    var level = trafLevels[campaign.indexOf(campaign.nextLevelId())];
    var cars = [];
    var nodes = [];
    var moves = 0;
    var over = false;
    var selected = -1;
    var exitOpen = false;
    var epoch = 0;
    var pending = [];

    /* The drawer boots game-fx before this module, but the stub harness loads
     * the game alone, so every feel call goes through a guard rather than
     * assuming the bank exists. */
    function feel(name, a, b, c) {
      var bank = App.fx;
      if (bank && typeof bank[name] === "function") {
        bank[name](a, b, c);
      }
    }

    function voice(name) {
      if (App.playSfx) {
        App.playSfx(name);
      }
    }

    function noMotion() {
      return !!(App.isMotionOff && App.isMotionOff());
    }

    /* Deferred beats (a slide's settling thunk, a blocked mark fading) are
     * stamped with the lot they belong to: a level swap or a reset between the
     * push and the thunk must not fire onto vehicles that are gone. */
    function later(ms, fn) {
      var born = epoch;
      var id = window.setTimeout(function () {
        var at = pending.indexOf(id);
        if (at >= 0) {
          pending.splice(at, 1);
        }
        if (born === epoch) {
          fn();
        }
      }, ms);
      pending.push(id);
      return id;
    }

    function clearPending() {
      pending.forEach(function (id) {
        window.clearTimeout(id);
      });
      pending = [];
    }

    /* .fx-ceremony wants the panel; the stub has no .closest, and in every page
     * the board's parent already is the panel. */
    function ceremonyHost() {
      if (boardEl.closest) {
        var host = boardEl.closest(".game-panel");
        if (host) {
          return host;
        }
      }
      return boardEl.parentNode || boardEl;
    }

    function refreshPicker() {
      fillCampaignPicker(
        selectEl,
        campaign,
        function (def) {
          return t("trafBoardLabelN", { n: campaign.indexOf(def.id) + 1 });
        },
        t("elementsLocked"),
      );
      selectEl.value = level.id;
      bestEl.textContent = t("campaignStars", {
        n: campaign.totalStars(),
        max: campaign.maxStars(),
      });
      boardStatEl.textContent =
        campaign.indexOf(level.id) + 1 + "/" + trafLevels.length;
    }

    /* A vehicle, not a coloured box: the SVG carries the body, cabin, tyres and
     * lamps, and --traf-paint hands its colour back to the sheet for the halo
     * and the beacon so selected/blocked states share the car's own identity. */
    function makeCarNode(car, index) {
      var isTaxi = index === 0;
      var paint = isTaxi ? trafPaints[0] : trafPaints[index % trafPaints.length];
      var node = document.createElement("button");
      node.type = "button";
      node.className =
        "traf-car " +
        (isTaxi ? "is-taxi" : "is-racer") +
        " " +
        (car[2] >= 3 ? "is-truck" : "is-sedan") +
        (index === selected ? " is-selected" : "");
      node.style.setProperty("--traf-paint", paint);
      node.setAttribute(
        "aria-label",
        isTaxi ? t("trafTaxi") : t("trafCar", { n: index }),
      );
      node.setAttribute("aria-pressed", index === selected ? "true" : "false");
      node.appendChild(trafVehicle(car[2], car[3] === 1, paint, isTaxi));
      node.addEventListener("click", function () {
        selectCar(index);
      });
      node.addEventListener("pointerdown", function (event) {
        beginDrag(index, event);
      });
      return node;
    }

    /* left/top stay the grid truth (percent of the lot) so a slide is a CSS
     * transition along the lane instead of a re-render. */
    function placeCar(index) {
      var node = nodes[index];
      var car = cars[index];
      if (!node || !car) {
        return;
      }
      var horiz = car[3] === 1;
      node.style.left = (car[0] / trafSize) * 100 + "%";
      node.style.top = (car[1] / trafSize) * 100 + "%";
      node.style.width = ((horiz ? car[2] : 1) / trafSize) * 100 + "%";
      node.style.height = ((horiz ? 1 : car[2]) / trafSize) * 100 + "%";
    }

    function buildLot() {
      clearPending();
      epoch += 1;
      boardEl.textContent = "";
      nodes = [];
      exitOpen = false;
      boardEl.classList.remove("is-open");
      cars.forEach(function (car, index) {
        var node = makeCarNode(car, index);
        nodes.push(node);
        placeCar(index);
        boardEl.appendChild(node);
      });
      /* The road layer goes on last and stacks under the vehicles: the board's
       * children stay the cars, which is what the tab order and the tests walk. */
      boardEl.style.setProperty(
        "--traf-exit-row",
        String(cars.length ? cars[0][1] : trafTaxiRow),
      );
      boardEl.appendChild(trafLotArt(cars.length ? cars[0][1] : trafTaxiRow));
      syncExit(true);
      feel("stagger", nodes.slice(), { step: 34, kind: "drop", ms: 330 });
    }

    /* The gate only reads as the goal once there is a run to it, so the lot
     * itself carries that state rather than a sentence in the result line. */
    function syncExit(hush) {
      var open = cars.length > 0 && trafExitOpen(cars);
      if (open === exitOpen) {
        return;
      }
      exitOpen = open;
      boardEl.classList.toggle("is-open", open);
      if (open && !hush && !over) {
        feel("flash", boardEl, { hue: 148, ms: 520 });
        voice("score");
      }
    }

    function selectCar(index) {
      selected = index;
      nodes.forEach(function (node, nodeIndex) {
        node.classList.toggle("is-selected", nodeIndex === index);
      });
    }

    function commitMove(index, dir, wanted) {
      /* dir: +1/-1 along the car's axis; wanted: cells asked for. */
      if (over || !dir || !wanted) {
        return false;
      }
      var car = cars[index];
      var horiz = car[3] === 1;
      var reach = trafSlide(
        cars,
        index,
        horiz ? dir : 0,
        horiz ? 0 : dir,
      );
      var steps = Math.min(Math.abs(wanted), Math.abs(reach));
      if (steps === 0) {
        return false;
      }
      car[0] += horiz ? dir * steps : 0;
      car[1] += horiz ? 0 : dir * steps;
      moves += steps;
      movesEl.textContent = String(moves);
      placeCar(index);
      syncExit(false);
      if (index === 0 && trafTaxiOut(cars)) {
        win();
      }
      return true;
    }

    var drag = null;

    function beginDrag(index, event) {
      if (over) {
        return;
      }
      selectCar(index);
      drag = {
        index: index,
        startX: event.clientX,
        startY: event.clientY,
        moved: false,
      };
      window.addEventListener("pointermove", onDragMove);
      window.addEventListener("pointerup", endDrag);
      if (boardEl.setPointerCapture) {
        try {
          /* Only extends the drag past the board's edge; the window
           * listeners already carry it, so a stale pointerId is benign. */
          boardEl.setPointerCapture(event.pointerId);
        } catch (error) {}
      }
    }

    function onDragMove(event) {
      if (!drag) {
        return;
      }
      var car = cars[drag.index];
      var horiz = car[3] === 1;
      var rect = boardEl.getBoundingClientRect();
      var cell = (rect.width || 360) / trafSize;
      var raw =
        (horiz ? event.clientX - drag.startX : event.clientY - drag.startY) /
        cell;
      var steps = Math.round(raw);
      if (steps === 0) {
        return;
      }
      drag.moved = true;
      var dir = steps > 0 ? 1 : -1;
      var reach = trafSlide(
        cars,
        drag.index,
        horiz ? dir : 0,
        horiz ? 0 : dir,
      );
      var allowed = Math.min(Math.abs(steps), Math.abs(reach)) * dir;
      nodes[drag.index].style.left =
        ((car[0] + (horiz ? allowed : 0)) / trafSize) * 100 + "%";
      nodes[drag.index].style.top =
        ((car[1] + (horiz ? 0 : allowed)) / trafSize) * 100 + "%";
      drag.allowed = allowed;
    }

    function endDrag() {
      window.removeEventListener("pointermove", onDragMove);
      window.removeEventListener("pointerup", endDrag);
      if (drag && drag.moved && drag.allowed) {
        commitMove(
          drag.index,
          drag.allowed > 0 ? 1 : -1,
          Math.abs(drag.allowed),
        );
      }
      drag = null;
    }

    function win() {
      over = true;
      var starsWon = starsFor(moves, level.par, "low");
      var outcome = campaign.record(level.id, {
        stars: starsWon,
        best: moves,
        better: "low",
      });
      var message = t("trafWin", { n: moves, s: starsWon });
      if (outcome.isBest) {
        message += " " + t("newBest");
      }
      if (outcome.unlockedNext) {
        message += " " + t("trafNext");
      } else if (campaign.clearedCount() === trafLevels.length) {
        message += " " + t("trafAllBoards");
      }
      resultEl.textContent = message;
      logAction(t("logTraf", { n: moves }));
      var rect = newBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      var nextId = outcome.unlockedNext || level.id;
      loadLevel(trafLevels[campaign.indexOf(nextId)]);
      resultEl.textContent = message;
    }

    function loadLevel(levelDef) {
      level = levelDef;
      cars = levelDef.cars.map(function (car) {
        return car.slice();
      });
      moves = 0;
      over = false;
      selected = 0;
      movesEl.textContent = "0";
      buildLot();
      refreshPicker();
      resultEl.textContent = t("trafPrompt");
    }

    boardEl.addEventListener("keydown", function (event) {
      if (selected < 0 || over) {
        return;
      }
      var horiz = cars[selected][3] === 1;
      if (event.key === "ArrowLeft" && horiz) {
        event.preventDefault();
        commitMove(selected, -1, 1);
      } else if (event.key === "ArrowRight" && horiz) {
        event.preventDefault();
        commitMove(selected, 1, 1);
      } else if (event.key === "ArrowUp" && !horiz) {
        event.preventDefault();
        commitMove(selected, -1, 1);
      } else if (event.key === "ArrowDown" && !horiz) {
        event.preventDefault();
        commitMove(selected, 1, 1);
      } else if (event.key === "Tab") {
        /* Tab walks the cars instead of leaving the board. */
        event.preventDefault();
        selectCar((selected + 1) % cars.length);
      }
    });
    boardEl.tabIndex = 0;

    newBtn.addEventListener("click", function () {
      loadLevel(level);
    });

    selectEl.addEventListener("change", function () {
      var index = campaign.indexOf(selectEl.value);
      if (index >= 0 && campaign.isUnlocked(selectEl.value)) {
        loadLevel(trafLevels[index]);
      }
    });

    loadLevel(trafLevels[campaign.indexOf(campaign.nextLevelId())]);
  }


  /* Exported for the other modules. */
  App.trafficSolvable = trafficSolvable;
  App.initTrafficGame = initTrafficGame;
})(window.CapitalConvert = window.CapitalConvert || {});
