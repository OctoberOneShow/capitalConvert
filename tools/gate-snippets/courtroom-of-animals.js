"use strict";

/* game-courtroom-of-animals: a twenty-four case docket, proved at deal time
 *
 * The courtroom game ships one authored docket and one exported prover. This
 * gate re-runs that prover over every shipped case, so a case is only on the
 * docket when every clue any charge needs is reachable inside the action budget
 * and the best play is a sound verdict against the culprit. Star bands are read
 * from the same best-play line instead of being stored. The four endgame cases
 * are then held to the mechanic each one teaches:
 *
 *   k21  a press that costs two actions, which is the only reason the one
 *        corroboration in the winning line is load-bearing;
 *   k22  a charge that names six words but must pay for a seventh the charge
 *        never uses, filling the clock exactly;
 *   k23  three witnesses believed outright at five, so every press must be
 *        mended by its own corroboration and the order is forced;
 *   k24  the whole bench: three owners at four, one press costing two actions,
 *        one press crossing to another witness's word and recanting the rival
 *        charge, and a docket proof that spends every action the clock has.
 */
module.exports = function gate(ctx) {
  const { App, check, fs, path, root } = ctx;
  const slug = "game-courtroom-of-animals";
  const cases = App.courtCases || [];
  const ids = cases.map((def) => def.id);
  const expected = Array.from({ length: 24 }, (_, i) => "k" + (i + 1));
  const newIds = ["k21", "k22", "k23", "k24"];
  const shippedIds = expected.slice(0, 20);

  const byId = (list, id) => (list || []).find((item) => item.id === id) || null;
  const caseById = (id) => byId(cases, id);
  const claimOf = (def, id) => byId(def.claims, id);
  const probeOf = (def, id) => byId((def.presses || []).concat(def.vouches || []), id);
  const clone = (def) => JSON.parse(JSON.stringify(def));
  const solvable = (def) => App.courtSolvable(def).ok;
  const bands = (def) => App.courtBands(def);
  const bandsAtLeast = (left, right) =>
    left[0] >= right[0] && left[1] >= right[1] && left[2] >= right[2];

  /* A charged state: every word and exhibit of the claim, plus the named
   * presses, with no corroboration spent. The verdict and the trust number are
   * the panel's own, so a claim about what a press costs is measured, not
   * asserted. */
  const covered = (def, claim, pressIds) => {
    const state = App.courtState(def);
    (claim.statements || []).forEach((id) => { state.statements[id] = 1; });
    (claim.exhibits || []).forEach((id) => { state.exhibits[id] = 1; });
    pressIds.forEach((id) => {
      const press = byId(def.presses, id);
      if (press) {
        state.presses[id] = 1;
        state.delta[press.witness] = (state.delta[press.witness] || 0) -
          (press.cost == null ? 1 : press.cost);
      }
    });
    return state;
  };

  /* --- the docket ------------------------------------------------------- */

  check(slug, "the live docket holds exactly twenty-four cases",
    cases.length === 24, String(cases.length));
  check(slug, "the docket ids are k1 to k24 in order",
    ids.join(",") === expected.join(","), ids.join(","));
  check(slug, "every case id is distinct",
    new Set(ids).size === ids.length, String(new Set(ids).size));

  cases.forEach((def) => {
    const report = App.courtSolvable(def);
    const best = report.best;
    const top = bands(def);
    const tag = def.id;

    check(slug, `${tag}: the prover reaches every clue and a sound verdict`,
      report.ok && report.highQuality &&
      report.unreachable.length === 0 && report.dangling.length === 0 &&
      report.feasible.length > 0,
      `needed ${report.needed}/${def.time}; unreachable ` +
      `${report.unreachable.join("|") || "-"}; dangling ${report.dangling.join("|") || "-"}`);

    check(slug, `${tag}: the best play is a sound verdict on the culprit`,
      !!best && best.quality === 3 && best.accused === def.culprit &&
      best.strength >= def.bar.strength && best.trust >= def.bar.trust,
      best ? `${best.claimId} ${best.strength}/${best.trust} vs ` +
        `${def.bar.strength}/${def.bar.trust}` : "no best line");

    check(slug, `${tag}: the best line and the whole docket fit the clock`,
      !!best && best.actions <= def.time && report.needed <= def.time,
      best ? `best ${best.actions}, proof ${report.needed}, clock ${def.time}` : "no best line");

    check(slug, `${tag}: the star bands are derived from the best-play strength`,
      !!best && top.length === 3 && top[0] === best.strength &&
      top[1] === Math.max(def.bar.strength, top[0] - 2) &&
      top[2] === Math.min(top[1], def.bar.strength),
      top.join("/") + " from " + (best ? best.strength : "?"));
  });

  /* --- the new tier is the endgame -------------------------------------- */

  const endgame = newIds.map((id) => caseById(id));
  if (endgame.every(Boolean)) {
    const measures = endgame.map((def) => ({
      id: def.id,
      needed: App.courtSolvable(def).needed,
      top: bands(def),
      actions: App.courtBestLine(def).actions,
      time: def.time,
    }));

    check(slug, "k21..k24 form a strictly rising band ladder",
      measures.every((m, i) => i === 0 || m.top[0] > measures[i - 1].top[0]) &&
      measures.every((m, i) => i === 0 || bandsAtLeast(m.top, measures[i - 1].top)),
      measures.map((m) => m.id + ":" + m.top.join("/")).join(" "));

    check(slug, "the new tier's proof cost never falls as the bands rise",
      measures.every((m, i) => i === 0 || m.needed >= measures[i - 1].needed),
      measures.map((m) => m.id + ":" + m.needed).join(" "));

    const shippedTop = shippedIds.map((id) => bands(caseById(id)));
    check(slug, "no new rung is handed an easier band than any shipped case",
      measures.every((m) => shippedTop.every((top) => bandsAtLeast(m.top, top))),
      "new lows " + measures.map((m) => m.top[2]).join(",") +
      " vs shipped highs " + shippedTop.map((t) => t[0]).join(","));

    const tops = cases.map((def) => bands(def)[0]);
    const maxTop = Math.max.apply(null, tops);
    const maxActions = Math.max.apply(null, cases.map((def) => App.courtBestLine(def).actions));
    const maxNeeded = Math.max.apply(null, cases.map((def) => App.courtSolvable(def).needed));
    const maxTime = Math.max.apply(null, cases.map((def) => def.time));
    check(slug, "k24 is the hardest measured case on the ladder",
      bands(caseById("k24"))[0] === maxTop &&
      tops.filter((value) => value === maxTop).length === 1 &&
      App.courtBestLine(caseById("k24")).actions === maxActions &&
      App.courtSolvable(caseById("k24")).needed === maxNeeded &&
      caseById("k24").time === maxTime,
      `top ${maxTop}, actions ${maxActions}, proof ${maxNeeded}, clock ${maxTime}`);
  } else {
    check(slug, "k21..k24 all exist for the endgame proof", false, "missing");
  }

  /* --- k21: the two-action press is why the corroboration pays ---------- */

  const k21 = caseById("k21");
  if (k21) {
    const claim = claimOf(k21, "k21c1");
    const press = byId(k21.presses, "k21p1");
    const best = App.courtBestLine(k21);
    const seal = byId(k21.witnesses, press ? press.witness : "");
    const ownerState = App.courtState(k21);
    const base = seal ? App.courtTrust(k21, ownerState, seal.id) : 0;
    const costly = covered(k21, claim, ["k21p1", "k21p2"]);
    const cheap = covered(k21, claim, ["k21p1", "k21p2"]);
    cheap.delta[seal.id] = (cheap.delta[seal.id] || 0) + 1; /* the deep press at one action */
    const costlyVerdict = App.courtVerdict(costly, claim.id);
    const cheapVerdict = App.courtVerdict(cheap, claim.id);

    check(slug, "k21: the charge turns on a witness the bench believes outright",
      !!seal && base === 5 && k21.bar.trust === 3,
      `base trust ${base}, bar ${k21.bar.trust}`);
    check(slug, "k21: the deep press really costs two actions",
      !!press && press.cost === 2 && !!best && best.presses.indexOf(press.id) !== -1,
      press ? `${press.id} cost ${press.cost}` : "no press");
    check(slug, "k21: without the costly press the corroboration buys nothing",
      costlyVerdict.verdict === "doubt" && cheapVerdict.verdict === "just",
      `${costlyVerdict.verdict}/${costlyVerdict.trust} versus ` +
      `${cheapVerdict.verdict}/${cheapVerdict.trust}`);
    check(slug, "k21: dropping either press or the corroboration breaks the case",
      !solvable(cloneRemove(k21, "presses", "k21p1")) &&
      !solvable(cloneRemove(k21, "presses", "k21p2")) &&
      !solvable(cloneRemove(k21, "vouches", "k21v1")),
      "p1, p2 and v1 each load-bearing");
  } else {
    check(slug, "k21: the case exists for its structural proof", false, "missing");
  }

  /* --- k22: the unnamed seventh word fills the clock -------------------- */

  const k22 = caseById("k22");
  if (k22) {
    const claim = claimOf(k22, "k22c1");
    const best = App.courtBestLine(k22);
    const named = (claim.statements || []).length;
    const testimony = best ? best.actions - k22.presses.length - k22.vouches.length : 0;
    const probes = (k22.presses || []).concat(k22.vouches || []);

    check(slug, "k22: the charge names six words but pays for seven",
      named === 6 && testimony === 7 && best.actions === k22.time,
      `named ${named}, heard ${testimony}, clock ${k22.time}`);
    check(slug, "k22: the clock is exact and one action shorter breaks the proof",
      App.courtSolvable(k22).needed === k22.time &&
      !solvable(Object.assign(clone(k22), { time: k22.time - 1 })),
      `proof ${App.courtSolvable(k22).needed}/${k22.time}`);
    check(slug, "k22: every press and corroboration in the one line is load-bearing",
      probes.every((probe) => !solvable(
        cloneRemove(k22, probe.exhibit ? "vouches" : "presses", probe.id))),
      probes.map((probe) => probe.id).join(","));
  } else {
    check(slug, "k22: the case exists for its structural proof", false, "missing");
  }

  /* --- k23: three witnesses believed outright, every debt mended -------- */

  const k23 = caseById("k23");
  if (k23) {
    const best = App.courtBestLine(k23);
    const trusts = k23.witnesses.map((witness) => witness.trust);
    const probes = (k23.presses || []).concat(k23.vouches || []);

    check(slug, "k23: the bench believes all three witnesses outright",
      k23.bar.trust === 5 && trusts.length === 3 && trusts.every((trust) => trust === 5),
      trusts.join(",") + " vs bar " + k23.bar.trust);
    check(slug, "k23: the winning line presses and mends every one of them",
      !!best && best.presses.length === 3 && best.vouches.length === 3 &&
      best.trust === 5 && best.quality === 3,
      best ? `${best.presses.length} presses, ${best.vouches.length} vouches, ` +
        `trust ${best.trust}` : "no best line");
    check(slug, "k23: one missing press or corroboration loses the case",
      probes.every((probe) => !solvable(
        cloneRemove(k23, probe.exhibit ? "vouches" : "presses", probe.id))),
      probes.map((probe) => probe.id).join(","));
  } else {
    check(slug, "k23: the case exists for its structural proof", false, "missing");
  }

  /* --- k24: the whole bench, every action spent ------------------------- */

  const k24 = caseById("k24");
  if (k24) {
    const claim = claimOf(k24, "k24c1");
    const rival = claimOf(k24, "k24c2");
    const cross = byId(k24.presses, "k24p1");
    const deep = byId(k24.presses, "k24p2");
    const conger = byId(k24.witnesses, "k24w2");
    const best = App.courtBestLine(k24);
    const report = App.courtSolvable(k24);

    check(slug, "k24: one press crosses to the rival's own word",
      !!cross && !!cross.exposes && !!rival &&
      (rival.statements || []).indexOf(cross.exposes) !== -1 &&
      (claim.statements || []).indexOf(cross.exposes) === -1,
      cross ? `${cross.id} exposes ${cross.exposes}` : "no cross-expose");
    check(slug, "k24: the deep press costs two actions on a witness believed outright",
      !!deep && deep.cost === 2 && !!conger && conger.trust === 5 &&
      !!byId(k24.vouches, "k24v2") && byId(k24.vouches, "k24v2").witness === conger.id,
      deep ? `${deep.id} cost ${deep.cost}, conger base ${conger.trust}, ` +
        `v2 on ${byId(k24.vouches, "k24v2") ? byId(k24.vouches, "k24v2").witness : "?"}`
        : "no deep press");
    check(slug, "k24: the true closing and the whole docket spend the clock exactly",
      report.needed === k24.time && !!best && best.quality === 3 &&
      !solvable(Object.assign(clone(k24), { time: k24.time - 1 })),
      `proof ${report.needed}/${k24.time}, best ${best ? best.actions : "?"}`);
    check(slug, "k24: every press and corroboration on the true charge is load-bearing",
      ["k24p1", "k24p2", "k24p3", "k24v1", "k24v2", "k24v3"].every((id) => {
        const probe = probeOf(k24, id);
        return !!probe && !solvable(cloneRemove(k24, probe.exhibit ? "vouches" : "presses", id));
      }),
      "p1 p2 p3 v1 v2 v3 each necessary");
  } else {
    check(slug, "k24: the case exists for its structural proof", false, "missing");
  }

  /* --- copy ------------------------------------------------------------- */

  const dicts = (App.I18N && App.I18N.en && App.I18N.zh) ? App.I18N : { en: {}, zh: {} };
  const copyKeys = Array.from(new Set(
    Object.keys(dicts.en).concat(Object.keys(dicts.zh)).filter((key) => key.indexOf("cta") === 0)));
  const copyGaps = typeof App.courtCopyCheck === "function" ? App.courtCopyCheck() : ["no prover"];

  const missing = copyGaps.slice();
  const undeclared = copyKeys.filter((key) =>
    !Object.prototype.hasOwnProperty.call(dicts.en, key) ||
    !Object.prototype.hasOwnProperty.call(dicts.zh, key));
  const unfilled = copyKeys.filter((key) => {
    const en = dicts.en[key];
    const zh = dicts.zh[key];
    return typeof en !== "string" || en.length === 0 ||
      typeof zh !== "string" || zh.length === 0 ||
      en === key || zh === key;
  });
  const bare = [];
  cases.forEach((def) => {
    const records = [def.charge]
      .concat(def.suspects || [], def.exhibits || [], def.witnesses || [],
        (def.witnesses || []).flatMap((witness) => witness.statements || []),
        def.presses || [], def.vouches || [], def.claims || []);
    records.forEach((record) => {
      if (!record || typeof record.en !== "string" || record.en.length === 0 ||
        typeof record.zh !== "string" || record.zh.length === 0 ||
        record.en === record.zh || !/[\u4e00-\u9fff]/.test(record.zh)) {
        bare.push(def.id + ":" + ((record && record.id) || "charge"));
      }
    });
  });

  check(slug, "the verdict copy has no missing keys", missing.length === 0,
    missing.join(",") || "none");
  check(slug, "the copy pack has no key declared in only one language",
    undeclared.length === 0, undeclared.join(",") || "none");
  check(slug, "the copy pack has no empty or unfilled line",
    unfilled.length === 0, unfilled.join(",") || "none");
  check(slug, "every authored case record carries English and Chinese prose",
    bare.length === 0, bare.slice(0, 12).join(",") + (bare.length > 12 ? "..." : ""));

  check(slug, "the four summit labels resolve in both languages",
    newIds.every((id) => {
      const def = caseById(id);
      const en = def && dicts.en[def.labelKey];
      const zh = def && dicts.zh[def.labelKey];
      return !!def && typeof en === "string" && en.length > 0 && en !== def.labelKey &&
        typeof zh === "string" && zh.length > 0 && zh !== def.labelKey &&
        en !== zh && App.t(def.labelKey) !== def.labelKey;
    }),
    newIds.map((id) => (caseById(id) || {}).labelKey).join(","));

  /* --- guide ------------------------------------------------------------ */

  const guides = typeof App.getRegistryGuides === "function" ? App.getRegistryGuides() : [];
  const guide = guides.find((item) => item.id === "courtroomOfAnimals") || null;
  const source = fs.readFileSync(
    path.join(root, "assets", "app", "game-courtroom-of-animals.js"), "utf8");
  const saysTwentyFour = /close one of twenty-four cases/.test(source) &&
    /在二十四件案子里/.test(source) &&
    !/close one of twenty cases/.test(source) && !/在二十件案子里/.test(source);

  check(slug, "the guide gives the live ladder length, not a shipped one",
    !!guide && saysTwentyFour && cases.length === 24,
    guide ? `${cases.length} cases; en ${guide.en[0]}; zh ${guide.zh[0]}` : "no guide");

  /* --- unlock chain ----------------------------------------------------- */

  const chain = App.createCampaign({
    key: "courtroom-animals-gate-chain",
    levels: cases.map((def) => ({ id: def.id, labelKey: def.labelKey })),
  });
  let walked = 0;
  let chained = true;
  cases.forEach((def, index) => {
    const outcome = chain.record(def.id, { stars: 3, best: 1, better: "low" });
    if (outcome.firstClear) {
      walked += 1;
    }
    const next = index + 1 < cases.length ? cases[index + 1].id : null;
    if (outcome.unlockedNext !== next) {
      chained = false;
    }
  });
  check(slug, "the unlock chain walks all twenty-four cases in order",
    walked === cases.length && chained && chain.clearedCount() === cases.length,
    `${walked} first clears of ${cases.length}`);
};

/* Remove one probe from a JSON clone of a case; the clone keeps its id so the
 * panel's own verdict reader still recognizes the charge. */
function cloneRemove(def, kind, id) {
  const copy = JSON.parse(JSON.stringify(def));
  copy[kind] = (copy[kind] || []).filter((item) => item.id !== id);
  return copy;
}
