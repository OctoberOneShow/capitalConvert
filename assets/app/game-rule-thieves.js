/* Rule Thieves - the collectible-rules duel in the shared game drawer.
 * A 5x5 board where the laws of movement are tokens: stepping onto one hands
 * that law to the whole board, so unlocking a diagonal for yourself unlocks it
 * for the rival too. Only the count in hand, the banner and the frozen cells
 * care who grabbed it. Move generation, application, the terminal table and the
 * ranked search are pure and exported, so every shipped opening can be proven
 * to hold the outcome its star bands were measured from. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  var t = App.t;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  var createCampaign = App.createCampaign;
  var fillCampaignPicker = App.fillCampaignPicker;
  var starsFor = App.starsFor;
  var RLT_N = 5;
  var RLT_CELLS = 25;
  var RLT_WIN = 100000;
  var RLT_TOKENS = 4;
  var RLT_ONE = 1;
  var RLT_TWO = 2;
  /* Token order is fixed everywhere: 0 diagonal, 1 jump, 2 swap, 3 hold. */
  var RLT_GLYPH = ["D", "J", "S", "H"];
  var RLT_NAME_KEY = ["rltRuleDiag", "rltRuleJump", "rltRuleSwap", "rltRuleHold"];
  var RLT_MOVE_GLYPH = ["\u00b7", "/", "^", "X"];
  var RLT_MOVE_WORD = ["rltMoveStep", "rltMoveDiag", "rltMoveJump", "rltMoveSwap"];
  var RLT_REASON_KEY = {
    objective: "rltWhyFlag",
    rules: "rltWhyRules",
    stalemate: "rltWhyStale",
    draw: "rltWhyDraw",
  };
  /* Directions carry their own kind so a diagonal step reads differently. */
  var RLT_DIRS = [
    [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0],
    [1, 1, 1], [1, -1, 1], [-1, 1, 1], [-1, -1, 1],
  ];
  var RLT_ORTH = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  /* Ranks: depth 0 judges one reply of value, 2 searches two plies, 4 adds the
   * rule-threat weighting. Openings below name the rank they are played at. */
  var rltRanks = [
    { depth: 0, noise: 0.5, threat: false, labelKey: "rltRankPick" },
    { depth: 2, noise: 0.12, threat: false, labelKey: "rltRankCut" },
    { depth: 4, noise: 0, threat: true, labelKey: "rltRankChamp" },
  ];

  /* Ten openings, and every one of them is proved rather than asserted. The
   * par is the shortest forced win measured in plies by App.ruleSolve from the
   * shipped position - 5, 7 or 9 - and cross-checked by an independent exact
   * mate search that reads only the module's own terminal table (no heuristic
   * leaf scores), so a position whose outcome cannot be falsified never ships.
   * starMoves is that measured par converted to the mover's own move count,
   * plus the standing slack of two and five, and the same measurement was taken
   * again for the five original rungs. The list is ordered by measured
   * difficulty: rival rank first, then par, then the prover's own node count, so
   * no rung is easier than the one that unlocks it. */
  var rltLevels = [
    {
      id: "o1", labelKey: "rltO1", twistKey: "rltTwist1", rank: 0, cap: 34,
      obj: 2, walls: [1, 3],
      one: [15, 14, 19], two: [0, 10, 4], tok: [17, 7, 20, 8],
      starMoves: [3, 5, 8],
    },
    {
      id: "o2", labelKey: "rltO2", twistKey: "rltTwist2", rank: 1, cap: 34,
      obj: 0, walls: [1, 5],
      one: [17, 12, 23], two: [4, 9, 3], tok: [10, 21, 18, 2],
      starMoves: [3, 5, 8],
    },
    {
      id: "o3", labelKey: "rltO3", twistKey: "rltTwist3", rank: 1, cap: 34,
      obj: 0, walls: [1, 5],
      one: [13, 19, 24], two: [9, 2, 8], tok: [10, 18, 21, 4],
      starMoves: [4, 6, 9],
    },
    {
      id: "o4", labelKey: "rltO4", twistKey: "rltTwist4", rank: 2, cap: 34,
      obj: 6, walls: [1, 7],
      one: [21, 19, 22], two: [8, 9, 2], tok: [20, 4, 0, 10],
      starMoves: [3, 5, 8],
    },
    {
      id: "o5", labelKey: "rltO5", twistKey: "rltTwist5", rank: 2, cap: 34,
      obj: 12, walls: [7, 11, 13, 17],
      one: [20, 22, 24], two: [0, 2, 4], tok: [6, 8, 16, 18],
      starMoves: [4, 6, 9],
    },
    {
      id: "o6", labelKey: "rltO6", twistKey: "rltTwist6", rank: 2, cap: 34,
      obj: 8, walls: [15, 20, 11, 16],
      one: [4, 6, 1], two: [8, 10, 0], tok: [19, 21, 23, 17],
      starMoves: [5, 7, 10],
    },
    {
      id: "o7", labelKey: "rltO7", twistKey: "rltTwist7", rank: 2, cap: 34,
      obj: 24, walls: [12, 21, 20, 2],
      one: [23, 14, 19], two: [24, 9, 4], tok: [15, 13, 5, 1],
      starMoves: [5, 7, 10],
    },
    {
      id: "o8", labelKey: "rltO8", twistKey: "rltTwist8", rank: 2, cap: 34,
      obj: 24, walls: [4, 21, 10, 23],
      one: [6, 2, 1], two: [16, 5, 9], tok: [20, 22, 0, 18],
      starMoves: [5, 7, 10],
    },
    {
      id: "o9", labelKey: "rltO9", twistKey: "rltTwist9", rank: 2, cap: 34,
      obj: 20, walls: [7, 8],
      one: [22, 10, 11], two: [20, 12, 16], tok: [0, 23, 4, 3],
      starMoves: [5, 7, 10],
    },
    {
      id: "o10", labelKey: "rltO10", twistKey: "rltTwist10", rank: 2, cap: 34,
      obj: 18, walls: [],
      one: [12, 7, 11], two: [18, 4, 8], tok: [24, 9, 0, 21],
      starMoves: [5, 7, 10],
    },
  ];

  /* --- pure rules ------------------------------------------------------- */

  function rltCell(x, y) {
    return y * RLT_N + x;
  }

  function rltX(cell) {
    return cell % RLT_N;
  }

  function rltY(cell) {
    return Math.floor(cell / RLT_N);
  }

  function rltInside(x, y) {
    return x >= 0 && y >= 0 && x < RLT_N && y < RLT_N;
  }

  function rltDist(a, b) {
    return Math.abs(rltX(a) - rltX(b)) + Math.abs(rltY(a) - rltY(b));
  }

  function rltFoe(side) {
    return 3 - side;
  }

  /* A level definition always answers with clean, indexable arrays. */
  function rltSetup(level) {
    var def = level || rltLevels[0];
    var cell = [];
    var wall = [];
    var i;
    for (i = 0; i < RLT_CELLS; i += 1) {
      cell.push(0);
      wall.push(0);
    }
    (def.walls || []).forEach(function (c) {
      if (c >= 0 && c < RLT_CELLS) {
        wall[c] = 1;
      }
    });
    (def.one || []).forEach(function (c) {
      if (c >= 0 && c < RLT_CELLS && !wall[c]) {
        cell[c] = RLT_ONE;
      }
    });
    (def.two || []).forEach(function (c) {
      if (c >= 0 && c < RLT_CELLS && !wall[c]) {
        cell[c] = RLT_TWO;
      }
    });
    var tok = [];
    for (i = 0; i < RLT_TOKENS; i += 1) {
      var where = (def.tok || [])[i];
      tok.push({
        c: typeof where === "number" && where >= 0 && where < RLT_CELLS ? where : -1,
        o: 0,
        s: 0,
      });
    }
    return {
      cell: cell,
      tok: tok,
      wall: wall,
      obj: def.obj,
      turn: RLT_ONE,
      ply: 0,
      lock: [],
      lockFor: 0,
      over: 0,
      reason: "",
      cap: def.cap || 30,
    };
  }

  function rltClone(state) {
    var tok = [];
    for (var i = 0; i < state.tok.length; i += 1) {
      tok.push({ c: state.tok[i].c, o: state.tok[i].o, s: state.tok[i].s });
    }
    return {
      cell: state.cell.slice(),
      tok: tok,
      wall: state.wall,
      obj: state.obj,
      turn: state.turn,
      ply: state.ply,
      lock: state.lock.slice(),
      lockFor: state.lockFor,
      over: state.over,
      reason: state.reason,
      cap: state.cap,
    };
  }

  function rltOwned(state, side) {
    var count = 0;
    for (var i = 0; i < state.tok.length; i += 1) {
      if (state.tok[i].o === side) {
        count += 1;
      }
    }
    return count;
  }

  /* A law is in force once anybody has taken its token: that is the whole twist,
   * the move it allows belongs to the board, not to the thief who grabbed it. */
  function rltLaw(state, index) {
    return state.tok[index] && state.tok[index].o !== 0;
  }

  function rltFrozen(state, side, cell) {
    return state.lockFor === side && state.lock.indexOf(cell) !== -1;
  }

  function rltStepable(state, side, cell) {
    if (cell < 0 || cell >= RLT_CELLS) {
      return false;
    }
    if (state.wall[cell] || state.cell[cell] !== 0) {
      return false;
    }
    return !rltFrozen(state, side, cell);
  }

  /* Legal moves for one side, derived purely from the laws in force. The side
   * does not have to be the one to move: the evaluator and the stalemate check
   * both read the other colour's options with the same function. */
  function rltMoves(state, side) {
    var out = [];
    if (!state || !state.cell || !state.tok || state.over) {
      return out;
    }
    if (side !== RLT_ONE && side !== RLT_TWO) {
      return out;
    }
    var foe = rltFoe(side);
    var diag = rltLaw(state, 0);
    var jump = rltLaw(state, 1);
    var i, d, here, step, mid, over, nx, ny;
    for (i = 0; i < RLT_CELLS; i += 1) {
      if (state.cell[i] !== side || rltFrozen(state, side, i)) {
        continue;
      }
      here = { x: rltX(i), y: rltY(i) };
      for (d = 0; d < RLT_DIRS.length; d += 1) {
        step = RLT_DIRS[d];
        if (step[2] && !diag) {
          continue;
        }
        nx = here.x + step[0];
        ny = here.y + step[1];
        if (!rltInside(nx, ny)) {
          continue;
        }
        over = rltCell(nx, ny);
        if (rltStepable(state, side, over)) {
          out.push({ p: i, q: over, k: step[2], v: -1 });
        } else if (jump && rltInside(nx + step[0], ny + step[1]) && state.cell[over] === foe) {
          mid = rltCell(nx + step[0], ny + step[1]);
          if (rltStepable(state, side, mid)) {
            out.push({ p: i, q: mid, k: 2, v: over });
          }
        }
      }
    }
    /* Swap belongs to its holder alone, once per possession: it recharges the
     * moment the token is taken back, which is what makes grabbing it urgent. */
    var swap = state.tok[2];
    if (swap.o === side && swap.s !== side) {
      var mine = [];
      var theirs = [];
      for (i = 0; i < RLT_CELLS; i += 1) {
        if (rltFrozen(state, side, i)) {
          continue;
        }
        if (state.cell[i] === side) {
          mine.push(i);
        } else if (state.cell[i] === foe && !rltFrozen(state, foe, i)) {
          theirs.push(i);
        }
      }
      for (i = 0; i < mine.length; i += 1) {
        for (d = 0; d < theirs.length; d += 1) {
          out.push({ p: mine[i], q: theirs[d], k: 3, v: theirs[d] });
        }
      }
    }
    return out;
  }

  /* Same move from the same state, same answer - and only the side to move can
   * ever be the one acting, so a double move is not expressible. */
  function rltApply(state, move) {
    if (!state || state.over || !move) {
      return null;
    }
    var side = state.turn;
    var legal = rltMoves(state, side);
    var chosen = null;
    var i;
    for (i = 0; i < legal.length; i += 1) {
      if (legal[i].p === move.p && legal[i].q === move.q && legal[i].k === move.k) {
        chosen = legal[i];
        break;
      }
    }
    if (!chosen) {
      return null;
    }
    var foe = rltFoe(side);
    var next = rltClone(state);
    next.cell[chosen.q] = side;
    next.cell[chosen.p] = 0;
    if (chosen.k === 3) {
      next.cell[chosen.p] = foe;
      next.tok[2].s = side;
    }
    for (i = 0; i < next.tok.length; i += 1) {
      if (next.tok[i].c === chosen.q && next.tok[i].o !== side) {
        next.tok[i].o = side;
        next.tok[i].s = 0;
      }
    }
    next.lock = [];
    next.lockFor = 0;
    if (next.tok[3].o === side) {
      var here = { x: rltX(chosen.q), y: rltY(chosen.q) };
      for (i = 0; i < RLT_ORTH.length; i += 1) {
        var nx = here.x + RLT_ORTH[i][0];
        var ny = here.y + RLT_ORTH[i][1];
        if (rltInside(nx, ny) && next.cell[rltCell(nx, ny)] === foe) {
          next.lock.push(rltCell(nx, ny));
        }
      }
      next.lockFor = foe;
    }
    next.ply += 1;
    next.turn = foe;
    next.over = 0;
    next.reason = "";
    if (chosen.q === next.obj) {
      next.over = side;
      next.reason = "objective";
    } else if (rltOwned(next, side) >= 2) {
      next.over = side;
      next.reason = "rules";
    } else if (!rltMoves(next, foe).length) {
      next.over = side;
      next.reason = "stalemate";
    } else if (next.ply >= next.cap) {
      next.over = 3;
      next.reason = "draw";
    }
    return next;
  }

  function rltTerminal(state) {
    if (!state || !state.over) {
      return null;
    }
    return {
      winner: state.over === 3 ? 0 : state.over,
      draw: state.over === 3,
      reason: state.reason || "draw",
      plies: state.ply,
    };
  }

  /* Does this side already hold a move that ends the game on the spot? The
   * answer is folded into the leaf score, so even rank one takes a free win and
   * the search never has to see the winning move itself. */
  function rltWinning(state, side, moves) {
    var list = moves || rltMoves(state, side);
    var before = rltOwned(state, side);
    for (var i = 0; i < list.length; i += 1) {
      if (list[i].q === state.obj) {
        return true;
      }
      if (before >= 1) {
        for (var k = 0; k < state.tok.length; k += 1) {
          if (state.tok[k].c === list[i].q && state.tok[k].o !== side) {
            return true;
          }
        }
      }
    }
    return false;
  }

  /* One scan per colour: how near its closest thief is to the banner, and how
   * many of them already stand on a cell that steps straight in. */
  function rltRace(state, side) {
    var best = RLT_CELLS + 2;
    var near = 0;
    for (var i = 0; i < RLT_CELLS; i += 1) {
      if (state.cell[i] !== side) {
        continue;
      }
      var d = rltDist(i, state.obj);
      if (d < best) {
        best = d;
      }
      if (d <= 1) {
        near += 1;
      }
    }
    return { best: best, near: near };
  }

  /* Rule-threat weighting, the strongest rank's extra lens: how many of this
   * colour's legal moves either close on the banner or lift a token, the two
   * ways of building the win that the opponent has to answer next turn. */
  function rltThreats(state, side, moves, race) {
    var count = 0;
    for (var i = 0; i < moves.length; i += 1) {
      var q = moves[i].q;
      if (rltDist(q, state.obj) < race.best) {
        count += 1;
      }
      for (var k = 0; k < state.tok.length; k += 1) {
        if (state.tok[k].c === q && state.tok[k].o !== side) {
          count += 1;
        }
      }
    }
    return count;
  }

  /* Static judgement from the side to move's seat, all integers. */
  function rltEval(state, threat) {
    var mine = state.turn;
    var foe = rltFoe(mine);
    var myMoves = rltMoves(state, mine);
    var foeMoves = rltMoves(state, foe);
    if (rltWinning(state, mine, myMoves)) {
      return RLT_WIN - state.ply - 1;
    }
    if (rltWinning(state, foe, foeMoves)) {
      return -(RLT_WIN - state.ply - 2);
    }
    var myRace = rltRace(state, mine);
    var foeRace = rltRace(state, foe);
    var score = 0;
    score += 52 * (rltOwned(state, mine) - rltOwned(state, foe));
    score += 5 * (myMoves.length - foeMoves.length);
    score += 13 * (myRace.near - foeRace.near);
    score += 9 * (foeRace.best - myRace.best);
    if (threat) {
      score += 7 * (rltThreats(state, mine, myMoves, myRace) - rltThreats(state, foe, foeMoves, foeRace));
    }
    return score;
  }

  function rltOrder(state, moves) {
    var side = state.turn;
    var owned = rltOwned(state, side);
    var ranked = moves.map(function (move) {
      var key = 0;
      if (move.q === state.obj) {
        key += 500;
      }
      for (var k = 0; k < state.tok.length; k += 1) {
        if (state.tok[k].c === move.q && state.tok[k].o !== side) {
          key += owned >= 1 ? 400 : 140;
        }
      }
      key += (RLT_CELLS - rltDist(move.q, state.obj)) * 4;
      if (move.k === 2) {
        key += 6;
      }
      return { move: move, key: key };
    });
    ranked.sort(function (a, b) {
      return b.key - a.key;
    });
    return ranked.map(function (entry) {
      return entry.move;
    });
  }

  function rltNega(state, depth, alpha, beta, ctx) {
    ctx.nodes += 1;
    if (ctx.nodes > ctx.budget) {
      ctx.abort = true;
      return 0;
    }
    var term = rltTerminal(state);
    if (term) {
      if (term.draw || !term.winner) {
        return 0;
      }
      return term.winner === state.turn ? RLT_WIN - state.ply : -(RLT_WIN - state.ply);
    }
    if (depth <= 0) {
      return rltEval(state, ctx.threat);
    }
    var moves = rltOrder(state, rltMoves(state, state.turn));
    if (!moves.length) {
      return -(RLT_WIN - state.ply);
    }
    var best = -RLT_WIN * 4;
    for (var i = 0; i < moves.length; i += 1) {
      var next = rltApply(state, moves[i]);
      if (!next) {
        continue;
      }
      var value = -rltNega(next, depth - 1, -beta, -alpha, ctx);
      if (ctx.abort) {
        return best > -RLT_WIN * 4 ? best : 0;
      }
      if (value > best) {
        best = value;
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

  function rltRankOf(index) {
    return rltRanks[Math.max(0, Math.min(rltRanks.length - 1, Math.floor(index || 0)))];
  }

  /* The rival's choice: pure search plus a noise band, never a second turn. */
  function rltPick(state, rankIndex) {
    if (!state || state.over) {
      return null;
    }
    var rank = typeof rankIndex === "number" ? rltRankOf(rankIndex) : rankIndex || rltRanks[0];
    var moves = rltOrder(state, rltMoves(state, state.turn));
    if (!moves.length) {
      return null;
    }
    var ctx = { nodes: 0, budget: 120000, abort: false, threat: !!rank.threat };
    var scored = moves.map(function (move) {
      var next = rltApply(state, move);
      var value = 0;
      if (next) {
        value = rank.depth > 0
          ? -rltNega(next, rank.depth - 1, -RLT_WIN * 4, RLT_WIN * 4, ctx)
          : -rltEval(next, false);
      }
      return { move: move, value: value };
    });
    scored.sort(function (a, b) {
      return b.value - a.value;
    });
    if (rank.noise && scored.length > 1 && Math.random() < rank.noise) {
      var spread = 1 + Math.floor(Math.random() * Math.min(3, scored.length - 1));
      return scored[spread].move;
    }
    return scored[0].move;
  }

  /* Iterative deepening, so the first proven win is the shortest one. */
  function rltSolve(state, depth) {
    var answer = { forced: false, winner: 0, plies: 0, nodes: 0, proven: false };
    if (!state) {
      return answer;
    }
    var term = rltTerminal(state);
    if (term) {
      answer.forced = !term.draw && !!term.winner;
      answer.winner = term.winner;
      answer.plies = term.plies;
      answer.proven = true;
      return answer;
    }
    var limit = Math.max(1, Math.min(10, Math.floor(Number(depth) || 4)));
    var ctx = { nodes: 0, budget: 260000, abort: false, threat: true };
    for (var d = 1; d <= limit; d += 1) {
      var value = rltNega(state, d, -RLT_WIN * 4, RLT_WIN * 4, ctx);
      if (ctx.abort) {
        break;
      }
      if (value > RLT_WIN / 2) {
        answer.forced = true;
        answer.winner = state.turn;
        answer.plies = RLT_WIN - value;
        answer.proven = true;
        break;
      }
      if (value < -RLT_WIN / 2) {
        answer.forced = true;
        answer.winner = rltFoe(state.turn);
        answer.plies = RLT_WIN + value;
        answer.proven = true;
        break;
      }
    }
    answer.nodes = ctx.nodes;
    return answer;
  }

  /* --- the panel -------------------------------------------------------- */

  function initRuleThievesGame(panelEl) {
    if (!panelEl) {
      return;
    }

    var campaign = createCampaign({ key: "rule-thieves-campaign", levels: rltLevels });
    var level = rltLevels[Math.max(0, campaign.indexOf(campaign.nextLevelId()))];
    var state = rltSetup(level);
    var history = [];
    var cells = [];
    var selected = -1;
    var targets = [];
    var cursor = { x: 2, y: 3 };
    var twoPlayer = false;
    var myMoves = 0;
    var resolving = false;

    var hud = document.createElement("div");
    hud.className = "game-hud";
    var turnEl = document.createElement("strong");
    var moveEl = document.createElement("strong");
    var ruleEl = document.createElement("strong");
    var lawEl = document.createElement("strong");
    hud.appendChild(rltStat("rltTurnLabel", turnEl));
    hud.appendChild(rltStat("rltMoveLabel", moveEl));
    hud.appendChild(rltStat("rltRuleLabel", ruleEl));
    hud.appendChild(rltStat("rltLawLabel", lawEl));

    var board = document.createElement("div");
    board.className = "rlt-board";
    board.setAttribute("tabindex", "0");
    board.setAttribute("role", "application");
    board.setAttribute("aria-label", t("rltFieldLabel"));

    var grid = document.createElement("div");
    grid.className = "rlt-grid";
    grid.setAttribute("role", "grid");
    for (var i = 0; i < RLT_CELLS; i += 1) {
      var cell = document.createElement("button");
      cell.type = "button";
      cell.className = "rlt-cell";
      cell.setAttribute("role", "gridcell");
      cell.tabIndex = -1;
      (function (index) {
        cell.addEventListener("click", function () {
          press(index);
        });
      })(i);
      cells.push(cell);
      grid.appendChild(cell);
    }
    board.appendChild(grid);

    var legend = document.createElement("p");
    legend.className = "rlt-legend";
    legend.setAttribute("aria-hidden", "true");
    board.appendChild(legend);

    var keys = document.createElement("p");
    keys.className = "rlt-keys";
    board.appendChild(keys);

    var result = document.createElement("p");
    result.className = "game-result";
    result.setAttribute("role", "status");

    var openRow = rltRow("rltOpenSelectLabel", "rltOpenSel", t("rltOpenSelectLabel"));
    var modeRow = rltRow("rltModeSelectLabel", "rltModeSel", t("rltModeSelectLabel"));
    var openSel = openRow.select;
    var modeSel = modeRow.select;
    rltOption(modeSel, "solo", t("rltModeSolo"));
    rltOption(modeSel, "two", t("rltModeTwo"));
    modeSel.value = "solo";

    var actions = document.createElement("div");
    actions.className = "game-actions";
    var newBtn = document.createElement("button");
    newBtn.type = "button";
    newBtn.className = "primary";
    var newLabel = document.createElement("span");
    newLabel.setAttribute("data-i18n", "btnNewRound");
    newLabel.textContent = t("btnNewRound");
    var newContent = document.createElement("span");
    newContent.className = "button-content";
    newContent.appendChild(newLabel);
    newBtn.appendChild(newContent);
    var bestEl = document.createElement("p");
    bestEl.className = "game-best";
    actions.appendChild(newBtn);
    actions.appendChild(bestEl);

    var hint = document.createElement("p");
    hint.className = "game-hint";
    hint.setAttribute("data-i18n", "rltHint");
    hint.textContent = t("rltHint");

    [hud, board, result, openRow.row, modeRow.row, actions, hint].forEach(function (node) {
      panelEl.appendChild(node);
    });

    function rltStat(key, valueEl) {
      var stat = document.createElement("div");
      stat.className = "game-stat";
      var label = document.createElement("span");
      label.setAttribute("data-i18n", key);
      label.textContent = t(key);
      stat.appendChild(label);
      stat.appendChild(valueEl);
      return stat;
    }

    function rltRow(key, id, text) {
      var row = document.createElement("div");
      row.className = "elements-row";
      var label = document.createElement("label");
      label.className = "elements-label";
      label.setAttribute("for", id);
      label.setAttribute("data-i18n", key);
      label.textContent = text;
      var select = document.createElement("select");
      select.className = "elements-select";
      select.id = id;
      row.appendChild(label);
      row.appendChild(select);
      return { row: row, select: select, label: label };
    }

    function rltOption(select, value, text) {
      var option = document.createElement("option");
      option.value = value;
      option.textContent = text;
      select.appendChild(option);
    }

    /* Whichever colour is allowed to click right now. */
    function activeSide() {
      return twoPlayer ? state.turn : RLT_ONE;
    }

    function rankIndex() {
      return level.rank || 0;
    }

    function targetsOf(moves, from) {
      return moves.filter(function (move) {
        return move.p === from;
      });
    }

    function moveAt(list, cell) {
      for (var i = 0; i < list.length; i += 1) {
        if (list[i].q === cell) {
          return list[i];
        }
      }
      return null;
    }

    function refreshPicker() {
      fillCampaignPicker(
        openSel,
        campaign,
        function (def) {
          return t(def.labelKey);
        },
        t("elementsLocked"),
      );
      openSel.value = level.id;
      bestEl.textContent = t("campaignStars", {
        n: campaign.totalStars(),
        max: campaign.maxStars(),
      });
    }

    function renderHud() {
      var laws = 0;
      for (var k = 0; k < state.tok.length; k += 1) {
        if (state.tok[k].o !== 0) {
          laws += 1;
        }
      }
      var held1 = rltOwned(state, RLT_ONE);
      var held2 = rltOwned(state, RLT_TWO);
      lawEl.textContent = t("rltLawsOn", { n: laws });
      ruleEl.textContent = t("rltRuleCount", { a: held1, b: held2 });
      moveEl.textContent = twoPlayer
        ? t("rltPlyCount", { n: state.ply })
        : t("rltMoveCount", { n: myMoves });
      if (rltTerminal(state)) {
        turnEl.textContent = t("rltTurnOver");
      } else if (twoPlayer) {
        turnEl.textContent = state.turn === RLT_ONE ? t("rltP1Turn") : t("rltP2Turn");
      } else {
        turnEl.textContent = state.turn === RLT_ONE ? t("rltYourTurn") : t("rltRivalTurn");
      }
    }

    /* One pass fills a cell's text, its classes and its spoken words from the
     * same marks, so a state is never coloured without also being spelled. */
    function render() {
      var side = activeSide();
      var moves = rltTerminal(state) || resolving || side !== state.turn
        ? []
        : rltMoves(state, side);
      var live = targetsOf(moves, selected);
      for (var index = 0; index < RLT_CELLS; index += 1) {
        var piece = state.cell[index];
        var move = moveAt(live, index);
        var selectable = !move && piece === side && targetsOf(moves, index).length > 0;
        var cls = ["rlt-cell"];
        var text = [];
        var words = [];
        if (state.wall[index]) {
          cls.push("rlt-wall");
          text.push("\u25a8");
          words.push(t("rltSayWall"));
        }
        if (index === state.obj) {
          cls.push("rlt-flag");
          text.push("\u2691");
          words.push(t("rltSayFlag"));
        }
        for (var k = 0; k < state.tok.length; k += 1) {
          if (state.tok[k].c !== index) {
            continue;
          }
          var owner = state.tok[k].o;
          cls.push(owner === RLT_ONE ? "rlt-held1" : owner === RLT_TWO ? "rlt-held2" : "rlt-token");
          text.push(RLT_GLYPH[k] + (owner ? String(owner) : ""));
          words.push(t(RLT_NAME_KEY[k]));
          if (owner) {
            words.push(owner === RLT_ONE ? t("rltSayYou") : t("rltSayRival"));
          }
        }
        if (piece) {
          cls.push(piece === RLT_ONE ? "rlt-one" : "rlt-two");
          text.push(piece === RLT_ONE ? "\u25cf" : "\u25c6");
          words.push(piece === RLT_ONE ? t("rltSayYou") : t("rltSayRival"));
        }
        if (selected === index) {
          cls.push("rlt-sel");
          text.push("\u25b8");
        } else if (selectable) {
          cls.push("rlt-can");
          text.push("+");
          words.push(t("rltSayCan"));
        }
        if (move) {
          cls.push("rlt-to");
          text.push(RLT_MOVE_GLYPH[move.k]);
          words.push(t(RLT_MOVE_WORD[move.k] || "rltMoveStep"));
        }
        if (rltFrozen(state, state.turn, index)) {
          cls.push("rlt-lock");
          text.push("\u2715");
          words.push(t("rltSayFrozen"));
        }
        if (cursor.x === rltX(index) && cursor.y === rltY(index)) {
          cls.push("rlt-cursor");
        }
        var node = cells[index];
        node.textContent = text.join("");
        node.className = cls.join(" ");
        node.setAttribute("aria-disabled", move || selectable ? "false" : "true");
        node.setAttribute("aria-selected", selected === index ? "true" : "false");
        node.setAttribute(
          "aria-label",
          t("rltCellPos", { x: rltX(index) + 1, y: rltY(index) + 1 }) + " " + words.join(" "),
        );
      }
      renderHud();
      legend.textContent = [
        "\u25cf " + t("rltSayYou"),
        "\u25c6 " + t("rltSayRival"),
        "\u2691 " + t("rltSayFlag"),
        RLT_GLYPH.join(" ") + " " + t("rltSayTokens"),
        RLT_MOVE_GLYPH.join(" ") + " " + t("rltSayMoves"),
        "\u2715 " + t("rltSayFrozen"),
      ].join(" \u00b7 ");
      keys.textContent = twoPlayer ? t("rltKeysTwo") : t("rltKeysSolo");
    }

    function say(key, vars) {
      result.textContent = vars ? t(key, vars) : t(key);
    }

    function press(index) {
      if (!state || resolving) {
        return;
      }
      cursor.x = rltX(index);
      cursor.y = rltY(index);
      if (state.over) {
        say("rltOverNote");
        render();
        return;
      }
      var side = activeSide();
      if (side !== state.turn) {
        render();
        return;
      }
      var moves = rltMoves(state, side);
      if (selected >= 0) {
        var move = moveAt(targetsOf(moves, selected), index);
        if (move) {
          commit(move);
          return;
        }
        if (index === selected) {
          selected = -1;
          targets = [];
          render();
          return;
        }
      }
      if (state.cell[index] === side && targetsOf(moves, index).length) {
        selected = index;
        targets = targetsOf(moves, index);
        var held = selectedRuleAt(side, index);
        say("rltSelected", {
          r: held >= 0 ? t(RLT_NAME_KEY[held]) : t("rltSayPlain"),
          n: targets.length,
        });
        render();
        return;
      }
      selected = -1;
      targets = [];
      say(rltFrozen(state, side, index) ? "rltFrozenNote" : "rltIllegalNote");
      render();
    }

    /* Which rule, if any, sits under a piece - only used for the flavour line. */
    function selectedRuleAt(side, index) {
      for (var k = 0; k < state.tok.length; k += 1) {
        if (state.tok[k].c === index && state.tok[k].o === side) {
          return k;
        }
      }
      return -1;
    }

    function commit(move) {
      var mover = state.turn;
      var next = rltApply(state, move);
      if (!next) {
        selected = -1;
        targets = [];
        say("rltIllegalNote");
        render();
        return;
      }
      history.push(state);
      state = next;
      selected = -1;
      targets = [];
      if (mover === RLT_ONE) {
        myMoves += 1;
      }
      resolveRound();
      render();
    }

    /* One side acts per turn: the reply runs through rltApply exactly like the
     * human's move does, and it is resolved before the click handler returns,
     * so there is never an in-flight reply a second click could jump ahead of. */
    function resolveRound() {
      resolving = true;
      var guard = 0;
      while (!twoPlayer && !state.over && state.turn === RLT_TWO && guard < 6) {
        guard += 1;
        var reply = rltPick(state, rankIndex());
        if (!reply) {
          break;
        }
        var stepped = rltApply(state, reply);
        if (!stepped) {
          break;
        }
        history.push(state);
        state = stepped;
      }
      resolving = false;
      if (state.over) {
        announce();
      } else if (!twoPlayer) {
        say("rltYourTurnNote", { n: rltMoves(state, RLT_ONE).length });
      }
    }

    function winnerWord(side) {
      if (twoPlayer) {
        return side === RLT_ONE ? t("rltP1Name") : t("rltP2Name");
      }
      return side === RLT_ONE ? t("rltYouWord") : t("rltRivalWord");
    }

    function announce() {
      var term = rltTerminal(state);
      if (!term) {
        return;
      }
      var why = t(RLT_REASON_KEY[term.reason] || "rltWhyDraw");
      if (term.draw || !term.winner) {
        say("rltDrawOut", { n: state.ply, why: why });
        return;
      }
      if (!twoPlayer && term.winner === RLT_TWO) {
        say("rltLossOut", { n: myMoves, why: why, r: t(rltRankOf(rankIndex()).labelKey) });
        return;
      }
      var line = "";
      var notify = false;
      if (twoPlayer) {
        line = t("rltTwoWin", {
          p: winnerWord(term.winner),
          why: why,
          n: state.ply,
        });
        notify = true;
        logAction(t("logRuleThievesTwo", { n: state.ply }));
      } else {
        var starsWon = starsFor(myMoves, level.starMoves, "low");
        if (starsWon <= 0) {
          starsWon = 1;
        }
        var outcome = campaign.record(level.id, {
          stars: starsWon,
          best: myMoves,
          better: "low",
        });
        line = t("rltWinOut", {
          n: myMoves,
          s: starsWon,
          why: why,
          m: level.starMoves[0],
        });
        if (outcome.isBest) {
          line += " " + t("newBest");
        }
        if (outcome.unlockedNext) {
          line += " " + t("rltNextOpen");
        } else if (campaign.clearedCount() === rltLevels.length) {
          line += " " + t("rltCampaignDone");
        }
        logAction(t("logRuleThieves", { n: myMoves }));
        notify = outcome.isBest || outcome.firstClear;
      }
      result.textContent = line;
      var rect = board.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(notify);
      refreshPicker();
    }

    function loadLevel(def) {
      level = def || level;
      state = rltSetup(level);
      history = [];
      selected = -1;
      targets = [];
      myMoves = 0;
      resolving = false;
      cursor = { x: 2, y: 3 };
      refreshPicker();
      say("rltPrompt", {
        name: t(level.labelKey),
        twist: t(level.twistKey),
        r: twoPlayer ? t("rltModeTwo") : t(rltRankOf(rankIndex()).labelKey),
        n: level.cap,
      });
      render();
    }

    /* One full round back: the last entry whose side to move is your own. */
    function undoRound() {
      if (!history.length) {
        say("rltUndoEmpty");
        return;
      }
      var restored = null;
      var steps = 0;
      while (history.length && steps < 3) {
        restored = history.pop();
        steps += 1;
        if (restored.turn === RLT_ONE) {
          break;
        }
      }
      if (!restored) {
        say("rltUndoEmpty");
        return;
      }
      state = restored;
      myMoves = rltMyMoves(state);
      selected = -1;
      targets = [];
      resolving = false;
      say("rltUndoDone", { n: myMoves });
      render();
    }

    /* Side one owns the odd plies, so its move count is half the elapsed ply. */
    function rltMyMoves(restored) {
      return Math.ceil(Math.max(0, restored.ply) / 2);
    }

    board.addEventListener("keydown", function (event) {
      if (!state) {
        return;
      }
      var raw = typeof event.key === "string" ? event.key : "";
      var key = raw.length === 1 ? raw.toLowerCase() : raw;
      var side = activeSide();
      var arrowsOk = twoPlayer ? side === RLT_TWO : true;
      var wasdOk = twoPlayer ? side === RLT_ONE : true;
      var glide = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      var hand = { a: [-1, 0], d: [1, 0], w: [0, -1], s: [0, 1] };
      var step = (arrowsOk && glide[key]) || (wasdOk && hand[key]);
      if (step) {
        event.preventDefault();
        cursor.x = Math.max(0, Math.min(RLT_N - 1, cursor.x + step[0]));
        cursor.y = Math.max(0, Math.min(RLT_N - 1, cursor.y + step[1]));
        cells[rltCell(cursor.x, cursor.y)].focus();
        render();
      } else if (key === "Enter" || key === " " || (wasdOk && key === "e")) {
        event.preventDefault();
        press(rltCell(cursor.x, cursor.y));
      } else if (key === "u") {
        event.preventDefault();
        undoRound();
      } else if (key === "r") {
        event.preventDefault();
        loadLevel(level);
      } else if (key === "Escape") {
        event.preventDefault();
        selected = -1;
        targets = [];
        render();
      }
    });

    openSel.addEventListener("change", function () {
      var index = campaign.indexOf(openSel.value);
      if (index >= 0 && campaign.isUnlocked(openSel.value)) {
        loadLevel(rltLevels[index]);
        return;
      }
      refreshPicker();
      say("rltLockedNote", { name: t(level.labelKey) });
    });

    modeSel.addEventListener("change", function () {
      twoPlayer = modeSel.value === "two";
      loadLevel(level);
    });

    newBtn.addEventListener("click", function () {
      loadLevel(level);
    });

    App.quietResetRuleThieves = function () {
      /* The drawer is closing: keep the board exactly as the player left it and
       * only drop the pending selection, since the reply is never deferred. */
      resolving = false;
      selected = -1;
      targets = [];
      render();
      say("rltPaused");
    };

    loadLevel(rltLevels[Math.max(0, campaign.indexOf(campaign.nextLevelId()))]);
  }

  /* Bilingual copy travels with the game: addStrings only fills keys i18n.js
   * does not already own, so the shared dictionary stays authoritative. */
  App.addStrings({
    en: {
      "tabRuleThieves": "Rule Thieves",
      "rltO1": "Shared Line",
      "rltO2": "Two-Rule Scramble",
      "rltO3": "Vault Behind Glass",
      "rltO4": "Corner Trap",
      "rltO5": "Champion's Opening",
      "rltO6": "Bottom Rank Chain",
      "rltO7": "Two Laws Live",
      "rltO8": "Take It Back",
      "rltO9": "Plugged Banner",
      "rltO10": "The Swap Shot",
      "rltTwist1": "both key tokens sit on the one shared file",
      "rltTwist2": "two tokens are one step away on move one",
      "rltTwist3": "the vault has a single door and it is diagonal",
      "rltTwist4": "one greedy grab hands over the win",
      "rltTwist5": "every token sits on a door of the vault",
      "rltTwist6": "all four tokens wait in the bottom two rows and the last grab is a diagonal",
      "rltTwist7": "the two tokens you need are diagonal and jump, so the rival answers in kind",
      "rltTwist8": "the hold you need is grabbed by the rival first and has to be taken back",
      "rltTwist9": "a rival stands on the banner, so the win is carried law by law",
      "rltTwist10": "the guard sits on the flag and only a swap can put a thief on it",
      "rltRankPick": "Pickpocket",
      "rltRankCut": "Cutpurse",
      "rltRankChamp": "Fence",
      "rltRuleDiag": "diagonal",
      "rltRuleJump": "jump",
      "rltRuleSwap": "swap",
      "rltRuleHold": "hold",
      "rltMoveStep": "a step",
      "rltMoveDiag": "a diagonal",
      "rltMoveJump": "a jump",
      "rltMoveSwap": "a swap",
      "rltWhyFlag": "the banner was taken",
      "rltWhyRules": "two laws were held",
      "rltWhyStale": "the rival had no legal move",
      "rltWhyDraw": "the night ran out",
      "rltTurnLabel": "Move",
      "rltMoveLabel": "Moves",
      "rltRuleLabel": "Laws in hand",
      "rltLawLabel": "Laws live",
      "rltOpenSelectLabel": "Choose an opening",
      "rltModeSelectLabel": "Who is playing",
      "rltModeSolo": "Solo vs the thief",
      "rltModeTwo": "Two players, one keyboard",
      "rltYourTurn": "yours",
      "rltRivalTurn": "rival",
      "rltP1Turn": "player 1",
      "rltP2Turn": "player 2",
      "rltTurnOver": "over",
      "rltMoveCount": "{n}",
      "rltPlyCount": "{n} plies",
      "rltRuleCount": "{a} - {b}",
      "rltLawsOn": "{n} of 4",
      "rltFieldLabel": "Five by five board of rule tokens. Click a piece, then a lit cell.",
      "rltCellPos": "Column {x}, row {y}:",
      "rltSayYou": "yours",
      "rltSayRival": "rival",
      "rltSayFlag": "banner",
      "rltSayWall": "wall",
      "rltSayTokens": "rule tokens",
      "rltSayMoves": "legal moves",
      "rltSayCan": "selectable",
      "rltSayFrozen": "frozen",
      "rltSayPlain": "the base law",
      "rltYouWord": "You",
      "rltRivalWord": "The thief",
      "rltP1Name": "Player 1",
      "rltP2Name": "Player 2",
      "rltPrompt": "{name}: {twist}. Rival: {r}. Win by taking the banner, by holding two laws at once, or by leaving your rival with no legal move - {n} plies is the whole night.",
      "rltSelected": "Held: {r}. {n} legal cells are lit - click one, or press Enter on a lit cell.",
      "rltYourTurnNote": "Your move. {n} legal cells.",
      "rltWinOut": "You stole it in {n} moves - {s} stars ({why}). Three stars need {m} moves.",
      "rltLossOut": "The thief won ({why}) after {n} of your moves.",
      "rltDrawOut": "The night ran out after {n} plies ({why}).",
      "rltTwoWin": "{p} wins after {n} plies ({why}). Two-player rounds keep no stars.",
      "rltNextOpen": "Next opening unlocked.",
      "rltCampaignDone": "All ten openings cleaned out.",
      "rltIllegalNote": "That cell is not legal under the laws in force - and the laws belong to both of you.",
      "rltFrozenNote": "That cell is frozen for one turn by the rival's hold.",
      "rltOverNote": "The round is over. Press R or New Round for another.",
      "rltLockedNote": "Locked. {name} is still the opening to beat.",
      "rltUndoEmpty": "Nothing to undo yet - the round has not started.",
      "rltUndoDone": "One full round back. Your moves: {n}.",
      "rltKeysSolo": "Arrows move the cursor, Enter selects and confirms, U undoes a full round, R restarts.",
      "rltKeysTwo": "Player 1: W A S D to move the cursor, E to select and confirm. Player 2: arrows and Enter. U undoes a round, R restarts.",
      "rltHint": "Taking a token never just arms you: the law it grants is legal for the rival on their very next move.",
      "rltPaused": "Paused - the board is exactly where you left it.",
      "logRuleThieves": "Cleaned a Rule Thieves opening in {n} moves",
      "logRuleThievesTwo": "Rule Thieves, two players: {n} plies",
    },
    zh: {
      "tabRuleThieves": "规则窃贼",
      "rltO1": "共享线",
      "rltO2": "双律混战",
      "rltO3": "玻璃库房",
      "rltO4": "角落陷阱",
      "rltO5": "冠军开局",
      "rltO6": "底线连环",
      "rltO7": "双律同开",
      "rltO8": "失而复得",
      "rltO9": "堵门的贼",
      "rltO10": "换位一击",
      "rltTwist1": "两枚关键令牌都卡在同一条中线上",
      "rltTwist2": "第一步就有两枚令牌触手可得",
      "rltTwist3": "库房只有一个门，而且是斜角",
      "rltTwist4": "贪手一拿就把胜局递出去",
      "rltTwist5": "每枚令牌都守在库房的一个门口",
      "rltTwist6": "四枚令牌全压在最下面两排，最后一枚得斜着才够得到",
      "rltTwist7": "要拿的两枚正是斜行和跳过，对手下一步就能照着用",
      "rltTwist8": "你要的那枚冻结先被对手摸走，还得再抢回来",
      "rltTwist9": "一个对手正站在旗帜上，胜局只能一条律法一条律法地搬过去",
      "rltTwist10": "看守就坐在旗帜上，只有换位能把自己的棋子放上去",
      "rltRankPick": "三只手",
      "rltRankCut": "飞贼",
      "rltRankChamp": "销赃人",
      "rltRuleDiag": "斜行",
      "rltRuleJump": "跳过",
      "rltRuleSwap": "换位的",
      "rltRuleHold": "冻结",
      "rltMoveStep": "一步",
      "rltMoveDiag": "斜步",
      "rltMoveJump": "跳步",
      "rltMoveSwap": "换位",
      "rltWhyFlag": "夺下旗帜",
      "rltWhyRules": "手握两条律法",
      "rltWhyStale": "对手无路可走",
      "rltWhyDraw": "夜色用尽",
      "rltTurnLabel": "轮到",
      "rltMoveLabel": "步数",
      "rltRuleLabel": "在手法条",
      "rltLawLabel": "生效法条",
      "rltOpenSelectLabel": "选择开局",
      "rltModeSelectLabel": "谁来玩",
      "rltModeSolo": "单人对战窃贼",
      "rltModeTwo": "双人共用一个键盘",
      "rltYourTurn": "你",
      "rltRivalTurn": "对手",
      "rltP1Turn": "玩家 1",
      "rltP2Turn": "玩家 2",
      "rltTurnOver": "结束",
      "rltMoveCount": "{n}",
      "rltPlyCount": "{n} 步",
      "rltRuleCount": "{a} - {b}",
      "rltLawsOn": "{n}/4",
      "rltFieldLabel": "5×5 规则令牌棋盘：先点自己的棋子，再点亮起的格子。",
      "rltCellPos": "第 {x} 列第 {y} 行：",
      "rltSayYou": "你的",
      "rltSayRival": "对手的",
      "rltSayFlag": "旗帜",
      "rltSayWall": "墙",
      "rltSayTokens": "规则令牌",
      "rltSayMoves": "合法落点",
      "rltSayCan": "可选",
      "rltSayFrozen": "已冻结",
      "rltSayPlain": "基础律法",
      "rltYouWord": "你",
      "rltRivalWord": "窃贼",
      "rltP1Name": "玩家 1",
      "rltP2Name": "玩家 2",
      "rltPrompt": "{name}：{twist}。对手：{r}。获胜有三种：夺下旗帜、同时手握两条律法、或让对手一个合法格都没有——整局最多 {n} 步。",
      "rltSelected": "手持「{r}」。已点亮 {n} 个合法格——点击它，或把光标移过去按回车。",
      "rltYourTurnNote": "轮到你了，{n} 个合法格。",
      "rltWinOut": "你用 {n} 步偷到了胜利——获得 {s} 星（{why}）。三星需要 {m} 步。",
      "rltLossOut": "窃贼赢了（{why}），你走了 {n} 步。",
      "rltDrawOut": "{n} 步后夜色用尽（{why}），判和。",
      "rltTwoWin": "{p} 在 {n} 步后获胜（{why}）。双人模式不记星。",
      "rltNextOpen": "解锁下一个开局。",
      "rltCampaignDone": "十个开局全部清空了。",
      "rltIllegalNote": "这个格子按当前生效的律法并不合法——而律法属于双方。",
      "rltFrozenNote": "这一格被对手的「冻结」定住一回合。",
      "rltOverNote": "这一局已经结束了，按 R 或「新一局」再来一局。",
      "rltLockedNote": "尚未解锁，还是要先打赢「{name}」。",
      "rltUndoEmpty": "还没有可以悔的棋——这一局才刚开始。",
      "rltUndoDone": "退回完整一回合。你的步数：{n}。",
      "rltKeysSolo": "方向键移动光标，回车选择并落子，U 悔一整回合，R 重开。",
      "rltKeysTwo": "玩家 1：W A S D 移动光标，E 选择并落子。玩家 2：方向键加回车。U 悔一整回合，R 重开。",
      "rltHint": "拿到令牌不只是武装自己：它带来的律法在对手下一步就能照样使用。",
      "rltPaused": "已暂停——棋盘原样保留。",
      "logRuleThieves": "用 {n} 步赢了规则窃贼的一局",
      "logRuleThievesTwo": "规则窃贼双人局：{n} 步",
    },
  });

  App.registerGame({
    name: "ruleThieves",
    tabKey: "tabRuleThieves",
    init: initRuleThievesGame,
    guide: {
      svg:
        '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="6" y="6" width="64" height="64" rx="5" fill="none" stroke="rgba(148,163,184,.45)"/>' +
        '<path d="M6 22h64M6 38h64M6 54h64M22 6v64M38 6v64M54 6v64" stroke="rgba(148,163,184,.22)"/>' +
        '<rect x="30" y="14" width="16" height="16" rx="3" fill="none" stroke="#ffd166" stroke-width="2"/>' +
        '<text x="38" y="26" font-size="10" fill="#ffd166" text-anchor="middle">&#9873;</text>' +
        '<circle cx="14" cy="62" r="6" fill="#22d3ee"/><circle cx="30" cy="62" r="6" fill="#22d3ee"/>' +
        '<circle cx="46" cy="14" r="6" fill="#ff6b35"/>' +
        '<path d="M30 56 38 44" stroke="#a3e635" stroke-width="2" stroke-dasharray="3 3"/>' +
        '<text x="80" y="20" font-size="9" fill="#a3e635">D</text>' +
        '<text x="80" y="34" font-size="9" fill="#22d3ee">J</text>' +
        '<text x="80" y="48" font-size="9" fill="#ff6b35">S</text>' +
        '<text x="80" y="62" font-size="9" fill="#fb7185">H</text>' +
        '<text x="94" y="20" font-size="7" fill="rgba(226,232,240,.8)">diag</text>' +
        '<text x="94" y="34" font-size="7" fill="rgba(226,232,240,.8)">jump</text>' +
        '<text x="94" y="48" font-size="7" fill="rgba(226,232,240,.8)">swap</text>' +
        '<text x="94" y="62" font-size="7" fill="rgba(226,232,240,.8)">hold</text></svg>',
      en: [
        "Aim: on a 5x5 board three thieves each race for one banner - but the rules of movement are tokens lying on marked cells.",
        "Base law: with nothing in hand a piece only steps one cell up, down, left or right into empty ground.",
        "Action: click one of your pieces - the legal cells light up and carry a glyph too: . step, / diagonal, ^ jump, X swap.",
        "The twist: a grabbed token is a law for the whole board, not a power for you alone. Take 'diagonal' or 'jump' and your rival may use it on their very next move; only 'swap' and 'hold' stay tied to whoever holds them, and only the count in hand is private.",
        "Win one of three ways: step onto the banner with any piece, hold two of the four tokens at once, or leave the side to move with no legal cell at all.",
        "Keys: arrows move the cursor, Enter selects and confirms, U undoes a full round, R restarts. In two-player mode player 1 drives WASD + E, player 2 drives the arrows + Enter; solo stars count your moves, two-player rounds keep none. The picker holds ten openings, each one a proved forced win, and the next unlocks only when the one before it is cleared.",
      ],
      zh: [
        "目标：5×5 盘上各有三枚窃贼争夺同一面旗帜，而走子规则是放在标记格上的令牌。",
        "基础律法：手里什么都没有时，棋子只能向上、下、左、右走一格，且只能落在空格。",
        "操作：点自己的棋子，合法落点会亮起并附带符号：· 直行、/ 斜行、^ 跳过、X 换位。",
        "反转之处：令牌一旦被拿走就成了整盘的律法，不是某个人的特权。拿了「斜行」或「跳过」，对手下一步照样能用；只有「换位」和「冻结」绑在持有者身上，而「在手法条数」始终是私有的。",
        "三种获胜方式：任一棋子踏上旗帜；同时手握四枚令牌中的两枚；或让轮到走子的一方一个合法格都没有。",
        "按键：方向键移动光标，回车选择并落子，U 悔掉完整一回合，R 重开。双人模式下玩家 1 用 WASD + E，玩家 2 用方向键 + 回车；单人按你的步数计星，双人不计星。选择框里是十个开局，每一个都被证明先手必胜，打赢前一个才会解锁下一个。",
      ],
    },
  });

  /* Exported for the other modules. */
  App.initRuleThievesGame = initRuleThievesGame;
  App.ruleMoves = rltMoves;
  App.ruleApply = rltApply;
  App.ruleSolve = rltSolve;
  App.ruleTerminal = rltTerminal;
  App.ruleSetup = rltSetup;
  App.rulePick = rltPick;
  App.ruleLevels = rltLevels;
  App.ruleRanks = rltRanks;
})(window.CapitalConvert = window.CapitalConvert || {});
