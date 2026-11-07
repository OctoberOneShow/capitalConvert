"use strict";

/* game-circuit-scribe: the deep tier is seated, load-bearing and cheapest
 *
 * App.circuitRows drives the same netlist the sockets drive, so a shipped
 * `gates` map is a measured seating rather than a hope: the gate replays all
 * thirty nets through App.circuitWith and refuses any rung whose seated
 * parts disagree with its own par. The deep tier k21-k30 is then held to its
 * brief three ways. First, minimality is re-proved here, not trusted: an
 * exhaustive arity-legal sweep over each new net's ancestor cone - the only
 * sockets that can touch its output, since spare rail cannot change a bit -
 * must find no seating cheaper than par. Second, every seated gate is
 * load-bearing: pulling it and re-replaying must break a row, so no part
 * rides along decorative. Third, the lessons bind: no earlier net's seating,
 * projected onto a deep net's sockets, can light it; the six-wire spark pair
 * is the first net of its width on the board; the gap law out-costs every
 * rung before it; the balanced four seats one pair of wires two ways at once;
 * and the run of three is the cheapest five-wire net the board has ever
 * shipped.
 *
 * The summit k25-k30 carries its own proof: each rung asks sixty-four
 * required rows against the gap law's thirty-two, each is cut structurally
 * (not by pulling a gate - the sweep ignores the authored gates) and the
 * cut is shown to cost at least one more part or stop answering altogether.
 * Every rung's authoring and star line still come from the replay above, so
 * a star threshold can never name a part count no net achieves.
 *
 * The letting-go tier k31-k40 is one net asked ten times. All ten rows carry
 * the same thirteen sockets - the ladder's first seven-wire cone, a
 * three-bit comparison between A B C and D E F whose full tie the seventh
 * rail takes - and the rows differ only in the reprieve, the rows of the
 * hundred-and-twenty-eight-row table each rung must answer. The reprieve
 * only ever shrinks - every row one rung must answer the next must answer
 * too - and it runs out eight pins at a time (four, then two, then two at
 * the very end), from seventy-two required rows at k31 to the whole slate
 * at k40, past the summit's own sixty-four, so the tier's difficulty is the
 * game's own printed ask and it is measured straight off the truth strings.
 * Every rung keeps the full tie on its slate - all sixteen tie rows stand
 * required from k31 to k40. The pars are measured, not carried over: the
 * ten rungs share one cone, so one combined bit-parallel walk of the
 * seating space prices every reprieved table at once (5, 8, 8, 12 and 13
 * parts), every shipped seating replays clean at its own par, every seated
 * gate is load-bearing, and no seating of the first thirty lights any
 * rung's table. The seventh rail is load-bearing ten times over: pull its
 * leg out of the arbiter, measure that the cone no longer reads G, and the
 * same combined sweep finds no seating at all that holds any rung's
 * reprieved table. */
module.exports = function gate(ctx) {
  const { App, check } = ctx;
  const levels = App.circuitLevels;
  const byId = {};
  levels.forEach((level) => { byId[level.id] = level; });
  const deepIds = ["k21", "k22", "k23", "k24", "k25", "k26", "k27", "k28", "k29", "k30"];
  const summitIds = ["k25", "k26", "k27", "k28", "k29", "k30"];
  const summit = summitIds.map((id) => byId[id]);
  const arbitIds = ["k31", "k32", "k33", "k34", "k35", "k36", "k37", "k38", "k39", "k40"];
  const arbit = arbitIds.map((id) => byId[id]);
  const arbitStart = levels.findIndex((level) => level.id === "k31");

  check("game-circuit-scribe", "the ladder holds forty nets",
    levels.length === 40, String(levels.length));
  check("game-circuit-scribe", "every net id is distinct",
    new Set(levels.map((level) => level.id)).size === levels.length,
    levels.map((level) => level.id).join(","));
  const missing = deepIds.filter((id) => !byId[id]);
  check("game-circuit-scribe", "the deep tier k21-k30 is present",
    missing.length === 0, missing.join(","));
  const missingArbit = arbitIds.filter((id) => !byId[id]);
  check("game-circuit-scribe", "the letting-go tier k31-k40 is present",
    missingArbit.length === 0, missingArbit.join(","));
  const tail = levels.slice(levels.length - arbitIds.length).map((level) => level.id);
  check("game-circuit-scribe", "the letting-go tier k31-k40 is present, in order, and ends the ladder",
    tail.join(",") === arbitIds.join(","), tail.join(","));

  const truthProblems = levels.filter((level) => {
    const want = 1 << level.inputs.length;
    return level.truth.length !== want || /[^01xX]/.test(level.truth);
  });
  check("game-circuit-scribe", "every truth string covers exactly its 2^n rows",
    truthProblems.length === 0, truthProblems.map((level) => level.id).join(","));

  /* Proof pass: every net's shipped seating replays clean and parts == par. */
  const problems = [];
  levels.forEach((level) => {
    const table = App.circuitTable(level);
    const netlist = App.circuitWith(level, level.gates);
    const rows = App.circuitRows(netlist, table);
    if (!rows.every(Boolean)) problems.push(level.id + ":rows");
    if (App.circuitParts(level.gates) !== level.par) {
      problems.push(level.id + ":par " + App.circuitParts(level.gates) + "/" + level.par);
    }
  });
  check("game-circuit-scribe",
    "every net's shipped seating replays to a clean table at its own par",
    problems.length === 0, problems.join(" "));

  /* The engine's own helpers, re-hosted for the sweep: slot lookup and
   * arity menu are exactly what the palette enforces on the board. */
  const slotOf = (level, id) =>
    level.slots.find((slot) => slot.id === id) || null;
  const cone = (level) => {
    const need = {};
    const walk = (ref) => {
      if (need[ref] || !slotOf(level, ref)) return;
      need[ref] = true;
      const slot = slotOf(level, ref);
      walk(slot.a);
      if (slot.b !== undefined) walk(slot.b);
    };
    walk(level.out);
    return level.slots.filter((slot) => need[slot.id]);
  };
  const holds = (level, gates) => {
    const table = App.circuitTable(level);
    const rows = App.circuitRows(App.circuitWith(level, gates), table);
    return rows.every(Boolean);
  };

  /* The cone sweep needs hundreds of millions of evaluations, and the engine's
   * netlist pass allocates per call - so the sweep runs on a lean walker that
   * mirrors cirGate row for row. The two cannot drift apart: every shipped
   * seating below is replayed through both, and any disagreement fails the
   * gate before the sweep is trusted. */
  const leanBit = (gateName, a, b) => {
    if (gateName === "and") return a && b ? 1 : 0;
    if (gateName === "or") return a || b ? 1 : 0;
    if (gateName === "xor") return a !== b ? 1 : 0;
    if (gateName === "not") return a ? 0 : 1;
    if (gateName === "wire") return a ? 1 : 0;
    return 0;
  };
  const leanHolds = (level, gates) => {
    const bits = {};
    const k = level.inputs.length;
    for (let row = 0; row < (1 << k); row += 1) {
      const probe = {};
      level.inputs.forEach((name, c) => {
        probe[name] = (row >> (k - 1 - c)) & 1;
      });
      const memo = {};
      const visit = {};
      const value = (ref) => {
        if (ref === undefined || ref === null) return 0;
        if (memo[ref] !== undefined) return memo[ref];
        const slot = slotOf(level, ref);
        if (!slot) {
          memo[ref] = probe[ref] ? 1 : 0;
          return memo[ref];
        }
        if (visit[ref]) return 0;
        visit[ref] = true;
        const a = value(slot.a);
        const b = value(slot.b);
        visit[ref] = false;
        memo[ref] = leanBit(gates[slot.id] || "", a, b);
        return memo[ref];
      };
      level.slots.forEach((slot) => value(slot.id));
      /* A don't-care row asks nothing of the board, exactly as cirRows
       * holds it free - the strobe bench ships on that. */
      const want = level.truth.charAt(row);
      if (want === "x" || want === "X") continue;
      const out = memo[level.out] === undefined ? 0 : memo[level.out];
      if (out !== (want === "1" ? 1 : 0)) return false;
    }
    return true;
  };
  const drift = levels.filter((level) =>
    holds(level, level.gates) !== leanHolds(level, level.gates));
  check("game-circuit-scribe",
    "the lean sweep walker agrees with the engine on every shipped seating",
    drift.length === 0, drift.map((level) => level.id).join(","));

  /* The sweep itself: a table of up to a hundred and twenty-eight rows fits
   * in a handful of 32-bit words, so the exhaustive search uses bit-parallel
   * words instead of per-leaf BigInts - one word array per signal, sized to
   * the table. The same self-check applies - each shipped seating is
   * evaluated through this walker and must agree with the engine before its
   * minima are used. */
  const gateCodeMap = { "": 0, "and": 1, "or": 2, "xor": 3, "not": 4, "wire": 5 };
  const buildBits = (level) => {
    const k = level.inputs.length;
    const numRows = 1 << k;
    const words = Math.ceil(numRows / 32);
    const coneSlots = cone(level);
    const index = {};
    const vals = [];
    level.inputs.forEach((name, c) => {
      const row0 = new Array(words).fill(0);
      for (let row = 0; row < numRows; row += 1) {
        if ((row >> (k - 1 - c)) & 1) row0[row >> 5] |= 1 << (row & 31);
      }
      index[name] = vals.length;
      vals.push(row0);
    });
    coneSlots.forEach((slot) => {
      index[slot.id] = vals.length;
      vals.push(new Array(words).fill(0));
    });
    const ops = coneSlots.map((slot) => ({
      target: index[slot.id],
      a: index[slot.a],
      b: slot.b !== undefined ? index[slot.b] : -1,
    }));
    const want = new Array(words).fill(0);
    const care = new Array(words).fill(0);
    for (let row = 0; row < numRows; row += 1) {
      const ch = level.truth.charAt(row);
      if (ch === "x" || ch === "X") continue;
      care[row >> 5] |= 1 << (row & 31);
      if (ch === "1") want[row >> 5] |= 1 << (row & 31);
    }
    return {
      coneSlots, ops, vals, outIdx: index[level.out],
      want, care, words,
    };
  };
  const evalBits = (model, codes) => {
    const { ops, vals, words } = model;
    for (let i = 0; i < ops.length; i += 1) {
      const g = codes[i];
      const op = ops[i];
      const t = vals[op.target];
      if (g === 0) {
        for (let w = 0; w < words; w += 1) t[w] = 0;
      } else if (g === 4) {
        const a = vals[op.a];
        for (let w = 0; w < words; w += 1) t[w] = ~a[w];
      } else if (g === 5) {
        const a = vals[op.a];
        for (let w = 0; w < words; w += 1) t[w] = a[w];
      } else if (op.b < 0) {
        for (let w = 0; w < words; w += 1) t[w] = 0;
      } else {
        const a = vals[op.a];
        const b = vals[op.b];
        if (g === 1) {
          for (let w = 0; w < words; w += 1) t[w] = a[w] & b[w];
        } else if (g === 2) {
          for (let w = 0; w < words; w += 1) t[w] = a[w] | b[w];
        } else {
          for (let w = 0; w < words; w += 1) t[w] = a[w] ^ b[w];
        }
      }
    }
    const out = vals[model.outIdx];
    for (let w = 0; w < words; w += 1) {
      if (((out[w] ^ model.want[w]) & model.care[w]) !== 0) return false;
    }
    return true;
  };
  const bitsHolds = (level, gates) => {
    const model = buildBits(level);
    const codes = model.coneSlots.map((slot) => gateCodeMap[gates[slot.id] || ""] || 0);
    return evalBits(model, codes);
  };
  const bitsDrift = levels.filter((level) =>
    holds(level, level.gates) !== bitsHolds(level, level.gates));
  check("game-circuit-scribe",
    "the bit-parallel sweep agrees with the engine on every shipped seating",
    bitsDrift.length === 0, bitsDrift.map((level) => level.id).join(","));

  /* The cheapest arity-legal seating of the ancestor cone, capped at
   * `ceiling`. The search prunes on parts used, so the returned value is the
   * first cost at or above the ceiling when no cheaper seating holds. */
  const cheapest = (level, ceiling) => {
    const model = buildBits(level);
    const { coneSlots, ops, vals, words } = model;
    const options = coneSlots.map((slot) =>
      App.circuitMenu(slot).concat([""]).map((g) => gateCodeMap[g]));
    let best = ceiling;
    const dive = (at, used) => {
      if (used >= best) return;
      if (at === ops.length) {
        const out = vals[model.outIdx];
        let ok = true;
        for (let w = 0; w < words; w += 1) {
          if (((out[w] ^ model.want[w]) & model.care[w]) !== 0) {
            ok = false;
            break;
          }
        }
        if (ok) best = used;
        return;
      }
      const op = ops[at];
      const opts = options[at];
      const t = vals[op.target];
      for (let i = 0; i < opts.length; i += 1) {
        const g = opts[i];
        const cost = g === 0 ? 0 : 1;
        if (used + cost >= best) continue;
        const a = vals[op.a];
        if (g === 0) {
          for (let w = 0; w < words; w += 1) t[w] = 0;
        } else if (g === 4) {
          for (let w = 0; w < words; w += 1) t[w] = ~a[w];
        } else if (g === 5) {
          for (let w = 0; w < words; w += 1) t[w] = a[w];
        } else if (op.b < 0) {
          continue;
        } else {
          const b = vals[op.b];
          if (g === 1) {
            for (let w = 0; w < words; w += 1) t[w] = a[w] & b[w];
          } else if (g === 2) {
            for (let w = 0; w < words; w += 1) t[w] = a[w] | b[w];
          } else {
            for (let w = 0; w < words; w += 1) t[w] = a[w] ^ b[w];
          }
        }
        dive(at + 1, used + cost);
      }
    };
    dive(0, 0);
    return best;
  };

  /* One dive, many tables: the letting-go rungs share one cone, so a single
   * walk of the seating space can price all of them - the net the walk
   * computes is the same on every rung, and each leaf only compares the
   * shared output words against every rung's own want/care mask. Returns the
   * cheapest seating found for each model, or the ceiling when none holds.
   * The caller must first prove the models really do share the cone. */
  const sweepShared = (models, ceiling) => {
    const { ops, vals, words } = models[0];
    const options = models[0].coneSlots.map((slot) =>
      App.circuitMenu(slot).concat([""]).map((g) => gateCodeMap[g]));
    const minima = models.map(() => ceiling);
    const dive = (at, used) => {
      if (used >= ceiling) return;
      if (at === ops.length) {
        const out = vals[models[0].outIdx];
        for (let m = 0; m < models.length; m += 1) {
          if (minima[m] <= used) continue;
          const model = models[m];
          let ok = true;
          for (let w = 0; w < words; w += 1) {
            if (((out[w] ^ model.want[w]) & model.care[w]) !== 0) {
              ok = false;
              break;
            }
          }
          if (ok) minima[m] = used;
        }
        return;
      }
      const op = ops[at];
      const opts = options[at];
      const t = vals[op.target];
      for (let i = 0; i < opts.length; i += 1) {
        const g = opts[i];
        const cost = g === 0 ? 0 : 1;
        if (used + cost >= ceiling) continue;
        const a = vals[op.a];
        if (g === 0) {
          for (let w = 0; w < words; w += 1) t[w] = 0;
        } else if (g === 4) {
          for (let w = 0; w < words; w += 1) t[w] = ~a[w];
        } else if (g === 5) {
          for (let w = 0; w < words; w += 1) t[w] = a[w];
        } else if (op.b < 0) {
          continue;
        } else {
          const b = vals[op.b];
          if (g === 1) {
            for (let w = 0; w < words; w += 1) t[w] = a[w] & b[w];
          } else if (g === 2) {
            for (let w = 0; w < words; w += 1) t[w] = a[w] | b[w];
          } else {
            for (let w = 0; w < words; w += 1) t[w] = a[w] ^ b[w];
          }
        }
        dive(at + 1, used + cost);
      }
    };
    dive(0, 0);
    return minima;
  };

  const minProblems = [];
  deepIds.forEach((id) => {
    const level = byId[id];
    const min = cheapest(level, level.par);
    if (min !== level.par) {
      minProblems.push(id + " cone minimum " + min + " vs par " + level.par);
    }
  });
  check("game-circuit-scribe",
    "no arity-legal seating beats par on any deep net (cone sweep)",
    minProblems.length === 0, minProblems.join(" | "));

  /* Load-bearing: pulling any one seated gate must break its net. */
  const looseProblems = [];
  deepIds.forEach((id) => {
    const level = byId[id];
    Object.keys(level.gates).forEach((gateId) => {
      const reduced = Object.assign({}, level.gates);
      reduced[gateId] = "";
      if (holds(level, reduced)) looseProblems.push(id + ":" + gateId);
    });
  });
  check("game-circuit-scribe",
    "every seated gate on the deep tier is load-bearing",
    looseProblems.length === 0, looseProblems.join(","));

  /* Difficulty witness: an earlier net's seating, dropped onto a deep net's
   * sockets wherever the arities agree, must not light it. */
  const foreignProblems = [];
  deepIds.forEach((id) => {
    const level = byId[id];
    levels.forEach((other) => {
      if (deepIds.includes(other.id)) return;
      const projected = {};
      level.slots.forEach((slot) => {
        const gate = other.gates[slot.id];
        if (gate && App.circuitMenu(slot).indexOf(gate) !== -1) {
          projected[slot.id] = gate;
        }
      });
      if (holds(level, projected)) {
        foreignProblems.push(id + " lit by " + other.id);
      }
    });
  });
  check("game-circuit-scribe",
    "no shipped net's seating lights a deep net",
    foreignProblems.length === 0, foreignProblems.join(" | "));

  /* The lessons bind, structurally. Run of three: cheapest five-wire net on
   * the board the arbiter arrived on - the letting-go rungs price a
   * reprieved seven-wire table, not a five-wire one. Balanced four: one pair
   * of wires seated two ways at once. Twin sparks: the first six-wire net,
   * all six wires live in the cone. Gap law: the costliest net through k24,
   * with a refusal seated inside its products. Final ledger: the costliest
   * net on the whole board. */
  const fiveWire = levels.slice(0, arbitStart)
    .filter((level) => level.inputs.length >= 5);
  check("game-circuit-scribe",
    "k21 is the cheapest net the first thirty asked five wires of",
    byId.k21.par === Math.min.apply(null,
      fiveWire.map((level) => level.par)) && byId.k21.par < byId.k20.par,
    "k21 " + byId.k21.par + " vs " +
      fiveWire.map((level) => level.id + ":" + level.par).join(" "));

  const samePair = deepIds.map((id) => byId[id]).filter((level) => {
    const seen = {};
    return level.slots.some((slot) => {
      if (!slot.b) return false;
      const key = slot.a + "/" + slot.b;
      const first = seen[key];
      if (first) {
        const pair = [level.gates[first], level.gates[slot.id]];
        /* the balanced-four move: one product, one sum, same two signals */
        return pair.indexOf("and") !== -1 && pair.indexOf("or") !== -1;
      }
      seen[key] = slot.id;
      return false;
    });
  });
  check("game-circuit-scribe",
    "k22 seats one pair of signals as a product and a sum at once",
    samePair.length === 1 && samePair[0].id === "k22",
    samePair.map((level) => level.id).join(","));

  const sixWire = levels.filter((level) => level.inputs.length === 6);
  const widerBefore = levels.slice(0, arbitStart)
    .filter((level) => level.inputs.length > 6);
  const k23Live = (function () {
    const wanted = byId.k23.inputs;
    const live = {};
    cone(byId.k23).forEach((slot) => {
      [slot.a, slot.b].forEach((ref) => {
        if (wanted.indexOf(ref) !== -1) live[ref] = true;
      });
    });
    return wanted.every((name) => live[name]);
  })();
  check("game-circuit-scribe",
    "k23 is the ladder's first six-wire net and its cone reads all six; nothing before the letting-go tier asks more",
    sixWire.length === summit.length + 1 && sixWire[0].id === "k23" &&
      widerBefore.length === 0 && k23Live &&
      arbit.every((level) => level.inputs.length === 7),
    "six-wire nets: " + sixWire.map((level) => level.id).join(","));

  const gapAt = levels.findIndex((level) => level.id === "k24");
  const throughGap = levels.slice(0, gapAt + 1);
  const refusalInProduct = cone(byId.k24).some((slot) => {
    if (!slot.b) return false;
    return [slot.a, slot.b].some((ref) => {
      const feeder = slotOf(byId.k24, ref);
      return feeder && byId.k24.gates[ref] === "not";
    });
  });
  check("game-circuit-scribe",
    "k24 out-costs every rung before it and seats a refusal inside its products",
    throughGap.every((level) => level.id === "k24" || level.par < byId.k24.par) &&
      refusalInProduct,
    "k24 par " + byId.k24.par + " vs " +
      throughGap.map((level) => level.id + ":" + level.par).join(" "));

  const deepest = levels.reduce((best, level) =>
    level.par > best.par ? level : best, levels[0]);
  check("game-circuit-scribe",
    "k30 is the costliest net on the whole board",
    deepest.id === "k30" && byId.k30.par > byId.k24.par,
    "deepest " + deepest.id + ":" + deepest.par + " vs k24:" + byId.k24.par);

  /* Every summit rung must be harder than the old summit on a metric the
   * game itself prints: six inputs make sixty-four required rows, twice the
   * gap law's thirty-two. */
  const requiredRows = (level) =>
    level.truth.split("").filter((ch) => ch !== "x" && ch !== "X").length;
  const hardProblems = summit.filter((level) =>
    level.inputs.length !== 6 || requiredRows(level) !== 64 ||
      requiredRows(level) <= requiredRows(byId.k24));
  check("game-circuit-scribe",
    "every summit rung asks sixty-four required rows to the gap law's thirty-two",
    hardProblems.length === 0,
    summit.map((level) => level.id + ":" + requiredRows(level)).join(" ") +
      " vs k24:" + requiredRows(byId.k24));

  /* Each summit lesson is re-proved by cutting the mechanic out of a copy of
   * the rung and re-running the cone sweep at par + 1. The sweep ignores the
   * authored gates, so every cut is structural: a socket is removed, rewired
   * or left one-legged, or the output is re-pointed. A cut that cannot hold
   * the table at par + 1 returns the ceiling, which still fails the par bar. */
  const cloneLevel = (level) => ({
    id: level.id + ":cut",
    inputs: level.inputs.slice(),
    truth: level.truth,
    out: level.out,
    slots: level.slots.map((slot) => Object.assign({}, slot)),
    gates: Object.assign({}, level.gates),
    par: level.par,
  });
  const cuts = [
    {
      id: "k25",
      lesson: "k25's cut: a tie relay with the top difference un-inverted costs a part",
      apply(level) {
        level.slots = level.slots.filter((slot) => slot.id !== "s4");
        slotOf(level, "s11").b = "s1";
      },
    },
    {
      id: "k26",
      lesson: "k26's cut: a thermometer pair missing its second implication arm costs a part",
      apply(level) {
        slotOf(level, "s11").a = "s3";
      },
    },
    {
      id: "k27",
      lesson: "k27's cut: forcing the bare spare to feed the answer can never hold the table",
      apply(level) {
        const final = slotOf(level, "s11");
        final.a = "s10";
        delete final.b;
      },
    },
    {
      id: "k28",
      lesson: "k28's cut: an equal-nonzero test with its nonzero leg removed costs a part",
      apply(level) {
        delete slotOf(level, "s10").b;
      },
    },
    {
      id: "k29",
      lesson: "k29's cut: the comparison without its output refusal costs a part",
      apply(level) {
        level.slots = level.slots.filter((slot) => slot.id !== "s13");
        level.out = "s12";
      },
    },
    {
      id: "k30",
      lesson: "k30's cut: the finale without its closing product costs a part",
      apply(level) {
        level.slots = level.slots.filter((slot) => slot.id !== "s14");
        level.out = "s13";
      },
    },
  ];
  cuts.forEach((cut) => {
    const level = byId[cut.id];
    const copy = cloneLevel(level);
    cut.apply(copy);
    const min = cheapest(copy, level.par + 1);
    check("game-circuit-scribe", cut.lesson, min > level.par,
      cut.id + " cut minimum " + min + " vs par " + level.par);
  });

  /* The letting-go tier is proved on its own terms. Its difficulty is the
   * game's own printed ask - required rows - measured straight off the truth
   * strings, and its pars are priced by the shared cone sweep, not carried
   * over from the summit. */

  /* One cone, ten times: the ten rungs carry identical sockets, inputs and
   * output, and no earlier net reuses that shape. */
  const arbitShape = (level) => JSON.stringify([level.inputs, level.slots, level.out]);
  const shapeProblems = arbit.filter((level) =>
    arbitShape(level) !== arbitShape(byId.k31)).map((level) => level.id);
  const reuse = levels.slice(0, arbitStart)
    .filter((level) => arbitShape(level) === arbitShape(byId.k31))
    .map((level) => level.id);
  check("game-circuit-scribe",
    "the ten letting-go rungs carry one cone - same sockets, same output - and no earlier net reuses it",
    shapeProblems.length === 0 && reuse.length === 0,
    shapeProblems.concat(reuse).join(","));

  /* The reprieve, measured off the truth strings: the ask climbs rung over
   * rung from seventy-two required rows to the whole slate, every rung's ask
   * opens above the finale's own sixty-four, the free rows only ever shrink,
   * and the full tie - the sixteen rows where A B C equals D E F, both
   * values of G - stands required on every rung, so the seventh rail is
   * answering from the first reprieve to the last. */
  const tieRows = [];
  for (let row = 0; row < 128; row += 1) {
    if (((row >> 4) & 7) === ((row >> 1) & 7)) tieRows.push(row);
  }
  const askProblems = [];
  let lastAsk = requiredRows(byId.k30);
  let prevRung = null;
  arbit.forEach((level) => {
    const ask = requiredRows(level);
    if (ask <= lastAsk) {
      askProblems.push(level.id + " asks " + ask + ", not above the ask before it (" + lastAsk + ")");
    }
    lastAsk = ask;
    if (prevRung) {
      for (let row = 0; row < 128; row += 1) {
        const ch = prevRung.truth.charAt(row);
        if (ch !== "x" && ch !== "X" && level.truth.charAt(row) === "x") {
          askProblems.push(level.id + " frees row " + row + " the rung before had to answer");
          break;
        }
      }
    }
    prevRung = level;
  });
  if (requiredRows(byId.k40) !== 128) {
    askProblems.push("k40 asks " + requiredRows(byId.k40) + " rows, not the whole slate");
  }
  arbit.forEach((level) => {
    tieRows.forEach((row) => {
      const ch = level.truth.charAt(row);
      if (ch === "x" || ch === "X") askProblems.push(level.id + " frees tie row " + row);
    });
  });
  check("game-circuit-scribe",
    "the letting-go ask climbs past the finale's whole slate and never gives a row back, full tie on every slate",
    askProblems.length === 0,
    arbit.map((level) => level.id + ":" + requiredRows(level)).join(" ") +
      " vs k30:" + requiredRows(byId.k30) +
      (askProblems.length ? " | " + askProblems.join(" | ") : ""));

  /* The pars, priced: one combined walk over the shared cone, because the
   * ten models differ only in their want/care masks. The dive guards itself
   * - if the models did not share ops, output index and word count, the
   * sweep would be comparing apples to bolts and this check refuses. */
  const arbitModels = arbit.map((level) => buildBits(level));
  const modelsShare = arbitModels.every((model) =>
    JSON.stringify(model.ops) === JSON.stringify(arbitModels[0].ops) &&
    model.outIdx === arbitModels[0].outIdx &&
    model.words === arbitModels[0].words);
  check("game-circuit-scribe",
    "the ten letting-go models share one cone, so one sweep can price them all",
    modelsShare,
    arbitModels.map((model, i) => arbit[i].id + ":" + model.ops.length + " ops").join(" "));
  const arbitMins = modelsShare
    ? sweepShared(arbitModels, Math.max.apply(null, arbit.map((level) => level.par)))
    : [];
  const arbitMinProblems = arbit
    .filter((level, i) => arbitMins[i] !== level.par)
    .map((level, i) => level.id + " sweep minimum " + arbitMins[i] + " vs par " + level.par);
  check("game-circuit-scribe",
    "no arity-legal seating beats par on any letting-go rung (one combined cone sweep)",
    arbitMinProblems.length === 0, arbitMinProblems.join(" | "));

  /* Load-bearing again: pulling any one seated gate must break its rung. */
  const looseArbit = [];
  arbit.forEach((level) => {
    Object.keys(level.gates).forEach((gateId) => {
      const reduced = Object.assign({}, level.gates);
      reduced[gateId] = "";
      if (holds(level, reduced)) looseArbit.push(level.id + ":" + gateId);
    });
  });
  check("game-circuit-scribe",
    "every seated gate on the letting-go tier is load-bearing",
    looseArbit.length === 0, looseArbit.join(","));

  /* No old seating lights the new ask: the first thirty nets' gate maps,
   * projected onto an arbiter's sockets wherever the arities agree, must not
   * hold any rung's reprieved table. */
  const foreignArbit = [];
  arbit.forEach((level) => {
    levels.slice(0, arbitStart).forEach((other) => {
      const projected = {};
      level.slots.forEach((slot) => {
        const gate = other.gates[slot.id];
        if (gate && App.circuitMenu(slot).indexOf(gate) !== -1) {
          projected[slot.id] = gate;
        }
      });
      if (holds(level, projected)) foreignArbit.push(level.id + " lit by " + other.id);
    });
  });
  check("game-circuit-scribe",
    "no seating of the first thirty lights a letting-go rung",
    foreignArbit.length === 0, foreignArbit.join(" | "));

  /* The seventh rail, load-bearing ten times over: pull its leg out of the
   * arbiter (s11 reads its tie chain alone), measure that the cone no longer
   * reads G, and sweep the cut nets the same combined way. The sweep's
   * ceiling is two over the deepest par, so a clean bill - nothing found
   * under the ceiling - means no seating at par + 1 holds any rung's
   * reprieved table, and with thirteen sockets no seating exists past
   * thirteen parts, so no seating at all does. */
  const coneRefs = (model) => {
    const refs = new Set();
    model.coneSlots.forEach((slot) => {
      refs.add(slot.a);
      if (slot.b !== undefined) refs.add(slot.b);
    });
    return refs;
  };
  const uncutRefs = coneRefs(arbitModels[0]);
  const cutModels = arbit.map((level) => {
    const copy = cloneLevel(level);
    delete slotOf(copy, "s11").b;
    return buildBits(copy);
  });
  const cutRefs = coneRefs(cutModels[0]);
  const cutShare = cutModels.every((model) =>
    JSON.stringify(model.ops) === JSON.stringify(cutModels[0].ops) &&
    model.outIdx === cutModels[0].outIdx &&
    model.words === cutModels[0].words);
  const cutCeiling = Math.max.apply(null, arbit.map((level) => level.par)) + 2;
  const cutMins = cutShare ? sweepShared(cutModels, cutCeiling) : [];
  const cutProblems = arbit
    .filter((level, i) => cutMins[i] <= level.par + 1)
    .map((level, i) => level.id + " cut minimum " + cutMins[i] + " holds at par + 1");
  check("game-circuit-scribe",
    "the seventh rail is load-bearing at every rung: leg pulled, no seating at par + 1 holds any reprieved table",
    cutProblems.length === 0 && cutShare && !cutRefs.has("G") && uncutRefs.has("G"),
    arbit.map((level, i) => level.id + ":" + cutMins[i]).join(" ") +
      " (ceiling " + cutCeiling + ")");

  /* The star line is derived from the replayed witness: par is a seating the
   * net achieves, so it must sit on three stars, and the "low" thresholds
   * must step down one star per spare part. */
  const starProblems = summit.concat(arbit).filter((level) => {
    const line = [level.par, level.par + 1, level.par + 2];
    return App.starsFor(level.par, line, "low") !== 3 ||
      App.starsFor(level.par + 1, line, "low") !== 2 ||
      App.starsFor(level.par + 2, line, "low") !== 1 ||
      App.starsFor(level.par + 3, line, "low") !== 0;
  });
  check("game-circuit-scribe",
    "every summit and letting-go par sits on the three-star line and each spare part costs a star",
    starProblems.length === 0, starProblems.map((level) => level.id).join(","));

  /* The unlock chain is derived, never stored: clearing each net in order
   * hands the player exactly the next one, all forty times. */
  const chain = App.createCampaign({
    key: "circuit-scribe-gate-chain",
    levels: levels.map((level) => ({ id: level.id, labelKey: level.labelKey })),
  });
  let walked = 0;
  let chained = true;
  levels.forEach((level, index) => {
    const outcome = chain.record(level.id, { stars: 3, best: level.par, better: "low" });
    if (outcome.firstClear) walked += 1;
    const expected = index + 1 < levels.length ? levels[index + 1].id : null;
    if (outcome.unlockedNext !== expected) chained = false;
  });
  check("game-circuit-scribe", "the unlock chain walks all forty nets in order",
    walked === levels.length && chained && chain.clearedCount() === levels.length,
    walked + " first clears");

  /* Copy travels with the module. */
  const copyProblems = summitIds.concat(arbitIds).map((id) => "cirL" + id.slice(1))
    .filter((key) =>
      !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
      !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
      !App.t(key) || App.t(key) === key ||
      App.I18N.en[key] === App.I18N.zh[key]);
  check("game-circuit-scribe", "the sixteen tier net names resolve in both languages and differ",
    copyProblems.length === 0, copyProblems.join(","));
};
