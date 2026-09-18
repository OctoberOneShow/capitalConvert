/* Elements simulation core - The self-contained falling-sand factory: cell grid, seeded step rules, board builders and goal evaluation. No DOM, no timers. */
(function (App) {
  /* ------------------------------------------------------------------
   * Elements
   * An elemental particle sandbox: a fixed cell grid, one generation per
   * tick, and four boards. The simulation, the boards and the win conditions
   * all live in the self-contained factory below, so tools/pet-harness.js can
   * lift it out of this file by name and drive the real rules headlessly -
   * no canvas, no DOM, no timers.
   *
   * The rules, in the order a step applies them:
   *   SAND  falls; blocked, it tries diagonally down-left and down-right so it
   *         piles into a slope, and it sinks through water by swapping with it.
   *   WATER falls, then moves diagonally down, then slides sideways (up to
   *         `spread` cells) so a standing column levels out instead of
   *         creeping sideways one cell at a time.
   *   PLANT is static. Every `growEvery`-th generation it grows one cell
   *         upward into a WATER cell and consumes that water.
   *   FIRE  is static. It ignites every adjacent PLANT (a fresh flame starts
   *         with a full life, which is what keeps a fire alive while it still
   *         has fuel), an adjacent WATER cell puts it out and is consumed, and
   *         with no fuel left it expires after `fireLife` generations.
   *   STONE never moves.
   * The step is seeded (a Lehmer generator, never Math.random), so two sims
   * built with the same options and the same board stay identical for ever.
   * ------------------------------------------------------------------ */
  function createElementsSim(options) {
    var settings = options || {};
    var cols = Math.max(16, parseInt(settings.cols, 10) || 80);
    var rows = Math.max(16, parseInt(settings.rows, 10) || 56);
    var seed = parseInt(settings.seed, 10);
    if (!isFinite(seed) || seed <= 0) {
      seed = 1;
    }
    seed = seed % 2147483647;
    if (seed === 0) {
      seed = 1;
    }

    var EMPTY = 0;
    var STONE = 1;
    var SAND = 2;
    var WATER = 3;
    var PLANT = 4;
    var FIRE = 5;
    /* The expansion set (ids 6 and up). Ids 0-5 keep the meaning they had
     * before it, so a board or a stored run never has to be re-read. */
    var WOOD = 6;
    var ASH = 7;
    var OIL = 8;
    var LAVA = 9;
    var ICE = 10;
    var STEAM = 11;
    var ACID = 12;
    var SEED = 13;
    var SMOKE = 14;
    var GLASS = 15;
    var VOID = 16;
    var ids = {
      empty: EMPTY,
      stone: STONE,
      sand: SAND,
      water: WATER,
      plant: PLANT,
      fire: FIRE,
      wood: WOOD,
      ash: ASH,
      oil: OIL,
      lava: LAVA,
      ice: ICE,
      steam: STEAM,
      acid: ACID,
      seed: SEED,
      smoke: SMOKE,
      glass: GLASS,
      void: VOID,
    };

    /* Generations a flame burns once it has nothing left to feed on. */
    var fireLife = 60;
    /* Plant growth cadence: one cell every this many generations. */
    var growEvery = 8;
    /* How far water reaches sideways in a single step. */
    var spread = 3;
    /* Oil is thinner than water and reaches further; lava is viscous, so it
     * only creeps - one cell at a time, and only on about half the steps. */
    var oilSpread = 4;
    var lavaSpread = 1;
    var lavaChance = 0.5;
    /* A gas carries its own countdown: steam turns back into water when it
     * runs out, smoke simply dissipates. */
    var steamLife = 120;
    var smokeLife = 90;
    /* How many solids one cell of acid can dissolve before it is spent. */
    var acidUses = 3;
    /* How often a newly lit fuel cell leaves a puff of smoke behind. */
    var smokeChance = 0.08;
    /* The two liquids that are not plain water, as option records, so the
     * dispatch in `step` reads as the rule it is. */
    var oilMotion = { spread: oilSpread, float: true };
    var lavaMotion = { spread: lavaSpread, chance: lavaChance };

    var total = cols * rows;
    var cells = [];
    var life = [];
    var movedAt = [];
    var generation = 0;
    var seedState = seed;
    var outOfRangeWrites = 0;
    /* Where a board lets the brush work, as a list of rectangles. An empty
     * list is the whole grid, which is free play and every board that asks for
     * no fence. A board that declares one refuses a paint outside it exactly
     * like a paint off the grid, so a goal can never be reached by painting
     * the winning material straight into the place that scores it: the
     * elements have to flow, react or travel there instead. */
    var pourZones = [];
    /* Set by the flood board: the marked target zone. */
    var zone = null;
    var zoneTarget = 0;
    /* How many of the goal's materials the board started with, so a
     * "reduce this to zero" HUD can count down from the opening position. */
    var zeroTarget = 0;
    /* Every board's win condition, dispatched on `kind` by `progress`. The
     * three original boards keep the numbers they have always had, so their
     * pinned tests read the same value, target and verdict. `countZero` and
     * `countAtLeast` name an element, `zoneFill` fills the marked zone, and
     * `countZeroPlusMin` is the grove's "no fire, and this much wood left". */
    var boardGoals = {
      free: { kind: "none" },
      grow: { kind: "growTop" },
      flood: { kind: "zoneFill" },
      extinguish: { kind: "countZero", element: FIRE },
      glass: { kind: "countAtLeast", element: GLASS, need: 16 },
      quench: { kind: "countZero", element: LAVA },
      thaw: { kind: "zoneFill" },
      spill: { kind: "countZero", element: OIL },
      etch: { kind: "zoneFill" },
      sprout: { kind: "growTop" },
      geyser: { kind: "zoneFill" },
      grove: {
        kind: "countZeroPlusMin",
        element: FIRE,
        material: WOOD,
        x0: 53,
        y0: 52,
        x1: 60,
        y1: 53,
        need: 14,
      },
    };
    /* A board may pour material on a fixed cadence - see `spawn`. */
    var spawners = [];
    /* A board may hand the player a paint allowance, counted in cells; zero
     * means they have as much as they like. */
    var ink = 0;
    var inkLeft = 0;
    /* Undo: a short ring of whole-board snapshots, taken before a stroke. */
    var undoLimit = 6;
    var undoRing = [];

    var at = 0;
    for (at = 0; at < total; at += 1) {
      cells[at] = EMPTY;
      life[at] = 0;
      movedAt[at] = 0;
    }

    /* Lehmer / MINSTD. Every intermediate value stays below 2^53, so the
     * sequence is exactly the same in every engine and every run. */
    function random() {
      seedState = (seedState * 48271) % 2147483647;
      if (seedState <= 0) {
        seedState = 1;
      }
      return (seedState - 1) / 2147483646;
    }

    function inBounds(x, y) {
      return x >= 0 && y >= 0 && x < cols && y < rows;
    }

    function index(x, y) {
      return y * cols + x;
    }

    /* A board declares the region its brush may touch, one rectangle at a
     * time. Rectangles are clipped to the grid here, so a builder can name the
     * full board and a zone can never promise paint the grid cannot hold. */
    function addPourZone(x0, y0, x1, y1) {
      pourZones.push({
        x0: Math.max(0, Math.min(x0, x1)),
        y0: Math.max(0, Math.min(y0, y1)),
        x1: Math.min(cols - 1, Math.max(x0, x1)),
        y1: Math.min(rows - 1, Math.max(y0, y1)),
      });
      return pourZones.length;
    }

    /* No zone at all means every cell is inside: free play is the sandbox. */
    function inPourZone(x, y) {
      if (!pourZones.length) {
        return true;
      }
      var step = 0;
      for (step = 0; step < pourZones.length; step += 1) {
        var rect = pourZones[step];
        if (x >= rect.x0 && x <= rect.x1 && y >= rect.y0 && y <= rect.y1) {
          return true;
        }
      }
      return false;
    }

    /* Out-of-bounds reads report STONE, so nothing ever falls off the grid,
     * and out-of-bounds writes are counted and dropped rather than landing on
     * a neighbouring row. */
    function get(x, y) {
      return inBounds(x, y) ? cells[index(x, y)] : STONE;
    }

    /* The counter a freshly placed cell starts with: a flame its life, a gas
     * its own countdown, acid the number of solids it can still eat. Anything
     * without a countdown starts at zero. */
    function initialLife(value) {
      if (value === FIRE) {
        return fireLife;
      }
      if (value === STEAM) {
        return steamLife;
      }
      if (value === SMOKE) {
        return smokeLife;
      }
      if (value === ACID) {
        return acidUses;
      }
      return 0;
    }

    /* What a flame can feed on, and what acid can eat. Both sets are the whole
     * definition of the rules that use them, so a new element joins a reaction
     * by being named here and nowhere else. */
    function isFuel(value) {
      return value === PLANT || value === WOOD || value === OIL || value === SEED;
    }

    function isSoluble(value) {
      return (
        value === STONE ||
        value === WOOD ||
        value === GLASS ||
        value === PLANT ||
        value === SAND ||
        value === ASH
      );
    }

    function set(x, y, value) {
      if (!inBounds(x, y)) {
        outOfRangeWrites += 1;
        return false;
      }
      var cell = index(x, y);
      cells[cell] = value;
      life[cell] = initialLife(value);
      movedAt[cell] = generation;
      return true;
    }

    /* Every cell counted by value in a single pass, so the panel's summary of
     * what is on the board never costs one full scan per element. */
    function tally() {
      var counts = [];
      var value = 0;
      for (value = 0; value <= VOID; value += 1) {
        counts[value] = 0;
      }
      var cell = 0;
      for (cell = 0; cell < total; cell += 1) {
        counts[cells[cell]] += 1;
      }
      return counts;
    }

    function count(value) {
      var found = 0;
      var cell = 0;
      for (cell = 0; cell < total; cell += 1) {
        if (cells[cell] === value) {
          found += 1;
        }
      }
      return found;
    }

    /* A cheap checksum of the live board: two sims with the same seed that
     * have stepped the same number of times hash the same. */
    function hash() {
      var value = 0;
      var cell = 0;
      for (cell = 0; cell < total; cell += 1) {
        value = (value * 31 + cells[cell] + 1) % 2147483647;
      }
      return value;
    }

    /* --- movement --------------------------------------------------- */

    function swap(a, b) {
      var value = cells[a];
      cells[a] = cells[b];
      cells[b] = value;
      var spare = life[a];
      life[a] = life[b];
      life[b] = spare;
      movedAt[b] = generation;
    }

    function moveTo(a, b) {
      cells[b] = cells[a];
      life[b] = life[a];
      cells[a] = EMPTY;
      life[a] = 0;
      movedAt[b] = generation;
    }

    /* A grain falls one cell, into empty space or - for a grain that sinks -
     * through the water it displaces. Blocked, it probes the two cells below
     * its diagonals in an order drawn from `random()`, so a pile still slides
     * off its own shoulder and spreads the same way on every replay. */
    function movePowder(cell, x, y, sink) {
      var below = cell + cols;
      var under = EMPTY;
      if (y + 1 < rows) {
        under = cells[below];
        if (under === EMPTY || (sink && under === WATER)) {
          swap(cell, below);
          return true;
        }
      }
      var firstSign = random() < 0.5 ? -1 : 1;
      var pass = 0;
      var target = 0;
      for (pass = 0; pass < 2; pass += 1) {
        var nx = x + (pass === 0 ? firstSign : -firstSign);
        var ny = y + 1;
        if (!inBounds(nx, ny)) {
          continue;
        }
        target = index(nx, ny);
        under = cells[target];
        if (under === EMPTY || (sink && under === WATER)) {
          swap(cell, target);
          return true;
        }
      }
      return false;
    }

    /* Sand: the powder that sinks through water and piles into a slope. */
    function moveSand(cell, x, y) {
      return movePowder(cell, x, y, true);
    }

    /* How far a liquid slides sideways in one direction: it reaches along its
     * own row until it finds an empty cell with an empty cell under it - a drop
     * it can fall into. Sliding only towards a drop is what makes a pool level
     * out and then come to rest, instead of a surface film wandering along a
     * flat floor for ever. Returns -1 when there is nowhere lower to go. */
    function flowReach(x, y, sign, reach) {
      var step = 0;
      for (step = 1; step <= reach; step += 1) {
        var nx = x + sign * step;
        if (!inBounds(nx, y) || cells[index(nx, y)] !== EMPTY) {
          return -1;
        }
        if (y + 1 < rows && cells[index(nx, y + 1)] === EMPTY) {
          return nx;
        }
      }
      return -1;
    }

    /* A liquid falls, then takes a diagonal, then reaches `spread` cells
     * sideways towards a drop - the shape water has always had. `opts.spread`
     * widens or shortens that reach, `opts.chance` lets a viscous liquid sit
     * still on some generations, and `opts.float` lifts the cell up through the
     * water directly above it, which is how oil climbs to the surface. */
    function moveLiquid(cell, x, y, opts) {
      var settings = opts || {};
      var reach = isFinite(settings.spread) ? settings.spread : spread;
      if (isFinite(settings.chance) && random() >= settings.chance) {
        return false;
      }
      var below = cell + cols;
      if (y + 1 < rows && cells[below] === EMPTY) {
        moveTo(cell, below);
        return true;
      }
      var firstSign = random() < 0.5 ? -1 : 1;
      var pass = 0;
      for (pass = 0; pass < 2; pass += 1) {
        var nx = x + (pass === 0 ? firstSign : -firstSign);
        var ny = y + 1;
        if (inBounds(nx, ny) && cells[index(nx, ny)] === EMPTY) {
          moveTo(cell, index(nx, ny));
          return true;
        }
      }
      for (pass = 0; pass < 2; pass += 1) {
        var sign = pass === 0 ? firstSign : -firstSign;
        var stop = flowReach(x, y, sign, reach);
        if (stop !== -1) {
          moveTo(cell, index(stop, y));
          return true;
        }
      }
      if (settings.float && y > 0 && cells[cell - cols] === WATER) {
        swap(cell, cell - cols);
        return true;
      }
      return false;
    }

    /* Water: falls, then diagonal, then slides sideways towards a drop, so a
     * pool levels out and rests. */
    function moveWater(cell, x, y) {
      return moveLiquid(cell, x, y);
    }

    /* A gas rises: straight up first, then up-left or up-right, then sideways -
     * all of it into empty space only, so a bubble under a lid stays put. */
    function moveGas(cell, x, y) {
      if (y <= 0) {
        return false;
      }
      var above = cell - cols;
      if (cells[above] === EMPTY) {
        moveTo(cell, above);
        return true;
      }
      var firstSign = random() < 0.5 ? -1 : 1;
      var pass = 0;
      for (pass = 0; pass < 2; pass += 1) {
        var nx = x + (pass === 0 ? firstSign : -firstSign);
        if (inBounds(nx, y - 1) && cells[index(nx, y - 1)] === EMPTY) {
          moveTo(cell, index(nx, y - 1));
          return true;
        }
      }
      for (pass = 0; pass < 2; pass += 1) {
        var sx = x + (pass === 0 ? firstSign : -firstSign);
        if (inBounds(sx, y) && cells[index(sx, y)] === EMPTY) {
          moveTo(cell, index(sx, y));
          return true;
        }
      }
      return false;
    }

    /* A plant drinks the water above it and grows into it. */
    function growPlant(cell, x, y) {
      if (y <= 0) {
        return false;
      }
      var above = cell - cols;
      if (cells[above] !== WATER) {
        return false;
      }
      cells[above] = PLANT;
      life[above] = 0;
      movedAt[above] = generation;
      return true;
    }

    /* The four orthogonal steps, in the order every reaction probes them. One
     * list, so no rule can depend on which way the sweep is running. */
    var dirX = [-1, 1, 0, 0];
    var dirY = [0, 0, -1, 1];

    /* Anything in `isFuel` catches here and becomes a flame with a full life. */
    function ignite(x, y) {
      if (!inBounds(x, y)) {
        return false;
      }
      var cell = index(x, y);
      if (!isFuel(cells[cell])) {
        return false;
      }
      cells[cell] = FIRE;
      life[cell] = fireLife;
      movedAt[cell] = generation;
      return true;
    }

    /* A fuel cell that has just caught may leave a puff of smoke behind it.
     * Seeded, like every other roll in the sandbox. */
    function puff(x, y) {
      if (random() >= smokeChance) {
        return false;
      }
      var start = Math.floor(random() * 4);
      var step = 0;
      var which = 0;
      for (step = 0; step < 4; step += 1) {
        which = (start + step) % 4;
        if (
          inBounds(x + dirX[which], y + dirY[which]) &&
          cells[index(x + dirX[which], y + dirY[which])] === EMPTY
        ) {
          set(x + dirX[which], y + dirY[which], SMOKE);
          return true;
        }
      }
      return false;
    }

    /* Fire: fed by anything that burns, put out by water, chilled by ice, and
     * out of time when it has neither. Adjacent water is consumed as the flame
     * is doused, and a flame that burns out where it stood leaves the cell
     * empty. */
    function burn(cell, x, y) {
      var doused = false;
      if (get(x - 1, y) === WATER) {
        set(x - 1, y, EMPTY);
        doused = true;
      } else if (get(x + 1, y) === WATER) {
        set(x + 1, y, EMPTY);
        doused = true;
      } else if (get(x, y - 1) === WATER) {
        set(x, y - 1, EMPTY);
        doused = true;
      } else if (get(x, y + 1) === WATER) {
        set(x, y + 1, EMPTY);
        doused = true;
      }
      if (doused) {
        cells[cell] = EMPTY;
        life[cell] = 0;
        movedAt[cell] = generation;
        return true;
      }

      /* Ice touching a flame melts where it stands, and chills the flame as it
       * goes - which is why a fire cannot sit against a wall of ice for ever,
       * and why a candle held to a dam cuts a channel instead of dying on it. */
      var chilled = false;
      var probe = 0;
      for (probe = 0; probe < 4; probe += 1) {
        if (get(x + dirX[probe], y + dirY[probe]) === ICE) {
          set(x + dirX[probe], y + dirY[probe], WATER);
          chilled = true;
        }
      }

      var fed = false;
      if (ignite(x - 1, y)) {
        fed = true;
        puff(x - 1, y);
      }
      if (ignite(x + 1, y)) {
        fed = true;
        puff(x + 1, y);
      }
      if (ignite(x, y - 1)) {
        fed = true;
        puff(x, y - 1);
      }
      if (ignite(x, y + 1)) {
        fed = true;
        puff(x, y + 1);
      }

      if (fed) {
        life[cell] = fireLife;
      } else {
        life[cell] = life[cell] - 1;
        if (chilled) {
          life[cell] = life[cell] - 1;
        }
      }
      if (life[cell] <= 0) {
        cells[cell] = EMPTY;
        life[cell] = 0;
      }
      return true;
    }

    /* Lava is heat: it sets light to anything that burns and turns sand into
     * glass, and it sets as stone the moment it meets water or ice. That second
     * path is why a goal of no lava left is always reachable. */
    function lavaReacts(cell, x, y) {
      var step = 0;
      for (step = 0; step < 4; step += 1) {
        var quenched = get(x + dirX[step], y + dirY[step]);
        if (quenched === WATER) {
          set(x + dirX[step], y + dirY[step], STEAM);
          set(x, y, STONE);
          return true;
        }
        if (quenched === ICE) {
          set(x + dirX[step], y + dirY[step], WATER);
          set(x, y, STONE);
          return true;
        }
      }
      for (step = 0; step < 4; step += 1) {
        var nx = x + dirX[step];
        var ny = y + dirY[step];
        if (!inBounds(nx, ny)) {
          continue;
        }
        var near = cells[index(nx, ny)];
        if (near === SAND) {
          set(nx, ny, GLASS);
        } else if (isFuel(near)) {
          ignite(nx, ny);
        }
      }
      return true;
    }

    /* Acid eats one neighbouring solid per generation and spends one of its
     * uses doing it, so a fixed amount of acid can never dissolve an unbounded
     * amount of board. The last use leaves nothing behind. */
    function corrode(cell, x, y) {
      var step = 0;
      var eaten = false;
      for (step = 0; step < 4; step += 1) {
        var nx = x + dirX[step];
        var ny = y + dirY[step];
        if (!inBounds(nx, ny) || !isSoluble(cells[index(nx, ny)])) {
          continue;
        }
        set(nx, ny, EMPTY);
        eaten = true;
        break;
      }
      if (!eaten) {
        return false;
      }
      life[cell] = life[cell] - 1;
      if (life[cell] <= 0) {
        cells[cell] = EMPTY;
        life[cell] = 0;
      }
      movedAt[cell] = generation;
      return true;
    }

    /* A seed that has come to rest next to water sprouts: the seed becomes the
     * plant and the water it drank is consumed. */
    function sprout(cell, x, y) {
      var step = 0;
      for (step = 0; step < 4; step += 1) {
        var nx = x + dirX[step];
        var ny = y + dirY[step];
        if (get(nx, ny) !== WATER) {
          continue;
        }
        cells[cell] = PLANT;
        life[cell] = 0;
        movedAt[cell] = generation;
        set(nx, ny, EMPTY);
        return true;
      }
      return false;
    }

    /* Steam touching ice condenses at once, and takes the ice with it. */
    function condense(cell, x, y) {
      var step = 0;
      for (step = 0; step < 4; step += 1) {
        var nx = x + dirX[step];
        var ny = y + dirY[step];
        if (get(nx, ny) !== ICE) {
          continue;
        }
        set(nx, ny, WATER);
        cells[cell] = WATER;
        life[cell] = 0;
        movedAt[cell] = generation;
        return true;
      }
      return false;
    }

    /* Steam and smoke share their tick: the gas counts its life down, and then
     * either condenses back into water (steam) or simply dissipates (smoke).
     * The counter rides along with every move, so a rising plume keeps its age. */
    function gasStep(cell, x, y, kind) {
      if (kind === STEAM && condense(cell, x, y)) {
        return true;
      }
      life[cell] = life[cell] - 1;
      if (life[cell] <= 0) {
        cells[cell] = kind === STEAM ? WATER : EMPTY;
        life[cell] = 0;
        movedAt[cell] = generation;
        return true;
      }
      return moveGas(cell, x, y);
    }

    /* Void is a drain: every generation it erases each neighbour that is not a
     * wall. Nothing it touches can come back, so it is only ever a fixture. */
    function drain(cell, x, y) {
      var step = 0;
      var eaten = false;
      for (step = 0; step < 4; step += 1) {
        var nx = x + dirX[step];
        var ny = y + dirY[step];
        if (!inBounds(nx, ny)) {
          continue;
        }
        var near = cells[index(nx, ny)];
        if (near === EMPTY || near === STONE) {
          continue;
        }
        set(nx, ny, EMPTY);
        eaten = true;
      }
      return eaten;
    }

    /* --- boards: live sources and undo ------------------------------ */

    /* A board may pour material into a fixed cell on a fixed cadence - the
     * living version of a pre-loaded hopper. `remaining` of -1 pours for ever,
     * and the countdown is in generations, so a pour is as reproducible as any
     * other rule. A cell that is not empty is simply skipped. */
    function addSpawner(x, y, value, every, remaining) {
      spawners.push({
        x: x,
        y: y,
        value: value,
        every: Math.max(1, parseInt(every, 10) || 1),
        remaining: isFinite(remaining) ? remaining : -1,
      });
      return spawners.length;
    }

    function spawn() {
      var step = 0;
      for (step = 0; step < spawners.length; step += 1) {
        var spec = spawners[step];
        if (spec.remaining === 0) {
          continue;
        }
        if (generation % spec.every !== 0) {
          continue;
        }
        if (get(spec.x, spec.y) !== EMPTY) {
          continue;
        }
        set(spec.x, spec.y, spec.value);
        if (spec.remaining > 0) {
          spec.remaining -= 1;
        }
      }
    }

    /* Undo keeps a short ring of whole-board snapshots, taken before a stroke
     * by the panel. Six of them is a bounded handful of kilobytes for a
     * 4480-cell grid, and it never grows. Restoring rewinds the generator and
     * the random stream with the board, so a replay after an undo is the same
     * replay the player would have had. */
    function remember() {
      if (undoRing.length >= undoLimit) {
        undoRing.shift();
      }
      undoRing.push({
        cells: cells.slice(0),
        life: life.slice(0),
        movedAt: movedAt.slice(0),
        generation: generation,
        seedState: seedState,
      });
      return undoRing.length;
    }

    /* Drop the newest snapshot: a stroke the board refused changed nothing, so
     * it should not have cost the player an undo. */
    function forget() {
      if (undoRing.length) {
        undoRing.pop();
      }
      return undoRing.length;
    }

    function undo() {
      if (!undoRing.length) {
        return false;
      }
      var shot = undoRing.pop();
      var cell = 0;
      for (cell = 0; cell < total; cell += 1) {
        cells[cell] = shot.cells[cell];
        life[cell] = shot.life[cell];
        movedAt[cell] = shot.movedAt[cell];
      }
      generation = shot.generation;
      seedState = shot.seedState;
      return true;
    }

    function undoDepth() {
      return undoRing.length;
    }

    /* One generation. The sweep runs bottom-up so a grain that has already
     * fallen is not stepped twice, and the horizontal direction alternates per
     * row so piles and pools do not all lean the same way. Stone, wood, glass
     * and ice are inert solids: they are never stepped, they only change when a
     * neighbour that does react reaches for them. */
    function step() {
      generation += 1;
      var growNow = generation % growEvery === 0;
      spawn();
      var y = 0;
      var k = 0;
      for (y = rows - 1; y >= 0; y -= 1) {
        var forward = (y + generation) % 2 === 0;
        for (k = 0; k < cols; k += 1) {
          var x = forward ? k : cols - 1 - k;
          var cell = index(x, y);
          var value = cells[cell];
          if (
            value === EMPTY ||
            value === STONE ||
            value === WOOD ||
            value === GLASS ||
            value === ICE ||
            movedAt[cell] === generation
          ) {
            continue;
          }
          if (value === SAND) {
            moveSand(cell, x, y);
          } else if (value === ASH) {
            movePowder(cell, x, y, false);
          } else if (value === SEED) {
            /* A seed that could not fall has come to rest, so this is the
             * generation its sprouting is checked. */
            if (!movePowder(cell, x, y, false)) {
              sprout(cell, x, y);
            }
          } else if (value === WATER) {
            moveWater(cell, x, y);
          } else if (value === OIL) {
            moveLiquid(cell, x, y, oilMotion);
          } else if (value === LAVA) {
            if (!moveLiquid(cell, x, y, lavaMotion)) {
              lavaReacts(cell, x, y);
            }
          } else if (value === ACID) {
            if (!moveLiquid(cell, x, y)) {
              corrode(cell, x, y);
            }
          } else if (value === STEAM) {
            gasStep(cell, x, y, STEAM);
          } else if (value === SMOKE) {
            gasStep(cell, x, y, SMOKE);
          } else if (value === PLANT) {
            if (growNow) {
              growPlant(cell, x, y);
            }
          } else if (value === FIRE) {
            burn(cell, x, y);
          } else if (value === VOID) {
            drain(cell, x, y);
          }
        }
      }
      return generation;
    }

    /* --- boards ----------------------------------------------------- */

    function fill(x0, y0, x1, y1, value) {
      var x = 0;
      var y = 0;
      for (y = y0; y <= y1; y += 1) {
        for (x = x0; x <= x1; x += 1) {
          set(x, y, value);
        }
      }
    }

    function clearBoard() {
      var cell = 0;
      for (cell = 0; cell < total; cell += 1) {
        cells[cell] = EMPTY;
        life[cell] = 0;
        movedAt[cell] = 0;
      }
      generation = 0;
      seedState = seed;
      /* A board's fence belongs to the board, so it is cleared with it and
       * re-declared by whichever builder runs next. */
      pourZones = [];
      zone = null;
      zoneTarget = 0;
      zeroTarget = 0;
      /* A reload hands back the whole picture: the pours a board declared are
       * re-declared by its builder, the allowance is refilled and no stroke
       * from the previous life of the board is left to undo. */
      spawners = [];
      inkLeft = ink;
      undoRing = [];
    }

    /* Free play: a hopper pouring sand, a stone basin holding a pool, and a
     * small garden. Nothing to win - just something alive to poke at. */
    function buildFree() {
      var floor = rows - 1;
      var hopTop = 4;
      var hopX = Math.round(cols * 0.22);
      var step = 0;
      var x = 0;
      var gx = 0;

      fill(0, floor, cols - 1, floor, STONE);
      /* The shelf the hopper pours onto. */
      fill(6, Math.round(rows * 0.5), Math.round(cols * 0.4), Math.round(rows * 0.5), STONE);

      /* A sand load first, then the funnel walls on top of it, so the walls
       * win where the two overlap and the throat stays open. */
      fill(hopX - 4, hopTop + 1, hopX + 4, hopTop + 5, SAND);
      for (step = 0; step < 6; step += 1) {
        set(hopX - 6 + step, hopTop + step, STONE);
        set(hopX + 6 - step, hopTop + step, STONE);
      }

      /* A stone bowl with a pool in it. */
      var basinLeft = Math.round(cols * 0.66);
      var basinRight = cols - 4;
      var rim = floor - 16;
      fill(basinLeft, rim, basinLeft + 1, floor - 1, STONE);
      fill(basinRight - 1, rim, basinRight, floor - 1, STONE);
      fill(basinLeft, floor - 1, basinRight, floor - 1, STONE);
      fill(basinLeft + 2, floor - 9, basinRight - 2, floor - 2, WATER);

      /* A garden on the floor between the hopper and the bowl. */
      for (gx = 34; gx <= 46; gx += 3) {
        set(gx, floor - 1, PLANT);
        set(gx, floor - 2, PLANT);
      }

      /* One live drip over the bowl, so the sandbox keeps moving even when the
       * player is only watching it. It pours the same way a hopper does - on a
       * fixed cadence, into an empty cell - so it costs nothing to replay. */
      addSpawner(basinLeft + 8, 6, WATER, 12, -1);
    }

    /* Grow: a one-cell-wide well with a planted seed in a shallow pool. The
     * plant climbs by drinking the water directly above it, so the pool runs
     * dry partway up and the player has to keep pouring water down the well.
     * The well is a single column on purpose: every drop the player pours
     * lands on the plant instead of pooling beside it. The pour zone is that
     * column, so the water has to fall the shaft and the plant has to drink it
     * one cell at a time. */
    function buildGrow() {
      var floor = rows - 1;
      var cx = Math.floor(cols / 2);
      fill(0, floor, cols - 1, floor, STONE);
      fill(cx - 4, 0, cx - 1, floor - 1, STONE);
      fill(cx + 1, 0, cx + 4, floor - 1, STONE);
      fill(cx, floor - 20, cx, floor - 1, WATER);
      set(cx, floor - 1, PLANT);
      addPourZone(cx, 0, cx, floor - 1);
    }

    /* Extinguish: a one-cell-wide serpentine hedge with a fire at its near
     * end. Flames cross one cell per generation, so the front really does walk
     * the garden while the player runs for the water. The pour zone follows the
     * hedge - the air above every row and the gaps between them - so a flame
     * can be met wherever it walks, while the fuel rows themselves stay out of
     * the brush's reach: an eraser that could take the fire itself would put
     * the board out in one stroke. */
    function buildExtinguish() {
      var floor = rows - 1;
      var x0 = 4;
      var x1 = cols - 5;
      var top = 4;
      var pitch = 6;
      var bottom = rows - 6;
      var y = top;
      var forward = true;
      var x = 0;
      var span = 0;
      var hedgeRows = [];
      while (y <= bottom) {
        hedgeRows.push(y);
        if (forward) {
          for (x = x0; x <= x1; x += 1) {
            set(x, y, PLANT);
          }
        } else {
          for (x = x1; x >= x0; x -= 1) {
            set(x, y, PLANT);
          }
        }
        if (y + pitch > bottom) {
          break;
        }
        var connectorX = forward ? x1 : x0;
        for (span = 1; span <= pitch; span += 1) {
          set(connectorX, y + span, PLANT);
        }
        y += pitch;
        forward = !forward;
      }
      fill(0, floor, cols - 1, floor, STONE);
      set(x0, top, FIRE);
      /* The bands of open air the hedge leaves behind, top to bottom. */
      var bandTop = 0;
      hedgeRows.forEach(function (hedgeRow) {
        addPourZone(0, bandTop, cols - 1, hedgeRow - 1);
        bandTop = hedgeRow + 1;
      });
      addPourZone(0, bandTop, cols - 1, floor);
    }

    /* Flood: a stone basin with a marked target zone. Paint is refused at or
     * below the rim, so the water has to be poured in from above and allowed
     * to find its own level. */
    function buildFlood() {
      var floor = rows - 1;
      var left = Math.round(cols * 0.3);
      var right = Math.round(cols * 0.7);
      var rim = Math.round(rows * 0.42);
      fill(0, floor, cols - 1, floor, STONE);
      fill(left, rim, left + 1, floor - 1, STONE);
      fill(right - 1, rim, right, floor - 1, STONE);
      fill(left, floor - 1, right, floor - 1, STONE);
      zone = { x0: left + 3, y0: floor - 10, x1: right - 3, y1: floor - 2 };
      zoneTarget = Math.ceil(
        (zone.x1 - zone.x0 + 1) * (zone.y1 - zone.y0 + 1) * 0.65,
      );
      /* Everything above the rim, which is where the weather is. */
      addPourZone(0, 0, cols - 1, rim - 1);
    }

    /* A marked rectangle with its target already worked out. The zone and the
     * number the HUD prints are set together, so a tinted rectangle can never
     * disagree with the goal it stands for. */
    function markZone(x0, y0, x1, y1, frac) {
      zone = { x0: x0, y0: y0, x1: x1, y1: y1 };
      zoneTarget = Math.ceil(
        (x1 - x0 + 1) * (y1 - y0 + 1) * frac,
      );
    }

    /* Glassworks: a stone crucible holding a lava bath, fed by a stone funnel
     * with a charge of sand already in it. Sand only turns to glass where it
     * touches lava, and glass is a solid, so the bath is skinned row by row -
     * the charge covers part of it and the player has to cover the rest. The
     * pour zone is the mouth of the crucible, so the sand has to fall the
     * height of the board and land on the bath. */
    function buildGlass() {
      var floor = rows - 1;
      var k = 0;

      fill(0, floor, cols - 1, floor, STONE);
      fill(29, 51, 30, floor - 1, STONE);
      fill(49, 51, 50, floor - 1, STONE);
      fill(31, 51, 48, floor - 1, LAVA);

      /* A sand load first, then the funnel walls on top of it, so the walls
       * win where the two overlap and the throat stays open. */
      fill(37, 3, 43, 4, SAND);
      for (k = 0; k < 4; k += 1) {
        set(36 + k, 2 + k, STONE);
        set(44 - k, 2 + k, STONE);
      }
      addPourZone(31, 0, 48, 50);
    }

    /* Quench: a wide, shallow tray of lava. Water poured over the rim eats one
     * lava cell per cell and leaves stone behind, so the tray empties from the
     * surface inwards. A pool deeper than one cell would be sealed by its own
     * stone lid, which is why the tray is one cell deep. The pour zone is the
     * air over the tray: the water has to fall in over the rim, and the lava
     * itself is out of the eraser's reach. */
    function buildQuench() {
      var floor = rows - 1;

      fill(0, floor, cols - 1, floor, STONE);
      fill(14, 44, 15, floor - 1, STONE);
      fill(64, 44, 65, floor - 1, STONE);
      fill(16, floor - 1, 63, floor - 1, LAVA);
      addPourZone(16, 0, 63, 43);
    }

    /* Thaw: a reservoir held back by a dam of ice, with a marked valley in
     * front of it. Fire melts the ice it is painted against, but the meltwater
     * quenches the flame in the same breath - and a channel cut at the floor
     * fills with meltwater and stops flowing, so the cut has to be made where
     * the water can run away down the dam's face. The pour zone is the dam's
     * outer face: the flame can only be put where the ice meets the air, so
     * the cut has to be eaten through the wall one layer at a time. */
    function buildThaw() {
      var floor = rows - 1;

      fill(0, floor, cols - 1, floor, STONE);
      fill(6, 32, 37, floor - 1, WATER);
      fill(38, 20, 40, floor - 1, ICE);
      markZone(44, 46, 74, 53, 0.3);
      addPourZone(39, 20, 43, floor - 1);
    }

    /* Oil Spill: a film of oil floating on a stone basin of water. Fire races
     * along the surface one cell per generation, and the flames the water
     * douses leave gaps the oil above them sinks into - so the last of the
     * slick has to be hunted out by hand. The pour zone is the mouth of the
     * basin and the basin itself, which is where the leftovers surface. */
    function buildSpill() {
      var floor = rows - 1;

      fill(0, floor, cols - 1, floor, STONE);
      fill(12, 44, 13, floor - 1, STONE);
      fill(66, 44, 67, floor - 1, STONE);
      fill(12, floor - 1, 67, floor - 1, STONE);
      fill(14, 48, 65, floor - 2, WATER);
      fill(14, 44, 65, 47, OIL);
      addPourZone(14, 43, 65, floor - 2);
    }

    /* Etch: a stone basin with a roof of solid rock. The brush only paints
     * into empty cells, so the roof is what the basin is locked behind - and
     * acid dropped on the slab eats straight down through it, one cell per
     * cell, leaving the holes the water is poured through. Acid that reaches
     * the basin spends itself on the floor and is harmless. The pour zone is
     * the source chamber above the slab, so nothing can be put into the basin
     * directly: the roof has to be eaten and the water has to drain through. */
    function buildEtch() {
      var floor = rows - 1;

      fill(0, floor, cols - 1, floor, STONE);
      fill(28, 43, 70, 43, STONE);
      fill(28, 43, 29, floor - 1, STONE);
      fill(69, 43, 70, floor - 1, STONE);
      markZone(30, 44, 68, 53, 0.5);
      addPourZone(28, 0, 70, 42);
    }

    /* Sprout: a walled shaft with a single-cell well, a wood shelf holding a
     * pool of water over the well's mouth, and a seed on the floor. Burn the
     * shelf open above the well and the pool drops onto the seed; the plant
     * that sprouts then has to be fed all the way up a well one cell wide,
     * where every drop the player pours lands on it instead of pooling
     * beside it. The pour zone is the well above the shelf and the pockets of
     * air under it, so the shelf really has to be burned open before water can
     * reach the seed. */
    function buildSprout() {
      var floor = rows - 1;
      var y = 0;

      fill(0, floor, cols - 1, floor, STONE);
      fill(34, 0, 35, floor - 1, STONE);
      fill(44, 0, 45, floor - 1, STONE);
      /* The well's cheeks. They run the whole height so the column the plant
       * climbs is one cell wide from the shelf to the sky. */
      fill(38, 0, 38, floor - 1, STONE);
      fill(40, 0, 40, floor - 1, STONE);
      fill(36, 40, 43, 41, WOOD);
      for (y = 36; y <= 39; y += 1) {
        set(36, y, WATER);
        set(37, y, WATER);
        set(39, y, WATER);
        set(41, y, WATER);
        set(42, y, WATER);
        set(43, y, WATER);
      }
      set(39, floor - 1, SEED);
      addPourZone(39, 0, 39, 39);
      addPourZone(36, 42, 37, floor - 1);
      addPourZone(41, 42, 43, floor - 1);
    }

    /* Geyser: a flooded lower chamber over a lava bed, with a shaft in the
     * ceiling and a ceiling of ice above. Water poured on the lava flashes to
     * steam, the steam climbs the shaft, and whatever it touches on the ice
     * comes back down as rain - one extra cell of water for every plume that
     * reaches the roof, which is what the flood gauge needs. The pour zone is
     * the pair of pockets at the foot of the chamber's walls, so every drop
     * has to fall the whole chamber onto the lava bed and the gauge can only be
     * filled by rain coming back down. */
    function buildGeyser() {
      var floor = rows - 1;

      fill(0, floor, cols - 1, floor, STONE);
      fill(4, 0, 5, floor - 1, STONE);
      fill(74, 0, 75, floor - 1, STONE);
      fill(6, 2, 73, 4, ICE);
      fill(6, 36, 73, 36, STONE);
      fill(28, 36, 32, 36, EMPTY);
      fill(6, floor - 1, 73, floor - 1, LAVA);
      markZone(10, 50, 70, 53, 0.6);
      addPourZone(6, 37, 9, floor - 2);
      addPourZone(71, 37, 73, floor - 2);
    }

    /* Save the Grove: a floor of timber with a fire lit at its near end and
     * eight protected columns at the far end. The flames walk one cell a
     * generation, faster than water can be poured on them, so the grove is
     * saved with a firebreak - water for the flames that get through, and the
     * eraser to take the fuel out of their path. The pour zone starts one
     * column in, so the fire the board lit itself cannot simply be erased: the
     * flames have to be starved or doused. */
    function buildGrove() {
      var floor = rows - 1;

      fill(0, floor, cols - 1, floor, STONE);
      fill(10, 52, 60, 53, WOOD);
      set(9, 52, FIRE);
      set(9, 53, FIRE);
      addPourZone(10, 45, cols - 1, floor);
    }

    /* The free-play showcase: a lava basin, a block of ice and a film of oil,
     * so the sandbox opens with something from every family on it. It is laid
     * out beside the hopper, the basin and the garden rather than on top of
     * them, so those three stand exactly where they always have - but the
     * opening position is no longer the pre-showcase one, because the lava,
     * ice and oil this touches down are part of it from the first frame. */
    function buildShowcase() {
      var floor = rows - 1;

      fill(7, 52, 7, floor - 1, STONE);
      fill(13, 52, 13, floor - 1, STONE);
      fill(8, 53, 12, floor - 1, LAVA);
      fill(56, 45, 73, 45, OIL);
      fill(70, 44, 72, 48, ICE);
    }

    function loadPreset(id) {
      clearBoard();
      if (id === "grow") {
        buildGrow();
      } else if (id === "extinguish") {
        buildExtinguish();
      } else if (id === "flood") {
        buildFlood();
      } else if (id === "glass") {
        buildGlass();
      } else if (id === "quench") {
        buildQuench();
      } else if (id === "thaw") {
        buildThaw();
      } else if (id === "spill") {
        buildSpill();
      } else if (id === "etch") {
        buildEtch();
      } else if (id === "sprout") {
        buildSprout();
      } else if (id === "geyser") {
        buildGeyser();
      } else if (id === "grove") {
        buildGrove();
      } else {
        buildFree();
        buildShowcase();
      }
      /* What the goal's "count down to zero" material started at, read after
       * the board is laid out so it matches the opening position exactly. */
      var goal = boardGoals[id];
      zeroTarget =
        goal && goal.kind === "countZero" ? count(goal.element) : 0;
      return generation;
    }

    /* --- painting --------------------------------------------------- */

    /* The brush refuses anything but an empty cell (so a wall or a settled
     * pile is never overwritten by accident), only the eraser clears, and a
     * board that declares a pour zone refuses every stroke - the eraser
     * included - outside it. The test sits here, in the simulation, rather
     * than in a pointer handler, so a pointer, a touch, the keyboard cursor
     * and a direct `sim.paint` call are all held to the same fence. A board
     * that hands out a paint allowance refuses everything once the allowance
     * is gone, which is also what keeps an armed board armed: a refused stroke
     * changes nothing. */
    function paint(x, y, value) {
      if (!inBounds(x, y)) {
        outOfRangeWrites += 1;
        return false;
      }
      if (ink > 0 && inkLeft <= 0) {
        return false;
      }
      if (!inPourZone(x, y)) {
        return false;
      }
      var cell = index(x, y);
      if (value === EMPTY) {
        if (cells[cell] === EMPTY) {
          return false;
        }
        cells[cell] = EMPTY;
        life[cell] = 0;
        movedAt[cell] = generation;
        spendInk();
        return true;
      }
      if (cells[cell] !== EMPTY) {
        return false;
      }
      /* The cell is in bounds and empty, so the write cannot be refused - which
       * is why the allowance can be spent before the element lands. */
      spendInk();
      return set(x, y, value);
    }

    function spendInk() {
      if (ink > 0) {
        inkLeft = Math.max(0, inkLeft - 1);
      }
    }

    function paintBlob(cx, cy, value, radius) {
      var painted = 0;
      var reach = Math.max(0, parseInt(radius, 10) || 0);
      var dx = 0;
      var dy = 0;
      for (dy = -reach; dy <= reach; dy += 1) {
        for (dx = -reach; dx <= reach; dx += 1) {
          if (!inBounds(cx + dx, cy + dy)) {
            continue;
          }
          if (paint(cx + dx, cy + dy, value)) {
            painted += 1;
          }
        }
      }
      return painted;
    }

    /* --- goals ------------------------------------------------------ */

    /* How many cells of `value` sit inside a rectangle, clipped to the board. */
    function countIn(x0, y0, x1, y1, value) {
      var x = 0;
      var y = 0;
      var found = 0;
      for (y = Math.max(0, y0); y <= Math.min(rows - 1, y1); y += 1) {
        for (x = Math.max(0, x0); x <= Math.min(cols - 1, x1); x += 1) {
          if (cells[index(x, y)] === value) {
            found += 1;
          }
        }
      }
      return found;
    }

    /* The topmost row a plant has reached, or -1 when the board has none. */
    function topPlantRow() {
      var cell = 0;
      var best = -1;
      for (cell = 0; cell < total; cell += 1) {
        if (cells[cell] !== PLANT) {
          continue;
        }
        var row = Math.floor(cell / cols);
        if (best === -1 || row < best) {
          best = row;
        }
      }
      return best;
    }

    /* The win condition of a challenge, dispatched on the descriptor the board
     * declared. `value` and `target` are exactly what the HUD prints, so the
     * number on screen is always the number being checked. */
    function progress(id) {
      var goal = boardGoals[id] || boardGoals.free;
      var cell = 0;

      if (goal.kind === "growTop") {
        var topPlant = topPlantRow();
        return {
          value: topPlant === -1 ? 0 : rows - topPlant,
          target: rows,
          done: topPlant === 0,
        };
      }
      if (goal.kind === "countZero") {
        var left = count(goal.element);
        return { value: left, target: zeroTarget, done: left === 0 };
      }
      if (goal.kind === "countAtLeast") {
        var held = count(goal.element);
        return { value: held, target: goal.need, done: held >= goal.need };
      }
      if (goal.kind === "zoneFill") {
        var wet = zone ? countIn(zone.x0, zone.y0, zone.x1, zone.y1, WATER) : 0;
        return {
          value: wet,
          target: zoneTarget,
          done: zoneTarget > 0 && wet >= zoneTarget,
        };
      }
      if (goal.kind === "countZeroPlusMin") {
        var fires = count(goal.element);
        var kept = countIn(goal.x0, goal.y0, goal.x1, goal.y1, goal.material);
        return {
          value: kept,
          target: goal.need,
          zero: fires,
          done: fires === 0 && kept >= goal.need,
        };
      }
      return { value: 0, target: 0, done: false };
    }

    /* Which shape a board's goal takes, so the panel can print a countdown, a
     * fraction or a two-part line without repeating the table. */
    function goalKind(id) {
      var goal = boardGoals[id];
      return goal ? goal.kind : "none";
    }

    return {
      cols: cols,
      rows: rows,
      ids: ids,
      empty: EMPTY,
      stone: STONE,
      sand: SAND,
      water: WATER,
      plant: PLANT,
      fire: FIRE,
      wood: WOOD,
      ash: ASH,
      oil: OIL,
      lava: LAVA,
      ice: ICE,
      steam: STEAM,
      acid: ACID,
      seed: SEED,
      smoke: SMOKE,
      glass: GLASS,
      void: VOID,
      fireLife: fireLife,
      growEvery: growEvery,
      spread: spread,
      oilSpread: oilSpread,
      lavaSpread: lavaSpread,
      steamLife: steamLife,
      smokeLife: smokeLife,
      acidUses: acidUses,
      /* The fuel and corrosion sets, so a test can ask the sandbox which
       * elements a rule covers instead of repeating the list. */
      isFuel: isFuel,
      isSoluble: isSoluble,
      /* The live grid, for the renderer only. Everything else goes through the
       * accessors, which is what keeps the rules bounds-safe. */
      cells: cells,
      life: life,
      index: index,
      inBounds: inBounds,
      get: get,
      set: set,
      count: count,
      tally: tally,
      hash: hash,
      paint: paint,
      paintBlob: paintBlob,
      step: step,
      generation: function () {
        return generation;
      },
      clear: clearBoard,
      loadPreset: loadPreset,
      progress: progress,
      goalKind: goalKind,
      zone: function () {
        return zone
          ? { x0: zone.x0, y0: zone.y0, x1: zone.x1, y1: zone.y1 }
          : null;
      },
      /* Where this board lets the brush work, as a fresh list of rectangles.
       * An empty list is the whole grid - free play, and any board that asked
       * for no fence - which is what the renderer tints and the panel words. */
      pourZones: function () {
        return pourZones.map(function (rect) {
          return { x0: rect.x0, y0: rect.y0, x1: rect.x1, y1: rect.y1 };
        });
      },
      /* The paint allowance, counted in cells and refilled by every reload. */
      setInk: function (cells_) {
        var next = parseInt(cells_, 10);
        ink = isFinite(next) && next > 0 ? next : 0;
        inkLeft = ink;
        return ink;
      },
      ink: function () {
        return ink;
      },
      inkLeft: function () {
        return inkLeft;
      },
      addSpawner: addSpawner,
      spawners: function () {
        return spawners.length;
      },
      remember: remember,
      forget: forget,
      undo: undo,
      undoDepth: undoDepth,
      outOfRangeWrites: function () {
        return outOfRangeWrites;
      },
    };
  }

  /* Exported for the other modules. */
  App.createElementsSim = createElementsSim;
})(window.CapitalConvert = window.CapitalConvert || {});
