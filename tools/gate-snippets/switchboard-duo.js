"use strict";

/* game-switchboard-duo: the ladder runs at least forty shifts, and the top tier
 * is ten binding machine lessons (b31-b40) stacked on the b25-b30 tier
 *
 * Everything below the structure block is measured, never authored. The
 * module's own replay walks the panel's boardStep with the canonical line for
 * every order, so App.boardSolvable, App.boardPar and App.boardBands are the
 * only source of beats and bands. The b25-b30 tier is held to its briefs: a
 * four-link cascade (b25), a shift with no cascade and returning orders (b26),
 * a dim three-link cascade with returns (b27), heat orders whose dial is read
 * across the aisle (b28), a blackout authored three times (b29), and a
 * five-link finale (b30). The b31-b40 tier then raises the plate and the
 * cascade: the first thirty- and thirty-two-order shifts (b31, b32), the first
 * six-link cascade (b33), two independent cascades (b34), dim heat returns
 * (b35), a fourfold flashover (b36), a dim six-link (b37), twin three-link
 * cascades (b38), a no-cascade return plate (b39), and a seven-link capstone
 * (b40). Each advertised mechanic is removed from a clone of its own shift and
 * the clone is replayed: the par must drop by at least eight beats or the clone
 * must fail, so no mechanic can live in copy alone. New copy must resolve in
 * both languages and state the real HUD count - authored orders plus every
 * cascade-woken order - and the unlock chain must still walk every rung in
 * order. */
module.exports = function gate(ctx) {
  const { App, check } = ctx;
  const swbCase = "game-switchboard-duo";
  const swbShifts = App.boardShifts;
  const swbById = (id) => swbShifts.find((shift) => shift.id === id);
  const swbNewIds = ["b25", "b26", "b27", "b28", "b29", "b30"];
  const swbTier = swbNewIds.map(swbById).filter(Boolean);
  const swbRungIds = ["b31", "b32", "b33", "b34", "b35", "b36", "b37", "b38", "b39", "b40"];
  const swbRung = swbRungIds.map(swbById).filter(Boolean);

  /* The module keeps the authored fails list and appends each chain-woken
   * order once; this mirrors that convention without reaching inside. */
  const swbLog = (shift) => {
    const log = shift.fails.filter((id) => !!App.boardFaults[id]);
    const chain = shift.chain || {};
    Object.keys(chain).forEach((from) => {
      const to = chain[from];
      if (log.indexOf(from) !== -1 && log.indexOf(to) === -1 && App.boardFaults[to]) {
        log.push(to);
      }
    });
    return log;
  };
  const swbChainDepth = (shift) => Object.keys(shift.chain || {}).length;
  const swbReturns = (shift) => shift.fails.length - new Set(shift.fails).size;
  const swbAuthored = (shift, fault) => shift.fails.filter((id) => id === fault).length;
  const swbHeatOrders = (shift) => shift.fails.filter((id) => {
    const def = App.boardFaults[id];
    return !!def && def.need.some((need) => need[0] === "temperature" && need[2] === "a");
  }).length;

  /* --- structure: shape only, no proof depends on these --------------- */
  check(swbCase, "the campaign holds at least forty shifts",
    swbShifts.length >= 40, String(swbShifts.length));
  check(swbCase, "every shift id is distinct",
    new Set(swbShifts.map((shift) => shift.id)).size === swbShifts.length);
  const swbShippedIds = swbShifts.slice(0, 24).map((shift) => shift.id).join(",");
  check(swbCase, "the shipped rungs b1-b24 keep their order",
    swbShippedIds === Array.from({ length: 24 }, (_, index) => "b" + (index + 1)).join(","),
    swbShippedIds);
  const swbShipped30 = swbShifts.slice(0, 30).map((shift) => shift.id).join(",");
  check(swbCase, "the shipped rungs b1-b30 keep their order",
    swbShipped30 === Array.from({ length: 30 }, (_, index) => "b" + (index + 1)).join(","),
    swbShipped30);
  const swbMissing = swbNewIds.filter((id) => !swbById(id));
  check(swbCase, "the new tier b25-b30 is present",
    swbMissing.length === 0, swbMissing.join(","));
  const swbRungMissing = swbRungIds.filter((id) => !swbById(id));
  check(swbCase, "the new tier b31-b40 is present",
    swbRungMissing.length === 0, swbRungMissing.join(","));
  check(swbCase, "every new shift keeps split pages and a budget of at least one",
    swbTier.length === 6 && swbTier.every((shift) => shift.pages === "split" && shift.budget >= 1),
    swbTier.filter((shift) => shift.pages !== "split" || shift.budget < 1)
      .map((shift) => shift.id).join(","));
  check(swbCase, "every b31-b40 rung keeps split pages, a budget of one and a named label",
    swbRungIds.every((id) => {
      const shift = swbById(id);
      return !!shift && shift.pages === "split" && shift.budget === 1 &&
        !!shift.labelKey && !!shift.briefKey;
    }),
    swbRungIds.filter((id) => {
      const shift = swbById(id);
      return !shift || shift.pages !== "split" || shift.budget !== 1 ||
        !shift.labelKey || !shift.briefKey;
    }).join(","));
  check(swbCase, "only the b1 teaching shift prints both rulebook pages",
    swbShifts.every((shift) => shift.pages === (shift.id === "b1" ? "both" : "split")),
    swbShifts.filter((shift) => shift.pages !== (shift.id === "b1" ? "both" : "split"))
      .map((shift) => shift.id).join(","));
  const swbB10 = swbById("b10");
  check(swbCase, "the shipped brief convention is untouched: b10 states twelve and logs thirteen",
    !!swbB10 && swbB10.fails.length === 12 && swbLog(swbB10).length === 13,
    swbB10 ? swbB10.fails.length + "/" + swbLog(swbB10).length : "missing");

  /* --- proof: every rung, its replay, its measured bands -------------- */
  const swbPar = {};
  const swbBands = {};
  const swbRunProblems = [];
  swbShifts.forEach((shift) => {
    const run = App.boardReplay(shift, false);
    swbPar[shift.id] = run.beats;
    swbBands[shift.id] = App.boardBands(shift);
    if (!App.boardSolvable(shift)) {
      swbRunProblems.push(shift.id + ":unsolvable");
    }
    if (!run.won || run.over || run.stress !== 0) {
      swbRunProblems.push(shift.id + ":run(W" + run.won + ",O" + run.over + ",S" + run.stress + ")");
    }
    if (swbBands[shift.id][0] !== run.beats) {
      swbRunProblems.push(shift.id + ":anchor");
    }
  });
  check(swbCase, "all shifts solve and every replay wins clean",
    swbRunProblems.length === 0,
    swbRunProblems.length ? swbRunProblems.join(" ") : swbShifts.length + "/" + swbShifts.length + " won at zero stress");

  const swbLadderProblems = [];
  swbShifts.forEach((shift, index) => {
    const bands = swbBands[shift.id];
    if (!(bands[0] < bands[1] && bands[1] < bands[2])) {
      swbLadderProblems.push(shift.id + ":" + bands.join("/"));
    }
    if (index > 0) {
      const below = swbShifts[index - 1];
      if (swbPar[shift.id] < swbPar[below.id]) {
        swbLadderProblems.push(shift.id + "<" + below.id);
      }
      const prior = swbBands[below.id];
      if (bands[0] < prior[0] || bands[1] < prior[1] || bands[2] < prior[2]) {
        swbLadderProblems.push(shift.id + ":narrower");
      }
    }
  });
  check(swbCase, "the measured ladder never gets cheaper and its derived bands only widen",
    swbLadderProblems.length === 0, swbLadderProblems.join(" "));

  check(swbCase, "b24 still measures 114 beats from its nineteen authored orders",
    !!swbById("b24") && swbById("b24").fails.length === 19 && swbPar.b24 === 114,
    swbById("b24") ? swbById("b24").fails.length + " orders / " + swbPar.b24 + " beats" : "missing");
  const swbTierPars = swbNewIds.map((id) => swbPar[id]);
  check(swbCase, "the new tier opens above b24's line and every rung costs more than the one below",
    swbTier.length === 6 && swbTierPars[0] > swbPar.b24 &&
      swbTierPars.every((beats, index) => index === 0 || beats > swbTierPars[index - 1]),
    swbTierPars.join("/"));
  const swbTierBandWidens = swbNewIds.every((id, index) => {
    if (index === 0) { return true; }
    const prior = swbBands[swbNewIds[index - 1]];
    const bands = swbBands[id];
    return bands[0] > prior[0] && bands[1] > prior[1] && bands[2] > prior[2];
  });
  check(swbCase, "every new rung's three bands sit above the rung below it",
    swbTierBandWidens,
    swbNewIds.map((id) => swbBands[id].join("/")).join(" "));

  /* The top tier is proved row by row: each rung replays clean, its three
   * bands anchor to the measured par, its closure count matches the HUD log,
   * and its par sits strictly above the rung below it (b30 for b31). */
  const swbRungLadderProblems = [];
  swbRungIds.forEach((id, index) => {
    const shift = swbById(id);
    if (!shift) {
      swbRungLadderProblems.push(id + ":missing");
      check(swbCase, id + ": replay wins clean at its measured par", false, "missing");
      return;
    }
    const run = App.boardReplay(shift, false);
    const bands = App.boardBands(shift);
    const log = swbLog(shift);
    const closed = run.script.length;
    check(swbCase, id + ": replay wins clean at its measured par",
      run.won && !run.over && run.stress === 0 && bands[0] === run.beats &&
        bands[0] < bands[1] && bands[1] < bands[2] && closed === log.length,
      log.length + " orders / par " + run.beats + " / bands " + bands.join("/") +
        " / closed " + closed + " / stress " + run.stress);
    const below = swbById(index === 0 ? "b30" : swbRungIds[index - 1]);
    if (!below) {
      swbRungLadderProblems.push(id + ":no rung below");
      return;
    }
    const priorPar = App.boardPar(below).beats;
    const priorBands = App.boardBands(below);
    if (!(run.beats > priorPar)) {
      swbRungLadderProblems.push(id + ":" + run.beats + "<=" + below.id + ":" + priorPar);
    }
    if (!(bands[0] > priorBands[0] && bands[1] > priorBands[1] && bands[2] > priorBands[2])) {
      swbRungLadderProblems.push(id + ":bands");
    }
  });
  check(swbCase, "b31-b40 climb strictly above the rung below and widen all three bands",
    swbRungLadderProblems.length === 0, swbRungLadderProblems.join(" "));

  /* --- the advertised mechanics are actually authored ----------------- */
  const swbB25 = swbById("b25");
  const swbB26 = swbById("b26");
  const swbB27 = swbById("b27");
  const swbB28 = swbById("b28");
  const swbB29 = swbById("b29");
  const swbB30 = swbById("b30");
  check(swbCase, "b25 authors a four-link cascade behind a twenty-order plate",
    !!swbB25 && swbB25.fails.length === 20 && swbChainDepth(swbB25) === 4,
    swbB25 ? swbB25.fails.length + "/" + swbChainDepth(swbB25) : "missing");
  check(swbCase, "b26 authors no cascade at all and returns its orders",
    !!swbB26 && swbChainDepth(swbB26) === 0 && swbReturns(swbB26) >= 10 &&
      swbAuthored(swbB26, "lostPrime") >= 3,
    swbB26 ? "chain " + swbChainDepth(swbB26) + ", returns " + swbReturns(swbB26) +
      ", lost primes " + swbAuthored(swbB26, "lostPrime") : "missing");
  check(swbCase, "b27 is dim, returns its orders and runs a three-link cascade",
    !!swbB27 && swbB27.dim === true && swbChainDepth(swbB27) === 3 && swbReturns(swbB27) >= 8,
    swbB27 ? "dim " + swbB27.dim + ", chain " + swbChainDepth(swbB27) +
      ", returns " + swbReturns(swbB27) : "missing");
  check(swbCase, "b28 is dim with its heat orders owned by the desk that cannot read the dial",
    !!swbB28 && swbB28.dim === true && swbHeatOrders(swbB28) >= 4 &&
      swbAuthored(swbB28, "overheat") >= 3,
    swbB28 ? "dim " + swbB28.dim + ", heat orders " + swbHeatOrders(swbB28) +
      ", overheats " + swbAuthored(swbB28, "overheat") : "missing");
  check(swbCase, "b29 authors the blackout four times behind a three-link cascade",
    !!swbB29 && swbAuthored(swbB29, "blackout") === 4 && swbChainDepth(swbB29) === 3,
    swbB29 ? "blackouts " + swbAuthored(swbB29, "blackout") +
      ", chain " + swbChainDepth(swbB29) : "missing");
  check(swbCase, "b30 caps the first tier with a five-link cascade",
    !!swbB30 && swbChainDepth(swbB30) === 5 && swbB30.fails.length >= 28,
    swbB30 ? swbB30.fails.length + " orders / " + swbChainDepth(swbB30) + " links" : "missing");

  /* The top tier's named advance, row by row: order count, cascade depth and
   * the mechanics that are not a bigger number - dim heat, a fourfold
   * flashover, twin branches, a cascade-free return plate. */
  const swbRungRoots = (shift) => {
    const chain = shift.chain || {};
    const targets = Object.keys(chain).map((from) => chain[from]);
    return Object.keys(chain).filter((from) => targets.indexOf(from) === -1);
  };
  const swbRungFacts = [
    { id: "b31", test: (shift) => shift.fails.length === 30 && swbChainDepth(shift) === 2 },
    { id: "b32", test: (shift) => shift.fails.length === 32 && swbChainDepth(shift) === 2 },
    { id: "b33", test: (shift) => swbChainDepth(shift) === 6 && swbRungRoots(shift).length === 1 },
    { id: "b34", test: (shift) => swbChainDepth(shift) === 4 && swbRungRoots(shift).length === 2 },
    { id: "b35", test: (shift) => !!shift.dim && swbHeatOrders(shift) >= 8 &&
      swbAuthored(shift, "overheat") === 4 && swbChainDepth(shift) === 4 },
    { id: "b36", test: (shift) => swbAuthored(shift, "flashedOver") === 4 && swbChainDepth(shift) === 4 },
    { id: "b37", test: (shift) => !!shift.dim && swbChainDepth(shift) === 6 },
    { id: "b38", test: (shift) => swbChainDepth(shift) === 6 && swbRungRoots(shift).length === 2 },
    { id: "b39", test: (shift) => swbChainDepth(shift) === 0 && shift.fails.length === 39 &&
      swbReturns(shift) >= 20 },
    { id: "b40", test: (shift) => swbChainDepth(shift) === 7 },
  ];
  const swbRungFactProblems = swbRungFacts.filter((fact) => {
    const shift = swbById(fact.id);
    return !shift || !fact.test(shift);
  }).map((fact) => fact.id);
  check(swbCase, "every b31-b40 rung authors the mechanic its brief names",
    swbRungFactProblems.length === 0,
    swbRungFactProblems.length ? swbRungFactProblems.join(",") :
      swbRungFacts.map((fact) => fact.id + ":" + swbChainDepth(swbById(fact.id))).join(" "));

  /* --- proof: every new mechanic binds when it is removed -------------- */
  /* A clone is only measured while it sits in the live ladder, because the
   * module resolves a shift by id through App.boardShifts. The ladder is put
   * back exactly as it was in a finally, and ids are unique per probe. */
  const swbWith = (shift, fn) => {
    App.boardShifts.push(shift);
    try {
      return fn(shift);
    } finally {
      const at = App.boardShifts.indexOf(shift);
      if (at !== -1) { App.boardShifts.splice(at, 1); }
    }
  };
  const swbClone = (shift, tag, mutate) => {
    const copy = {
      id: shift.id + "-gate-" + tag,
      labelKey: shift.labelKey,
      briefKey: shift.briefKey,
      budget: shift.budget,
      dim: shift.dim,
      pages: shift.pages,
      fails: shift.fails.slice(),
      chain: Object.assign({}, shift.chain),
    };
    mutate(copy);
    return copy;
  };
  const swbDrop = (shift, tag, mutate) => {
    const base = App.boardPar(shift).beats;
    const copy = swbClone(shift, tag, mutate);
    const run = swbWith(copy, (probe) => App.boardReplay(probe, false));
    return { base: base, beats: run.beats, drop: base - run.beats, won: run.won };
  };
  const swbBindings = [
    {
      id: "b25", label: "b25's four-link cascade binds",
      mutate: (copy) => { delete copy.chain.overheat; },
    },
    {
      id: "b26", label: "b26's returning lost prime binds",
      mutate: (copy) => {
        copy.fails = copy.fails.filter((id) => id !== "lostPrime");
      },
    },
    {
      id: "b27", label: "b27's cascade root binds",
      mutate: (copy) => { delete copy.chain.starved; },
    },
    {
      id: "b28", label: "b28's returning heat orders bind",
      mutate: (copy) => {
        copy.fails = copy.fails.filter((id) => id !== "overheat");
      },
    },
    {
      id: "b29", label: "b29's third blackout binds",
      mutate: (copy) => { copy.fails.splice(copy.fails.lastIndexOf("blackout"), 1); },
    },
    {
      id: "b30", label: "b30's five-link cascade binds",
      mutate: (copy) => { delete copy.chain.overheat; },
    },
  ];
  swbBindings.forEach((binding, index) => {
    const shift = swbById(binding.id);
    let proof = { drop: 0, won: true, base: 0, beats: 0 };
    if (shift) {
      proof = swbDrop(shift, binding.id + "-" + index, binding.mutate);
    }
    check(swbCase, binding.label,
      !!shift && (proof.drop >= 8 || !proof.won),
      shift ? "par " + proof.base + " -> " + proof.beats +
        " (drop " + proof.drop + ", won " + proof.won + ")" : "missing");
  });

  /* One removal per advertised mechanic on the top tier. A two-branch row is
   * probed branch by branch, because "two independent cascades" is only true
   * if either branch alone is worth at least the eight-beat bar. */
  const swbRungBindings = [
    {
      id: "b31", label: "b31's two-link hot-bus tail binds",
      mutate: (copy) => { delete copy.chain.hotBus; },
    },
    {
      id: "b32", label: "b32's two-link blackout tail binds",
      mutate: (copy) => { delete copy.chain.blackout; },
    },
    {
      id: "b33", label: "b33's six-link cascade binds",
      mutate: (copy) => { delete copy.chain.overheat; },
    },
    {
      id: "b34", label: "b34's header cascade binds",
      mutate: (copy) => { delete copy.chain.overheat; },
    },
    {
      id: "b34", label: "b34's arc cascade binds",
      mutate: (copy) => { delete copy.chain.arcing; },
    },
    {
      id: "b35", label: "b35's returning heat orders bind",
      mutate: (copy) => {
        copy.fails = copy.fails.filter((id) => id !== "overheat");
      },
    },
    {
      id: "b35", label: "b35's four-link cascade binds",
      mutate: (copy) => { delete copy.chain.stifledHeader; },
    },
    {
      id: "b36", label: "b36's four authored flashovers bind",
      mutate: (copy) => {
        copy.fails = copy.fails.filter((id) => id !== "flashedOver");
      },
    },
    {
      id: "b37", label: "b37's six-link cascade binds",
      mutate: (copy) => { delete copy.chain.blackout; },
    },
    {
      id: "b38", label: "b38's header three-link cascade binds",
      mutate: (copy) => { delete copy.chain.overheat; },
    },
    {
      id: "b38", label: "b38's arc three-link cascade binds",
      mutate: (copy) => { delete copy.chain.arcing; },
    },
    {
      id: "b39", label: "b39's returning blackout binds",
      mutate: (copy) => {
        const at = copy.fails.indexOf("blackout");
        if (at !== -1) { copy.fails.splice(at, 1); }
      },
    },
    {
      id: "b40", label: "b40's seven-link cascade binds",
      mutate: (copy) => { delete copy.chain.blackout; },
    },
  ];
  swbRungBindings.forEach((binding, index) => {
    const shift = swbById(binding.id);
    let proof = { drop: 0, won: true, base: 0, beats: 0 };
    if (shift) {
      proof = swbDrop(shift, "rung-" + binding.id + "-" + index, binding.mutate);
    }
    check(swbCase, binding.label,
      !!shift && (proof.drop >= 8 || !proof.won),
      shift ? "par " + proof.base + " -> " + proof.beats +
        " (drop " + proof.drop + ", won " + proof.won + ")" : "missing");
  });

  /* --- copy: names, briefs, and the counts they claim ----------------- */
  const swbCopyKeys = [];
  swbNewIds.forEach((id) => {
    const shift = swbById(id);
    if (shift) { swbCopyKeys.push(shift.labelKey, shift.briefKey); }
  });
  const swbCopyProblems = swbCopyKeys.filter((key) => {
    const en = App.I18N && App.I18N.en && App.I18N.en[key];
    const zh = App.I18N && App.I18N.zh && App.I18N.zh[key];
    const resolved = App.t(key);
    return !en || !zh || !resolved || resolved === key || en === zh;
  });
  check(swbCase, "all twelve new names and briefs resolve in both languages",
    swbCopyProblems.length === 0, swbCopyProblems.join(","));

  const swbCounts = {
    b25: { n: 20, en: "Twenty", zh: "二十" },
    b26: { n: 26, en: "Twenty-six", zh: "二十六" },
    b27: { n: 25, en: "Twenty-five", zh: "二十五" },
    b28: { n: 26, en: "Twenty-six", zh: "二十六" },
    b29: { n: 25, en: "Twenty-five", zh: "二十五" },
    b30: { n: 28, en: "Twenty-eight", zh: "二十八" },
  };
  const swbCountProblems = [];
  swbNewIds.forEach((id) => {
    const shift = swbById(id);
    if (!shift) { return; }
    const en = (App.I18N && App.I18N.en && App.I18N.en[shift.briefKey]) || "";
    const zh = (App.I18N && App.I18N.zh && App.I18N.zh[shift.briefKey]) || "";
    const claim = swbCounts[id];
    if (shift.fails.length !== claim.n) {
      swbCountProblems.push(id + ":authors " + shift.fails.length + " not " + claim.n);
    }
    if (en.indexOf(claim.en) === -1 || zh.indexOf(claim.zh) === -1) {
      swbCountProblems.push(id + ":copy count");
    }
  });
  check(swbCase, "every new brief states exactly the orders its own row authors",
    swbCountProblems.length === 0, swbCountProblems.join(" "));

  /* --- the top tier's copy: names, briefs and the real HUD counts ------ */
  const swbRungKeys = [];
  swbRungIds.forEach((id) => {
    const shift = swbById(id);
    if (shift) { swbRungKeys.push(shift.labelKey, shift.briefKey); }
  });
  const swbRungCopyProblems = swbRungKeys.filter((key) => {
    const en = App.I18N && App.I18N.en && App.I18N.en[key];
    const zh = App.I18N && App.I18N.zh && App.I18N.zh[key];
    const resolved = App.t(key);
    return !en || !zh || !resolved || resolved === key || en === zh;
  });
  check(swbCase, "every b31-b40 name and brief resolves in both languages",
    swbRungCopyProblems.length === 0, swbRungCopyProblems.join(","));

  /* The shipped tier states the authored plate. The top tier states the real
   * HUD count - authored orders plus every cascade-woken order - exactly as
   * the roster prints it, and names the authored plate inside the sentence. */
  const swbRungCounts = [
    { id: "b31", authored: 30, total: 32, en: "Thirty-two", zh: "三十二", authoredEn: "thirty authored", authoredZh: "三十张实排" },
    { id: "b32", authored: 32, total: 34, en: "Thirty-four", zh: "三十四", authoredEn: "thirty-two authored", authoredZh: "三十二张实排" },
    { id: "b33", authored: 32, total: 38, en: "Thirty-eight", zh: "三十八", authoredEn: "thirty-two authored", authoredZh: "三十二张实排" },
    { id: "b34", authored: 34, total: 38, en: "Thirty-eight", zh: "三十八", authoredEn: "thirty-four authored", authoredZh: "三十四张实排" },
    { id: "b35", authored: 34, total: 38, en: "Thirty-eight", zh: "三十八", authoredEn: "thirty-four authored", authoredZh: "三十四张实排" },
    { id: "b36", authored: 35, total: 39, en: "Thirty-nine", zh: "三十九", authoredEn: "thirty-five authored", authoredZh: "三十五张实排" },
    { id: "b37", authored: 33, total: 39, en: "Thirty-nine", zh: "三十九", authoredEn: "thirty-three authored", authoredZh: "三十三张实排" },
    { id: "b38", authored: 33, total: 39, en: "Thirty-nine", zh: "三十九", authoredEn: "thirty-three authored", authoredZh: "三十三张实排" },
    { id: "b39", authored: 39, total: 39, en: "Thirty-nine", zh: "三十九", authoredEn: "", authoredZh: "" },
    { id: "b40", authored: 32, total: 39, en: "Thirty-nine", zh: "三十九", authoredEn: "thirty-two authored", authoredZh: "三十二张实排" },
  ];
  const swbRungCountProblems = [];
  swbRungCounts.forEach((claim) => {
    const shift = swbById(claim.id);
    if (!shift) {
      swbRungCountProblems.push(claim.id + ":missing");
      return;
    }
    const en = (App.I18N && App.I18N.en && App.I18N.en[shift.briefKey]) || "";
    const zh = (App.I18N && App.I18N.zh && App.I18N.zh[shift.briefKey]) || "";
    const log = swbLog(shift);
    const woken = log.length - shift.fails.length;
    if (shift.fails.length !== claim.authored) {
      swbRungCountProblems.push(claim.id + ":authors " + shift.fails.length);
    }
    if (log.length !== claim.total) {
      swbRungCountProblems.push(claim.id + ":logs " + log.length);
    }
    if (woken !== swbChainDepth(shift)) {
      swbRungCountProblems.push(claim.id + ":woken " + woken + "/" + swbChainDepth(shift));
    }
    if (en.indexOf(claim.en) === -1 || zh.indexOf(claim.zh) === -1) {
      swbRungCountProblems.push(claim.id + ":copy total");
    }
    if (claim.authoredEn &&
      (en.toLowerCase().indexOf(claim.authoredEn) === -1 ||
        zh.indexOf(claim.authoredZh) === -1)) {
      swbRungCountProblems.push(claim.id + ":copy authored");
    }
  });
  check(swbCase, "every b31-b40 brief states the real HUD count, authored plus woken",
    swbRungCountProblems.length === 0, swbRungCountProblems.join(" "));

  /* --- the unlock chain still hands out every rung in order ------------ */
  const swbCampaign = App.createCampaign({
    key: "switchboard-duo-gate-chain",
    levels: swbShifts.map((shift) => ({ id: shift.id, labelKey: shift.labelKey })),
  });
  let swbWalked = 0;
  let swbChained = true;
  let swbUnlockOrder = true;
  swbShifts.forEach((shift, index) => {
    if (!swbCampaign.isUnlocked(shift.id)) { swbUnlockOrder = false; }
    const outcome = swbCampaign.record(shift.id, { stars: 3, best: 1, better: "low" });
    if (outcome.firstClear) { swbWalked += 1; }
    const expected = index + 1 < swbShifts.length ? swbShifts[index + 1].id : null;
    if (outcome.unlockedNext !== expected) { swbChained = false; }
  });
  check(swbCase, "the unlock chain walks every shipped shift in order and locks nothing after the finale",
    swbWalked === swbShifts.length && swbChained && swbUnlockOrder &&
      swbCampaign.clearedCount() === swbShifts.length,
    swbWalked + " first clears, " + swbCampaign.clearedCount() + " recorded");
};
