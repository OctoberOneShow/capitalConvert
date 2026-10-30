/* Glyph Crossing - The lane-hopping campaign in the shared game drawer. */
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
  var croCell = 40;
  var croCols = 8;
  var croRows = 9;
  var croWidth = croCell * croCols;
  var croHeight = croCell * croRows;
  /* Row map: 0 pads (goal), 1-3 river, 4 median, 5-7 road, 8 start. */
  var RIVER_ROWS = [1, 2, 3];
  var ROAD_ROWS = [5, 6, 7];
  var PAD_COLS = [1, 3, 5, 7];
  /* Fords: one lane spec per row 1-3 and 5-7. River lanes carry logs, road
   * lanes carry ink streaks. Star times are [3-star, 2-star, 1-star]. */
  var croLevels = [
    {
      id: "c1", labelKey: "croL1",
      lanes: [
        { row: 1, dir: 1, speed: 26, len: 100, gap: 190 },
        { row: 2, dir: -1, speed: 30, len: 90, gap: 200 },
        { row: 3, dir: 1, speed: 34, len: 100, gap: 180 },
        { row: 5, dir: -1, speed: 40, len: 70, gap: 200 },
        { row: 6, dir: 1, speed: 48, len: 70, gap: 180 },
        { row: 7, dir: -1, speed: 56, len: 80, gap: 190 },
      ],
      starTimes: [30, 50, 80],
    },
    {
      id: "c2", labelKey: "croL2",
      lanes: [
        { row: 1, dir: 1, speed: 32, len: 90, gap: 170 },
        { row: 2, dir: -1, speed: 38, len: 90, gap: 180 },
        { row: 3, dir: 1, speed: 42, len: 90, gap: 170 },
        { row: 5, dir: -1, speed: 50, len: 70, gap: 180 },
        { row: 6, dir: 1, speed: 58, len: 80, gap: 170 },
        { row: 7, dir: -1, speed: 66, len: 80, gap: 170 },
      ],
      starTimes: [35, 55, 85],
    },
    {
      id: "c3", labelKey: "croL3",
      lanes: [
        { row: 1, dir: -1, speed: 38, len: 80, gap: 165 },
        { row: 2, dir: 1, speed: 44, len: 90, gap: 165 },
        { row: 3, dir: -1, speed: 50, len: 80, gap: 160 },
        { row: 5, dir: 1, speed: 58, len: 70, gap: 165 },
        { row: 6, dir: -1, speed: 66, len: 70, gap: 160 },
        { row: 7, dir: 1, speed: 74, len: 80, gap: 160 },
      ],
      starTimes: [40, 60, 90],
    },
    {
      id: "c4", labelKey: "croL4",
      lanes: [
        { row: 1, dir: 1, speed: 44, len: 80, gap: 160 },
        { row: 2, dir: -1, speed: 52, len: 80, gap: 160 },
        { row: 3, dir: 1, speed: 58, len: 90, gap: 155 },
        { row: 5, dir: -1, speed: 66, len: 70, gap: 155 },
        { row: 6, dir: 1, speed: 76, len: 70, gap: 150 },
        { row: 7, dir: -1, speed: 86, len: 80, gap: 150 },
      ],
      starTimes: [45, 65, 95],
    },
    {
      id: "c5", labelKey: "croL5",
      lanes: [
        { row: 1, dir: -1, speed: 52, len: 80, gap: 155 },
        { row: 2, dir: 1, speed: 60, len: 80, gap: 150 },
        { row: 3, dir: -1, speed: 68, len: 90, gap: 150 },
        { row: 5, dir: 1, speed: 76, len: 70, gap: 150 },
        { row: 6, dir: -1, speed: 86, len: 70, gap: 145 },
        { row: 7, dir: 1, speed: 96, len: 80, gap: 145 },
      ],
      starTimes: [50, 72, 105],
    },
    {
      id: "c6", labelKey: "croL6",
      lanes: [
        { row: 1, dir: 1, speed: 60, len: 80, gap: 150 },
        { row: 2, dir: -1, speed: 70, len: 80, gap: 145 },
        { row: 3, dir: 1, speed: 80, len: 80, gap: 145 },
        { row: 5, dir: -1, speed: 90, len: 70, gap: 145 },
        { row: 6, dir: 1, speed: 100, len: 70, gap: 140 },
        { row: 7, dir: -1, speed: 110, len: 80, gap: 140 },
      ],
      starTimes: [55, 80, 115],
    },
    {
      id: "c7", labelKey: "croL7",
      lanes: [
        { row: 1, dir: -1, speed: 68, len: 80, gap: 160 },
        { row: 2, dir: 1, speed: 80, len: 80, gap: 155 },
        { row: 3, dir: -1, speed: 92, len: 80, gap: 155 },
        { row: 5, dir: 1, speed: 102, len: 70, gap: 155 },
        { row: 6, dir: -1, speed: 112, len: 70, gap: 150 },
        { row: 7, dir: 1, speed: 124, len: 80, gap: 150 },
      ],
      starTimes: [60, 88, 125],
    },
    {
      id: "c8", labelKey: "croL8",
      lanes: [
        { row: 1, dir: 1, speed: 76, len: 80, gap: 152 },
        { row: 2, dir: -1, speed: 90, len: 80, gap: 148 },
        { row: 3, dir: 1, speed: 104, len: 80, gap: 148 },
        { row: 5, dir: -1, speed: 114, len: 70, gap: 148 },
        { row: 6, dir: 1, speed: 124, len: 70, gap: 144 },
        { row: 7, dir: -1, speed: 138, len: 80, gap: 144 },
      ],
      starTimes: [66, 96, 138],
    },
    {
      id: "c9", labelKey: "croL9",
      lanes: [
        { row: 1, dir: -1, speed: 84, len: 80, gap: 148 },
        { row: 2, dir: 1, speed: 100, len: 80, gap: 144 },
        { row: 3, dir: -1, speed: 116, len: 80, gap: 144 },
        { row: 5, dir: 1, speed: 126, len: 70, gap: 144 },
        { row: 6, dir: -1, speed: 136, len: 70, gap: 140 },
        { row: 7, dir: 1, speed: 152, len: 80, gap: 140 },
      ],
      starTimes: [72, 105, 150],
    },
    /* Cross-traffic: the ladder so far only ever sped the same six-row template
     * up, one lane per flow row. This rung keeps that tempo ramp but leans on a
     * second thing the engine already models - props are matched by row, not by
     * lane, so two specs sharing row 6 put two opposing streak trains through
     * one lane. The window is then the intersection of two independent gap
     * cycles, which no single-lane rung in the ladder can ask for. */
    {
      id: "c10", labelKey: "croL10",
      lanes: [
        { row: 1, dir: 1, speed: 92, len: 80, gap: 140 },
        { row: 2, dir: -1, speed: 108, len: 80, gap: 138 },
        { row: 3, dir: 1, speed: 126, len: 80, gap: 136 },
        { row: 5, dir: -1, speed: 138, len: 70, gap: 140 },
        { row: 6, dir: 1, speed: 96, len: 62, gap: 158 },
        { row: 6, dir: -1, speed: 150, len: 70, gap: 136 },
        { row: 7, dir: 1, speed: 166, len: 80, gap: 136 },
      ],
      starTimes: [78, 114, 162],
    },
    {
      id: "c11", labelKey: "croL11",
      lanes: [
        { row: 1, dir: 1, speed: 50, len: 88, gap: 152 },
        { row: 2, dir: -1, speed: 52, len: 76, gap: 152 },
        { row: 3, dir: -1, speed: 48, len: 98, gap: 168 },
        { row: 5, dir: 1, speed: 56, len: 94, gap: 154 },
        { row: 6, dir: 1, speed: 56, len: 80, gap: 160 },
        { row: 7, dir: -1, speed: 58, len: 92, gap: 174 },
      ],
      starTimes: [78, 117, 160],
    },
    {
      id: "c12", labelKey: "croL12",
      lanes: [
        { row: 1, dir: -1, speed: 62, len: 76, gap: 150 },
        { row: 2, dir: 1, speed: 56, len: 86, gap: 164 },
        { row: 3, dir: 1, speed: 56, len: 84, gap: 146 },
        { row: 5, dir: 1, speed: 58, len: 72, gap: 164 },
        { row: 6, dir: 1, speed: 70, len: 72, gap: 158 },
        { row: 7, dir: -1, speed: 58, len: 76, gap: 172 },
      ],
      starTimes: [84, 125, 171],
    },
    {
      id: "c13", labelKey: "croL13",
      lanes: [
        { row: 1, dir: 1, speed: 66, len: 98, gap: 146 },
        { row: 2, dir: -1, speed: 66, len: 96, gap: 144 },
        { row: 3, dir: 1, speed: 82, len: 94, gap: 146 },
        { row: 5, dir: -1, speed: 74, len: 92, gap: 144 },
        { row: 6, dir: -1, speed: 66, len: 88, gap: 146 },
        { row: 7, dir: -1, speed: 80, len: 88, gap: 148 },
        { row: 6, dir: 1, speed: 78, len: 74, gap: 142 },
      ],
      starTimes: [89, 134, 182],
    },
    {
      id: "c14", labelKey: "croL14",
      lanes: [
        { row: 1, dir: -1, speed: 72, len: 94, gap: 160 },
        { row: 2, dir: 1, speed: 70, len: 94, gap: 160 },
        { row: 3, dir: 1, speed: 72, len: 98, gap: 144 },
        { row: 5, dir: -1, speed: 90, len: 88, gap: 158 },
        { row: 6, dir: 1, speed: 78, len: 76, gap: 158 },
        { row: 7, dir: 1, speed: 82, len: 76, gap: 152 },
        { row: 6, dir: -1, speed: 114, len: 76, gap: 138 },
      ],
      starTimes: [95, 142, 194],
    },
    {
      id: "c15", labelKey: "croL15",
      lanes: [
        { row: 1, dir: 1, speed: 90, len: 86, gap: 154 },
        { row: 2, dir: -1, speed: 92, len: 86, gap: 136 },
        { row: 3, dir: 1, speed: 84, len: 74, gap: 140 },
        { row: 5, dir: -1, speed: 94, len: 90, gap: 132 },
        { row: 6, dir: -1, speed: 92, len: 94, gap: 146 },
        { row: 7, dir: 1, speed: 96, len: 80, gap: 148 },
        { row: 6, dir: 1, speed: 126, len: 60, gap: 130 },
      ],
      starTimes: [100, 150, 205],
    },
    {
      id: "c16", labelKey: "croL16",
      lanes: [
        { row: 1, dir: -1, speed: 102, len: 74, gap: 140 },
        { row: 2, dir: -1, speed: 108, len: 94, gap: 124 },
        { row: 3, dir: 1, speed: 92, len: 92, gap: 130 },
        { row: 5, dir: -1, speed: 98, len: 72, gap: 142 },
        { row: 6, dir: 1, speed: 88, len: 72, gap: 138 },
        { row: 7, dir: -1, speed: 94, len: 90, gap: 128 },
        { row: 6, dir: -1, speed: 106, len: 64, gap: 146 },
      ],
      starTimes: [106, 158, 216],
    },
    {
      id: "c17", labelKey: "croL17",
      lanes: [
        { row: 1, dir: 1, speed: 114, len: 76, gap: 130 },
        { row: 2, dir: 1, speed: 120, len: 98, gap: 134 },
        { row: 3, dir: -1, speed: 106, len: 82, gap: 144 },
        { row: 5, dir: 1, speed: 102, len: 88, gap: 130 },
        { row: 6, dir: 1, speed: 122, len: 98, gap: 136 },
        { row: 7, dir: -1, speed: 110, len: 98, gap: 132 },
        { row: 6, dir: -1, speed: 104, len: 72, gap: 116 },
        { row: 2, dir: -1, speed: 140, len: 68, gap: 140 },
      ],
      starTimes: [111, 167, 228],
    },
    {
      id: "c18", labelKey: "croL18",
      lanes: [
        { row: 1, dir: -1, speed: 108, len: 76, gap: 114 },
        { row: 2, dir: 1, speed: 112, len: 80, gap: 118 },
        { row: 3, dir: -1, speed: 130, len: 76, gap: 132 },
        { row: 5, dir: -1, speed: 110, len: 94, gap: 120 },
        { row: 6, dir: 1, speed: 118, len: 82, gap: 142 },
        { row: 7, dir: -1, speed: 104, len: 76, gap: 112 },
        { row: 6, dir: -1, speed: 134, len: 66, gap: 124 },
        { row: 2, dir: -1, speed: 124, len: 68, gap: 108 },
      ],
      starTimes: [117, 175, 239],
    },
    {
      id: "c19", labelKey: "croL19",
      lanes: [
        { row: 1, dir: -1, speed: 138, len: 76, gap: 130 },
        { row: 2, dir: -1, speed: 112, len: 72, gap: 112 },
        { row: 3, dir: 1, speed: 130, len: 76, gap: 128 },
        { row: 5, dir: 1, speed: 136, len: 74, gap: 138 },
        { row: 6, dir: -1, speed: 136, len: 86, gap: 116 },
        { row: 7, dir: -1, speed: 136, len: 94, gap: 104 },
        { row: 6, dir: 1, speed: 130, len: 72, gap: 128 },
        { row: 2, dir: 1, speed: 140, len: 66, gap: 114 },
      ],
      starTimes: [122, 183, 250],
    },
    {
      id: "c20", labelKey: "croL20",
      lanes: [
        { row: 1, dir: -1, speed: 122, len: 98, gap: 132 },
        { row: 2, dir: -1, speed: 120, len: 98, gap: 120 },
        { row: 3, dir: -1, speed: 126, len: 78, gap: 124 },
        { row: 5, dir: -1, speed: 120, len: 94, gap: 98 },
        { row: 6, dir: 1, speed: 134, len: 80, gap: 108 },
        { row: 7, dir: -1, speed: 130, len: 98, gap: 134 },
        { row: 6, dir: -1, speed: 158, len: 66, gap: 102 },
        { row: 2, dir: 1, speed: 172, len: 76, gap: 96 },
      ],
      starTimes: [128, 191, 261],
    },

    /* ------------------------------------------------------------------
     * The deep tier (c21-c24). The second tier had taken the eight-lane
     * template as far as it would go - rows 6 and 2 running opposing
     * trains, a fastest lane of 172, a tightest gap of 96 - so this tier
     * breaks both floors at once: every rung carries nine lanes, a third
     * doubled row (row 7, then row 5) joining the shipped pair, and every
     * rung's fastest lane outruns the shipped ceiling while its tightest
     * gap dips under the shipped floor. As ever a ford ships only because
     * tools/crossing-forge.js proves it: each rung was laid against its
     * own brief (speed band, gap band, doubled rows) and ships because the
     * prover's breadth-first search over (pads, row, position, time) found
     * a route that stands on all four pads. The rungs sit in the order
     * that proof measured - the cleanest route lengthens from 2.85s to
     * 3.3s as the tier climbs - and the star bands are quoted from each
     * ford's own measured route at the forged half's own mean margin (48x
     * the prover's route; shipped rungs c11-c20 clear their three-star
     * line at 25x-65x), widened by the same 1.5x / 2.05x steps the shipped
     * rungs use.
     * ------------------------------------------------------------------ */
    /* Spring Tide: the third doubled row. The second tier split rows 6 and
     * 2 into opposing trains and topped out at eight lanes, so this rung
     * hangs the third train on row 7 - nine lanes, a first, and the first
     * road lane the frog meets now reads both ways from the opening hop.
     * The counter-trains come back at 138, 172 and 182, the fastest lane
     * yet, and row 6's 92 window dips under c20's 96 floor. */
    {
      id: "c21", labelKey: "croL21",
      lanes: [
        { row: 1, dir: 1, speed: 156, len: 74, gap: 114 },
        { row: 2, dir: -1, speed: 138, len: 96, gap: 96 },
        { row: 3, dir: -1, speed: 140, len: 82, gap: 114 },
        { row: 5, dir: -1, speed: 134, len: 90, gap: 112 },
        { row: 6, dir: -1, speed: 140, len: 72, gap: 100 },
        { row: 7, dir: -1, speed: 148, len: 80, gap: 112 },
        { row: 6, dir: 1, speed: 138, len: 76, gap: 92 },
        { row: 2, dir: 1, speed: 182, len: 70, gap: 128 },
        { row: 7, dir: 1, speed: 172, len: 66, gap: 98 },
      ],
      starTimes: [137, 205, 280],
    },
    /* The Maelstrom: no relief lane. c21 still let one counter-train lope
     * along at 138; every cross train here is express - 174, 178, 184 - and
     * every base lane holds 134 or better, the pace c20's quickest base
     * lane ran at, so there is nowhere on the board to watch a cycle go
     * by. The 184 on row 7 is the fastest lane yet, and row 2's 94 gap
     * keeps the rung under the shipped floor. */
    {
      id: "c22", labelKey: "croL22",
      lanes: [
        { row: 1, dir: -1, speed: 134, len: 78, gap: 118 },
        { row: 2, dir: -1, speed: 160, len: 98, gap: 120 },
        { row: 3, dir: 1, speed: 134, len: 78, gap: 120 },
        { row: 5, dir: 1, speed: 154, len: 86, gap: 104 },
        { row: 6, dir: -1, speed: 160, len: 98, gap: 104 },
        { row: 7, dir: -1, speed: 156, len: 94, gap: 112 },
        { row: 6, dir: 1, speed: 178, len: 74, gap: 126 },
        { row: 2, dir: 1, speed: 174, len: 74, gap: 94 },
        { row: 7, dir: 1, speed: 184, len: 70, gap: 100 },
      ],
      starTimes: [139, 209, 285],
    },
    /* The Overflow: the doubled row moves to the median. The third train
     * leaves row 7 for row 5, the last road lane before the water, so the
     * both-ways street now sits exactly where the frog lines up its river
     * entry - and its 88 gap is the tightest window the ladder has asked
     * for. The fastest lane yet (196) rides row 2's counter-train, so the
     * rung's top speed is a river lane, not a road train. */
    {
      id: "c23", labelKey: "croL23",
      lanes: [
        { row: 1, dir: 1, speed: 152, len: 100, gap: 92 },
        { row: 2, dir: -1, speed: 144, len: 92, gap: 112 },
        { row: 3, dir: -1, speed: 138, len: 78, gap: 96 },
        { row: 5, dir: -1, speed: 156, len: 88, gap: 94 },
        { row: 6, dir: -1, speed: 170, len: 100, gap: 92 },
        { row: 7, dir: -1, speed: 170, len: 84, gap: 98 },
        { row: 6, dir: 1, speed: 156, len: 66, gap: 124 },
        { row: 2, dir: 1, speed: 196, len: 72, gap: 114 },
        { row: 5, dir: 1, speed: 154, len: 66, gap: 88 },
      ],
      starTimes: [144, 216, 295],
    },
    /* The Washout: the board shears. All three river base lanes run right
     * at 160-176 while all three road base lanes run left - a tide-race
     * split the full width of the ford, the first in the campaign - and
     * the counter-trains thread it at 166, 180 and 198, 198 the fastest
     * lane the deep tier ships. Row 5's 86 window and the tier's longest
     * clean route close the tier. */
    {
      id: "c24", labelKey: "croL24",
      lanes: [
        { row: 1, dir: 1, speed: 166, len: 82, gap: 110 },
        { row: 2, dir: 1, speed: 160, len: 70, gap: 100 },
        { row: 3, dir: 1, speed: 176, len: 74, gap: 100 },
        { row: 5, dir: -1, speed: 158, len: 86, gap: 86 },
        { row: 6, dir: -1, speed: 150, len: 78, gap: 88 },
        { row: 7, dir: -1, speed: 162, len: 94, gap: 88 },
        { row: 6, dir: 1, speed: 198, len: 62, gap: 100 },
        { row: 2, dir: -1, speed: 180, len: 72, gap: 104 },
        { row: 5, dir: 1, speed: 166, len: 62, gap: 116 },
      ],
      starTimes: [158, 238, 325],
    },

    /* ------------------------------------------------------------------
     * The summit tier (c25-c30). The deep tier had doubled three rows on
     * every rung - two mirrored streets (6 and 7, then 6 and 5) plus row
     * 2's river counter-train - so one street was always left quiet, and
     * the summit closes it: every rung mirrors all three streets at once,
     * rows 5, 6 and 7 each running two ways on top of row 2's river
     * train. Ten lanes a rung - the first double-digit ford - while the
     * brief bands keep tightening rung over rung (140/182/80/104 opens,
     * 166/208/72/86 closes) and every rung's fastest lane outruns the
     * deep summit's 198 while its tightest gap dips under the deep
     * summit's 86. As ever a ford ships only because
     * tools/crossing-forge.js proves it: each rung was laid against its
     * own brief at the seed the brief pins, and ships because the
     * prover's breadth-first search over (pads, row, position, time)
     * found a route that stands on all four pads. The rungs sit in the
     * order that proof measured - the cleanest route lengthens 3.35s ->
     * 3.7s -> 3.8s -> 4.3s -> 4.65s -> 5.25s, every one past c24's 3.3s -
     * and the star bands are quoted from each ford's own measured route
     * at the deep tier's own margin (48x the prover's route), widened by
     * the same 1.5x / 2.05x steps. The mirrored streets are load-bearing
     * by ablation: pull the row-7 train from the shipped lanes - the
     * street the deep summit itself left quiet - and the same seeds hand
     * the street back its breathing room, the prover's own lethal() law
     * measuring row 7's rest moments rising by 16,500 to 21,796 over the
     * same thirty simulated seconds, while the nine-lane twin's cleanest
     * route collapses to 33t-67t against the shipped 67t-105t. Every
     * number was measured through the forge; nothing here is hand-tuned.
     * ------------------------------------------------------------------ */
    /* The Last Quiet Street: row 7 - quiet since The Overflow - runs both
     * ways at the deep summit's own working tempo. The counter-trains
     * come back at 200, 192 and 170, and the ford's cleanest route steps
     * past the deep summit's own for the first time. */
    {
      id: "c25", labelKey: "croL25",
      lanes: [
        { row: 1, dir: 1, speed: 158, len: 100, gap: 92 },
        { row: 2, dir: 1, speed: 174, len: 88, gap: 90 },
        { row: 3, dir: -1, speed: 164, len: 92, gap: 98 },
        { row: 5, dir: 1, speed: 160, len: 88, gap: 100 },
        { row: 6, dir: 1, speed: 144, len: 92, gap: 98 },
        { row: 7, dir: 1, speed: 162, len: 84, gap: 100 },
        { row: 6, dir: -1, speed: 200, len: 68, gap: 76 },
        { row: 2, dir: -1, speed: 174, len: 76, gap: 80 },
        { row: 7, dir: -1, speed: 192, len: 70, gap: 106 },
        { row: 5, dir: -1, speed: 170, len: 70, gap: 78 },
      ],
      starTimes: [161, 241, 330],
    },
    /* Rush Hour: every street now runs an express. The counter-trains
     * read 188, 214 and 178, the base lanes hold 156 or better on every
     * row, and row 2's 208 counter-train is the fastest river lane yet
     * fielded. */
    {
      id: "c26", labelKey: "croL26",
      lanes: [
        { row: 1, dir: -1, speed: 158, len: 80, gap: 92 },
        { row: 2, dir: 1, speed: 166, len: 94, gap: 92 },
        { row: 3, dir: 1, speed: 164, len: 78, gap: 88 },
        { row: 5, dir: -1, speed: 156, len: 100, gap: 84 },
        { row: 6, dir: -1, speed: 160, len: 72, gap: 80 },
        { row: 7, dir: -1, speed: 156, len: 74, gap: 92 },
        { row: 6, dir: 1, speed: 188, len: 66, gap: 104 },
        { row: 2, dir: -1, speed: 208, len: 70, gap: 80 },
        { row: 7, dir: 1, speed: 214, len: 70, gap: 80 },
        { row: 5, dir: 1, speed: 178, len: 72, gap: 76 },
      ],
      starTimes: [178, 266, 364],
    },
    /* Crosscurrent: the tightest street yet - row 7 and its counter-train
     * both close to 78, the narrowest windows the ladder ships - and the
     * first 200-plus pace on a street train, row 6's counter at 202. The
     * cleanest route is already half a second longer than c24's. */
    {
      id: "c27", labelKey: "croL27",
      lanes: [
        { row: 1, dir: -1, speed: 166, len: 84, gap: 82 },
        { row: 2, dir: -1, speed: 178, len: 92, gap: 90 },
        { row: 3, dir: 1, speed: 186, len: 80, gap: 88 },
        { row: 5, dir: 1, speed: 156, len: 74, gap: 96 },
        { row: 6, dir: 1, speed: 192, len: 96, gap: 86 },
        { row: 7, dir: -1, speed: 180, len: 80, gap: 78 },
        { row: 6, dir: -1, speed: 202, len: 66, gap: 78 },
        { row: 2, dir: 1, speed: 164, len: 74, gap: 92 },
        { row: 7, dir: 1, speed: 194, len: 64, gap: 92 },
        { row: 5, dir: -1, speed: 218, len: 76, gap: 86 },
      ],
      starTimes: [182, 274, 374],
    },
    /* The Double Tide: the bands step past the deep summit's ceiling for
     * good - 154/196 opens, every base lane 162 or better - and row 2's
     * 212 counter-train carries the fastest river lane into the summit's
     * second half. */
    {
      id: "c28", labelKey: "croL28",
      lanes: [
        { row: 1, dir: -1, speed: 178, len: 74, gap: 88 },
        { row: 2, dir: 1, speed: 166, len: 82, gap: 82 },
        { row: 3, dir: 1, speed: 180, len: 98, gap: 94 },
        { row: 5, dir: 1, speed: 192, len: 82, gap: 82 },
        { row: 6, dir: 1, speed: 162, len: 88, gap: 78 },
        { row: 7, dir: 1, speed: 170, len: 86, gap: 92 },
        { row: 6, dir: -1, speed: 198, len: 76, gap: 82 },
        { row: 2, dir: -1, speed: 212, len: 64, gap: 76 },
        { row: 7, dir: -1, speed: 208, len: 68, gap: 88 },
        { row: 5, dir: -1, speed: 196, len: 64, gap: 88 },
      ],
      starTimes: [206, 310, 423],
    },
    /* The Riptide: the pace record falls twice - row 1's base lanes at
     * 196 and row 5's counter-train at 220, the fastest street lane yet
     * shipped - while row 1's 76 window is the tightest the ladder has
     * asked for. */
    {
      id: "c29", labelKey: "croL29",
      lanes: [
        { row: 1, dir: 1, speed: 196, len: 88, gap: 76 },
        { row: 2, dir: -1, speed: 200, len: 96, gap: 84 },
        { row: 3, dir: 1, speed: 168, len: 74, gap: 88 },
        { row: 5, dir: -1, speed: 190, len: 80, gap: 88 },
        { row: 6, dir: -1, speed: 192, len: 98, gap: 82 },
        { row: 7, dir: 1, speed: 196, len: 86, gap: 86 },
        { row: 6, dir: 1, speed: 202, len: 72, gap: 84 },
        { row: 2, dir: 1, speed: 176, len: 58, gap: 86 },
        { row: 7, dir: -1, speed: 218, len: 70, gap: 92 },
        { row: 5, dir: 1, speed: 220, len: 66, gap: 92 },
      ],
      starTimes: [223, 335, 458],
    },
    /* The Flood: the summit. Ten lanes a ford, a 234 counter-train - the
     * fastest lane the campaign has ever fielded - a 72 window, the
     * tightest in the ladder, and the longest clean route the prover has
     * measured: 5.25s where the deep summit closed at 3.3s. */
    {
      id: "c30", labelKey: "croL30",
      lanes: [
        { row: 1, dir: 1, speed: 204, len: 80, gap: 74 },
        { row: 2, dir: 1, speed: 196, len: 100, gap: 84 },
        { row: 3, dir: 1, speed: 200, len: 84, gap: 84 },
        { row: 5, dir: 1, speed: 196, len: 98, gap: 78 },
        { row: 6, dir: -1, speed: 192, len: 78, gap: 78 },
        { row: 7, dir: 1, speed: 208, len: 80, gap: 74 },
        { row: 6, dir: 1, speed: 190, len: 66, gap: 82 },
        { row: 2, dir: -1, speed: 230, len: 70, gap: 88 },
        { row: 7, dir: -1, speed: 234, len: 60, gap: 72 },
        { row: 5, dir: -1, speed: 214, len: 74, gap: 86 },
      ],
      starTimes: [252, 378, 517],
    },
  ];
  var STREAK_COLORS = ["#f472b6", "#fb7185", "#fbbf24", "#a78bfa"];

  function initGlyphCrossingGame() {
    var canvas = getElement("croCanvas");
    var livesEl = getElement("croLives");
    var padsEl = getElement("croPads");
    var timeEl = getElement("croTime");
    var resultEl = getElement("croResult");
    var startBtn = getElement("croStartBtn");
    var bestEl = getElement("croBest");
    var selectEl = getElement("croLevelSel");
    var btnUp = getElement("croUp");
    var btnDown = getElement("croDown");
    var btnLeft = getElement("croLeft");
    var btnRight = getElement("croRight");
    if (
      !canvas ||
      !livesEl ||
      !padsEl ||
      !timeEl ||
      !resultEl ||
      !startBtn ||
      !bestEl ||
      !selectEl ||
      !btnUp ||
      !btnDown ||
      !btnLeft ||
      !btnRight
    ) {
      return;
    }

    var ctx = canvas.getContext("2d");
    var campaign = createCampaign({ key: "glyph-crossing-campaign", levels: croLevels });
    var level = croLevels[0];
    var props = [];
    var pads = {};
    var frog = { x: 0, y: 0, row: 8, hop: 0 };
    var lives = 3;
    var flying = false;
    var dead = false;
    var rafId = null;
    var lastFrame = 0;
    var startedAt = 0;
    var respawnId = null;

    function renderHud() {
      livesEl.textContent = "\u2665".repeat(Math.max(0, lives));
      padsEl.textContent =
        PAD_COLS.filter(function (col) {
          return pads[col];
        }).length + "/" + PAD_COLS.length;
      timeEl.textContent = flying
        ? ((Date.now() - startedAt) / 1000).toFixed(1) + "s"
        : timeEl.textContent;
    }

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

    function spawnProps() {
      props = [];
      level.lanes.forEach(function (lane, laneIndex) {
        var span = lane.len + lane.gap;
        var count = Math.ceil((croWidth + span) / span) + 1;
        for (var index = 0; index < count; index += 1) {
          props.push({
            lane: laneIndex,
            row: lane.row,
            dir: lane.dir,
            speed: lane.speed,
            len: lane.len,
            cycle: count * span,
            x: index * span + (laneIndex * 53) % span,
            color: STREAK_COLORS[(laneIndex + index) % STREAK_COLORS.length],
          });
        }
      });
    }

    function loadLevel(levelDef) {
      stopLoop();
      window.clearTimeout(respawnId);
      respawnId = null;
      level = levelDef;
      pads = {};
      lives = 3;
      flying = false;
      dead = false;
      resetFrog();
      spawnProps();
      renderHud();
      refreshPicker();
      draw();
      resultEl.textContent = t("croReady", { n: PAD_COLS.length });
    }

    function startRun() {
      if (flying) {
        return;
      }
      window.clearTimeout(respawnId);
      respawnId = null;
      pads = {};
      lives = 3;
      dead = false;
      resetFrog();
      spawnProps();
      flying = true;
      startedAt = Date.now();
      resultEl.textContent = t("croGo");
      renderHud();
      canvas.focus();
      startLoop();
    }

    function resetFrog() {
      frog = { x: croCell * 3 + croCell / 2, y: 0, row: 8, hop: 0 };
      frog.y = frog.row * croCell + croCell / 2;
    }

    function die(reason) {
      lives -= 1;
      renderHud();
      resultEl.textContent =
        (reason === "water" ? t("croSplashed") : t("croSquashed")) +
        " " +
        t("croTryAgain");
      if (lives <= 0) {
        flying = false;
        resultEl.textContent = t("croLost") + " " + t("croRetryRun");
        return;
      }
      dead = true;
      respawnId = window.setTimeout(function () {
        respawnId = null;
        if (!dead || !flying) {
          return;
        }
        dead = false;
        resetFrog();
        draw();
      }, 550);
    }

    function fordCleared() {
      flying = false;
      var seconds = Math.max(0.1, (Date.now() - startedAt) / 1000);
      var starsWon = starsFor(Math.round(seconds * 10) / 10, level.starTimes, "low");
      var outcome = campaign.record(level.id, {
        stars: starsWon,
        best: Math.round(seconds * 10) / 10,
        better: "low",
      });
      var message = t("croCleared", { s: seconds.toFixed(1), stars: starsWon });
      if (outcome.isBest) {
        message += " " + t("newBest");
      }
      if (outcome.unlockedNext) {
        message += " " + t("croNextFord");
      } else if (campaign.clearedCount() === croLevels.length) {
        message += " " + t("croCampaignDone");
      }
      logAction(t("logGlyphCrossing", { n: PAD_COLS.length }));
      var rect = startBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      var nextId = outcome.unlockedNext || level.id;
      loadLevel(croLevels[campaign.indexOf(nextId)]);
      resultEl.textContent = message;
    }

    function hop(dx, dy) {
      if (!flying || dead) {
        return;
      }
      var nextRow = frog.row + dy;
      if (nextRow < 0 || nextRow > 8) {
        return;
      }
      var nextX = frog.x + dx * croCell;
      if (nextX < croCell / 2 || nextX > croWidth - croCell / 2) {
        return;
      }
      if (nextRow === 0) {
        var col = Math.round((nextX - croCell / 2) / croCell);
        if (PAD_COLS.indexOf(col) === -1 || pads[col]) {
          return;
        }
      }
      frog.row = nextRow;
      frog.x = nextX;
      frog.hop = 1;
      /* Landing on a pad wins it. */
      if (frog.row === 0) {
        var padCol = Math.round((frog.x - croCell / 2) / croCell);
        pads[padCol] = true;
        renderHud();
        if (PAD_COLS.every(function (col2) { return pads[col2]; })) {
          fordCleared();
          return;
        }
        resetFrog();
      }
    }

    function update(dt) {
      /* Find support before moving the logs, then carry the frog with it.
       * Checking its old position against moved logs drops trailing-edge riders. */
      var riding = null;
      if (flying && !dead && RIVER_ROWS.indexOf(frog.row) !== -1) {
        props.forEach(function (prop) {
          if (prop.row === frog.row && frog.x > prop.x && frog.x < prop.x + prop.len) {
            riding = prop;
          }
        });
      }
      level.lanes.forEach(function (lane, laneIndex) {
        props.forEach(function (prop) {
          if (prop.lane !== laneIndex) {
            return;
          }
          prop.x += prop.dir * prop.speed * dt;
          /* Wrap the whole train, preserving the gap between neighbouring
           * vehicles/logs instead of piling each one onto the next. */
          if (prop.dir > 0 && prop.x > croWidth + 20) {
            prop.x -= prop.cycle;
          } else if (prop.dir < 0 && prop.x + prop.len < -20) {
            prop.x += prop.cycle;
          }
        });
      });
      if (!flying || dead) {
        return;
      }
      var lane = null;
      level.lanes.forEach(function (l) {
        if (l.row === frog.row) {
          lane = l;
        }
      });
      var river = RIVER_ROWS.indexOf(frog.row) !== -1;
      var road = ROAD_ROWS.indexOf(frog.row) !== -1;
      if (river && lane) {
        /* Ride a log or drown. */
        if (!riding) {
          die("water");
          return;
        }
        frog.x += riding.dir * riding.speed * dt;
        if (frog.x < croCell / 2 || frog.x > croWidth - croCell / 2) {
          die("water");
          return;
        }
      } else if (road) {
        var hit = false;
        props.forEach(function (prop) {
          if (
            prop.row === frog.row &&
            frog.x > prop.x - 12 &&
            frog.x < prop.x + prop.len + 12
          ) {
            hit = true;
          }
        });
        if (hit) {
          die("car");
          return;
        }
      }
      if (frog.hop > 0) {
        frog.hop = Math.max(0, frog.hop - dt * 4);
      }
    }

    function draw() {
      var time = Date.now();
      ctx.clearRect(0, 0, croWidth, croHeight);
      if (App.world) { App.world.backdrop(ctx, croWidth, croHeight, "forest"); }
      /* Bank bands */
      ctx.fillStyle = "rgba(30, 41, 59, 0.55)";
      ctx.fillRect(0, 0, croWidth, croCell);
      ctx.fillRect(0, 4 * croCell, croWidth, croCell);
      ctx.fillRect(0, 8 * croCell, croWidth, croCell);
      /* River wash */
      ctx.fillStyle = "rgba(14, 42, 64, 0.85)";
      ctx.fillRect(0, croCell, croWidth, croCell * 3);
      for (var wave = 0; wave < 12; wave += 1) {
        var wy = croCell + 8 + wave * 9.6;
        ctx.fillStyle = "rgba(34, 211, 238, 0.07)";
        var off = (time / 26 + wave * 31) % (croWidth + 60) - 30;
        ctx.fillRect(off, wy, 26, 2);
        ctx.fillRect(croWidth - off, wy + 4, 20, 2);
      }
      /* Road */
      ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
      ctx.fillRect(0, 5 * croCell, croWidth, croCell * 3);
      ctx.strokeStyle = "rgba(148, 163, 184, 0.25)";
      ctx.setLineDash([10, 12]);
      for (var line = 6; line <= 7; line += 1) {
        ctx.beginPath();
        ctx.moveTo(0, line * croCell + 0.5);
        ctx.lineTo(croWidth, line * croCell + 0.5);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      /* Pads */
      PAD_COLS.forEach(function (col, index) {
        var x = col * croCell + croCell / 2;
        var y = croCell / 2;
        ctx.beginPath();
        ctx.arc(x, y, 13, 0, Math.PI * 2);
        if (pads[col]) {
          ctx.fillStyle = "#a3e635";
          ctx.shadowColor = "#a3e635";
          ctx.shadowBlur = 12;
          ctx.fill();
        } else {
          ctx.strokeStyle = "rgba(163, 230, 53, " + (0.45 + 0.3 * Math.sin(time / 260 + index)) + ")";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        ctx.shadowBlur = 0;
      });
      /* Props */
      props.forEach(function (prop) {
        var y = prop.row * croCell + croCell / 2;
        if (prop.row <= 3) {
          /* Log: amber ink bar */
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(prop.x, y - 12, prop.len, 24, 10);
          } else {
            ctx.rect(prop.x, y - 12, prop.len, 24);
          }
          ctx.fillStyle = "rgba(251, 191, 36, 0.85)";
          ctx.shadowColor = "#fbbf24";
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.fillStyle = "rgba(15, 23, 42, 0.35)";
          ctx.fillRect(prop.x + 8, y - 3, prop.len - 16, 6);
        } else {
          /* Streak: neon racer */
          var grad = ctx.createLinearGradient(prop.x, y, prop.x + prop.len, y);
          grad.addColorStop(0, "rgba(0,0,0,0)");
          grad.addColorStop(0.35, prop.color);
          grad.addColorStop(1, prop.color);
          ctx.fillStyle = grad;
          ctx.shadowColor = prop.color;
          ctx.shadowBlur = 12;
          if (ctx.roundRect) {
            ctx.roundRect(prop.x, y - 9, prop.len, 18, 8);
          } else {
            ctx.rect(prop.x, y - 9, prop.len, 18);
          }
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
          var headX = prop.dir > 0 ? prop.x + prop.len - 12 : prop.x + 6;
          ctx.fillRect(headX, y - 5, 6, 10);
        }
      });
      /* Frog */
      if (!(dead && lives > 0)) {
        var squash = 1 + frog.hop * 0.25;
        ctx.save();
        ctx.translate(frog.x, frog.row * croCell + croCell / 2);
        ctx.scale(1, squash);
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fillStyle = "#4ade80";
        ctx.shadowColor = "#4ade80";
        ctx.shadowBlur = 14;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#101426";
        ctx.beginPath();
        ctx.arc(-4, -3, 2.2, 0, Math.PI * 2);
        ctx.arc(4, -3, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    function frame(now) {
      if (rafId === null) {
        return;
      }
      rafId = null;
      var dt = Math.min(0.032, (now - lastFrame) / 1000 || 0.016);
      lastFrame = now;
      if (document.getElementById("gamePanelGlyphCrossing").hidden || document.hidden) {
        rafId = window.requestAnimationFrame(frame);
        return;
      }
      update(dt);
      draw();
      if (flying) {
        renderHud();
      }
      if (flying) {
        rafId = window.requestAnimationFrame(frame);
      }
    }

    function stopLoop() {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
    }

    function startLoop() {
      if (rafId !== null) {
        return;
      }
      lastFrame = performance.now();
      rafId = window.requestAnimationFrame(frame);
    }

    var KEYMAP = {
      ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
      w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
    };

    canvas.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        startRun();
        return;
      }
      var move = KEYMAP[event.key];
      if (move) {
        event.preventDefault();
        hop(move[0], move[1]);
      }
    });

    [["croUp", 0, -1], ["croDown", 0, 1], ["croLeft", -1, 0], ["croRight", 1, 0]].forEach(
      function (spec) {
        getElement(spec[0]).addEventListener("click", function () {
          hop(spec[1], spec[2]);
        });
      },
    );

    selectEl.addEventListener("change", function () {
      var index = campaign.indexOf(selectEl.value);
      if (index >= 0 && campaign.isUnlocked(selectEl.value)) {
        loadLevel(croLevels[index]);
      }
    });

    startBtn.addEventListener("click", startRun);

    App.quietResetGlyphCrossing = function () {
      stopLoop();
      window.clearTimeout(respawnId);
      respawnId = null;
      if (flying) {
        flying = false;
        resultEl.textContent = t("croPaused");
      }
    };

    loadLevel(croLevels[campaign.indexOf(campaign.nextLevelId())]);
  }


  /* Exported for the other modules. */
  App.initGlyphCrossingGame = initGlyphCrossingGame;

  /* Bilingual copy travels with the game: addStrings only fills keys i18n.js
   * does not already hold, so the shared dictionary stays the authority for
   * the drawer chrome and the first twenty rung names. The deep tier's four
   * names and the summit's six are new here - the shared dictionary stops at
   * croL20 - so they travel with the module. */
  App.addStrings({
    en: {
      "croL10": "Two-Way Street",
      "croL21": "Spring Tide",
      "croL22": "The Maelstrom",
      "croL23": "The Overflow",
      "croL24": "The Washout",
      "croL25": "The Last Quiet Street",
      "croL26": "Rush Hour",
      "croL27": "Crosscurrent",
      "croL28": "The Double Tide",
      "croL29": "The Riptide",
      "croL30": "The Flood",
    },
    zh: {
      "croL10": "双向街",
      "croL21": "大潮",
      "croL22": "大漩涡",
      "croL23": "漫堤",
      "croL24": "决堤",
      "croL25": "最后的静街",
      "croL26": "晚高峰",
      "croL27": "逆流",
      "croL28": "双潮",
      "croL29": "裂流",
      "croL30": "大洪水",
    },
  });
})(window.CapitalConvert = window.CapitalConvert || {});
