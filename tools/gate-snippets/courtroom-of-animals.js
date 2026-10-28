"use strict";

/* game-courtroom-of-animals: a thirty case docket, proved at deal time
 *
 * The courtroom game ships one authored docket and one exported prover. This
 * gate re-runs that prover over every shipped case, so a case is only on the
 * docket when every clue any charge needs is reachable inside the action budget
 * and the best play is a sound verdict against the culprit. Star bands are read
 * from the same best-play line instead of being stored. The ten endgame cases
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
 *        charge, and a docket proof that spends every action the clock has;
 *   k25  a question priced at three that no mending can save, so the winning
 *        line routes around it; at one action it would join the line;
 *   k26  a cross-witness recant: the press exposes a word that belongs to the
 *        rival charge only, so the rival recants and the true charge stands;
 *   k27  corroboration ordering: at the trust ceiling the bench refuses the
 *        mending until the question has brought the witness down a point;
 *   k28  the exact clock: twelve words, three questions and three mendings
 *        spend all eighteen actions, and one action less fits no sound line;
 *   k29  the vouch that rescues a broken press: every press costs two and
 *        leaves its witness under the bar, and only the mending puts it back;
 *   k30  the exhibit that waits on a witness: the mirror counts only through a
 *        question anchored on the mole's third word, and the summit case is the
 *        hardest measured case on the ladder.
 */
module.exports = function gate(ctx) {
  const { App, check, fs, path, root } = ctx;
  const slug = "game-courtroom-of-animals";
  const cases = App.courtCases || [];
  const ids = cases.map((def) => def.id);
  const expected = Array.from({ length: 30 }, (_, i) => "k" + (i + 1));
  const newIds = ["k25", "k26", "k27", "k28", "k29", "k30"];
  const ladderIds = expected.slice(20);
  const shippedIds = expected.slice(0, 24);

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

  /* A fully played state for the new-tier cuts: the charge's words and
   * exhibits, the named presses with their exposes and trust cost, and the
   * named corroborations with the trust they mend. Built through the exported
   * court state so the verdict and trust numbers are the panel's own. */
  const played = (def, claim, pressIds, vouchIds) => {
    const state = App.courtState(def);
    (claim.statements || []).forEach((id) => {
      const owner = (def.witnesses || []).find((witness) =>
        (witness.statements || []).some((word) => word.id === id));
      if (owner) {
        const index = owner.statements.findIndex((word) => word.id === id);
        owner.statements.slice(0, index + 1).forEach((word) => {
          state.statements[word.id] = 1;
        });
      }
    });
    (claim.exhibits || []).forEach((id) => { state.exhibits[id] = 1; });
    pressIds.forEach((id) => {
      const press = byId(def.presses, id);
      if (!press) {
        return;
      }
      state.presses[id] = 1;
      if (press.exposes) {
        state.exposed[press.exposes] = 1;
      }
      state.delta[press.witness] = (state.delta[press.witness] || 0) -
        (press.cost == null ? 1 : press.cost);
      const anchor = press.with;
      if (byId(def.exhibits, anchor)) {
        state.exhibits[anchor] = 1;
      }
    });
    vouchIds.forEach((id) => {
      const vouch = byId(def.vouches, id);
      if (!vouch) {
        return;
      }
      state.vouches[id] = 1;
      state.raised[vouch.witness] = 1;
      state.exhibits[vouch.exhibit] = 1;
    });
    return state;
  };

  /* --- the docket ------------------------------------------------------- */

  check(slug, "the live docket holds at least thirty cases",
    cases.length >= 30, String(cases.length));
  check(slug, "the docket opens with k1 to k30 in order",
    ids.slice(0, 30).join(",") === expected.join(","), ids.slice(0, 30).join(","));
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

  const endgame = ladderIds.map((id) => caseById(id));
  if (endgame.every(Boolean)) {
    const measures = endgame.map((def) => ({
      id: def.id,
      needed: App.courtSolvable(def).needed,
      top: bands(def),
      actions: App.courtBestLine(def).actions,
      time: def.time,
    }));

    check(slug, "k21..k30 form a strictly rising band ladder",
      measures.every((m, i) => i === 0 || m.top[0] > measures[i - 1].top[0]) &&
      measures.every((m, i) => i === 0 || bandsAtLeast(m.top, measures[i - 1].top)),
      measures.map((m) => m.id + ":" + m.top.join("/")).join(" "));

    check(slug, "the endgame's proof cost never falls as the bands rise",
      measures.every((m, i) => i === 0 || m.needed >= measures[i - 1].needed),
      measures.map((m) => m.id + ":" + m.needed).join(" "));

    const shippedTop = shippedIds.map((id) => bands(caseById(id)));
    check(slug, "no new rung is handed an easier band than any shipped case",
      newIds.every((id) => {
        const top = bands(caseById(id));
        return shippedTop.every((old) => bandsAtLeast(top, old));
      }),
      "new lows " + newIds.map((id) => bands(caseById(id))[2]).join(",") +
      " vs shipped highs " + shippedTop.map((t) => t[0]).join(","));

    const tops = cases.map((def) => bands(def)[0]);
    const maxTop = Math.max.apply(null, tops);
    const maxActions = Math.max.apply(null, cases.map((def) => App.courtBestLine(def).actions));
    const maxNeeded = Math.max.apply(null, cases.map((def) => App.courtSolvable(def).needed));
    const maxTime = Math.max.apply(null, cases.map((def) => def.time));
    const summit = caseById("k30");
    check(slug, "k30 is the hardest measured case on the ladder",
      bands(summit)[0] === maxTop &&
      tops.filter((value) => value === maxTop).length === 1 &&
      App.courtBestLine(summit).actions === maxActions &&
      cases.filter((def) => App.courtBestLine(def).actions === maxActions).length === 1 &&
      App.courtSolvable(summit).needed === maxNeeded &&
      cases.filter((def) => App.courtSolvable(def).needed === maxNeeded).length === 1 &&
      summit.time === maxTime &&
      cases.filter((def) => def.time === maxTime).length === 1,
      `top ${maxTop}, actions ${maxActions}, proof ${maxNeeded}, clock ${maxTime}`);
  } else {
    check(slug, "k21..k30 all exist for the endgame proof", false, "missing");
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

  /* --- k25: a question priced out of the case --------------------------- */

  const k25 = caseById("k25");
  if (k25) {
    const claim = claimOf(k25, "k25c1");
    const costly = byId(k25.presses, "k25p3");
    const best = App.courtBestLine(k25);
    const drowned = played(k25, claim, ["k25p1", "k25p2", "k25p3"],
      ["k25v1", "k25v2"]);
    const cheap = clone(k25);
    byId(cheap.presses, "k25p3").cost = 1;
    const cheapBest = App.courtBestLine(cheap);

    check(slug, "k25: the third question is priced above what mending can restore",
      !!costly && costly.cost === 3 && k25.bar.trust === 3 &&
      App.courtTrust(k25, drowned, costly.witness) < k25.bar.trust,
      costly ? `${costly.id} cost ${costly.cost}, trust ` +
        `${App.courtTrust(k25, drowned, costly.witness)} vs bar ${k25.bar.trust}` : "no press");
    check(slug, "k25: at three the press is not in the winning line, at one it joins",
      !!best && best.presses.indexOf("k25p3") === -1 && !!cheapBest &&
      cheapBest.presses.indexOf("k25p3") !== -1 &&
      cheapBest.strength > best.strength && solvable(cheap),
      best ? `three: ${best.strength}/${best.actions}; one: ` +
        `${cheapBest ? cheapBest.strength + "/" + cheapBest.actions : "?"}` : "no line");
  } else {
    check(slug, "k25: the case exists for its structural proof", false, "missing");
  }

  /* --- k26: the cross-witness recant ------------------------------------ */

  const k26 = caseById("k26");
  if (k26) {
    const claim = claimOf(k26, "k26c1");
    const rival = claimOf(k26, "k26c2");
    const cross = byId(k26.presses, "k26p1");
    const best = App.courtBestLine(k26);
    const heard = played(k26, rival, ["k26p1"], []);
    const stripped = clone(k26);
    delete byId(stripped.presses, "k26p1").exposes;
    const strippedRival = claimOf(stripped, "k26c2");
    const blunt = played(stripped, strippedRival, ["k26p1"], []);
    const selfAimed = clone(k26);
    byId(selfAimed.presses, "k26p1").exposes = "k26s1";
    const selfClaim = claimOf(selfAimed, "k26c1");
    const selfState = played(selfAimed, selfClaim, ["k26p1"], []);
    const selfBest = App.courtBestLine(selfAimed);

    check(slug, "k26: the press exposes a word only the rival charge owns",
      !!cross && cross.exposes === "k26s9" && !!rival && !!claim &&
      (rival.statements || []).indexOf("k26s9") !== -1 &&
      (claim.statements || []).indexOf("k26s9") === -1,
      cross ? `${cross.id} exposes ${cross.exposes}` : "no cross press");
    check(slug, "k26: the exposed word recants the rival and the true charge stands",
      App.courtVerdict(heard, "k26c2").verdict === "recanted" &&
      App.courtVerdict(heard, "k26c1").verdict !== "recanted",
      `${App.courtVerdict(heard, "k26c2").verdict}/` +
      `${App.courtVerdict(heard, "k26c1").verdict}`);
    check(slug, "k26: take the expose away and the rival is not recanted",
      App.courtVerdict(blunt, "k26c2").verdict !== "recanted",
      App.courtVerdict(blunt, "k26c2").verdict);
    check(slug, "k26: aim the same expose at the true charge and the line recants",
      App.courtVerdict(selfState, "k26c1").verdict === "recanted" &&
      !!selfBest && selfBest.quality === 0,
      App.courtVerdict(selfState, "k26c1").verdict + "/" +
      (selfBest ? selfBest.quality : "?"));
    check(slug, "k26: the cross press is load-bearing on its own charge",
      !!best && best.presses.indexOf("k26p1") !== -1 &&
      !solvable(cloneRemove(k26, "presses", "k26p1")),
      "p1 in the line and its removal loses the case");
  } else {
    check(slug, "k26: the case exists for its structural proof", false, "missing");
  }

  /* --- k27: corroboration ordering at the ceiling ----------------------- */

  const k27 = caseById("k27");
  if (k27) {
    const claim = claimOf(k27, "k27c1");
    const question = byId(k27.presses, "k27p1");
    const mend = byId(k27.vouches, "k27v1");
    const base = played(k27, claim, [], []);
    const asked = played(k27, claim, ["k27p1"], []);
    const mended = played(k27, claim, ["k27p1"], ["k27v1"]);

    check(slug, "k27: at the ceiling the bench refuses the corroboration",
      !!mend && !!question && k27.bar.trust === 5 &&
      App.courtTrust(k27, base, mend.witness) === 5 &&
      App.courtCanAsk(k27, base, mend) === false &&
      App.courtCanAsk(k27, base, question) === true,
      mend ? `v1 askable at five: ${App.courtCanAsk(k27, base, mend)}` : "no vouch");
    check(slug, "k27: the question brings the witness down and the mending puts it back",
      App.courtTrust(k27, asked, "k27w1") === 4 &&
      App.courtCanAsk(k27, asked, mend) === true &&
      App.courtTrust(k27, mended, "k27w1") === 5,
      `after press ${App.courtTrust(k27, asked, "k27w1")}, after vouch ` +
      `${App.courtTrust(k27, mended, "k27w1")}`);
    check(slug, "k27: either half of the ordered pair alone loses the case",
      !solvable(cloneRemove(k27, "presses", "k27p1")) &&
      !solvable(cloneRemove(k27, "vouches", "k27v1")),
      "p1 and v1 both necessary");
  } else {
    check(slug, "k27: the case exists for its structural proof", false, "missing");
  }

  /* --- k28: the exact clock --------------------------------------------- */

  const k28 = caseById("k28");
  if (k28) {
    const best = App.courtBestLine(k28);
    const report = App.courtSolvable(k28);
    const probes = ["k28p1", "k28p2", "k28p3", "k28v1", "k28v2", "k28v3"];

    check(slug, "k28: the winning line and the whole docket spend the clock exactly",
      !!best && best.actions === k28.time && report.needed === k28.time,
      best ? `best ${best.actions}, proof ${report.needed}, clock ${k28.time}` : "no line");
    check(slug, "k28: no sound line is cheaper, and one action less proves unsolvable",
      !!best && best.cheapestSound === k28.time &&
      !solvable(Object.assign(clone(k28), { time: k28.time - 1 })),
      best ? `cheapest ${best.cheapestSound} vs ${k28.time}` : "no line");
    check(slug, "k28: every question and every mending is load-bearing",
      probes.every((id) => {
        const probe = probeOf(k28, id);
        return !!probe && !solvable(
          cloneRemove(k28, probe.exhibit ? "vouches" : "presses", id));
      }),
      probes.join(","));
  } else {
    check(slug, "k28: the case exists for its structural proof", false, "missing");
  }

  /* --- k29: the mending that rescues a broken press --------------------- */

  const k29 = caseById("k29");
  if (k29) {
    const claim = claimOf(k29, "k29c1");
    const question = byId(k29.presses, "k29p1");
    const mend = byId(k29.vouches, "k29v1");
    const broken = played(k29, claim, ["k29p1"], []);
    const whole = played(k29, claim, ["k29p1"], ["k29v1"]);
    const cheap = cloneRemove(k29, "vouches", "k29v1");
    byId(cheap.presses, "k29p1").cost = 1;
    const original = App.courtBestLine(k29);
    const cheapBest = App.courtBestLine(cheap);

    check(slug, "k29: the two-action press leaves its witness under the bar",
      !!question && question.cost === 2 && k29.bar.trust === 4 &&
      App.courtTrust(k29, broken, question.witness) === 3 &&
      App.courtTrust(k29, whole, question.witness) === 4,
      question ? `broken ${App.courtTrust(k29, broken, question.witness)}, ` +
        `mended ${App.courtTrust(k29, whole, question.witness)}` : "no press");
    check(slug, "k29: every press and every mending on the true charge is necessary",
      ["k29p1", "k29p2", "k29p3", "k29v1", "k29v2", "k29v3"].every((id) => {
        const probe = probeOf(k29, id);
        return !!probe && !solvable(
          cloneRemove(k29, probe.exhibit ? "vouches" : "presses", id));
      }),
      "p1 p2 p3 v1 v2 v3 each necessary");
    check(slug, "k29: make the press cheap and the mending can be dropped",
      !!mend && !!original && !!cheapBest && solvable(cheap) &&
      cheapBest.actions < original.actions &&
      cheapBest.vouches.indexOf("k29v1") === -1,
      original ? `whole ${original.actions}, cheap ${cheapBest ? cheapBest.actions : "?"}`
        : "no line");
  } else {
    check(slug, "k29: the case exists for its structural proof", false, "missing");
  }

  /* --- k30: the exhibit that waits on a witness ------------------------- */

  const k30 = caseById("k30");
  if (k30) {
    const claim = claimOf(k30, "k30c1");
    const question = byId(k30.presses, "k30p1");
    const base = played(k30, claim, [], []);
    const heard = played(k30, claim, [], []);
    heard.statements.k30s12 = 1;
    const anchored = clone(k30);
    byId(anchored.presses, "k30p1").with = "k30e1";
    const original = App.courtBestLine(k30);
    const anchoredBest = App.courtBestLine(anchored);
    const noMirror = clone(k30);
    byId(noMirror.claims, "k30c1").exhibits =
      byId(noMirror.claims, "k30c1").exhibits.filter((id) => id !== "k30e1");

    check(slug, "k30: the mirror's only question is anchored on the mole's third word",
      !!claim && !!question && question.with === "k30s12" &&
      (claim.exhibits || []).indexOf("k30e1") !== -1 &&
      (claim.statements || []).indexOf("k30s12") === -1,
      question ? `${question.id} with ${question.with}` : "no press");
    check(slug, "k30: until that word is heard the question cannot be asked",
      !!question && App.courtCanAsk(k30, base, question) === false &&
      App.courtCanAsk(k30, heard, question) === true,
      `before ${App.courtCanAsk(k30, base, question)}, ` +
      `after ${App.courtCanAsk(k30, heard, question)}`);
    check(slug, "k30: put the mirror itself in the anchor and the line loses three words",
      !!original && !!anchoredBest && solvable(anchored) &&
      anchoredBest.strength === original.strength &&
      anchoredBest.actions < original.actions,
      original ? `witness ${original.actions}, mirror ${anchoredBest ? anchoredBest.actions : "?"}`
        : "no line");
    check(slug, "k30: without the mirror or its question the case does not close",
      !solvable(noMirror) && !solvable(cloneRemove(k30, "presses", "k30p1")),
      "e1 and p1 both necessary");
  } else {
    check(slug, "k30: the case exists for its structural proof", false, "missing");
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

  check(slug, "the six summit labels resolve in both languages",
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
  const saysThirty = /close one of thirty cases/.test(source) &&
    /在三十件案子里/.test(source) &&
    !/close one of twenty-four cases/.test(source) && !/在二十四件案子里/.test(source);

  check(slug, "the guide gives the live ladder length, not a shipped one",
    !!guide && saysThirty && cases.length >= 30,
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
  check(slug, "the unlock chain walks all thirty cases in order",
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
