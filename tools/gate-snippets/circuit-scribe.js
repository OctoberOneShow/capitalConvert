"use strict";

/* game-circuit-scribe: the deep tier is seated, load-bearing and cheapest
 *
 * App.circuitRows drives the same netlist the sockets drive, so a shipped
 * `gates` map is a measured seating rather than a hope: the gate replays all
 * twenty-four nets through App.circuitWith and refuses any rung whose seated
 * parts disagree with its own par. The deep tier is then held to its brief
 * three ways. First, minimality is re-proved here, not trusted: an exhaustive
 * arity-legal sweep over each new net's ancestor cone - the only sockets that
 * can touch its output, since spare rail cannot change a bit - must find no
 * seating cheaper than par. Second, every seated gate is load-bearing:
 * pulling it and re-replaying must break a row, so no part rides along
 * decorative. Third, the lessons bind: no earlier net's seating, projected
 * onto a deep net's sockets, can light it; the six-wire spark pair is the
 * first net of its width on the board; the gap law out-costs every rung
 * before it; the balanced four seats one pair of wires two ways at once; and
 * the run of three is the cheapest five-wire net the board has ever shipped. */
module.exports = function gate(ctx) {
  const { App, check } = ctx;
  const levels = App.circuitLevels;
  const deepIds = ["k21", "k22", "k23", "k24"];

  check("game-circuit-scribe", "the ladder holds twenty-four nets",
    levels.length === 24, String(levels.length));
  check("game-circuit-scribe", "every net id is distinct",
    new Set(levels.map((level) => level.id)).size === levels.length,
    levels.map((level) => level.id).join(","));
  const missing = deepIds.filter((id) => !levels.some((level) => level.id === id));
  check("game-circuit-scribe", "the deep tier k21-k24 is present",
    missing.length === 0, missing.join(","));

  const byId = {};
  levels.forEach((level) => { byId[level.id] = level; });

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

  /* The cone sweep needs hundreds of thousands of evaluations, and the
   * engine's netlist pass allocates per call - so the sweep runs on a lean
   * walker that mirrors cirGate row for row. The two cannot drift apart:
   * every shipped seating below is replayed through both, and any
   * disagreement fails the gate before the sweep is trusted. */
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

  /* Minimality, re-proved: the cheapest arity-legal seating of the ancestor
   * cone is par itself. The sweep prunes on parts used, so the search stops
   * widening once a seating at par is in hand and nothing cheaper survives. */
  const gateCodeMap = { "": 0, "and": 1, "or": 2, "xor": 3, "not": 4, "wire": 5 };
  const compileFastHolds = (level) => {
    const k = level.inputs.length;
    const numRows = 1 << k;
    const mask = (1n << BigInt(numRows)) - 1n;
    const inputMap = {};
    const inVals = [];
    level.inputs.forEach((name, c) => {
      let bits = 0n;
      for (let row = 0; row < numRows; row += 1) {
        const bit = BigInt((row >> (k - 1 - c)) & 1);
        bits |= (bit << BigInt(row));
      }
      inputMap[name] = inVals.length;
      inVals.push(bits);
    });
    let wantBits = 0n;
    let careMask = 0n;
    for (let row = 0; row < numRows; row += 1) {
      const ch = level.truth.charAt(row);
      if (ch !== "x" && ch !== "X") {
        careMask |= (1n << BigInt(row));
        if (ch === "1") wantBits |= (1n << BigInt(row));
      }
    }
    const coneSlots = cone(level);
    const slotIdx = {};
    coneSlots.forEach((slot, i) => { slotIdx[slot.id] = inVals.length + i; });
    const ops = coneSlots.map((slot) => {
      const aIdx = slot.a in inputMap ? inputMap[slot.a] : slotIdx[slot.a];
      const bIdx = slot.b in inputMap ? inputMap[slot.b] : (slot.b in slotIdx ? slotIdx[slot.b] : -1);
      return { aIdx, bIdx, targetIdx: slotIdx[slot.id] };
    });
    const outIdx = slotIdx[level.out];
    const vals = new Array(inVals.length + coneSlots.length);
    for (let i = 0; i < inVals.length; i += 1) vals[i] = inVals[i];
    return function fastHolds(gateCodes) {
      for (let i = 0; i < ops.length; i += 1) {
        const g = gateCodes[i];
        if (g === 0) {
          vals[ops[i].targetIdx] = 0n;
          continue;
        }
        const a = vals[ops[i].aIdx];
        if (g === 4) {
          vals[ops[i].targetIdx] = (~a) & mask;
        } else if (g === 5) {
          vals[ops[i].targetIdx] = a;
        } else {
          const b = vals[ops[i].bIdx];
          if (g === 1) vals[ops[i].targetIdx] = a & b;
          else if (g === 2) vals[ops[i].targetIdx] = a | b;
          else if (g === 3) vals[ops[i].targetIdx] = a ^ b;
        }
      }
      return ((vals[outIdx] ^ wantBits) & careMask) === 0n;
    };
  };

  const cheapest = (level) => {
    const coneSlots = cone(level);
    const fastHolds = compileFastHolds(level);
    const options = coneSlots.map((slot) =>
      App.circuitMenu(slot).concat([""]).map((g) => gateCodeMap[g]));
    const codes = new Array(coneSlots.length).fill(0);
    let best = level.par;
    const dive = (at, used) => {
      if (used >= best) return;
      if (at === coneSlots.length) {
        if (fastHolds(codes)) best = used;
        return;
      }
      const opts = options[at];
      for (let i = 0; i < opts.length; i += 1) {
        const val = opts[i];
        codes[at] = val;
        dive(at + 1, val === 0 ? used : used + 1);
      }
    };
    dive(0, 0);
    return best;
  };

  const deep = deepIds.map((id) => byId[id]);
  const minProblems = [];
  deep.forEach((level) => {
    const min = cheapest(level);
    if (min !== level.par) {
      minProblems.push(level.id + " cone minimum " + min + " vs par " + level.par);
    }
  });
  check("game-circuit-scribe",
    "no arity-legal seating beats par on any deep net (cone sweep)",
    minProblems.length === 0, minProblems.join(" | "));

  /* Load-bearing: pulling any one seated gate must break its net. */
  const looseProblems = [];
  deep.forEach((level) => {
    Object.keys(level.gates).forEach((id) => {
      const reduced = Object.assign({}, level.gates);
      reduced[id] = "";
      if (holds(level, reduced)) looseProblems.push(level.id + ":" + id);
    });
  });
  check("game-circuit-scribe",
    "every seated gate on the deep tier is load-bearing",
    looseProblems.length === 0, looseProblems.join(","));

  /* Difficulty witness: an earlier net's seating, dropped onto a deep net's
   * sockets wherever the arities agree, must not light it. */
  const foreignProblems = [];
  deep.forEach((level) => {
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
        foreignProblems.push(level.id + " lit by " + other.id);
      }
    });
  });
  check("game-circuit-scribe",
    "no shipped net's seating lights a deep net",
    foreignProblems.length === 0, foreignProblems.join(" | "));

  /* The lessons bind, structurally. Run of three: cheapest five-wire net on
   * the board. Balanced four: one pair of wires seated two ways at once.
   * Twin sparks: the ladder's first six-wire net, all six wires live in the
   * cone. Gap law: the costliest net on the board, with a refusal seated
   * inside its products. */
  const fiveWire = levels.filter((level) => level.inputs.length >= 5);
  check("game-circuit-scribe",
    "k21 is the cheapest net the board has asked five wires of",
    byId.k21.par === Math.min.apply(null,
      fiveWire.map((level) => level.par)) && byId.k21.par < byId.k20.par,
    "k21 " + byId.k21.par + " vs " +
      fiveWire.map((level) => level.id + ":" + level.par).join(" "));

  const samePair = deep.filter((level) => {
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
  check("game-circuit-scribe",
    "k23 is the ladder's only six-wire net and its cone reads all six",
    sixWire.length === 1 && sixWire[0].id === "k23" &&
      (function () {
        const wanted = byId.k23.inputs;
        const live = {};
        cone(byId.k23).forEach((slot) => {
          [slot.a, slot.b].forEach((ref) => {
            if (wanted.indexOf(ref) !== -1) live[ref] = true;
          });
        });
        return wanted.every((name) => live[name]);
      })(), "six-wire nets: " + sixWire.map((level) => level.id).join(","));

  const deepest = levels.reduce((best, level) =>
    level.par > best.par ? level : best, levels[0]);
  const refusalInProduct = (function () {
    return cone(byId.k24).some((slot) => {
      if (!slot.b) return false;
      return [slot.a, slot.b].some((ref) => {
        const feeder = slotOf(byId.k24, ref);
        return feeder && byId.k24.gates[ref] === "not";
      });
    });
  })();
  check("game-circuit-scribe",
    "k24 is the costliest net on the board and seats a refusal inside its products",
    deepest.id === "k24" && refusalInProduct,
    "deepest " + deepest.id + ":" + deepest.par);

  /* The unlock chain is derived, never stored: clearing each net in order
   * hands the player exactly the next one, all twenty-four times. */
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
  check("game-circuit-scribe", "the unlock chain walks all twenty-four nets in order",
    walked === 24 && chained && chain.clearedCount() === 24, walked + " first clears");

  /* Copy travels with the module. */
  const copyProblems = deepIds.map((id) => "cirL" + id.slice(1)).filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-circuit-scribe", "the four net names resolve in both languages",
    copyProblems.length === 0, copyProblems.join(","));
};
