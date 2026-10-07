/* Glyph Four - The column-drop duel campaign in the shared game drawer.
 * Drop generation, win detection and the minimax ranks are pure and
 * exported; the checks replay full AI-vs-AI games so no rank ever drops
 * into a full column or misses a legal reply. */
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
  var c4Size = 320;
  var C4_W = 7;
  var C4_H = 6;
  var C4_EMPTY = 0;
  var C4_PLAYER = 1;
  var C4_AI = 2;
  /* Ranks: depth of alpha-beta search plus noise. Star thresholds are
   * your disc counts on the board when you win - sharper wins shine. */
  var c4Levels = [
    { id: "f1", labelKey: "c4L1", depth: 0, noise: 0.55, starMoves: [8, 10, 13] },
    { id: "f2", labelKey: "c4L2", depth: 1, noise: 0.3, starMoves: [8, 10, 13] },
    { id: "f3", labelKey: "c4L3", depth: 2, noise: 0.15, starMoves: [8, 10, 12] },
    { id: "f4", labelKey: "c4L4", depth: 3, noise: 0.05, starMoves: [7, 9, 12] },
    { id: "f5", labelKey: "c4L5", depth: 4, noise: 0, starMoves: [7, 9, 11] },
    { id: "f6", labelKey: "c4L6", depth: 5, noise: 0, starMoves: [6, 8, 11] },
    { id: "f7", labelKey: "c4L7", depth: 6, noise: 0, starMoves: [6, 8, 10] },
    { id: "f8", labelKey: "c4L8", depth: 7, noise: 0, starMoves: [6, 8, 10] },
  ];

  /* Pure rules, exported for the static checks. */
  function c4DropRow(board, col) {
    for (var row = C4_H - 1; row >= 0; row -= 1) {
      if (board[row * C4_W + col] === C4_EMPTY) {
        return row;
      }
    }
    return -1;
  }

  function c4WinLine(board, player) {
    var dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
    for (var y = 0; y < C4_H; y += 1) {
      for (var x = 0; x < C4_W; x += 1) {
        for (var d = 0; d < dirs.length; d += 1) {
          var line = [];
          for (var k = 0; k < 4; k += 1) {
            var nx = x + dirs[d][0] * k;
            var ny = y + dirs[d][1] * k;
            if (nx < 0 || ny < 0 || nx >= C4_W || ny >= C4_H) {
              line = null;
              break;
            }
            var index = ny * C4_W + nx;
            if (board[index] !== player) {
              line = null;
              break;
            }
            line.push(index);
          }
          if (line && line.length === 4) {
            return line;
          }
        }
      }
    }
    return null;
  }

  function c4Full(board) {
    for (var c = 0; c < C4_W; c += 1) {
      if (board[c] === C4_EMPTY) {
        return false;
      }
    }
    return true;
  }

  function c4Evaluate(board) {
    function windowScore(a, b, c, d) {
      var ai = 0;
      var human = 0;
      var cells = [a, b, c, d];
      for (var i = 0; i < 4; i += 1) {
        if (cells[i] === C4_AI) {
          ai += 1;
        } else if (cells[i] === C4_PLAYER) {
          human += 1;
        }
      }
      if (ai && human) {
        return 0;
      }
      if (ai === 4) {
        return 100000;
      }
      if (human === 4) {
        return -100000;
      }
      if (ai === 3) {
        return 60;
      }
      if (human === 3) {
        return -80;
      }
      if (ai === 2) {
        return 8;
      }
      if (human === 2) {
        return -10;
      }
      return 0;
    }
    var score = 0;
    for (var y = 0; y < C4_H; y += 1) {
      for (var x = 0; x < C4_W; x += 1) {
        if (x + 3 < C4_W) {
          score += windowScore(
            board[y * C4_W + x],
            board[y * C4_W + x + 1],
            board[y * C4_W + x + 2],
            board[y * C4_W + x + 3],
          );
        }
        if (y + 3 < C4_H) {
          score += windowScore(
            board[y * C4_W + x],
            board[(y + 1) * C4_W + x],
            board[(y + 2) * C4_W + x],
            board[(y + 3) * C4_W + x],
          );
        }
        if (x + 3 < C4_W && y + 3 < C4_H) {
          score += windowScore(
            board[y * C4_W + x],
            board[(y + 1) * C4_W + x + 1],
            board[(y + 2) * C4_W + x + 2],
            board[(y + 3) * C4_W + x + 3],
          );
        }
        if (x + 3 < C4_W && y - 3 >= 0) {
          score += windowScore(
            board[y * C4_W + x],
            board[(y - 1) * C4_W + x + 1],
            board[(y - 2) * C4_W + x + 2],
            board[(y - 3) * C4_W + x + 3],
          );
        }
      }
    }
    /* Slight centre preference. */
    for (var r = 0; r < C4_H; r += 1) {
      for (var cc = 0; cc < C4_W; cc += 1) {
        if (board[r * C4_W + cc] === C4_AI) {
          score += 3 - Math.abs(3 - cc);
        } else if (board[r * C4_W + cc] === C4_PLAYER) {
          score -= 3 - Math.abs(3 - cc);
        }
      }
    }
    return score;
  }

  function c4Pick(board, rank) {
    var order = [3, 2, 4, 1, 5, 0, 6];
    var columns = order.filter(function (col) {
      return c4DropRow(board, col) !== -1;
    });
    if (!columns.length) {
      return -1;
    }
    if (rank.depth === 0) {
      /* Greedy: win now, block now, otherwise a noisy centre bias. */
      for (var p = 0; p < columns.length; p += 1) {
        var col = columns[p];
        var row = c4DropRow(board, col);
        board[row * C4_W + col] = C4_AI;
        var winning = c4WinLine(board, C4_AI);
        board[row * C4_W + col] = C4_EMPTY;
        if (winning) {
          return col;
        }
      }
      for (var q = 0; q < columns.length; q += 1) {
        var col2 = columns[q];
        var row2 = c4DropRow(board, col2);
        board[row2 * C4_W + col2] = C4_PLAYER;
        var threat = c4WinLine(board, C4_PLAYER);
        board[row2 * C4_W + col2] = C4_EMPTY;
        if (threat) {
          return col2;
        }
      }
      if (rank.noise && Math.random() < rank.noise) {
        return columns[Math.floor(Math.random() * columns.length)];
      }
      return columns[0];
    }
    function search(state, depth, alpha, beta, maximising) {
      if (c4WinLine(state, C4_AI)) {
        return 100000 - (rank.depth - depth) * 100;
      }
      if (c4WinLine(state, C4_PLAYER)) {
        return -100000 + (rank.depth - depth) * 100;
      }
      if (c4Full(state) || depth === 0) {
        return c4Evaluate(state);
      }
      var cols = order.filter(function (col) {
        return c4DropRow(state, col) !== -1;
      });
      if (maximising) {
        var best = -Infinity;
        for (var i = 0; i < cols.length; i += 1) {
          var row3 = c4DropRow(state, cols[i]);
          state[row3 * C4_W + cols[i]] = C4_AI;
          var v = search(state, depth - 1, alpha, beta, false);
          state[row3 * C4_W + cols[i]] = C4_EMPTY;
          if (v > best) {
            best = v;
          }
          if (best > alpha) {
            alpha = best;
          }
          if (alpha >= beta) {
            break;
          }
        }
        return best;
      }
      var worst = Infinity;
      for (var j = 0; j < cols.length; j += 1) {
        var row4 = c4DropRow(state, cols[j]);
        state[row4 * C4_W + cols[j]] = C4_PLAYER;
        var v2 = search(state, depth - 1, alpha, beta, true);
        state[row4 * C4_W + cols[j]] = C4_EMPTY;
        if (v2 < worst) {
          worst = v2;
        }
        if (worst < beta) {
          beta = worst;
        }
        if (alpha >= beta) {
          break;
        }
      }
      return worst;
    }
    var bestCol = columns[0];
    var bestValue = -Infinity;
    var ranked = [];
    for (var k = 0; k < columns.length; k += 1) {
      var col3 = columns[k];
      var row5 = c4DropRow(board, col3);
      board[row5 * C4_W + col3] = C4_AI;
      var value = search(board, rank.depth - 1, -Infinity, Infinity, false);
      board[row5 * C4_W + col3] = C4_EMPTY;
      ranked.push({ col: col3, value: value });
      if (value > bestValue) {
        bestValue = value;
        bestCol = col3;
      }
    }
    if (rank.noise && ranked.length > 1 && Math.random() < rank.noise) {
      var pickFrom = 1 + Math.floor(Math.random() * Math.min(2, ranked.length - 1));
      return ranked[pickFrom].col;
    }
    return bestCol;
  }
  App.glyphFourDropRow = c4DropRow;
  App.glyphFourWinLine = c4WinLine;
  App.glyphFourPick = c4Pick;
  App.glyphFourFull = c4Full;

  /* =========================================================== feel layer ===
   * Everything under this line is presentation.
   *
   * The rack is moulded plastic: a bevelled body with a flute between every
   * column and forty-two holes drilled *through* it, so a hole is shaded at the
   * top by its own lip and catches a thin band of bounce light on the far wall.
   * That surface never changes mid-game, so it is painted once into an offscreen
   * plate and blitted each frame; the live layers are only the discs, the drop,
   * the ghost and the celebration.
   *
   * The regression harness boots this module with a stub App that carries no fx,
   * no art and no audio, so every shared-layer call goes through a guard, and
   * nothing below adds a timer: bounce, sparks, the win sequence and the chip
   * bumps are all counted in frames, which is also what keeps the AI turn lock
   * exactly one timer deep.
   */

  var TAU = Math.PI * 2;
  /* The field label promises cyan for you and orange for the rival, so the hues
   * stay; each side also carries a stamped shape (a ring, a triangle) so the two
   * are never separated by colour alone. */
  var YOU = { hue: 188, sat: 86 };
  var RIVAL = { hue: 16, sat: 96 };
  /* Physics is counted in frames, not milliseconds: the harness steps
   * requestAnimationFrame by hand and expects a six-row drop to commit inside
   * twenty-one frames. Accelerating from rest instead of gliding at a constant
   * 0.3 lands a full-depth drop in about seventeen with weight behind it. */
  var GRAVITY = 0.045;
  var MAX_FALL_V = 0.8;
  var DROP_TOP = -1.3;
  var BOUNCE_G = 0.055;
  var LIGHT_STEP = 8;   /* frames between two winning discs catching light */
  var CEREMONY_AT = 48; /* the celebration lands once the line has been read */
  var WIN_HOLD = 134;   /* the won board stays on screen this long */
  var DRAW_HOLD = 90;
  var INTRO_FRAMES = 30;
  var SHAKE_FRAMES = 10;
  var MAX_SPARKS = 64;

  function hsl(h, s, l) {
    return "hsl(" + h + ", " + s + "%, " + l + "%)";
  }

  function hsla(h, s, l, a) {
    return "hsla(" + h + ", " + s + "%, " + l + "%, " + a + ")";
  }

  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  function lerp(a, b, k) {
    return a + (b - a) * k;
  }

  /* Cosmetic noise only, on its own LCG: two frames of the same scene must
   * agree, and nothing here should compete with the RNG the ranks search with. */
  function seeded(seed) {
    var state = seed || 1;
    return function () {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }

  function fxDo(name, a, b, c, d) {
    var layer = App.fx;
    var fn = layer && layer[name];
    if (typeof fn === "function") {
      fn(a, b, c, d);
    }
  }

  function sfx(name) {
    if (typeof App.playSfx === "function") {
      App.playSfx(name);
    }
  }

  function artMake(name, opts) {
    var art = App.art;
    if (!art || typeof art.icon !== "function") {
      return null;
    }
    try {
      return art.icon(name, opts);
    } catch (error) {
      return null;
    }
  }

  function motionOff() {
    if (typeof App.isMotionOff === "function") {
      return !!App.isMotionOff();
    }
    var root = document.documentElement;
    return !!(root && root.getAttribute && root.getAttribute("data-motion") === "off");
  }

  function lightTheme() {
    var root = document.documentElement;
    return !!(root && root.getAttribute && root.getAttribute("data-theme") === "light");
  }

  function roundPath(g, x, y, w, h, r) {
    var rad = Math.min(r, w / 2, h / 2);
    g.beginPath();
    g.moveTo(x + rad, y);
    g.lineTo(x + w - rad, y);
    g.quadraticCurveTo(x + w, y, x + w, y + rad);
    g.lineTo(x + w, y + h - rad);
    g.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
    g.lineTo(x + rad, y + h);
    g.quadraticCurveTo(x, y + h, x, y + h - rad);
    g.lineTo(x, y + rad);
    g.quadraticCurveTo(x, y, x + rad, y);
    g.closePath();
  }

  function chord(g, x1, y1, x2, y2) {
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.stroke();
  }

  function arc(g, cx, cy, r, from, to) {
    g.beginPath();
    g.arc(cx, cy, r, from, to);
    g.stroke();
  }

  /* One board, two rooms: the rack is a physical object, so the light theme
   * lifts the table it stands on and the plastic's own values instead of
   * swapping in a different design. */
  var SKIN_DARK = {
    tableTop: "hsl(200, 26%, 20%)",
    tableBot: "hsl(212, 42%, 7%)",
    pool: "hsla(188, 88%, 62%, 0.14)",
    grainLit: "rgba(255, 255, 255, 0.035)",
    grainDark: "rgba(0, 0, 0, 0.13)",
    cast: "hsla(214, 70%, 3%, 0.62)",
    rackHi: "hsl(200, 24%, 40%)",
    rackMid: "hsl(203, 27%, 27%)",
    rackLo: "hsl(208, 32%, 16%)",
    rackEdge: "hsl(212, 46%, 7%)",
    bevel: "hsla(186, 62%, 76%, 0.32)",
    bevelLo: "hsla(214, 62%, 4%, 0.55)",
    rim: "hsla(188, 70%, 72%, 0.14)",
    fluteDark: "hsla(214, 55%, 5%, 0.42)",
    fluteLit: "hsla(186, 55%, 72%, 0.1)",
    footHi: "hsl(202, 24%, 26%)",
    footLo: "hsl(210, 30%, 11%)",
    collarHi: "hsl(200, 24%, 45%)",
    collarMid: "hsl(203, 26%, 31%)",
    collarLo: "hsl(208, 30%, 17%)",
    wellLit: "hsl(208, 34%, 15%)",
    wellMid: "hsl(212, 42%, 8%)",
    wellDark: "hsl(215, 50%, 4%)",
    wellShade: "hsla(215, 60%, 2%, 0.75)",
    wellRim: "hsla(188, 60%, 74%, 0.22)",
    wellEdge: "hsla(215, 60%, 3%, 0.8)",
    rivetLit: "hsla(188, 60%, 80%, 0.5)",
    rivetDark: "hsla(214, 55%, 5%, 0.7)",
    sheen: "hsla(188, 85%, 80%, 0.05)",
    veil: "hsla(214, 62%, 4%, 0.42)",
    scan: "hsla(16, 96%, 62%, 0.55)",
  };

  var SKIN_LIGHT = {
    tableTop: "hsl(198, 24%, 84%)",
    tableBot: "hsl(204, 20%, 64%)",
    pool: "hsla(46, 92%, 80%, 0.34)",
    grainLit: "rgba(255, 255, 255, 0.45)",
    grainDark: "rgba(30, 54, 76, 0.07)",
    cast: "hsla(210, 40%, 20%, 0.34)",
    rackHi: "hsl(200, 22%, 62%)",
    rackMid: "hsl(203, 24%, 48%)",
    rackLo: "hsl(208, 28%, 36%)",
    rackEdge: "hsl(210, 30%, 26%)",
    bevel: "hsla(0, 0%, 100%, 0.55)",
    bevelLo: "hsla(212, 40%, 12%, 0.3)",
    rim: "hsla(0, 0%, 100%, 0.4)",
    fluteDark: "hsla(210, 30%, 14%, 0.22)",
    fluteLit: "hsla(0, 0%, 100%, 0.28)",
    footHi: "hsl(200, 20%, 44%)",
    footLo: "hsl(208, 24%, 28%)",
    collarHi: "hsl(200, 22%, 68%)",
    collarMid: "hsl(203, 24%, 52%)",
    collarLo: "hsl(208, 26%, 40%)",
    wellLit: "hsl(208, 26%, 26%)",
    wellMid: "hsl(212, 30%, 15%)",
    wellDark: "hsl(215, 34%, 8%)",
    wellShade: "hsla(215, 40%, 4%, 0.6)",
    wellRim: "hsla(200, 60%, 92%, 0.3)",
    wellEdge: "hsla(215, 40%, 6%, 0.7)",
    rivetLit: "hsla(200, 40%, 96%, 0.6)",
    rivetDark: "hsla(212, 40%, 16%, 0.5)",
    sheen: "hsla(0, 0%, 100%, 0.14)",
    veil: "hsla(212, 40%, 10%, 0.32)",
    scan: "hsla(16, 90%, 48%, 0.5)",
  };

  function initGlyphFourGame() {
    var canvas = getElement("c4Canvas");
    var youEl = getElement("c4You");
    var aiEl = getElement("c4Ai");
    var movesEl = getElement("c4Moves");
    var resultEl = getElement("c4Result");
    var startBtn = getElement("c4NewBtn");
    var bestEl = getElement("c4Best");
    var selectEl = getElement("c4LevelSel");
    if (
      !canvas ||
      !youEl ||
      !aiEl ||
      !movesEl ||
      !resultEl ||
      !startBtn ||
      !bestEl ||
      !selectEl
    ) {
      return;
    }

    var ctx = canvas.getContext("2d");
    var campaign = createCampaign({ key: "glyph-four-campaign", levels: c4Levels });
    var level = c4Levels[0];
    var board = [];
    var falling = null;
    var cleared = false;
    var busy = false;
    var aiTimer = null;
    var winLine = null;
    var hoverCol = -1;
    var playerMoves = 0;
    var rafId = null;
    var startedAt = 0;
    var clockRunning = false;

    /* ---- live layers ---------------------------------------------------- */
    var view = {
      w: c4Size, h: c4Size, dpr: 1, cell: 36, x0: 34, y0: 40,
      pad: 11, ghost: 25, foot: 12, hr: 14, r: 13, bodyGrad: null,
    };
    var plateNode = null;
    var plateKey = "";
    var anim = 0;          /* frames of decoration; frozen when motion is off */
    var intro = INTRO_FRAMES;
    var dropTrail = [];
    var bouncing = [];     /* landed discs working their rebound off */
    var sparks = [];       /* canvas-side dust and impact rings */
    var shudder = 0;       /* the rack flexing after a hit */
    var refuse = null;     /* { col, frames } the "this column is full" gesture */
    var lineSeq = null;    /* the winning four, catching light one by one */
    var ghostX = -1;       /* eased hover position, so the preview glides */
    var scanX = -1;        /* the rival's disc wandering while it decides */
    var hudPrev = { you: 0, ai: 0, moves: 0 };
    var bumps = [];        /* chip bumps, cleared on a frame count not a timer */
    var chipYou = null;
    var chipAi = null;
    var chipMoves = null;
    var panelEl = null;

    function panel() {
      if (!panelEl) {
        panelEl = document.getElementById("gamePanelGlyphFour");
      }
      return panelEl;
    }

    function skin() {
      return lightTheme() ? SKIN_LIGHT : SKIN_DARK;
    }

    function side(player) {
      return player === C4_PLAYER ? YOU : RIVAL;
    }

    /* The HUD chips get a pressed-disc swatch each, so "You" and "Rival" are two
     * objects rather than two numbers, and the two sides read apart even before
     * the board does. The stub harness parents its lookups to the body, so the
     * decoration only ever attaches to a real .game-stat. */
    function decorateChip(el, cls, player, icon) {
      var chip = el && el.parentNode;
      if (!chip || !chip.classList || !chip.classList.contains("game-stat")) {
        return null;
      }
      chip.classList.add("c4-chip", cls);
      if (chip.querySelector(".c4-swatch")) {
        return chip;
      }
      var swatch = document.createElement("span");
      swatch.className = "c4-swatch " + cls + "-swatch";
      var hue = side(player).hue;
      var mark = artMake(icon, { hue: hue, sat: side(player).sat, size: 20, cls: "c4-swatch-art" });
      if (mark) {
        swatch.appendChild(mark);
      } else {
        swatch.classList.add("is-plain");
      }
      chip.appendChild(swatch);
      return chip;
    }

    /* ---- the drawing surface -------------------------------------------- */
    /* The page owns a 320x280 attribute box; the backing store is multiplied by
     * the device ratio so the rack's bevels stay crisp, and everything after
     * this point is written in those original logical units. */
    function setupView() {
      var baseW = canvas.__c4BaseW || (canvas.__c4BaseW = canvas.width || c4Size);
      var baseH = canvas.__c4BaseH || (canvas.__c4BaseH = canvas.height || c4Size);
      var dpr = window.devicePixelRatio || 1;
      view.dpr = clamp(dpr, 1, 2);
      view.w = baseW;
      view.h = baseH;
      canvas.width = Math.round(baseW * view.dpr);
      canvas.height = Math.round(baseH * view.dpr);
      ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
      computeGeometry();
    }

    /* Seven columns of holes plus a ghost band to hover in, a lip above the
     * rack and a foot under it, all in units of one cell. */
    function computeGeometry() {
      var cell = Math.floor(Math.min((view.w - 14) / 7.6, (view.h - 6) / 7.7, 48));
      view.cell = clamp(cell, 18, 48);
      view.pad = Math.round(view.cell * 0.3);
      view.ghost = Math.round(view.cell * 0.72);
      view.foot = Math.round(view.cell * 0.34);
      view.hr = view.cell * 0.4;
      view.r = view.cell * 0.355;
      var stack = view.ghost + view.pad * 2 + view.cell * C4_H + view.foot;
      view.x0 = Math.round((view.w - view.cell * C4_W) / 2);
      view.y0 = Math.round(view.ghost + view.pad + (view.h - stack) / 2);
      var box = rackBox();
      view.bodyGrad = ctx.createLinearGradient(0, box.y, 0, box.y + box.h);
      view.bodyGrad.addColorStop(0, skin().rackHi);
      view.bodyGrad.addColorStop(0.44, skin().rackMid);
      view.bodyGrad.addColorStop(1, skin().rackLo);
    }

    function colX(col) {
      return view.x0 + col * view.cell + view.cell / 2;
    }

    function rowY(row) {
      return view.y0 + row * view.cell + view.cell / 2;
    }

    function cellPoint(index) {
      return { x: colX(index % C4_W), y: rowY(Math.floor(index / C4_W)) };
    }

    function rackBox() {
      return {
        x: view.x0 - view.pad,
        y: view.y0 - view.pad,
        w: C4_W * view.cell + view.pad * 2,
        h: C4_H * view.cell + view.pad * 2,
      };
    }

    function plateSignature() {
      return [view.w, view.h, view.dpr, view.cell, lightTheme() ? "l" : "d"].join(":");
    }

    function ensurePlate() {
      var key = plateSignature();
      if (plateNode && key === plateKey) {
        return;
      }
      if (!plateNode) {
        plateNode = document.createElement("canvas");
      }
      plateNode.width = Math.round(view.w * view.dpr);
      plateNode.height = Math.round(view.h * view.dpr);
      var g = plateNode.getContext("2d");
      g.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
      paintTable(g);
      paintRack(g);
      plateKey = key;
    }

    function newBoard() {
      board = [];
      for (var i = 0; i < C4_W * C4_H; i += 1) {
        board.push(C4_EMPTY);
      }
      winLine = null;
      falling = null;
      playerMoves = 0;
      bouncing = [];
      sparks = [];
      dropTrail = [];
      refuse = null;
      lineSeq = null;
      shudder = 0;
      intro = motionOff() ? INTRO_FRAMES : 0;
    }

    /* The HUD is a read-out, not a scorecard: the number that changed rolls to
     * its new value and its chip takes the bump, so a disc landing is felt in
     * the corner of the eye as well as on the board. */
    function renderHud() {
      var you = 0;
      var ai = 0;
      for (var i = 0; i < board.length; i += 1) {
        if (board[i] === C4_PLAYER) {
          you += 1;
        } else if (board[i] === C4_AI) {
          ai += 1;
        }
      }
      rollHud(youEl, chipYou, hudPrev.you, you);
      rollHud(aiEl, chipAi, hudPrev.ai, ai);
      rollHud(movesEl, chipMoves, hudPrev.moves, playerMoves);
      hudPrev.you = you;
      hudPrev.ai = ai;
      hudPrev.moves = playerMoves;
    }

    function rollHud(el, chip, from, to) {
      if (!el) {
        return;
      }
      /* The number is the truth first and the animation on top: fx.countUp owns
       * the text only while the feel layer exists, and the read-out must not
       * depend on it. */
      el.textContent = String(to);
      if (from === to) {
        return;
      }
      fxDo("countUp", el, from, to);
      if (chip && chip.classList && !bumpedRecently(chip)) {
        chip.classList.add("is-bump");
        bumps.push({ chip: chip, frames: 14 });
      }
    }

    function bumpedRecently(chip) {
      for (var i = 0; i < bumps.length; i += 1) {
        if (bumps[i].chip === chip) {
          return true;
        }
      }
      return false;
    }

    function stepBumps() {
      for (var i = bumps.length - 1; i >= 0; i -= 1) {
        bumps[i].frames -= 1;
        if (bumps[i].frames <= 0) {
          bumps[i].chip.classList.remove("is-bump");
          bumps.splice(i, 1);
        }
      }
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

    function setMessage(text, tone) {
      resultEl.textContent = text;
      resultEl.classList.remove("is-win", "is-lose");
      if (tone === "win") {
        resultEl.classList.add("is-win");
      } else if (tone === "lose") {
        resultEl.classList.add("is-lose");
      }
    }

    function loadLevel(levelDef, keepReadout) {
      window.clearTimeout(aiTimer);
      aiTimer = null;
      level = levelDef;
      newBoard();
      cleared = false;
      busy = false;
      clockRunning = false;
      startedAt = Date.now();
      setupView();
      ensurePlate();
      chipYou = decorateChip(youEl, "c4-chip-you", C4_PLAYER, "disc") || chipYou;
      chipAi = decorateChip(aiEl, "c4-chip-ai", C4_AI, "disc") || chipAi;
      chipMoves = decorateChip(movesEl, "c4-chip-moves", C4_PLAYER, "arrow") || chipMoves;
      renderHud();
      refreshPicker();
      startLoop();
      draw();
      if (!keepReadout) {
        setMessage(t("c4Ready"), "");
      }
      fxDo("sweep", startBtn);
    }

    /* The four light up in the order they were played into the line, then the
     * beam is drawn along them, then the round ends as a ceremony. The board is
     * held until that has been read: the old code reloaded the frame inside the
     * same call, so the winning line was never actually on screen. */
    function setLineSeq(cells, player, stars, title, lines, tone, restart) {
      lineSeq = {
        cells: cells,
        player: player,
        frame: 0,
        lit: 0,
        stars: stars,
        title: title,
        lines: lines,
        tone: tone,
        restart: restart || null,
        shown: false,
        sweep: !cells.length,
      };
      shudder = 0;
      refuse = null;
      fxDo("flash", canvas, { hue: side(player).hue });
    }

    function finish() {
      cleared = true;
      clockRunning = false;
      winLine = c4WinLine(board, C4_PLAYER);
      var rivalLine = winLine ? null : c4WinLine(board, C4_AI);
      var you = 0;
      for (var i = 0; i < board.length; i += 1) {
        if (board[i] === C4_PLAYER) {
          you += 1;
        }
      }
      if (winLine) {
        var starsWon = starsFor(you, level.starMoves, "low");
        if (starsWon <= 0) {
          starsWon = 1;
        }
        var outcome = campaign.record(level.id, {
          stars: starsWon,
          best: you,
          better: "low",
        });
        var message = t("c4Win", { n: you, stars: starsWon });
        var extra = [];
        if (outcome.isBest) {
          message += " " + t("newBest");
          extra.push(t("newBest"));
        }
        if (outcome.unlockedNext) {
          message += " " + t("c4NextBoard");
          extra.push(t("c4NextBoard"));
        } else if (campaign.clearedCount() === c4Levels.length) {
          message += " " + t("c4CampaignDone");
          extra.push(t("c4CampaignDone"));
        }
        logAction(t("logGlyphFour", { n: you }));
        var rect = startBtn.getBoundingClientRect();
        createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
        petNotifyGame(outcome.isBest || outcome.firstClear);
        setMessage(message, "win");
        fxDo("floatText", movesEl, "+" + you, { kind: "good" });
        if (chipYou && chipYou.classList) {
          chipYou.classList.add("is-good");
        }
        var nextId = outcome.unlockedNext || level.id;
        setLineSeq(
          winLine,
          C4_PLAYER,
          starsWon,
          message,
          extra,
          "win",
          c4Levels[campaign.indexOf(nextId)],
        );
      } else if (rivalLine) {
        setMessage(t("c4Loss") + " " + t("c4Retry"), "lose");
        if (chipAi && chipAi.classList) {
          chipAi.classList.add("is-warn");
        }
        setLineSeq(rivalLine, C4_AI, 0, t("c4Loss"), [t("c4Retry")], "lose", null);
      } else if (c4Full(board)) {
        setMessage(t("c4Draw") + " " + t("c4Retry"), "");
        setLineSeq([], C4_EMPTY, 0, t("c4Draw"), [t("c4Retry")], "clear", null);
      }
    }

    function stepLineSeq() {
      if (!lineSeq) {
        return;
      }
      var still = motionOff();
      lineSeq.frame += 1;
      var step = still ? 1 : LIGHT_STEP;
      var want = Math.min(
        lineSeq.cells.length,
        Math.floor(lineSeq.frame / step) + 1,
      );
      while (lineSeq.lit < want) {
        lineSeq.lit += 1;
        var point = cellPoint(lineSeq.cells[lineSeq.lit - 1]);
        popCell(point.x, point.y, lineSeq.player);
        sfx(lineSeq.player === C4_PLAYER ? "star" : "tick");
        if (lineSeq.lit === lineSeq.cells.length && lineSeq.player === C4_AI) {
          fxDo("jolt", panel(), { dist: 6 });
        }
      }
      var ceremonyAt = still ? 2 : CEREMONY_AT;
      if (!lineSeq.shown && lineSeq.frame >= ceremonyAt) {
        lineSeq.shown = true;
        fxDo("ceremony", panel(), {
          tone: lineSeq.tone,
          stars: lineSeq.stars,
          title: lineSeq.title,
          lines: lineSeq.lines,
        });
      }
      var hold = still ? DRAW_HOLD : (lineSeq.tone === "win" ? WIN_HOLD : DRAW_HOLD);
      if (lineSeq.restart && lineSeq.frame >= hold) {
        var next = lineSeq.restart;
        lineSeq.restart = null;
        loadLevel(next, true);
      }
    }

    /* A disc leaves from the ghost band at rest and falls; the release gets a
     * voice so the drop is two beats - go, then thunk - not one. */
    function startDrop(col, row, player) {
      falling = {
        col: col,
        row: row,
        y: DROP_TOP,
        vy: 0,
        spin: 0,
        player: player,
      };
      dropTrail = [];
      busy = true;
      sfx("place");
    }

    function aiMove() {
      if (cleared) {
        return;
      }
      var col = c4Pick(board, level);
      if (col === -1) {
        finish();
        return;
      }
      var row = c4DropRow(board, col);
      startDrop(col, row, C4_AI);
    }

    function playerMove(col) {
      if (cleared || busy || falling) {
        return;
      }
      var row = c4DropRow(board, col);
      if (row === -1) {
        return;
      }
      if (!clockRunning) {
        clockRunning = true;
        startedAt = Date.now();
      }
      playerMoves += 1;
      startDrop(col, row, C4_PLAYER);
      renderHud();
    }

    /* The one gate both the pointer and the keyboard go through, so an illegal
     * column answers instead of swallowing the press. */
    function attempt(col) {
      if (col < 0 || col >= C4_W) {
        return;
      }
      if (cleared || busy || falling) {
        refuse = { col: col, frames: 14, soft: true };
        return;
      }
      if (c4DropRow(board, col) === -1) {
        refuse = { col: col, frames: 20, soft: false };
        sfx("wrong");
        return;
      }
      sfx("select");
      playerMove(col);
    }

    function update() {
      var still = motionOff();
      if (!still) {
        anim += 1;
        if (intro < INTRO_FRAMES) {
          intro += 1;
        }
      }
      stepFalling(still);
      stepBounce(still);
      stepSparks();
      stepRefuse();
      stepLineSeq();
      stepBumps();
      if (shudder > 0) {
        shudder -= 1;
      }
      /* The preview glides between columns instead of teleporting, which is what
       * makes the hover read as a disc waiting to be let go. */
      var targetX = colX(ghostColumn());
      if (ghostX < 0 || still) {
        ghostX = targetX;
      } else {
        ghostX = lerp(ghostX, targetX, 0.24);
      }
      var legal = legalColumns();
      var scanTarget = colX(legal[Math.floor(anim / 7) % legal.length]);
      if (scanX < 0 || still) {
        scanX = scanTarget;
      } else {
        scanX = lerp(scanX, scanTarget, 0.16);
      }
    }

    function legalColumns() {
      var out = [];
      for (var c = 0; c < C4_W; c += 1) {
        if (c4DropRow(board, c) !== -1) {
          out.push(c);
        }
      }
      return out.length ? out : [3];
    }

    function stepFalling(still) {
      if (!falling) {
        return;
      }
      if (still) {
        falling.y = falling.row;
        dropTrail = [];
      } else {
        falling.vy = Math.min(MAX_FALL_V, falling.vy + GRAVITY);
        dropTrail.push(falling.y);
        if (dropTrail.length > 4) {
          dropTrail.shift();
        }
        falling.y += falling.vy;
        falling.spin += 0.14 + falling.vy * 0.5;
      }
      if (falling.y < falling.row) {
        return;
      }
      commitDrop(falling, still);
    }

    /* The commit is the original turn logic, byte for byte; the beat that
     * follows it is new. */
    function commitDrop(fall, still) {
      var playerJustMoved = fall.player === C4_PLAYER;
      board[fall.row * C4_W + fall.col] = fall.player;
      falling = null;
      dropTrail = [];
      busy = false;
      renderHud();
      landBeat(fall, still);
      if (c4WinLine(board, C4_PLAYER) || c4WinLine(board, C4_AI)) {
        finish();
        return;
      }
      if (c4Full(board)) {
        finish();
        return;
      }
      if (playerJustMoved && !cleared) {
        busy = true;
        aiTimer = window.setTimeout(function () {
          aiTimer = null;
          busy = false;
          if (cleared) {
            return;
          }
          aiMove();
        }, 380);
      }
    }

    /* The thunk: a low voice, a squashed rebound that decays over a few frames,
     * dust off the lip and the whole rack flexing once. */
    function landBeat(fall, still) {
      sfx("land");
      if (still) {
        return;
      }
      var x = colX(fall.col);
      var y = rowY(fall.row);
      bouncing.push({
        col: fall.col,
        row: fall.row,
        player: fall.player,
        off: 0,
        v: Math.min(view.cell * 0.2, fall.vy * view.cell * 0.22),
        sq: 0.72,
        hits: 0,
        t: 0,
        spin: fall.spin,
      });
      shudder = SHAKE_FRAMES;
      impact(x, y, side(fall.player).hue, 1);
      fxDo("jolt", canvas, { dist: 4, ms: 210 });
    }

    function stepBounce(still) {
      if (still) {
        bouncing = [];
        return;
      }
      for (var i = bouncing.length - 1; i >= 0; i -= 1) {
        var b = bouncing[i];
        b.t += 1;
        b.v -= BOUNCE_G * view.cell;
        b.off += b.v;
        if (b.off <= 0) {
          b.off = 0;
          if (b.v < -view.cell * 0.05) {
            b.v = -b.v * 0.42;
            b.sq = 0.82;
            b.hits += 1;
            if (b.hits === 1) {
              sfx("tap");
              impact(colX(b.col), rowY(b.row), side(b.player).hue, 0.4);
            }
          } else {
            b.v = 0;
          }
        }
        b.sq += (1 - b.sq) * 0.3;
        if (b.t > 20 && b.off === 0) {
          bouncing.splice(i, 1);
        }
      }
    }

    /* Dust and rings live on the canvas rather than in the shared particle
     * layer: fx.burst is positioned from an element's box, and every hole in a
     * 320-point rack shares one box. */
    function impact(cx, cy, hue, power) {
      sparks.push({ kind: "ring", x: cx, y: cy, t: 0, life: 18, hue: hue, power: power });
      var rand = seeded(Math.round(cx * 97 + cy * 31 + anim));
      var count = Math.round(4 + 4 * power);
      for (var i = 0; i < count; i += 1) {
        var spread = (i / count - 0.5) * 2;
        sparks.push({
          kind: "mote",
          x: cx + spread * view.hr * 0.8,
          y: cy + view.hr * 0.5,
          vx: spread * (0.6 + rand() * 1.6) * view.cell * 0.045,
          vy: -(0.4 + rand() * 1.1) * view.cell * 0.045 * (0.6 + power),
          t: 0,
          life: 14 + Math.round(rand() * 10),
          hue: hue,
          size: view.cell * (0.035 + rand() * 0.04),
        });
      }
      while (sparks.length > MAX_SPARKS) {
        sparks.shift();
      }
    }

    /* The winning disc catching light: a ring, a scatter and a small voice. */
    function popCell(x, y, player) {
      var hue = side(player).hue;
      sparks.push({ kind: "ring", x: x, y: y, t: 0, life: 26, hue: hue, power: 1.6 });
      var rand = seeded(Math.round(x * 13 + y * 7));
      for (var i = 0; i < 9; i += 1) {
        var a = rand() * TAU;
        var power = (0.5 + rand()) * view.cell * 0.09;
        sparks.push({
          kind: "mote",
          x: x,
          y: y,
          vx: Math.cos(a) * power,
          vy: Math.sin(a) * power - view.cell * 0.03,
          t: 0,
          life: 20 + Math.round(rand() * 12),
          hue: hue + 18,
          size: view.cell * (0.04 + rand() * 0.05),
        });
      }
      while (sparks.length > MAX_SPARKS) {
        sparks.shift();
      }
    }

    function stepSparks() {
      for (var i = sparks.length - 1; i >= 0; i -= 1) {
        var p = sparks[i];
        p.t += 1;
        if (p.kind === "mote") {
          p.vy += view.cell * 0.008;
          p.x += p.vx;
          p.y += p.vy;
        }
        if (p.t >= p.life) {
          sparks.splice(i, 1);
        }
      }
    }

    function stepRefuse() {
      if (!refuse) {
        return;
      }
      refuse.frames -= 1;
      if (refuse.frames <= 0) {
        refuse = null;
      }
    }

    /* ---- the surface that never changes mid-game ----------------------- */

    function paintTable(g) {
      var s = skin();
      var grad = g.createLinearGradient(0, 0, 0, view.h);
      grad.addColorStop(0, s.tableTop);
      grad.addColorStop(1, s.tableBot);
      g.fillStyle = grad;
      g.fillRect(0, 0, view.w, view.h);
      /* One lamp above the board: the pool the rack sits in. */
      var pool = g.createRadialGradient(
        view.w / 2,
        view.y0 - view.cell,
        view.cell * 0.2,
        view.w / 2,
        view.h * 0.46,
        view.h * 1.05,
      );
      pool.addColorStop(0, s.pool);
      pool.addColorStop(1, "hsla(0, 0%, 0%, 0)");
      g.fillStyle = pool;
      g.fillRect(0, 0, view.w, view.h);
      /* Felt grain, on a fixed seed so the table does not shimmer. */
      var rand = seeded(7071);
      for (var i = 0; i < 320; i += 1) {
        var x = rand() * view.w;
        var y = rand() * view.h;
        g.fillStyle = rand() < 0.55 ? s.grainLit : s.grainDark;
        g.fillRect(x, y, 1.4, 1.4);
      }
    }

    function paintRack(g) {
      var s = skin();
      var box = rackBox();
      var cell = view.cell;
      var rad = cell * 0.44;
      /* The foot: a moulded slab the rack is welded to, so it has weight on the
       * table instead of floating as a rectangle. */
      var foot = {
        x: box.x - cell * 0.16,
        y: box.y + box.h - cell * 0.12,
        w: box.w + cell * 0.32,
        h: view.foot + cell * 0.3,
      };
      g.save();
      g.shadowColor = s.cast;
      g.shadowBlur = cell * 0.5;
      g.shadowOffsetY = cell * 0.2;
      var footGrad = g.createLinearGradient(0, foot.y, 0, foot.y + foot.h);
      footGrad.addColorStop(0, s.footHi);
      footGrad.addColorStop(1, s.footLo);
      g.fillStyle = footGrad;
      roundPath(g, foot.x, foot.y, foot.w, foot.h, cell * 0.22);
      g.fill();
      g.restore();

      /* The body. */
      g.save();
      g.shadowColor = s.cast;
      g.shadowBlur = cell * 0.7;
      g.shadowOffsetY = cell * 0.24;
      var body = g.createLinearGradient(0, box.y, 0, box.y + box.h);
      body.addColorStop(0, s.rackHi);
      body.addColorStop(0.44, s.rackMid);
      body.addColorStop(1, s.rackLo);
      g.fillStyle = body;
      roundPath(g, box.x, box.y, box.w, box.h, rad);
      g.fill();
      g.restore();

      /* Everything below is moulded into the body, so it stays inside it. */
      g.save();
      roundPath(g, box.x, box.y, box.w, box.h, rad);
      g.clip();
      var lip = g.createLinearGradient(0, box.y, 0, box.y + cell * 0.55);
      lip.addColorStop(0, s.bevel);
      lip.addColorStop(1, "hsla(0, 0%, 0%, 0)");
      g.fillStyle = lip;
      g.fillRect(box.x, box.y, box.w, cell * 0.55);
      var shade = g.createLinearGradient(0, box.y + box.h - cell * 0.7, 0, box.y + box.h);
      shade.addColorStop(0, "hsla(0, 0%, 0%, 0)");
      shade.addColorStop(1, s.bevelLo);
      g.fillStyle = shade;
      g.fillRect(box.x, box.y + box.h - cell * 0.7, box.w, cell * 0.7);
      /* A flute between the columns: pressed plastic always shows its seam. */
      for (var c = 1; c < C4_W; c += 1) {
        var fx = view.x0 + c * cell;
        g.strokeStyle = s.fluteDark;
        g.lineWidth = Math.max(1.6, cell * 0.055);
        chord(g, fx, box.y, fx, box.y + box.h);
        g.strokeStyle = s.fluteLit;
        g.lineWidth = 1;
        chord(g, fx + cell * 0.05, box.y, fx + cell * 0.05, box.y + box.h);
      }
      /* A wide sheen across the face so the surface reads as glossy plastic. */
      var sheen = g.createLinearGradient(box.x, box.y, box.x + box.w, box.y + box.h);
      sheen.addColorStop(0, s.sheen);
      sheen.addColorStop(0.35, "hsla(0, 0%, 0%, 0)");
      sheen.addColorStop(0.62, s.sheen);
      sheen.addColorStop(1, "hsla(0, 0%, 0%, 0)");
      g.fillStyle = sheen;
      g.fillRect(box.x, box.y, box.w, box.h);
      /* Rivets in the four corner pockets. */
      var rr = cell * 0.055;
      var offs = [
        [box.x + view.pad * 0.5, box.y + view.pad * 0.5],
        [box.x + box.w - view.pad * 0.5, box.y + view.pad * 0.5],
        [box.x + view.pad * 0.5, box.y + box.h - view.pad * 0.5],
        [box.x + box.w - view.pad * 0.5, box.y + box.h - view.pad * 0.5],
      ];
      for (var i = 0; i < offs.length; i += 1) {
        g.fillStyle = s.rivetDark;
        g.beginPath();
        g.arc(offs[i][0], offs[i][1] + rr * 0.3, rr, 0, TAU);
        g.fill();
        g.fillStyle = s.rivetLit;
        g.beginPath();
        g.arc(offs[i][0] - rr * 0.2, offs[i][1] - rr * 0.2, rr * 0.55, 0, TAU);
        g.fill();
      }
      g.restore();

      g.strokeStyle = s.rackEdge;
      g.lineWidth = 1.4;
      roundPath(g, box.x, box.y, box.w, box.h, rad);
      g.stroke();
      g.strokeStyle = s.rim;
      g.lineWidth = 1;
      roundPath(g, box.x + 1.6, box.y + 1.6, box.w - 3.2, box.h - 3.2, rad - 1.6);
      g.stroke();

      for (var row = 0; row < C4_H; row += 1) {
        for (var col = 0; col < C4_W; col += 1) {
          paintWell(g, colX(col), rowY(row));
        }
      }
    }

    /* A hole drilled *through* the rack: shaded by its own lip at the top, a
     * band of bounce light on the far wall, and the raised collar the moulding
     * pushes around the opening. */
    function paintWell(g, cx, cy) {
      var s = skin();
      var hr = view.hr;
      var collar = hr * 1.14;
      var ring = g.createRadialGradient(
        cx - collar * 0.45,
        cy - collar * 0.55,
        collar * 0.1,
        cx,
        cy,
        collar,
      );
      ring.addColorStop(0, s.collarHi);
      ring.addColorStop(0.62, s.collarMid);
      ring.addColorStop(1, s.collarLo);
      g.fillStyle = ring;
      g.beginPath();
      g.arc(cx, cy, collar, 0, TAU);
      g.fill();

      var hole = g.createRadialGradient(cx, cy + hr * 0.34, hr * 0.08, cx, cy, hr);
      hole.addColorStop(0, s.wellLit);
      hole.addColorStop(0.55, s.wellMid);
      hole.addColorStop(1, s.wellDark);
      g.fillStyle = hole;
      g.beginPath();
      g.arc(cx, cy, hr, 0, TAU);
      g.fill();

      g.save();
      g.beginPath();
      g.arc(cx, cy, hr, 0, TAU);
      g.clip();
      var inner = g.createLinearGradient(0, cy - hr, 0, cy + hr * 0.3);
      inner.addColorStop(0, s.wellShade);
      inner.addColorStop(1, "hsla(0, 0%, 0%, 0)");
      g.fillStyle = inner;
      g.fillRect(cx - hr, cy - hr, hr * 2, hr * 2);
      g.strokeStyle = s.wellRim;
      g.lineWidth = Math.max(1, hr * 0.13);
      arc(g, cx, cy - hr * 0.16, hr * 0.92, Math.PI * 0.2, Math.PI * 0.8);
      g.restore();

      g.strokeStyle = s.wellEdge;
      g.lineWidth = 1;
      g.beginPath();
      g.arc(cx, cy, hr, 0, TAU);
      g.stroke();
    }

    /* ---- the discs ------------------------------------------------------ */

    function paintStamp(g, player, s, colour, width) {
      g.strokeStyle = colour;
      g.fillStyle = colour;
      g.lineWidth = width;
      g.beginPath();
      if (player === C4_PLAYER) {
        g.arc(0, 0, s * 0.78, 0, TAU);
        g.stroke();
        g.beginPath();
        g.arc(0, 0, s * 0.26, 0, TAU);
        g.fill();
      } else {
        g.moveTo(0, -s * 0.84);
        g.lineTo(s * 0.8, s * 0.62);
        g.lineTo(-s * 0.8, s * 0.62);
        g.closePath();
        g.stroke();
      }
    }

    /* A pressed plastic disc: a domed body, the concentric ridge every game disc
     * has, a stamped shape that differs per side, a hot specular and a crescent
     * of bounce light along the bottom. `sq` squashes it for the impact frame. */
    function paintDisc(g, cx, cy, radius, player, o) {
      var style = o || {};
      var tone = side(player);
      var hue = tone.hue;
      var sat = tone.sat;
      var sq = style.sq === undefined ? 1 : style.sq;
      var lit = style.lit ? 1 : 0;
      g.save();
      if (style.alpha !== undefined) {
        g.globalAlpha = style.alpha;
      }
      g.translate(cx, cy);
      g.scale(2 - sq, sq);
      if (lit) {
        g.shadowColor = hsla(hue, 96, 66, 0.95);
        g.shadowBlur = radius * 1.35;
      }
      g.fillStyle = hsla(hue, 60, 6, 0.5);
      g.beginPath();
      g.arc(0, radius * 0.12, radius * 1.02, 0, TAU);
      g.fill();
      g.shadowBlur = lit ? radius * 1.35 : 0;
      var body = g.createRadialGradient(
        -radius * 0.36,
        -radius * 0.44,
        radius * 0.1,
        0,
        0,
        radius,
      );
      body.addColorStop(0, hsl(hue, sat, lit ? 88 : 72));
      body.addColorStop(0.4, hsl(hue, sat, lit ? 64 : 53));
      body.addColorStop(0.84, hsl(hue, sat - 16, lit ? 44 : 34));
      body.addColorStop(1, hsl(hue, sat - 22, 21));
      g.fillStyle = body;
      g.beginPath();
      g.arc(0, 0, radius, 0, TAU);
      g.fill();
      g.shadowBlur = 0;
      /* The dark rim keeps the disc off the rack in either theme. */
      g.strokeStyle = hsl(hue, Math.round(sat * 0.55), 13);
      g.lineWidth = Math.max(1, radius * 0.11);
      g.beginPath();
      g.arc(0, 0, radius * 0.955, 0, TAU);
      g.stroke();
      g.strokeStyle = hsla(hue, sat, 90, 0.28);
      g.lineWidth = Math.max(1, radius * 0.1);
      g.beginPath();
      g.arc(0, 0, radius * 0.66, 0, TAU);
      g.stroke();
      g.strokeStyle = "hsla(0, 0%, 0%, 0.16)";
      g.beginPath();
      g.arc(0, 0, radius * 0.57, 0, TAU);
      g.stroke();
      var stamp = radius * 0.36;
      g.save();
      if (style.spin) {
        g.rotate(style.spin);
      }
      paintStamp(g, player, stamp, "hsla(0, 0%, 0%, 0.34)", stamp * 0.34);
      g.translate(0, -stamp * 0.16);
      paintStamp(g, player, stamp, "hsla(0, 0%, 100%, 0.34)", stamp * 0.34);
      g.translate(0, stamp * 0.16);
      paintStamp(
        g,
        player,
        stamp,
        hsl(hue, Math.round(sat * 0.5), lit ? 96 : 82),
        stamp * 0.3,
      );
      g.restore();
      var hot = g.createRadialGradient(
        -radius * 0.34,
        -radius * 0.42,
        0,
        -radius * 0.34,
        -radius * 0.42,
        radius * 0.66,
      );
      hot.addColorStop(0, "hsla(0, 0%, 100%, 0.7)");
      hot.addColorStop(0.45, "hsla(0, 0%, 100%, 0.13)");
      hot.addColorStop(1, "hsla(0, 0%, 100%, 0)");
      g.fillStyle = hot;
      g.beginPath();
      g.arc(0, 0, radius, 0, TAU);
      g.fill();
      g.strokeStyle = hsla(hue, 100, 78, 0.4);
      g.lineWidth = radius * 0.12;
      arc(g, radius * 0.02, radius * 0.05, radius * 0.9, Math.PI * 0.16, Math.PI * 0.74);
      /* The lip above the hole throws the disc back into shade. */
      var lipShade = g.createLinearGradient(0, -radius, 0, -radius * 0.05);
      lipShade.addColorStop(0, "hsla(214, 60%, 4%, 0.5)");
      lipShade.addColorStop(1, "hsla(0, 0%, 0%, 0)");
      g.fillStyle = lipShade;
      g.beginPath();
      g.arc(0, 0, radius, 0, TAU);
      g.fill();
      g.restore();
    }

    /* ---- the live layers ------------------------------------------------ */

    function showGhost() {
      return !cleared && !busy && !falling && !lineSeq;
    }

    function showScan() {
      return busy && !falling && !cleared && !lineSeq;
    }

    function ghostColumn() {
      if (hoverCol >= 0 && hoverCol < C4_W) {
        return hoverCol;
      }
      return idleColumn();
    }

    /* With no pointer on the board the preview parks on the nearest column that
     * can still take a disc, so the rack is never simply standing there empty. */
    function idleColumn() {
      for (var d = 0; d < C4_W; d += 1) {
        for (var k = 0; k < 2; k += 1) {
          var col = k === 0 ? 3 + d : 3 - d;
          if (col >= 0 && col < C4_W && c4DropRow(board, col) !== -1) {
            return col;
          }
        }
      }
      return 3;
    }

    /* The rack drilling its own holes on arrival. The plug is filled with the
     * body's own gradient, so an un-drilled hole is exactly the plastic around
     * it and the openings read as punches rather than fades. */
    function drawIntro(g) {
      if (intro >= INTRO_FRAMES) {
        return;
      }
      for (var row = C4_H - 1; row >= 0; row -= 1) {
        for (var col = 0; col < C4_W; col += 1) {
          var delay = (Math.abs(col - 3) + (C4_H - 1 - row)) * 2.2;
          var a = clamp(1 - (intro - delay) / 7, 0, 1);
          if (a <= 0) {
            continue;
          }
          var cx = colX(col);
          var cy = rowY(row);
          g.globalAlpha = a;
          g.fillStyle = view.bodyGrad;
          g.beginPath();
          g.arc(cx, cy, view.hr * 1.15, 0, TAU);
          g.fill();
          if (a < 1) {
            g.globalAlpha = (1 - a) * 0.55;
            g.strokeStyle = hsla(189, 92, 78, 1);
            g.lineWidth = view.cell * 0.05;
            g.beginPath();
            g.arc(cx, cy, view.hr * (1.15 + (1 - a) * 0.7), 0, TAU);
            g.stroke();
          }
          g.globalAlpha = 1;
        }
      }
    }

    function drawBoardDiscs(g, still) {
      for (var i = 0; i < board.length; i += 1) {
        if (!board[i] || (lineSeq && inLine(i))) {
          continue;
        }
        if (bouncingAt(i)) {
          continue;
        }
        var point = cellPoint(i);
        paintDisc(g, point.x, point.y, view.r, board[i]);
      }
    }

    function bouncingAt(index) {
      for (var i = 0; i < bouncing.length; i += 1) {
        if (bouncing[i].row * C4_W + bouncing[i].col === index) {
          return true;
        }
      }
      return false;
    }

    function inLine(index) {
      if (!lineSeq) {
        return false;
      }
      for (var i = 0; i < lineSeq.cells.length; i += 1) {
        if (lineSeq.cells[i] === index) {
          return true;
        }
      }
      return false;
    }

    function drawBouncing(g) {
      for (var i = 0; i < bouncing.length; i += 1) {
        var b = bouncing[i];
        var point = cellPoint(b.row * C4_W + b.col);
        paintDisc(g, point.x, point.y - b.off, view.r, b.player, {
          sq: b.sq,
          spin: b.spin,
        });
      }
    }

    function drawFalling(g, still) {
      var tone = side(falling.player);
      var x = colX(falling.col);
      var y = rowY(falling.y);
      var land = rowY(falling.row);
      var near = clamp(1 - (land - y) / (view.cell * 3), 0, 1);
      /* The hole's shadow tightens and darkens as the disc closes on it, which
       * is most of what sells the gravity. */
      g.fillStyle = hsla(tone.hue, 60, 5, 0.1 + near * 0.42);
      g.beginPath();
      g.ellipse(
        x,
        land,
        view.hr * (1.06 - near * 0.2),
        view.hr * (0.62 - near * 0.14),
        0,
        0,
        TAU,
      );
      g.fill();
      if (!still) {
        for (var i = 0; i < dropTrail.length; i += 1) {
          paintDisc(g, x, rowY(dropTrail[i]), view.r * (0.72 + i * 0.06), falling.player, {
            alpha: 0.05 + i * 0.035,
          });
        }
      }
      paintDisc(g, x, y, view.r, falling.player, {
        sq: still ? 1 : 1 + Math.min(0.18, falling.vy * 0.24),
        spin: falling.spin,
      });
    }

    function drawSparks(g) {
      for (var i = 0; i < sparks.length; i += 1) {
        var p = sparks[i];
        var k = p.t / p.life;
        if (p.kind === "ring") {
          g.strokeStyle = hsla(p.hue, 96, 76, (1 - k) * 0.6);
          g.lineWidth = Math.max(1, view.cell * 0.09 * (1 - k));
          g.beginPath();
          g.arc(p.x, p.y, view.hr * (0.9 + k * (1.1 + p.power * 0.6)), 0, TAU);
          g.stroke();
        } else {
          g.fillStyle = hsla(p.hue, 88, 76, (1 - k) * 0.8);
          g.beginPath();
          g.arc(p.x, p.y, p.size * (1 - k * 0.5), 0, TAU);
          g.fill();
        }
      }
    }

    /* The column the disc would take: a shaft of light from the preview to the
     * hole it would land in, with that hole ringed and tinted. */
    function drawGhostLayer(g, still) {
      var col = ghostColumn();
      var row = c4DropRow(board, col);
      var full = row === -1;
      var hue = YOU.hue;
      var box = rackBox();
      var bob = still ? 0 : Math.sin(anim / 20) * view.cell * 0.055;
      var rattle = refuse && refuse.col === col && !refuse.soft
        ? Math.sin(refuse.frames * 1.6) * view.cell * 0.12
        : 0;
      var gx = ghostX + rattle;
      var gy = view.y0 - view.ghost * 0.56 + bob;
      g.save();
      g.fillStyle = hsla(hue, 60, 4, 0.3);
      g.beginPath();
      g.ellipse(gx, box.y + view.cell * 0.1, view.hr * 0.8, view.hr * 0.3, 0, 0, TAU);
      g.fill();
      if (!full) {
        var land = rowY(row);
        var shaft = g.createLinearGradient(0, gy, 0, land);
        shaft.addColorStop(0, hsla(hue, 92, 72, 0.22));
        shaft.addColorStop(0.55, hsla(hue, 92, 72, 0.07));
        shaft.addColorStop(1, hsla(hue, 92, 72, 0.2));
        g.fillStyle = shaft;
        g.fillRect(gx - view.cell * 0.4, gy, view.cell * 0.8, land - gy);
        g.fillStyle = hsla(hue, 90, 62, 0.2);
        g.beginPath();
        g.arc(gx, land, view.hr * 0.92, 0, TAU);
        g.fill();
        g.strokeStyle = hsla(hue, 95, 76, 0.8);
        g.lineWidth = Math.max(1.2, view.cell * 0.05);
        g.setLineDash([view.cell * 0.17, view.cell * 0.15]);
        g.lineDashOffset = still ? 0 : -anim * 0.7;
        g.beginPath();
        g.arc(gx, land, view.hr * 1.1, 0, TAU);
        g.stroke();
        g.setLineDash([]);
        if (!still) {
          /* Two chevrons running down the shaft: this way, then this way. */
          for (var i = 0; i < 2; i += 1) {
            var phase = ((anim + i * 12) % 24) / 24;
            var cy = gy + view.cell * 0.5 + phase * (land - gy - view.cell * 0.5);
            g.strokeStyle = hsla(hue, 95, 80, (1 - phase) * 0.5);
            g.lineWidth = Math.max(1.2, view.cell * 0.05);
            g.beginPath();
            g.moveTo(gx - view.cell * 0.14, cy - view.cell * 0.1);
            g.lineTo(gx, cy + view.cell * 0.06);
            g.lineTo(gx + view.cell * 0.14, cy - view.cell * 0.1);
            g.stroke();
          }
        }
      }
      if (full) {
        drawBlocked(g, gx, gy);
      } else {
        paintDisc(g, gx, gy, view.r, C4_PLAYER, { alpha: 0.68 });
      }
      g.restore();
    }

    function drawBlocked(g, cx, cy) {
      var r = view.r * 1.1;
      g.strokeStyle = "hsla(4, 92%, 68%, 0.9)";
      g.lineWidth = Math.max(1.5, view.cell * 0.06);
      g.beginPath();
      g.arc(cx, cy, r, 0, TAU);
      g.stroke();
      chord(g, cx - r * 0.6, cy - r * 0.6, cx + r * 0.6, cy + r * 0.6);
      chord(g, cx + r * 0.6, cy - r * 0.6, cx - r * 0.6, cy + r * 0.6);
    }

    /* The rival's turn, made visible: its own disc drifting across the columns
     * it can still play, over a thinking line along the rack's top lip. */
    function drawScan(g, still) {
      var box = rackBox();
      var y = view.y0 - view.ghost * 0.56;
      if (!still) {
        var t = (anim % 46) / 46;
        var bar = g.createLinearGradient(box.x, 0, box.x + box.w, 0);
        var span = 0.24;
        var from = clamp(t - span, 0, 1);
        var to = clamp(t + span, 0, 1);
        bar.addColorStop(0, "hsla(16, 96%, 62%, 0)");
        bar.addColorStop(from, "hsla(16, 96%, 62%, 0)");
        bar.addColorStop((from + to) / 2, skin().scan);
        bar.addColorStop(to, "hsla(16, 96%, 62%, 0)");
        bar.addColorStop(1, "hsla(16, 96%, 62%, 0)");
        g.fillStyle = bar;
        g.fillRect(box.x, y + view.cell * 0.42, box.w, Math.max(1.5, view.cell * 0.06));
      }
      paintDisc(g, scanX, y, view.r * 0.92, C4_AI, { alpha: still ? 0.3 : 0.5 });
    }

    function drawVeil(g) {
      var box = rackBox();
      g.fillStyle = skin().veil;
      roundPath(g, box.x, box.y, box.w, box.h, view.cell * 0.44);
      g.fill();
    }

    /* The four that ended it, lit in the order they caught the line. */
    function drawLitDiscs(g, still) {
      if (!lineSeq) {
        return;
      }
      for (var i = 0; i < lineSeq.lit; i += 1) {
        var point = cellPoint(lineSeq.cells[i]);
        var fresh = clamp(1 - (lineSeq.frame - i * LIGHT_STEP) / 14, 0, 1);
        var pulse = still ? 0 : Math.sin(anim / 9 + i) * 0.5 + 0.5;
        paintDisc(g, point.x, point.y, view.r * (1 + fresh * 0.22), lineSeq.player, {
          lit: true,
          sq: 1 + fresh * 0.16,
        });
        g.strokeStyle = hsla(side(lineSeq.player).hue, 96, 80, 0.35 + pulse * 0.35);
        g.lineWidth = Math.max(1.2, view.cell * 0.05);
        g.beginPath();
        g.arc(point.x, point.y, view.hr * (1.16 + pulse * 0.1), 0, TAU);
        g.stroke();
      }
    }

    function drawBeam(g, still) {
      if (!lineSeq || lineSeq.lit < 2) {
        return;
      }
      var hue = side(lineSeq.player).hue;
      var a = cellPoint(lineSeq.cells[0]);
      var b = cellPoint(lineSeq.cells[lineSeq.lit - 1]);
      var k = clamp((lineSeq.frame - (lineSeq.lit - 1) * LIGHT_STEP) / LIGHT_STEP, 0, 1);
      var ex = lerp(a.x, b.x, k);
      var ey = lerp(a.y, b.y, k);
      g.save();
      g.lineCap = "round";
      g.strokeStyle = hsla(hue, 96, 58, 0.22);
      g.lineWidth = view.cell * 0.66;
      chord(g, a.x, a.y, ex, ey);
      g.strokeStyle = hsla(hue, 98, 74, 0.55);
      g.lineWidth = view.cell * 0.3;
      chord(g, a.x, a.y, ex, ey);
      g.strokeStyle = "hsla(0, 0%, 100%, 0.75)";
      g.lineWidth = view.cell * 0.08;
      chord(g, a.x, a.y, ex, ey);
      if (lineSeq.lit === lineSeq.cells.length && !still) {
        /* A sheen running the length of the line once it is whole. */
        var t = (anim % 60) / 60;
        var sx = lerp(a.x, b.x, t);
        var sy = lerp(a.y, b.y, t);
        g.strokeStyle = "hsla(0, 0%, 100%, 0.5)";
        g.lineWidth = view.cell * 0.2;
        chord(g, sx - (b.x - a.x) * 0.12, sy - (b.y - a.y) * 0.12, sx, sy);
      }
      g.restore();
    }

    /* A column that cannot take another disc, or a press during the rival's
     * turn: answered on the board rather than swallowed. */
    function drawRefuse(g) {
      if (!refuse || refuse.soft) {
        return;
      }
      var box = rackBox();
      var col = refuse.col;
      var a = clamp(refuse.frames / 20, 0, 1);
      var x = view.x0 + col * view.cell;
      g.save();
      g.globalAlpha = a * 0.8;
      g.strokeStyle = "hsla(4, 92%, 66%, 0.9)";
      g.lineWidth = Math.max(1.4, view.cell * 0.05);
      roundPath(g, x + 2, box.y + 2, view.cell - 4, box.h - 4, view.cell * 0.3);
      g.stroke();
      g.restore();
    }

    function draw() {
      ensurePlate();
      var still = motionOff();
      ctx.clearRect(0, 0, view.w, view.h);
      /* The rack and everything resting in it take the shudder together; the
       * hovering previews are in the air above it and do not. */
      ctx.save();
      if (shudder > 0 && !still) {
        var k = shudder / SHAKE_FRAMES;
        ctx.translate(0, Math.sin(shudder * 2.1) * view.cell * 0.055 * k);
      }
      ctx.drawImage(plateNode, 0, 0, view.w, view.h);
      drawIntro(ctx);
      drawBoardDiscs(ctx, still);
      if (lineSeq) {
        drawVeil(ctx);
        drawBeam(ctx, still);
        drawLitDiscs(ctx, still);
      }
      drawBouncing(ctx);
      if (falling) {
        drawFalling(ctx, still);
      }
      drawSparks(ctx);
      ctx.restore();
      if (showGhost()) {
        drawGhostLayer(ctx, still);
      }
      if (showScan()) {
        drawScan(ctx, still);
      }
      drawRefuse(ctx);
    }

    function frame() {
      if (rafId === null) {
        return;
      }
      var host = panel();
      if ((host && host.hidden) || document.hidden) {
        rafId = window.requestAnimationFrame(frame);
        return;
      }
      update();
      draw();
      rafId = window.requestAnimationFrame(frame);
    }

    function startLoop() {
      if (rafId !== null) {
        return;
      }
      rafId = window.requestAnimationFrame(frame);
    }

    /* Pointer and keyboard both resolve to a column, then to attempt(). */
    function columnAt(clientX) {
      var rect = canvas.getBoundingClientRect();
      if (!rect.width) {
        return -1;
      }
      var px = (clientX - rect.left) * (view.w / rect.width);
      var col = Math.floor((px - view.x0) / view.cell);
      return col >= 0 && col < C4_W ? col : -1;
    }

    canvas.addEventListener("pointermove", function (event) {
      hoverCol = columnAt(event.clientX);
    });

    canvas.addEventListener("pointerleave", function () {
      hoverCol = -1;
    });

    canvas.addEventListener("pointerdown", function (event) {
      event.preventDefault();
      var col = columnAt(event.clientX);
      if (col !== -1) {
        hoverCol = col;
        attempt(col);
      }
    });

    /* The rack is a mouse board in the markup, but the column cursor is a real
     * state the ghost already understands, so the arrows steer it and a press
     * drops. Focus shows as a bracket around the chosen column. */
    canvas.addEventListener("keydown", function (event) {
      var key = event.key;
      if (key === "ArrowLeft" || key === "ArrowRight") {
        var start = hoverCol >= 0 ? hoverCol : 3;
        var step = key === "ArrowLeft" ? -1 : 1;
        for (var d = 1; d <= C4_W; d += 1) {
          var next = ((start + step * d) % C4_W + C4_W) % C4_W;
          if (c4DropRow(board, next) !== -1) {
            hoverCol = next;
            break;
          }
        }
        if (hoverCol < 0) {
          hoverCol = start;
        }
        sfx("tick");
        event.preventDefault();
        return;
      }
      if (key === "Enter" || key === " " || key === "ArrowDown") {
        attempt(hoverCol >= 0 ? hoverCol : idleColumn());
        event.preventDefault();
      }
    });

    canvas.addEventListener("blur", function () {
      hoverCol = -1;
    });

    selectEl.addEventListener("change", function () {
      var index = campaign.indexOf(selectEl.value);
      if (index >= 0 && campaign.isUnlocked(selectEl.value)) {
        loadLevel(c4Levels[index]);
      }
    });

    startBtn.addEventListener("click", function () {
      loadLevel(level);
    });

    App.quietResetGlyphFour = function () {
      clockRunning = false;
      /* The transient layers park; the turn lock and the queued reply do not,
       * so reopening the tab resumes the frame rather than replaying it. */
      hoverCol = -1;
      refuse = null;
      setMessage(t("c4Paused"), "");
    };

    setupView();
    loadLevel(c4Levels[campaign.indexOf(campaign.nextLevelId())]);
  }


  /* Exported for the other modules. */
  App.initGlyphFourGame = initGlyphFourGame;
})(window.CapitalConvert = window.CapitalConvert || {});
