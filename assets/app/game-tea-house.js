/* Tea House at Midnight - the social simulation in the shared game drawer.
 * Four recurring guests, three nights, six drinks, a relationship notebook.
 * No cup is good on its own: a pour only settles a guest when it carries what
 * they need tonight and a taste they take, and the very same cup offends the
 * next chair. Every fact about a guest has to be bought with a beat of
 * listening, so pouring blind is a real gamble, and a wrong cup leaves a grudge
 * that changes what that guest accepts on a later night.
 * Turn based: zero timers, no dice outside the seeded deal, and every state
 * change runs through the single resolver App.teaNight - which is also what the
 * recoverability prover and the measured star bands replay through. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  var t = App.t;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  var createCampaign = App.createCampaign;
  var fillCampaignPicker = App.fillCampaignPicker;
  var starsFor = App.starsFor;
  var teaOwn = Object.prototype.hasOwnProperty;
  var teaVarsKnown = ["n", "m", "s", "c", "f", "r", "p", "t", "st", "h", "who", "subj", "obj", "poss", "cup", "need", "take", "cut", "word", "from", "why", "list", "names"];
  var teaNumVars = ["n", "m", "s", "c", "f", "r", "p", "t", "st"];
  var teaSootheScore = 100;
  var teaCutScore = -60;
  var teaRefScore = -20;
  var teaFactScore = 6;
  /* --- the vocabulary: five axes, eleven stated properties ---------------- */
  var teaTokens = {
    green: { en: "unroasted", zh: "生青" },
    dark: { en: "charcoal roast", zh: "炭香" },
    smoke: { en: "smoke dried", zh: "松烟" },
    soft: { en: "mild", zh: "淡薄" },
    bitter: { en: "bitter", zh: "回苦" },
    dry: { en: "no sweetness", zh: "不带甜" },
    sweet: { en: "honeyed", zh: "蜜甜" },
    scalding: { en: "scalding", zh: "滚烫" },
    warm: { en: "warm", zh: "温热" },
    cool: { en: "cool brewed", zh: "凉泡" },
    shared: { en: "one shared pot", zh: "共一壶" }
  };
  /* Six drinks, each stating two or three properties. An axis a cup leaves
   * unstated can neither please nor offend, which is why a plain cup is safe
   * and flat while a showy one is a gamble. */
  var teaDrinks = [
    { id: "dc1", name: { en: "Silver Needle", zh: "白毫针" }, props: ["green", "dry", "scalding"] },
    { id: "dc2", name: { en: "Charcoal Oolong", zh: "炭焙乌龙" }, props: ["dark", "bitter", "warm"] },
    { id: "dc3", name: { en: "Honeyed Rougui", zh: "蜜桂" }, props: ["sweet", "dark", "scalding"] },
    { id: "dc4", name: { en: "Lapsang Ember", zh: "烟小种" }, props: ["smoke", "dry", "shared"] },
    { id: "dc5", name: { en: "Barley Comfort", zh: "麦香茶" }, props: ["sweet", "soft", "warm"] },
    { id: "dc6", name: { en: "Cold Garden", zh: "凉园" }, props: ["green", "bitter", "cool"] }
  ];
  /* A mood is a live need: tonight's cup must carry this token. `n` is the
   * urgency, printed as a digit beside the word everywhere it appears. */
  var teaMoods = {
    chilled: { token: "scalding", n: 3, en: "chilled", zh: "受了寒", tell: { en: "The coat stays on and the hands stay inside it.", zh: "大衣还穿着，手一直缩在袖子里。" } },
    soured: { token: "dry", n: 2, en: "soured", zh: "口腻", tell: { en: "She keeps licking her lips like she swallowed a bad coin.", zh: "她不停地咂嘴，像咽下了一枚坏钱。" } },
    feverish: { token: "green", n: 3, en: "feverish", zh: "上火", tell: { en: "Her neck is red and she will not sit near the stove.", zh: "她脖子是红的，不肯在炉边坐。" } },
    homesick: { token: "shared", n: 1, en: "homesick", zh: "想家", tell: { en: "She sets a second cup out for somebody who is not coming.", zh: "她多摆了一只杯，给不会来的人。" } },
    empty: { token: "sweet", n: 3, en: "empty", zh: "空腹", tell: { en: "Nothing has passed him since the morning carts.", zh: "从早市过去到现在，他一口没吃。" } },
    tired: { token: "warm", n: 2, en: "weary", zh: "乏了", tell: { en: "His shoulders have climbed up to his ears.", zh: "他肩膀一直耸到耳边。" } },
    grieving: { token: "bitter", n: 3, en: "grieving", zh: "居丧", tell: { en: "White cloth on the arm, and no explaining of it.", zh: "臂上缠着白布，也不解释。" } },
    heavy: { token: "dark", n: 2, en: "heavy", zh: "心沉", tell: { en: "He pushes the cup away, then pulls it back.", zh: "杯子推开又拉回，他自己也不明白。" } },
    restless: { token: "cool", n: 1, en: "restless", zh: "烦躁", tell: { en: "He stands up twice before he sits still.", zh: "他站起来两回才坐得住。" } },
    wayfaring: { token: "smoke", n: 2, en: "wayfaring", zh: "赶路", tell: { en: "Road dust still on the boots, and the door left open.", zh: "靴上还是路上的土，门也留着没关。" } }
  };
  /* Rapport bands, each printed as a word and a digit. */
  var teaRapWords = [
    { en: "hostile", zh: "结仇" }, { en: "cold", zh: "冷淡" }, { en: "even", zh: "平常" },
    { en: "warm", zh: "和顺" }, { en: "glad", zh: "欢欣" }, { en: "like family", zh: "如亲" }
  ];
  var teaPro = {
    she: { en: ["she", "her", "her"], zh: ["她", "她", "她的"] },
    he: { en: ["he", "him", "his"], zh: ["他", "他", "他的"] }
  };
  /* --- the four recurring guests -----------------------------------------
   * `likes` stay hidden until heard. `hates` are the standing reputation the
   * whole street knows, so they sit in the notebook from the first seat: only
   * the mood and the tastes are earned with a beat of listening. */
  var teaGuests = [
    {
      id: "kuo", name: { en: "Madam Kuo", zh: "郭婆婆" }, pro: "she",
      likes: ["dry", "green"], hates: ["sweet"], moods: ["chilled", "soured", "feverish", "homesick"],
      facts: [
        { id: "kuo1", kind: "like", token: "dry", path: "listen", en: "She asks for the last steeping, the one with nothing sweet in it.", zh: "她要最后那道水，说不带甜才顺口。" },
        { id: "kuo2", kind: "like", token: "green", path: "converse", en: "Mu says she never takes roasted leaf; her husband sold the green at the north gate.", zh: "穆书办说她从不喝炒过的叶子，当年她先生就在北门卖青的。" }
      ]
    },
    {
      id: "mu", name: { en: "Clerk Mu", zh: "穆书办" }, pro: "he",
      likes: ["sweet", "soft"], hates: ["smoke", "cool"], moods: ["empty", "chilled", "tired"],
      facts: [
        { id: "mu1", kind: "like", token: "sweet", path: "listen", en: "He dips a biscuit in the cup before his first sip.", zh: "头一口之前，他先把饼干在杯里蘸了一下。" },
        { id: "mu2", kind: "like", token: "soft", path: "converse", en: "Kuo says the clerk lies awake, so he will not touch anything harsh.", zh: "郭婆婆说书办夜里睡不着，烈的一律不碰。" }
      ]
    },
    {
      id: "he", name: { en: "Porter He", zh: "老贺" }, pro: "he",
      likes: ["bitter", "dark"], hates: ["sweet", "shared"], moods: ["grieving", "heavy", "restless", "tired"],
      facts: [
        { id: "he1", kind: "like", token: "bitter", path: "listen", en: "He says the bitter one keeps his eyes open on the back stairs.", zh: "他说苦茶能让他下后楼的时候醒着。" },
        { id: "he2", kind: "like", token: "dark", path: "converse", en: "Yun says He grew up under a roast pan and drinks nothing green.", zh: "云姑说他是在炒锅底下长大的，青的一口不喝。" }
      ]
    },
    {
      id: "yun", name: { en: "Peddler Yun", zh: "云姑" }, pro: "she",
      likes: ["smoke", "scalding"], hates: ["sweet", "soft"], moods: ["wayfaring", "chilled", "homesick"],
      facts: [
        { id: "yun1", kind: "like", token: "smoke", path: "listen", en: "She says a smoky cup tells you whether the bed is yours to sleep in.", zh: "她说带烟味的茶能试出一张床睡得睡不得。" },
        { id: "yun2", kind: "like", token: "scalding", path: "converse", en: "He says Yun drinks at a rolling boil and never once flinches.", zh: "老贺说云姑喝茶滚到冒泡，一次也没皱眉。" }
      ]
    }
  ];
  /* --- the ten sittings ---------------------------------------------------
   * beats = the night budget. need = the target in guests soothed. gossip = what
   * a converse turn hands over, in order. slate = a sitting that opens with
   * history already on the shelf. moods = a narrowed pool for a small tray, so
   * the roll only ever hands out a need somebody on that tray can answer.
   * Measured tightness (proven worst-case needBeats / night beats) rises every
   * sitting: s1..s10 = 0.667 0.800 0.857 0.933 1.081 1.200 1.263 1.308 1.385
   * 1.462, so no later sitting is easier than the one before it. Star bands
   * stay derived from the replayed best line, so three stars is exactly what
   * proven play achieves on the sitting's own deal. */
  var teaAllCups = ["dc1", "dc2", "dc3", "dc4", "dc5", "dc6"];
  var teaLevels = [
    {
      id: "s1", labelKey: "teaSit1", seed: 20371, need: 1, slate: null,
      nights: [{ seats: ["kuo"], pool: ["dc1", "dc2", "dc3", "dc5"], beats: 6, moods: { kuo: ["chilled", "soured", "feverish"] }, gossip: [] }]
    },
    {
      id: "s2", labelKey: "teaSit2", seed: 44819, need: 1, slate: null,
      nights: [{
        seats: ["kuo", "mu"], pool: ["dc1", "dc2", "dc3", "dc5"], beats: 10,
        moods: { kuo: ["chilled", "soured", "feverish"], mu: ["empty", "chilled", "tired"] },
        gossip: [{ id: "s2g1", from: "kuo", about: "mu", fact: "mu2" }]
      }]
    },
    {
      id: "s3", labelKey: "teaSit3", seed: 61127, need: 1, slate: null,
      nights: [{
        seats: ["kuo", "he", "yun"], pool: ["dc1", "dc2", "dc3", "dc4", "dc5"], beats: 14, moods: { he: ["grieving", "heavy", "tired"] },
        gossip: [
          { id: "s3r1", from: "he", about: "kuo", rumour: true, claim: "sweet", en: "He says Kuo takes honey in everything now, since her grandson came to stay.", zh: "老贺说郭婆婆如今什么都要加蜜，因为她孙子来了。" },
          { id: "s3g2", from: "yun", about: "he", fact: "he2" }
        ]
      }]
    },
    {
      id: "s4", labelKey: "teaSit4", seed: 83309, need: 1,
      slate: { rap: { he: 1, yun: 1 }, grudge: { "he:shared": 1, "yun:sweet": 1 }, known: { kuo1: 1 } },
      nights: [{
        seats: ["he", "yun", "kuo"], pool: teaAllCups, beats: 15,
        gossip: [{ id: "s4g1", from: "kuo", about: "yun", fact: "yun2" }]
      }]
    },
    {
      id: "s5", labelKey: "teaSit5", seed: 101939, need: 6, slate: null,
      nights: [
        { seats: ["kuo", "mu", "he"], pool: teaAllCups, beats: 12, gossip: [{ id: "s5g1", from: "mu", about: "he", fact: "he2" }] },
        {
          seats: ["kuo", "he", "yun"], pool: teaAllCups, beats: 12,
          gossip: [{ id: "s5r1", from: "yun", about: "mu", rumour: true, claim: "smoke", en: "Yun swears the clerk has gone over to the smoked leaf since the audit.", zh: "云姑咬定书办查账之后改抽烟焙的了。" }]
        },
        { seats: ["kuo", "mu", "he", "yun"], pool: teaAllCups, beats: 13, gossip: [{ id: "s5g2", from: "he", about: "yun", fact: "yun2" }] }
      ]
    },
    {
      id: "s6", labelKey: "teaSit6", seed: 127601, need: 7, slate: null,
      nights: [
        { seats: ["kuo", "mu", "he", "yun"], pool: teaAllCups, beats: 13, gossip: [{ id: "s6g1", from: "mu", about: "he", fact: "he2" }] },
        { seats: ["kuo", "mu", "he", "yun"], pool: teaAllCups, beats: 13, gossip: [{ id: "s6g2", from: "kuo", about: "yun", fact: "yun2" }] },
        {
          seats: ["kuo", "mu", "he", "yun"], pool: teaAllCups, beats: 14,
          gossip: [{ id: "s6r1", from: "yun", about: "mu", rumour: true, claim: "smoke", en: "Yun swears the clerk keeps a smoked brick hidden under the ledger.", zh: "云姑赌咒说书办账本底下压着烟砖。" }]
        }
      ]
    },
    {
      id: "s7", labelKey: "teaSit7", seed: 143443, need: 8, slate: null,
      nights: [
        { seats: ["kuo", "mu", "he", "yun"], pool: teaAllCups, beats: 12, gossip: [{ id: "s7g1", from: "he", about: "mu", fact: "mu2" }] },
        { seats: ["kuo", "mu", "he", "yun"], pool: teaAllCups, beats: 13, gossip: [{ id: "s7g2", from: "mu", about: "yun", fact: "yun2" }] },
        { seats: ["kuo", "mu", "he", "yun"], pool: teaAllCups, beats: 13, gossip: [] }
      ]
    },
    {
      id: "s8", labelKey: "teaSit8", seed: 159287, need: 8,
      slate: { rap: { yun: 1 }, grudge: { "yun:sweet": 1 }, known: { kuo1: 1 } },
      nights: [
        { seats: ["kuo", "mu", "he", "yun"], pool: teaAllCups, beats: 13, gossip: [{ id: "s8g1", from: "kuo", about: "mu", fact: "mu2" }] },
        { seats: ["kuo", "mu", "he", "yun"], pool: teaAllCups, beats: 13, gossip: [{ id: "s8g2", from: "yun", about: "kuo", fact: "kuo2" }] },
        { seats: ["kuo", "mu", "he", "yun"], pool: teaAllCups, beats: 13, gossip: [] }
      ]
    },
    {
      id: "s9", labelKey: "teaSit9", seed: 175129, need: 9,
      slate: { rap: { yun: 1, he: 1 }, grudge: { "yun:soft": 1, "he:sweet": 1 } },
      nights: [
        { seats: ["kuo", "mu", "he", "yun"], pool: teaAllCups, beats: 13, gossip: [{ id: "s9g1", from: "kuo", about: "he", fact: "he2" }] },
        { seats: ["kuo", "mu", "he", "yun"], pool: teaAllCups, beats: 13, gossip: [{ id: "s9g2", from: "he", about: "yun", fact: "yun2" }] },
        { seats: ["kuo", "mu", "he", "yun"], pool: teaAllCups, beats: 13, gossip: [] },
        {
          seats: ["kuo", "mu", "he", "yun"], pool: teaAllCups, beats: 13,
          gossip: [{ id: "s9r1", from: "he", about: "kuo", rumour: true, claim: "sweet", en: "He swears Kuo stirs honey into the pot before it even brews.", zh: "老贺赌咒说郭婆婆茶还没沏就先下蜜。" }]
        }
      ]
    },
    {
      id: "s10", labelKey: "teaSit10", seed: 190973, need: 10,
      slate: { rap: { kuo: 1, mu: 1, he: 1 }, grudge: { "yun:soft": 1, "mu:cool": 1, "he:sweet": 1 }, known: { kuo1: 1 } },
      nights: [
        { seats: ["kuo", "mu", "he", "yun"], pool: teaAllCups, beats: 13, gossip: [{ id: "s10g1", from: "yun", about: "kuo", fact: "kuo2" }] },
        { seats: ["kuo", "mu", "he", "yun"], pool: teaAllCups, beats: 13, gossip: [{ id: "s10g2", from: "kuo", about: "mu", fact: "mu2" }] },
        { seats: ["kuo", "mu", "he", "yun"], pool: teaAllCups, beats: 13, gossip: [{ id: "s10g3", from: "mu", about: "he", fact: "he2" }] },
        {
          seats: ["kuo", "mu", "he", "yun"], pool: teaAllCups, beats: 13,
          gossip: [{ id: "s10r1", from: "mu", about: "yun", rumour: true, claim: "soft", en: "The clerk says Yun has gone soft on the milder leaf lately.", zh: "书办说云姑近来改喝淡的了。" }]
        }
      ]
    }
  ];
  /* --- small pure helpers ------------------------------------------------- */
  function teaHas(map, key) { return !!(map && key && teaOwn.call(map, key)); }
  function teaInt(value) { var n = parseInt(value, 10); return isNaN(n) ? 0 : n; }
  function teaClamp(value, low, high) { return Math.max(low, Math.min(high, teaInt(value))); }
  function teaArr(list) {
    var out = [];
    for (var i = 0; i < (list || []).length; i += 1) { out.push(list[i]); }
    return out;
  }
  function teaKeys(map) {
    var out = [];
    var key;
    for (key in map) { if (teaOwn.call(map, key)) { out.push(key); } }
    return out;
  }
  function teaCopyMap(map) {
    var out = {};
    var key;
    for (key in (map || {})) { if (teaOwn.call(map, key)) { out[key] = map[key]; } }
    return out;
  }
  function teaFind(list, id) {
    for (var i = 0; i < (list || []).length; i += 1) { if (list[i].id === id) { return list[i]; } }
    return null;
  }
  function teaGuestGet(id) { return teaFind(teaGuests, id); }
  function teaDrinkGet(id) { return teaFind(teaDrinks, id); }
  function teaMoodGet(id) { return id && teaOwn.call(teaMoods, id) ? teaMoods[id] : null; }
  function teaTokenGet(id) { return id && teaOwn.call(teaTokens, id) ? teaTokens[id] : null; }
  function teaZh() { return App.currentLang === "zh"; }
  function teaPair(pair) {
    if (!pair) { return ""; }
    return String(teaZh() ? (pair.zh || pair.en || "") : (pair.en || pair.zh || ""));
  }
  function teaWord(id) { return teaPair(teaTokenGet(id)); }
  function teaName(id) { var g = teaGuestGet(id); return g ? teaPair(g.name) : ""; }
  function teaCupName(id) { var d = teaDrinkGet(id); return d ? teaPair(d.name) : ""; }
  function teaRapWord(value) { return teaPair(teaRapWords[teaClamp(value, 0, teaRapWords.length - 1)]); }
  /* Slot 0 = subject, 1 = object, 2 = possessive. */
  function teaProFor(id, slot) {
    var guest = teaGuestGet(id);
    var set = guest ? teaPro[guest.pro] : null;
    return set ? String(teaZh() ? set.zh[slot] : set.en[slot]) : "";
  }
  function teaJoin(parts) {
    var out = [];
    for (var i = 0; i < (parts || []).length; i += 1) {
      if (String(parts[i]).length) { out.push(String(parts[i])); }
    }
    return out.join(teaZh() ? "、" : ", ");
  }
  /* Lehmer: the only dice in the house, and it rolls from the sitting's seed. */
  function teaRand(seed) {
    var s = teaInt(seed) % 2147483647;
    if (s <= 0) { s += 2147483646; }
    return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  }
  function teaLevelGet(spec) {
    var level;
    var i;
    if (spec && typeof spec === "object") {
      level = teaFind(teaLevels, String(spec.lv || spec.id || ""));
      if (level) { return level; }
      if (spec.seats && spec.pool) {
        for (i = 0; i < teaLevels.length; i += 1) {
          if (teaLevels[i].nights.indexOf(spec) !== -1) { return teaLevels[i]; }
        }
      }
      return null;
    }
    return teaFind(teaLevels, String(spec === undefined ? "" : spec));
  }
  function teaNightOf(level, index) {
    var nights = (level && level.nights) || [];
    if (!nights.length) { return { seats: [], pool: [], beats: 0, gossip: [] }; }
    return nights[teaClamp(index, 0, nights.length - 1)];
  }
  function teaMoodOf(state, gid) { return teaMoodGet(state && state.moods ? state.moods[gid] : ""); }
  /* A mood is live, so it is filed per night: what you heard on night one has to
   * be heard again when the same guest comes back. */
  function teaMoodKey(gid, ni) { return String(gid) + ":mood:" + teaInt(ni); }
  function teaMoodPoolOf(level, ni, gid) {
    var night = teaNightOf(level, ni);
    if (night.moods && teaOwn.call(night.moods, gid)) { return teaArr(night.moods[gid]); }
    return teaArr((teaGuestGet(gid) || { moods: [] }).moods);
  }
  /* What the seated guest gives up when you listen: tonight's mood first. */
  function teaListenFacts(gid, moodId, ni) {
    var guest = teaGuestGet(gid);
    var mood = teaMoodGet(moodId);
    var out = [{ id: teaMoodKey(gid, ni), kind: "mood", mood: moodId, token: mood ? mood.token : "", path: "listen" }];
    for (var i = 0; guest && i < guest.facts.length; i += 1) {
      if (guest.facts[i].path === "listen") { out.push(guest.facts[i]); }
    }
    return out;
  }
  function teaPendingListen(state) {
    var list = teaListenFacts(state.seated, state.moods[state.seated], state.ni);
    for (var i = 0; i < list.length; i += 1) {
      if (!teaHas(state.known, list[i].id)) { return list[i]; }
    }
    return null;
  }
  function teaGossipOf(level, ni) { return teaArr(teaNightOf(level, ni).gossip || []); }
  function teaAllGossip(level) {
    var out = [];
    for (var i = 0; i < (level.nights || []).length; i += 1) { out = out.concat(teaGossipOf(level, i)); }
    return out;
  }
  function teaPendingTalk(state) {
    var level = teaLevelGet(state.lv) || teaLevels[0];
    var list = teaGossipOf(level, state.ni);
    for (var i = 0; i < list.length; i += 1) {
      if (!teaHas(state.goss, list[i].id)) { return list[i]; }
    }
    return null;
  }
  function teaGossipToken(level, entry) {
    var guest = teaGuestGet(entry.about);
    var fact = guest ? teaFind(guest.facts, entry.fact) : null;
    return fact ? fact.token : "";
  }
  /* --- the arithmetic of a cup -------------------------------------------- */
  function teaProps(gid, drinkId, kind) {
    var guest = teaGuestGet(gid);
    var drink = teaDrinkGet(drinkId);
    var out = [];
    if (!guest || !drink) { return out; }
    var set = kind === "like" ? guest.likes : guest.hates;
    for (var i = 0; i < drink.props.length; i += 1) {
      if (set.indexOf(drink.props[i]) !== -1) { out.push(drink.props[i]); }
    }
    return out;
  }
  function teaGrudgeCut(state, gid, drinkId) {
    var drink = teaDrinkGet(drinkId);
    var out = [];
    if (!drink) { return out; }
    for (var i = 0; i < drink.props.length; i += 1) {
      if (teaHas(state.grudge, gid + ":" + drink.props[i])) { out.push(drink.props[i]); }
    }
    return out;
  }
  /* Verdict of a pour, independent of anything the player happens to know. */
  function teaCupResult(state, gid, drinkId) {
    var mood = teaMoodOf(state, gid);
    var drink = teaDrinkGet(drinkId);
    var need = mood ? mood.token : "";
    var cut = teaProps(gid, drinkId, "hate");
    var refuse = teaGrudgeCut(state, gid, drinkId);
    var takes = teaProps(gid, drinkId, "like");
    var math = { verdict: "none", cut: cut, refuse: refuse, takes: takes, need: need, cup: drinkId };
    if (!drink || !teaGuestGet(gid)) { return math; }
    if (refuse.length) { math.verdict = "refuse"; }
    else if (cut.length) { math.verdict = "cut"; }
    else if (need && drink.props.indexOf(need) !== -1 && takes.length) { math.verdict = "sooth"; }
    else { math.verdict = "flat"; }
    return math;
  }
  /* Is this taste already in the notebook? Likes are filed under their own fact
   * id, refusals under "guest:token", so both shapes count. */
  function teaKnowsToken(state, gid, token) {
    var guest = teaGuestGet(gid);
    if (teaHas(state.known, gid + ":" + token)) { return true; }
    for (var i = 0; guest && i < guest.facts.length; i += 1) {
      if (guest.facts[i].token === token && teaHas(state.known, guest.facts[i].id)) { return true; }
    }
    return false;
  }
  /* The knowledge test the planner is held to: a cup only counts as a plan when
   * the notebook proves it, so a lucky blind pour can never inflate a band. */
  function teaProvenSoothe(state, gid, drinkId) {
    var math = teaCupResult(state, gid, drinkId);
    if (math.verdict !== "sooth") { return false; }
    if (math.need && !teaHas(state.known, teaMoodKey(gid, state.ni))) { return false; }
    for (var i = 0; i < math.takes.length; i += 1) {
      if (teaKnowsToken(state, gid, math.takes[i])) { return true; }
    }
    return false;
  }
  /* A like-family regular names their own mood before you think to ask. */
  function teaMoodFree(state, gid) { return teaInt(state.rap[gid]) >= 5; }
  /* An offended guest sits at the far table: seating costs one beat more. */
  function teaSeatCost(state, gid) {
    var list = teaKeys(state.grudge);
    for (var i = 0; i < list.length; i += 1) {
      if (list[i].indexOf(gid + ":") === 0) { return 2; }
    }
    return 1;
  }
  function teaPoolSoothe(state, gid, pool) {
    var out = [];
    for (var i = 0; i < (pool || []).length; i += 1) {
      if (teaCupResult(state, gid, pool[i]).verdict === "sooth") { out.push(pool[i]); }
    }
    return out;
  }
  /* --- the resolver: the one place a night moves forward ------------------ */
  function teaFreshSlate(level) {
    var slate = (level && level.slate) || {};
    var known = {};
    var from = {};
    var grudge = {};
    var rap = {};
    var list = teaKeys(slate.rap);
    for (var i = 0; i < teaGuests.length; i += 1) { rap[teaGuests[i].id] = 2; }
    for (i = 0; i < list.length; i += 1) { rap[list[i]] = teaClamp(slate.rap[list[i]], 0, 5); }
    list = teaKeys(slate.known);
    for (i = 0; i < list.length; i += 1) { known[list[i]] = 1; from[list[i]] = ""; }
    list = teaKeys(slate.grudge);
    for (i = 0; i < list.length; i += 1) { grudge[list[i]] = 1; }
    return { known: known, from: from, grudge: grudge, rap: rap };
  }
  function teaDeal(level, slate) {
    var fresh = slate || teaFreshSlate(level);
    var state = {
      lv: level.id, ni: 0, seed: teaInt(level.seed), phase: 0,
      beats: 0, seats: [], pool: [], si: 0, seated: "", moods: {}, poured: {},
      known: teaCopyMap(fresh.known), from: teaCopyMap(fresh.from),
      grudge: teaCopyMap(fresh.grudge), rap: teaCopyMap(fresh.rap),
      goss: {}, rums: {}, hearsay: {},
      nSooth: 0, nCut: 0, nRef: 0, nFlat: 0, nKnow: 0,
      soothed: 0, served: 0, pots: 0, win: false, scored: 0,
      heard: [], log: [], line: null
    };
    teaBeginNight(state, 0);
    return state;
  }
  /* Opening a night: budget, queue, tonight's moods, one fresh pot per cup. */
  function teaBeginNight(state, ni) {
    var level = teaLevelGet(state.lv) || teaLevels[0];
    var night = teaNightOf(level, ni);
    var rnd = teaRand(teaInt(level.seed) + teaInt(ni) * 7919);
    var gid;
    var pool;
    state.ni = ni;
    state.seats = teaArr(night.seats);
    state.pool = teaArr(night.pool);
    state.beats = teaInt(night.beats);
    state.si = 0;
    state.seated = "";
    state.poured = {};
    state.moods = {};
    state.goss = {};
    state.nSooth = 0;
    state.nCut = 0;
    state.nRef = 0;
    state.nFlat = 0;
    state.nKnow = 0;
    state.heard = [];
    state.phase = 0;
    for (var i = 0; i < state.seats.length; i += 1) {
      gid = String(state.seats[i]);
      pool = teaMoodPoolOf(level, ni, gid);
      state.moods[gid] = pool.length ? pool[Math.floor(rnd() * pool.length) % pool.length] : "";
      if (teaMoodFree(state, gid)) { teaReveal(state, teaMoodKey(gid, ni), gid); }
    }
    state.log.push({ key: "teaNightOpen", n: ni + 1, m: (level.nights || []).length });
    return state;
  }
  function teaReveal(state, factId, source) {
    if (!factId || teaHas(state.known, factId)) { return false; }
    state.known[factId] = 1;
    state.from[factId] = source || "";
    if (source && String(factId).indexOf(source) !== 0) { state.hearsay[factId] = source; }
    state.nKnow += 1;
    return true;
  }
  function teaSay(state, key, vars) {
    var note = teaCopyMap(vars || {});
    note.key = key;
    state.line = note;
    return state;
  }
  function teaCloseNight(state) {
    var level = teaLevelGet(state.lv) || teaLevels[0];
    var nights = (level.nights || []).length;
    if (state.phase !== 0) { return state; }
    for (var i = state.si; i < state.seats.length; i += 1) {
      state.log.push({ key: "teaWhyDry", g: String(state.seats[i]) });
    }
    state.seated = "";
    state.si = state.seats.length;
    state.beats = 0;
    state.log.push({
      key: "teaNightTally", n: teaInt(state.ni) + 1, s: teaInt(state.nSooth),
      c: teaInt(state.nCut), f: teaInt(state.nFlat), r: teaInt(state.nRef), p: teaInt(state.seats.length)
    });
    state.phase = state.ni + 1 < nights ? 1 : 2;
    if (state.phase === 2) { state.win = teaInt(state.soothed) >= Math.max(1, teaInt(level.need)); }
    return state;
  }
  /* Every legal turn spends exactly one beat, and the night closes the moment
   * the last chair empties or the budget runs out. */
  function teaStep(state, action) {
    var next = teaApply(state, action);
    if (next.phase === 0 && !next.seated && next.si >= next.seats.length) { teaCloseNight(next); }
    return next;
  }
  function teaApply(state, action) {
    var next = teaCloneState(state);
    var level = teaLevelGet(next.lv) || teaLevels[0];
    var nights = (level.nights || []).length;
    var kind = action && action.k ? String(action.k) : "";
    var gid = next.seated;
    var cost;
    var fact;
    var mood;
    var drink;
    var math;
    var take;
    var i;
    next.line = null;
    if (next.phase === 2) { return teaSay(next, "teaHouseClosed"); }
    if (next.phase === 1) {
      if (kind !== "next") { return teaSay(next, "teaNightHush"); }
      teaBeginNight(next, next.ni + 1);
      return teaSay(next, "teaNightOpenLine", { n: next.ni + 1, m: nights });
    }
    if (kind === "next") { return teaSay(next, "teaNightStillOpen"); }
    if (kind === "seat") {
      if (gid) { return teaSay(next, "teaOneAtATime"); }
      if (next.si >= next.seats.length) { return teaSay(next, "teaNoMoreGuests"); }
      gid = String(next.seats[next.si]);
      cost = teaSeatCost(next, gid);
      if (next.beats < cost) { teaCloseNight(next); return teaSay(next, "teaNoBeats"); }
      next.beats -= cost;
      next.seated = gid;
      mood = teaMoodOf(next, gid);
      if (mood && teaHas(next.known, teaMoodKey(gid, next.ni))) {
        return teaSay(next, "teaToldMood", { g: gid, md: next.moods[gid], need: mood.token, rap: teaInt(next.rap[gid]) });
      }
      return teaSay(next, "teaSeatedQuiet", { g: gid, rap: teaInt(next.rap[gid]) });
    }
    if (!gid) { return teaSay(next, "teaEmptyChair"); }
    if (next.beats <= 0) { teaCloseNight(next); return teaSay(next, "teaNoBeats"); }
    if (kind === "listen") {
      fact = teaPendingListen(next);
      if (!fact) { return teaSay(next, "teaNothingMore"); }
      next.beats -= 1;
      teaReveal(next, fact.id, gid);
      if (fact.kind === "mood") {
        mood = teaMoodGet(fact.mood);
        if (!mood) { return teaSay(next, "teaNothingMore"); }
        next.heard.push({ key: "teaHeardMood", g: gid, md: fact.mood, need: mood.token, n: teaInt(mood.n), rap: teaInt(next.rap[gid]) });
        return teaSay(next, "teaHeardMoodLine", {
          g: gid, md: fact.mood, need: mood.token, n: teaInt(mood.n), why: teaPair(mood.tell)
        });
      }
      next.heard.push({ key: "teaHeardTake", g: gid, take: fact.token, rap: teaInt(next.rap[gid]) });
      return teaSay(next, "teaHeardTakeLine", { g: gid, take: fact.token, why: teaPair(fact) });
    }
    if (kind === "converse") {
      fact = teaPendingTalk(next);
      if (!fact) { return teaSay(next, "teaNoMoreTales"); }
      next.beats -= 1;
      next.goss[fact.id] = 1;
      if (fact.rumour) {
        next.rums[fact.id] = 1;
        next.log.push({ key: "teaNoteRumour", g: fact.about, take: fact.claim, from: fact.from });
        return teaSay(next, "teaRumourLine", { g: fact.about, take: fact.claim, from: fact.from, why: teaPair(fact) });
      }
      teaReveal(next, fact.fact, fact.from);
      take = teaGossipToken(level, fact);
      next.log.push({ key: "teaNoteHeard", g: fact.about, take: take, from: fact.from });
      return teaSay(next, "teaGossipLine", { g: fact.about, take: take, from: fact.from, why: teaPair(fact) });
    }
    if (kind !== "pour") { return teaSay(next, "teaUnknownTurn"); }
    drink = teaDrinkGet(String(action.d || ""));
    if (!drink) { return teaSay(next, "teaNoSuchCup"); }
    if (next.pool.indexOf(drink.id) === -1) { return teaSay(next, "teaNotOnTray"); }
    if (teaHas(next.poured, drink.id)) { return teaSay(next, "teaPotDone"); }
    next.beats -= 1;
    math = teaCupResult(next, gid, drink.id);
    if (math.verdict === "refuse") {
      next.nRef += 1;
      next.log.push({ key: "teaWhyRefuse", g: gid, d: drink.id, cut: math.refuse[0], rap: teaInt(next.rap[gid]) });
      return teaSay(next, "teaWhyRefuse", { g: gid, d: drink.id, cut: math.refuse[0] });
    }
    next.poured[drink.id] = 1;
    next.pots += 1;
    next.served += 1;
    next.si += 1;
    next.seated = "";
    if (math.verdict === "cut") {
      next.nCut += 1;
      next.rap[gid] = teaClamp(teaInt(next.rap[gid]) - 2, 0, 5);
      for (i = 0; i < drink.props.length; i += 1) { next.grudge[gid + ":" + drink.props[i]] = 1; }
      next.log.push({ key: "teaWhyCut", g: gid, d: drink.id, cut: math.cut[0], rap: teaInt(next.rap[gid]) });
      return teaSay(next, "teaWhyCut", { g: gid, d: drink.id, cut: math.cut[0], rap: teaInt(next.rap[gid]) });
    }
    if (math.verdict === "sooth") {
      next.nSooth += 1;
      next.soothed += 1;
      take = math.takes[0];
      for (i = 0; i < math.takes.length; i += 1) {
        if (teaKnowsToken(next, gid, math.takes[i])) { take = math.takes[i]; break; }
      }
      mood = teaMoodOf(next, gid);
      next.rap[gid] = teaClamp(teaInt(next.rap[gid]) + (mood && teaInt(mood.n) >= 3 ? 2 : 1), 0, 5);
      next.log.push({ key: "teaWhySooth", g: gid, d: drink.id, need: math.need, take: take, rap: teaInt(next.rap[gid]) });
      return teaSay(next, "teaWhySooth", { g: gid, d: drink.id, need: math.need, take: take, rap: teaInt(next.rap[gid]) });
    }
    next.nFlat += 1;
    next.log.push({ key: "teaWhyFlat", g: gid, d: drink.id, need: math.need, rap: teaInt(next.rap[gid]) });
    return teaSay(next, "teaWhyFlat", { g: gid, d: drink.id, need: math.need });
  }
  function teaCloneState(state) {
    var out = teaCopyMap(state);
    out.seats = teaArr(state.seats);
    out.pool = teaArr(state.pool);
    out.moods = teaCopyMap(state.moods);
    out.poured = teaCopyMap(state.poured);
    out.known = teaCopyMap(state.known);
    out.from = teaCopyMap(state.from);
    out.grudge = teaCopyMap(state.grudge);
    out.rap = teaCopyMap(state.rap);
    out.goss = teaCopyMap(state.goss);
    out.rums = teaCopyMap(state.rums);
    out.hearsay = teaCopyMap(state.hearsay);
    out.heard = teaArr(state.heard);
    out.log = teaArr(state.log);
    return out;
  }
  function teaSafeState(state) {
    if (state && typeof state === "object" && teaLevelGet(state.lv)) { return state; }
    return teaDeal(teaLevels[0]);
  }
  /* --- the prover: nothing a guest needs may hide behind a roll ----------- */
  function teaSolve(spec) {
    var level = teaLevelGet(spec) || teaLevels[0];
    var report = {
      ok: false, level: level.id, nights: (level.nights || []).length, budget: 0,
      need: Math.max(1, teaInt(level.need)), best: 0, guests: [],
      dangling: [], unreachable: [], rumours: 0
    };
    var night;
    var i;
    var j;
    for (i = 0; i < (level.nights || []).length; i += 1) {
      night = teaNightOf(level, i);
      report.budget = Math.max(report.budget, teaInt(night.beats));
      report.rumours += teaRumourCount(level, i);
      for (j = 0; j < night.seats.length; j += 1) {
        if (!teaGuestGet(String(night.seats[j]))) { report.dangling.push("seat:" + night.seats[j]); }
        else { report.guests.push(teaSolveGuest(level, i, String(night.seats[j]))); }
      }
      for (j = 0; j < night.pool.length; j += 1) {
        if (!teaDrinkGet(night.pool[j])) { report.dangling.push("cup:" + night.pool[j]); }
      }
    }
    for (i = 0; i < report.guests.length; i += 1) {
      if (!report.guests[i].ok) {
        report.unreachable.push(report.guests[i].gid + "@" + (report.guests[i].night + 1) + ":" + report.guests[i].note);
      }
    }
    report.best = teaInt(teaBestLine(level).soothed);
    report.ok = !report.dangling.length && !report.unreachable.length &&
      report.guests.length > 0 && report.best >= report.need;
    return report;
  }
  function teaRumourCount(level, ni) {
    var list = teaGossipOf(level, ni);
    var n = 0;
    for (var i = 0; i < list.length; i += 1) { if (list[i].rumour) { n += 1; } }
    return n;
  }
  /* One guest, one night, every mood the roll could hand out: each has to have
   * an answer on that tray, and the cheapest proven path to it has to fit inside
   * the night's beats. */
  function teaSolveGuest(level, ni, gid) {
    var night = teaNightOf(level, ni);
    var probe = teaDeal(level);
    var moodPool = teaMoodPoolOf(level, ni, gid);
    var row = {
      gid: gid, night: ni, needBeats: 0, budget: teaInt(night.beats),
      byRoll: moodPool.length > 1, rollSafe: true, answers: [], path: [], ok: false, note: ""
    };
    var worst = -1;
    var learn;
    var set;
    var mood;
    probe.ni = ni;
    if (!teaGuestGet(gid)) { row.note = "no such guest"; return row; }
    if (!moodPool.length) { row.note = "empty mood pool"; return row; }
    for (var i = 0; i < moodPool.length; i += 1) {
      mood = teaMoodGet(moodPool[i]);
      if (!mood) { row.note = "dangling mood " + moodPool[i]; return row; }
      probe.moods[gid] = moodPool[i];
      set = teaPoolSoothe(probe, gid, night.pool);
      learn = teaLearnPath(level, ni, gid);
      row.answers.push({ mood: moodPool[i], need: mood.token, drinks: teaArr(set) });
      if (!set.length) { row.note = "nothing on the tray answers " + moodPool[i]; row.rollSafe = false; return row; }
      if (!learn.ok) { row.note = learn.note; return row; }
      row.needBeats = Math.max(row.needBeats, teaSeatCost(probe, gid) + learn.beats + 1);
      row.path = learn.path;
      worst = Math.max(worst, teaSeatCost(probe, gid) + learn.beats + 1);
    }
    row.ok = worst >= 0 && worst <= row.budget;
    if (!row.ok && !row.note) { row.note = "proven path costs " + worst + " of " + row.budget + " beats"; }
    return row;
  }
  function teaBoth(a, b) {
    var out = [];
    for (var i = 0; i < a.length; i += 1) { if (b.indexOf(a[i]) !== -1) { out.push(a[i]); } }
    return out;
  }
  /* The listening path that must exist for every mood: tonight's need, then one
   * taste the guest takes - both out of the guest's own mouth. Never a rumour,
   * never a roll: the roll only picks which vetted mood walks in the door. */
  function teaLearnPath(level, ni, gid) {
    var out = { ok: false, beats: 0, path: [], note: "" };
    var guest = teaGuestGet(gid);
    var night = teaNightOf(level, ni);
    var listens = teaListenFacts(gid, "", ni);
    var needed = 1;
    if (!guest) { out.note = "no such guest"; return out; }
    out.path.push("seat " + gid);
    out.path.push("listen " + gid + " mood");
    for (var i = 1; i < listens.length; i += 1) {
      if (listens[i].kind === "like" && guest.likes.indexOf(listens[i].token) !== -1) {
        out.path.push("listen " + listens[i].id);
        needed += 1;
        break;
      }
    }
    if (needed < 2) { out.note = "no taste of " + gid + " ever surfaces by listening"; return out; }
    out.path.push("pour");
    out.beats = needed;
    out.ok = needed + 2 <= teaInt(night.beats);
    if (!out.ok) { out.note = "path costs " + (needed + 2) + " of " + night.beats + " beats"; }
    return out;
  }
  /* --- the best line: measured by replaying the real resolver ------------- */
  function teaLegal(state, provenOnly) {
    var out = [];
    var level = teaLevelGet(state.lv) || teaLevels[0];
    var pool = teaNightOf(level, state.ni).pool;
    var gid = state.seated;
    var cost;
    if (state.phase !== 0 || state.beats <= 0) { return out; }
    if (!gid) {
      if (state.si < state.seats.length) {
        cost = teaSeatCost(state, String(state.seats[state.si]));
        if (state.beats >= cost) { out.push({ k: "seat" }); }
      }
      return out;
    }
    if (teaPendingListen(state)) { out.push({ k: "listen" }); }
    if (teaPendingTalk(state)) { out.push({ k: "converse" }); }
    for (var i = 0; i < pool.length; i += 1) {
      if (!teaHas(state.poured, pool[i]) && (!provenOnly || teaProvenSoothe(state, gid, pool[i]))) {
        out.push({ k: "pour", d: pool[i] });
      }
    }
    return out;
  }
  function teaGain(before, after) {
    return teaSootheScore * (teaInt(after.nSooth) - teaInt(before.nSooth)) +
      teaCutScore * (teaInt(after.nCut) - teaInt(before.nCut)) +
      teaRefScore * (teaInt(after.nRef) - teaInt(before.nRef)) +
      teaFactScore * (teaInt(after.nKnow) - teaInt(before.nKnow));
  }
  /* Best proven play for one night: never a cup the notebook cannot justify. */
  function teaPlanNight(start) {
    var level = teaLevelGet(start.lv) || teaLevels[0];
    var ids = teaNightFactIds(level, start.ni);
    var pots = teaArr(teaNightOf(level, start.ni).pool);
    var memo = {};

    function keyOf(s) {
      var parts = [s.si, s.seated, s.beats, s.phase];
      for (var i = 0; i < ids.length; i += 1) { parts.push(teaHas(s.known, ids[i]) ? "1" : "0"); }
      for (i = 0; i < pots.length; i += 1) { parts.push(teaHas(s.poured, pots[i]) ? "1" : "0"); }
      return parts.join("|");
    }

    function walk(s, depth) {
      var kk = keyOf(s);
      var best = { v: 0, a: [] };
      var list;
      var after;
      var sub;
      if (s.phase !== 0 || depth > 26) { return { v: 0, a: [] }; }
      if (teaHas(memo, kk)) { return memo[kk]; }
      memo[kk] = best;
      list = teaLegal(s, true);
      for (var i = 0; i < list.length; i += 1) {
        after = teaStep(s, list[i]);
        sub = walk(after, depth + 1);
        if (teaGain(s, after) + sub.v > best.v) {
          best = { v: teaGain(s, after) + sub.v, a: [{ k: list[i].k, d: list[i].d }].concat(sub.a) };
        }
      }
      memo[kk] = best;
      return best;
    }

    return walk(start, 0);
  }
  function teaNightFactIds(level, ni) {
    var out = [];
    var seats = teaNightOf(level, ni).seats;
    var guest;
    for (var i = 0; i < seats.length; i += 1) {
      out.push(teaMoodKey(seats[i], ni));
      guest = teaGuestGet(String(seats[i]));
      for (var j = 0; guest && j < guest.facts.length; j += 1) { out.push(guest.facts[j].id); }
    }
    return out;
  }
  function teaApplyAll(state, actions) {
    var s = state;
    for (var i = 0; i < (actions || []).length; i += 1) { s = teaStep(s, actions[i]); }
    return s;
  }
  /* The replayed best line for a sitting: chain the night plans, then run the
   * whole action list through the resolver the panel drives. Stars are cut from
   * the replayed number, never from a guess. */
  function teaBestLine(spec) {
    var level = teaLevelGet(spec) || teaLevels[0];
    var nights = (level.nights || []).length;
    var line = {
      level: level.id, soothed: 0, served: 0, pots: 0, cut: 0,
      target: Math.max(1, teaInt(level.need)), nights: [], acts: [], replayed: false, win: false
    };
    var state = teaDeal(level);
    var after;
    var plan;
    for (var i = 0; i < nights; i += 1) {
      if (state.phase === 1) { state = teaStep(state, { k: "next" }); }
      if (state.phase !== 0) { break; }
      plan = teaPlanNight(state);
      after = teaApplyAll(state, plan.a);
      if (after.phase === 0) { after = teaCloseNight(after); }
      line.nights.push({
        night: i + 1, soothed: teaInt(after.nSooth), cut: teaInt(after.nCut),
        refused: teaInt(after.nRef), flat: teaInt(after.nFlat), acts: teaArr(plan.a)
      });
      line.acts = line.acts.concat(plan.a);
      state = after;
    }
    line.soothed = teaInt(state.soothed);
    line.served = teaInt(state.served);
    line.pots = teaInt(state.pots);
    line.cut = teaInt(state.nCut);
    line.replayed = true;
    line.win = !!state.win;
    return line;
  }
  /* Bands measured off the replayed line: three stars is what proven best play
   * achieves, two is a guest off it, one is the sitting's own target. */
  function teaBands(spec) {
    var level = teaLevelGet(spec) || teaLevels[0];
    var top = Math.max(1, teaInt(teaBestLine(level).soothed));
    var need = Math.min(Math.max(1, teaInt(level.need)), top);
    return [top, Math.max(need, top - 1), need];
  }
  function teaBeatable(spec) {
    var level = teaLevelGet(spec) || teaLevels[0];
    return teaInt(teaBestLine(level).soothed) >= Math.max(1, teaInt(level.need));
  }
  /* --- copy: every template fills every placeholder it prints -------------- */
  var teaTplVars = {
    "teaStatNight": ["n", "m"],
    "teaStatTonight": ["s", "p"],
    "teaStatSession": ["s", "t"],
    "teaChairLine": ["n", "names"],
    "teaPotLine": ["n", "m"],
    "teaNoteRow": ["who", "word", "n"],
    "teaNoteTakes": ["list"],
    "teaNoteRefuses": ["list"],
    "teaNoteMood": ["word", "n", "need"],
    "teaNoteGrudge": ["list"],
    "teaNoteHeard": ["who", "take", "from"],
    "teaNoteRumour": ["who", "take", "from"],
    "teaMoodHush": ["who"],
    "teaCupRefused": ["names"],
    "teaPaused": ["who"],
    "teaToldMood": ["who", "word", "n", "need"],
    "teaSeatedQuiet": ["who", "word", "n"],
    "teaHeardMood": ["who", "word", "n", "need"],
    "teaHeardMoodLine": ["who", "word", "n", "need", "why"],
    "teaHeardTake": ["who", "take"],
    "teaHeardTakeLine": ["who", "take", "why"],
    "teaGossipLine": ["from", "who", "take", "why"],
    "teaRumourLine": ["from", "who", "take", "why"],
    "teaWhySooth": ["cup", "obj", "subj", "poss", "need", "take", "word", "n"],
    "teaWhyFlat": ["cup", "subj", "need", "who"],
    "teaWhyCut": ["cut", "cup", "obj", "subj", "who", "word", "n"],
    "teaWhyRefuse": ["who", "cup", "cut"],
    "teaWhyDry": ["who"],
    "teaNightOpen": ["n", "m"],
    "teaNightOpenLine": ["n", "m"],
    "teaNightTally": ["n", "s", "c", "f", "r", "p"],
    "teaWin": ["s", "n", "p", "st"],
    "teaLose": ["s", "t", "n", "p"],
    "teaLogWin": ["s"],
    "teaBest": ["n", "t", "h"],
    "teaCopyProblem": ["n"]
  };
  function teaIsNum(name) { return teaNumVars.indexOf(name) !== -1; }
  function teaPlain(text) {
    return String(text).replace(/\{[A-Za-z0-9]*\}/g, "").replace(/  +/g, " ");
  }
  /* Note fields into template variables, in the live language: ids go in, words
   * come out, so a variable is never an object and never undefined. */
  function teaVarsOf(note) {
    var mood = teaMoodGet(note.md);
    var nums = ["n", "m", "s", "c", "f", "r", "p", "t", "st", "h"];
    var out = {
      who: teaName(note.g), subj: teaProFor(note.g, 0), obj: teaProFor(note.g, 1),
      poss: teaProFor(note.g, 2), cup: teaCupName(note.d), need: teaWord(note.need),
      take: teaWord(note.take), cut: teaWord(note.cut), from: teaName(note.from),
      word: mood ? teaPair(mood) : (note.rap === undefined ? "" : teaRapWord(note.rap)),
      why: teaStr(note.why), list: teaStr(note.list), names: teaStr(note.names)
    };
    if (note.n !== undefined) { out.n = note.n; }
    else if (mood) { out.n = teaInt(mood.n); }
    else if (note.rap !== undefined) { out.n = teaClamp(note.rap, 0, 5); }
    for (var i = 0; i < nums.length; i += 1) {
      if (note[nums[i]] !== undefined) { out[nums[i]] = note[nums[i]]; }
    }
    return out;
  }
  function teaStr(value) { return value === undefined ? "" : String(value); }
  /* Fill every declared placeholder, with a safe default, so an unfilled brace
   * can never reach the screen in either language. */
  function teaV(key, values) {
    var names = teaHas(teaTplVars, key) ? teaTplVars[key] : [];
    var out = {};
    var value;
    for (var i = 0; i < names.length; i += 1) {
      value = values[names[i]];
      if (value === undefined || value === null || value === "") {
        out[names[i]] = teaIsNum(names[i]) ? 0 : "";
      } else {
        out[names[i]] = teaIsNum(names[i]) ? teaInt(value) : String(value);
      }
    }
    return out;
  }
  function teaText(key, note) {
    var fields = teaCopyMap(note || {});
    fields.key = key;
    return teaPlain(t(key, teaV(key, teaVarsOf(fields))));
  }
  function teaNoteText(note) {
    if (!note || !note.key) { return ""; }
    return teaText(String(note.key), note);
  }
  /* Proves the copy: each template resolves, prints no brace and no object, and
   * declares every placeholder its text uses. A missing line surfaces here, not
   * in front of the player. Then the same pass re-proves every sitting. */
  function teaCopyCheck() {
    var missing = [];
    var unfilled = [];
    var undeclared = [];
    var bare = [];
    var pairs = [];
    var keys = teaKeys(teaTplVars);
    var full = {
      g: "kuo", d: "dc1", need: "dry", take: "dry", cut: "dry", from: "mu", md: "chilled",
      rap: 3, n: 1, m: 2, s: 3, c: 4, f: 5, r: 6, p: 7, t: 8, st: 9, h: "1/2/3",
      why: "w", list: "l", names: "x"
    };
    var mood;
    var guest;
    var drink;
    var fact;
    var text;
    var found;
    var key;
    var i;
    var j;
    for (i = 0; i < keys.length; i += 1) {
      key = keys[i];
      if (t(key) === key) { missing.push(key); continue; }
      text = teaNoteText({ key: key }) + "|" + teaText(key, full);
      if (text.indexOf("{") !== -1 || text.indexOf("}") !== -1 ||
        text.indexOf("undefined") !== -1 || text.indexOf("[object") !== -1) { unfilled.push(key); }
      for (j = 0; j < teaTplVars[key].length; j += 1) {
        if (teaVarsKnown.indexOf(teaTplVars[key][j]) === -1) { bare.push(key + "." + teaTplVars[key][j]); }
      }
      found = String(t(key)).match(/\{([A-Za-z0-9]+)\}/g) || [];
      for (j = 0; j < found.length; j += 1) {
        if (teaTplVars[key].indexOf(found[j].slice(1, -1)) === -1) { undeclared.push(key + ":" + found[j]); }
      }
    }
    for (i = 0; i < teaGuests.length; i += 1) {
      guest = teaGuests[i];
      if (!guest.name.en || !guest.name.zh || !teaPro[guest.pro]) { pairs.push(guest.id); }
      if (teaBoth(guest.likes, guest.hates).length) { pairs.push("clash:" + guest.id); }
      if (!guest.moods.length || !guest.likes.length) { pairs.push("bare:" + guest.id); }
      for (j = 0; j < guest.facts.length; j += 1) {
        fact = guest.facts[j];
        if (!fact.en || !fact.zh || !teaTokenGet(fact.token)) { pairs.push("fact:" + fact.id); }
        if (guest.likes.indexOf(fact.token) === -1) { pairs.push("orphan:" + fact.id); }
      }
      for (j = 0; j < guest.hates.length; j += 1) {
        if (!teaTokenGet(guest.hates[j])) { pairs.push("hate:" + guest.hates[j]); }
      }
      for (j = 0; j < guest.moods.length; j += 1) {
        if (!teaMoodGet(guest.moods[j])) { pairs.push("pool:" + guest.moods[j]); }
      }
    }
    for (i = 0; i < teaKeys(teaMoods).length; i += 1) {
      mood = teaMoods[teaKeys(teaMoods)[i]];
      if (!mood.en || !mood.zh || !mood.tell.en || !mood.tell.zh ||
        !teaTokenGet(mood.token) || teaInt(mood.n) < 1) { pairs.push("mood:" + mood.en); }
    }
    for (i = 0; i < teaDrinks.length; i += 1) {
      drink = teaDrinks[i];
      if (!drink.name.en || !drink.name.zh || drink.props.length < 2 || drink.props.length > 3) {
        pairs.push("cup:" + drink.id);
      }
      for (j = 0; j < drink.props.length; j += 1) {
        if (!teaTokenGet(drink.props[j])) { pairs.push("prop:" + drink.props[j]); }
      }
    }
    for (i = 0; i < teaLevels.length; i += 1) {
      key = t(teaLevels[i].labelKey);
      if (!key || key === teaLevels[i].labelKey) { pairs.push("label:" + teaLevels[i].labelKey); }
      if (teaBeatable(teaLevels[i]) !== true) { pairs.push("beatable:" + teaLevels[i].id); }
      if (teaSolve(teaLevels[i]).ok !== true) { pairs.push("solve:" + teaLevels[i].id); }
    }
    return { missing: missing, unfilled: unfilled, undeclared: undeclared, bare: bare, pairs: pairs };
  }
  /* --- the panel ---------------------------------------------------------- */
  var teaCampaign = null;
  var teaLevel = teaLevels[0];
  var teaState = null;
  var teaGuestEl = null;
  var teaCounterEl = null;
  var teaTrayEl = null;
  var teaNoteEl = null;
  var teaResultEl = null;
  var teaSelectEl = null;
  var teaBestEl = null;
  var teaStatEl = {};
  var teaKeyEls = [];
  var teaCache = {};
  function teaNode(tag, className, text, parent) {
    var el = document.createElement(tag);
    if (className) { el.className = className; }
    el.textContent = text === undefined || text === null ? "" : String(text);
    if (parent) { parent.appendChild(el); }
    return el;
  }
  /* The prover, the best line and the bands are pure functions of the sitting,
   * so each sitting is measured once and kept. */
  function teaProof(spec) {
    var level = teaLevelGet(spec) || teaLevels[0];
    if (!teaHas(teaCache, level.id)) {
      teaCache[level.id] = { bands: teaBands(level), line: teaBestLine(level), solve: teaSolve(level) };
    }
    return teaCache[level.id];
  }
  /* A real button for every turn, with its number key printed on the label. */
  function teaButton(label, handler, extra) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = extra ? "tea-btn " + extra : "tea-btn";
    btn.textContent = label;
    btn.addEventListener("click", function () { handler(); });
    return btn;
  }
  function teaStat(key, valueKey) {
    var stat = teaNode("div", "game-stat");
    teaNode("span", "", t(valueKey), stat).setAttribute("data-i18n", valueKey);
    teaStatEl[key] = teaNode("strong", "", "0", stat);
    return stat;
  }
  function teaMove(action) {
    if (!teaState) { return; }
    teaState = teaStep(teaState, action);
    if (teaState.phase === 2 && !teaInt(teaState.scored)) { teaState.scored = 1; teaFinish(); }
    teaRender();
  }
  function teaLevelOf() { return teaLevelGet(teaState.lv) || teaLevels[0]; }
  function teaPoolOf() { return teaNightOf(teaLevelOf(), teaState.ni).pool; }
  function teaKnownTakes(gid) {
    var guest = teaGuestGet(gid);
    var out = [];
    for (var i = 0; guest && i < guest.facts.length; i += 1) {
      if (guest.facts[i].kind === "like" && teaHas(teaState.known, guest.facts[i].id)) { out.push(teaWord(guest.facts[i].token)); }
    }
    return out;
  }
  function teaKnownRefuses(gid) {
    var guest = teaGuestGet(gid);
    var out = [];
    for (var i = 0; guest && i < guest.hates.length; i += 1) { out.push(teaWord(guest.hates[i])); }
    return out;
  }
  function teaGrudgeWords(gid) {
    var list = teaKeys(teaState.grudge);
    var out = [];
    for (var i = 0; i < list.length; i += 1) {
      if (list[i].indexOf(gid + ":") === 0) { out.push(teaWord(list[i].slice(gid.length + 1))); }
    }
    return out;
  }
  function teaOrNone(text) { return text.length ? text : t("teaNothing"); }
  function teaTakesText(gid) { return teaOrNone(teaJoin(teaKnownTakes(gid))); }
  function teaRefusesText(gid) { return teaOrNone(teaJoin(teaKnownRefuses(gid))); }
  function teaWaitingText() {
    var out = [];
    for (var i = teaState.si; i < teaState.seats.length; i += 1) { out.push(teaName(String(teaState.seats[i]))); }
    return teaOrNone(teaJoin(out));
  }
  function renderTeaHud() {
    var s = teaState;
    var level = teaLevelOf();
    teaStatEl.night.textContent = teaText("teaStatNight", { n: teaInt(s.ni) + 1, m: (level.nights || []).length });
    teaStatEl.beats.textContent = String(teaInt(s.beats));
    teaStatEl.tonight.textContent = teaText("teaStatTonight", { s: teaInt(s.nSooth), p: teaInt(s.seats.length) });
    teaStatEl.session.textContent = teaText("teaStatSession", { s: teaInt(s.soothed), t: Math.max(1, teaInt(level.need)) });
  }
  function renderTeaGuest() {
    var s = teaState;
    var gid = s.seated;
    var mood = teaMoodOf(s, gid);
    var turns = [
      { key: "teaBtnSeat", cls: "tea-btn-seat", k: "seat", off: gid || s.phase !== 0 || s.si >= s.seats.length },
      { key: "teaBtnListen", cls: "tea-btn-listen", k: "listen", off: !gid || !teaPendingListen(s) },
      { key: "teaBtnConverse", cls: "tea-btn-talk", k: "converse", off: !gid || !teaPendingTalk(s) }
    ];
    teaKeyEls = [];
    teaGuestEl.textContent = "";
    teaNode("div", "tea-head", t("teaHeadChair"), teaGuestEl);
    if (gid) {
      teaNode("div", "tea-guest-name", teaName(gid), teaGuestEl);
      teaNode("p", "tea-guest-rap", teaText("teaNoteRow", { g: gid, rap: teaInt(s.rap[gid]) }), teaGuestEl);
      if (mood && teaHas(s.known, teaMoodKey(gid, s.ni))) {
        teaNode("p", "tea-guest-mood", teaText("teaNoteMood", { md: s.moods[gid], need: mood.token }), teaGuestEl);
      } else {
        teaNode("p", "tea-guest-mood tea-mood-hush", teaText("teaMoodHush", { g: gid }), teaGuestEl);
      }
      teaNode("p", "tea-guest-sub", teaText("teaNoteTakes", { list: teaTakesText(gid) }), teaGuestEl);
      teaNode("p", "tea-guest-sub", teaText("teaNoteRefuses", { list: teaRefusesText(gid) }), teaGuestEl);
    } else {
      teaNode("p", "tea-chair", teaText("teaChairLine", { n: teaWaitingCount(), names: teaWaitingText() }), teaGuestEl);
    }
    for (var i = 0; i < turns.length; i += 1) {
      teaKeyEls.push(teaTurnButton(i + 1, turns[i]));
    }
  }
  function teaTurnButton(digit, turn) {
    var btn = teaButton(digit + ". " + t(turn.key), (function (kind) {
      return function () { teaMove({ k: kind }); };
    }(turn.k)), turn.cls);
    btn.setAttribute("data-i18n", turn.key);
    if (turn.off) { btn.setAttribute("aria-disabled", "true"); }
    teaGuestEl.appendChild(btn);
    return btn;
  }
  function teaWaitingCount() { return teaInt(teaState.seats.length) - teaInt(teaState.si); }
  function renderTeaCounter() {
    var s = teaState;
    var pots = teaPoolOf();
    var used = teaKeys(s.poured).length;
    teaCounterEl.textContent = "";
    teaNode("div", "tea-head", t("teaHeadCounter"), teaCounterEl);
    teaNode("p", "tea-counter-line", teaText("teaPotLine", { n: Math.max(0, teaInt(pots.length) - used), m: teaInt(pots.length) }), teaCounterEl);
    teaNode("div", "tea-head", t("teaHeadLog"), teaCounterEl);
    if (!s.log.length) { teaNode("p", "tea-log-line", t("teaLogEmpty"), teaCounterEl); }
    for (var i = s.log.length - 1; i >= 0 && i > s.log.length - 9; i -= 1) {
      teaNode("p", "tea-log-line", teaNoteText(s.log[i]), teaCounterEl);
    }
  }
  function teaCupRefusers(drinkId) {
    var drink = teaDrinkGet(drinkId);
    var out = [];
    var gid;
    if (!drink) { return out; }
    for (var i = 0; i < teaState.seats.length; i += 1) {
      gid = String(teaState.seats[i]);
      for (var j = 0; j < drink.props.length; j += 1) {
        if (teaHas(teaState.grudge, gid + ":" + drink.props[j])) { out.push(teaName(gid)); break; }
      }
    }
    return out;
  }
  function teaPropsText(drink) {
    var out = [];
    for (var i = 0; i < drink.props.length; i += 1) { out.push(teaWord(drink.props[i])); }
    return out.join(" / ");
  }
  function renderTeaTray() {
    var s = teaState;
    var pool = teaPoolOf();
    var drink;
    var label;
    var btn;
    var refusers;
    teaTrayEl.textContent = "";
    teaNode("div", "tea-head", t("teaHeadTray"), teaTrayEl);
    for (var i = 0; i < pool.length; i += 1) {
      drink = teaDrinkGet(String(pool[i]));
      if (!drink) { continue; }
      label = String(4 + i) + ". " + teaPair(drink.name) + " - " + teaPropsText(drink);
      if (teaHas(s.poured, drink.id)) {
        label = label + " (" + t("teaCupPoured") + ")";
      } else {
        refusers = teaCupRefusers(drink.id);
        if (refusers.length) { label = label + " (" + teaText("teaCupRefused", { names: teaJoin(refusers) }) + ")"; }
      }
      btn = teaButton(label, (function (cupId) {
        return function () { teaMove({ k: "pour", d: cupId }); };
      }(drink.id)), "tea-cup");
      if (teaHas(s.poured, drink.id)) {
        btn.setAttribute("aria-disabled", "true");
        btn.className = "tea-cup tea-cup-done";
      }
      teaTrayEl.appendChild(btn);
      teaKeyEls.push(btn);
    }
  }
  function teaGuestOwning(factId) {
    var id = String(factId);
    var guest;
    for (var i = 0; i < teaGuests.length; i += 1) {
      guest = teaGuests[i];
      if (id.indexOf(guest.id + ":") === 0 || teaFind(guest.facts, id)) { return guest; }
    }
    return null;
  }
  function renderTeaNote() {
    var s = teaState;
    var level = teaLevelOf();
    var row;
    var guest;
    var grudge;
    var proofed = 0;
    teaNoteEl.textContent = "";
    teaNode("div", "tea-head", t("teaHeadNote"), teaNoteEl);
    for (var i = 0; i < teaGuests.length; i += 1) {
      guest = teaGuests[i];
      row = teaNode("div", "tea-note-guest", "", teaNoteEl);
      teaNode("p", "tea-note-line", teaText("teaNoteRow", { g: guest.id, rap: teaInt(s.rap[guest.id]) }), row);
      teaNode("p", "tea-note-sub", teaText("teaNoteTakes", { list: teaTakesText(guest.id) }), row);
      teaNode("p", "tea-note-sub", teaText("teaNoteRefuses", { list: teaRefusesText(guest.id) }), row);
      grudge = teaGrudgeWords(guest.id);
      if (grudge.length) { teaNode("p", "tea-note-sub tea-note-grudge", teaText("teaNoteGrudge", { list: teaJoin(grudge) }), row); }
      proofed += teaKnownTakes(guest.id).length;
    }
    for (i = 0; i < s.heard.length; i += 1) {
      teaNode("p", "tea-note-line tea-note-proof", teaNoteText(s.heard[i]), teaNoteEl);
    }
    teaKeys(s.hearsay).forEach(function (factId) {
      var owner = teaGuestOwning(factId);
      var fact = owner ? teaFind(owner.facts, factId) : null;
      if (fact) {
        teaNode("p", "tea-note-line tea-note-second",
          teaText("teaNoteHeard", { g: owner.id, take: fact.token, from: s.hearsay[factId] }), teaNoteEl);
      }
    });
    teaKeys(s.rums).forEach(function (id) {
      var entry = teaFind(teaAllGossip(level), id);
      if (entry) {
        teaNode("p", "tea-note-line tea-note-rumour", teaText("teaNoteRumour", {
          g: entry.about, take: entry.claim, from: entry.from
        }) + " - " + t("teaRumourTag"), teaNoteEl);
      }
    });
    if (!proofed) { teaNode("p", "tea-note-empty", t("teaNoteEmpty"), teaNoteEl); }
  }
  function teaFinishText() {
    var s = teaState;
    var level = teaLevelGet(s.lv) || teaLevels[0];
    var stars = starsFor(teaInt(s.soothed), teaProof(level).bands, "high");
    if (s.win) {
      return teaText("teaWin", { s: teaInt(s.soothed), n: (level.nights || []).length, p: teaInt(s.pots), st: stars });
    }
    return teaText("teaLose", {
      s: teaInt(s.soothed), t: Math.max(1, teaInt(level.need)),
      n: (level.nights || []).length, p: teaInt(s.pots)
    });
  }
  function renderTeaResult() {
    var s = teaState;
    if (s.phase === 2) {
      teaResultEl.textContent = teaFinishText();
      teaResultEl.className = "game-result " + (s.win ? "tea-won" : "tea-lost");
    } else if (s.line && s.line.key) {
      teaResultEl.textContent = teaNoteText(s.line);
      teaResultEl.className = "game-result";
    } else {
      teaResultEl.textContent = s.seated ? "" : t("teaOpenLine");
      teaResultEl.className = "game-result";
    }
  }
  function teaFinish() {
    var level = teaLevelGet(teaState.lv) || teaLevels[0];
    var stars = starsFor(teaInt(teaState.soothed), teaProof(level).bands, "high");
    var outcome;
    if (!teaState.win) { return; }
    outcome = teaCampaign.record(level.id, { stars: stars, best: teaInt(teaState.soothed), better: "high" });
    logAction(teaText("teaLogWin", { s: teaInt(teaState.soothed) }) + " - " + t(level.labelKey) +
      " " + stars + t("teaStarWord"));
    createConfetti(160, 160);
    petNotifyGame(outcome.isBest || outcome.firstClear);
    refreshTeaPicker();
  }
  function refreshTeaPicker() {
    var proof = teaProof(teaLevel);
    fillCampaignPicker(teaSelectEl, teaCampaign, function (def) { return t(def.labelKey); }, t("elementsLocked"));
    teaSelectEl.value = teaLevel.id;
    teaBestEl.textContent = teaText("teaBest", {
      n: proof.line.soothed, t: proof.solve.need, h: proof.bands.join("/")
    }) + " - " + t("campaignStars", { n: teaCampaign.totalStars(), max: teaCampaign.maxStars() });
  }
  function loadTeaSitting(id) {
    var level = teaLevelGet(id);
    if (!level) { return; }
    teaLevel = level;
    teaState = teaDeal(level);
    refreshTeaPicker();
    teaRender();
  }
  function teaRender() {
    if (!teaState) { return; }
    renderTeaHud();
    renderTeaGuest();
    renderTeaTray();
    renderTeaCounter();
    renderTeaNote();
    renderTeaResult();
  }
  function bindTeaKeys(panelEl) {
    panelEl.addEventListener("keydown", function (ev) {
      var key = ev && ev.key ? String(ev.key) : "";
      var btn;
      if (ev.ctrlKey || ev.metaKey || ev.altKey) { return; }
      if (key.length !== 1 || key < "1" || key > "9") { return; }
      btn = teaKeyEls[teaInt(key) - 1];
      if (!btn || typeof btn.click !== "function") { return; }
      if (typeof ev.preventDefault === "function") { ev.preventDefault(); }
      btn.click();
    });
  }
  function initTeaHouseGame(panelEl) {
    var hud;
    var stage;
    var pickRow;
    var pickLabel;
    var actions;
    var hint;
    var copy;
    var count;
    var startIndex;
    if (!panelEl) { return; }
    teaCampaign = createCampaign({ key: "tea-house-campaign", levels: teaLevels });
    startIndex = Math.max(0, teaCampaign.indexOf(teaCampaign.nextLevelId()));

    hud = teaNode("div", "game-hud", "", panelEl);
    hud.appendChild(teaStat("night", "teaStatNightLabel"));
    hud.appendChild(teaStat("beats", "teaStatBeatsLabel"));
    hud.appendChild(teaStat("tonight", "teaStatTonightLabel"));
    hud.appendChild(teaStat("session", "teaStatSessionLabel"));

    stage = teaNode("div", "tea-stage", "", panelEl);
    teaGuestEl = teaNode("div", "tea-guest", "", stage);
    teaGuestEl.setAttribute("aria-label", t("teaHeadChair"));
    teaCounterEl = teaNode("div", "tea-counter", "", stage);
    teaCounterEl.setAttribute("aria-live", "polite");

    teaTrayEl = teaNode("div", "tea-tray", "", panelEl);
    teaTrayEl.setAttribute("aria-label", t("teaHeadTray"));

    teaNoteEl = teaNode("div", "tea-note", "", panelEl);
    teaNoteEl.setAttribute("aria-label", t("teaHeadNote"));

    teaResultEl = teaNode("p", "game-result", "", panelEl);
    teaResultEl.setAttribute("role", "status");

    pickRow = teaNode("div", "elements-row", "", panelEl);
    pickLabel = teaNode("label", "elements-label", t("teaSitSelectLabel"), pickRow);
    pickLabel.setAttribute("for", "teaSitSel");
    pickLabel.setAttribute("data-i18n", "teaSitSelectLabel");
    teaSelectEl = teaNode("select", "elements-select", "", pickRow);
    teaSelectEl.id = "teaSitSel";

    actions = teaNode("div", "game-actions", "", panelEl);
    actions.appendChild(teaButton(t("teaBtnNext"), function () { teaMove({ k: "next" }); }, "primary"));
    actions.appendChild(teaButton(t("teaBtnAgain"), function () { loadTeaSitting(teaLevel.id); }, "tea-btn-again"));
    teaBestEl = teaNode("p", "game-best", "", actions);

    hint = teaNode("p", "game-hint", t("teaHint"), panelEl);
    hint.setAttribute("data-i18n", "teaHint");

    teaSelectEl.addEventListener("change", function () {
      var id = String(teaSelectEl.value || "");
      if (teaCampaign.isUnlocked(id) && teaLevelGet(id)) { loadTeaSitting(id); }
      else { teaSelectEl.value = teaLevel.id; }
    });

    bindTeaKeys(panelEl);
    loadTeaSitting(teaLevels[startIndex].id);

    copy = teaCopyCheck();
    count = copy.missing.length + copy.unfilled.length + copy.undeclared.length +
      copy.bare.length + copy.pairs.length;
    if (count) {
      teaResultEl.textContent = teaText("teaCopyProblem", { n: count }) + " " +
        copy.missing.join(",") + " " + copy.unfilled.join(",") + " " +
        copy.undeclared.join(",") + " " + copy.bare.join(",") + " " + copy.pairs.join(",");
    }

    App.quietResetTeaHouse = function () {
      /* Turn based: nothing to stop. Leaving the drawer keeps the night exactly
       * where the player left it and only says so once, on the way out. */
      if (teaState && teaState.phase === 0 && teaState.seated) {
        teaState.line = { key: "teaPaused", g: teaState.seated };
        teaRender();
      }
    };
  }
  /* --- bilingual copy: keys quoted at six spaces, both languages alike ----- */
  App.addStrings({
    en: {
      "tabTeaHouse": "Tea House at Midnight",
      "teaSit1": "First Chair",
      "teaSit2": "Opposed Cups",
      "teaSit3": "The Rumour",
      "teaSit4": "Cold Shoulders",
      "teaSit5": "Three Nights",
      "teaSit6": "Four at the Table",
      "teaSit7": "Lean Nights",
      "teaSit8": "An Old Grudge",
      "teaSit9": "Four Nights Running",
      "teaSit10": "The Last Sitting",
      "teaStatNightLabel": "Night",
      "teaStatBeatsLabel": "Beats left",
      "teaStatTonightLabel": "Tonight",
      "teaStatSessionLabel": "Session",
      "teaSitSelectLabel": "Choose a sitting",
      "teaBtnSeat": "Seat the next guest",
      "teaBtnListen": "Listen",
      "teaBtnConverse": "Converse",
      "teaBtnNext": "Open the Next Night",
      "teaBtnAgain": "New Sitting",
      "teaHeadChair": "The chair",
      "teaHeadCounter": "The counter",
      "teaHeadTray": "The tray - one pot per cup",
      "teaHeadNote": "Relationship notebook",
      "teaHeadLog": "Departures",
      "teaStatNight": "Night {n} of {m}",
      "teaStatTonight": "{s} soothed of {p} seats",
      "teaStatSession": "{s} soothed, {t} wanted",
      "teaChairLine": "{n} at the door - {names}",
      "teaPotLine": "{n} pots left of {m}",
      "teaNoteRow": "{who}: {word} ({n})",
      "teaNoteTakes": "takes {list}",
      "teaNoteRefuses": "will not take {list}",
      "teaNoteMood": "tonight {word} ({n}) - needs {need}",
      "teaNoteGrudge": "still refuses: {list}",
      "teaNoteHeard": "{who}: takes {take}, heard from {from}",
      "teaNoteRumour": "{who}: said to take {take}, from {from}",
      "teaNothing": "nothing yet",
      "teaMoodHush": "{who} says nothing about tonight yet.",
      "teaNoteEmpty": "The notebook has no taste in it yet.",
      "teaRumourTag": "heard second-hand, unproved",
      "teaCupPoured": "pot finished",
      "teaCupRefused": "{names} will not take this",
      "teaLogEmpty": "Nobody has got up from the table yet.",
      "teaOpenLine": "The lamp is lit. Seat someone.",
      "teaNoBeats": "No beat left in this night.",
      "teaEmptyChair": "No guest in the chair yet.",
      "teaOneAtATime": "One guest at a time.",
      "teaNoMoreGuests": "The room is empty now.",
      "teaNothingMore": "That guest has said all there is to say.",
      "teaNoMoreTales": "No more tales to hear tonight.",
      "teaNightHush": "This night is closed. Open the next one.",
      "teaNightStillOpen": "The night is still running.",
      "teaHouseClosed": "The house is shut. Start a new sitting.",
      "teaNotOnTray": "That cup is not on tonight's tray.",
      "teaPotDone": "That pot is finished for tonight.",
      "teaNoSuchCup": "No such cup in this house.",
      "teaUnknownTurn": "The house waits for a real turn.",
      "teaPaused": "{who} is still in the chair when you come back.",
      "teaToldMood": "{who} tells you before you ask: {word} ({n}), needing {need}.",
      "teaSeatedQuiet": "{who} sits down - {word} ({n}) - and says nothing yet.",
      "teaHeardMood": "{who}: {word} ({n}), needs {need}",
      "teaHeardMoodLine": "{who}: {word} ({n}), needing {need}. {why}",
      "teaHeardTake": "{who}: takes {take}",
      "teaHeardTakeLine": "{who} - takes {take}. {why}",
      "teaGossipLine": "{from} says it of {who}: takes {take}. {why}",
      "teaRumourLine": "{from} swears {who} takes {take}. {why}",
      "teaWhySooth": "The {cup} soothed {obj} - {subj} came for {need} and {poss} cup takes {take}. Rapport now {word} ({n}).",
      "teaWhyFlat": "The {cup} was polite and nothing more: it never touched the {need} {subj} came for, and {who} drank it anyway.",
      "teaWhyCut": "The {cut} in the {cup} offended {obj}. {subj} will not take {cut} from this counter again. Rapport now {word} ({n}).",
      "teaWhyRefuse": "{who} pushed the {cup} back unread - the {cut} between you still stands.",
      "teaWhyDry": "No beat was left for {who}: the cup went unwished.",
      "teaNightOpen": "Night {n} of {m} opens. The notebook keeps what it learned.",
      "teaNightOpenLine": "Night {n} of {m} opens - pour on what you already know.",
      "teaNightTally": "Night {n} closed: {s} soothed, {c} offended, {f} polite, {r} refused, out of {p} seats.",
      "teaWin": "The house closes warm: {s} soothed over {n} nights from {p} pots - {st} stars.",
      "teaLose": "Below the mark: {s} soothed of {t} wanted over {n} nights, {p} pots poured.",
      "teaLogWin": "Soothed {s} guests at the tea house",
      "teaStarWord": " stars",
      "teaBest": "best line {n}, target {t}, star bands {h}",
      "teaCopyProblem": "Copy problems ({n}):",
      "teaHint": "Listen first. No cup is good until you know whose cup it is."
    },
    zh: {
      "tabTeaHouse": "午夜茶馆",
      "teaSit1": "头一把椅子",
      "teaSit2": "对冲的两杯",
      "teaSit3": "一句闲话",
      "teaSit4": "带着旧账来",
      "teaSit5": "三个夜晚",
      "teaSit6": "四人一桌",
      "teaSit7": "夜夜紧巴",
      "teaSit8": "一笔旧怨",
      "teaSit9": "连开四夜",
      "teaSit10": "最后一席",
      "teaStatNightLabel": "夜晚",
      "teaStatBeatsLabel": "剩节拍",
      "teaStatTonightLabel": "今夜",
      "teaStatSessionLabel": "整场",
      "teaSitSelectLabel": "选择茶座",
      "teaBtnSeat": "请下一位入座",
      "teaBtnListen": "听",
      "teaBtnConverse": "攀话",
      "teaBtnNext": "开下一夜",
      "teaBtnAgain": "重开茶座",
      "teaHeadChair": "座上客",
      "teaHeadCounter": "柜台",
      "teaHeadTray": "茶盘 - 每样一壶",
      "teaHeadNote": "人情账",
      "teaHeadLog": "离席",
      "teaStatNight": "第 {n} 夜，共 {m} 夜",
      "teaStatTonight": "安下 {s} 位，共 {p} 座",
      "teaStatSession": "整场安下 {s} 位，要 {t} 位",
      "teaChairLine": "门外等 {n} 位 - {names}",
      "teaPotLine": "还剩 {n} 壶，共 {m} 壶",
      "teaNoteRow": "{who}：{word}（{n}）",
      "teaNoteTakes": "认{list}",
      "teaNoteRefuses": "不受{list}",
      "teaNoteMood": "今夜{word}（{n}）- 要{need}",
      "teaNoteGrudge": "仍不受：{list}",
      "teaNoteHeard": "{who}：认{take}，听{from}说的",
      "teaNoteRumour": "{who}：听说认{take}，出自{from}",
      "teaNothing": "还不知情",
      "teaMoodHush": "{who}还没开口说今夜的事。",
      "teaNoteEmpty": "人情账里还没有味道。",
      "teaRumourTag": "道听途说，未经证实",
      "teaCupPoured": "这壶已尽",
      "teaCupRefused": "{names}不受这杯",
      "teaLogEmpty": "还没人从桌上起身。",
      "teaOpenLine": "灯已点着。请人坐下吧。",
      "teaNoBeats": "今夜的节拍用完了。",
      "teaEmptyChair": "座上还没人。",
      "teaOneAtATime": "一次只坐一位。",
      "teaNoMoreGuests": "堂里已经没人了。",
      "teaNothingMore": "这位该说的都说完了。",
      "teaNoMoreTales": "今夜没有别的话可听了。",
      "teaNightHush": "今夜已经收了。请开下一夜。",
      "teaNightStillOpen": "今夜还没收。",
      "teaHouseClosed": "茶馆打烊了。重开一坐吧。",
      "teaNotOnTray": "今夜茶盘上没这杯。",
      "teaPotDone": "这壶今夜已经倒尽了。",
      "teaNoSuchCup": "本店没这种茶。",
      "teaUnknownTurn": "堂上等着一个真的动作。",
      "teaPaused": "回来时{who}还坐在座上。",
      "teaToldMood": "{who}不用你问就说了：{word}（{n}），要{need}。",
      "teaSeatedQuiet": "{who}坐下——{word}（{n}）——还不开口。",
      "teaHeardMood": "{who}：{word}（{n}），要{need}",
      "teaHeardMoodLine": "{who}：{word}（{n}），要{need}。{why}",
      "teaHeardTake": "{who}：认{take}",
      "teaHeardTakeLine": "{who}——认{take}。{why}",
      "teaGossipLine": "{from}说起{who}：认{take}。{why}",
      "teaRumourLine": "{from}咬定{who}认{take}。{why}",
      "teaWhySooth": "一杯{cup}把{obj}安下了——{subj}今夜要的是{need}，{poss}茶认{take}。情分{word}（{n}）。",
      "teaWhyFlat": "{cup}客客气气，却碰不上{subj}要的那口{need}，{who}还是把它喝了。",
      "teaWhyCut": "{cup}里的{cut}冲犯了{obj}。{subj}往后不再从你这柜台受{cut}。情分{word}（{n}）。",
      "teaWhyRefuse": "{who}把{cup}推回来没看——你们之间的{cut}还没消。",
      "teaWhyDry": "节拍用尽，{who}没轮上：杯子终究没讨来。",
      "teaNightOpen": "第 {n} 夜开场，共 {m} 夜。人情账记着学来的东西。",
      "teaNightOpenLine": "第 {n} 夜开场，共 {m} 夜——拿已经知道的去倒。",
      "teaNightTally": "第 {n} 夜收：安下 {s} 位，冲犯 {c} 位，客气 {f} 位，推回 {r} 位，共 {p} 座。",
      "teaWin": "满堂和气收店：{n} 夜倒 {p} 壶，安下 {s} 位，得 {st} 星。",
      "teaLose": "没够着本：{n} 夜倒了 {p} 壶，只安下 {s} 位，要 {t} 位。",
      "teaLogWin": "在茶馆安下了 {s} 位客人",
      "teaStarWord": " 星",
      "teaBest": "最优 {n}，目标 {t}，星档 {h}",
      "teaCopyProblem": "文案问题（{n}）：",
      "teaHint": "先听再倒。还不知道这杯是谁的，它就还不算好茶。"
    }
  });

  App.registerGame({
    name: "teaHouse",
    tabKey: "tabTeaHouse",
    init: initTeaHouseGame,
    guide: {
      svg:
        '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="4" y="52" width="112" height="18" rx="4" fill="rgba(30,41,59,.75)" stroke="rgba(148,163,184,.45)"/>' +
        '<path d="M28 30h24v14a12 12 0 0 1-24 0z" fill="none" stroke="#fbbf24" stroke-width="2"/>' +
        '<path d="M52 34c8 0 8 8 0 8" fill="none" stroke="#fbbf24" stroke-width="2"/>' +
        '<path d="M24 30h32" stroke="#fbbf24" stroke-width="2"/>' +
        '<path d="M70 42h10v10a5 5 0 0 1-10 0z" fill="none" stroke="#22d3ee" stroke-width="2"/>' +
        '<path d="M86 42h10v10a5 5 0 0 1-10 0z" fill="none" stroke="#fb7185" stroke-width="2"/>' +
        '<path d="M74 36c2-3 0-5 2-8M90 36c2-3 0-5 2-8" stroke="rgba(148,163,184,.6)" stroke-width="1.5" fill="none"/>' +
        '<rect x="6" y="8" width="20" height="15" rx="2" fill="none" stroke="#a3e635" stroke-width="2"/>' +
        '<path d="M10 13h12M10 18h12" stroke="#a3e635" stroke-width="1.5"/></svg>',
      en: [
        "Aim: seat the guests, pour a cup that settles each one, and close the sitting with the target number of guests soothed.",
        "Action: press 1 to seat, 2 to listen, 3 to converse, and 4 to 9 to pour a cup - every one of them spends a beat.",
        "Rule: a cup only soothes when it carries what the guest needs tonight and a taste that guest takes, so nothing on the tray is good by itself.",
        "Rule: what you hear stays in the notebook for the whole sitting, but a mood is live, so tonight's has to be heard again.",
        "Watch out: a wrong cup offends, and an offended guest keeps that taste and will not sit your way again.",
        "Scoring: stars count guests soothed across the sitting, and the bands are measured off the exported best line."
      ],
      zh: [
        "目标：请客人入座，倒一杯能把他安抚下的茶，收场时安下的人数要够着茶座的本。",
        "操作：按 1 请坐，按 2 听，按 3 攀话，按 4 到 9 倒茶——每一步都吃一个节拍。",
        "规则：一杯茶只有装了这位今夜要的、又是他认的味道才安抚人，茶盘上没有哪杯天生就好。",
        "规则：听到的都记进人情账，整场都在；可心气是活的，今夜那份得重新听。",
        "小心：倒错了就冲犯人，客人会记着这个味，往后再也不坐你这一头。",
        "计分：星数看整场安下了几位，档位是从导出的最优线 replay 量出来的。"
      ]
    }
  });
  /* Exported for the other modules, the prover and the harness. */
  App.teaNight = function (state, action) { return teaStep(teaSafeState(state), action || {}); };
  App.teaDeal = function (spec) { return teaDeal(teaLevelGet(spec) || teaLevels[0]); };
  App.teaSolve = teaSolve;
  App.teaBestLine = teaBestLine;
  App.teaBeatable = teaBeatable;
  App.teaBands = teaBands;
  App.teaCupResult = function (state, gid, drinkId) { return teaCupResult(teaSafeState(state), gid, drinkId); };
  App.teaProvenSoothe = function (state, gid, drinkId) { return teaProvenSoothe(teaSafeState(state), gid, drinkId); };
  App.teaDrinks = teaDrinks;
  App.teaGuests = teaGuests;
  App.teaLevels = teaLevels;
  App.teaMoods = teaMoods;
  App.teaTokens = teaTokens;
  App.teaCopyCheck = teaCopyCheck;
  App.initTeaHouseGame = initTeaHouseGame;
})(window.CapitalConvert = window.CapitalConvert || {});
