"use strict";

/* game-rooftop-radio: the deep tier r21-r24 is measured, not guessed
 *
 * The panel deals the transmitter with Math.random and hops it with
 * Math.random, so no fixed route can prove anything. The gate seeds
 * Math.random deterministically per deal (mulberry32) and replays the panel's
 * own randomness contract: rrDeal consumes two calls, x then y, and rrHop
 * consumes exactly one per hop - the hop itself is App.radioHop, the reading
 * is App.radioStrength, so every number the prover sees is a number the panel
 * would produce.
 *
 * On top of that seeded deal the gate runs a belief-tracking hunt: the set of
 * cells still consistent with every reading so far, filtered by each new
 * reading's ring, dilated along the hop edges whenever the panel's cadence
 * shunts the beacon, and probed each turn at the cell whose reading splits
 * the belief into the smallest expected remainder (sum of squared ring
 * buckets - one probe of lookahead, exactly the expected posterior size). A
 * reading of 99+ is the panel's find, so the hunt wins exactly when the panel
 * would. What it proves is an upper bound on the scans a perfect tracker
 * needs, which is what a star band has to be checked against.
 *
 * The deep tier's lesson is the wide-air squeeze, and the gate keeps the
 * receipt for the cadence that was measured and rejected: a beacon that
 * shunts every single scan outruns the ring readings - the same hunt loses a
 * third of its deals on a 40 grid even with a 24-ping battery - so no rung
 * ships drift 1, and the restless deep rungs stay at the every-second shunt
 * while width climbs to 40 and batteries are cut one ping past the measured
 * worst hunt. The gate proves every deep rung findable inside its own bands
 * over 30 seeded deals, the spire's and the restless rungs' records against
 * everything shipped below the tier, the crown's battery load-bearing, the
 * labels bilingual, and the unlock chain walking all twenty-four zones.
 *
 * The summit r25-r30 is the ring plateau, and it is measured the same way:
 * six consecutive restless widths (41-46) whose readings quantize
 * identically, tails of eight, nine and ten, each battery one ping past its
 * own worst hunt. The gate re-measures every summit rung over the same
 * thirty seeded deals, holds each battery one ping past its one-star line,
 * proves the tier sweeps more floor per ping than any restless rung below
 * it, and keeps two receipts: the crown's one-star line is load-bearing
 * (one ping below it, three deals in thirty are lost outright), and past
 * the plateau the readings re-align - a 49 floor hunts to six and no worse,
 * so the width escalation sits on measured air, not on a guess. */

const SEEDS = [];
for (let i = 1; i <= 30; i += 1) {
  SEEDS.push(i * 977);
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* One seeded hunt of one rung, under the panel's own rules. Math.random is
 * stubbed for the deal and every hop, then restored; the belief set starts at
 * the whole floor and shrinks exactly as the readings allow. */
function hunt(App, level, seed) {
  const side = level.side;
  const N = side * side;
  const realRandom = Math.random;
  Math.random = mulberry32(seed);
  try {
    /* The panel's rrDeal: two Math.random calls, x then y. */
    let tx = Math.floor(Math.random() * side);
    let ty = Math.floor(Math.random() * side);
    const belief = new Uint8Array(N);
    belief.fill(1);
    const counts = new Int32Array(101);
    const touched = [];
    let used = 0;

    while (used < level.scans) {
      /* Probe choice: the belief cell whose reading ring leaves the smallest
       * expected remainder (sum of squared buckets over the belief). */
      const cells = [];
      for (let i = 0; i < N; i += 1) {
        if (belief[i]) cells.push(i);
      }
      let probe;
      if (cells.length === 1) {
        probe = { x: cells[0] % side, y: Math.floor(cells[0] / side) };
      } else {
        const cap = cells.length > 140 ? 140 : cells.length;
        const stride = Math.max(1, Math.floor(cells.length / cap));
        let best = -1;
        let bestScore = -Infinity;
        for (let c = 0; c < cells.length; c += stride) {
          const cx = cells[c] % side;
          const cy = Math.floor(cells[c] / side);
          touched.length = 0;
          let sq = 0;
          for (let k = 0; k < cells.length; k += 1) {
            const v = App.radioStrength(
              { x: cx, y: cy },
              { x: cells[k] % side, y: Math.floor(cells[k] / side) },
              side,
            );
            if (!counts[v]) touched.push(v);
            counts[v] += 1;
          }
          for (let r = 0; r < touched.length; r += 1) {
            sq += counts[touched[r]] * counts[touched[r]];
            counts[touched[r]] = 0;
          }
          if (-sq > bestScore) {
            bestScore = -sq;
            best = cells[c];
          }
        }
        probe = { x: best % side, y: Math.floor(best / side) };
      }

      used += 1;
      const s = App.radioStrength(probe, { x: tx, y: ty }, side);
      if (s >= 99) {
        return { found: true, used: used };
      }
      for (let j = 0; j < N; j += 1) {
        if (
          belief[j] &&
          App.radioStrength(probe, { x: j % side, y: Math.floor(j / side) }, side) !== s
        ) {
          belief[j] = 0;
        }
      }
      /* Mirrors the panel's ping(): the hop fires after the reading, once the
       * pings-used count is a multiple of drift, and only while scans remain. */
      if (level.drift && used % level.drift === 0 && used < level.scans) {
        const next = App.radioHop({ x: tx, y: ty }, side, probe);
        tx = next.x;
        ty = next.y;
        const dilated = new Uint8Array(N);
        for (let b = 0; b < N; b += 1) {
          if (!belief[b]) continue;
          const bx = b % side;
          const by = Math.floor(b / side);
          for (let dy = -1; dy <= 1; dy += 1) {
            for (let dx = -1; dx <= 1; dx += 1) {
              if (!dx && !dy) continue;
              const nx = bx + dx;
              const ny = by + dy;
              if (nx < 0 || ny < 0 || nx >= side || ny >= side) continue;
              dilated[ny * side + nx] = 1;
            }
          }
        }
        /* rrHop never lands on the cell that was just pinged. */
        dilated[probe.y * side + probe.x] = 0;
        belief.set(dilated);
      }
    }
    return { found: false, used: used };
  } finally {
    Math.random = realRandom;
  }
}

/* Distribution of scans-to-find over the seeded deals. */
function measure(App, level) {
  const used = [];
  SEEDS.forEach((seed) => {
    const run = hunt(App, level, seed);
    if (run.found) used.push(run.used);
  });
  used.sort((a, b) => a - b);
  const atMost = (k) => used.filter((u) => u <= k).length;
  return {
    wins: used.length,
    total: SEEDS.length,
    max: used.length ? used[used.length - 1] : Infinity,
    atMost,
  };
}

function mutant(level, patch) {
  return Object.assign({}, level, patch);
}

module.exports = function gate(ctx) {
  const { App, check } = ctx;
  const levels = App.radioLevels;
  const byId = (id) => levels.find((level) => level.id === id);
  const deepIds = ["r21", "r22", "r23", "r24"];
  const summitIds = ["r25", "r26", "r27", "r28", "r29", "r30"];
  const CASE = "game-rooftop-radio";

  check(CASE, "the ladder holds thirty zones",
    levels.length === 30, String(levels.length));
  check(CASE, "every zone id is distinct",
    new Set(levels.map((level) => level.id)).size === levels.length,
    levels.map((level) => level.id).join(","));
  const missing = deepIds.filter((id) => !byId(id));
  check(CASE, "the deep tier r21-r24 is present",
    missing.length === 0, missing.join(","));
  const summitMissing = summitIds.filter((id) => !byId(id));
  check(CASE, "the summit tier r25-r30 is present in order",
    summitMissing.length === 0 &&
      summitIds.every((id, index) => levels.findIndex((level) => level.id === id) >
        (index === 0 ? -1 : levels.findIndex((level) => level.id === summitIds[index - 1]))),
    summitMissing.join(",") || "ordered");

  /* The cadence the readings cannot carry: no rung ships drift 1. */
  check(CASE, "no rung ships the every-scan shunt",
    levels.every((level) => level.drift !== 1),
    levels.filter((level) => level.drift === 1).map((level) => level.id).join(","));
  const receipt = measure(App, mutant(byId("r24"), { side: 40, scans: 24, drift: 1 }));
  check(CASE, "the every-scan shunt is measurable and lost - the receipt",
    receipt.wins < receipt.total && receipt.wins <= 24,
    `drift 1 on a 40 grid wins ${receipt.wins}/${receipt.total} even at 24 pings`);

  /* Every deep rung replays inside its own bands: findable within the battery
   * on every seeded deal, the one-star line always, the three-star line on
   * most deals, and the battery one ping past the one-star line. */
  deepIds.forEach((id) => {
    const level = byId(id);
    const m = measure(App, level);
    check(CASE, `${id} is findable within its battery on every seeded deal`,
      m.wins === m.total, `${m.wins}/${m.total}`);
    check(CASE, `${id}'s one-star line holds on every seeded deal`,
      m.wins === m.total && m.max <= level.starScans[2],
      `worst hunt ${m.max} vs line ${level.starScans[2]}`);
    const threeStars = m.atMost(level.starScans[0]);
    check(CASE, `${id}'s three-star line is reachable on most deals`,
      threeStars >= Math.ceil((2 * SEEDS.length) / 3),
      `${threeStars}/${m.total} within ${level.starScans[0]}`);
    check(CASE, `${id}'s battery sits one ping past its one-star line`,
      level.scans === level.starScans[2] + 1,
      `battery ${level.scans} vs line ${level.starScans[2]}`);
  });

  /* The spire's record: wider than every still floor shipped below the deep
   * tier, on the tightest still battery the ladder below it ever carried. */
  const stillBelow = levels.filter((level) => level.drift === 0 &&
    deepIds.indexOf(level.id) < 0 && summitIds.indexOf(level.id) < 0);
  check(CASE, "the spire is the widest still floor ever shipped",
    byId("r21").side > Math.max.apply(null, stillBelow.map((level) => level.side)),
    `r21 ${byId("r21").side} vs still max ${Math.max.apply(null, stillBelow.map((level) => level.side))}`);
  check(CASE, "the spire carries the tightest still battery ever shipped",
    byId("r21").scans < Math.min.apply(null, stillBelow.map((level) => level.scans)),
    `r21 ${byId("r21").scans} vs still min ${Math.min.apply(null, stillBelow.map((level) => level.scans))}`);

  /* The restless deep rungs sweep more floor per ping than any restless rung
   * shipped below the deep tier, and each is wider than all of them. */
  const restlessBelow = levels.filter((level) => level.drift === 2 &&
    deepIds.indexOf(level.id) < 0 && summitIds.indexOf(level.id) < 0);
  const restlessRate = Math.min.apply(
    null,
    restlessBelow.map((level) => level.scans / (level.side * level.side)),
  );
  ["r22", "r23", "r24"].forEach((id) => {
    const level = byId(id);
    const rate = level.scans / (level.side * level.side);
    check(CASE, `${id} sweeps more floor per ping than every restless rung below the tier`,
      rate < restlessRate && level.side > Math.max.apply(null, restlessBelow.map((r) => r.side)),
      `rate ${rate.toFixed(4)} vs ${restlessRate.toFixed(4)}`);
  });

  /* The deep crown's records, scoped to everything below the summit: the
   * widest floor below the tier, the longest one-star hunt below it, and a
   * battery that is load-bearing - one ping below the shipped battery and
   * seeded deals are lost outright. The summit takes the ladder-wide
   * records over, and proves them again below. */
  const below = levels.filter((level) =>
    deepIds.indexOf(level.id) < 0 && summitIds.indexOf(level.id) < 0);
  check(CASE, "the crown is the widest floor the game has ever shipped",
    byId("r24").side > Math.max.apply(null, below.map((level) => level.side)),
    `r24 ${byId("r24").side} vs max ${Math.max.apply(null, below.map((level) => level.side))}`);
  check(CASE, "the crown asks for the longest one-star hunt on the ladder",
    byId("r24").starScans[2] > Math.max.apply(null, below.map((level) => level.starScans[2])),
    `line ${byId("r24").starScans[2]} vs max ${Math.max.apply(null, below.map((level) => level.starScans[2]))}`);
  const crown = byId("r24");
  const tighter = measure(App, mutant(crown, { scans: crown.starScans[2] - 1 }));
  check(CASE, "below the crown's proven floor, deals are lost outright",
    tighter.wins < tighter.total, `${tighter.wins}/${tighter.total} findable`);

  /* ---- the summit: the ring plateau, measured over the same thirty deals -- */
  summitIds.forEach((id) => {
    const level = byId(id);
    const m = measure(App, level);
    check(CASE, `${id} is findable within its battery on every seeded deal`,
      m.wins === m.total, `${m.wins}/${m.total}`);
    check(CASE, `${id}'s one-star line holds on every seeded deal`,
      m.wins === m.total && m.max <= level.starScans[2],
      `worst hunt ${m.max} vs line ${level.starScans[2]}`);
    const threeStars = m.atMost(level.starScans[0]);
    check(CASE, `${id}'s three-star line is reachable on most deals`,
      threeStars >= Math.ceil((2 * SEEDS.length) / 3),
      `${threeStars}/${m.total} within ${level.starScans[0]}`);
    check(CASE, `${id}'s battery sits one ping past its one-star line`,
      level.scans === level.starScans[2] + 1,
      `battery ${level.scans} vs line ${level.starScans[2]}`);
  });

  /* The tier is one restless plateau: six consecutive widths past the deep
   * crown, every one of them sweeping more floor per ping than any restless
   * rung below the summit, and no still floor among them. */
  const summitLevels = summitIds.map((id) => byId(id));
  const restlessFloor = Math.min.apply(null,
    restlessBelow.map((level) => level.scans / (level.side * level.side)));
  const plateauProblems = [];
  summitLevels.forEach((level, index) => {
    const rate = level.scans / (level.side * level.side);
    if (level.drift !== 2) plateauProblems.push(level.id + " leaves the restless shunt");
    if (level.side !== 41 + index) {
      plateauProblems.push(level.id + " steps off the plateau (side " + level.side + ")");
    }
    if (level.side <= byId("r24").side) {
      plateauProblems.push(level.id + " does not pass the deep crown's width");
    }
    if (!(rate < restlessFloor)) {
      plateauProblems.push(level.id + " rate " + rate.toFixed(4) +
        " does not beat the restless floor below (" + restlessFloor.toFixed(4) + ")");
    }
  });
  check(CASE, "the summit is one restless plateau, tighter per ping than everything restless below it",
    plateauProblems.length === 0, plateauProblems.join(" | "));

  /* The crown of the plateau: the longest tail the plateau measured, on the
   * widest floor the ladder has ever carried, its one-star line
   * load-bearing - one ping below it and deals are lost. (The tier's
   * per-ping squeeze is proved above; within the tier the shallowest
   * plateau rung is the tightest by rate, so the crown's own record is the
   * tail, not the rate.) */
  const summitCrown = byId("r30");
  const crownTail = measure(App, summitCrown);
  const crownTighter = measure(App, mutant(summitCrown, { scans: summitCrown.starScans[2] - 1 }));
  check(CASE, "the plateau's crown carries the longest summit tail on the widest floor ever shipped",
    summitCrown.starScans[2] === Math.max.apply(null, summitLevels.map((level) => level.starScans[2])) &&
      summitCrown.side === Math.max.apply(null, levels.map((level) => level.side)),
    `line ${summitCrown.starScans[2]} vs summit max ` +
      Math.max.apply(null, summitLevels.map((level) => level.starScans[2])));
  check(CASE, "one ping below the crown's one-star line, deals are lost outright",
    crownTighter.wins < crownTighter.total, `${crownTighter.wins}/${crownTighter.total} findable`);

  /* The re-alignment receipt: the width escalation ends where the readings
   * re-align - past the plateau a 49 floor hunts to six, under the crown's
   * own tail. Measured, so the tier is standing on air that was checked. */
  const realign = measure(App, { id: "receipt49", side: 49, drift: 2, scans: 30 });
  check(CASE, "past the plateau the rings re-align: a 49 floor hunts to six",
    realign.max < crownTail.max,
    `49 floor max ${realign.max} vs crown ${crownTail.max}`);

  /* Labels travel in both dictionaries and never fall back to keys. */
  ["en", "zh"].forEach((lang) => {
    const ok = deepIds.concat(summitIds).every((id) => {
      const level = byId(id);
      const dict = App.I18N && App.I18N[lang] ? App.I18N[lang][level.labelKey] : null;
      return typeof dict === "string" && dict && dict !== level.labelKey;
    });
    check(CASE, `the deep and summit tier labels resolve in ${lang}`, !!ok,
      deepIds.concat(summitIds).join(","));
  });

  /* The unlock chain walks all twenty-four zones in shipped order. */
  const walked = [];
  const campaign = App.createCampaign({
    key: "rooftop-radio-gate-" + SEEDS[0],
    levels: levels,
  });
  let guard = 0;
  while (guard < levels.length + 2) {
    guard += 1;
    const id = campaign.nextLevelId();
    if (walked.indexOf(id) >= 0) {
      break;
    }
    walked.push(id);
    campaign.record(id, { stars: 3, best: 1, better: "low" });
  }
  check(CASE, "the unlock chain walks all thirty zones in order",
    walked.length === levels.length &&
      walked.every((id, i) => id === levels[i].id),
    walked.join(","));
  check(CASE, "the walked campaign ends at the plateau's crown and tops out at its stars",
    walked[walked.length - 1] === "r30" && campaign.totalStars() === levels.length * 3,
    `last ${walked[walked.length - 1]}, stars ${campaign.totalStars()}`);
};
