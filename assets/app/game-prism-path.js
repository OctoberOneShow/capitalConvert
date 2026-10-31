/* Prism Path - The laser-and-mirrors puzzle campaign in the shared game drawer. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  var t = App.t;
  var getElement = App.getElement;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  var createCampaign = App.createCampaign;
  var fillCampaignPicker = App.fillCampaignPicker;
  var starsFor = App.starsFor;
  var prismSize = 320;
  /* dir: 0 right, 1 down, 2 left, 3 up. "/" maps right->up, down->right,
   * left->down, up->left; "\" is the transpose. Mirrors start on the given
   * slope and toggle on click; a board clears when every target glows.
   * Star times are [3-star, 2-star, 1-star] seconds.
   * Rungs 1-8 all fire rightward and never put a target on a mirror cell.
   * p9 fires downward, lights a target that is itself a mirror and stops its
   * last leg on a wall; p10 fires leftward and runs the route back across its
   * own outgoing leg at (5,3), which the trace allows because its guard keys
   * on cell plus direction rather than on the cell alone.
   *
   * Rungs 11-20 are the optics bench: two extra elements join the mirror.
   * `split: true` is a beam splitter - it reflects like a mirror *and* lets
   * the straight beam carry on, so one ray becomes two. `locked: true` is a
   * welded element: it never rotates, so it is a fixed corner the route has
   * to be built around. Every board from p11 on was forged, not guessed -
   * `node tools/prism-forge.js verify` replays the beam over every reachable
   * orientation and proves the deal is unsolved, that some orientation lights
   * every target, that 2-5 flips separate the two, that at most four
   * orientations solve it, and that the solution beam touches each element.
   *
   * Rungs 21-24 are the deep tier: the same bar, held at the top - deals sit
   * 4-5 flips out, at most two orientations solve any of them, and the
   * summit keeps only one. The bench itself widens along the way: seven
   * targets on the nine-by-nine, the first ten-across board, the most
   * welded rig in the campaign, and finally ten elements with four
   * splitters feeding seven marks. */
  var prismLevels = [
    {
      id: "p1", labelKey: "prismL1", w: 5, h: 5,
      emitter: { x: 0, y: 2, dir: 0 },
      targets: [[1, 2], [2, 4]],
      walls: [],
      mirrors: [{ x: 2, y: 2, slope: 1 }],
      starTimes: [8, 15, 25],
    },
    {
      id: "p2", labelKey: "prismL2", w: 6, h: 6,
      emitter: { x: 0, y: 0, dir: 0 },
      targets: [[3, 2], [5, 3]],
      walls: [[4, 1]],
      mirrors: [
        { x: 3, y: 0, slope: 1 },
        { x: 3, y: 3, slope: 1 },
      ],
      starTimes: [14, 22, 34],
    },
    {
      id: "p3", labelKey: "prismL3", w: 6, h: 6,
      emitter: { x: 0, y: 1, dir: 0 },
      targets: [[2, 2], [3, 3], [5, 1]],
      walls: [],
      mirrors: [
        { x: 2, y: 1, slope: 1 },
        { x: 2, y: 3, slope: 0 },
        { x: 4, y: 3, slope: 0 },
        { x: 4, y: 1, slope: 0 },
      ],
      starTimes: [20, 30, 45],
    },
    {
      id: "p4", labelKey: "prismL4", w: 7, h: 7,
      emitter: { x: 0, y: 3, dir: 0 },
      targets: [[2, 3], [5, 6]],
      walls: [[4, 3], [1, 1]],
      mirrors: [
        { x: 3, y: 3, slope: 1 },
        { x: 3, y: 6, slope: 1 },
      ],
      starTimes: [16, 26, 40],
    },
    {
      id: "p5", labelKey: "prismL5", w: 7, h: 7,
      emitter: { x: 0, y: 0, dir: 0 },
      targets: [[1, 0], [2, 1], [3, 2], [4, 3], [6, 4]],
      walls: [[5, 0]],
      mirrors: [
        { x: 2, y: 0, slope: 0 },
        { x: 2, y: 2, slope: 0 },
        { x: 4, y: 2, slope: 0 },
        { x: 4, y: 4, slope: 0 },
      ],
      starTimes: [22, 34, 50],
    },
    {
      id: "p6", labelKey: "prismL6", w: 7, h: 7,
      emitter: { x: 0, y: 5, dir: 0 },
      targets: [[1, 5], [3, 6], [6, 6]],
      walls: [[4, 5], [6, 2]],
      mirrors: [
        { x: 2, y: 5, slope: 0 },
        { x: 2, y: 6, slope: 0 },
        { x: 5, y: 1, slope: 0 },
      ],
      starTimes: [26, 40, 58],
    },
    {
      id: "p7", labelKey: "prismL7", w: 7, h: 7,
      emitter: { x: 0, y: 0, dir: 0 },
      targets: [[1, 0], [3, 1], [5, 3]],
      walls: [[5, 0], [1, 3]],
      mirrors: [
        { x: 3, y: 0, slope: 1 },
        { x: 3, y: 3, slope: 0 },
        { x: 6, y: 3, slope: 0 },
      ],
      starTimes: [30, 46, 66],
    },
    {
      id: "p8", labelKey: "prismL8", w: 7, h: 7,
      emitter: { x: 0, y: 5, dir: 0 },
      targets: [[1, 5], [4, 6], [6, 6]],
      walls: [[5, 5], [3, 2]],
      mirrors: [
        { x: 2, y: 5, slope: 1 },
        { x: 2, y: 6, slope: 0 },
      ],
      starTimes: [34, 52, 74],
    },
    {
      id: "p9", labelKey: "prismL9", w: 7, h: 7,
      emitter: { x: 3, y: 0, dir: 1 },
      targets: [[3, 2], [4, 2], [5, 4], [4, 5], [2, 5], [1, 3]],
      walls: [[2, 2], [1, 1]],
      mirrors: [
        { x: 3, y: 2, slope: 0 },
        { x: 5, y: 2, slope: 1 },
        { x: 5, y: 5, slope: 1 },
        { x: 1, y: 5, slope: 1 },
      ],
      starTimes: [72, 112, 158],
    },
    {
      id: "p10", labelKey: "prismL10", w: 7, h: 7,
      emitter: { x: 6, y: 3, dir: 2 },
      targets: [[5, 3], [3, 5], [2, 5], [1, 3], [3, 1], [5, 5]],
      walls: [[4, 2], [6, 5]],
      mirrors: [
        { x: 4, y: 3, slope: 0 },
        { x: 4, y: 5, slope: 1 },
        { x: 1, y: 5, slope: 1 },
        { x: 1, y: 1, slope: 1 },
        { x: 5, y: 1, slope: 1 },
      ],
      starTimes: [96, 150, 212],
    },
    /* Relay: the first bench board. Four plain mirrors, three targets, and a
     * route that has to double back on itself before it climbs. */
    {
      id: "p11", labelKey: "prismL11", w: 7, h: 7,
      emitter: { x: 4, y: 0, dir: 1 },
      targets: [[3, 4], [2, 3], [3, 0]],
      walls: [[5, 2], [0, 4]],
      mirrors: [
        { x: 3, y: 5, slope: 0 },
        { x: 2, y: 5, slope: 0 },
        { x: 4, y: 2, slope: 0 },
        { x: 2, y: 2, slope: 0 },
      ],
      starTimes: [42, 64, 90],
    },
    /* Kaleidoscope: five mirrors and four targets, one of them sitting on the
     * emitter's own row, so the last leg has to come back down the left edge. */
    {
      id: "p12", labelKey: "prismL12", w: 7, h: 7,
      emitter: { x: 0, y: 4, dir: 0 },
      targets: [[2, 0], [0, 1], [1, 3], [6, 6]],
      walls: [[5, 2], [1, 2], [5, 1]],
      mirrors: [
        { x: 2, y: 4, slope: 0 },
        { x: 0, y: 3, slope: 1 },
        { x: 6, y: 0, slope: 1 },
        { x: 0, y: 0, slope: 1 },
        { x: 2, y: 3, slope: 1 },
      ],
      starTimes: [46, 70, 98],
    },
    /* Split Gate: the first splitter. One ray has to feed two corners of the
     * board, so the branch that carries straight on matters as much as the
     * one that turns. */
    {
      id: "p13", labelKey: "prismL13", w: 8, h: 8,
      emitter: { x: 0, y: 1, dir: 0 },
      targets: [[3, 3], [1, 3], [1, 2], [3, 7]],
      walls: [[6, 4], [6, 3], [5, 0]],
      mirrors: [
        { x: 3, y: 2, slope: 1, split: true },
        { x: 2, y: 5, slope: 1 },
        { x: 1, y: 1, slope: 1 },
        { x: 1, y: 5, slope: 0 },
        { x: 2, y: 2, slope: 1 },
      ],
      starTimes: [50, 76, 106],
    },
    /* Twin Beam: six elements and a splitter down on the emitter's own row,
     * which is the only way to reach the far top-right target. */
    {
      id: "p14", labelKey: "prismL14", w: 8, h: 8,
      emitter: { x: 0, y: 6, dir: 0 },
      targets: [[5, 5], [1, 3], [7, 1], [4, 0]],
      walls: [[4, 6], [6, 3], [3, 4], [4, 1]],
      mirrors: [
        { x: 3, y: 3, slope: 1 },
        { x: 3, y: 0, slope: 0 },
        { x: 7, y: 5, slope: 1 },
        { x: 3, y: 5, slope: 0 },
        { x: 7, y: 0, slope: 0 },
        { x: 3, y: 6, slope: 0, split: true },
      ],
      starTimes: [54, 82, 114],
    },
    /* Cascade: two splitters and five targets. The beam forks twice, so the
     * board reads as a tree rather than a single line. */
    {
      id: "p15", labelKey: "prismL15", w: 8, h: 8,
      emitter: { x: 0, y: 6, dir: 0 },
      targets: [[3, 1], [2, 7], [6, 7], [5, 1], [7, 5]],
      walls: [[5, 4], [7, 0], [0, 2], [2, 0]],
      mirrors: [
        { x: 7, y: 7, slope: 1, split: true },
        { x: 1, y: 6, slope: 1 },
        { x: 7, y: 3, slope: 0 },
        { x: 2, y: 3, slope: 0 },
        { x: 2, y: 1, slope: 1, split: true },
        { x: 1, y: 7, slope: 0 },
      ],
      starTimes: [58, 88, 122],
    },
    /* Bolted Rig: the first welded element. The mirror at (2,7) is bolted
     * down, so the whole bottom-left corner of the route is forced. */
    {
      id: "p16", labelKey: "prismL16", w: 9, h: 9,
      emitter: { x: 6, y: 8, dir: 3 },
      targets: [[2, 2], [8, 1], [5, 3], [6, 5], [2, 5]],
      walls: [[8, 8], [5, 1], [0, 0], [5, 0]],
      mirrors: [
        { x: 0, y: 3, slope: 1 },
        { x: 2, y: 1, slope: 0 },
        { x: 6, y: 1, slope: 1 },
        { x: 0, y: 1, slope: 0 },
        { x: 6, y: 7, slope: 0, split: true },
        { x: 2, y: 7, slope: 0, locked: true },
      ],
      starTimes: [62, 94, 130],
    },
    /* Labyrinth: seven elements, two splitters, one weld, and a route that
     * bends ten times before the last target lights. */
    {
      id: "p17", labelKey: "prismL17", w: 9, h: 9,
      emitter: { x: 8, y: 2, dir: 2 },
      targets: [[3, 7], [2, 8], [7, 6], [3, 3], [6, 2]],
      walls: [[1, 8], [6, 0], [0, 2], [1, 5], [2, 6]],
      mirrors: [
        { x: 5, y: 5, slope: 0, locked: true },
        { x: 3, y: 2, slope: 0 },
        { x: 3, y: 6, slope: 0 },
        { x: 5, y: 8, slope: 1, split: true },
        { x: 8, y: 6, slope: 1 },
        { x: 8, y: 5, slope: 1 },
        { x: 5, y: 6, slope: 1, split: true },
      ],
      starTimes: [66, 100, 138],
    },
    /* Resonator: six targets off seven elements, two of them welded. The
     * solution beam sweeps thirty-six of the eighty-one cells. */
    {
      id: "p18", labelKey: "prismL18", w: 9, h: 9,
      emitter: { x: 8, y: 3, dir: 2 },
      targets: [[0, 6], [6, 6], [6, 4], [3, 3], [2, 1], [8, 1]],
      walls: [[4, 5], [8, 6], [3, 6], [2, 8], [0, 2]],
      mirrors: [
        { x: 1, y: 4, slope: 1, split: true },
        { x: 0, y: 3, slope: 0 },
        { x: 7, y: 6, slope: 1 },
        { x: 0, y: 5, slope: 0, split: true },
        { x: 1, y: 5, slope: 1, locked: true },
        { x: 1, y: 1, slope: 1 },
        { x: 7, y: 4, slope: 0, locked: true },
      ],
      starTimes: [70, 106, 146],
    },
    /* Star Chamber: eight elements, two welded, and a launch from the bottom
     * edge that has to fan out to all four corners. */
    {
      id: "p19", labelKey: "prismL19", w: 9, h: 9,
      emitter: { x: 6, y: 8, dir: 3 },
      targets: [[0, 4], [4, 4], [4, 6], [1, 7], [5, 0], [8, 0]],
      walls: [[7, 4], [7, 2], [8, 8], [4, 1], [5, 5], [8, 6]],
      mirrors: [
        { x: 1, y: 8, slope: 0, locked: true },
        { x: 2, y: 2, slope: 0 },
        { x: 4, y: 3, slope: 0 },
        { x: 4, y: 8, slope: 1 },
        { x: 1, y: 2, slope: 1 },
        { x: 2, y: 0, slope: 0, split: true },
        { x: 6, y: 4, slope: 0, split: true },
        { x: 6, y: 3, slope: 1, locked: true },
      ],
      starTimes: [78, 118, 162],
    },
    /* Aurora Engine: the last bench. Three splitters, two welds, eight
     * elements, and exactly one orientation out of sixty-four that lights
     * all six targets. */
    {
      id: "p20", labelKey: "prismL20", w: 9, h: 9,
      emitter: { x: 0, y: 4, dir: 0 },
      targets: [[1, 8], [5, 3], [4, 1], [6, 2], [7, 2], [5, 0]],
      walls: [[8, 7], [2, 3], [2, 2], [1, 6], [1, 0], [4, 6]],
      mirrors: [
        { x: 5, y: 5, slope: 1, locked: true },
        { x: 4, y: 5, slope: 0 },
        { x: 4, y: 0, slope: 0 },
        { x: 7, y: 8, slope: 1 },
        { x: 7, y: 4, slope: 1, split: true },
        { x: 7, y: 0, slope: 0, locked: true },
        { x: 4, y: 4, slope: 0, split: true },
        { x: 5, y: 2, slope: 1, split: true },
      ],
      starTimes: [88, 132, 180],
    },
    /* Spectrum: seven targets - the widest fan the bench has carried. Three
     * splitters ride one rail down row five and every ray they peel climbs
     * north; the top rung splits again and fires west into the left-edge
     * pair while the main climb escapes over the welded top-left corner,
     * crosses the ceiling and drops down the right edge. */
    {
      id: "p21", labelKey: "prismL21", w: 9, h: 9,
      emitter: { x: 8, y: 5, dir: 2 },
      targets: [[0, 2], [1, 2], [2, 3], [4, 4], [7, 4], [4, 3], [3, 3]],
      walls: [[3, 7], [0, 1], [4, 2], [7, 8], [6, 1], [0, 8]],
      mirrors: [
        { x: 3, y: 0, slope: 0, locked: true },
        { x: 3, y: 5, slope: 1, split: true },
        { x: 2, y: 5, slope: 1 },
        { x: 2, y: 1, slope: 0, locked: true },
        { x: 4, y: 5, slope: 1, split: true },
        { x: 3, y: 1, slope: 0 },
        { x: 2, y: 2, slope: 0, split: true },
        { x: 7, y: 0, slope: 0 },
      ],
      starTimes: [92, 138, 188],
    },
    /* Vortex: the bench widens to ten across. The solution beam is the
     * longest the campaign has carried - forty-six cells - and it keeps
     * folding back on itself: up the eighth column into the welded
     * right-edge chute, back down it, away west along row two, and home
     * along the bottom row into the emitter housing, which absorbs the
     * beam twice before the last target lights. */
    {
      id: "p22", labelKey: "prismL22", w: 10, h: 10,
      emitter: { x: 8, y: 9, dir: 3 },
      targets: [[8, 8], [7, 7], [5, 3], [2, 9], [9, 4], [1, 3]],
      walls: [[5, 1], [4, 5], [4, 0], [4, 6], [3, 3], [0, 1], [0, 0]],
      mirrors: [
        { x: 8, y: 2, slope: 0 },
        { x: 1, y: 2, slope: 0, split: true },
        { x: 1, y: 9, slope: 0 },
        { x: 8, y: 5, slope: 0, split: true },
        { x: 5, y: 5, slope: 1 },
        { x: 9, y: 5, slope: 1, locked: true },
        { x: 1, y: 7, slope: 0, split: true },
        { x: 9, y: 2, slope: 1, locked: true },
      ],
      starTimes: [98, 146, 198],
    },
    /* Anvil: nine elements and three welds - more bolted hardware than any
     * board before it. The welded bottom-left corner is a return loop: the
     * beam runs row eight into it, is thrown back the way it came, and
     * climbs the first column between the fixed mirrors. Half of the
     * route's twelve bends happen against welded steel. */
    {
      id: "p23", labelKey: "prismL23", w: 10, h: 10,
      emitter: { x: 9, y: 3, dir: 2 },
      targets: [[3, 8], [2, 8], [8, 9], [0, 6], [8, 5], [4, 8]],
      walls: [[7, 0], [6, 6], [6, 4], [4, 2], [0, 3], [6, 5], [0, 7]],
      mirrors: [
        { x: 2, y: 6, slope: 0 },
        { x: 8, y: 8, slope: 0 },
        { x: 2, y: 3, slope: 0, split: true },
        { x: 0, y: 8, slope: 0, locked: true },
        { x: 1, y: 5, slope: 0, locked: true },
        { x: 0, y: 9, slope: 1 },
        { x: 1, y: 8, slope: 0, split: true },
        { x: 1, y: 9, slope: 0, locked: true },
        { x: 8, y: 3, slope: 0, split: true },
      ],
      starTimes: [104, 156, 210],
    },
    /* Singularity: the summit. Ten elements, four splitters, three welds
     * and seven targets, and exactly one orientation out of a hundred and
     * twenty-eight lights them all. Three forks ride the emitter's own
     * drop and unzip the beam as it falls; the welded pair in column three
     * catches the first ray it sheds and throws it back across. */
    {
      id: "p24", labelKey: "prismL24", w: 10, h: 10,
      emitter: { x: 5, y: 0, dir: 1 },
      targets: [[4, 1], [1, 7], [3, 2], [8, 4], [8, 7], [0, 5], [9, 4]],
      walls: [[0, 8], [0, 4], [4, 8], [1, 4], [7, 1], [0, 1], [9, 0], [2, 3]],
      mirrors: [
        { x: 5, y: 7, slope: 1 },
        { x: 3, y: 1, slope: 0, locked: true },
        { x: 4, y: 2, slope: 1 },
        { x: 3, y: 3, slope: 0, locked: true },
        { x: 5, y: 4, slope: 0, split: true },
        { x: 0, y: 7, slope: 1, locked: true },
        { x: 4, y: 5, slope: 1, split: true },
        { x: 4, y: 7, slope: 1 },
        { x: 5, y: 3, slope: 1, split: true },
        { x: 5, y: 2, slope: 1, split: true },
      ],
      starTimes: [112, 166, 224],
    },
    /* ------------------------------------------------------------------
     * The summit tier (p25-p30) keeps the wide ten-across bench and grows
     * the fan rung over rung: eight marks on ten elements, then the bench
     * itself rising to eleven and twelve elements with a fifth splitter
     * riding it, nine marks, and the closer's ten - a third of the panel
     * lit at once. Every rung solves from exactly one orientation and sits
     * five flips off the handed deal, and every board was forged, not
     * guessed - `node tools/prism-forge.js verify` re-reads the shipped
     * table and replays every reachable orientation of every board through
     * the same beam tracer the page runs.
     * ------------------------------------------------------------------ */
    /* Wormhole: eight targets off the deep summit's own ten-element bench,
     * and the handed deal lights nothing at all - the first deal in the
     * campaign that starts in the dark. */
    {
      id: "p25", labelKey: "prismL25", w: 10, h: 10,
      emitter: { x: 8, y: 0, dir: 1 },
      targets: [[4, 9], [7, 5], [7, 2], [7, 1], [5, 0], [4, 4], [4, 2], [9, 4]],
      walls: [[0, 3], [0, 2], [3, 0], [0, 7], [8, 8], [3, 5], [6, 9], [5, 5]],
      mirrors: [
        { x: 6, y: 3, slope: 1 },
        { x: 9, y: 6, slope: 0 },
        { x: 7, y: 0, slope: 0, split: true },
        { x: 4, y: 0, slope: 1 },
        { x: 7, y: 3, slope: 0, split: true },
        { x: 9, y: 5, slope: 0, split: true },
        { x: 8, y: 7, slope: 0, locked: true },
        { x: 9, y: 2, slope: 1, locked: true },
        { x: 8, y: 6, slope: 1, split: true },
        { x: 6, y: 7, slope: 0, locked: true },
      ],
      starTimes: [118, 177, 236],
    },
    /* Event Horizon: the bench rises to eleven elements, and the solution
     * beam folds forty-four cells through all of them. */
    {
      id: "p26", labelKey: "prismL26", w: 10, h: 10,
      emitter: { x: 7, y: 0, dir: 1 },
      targets: [[7, 3], [3, 5], [8, 6], [0, 4], [5, 1], [7, 6], [9, 0], [5, 6]],
      walls: [[6, 7], [4, 8], [7, 9], [4, 3], [4, 1], [7, 8], [1, 8], [4, 9]],
      mirrors: [
        { x: 8, y: 1, slope: 1, split: true },
        { x: 7, y: 4, slope: 0, locked: true },
        { x: 7, y: 5, slope: 0, split: true },
        { x: 3, y: 2, slope: 0 },
        { x: 8, y: 4, slope: 0 },
        { x: 1, y: 5, slope: 1 },
        { x: 1, y: 4, slope: 0, split: true },
        { x: 9, y: 2, slope: 1, locked: true },
        { x: 9, y: 5, slope: 1, split: true },
        { x: 3, y: 6, slope: 0 },
        { x: 8, y: 0, slope: 0, locked: true },
      ],
      starTimes: [124, 186, 248],
    },
    /* Quasar: nine marks and a fifth splitter - more forks than any board
     * before it, thirteen bends in the solving route. */
    {
      id: "p27", labelKey: "prismL27", w: 10, h: 10,
      emitter: { x: 5, y: 9, dir: 3 },
      targets: [[8, 7], [4, 7], [7, 3], [7, 9], [0, 8], [6, 4], [9, 7], [6, 6], [5, 6]],
      walls: [[5, 0], [2, 2], [3, 1], [8, 1], [1, 3], [8, 8], [7, 0], [0, 3]],
      mirrors: [
        { x: 4, y: 3, slope: 1 },
        { x: 6, y: 3, slope: 0, split: true },
        { x: 7, y: 2, slope: 0, locked: true },
        { x: 5, y: 2, slope: 1, split: true },
        { x: 5, y: 5, slope: 1 },
        { x: 6, y: 2, slope: 1 },
        { x: 6, y: 7, slope: 0, split: true },
        { x: 8, y: 5, slope: 1, locked: true },
        { x: 4, y: 8, slope: 0, split: true },
        { x: 8, y: 3, slope: 1, locked: true },
        { x: 5, y: 3, slope: 1, split: true },
      ],
      starTimes: [132, 198, 264],
    },
    /* Pulsar: the bench tops out at twelve elements, five of them forks,
     * and the beam still touches every one on its way to nine marks. */
    {
      id: "p28", labelKey: "prismL28", w: 10, h: 10,
      emitter: { x: 7, y: 9, dir: 3 },
      targets: [[9, 4], [9, 9], [8, 8], [7, 2], [4, 1], [5, 3], [7, 7], [3, 4], [1, 0]],
      walls: [[6, 9], [5, 4], [9, 5], [4, 8], [0, 4], [4, 6], [6, 2], [4, 0], [1, 9]],
      mirrors: [
        { x: 2, y: 3, slope: 1, locked: true },
        { x: 7, y: 5, slope: 0, split: true },
        { x: 7, y: 1, slope: 0 },
        { x: 8, y: 6, slope: 1, split: true },
        { x: 1, y: 2, slope: 0, locked: true },
        { x: 3, y: 5, slope: 0 },
        { x: 7, y: 4, slope: 1, split: true },
        { x: 2, y: 5, slope: 0, locked: true },
        { x: 8, y: 9, slope: 1 },
        { x: 3, y: 2, slope: 1 },
        { x: 7, y: 6, slope: 0, split: true },
        { x: 7, y: 3, slope: 0, split: true },
      ],
      starTimes: [140, 210, 280],
    },
    /* Supernova: four welds and the longest beam the campaign has carried -
     * fifty-seven cells swept on the way to nine marks. */
    {
      id: "p29", labelKey: "prismL29", w: 10, h: 10,
      emitter: { x: 9, y: 1, dir: 2 },
      targets: [[2, 0], [2, 2], [8, 9], [2, 8], [4, 1], [5, 9], [1, 3], [6, 9], [3, 6]],
      walls: [[7, 2], [0, 7], [5, 0], [6, 3], [0, 3], [5, 8], [9, 4], [9, 9], [6, 8]],
      mirrors: [
        { x: 2, y: 1, slope: 0, split: true },
        { x: 4, y: 5, slope: 1, locked: true },
        { x: 4, y: 7, slope: 0, split: true },
        { x: 2, y: 4, slope: 1, split: true },
        { x: 1, y: 9, slope: 0 },
        { x: 2, y: 6, slope: 0 },
        { x: 7, y: 9, slope: 0, split: true },
        { x: 4, y: 4, slope: 1, locked: true },
        { x: 7, y: 5, slope: 1, locked: true },
        { x: 4, y: 0, slope: 1, locked: true },
        { x: 2, y: 7, slope: 0, split: true },
        { x: 1, y: 0, slope: 1 },
      ],
      starTimes: [148, 222, 296],
    },
    /* First Light: the summit. Ten of the panel's hundred cells glow at
     * once off twelve elements and five forks, the route bends fifteen
     * times, and exactly one orientation out of two hundred and fifty-six
     * lights them all. */
    {
      id: "p30", labelKey: "prismL30", w: 10, h: 10,
      emitter: { x: 9, y: 8, dir: 2 },
      targets: [[0, 1], [4, 8], [9, 1], [9, 5], [0, 8], [4, 2], [7, 5], [8, 5], [1, 7], [6, 2]],
      walls: [[2, 5], [6, 6], [3, 2], [2, 9], [9, 7], [1, 5], [1, 9], [6, 7], [4, 9]],
      mirrors: [
        { x: 8, y: 6, slope: 1, split: true },
        { x: 1, y: 0, slope: 1 },
        { x: 9, y: 0, slope: 1, locked: true },
        { x: 2, y: 8, slope: 1, split: true },
        { x: 1, y: 1, slope: 0, locked: true },
        { x: 2, y: 6, slope: 1 },
        { x: 8, y: 0, slope: 0, split: true },
        { x: 9, y: 2, slope: 0, split: true },
        { x: 1, y: 6, slope: 1, locked: true },
        { x: 9, y: 6, slope: 1, locked: true },
        { x: 8, y: 8, slope: 1, split: true },
        { x: 7, y: 6, slope: 0 },
      ],
      starTimes: [158, 237, 316],
    },
    /* ------------------------------------------------------------------
     * The observatory tier (p31-p40) widens the bench past the summit and
     * takes one structural record per rung against every board before it.
     * Eleven- and twelve-across paper stretch every walk the summit set,
     * and every ceiling the game had falls somewhere in the ten: the bench
     * climbs to eleven across and then twelve, a sixth splitter joins the
     * rail, a fifth element comes welded, the fan reaches eleven marks and
     * then the closer's twelve, the heaviest single sweep grows from
     * Supernova's fifty-seven cells to fifty-nine and then seventy-one,
     * and the bendiest route runs twenty-one bends against the summit's
     * fifteen. The ten, in order:
     * p31 the first eleven-across bench, p32 the first sweep past
     * fifty-seven cells, p33 the first six-fork bench, p34 the first
     * five-weld board, p35 the first eleven-mark fan, p36 the first
     * thirteen-element bench, p37 the bendiest route the game has carried,
     * p38 the first twelve-across bench, p39 the heaviest sweep, and p40
     * the capstone - twelve marks lit by exactly one orientation out of
     * two hundred and fifty-six. The dial lines never fall: targets,
     * elements, forks, welds and the paper itself only climb, and the
     * deals sit five flips out across the whole tier. Three of the deals
     * start in the dark. Every board was forged, not guessed - `node
     * tools/prism-forge.js verify` re-reads the shipped table and replays
     * every reachable orientation of every board through the same beam
     * tracer the page runs, and each record rung solves from exactly one
     * orientation so the measured beam is the beam. The dense benches
     * starved the forge's scatter search - no random eleven-across layout
     * in three thousand had a single orientation touching all twelve
     * elements - so five of the ten were laid out along a simulated beam
     * walk that seats each element on the ray the walk is travelling and
     * cuts walls only outside the corridor; the search then judged the
     * finished boards by the same release bar as the rest of the ladder.
     * ------------------------------------------------------------------ */
    /* Wide Aperture: the bench widens past the summit - eleven across, the
     * first board the game has dealt on a hundred and twenty-one cells. The
     * emitter fires straight into a fork, so the route forks in the shadow
     * of the housing, and ten marks hang off twelve elements, five of them
     * forks, the solution sweeping forty-four cells on fourteen bends. */
    {
      id: "p31", labelKey: "prismL31", w: 11, h: 11,
      emitter: { x: 2, y: 10, dir: 3 },
      targets: [[6, 5], [9, 8], [6, 3], [1, 8], [4, 3], [4, 5], [5, 7], [4, 0], [0, 8], [4, 2]],
      walls: [[8, 2], [6, 0], [1, 10], [4, 8], [8, 9], [3, 2], [8, 6], [5, 9]],
      mirrors: [
        { x: 2, y: 9, slope: 1, split: true },
        { x: 1, y: 9, slope: 0, locked: true },
        { x: 1, y: 6, slope: 1 },
        { x: 2, y: 6, slope: 1 },
        { x: 2, y: 8, slope: 1, locked: true },
        { x: 3, y: 8, slope: 0, split: true },
        { x: 3, y: 5, slope: 0, locked: true },
        { x: 5, y: 5, slope: 1 },
        { x: 5, y: 8, slope: 1, locked: true },
        { x: 6, y: 8, slope: 1, split: true },
        { x: 6, y: 6, slope: 0, split: true },
        { x: 4, y: 6, slope: 0, split: true },
      ],
      starTimes: [168, 252, 336],
    },
    /* Long Baseline: the first sweep past Supernova's fifty-seven cells -
     * fifty-nine on the way to ten marks, fifteen bends in the route, and
     * one crossing of its own earlier leg on the way home. The deal lights
     * two of the ten and sits five flips off the only orientation that
     * lights them all. */
    {
      id: "p32", labelKey: "prismL32", w: 11, h: 11,
      emitter: { x: 10, y: 5, dir: 2 },
      targets: [[2, 0], [6, 1], [1, 7], [7, 8], [2, 1], [5, 5], [2, 6], [3, 9], [8, 5], [5, 6]],
      walls: [[8, 10], [5, 10], [0, 1], [10, 4], [3, 0], [8, 7], [10, 2]],
      mirrors: [
        { x: 7, y: 5, slope: 1, locked: true },
        { x: 7, y: 9, slope: 1, split: true },
        { x: 2, y: 9, slope: 1 },
        { x: 2, y: 5, slope: 0, locked: true },
        { x: 7, y: 1, slope: 1, locked: true },
        { x: 3, y: 1, slope: 1, split: true },
        { x: 3, y: 5, slope: 1, split: true },
        { x: 6, y: 5, slope: 1, split: true },
        { x: 6, y: 8, slope: 0, split: true },
        { x: 1, y: 8, slope: 1 },
        { x: 1, y: 4, slope: 0 },
        { x: 5, y: 4, slope: 0, locked: true },
      ],
      starTimes: [178, 267, 356],
    },
    /* The Six-Fork: the first six-splitter bench - one more fork than any
     * board before it - and the handed deal lights nothing at all, the
     * second dark deal in the campaign. The one solving orientation sweeps
     * fifty-nine cells through all twelve elements and crosses its own leg
     * once before the last mark glows. */
    {
      id: "p33", labelKey: "prismL33", w: 11, h: 11,
      emitter: { x: 10, y: 2, dir: 2 },
      targets: [[5, 8], [7, 4], [9, 10], [1, 4], [5, 9], [4, 10], [9, 9], [0, 6], [7, 0], [3, 5]],
      walls: [[6, 0], [6, 3], [0, 7], [3, 2], [5, 1], [4, 0], [8, 0], [7, 3]],
      mirrors: [
        { x: 5, y: 7, slope: 1, locked: true },
        { x: 6, y: 5, slope: 0, split: true },
        { x: 10, y: 4, slope: 1, locked: true },
        { x: 3, y: 10, slope: 1, split: true },
        { x: 9, y: 7, slope: 1, split: true },
        { x: 5, y: 10, slope: 0 },
        { x: 6, y: 7, slope: 1, split: true },
        { x: 5, y: 2, slope: 1, locked: true },
        { x: 10, y: 5, slope: 0 },
        { x: 7, y: 2, slope: 1, split: true },
        { x: 0, y: 4, slope: 1, locked: true },
        { x: 9, y: 4, slope: 0, split: true },
      ],
      starTimes: [188, 282, 376],
    },
    /* Bedrock: five welded elements, one more bolted hardware than any board
     * before it. The solving beam comes home: after sixty swept cells and
     * fourteen bends the last leg runs into the emitter housing, which
     * absorbs the beam that lit the panel. */
    {
      id: "p34", labelKey: "prismL34", w: 11, h: 11,
      emitter: { x: 10, y: 9, dir: 2 },
      targets: [[1, 8], [9, 10], [7, 5], [3, 10], [5, 7], [0, 2], [5, 4], [7, 7], [4, 6], [2, 4]],
      walls: [[0, 4], [7, 1], [7, 2], [3, 0], [3, 2], [6, 0], [10, 10], [3, 8]],
      mirrors: [
        { x: 5, y: 10, slope: 1 },
        { x: 4, y: 2, slope: 0, locked: true },
        { x: 2, y: 9, slope: 1, split: true },
        { x: 4, y: 10, slope: 1, split: true },
        { x: 9, y: 9, slope: 0, split: true },
        { x: 7, y: 8, slope: 1, split: true },
        { x: 2, y: 2, slope: 1, locked: true },
        { x: 9, y: 8, slope: 1, locked: true },
        { x: 1, y: 3, slope: 0, split: true },
        { x: 7, y: 3, slope: 1, locked: true },
        { x: 5, y: 2, slope: 0, locked: true },
        { x: 5, y: 9, slope: 1, split: true },
      ],
      starTimes: [198, 297, 396],
    },
    /* Deep Field: eleven targets - the widest fan the bench has carried, one
     * mark past the summit's own ten - lit by exactly one of the hundred and
     * twenty-eight arrangements the free slopes can form, sweeping
     * sixty-three cells on the way. */
    {
      id: "p35", labelKey: "prismL35", w: 11, h: 11,
      emitter: { x: 2, y: 10, dir: 3 },
      targets: [[3, 3], [10, 10], [4, 1], [0, 2], [4, 2], [6, 3], [5, 1], [1, 2], [2, 4], [8, 3], [4, 6]],
      walls: [[4, 8], [4, 0], [5, 8], [7, 4], [1, 3], [4, 9], [3, 10], [0, 9]],
      mirrors: [
        { x: 2, y: 7, slope: 0, split: true },
        { x: 2, y: 3, slope: 1, split: true },
        { x: 5, y: 2, slope: 1, locked: true },
        { x: 4, y: 4, slope: 0 },
        { x: 10, y: 1, slope: 1, split: true },
        { x: 10, y: 0, slope: 0, locked: true },
        { x: 8, y: 0, slope: 1, split: true },
        { x: 5, y: 5, slope: 0, split: true },
        { x: 5, y: 7, slope: 0, split: true },
        { x: 3, y: 4, slope: 0, locked: true },
        { x: 8, y: 7, slope: 1, locked: true },
        { x: 3, y: 5, slope: 0, locked: true },
      ],
      starTimes: [210, 315, 420],
    },
    /* Thirteen Optics: the first thirteen-element bench, one more optic than
     * the summit ever fielded, every one of them on the fattest solution
     * beam. Two orientations light the eleven marks - the tier's loosest
     * board - and the fatter of the two sweeps sixty cells, bending fifteen
     * times. */
    {
      id: "p36", labelKey: "prismL36", w: 11, h: 11,
      emitter: { x: 0, y: 9, dir: 0 },
      targets: [[10, 3], [4, 4], [6, 8], [4, 6], [8, 5], [2, 10], [4, 9], [2, 7], [8, 1], [7, 5], [10, 5]],
      walls: [[7, 10], [10, 8], [1, 8], [9, 6], [7, 6], [4, 8], [9, 8], [3, 3]],
      mirrors: [
        { x: 4, y: 0, slope: 1, locked: true },
        { x: 10, y: 1, slope: 1 },
        { x: 9, y: 5, slope: 1, split: true },
        { x: 10, y: 4, slope: 0, locked: true },
        { x: 6, y: 9, slope: 1, locked: true },
        { x: 2, y: 4, slope: 1, split: true },
        { x: 5, y: 5, slope: 1, split: true },
        { x: 9, y: 4, slope: 0 },
        { x: 8, y: 3, slope: 1, locked: true },
        { x: 8, y: 4, slope: 0, split: true },
        { x: 6, y: 0, slope: 0, split: true },
        { x: 5, y: 1, slope: 0, locked: true },
        { x: 5, y: 9, slope: 0, split: true },
      ],
      starTimes: [220, 330, 440],
    },
    /* Gyre: the bendiest route the game has carried - twenty-one bends
     * against the summit's fifteen, the beam knotting through a cluster of
     * optics mid-board and crossing its own earlier legs twice on the way to
     * eleven marks. Exactly one orientation out of two hundred and
     * fifty-six unties it. */
    {
      id: "p37", labelKey: "prismL37", w: 11, h: 11,
      emitter: { x: 3, y: 0, dir: 1 },
      targets: [[8, 2], [8, 4], [4, 2], [5, 0], [1, 7], [6, 5], [5, 3], [4, 9], [9, 2], [5, 8], [4, 10]],
      walls: [[7, 6], [2, 6], [8, 6], [9, 4], [7, 1], [8, 1], [10, 2], [10, 7]],
      mirrors: [
        { x: 3, y: 2, slope: 0, split: true },
        { x: 6, y: 2, slope: 1, split: true },
        { x: 6, y: 4, slope: 1, split: true },
        { x: 3, y: 4, slope: 1, locked: true },
        { x: 3, y: 7, slope: 0 },
        { x: 6, y: 7, slope: 0, locked: true },
        { x: 6, y: 9, slope: 0, locked: true },
        { x: 5, y: 9, slope: 0, locked: true },
        { x: 5, y: 7, slope: 1, split: true },
        { x: 6, y: 8, slope: 0, locked: true },
        { x: 4, y: 8, slope: 0 },
        { x: 4, y: 6, slope: 1, split: true },
        { x: 6, y: 6, slope: 0, split: true },
      ],
      starTimes: [232, 348, 464],
    },
    /* Twelve Across: the first board on twelve-by-twelve paper - forty-four
     * more cells than anything the summit dealt - under the tier's standing
     * bar: eleven marks, six forks, five welds, one solving orientation,
     * sixty-six swept cells. */
    {
      id: "p38", labelKey: "prismL38", w: 12, h: 12,
      emitter: { x: 8, y: 11, dir: 3 },
      targets: [[3, 2], [3, 6], [9, 8], [7, 7], [7, 6], [7, 4], [0, 0], [0, 9], [10, 1], [6, 9], [7, 1]],
      walls: [[11, 10], [0, 2], [4, 1], [2, 7], [0, 4], [0, 1], [9, 6], [11, 3], [0, 3]],
      mirrors: [
        { x: 2, y: 6, slope: 1, split: true },
        { x: 3, y: 4, slope: 1, split: true },
        { x: 8, y: 5, slope: 0, split: true },
        { x: 9, y: 7, slope: 0 },
        { x: 5, y: 1, slope: 0, locked: true },
        { x: 5, y: 5, slope: 0, locked: true },
        { x: 8, y: 0, slope: 1, locked: true },
        { x: 6, y: 7, slope: 0 },
        { x: 3, y: 1, slope: 0, locked: true },
        { x: 2, y: 4, slope: 1, split: true },
        { x: 9, y: 9, slope: 0, locked: true },
        { x: 6, y: 1, slope: 1, split: true },
        { x: 8, y: 4, slope: 0, split: true },
      ],
      starTimes: [244, 366, 488],
    },
    /* Floodlight: the heaviest sweep the game has ever carried - seventy-one
     * of the hundred and forty-four cells glow with stray beam on the way to
     * eleven marks, past the sixty-six Twelve Across swept. The deal starts
     * dark - the third dark deal of the campaign - and the one solving
     * orientation bends fourteen times across six forks. */
    {
      id: "p39", labelKey: "prismL39", w: 12, h: 12,
      emitter: { x: 5, y: 0, dir: 1 },
      targets: [[7, 6], [8, 0], [11, 7], [10, 9], [5, 6], [6, 8], [4, 3], [5, 9], [7, 8], [7, 11], [5, 4]],
      walls: [[10, 0], [6, 7], [1, 2], [0, 1], [4, 7], [7, 0], [10, 3], [4, 11]],
      mirrors: [
        { x: 5, y: 3, slope: 1, locked: true },
        { x: 9, y: 3, slope: 0, locked: true },
        { x: 9, y: 8, slope: 1, split: true },
        { x: 5, y: 8, slope: 0 },
        { x: 2, y: 3, slope: 1, locked: true },
        { x: 2, y: 9, slope: 1, split: true },
        { x: 8, y: 9, slope: 0 },
        { x: 8, y: 6, slope: 1, split: true },
        { x: 3, y: 6, slope: 0, locked: true },
        { x: 3, y: 2, slope: 0, locked: true },
        { x: 7, y: 2, slope: 1, split: true },
        { x: 7, y: 7, slope: 0, split: true },
        { x: 10, y: 7, slope: 1, split: true },
      ],
      starTimes: [256, 384, 512],
    },
    /* Infinity: the capstone. Twelve of the panel's hundred and forty-four
     * cells glow at once - a mark more than any board before it - off
     * thirteen elements and six forks, the route bending eighteen times, and
     * exactly one orientation out of two hundred and fifty-six lights them
     * all. The deal starts in the dark, and the beam still sweeps sixty-eight
     * cells on its way round. */
    {
      id: "p40", labelKey: "prismL40", w: 12, h: 12,
      emitter: { x: 11, y: 3, dir: 2 },
      targets: [[5, 4], [8, 1], [11, 9], [3, 6], [6, 10], [5, 3], [7, 9], [7, 3], [9, 5], [3, 10], [9, 8], [8, 7]],
      walls: [[2, 4], [3, 2], [5, 1], [2, 3], [1, 1], [2, 1], [9, 0], [6, 11]],
      mirrors: [
        { x: 6, y: 3, slope: 1, locked: true },
        { x: 6, y: 7, slope: 1, split: true },
        { x: 1, y: 7, slope: 1, locked: true },
        { x: 1, y: 9, slope: 1, split: true },
        { x: 5, y: 9, slope: 0, split: true },
        { x: 5, y: 5, slope: 1, split: true },
        { x: 10, y: 5, slope: 1, locked: true },
        { x: 10, y: 1, slope: 1, locked: true },
        { x: 6, y: 1, slope: 1, split: true },
        { x: 9, y: 3, slope: 0 },
        { x: 9, y: 7, slope: 1 },
        { x: 3, y: 3, slope: 1, locked: true },
        { x: 3, y: 7, slope: 1, split: true },
      ],
      starTimes: [272, 408, 544],
    },
  ];
  /* "/" is slope 1, "\" is slope 0. */
  var SLOPE_SLASH = 1;
  var SLOPE_BACK = 0;
  var REFLECT = {
    0: { 1: 3, 0: 1 },
    1: { 1: 0, 0: 2 },
    2: { 1: 1, 0: 3 },
    3: { 1: 2, 0: 0 },
  };
  var STEP_X = [1, 0, -1, 0];
  var STEP_Y = [0, 1, 0, -1];

  function initPrismPathGame() {
    var canvas = getElement("prisCanvas");
    var goalsEl = getElement("prisGoals");
    var movesEl = getElement("prisMoves");
    var timeEl = getElement("prisTime");
    var resultEl = getElement("prisResult");
    var startBtn = getElement("prisNewBtn");
    var bestEl = getElement("prisBest");
    var selectEl = getElement("prisLevelSel");
    if (
      !canvas ||
      !goalsEl ||
      !movesEl ||
      !timeEl ||
      !resultEl ||
      !startBtn ||
      !bestEl ||
      !selectEl
    ) {
      return;
    }

    var ctx = canvas.getContext("2d");
    var campaign = createCampaign({ key: "prism-path-campaign", levels: prismLevels });
    var level = prismLevels[0];
    var cellSize = 0;
    var boardW = 0;
    var boardH = 0;
    var mirrors = [];
    var litTargets = {};
    /* One polyline per branch: a splitter hands the beam to two branches, and
     * each branch keeps its own route from the emitter for the draw pass. */
    var beamPaths = [];
    var moves = 0;
    var solved = false;
    var cursor = { x: 0, y: 0 };
    var rafId = null;
    var startedAt = 0;
    var clockRunning = false;

    function keyAt(x, y) {
      return x + "," + y;
    }

    function mirrorAt(x, y) {
      for (var index = 0; index < mirrors.length; index += 1) {
        if (mirrors[index].x === x && mirrors[index].y === y) {
          return mirrors[index];
        }
      }
      return null;
    }

    function isWall(x, y) {
      return level.walls.some(function (wall) {
        return wall[0] === x && wall[1] === y;
      });
    }

    function isTarget(x, y) {
      return level.targets.some(function (target) {
        return target[0] === x && target[1] === y;
      });
    }

    function renderHud() {
      movesEl.textContent = String(moves);
      goalsEl.textContent =
        level.targets.filter(function (target) {
          return litTargets[keyAt(target[0], target[1])];
        }).length + "/" + level.targets.length;
      timeEl.textContent = clockRunning
        ? ((Date.now() - startedAt) / 1000).toFixed(1) + "s"
        : timeEl.textContent;
    }

    /* Trace the beam through the current optics. A mirror bends the ray; a
     * splitter bends it *and* lets it carry straight on, so the trace walks a
     * queue of branches. The guard keys on cell plus direction, so a route may
     * cross its own earlier leg - but never ray the same cell the same way
     * twice, which is what would loop forever. */
    function traceBeam() {
      litTargets = {};
      beamPaths = [];
      var seen = {};
      var queue = [{
        x: level.emitter.x,
        y: level.emitter.y,
        dir: level.emitter.dir,
        path: [],
      }];
      var guard = 0;
      while (queue.length && guard < 600) {
        guard += 1;
        var ray = queue.shift();
        var x = ray.x + STEP_X[ray.dir];
        var y = ray.y + STEP_Y[ray.dir];
        if (x < 0 || y < 0 || x >= level.w || y >= level.h) {
          if (ray.path.length) {
            beamPaths.push(ray.path);
          }
          continue;
        }
        var stateKey = x + "," + y + "," + ray.dir;
        if (seen[stateKey]) {
          if (ray.path.length) {
            beamPaths.push(ray.path);
          }
          continue;
        }
        seen[stateKey] = true;
        var path = ray.path.concat([{ x: x, y: y }]);
        if (isWall(x, y)) {
          beamPaths.push(path);
          continue;
        }
        if (isTarget(x, y)) {
          litTargets[keyAt(x, y)] = true;
        }
        var mirror = mirrorAt(x, y);
        /* Reaching the emitter ends the branch: the housing absorbs it. */
        if (x === level.emitter.x && y === level.emitter.y) {
          beamPaths.push(path);
          continue;
        }
        var outs = [];
        if (mirror) {
          outs.push(REFLECT[ray.dir][mirror.slope]);
          if (mirror.split) {
            outs.push(ray.dir);
          }
        } else {
          outs.push(ray.dir);
        }
        outs.forEach(function (dir) {
          queue.push({ x: x, y: y, dir: dir, path: path });
        });
      }
    }

    function allLit() {
      return level.targets.every(function (target) {
        return litTargets[keyAt(target[0], target[1])];
      });
    }

    function checkCleared() {
      if (solved || !allLit()) {
        return;
      }
      solved = true;
      clockRunning = false;
      var seconds = Math.max(0.1, (Date.now() - startedAt) / 1000);
      var starsWon = starsFor(Math.round(seconds * 10) / 10, level.starTimes, "low");
      var outcome = campaign.record(level.id, {
        stars: starsWon,
        best: Math.round(seconds * 10) / 10,
        better: "low",
      });
      var message = t("prismCleared", { s: seconds.toFixed(1), stars: starsWon });
      if (outcome.isBest) {
        message += " " + t("newBest");
      }
      if (outcome.unlockedNext) {
        message += " " + t("prismNextBoard");
      } else if (campaign.clearedCount() === prismLevels.length) {
        message += " " + t("prismCampaignDone");
      }
      logAction(t("logPrismPath", { n: level.targets.length }));
      var rect = startBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      var nextId = outcome.unlockedNext || level.id;
      loadLevel(prismLevels[campaign.indexOf(nextId)]);
      resultEl.textContent = message;
    }

    function rotateAt(x, y) {
      var mirror = mirrorAt(x, y);
      if (!mirror || solved) {
        return;
      }
      /* A welded element is bolted to the bench: say so instead of counting a
       * move the player cannot make. */
      if (mirror.locked) {
        resultEl.textContent = t("prismWelded");
        return;
      }
      mirror.slope = mirror.slope === SLOPE_SLASH ? SLOPE_BACK : SLOPE_SLASH;
      moves += 1;
      if (!clockRunning) {
        clockRunning = true;
        startedAt = Date.now();
      }
      traceBeam();
      renderHud();
      draw();
      checkCleared();
    }

    function loadLevel(levelDef) {
      level = levelDef;
      cellSize = Math.floor(Math.min(
        (prismSize - 16) / level.w,
        (prismSize - 16) / level.h,
      ));
      boardW = cellSize * level.w;
      boardH = cellSize * level.h;
      mirrors = level.mirrors.map(function (mirror) {
        return {
          x: mirror.x,
          y: mirror.y,
          slope: mirror.slope,
          split: !!mirror.split,
          locked: !!mirror.locked,
        };
      });
      moves = 0;
      solved = false;
      cursor = { x: level.emitter.x, y: level.emitter.y };
      clockRunning = false;
      startedAt = Date.now();
      traceBeam();
      renderHud();
      refreshPicker();
      startLoop();
      draw();
      resultEl.textContent = t("prismReady", { n: level.targets.length }) + benchHint();
    }

    /* The bench boards carry elements the first ten never show, so name them
     * once when the board loads instead of leaving the player to guess. */
    function benchHint() {
      var hint = "";
      if (level.mirrors.some(function (mirror) {
        return mirror.split;
      })) {
        hint += " " + t("prismSplitHint");
      }
      if (level.mirrors.some(function (mirror) {
        return mirror.locked;
      })) {
        hint += " " + t("prismLockedHint");
      }
      return hint;
    }

    function centerOf(x, y) {
      return {
        x: (prismSize - boardW) / 2 + x * cellSize + cellSize / 2,
        y: (prismSize - boardH) / 2 + y * cellSize + cellSize / 2,
      };
    }

    function draw() {
      var time = Date.now();
      ctx.clearRect(0, 0, prismSize, prismSize);
      if (App.world) { App.world.backdrop(ctx, prismSize, prismSize, "laboratory"); }
      /* Emitter */
      var emitterCenter = centerOf(level.emitter.x, level.emitter.y);
      ctx.beginPath();
      ctx.arc(emitterCenter.x, emitterCenter.y, cellSize * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = "#ff6b35";
      ctx.shadowColor = "#ff6b35";
      ctx.shadowBlur = 14 + Math.sin(time / 260) * 4;
      ctx.fill();
      ctx.shadowBlur = 0;
      /* Beam - one pass per branch, so a split route lights both legs. */
      if (beamPaths.length) {
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        var start = centerOf(level.emitter.x, level.emitter.y);
        beamPaths.forEach(function (path) {
          ctx.beginPath();
          ctx.moveTo(start.x, start.y);
          path.forEach(function (point) {
            var center = centerOf(point.x, point.y);
            ctx.lineTo(center.x, center.y);
          });
          ctx.strokeStyle = "rgba(255, 107, 53, 0.35)";
          ctx.lineWidth = Math.max(6, cellSize * 0.34);
          ctx.shadowColor = "#ff6b35";
          ctx.shadowBlur = 18;
          ctx.stroke();
          ctx.strokeStyle = "rgba(0, 242, 255, 0.95)";
          ctx.lineWidth = Math.max(2, cellSize * 0.12);
          ctx.shadowColor = "#00f2ff";
          ctx.shadowBlur = 10;
          ctx.stroke();
          /* Travelling pulse along the beam */
          ctx.setLineDash([cellSize * 0.6, cellSize * 1.8]);
          ctx.lineDashOffset = -(time / 18) % (cellSize * 2.4);
          ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
          ctx.lineWidth = Math.max(1, cellSize * 0.06);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.shadowBlur = 0;
        });
      }
      /* Walls */
      level.walls.forEach(function (wall) {
        var center = centerOf(wall[0], wall[1]);
        ctx.fillStyle = "rgba(148, 163, 184, 0.4)";
        ctx.fillRect(
          center.x - cellSize * 0.38,
          center.y - cellSize * 0.38,
          cellSize * 0.76,
          cellSize * 0.76,
        );
      });
      /* Optics: a mirror is a cyan blade, a splitter is the same blade inside a
       * violet fork, and a welded element of either kind is amber and bolted. */
      mirrors.forEach(function (mirror) {
        var center = centerOf(mirror.x, mirror.y);
        var angle = mirror.slope === SLOPE_SLASH ? -Math.PI / 4 : Math.PI / 4;
        var edge = mirror.locked ? "#fbbf24" : mirror.split ? "#c084fc" : "#22d3ee";
        ctx.save();
        ctx.translate(center.x, center.y);
        if (mirror.split) {
          /* The fork: a diamond body that reads as "two rays leave here". */
          ctx.beginPath();
          ctx.moveTo(0, -cellSize * 0.34);
          ctx.lineTo(cellSize * 0.34, 0);
          ctx.lineTo(0, cellSize * 0.34);
          ctx.lineTo(-cellSize * 0.34, 0);
          ctx.closePath();
          ctx.fillStyle = mirror.locked ? "rgba(251, 191, 36, 0.22)" : "rgba(192, 132, 252, 0.22)";
          ctx.fill();
          ctx.strokeStyle = edge;
          ctx.lineWidth = 1.6;
          ctx.shadowColor = edge;
          ctx.shadowBlur = 8;
          ctx.stroke();
        }
        ctx.rotate(angle);
        ctx.fillStyle = mirror.locked
          ? "rgba(251, 191, 36, 0.26)"
          : mirror.split
            ? "rgba(192, 132, 252, 0.26)"
            : "rgba(34, 211, 238, 0.28)";
        ctx.fillRect(-cellSize * 0.38, -cellSize * 0.1, cellSize * 0.76, cellSize * 0.2);
        ctx.strokeStyle = edge;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = edge;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(-cellSize * 0.38, 0);
        ctx.lineTo(cellSize * 0.38, 0);
        ctx.stroke();
        if (mirror.locked) {
          /* Two bolt heads, drawn unrotated so they read as hardware. */
          ctx.rotate(-angle);
          [-1, 1].forEach(function (side) {
            ctx.beginPath();
            ctx.arc(side * cellSize * 0.28, 0, Math.max(1.2, cellSize * 0.05), 0, Math.PI * 2);
            ctx.fillStyle = "#fbbf24";
            ctx.fill();
          });
        }
        ctx.restore();
        ctx.shadowBlur = 0;
      });
      /* Targets */
      level.targets.forEach(function (target, index) {
        var center = centerOf(target[0], target[1]);
        var lit = litTargets[keyAt(target[0], target[1])];
        ctx.beginPath();
        ctx.arc(center.x, center.y, cellSize * 0.22, 0, Math.PI * 2);
        ctx.fillStyle = lit ? "#a3e635" : "rgba(148, 163, 184, 0.25)";
        ctx.shadowColor = "#a3e635";
        ctx.shadowBlur = lit ? 14 + Math.sin(time / 220 + index) * 5 : 0;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(center.x, center.y, cellSize * 0.33, 0, Math.PI * 2);
        ctx.strokeStyle = lit ? "rgba(163, 230, 53, 0.7)" : "rgba(148, 163, 184, 0.35)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });
      /* Keyboard cursor */
      var cursorCenter = centerOf(cursor.x, cursor.y);
      ctx.beginPath();
      ctx.arc(cursorCenter.x, cursorCenter.y, cellSize * 0.36, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    function frame() {
      if (rafId === null) {
        return;
      }
      /* The glow is decoration: hidden panels keep the slot but skip work. */
      if (document.getElementById("gamePanelPrismPath").hidden || document.hidden) {
        rafId = window.requestAnimationFrame(frame);
        return;
      }
      if (clockRunning) {
        renderHud();
      }
      draw();
      rafId = window.requestAnimationFrame(frame);
    }

    function startLoop() {
      if (rafId !== null) {
        return;
      }
      rafId = window.requestAnimationFrame(frame);
    }

    function stopLoop() {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
    }

    function cellFromEvent(event) {
      var rect = canvas.getBoundingClientRect();
      var scaleX = canvas.width / rect.width;
      var scaleY = canvas.height / rect.height;
      var px = (event.clientX - rect.left) * scaleX;
      var py = (event.clientY - rect.top) * scaleY;
      var x = Math.floor((px - (prismSize - boardW) / 2) / cellSize);
      var y = Math.floor((py - (prismSize - boardH) / 2) / cellSize);
      if (x < 0 || y < 0 || x >= level.w || y >= level.h) {
        return null;
      }
      return { x: x, y: y };
    }

    canvas.addEventListener("pointerdown", function (event) {
      event.preventDefault();
      var cell = cellFromEvent(event);
      if (!cell) {
        return;
      }
      cursor = cell;
      rotateAt(cell.x, cell.y);
    });

    canvas.addEventListener("keydown", function (event) {
      var step = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
      if (step) {
        event.preventDefault();
        cursor.x = Math.min(level.w - 1, Math.max(0, cursor.x + step[0]));
        cursor.y = Math.min(level.h - 1, Math.max(0, cursor.y + step[1]));
        draw();
        return;
      }
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        rotateAt(cursor.x, cursor.y);
      }
    });

    selectEl.addEventListener("change", function () {
      var index = campaign.indexOf(selectEl.value);
      if (index >= 0 && campaign.isUnlocked(selectEl.value)) {
        loadLevel(prismLevels[index]);
      }
    });

    startBtn.addEventListener("click", function () {
      loadLevel(level);
    });

    function refreshPicker() {
      fillCampaignPicker(
        selectEl,
        campaign,
        function (def) {
          return t(def.labelKey);
        },
        t("elementsLocked"),
      );
      selectEl.value = level.id;
      bestEl.textContent = t("campaignStars", {
        n: campaign.totalStars(),
        max: campaign.maxStars(),
      });
    }

    App.quietResetPrismPath = function () {
      clockRunning = false;
      resultEl.textContent = t("prismPaused");
    };

    loadLevel(prismLevels[campaign.indexOf(campaign.nextLevelId())]);
  }


  /* Bilingual copy travels with the game: addStrings only fills keys i18n.js
   * does not already own, so the shared dictionary stays authoritative. */
  App.addStrings({
    en: {
      "prismL9": "Deadfall",
      "prismL10": "Overpass",
      "prismL11": "Relay",
      "prismL12": "Kaleidoscope",
      "prismL13": "Split Gate",
      "prismL14": "Twin Beam",
      "prismL15": "Cascade",
      "prismL16": "Bolted Rig",
      "prismL17": "Labyrinth",
      "prismL18": "Resonator",
      "prismL19": "Star Chamber",
      "prismL20": "Aurora Engine",
      "prismL21": "Spectrum",
      "prismL22": "Vortex",
      "prismL23": "Anvil",
      "prismL24": "Singularity",
      "prismL25": "Wormhole",
      "prismL26": "Event Horizon",
      "prismL27": "Quasar",
      "prismL28": "Pulsar",
      "prismL29": "Supernova",
      "prismL30": "First Light",
      "prismL31": "Wide Aperture",
      "prismL32": "Long Baseline",
      "prismL33": "The Six-Fork",
      "prismL34": "Bedrock",
      "prismL35": "Deep Field",
      "prismL36": "Thirteen Optics",
      "prismL37": "Gyre",
      "prismL38": "Twelve Across",
      "prismL39": "Floodlight",
      "prismL40": "Infinity",
      "prismSplitHint": "Violet forks split the beam: one ray turns, one carries straight on.",
      "prismLockedHint": "Amber elements are welded down and never rotate.",
      "prismWelded": "That element is welded to the bench - build the route around it.",
    },
    zh: {
      "prismL9": "落石阱",
      "prismL10": "立交桥",
      "prismL11": "中继",
      "prismL12": "万花筒",
      "prismL13": "分光闸",
      "prismL14": "双生光",
      "prismL15": "叠瀑",
      "prismL16": "铆死机架",
      "prismL17": "光迷宫",
      "prismL18": "共振腔",
      "prismL19": "星室",
      "prismL20": "极光引擎",
      "prismL21": "光谱",
      "prismL22": "漩涡",
      "prismL23": "铁砧",
      "prismL24": "奇点",
      "prismL25": "虫洞",
      "prismL26": "视界",
      "prismL27": "类星体",
      "prismL28": "脉冲星",
      "prismL29": "超新星",
      "prismL30": "原初之光",
      "prismL31": "宽口径",
      "prismL32": "长基线",
      "prismL33": "六分光",
      "prismL34": "基岩",
      "prismL35": "深场",
      "prismL36": "十三镜",
      "prismL37": "回旋",
      "prismL38": "十二路",
      "prismL39": "泛光",
      "prismL40": "无穷",
      "prismSplitHint": "紫色分光叉会把光束劈成两路：一路转向，一路直穿。",
      "prismLockedHint": "琥珀色元件已被焊死，永远不会转动。",
      "prismWelded": "这个元件焊死在台面上——请绕开它设计光路。",
    },
  });

  /* Exported for the other modules - the table also lets the harness drive
   * every board headlessly and the forge re-verify them. */
  App.initPrismPathGame = initPrismPathGame;
  App.prismLevels = prismLevels;
})(window.CapitalConvert = window.CapitalConvert || {});
