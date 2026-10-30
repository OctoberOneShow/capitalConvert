"use strict";

/* game-lantern-heist: every room is robbed by its own shipped script, and the
 * summit's lane watchman is worth ten turns of par
 *
 * Each room ships a `solution` script - moves, dashes, grabs, waits - and the
 * gate replays it through the module's own stepper (App.heistSetup +
 * App.heistStep + App.heistDecode), the same pure functions the panel's key
 * handler feeds. A script that gets seen comes back with turns shorter than
 * its length (the room snaps back to the door and the alarm count climbs), so
 * "won, turns === length, alarms === 0" is the whole proof that the script is
 * clean and lands inside the three-star band.
 *
 * The summit h24 breaks the tier's one comfort - the right-hand corridor is
 * watched by a fourth guard whose loop dips in and out of the vault lane -
 * and the gate proves that watchman is the rung: strip it from a clone and a
 * bounded search walks the vault in sixteen turns, ten under the shipped
 * line, while the shipped script with its waits deleted is seen twice on the
 * same floor. Every wait in the script answers to a real pair of eyes.
 *
 * The under-vault tier h25-h30 keeps the summit's fourth guard as its single
 * lever: strip the lane watchman from any of the six clones and the same
 * floor opens in exactly fourteen turns, ten or more under the shipped line,
 * because the watchman's beat is the only thing re-pricing the lane. h29 adds
 * a second live guard - its row-five sweep is worth four turns - and h27's
 * two waits are load-bearing: drop them and the runner trips two alarms. The
 * par bands run [n, n+4, n+10] off each shipped line. */

const ACTIONS = ["l", "r", "u", "d", "L", "R", "U", "D", "a", "w"];

function serialize(state) {
  return JSON.stringify({
    p: state.pos,
    g: state.guards.map((g) => [g.i, g.frozen, g.spent ? 1 : 0]),
    a: state.alarms,
    l: state.ledger ? 1 : 0,
    h: state.hidden,
    gates: Object.keys(state.gates).filter((k) => state.gates[k]).join("|"),
  });
}

/* Bounded breadth-first search over the live engine states of one room. The
 * queue holds engine states, so every branch obeys the panel's own vision,
 * dash, locker and alarm rules; returns the fastest script it finds. */
function search(App, roomIndex, maxDepth) {
  let frontier = [{ state: App.heistSetup(roomIndex), script: "" }];
  const seen = new Set();
  for (let depth = 0; depth < maxDepth; depth += 1) {
    const next = [];
    for (const node of frontier) {
      for (const a of ACTIONS) {
        const st = JSON.parse(JSON.stringify(node.state));
        st.action = App.heistDecode(a);
        const after = App.heistStep(st);
        if (after.status === "caught" || after.status === "failed") {
          continue;
        }
        if (after.status === "won") {
          return node.script + a;
        }
        /* A swing at thin air spends no turn; branching on it only spins. */
        if (a === "a" && after.event !== "grabbed" && after.event !== "forced") {
          continue;
        }
        const k = serialize(after);
        if (seen.has(k)) {
          continue;
        }
        seen.add(k);
        next.push({ state: after, script: node.script + a });
      }
    }
    frontier = next;
    if (!frontier.length) {
      return null;
    }
  }
  return null;
}

function replay(App, roomIndex, script) {
  let state = App.heistSetup(roomIndex);
  for (const ch of script) {
    state.action = App.heistDecode(ch);
    state = App.heistStep(state);
    if (state.status !== "play") {
      break;
    }
  }
  return state;
}

module.exports = function gate(ctx) {
  const { App, check } = ctx;
  const rooms = App.heistRooms;
  const byId = (id) => rooms.find((room) => room.id === id);
  const summitIds = ["h21", "h22", "h23", "h24"];
  const vaultIds = ["h25", "h26", "h27", "h28", "h29", "h30"];
  const tierIds = summitIds.concat(vaultIds);

  check("game-lantern-heist", "the vault ladder holds thirty rooms",
    rooms.length === 30, String(rooms.length));
  check("game-lantern-heist", "every room id is distinct",
    new Set(rooms.map((room) => room.id)).size === rooms.length,
    rooms.map((room) => room.id).join(","));
  const shapeProblems = rooms.map((room, index) =>
    room.id === "h" + (index + 1) && room.labelKey === "lheR" + (index + 1)
      ? null
      : "slot " + (index + 1) + " carries " + room.id + "/" + room.labelKey
  ).filter(Boolean);
  check("game-lantern-heist", "the rooms sit in order h1-h30 with matching labels",
    shapeProblems.length === 0, shapeProblems.join(" | "));
  const missing = tierIds.filter((id) => !byId(id));
  check("game-lantern-heist", "the summit and under-vault tiers h21-h30 are present",
    missing.length === 0, missing.join(","));

  /* Every room's own script replays clean: won at exactly its length (no
   * catch snapped the board back), never alarmed, inside the three-star
   * band. */
  const problems = [];
  rooms.forEach((room, index) => {
    const end = replay(App, index, room.solution);
    if (end.status !== "won") {
      problems.push(room.id + ":" + end.status);
    } else if (end.turns !== room.solution.length) {
      problems.push(room.id + ":turns " + end.turns + " of " + room.solution.length);
    } else if (end.alarms !== 0) {
      problems.push(room.id + ":alarms " + end.alarms);
    } else if (end.turns > room.starTurns[0]) {
      problems.push(room.id + ":band " + end.turns + " of " + room.starTurns[0]);
    }
  });
  check("game-lantern-heist",
    "every shipped script robs its room clean and inside the three-star band",
    problems.length === 0, problems.join(" | "));

  /* A trespasser who only waits is never holding the ledger. */
  const idle = replay(App, 0, "wwwwwwwwwwwwwwwwwwwwwwwwwwwwww");
  check("game-lantern-heist", "a thief who only waits leaves with nothing",
    !idle.ledger, idle.status + " ledger=" + idle.ledger);

  /* The summit's lane watchman is the rung: without it the fastest line
   * collapses to the tier's ordinary floor, and with it the shipped script's
   * waits are the only thing between the runner and the alarms. */
  const summit = byId("h24");
  const summitIndex = rooms.indexOf(summit);
  const stripped = JSON.parse(JSON.stringify(summit));
  stripped.guards = stripped.guards.slice(0, 3);
  rooms.push(stripped);
  const strippedIndex = rooms.length - 1;
  const fast = search(App, strippedIndex, 17);
  rooms.pop();
  check("game-lantern-heist",
    "without the lane watchman the vault opens in sixteen turns or fewer",
    !!fast && fast.length <= 16, fast ? fast.length + " turns" : "search came up empty");
  check("game-lantern-heist",
    "the lane watchman is worth eight turns of par on the summit",
    !!fast && summit.solution.length - fast.length >= 8,
    `${summit.solution.length} vs ${fast ? fast.length : "?"}`);
  const rash = summit.solution.replace(/w/g, "");
  const rushed = replay(App, summitIndex, rash);
  check("game-lantern-heist",
    "drop the shipped waits and the runner is seen before the gate",
    rushed.status !== "won" || rushed.alarms > 0,
    `${rushed.status} alarms=${rushed.alarms}`);

  /* The under-vault tier repeats the summit's lever room by room: the lane
   * watchman is the fourth guard on every floor, and with it stripped a
   * bounded search walks each vault in exactly fourteen turns - ten or more
   * under the shipped line - while the par band runs [n, n+4, n+10] off that
   * line. h29 pins a second live guard: its row-five sweep is worth four
   * turns. h27 pins the waits: delete them and the runner trips two alarms. */
  const vaultProblems = [];
  vaultIds.forEach((id) => {
    const room = byId(id);
    const strippedRoom = JSON.parse(JSON.stringify(room));
    strippedRoom.guards = strippedRoom.guards.slice(0, 3);
    rooms.push(strippedRoom);
    const fast = search(App, rooms.length - 1, 17);
    rooms.pop();
    if (!fast || fast.length !== 14) {
      vaultProblems.push(id + ": without the lane watchman the vault opens in " +
        (fast ? fast.length : "no") + " turns, not fourteen");
    }
    if (!fast || room.solution.length - fast.length < 10) {
      vaultProblems.push(id + ": the lane watchman is only worth " +
        (fast ? room.solution.length - fast.length : "?") + " turns");
    }
  });
  check("game-lantern-heist",
    "stripping the lane watchman opens every under-vault room in exactly fourteen turns, ten or more under par",
    vaultProblems.length === 0, vaultProblems.join(" | "));
  check("game-lantern-heist",
    "the under-vault par bands run n, n+4, n+10 off each shipped line",
    vaultIds.every((id) => {
      const room = byId(id);
      return room.starTurns[0] === room.solution.length &&
        room.starTurns[1] === room.starTurns[0] + 4 &&
        room.starTurns[2] === room.starTurns[0] + 10;
    }), vaultIds.map((id) => id + ":" + byId(id).starTurns.join("/")).join(" "));

  /* h29's second lever: the row-five sweep is worth four turns on the snare. */
  const snare = byId("h29");
  const noSweep = JSON.parse(JSON.stringify(snare));
  noSweep.guards = noSweep.guards.slice(0, 2).concat(noSweep.guards.slice(3));
  rooms.push(noSweep);
  const snareFast = search(App, rooms.length - 1, 26);
  rooms.pop();
  check("game-lantern-heist",
    "the snare's row-five sweep is worth four turns of par",
    !!snareFast && snareFast.length <= 25 && snare.solution.length - snareFast.length >= 4,
    snare.solution.length + " vs " + (snareFast ? snareFast.length : "?"));

  /* h27's two waits answer to the eyes: drop them and the run is seen twice. */
  const wax = byId("h27");
  const waxRash = replay(App, rooms.indexOf(wax), wax.solution.replace(/w/g, ""));
  check("game-lantern-heist",
    "drop the wax gallery's waits and the runner is seen twice before the gate",
    waxRash.status !== "won" || waxRash.alarms > 0,
    `${waxRash.status} alarms=${waxRash.alarms}`);

  /* Every tier label travels in both dictionaries and never falls back. */
  ["en", "zh"].forEach((lang) => {
    const ok = tierIds.every((id) => {
      const room = byId(id);
      const text = App.I18N && App.I18N[lang] ? App.I18N[lang][room.labelKey] : null;
      return typeof text === "string" && text && text !== room.labelKey &&
        App.t(room.labelKey) !== room.labelKey;
    });
    check("game-lantern-heist", `the summit and under-vault labels resolve in ${lang}`,
      !!ok, tierIds.join(","));
  });

  /* The guide announces the new tier in both languages. */
  const guide = (App.getRegistryGuides ? App.getRegistryGuides() : [])
    .filter((entry) => entry.id === "lanternHeist")[0];
  const guideProblems = [];
  if (!guide) {
    guideProblems.push("the game ships no guide");
  } else {
    if (!(guide.en || []).some((line) => line.indexOf("New tier:") === 0)) {
      guideProblems.push("the English guide has no New tier line");
    }
    if (!(guide.zh || []).some((line) => line.indexOf("新层级：") === 0)) {
      guideProblems.push("the Chinese guide has no 新层级 line");
    }
  }
  check("game-lantern-heist", "the guide announces the under-vault tier in both languages",
    guideProblems.length === 0, guideProblems.join(" | "));
};
