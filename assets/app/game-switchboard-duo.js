/* Switchboard Duo - the cooperative switchboard game in the shared game drawer.
 * Two operators keep one failing machine alive, and neither can see the whole
 * picture: seat A reads the dials and holds the valve page of the rulebook, seat B
 * reads the switchboard and holds the pump page. Every work order is split the
 * same way, so closing a fault needs somebody saying a number out loud.
 * Thirteen authored faults, forty shifts, one shared keyboard plus a real button
 * behind every lever, and a seat swap so one person can always work the whole
 * shift. No timers anywhere: a beat is one decision, and the entire machine
 * resolves through the exported boardStep. Registered through the game registry,
 * so it needs no markup in the four HTML pages. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  var t = App.t;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var createCampaign = App.createCampaign;
  var fillCampaignPicker = App.fillCampaignPicker;
  var starsFor = App.starsFor;

  /* The pet is a separate module, and the isolated verifier boots the drawer
   * without it: the notify handle is resolved when a run ends instead of
   * captured at load, so the same call works with the pet and without it. */
  function swbNotify(isBest) {
    var notify = App.petNotifyGame;
    if (typeof notify === "function") { notify(!!isBest); }
  }

  var swbCeiling = 9;
  var swbStressLine = 8;
  var swbStressBack = 7;
  var swbArcPatience = 3;
  var swbStressWeight = 100;
  var swbFields = ["pressure", "temperature", "arc", "breaker", "damper", "blower",
    "feed", "strainer", "valveC", "valveD", "pump1", "pump2"];

  /* --- the machine, published as data ---------------------------------- */
  /* Every reading is words AND digits, and each one names the seat allowed to
   * read it. The arc lamp is flagged "both": a big lamp visible from either stool. */
  var swbInstruments = [
    { f: "pressure", num: 1, a: 1, nameKey: "swbIPressure" },
    { f: "temperature", num: 1, a: 1, nameKey: "swbIHeat" },
    { f: "arc", both: 1, nameKey: "swbIArc", words: ["swbWDark", "swbWLit"] },
    { f: "valveC", b: 1, nameKey: "swbIC", words: ["swbWShut", "swbWOpen"] },
    { f: "valveD", b: 1, nameKey: "swbID", words: ["swbWShut", "swbWOpen"] },
    { f: "pump1", b: 1, nameKey: "swbIP1", words: ["swbWStop", "swbWRun"] },
    { f: "pump2", b: 1, nameKey: "swbIP2", words: ["swbWStop", "swbWRun"] },
    { f: "breaker", a: 1, nameKey: "swbIBreaker", words: ["swbWOut", "swbWIn"] },
    { f: "damper", a: 1, nameKey: "swbIDamper", words: ["swbWShut", "swbWOpen"] },
    { f: "blower", a: 1, nameKey: "swbIBlower", words: ["swbWOff", "swbWOn"] },
    { f: "feed", a: 1, nameKey: "swbIFeed", words: ["swbWLow", "swbWHigh"] },
    { f: "strainer", a: 1, nameKey: "swbIStrainer", words: ["swbWFree", "swbWSeat"] },
  ];
  var swbNumWords = ["swbWSafe", "swbWWarm", "swbWHigh", "swbWRed"];
  /* Which page of the rulebook sits at which seat. No fix is closable from one
   * page alone: each line a fault needs lives on the other seat's sheet. */
  var swbPageA = ["swbRa1", "swbRa2", "swbRa3", "swbRa4", "swbRa5", "swbRa6", "swbRa7"];
  var swbPageB = ["swbRb1", "swbRb2", "swbRb3", "swbRb4", "swbRb5", "swbRb6", "swbRb7"];
  /* The levers. "field" is the reading the button carries; a one-shot handle
   * leaves it out and reads "ready" instead. */
  var swbControls = [
    { id: "damper", seat: "a", key: "Q", field: "damper", nameKey: "swbIDamper" },
    { id: "blower", seat: "a", key: "W", field: "blower", nameKey: "swbIBlower" },
    { id: "feed", seat: "a", key: "E", field: "feed", nameKey: "swbIFeed" },
    { id: "bleed", seat: "a", key: "R", shot: 1, nameKey: "swbIBleed" },
    { id: "strainer", seat: "a", key: "A", field: "strainer", nameKey: "swbIStrainer" },
    { id: "breaker", seat: "a", key: "S", field: "breaker", nameKey: "swbIBreaker" },
    { id: "valveC", seat: "b", key: "I", field: "valveC", nameKey: "swbIC" },
    { id: "valveD", seat: "b", key: "O", field: "valveD", nameKey: "swbID" },
    { id: "pump1", seat: "b", key: "P", field: "pump1", nameKey: "swbIP1" },
    { id: "pump2", seat: "b", key: "K", field: "pump2", nameKey: "swbIP2" },
    { id: "prime", seat: "b", key: "\u21b5", shot: 1, nameKey: "swbIPrime" },
  ];
  var swbKeyMap = {
    q: "damper", w: "blower", e: "feed", r: "bleed", a: "strainer", s: "breaker",
    d: "hold", f: "swap", i: "valveC", o: "valveD", p: "pump1", k: "pump2", l: "hold",
  };
  var swbKeys = { a: "swbKeysA", b: "swbKeysB" };

  /* The thirteen faults. "n" names the fault, "c" is what it looks like from the
   * floor, "snap" is the whole world it appears in (so its line always reaches),
   * "patch" is what it costs when a bad swing wakes it early, "need" is the work
   * order split by seat - every order carries at least one condition on each
   * desk, and the snap breaks one on both sides, so no page closes it alone - and
   * "line" is the canonical ordered solution. */
  var swbFaults = {
    overheat: {
      n: "swbFoverheat", c: "swbCoverheat",
      snap: { pressure: 3, temperature: 4, arc: 0, breaker: 1, damper: 0, blower: 0, feed: 0, strainer: 1, valveC: 0, valveD: 0, pump1: 1, pump2: 0 },
      patch: { temperature: 7, valveC: 0, pump1: 1 },
      need: [["temperature", 2, "a"], ["damper", 1, "a"], ["valveC", 1, "b"], ["pump1", 0, "b"]],
      line: ["pump1", "valveC", "damper", "blower"],
    },
    stuckHeader: {
      n: "swbFstuckHeader", c: "swbCstuckHeader",
      snap: { pressure: 4, temperature: 3, arc: 0, breaker: 1, damper: 1, blower: 1, feed: 0, strainer: 1, valveC: 0, valveD: 0, pump1: 1, pump2: 0 },
      patch: { pressure: 4, valveC: 0, pump1: 1 },
      need: [["pressure", 2, "a"], ["valveC", 1, "b"], ["pump1", 0, "b"]],
      line: ["pump1", "valveC", "bleed"],
    },
    arcing: {
      n: "swbFarcing", c: "swbCarcing",
      snap: { pressure: 3, temperature: 3, arc: 1, breaker: 1, damper: 1, blower: 1, feed: 1, strainer: 1, valveC: 1, valveD: 0, pump1: 0, pump2: 0 },
      patch: { arc: 1 },
      need: [["arc", 0, "b"], ["feed", 0, "a"], ["breaker", 1, "a"]],
      line: ["feed", "breaker", "breaker"],
    },
    starved: {
      n: "swbFstarved", c: "swbCstarved",
      snap: { pressure: 5, temperature: 2, arc: 0, breaker: 1, damper: 1, blower: 1, feed: 0, strainer: 1, valveC: 1, valveD: 0, pump1: 0, pump2: 0 },
      patch: { pump2: 0, valveD: 0 },
      need: [["pressure", 3, "a"], ["valveD", 1, "b"], ["pump2", 1, "b"]],
      line: ["strainer", "valveD", "pump2"],
    },
    cavitation: {
      n: "swbFcavitation", c: "swbCcavitation",
      snap: { pressure: 5, temperature: 4, arc: 1, breaker: 1, damper: 1, blower: 1, feed: 0, strainer: 1, valveC: 0, valveD: 0, pump1: 1, pump2: 0 },
      patch: { pressure: 5, valveC: 0, pump1: 1 },
      need: [["pressure", 2, "a"], ["arc", 0, "b"], ["pump1", 1, "b"]],
      line: ["pump1", "breaker", "breaker", "valveC", "bleed", "prime"],
    },
    backpressure: {
      n: "swbFbackpressure", c: "swbCbackpressure",
      snap: { pressure: 5, temperature: 2, arc: 0, breaker: 1, damper: 1, blower: 1, feed: 0, strainer: 1, valveC: 1, valveD: 0, pump1: 0, pump2: 1 },
      patch: { valveD: 0, pump2: 1 },
      need: [["pressure", 2, "a"], ["valveD", 1, "b"], ["pump2", 1, "b"], ["strainer", 1, "a"]],
      line: ["pump2", "strainer", "valveD", "bleed", "pump2", "strainer"],
    },
    lostPrime: {
      n: "swbFlostorPrime", c: "swbClostorPrime",
      snap: { pressure: 4, temperature: 3, arc: 0, breaker: 0, damper: 1, blower: 1, feed: 1, strainer: 0, valveC: 1, valveD: 0, pump1: 0, pump2: 0 },
      patch: { breaker: 0, pump1: 0, feed: 1 },
      need: [["feed", 0, "a"], ["breaker", 1, "a"], ["strainer", 1, "a"], ["pump1", 1, "b"]],
      line: ["feed", "strainer", "breaker", "prime"],
    },
    flashedOver: {
      n: "swbFflashedOver", c: "swbCflashedOver",
      snap: { pressure: 4, temperature: 3, arc: 1, breaker: 1, damper: 1, blower: 1, feed: 1, strainer: 1, valveC: 1, valveD: 0, pump1: 0, pump2: 1 },
      patch: { arc: 1, feed: 1 },
      need: [["arc", 0, "b"], ["feed", 0, "a"], ["valveD", 1, "b"], ["pump2", 1, "b"], ["strainer", 1, "a"]],
      line: ["feed", "breaker", "breaker", "strainer", "valveD", "pump2", "strainer"],
    },
    stifledHeader: {
      n: "swbFstifledHeader", c: "swbCstifledHeader",
      snap: { pressure: 4, temperature: 4, arc: 0, breaker: 1, damper: 0, blower: 0, feed: 1, strainer: 1, valveC: 1, valveD: 0, pump1: 0, pump2: 1 },
      patch: { temperature: 6, damper: 0, pump2: 1 },
      need: [["temperature", 2, "a"], ["damper", 1, "a"], ["feed", 0, "a"], ["pump2", 0, "b"]],
      line: ["pump2", "damper", "feed", "blower"],
    },
    chokedStrainer: {
      n: "swbFchokedStrainer", c: "swbCchokedStrainer",
      snap: { pressure: 6, temperature: 3, arc: 0, breaker: 1, damper: 1, blower: 1, feed: 0, strainer: 1, valveC: 0, valveD: 0, pump1: 0, pump2: 0 },
      patch: { pressure: 6, valveD: 0, valveC: 0 },
      need: [["pressure", 3, "a"], ["strainer", 1, "a"], ["valveD", 1, "b"], ["valveC", 1, "b"]],
      line: ["strainer", "valveD", "valveC", "bleed", "strainer"],
    },
    pumpPack: {
      n: "swbFpumpPack", c: "swbCpumpPack",
      snap: { pressure: 4, temperature: 3, arc: 0, breaker: 1, damper: 1, blower: 1, feed: 0, strainer: 1, valveC: 0, valveD: 0, pump1: 1, pump2: 1 },
      patch: { pump1: 1, pump2: 1, valveC: 0 },
      need: [["pressure", 3, "a"], ["pump1", 0, "b"], ["pump2", 0, "b"], ["valveC", 1, "b"]],
      line: ["pump1", "pump2", "valveC", "bleed"],
    },
    hotBus: {
      n: "swbFhotBus", c: "swbChotBus",
      snap: { pressure: 6, temperature: 4, arc: 1, breaker: 1, damper: 1, blower: 1, feed: 0, strainer: 1, valveC: 0, valveD: 0, pump1: 1, pump2: 0 },
      patch: { arc: 1, breaker: 1, pressure: 6 },
      need: [["breaker", 0, "a"], ["temperature", 3, "a"], ["pressure", 3, "a"], ["valveC", 1, "b"], ["arc", 0, "b"]],
      line: ["breaker", "valveC", "hold", "hold"],
    },
    blackout: {
      n: "swbFblackout", c: "swbCblackout",
      snap: { pressure: 5, temperature: 5, arc: 0, breaker: 0, damper: 0, blower: 0, feed: 1, strainer: 0, valveC: 0, valveD: 0, pump1: 0, pump2: 0 },
      patch: { breaker: 0, damper: 0, feed: 1 },
      need: [["temperature", 3, "a"], ["damper", 1, "a"], ["feed", 0, "a"], ["breaker", 1, "a"],
        ["pressure", 3, "a"], ["strainer", 1, "a"], ["valveC", 1, "b"], ["valveD", 1, "b"], ["pump1", 1, "b"]],
      line: ["feed", "damper", "blower", "breaker", "valveD", "valveC", "bleed", "strainer", "prime"],
    },
  };

  /* Forty shifts, ordered by the par each one measures: the scripted line is
   * replayed for every shift and its beats are the ladder's rungs, so no rung
   * costs fewer beats than the one below it. "fails" is the order the log is
   * worked in, "chain" names the fault a cleared one wakes, "dim" moves the heat
   * dial to the other seat (so on a dim shift a heat condition printed on the
   * gauge desk's half has to be read off the switch desk's dial and called
   * across), "budget" is how many stress events the shift survives, and "pages"
   * says whether both rulebook pages are printed at both desks (the teaching
   * shift). */
  var swbShifts = [
    { id: "b1", labelKey: "swbS1", briefKey: "swbY1", budget: 3, dim: false, pages: "both", fails: ["overheat", "stuckHeader"], chain: {} },
    { id: "b2", labelKey: "swbS2", briefKey: "swbY2", budget: 3, dim: false, pages: "split", fails: ["stuckHeader", "arcing", "starved"], chain: {} },
    { id: "b3", labelKey: "swbS3", briefKey: "swbY3", budget: 3, dim: false, pages: "split", fails: ["stuckHeader"], chain: { stuckHeader: "arcing", arcing: "starved" } },
    { id: "b4", labelKey: "swbS4", briefKey: "swbY4", budget: 3, dim: true, pages: "split", fails: ["cavitation", "backpressure"], chain: {} },
    { id: "b5", labelKey: "swbS5", briefKey: "swbY5", budget: 2, dim: true, pages: "split", fails: ["overheat", "stuckHeader", "arcing", "starved", "cavitation", "backpressure"], chain: {} },
    { id: "b6", labelKey: "swbS6", briefKey: "swbY6", budget: 3, dim: false, pages: "split", fails: ["overheat", "lostPrime", "arcing", "starved", "chokedStrainer", "pumpPack", "hotBus"], chain: {} },
    { id: "b7", labelKey: "swbS7", briefKey: "swbY7", budget: 3, dim: true, pages: "split", fails: ["stuckHeader", "cavitation", "arcing", "starved", "lostPrime", "backpressure", "chokedStrainer"], chain: {} },
    { id: "b8", labelKey: "swbS8", briefKey: "swbY8", budget: 3, dim: false, pages: "split", fails: ["overheat", "stifledHeader", "cavitation", "arcing", "starved", "flashedOver", "pumpPack"], chain: { pumpPack: "blackout" } },
    { id: "b9", labelKey: "swbS9", briefKey: "swbY9", budget: 2, dim: false, pages: "split", fails: ["stuckHeader", "arcing", "starved", "cavitation", "backpressure", "chokedStrainer", "hotBus", "flashedOver", "stifledHeader"], chain: { arcing: "lostPrime" } },
    { id: "b10", labelKey: "swbS10", briefKey: "swbY10", budget: 2, dim: false, pages: "split", fails: ["overheat", "stuckHeader", "arcing", "starved", "cavitation", "backpressure", "lostPrime", "chokedStrainer", "pumpPack", "stifledHeader", "hotBus", "flashedOver"], chain: { flashedOver: "blackout" } },
    { id: "b11", labelKey: "swbS11", briefKey: "swbY11", budget: 2, dim: false, pages: "split", fails: ["overheat", "stuckHeader", "arcing", "starved", "cavitation", "backpressure", "lostPrime", "flashedOver", "stifledHeader", "pumpPack", "hotBus", "blackout", "arcing", "starved"], chain: {} },
    { id: "b12", labelKey: "swbS12", briefKey: "swbY12", budget: 2, dim: true, pages: "split", fails: ["overheat", "stuckHeader", "arcing", "starved", "cavitation", "backpressure", "lostPrime", "flashedOver", "stifledHeader", "pumpPack", "hotBus", "blackout", "hotBus"], chain: { hotBus: "chokedStrainer" } },
    { id: "b13", labelKey: "swbS13", briefKey: "swbY13", budget: 2, dim: false, pages: "split", fails: ["stifledHeader", "overheat", "stuckHeader", "arcing", "starved", "cavitation", "backpressure", "lostPrime", "flashedOver", "pumpPack", "blackout", "arcing", "pumpPack"], chain: { stifledHeader: "chokedStrainer", chokedStrainer: "hotBus" } },
    { id: "b14", labelKey: "swbS14", briefKey: "swbY14", budget: 2, dim: true, pages: "split", fails: ["stifledHeader", "overheat", "stuckHeader", "arcing", "starved", "cavitation", "backpressure", "lostPrime", "flashedOver", "hotBus", "blackout", "cavitation", "hotBus"], chain: { stifledHeader: "chokedStrainer", chokedStrainer: "pumpPack" } },
    { id: "b15", labelKey: "swbS15", briefKey: "swbY15", budget: 1, dim: true, pages: "split", fails: ["overheat", "stuckHeader", "arcing", "starved", "cavitation", "backpressure", "lostPrime", "flashedOver", "stifledHeader", "pumpPack", "hotBus", "flashedOver", "cavitation"], chain: { overheat: "chokedStrainer", chokedStrainer: "blackout" } },
    { id: "b16", labelKey: "swbS16", briefKey: "swbY16", budget: 1, dim: false, pages: "split", fails: ["arcing", "overheat", "stuckHeader", "starved", "cavitation", "backpressure", "lostPrime", "flashedOver", "stifledHeader", "pumpPack", "cavitation", "backpressure", "stifledHeader"], chain: { arcing: "hotBus", hotBus: "chokedStrainer", chokedStrainer: "blackout" } },
    { id: "b17", labelKey: "swbS17", briefKey: "swbY17", budget: 1, dim: true, pages: "split", fails: ["starved", "overheat", "stuckHeader", "arcing", "cavitation", "backpressure", "lostPrime", "flashedOver", "stifledHeader", "hotBus", "blackout", "flashedOver", "cavitation", "backpressure"], chain: { starved: "pumpPack", pumpPack: "chokedStrainer" } },
    { id: "b18", labelKey: "swbS18", briefKey: "swbY18", budget: 1, dim: false, pages: "split", fails: ["overheat", "arcing", "starved", "cavitation", "backpressure", "lostPrime", "flashedOver", "stifledHeader", "pumpPack", "hotBus", "blackout", "blackout", "flashedOver", "cavitation"], chain: { overheat: "stuckHeader", stuckHeader: "chokedStrainer" } },
    { id: "b19", labelKey: "swbS19", briefKey: "swbY19", budget: 1, dim: true, pages: "split", fails: ["arcing", "overheat", "stuckHeader", "cavitation", "backpressure", "lostPrime", "flashedOver", "stifledHeader", "pumpPack", "blackout", "blackout", "flashedOver", "cavitation", "arcing"], chain: { arcing: "starved", starved: "chokedStrainer", chokedStrainer: "hotBus" } },
    { id: "b20", labelKey: "swbS20", briefKey: "swbY20", budget: 1, dim: false, pages: "split", fails: ["flashedOver", "overheat", "stuckHeader", "arcing", "starved", "cavitation", "backpressure", "lostPrime", "hotBus", "blackout", "blackout", "flashedOver", "cavitation", "hotBus", "arcing"], chain: { flashedOver: "stifledHeader", stifledHeader: "chokedStrainer", chokedStrainer: "pumpPack" } },
    /* Shift 21: Emergency Overload. 16 orders on dim glass, budget 1, 95 beats. */
    { id: "b21", labelKey: "swbS21", briefKey: "swbY21", budget: 1, dim: true, pages: "split", fails: ["flashedOver", "overheat", "stuckHeader", "arcing", "starved", "cavitation", "backpressure", "lostPrime", "hotBus", "blackout", "blackout", "flashedOver", "cavitation", "hotBus", "arcing", "lostPrime"], chain: { flashedOver: "stifledHeader", stifledHeader: "chokedStrainer", chokedStrainer: "pumpPack" } },
    /* Shift 22: Deadweight Surge. 17 orders on bright glass, budget 1, 101 beats. */
    { id: "b22", labelKey: "swbS22", briefKey: "swbY22", budget: 1, dim: false, pages: "split", fails: ["flashedOver", "overheat", "stuckHeader", "arcing", "starved", "cavitation", "backpressure", "lostPrime", "hotBus", "blackout", "blackout", "flashedOver", "cavitation", "hotBus", "arcing", "cavitation", "lostPrime"], chain: { flashedOver: "stifledHeader", stifledHeader: "chokedStrainer", chokedStrainer: "pumpPack" } },
    /* Shift 23: Deep Grid Lockdown. 18 orders on dim glass, budget 1, 107 beats. */
    { id: "b23", labelKey: "swbS23", briefKey: "swbY23", budget: 1, dim: true, pages: "split", fails: ["flashedOver", "overheat", "stuckHeader", "arcing", "starved", "cavitation", "backpressure", "lostPrime", "hotBus", "blackout", "blackout", "flashedOver", "cavitation", "hotBus", "arcing", "cavitation", "backpressure", "lostPrime"], chain: { flashedOver: "stifledHeader", stifledHeader: "chokedStrainer", chokedStrainer: "pumpPack" } },
    /* Shift 24: The Infinite Grid. 19 orders on bright glass, budget 1, 114 beats. */
    { id: "b24", labelKey: "swbS24", briefKey: "swbY24", budget: 1, dim: false, pages: "split", fails: ["flashedOver", "overheat", "stuckHeader", "arcing", "starved", "cavitation", "backpressure", "lostPrime", "hotBus", "blackout", "blackout", "flashedOver", "cavitation", "hotBus", "arcing", "cavitation", "backpressure", "flashedOver", "lostPrime"], chain: { flashedOver: "stifledHeader", stifledHeader: "chokedStrainer", chokedStrainer: "pumpPack" } },
    /* Shift 25: The Deep Fall. 20 orders on dim glass, budget 1, 124 beats.
     * A cleared overheat wakes a four-link cascade - choke, pack, hot bus,
     * blackout - so the log holds twenty-four orders even though only twenty
     * are authored. */
    { id: "b25", labelKey: "swbS25", briefKey: "swbY25", budget: 1, dim: true, pages: "split", fails: ["flashedOver", "overheat", "stuckHeader", "arcing", "starved", "cavitation", "backpressure", "lostPrime", "flashedOver", "cavitation", "backpressure", "stifledHeader", "flashedOver", "cavitation", "lostPrime", "flashedOver", "cavitation", "backpressure", "stifledHeader", "arcing"], chain: { overheat: "chokedStrainer", chokedStrainer: "pumpPack", pumpPack: "hotBus", hotBus: "blackout" } },
    /* Shift 26: Everything Comes Back. 26 orders on bright glass, budget 1,
     * 134 beats, no cascade at all: the arc and the starved pump return once,
     * the lost prime returns twice, the hot bus and blackout once more too, and
     * the flashovers, cavitations and back pressures each come back twice. */
    { id: "b26", labelKey: "swbS26", briefKey: "swbY26", budget: 1, dim: false, pages: "split", fails: ["arcing", "starved", "lostPrime", "overheat", "stuckHeader", "cavitation", "backpressure", "flashedOver", "arcing", "starved", "lostPrime", "cavitation", "backpressure", "flashedOver", "stifledHeader", "hotBus", "blackout", "flashedOver", "cavitation", "backpressure", "lostPrime", "hotBus", "blackout", "flashedOver", "cavitation", "stuckHeader"], chain: {} },
    /* Shift 27: The Dim Return. 25 orders on dim glass, budget 1, 142 beats.
     * A starved pump wakes a three-link cascade - pack, choke, blackout - while
     * the flashovers and the lost prime keep coming back on their own. */
    { id: "b27", labelKey: "swbS27", briefKey: "swbY27", budget: 1, dim: true, pages: "split", fails: ["flashedOver", "starved", "overheat", "stuckHeader", "arcing", "cavitation", "backpressure", "lostPrime", "hotBus", "flashedOver", "cavitation", "backpressure", "starved", "stifledHeader", "hotBus", "flashedOver", "cavitation", "backpressure", "lostPrime", "stifledHeader", "overheat", "cavitation", "backpressure", "flashedOver", "lostPrime"], chain: { starved: "pumpPack", pumpPack: "chokedStrainer", chokedStrainer: "blackout" } },
    /* Shift 28: Heat Across the Desks. 26 orders on dim glass, budget 1, 151
     * beats: the heat dial lives at the switch desk, so every heat order
     * prints its number on the gauge desk but can only be read across the
     * aisle, and overheat and stifled header each return twice. A stifled
     * header also wakes a two-link cascade - choke, pack. */
    { id: "b28", labelKey: "swbS28", briefKey: "swbY28", budget: 1, dim: true, pages: "split", fails: ["overheat", "stifledHeader", "cavitation", "backpressure", "flashedOver", "lostPrime", "overheat", "stifledHeader", "cavitation", "backpressure", "flashedOver", "cavitation", "backpressure", "lostPrime", "hotBus", "blackout", "overheat", "stifledHeader", "flashedOver", "cavitation", "backpressure", "lostPrime", "hotBus", "blackout", "flashedOver", "lostPrime"], chain: { stifledHeader: "chokedStrainer", chokedStrainer: "pumpPack" } },
    /* Shift 29: Blackout Returns. 25 orders on bright glass, budget 1, 159
     * beats: the blackout is authored four times, and an arc wakes a
     * three-link cascade - pack, choke, stifled header. */
    { id: "b29", labelKey: "swbS29", briefKey: "swbY29", budget: 1, dim: false, pages: "split", fails: ["blackout", "arcing", "starved", "flashedOver", "cavitation", "backpressure", "blackout", "lostPrime", "hotBus", "flashedOver", "cavitation", "backpressure", "blackout", "lostPrime", "hotBus", "flashedOver", "cavitation", "backpressure", "overheat", "lostPrime", "cavitation", "hotBus", "blackout", "flashedOver", "cavitation"], chain: { arcing: "pumpPack", pumpPack: "chokedStrainer", chokedStrainer: "stifledHeader" } },
    /* Shift 30: The Whole Board. 28 orders on bright glass, budget 1, 183
     * beats, and the longest cascade on the board - five links, six faults:
     * overheat, choke, double pack, hot bus, blackout, stifled header - on top
     * of the returned flashovers and cavitations. */
    { id: "b30", labelKey: "swbS30", briefKey: "swbY30", budget: 1, dim: false, pages: "split", fails: ["flashedOver", "overheat", "cavitation", "backpressure", "lostPrime", "flashedOver", "cavitation", "backpressure", "stuckHeader", "arcing", "flashedOver", "cavitation", "backpressure", "lostPrime", "flashedOver", "cavitation", "backpressure", "lostPrime", "overheat", "cavitation", "backpressure", "cavitation", "backpressure", "cavitation", "backpressure", "flashedOver", "cavitation", "backpressure"], chain: { overheat: "chokedStrainer", chokedStrainer: "pumpPack", pumpPack: "hotBus", hotBus: "blackout", blackout: "stifledHeader" } },
    /* Shift 31: Thirty on the Line. 30 authored orders, budget 1, 189 beats:
     * the first thirty-order plate on the board, and a hot bus wakes a
     * two-link tail - lost prime, stifled header - so the log holds 32. */
    { id: "b31", labelKey: "swbS31", briefKey: "swbY31", budget: 1, dim: false, pages: "split", fails: ["blackout", "flashedOver", "cavitation", "backpressure", "blackout", "flashedOver", "cavitation", "backpressure", "blackout", "flashedOver", "cavitation", "backpressure", "blackout", "flashedOver", "cavitation", "backpressure", "flashedOver", "cavitation", "backpressure", "hotBus", "flashedOver", "cavitation", "backpressure", "hotBus", "hotBus", "chokedStrainer", "pumpPack", "overheat", "stuckHeader", "arcing"], chain: { hotBus: "lostPrime", lostPrime: "stifledHeader" } },
    /* Shift 32: The Long Board. 32 authored orders, budget 1, 204 beats: the
     * first thirty-two-order plate, and a blackout wakes a two-link tail -
     * stifled header, lost prime - so the log holds 34. */
    { id: "b32", labelKey: "swbS32", briefKey: "swbY32", budget: 1, dim: false, pages: "split", fails: ["blackout", "flashedOver", "cavitation", "backpressure", "blackout", "flashedOver", "cavitation", "backpressure", "blackout", "flashedOver", "cavitation", "backpressure", "blackout", "flashedOver", "cavitation", "backpressure", "flashedOver", "cavitation", "backpressure", "hotBus", "flashedOver", "cavitation", "backpressure", "hotBus", "hotBus", "chokedStrainer", "pumpPack", "overheat", "stuckHeader", "arcing", "blackout", "backpressure"], chain: { blackout: "stifledHeader", stifledHeader: "lostPrime" } },
    /* Shift 33: Six Links Down. 32 authored orders, budget 1, 211 beats: the
     * first six-link cascade - overheat, choke, double pack, hot bus,
     * blackout, stifled header, arc - so the log holds 38. */
    { id: "b33", labelKey: "swbS33", briefKey: "swbY33", budget: 1, dim: false, pages: "split", fails: ["flashedOver", "cavitation", "backpressure", "flashedOver", "cavitation", "backpressure", "flashedOver", "cavitation", "backpressure", "flashedOver", "cavitation", "backpressure", "flashedOver", "cavitation", "backpressure", "flashedOver", "cavitation", "backpressure", "flashedOver", "cavitation", "backpressure", "flashedOver", "cavitation", "backpressure", "overheat", "lostPrime", "stuckHeader", "starved", "overheat", "lostPrime", "overheat", "lostPrime"], chain: { overheat: "chokedStrainer", chokedStrainer: "pumpPack", pumpPack: "hotBus", hotBus: "blackout", blackout: "stifledHeader", stifledHeader: "arcing" } },
    /* Shift 34: Two Fires. 34 authored orders, budget 1, 230 beats: the first
     * shift with two independent cascades - a header branch through both
     * pumps and an arc branch through the bus to the stifled header - so the
     * log holds 38. */
    { id: "b34", labelKey: "swbS34", briefKey: "swbY34", budget: 1, dim: false, pages: "split", fails: ["flashedOver", "cavitation", "backpressure", "flashedOver", "cavitation", "backpressure", "flashedOver", "cavitation", "backpressure", "flashedOver", "cavitation", "backpressure", "flashedOver", "cavitation", "backpressure", "flashedOver", "cavitation", "backpressure", "flashedOver", "cavitation", "backpressure", "flashedOver", "cavitation", "backpressure", "flashedOver", "blackout", "blackout", "blackout", "blackout", "overheat", "overheat", "arcing", "arcing", "lostPrime"], chain: { overheat: "chokedStrainer", chokedStrainer: "pumpPack", arcing: "hotBus", hotBus: "stifledHeader" } },
    /* Shift 35: Heat, Read Across. 34 authored orders on dim glass, budget 1,
     * 232 beats: the heat orders keep returning while their dial sits at the
     * switch desk, and a stifled header wakes a four-link cascade, so the log
     * holds 38. */
    { id: "b35", labelKey: "swbS35", briefKey: "swbY35", budget: 1, dim: true, pages: "split", fails: ["overheat", "stifledHeader", "blackout", "hotBus", "overheat", "stifledHeader", "blackout", "hotBus", "overheat", "stifledHeader", "blackout", "flashedOver", "cavitation", "backpressure", "overheat", "stifledHeader", "blackout", "flashedOver", "cavitation", "backpressure", "blackout", "blackout", "blackout", "blackout", "blackout", "flashedOver", "cavitation", "backpressure", "flashedOver", "cavitation", "backpressure", "flashedOver", "cavitation", "backpressure"], chain: { stifledHeader: "chokedStrainer", chokedStrainer: "pumpPack", pumpPack: "lostPrime", lostPrime: "arcing" } },
    /* Shift 36: Four of a Kind. 35 authored orders, budget 1, 245 beats: the
     * flashover is authored four times, and a hot bus wakes four more faults,
     * so the log holds 39. */
    { id: "b36", labelKey: "swbS36", briefKey: "swbY36", budget: 1, dim: false, pages: "split", fails: ["flashedOver", "blackout", "cavitation", "backpressure", "flashedOver", "blackout", "cavitation", "backpressure", "flashedOver", "blackout", "cavitation", "backpressure", "flashedOver", "blackout", "cavitation", "backpressure", "blackout", "cavitation", "backpressure", "blackout", "cavitation", "backpressure", "blackout", "cavitation", "backpressure", "blackout", "cavitation", "backpressure", "cavitation", "backpressure", "cavitation", "hotBus", "overheat", "lostPrime", "stuckHeader"], chain: { hotBus: "chokedStrainer", chokedStrainer: "pumpPack", pumpPack: "stifledHeader", stifledHeader: "starved" } },
    /* Shift 37: The Dim Six. 33 authored orders on dim glass, budget 1, 248
     * beats: a six-link cascade from the blackout to the stifled header, so
     * the log holds 39. */
    { id: "b37", labelKey: "swbS37", briefKey: "swbY37", budget: 1, dim: true, pages: "split", fails: ["blackout", "flashedOver", "cavitation", "backpressure", "blackout", "flashedOver", "cavitation", "backpressure", "blackout", "flashedOver", "cavitation", "backpressure", "blackout", "flashedOver", "cavitation", "backpressure", "blackout", "flashedOver", "cavitation", "backpressure", "blackout", "flashedOver", "cavitation", "backpressure", "blackout", "flashedOver", "cavitation", "backpressure", "flashedOver", "cavitation", "backpressure", "cavitation", "overheat"], chain: { blackout: "arcing", arcing: "starved", starved: "pumpPack", pumpPack: "chokedStrainer", chokedStrainer: "hotBus", hotBus: "stifledHeader" } },
    /* Shift 38: Twin Cascades. 33 authored orders, budget 1, 259 beats: two
     * full three-link cascades fall at once - header, starved pump, pack on
     * one side; lost prime, choke, stifled header on the other - so the log
     * holds 39. */
    { id: "b38", labelKey: "swbS38", briefKey: "swbY38", budget: 1, dim: false, pages: "split", fails: ["blackout", "blackout", "flashedOver", "cavitation", "arcing", "blackout", "backpressure", "blackout", "flashedOver", "flashedOver", "backpressure", "flashedOver", "blackout", "blackout", "overheat", "blackout", "blackout", "arcing", "blackout", "cavitation", "blackout", "cavitation", "blackout", "blackout", "blackout", "overheat", "blackout", "arcing", "blackout", "blackout", "backpressure", "flashedOver", "overheat"], chain: { overheat: "stuckHeader", stuckHeader: "starved", starved: "pumpPack", arcing: "lostPrime", lostPrime: "chokedStrainer", chokedStrainer: "stifledHeader" } },
    /* Shift 39: No Cascade, All Return. 39 authored orders, budget 1, 265
     * beats: no cascade at all, just the longest return plate on the board -
     * the blackout and the flashover are each authored nine times. */
    { id: "b39", labelKey: "swbS39", briefKey: "swbY39", budget: 1, dim: false, pages: "split", fails: ["blackout", "flashedOver", "cavitation", "backpressure", "blackout", "flashedOver", "cavitation", "backpressure", "blackout", "flashedOver", "cavitation", "backpressure", "blackout", "flashedOver", "cavitation", "backpressure", "blackout", "flashedOver", "cavitation", "backpressure", "blackout", "flashedOver", "cavitation", "backpressure", "blackout", "flashedOver", "cavitation", "backpressure", "blackout", "flashedOver", "cavitation", "backpressure", "blackout", "flashedOver", "cavitation", "backpressure", "hotBus", "chokedStrainer", "overheat"], chain: {} },
    /* Shift 40: Seven Links, Whole Board. 32 authored orders, budget 1, 275
     * beats, and the capstone cascade - seven links from the blackout through
     * the arc, the starved pump, the double pack, the choke, the hot bus and
     * the stifled header to the lost prime - on top of the heaviest plate on
     * the board. The log holds 39 orders. */
    { id: "b40", labelKey: "swbS40", briefKey: "swbY40", budget: 1, dim: false, pages: "split", fails: ["blackout", "flashedOver", "blackout", "flashedOver", "blackout", "flashedOver", "blackout", "flashedOver", "blackout", "flashedOver", "blackout", "flashedOver", "blackout", "flashedOver", "blackout", "flashedOver", "blackout", "flashedOver", "blackout", "flashedOver", "blackout", "flashedOver", "blackout", "flashedOver", "cavitation", "backpressure", "cavitation", "backpressure", "blackout", "flashedOver", "blackout", "flashedOver"], chain: { blackout: "arcing", arcing: "starved", starved: "pumpPack", pumpPack: "chokedStrainer", chokedStrainer: "hotBus", hotBus: "stifledHeader", stifledHeader: "lostPrime" } },
  ];

  /* --- pure helpers ---------------------------------------------------- */
  function swbNum(value, fallback) {
    var n = Number(value);
    return isFinite(n) ? Math.round(n) : fallback;
  }

  function swbClamp(value, lo, hi) {
    var n = swbNum(value, lo);
    return n < lo ? lo : n > hi ? hi : n;
  }

  function swbFlag(value, fallback) {
    var n = Number(value);
    if (!isFinite(n)) { return fallback ? 1 : 0; }
    return n ? 1 : 0;
  }

  function swbIsList(value) {
    return Object.prototype.toString.call(value) === "[object Array]";
  }

  function swbOwn(map, key) {
    return !!map && Object.prototype.hasOwnProperty.call(map, key);
  }

  function swbFaultDef(fault) {
    var id = typeof fault === "string" ? fault : fault && fault.id;
    return swbOwn(swbFaults, id) ? swbFaults[id] : null;
  }

  function swbShiftDef(shift) {
    var id = typeof shift === "string" ? shift : shift && shift.id;
    for (var index = 0; index < swbShifts.length; index += 1) {
      if (swbShifts[index].id === id) { return swbShifts[index]; }
    }
    return null;
  }

  function swbIds(list) {
    return (swbIsList(list) ? list : []).filter(function (id) {
      return !!swbFaultDef(id);
    });
  }

  /* The shift log: the authored orders plus whatever the cascade wakes, so the
   * shift card can say out loud how many orders the desk really holds. A return
   * order is authored a second time in "fails" and stays a second entry here;
   * the shipped rows author each fault once, so their logs and plates are
   * unchanged. */
  function swbShiftLog(def) {
    var log = [];
    if (!def) { return log; }
    swbIds(def.fails).forEach(function (id) {
      log.push(id);
    });
    var chain = def.chain || {};
    Object.keys(chain).forEach(function (from) {
      if (log.indexOf(from) !== -1 && log.indexOf(chain[from]) === -1 && swbFaultDef(chain[from])) {
        log.push(chain[from]);
      }
    });
    return log;
  }

  function swbInst(f) {
    for (var index = 0; index < swbInstruments.length; index += 1) {
      if (swbInstruments[index].f === f) { return swbInstruments[index]; }
    }
    return null;
  }

  /* The seat allowed to read an instrument. In the dim shifts the heat dial is
   * rewired onto the switch seat's spare face, so no stool sees both symptoms. */
  function swbReader(inst, dim) {
    if (inst.both) { return "both"; }
    if (dim && inst.f === "temperature") { return "b"; }
    return inst.a ? "a" : "b";
  }

  function swbWord(inst, value) {
    if (!inst) { return ""; }
    if (inst.num) {
      var n = swbClamp(value, 0, swbCeiling);
      return t(swbNumWords[n >= swbStressLine ? 3 : n >= 5 ? 2 : n >= 3 ? 1 : 0]);
    }
    return t(inst.words[swbFlag(value, 0) ? 1 : 0]);
  }

  function swbRackOf(seat) {
    return swbControls.filter(function (control) { return control.seat === seat; });
  }

  function swbControl(id) {
    for (var index = 0; index < swbControls.length; index += 1) {
      if (swbControls[index].id === id) { return swbControls[index]; }
    }
    return null;
  }

  /* --- the resolver, one action at a time ------------------------------ */
  function swbFresh(def, solo) {
    var shift = def || swbShifts[0];
    return {
      shiftId: shift.id, budget: swbClamp(shift.budget, 1, 9), dim: !!shift.dim,
      enforce: !!solo, seat: "a", pressure: 3, temperature: 3, arc: 0, breaker: 1,
      damper: 1, blower: 1, feed: 0, strainer: 1, valveC: 1, valveD: 0, pump1: 0,
      pump2: 0, arcBeats: 0, stress: 0, beats: 0, queue: swbIds(shift.fails),
      active: [], done: [], log: [], over: false, won: false,
    };
  }

  /* A state is always rebuilt field by field, so a hand-made or half-broken
   * state still resolves instead of throwing somewhere deep in the machine. */
  function swbCopy(state) {
    var from = state && typeof state === "object" ? state : {};
    var def = swbShiftDef(from.shiftId) || swbShifts[0];
    var copy = swbFresh(def, from.enforce);
    copy.shiftId = def.id;
    copy.budget = swbClamp(from.budget, 1, 9);
    copy.dim = !!from.dim;
    copy.seat = from.seat === "b" ? "b" : "a";
    copy.arcBeats = swbClamp(from.arcBeats, 0, 9);
    copy.stress = swbClamp(from.stress, 0, 99);
    copy.beats = swbClamp(from.beats, 0, 9999);
    copy.over = !!from.over;
    copy.won = !!from.won;
    swbFields.forEach(function (field) {
      copy[field] = field === "pressure" || field === "temperature"
        ? swbClamp(from[field], 0, swbCeiling)
        : swbFlag(from[field], copy[field]);
    });
    if (swbIsList(from.queue)) { copy.queue = swbIds(from.queue); }
    copy.active = swbIds(from.active);
    copy.done = swbIds(from.done);
    copy.log = (swbIsList(from.log) ? from.log : []).slice(0, 6).map(function (entry) {
      var note = entry && typeof entry === "object" ? entry : {};
      return { k: String(note.k || "swbNHeld"), f: note.f || "", g: note.g || "", s: note.s || "", n: swbNum(note.n, -1) };
    });
    return copy;
  }

  function swbSay(state, key, extra) {
    var note = { k: key, f: "", g: "", s: "", n: -1 };
    if (extra) {
      note.f = extra.f || "";
      note.g = extra.g || "";
      note.s = extra.s || "";
      if (typeof extra.n === "number") { note.n = extra.n; }
    }
    state.log.push(note);
    while (state.log.length > 6) { state.log.shift(); }
  }

  function swbLive(state) {
    /* Head first: the queue hands over one order at a time, and a fault already
     * on the desk is never activated twice. */
    while (!state.active.length && state.queue.length > 0) {
      var id = state.queue.shift();
      state.active.push(id);
      swbSnap(state, swbFaults[id].snap);
      swbSay(state, "swbNOrder", { g: id });
    }
  }

  function swbSnap(state, patch) {
    if (!patch) { return; }
    Object.keys(patch).forEach(function (field) {
      if (field === "pressure" || field === "temperature") {
        state[field] = swbClamp(patch[field], 0, swbCeiling);
      } else if (swbOwn(state, field)) {
        state[field] = swbFlag(patch[field], 0);
      }
    });
  }

  function swbRaise(state, id, full) {
    if (!swbFaultDef(id)) { return; }
    var queued = state.queue.indexOf(id);
    if (queued !== -1) { state.queue.splice(queued, 1); }
    if (state.active.indexOf(id) !== -1) { return; }
    var closed = state.done.indexOf(id);
    if (!full && closed !== -1) { state.done.splice(closed, 1); }
    state.active.push(id);
    swbSnap(state, full ? swbFaults[id].snap : swbFaults[id].patch || swbFaults[id].snap);
    swbSay(state, "swbNSecond", { g: id });
  }

  /* The physics, exactly as the two rulebook pages describe them. */
  function swbDrift(state) {
    var heat = 0;
    if (!state.damper) { heat += 1; } else if (state.blower) { heat -= 1; }
    if (state.feed) { heat += 1; }
    var packed = (state.pump1 && !state.valveC) || (state.pump2 && !state.valveD);
    var flow = 0;
    if (state.pump1 && !state.valveC) { flow += 1; }
    if (state.pump2 && !state.valveD) { flow += 1; }
    if (packed && state.pressure >= 5) { flow += 1; }
    if (state.valveC && !state.pump1) { flow -= 1; }
    state.temperature = swbClamp(state.temperature + heat, 0, swbCeiling);
    state.pressure = swbClamp(state.pressure + flow, 0, swbCeiling);
    state.arcBeats = state.arc ? state.arcBeats + 1 : 0;
  }

  /* The two swings the switch seat cannot see coming, and the packing a running
   * pump against a shut valve always ends in. */
  function swbTraps(state, action) {
    if (action === "valveC" && state.valveC && state.pump1 && state.breaker) {
      state.arc = 1;
      state.stress += 1;
      swbRaise(state, "arcing");
      swbSay(state, "swbNSlam", { f: "valveC" });
      swbSay(state, "swbNStress", { f: "arc", n: state.stress });
    } else if (action === "breaker" && state.breaker && state.feed) {
      state.arc = 1;
      swbRaise(state, "arcing");
      swbSay(state, "swbNArcBack", { f: "feed" });
    } else if (action === "pump1" && state.pump1 && !state.valveC && state.pressure >= 5) {
      swbRaise(state, "cavitation");
      swbSay(state, "swbNCavitation", { f: "pump1" });
    }
  }

  /* Work orders read one way for the two dials and one way for every flag. */
  function swbNeedsMet(state, need) {
    var value = swbNum(state[need[0]], 0);
    return need[0] === "pressure" || need[0] === "temperature" ? value <= need[1] : value === need[1];
  }

  function swbFaultMet(state, id) {
    var def = swbFaultDef(id);
    if (!def) { return true; }
    for (var index = 0; index < def.need.length; index += 1) {
      if (!swbNeedsMet(state, def.need[index])) { return false; }
    }
    return true;
  }

  /* One lever, one way or the other, with the interlocks that refuse it. A
   * refusal still spends the beat: standing wrong costs time, as it should. */
  function swbFlip(state, action) {
    var flips = { damper: 1, blower: 1, feed: 1, strainer: 1, breaker: 1, valveC: 1, valveD: 1, pump1: 1, pump2: 1 };
    var on = swbOwn(flips, action) ? (state[action] ? 0 : 1) : 1;
    function moved() {
      state[action] = on;
      swbSay(state, "swbNFlipt", { f: action });
    }
    if (action === "blower" && !state.damper) {
      swbSay(state, "swbNNoAir", { f: "damper" });
    } else if (action === "valveD" && on && state.strainer) {
      swbSay(state, "swbNLocked", { f: "strainer" });
    } else if (action === "pump1" && on && !state.breaker) {
      swbSay(state, "swbNDead", { f: "breaker" });
    } else if (action === "pump2" && on && (!state.breaker || !state.valveD)) {
      swbSay(state, "swbNStarve", { f: state.breaker ? "valveD" : "breaker" });
    } else if (action === "bleed") {
      if (!state.valveC || !state.breaker) {
        swbSay(state, "swbNDead", { f: state.breaker ? "valveC" : "breaker" });
      } else {
        state.pressure = swbClamp(state.pressure - 2, 0, swbCeiling);
        swbSay(state, "swbNBled", { f: "pressure" });
      }
    } else if (action === "prime") {
      if (!state.breaker) {
        swbSay(state, "swbNDead", { f: "breaker" });
      } else if (state.arc) {
        state.stress += 1;
        swbRaise(state, "arcing");
        swbSay(state, "swbNFlash", { f: "arc" });
        swbSay(state, "swbNStress", { f: "arc", n: state.stress });
      } else if (!state.strainer) {
        swbSay(state, "swbNSpin", { f: "strainer" });
      } else {
        state.pump1 = 1;
        swbSay(state, "swbNPrimed", { f: "pump1" });
      }
    } else if (action === "damper" || action === "feed") {
      state[action] = on;
      state.temperature = swbClamp(state.temperature + (action === "damper" ? (on ? -1 : 0) : (on ? 1 : -1)), 0, swbCeiling);
      swbSay(state, "swbNFlipt", { f: action });
    } else if (action === "blower") {
      state.blower = on;
      state.temperature = swbClamp(state.temperature + (on ? -2 : 0), 0, swbCeiling);
      swbSay(state, "swbNFlipt", { f: "blower" });
    } else if (action === "breaker") {
      state.breaker = on;
      if (!on) {
        state.arc = 0;
        state.arcBeats = 0;
        state.pump1 = 0;
        state.pump2 = 0;
        swbSay(state, "swbNTrip");
      } else {
        swbSay(state, "swbNFlipt", { f: "breaker" });
      }
    } else if (swbOwn(flips, action)) {
      moved();
    } else {
      swbSay(state, "swbNWha");
    }
  }

  function swbHand(state, action) {
    if (action === "hold") {
      state.beats += 1;
      swbDrift(state);
      swbSettle(state);
      swbStressCheck(state);
      swbSay(state, "swbNHeld");
      return;
    }
    var control = swbControl(action);
    if (!control) {
      swbSay(state, "swbNWha");
      return;
    }
    if (state.enforce && control.seat !== state.seat) {
      swbSay(state, "swbNSeat", { f: control.id, s: control.seat });
      return;
    }
    state.beats += 1;
    swbFlip(state, action);
    swbTraps(state, action);
    swbDrift(state);
    swbSettle(state);
    swbStressCheck(state);
  }

  function swbSettle(state) {
    var still = [];
    var chain = (swbShiftDef(state.shiftId) || {}).chain || {};
    state.active.forEach(function (id) {
      if (!swbFaultMet(state, id)) {
        still.push(id);
        return;
      }
      state.done.push(id);
      swbSay(state, "swbNCleared", { g: id });
      var wakes = chain[id];
      if (wakes && swbFaultDef(wakes) && state.queue.indexOf(wakes) === -1 &&
        state.active.indexOf(wakes) === -1 && state.done.indexOf(wakes) === -1) {
        state.queue.unshift(wakes);
      }
    });
    state.active = still;
    swbLive(state);
  }

  /* One stress event per beat: a redlined dial is pushed back down to where the
   * operators can work again, and the counter is what ends the run. */
  function swbStressCheck(state) {
    if (state.won || state.over) { return; }
    var reason = "";
    if (state.pressure >= swbStressLine) {
      state.pressure = swbStressBack;
      reason = "pressure";
    } else if (state.temperature >= swbStressLine) {
      state.temperature = swbStressBack;
      reason = "temperature";
    } else if (state.arcBeats >= swbArcPatience) {
      state.arcBeats = 0;
      reason = "arc";
    }
    if (!reason) { return; }
    state.stress += 1;
    swbSay(state, "swbNStress", { f: reason, n: state.stress });
  }

  function swbBoardSolved(state) {
    if (!state) { return false; }
    return swbIds(state.active).length === 0 && swbIds(state.queue).length === 0 && swbIds(state.done).length > 0;
  }

  function swbFinish(state) {
    if (state.over || state.won) { return state; }
    if (state.stress >= state.budget) {
      state.over = true;
      swbSay(state, "swbNOver", { n: state.stress });
    } else if (swbBoardSolved(state)) {
      state.won = true;
      swbSay(state, "swbNWon", { n: state.beats });
    }
    return state;
  }

  /* App.boardStep(state, actions): the whole game in one pure call. "actions" is
   * one lever name or an ordered list of them; a finished machine stays put. */
  function swbBoardStep(state, actions) {
    var next = swbCopy(state);
    if (next.over || next.won) { return next; }
    var list = swbIsList(actions) ? actions : [actions];
    swbLive(next);
    for (var index = 0; index < list.length && index < 64; index += 1) {
      if (typeof list[index] !== "string") { continue; }
      if (list[index] === "swap") {
        /* Changing stools is attention, not machine work: it costs no beat, which
         * is what keeps a solo shift as cheap as a two-seat one. */
        next.seat = next.seat === "a" ? "b" : "a";
        swbSay(next, "swbNPaired", { s: next.seat });
        continue;
      }
      swbHand(next, list[index]);
      if (next.over || next.won) { break; }
    }
    return swbFinish(next);
  }

  /* App.boardDiagnose(fault): the canonical ordered solution line. */
  function swbBoardDiagnose(fault) {
    var def = swbFaultDef(fault);
    return def ? def.line.slice() : [];
  }

  /* One scripted pair of hands: replay the authored lines through boardStep and
   * see what a shift actually costs. The par, the bands and the checks all read
   * this, so no number in the game is invented. */
  function swbReplay(shift, solo) {
    var def = swbShiftDef(shift);
    var empty = { beats: 0, stress: 0, swaps: 0, won: false, over: false, script: [] };
    if (!def) { return empty; }
    var state = swbFresh(def, !!solo);
    var swaps = 0;
    var script = [];
    var guard = 0;
    swbLive(state);
    while (!state.won && !state.over && guard < 40) {
      guard += 1;
      var head = state.active.length ? state.active[0] : state.queue[0];
      if (!head) { break; }
      var line = swbBoardDiagnose(head);
      script.push({ fault: head, line: line.slice() });
      for (var index = 0; index < line.length; index += 1) {
        var owner = swbControl(line[index]);
        if (solo && owner && owner.seat !== state.seat) {
          state = swbBoardStep(state, "swap");
          swaps += 1;
        }
        state = swbBoardStep(state, line[index]);
        if (state.won || state.over || swbFaultMet(state, head)) { break; }
      }
      state = swbFinish(state);
      if (!state.active.length && !state.queue.length) { break; }
    }
    return { beats: state.beats, stress: state.stress, swaps: swaps, won: !!state.won, over: !!state.over, script: script };
  }

  var swbRunCache = {};

  function swbReplayFor(shift) {
    var def = swbShiftDef(shift);
    if (!def) {
      return { beats: 0, stress: 0, swaps: 0, won: false, over: false, script: [] };
    }
    if (!swbRunCache[def.id]) { swbRunCache[def.id] = swbReplay(def, false); }
    return swbRunCache[def.id];
  }

  function swbBoardSolvable(shift) {
    var run = swbReplay(shift, false);
    return run.won && run.stress === 0;
  }

  function swbBoardSoloWin(shift) {
    var run = swbReplay(shift, true);
    return run.won && run.stress === 0;
  }

  /* Bands: three stars at the measured par, two within three beats of it, one
   * inside the eight beats a hesitating pair can spend. */
  function swbBands(shift) {
    var par = swbReplayFor(shift).beats;
    return [par, par + 3, par + 8];
  }

  function swbStarsForRun(shift, stress, beats) {
    return Math.max(1, starsFor(beats, swbBands(shift), "low") - stress);
  }

  function swbScoreRun(stress, beats) {
    return stress * swbStressWeight + beats;
  }

  /* Seeded and cosmetic only: the shop-floor log number on the shift card. The
   * faults are authored, so no shuffle ever moves a rule. */
  function swbRandom(seed) {
    var value = seed || 7;
    return function () {
      value = (value * 1103515245 + 12345) % 2147483648;
      return value / 2147483648;
    };
  }

  function swbPlate(shift) {
    var def = swbShiftDef(shift);
    if (!def) { return 1000; }
    var roll = swbRandom(def.id.charCodeAt(1) * 977 + swbShiftLog(def).length * 31)();
    return 1000 + Math.floor(roll * 8999);
  }

  /* --- the panel ------------------------------------------------------- */
  function initSwitchboardDuoGame(panelEl) {
    if (!panelEl) { return; }

    var campaign = createCampaign({ key: "switchboard-duo-campaign", levels: swbShifts });
    var shift = swbShifts[campaign.indexOf(campaign.nextLevelId())] || swbShifts[0];
    var solo = true;
    var state = swbFresh(shift, solo);
    var bCursor = 0;
    var lastBest = false;
    var lastNext = "";
    var hud = build("div", "game-hud");
    var stressEl = build("strong");
    var beatsEl = build("strong");
    var ordersEl = build("strong");
    [["swbStressLabel", stressEl], ["swbBeatsLabel", beatsEl], ["swbOrdersLabel", ordersEl]]
      .forEach(function (pair) {
        var stat = build("div", "game-stat");
        stat.appendChild(build("span", "", pair[0]));
        stat.appendChild(pair[1]);
        hud.appendChild(stat);
      });

    /* The two control desks, side by side: same shape, different halves. */
    var desks = build("div", "swb-desks");
    var deskA = makeDesk("a");
    var deskB = makeDesk("b");
    desks.appendChild(deskA.el);
    desks.appendChild(deskB.el);
    var result = build("p", "game-result");
    result.setAttribute("role", "status");
    var shiftRow = makePicker("swbShiftLabel", "swbShiftSel");
    var shiftSel = shiftRow.sel;
    var modeRow = makePicker("swbModeLabel", "swbSeatSel");
    var modeSel = modeRow.sel;
    ["solo", "duo"].forEach(function (value) {
      var option = build("option");
      option.value = value;
      option.textContent = t(value === "solo" ? "swbModeSolo" : "swbModeDuo");
      modeSel.appendChild(option);
    });
    modeSel.value = "solo";
    var actions = build("div", "game-actions");
    var newBtn = makeButton("primary", "btnNewRound");
    var swapBtn = makeButton("swb-btn-swap", "swbBtnSwap");
    var bestEl = build("p", "game-best");
    actions.appendChild(newBtn);
    actions.appendChild(swapBtn);
    actions.appendChild(bestEl);
    var hint = build("p", "game-hint", "swbHint");
    [hud, desks, result, shiftRow.row, modeRow.row, actions, hint].forEach(function (node) {
      panelEl.appendChild(node);
    });

    /* One builder for the whole panel: createElement and appendChild only, so the
     * headless harness sees the tree a browser sees. "key" is a copy key and
     * "plain" a literal (a printed key cap); the panel writes no markup string. */
    function build(tag, cls, key, plain) {
      var el = document.createElement(tag);
      if (cls) { el.className = cls; }
      if (key) {
        el.setAttribute("data-i18n", key);
        el.textContent = t(key);
      }
      if (plain !== undefined) { el.textContent = plain; }
      return el;
    }

    function makePicker(key, id) {
      var row = build("div", "elements-row");
      var label = build("label", "elements-label", key);
      label.setAttribute("for", id);
      var sel = build("select", "elements-select");
      sel.id = id;
      row.appendChild(label);
      row.appendChild(sel);
      return { row: row, sel: sel };
    }

    function makeButton(cls, key) {
      var btn = build("button", cls);
      btn.type = "button";
      var content = build("span", "button-content");
      content.appendChild(build("span", "", key));
      btn.appendChild(content);
      return btn;
    }

    function makePage(cls, keys) {
      var list = build("ol", cls);
      keys.forEach(function (key) { list.appendChild(build("li", "", key)); });
      return list;
    }

    /* One desk: who sits here and with which keys, the dials they may read, their
     * half of the order, their levers as buttons, their page of the rulebook. */
    function makeDesk(seat) {
      var el = build("section", "swb-desk swb-desk-" + seat);
      el.setAttribute("role", "group");
      el.setAttribute("tabindex", "0");
      el.setAttribute("aria-label", t(seat === "a" ? "swbDeskA" : "swbDeskB"));
      var top = build("div", "swb-desk-top");
      top.appendChild(build("span", "swb-desk-name", seat === "a" ? "swbDeskA" : "swbDeskB"));
      top.appendChild(build("span", "swb-desk-keys", swbKeys[seat]));
      el.appendChild(top);
      var dials = build("div", "swb-dials");
      var dialRefs = {};
      ["pressure", "temperature", "arc"].forEach(function (field) {
        var inst = swbInst(field);
        var row = build("div", "swb-dial");
        var value = build("span", "swb-dial-value");
        var bar = build("span", "swb-bar");
        var fill = build("span", "swb-bar-fill");
        bar.appendChild(fill);
        row.appendChild(build("span", "swb-dial-name", inst.nameKey));
        row.appendChild(bar);
        row.appendChild(value);
        dials.appendChild(row);
        dialRefs[field] = { row: row, value: value, fill: fill };
      });
      el.appendChild(dials);
      var reading = build("p", "swb-reading");
      var order = build("p", "swb-order");
      el.appendChild(reading);
      el.appendChild(order);
      var rack = build("div", "swb-rack");
      var refs = {};
      swbRackOf(seat).forEach(function (control) {
        var btn = build("button", "swb-key");
        btn.type = "button";
        btn.appendChild(build("span", "swb-key-cap", "", control.key));
        btn.appendChild(build("span", "swb-key-name", control.nameKey));
        var value = build("span", "swb-key-state");
        btn.appendChild(value);
        btn.addEventListener("click", function () { act(control.id); });
        rack.appendChild(btn);
        refs[control.id] = { btn: btn, value: value };
      });
      var holdBtn = build("button", "swb-key swb-key-hold");
      holdBtn.type = "button";
      holdBtn.appendChild(build("span", "swb-key-cap", "", seat === "a" ? "D" : "L"));
      holdBtn.appendChild(build("span", "swb-key-name", "swbHold"));
      holdBtn.addEventListener("click", function () { act("hold"); });
      rack.appendChild(holdBtn);
      el.appendChild(rack);
      el.appendChild(build("p", "swb-page-title", seat === "a" ? "swbPageTitleA" : "swbPageTitleB"));
      el.appendChild(makePage("swb-page", seat === "a" ? swbPageA : swbPageB));
      return { el: el, seat: seat, dials: dialRefs, reading: reading, order: order, keys: refs };
    }

    /* --- text: every reading is a sentence, not a colour ---------------- */
    function seatName(seat) { return t(seat === "b" ? "swbDeskBShort" : "swbDeskAShort"); }

    function fieldName(field) {
      var control = swbControl(field);
      if (control) { return t(control.nameKey); }
      var inst = swbInst(field);
      return inst ? t(inst.nameKey) : t("swbNoFault");
    }

    function faultName(id) {
      var def = swbFaultDef(id);
      return def ? t(def.n) : t("swbNoFault");
    }

    function noteText(note) {
      if (!note || !note.k) { return ""; }
      var vars = {};
      if (typeof note.n === "number" && note.n >= 0) { vars.n = note.n; }
      if (note.f) { vars.k = fieldName(note.f); }
      if (note.g) { vars.g = faultName(note.g); }
      if (note.s) { vars.s = seatName(note.s); }
      return t(note.k, vars);
    }

    /* What this stool can see, plus an explicit instruction to ask for the rest. */
    function readingLine(seat) {
      var parts = [];
      swbInstruments.forEach(function (inst) {
        if (swbReader(inst, state.dim) !== "both" && swbReader(inst, state.dim) !== seat) { return; }
        var value = state[inst.f];
        parts.push(instName(inst) + " " + (inst.num
          ? swbClamp(value, 0, swbCeiling) + " " + swbWord(inst, value)
          : swbWord(inst, value)));
      });
      parts.push(t("swbAskSeat", { s: seatName(seat === "a" ? "b" : "a") }));
      return parts.join(" \u00b7 ");
    }

    function instName(inst) { return t(inst.nameKey); }

    function needText(need) {
      var inst = swbInst(need[0]);
      return instName(inst) + " " + (inst.num
        ? t("swbOpAtMost") + " " + swbClamp(need[1], 0, swbCeiling)
        : swbWord(inst, need[1]));
    }

    /* Half the work order per seat: each desk prints its own half of the
     * condition, which is exactly why the two of them have to talk. */
    function orderLine(seat) {
      var head = state.active.length ? state.active[0] : "";
      var def = swbFaultDef(head);
      if (!def) { return t("swbNoOrder"); }
      var both = shift.pages === "both";
      var mine = [];
      var theirs = 0;
      def.need.forEach(function (need) {
        if (need[2] === seat || both) { mine.push(needText(need)); } else { theirs += 1; }
      });
      var text = t("swbOrderHead", { g: faultName(head) }) + " - " + t(def.c) + ". ";
      text += t(mine.length ? "swbYourHalf" : "swbNoYourHalf", { k: mine.join(" \u00b7 ") });
      if (theirs) {
        text += " " + t("swbTheirHalf", { s: seatName(seat === "a" ? "b" : "a"), n: theirs });
      }
      if (state.queue.length) {
        text += " " + t("swbQueued", { g: faultName(state.queue[0]) });
      }
      return text;
    }

    function refreshPicker() {
      fillCampaignPicker(shiftSel, campaign, function (def) {
        return t(def.labelKey);
      }, t("elementsLocked"));
      shiftSel.value = shift.id;
      bestEl.textContent = t("campaignStars", { n: campaign.totalStars(), max: campaign.maxStars() });
    }

    function renderHud() {
      var log = swbShiftLog(shift);
      stressEl.textContent = t("swbStressStat", { n: swbClamp(state.stress, 0, 99), max: swbClamp(state.budget, 1, 9) });
      beatsEl.textContent = t("swbBeatsStat", { n: swbClamp(state.beats, 0, 9999), p: swbClamp(swbReplayFor(shift).beats, 0, 9999) });
      ordersEl.textContent = t("swbOrdersStat", {
        n: Math.min(swbClamp(state.done.length, 0, 99), log.length),
        max: log.length,
      });
    }

    function renderDesk(desk) {
      var seat = desk.seat;
      desk.el.classList.toggle("is-seated", !state.enforce || state.seat === seat);
      ["pressure", "temperature", "arc"].forEach(function (field) {
        var inst = swbInst(field);
        var ref = desk.dials[field];
        var known = swbReader(inst, state.dim) === "both" || swbReader(inst, state.dim) === seat;
        ref.row.hidden = !known;
        ref.row.classList.toggle("is-lit", field === "arc" && !!state.arc);
        ref.row.classList.toggle("is-hot", !!inst.num && state[field] >= swbStressLine - 1);
        ref.value.textContent = known ? (inst.num
          ? " " + swbClamp(state[field], 0, swbCeiling) + " " + swbWord(inst, state[field])
          : " " + swbWord(inst, state[field])) : "";
        ref.fill.style.width = inst.num
          ? Math.round((100 * swbClamp(state[field], 0, swbCeiling)) / swbCeiling) + "%"
          : (swbFlag(state[field], 0) ? "100%" : "10%");
      });
      swbRackOf(seat).forEach(function (control) {
        var ref = desk.keys[control.id];
        var inst = control.field ? swbInst(control.field) : null;
        ref.value.textContent = inst ? swbWord(inst, state[control.field]) : t("swbReady");
        ref.btn.classList.toggle("is-pointed", seat === "b" && bCursor === rackIndexOf(control.id));
        ref.btn.setAttribute("aria-label", t(control.nameKey) + " " + ref.value.textContent + " " + control.key);
      });
      desk.reading.textContent = readingLine(seat);
      desk.order.textContent = orderLine(seat);
    }

    function rackIndexOf(id) {
      var rack = swbRackOf("b");
      for (var index = 0; index < rack.length; index += 1) {
        if (rack[index].id === id) { return index; }
      }
      return 0;
    }

    function rackAt(at) {
      var rack = swbRackOf("b");
      return rack[swbClamp(at, 0, rack.length - 1)] || rack[0];
    }

    function render() {
      renderHud();
      renderDesk(deskA);
      renderDesk(deskB);
      var notes = [];
      for (var index = state.log.length - 1; index >= 0 && notes.length < 2; index -= 1) {
        var text = noteText(state.log[index]);
        if (text) { notes.unshift(text); }
      }
      var line = notes.join(" ");
      if (state.won) { line = winLine(); }
      else if (state.over) {
        line = t("swbLose", { n: swbClamp(state.stress, 0, 99), max: swbClamp(state.budget, 1, 9) });
      }
      result.textContent = line;
    }

    function winLine() {
      var stars = swbStarsForRun(shift, state.stress, state.beats);
      var line = t("swbWin", {
        n: swbClamp(state.beats, 0, 9999),
        s: stars,
        p: swbClamp(swbReplayFor(shift).beats, 0, 9999),
      });
      if (lastBest) { line += " " + t("newBest"); }
      if (lastNext) {
        line += " " + t("swbNextShift", { g: t(swbShifts[campaign.indexOf(lastNext)].labelKey) });
      } else if (campaign.clearedCount() === swbShifts.length) {
        line += " " + t("swbShiftsDone");
      }
      return line;
    }

    /* Every control - key, button or touch - arrives here and runs through the
     * exported resolver, so what the panel shows is what the checks replay. */
    function act(id) {
      if (state.won || state.over) {
        render();
        return;
      }
      var wasWon = state.won;
      var wasOver = state.over;
      state = swbBoardStep(state, [id]);
      if (!wasWon && state.won) { finishRun(); }
      else if (!wasOver && state.over) { swbNotify(false); }
      render();
    }

    function finishRun() {
      var stars = swbStarsForRun(shift, state.stress, state.beats);
      var outcome = campaign.record(shift.id, {
        stars: stars,
        best: swbScoreRun(state.stress, state.beats),
        better: "low",
      });
      lastBest = !!outcome.isBest;
      lastNext = outcome.unlockedNext || "";
      logAction(t("swbLog", { n: swbClamp(state.beats, 0, 9999), s: stars }));
      var rect = newBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      swbNotify(outcome.isBest || outcome.firstClear);
      refreshPicker();
    }

    function loadShift(def) {
      shift = def || shift;
      state = swbFresh(shift, solo);
      bCursor = 0;
      lastBest = false;
      lastNext = "";
      swbLive(state);
      refreshPicker();
      render();
      result.textContent = t("swbPrompt", {
        name: t(shift.labelKey),
        g: t(shift.briefKey),
        n: swbShiftLog(shift).length,
        max: swbClamp(shift.budget, 1, 9),
        p: swbClamp(swbReplayFor(shift).beats, 0, 9999),
        i: swbPlate(shift),
        s: seatName(state.seat),
      });
    }

    /* --- input: one key listener on the panel, two labelled clusters ----- */
    panelEl.addEventListener("keydown", function (event) {
      if (!event || typeof event.key !== "string") { return; }
      var key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      var tag = String((event.target && event.target.tagName) || "");
      /* A picker keeps its own typing and a focused button its own Enter: the desk
       * never steals a keystroke the browser already answers to. */
      if (tag === "SELECT" && key.length === 1) { return; }
      if (key === "Tab") {
        /* Deliberately not prevented: Tab still walks the form, and in the solo
         * seat plan it also changes stools, which costs no beat. */
        if (solo) { act("swap"); }
        return;
      }
      if (key === "f") {
        event.preventDefault();
        act("swap");
        return;
      }
      if (key === "ArrowLeft" || key === "ArrowUp") {
        event.preventDefault();
        bCursor = bCursor > 0 ? bCursor - 1 : 4;
        render();
        return;
      }
      if (key === "ArrowRight" || key === "ArrowDown") {
        event.preventDefault();
        bCursor = bCursor < 4 ? bCursor + 1 : 0;
        render();
        return;
      }
      if (key === " ") {
        if (tag === "BUTTON" || tag === "SELECT") { return; }
        event.preventDefault();
        act("hold");
        return;
      }
      if (key === "Enter") {
        if (tag === "BUTTON" || tag === "SELECT") { return; }
        event.preventDefault();
        var pointed = rackAt(bCursor);
        act(pointed ? pointed.id : "hold");
        return;
      }
      if (key === "Escape") {
        event.preventDefault();
        result.textContent = orderLine(state.seat);
        return;
      }
      var mapped = swbOwn(swbKeyMap, key) ? swbKeyMap[key] : "";
      if (!mapped) { return; }
      event.preventDefault();
      act(mapped);
    });
    shiftSel.addEventListener("change", function () {
      var index = campaign.indexOf(shiftSel.value);
      if (index < 0) {
        shiftSel.value = shift.id;
        return;
      }
      if (!campaign.isUnlocked(swbShifts[index].id)) {
        shiftSel.value = shift.id;
        result.textContent = t("swbLockedShift", { g: t(swbShifts[index].labelKey) });
        return;
      }
      loadShift(swbShifts[index]);
    });
    modeSel.addEventListener("change", function () {
      solo = modeSel.value !== "duo";
      modeSel.value = solo ? "solo" : "duo";
      loadShift(shift);
    });
    newBtn.addEventListener("click", function () { loadShift(shift); });
    swapBtn.addEventListener("click", function () { act("swap"); });

    /* Shell pause: nothing ticks while the drawer is shut, so freezing the shift
     * is only a word - the levers, the fault line and the stress count stay
     * exactly where the operators left them. */
    App.quietResetSwitchboardDuo = function () {
      if (state.won || state.over) { return; }
      /* A fresh shift keeps its work-order intro: the shell pauses every
       * game as it opens the tab, and that pause must not replace the only
       * place the level's name and brief are printed. */
      if (!state.beats && !state.stress && !state.done.length) { return; }
      result.textContent = t("swbPaused", {
        n: swbClamp(state.beats, 0, 9999),
        k: swbClamp(state.stress, 0, 99),
      });
    };
    loadShift(shift);
  }

  /* Bilingual copy travels with the game: addStrings only fills keys i18n.js does
   * not already own, so the shared dictionary stays authoritative. */
  App.addStrings({
    en: {
      "tabSwitchboardDuo": "Switchboard Duo",
      "swbS1": "First hour",
      "swbS2": "Split pages",
      "swbS3": "One wakes another",
      "swbS4": "Dim glass",
      "swbS5": "Night shift",
      "swbS6": "The crowded desk",
      "swbS7": "Dim and busy",
      "swbS8": "A pack that pulls the board",
      "swbS9": "Two and no more",
      "swbS10": "Every order on the floor",
      "swbY6": "Seven orders on a bright glass, and the shift survives three stress events.",
      "swbY7": "Seven orders behind a dim glass, and the shift survives three stress events.",
      "swbY8": "Seven orders, three stress events, and a packed pump wakes a blackout.",
      "swbY9": "Nine orders, two stress events, and an arc wakes a lost prime.",
      "swbY10": "Twelve orders, two stress events, and a flashover wakes the dark.",
      "swbS11": "The arc returns",
      "swbY11": "Fourteen orders, two stress events, and no cascade: the arc and the starved pump simply come back.",
      "swbS12": "Dim return",
      "swbY12": "Thirteen orders on dim glass, two stress events, and a hot bus wakes the choked strainer.",
      "swbS13": "Two links down",
      "swbY13": "Thirteen orders, two stress events, and a stifled header wakes the choked strainer, which wakes the hot bus.",
      "swbS14": "Choke and pack",
      "swbY14": "Thirteen orders on dim glass, two stress events, and a stifled header wakes a choke that packs both pumps.",
      "swbS15": "One event only",
      "swbY15": "Thirteen orders on dim glass, a budget of one stress event, and an overheat wakes a choke that blacks the desk out.",
      "swbS16": "Three-deep cascade",
      "swbY16": "Thirteen orders, one stress event, and an arc wakes a hot bus, the bus chokes the strainer, the choke blacks out.",
      "swbS17": "Dim pack",
      "swbY17": "Fourteen orders on dim glass, one stress event, and a starved pump wakes a double pack that chokes the strainer.",
      "swbS18": "Dark return",
      "swbY18": "Fourteen orders, one stress event, and an overheat wakes a stuck header whose relief chokes the strainer.",
      "swbS19": "Arc to blackout",
      "swbY19": "Fourteen orders on dim glass, one stress event, and an arc starves a pump, the starved pump chokes the strainer, and the choke calls the hot bus.",
      "swbS20": "Full cascade",
      "swbY20": "Fifteen orders, one stress event, and a flashover stifles the header, the stifled header chokes the strainer, and the choke packs both pumps.",
      "swbS21": "Emergency Overload",
      "swbY21": "Sixteen orders on dim glass, one stress event, and a flashover triggers a three-deep cascade across the pumps.",
      "swbS22": "Deadweight Surge",
      "swbY22": "Seventeen orders, one stress event, and a compound failure ripples from the header through to the main bus.",
      "swbS23": "Deep Grid Lockdown",
      "swbY23": "Eighteen orders on dim glass, a budget of one stress event, and double cavitation threatens total blackout.",
      "swbS24": "The Infinite Grid",
      "swbY24": "Nineteen orders, one stress event, and the complete cascade chain tests both operators to the limit.",
      "swbS25": "The Deep Fall",
      "swbY25": "Twenty orders on dim glass, one stress event, and a cleared overheat wakes a four-link cascade that ends in a blackout.",
      "swbS26": "Everything Comes Back",
      "swbY26": "Twenty-six orders, one stress event, and no cascade at all: the arc, the starved pump and the lost prime simply come back.",
      "swbS27": "The Dim Return",
      "swbY27": "Twenty-five orders on dim glass, one stress event, a starved pump wakes a three-link cascade, and the flashovers return.",
      "swbS28": "Heat Across the Desks",
      "swbY28": "Twenty-six orders on dim glass, one stress event, and the heat orders return while their dial sits at the switch desk.",
      "swbS29": "Blackout Returns",
      "swbY29": "Twenty-five orders, one stress event, the blackout is authored four times, and an arc wakes a three-link cascade.",
      "swbS30": "The Whole Board",
      "swbY30": "Twenty-eight orders, one stress event, a five-link cascade from the overheat to the stifled header, and the longest orders return for the finale.",
      "swbS31": "Thirty on the Line",
      "swbY31": "Thirty-two orders on a bright glass, one stress event, thirty authored and two woken by a hot bus.",
      "swbS32": "The Long Board",
      "swbY32": "Thirty-four orders, one stress event, thirty-two authored and two woken when the blackout clears.",
      "swbS33": "Six Links Down",
      "swbY33": "Thirty-eight orders, one stress event, thirty-two authored plus a six-link cascade from the overheat to the arc.",
      "swbS34": "Two Fires",
      "swbY34": "Thirty-eight orders, one stress event, thirty-four authored and two independent cascades: a header branch through both pumps and an arc branch through the bus to the stifled header.",
      "swbS35": "Heat, Read Across",
      "swbY35": "Thirty-eight orders on dim glass, one stress event, thirty-four authored, the heat orders return three times, and a stifled header wakes a four-link cascade.",
      "swbS36": "Four of a Kind",
      "swbY36": "Thirty-nine orders, one stress event, thirty-five authored, the flashover is authored four times, and a hot bus wakes four more.",
      "swbS37": "The Dim Six",
      "swbY37": "Thirty-nine orders on dim glass, one stress event, thirty-three authored plus a six-link cascade from the blackout to the stifled header.",
      "swbS38": "Twin Cascades",
      "swbY38": "Thirty-nine orders, one stress event, thirty-three authored and two full three-link cascades falling at once.",
      "swbS39": "No Cascade, All Return",
      "swbY39": "Thirty-nine orders, one stress event, and no cascade at all: the blackout is authored nine times and the flashover nine.",
      "swbS40": "Seven Links, Whole Board",
      "swbY40": "Thirty-nine orders on the whole board, one stress event, thirty-two authored and a seven-link cascade that wakes every other fault from the arc to the lost prime.",
      "swbY1": "Every order prints both of its halves on your desk.",
      "swbY2": "Your page is your page: read it out, do not hand it over.",
      "swbY3": "Relieve the header and the arc wakes; a burning arc starves pump 2.",
      "swbY4": "The glass is dim: the heat dial is rewired to the switch desk.",
      "swbY5": "All six orders, and the shift survives only two stress events.",
      "swbStressLabel": "Stress",
      "swbBeatsLabel": "Beats",
      "swbOrdersLabel": "Orders",
      "swbStressStat": "{n} / {max}",
      "swbBeatsStat": "{n} (par {p})",
      "swbOrdersStat": "{n} / {max}",
      "swbShiftLabel": "Choose a shift",
      "swbModeLabel": "Seat plan",
      "swbModeSolo": "One operator, both seats",
      "swbModeDuo": "Two operators",
      "swbBtnSwap": "Swap Seats",
      "swbDeskA": "Operator A - gauge desk",
      "swbDeskB": "Operator B - switch desk",
      "swbDeskAShort": "seat A",
      "swbDeskBShort": "seat B",
      "swbKeysA": "Keys Q W E R A S levers, D or Space holds, F or Tab swaps seats",
      "swbKeysB": "Keys I O P K valves and pumps, L holds, arrows walk the rack finger, Enter presses it",
      "swbHold": "Hold the line",
      "swbPageTitleA": "Rulebook - valve page (gauge seat)",
      "swbPageTitleB": "Rulebook - pump page (switch seat)",
      "swbRa1": "The dials live here: pressure, heat, and the arc lamp. Either dial at 8 or more is a stress event, and the shift only survives so many.",
      "swbRa2": "Heat leaves through the damper. Damper shut: heat climbs 1 a beat. A high feed adds 1 more. Damper open with the blower running pulls 1 back.",
      "swbRa3": "The header relieves only through valve C, and only with pump 1 stopped: an open C with a stopped pump loses 1 pressure a beat, while a pump driving against a shut C gains 1 - or 2 once the pressure reaches 5.",
      "swbRa4": "Your bleed handle takes 2 off the pressure, but it only bites with valve C open and the breaker in, and valve C is the switch seat's to read.",
      "swbRa5": "The breaker is the last word on an arc: tripping it kills the lamp and stops every pump. Nothing bleeds and nothing primes while it is out.",
      "swbRa6": "Valve D's line runs through your strainer: D only swings with the strainer out, and pump 2 only runs clean with it seated again.",
      "swbRa7": "You cannot see the valves or the pumps. Say your numbers out loud, and ask before you assume the other seat agrees with you.",
      "swbRb1": "The switchboard lives here: valve C, valve D, pump 1, pump 2 and the big arc lamp. Pressure and heat do not read on this side.",
      "swbRb2": "Never swing valve C with pump 1 turning: the header slams the bus, the lamp lights, and that is a stress event. Stop the pump first.",
      "swbRb3": "Pump 2 draws only from an open valve D. Against a shut D it spins on air and packs the header harder.",
      "swbRb4": "Priming pump 1 needs three things you cannot all see: a dark arc lamp, the breaker in, and a seated strainer over on the gauge desk.",
      "swbRb5": "Bringing the breaker back with a high feed throws the arc again. Ask the gauge seat to drop the feed before you call for it.",
      "swbRb6": "A pump at pressure 5 or more driving against a shut valve is cavitating: it is chewing itself. Stop it, relieve the header, kill the arc, then prime.",
      "swbRb7": "A lamp left burning for three beats starves pump 2, and a header relieved while a pump runs throws the arc: closing one order can start the next.",
      "swbIPressure": "pressure",
      "swbIHeat": "heat",
      "swbIArc": "arc lamp",
      "swbIC": "valve C",
      "swbID": "valve D",
      "swbIP1": "pump 1",
      "swbIP2": "pump 2",
      "swbIBreaker": "breaker",
      "swbIDamper": "damper",
      "swbIBlower": "blower",
      "swbIFeed": "feed",
      "swbIStrainer": "strainer",
      "swbIBleed": "bleed handle",
      "swbIPrime": "prime pump 1",
      "swbWSafe": "safe",
      "swbWWarm": "warm",
      "swbWHigh": "high",
      "swbWRed": "redline",
      "swbWDark": "dark",
      "swbWLit": "lit",
      "swbWShut": "shut",
      "swbWOpen": "open",
      "swbWStop": "stopped",
      "swbWRun": "running",
      "swbWOut": "out",
      "swbWIn": "in",
      "swbWOff": "off",
      "swbWOn": "on",
      "swbWLow": "low",
      "swbWFree": "out",
      "swbWSeat": "seated",
      "swbReady": "ready",
      "swbOpAtMost": "at most",
      "swbAskSeat": "not yours to read: ask {s} for the numbers on that desk",
      "swbOrderHead": "Working order - {g}",
      "swbYourHalf": "Your half: {k}.",
      "swbNoYourHalf": "This order has no half on your side: mind your dials and report.",
      "swbTheirHalf": "{n} more condition(s) sit at {s}.",
      "swbQueued": "Next on the shift log: {g}.",
      "swbNoOrder": "No order in hand: the machine is quiet, so hold the line.",
      "swbFoverheat": "Header running hot",
      "swbFstuckHeader": "Stuck header",
      "swbFarcing": "Arc on the bus",
      "swbFstarved": "Starved pump 2",
      "swbFcavitation": "Cavitating pump 1",
      "swbFbackpressure": "Back pressure",
      "swbFlostorPrime": "Lost prime",
      "swbFflashedOver": "Flashed over",
      "swbFstifledHeader": "Stifled header",
      "swbFchokedStrainer": "Choked strainer",
      "swbFpumpPack": "Double pump pack",
      "swbFhotBus": "Hot bus",
      "swbFblackout": "Blackout",
      "swbCoverheat": "the glass is steaming and the exhaust is plugged",
      "swbCstuckHeader": "the header is packed and nothing is taking it away",
      "swbCarcing": "the lamp is flashing over the bus",
      "swbCstarved": "pump 2 is turning and carrying nothing",
      "swbCcavitation": "pump 1 is grinding against a shut valve",
      "swbCbackpressure": "the line is packed behind a closed valve D",
      "swbClostorPrime": "the prime is gone and the pumps are only turning air",
      "swbCflashedOver": "a flash has bridged the bus and the feed has dropped out",
      "swbCstifledHeader": "the damper is shut and the header is breathing its own heat",
      "swbCchokedStrainer": "the strainer is silted and the line cannot draw",
      "swbCpumpPack": "pump 1 and pump 2 are driving one line and neither can unload",
      "swbChotBus": "the bus bar is glowing and the breaker will not stay in",
      "swbCblackout": "the whole desk is dark and every dial reads zero",
      "swbNoFault": "an unnamed fault",
      "swbNOrder": "New order: {g}.",
      "swbNSecond": "A second fault is on the line: {g}.",
      "swbNCleared": "Order closed: {g}.",
      "swbNStress": "Stress event on the {k} ({n}).",
      "swbNFlipt": "{k} moved.",
      "swbNBled": "The header bleeds: pressure down 2.",
      "swbNPrimed": "Pump 1 primed and turning.",
      "swbNDead": "The handle spins dead: {k} is not with you.",
      "swbNNoAir": "The blower only moves air through an open damper: the {k} is shut.",
      "swbNLocked": "Valve D will not swing: the {k} is seated.",
      "swbNStarve": "Pump 2 has nothing to draw from: check {k}.",
      "swbNSpin": "The priming handle spins free: the {k} is out.",
      "swbNSlam": "You swung valve C against a turning pump and the bus flashed over.",
      "swbNArcBack": "The breaker came in on a high feed and the arc jumped back.",
      "swbNCavitation": "Pump 1 is cavitating against a shut valve.",
      "swbNFlash": "You primed into a lit arc lamp.",
      "swbNTrip": "Breaker out: the lamp is dark and every pump is stopped.",
      "swbNHeld": "You hold the line: one beat, nothing flipped.",
      "swbNSeat": "{k} is not your seat's: sit at {s}, or hand the number over.",
      "swbNPaired": "Seated at {s}.",
      "swbNWha": "That handle is not on this machine.",
      "swbNOver": "The run ends at {n} stress events.",
      "swbNWon": "Shift cleared.",
      "swbPrompt": "{name}: {g} {n} orders to close and {max} stress events allowed; the scripted two-seat line takes {p} beats. Shop log {i}. You are at {s}.",
      "swbWin": "Shift closed in {n} beats - {s} stars (par {p}).",
      "swbLose": "The machine gave up at {n} stress events of {max}.",
      "swbPaused": "Paused: {n} beats in, {k} stress events. Nothing decays while you are away.",
      "swbNextShift": "Next shift unlocked: {g}.",
      "swbShiftsDone": "Every shift on the board is closed.",
      "swbLockedShift": "{g} is not rostered yet: close the shift before it.",
      "swbHint": "Duo: each operator reads only their own desk and page. Solo: Tab or F changes seats, swaps cost no beat, and every lever is a button too.",
      "swbLog": "Kept the switchboard alive in {n} beats - {s} stars",
    },
    zh: {
      "tabSwitchboardDuo": "配电台双人组",
      "swbS1": "第一小时",
      "swbS2": "规则分页",
      "swbS3": "一环扣一环",
      "swbS4": "灯光昏暗",
      "swbS5": "夜班",
      "swbS6": "忙乱的班台",
      "swbS7": "昏暗又繁忙",
      "swbS8": "一台卡死拖全桌",
      "swbS9": "只容两次",
      "swbS10": "满桌工单",
      "swbY6": "明亮的玻璃上压来七张工单，这一班只扛得住三次应力事件。",
      "swbY7": "昏暗的玻璃后头是七张工单，这一班只扛得住三次应力事件。",
      "swbY8": "七张工单、三次应力事件，而卡死的泵群会唤醒断电。",
      "swbY9": "九张工单、两次应力事件，而电弧会唤醒失引水。",
      "swbY10": "十二张工单、两次应力事件，而闪络会唤醒整桌断电。",
      "swbS11": "电弧回头",
      "swbY11": "十四张工单、两次应力事件，没有连环：电弧和断流的泵各自回头再来一次。",
      "swbS12": "昏暗的回头",
      "swbY12": "昏暗玻璃上十三张工单、两次应力事件，而发烫的母线唤醒堵死的滤网。",
      "swbS13": "连环两扣",
      "swbY13": "十三张工单、两次应力事件，而闷死的母管唤醒堵死的滤网，滤网再唤醒发烫的母线。",
      "swbS14": "堵网并泵",
      "swbY14": "昏暗玻璃上十三张工单、两次应力事件，而闷死的母管唤醒堵网，堵网把两台泵并挤在一起。",
      "swbS15": "只容一次",
      "swbY15": "昏暗玻璃上十三张工单，只容一次应力事件；而过热唤醒堵网，堵网让整桌断电。",
      "swbS16": "三环连爆",
      "swbY16": "十三张工单、一次应力事件；电弧唤醒发烫的母线，母线堵住滤网，滤网再拉下整桌断电。",
      "swbS17": "昏暗并泵",
      "swbY17": "昏暗玻璃上十四张工单、一次应力事件；断流的泵唤醒双泵并挤，并挤再堵死滤网。",
      "swbS18": "黑暗回头",
      "swbY18": "十四张工单、一次应力事件；过热唤醒憋死的母管，泄压时又堵死滤网。",
      "swbS19": "电弧到断电",
      "swbY19": "昏暗玻璃上十四张工单、一次应力事件；电弧让泵断流，断流唤醒堵网，堵网又叫来发烫的母线。",
      "swbS20": "全链坠落",
      "swbY20": "十五张工单、一次应力事件；闪络闷死母管，闷死的母管堵住滤网，堵网之后双泵并挤。",
      "swbS21": "应急超载",
      "swbY21": "昏暗玻璃上十六张工单，只容一次应力事件；闪络引发深层泵组级联故障。",
      "swbS22": "死重涌浪",
      "swbY22": "十七张工单、一次应力事件；从母管到主母线的一系列复合连锁故障接连爆发。",
      "swbS23": "深层锁网",
      "swbY23": "昏暗玻璃上十八张工单、一次应力事件；双重气蚀险情逼近全厂全黑断电。",
      "swbS24": "无限电网",
      "swbY24": "十九张工单、一次应力事件；完整的全链连锁故障将两席值班员逼至反应极限。",
      "swbS25": "深链坠落",
      "swbY25": "昏暗玻璃上二十张工单、一次应力事件；销掉过热会唤醒四环连坠，最后一环是整桌断电。",
      "swbS26": "全部回头",
      "swbY26": "二十六张工单、一次应力事件，完全没有连环：电弧、断流的泵和失引水各自回头再来。",
      "swbS27": "昏暗回头链",
      "swbY27": "昏暗玻璃上二十五张工单、一次应力事件；断流的泵唤醒三环连坠，而闪络一再回头。",
      "swbS28": "隔桌读温",
      "swbY28": "昏暗玻璃上二十六张工单、一次应力事件；温度表盘坐在开关席，而热工单不断回头。",
      "swbS29": "断电回头",
      "swbY29": "二十五张工单、一次应力事件；断电工单排了四次，而电弧唤醒三环连坠。",
      "swbS30": "整张班台",
      "swbY30": "二十八张工单、一次应力事件；从过热一路攀到闷死母管的五环连坠，最长的工单在终局一再回头。",
      "swbS31": "三十张上桌",
      "swbY31": "明亮玻璃上三十二张工单、一次应力事件：三十张实排，另外两张由发烫的母线唤醒。",
      "swbS32": "加长班台",
      "swbY32": "三十四张工单、一次应力事件：三十二张实排，断电销掉后再唤醒两张。",
      "swbS33": "六环连坠",
      "swbY33": "三十八张工单、一次应力事件：三十二张实排，再加从过热一路连到电弧的六环连坠。",
      "swbS34": "两处火头",
      "swbY34": "三十八张工单、一次应力事件：三十四张实排，两条互不相干的连坠——母管一支穿过两台泵，电弧一支穿过母线、连到闷死母管。",
      "swbS35": "越桌读温",
      "swbY35": "昏暗玻璃上三十八张工单、一次应力事件：三十四张实排，热工单一再回头，而闷死的母管唤醒四环连坠。",
      "swbS36": "四张同花",
      "swbY36": "三十九张工单、一次应力事件：三十五张实排，闪络排了四次，发烫的母线再唤醒四张。",
      "swbS37": "昏暗六环",
      "swbY37": "昏暗玻璃上三十九张工单、一次应力事件：三十三张实排，再加从断电一路连到闷死母管的六环连坠。",
      "swbS38": "双链齐落",
      "swbY38": "三十九张工单、一次应力事件：三十三张实排，两条完整的三环连坠同时落下。",
      "swbS39": "无链全回",
      "swbY39": "三十九张工单、一次应力事件，完全没有连环：断电工单排了九次，闪络也排了九次。",
      "swbS40": "七环全桌",
      "swbY40": "整张班台三十九张工单、一次应力事件：三十二张实排，再加一条七环连坠，从电弧一路唤醒到失引水。",
      "swbY1": "每张工单在你这台控制台上都印出完整两半。",
      "swbY2": "你那一页只是你那一页：念出来，别递过去。",
      "swbY3": "泄压会唤醒电弧；烧着的电弧会让 2 号泵断流。",
      "swbY4": "玻璃太暗：温度表盘改接到开关台。",
      "swbY5": "六张工单全来，而这一班只扛得住两次应力事件。",
      "swbStressLabel": "应力",
      "swbBeatsLabel": "节拍",
      "swbOrdersLabel": "工单",
      "swbStressStat": "{n} / {max}",
      "swbBeatsStat": "{n}（标准 {p}）",
      "swbOrdersStat": "{n} / {max}",
      "swbShiftLabel": "选择班次",
      "swbModeLabel": "席位安排",
      "swbModeSolo": "一人两席",
      "swbModeDuo": "双人两席",
      "swbBtnSwap": "交换席位",
      "swbDeskA": "值班员 A - 仪表台",
      "swbDeskB": "值班员 B - 开关台",
      "swbDeskAShort": "A 席",
      "swbDeskBShort": "B 席",
      "swbKeysA": "按键 Q W E R A S 是手柄，D 或空格按兵不动，F 或 Tab 换席位",
      "swbKeysB": "按键 I O P K 是阀门与泵，L 按兵不动，方向键移动开关手指，回车扳下",
      "swbHold": "按兵不动",
      "swbPageTitleA": "规程 - 阀门页（仪表席）",
      "swbPageTitleB": "规程 - 泵页（开关席）",
      "swbRa1": "表盘在这一侧：压力、温度、电弧灯。任一只表到 8 或以上就记一次应力事件，而这一班只扛得住那么多次。",
      "swbRa2": "热量从风门排出。风门关着：温度每拍涨 1。供油偏高再加 1。风门开着、鼓风机转着则每拍退 1。",
      "swbRa3": "母管只能靠 C 阀泄压，而且必须停掉 1 号泵：C 阀开着且 1 号泵停着，压力每拍退 1；泵顶着关死的阀每拍涨 1，压力到 5 之后涨 2。",
      "swbRa4": "你手边的放空把手一次减 2 压力，但只有 C 阀开着、断路器在位时才咬得住——而 C 阀归开关席看。",
      "swbRa5": "断路器是电弧的最后一句话：拉开就灭灯、所有泵都停。拉开时既放空不了也引不了泵。",
      "swbRa6": "D 阀的管路穿过你这边的滤网：滤网抽出时 D 阀才扳得动，而 2 号泵要把滤网坐回去才转得干净。",
      "swbRa7": "你看不到阀门和泵。把你的数字念出口，别以为对面席的想法和你一样。",
      "swbRb1": "开关台在这一侧：C 阀、D 阀、1 号泵、2 号泵，还有那盏大电弧灯。压力和温度在这一侧读不出来。",
      "swbRb2": "绝不在 1 号泵转着时扳 C 阀：母管会撞母线、电弧灯会亮，那就是一次应力事件。先停泵。",
      "swbRb3": "2 号泵只能从开着的 D 阀吸水：对着关死的阀它空转，还会把母管压得更死。",
      "swbRb4": "引 1 号泵要三样你看不全的东西：电弧灯灭着、断路器在位、以及仪表台那边坐定的滤网。",
      "swbRb5": "供油偏高时把断路器合回去，电弧立刻又来。先请仪表席把油降下来。",
      "swbRb6": "压力 5 或以上、泵顶着关死的阀就是空化：它在啃自己。先停泵、再泄压、灭了弧，然后才引泵。",
      "swbRb7": "电弧连烧三拍会让 2 号泵断流；而泵还在转时泄压会打出电弧：销掉一张工单，可能就是下一张的开始。",
      "swbIPressure": "压力",
      "swbIHeat": "温度",
      "swbIArc": "电弧灯",
      "swbIC": "C 阀",
      "swbID": "D 阀",
      "swbIP1": "1 号泵",
      "swbIP2": "2 号泵",
      "swbIBreaker": "断路器",
      "swbIDamper": "风门",
      "swbIBlower": "鼓风机",
      "swbIFeed": "供油",
      "swbIStrainer": "滤网",
      "swbIBleed": "放空把手",
      "swbIPrime": "引 1 号泵",
      "swbWSafe": "安全",
      "swbWWarm": "偏温",
      "swbWHigh": "偏高",
      "swbWRed": "爆表",
      "swbWDark": "灭着",
      "swbWLit": "亮着",
      "swbWShut": "关着",
      "swbWOpen": "开着",
      "swbWStop": "停着",
      "swbWRun": "转着",
      "swbWOut": "拉开",
      "swbWIn": "合上",
      "swbWOff": "关着",
      "swbWOn": "开着",
      "swbWLow": "偏低",
      "swbWFree": "抽出",
      "swbWSeat": "坐定",
      "swbReady": "可扳",
      "swbOpAtMost": "不高于",
      "swbAskSeat": "这一侧读不到：向{s}要那一台的读数",
      "swbOrderHead": "工单 - {g}",
      "swbYourHalf": "你这一半：{k}。",
      "swbNoYourHalf": "这张工单在你这边没有半句：看好你的表，随时报数。",
      "swbTheirHalf": "还有 {n} 个条件在{s}。",
      "swbQueued": "值班日志的下一张：{g}。",
      "swbNoOrder": "手上没有工单：机器安静着，按兵不动即可。",
      "swbFoverheat": "母管过热",
      "swbFstuckHeader": "母管憋压",
      "swbFarcing": "母线拉弧",
      "swbFstarved": "2 号泵断流",
      "swbFcavitation": "1 号泵空化",
      "swbFbackpressure": "背压顶死",
      "swbFlostorPrime": "失引水",
      "swbFflashedOver": "母线闪络",
      "swbFstifledHeader": "母管闷死",
      "swbFchokedStrainer": "滤网堵死",
      "swbFpumpPack": "双泵并挤",
      "swbFhotBus": "母线发烫",
      "swbFblackout": "全桌断电",
      "swbCoverheat": "玻璃在冒汽，排气被堵死",
      "swbCstuckHeader": "母管憋住了，没人替它泄压",
      "swbCarcing": "电弧在母线上闪个不住",
      "swbCstarved": "2 号泵在转，却抽不到东西",
      "swbCcavitation": "1 号泵顶着关死的阀在啃自己",
      "swbCbackpressure": "管路在关死的 D 阀后被顶满",
      "swbClostorPrime": "引水丢了，两台泵只是在空转空气",
      "swbCflashedOver": "闪络跨穿了母线，进料自己跳了闸",
      "swbCstifledHeader": "风门闭死了，母管在焖自己的热气",
      "swbCchokedStrainer": "滤网糊满泥沙，管路吸不上料",
      "swbCpumpPack": "1 号、2 号泵顶着同一条管路，谁也卸不下荷载",
      "swbChotBus": "母线烧得发红，断路器总是合不稳",
      "swbCblackout": "整张操作台黑下来，每个表盘都指着零",
      "swbNoFault": "一处叫不出名字的故障",
      "swbNOrder": "新工单：{g}。",
      "swbNSecond": "又添一个故障：{g}。",
      "swbNCleared": "工单销掉：{g}。",
      "swbNStress": "{k}触发应力事件（第 {n} 次）。",
      "swbNFlipt": "{k}已扳动。",
      "swbNBled": "母管放空：压力减 2。",
      "swbNPrimed": "1 号泵已引上，转起来了。",
      "swbNDead": "把手空转：{k}不配合。",
      "swbNNoAir": "鼓风机只吹得开的风门：{k}还关着。",
      "swbNLocked": "D 阀扳不动：{k}坐得太死。",
      "swbNStarve": "2 号泵没水可抽：查一查{k}。",
      "swbNSpin": "引泵把手空转：{k}还抽在外面。",
      "swbNSlam": "你顶着转着的泵扳了 C 阀：母线闪过去了。",
      "swbNArcBack": "断路器在供油偏高时合了回去：电弧又跳起来。",
      "swbNCavitation": "1 号泵正顶着关死的阀空化。",
      "swbNFlash": "你朝着亮着的电弧灯引了泵。",
      "swbNTrip": "断路器拉开：灯灭了，所有泵都停了。",
      "swbNHeld": "你按兵不动：花一拍，什么都没扳。",
      "swbNSeat": "{k}不归你这一席：坐到{s}，或者把数字念过去。",
      "swbNPaired": "已坐到{s}。",
      "swbNWha": "这台机器上没有这个手柄。",
      "swbNOver": "到第 {n} 次应力事件，这一班结束了。",
      "swbNWon": "这一班保住了。",
      "swbPrompt": "{name}：{g}要销掉 {n} 张工单，允许 {max} 次应力事件；脚本双席解法用 {p} 拍。值班日志 {i}。你现在在{s}。",
      "swbWin": "{n} 拍保住这一班 - {s} 星（标准 {p} 拍）。",
      "swbLose": "机器在第 {n} 次应力事件后趴下了，一共允许 {max} 次。",
      "swbPaused": "已暂停：走了 {n} 拍，{k} 次应力事件。你不在时机器不会自己变。",
      "swbNextShift": "解锁下一班：{g}。",
      "swbShiftsDone": "配电台上的每一个班次都值完了。",
      "swbLockedShift": "{g}还没排班：先值完它前面那一班。",
      "swbHint": "双人时：每人只看自己这一台、只读自己那一页。单人时：Tab 或 F 换席位，换席不花拍数，每根手柄也都带按钮。",
      "swbLog": "用 {n} 拍保住了配电台 - {s} 星",
    },
  });

  App.registerGame({
    name: "switchboardDuo",
    tabKey: "tabSwitchboardDuo",
    init: initSwitchboardDuoGame,
    guide: {
      svg:
        '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="4" y="10" width="52" height="56" rx="5" fill="rgba(30,41,59,.75)" stroke="rgba(148,163,184,.45)"/>' +
        '<rect x="64" y="10" width="52" height="56" rx="5" fill="rgba(30,41,59,.75)" stroke="rgba(148,163,184,.45)"/>' +
        '<circle cx="20" cy="26" r="8" fill="none" stroke="#22d3ee" stroke-width="2"/>' +
        '<path d="M20 26l5-4" stroke="#22d3ee" stroke-width="2"/>' +
        '<circle cx="42" cy="26" r="8" fill="none" stroke="#fb7185" stroke-width="2"/>' +
        '<path d="M42 26l-2 6" stroke="#fb7185" stroke-width="2"/>' +
        '<text x="30" y="45" font-size="6.5" fill="#b9c1cc" text-anchor="middle">Q W E R A S</text>' +
        '<rect x="11" y="50" width="13" height="7" rx="2" fill="none" stroke="rgba(148,163,184,.6)"/>' +
        '<rect x="36" y="50" width="13" height="7" rx="2" fill="none" stroke="rgba(148,163,184,.6)"/>' +
        '<rect x="71" y="18" width="15" height="9" rx="2" fill="none" stroke="#a3e635" stroke-width="2"/>' +
        '<rect x="94" y="18" width="15" height="9" rx="2" fill="none" stroke="rgba(148,163,184,.6)" stroke-dasharray="3 3"/>' +
        '<circle cx="78" cy="36" r="4" fill="#fbbf24"/>' +
        '<text x="95" y="45" font-size="6.5" fill="#b9c1cc" text-anchor="middle">I O P K</text>' +
        '<rect x="71" y="50" width="15" height="7" rx="2" fill="none" stroke="rgba(148,163,184,.6)"/>' +
        '<rect x="94" y="50" width="15" height="7" rx="2" fill="none" stroke="rgba(148,163,184,.6)"/>' +
        '<path d="M56 34h8M64 34l-4-3M64 34l-4 3M56 26l4-3M56 26l4 3" stroke="#ff6b35" stroke-width="1.6" fill="none"/></svg>',
      en: [
        "Aim: close every work order on the shift before the stress counter fills up.",
        "New tier: shifts 31-40 climb from thirty-two to thirty-nine orders on one budget - a six-link cascade, twin independent cascades, dim heat returns, a fourfold flashover, and a seven-link finale with a 275-beat par.",
        "Controls: seat A works Q W E R A S (damper, blower, feed, bleed, strainer, breaker) and D holds; seat B works I O P K (valve C, valve D, pump 1, pump 2) and L holds, the arrows walk the rack finger while Enter presses it; Space holds anywhere, Tab or F swaps seats, and every lever is also a button.",
        "The split: seat A reads the dials and the valve page, seat B reads the valves and pumps and the pump page, so an order's two halves - and the rule that joins them - sit on opposite desks.",
        "Order matters: swinging valve C against a running pump, or re-arming the breaker on a high feed, throws the arc and wakes a second fault.",
        "Alone: choose the one-operator seat plan and swap seats as you go; swapping costs no beat, so a solo shift is exactly as cheap as the two-seat one.",
        "Scoring: stress events first, then beats against the par measured from the scripted two-seat line; closing a shift unlocks the next one.",
      ],
      zh: [
        "目标：在应力计填满之前，把这一班的工单全部销掉。",
        "新层级：第 31 到 40 班在一点预算内从三十二张工单爬到三十九张——六环连坠、双链齐落、昏暗热工单回头、闪络四排，终局七环连坠、标准 275 拍。",
        "操作：A 席用 Q W E R A S（风门、鼓风机、供油、放空、滤网、断路器）并按 D 待机；B 席用 I O P K（C 阀、D 阀、1 号泵、2 号泵）并按 L 待机，方向键移动开关手指、回车扳下；任何席位都能用空格按兵不动，Tab 或 F 交换席位；每根手柄也都是按钮。",
        "信息分割：A 席读表盘和阀门页规程，B 席读阀门泵位和泵页规程——工单的两半、以及把它们连起来的那条规则，分坐在两张控制台前。",
        "顺序要紧：泵还在转就扳 C 阀，或供油偏高时合回断路器，都会打出电弧、唤来第二个故障。",
        "一个人玩：选一人两席模式，随需切换座位；换席不花拍数，所以单人班和双人班的代价完全一样。",
        "计分：先看应力事件，再看节拍对比脚本双席解法量出的标准拍数；值完一班就解锁下一班。",
      ],
    },
  });

  /* Exported for the other modules and the checks: the whole machine is these
   * pure functions, and the panel only ever calls boardStep. */
  App.initSwitchboardDuoGame = initSwitchboardDuoGame;
  App.boardStep = swbBoardStep;
  App.boardSolved = swbBoardSolved;
  App.boardDiagnose = swbBoardDiagnose;
  App.boardSolvable = swbBoardSolvable;
  App.boardSoloWin = swbBoardSoloWin;
  App.boardReplay = swbReplay;
  App.boardPar = swbReplayFor;
  App.boardBands = swbBands;
  App.boardStars = swbStarsForRun;
  App.boardScore = swbScoreRun;
  App.boardFaults = swbFaults;
  App.boardShifts = swbShifts;
  App.boardInstruments = swbInstruments;
  App.boardControls = swbControls;
  App.boardPages = { a: swbPageA, b: swbPageB };
})(window.CapitalConvert = window.CapitalConvert || {});
