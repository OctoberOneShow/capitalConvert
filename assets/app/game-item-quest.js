/* Item Quest - the hidden-object mini-game in the shared game drawer.
 * Each round paints one dense scene - a toy room, a kitchen shelf, a night
 * attic - and the tray below lists the items hidden in it. Tapping an item
 * in the scene rings it and strikes it off the tray; a tap on empty space
 * costs one of three hearts. Streaks raise the award, cleared levels bank
 * stars on the same unlock-chain ladder the other games use, and the items
 * are drawn in-module as SVG (each in its own 24x24 design space, then
 * placed and scaled into the scene), so the game needs no markup in the
 * four HTML pages and no bundled pictures. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  var t = App.t;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  var createCampaign = App.createCampaign;
  var fillCampaignPicker = App.fillCampaignPicker;
  var starsFor = App.starsFor;

  var iqMaxHearts = 3;
  var iqMaxHints = 2;
  /* The ladder: fifty levels. Each pair of decades adds one more item to
   * hunt, milestone levels run a fourth round, and names compose from five
   * tier adjectives across ten venues. */
  var iqZoneAdjectives = [
    "iqAdjQuiet",
    "iqAdjCluttered",
    "iqAdjCozy",
    "iqAdjDusty",
    "iqAdjMidnight",
  ];
  var iqZoneNouns = [
    "iqNounPlayroom",
    "iqNounKitchen",
    "iqNounGarden",
    "iqNounCapsule",
    "iqNounBeach",
    "iqNounAttic",
    "iqNounCellar",
    "iqNounStudio",
    "iqNounHarbor",
    "iqNounLibrary",
  ];

  function iqBuildZones() {
    var zones = [];
    for (var index = 1; index <= 50; index += 1) {
      zones.push({
        id: "iq" + index,
        adjKey: iqZoneAdjectives[Math.floor((index - 1) / 10)],
        nounKey: iqZoneNouns[(index - 1) % 10],
        rounds: index % 10 === 0 ? 4 : 3,
        count: Math.min(8, 4 + Math.floor((index - 1) / 10)),
      });
    }
    return zones;
  }

  var iqZones = iqBuildZones();
  var iqStarBands = [0, 1, 2];

  /* Fixed item inks: targets must stay readable over any backdrop palette,
   * so the toy colors do not ride the scene hue. */
  var iqRed = iqHsl(5, 70, 55);
  var iqGold = iqHsl(45, 90, 60);
  var iqCream = iqHsl(40, 50, 92);
  var iqBrown = iqHsl(25, 50, 42);
  var iqTeal = iqHsl(175, 55, 45);
  var iqPink = iqHsl(330, 60, 70);
  var iqGray = iqHsl(210, 10, 60);
  var iqGreen = iqHsl(120, 40, 38);
  var iqOrange = iqHsl(25, 85, 55);
  var iqBlue = iqHsl(200, 70, 60);
  var iqInk = iqHsl(220, 25, 18);
  var iqWhite = iqHsl(0, 0, 96);

  function iqWrap(hue) {
    return ((hue % 360) + 360) % 360;
  }

  function iqHsl(h, s, l) {
    return "hsl(" + Math.round(iqWrap(h)) + ", " + Math.round(s) + "%, " + Math.round(l) + "%)";
  }

  function iqShuffle(list) {
    for (var index = list.length - 1; index > 0; index -= 1) {
      var swap = Math.floor(Math.random() * (index + 1));
      var held = list[index];
      list[index] = list[swap];
      list[swap] = held;
    }
    return list;
  }

  function zoneName(def) {
    return t("iqZoneName", { a: t(def.adjKey), b: t(def.nounKey) });
  }

  /* ------------------------------------------------------------------ *
   * The scene deck. Each painter returns { backdrop, items } where the
   * backdrop layers fill the 100x100 frame and every item carries a
   * 24x24 drawing, its placement and its scale. The game derives each
   * item's tap circle from the placement, and the tray renders the same
   * drawing as the thumbnail, so what the player hunts is exactly what
   * the scene shows. */

  function iqToyPalette(H) {
    return {
      wall: iqHsl(H, 30, 86),
      wainscot: iqHsl(H, 25, 70),
      floor: iqHsl(H, 28, 64),
      rug: iqHsl(H + 40, 45, 72),
      wood: iqHsl(H + 20, 35, 45),
      paper: iqHsl(H, 40, 95),
      glow: iqHsl(45, 90, 70),
    };
  }

  function iqSceneToy(P, H) {
    var backdrop = [
      '<defs>' +
        '<linearGradient id="iqTw" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" stop-color="' + iqHsl(H, 34, 92) + '"/>' +
        '<stop offset="1" stop-color="' + iqHsl(H, 30, 80) + '"/></linearGradient>' +
        '<linearGradient id="iqTf" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" stop-color="' + iqHsl(H, 30, 68) + '"/>' +
        '<stop offset="1" stop-color="' + iqHsl(H, 28, 56) + '"/></linearGradient>' +
        '<linearGradient id="iqTsky" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" stop-color="' + iqHsl(205, 70, 80) + '"/>' +
        '<stop offset="1" stop-color="' + iqHsl(195, 65, 90) + '"/></linearGradient>' +
        "</defs>" +
        '<rect width="100" height="100" fill="url(#iqTw)"/>',
      '<rect y="0" width="100" height="2.4" fill="' + iqHsl(H, 26, 66) + '"/>' +
        '<circle cx="14" cy="44" r="1" fill="' + iqHsl(H, 30, 66) + '" opacity=".45"/>' +
        '<circle cx="24" cy="54" r="1" fill="' + iqHsl(H, 30, 66) + '" opacity=".45"/>' +
        '<circle cx="46" cy="56" r="1" fill="' + iqHsl(H, 30, 66) + '" opacity=".45"/>' +
        '<circle cx="58" cy="44" r="1" fill="' + iqHsl(H, 30, 66) + '" opacity=".45"/>' +
        '<circle cx="76" cy="56" r="1" fill="' + iqHsl(H, 30, 66) + '" opacity=".45"/>' +
        '<circle cx="96" cy="44" r="1" fill="' + iqHsl(H, 30, 66) + '" opacity=".45"/>',
      '<rect x="7" y="7" width="24" height="22" rx="2" fill="url(#iqTsky)"/>' +
        '<circle cx="14" cy="13.5" r="3.4" fill="' + P.glow + '"/>' +
        '<ellipse cx="24" cy="21" rx="4.5" ry="1.8" fill="' + iqWhite + '" opacity=".9"/>' +
        '<rect x="7" y="7" width="24" height="22" rx="2" fill="none" stroke="' + P.wood + '" stroke-width="2"/>' +
        '<line x1="19" y1="7" x2="19" y2="29" stroke="' + P.wood + '" stroke-width="1.4"/>' +
        '<line x1="7" y1="18" x2="31" y2="18" stroke="' + P.wood + '" stroke-width="1.4"/>' +
        '<path d="M5.5 5q3 12 0 26" stroke="' + iqHsl(H, 35, 60) + '" stroke-width="3" fill="none"/>' +
        '<path d="M32.5 5q-3 12 0 26" stroke="' + iqHsl(H, 35, 60) + '" stroke-width="3" fill="none"/>',
      '<rect x="29" y="33.2" width="62" height="1.6" fill="' + iqHsl(H, 25, 30) + '" opacity=".18"/>' +
        '<rect x="28" y="30" width="64" height="3.5" fill="' + P.wood + '"/>' +
        '<rect x="28" y="30" width="64" height="1" fill="' + iqWhite + '" opacity=".35"/>' +
        '<rect x="30" y="33.5" width="3" height="5" fill="' + P.wood + '"/>' +
        '<rect x="87" y="33.5" width="3" height="5" fill="' + P.wood + '"/>',
      '<rect x="30" y="40" width="2.2" height="8" fill="' + iqRed + '"/>' +
        '<rect x="32.6" y="41" width="2.2" height="7" fill="' + iqTeal + '"/>' +
        '<rect x="35.2" y="40.5" width="2.2" height="7.5" fill="' + iqGold + '"/>' +
        '<path d="M88 40q-1-4 2-5" stroke="' + iqGreen + '" stroke-width="1.2" fill="none"/>' +
        '<rect x="86" y="40" width="6" height="4" rx="1" fill="' + iqOrange + '"/>',
      '<rect x="29" y="51.2" width="62" height="1.6" fill="' + iqHsl(H, 25, 30) + '" opacity=".18"/>' +
        '<rect x="28" y="48" width="64" height="3.5" fill="' + P.wood + '"/>' +
        '<rect x="28" y="48" width="64" height="1" fill="' + iqWhite + '" opacity=".35"/>' +
        '<rect x="30" y="51.5" width="3" height="5" fill="' + P.wood + '"/>' +
        '<rect x="87" y="51.5" width="3" height="5" fill="' + P.wood + '"/>',
      '<rect y="58" width="100" height="6" fill="' + iqHsl(H, 25, 66) + '"/>' +
        '<path d="M8 58v6M20 58v6M32 58v6M44 58v6M56 58v6M68 58v6M80 58v6M92 58v6" stroke="' + iqHsl(H, 22, 56) + '" stroke-width="1"/>' +
        '<rect y="64" width="100" height="36" fill="url(#iqTf)"/>' +
        '<path d="M0 74h100M0 86h100" stroke="' + iqHsl(H, 26, 48) + '" stroke-width=".8" opacity=".7"/>',
      '<ellipse cx="50" cy="82" rx="41" ry="13.5" fill="' + iqHsl(H, 25, 30) + '" opacity=".18"/>' +
        '<ellipse cx="50" cy="82" rx="40" ry="13" fill="' + P.rug + '"/>' +
        '<ellipse cx="50" cy="82" rx="31" ry="9.8" fill="none" stroke="' + P.paper + '" stroke-width="1.2" opacity=".75"/>' +
        '<ellipse cx="50" cy="82" rx="22" ry="6.8" fill="none" stroke="' + P.paper + '" stroke-width="1" opacity=".5" stroke-dasharray="3 2"/>',
      '<rect x="85" y="50" width="14" height="12" rx="1.5" fill="' + iqHsl(25, 45, 50) + '"/>' +
        '<path d="M85 54h14" stroke="' + iqHsl(25, 40, 38) + '" stroke-width="1.2"/>' +
        '<rect x="90.5" y="52" width="3" height="4" rx="1" fill="' + iqGold + '"/>',
    ];
    var items = [
      { draw: '<rect x="6" y="12" width="12" height="8" rx="1.5" fill="' + iqGray + '"/><rect x="8" y="5.5" width="8" height="6" rx="1" fill="' + iqGray + '"/><circle cx="10.2" cy="8.5" r="1" fill="' + iqTeal + '"/><circle cx="13.8" cy="8.5" r="1" fill="' + iqTeal + '"/><line x1="12" y1="5.5" x2="12" y2="3" stroke="' + iqInk + '" stroke-width="1"/><circle cx="12" cy="2.6" r="1" fill="' + iqRed + '"/><rect x="3" y="13" width="3" height="5" rx="1" fill="' + iqGray + '"/><rect x="18" y="13" width="3" height="5" rx="1" fill="' + iqGray + '"/>', x: 32, y: 15.5, s: 0.55 },
      { draw: '<path d="M12 2q5 5.5 4 14h-8Q7 7.5 12 2Z" fill="' + iqCream + '" stroke="' + iqInk + '" stroke-width=".7"/><circle cx="12" cy="10" r="2.4" fill="' + iqTeal + '"/><path d="M8 13l-3 5 3.5-1Z" fill="' + iqRed + '"/><path d="M16 13l3 5-3.5-1Z" fill="' + iqRed + '"/>', x: 49, y: 15.5, s: 0.55 },
      { draw: '<path d="M12 2l7 8-7 8-7-8Z" fill="' + iqTeal + '"/><path d="M12 18q-3 2-1 4" stroke="' + iqInk + '" stroke-width="1" fill="none"/>', x: 66, y: 15.5, s: 0.55 },
      { draw: '<line x1="6" y1="21" x2="15" y2="10" stroke="' + iqOrange + '" stroke-width="2"/><path d="M17 3l1.5 3 3 .5-2.2 2.2.5 3.2-2.8-1.5-2.8 1.5.5-3.2L12.5 6.5l3-.5Z" fill="' + iqGold + '"/>', x: 83, y: 15.5, s: 0.55 },
      { draw: '<rect x="4" y="12" width="12" height="7" rx="1" fill="' + iqGreen + '"/><rect x="15" y="7" width="5" height="12" rx="1" fill="' + iqGreen + '"/><rect x="6" y="7" width="3" height="5" fill="' + iqInk + '"/><circle cx="8" cy="20.5" r="2.4" fill="' + iqRed + '"/><circle cx="14" cy="20.5" r="2.4" fill="' + iqRed + '"/><circle cx="18" cy="20.5" r="2" fill="' + iqRed + '"/>', x: 40, y: 33.5, s: 0.55 },
      { draw: '<rect x="5" y="10" width="14" height="9" rx="1.5" fill="' + iqRed + '"/><ellipse cx="12" cy="10" rx="7" ry="2.2" fill="' + iqCream + '"/><path d="M6 14l3 2 3-2 3 2 3-2" stroke="' + iqCream + '" stroke-width="1.2" fill="none"/><line x1="7" y1="19" x2="7" y2="21" stroke="' + iqInk + '" stroke-width="1"/><line x1="17" y1="19" x2="17" y2="21" stroke="' + iqInk + '" stroke-width="1"/>', x: 74, y: 33.5, s: 0.55 },
      { draw: '<circle cx="7" cy="7" r="3" fill="' + iqBrown + '"/><circle cx="17" cy="7" r="3" fill="' + iqBrown + '"/><circle cx="12" cy="11" r="6" fill="' + iqBrown + '"/><circle cx="12" cy="13.5" r="2.6" fill="' + iqCream + '"/><circle cx="9.8" cy="10" r=".9" fill="' + iqInk + '"/><circle cx="14.2" cy="10" r=".9" fill="' + iqInk + '"/><ellipse cx="12" cy="19.5" rx="6" ry="4.5" fill="' + iqBrown + '"/>', x: 8, y: 68, s: 0.85 },
      { draw: '<circle cx="12" cy="12" r="9" fill="' + iqRed + '"/><path d="M3.5 10q8.5-5 17 0" stroke="' + iqCream + '" stroke-width="2" fill="none"/><path d="M4 15.5q8 4.5 16 0" stroke="' + iqCream + '" stroke-width="2" fill="none"/>', x: 32, y: 70, s: 0.8 },
      { draw: '<ellipse cx="10.5" cy="16" rx="7.5" ry="5" fill="' + iqGold + '"/><circle cx="17" cy="9" r="4" fill="' + iqGold + '"/><path d="M21 8l3 1.2-3 1.4Z" fill="' + iqOrange + '"/><circle cx="18.2" cy="8" r=".8" fill="' + iqInk + '"/><path d="M6 15q4-3 8 0" stroke="' + iqOrange + '" stroke-width="1" fill="none"/>', x: 56, y: 71, s: 0.8 },
      { draw: '<path d="M12 4l6 9H6Z" fill="' + iqTeal + '"/><ellipse cx="12" cy="13" rx="6" ry="1.8" fill="' + iqTeal + '"/><line x1="12" y1="14.8" x2="12" y2="21" stroke="' + iqInk + '" stroke-width="1.4"/><circle cx="12" cy="3.4" r="1.2" fill="' + iqInk + '"/>', x: 80, y: 72, s: 0.7 },
    ];
    return { backdrop: backdrop, items: items };
  }

  function iqKitchenPalette(H) {
    return {
      wall: iqHsl(H, 35, 84),
      tile: iqHsl(H, 25, 74),
      counter: iqHsl(H + 20, 30, 55),
      front: iqHsl(H + 20, 32, 44),
      wood: iqHsl(H + 20, 35, 42),
      paper: iqHsl(H, 40, 95),
      glow: iqHsl(45, 90, 70),
    };
  }

  function iqSceneKitchen(P, H) {
    var backdrop = [
      '<defs>' +
        '<linearGradient id="iqKw" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" stop-color="' + iqHsl(H, 38, 90) + '"/>' +
        '<stop offset="1" stop-color="' + iqHsl(H, 34, 78) + '"/></linearGradient>' +
        '<linearGradient id="iqKc" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" stop-color="' + iqHsl(H + 20, 34, 62) + '"/>' +
        '<stop offset="1" stop-color="' + iqHsl(H + 20, 30, 48) + '"/></linearGradient>' +
        "</defs>" +
        '<rect width="100" height="100" fill="url(#iqKw)"/>',
      '<path d="M0 10h100M0 22h100M0 34h100M12 0v44M24 0v44M36 0v44M48 0v44M60 0v44M72 0v44M84 0v44M96 0v44" stroke="' + iqHsl(H, 26, 72) + '" stroke-width="1"/>' +
        '<rect x="12" y="0" width="12" height="10" fill="' + iqHsl(H, 30, 88) + '" opacity=".5"/>' +
        '<rect x="36" y="10" width="12" height="12" fill="' + iqHsl(H, 30, 88) + '" opacity=".5"/>' +
        '<rect x="60" y="0" width="12" height="10" fill="' + iqHsl(H, 30, 88) + '" opacity=".5"/>' +
        '<rect x="84" y="10" width="12" height="12" fill="' + iqHsl(H, 30, 88) + '" opacity=".5"/>',
      '<rect x="36" y="7" width="12" height="10" rx="1" fill="' + P.wood + '"/>' +
        '<rect x="37.6" y="8.6" width="8.8" height="6.8" fill="' + iqHsl(H, 45, 88) + '"/>' +
        '<path d="M39 14l3-3 2 2 3-3" stroke="' + iqGreen + '" stroke-width="1" fill="none"/>',
      '<line x1="58" y1="14" x2="96" y2="14" stroke="' + P.wood + '" stroke-width="2"/>' +
        '<path d="M66 14v3M78 14v3M90 14v3" stroke="' + P.wood + '" stroke-width="1.4"/>' +
        '<path d="M90 17v5M88.5 22h3l-.5 4h-2Z" stroke="' + iqInk + '" stroke-width="1" fill="' + iqGray + '"/>',
      '<rect x="9" y="37.2" width="48" height="1.6" fill="' + iqHsl(H, 25, 30) + '" opacity=".18"/>' +
        '<rect x="8" y="34" width="50" height="3.2" fill="' + P.wood + '"/>' +
        '<rect x="8" y="34" width="50" height="1" fill="' + iqWhite + '" opacity=".35"/>' +
        '<rect x="10" y="37.2" width="3" height="5" fill="' + P.wood + '"/>' +
        '<rect x="53" y="37.2" width="3" height="5" fill="' + P.wood + '"/>',
      '<rect y="50" width="100" height="4" fill="' + iqHsl(H, 28, 70) + '"/>' +
        '<rect y="54" width="100" height="9" fill="url(#iqKc)"/>' +
        '<rect y="54" width="100" height="1.4" fill="' + iqWhite + '" opacity=".4"/>',
      '<rect y="63" width="100" height="37" fill="' + P.front + '"/>' +
        '<rect x="8" y="66" width="36" height="30" rx="2" fill="' + iqHsl(H + 20, 30, 48) + '"/>' +
        '<rect x="52" y="66" width="36" height="30" rx="2" fill="' + iqHsl(H + 20, 30, 48) + '"/>' +
        '<circle cx="40" cy="81" r="1.4" fill="' + iqGold + '"/>' +
        '<circle cx="56" cy="81" r="1.4" fill="' + iqGold + '"/>' +
        '<rect y="96" width="100" height="4" fill="' + iqHsl(H + 20, 25, 34) + '"/>',
    ];
    var items = [
      { draw: '<ellipse cx="11" cy="15" rx="8" ry="6" fill="' + iqTeal + '"/><path d="M19 13l4-2-1 4Z" fill="' + iqTeal + '"/><path d="M4 13q-3 1-2 4" stroke="' + iqTeal + '" stroke-width="1.6" fill="none"/><ellipse cx="11" cy="9.5" rx="4" ry="1.6" fill="' + iqInk + '"/><circle cx="11" cy="8.2" r="1" fill="' + iqInk + '"/>', x: 10, y: 20.5, s: 0.58 },
      { draw: '<rect x="6" y="10" width="11" height="9" rx="2" fill="' + iqRed + '"/><path d="M17 12q4 1 3 4q-1 2-3 1" stroke="' + iqRed + '" stroke-width="1.6" fill="none"/><ellipse cx="11.5" cy="10" rx="5.5" ry="1.4" fill="' + iqCream + '"/>', x: 30, y: 21, s: 0.55 },
      { draw: '<rect x="9" y="9" width="6" height="12" rx="2" fill="' + iqGreen + '"/><rect x="10.5" y="4" width="3" height="6" fill="' + iqGreen + '"/><rect x="9" y="13" width="6" height="3" fill="' + iqCream + '"/>', x: 46, y: 20.5, s: 0.55 },
      { draw: '<circle cx="12" cy="13" r="8" fill="' + iqCream + '" stroke="' + iqInk + '" stroke-width="1.5"/><line x1="12" y1="13" x2="12" y2="8.5" stroke="' + iqInk + '" stroke-width="1.2"/><line x1="12" y1="13" x2="15.5" y2="14.5" stroke="' + iqInk + '" stroke-width="1.2"/>', x: 68, y: 30, s: 0.58 },
      { draw: '<circle cx="9" cy="14" r="7" fill="' + iqInk + '"/><circle cx="9" cy="14" r="5" fill="' + iqGray + '"/><rect x="15" y="12.5" width="8" height="3" rx="1.5" fill="' + iqInk + '"/>', x: 78, y: 16.5, s: 0.55 },
      { draw: '<circle cx="12" cy="14" r="7" fill="' + iqRed + '"/><path d="M12 7q0-3 2.5-4" stroke="' + iqBrown + '" stroke-width="1.2" fill="none"/><path d="M12.5 6q3-1 4 1q-2 2-4-1Z" fill="' + iqGreen + '"/>', x: 10, y: 46, s: 0.58 },
      { draw: '<rect x="5" y="13" width="14" height="7" rx="1.5" fill="' + iqCream + '"/><path d="M5 13q3.5-3 7 0q3.5-3 7 0v2H5Z" fill="' + iqPink + '"/><circle cx="12" cy="9.5" r="1.6" fill="' + iqRed + '"/><line x1="8" y1="15" x2="8" y2="20" stroke="' + iqPink + '" stroke-width=".8"/><line x1="16" y1="15" x2="16" y2="20" stroke="' + iqPink + '" stroke-width=".8"/>', x: 30, y: 45.5, s: 0.6 },
      { draw: '<ellipse cx="12" cy="13.5" rx="5.5" ry="7" fill="' + iqCream + '"/><circle cx="10" cy="12" r="1" fill="' + iqGold + '"/><circle cx="14" cy="15" r="1.2" fill="' + iqPink + '"/>', x: 50, y: 47, s: 0.55 },
      { draw: '<path d="M10 8l5 2-4 12Z" fill="' + iqOrange + '"/><path d="M10 8q-3-3-6-3M11 8q0-4-2-6M12 8q2-3 5-3" stroke="' + iqGreen + '" stroke-width="1.4" fill="none"/>', x: 66, y: 48, s: 0.58 },
      { draw: '<ellipse cx="10" cy="13" rx="7" ry="4.5" fill="' + iqOrange + '"/><path d="M17 13l5-3.5v7Z" fill="' + iqOrange + '"/><circle cx="6.5" cy="12" r=".9" fill="' + iqInk + '"/><path d="M8 13q2-2 4 0" stroke="' + iqInk + '" stroke-width=".8" fill="none"/>', x: 85, y: 46, s: 0.6 },
    ];
    return { backdrop: backdrop, items: items };
  }

  function iqGardenPalette(H) {
    return {
      sky: iqHsl(H, 60, 84),
      grass: iqHsl(110, 38, 62),
      hedge: iqHsl(110, 35, 50),
      fence: iqHsl(H, 30, 60),
      path: iqHsl(40, 25, 74),
      paper: iqHsl(H, 45, 95),
      glow: iqHsl(45, 90, 70),
    };
  }

  function iqSceneGarden(P, H) {
    var pickets = [];
    for (var px = 6; px <= 94; px += 11) {
      pickets.push('<rect x="' + px + '" y="44" width="4.5" height="18" rx="1" fill="' + P.fence + '"/>');
    }
    var backdrop = [
      '<defs>' +
        '<linearGradient id="iqGs" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" stop-color="' + iqHsl(H, 65, 88) + '"/>' +
        '<stop offset="1" stop-color="' + iqHsl(H, 60, 78) + '"/></linearGradient>' +
        '<linearGradient id="iqGg" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" stop-color="' + iqHsl(110, 42, 66) + '"/>' +
        '<stop offset="1" stop-color="' + iqHsl(110, 40, 52) + '"/></linearGradient>' +
        "</defs>" +
        '<rect width="100" height="100" fill="url(#iqGs)"/>',
      '<circle cx="12" cy="12" r="5.5" fill="' + P.glow + '"/>' +
        '<path d="M12 3.5v-2M12 20.5v2M3.5 12h-2M20.5 12h2M5.8 5.8L4.4 4.4M18.2 5.8l1.4-1.4M5.8 18.2l-1.4 1.4M18.2 18.2l1.4 1.4" stroke="' + P.glow + '" stroke-width="1.2"/>',
      '<ellipse cx="55" cy="14" rx="9" ry="2.6" fill="' + iqWhite + '" opacity=".9"/>' +
        '<ellipse cx="62" cy="12.5" rx="6" ry="2" fill="' + iqWhite + '" opacity=".8"/>' +
        '<ellipse cx="84" cy="24" rx="7" ry="2.2" fill="' + iqWhite + '" opacity=".75"/>',
      '<ellipse cx="50" cy="47" rx="70" ry="10" fill="' + iqHsl(110, 35, 58) + '" opacity=".85"/>',
      '<rect y="44" width="100" height="56" fill="url(#iqGg)"/>' +
        '<path d="M52 70q1-4 0-6M54 70q-1-4 0-6M77 73q1-4 0-6M79 73q-1-4 0-6M91 78q1-4 0-6M93 78q-1-4 0-6" stroke="' + iqHsl(110, 38, 40) + '" stroke-width="1" fill="none"/>',
      '<ellipse cx="14" cy="46" rx="13" ry="6" fill="' + P.hedge + '"/>' +
        '<ellipse cx="34" cy="47" rx="12" ry="5.5" fill="' + P.hedge + '"/>' +
        '<ellipse cx="55" cy="46" rx="13" ry="6" fill="' + P.hedge + '"/>' +
        '<ellipse cx="78" cy="47" rx="14" ry="6" fill="' + P.hedge + '"/>' +
        '<ellipse cx="95" cy="46" rx="10" ry="5" fill="' + P.hedge + '"/>',
      pickets.join("") +
        '<rect x="4" y="50" width="92" height="2.4" fill="' + P.fence + '"/>' +
        '<rect x="4" y="45" width="92" height="1.6" fill="' + P.fence + '" opacity=".8"/>',
      '<line x1="90" y1="30" x2="90" y2="45" stroke="' + iqBrown + '" stroke-width="1.6"/>' +
        '<rect x="85.5" y="22" width="9" height="8" rx="1" fill="' + iqHsl(25, 55, 55) + '"/>' +
        '<path d="M84.5 22l5.5-5 5.5 5Z" fill="' + iqRed + '"/>' +
        '<circle cx="90" cy="26.5" r="1.3" fill="' + iqInk + '"/>',
      '<ellipse cx="14" cy="91" rx="17" ry="6.5" fill="' + iqHsl(195, 55, 62) + '"/>' +
        '<ellipse cx="14" cy="91" rx="17" ry="6.5" fill="none" stroke="' + iqHsl(195, 45, 50) + '" stroke-width="1"/>' +
        '<ellipse cx="10" cy="89" rx="3" ry="1.3" fill="' + iqGreen + '"/>' +
        '<path d="M24 86q1-4-1-6M26 87q2-3 1-6" stroke="' + iqGreen + '" stroke-width="1.1" fill="none"/>',
      '<ellipse cx="58" cy="91" rx="6" ry="2" fill="' + P.path + '"/>' +
        '<ellipse cx="72" cy="94" rx="6" ry="2" fill="' + P.path + '"/>' +
        '<ellipse cx="85" cy="90" rx="5.5" ry="1.9" fill="' + P.path + '"/>',
    ];
    var items = [
      { draw: '<line x1="12" y1="13" x2="12" y2="22" stroke="' + iqGreen + '" stroke-width="1.4"/><circle cx="12" cy="8" r="2.6" fill="' + iqPink + '"/><circle cx="7.8" cy="10" r="2.6" fill="' + iqPink + '"/><circle cx="16.2" cy="10" r="2.6" fill="' + iqPink + '"/><circle cx="9.5" cy="14" r="2.6" fill="' + iqPink + '"/><circle cx="14.5" cy="14" r="2.6" fill="' + iqPink + '"/><circle cx="12" cy="11" r="2.2" fill="' + iqGold + '"/>', x: 10, y: 58, s: 0.6 },
      { draw: '<circle cx="12" cy="10" r="3" fill="' + iqBrown + '"/><path d="M12 13v9" stroke="' + iqGreen + '" stroke-width="1.4"/><circle cx="12" cy="5" r="2.2" fill="' + iqGold + '"/><circle cx="16" cy="7" r="2.2" fill="' + iqGold + '"/><circle cx="18" cy="11" r="2.2" fill="' + iqGold + '"/><circle cx="16" cy="15" r="2.2" fill="' + iqGold + '"/><circle cx="8" cy="7" r="2.2" fill="' + iqGold + '"/><circle cx="6" cy="11" r="2.2" fill="' + iqGold + '"/><circle cx="8" cy="15" r="2.2" fill="' + iqGold + '"/>', x: 27, y: 57, s: 0.6 },
      { draw: '<path d="M4 12q8-10 16 0q-2 2-8 2t-8-2Z" fill="' + iqRed + '"/><circle cx="9" cy="9.5" r="1.2" fill="' + iqCream + '"/><circle cx="14.5" cy="8.5" r="1.5" fill="' + iqCream + '"/><rect x="9.5" y="13" width="5" height="8" rx="2" fill="' + iqCream + '"/>', x: 45, y: 59, s: 0.58 },
      { draw: '<circle cx="9" cy="12" r="6" fill="' + iqOrange + '"/><circle cx="9" cy="12" r="3.4" fill="' + iqCream + '"/><path d="M14 18q4 1 7-1l1-4" stroke="' + iqGreen + '" stroke-width="2" fill="none"/><line x1="15" y1="9" x2="15" y2="6" stroke="' + iqInk + '" stroke-width=".9"/><circle cx="15.3" cy="5.5" r=".8" fill="' + iqInk + '"/>', x: 62, y: 61, s: 0.55 },
      { draw: '<rect x="6" y="11" width="11" height="9" rx="2" fill="' + iqTeal + '"/><path d="M6 13l-4-3 1.5-2 4 3Z" fill="' + iqTeal + '"/><path d="M17 12q4 1 3 5" stroke="' + iqTeal + '" stroke-width="1.6" fill="none"/><path d="M2 8l-1 3M4 7l-1 3" stroke="' + iqBlue + '" stroke-width="1" opacity=".7"/>', x: 80, y: 60, s: 0.6 },
      { draw: '<ellipse cx="8" cy="10" rx="4.5" ry="5.5" fill="' + iqPink + '"/><ellipse cx="16" cy="10" rx="4.5" ry="5.5" fill="' + iqPink + '"/><ellipse cx="9" cy="16" rx="3.5" ry="3.5" fill="' + iqGold + '"/><ellipse cx="15" cy="16" rx="3.5" ry="3.5" fill="' + iqGold + '"/><line x1="12" y1="6" x2="12" y2="20" stroke="' + iqInk + '" stroke-width="1.4"/><path d="M10.5 5l-1.5-3M13.5 5l1.5-3" stroke="' + iqInk + '" stroke-width=".8"/>', x: 20, y: 36, s: 0.55 },
      { draw: '<ellipse cx="12" cy="14" rx="6.5" ry="5" fill="' + iqGold + '"/><path d="M10 9.5v9M14 9.7v8.6" stroke="' + iqInk + '" stroke-width="1.6"/><ellipse cx="8" cy="8" rx="4" ry="2.6" fill="' + iqWhite + '" opacity=".85"/><ellipse cx="15" cy="7.5" rx="4" ry="2.6" fill="' + iqWhite + '" opacity=".85"/><circle cx="6.5" cy="13" r=".8" fill="' + iqInk + '"/>', x: 55, y: 33, s: 0.5 },
      { draw: '<circle cx="12" cy="13" r="7" fill="' + iqRed + '"/><line x1="12" y1="6" x2="12" y2="20" stroke="' + iqInk + '" stroke-width="1.2"/><circle cx="8.5" cy="11" r="1.2" fill="' + iqInk + '"/><circle cx="15.5" cy="11" r="1.2" fill="' + iqInk + '"/><circle cx="9.5" cy="16" r="1" fill="' + iqInk + '"/><circle cx="14.5" cy="16" r="1" fill="' + iqInk + '"/><path d="M12 6q-3-3-6-2" stroke="' + iqInk + '" stroke-width="1" fill="none"/>', x: 68, y: 46, s: 0.5 },
      { draw: '<circle cx="9" cy="11" r="5" fill="' + iqBlue + '"/><path d="M9 16q1 4-2 5" stroke="' + iqBlue + '" stroke-width="2" fill="none"/><path d="M4 10l-3 1.5L4 13Z" fill="' + iqOrange + '"/><circle cx="10.5" cy="9.5" r=".9" fill="' + iqInk + '"/><path d="M11 11q4-2 6 1q-3 2-6-1Z" fill="' + iqTeal + '"/>', x: 88, y: 42, s: 0.55 },
      { draw: '<path d="M7 4h7v10h4q4 0 4 4v2H7Z" fill="' + iqBrown + '"/><path d="M7 20h15" stroke="' + iqInk + '" stroke-width="1.4"/><rect x="7" y="4" width="7" height="3" fill="' + iqInk + '"/>', x: 36, y: 74, s: 0.6 },
    ];
    return { backdrop: backdrop, items: items };
  }

  function iqSpacePalette(H) {
    return {
      space: iqHsl(H + 230, 45, 16),
      panel: iqHsl(H, 20, 40),
      hull: iqHsl(H, 15, 32),
      floor: iqHsl(H, 18, 26),
      paper: iqHsl(H, 25, 90),
      glow: iqHsl(45, 90, 70),
      porthole: iqHsl(H + 215, 55, 30),
    };
  }

  function iqSceneSpace(P, H) {
    var backdrop = [
      '<defs>' +
        '<linearGradient id="iqSpc" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" stop-color="' + iqHsl(H + 230, 50, 20) + '"/>' +
        '<stop offset="1" stop-color="' + iqHsl(H + 250, 45, 10) + '"/></linearGradient>' +
        '<radialGradient id="iqPp" cx=".35" cy=".3" r="1">' +
        '<stop offset="0" stop-color="' + iqHsl(265, 55, 68) + '"/>' +
        '<stop offset="1" stop-color="' + iqHsl(265, 50, 46) + '"/></radialGradient>' +
        "</defs>" +
        '<rect width="100" height="100" fill="url(#iqSpc)"/>',
      '<circle cx="60" cy="8" r="1.2" fill="' + P.paper + '"/><circle cx="96" cy="30" r="1.2" fill="' + P.paper + '"/>' +
        '<circle cx="48" cy="36" r="1.1" fill="' + P.paper + '"/><circle cx="6" cy="42" r="1.1" fill="' + P.paper + '"/>' +
        '<circle cx="94" cy="8" r="1" fill="' + P.paper + '"/><circle cx="20" cy="8" r="1" fill="' + P.paper + '"/>' +
        '<circle cx="44" cy="8" r="1.3" fill="' + P.paper + '"/><circle cx="8" cy="62" r="1.1" fill="' + P.paper + '"/>',
      '<rect y="0" width="100" height="5" fill="' + P.hull + '"/>' +
        '<path d="M10 2.5h6M30 2.5h6M50 2.5h6M70 2.5h6M90 2.5h6" stroke="' + P.panel + '" stroke-width="1.2"/>',
      '<circle cx="28" cy="30" r="19" fill="none" stroke="' + iqInk + '" stroke-width="1" opacity=".55"/>' +
        '<circle cx="28" cy="30" r="17" fill="' + P.hull + '"/>' +
        '<circle cx="28" cy="30" r="14.5" fill="' + P.porthole + '"/>' +
        '<circle cx="28" cy="30" r="7.5" fill="url(#iqPp)"/>' +
        '<ellipse cx="28" cy="30" rx="12" ry="3.2" fill="none" stroke="' + iqCream + '" stroke-width="1.3" opacity=".85"/>' +
        '<circle cx="20" cy="22" r="1.1" fill="' + iqWhite + '"/><circle cx="36" cy="37" r="1" fill="' + iqWhite + '"/>' +
        '<circle cx="28" cy="30" r="17" fill="none" stroke="' + P.panel + '" stroke-width="2.2"/>' +
        '<circle cx="28" cy="13.5" r=".9" fill="' + P.panel + '"/><circle cx="28" cy="46.5" r=".9" fill="' + P.panel + '"/>' +
        '<circle cx="11.5" cy="30" r=".9" fill="' + P.panel + '"/><circle cx="44.5" cy="30" r=".9" fill="' + P.panel + '"/>',
      '<rect x="56" y="42" width="38" height="26" rx="2" fill="' + P.panel + '"/>' +
        '<rect x="59" y="45" width="20" height="11" rx="1" fill="' + iqHsl(160, 40, 22) + '"/>' +
        '<path d="M60 51l3-2 3 3 3-4 3 3 3-2 3 3" stroke="' + iqTeal + '" stroke-width="1" fill="none"/>' +
        '<circle cx="63" cy="49" r="2" fill="' + iqRed + '"/><circle cx="70" cy="49" r="2" fill="' + iqGold + '"/>' +
        '<circle cx="77" cy="49" r="2" fill="' + iqHsl(120, 45, 45) + '"/>' +
        '<rect x="82" y="46" width="8" height="3" rx="1" fill="' + P.hull + '"/>' +
        '<rect x="82" y="51" width="8" height="3" rx="1" fill="' + P.hull + '"/>' +
        '<rect x="61" y="60" width="28" height="5" rx="1" fill="' + P.hull + '"/>' +
        '<circle cx="66" cy="62.5" r="1.4" fill="' + iqTeal + '"/><circle cx="74" cy="62.5" r="1.4" fill="' + iqGold + '"/>',
      '<line x1="0" y1="76" x2="100" y2="76" stroke="' + iqGold + '" stroke-width="2" stroke-dasharray="6 4" opacity=".55"/>',
      '<rect y="78" width="100" height="22" fill="' + P.floor + '"/>' +
        '<path d="M0 84h100M0 91h100M20 78v22M50 78v22M80 78v22" stroke="' + P.hull + '" stroke-width="1"/>' +
        '<circle cx="10" cy="81" r=".7" fill="' + P.panel + '"/><circle cx="40" cy="88" r=".7" fill="' + P.panel + '"/>' +
        '<circle cx="65" cy="82" r=".7" fill="' + P.panel + '"/><circle cx="92" cy="90" r=".7" fill="' + P.panel + '"/>' +
        '<rect y="78" width="100" height="1.2" fill="' + iqTeal + '" opacity=".5"/>',
    ];
    var items = [
      { draw: '<path d="M12 2q5 5.5 4 14h-8Q7 7.5 12 2Z" fill="' + iqCream + '"/><circle cx="12" cy="10" r="2.4" fill="' + iqBlue + '"/><path d="M8 13l-3 5 3.5-1Z" fill="' + iqRed + '"/><path d="M16 13l3 5-3.5-1Z" fill="' + iqRed + '"/>', x: 12, y: 50, s: 0.6 },
      { draw: '<circle cx="12" cy="12" r="9" fill="' + iqGold + '"/><circle cx="8" cy="9" r="1.6" fill="' + iqBrown + '"/><circle cx="14" cy="15" r="2.2" fill="' + iqBrown + '"/><circle cx="16" cy="8" r="1.1" fill="' + iqBrown + '"/>', x: 36, y: 53, s: 0.55 },
      { draw: '<ellipse cx="12" cy="13" rx="10" ry="4" fill="' + iqGray + '"/><path d="M6 11q6-8 12 0Z" fill="' + iqTeal + '"/><circle cx="12" cy="9" r="2" fill="' + iqCream + '" opacity=".85"/><circle cx="5" cy="13" r="1" fill="' + iqGold + '"/><circle cx="12" cy="14.5" r="1" fill="' + iqGold + '"/><circle cx="19" cy="13" r="1" fill="' + iqGold + '"/>', x: 56, y: 10, s: 0.6 },
      { draw: '<path d="M12 2l2.6 6 6.4.6-4.8 4.3 1.4 6.3L12 15.9 6.4 19.2l1.4-6.3L3 8.6l6.4-.6Z" fill="' + iqGold + '"/>', x: 78, y: 10, s: 0.55 },
      { draw: '<rect x="6" y="12" width="12" height="8" rx="1.5" fill="' + iqGray + '"/><rect x="8" y="5.5" width="8" height="6" rx="1" fill="' + iqGray + '"/><circle cx="10.2" cy="8.5" r="1" fill="' + iqTeal + '"/><circle cx="13.8" cy="8.5" r="1" fill="' + iqTeal + '"/><line x1="12" y1="5.5" x2="12" y2="3" stroke="' + iqInk + '" stroke-width="1"/><circle cx="12" cy="2.6" r="1" fill="' + iqRed + '"/><rect x="3" y="13" width="3" height="5" rx="1" fill="' + iqGray + '"/><rect x="18" y="13" width="3" height="5" rx="1" fill="' + iqGray + '"/>', x: 72, y: 72, s: 0.6 },
      { draw: '<path d="M8 4a4 4 0 1 0 3 7l7 7 2-2-7-7a4 4 0 0 0-5-5Z" fill="' + iqGray + '"/><circle cx="9" cy="6.5" r="1.6" fill="' + P.space + '"/>', x: 16, y: 68, s: 0.55 },
      { draw: '<rect x="7" y="7" width="10" height="14" rx="1.5" fill="' + iqGreen + '"/><rect x="10" y="4" width="4" height="3" fill="' + iqInk + '"/><path d="M13 10l-4 5h3l-1 4 4-5.5h-3Z" fill="' + iqInk + '"/>', x: 36, y: 69, s: 0.55 },
      { draw: '<circle cx="12" cy="13" r="8.5" fill="' + iqTeal + '"/><circle cx="12" cy="13" r="5" fill="' + iqCream + '"/><rect x="8" y="20" width="8" height="2.5" rx="1" fill="' + iqTeal + '"/>', x: 54, y: 67, s: 0.6 },
      { draw: '<path d="M13 2l-8 12h5l-2 8 9-13h-5l3-7Z" fill="' + iqGold + '"/>', x: 88, y: 66, s: 0.5 },
      { draw: '<line x1="12" y1="22" x2="12" y2="8" stroke="' + iqGray + '" stroke-width="2.2"/><circle cx="12" cy="6" r="2.4" fill="' + iqRed + '"/><path d="M6.5 10q5.5-5 11 0" stroke="' + iqWhite + '" stroke-width="1.4" fill="none"/><rect x="8" y="20" width="8" height="2" rx="1" fill="' + iqGray + '"/>', x: 50, y: 26, s: 0.62 },
    ];
    return { backdrop: backdrop, items: items };
  }

  function iqBeachPalette(H) {
    return {
      sky: iqHsl(H, 60, 84),
      sea: iqHsl(H + 15, 55, 55),
      sand: iqHsl(45, 55, 82),
      trunk: iqHsl(25, 40, 45),
      leaf: iqHsl(140, 45, 40),
      towel: iqHsl(H + 300, 50, 70),
      paper: iqHsl(H, 45, 95),
      glow: iqHsl(45, 90, 70),
    };
  }

  function iqSceneBeach(P, H) {
    var backdrop = [
      '<defs>' +
        '<linearGradient id="iqBs" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" stop-color="' + iqHsl(H, 75, 88) + '"/>' +
        '<stop offset="1" stop-color="' + iqHsl(45, 70, 84) + '"/></linearGradient>' +
        '<linearGradient id="iqBw" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" stop-color="' + iqHsl(H + 15, 60, 58) + '"/>' +
        '<stop offset="1" stop-color="' + iqHsl(H + 15, 55, 46) + '"/></linearGradient>' +
        '<linearGradient id="iqBd" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" stop-color="' + iqHsl(45, 60, 86) + '"/>' +
        '<stop offset="1" stop-color="' + iqHsl(40, 55, 76) + '"/></linearGradient>' +
        "</defs>" +
        '<rect width="100" height="100" fill="url(#iqBs)"/>',
      '<circle cx="88" cy="10" r="7" fill="' + P.glow + '"/>' +
        '<circle cx="88" cy="10" r="10.5" fill="' + P.glow + '" opacity=".3"/>',
      '<ellipse cx="24" cy="12" rx="9" ry="2.6" fill="' + iqWhite + '" opacity=".9"/>' +
        '<ellipse cx="31" cy="10.5" rx="6" ry="2" fill="' + iqWhite + '" opacity=".8"/>' +
        '<ellipse cx="46" cy="26" rx="7" ry="2.2" fill="' + iqWhite + '" opacity=".7"/>',
      '<rect y="40" width="100" height="18" fill="url(#iqBw)"/>' +
        '<path d="M8 47q5-2.5 10 0q5 2.5 10 0M62 52q5-2.5 10 0q5 2.5 10 0" stroke="' + iqWhite + '" stroke-width="1.2" fill="none" opacity=".85"/>' +
        '<path d="M30 55h8M76 44h8" stroke="' + iqWhite + '" stroke-width="1" opacity=".6"/>',
      '<rect y="58" width="100" height="42" fill="url(#iqBd)"/>' +
        '<path d="M0 60q25 3 50 1t50 -2" stroke="' + iqWhite + '" stroke-width="1.4" fill="none" opacity=".7"/>' +
        '<circle cx="14" cy="66" r=".8" fill="' + iqHsl(40, 40, 60) + '"/><circle cx="38" cy="68" r=".8" fill="' + iqHsl(40, 40, 60) + '"/>' +
        '<circle cx="60" cy="64" r=".8" fill="' + iqHsl(40, 40, 60) + '"/>' +
        '<circle cx="20" cy="94" r=".8" fill="' + iqHsl(40, 40, 60) + '"/><circle cx="52" cy="92" r=".8" fill="' + iqHsl(40, 40, 60) + '"/><circle cx="94" cy="94" r=".8" fill="' + iqHsl(40, 40, 60) + '"/>',
      '<path d="M88 20q3 14-2 38" stroke="' + P.trunk + '" stroke-width="3.5" fill="none"/>' +
        '<path d="M86 24q-4-3-7-2" stroke="' + iqHsl(25, 35, 36) + '" stroke-width="1" fill="none" opacity=".7"/>' +
        '<path d="M88 18q-12-7-20-2q10 3 20 2Z" fill="' + P.leaf + '"/>' +
        '<path d="M88 18q12-7 20-2q-10 3-20 2Z" fill="' + P.leaf + '"/>' +
        '<path d="M88 18q-5-10-16-10q9 5 16 10Z" fill="' + P.leaf + '"/>' +
        '<path d="M88 18q5-10 16-10q-9 5-16 10Z" fill="' + P.leaf + '"/>' +
        '<path d="M88 18q0-9-6-12" stroke="' + P.leaf + '" stroke-width="2" fill="none"/>',
      '<rect x="12" y="66" width="28" height="16" rx="2" fill="' + P.towel + '"/>' +
        '<path d="M14 71h24M14 76h24" stroke="' + P.paper + '" stroke-width="1.2" opacity=".8"/>' +
        '<rect x="12" y="66" width="28" height="16" rx="2" fill="none" stroke="' + iqWhite + '" stroke-width="1" opacity=".4"/>',
    ];
    var items = [
      { draw: '<path d="M12 21C5 18 3 12 5 7q7-4 14 0q2 5-5 14Z" fill="' + iqPink + '"/><path d="M12 21V6M8 20L6 8M16 20l2-12" stroke="' + iqInk + '" stroke-width=".9"/>', x: 8, y: 72, s: 0.58 },
      { draw: '<path d="M12 3l2.2 5.6 6 .5-4.6 4 1.4 5.9L12 15.8l-5 3.2 1.4-5.9-4.6-4 6-.5Z" fill="' + iqOrange + '"/><circle cx="12" cy="11" r="1" fill="' + iqInk + '"/><circle cx="9" cy="13" r=".8" fill="' + iqInk + '"/><circle cx="15" cy="13" r=".8" fill="' + iqInk + '"/>', x: 26, y: 84, s: 0.58 },
      { draw: '<path d="M6 9h12l-1.5 11h-9Z" fill="' + iqTeal + '"/><ellipse cx="12" cy="9" rx="6" ry="1.8" fill="' + iqTeal + '"/><path d="M6.5 9a5.5 5.5 0 0 1 11 0" stroke="' + iqInk + '" stroke-width="1.2" fill="none"/>', x: 46, y: 72, s: 0.6 },
      { draw: '<ellipse cx="12" cy="15" rx="7" ry="5" fill="' + iqRed + '"/><path d="M6 11q-4-3-3-6q3 0 5 4Z" fill="' + iqRed + '"/><path d="M18 11q4-3 3-6q-3 0-5 4Z" fill="' + iqRed + '"/><circle cx="9.5" cy="13.5" r=".9" fill="' + iqInk + '"/><circle cx="14.5" cy="13.5" r=".9" fill="' + iqInk + '"/><line x1="9" y1="20" x2="7" y2="22" stroke="' + iqRed + '" stroke-width="1.2"/><line x1="15" y1="20" x2="17" y2="22" stroke="' + iqRed + '" stroke-width="1.2"/>', x: 62, y: 82, s: 0.56 },
      { draw: '<circle cx="12" cy="12" r="9" fill="' + iqWhite + '"/><path d="M3.5 10q8.5-5 17 0" stroke="' + iqBlue + '" stroke-width="2" fill="none"/><path d="M4 15.5q8 4.5 16 0" stroke="' + iqRed + '" stroke-width="2" fill="none"/>', x: 84, y: 70, s: 0.58 },
      { draw: '<path d="M5 14h14l-3 5H8Z" fill="' + iqRed + '"/><line x1="12" y1="4" x2="12" y2="14" stroke="' + iqInk + '" stroke-width="1.2"/><path d="M13 5l6 8h-6Z" fill="' + iqCream + '"/>', x: 16, y: 38, s: 0.55 },
      { draw: '<path d="M3 12a9 9 0 0 1 18 0Z" fill="' + iqRed + '"/><path d="M7.5 11a9 9 0 0 1 3-6.5M16.5 11a9 9 0 0 0-3-6.5" stroke="' + iqCream + '" stroke-width="1.4" fill="none"/><line x1="12" y1="12" x2="12" y2="21" stroke="' + iqInk + '" stroke-width="1.4"/>', x: 36, y: 56, s: 0.58 },
      { draw: '<path d="M6 12q3-3 6 0q3-3 6 0" stroke="' + iqInk + '" stroke-width="2.4" fill="none"/><path d="M9 12v2M15 12v2" stroke="' + iqInk + '" stroke-width="1.4"/>', x: 58, y: 14, s: 0.62 },
      { draw: '<circle cx="12" cy="13" r="8" fill="' + iqBrown + '"/><circle cx="9" cy="10" r="1" fill="' + iqInk + '"/><circle cx="13.5" cy="9" r="1" fill="' + iqInk + '"/><circle cx="12" cy="13" r="1" fill="' + iqInk + '"/>', x: 72, y: 55, s: 0.55 },
      { draw: '<path d="M8 3h8v12q0 5-6 6q-4-1-4-6q0-8 2-12Z" fill="' + iqTeal + '"/><circle cx="12" cy="6" r="1.2" fill="' + iqCream + '"/>', x: 78, y: 88, s: 0.55 },
    ];
    return { backdrop: backdrop, items: items };
  }

  function iqAtticPalette(H) {
    return {
      dark: iqHsl(H + 230, 30, 22),
      beam: iqHsl(H + 20, 25, 32),
      floor: iqHsl(H, 22, 34),
      box: iqHsl(30, 40, 52),
      paper: iqHsl(H, 30, 90),
      glow: iqHsl(45, 90, 70),
      moonbeam: iqHsl(H, 40, 80),
    };
  }

  function iqSceneAttic(P, H) {
    var backdrop = [
      '<defs>' +
        '<linearGradient id="iqAd" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" stop-color="' + iqHsl(H + 230, 32, 26) + '"/>' +
        '<stop offset="1" stop-color="' + iqHsl(H + 240, 30, 16) + '"/></linearGradient>' +
        '<linearGradient id="iqAf" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" stop-color="' + iqHsl(45, 60, 80) + '"/>' +
        '<stop offset="1" stop-color="' + iqHsl(45, 45, 55) + '" stop-opacity=".1"/></linearGradient>' +
        "</defs>" +
        '<rect width="100" height="100" fill="url(#iqAd)"/>',
      '<path d="M0 0L44 0L0 34Z" fill="' + P.beam + '"/>' +
        '<path d="M100 0L56 0L100 34Z" fill="' + P.beam + '"/>' +
        '<line x1="0" y1="36" x2="40" y2="0" stroke="' + P.dark + '" stroke-width="2"/>' +
        '<line x1="100" y1="36" x2="60" y2="0" stroke="' + P.dark + '" stroke-width="2"/>' +
        '<path d="M22 0L0 18M78 0L100 18" stroke="' + P.dark + '" stroke-width="1.4" opacity=".8"/>',
      '<circle cx="50" cy="18" r="9" fill="' + P.moonbeam + '" opacity=".2"/>' +
        '<circle cx="50" cy="18" r="7" fill="' + P.dark + '"/>' +
        '<circle cx="48" cy="16" r="4.5" fill="' + P.paper + '" opacity=".85"/>' +
        '<circle cx="46.5" cy="14.5" r="1" fill="' + iqHsl(45, 40, 70) + '" opacity=".6"/>' +
        '<path d="M44 24L34 60L66 60L56 24Z" fill="url(#iqAf)" opacity=".28"/>' +
        '<circle cx="42" cy="34" r=".7" fill="' + P.paper + '" opacity=".5"/>' +
        '<circle cx="56" cy="44" r=".6" fill="' + P.paper + '" opacity=".45"/>' +
        '<circle cx="48" cy="52" r=".6" fill="' + P.paper + '" opacity=".4"/>',
      '<rect y="78" width="100" height="22" fill="' + P.floor + '"/>' +
        '<path d="M0 84h100M0 91h100" stroke="' + P.dark + '" stroke-width="1.2"/>' +
        '<ellipse cx="42" cy="90" rx="27" ry="7" fill="' + iqHsl(H, 22, 40) + '"/>' +
        '<ellipse cx="42" cy="90" rx="20" ry="5" fill="none" stroke="' + iqHsl(H, 25, 46) + '" stroke-width="1" opacity=".8"/>',
      '<rect x="62" y="58" width="28" height="20" fill="' + P.box + '"/>' +
        '<line x1="62" y1="66" x2="90" y2="66" stroke="' + iqInk + '" stroke-width="1.2"/>' +
        '<path d="M62 58l4-5h20l4 5" fill="' + P.box + '"/>' +
        '<path d="M66 58l3-4M86 58l-3-4" stroke="' + iqInk + '" stroke-width=".8"/>' +
        '<rect x="64" y="60" width="10" height="4" rx=".5" fill="' + iqCream + '" opacity=".7"/>' +
        '<path d="M66 61.5h6" stroke="' + iqInk + '" stroke-width=".6"/>' +
        '<rect x="30" y="62" width="20" height="16" fill="' + iqHsl(28, 35, 46) + '"/>' +
        '<path d="M30 66h20M30 74h20" stroke="' + iqInk + '" stroke-width=".8" opacity=".6"/>' +
        '<rect x="37" y="62" width="5" height="16" fill="' + iqTeal + '" opacity=".55"/>',
      '<line x1="66" y1="26" x2="78" y2="26" stroke="' + iqBrown + '" stroke-width="1"/>' +
        '<line x1="68" y1="26" x2="68" y2="32" stroke="' + iqBrown + '" stroke-width=".8"/>' +
        '<line x1="76" y1="26" x2="76" y2="32" stroke="' + iqBrown + '" stroke-width=".8"/>' +
        '<rect x="64.5" y="32" width="7" height="8" rx=".5" fill="' + iqWhite + '" opacity=".85"/>' +
        '<rect x="74.5" y="32" width="7" height="8" rx=".5" fill="' + iqWhite + '" opacity=".75"/>' +
        '<path d="M65.5 37l2.5-2.5 2 1.5 2-2" stroke="' + iqBlue + '" stroke-width=".7" fill="none"/>' +
        '<circle cx="78" cy="34.5" r="1.4" fill="' + iqGold + '"/>',
      '<line x1="44" y1="0" x2="44" y2="16" stroke="' + P.beam + '" stroke-width="1.6"/>',
    ];
    var items = [
      { draw: '<rect x="8" y="8" width="8" height="11" rx="2" fill="' + iqGold + '"/><rect x="10" y="5" width="4" height="3" fill="' + iqInk + '"/><circle cx="12" cy="13.5" r="2.2" fill="' + iqOrange + '"/><line x1="12" y1="3" x2="12" y2="5" stroke="' + iqInk + '" stroke-width="1"/>', x: 40, y: 16, s: 0.58 },
      { draw: '<circle cx="8" cy="8" r="4" fill="' + iqGold + '"/><circle cx="8" cy="8" r="1.6" fill="' + iqInk + '"/><line x1="11" y1="11" x2="19" y2="19" stroke="' + iqGold + '" stroke-width="2"/><line x1="16" y1="16" x2="18.5" y2="13.5" stroke="' + iqGold + '" stroke-width="1.6"/><line x1="18" y1="18" x2="20.5" y2="15.5" stroke="' + iqGold + '" stroke-width="1.6"/>', x: 58, y: 22, s: 0.5 },
      { draw: '<rect x="4" y="5" width="16" height="15" rx="1.5" fill="' + iqRed + '"/><rect x="6" y="5" width="2" height="15" fill="' + iqInk + '"/><line x1="10" y1="9" x2="17" y2="9" stroke="' + iqCream + '" stroke-width="1"/><line x1="10" y1="12" x2="17" y2="12" stroke="' + iqCream + '" stroke-width="1"/>', x: 12, y: 60, s: 0.58 },
      { draw: '<path d="M6 21v-8q0-6 6-6t6 6v8" fill="' + iqInk + '"/><path d="M9 9l1.5-3 1.5 3M14 9l1.5-3 1.5 3" fill="' + iqInk + '"/><circle cx="10" cy="15" r=".8" fill="' + iqGold + '"/><circle cx="14" cy="15" r=".8" fill="' + iqGold + '"/><path d="M18 20q4-1 3-5" stroke="' + iqInk + '" stroke-width="1.6" fill="none"/>', x: 30, y: 68, s: 0.6 },
      { draw: '<ellipse cx="10" cy="15" rx="6" ry="4.5" fill="' + iqGray + '"/><circle cx="6" cy="11" r="2" fill="' + iqGray + '"/><circle cx="5" cy="14.5" r=".7" fill="' + iqInk + '"/><path d="M16 15q5 1 5 5" stroke="' + iqInk + '" stroke-width="1.2" fill="none"/><circle cx="5.5" cy="9" r="1.2" fill="' + iqPink + '"/><circle cx="8" cy="8.5" r="1.2" fill="' + iqPink + '"/>', x: 50, y: 74, s: 0.5 },
      { draw: '<rect x="9" y="10" width="6" height="11" rx="1" fill="' + iqCream + '"/><path d="M12 10q-3-3 0-6q3 3 0 6Z" fill="' + iqOrange + '"/><line x1="12" y1="10" x2="12" y2="8" stroke="' + iqInk + '" stroke-width=".8"/>', x: 68, y: 47, s: 0.55 },
      { draw: '<rect x="4" y="10" width="16" height="11" rx="1.5" fill="' + iqBrown + '"/><path d="M4 12q8-6 16 0v-2q-8-6-16 0Z" fill="' + iqBrown + '"/><rect x="10.5" y="12" width="3" height="4" fill="' + iqGold + '"/>', x: 6, y: 44, s: 0.58 },
      { draw: '<ellipse cx="12" cy="17" rx="9" ry="2.6" fill="' + iqBrown + '"/><path d="M7 17q0-8 5-8t5 8" fill="' + iqBrown + '"/><path d="M7.5 14.5h9" stroke="' + iqRed + '" stroke-width="1.4"/>', x: 48, y: 40, s: 0.55 },
      { draw: '<path d="M12 3q5 0 5 8l1.5 4h-13L7 11q0-8 5-8Z" fill="' + iqGold + '"/><circle cx="12" cy="18.5" r="1.8" fill="' + iqGold + '"/><line x1="10" y1="3.5" x2="14" y2="3.5" stroke="' + iqInk + '" stroke-width="1.2"/>', x: 88, y: 16, s: 0.55 },
      { draw: '<circle cx="12" cy="14" r="4" fill="' + iqGray + '"/><circle cx="12" cy="9" r="2" fill="' + iqGray + '"/><line x1="12" y1="3" x2="12" y2="7" stroke="' + P.paper + '" stroke-width=".8"/><path d="M8 12l-4-3M8 16l-4 2M16 12l4-3M16 16l4 2" stroke="' + iqGray + '" stroke-width="1.1"/><circle cx="10.8" cy="13" r=".7" fill="' + iqInk + '"/><circle cx="13.2" cy="13" r=".7" fill="' + iqInk + '"/>', x: 26, y: 36, s: 0.5 },
    ];
    return { backdrop: backdrop, items: items };
  }

  function iqPurple() {
    return iqHsl(265, 50, 58);
  }

  var iqScenes = [
    { paint: iqSceneToy, palette: iqToyPalette, nameKey: "iqNounPlayroom" },
    { paint: iqSceneKitchen, palette: iqKitchenPalette, nameKey: "iqNounKitchen" },
    { paint: iqSceneGarden, palette: iqGardenPalette, nameKey: "iqNounGarden" },
    { paint: iqSceneSpace, palette: iqSpacePalette, nameKey: "iqNounCapsule" },
    { paint: iqSceneBeach, palette: iqBeachPalette, nameKey: "iqNounBeach" },
    { paint: iqSceneAttic, palette: iqAtticPalette, nameKey: "iqNounAttic" },
  ];
  /* Exported so checks and curious players can see the whole deck. */
  App.itemQuestDeck = iqScenes;

  function initItemQuestGame(panelEl) {
    if (!panelEl) {
      return;
    }
    /* The panel wears the game's own skin: a soft lavender room behind the
     * framed scene card, like a standalone hidden-object app. */
    panelEl.classList.add("iq-panel");

    var campaign = createCampaign({ key: "item-quest-campaign", levels: iqZones });
    var zone = iqZones[Math.max(0, campaign.indexOf(campaign.nextLevelId()))];
    var runActive = false;
    var roundOpen = false;
    var round = 1;
    var hearts = iqMaxHearts;
    var score = 0;
    var streak = 0;
    var mistakes = 0;
    var hintsLeft = iqMaxHints;
    var targets = [];
    var foundSet = [];
    var cursor = { x: 50, y: 50 };
    var dealId = null;
    var flashId = null;
    var shakeId = null;
    var puffId = null;
    var sceneBag = [];
    var lastSceneIdx = -1;
    var levelStartAt = 0;

    function dealScene() {
      if (!sceneBag.length) {
        sceneBag = iqShuffle(iqScenes.map(function (scene, index) {
          return index;
        }));
        if (lastSceneIdx !== -1 && sceneBag[sceneBag.length - 1] === lastSceneIdx) {
          sceneBag.unshift(sceneBag.pop());
        }
      }
      lastSceneIdx = sceneBag.pop();
      return iqScenes[lastSceneIdx];
    }

    /* --- markup: built with createElement so the headless harness sees it --- */
    var hud = document.createElement("div");
    hud.className = "iq-topbar";
    var heartsEl = document.createElement("strong");
    var scoreEl = document.createElement("strong");
    var badgeEl = document.createElement("strong");
    var heartsPill = document.createElement("span");
    heartsPill.className = "iq-pill iq-pill-hearts";
    heartsPill.appendChild(heartsEl);
    heartsPill.setAttribute("aria-label", t("iqHeartsLeft", { n: iqMaxHearts }));
    var scorePill = document.createElement("span");
    scorePill.className = "iq-pill iq-pill-score";
    scorePill.appendChild(scoreEl);
    scorePill.setAttribute("aria-label", t("iqScoreLabel"));
    var levelBadge = document.createElement("span");
    levelBadge.className = "iq-badge";
    levelBadge.appendChild(badgeEl);
    hud.appendChild(heartsPill);
    hud.appendChild(scorePill);
    hud.appendChild(levelBadge);

    var board = document.createElement("div");
    board.className = "iq-board";
    board.setAttribute("role", "button");
    board.setAttribute("tabindex", "0");
    board.setAttribute("aria-label", t("iqBoardLabel"));
    var art = document.createElement("div");
    art.className = "iq-art";
    art.setAttribute("aria-hidden", "true");
    var rings = document.createElement("div");
    rings.className = "iq-rings";
    rings.setAttribute("aria-hidden", "true");
    var puck = document.createElement("div");
    puck.className = "iq-cursor";
    puck.setAttribute("aria-hidden", "true");
    puck.style.setProperty("left", "50%");
    puck.style.setProperty("top", "50%");
    board.appendChild(art);
    board.appendChild(rings);
    board.appendChild(puck);
    board.addEventListener("click", function (event) { probeAt(event); });
    board.addEventListener("keydown", function (event) { onBoardKey(event); });
    var stage = document.createElement("div");
    stage.className = "iq-stage";
    stage.appendChild(board);

    var result = document.createElement("p");
    result.className = "game-result";
    result.setAttribute("role", "status");

    var progress = document.createElement("div");
    progress.className = "iq-progress";
    var progressText = document.createElement("span");
    progressText.className = "iq-progress-text";
    var bar = document.createElement("span");
    bar.className = "iq-bar";
    var barFill = document.createElement("i");
    barFill.className = "iq-bar-fill";
    bar.appendChild(barFill);
    progress.appendChild(progressText);
    progress.appendChild(bar);

    var trayBox = document.createElement("div");
    trayBox.className = "iq-tray-box";
    var trayTitle = document.createElement("span");
    trayTitle.className = "iq-tray-title";
    trayTitle.setAttribute("data-i18n", "iqTrayTitle");
    trayTitle.textContent = t("iqTrayTitle");
    var tray = document.createElement("div");
    tray.className = "iq-tray";
    tray.setAttribute("aria-label", t("iqTrayLabel"));
    trayBox.appendChild(trayTitle);
    trayBox.appendChild(tray);

    var zoneRow = document.createElement("div");
    zoneRow.className = "elements-row";
    var zoneLabel = document.createElement("label");
    zoneLabel.className = "elements-label";
    zoneLabel.setAttribute("for", "iqZoneSel");
    zoneLabel.setAttribute("data-i18n", "iqZoneSelectLabel");
    zoneLabel.textContent = t("iqZoneSelectLabel");
    var zoneSel = document.createElement("select");
    zoneSel.className = "elements-select";
    zoneSel.id = "iqZoneSel";
    zoneRow.appendChild(zoneLabel);
    zoneRow.appendChild(zoneSel);

    var actions = document.createElement("div");
    actions.className = "game-actions";
    var hintBtn = document.createElement("button");
    hintBtn.type = "button";
    hintBtn.className = "iq-round-btn";
    hintBtn.setAttribute("aria-label", t("iqBtnHint", { n: iqMaxHints }));
    var hintGlyph = document.createElement("span");
    hintGlyph.className = "iq-btn-glyph";
    hintGlyph.setAttribute("aria-hidden", "true");
    hintGlyph.textContent = "\uD83D\uDCA1";
    hintBtn.appendChild(hintGlyph);
    var hintBadge = document.createElement("span");
    hintBadge.className = "iq-btn-badge";
    hintBtn.appendChild(hintBadge);
    var newBtn = document.createElement("button");
    newBtn.type = "button";
    newBtn.className = "primary";
    var newLabel = document.createElement("span");
    newLabel.setAttribute("data-i18n", "iqBtnNew");
    newLabel.textContent = t("iqBtnNew");
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
    hint.setAttribute("data-i18n", "iqHint");
    hint.textContent = t("iqHint");

    [hud, stage, result, progress, trayBox, zoneRow, actions, hint].forEach(function (node) {
      panelEl.appendChild(node);
    });

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
        (best ? t("iqBest", { n: best }) + " \u00b7 " : "") +
        t("campaignStars", {
          n: campaign.totalStars(),
          max: campaign.maxStars(),
        });
      renderHintLabel();
    }

    function renderHintLabel() {
      hintBadge.textContent = String(hintsLeft);
      hintBtn.setAttribute("aria-label", t("iqBtnHint", { n: hintsLeft }));
      if (hintsLeft <= 0) {
        hintBtn.setAttribute("aria-disabled", "true");
      } else {
        hintBtn.removeAttribute("aria-disabled");
      }
    }

    function iqGlyphs(ch, count) {
      var out = "";
      for (var index = 0; index < count; index += 1) {
        out += ch;
      }
      return out;
    }

    function updateHud() {
      heartsEl.textContent =
        iqGlyphs("\u2665", Math.max(0, hearts)) +
        iqGlyphs("\u2661", Math.max(0, iqMaxHearts - hearts));
      heartsPill.setAttribute("aria-label", t("iqHeartsLeft", { n: hearts }));
      scoreEl.textContent = String(score);
      badgeEl.textContent = zoneName(zone) + " \u00b7 " + t("iqRoundStat", {
        n: Math.min(round, zone.rounds),
        total: zone.rounds,
      });
    }

    /* One scene per round: a fresh room develops, the dealer picks which
     * of its items the tray lists, and everything renders as one SVG. */
    function buildRound() {
      window.clearTimeout(dealId);
      dealId = null;
      window.clearTimeout(flashId);
      flashId = null;
      roundOpen = true;
      foundSet = [];
      cursor = { x: 50, y: 50 };

      var scene = dealScene();
      var hue = Math.random() * 360;
      var P = scene.palette(hue);
      var built = scene.paint(P, hue);
      var pool = iqShuffle(built.items.slice());
      targets = pool.slice(0, zone.count).map(function (item) {
        return {
          art: item.draw,
          x: item.x,
          y: item.y,
          s: item.s,
          cx: item.x + 12 * item.s,
          cy: item.y + 12 * item.s,
          r: 14 * item.s,
        };
      });

      var placed = built.items.map(function (item) {
        var ground =
          '<ellipse cx="' + (item.x + 12 * item.s).toFixed(2) + '" cy="' + (item.y + 24 * item.s - 0.8).toFixed(2) +
          '" rx="' + (9.5 * item.s).toFixed(2) + '" ry="' + (1.9 * item.s).toFixed(2) + '" fill="rgba(15,23,42,.16)"/>';
        return (
          ground +
          '<g transform="translate(' + item.x + " " + item.y + ') scale(' + item.s + ')">' +
          item.draw +
          "</g>"
        );
      });
      var svg =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
        built.backdrop.join("") +
        placed.join("") +
        "</svg>";
      art.style.setProperty(
        "background-image",
        'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")',
      );
      rings.textContent = "";
      puck.style.setProperty("left", "50%");
      puck.style.setProperty("top", "50%");

      tray.textContent = "";
      targets.forEach(function (target) {
        var chip = document.createElement("span");
        chip.className = "iq-chip";
        var thumb =
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-3 -3 30 30">' +
          target.art +
          "</svg>";
        chip.style.setProperty(
          "background-image",
          'url("data:image/svg+xml,' + encodeURIComponent(thumb) + '")',
        );
        chip.setAttribute("data-iq-x", target.cx.toFixed(2));
        chip.setAttribute("data-iq-y", target.cy.toFixed(2));
        tray.appendChild(chip);
      });
      renderProgress();
      updateHud();
    }

    function renderProgress() {
      progressText.textContent = t("iqProgress", {
        n: foundSet.length,
        total: targets.length,
      });
      barFill.style.setProperty(
        "width",
        (targets.length ? (foundSet.length / targets.length) * 100 : 0) + "%",
      );
    }

    function probeAt(event) {
      if (!runActive || !roundOpen) {
        return;
      }
      var rect = board.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        return;
      }
      var x = ((event.clientX - rect.left) / rect.width) * 100;
      var y = ((event.clientY - rect.top) / rect.height) * 100;
      probe(x, y);
    }

    function onBoardKey(event) {
      var step = 5;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        moveCursor(-step, 0);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        moveCursor(step, 0);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        moveCursor(0, -step);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        moveCursor(0, step);
      } else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        probe(cursor.x, cursor.y);
      }
    }

    function moveCursor(dx, dy) {
      cursor.x = Math.max(3, Math.min(97, cursor.x + dx));
      cursor.y = Math.max(3, Math.min(97, cursor.y + dy));
      renderCursor();
    }

    function renderCursor() {
      puck.style.setProperty("left", cursor.x + "%");
      puck.style.setProperty("top", cursor.y + "%");
    }

    function probe(x, y) {
      if (!runActive || !roundOpen) {
        return;
      }
      for (var index = 0; index < targets.length; index += 1) {
        if (foundSet.indexOf(index) !== -1) {
          continue;
        }
        var d = targets[index];
        var dx = x - d.cx;
        var dy = y - d.cy;
        if (dx * dx + dy * dy <= d.r * d.r) {
          markFound(index);
          return;
        }
      }
      miss();
    }

    function markFound(index) {
      foundSet.push(index);
      streak += 1;
      var gained = Math.min(300, 100 + (streak - 1) * 25);
      score += gained;
      var d = targets[index];
      addRing(d.cx, d.cy, d.r, "is-found");
      floatPoints(d.cx, d.cy, "+" + gained);
      /* Chip i lists target i: strike the one that was actually found,
       * not the next chip in line, or out-of-order finds cross off the
       * wrong tray slots. */
      var chip = tray.children[index];
      if (chip) {
        chip.classList.add("is-done");
      }
      updateHud();
      renderProgress();
      if (streak >= 3) {
        result.textContent =
          t("iqHit", { n: gained }) + " " + t("iqStreak", { n: streak });
      } else {
        result.textContent = t("iqHit", { n: gained });
      }
      if (foundSet.length === targets.length) {
        roundOpen = false;
        result.textContent = t("iqRoundUp") + " " + t("iqHit", { n: gained });
        if (round >= zone.rounds) {
          zoneCleared();
        } else {
          round += 1;
          dealId = window.setTimeout(buildRound, 650);
        }
      }
    }

    function addRing(x, y, r, kind) {
      var ring = document.createElement("span");
      ring.className = "iq-ring " + kind;
      ring.style.setProperty("left", x + "%");
      ring.style.setProperty("top", y + "%");
      ring.style.setProperty("width", Math.min(48, r * 2.6) + "%");
      rings.appendChild(ring);
      return ring;
    }

    function miss() {
      hearts -= 1;
      streak = 0;
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
          hearts === 1 ? t("iqLastHeart") : t("iqWrong");
      }
    }

    function floatPoints(x, y, text) {
      var puff = document.createElement("span");
      puff.className = "iq-float";
      puff.textContent = text;
      puff.style.setProperty("left", x + "%");
      puff.style.setProperty("top", y + "%");
      board.appendChild(puff);
      window.clearTimeout(puffId);
      puffId = window.setTimeout(function () {
        if (puff.parentNode) {
          puff.parentNode.removeChild(puff);
        }
      }, 920);
    }

    /* A hint pulses one unfound item in place without striking it off. */
    function useHint() {
      if (!runActive || !roundOpen || hintsLeft <= 0) {
        return;
      }
      var remaining = [];
      targets.forEach(function (d, index) {
        if (foundSet.indexOf(index) === -1) {
          remaining.push(index);
        }
      });
      if (!remaining.length) {
        return;
      }
      hintsLeft -= 1;
      renderHintLabel();
      var pick = targets[remaining[Math.floor(Math.random() * remaining.length)]];
      var flashed = addRing(pick.cx, pick.cy, pick.r, "is-hint");
      window.clearTimeout(flashId);
      flashId = window.setTimeout(function () {
        if (flashed.parentNode) {
          flashed.parentNode.removeChild(flashed);
        }
      }, 1400);
    }

    hintBtn.addEventListener("click", useHint);

    /* Out of hearts: the run ends and every unfound item lights up so the
     * miss becomes a lesson. Nothing is recorded on a failed run. */
    function runOut() {
      runActive = false;
      roundOpen = false;
      window.clearTimeout(dealId);
      dealId = null;
      targets.forEach(function (d, index) {
        if (foundSet.indexOf(index) !== -1) {
          return;
        }
        addRing(d.cx, d.cy, d.r, "is-reveal");
      });
      result.textContent = t("iqRunOut", {
        n: score,
        f: foundSet.length,
        r: Math.min(round, zone.rounds),
      });
    }

    function zoneCleared() {
      runActive = false;
      /* Fast clears bank a speed bonus: the quicker the hunt, the fatter
       * the payout, capped so patience is never punished into negatives. */
      var seconds = Math.max(0, Math.round((Date.now() - levelStartAt) / 1000));
      var speedBonus = Math.max(0, Math.min(300, Math.round(240 - seconds * 2)));
      if (speedBonus > 0) {
        score += speedBonus;
      }
      updateHud();
      var starsWon = starsFor(mistakes, iqStarBands, "low");
      var outcome = campaign.record(zone.id, {
        stars: starsWon,
        best: score,
        better: "high",
      });
      var message = "\uD83C\uDF89 " + t("iqCleared", {
        name: zoneName(zone),
        s: starsWon,
        n: score,
      });
      if (speedBonus > 0) {
        message += " " + t("iqSpeed", { n: speedBonus });
      }
      if (outcome.isBest) {
        message += " " + t("newBest");
      }
      if (outcome.unlockedNext) {
        message += " " + t("iqNextZone");
      } else if (campaign.clearedCount() === iqZones.length) {
        message += " " + t("iqAllZones");
      }
      result.textContent = message;
      logAction(t("logItemQuest", { name: zoneName(zone), s: starsWon, n: score }));
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
      hearts = iqMaxHearts;
      score = 0;
      streak = 0;
      mistakes = 0;
      hintsLeft = iqMaxHints;
      runActive = true;
      levelStartAt = Date.now();
      result.textContent = t("iqPrompt", {
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
        zone = iqZones[index];
        startRun();
      } else {
        zoneSel.value = zone.id;
      }
    });

    App.quietResetItemQuest = function () {
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
      "tabItemQuest": "Item Quest",
      "iqRoundLabel": "Round",
      "iqHeartsLabel": "Hearts",
      "iqScoreLabel": "Score",
      "iqZoneSelectLabel": "Choose a level",
      "iqZoneName": "{a} {b}",
      "iqAdjQuiet": "Quiet",
      "iqAdjCluttered": "Cluttered",
      "iqAdjCozy": "Cozy",
      "iqAdjDusty": "Dusty",
      "iqAdjMidnight": "Midnight",
      "iqNounPlayroom": "Playroom",
      "iqNounKitchen": "Kitchen",
      "iqNounGarden": "Garden",
      "iqNounCapsule": "Capsule",
      "iqNounBeach": "Beach",
      "iqNounAttic": "Attic",
      "iqNounCellar": "Cellar",
      "iqNounStudio": "Studio",
      "iqNounHarbor": "Harbor",
      "iqNounLibrary": "Library",
      "iqRoundStat": "{n}/{total}",
      "iqHeartsLeft": "{n} of 3 hearts left",
      "iqBtnNew": "New run",
      "iqBtnHint": "Hint ({n})",
      "iqPrompt": "{name}: find the {k} items shown in the tray. {r} rounds, three hearts.",
      "iqHit": "+{n} points.",
      "iqStreak": "{n} in a row!",
      "iqRoundUp": "All items found!",
      "iqWrong": "Nothing there - a heart fades.",
      "iqLastHeart": "Last heart - make it count.",
      "iqRunOut": "Out of hearts at {n} points after {f} finds in round {r}. The rest are lit.",
      "iqCleared": "{name} cleared - {s} stars, {n} points.",
      "iqNextZone": "Next level unlocked.",
      "iqAllZones": "All fifty levels are solved.",
      "iqBest": "Best {n}",
      "iqProgress": "Found {n} of {total}",
      "iqSpeed": "Speed bonus +{n} points!",
      "iqTrayLabel": "Items to find",
      "iqTrayTitle": "Find these items",
      "iqBoardLabel": "Scene - tap the items listed in the tray",
      "iqHint": "Scan shelf by shelf, then the floor - every item in the tray is somewhere in the scene.",
      "logItemQuest": "Hunted down {name} for {s} stars and {n} points",
    },
    zh: {
      "tabItemQuest": "寻物启事",
      "iqRoundLabel": "回合",
      "iqHeartsLabel": "红心",
      "iqScoreLabel": "得分",
      "iqZoneSelectLabel": "选择等级",
      "iqZoneName": "{a}{b}",
      "iqAdjQuiet": "安静",
      "iqAdjCluttered": "凌乱",
      "iqAdjCozy": "温馨",
      "iqAdjDusty": "积灰",
      "iqAdjMidnight": "午夜",
      "iqNounPlayroom": "游戏室",
      "iqNounKitchen": "厨房",
      "iqNounGarden": "花园",
      "iqNounCapsule": "太空舱",
      "iqNounBeach": "海滩",
      "iqNounAttic": "阁楼",
      "iqNounCellar": "地窖",
      "iqNounStudio": "画室",
      "iqNounHarbor": "码头",
      "iqNounLibrary": "书房",
      "iqRoundStat": "{n}/{total}",
      "iqHeartsLeft": "还剩 {n} 颗红心",
      "iqBtnNew": "重新开始",
      "iqBtnHint": "提示 ({n})",
      "iqPrompt": "「{name}」：找出托盘中的 {k} 件物品。共 {r} 轮，三颗红心。",
      "iqHit": "+{n} 分。",
      "iqStreak": "连中 {n} 件！",
      "iqRoundUp": "全部找齐！",
      "iqWrong": "那里没有东西 - 熄灭一颗红心。",
      "iqLastHeart": "最后一颗红心 - 稳住。",
      "iqRunOut": "红心用尽：第 {r} 轮找到 {f} 件，共 {n} 分。其余物品已点亮。",
      "iqCleared": "「{name}」通关 - {s} 星，{n} 分。",
      "iqNextZone": "下一级已解锁。",
      "iqAllZones": "五十级全部告破。",
      "iqBest": "最佳 {n}",
      "iqProgress": "已找到 {n}/{total} 件",
      "iqSpeed": "速度奖励 +{n} 分！",
      "iqTrayLabel": "待寻找物品",
      "iqTrayTitle": "找出这些物品",
      "iqBoardLabel": "场景 - 点击托盘中列出的物品",
      "iqHint": "先一格一格扫架子，再看地面 - 托盘里的每件物品都藏在场景中。",
      "logItemQuest": "以 {s} 星、{n} 分寻获「{name}」",
    },
  });

  App.registerGame({
    name: "itemQuest",
    tabKey: "tabItemQuest",
    init: initItemQuestGame,
    guide: {
      svg:
        '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="6" y="6" width="108" height="64" rx="5" fill="rgba(30,41,59,.75)" stroke="rgba(148,163,184,.45)"/>' +
        '<rect x="14" y="14" width="60" height="34" rx="3" fill="hsl(160,35%,72%)"/>' +
        '<line x1="14" y1="26" x2="74" y2="26" stroke="hsl(160,30%,52%)" stroke-width="2.5"/>' +
        '<circle cx="26" cy="38" r="5" fill="hsl(5,70,55)"/>' +
        '<rect x="38" y="32" width="9" height="8" rx="1" fill="hsl(210,10,60)"/>' +
        '<circle cx="58" cy="37" r="4.5" fill="hsl(45,90,60)"/>' +
        '<circle cx="44" cy="31" r="7" fill="none" stroke="#4ade80" stroke-width="2"/>' +
        '<rect x="82" y="20" width="26" height="9" rx="3" fill="rgba(255,255,255,.12)" stroke="rgba(148,163,184,.5)"/>' +
        '<circle cx="90" cy="24.5" r="3" fill="hsl(5,70,55)"/>' +
        '<rect x="97" y="21" width="7" height="7" rx="1" fill="hsl(210,10,60)"/>' +
        '<path d="M96 31h10M96 31l2 2M106 31l-2 2" stroke="#4ade80" stroke-width="1.6"/></svg>',
      en: [
        "Aim: each round paints one busy scene; the tray below lists the items hidden in it. Find them all.",
        "Action: tap an item where it sits in the scene - it rings and is struck off the tray.",
        "Rule: streaks raise each award, but a tap on empty space costs one of three hearts.",
        "Watch out: deeper levels list more items, and milestone levels add a fourth round - two hints per run.",
        "Scoring: find every listed item in a level to bank stars - flawless runs earn three - and unlock the next level.",
      ],
      zh: [
        "目标：每回合绘制一幅热闹的场景，下方托盘列出藏在其中的物品。把它们全部找出来。",
        "操作：在场景中点击物品所在的位置，它会亮起记号并从托盘中划掉。",
        "规则：连中会提高每次得分，点在空白处则熄灭一颗红心（共三颗）。",
        "小心：越深的等级清单越长，逢十的整级还会多出一轮——每轮有两次提示。",
        "计分：找齐整级清单即可获得星星——零失误得三星——并解锁下一级。",
      ],
    },
  });

  /* Exported for the other modules. */
  App.initItemQuestGame = initItemQuestGame;
})(window.CapitalConvert = window.CapitalConvert || {});
