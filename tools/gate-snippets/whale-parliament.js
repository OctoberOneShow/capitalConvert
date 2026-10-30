"use strict";

/* game-whale-parliament: the deep tier shortens the calendar, and the hall's
 * own resolver sits witness on every gavel.
 *
 * The whip budget, goal ownership, bloc wishes, the missing ledger tools and
 * the seat count were all spent by w20, so the tier's lever is the clock:
 * rungs 21-24 sit five rounds, then four, with the treaty quota standing.
 * That lever is structural - every shipped hall leaves the rounds field off
 * and keeps the six-round calendar - and the gate holds the tier to the
 * engine's own currency: each rung's authored lines are replayed through
 * App.parliamentRound to a treaty inside its own short session, the star
 * bands are those measured scores and no band is invented, a bench of seeded
 * hands makes the top band reachable but not free, a naive hand cannot
 * three-star the tier, and the same halls on the shipped six-round calendar
 * bench strictly easier, which is what makes the deadline load-bearing.
 *
 * The summit w25-w30 sits that calendar at its floor: three rounds, and the
 * quota stands at three, so one lost gavel is a lost treaty. The same
 * machinery proves it: authored lines replay to treaties inside their own
 * three-round sessions at their measured bands, 720 seeded hands a rung keep
 * the top band reachable but not free and out of every losing hand, striking
 * the rung's pivotal card ends the authored line lost, and relaxing the quota
 * to two lets the same streams carry treaties on almost every deal - which is
 * what makes the absolute quota load-bearing. */

module.exports = function gate(ctx) {
  const { App, check } = ctx;
  const levels = App.parliamentLevels || [];
  const deepIds = ["w21", "w22", "w23", "w24"];
  const summitIds = ["w25", "w26", "w27", "w28", "w29", "w30"];

  check("game-whale-parliament", "the ladder holds thirty parliaments",
    levels.length === 30, String(levels.length));
  check("game-whale-parliament", "every parliament id is distinct",
    new Set(levels.map((level) => level.id)).size === levels.length,
    levels.map((level) => level.id).join(","));
  const missing = deepIds.filter((id) => !levels.some((level) => level.id === id));
  check("game-whale-parliament", "the deep tier w21-w24 is present",
    missing.length === 0, missing.join(","));
  const missingSummit = summitIds.filter((id) => !levels.some((level) => level.id === id));
  check("game-whale-parliament", "the summit tier w25-w30 is present",
    missingSummit.length === 0, missingSummit.join(","));
  check("game-whale-parliament", "the deep tier holds rungs 21-24 and the summit is the ladder's back straight",
    deepIds.every((id, i) => levels[20 + i] && levels[20 + i].id === id) &&
      summitIds.every((id, i) => levels[levels.length - 6 + i] && levels[levels.length - 6 + i].id === id),
    "last six: " + levels.slice(-6).map((level) => level.id).join(","));

  const byId = {};
  levels.forEach((level) => { byId[level.id] = level; });
  const deep = deepIds.map((id) => byId[id]);
  const summit = summitIds.map((id) => byId[id]);
  const shallow = levels.slice(0, 20);

  /* The lesson is structural: no shipped rung carries a rounds field, so all
   * twenty open on the shipped six-round calendar, while the deep tier's
   * sessions run five rounds then four and never climb back, and the summit
   * sits the calendar at its floor - three rounds, the quota absolute, no
   * mercy, and a whip that halves at the halfway mark. */
  const shallowSix = shallow.every((level) =>
    !level.rounds && App.parliamentStart(level).rounds === 6);
  const deepShort = deep.every((level) => level.rounds === 5 || level.rounds === 4) &&
    deep.every((level) => App.parliamentStart(level).rounds === level.rounds);
  const summitFloor = summit.every((level) =>
    level.rounds === 3 && level.need === 3 && level.mercy === false) &&
    summit.every((level) => App.parliamentStart(level).rounds === 3);
  check("game-whale-parliament",
    "rungs 1-20 sit the shipped six-round calendar, the deep tier sits five then four, and the summit sits three with the quota absolute",
    shallowSix && deepShort && summitFloor &&
      deep.map((level) => level.rounds).join(",") === "5,5,4,4" &&
      summit.map((level) => level.maxCards).join(",") === "2,2,2,1,1,1",
    "deep rounds " + deep.map((level) => level.rounds).join(",") +
      ", summit cards " + summit.map((level) => level.maxCards).join(","));

  /* Every deep rung proved through the hall's own resolver: the authored high
   * line replays to a treaty inside the rung's own short session, the printed
   * bands are that line's measured scores, the ledger binds the
   * configuration, and the bands descend for the low scorer. */
  const proofProblems = [];
  deep.forEach((level) => {
    const replay = App.parliamentReplay(level, (level.lines || {}).high || []);
    if (replay.status !== "won") {
      proofProblems.push(level.id + " high line ends " + replay.status);
      return;
    }
    if (replay.state.round !== level.rounds || replay.state.rounds !== level.rounds) {
      proofProblems.push(level.id + " treaty landed on round " + replay.state.round +
        " of a " + level.rounds + "-round hall");
    }
    if (replay.adopted < level.need) {
      proofProblems.push(level.id + " adopted " + replay.adopted + " of " + level.need);
    }
    if (replay.score !== level.starScore[0]) {
      proofProblems.push(level.id + " top band " + level.starScore[0] +
        " != replayed line " + replay.score);
    }
    if (!(level.starScore[0] > level.starScore[1] && level.starScore[1] > level.starScore[2])) {
      proofProblems.push(level.id + " bands do not fall " + level.starScore.join("/"));
    }
    if (replay.minTrust <= 0) {
      proofProblems.push(level.id + " winning line walks a pod out");
    }
  });
  const proofs = App.parliamentProofs || [];
  deep.forEach((level) => {
    const row = proofs.filter((proof) => proof.id === level.id)[0];
    if (!row || !row.solved || !row.binds) {
      proofProblems.push(level.id + " load-time proof " +
        (row ? "solved " + row.solved + " binds " + row.binds : "missing"));
    }
  });
  check("game-whale-parliament",
    "every deep rung's authored line wins its own short session at its own measured band",
    proofProblems.length === 0, proofProblems.slice(0, 4).join(" | "));

  /* The bench: seeded hands through the same resolver the panel drives. The
   * engine is deterministic, so the stream is pinned, not probabilistic - the
   * same LCG picks among the legal card subsets each round, 240 hands a rung,
   * and the same stream reruns each hall with its two rounds handed back. */
  const TRIALS = 240;
  const subsetsOf = (hand, max) => {
    const out = [[]];
    hand.forEach((card) => {
      const len = out.length;
      for (let i = 0; i < len; i += 1) {
        if (out[i].length < max) out.push(out[i].concat(card));
      }
    });
    return out;
  };
  const lcg = (seed) => {
    let s = (seed >>> 0) || 1;
    return () => {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s / 4294967296;
    };
  };
  const bench = (level, seedBase, trials) => {
    const start = App.parliamentStart(level);
    const subs = subsetsOf(start.hand.map((card) => card.id), level.maxCards);
    let wins = 0;
    let top = 0;
    for (let trial = 0; trial < trials; trial += 1) {
      const rand = lcg(seedBase + trial * 7919);
      let state = start;
      for (let round = 0; round < level.rounds && state.status === "vote"; round += 1) {
        state = App.parliamentRound(state, subs[Math.floor(rand() * subs.length)]);
        if (state.status !== "vote") break;
      }
      if (state.status === "won") wins += 1;
      if (state.score >= level.starScore[0]) top += 1;
    }
    return { wins, top };
  };

  const benchProblems = [];
  deep.forEach((level) => {
    const run = bench(level, 91000, TRIALS);
    const six = bench(Object.assign({}, level, { rounds: 6 }), 91000, TRIALS);
    if (run.wins < 2) {
      benchProblems.push(level.id + " no seeded hand carries the treaty (" + run.wins + ")");
    }
    if (run.wins > TRIALS / 10) {
      benchProblems.push(level.id + " seeded hands win too easily (" + run.wins + "/" + TRIALS + ")");
    }
    if (run.top > run.wins || run.top > TRIALS / 17) {
      benchProblems.push(level.id + " top band reached on " + run.top + " of " + run.wins + " wins");
    }
    /* The deadline is load-bearing: hand the same hall its two rounds back
     * and the bench carries the treaty far more often. */
    if (six.wins <= run.wins) {
      benchProblems.push(level.id + " six-round bench wins " + six.wins +
        " against the short session's " + run.wins);
    }
  });
  check("game-whale-parliament",
    "every deep top band is reachable but not free, and the six-round counterfactual benches easier",
    benchProblems.length === 0, benchProblems.slice(0, 4).join(" | "));

  /* A naive hand - one greedy amendment a round, chasing this round's yeas -
   * cannot three-star the tier, and a hand that never spends the whip never
   * carries a deep treaty at all. */
  const naive = (level) => {
    let state = App.parliamentStart(level);
    for (let round = 0; round < level.rounds && state.status === "vote"; round += 1) {
      let bestPick = [];
      let bestRank = -1;
      const alive = state.hand.filter((card) => !card.spent).map((card) => card.id);
      subsetsOf(alive, state.maxCards).forEach((sub) => {
        const next = App.parliamentRound(state, sub.slice());
        const rank = (next.last && next.last.adopted ? 10 : 0) + (next.last ? next.last.yea : -1);
        if (rank > bestRank) {
          bestRank = rank;
          bestPick = sub.slice();
        }
      });
      state = App.parliamentRound(state, bestPick);
      if (state.status !== "vote") break;
    }
    return { won: state.status === "won", stars: state.status === "won" && state.score >= level.starScore[0] };
  };
  const drift = (level) => {
    let state = App.parliamentStart(level);
    for (let round = 0; round < level.rounds && state.status === "vote"; round += 1) {
      state = App.parliamentRound(state, []);
      if (state.status !== "vote") break;
    }
    return state.status === "won";
  };
  let naiveWins = 0;
  let naiveStars = 0;
  let driftWins = 0;
  deep.forEach((level) => {
    const hand = naive(level);
    if (hand.won) naiveWins += 1;
    if (hand.stars) naiveStars += 1;
    if (drift(level)) driftWins += 1;
  });
  check("game-whale-parliament",
    "a naive hand cannot three-star the tier and a drifting hand carries nothing",
    naiveWins <= 2 && naiveStars <= 2 && driftWins === 0,
    "naive wins " + naiveWins + ", three-stars " + naiveStars + ", drift wins " + driftWins);

  /* Every summit rung proved through the same resolver: the authored high
   * line replays to a treaty that fills the rung's own three-round quota, the
   * printed bands are that line's measured scores, the ledger binds the
   * configuration, and the bands descend to the drifting low line's floor. */
  const summitProofProblems = [];
  summit.forEach((level) => {
    const replay = App.parliamentReplay(level, (level.lines || {}).high || []);
    if (replay.status !== "won") {
      summitProofProblems.push(level.id + " high line ends " + replay.status);
      return;
    }
    if (replay.state.round !== 3 || replay.state.rounds !== 3) {
      summitProofProblems.push(level.id + " treaty landed on round " + replay.state.round +
        " of a " + level.rounds + "-round hall");
    }
    if (replay.adopted !== level.need) {
      summitProofProblems.push(level.id + " adopted " + replay.adopted + " of " + level.need);
    }
    if (replay.score !== level.starScore[0]) {
      summitProofProblems.push(level.id + " top band " + level.starScore[0] +
        " != replayed line " + replay.score);
    }
    if (!(level.starScore[0] > level.starScore[1] && level.starScore[1] > level.starScore[2])) {
      summitProofProblems.push(level.id + " bands do not fall " + level.starScore.join("/"));
    }
    if (replay.minTrust <= 0) {
      summitProofProblems.push(level.id + " winning line walks a pod out");
    }
  });
  summit.forEach((level) => {
    const row = proofs.filter((proof) => proof.id === level.id)[0];
    if (!row || !row.solved || !row.binds) {
      summitProofProblems.push(level.id + " load-time proof " +
        (row ? "solved " + row.solved + " binds " + row.binds : "missing"));
    }
  });
  check("game-whale-parliament",
    "every summit rung's authored line fills its own three-round quota at its own measured band",
    summitProofProblems.length === 0, summitProofProblems.slice(0, 4).join(" | "));

  /* The summit bench: the deep tier's stream at three times the trials, since
   * a three-round hall leaves fewer legal subsets to hit. Reachable but not
   * free: seeded hands must carry the treaty sometimes and the top band must
   * never fall to a hand that lost its session. */
  const SUMMIT_TRIALS = 720;
  const summitBenchProblems = [];
  summit.forEach((level) => {
    const run = bench(level, 73000, SUMMIT_TRIALS);
    if (run.wins < 2) {
      summitBenchProblems.push(level.id + " no seeded hand carries the treaty (" + run.wins + ")");
    }
    if (run.wins > SUMMIT_TRIALS / 10) {
      summitBenchProblems.push(level.id + " seeded hands win too easily (" + run.wins + "/" + SUMMIT_TRIALS + ")");
    }
    if (run.top > run.wins || run.top > SUMMIT_TRIALS / 17) {
      summitBenchProblems.push(level.id + " top band reached on " + run.top + " of " + run.wins + " wins");
    }
  });
  check("game-whale-parliament",
    "every summit top band is reachable but not free and never falls to a losing hand",
    summitBenchProblems.length === 0, summitBenchProblems.slice(0, 4).join(" | "));

  /* The absolute quota is load-bearing: re-bench the same halls at a quota of
   * two and the same streams carry treaties on almost every deal, so the
   * floor calendar's "one lost gavel is a lost treaty" is what prices the
   * summit. */
  const quotaRuns = [];
  const quotaProblems = [];
  summit.forEach((level) => {
    const run = bench(level, 73000, SUMMIT_TRIALS);
    const relaxed = bench(Object.assign({}, level, { need: 2 }), 73000, SUMMIT_TRIALS);
    quotaRuns.push(relaxed.wins);
    if (relaxed.wins <= run.wins) {
      quotaProblems.push(level.id + " quota-of-two bench wins " + relaxed.wins +
        " against the absolute quota's " + run.wins);
    }
  });
  check("game-whale-parliament",
    "the quota is load-bearing: at a quota of two the same streams bench " +
      quotaRuns.join("/") + " treaties",
    quotaProblems.length === 0, quotaProblems.slice(0, 4).join(" | "));

  /* The whip's tools are load-bearing: strike the rung's pivotal card from
   * the hand - the deep grant on w25/w27, the kelp closure on w26, the ice
   * closure on w28-w30 - and the same authored line cannot carry the treaty
   * on any gavel, so the summit's bands collapse with the session. */
  const cutCards = { w25: 1, w26: 1, w27: 1, w28: 3, w29: 1, w30: 1 };
  const cutProblems = [];
  summit.forEach((level) => {
    const cut = Object.assign({}, level, {
      hand: level.hand.filter((card) => card.id !== cutCards[level.id]),
    });
    const replay = App.parliamentReplay(cut, level.lines.high);
    if (replay.status === "won" || replay.score >= level.starScore[0]) {
      cutProblems.push(level.id + " line without card " + cutCards[level.id] +
        " still ends " + replay.status + "/" + replay.score);
    }
  });
  check("game-whale-parliament",
    "striking the rung's pivotal card leaves the summit unreachable on its own authored line",
    cutProblems.length === 0, cutProblems.slice(0, 4).join(" | "));

  /* A hand that never spends the whip never carries a summit treaty: with the
   * quota absolute, one raw-failing deal in the shuffle is enough to end it. */
  let summitDriftWins = 0;
  summit.forEach((level) => {
    if (drift(level)) summitDriftWins += 1;
  });
  check("game-whale-parliament", "a drifting hand carries nothing on the summit",
    summitDriftWins === 0, "drift wins " + summitDriftWins);

  /* The tier's names resolve in both languages. */
  const copyKeys = [];
  deep.forEach((level) => {
    copyKeys.push(level.labelKey, level.twistKey);
  });
  const copyProblems = copyKeys.filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-whale-parliament", "the four deep parliament names and twists resolve in both languages",
    copyProblems.length === 0, copyProblems.join(","));

  const summitKeys = [];
  summit.forEach((level) => {
    summitKeys.push(level.labelKey, level.twistKey);
  });
  const summitCopyProblems = summitKeys.filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-whale-parliament", "the six summit parliament names and twists resolve in both languages",
    summitCopyProblems.length === 0, summitCopyProblems.join(","));

  /* The unlock chain is derived, never stored: clearing each parliament in
   * order hands the player exactly the next one, all thirty times. */
  const chain = App.createCampaign({
    key: "whale-parliament-gate-chain",
    levels: levels.map((level) => ({ id: level.id, labelKey: level.labelKey })),
  });
  let walked = 0;
  let chained = true;
  levels.forEach((level, index) => {
    const outcome = chain.record(level.id, { stars: 3, best: 999, better: "high" });
    if (outcome.firstClear) walked += 1;
    const expected = index + 1 < levels.length ? levels[index + 1].id : null;
    if (outcome.unlockedNext !== expected) chained = false;
  });
  check("game-whale-parliament", "the unlock chain walks all thirty parliaments in order",
    walked === 30 && chained && chain.clearedCount() === 30, walked + " first clears");
};
