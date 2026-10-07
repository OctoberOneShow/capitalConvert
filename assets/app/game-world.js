/* Original vector scenery and game-piece drawing. No downloads, permanent
 * timers, canvas interception or game-rule changes. Renderers opt in explicitly. */
(function (App) {
  "use strict";
  var serial = 0;
  var NS = "http://www.w3.org/2000/svg";
  var worlds = {
    space: [224, "#070d24", "#182c50", "#93dfff", "#d5a6ff"],
    ocean: [190, "#05232e", "#126078", "#7fe6df", "#ffb493"],
    forest: [153, "#112b2b", "#285843", "#b4dfa3", "#ffe0a0"],
    city: [263, "#16172f", "#49395e", "#d3b1ff", "#ffd2a0"],
    workshop: [28, "#2c211d", "#75513e", "#ffd19a", "#9be0db"],
    archive: [35, "#272326", "#65514a", "#ecd9b4", "#a6ccc3"],
    neon: [291, "#161129", "#40305c", "#fa9cdd", "#87e7f0"],
    garden: [135, "#1c342f", "#416847", "#d5e7b0", "#ffc7b8"],
    laboratory: [178, "#102b31", "#285969", "#a2ece2", "#d6bcff"],
    stage: [327, "#2b1833", "#66365a", "#ffc1dc", "#fae2a4"],
    tabletop: [161, "#172f30", "#3a5752", "#dbdcae", "#eac09e"],
    ice: [211, "#152b46", "#385a78", "#c2e9ff", "#bbbdff"]
  };
  function svgNode(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (key) { n.setAttribute(key, String(attrs[key])); });
    if (parent) { parent.appendChild(n); }
    return n;
  }
  function scene(kind, seed) {
    var p = worlds[kind] || worlds.space;
    var uid = "world-" + (++serial);
    var svg = svgNode("svg", { viewBox: "0 0 400 140", preserveAspectRatio: "xMidYMid slice", "aria-hidden": "true", focusable: "false", class: "world-landscape" });
    var defs = svgNode("defs", {}, svg);
    var sky = svgNode("linearGradient", { id: uid, x2: "0", y2: "1" }, defs);
    svgNode("stop", { offset: "0", "stop-color": p[1] }, sky);
    svgNode("stop", { offset: "1", "stop-color": p[2] }, sky);
    function rect(x, y, w, h, color, r, parent) { return svgNode("rect", { x: x, y: y, width: w, height: h, rx: r || 0, fill: color }, parent || svg); }
    function path(d, fill, stroke, width, parent) { return svgNode("path", { d: d, fill: fill || "none", stroke: stroke || "none", "stroke-width": width || 1, "stroke-linecap": "round", "stroke-linejoin": "round" }, parent || svg); }
    function circle(x, y, r, fill, parent) { return svgNode("circle", { cx: x, cy: y, r: r, fill: fill }, parent || svg); }
    rect(0, 0, 400, 140, "url(#" + uid + ")");
    var distant = svgNode("g", { opacity: ".32" }, svg);
    for (var j = 0; j < 20; j += 1) { circle((j * 73 + seed * 11) % 400, (j * 23 + 7) % 90, j % 3 === 0 ? 1.4 : .7, p[3], distant); }
    if (kind === "space" || kind === "neon") {
      circle(316, 41, 28, p[2]); circle(311, 35, 24, p[4]);
      path("M275 56C292 29 354 23 364 36C374 49 324 72 281 63", "none", p[3], 2);
      path("M0 127L85 94 151 117 217 87 292 117 358 102 400 115V140H0Z", p[1]);
      path("M190 0L239 56M220 0L245 34", "none", p[3], 1.2);
      if (kind === "neon") { for (j = 0; j < 7; j += 1) { path("M" + (j * 68 - 40) + " 140L200 80", "none", p[3], .7); } path("M0 113H400M0 127H400", "none", p[3], .7); }
    } else if (kind === "ocean") {
      for (j = 0; j < 5; j += 1) { path("M" + (210 + j * 36) + " 0L" + (80 + j * 70) + " 130", "none", "#b5f5ef22", 15); }
      path("M0 118Q65 99 120 118T250 117T400 110V140H0Z", p[1]);
      for (j = 0; j < 7; j += 1) { var x = 242 + j * 23; path("M" + x + " 135q-10-22 2-38m-2 25q-17-10-15-23m15 13q17-7 13-22", "none", j % 2 ? p[3] : p[4], 4); }
      for (j = 0; j < 5; j += 1) { svgNode("ellipse", { cx: 280 + j * 17, cy: 41 + j % 2 * 8, rx: 5, ry: 2, fill: p[3] }, svg); }
      circle(350, 78, 5, "#ffffff22"); circle(342, 63, 3, "#ffffff33"); circle(358, 48, 2, "#ffffff33");
    } else if (kind === "forest" || kind === "garden" || kind === "ice") {
      circle(316, 30, 16, p[4]);
      path("M0 94L61 38 105 75 174 25 234 92 300 49 400 91V140H0Z", p[2]);
      if (kind === "ice") { path("M144 50L174 25 202 53 180 46 167 56 161 43Z", p[3]); }
      path("M0 118Q90 86 186 118T400 103V140H0Z", p[1]);
      for (j = 0; j < 6; j += 1) { var tx = 221 + j * 32; var ty = 52 + j % 3 * 14; path("M" + tx + " 130V" + ty, "none", p[4], 2); path("M" + (tx - 15) + " " + (ty + 38) + "L" + tx + " " + ty + "L" + (tx + 15) + " " + (ty + 38) + "Z", j % 2 ? p[2] : p[3]); }
      if (kind === "garden") { for (j = 0; j < 7; j += 1) { circle(248 + j * 19, 116 + j % 2 * 7, 3, p[4]); } }
    } else if (kind === "city") {
      circle(327, 27, 17, p[4]);
      for (j = 0; j < 8; j += 1) { var bx = j * 54 + 5; var by = 44 + (j * 29 + seed) % 48; rect(bx, by, 42, 140 - by, j % 2 ? p[1] : p[2], 2); for (var wy = by + 10; wy < 125; wy += 13) { rect(bx + 9, wy, 4, 5, p[4], 1); rect(bx + 26, wy, 4, 5, p[3], 1); } }
      path("M0 130H400", "none", p[3], 2); path("M326 40V18m-7 6q7-10 14 0", "none", p[3], 2);
    } else if (kind === "workshop" || kind === "archive") {
      for (j = 0; j < 5; j += 1) { rect(220 + j * 36, 24, 28, 88, p[1], 3); for (var b = 0; b < 4; b += 1) { rect(223 + j * 36 + b * 6, 35 + (b % 2) * 6, 4, 26, b % 2 ? p[3] : p[4], 1); } path("M" + (220 + j * 36) + " 67h28", "none", p[3], 2); }
      rect(202, 113, 198, 27, p[1], 2); path("M320 113V74L345 61", "none", p[4], 4);
      path("M336 59Q350 39 365 59L369 65H331Z", p[4]);
      if (kind === "workshop") { path("M271 106H313L302 96H280Z", p[3]); path("M287 93L305 78", "none", p[4], 5); }
    } else if (kind === "laboratory") {
      rect(255, 14, 121, 69, p[1], 8); path("M265 65L280 65 290 38 303 70 312 50 338 50 348 31 365 31", "none", p[3], 2);
      rect(217, 114, 183, 26, p[1], 3);
      for (j = 0; j < 3; j += 1) { var fx = 264 + j * 45; path("M" + fx + " 85v12l-12 19q0 7 12 7h10q12 0 12-7l-12-19V85Z", p[2], p[3], 2); rect(fx - 5, 109, 19, 9, j % 2 ? p[4] : p[3], 3); }
    } else if (kind === "stage") {
      path("M0 0H95L48 139H0ZM400 0H325L368 139H400Z", p[1]);
      path("M265 0L195 133H365L313 0Z", "#ffecc51c");
      path("M0 131Q200 109 400 131V140H0Z", p[1]);
      path("M291 89V43L322 37V81", "none", p[4], 5); svgNode("ellipse", { cx: 281, cy: 92, rx: 12, ry: 7, fill: p[4] }, svg); svgNode("ellipse", { cx: 312, cy: 84, rx: 12, ry: 7, fill: p[4] }, svg);
    } else {
      path("M190 140L242 41H367L400 140Z", p[2], p[4], 2);
      for (j = 0; j < 5; j += 1) { path("M" + (215 + j * 36) + " 135L" + (249 + j * 26) + " 47", "none", "#ffffff18", 1); path("M" + (236 - j * 9) + " " + (56 + j * 17) + "H" + (372 + j * 6), "none", "#ffffff18", 1); }
      circle(289, 97, 16, p[1]); circle(328, 79, 13, p[3]); circle(265, 69, 11, p[1]);
      path("M282 90q8-7 14 0M321 74q5-4 10 0", "none", "#ffffff66", 2);
    }
    return svg;
  }

  function round(ctx, x, y, w, h, r, fill, stroke) {
    ctx.beginPath();
    if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); } else { ctx.rect(x, y, w, h); }
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
  }
  function disk(ctx, x, y, r, fill) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); }
  function line(ctx, points, color, width) {
    ctx.beginPath(); ctx.moveTo(points[0], points[1]);
    for (var i = 2; i < points.length; i += 2) { ctx.lineTo(points[i], points[i + 1]); }
    ctx.strokeStyle = color; ctx.lineWidth = width || 1; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke();
  }
  function backdrop(ctx, w, h, kind) {
    var p = worlds[kind] || worlds.space;
    ctx.save();
    var g = ctx.createLinearGradient(0, 0, w * .4, h);
    g.addColorStop(0, p[1]); g.addColorStop(1, p[2]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = .15;
    if (kind === "space" || kind === "neon") {
      for (var i = 0; i < 38; i += 1) { disk(ctx, (i * 97 + 13) % w, (i * 43 + 17) % h, i % 3 ? .8 : 1.6, p[3]); }
      var nebula = ctx.createRadialGradient(w * .85, h * .2, 0, w * .85, h * .2, w * .45);
      nebula.addColorStop(0, p[4]); nebula.addColorStop(1, "transparent"); ctx.fillStyle = nebula; ctx.fillRect(0, 0, w, h);
    } else if (kind === "ocean") {
      for (var ray = 0; ray < 5; ray += 1) { line(ctx, [w * (.2 + ray * .18), 0, w * (ray * .18 - .3), h], p[3], 12); }
      ctx.globalAlpha = .2;
      for (var b = 0; b < 12; b += 1) { ctx.beginPath(); ctx.arc((b * 47 + 18) % w, (b * 61 + 20) % h, 2 + b % 3, 0, Math.PI * 2); ctx.strokeStyle = p[3]; ctx.lineWidth = .8; ctx.stroke(); }
    } else {
      for (var y = 0; y < h; y += 24) { line(ctx, [0, y, w, y + 7], p[3], .6); }
      for (var x = 0; x < w; x += 36) { line(ctx, [x, 0, x - 20, h], p[3], .5); }
    }
    ctx.restore();
  }
  /* Draw a physical piece in a 32-unit box, preserving the renderer's state. */
  function piece(ctx, kind, x, y, size, color, variant) {
    ctx.save(); ctx.translate(x - size / 2, y - size / 2); ctx.scale(size / 32, size / 32);
    ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.lineWidth = 1.2;
    color = color || "#9de2df";
    var ink = "#102735", light = "#fff1ce";
    if (kind === "ship" || kind === "invader") {
      ctx.fillStyle = color; ctx.beginPath();
      ctx.moveTo(16, 2); ctx.lineTo(29, 26); ctx.lineTo(20, 22); ctx.lineTo(16, 28); ctx.lineTo(12, 22); ctx.lineTo(3, 26); ctx.closePath(); ctx.fill();
      line(ctx, [16, 5, 16, 20], light, 1.3); round(ctx, 12, 12, 8, 7, 3, ink);
      if (kind === "invader") { disk(ctx, 13, 15, 1.5, light); disk(ctx, 19, 15, 1.5, light); }
      else { line(ctx, [13, 28, 16, 32, 19, 28], "#ffd18c", 2); }
    } else if (kind === "house") {
      round(ctx, 5, 13, 22, 16, 2, light, ink); ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(2, 14); ctx.lineTo(16, 3); ctx.lineTo(30, 14); ctx.closePath(); ctx.fill();
      round(ctx, 13, 20, 6, 9, 1, ink); round(ctx, 8, 17, 4, 4, 1, color); round(ctx, 22, 17, 3, 4, 1, color);
    } else if (kind === "mountain") {
      ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(2, 29); ctx.lineTo(15, 3); ctx.lineTo(31, 29); ctx.closePath(); ctx.fill();
      ctx.fillStyle = light; ctx.beginPath(); ctx.moveTo(15, 3); ctx.lineTo(22, 15); ctx.lineTo(16, 12); ctx.lineTo(12, 16); ctx.lineTo(10, 14); ctx.closePath(); ctx.fill();
      line(ctx, [15, 17, 21, 29], ink, 1);
    } else if (kind === "wave" || kind === "cloud") {
      if (kind === "cloud") { disk(ctx, 10, 15, 7, color); disk(ctx, 19, 12, 9, color); round(ctx, 3, 15, 27, 8, 4, color); }
      else { for (var wy = 8; wy < 28; wy += 8) { ctx.beginPath(); ctx.moveTo(2, wy); ctx.quadraticCurveTo(8, wy - 6, 15, wy); ctx.quadraticCurveTo(23, wy + 6, 30, wy); ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke(); } }
    } else if (kind === "train") {
      round(ctx, 2, 9, 28, 17, 5, color, ink); round(ctx, 5, 12, 8, 6, 1, ink); round(ctx, 17, 12, 8, 6, 1, ink);
      line(ctx, [4, 21, 28, 21], light, 1.5); disk(ctx, 8, 27, 3, ink); disk(ctx, 24, 27, 3, ink); disk(ctx, 8, 27, 1, light); disk(ctx, 24, 27, 1, light);
    } else if (kind === "crate") {
      round(ctx, 3, 3, 26, 26, 3, color, ink); round(ctx, 7, 7, 18, 18, 1, "#ffffff18", ink); line(ctx, [7, 7, 25, 25], ink, 2); line(ctx, [25, 7, 7, 25], ink, 2); disk(ctx, 5, 5, 1, light); disk(ctx, 27, 27, 1, light);
    } else if (kind === "agent" || kind === "guard") {
      disk(ctx, 16, 12, 8, light); round(ctx, 6, 20, 20, 12, 5, color);
      if (kind === "agent") { round(ctx, 6, 4, 20, 10, 4, color); round(ctx, 8, 11, 16, 6, 2, ink); disk(ctx, 13, 14, 1, light); disk(ctx, 20, 14, 1, light); }
      else { round(ctx, 6, 4, 20, 7, 2, color); line(ctx, [6, 11, 27, 11], ink, 2); disk(ctx, 12, 14, 1, ink); disk(ctx, 20, 14, 1, ink); }
      line(ctx, [13, 23, 16, 27, 19, 23], light, 1.2);
    } else if (kind === "key") {
      ctx.beginPath(); ctx.arc(10, 10, 6, 0, Math.PI * 2); ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.stroke(); line(ctx, [14, 14, 28, 28, 28, 23], color, 3); line(ctx, [22, 22, 22, 27], color, 3);
    } else if (kind === "door") {
      round(ctx, 5, 2, 22, 29, 4, color, ink); round(ctx, 9, 6, 14, 23, 2, ink); disk(ctx, 20, 18, 1.5, light);
    } else if (kind === "book") {
      round(ctx, 5, 3, 22, 26, 2, color, ink); line(ctx, [10, 3, 10, 29], light, 1); line(ctx, [14, 10, 23, 10, 23, 12], light, 1.5); line(ctx, [14, 16, 23, 16], light, 1.5);
    } else if (kind === "coral") {
      var branches = variant === "bar" ? 3 : variant === "ring" ? 6 : 5;
      line(ctx, [16, 29, 16, 12], color, 4);
      for (var c = 0; c < branches; c += 1) { var side = c % 2 ? 1 : -1; var cy = 12 + c * 2.4; line(ctx, [16, cy + 7, 16 + side * (6 + c % 3 * 2), cy + 1, 16 + side * (7 + c % 3 * 2), cy - 4], color, 3); disk(ctx, 16 + side * (7 + c % 3 * 2), cy - 4, 1.5, light); }
      disk(ctx, 16, 9, 2.5, light);
    } else if (kind === "disc") {
      var g = ctx.createRadialGradient(11, 9, 1, 17, 19, 15); g.addColorStop(0, variant ? "#ffffff" : "#63717d"); g.addColorStop(1, variant ? "#d6dfd9" : "#121e28");
      disk(ctx, 16, 18, 13, "#00000066"); disk(ctx, 16, 15, 12, g); ctx.beginPath(); ctx.arc(16, 15, 9.5, 3.7, 5.3); ctx.strokeStyle = "#ffffff66"; ctx.lineWidth = 1.5; ctx.stroke();
    }
    ctx.restore();
  }
  function portrait(seed) {
    var index = String(seed).split("").reduce(function (sum, char) { return sum + char.charCodeAt(0); }, 0);
    var coats = ["#a7c2a4", "#d5a787", "#b1a9cd", "#8ebbc1", "#d2be90"];
    var skin = ["#f0ceb2", "#d9ac8c", "#edc5a5"][index % 3];
    var hair = ["#493c3a", "#252e35", "#8b8279"][index % 3];
    var svg = svgNode("svg", { viewBox: "0 0 90 104", class: "world-tea-portrait", "aria-hidden": "true", focusable: "false" });
    svgNode("circle", { cx: 45, cy: 42, r: 33, fill: "#d1c29714" }, svg);
    svgNode("path", { d: "M8 104Q9 70 34 68H56Q81 71 83 104Z", fill: coats[index % coats.length] }, svg);
    svgNode("path", { d: "M37 58H53V75L45 83 37 75Z", fill: skin }, svg);
    svgNode("ellipse", { cx: 45, cy: 36, rx: 24, ry: 29, fill: hair }, svg);
    svgNode("ellipse", { cx: 45, cy: 40, rx: 19, ry: 25, fill: skin }, svg);
    svgNode("path", { d: index % 2 ? "M25 32Q21 2 47 10Q72 6 65 34L53 19 40 28Z" : "M24 35Q21 6 48 9Q73 15 63 34L57 19Q41 35 24 35Z", fill: hair }, svg);
    svgNode("path", { d: "M32 38q4-3 8 0M51 38q4-3 8 0", fill: "none", stroke: "#534438", "stroke-width": 1.3, "stroke-linecap": "round" }, svg);
    svgNode("circle", { cx: 36, cy: 41, r: 1.4, fill: "#342f32" }, svg); svgNode("circle", { cx: 55, cy: 41, r: 1.4, fill: "#342f32" }, svg);
    svgNode("path", { d: "M44 42l-2 8h5M40 55q5 4 11 0", fill: "none", stroke: "#ac7760", "stroke-width": 1.2, "stroke-linecap": "round" }, svg);
    svgNode("path", { d: "M35 73L45 84 54 73M45 84V104", fill: "none", stroke: "#293c3866", "stroke-width": 2 }, svg);
    if (index % 3 === 0) { svgNode("path", { d: "M28 40h15v8H28ZM49 40h15v8H49ZM43 43h6", fill: "none", stroke: "#675947", "stroke-width": 1.2 }, svg); }
    return svg;
  }
  function cup(index) {
    var colors = ["#a9cbb3", "#c18b62", "#e7c685", "#b9a5c8", "#c5d1a4", "#98cbd1"];
    var svg = svgNode("svg", { viewBox: "0 0 40 40", class: "world-cup-art", "aria-hidden": "true", focusable: "false" });
    svgNode("ellipse", { cx: 19, cy: 34, rx: 16, ry: 3, fill: "#fff0ce44" }, svg);
    svgNode("path", { d: "M29 17h4q7 0 4 8q-2 3-8 3", fill: "none", stroke: colors[index % 6], "stroke-width": 3 }, svg);
    svgNode("path", { d: "M5 16H31L28 30Q18 36 8 30Z", fill: colors[index % 6], stroke: "#142d34", "stroke-width": 1 }, svg);
    svgNode("ellipse", { cx: 18, cy: 16, rx: 13, ry: 3, fill: "#efdec1" }, svg);
    svgNode("ellipse", { cx: 18, cy: 16, rx: 10, ry: 2, fill: "#85603b" }, svg);
    svgNode("path", { d: "M11 9q-3-3 1-6M20 10q4-3 0-7M26 8q-2-2 1-5", fill: "none", stroke: "#fff4cf77", "stroke-width": 1.4, "stroke-linecap": "round" }, svg);
    return svg;
  }
  App.world = { scene: scene, backdrop: backdrop, piece: piece, portrait: portrait, cup: cup, palettes: worlds };
})(window.CapitalConvert = window.CapitalConvert || {});
