/* Loopwright - program the worker, then loop it.
 * A tiny deterministic robot sim: the player writes up to eight instructions,
 * runs them, and every finished run leaves a GHOST that replays the same walk
 * beside the next one, so the worker can open doors for itself by standing
 * where it once stood. Levels are authored WITH their solution programs and
 * validated at deal time, so no floor can be unwinnable. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  var t = App.t;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  var createCampaign = App.createCampaign;
  var fillCampaignPicker = App.fillCampaignPicker;
  var starsFor = App.starsFor;

  var lpwSize = 8;
  var lpwCell = 40;
  var lpwSlots = 8;
  var lpwStepMs = 240;
  var lpwBudget = 64;
  var lpwDirs = [
    { dx: 0, dy: -1, name: "N" },
    { dx: 1, dy: 0, name: "E" },
    { dx: 0, dy: 1, name: "S" },
    { dx: -1, dy: 0, name: "W" },
  ];
  var lpwOps = [
    { code: "F", keyName: "lpwOpF" },
    { code: "B", keyName: "lpwOpB" },
    { code: "L", keyName: "lpwOpL" },
    { code: "R", keyName: "lpwOpR" },
    { code: "P", keyName: "lpwOpP" },
    { code: "G", keyName: "lpwOpG" },
    { code: "D", keyName: "lpwOpD" },
    { code: "W", keyName: "lpwOpW" },
    { code: "J", keyName: "lpwOpJ" },
  ];

  /* Every floor ships with the run list that clears it; lpwSolved replays
   * that list at load time and the par band is read off its length. */
  var lpwFloors = [
    {
      id: "f1", labelKey: "lpwF1",
      map: ["########",
            "#......#",
            "#.G....#",
            "#......#",
            "#......#",
            "#......#",
            "#.W....#",
            "########"],
      doorPlates: [], pistonOffsets: [],
      programs: [["F", "F", "F", "F"]],
    },
    {
      id: "f2", labelKey: "lpwF2",
      map: ["########",
            "#......#",
            "#......#",
            "#..P...#",
            "#..CG..#",
            "#......#",
            "#.W....#",
            "########"],
      doorPlates: [], pistonOffsets: [],
      programs: [["R", "F", "L", "F", "P", "R", "F"]],
    },
    {
      id: "f3", labelKey: "lpwF3",
      map: ["########",
            "#...G..#",
            "#...D..#",
            "#......#",
            "#......#",
            "#P..W..#",
            "#......#",
            "########"],
      doorPlates: [0], pistonOffsets: [],
      programs: [["L", "F", "F", "F"], ["F", "W", "W", "F", "F", "F"]],
    },
    {
      id: "f4", labelKey: "lpwF4",
      map: ["########",
            "#.G....#",
            "#.D....#",
            "#.P....#",
            "#......#",
            "#.D....#",
            "#PW....#",
            "########"],
      doorPlates: [0, 1], pistonOffsets: [],
      programs: [
        ["L", "F"],
        ["W", "W", "F", "F", "F"],
        ["W", "W", "F", "F", "W", "F", "F", "F"],
      ],
    },
    {
      id: "f5", labelKey: "lpwF5",
      map: ["########",
            "#.....G#",
            "#.....D#",
            "#......#",
            "#....PS#",
            "#.....W#",
            "#......#",
            "########"],
      doorPlates: [0], pistonOffsets: [],
      programs: [["G", "F", "L", "F", "D"], ["F", "W", "F", "W", "F", "F"]],
    },
    {
      id: "f6", labelKey: "lpwF6",
      map: ["########",
            "#......#",
            "#.GP...#",
            "#.D....#",
            "#.TC...#",
            "#.D....#",
            "#PW....#",
            "########"],
      doorPlates: [0, 1], pistonOffsets: [1],
      programs: [
        ["L", "F"],
        ["R", "F", "L", "F", "P", "P"],
        ["W", "W", "F", "W", "F", "W", "F", "F"],
      ],
    },
    /* The floor rewinds its crate between runs, but run one's ghost keeps the
     * crate it pushed parked on the plate, so the plate stays held. */
    {
      id: "f7", labelKey: "lpwF7",
      map: ["########",
            "#...G..#",
            "#..PD..#",
            "#..P...#",
            "#..C...#",
            "#..W...#",
            "#......#",
            "########"],
      doorPlates: [1], pistonOffsets: [],
      programs: [
        ["P"],
        ["P", "P", "R", "F", "L", "F", "F"],
      ],
    },
    /* The plate is five steps from the start and the door is one, so the door
     * only opens once the ghost has finished walking: waits are the clock. */
    {
      id: "f8", labelKey: "lpwF8",
      map: ["########",
            "#P.....#",
            "#......#",
            "#......#",
            "#......#",
            "#......#",
            "#WDG...#",
            "########"],
      doorPlates: [0], pistonOffsets: [],
      programs: [
        ["F", "F", "F", "F", "F"],
        ["R", "W", "W", "W", "W", "F", "F"],
      ],
    },
    /* Three doors, two plates: the top and bottom door are wired to the same
     * plate, so one parked ghost is enough for both of them. */
    {
      id: "f9", labelKey: "lpwF9",
      map: ["########",
            "#..G...#",
            "###D####",
            "###D####",
            "###D####",
            "#..P...#",
            "#.PW...#",
            "########"],
      doorPlates: [0, 1, 0], pistonOffsets: [],
      programs: [
        ["F"],
        ["L", "F"],
        ["F", "F", "F", "F", "F"],
      ],
    },
    /* Four plates, one pad, two shifts: every run leaves both its own body on
     * a plate and the pad it carried on another one. */
    {
      id: "f10", labelKey: "lpwF10",
      map: ["########",
            "#..G...#",
            "#..D...#",
            "#..P...#",
            "#P.P...#",
            "#P.S...#",
            "#..W...#",
            "########"],
      doorPlates: [2], pistonOffsets: [],
      programs: [
        ["G", "F", "F", "D", "F"],
        ["G", "F", "L", "F", "F", "D", "R", "F"],
        ["W", "W", "W", "F", "F", "F", "F", "F"],
      ],
    },
    /* Two crates and two pressure doors: each side must be cleared and parked
     * on its plate before the center corridor unlocks for the final dash. */
    {
      id: "f11", labelKey: "lpwF11",
      map: ["########",
            "#..G...#",
            "#..D...#",
            "#..D...#",
            "#P...P.#",
            "#C...C.#",
            "#..W...#",
            "########"],
      doorPlates: [1, 0], pistonOffsets: [],
      programs: [
        ["L", "F", "F", "R", "P"],
        ["R", "F", "F", "L", "P"],
        ["W", "W", "W", "F", "F", "F", "F", "F"],
      ],
    },
    /* Symmetric pad relay: each wing carries its portable pressure pad and drops
     * it onto the matching terminal, clearing the twin security airlock. */
    {
      id: "f12", labelKey: "lpwF12",
      map: ["########",
            "#...G..#",
            "#...D..#",
            "#...D..#",
            "#......#",
            "#.PSWSP#",
            "#......#",
            "########"],
      doorPlates: [0, 1], pistonOffsets: [],
      programs: [
        ["L", "G", "F", "F", "D"],
        ["R", "G", "F", "F", "D"],
        ["W", "W", "W", "W", "F", "F", "F", "F"],
      ],
    },
    /* Citadel gate: three coordinated ghost workers hold the outer, middle, and
     * inner pressure contacts before the runner sprints the final straight. */
    {
      id: "f13", labelKey: "lpwF13",
      map: ["########",
            "#...G..#",
            "#...D..#",
            "#...D..#",
            "#...D..#",
            "#P.PWP.#",
            "#......#",
            "########"],
      doorPlates: [0, 1, 2], pistonOffsets: [],
      programs: [
        ["L", "F", "F", "F"],
        ["R", "F"],
        ["L", "F"],
        ["W", "W", "W", "W", "F", "F", "F", "F"],
      ],
    },
    /* Floors 14-20. The first thirteen teach the verbs - fork, plate, pad,
     * piston, relay - so these seven put them to work in longer rooms. f14-f16
     * are pure navigation (no door to open, just read the corridor), f17 opens
     * the first plate-and-door relay, and f18-f20 stack a plate behind a door
     * that only stays open because a parked run keeps its foot on the switch.
     * Every floor was walked by its own shipped runs in tools/loopwright-forge.js
     * and came back solved, so the board printed here is the board that plays. */
    {
      id: "f14", labelKey: "lpwF14",
      map: ["########",
            "#......#",
            "#..G...#",
            "#......#",
            "#......#",
            "#......#",
            "#.W....#",
            "########"],
      doorPlates: [], pistonOffsets: [],
      programs: [["F", "F", "F", "F", "R", "F"]],
    },
    {
      id: "f15", labelKey: "lpwF15",
      map: ["########",
            "#..G...#",
            "#.######",
            "#.######",
            "#.######",
            "#.######",
            "#W....##",
            "########"],
      doorPlates: [], pistonOffsets: [],
      programs: [["F", "F", "F", "F", "F", "R", "F", "F"]],
    },
    {
      id: "f16", labelKey: "lpwF16",
      map: ["########",
            "#.G....#",
            "#.######",
            "#.######",
            "#.######",
            "#.######",
            "#W######",
            "########"],
      doorPlates: [], pistonOffsets: [],
      programs: [["F", "F", "F", "F", "F", "R", "F"]],
    },
    {
      id: "f17", labelKey: "lpwF17",
      map: ["########",
            "#P.....#",
            "#......#",
            "#......#",
            "#......#",
            "#......#",
            "#WDG...#",
            "########"],
      doorPlates: [0], pistonOffsets: [],
      programs: [["F", "F", "F", "F", "F"], ["R", "W", "W", "W", "W", "F", "F"]],
    },
    {
      id: "f18", labelKey: "lpwF18",
      map: ["########",
            "#DG....#",
            "#.######",
            "#P######",
            "#.######",
            "#.######",
            "#W....##",
            "########"],
      doorPlates: [0], pistonOffsets: [],
      programs: [["F", "F", "F"], ["F", "F", "F", "F", "F", "R", "F"]],
    },
    {
      id: "f19", labelKey: "lpwF19",
      map: ["########",
            "#..G...#",
            "###D####",
            "#..P...#",
            "#.######",
            "#W######",
            "########",
            "########"],
      doorPlates: [0], pistonOffsets: [],
      programs: [["F", "F", "R", "F", "F"], ["F", "F", "R", "F", "F", "L", "F", "F"]],
    },
    {
      id: "f20", labelKey: "lpwF20",
      map: ["########",
            "########",
            "#...G###",
            "#.######",
            "#.######",
            "#.######",
            "#W######",
            "########"],
      doorPlates: [], pistonOffsets: [],
      programs: [["F", "F", "F", "F", "R", "F", "F", "F"]],
    },
    /* Floors 21-24. The first twenty taught the verbs and put them to work in
     * relays; the back tier asks for things no authored run has done yet: f21
     * reverses - the B op's first shift - driving a crate down a two-cell dock
     * and backing out the way it came; f22 races a piston pair on the phase
     * clock and leaves a ghost holding the plate behind the rams; f23 carries
     * a pad through a live door and drops it on the far plate mid-run; and
     * f24 chains the crate trick, a parked ghost, and a wait-for-your-crew
     * finish into the summit. Every floor was walked by its own shipped runs
     * in tools/loopwright-forge.js and came back solved, and the forge's
     * searches came back empty: no shorter run list plays any of them. */
    /* The dock is two cells deep, so the crate needs two shoves to reach the
     * far plate - and once it is home the worker is nose-to-wall in a dead
     * end. Turning around costs two ops; backing out (B) costs one, and the
     * eight-slot cap only fits the reverse. */
    {
      id: "f21", labelKey: "lpwF21",
      map: ["########",
            "#......#",
            "#..P...#",
            "#......#",
            "#..C.DG#",
            "#......#",
            "#..W...#",
            "########"],
      doorPlates: [0], pistonOffsets: [],
      programs: [["F", "P", "P", "B", "R", "F", "F", "F"]],
    },
    /* The press pair cycles on a four-tick phase, and both rams are down on
     * the very tick the straight walk from the start would reach them: the
     * mouth ram kills tick one, the far ram kills tick five, so no run can
     * thread both without burning a beat on the phase clock. The ghost parked
     * on the plate between the rams keeps the win alive while the worker
     * climbs past both to the goal. */
    {
      id: "f22", labelKey: "lpwF22",
      map: ["########",
            "###.G###",
            "###T####",
            "###P####",
            "###T####",
            "###.####",
            "#..W...#",
            "########"],
      doorPlates: [], pistonOffsets: [3, 3],
      programs: [
        ["F", "W", "F", "F"],
        ["F", "W", "F", "F", "F", "F", "R", "F"],
      ],
    },
    /* The pad can be shoved, but every shove lane dies before it helps: north
     * slides stall against the chamber's back wall short of the plate, and the
     * west slide into the plate's cell leaves the far plate starving - so the
     * only line that feeds both plates is a carry. The last run grabs the pad
     * at the start, walks it through the live airlock, and drops it on the
     * side chamber's plate on the way to the goal. First authored run that
     * delivers its own key. */
    {
      id: "f23", labelKey: "lpwF23",
      map: ["########",
            "########",
            "########",
            "#GP.####",
            "###D####",
            "#..S...#",
            "#.PW...#",
            "########"],
      doorPlates: [1], pistonOffsets: [],
      programs: [
        ["L", "F"],
        ["G", "F", "F", "F", "L", "F", "D", "F"],
      ],
    },
    /* Outer gate, inner post, final sprint. Run one shoulders the crate onto
     * the outer plate; run two waits out the ghost's settle time - its crate
     * only lands on the plate on its third tick - and takes the inner post
     * through the outer gate; the last run, waits included, is exactly the
     * eight slots the panel allows, and no two-run split fits the cap. */
    {
      id: "f24", labelKey: "lpwF24",
      map: ["########",
            "###DG###",
            "###P####",
            "###D####",
            "#......#",
            "#PC....#",
            "#..W...#",
            "########"],
      doorPlates: [0, 1], pistonOffsets: [],
      programs: [
        ["F", "L", "P"],
        ["W", "F", "F", "F", "F"],
        ["W", "F", "F", "F", "F", "F", "R", "F"],
      ],
    },
    /* Floors 25-30 are the summit, and its dial is the plate count the win
     * law itself holds: a floor only clears when EVERY plate in the room is
     * still pressed on the winning frame, and the rooms climb from three
     * plates to the full eight - f25 carries three, f26 four, f27 five,
     * f28 six, f29 seven, and f30 eight, one plate per column of the summit's
     * four-wide crate yard. The crew grows with the room (par 3, 3, 4, 4, 5,
     * 5 runs) because a parked body holds one plate and a shoveled crate one
     * more, so eight presses take four ghosts each delivering a crate and
     * then its own body, while the closer ends on G and can press nothing.
     * Every floor was walked by its own shipped runs in
     * tools/loopwright-forge.js and came back solved, and the forge's
     * searches came back empty: no final run of par-1 ops or fewer over the
     * movement chips and Push wins any of them given the authored ghosts,
     * the final run alone - ghosts stripped - dies on the shut door of
     * every one, and f30's closer spends exactly the eight slots the panel
     * allows. The presses are the load: strip the crates from a summit floor
     * and no final run wins at par length, because the plates the crates
     * held outnumber the bodies left to hold them (eight plates, four
     * ghosts, and the worker's own frame owed to G); and the no-wait walk
     * dies on the door of every summit floor - a ghost only holds its plate
     * once its own run has settled, so the waits are the clock. */
    /* Three plates, two ghosts: one shoveled crate presses the top plate and
     * its ghost's body walks on to the side plate, the other ghost takes the
     * far column, and the closer waits out both settles before climbing. */
    {
      id: "f25", labelKey: "lpwF25",
      map: ["########",
            "#..G...#",
            "#..D...#",
            "#.P.P..#",
            "#..P...#",
            "#.C....#",
            "#..W...#",
            "########"],
      doorPlates: [0], pistonOffsets: [],
      programs: [
        ["L", "F", "R", "P", "P", "R", "F"],
        ["R", "F", "L", "F", "F", "F"],
        ["W", "W", "F", "F", "F", "F", "F"],
      ],
    },
    /* Four plates, two crate-and-body ghosts: each column is pushed once and
     * parked on, and the closer's first wait is the ghost's settle, its
     * second the door's own opening beat. */
    {
      id: "f26", labelKey: "lpwF26",
      map: ["########",
            "#..G...#",
            "#..D...#",
            "#.P..P.#",
            "#.P..P.#",
            "#.C..C.#",
            "#..W...#",
            "########"],
      doorPlates: [0], pistonOffsets: [],
      programs: [
        ["L", "F", "R", "P", "P"],
        ["R", "F", "F", "L", "P", "P"],
        ["W", "W", "F", "F", "F", "F", "F"],
      ],
    },
    /* Five plates, three ghosts: the two crate columns feed top and bottom
     * pairs while the third ghost merely parks on the corner plate - from
     * here on every spare body in the room is a press. */
    {
      id: "f27", labelKey: "lpwF27",
      map: ["########",
            "#..G...#",
            "#..D...#",
            "#.P..P.#",
            "#.P..P.#",
            "#.C..C.#",
            "#..W.P.#",
            "########"],
      doorPlates: [0], pistonOffsets: [],
      programs: [
        ["L", "F", "R", "P", "P"],
        ["R", "F", "F", "L", "P", "P"],
        ["R", "F", "F"],
        ["W", "W", "F", "F", "F", "F", "F"],
      ],
    },
    /* Six plates, three crate-and-body ghosts in three columns: the room is
     * fully doubled, top plate fed by the crate, bottom held by the body
     * that pushed it. */
    {
      id: "f28", labelKey: "lpwF28",
      map: ["########",
            "#..G...#",
            "#..D...#",
            "#.P.P.P#",
            "#.P.P.P#",
            "#.C.C.C#",
            "#..W...#",
            "########"],
      doorPlates: [0], pistonOffsets: [],
      programs: [
        ["L", "F", "R", "P", "P"],
        ["R", "F", "L", "P", "P"],
        ["R", "F", "F", "F", "L", "P", "P"],
        ["W", "W", "F", "F", "F", "F", "F"],
      ],
    },
    /* Seven plates, four ghosts: the sixth column's crate joins the yard and
     * a fourth ghost takes the left wing, so the closer waits out three
     * crates and a parked body before the door will answer. */
    {
      id: "f29", labelKey: "lpwF29",
      map: ["########",
            "#..G...#",
            "#..D...#",
            "#.P.P.P#",
            "#.P.P.P#",
            "#.C.C.C#",
            "#P.W...#",
            "########"],
      doorPlates: [0], pistonOffsets: [],
      programs: [
        ["L", "F", "R", "P", "P"],
        ["R", "F", "F", "F", "L", "P", "P"],
        ["R", "F", "L", "P", "P"],
        ["L", "F", "F"],
        ["W", "W", "F", "F", "F", "F", "F"],
      ],
    },
    /* The full house: eight plates, four crate-and-body ghosts in a
     * four-wide yard, and a closer that needs three waits to outlast the
     * last crate's settle - eight ops, exactly the slots the panel allows,
     * and the forge found nothing shorter. */
    {
      id: "f30", labelKey: "lpwF30",
      map: ["########",
            "#..G...#",
            "#..D...#",
            "#PP..PP#",
            "#PP..PP#",
            "#CC..CC#",
            "#..W...#",
            "########"],
      doorPlates: [0], pistonOffsets: [],
      programs: [
        ["L", "F", "F", "R", "P", "P"],
        ["L", "F", "R", "P", "P"],
        ["R", "F", "F", "L", "P", "P"],
        ["R", "F", "F", "F", "L", "P", "P"],
        ["W", "W", "W", "F", "F", "F", "F", "F"],
      ],
    },
    /* Floors 31-40 are the overhaul, and its dials are the crew and the
     * press count. The summit ended at five runs on the full eight plates;
     * the overhaul opens a six-run crew on that same eight-plate yard and
     * never gives either line back: the crew climbs to seven runs at f36
     * and to the full eight at f40, while the press line runs 8, 8, 8, 8,
     * 9, 10, 10, 10, 11, 12 - past the full house at f35 and up to a
     * twelve-plate yard at the capstone. Every rung also takes one record
     * against every floor before it: f31 the first six-run crew, f32 the
     * first three-ram floor, f33 the first four-door stack, f34 the first
     * three-pad shift, f35 the first nine-plate yard, f36 the first
     * ten-plate floor and the first seven-run crew, f37 the first
     * five-crate fleet, f38 the longest shift and the deepest wait line
     * the panel has dealt, f39 the first eleven-plate yard and the first
     * seven-run relay whose closer delivers a press of its own, f40 the
     * capstone - twelve plates, a crew of eight, and the longest shift
     * of the first forty.
     * The crews are arithmetic, not decoration: a ghost presses at most
     * two plates (its body plus one crate) and the closer's own body is
     * owed to G, so each yard strands the crew below the one it ships
     * with - four ghosts press seven of f31-f33's eight plates, eight of
     * f35's nine, nine of f36's ten (and nine of f37's, once the fourth
     * column's pusher has no plate for its own body), ten of f39's eleven
     * and of f40's twelve before the closer's shove. Every floor was
     * walked by its own shipped runs in tools/loopwright-forge.js and came
     * back solved, and the forge's searches came back empty: no final run
     * of seven ops or fewer over the movement chips and Push wins any
     * closer in the tier given the authored ghosts, the straight no-wait
     * walks die on the mouth ram (f32) and on the shut stack (f33), and
     * the closers of f39 and f40 are Manhattan-exact at eight ops - six
     * moves and two forced turns with no slack for a wait. */
    /* The first six-run crew. Three crate-and-body ghosts feed three of
     * the yard's four columns while two body ghosts walk the bare sixth
     * column and park on its plates - five ghosts press all eight, one
     * more than a four-ghost crew can hold with three crates (seven). The
     * closer waits out the settles exactly three beats, the door timing
     * the summit taught. */
    {
      id: "f31", labelKey: "lpwF31",
      map: ["########",
            "#..G...#",
            "#..D...#",
            "#PP..PP#",
            "#PP..PP#",
            "#CC..C.#",
            "#..W...#",
            "########"],
      doorPlates: [0], pistonOffsets: [],
      programs: [
        ["L", "F", "F", "R", "P", "P"],
        ["L", "F", "R", "P", "P"],
        ["R", "F", "F", "L", "P", "P"],
        ["R", "F", "F", "F", "L", "F", "F"],
        ["R", "F", "F", "F", "L", "F", "F", "F"],
        ["W", "W", "W", "F", "F", "F", "F", "F"],
      ],
    },
    /* Three rams, one more than the press floor ever ran. The whole center
     * column is phased - offsets 1, 2, 0 top to bottom, down-ticks at
     * t=3, t=2 and t=0 - and the closer's three waits sit on the beat
     * that threads all three: the straight walk dies on the mouth ram at
     * t=0, and any wait interleaved into the walk lands a down tick on a
     * ram. The yard and the crew are f31's. */
    {
      id: "f32", labelKey: "lpwF32",
      map: ["########",
            "#..G...#",
            "#..D...#",
            "#PP.TPP#",
            "#PP.TPP#",
            "#CCT.C.#",
            "#..W...#",
            "########"],
      doorPlates: [0], pistonOffsets: [1, 2, 0],
      programs: [
        ["L", "F", "F", "R", "P", "P"],
        ["L", "F", "R", "P", "P"],
        ["R", "F", "F", "L", "P", "P"],
        ["R", "F", "F", "F", "L", "F", "F"],
        ["R", "F", "F", "F", "L", "F", "F", "F"],
        ["W", "W", "W", "F", "F", "F", "F", "F"],
      ],
    },
    /* Four doors in one stack, one more than the citadel ever held, wired
     * [0, 1, 7, 6]: the top two eat the crate columns' landings (t=5 and
     * t=6), the bottom two hang off the fast plates beside the start,
     * parked at t=2 by a pair of two-op ghosts. A seven-op closer reaches
     * the third gate one beat before its crate lands, so the three waits
     * are load-bearing all the way up. The shift is short - 28 ticks -
     * because the stack does the work a wider yard would. */
    {
      id: "f33", labelKey: "lpwF33",
      map: ["########",
            "#..G...#",
            "#..D...#",
            "#PPDP..#",
            "#PPDP..#",
            "#CCDC..#",
            "#.PWP..#",
            "########"],
      doorPlates: [0, 1, 7, 6], pistonOffsets: [],
      programs: [
        ["L", "F", "F", "R", "P", "P"],
        ["L", "F", "R", "P", "P"],
        ["R", "F", "L", "P", "P"],
        ["L", "F"],
        ["R", "F"],
        ["W", "W", "W", "F", "F", "F", "F", "F"],
      ],
    },
    /* Three pads ship where two was the ceiling, and all three sit on
     * plates at the winning frame - the pad bench goes two (f12) to
     * three. The start row hands each carrier its pad inside the first
     * two beats: one rides the fourth column up and parks its body on
     * the plate above its drop, one drops beside the yard on five, and
     * one walks the whole row to the far corner plate. */
    {
      id: "f34", labelKey: "lpwF34",
      map: ["########",
            "#..G...#",
            "#..D...#",
            "#PP.P..#",
            "#PP.PP.#",
            "#CC...P#",
            "#..WSSS#",
            "########"],
      doorPlates: [0], pistonOffsets: [],
      programs: [
        ["L", "F", "F", "R", "P", "P"],
        ["L", "F", "R", "P", "P"],
        ["R", "G", "F", "L", "F", "F", "D", "F"],
        ["R", "F", "G", "F", "L", "F", "F", "D"],
        ["R", "G", "F", "F", "F", "L", "F", "D"],
        ["W", "W", "W", "F", "F", "F", "F", "F"],
      ],
    },
    /* The first yard past the summit's full house: nine plates, one more
     * than f30 ever held. Four crate-and-body ghosts feed the outer
     * columns and a fifth body ghost takes the new lone plate in the
     * fourth column - four ghosts press eight of nine, so the fifth body
     * is arithmetic. */
    {
      id: "f35", labelKey: "lpwF35",
      map: ["########",
            "#..G...#",
            "#..D...#",
            "#PP.PPP#",
            "#PP..PP#",
            "#CC..CC#",
            "#..W...#",
            "########"],
      doorPlates: [0], pistonOffsets: [],
      programs: [
        ["L", "F", "F", "R", "P", "P"],
        ["L", "F", "R", "P", "P"],
        ["R", "F", "F", "L", "P", "P"],
        ["R", "F", "F", "F", "L", "P", "P"],
        ["R", "F", "L", "F", "F", "F"],
        ["W", "W", "W", "F", "F", "F", "F", "F"],
      ],
    },
    /* Ten plates and the first seven-run crew, one more plate and one
     * more ghost than f35. The new plate sits beside the door and the
     * sixth ghost walks the fourth column to it - five ghosts press nine
     * of ten, so the sixth is arithmetic. */
    {
      id: "f36", labelKey: "lpwF36",
      map: ["########",
            "#..G...#",
            "#..DP..#",
            "#PP.PPP#",
            "#PP..PP#",
            "#CC..CC#",
            "#..W...#",
            "########"],
      doorPlates: [1], pistonOffsets: [],
      programs: [
        ["L", "F", "F", "R", "P", "P"],
        ["L", "F", "R", "P", "P"],
        ["R", "F", "F", "L", "P", "P"],
        ["R", "F", "F", "F", "L", "P", "P"],
        ["R", "F", "L", "F", "F", "F"],
        ["R", "F", "L", "F", "F", "F", "F"],
        ["W", "W", "W", "F", "F", "F", "F", "F"],
      ],
    },
    /* Five crates, one more than the full house ran. The fourth column
     * joins the fleet, but its pusher has no plate for its own body - the
     * crate lands between the yard's halves and the body stops below it -
     * so five ghosts press nine of ten and a sixth walks the center lane
     * to the plate above the west pair. */
    {
      id: "f37", labelKey: "lpwF37",
      map: ["########",
            "#..G...#",
            "#.PD...#",
            "#PP.PPP#",
            "#PP..PP#",
            "#CC.CCC#",
            "#..W...#",
            "########"],
      doorPlates: [1], pistonOffsets: [],
      programs: [
        ["L", "F", "F", "R", "P", "P"],
        ["L", "F", "R", "P", "P"],
        ["R", "F", "F", "L", "P", "P"],
        ["R", "F", "F", "F", "L", "P", "P"],
        ["R", "F", "L", "P", "P"],
        ["F", "F", "L", "F", "R", "F", "F"],
        ["W", "W", "W", "F", "F", "F", "F", "F"],
      ],
    },
    /* The longest shift the panel has dealt - forty-eight ticks across
     * seven runs - and the deepest wait line, six where five was the
     * old ceiling. The rams move into the crew's own corridor: the two
     * parker ghosts each pay the phase toll on the fourth column (down-
     * ticks at t=3 and t=2), waits and all, and the no-wait walk dies on
     * the mouth ram. */
    {
      id: "f38", labelKey: "lpwF38",
      map: ["########",
            "#..G...#",
            "#..DP..#",
            "#PP.PPP#",
            "#PP.TPP#",
            "#CC.TCC#",
            "#..W.T.#",
            "########"],
      doorPlates: [1], pistonOffsets: [2, 1, 0],
      programs: [
        ["L", "F", "F", "R", "P", "P"],
        ["L", "F", "R", "P", "P"],
        ["R", "F", "F", "L", "P", "P"],
        ["R", "F", "F", "F", "L", "P", "P"],
        ["R", "F", "L", "W", "F", "F", "W", "F"],
        ["R", "F", "L", "W", "F", "F", "F", "F"],
        ["W", "W", "W", "F", "F", "F", "F", "F"],
      ],
    },
    /* The first eleven-plate yard, and the first seven-run relay whose
     * closer delivers a press of its own: the wall in the center lane turns every approach
     * into one Manhattan-exact eight-op line - six moves and two turns -
     * whose sideways shove lands the live crate on the fifth column's
     * plate. Six ghosts press ten of eleven; the eleventh press is the
     * closer's own shoulder. */
    {
      id: "f39", labelKey: "lpwF39",
      map: ["########",
            "#...G..#",
            "#..#PP.#",
            "#PP.PPP#",
            "#PP.CPP#",
            "#CC..CC#",
            "#..W...#",
            "########"],
      doorPlates: [], pistonOffsets: [],
      programs: [
        ["L", "F", "F", "R", "P", "P"],
        ["L", "F", "R", "P", "P"],
        ["R", "F", "F", "L", "P", "P", "P"],
        ["R", "F", "F", "F", "L", "P", "P"],
        ["F", "F", "F", "R", "F"],
        ["F", "F", "F", "R", "F", "L", "F"],
        ["F", "F", "R", "P", "L", "F", "F", "F"],
      ],
    },
    /* The capstone: twelve plates - the widest yard the game has held -
     * under the first eight-run crew, with the longest shift of the first
     * forty at fifty-two ticks. The closer never waits: its eight ops are
     * the same Manhattan-exact shove line as f39's, and the crew of seven
     * settles inside it - the last crate lands on the very tick the
     * closer arrives. Six ghosts press ten of twelve and the closer's
     * shove lifts it to eleven; the twelfth press takes the seventh
     * body. */
    {
      id: "f40", labelKey: "lpwF40",
      map: ["########",
            "#...G..#",
            "#.P#PP.#",
            "#PP.PPP#",
            "#PP.CPP#",
            "#CC..CC#",
            "#..W...#",
            "########"],
      doorPlates: [], pistonOffsets: [],
      programs: [
        ["L", "F", "F", "R", "P", "P"],
        ["L", "F", "R", "P", "P"],
        ["R", "F", "F", "L", "P", "P", "P"],
        ["R", "F", "F", "F", "L", "P", "P"],
        ["F", "F", "F", "R", "F"],
        ["F", "F", "F", "R", "F", "L", "F"],
        ["F", "F", "F", "L", "F", "R", "F"],
        ["F", "F", "R", "P", "L", "F", "F", "F"],
      ],
    },
  ];

  function mulberry32(seed) {
    var value = seed >>> 0;
    return function () {
      value = (value + 0x6d2b79f5) >>> 0;
      var mixed = Math.imul(value ^ (value >>> 15), 1 | value);
      mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
      return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* Floors are static; the rng is consumed once at build time so a floor's
   * piston phases replay identically, keeping the simulator itself seed-free. */
  function lpwParse(floor) {
    var walls = [];
    var plates = [];
    var doors = [];
    var crates = [];
    var pads = [];
    var pistons = [];
    var goal = { x: 0, y: 0 };
    var start = { x: 1, y: lpwSize - 2, d: 0 };
    var y, x, ch;
    for (y = 0; y < lpwSize; y += 1) {
      walls.push([]);
      for (x = 0; x < lpwSize; x += 1) {
        ch = floor.map[y].charAt(x);
        walls[y].push(ch === "#");
        if (ch === "G") {
          goal = { x: x, y: y };
        } else if (ch === "W") {
          start = { x: x, y: y, d: 0 };
        } else if (ch === "P") {
          plates.push({ x: x, y: y });
        } else if (ch === "D") {
          doors.push({ x: x, y: y });
        } else if (ch === "C") {
          crates.push({ x: x, y: y });
        } else if (ch === "S") {
          pads.push({ x: x, y: y });
        } else if (ch === "T") {
          pistons.push({ x: x, y: y, off: 0, period: 4 });
        }
      }
    }
    for (y = 0; y < doors.length; y += 1) {
      doors[y].plate = floor.doorPlates[y] === undefined ? y : floor.doorPlates[y];
    }
    for (y = 0; y < pistons.length; y += 1) {
      pistons[y].off = floor.pistonOffsets[y] === undefined ? y : floor.pistonOffsets[y];
    }
    return {
      w: lpwSize, h: lpwSize, walls: walls, plates: plates, doors: doors,
      crates: crates, pads: pads, pistons: pistons, goal: goal, start: start,
      ghosts: [],
    };
  }

  function lpwDeep(items) {
    var out = [];
    for (var i = 0; i < items.length; i += 1) {
      out.push({ x: items[i].x, y: items[i].y, held: items[i].held });
    }
    return out;
  }

  function lpwCellKind(grid, x, y) {
    if (x < 0 || y < 0 || x >= grid.w || y >= grid.h) {
      return "wall";
    }
    if (grid.walls[y][x]) {
      return "wall";
    }
    for (var i = 0; i < grid.doors.length; i += 1) {
      if (grid.doors[i].x === x && grid.doors[i].y === y) {
        return "door" + i;
      }
    }
    for (var p = 0; p < grid.pistons.length; p += 1) {
      if (grid.pistons[p].x === x && grid.pistons[p].y === y) {
        return "piston" + p;
      }
    }
    return "floor";
  }

  /* Pressed = the snapshot standing on it, a placed item, or any ghost's
   * replayed snapshot (a ghost's crate keeps holding a plate too). */
  function lpwPressedAt(grid, snap, ghosts, time) {
    var out = [];
    var i, g;
    for (i = 0; i < grid.plates.length; i += 1) {
      out.push(false);
    }
    function mark(items, worker) {
      for (i = 0; i < grid.plates.length; i += 1) {
        var p = grid.plates[i];
        if (worker && worker.x === p.x && worker.y === p.y) {
          out[i] = true;
        }
        for (var c = 0; c < items.crates.length; c += 1) {
          if (items.crates[c].x === p.x && items.crates[c].y === p.y) {
            out[i] = true;
          }
        }
        for (var d = 0; d < items.pads.length; d += 1) {
          if (!items.pads[d].held && items.pads[d].x === p.x && items.pads[d].y === p.y) {
            out[i] = true;
          }
        }
      }
    }
    mark(snap, snap.w);
    for (g = 0; g < ghosts.length; g += 1) {
      var frames = ghosts[g];
      if (!frames.length) {
        continue;
      }
      var at = frames[Math.min(time, frames.length - 1)];
      mark(at, at.w);
    }
    return out;
  }

  function lpwPassable(grid, snap, ghosts, time, x, y) {
    var kind = lpwCellKind(grid, x, y);
    if (kind === "wall") {
      return false;
    }
    var press = lpwPressedAt(grid, snap, ghosts, time);
    if (kind.indexOf("door") === 0) {
      var door = grid.doors[Number(kind.slice(4))];
      return !!press[door.plate];
    }
    if (kind.indexOf("piston") === 0) {
      var piston = grid.pistons[Number(kind.slice(6))];
      return (time + piston.off) % piston.period !== 0;
    }
    return true;
  }

  function lpwItemAt(snap, x, y) {
    var i;
    for (i = 0; i < snap.crates.length; i += 1) {
      if (snap.crates[i].x === x && snap.crates[i].y === y) {
        return "crate";
      }
    }
    for (i = 0; i < snap.pads.length; i += 1) {
      if (!snap.pads[i].held && snap.pads[i].x === x && snap.pads[i].y === y) {
        return "pad";
      }
    }
    return "";
  }

  function lpwCorner(grid, x, y) {
    var wallH = lpwCellKind(grid, x - 1, y) === "wall" || lpwCellKind(grid, x + 1, y) === "wall";
    var wallV = lpwCellKind(grid, x, y - 1) === "wall" || lpwCellKind(grid, x, y + 1) === "wall";
    return wallH && wallV;
  }

  /* Pure deterministic simulation: returns every actor's snapshot per step,
   * the press flags, and one of done | wall | stuck | budget as the reason. */
  function lpwSim(grid, program, steps) {
    var budget = steps > 0 ? steps : lpwBudget;
    var w = { x: grid.start.x, y: grid.start.y, d: grid.start.d, carry: null };
    var crates = lpwDeep(grid.crates);
    var pads = lpwDeep(grid.pads);
    var ghosts = grid.ghosts || [];
    var frames = [];
    var reason = "budget";
    var win = false;
    var pc = 0;
    var time = 0;

    function snap() {
      var press = lpwPressedAt(grid, { w: w, crates: crates, pads: pads }, ghosts, frames.length);
      return {
        w: { x: w.x, y: w.y, d: w.d, carry: w.carry === null ? null : w.carry },
        crates: lpwDeep(crates),
        pads: lpwDeep(pads),
        press: press,
      };
    }
    frames.push(snap());

    while (time < budget) {
      if (pc >= program.length) {
        reason = "done";
        break;
      }
      var token = program[pc] || "W";
      var jumped = false;
      if (token.indexOf("J") === 0) {
        var target = parseInt(token.slice(1), 10);
        if (isNaN(target) || target < 1) {
          target = 1;
        }
        if (target > program.length) {
          target = program.length;
        }
        pc = target - 1;
        jumped = true;
      } else {
        var dir = lpwDirs[w.d];
        if (token === "L") {
          w.d = (w.d + 3) % 4;
        } else if (token === "R") {
          w.d = (w.d + 1) % 4;
        } else if (token === "F" || token === "B") {
          var sign = token === "F" ? 1 : -1;
          var nx = w.x + dir.dx * sign;
          var ny = w.y + dir.dy * sign;
          /* Pads are flat and can be stepped on; only crates and closed
           * doors/pistons stop a walk dead. */
          if (lpwItemAt(frames[frames.length - 1], nx, ny) === "crate" ||
              !lpwPassable(grid, frames[frames.length - 1], ghosts, time, nx, ny)) {
            reason = "wall";
            break;
          }
          w.x = nx;
          w.y = ny;
        } else if (token === "P") {
          var fx = w.x + dir.dx;
          var fy = w.y + dir.dy;
          var bx = w.x + dir.dx * 2;
          var by = w.y + dir.dy * 2;
          var front = lpwItemAt(frames[frames.length - 1], fx, fy);
          if (front === "crate") {
            var prev = lpwDeep(crates);
            var moved = false;
            for (var ci = 0; ci < crates.length; ci += 1) {
              if (crates[ci].x === fx && crates[ci].y === fy) {
                crates[ci].x = bx;
                crates[ci].y = by;
                moved = true;
              }
            }
            var okLanding = lpwPassable(grid, frames[frames.length - 1], ghosts, time, bx, by) &&
              lpwItemAt({ crates: prev, pads: pads, w: w }, bx, by) === "";
            if (!moved || !okLanding || lpwCorner(grid, bx, by)) {
              crates = prev;
              reason = "stuck";
              break;
            }
            w.x = fx;
            w.y = fy;
          } else if (front === "pad") {
            var prevPads = lpwDeep(pads);
            for (var pi = 0; pi < pads.length; pi += 1) {
              if (!pads[pi].held && pads[pi].x === fx && pads[pi].y === fy) {
                pads[pi].x = bx;
                pads[pi].y = by;
              }
            }
            if (!lpwPassable(grid, frames[frames.length - 1], ghosts, time, bx, by)) {
              pads = prevPads;
              reason = "stuck";
              break;
            }
            w.x = fx;
            w.y = fy;
          }
        } else if (token === "G") {
          if (w.carry === null) {
            for (var gi = 0; gi < pads.length; gi += 1) {
              if (!pads[gi].held && pads[gi].x === w.x + dir.dx && pads[gi].y === w.y + dir.dy) {
                pads[gi].held = true;
                w.carry = gi;
              }
            }
          }
        } else if (token === "D") {
          if (w.carry !== null && pads[w.carry]) {
            pads[w.carry].held = false;
            pads[w.carry].x = w.x;
            pads[w.carry].y = w.y;
            w.carry = null;
          }
        }
        pc += 1;
      }
      time += 1;
      if (jumped) {
        frames.push(snap());
        continue;
      }
      frames.push(snap());
    }

    var final = frames[frames.length - 1];
    var press = lpwPressedAt(grid, final, ghosts, frames.length - 1);
    var allPlates = true;
    for (var q = 0; q < press.length; q += 1) {
      if (!press[q]) {
        allPlates = false;
      }
    }
    win = reason === "done" &&
      final.w.x === grid.goal.x && final.w.y === grid.goal.y && allPlates;
    return { frames: frames, reason: reason, win: win, steps: frames.length - 1 };
  }

  /* Deal-time validation: replay the authored run list with accumulating
   * ghosts; the last run must win and none may crash. */
  function lpwSolved(floor, programs) {
    var base = typeof floor.walls === "undefined" ? lpwParse(floor) : floor;
    var ghosts = [];
    var list = programs || floor.programs;
    for (var i = 0; i < list.length; i += 1) {
      var grid = {
        w: base.w, h: base.h, walls: base.walls, plates: base.plates, doors: base.doors,
        crates: base.crates, pads: base.pads, pistons: base.pistons, goal: base.goal,
        start: base.start, ghosts: ghosts,
      };
      var res = lpwSim(grid, list[i], lpwBudget);
      if (i === list.length - 1) {
        return res.reason === "done" && res.win === true;
      }
      if (res.reason !== "done") {
        return false;
      }
      ghosts.push(res.frames);
    }
    return false;
  }

  function lpwProgramFromSlots(slots) {
    var out = [];
    for (var i = 0; i < slots.length && i < lpwSlots; i += 1) {
      out.push(slots[i] || "W");
    }
    return out;
  }

  function initLoopwrightGame(panelEl) {
    if (!panelEl) {
      return;
    }

    var campaign = createCampaign({ key: "loopwright-campaign", levels: lpwFloors });
    var floor = lpwFloors[campaign.indexOf(campaign.nextLevelId())] || lpwFloors[0];
    var base = floor.grid;
    var slots = [];
    var cursor = 0;
    var armed = "";
    var ghosts = [];
    var attempts = 0;
    var lastRes = null;
    var replaying = false;
    var replayTimer = null;
    var viewFrames = null;
    var viewIndex = 0;
    var finished = false;

    var hud = document.createElement("div");
    hud.className = "game-hud";
    var runsEl = document.createElement("strong");
    var stepsEl = document.createElement("strong");
    var platesEl = document.createElement("strong");
    var opsEl = document.createElement("strong");
    hud.appendChild(makeStat("lpwRunsLabel", runsEl));
    hud.appendChild(makeStat("lpwStepsLabel", stepsEl));
    hud.appendChild(makeStat("lpwPlatesLabel", platesEl));
    hud.appendChild(makeStat("lpwOpsLabel", opsEl));

    var canvas = document.createElement("canvas");
    canvas.className = "lpw-canvas";
    canvas.width = lpwSize * lpwCell;
    canvas.height = lpwSize * lpwCell;
    canvas.setAttribute("tabindex", "0");
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", t("lpwFieldLabel"));

    var caption = document.createElement("p");
    caption.className = "lpw-caption";

    var chipsRow = document.createElement("div");
    chipsRow.className = "lpw-chips";
    var chipButtons = [];
    lpwOps.forEach(function (op) {
      var chip = document.createElement("button");
      chip.type = "button";
      chip.className = "lpw-chip";
      chip.textContent = op.code;
      chip.setAttribute("aria-label", t("lpwChipAria", { name: t(op.keyName) }));
      chip.setAttribute("aria-pressed", "false");
      chip.addEventListener("click", function () {
        arm(op.code);
      });
      chipsRow.appendChild(chip);
      chipButtons.push({ chip: chip, code: op.code });
    });

    var queueRow = document.createElement("div");
    queueRow.className = "lpw-queue";
    var slotButtons = [];
    for (var s0 = 0; s0 < lpwSlots; s0 += 1) {
      var slot = document.createElement("button");
      slot.type = "button";
      slot.className = "lpw-slot";
      (function (index) {
        slot.addEventListener("click", function () {
          slotClick(index);
        });
      })(s0);
      queueRow.appendChild(slot);
      slotButtons.push(slot);
    }

    var result = document.createElement("p");
    result.className = "game-result";
    result.setAttribute("role", "status");

    var floorRow = document.createElement("div");
    floorRow.className = "elements-row";
    var floorLabel = document.createElement("label");
    floorLabel.className = "elements-label";
    floorLabel.setAttribute("for", "lpwFloorSel");
    floorLabel.setAttribute("data-i18n", "lpwFloorSelectLabel");
    floorLabel.textContent = t("lpwFloorSelectLabel");
    var floorSel = document.createElement("select");
    floorSel.className = "elements-select";
    floorSel.id = "lpwFloorSel";
    floorRow.appendChild(floorLabel);
    floorRow.appendChild(floorSel);

    var actions = document.createElement("div");
    actions.className = "game-actions";
    var runBtn = document.createElement("button");
    runBtn.type = "button";
    runBtn.className = "primary";
    var runLabel = document.createElement("span");
    runLabel.setAttribute("data-i18n", "lpwBtnRun");
    runLabel.textContent = t("lpwBtnRun");
    var runContent = document.createElement("span");
    runContent.className = "button-content";
    runContent.appendChild(runLabel);
    runBtn.appendChild(runContent);
    var rewindBtn = document.createElement("button");
    rewindBtn.type = "button";
    rewindBtn.setAttribute("data-i18n", "lpwBtnRewind");
    rewindBtn.textContent = t("lpwBtnRewind");
    var newBtn = document.createElement("button");
    newBtn.type = "button";
    newBtn.setAttribute("data-i18n", "btnNewRound");
    newBtn.textContent = t("btnNewRound");
    var starsEl = document.createElement("p");
    starsEl.className = "game-best";
    [runBtn, rewindBtn, newBtn, starsEl].forEach(function (node) {
      actions.appendChild(node);
    });

    var hint = document.createElement("p");
    hint.className = "game-hint";
    hint.setAttribute("data-i18n", "lpwHint");
    hint.textContent = t("lpwHint");

    [hud, canvas, caption, chipsRow, queueRow, result, floorRow, actions, hint].forEach(function (node) {
      panelEl.appendChild(node);
    });

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

    var ctx = canvas.getContext("2d");

    function currentSnap() {
      if (viewFrames && viewFrames.length) {
        return viewFrames[Math.min(viewIndex, viewFrames.length - 1)];
      }
      return { w: { x: base.start.x, y: base.start.y, d: base.start.d }, crates: lpwDeep(base.crates), pads: lpwDeep(base.pads), press: [] };
    }

    function renderHud() {
      var snap = currentSnap();
      var pressed = 0;
      var press = snap.press || [];
      for (var i = 0; i < press.length; i += 1) {
        if (press[i]) {
          pressed += 1;
        }
      }
      runsEl.textContent = t("lpwRunStat", { n: attempts, par: floor.parRuns });
      stepsEl.textContent = String(snap ? Math.min(viewIndex, (viewFrames ? viewFrames.length - 1 : 0)) : 0);
      platesEl.textContent = t("lpwPlateStat", { n: pressed, total: base.plates.length });
      var used = 0;
      for (i = 0; i < slots.length; i += 1) {
        if (slots[i]) {
          used += 1;
        }
      }
      opsEl.textContent = t("lpwOpStat", { n: used, max: lpwSlots });
      caption.textContent = t("lpwCaption", {
        step: viewFrames ? Math.min(viewIndex + 1, viewFrames.length) : 0,
        x: snap.w.x + 1,
        y: snap.w.y + 1,
        dir: lpwDirs[snap.w.d].name,
      });
    }

    function drawCell(x, y, glyph, color, big) {
      ctx.fillStyle = color;
      ctx.font = (big ? "bold 17px" : "13px") + " 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(glyph, x * lpwCell + lpwCell / 2, y * lpwCell + lpwCell / 2);
    }

    function draw() {
      var snap = currentSnap();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (App.world) { App.world.backdrop(ctx, canvas.width, canvas.height, "laboratory"); }
      var x, y;
      for (y = 0; y < lpwSize; y += 1) {
        for (x = 0; x < lpwSize; x += 1) {
          var kind = lpwCellKind(base, x, y);
          ctx.fillStyle = kind === "wall" ? "rgba(30,41,59,0.9)" : "rgba(15,23,42,0.55)";
          ctx.fillRect(x * lpwCell, y * lpwCell, lpwCell - 1, lpwCell - 1);
          ctx.strokeStyle = "rgba(148,163,184,0.22)";
          ctx.strokeRect(x * lpwCell + 0.5, y * lpwCell + 0.5, lpwCell - 2, lpwCell - 2);
        }
      }
      for (x = 0; x < base.plates.length; x += 1) {
        var plate = base.plates[x];
        drawCell(plate.x, plate.y, (snap.press && snap.press[x]) ? "O" : "o", "#fbbf24", true);
      }
      for (x = 0; x < base.doors.length; x += 1) {
        var door = base.doors[x];
        var open = snap.press && snap.press[door.plate];
        drawCell(door.x, door.y, open ? "□" : "▣", open ? "#94a3b8" : "#f472b6", true);
      }
      for (x = 0; x < base.pistons.length; x += 1) {
        var piston = base.pistons[x];
        var solid = viewFrames ? (viewIndex + piston.off) % piston.period === 0 : piston.off % piston.period === 0;
        drawCell(piston.x, piston.y, solid ? "T" : "t", "#ff6b35", true);
      }
      drawCell(base.goal.x, base.goal.y, "G", "#a3e635", true);
      for (x = 0; x < snap.crates.length; x += 1) {
        drawCell(snap.crates[x].x, snap.crates[x].y, "C", "#fbbf24", true);
      }
      for (x = 0; x < snap.pads.length; x += 1) {
        if (!snap.pads[x].held) {
          drawCell(snap.pads[x].x, snap.pads[x].y, "S", "#22d3ee", true);
        }
      }
      for (x = 0; x < ghosts.length; x += 1) {
        var frames = ghosts[x];
        var at = frames[Math.min(viewIndex, frames.length - 1)];
        drawCell(at.w.x, at.w.y, String(x + 1), "#94a3b8", true);
      }
      drawCell(snap.w.x, snap.w.y, "W", "#00f2ff", true);
      var nose = lpwDirs[snap.w.d].name;
      drawCell(snap.w.x, snap.w.y, nose, "#e2e8f0", false);
      renderHud();
    }

    function refreshPicker() {
      fillCampaignPicker(
        floorSel,
        campaign,
        function (def) {
          return t(def.labelKey);
        },
        t("elementsLocked"),
      );
      floorSel.value = floor.id;
      starsEl.textContent = t("campaignStars", {
        n: campaign.totalStars(),
        max: campaign.maxStars(),
      });
    }

    function renderQueue() {
      slotButtons.forEach(function (btn, i) {
        var token = slots[i] || "\u00b7";
        btn.textContent = (i + 1) + ":" + token;
        btn.className = "lpw-slot" + (i === cursor ? " is-cursor" : "");
        btn.setAttribute("aria-label", t("lpwSlotAria", { n: i + 1, op: token }));
      });
      chipButtons.forEach(function (entry) {
        entry.chip.setAttribute("aria-pressed", entry.code === armed ? "true" : "false");
      });
    }

    function arm(code) {
      if (finished) {
        return;
      }
      armed = armed === code ? "" : code;
      renderQueue();
    }

    function place(index, code) {
      if (finished) {
        return;
      }
      if (code === "J") {
        if (slots[index] && slots[index].indexOf("J") === 0) {
          var n = parseInt(slots[index].slice(1), 10);
          if (isNaN(n) || n < 1) {
            n = 1;
          }
          slots[index] = "J" + (n >= index + 1 ? 1 : n + 1);
        } else {
          slots[index] = "J1";
        }
      } else {
        slots[index] = code;
      }
      cursor = Math.min(index + 1, lpwSlots - 1);
      armed = "";
      renderQueue();
      draw();
    }

    function slotClick(index) {
      if (finished) {
        return;
      }
      if (armed) {
        place(index, armed);
        return;
      }
      if (slots[index] && slots[index].indexOf("J") === 0) {
        cursor = index;
        place(index, "J");
        return;
      }
      cursor = index;
      renderQueue();
    }

    function stopReplay() {
      if (replayTimer !== null) {
        window.clearTimeout(replayTimer);
        replayTimer = null;
      }
      replaying = false;
    }

    function replayNext() {
      if (!replaying) {
        return;
      }
      if (!lastRes || viewIndex >= lastRes.frames.length - 1) {
        replaying = false;
        replayTimer = null;
        resolveRun();
        return;
      }
      viewIndex += 1;
      draw();
      replayTimer = window.setTimeout(replayNext, lpwStepMs);
    }

    function resolveRun() {
      var res = lastRes;
      lastRes = null;
      if (!res) {
        return;
      }
      if (res.win) {
        finished = true;
        var starsWon = starsFor(attempts, floor.starRuns, "low");
        var usedOps = res.programLength;
        if (starsWon === 3 && res.placedOps > floor.parOps) {
          starsWon = 2;
        }
        var outcome = campaign.record(floor.id, {
          stars: starsWon,
          best: attempts,
          better: "low",
        });
        var message = t("lpwWin", { n: attempts, m: usedOps, s: starsWon });
        if (outcome.isBest) {
          message += " " + t("newBest");
        }
        if (outcome.unlockedNext) {
          message += " " + t("lpwNextFloor");
        } else if (campaign.clearedCount() === lpwFloors.length) {
          message += " " + t("lpwAllFloors");
        }
        result.textContent = message;
        logAction(t("logLoopwright", { name: t(floor.labelKey), n: attempts }));
        var rect = newBtn.getBoundingClientRect();
        createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
        petNotifyGame(outcome.isBest || outcome.firstClear);
        refreshPicker();
        return;
      }
      ghosts.push(res.frames);
      var reasons = {
        wall: "lpwFailWall",
        stuck: "lpwFailStuck",
        budget: "lpwFailBudget",
        done: "lpwFailShort",
      };
      result.textContent = t(reasons[res.reason] || "lpwFailShort");
      viewFrames = null;
      viewIndex = 0;
      draw();
    }

    function run() {
      if (replaying || finished) {
        return;
      }
      attempts += 1;
      var grid = {
        w: base.w, h: base.h, walls: base.walls, plates: base.plates, doors: base.doors,
        crates: base.crates, pads: base.pads, pistons: base.pistons, goal: base.goal,
        start: base.start, ghosts: ghosts.slice(),
      };
      var program = lpwProgramFromSlots(slots);
      lastRes = lpwSim(grid, program, lpwBudget);
      // Grade the executed program even if the next draft changes during replay.
      lastRes.programLength = program.length;
      lastRes.placedOps = slots.filter(function (op) { return !!op; }).length;
      viewFrames = lastRes.frames;
      viewIndex = 0;
      replaying = true;
      draw();
      replayTimer = window.setTimeout(replayNext, lpwStepMs);
    }

    function rewind() {
      stopReplay();
      if (replaying) {
        return;
      }
      if (lastRes && !finished) {
        resolveRun();
      }
      viewFrames = null;
      viewIndex = 0;
      draw();
    }

    function loadFloor(floorDef) {
      stopReplay();
      floor = floorDef;
      base = floor.grid;
      slots = [];
      cursor = 0;
      armed = "";
      ghosts = [];
      attempts = 0;
      lastRes = null;
      viewFrames = null;
      viewIndex = 0;
      finished = false;
      refreshPicker();
      renderQueue();
      draw();
      result.textContent = t("lpwPrompt", {
        name: t(floor.labelKey),
        r: floor.parRuns,
        n: floor.parOps,
      });
    }

    runBtn.addEventListener("click", run);
    rewindBtn.addEventListener("click", rewind);
    newBtn.addEventListener("click", function () {
      loadFloor(floor);
    });

    canvas.addEventListener("keydown", function (event) {
      var key = event.key;
      if (key === "ArrowLeft" || key === "ArrowRight") {
        event.preventDefault();
        cursor = (cursor + (key === "ArrowRight" ? 1 : lpwSlots - 1)) % lpwSlots;
        renderQueue();
        return;
      }
      if (key === "Enter") {
        event.preventDefault();
        if (armed) {
          place(cursor, armed);
        }
        return;
      }
      if (key === "Backspace") {
        event.preventDefault();
        if (finished) {
          return;
        }
        slots[cursor] = "";
        renderQueue();
        draw();
        return;
      }
      if (key === "r" || key === "R") {
        event.preventDefault();
        run();
        return;
      }
      if (key === "x" || key === "X") {
        event.preventDefault();
        rewind();
        return;
      }
      var digit = Number(key);
      if (digit >= 1 && digit <= lpwOps.length) {
        event.preventDefault();
        place(cursor, lpwOps[digit - 1].code);
      }
    });

    floorSel.addEventListener("change", function () {
      var index = campaign.indexOf(floorSel.value);
      if (index >= 0 && campaign.isUnlocked(floorSel.value)) {
        loadFloor(lpwFloors[index]);
      } else {
        floorSel.value = floor.id;
      }
    });

    App.quietResetLoopwright = function () {
      stopReplay();
      if (!finished && lastRes) {
        resolveRun();
      }
      viewFrames = null;
      viewIndex = 0;
      draw();
    };

    loadFloor(lpwFloors[campaign.indexOf(campaign.nextLevelId())] || lpwFloors[0]);
  }

  /* Bilingual copy travels with the game: addStrings only fills keys i18n.js
   * does not already own, so the shared dictionary stays authoritative. */
  App.addStrings({
    en: {
      "tabLoopwright": "Loopwright",
      "lpwF1": "First Shift",
      "lpwF2": "Hand and Plate",
      "lpwF3": "One Ghost Hold",
      "lpwF4": "Two Ghosts, Two Doors",
      "lpwF5": "Pad Delivery",
      "lpwF6": "The Clockwork Floor",
      "lpwF7": "The Crate Remembers",
      "lpwF8": "Wait for Your Crew",
      "lpwF9": "Shared Key",
      "lpwF10": "One Pad, Two Jobs",
      "lpwF11": "Double Squeeze",
      "lpwF12": "Dual Pad Relay",
      "lpwF13": "Citadel Gate",
      "lpwF14": "Quiet Corridor",
      "lpwF15": "Long L",
      "lpwF16": "Switchback",
      "lpwF17": "First Relay",
      "lpwF18": "Gatekeeper",
      "lpwF19": "Half Turn",
      "lpwF20": "Foot on the Switch",
      "lpwF21": "Reverse Out",
      "lpwF22": "The Stamping Press",
      "lpwF23": "Carry It Through",
      "lpwF24": "The Night Shift",
      "lpwF25": "Swing Shift",
      "lpwF26": "Overtime",
      "lpwF27": "Full House",
      "lpwF28": "The Long Shift",
      "lpwF29": "The Union",
      "lpwF30": "The Last Shift",
      "lpwF31": "Six on the Floor",
      "lpwF32": "Three Rams",
      "lpwF33": "The Four-Gate Stack",
      "lpwF34": "Pad Carriers",
      "lpwF35": "Past the Full House",
      "lpwF36": "Ten Plates",
      "lpwF37": "The Fifth Crate",
      "lpwF38": "The Ram Corridor",
      "lpwF39": "The Closer's Crate",
      "lpwF40": "The Whole Crew",
      "lpwOpF": "Forward",
      "lpwOpB": "Back",
      "lpwOpL": "Turn left",
      "lpwOpR": "Turn right",
      "lpwOpP": "Push",
      "lpwOpG": "Grab",
      "lpwOpD": "Drop",
      "lpwOpW": "Wait",
      "lpwOpJ": "Loop back to step",
      "lpwRunsLabel": "Runs",
      "lpwStepsLabel": "Step",
      "lpwPlatesLabel": "Plates",
      "lpwOpsLabel": "Ops",
      "lpwFloorSelectLabel": "Choose a floor",
      "lpwFieldLabel": "Eight by eight factory floor: W is the worker, digits are ghosts, P plates, D doors, C crates, S pads, G goal",
      "lpwRunStat": "{n}/{par}",
      "lpwPlateStat": "{n}/{total}",
      "lpwOpStat": "{n}/{max}",
      "lpwCaption": "step {step}: W at column {x}, row {y}, facing {dir}",
      "lpwBtnRun": "Run (R)",
      "lpwBtnRewind": "Rewind (X)",
      "lpwSlotAria": "Queue slot {n}, {op}",
      "lpwChipAria": "Insert {name}",
      "lpwPrompt": "Floor {name}: hold every plate and end on G. Par: {r} runs, up to {n} instructions.",
      "lpwWin": "Floor cleared in {n} runs with {m} instructions - {s} stars!",
      "lpwFailWall": "The worker bumped into something solid. Everything rewound; the ghost keeps its walk.",
      "lpwFailStuck": "A crate wedged itself in. Everything rewound; the ghost keeps its walk.",
      "lpwFailBudget": "The loop never ended. Everything rewound; the ghost keeps its walk.",
      "lpwFailShort": "The queue ran out short of the goal. Rewound - and that ghost is now your crew.",
      "lpwNextFloor": "Next floor unlocked.",
      "lpwAllFloors": "Every floor is running.",
      "lpwHint": "Keys 1-9 insert (9 is the loop marker; re-click it to change its target), arrows move the queue cursor, Enter inserts the armed chip, Backspace clears a slot, R runs, X rewinds. Empty slots act as waits. 3 stars: par runs AND no more than par instructions. The summit floors (25-30) and the overhaul floors (31-40) only clear when every plate is still pressed on the winning frame.",
      "logLoopwright": "Cleared {name} in {n} runs",
    },
    zh: {
      "tabLoopwright": "回环工坊",
      "lpwF1": "第一班",
      "lpwF2": "手与压板",
      "lpwF3": "一个分身压板",
      "lpwF4": "两个分身两扇门",
      "lpwF5": "递送压垫",
      "lpwF6": "机关楼层",
      "lpwF7": "货箱记得",
      "lpwF8": "等待工友",
      "lpwF9": "共享钥匙",
      "lpwF10": "一垫两用",
      "lpwF11": "双箱对推",
      "lpwF12": "双垫接力",
      "lpwF13": "三重门禁",
      "lpwF14": "静谧长廊",
      "lpwF15": "长折转角",
      "lpwF16": "回旋通道",
      "lpwF17": "初次接力",
      "lpwF18": "守门人",
      "lpwF19": "半程转弯",
      "lpwF20": "脚下压闸",
      "lpwF21": "倒车出库",
      "lpwF22": "冲压车间",
      "lpwF23": "携垫过闸",
      "lpwF24": "夜班交接",
      "lpwF25": "翻班",
      "lpwF26": "加班",
      "lpwF27": "满员",
      "lpwF28": "长班",
      "lpwF29": "工会",
      "lpwF30": "最后一班",
      "lpwF31": "六人同班",
      "lpwF32": "三座冲压",
      "lpwF33": "四重闸门",
      "lpwF34": "运垫工",
      "lpwF35": "满员之后",
      "lpwF36": "十块压板",
      "lpwF37": "第五只货箱",
      "lpwF38": "冲压长廊",
      "lpwF39": "收班人的货箱",
      "lpwF40": "全员到齐",
      "lpwOpF": "前进",
      "lpwOpB": "后退",
      "lpwOpL": "左转",
      "lpwOpR": "右转",
      "lpwOpP": "推",
      "lpwOpG": "抓取",
      "lpwOpD": "放下",
      "lpwOpW": "等待",
      "lpwOpJ": "跳回第几步",
      "lpwRunsLabel": "运行数",
      "lpwStepsLabel": "步",
      "lpwPlatesLabel": "压板",
      "lpwOpsLabel": "指令",
      "lpwFloorSelectLabel": "选择楼层",
      "lpwFieldLabel": "八乘八车间：W 是工人，数字是分身，P 压板、D 门、C 货箱、S 压垫、G 终点",
      "lpwRunStat": "{n}/{par}",
      "lpwPlateStat": "{n}/{total}",
      "lpwOpStat": "{n}/{max}",
      "lpwCaption": "第 {step} 步：W 在第 {x} 列第 {y} 行，朝向 {dir}",
      "lpwBtnRun": "运行（R）",
      "lpwBtnRewind": "倒带（X）",
      "lpwSlotAria": "队列槽位 {n}，{op}",
      "lpwChipAria": "插入{name}",
      "lpwPrompt": "「{name}」层：让所有压板保持按下，并让工人停在 G。标准：{r} 次运行、最多 {n} 条指令。",
      "lpwWin": "用了 {n} 次运行、{m} 条指令清空本层——获得 {s} 星！",
      "lpwFailWall": "工人撞上了硬物。全部倒回起点；分身保留了这段路程。",
      "lpwFailStuck": "货箱被卡死了。全部倒回起点；分身保留了这段路程。",
      "lpwFailBudget": "循环永远跑不完。全部倒回起点；分身保留了这段路程。",
      "lpwFailShort": "指令跑完时还没达成目标。已倒带——这个分身现在是你的一名工友。",
      "lpwNextFloor": "解锁下一层。",
      "lpwAllFloors": "全部楼层都运转起来了。",
      "lpwHint": "数字键 1-9 直接插入（9 是回环标记，再点一次可切换跳回的目标），方向键移动队列光标，回车插入选中的指令，退格清空槽位，R 运行，X 倒带。空槽按等待处理。三星条件：恰好标准运行数且指令数不超过标准。顶层楼层（25-30）与改造楼层（31-40）要求通关瞬间所有压板仍被按住。",
      "logLoopwright": "用 {n} 次运行通关{name}",
    },
  });

  /* Build every floor once, prove its authored solution clears it, and take
   * the star bands from that measured solution instead of a guess. */
  lpwFloors.forEach(function (floor, index) {
    var rng = mulberry32(9000 + index * 137);
    floor.grid = lpwParse(floor);
    floor.grid.pistons.forEach(function (piston) {
      if (floor.pistonOffsets.length === 0) {
        piston.off = Math.floor(rng() * piston.period);
      }
    });
    floor.parRuns = floor.programs.length;
    floor.parOps = floor.programs.reduce(function (best, list) {
      return list.length > best ? list.length : best;
    }, 1);
    floor.starRuns = [floor.parRuns, floor.parRuns + 1, floor.parRuns + 3];
    floor.valid = lpwSolved(floor.grid, floor.programs);
  });

  App.registerGame({
    name: "loopwright",
    tabKey: "tabLoopwright",
    init: initLoopwrightGame,
    guide: {
      svg:
        '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="6" y="6" width="108" height="64" rx="5" fill="rgba(30,41,59,.75)" stroke="rgba(148,163,184,.45)"/>' +
        '<path d="M40 14v48M76 14v48M14 38h92" stroke="rgba(148,163,184,.25)"/>' +
        '<text x="27" y="30" font-size="13" fill="#00f2ff" text-anchor="middle">W</text>' +
        '<text x="27" y="58" font-size="13" fill="#94a3b8" text-anchor="middle">1</text>' +
        '<text x="58" y="30" font-size="12" fill="#fbbf24" text-anchor="middle">C</text>' +
        '<text x="58" y="58" font-size="12" fill="#fbbf24" text-anchor="middle">o</text>' +
        '<text x="94" y="30" font-size="12" fill="#f472b6" text-anchor="middle">D</text>' +
        '<text x="94" y="58" font-size="13" fill="#a3e635" text-anchor="middle">G</text>' +
        '<path d="M33 24h12" stroke="#22d3ee" stroke-width="2"/><path d="M42 20l6 4-6 4" fill="none" stroke="#22d3ee" stroke-width="2"/></svg>',
      en: [
        "Aim: hold every plate down and end the run with the worker W standing on G.",
        "Controls: keys 1-8 insert Forward Back Left Right Push Grab Drop Wait, 9 adds the loop marker, arrows move the queue cursor, Enter inserts, Backspace clears a slot, R runs, X rewinds; you can also click a chip then a slot.",
        "Rules: one program of at most eight instructions is replayed identically every run, and doors only open while their plate is held.",
        "Ghosts: every finished run leaves a ghost of that walk playing beside the next one - park an old self on a plate and it holds the door open for the new you.",
        "Watch out: bumping a wall, wedging a crate into a corner, or an endless loop rewinds all actors and costs one run; dropped pads and crates rewind too, only the ghost stays.",
        "Scoring: fewer runs earn more stars - three stars means par runs and no more than par instructions.",
        "New tier: the summit floors (25-30) only clear when every plate in the room is still pressed on the winning frame - the rooms climb from three plates to the full eight, so every ghost must deliver a crate and then park its own body.",
        "The overhaul (31-40): the crew climbs from six runs to the full eight while the yards grow to twelve plates - rams return in threes, a four-door stack rises, three pads ride one shift, and the last two closers shoulder a crate of their own.",
      ],
      zh: [
        "目标：让所有压板保持按下，并让工人 W 在程序结束时站在 G 上。",
        "操作：数字键 1-8 插入 前进/后退/左转/右转/推/抓/放/等待，9 插入回环标记；方向键移动队列光标，回车插入选中指令，退格清空槽位，R 运行，X 倒带；也可以先点指令牌再点队列槽位。",
        "规则：一条最多 8 条指令的程序每次完全一样地重放，门只在对应压板被按住时才开着。",
        "分身：每跑完一次，上一次的身影就会在旁边同步重演——让旧的分身站在压板上，就能为新来的你顶住门。",
        "小心：撞墙、把货箱推进死角、或无限循环都会把所有角色倒回起点并消耗一次运行；压垫与货箱也会倒回，只有分身留下。",
        "计分：运行次数越少星越多——三星要求恰好标准运行数，且指令数不超过标准。",
        "新层级：顶层楼层（25-30）要求通关瞬间房间里的每一块压板都仍被按住——压板从三块一路加到满员八块，每个分身都要先推箱到位、再驻守压板。",
        "改造期（31-40）：运行数从六班一路加到满员八班，压板加到十二块——冲压机三台一组回归，四重闸门叠起，三块压垫随一班同行，最后两层的收班人还要亲手推上一只货箱。",
      ],
    },
  });

  /* Exported for the other modules and the headless checks. */
  App.initLoopwrightGame = initLoopwrightGame;
  App.loopSim = lpwSim;
  App.loopSolved = lpwSolved;
  App.loopParse = lpwParse;
  App.loopProgramFromSlots = lpwProgramFromSlots;
  App.lpwFloors = lpwFloors;
})(window.CapitalConvert = window.CapitalConvert || {});
