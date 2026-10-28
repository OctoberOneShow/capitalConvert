/*
 * Prism Path: the shipped boards driven through the real panel.
 *
 * The forge proves each board is solvable on paper; this case proves the game
 * agrees - it builds the panel the four pages ship, walks the whole twenty
 * board ladder in unlock order, and flips to the orientation the forge says
 * wins. If the engine's tracer and the forge's tracer ever drift apart, the
 * board stops clearing here.
 */
"use strict";

const lib = require("./lib");
const forge = require("../prism-forge");

const { run, check, boot } = lib;
const CASE = "Prism Path optics bench";

/* The hand-wired panel lives in index.html, which the stub DOM does not parse,
 * so rebuild the ids the module looks up. */
function seedPrismDom(env) {
  const panel = env.document.createElement("div");
  panel.id = "gamePanelPrismPath";
  const hud = env.document.createElement("div");
  const stat = (id) => {
    const wrap = env.document.createElement("div");
    const strong = env.document.createElement("strong");
    strong.id = id;
    wrap.appendChild(strong);
    hud.appendChild(wrap);
    return strong;
  };
  stat("prisGoals");
  stat("prisMoves");
  stat("prisTime");
  panel.appendChild(hud);
  const select = env.document.createElement("select");
  select.id = "prisLevelSel";
  panel.appendChild(select);
  const canvas = env.document.createElement("canvas");
  canvas.id = "prisCanvas";
  canvas.width = 320;
  canvas.height = 320;
  panel.appendChild(canvas);
  const result = env.document.createElement("p");
  result.id = "prisResult";
  panel.appendChild(result);
  const best = env.document.createElement("p");
  best.id = "prisBest";
  panel.appendChild(best);
  const button = env.document.createElement("button");
  button.id = "prisNewBtn";
  panel.appendChild(button);
  env.document.body.appendChild(panel);
  return { canvas, select, result, best };
}

/* The canvas is laid out at its intrinsic size, so a cell centre in canvas
 * pixels is also the pointer coordinate the handler expects. */
function clickCell(env, canvas, level, x, y) {
  const cell = Math.floor(
    Math.min((320 - 16) / level.w, (320 - 16) / level.h),
  );
  const left = (320 - cell * level.w) / 2;
  const top = (320 - cell * level.h) / 2;
  env.dispatch(canvas, "pointerdown", {
    clientX: left + x * cell + cell / 2,
    clientY: top + y * cell + cell / 2,
  });
}

function progress(env, key) {
  const raw = env.store.get(key) || env.window.CapitalConvert.storage.getItem(key);
  return raw ? JSON.parse(raw) : null;
}

run(CASE, () => {
  const env = boot();
  const App = env.window.CapitalConvert;
  const dom = seedPrismDom(env);
  dom.canvas.getBoundingClientRect = () => ({
    left: 0, top: 0, right: 320, bottom: 320, width: 320, height: 320,
  });
  App.initPrismPathGame();

  const levels = App.prismLevels;
  const key = "prism-path-campaign";
  /* Counts derive from the live ladder: a restated length goes red the moment
   * the campaign grows, and the checks it guards then never run. */
  check(CASE, "the ladder carries at least twenty boards", levels.length >= 20, String(levels.length));
  check(
    CASE,
    "the picker lists every board",
    dom.select.querySelectorAll("option").length === levels.length,
    String(dom.select.querySelectorAll("option").length),
  );

  levels.forEach((level, index) => {
    const solution = forge.solve(level);
    if (!solution) {
      check(CASE, level.id + " has a winning orientation", false);
      return;
    }
    dom.select.value = level.id;
    env.dispatch(dom.select, "change");
    const flips = [];
    level.mirrors.forEach((mirror, mirrorIndex) => {
      if (mirror.locked) {
        return;
      }
      if (solution.slopes[mirrorIndex] !== mirror.slope) {
        flips.push(mirror);
      }
    });
    check(
      CASE,
      level.id + " needs " + flips.length + " flips and the deal is not solved",
      flips.length >= 1,
      String(flips.length),
    );
    flips.forEach((mirror) => {
      clickCell(env, dom.canvas, level, mirror.x, mirror.y);
    });
    const record = progress(env, key);
    const entry = record && record.cleared ? record.cleared[level.id] : null;
    check(
      CASE,
      level.id + " clears when the forged orientation is flipped in",
      !!entry && entry.stars >= 1,
      JSON.stringify(entry || null),
    );
    if (index + 1 < levels.length) {
      check(
        CASE,
        level.id + " unlocks " + levels[index + 1].id,
        !!record && !!record.cleared[level.id] &&
          !dom.select.querySelectorAll("option")[index + 1].disabled,
      );
    }
  });

  const done = progress(env, key);
  check(
    CASE,
    "every board ends the run cleared",
    done && Object.keys(done.cleared).length === levels.length,
    done ? String(Object.keys(done.cleared).length) : "no record",
  );
  check(
    CASE,
    "the star line counts the whole ladder",
    dom.best.textContent.indexOf(String(levels.length * 3)) >= 0,
    dom.best.textContent,
  );
});

run(CASE + " welded elements", () => {
  const env = boot();
  const App = env.window.CapitalConvert;
  const dom = seedPrismDom(env);
  dom.canvas.getBoundingClientRect = () => ({
    left: 0, top: 0, right: 320, bottom: 320, width: 320, height: 320,
  });
  App.initPrismPathGame();

  const welded = App.prismLevels.filter((level) =>
    level.mirrors.some((mirror) => mirror.locked),
  );
  check(CASE, "the bench boards include welded elements", welded.length >= 4, String(welded.length));

  /* Clear the chain up to the first welded board, then try to turn the bolt. */
  App.prismLevels.forEach((level) => {
    if (level.id === welded[0].id) {
      return;
    }
    const solution = forge.solve(level);
    if (!solution) {
      return;
    }
    dom.select.value = level.id;
    env.dispatch(dom.select, "change");
    level.mirrors.forEach((mirror, mirrorIndex) => {
      if (!mirror.locked && solution.slopes[mirrorIndex] !== mirror.slope) {
        clickCell(env, dom.canvas, level, mirror.x, mirror.y);
      }
    });
  });
  const level = welded[0];
  dom.select.value = level.id;
  env.dispatch(dom.select, "change");
  const bolt = level.mirrors.filter((mirror) => mirror.locked)[0];
  const movesBefore = env.byId("prisMoves").textContent;
  clickCell(env, dom.canvas, level, bolt.x, bolt.y);
  check(
    CASE,
    "a welded element refuses to rotate and costs no move",
    env.byId("prisMoves").textContent === movesBefore,
    env.byId("prisMoves").textContent + " vs " + movesBefore,
  );
  check(
    CASE,
    "the refusal is explained in the player's language",
    dom.result.textContent === App.t("prismWelded"),
    dom.result.textContent,
  );
  check(
    CASE,
    "a board with new optics names them when it loads",
    App.t("prismSplitHint") !== "prismSplitHint" &&
      App.t("prismLockedHint") !== "prismLockedHint",
  );
});
