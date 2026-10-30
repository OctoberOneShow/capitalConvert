"use strict";

/* game-blackjack: the summit is the rope above the salon, and the gate
 * proves its rules - not its stakes - are what got harder.
 *
 * Every shipped felt through b24 plays the same game: the house stands on
 * 17, ties push, naturals pay three for two, and a busted bankroll buys
 * back in at the full stack. The summit b25-b30 keeps the single deck the
 * Last Shoe dealt and tightens the rules themselves, one lever a rung:
 * the dealer draws to a soft 17 (b25), ties pay the house (b26), the
 * naturals shorten to seven for five (b27), and then the buy-back itself
 * shrinks - a busted bankroll returns with one and a half top bets,
 * three quarters, one half (b28-b30). The gate proves the lesson three
 * ways:
 *
 *  - structurally: rungs 1-24 ship none of the four dials, and each summit
 *    rung's dial set strictly contains the one before it, with the
 *    three-star line never moving from the three hands the Last Shoe
 *    printed;
 *  - through the engine: a paired bench deals one deep shuffle to all
 *    seven rulesets (the Last Shoe's own plus the six summit rulesets) so
 *    every rung replays the identical cards, and the mean hands to clear
 *    climbs rung over rung past the Last Shoe's own economy;
 *  - by cut: removing a rung's own lever from the same deals clears
 *    strictly faster, so no rung's lesson is decorative.
 *
 * The bands are the official sweep's own points: the two-star and one-star
 * lines sit at the sweep's 42% and 72% clear marks, so every rung stays
 * winnable at all while the rules take the clock, and the whole thirty-
 * table ladder replays the forge's seeded sweep the way the static check
 * judges it.
 */

module.exports = function gate(ctx) {
  const { App, check, path, root } = ctx;
  const bjTables = App.blackjackTables;
  check("game-blackjack", "the module exports its ladder for the gates",
    Array.isArray(bjTables) && bjTables.length > 0, String(bjTables && bjTables.length));

  /* ---- structure: thirty felts, the house shape intact everywhere ---- */
  check("game-blackjack", "the parlor ladder holds thirty tables",
    bjTables.length === 30, String(bjTables.length));
  check("game-blackjack", "every table id is distinct and ordered b1..b30",
    bjTables.every((table, index) => table.id === "b" + (index + 1)),
    bjTables.map((table) => table.id).join(","));
  check("game-blackjack", "every table keeps the house shape",
    bjTables.every((table) =>
      table.bets.length === 3 &&
      table.bets[0] < table.bets[1] && table.bets[1] < table.bets[2] &&
      table.bets[2] * 4 === table.start &&
      table.target === Math.round(table.start * 1.5) &&
      table.starHands[0] < table.starHands[1] &&
      table.starHands[1] < table.starHands[2] &&
      table.decks >= 1),
    "");

  const summit = bjTables.slice(24);
  const shipped = bjTables.slice(0, 24);

  /* ---- the lesson as structure: rules, not stakes ---- */
  check("game-blackjack", "rungs 1-24 ship none of the rope's dials",
    shipped.every((table) =>
      table.soft17 === undefined && table.pushLose === undefined &&
      table.pays === undefined && table.restake === undefined),
    "");
  check("game-blackjack", "the summit stays on the Last Shoe's single deck",
    summit.every((table) => table.decks === 1),
    summit.map((table) => table.decks).join(","));
  /* Every rung is strictly stricter than the one below it: the first three
   * rungs each add one rule dial to the ruleset below, the last three keep
   * b27's rule set and walk the buy-back down against the table's own top
   * bet. The three-star line never moves from the three hands the Last
   * Shoe printed. */
  check("game-blackjack", "each summit rung is strictly stricter than the rung below it",
    summit[0].soft17 === true && summit[0].pushLose === undefined &&
      summit[0].pays === undefined && summit[0].restake === undefined &&
      summit[1].soft17 === true && summit[1].pushLose === true &&
      summit[1].pays === undefined && summit[1].restake === undefined &&
      summit[2].soft17 === true && summit[2].pushLose === true &&
      summit[2].pays === 1.4 && summit[2].restake === undefined &&
      [3, 4, 5].every((index) =>
        summit[index].soft17 === true && summit[index].pushLose === true &&
        summit[index].pays === 1.4 &&
        summit[index].restake === summit[index].bets[2] * [1.5, 0.75, 0.5][index - 3]),
    "");
  check("game-blackjack", "the three-star line never moves from the Last Shoe's three hands",
    shipped[23].starHands[0] === 3 && summit.every((table) => table.starHands[0] === 3),
    summit.map((table) => table.starHands[0]).join(","));

  /* ---- the lesson through the engine: one shuffle, every ruleset ---- */
  const realRandom = Math.random;
  function makeRandom(seed) {
    let s = seed >>> 0;
    return () => {
      s = (Math.imul(s, 1103515245) + 12345) >>> 0;
      return s / 4294967296;
    };
  }
  /* A paired trial: the same deep shuffle replayed under each ruleset, no
   * reshuffle inside a trial. The bench is the house's own - bet the top
   * stake, hit to 18, take the felt's buy-back when broke - and it mirrors
   * the engine's housePlay, soft 17s and all. */
  function trial(shoe, table) {
    const pile = shoe.slice();
    const draw = () => pile.pop();
    let chips = table.start;
    let hands = 0;
    while (chips < table.target && hands < 300) {
      const player = [draw(), draw()];
      const dealer = [draw(), draw()];
      if (!App.blackjackNatural(player) && !App.blackjackNatural(dealer)) {
        while (App.blackjackCount(player).total < 18) player.push(draw());
        for (;;) {
          while (App.blackjackCount(dealer).total < 17) dealer.push(draw());
          if (!(table.soft17 && App.blackjackCount(dealer).total === 17 &&
              App.blackjackCount(dealer).soft)) break;
          dealer.push(draw());
        }
      }
      const you = App.blackjackCount(player).total;
      const house = App.blackjackCount(dealer).total;
      const youNatural = App.blackjackNatural(player);
      const houseNatural = App.blackjackNatural(dealer);
      let won = 0;
      if (you > 21) won = -table.bets[2];
      else if (youNatural && !houseNatural) won = Math.round(table.bets[2] * (table.pays || 1.5));
      else if (houseNatural && !youNatural) won = -table.bets[2];
      else if (house > 21) won = table.bets[2];
      else if (you > house) won = table.bets[2];
      else if (you < house) won = -table.bets[2];
      else won = table.pushLose ? -table.bets[2] : 0;
      chips += won;
      hands += 1;
      if (chips < table.bets[0]) {
        chips = table.restake !== undefined ? table.restake : table.start;
      }
    }
    return { cleared: chips >= table.target, hands: hands };
  }
  function pairedBench(variants, trials) {
    const sums = variants.map(() => ({ hands: 0, reached: 0 }));
    for (let index = 0; index < trials; index += 1) {
      Math.random = makeRandom((0x5EED0000 + index * 2654435761) >>> 0);
      const shoe = App.blackjackShoe(64);
      Math.random = realRandom;
      variants.forEach((table, vIndex) => {
        const outcome = trial(shoe, table);
        if (outcome.cleared) {
          sums[vIndex].reached += 1;
          sums[vIndex].hands += outcome.hands;
        }
      });
    }
    return sums.map((sum) => sum.hands / sum.reached);
  }

  /* One paired pass answers everything: the Last Shoe's own ruleset, the six
   * summit rungs, and every cut (a rung replayed with its own dial pulled
   * back out). The stakes double every rung, so each cut carries the rung
   * below's economy: the rule cuts drop the dial outright, and the buy-back
   * cuts replay the taller restake FRACTION at the rung's own stakes -
   * b28's cut is the full buy-back, which is hands-to-clear invariant under
   * the stake scaling, so it shares the base row. Twelve thousand trials
   * resolve the smallest step on the ladder (soft 17, ~0.4 hands). */
  const baseRules = Object.assign({}, shipped[23], { soft17: false, pushLose: false, pays: undefined, restake: undefined });
  const cutOf = (index) => {
    if (index === 0) return Object.assign({}, summit[0], { soft17: false });
    if (index === 1) return Object.assign({}, summit[1], { pushLose: false });
    if (index === 2) return Object.assign({}, summit[2], { pays: undefined });
    const taller = index === 3 ? undefined
      : summit[index - 1].restake / summit[index - 1].bets[2] * summit[index].bets[2];
    return Object.assign({}, summit[index], { restake: taller });
  };
  const variants = [baseRules].concat(
    summit,
    [0, 1, 2, 3, 4, 5].map(cutOf),
  );
  const labels = ["base", "b25", "b26", "b27", "b28", "b29", "b30",
    "b25 cut", "b26 cut", "b27 cut", "b28 cut", "b29 cut", "b30 cut"];
  const means = pairedBench(variants, 12000);

  /* ---- the ladder climbs, rung over rung, past the Last Shoe ---- */
  const ladderMeans = means.slice(0, 7);
  check("game-blackjack",
    "the paired bench climbs rung over rung past the Last Shoe's own economy",
    ladderMeans.every((mean, index) => index === 0 || mean > ladderMeans[index - 1]),
    ladderMeans.map((mean) => mean.toFixed(2)).join(" -> "));

  /* ---- the cut: each rung's own lever is load-bearing ---- */
  [0, 1, 2, 3, 4, 5].forEach((index) => {
    check("game-blackjack", `${labels[1 + index]} without its own dial clears strictly faster`,
      means[7 + index] < means[1 + index],
      `${labels[7 + index]} ${means[7 + index].toFixed(2)} vs ${labels[1 + index]} ${means[1 + index].toFixed(2)}`);
  });

  /* ---- the shipping bar: the official seeded sweep, thirty tables ---- */
  const parlor = require(path.join(root, "tools", "parlor-forge"));
  const sweepApi = parlor.loadApi();
  const sweep = parlor.sweep(sweepApi, sweepApi.bjTables);
  check("game-blackjack", "every one of the thirty tables clears the seeded sweep",
    sweep.every((entry) => entry.ok),
    sweep.filter((entry) => !entry.ok).map((entry) => entry.id).join(","));
  check("game-blackjack", "the summit's sweep lines are printed by the same instrument the older tiers shipped with",
    sweep.length === 30 && sweep.slice(24).every((entry) => entry.reached >= 140 && entry.three >= 2),
    sweep.slice(24).map((entry) => `${entry.id}:${entry.reached}/${entry.three}`).join(" "));
};
