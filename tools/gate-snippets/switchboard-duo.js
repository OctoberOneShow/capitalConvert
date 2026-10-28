"use strict";

/* game-switchboard-duo: the ladder is thirty shifts, and the new tier is six
 * binding machine lessons
 *
 * Everything below the structure block is measured, never authored. The
 * module's own replay walks the panel's boardStep with the canonical line for
 * every order, so App.boardSolvable, App.boardPar and App.boardBands are the
 * only source of beats and bands. The new tier is then held to its briefs: a
 * four-link cascade (b25), a shift with no cascade and returning orders (b26),
 * a dim three-link cascade with returns (b27), heat orders whose dial is read
 * across the aisle (b28), a blackout authored three times (b29), and a
 * five-link finale (b30). Each advertised mechanic is removed from a clone of
 * its own shift and the clone is replayed: the par must drop by at least eight
 * beats or the clone must fail, so no mechanic can live in copy alone. New
 * copy must resolve in both languages and state the count its row authors, and
 * the unlock chain must still walk all thirty rungs in order. */
module.exports = function gate(ctx) {
  const { App, check } = ctx;
  const swbCase = "game-switchboard-duo";
  const swbShifts = App.boardShifts;
  const swbById = (id) => swbShifts.find((shift) => shift.id === id);
  const swbNewIds = ["b25", "b26", "b27", "b28", "b29", "b30"];
  const swbTier = swbNewIds.map(swbById).filter(Boolean);

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
  check(swbCase, "the campaign holds at least thirty shifts",
    swbShifts.length >= 30, String(swbShifts.length));
  check(swbCase, "every shift id is distinct",
    new Set(swbShifts.map((shift) => shift.id)).size === swbShifts.length);
  const swbShippedIds = swbShifts.slice(0, 24).map((shift) => shift.id).join(",");
  check(swbCase, "the shipped rungs b1-b24 keep their order",
    swbShippedIds === Array.from({ length: 24 }, (_, index) => "b" + (index + 1)).join(","),
    swbShippedIds);
  const swbMissing = swbNewIds.filter((id) => !swbById(id));
  check(swbCase, "the new tier b25-b30 is present",
    swbMissing.length === 0, swbMissing.join(","));
  check(swbCase, "every new shift keeps split pages and a budget of at least one",
    swbTier.length === 6 && swbTier.every((shift) => shift.pages === "split" && shift.budget >= 1),
    swbTier.filter((shift) => shift.pages !== "split" || shift.budget < 1)
      .map((shift) => shift.id).join(","));
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
  check(swbCase, "all thirty shifts solve and every replay wins clean",
    swbRunProblems.length === 0,
    swbRunProblems.length ? swbRunProblems.join(" ") : "30/30 won at zero stress");

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
  check(swbCase, "b30 is the deepest cascade on the board at five links",
    !!swbB30 && swbChainDepth(swbB30) === 5 && swbB30.fails.length >= 28,
    swbB30 ? swbB30.fails.length + " orders / " + swbChainDepth(swbB30) + " links" : "missing");

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

  /* --- the unlock chain still hands out all thirty rungs in order ------ */
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
  check(swbCase, "the unlock chain walks all thirty shifts in order and locks nothing after the finale",
    swbWalked === swbShifts.length && swbChained && swbUnlockOrder &&
      swbCampaign.clearedCount() === swbShifts.length,
    swbWalked + " first clears, " + swbCampaign.clearedCount() + " recorded");
};
