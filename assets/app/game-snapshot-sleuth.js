/* Snapshot Sleuth - the picture-hunting mini-game in the shared game drawer.
 * A wall of tiles all shows the same hand-drawn scene, and exactly one photo
 * has been tampered with: recoloured in the Darkroom, mirrored in the Mirror
 * Hall, tilted on a crooked tripod, or faded into the fine print. Finding it
 * keeps a streak alive, missing it costs one of three hearts, and clearing a
 * zone's rounds banks stars and unlocks the next zone. The scenes are painted
 * in-module as SVG and applied as image backgrounds, so the game needs no
 * markup in the four HTML pages and no bundled pictures. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  var t = App.t;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  var createCampaign = App.createCampaign;
  var fillCampaignPicker = App.fillCampaignPicker;
  var starsFor = App.starsFor;

  var ssMaxHearts = 3;
  /* The ladder: fifty graded levels. The forgery styles climb in five
   * decades - loud recolours, mirror flips, subtler colour casts, crooked
   * tripods, then faint fades - and the treatment eases a little with
   * every level inside a decade. The grid grows from 3x3 toward 7x7, and
   * names compose from five style tiers across ten venues. */
  var ssZoneAdjectives = [
    "ssAdjDarkroom",
    "ssAdjMirrored",
    "ssAdjDusky",
    "ssAdjCrooked",
    "ssAdjFaded",
  ];
  var ssZoneNouns = [
    "ssNounPostcards",
    "ssNounStudio",
    "ssNounGallery",
    "ssNounExhibit",
    "ssNounVault",
    "ssNounAttic",
    "ssNounHarbor",
    "ssNounRooftop",
    "ssNounGreenhouse",
    "ssNounArchive",
  ];

  function ssBuildZones() {
    var modes = ["hue", "flip", "hue", "tilt", "faint"];
    var bases = [150, 0, 48, 15, 18];
    var jitters = [0.2, 0, 0.25, 0.3, 0.3];
    var zones = [];
    for (var index = 1; index <= 50; index += 1) {
      var tier = Math.floor((index - 1) / 10);
      zones.push({
        id: "ss" + index,
        adjKey: ssZoneAdjectives[tier],
        nounKey: ssZoneNouns[(index - 1) % 10],
        side: Math.min(7, 3 + Math.floor((index - 1) / 12)),
        rounds: 5 + Math.floor((index - 1) / 12) + (index % 10 === 0 ? 1 : 0),
        mode: modes[tier],
        amount: bases[tier] * (1 - 0.05 * ((index - 1) % 10)),
        jitter: jitters[tier],
      });
    }
    return zones;
  }

  var ssZones = ssBuildZones();
  /* Stars per cleared zone, read from mistakes spent: none -> 3 stars,
   * one -> 2, two -> 1. Three misses ends the run, so bands never lie. */
  var ssStarBands = [0, 1, 2];

  function snapWrap(hue) {
    return ((hue % 360) + 360) % 360;
  }

  /* One palette paints a whole scene: the sky leads, the land bands follow
   * it around the wheel, the accent cuts across, and the sun keeps its glow. */
  function snapPalette(hue) {
    return {
      sky: "hsl(" + Math.round(snapWrap(hue)) + ", 72%, 82%)",
      back: "hsl(" + Math.round(snapWrap(hue + 16)) + ", 46%, 70%)",
      mid: "hsl(" + Math.round(snapWrap(hue + 30)) + ", 44%, 55%)",
      front: "hsl(" + Math.round(snapWrap(hue + 44)) + ", 50%, 36%)",
      accent: "hsl(" + Math.round(snapWrap(hue + 190)) + ", 62%, 55%)",
      glow: "hsl(45, 92%, 72%)",
      paper: "hsl(" + Math.round(snapWrap(hue)) + ", 60%, 95%)",
    };
  }

  function snapSvg(P, inner) {
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
      '<rect width="100" height="100" fill="' + P.sky + '"/>' +
      inner +
      "</svg>"
    );
  }

  /* Every scene is deliberately lopsided - the sun, the birds and the doors
   * all sit to one side - so a mirrored print never passes as the original. */

  function snapSceneHills(P) {
    return (
      '<circle cx="74" cy="22" r="9" fill="' + P.glow + '"/>' +
      '<path d="M22 26q3-3 6 0q3-3 6 0" stroke="' + P.front + '" stroke-width="1.6" fill="none" stroke-linecap="round"/>' +
      '<path d="M38 18q2.4-2.4 4.8 0q2.4-2.4 4.8 0" stroke="' + P.front + '" stroke-width="1.4" fill="none" stroke-linecap="round"/>' +
      '<path d="M0 60Q30 48 55 56T100 52L100 100 0 100Z" fill="' + P.back + '"/>' +
      '<path d="M0 78Q35 66 70 74T100 72L100 100 0 100Z" fill="' + P.mid + '"/>' +
      '<rect y="88" width="100" height="12" fill="' + P.front + '"/>' +
      '<rect x="15" y="74" width="2.6" height="12" fill="' + P.front + '"/>' +
      '<circle cx="16.3" cy="70" r="5.5" fill="' + P.accent + '"/>' +
      '<circle cx="12.6" cy="74" r="3.6" fill="' + P.accent + '"/>'
    );
  }

  function snapSceneSail(P) {
    return (
      '<circle cx="22" cy="18" r="8" fill="' + P.glow + '"/>' +
      '<path d="M74 18q2.5-2.5 5 0q2.5-2.5 5 0" stroke="' + P.front + '" stroke-width="1.5" fill="none" stroke-linecap="round"/>' +
      '<rect y="62" width="100" height="38" fill="' + P.mid + '"/>' +
      '<path d="M8 80q5-3 10 0q5 3 10 0" stroke="' + P.paper + '" stroke-width="1.5" fill="none" stroke-linecap="round"/>' +
      '<path d="M58 90q5-3 10 0q5 3 10 0" stroke="' + P.paper + '" stroke-width="1.5" fill="none" stroke-linecap="round"/>' +
      '<path d="M34 62L70 62L64 72L40 72Z" fill="' + P.front + '"/>' +
      '<rect x="51.4" y="30" width="1.6" height="32" fill="' + P.front + '"/>' +
      '<path d="M53 32L53 60L72 60Z" fill="' + P.paper + '"/>' +
      '<path d="M50 36L50 60L36 60Z" fill="' + P.accent + '"/>' +
      '<path d="M53 30l8 2.2-8 2.2Z" fill="' + P.accent + '"/>'
    );
  }

  function snapSceneBalloon(P) {
    return (
      '<circle cx="18" cy="16" r="7" fill="' + P.glow + '"/>' +
      '<ellipse cx="24" cy="36" rx="9" ry="4" fill="' + P.paper + '"/>' +
      '<ellipse cx="31" cy="42" rx="6" ry="3" fill="' + P.paper + '" opacity=".8"/>' +
      '<path d="M76 50q2-2 4 0q2-2 4 0" stroke="' + P.front + '" stroke-width="1.4" fill="none" stroke-linecap="round"/>' +
      '<path d="M50 14C64 14 72 26 72 38C72 50 62 56 56 60L44 60C38 56 28 50 28 38C28 26 36 14 50 14Z" fill="' + P.accent + '"/>' +
      '<path d="M50 14C44 22 42 30 42 40C42 50 45 56 47 60L53 60C55 56 58 50 58 40C58 30 56 22 50 14Z" fill="' + P.paper + '"/>' +
      '<line x1="46" y1="60" x2="47" y2="68" stroke="' + P.front + '" stroke-width="1"/>' +
      '<line x1="54" y1="60" x2="53" y2="68" stroke="' + P.front + '" stroke-width="1"/>' +
      '<rect x="45" y="68" width="10" height="8" rx="1.5" fill="' + P.front + '"/>'
    );
  }

  function snapSceneLighthouse(P) {
    return (
      '<rect y="72" width="100" height="28" fill="' + P.mid + '"/>' +
      '<path d="M8 82q4-2.5 8 0q4 2.5 8 0" stroke="' + P.paper + '" stroke-width="1.5" fill="none" stroke-linecap="round"/>' +
      '<ellipse cx="50" cy="76" rx="17" ry="5" fill="' + P.front + '"/>' +
      '<path d="M56 25L96 14L96 30L56 29Z" fill="' + P.glow + '" opacity=".55"/>' +
      '<path d="M45 30L55 30L59 74L41 74Z" fill="' + P.paper + '"/>' +
      '<path d="M43.8 38L56.2 38L57 44L43 44Z" fill="' + P.accent + '"/>' +
      '<path d="M42.6 52L57.4 52L58.2 58L41.8 58Z" fill="' + P.accent + '"/>' +
      '<rect x="46" y="22" width="8" height="8" fill="' + P.glow + '"/>' +
      '<rect x="46" y="22" width="8" height="8" fill="none" stroke="' + P.front + '" stroke-width="1"/>' +
      '<path d="M45 22L55 22L50 15Z" fill="' + P.front + '"/>' +
      '<rect x="47.5" y="66" width="5" height="8" rx="2" fill="' + P.front + '"/>' +
      '<path d="M22 44q2.5-2.5 5 0q2.5-2.5 5 0" stroke="' + P.front + '" stroke-width="1.4" fill="none" stroke-linecap="round"/>'
    );
  }

  function snapSceneCat(P) {
    return (
      '<rect width="100" height="100" fill="' + P.back + '"/>' +
      '<circle cx="70" cy="24" r="10" fill="' + P.glow + '"/>' +
      '<circle cx="74.5" cy="21" r="9" fill="' + P.back + '"/>' +
      '<circle cx="18" cy="16" r="1.1" fill="' + P.paper + '"/>' +
      '<circle cx="30" cy="34" r="1.1" fill="' + P.paper + '"/>' +
      '<circle cx="12" cy="46" r="1.1" fill="' + P.paper + '"/>' +
      '<circle cx="86" cy="52" r="1.1" fill="' + P.paper + '"/>' +
      '<circle cx="48" cy="12" r="1.1" fill="' + P.paper + '"/>' +
      '<rect y="64" width="100" height="36" fill="' + P.mid + '"/>' +
      '<rect y="64" width="100" height="2.5" fill="' + P.front + '"/>' +
      '<rect x="62" y="46" width="7" height="20" fill="' + P.front + '"/>' +
      '<rect x="60.5" y="44" width="10" height="3.2" fill="' + P.front + '"/>' +
      '<circle cx="69" cy="40" r="3" fill="' + P.paper + '" opacity=".8"/>' +
      '<circle cx="73" cy="34" r="2.4" fill="' + P.paper + '" opacity=".6"/>' +
      '<circle cx="76" cy="29" r="1.8" fill="' + P.paper + '" opacity=".4"/>' +
      '<path d="M33 50L35 45L37 50Z" fill="' + P.front + '"/>' +
      '<path d="M38 50L40 45L42 50Z" fill="' + P.front + '"/>' +
      '<circle cx="37.5" cy="53" r="4.6" fill="' + P.front + '"/>' +
      '<path d="M31 64C31 56 34 55 37.5 55C42 55 44 57 44 64Z" fill="' + P.front + '"/>'
    );
  }

  function snapSceneFlower(P) {
    return (
      '<circle cx="30" cy="30" r="26" fill="' + P.back + '" opacity=".6"/>' +
      '<path d="M50 78C50 62 49 52 50 44" stroke="' + P.front + '" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
      '<path d="M50 62C42 60 38 54 40 50C46 50 50 55 50 62Z" fill="' + P.mid + '"/>' +
      '<path d="M50 54C57 52 60 47 58 44C53 45 50 49 50 54Z" fill="' + P.mid + '"/>' +
      '<circle cx="61" cy="34" r="6" fill="' + P.glow + '"/>' +
      '<circle cx="55.5" cy="43" r="6" fill="' + P.glow + '"/>' +
      '<circle cx="44.5" cy="43" r="6" fill="' + P.glow + '"/>' +
      '<circle cx="39" cy="34" r="6" fill="' + P.glow + '"/>' +
      '<circle cx="44.5" cy="25" r="6" fill="' + P.glow + '"/>' +
      '<circle cx="55.5" cy="25" r="6" fill="' + P.glow + '"/>' +
      '<circle cx="50" cy="34" r="4.5" fill="' + P.accent + '"/>' +
      '<rect x="38" y="73" width="24" height="5" rx="2" fill="' + P.front + '"/>' +
      '<path d="M40 78L60 78L57 91L43 91Z" fill="' + P.accent + '"/>' +
      '<path d="M72 26l7-4.5v9Z" fill="' + P.front + '"/>' +
      '<path d="M72 26l-7-4.5v9Z" fill="' + P.front + '" opacity=".75"/>'
    );
  }

  function snapSceneRocket(P) {
    return (
      '<rect width="100" height="100" fill="' + P.back + '"/>' +
      '<circle cx="16" cy="20" r="1.1" fill="' + P.paper + '"/>' +
      '<circle cx="60" cy="14" r="1.1" fill="' + P.paper + '"/>' +
      '<circle cx="84" cy="58" r="1.1" fill="' + P.paper + '"/>' +
      '<circle cx="26" cy="52" r="1.1" fill="' + P.paper + '"/>' +
      '<circle cx="50" cy="30" r="1.1" fill="' + P.paper + '"/>' +
      '<circle cx="76" cy="28" r="8" fill="' + P.accent + '"/>' +
      '<ellipse cx="76" cy="28" rx="13" ry="3.5" fill="none" stroke="' + P.paper + '" stroke-width="1.5"/>' +
      '<path d="M34 52L26 66L34 63Z" fill="' + P.accent + '"/>' +
      '<path d="M46 52L54 66L46 63Z" fill="' + P.accent + '"/>' +
      '<ellipse cx="40" cy="42" rx="7" ry="16" fill="' + P.paper + '"/>' +
      '<path d="M40 26C44 30 46 34 46.5 38L33.5 38C34 34 36 30 40 26Z" fill="' + P.accent + '"/>' +
      '<circle cx="40" cy="44" r="3.2" fill="' + P.back + '"/>' +
      '<circle cx="40" cy="44" r="3.2" fill="none" stroke="' + P.paper + '" stroke-width="1.4"/>' +
      '<path d="M35 60Q40 76 45 60Q42.5 67 40 63Q37.5 67 35 60Z" fill="' + P.glow + '"/>'
    );
  }

  function snapSceneCity(P) {
    return (
      '<circle cx="24" cy="18" r="7" fill="' + P.glow + '"/>' +
      '<circle cx="44" cy="14" r="1.1" fill="' + P.paper + '"/>' +
      '<circle cx="88" cy="12" r="1.1" fill="' + P.paper + '"/>' +
      '<rect x="6" y="46" width="14" height="54" fill="' + P.back + '"/>' +
      '<rect x="22" y="38" width="16" height="62" fill="' + P.mid + '"/>' +
      '<rect x="42" y="52" width="13" height="48" fill="' + P.front + '"/>' +
      '<rect x="57" y="34" width="17" height="66" fill="' + P.mid + '"/>' +
      '<rect x="76" y="48" width="18" height="52" fill="' + P.front + '"/>' +
      '<rect x="26" y="44" width="3" height="4" fill="' + P.glow + '"/>' +
      '<rect x="31" y="44" width="3" height="4" fill="' + P.glow + '"/>' +
      '<rect x="26" y="53" width="3" height="4" fill="' + P.glow + '"/>' +
      '<rect x="31" y="62" width="3" height="4" fill="' + P.glow + '"/>' +
      '<rect x="60" y="40" width="3" height="4" fill="' + P.glow + '"/>' +
      '<rect x="65" y="40" width="3" height="4" fill="' + P.glow + '"/>' +
      '<rect x="70" y="40" width="3" height="4" fill="' + P.glow + '"/>' +
      '<rect x="60" y="49" width="3" height="4" fill="' + P.glow + '"/>' +
      '<rect x="70" y="58" width="3" height="4" fill="' + P.glow + '"/>' +
      '<line x1="65" y1="34" x2="65" y2="24" stroke="' + P.front + '" stroke-width="1.5"/>' +
      '<circle cx="65" cy="23" r="1.6" fill="' + P.accent + '"/>'
    );
  }

  var snapScenes = [
    snapSceneHills,
    snapSceneSail,
    snapSceneBalloon,
    snapSceneLighthouse,
    snapSceneCat,
    snapSceneFlower,
    snapSceneRocket,
    snapSceneCity,
  ];

  /* The forgery's treatment, drawn fresh each round so no two boards lie
   * the same way even inside one zone. */
  function snapMutation(zoneDef) {
    var sign = Math.random() < 0.5 ? -1 : 1;
    var jolt = 1 + (Math.random() * 2 - 1) * zoneDef.jitter;
    if (zoneDef.mode === "flip") {
      return { transform: "scaleX(-1)" };
    }
    if (zoneDef.mode === "tilt") {
      return {
        transform: "rotate(" + Math.round(sign * zoneDef.amount * jolt) + "deg)",
      };
    }
    if (zoneDef.mode === "faint") {
      return {
        filter:
          "hue-rotate(" +
          Math.round(sign * zoneDef.amount * jolt) +
          "deg) brightness(0.9)",
      };
    }
    return {
      filter: "hue-rotate(" + Math.round(sign * zoneDef.amount * jolt) + "deg)",
    };
  }

  /* Level names compose per language: "Faded Rose Salon" reads as one
   * name in English, 褪色玫瑰沙龙 in Chinese. */
  function zoneName(def) {
    return t("ssZoneName", { a: t(def.adjKey), b: t(def.nounKey) });
  }

  function initSnapshotSleuthGame(panelEl) {
    if (!panelEl) {
      return;
    }

    var campaign = createCampaign({ key: "snapshot-sleuth-campaign", levels: ssZones, version: 2 });
    var zone = ssZones[Math.max(0, campaign.indexOf(campaign.nextLevelId()))];
    var runActive = false;
    var roundOpen = false;
    var round = 1;
    var hearts = ssMaxHearts;
    var score = 0;
    var streak = 0;
    var mistakes = 0;
    var oddIndex = 0;
    var judged = {};
    var dealId = null;
    var shakeId = null;
    var puffId = null;

    /* --- markup: built with createElement so the headless harness sees it --- */
    var hud = document.createElement("div");
    hud.className = "game-hud";
    var roundEl = document.createElement("strong");
    var heartsEl = document.createElement("strong");
    var scoreEl = document.createElement("strong");
    hud.appendChild(makeStat("ssRoundLabel", roundEl));
    hud.appendChild(makeStat("ssHeartsLabel", heartsEl));
    hud.appendChild(makeStat("ssScoreLabel", scoreEl));

    var board = document.createElement("div");
    board.className = "snap-board";
    board.setAttribute("role", "group");
    board.setAttribute("aria-label", t("ssBoardLabel"));
    var stage = document.createElement("div");
    stage.className = "snap-stage";
    stage.appendChild(board);

    var result = document.createElement("p");
    result.className = "game-result";
    result.setAttribute("role", "status");

    /* Campaign pickers use the shared row/label/select shape the shipped
     * panels use, so the zone menu looks like every other one. */
    var zoneRow = document.createElement("div");
    zoneRow.className = "elements-row";
    var zoneLabel = document.createElement("label");
    zoneLabel.className = "elements-label";
    zoneLabel.setAttribute("for", "ssZoneSel");
    zoneLabel.setAttribute("data-i18n", "ssZoneSelectLabel");
    zoneLabel.textContent = t("ssZoneSelectLabel");
    var zoneSel = document.createElement("select");
    zoneSel.className = "elements-select";
    zoneSel.id = "ssZoneSel";
    zoneRow.appendChild(zoneLabel);
    zoneRow.appendChild(zoneSel);

    var actions = document.createElement("div");
    actions.className = "game-actions";
    var newBtn = document.createElement("button");
    newBtn.type = "button";
    newBtn.className = "primary";
    var newLabel = document.createElement("span");
    newLabel.setAttribute("data-i18n", "ssBtnNew");
    newLabel.textContent = t("ssBtnNew");
    var newContent = document.createElement("span");
    newContent.className = "button-content";
    newContent.appendChild(newLabel);
    newBtn.appendChild(newContent);
    var bestEl = document.createElement("p");
    bestEl.className = "game-best";
    actions.appendChild(newBtn);
    actions.appendChild(bestEl);

    var hint = document.createElement("p");
    hint.className = "game-hint";
    hint.setAttribute("data-i18n", "ssHint");
    hint.textContent = t("ssHint");

    [hud, stage, result, zoneRow, actions, hint].forEach(function (node) {
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

    function refreshPicker() {
      fillCampaignPicker(
        zoneSel,
        campaign,
        function (def) {
          return zoneName(def);
        },
        t("elementsLocked"),
      );
      zoneSel.value = zone.id;
      var best = campaign.best(zone.id);
      bestEl.textContent =
        (best ? t("ssBest", { n: best }) + " \u00b7 " : "") +
        t("campaignStars", {
          n: campaign.totalStars(),
          max: campaign.maxStars(),
        });
    }

    function updateHud() {
      roundEl.textContent = t("ssRoundStat", {
        n: Math.min(round, zone.rounds),
        total: zone.rounds,
      });
      heartsEl.textContent =
        ssGlyphs("\u2665", Math.max(0, hearts)) +
        ssGlyphs("\u2661", Math.max(0, ssMaxHearts - hearts));
      heartsEl.setAttribute("aria-label", t("ssHeartsLeft", { n: hearts }));
      scoreEl.textContent = String(score);
      board.classList.toggle("is-hot", streak >= 3);
    }

    function ssGlyphs(ch, count) {
      var out = "";
      for (var index = 0; index < count; index += 1) {
        out += ch;
      }
      return out;
    }

    /* One wall per round: a fresh scene and palette develop, the forgery
     * gets its treatment, and the photos deal in with a staggered rise. */
    function buildRound() {
      window.clearTimeout(dealId);
      dealId = null;
      board.textContent = "";
      judged = {};
      roundOpen = true;

      var scene = snapScenes[Math.floor(Math.random() * snapScenes.length)];
      var P = snapPalette(Math.random() * 360);
      var uri =
        'url("data:image/svg+xml,' +
        encodeURIComponent(snapSvg(P, scene(P))) +
        '")';
      var mut = snapMutation(zone);
      var total = zone.side * zone.side;
      oddIndex = Math.floor(Math.random() * total);

      board.style.setProperty("--snap-side", String(zone.side));
      for (var index = 0; index < total; index += 1) {
        var tile = document.createElement("button");
        tile.type = "button";
        tile.className = "snap-tile snap-in";
        tile.setAttribute("aria-label", t("ssTileLabel", { n: index + 1 }));
        var art = document.createElement("span");
        art.className = "snap-art";
        art.setAttribute("aria-hidden", "true");
        art.style.setProperty("background-image", uri);
        if (index === oddIndex) {
          if (mut.filter) {
            art.style.setProperty("filter", mut.filter);
          }
          if (mut.transform) {
            art.style.setProperty("transform", mut.transform);
          }
        }
        tile.appendChild(art);
        tile.style.setProperty("animation-delay", index * 14 + "ms");
        tile.addEventListener("click", makeTileHandler(index, tile));
        board.appendChild(tile);
      }
      updateHud();
    }

    function makeTileHandler(index, tile) {
      return function () {
        judge(index, tile);
      };
    }

    function judge(index, tile) {
      if (!runActive || !roundOpen || judged[index]) {
        return;
      }
      /* The deal stagger must not delay the pop or the shake. */
      tile.style.removeProperty("animation-delay");
      judged[index] = true;
      if (index === oddIndex) {
        hit(tile);
      } else {
        miss(tile);
      }
    }

    function hit(tile) {
      roundOpen = false;
      streak += 1;
      var gained = Math.min(300, 100 + (streak - 1) * 25);
      score += gained;
      round += 1;
      tile.classList.add("is-hit");
      floatPoints(tile, "+" + gained);
      updateHud();
      if (streak >= 3) {
        result.textContent =
          t("ssHit", { n: gained }) + " " + t("ssStreak", { n: streak });
      } else {
        result.textContent = t("ssHit", { n: gained });
      }
      if (round > zone.rounds) {
        zoneCleared();
      } else {
        dealId = window.setTimeout(buildRound, 480);
      }
    }

    function miss(tile) {
      hearts -= 1;
      streak = 0;
      mistakes += 1;
      tile.classList.add("is-miss");
      board.classList.remove("is-shaking");
      void board.offsetWidth;
      board.classList.add("is-shaking");
      window.clearTimeout(shakeId);
      shakeId = window.setTimeout(function () {
        board.classList.remove("is-shaking");
      }, 440);
      updateHud();
      if (hearts <= 0) {
        runOut();
      } else {
        result.textContent =
          hearts === 1 ? t("ssLastHeart") : t("ssWrong");
      }
    }

    /* The point award floats up from the photo it was earned on. */
    function floatPoints(tile, text) {
      var puff = document.createElement("span");
      puff.className = "snap-float";
      puff.textContent = text;
      var cx = (tile.offsetLeft || 0) + (tile.offsetWidth || 0) / 2;
      var cy = (tile.offsetTop || 0) + (tile.offsetHeight || 0) / 2;
      puff.style.setProperty("left", cx + "px");
      puff.style.setProperty("top", cy + "px");
      board.appendChild(puff);
      window.clearTimeout(puffId);
      puffId = window.setTimeout(function () {
        if (puff.parentNode) {
          puff.parentNode.removeChild(puff);
        }
      }, 920);
    }

    /* Out of hearts: the run ends and the forgery lights up so the miss
     * becomes a lesson. Nothing is recorded on a failed run. */
    function runOut() {
      runActive = false;
      roundOpen = false;
      window.clearTimeout(dealId);
      dealId = null;
      var tiles = board.querySelectorAll(".snap-tile");
      if (tiles[oddIndex]) {
        tiles[oddIndex].classList.add("is-reveal");
      }
      result.textContent = t("ssRunOut", {
        n: score,
        r: Math.min(round - 1, zone.rounds),
      });
    }

    function zoneCleared() {
      runActive = false;
      var starsWon = starsFor(mistakes, ssStarBands, "low");
      var outcome = campaign.record(zone.id, {
        stars: starsWon,
        best: score,
        better: "high",
      });
      var message = t("ssCleared", {
        name: zoneName(zone),
        s: starsWon,
        n: score,
      });
      if (outcome.isBest) {
        message += " " + t("newBest");
      }
      if (outcome.unlockedNext) {
        message += " " + t("ssNextZone");
      } else if (campaign.clearedCount() === ssZones.length) {
        message += " " + t("ssAllZones");
      }
      result.textContent = message;
      logAction(t("logSnapshotSleuth", { name: zoneName(zone), s: starsWon, n: score }));
      var rect = newBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear || starsWon === 3);
      refreshPicker();
    }

    function startRun() {
      window.clearTimeout(dealId);
      dealId = null;
      round = 1;
      hearts = ssMaxHearts;
      score = 0;
      streak = 0;
      mistakes = 0;
      runActive = true;
      result.textContent = t("ssPrompt", {
        name: zoneName(zone),
        n: zone.rounds,
      });
      refreshPicker();
      buildRound();
    }

    newBtn.addEventListener("click", startRun);

    zoneSel.addEventListener("change", function () {
      var index = campaign.indexOf(zoneSel.value);
      if (index >= 0 && campaign.isUnlocked(zoneSel.value)) {
        zone = ssZones[index];
        startRun();
      } else {
        zoneSel.value = zone.id;
      }
    });

    App.quietResetSnapshotSleuth = function () {
      window.clearTimeout(dealId);
      window.clearTimeout(shakeId);
      window.clearTimeout(puffId);
      dealId = null;
      shakeId = null;
      puffId = null;
      startRun();
    };

    startRun();
  }

  /* Bilingual copy travels with the game: addStrings only fills keys i18n.js
   * does not already own, so the shared dictionary stays authoritative. */
  App.addStrings({
    en: {
      "tabSnapshotSleuth": "Snapshot Sleuth",
      "ssRoundLabel": "Round",
      "ssHeartsLabel": "Hearts",
      "ssScoreLabel": "Score",
      "ssZoneSelectLabel": "Choose a level",
      "ssZoneName": "{a} {b}",
      "ssAdjDarkroom": "Darkroom",
      "ssAdjMirrored": "Mirrored",
      "ssAdjDusky": "Dusky",
      "ssAdjCrooked": "Crooked",
      "ssAdjFaded": "Faded",
      "ssNounPostcards": "Postcards",
      "ssNounStudio": "Studio",
      "ssNounGallery": "Gallery",
      "ssNounExhibit": "Exhibit",
      "ssNounVault": "Vault",
      "ssNounAttic": "Attic",
      "ssNounHarbor": "Harbor",
      "ssNounRooftop": "Rooftop",
      "ssNounGreenhouse": "Greenhouse",
      "ssNounArchive": "Archive",
      "ssRoundStat": "{n}/{total}",
      "ssHeartsLeft": "{n} of 3 hearts left",
      "ssBtnNew": "New run",
      "ssPrompt": "{name}: one photo has been tampered with. {n} rounds, three hearts.",
      "ssHit": "+{n} points.",
      "ssStreak": "{n} in a row!",
      "ssWrong": "Not that one - a heart fades.",
      "ssLastHeart": "Last heart - make it count.",
      "ssRunOut": "Out of hearts at {n} points after {r} rounds. The forged photo is lit.",
      "ssCleared": "{name} cleared - {s} stars, {n} points.",
      "ssNextZone": "Next level unlocked.",
      "ssAllZones": "All fifty levels are solved.",
      "ssBest": "Best {n}",
      "ssBoardLabel": "Photo wall - exactly one photo has been tampered with",
      "ssTileLabel": "Photo {n}",
      "ssHint": "Watch the horizon, the sun and which way things face - forgeries always slip somewhere.",
      "logSnapshotSleuth": "Solved {name} for {s} stars and {n} points",
    },
    zh: {
      "tabSnapshotSleuth": "快照神探",
      "ssRoundLabel": "回合",
      "ssHeartsLabel": "红心",
      "ssScoreLabel": "得分",
      "ssZoneSelectLabel": "选择等级",
      "ssZoneName": "{a}{b}",
      "ssAdjDarkroom": "暗房",
      "ssAdjMirrored": "镜面",
      "ssAdjDusky": "暮色",
      "ssAdjCrooked": "歪斜",
      "ssAdjFaded": "褪色",
      "ssNounPostcards": "明信片",
      "ssNounStudio": "摄影棚",
      "ssNounGallery": "画廊",
      "ssNounExhibit": "展览",
      "ssNounVault": "密室",
      "ssNounAttic": "阁楼",
      "ssNounHarbor": "海港",
      "ssNounRooftop": "天台",
      "ssNounGreenhouse": "暖房",
      "ssNounArchive": "档案馆",
      "ssRoundStat": "{n}/{total}",
      "ssHeartsLeft": "还剩 {n} 颗红心",
      "ssBtnNew": "重新开始",
      "ssPrompt": "「{name}」：有一张照片被动了手脚。共 {n} 轮，三颗红心。",
      "ssHit": "+{n} 分。",
      "ssStreak": "连中 {n} 张！",
      "ssWrong": "不是这张 - 熄灭一颗红心。",
      "ssLastHeart": "最后一颗红心 - 稳住。",
      "ssRunOut": "红心用尽：{r} 轮后共 {n} 分。伪造的照片已点亮。",
      "ssCleared": "「{name}」通关 - {s} 星，{n} 分。",
      "ssNextZone": "下一级已解锁。",
      "ssAllZones": "五十级全部告破。",
      "ssBest": "最佳 {n}",
      "ssBoardLabel": "照片墙 - 恰好有一张照片被动了手脚",
      "ssTileLabel": "第 {n} 张照片",
      "ssHint": "留意地平线、太阳和物体的朝向 - 赝品总会露出破绽。",
      "logSnapshotSleuth": "以 {s} 星、{n} 分侦破「{name}」",
    },
  });

  App.registerGame({
    name: "snapshotSleuth",
    tabKey: "tabSnapshotSleuth",
    init: initSnapshotSleuthGame,
    guide: {
      svg:
        '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="6" y="6" width="108" height="64" rx="5" fill="rgba(30,41,59,.75)" stroke="rgba(148,163,184,.45)"/>' +
        '<rect x="16" y="14" width="24" height="20" rx="2" fill="hsl(205,60%,72%)"/>' +
        '<line x1="16" y1="27" x2="40" y2="27" stroke="hsl(205,45%,40%)" stroke-width="2"/>' +
        '<circle cx="24" cy="20" r="2.5" fill="#fbbf24"/>' +
        '<rect x="58" y="14" width="24" height="20" rx="2" fill="hsl(205,60%,72%)"/>' +
        '<line x1="60" y1="30" x2="80" y2="19" stroke="hsl(205,45%,40%)" stroke-width="2"/>' +
        '<circle cx="74" cy="18" r="2.5" fill="#fbbf24"/>' +
        '<rect x="57" y="13" width="26" height="22" rx="2.5" fill="none" stroke="#fbbf24" stroke-width="1.6"/>' +
        '<rect x="16" y="42" width="24" height="20" rx="2" fill="hsl(330,55%,74%)"/>' +
        '<line x1="16" y1="55" x2="40" y2="55" stroke="hsl(330,40%,42%)" stroke-width="2"/>' +
        '<circle cx="24" cy="48" r="2.5" fill="#fbbf24"/>' +
        '<rect x="58" y="42" width="24" height="20" rx="2" fill="hsl(45,60%,74%)"/>' +
        '<line x1="58" y1="55" x2="82" y2="55" stroke="hsl(45,45%,42%)" stroke-width="2"/>' +
        '<circle cx="76" cy="48" r="2.5" fill="#fbbf24"/></svg>',
      en: [
        "Aim: a wall of photos shares one scene - exactly one has been tampered with. Find the forgery.",
        "Action: tap the photo that looks off; a fresh wall develops the moment you are right.",
        "Rule: streaks raise each award, but a wrong tap costs one of three hearts.",
        "Watch out: the Darkroom recolours, the Mirror Hall flips, and deeper zones tilt or fade the print.",
        "Scoring: clear every round in a zone to bank stars - flawless runs earn three - and unlock the next zone.",
      ],
      zh: [
        "目标：一整面墙的照片出自同一场景——恰好有一张被动了手脚。找出赝品。",
        "操作：点击看起来不对的那张照片，答对后立刻冲洗下一面照片墙。",
        "规则：连中会提高每次得分，点错则熄灭一颗红心（共三颗）。",
        "小心：暗房会整体变色，镜厅会左右镜像，更深的区域还会倾斜或褪色。",
        "计分：清空整区轮次即可获得星星——零失误得三星——并解锁下一区域。",
      ],
    },
  });

  /* Exported for the other modules. */
  App.initSnapshotSleuthGame = initSnapshotSleuthGame;
})(window.CapitalConvert = window.CapitalConvert || {});
