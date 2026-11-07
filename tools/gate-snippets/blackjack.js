"use strict";

/* game-blackjack: the summit is the rope above the salon, and the gate
 * proves its rules - not its stakes - are what got harder. The tower above
 * the rope changes the price of sitting down.
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
 * The tower b31-b40 keeps the summit's rules at the summit's own floor -
 * soft seventeen, the push tax, seven for five, the half-stack buy-back -
 * and authors the one lever the rope never touched, the seat fee: `ante`
 * comes off every settled hand, win or lose, before the felt judges the
 * target or the buy-back, so a clearing hand pays its fee too and every
 * restake lands back under it. Structurally nothing before the tier carries
 * the field. The fee walks three hundredths of the minimum bet a hand up to
 * thirty-five hundredths, and the paired bench climbs rung over rung again
 * (71.7 hands to clear at the first fee, 88.4 at the rope's price, the
 * clear share never below 85.9%), with each rung's own fee cut away to
 * prove the lesson load-bearing. The three-star line never moves: three
 * hands - two naturals still outrun any fee the felt charges. The tower's
 * two-star and one-star lines calibrate to the paired bench's own 42% and
 * 72% clear marks, so every rung stays winnable at all while the fee takes
 * the clock, and the whole forty-table ladder replays the forge's seeded
 * sweep the way the static check judges it - the sweep's bench pays no fee,
 * so on the tower it is the winnability floor the fee rides on.
 *
 * The room above the tower b41-b44 pins the fee where the rope's price left
 * it - thirty-five hundredths of the minimum bet, the pace the tower ended
 * on - and moves the one dial the house never touched: the natural's own
 * price, discounted rung over rung from the rope's seven for five - thirteen
 * for ten, six for five, eleven for ten, and at the capstone even money,
 * where the best hand in the room pays what a plain win pays. Structurally
 * nothing before the tier drops the natural below seven for five, the fee
 * share never moves, and the house shape holds (the same 1.5x target, the
 * same quarter-stack top bet, the same three-hand three-star line). The
 * paired bench climbs rung over rung past the rope's price (88.7, 91.8,
 * 93.1, 96.9, 98.2 hands), the clear share's descent is pinned (84.0 down
 * to 76.1 - the discount taxes the bench's one fast lane, and the bench
 * bar for the room is its own measured floor, not the tower's), each
 * rung's discount cut away clears at the base economy and its fee cut away
 * clears faster still, so the room's lesson is load-bearing and the
 * tower's dial still rides. The three-hand door narrows with the price -
 * at seven for five a natural among two wins outruns the fee, from eleven
 * for ten it takes three straight net wins - and stays real but never
 * common. The room's bands calibrate to the same 42% and 72% marks, and
 * the sweep still clears 149 to 154 of 160 fee-free: the winnability floor
 * the discount rides on.
 */

module.exports = function gate(ctx) {
  const { App, check, path, root } = ctx;
  const bjTables = App.blackjackTables;
  check("game-blackjack", "the module exports its ladder for the gates",
    Array.isArray(bjTables) && bjTables.length > 0, String(bjTables && bjTables.length));

  /* ---- structure: forty-four felts, the house shape intact everywhere ---- */
  check("game-blackjack", "the parlor ladder holds forty-four tables",
    bjTables.length === 44, String(bjTables.length));
  check("game-blackjack", "every table id is distinct and ordered b1..b44",
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

  const summit = bjTables.slice(24, 30);
  const tower = bjTables.slice(30, 40);
  const room = bjTables.slice(40);
  const shipped = bjTables.slice(0, 24);

  /* ---- the tower's lesson as structure: the summit's rules ride along at
   * the summit's own floor, the fee is new to the ladder, and it climbs ---- */
  check("game-blackjack", "rungs 1-40 ship no seat fee above the tower's own share",
    shipped.concat(summit).every((table) => table.ante === undefined),
    shipped.concat(summit).filter((table) => table.ante !== undefined).map((table) => table.id).join(","));
  check("game-blackjack", "the tower keeps the summit's rule set at the summit's own floor on the single deck",
    tower.every((table) =>
      table.decks === 1 && table.soft17 === true && table.pushLose === true &&
      table.pays === 1.4 && table.restake === table.bets[2] / 2),
    tower.map((table) => table.id).join(","));
  const feeShares = tower.map((table) => Math.round((table.ante / table.bets[0]) * 100));
  check("game-blackjack",
    "the seat fee climbs rung over rung, three hundredths of the minimum bet to thirty-five",
    feeShares.every((share, index) => index === 0 || share > feeShares[index - 1]) &&
      feeShares.join(",") === "3,6,9,12,15,18,22,26,30,35",
    feeShares.join(","));

  /* ---- the room's lesson as structure: the fee pins at the rope's price,
   * the natural's price is the dial that walks, and nothing earlier ever
   * discounted the jackpot ---- */
  check("game-blackjack", "the room keeps the tower's rule set and the fee pinned at the rope's own share",
    room.every((table) =>
      table.decks === 1 && table.soft17 === true && table.pushLose === true &&
      table.restake === table.bets[2] / 2 &&
      table.ante * 100 === table.bets[0] * 35),
    room.map((table) => table.id).join(","));
  check("game-blackjack", "the natural's price walks rung over rung down to even money",
    room[0].pays === 1.3 && room[3].pays === 1 &&
      room.every((table, index) => index === 0 || table.pays < room[index - 1].pays),
    room.map((table) => table.pays).join(","));
  check("game-blackjack", "nothing before the room ever discounted the natural below seven for five",
    shipped.concat(summit).concat(tower).every((table) =>
      table.pays === undefined || table.pays >= 1.4),
    shipped.concat(summit).concat(tower).filter((table) => table.pays !== undefined && table.pays < 1.4).map((table) => table.id).join(","));
  check("game-blackjack",
    "every room felt keeps the house shape and the three-star line the rope printed",
    room.every((table) =>
      table.bets.length === 3 &&
      table.bets[0] < table.bets[1] && table.bets[1] < table.bets[2] &&
      table.bets[2] * 4 === table.start &&
      table.target === Math.round(table.start * 1.5) &&
      table.starHands[0] === 3 &&
      table.starHands[0] < table.starHands[1] && table.starHands[1] < table.starHands[2]),
    "");
  check("game-blackjack",
    "every tower felt keeps the house shape and the three-star line the rope printed",
    tower.every((table) =>
      table.bets.length === 3 &&
      table.bets[0] < table.bets[1] && table.bets[1] < table.bets[2] &&
      table.bets[2] * 4 === table.start &&
      table.target === Math.round(table.start * 1.5) &&
      table.starHands[0] === 3 &&
      table.starHands[0] < table.starHands[1] && table.starHands[1] < table.starHands[2]),
    "");

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
      if (table.ante) {
        /* the tower felts: the seat fee comes off every settled hand, the
         * way the engine's settle takes it - before the target or the
         * buy-back is judged */
        chips = Math.max(0, chips - table.ante);
      }
      hands += 1;
      if (chips < table.bets[0]) {
        chips = table.restake !== undefined ? table.restake : table.start;
      }
    }
    return { cleared: chips >= table.target, hands: hands };
  }
  function pairedBench(variants, trials) {
    const sums = variants.map(() => ({ hands: 0, reached: 0, three: 0, two: 0, one: 0 }));
    for (let index = 0; index < trials; index += 1) {
      Math.random = makeRandom((0x5EED0000 + index * 2654435761) >>> 0);
      const shoe = App.blackjackShoe(64);
      Math.random = realRandom;
      variants.forEach((table, vIndex) => {
        const outcome = trial(shoe, table);
        if (outcome.cleared) {
          const sum = sums[vIndex];
          sum.reached += 1;
          sum.hands += outcome.hands;
          if (outcome.hands <= table.starHands[0]) sum.three += 1;
          if (outcome.hands <= table.starHands[1]) sum.two += 1;
          if (outcome.hands <= table.starHands[2]) sum.one += 1;
        }
      });
    }
    return sums.map((sum) => ({
      mean: sum.hands / Math.max(1, sum.reached),
      share: sum.reached / trials,
      three: sum.three,
      two: sum.two / Math.max(1, sum.reached),
      one: sum.one / Math.max(1, sum.reached),
    }));
  }

  /* One paired pass answers everything: the Last Shoe's own ruleset, the six
   * summit rungs, the ten tower rungs, and every cut (a rung replayed with
   * its own lever pulled back out). The stakes double every rung, so each cut
   * carries the rung below's economy: the rule cuts drop the dial outright,
   * the buy-back cuts replay the taller restake FRACTION at the rung's own
   * stakes - b28's cut is the full buy-back, which is hands-to-clear
   * invariant under the stake scaling, so it shares the base row - and the
   * tower cuts strike the seat fee alone, leaving the summit's rules in
   * place. Twelve thousand trials resolve the smallest step on the ladder
   * (soft 17, ~0.4 hands). */
  const baseRules = Object.assign({}, shipped[23], { soft17: false, pushLose: false, pays: undefined, restake: undefined });
  const cutOf = (index) => {
    if (index === 0) return Object.assign({}, summit[0], { soft17: false });
    if (index === 1) return Object.assign({}, summit[1], { pushLose: false });
    if (index === 2) return Object.assign({}, summit[2], { pays: undefined });
    const taller = index === 3 ? undefined
      : summit[index - 1].restake / summit[index - 1].bets[2] * summit[index].bets[2];
    return Object.assign({}, summit[index], { restake: taller });
  };
  const towerCutOf = (table) => Object.assign({}, table, { ante: undefined });
  const roomPayCutOf = (table) => Object.assign({}, table, { pays: 1.4 });
  const roomFeeCutOf = (table) => Object.assign({}, table, { ante: undefined });
  const variants = [baseRules].concat(
    summit,
    tower,
    room,
    [0, 1, 2, 3, 4, 5].map(cutOf),
    tower.map(towerCutOf),
    room.map(roomPayCutOf),
    room.map(roomFeeCutOf),
  );
  const roomIndex = 1 + summit.length + tower.length;
  const summitCutIndex = roomIndex + room.length;
  const towerCutIndex = summitCutIndex + summit.length;
  const roomPayCutIndex = towerCutIndex + tower.length;
  const roomFeeCutIndex = roomPayCutIndex + room.length;
  const labels = ["base"].concat(summit, tower, room).map((table) => table.id || "base")
    .concat([0, 1, 2, 3, 4, 5].map((index) => summit[index].id + " cut"))
    .concat(tower.map((table) => table.id + " cut"))
    .concat(room.map((table) => table.id + " no discount"))
    .concat(room.map((table) => table.id + " no fee"));
  const stats = pairedBench(variants, 12000);
  const means = stats.map((stat) => stat.mean);

  /* ---- the ladder climbs, rung over rung, past the Last Shoe ---- */
  const ladderMeans = means.slice(0, 1 + summit.length + tower.length + room.length);
  check("game-blackjack",
    "the paired bench climbs rung over rung past the Last Shoe's own economy",
    ladderMeans.every((mean, index) => index === 0 || mean > ladderMeans[index - 1]),
    ladderMeans.map((mean) => mean.toFixed(2)).join(" -> "));

  /* ---- the cut: each rung's own lever is load-bearing ---- */
  [0, 1, 2, 3, 4, 5].forEach((index) => {
    check("game-blackjack", `${labels[1 + index]} without its own dial clears strictly faster`,
      means[summitCutIndex + index] < means[1 + index],
      `${labels[summitCutIndex + index]} ${means[summitCutIndex + index].toFixed(2)} vs ${labels[1 + index]} ${means[1 + index].toFixed(2)}`);
  });
  tower.forEach((table, index) => {
    const withFee = stats[1 + summit.length + index];
    const withoutFee = stats[towerCutIndex + index];
    check("game-blackjack", `${table.id} without its seat fee clears strictly faster`,
      withoutFee.mean < withFee.mean,
      `${table.id} cut ${withoutFee.mean.toFixed(2)} vs ${table.id} ${withFee.mean.toFixed(2)}`);
  });
  room.forEach((table, index) => {
    const own = stats[roomIndex + index];
    const noDiscount = stats[roomPayCutIndex + index];
    const noFee = stats[roomFeeCutIndex + index];
    check("game-blackjack", `${table.id} without its discount clears at the base economy - the room's own lever is load-bearing`,
      noDiscount.mean < own.mean,
      `${table.id} no discount ${noDiscount.mean.toFixed(2)} vs ${table.id} ${own.mean.toFixed(2)}`);
    check("game-blackjack", `${table.id} without its seat fee clears strictly faster - the tower's dial still rides`,
      noFee.mean < own.mean,
      `${table.id} no fee ${noFee.mean.toFixed(2)} vs ${table.id} ${own.mean.toFixed(2)}`);
  });

  /* ---- the tower's bands: the three-star line the rope printed stays
   * reachable at the fee, and the two- and one-star lines hold the paired
   * bench's own 42% and 72% clear marks, so every rung stays winnable at
   * all while the fee takes the clock ---- */
  const towerStats = stats.slice(1 + summit.length, 1 + summit.length + tower.length);
  const bandProblems = [];
  tower.forEach((table, index) => {
    const stat = towerStats[index];
    if (stat.three < 2) {
      bandProblems.push(table.id + ": the three-star line fell to " + stat.three);
    }
    if (!(stat.two >= 0.38 && stat.two <= 0.52)) {
      bandProblems.push(table.id + ": two-star share " + stat.two.toFixed(3));
    }
    if (!(stat.one >= 0.66 && stat.one <= 0.82)) {
      bandProblems.push(table.id + ": one-star share " + stat.one.toFixed(3));
    }
    if (stat.share < 0.8) {
      bandProblems.push(table.id + ": clear share " + stat.share.toFixed(3));
    }
  });
  check("game-blackjack",
    "every tower rung is winnable at its fee, its three-star line is reachable" +
    " and its bands hold the bench's own 42% and 72% clear marks (" +
      tower.map((table, index) => table.id + " " + towerStats[index].share.toFixed(2) +
        "/" + towerStats[index].two.toFixed(2) + "/" + towerStats[index].one.toFixed(2)).join(" ") + ")",
    bandProblems.length === 0, bandProblems.slice(0, 4).join(" | "));

  /* ---- the room's bands: the same calibration law at the discount - the
   * two- and one-star lines hold the bench's own 42% and 72% clear marks,
   * the three-hand door stays real but narrows with the price, the clear
   * share descends rung over rung and never falls below the room's own
   * measured floor of 75% ---- */
  const roomStats = stats.slice(roomIndex, roomIndex + room.length);
  const roomProblems = [];
  const roomShares = roomStats.map((stat) => stat.share);
  room.forEach((table, index) => {
    const stat = roomStats[index];
    if (stat.three < 2) {
      roomProblems.push(table.id + ": the three-hand door fell to " + stat.three);
    }
    if (!(stat.two >= 0.4 && stat.two <= 0.44)) {
      roomProblems.push(table.id + ": two-star share " + stat.two.toFixed(3));
    }
    if (!(stat.one >= 0.7 && stat.one <= 0.74)) {
      roomProblems.push(table.id + ": one-star share " + stat.one.toFixed(3));
    }
    if (stat.share < 0.75) {
      roomProblems.push(table.id + ": clear share " + stat.share.toFixed(3));
    }
    if (index > 0 && !(roomShares[index] < roomShares[index - 1])) {
      roomProblems.push(table.id + ": clear share did not descend past " + roomShares[index - 1].toFixed(3));
    }
  });
  check("game-blackjack",
    "every room rung is winnable at its discount, its three-hand door is real" +
    " and its bands hold the bench's own 42% and 72% clear marks (" +
      room.map((table, index) => table.id + " " + roomStats[index].share.toFixed(2) +
        "/" + roomStats[index].two.toFixed(2) + "/" + roomStats[index].one.toFixed(2) +
        "/" + roomStats[index].three).join(" ") + ")",
    roomProblems.length === 0, roomProblems.slice(0, 4).join(" | "));

  /* ---- the shipping bar: the official seeded sweep, forty tables. The
   * sweep's bench pays no seat fee - on the tower it is the winnability
   * floor the fee rides on, and the paired bench above is what judges the
   * fee itself. ---- */
  const parlor = require(path.join(root, "tools", "parlor-forge"));
  const sweepApi = parlor.loadApi();
  const sweep = parlor.sweep(sweepApi, sweepApi.bjTables);
  check("game-blackjack", "every one of the forty-four tables clears the seeded sweep",
    sweep.every((entry) => entry.ok),
    sweep.filter((entry) => !entry.ok).map((entry) => entry.id).join(","));
  check("game-blackjack", "the summit's sweep lines are printed by the same instrument the older tiers shipped with",
    sweep.length === 44 && sweep.slice(24, 30).every((entry) => entry.reached >= 140 && entry.three >= 2),
    sweep.slice(24, 30).map((entry) => `${entry.id}:${entry.reached}/${entry.three}`).join(" "));
  check("game-blackjack", "the tower's felts clear the sweep at the same bar, fee-free - the floor the seat fee rides on",
    sweep.slice(30, 40).every((entry) => entry.reached >= 140 && entry.three >= 2),
    sweep.slice(30, 40).map((entry) => `${entry.id}:${entry.reached}/${entry.three}`).join(" "));
  check("game-blackjack", "the room's felts clear the sweep at the same bar, fee-free - the floor the discount rides on",
    sweep.slice(40).every((entry) => entry.reached >= 140 && entry.three >= 2),
    sweep.slice(40).map((entry) => `${entry.id}:${entry.reached}/${entry.three}`).join(" "));
};
