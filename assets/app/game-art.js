/* Game Art - the drawer's illustration library.

 * The reason a panel like Glyph Mines reads as a wireframe is that its board is
 * eighty-one identical grey rectangles: nothing in it is drawn. This module
 * gives every game a vocabulary of vector motifs to draw with instead - stones,
 * mines, flags, gems, card backs, bevelled tiles, felt and starfield surfaces,
 * and a handful of composed scenes.

 * Motifs are recipes over a 24x24 grid so they share an optical size and line
 * weight, and every colour is a token (@main, @deep, @lit, @line) resolved
 * against the caller's hue, so one library serves a lavender hidden-object room
 * and a rusted dungeon without a second palette.

 * Nodes are built with createElementNS rather than innerHTML: the headless
 * harness does not parse markup, and a silently empty SVG is the worst kind of
 * bug to ship. */
(function (App) {
  var doc = document;
  var NS = "http://www.w3.org/2000/svg";

  function mk(tag, attrs, kids) {
    var node = doc.createElementNS(NS, tag);
    if (attrs) {
      for (var k in attrs) {
        if (Object.prototype.hasOwnProperty.call(attrs, k) && attrs[k] !== null && attrs[k] !== undefined) {
          node.setAttribute(k, String(attrs[k]));
        }
      }
    }
    if (kids && kids.length) {
      for (var i = 0; i < kids.length; i += 1) {
        if (kids[i]) {
          node.appendChild(kids[i]);
        }
      }
    }
    return node;
  }

  /* A palette from one hue. Games pass `hue` and get five coordinated values,
   * so nothing has to invent colours per motif. */
  function palette(opts) {
    var o = opts || {};
    var hue = o.hue === undefined ? 192 : o.hue;
    var sat = o.sat === undefined ? 78 : o.sat;
    var deep = o.tone === "deep" ? 26 : 34;
    var main = o.tone === "soft" ? 58 : 52;
    return {
      main: "hsl(" + hue + "," + sat + "%," + main + "%)",
      deep: "hsl(" + hue + "," + sat + "%," + deep + "%)",
      lit: "hsl(" + hue + "," + Math.min(98, sat + 12) + "%," + (main + 22) + "%)",
      soft: "hsl(" + hue + "," + Math.round(sat * 0.6) + "%," + (main + 34) + "%)",
      line: "hsl(" + hue + "," + sat + "%," + Math.max(12, deep - 14) + "%)",
      glow: "hsl(" + hue + ",98%,72%)",
      ink: o.ink || "rgba(0,0,0,0.35)",
    };
  }

  function paint(shape, p) {
    var out = {};
    for (var k in shape[1]) {
      if (!Object.prototype.hasOwnProperty.call(shape[1], k)) {
        continue;
      }
      var v = shape[1][k];
      if (typeof v === "string" && v.charAt(0) === "@") {
        v = p[v.slice(1)] || v;
      }
      out[k] = v;
    }
    return mk(shape[0], out);
  }

  function paintList(list, p) {
    var out = [];
    for (var i = 0; i < list.length; i += 1) {
      out.push(paint(list[i], p));
    }
    return out;
  }

  /* ------------------------------------------------------------ icon bank */
  /* Each recipe is a list of [tag, attrs] over a 24x24 box. */
  var ICONS = {
    /* --- board pieces and table objects --- */
    "stone-dark": [["circle", { cx: 12, cy: 12, r: 8.4, fill: "#141a24", stroke: "rgba(255,255,255,.22)", "stroke-width": 1 }], ["path", { d: "M6.5 9a6 6 0 0 1 8-2.6", fill: "none", stroke: "rgba(255,255,255,.4)", "stroke-width": 1.4, "stroke-linecap": "round" }]],
    "stone-light": [["circle", { cx: 12, cy: 12, r: 8.4, fill: "#f3f6fb", stroke: "rgba(0,0,0,.28)", "stroke-width": 1 }], ["path", { d: "M6.5 9a6 6 0 0 1 8-2.6", fill: "none", stroke: "rgba(0,0,0,.12)", "stroke-width": 1.4, "stroke-linecap": "round" }]],
    disc: [["circle", { cx: 12, cy: 12, r: 8.2, fill: "@main", stroke: "@line", "stroke-width": 1.2 }], ["circle", { cx: 12, cy: 12, r: 4.4, fill: "none", stroke: "@lit", "stroke-width": 1.6 }]],
    pawn: [["path", { d: "M12 4.2a3.1 3.1 0 0 1 2.6 4.7c1.6 1 2.4 2.6 2.4 4.6H7c0-2 .8-3.6 2.4-4.6A3.1 3.1 0 0 1 12 4.2z", fill: "@main", stroke: "@line" }], ["path", { d: "M5.6 19.4h12.8l-1.2-3.2H6.8z", fill: "@deep", stroke: "@line" }]],
    knight: [["path", { d: "M8 20V9.5c0-2 1.6-3 3-3.4l.6-2.3 2.2 2.6c2 .8 3.4 2.8 3.4 5.2 0 3-1.8 4.6-1.8 6.4H8z", fill: "@main", stroke: "@line" }], ["circle", { cx: 13.6, cy: 9.6, r: .9, fill: "@line" }]],
    crown: [["path", { d: "M4 17l1.4-9 4 4.2L12 6l2.6 6.2 4-4.2L20 17z", fill: "@main", stroke: "@line" }], ["path", { d: "M4.6 19.2h14.8", stroke: "@deep", "stroke-width": 2, "stroke-linecap": "round" }]],
    dice: [["rect", { x: 4, y: 4, width: 16, height: 16, rx: 4, fill: "@soft", stroke: "@line" }], ["circle", { cx: 9, cy: 9, r: 1.5, fill: "@line" }], ["circle", { cx: 15, cy: 15, r: 1.5, fill: "@line" }], ["circle", { cx: 15, cy: 9, r: 1.5, fill: "@line" }], ["circle", { cx: 9, cy: 15, r: 1.5, fill: "@line" }]],
    domino: [["rect", { x: 6, y: 3, width: 12, height: 18, rx: 3, fill: "@soft", stroke: "@line" }], ["path", { d: "M6.6 12h10.8", stroke: "@line", "stroke-width": 1 }], ["circle", { cx: 12, cy: 7, r: 1.4, fill: "@line" }], ["circle", { cx: 9.4, cy: 16.4, r: 1.4, fill: "@line" }], ["circle", { cx: 14.6, cy: 16.4, r: 1.4, fill: "@line" }]],
    "card-back": [["rect", { x: 4, y: 2.6, width: 16, height: 18.8, rx: 2.6, fill: "@deep", stroke: "@line" }], ["rect", { x: 6.4, y: 5, width: 11.2, height: 14, rx: 1.6, fill: "none", stroke: "@lit", "stroke-width": 1 }], ["path", { d: "M6.4 5l11.2 14M17.6 5L6.4 19", stroke: "@main", "stroke-width": 1, opacity: .8 }], ["circle", { cx: 12, cy: 12, r: 2.6, fill: "@lit", opacity: .9 }]],
    card: [["rect", { x: 4.6, y: 2.6, width: 14.8, height: 18.8, rx: 2.4, fill: "#fbfdff", stroke: "@line" }], ["path", { d: "M7 6h9.2M7 9h9.2M7 12h6", stroke: "rgba(15,23,42,.35)", "stroke-width": 1.2, "stroke-linecap": "round" }]],
    tile: [["rect", { x: 3.4, y: 3.4, width: 17.2, height: 17.2, rx: 3.4, fill: "@main", stroke: "@line" }], ["path", { d: "M5.6 5.6h12.8v3H5.6z", fill: "@lit", opacity: .45 }]],
    meeple: [["path", { d: "M12 3.4c1.7 0 2.9 1.3 2.9 2.9 0 .8-.3 1.4-.7 1.9 2 .5 3.4 1.7 4.2 3.4l-2.3.9.6 6.2H8l.6-6.2-2.3-.9c.8-1.7 2.2-2.9 4.2-3.4-.4-.5-.7-1.1-.7-1.9 0-1.6 1.2-2.9 2.2-2.9z", fill: "@main", stroke: "@line" }]],
    flag: [["path", { d: "M7 21V3.6", stroke: "@line", "stroke-width": 1.8, "stroke-linecap": "round" }], ["path", { d: "M8 4.4h10l-2.4 3.6L18 11.6H8z", fill: "@main", stroke: "@line" }]],
    pin: [["path", { d: "M12 21c4-5 6-8 6-11a6 6 0 1 0-12 0c0 3 2 6 6 11z", fill: "@main", stroke: "@line" }], ["circle", { cx: 12, cy: 10, r: 2.3, fill: "@soft" }]],

    /* --- hazards and rewards --- */
    mine: [["circle", { cx: 12, cy: 13, r: 6.4, fill: "#1b2130", stroke: "#0a0d14" }], ["path", { d: "M12 3.6v3M18.6 6.4l-2 2M5.4 6.4l2 2M20.4 13h-3M6.6 13h-3", stroke: "#1b2130", "stroke-width": 1.8, "stroke-linecap": "round" }], ["circle", { cx: 9.8, cy: 10.8, r: 1.5, fill: "rgba(255,255,255,.5)" }]],
    bomb: [["circle", { cx: 11, cy: 14.4, r: 6.2, fill: "#232a38", stroke: "#0b0f16" }], ["path", { d: "M15 8.6c1.6-2.4 3.6-2.6 4.6-1.4", stroke: "@main", "stroke-width": 1.8, "fill": "none", "stroke-linecap": "round" }], ["circle", { cx: 8.8, cy: 12.2, r: 1.4, fill: "rgba(255,255,255,.45)" }]],
    gem: [["path", { d: "M7 4h10l4 6-9 10L3 10z", fill: "@main", stroke: "@line" }], ["path", { d: "M7 4l2.6 6L3 10m14-6l-2.6 6L21 10M9.6 10h4.8L12 20", fill: "none", stroke: "@lit", "stroke-width": 1 }]],
    crystal: [["path", { d: "M12 2.6 18 12l-6 9.4L6 12z", fill: "@main", stroke: "@line", opacity: .92 }], ["path", { d: "M12 2.6V21M6 12h12", stroke: "@lit", "stroke-width": .9, opacity: .8 }]],
    coin: [["circle", { cx: 12, cy: 12, r: 8, fill: "@main", stroke: "@line" }], ["circle", { cx: 12, cy: 12, r: 5.4, fill: "none", stroke: "@lit", "stroke-width": 1.2 }], ["path", { d: "M12 8.6v6.8M10 10.4h3.4M10 13.6h3.4", stroke: "@deep", "stroke-width": 1.4, "stroke-linecap": "round" }]],
    key: [["circle", { cx: 8.4, cy: 8.4, r: 4.2, fill: "none", stroke: "@main", "stroke-width": 2.2 }], ["path", { d: "M11.4 11.4 20 20M16 16l-2 2M18.4 18.4l-1.6 1.6", stroke: "@main", "stroke-width": 2, "stroke-linecap": "round" }]],
    lock: [["rect", { x: 5, y: 10.4, width: 14, height: 10, rx: 2.6, fill: "@main", stroke: "@line" }], ["path", { d: "M8.4 10V8a3.6 3.6 0 0 1 7.2 0v2", fill: "none", stroke: "@line", "stroke-width": 2 }], ["circle", { cx: 12, cy: 15, r: 1.6, fill: "@deep" }]],
    chest: [["path", { d: "M4 11.6a8 8 0 0 1 16 0z", fill: "@main", stroke: "@line" }], ["rect", { x: 4, y: 11.6, width: 16, height: 8, rx: 1.6, fill: "@deep", stroke: "@line" }], ["rect", { x: 10.6, y: 9.6, width: 2.8, height: 5, rx: 1, fill: "@lit" }]],
    heart: [["path", { d: "M12 20.4C6.6 16.8 3.6 13.8 3.6 10a4.4 4.4 0 0 1 8.4-1.8A4.4 4.4 0 0 1 20.4 10c0 3.8-3 6.8-8.4 10.4z", fill: "@main", stroke: "@line" }]],
    star: [["path", { d: "M12 3.2l2.7 5.7 6.1.8-4.5 4.4 1.2 6.2L12 17.3l-5.5 3 1.2-6.2L3.2 9.7l6.1-.8z", fill: "@main", stroke: "@line" }]],
    sparkle: [["path", { d: "M12 3.4l1.8 5.4 5.4 1.8-5.4 1.8L12 21l-1.8-5.4-5.4-1.8 5.4-1.8z", fill: "@lit", stroke: "@line", "stroke-width": .8 }]],
    shield: [["path", { d: "M12 3l7.4 2.6v6c0 4.4-3 7.6-7.4 9.4-4.4-1.8-7.4-5-7.4-9.4v-6z", fill: "@main", stroke: "@line" }], ["path", { d: "M12 6.6v11", stroke: "@lit", "stroke-width": 1.2 }]],
    sword: [["path", { d: "M18.6 3.4 8.4 13.6l1.8 1.8L20.4 5.2z", fill: "@main", stroke: "@line" }], ["path", { d: "M6.6 14.4l2.8 2.8M4.4 18.8l2.4-2.4 1.6 1.6-2.4 2.4z", stroke: "@deep", "stroke-width": 1.8, "stroke-linecap": "round" }]],
    wand: [["path", { d: "M4 20 14 10", stroke: "@deep", "stroke-width": 2.4, "stroke-linecap": "round" }], ["path", { d: "M16.4 3.6l1 2.6 2.6 1-2.6 1-1 2.6-1-2.6-2.6-1 2.6-1z", fill: "@lit" }], ["circle", { cx: 6.6, cy: 8.4, r: 1, fill: "@lit" }]],

    /* --- nature and weather --- */
    leaf: [["path", { d: "M20 4C10 4 4.6 8.6 4.6 15.4c0 1.6.4 3 .9 4.2C12 19 20 14.4 20 4z", fill: "@main", stroke: "@line" }], ["path", { d: "M6.4 18.6C9.4 13.6 13.6 9.4 18.4 6.6", stroke: "@deep", "stroke-width": 1.2, "fill": "none" }]],
    sprout: [["path", { d: "M12 20.6v-7", stroke: "@deep", "stroke-width": 2, "stroke-linecap": "round" }], ["path", { d: "M12 13.6C12 9.4 9 7 5 7c0 4.2 3 6.6 7 6.6z", fill: "@main" }], ["path", { d: "M12 12.4c0-3.6 2.6-5.8 6.4-5.8 0 3.6-2.6 5.8-6.4 5.8z", fill: "@lit" }]],
    bloom: [["circle", { cx: 12, cy: 12, r: 3, fill: "@deep" }], ["path", { d: "M12 3.4c2 0 3 1.6 3 3.4s-1 3-3 3-3-1.2-3-3 1-3.4 3-3.4zM12 20.6c-2 0-3-1.6-3-3.4s1-3 3-3 3 1.2 3 3-1 3.4-3 3.4zM3.4 12c0-2 1.6-3 3.4-3s3 1 3 3-1.2 3-3 3-3.4-1-3.4-3zM20.6 12c0 2-1.6 3-3.4 3s-3-1-3-3 1.2-3 3-3 3.4 1 3.4 3z", fill: "@main" }]],
    tree: [["path", { d: "M12 3l5.4 8h-3l4.2 6.4H5.4L9.6 11h-3z", fill: "@main", stroke: "@line" }], ["rect", { x: 10.6, y: 17, width: 2.8, height: 4, rx: 1, fill: "@deep" }]],
    mushroom: [["path", { d: "M3.8 12.4C3.8 7.6 7.4 4.4 12 4.4s8.2 3.2 8.2 8z", fill: "@main", stroke: "@line" }], ["path", { d: "M9.6 12.4h4.8v5.4a2.4 2.4 0 0 1-4.8 0z", fill: "@soft", stroke: "@line" }], ["circle", { cx: 8.4, cy: 9, r: 1.3, fill: "@lit" }], ["circle", { cx: 14.6, cy: 8.2, r: 1.6, fill: "@lit" }]],
    berry: [["circle", { cx: 9, cy: 14.6, r: 4.2, fill: "@main", stroke: "@line" }], ["circle", { cx: 15.4, cy: 13, r: 3.6, fill: "@deep", stroke: "@line" }], ["path", { d: "M11.6 10.4c0-3 1.6-5 4.4-5.6", stroke: "@lit", "stroke-width": 1.6, "fill": "none" }]],
    sun: [["circle", { cx: 12, cy: 12, r: 4.6, fill: "@main" }], ["path", { d: "M12 2.6v2.8M12 18.6v2.8M2.6 12h2.8M18.6 12h2.8M5.4 5.4l2 2M16.6 16.6l2 2M18.6 5.4l-2 2M7.4 16.6l-2 2", stroke: "@lit", "stroke-width": 2, "stroke-linecap": "round" }]],
    moon: [["path", { d: "M15.6 3.6a9 9 0 1 0 4.8 15.2A9.6 9.6 0 0 1 15.6 3.6z", fill: "@main", stroke: "@line" }]],
    cloud: [["path", { d: "M7.4 18.4h9.8a4.2 4.2 0 0 0 .6-8.4 5.6 5.6 0 0 0-10.6-1.4 4 4 0 0 0 .2 9.8z", fill: "@main", stroke: "@line" }]],
    rain: [["path", { d: "M7.6 13.4h9.2a3.8 3.8 0 0 0 .4-7.4 5 5 0 0 0-9.4-1.2 3.6 3.6 0 0 0-.2 8.6z", fill: "@soft", stroke: "@line" }], ["path", { d: "M8.6 16.4 7.4 20M12.6 16.4 11.4 20M16.6 16.4 15.4 20", stroke: "@main", "stroke-width": 2, "stroke-linecap": "round" }]],
    snow: [["path", { d: "M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9", stroke: "@main", "stroke-width": 1.8, "stroke-linecap": "round" }], ["path", { d: "M9.6 5.4 12 3l2.4 2.4M9.6 18.6 12 21l2.4-2.4", fill: "none", stroke: "@lit", "stroke-width": 1.4 }]],
    flame: [["path", { d: "M12 2.8c3.6 4.4 6 6.8 6 10.2a6 6 0 1 1-12 0c0-2.2 1-4 2.6-5.6.2 1.8 1 2.8 2.2 3.2-.4-2.8-.2-5.2 1.2-7.8z", fill: "@main", stroke: "@line" }], ["path", { d: "M12 20.4a3.2 3.2 0 0 1-3.2-3.2c0-1.6 1.2-2.6 3.2-4.6 2 2 3.2 3 3.2 4.6A3.2 3.2 0 0 1 12 20.4z", fill: "@lit" }]],
    bolt: [["path", { d: "M13.6 2.4 5.4 13.6h4.6L9.2 21.6l8.6-11.6h-5z", fill: "@main", stroke: "@line" }]],
    wave: [["path", { d: "M2.6 9.4c2.4-2.4 4.8-2.4 7.2 0s4.8 2.4 7.2 0 2.6-1.4 4.4-2.4", fill: "none", stroke: "@main", "stroke-width": 2.2, "stroke-linecap": "round" }], ["path", { d: "M2.6 15.4c2.4-2.4 4.8-2.4 7.2 0s4.8 2.4 7.2 0 2.6-1.4 4.4-2.4", fill: "none", stroke: "@lit", "stroke-width": 2.2, "stroke-linecap": "round" }]],
    rock: [["path", { d: "M5.4 18.6 3.6 12l4.8-6 6.6-1 5.4 5-1.2 8.6z", fill: "@main", stroke: "@line" }], ["path", { d: "M8.4 6l3.6 6.6-6.2 1.4M18.6 10.4l-6.6 2.2 2.4 6", fill: "none", stroke: "@deep", "stroke-width": 1.1 }]],
    shell: [["path", { d: "M12 20.4C6.6 20.4 3.6 15 3.6 10.4 3.6 5.6 7.4 3.6 12 3.6s8.4 2 8.4 6.8c0 4.6-3 10-8.4 10z", fill: "@soft", stroke: "@line" }], ["path", { d: "M12 4.6v15M7.4 6.6l2.4 12.6M16.6 6.6l-2.4 12.6", stroke: "@main", "stroke-width": 1 }]],
    coral: [["path", { d: "M12 21v-7M12 14c-2.6 0-4-1.8-4-4.4M12 14c2.6 0 4-1.8 4-4.4M8 9.6c0-2 1-3.4 2.6-4.4M16 9.6c0-2-1-3.4-2.6-4.4", stroke: "@main", "stroke-width": 2.2, "fill": "none", "stroke-linecap": "round" }]],
    bone: [["path", { d: "M6.6 17.4 17.4 6.6", stroke: "@soft", "stroke-width": 3.4, "stroke-linecap": "round" }], ["circle", { cx: 5.4, cy: 15.6, r: 2.4, fill: "@soft" }], ["circle", { cx: 8.4, cy: 18.6, r: 2.4, fill: "@soft" }], ["circle", { cx: 18.6, cy: 5.4, r: 2.4, fill: "@soft" }], ["circle", { cx: 15.6, cy: 8.4, r: 2.4, fill: "@soft" }]],
    paw: [["circle", { cx: 12, cy: 15, r: 4.6, fill: "@main" }], ["circle", { cx: 6.2, cy: 10, r: 2.3, fill: "@main" }], ["circle", { cx: 10, cy: 6.6, r: 2.3, fill: "@main" }], ["circle", { cx: 14.6, cy: 6.6, r: 2.3, fill: "@main" }], ["circle", { cx: 18, cy: 10.4, r: 2.3, fill: "@main" }]],
    feather: [["path", { d: "M19.4 4.6c-8 .6-12.4 4.4-13.4 10.4l-1.4 4.8 4.8-1.4c6-1 9.8-5.4 10.4-13.4z", fill: "@main", stroke: "@line" }], ["path", { d: "M4.6 19.4 14 10M11.6 6.6l4 4", stroke: "@deep", "stroke-width": 1.2, "fill": "none" }]],
    egg: [["path", { d: "M12 3.2c4 0 6.6 5 6.6 9.4a6.6 6.6 0 0 1-13.2 0C5.4 8.2 8 3.2 12 3.2z", fill: "@soft", stroke: "@line" }], ["circle", { cx: 10, cy: 11, r: 1.4, fill: "@main" }], ["circle", { cx: 14.2, cy: 14.4, r: 1.8, fill: "@main" }]],
    fish: [["path", { d: "M3.6 12c3-4.4 7-6.4 11-6 2.6.2 4.4 1.6 5.4 3l2.4-1.6-.8 4.6.8 4.6-2.4-1.6c-1 1.4-2.8 2.8-5.4 3-4 .4-8-1.6-11-6z", fill: "@main", stroke: "@line" }], ["circle", { cx: 8, cy: 11, r: 1.1, fill: "@line" }]],
    bird: [["path", { d: "M4 14.6c4-6.6 9-8.4 15.4-6.6l1.6-2.4.4 3.6 2.6.6-2.4 1.6c-1.4 5.6-6 8.6-12.4 8.2z", fill: "@main", stroke: "@line" }], ["circle", { cx: 16.6, cy: 9.4, r: .9, fill: "@line" }]],
    butterfly: [["path", { d: "M12 6.6v11", stroke: "@line", "stroke-width": 1.6 }], ["path", { d: "M11.4 11C9 6.6 4.6 5.6 3.6 8.2s2 6 7.8 2.8z", fill: "@main" }], ["path", { d: "M12.6 11c2.4-4.4 6.8-5.4 7.8-2.8s-2 6-7.8 2.8z", fill: "@lit" }], ["path", { d: "M11.4 12.4C8.6 16 4.8 16 4.2 13.4s3-4.4 7.2-1z", fill: "@deep" }], ["path", { d: "M12.6 12.4c2.8 6.4 6.6 6.4 7.2 3.8s-3-4.8-7.2-3.8z", fill: "@soft" }]],

    /* --- tools, machines, science --- */
    gear: [["path", { d: "M12 3.4l1.4 2.4 2.6-.6.6 2.6 2.4 1.4-1.4 1.4.6 2.6-2.6.6L15 18.6l-3-1.4-3 1.4-.6-2.6-2.6-.6.6-2.6L4.4 10l2.4-1.4-.6-2.6 2.6.6z", fill: "@main", stroke: "@line" }], ["circle", { cx: 12, cy: 11.6, r: 3, fill: "@deep" }]],
    wrench: [["path", { d: "M17.6 3.4a5.4 5.4 0 0 0-6.4 7L4 17.6l2.4 2.4 7.2-7.2a5.4 5.4 0 0 0 7-6.4l-3 3-2.6-2.6z", fill: "@main", stroke: "@line" }]],
    piston: [["rect", { x: 8.6, y: 3, width: 6.8, height: 6, rx: 1.4, fill: "@main", stroke: "@line" }], ["rect", { x: 10.6, y: 9, width: 2.8, height: 6, fill: "@soft", stroke: "@line" }], ["rect", { x: 6.6, y: 15, width: 10.8, height: 5.4, rx: 1.6, fill: "@deep", stroke: "@line" }]],
    valve: [["circle", { cx: 12, cy: 12, r: 4, fill: "none", stroke: "@main", "stroke-width": 2.4 }], ["path", { d: "M12 3.4v4.6M12 16v4.6M3.4 12h4.6M16 12h4.6", stroke: "@main", "stroke-width": 2.4, "stroke-linecap": "round" }]],
    pipe: [["path", { d: "M4 8h8a4 4 0 0 1 4 4v8", fill: "none", stroke: "@main", "stroke-width": 3.6, "stroke-linecap": "round" }], ["rect", { x: 2.4, y: 5.4, width: 3.2, height: 5.2, rx: 1, fill: "@deep" }], ["rect", { x: 13.4, y: 17.4, width: 5.2, height: 3.2, rx: 1, fill: "@deep" }]],
    bulb: [["path", { d: "M12 3.4a6.4 6.4 0 0 1 4 11.4v2.2H8v-2.2a6.4 6.4 0 0 1 4-11.4z", fill: "@main", stroke: "@line" }], ["rect", { x: 8.6, y: 17.6, width: 6.8, height: 3, rx: 1.2, fill: "@deep" }], ["path", { d: "M9.8 10.6a2.6 2.6 0 0 1 4.4 0", fill: "none", stroke: "@lit", "stroke-width": 1.2 }]],
    battery: [["rect", { x: 3.4, y: 7.6, width: 15, height: 9, rx: 2.4, fill: "@deep", stroke: "@line" }], ["rect", { x: 19, y: 10.4, width: 2.2, height: 3.4, rx: 1, fill: "@main" }], ["rect", { x: 5.4, y: 9.6, width: 4.4, height: 5, rx: 1, fill: "@main" }]],
    magnet: [["path", { d: "M4.6 16.4V9.6a7.4 7.4 0 0 1 14.8 0v6.8h-4.2V9.6a3.2 3.2 0 0 0-6.4 0v6.8z", fill: "@main", stroke: "@line" }], ["rect", { x: 4.6, y: 16.4, width: 4.2, height: 3.4, fill: "@deep" }], ["rect", { x: 15.2, y: 16.4, width: 4.2, height: 3.4, fill: "@deep" }]],
    radar: [["path", { d: "M12 12 20 8", stroke: "@lit", "stroke-width": 2 }], ["circle", { cx: 12, cy: 12, r: 8.4, fill: "none", stroke: "@main", "stroke-width": 1.6 }], ["circle", { cx: 12, cy: 12, r: 4.4, fill: "none", stroke: "@main", "stroke-width": 1.2, opacity: .7 }], ["circle", { cx: 12, cy: 12, r: 1.4, fill: "@lit" }]],
    satellite: [["rect", { x: 9.6, y: 9.6, width: 4.8, height: 4.8, rx: 1, fill: "@main", stroke: "@line" }], ["path", { d: "M4 12h5.6M14.4 12H20", stroke: "@deep", "stroke-width": 1.6 }], ["rect", { x: 1.6, y: 9, width: 3.4, height: 6, rx: 1, fill: "@lit" }], ["rect", { x: 19, y: 9, width: 3.4, height: 6, rx: 1, fill: "@lit" }]],
    rocket: [["path", { d: "M12 2.6c3 2.6 4.4 6 4.4 9.6L12 17.4 7.6 12.2c0-3.6 1.4-7 4.4-9.6z", fill: "@main", stroke: "@line" }], ["circle", { cx: 12, cy: 9.4, r: 1.8, fill: "@soft" }], ["path", { d: "M9.4 15 7 19.4l2.6-1h4.8l2.6 1L14.6 15", fill: "@deep" }]],
    planet: [["circle", { cx: 12, cy: 12, r: 6.6, fill: "@main", stroke: "@line" }], ["path", { d: "M3.4 14.6c5.6 2.4 11.6 2.4 17.2-1", fill: "none", stroke: "@lit", "stroke-width": 1.4 }], ["ellipse", { cx: 12, cy: 12, rx: 10.6, ry: 3, fill: "none", stroke: "@deep", "stroke-width": 1.6, transform: "rotate(-18 12 12)" }]],
    microbe: [["ellipse", { cx: 12, cy: 12, rx: 7.4, ry: 5.6, fill: "@main", stroke: "@line" }], ["circle", { cx: 10, cy: 11, r: 1.6, fill: "@deep" }], ["circle", { cx: 14.4, cy: 13.4, r: 1.2, fill: "@deep" }], ["path", { d: "M4.6 12 1.6 9.6M19.4 12l3-2.4M12 6.4 11 3.4M12 17.6l1 3", stroke: "@lit", "stroke-width": 1.4, "stroke-linecap": "round" }]],
    atom: [["circle", { cx: 12, cy: 12, r: 2.4, fill: "@main" }], ["ellipse", { cx: 12, cy: 12, rx: 9.4, ry: 4, fill: "none", stroke: "@lit", "stroke-width": 1.4 }], ["ellipse", { cx: 12, cy: 12, rx: 9.4, ry: 4, fill: "none", stroke: "@main", "stroke-width": 1.4, transform: "rotate(60 12 12)" }], ["ellipse", { cx: 12, cy: 12, rx: 9.4, ry: 4, fill: "none", stroke: "@main", "stroke-width": 1.4, transform: "rotate(-60 12 12)" }]],
    flask: [["path", { d: "M10 3.4h4v5l4.4 8.6a2.6 2.6 0 0 1-2.4 3.6H8a2.6 2.6 0 0 1-2.4-3.6L10 8.4z", fill: "@soft", stroke: "@line" }], ["path", { d: "M7.2 15h9.6l1.6 3a2.6 2.6 0 0 1-2.4 2.6H8a2.6 2.6 0 0 1-2.4-2.6z", fill: "@main" }]],
    syringe: [["path", { d: "M6 18 16.6 7.4l-2-2L4 16z", fill: "@soft", stroke: "@line" }], ["path", { d: "M14.6 5.4 18.6 9.4M17 3l4 4M4 16l-1.4 5.4L8 20", fill: "none", stroke: "@main", "stroke-width": 1.8, "stroke-linecap": "round" }]],
    dna: [["path", { d: "M8 3c8 4 8 14 0 18M16 3c-8 4-8 14 0 18", fill: "none", stroke: "@main", "stroke-width": 1.8 }], ["path", { d: "M9 7.4h6M8.2 12h7.6M9 16.6h6", stroke: "@lit", "stroke-width": 1.6 }]],

    /* --- paper, communication, interface --- */
    book: [["path", { d: "M4 5.4C6.6 4 9.4 4 12 5.4c2.6-1.4 5.4-1.4 8 0v13c-2.6-1.4-5.4-1.4-8 0-2.6-1.4-5.4-1.4-8 0z", fill: "@soft", stroke: "@line" }], ["path", { d: "M12 5.4v13", stroke: "@line", "stroke-width": 1.4 }], ["path", { d: "M6.4 9h3.2M6.4 12h3.2M14.4 9h3.2", stroke: "@main", "stroke-width": 1.2 }]],
    scroll: [["path", { d: "M5.4 4.6h11.2a2.6 2.6 0 0 1 2.6 2.6v10a2.6 2.6 0 0 1-2.6 2.6H7a2.6 2.6 0 0 1-2.6-2.6V7", fill: "@soft", stroke: "@line" }], ["path", { d: "M8.4 9h7M8.4 12.4h7M8.4 15.8h4", stroke: "@main", "stroke-width": 1.2, "stroke-linecap": "round" }]],
    quill: [["path", { d: "M20 3.4c-7 .8-11 4.4-12.4 9.6l-1 3.4 3.4-1c5.2-1.4 8.8-5.4 9.6-12z", fill: "@main", stroke: "@line" }], ["path", { d: "M4 20.4 11 13.4", stroke: "@deep", "stroke-width": 1.8, "stroke-linecap": "round" }]],
    ink: [["path", { d: "M9 3.6h6v3.4l-1.4 1.4h-3.2L9 7z", fill: "@deep" }], ["path", { d: "M8 8.4h8l1.6 8.6a3 3 0 0 1-3 3.4h-5.2a3 3 0 0 1-3-3.4z", fill: "@main", stroke: "@line" }]],
    envelope: [["rect", { x: 3, y: 6, width: 18, height: 12.4, rx: 2.4, fill: "@soft", stroke: "@line" }], ["path", { d: "M3.8 7.4 12 13.4l8.2-6", fill: "none", stroke: "@main", "stroke-width": 1.8 }]],
    stamp: [["rect", { x: 4.6, y: 13.6, width: 14.8, height: 6.4, rx: 1.6, fill: "@main", stroke: "@line" }], ["path", { d: "M8 13.6v-3a4 4 0 0 1 8 0v3", fill: "@soft", stroke: "@line" }], ["path", { d: "M6.4 16.8h11.2", stroke: "@lit", "stroke-width": 1.4 }]],
    clock: [["circle", { cx: 12, cy: 12, r: 8.4, fill: "@soft", stroke: "@line" }], ["path", { d: "M12 6.6V12l3.6 2.4", fill: "none", stroke: "@main", "stroke-width": 2, "stroke-linecap": "round" }]],
    hourglass: [["path", { d: "M6 3.6h12M6 20.4h12", stroke: "@line", "stroke-width": 2 }], ["path", { d: "M7.4 4.6h9.2c0 4-2.4 5.4-4.6 7.4 2.2 2 4.6 3.4 4.6 7.4H7.4c0-4 2.4-5.4 4.6-7.4-2.2-2-4.6-3.4-4.6-7.4z", fill: "@soft", stroke: "@line" }], ["path", { d: "M9.6 18.4h4.8L12 14.6z", fill: "@main" }]],
    compass: [["circle", { cx: 12, cy: 12, r: 8.4, fill: "@soft", stroke: "@line" }], ["path", { d: "M15 9l-2.4 5.6L7 17l2.4-5.6z", fill: "@main", stroke: "@line" }]],
    map: [["path", { d: "M3.4 7 8.6 5l6.8 2 5.2-2v12l-5.2 2-6.8-2-5.2 2z", fill: "@soft", stroke: "@line" }], ["path", { d: "M8.6 5v12M15.4 7v12", stroke: "@main", "stroke-width": 1.2 }]],
    magnifier: [["circle", { cx: 10.6, cy: 10.6, r: 6, fill: "none", stroke: "@main", "stroke-width": 2.4 }], ["path", { d: "M15.2 15.2 20.4 20.4", stroke: "@line", "stroke-width": 2.8, "stroke-linecap": "round" }], ["path", { d: "M8 9a3 3 0 0 1 2.6-1.6", fill: "none", stroke: "@lit", "stroke-width": 1.4 }]],
    camera: [["rect", { x: 3, y: 7, width: 18, height: 12.4, rx: 2.6, fill: "@deep", stroke: "@line" }], ["circle", { cx: 12, cy: 13.2, r: 4, fill: "@soft", stroke: "@main", "stroke-width": 1.6 }], ["path", { d: "M8.6 7l1.4-2.4h4L15.4 7", fill: "@deep", stroke: "@line" }]],
    eye: [["path", { d: "M2.6 12C5.4 7.4 8.4 5.4 12 5.4s6.6 2 9.4 6.6c-2.8 4.6-5.8 6.6-9.4 6.6s-6.6-2-9.4-6.6z", fill: "@soft", stroke: "@line" }], ["circle", { cx: 12, cy: 12, r: 3.2, fill: "@main" }], ["circle", { cx: 12, cy: 12, r: 1.4, fill: "@line" }]],
    speech: [["path", { d: "M4 5.6h16a2 2 0 0 1 2 2v7.6a2 2 0 0 1-2 2h-8l-4.6 3.4V17.2H4a2 2 0 0 1-2-2V7.6a2 2 0 0 1 2-2z", fill: "@main", stroke: "@line" }], ["path", { d: "M6.4 10.4h11.2M6.4 13.4h7", stroke: "@soft", "stroke-width": 1.4 }]],
    note: [["path", { d: "M9.4 18.4a3 3 0 1 1 0-6 3 3 0 0 1 3 3V5.6l6-1.6v3.2l-3.6 1", fill: "none", stroke: "@main", "stroke-width": 2 }], ["ellipse", { cx: 8.4, cy: 17.4, rx: 3.4, ry: 2.6, fill: "@main", stroke: "@line" }]],
    mask: [["path", { d: "M4.6 6.4h14.8v5.4c0 4.4-3.2 8-7.4 8s-7.4-3.6-7.4-8z", fill: "@soft", stroke: "@line" }], ["path", { d: "M8 11.4h2.6M13.4 11.4H16", stroke: "@line", "stroke-width": 1.8, "stroke-linecap": "round" }], ["path", { d: "M9.4 15.6c1.8 1.2 3.4 1.2 5.2 0", fill: "none", stroke: "@main", "stroke-width": 1.6 }]],
    net: [["path", { d: "M4 4h16v6a8 8 0 0 1-16 0z", fill: "none", stroke: "@main", "stroke-width": 1.6 }], ["path", { d: "M8 4v11.4M12 4v13.6M16 4v11.4M4.4 8h15.2M5.6 12h12.8", stroke: "@lit", "stroke-width": 1 }]],
    anchor: [["circle", { cx: 12, cy: 5, r: 2.4, fill: "none", stroke: "@main", "stroke-width": 1.8 }], ["path", { d: "M12 7.4V21M5.4 13.6H18.6M4 15.6c0 3.4 3.6 5.4 8 5.4s8-2 8-5.4", fill: "none", stroke: "@main", "stroke-width": 2, "stroke-linecap": "round" }]],
    barrel: [["path", { d: "M7 3.6h10c1.6 2.6 2.4 5.4 2.4 8.4S18.6 17.8 17 20.4H7c-1.6-2.6-2.4-5.4-2.4-8.4S5.4 6.2 7 3.6z", fill: "@main", stroke: "@line" }], ["path", { d: "M4.8 9h14.4M4.8 15h14.4", stroke: "@deep", "stroke-width": 1.6 }]],
    crate: [["rect", { x: 4, y: 4, width: 16, height: 16, rx: 2, fill: "@main", stroke: "@line" }], ["path", { d: "M4 4l16 16M20 4 4 20", stroke: "@deep", "stroke-width": 1.6 }]],
    bag: [["path", { d: "M6.4 8.6h11.2l2 11.8H4.4z", fill: "@main", stroke: "@line" }], ["path", { d: "M9 8.6a3 3 0 0 1 6 0", fill: "none", stroke: "@line", "stroke-width": 1.6 }]],
    hook: [["path", { d: "M14 3v7.6a4 4 0 0 1-8 0", fill: "none", stroke: "@main", "stroke-width": 2.4, "stroke-linecap": "round" }], ["circle", { cx: 14, cy: 3.6, r: 1.6, fill: "@deep" }]],
    chain: [["rect", { x: 3.4, y: 9.4, width: 8, height: 5.2, rx: 2.6, fill: "none", stroke: "@main", "stroke-width": 2 }], ["rect", { x: 12.6, y: 9.4, width: 8, height: 5.2, rx: 2.6, fill: "none", stroke: "@main", "stroke-width": 2 }], ["path", { d: "M10.4 12h3.2", stroke: "@deep", "stroke-width": 2 }]],
    bell: [["path", { d: "M12 3.4c3.6 0 5.6 2.6 5.6 6.2 0 3.6 1.4 4.6 2.4 6H4c1-1.4 2.4-2.4 2.4-6 0-3.6 2-6.2 5.6-6.2z", fill: "@main", stroke: "@line" }], ["path", { d: "M9.6 18.4a2.4 2.4 0 0 0 4.8 0", fill: "@deep", stroke: "@line" }]],
    candle: [["rect", { x: 9, y: 9, width: 6, height: 12, rx: 1.6, fill: "@soft", stroke: "@line" }], ["path", { d: "M12 3.4c1.8 2 2.6 3 2.6 4a2.6 2.6 0 0 1-5.2 0c0-1 .8-2 2.6-4z", fill: "@main" }], ["path", { d: "M12 6.6V9", stroke: "@line", "stroke-width": 1.2 }]],
    lantern: [["path", { d: "M8 6.4h8l1.6 10.4H6.4z", fill: "@main", stroke: "@line" }], ["rect", { x: 7, y: 4.4, width: 10, height: 2.4, rx: 1, fill: "@deep" }], ["rect", { x: 7.4, y: 16.6, width: 9.2, height: 2.6, rx: 1, fill: "@deep" }], ["path", { d: "M12 2.4v2M10 9.4h4v5h-4z", stroke: "@lit", "stroke-width": 1.2, fill: "rgba(255,255,255,.25)" }]],
    torch: [["path", { d: "M11 10h2v11h-2z", fill: "@deep" }], ["path", { d: "M12 2.4c2.4 2.8 3.6 4.4 3.6 6a3.6 3.6 0 0 1-7.2 0c0-1.6 1.2-3.2 3.6-6z", fill: "@main" }]],
    mirror: [["ellipse", { cx: 12, cy: 9.4, rx: 6, ry: 7, fill: "@soft", stroke: "@line" }], ["path", { d: "M9 6.4a4 4 0 0 1 3-1.4", fill: "none", stroke: "@lit", "stroke-width": 1.6 }], ["path", { d: "M12 16.4v4M9 21h6", stroke: "@deep", "stroke-width": 2 }]],
    prism: [["path", { d: "M12 3.4 20.6 19H3.4z", fill: "@soft", stroke: "@line" }], ["path", { d: "M2 12h6M14.6 12l6.4 3.4M14.6 12l6.4-2", stroke: "@main", "stroke-width": 1.6 }]],
    cross: [["path", { d: "M10 3.6h4V10h6.4v4H14v6.4h-4V14H3.6v-4H10z", fill: "@main", stroke: "@line" }]],
    skull: [["path", { d: "M12 3.4c4.6 0 7.6 3.2 7.6 7.4 0 2.4-1 4-2.4 5v2.8H6.8V15.8c-1.4-1-2.4-2.6-2.4-5 0-4.2 3-7.4 7.6-7.4z", fill: "@soft", stroke: "@line" }], ["circle", { cx: 9.2, cy: 11, r: 2, fill: "@line" }], ["circle", { cx: 14.8, cy: 11, r: 2, fill: "@line" }], ["path", { d: "M10.6 15.6h2.8", stroke: "@line", "stroke-width": 1.6 }]],
    target: [["circle", { cx: 12, cy: 12, r: 8.4, fill: "none", stroke: "@main", "stroke-width": 1.8 }], ["circle", { cx: 12, cy: 12, r: 4.8, fill: "none", stroke: "@main", "stroke-width": 1.8 }], ["circle", { cx: 12, cy: 12, r: 1.6, fill: "@lit" }]],
    hand: [["path", { d: "M8.4 13V6.4a1.6 1.6 0 0 1 3.2 0V12m0-.6V4.8a1.6 1.6 0 0 1 3.2 0V12m0-.6V6.8a1.6 1.6 0 0 1 3.2 0v7.6c0 3.6-2.4 6.4-6 6.4s-6-2.4-6-6V11a1.6 1.6 0 0 1 3.2 0", fill: "@soft", stroke: "@line" }]],
    arrow: [["path", { d: "M4 12h13M12.6 6.6 19 12l-6.4 5.4", fill: "none", stroke: "@main", "stroke-width": 2.4, "stroke-linecap": "round", "stroke-linejoin": "round" }]],
    lock2: [["rect", { x: 5, y: 10.4, width: 14, height: 10, rx: 2.6, fill: "@main", stroke: "@line" }], ["path", { d: "M8.4 10V8a3.6 3.6 0 0 1 7.2 0v2", fill: "none", stroke: "@line", "stroke-width": 2 }]],
  };

  var art = {};

  /* One icon, sized and themed. `size` is the CSS box; the viewBox stays 24 so
   * every motif keeps the same line weight at any size. */
  art.icon = function (name, opts) {
    var o = opts || {};
    var recipe = ICONS[name] || ICONS.gem;
    var p = palette(o);
    var svg = mk("svg", {
      viewBox: "0 0 24 24",
      width: o.size || "100%",
      height: o.size || "100%",
      "aria-hidden": "true",
      focusable: "false",
      class: "art-icon" + (o.cls ? " " + o.cls : ""),
    });
    if (o.title) {
      var title = mk("title");
      title.textContent = String(o.title);
      svg.appendChild(title);
      svg.removeAttribute("aria-hidden");
    }
    var kids = paintList(recipe, p);
    for (var i = 0; i < kids.length; i += 1) {
      svg.appendChild(kids[i]);
    }
    return svg;
  };

  art.has = function (name) {
    return !!ICONS[name];
  };

  art.names = function () {
    return Object.keys(ICONS);
  };

  /* A bevelled plate: the difference between a grey square and a game tile.
   * state lifts, presses or empties the plate. */
  art.tile = function (opts) {
    var o = opts || {};
    var p = palette(o);
    var state = o.state || "up";
    var svg = mk("svg", { viewBox: "0 0 48 48", class: "art-tile" + (o.cls ? " " + o.cls : ""), "aria-hidden": "true", focusable: "false" });
    var lift = state === "down" ? 1 : 0;
    svg.appendChild(mk("rect", {
      x: 3, y: 5 + lift, width: 42, height: 40, rx: o.radius === undefined ? 9 : o.radius,
      fill: state === "empty" ? "rgba(0,0,0,.28)" : p.deep,
      stroke: "rgba(0,0,0,.45)", "stroke-width": 1.4,
    }));
    if (state !== "empty") {
      svg.appendChild(mk("rect", {
        x: 3, y: 3 - lift, width: 42, height: 40, rx: o.radius === undefined ? 9 : o.radius,
        fill: state === "glow" ? p.glow : p.main,
        stroke: p.line, "stroke-width": 1.4,
      }));
      svg.appendChild(mk("path", {
        d: "M8 8h32v6a4 4 0 0 1-4 3H12a4 4 0 0 1-4-3z",
        fill: "rgba(255,255,255,.22)",
      }));
      svg.appendChild(mk("path", {
        d: "M8 36h32v3a3 3 0 0 1-3 3H11a3 3 0 0 1-3-3z",
        fill: "rgba(0,0,0,.22)",
      }));
    }
    if (o.glyph) {
      var text = mk("text", {
        x: 24, y: 25, "text-anchor": "middle", "dominant-baseline": "central",
        fill: o.glyphFill || "rgba(255,255,255,.94)",
        "font-size": o.glyphSize || 21, "font-weight": "800",
      });
      text.textContent = String(o.glyph);
      svg.appendChild(text);
    }
    if (o.icon && ICONS[o.icon]) {
      var holder = mk("g", { transform: "translate(10,10) scale(1.16)" });
      var kids = paintList(ICONS[o.icon], palette({ hue: o.iconHue === undefined ? o.hue : o.iconHue, sat: o.iconSat }));
      for (var i = 0; i < kids.length; i += 1) {
        holder.appendChild(kids[i]);
      }
      svg.appendChild(holder);
    }
    return svg;
  };

  /* Repeating surfaces. Returned as a standalone svg holding a <pattern>, so a
   * game can drop one behind its board instead of shipping a flat colour. */
  var PATTERNS = {
    felt: function (p, o) {
      return [["circle", { cx: 2, cy: 3, r: .6, fill: "rgba(255,255,255,.07)" }], ["circle", { cx: 7, cy: 8, r: .5, fill: "rgba(0,0,0,.16)" }], ["circle", { cx: 11, cy: 2, r: .4, fill: "rgba(255,255,255,.05)" }], ["circle", { cx: 4, cy: 10, r: .5, fill: "rgba(0,0,0,.12)" }]];
    },
    weave: function (p, o) {
      return [["path", { d: "M0 4h8M4 0v8", stroke: "rgba(255,255,255,.08)", "stroke-width": 1.4 }], ["path", { d: "M0 0h8v8H0z", fill: "none", stroke: "rgba(0,0,0,.14)" }]];
    },
    grid: function (p, o) {
      return [["path", { d: "M0 0h10V10", fill: "none", stroke: p.line || "rgba(255,255,255,.1)", "stroke-width": .8 }]];
    },
    stars: function (p, o) {
      return [["circle", { cx: 3, cy: 4, r: .7, fill: "rgba(255,255,255,.7)" }], ["circle", { cx: 12, cy: 9, r: .5, fill: "rgba(255,255,255,.5)" }], ["circle", { cx: 8, cy: 14, r: .4, fill: "rgba(255,255,255,.35)" }], ["circle", { cx: 16, cy: 2, r: .9, fill: "rgba(255,255,255,.6)" }]];
    },
    scales: function (p, o) {
      return [["path", { d: "M0 8a4 4 0 0 1 8 0M8 8a4 4 0 0 1 8 0", fill: "none", stroke: "rgba(255,255,255,.12)", "stroke-width": 1.2 }]];
    },
    circuit: function (p, o) {
      return [["path", { d: "M2 2v4h4M10 2v6h-4M2 10h6", fill: "none", stroke: p.glow || "rgba(0,242,255,.35)", "stroke-width": .8 }], ["circle", { cx: 2, cy: 2, r: .9, fill: p.glow || "rgba(0,242,255,.5)" }]];
    },
    honeycomb: function (p, o) {
      return [["path", { d: "M5 1l3.5 2v4L5 9l-3.5-2V3z", fill: "none", stroke: "rgba(255,255,255,.13)", "stroke-width": 1 }]];
    },
    waves: function (p, o) {
      return [["path", { d: "M0 5c2-2 4-2 6 0s4 2 6 0", fill: "none", stroke: "rgba(255,255,255,.12)", "stroke-width": 1.2 }]];
    },
    marble: function (p, o) {
      return [["path", { d: "M0 8c3-1 5-5 8-6M2 12c4-2 6-4 10-3", fill: "none", stroke: "rgba(255,255,255,.09)", "stroke-width": 1.4 }]];
    },
    planks: function (p, o) {
      return [["path", { d: "M0 0h12v6H0zM0 6h12v6H0z", fill: "none", stroke: "rgba(0,0,0,.28)", "stroke-width": 1 }], ["path", { d: "M3 0v6M9 6v6", stroke: "rgba(0,0,0,.18)", "stroke-width": 1 }]];
    },
  };

  art.pattern = function (name, opts) {
    var o = opts || {};
    var p = palette(o);
    var recipe = PATTERNS[name] || PATTERNS.felt;
    var size = o.tile || 16;
    var uid = "pat-" + name + "-" + Math.floor(Math.random() * 1e6);
    var svg = mk("svg", { class: "art-pattern" + (o.cls ? " " + o.cls : ""), "aria-hidden": "true", focusable: "false" });
    var defs = mk("defs");
    var pat = mk("pattern", { id: uid, width: size, height: size, patternUnits: "userSpaceOnUse" });
    var kids = paintList(recipe(p, o), p);
    for (var i = 0; i < kids.length; i += 1) {
      pat.appendChild(kids[i]);
    }
    defs.appendChild(pat);
    svg.appendChild(defs);
    svg.appendChild(mk("rect", { width: "100%", height: "100%", fill: "url(#" + uid + ")" }));
    return svg;
  };

  art.patterns = Object.keys(PATTERNS);

  /* Composed backdrops for the archetypes the drawer keeps landing on. These are
   * deliberately loose - a game that needs a specific room draws its own; this
   * is so no panel has to open on a flat rectangle. */
  var SCENES = {
    "night-sky": function (p) {
      return [
        ["rect", { x: 0, y: 0, width: 120, height: 80, fill: p.deep }],
        ["circle", { cx: 96, cy: 18, r: 9, fill: p.soft, opacity: .9 }],
        ["circle", { cx: 92, cy: 15, r: 9, fill: p.deep }],
        ["circle", { cx: 14, cy: 12, r: 1.2, fill: "#fff", opacity: .8 }],
        ["circle", { cx: 38, cy: 26, r: .9, fill: "#fff", opacity: .6 }],
        ["circle", { cx: 62, cy: 10, r: 1.1, fill: "#fff", opacity: .7 }],
        ["circle", { cx: 26, cy: 40, r: .8, fill: "#fff", opacity: .5 }],
        ["path", { d: "M0 62c16-8 26 4 40-2s24 6 40 0 26 4 40-2v22H0z", fill: p.main, opacity: .9 }],
      ];
    },
    sea: function (p) {
      return [
        ["rect", { x: 0, y: 0, width: 120, height: 80, fill: p.deep }],
        ["path", { d: "M0 20c10-6 20-6 30 0s20 6 30 0 20-6 30 0 15 5 30 0", fill: "none", stroke: p.lit, "stroke-width": 2, opacity: .7 }],
        ["path", { d: "M0 36c10-6 20-6 30 0s20 6 30 0 20-6 30 0 15 5 30 0", fill: "none", stroke: p.main, "stroke-width": 2, opacity: .6 }],
        ["path", { d: "M0 70c14-10 28 6 42-2s26 8 40 0 22 6 38-2v14H0z", fill: p.line, opacity: .8 }],
        ["circle", { cx: 22, cy: 54, r: 3, fill: p.soft, opacity: .5 }],
        ["circle", { cx: 30, cy: 46, r: 2, fill: p.soft, opacity: .4 }],
      ];
    },
    dungeon: function (p) {
      return [
        ["rect", { x: 0, y: 0, width: 120, height: 80, fill: p.deep }],
        ["path", { d: "M0 0h120v18H0z", fill: "rgba(0,0,0,.3)" }],
        ["path", { d: "M10 18v62M34 18v62M58 18v62M82 18v62M106 18v62", stroke: "rgba(0,0,0,.35)", "stroke-width": 2 }],
        ["path", { d: "M0 40h120M0 62h120", stroke: "rgba(0,0,0,.28)", "stroke-width": 2 }],
        ["rect", { x: 48, y: 30, width: 24, height: 40, rx: 12, fill: "rgba(0,0,0,.55)" }],
        ["circle", { cx: 18, cy: 26, r: 4, fill: p.glow, opacity: .8 }],
      ];
    },
    forest: function (p) {
      return [
        ["rect", { x: 0, y: 0, width: 120, height: 80, fill: p.deep }],
        ["path", { d: "M18 62 28 30l10 32z", fill: p.main }],
        ["path", { d: "M44 64 56 26l12 38z", fill: p.lit, opacity: .85 }],
        ["path", { d: "M74 62 84 34l10 28z", fill: p.main }],
        ["rect", { x: 0, y: 62, width: 120, height: 18, fill: p.line }],
        ["path", { d: "M8 68c6-4 10 4 16 0M92 70c6-4 12 4 18 0", stroke: "rgba(255,255,255,.14)", "stroke-width": 2, fill: "none" }],
      ];
    },
    kitchen: function (p) {
      return [
        ["rect", { x: 0, y: 0, width: 120, height: 80, fill: p.soft }],
        ["rect", { x: 0, y: 46, width: 120, height: 34, fill: p.main }],
        ["path", { d: "M0 46h120", stroke: p.line, "stroke-width": 2 }],
        ["rect", { x: 10, y: 8, width: 26, height: 18, rx: 2, fill: "rgba(255,255,255,.55)", stroke: p.line }],
        ["rect", { x: 44, y: 8, width: 26, height: 18, rx: 2, fill: "rgba(255,255,255,.55)", stroke: p.line }],
        ["circle", { cx: 88, cy: 58, r: 9, fill: "rgba(255,255,255,.35)", stroke: p.line }],
      ];
    },
    space: function (p) {
      return [
        ["rect", { x: 0, y: 0, width: 120, height: 80, fill: "#05070f" }],
        ["circle", { cx: 92, cy: 24, r: 14, fill: p.main, opacity: .9 }],
        ["path", { d: "M76 24a16 6 0 0 0 32 0", fill: "none", stroke: p.lit, "stroke-width": 2, opacity: .8 }],
        ["circle", { cx: 20, cy: 16, r: 1.4, fill: "#fff" }],
        ["circle", { cx: 40, cy: 52, r: 1, fill: "#fff", opacity: .7 }],
        ["circle", { cx: 60, cy: 68, r: 1.2, fill: "#fff", opacity: .5 }],
        ["circle", { cx: 12, cy: 62, r: .9, fill: "#fff", opacity: .6 }],
      ];
    },
    garden: function (p) {
      return [
        ["rect", { x: 0, y: 0, width: 120, height: 80, fill: p.deep }],
        ["rect", { x: 0, y: 50, width: 120, height: 30, fill: "hsl(28,32%,26%)" }],
        ["path", { d: "M0 50h120", stroke: "rgba(255,255,255,.14)", "stroke-width": 2 }],
        ["path", { d: "M20 50V34M20 40c-6 0-9-4-9-9 6 0 9 4 9 9zM20 38c6 0 9-4 9-9-6 0-9 4-9 9z", stroke: p.lit, "stroke-width": 2, fill: "none" }],
        ["circle", { cx: 60, cy: 30, r: 6, fill: p.main }],
        ["path", { d: "M60 36v14", stroke: p.lit, "stroke-width": 2 }],
        ["circle", { cx: 94, cy: 38, r: 5, fill: p.soft }],
        ["path", { d: "M94 43v7", stroke: p.lit, "stroke-width": 2 }],
      ];
    },
    city: function (p) {
      return [
        ["rect", { x: 0, y: 0, width: 120, height: 80, fill: p.deep }],
        ["rect", { x: 8, y: 30, width: 16, height: 50, fill: p.line }],
        ["rect", { x: 30, y: 16, width: 20, height: 64, fill: p.main, opacity: .9 }],
        ["rect", { x: 56, y: 36, width: 14, height: 44, fill: p.line }],
        ["rect", { x: 76, y: 22, width: 22, height: 58, fill: p.main, opacity: .8 }],
        ["path", { d: "M34 24h4M42 24h4M34 32h4M42 32h4M80 30h4M88 30h4", stroke: p.glow, "stroke-width": 2, opacity: .8 }],
      ];
    },
  };

  art.scene = function (name, opts) {
    var o = opts || {};
    var p = palette({ hue: o.hue, sat: o.sat, tone: "deep" });
    var recipe = SCENES[name] || SCENES["night-sky"];
    var svg = mk("svg", {
      viewBox: "0 0 120 80", preserveAspectRatio: "none",
      class: "art-scene" + (o.cls ? " " + o.cls : ""), "aria-hidden": "true", focusable: "false",
    });
    var kids = paintList(recipe(p, o), p);
    for (var i = 0; i < kids.length; i += 1) {
      svg.appendChild(kids[i]);
    }
    return svg;
  };

  art.scenes = Object.keys(SCENES);

  /* A plaque/label with a ribbon tail - for HUD read-outs that should look
   * manufactured rather than like a paragraph. */
  art.plaque = function (opts) {
    var o = opts || {};
    var p = palette(o);
    var svg = mk("svg", { viewBox: "0 0 100 32", preserveAspectRatio: "none", class: "art-plaque", "aria-hidden": "true", focusable: "false" });
    svg.appendChild(mk("rect", { x: 1.5, y: 3, width: 97, height: 26, rx: 7, fill: p.deep, stroke: p.main, "stroke-width": 1.6 }));
    svg.appendChild(mk("rect", { x: 4, y: 5.5, width: 92, height: 8, rx: 4, fill: "rgba(255,255,255,.1)" }));
    return svg;
  };

  /* A framed mount for artwork or a board - the thing that makes item-quest's
   * scene read as a picture rather than a screenshot. */
  art.frame = function (opts) {
    var o = opts || {};
    var p = palette(o);
    var svg = mk("svg", { viewBox: "0 0 100 100", preserveAspectRatio: "none", class: "art-frame", "aria-hidden": "true", focusable: "false" });
    svg.appendChild(mk("rect", { x: 0, y: 0, width: 100, height: 100, fill: "none", stroke: p.main, "stroke-width": 6 }));
    svg.appendChild(mk("rect", { x: 4, y: 4, width: 92, height: 92, fill: "none", stroke: p.deep, "stroke-width": 2 }));
    svg.appendChild(mk("rect", { x: 2, y: 2, width: 96, height: 20, fill: "rgba(255,255,255,.12)" }));
    return svg;
  };

  App.art = art;
})(window.CapitalConvert = window.CapitalConvert || {});
