/* Circuit Scribe - a gate-placement puzzle in the shared game drawer.
 * Each net is a hand-authored DAG with a target truth table, and the shipped
 * gate assignment is the one a brute-force pass proved cheapest over the very
 * sockets the net offers, so every net can be completed and the star line is
 * honest. Twenty-four nets, one new idea each: two-wire difference, a three-wire
 * vote, a counted vote, an inhibited difference, a staged relay, then a
 * steered pair, a half-specified strobe table, a difference two branches
 * share, a four-wire consensus, a two-bit comparison, a four-wire quorum,
 * a carry chain, a perfect square, strict alternation, a long month, a
 * top-right bar, a rule of three, a prime nibble, four of five, twin rails,
 * a shared run of three, a balanced four, two lone sparks on six wires and
 * the gap law. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  var t = App.t;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  var createCampaign = App.createCampaign;
  var fillCampaignPicker = App.fillCampaignPicker;
  var starsFor = App.starsFor;

  var cirTwo = ["and", "or", "xor"];
  var cirOne = ["not", "wire"];
  var cirAll = ["and", "or", "xor", "not", "wire"];

  /* `a`/`b` name inputs or earlier slots; a slot without `b` only takes the
   * one-legged parts. `truth` lists the wanted output for every input row,
   * counting A as the high bit. An `x` in that string is a don't-care row:
   * the board never has to answer it, so a strobed net can be cheaper than
   * the same net asked to gate its own strobe. `par` is the part count of the
   * shipped `gates`, and no arity-legal seating beats it. */
  var cirLevels = [
    {
      id: "k1",
      labelKey: "cirL1",
      inputs: ["A", "B"],
      truth: "0110",
      out: "s4",
      slots: [
        { id: "s1", a: "A", b: "B" },
        { id: "s2", a: "A", b: "B" },
        { id: "s3", a: "s1", b: "s2" },
        { id: "s4", a: "s3" },
        { id: "s5", a: "A" },
      ],
      gates: { s1: "xor", s3: "xor", s4: "wire" },
      par: 3,
    },
    {
      id: "k2",
      labelKey: "cirL2",
      inputs: ["A", "B", "C"],
      truth: "00010111",
      out: "s4",
      slots: [
        { id: "s1", a: "A", b: "B" },
        { id: "s2", a: "A", b: "B" },
        { id: "s3", a: "s2", b: "C" },
        { id: "s4", a: "s1", b: "s3" },
        { id: "s5", a: "s4", b: "A" },
        { id: "s6", a: "B", b: "C" },
      ],
      gates: { s1: "and", s2: "or", s3: "and", s4: "or" },
      par: 4,
    },
    {
      id: "k3",
      labelKey: "cirL3",
      inputs: ["A", "B", "C"],
      truth: "01101000",
      out: "s5",
      slots: [
        { id: "s1", a: "A", b: "B" },
        { id: "s2", a: "s1", b: "C" },
        { id: "s3", a: "A", b: "C" },
        { id: "s4", a: "s1", b: "s3" },
        { id: "s5", a: "s2", b: "s4" },
        /* s6 and s7 are spare rail: nothing reads them, so they cannot cut
         * the proven five, they only give the two bands over par somewhere to
         * live. */
        { id: "s6", a: "A", b: "s3" },
        { id: "s7", a: "s5" },
      ],
      gates: { s1: "xor", s2: "xor", s3: "xor", s4: "or", s5: "and" },
      par: 5,
    },
    {
      id: "k4",
      labelKey: "cirL4",
      inputs: ["A", "B", "C"],
      truth: "01100000",
      out: "s3",
      slots: [
        { id: "s1", a: "A" },
        { id: "s2", a: "B", b: "C" },
        { id: "s3", a: "s1", b: "s2" },
        { id: "s4", a: "s3" },
        { id: "s5", a: "A", b: "s2" },
        { id: "s6", a: "s4", b: "s5" },
      ],
      gates: { s1: "not", s2: "xor", s3: "and" },
      par: 3,
    },
    {
      id: "k5",
      labelKey: "cirL5",
      inputs: ["A", "B", "C"],
      truth: "00010110",
      out: "s6",
      slots: [
        { id: "s1", a: "A", b: "B" },
        { id: "s2", a: "s1", b: "C" },
        { id: "s3", a: "A", b: "C" },
        { id: "s4", a: "s1", b: "s3" },
        { id: "s5", a: "s2", b: "s4" },
        { id: "s6", a: "s5" },
        /* Spare rail again: the six above are exactly the proven seating, so
         * these two only cost parts, never save them. */
        { id: "s7", a: "A", b: "s3" },
        { id: "s8", a: "s6" },
      ],
      gates: { s1: "xor", s2: "xor", s3: "or", s4: "or", s5: "xor", s6: "wire" },
      par: 6,
    },
    {
      /* S is a lever, not a fourth wire to vote with: high it passes B, low
       * it passes A. The cheapest seating is the steering trick, not the two
       * products a Karnaugh map would write down. */
      id: "k6",
      labelKey: "cirL6",
      inputs: ["A", "B", "S"],
      truth: "00011011",
      out: "s3",
      slots: [
        { id: "s1", a: "A", b: "B" },
        { id: "s2", a: "s1", b: "S" },
        { id: "s3", a: "A", b: "s2" },
        { id: "s4", a: "B", b: "S" },
        { id: "s5", a: "s3" },
      ],
      gates: { s1: "xor", s2: "and", s3: "xor" },
      par: 3,
    },
    {
      /* The strobe pin only has to be answered on its own half of the table:
       * the eight rows with S low are don't-care, so the quorum net gets away
       * without ever wiring S into the output. */
      id: "k7",
      labelKey: "cirL7",
      inputs: ["A", "B", "C", "S"],
      truth: "x0x0x0x1x0x1x1x1",
      out: "s4",
      slots: [
        { id: "s1", a: "A", b: "B" },
        { id: "s2", a: "A", b: "B" },
        { id: "s3", a: "s2", b: "C" },
        { id: "s4", a: "s1", b: "s3" },
        { id: "s5", a: "s4", b: "S" },
        { id: "s6", a: "s5", b: "C" },
      ],
      gates: { s1: "and", s2: "or", s3: "and", s4: "or" },
      par: 4,
    },
    {
      /* One socket is the only place the A/B difference can be made, and both
       * clauses read it: seat it once and spend the parts on the checking. */
      id: "k8",
      labelKey: "cirL8",
      inputs: ["A", "B", "C", "D"],
      truth: "1000000100011000",
      out: "s5",
      slots: [
        { id: "s1", a: "A", b: "B" },
        { id: "s2", a: "s1", b: "C" },
        { id: "s3", a: "s1", b: "D" },
        { id: "s4", a: "s2", b: "s3" },
        { id: "s5", a: "s4" },
        { id: "s6", a: "C", b: "D" },
        { id: "s7", a: "s1", b: "s6" },
      ],
      gates: { s1: "xor", s2: "xor", s3: "xor", s4: "or", s5: "not" },
      par: 5,
    },
    {
      /* Sixteen rows and four wires that have to agree. Three differences
       * cover every disagreement between them, and one NOT reports the peace. */
      id: "k9",
      labelKey: "cirL9",
      inputs: ["A", "B", "C", "D"],
      truth: "1000000000000001",
      out: "s6",
      slots: [
        { id: "s1", a: "A", b: "B" },
        { id: "s2", a: "C", b: "D" },
        { id: "s3", a: "A", b: "C" },
        { id: "s4", a: "s1", b: "s2" },
        { id: "s5", a: "s4", b: "s3" },
        { id: "s6", a: "s5" },
        { id: "s7", a: "B", b: "D" },
        { id: "s8", a: "s6", b: "s7" },
      ],
      gates: { s1: "xor", s2: "xor", s3: "xor", s4: "or", s5: "or", s6: "not" },
      par: 6,
    },
    {
      /* Two 2-bit numbers, A B over C D: the high difference decides, and only
       * when the tops match does the low pair get to speak. */
      id: "k10",
      labelKey: "cirL10",
      inputs: ["A", "B", "C", "D"],
      truth: "0000100011001110",
      out: "s6",
      slots: [
        { id: "s1", a: "D" },
        { id: "s2", a: "B", b: "s1" },
        { id: "s3", a: "A", b: "C" },
        { id: "s4", a: "A", b: "s2" },
        { id: "s5", a: "s3", b: "s4" },
        { id: "s6", a: "s2", b: "s5" },
        { id: "s7", a: "A", b: "s1" },
        { id: "s8", a: "s6", b: "s7" },
      ],
      gates: { s1: "not", s2: "and", s3: "xor", s4: "xor", s5: "and", s6: "xor" },
      par: 6,
    },
    {
      /* Four wires, three must agree. Each pair product checks the opposite
       * pair, so the quorum is two products and the OR that joins them. */
      id: "k11",
      labelKey: "cirL11",
      inputs: ["A", "B", "C", "D"],
      truth: "0000000100010111",
      out: "s7",
      slots: [
        { id: "s1", a: "A", b: "B" },
        { id: "s2", a: "C", b: "D" },
        { id: "s3", a: "C", b: "D" },
        { id: "s4", a: "s1", b: "s3" },
        { id: "s5", a: "A", b: "B" },
        { id: "s6", a: "s2", b: "s5" },
        { id: "s7", a: "s4", b: "s6" },
        /* Spare rail: three sockets nothing reads, so they only cost parts. */
        { id: "s8", a: "A", b: "s7" },
        { id: "s9", a: "s4" },
        { id: "s10", a: "B", b: "C" },
      ],
      gates: { s1: "and", s2: "and", s3: "or", s4: "and", s5: "or", s6: "and", s7: "or" },
      par: 7,
    },
    {
      /* Two two-bit numbers plus a carry-in. The low carry is a three-way
       * vote, and the high carry is that same vote one column up. */
      id: "k12",
      labelKey: "cirL12",
      inputs: ["A", "B", "C", "D", "E"],
      truth: "00000001000001110001111101111111",
      out: "s8",
      slots: [
        { id: "s1", a: "B", b: "D" },
        { id: "s2", a: "B", b: "D" },
        { id: "s3", a: "E", b: "s1" },
        { id: "s4", a: "s2", b: "s3" },
        { id: "s5", a: "A", b: "C" },
        { id: "s6", a: "A", b: "C" },
        { id: "s7", a: "s5", b: "s4" },
        { id: "s8", a: "s6", b: "s7" },
        /* Spare rail. */
        { id: "s9", a: "A", b: "E" },
        { id: "s10", a: "s5" },
        { id: "s11", a: "s8", b: "D" },
      ],
      gates: { s1: "xor", s2: "and", s3: "and", s4: "or", s5: "xor", s6: "and", s7: "and", s8: "or" },
      par: 8,
    },
    {
      /* Perfect squares among the nibbles: 0, 1, 4 and 9. The low pair of
       * differences catches 0, 1 and 4, while the NOT rail answers 9. */
      id: "k13",
      labelKey: "cirL13",
      inputs: ["A", "B", "C", "D"],
      truth: "1100100001000000",
      out: "s8",
      slots: [
        { id: "s1", a: "C" },
        { id: "s2", a: "B" },
        { id: "s3", a: "D" },
        { id: "s4", a: "A" },
        { id: "s5", a: "s2", b: "D" },
        { id: "s6", a: "s4", b: "s3" },
        { id: "s7", a: "s5", b: "s6" },
        { id: "s8", a: "s1", b: "s7" },
        /* Spare rail: four unread sockets. */
        { id: "s9", a: "s8", b: "B" },
        { id: "s10", a: "s7" },
        { id: "s11", a: "A", b: "s1" },
        { id: "s12", a: "s2", b: "s3" },
      ],
      gates: { s1: "not", s2: "not", s3: "not", s4: "not", s5: "and", s6: "and", s7: "or", s8: "and" },
      par: 8,
    },
    {
      /* A five-wire clock line is good only when every neighbouring pair
       * differs: four differences ANDed together, with no strobe to hide in. */
      id: "k14",
      labelKey: "cirL14",
      inputs: ["A", "B", "C", "D", "E"],
      truth: "00000000001000000000010000000000",
      out: "s7",
      slots: [
        { id: "s1", a: "A", b: "B" },
        { id: "s2", a: "B", b: "C" },
        { id: "s3", a: "C", b: "D" },
        { id: "s4", a: "D", b: "E" },
        { id: "s5", a: "s1", b: "s2" },
        { id: "s6", a: "s3", b: "s4" },
        { id: "s7", a: "s5", b: "s6" },
        /* Spare rail. */
        { id: "s8", a: "s7", b: "A" },
        { id: "s9", a: "D" },
      ],
      gates: { s1: "xor", s2: "xor", s3: "xor", s4: "xor", s5: "and", s6: "and", s7: "and" },
      par: 7,
    },
    {
      /* Month numbers 1..12 on a nibble: high for the seven long months,
       * and 14 (the only even high nibble with B and C set) must not leak. */
      id: "k15",
      labelKey: "cirL15",
      inputs: ["A", "B", "C", "D"],
      truth: "0101010110101000",
      out: "s8",
      slots: [
        { id: "s1", a: "A" },
        { id: "s2", a: "D" },
        { id: "s3", a: "s1", b: "D" },
        { id: "s4", a: "B", b: "C" },
        { id: "s5", a: "s4" },
        { id: "s6", a: "A", b: "s2" },
        { id: "s7", a: "s6", b: "s5" },
        { id: "s8", a: "s3", b: "s7" },
        /* Spare rail. */
        { id: "s9", a: "s8", b: "C" },
        { id: "s10", a: "s3" },
      ],
      gates: { s1: "not", s2: "not", s3: "and", s4: "and", s5: "not", s6: "and", s7: "and", s8: "or" },
      par: 8,
    },
    {
      /* Seven-segment b bar for a BCD digit. It is dark on 5 and 6, and the
       * out-of-range nibbles 10..15 are pinned dark by the AB and AC terms. */
      id: "k16",
      labelKey: "cirL16",
      inputs: ["A", "B", "C", "D"],
      truth: "1111100111000000",
      out: "s9",
      slots: [
        { id: "s1", a: "A", b: "B" },
        { id: "s2", a: "A", b: "C" },
        { id: "s3", a: "s1", b: "s2" },
        { id: "s4", a: "C", b: "D" },
        { id: "s5", a: "A" },
        { id: "s6", a: "s5", b: "B" },
        { id: "s7", a: "s6", b: "s4" },
        { id: "s8", a: "s3", b: "s7" },
        { id: "s9", a: "s8" },
        /* Spare rail. */
        { id: "s10", a: "s9", b: "D" },
        { id: "s11", a: "s4" },
        { id: "s12", a: "B", b: "s3" },
      ],
      gates: { s1: "and", s2: "and", s3: "or", s4: "xor", s5: "not", s6: "and", s7: "and", s8: "or", s9: "not" },
      par: 9,
    },
    {
      /* Divisible by three: each two-bit half has a residue, and the answer
       * is yes when the residues are both zero or both cross to the other. */
      id: "k17",
      labelKey: "cirL17",
      inputs: ["A", "B", "C", "D"],
      truth: "1001001001001001",
      out: "s9",
      slots: [
        { id: "s1", a: "A", b: "B" },
        { id: "s2", a: "C", b: "D" },
        { id: "s3", a: "s1" },
        { id: "s4", a: "s2" },
        { id: "s5", a: "s3", b: "s4" },
        { id: "s6", a: "s1", b: "s2" },
        { id: "s7", a: "A", b: "C" },
        { id: "s8", a: "s6", b: "s7" },
        { id: "s9", a: "s5", b: "s8" },
        /* Spare rail. */
        { id: "s10", a: "s9", b: "B" },
        { id: "s11", a: "s8" },
        { id: "s12", a: "D", b: "s5" },
        { id: "s13", a: "s7", b: "C" },
      ],
      gates: { s1: "xor", s2: "xor", s3: "not", s4: "not", s5: "and", s6: "and", s7: "xor", s8: "and", s9: "or" },
      par: 9,
    },
    {
      /* Prime nibble: 2, 3, 5, 7, 11 and 13. The low half picks 2/3 or 5/7;
       * the high half picks the two odd primes, both ending in D. */
      id: "k18",
      labelKey: "cirL18",
      inputs: ["A", "B", "C", "D"],
      truth: "0011010100010100",
      out: "s10",
      slots: [
        { id: "s1", a: "A" },
        { id: "s2", a: "B" },
        { id: "s3", a: "s2", b: "C" },
        { id: "s4", a: "B", b: "D" },
        { id: "s5", a: "s3", b: "s4" },
        { id: "s6", a: "s1", b: "s5" },
        { id: "s7", a: "B", b: "C" },
        { id: "s8", a: "A", b: "D" },
        { id: "s9", a: "s8", b: "s7" },
        { id: "s10", a: "s6", b: "s9" },
        /* Spare rail. */
        { id: "s11", a: "s10", b: "C" },
        { id: "s12", a: "s7" },
      ],
      gates: { s1: "not", s2: "not", s3: "and", s4: "and", s5: "or", s6: "and", s7: "xor", s8: "and", s9: "and", s10: "or" },
      par: 10,
    },
    {
      /* At least four of five: the four-wire quorum as before, plus the
       * fifth wire's single vote joined to the all-four product. */
      id: "k19",
      labelKey: "cirL19",
      inputs: ["A", "B", "C", "D", "E"],
      truth: "00000000000000010000000100010111",
      out: "s10",
      slots: [
        { id: "s1", a: "A", b: "B" },
        { id: "s2", a: "C", b: "D" },
        { id: "s3", a: "C", b: "D" },
        { id: "s4", a: "A", b: "B" },
        { id: "s5", a: "s1", b: "s3" },
        { id: "s6", a: "s2", b: "s4" },
        { id: "s7", a: "s5", b: "s6" },
        { id: "s8", a: "s1", b: "s2" },
        { id: "s9", a: "E", b: "s7" },
        { id: "s10", a: "s8", b: "s9" },
        /* Spare rail: four unread sockets. */
        { id: "s11", a: "s10", b: "A" },
        { id: "s12", a: "s9" },
        { id: "s13", a: "D", b: "E" },
        { id: "s14", a: "s7", b: "D" },
      ],
      gates: { s1: "and", s2: "and", s3: "or", s4: "or", s5: "and", s6: "and", s7: "or", s8: "and", s9: "and", s10: "or" },
      par: 10,
    },
    {
      /* Twin rails: high when any two neighbouring wires are high. Four pair
       * products, then two ORs of pairs and one OR to report the run. */
      id: "k20",
      labelKey: "cirL20",
      inputs: ["A", "B", "C", "D", "E"],
      truth: "00010011000111110001001111111111",
      out: "s7",
      slots: [
        { id: "s1", a: "A", b: "B" },
        { id: "s2", a: "B", b: "C" },
        { id: "s3", a: "C", b: "D" },
        { id: "s4", a: "D", b: "E" },
        { id: "s5", a: "s1", b: "s2" },
        { id: "s6", a: "s3", b: "s4" },
        { id: "s7", a: "s5", b: "s6" },
        /* Spare rail: five unread sockets. */
        { id: "s8", a: "s7", b: "B" },
        { id: "s9", a: "s5" },
        { id: "s10", a: "A", b: "D" },
        { id: "s11", a: "s6" },
        { id: "s12", a: "s7", b: "E" },
      ],
      gates: { s1: "and", s2: "and", s3: "and", s4: "and", s5: "or", s6: "or", s7: "or" },
      par: 7,
    },
    {
      /* A run of three lit neighbours: ABC, BCD or CDE. The factored middle
       * shares - B and C carry the first pair, the A-or-D fork folds two
       * three-wire products into one socket, and only the CDE tail is paid
       * for whole. */
      id: "k21",
      labelKey: "cirL21",
      inputs: ["A", "B", "C", "D", "E"],
      truth: "00000001000000110000000100001111",
      out: "s6",
      slots: [
        { id: "s1", a: "B", b: "C" },
        { id: "s2", a: "A", b: "D" },
        { id: "s3", a: "s1", b: "s2" },
        { id: "s4", a: "C", b: "D" },
        { id: "s5", a: "s4", b: "E" },
        { id: "s6", a: "s3", b: "s5" },
        /* Spare rail. */
        { id: "s7", a: "s6", b: "B" },
        { id: "s8", a: "A", b: "s6" },
      ],
      gates: { s1: "and", s2: "or", s3: "and", s4: "and", s5: "and", s6: "or" },
      par: 6,
    },
    {
      /* Exactly two of four - the count that is neither a quorum nor a
       * minority. Two pair-parities decide it: both pairs split, or neither
       * does and the surviving ends disagree. */
      id: "k22",
      labelKey: "cirL22",
      inputs: ["A", "B", "C", "D"],
      truth: "0001011001101000",
      out: "s8",
      slots: [
        { id: "s1", a: "A", b: "B" },
        { id: "s2", a: "C", b: "D" },
        { id: "s3", a: "s1", b: "s2" },
        { id: "s4", a: "s1", b: "s2" },
        { id: "s5", a: "s4" },
        { id: "s6", a: "A", b: "C" },
        { id: "s7", a: "s5", b: "s6" },
        { id: "s8", a: "s3", b: "s7" },
        /* Spare rail. */
        { id: "s9", a: "s8", b: "D" },
        { id: "s10", a: "s8" },
      ],
      gates: { s1: "xor", s2: "xor", s3: "and", s4: "or", s5: "not", s6: "xor", s7: "and", s8: "or" },
      par: 8,
    },
    {
      /* Six wires, the first net the board has asked that many of: two
       * triples and each must hold exactly one high. Parity alone lies - a
       * triple all high also toggles it - so each spark needs the pair
       * product refused before it can report. */
      id: "k23",
      labelKey: "cirL23",
      inputs: ["A", "B", "C", "D", "E", "F"],
      truth: "0000000001101000011010000000000001101000000000000000000000000000",
      out: "s11",
      slots: [
        { id: "s1", a: "A", b: "B" },
        { id: "s2", a: "s1", b: "C" },
        { id: "s3", a: "A", b: "B" },
        { id: "s4", a: "s3" },
        { id: "s5", a: "s2", b: "s4" },
        { id: "s6", a: "D", b: "E" },
        { id: "s7", a: "s6", b: "F" },
        { id: "s8", a: "D", b: "E" },
        { id: "s9", a: "s8" },
        { id: "s10", a: "s7", b: "s9" },
        { id: "s11", a: "s5", b: "s10" },
        /* Spare rail. */
        { id: "s12", a: "s11", b: "A" },
        { id: "s13", a: "s11" },
      ],
      gates: { s1: "xor", s2: "xor", s3: "and", s4: "not", s5: "and", s6: "xor", s7: "xor", s8: "and", s9: "not", s10: "and", s11: "and" },
      par: 11,
    },
    {
      /* The gap law, the summit: a high may not stare across one low wire at
       * another. Three forbidden windows, and the answer is the ban itself -
       * a NOT over the OR of the three violations, the most parts any net on
       * the board has ever asked for. */
      id: "k24",
      labelKey: "cirL24",
      inputs: ["A", "B", "C", "D", "E"],
      truth: "11111011110010111111000011001011",
      out: "s12",
      slots: [
        { id: "s1", a: "A", b: "C" },
        { id: "s2", a: "B", b: "D" },
        { id: "s3", a: "C", b: "E" },
        { id: "s4", a: "B" },
        { id: "s5", a: "C" },
        { id: "s6", a: "D" },
        { id: "s7", a: "s1", b: "s4" },
        { id: "s8", a: "s2", b: "s5" },
        { id: "s9", a: "s3", b: "s6" },
        { id: "s10", a: "s7", b: "s8" },
        { id: "s11", a: "s10", b: "s9" },
        { id: "s12", a: "s11" },
        /* Spare rail. */
        { id: "s13", a: "s12", b: "A" },
        { id: "s14", a: "B", b: "s12" },
      ],
      gates: { s1: "and", s2: "and", s3: "and", s4: "not", s5: "not", s6: "not", s7: "and", s8: "and", s9: "and", s10: "or", s11: "or", s12: "not" },
      par: 12,
    },
  ];

  function cirGate(gate, a, b) {
    if (gate === "and") {
      return a && b ? 1 : 0;
    }
    if (gate === "or") {
      return a || b ? 1 : 0;
    }
    if (gate === "xor") {
      return a !== b ? 1 : 0;
    }
    if (gate === "not") {
      return a ? 0 : 1;
    }
    if (gate === "wire") {
      return a ? 1 : 0;
    }
    /* An empty socket is dead wire, which is what makes a bypass cheap. */
    return 0;
  }

  function cirSlot(netlist, id) {
    var list = (netlist && netlist.slots) || [];
    for (var i = 0; i < list.length; i += 1) {
      if (list[i].id === id) {
        return list[i];
      }
    }
    return null;
  }

  function cirArity(slot) {
    return slot && slot.b ? 2 : 1;
  }

  function cirMenu(slot) {
    return cirArity(slot) === 2 ? cirTwo : cirOne;
  }

  /* Pure topological pass over the DAG: named inputs read the probe, a slot
   * reads its own gate, and a cycle just resolves low instead of recursing. */
  function cirSignals(netlist, inputs) {
    var memo = {};
    var visit = {};
    var probe = inputs || {};
    var list = (netlist && netlist.slots) || [];
    function value(ref) {
      if (ref === undefined || ref === null) {
        return 0;
      }
      if (memo[ref] !== undefined) {
        return memo[ref];
      }
      var slot = cirSlot(netlist, ref);
      if (!slot) {
        memo[ref] = probe[ref] ? 1 : 0;
        return memo[ref];
      }
      if (visit[ref]) {
        return 0;
      }
      visit[ref] = true;
      var a = value(slot.a);
      var b = value(slot.b);
      visit[ref] = false;
      memo[ref] = cirGate(slot.gate || "", a, b);
      return memo[ref];
    }
    for (var i = 0; i < list.length; i += 1) {
      value(list[i].id);
    }
    return memo;
  }

  /* Pure: the output bit for one set of input bits. */
  function cirEval(netlist, inputs) {
    if (!netlist || !netlist.out) {
      return 0;
    }
    var signals = cirSignals(netlist, inputs);
    var out = signals[netlist.out];
    return out === undefined ? 0 : out;
  }

  /* Pure: every row as { in, out, index } for a truth string. */
  function cirTable(level) {
    var rows = [];
    if (!level || !level.inputs || !level.inputs.length || !level.truth) {
      return rows;
    }
    var k = level.inputs.length;
    var total = 1 << k;
    for (var i = 0; i < total; i += 1) {
      var bits = {};
      for (var c = 0; c < k; c += 1) {
        var shift = k - 1 - c;
        bits[level.inputs[c]] = (i >> shift) & 1;
      }
      var want = level.truth.charAt(i);
      /* An `x` row asks nothing of the board, so it carries no wanted bit. */
      var free = want === "x" || want === "X";
      rows.push({
        in: bits,
        out: free ? 0 : parseInt(want, 10) || 0,
        free: free,
        index: i,
      });
    }
    return rows;
  }

  /* Pure: which required rows the current net already satisfies. A don't-care
   * row holds by definition - nothing is asked of it. */
  function cirRows(netlist, table) {
    var out = [];
    if (!table) {
      return out;
    }
    for (var i = 0; i < table.length; i += 1) {
      out.push(
        table[i].free === true ||
          cirEval(netlist, table[i].in) === (table[i].out ? 1 : 0),
      );
    }
    return out;
  }

  function cirWith(level, gates) {
    var slots = [];
    for (var i = 0; i < level.slots.length; i += 1) {
      var src = level.slots[i];
      slots.push({ id: src.id, a: src.a, b: src.b, gate: gates[src.id] || "" });
    }
    return { inputs: level.inputs, slots: slots, out: level.out };
  }

  function cirParts(gates) {
    var n = 0;
    for (var key in gates) {
      if (gates[key]) {
        n += 1;
      }
    }
    return n;
  }
  App.circuitEval = cirEval;
  App.circuitRows = cirRows;
  App.circuitTable = cirTable;
  App.circuitSignals = cirSignals;
  App.circuitArity = cirArity;
  App.circuitMenu = cirMenu;
  App.circuitLevels = cirLevels;
  App.circuitWith = cirWith;
  App.circuitParts = cirParts;
  App.circuitGate = cirGate;

  function initCircuitScribeGame(panelEl) {
    if (!panelEl) {
      return;
    }

    var campaign = createCampaign({ key: "circuit-scribe-campaign", levels: cirLevels });
    var open = campaign.indexOf(campaign.nextLevelId());
    var level = cirLevels[open < 0 ? 0 : open];
    var table = cirTable(level);
    var gates = {};
    var netlist = cirWith(level, gates);
    var probe = {};
    var picked = level.slots[0].id;
    var solved = false;
    var slotEls = {};
    var pinEls = {};
    var liveEls = {};
    var rowEls = [];

    var hud = document.createElement("div");
    hud.className = "game-hud";
    var partsEl = document.createElement("strong");
    var rowsEl = document.createElement("strong");
    hud.appendChild(makeStat("cirPartsLabel", partsEl));
    hud.appendChild(makeStat("cirRowsLabel", rowsEl));

    var board = document.createElement("div");
    board.className = "cir-board";
    board.setAttribute("tabindex", "0");
    board.setAttribute("role", "application");
    board.setAttribute("aria-label", t("cirFieldLabel"));

    var rail = document.createElement("div");
    rail.className = "cir-rail";
    var railLabel = document.createElement("span");
    railLabel.className = "cir-rail-label";
    railLabel.setAttribute("data-i18n", "cirRailLabel");
    railLabel.textContent = t("cirRailLabel");
    rail.appendChild(railLabel);

    var palette = document.createElement("div");
    palette.className = "cir-palette";
    palette.setAttribute("aria-label", t("cirPaletteLabel"));
    palette.setAttribute("role", "group");

    var outRow = document.createElement("div");
    outRow.className = "cir-out";
    var outLabel = document.createElement("span");
    outLabel.className = "cir-out-label";
    outLabel.setAttribute("data-i18n", "cirOutLabel");
    outLabel.textContent = t("cirOutLabel");
    var outValue = document.createElement("strong");
    outValue.className = "cir-out-value";
    outRow.appendChild(outLabel);
    outRow.appendChild(outValue);

    var tableBox = document.createElement("div");
    tableBox.className = "cir-table";
    tableBox.setAttribute("role", "table");
    tableBox.setAttribute("aria-label", t("cirTableLabel"));

    var result = document.createElement("p");
    result.className = "game-result";
    result.setAttribute("role", "status");

    var netRow = document.createElement("div");
    netRow.className = "elements-row";
    var netLabel = document.createElement("label");
    netLabel.className = "elements-label";
    netLabel.setAttribute("for", "cirNetSel");
    netLabel.setAttribute("data-i18n", "cirNetSelectLabel");
    netLabel.textContent = t("cirNetSelectLabel");
    var netSel = document.createElement("select");
    netSel.className = "elements-select";
    netSel.id = "cirNetSel";
    netRow.appendChild(netLabel);
    netRow.appendChild(netSel);

    var actions = document.createElement("div");
    actions.className = "game-actions";
    var clearBtn = makeButton("primary", "cirBtnClear", t("cirBtnClear"));
    var bestEl = document.createElement("p");
    bestEl.className = "game-best";
    actions.appendChild(clearBtn);
    actions.appendChild(bestEl);

    var hint = document.createElement("p");
    hint.className = "game-hint";
    hint.setAttribute("data-i18n", "cirHint");
    hint.textContent = t("cirHint");

    function makeStat(key, valueEl) {
      var stat = document.createElement("div");
      stat.className = "game-stat";
      var label = document.createElement("span");
      label.setAttribute("data-i18n", key);
      label.textContent = t(key);
      stat.appendChild(label);
      stat.appendChild(valueEl);
      return stat;
    }

    function makeButton(extra, key, text) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = extra;
      var span = document.createElement("span");
      span.setAttribute("data-i18n", key);
      span.textContent = text;
      var content = document.createElement("span");
      content.className = "button-content";
      content.appendChild(span);
      btn.appendChild(content);
      return btn;
    }

    [hud, board, palette, tableBox, result, netRow, actions, hint].forEach(function (node) {
      panelEl.appendChild(node);
    });

    function gateWord(gate) {
      if (!gate) {
        return t("cirGateEmpty");
      }
      return t("cirGate" + gate.charAt(0).toUpperCase() + gate.slice(1));
    }

    /* --- board: input pins, one row per socket, then the output --- */
    function buildBoard() {
      while (board.firstChild) {
        board.removeChild(board.firstChild);
      }
      while (palette.firstChild) {
        palette.removeChild(palette.firstChild);
      }
      while (tableBox.firstChild) {
        tableBox.removeChild(tableBox.firstChild);
      }
      slotEls = {};
      pinEls = {};
      liveEls = {};
      rowEls = [];

      for (var p = 0; p < level.inputs.length; p += 1) {
        var pin = level.inputs[p];
        var pinBtn = document.createElement("button");
        pinBtn.type = "button";
        pinBtn.className = "cir-pin";
        pinBtn.dataset.pin = pin;
        (function (name) {
          pinBtn.addEventListener("click", function () {
            probe[name] = probe[name] ? 0 : 1;
            render();
          });
        })(pin);
        rail.appendChild(pinBtn);
        pinEls[pin] = pinBtn;
      }
      board.appendChild(rail);

      for (var i = 0; i < level.slots.length; i += 1) {
        var slot = level.slots[i];
        var row = document.createElement("div");
        row.className = "cir-row";
        var wires = document.createElement("span");
        wires.className = "cir-wires";
        wires.textContent = slot.b ? slot.a + " " + slot.b : slot.a;
        row.appendChild(wires);

        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "cir-slot";
        btn.dataset.slot = slot.id;
        (function (target) {
          btn.addEventListener("click", function () {
            picked = target.id;
            render();
            result.textContent = t("cirPicked", { slot: target.id, wires: cirArity(target) });
          });
        })(slot);
        row.appendChild(btn);
        slotEls[slot.id] = btn;

        var live = document.createElement("span");
        live.className = "cir-live";
        row.appendChild(live);
        liveEls[slot.id] = live;
        board.appendChild(row);
      }
      board.appendChild(outRow);

      var parts = cirAll.concat(["clear"]);
      for (var g = 0; g < parts.length; g += 1) {
        var gate = parts[g] === "clear" ? "" : parts[g];
        var item = makeButton("cir-chip", "cirGateChip" + (gate || "Empty"), gateWord(gate));
        (function (value) {
          item.addEventListener("click", function () {
            assign(value);
          });
        })(gate);
        palette.appendChild(item);
      }

      var head = document.createElement("p");
      head.className = "cir-score";
      tableBox.appendChild(head);
      for (var r = 0; r < table.length; r += 1) {
        var line = document.createElement("p");
        line.className = "cir-line";
        tableBox.appendChild(line);
        rowEls.push(line);
      }
    }

    function cycle(slot) {
      var menu = cirMenu(slot);
      var current = gates[slot.id] || "";
      var at = current ? menu.indexOf(current) : -1;
      var value = at + 1 >= menu.length ? "" : menu[at + 1];
      assignTo(slot, value);
    }

    function assign(gate) {
      var slot = cirSlot(netlist, picked);
      if (!slot) {
        return;
      }
      assignTo(slot, gate);
    }

    /* The netlist only accepts a part that matches its wire count. */
    function assignTo(slot, gate) {
      if (solved) {
        result.textContent = t("cirDoneAlready", { name: t(level.labelKey) });
        return;
      }
      if (gate && cirMenu(slot).indexOf(gate) === -1) {
        result.textContent = t("cirArity", {
          slot: slot.id,
          n: cirArity(slot),
          gate: gateWord(gate),
        });
        return;
      }
      picked = slot.id;
      gates[slot.id] = gate;
      netlist = cirWith(level, gates);
      render();
      if (gate) {
        result.textContent = t("cirPlaced", { slot: slot.id, gate: gateWord(gate) });
      } else {
        result.textContent = t("cirPulled", { slot: slot.id });
      }
      check();
    }

    function refreshPicker() {
      fillCampaignPicker(
        netSel,
        campaign,
        function (def) {
          return t(def.labelKey);
        },
        t("elementsLocked"),
      );
      netSel.value = level.id;
      var best = campaign.best(level.id);
      bestEl.textContent =
        t("campaignStars", { n: campaign.totalStars(), max: campaign.maxStars() }) +
        " \u00b7 " +
        (best > 0 ? t("cirBestParts", { n: best }) : t("noBest"));
    }

    /* Pure: the rows that actually ask something of the board, counting the
     * don't-care rows as nothing. */
    function pinnedRows(list) {
      var n = 0;
      for (var i = 0; i < list.length; i += 1) {
        if (!list[i].free) {
          n += 1;
        }
      }
      return n;
    }

    function render() {
      var signals = cirSignals(netlist, probe);
      var hits = cirRows(netlist, table);
      var pass = 0;
      var need = pinnedRows(table);
      for (var i = 0; i < table.length; i += 1) {
        if (!table[i].free && hits[i]) {
          pass += 1;
        }
      }
      partsEl.textContent = t("cirPartsNow", { n: cirParts(gates), par: level.par });
      rowsEl.textContent = t("cirRowsNow", { n: pass, max: need });
      for (var p = 0; p < level.inputs.length; p += 1) {
        var pin = level.inputs[p];
        var bit = probe[pin] ? 1 : 0;
        pinEls[pin].textContent = pin + " " + bit;
        pinEls[pin].className = "cir-pin" + (bit ? " is-high" : "");
        pinEls[pin].setAttribute("aria-label", t("cirPinLabel", { a: pin, b: bit }));
      }
      for (var s = 0; s < level.slots.length; s += 1) {
        var slot = level.slots[s];
        var el = slotEls[slot.id];
        if (!el) {
          continue;
        }
        var gate = gates[slot.id] || "";
        el.textContent = gate ? gate.toUpperCase() : "\u2014";
        el.className = "cir-slot" + (picked === slot.id ? " is-picked" : "") + (gate ? " is-set" : "");
        el.setAttribute(
          "aria-label",
          t("cirSlotLabel", { a: slot.id, b: slot.b ? slot.a + " " + slot.b : slot.a, c: gateWord(gate) }),
        );
        el.setAttribute("aria-pressed", picked === slot.id ? "true" : "false");
        var live = liveEls[slot.id];
        if (live) {
          live.textContent = "\u2192 " + (signals[slot.id] ? 1 : 0);
        }
      }
      outValue.textContent = "\u2192 " + (signals[level.out] ? 1 : 0);
      var head = tableBox.firstChild;
      if (head) {
        head.textContent = t("cirScore", { n: pass, max: need });
      }
      for (var r = 0; r < table.length; r += 1) {
        var line = rowEls[r];
        if (!line) {
          continue;
        }
        var want = table[r].out ? 1 : 0;
        var got = cirEval(netlist, table[r].in);
        var label = "";
        for (var c = 0; c < level.inputs.length; c += 1) {
          label = label + level.inputs[c] + table[r].in[level.inputs[c]];
          if (c + 1 < level.inputs.length) {
            label += " ";
          }
        }
        line.textContent = table[r].free
          ? t("cirRowFree", { in: label, g: got })
          : t("cirRowLine", {
              in: label,
              w: want,
              g: got,
              m: hits[r] ? "\u2713" : "\u2717",
            });
        line.className = "cir-line" + (hits[r] ? " is-pass" : " is-fail");
      }
    }

    function check() {
      if (solved) {
        return;
      }
      var hits = cirRows(netlist, table);
      for (var i = 0; i < hits.length; i += 1) {
        if (!hits[i]) {
          return;
        }
      }
      finish();
    }

    function finish() {
      solved = true;
      var used = cirParts(gates);
      var starsWon = starsFor(used, [level.par, level.par + 1, level.par + 2], "low");
      var outcome = campaign.record(level.id, {
        stars: starsWon,
        best: used,
        better: "low",
      });
      var message = t("cirCleared", { n: used, s: starsWon, p: level.par });
      if (outcome.isBest) {
        message += " " + t("newBest");
      }
      if (outcome.unlockedNext) {
        message += " " + t("cirNextNet");
      } else if (campaign.clearedCount() === cirLevels.length) {
        message += " " + t("cirCampaignDone");
      }
      result.textContent = message;
      logAction(t("logCircuitScribe", { n: used }));
      var rect = clearBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      refreshPicker();
    }

    function loadNet(def) {
      level = def;
      table = cirTable(level);
      gates = {};
      netlist = cirWith(level, gates);
      probe = {};
      for (var i = 0; i < level.inputs.length; i += 1) {
        probe[level.inputs[i]] = 0;
      }
      picked = level.slots[0].id;
      solved = false;
      var strobed = pinnedRows(table) < table.length;
      var hintKey = strobed ? "cirHintFree" : "cirHint";
      hint.setAttribute("data-i18n", hintKey);
      hint.textContent = t(hintKey);
      buildBoard();
      refreshPicker();
      render();
      result.textContent = t("cirPrompt", {
        name: t(level.labelKey),
        n: pinnedRows(table),
        p: level.par,
      });
    }

    board.addEventListener("keydown", function (event) {
      var step = { ArrowUp: -1, ArrowDown: 1, ArrowLeft: -1, ArrowRight: 1 };
      if (step[event.key] !== undefined) {
        event.preventDefault();
        var at = 0;
        for (var i = 0; i < level.slots.length; i += 1) {
          if (level.slots[i].id === picked) {
            at = i;
          }
        }
        var next = (at + step[event.key] + level.slots.length) % level.slots.length;
        picked = level.slots[next].id;
        render();
        result.textContent = t("cirPicked", {
          slot: picked,
          wires: level.slots[next].b ? 2 : 1,
        });
        return;
      }
      if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
        event.preventDefault();
        var slot = cirSlot(netlist, picked);
        if (slot) {
          cycle(slot);
        }
      }
    });

    netSel.addEventListener("change", function () {
      var pick = campaign.indexOf(netSel.value);
      if (pick < 0) {
        return;
      }
      if (!campaign.isUnlocked(netSel.value)) {
        netSel.value = level.id;
        result.textContent = t("cirLocked", { name: t(cirLevels[pick].labelKey) });
        return;
      }
      loadNet(cirLevels[pick]);
    });

    clearBtn.addEventListener("click", function () {
      loadNet(level);
    });

    loadNet(cirLevels[open < 0 ? 0 : open]);
  }

  /* Bilingual copy travels with the game: addStrings only fills keys i18n.js
   * does not already own, so the shared dictionary stays authoritative. */
  App.addStrings({
    en: {
      "tabCircuitScribe": "Circuit Scribe",
      "cirL1": "Parity Bell",
      "cirL2": "Majority Vote",
      "cirL3": "Exactly One",
      "cirL4": "Cellar Alarm",
      "cirL5": "Two-Stage Relay",
      "cirL6": "Select Lever",
      "cirL7": "Strobe Bench",
      "cirL8": "Double Check",
      "cirL9": "Four-Wire Chorus",
      "cirL10": "High-Low Compare",
      "cirL11": "Four-Wire Quorum",
      "cirL12": "Carry Chain",
      "cirL13": "Perfect Square",
      "cirL14": "Strict Alternation",
      "cirL15": "Long Month",
      "cirL16": "Top-Right Bar",
      "cirL17": "Rule of Three",
      "cirL18": "Prime Nibble",
      "cirL19": "Four of Five",
      "cirL20": "Twin Rails",
      "cirL21": "Run of Three",
      "cirL22": "Balanced Four",
      "cirL23": "Twin Sparks",
      "cirL24": "The Gap Law",
      "cirPartsLabel": "Parts",
      "cirRowsLabel": "Rows",
      "cirNetSelectLabel": "Pick a net",
      "cirBtnClear": "Clear Net",
      "cirRailLabel": "probe",
      "cirOutLabel": "output",
      "cirPaletteLabel": "Gate palette",
      "cirTableLabel": "Required rows",
      "cirFieldLabel": "Gate board: arrows pick a socket, Enter cycles its part, Space opens the palette row. Each socket lists the wires it has.",
      "cirPartsNow": "{n} / par {par}",
      "cirRowsNow": "{n}/{max} pass",
      "cirScore": "rows holding: {n}/{max}",
      "cirRowLine": "{in} - want {w}, got {g} {m}",
      "cirRowFree": "{in} - don't care, board sits at {g}",
      "cirGateEmpty": "empty",
      "cirGateAnd": "AND",
      "cirGateOr": "OR",
      "cirGateXor": "XOR",
      "cirGateNot": "NOT",
      "cirGateWire": "wire",
      "cirGateChipAnd": "AND",
      "cirGateChipOr": "OR",
      "cirGateChipXor": "XOR",
      "cirGateChipNot": "NOT",
      "cirGateChipWire": "wire",
      "cirGateChipEmpty": "clear",
      "cirPinLabel": "Probe input {a}, currently {b}",
      "cirSlotLabel": "Socket {a} fed by {b}: {c}",
      "cirPrompt": "{name}: {n} rows must hold. Par is {p} parts.",
      "cirPlaced": "{slot} now carries a {gate}.",
      "cirPulled": "{slot} is bare wire again.",
      "cirPicked": "{slot} picked - it has {wires} wire(s).",
      "cirArity": "{slot} only has {n} wire(s), so a {gate} will not seat there.",
      "cirDoneAlready": "{name} is already singing - clear the net or pick another.",
      "cirCleared": "Every row holds on {n} parts (par {p}) - {s} stars.",
      "cirBestParts": "best {n} parts",
      "cirNextNet": "Next net unlocked.",
      "cirCampaignDone": "Twenty-four nets, all truthing out.",
      "cirLocked": "{name} is taped over until the net before it works.",
      "cirHint": "A dead socket reads as 0, so an OR or XOR on a spare wire passes the live one straight through.",
      "cirHintFree": "Rows printed as don't care ask nothing of the board, so this net does not have to answer its strobe - spend those parts on the half that counts.",
      "logCircuitScribe": "Truthed out a net on {n} parts",
    },
    zh: {
      "tabCircuitScribe": "电路抄写员",
      "cirL1": "奇偶校验铃",
      "cirL2": "多数表决",
      "cirL3": "恰好一个",
      "cirL4": "地窖警铃",
      "cirL5": "两级合成",
      "cirL6": "选择拨杆",
      "cirL7": "选通半表",
      "cirL8": "双线复核",
      "cirL9": "四线同声",
      "cirL10": "高低比较",
      "cirL11": "四线公议",
      "cirL12": "进位接力",
      "cirL13": "完全平方",
      "cirL14": "严格交替",
      "cirL15": "长月旗标",
      "cirL16": "右上灯条",
      "cirL17": "三之律",
      "cirL18": "质数探针",
      "cirL19": "五中取四",
      "cirL20": "双轨相邻",
      "cirL21": "三连长明",
      "cirL22": "四中取二",
      "cirL23": "双簇孤火",
      "cirL24": "空档之律",
      "cirPartsLabel": "元件",
      "cirRowsLabel": "行",
      "cirNetSelectLabel": "选择电路",
      "cirBtnClear": "清空电路",
      "cirRailLabel": "试电",
      "cirOutLabel": "输出",
      "cirPaletteLabel": "门电路盘",
      "cirTableLabel": "必须成立的输入行",
      "cirFieldLabel": "门电路盘：方向键选择插座，回车更换元件，空格同样可换。每个插座都会标出自己有几根线。",
      "cirPartsNow": "{n} / 标准 {par}",
      "cirRowsNow": "{n}/{max} 行通过",
      "cirScore": "成立的行：{n}/{max}",
      "cirRowLine": "{in} - 应为 {w}，实为 {g} {m}",
      "cirRowFree": "{in} - 不限，电路板现为 {g}",
      "cirGateEmpty": "空",
      "cirGateAnd": "与门",
      "cirGateOr": "或门",
      "cirGateXor": "异或门",
      "cirGateNot": "非门",
      "cirGateWire": "直通线",
      "cirGateChipAnd": "与",
      "cirGateChipOr": "或",
      "cirGateChipXor": "异或",
      "cirGateChipNot": "非",
      "cirGateChipWire": "直通",
      "cirGateChipEmpty": "清空",
      "cirPinLabel": "试输入 {a}，当前为 {b}",
      "cirSlotLabel": "插座 {a}，进线 {b}：{c}",
      "cirPrompt": "{name}：{n} 行输入都必须成立。标准用量 {p} 个元件。",
      "cirPlaced": "{slot} 装上了{gate}。",
      "cirPulled": "{slot} 又空了下来。",
      "cirPicked": "已选 {slot}——它有 {wires} 根进线。",
      "cirArity": "{slot} 只有 {n} 根进线，{gate}装不下。",
      "cirDoneAlready": "「{name}」已经全部通过——清空重来或换一张电路。",
      "cirCleared": "{n} 个元件让所有行都成立（标准 {p}）- 获得 {s} 星。",
      "cirBestParts": "最佳 {n} 个元件",
      "cirNextNet": "解锁下一张电路。",
      "cirCampaignDone": "二十四张电路全部按预期出电平。",
      "cirLocked": "「{name}」还被胶带封着——先让上一张电路工作。",
      "cirHint": "空插座读作 0，所以把多余的那一路接成或门或异或门，就等于让有效信号直通过去。",
      "cirHintFree": "写着不限的行不必成立：这半张表电路板无需回答，所以别把选通线接进输出，元件留给要紧的那一半。",
      "logCircuitScribe": "用 {n} 个元件接好了一张电路",
    },
  });

  App.registerGame({
    name: "circuitScribe",
    tabKey: "tabCircuitScribe",
    init: initCircuitScribeGame,
    guide: {
      svg:
        '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="6" y="6" width="108" height="64" rx="5" fill="rgba(30,41,59,.75)" stroke="rgba(148,163,184,.45)"/>' +
        '<path d="M14 24h16M14 52h16M46 30h14M46 46h14M76 38h26" stroke="rgba(148,163,184,.55)" stroke-width="2" fill="none"/>' +
        '<path d="M30 18q14 0 14 12t-14 12" fill="none" stroke="#22d3ee" stroke-width="2"/>' +
        '<path d="M30 40q14 0 14 12t-14 12" fill="none" stroke="#22d3ee" stroke-width="2"/>' +
        '<path d="M60 30q14 0 14 10t-14 10" fill="none" stroke="#a3e635" stroke-width="2"/>' +
        '<text x="18" y="21" font-size="8" fill="#94a3b8">A</text>' +
        '<text x="18" y="49" font-size="8" fill="#94a3b8">B</text>' +
        '<text x="92" y="41" font-size="9" fill="#fbbf24">1</text></svg>',
      en: [
        "Aim: seat gates so the output matches the required truth table on every row the table asks about.",
        "Pick: click a socket, or arrow through them, then choose from the palette or press Enter to cycle its parts.",
        "Wires: a socket with two wires takes AND, OR or XOR; a one-wire socket takes NOT or a plain wire. The wrong part simply will not seat.",
        "Live: the row list prints want and got as text, so a tick is a row that already holds - no colour needed.",
        "Watch out: an empty socket reads as 0, which is handy for bypasses but still costs you nothing to leave bare.",
        "Loose ends: a row printed as don't care asks nothing of the board, and a socket nothing reads is spare rail - both only cost you parts.",
        "Scoring: every part you seat counts against par, so the tidy net wins the stars.",
      ],
      zh:
        [
          "目标：装好门电路，让输出在真值表真正提出要求的每一行上都和它一致。",
          "选择：点击插座，或用方向键在插座间移动，然后从门电路盘里挑，或按回车轮换元件。",
          "进线：两根线的插座只能装与门、或门、异或门；一根线的插座装非门或直通线。装错了坐不下去。",
          "实时：下方逐行写出“应为”和“实为”，打了勾就是这一行已经成立，不靠颜色判断。",
          "注意：空插座读作 0，这能帮你做直通，但空着不花元件。",
          "余量：写着不限的行电路板无需回答，没人读的插座只是备用导轨——这两样都只花元件，不替你省元件。",
          "计分：装上的每个元件都要和标准用量对比，接得越干净星越多。",
        ],
    },
  });

  /* Exported for the other modules. */
  App.initCircuitScribeGame = initCircuitScribeGame;
})(window.CapitalConvert = window.CapitalConvert || {});
