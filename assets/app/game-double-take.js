/* Double Take - the classic spot-the-difference mini-game in the shared game
 * drawer. Every round develops a pair of near-identical illustrated scenes;
 * the pair hides a handful of differences - a moved mug, a missing star, a
 * recoloured awning, an extra apple - and tapping the spot on either photo
 * marks it on both. Streaks raise the award, misses cost hearts, and cleared
 * zones bank stars on the same unlock-chain ladder the other games use. The
 * scenes are painted in-module as SVG and applied as image backgrounds, so
 * the game needs no markup in the four HTML pages and no bundled pictures. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  var t = App.t;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  var createCampaign = App.createCampaign;
  var fillCampaignPicker = App.fillCampaignPicker;
  var starsFor = App.starsFor;

  var dtMaxHearts = 3;
  var dtMaxHints = 2;
  /* The ladder: fifty graded levels. Difficulty climbs on three axes -
   * how many differences each pair hides, which forgeries the dealer
   * prefers (bold edits open the run, the subtle ones take over), and a
   * fourth round on every milestone level. Names compose from five tier
   * adjectives across ten venues, so all fifty read uniquely in both
   * languages without fifty hand-written strings. */
  var dtZoneAdjectives = [
    "dtAdjQuiet",
    "dtAdjSunlit",
    "dtAdjMisty",
    "dtAdjVelvet",
    "dtAdjMidnight",
  ];
  var dtZoneNouns = [
    "dtNounPostcards",
    "dtNounStudio",
    "dtNounGallery",
    "dtNounExhibit",
    "dtNounVault",
    "dtNounAttic",
    "dtNounHarbor",
    "dtNounRooftop",
    "dtNounGreenhouse",
    "dtNounArchive",
  ];

  function dtBuildZones() {
    var zones = [];
    for (var index = 1; index <= 50; index += 1) {
      zones.push({
        id: "dt" + index,
        adjKey: dtZoneAdjectives[Math.floor((index - 1) / 10)],
        nounKey: dtZoneNouns[(index - 1) % 10],
        rounds: index % 10 === 0 ? 4 : 3,
        count: Math.min(9, 3 + Math.floor((index - 1) / 7)),
        prefer: index <= 5 ? "bold" : index <= 15 ? "any" : "subtle",
      });
    }
    return zones;
  }

  var dtZones = dtBuildZones();
  var dtStarBands = [0, 1, 2];

  function dtWrap(hue) {
    return ((hue % 360) + 360) % 360;
  }

  function dtHsl(h, s, l) {
    return "hsl(" + Math.round(dtWrap(h)) + ", " + Math.round(s) + "%, " + Math.round(l) + "%)";
  }

  function dtShuffle(list) {
    for (var index = list.length - 1; index > 0; index -= 1) {
      var swap = Math.floor(Math.random() * (index + 1));
      var held = list[index];
      list[index] = list[swap];
      list[swap] = held;
    }
    return list;
  }

  function dtPick(pool, count, prefer) {
    var preferred = pool;
    if (prefer === "bold") {
      preferred = pool.filter(function (d) { return !d.subtle; });
    } else if (prefer === "subtle") {
      preferred = pool.filter(function (d) { return d.subtle; });
    }
    if (preferred.length < count) {
      preferred = pool;
    }
    return dtShuffle(preferred.slice()).slice(0, count);
  }

  /* Level names compose per language: "Sunlit Attic" in English, 向阳阁楼
   * in Chinese - the template owns the join, not the caller. */
  function zoneName(def) {
    return t("dtZoneName", { a: t(def.adjKey), b: t(def.nounKey) });
  }

  /* ------------------------------------------------------------------ *
   * The scene deck. Each painter returns { layers, diffs } for one 100x100
   * frame. A diff edits copy B: hide clears its layer, build swaps the
   * layer string, shift nudges the layer inside a translate, and extra
   * appends a layer copy B only owns. Every scene keeps a lopsided layout
   * so nothing hides by symmetry, and every pool carries enough bold edits
   * for the opening zone. */

  function dtStudyPalette(H) {
    return {
      wall: dtHsl(H, 26, 86),
      shelf: dtHsl(H, 30, 52),
      wood: dtHsl(H + 20, 35, 40),
      paper: dtHsl(H, 35, 95),
      accent: dtHsl(H + 190, 55, 52),
      glow: dtHsl(45, 90, 70),
      leaf: dtHsl(135, 38, 44),
      rug: dtHsl(H + 45, 42, 74),
      dark: dtHsl(H, 28, 26),
    };
  }

  function dtSceneStudy(P) {
    var layers = [];
    var diffs = [];
    function L(s) { layers.push(s); return layers.length - 1; }
    L('<rect width="100" height="100" fill="' + P.wall + '"/>');
    L('<rect x="6" y="8" width="24" height="20" rx="2" fill="' + P.paper + '"/>' +
      '<line x1="18" y1="8" x2="18" y2="28" stroke="' + P.wood + '" stroke-width="1.5"/>' +
      '<line x1="6" y1="18" x2="30" y2="18" stroke="' + P.wood + '" stroke-width="1.5"/>');
    diffs.push({ x: 13, y: 14, r: 7, layer: L('<circle cx="13" cy="14" r="4" fill="' + P.glow + '"/>'), hide: true });
    L('<rect x="44" y="8" width="46" height="36" rx="2" fill="' + P.shelf + '"/>' +
      '<rect x="44" y="24" width="46" height="2.4" fill="' + P.wood + '"/>');
    var booksA = '<rect x="48" y="12" width="4" height="9" fill="' + P.accent + '"/>' +
      '<rect x="53" y="12" width="4" height="9" fill="' + P.glow + '"/>' +
      '<rect x="58" y="12" width="4" height="9" fill="' + P.paper + '"/>' +
      '<rect x="63" y="12" width="4" height="9" fill="' + P.leaf + '"/>' +
      '<rect x="68" y="12" width="4" height="9" fill="' + P.accent + '"/>';
    var bookALayer = L(booksA);
    diffs.push({
      x: 50, y: 16.5, r: 5.5, layer: bookALayer, subtle: true,
      build: function () { return booksA.replace(P.accent, P.paper); },
    });
    L('<rect x="48" y="28" width="4" height="9" fill="' + P.paper + '"/>' +
      '<rect x="53" y="28" width="4" height="9" fill="' + P.leaf + '"/>' +
      '<rect x="58" y="28" width="4" height="9" fill="' + P.accent + '"/>' +
      '<rect x="63" y="28" width="4" height="9" fill="' + P.glow + '"/>' +
      '<rect x="68" y="28" width="4" height="9" fill="' + P.paper + '"/>');
    L('<rect x="8" y="64" width="84" height="6" rx="1" fill="' + P.wood + '"/>' +
      '<rect x="12" y="70" width="4" height="22" fill="' + P.wood + '"/>' +
      '<rect x="84" y="70" width="4" height="22" fill="' + P.wood + '"/>');
    diffs.push({
      x: 27.5, y: 60, r: 9, shift: { dx: 9, dy: 0 },
      layer: L('<rect x="24" y="56" width="7" height="8" rx="1" fill="' + P.accent + '"/>' +
        '<path d="M31 58q4 2 0 6" stroke="' + P.accent + '" stroke-width="1.6" fill="none"/>'),
    });
    diffs.push({
      x: 27.5, y: 48, r: 7, hide: true,
      layer: L('<path d="M27.5 52c2-2 2-4 0-6c-2-2-2-4 0-6" stroke="' + P.paper + '" stroke-width="1.6" fill="none" opacity=".85"/>'),
    });
    L('<path d="M74 64L70 50" stroke="' + P.wood + '" stroke-width="2"/>' +
      '<path d="M64 46L76 46L73 52L67 52Z" fill="' + P.accent + '"/>');
    diffs.push({
      x: 70, y: 58, r: 10, hide: true,
      layer: L('<path d="M66 52L60 64L80 64Z" fill="' + P.glow + '" opacity=".45"/>'),
    });
    L('<ellipse cx="28" cy="88" rx="15" ry="5" fill="' + P.rug + '"/>');
    diffs.push({
      x: 28, y: 82, r: 11, shift: { dx: 7, dy: -2 },
      layer: L('<ellipse cx="28" cy="84" rx="7.5" ry="4.5" fill="' + P.dark + '"/>' +
        '<circle cx="21" cy="81" r="3.6" fill="' + P.dark + '"/>' +
        '<path d="M18.5 79l1.6-2.6 1.6 2.6Z" fill="' + P.dark + '"/>' +
        '<path d="M23 79l1.6-2.6 1.6 2.6Z" fill="' + P.dark + '"/>' +
        '<path d="M35 84q5-1 4-6" stroke="' + P.dark + '" stroke-width="2" fill="none"/>'),
    });
    var clock = '<circle cx="72" cy="16" r="5.5" fill="' + P.paper + '" stroke="' + P.wood + '" stroke-width="1.5"/>' +
      '<line x1="72" y1="16" x2="72" y2="12.5" stroke="' + P.wood + '" stroke-width="1.2"/>' +
      '<line x1="72" y1="16" x2="74.5" y2="16" stroke="' + P.wood + '" stroke-width="1.2"/>';
    diffs.push({
      x: 72, y: 16, r: 7, subtle: true,
      layer: L(clock),
      build: function () {
        return clock.replace('<line x1="72" y1="16" x2="72" y2="12.5"', '<line x1="72" y1="16" x2="75" y2="14"')
          .replace('<line x1="72" y1="16" x2="74.5" y2="16"', '<line x1="72" y1="16" x2="72" y2="19"');
      },
    });
    diffs.push({
      x: 38.5, y: 21.5, r: 10,
      layer: L('<rect x="32" y="14" width="13" height="15" fill="' + P.wood + '"/>' +
        '<rect x="34.5" y="16.5" width="8" height="10" fill="' + P.paper + '"/>'),
      build: function (layer) { return '<g transform="rotate(9 38.5 21.5)">' + layer + "</g>"; },
    });
    diffs.push({
      x: 90, y: 68, r: 8, subtle: true,
      layer: L('<ellipse cx="90" cy="66" rx="3" ry="6" fill="' + P.leaf + '"/>' +
        '<ellipse cx="86" cy="69" rx="2.6" ry="5" fill="' + P.leaf + '"/>' +
        '<ellipse cx="94" cy="69" rx="2.6" ry="5" fill="' + P.leaf + '"/>'),
      build: function (layer) { return layer.split(P.leaf).join(P.glow); },
    });
    L('<rect x="84" y="71.5" width="12" height="3" fill="' + P.accent + '"/>' +
      '<path d="M85 74.5L95 74.5L93.5 84L86.5 84Z" fill="' + P.accent + '"/>');
    diffs.push({
      x: 58, y: 82, r: 7, hide: true,
      layer: L('<circle cx="58" cy="82" r="4" fill="' + P.accent + '"/>' +
        '<path d="M55 80q3 2 6 0M55 84q3 2 6 0" stroke="' + P.paper + '" stroke-width="1" fill="none"/>'),
    });
    return { layers: layers, diffs: diffs };
  }

  function dtBeachPalette(H) {
    return {
      sky: dtHsl(H, 70, 82),
      sea: dtHsl(H + 15, 60, 55),
      sand: dtHsl(H + 30, 65, 82),
      glow: dtHsl(45, 90, 70),
      paper: dtHsl(H, 55, 96),
      front: dtHsl(H, 45, 35),
      accent: dtHsl(H + 190, 60, 55),
      leaf: dtHsl(140, 45, 40),
      towel: dtHsl(H + 300, 50, 70),
      wood: dtHsl(30, 45, 45),
    };
  }

  function dtSceneBeach(P) {
    var layers = [];
    var diffs = [];
    function L(s) { layers.push(s); return layers.length - 1; }
    L('<rect width="100" height="100" fill="' + P.sky + '"/>');
    diffs.push({ x: 78, y: 16, r: 9, layer: L('<circle cx="78" cy="16" r="8" fill="' + P.glow + '"/>'), hide: true });
    L('<rect y="44" width="100" height="20" fill="' + P.sea + '"/>' +
      '<path d="M6 52q5-2.5 10 0q5 2.5 10 0" stroke="' + P.paper + '" stroke-width="1.3" fill="none" opacity=".8"/>' +
      '<path d="M62 58q5-2.5 10 0q5 2.5 10 0" stroke="' + P.paper + '" stroke-width="1.3" fill="none" opacity=".8"/>');
    L('<rect y="62" width="100" height="38" fill="' + P.sand + '"/>');
    diffs.push({
      x: 23, y: 50, r: 10, shift: { dx: 8, dy: 0 },
      layer: L('<path d="M16 54L30 54L27 59L19 59Z" fill="' + P.front + '"/>' +
        '<line x1="23" y1="42" x2="23" y2="54" stroke="' + P.front + '" stroke-width="1.2"/>' +
        '<path d="M24 43L24 53L32 53Z" fill="' + P.paper + '"/>'),
    });
    L('<path d="M88 34C90 44 88 54 84 62" stroke="' + P.wood + '" stroke-width="3" fill="none"/>' +
      '<path d="M88 32q-10-6-18-2q10 2 18 2Z" fill="' + P.leaf + '"/>' +
      '<path d="M88 32q10-6 18-2q-10 2-18 2Z" fill="' + P.leaf + '"/>' +
      '<path d="M88 32q-4-10-14-11q7 5 14 11Z" fill="' + P.leaf + '"/>' +
      '<path d="M88 32q4-10 14-11q-7 5-14 11Z" fill="' + P.leaf + '"/>');
    diffs.push({
      x: 85, y: 60, r: 6, extra: '<circle cx="85" cy="60" r="2.6" fill="' + P.front + '"/>',
    });
    diffs.push({
      x: 48, y: 79, r: 13,
      layer: L('<path d="M26 72L70 68L76 84L30 90Z" fill="' + P.towel + '"/>' +
        '<line x1="34" y1="76" x2="72" y2="72" stroke="' + P.paper + '" stroke-width="1.5" opacity=".8"/>' +
        '<line x1="36" y1="83" x2="74" y2="79" stroke="' + P.paper + '" stroke-width="1.5" opacity=".8"/>'),
      build: function (layer) { return layer.split(P.towel).join(P.accent); },
    });
    L('<path d="M42 68q8-8 16 0l-2 8q-6 3-12 0Z" fill="' + P.wood + '"/>' +
      '<path d="M44 72q6 3 12 0M45 75q5 2.5 10 0" stroke="' + P.front + '" stroke-width="1" fill="none"/>');
    diffs.push({
      x: 52, y: 66.5, r: 6, subtle: true,
      extra: '<circle cx="54.5" cy="67" r="2.8" fill="hsl(5,75%,55%)"/>',
    });
    L('<circle cx="50" cy="66" r="2.8" fill="hsl(5,75%,55%)"/>');
    diffs.push({
      x: 34, y: 38, r: 10,
      layer: L('<path d="M20 44a14 14 0 0 1 28 0Z" fill="' + dtHsl(5, 70, 55) + '"/>' +
        '<path d="M27 32.5a14 14 0 0 0-3 11.5h6a20 20 0 0 1 1.5-11.8Z" fill="' + P.paper + '" opacity=".85"/>' +
        '<line x1="34" y1="44" x2="34" y2="74" stroke="' + P.wood + '" stroke-width="2"/>'),
      build: function (layer) { return layer.split(dtHsl(5, 70, 55)).join(P.glow); },
    });
    diffs.push({
      x: 66, y: 84, r: 9, shift: { dx: 6, dy: -3 },
      layer: L('<circle cx="66" cy="84" r="5" fill="' + P.paper + '"/>' +
        '<path d="M61.5 82q4.5-4 9 0" stroke="' + P.accent + '" stroke-width="1.6" fill="none"/>' +
        '<path d="M63 88.5q3 3 6 0" stroke="hsl(20,70%,55%)" stroke-width="1.6" fill="none"/>'),
    });
    diffs.push({
      x: 13, y: 86, r: 7, hide: true,
      layer: L('<path d="M13 81l1.8 3.6 4 .6-2.9 2.8.7 4-3.6-1.9-3.6 1.9.7-4-2.9-2.8 4-.6Z" fill="hsl(18,80%,62%)"/>'),
    });
    diffs.push({
      x: 52, y: 16, r: 5, subtle: true, hide: true,
      layer: L('<path d="M52 16q2.4-2.4 4.8 0q2.4-2.4 4.8 0" stroke="' + P.front + '" stroke-width="1.4" fill="none" stroke-linecap="round"/>'),
    });
    diffs.push({
      x: 54, y: 26, r: 10, subtle: true, shift: { dx: 9, dy: 0 },
      layer: L('<ellipse cx="54" cy="26" rx="8" ry="3.5" fill="' + P.paper + '" opacity=".9"/>'),
    });
    return { layers: layers, diffs: diffs };
  }

  function dtMarketPalette(H) {
    return {
      night: dtHsl(H + 230, 45, 20),
      stall: dtHsl(H, 30, 42),
      wood: dtHsl(H + 20, 35, 45),
      paper: dtHsl(H, 40, 92),
      accent: dtHsl(H + 190, 60, 52),
      lantern: dtHsl(5, 80, 58),
      glow: dtHsl(45, 90, 70),
      vendor: dtHsl(H, 25, 38),
    };
  }

  function dtSceneMarket(P) {
    var layers = [];
    var diffs = [];
    function L(s) { layers.push(s); return layers.length - 1; }
    L('<rect width="100" height="100" fill="' + P.night + '"/>');
    diffs.push({ x: 58, y: 12, r: 5, subtle: true, hide: true, layer: L('<circle cx="58" cy="12" r="1.2" fill="' + P.paper + '"/>') });
    var moon = '<circle cx="80" cy="18" r="8" fill="' + P.glow + '"/><circle cx="84" cy="15" r="7" fill="' + P.night + '"/>';
    diffs.push({
      x: 80, y: 18, r: 10, layer: L(moon),
      build: function () { return '<circle cx="80" cy="18" r="8" fill="' + P.glow + '"/>'; },
    });
    L('<rect x="8" y="58" width="36" height="26" fill="' + P.stall + '"/>' +
      '<rect x="10" y="46" width="3" height="12" fill="' + P.wood + '"/>' +
      '<rect x="39" y="46" width="3" height="12" fill="' + P.wood + '"/>');
    var awning = '<path d="M4 46L44 46L40 34L8 34Z" fill="' + P.paper + '"/>' +
      '<path d="M12 34L9 46L15 46L17.5 34Z" fill="' + dtHsl(5, 70, 55) + '"/>' +
      '<path d="M22 34L20 46L26 46L27.5 34Z" fill="' + dtHsl(5, 70, 55) + '"/>' +
      '<path d="M32 34L31 46L37 46L38 34Z" fill="' + dtHsl(5, 70, 55) + '"/>';
    diffs.push({
      x: 13, y: 40, r: 7, subtle: true, layer: L(awning),
      build: function () { return awning.replace(dtHsl(5, 70, 55), P.glow); },
    });
    L('<path d="M20 12q30 8 60 0" stroke="' + P.wood + '" stroke-width="1" fill="none"/>');
    L('<circle cx="30" cy="22" r="3.2" fill="' + P.lantern + '"/><line x1="30" y1="18" x2="30" y2="20" stroke="' + P.wood + '" stroke-width="1"/>');
    diffs.push({
      x: 48, y: 26, r: 6, subtle: true,
      layer: L('<circle cx="48" cy="26" r="3.2" fill="' + P.lantern + '"/><line x1="48" y1="22" x2="48" y2="24" stroke="' + P.wood + '" stroke-width="1"/>'),
      build: function (layer) { return layer.replace(P.lantern, P.glow); },
    });
    diffs.push({
      x: 66, y: 22, r: 6, subtle: true, hide: true,
      layer: L('<circle cx="66" cy="22" r="3.2" fill="' + P.lantern + '"/><line x1="66" y1="18" x2="66" y2="20" stroke="' + P.wood + '" stroke-width="1"/>'),
    });
    diffs.push({
      x: 22, y: 47, r: 7, hide: true,
      layer: L('<path d="M22 50c2-2 2-3.5 0-5.5c-2-2-2-3.5 0-5.5" stroke="' + P.paper + '" stroke-width="1.5" fill="none" opacity=".65"/>'),
    });
    diffs.push({
      x: 76, y: 75, r: 10, shift: { dx: 6, dy: -2 },
      layer: L('<ellipse cx="76" cy="76" rx="5.5" ry="3.5" fill="hsl(0,0%,12%)"/>' +
        '<circle cx="82" cy="73" r="2.8" fill="hsl(0,0%,12%)"/>' +
        '<path d="M70.5 76q-4-1-3-5" stroke="hsl(0,0%,12%)" stroke-width="1.8" fill="none"/>'),
    });
    var flags = '<path d="M20 30l6 0-3 6Z" fill="' + dtHsl(5, 70, 55) + '"/>' +
      '<path d="M30 32l6 0-3 6Z" fill="' + P.paper + '"/>' +
      '<path d="M40 33l6 0-3 6Z" fill="' + dtHsl(5, 70, 55) + '"/>' +
      '<path d="M50 34l6 0-3 6Z" fill="' + P.paper + '"/>';
    diffs.push({
      x: 23, y: 33, r: 6, subtle: true, layer: L(flags),
      build: function () { return flags.replace(dtHsl(5, 70, 55), P.glow); },
    });
    L('<path d="M50 56q3-8 6 0l1 12-8 0Z" fill="' + P.vendor + '"/>' +
      '<circle cx="53" cy="52" r="3.5" fill="' + P.paper + '"/>');
    diffs.push({
      x: 53, y: 47, r: 6, subtle: true,
      extra: '<path d="M49 49l8 0-4-5Z" fill="' + P.accent + '"/>',
    });
    L('<rect x="64" y="64" width="16" height="10" fill="' + dtHsl(25, 45, 45) + '"/>' +
      '<circle cx="70" cy="62" r="2.6" fill="' + dtHsl(35, 85, 55) + '"/>' +
      '<circle cx="75" cy="62.5" r="2.4" fill="' + dtHsl(35, 85, 55) + '"/>' +
      '<circle cx="72.5" cy="60" r="2.2" fill="' + dtHsl(35, 85, 55) + '"/>');
    return { layers: layers, diffs: diffs };
  }

  function dtSpacePalette(H) {
    return {
      space: dtHsl(H + 230, 50, 12),
      hull: dtHsl(H, 15, 30),
      panel: dtHsl(H, 20, 45),
      paper: dtHsl(H, 25, 92),
      accent: dtHsl(H + 190, 60, 55),
      glow: dtHsl(45, 90, 70),
      sea: dtHsl(210, 60, 45),
      land: dtHsl(100, 45, 45),
    };
  }

  function dtSceneSpace(P) {
    var layers = [];
    var diffs = [];
    function L(s) { layers.push(s); return layers.length - 1; }
    L('<rect width="100" height="100" fill="' + P.space + '"/>');
    diffs.push({ x: 26, y: 10, r: 5, subtle: true, hide: true, layer: L('<circle cx="26" cy="10" r="1.9" fill="' + P.paper + '"/>') });
    L('<circle cx="14" cy="18" r="1.9" fill="' + P.paper + '"/><circle cx="18" cy="52" r="1.9" fill="' + P.paper + '"/>');
    diffs.push({ x: 85, y: 70, r: 5, subtle: true, hide: true, layer: L('<circle cx="85" cy="70" r="1.9" fill="' + P.paper + '"/>') });
    diffs.push({
      x: 32, y: 40, r: 13, layer: L('<circle cx="32" cy="40" r="14" fill="' + P.sea + '"/>'),
      build: function (layer) { return layer.replace(P.sea, dtHsl(275, 45, 55)); },
    });
    diffs.push({
      x: 28, y: 36, r: 8, subtle: true,
      layer: L('<path d="M22 34q5-6 10-2q-2 6-8 6q-3 5-8 3q2-5 6-7Z" fill="' + P.land + '"/>' +
        '<path d="M36 46q4-2 6 1q-3 4-7 3Z" fill="' + P.land + '"/>'),
      build: function (layer) { return layer.split(P.land).join(dtHsl(55, 55, 55)); },
    });
    L('<circle cx="32" cy="40" r="15.5" fill="none" stroke="' + P.hull + '" stroke-width="3.5"/>' +
      '<circle cx="32" cy="40" r="17.5" fill="none" stroke="' + P.panel + '" stroke-width="1.5"/>');
    diffs.push({
      x: 74, y: 25, r: 11, shift: { dx: 6, dy: 5 },
      layer: L('<rect x="70" y="22" width="9" height="5.5" fill="' + P.panel + '"/>' +
        '<rect x="63" y="23.5" width="5" height="2.5" fill="' + P.accent + '"/>' +
        '<rect x="81" y="23.5" width="5" height="2.5" fill="' + P.accent + '"/>'),
    });
    L('<circle cx="54.5" cy="58.5" r="4" fill="' + P.paper + '"/>' +
      '<rect x="51" y="62" width="7" height="10" rx="2" fill="' + P.paper + '"/>' +
      '<rect x="49.5" y="63" width="2.5" height="7" fill="' + P.accent + '"/>');
    diffs.push({
      x: 54.5, y: 58.5, r: 5, subtle: true,
      layer: L('<circle cx="54.5" cy="58.5" r="2.4" fill="' + P.space + '"/>'),
      build: function (layer) { return layer.replace(P.space, P.accent); },
    });
    L('<rect x="8" y="68" width="28" height="20" rx="2" fill="' + P.panel + '"/>' +
      '<circle cx="14" cy="74" r="2" fill="' + P.glow + '"/>' +
      '<circle cx="26" cy="74" r="2" fill="' + P.glow + '"/>');
    diffs.push({
      x: 20, y: 74, r: 5, subtle: true,
      layer: L('<circle cx="20" cy="74" r="2" fill="' + dtHsl(150, 60, 45) + '"/>'),
      build: function (layer) { return layer.replace(dtHsl(150, 60, 45), "hsl(2,75%,58%)"); },
    });
    diffs.push({
      x: 67, y: 49, r: 9, subtle: true, shift: { dx: -5, dy: 5 },
      layer: L('<line x1="64" y1="46" x2="70" y2="52" stroke="' + P.paper + '" stroke-width="1.6"/>'),
    });
    diffs.push({
      x: 46, y: 24, r: 7, hide: true,
      layer: L('<circle cx="46" cy="24" r="3.5" fill="' + P.accent + '"/>' +
        '<ellipse cx="46" cy="24" rx="6" ry="1.6" fill="none" stroke="' + P.paper + '" stroke-width="1"/>'),
    });
    L('<line x1="88" y1="80" x2="88" y2="70" stroke="' + P.hull + '" stroke-width="1.5"/>');
    diffs.push({
      x: 88, y: 69, r: 5, subtle: true, hide: true,
      layer: L('<circle cx="88" cy="69" r="1.5" fill="hsl(2,75%,58%)"/>'),
    });
    diffs.push({
      x: 87, y: 37, r: 8,
      extra: '<line x1="84" y1="38" x2="92" y2="34" stroke="' + P.glow + '" stroke-width="1.5" opacity=".8"/>' +
        '<circle cx="84" cy="38" r="1.8" fill="' + P.glow + '"/>',
    });
    return { layers: layers, diffs: diffs };
  }

  function dtGardenPalette(H) {
    return {
      sky: dtHsl(H, 65, 84),
      grass: dtHsl(110, 40, 60),
      grassDark: dtHsl(110, 42, 48),
      pond: dtHsl(H + 190, 55, 60),
      lily: dtHsl(120, 50, 55),
      flower: dtHsl(H + 300, 60, 70),
      glow: dtHsl(45, 90, 70),
      paper: dtHsl(H, 55, 96),
      wood: dtHsl(H, 35, 45),
      frog: dtHsl(100, 45, 40),
    };
  }

  function dtSceneGarden(P) {
    var layers = [];
    var diffs = [];
    function L(s) { layers.push(s); return layers.length - 1; }
    L('<rect width="100" height="100" fill="' + P.sky + '"/>');
    diffs.push({
      x: 14, y: 16, r: 9, subtle: true,
      layer: L('<circle cx="14" cy="16" r="8" fill="' + P.glow + '"/>'),
      build: function (layer) { return layer.replace(P.glow, dtHsl(200, 60, 70)); },
    });
    diffs.push({
      x: 56, y: 12, r: 10, subtle: true, shift: { dx: 8, dy: 2 },
      layer: L('<ellipse cx="56" cy="12" rx="8" ry="3.5" fill="' + P.paper + '"/>'),
    });
    L('<rect y="46" width="100" height="54" fill="' + P.grass + '"/>' +
      '<ellipse cx="8" cy="50" rx="9" ry="5" fill="' + P.grassDark + '"/>');
    diffs.push({
      x: 78, y: 52, r: 9, subtle: true,
      layer: L('<ellipse cx="78" cy="52" rx="10" ry="6" fill="' + P.grassDark + '"/>'),
      build: function (layer) { return layer.replace(P.grassDark, P.grass); },
    });
    L('<ellipse cx="50" cy="76" rx="36" ry="14" fill="' + P.pond + '"/>' +
      '<path d="M32 74q5-2 10 0M56 82q5-2 10 0" stroke="' + P.paper + '" stroke-width="1.2" fill="none" opacity=".7"/>');
    diffs.push({
      x: 34, y: 72, r: 7, subtle: true,
      layer: L('<ellipse cx="34" cy="72" rx="5" ry="2.4" fill="' + P.lily + '"/>'),
      build: function (layer) { return layer.replace(P.lily, dtHsl(0, 65, 60)); },
    });
    L('<ellipse cx="58" cy="80" rx="5.5" ry="2.6" fill="' + P.lily + '"/>');
    diffs.push({ x: 74, y: 68, r: 6, subtle: true, hide: true, layer: L('<ellipse cx="74" cy="68" rx="4.5" ry="2.2" fill="' + P.lily + '"/>') });
    diffs.push({
      x: 58, y: 75, r: 9, shift: { dx: 6, dy: -2 },
      layer: L('<ellipse cx="58" cy="76" rx="3.6" ry="2.6" fill="' + P.frog + '"/>' +
        '<circle cx="56.8" cy="73.6" r="1" fill="' + P.paper + '"/>' +
        '<circle cx="59.2" cy="73.6" r="1" fill="' + P.paper + '"/>'),
    });
    L('<line x1="12" y1="46" x2="12" y2="58" stroke="' + P.grassDark + '" stroke-width="1.2"/>' +
      '<line x1="20" y1="46" x2="20" y2="62" stroke="' + P.grassDark + '" stroke-width="1.2"/>' +
      '<line x1="28" y1="46" x2="28" y2="56" stroke="' + P.grassDark + '" stroke-width="1.2"/>' +
      '<circle cx="12" cy="59.5" r="2.6" fill="' + P.flower + '"/>' +
      '<circle cx="28" cy="57.5" r="2.6" fill="' + P.flower + '"/>');
    diffs.push({
      x: 20, y: 59.5, r: 6, hide: true,
      layer: L('<circle cx="20" cy="59.5" r="2.6" fill="' + P.flower + '"/>'),
    });
    diffs.push({
      x: 70, y: 30, r: 9, shift: { dx: -7, dy: -3 },
      layer: L('<path d="M70 30l6-4v8Z" fill="' + P.accent + '"/>' +
        '<path d="M70 30l-6-4v8Z" fill="' + P.accent + '" opacity=".8"/>' +
        '<circle cx="70" cy="30" r="1.4" fill="' + P.grassDark + '"/>'),
    });
    diffs.push({
      x: 86, y: 60, r: 9, hide: true,
      layer: L('<rect x="82" y="56" width="9" height="8" rx="1" fill="' + P.wood + '"/>' +
        '<line x1="82" y1="60" x2="75" y2="56" stroke="' + P.wood + '" stroke-width="2"/>' +
        '<path d="M84 56q2.5-3 5 0" stroke="' + P.wood + '" stroke-width="1.5" fill="none"/>'),
    });
    L('<rect x="40" y="36" width="3" height="12" fill="' + P.wood + '"/>' +
      '<rect x="52" y="36" width="3" height="12" fill="' + P.wood + '"/>');
    diffs.push({
      x: 46, y: 36, r: 6, subtle: true, hide: true,
      layer: L('<rect x="46" y="36" width="3" height="12" fill="' + P.wood + '"/>'),
    });
    diffs.push({
      x: 41, y: 38, r: 8, subtle: true,
      extra: '<line x1="38" y1="40" x2="44" y2="37" stroke="' + P.grassDark + '" stroke-width="1.2"/>' +
        '<ellipse cx="37.5" cy="38" rx="2.4" ry="1.1" fill="' + P.accent + '" opacity=".85"/>' +
        '<ellipse cx="37.5" cy="40.5" rx="2.4" ry="1.1" fill="' + P.accent + '" opacity=".85"/>',
    });
    return { layers: layers, diffs: diffs };
  }

  function dtToyPalette(H) {
    return {
      wall: dtHsl(H, 30, 88),
      wood: dtHsl(H + 20, 35, 42),
      paper: dtHsl(H, 40, 96),
      accent: dtHsl(H + 190, 60, 55),
      glow: dtHsl(45, 90, 70),
      teddy: dtHsl(35, 60, 55),
      robot: dtHsl(210, 15, 60),
      ballRed: dtHsl(5, 75, 60),
      dark: dtHsl(H, 30, 25),
    };
  }

  function dtSceneToy(P) {
    var layers = [];
    var diffs = [];
    function L(s) { layers.push(s); return layers.length - 1; }
    L('<rect width="100" height="100" fill="' + P.wall + '"/>');
    L('<rect x="10" y="10" width="80" height="4" fill="' + P.wood + '"/>' +
      '<rect x="10" y="30" width="80" height="4" fill="' + P.wood + '"/>' +
      '<rect x="10" y="50" width="80" height="4" fill="' + P.wood + '"/>');
    diffs.push({
      x: 24, y: 25, r: 9, shift: { dx: 5, dy: -1 },
      layer: L('<circle cx="21" cy="20" r="1.6" fill="' + P.teddy + '"/>' +
        '<circle cx="27" cy="20" r="1.6" fill="' + P.teddy + '"/>' +
        '<circle cx="24" cy="22.5" r="4.2" fill="' + P.teddy + '"/>' +
        '<ellipse cx="24" cy="29" rx="4.2" ry="3.6" fill="' + P.teddy + '"/>'),
    });
    diffs.push({
      x: 70, y: 20, r: 9, hide: true,
      layer: L('<rect x="66" y="20" width="8" height="10" rx="1" fill="' + P.robot + '"/>' +
        '<rect x="67.5" y="16" width="5" height="4" fill="' + P.robot + '"/>' +
        '<line x1="70" y1="16" x2="70" y2="12.5" stroke="' + P.dark + '" stroke-width="1"/>' +
        '<circle cx="70" cy="12" r="1.1" fill="' + P.accent + '"/>'),
    });
    diffs.push({
      x: 30, y: 44, r: 7, subtle: true,
      layer: L('<circle cx="30" cy="44" r="5" fill="' + P.paper + '"/>' +
        '<path d="M25.2 43q4.8-4 9.6 0" stroke="' + P.ballRed + '" stroke-width="1.6" fill="none"/>' +
        '<path d="M25.2 46q4.8 4 9.6 0" stroke="' + P.ballRed + '" stroke-width="1.6" fill="none"/>'),
      build: function (layer) { return layer.replace(P.ballRed, P.glow); },
    });
    L('<rect x="44" y="40" width="6" height="6" fill="' + P.accent + '"/>' +
      '<rect x="51" y="40" width="6" height="6" fill="' + P.glow + '"/>');
    diffs.push({
      x: 50.5, y: 37, r: 6, hide: true,
      layer: L('<rect x="47.5" y="34" width="6" height="6" fill="' + P.ballRed + '"/>'),
    });
    diffs.push({
      x: 24, y: 62, r: 10, shift: { dx: 6, dy: 0 },
      layer: L('<rect x="16" y="60" width="12" height="8" rx="1" fill="' + P.ballRed + '"/>' +
        '<rect x="28" y="56" width="7" height="12" fill="' + P.accent + '"/>' +
        '<rect x="18" y="55" width="3" height="5" fill="' + P.dark + '"/>' +
        '<circle cx="20" cy="69" r="2.5" fill="' + P.dark + '"/>' +
        '<circle cx="26" cy="69" r="2.5" fill="' + P.dark + '"/>' +
        '<circle cx="31.5" cy="69" r="2.5" fill="' + P.dark + '"/>'),
    });
    diffs.push({
      x: 60, y: 66, r: 9, subtle: true,
      layer: L('<ellipse cx="60" cy="66" rx="7" ry="4" fill="' + P.teddy + '"/>' +
        '<circle cx="67.5" cy="62" r="3" fill="' + P.teddy + '"/>' +
        '<path d="M52 70q8 6 16 0" stroke="' + P.wood + '" stroke-width="2" fill="none"/>'),
      build: function (layer) { return layer.split(P.teddy).join(dtHsl(200, 50, 55)); },
    });
    diffs.push({
      x: 84, y: 22, r: 9, subtle: true, shift: { dx: -6, dy: 2 },
      layer: L('<path d="M84 14l6 8-6 8-6-8Z" fill="' + P.accent + '"/>' +
        '<path d="M84 30q-3 4 0 8" stroke="' + P.dark + '" stroke-width="1" fill="none"/>'),
    });
    L('<rect x="14" y="24" width="5" height="4" rx="1" fill="' + P.paper + '" stroke="' + P.wood + '" stroke-width=".8"/>' +
      '<rect x="50" y="44" width="5" height="4" rx="1" fill="' + P.paper + '" stroke="' + P.wood + '" stroke-width=".8"/>');
    diffs.push({
      x: 84, y: 58, r: 7, hide: true,
      layer: L('<circle cx="84" cy="58" r="4" fill="' + P.paper + '"/>' +
        '<path d="M82.5 58q1.5 1.6 3 0" stroke="' + P.dark + '" stroke-width=".9" fill="none"/>'),
    });
    L('<rect x="78" y="62" width="12" height="10" rx="1" fill="' + P.accent + '"/>' +
      '<circle cx="76" cy="67" r="1.5" fill="' + P.dark + '"/>');
    diffs.push({
      x: 5, y: 64, r: 7, extra: '<circle cx="5" cy="64" r="4" fill="' + P.accent + '"/>' +
        '<line x1="5" y1="68" x2="6" y2="78" stroke="' + P.dark + '" stroke-width=".8"/>',
    });
    L('<circle cx="9" cy="60" r="4" fill="' + P.glow + '"/>' +
      '<circle cx="13" cy="52" r="4" fill="' + P.ballRed + '"/>' +
      '<line x1="9" y1="64" x2="8" y2="78" stroke="' + P.dark + '" stroke-width=".8"/>' +
      '<line x1="13" y1="56" x2="8" y2="78" stroke="' + P.dark + '" stroke-width=".8"/>');
    return { layers: layers, diffs: diffs };
  }

  function dtBakeryPalette(H) {
    return {
      wall: dtHsl(H, 40, 82),
      counter: dtHsl(H + 25, 35, 48),
      wood: dtHsl(H + 20, 35, 42),
      paper: dtHsl(H, 40, 96),
      accent: dtHsl(H + 190, 55, 55),
      glow: dtHsl(45, 90, 70),
      crust: dtHsl(35, 70, 62),
      cherry: dtHsl(0, 70, 55),
      dark: dtHsl(H, 30, 24),
    };
  }

  function dtSceneBakery(P) {
    var layers = [];
    var diffs = [];
    function L(s) { layers.push(s); return layers.length - 1; }
    L('<rect width="100" height="100" fill="' + P.wall + '"/>');
    var awning = '<path d="M0 18q6.25-6 12.5 0q6.25-6 12.5 0q6.25-6 12.5 0q6.25-6 12.5 0q6.25-6 12.5 0q6.25-6 12.5 0q6.25-6 12.5 0q6.25-6 12.5 0L100 8 0 8Z" fill="' + P.paper + '"/>' +
      '<path d="M6 16q6.25-6 12.5 0q-1 2-1 4l-9 0q0-2-2.5-4Z" fill="' + P.accent + '"/>';
    diffs.push({
      x: 12, y: 13, r: 6, subtle: true, layer: L(awning),
      build: function () { return awning.replace(P.accent, P.glow); },
    });
    L('<rect x="12" y="26" width="76" height="3.5" fill="' + P.wood + '"/>');
    diffs.push({
      x: 24, y: 21, r: 10, shift: { dx: 6, dy: -2 },
      layer: L('<ellipse cx="24" cy="21" rx="8" ry="2.6" fill="' + P.crust + '" transform="rotate(-16 24 21)"/>' +
        '<path d="M19 19l8-2M20 22l8-2" stroke="' + P.paper + '" stroke-width=".8"/>'),
    });
    L('<rect x="44" y="18" width="14" height="6" fill="' + P.paper + '"/>' +
      '<path d="M44 18q3.5-3 7 0q3.5-3 7 0v3H44Z" fill="' + P.accent + '"/>');
    diffs.push({ x: 51, y: 15, r: 6, hide: true, layer: L('<circle cx="51" cy="15" r="2" fill="' + P.cherry + '"/>') });
    diffs.push({
      x: 71, y: 21, r: 8, subtle: true,
      layer: L('<path d="M66 22q3-6 7-3q4-4 7 1q-7 3-14 2Z" fill="' + P.crust + '"/>'),
      build: function (layer) { return layer.replace(P.crust, dtHsl(15, 65, 42)); },
    });
    L('<rect x="12" y="42" width="76" height="3.5" fill="' + P.wood + '"/>');
    diffs.push({
      x: 24, y: 36, r: 7, hide: true,
      layer: L('<circle cx="24" cy="36" r="5" fill="hsl(320,60%,70%)"/><circle cx="24" cy="36" r="1.8" fill="' + P.wall + '"/>'),
    });
    L('<circle cx="36" cy="37" r="5" fill="' + P.glow + '"/><circle cx="36" cy="37" r="1.8" fill="' + P.wall + '"/>');
    diffs.push({
      x: 64.5, y: 36, r: 7, subtle: true, shift: { dx: 4, dy: -3 },
      layer: L('<rect x="60" y="34" width="9" height="5" rx="2" fill="' + P.crust + '"/>'),
    });
    L('<rect x="48" y="34" width="9" height="5" rx="2" fill="' + P.crust + '"/>' +
      '<rect x="72" y="34" width="9" height="5" rx="2" fill="' + P.crust + '"/>');
    L('<rect y="58" width="100" height="8" fill="' + dtHsl(30, 40, 58) + '"/>' +
      '<rect y="66" width="100" height="34" fill="' + P.counter + '"/>' +
      '<path d="M12 66v34M32 66v34M52 66v34M72 66v34M92 66v34" stroke="' + dtHsl(25, 30, 40) + '" stroke-width="1.5"/>');
    diffs.push({
      x: 26, y: 54, r: 10, shift: { dx: 5, dy: 0 },
      layer: L('<ellipse cx="26" cy="54" rx="7" ry="3.5" fill="' + P.dark + '"/>' +
        '<path d="M20 52l1.8-2.4 1.8 2.4Z" fill="' + P.dark + '"/>' +
        '<path d="M24.5 52l1.8-2.4 1.8 2.4Z" fill="' + P.dark + '"/>' +
        '<path d="M33 55q4-1 3.5-4" stroke="' + P.dark + '" stroke-width="1.5" fill="none"/>'),
    });
    diffs.push({
      x: 52, y: 48, r: 6, subtle: true, hide: true,
      layer: L('<path d="M52 52c2-2 2-3.5 0-5.5c-2-2-2-3.5 0-5.5" stroke="' + P.paper + '" stroke-width="1.4" fill="none" opacity=".85"/>'),
    });
    L('<path d="M46 58a6 6 0 0 1 12 0Z" fill="' + P.crust + '"/>' +
      '<path d="M49 56l6-2M48 54l8-3" stroke="' + P.paper + '" stroke-width=".9"/>');
    L('<rect x="74" y="74" width="18" height="14" rx="2" fill="' + P.dark + '"/>' +
      '<rect x="74" y="74" width="18" height="14" rx="2" fill="none" stroke="' + dtHsl(30, 40, 58) + '" stroke-width="1.5"/>');
    diffs.push({
      x: 83, y: 81, r: 8, hide: true,
      layer: L('<circle cx="83" cy="81" r="5" fill="' + P.glow + '" opacity=".85"/>'),
    });
    diffs.push({
      x: 88, y: 52, r: 7, subtle: true,
      extra: '<rect x="85" y="50" width="7" height="5" rx="2.5" fill="' + P.accent + '"/>' +
        '<path d="M86 50q2-2.5 4 0" stroke="' + P.glow + '" stroke-width="1.4" fill="none"/>',
    });
    return { layers: layers, diffs: diffs };
  }

  function dtCabinPalette(H) {
    return {
      sky: dtHsl(H + 210, 50, 85),
      snow: dtHsl(H, 25, 96),
      cabin: dtHsl(H + 25, 40, 50),
      paper: dtHsl(H, 30, 98),
      glow: dtHsl(45, 90, 70),
      pine: dtHsl(150, 35, 45),
      accent: dtHsl(H + 190, 55, 55),
      dark: dtHsl(H + 220, 30, 30),
    };
  }

  function dtSceneCabin(P) {
    var layers = [];
    var diffs = [];
    function L(s) { layers.push(s); return layers.length - 1; }
    L('<rect width="100" height="100" fill="' + P.sky + '"/>');
    diffs.push({
      x: 82, y: 14, r: 8, subtle: true,
      layer: L('<circle cx="82" cy="14" r="7" fill="' + P.glow + '"/>'),
      build: function (layer) { return layer.replace(P.glow, P.paper); },
    });
    L('<circle cx="20" cy="10" r="1.9" fill="' + P.paper + '"/>');
    diffs.push({ x: 40, y: 16, r: 5, subtle: true, hide: true, layer: L('<circle cx="40" cy="16" r="1.9" fill="' + P.paper + '"/>') });
    L('<rect y="74" width="100" height="26" fill="' + P.snow + '"/>');
    L('<rect x="30" y="52" width="36" height="24" fill="' + P.cabin + '"/>' +
      '<rect x="44" y="62" width="9" height="14" fill="' + P.dark + '"/>' +
      '<rect x="35" y="58" width="6" height="6" fill="' + P.glow + '"/>');
    diffs.push({
      x: 67, y: 61, r: 6, subtle: true,
      layer: L('<rect x="64" y="58" width="6" height="6" fill="' + P.glow + '"/>'),
      build: function (layer) { return layer.replace(P.glow, dtHsl(200, 60, 55)); },
    });
    L('<path d="M26 52L48 38L70 52Z" fill="' + P.dark + '"/>');
    diffs.push({
      x: 48, y: 45, r: 9, hide: true,
      layer: L('<path d="M30 49L48 38L66 49L60 49L48 41.5L36 49Z" fill="' + P.paper + '"/>'),
    });
    L('<rect x="57" y="38" width="5" height="8" fill="' + P.cabin + '"/>');
    diffs.push({
      x: 61, y: 32, r: 6, subtle: true, hide: true,
      layer: L('<circle cx="61" cy="32" r="3" fill="' + P.paper + '" opacity=".9"/><circle cx="64.5" cy="26.5" r="2.2" fill="' + P.paper + '" opacity=".7"/>'),
    });
    L('<path d="M8 74l6-16 6 16Z" fill="' + P.pine + '"/><rect x="12.5" y="74" width="3" height="4" fill="' + P.dark + '"/>');
    diffs.push({
      x: 22, y: 64, r: 9, hide: true,
      layer: L('<path d="M16 74l6-16 6 16Z" fill="' + P.pine + '"/><rect x="20.5" y="74" width="3" height="4" fill="' + P.dark + '"/>'),
    });
    L('<circle cx="78" cy="68" r="6" fill="' + P.paper + '"/>' +
      '<circle cx="78" cy="60" r="4.5" fill="' + P.paper + '"/>' +
      '<circle cx="76.5" cy="59" r=".8" fill="' + P.dark + '"/>' +
      '<circle cx="79.5" cy="59" r=".8" fill="' + P.dark + '"/>' +
      '<circle cx="78" cy="67" r=".9" fill="' + P.dark + '"/>' +
      '<line x1="72" y1="58" x2="66" y2="54" stroke="' + P.dark + '" stroke-width="1"/>' +
      '<line x1="84" y1="58" x2="90" y2="54" stroke="' + P.dark + '" stroke-width="1"/>');
    diffs.push({
      x: 84, y: 59.5, r: 6, hide: true,
      layer: L('<path d="M82 58l7 2-7 2Z" fill="hsl(20,80%,55%)"/>'),
    });
    diffs.push({
      x: 12, y: 80, r: 8, subtle: true,
      layer: L('<path d="M6 78l12-4 1.5 3-12 4Z" fill="' + dtHsl(0, 60, 50) + '"/>' +
        '<line x1="18" y1="74" x2="22" y2="70" stroke="' + dtHsl(0, 60, 50) + '" stroke-width="1.2"/>'),
      build: function (layer) { return layer.split(dtHsl(0, 60, 50)).join(P.glow); },
    });
    diffs.push({
      x: 55, y: 30, r: 7, subtle: true,
      extra: '<circle cx="55" cy="30" r="1.2" fill="' + P.paper + '"/><circle cx="60" cy="36" r="1" fill="' + P.paper + '"/>',
    });
    L('<circle cx="30" cy="26" r="1.2" fill="' + P.paper + '"/><circle cx="70" cy="24" r="1.2" fill="' + P.paper + '"/><circle cx="52" cy="14" r="1.2" fill="' + P.paper + '"/>');
    return { layers: layers, diffs: diffs };
  }

  function dtJunglePalette(H) {
    return {
      sky: dtHsl(H, 60, 80),
      leaf: dtHsl(140, 45, 40),
      leafDark: dtHsl(150, 45, 32),
      leafLight: dtHsl(120, 45, 55),
      water: dtHsl(H + 190, 60, 60),
      riverTint: dtHsl(H + 210, 55, 65),
      rock: dtHsl(H, 20, 45),
      flower: dtHsl(H + 300, 60, 70),
      glow: dtHsl(45, 90, 70),
      accent: dtHsl(H + 190, 55, 52),
      paper: dtHsl(H, 50, 95),
      dark: dtHsl(150, 40, 20),
    };
  }

  function dtSceneJungle(P) {
    var layers = [];
    var diffs = [];
    function L(s) { layers.push(s); return layers.length - 1; }
    L('<rect width="100" height="100" fill="' + P.sky + '"/>');
    L('<ellipse cx="18" cy="16" rx="22" ry="10" fill="' + P.leafDark + '"/>' +
      '<ellipse cx="86" cy="14" rx="24" ry="11" fill="' + P.leafDark + '"/>' +
      '<ellipse cx="55" cy="8" rx="26" ry="9" fill="' + P.leafDark + '"/>');
    diffs.push({
      x: 50, y: 42, r: 9, subtle: true,
      layer: L('<rect x="44" y="26" width="12" height="34" fill="' + P.water + '"/>' +
        '<path d="M47 30v26M51 28v30M55 31v26" stroke="' + P.paper + '" stroke-width="1" opacity=".7"/>'),
      build: function (layer) { return layer.split(P.water).join(P.riverTint); },
    });
    L('<ellipse cx="50" cy="74" rx="31" ry="9" fill="' + P.water + '"/>' +
      '<path d="M34 74q6-2 12 0M58 78q6-2 12 0" stroke="' + P.paper + '" stroke-width="1" fill="none" opacity=".7"/>');
    diffs.push({
      x: 36, y: 72, r: 7, subtle: true,
      extra: '<ellipse cx="36" cy="72" rx="4.5" ry="2" fill="' + P.leafLight + '"/>',
    });
    L('<path d="M62 40q10-3 19 1" stroke="' + P.leafDark + '" stroke-width="2.5" fill="none"/>' +
      '<ellipse cx="73" cy="36" rx="4" ry="5" fill="' + P.dark + '"/>' +
      '<path d="M77 35q6 1 7 4l-7 1Z" fill="' + P.glow + '"/>' +
      '<circle cx="74" cy="34.5" r=".8" fill="' + P.paper + '"/>');
    diffs.push({
      x: 80, y: 37, r: 6, subtle: true,
      layer: L('<path d="M77 35q6 1 7 4l-7 1Z" fill="' + P.glow + '"/>'),
      build: function (layer) { return layer.replace(P.glow, "hsl(10,75%,55%)"); },
    });
    diffs.push({
      x: 30, y: 50, r: 10, shift: { dx: 6, dy: 2 },
      layer: L('<path d="M30 44q-4 2-3 6" stroke="' + P.leafDark + '" stroke-width="2" fill="none"/>' +
        '<circle cx="30" cy="52" r="4" fill="hsl(25,50%,45%)"/>' +
        '<circle cx="30" cy="51" r="2.6" fill="hsl(28,55%,72%)"/>' +
        '<path d="M28 52q2 2 4 0" stroke="hsl(25,50%,45%)" stroke-width=".8" fill="none"/>'),
    });
    L('<path d="M4 84q-2-14 6-22q2 12 4 22Z" fill="' + P.leaf + '"/>' +
      '<path d="M14 86q-1-10 5-16q2 9 3 16Z" fill="' + P.leafLight + '"/>');
    diffs.push({
      x: 90, y: 80, r: 9, hide: true,
      layer: L('<path d="M96 86q2-14-6-22q-2 12-4 22Z" fill="' + P.leaf + '"/>'),
    });
    L('<path d="M14 26q4 14 2 28" stroke="' + P.leafDark + '" stroke-width="2" fill="none"/>');
    diffs.push({
      x: 17, y: 46, r: 10, subtle: true,
      layer: L('<circle cx="18" cy="38" r="2.4" fill="' + P.flower + '"/>' +
        '<circle cx="17" cy="46" r="2.2" fill="' + P.flower + '"/>' +
        '<circle cx="16" cy="54" r="2.2" fill="' + P.flower + '"/>'),
      build: function (layer) { return layer.split(P.flower).join(P.glow); },
    });
    diffs.push({
      x: 60, y: 20, r: 8, shift: { dx: -6, dy: -2 },
      layer: L('<path d="M60 20l6-4v8Z" fill="' + P.accent + '"/>' +
        '<path d="M60 20l-6-4v8Z" fill="' + P.accent + '" opacity=".8"/>' +
        '<circle cx="60" cy="20" r="1.3" fill="' + P.dark + '"/>'),
    });
    diffs.push({
      x: 66, y: 58, r: 7, subtle: true,
      extra: '<line x1="63" y1="59" x2="69" y2="57" stroke="' + P.dark + '" stroke-width="1"/>' +
        '<ellipse cx="62" cy="57.5" rx="2.2" ry="1" fill="' + P.paper + '" opacity=".9"/>' +
        '<ellipse cx="62" cy="59.5" rx="2.2" ry="1" fill="' + P.paper + '" opacity=".9"/>',
    });
    L('<ellipse cx="82" cy="82" rx="8" ry="3" fill="' + dtHsl(220, 12, 52) + '"/>');
    diffs.push({
      x: 18, y: 80, r: 8, hide: true,
      layer: L('<ellipse cx="18" cy="80" rx="7.5" ry="3" fill="' + dtHsl(220, 12, 52) + '"/>'),
    });
    return { layers: layers, diffs: diffs };
  }

  function dtMusicPalette(H) {
    return {
      wall: dtHsl(H, 25, 84),
      floor: dtHsl(H + 25, 30, 55),
      piano: dtHsl(H, 20, 22),
      pianoLit: dtHsl(H, 18, 32),
      paper: dtHsl(H, 35, 95),
      accent: dtHsl(H + 190, 55, 52),
      glow: dtHsl(45, 90, 70),
      wood: dtHsl(H + 25, 35, 42),
      cello: dtHsl(25, 50, 42),
      dark: dtHsl(H, 25, 18),
    };
  }

  function dtSceneMusic(P) {
    var layers = [];
    var diffs = [];
    function L(s) { layers.push(s); return layers.length - 1; }
    L('<rect width="100" height="100" fill="' + P.wall + '"/>');
    L('<rect y="70" width="100" height="30" fill="' + P.floor + '"/>' +
      '<path d="M0 78h100M0 88h100" stroke="' + P.wood + '" stroke-width="1"/>');
    L('<rect x="8" y="10" width="16" height="14" fill="' + P.glow + '" opacity=".75"/>' +
      '<rect x="8" y="10" width="16" height="14" fill="none" stroke="' + P.wood + '" stroke-width="2"/>' +
      '<line x1="16" y1="10" x2="16" y2="24" stroke="' + P.wood + '" stroke-width="1.5"/>');
    var clock = '<circle cx="28" cy="20" r="5.5" fill="' + P.paper + '" stroke="' + P.wood + '" stroke-width="1.5"/>' +
      '<line x1="28" y1="20" x2="28" y2="16.5" stroke="' + P.wood + '" stroke-width="1.2"/>' +
      '<line x1="28" y1="20" x2="30.5" y2="20" stroke="' + P.wood + '" stroke-width="1.2"/>';
    diffs.push({
      x: 28, y: 20, r: 6, subtle: true, layer: L(clock),
      build: function () {
        return clock.replace('<line x1="28" y1="20" x2="28" y2="16.5"', '<line x1="28" y1="20" x2="31" y2="18"')
          .replace('<line x1="28" y1="20" x2="30.5" y2="20"', '<line x1="28" y1="20" x2="28" y2="23"');
      },
    });
    diffs.push({
      x: 72, y: 22, r: 9, shift: { dx: 5, dy: 2 },
      layer: L('<line x1="72" y1="14" x2="72" y2="19" stroke="' + P.wood + '" stroke-width="1.4"/>' +
        '<circle cx="72" cy="18" r="3.8" fill="' + P.cello + '"/>' +
        '<circle cx="72" cy="24.5" r="4.8" fill="' + P.cello + '"/>' +
        '<line x1="72" y1="15" x2="72" y2="28" stroke="' + P.dark + '" stroke-width=".7"/>'),
    });
    L('<path d="M14 62q0-14 22-14q22 0 22 14l0 20-44 0Z" fill="' + P.piano + '"/>' +
      '<path d="M14 62L14 48L50 55L58 61L58 62Z" fill="' + P.pianoLit + '"/>' +
      '<rect x="14" y="70" width="42" height="6" fill="' + P.paper + '"/>' +
      '<path d="M18 70v6M23 70v6M28 70v6M33 70v6M38 70v6M43 70v6M48 70v6" stroke="' + P.dark + '" stroke-width="1.4"/>' +
      '<rect x="20" y="82" width="5" height="10" fill="' + P.piano + '"/>' +
      '<rect x="46" y="82" width="5" height="10" fill="' + P.piano + '"/>');
    L('<rect x="58" y="48" width="12" height="8" fill="' + P.accent + '"/>' +
      '<line x1="64" y1="56" x2="64" y2="86" stroke="' + P.wood + '" stroke-width="2"/>');
    diffs.push({
      x: 65, y: 45, r: 6, hide: true,
      layer: L('<rect x="59" y="41" width="10" height="7" fill="' + P.paper + '"/>' +
        '<path d="M60.5 44.5h7M60.5 46h7" stroke="' + P.dark + '" stroke-width=".7"/>'),
    });
    diffs.push({
      x: 40, y: 24, r: 6, hide: true,
      layer: L('<circle cx="40" cy="26" r="2" fill="' + P.dark + '"/>' +
        '<line x1="42" y1="26" x2="42" y2="18" stroke="' + P.dark + '" stroke-width="1.2"/>'),
    });
    L('<circle cx="30" cy="32" r="2" fill="' + P.dark + '"/><line x1="32" y1="32" x2="32" y2="24" stroke="' + P.dark + '" stroke-width="1.2"/>' +
      '<circle cx="50" cy="34" r="2" fill="' + P.dark + '"/><line x1="52" y1="34" x2="52" y2="26" stroke="' + P.dark + '" stroke-width="1.2"/>');
    diffs.push({
      x: 86, y: 66, r: 10, subtle: true,
      layer: L('<ellipse cx="86" cy="66" rx="7" ry="9" fill="' + P.cello + '"/>' +
        '<line x1="86" y1="42" x2="86" y2="58" stroke="' + P.wood + '" stroke-width="1.6"/>' +
        '<line x1="86" y1="76" x2="86" y2="90" stroke="' + P.wood + '" stroke-width="1.2"/>'),
      build: function (layer) { return layer.split(P.cello).join(dtHsl(210, 50, 55)); },
    });
    diffs.push({
      x: 36, y: 92, r: 10, subtle: true,
      layer: L('<ellipse cx="36" cy="92" rx="16" ry="4" fill="' + dtHsl(150, 40, 45) + '"/>'),
      build: function (layer) { return layer.replace(dtHsl(150, 40, 45), dtHsl(2, 70, 55)); },
    });
    diffs.push({
      x: 30, y: 77, r: 6, hide: true,
      layer: L('<circle cx="28.5" cy="77" r=".9" fill="' + P.glow + '"/><circle cx="31.5" cy="77" r=".9" fill="' + P.glow + '"/>'),
    });
    L('<path d="M25 80q5-5 10 0l-2 4h-6Z" fill="' + P.dark + '"/>');
    diffs.push({
      x: 92, y: 60, r: 7, subtle: true,
      extra: '<line x1="89" y1="50" x2="95" y2="70" stroke="' + P.wood + '" stroke-width="1.4"/>',
    });
    return { layers: layers, diffs: diffs };
  }

  function dtMuseumPalette(H) {
    return {
      hall: dtHsl(H, 18, 80),
      floor: dtHsl(H, 15, 64),
      bone: dtHsl(45, 30, 97),
      boneShade: dtHsl(40, 25, 74),
      fern: dtHsl(140, 40, 45),
      accent: dtHsl(H + 190, 55, 52),
      glow: dtHsl(45, 90, 70),
      rope: dtHsl(H + 25, 40, 50),
      wood: dtHsl(H + 25, 35, 42),
      dark: dtHsl(H, 25, 22),
    };
  }

  function dtSceneMuseum(P) {
    var layers = [];
    var diffs = [];
    function L(s) { layers.push(s); return layers.length - 1; }
    L('<rect width="100" height="100" fill="' + P.hall + '"/>');
    L('<rect y="70" width="100" height="30" fill="' + P.floor + '"/>' +
      '<path d="M0 76h100M0 84h100M0 92h100" stroke="' + P.boneShade + '" stroke-width=".8"/>' +
      '<path d="M20 70v30M50 70v30M80 70v30" stroke="' + P.boneShade + '" stroke-width=".8"/>');
    diffs.push({
      x: 78, y: 40, r: 8, hide: true,
      layer: L('<ellipse cx="78" cy="40" rx="6" ry="4.5" fill="' + P.bone + '"/>' +
        '<path d="M74 43l-4 3 5 .5Z" fill="' + P.bone + '"/>' +
        '<circle cx="79.5" cy="39" r="1" fill="' + P.dark + '"/>'),
    });
    L('<path d="M20 50q15-14 30-8q15 6 28-4" stroke="' + P.bone + '" stroke-width="3" fill="none"/>' +
      '<path d="M34 70v-9M58 70v-7" stroke="' + P.bone + '" stroke-width="2.5"/>');
    diffs.push({
      x: 44, y: 44, r: 9, subtle: true,
      layer: L('<path d="M36 46q4 6 0 10M44 44q4 6 0 10M52 45q4 6 0 10" stroke="' + P.bone + '" stroke-width="2" fill="none"/>'),
      build: function (layer) { return layer.replace(P.bone, P.boneShade); },
    });
    diffs.push({
      x: 10, y: 56, r: 8, subtle: true,
      layer: L('<path d="M10 62q-6-8-2-14q6 2 6 8M10 62q2-9 8-10q2 6-3 9M10 62q-8-4-8-10q6-1 8 4" fill="' + P.fern + '"/>' +
        '<rect x="7" y="62" width="6" height="6" fill="' + P.rope + '"/>'.replace(P.rope, dtHsl(25, 40, 50))),
      build: function (layer) { return layer.split(P.fern).join(dtHsl(25, 70, 55)); },
    });
    diffs.push({
      x: 40, y: 76, r: 9, shift: { dx: 6, dy: 0 },
      layer: L('<rect x="30" y="74" width="20" height="4" rx="1.5" fill="' + P.rope + '"/>' +
        '<line x1="33" y1="78" x2="33" y2="86" stroke="' + P.rope + '" stroke-width="2"/>' +
        '<line x1="47" y1="78" x2="47" y2="86" stroke="' + P.rope + '" stroke-width="2"/>'),
    });
    L('<rect x="58" y="12" width="16" height="12" fill="' + P.wood + '"/>' +
      '<rect x="60" y="14" width="12" height="8" fill="' + P.paper + '"/>');
    diffs.push({
      x: 66, y: 18, r: 7, hide: true,
      layer: L('<path d="M61 19q3-3 5 0q3-3 5 1l-2 1h-6Z" fill="' + P.dark + '"/>'),
    });
    L('<line x1="16" y1="66" x2="16" y2="86" stroke="' + P.dark + '" stroke-width="2"/>' +
      '<circle cx="16" cy="65" r="1.6" fill="' + P.glow + '"/>' +
      '<line x1="36" y1="66" x2="36" y2="86" stroke="' + P.dark + '" stroke-width="2"/>' +
      '<circle cx="36" cy="65" r="1.6" fill="' + P.glow + '"/>');
    diffs.push({
      x: 26, y: 64, r: 9, hide: true,
      layer: L('<path d="M16 66q10 6 20 0" stroke="' + P.rope + '" stroke-width="1.6" fill="none"/>'),
    });
    diffs.push({
      x: 24, y: 20, r: 8, subtle: true, hide: true,
      layer: L('<path d="M18 12L24 34L30 12Z" fill="' + dtHsl(200, 80, 62) + '" opacity=".4"/>'),
    });
    L('<path d="M62 12L68 34L74 12Z" fill="' + dtHsl(200, 80, 62) + '" opacity=".4"/>');
    diffs.push({
      x: 44, y: 20, r: 8, shift: { dx: 5, dy: 3 },
      layer: L('<path d="M40 22q4-6 8 0" stroke="' + P.accent + '" stroke-width="1.6" fill="none"/>' +
        '<path d="M42 20l2-4 2 4" fill="' + P.accent + '"/>' +
        '<line x1="44" y1="14" x2="44" y2="18" stroke="' + P.dark + '" stroke-width=".8"/>'),
    });
    diffs.push({
      x: 76, y: 78, r: 7, subtle: true,
      extra: '<path d="M74 78q2-3 4 0q-2 3-4 0Z" fill="' + P.boneShade + '"/>',
    });
    return { layers: layers, diffs: diffs };
  }

  function dtSushiPalette(H) {
    return {
      wall: dtHsl(H, 30, 80),
      counter: dtHsl(H + 20, 35, 50),
      counterTop: dtHsl(H + 20, 30, 60),
      paper: dtHsl(H, 40, 95),
      accent: dtHsl(H + 190, 55, 55),
      lantern: dtHsl(5, 75, 58),
      glow: dtHsl(45, 90, 70),
      salmon: dtHsl(15, 75, 60),
      tea: dtHsl(120, 25, 40),
      dark: dtHsl(H, 30, 22),
      tank: dtHsl(H + 190, 50, 70),
      wood: dtHsl(H + 20, 35, 45),
    };
  }

  function dtSceneSushi(P) {
    var layers = [];
    var diffs = [];
    function L(s) { layers.push(s); return layers.length - 1; }
    L('<rect width="100" height="100" fill="' + P.wall + '"/>');
    L('<line x1="20" y1="8" x2="20" y2="11" stroke="' + P.dark + '" stroke-width="1"/>' +
      '<line x1="48" y1="8" x2="48" y2="9.5" stroke="' + P.dark + '" stroke-width="1"/>' +
      '<line x1="76" y1="8" x2="76" y2="11" stroke="' + P.dark + '" stroke-width="1"/>');
    L('<circle cx="20" cy="14" r="3.5" fill="' + P.lantern + '"/><rect x="18.6" y="10.5" width="2.8" height="2" fill="' + P.dark + '"/>');
    diffs.push({
      x: 48, y: 12, r: 7, subtle: true, shift: { dx: 5, dy: 0 },
      layer: L('<circle cx="48" cy="12" r="3.5" fill="' + P.lantern + '"/><rect x="46.6" y="8.5" width="2.8" height="2" fill="' + P.dark + '"/>'),
    });
    diffs.push({
      x: 76, y: 14, r: 6, subtle: true,
      layer: L('<circle cx="76" cy="14" r="3.5" fill="' + P.lantern + '"/><rect x="74.6" y="10.5" width="2.8" height="2" fill="' + P.dark + '"/>'),
      build: function (layer) { return layer.replace(P.lantern, P.glow); },
    });
    L('<rect x="60" y="26" width="20" height="14" rx="2" fill="' + P.tank + '"/>' +
      '<rect x="60" y="26" width="20" height="14" rx="2" fill="none" stroke="' + P.wood + '" stroke-width="1.5"/>');
    diffs.push({
      x: 70, y: 33, r: 7, subtle: true, shift: { dx: 4, dy: -3 },
      layer: L('<circle cx="70" cy="33" r="2.5" fill="' + dtHsl(10, 75, 55) + '"/>' +
        '<path d="M66 33q4-3 8 0" stroke="' + P.dark + '" stroke-width=".8" fill="none"/>'),
    });
    var flags = '<rect x="8" y="26" width="6" height="8" fill="' + P.paper + '"/>' +
      '<rect x="16" y="26" width="6" height="8" fill="' + P.accent + '"/>' +
      '<rect x="24" y="26" width="6" height="8" fill="' + P.paper + '"/>' +
      '<path d="M6 26h30" stroke="' + P.dark + '" stroke-width="1"/>';
    diffs.push({
      x: 19, y: 30, r: 5, subtle: true, layer: L(flags),
      build: function () { return flags.replace(P.accent, P.glow); },
    });
    L('<path d="M30 46q0-7 7-7q7 0 7 7l1 10h-16Z" fill="' + P.paper + '"/>' +
      '<circle cx="37" cy="35" r="4" fill="hsl(25,45%,75%)"/>' +
      '<path d="M33.5 34.5h7" stroke="' + P.accent + '" stroke-width="1.6"/>');
    diffs.push({
      x: 37, y: 39, r: 5, subtle: true,
      layer: L('<path d="M33.5 34.5h7" stroke="' + dtHsl(5, 70, 55) + '" stroke-width="1.6"/>'),
      build: function (layer) { return layer.replace(dtHsl(5, 70, 55), dtHsl(180, 60, 45)); },
    });
    L('<rect y="56" width="100" height="10" fill="' + P.counterTop + '"/>' +
      '<rect y="66" width="100" height="34" fill="' + P.counter + '"/>' +
      '<path d="M16 66v34M40 66v34M64 66v34M88 66v34" stroke="' + P.dark + '" stroke-width="1.2"/>');
    L('<ellipse cx="52" cy="56" rx="6" ry="2" fill="' + P.paper + '"/>' +
      '<rect x="49" y="51" width="3" height="4.5" fill="' + P.paper + '"/>' +
      '<rect x="49" y="49.5" width="3" height="2.5" fill="' + P.salmon + '"/>');
    diffs.push({
      x: 55.5, y: 53, r: 6, hide: true,
      layer: L('<rect x="53.5" y="51" width="3" height="4.5" fill="' + P.paper + '"/>' +
        '<rect x="53.5" y="49.5" width="3" height="2.5" fill="' + P.salmon + '"/>'),
    });
    diffs.push({
      x: 68, y: 55, r: 7, shift: { dx: 4, dy: -2 },
      layer: L('<ellipse cx="68" cy="57" rx="5" ry="2" fill="' + P.paper + '"/>' +
        '<circle cx="66" cy="54" r="2.4" fill="' + P.dark + '"/><circle cx="66" cy="54" r="1" fill="' + P.paper + '"/>' +
        '<circle cx="70.5" cy="54" r="2.4" fill="' + P.dark + '"/><circle cx="70.5" cy="54" r="1" fill="' + P.paper + '"/>'),
    });
    diffs.push({
      x: 84, y: 46, r: 6, hide: true,
      layer: L('<path d="M84 50c2-2 2-3.5 0-5.5c-2-2-2-3.5 0-5.5" stroke="' + P.paper + '" stroke-width="1.4" fill="none" opacity=".9"/>'),
    });
    L('<ellipse cx="84" cy="52" rx="5" ry="4" fill="' + P.accent + '"/>' +
      '<path d="M88 50l4-2" stroke="' + P.accent + '" stroke-width="1.6"/>' +
      '<path d="M80 50q-3-2-2-4" stroke="' + P.accent + '" stroke-width="1.4" fill="none"/>');
    diffs.push({
      x: 62, y: 62, r: 6, subtle: true,
      extra: '<rect x="60.5" y="59" width="4" height="4.5" rx="1" fill="' + P.tea + '"/>',
    });
    L('<rect x="56" y="59" width="4" height="4.5" rx="1" fill="' + P.tea + '"/>');
    diffs.push({
      x: 46.5, y: 45, r: 6, subtle: true, hide: true,
      layer: L('<line x1="45" y1="49" x2="47.5" y2="42" stroke="' + P.wood + '" stroke-width="1.2"/>' +
        '<line x1="46.5" y1="49" x2="48.5" y2="42" stroke="' + P.wood + '" stroke-width="1.2"/>'),
    });
    L('<rect x="43" y="49" width="6" height="7" rx="1" fill="' + P.paper + '"/>');
    return { layers: layers, diffs: diffs };
  }

  function dtCircusPalette(H) {
    return {
      sky: dtHsl(H, 50, 78),
      red: dtHsl(5, 70, 55),
      paper: dtHsl(H, 45, 95),
      sand: dtHsl(40, 45, 75),
      glow: dtHsl(45, 90, 70),
      accent: dtHsl(H + 190, 55, 55),
      gold: dtHsl(45, 70, 60),
      dark: dtHsl(H, 30, 22),
      seal: dtHsl(90, 10, 70),
    };
  }

  function dtSceneCircus(P) {
    var layers = [];
    var diffs = [];
    function L(s) { layers.push(s); return layers.length - 1; }
    L('<rect width="100" height="100" fill="' + P.sky + '"/>');
    var bunting = '<path d="M4 8h44" stroke="' + P.dark + '" stroke-width="1"/>' +
      '<path d="M8 8l5 0-2.5 6Z" fill="' + P.red + '"/>' +
      '<path d="M18 8l5 0-2.5 6Z" fill="' + P.paper + '"/>' +
      '<path d="M28 8l5 0-2.5 6Z" fill="' + P.red + '"/>' +
      '<path d="M38 8l5 0-2.5 6Z" fill="' + P.paper + '"/>';
    diffs.push({
      x: 10.5, y: 11, r: 6, subtle: true, layer: L(bunting),
      build: function () { return bunting.replace(P.red, P.glow); },
    });
    L('<path d="M10 66Q50 18 90 66Z" fill="' + P.paper + '"/>' +
      '<path d="M24 52Q50 26 76 52L70 66Q50 44 30 66Z" fill="' + P.red + '"/>' +
      '<path d="M42 33Q50 28 58 33L60 66L40 66Z" fill="' + P.red + '"/>');
    diffs.push({ x: 50, y: 15, r: 6, hide: true, layer: L('<line x1="50" y1="8" x2="50" y2="22" stroke="' + P.dark + '" stroke-width="1.4"/><path d="M50 8l7 2.5-7 2.5Z" fill="' + P.red + '"/>') });
    diffs.push({
      x: 20, y: 32, r: 6, subtle: true,
      extra: '<path d="M18 30l5 0-2.5 5Z" fill="' + P.gold + '"/>',
    });
    L('<ellipse cx="50" cy="80" rx="32" ry="9" fill="' + P.sand + '"/>' +
      '<path d="M18 80a32 9 0 0 1 64 0" fill="none" stroke="' + P.accent + '" stroke-width="2"/>');
    diffs.push({
      x: 28, y: 58, r: 8, shift: { dx: -5, dy: -3 },
      layer: L('<circle cx="28" cy="58" r="4" fill="' + P.red + '"/>' +
        '<path d="M24.3 57q3.7-3 7.4 0" stroke="' + P.paper + '" stroke-width="1.3" fill="none"/>'),
    });
    L('<path d="M32 68q4-8 12-4l-2 6q-6 2-10 2Z" fill="' + P.seal + '"/>' +
      '<circle cx="43" cy="62" r="2.6" fill="' + P.seal + '"/>' +
      '<path d="M45 61l3 .5" stroke="' + P.dark + '" stroke-width="1"/>' +
      '<path d="M33 70q-3 2-6 0" stroke="' + P.seal + '" stroke-width="2" fill="none"/>');
    diffs.push({
      x: 73, y: 56, r: 6, hide: true,
      layer: L('<circle cx="71" cy="56" r="1.6" fill="' + P.glow + '"/><circle cx="74" cy="54.5" r="1.6" fill="' + P.glow + '"/><circle cx="76.5" cy="56.5" r="1.6" fill="' + P.glow + '"/>'),
    });
    L('<rect x="66" y="60" width="14" height="12" fill="' + P.paper + '"/>' +
      '<path d="M66 60h14M66 64h14M66 68h14" stroke="' + P.accent + '" stroke-width="1.4"/>' +
      '<circle cx="70" cy="74" r="2" fill="' + P.dark + '"/><circle cx="76" cy="74" r="2" fill="' + P.dark + '"/>');
    diffs.push({ x: 14, y: 41, r: 6, hide: true, layer: L('<circle cx="14" cy="40" r="4.2" fill="' + P.accent + '"/><line x1="14" y1="44" x2="13" y2="54" stroke="' + P.dark + '" stroke-width=".8"/>') });
    L('<circle cx="20" cy="36" r="4.2" fill="' + P.gold + '"/><line x1="20" y1="40" x2="14" y2="54" stroke="' + P.dark + '" stroke-width=".8"/>');
    diffs.push({
      x: 49, y: 42, r: 6, shift: { dx: 4, dy: -2 },
      layer: L('<rect x="46" y="40" width="6" height="4" fill="' + P.dark + '"/><rect x="44.5" y="43.5" width="9" height="1.6" fill="' + P.dark + '"/>'),
    });
    L('<path d="M44 48q5-5 10 0l1 12h-12Z" fill="' + P.dark + '"/>' +
      '<circle cx="49" cy="45" r="3.4" fill="hsl(25,45%,75%)"/>' +
      '<path d="M42 60h14" stroke="' + P.accent + '" stroke-width="2"/>');
    diffs.push({
      x: 84, y: 72, r: 8, subtle: true,
      layer: L('<rect x="80" y="68" width="9" height="8" fill="hsl(25,50%,55%)"/>' +
        '<ellipse cx="84.5" cy="68" rx="4.5" ry="1.6" fill="' + P.paper + '"/>' +
        '<ellipse cx="84.5" cy="76" rx="4.5" ry="1.6" fill="' + P.paper + '"/>'),
      build: function (layer) { return layer.replace("hsl(25,50%,55%)", P.glow); },
    });
    return { layers: layers, diffs: diffs };
  }

  function dtDragonPalette(H) {
    return {
      cave: dtHsl(H + 260, 25, 18),
      rock: dtHsl(H + 260, 20, 30),
      gold: dtHsl(45, 80, 55),
      goldDark: dtHsl(40, 70, 45),
      flame: dtHsl(25, 90, 55),
      glow: dtHsl(45, 90, 70),
      accent: dtHsl(H + 190, 50, 45),
      paper: dtHsl(H, 20, 90),
      dragon: dtHsl(120, 40, 38),
      dark: dtHsl(H + 260, 30, 12),
    };
  }

  function dtSceneDragon(P) {
    var layers = [];
    var diffs = [];
    function L(s) { layers.push(s); return layers.length - 1; }
    L('<rect width="100" height="100" fill="' + P.cave + '"/>');
    L('<path d="M62 4l3 10-6 0Z" fill="' + P.rock + '"/>' +
      '<path d="M88 2l4 12-8 0Z" fill="' + P.rock + '"/>' +
      '<path d="M12 8l5 14-10 0Z" fill="' + P.rock + '"/>');
    diffs.push({
      x: 30, y: 10, r: 7, hide: true,
      layer: L('<path d="M27 2l4 12-8 0Z" fill="' + P.rock + '"/>'),
    });
    L('<path d="M30 70q-4-16 10-22q16-7 30 2q10 7 8 20l-48 0Z" fill="' + P.dragon + '"/>');
    diffs.push({
      x: 42, y: 52, r: 9, subtle: true,
      layer: L('<path d="M34 58q6-10 16-8q-2 8-8 10Z" fill="' + P.dragon + '"/>'),
      build: function (layer) { return layer.replace(P.dragon, dtHsl(85, 45, 40)); },
    });
    diffs.push({
      x: 66, y: 48, r: 10, shift: { dx: 6, dy: -2 },
      layer: L('<circle cx="66" cy="48" r="6" fill="' + P.dragon + '"/>' +
        '<path d="M71 46q5-1 5 3q-2 2-5 1Z" fill="' + P.dragon + '"/>' +
        '<path d="M62 42l1.5-3 1.5 3M67 41l1.5-3 1.5 3" fill="' + P.paper + '"/>' +
        '<path d="M63 48q2 1 4 0" stroke="' + P.dark + '" stroke-width=".9" fill="none"/>'),
    });
    diffs.push({
      x: 58, y: 70, r: 6, subtle: true,
      extra: '<circle cx="58" cy="70" r="2.5" fill="' + P.goldDark + '"/>',
    });
    L('<ellipse cx="52" cy="76" rx="17" ry="6" fill="' + P.gold + '"/>' +
      '<circle cx="46" cy="72" r="2.2" fill="' + P.goldDark + '"/>' +
      '<circle cx="52" cy="74" r="2.2" fill="' + P.goldDark + '"/>' +
      '<circle cx="48" cy="70" r="2" fill="' + P.gold + '"/>');
    diffs.push({
      x: 16, y: 29, r: 7, hide: true,
      layer: L('<path d="M16 32q4-4 2-8q-6 2-2 8Z" fill="' + P.flame + '"/>'),
    });
    L('<line x1="16" y1="40" x2="16" y2="56" stroke="hsl(25,45%,35%)" stroke-width="2.5"/>' +
      '<circle cx="16" cy="33" r="2" fill="' + P.glow + '"/>');
    diffs.push({
      x: 85, y: 71, r: 9, shift: { dx: 5, dy: 0 },
      layer: L('<rect x="78" y="66" width="14" height="10" rx="1" fill="hsl(25,50%,40%)"/>' +
        '<path d="M78 66q7-6 14 0" fill="hsl(25,50%,40%)"/>' +
        '<line x1="78" y1="68" x2="92" y2="68" stroke="' + P.gold + '" stroke-width="1.5"/>'),
    });
    diffs.push({
      x: 58, y: 14, r: 7, subtle: true, shift: { dx: 5, dy: 2 },
      layer: L('<circle cx="58" cy="14" r="2.4" fill="' + P.dark + '"/>' +
        '<path d="M58 12l-5-2 4 4ZM58 12l5-2-4 4Z" fill="' + P.dark + '"/>'),
    });
    diffs.push({
      x: 28, y: 72, r: 6, hide: true,
      layer: L('<path d="M28 66l3 6-6 0Z" fill="' + P.accent + '"/>'),
    });
    L('<path d="M22 70l3 6-6 0Z" fill="' + P.accent + '"/>');
    diffs.push({
      x: 76, y: 44, r: 6, subtle: true, hide: true,
      layer: L('<path d="M74 44q3-2 5 0q-3 2-5 0Z" fill="' + P.paper + '" opacity=".5"/>'),
    });
    return { layers: layers, diffs: diffs };
  }

  function dtTrainPalette(H) {
    return {
      panel: dtHsl(H, 20, 82),
      seat: dtHsl(350, 45, 55),
      wood: dtHsl(H + 25, 35, 45),
      paper: dtHsl(H, 35, 95),
      accent: dtHsl(H + 190, 55, 52),
      glow: dtHsl(45, 90, 70),
      hill: dtHsl(100, 35, 55),
      dark: dtHsl(H, 25, 22),
      gold: dtHsl(45, 70, 60),
      sky: dtHsl(H + 205, 55, 78),
      sunset: dtHsl(30, 60, 78),
      hillAutumn: dtHsl(30, 45, 55),
    };
  }

  function dtSceneTrain(P) {
    var layers = [];
    var diffs = [];
    function L(s) { layers.push(s); return layers.length - 1; }
    L('<rect width="100" height="100" fill="' + P.panel + '"/>' +
      '<line x1="0" y1="46" x2="100" y2="46" stroke="' + P.wood + '" stroke-width="2"/>');
    L('<rect x="12" y="12" width="44" height="26" rx="2" fill="' + P.sky + '"/>');
    diffs.push({
      x: 30, y: 22, r: 7, subtle: true,
      extra: '<path d="M26 22q2.5-2.5 5 0q2.5-2.5 5 0" stroke="' + P.dark + '" stroke-width="1.3" fill="none"/>',
    });
    diffs.push({
      x: 28, y: 34, r: 9, subtle: true,
      layer: L('<path d="M12 38q8-10 16-4q6-6 14-2l0 6-30 0Z" fill="' + P.hill + '"/>'),
      build: function (layer) { return layer.replace(P.hill, P.hillAutumn); },
    });
    L('<rect x="12" y="12" width="44" height="26" rx="2" fill="none" stroke="' + P.wood + '" stroke-width="2.5"/>' +
      '<line x1="34" y1="12" x2="34" y2="38" stroke="' + P.wood + '" stroke-width="1.8"/>');
    diffs.push({
      x: 34, y: 52, r: 12, shift: { dx: 0, dy: 0 },
      layer: L('<rect x="14" y="42" width="40" height="16" rx="3" fill="' + P.seat + '"/>' +
        '<rect x="14" y="60" width="40" height="10" rx="3" fill="' + P.seat + '"/>'),
      build: function (layer) { return layer.split(P.seat).join(dtHsl(210, 45, 55)); },
    });
    L('<line x1="58" y1="28" x2="92" y2="28" stroke="' + P.wood + '" stroke-width="2.5"/>' +
      '<line x1="62" y1="28" x2="62" y2="22" stroke="' + P.wood + '" stroke-width="1.5"/>' +
      '<line x1="88" y1="28" x2="88" y2="22" stroke="' + P.wood + '" stroke-width="1.5"/>');
    diffs.push({
      x: 72, y: 24, r: 8, hide: true,
      layer: L('<rect x="66" y="20" width="12" height="8" rx="1" fill="hsl(30,50%,50%)"/>' +
        '<path d="M69 20v-1.5a3 3 0 0 1 6 0V20" fill="none" stroke="hsl(30,50%,40%)" stroke-width="1.2"/>'),
    });
    L('<line x1="88" y1="34" x2="88" y2="38" stroke="' + P.dark + '" stroke-width="1.4"/>');
    diffs.push({
      x: 88, y: 41, r: 7, hide: true,
      layer: L('<ellipse cx="88" cy="42" rx="5" ry="1.5" fill="' + P.dark + '"/>' +
        '<path d="M84.5 42q3.5-6 7 0Z" fill="' + P.dark + '"/>'),
    });
    L('<rect x="30" y="72" width="20" height="4" rx="1" fill="' + P.wood + '"/>' +
      '<line x1="33" y1="76" x2="33" y2="86" stroke="' + P.wood + '" stroke-width="2"/>' +
      '<line x1="47" y1="76" x2="47" y2="86" stroke="' + P.wood + '" stroke-width="2"/>');
    diffs.push({
      x: 38, y: 68, r: 6, subtle: true, shift: { dx: 4, dy: -2 },
      layer: L('<rect x="36" y="66" width="4.5" height="5.5" rx="1" fill="' + P.paper + '"/>' +
        '<ellipse cx="38.2" cy="66" rx="2.4" ry=".9" fill="hsl(120,25%,40%)"/>'),
    });
    diffs.push({
      x: 48, y: 61, r: 6, subtle: true, hide: true,
      layer: L('<circle cx="48" cy="61" r="2" fill="' + P.glow + '"/>'),
    });
    L('<rect x="46" y="63" width="4" height="8" fill="' + P.accent + '"/>');
    diffs.push({
      x: 63, y: 77, r: 7, subtle: true,
      layer: L('<rect x="58" y="74" width="10" height="7" fill="' + P.paper + '" transform="rotate(-4 63 77)"/>' +
        '<path d="M59.5 76.5h7M59.5 78.5h7" stroke="' + P.dark + '" stroke-width=".7"/>'),
      build: function (layer) { return layer.replace(P.dark, P.accent); },
    });
    diffs.push({
      x: 80, y: 18, r: 6, hide: true,
      layer: L('<circle cx="80" cy="18" r="2.2" fill="' + P.glow + '"/>'),
    });
    L('<path d="M76 14l8 0-1.5-5-5 0Z" fill="' + P.gold + '"/>' +
      '<path d="M74 14h12" stroke="' + P.wood + '" stroke-width="1.6"/>' +
      '<line x1="80" y1="20" x2="80" y2="24" stroke="' + P.wood + '" stroke-width="1.2"/>');
    diffs.push({
      x: 58, y: 20, r: 8, shift: { dx: 4, dy: 0 },
      layer: L('<path d="M56 12q4 8 0 16" stroke="' + P.accent + '" stroke-width="5" fill="none"/>'),
    });
    return { layers: layers, diffs: diffs };
  }

  var dtScenes = [
    { paint: dtSceneStudy, palette: dtStudyPalette },
    { paint: dtSceneBeach, palette: dtBeachPalette },
    { paint: dtSceneMarket, palette: dtMarketPalette },
    { paint: dtSceneSpace, palette: dtSpacePalette },
    { paint: dtSceneGarden, palette: dtGardenPalette },
    { paint: dtSceneToy, palette: dtToyPalette },
    { paint: dtSceneBakery, palette: dtBakeryPalette },
    { paint: dtSceneCabin, palette: dtCabinPalette },
    { paint: dtSceneJungle, palette: dtJunglePalette },
    { paint: dtSceneMusic, palette: dtMusicPalette },
    { paint: dtSceneMuseum, palette: dtMuseumPalette },
    { paint: dtSceneSushi, palette: dtSushiPalette },
    { paint: dtSceneCircus, palette: dtCircusPalette },
    { paint: dtSceneDragon, palette: dtDragonPalette },
    { paint: dtSceneTrain, palette: dtTrainPalette },
  ];
  /* Exported so checks and curious players can see the whole deck. */
  App.doubleTakeDeck = dtScenes;

  function initDoubleTakeGame(panelEl) {
    if (!panelEl) {
      return;
    }

    var campaign = createCampaign({ key: "double-take-campaign", levels: dtZones, version: 2 });
    var zone = dtZones[Math.max(0, campaign.indexOf(campaign.nextLevelId()))];
    var runActive = false;
    var roundOpen = false;
    var round = 1;
    var hearts = dtMaxHearts;
    var score = 0;
    var streak = 0;
    var mistakes = 0;
    var hintsLeft = dtMaxHints;
    var picks = [];
    var foundSet = [];
    var cursors = [{ x: 50, y: 50 }, { x: 50, y: 50 }];
    var dealId = null;
    var flashId = null;
    var shakeId = null;
    var puffId = null;
    /* Scenes deal from a shuffle bag: no repeats until the whole deck has
     * been dealt, so a level of three or four pairs never shows the same
     * painting twice and the ladder keeps rotating fresh walls. */
    var sceneBag = [];
    var lastSceneIdx = -1;

    function dealScene() {
      if (!sceneBag.length) {
        sceneBag = dtShuffle(dtScenes.map(function (scene, index) {
          return index;
        }));
        /* A fresh deck that reopens with the scene just played would still
         * read as a duplicate: push that one to the far end instead. */
        if (lastSceneIdx !== -1 && sceneBag[sceneBag.length - 1] === lastSceneIdx) {
          sceneBag.unshift(sceneBag.pop());
        }
      }
      lastSceneIdx = sceneBag.pop();
      return dtScenes[lastSceneIdx];
    }

    /* --- markup: built with createElement so the headless harness sees it --- */
    var hud = document.createElement("div");
    hud.className = "game-hud";
    var roundEl = document.createElement("strong");
    var heartsEl = document.createElement("strong");
    var scoreEl = document.createElement("strong");
    hud.appendChild(makeStat("dtRoundLabel", roundEl));
    hud.appendChild(makeStat("dtHeartsLabel", heartsEl));
    hud.appendChild(makeStat("dtScoreLabel", scoreEl));

    var board = document.createElement("div");
    board.className = "dt-board";
    board.setAttribute("role", "group");
    board.setAttribute("aria-label", t("dtBoardLabel"));
    var stage = document.createElement("div");
    stage.className = "dt-stage";
    var copies = [0, 1].map(function (side) {
      var copy = document.createElement("div");
      copy.className = "dt-copy dt-in";
      copy.setAttribute("role", "button");
      copy.setAttribute("tabindex", "0");
      copy.setAttribute("aria-label", t("dtCopyLabel", { n: side + 1 }));
      copy.style.setProperty("animation-delay", side * 70 + "ms");
      var sceneEl = document.createElement("div");
      sceneEl.className = "dt-scene";
      sceneEl.setAttribute("aria-hidden", "true");
      var rings = document.createElement("div");
      rings.className = "dt-rings";
      rings.setAttribute("aria-hidden", "true");
      var cursor = document.createElement("div");
      cursor.className = "dt-cursor";
      cursor.setAttribute("aria-hidden", "true");
      cursor.style.setProperty("left", "50%");
      cursor.style.setProperty("top", "50%");
      copy.appendChild(sceneEl);
      copy.appendChild(rings);
      copy.appendChild(cursor);
      copy.addEventListener("click", function (event) {
        probeAt(side, event);
      });
      copy.addEventListener("keydown", function (event) {
        onCopyKey(side, event);
      });
      board.appendChild(copy);
      return { el: copy, scene: sceneEl, rings: rings, cursor: cursor };
    });
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
    zoneLabel.setAttribute("for", "dtZoneSel");
    zoneLabel.setAttribute("data-i18n", "dtZoneSelectLabel");
    zoneLabel.textContent = t("dtZoneSelectLabel");
    var zoneSel = document.createElement("select");
    zoneSel.className = "elements-select";
    zoneSel.id = "dtZoneSel";
    zoneRow.appendChild(zoneLabel);
    zoneRow.appendChild(zoneSel);

    var actions = document.createElement("div");
    actions.className = "game-actions";
    var hintBtn = document.createElement("button");
    hintBtn.type = "button";
    hintBtn.className = "dt-btn";
    var hintLabel = document.createElement("span");
    hintBtn.appendChild(hintLabel);
    var newBtn = document.createElement("button");
    newBtn.type = "button";
    newBtn.className = "primary";
    var newLabel = document.createElement("span");
    newLabel.setAttribute("data-i18n", "dtBtnNew");
    newLabel.textContent = t("dtBtnNew");
    var newContent = document.createElement("span");
    newContent.className = "button-content";
    newContent.appendChild(newLabel);
    newBtn.appendChild(newContent);
    var bestEl = document.createElement("p");
    bestEl.className = "game-best";
    actions.appendChild(hintBtn);
    actions.appendChild(newBtn);
    actions.appendChild(bestEl);

    var hint = document.createElement("p");
    hint.className = "game-hint";
    hint.setAttribute("data-i18n", "dtHint");
    hint.textContent = t("dtHint");

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
        (best ? t("dtBest", { n: best }) + " \u00b7 " : "") +
        t("campaignStars", {
          n: campaign.totalStars(),
          max: campaign.maxStars(),
        });
      renderHintLabel();
    }

    function renderHintLabel() {
      hintLabel.textContent = t("dtBtnHint", { n: hintsLeft });
      if (hintsLeft <= 0) {
        hintBtn.setAttribute("aria-disabled", "true");
      } else {
        hintBtn.removeAttribute("aria-disabled");
      }
    }

    function dtGlyphs(ch, count) {
      var out = "";
      for (var index = 0; index < count; index += 1) {
        out += ch;
      }
      return out;
    }

    function updateHud() {
      roundEl.textContent = t("dtRoundStat", {
        n: Math.min(round, zone.rounds),
        total: zone.rounds,
      });
      heartsEl.textContent =
        dtGlyphs("\u2665", Math.max(0, hearts)) +
        dtGlyphs("\u2661", Math.max(0, dtMaxHearts - hearts));
      heartsEl.setAttribute("aria-label", t("dtHeartsLeft", { n: hearts }));
      scoreEl.textContent = String(score);
      board.classList.toggle("is-hot", streak >= 3);
    }

    /* Ring offset per copy: a shifted element sits at its old spot on the
     * left photo and its new spot on the right one. */
    function ringOffset(diff) {
      if (diff.off) {
        return diff.off;
      }
      if (diff.shift) {
        return diff.shift;
      }
      return { dx: 0, dy: 0 };
    }

    function centerFor(diff, side) {
      var off = ringOffset(diff);
      return {
        x: diff.x + (side === 1 ? off.dx : 0),
        y: diff.y + (side === 1 ? off.dy : 0),
      };
    }

    /* One pair per round: a fresh scene and palette develop into two
     * prints, the picked forgeries are applied to the right print, and the
     * board deals in. */
    function buildRound() {
      window.clearTimeout(dealId);
      dealId = null;
      window.clearTimeout(flashId);
      flashId = null;
      roundOpen = true;
      foundSet = [];
      cursors = [{ x: 50, y: 50 }, { x: 50, y: 50 }];

      var scene = dealScene();
      var P = scene.palette(Math.random() * 360);
      var built = scene.paint(P);
      picks = dtPick(built.diffs, zone.count, zone.prefer);

      var layersA = built.layers.slice();
      var layersB = built.layers.slice();
      var extras = [];
      picks.forEach(function (d) {
        if (d.hide) {
          layersB[d.layer] = "";
        } else if (d.build) {
          layersB[d.layer] = d.build(layersA[d.layer]);
        } else if (d.shift) {
          layersB[d.layer] =
            '<g transform="translate(' + d.shift.dx + " " + d.shift.dy + ')">' +
            layersA[d.layer] +
            "</g>";
        } else if (d.extra) {
          extras.push(d.extra);
        }
      });

      var uriA = sceneUri(layersA.join(""));
      var uriB = sceneUri(layersB.join("") + extras.join(""));
      copies.forEach(function (copy, side) {
        copy.scene.style.setProperty("background-image", side === 0 ? uriA : uriB);
        copy.rings.textContent = "";
        var c = cursors[side];
        copy.cursor.style.setProperty("left", c.x + "%");
        copy.cursor.style.setProperty("top", c.y + "%");
      });
      updateHud();
    }

    function sceneUri(inner) {
      var svg =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
        inner +
        "</svg>";
      return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")';
    }

    function probeAt(side, event) {
      if (!runActive || !roundOpen) {
        return;
      }
      var rect = copies[side].el.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        return;
      }
      var x = ((event.clientX - rect.left) / rect.width) * 100;
      var y = ((event.clientY - rect.top) / rect.height) * 100;
      probe(side, x, y, copies[side].el);
    }

    function onCopyKey(side, event) {
      var step = 6;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        moveCursor(side, -step, 0);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        moveCursor(side, step, 0);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        moveCursor(side, 0, -step);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        moveCursor(side, 0, step);
      } else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        var c = cursors[side];
        probe(side, c.x, c.y, copies[side].el);
      }
    }

    function moveCursor(side, dx, dy) {
      var c = cursors[side];
      c.x = Math.max(3, Math.min(97, c.x + dx));
      c.y = Math.max(3, Math.min(97, c.y + dy));
      copies[side].cursor.style.setProperty("left", c.x + "%");
      copies[side].cursor.style.setProperty("top", c.y + "%");
    }

    function probe(side, x, y, tileEl) {
      if (!runActive || !roundOpen) {
        return;
      }
      for (var index = 0; index < picks.length; index += 1) {
        if (foundSet.indexOf(index) !== -1) {
          continue;
        }
        var c = centerFor(picks[index], side);
        var dx = x - c.x;
        var dy = y - c.y;
        if (dx * dx + dy * dy <= picks[index].r * picks[index].r) {
          markFound(index);
          return;
        }
      }
      miss(tileEl);
    }

    function markFound(index) {
      foundSet.push(index);
      streak += 1;
      var gained = Math.min(300, 100 + (streak - 1) * 25);
      score += gained;
      var d = picks[index];
      copies.forEach(function (copy, side) {
        var c = centerFor(d, side);
        addRing(copy, c.x, c.y, d.r, "is-found");
      });
      floatPoints(copies[0], d.x, d.y, "+" + gained);
      updateHud();
      if (foundSet.length === picks.length) {
        roundOpen = false;
        result.textContent = t("dtRoundUp") + " " + t("dtHit", { n: gained });
        if (round >= zone.rounds) {
          zoneCleared();
        } else {
          round += 1;
          dealId = window.setTimeout(buildRound, 650);
        }
      } else {
        result.textContent =
          t("dtHit", { n: gained }) + " " + t("dtFound", { n: foundSet.length, total: picks.length });
      }
    }

    function addRing(copy, x, y, r, kind) {
      var ring = document.createElement("span");
      ring.className = "dt-ring " + kind;
      ring.style.setProperty("left", x + "%");
      ring.style.setProperty("top", y + "%");
      ring.style.setProperty("width", Math.min(46, r * 2.8) + "%");
      copy.rings.appendChild(ring);
      return ring;
    }

    function miss(tileEl) {
      hearts -= 1;
      streak = 0;
      mistakes += 1;
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
          hearts === 1 ? t("dtLastHeart") : t("dtWrong");
      }
    }

    function floatPoints(copy, x, y, text) {
      var puff = document.createElement("span");
      puff.className = "dt-float";
      puff.textContent = text;
      puff.style.setProperty("left", x + "%");
      puff.style.setProperty("top", y + "%");
      copy.el.appendChild(puff);
      window.clearTimeout(puffId);
      puffId = window.setTimeout(function () {
        if (puff.parentNode) {
          puff.parentNode.removeChild(puff);
        }
      }, 920);
    }

    /* A hint pulses one unfound forgery on both photos without marking it. */
    function useHint() {
      if (!runActive || !roundOpen || hintsLeft <= 0) {
        return;
      }
      var remaining = [];
      picks.forEach(function (d, index) {
        if (foundSet.indexOf(index) === -1) {
          remaining.push(index);
        }
      });
      if (!remaining.length) {
        return;
      }
      hintsLeft -= 1;
      renderHintLabel();
      var pick = picks[remaining[Math.floor(Math.random() * remaining.length)]];
      var flashed = [];
      copies.forEach(function (copy, side) {
        var c = centerFor(pick, side);
        flashed.push(addRing(copy, c.x, c.y, pick.r, "is-hint"));
      });
      window.clearTimeout(flashId);
      flashId = window.setTimeout(function () {
        flashed.forEach(function (ring) {
          if (ring.parentNode) {
            ring.parentNode.removeChild(ring);
          }
        });
      }, 1400);
    }

    hintBtn.addEventListener("click", useHint);

    /* Out of hearts: the run ends and every unfound forgery lights up so
     * the miss becomes a lesson. Nothing is recorded on a failed run. */
    function runOut() {
      runActive = false;
      roundOpen = false;
      window.clearTimeout(dealId);
      dealId = null;
      picks.forEach(function (d, index) {
        if (foundSet.indexOf(index) !== -1) {
          return;
        }
        copies.forEach(function (copy, side) {
          var c = centerFor(d, side);
          addRing(copy, c.x, c.y, d.r, "is-reveal");
        });
      });
      result.textContent = t("dtRunOut", {
        n: score,
        f: foundSet.length,
        r: Math.min(round, zone.rounds),
      });
    }

    function zoneCleared() {
      runActive = false;
      var starsWon = starsFor(mistakes, dtStarBands, "low");
      var outcome = campaign.record(zone.id, {
        stars: starsWon,
        best: score,
        better: "high",
      });
      var message = t("dtCleared", {
        name: zoneName(zone),
        s: starsWon,
        n: score,
      });
      if (outcome.isBest) {
        message += " " + t("newBest");
      }
      if (outcome.unlockedNext) {
        message += " " + t("dtNextZone");
      } else if (campaign.clearedCount() === dtZones.length) {
        message += " " + t("dtAllZones");
      }
      result.textContent = message;
      logAction(t("logDoubleTake", { name: zoneName(zone), s: starsWon, n: score }));
      var rect = newBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear || starsWon === 3);
      refreshPicker();
    }

    function startRun() {
      window.clearTimeout(dealId);
      dealId = null;
      window.clearTimeout(flashId);
      flashId = null;
      round = 1;
      hearts = dtMaxHearts;
      score = 0;
      streak = 0;
      mistakes = 0;
      hintsLeft = dtMaxHints;
      runActive = true;
      result.textContent = t("dtPrompt", {
        name: zoneName(zone),
        k: zone.count,
        r: zone.rounds,
      });
      refreshPicker();
      buildRound();
    }

    newBtn.addEventListener("click", startRun);

    zoneSel.addEventListener("change", function () {
      var index = campaign.indexOf(zoneSel.value);
      if (index >= 0 && campaign.isUnlocked(zoneSel.value)) {
        zone = dtZones[index];
        startRun();
      } else {
        zoneSel.value = zone.id;
      }
    });

    App.quietResetDoubleTake = function () {
      window.clearTimeout(dealId);
      window.clearTimeout(shakeId);
      window.clearTimeout(puffId);
      window.clearTimeout(flashId);
      dealId = null;
      shakeId = null;
      puffId = null;
      flashId = null;
      startRun();
    };

    startRun();
  }

  /* Bilingual copy travels with the game: addStrings only fills keys i18n.js
   * does not already own, so the shared dictionary stays authoritative. */
  App.addStrings({
    en: {
      "tabDoubleTake": "Double Take",
      "dtRoundLabel": "Round",
      "dtHeartsLabel": "Hearts",
      "dtScoreLabel": "Score",
      "dtZoneSelectLabel": "Choose a level",
      "dtZoneName": "{a} {b}",
      "dtAdjQuiet": "Quiet",
      "dtAdjSunlit": "Sunlit",
      "dtAdjMisty": "Misty",
      "dtAdjVelvet": "Velvet",
      "dtAdjMidnight": "Midnight",
      "dtNounPostcards": "Postcards",
      "dtNounStudio": "Studio",
      "dtNounGallery": "Gallery",
      "dtNounExhibit": "Exhibit",
      "dtNounVault": "Vault",
      "dtNounAttic": "Attic",
      "dtNounHarbor": "Harbor",
      "dtNounRooftop": "Rooftop",
      "dtNounGreenhouse": "Greenhouse",
      "dtNounArchive": "Archive",
      "dtRoundStat": "{n}/{total}",
      "dtHeartsLeft": "{n} of 3 hearts left",
      "dtBtnNew": "New run",
      "dtBtnHint": "Hint ({n})",
      "dtPrompt": "{name}: each pair hides {k} differences. {r} rounds, three hearts.",
      "dtHit": "+{n} points.",
      "dtFound": "{n} of {total} found.",
      "dtRoundUp": "Pair solved!",
      "dtWrong": "Nothing there - a heart fades.",
      "dtLastHeart": "Last heart - make it count.",
      "dtRunOut": "Out of hearts at {n} points after {f} finds in round {r}. The rest are lit.",
      "dtCleared": "{name} cleared - {s} stars, {n} points.",
      "dtNextZone": "Next level unlocked.",
      "dtAllZones": "All fifty levels are solved.",
      "dtBest": "Best {n}",
      "dtBoardLabel": "Two photos side by side - find what differs",
      "dtCopyLabel": "Photo {n} - tap a difference",
      "dtHint": "Compare edge to edge - something moved, vanished, changed colour or grew a twin.",
      "logDoubleTake": "Solved {name} for {s} stars and {n} points",
    },
    zh: {
      "tabDoubleTake": "火眼金睛",
      "dtRoundLabel": "回合",
      "dtHeartsLabel": "红心",
      "dtScoreLabel": "得分",
      "dtZoneSelectLabel": "选择等级",
      "dtZoneName": "{a}{b}",
      "dtAdjQuiet": "静谧",
      "dtAdjSunlit": "向阳",
      "dtAdjMisty": "薄雾",
      "dtAdjVelvet": "绒面",
      "dtAdjMidnight": "午夜",
      "dtNounPostcards": "明信片",
      "dtNounStudio": "摄影棚",
      "dtNounGallery": "画廊",
      "dtNounExhibit": "展览厅",
      "dtNounVault": "密藏室",
      "dtNounAttic": "阁楼",
      "dtNounHarbor": "海港",
      "dtNounRooftop": "天台",
      "dtNounGreenhouse": "暖房",
      "dtNounArchive": "档案馆",
      "dtRoundStat": "{n}/{total}",
      "dtHeartsLeft": "还剩 {n} 颗红心",
      "dtBtnNew": "重新开始",
      "dtBtnHint": "提示 ({n})",
      "dtPrompt": "「{name}」：每对照片藏着 {k} 处不同。共 {r} 轮，三颗红心。",
      "dtHit": "+{n} 分。",
      "dtFound": "已找到 {n}/{total} 处。",
      "dtRoundUp": "这对对上了！",
      "dtWrong": "那里没有不同 - 熄灭一颗红心。",
      "dtLastHeart": "最后一颗红心 - 稳住。",
      "dtRunOut": "红心用尽：第 {r} 轮找到 {f} 处，共 {n} 分。其余不同已点亮。",
      "dtCleared": "「{name}」通关 - {s} 星，{n} 分。",
      "dtNextZone": "下一级已解锁。",
      "dtAllZones": "五十级全部告破。",
      "dtBest": "最佳 {n}",
      "dtBoardLabel": "两张照片并排 - 找出不同之处",
      "dtCopyLabel": "照片 {n} - 点击不同之处",
      "dtHint": "从边缘逐块对比 - 有东西移动、消失、变色或多出了一个双胞胎。",
      "logDoubleTake": "以 {s} 星、{n} 分侦破「{name}」",
    },
  });

  App.registerGame({
    name: "doubleTake",
    tabKey: "tabDoubleTake",
    init: initDoubleTakeGame,
    guide: {
      svg:
        '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="6" y="6" width="108" height="64" rx="5" fill="rgba(30,41,59,.75)" stroke="rgba(148,163,184,.45)"/>' +
        '<rect x="14" y="14" width="40" height="34" rx="3" fill="hsl(205,60%,72%)"/>' +
        '<line x1="14" y1="36" x2="54" y2="36" stroke="hsl(205,45%,40%)" stroke-width="2.5"/>' +
        '<circle cx="24" cy="22" r="4" fill="#fbbf24"/>' +
        '<circle cx="44" cy="30" r="2" fill="hsl(0,0%,90%)"/>' +
        '<rect x="66" y="14" width="40" height="34" rx="3" fill="hsl(205,60%,72%)"/>' +
        '<line x1="66" y1="36" x2="106" y2="36" stroke="hsl(205,45%,40%)" stroke-width="2.5"/>' +
        '<circle cx="72" cy="22" r="4" fill="#fbbf24"/>' +
        '<circle cx="80" cy="40" r="5" fill="none" stroke="#4ade80" stroke-width="2"/>' +
        '<circle cx="92" cy="20" r="4" fill="#4ade80" fill-opacity="0.15" stroke="#4ade80" stroke-width="2"/></svg>',
      en: [
        "Aim: two near-identical photos sit side by side; the pair hides a handful of differences. Find them all.",
        "Action: tap the spot on either photo where something differs - the marker lands on both.",
        "Rule: streaks raise each award, but a tap on an unchanged spot costs one of three hearts.",
        "Watch out: the fifty-level ladder climbs from three bold edits to nine subtle ones, and every tenth level runs a fourth round.",
        "Scoring: solve every pair in a level to bank stars - flawless runs earn three - and unlock the next level.",
      ],
      zh: [
        "目标：两张几乎一样的照片并排放着，每对藏着若干处不同。把它们全部找出来。",
        "操作：在任意一张照片上点击不同之处，两张照片都会标出记号。",
        "规则：连中会提高每次得分，点在没有变化的地方则熄灭一颗红心（共三颗）。",
        "小心：五十级天梯从三处大胆改动爬升到九处隐蔽改动，每逢十级还会多出一轮。",
        "计分：清空整级轮次即可获得星星——零失误得三星——并解锁下一级。",
      ],
    },
  });

  /* Exported for the other modules. */
  App.initDoubleTakeGame = initDoubleTakeGame;
})(window.CapitalConvert = window.CapitalConvert || {});
