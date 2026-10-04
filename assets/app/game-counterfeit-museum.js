/* Counterfeit Museum - the observation-and-inference campaign in the shared game
 * drawer. Every exhibit carries three evidence lines - surface wear, the year a
 * material entered use, and the gift ledger - plus one restoration record, and a
 * piece is only genuine when all three agree: a convincing scratch pattern cannot
 * rescue a ledger that names an artist who was not working yet.
 *
 * Cases are dealt from a ground-truth verdict list, then carved row by row while
 * App.counterfeitSolutions still reports exactly ONE satisfying assignment, so
 * every hall of the ten is provably decidable and the star budget is measured.
 * A deal only ships when the three kinds of evidence still need each other: no
 * hall closes on wear, pigment or ledger lines alone, and none of the three can
 * be taken away without reopening it. Registered through the game registry, so it
 * needs no markup in the four HTML pages. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  var t = App.t;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  var createCampaign = App.createCampaign;
  var fillCampaignPicker = App.fillCampaignPicker;
  var starsFor = App.starsFor;

  /* Evidence bands. Wear is counted per century of age, so a reading needs no
   * arithmetic: under the floor the top layer is new, over the ceil it was filed. */
  var cfmSurvey = 2026;
  var cfmWearFloor = 25;
  var cfmWearCeil = 95;
  var cfmKinds = ["wear", "material", "provenance"];
  var cfmKindKeys = { wear: "cfmKindWear", material: "cfmKindMaterial", provenance: "cfmKindProvenance" };
  var cfmVerdictKeys = ["genuine", "restored", "forgery"];
  var cfmVerdictLabels = { genuine: "cfmVGenuine", restored: "cfmVRestored", forgery: "cfmVForgery" };

  /* Halls: mix is the ground-truth census, twin deals two exhibits that differ
   * in a single line, decoyLog lets the restoration record mislead, clue prints
   * a lot note the solver must respect. The measured forcing minimum - the lines
   * left standing after the carve - runs 8, 14, 14, 14, 15, 20, 21, 24, 25, 28
   * across the ten halls, which is what the three star bands are made of, so any
   * change here has to re-measure them. The lot note stays a hall-five device:
   * a printed census is exactly what lets one kind of evidence carry a case
   * alone, and the interlock bar below is what rejects that. */
  var cfmLevels = [
    { id: "cfm1", labelKey: "cfmHall1", count: 4, verdicts: ["genuine", "forgery"],
      mix: [{ v: "genuine", n: 2 }, { v: "forgery", n: 2 }], twin: false, decoyLog: false, clue: 0 },
    { id: "cfm2", labelKey: "cfmHall2", count: 6, verdicts: ["genuine", "restored", "forgery"],
      mix: [{ v: "genuine", n: 2 }, { v: "restored", n: 2 }, { v: "forgery", n: 2 }], twin: false, decoyLog: false, clue: 0 },
    { id: "cfm3", labelKey: "cfmHall3", count: 6, verdicts: ["genuine", "restored", "forgery"],
      mix: [{ v: "genuine", n: 2 }, { v: "restored", n: 2 }, { v: "forgery", n: 2 }], twin: true, decoyLog: false, clue: 0 },
    { id: "cfm4", labelKey: "cfmHall4", count: 6, verdicts: ["genuine", "restored", "forgery"],
      mix: [{ v: "genuine", n: 3 }, { v: "restored", n: 1 }, { v: "forgery", n: 2 }], twin: false, decoyLog: true, clue: 0 },
    { id: "cfm5", labelKey: "cfmHall5", count: 8, verdicts: ["genuine", "restored", "forgery"],
      mix: [{ v: "genuine", n: 3 }, { v: "restored", n: 2 }, { v: "forgery", n: 3 }], twin: false, decoyLog: true, clue: 3 },
    { id: "cfm6", labelKey: "cfmHall6", count: 8, verdicts: ["genuine", "restored", "forgery"],
      mix: [{ v: "genuine", n: 4 }, { v: "restored", n: 2 }, { v: "forgery", n: 2 }], twin: false, decoyLog: true, clue: 0 },
    { id: "cfm7", labelKey: "cfmHall7", count: 9, verdicts: ["genuine", "restored", "forgery"],
      mix: [{ v: "genuine", n: 3 }, { v: "restored", n: 3 }, { v: "forgery", n: 3 }], twin: true, decoyLog: true, clue: 0 },
    { id: "cfm8", labelKey: "cfmHall8", count: 10, verdicts: ["genuine", "restored", "forgery"],
      mix: [{ v: "genuine", n: 4 }, { v: "restored", n: 3 }, { v: "forgery", n: 3 }], twin: false, decoyLog: true, clue: 0 },
    { id: "cfm9", labelKey: "cfmHall9", count: 11, verdicts: ["genuine", "restored", "forgery"],
      mix: [{ v: "genuine", n: 4 }, { v: "restored", n: 3 }, { v: "forgery", n: 4 }], twin: true, decoyLog: true, clue: 0 },
    { id: "cfm10", labelKey: "cfmHall10", count: 12, verdicts: ["genuine", "restored", "forgery"],
      mix: [{ v: "genuine", n: 5 }, { v: "restored", n: 3 }, { v: "forgery", n: 4 }], twin: true, decoyLog: true, clue: 0 },
  ];

  /* Ledger artists: the working window is what rule 3 checks. */
  var cfmArtists = [
    { n: "A. Solario", lo: 1610, hi: 1648 }, { n: "H. Vrel", lo: 1632, hi: 1671 },
    { n: "C. Dujardin", lo: 1636, hi: 1658 }, { n: "M. van der Veer", lo: 1655, hi: 1698 },
    { n: "R. van Crussen", lo: 1662, hi: 1712 }, { n: "E. Aurelia", lo: 1701, hi: 1748 },
    { n: "J. Baudouin", lo: 1715, hi: 1772 }, { n: "T. Lefrancois", lo: 1755, hi: 1812 },
    { n: "M. Rossi", lo: 1780, hi: 1836 }, { n: "K. Aasen", lo: 1821, hi: 1884 },
    { n: "G. Prieur", lo: 1840, hi: 1908 }, { n: "L. Merrick", lo: 1866, hi: 1932 },
    { n: "V. Okhotin", lo: 1890, hi: 1953 }, { n: "S. Lorne", lo: 1902, hi: 1977 },
  ];

  /* Materials with the first year they can be found in a workshop. */
  var cfmMaterials = [
    { en: "poplar panel", zh: "\u767d\u6768\u6728\u677f", first: 1400 }, { en: "limewood board", zh: "\u6934\u6728\u677f", first: 1400 },
    { en: "tempera size", zh: "\u86cb\u5f69\u80f6", first: 1400 }, { en: "linseed oil paint", zh: "\u4e9a\u9ebb\u4ec1\u6cb9\u6599", first: 1450 },
    { en: "silverpoint", zh: "\u94f6\u5c16\u7b14", first: 1450 }, { en: "rag paper", zh: "\u68c9\u7eb8", first: 1470 },
    { en: "veronese green", zh: "\u7ef4\u7f57\u7eb3\u7eff", first: 1650 }, { en: "prussian blue", zh: "\u666e\u9c81\u58eb\u84dd", first: 1706 },
    { en: "cobalt blue", zh: "\u94b4\u84dd", first: 1802 }, { en: "chrome yellow", zh: "\u94ec\u9ec4", first: 1809 },
    { en: "zinc white", zh: "\u950c\u767d", first: 1834 }, { en: "baked enamel", zh: "\u70e4\u91d0\u7425", first: 1845 },
    { en: "mauveine dye", zh: "\u82ef\u80fa\u7d2b\u67d3\u6599", first: 1856 }, { en: "celluloid", zh: "\u8d5b\u7490\u73cf", first: 1869 },
    { en: "bakelite", zh: "\u7535\u6728", first: 1907 }, { en: "cadmium red", zh: "\u9509\u7ea2", first: 1910 },
    { en: "titanium white", zh: "\u949b\u767d", first: 1921 }, { en: "vinyl lacquer", zh: "\u4e59\u70ef\u6e05\u6f06", first: 1931 },
    { en: "phthalo blue", zh: "\u916c\u83c1\u84dd", first: 1935 }, { en: "acrylic resin", zh: "\u4e19\u70ef\u9178\u6811\u8102", first: 1936 },
  ];

  var cfmObjects = [
    { name: { en: "Portrait of a Glove Merchant", zh: "\u624b\u5957\u5546\u4eba\u50cf" }, body: { en: "oil on poplar panel", zh: "\u6728\u677f\u6cb9\u753b" } },
    { name: { en: "Still Life with a Copper Kettle", zh: "\u94dc\u58f6\u9759\u7269" }, body: { en: "oil on linen", zh: "\u4e9a\u9ebb\u5e03\u9762" } },
    { name: { en: "The Clockkeeper's Wife", zh: "\u5b88\u949f\u4eba\u7684\u59bb\u5b50" }, body: { en: "tempera on limewood", zh: "\u6934\u6728\u86cb\u5f69" } },
    { name: { en: "Harbour at Dusk", zh: "\u9ec4\u660f\u6e2f\u53e3" }, body: { en: "watercolour on laid paper", zh: "\u624b\u5de5\u7eb8\u6c34\u5f69" } },
    { name: { en: "Gilt Lamp of the Old Hall", zh: "\u65e7\u5385\u9540\u91d1\u706f" }, body: { en: "cast brass", zh: "\u94f8\u9ec4\u94dc" } },
    { name: { en: "Reliquary Casket", zh: "\u5723\u7269\u5323" }, body: { en: "gilded copper", zh: "\u9540\u91d1\u94dc" } },
    { name: { en: "Map of the Northern Coast", zh: "\u5317\u6d77\u5cb8\u5730\u56fe" }, body: { en: "engraving on rag paper", zh: "\u68c9\u7eb8\u94dc\u7248" } },
    { name: { en: "Station Sign, Platform Three", zh: "\u4e09\u53f7\u7ad9\u53f0\u6807\u724c" }, body: { en: "baked enamel plate", zh: "\u70e4\u91d0\u7425\u94a2\u677f" } },
    { name: { en: "Musician's Lute", zh: "\u6f14\u594f\u8005\u9c81\u7279\u7434" }, body: { en: "maple and gut", zh: "\u67ab\u6728\u4e0e\u7f8a\u80a0\u5f26" } },
    { name: { en: "Tea Bowl with a Cracked Glaze", zh: "\u5f00\u7247\u8336\u7897" }, body: { en: "glazed stoneware", zh: "\u70bb\u5668\u9149\u9762" } },
    { name: { en: "Marble Bust of a Judge", zh: "\u6cd5\u5b98\u5927\u7406\u77f3\u80f8\u50cf" }, body: { en: "carved marble", zh: "\u5927\u7406\u77f3\u96d5\u523b" } },
    { name: { en: "Chronometer Number Four", zh: "\u56db\u53f7\u8ba1\u65f6\u5668" }, body: { en: "brass and blued steel", zh: "\u9ec4\u94dc\u4e0e\u70e4\u84dd\u94a2" } },
    { name: { en: "Embroidered Sampler", zh: "\u7ee3\u82b1\u6837\u5e03" }, body: { en: "silk on linen", zh: "\u4e9a\u9ebb\u5e95\u7ef8\u7ebf\u7ee3" } },
    { name: { en: "Varnished Writing Box", zh: "\u6f06\u76ae\u5199\u5b57\u5323" }, body: { en: "pine and shellac", zh: "\u677e\u6728\u866b\u80f6" } },
  ];

  /* --- seeded random: a case is reproducible from (level, seed) ------------- */
  function cfmRng(seed) {
    var raw = Number(seed);
    var s = (isNaN(raw) ? 0 : Math.floor(raw)) % 2147483646 + 1;
    if (s <= 0) {
      s += 2147483645;
    }
    return function next() {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  function cfmInt(rng, lo, hi) {
    if (hi < lo) {
      var swap = hi;
      hi = lo;
      lo = swap;
    }
    return lo + Math.floor(rng() * (hi - lo + 1));
  }

  function cfmPick(rng, list) {
    return list && list.length ? list[Math.floor(rng() * list.length) % list.length] : null;
  }

  function cfmShuffle(rng, list) {
    var out = list.slice();
    for (var i = out.length - 1; i > 0; i -= 1) {
      var j = Math.floor(rng() * (i + 1));
      var tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
    return out;
  }

  function cfmName(item) {
    if (!item) {
      return "";
    }
    return App.currentLang === "zh" && item.zh ? item.zh : item.en;
  }

  function cfmLevelOf(level) {
    for (var i = 0; i < cfmLevels.length; i += 1) {
      if (cfmLevels[i] === level || cfmLevels[i].id === level) {
        return cfmLevels[i];
      }
    }
    return cfmLevels[0];
  }

  /* --- the pure reading model ------------------------------------------------ */
  function cfmRow(e, kind) {
    var rows = e && e.rows ? e.rows : [];
    for (var i = 0; i < rows.length; i += 1) {
      if (rows[i].kind === kind) {
        return rows[i];
      }
    }
    return null;
  }

  /* A signal is always DERIVED from the printed numbers, so a reading can never
   * contradict the verdict the solver draws from it. */
  function cfmSig(e, kind) {
    var row = cfmRow(e, kind);
    if (!row) {
      return "ok";
    }
    if (kind === "wear") {
      if (row.rate < cfmWearFloor) {
        return "new";
      }
      return row.rate > cfmWearCeil ? "fake" : "ok";
    }
    if (kind === "material") {
      if (row.matYear <= e.claimed) {
        return "ok";
      }
      return e.logYear > 0 && e.logYear >= row.matYear ? "late-covered" : "late-open";
    }
    return row.winLo <= e.claimed && e.claimed <= row.winHi ? "ok" : "bad";
  }

  /* The printed rule set, in the order the player is told to apply it. */
  function cfmDecide(e, wear, material, provenance) {
    if (provenance === "bad" || material === "late-open" || wear === "fake") {
      return "forgery";
    }
    return wear === "new" ? (e.logYear > 0 ? "restored" : "forgery") : "genuine";
  }

  function cfmImplied(e) {
    return cfmDecide(e, cfmSig(e, "wear"), cfmSig(e, "material"), cfmSig(e, "provenance"));
  }

  /* Which signals a line whose reading is not part of the stated rules could
   * still carry: the record decides what is even possible, so a hall with no
   * restoration log can never hide a covered pigment. */
  function cfmOptions(e, kind) {
    var row = cfmRow(e, kind);
    if (row && row.stated) {
      return [cfmSig(e, kind)];
    }
    if (kind === "wear") {
      return ["ok", "new", "fake"];
    }
    if (kind === "provenance") {
      return ["ok", "bad"];
    }
    return e.logYear > 0 ? ["ok", "late-open", "late-covered"] : ["ok", "late-open"];
  }

  function cfmCompatible(e, verdict) {
    var wear = cfmOptions(e, "wear");
    var material = cfmOptions(e, "material");
    var prov = cfmOptions(e, "provenance");
    for (var a = 0; a < wear.length; a += 1) {
      for (var b = 0; b < material.length; b += 1) {
        for (var c = 0; c < prov.length; c += 1) {
          if (cfmDecide(e, wear[a], material[b], prov[c]) === verdict) {
            return true;
          }
        }
      }
    }
    return false;
  }

  /* Walk every assignment that satisfies the stated rules and the lot note, up to
   * the limit, and hand the first complete one to collect. Counting and solving
   * share the same backtracking so the proof and the answer cannot drift apart. */
  function cfmEnumerate(caseObj, limit, collect) {
    var cap = typeof limit === "number" && limit > 0 ? Math.floor(limit) : 2;
    if (!caseObj || !caseObj.exhibits || !caseObj.exhibits.length) {
      return 0;
    }
    var exhibits = caseObj.exhibits;
    var list = caseObj.verdicts && caseObj.verdicts.length ? caseObj.verdicts : cfmVerdictKeys;
    var clues = caseObj.clues || [];
    var options = [];
    for (var i = 0; i < exhibits.length; i += 1) {
      var allowed = [];
      for (var j = 0; j < list.length; j += 1) {
        if (cfmCompatible(exhibits[i], list[j])) {
          allowed.push(list[j]);
        }
      }
      if (!allowed.length) {
        return 0;
      }
      options.push(allowed);
    }
    var count = 0;
    var tallies = {};
    var assignment = [];
    function clueOk(left, final) {
      for (var c = 0; c < clues.length; c += 1) {
        var used = tallies[clues[c].verdict] || 0;
        if (used > clues[c].n || (final ? used !== clues[c].n : used + left < clues[c].n)) {
          return false;
        }
      }
      return true;
    }
    function walk(index) {
      if (count >= cap) {
        return;
      }
      if (index === exhibits.length) {
        if (clueOk(0, true)) {
          count += 1;
          if (collect && count === 1) {
            collect(assignment.slice());
          }
        }
        return;
      }
      var allowed = options[index];
      for (var k = 0; k < allowed.length && count < cap; k += 1) {
        var key = allowed[k];
        tallies[key] = (tallies[key] || 0) + 1;
        assignment[index] = key;
        if (clueOk(exhibits.length - index - 1, false)) {
          walk(index + 1);
        }
        tallies[key] -= 1;
      }
    }
    walk(0);
    return count;
  }

  function cfmSolutions(caseObj, limit) {
    return cfmEnumerate(caseObj, limit, null);
  }

  /* The one assignment the stated rules admit - the dev proof compares it with
   * the ground truth the case was dealt from. */
  function cfmFirstSolution(caseObj) {
    var out = [];
    cfmEnumerate(caseObj, 1, function (assignment) {
      out = assignment;
    });
    return out;
  }

  function cfmStatedCount(caseObj) {
    var rows = 0;
    for (var i = 0; i < caseObj.exhibits.length; i += 1) {
      var list = caseObj.exhibits[i].rows || [];
      for (var k = 0; k < list.length; k += 1) {
        if (list[k].stated) {
          rows += 1;
        }
      }
    }
    return rows;
  }

  /* --- dealing one exhibit ---------------------------------------------------- */
  function cfmMakeRow(kind, data) {
    return {
      kind: kind, stated: true, opened: false, rate: data.rate, mat: data.mat,
      matYear: data.matYear, artist: data.artist, winLo: data.winLo, winHi: data.winHi, entry: data.entry,
    };
  }

  function cfmFindMaterial(rng, claimed, wantLate) {
    var fits = cfmMaterials.filter(function (m) {
      return wantLate ? m.first > claimed : m.first <= claimed;
    });
    return cfmPick(rng, fits);
  }

  function cfmMakeExhibit(rng, index, verdict, flavour, wantLog) {
    var artist = cfmPick(rng, cfmArtists);
    var e = {
      index: index, truth: verdict, claimed: 0, logYear: 0,
      artist: artist.n, twin: -1, name: null, body: null, rows: [],
    };

    /* Rule 3: the ledger either fits the object's date or names an artist who was
     * not working yet, and the impossible kind is what makes a forgery. */
    var claimed;
    if (verdict === "forgery" && flavour === "provenance") {
      claimed = artist.lo - cfmInt(rng, 40, 200);
      if (claimed < 1505) {
        claimed = artist.hi + cfmInt(rng, 25, 120);
      }
      if (claimed > 1948 || (claimed >= artist.lo && claimed <= artist.hi)) {
        return null;
      }
    } else {
      claimed = cfmInt(rng, artist.lo + 6, artist.hi - 6);
    }
    e.claimed = claimed;

    /* Rule 2: the pigment predates the object, or belongs to a logged renewal. A
     * forgery's late pigment has to stay uncovered by anything in the record. */
    var wantLateMat = verdict === "restored" ? rng() < 0.8 : verdict === "forgery" && flavour === "material";
    var mat = cfmFindMaterial(rng, claimed, wantLateMat);
    if (!mat) {
      return null;
    }
    if (wantLateMat && verdict === "restored") {
      e.logYear = cfmInt(rng, Math.max(claimed + 40, mat.first), Math.max(claimed + 45, Math.min(2008, mat.first + 34)));
    } else if (wantLateMat && wantLog) {
      /* The deliberately misleading record: a genuine log entry that is still too
       * early to cover the pigment the lab just found. */
      e.logYear = cfmInt(rng, claimed + 20, mat.first - 4);
    } else if (!wantLateMat && (wantLog || verdict === "restored")) {
      e.logYear = cfmInt(rng, claimed + 40, 2008);
    }
    if (e.logYear > 0 && (e.logYear <= claimed || (wantLateMat && verdict === "restored" && e.logYear < mat.first))) {
      return null;
    }

    /* Rule 1: marks per century, and a renewed top layer carries almost none. */
    var rate;
    if (verdict === "restored") {
      rate = cfmInt(rng, 1, cfmWearFloor - 5);
    } else if (verdict === "forgery" && flavour === "wear") {
      rate = !wantLog && rng() < 0.5 ? cfmInt(rng, 0, cfmWearFloor - 6) : cfmInt(rng, cfmWearCeil + 8, 178);
    } else {
      rate = cfmInt(rng, cfmWearFloor + 2, cfmWearCeil - 4);
    }

    var obj = cfmPick(rng, cfmObjects);
    e.name = obj.name;
    e.body = obj.body;
    e.rows = [
      cfmMakeRow("wear", { rate: rate }),
      cfmMakeRow("material", { mat: mat, matYear: mat.first }),
      cfmMakeRow("provenance", { artist: artist.n, winLo: artist.lo, winHi: artist.hi, entry: cfmInt(rng, 12, 96) }),
    ];
    /* Never trust the recipe: re-read the printed numbers and demand that they
     * spell the verdict this exhibit was dealt as. */
    return cfmImplied(e) === verdict ? e : null;
  }

  /* Hall three: the partner exhibit shares the record, the pigment line and the
   * ledger line, and differs from its twin in the wear line alone. */
  function cfmTwinOf(rng, src, index) {
    var mrow = cfmRow(src, "material");
    var prow = cfmRow(src, "provenance");
    var obj = cfmPick(rng, cfmObjects.filter(function (o) {
      return o.name.en !== src.name.en;
    }));
    var copy = {
      index: index, truth: "genuine", claimed: src.claimed, logYear: src.logYear,
      artist: src.artist, twin: src.index, name: obj.name, body: obj.body,
      rows: [
        cfmMakeRow("wear", { rate: cfmInt(rng, cfmWearFloor + 3, cfmWearCeil - 5) }),
        cfmMakeRow("material", { mat: mrow.mat, matYear: mrow.matYear }),
        cfmMakeRow("provenance", { artist: prow.artist, winLo: prow.winLo, winHi: prow.winHi, entry: prow.entry }),
      ],
    };
    return cfmImplied(copy) === "genuine" ? copy : null;
  }

  function cfmCensus(level) {
    var plan = [];
    for (var i = 0; i < level.mix.length; i += 1) {
      for (var k = 0; k < level.mix[i].n; k += 1) {
        plan.push(level.mix[i].v);
      }
    }
    return plan;
  }

  /* The deal is only honest when the printed rows still spell the verdict each
   * exhibit was dealt, and when the lot note matches the census. */
  function cfmTruthOk(caseObj) {
    var tallies = {};
    for (var i = 0; i < caseObj.exhibits.length; i += 1) {
      var e = caseObj.exhibits[i];
      if (cfmImplied(e) !== e.truth) {
        return false;
      }
      tallies[e.truth] = (tallies[e.truth] || 0) + 1;
    }
    for (var c = 0; c < caseObj.clues.length; c += 1) {
      if ((tallies[caseObj.clues[c].verdict] || 0) !== caseObj.clues[c].n) {
        return false;
      }
    }
    return true;
  }

  function cfmBuildCase(level, rng) {
    var plan = cfmShuffle(rng, cfmCensus(level));
    if (plan.length !== level.count) {
      return null;
    }
    var flavours = ["wear", "material", "provenance"];
    var exhibits = [];
    for (var i = 0; i < plan.length; i += 1) {
      var verdict = plan[i];
      var flavour = verdict === "forgery" ? cfmPick(rng, flavours) : "";
      var wantLog = verdict === "restored" || (!!level.decoyLog && verdict === "forgery" && rng() < 0.7);
      var e = cfmMakeExhibit(rng, i, verdict, flavour, wantLog);
      if (!e) {
        return null;
      }
      exhibits.push(e);
    }
    if (level.twin) {
      var srcIndex = -1;
      var dstIndex = -1;
      for (var r = 0; r < exhibits.length; r += 1) {
        if (srcIndex === -1 && exhibits[r].truth === "restored") {
          srcIndex = r;
        } else if (dstIndex === -1 && exhibits[r].truth === "genuine") {
          dstIndex = r;
        }
      }
      var twin = srcIndex >= 0 && dstIndex >= 0 ? cfmTwinOf(rng, exhibits[srcIndex], dstIndex) : null;
      if (!twin) {
        return null;
      }
      exhibits[srcIndex].twin = dstIndex;
      exhibits[dstIndex] = twin;
    }
    var caseObj = {
      hall: level.id,
      survey: cfmSurvey,
      verdicts: level.verdicts.slice(),
      exhibits: exhibits,
      clues: level.clue ? [{ verdict: "forgery", n: level.clue }] : [],
      need: exhibits.length * 3,
      total: exhibits.length * 3,
      budget: cfmBudgetOf({ exhibits: exhibits }),
    };
    return cfmTruthOk(caseObj) ? caseObj : null;
  }

  /* Carve stated rows away while the answer stays unique, exactly the way
   * game-glyph-sudoku.js carves givens. What survives is the evidence the case
   * actually needs, so the star budget is measured, not invented. */
  function cfmCarve(caseObj, rng) {
    var order = [];
    for (var i = 0; i < caseObj.exhibits.length; i += 1) {
      for (var k = 0; k < cfmKinds.length; k += 1) {
        order.push({ e: i, r: k });
      }
    }
    order = cfmShuffle(rng, order);
    for (var p = 0; p < order.length; p += 1) {
      var row = caseObj.exhibits[order[p].e].rows[order[p].r];
      row.stated = false;
      if (cfmSolutions(caseObj, 2) !== 1) {
        row.stated = true;
      }
    }
    caseObj.need = cfmStatedCount(caseObj);
  }

  /* How many lines the printed rule order makes a player read before the verdict
   * is forced: the ledger decides alone, then an uncovered pigment, and only
   * otherwise the wear line. Summed over the case this is the cost of the careful
   * pass the panel teaches, so the middle star band is measured too. */
  function cfmRuleOrderCost(e) {
    if (cfmSig(e, "provenance") === "bad") {
      return 1;
    }
    return cfmSig(e, "material") === "late-open" ? 2 : 3;
  }

  function cfmBudgetOf(caseObj) {
    var cost = 0;
    for (var i = 0; i < caseObj.exhibits.length; i += 1) {
      cost += cfmRuleOrderCost(caseObj.exhibits[i]);
    }
    return cost;
  }

  /* [3 stars, 2 stars, 1 star] inspections, all three numbers derived: the
   * solver's forcing minimum, the cost of the taught rule-order pass, and the
   * whole sheet. */
  function cfmThresholdsFor(caseObj) {
    var need = caseObj && caseObj.need > 0 ? caseObj.need : 1;
    var budget = caseObj && caseObj.budget > need ? caseObj.budget : need;
    var total = caseObj && caseObj.total > budget ? caseObj.total : budget;
    return [need, budget, total];
  }

  /* Public generator: only ever returns a case whose stated rules admit exactly
   * one assignment, whose printed rows still admit that same one, and where no
   * single evidence kind closes it or goes unconsulted. */
  function cfmGenerate(level, seed) {
    var def = cfmLevelOf(level);
    var rng = cfmRng(seed);
    var spare = null;
    for (var attempt = 0; attempt < 140; attempt += 1) {
      var caseObj = cfmBuildCase(def, rng);
      if (!caseObj) {
        continue;
      }
      if (cfmSolutions(caseObj, 2) !== 1) {
        continue;
      }
      cfmCarve(caseObj, rng);
      caseObj.budget = cfmBudgetOf(caseObj);
      if (cfmSolutions(caseObj, 2) !== 1 || cfmSolutionsRowsAll(caseObj) !== 1) {
        continue;
      }
      /* And the three kinds must keep needing each other: a deal one line of
       * evidence closes on its own is thrown away like an ambiguous one. */
      if (!cfmKindsNeeded(caseObj)) {
        continue;
      }
      if (caseObj.need >= def.count && caseObj.need < caseObj.total) {
        return caseObj;
      }
      /* A unique case with nothing to spare still plays, so keep it in case no
       * later deal has redundant rows to leave out of the budget. */
      if (caseObj.need >= def.count && caseObj.need <= caseObj.total) {
        spare = caseObj;
      }
    }
    return spare;
  }

  /* Uniqueness re-checked with every row stated: printing the redundant lines
   * must not open a second answer. */
  function cfmSolutionsRowsAll(caseObj) {
    var marks = [];
    caseObj.exhibits.forEach(function (e) {
      e.rows.forEach(function (row) {
        marks.push([row, row.stated]);
        row.stated = true;
      });
    });
    var count = cfmSolutions(caseObj, 2);
    marks.forEach(function (mark) {
      mark[0].stated = mark[1];
    });
    return count;
  }

  /* How many readings the sheet admits with one kind of line as the only kind
   * printed ("only"), or as the only kind missing while every other line is
   * handed over ("drop"). Both readings take the fullest possible version of the
   * sheet, so a kind that survives them is genuinely load-bearing. */
  function cfmSolutionsOneKind(caseObj, kind, mode) {
    var marks = [];
    caseObj.exhibits.forEach(function (e) {
      e.rows.forEach(function (row) {
        marks.push([row, row.stated]);
        row.stated = mode === "only" ? row.kind === kind : row.kind !== kind;
      });
    });
    var count = cfmSolutions(caseObj, 2);
    marks.forEach(function (mark) {
      mark[0].stated = mark[1];
    });
    return count;
  }

  /* The interlock the halls are built to keep: no single evidence kind closes a
   * case, and no kind is decorative. Wear alone, pigment alone and ledger alone
   * must each leave the panel more than one reading to choose between, and
   * dropping any one kind must reopen a case the printed lines had closed. */
  function cfmKindsNeeded(caseObj) {
    for (var k = 0; k < cfmKinds.length; k += 1) {
      if (cfmSolutionsOneKind(caseObj, cfmKinds[k], "only") === 1) {
        return false;
      }
      if (cfmSolutionsOneKind(caseObj, cfmKinds[k], "drop") === 1) {
        return false;
      }
    }
    return true;
  }

  /* Which printed line disagrees - so a wrong submission teaches. */
  function cfmReasonOf(e) {
    var wear = cfmSig(e, "wear");
    var material = cfmSig(e, "material");
    var provenance = cfmSig(e, "provenance");
    var wrow = cfmRow(e, "wear");
    var mrow = cfmRow(e, "material");
    var prow = cfmRow(e, "provenance");
    if (provenance === "bad") {
      return { key: "cfmWhyProv", kind: "provenance", vars: { a: prow.artist, lo: prow.winLo, hi: prow.winHi, y: e.claimed } };
    }
    if (material === "late-open") {
      return {
        key: e.logYear > 0 ? "cfmWhyMatEarlyLog" : "cfmWhyMatNoLog",
        kind: "material",
        vars: { m: cfmName(mrow.mat), f: mrow.matYear, y: e.claimed, l: e.logYear > 0 ? e.logYear : cfmSurvey },
      };
    }
    if (wear === "new") {
      return {
        key: e.logYear > 0 ? "cfmWhyRenewed" : "cfmWhyBare",
        kind: "wear",
        vars: { r: wrow.rate, lo: cfmWearFloor, l: e.logYear > 0 ? e.logYear : 0 },
      };
    }
    if (wear === "fake") {
      return { key: "cfmWhyForced", kind: "wear", vars: { r: wrow.rate, hi: cfmWearCeil } };
    }
    return {
      key: "cfmWhyClean", kind: "clean",
      vars: { r: wrow.rate, lo: cfmWearFloor, hi: cfmWearCeil, f: mrow.matYear, y: e.claimed, a: prow.artist },
    };
  }

  function cfmReadingOf(e, row) {
    if (!row) {
      return "";
    }
    if (row.kind === "wear") {
      return t("cfmReadWear", { r: row.rate, lo: cfmWearFloor, hi: cfmWearCeil });
    }
    if (row.kind === "material") {
      return t("cfmReadMaterial", { m: cfmName(row.mat), y: row.matYear });
    }
    return t("cfmReadProvenance", { n: row.entry, a: row.artist, lo: row.winLo, hi: row.winHi });
  }

  function cfmMarkedCount(list) {
    return list.filter(function (v) {
      return !!v;
    }).length;
  }

  /* --- the panel ------------------------------------------------------------- */
  function initCounterfeitMuseumGame(panelEl) {
    if (!panelEl) {
      return;
    }

    var campaign = createCampaign({ key: "counterfeit-museum-campaign", levels: cfmLevels });
    var level = cfmLevels[campaign.indexOf(campaign.nextLevelId())] || cfmLevels[0];
    var caseObj = null;
    var picks = [];
    var opened = 0;
    var closed = false;
    var active = 0;
    var seed = (Date.now() % 250000) + 17;

    var rowBtns = [];
    var markBtns = [];
    var stateEls = [];
    var checkEls = [];
    var cardEls = [];
    var sheetCells = [];

    /* Every node is created, never parsed: the headless harness plays with the
     * same DOM the browser paints. */
    function cfmEl(tag, className, text) {
      var el = document.createElement(tag);
      if (className) {
        el.className = className;
      }
      if (text) {
        el.textContent = text;
      }
      return el;
    }

    function cfmI18n(tag, className, key) {
      var el = cfmEl(tag, className, t(key));
      el.setAttribute("data-i18n", key);
      return el;
    }

    function cfmAdd(host) {
      for (var i = 1; i < arguments.length; i += 1) {
        if (arguments[i]) {
          host.appendChild(arguments[i]);
        }
      }
      return host;
    }

    function cfmStat(key, valueEl) {
      return cfmAdd(cfmEl("div", "game-stat"), cfmI18n("span", "", key), valueEl);
    }

    function cfmButton(className, key, handler) {
      var btn = cfmEl("button", className);
      btn.type = "button";
      btn.appendChild(cfmAdd(cfmEl("span", "button-content"), cfmI18n("span", "", key)));
      btn.addEventListener("click", handler);
      return btn;
    }

    var hallEl = cfmEl("strong");
    var surveyEl = cfmEl("strong");
    var openEl = cfmEl("strong");
    var markEl = cfmEl("strong");
    var hud = cfmAdd(cfmEl("div", "game-hud"), cfmStat("cfmHallLabel", hallEl),
      cfmStat("cfmSurveyLabel", surveyEl), cfmStat("cfmOpenLabel", openEl), cfmStat("cfmMarkLabel", markEl));

    var clueEl = cfmEl("p", "cfm-rule cfm-rule-clue");
    var rules = cfmAdd(cfmEl("div", "cfm-rules"), cfmI18n("p", "cfm-rule", "cfmRule1"),
      cfmI18n("p", "cfm-rule", "cfmRule2"), cfmI18n("p", "cfm-rule", "cfmRule3"),
      cfmI18n("p", "cfm-rule", "cfmRule4"), clueEl);

    var cardsEl = cfmAdd(cfmEl("div", "cfm-cards"));
    var sheetNeed = cfmEl("p", "cfm-sheet-need");
    var sheetList = cfmEl("div", "cfm-sheet-list");
    var sheetEl = cfmAdd(cfmEl("div", "cfm-sheet"),
      cfmI18n("p", "cfm-sheet-title", "cfmSheetTitle"), sheetNeed, sheetList);

    var result = cfmEl("p", "game-result");
    result.setAttribute("role", "status");

    var hallSel = cfmEl("select", "elements-select");
    hallSel.id = "cfmHallSel";
    var hallLabel = cfmI18n("label", "elements-label", "cfmHallSelectLabel");
    hallLabel.setAttribute("for", "cfmHallSel");
    var hallRow = cfmAdd(cfmEl("div", "elements-row"), hallLabel, hallSel);

    var closeBtn = cfmButton("primary", "cfmBtnClose", function () {
      submitCase();
    });
    var newBtn = cfmButton("ghost", "btnNewRound", function () {
      loadCase();
    });
    var bestEl = cfmEl("p", "game-best");
    var actions = cfmAdd(cfmEl("div", "game-actions"), closeBtn, newBtn, bestEl);
    var hint = cfmI18n("p", "game-hint", "cfmHint");

    cfmAdd(panelEl, hud, rules, cardsEl, sheetEl, result, hallRow, actions, hint);

    /* --- rendering one case -------------------------------------------------- */
    function renderHud() {
      hallEl.textContent = t(level.labelKey);
      surveyEl.textContent = String(cfmSurvey);
      var rows = caseObj ? caseObj.total : 0;
      openEl.textContent = t("cfmOpenCount", { n: opened, max: rows });
      markEl.textContent = t("cfmMarkCount", { n: cfmMarkedCount(picks), max: picks.length });
    }

    function refreshPicker() {
      fillCampaignPicker(
        hallSel,
        campaign,
        function (def) {
          return t(def.labelKey);
        },
        t("elementsLocked"),
      );
      hallSel.value = level.id;
      bestEl.textContent = t("campaignStars", {
        n: campaign.totalStars(),
        max: campaign.maxStars(),
      });
    }

    function syncRow(index, slot) {
      if (!caseObj || !caseObj.exhibits[index]) {
        return;
      }
      var e = caseObj.exhibits[index];
      var row = e.rows[slot];
      if (!row) {
        return;
      }
      var btn = rowBtns[index * 3 + slot];
      var cell = sheetCells[index * 3 + slot];
      var read = row.opened ? cfmReadingOf(e, row) : "";
      if (btn) {
        btn.textContent = row.opened ? read : t("cfmRowSeal", { k: t(cfmKindKeys[row.kind]) });
        btn.className = row.opened ? "cfm-row cfm-row-open" : "cfm-row";
        btn.setAttribute("aria-pressed", row.opened ? "true" : "false");
      }
      if (cell) {
        cell.textContent = row.opened ? read : t("cfmSheetSealed");
        cell.className = row.opened ? "cfm-sheet-text cfm-sheet-text-read" : "cfm-sheet-text";
      }
    }

    function renderMarks() {
      for (var i = 0; i < caseObj.exhibits.length; i += 1) {
        var buttons = markBtns[i] || [];
        for (var b = 0; b < buttons.length; b += 1) {
          var verdict = buttons[b].verdict;
          var on = picks[i] === verdict;
          buttons[b].textContent = (on ? "\u2713 " : "") + t(cfmVerdictLabels[verdict]);
          buttons[b].className = on ? "cfm-mark cfm-mark-on" : "cfm-mark";
          buttons[b].setAttribute("aria-pressed", on ? "true" : "false");
        }
        stateEls[i].textContent = picks[i]
          ? t("cfmMarkState", { v: t(cfmVerdictLabels[picks[i]]) })
          : t("cfmMarkNone");
      }
      renderHud();
    }

    function buildCaseDom() {
      cardsEl.textContent = "";
      sheetList.textContent = "";
      rowBtns = [];
      markBtns = [];
      stateEls = [];
      checkEls = [];
      cardEls = [];
      sheetCells = [];
      for (var i = 0; i < caseObj.exhibits.length; i += 1) {
        var e = caseObj.exhibits[i];
        var lines = cfmEl("div", "cfm-lines");
        markBtns[i] = [];
        for (var k = 0; k < e.rows.length; k += 1) {
          makeRowButton(e, k, lines);
        }
        var marks = cfmEl("div", "cfm-marks");
        for (var v = 0; v < level.verdicts.length; v += 1) {
          makeMarkButton(e, level.verdicts[v], marks);
        }
        var state = cfmEl("p", "cfm-mark-state");
        var check = cfmEl("p", "cfm-check");
        stateEls.push(state);
        checkEls.push(check);
        var card = cfmAdd(cfmEl("div", "cfm-card"),
          cfmEl("p", "cfm-card-name", i + 1 + ". " + cfmName(e.name) + " - " + cfmName(e.body)),
          cfmEl("p", "cfm-record", t("cfmRecordLine", {
            y: e.claimed, a: e.artist, l: e.logYear > 0 ? e.logYear : t("cfmLogNone"),
          })),
          e.twin >= 0 ? cfmEl("p", "cfm-twin", t("cfmTwinOf", { n: e.twin + 1 })) : null,
          lines, marks, state, check);
        card.setAttribute("aria-label", t("cfmCardLabel", { n: i + 1 }));
        cardsEl.appendChild(card);
        cardEls.push(card);
        for (var s = 0; s < e.rows.length; s += 1) {
          makeSheetRow(e, s);
        }
      }
    }

    function makeRowButton(e, slot, host) {
      var index = e.index;
      var btn = cfmEl("button", "cfm-row");
      btn.type = "button";
      btn.setAttribute("aria-pressed", "false");
      btn.addEventListener("click", function () {
        openRow(index, slot);
      });
      btn.addEventListener("focus", function () {
        active = index;
      });
      host.appendChild(btn);
      rowBtns[index * 3 + slot] = btn;
      syncRow(index, slot);
    }

    function makeMarkButton(e, verdict, host) {
      var index = e.index;
      var btn = cfmEl("button", "cfm-mark", t(cfmVerdictLabels[verdict]));
      btn.type = "button";
      btn.verdict = verdict;
      btn.setAttribute("aria-pressed", "false");
      btn.addEventListener("click", function () {
        active = index;
        mark(index, verdict);
      });
      btn.addEventListener("focus", function () {
        active = index;
      });
      host.appendChild(btn);
      markBtns[index].push(btn);
    }

    function makeSheetRow(e, slot) {
      var index = e.index;
      var text = cfmEl("span", "cfm-sheet-text");
      sheetCells[index * 3 + slot] = text;
      sheetList.appendChild(cfmAdd(cfmEl("p", "cfm-sheet-row"),
        cfmEl("span", "cfm-sheet-tag", t("cfmSheetTag", { n: index + 1, k: t(cfmKindKeys[e.rows[slot].kind]) })),
        text));
      syncRow(index, slot);
    }

    function syncNeed() {
      sheetNeed.textContent = t("cfmSheetNeed", {
        need: caseObj.need, total: caseObj.total, budget: caseObj.budget,
      });
    }

    /* --- interaction ---------------------------------------------------------- */
    function openRow(index, slot) {
      var e = caseObj && !closed ? caseObj.exhibits[index] : null;
      var row = e ? e.rows[slot] : null;
      if (!row || row.opened) {
        return;
      }
      row.opened = true;
      opened += 1;
      syncRow(index, slot);
      renderHud();
    }

    function openNextRow(index) {
      var e = caseObj ? caseObj.exhibits[index] : null;
      if (!e) {
        return;
      }
      for (var k = 0; k < e.rows.length; k += 1) {
        if (!e.rows[k].opened) {
          openRow(index, k);
          return;
        }
      }
    }

    function mark(index, verdict) {
      if (!caseObj || closed) {
        return;
      }
      if (typeof index !== "number" || index < 0 || index >= caseObj.exhibits.length) {
        return;
      }
      if (!verdict || level.verdicts.indexOf(verdict) === -1) {
        return;
      }
      picks[index] = verdict;
      renderMarks();
    }

    function focusCard(index) {
      var buttons = markBtns[index];
      if (buttons && buttons[0] && typeof buttons[0].focus === "function") {
        buttons[0].focus();
      }
    }

    function submitCase() {
      if (!caseObj) {
        result.textContent = t("cfmNoCase");
        return;
      }
      if (closed) {
        result.textContent = t("cfmAlready");
        return;
      }
      var marked = cfmMarkedCount(picks);
      if (marked < picks.length) {
        result.textContent = t("cfmNeedMarks", { n: marked, max: picks.length });
        return;
      }
      var misses = 0;
      for (var i = 0; i < caseObj.exhibits.length; i += 1) {
        var e = caseObj.exhibits[i];
        var truth = cfmImplied(e);
        var right = picks[i] === truth;
        if (right) {
          checkEls[i].textContent = t("cfmCheckOk", { v: t(cfmVerdictLabels[truth]) });
          checkEls[i].className = "cfm-check cfm-check-ok";
          cardEls[i].className = "cfm-card cfm-card-ok";
        } else {
          var reason = cfmReasonOf(e);
          checkEls[i].textContent =
            t("cfmCheckBad", { v: t(cfmVerdictLabels[picks[i]]) }) + " " + t(reason.key, reason.vars);
          checkEls[i].className = "cfm-check cfm-check-bad";
          cardEls[i].className = "cfm-card cfm-card-bad";
          misses += 1;
        }
      }
      if (!misses) {
        winCase();
        return;
      }
      result.textContent = t("cfmMissed", { n: misses, max: caseObj.exhibits.length });
    }

    function winCase() {
      closed = true;
      var starsWon = starsFor(opened, cfmThresholdsFor(caseObj), "low");
      var outcome = campaign.record(level.id, { stars: starsWon, best: opened, better: "low" });
      var message = t("cfmAudited", { n: opened, s: starsWon, need: caseObj.need });
      if (outcome.isBest) {
        message += " " + t("newBest");
      }
      if (outcome.unlockedNext) {
        message += " " + t("cfmNextHall");
      } else if (campaign.clearedCount() === cfmLevels.length) {
        message += " " + t("cfmCampaignDone");
      }
      result.textContent = message;
      logAction(t("logCounterfeitMuseum", { h: t(level.labelKey), n: opened }));
      var rect = closeBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      refreshPicker();
    }

    function loadCase() {
      var next = null;
      for (var guard = 0; guard < 24 && !next; guard += 1) {
        seed += 1;
        next = cfmGenerate(level, seed);
      }
      caseObj = next;
      picks = [];
      opened = 0;
      closed = false;
      active = 0;
      cardsEl.textContent = "";
      sheetList.textContent = "";
      sheetNeed.textContent = "";
      if (!caseObj) {
        result.textContent = t("cfmNoCase");
        renderHud();
        return;
      }
      for (var i = 0; i < caseObj.exhibits.length; i += 1) {
        picks.push("");
      }
      buildCaseDom();
      clueEl.textContent = caseObj.clues.length ? t("cfmClueLot", { n: caseObj.clues[0].n }) : "";
      renderMarks();
      syncNeed();
      result.textContent = t("cfmPrompt", {
        h: t(level.labelKey), n: caseObj.exhibits.length, need: caseObj.need, budget: caseObj.budget,
      });
    }

    cardsEl.addEventListener("keydown", function (event) {
      if (!caseObj || closed || event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }
      var step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
      if (typeof step === "number") {
        event.preventDefault();
        active = (active + step + caseObj.exhibits.length) % caseObj.exhibits.length;
        focusCard(active);
        return;
      }
      if (event.key === "i" || event.key === "I") {
        event.preventDefault();
        openNextRow(active);
        return;
      }
      var digit = parseInt(event.key, 10);
      if (digit >= 1 && digit <= level.verdicts.length) {
        event.preventDefault();
        mark(active, level.verdicts[digit - 1]);
      }
    });

    hallSel.addEventListener("change", function () {
      var index = campaign.indexOf(hallSel.value);
      if (index >= 0 && campaign.isUnlocked(hallSel.value)) {
        level = cfmLevels[index];
        loadCase();
      } else {
        hallSel.value = level.id;
      }
    });

    refreshPicker();
    loadCase();
  }

  /* Bilingual copy travels with the game: addStrings only fills keys i18n.js does
   * not already own, so the shared dictionary stays authoritative. */
  App.addStrings({
    en: {
      "tabCounterfeitMuseum": "Counterfeit Museum",
      "cfmHall1": "Period Rooms", "cfmHall2": "Painting Wing", "cfmHall3": "Twin Vitrine",
      "cfmHall4": "Donor Gallery", "cfmHall5": "The Vault", "cfmHall6": "Print Room",
      "cfmHall7": "Conservation Studio", "cfmHall8": "Confiscated Wing", "cfmHall9": "Long Gallery",
      "cfmHall10": "Founder's Bequest",
      "cfmHallLabel": "Hall", "cfmSurveyLabel": "Survey", "cfmOpenLabel": "Opened", "cfmMarkLabel": "Marked",
      "cfmHallSelectLabel": "Choose a hall", "cfmOpenCount": "{n}/{max} lines", "cfmMarkCount": "{n}/{max}",
      "cfmRule1": "Rule 1 wear: scratches only collect on genuine surfaces - under 25 marks per century the top layer is new, over 95 the marks were forced.",
      "cfmRule2": "Rule 2 material: a material cannot predate its own invention, so compare the year it entered use with the year the object is dated.",
      "cfmRule3": "Rule 3 provenance: a gift ledger that names an artist whose working years fall after the object's date is impossible.",
      "cfmRule4": "Rule 4 record: a restoration log fixes when the top layer was renewed. It can excuse a late pigment or a scratch-free surface, never an impossible ledger. Check the rules in that order.",
      "cfmClueLot": "Lot note: exactly {n} exhibits in this hall are forgeries.",
      "cfmKindWear": "wear", "cfmKindMaterial": "pigment", "cfmKindProvenance": "ledger",
      "cfmVGenuine": "Genuine", "cfmVRestored": "Restored", "cfmVForgery": "Forgery",
      "cfmCardLabel": "Exhibit {n}", "cfmLogNone": "no entry",
      "cfmRecordLine": "record: dated {y}, attributed to {a}, restoration log: {l}",
      "cfmTwinOf": "same lot as exhibit {n}: one line apart",
      "cfmRowSeal": "Inspect {k}", "cfmSheetSealed": "not read yet", "cfmSheetTag": "{n} {k}: ",
      "cfmReadWear": "wear: {r} marks per century",
      "cfmReadMaterial": "{m}: in use since {y}",
      "cfmReadProvenance": "gift ledger no. {n}: names {a}, working {lo}-{hi}",
      "cfmSheetTitle": "Evidence ledger - every line you have read",
      "cfmSheetNeed": "{need} of {total} lines decide this case; a pass in rule order costs {budget} inspections.",
      "cfmMarkState": "marked: {v}", "cfmMarkNone": "not marked",
      "cfmPrompt": "{h}: {n} exhibits to audit. Check every line in rule order - {need} lines decide this case and {budget} inspections is a careful pass.",
      "cfmNeedMarks": "Mark every exhibit first: {n} of {max} are marked.",
      "cfmMissed": "Case not closed - {n} of {max} verdicts disagree with the lines, and each card names the line.",
      "cfmCheckOk": "correct: {v}",
      "cfmCheckBad": "not this one - you marked {v}:",
      "cfmWhyProv": "impossible: ledger names {a} (working {lo}-{hi}) for an object dated {y}",
      "cfmWhyMatNoLog": "impossible: pigment in use since {f} vs a body dated {y}, and no restoration is logged",
      "cfmWhyMatEarlyLog": "impossible: pigment in use since {f} vs a body dated {y}, log {l} is earlier",
      "cfmWhyRenewed": "later restoration: {r} marks per century is under 25 and the log dates the renewal to {l}",
      "cfmWhyBare": "impossible: {r} marks per century is under 25 and no renewal is logged",
      "cfmWhyForced": "impossible: {r} marks per century is over 95, so the marks were forced",
      "cfmWhyClean": "all three agree: {r} marks is within 25-95, pigment from {f} predates {y}, and the {a} window fits",
      "cfmAudited": "Case closed in {n} inspections - {s} stars. The solver needed {need}.",
      "cfmNextHall": "Next hall open.", "cfmCampaignDone": "Every hall audited.", "cfmBtnClose": "Close the case",
      "cfmAlready": "This case is closed - start a new round or pick another hall.",
      "cfmNoCase": "The registrar's ledger came back blank - start a new round.",
      "cfmHint": "Open the ledger line first: an impossible gift decides an exhibit on its own, so a forgery can cost one inspection instead of three.",
      "logCounterfeitMuseum": "Audited {h} in {n} inspections",
    },
    zh: {
      "tabCounterfeitMuseum": "赝品博物馆",
      "cfmHall1": "时代厅", "cfmHall2": "绘画翼楼", "cfmHall3": "双生柜",
      "cfmHall4": "捐赠厅", "cfmHall5": "地下库房", "cfmHall6": "版画厅",
      "cfmHall7": "修复工作室", "cfmHall8": "查没文物厅", "cfmHall9": "长廊画廊",
      "cfmHall10": "创始人遗赠厅",
      "cfmHallLabel": "展厅", "cfmSurveyLabel": "普查", "cfmOpenLabel": "展阅", "cfmMarkLabel": "判定",
      "cfmHallSelectLabel": "选择展厅", "cfmOpenCount": "已开 {n}/{max} 行", "cfmMarkCount": "{n}/{max}",
      "cfmRule1": "规则一 磨损：划痕只在真品表面累积——每百年少于 25 道说明表层是新做的，多于 95 道就是人为刻出来的。",
      "cfmRule2": "规则二 材料：材料不可能早于它被发明的年代，请把颜料的起始年份与展品标注的年代对照。",
      "cfmRule3": "规则三 归藏：捐赠账簿若记着一位创作年代晚于展品的画家，即为不可能。",
      "cfmRule4": "规则四 记录：修复日志标明表层重做的年份，它能解释较晚的材料或没有划痕的表面，却解释不了一本错误的账簿。请按这个顺序逐条核对。",
      "cfmClueLot": "批次说明：本厅恰好有 {n} 件赝品。",
      "cfmKindWear": "磨损", "cfmKindMaterial": "颜料", "cfmKindProvenance": "账簿",
      "cfmVGenuine": "真品", "cfmVRestored": "后代修复", "cfmVForgery": "赝品",
      "cfmCardLabel": "第 {n} 件展品", "cfmLogNone": "无记录",
      "cfmRecordLine": "馆藏记录：标注 {y} 年，归名于 {a}，修复日志：{l}",
      "cfmTwinOf": "与第 {n} 件同批，只有一行不同",
      "cfmRowSeal": "查看{k}", "cfmSheetSealed": "尚未查看", "cfmSheetTag": "第 {n} 件 {k}：",
      "cfmReadWear": "磨损：每百年 {r} 道划痕",
      "cfmReadMaterial": "{m}：自 {y} 年起使用",
      "cfmReadProvenance": "捐赠账簿第 {n} 号：记 {a}，创作于 {lo}-{hi} 年",
      "cfmSheetTitle": "证据台账——你已读过的每一行",
      "cfmSheetNeed": "判定本案只需 {need} 行，全案共 {total} 行；按规则顺序读一遍要花 {budget} 次展阅。",
      "cfmMarkState": "已判定：{v}", "cfmMarkNone": "尚未判定",
      "cfmPrompt": "{h}：{n} 件展品待判定。请按规则顺序逐行核对——判定本案只需 {need} 行，稳妥一遍是 {budget} 次展阅。",
      "cfmNeedMarks": "请先判定全部展品：已判定 {n}/{max}。",
      "cfmMissed": "尚未结案——{max} 件中有 {n} 件与证据不符，每件卡片都写明是哪一行。",
      "cfmCheckOk": "判定正确：{v}",
      "cfmCheckBad": "判定有误——你选了{v}：",
      "cfmWhyProv": "不可能：账簿记 {a}（{lo}-{hi} 年），展品却标注 {y} 年",
      "cfmWhyMatNoLog": "不可能：颜料 {f} 年才出现，展品标注 {y} 年，且没有修复记录",
      "cfmWhyMatEarlyLog": "不可能：颜料 {f} 年才出现，展品标注 {y} 年，{l} 年的日志早于颜料",
      "cfmWhyRenewed": "后代修复：每百年 {r} 道低于 25，日志记表层重做于 {l} 年",
      "cfmWhyBare": "不可能：每百年 {r} 道低于 25，又没有重做表层的记录",
      "cfmWhyForced": "不可能：每百年 {r} 道高于 95，划痕是人为刻出来的",
      "cfmWhyClean": "三条都吻合：{r} 道在 25 到 95 之间，{f} 年的颜料早于 {y} 年，{a} 的年代也对得上",
      "cfmAudited": "结案用了 {n} 次展阅——获得 {s} 星，判定本案只需 {need} 行。",
      "cfmNextHall": "下一展厅已解锁。", "cfmCampaignDone": "全部展厅审查完毕。", "cfmBtnClose": "结案",
      "cfmAlready": "本案已结——请开始新一轮或另选展厅。",
      "cfmNoCase": "登记处的台账是空的——请开始新一轮。",
      "cfmHint": "先看账簿那一行：归藏不可能就能单独判定一件展品，一件赝品也许只花一次展阅而不是三次。",
      "logCounterfeitMuseum": "用 {n} 次展阅审查了{h}",
    },
  });

  App.registerGame({
    name: "counterfeitMuseum",
    tabKey: "tabCounterfeitMuseum",
    init: initCounterfeitMuseumGame,
    guide: {
      svg:
        '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="4" y="8" width="52" height="60" rx="4" fill="rgba(30,41,59,.75)" stroke="rgba(148,163,184,.45)"/>' +
        '<rect x="64" y="8" width="52" height="60" rx="4" fill="rgba(30,41,59,.75)" stroke="rgba(148,163,184,.45)"/>' +
        '<circle cx="30" cy="30" r="11" fill="none" stroke="#a3e635" stroke-width="2"/>' +
        '<circle cx="90" cy="30" r="11" fill="none" stroke="#fb7185" stroke-width="2"/>' +
        '<text x="30" y="33" font-size="8" fill="#a3e635" text-anchor="middle">62</text>' +
        '<text x="90" y="33" font-size="8" fill="#fb7185" text-anchor="middle">4</text>' +
        '<text x="30" y="54" font-size="8" fill="rgba(226,232,240,.9)" text-anchor="middle">1640</text>' +
        '<text x="90" y="54" font-size="8" fill="#ff6b35" text-anchor="middle">1921</text>' +
        '<path d="M12 64h36M72 64h36" stroke="rgba(148,163,184,.4)"/></svg>',
      en: [
        "Aim: mark every exhibit genuine, later restoration or forgery, and close the hall with all of them right - 10 halls run from 4 exhibits to 12.",
        "Action: press a line to inspect it - wear, pigment, ledger - then press a verdict button; arrows jump between exhibits, 1 to 3 mark, i inspects the next line.",
        "Rule: a genuine piece needs all three to agree - marks between 25 and 95 per century, a pigment older than the object, and an artist who was working when it was dated.",
        "Watch out: a perfect scratch pattern cannot save a ledger that names an artist after the object's date, and a restoration log only excuses what it postdates.",
        "Scoring: the ledger prints how many lines decide the case; closing it inside that budget earns three stars.",
      ],
      zh: [
        "\u76ee\u6807\uff1a\u7ed9\u6bcf\u4ef6\u5c55\u54c1\u5224\u5b9a\u771f\u54c1\u3001\u540e\u4ee3\u4fee\u590d\u6216\u4f2a\u9020\uff0c\u5168\u90e8\u5224\u5bf9\u624d\u80fd\u7ed3\u6848\u2014\u2014\u5341\u4e2a\u5c55\u5385\uff0c\u5c55\u54c1\u4ece 4 \u4ef6\u5230 12 \u4ef6\u3002",
        "\u64cd\u4f5c\uff1a\u70b9\u51fb\u4e00\u884c\u5c55\u5f00\u8bc1\u636e\u2014\u2014\u78e8\u635f\u3001\u989c\u6599\u3001\u5f52\u85cf\u53f0\u8d26\u2014\u2014\u518d\u70b9\u5224\u5b9a\u6309\u94ae\uff1b\u65b9\u5411\u952e\u5207\u6362\u5c55\u54c1\uff0c1 \u5230 3 \u5224\u5b9a\uff0ci \u5c55\u5f00\u4e0b\u4e00\u884c\u3002",
        "\u89c4\u5219\uff1a\u771f\u54c1\u8981\u4e09\u6761\u5168\u5bf9\u4e0a\u2014\u2014\u6bcf\u767e\u5e74 25 \u5230 95 \u9053\u5212\u75d5\u3001\u989c\u6599\u65e9\u4e8e\u5c55\u54c1\u5e74\u4ee3\u3001\u4e14\u767b\u8bb0\u7684\u753b\u5bb6\u5728\u5f53\u5e74\u786e\u5b9e\u5728\u4e16\u3002",
        "\u5c0f\u5fc3\uff1a\u5212\u75d5\u518d\u50cf\u771f\u54c1\u4e5f\u6551\u4e0d\u4e86\u4e00\u4efd\u63d0\u5230\u540e\u4e16\u753b\u5bb6\u7684\u5f52\u85cf\u8bb0\u5f55\uff1b\u4fee\u590d\u65e5\u5fd7\u53ea\u80fd\u89e3\u91ca\u5b83\u4e4b\u540e\u7684\u75d5\u8ff9\u3002",
        "\u8ba1\u5206\uff1a\u53f0\u8d26\u4f1a\u5199\u660e\u672c\u6848\u9700\u8981\u51e0\u884c\u8bc1\u636e\uff0c\u5728\u8fd9\u4e2a\u9884\u7b97\u5185\u7ed3\u6848\u5c31\u662f\u4e09\u661f\u3002",
      ],
    },
  });

  /* Exported for the other modules. */
  App.initCounterfeitMuseumGame = initCounterfeitMuseumGame;
  App.counterfeitLevels = cfmLevels;
  App.counterfeitSurvey = cfmSurvey;
  App.counterfeitWearFloor = cfmWearFloor;
  App.counterfeitWearCeil = cfmWearCeil;
  App.counterfeitVerdicts = cfmVerdictKeys;
  App.counterfeitGenerate = cfmGenerate;
  App.counterfeitSolutions = cfmSolutions;
  App.counterfeitFirstSolution = cfmFirstSolution;
  App.counterfeitCompatible = cfmCompatible;
  App.counterfeitDecide = cfmDecide;
  App.counterfeitImplied = cfmImplied;
  App.counterfeitReason = cfmReasonOf;
  App.counterfeitNeed = cfmStatedCount;
  App.counterfeitKindsNeeded = cfmKindsNeeded;
  App.counterfeitSolutionsOneKind = cfmSolutionsOneKind;
  App.counterfeitThresholds = cfmThresholdsFor;
})(window.CapitalConvert = window.CapitalConvert || {});
