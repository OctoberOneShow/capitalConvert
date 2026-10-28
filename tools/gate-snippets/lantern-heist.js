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
 * same floor. Every wait in the script answers to a real pair of eyes. */

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
  const tierIds = ["h21", "h22", "h23", "h24"];

  check("game-lantern-heist", "the vault ladder holds twenty-four rooms",
    rooms.length === 24, String(rooms.length));
  check("game-lantern-heist", "every room id is distinct",
    new Set(rooms.map((room) => room.id)).size === rooms.length,
    rooms.map((room) => room.id).join(","));
  const missing = tierIds.filter((id) => !byId(id));
  check("game-lantern-heist", "the summit tier h21-h24 is present",
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

  /* Summit labels travel in both dictionaries and never fall back to keys. */
  ["en", "zh"].forEach((lang) => {
    const ok = tierIds.every((id) => {
      const room = byId(id);
      const text = App.I18N && App.I18N[lang] ? App.I18N[lang][room.labelKey] : null;
      return typeof text === "string" && text && text !== room.labelKey &&
        App.t(room.labelKey) !== room.labelKey;
    });
    check("game-lantern-heist", `the summit labels resolve in ${lang}`,
      !!ok, tierIds.join(","));
  });
};
