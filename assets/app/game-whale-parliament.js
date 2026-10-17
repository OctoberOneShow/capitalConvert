/* Whale Parliament - the diplomacy table in the shared game drawer.
 * Three whale factions hold competing priorities over four water corridors, and
 * every route package needs two of the three votes to be adopted. The player is
 * the speaker: they spend fixed offer cards (grant a corridor, restrict one,
 * pledge a future vote, cancel an owed favour) to build the coalition, and the
 * twist is that the ledger remembers - a package that passes today writes an
 * owed favour against every faction whose top priority it bypassed, a broken
 * pledge drops trust and is remembered, and a pod whose trust falls to zero
 * walks out and takes the treaty with it.
 *
 * Everything that decides an outcome is pure and exported: parliamentScore
 * (one faction's vote), parliamentRound (the whole turn: amendments, votes,
 * obligations, trust, walkouts), parliamentTrustFloor, parliamentLedgerFlips
 * (whether a pod's ballot actually rests on its ledger) and parliamentSolvable.
 * Twenty parliaments climb the ladder, each one dealt by the same construction
 * path from a seeded PRNG only, so a session replays bit for bit, and each
 * rung's star bands are the scores its own scripted lines reach when replayed
 * through that resolver - measured, never invented. Turn-based: no timers, no
 * frames, nothing that can tick behind a hidden panel. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  var t = App.t;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  var createCampaign = App.createCampaign;
  var fillCampaignPicker = App.fillCampaignPicker;
  var starsFor = App.starsFor;

  var WHP_ROUNDS = 6;
  var WHP_GOAL_BONUS = 3;
  var WHP_TRUST_CEIL = 100;
  var WHP_CORRIDORS = ["kelp", "ice", "deep", "reef"];
  var WHP_FACTION_IDS = ["gray", "tusk", "orca"];
  var WHP_CORR_KEY = { kelp: "whpCkelp", ice: "whpCice", deep: "whpCdeep", reef: "whpCreef" };
  var WHP_FAC_KEY = { gray: "whpFGray", tusk: "whpFTusk", orca: "whpFOrca" };
  var WHP_WANT_KEY = { open: "whpWantOpen", shut: "whpWantShut", mine: "whpWantMine" };
  var WHP_KIND_KEY = { grant: "whpKindGrant", restrict: "whpKindRestrict", pledge: "whpKindPledge", waive: "whpKindWaive" };
  var WHP_FIT_KEY = ["whpFitAgainst", "whpFitMid", "whpFitFor"];
  var WHP_TRUST_KEYS = ["whpTrustGone", "whpTrustThin", "whpTrustWary", "whpTrustCool", "whpTrustSteady", "whpTrustWarm"];
  var WHP_TRUST_BANDS = [1, 22, 40, 58, 76];

  /* Corridor access is written as a short string: "a" opens the water to all
   * three pods, "go" to grays and orcas only, "-" shuts it. Lanes are always
   * rebuilt in canonical pod order, so two sessions never differ. */
  function whpLaneOf(text) {
    var raw = text === "a" || text === "A" ? "gto" : String(text === undefined || text === null ? "" : text);
    return WHP_FACTION_IDS.filter(function (id) { return raw.indexOf(id.charAt(0)) !== -1; });
  }

  function whpHas(lane, id) { return (lane || []).indexOf(id) !== -1; }

  function whpUnion(lane, id) {
    return WHP_FACTION_IDS.filter(function (other) { return other === id || whpHas(lane, other); });
  }

  function whpWithout(lane, id) {
    return (lane || []).filter(function (other) { return other !== id; });
  }

  /* One priority against one lane: +1 served, 0 split, -1 crossed. The three
   * wishes are one axis - open water means moving with company, ours alone means
   * nobody else in the bay, kept quiet means nobody passes at all. */
  function whpFit(lane, id, want) {
    var list = lane || [];
    var mine = list.indexOf(id) !== -1;
    if (want === "open") {
      return !mine ? -1 : list.length >= 2 ? 1 : 0;
    }
    if (want === "shut") {
      return !list.length ? 1 : mine && list.length >= 2 ? -1 : 0;
    }
    return want === "mine" ? (!mine ? -1 : list.length === 1 ? 1 : 0) : 0;
  }

  /* --- The route packages: who may pass each corridor, what the package is
   * worth, and which water the round's goal rewards. --- */
  var whpPlans = {
    wide: ["whpPlanWide", 6, ["deep", "open"], { kelp: "a", ice: "t", deep: "a", reef: "a" }],
    quiet: ["whpPlanQuiet", 5, ["ice", "shut"], { kelp: "-", ice: "-", deep: "go", reef: "g" }],
    hunters: ["whpPlanHunters", 7, ["deep", "open"], { kelp: "o", ice: "-", deep: "a", reef: "o" }],
    nursery: ["whpPlanNursery", 5, ["kelp", "shut"], { kelp: "-", ice: "t", deep: "g", reef: "g" }],
    strait: ["whpPlanStrait", 6, ["reef", "open"], { kelp: "g", ice: "t", deep: "go", reef: "a" }],
    cold: ["whpPlanCold", 4, ["ice", "mine"], { kelp: "gt", ice: "t", deep: "g", reef: "-" }],
    free: ["whpPlanFree", 7, ["reef", "open"], { kelp: "a", ice: "a", deep: "a", reef: "a" }],
    sealed: ["whpPlanSealed", 4, ["deep", "shut"], { kelp: "-", ice: "-", deep: "-", reef: "-" }],
    halfGate: ["whpPlanHalf", 5, ["kelp", "mine"], { kelp: "t", ice: "-", deep: "to", reef: "o" }],
    split: ["whpPlanSplit", 6, ["deep", "open"], { kelp: "o", ice: "t", deep: "go", reef: "t" }],
    tuskRun: ["whpPlanTuskRun", 5, ["reef", "mine"], { kelp: "-", ice: "t", deep: "t", reef: "t" }],
    bothWays: ["whpPlanBoth", 6, ["kelp", "open"], { kelp: "go", ice: "-", deep: "a", reef: "to" }],
    /* Unfinished motions: every one of these four lands on the floor with its
     * goal unmet, so the three goal points are bought with an amendment or not
     * at all. No shipped rung deals them. */
    crossTrench: ["whpPlanCross", 6, ["deep", "mine"], { kelp: "o", ice: "-", deep: "go", reef: "t" }],
    twoBays: ["whpPlanTwoBays", 5, ["kelp", "mine"], { kelp: "go", ice: "o", deep: "-", reef: "t" }],
    lockstep: ["whpPlanLock", 7, ["reef", "shut"], { kelp: "gt", ice: "to", deep: "go", reef: "g" }],
    narrowRun: ["whpPlanNarrow", 6, ["ice", "open"], { kelp: "-", ice: "g", deep: "t", reef: "o" }],
    twinGates: ["whpPlanTwin", 6, ["kelp", "shut"], { kelp: "to", ice: "g", deep: "-", reef: "a" }],
  };

  /* --- Offer cards: [kind, corridor, pod, trust cost per crossed wish]. --- */
  function whpHand(defs) {
    return defs.map(function (row, index) {
      return { id: index + 1, kind: row[0], c: row[1] || "", target: row[2] || "", cost: row[3] === undefined ? 1 : row[3] };
    });
  }

  /* --- The twenty parliaments: generous priorities, a clash over the trench, a
   * debt-heavy start, a hall where a walked-out pod can be won back, the
   * deep-water treaty that combines all three, and then five deeper halls where
   * the ledger tightens rung by rung. From the Single Whip onward every hall
   * bends a different part of the rules - the whip budget, who owns a goal,
   * which wishes a bloc can be bought with, which ledger tools the hand is
   * missing, how many seats the treaty has to survive on. Each carries three
   * scripted lines, replayed below to measure its star bands: the bands are what
   * those lines score through App.parliamentRound, never numbers written by
   * hand, and the treaty target climbs while the points per adopted package
   * fall. --- */
  var whpLevels = [
    {
      id: "w1", labelKey: "whpP1", twistKey: "whpTwist1", maxCards: 2, need: 3, mercy: false, seed: 20261003,
      decks: ["wide", "quiet", "hunters", "nursery", "strait", "cold", "free"],
      hand: whpHand([["grant", "deep", "orca", 1], ["grant", "reef", "gray", 1], ["restrict", "ice", "orca", 1], ["pledge", "", "tusk", 0], ["waive", "", "gray", 0]]),
      prio: {
        gray: [["deep", "open", 3], ["reef", "open", 2], ["kelp", "shut", 1]],
        tusk: [["ice", "shut", 3], ["kelp", "shut", 2], ["deep", "shut", 1]],
        orca: [["deep", "open", 2], ["reef", "mine", 1], ["ice", "shut", 1]],
      },
      start: [{ id: "gray", trust: 52, owed: 0 }, { id: "tusk", trust: 50, owed: 0 }, { id: "orca", trust: 54, owed: 0 }],
      lines: { high: [[1, 2], [], [], [4], [], []], mid: [[], [], [], [1], [], [4]], low: [[1, 2], [], [], [], [], [4]] },
    },
    {
      id: "w2", labelKey: "whpP2", twistKey: "whpTwist2", maxCards: 2, need: 3, mercy: false, seed: 771103,
      decks: ["wide", "quiet", "hunters", "sealed", "strait", "split", "halfGate"],
      hand: whpHand([["grant", "deep", "gray", 1], ["restrict", "deep", "tusk", 2], ["grant", "reef", "tusk", 1], ["pledge", "", "gray", 0], ["waive", "", "tusk", 0]]),
      prio: {
        gray: [["deep", "open", 3], ["reef", "open", 2], ["ice", "mine", 1]],
        tusk: [["ice", "shut", 3], ["deep", "shut", 3], ["kelp", "shut", 1]],
        orca: [["deep", "open", 2], ["reef", "mine", 2], ["kelp", "mine", 1]],
      },
      start: [{ id: "gray", trust: 55, owed: 0 }, { id: "tusk", trust: 52, owed: 0 }, { id: "orca", trust: 50, owed: 0 }],
      lines: { high: [[2, 4], [], [], [1], [], []], mid: [[2], [], [4], [1], [], []], low: [[3, 4], [], [2], [1], [], []] },
    },
    {
      id: "w3", labelKey: "whpP3", twistKey: "whpTwist3", maxCards: 2, need: 3, mercy: false, seed: 424242,
      decks: ["quiet", "nursery", "strait", "tuskRun", "wide", "cold", "bothWays"],
      hand: whpHand([["grant", "reef", "gray", 1], ["grant", "deep", "orca", 1], ["restrict", "reef", "tusk", 1], ["restrict", "ice", "tusk", 1], ["pledge", "", "gray", 0], ["waive", "", "orca", 0]]),
      prio: {
        gray: [["deep", "open", 2], ["reef", "open", 3], ["kelp", "shut", 1]],
        tusk: [["ice", "shut", 2], ["kelp", "shut", 2], ["reef", "shut", 1]],
        orca: [["reef", "mine", 3], ["deep", "open", 2], ["ice", "shut", 1]],
      },
      start: [{ id: "gray", trust: 50, owed: 2 }, { id: "tusk", trust: 48, owed: 1 }, { id: "orca", trust: 46, owed: 2 }],
      lines: { high: [[], [4], [2], [], [], [1]], mid: [[], [4], [2], [], [1], []], low: [[], [3, 4], [], [], [], [1]] },
    },
    {
      /* The Herd opens on a thread: it will walk out, and only an offer that
       * serves the wish it left over brings it back to the second seat. */
      id: "w4", labelKey: "whpP4", twistKey: "whpTwist4", maxCards: 2, need: 4, mercy: true, seed: 90210,
      decks: ["wide", "quiet", "hunters", "strait", "sealed", "split", "free"],
      hand: whpHand([["grant", "deep", "gray", 1], ["grant", "deep", "orca", 1], ["restrict", "ice", "tusk", 1], ["restrict", "ice", "orca", 1], ["pledge", "", "tusk", 0], ["waive", "", "gray", 0]]),
      prio: {
        gray: [["deep", "open", 3], ["reef", "open", 2], ["kelp", "shut", 1]],
        tusk: [["ice", "shut", 3], ["deep", "shut", 2], ["reef", "shut", 1]],
        orca: [["deep", "open", 2], ["reef", "mine", 2], ["ice", "shut", 1]],
      },
      start: [{ id: "gray", trust: 42, owed: 1 }, { id: "tusk", trust: 6, owed: 2 }, { id: "orca", trust: 40, owed: 0 }],
      lines: { high: [[], [4], [3], [1, 2], [], []], mid: [[5], [4], [], [], [3], []], low: [[], [], [], [1, 2], [], []] },
    },
    {
      id: "w5", labelKey: "whpP5", twistKey: "whpTwist5", maxCards: 2, need: 4, mercy: true, seed: 191919,
      decks: ["wide", "hunters", "strait", "nursery", "bothWays", "halfGate", "cold"],
      hand: whpHand([["grant", "deep", "gray", 1], ["grant", "reef", "orca", 1], ["grant", "kelp", "tusk", 1], ["restrict", "deep", "tusk", 2], ["restrict", "ice", "orca", 1], ["pledge", "", "gray", 0]]),
      prio: {
        gray: [["deep", "open", 3], ["reef", "open", 2], ["kelp", "shut", 1]],
        tusk: [["kelp", "mine", 3], ["ice", "shut", 2], ["deep", "shut", 2]],
        orca: [["reef", "mine", 3], ["ice", "shut", 2], ["deep", "open", 1]],
      },
      start: [{ id: "gray", trust: 46, owed: 2 }, { id: "tusk", trust: 38, owed: 1 }, { id: "orca", trust: 42, owed: 2 }],
      lines: { high: [[1], [], [], [6], [], [2, 3]], mid: [[1], [], [], [6], [3], []], low: [[], [4, 6], [], [], [], [2, 3]] },
    },
    {
      /* Favour Tide owes every pod from the first ballot: two pods want the trench
       * open and the third wants it shut with the ice quiet, so every package that
       * passes bypasses somebody and writes a fresh favour against them - the
       * drifters pick up four of them on the way to the treaty - and the only ways
       * left to pay a favour down are to serve that pod's own top wish or to waive
       * it and leave a grudge behind. */
      id: "w6", labelKey: "whpP6", twistKey: "whpTwist6", maxCards: 2, need: 4, mercy: false, seed: 314159,
      decks: ["wide", "hunters", "strait", "quiet", "nursery", "tuskRun", "bothWays"],
      hand: whpHand([["grant", "deep", "orca", 1], ["grant", "reef", "gray", 1], ["restrict", "ice", "tusk", 1], ["pledge", "", "orca", 0], ["waive", "", "tusk", 0], ["waive", "", "gray", 0]]),
      prio: {
        gray: [["reef", "mine", 3], ["deep", "open", 2], ["ice", "shut", 1]],
        tusk: [["ice", "shut", 3], ["kelp", "shut", 2], ["deep", "shut", 1]],
        orca: [["deep", "open", 3], ["kelp", "open", 2], ["reef", "shut", 1]],
      },
      start: [{ id: "gray", trust: 46, owed: 2 }, { id: "tusk", trust: 44, owed: 3 }, { id: "orca", trust: 44, owed: 2 }],
      lines: { high: [[2], [4], [3], [], [], []], mid: [[], [4], [3], [], [], [2, 1]], low: [[6], [4], [3], [2], [], []] },
    },
    {
      /* The Promise Hall deals the same trench twice over: a pledge made here is
       * crossed by a later package more often than not, so the grudge it leaves
       * behind shuts the pod off from every promise after it. */
      id: "w7", labelKey: "whpP7", twistKey: "whpTwist7", maxCards: 2, need: 4, mercy: false, seed: 271828,
      decks: ["hunters", "bothWays", "strait", "split", "wide", "tuskRun", "cold"],
      hand: whpHand([["grant", "deep", "gray", 1], ["grant", "reef", "orca", 2], ["restrict", "ice", "tusk", 1], ["pledge", "", "tusk", 0], ["pledge", "", "orca", 0], ["waive", "", "gray", 0]]),
      prio: {
        gray: [["deep", "open", 3], ["kelp", "open", 2], ["reef", "shut", 1]],
        tusk: [["ice", "shut", 3], ["reef", "shut", 2], ["kelp", "shut", 1]],
        orca: [["deep", "open", 3], ["reef", "mine", 2], ["ice", "shut", 1]],
      },
      start: [{ id: "gray", trust: 48, owed: 1 }, { id: "tusk", trust: 46, owed: 2 }, { id: "orca", trust: 40, owed: 3 }],
      lines: { high: [[6, 2], [4], [5], [3, 1], [], []], mid: [[6, 4], [], [5], [3, 1], [], []], low: [[6, 5], [4, 3], [], [1], [], []] },
    },
    {
      /* Thin Ice seats two pods on a thread: the herd walks out inside three
       * rounds, and the treaty needs it back in the second seat - which only a
       * package serving the very wish it left over will do. */
      id: "w8", labelKey: "whpP8", twistKey: "whpTwist8", maxCards: 2, need: 5, mercy: true, seed: 161803,
      decks: ["wide", "quiet", "hunters", "strait", "halfGate", "split", "free"],
      hand: whpHand([["grant", "deep", "gray", 1], ["grant", "reef", "orca", 1], ["restrict", "ice", "tusk", 2], ["pledge", "", "tusk", 0], ["waive", "", "orca", 0], ["waive", "", "gray", 0]]),
      prio: {
        gray: [["deep", "open", 3], ["reef", "open", 2], ["kelp", "shut", 1]],
        tusk: [["ice", "shut", 3], ["kelp", "shut", 2], ["deep", "shut", 1]],
        orca: [["reef", "open", 3], ["deep", "open", 2], ["ice", "shut", 1]],
      },
      start: [{ id: "gray", trust: 42, owed: 2 }, { id: "tusk", trust: 6, owed: 2 }, { id: "orca", trust: 16, owed: 1 }],
      lines: { high: [[6, 4], [], [1], [5, 3], [], []], mid: [[6, 4], [], [1], [], [], [5, 3]], low: [[5], [4], [], [3], [], []] },
    },
    {
      /* Winter Ledger deals nothing but cheap water: every motion on the shelf is
       * worth four or five points, so five points is the most any package can be
       * worth and the hall starts deep in favours. A walkout still ends the
       * session, the pods want the bays shut, and only the clan still hopes for
       * open water, so the treaty has to be carried on unpaid debts. */
      id: "w9", labelKey: "whpP9", twistKey: "whpTwist9", maxCards: 2, need: 5, mercy: false, seed: 112358,
      decks: ["quiet", "nursery", "cold", "sealed", "tuskRun", "halfGate"],
      hand: whpHand([["grant", "deep", "orca", 2], ["grant", "kelp", "gray", 1], ["restrict", "deep", "tusk", 1], ["pledge", "", "gray", 0], ["waive", "", "orca", 0], ["waive", "", "tusk", 0]]),
      prio: {
        gray: [["ice", "shut", 3], ["deep", "shut", 2], ["reef", "shut", 1]],
        tusk: [["ice", "shut", 3], ["kelp", "shut", 2], ["deep", "shut", 1]],
        orca: [["kelp", "shut", 3], ["ice", "shut", 2], ["deep", "open", 1]],
      },
      start: [{ id: "gray", trust: 44, owed: 3 }, { id: "tusk", trust: 42, owed: 2 }, { id: "orca", trust: 40, owed: 3 }],
      lines: { high: [[4], [3], [], [], [], []], mid: [[6], [3], [], [1], [], []], low: [[6], [3], [], [1], [], [2]] },
    },
    {
      /* The last hall is the whole ledger at once: the trench is claimed by two
       * pods as their top wish, the herd sits on six points of trust, and every
       * promise made here is answered by the water that follows it. */
      id: "w10", labelKey: "whpP10", twistKey: "whpTwist10", maxCards: 2, need: 5, mercy: true, seed: 141421,
      decks: ["wide", "hunters", "strait", "split", "bothWays", "quiet", "free"],
      hand: whpHand([["grant", "deep", "gray", 2], ["restrict", "deep", "tusk", 2], ["grant", "reef", "orca", 1], ["pledge", "", "gray", 0], ["pledge", "", "tusk", 0], ["waive", "", "orca", 0]]),
      prio: {
        gray: [["deep", "open", 3], ["reef", "open", 2], ["kelp", "shut", 1]],
        tusk: [["ice", "shut", 3], ["kelp", "shut", 2], ["deep", "shut", 1]],
        orca: [["deep", "open", 3], ["kelp", "open", 2], ["reef", "shut", 1]],
      },
      start: [{ id: "gray", trust: 44, owed: 2 }, { id: "tusk", trust: 6, owed: 3 }, { id: "orca", trust: 40, owed: 2 }],
      lines: { high: [[4], [5, 2], [], [], [], []], mid: [[5], [], [], [], [], [3]], low: [[5], [], [2], [], [], [3]] },
    },
    {
      /* Single Whip cuts the speaker's firepower to one offer a round: the trench
       * is claimed by two pods, the herd wants the gate and the bay quiet, and a
       * round can still only be amended once - the card spent opening the deep is
       * not also available to close the ice, so a whip has to be spent rather
       * than stacked. */
      id: "w11", labelKey: "whpP11", twistKey: "whpTwist11", maxCards: 1, need: 4, mercy: false, seed: 830532,
      decks: ["quiet", "strait", "tuskRun", "hunters", "split", "twinGates", "free"],
      hand: whpHand([["grant", "deep", "orca", 1], ["restrict", "ice", "tusk", 1], ["pledge", "", "gray", 0], ["waive", "", "tusk", 0]]),
      prio: {
        gray: [["deep", "open", 3], ["ice", "shut", 2], ["kelp", "shut", 1]],
        tusk: [["kelp", "shut", 3], ["ice", "shut", 2], ["reef", "open", 1]],
        orca: [["deep", "open", 3], ["kelp", "mine", 2], ["ice", "shut", 1]],
      },
      start: [{ id: "gray", trust: 54, owed: 0 }, { id: "tusk", trust: 45, owed: 0 }, { id: "orca", trust: 52, owed: 1 }],
      lines: { high: [[], [1], [3], [], [2], []], mid: [[], [], [3], [], [], []], low: [[], [1], [], [], [], []] },
    },
    {
      /* Unfinished Bills deals only motions that arrive with their goal unmet:
       * the trench is shared, the gate is half-open, the strait is claimed by two
       * pods. Three points of every round sit behind an amendment the speaker
       * must buy, so a carried package and a carried purpose stop being the
       * same event. */
      id: "w12", labelKey: "whpP12", twistKey: "whpTwist12", maxCards: 2, need: 4, mercy: false, seed: 195367,
      decks: ["crossTrench", "twoBays", "split", "twinGates", "narrowRun", "bothWays", "lockstep"],
      hand: whpHand([["grant", "deep", "orca", 0], ["grant", "kelp", "tusk", 0], ["grant", "reef", "gray", 0], ["restrict", "reef", "orca", 1], ["pledge", "", "tusk", 0], ["waive", "", "gray", 0]]),
      prio: {
        gray: [["deep", "open", 3], ["ice", "shut", 2], ["kelp", "open", 1]],
        tusk: [["reef", "open", 3], ["deep", "shut", 2], ["kelp", "open", 1]],
        orca: [["kelp", "open", 3], ["deep", "open", 2], ["ice", "shut", 1]],
      },
      start: [{ id: "gray", trust: 54, owed: 1 }, { id: "tusk", trust: 46, owed: 2 }, { id: "orca", trust: 55, owed: 0 }],
      lines: { high: [[], [], [3, 5], [2], [], []], mid: [[], [], [2, 5], [], [], [1, 3]], low: [[], [], [], [], [], [1, 3]] },
    },
    {
      /* The Exclusive Bloc seats two pods whose every wish is "ours alone": open
       * water can never carry them, only shutting a rival out of a claimed bay
       * will, and each such closure writes a grievance against the pod that
       * loses the water. The friendly seat is the only one that will back open
       * water at all. */
      id: "w13", labelKey: "whpP13", twistKey: "whpTwist13", maxCards: 2, need: 4, mercy: false, seed: 688861,
      decks: ["narrowRun", "lockstep", "halfGate", "hunters", "nursery", "strait", "crossTrench"],
      hand: whpHand([["restrict", "deep", "orca", 2], ["grant", "reef", "tusk", 1], ["grant", "kelp", "tusk", 1], ["restrict", "kelp", "gray", 1], ["pledge", "", "orca", 0], ["waive", "", "gray", 0]]),
      prio: {
        gray: [["deep", "open", 3], ["kelp", "shut", 2], ["ice", "shut", 1]],
        tusk: [["ice", "mine", 3], ["kelp", "mine", 3], ["reef", "mine", 1]],
        orca: [["kelp", "mine", 3], ["deep", "mine", 2], ["ice", "mine", 2]],
      },
      start: [{ id: "gray", trust: 52, owed: 1 }, { id: "tusk", trust: 51, owed: 0 }, { id: "orca", trust: 53, owed: 1 }],
      lines: { high: [[3], [2, 5], [1], [], [4], []], mid: [[3], [], [], [], [2, 4], []], low: [[3, 5], [1], [], [], [2, 4], []] },
    },
    {
      /* Paid at the Ballot strips the ledger tools from the hand: no promise and
       * no waiver, only grants and closures. Favours sit at three and four, the
       * debt penalty is already maxed out, and the one way left to pay it is to
       * carry a package that serves the pod's own top wish. */
      id: "w14", labelKey: "whpP14", twistKey: "whpTwist14", maxCards: 2, need: 4, mercy: false, seed: 686743,
      decks: ["strait", "wide", "hunters", "twinGates", "tuskRun", "quiet", "twoBays"],
      hand: whpHand([["grant", "deep", "gray", 1], ["grant", "reef", "orca", 1], ["restrict", "ice", "tusk", 1], ["restrict", "deep", "tusk", 2], ["grant", "kelp", "tusk", 1], ["restrict", "reef", "gray", 2]]),
      prio: {
        gray: [["deep", "open", 3], ["reef", "open", 2], ["kelp", "shut", 1]],
        tusk: [["reef", "open", 3], ["ice", "shut", 2], ["kelp", "shut", 1]],
        orca: [["deep", "open", 3], ["reef", "open", 2], ["kelp", "open", 1]],
      },
      start: [{ id: "gray", trust: 52, owed: 3 }, { id: "tusk", trust: 47, owed: 4 }, { id: "orca", trust: 52, owed: 4 }],
      lines: { high: [[], [], [], [1, 3], [], [2]], mid: [[], [], [], [], [3, 4], [2]], low: [[], [], [5, 6], [1, 2], [3, 4], []] },
    },
    {
      /* The Promise Bank prices every amendment at two points of trust against a
       * hall that starts thin, so the only cheap currency left is a pledge: +3
       * goodwill when made, +4 and a cleared favour when the next packages
       * deliver it, -8 and a grudge when they cross it, and it dies of its own
       * age two rounds after a miss. */
      id: "w15", labelKey: "whpP15", twistKey: "whpTwist15", maxCards: 2, need: 5, mercy: true, seed: 539297,
      decks: ["narrowRun", "lockstep", "quiet", "twinGates", "crossTrench", "tuskRun", "split"],
      hand: whpHand([["pledge", "", "gray", 0], ["pledge", "", "tusk", 0], ["pledge", "", "orca", 0], ["grant", "deep", "gray", 2], ["grant", "reef", "orca", 2], ["restrict", "ice", "tusk", 2]]),
      prio: {
        gray: [["kelp", "shut", 3], ["deep", "open", 2], ["ice", "shut", 1]],
        tusk: [["kelp", "shut", 3], ["ice", "shut", 2], ["deep", "shut", 1]],
        orca: [["kelp", "shut", 3], ["deep", "open", 2], ["ice", "shut", 1]],
      },
      start: [{ id: "gray", trust: 25, owed: 3 }, { id: "tusk", trust: 25, owed: 2 }, { id: "orca", trust: 29, owed: 2 }],
      lines: { high: [[5, 6], [], [1], [2, 3], [4], []], mid: [[1, 6], [], [2], [3, 4], [], []], low: [[1, 6], [], [2, 3], [5], [4], []] },
    },
    {
      /* The Fatal Floor seats the herd on four points of trust in a hall with no
       * mercy: a round lost is a point off the seat, an amendment that crosses
       * its wish costs more, and a pod that reaches zero leaves with the treaty
       * behind it. The thin seat has to be carried, not merely survived. */
      id: "w16", labelKey: "whpP16", twistKey: "whpTwist16", maxCards: 2, need: 5, mercy: false, seed: 829369,
      decks: ["halfGate", "split", "tuskRun", "nursery", "crossTrench", "quiet", "wide"],
      hand: whpHand([["grant", "reef", "gray", 1], ["grant", "deep", "orca", 1], ["restrict", "ice", "tusk", 1], ["restrict", "deep", "gray", 2], ["pledge", "", "tusk", 0], ["waive", "", "tusk", 0]]),
      prio: {
        gray: [["ice", "shut", 3], ["deep", "open", 2], ["kelp", "open", 1]],
        tusk: [["ice", "shut", 3], ["kelp", "shut", 2], ["deep", "open", 1]],
        orca: [["deep", "open", 3], ["ice", "shut", 2], ["kelp", "mine", 1]],
      },
      start: [{ id: "gray", trust: 47, owed: 2 }, { id: "tusk", trust: 4, owed: 1 }, { id: "orca", trust: 47, owed: 2 }],
      lines: { high: [[3], [1, 5], [4], [], [], [2]], mid: [[3], [], [], [], [], [2]], low: [[], [3], [], [4], [], [1, 2]] },
    },
    {
      /* Favour Tide Rises seats a hall already four to six favours deep on trust
       * in the thirties and forties, and hands the speaker three waivers: each one
       * cancels a favour, costs three trust and leaves a grudge that deafens the
       * pod to every promise after it, while every package carried writes a fresh
       * favour against whoever was bypassed. */
      id: "w17", labelKey: "whpP17", twistKey: "whpTwist17", maxCards: 2, need: 5, mercy: false, seed: 481393,
      decks: ["hunters", "twinGates", "quiet", "strait", "halfGate", "nursery", "bothWays"],
      hand: whpHand([["waive", "", "tusk", 0], ["waive", "", "orca", 0], ["waive", "", "gray", 0], ["grant", "deep", "gray", 1], ["grant", "reef", "orca", 1], ["restrict", "kelp", "tusk", 1]]),
      prio: {
        gray: [["deep", "open", 3], ["ice", "shut", 2], ["reef", "open", 1]],
        tusk: [["ice", "shut", 3], ["reef", "open", 2], ["kelp", "shut", 1]],
        orca: [["ice", "shut", 3], ["reef", "open", 2], ["kelp", "shut", 1]],
      },
      start: [{ id: "gray", trust: 42, owed: 6 }, { id: "tusk", trust: 42, owed: 4 }, { id: "orca", trust: 35, owed: 5 }],
      lines: { high: [[2, 4], [], [], [], [], [3, 5]], mid: [[2, 4], [], [], [], [], []], low: [[2, 6], [], [], [1], [], []] },
    },
    {
      /* The Two-Seat Hall starts with the clan on seven points of trust and four
       * favours unpaid, in a parliament where a walkout does not end the session:
       * lose that seat and the hall runs on two, and a hall of two needs both of
       * its yeas for every package. Only a bill serving a pod's left-over wish
       * brings it back, and it comes home at twenty-five trust. */
      id: "w18", labelKey: "whpP18", twistKey: "whpTwist18", maxCards: 2, need: 5, mercy: true, seed: 681105,
      decks: ["crossTrench", "lockstep", "halfGate", "wide", "strait", "free", "cold"],
      hand: whpHand([["grant", "kelp", "orca", 1], ["grant", "deep", "gray", 1], ["restrict", "ice", "tusk", 1], ["grant", "reef", "tusk", 1], ["pledge", "", "orca", 0], ["waive", "", "tusk", 0]]),
      prio: {
        gray: [["deep", "open", 3], ["kelp", "open", 2], ["ice", "shut", 1]],
        tusk: [["kelp", "open", 3], ["reef", "open", 2], ["deep", "open", 1]],
        orca: [["deep", "open", 3], ["reef", "open", 2], ["ice", "open", 1]],
      },
      start: [{ id: "gray", trust: 44, owed: 1 }, { id: "tusk", trust: 38, owed: 1 }, { id: "orca", trust: 7, owed: 4 }],
      lines: { high: [[3, 5], [], [], [], [], [1, 4]], mid: [[], [], [], [1, 5], [], [4]], low: [[], [], [], [1, 5], [], [3, 4]] },
    },
    {
      /* Poor House deals nothing but four and five point motions, so a carried
       * round is worth barely half again what a greedy one pays and the three
       * goal points decide whether the treaty has any margin at all. */
      id: "w19", labelKey: "whpP19", twistKey: "whpTwist19", maxCards: 2, need: 5, mercy: false, seed: 936364,
      decks: ["halfGate", "quiet", "nursery", "cold", "tuskRun", "sealed", "twoBays"],
      hand: whpHand([["grant", "deep", "gray", 1], ["restrict", "deep", "orca", 1], ["restrict", "kelp", "tusk", 1], ["pledge", "", "orca", 0], ["pledge", "", "gray", 0], ["waive", "", "tusk", 0]]),
      prio: {
        gray: [["kelp", "shut", 3], ["ice", "shut", 2], ["reef", "shut", 1]],
        tusk: [["ice", "shut", 3], ["reef", "shut", 2], ["kelp", "open", 1]],
        orca: [["kelp", "shut", 3], ["deep", "open", 2], ["reef", "shut", 1]],
      },
      start: [{ id: "gray", trust: 34, owed: 5 }, { id: "tusk", trust: 35, owed: 5 }, { id: "orca", trust: 37, owed: 5 }],
      lines: { high: [[4], [], [], [1, 5], [], []], mid: [[2, 4], [], [], [1, 5], [], []], low: [[2, 4], [], [1], [3], [], []] },
    },
    {
      /* The last hall is the whole ladder at once: the treaty needs every one of
       * the six packages carried, there is no mercy in the hall, and only the
       * expensive motions are dealt at all. Two pods claim the open trench as
       * their top wish while the herd wants the ice bay quiet, so the same hand
       * that carries one pair crosses the third, and every crossing is paid for
       * out of a trust cushion that starts in the thirties and low forties. */
      id: "w20", labelKey: "whpP20", twistKey: "whpTwist20", maxCards: 2, need: 6, mercy: false, seed: 398283,
      decks: ["hunters", "narrowRun", "strait", "wide", "bothWays", "lockstep", "free"],
      hand: whpHand([["grant", "deep", "gray", 1], ["grant", "deep", "orca", 1], ["restrict", "deep", "tusk", 2], ["restrict", "ice", "tusk", 1], ["pledge", "", "gray", 0], ["waive", "", "tusk", 0]]),
      prio: {
        gray: [["deep", "open", 3], ["kelp", "open", 2], ["reef", "open", 1]],
        tusk: [["ice", "shut", 3], ["deep", "mine", 2], ["kelp", "shut", 1]],
        orca: [["deep", "open", 3], ["ice", "shut", 2], ["kelp", "open", 1]],
      },
      start: [{ id: "gray", trust: 38, owed: 0 }, { id: "tusk", trust: 43, owed: 1 }, { id: "orca", trust: 37, owed: 1 }],
      lines: { high: [[], [4, 5], [1, 2], [], [], []], mid: [[], [4, 5], [1, 2], [3], [], []], low: [[], [4, 5], [1, 2], [], [3], []] },
    },
  ];

  /* ---------------- pure core ---------------- */

  /* Seeded xorshift: a parliament built from the same seed deals the same plan
   * order every time, so a scripted line always replays identically. */
  function whpPrng(seed) {
    var s = (Number(seed) || 0) | 0;
    if (!s) {
      s = 0x5eef123;
    }
    return function () {
      s ^= s << 13;
      s ^= s >>> 17;
      s ^= s << 5;
      s = s | 0;
      return ((s >>> 0) % 100000) / 100000;
    };
  }

  function whpShuffle(list, rand) {
    var out = list.slice();
    for (var i = out.length - 1; i > 0; i -= 1) {
      var j = Math.min(i, Math.floor(rand() * (i + 1)));
      var keep = out[i];
      out[i] = out[j];
      out[j] = keep;
    }
    return out;
  }

  function whpInt(value) {
    var n = Math.round(Number(value));
    return isFinite(n) ? n : 0;
  }

  function whpClamp(value, low, high) { return value < low ? low : value > high ? high : value; }

  function whpTopPriority(faction) {
    var list = (faction && faction.prio) || [];
    var best = null;
    for (var i = 0; i < list.length; i += 1) {
      if (!best || list[i][2] > best[2]) { best = list[i]; }
    }
    return best;
  }

  function whpTopFit(plan, faction) {
    var top = whpTopPriority(faction);
    return top ? whpFit(plan.lanes[top[0]], faction.id, top[1]) : 0;
  }

  function whpFirst(list, test) {
    var hit = (list || []).filter(test);
    return hit.length ? hit[0] : null;
  }

  function whpFaction(state, id) {
    return whpFirst((state && state.factions) || [], function (fac) { return fac.id === id; });
  }

  function whpSeated(state) {
    return ((state && state.factions) || []).filter(function (fac) { return !!fac.seated; });
  }

  function whpPriorityOn(faction, corr) {
    return whpFirst(faction.prio || [], function (row) { return row[0] === corr; });
  }

  /* App.parliamentScore: the deterministic vote of one faction - the weight of
   * its wishes against the package, plus its memory of the speaker. An unpaid
   * favour bites hardest when the package crosses that pod outright. */
  function parliamentScore(plan, faction) {
    if (!plan || !faction || !plan.lanes) {
      return 0;
    }
    var priorities = faction.prio || [];
    var affinity = 0;
    var topWeight = -1;
    var topFit = 0;
    for (var i = 0; i < priorities.length; i += 1) {
      var row = priorities[i];
      var weight = whpInt(row[2]);
      var fit = whpFit(plan.lanes[row[0]], faction.id, row[1]);
      affinity += weight * fit;
      if (weight > topWeight) {
        topWeight = weight;
        topFit = fit;
      }
    }
    var trustTerm = whpClamp(Math.floor((whpInt(faction.trust) - 45) / 22), -3, 2);
    var owed = whpInt(faction.owed);
    var debtTerm = topFit === 1 ? 0 : topFit === -1 ? -Math.min(3, owed) : -Math.min(1, owed);
    var grudgeTerm = topFit === -1 ? -Math.min(2, whpInt(faction.grudge)) : 0;
    var pledge = faction.pledge;
    var pledgeTerm = 0;
    if (pledge && pledge.live) {
      var pfit = whpFit(plan.lanes[pledge.c], faction.id, pledge.want);
      pledgeTerm = pfit === 1 ? 3 : pfit === -1 ? -5 : 0;
    }
    return whpInt(affinity + trustTerm + debtTerm + grudgeTerm + pledgeTerm);
  }

  /* The three words a vote can land on, always printed with its number. */
  function whpStance(score) {
    var n = whpInt(score);
    return n > 0 ? "yea" : n < 0 ? "nay" : "even";
  }

  function whpStanceKey(score) {
    return whpStance(score) === "yea" ? "whpStanceYea" : whpStance(score) === "nay" ? "whpStanceNay" : "whpStanceEven";
  }

  function whpTrustKey(trust) {
    var n = whpInt(trust);
    for (var i = 0; i < WHP_TRUST_BANDS.length; i += 1) {
      if (n < WHP_TRUST_BANDS[i]) {
        return WHP_TRUST_KEYS[i];
      }
    }
    return WHP_TRUST_KEYS[WHP_TRUST_KEYS.length - 1];
  }

  /* App.parliamentTrustFloor: the lowest trust still holding a seat. */
  function parliamentTrustFloor(state) {
    var seated = whpSeated(state);
    var floor = WHP_TRUST_CEIL;
    seated.forEach(function (fac) { floor = Math.min(floor, whpInt(fac.trust)); });
    return seated.length ? whpInt(floor) : 0;
  }

  function whpLanes(source) {
    var lanes = {};
    WHP_CORRIDORS.forEach(function (corr) {
      lanes[corr] = source(corr);
    });
    return lanes;
  }

  function whpPlanInstance(name) {
    var def = whpPlans[name] || whpPlans.wide;
    return {
      name: name,
      key: def[0],
      value: whpInt(def[1]),
      goal: { c: def[2][0], want: def[2][1] },
      lanes: whpLanes(function (corr) { return whpLaneOf(def[3][corr]); }),
    };
  }

  function whpClonePlan(plan) {
    return {
      name: plan.name,
      key: plan.key,
      value: whpInt(plan.value),
      goal: { c: plan.goal.c, want: plan.goal.want },
      lanes: whpLanes(function (corr) { return (plan.lanes[corr] || []).slice(); }),
    };
  }

  function whpCloneFaction(faction) {
    var pledge = faction.pledge;
    return {
      id: faction.id, trust: whpInt(faction.trust), owed: whpInt(faction.owed),
      grudge: whpInt(faction.grudge), seated: !!faction.seated, prio: faction.prio,
      pledge: pledge ? { c: pledge.c, want: pledge.want, born: whpInt(pledge.born), age: whpInt(pledge.age), live: !!pledge.live } : null,
    };
  }

  function whpCloneCard(card) {
    return { id: card.id, kind: card.kind, c: card.c, target: card.target, cost: whpInt(card.cost), spent: !!card.spent };
  }

  /* Session fields that describe the parliament rather than its progress. */
  function whpSkeleton(state) {
    return {
      pid: state.pid, rounds: state.rounds, maxCards: whpInt(state.maxCards),
      need: whpInt(state.need), mercy: !!state.mercy, order: state.order.slice(),
    };
  }

  function whpCloneState(state) {
    var next = whpSkeleton(state);
    next.round = whpInt(state.round);
    next.score = whpInt(state.score);
    next.adopted = whpInt(state.adopted);
    next.status = state.status;
    next.over = state.over;
    next.plan = whpClonePlan(state.plan);
    next.hand = state.hand.map(whpCloneCard);
    next.factions = state.factions.map(whpCloneFaction);
    next.last = null;
    return next;
  }

  /* App.parliamentStart: the opening session of a parliament. */
  function parliamentStart(level) {
    var def = level || whpLevels[0];
    var order = whpShuffle(def.decks, whpPrng(def.seed));
    var start = whpSkeleton({
      pid: def.id, rounds: WHP_ROUNDS, maxCards: def.maxCards, need: def.need, mercy: def.mercy, order: order,
    });
    start.round = 1;
    start.score = 0;
    start.adopted = 0;
    start.status = "vote";
    start.over = null;
    start.plan = whpPlanInstance(order[0]);
    start.hand = def.hand.map(whpCloneCard);
    start.factions = def.start.map(function (row) {
      return { id: row.id, trust: whpInt(row.trust), owed: whpInt(row.owed), grudge: 0, seated: true, prio: def.prio[row.id] || [], pledge: null };
    });
    start.last = null;
    return start;
  }

  function whpFindCard(state, id) {
    return whpFirst((state && state.hand) || [], function (card) { return card.id === whpInt(id); });
  }

  /* Is an offer still on the table? Every "no" carries the word the hall says. */
  function parliamentCardOk(state, card, picks) {
    var found = typeof card === "number" || typeof card === "string" ? whpFindCard(state, card) : card;
    if (!state || !found) { return { ok: false, why: "whpBlockGone" }; }
    if (state.status !== "vote") { return { ok: false, why: "whpBlockOver" }; }
    if (found.spent) { return { ok: false, why: "whpBlockSpent" }; }
    var chosen = picks || [];
    if (chosen.indexOf(found.id) === -1 && chosen.length >= whpInt(state.maxCards)) {
      return { ok: false, why: "whpBlockLimit" };
    }
    var faction = whpFaction(state, found.target);
    if (!faction) { return { ok: false, why: "whpBlockGone" }; }
    /* A pod that was promised over stops accepting promises. */
    if (found.kind === "pledge" && whpInt(faction.grudge) > 0) { return { ok: false, why: "whpBlockRefuse" }; }
    if (found.kind === "waive" && whpInt(faction.owed) <= 0) { return { ok: false, why: "whpBlockClear" }; }
    var lane = state.plan.lanes[found.c];
    if ((found.kind === "grant" || found.kind === "restrict") && !lane) { return { ok: false, why: "whpBlockGone" }; }
    lane = lane || [];
    if (found.kind === "grant" && whpHas(lane, found.target)) { return { ok: false, why: "whpBlockAlready" }; }
    if (found.kind === "restrict" && !whpHas(lane, found.target)) { return { ok: false, why: "whpBlockAlready" }; }
    return { ok: true, why: "" };
  }

  function whpAddTrust(faction, delta) {
    faction.trust = whpClamp(whpInt(faction.trust) + whpInt(delta), 0, WHP_TRUST_CEIL);
    return faction.trust;
  }

  /* Playing one offer: it amends this round's package and writes the ledger. */
  function whpApplyCard(state, card, log) {
    card.spent = true;
    var faction = whpFaction(state, card.target);
    if (!faction) {
      return;
    }
    if (card.kind === "grant" || card.kind === "restrict") {
      var before = (state.plan.lanes[card.c] || []).slice();
      var after = card.kind === "grant" ? whpUnion(before, card.target) : whpWithout(before, card.target);
      state.plan.lanes[card.c] = after;
      whpSeated(state).forEach(function (other) {
        var prio = whpPriorityOn(other, card.c);
        if (!prio) {
          return;
        }
        var delta = (whpFit(after, other.id, prio[1]) - whpFit(before, other.id, prio[1])) * whpInt(card.cost);
        if (delta > 0 && whpInt(other.owed) > 0) {
          /* A gift from a debtor is worth less: the favour is still owed. */
          delta -= Math.min(2, whpInt(other.owed));
        }
        if (delta !== 0) {
          whpAddTrust(other, delta);
          log.push({ id: other.id, trust: delta });
        }
      });
      return;
    }
    if (card.kind === "pledge") {
      var top = whpTopPriority(faction);
      if (!top) {
        return;
      }
      faction.pledge = { c: top[0], want: top[1], born: whpInt(state.round), age: 0, live: false };
      whpAddTrust(faction, 3);
      log.push({ id: faction.id, trust: 3 });
      return;
    }
    if (card.kind === "waive") {
      faction.owed = Math.max(0, whpInt(faction.owed) - 1);
      faction.grudge = whpInt(faction.grudge) + 1;
      whpAddTrust(faction, -3);
      log.push({ id: faction.id, trust: -3 });
    }
  }

  /* The round's goal is stricter than a pod's wish: the whole hall gets through,
   * or nobody does. */
  function whpGoalHit(plan) {
    var lane = plan.lanes[plan.goal.c] || [];
    if (plan.goal.want === "open") {
      return lane.length >= WHP_FACTION_IDS.length;
    }
    return plan.goal.want === "shut" ? lane.length === 0 : lane.length === 1;
  }

  function whpBlankLedger() {
    return { played: [], costs: [], debts: [], kept: [], broke: [], aged: [], walked: [], returned: [] };
  }

  function whpVoteOf(votes, id) {
    for (var i = 0; i < votes.length; i += 1) {
      if (votes[i].id === id) {
        return whpInt(votes[i].score);
      }
    }
    return 0;
  }

  /* App.parliamentRound: the whole turn. Cards amend the package, the seated
   * pods weigh it against their priorities and their memory of you, then the
   * ledger is written: favours owed, pledges kept or broken, trust, walkouts. */
  function parliamentRound(state, cardsPlayed) {
    if (!state || state.status !== "vote") {
      return state;
    }
    var next = whpCloneState(state);
    var ledger = whpBlankLedger();
    var requests = cardsPlayed && cardsPlayed.length ? cardsPlayed : [];
    var limit = Math.max(0, whpInt(next.maxCards));
    for (var i = 0; i < requests.length && ledger.played.length < limit; i += 1) {
      var card = whpFindCard(next, requests[i]);
      if (card && parliamentCardOk(next, card, []).ok) {
        whpApplyCard(next, card, ledger.costs);
        ledger.played.push(card.id);
      }
    }

    if (next.mercy) {
      /* The second seat: a pod that left the hall comes back the moment an
       * offer serves the wish it walked out over, and it votes that round. */
      next.factions.forEach(function (gone) {
        if (!gone.seated && whpTopFit(next.plan, gone) === 1) {
          gone.seated = true;
          gone.trust = 25;
          gone.grudge = 0;
          ledger.returned.push(gone.id);
        }
      });
    }

    var seated = whpSeated(next);
    var votes = [];
    var yea = 0;
    seated.forEach(function (fac) {
      var score = parliamentScore(next.plan, fac);
      votes.push({ id: fac.id, score: score, stance: whpStance(score) });
      if (score > 0) {
        yea += 1;
      }
    });
    var nay = seated.length - yea;
    var adopted = seated.length >= 2 && yea >= Math.min(2, seated.length);
    var gain = 0;

    if (adopted) {
      gain = whpInt(next.plan.value) + (whpGoalHit(next.plan) ? WHP_GOAL_BONUS : 0) + yea;
      next.score = whpInt(next.score + gain);
      next.adopted = whpInt(next.adopted + 1);
    }
    next.factions.forEach(function (fac) {
      if (!fac.seated) {
        return;
      }
      var vote = whpVoteOf(votes, fac.id) > 0 ? 1 : -1;
      if (!adopted) {
        whpAddTrust(fac, -1);
        return;
      }
      if (whpTopFit(next.plan, fac) === 1) {
        whpAddTrust(fac, 2 + vote);
        fac.owed = Math.max(0, whpInt(fac.owed) - 1);
      } else {
        /* The deal passed without you: the hall remembers the favour. */
        fac.owed = whpInt(fac.owed) + 1;
        whpAddTrust(fac, -1 + vote);
        ledger.debts.push({ id: fac.id, n: 1 });
      }
    });

    /* A live pledge is answered by every round it stands: delivered, crossed,
     * or left waiting on the floor until it dies there. */
    next.factions.forEach(function (holder) {
      var pledge = holder.pledge;
      if (!holder.seated || !pledge || !pledge.live) {
        return;
      }
      var fit = adopted ? whpFit(next.plan.lanes[pledge.c], holder.id, pledge.want) : 0;
      if (fit === 1) {
        holder.pledge = null;
        holder.owed = Math.max(0, whpInt(holder.owed) - 1);
        whpAddTrust(holder, 4);
        ledger.kept.push(holder.id);
      } else if (fit === -1) {
        holder.pledge = null;
        holder.grudge = whpInt(holder.grudge) + 1;
        whpAddTrust(holder, -8);
        ledger.broke.push(holder.id);
      } else {
        holder.pledge.age = whpInt(holder.pledge.age) + 1;
        if (holder.pledge.age >= 2) {
          holder.pledge = null;
          holder.grudge = whpInt(holder.grudge) + 1;
          whpAddTrust(holder, -4);
          ledger.aged.push(holder.id);
        }
      }
    });

    /* A promise made this round only starts to count from the next one. */
    next.factions.forEach(function (armed) {
      if (armed.pledge && !armed.pledge.live) {
        armed.pledge.live = true;
      }
    });

    /* Zero trust leaves the hall; only a mercy parliament survives it. */
    next.factions.forEach(function (check) {
      if (check.seated && whpInt(check.trust) <= 0) {
        check.seated = false;
        check.pledge = null;
        ledger.walked.push(check.id);
      }
    });

    next.last = {
      round: whpInt(next.round), plan: next.plan.name, planKey: next.plan.key,
      lanes: next.plan.lanes, votes: votes, yea: yea, nay: nay, adopted: adopted,
      gain: gain, seated: whpSeated(next).length,
      played: ledger.played, costs: ledger.costs, debts: ledger.debts,
      kept: ledger.kept, broke: ledger.broke, aged: ledger.aged,
      walked: ledger.walked, returned: ledger.returned,
    };

    if (ledger.walked.length && !next.mercy) {
      next.status = "lost";
      next.over = "walkout";
      return next;
    }
    if (next.last.seated < 2) {
      next.status = "lost";
      next.over = "empty";
      return next;
    }
    if (next.round >= next.rounds) {
      next.status = next.adopted >= next.need ? "won" : "lost";
      next.over = next.adopted >= next.need ? null : "treaty";
      return next;
    }
    next.round = whpInt(next.round + 1);
    next.plan = whpPlanInstance(next.order[next.round - 1] || next.order[0]);
    return next;
  }

  /* Replay a scripted line - one array of card ids per round - end to end, and
   * keep what the ledger wrote on the way. The score is only half of the proof:
   * a parliament whose favours, promises, grudges and walkouts never move is a
   * parliament whose twist is decoration. */
  function whpBlankTwist() {
    return { played: 0, debts: 0, costs: 0, kept: 0, broke: 0, aged: 0, walked: 0, returned: 0 };
  }

  function whpTwistRow(last, twist) {
    if (!last) {
      return twist;
    }
    twist.played += last.played.length;
    twist.debts += last.debts.length;
    twist.costs += last.costs.length;
    twist.kept += last.kept.length;
    twist.broke += last.broke.length;
    twist.aged += last.aged.length;
    twist.walked += last.walked.length;
    twist.returned += last.returned.length;
    return twist;
  }

  /* The same parliament with its opening favours struck out: the only difference
   * between the two runs is the ledger, so a score that moves proves the debts
   * bind this configuration instead of merely decorating it. */
  function whpDebtFree(level) {
    return {
      id: level.id, labelKey: level.labelKey, twistKey: level.twistKey,
      maxCards: level.maxCards, need: level.need, mercy: level.mercy, seed: level.seed,
      decks: level.decks, hand: level.hand, prio: level.prio, lines: level.lines,
      start: level.start.map(function (row) { return { id: row.id, trust: row.trust, owed: 0 }; }),
    };
  }

  /* Does the memory actually change a vote? Weigh one pod's ballot twice: once
   * with the favours, grudges and live promise it carries, once with the very
   * same pod on a clean ledger. A flipped stance is a debt that bound this hall. */
  function whpDebtFlips(plan, faction) {
    if (!plan || !faction || !faction.seated) {
      return false;
    }
    if (!whpInt(faction.owed) && !whpInt(faction.grudge) && !(faction.pledge && faction.pledge.live)) {
      return false;
    }
    var carrying = parliamentScore(plan, faction) > 0;
    var clean = whpCloneFaction(faction);
    clean.owed = 0;
    clean.grudge = 0;
    clean.pledge = null;
    return (parliamentScore(plan, clean) > 0) !== carrying;
  }

  function whpReplay(level, line) {
    var st = parliamentStart(level);
    var rows = line || [];
    var steps = 0;
    var twist = whpBlankTwist();
    var flips = 0;
    for (var i = 0; i < rows.length && st.status === "vote"; i += 1) {
      st.factions.forEach(function (fac) {
        if (whpDebtFlips(st.plan, fac)) {
          flips += 1;
        }
      });
      st = parliamentRound(st, rows[i] || []);
      whpTwistRow(st.last, twist);
      steps += 1;
      if (st.status !== "vote") {
        break;
      }
    }
    return {
      solved: st.status === "won", status: st.status, over: st.over,
      score: whpInt(st.score), adopted: whpInt(st.adopted),
      minTrust: parliamentTrustFloor(st), rounds: steps, line: line, state: st,
      twist: twist, flips: flips,
      owed: st.factions.reduce(function (sum, fac) { return sum + whpInt(fac.owed); }, 0),
      grudge: st.factions.reduce(function (sum, fac) { return sum + whpInt(fac.grudge); }, 0),
    };
  }

  /* App.parliamentSolvable: prove that a parliament's scripted six-round lines
   * reach the target with no walkout, report the scores they measured, and show
   * that the ledger - not the deck alone - decided the session. */
  function parliamentSolvable(parliament) {
    var level = parliament || whpLevels[0];
    var lines = level.lines || {};
    var names = ["high", "mid", "low"];
    var runs = {};
    var best = null;
    for (var i = 0; i < names.length; i += 1) {
      runs[names[i]] = whpReplay(level, lines[names[i]] || []);
      if (runs[names[i]].solved && (!best || runs[names[i]].score > best.score)) {
        best = runs[names[i]];
      }
    }
    /* The winning line run again through the same hall with its opening favours
     * struck out: only the ledger differs, so a score that moves was earned
     * against debt rather than handed out by the deck. */
    var twin = whpReplay(whpDebtFree(level), best ? best.line : lines.high || []);
    var verdict = best || runs.high;
    var twist = verdict.twist;
    var wrote = twist.debts + twist.kept + twist.broke + twist.aged + twist.walked + twist.returned;
    return {
      solved: !!best,
      id: level.id,
      score: best ? best.score : runs.high.score,
      bands: [runs.high.score, runs.mid.score, runs.low.solved ? runs.low.score : 0],
      runs: runs,
      need: whpInt(level.need),
      adopted: verdict.adopted,
      minTrust: verdict.minTrust,
      flips: verdict.flips,
      twist: twist,
      debtDelta: verdict.score - twin.score,
      binds: !!best && (verdict.flips > 0 || wrote > 0),
    };
  }

  /* The star bands are exactly the three scripted lines' measured scores, so no
   * band here is invented: it is what the exported resolver says the line got.
   * Every rung of the ladder is re-measured this way at load, and each proof row
   * carries the treaty target beside the best-line score it measured, so the
   * demand ramp can be read straight off App.parliamentProofs. */
  var whpProofs = [];
  (function measureBands() {
    for (var i = 0; i < whpLevels.length; i += 1) {
      var proof = parliamentSolvable(whpLevels[i]);
      var high = Math.max(1, proof.bands[0]);
      var mid = Math.min(high, Math.max(1, proof.bands[1]));
      var low = Math.min(mid, Math.max(1, proof.bands[2]));
      whpLevels[i].starScore = [high, mid, low];
      whpProofs.push({
        id: proof.id, solved: proof.solved, binds: proof.binds, bands: whpLevels[i].starScore,
        score: proof.score, need: proof.need, demand: whpInt(proof.need) ? high / whpInt(proof.need) : high,
        adopted: proof.adopted, minTrust: proof.minTrust, flips: proof.flips, twist: proof.twist,
        debtDelta: proof.debtDelta,
      });
    }
  })();

  /* ---------------- the drawer panel ---------------- */

  /* DOM is assembled with createElement everywhere, so the headless harness and
   * the browser build the same tree. */
  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) { node.className = cls; }
    if (text !== undefined) { node.textContent = text; }
    return node;
  }

  /* A labelled node carries data-i18n like the shipped markup, so the shared
   * language pass can rewrite it when the drawer changes tongue. */
  function tr(key, tag, cls) {
    var node = el(tag || "span", cls);
    node.setAttribute("data-i18n", key);
    node.textContent = t(key);
    return node;
  }

  function initWhaleParliamentGame(panelEl) {
    if (!panelEl) {
      return;
    }

    var campaign = createCampaign({ key: "whale-parliament-campaign", levels: whpLevels });
    var level = whpLevels[Math.max(0, campaign.indexOf(campaign.nextLevelId()))];
    var state = parliamentStart(level);
    var picks = [];
    var cursor = 0;

    var roundEl = el("strong");
    var voteEl = el("strong");
    var scoreEl = el("strong");
    var floorEl = el("strong");
    var hud = el("div", "game-hud");
    hud.appendChild(stat("whpStatRound", roundEl));
    hud.appendChild(stat("whpStatVotes", voteEl));
    hud.appendChild(stat("whpStatScore", scoreEl));
    hud.appendChild(stat("whpStatFloor", floorEl));

    var board = el("div", "whp-board");
    board.setAttribute("tabindex", "0");
    board.setAttribute("role", "group");
    board.setAttribute("aria-label", t("whpBoardLabel"));
    var floorSec = section("whpSecFloor", "whp-floor", board);
    var laneSec = section("whpSecLanes", "whp-lanes", board);
    var hallSec = section("whpSecHall", "whp-hall", board);
    var handSec = section("whpSecHand", "whp-hand", board);
    var sideRow = el("div", "whp-side");
    var clearBtn = sideButton("whpBtnClear", "whp-clear", sideRow);
    var restartBtn = sideButton("whpBtnRestart", "whp-restart", sideRow);
    board.appendChild(sideRow);

    var result = el("p", "game-result");
    result.setAttribute("role", "status");

    /* Campaign picker in the shared row/label/select shape the shipped panels use. */
    var pickerRow = el("div", "elements-row");
    var pickerLabel = tr("whpSelLabel", "label", "elements-label");
    pickerLabel.setAttribute("for", "whpParliamentSel");
    var pickerSel = el("select", "elements-select");
    pickerSel.id = "whpParliamentSel";
    pickerRow.appendChild(pickerLabel);
    pickerRow.appendChild(pickerSel);

    var voteLabel = tr("whpBtnVote");
    var voteContent = el("span", "button-content");
    voteContent.appendChild(voteLabel);
    var voteBtn = el("button", "primary");
    voteBtn.type = "button";
    voteBtn.appendChild(voteContent);
    var bestEl = el("p", "game-best");
    var actions = el("div", "game-actions");
    actions.appendChild(voteBtn);
    actions.appendChild(bestEl);

    var hint = tr("whpHint", "p", "game-hint");

    [hud, board, result, pickerRow, actions, hint].forEach(function (node) {
      panelEl.appendChild(node);
    });

    function stat(key, valueNode) {
      var box = el("div", "game-stat");
      box.appendChild(tr(key));
      box.appendChild(valueNode);
      return box;
    }

    function section(key, cls, parent) {
      var wrap = el("div", "whp-sec " + cls);
      var body = el("div", "whp-body");
      wrap.appendChild(tr(key, "p", "whp-title"));
      wrap.appendChild(body);
      parent.appendChild(wrap);
      return { wrap: wrap, body: body };
    }

    function sideButton(key, cls, parent) {
      var btn = el("button", "whp-btn " + cls);
      btn.type = "button";
      btn.appendChild(tr(key));
      parent.appendChild(btn);
      return btn;
    }

    function addText(parent, cls, text) {
      var node = el("span", cls, text);
      parent.appendChild(node);
      return node;
    }

    function addLine(parent, cls, text) { parent.appendChild(el("p", cls, text)); }

    function facName(id) { return t(WHP_FAC_KEY[id] || "whpFGray"); }

    function corrName(corr) { return t(WHP_CORR_KEY[corr] || "whpCdeep"); }

    function wantWord(want) { return t(WHP_WANT_KEY[want] || "whpWantOpen"); }

    function fitWord(fit) { return t(WHP_FIT_KEY[fit + 1] || "whpFitMid"); }

    function nameList(ids) { return (ids || []).map(facName).join(", "); }

    function cardText(card) {
      if (card.kind === "pledge") { return t("whpCardPledge", { fac: facName(card.target) }); }
      if (card.kind === "waive") { return t("whpCardWaive", { fac: facName(card.target) }); }
      var args = { corr: corrName(card.c), fac: facName(card.target) };
      return card.kind === "grant" ? t("whpCardGrant", args) : t("whpCardRestrict", args);
    }

    function cardCostWord(card) {
      if (card.kind === "pledge") { return t("whpCostPledge"); }
      if (card.kind === "waive") { return t("whpCostWaive"); }
      return t("whpCostTrust", { n: whpInt(card.cost) });
    }

    function blockWord(card) {
      var check = parliamentCardOk(state, card, picks);
      if (check.ok) { return ""; }
      if (check.why === "whpBlockRefuse") { return t("whpBlockRefuse", { fac: facName(card.target) }); }
      return t(check.why || "whpBlockGone");
    }

    function accessWords(lane) {
      var list = lane || [];
      if (!list.length) { return t("whpLaneNone"); }
      if (list.length >= WHP_FACTION_IDS.length) { return t("whpLaneAll"); }
      return t("whpLaneOpen", { facs: list.map(facName).join(", ") });
    }

    /* --- rendering: the hall reads as words and numbers, never colour alone --- */

    function preview(session) {
      var yea = 0;
      var seated = whpSeated(session);
      seated.forEach(function (fac) {
        if (parliamentScore(session.plan, fac) > 0) {
          yea += 1;
        }
      });
      return { yea: yea, nay: seated.length - yea, seats: seated.length };
    }

    function renderHud() {
      var votes = preview(state);
      var floor = parliamentTrustFloor(state);
      roundEl.textContent = t("whpRoundRow", { n: state.round, total: state.rounds, plan: t(state.plan.key) });
      voteEl.textContent = t("whpVoteRow", { yea: votes.yea, nay: votes.nay });
      scoreEl.textContent = t("whpScoreRow", { n: state.score, need: state.need, done: state.adopted });
      floorEl.textContent = t("whpTrustRow", { word: t(whpTrustKey(floor)), n: floor });
    }

    function renderFloor() {
      var body = floorSec.body;
      var votes = preview(state);
      var need = Math.min(2, votes.seats);
      body.replaceChildren();
      addLine(body, "whp-floor-hall", t(level.labelKey) + " \u00b7 " + t(level.twistKey));
      addLine(body, "whp-floor-line", t("whpPlanRow", { name: t(state.plan.key), corr: corrName(state.plan.goal.c), want: wantWord(state.plan.goal.want), n: state.plan.value }));
      addLine(body, "whp-floor-line", t("whpPickRow", {
        word: votes.yea >= need ? t("whpStanceYea") : t("whpStanceNay"),
        need: need, yea: votes.yea, seats: votes.seats,
        left: Math.max(0, whpInt(state.maxCards) - picks.length), max: state.maxCards,
      }));
    }

    function renderLanes() {
      var body = laneSec.body;
      var seated = whpSeated(state);
      body.replaceChildren();
      WHP_CORRIDORS.forEach(function (corr) {
        var lane = state.plan.lanes[corr] || [];
        var marks = [];
        seated.forEach(function (fac) {
          var prio = whpPriorityOn(fac, corr);
          if (prio) {
            var fit = whpFit(lane, fac.id, prio[1]);
            marks.push(facName(fac.id) + " " + wantWord(prio[1]) + " " + fitWord(fit) + " " + fit + "/" + prio[2]);
          }
        });
        var row = el("p", "whp-lane");
        addText(row, "whp-lane-name", corrName(corr));
        addText(row, "whp-lane-state", accessWords(lane) + " (" + lane.length + "/" + WHP_FACTION_IDS.length + ")");
        addText(row, "whp-lane-fits", marks.length ? marks.join(" \u00b7 ") : t("whpLaneQuiet"));
        body.appendChild(row);
      });
    }

    function renderHall() {
      var body = hallSec.body;
      body.replaceChildren();
      state.factions.forEach(function (fac) {
        var score = fac.seated ? parliamentScore(state.plan, fac) : 0;
        var row = el("p", fac.seated ? "whp-fac" : "whp-fac is-out");
        var cells = [
          ["whp-fac-name", facName(fac.id)],
          ["whp-fac-stance", fac.seated ? t(whpStanceKey(score)) + " " + score : t("whpGoneWord")],
          ["whp-fac-trust", t(whpTrustKey(fac.trust)) + " " + whpInt(fac.trust)],
          ["whp-fac-owed", whpInt(fac.owed) > 0 ? t("whpFavourOwed", { n: whpInt(fac.owed) }) : t("whpFavourClear")],
          ["whp-fac-pledge", fac.pledge ? t("whpPledgeWord", { corr: corrName(fac.pledge.c), want: wantWord(fac.pledge.want) }) : t("whpPledgeNone")],
        ];
        if (whpInt(fac.grudge) > 0) {
          cells.push(["whp-fac-grudge", t("whpGrudgeWord", { n: whpInt(fac.grudge) })]);
        }
        cells.forEach(function (cell) {
          addText(row, cell[0], cell[1]);
        });
        var bar = el("span", "whp-bar");
        var fill = el("span", "whp-bar-fill");
        fill.style.width = whpClamp(whpInt(fac.trust), 0, 100) + "%";
        bar.appendChild(fill);
        row.appendChild(bar);
        body.appendChild(row);
        addLine(body, "whp-prio", (fac.prio || []).map(function (prio) {
          return t("whpPriorityRow", { corr: corrName(prio[0]), want: wantWord(prio[1]), n: whpInt(prio[2]) });
        }).join(" \u00b7 "));
      });
    }

    function renderHand() {
      var body = handSec.body;
      body.replaceChildren();
      state.hand.forEach(function (card, index) {
        var chosen = picks.indexOf(card.id) !== -1;
        var blocked = parliamentCardOk(state, card, picks);
        var cls = "whp-card";
        if (index === cursor) {
          cls += " is-cursor";
        }
        if (chosen) {
          cls += " is-chosen";
        }
        if (!blocked.ok) {
          cls += " is-blocked";
        }
        var btn = el("button", cls);
        btn.type = "button";
        btn.disabled = !blocked.ok && !chosen;
        btn.setAttribute("aria-pressed", chosen ? "true" : "false");
        addText(btn, "whp-card-key", String(index + 1) + " \u00b7 " + t(WHP_KIND_KEY[card.kind] || "whpKindGrant"));
        addText(btn, "whp-card-text", cardText(card));
        addText(btn, "whp-card-cost", blockWord(card) || (chosen ? t("whpChosen") : cardCostWord(card)));
        btn.addEventListener("click", function () {
          toggleCard(card.id);
        });
        body.appendChild(btn);
      });
    }

    function render() {
      renderHud();
      renderFloor();
      renderLanes();
      renderHall();
      renderHand();
      var key = state.status === "vote" ? "whpBtnVote" : "btnNewRound";
      voteLabel.setAttribute("data-i18n", key);
      voteLabel.textContent = t(key);
      refreshPicker();
    }

    function refreshPicker() {
      fillCampaignPicker(pickerSel, campaign, function (def) {
        return t(def.labelKey);
      }, t("elementsLocked"));
      pickerSel.value = level.id;
      bestEl.textContent = t("campaignStars", { n: campaign.totalStars(), max: campaign.maxStars() });
    }

    function toggleCard(id) {
      if (state.status !== "vote") { return; }
      var at = picks.indexOf(id);
      if (at !== -1) {
        picks.splice(at, 1);
        render();
        return;
      }
      var card = whpFindCard(state, id);
      if (!card || !parliamentCardOk(state, card, picks).ok) { return; }
      picks.push(id);
      cursor = state.hand.indexOf(card);
      render();
    }

    function clearPicks() {
      picks = [];
      render();
    }

    /* What the hall just did, in the same words the panel reads everywhere else. */
    function narrate(last) {
      if (!last) {
        return "";
      }
      var parts = [last.adopted
        ? t("whpAdopted", { yea: whpInt(last.yea), nay: whpInt(last.nay), gain: whpInt(last.gain), name: t(last.planKey) })
        : t("whpFailed", { yea: whpInt(last.yea), nay: whpInt(last.nay), name: t(last.planKey) })];
      addNote(parts, last.played.length, t("whpPlayedNote", { list: last.played.join(",") }));
      addNote(parts, last.debts.length, t("whpDebtNote", {
        list: last.debts.map(function (d) { return facName(d.id) + " " + whpInt(d.n); }).join(", "),
      }));
      addNote(parts, last.costs.length, t("whpCostNote", {
        list: last.costs.map(function (c) { return facName(c.id) + " " + whpInt(c.trust); }).join(", "),
      }));
      addNote(parts, last.kept.length, t("whpPledgeKept", { fac: nameList(last.kept) }));
      addNote(parts, last.broke.length, t("whpPledgeBroken", { fac: nameList(last.broke) }));
      addNote(parts, last.aged.length, t("whpPledgeLost", { fac: nameList(last.aged) }));
      addNote(parts, last.returned.length, t("whpReturn", { fac: nameList(last.returned) }));
      addNote(parts, last.walked.length, t("whpWalkout", { fac: nameList(last.walked) }));
      return parts.join(" ");
    }

    function addNote(parts, count, sentence) {
      if (count) { parts.push(sentence); }
    }

    function commit() {
      if (state.status !== "vote") {
        startSession(level);
        return;
      }
      /* The same resolver, run on a copy: what the hall says afterwards is
       * exactly what the offers were going to do, so no cost is a surprise. */
      var next = parliamentRound(state, picks);
      if (!next || next === state) {
        return;
      }
      state = next;
      picks = [];
      cursor = 0;
      var text = narrate(state.last);
      if (state.status === "won") {
        text += " " + finish(state.score);
      } else if (state.status === "lost") {
        text += " " + loseText();
      } else {
        text += " " + t("whpNextPlan", { n: state.round, total: state.rounds, name: t(state.plan.key) });
      }
      render();
      result.textContent = text;
    }

    function loseText() {
      if (state.over === "treaty") {
        return t("whpLostTreaty", { n: state.adopted, need: state.need });
      }
      if (state.over === "empty") {
        return t("whpLostEmpty");
      }
      var out = state.factions.filter(function (fac) {
        return !fac.seated;
      }).map(function (fac) {
        return fac.id;
      });
      var walked = state.last && state.last.walked.length ? state.last.walked : out;
      return t("whpLostTrust", { fac: nameList(walked) });
    }

    function finish(score) {
      var starsWon = starsFor(score, level.starScore, "high");
      var outcome = campaign.record(level.id, { stars: starsWon, best: score, better: "high" });
      var message = t("whpWon", { n: whpInt(score), s: starsWon });
      if (outcome.isBest) {
        message += " " + t("newBest");
      }
      if (outcome.unlockedNext) {
        message += " " + t("whpNextHall");
      } else if (campaign.clearedCount() === whpLevels.length) {
        message += " " + t("whpCampaignDone");
      }
      logAction(t("logWhaleParliament", { n: whpInt(score) }));
      var rect = voteBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      return message;
    }

    function startSession(def) {
      level = def || level;
      state = parliamentStart(level);
      picks = [];
      cursor = 0;
      render();
      result.textContent = t("whpHallNote", {
        name: t(level.labelKey), total: state.rounds, need: state.need,
        word: t(whpTrustKey(parliamentTrustFloor(state))), n: parliamentTrustFloor(state),
      });
    }

    /* Keyboard path: arrows walk the offer row, Enter or Space takes a card,
     * number keys take a card by slot, Escape sets the picks aside. The vote is
     * a real labelled button, so Tab reaches it from the board. */
    board.addEventListener("keydown", function (event) {
      if (event.target !== board) {
        return;
      }
      var key = event.key;
      var size = Math.max(1, state.hand.length);
      if (key === "ArrowRight" || key === "ArrowDown") {
        event.preventDefault();
        cursor = (cursor + 1) % size;
        render();
      } else if (key === "ArrowLeft" || key === "ArrowUp") {
        event.preventDefault();
        cursor = (cursor + size - 1) % size;
        render();
      } else if (key === "Enter" || key === " ") {
        event.preventDefault();
        if (state.hand[cursor]) {
          toggleCard(state.hand[cursor].id);
        }
      } else if (key >= "1" && key <= "9") {
        var picked = state.hand[whpInt(key) - 1];
        if (picked) {
          event.preventDefault();
          toggleCard(picked.id);
        }
      } else if (key === "Escape") {
        event.preventDefault();
        clearPicks();
      }
    });

    voteBtn.addEventListener("click", commit);
    clearBtn.addEventListener("click", clearPicks);
    restartBtn.addEventListener("click", function () {
      startSession(level);
    });

    pickerSel.addEventListener("change", function () {
      var index = campaign.indexOf(pickerSel.value);
      if (index >= 0 && campaign.isUnlocked(pickerSel.value)) {
        startSession(whpLevels[index]);
      }
    });

    startSession(level);
  }

  /* Bilingual copy travels with the game: addStrings only fills keys i18n.js
   * does not already own, so the shared dictionary stays authoritative. */
  App.addStrings({
    en: {
      "tabWhaleParliament": "Whale Parliament",
      "whpP1": "First Tide", "whpP2": "Split Current", "whpP3": "Old Debts",
      "whpP4": "The Second Seat", "whpP5": "Deep Water Treaty",
      "whpP6": "Favour Tide", "whpP7": "Broken Pledge", "whpP8": "Thin Ice",
      "whpP9": "Winter Ledger", "whpP10": "Ledger of the Deep",
      "whpP11": "Single Whip", "whpP12": "Unfinished Bills", "whpP13": "The Exclusive Bloc",
      "whpP14": "Paid at the Ballot", "whpP15": "The Promise Bank", "whpP16": "Fatal Floor",
      "whpP17": "Favour Tide Rises", "whpP18": "The Two-Seat Hall", "whpP19": "Poor House",
      "whpP20": "Six of Six",
      "whpTwist1": "Generous priorities", "whpTwist2": "Two pods clash over the trench",
      "whpTwist3": "The hall starts in debt", "whpTwist4": "A walked-out pod can be won back",
      "whpTwist5": "Clash, debt and a second seat",
      "whpTwist6": "Every pod holds a favour", "whpTwist7": "Promises get crossed here",
      "whpTwist8": "Two pods hang by a thread", "whpTwist9": "Cheap water, heavy debt",
      "whpTwist10": "The whole ledger at once",
      "whpTwist11": "One offer per round, no second remedy",
      "whpTwist12": "Every bill lands with its goal unmet",
      "whpTwist13": "Two pods will only back water they hold alone",
      "whpTwist14": "No promise, no waiver: debts paid only by votes",
      "whpTwist15": "Amendments cost trust, promises are the currency",
      "whpTwist16": "A four-point seat in a hall with no mercy",
      "whpTwist17": "Waivers buy relief and leave a grudge",
      "whpTwist18": "Lose the thin seat and both survivors must agree",
      "whpTwist19": "Penny motions, so the goal bonus decides",
      "whpTwist20": "Every round must pass, or nothing does",
      "whpFGray": "Grey Drifters", "whpFTusk": "Tusk Herd", "whpFOrca": "Orca Clan",
      "whpCkelp": "Kelp Gate", "whpCice": "Ice Bay", "whpCdeep": "Deep Trench", "whpCreef": "Reef Strait",
      "whpPlanWide": "Wide Water", "whpPlanQuiet": "Quiet Ice", "whpPlanHunters": "Hunter's Deep",
      "whpPlanNursery": "Nursery Guard", "whpPlanStrait": "Strait Passage", "whpPlanCold": "Cold Current",
      "whpPlanFree": "All Open Water", "whpPlanSealed": "Sealed Water", "whpPlanHalf": "Half Open Gate",
      "whpPlanSplit": "Split Tide", "whpPlanTuskRun": "Tusk Corridor", "whpPlanBoth": "Both Ways",
      "whpPlanCross": "Trench Alone", "whpPlanTwoBays": "Two Private Bays",
      "whpPlanLock": "Lockstep Waters", "whpPlanNarrow": "Narrow Ice Run",
      "whpPlanTwin": "Twin Gates",
      "whpWantOpen": "open water", "whpWantShut": "kept quiet", "whpWantMine": "ours alone",
      "whpStanceYea": "Yea", "whpStanceNay": "Nay", "whpStanceEven": "Even",
      "whpTrustWarm": "Warm", "whpTrustSteady": "Steady", "whpTrustCool": "Cool",
      "whpTrustWary": "Wary", "whpTrustThin": "Thin", "whpTrustGone": "Gone",
      "whpFavourOwed": "owed {n}", "whpFavourClear": "clear 0", "whpPledgeNone": "no pledge",
      "whpPledgeWord": "pledged {corr} {want}", "whpGrudgeWord": "broken promises {n}",
      "whpKindGrant": "Grant", "whpKindRestrict": "Restrict", "whpKindPledge": "Pledge", "whpKindWaive": "Waive",
      "whpCardGrant": "Open {corr} to the {fac}", "whpCardRestrict": "Close {corr} to the {fac}",
      "whpCardPledge": "Pledge the next vote to the {fac}", "whpCardWaive": "Cancel a favour owed to the {fac}",
      "whpCostTrust": "trust price {n} per crossed wish", "whpCostPledge": "goodwill now, promise later",
      "whpCostWaive": "clears a debt, costs trust and grace",
      "whpFitFor": "served", "whpFitMid": "split", "whpFitAgainst": "crossed",
      "whpStatRound": "Floor", "whpStatVotes": "Votes", "whpStatScore": "Treaty", "whpStatFloor": "Trust floor",
      "whpRoundRow": "Round {n}/{total}: {plan}", "whpVoteRow": "{yea} yea / {nay} nay",
      "whpScoreRow": "{n} points, {done}/{need} adopted", "whpTrustRow": "{word} {n}",
      "whpBoardLabel": "Whale Parliament floor: corridors, factions and offer cards",
      "whpSecFloor": "The floor", "whpSecLanes": "Corridors", "whpSecHall": "The hall", "whpSecHand": "Your offers",
      "whpLaneAll": "open to all pods", "whpLaneNone": "shut water",
      "whpLaneOpen": "only {facs}", "whpLaneQuiet": "no pod claims this water",
      "whpPlanRow": "{name} - goal: {corr} {want}, worth {n} points",
      "whpPickRow": "{word}: {yea} of {seats} seats need {need}, {left}/{max} offers left",
      "whpSelLabel": "Choose a parliament", "whpChosen": "chosen", "whpGoneWord": "Walked out",
      "whpPriorityRow": "{corr}: {want} (weight {n})",
      "whpBlockSpent": "already spent", "whpBlockLimit": "no offers left this round",
      "whpBlockRefuse": "the {fac} will not hear a promise", "whpBlockClear": "nothing owed to cancel",
      "whpBlockAlready": "changes nothing", "whpBlockGone": "not on the table", "whpBlockOver": "the session is over",
      "whpBtnVote": "Open the Vote", "whpBtnClear": "Set Aside", "whpBtnRestart": "New Session",
      "whpHallNote": "{name}: six rounds, {need} adopted packages carry the treaty. Trust floor {word} {n}.",
      "whpNextPlan": "Next package on the floor: {name} (round {n}/{total}).",
      "whpAdopted": "{name} carried {yea}-{nay}: +{gain} treaty points.",
      "whpFailed": "{name} falls {yea}-{nay}: no points, and the hall loses patience.",
      "whpPlayedNote": "Offers spent: {list}.", "whpDebtNote": "Favours now owed - {list}.",
      "whpCostNote": "Trust moved - {list}.", "whpPledgeKept": "{fac} saw their promise kept.",
      "whpPledgeBroken": "{fac} calls your promise broken.", "whpPledgeLost": "{fac}'s pledge ran out: nothing delivered.",
      "whpWalkout": "{fac} walks out.", "whpReturn": "{fac} takes the second seat again.",
      "whpWon": "Treaty adopted with {n} points - {s} stars.", "whpNextHall": "Next parliament open.",
      "whpCampaignDone": "All twenty parliaments seated.",
      "whpLostTrust": "The {fac} left the hall: no coalition is possible.",
      "whpLostEmpty": "Too few seats remain to pass anything.",
      "whpLostTreaty": "Six rounds gone with {n}/{need} adopted - the treaty dies.",
      "whpHint": "Cards 1-6 pick an offer, arrows walk the row, Enter chooses, Escape sets aside; read the favours before you open the vote.",
      "logWhaleParliament": "Adopted the whale treaty with {n} points",
    },
    zh: {
      "tabWhaleParliament": "鲸群议会",
      "whpP1": "初潮议会", "whpP2": "分流议会", "whpP3": "旧债议会",
      "whpP4": "第二把座椅", "whpP5": "深水条约",
      "whpP6": "人情潮", "whpP7": "背誓之厅", "whpP8": "薄冰之席",
      "whpP9": "冬日账簿", "whpP10": "深渊总账",
      "whpP11": "单鞭议会", "whpP12": "未竟议案", "whpP13": "独占同盟",
      "whpP14": "表决偿债", "whpP15": "承诺钱庄", "whpP16": "致命下限",
      "whpP17": "人情潮再涨", "whpP18": "两席之厅", "whpP19": "薄水院",
      "whpP20": "六案全数",
      "whpTwist1": "诉求宽松", "whpTwist2": "两族在深海沟上对立",
      "whpTwist3": "开局便欠着人情", "whpTwist4": "离席的族群可以请回",
      "whpTwist5": "对立、债务与第二把座椅俱全",
      "whpTwist6": "每个族群手里都攥着人情", "whpTwist7": "在这里承诺常被违逆",
      "whpTwist8": "两族的席位悬于一线", "whpTwist9": "水道便宜，人情昂贵",
      "whpTwist10": "整本账一次清算",
      "whpTwist11": "每轮只许一张牌，再无第二味药",
      "whpTwist12": "每份议案上桌时目标都未完成",
      "whpTwist13": "两族只支持独占的水道",
      "whpTwist14": "无承诺无勾销，人情只能靠表决偿还",
      "whpTwist15": "改案伤信任，承诺才是通货",
      "whpTwist16": "无情议场里只剩四点信任的席位",
      "whpTwist17": "勾销能减债，却留下成见",
      "whpTwist18": "丢了那把薄席，剩下两席都得赞成",
      "whpTwist19": "议案皆薄值，目标奖励定生死",
      "whpTwist20": "六轮一轮不容有失",
      "whpFGray": "灰鲸群", "whpFTusk": "角鲸群", "whpFOrca": "虎鲸群",
      "whpCkelp": "海藻门", "whpCice": "冰海湾", "whpCdeep": "深海沟", "whpCreef": "礁海峡",
      "whpPlanWide": "宽阔水域", "whpPlanQuiet": "静寂冰海", "whpPlanHunters": "猎者深沟",
      "whpPlanNursery": "育幼护锁", "whpPlanStrait": "海峡通行", "whpPlanCold": "寒流通道",
      "whpPlanFree": "全数开放", "whpPlanSealed": "全线封锁", "whpPlanHalf": "半开之门",
      "whpPlanSplit": "分流之潮", "whpPlanTuskRun": "角鲸长廊", "whpPlanBoth": "双向水道",
      "whpPlanCross": "独占深沟", "whpPlanTwoBays": "两处私湾",
      "whpPlanLock": "同步水域", "whpPlanNarrow": "窄冰道",
      "whpPlanTwin": "双门水道",
      "whpWantOpen": "向全体开放", "whpWantShut": "保持安静", "whpWantMine": "归我独用",
      "whpStanceYea": "赞成", "whpStanceNay": "反对", "whpStanceEven": "持平",
      "whpTrustWarm": "热络", "whpTrustSteady": "稳固", "whpTrustCool": "冷淡",
      "whpTrustWary": "戒备", "whpTrustThin": "稀薄", "whpTrustGone": "已散",
      "whpFavourOwed": "欠人情 {n}", "whpFavourClear": "人情两清 0", "whpPledgeNone": "无承诺",
      "whpPledgeWord": "已承诺{corr}{want}", "whpGrudgeWord": "背弃承诺 {n}",
      "whpKindGrant": "开放", "whpKindRestrict": "封闭", "whpKindPledge": "承诺", "whpKindWaive": "勾销",
      "whpCardGrant": "把{corr}向{fac}开放", "whpCardRestrict": "把{corr}对{fac}封闭",
      "whpCardPledge": "把下一次表决承诺给{fac}", "whpCardWaive": "勾销欠{fac}的一笔人情",
      "whpCostTrust": "信任代价：每违一愿 {n}", "whpCostPledge": "此刻攒善意，日后还承诺",
      "whpCostWaive": "清了债务，却伤了信任与情面",
      "whpFitFor": "如愿", "whpFitMid": "各半", "whpFitAgainst": "相违",
      "whpStatRound": "议程", "whpStatVotes": "票数", "whpStatScore": "条约", "whpStatFloor": "信任下限",
      "whpRoundRow": "第 {n}/{total} 轮：{plan}", "whpVoteRow": "{yea} 赞成 / {nay} 反对",
      "whpScoreRow": "{n} 分，已通过 {done}/{need}", "whpTrustRow": "{word} {n}",
      "whpBoardLabel": "鲸群议场：航道、各族立场与报价牌",
      "whpSecFloor": "当前议案", "whpSecLanes": "航道", "whpSecHall": "议事厅", "whpSecHand": "你的报价",
      "whpLaneAll": "向全体族群开放", "whpLaneNone": "封锁水域",
      "whpLaneOpen": "仅限{facs}", "whpLaneQuiet": "无族群在此主张",
      "whpPlanRow": "{name}——目标：{corr}{want}，值 {n} 分",
      "whpPickRow": "{word}：{seats} 席需 {need} 票，现有 {yea} 票，本轮还能用 {left}/{max} 张牌",
      "whpSelLabel": "选择议会", "whpChosen": "已选中", "whpGoneWord": "已离席",
      "whpPriorityRow": "{corr}：{want}（权重 {n}）",
      "whpBlockSpent": "已经打出", "whpBlockLimit": "本轮不能再出牌",
      "whpBlockRefuse": "{fac}不再听任何承诺", "whpBlockClear": "并不欠人情，无需勾销",
      "whpBlockAlready": "改了也等于没改", "whpBlockGone": "桌上没有这张牌", "whpBlockOver": "本届会期已结束",
      "whpBtnVote": "交付表决", "whpBtnClear": "收回选择", "whpBtnRestart": "重新开始",
      "whpHallNote": "{name}：共六轮，通过 {need} 项议案才算缔约。当前信任下限：{word} {n}。",
      "whpNextPlan": "下一份议案：{name}（第 {n}/{total} 轮）。",
      "whpAdopted": "{name} 以 {yea} 比 {nay} 通过：条约加 {gain} 分。",
      "whpFailed": "{name} 以 {yea} 比 {nay} 遭否：不得分，厅中耐心亦受损。",
      "whpPlayedNote": "本轮用牌：{list}。", "whpDebtNote": "新增欠下的人情——{list}。",
      "whpCostNote": "信任变动——{list}。", "whpPledgeKept": "{fac}见到承诺兑现。",
      "whpPledgeBroken": "{fac}指你背弃承诺。", "whpPledgeLost": "{fac}的承诺落空：迟迟未兑现。",
      "whpWalkout": "{fac}离席。", "whpReturn": "{fac}重回第二把座椅。",
      "whpWon": "条约缔结，得 {n} 分——{s} 星。", "whpNextHall": "下一届议会已开启。",
      "whpCampaignDone": "二十届议会全部坐稳。",
      "whpLostTrust": "{fac}拂袖而去：再无多数可言。",
      "whpLostEmpty": "在席者太少，任何议案都通不过。",
      "whpLostTreaty": "六轮过去，仅通过 {n}/{need}，条约作废。",
      "whpHint": "数字键 1-6 挑报价牌，方向键走一行，Enter 选中，Esc 收回；表决前先看清你欠下的人情。",
      "logWhaleParliament": "以 {n} 分缔结了鲸群条约",
    },
  });

  App.registerGame({
    name: "whaleParliament",
    tabKey: "tabWhaleParliament",
    init: initWhaleParliamentGame,
    guide: {
      svg:
        '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="6" y="8" width="108" height="46" rx="6" fill="rgba(30,41,59,.75)" stroke="rgba(148,163,184,.45)"/>' +
        '<path d="M14 22h92M14 34h92M14 46h92" stroke="rgba(148,163,184,.25)"/>' +
        '<circle cx="30" cy="22" r="4" fill="#22d3ee"/><circle cx="60" cy="34" r="4" fill="#a3e635"/><circle cx="90" cy="46" r="4" fill="#fb7185"/>' +
        '<text x="24" y="66" font-size="8" fill="#94a3b8">2 of 3</text>' +
        '<path d="M44 60h30l-4-4M44 60l4-4" stroke="#fbbf24" fill="none"/>' +
        '<text x="78" y="66" font-size="8" fill="#fbbf24">owed 2</text></svg>',
      en: [
        "Aim: carry route packages through two of three faction votes for six rounds, and the treaty is adopted.",
        "Read the hall: every faction prints its priorities as a word and a weight, plus its stance on the package now on the floor.",
        "Action: pick one or two offer cards - open a corridor, close one, pledge a future vote, or cancel a favour you owe - then open the vote.",
        "The twist: a package that passes writes an owed favour against every faction whose top priority it bypassed, so tomorrow's votes cost more.",
        "Promises are remembered: a broken pledge drops trust hard, and that faction stops accepting new promises until you earn grace back.",
        "Scoring: treaty points come from the package's worth, its goal and the yea count; zero trust walks a faction out and the session is lost.",
      ],
      zh: [
        "目标：六轮里让议案通过三票中的两票，条约便能缔结。",
        "看清议事厅：每个族群都把自己的诉求写成词语与权重，并给出对当前议案的立场。",
        "操作：最多挑两张报价牌——开放航道、封闭航道、承诺下次表决、勾销所欠人情——再交付表决。",
        "关键：议案一旦通过，凡被绕过首愿的族群都会记下你欠它一笔人情，明日表决便更贵。",
        "承诺会被记住：背弃承诺重挫信任，那个族群此后不再接受你的新承诺。",
        "计分：条约分来自议案本身、目标奖励与赞成票数；信任归零的族群当场离席，本届会期即告失败。",
      ],
    },
  });

  /* Exported for the other modules. */
  App.initWhaleParliamentGame = initWhaleParliamentGame;
  App.parliamentScore = parliamentScore;
  App.parliamentRound = parliamentRound;
  App.parliamentTrustFloor = parliamentTrustFloor;
  App.parliamentSolvable = parliamentSolvable;
  App.parliamentLedgerFlips = whpDebtFlips;
  App.parliamentStance = whpStance;
  App.parliamentCardOk = parliamentCardOk;
  App.parliamentStart = parliamentStart;
  App.parliamentFit = whpFit;
  App.parliamentLane = whpLaneOf;
  App.parliamentPrng = whpPrng;
  App.parliamentLevels = whpLevels;
  App.parliamentProofs = whpProofs;
  App.parliamentCorridors = WHP_CORRIDORS;
  App.parliamentReplay = whpReplay;
})(window.CapitalConvert = window.CapitalConvert || {});
