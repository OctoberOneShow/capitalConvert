/* Lost Language - the decipherment campaign in the shared game drawer.
 * Each chamber hands over a few wall rubbings: a plain description of what the
 * picture shows, and the same scene carved in a tongue nobody speaks any more.
 * Words and grammar arrive together - which word names the doer is a fact about
 * position, and the mark ka- only means something once the order is known - so a
 * memorised word list is never enough to read an unseen wall.
 *
 * Digs are dealt from a ground-truth lexicon plus two grammar rules.
 * App.tongueAnalyses proves the printed rubbings admit exactly ONE analysis,
 * and the star ladder is measured, never invented: the three-star anchor is
 * App.tonguePrefixCost - the bench worked down in printed order until every
 * word is carved and exactly one analysis fits, a line ordinary play can always
 * finish - while App.tongueMinimal reports the smallest bench the carve could
 * find as flavour text, and App.tongueGlossOnlyFails proves a reader who only
 * memorised the word list cannot choose between the lines on any test wall.
 * Registered through the game registry, so it needs no markup in the four
 * HTML pages. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  var t = App.t;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  var createCampaign = App.createCampaign;
  var fillCampaignPicker = App.fillCampaignPicker;
  var starsFor = App.starsFor;

  var lngMarkGlyph = "ka\u00b7";
  var lngRoleKeys = { a: "lngRoleA", p: "lngRoleP", v: "lngRoleV" };

  /* Rule one: which of the three carved words is the doer, the acted-on and the
   * action. Six permutations, exactly one of them the truth. */
  var lngOrders = [
    { id: "apv", a: 0, p: 1, v: 2, key: "lngOrderAPV" },
    { id: "pav", a: 1, p: 0, v: 2, key: "lngOrderPAV" },
    { id: "vap", a: 1, p: 2, v: 0, key: "lngOrderVAP" },
    { id: "vpa", a: 2, p: 1, v: 0, key: "lngOrderVPA" },
    { id: "avp", a: 0, p: 2, v: 1, key: "lngOrderAVP" },
    { id: "pva", a: 2, p: 0, v: 1, key: "lngOrderPVA" },
  ];

  /* Rule two: what the mark ka- does. "none" = this dialect carves no mark, and
   * "done" is the tempting past guess that is never the truth here - it exists so
   * a hypothesis can be refuted rather than never tried. */
  var lngMarks = [
    { id: "none", key: "lngMarkNone", short: "" },
    { id: "many", key: "lngMarkMany", short: "lngMarkManyShort" },
    { id: "doer", key: "lngMarkDoer", short: "lngMarkDoerShort" },
    { id: "object", key: "lngMarkObject", short: "lngMarkObjectShort" },
    { id: "done", key: "lngMarkDone", short: "lngMarkDoneShort" },
  ];
  var lngAllMarks = ["none", "many", "doer", "object", "done"];
  var lngMarkIds = ["many", "doer", "object", "done"];

  /* Chambers: pool size, rubbings on the bench, unseen walls in the test, the
   * hypotheses the dialect admits, and how many participants of one scene can be
   * many at once. The ladder is ordered by measured difficulty, not by its
   * knobs: every chamber was dealt at seeds 1..240 through App.tongueGenerate
   * and both measured quantities - the honest bench cost App.tonguePrefixCost
   * (the three-star line) and the carved minimum App.tongueMinimal - were read
   * off the same deals. Mean honest cost climbs 3.9, 5.1, 6.4, 7.6, 8.2, 8.8,
   * 9.6, 10.6, 10.8, 12.0 and mean carve 3.1, 3.4, 4.3, 5.2, 5.3, 6.0, 6.4,
   * 6.8, 7.2, 8.1 chamber by chamber, with zero failed deals in all 2400. */
  var lngLevels = [
    { id: "lng1", labelKey: "lngChamber1", nouns: 4, verbs: 2, scenes: 6, tests: 3, marks: ["none"], truth: "none", many: 0 },
    { id: "lng2", labelKey: "lngChamber2", nouns: 5, verbs: 3, scenes: 7, tests: 3, marks: lngMarkIds, truth: "many", many: 1 },
    { id: "lng3", labelKey: "lngChamber3", nouns: 7, verbs: 3, scenes: 8, tests: 4, marks: lngMarkIds, truth: "many", many: 2 },
    { id: "lng4", labelKey: "lngChamber4", nouns: 8, verbs: 4, scenes: 9, tests: 4, marks: lngMarkIds, truth: "doer", many: 0 },
    { id: "lng5", labelKey: "lngChamber5", nouns: 8, verbs: 4, scenes: 10, tests: 4, marks: lngMarkIds, truth: ["doer", "object"], many: 0 },
    { id: "lng6", labelKey: "lngChamber6", nouns: 9, verbs: 5, scenes: 10, tests: 4, marks: lngMarkIds, truth: "many", many: 1 },
    { id: "lng7", labelKey: "lngChamber7", nouns: 10, verbs: 5, scenes: 11, tests: 4, marks: lngMarkIds, truth: ["doer", "object"], many: 0 },
    { id: "lng8", labelKey: "lngChamber8", nouns: 10, verbs: 6, scenes: 12, tests: 5, marks: lngMarkIds, truth: "many", many: 2 },
    { id: "lng9", labelKey: "lngChamber9", nouns: 11, verbs: 6, scenes: 12, tests: 5, marks: lngMarkIds, truth: ["many", "doer", "object"], many: 2 },
    { id: "lng10", labelKey: "lngChamber10", nouns: 12, verbs: 7, scenes: 13, tests: 5, marks: lngMarkIds, truth: "many", many: 2 },
  ];

  /* Participants and acts every chamber draws its words from. Plurals are
   * spelled out per entry, so no display rule has to guess at them. */
  var lngNounPool = [
    { en: "the elder", enPl: "the elders", zh: "\u957f\u8001", zhPl: "\u957f\u8001\u4eec" },
    { en: "the child", enPl: "the children", zh: "\u5b69\u5b50", zhPl: "\u5b69\u5b50\u4eec" },
    { en: "the heron", enPl: "the herons", zh: "\u82cd\u9e6d", zhPl: "\u51e0\u53ea\u82cd\u9e6d" },
    { en: "the fox", enPl: "the foxes", zh: "\u72d0\u72f8", zhPl: "\u51e0\u53ea\u72d0\u72f8" },
    { en: "the keeper", enPl: "the keepers", zh: "\u5b88\u5854\u4eba", zhPl: "\u5b88\u5854\u4eec" },
    { en: "the weaver", enPl: "the weavers", zh: "\u7ec7\u5de5", zhPl: "\u51e0\u4f4d\u7ec7\u5de5" },
    { en: "the stranger", enPl: "the strangers", zh: "\u5f02\u4e61\u4eba", zhPl: "\u51e0\u4f4d\u5f02\u4e61\u4eba" },
    { en: "the hound", enPl: "the hounds", zh: "\u730e\u72ac", zhPl: "\u51e0\u53ea\u730e\u72ac" },
    { en: "the goose", enPl: "the geese", zh: "\u96c1", zhPl: "\u51e0\u53ea\u96c1" },
    { en: "the rabbit", enPl: "the rabbits", zh: "\u5154\u5b50", zhPl: "\u51e0\u53ea\u5154\u5b50" },
    { en: "the tortoise", enPl: "the tortoises", zh: "\u77f3\u9f7f", zhPl: "\u51e0\u53ea\u77f3\u9f7f" },
    { en: "the crow", enPl: "the crows", zh: "\u4e4c\u9e26", zhPl: "\u51e0\u53ea\u4e4c\u9e26" },
  ];
  var lngVerbPool = [
    { en: "sees", enPl: "see", zh: "\u770b\u89c1" }, { en: "grips", enPl: "grip", zh: "\u6293\u4f4f" },
    { en: "feeds", enPl: "feed", zh: "\u5582\u517b" }, { en: "follows", enPl: "follow", zh: "\u8ddf\u968f" },
    { en: "fears", enPl: "fear", zh: "\u754f\u60e7" }, { en: "carries", enPl: "carry", zh: "\u8d1f\u8fd0" },
    { en: "wakes", enPl: "wake", zh: "\u5524\u9192" }, { en: "teaches", enPl: "teach", zh: "\u6559\u5bfc" },
  ];

  /* The sound inventory: noun roots and verb roots never mix and no root is a
   * prefix of another, so the eye can always cut a line into words. */
  var lngRootsA = ["tal", "shen", "vor", "imre", "kessa", "nul", "odhan",
    "ruva", "senni", "tashka", "elik", "morna"];
  var lngRootsB = ["mir", "vel", "gor", "thune", "assa", "lek", "boru", "nesh"];

  /* --- seeded random: a dig is reproducible from (level, seed) -------------- */
  function lngRng(seed) {
    var raw = Number(seed);
    var s = (isNaN(raw) ? 0 : Math.floor(raw)) % 2147483646 + 1;
    if (s <= 0) { s += 2147483645; }
    return function next() {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  function lngPick(rng, list) {
    if (!list || !list.length) { return null; }
    var i = Math.min(list.length - 1, Math.max(0, Math.floor(rng() * list.length)));
    return list[i];
  }

  function lngPickKey(rng, list) {
    var hit = lngPick(rng, list);
    return hit ? hit.key : "";
  }

  function lngShuffle(rng, list) {
    var out = list.slice();
    for (var i = out.length - 1; i > 0; i -= 1) {
      var j = Math.floor(rng() * (i + 1));
      var tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
    return out;
  }

  function lngIndexOf(list, value) {
    for (var i = 0; i < list.length; i += 1) {
      if (list[i] === value) { return i; }
    }
    return -1;
  }

  function lngById(list, id) {
    var index = -1;
    for (var i = 0; i < list.length; i += 1) {
      if (list[i].id === id) { index = i; break; }
    }
    return index < 0 ? null : list[index];
  }

  function lngLevelOf(level) {
    for (var i = 0; i < lngLevels.length; i += 1) {
      if (lngLevels[i] === level || lngLevels[i].id === level) { return lngLevels[i]; }
    }
    return lngLevels[0];
  }

  /* --- the reading model ---------------------------------------------------- */
  /* A line is three words, each [{r: root, m: carries the mark}]. lngRead turns
   * one back into roles and features under a hypothesis, exactly the way the
   * player must, and flags the lines the hypothesis cannot read at all. */
  function lngRead(order, mark, tokens) {
    var out = { a: "", p: "", v: "", ac: "one", pc: "one", bad: "" };
    if (!order || !tokens || tokens.length < 3) { out.bad = "line"; return out; }
    var aT = tokens[order.a];
    var pT = tokens[order.p];
    var vT = tokens[order.v];
    out.a = aT ? aT.r : "";
    out.p = pT ? pT.r : "";
    out.v = vT ? vT.r : "";
    if (mark === "many") {
      out.ac = aT && aT.m ? "many" : "one";
      out.pc = pT && pT.m ? "many" : "one";
      if (vT && vT.m) { out.bad = "mark"; }
      return out;
    }
    if (mark === "none" && (aT.m || pT.m || vT.m)) { out.bad = "mark"; }
    else if (mark === "done" && (aT.m || pT.m || !vT.m)) { out.bad = "mark"; }
    else if (mark === "doer" && (!aT.m || pT.m || vT.m)) { out.bad = "mark"; }
    else if (mark === "object" && (!pT.m || aT.m || vT.m)) { out.bad = "mark"; }
    return out;
  }

  function lngMarkedRoot(tokens) {
    for (var i = 0; i < tokens.length; i += 1) {
      if (tokens[i].m) { return tokens[i].r; }
    }
    return "";
  }

  function lngCluesOf(corpus) {
    if (!corpus) { return []; }
    if (Object.prototype.toString.call(corpus) === "[object Array]") { return corpus; }
    return corpus.clues || [];
  }

  function lngMarksOf(corpus) {
    return corpus && corpus.marks && corpus.marks.length ? corpus.marks : lngAllMarks;
  }

  /* One hypothesis pins every word the clues mention, so it admits at most one
   * lexicon: those pins ARE the analysis. Any clash - a word named two things,
   * two words named the same thing, a feature the picture denies - rejects it. */
  function lngFit(corpus, order, mark) {
    var clues = lngCluesOf(corpus);
    if (!clues.length || !order) { return null; }
    var map = {};
    var used = {};
    for (var i = 0; i < clues.length; i += 1) {
      var prop = clues[i] && clues[i].prop;
      if (!prop) { return null; }
      var read = lngRead(order, mark, clues[i].tokens);
      if (read.bad || read.ac !== prop.ac || read.pc !== prop.pc) { return null; }
      var pins = [[read.a, prop.a], [read.p, prop.p], [read.v, prop.v]];
      for (var k = 0; k < pins.length; k += 1) {
        var root = pins[k][0];
        var lex = pins[k][1];
        if (!root || !lex) { return null; }
        if (map[root]) {
          if (map[root] !== lex) { return null; }
        } else if (used[lex]) {
          return null;
        } else {
          map[root] = lex;
          used[lex] = root;
        }
      }
    }
    return map;
  }

  /* How many full analyses - lexicon and both rules - the clues admit, counting
   * up to `limit`. A dig only ships when this says exactly one. */
  function lngAnalyses(corpus, limit) {
    var cap = typeof limit === "number" && limit > 0 ? Math.floor(limit) : 2;
    var marks = lngMarksOf(corpus);
    var count = 0;
    for (var o = 0; o < lngOrders.length; o += 1) {
      for (var m = 0; m < marks.length; m += 1) {
        if (lngFit(corpus, lngOrders[o], marks[m])) {
          count += 1;
          if (count >= cap) { return count; }
        }
      }
    }
    return count;
  }

  /* --- text ----------------------------------------------------------------- */
  function lngSay(tokens) {
    var parts = [];
    for (var i = 0; tokens && i < tokens.length; i += 1) {
      parts.push((tokens[i].m ? lngMarkGlyph : "") + tokens[i].r);
    }
    return parts.join(" ");
  }

  function lngNameOf(dig, key, count) {
    var lex = dig && dig.byKey ? dig.byKey[key] : null;
    if (!lex) { return ""; }
    if (App.currentLang === "zh") { return count === "many" ? lex.zhPl : lex.zh; }
    return count === "many" ? lex.enPl : lex.en;
  }

  function lngVerbOf(dig, key, actorCount) {
    var lex = dig && dig.byKey ? dig.byKey[key] : null;
    if (!lex) { return ""; }
    if (App.currentLang === "zh") { return lex.zh; }
    return actorCount === "many" ? lex.enPl : lex.en;
  }

  function lngSentenceOf(dig, prop) {
    if (!prop) { return ""; }
    return t("lngSentence", {
      a: lngNameOf(dig, prop.a, prop.ac),
      v: lngVerbOf(dig, prop.v, prop.ac),
      p: lngNameOf(dig, prop.p, prop.pc),
    });
  }

  /* Encode a scene the way the dialect writes it - the ground truth only. */
  function lngEncode(dig, prop) {
    var many = dig.mark === "many";
    var tokens = [];
    tokens[dig.order.a] = { r: dig.rootOf[prop.a], m: many ? prop.ac === "many" : dig.mark === "doer" };
    tokens[dig.order.p] = { r: dig.rootOf[prop.p], m: many ? prop.pc === "many" : dig.mark === "object" };
    tokens[dig.order.v] = { r: dig.rootOf[prop.v], m: false };
    return tokens;
  }

  /* The word list alone sees no more than a bag of roots, marks thrown away. */
  function lngBag(tokens) {
    var list = [];
    for (var i = 0; i < tokens.length; i += 1) { list.push(tokens[i].r); }
    return list.sort().join("|");
  }

  /* Twist proof: on every test wall at least two offered lines are made of the
   * very same words, so a reader who only memorised the glosses has nothing to
   * choose with and cannot pass. */
  function lngGlossOnlyFails(dig) {
    if (!dig || !dig.test || !dig.test.length) { return false; }
    for (var i = 0; i < dig.test.length; i += 1) {
      var item = dig.test[i];
      var bag = lngBag(item.target);
      var tied = 0;
      for (var k = 0; k < item.options.length; k += 1) {
        if (lngBag(item.options[k]) === bag) { tied += 1; }
      }
      if (tied < 2) { return false; }
    }
    return true;
  }

  /* How many offered lines a hypothesis reads as the wall's own scene. */
  function lngItemHits(dig, item, order, mark) {
    var hits = 0;
    for (var k = 0; k < item.options.length; k += 1) {
      var read = lngRead(order, mark, item.options[k]);
      var a = dig.byRoot[read.a];
      var p = dig.byRoot[read.p];
      var v = dig.byRoot[read.v];
      if (!read.bad && a && p && v && a.key === item.prop.a && p.key === item.prop.p &&
          v.key === item.prop.v && read.ac === item.prop.ac && read.pc === item.prop.pc) {
        hits += 1;
      }
    }
    return hits;
  }

  function lngSig(prop) {
    return [prop.a, prop.p, prop.v, prop.ac, prop.pc].join("|");
  }

  function lngCovers(clues, keys) {
    for (var i = 0; i < keys.length; i += 1) {
      var found = false;
      for (var k = 0; k < clues.length && !found; k += 1) {
        var prop = clues[k].prop;
        found = !!(prop && (prop.a === keys[i] || prop.p === keys[i] || prop.v === keys[i]));
      }
      if (!found) { return false; }
    }
    return true;
  }

  /* Carve chips away while the analysis stays unique and every word is still
   * carved somewhere on the bench. What survives is the minimal set, so the
   * three-star budget is measured rather than invented. */
  function lngMinimal(dig, rng) {
    var clues = dig.clues;
    var dropped = {};
    var count = clues.length;
    var order = [];
    for (var i = 0; i < clues.length; i += 1) { order.push(i); }
    order = lngShuffle(rng, order);
    for (var p = 0; p < order.length; p += 1) {
      var kept = [];
      for (var k = 0; k < clues.length; k += 1) {
        if (k !== order[p] && !dropped[k]) { kept.push(clues[k]); }
      }
      if (kept.length < 2 || !lngCovers(kept, dig.keys)) { continue; }
      if (lngAnalyses({ clues: kept, marks: dig.marks }, 2) !== 1) { continue; }
      dropped[order[p]] = true;
      count -= 1;
    }
    return count;
  }

  /* The cost of working down the bench top to bottom: how many chips, in the
   * printed order, leave every word carved somewhere AND exactly one analysis
   * fitting. That is the honest line the star ladder anchors on, because a
   * reader who opens that prefix can gloss every word and answer every wall
   * with certainty - ordinary play finishes it, so the top band is never a
   * hidden-information lottery. */
  function lngPrefixCost(dig) {
    for (var k = 2; k <= dig.clues.length; k += 1) {
      var kept = dig.clues.slice(0, k);
      if (lngCovers(kept, dig.keys) && lngAnalyses({ clues: kept, marks: dig.marks }, 2) === 1) {
        return k;
      }
    }
    return dig.clues.length;
  }

  /* The star ladder, measured rather than invented: three stars is the honest
   * line above (the anchor App.tonguePrefixCost proves on this very deal), one
   * star is the whole bench opened - the dialect is decided for free once every
   * rubbing is read - and the middle rung is everything but that last rubbing,
   * the reader who double-checks nearly all of it. The ladder never falls:
   * budget <= mid <= total by construction. */
  function lngThresholds(dig) {
    var total = dig && dig.total > 0 ? dig.total : 1;
    var top = dig && dig.budget > 0 ? dig.budget : total;
    if (top > total) { top = total; }
    var mid = total > 1 ? total - 1 : total;
    if (mid < top) { mid = top; }
    return [top, mid, total];
  }

  /* --- dealing one dig ------------------------------------------------------ */
  function lngCounts(rng, maxMany) {
    if (!maxMany) { return ["one", "one"]; }
    var roll = rng();
    if (roll < 0.4) { return ["one", "one"]; }
    if (roll < 0.62) { return ["many", "one"]; }
    if (roll < 0.84) { return ["one", "many"]; }
    return maxMany > 1 ? ["many", "many"] : ["many", "one"];
  }

  function lngPatterns(maxMany) {
    var out = [["one", "one"], ["many", "one"], ["one", "many"]];
    if (maxMany > 1) { out.push(["many", "many"]); }
    return out;
  }

  function lngLex(key, kind, entry, root) {
    return { key: key, kind: kind, root: root, en: entry.en, enPl: entry.enPl,
      zh: entry.zh, zhPl: entry.zhPl || entry.zh + "\u4eec" };
  }

  /* One test wall: the true line, the same words read the other way round, and a
   * third line. Two of the three always carry the same bag of words, so the word
   * list cannot choose and the grammar can. */
  function lngMakeItem(dig, prop, rng) {
    var options = [
      lngEncode(dig, prop),
      lngEncode(dig, { a: prop.p, p: prop.a, v: prop.v, ac: prop.pc, pc: prop.ac }),
    ];
    var other = null;
    if (dig.mark === "many") {
      var patterns = lngPatterns(dig.many);
      for (var p = 0; p < patterns.length; p += 1) {
        if (patterns[p][0] !== prop.ac || patterns[p][1] !== prop.pc) {
          other = { a: prop.a, p: prop.p, v: prop.v, ac: patterns[p][0], pc: patterns[p][1] };
          break;
        }
      }
    } else {
      var pool = dig.nouns.filter(function (lex) { return lex.key !== prop.a && lex.key !== prop.p; });
      var x = lngPickKey(rng, pool);
      var y = lngPickKey(rng, pool);
      var v = lngPickKey(rng, dig.verbs);
      if (!x || !y || !v || x === y) { return null; }
      other = { a: x, p: y, v: v, ac: "one", pc: "one" };
    }
    if (!other || lngSig(other) === lngSig(prop)) { return null; }
    options.push(lngEncode(dig, other));
    var texts = [];
    var bag = lngBag(options[0]);
    var tied = 0;
    for (var i = 0; i < options.length; i += 1) {
      texts.push(lngSay(options[i]));
      if (lngBag(options[i]) === bag) { tied += 1; }
      for (var j = 0; j < i; j += 1) {
        if (texts[i] === texts[j]) { return null; }
      }
    }
    if (tied < 2) { return null; }
    var slots = lngShuffle(rng, [0, 1, 2]);
    var shuffled = [];
    var correct = 0;
    for (var s = 0; s < slots.length; s += 1) {
      if (slots[s] === 0) { correct = s; }
      shuffled.push(options[slots[s]]);
    }
    return { prop: prop, target: options[0], options: shuffled, correct: correct };
  }

  function lngMakeDig(def, rng) {
    var i;
    /* 1. the lexicon: which root stands for which participant or act. */
    var nouns = lngShuffle(rng, lngNounPool).slice(0, def.nouns);
    var verbs = lngShuffle(rng, lngVerbPool).slice(0, def.verbs);
    var nounRoots = lngShuffle(rng, lngRootsA).slice(0, def.nouns);
    var verbRoots = lngShuffle(rng, lngRootsB).slice(0, def.verbs);
    var lexemes = [];
    for (i = 0; i < nouns.length; i += 1) { lexemes.push(lngLex("n" + i, "noun", nouns[i], nounRoots[i])); }
    for (i = 0; i < verbs.length; i += 1) { lexemes.push(lngLex("v" + i, "verb", verbs[i], verbRoots[i])); }
    if (lexemes.length < def.nouns + def.verbs || def.scenes < 3) { return null; }
    var byKey = {};
    var byRoot = {};
    var rootOf = {};
    var keys = [];
    for (i = 0; i < lexemes.length; i += 1) {
      byKey[lexemes[i].key] = lexemes[i];
      byRoot[lexemes[i].root] = lexemes[i];
      rootOf[lexemes[i].key] = lexemes[i].root;
      keys.push(lexemes[i].key);
    }
    var truthMark = def.truth;
    if (Object.prototype.toString.call(truthMark) === "[object Array]") { truthMark = lngPick(rng, truthMark); }
    var dig = {
      level: def.id, labelKey: def.labelKey, marks: def.marks, mark: truthMark, many: def.many,
      order: lngPick(rng, lngOrders), lexemes: lexemes, keys: keys, byKey: byKey, byRoot: byRoot,
      rootOf: rootOf, rows: lngShuffle(rng, lexemes), pin: {}, clues: [], test: [],
      nouns: lexemes.filter(function (l) { return l.kind === "noun"; }),
      verbs: lexemes.filter(function (l) { return l.kind === "verb"; }),
      need: 0, budget: 0, total: 0,
    };
    if (!dig.order || !dig.nouns.length || !dig.verbs.length) { return null; }

    /* 2. the scene pool: distinct, and every word used at least twice so the
     * bench can pin the lexicon and break the doer/acted-on mirror. */
    var props = [];
    var seen = {};
    var uses = {};
    for (i = 0; i < keys.length; i += 1) { uses[keys[i]] = 0; }
    function push(a, p, v) {
      if (!a || !p || !v || a === p) { return false; }
      var counts = lngCounts(rng, def.many);
      var prop = { a: a, p: p, v: v, ac: counts[0], pc: counts[1] };
      var sig = lngSig(prop);
      if (seen[sig]) { return false; }
      seen[sig] = true;
      props.push(prop);
      uses[a] += 1;
      uses[p] += 1;
      uses[v] += 1;
      return true;
    }
    var guard = 0;
    while (props.length < def.scenes + def.tests + 10 && guard < 300) {
      guard += 1;
      push(lngPickKey(rng, dig.nouns), lngPickKey(rng, dig.nouns), lngPickKey(rng, dig.verbs));
    }
    for (i = 0; i < keys.length; i += 1) {
      var lex = dig.byKey[keys[i]];
      var tries = 0;
      while (uses[keys[i]] < 2 && tries < 24) {
        tries += 1;
        if (lex.kind === "verb") {
          push(lngPickKey(rng, dig.nouns), lngPickKey(rng, dig.nouns), lex.key);
        } else {
          var partner = lngPickKey(rng, dig.nouns);
          var verb = lngPickKey(rng, dig.verbs);
          push(lex.key, partner, verb);
          push(partner, lex.key, verb);
        }
      }
      if (uses[keys[i]] < 2) { return null; }
    }

    /* 3. the bench: widest coverage first so every word is carved somewhere,
     * then filler up to size. */
    var rest = props.slice();
    var chosen = [];
    var hit = {};
    function take(prop) {
      hit[prop.a] = true;
      hit[prop.p] = true;
      hit[prop.v] = true;
      chosen.push(prop);
    }
    guard = 0;
    while (chosen.length < def.scenes && Object.keys(hit).length < keys.length && guard < 60) {
      guard += 1;
      var bestIndex = -1;
      var bestGain = 0;
      for (i = 0; i < rest.length; i += 1) {
        var cand = rest[i];
        var gain = (hit[cand.a] ? 0 : 1) + (hit[cand.p] ? 0 : 1) + (hit[cand.v] ? 0 : 1);
        if (gain > bestGain) { bestGain = gain; bestIndex = i; }
      }
      if (bestIndex < 0) { return null; }
      take(rest[bestIndex]);
      rest.splice(bestIndex, 1);
    }
    if (Object.keys(hit).length < keys.length) { return null; }
    while (chosen.length < def.scenes && rest.length) {
      var at = Math.min(rest.length - 1, Math.floor(rng() * rest.length));
      take(rest[at]);
      rest.splice(at, 1);
    }
    if (chosen.length < def.scenes || rest.length < def.tests) { return null; }
    var bench = lngShuffle(rng, chosen);
    for (i = 0; i < bench.length; i += 1) {
      dig.clues.push({ n: i + 1, prop: bench[i], tokens: lngEncode(dig, bench[i]) });
    }
    if (!lngCovers(dig.clues, keys)) { return null; }

    /* 4. the test walls: scenes never shown, each answered by exactly one line. */
    for (i = 0; i < rest.length && dig.test.length < def.tests; i += 1) {
      var item = lngMakeItem(dig, rest[i], rng);
      if (item && lngItemHits(dig, item, dig.order, dig.mark) === 1) { dig.test.push(item); }
    }
    if (dig.test.length < def.tests) { return null; }

    /* 5. where each word is first carved: the counterexample the panel quotes. */
    for (i = 0; i < dig.clues.length; i += 1) {
      var clue = dig.clues[i];
      var roles = [["a", clue.prop.a], ["p", clue.prop.p], ["v", clue.prop.v]];
      for (var r = 0; r < roles.length; r += 1) {
        var root = dig.rootOf[roles[r][1]];
        if (!dig.pin[root]) { dig.pin[root] = { n: clue.n, role: roles[r][0], lex: roles[r][1] }; }
      }
    }

    /* 6. measure the bench, then demand the two proofs. */
    dig.need = lngMinimal(dig, rng);
    dig.budget = lngPrefixCost(dig);
    dig.total = dig.clues.length;
    if (dig.need < 2 || dig.need > dig.total) { return null; }
    return lngAnalyses(dig, 2) === 1 && lngGlossOnlyFails(dig) ? dig : null;
  }

  function lngGenerate(level, seed) {
    var def = lngLevelOf(level);
    var rng = lngRng(seed);
    for (var attempt = 0; attempt < 60; attempt += 1) {
      var dig = lngMakeDig(def, rng);
      if (dig) {
        dig.seed = Number(seed);
        return dig;
      }
    }
    return null;
  }

  /* --- counterexamples ------------------------------------------------------ */
  /* Where the player's rules first disagree with a rubbing, read with the true
   * word list so every sentence printed is a real sentence. A wrong order shows
   * up as one word pinned to two meanings, or two words pinned to one; a wrong
   * mark shows up as a line that cannot carry it, or a reading with the wrong
   * number. */
  function lngRuleDiff(dig, orderKey, markKey) {
    if (!dig) { return null; }
    var order = lngById(lngOrders, orderKey);
    if (!order || !lngById(lngMarks, markKey)) { return null; }
    var places = {};
    var owners = {};
    for (var i = 0; i < dig.clues.length; i += 1) {
      var clue = dig.clues[i];
      var prop = clue.prop;
      var read = lngRead(order, markKey, clue.tokens);
      var truth = lngSentenceOf(dig, prop);
      if (read.bad) {
        return { kind: "mark", n: clue.n, g: lngMarkedRoot(clue.tokens) || read.a, truth: truth };
      }
      if (read.ac !== prop.ac || read.pc !== prop.pc) {
        return { kind: "count", n: clue.n, truth: truth,
          pred: lngSentenceOf(dig, { a: prop.a, p: prop.p, v: prop.v, ac: read.ac, pc: read.pc }) };
      }
      var slots = [[read.a, prop.a, "a"], [read.p, prop.p, "p"], [read.v, prop.v, "v"]];
      for (var k = 0; k < slots.length; k += 1) {
        var root = slots[k][0];
        var lex = slots[k][1];
        var role = slots[k][2];
        var old = places[root];
        var kept = owners[lex];
        if (old && old.lex !== lex) {
          return { kind: "clash", g: root, n1: old.n, r1: t(lngRoleKeys[old.role]), w1: lngNameOf(dig, old.lex, "one"),
            n2: clue.n, r2: t(lngRoleKeys[role]), w2: lngNameOf(dig, lex, "one") };
        }
        if (!old) { places[root] = { n: clue.n, role: role, lex: lex }; }
        if (kept && kept.root !== root) {
          return { kind: "dup", a: root, b: kept.root, w: lngNameOf(dig, lex, "one"), n1: clue.n, n2: kept.n };
        }
        owners[lex] = { root: root, n: clue.n };
      }
    }
    return null;
  }

  /* What an offered line on a test wall says in the true dialect, so a wrong
   * choice is answered with its own sentence rather than a shrug. */
  function lngOptionReading(dig, tokens) {
    var read = lngRead(dig.order, dig.mark, tokens);
    var a = dig.byRoot[read.a];
    var p = dig.byRoot[read.p];
    var v = dig.byRoot[read.v];
    if (read.bad || !a || !p || !v) { return t("lngUnreadable", { line: lngSay(tokens) }); }
    return lngSentenceOf(dig, { a: a.key, p: p.key, v: v.key, ac: read.ac, pc: read.pc });
  }

  /* --- the panel ------------------------------------------------------------ */
  /* Every node is created, never parsed: the headless harness plays with the
   * same DOM the browser paints. */
  function lngEl(tag, className, text) {
    var el = document.createElement(tag);
    if (className) { el.className = className; }
    if (text) { el.textContent = text; }
    return el;
  }

  function lngI18n(tag, className, key) {
    var el = lngEl(tag, className, t(key));
    el.setAttribute("data-i18n", key);
    return el;
  }

  function lngAdd(host) {
    for (var i = 1; i < arguments.length; i += 1) {
      if (arguments[i]) { host.appendChild(arguments[i]); }
    }
    return host;
  }

  function lngStat(key, valueEl) {
    return lngAdd(lngEl("div", "game-stat"), lngI18n("span", "", key), valueEl);
  }

  function lngPress(className, text, handler) {
    var btn = lngEl("button", className, text);
    btn.type = "button";
    btn.setAttribute("aria-pressed", "false");
    btn.addEventListener("click", handler);
    return btn;
  }

  /* The drawer's own buttons carry their label in a span, so the shared i18n
   * pass can retarget them the way it retargets the shipped markup. */
  function lngButton(className, key, handler) {
    var btn = lngEl("button", className);
    btn.type = "button";
    btn.appendChild(lngAdd(lngEl("span", "button-content"), lngI18n("span", "", key)));
    btn.addEventListener("click", handler);
    return btn;
  }

  function initLostLanguageGame(panelEl) {
    if (!panelEl) { return; }
    var campaign = createCampaign({ key: "lost-language-campaign", levels: lngLevels });
    var level = lngLevels[campaign.indexOf(campaign.nextLevelId())] || lngLevels[0];
    var dig = null;
    var seed = (Date.now() % 190000) + 31;
    var gloss = [];
    var picks = { order: "", mark: "" };
    var answers = [];
    var revealed = [];
    var opened = 0;
    var done = false;
    var active = 0;
    var cards = [];
    var chipBtns = [];
    var chipTexts = [];
    var chipLines = [];
    var chipWhy = [];
    var wordSels = [];
    var wordWhy = [];
    var ruleBtns = { order: [], mark: [] };
    var ruleWhy = { order: null, mark: null };
    var itemBtns = [];
    var itemWhy = [];

    var chipsEl = lngEl("strong");
    var readEl = lngEl("strong");
    var glossEl = lngEl("strong");
    var ruleEl = lngEl("strong");
    var hud = lngAdd(lngEl("div", "game-hud"), lngStat("lngChipsLabel", chipsEl),
      lngStat("lngReadLabel", readEl), lngStat("lngGlossLabel", glossEl), lngStat("lngRulesLabel", ruleEl));

    var legend = lngEl("p", "lng-legend");
    var scenesEl = lngAdd(lngEl("div", "lng-scenes"), legend);
    scenesEl.setAttribute("role", "group");
    scenesEl.setAttribute("aria-label", t("lngScenesAria"));

    var glossList = lngEl("div", "lng-glosses");
    var grammarList = lngEl("div", "lng-grammar");
    var testList = lngEl("div", "lng-test");
    var note = lngAdd(lngEl("div", "lng-note"),
      lngI18n("p", "lng-note-title", "lngNoteTitle"),
      lngI18n("p", "lng-section", "lngGlossTitle"), glossList,
      lngI18n("p", "lng-section", "lngGrammarTitle"), grammarList,
      lngI18n("p", "lng-section", "lngTestTitle"), testList);

    var result = lngEl("p", "game-result");
    result.setAttribute("role", "status");

    var levelSel = lngEl("select", "elements-select");
    levelSel.id = "lngLevelSel";
    var levelLabel = lngI18n("label", "elements-label", "lngLevelSelectLabel");
    levelLabel.setAttribute("for", "lngLevelSel");
    var levelRow = lngAdd(lngEl("div", "elements-row"), levelLabel, levelSel);

    var checkBtn = lngButton("primary", "lngBtnCheck", function () { submitWork(); });
    var newBtn = lngButton("ghost", "lngBtnNew", function () { loadDig(); });
    var bestEl = lngEl("p", "game-best");
    var actions = lngAdd(lngEl("div", "game-actions"), checkBtn, newBtn, bestEl);
    var hint = lngI18n("p", "game-hint", "lngHint");

    lngAdd(panelEl, hud, scenesEl, note, result, levelRow, actions, hint);

    /* --- rendering ---------------------------------------------------------- */
    function renderHud() {
      chipsEl.textContent = t("lngCount", { n: dig ? dig.total : 0 });
      readEl.textContent = t("lngCount", { n: opened });
      glossEl.textContent = t("lngSetCount", {
        n: gloss.filter(function (v) { return !!v; }).length, max: gloss.length,
      });
      var set = 0;
      for (var i = 0; i < cards.length; i += 1) {
        if (picks[cards[i].kind]) { set += 1; }
      }
      ruleEl.textContent = t("lngSetCount", { n: set, max: cards.length });
    }

    function refreshPicker() {
      fillCampaignPicker(levelSel, campaign, function (def) { return t(def.labelKey); }, t("elementsLocked"));
      levelSel.value = level.id;
      bestEl.textContent = t("campaignStars", { n: campaign.totalStars(), max: campaign.maxStars() });
    }

    function syncChip(index) {
      var clue = dig && dig.clues[index];
      var btn = chipBtns[index];
      if (!clue || !btn) { return; }
      var on = !!revealed[index];
      btn.textContent = on ? t("lngChipOpen", { n: clue.n }) : t("lngChipSealed", { n: clue.n });
      btn.className = on ? "lng-chip lng-chip-open" : "lng-chip";
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      chipTexts[index].textContent = on ? t("lngChipStem", { n: clue.n, s: lngSentenceOf(dig, clue.prop) }) : "";
      chipLines[index].textContent = on ? lngSay(clue.tokens) : "";
    }

    function syncRules() {
      for (var c = 0; c < cards.length; c += 1) {
        var list = ruleBtns[cards[c].kind] || [];
        for (var i = 0; i < list.length; i += 1) {
          var on = picks[cards[c].kind] === list[i].optId;
          list[i].textContent = (on ? "\u2713 " : "") + t(list[i].optKey);
          list[i].className = on ? "lng-ruleopt lng-ruleopt-on" : "lng-ruleopt";
          list[i].setAttribute("aria-pressed", on ? "true" : "false");
        }
      }
    }

    function syncItem(index) {
      var btns = itemBtns[index] || [];
      for (var i = 0; i < btns.length; i += 1) {
        var on = answers[index] === i;
        btns[i].textContent = (on ? "\u2713 " : "") + btns[i].baseText;
        btns[i].className = on ? "lng-itemopt lng-itemopt-on" : "lng-itemopt";
        btns[i].setAttribute("aria-pressed", on ? "true" : "false");
      }
    }

    function makeChip(index) {
      var textEl = lngEl("p", "lng-scene-text");
      var lineEl = lngEl("p", "lng-scene-mark");
      var why = lngEl("p", "lng-why");
      var btn = lngPress("lng-chip", "", function () { openChip(index); });
      btn.addEventListener("focus", function () { active = index; });
      chipBtns[index] = btn;
      chipTexts[index] = textEl;
      chipLines[index] = lineEl;
      chipWhy[index] = why;
      scenesEl.appendChild(lngAdd(lngEl("div", "lng-slot"), btn,
        lngAdd(lngEl("div", "lng-scene"), textEl, lineEl), why));
      syncChip(index);
    }

    function makeWordRow(index) {
      var row = dig.rows[index];
      var label = lngEl("label", "lng-word", row.root);
      label.setAttribute("for", "lngGloss" + index);
      var sel = lngEl("select", "lng-gloss elements-select");
      sel.id = "lngGloss" + index;
      sel.setAttribute("aria-label", t("lngGlossAria"));
      var blank = lngEl("option", "", t("lngGlossUnset"));
      blank.value = "";
      sel.appendChild(blank);
      for (var k = 0; k < dig.lexemes.length; k += 1) {
        var opt = lngEl("option", "", lngNameOf(dig, dig.lexemes[k].key, "one"));
        opt.value = dig.lexemes[k].key;
        sel.appendChild(opt);
      }
      sel.addEventListener("change", function () { setWord(index, sel.value); });
      var why = lngEl("p", "lng-why");
      wordSels[index] = sel;
      wordWhy[index] = why;
      sel.value = gloss[index] || "";
      glossList.appendChild(lngAdd(lngEl("p", "lng-word-row"), label, sel, why));
    }

    function makeRuleCard(kind, titleKey, opts) {
      var host = lngEl("div", "lng-ruleopts");
      for (var i = 0; i < opts.length; i += 1) {
        var btn = lngPress("lng-ruleopt", t(opts[i].key), (function (id) {
          return function () { pickRule(kind, id); };
        })(opts[i].id));
        btn.optId = opts[i].id;
        btn.optKey = opts[i].key;
        host.appendChild(btn);
        ruleBtns[kind].push(btn);
      }
      var why = lngEl("p", "lng-why");
      ruleWhy[kind] = why;
      cards.push({ kind: kind });
      grammarList.appendChild(lngAdd(lngEl("div", "lng-rule"),
        lngI18n("p", "lng-rule-title", titleKey), host, why));
    }

    function makeItem(index) {
      var item = dig.test[index];
      var host = lngEl("div", "lng-itemopts");
      itemBtns[index] = [];
      for (var i = 0; i < item.options.length; i += 1) {
        var label = (i + 1) + ". " + lngSay(item.options[i]);
        var btn = lngPress("lng-itemopt", label, (function (slot) {
          return function () { pickItem(index, slot); };
        })(i));
        btn.baseText = label;
        host.appendChild(btn);
        itemBtns[index].push(btn);
      }
      var why = lngEl("p", "lng-why");
      itemWhy[index] = why;
      testList.appendChild(lngAdd(lngEl("div", "lng-item"),
        lngEl("p", "lng-item-text", t("lngWallStem", { n: index + 1, s: lngSentenceOf(dig, item.prop) })),
        host, why));
      syncItem(index);
    }

    function markCards(ids) {
      return lngMarks.filter(function (m) { return ids.indexOf(m.id) !== -1; });
    }

    function emptyBench() {
      while (scenesEl.childNodes.length > 1) { scenesEl.removeChild(scenesEl.lastChild); }
      glossList.textContent = "";
      grammarList.textContent = "";
      testList.textContent = "";
      chipBtns = [];
      chipTexts = [];
      chipLines = [];
      chipWhy = [];
      wordSels = [];
      wordWhy = [];
      ruleBtns = { order: [], mark: [] };
      ruleWhy = { order: null, mark: null };
      itemBtns = [];
      itemWhy = [];
      cards = [];
    }

    function buildDig() {
      legend.textContent = dig.mark === "none" ? t("lngLegendPlain") : t("lngLegend");
      for (var i = 0; i < dig.clues.length; i += 1) { makeChip(i); }
      for (i = 0; i < dig.rows.length; i += 1) { makeWordRow(i); }
      /* A dialect that carves no mark has one rule to state, not two. */
      if (dig.marks.length > 1 || dig.marks[0] !== "none") {
        makeRuleCard("order", "lngOrderTitle", lngOrders);
        makeRuleCard("mark", "lngMarkTitle", markCards(dig.marks));
      } else {
        makeRuleCard("order", "lngOrderTitleOne", lngOrders);
      }
      for (i = 0; i < dig.test.length; i += 1) { makeItem(i); }
    }

    /* --- play ---------------------------------------------------------------- */
    function openChip(index) {
      if (!dig || !dig.clues[index] || revealed[index]) { return; }
      revealed[index] = true;
      opened += 1;
      active = index;
      syncChip(index);
      renderHud();
    }

    function setWord(index, key) {
      if (!dig || !dig.rows[index] || !dig.byKey[key]) { return; }
      gloss[index] = key;
      renderHud();
    }

    function pickRule(kind, id) {
      if (!dig || (kind !== "order" && kind !== "mark")) { return; }
      picks[kind] = picks[kind] === id ? "" : id;
      syncRules();
      renderHud();
    }

    function pickItem(index, slot) {
      if (!dig || !dig.test[index] || slot < 0 || slot >= dig.test[index].options.length) { return; }
      active = index;
      answers[index] = slot;
      syncItem(index);
      renderHud();
    }

    function sayWhy(el, text, bad) {
      if (!el) { return; }
      el.textContent = text;
      el.className = bad ? "lng-why lng-why-bad" : "lng-why lng-why-ok";
    }

    function clearWhy() {
      var groups = [chipWhy, wordWhy, itemWhy];
      for (var g = 0; g < groups.length; g += 1) {
        for (var i = 0; i < groups[g].length; i += 1) { sayWhy(groups[g][i], "", false); }
      }
      sayWhy(ruleWhy.order, "", false);
      sayWhy(ruleWhy.mark, "", false);
    }

    /* A wrong rule is answered with the rubbing that refutes it, quoted in the
     * player's own words. */
    function ruleMessage(orderKey, markKey) {
      var diff = lngRuleDiff(dig, orderKey, markKey);
      if (!diff) { return t("lngRuleOk"); }
      if (diff.kind === "clash") {
        return t("lngWhyOrder", { g: diff.g, r1: diff.r1, n1: diff.n1, w1: diff.w1,
          r2: diff.r2, n2: diff.n2, w2: diff.w2 });
      }
      if (diff.kind === "dup") {
        return t("lngWhyDup", { a: diff.a, b: diff.b, w: diff.w, n1: diff.n1, n2: diff.n2 });
      }
      if (diff.kind === "count") {
        return t("lngWhyCount", { n: diff.n, pred: diff.pred, truth: diff.truth });
      }
      var guess = lngById(lngMarks, markKey);
      return t("lngWhyMark", { n: diff.n, g: diff.g, truth: diff.truth,
        guess: guess && guess.short ? t(guess.short) : t("lngMarkNone") });
    }

    function submitWork() {
      if (!dig) { result.textContent = t("lngNoDig"); return; }
      if (done) { result.textContent = t("lngAlready"); return; }
      clearWhy();
      var i;
      var blankWords = gloss.filter(function (v) { return !v; }).length;
      var blankRules = 0;
      for (i = 0; i < cards.length; i += 1) {
        if (!picks[cards[i].kind]) { blankRules += 1; }
      }
      var blankItems = answers.filter(function (v) { return !(v >= 0); }).length;
      var missing = [];
      if (blankWords) { missing.push(t("lngMissGloss", { n: blankWords, max: gloss.length })); }
      if (blankRules) { missing.push(t("lngMissRule", { n: blankRules, max: cards.length })); }
      if (blankItems) { missing.push(t("lngMissItem", { n: blankItems, max: answers.length })); }
      if (missing.length) {
        result.textContent = t("lngNeedMore") + " " + missing.join(" \u00b7 ");
        return;
      }

      /* Two carved words cannot name the same thing: the lexicon is one-to-one. */
      var owner = {};
      var clash = null;
      for (i = 0; i < dig.rows.length; i += 1) {
        var key = gloss[i];
        if (owner[key]) { clash = { a: owner[key], b: dig.rows[i].root, c: lngNameOf(dig, key, "one") }; break; }
        owner[key] = dig.rows[i].root;
      }
      if (clash) { result.textContent = t("lngDup", clash); return; }

      var wrong = 0;
      for (i = 0; i < dig.rows.length; i += 1) {
        var row = dig.rows[i];
        var pin = dig.pin[row.root];
        if (gloss[i] === row.key) {
          sayWhy(wordWhy[i], t("lngWordOk", { m: lngNameOf(dig, row.key, "one") }), false);
          continue;
        }
        wrong += 1;
        sayWhy(wordWhy[i], pin
          ? t("lngWhyGloss", { n: pin.n, g: row.root, role: t(lngRoleKeys[pin.role]),
              truth: lngNameOf(dig, pin.lex, "one"), mine: lngNameOf(dig, gloss[i], "one") })
          : t("lngWhyNoPin", { g: row.root, mine: lngNameOf(dig, gloss[i], "one") }), true);
      }

      var ruleWrong = 0;
      if (picks.order !== dig.order.id) {
        ruleWrong += 1;
        sayWhy(ruleWhy.order, ruleMessage(picks.order, dig.mark), true);
      } else {
        sayWhy(ruleWhy.order, t("lngRuleOk"), false);
      }
      if (cards.length > 1) {
        ruleWrong += picks.mark === dig.mark ? 0 : 1;
        sayWhy(ruleWhy.mark, picks.mark === dig.mark ? t("lngRuleOk") : ruleMessage(dig.order.id, picks.mark),
          picks.mark !== dig.mark);
      }

      var itemWrong = 0;
      for (i = 0; i < dig.test.length; i += 1) {
        var item = dig.test[i];
        if (answers[i] === item.correct) {
          sayWhy(itemWhy[i], t("lngWordOk", { m: lngSay(item.target) }), false);
          continue;
        }
        itemWrong += 1;
        sayWhy(itemWhy[i], t("lngWhyItem", { n: i + 1,
          pred: lngOptionReading(dig, item.options[answers[i]] || item.options[0]),
          stem: lngSentenceOf(dig, item.prop) }), true);
      }

      if (!wrong && !ruleWrong && !itemWrong) { winDig(); return; }
      result.textContent = t("lngMissed", { w: wrong, wm: gloss.length, r: ruleWrong, rm: cards.length,
        i: itemWrong, im: dig.test.length });
    }

    function winDig() {
      done = true;
      var starsWon = starsFor(opened, lngThresholds(dig), "low");
      var outcome = campaign.record(level.id, { stars: starsWon, best: opened, better: "low" });
      var message = t("lngReadOk", { n: opened, s: starsWon, need: dig.need });
      if (outcome.isBest) { message += " " + t("newBest"); }
      if (outcome.unlockedNext) { message += " " + t("lngNextChamber"); }
      else if (campaign.clearedCount() === lngLevels.length) { message += " " + t("lngCampaignDone"); }
      result.textContent = message;
      logAction(t("logLostLanguage", { h: t(level.labelKey), n: opened }));
      var rect = checkBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      refreshPicker();
    }

    function loadDig() {
      var next = null;
      for (var guard = 0; guard < 40 && !next; guard += 1) {
        seed += 1;
        next = lngGenerate(level, seed);
      }
      dig = next;
      gloss = [];
      answers = [];
      revealed = [];
      picks = { order: "", mark: "" };
      opened = 0;
      done = false;
      active = 0;
      emptyBench();
      clearWhy();
      if (!dig) {
        result.textContent = t("lngNoDig");
        renderHud();
        return;
      }
      for (var i = 0; i < dig.rows.length; i += 1) { gloss.push(""); }
      for (i = 0; i < dig.clues.length; i += 1) { revealed.push(false); }
      for (i = 0; i < dig.test.length; i += 1) { answers.push(-1); }
      buildDig();
      renderHud();
      result.textContent = t("lngPrompt", { h: t(level.labelKey), n: dig.total, w: dig.test.length,
        need: dig.need, budget: dig.budget });
    }

    /* --- keyboard path ------------------------------------------------------ */
    function focusIn(list, index) {
      var el = list && list[index];
      if (el && typeof el.focus === "function") { el.focus(); }
    }

    function stepOf(event) {
      return { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
    }

    scenesEl.addEventListener("keydown", function (event) {
      if (!dig || event.altKey || event.ctrlKey || event.metaKey) { return; }
      var step = stepOf(event);
      if (typeof step !== "number" || !chipBtns.length) { return; }
      event.preventDefault();
      active = (active + step + chipBtns.length) % chipBtns.length;
      focusIn(chipBtns, active);
    });

    testList.addEventListener("keydown", function (event) {
      if (!dig || event.altKey || event.ctrlKey || event.metaKey) { return; }
      var step = stepOf(event);
      if (typeof step === "number" && itemBtns.length) {
        event.preventDefault();
        active = (active + step + itemBtns.length) % itemBtns.length;
        focusIn(itemBtns[active], 0);
        return;
      }
      var slots = { "1": 0, "2": 1, "3": 2 };
      if (typeof slots[event.key] === "number" && itemBtns[active]) {
        event.preventDefault();
        pickItem(active, slots[event.key]);
      }
    });

    grammarList.addEventListener("keydown", function (event) {
      if (!dig || event.altKey || event.ctrlKey || event.metaKey) { return; }
      var step = stepOf(event);
      if (typeof step !== "number") { return; }
      var list = [];
      for (var c = 0; c < cards.length; c += 1) { list = list.concat(ruleBtns[cards[c].kind] || []); }
      var at = lngIndexOf(list, event.target);
      if (at < 0) { return; }
      event.preventDefault();
      focusIn(list, (at + step + list.length) % list.length);
    });

    levelSel.addEventListener("change", function () {
      var index = campaign.indexOf(levelSel.value);
      if (index >= 0 && campaign.isUnlocked(levelSel.value)) {
        level = lngLevels[index];
        loadDig();
      } else {
        levelSel.value = level.id;
      }
    });

    refreshPicker();
    loadDig();
  }

  /* Bilingual copy travels with the game: addStrings only fills keys i18n.js does
   * not already own, so the shared dictionary stays authoritative. */
  App.addStrings({
    en: {
      "tabLostLanguage": "Lost Language",
      "lngChamber1": "Doorway Stones", "lngChamber2": "Kiln Wall", "lngChamber3": "Harbour Steps",
      "lngChamber4": "Hall of Marks", "lngChamber5": "The Sealed Chamber",
      "lngChamber6": "Salt Vault", "lngChamber7": "Obsidian Gallery",
      "lngChamber8": "Processional Way", "lngChamber9": "Hall of Counts",
      "lngChamber10": "The Scribe's Tomb",
      "lngChipsLabel": "Rubbings", "lngReadLabel": "Read", "lngGlossLabel": "Glosses",
      "lngRulesLabel": "Rules", "lngCount": "{n}", "lngSetCount": "{n}/{max}",
      "lngLevelSelectLabel": "Choose a chamber",
      "lngScenesAria": "Wall rubbings: the picture and its inscription",
      "lngLegend": "Every line is three words: the one acting, the one acted on, and the action. The mark ka- rides on one of them and means something - both rules are yours to find.",
      "lngLegendPlain": "Every line is three words: the one acting, the one acted on, and the action. Nothing is marked here, so the order alone is all the grammar this dialect has.",
      "lngChipSealed": "Rubbing {n} - not read yet. Press to see the picture.",
      "lngChipOpen": "Rubbing {n} - read", "lngChipStem": "The picture shows: {s}",
      "lngNoteTitle": "Hypothesis notebook", "lngGlossTitle": "1 - What the words mean",
      "lngGrammarTitle": "2 - The rules", "lngTestTitle": "3 - Translation test",
      "lngGlossAria": "Choose the meaning you think this word carries", "lngGlossUnset": "choose a meaning",
      "lngOrderTitle": "Rule 1 - where the three words stand",
      "lngOrderTitleOne": "The rule - where the three words stand",
      "lngMarkTitle": "Rule 2 - what the mark ka- does",
      "lngOrderAPV": "Doer first, then the one acted on, and the action last.",
      "lngOrderPAV": "The one acted on comes first, then the doer, and the action last.",
      "lngOrderVAP": "The action opens the line, then the doer, then the one acted on.",
      "lngOrderVPA": "The action opens the line, then the one acted on, then the doer.",
      "lngOrderAVP": "The doer opens, then the action, then the one acted on.",
      "lngOrderPVA": "The one acted on opens, then the action, then the doer.",
      "lngMarkMany": "ka- means more than one: it rides on whichever word is many.",
      "lngMarkDoer": "ka- flags the doer: it rides on the word for the one acting.",
      "lngMarkObject": "ka- flags the one acted on: it rides on that word.",
      "lngMarkDone": "ka- rides on the action word and says the act is finished.",
      "lngMarkNone": "This dialect carves no mark at all.",
      "lngMarkManyShort": "more than one", "lngMarkDoerShort": "the doer",
      "lngMarkObjectShort": "the one acted on", "lngMarkDoneShort": "a finished act",
      "lngRoleA": "the one acting", "lngRoleP": "the one acted on", "lngRoleV": "the action",
      "lngSentence": "{a} {v} {p}.", "lngWallStem": "Unseen wall {n}: {s}",
      "lngBtnCheck": "Submit the reading", "lngBtnNew": "New dig",
      "lngPrompt": "{h}: {n} rubbings on the bench, {w} unseen walls in the test. {need} rubbings decide this dialect; working down the bench in order costs {budget}.",
      "lngNoDig": "The survey came back with nothing legible - press New dig.",
      "lngAlready": "This dialect is read - press New dig or pick another chamber.",
      "lngNeedMore": "Not ready to submit:", "lngWordOk": "agrees: {m}",
      "lngRuleOk": "agrees with every rubbing",
      "lngMissGloss": "{n}/{max} words have no gloss", "lngMissRule": "{n}/{max} rules have no guess",
      "lngMissItem": "{n}/{max} walls are unanswered",
      "lngDup": "Two carved words cannot mean one thing: \u27e8{a}\u27e9 and \u27e8{b}\u27e9 both say {c}.",
      "lngWhyGloss": "Rubbing {n}: \u27e8{g}\u27e9 is the word for {role} there, and that picture shows {truth} as {role} - not {mine}.",
      "lngWhyNoPin": "\u27e8{g}\u27e9 is never carved on the bench, so nothing can confirm {mine}.",
      "lngWhyOrder": "Your rule 1 reads \u27e8{g}\u27e9 as {r1} in rubbing {n1}, where the picture names {w1}, but as {r2} in rubbing {n2}, where it names {w2} - one word cannot mean two things.",
      "lngWhyDup": "Your rule 1 makes \u27e8{a}\u27e9 and \u27e8{b}\u27e9 both mean {w}: rubbing {n1} and rubbing {n2} put them in the same place. Two carved words cannot mean one thing.",
      "lngWhyCount": "Rubbing {n}: your rule 2 reads that as '{pred}', but the picture shows '{truth}'.",
      "lngWhyMark": "Rubbing {n}: \u27e8{g}\u27e9 and the mark ka- do not fit your rule 2 ('{guess}') - that picture shows '{truth}'.",
      "lngWhyItem": "Wall {n}: that line reads '{pred}', while the wall shows '{stem}'.",
      "lngUnreadable": "{line} is not a line this dialect writes",
      "lngMissed": "Still out: {w}/{wm} words, {r}/{rm} rules, {i}/{im} walls - every one names its counterexample.",
      "lngReadOk": "Read in {n} rubbings - {s} stars. The minimal bench was {need}.",
      "lngNextChamber": "Next chamber open.", "lngCampaignDone": "Every chamber read.",
      "lngHint": "Find the word that stands in the same place in every line first - that is the action, and the other two slots are the doer and the acted-on.",
      "logLostLanguage": "Read {h} in {n} rubbings",
    },
    zh: {
      "tabLostLanguage": "\u5931\u4f20\u7684\u8bed\u8a00",
      "lngChamber1": "\u95e8\u6963\u77f3", "lngChamber2": "\u7a91\u5899", "lngChamber3": "\u7801\u5934\u77f3\u9636",
      "lngChamber4": "\u8bb0\u53f7\u5927\u5385", "lngChamber5": "\u5c01\u6b7b\u7684\u5bc6\u5ba4",
      "lngChamber6": "\u76d0\u7a96", "lngChamber7": "\u9ed1\u66dc\u77f3\u957f\u5eca",
      "lngChamber8": "\u4eea\u4ed7\u5927\u9053", "lngChamber9": "\u8ba1\u6570\u5927\u5385",
      "lngChamber10": "\u4e66\u540f\u4e4b\u5893",
      "lngChipsLabel": "\u62d3\u7247", "lngReadLabel": "\u5df2\u8bfb", "lngGlossLabel": "\u8bcd\u4e49",
      "lngRulesLabel": "\u8bed\u6cd5", "lngCount": "{n}", "lngSetCount": "{n}/{max}",
      "lngLevelSelectLabel": "\u9009\u62e9\u77f3\u5ba4",
      "lngScenesAria": "\u5899\u9762\u62d3\u7247\uff1a\u753b\u9762\u8bf4\u660e\u4e0e\u5176\u94ed\u6587",
      "lngLegend": "\u6bcf\u53e5\u94ed\u6587\u90fd\u662f\u4e09\u4e2a\u8bcd\uff1a\u65bd\u52a8\u8005\u3001\u53d7\u52a8\u8005\u3001\u52a8\u4f5c\u3002\u8bb0\u53f7 ka- \u9644\u7740\u5728\u67d0\u4e2a\u8bcd\u4e0a\uff0c\u5fc5\u6709\u5176\u7528\u5904\u2014\u2014\u4e24\u6761\u89c4\u5219\u90fd\u8981\u4f60\u6765\u627e\u3002",
      "lngLegendPlain": "\u6bcf\u53e5\u94ed\u6587\u90fd\u662f\u4e09\u4e2a\u8bcd\uff1a\u65bd\u52a8\u8005\u3001\u53d7\u52a8\u8005\u3001\u52a8\u4f5c\u3002\u8fd9\u91cc\u7684\u77f3\u5934\u4e0a\u6ca1\u6709\u8bb0\u53f7\uff0c\u6240\u4ee5\u8bed\u5e8f\u5c31\u662f\u8fd9\u79cd\u65b9\u8a00\u5168\u90e8\u7684\u8bed\u6cd5\u3002",
      "lngChipSealed": "\u7b2c {n} \u53f7\u62d3\u7247\u2014\u2014\u5c1a\u672a\u5c55\u5f00\uff0c\u6309\u4e0b\u770b\u56fe\u3002",
      "lngChipOpen": "\u7b2c {n} \u53f7\u62d3\u7247\u2014\u2014\u5df2\u8bfb", "lngChipStem": "\u753b\u9762\u6240\u7ed8\uff1a{s}",
      "lngNoteTitle": "\u63a8\u6d4b\u7b14\u8bb0", "lngGlossTitle": "\u4e00\u2014\u2014\u8bcd\u7684\u610f\u601d",
      "lngGrammarTitle": "\u4e8c\u2014\u2014\u89c4\u5219", "lngTestTitle": "\u4e09\u2014\u2014\u7ffb\u8bd1\u6d4b\u8bd5",
      "lngGlossAria": "\u4e3a\u8fd9\u4e2a\u8bcd\u9009\u4e00\u4e2a\u4f60\u8ba4\u4e3a\u7684\u542b\u4e49", "lngGlossUnset": "\u9009\u4e00\u4e2a\u542b\u4e49",
      "lngOrderTitle": "\u89c4\u5219\u4e00\u2014\u2014\u4e09\u4e2a\u8bcd\u5404\u7ad9\u54ea\u91cc",
      "lngOrderTitleOne": "\u89c4\u5219\u2014\u2014\u4e09\u4e2a\u8bcd\u5404\u7ad9\u54ea\u91cc",
      "lngMarkTitle": "\u89c4\u5219\u4e8c\u2014\u2014\u8bb0\u53f7 ka- \u6709\u4f55\u7528\u5904",
      "lngOrderAPV": "\u65bd\u52a8\u8005\u5728\u524d\uff0c\u53d7\u52a8\u8005\u6b21\u4e4b\uff0c\u52a8\u4f5c\u6700\u540e\u3002",
      "lngOrderPAV": "\u53d7\u52a8\u8005\u5728\u524d\uff0c\u65bd\u52a8\u8005\u6b21\u4e4b\uff0c\u52a8\u4f5c\u6700\u540e\u3002",
      "lngOrderVAP": "\u52a8\u4f5c\u5f00\u5934\uff0c\u63a5\u7740\u65bd\u52a8\u8005\uff0c\u518d\u63a5\u7740\u53d7\u52a8\u8005\u3002",
      "lngOrderVPA": "\u52a8\u4f5c\u5f00\u5934\uff0c\u63a5\u7740\u53d7\u52a8\u8005\uff0c\u518d\u63a5\u7740\u65bd\u52a8\u8005\u3002",
      "lngOrderAVP": "\u65bd\u52a8\u8005\u5f00\u5934\uff0c\u63a5\u7740\u52a8\u4f5c\uff0c\u518d\u63a5\u7740\u53d7\u52a8\u8005\u3002",
      "lngOrderPVA": "\u53d7\u52a8\u8005\u5f00\u5934\uff0c\u63a5\u7740\u52a8\u4f5c\uff0c\u518d\u63a5\u7740\u65bd\u52a8\u8005\u3002",
      "lngMarkMany": "ka- \u8868\u793a\u4e0d\u6b62\u4e00\u4e2a\uff1a\u5b83\u9644\u7740\u5728\u90a3\u4e2a\u8868\u793a\u591a\u6570\u7684\u8bcd\u4e0a\u3002",
      "lngMarkDoer": "ka- \u6807\u51fa\u65bd\u52a8\u8005\uff1a\u5b83\u4e00\u5b9a\u9644\u5728\u65bd\u52a8\u8005\u7684\u8bcd\u4e0a\u3002",
      "lngMarkObject": "ka- \u6807\u51fa\u53d7\u52a8\u8005\uff1a\u5b83\u4e00\u5b9a\u9644\u5728\u53d7\u52a8\u8005\u7684\u8bcd\u4e0a\u3002",
      "lngMarkDone": "ka- \u9644\u5728\u52a8\u4f5c\u4e0a\uff0c\u8868\u793a\u8fd9\u4ef6\u4e8b\u5df2\u7ecf\u5b8c\u6210\u3002",
      "lngMarkNone": "\u8fd9\u79cd\u65b9\u8a00\u6839\u672c\u4e0d\u4f7f\u7528\u8bb0\u53f7\u3002",
      "lngMarkManyShort": "\u4e0d\u6b62\u4e00\u4e2a", "lngMarkDoerShort": "\u65bd\u52a8\u8005",
      "lngMarkObjectShort": "\u53d7\u52a8\u8005", "lngMarkDoneShort": "\u5df2\u5b8c\u6210\u7684\u52a8\u4f5c",
      "lngRoleA": "\u65bd\u52a8\u8005", "lngRoleP": "\u53d7\u52a8\u8005", "lngRoleV": "\u52a8\u4f5c",
      "lngSentence": "{a}{v}{p}\u3002", "lngWallStem": "\u672a\u89c1\u4e4b\u5899 {n}\uff1a{s}",
      "lngBtnCheck": "\u63d0\u4ea4\u89e3\u8bfb", "lngBtnNew": "\u91cd\u65b0\u53d1\u6398",
      "lngPrompt": "{h}\uff1a\u6848\u4e0a\u6709 {n} \u5f20\u62d3\u7247\uff0c\u6d4b\u8bd5\u91cc\u6709 {w} \u9762\u672a\u89c1\u8fc7\u7684\u5899\u3002\u5224\u5b9a\u8fd9\u79cd\u65b9\u8a00\u53ea\u9700 {need} \u5f20\uff1b\u6309\u987a\u5e8f\u901a\u8bfb\u4e00\u904d\u8981\u82b1 {budget} \u5f20\u3002",
      "lngNoDig": "\u52d8\u5bdf\u961f\u6ca1\u5e26\u56de\u80fd\u8fa8\u8ba4\u7684\u5899\u9762\u2014\u2014\u8bf7\u6309\u300c\u91cd\u65b0\u53d1\u6398\u300d\u3002",
      "lngAlready": "\u8fd9\u79cd\u65b9\u8a00\u5df2\u7ecf\u8bfb\u901a\u4e86\u2014\u2014\u8bf7\u91cd\u65b0\u53d1\u6398\u6216\u53e6\u9009\u77f3\u5ba4\u3002",
      "lngNeedMore": "\u8fd8\u4e0d\u80fd\u63d0\u4ea4\uff1a", "lngWordOk": "\u4e0e\u62d3\u7247\u76f8\u7b26\uff1a{m}",
      "lngRuleOk": "\u4e0e\u6bcf\u5f20\u62d3\u7247\u90fd\u76f8\u7b26",
      "lngMissGloss": "{n}/{max} \u4e2a\u8bcd\u6ca1\u586b\u542b\u4e49", "lngMissRule": "{n}/{max} \u6761\u89c4\u5219\u6ca1\u9009\u63a8\u6d4b",
      "lngMissItem": "{n}/{max} \u9762\u5899\u6ca1\u4f5c\u7b54",
      "lngDup": "\u4e24\u4e2a\u96d5\u523b\u7684\u8bcd\u4e0d\u53ef\u80fd\u540c\u4e49\uff1a\u27e8{a}\u27e9 \u548c \u27e8{b}\u27e9 \u90fd\u5199\u6210\u4e86{c}\u3002",
      "lngWhyGloss": "\u7b2c {n} \u53f7\u62d3\u7247\uff1a\u90a3\u91cc \u27e8{g}\u27e9 \u662f{role}\u7684\u8bcd\uff0c\u800c\u753b\u9762\u663e\u793a{role}\u662f{truth}\uff0c\u4e0d\u662f{mine}\u3002",
      "lngWhyNoPin": "\u27e8{g}\u27e9 \u4ece\u672a\u51fa\u73b0\u5728\u6848\u4e0a\u7684\u62d3\u7247\u91cc\uff0c\u6240\u4ee5{mine}\u65e0\u4ece\u8bc1\u5b9e\u3002",
      "lngWhyOrder": "\u4f60\u7684\u89c4\u5219\u4e00\u628a \u27e8{g}\u27e9 \u8bfb\u4f5c\u7b2c {n1} \u53f7\u62d3\u7247\u91cc\u7684{r1}\uff0c\u53ef\u90a3\u5f20\u753b\u9762\u5199\u7684\u662f{w1}\uff1b\u5230\u7b2c {n2} \u53f7\u62d3\u7247\u91cc\u4f60\u53c8\u628a\u5b83\u8bfb\u4f5c{r2}\uff0c\u753b\u9762\u5199\u7684\u5374\u662f{w2}\u2014\u2014\u4e00\u4e2a\u8bcd\u4e0d\u53ef\u80fd\u6709\u4e24\u4e2a\u610f\u601d\u3002",
      "lngWhyDup": "\u4f60\u7684\u89c4\u5219\u4e00\u8ba9 \u27e8{a}\u27e9 \u548c \u27e8{b}\u27e9 \u90fd\u6210\u4e86{w}\uff1a\u7b2c {n1} \u53f7\u4e0e\u7b2c {n2} \u53f7\u62d3\u7247\u628a\u5b83\u4eec\u6446\u5728\u540c\u4e00\u4e2a\u4f4d\u7f6e\u3002\u4e24\u4e2a\u96d5\u523b\u7684\u8bcd\u4e0d\u53ef\u80fd\u540c\u4e49\u3002",
      "lngWhyCount": "\u7b2c {n} \u53f7\u62d3\u7247\uff1a\u6309\u4f60\u7684\u89c4\u5219\u4e8c\uff0c\u90a3\u53e5\u8bfb\u4f5c\u201c{pred}\u201d\uff0c\u53ef\u753b\u9762\u663e\u793a\u7684\u662f\u201c{truth}\u201d\u3002",
      "lngWhyMark": "\u7b2c {n} \u53f7\u62d3\u7247\uff1a\u27e8{g}\u27e9 \u4e0e\u8bb0\u53f7 ka- \u5bf9\u4e0d\u4e0a\u4f60\u7684\u89c4\u5219\u4e8c\uff08\u201c{guess}\u201d\uff09\u2014\u2014\u90a3\u5f20\u753b\u9762\u663e\u793a\u7684\u662f\u201c{truth}\u201d\u3002",
      "lngWhyItem": "\u7b2c {n} \u9762\u5899\uff1a\u90a3\u53e5\u94ed\u6587\u8bfb\u4f5c\u201c{pred}\u201d\uff0c\u800c\u5899\u4e0a\u753b\u7684\u662f\u201c{stem}\u201d\u3002",
      "lngUnreadable": "{line} \u4e0d\u662f\u8fd9\u79cd\u65b9\u8a00\u4f1a\u5199\u7684\u53e5\u5b50",
      "lngMissed": "\u4ecd\u6709\u51fa\u5165\uff1a\u8bcd\u4e49 {w}/{wm}\uff0c\u89c4\u5219 {r}/{rm}\uff0c\u5899\u9762 {i}/{im}\u2014\u2014\u6bcf\u4e00\u5904\u90fd\u70b9\u540d\u4e86\u53cd\u4f8b\u3002",
      "lngReadOk": "\u8bfb\u4e86 {n} \u5f20\u62d3\u7247\u4fbf\u8bfb\u901a\u4e86\u2014\u2014\u83b7\u5f97 {s} \u661f\u3002\u6700\u5c11\u53ea\u9700 {need} \u5f20\u3002",
      "lngNextChamber": "\u4e0b\u4e00\u95f4\u77f3\u5ba4\u5df2\u6253\u5f00\u3002", "lngCampaignDone": "\u6240\u6709\u77f3\u5ba4\u90fd\u5df2\u8bfb\u901a\u3002",
      "lngHint": "\u5148\u5728\u6bcf\u5f20\u62d3\u7247\u91cc\u627e\u90a3\u4e2a\u4f4d\u7f6e\u4ece\u4e0d\u53d8\u5316\u7684\u8bcd\u2014\u2014\u5b83\u5c31\u662f\u52a8\u4f5c\uff0c\u4f59\u4e0b\u4e24\u4e2a\u4f4d\u7f6e\u5206\u522b\u662f\u65bd\u52a8\u8005\u4e0e\u53d7\u52a8\u8005\u3002",
      "logLostLanguage": "\u7528 {n} \u5f20\u62d3\u7247\u8bfb\u901a\u4e86{h}",
    },
  });

  App.registerGame({
    name: "lostLanguage",
    tabKey: "tabLostLanguage",
    init: initLostLanguageGame,
    guide: {
      svg:
        '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="4" y="6" width="60" height="30" rx="4" fill="rgba(30,41,59,.75)" stroke="rgba(148,163,184,.45)"/>' +
        '<text x="10" y="19" font-size="8" fill="#22d3ee">ka\u00b7tal shen mir</text>' +
        '<text x="10" y="30" font-size="7" fill="rgba(226,232,240,.85)">the elder sees \u2026</text>' +
        '<rect x="4" y="41" width="60" height="29" rx="4" fill="rgba(30,41,59,.75)" stroke="rgba(148,163,184,.45)"/>' +
        '<text x="10" y="53" font-size="8" fill="#fbbf24">tal vel ka\u00b7shen</text>' +
        '<text x="10" y="64" font-size="7" fill="rgba(226,232,240,.85)">the fox grips \u2026</text>' +
        '<rect x="70" y="6" width="46" height="64" rx="4" fill="rgba(30,41,59,.75)" stroke="rgba(148,163,184,.45)"/>' +
        '<path d="M76 20h34M76 32h34M76 44h34M76 56h34" stroke="rgba(148,163,184,.4)"/>' +
        '<circle cx="76" cy="20" r="2" fill="#a3e635"/><circle cx="76" cy="44" r="2" fill="#a3e635"/></svg>',
      en: [
        "Aim: work out what the carved words mean and the two rules that glue them, then translate walls nobody has read.",
        "Action: press a rubbing to see the picture and its line, set a gloss for each word in the notebook, and press one statement per rule - press it again to clear it.",
        "Rule: every line is three words - the one acting, the one acted on and the action - and which slot holds which is rule 1.",
        "Rule: the mark ka- rides on one word and always does the same job, whether that job is plurality, the doer or the acted-on. That job is rule 2.",
        "Watch out: the same three words in a different order mean a different picture, so a memorised word list cannot pass the translation test.",
        "Scoring: the panel prints the fewest rubbings that decide the dialect and how far an ordered read must go to prove it the honest way; stopping at that line earns three stars, all but the last rubbing two, the whole bench one - and every wrong guess quotes the rubbing that refutes it.",
      ],
      zh: [
        "\u76ee\u6807\uff1a\u786e\u5b9a\u96d5\u523b\u7684\u8bcd\u662f\u4ec0\u4e48\u610f\u601d\u3001\u4e24\u6761\u8bed\u6cd5\u5982\u4f55\u628a\u5b83\u4eec\u7c98\u5728\u4e00\u8d77\uff0c\u7136\u540e\u7ffb\u8bd1\u4ece\u672a\u88ab\u8bfb\u8fc7\u7684\u5899\u9762\u3002",
        "\u64cd\u4f5c\uff1a\u70b9\u4e00\u5f20\u62d3\u7247\u5c55\u5f00\u753b\u9762\u4e0e\u94ed\u6587\uff1b\u5728\u7b14\u8bb0\u91cc\u7ed9\u6bcf\u4e2a\u8bcd\u9009\u4e00\u4e2a\u542b\u4e49\uff1b\u6bcf\u6761\u89c4\u5219\u70b9\u4e00\u6761\u63a8\u6d4b\uff0c\u518d\u6b21\u70b9\u51fb\u5373\u6e05\u9664\u3002",
        "\u89c4\u5219\u4e00\uff1a\u6bcf\u53e5\u94ed\u6587\u90fd\u662f\u4e09\u4e2a\u8bcd\u2014\u2014\u65bd\u52a8\u8005\u3001\u53d7\u52a8\u8005\u3001\u52a8\u4f5c\uff1b\u54ea\u4e2a\u4f4d\u7f6e\u662f\u54ea\u4e2a\u89d2\u8272\uff0c\u5c31\u662f\u89c4\u5219\u4e00\u3002",
        "\u89c4\u5219\u4e8c\uff1a\u8bb0\u53f7 ka- \u9644\u7740\u5728\u67d0\u4e2a\u8bcd\u4e0a\uff0c\u4e14\u4e0d\u53d8\u5730\u505a\u540c\u4e00\u4ef6\u4e8b\u2014\u2014\u65e0\u8bba\u5b83\u8868\u793a\u7684\u662f\u590d\u6570\u3001\u65bd\u52a8\u8005\u8fd8\u662f\u53d7\u52a8\u8005\uff0c\u8fd9\u5c31\u662f\u89c4\u5219\u4e8c\u3002",
        "\u5c0f\u5fc3\uff1a\u540c\u6837\u7684\u4e09\u4e2a\u8bcd\u6362\u4e2a\u987a\u5e8f\u5c31\u662f\u53e6\u4e00\u5e45\u753b\uff0c\u6240\u4ee5\u53ea\u80cc\u5355\u8bcd\u8fc7\u4e0d\u4e86\u7ffb\u8bd1\u6d4b\u8bd5\u3002",
        "\u8ba1\u5206\uff1a\u9762\u677f\u4f1a\u5199\u660e\u5224\u5b9a\u8fd9\u79cd\u65b9\u8a00\u6700\u5c11\u9700\u8981\u51e0\u5f20\u62d3\u7247\uff0c\u4ee5\u53ca\u6309\u987a\u5e8f\u8003\u636e\u5730\u8bfb\u5230\u7b2c\u51e0\u5f20\u5c31\u80fd\u8bc1\u660e\u5b83\uff1b\u8bfb\u5230\u8be5\u884c\u5c31\u505c\u5f97\u4e09\u661f\uff0c\u53ea\u5269\u6700\u540e\u4e00\u5f20\u672a\u5f00\u5f97\u4e8c\u661f\uff0c\u6574\u684c\u5168\u5f00\u5f97\u4e00\u661f\u2014\u2014\u6bcf\u4e00\u5904\u9519\u90fd\u4f1a\u5ff5\u51fa\u63a8\u7ffb\u5b83\u7684\u90a3\u5f20\u62d3\u7247\u3002",
      ],
    },
  });

  /* Exported for the harness: the solver, the twist proof and the deal. */
  App.initLostLanguageGame = initLostLanguageGame;
  App.tongueLevels = lngLevels;
  App.tongueOrders = lngOrders;
  App.tongueMarks = lngMarks;
  App.tongueGenerate = lngGenerate;
  App.tongueAnalyses = lngAnalyses;
  App.tongueFit = lngFit;
  App.tongueDecode = lngRead;
  App.tongueGlossOnlyFails = lngGlossOnlyFails;
  App.tongueItemHits = lngItemHits;
  App.tongueMinimal = lngMinimal;
  App.tonguePrefixCost = lngPrefixCost;
  App.tongueRuleDiff = lngRuleDiff;
  App.tongueSay = lngSay;
  App.tongueSentence = lngSentenceOf;
  App.tongueThresholds = lngThresholds;
})(window.CapitalConvert = window.CapitalConvert || {});
