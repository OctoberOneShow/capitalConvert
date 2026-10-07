/* Archive Escape - a branching night in a closed municipal archive.
 * The story is a graph, not a script: rooms, items, flags and five clue tiles
 * decide which choices are live, and the whole table is proved solvable by a
 * breadth-first walk over states before the first page is ever dealt. */
(function (App) {
  var t = App.t;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  var createCampaign = App.createCampaign;
  var fillCampaignPicker = App.fillCampaignPicker;
  var starsFor = App.starsFor;

  var arcClueTotal = 5;

  /* Presentation-only fallbacks: the isolated verifier boots without the feel
   * layer, so every beat below has to be allowed to simply not happen. */
  function noop() {}

  function motionOff() {
    return App.isMotionOff
      ? App.isMotionOff()
      : document.documentElement.getAttribute("data-motion") === "off";
  }

  /* One motif per room, ending, item and clue tile, so the satchel reads as
   * objects rather than sentences. Keys are story data names - the maps only
   * choose pictures, never behaviour. */
  var arcRoomArt = { front: "lantern", plant: "gear", stacks: "book", ledger: "chest", roof: "moon" };
  var arcSceneArt = {
    front: { icon: "lantern", minis: ["envelope", "key"], pattern: "felt" },
    plant: { icon: "gear", minis: ["bolt", "valve"], pattern: "planks" },
    stacks: { icon: "book", minis: ["scroll", "quill"], pattern: "weave" },
    ledger: { icon: "chest", minis: ["book", "coin"], pattern: "marble" },
    roof: { icon: "moon", minis: ["rain", "cloud"], pattern: "stars" },
  };
  var arcEndingArt = { ledger: "book", roof: "moon", secret: "crystal" };
  var arcItemArt = { key: "key", card: "card", lamp: "lantern", rope: "chain", chit: "stamp", tea: "flask", ledger: "book" };
  var arcClueArt = { c1: "card", c2: "map", c3: "scroll", c4: "magnifier", c5: "wave" };

  /* Same map, five escalating nights; the star bands are measured off the
   * solved minimum turn count for each goal, not authored here. */
  var arcLevels = [
    { id: "a1", labelKey: "arcZ1", goal: "any" },
    { id: "a2", labelKey: "arcZ2", goal: "ledger" },
    { id: "a3", labelKey: "arcZ3", goal: "roof" },
    { id: "a4", labelKey: "arcZ4", goal: "clues" },
    { id: "a5", labelKey: "arcZ5", goal: "secret" },
  ];

  /* A choice may ask for an item, a flag or one named clue; a room hands back
   * its own item, flag or clue the moment you step into it. Revisiting a room
   * is therefore always safe - you simply already have what it offers. */
  var arcNodes = [
    {
      id: "lobby", room: "front",
      en: "The archive closed at nine and only one lamp is still down. Rain comes in through the letter slot and ticks in the bucket someone left under it. Front desk, stairwell, lift doors - all of them waiting in the same grey dark.",
      zh: "档案馆九点关门，只剩门口那盏灯还亮着。雨从投信口漏进来，滴在谁放的桶里。前台、楼梯间、电梯门，都在同一片灰暗中等着。",
      choices: [
        { to: "desk", en: "Rifle the front desk", zh: "翻检前台" },
        { to: "stair", en: "Take the stairwell door", zh: "推开楼梯间的门" },
        { to: "lift", en: "Try the lift doors", zh: "试试电梯门" },
      ],
    },
    {
      id: "desk", room: "front", give: "key", clue: "c1",
      en: "Drawers of blotters, a jar of pencils worn to nubs, a sign-out book nobody has signed since March. A brass key was left under it, and a folded tram ticket was left inside the key.",
      zh: "抽屉里全是吸墨纸，铅笔罐里的笔都用到握不住了，签到本从三月起没人动过。铜钥匙压在本子下面，钥匙里还卷着一张电车月票。",
      choices: [
        { to: "drawer", need: { item: "key" }, en: "Force the locked drawer", zh: "撬开上锁的抽屉" },
        { to: "stair", en: "Leave it and take the stairwell", zh: "不管了，去楼梯间" },
        { to: "lobby", en: "Back to the lobby", zh: "回大厅" },
      ],
    },
    {
      id: "drawer", room: "front", give: "card",
      en: "The drawer opens with a sigh. Inside: a spare keycard still in its sleeve, a rubber band of overdue notices, and no cash, as ever in a public building.",
      zh: "抽屉一拉就叹气似的开了。里面：一张还带着封套的备用门禁卡，一捆过期通知，以及和所有公共建筑一样多的现金——零。",
      choices: [
        { to: "lift", en: "Take the card to the lift", zh: "带着卡去电梯" },
        { to: "stair", en: "Take the card to the stairwell", zh: "带着卡去楼梯间" },
        { to: "lobby", en: "Back to the lobby", zh: "回大厅" },
      ],
    },
    {
      id: "lift", room: "front",
      en: "The lift doors stand an inch apart on a black shaft. The button gives a tired click and nothing else: the car only answers when the plant floor has power.",
      zh: "电梯门开了一指宽，里面是一条黑竖井。按钮疲惫地响了一声，然后就没动静了：只有机房通电，轿厢才会理你。",
      choices: [
        { to: "landing", need: { flag: "power" }, en: "Ride it up to the stacks", zh: "坐它上书架层" },
        { to: "lobby", en: "Leave it and go back", zh: "算了，回去" },
      ],
    },
    {
      id: "stair", room: "plant",
      en: "Concrete steps down to the plant floor, and a fire door halfway up that lets onto the stacks. Both are unlatched. Neither is warm.",
      zh: "水泥台阶向下通往机房，半层上一扇防火门通到书架区。两扇都没上锁，也都不暖和。",
      choices: [
        { to: "breaker", en: "Down to the plant floor", zh: "下机房" },
        { to: "landing", en: "Through the fire door into the stacks", zh: "穿防火门进书架区" },
        { to: "desk", en: "Up to the front desk", zh: "上前台" },
        { to: "lobby", en: "Up to the lobby", zh: "上大厅" },
      ],
    },
    {
      id: "breaker", room: "plant",
      en: "The breaker panel hangs off one bracket, and its switches are printed with room names instead of numbers. Whoever made this panel wanted the next person to guess.",
      zh: "配电屏少了一只支架，歪挂着；开关上标的是房间名而不是编号。装这屏的人，是存心让下一个人猜。",
      choices: [
        { to: "powerOn", en: "Throw the main breaker", zh: "合上总闸" },
        { to: "shelf", en: "Rummage the workbench shelf", zh: "翻工作台的架子" },
        { to: "stair", en: "Back up the stair", zh: "回楼梯" },
      ],
    },
    {
      id: "powerOn", room: "plant", set: "power",
      en: "Power returns with a shudder. Grilles begin to turn, the plant floor stops being a cave, and far overhead a hatch motor gives one short affirmative honk.",
      zh: "电一回来，整层楼打了个寒噤。通风格栅转了起来，机房不再是洞穴；头顶很远处，天窗的马达短促地应了一声。",
      choices: [
        { to: "shelf", en: "Take the workbench shelf", zh: "去翻工作台的架子" },
        { to: "stair", en: "Back up the stair", zh: "回楼梯" },
        { to: "landing", en: "Up to the stacks", zh: "上书架区" },
      ],
    },
    {
      id: "shelf", room: "plant", give: "lamp",
      en: "Fuses in a biscuit tin, a hand lamp on a cord, and a clipboard with the last coolant log still clipped to it. The lamp works, which is more than you can say for the tin.",
      zh: "饼干盒里装保险丝，架子上一盏手提灯还带着线，旁边一块板夹着最后一份冷却液记录。灯是好的——这比饼干盒强。",
      choices: [
        { to: "sump", need: { item: "lamp" }, en: "Take the lamp down to the sump", zh: "带灯下到集水坑" },
        { to: "breaker", en: "Back to the panel", zh: "回配电屏" },
        { to: "stair", en: "Up the stair to the lobby", zh: "经楼梯上大厅" },
      ],
    },
    {
      id: "sump", room: "plant", give: "rope", clue: "c3",
      en: "The sump is a knee-deep echo. The coolant log's last line was written in a hurry - valve four, night only - and an old hoist cable coils in the corner, still sound.",
      zh: "集水坑齐膝深，全是回声。冷却液记录的最后一行写得很急：四号阀，仅夜间。角落里盘着一条旧吊索，居然还很新。",
      choices: [
        { to: "shaft", en: "Climb the hoist ladder", zh: "爬吊装梯" },
        { to: "shelf", en: "Back up to the shelf", zh: "回架子" },
        { to: "stair", en: "Up to the stairwell", zh: "上楼梯间" },
      ],
    },
    {
      id: "shaft", room: "plant",
      en: "The hoist shaft is a brick throat with a ladder up one side. The cable drum above it has been greased recently, which means somebody maintained a route nobody logged.",
      zh: "吊装井是一段砖砌的喉咙，一侧有梯子上去。顶上缆盘刚上过油——有人维护过一条从没登记的路。",
      choices: [
        { to: "catwalk", need: { item: "rope" }, en: "Rig the cable and go up", zh: "挂上缆绳爬上去" },
        { to: "sump", need: { item: "lamp" }, en: "Down to the sump again", zh: "再下到集水坑" },
      ],
    },
    {
      id: "landing", room: "stacks",
      en: "Tall shelves and one green-shaded lamp left burning on the warden's desk. Aisle plaques hang like a timetable, the ledger room door waits at the far end, and the roof hatch is in the ceiling above it.",
      zh: "高高一排排书架，管理员桌上还亮着一盏绿罩灯。巷道牌挂得像时刻表；书架区尽头是台账室的门，门上方的天花板上是通往屋顶的天窗。",
      choices: [
        { to: "aisles", en: "Walk the aisles", zh: "走进巷道" },
        { to: "teacart", en: "Look at the warden's tea cart", zh: "去看看管理员的茶水车" },
        { to: "ledgerDoor", need: { item: "card" }, en: "Unlock the ledger room door", zh: "开台账室的门" },
        { to: "hatch", need: { flag: "power" }, en: "Put your shoulder under the roof hatch", zh: "顶着天花板上的天窗" },
        { to: "stair", en: "Back down the stair", zh: "下楼梯" },
      ],
    },
    {
      id: "aisles", room: "stacks",
      en: "Between the shelves your footsteps arrive a second late. Somebody has been re-shelving in the wrong order: the plaques no longer match the numbers stencilled on the floor.",
      zh: "书架之间，你的脚步声会慢半拍才回来。有人按错误的顺序重新上架过：巷道牌和地上印的编号已经对不上了。",
      choices: [
        { to: "plaques", en: "Read the plaques against the floor marks", zh: "把巷道牌和地上编号对一遍" },
        { to: "toolbox", need: { item: "key" }, en: "The warden's tool box, locked to the shelving", zh: "钉在书架上的管理员工具箱" },
        { to: "landing", en: "Back to the landing", zh: "回平台" },
      ],
    },
    {
      id: "plaques", room: "stacks", clue: "c2",
      en: "You match six plaques to six floor stencils. Five of them are lies. The one that is true names an aisle that was struck off the timetable in the spring.",
      zh: "你把六块牌对上六个地面编号，其中五块在说谎。唯一对得上的那一块，写的是一条春天就被划掉时刻表的巷道。",
      choices: [
        { to: "aisles", en: "Back between the shelves", zh: "回到书架间" },
        { to: "landing", en: "To the landing", zh: "去平台" },
      ],
    },
    {
      id: "teacart", room: "stacks", give: "tea",
      en: "A kettle, a cup still ringing with tea, a sandwich under glass like a museum piece. The cart has a hook for a coat and a pocket for whatever the warden was carrying.",
      zh: "一只水壶，一杯还在响的残茶，一块像展品一样罩在玻璃下的三明治。车上有个挂衣钩，还有一个装着管理员随身物的口袋。",
      choices: [
        { to: "landing", en: "Take the tea and go", zh: "端上茶走人" },
        { to: "aisles", en: "Take the tea into the aisles", zh: "端着茶进巷道" },
      ],
    },
    {
      id: "toolbox", room: "stacks", give: "chit",
      en: "The tool box takes the brass key and gives up a hammer, five blotters, and the night chit on its lanyard - the paper that gets a body past the ledger turnstile.",
      zh: "工具箱吃下铜钥匙，吐出一把锤子、五张吸墨纸，还有一张挂着颈带的夜间通行证——就是能让你过台账室转闸的那张纸。",
      choices: [
        { to: "aisles", en: "Pocket the chit and go back", zh: "收好通行证回去" },
        { to: "landing", en: "Pocket the chit and take the landing", zh: "收好通行证上平台" },
      ],
    },
    {
      id: "ledgerDoor", room: "stacks",
      en: "The ledger room door reads the card in about a quarter of a second, which is faster than anything else in this building. Beyond it a turnstile, and beyond the turnstile a room that smells of cold paper.",
      zh: "台账室的门刷一下读卡，只用了四分之一秒，比这栋楼里任何机器都快。门后是一道转闸，转闸后是一间冷气腾腾的纸味房间。",
      choices: [
        { to: "turnstile", need: { item: "chit" }, en: "Show the turnstile your chit", zh: "向转闸出示通行证" },
        { to: "landing", en: "Back to the landing", zh: "回平台" },
      ],
    },
    {
      id: "turnstile", room: "ledger",
      en: "The turnstile accepts the chit, counts you as one, and releases with a courtesy you did not expect from municipal hardware. The ledger room is a circle of desks under one dead chandelier.",
      zh: "转闸收下通行证，把你算作一个人，然后以公家设备少见的客气松开。台账室是一圈桌子，头顶是一盏灭了的水晶吊灯。",
      choices: [
        { to: "ledgerRoom", en: "Go in", zh: "进去" },
        { to: "ledgerDoor", en: "Back out through the door", zh: "退到门外" },
      ],
    },
    {
      id: "ledgerRoom", room: "ledger",
      en: "Nine desks, one of them still warm. The year's ledgers are on the trolley, and the strongbox stands open at the wall like a tooth that has already come out.",
      zh: "九张桌子，其中一张还是温的。当年的台账放在推车上，墙边的保险柜大敞着，像一颗已经松掉的牙。",
      choices: [
        { to: "strongbox", en: "Examine the strongbox", zh: "查看保险柜" },
        { to: "turnstile", en: "Out through the turnstile", zh: "从转闸出去" },
        { to: "landing", en: "All the way back to the landing", zh: "一路退回平台" },
      ],
    },
    {
      id: "strongbox", room: "ledger", clue: "c4",
      en: "The strongbox dial has five slots for five tiles, and the lid carries a row of pencil marks somebody made and never erased. Reading them needs the true aisle, not the printed one.",
      zh: "保险柜的转盘上有五个放牌片的槽，盖内一排铅笔印子——谁写的，谁没擦。要读懂它们，得靠那条真正的巷道，不是牌上印的那条。",
      choices: [
        { to: "ledgerOpen", need: { clue: "c2" }, en: "Set the dial and open the inner box", zh: "拨好转盘，开内柜" },
        { to: "endSecret", need: { clues: 5 }, en: "Lay all five tiles in the lid", zh: "把五块牌片全摆进盖内" },
        { to: "ledgerRoom", en: "Leave the box alone", zh: "别碰它" },
      ],
    },
    {
      id: "ledgerOpen", room: "ledger", give: "ledger",
      en: "Inside the inner box: the missing spring ledger, a bundle of correspondence dated after the fire, and a spine number stamped where no catalogue expects it.",
      zh: "内柜里：失踪的那本春季台账、一捆火灾之后寄出的信，还有一个书脊号——它被钉在任何目录都不该出现的位置。",
      choices: [
        { to: "endLedger", need: { flag: "power" }, en: "Carry it out past the shutters", zh: "抱着它越过卷帘门出去" },
        { to: "strongbox", en: "Put it back and look again", zh: "放回去，再看一眼" },
        { to: "landing", en: "Take it out to the stacks", zh: "把它抱到书架区" },
      ],
    },
    {
      id: "hatch", room: "roof",
      en: "The hatch motor wakes under your hands and the ceiling comes down like a slow eye. Rain comes in with it, and the smell of a roof at night, which is mostly iron.",
      zh: "天窗马达在你手下醒了，天花板像一只慢吞吞的眼睛降下来。雨水一同进来，还有夜里的屋顶味——基本上是铁味。",
      choices: [
        { to: "roof", en: "Climb through", zh: "爬过去" },
        { to: "landing", en: "Close it and go back down", zh: "关上，退回原处" },
      ],
    },
    {
      id: "roof", room: "roof",
      en: "The roof is wet, flat and larger than the building looked from the street. A catwalk runs to the parapet over the yard, and the city beyond it is doing fine without you.",
      zh: "屋顶又湿又平，比从街上看去要大得多。一道检修走道通向院子上空的矮墙，墙外的城市没有你也过得挺好。",
      choices: [
        { to: "catwalk", en: "Walk the catwalk", zh: "走检修道" },
        { to: "hatch", en: "Back down through the hatch", zh: "从天窗下去" },
      ],
    },
    {
      id: "catwalk", room: "roof", clue: "c5",
      en: "Halfway out, the gutter has been emptied on purpose: five notches filed in the channel, and the fifth one still has a paint chip from whoever filed it last month.",
      zh: "走到一半，才发现天沟是被谁清空的：沟里锉了五个凹口，第五个上还留着上月锉它那人蹭掉的一点漆。",
      choices: [
        { to: "endRoof", en: "Over the parapet and down the fire escape", zh: "翻过矮墙下消防梯" },
        { to: "roof", en: "Back across the roof", zh: "从屋顶折回" },
        { to: "shaft", en: "Down the hoist shaft to the plant", zh: "顺吊装井下到机房" },
      ],
    },
    {
      id: "endLedger", room: "ledger", ending: "ledger",
      en: "The shutters lift on power and you walk a spring ledger out into the rain, past the letter slot, into a night that has no idea what it just got.",
      zh: "卷帘门通着电升起来，你就这样抱着一本春季台账走进雨里，经过投信口，走进一个完全不知道自己刚刚收到了什么的夜里。",
      choices: [
        { to: "lobby", en: "Start the night over, properly", zh: "把这一夜重新走一遍" },
        { to: "catwalk", en: "No - take the roof instead", zh: "不，还是走屋顶" },
      ],
    },
    {
      id: "endRoof", room: "roof", ending: "roof",
      en: "The fire escape rings under you and lets you go. Two streets away you stop running and find you are holding your breath, and nothing has been taken out of the building except the weather.",
      zh: "消防梯在你脚下响了一声，然后放你走。跑出两条街你才停下来，发现自己一直屏着呼吸——从楼里出来的，除了天气，什么都没有。",
      choices: [
        { to: "lobby", en: "Go back in at the front desk", zh: "从前台再进去" },
        { to: "landing", en: "Re-enter through the stacks", zh: "从书架区再进去" },
      ],
    },
    {
      id: "endSecret", room: "ledger", ending: "secret",
      en: "Five tiles, five notches, one true aisle. The box prints a name nobody typed: the archive's own, and the date it was supposed to burn. You came out of the wrong year with the reason written down.",
      zh: "五块牌片，五个凹口，一条真正的巷道。柜子里印出一个没人输过的名字：档案馆自己，以及它本该烧掉的那天。你从错误的一年走出来，手里还拿着写下来的原因。",
      choices: [
        { to: "lobby", en: "Begin again and check your work", zh: "从头再来，检查一下自己" },
      ],
    },
  ];

  /* --- pure core ---------------------------------------------------------- */
  function arcGraph() {
    return arcNodes;
  }

  function arcNode(id) {
    for (var i = 0; i < arcNodes.length; i += 1) {
      if (arcNodes[i].id === id) {
        return arcNodes[i];
      }
    }
    return null;
  }

  function arcCopy(source) {
    var copy = {};
    var key;
    if (source) {
      for (key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          copy[key] = source[key];
        }
      }
    }
    return copy;
  }

  function arcCount(set) {
    var n = 0;
    var key;
    for (key in set) {
      if (Object.prototype.hasOwnProperty.call(set, key)) {
        n += 1;
      }
    }
    return n;
  }

  function arcStart() {
    return { node: "lobby", items: {}, flags: {}, clues: {}, turns: 0 };
  }

  /* A move is pure and total: it either cannot be taken (arcCan says so) or it
   * returns the state on the far side of it. Rooms hand over their contents on
   * arrival, so the grant travels with the place, not with the route in. */
  function arcApply(state, choice) {
    var next = {
      node: choice.to,
      items: arcCopy(state.items),
      flags: arcCopy(state.flags),
      clues: arcCopy(state.clues),
      turns: state.turns + 1,
    };
    var donor = arcNode(choice.to) || {};
    var grants = [
      [next.items, choice.give || donor.give],
      [next.flags, choice.set || donor.set],
      [next.clues, choice.clue || donor.clue],
    ];
    for (var i = 0; i < grants.length; i += 1) {
      if (grants[i][1]) {
        grants[i][0][grants[i][1]] = 1;
      }
    }
    return next;
  }

  function arcCan(state, choice) {
    var need = choice.need;
    if (!need) {
      return true;
    }
    if (need.item && !state.items[need.item]) {
      return false;
    }
    if (need.flag && !state.flags[need.flag]) {
      return false;
    }
    if (need.clue && !state.clues[need.clue]) {
      return false;
    }
    if (need.clues && arcCount(state.clues) < need.clues) {
      return false;
    }
    return true;
  }

  function arcKeys(set) {
    var list = [];
    var key;
    for (key in set) {
      if (Object.prototype.hasOwnProperty.call(set, key)) {
        list.push(key);
      }
    }
    return list.sort().join(",");
  }

  /* The name of whatever a move added, for the line that reports it. */
  function arcDiffKey(before, after) {
    var wanted = arcKeys(after).split(",");
    var had = before.split(",");
    for (var i = 0; i < wanted.length; i += 1) {
      if (wanted[i] && had.indexOf(wanted[i]) === -1) {
        return wanted[i];
      }
    }
    return wanted[wanted.length - 1] || "";
  }

  function arcStateKey(state) {
    return state.node + "|" + arcKeys(state.items) + "|" + arcKeys(state.flags) + "|" + arcKeys(state.clues);
  }

  function arcGoalMet(goal, state) {
    var node = arcNode(state.node);
    var ending = node ? node.ending : null;
    if (!ending) {
      return false;
    }
    if (goal === "any") {
      return true;
    }
    if (goal === "clues") {
      return arcCount(state.clues) >= arcClueTotal;
    }
    return ending === goal;
  }

  /* The deal-time proof. Breadth first over whole states, so a route can only
   * be counted when the key, the card, the chit and the clues are actually in
   * the pocket that took it. */
  var arcSolved = null;

  function arcSolve() {
    if (arcSolved) {
      return arcSolved;
    }
    var start = arcStart();
    var seen = {};
    var queue = [start];
    var reached = {};
    var endings = {};
    var best = {};
    var head = 0;
    var guard = 0;
    seen[arcStateKey(start)] = 1;
    reached.lobby = 1;
    while (head < queue.length && guard < 40000) {
      var state = queue[head];
      head += 1;
      var node = arcNode(state.node);
      if (!node) {
        continue;
      }
      if (node.ending && !endings[node.ending]) {
        endings[node.ending] = state.turns;
      }
      for (var c = 0; c < node.choices.length; c += 1) {
        var next = arcApply(state, node.choices[c]);
        var key = arcStateKey(next);
        guard += 1;
        if (seen[key]) {
          continue;
        }
        seen[key] = 1;
        reached[next.node] = 1;
        queue.push(next);
      }
    }
    var goals = ["any", "ledger", "roof", "clues", "secret"];
    var turns = {};
    var i;
    for (i = 0; i < goals.length; i += 1) {
      turns[goals[i]] = null;
    }
    /* Re-read the frontier for the cheapest state that satisfies each goal. */
    var scan = {};
    var list = [];
    for (i = 0; i < queue.length; i += 1) {
      list.push(queue[i]);
    }
    list.sort(function (a, b) {
      return a.turns - b.turns;
    });
    for (i = 0; i < list.length; i += 1) {
      var candidate = list[i];
      var marked = arcNode(candidate.node);
      if (!marked || !marked.ending) {
        continue;
      }
      for (var g = 0; g < goals.length; g += 1) {
        if (turns[goals[g]] === null && arcGoalMet(goals[g], candidate)) {
          turns[goals[g]] = candidate.turns;
        }
      }
    }
    var orphans = [];
    var starving = [];
    var granted = {};
    var cluesSeen = {};
    for (i = 0; i < arcNodes.length; i += 1) {
      var each = arcNodes[i];
      if (!each.choices.length) {
        orphans.push(each.id);
      }
      var donors = each.choices.concat([each]);
      for (var d = 0; d < donors.length; d += 1) {
        var donor = donors[d];
        if (donor.give) {
          granted[donor.give] = 1;
        }
        if (donor.set) {
          granted[donor.set] = 1;
        }
        if (donor.clue) {
          cluesSeen[donor.clue] = 1;
        }
      }
      for (var k = 0; k < each.choices.length; k += 1) {
        if (!reached[each.choices[k].to]) {
          starving.push(each.choices[k].to);
        }
      }
    }
    var unsatisfied = [];
    for (i = 0; i < arcNodes.length; i += 1) {
      var src = arcNodes[i];
      if (!reached[src.id]) {
        continue;
      }
      for (var n = 0; n < src.choices.length; n += 1) {
        var ask = src.choices[n].need;
        if (!ask) {
          continue;
        }
        if ((ask.item && !granted[ask.item]) || (ask.flag && !granted[ask.flag])) {
          unsatisfied.push(src.id + ":" + (ask.item || ask.flag));
        }
      }
    }
    var missingClues = [];
    for (i = 1; i <= arcClueTotal; i += 1) {
      if (!cluesSeen["c" + i]) {
        missingClues.push("c" + i);
      }
    }
    arcSolved = {
      ok: orphans.length === 0 &&
        missingClues.length === 0 &&
        unsatisfied.length === 0 &&
        !!endings.ledger &&
        !!endings.roof &&
        countReached(reached) === arcNodes.length,
      states: queue.length,
      reached: countReached(reached),
      total: arcNodes.length,
      endings: endings,
      turns: turns,
      orphans: orphans,
      unsatisfied: unsatisfied,
      missingClues: missingClues,
    };
    return arcSolved;
  }

  function countReached(reached) {
    return arcKeys(reached).split(",").filter(Boolean).length;
  }

  /* Bands come out of the solved minimum turns, never out of a guess. */
  function arcBands(goal) {
    var proof = arcSolve();
    var min = proof.turns[goal];
    if (!(min > 0)) {
      min = 24;
    }
    return [min + 3, min + 7, min + 13];
  }

  App.archiveGraph = arcGraph;
  App.archiveSolve = arcSolve;
  App.archiveApply = arcApply;
  App.archiveCan = arcCan;
  App.archiveStart = arcStart;
  App.archiveNode = arcNode;
  App.archiveLevels = arcLevels;

  function initArchiveEscapeGame(panelEl) {
    if (!panelEl) {
      return;
    }

    var campaign = createCampaign({ key: "archive-escape-campaign", levels: arcLevels });
    var firstIndex = campaign.indexOf(campaign.nextLevelId());
    var level = arcLevels[firstIndex < 0 ? 0 : firstIndex];
    var proof = arcSolve();
    var state = arcStart();
    var trail = [];
    var bands = arcBands(level.goal);
    var over = false;

    var art = App.art;
    var fx = App.fx || {
      pop: noop,
      shake: noop,
      ring: noop,
      burst: noop,
      floatText: noop,
      stagger: noop,
      countUp: noop,
      sweep: noop,
      jolt: noop,
      flash: noop,
      ceremony: noop,
    };
    var playSfx = App.playSfx || noop;
    var canDraw = !!(art && art.icon && art.scene && art.pattern);
    var hue = 42;
    /* Deferred beats. The ending ceremony must not fire inside the click's own
     * dispatch: the host dismisses a ceremony on click, and the very event that
     * ended the night is still bubbling when the listener is registered. */
    var fxTimers = [];

    function later(fn, ms) {
      var id = window.setTimeout(function () {
        var at = fxTimers.indexOf(id);
        if (at >= 0) {
          fxTimers.splice(at, 1);
        }
        fn();
      }, ms);
      fxTimers.push(id);
      return id;
    }

    function clearFxTimers() {
      fxTimers.forEach(function (id) {
        window.clearTimeout(id);
      });
      fxTimers = [];
    }

    /* --- markup ---------------------------------------------------------- */
    var hud = document.createElement("div");
    hud.className = "game-hud";
    var turnEl = document.createElement("strong");
    var clueEl = document.createElement("strong");
    var roomEl = document.createElement("strong");
    var goalEl = document.createElement("strong");
    hud.appendChild(makeStat("arcTurnLabel", turnEl));
    hud.appendChild(makeStat("arcClueLabel", clueEl));
    hud.appendChild(makeStat("arcRoomLabel", roomEl));
    hud.appendChild(makeStat("arcGoalLabel", goalEl));

    var wrap = document.createElement("div");
    wrap.className = "arc-wrap";
    var stage = document.createElement("div");
    stage.className = "arc-stage";
    stage.setAttribute("tabindex", "0");
    stage.setAttribute("aria-label", t("arcFieldLabel"));
    /* The illustrated strip above the prose: patterned ground, the room's motif
     * and two small props, rebuilt whenever the story changes rooms. */
    var sceneStrip = document.createElement("div");
    sceneStrip.className = "arc-scene";
    var roomLine = document.createElement("div");
    roomLine.className = "arc-roomline";
    var roomMark = document.createElement("div");
    roomMark.className = "arc-roommark";
    var roomTitle = document.createElement("p");
    roomTitle.className = "arc-room";
    roomLine.appendChild(roomMark);
    roomLine.appendChild(roomTitle);
    var prose = document.createElement("p");
    prose.className = "arc-prose";
    var choiceBox = document.createElement("div");
    choiceBox.className = "arc-choices";
    stage.appendChild(sceneStrip);
    stage.appendChild(roomLine);
    stage.appendChild(prose);
    stage.appendChild(choiceBox);

    var ledger = document.createElement("div");
    ledger.className = "arc-ledger";
    var roomsRow = makeRow("arcRoomsLabel");
    var kitRow = makeRow("arcKitLabel");
    var cluesRow = makeRow("arcCluesLabel");
    ledger.appendChild(roomsRow.node);
    ledger.appendChild(kitRow.node);
    ledger.appendChild(cluesRow.node);
    wrap.appendChild(stage);
    wrap.appendChild(ledger);

    var result = document.createElement("p");
    result.className = "game-result";
    result.setAttribute("role", "status");

    var nightRow = document.createElement("div");
    nightRow.className = "elements-row";
    var nightLabel = document.createElement("label");
    nightLabel.className = "elements-label";
    nightLabel.setAttribute("for", "arcNightSel");
    nightLabel.setAttribute("data-i18n", "arcNightSelectLabel");
    nightLabel.textContent = t("arcNightSelectLabel");
    var nightSel = document.createElement("select");
    nightSel.className = "elements-select";
    nightSel.id = "arcNightSel";
    nightRow.appendChild(nightLabel);
    nightRow.appendChild(nightSel);

    var actions = document.createElement("div");
    actions.className = "game-actions";
    var againBtn = document.createElement("button");
    againBtn.type = "button";
    againBtn.className = "primary";
    var againLabel = document.createElement("span");
    againLabel.setAttribute("data-i18n", "arcBtnAgain");
    againLabel.textContent = t("arcBtnAgain");
    var againContent = document.createElement("span");
    againContent.className = "button-content";
    againContent.appendChild(againLabel);
    againBtn.appendChild(againContent);
    var bestEl = document.createElement("p");
    bestEl.className = "game-best";
    actions.appendChild(againBtn);
    actions.appendChild(bestEl);

    var hint = document.createElement("p");
    hint.className = "game-hint";
    hint.setAttribute("data-i18n", "arcHint");
    hint.textContent = t("arcHint");

    [hud, wrap, result, nightRow, actions, hint].forEach(function (node) {
      panelEl.appendChild(node);
    });

    if (canDraw) {
      /* A corridor of shelves behind everything: the archive at night, one
       * warm lamp down the hall. */
      var backdrop = document.createElement("div");
      backdrop.className = "arc-backdrop";
      backdrop.setAttribute("aria-hidden", "true");
      backdrop.appendChild(art.scene("dungeon", { hue: hue, sat: 46 }));
      panelEl.insertBefore(backdrop, panelEl.firstChild);
    }

    function arcIcon(name, opts) {
      var o = opts || {};
      o.hue = hue;
      return art.icon(art.has(name) ? name : "sparkle", o);
    }

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

    function makeRow(key) {
      var node = document.createElement("p");
      node.className = "arc-row";
      var label = document.createElement("span");
      label.className = "arc-row-label";
      label.setAttribute("data-i18n", key);
      label.textContent = t(key);
      var body = document.createElement("span");
      body.className = "arc-row-body";
      node.appendChild(label);
      node.appendChild(body);
      return { node: node, body: body };
    }

    function cap(name) {
      return name.charAt(0).toUpperCase() + name.slice(1);
    }

    function itemLabel(id) {
      return t("arcIt" + cap(id));
    }

    function roomLabel(room) {
      return t("arcRoom" + cap(room));
    }

    function flagLabel(flag) {
      return t("arcFlag" + cap(flag));
    }

    function goalLabel(goal) {
      return t("arcGoal" + cap(goal));
    }

    function endingLabel(ending) {
      return t("arcEnd" + cap(ending));
    }

    function needLabel(need) {
      if (!need) {
        return "";
      }
      if (need.item) {
        return itemLabel(need.item);
      }
      if (need.flag) {
        return flagLabel(need.flag);
      }
      if (need.clue) {
        return clueLabel(need.clue);
      }
      return t("arcCluesAll", { n: need.clues });
    }

    function clueLabel(id) {
      var index = id.slice(1);
      return t("arcClue" + index);
    }

    function refreshPicker() {
      fillCampaignPicker(
        nightSel,
        campaign,
        function (def) {
          return t(def.labelKey);
        },
        t("elementsLocked"),
      );
      nightSel.value = level.id;
      bestEl.textContent = t("campaignStars", {
        n: campaign.totalStars(),
        max: campaign.maxStars(),
      });
    }

    /* The standing report: rooms mapped, satchel, clues - each entry a drawn
     * chip rather than a word, because objects should look like objects.
     * Nothing is ever asked of the player's memory. */
    function renderChips(body, entries, emptyLabel) {
      body.textContent = "";
      if (!entries.length) {
        body.textContent = emptyLabel;
        return;
      }
      for (var i = 0; i < entries.length; i += 1) {
        var chip = document.createElement("span");
        chip.className = "arc-chip";
        if (canDraw && entries[i].icon) {
          var ico = document.createElement("span");
          ico.className = "arc-chip-ico";
          ico.appendChild(arcIcon(entries[i].icon, { sat: 62, tone: "soft" }));
          chip.appendChild(ico);
        }
        var label = document.createElement("span");
        label.textContent = entries[i].label;
        chip.appendChild(label);
        body.appendChild(chip);
      }
    }

    function renderLedger(visited) {
      var roomChips = [];
      var order = ["front", "plant", "stacks", "ledger", "roof"];
      for (var i = 0; i < order.length; i += 1) {
        if (visited[order[i]]) {
          roomChips.push({ icon: arcRoomArt[order[i]], label: roomLabel(order[i]) });
        }
      }
      renderChips(roomsRow.body, roomChips, t("arcRoomsNone"));
      var kit = [];
      var key;
      for (key in state.items) {
        if (Object.prototype.hasOwnProperty.call(state.items, key)) {
          kit.push({ icon: arcItemArt[key], label: itemLabel(key) });
        }
      }
      renderChips(kitRow.body, kit, t("arcKitEmpty"));
      var found = [];
      for (key in state.clues) {
        if (Object.prototype.hasOwnProperty.call(state.clues, key)) {
          found.push({ icon: arcClueArt[key], label: clueLabel(key) });
        }
      }
      renderChips(cluesRow.body, found, t("arcClueNone"));
    }

    var visitedRooms = {};

    var shownTurns = 0;
    var shownClues = 0;

    function renderHud(roll) {
      var clues = arcCount(state.clues);
      if (roll) {
        fx.countUp(turnEl, shownTurns, state.turns);
        fx.countUp(clueEl, shownClues, clues, {
          format: function (v) {
            return v + "/" + arcClueTotal;
          },
        });
      } else {
        turnEl.textContent = String(state.turns);
        clueEl.textContent = clues + "/" + arcClueTotal;
      }
      shownTurns = state.turns;
      shownClues = clues;
      var node = arcNode(state.node);
      roomEl.textContent = node ? roomLabel(node.room) : "-";
      goalEl.textContent = goalLabel(level.goal);
    }

    var currentRoomKey = "";

    function roomArtKey(node) {
      if (node && node.ending && arcEndingArt[node.ending]) {
        return "end-" + node.ending;
      }
      return node ? node.room : "front";
    }

    /* The picture of where you are: medallion beside the title, patterned strip
     * with the room's motif and props above it. Rebuilt only when the room or
     * ending actually changes, so revisits do not flicker. */
    function renderRoomArt(node) {
      if (state.flags.power) {
        stage.classList.add("is-lit");
      } else {
        stage.classList.remove("is-lit");
      }
      var key = roomArtKey(node);
      if (!canDraw || key === currentRoomKey) {
        return;
      }
      currentRoomKey = key;
      var spec = arcSceneArt[node ? node.room : "front"] || arcSceneArt.front;
      var mainIcon = (node && node.ending && arcEndingArt[node.ending]) || spec.icon;
      sceneStrip.textContent = "";
      sceneStrip.appendChild(art.pattern(spec.pattern, { hue: hue, sat: 40, tile: 22 }));
      var mainBox = document.createElement("div");
      mainBox.className = "arc-scene-main";
      mainBox.appendChild(arcIcon(mainIcon, { sat: 66 }));
      sceneStrip.appendChild(mainBox);
      for (var i = 0; i < spec.minis.length; i += 1) {
        var mini = document.createElement("div");
        mini.className = "arc-scene-mini arc-scene-mini-" + (i + 1);
        mini.appendChild(arcIcon(spec.minis[i], { sat: 52, tone: "soft" }));
        sceneStrip.appendChild(mini);
      }
      roomMark.textContent = "";
      roomMark.appendChild(arcIcon(mainIcon, { sat: 66 }));
      fx.pop(sceneStrip, { scale: 1.02, ms: 240 });
    }

    /* The genre's signature move: the room changes and the passage arrives like
     * ink settling rather than a swap of text. Guarded like every fx call so
     * [data-motion="off"] holds the page still. */
    function inkIn(el) {
      if (motionOff() || !el || typeof el.animate !== "function") {
        return;
      }
      try {
        el.animate([
          { opacity: 0, transform: "translateY(7px)" },
          { opacity: 1, transform: "translateY(0)" },
        ], { duration: 420, easing: "cubic-bezier(0.2,0.7,0.3,1)" });
      } catch (error) {
        /* animation is decoration */
      }
    }

    function setRoom(node) {
      prose.textContent = node ? (App.currentLang === "zh" ? node.zh : node.en) : "";
      roomTitle.textContent = node ? roomLabel(node.room) : "";
      renderRoomArt(node);
      inkIn(prose);
      fx.pop(roomMark, { scale: 1.12, ms: 260 });
    }

    /* Choices are real buttons: Tab and Enter come free, and the number keys
     * are only a shortcut over the same enabled list. A fresh room deals its
     * options in rather than having them appear. */
    function renderChoices() {
      var node = arcNode(state.node);
      choiceBox.textContent = "";
      if (!node) {
        return;
      }
      var dealt = [];
      for (var i = 0; i < node.choices.length; i += 1) {
        (function (index) {
          var choice = node.choices[index];
          var live = arcCan(state, choice);
          var btn = document.createElement("button");
          btn.type = "button";
          btn.className = "arc-choice";
          var lead = document.createElement("span");
          lead.className = "arc-choice-key";
          lead.textContent = String(index + 1);
          var text = document.createElement("span");
          text.className = "arc-choice-text";
          text.textContent = App.currentLang === "zh" ? choice.zh : choice.en;
          btn.appendChild(lead);
          btn.appendChild(text);
          if (!live) {
            btn.disabled = true;
            var why = document.createElement("span");
            why.className = "arc-choice-need";
            if (canDraw) {
              var lockChip = document.createElement("span");
              lockChip.className = "arc-need-ico";
              lockChip.appendChild(arcIcon("lock", { sat: 30 }));
              why.appendChild(lockChip);
            }
            why.appendChild(document.createTextNode(t("arcNeeds", { w: needLabel(choice.need) })));
            btn.appendChild(why);
          } else {
            dealt.push(btn);
          }
          btn.addEventListener("click", function () {
            take(index);
          });
          choiceBox.appendChild(btn);
        })(i);
      }
      fx.stagger(dealt, { kind: "drop", step: 42, ms: 300 });
    }

    function take(index) {
      if (over) {
        return;
      }
      var node = arcNode(state.node);
      if (!node || !node.choices[index]) {
        return;
      }
      var choice = node.choices[index];
      if (!arcCan(state, choice)) {
        result.textContent = t("arcLocked", { w: needLabel(choice.need) });
        fx.shake(stage, { dist: 5 });
        playSfx("wrong");
        return;
      }
      var before = arcCount(state.clues);
      var had = arcKeys(state.items);
      var hadFlags = arcKeys(state.flags);
      trail.push(state.node);
      if (trail.length > 60) {
        trail.shift();
      }
      state = arcApply(state, choice);
      var landed = arcNode(state.node);
      visitedRooms[landed ? landed.room : "front"] = 1;
      var notes = [];
      var gainedClue = arcCount(state.clues) > before;
      var gainedItem = arcKeys(state.items) !== had;
      var gainedFlag = arcKeys(state.flags) !== hadFlags;
      if (gainedClue) {
        notes.push(t("arcClueTaken", { n: arcCount(state.clues) }));
      }
      if (gainedItem) {
        notes.push(t("arcNoted"));
      }
      if (gainedFlag) {
        notes.push(t("arcFlagUp", { w: flagLabel(arcDiffKey(hadFlags, state.flags)) }));
      }
      setRoom(landed);
      renderChoices();
      renderLedger(visitedRooms);
      renderHud(true);
      /* The beat: one voice for the kind of thing that happened, and a ring on
       * whichever line of the ledger just changed. */
      playSfx(gainedFlag ? "levelup" : gainedClue ? "match" : gainedItem ? "coin" : "step");
      if (gainedClue) {
        fx.ring(cluesRow.node, { hue: 48 });
        fx.floatText(cluesRow.node, "+1", { kind: "good", hue: 48 });
      }
      if (gainedItem) {
        fx.ring(kitRow.node, { hue: 46 });
        fx.pop(kitRow.node, { scale: 1.03, ms: 220 });
      }
      if (gainedFlag) {
        fx.burst(stage, { kind: "spark", count: 16, hue: hue });
        fx.ring(stage, { hue: hue });
      }
      if (landed && landed.ending) {
        conclude(landed, notes);
        return;
      }
      result.textContent = notes.length ? notes.join(" ") : t("arcMoved", { n: state.turns });
    }

    function conclude(node, notes) {
      var met = arcGoalMet(level.goal, state);
      if (!met) {
        over = false;
        result.textContent = t("arcEndingOff", {
          g: endingLabel(node.ending),
          want: goalLabel(level.goal),
          n: state.turns,
        });
        fx.shake(stage, { dist: 6 });
        playSfx("wrong");
        return;
      }
      over = true;
      stage.classList.add("is-over");
      var starsWon = starsFor(state.turns, bands, "low");
      var outcome = campaign.record(level.id, { stars: starsWon, best: state.turns, better: "low" });
      var message = t("arcFiled", {
        g: endingLabel(node.ending),
        n: state.turns,
        s: starsWon,
      });
      if (outcome.isBest) {
        message += " " + t("newBest");
      }
      if (outcome.unlockedNext) {
        message += " " + t("arcNextNight");
      } else if (campaign.clearedCount() === arcLevels.length) {
        message += " " + t("arcAllNights");
      }
      result.textContent = message;
      logAction(t("logArchiveEscape", { n: state.turns, c: arcCount(state.clues) }));
      petNotifyGame(outcome.isBest || outcome.firstClear);
      refreshPicker();
      /* The night files itself: the ending arrives as a ceremony over the whole
       * panel, stars stamping in, instead of a sentence in the result line. */
      later(function () {
        fx.ceremony(panelEl, {
          tone: "win",
          stars: starsWon,
          title: endingLabel(node.ending),
          lines: [message],
        });
      }, 60);
    }

    function back() {
      if (over || !trail.length) {
        result.textContent = trail.length ? "" : t("arcNowhereBack");
        return;
      }
      var previous = trail.pop();
      state = {
        node: previous,
        items: state.items,
        flags: state.flags,
        clues: state.clues,
        turns: state.turns + 1,
      };
      var node = arcNode(previous);
      setRoom(node);
      renderChoices();
      renderHud(true);
      result.textContent = t("arcBack");
      playSfx("flip");
    }

    function speakClues() {
      var found = [];
      var key;
      for (key in state.clues) {
        if (Object.prototype.hasOwnProperty.call(state.clues, key)) {
          found.push(clueLabel(key));
        }
      }
      result.textContent = found.length
        ? t("arcClueList", { n: found.length, total: arcClueTotal, list: found.join(" \u00b7 ") })
        : t("arcClueNone");
      playSfx("tick");
    }

    function startNight(def) {
      level = def;
      bands = arcBands(level.goal);
      state = arcStart();
      trail = [];
      over = false;
      visitedRooms = { front: 1 };
      currentRoomKey = "";
      stage.classList.remove("is-over");
      clearFxTimers();
      var node = arcNode(state.node);
      setRoom(node);
      renderChoices();
      renderLedger(visitedRooms);
      renderHud(false);
      refreshPicker();
      result.textContent = t("arcObjective", {
        name: t(level.labelKey),
        want: goalLabel(level.goal),
        p: bands[0],
      });
      /* The night is dealt: HUD, passage and ledger arrive in one cascade. */
      fx.stagger([hud, wrap, nightRow, actions], { kind: "drop", step: 60, ms: 340 });
    }

    /* --- input ----------------------------------------------------------- */
    panelEl.addEventListener("keydown", function (event) {
      var index = Number(event.key) - 1;
      if (index >= 0 && index <= 3) {
        event.preventDefault();
        take(index);
        return;
      }
      if (event.key === "Backspace" || event.key === "Escape") {
        event.preventDefault();
        back();
        return;
      }
      if (event.key === "l" || event.key === "L") {
        event.preventDefault();
        speakClues();
      }
    });

    nightSel.addEventListener("change", function () {
      var index = campaign.indexOf(nightSel.value);
      if (index >= 0 && campaign.isUnlocked(nightSel.value)) {
        startNight(arcLevels[index]);
      }
    });

    againBtn.addEventListener("click", function () {
      startNight(level);
    });

    /* Pausing leaves the archive exactly as the player left it: only the prose
     * is restated, because nothing here runs a clock. A pending ceremony is
     * stopped, never the state. */
    App.quietResetArchiveEscape = function () {
      clearFxTimers();
      if (!over) {
        result.textContent = t("arcPaused", { n: state.turns });
      }
    };

    startNight(level);
    if (!proof.ok) {
      /* A broken edit should say so rather than ship a dead building. */
      result.textContent = t("arcGraphBroken");
    }
  }

  App.addStrings({
    en: {
      "tabArchiveEscape": "Archive Escape",
      "arcZ1": "Any Way Out",
      "arcZ2": "The Ledger Night",
      "arcZ3": "The Roof Night",
      "arcZ4": "All Five Tiles",
      "arcZ5": "The Wrong Year",
      "arcTurnLabel": "Turns",
      "arcClueLabel": "Clues",
      "arcRoomLabel": "Room",
      "arcGoalLabel": "Tonight",
      "arcNightSelectLabel": "Choose a night",
      "arcBtnAgain": "New Night",
      "arcFieldLabel": "Story passage and its choices; number keys 1 to 4 pick a choice, Backspace goes back, L lists clues",
      "arcRoomsLabel": "Mapped",
      "arcKitLabel": "Satchel",
      "arcCluesLabel": "Clues",
      "arcRoomsNone": "nothing yet",
      "arcKitEmpty": "empty",
      "arcClueNone": "no clue tiles yet",
      "arcNeeds": "needs {w}",
      "arcCluesAll": "all {n} clues",
      "arcMoved": "Turn {n}. The building settles around you.",
      "arcClueTaken": "A clue tile goes in the log.",
      "arcNoted": "Something is heavier in the satchel.",
      "arcFlagUp": "Changed: {w}.",
      "arcLocked": "That one still needs {w}.",
      "arcBack": "You retrace your steps. What you found stays found.",
      "arcNowhereBack": "There is no earlier passage to go back to.",
      "arcClueList": "{n}/{total} clues: {list}",
      "arcEndingOff": "You reached {g} in {n} turns, but tonight asked for {want}. Walk it again.",
      "arcFiled": "{g}, filed in {n} turns - {s} stars.",
      "arcNextNight": "Next night unlocked.",
      "arcAllNights": "Five nights, five ways out of it.",
      "arcPaused": "Paused at turn {n}. The archive keeps your place.",
      "arcGraphBroken": "The story map failed its own solvability proof. Report it.",
      "arcObjective": "{name}: {want}. The route is known to take {p} turns, so shorter is better.",
      "arcHint": "Number keys pick a choice, Backspace retraces, L reads the clues aloud. Greyed choices tell you what they want.",
      "logArchiveEscape": "Walked out of the archive in {n} turns with {c} clues",
      "arcRoomFront": "Front",
      "arcRoomPlant": "Plant",
      "arcRoomStacks": "Stacks",
      "arcRoomLedger": "Ledger",
      "arcRoomRoof": "Roof",
      "arcItKey": "\u26ff brass key",
      "arcItCard": "\u25ae keycard",
      "arcItLamp": "\u2609 hand lamp",
      "arcItRope": "\u223f hoist cable",
      "arcItChit": "\u2726 night chit",
      "arcItTea": "\u2668 thermos",
      "arcItLedger": "\u2263 spring ledger",
      "arcFlagPower": "backup power",
      "arcClue1": "\u2500 tram ticket",
      "arcClue2": "\u2502 true aisle",
      "arcClue3": "\u250c coolant log",
      "arcClue4": "\u2510 spine number",
      "arcClue5": "\u2514 gutter notch",
      "arcGoalAny": "reach any way out",
      "arcGoalLedger": "reach the ledger ending",
      "arcGoalRoof": "reach the roof ending",
      "arcGoalClues": "finish holding all five clues",
      "arcGoalSecret": "reach the secret ending",
      "arcEndLedger": "Ledger ending",
      "arcEndRoof": "Roof ending",
      "arcEndSecret": "Secret ending",
    },
    zh: {
      "tabArchiveEscape": "档案楼脱身",
      "arcZ1": "任意出路",
      "arcZ2": "台账之夜",
      "arcZ3": "屋顶之夜",
      "arcZ4": "五块牌片",
      "arcZ5": "错误的一年",
      "arcTurnLabel": "步数",
      "arcClueLabel": "线索",
      "arcRoomLabel": "房间",
      "arcGoalLabel": "今夜",
      "arcNightSelectLabel": "选择哪一夜",
      "arcBtnAgain": "重新开始一夜",
      "arcFieldLabel": "故事段落与选项：数字键 1-4 选选项，退格键往回走，L 键念出线索",
      "arcRoomsLabel": "已探明",
      "arcKitLabel": "口袋",
      "arcCluesLabel": "线索牌",
      "arcRoomsNone": "还没走过",
      "arcKitEmpty": "空空如也",
      "arcClueNone": "还没有牌片",
      "arcNeeds": "需要{w}",
      "arcCluesAll": "全部 {n} 条线索",
      "arcMoved": "第 {n} 步。楼在你四周沉了下去。",
      "arcClueTaken": "一块线索牌记进了日志。",
      "arcNoted": "口袋沉了一下。",
      "arcFlagUp": "情况变了：{w}。",
      "arcLocked": "这一条还缺{w}。",
      "arcBack": "你原路退回。已经找到的东西不会因为退回去而消失。",
      "arcNowhereBack": "没有更早的段落可以退了。",
      "arcClueList": "线索 {n}/{total}：{list}",
      "arcEndingOff": "你用了 {n} 步走到{g}，可今夜要的是{want}。再走一遍。",
      "arcFiled": "{g}，用了 {n} 步 - 获得 {s} 星。",
      "arcNextNight": "解锁下一夜。",
      "arcAllNights": "五个夜晚，五种出来的法子。",
      "arcPaused": "停在第 {n} 步。档案楼替你看住位置。",
      "arcGraphBroken": "故事图没通过它自己的可解性校验，请报告。",
      "arcObjective": "{name}：{want}。已测出这条路最短要 {p} 步，越少越好。",
      "arcHint": "数字键选选项，退格键往回走，L 键念出线索。灰掉的选项会写明它缺什么。",
      "logArchiveEscape": "用了 {n} 步走出档案楼，带着 {c} 条线索",
      "arcRoomFront": "前厅",
      "arcRoomPlant": "机房",
      "arcRoomStacks": "书架区",
      "arcRoomLedger": "台账室",
      "arcRoomRoof": "屋顶",
      "arcItKey": "\u26ff 铜钥匙",
      "arcItCard": "\u25ae 门禁卡",
      "arcItLamp": "\u2609 手提灯",
      "arcItRope": "\u223f 吊缆",
      "arcItChit": "\u2726 夜间通行证",
      "arcItTea": "\u2668 保温壶",
      "arcItLedger": "\u2263 春季台账",
      "arcFlagPower": "备用电源",
      "arcClue1": "\u2500 电车月票",
      "arcClue2": "\u2502 真正的巷道",
      "arcClue3": "\u250c 冷却液记录",
      "arcClue4": "\u2510 书脊号",
      "arcClue5": "\u2514 天沟凹口",
      "arcGoalAny": "走到任意一个出口",
      "arcGoalLedger": "走到台账结局",
      "arcGoalRoof": "走到屋顶结局",
      "arcGoalClues": "带着五条线索结束",
      "arcGoalSecret": "走到隐藏结局",
      "arcEndLedger": "台账结局",
      "arcEndRoof": "屋顶结局",
      "arcEndSecret": "隐藏结局",
    },
  });

  App.registerGame({
    name: "archiveEscape",
    tabKey: "tabArchiveEscape",
    init: initArchiveEscapeGame,
    guide: {
      svg:
        '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="4" y="4" width="112" height="68" rx="5" fill="rgba(20,24,32,.92)" stroke="rgba(148,163,184,.45)"/>' +
        '<path d="M18 14h40v46H18z" fill="none" stroke="rgba(148,163,184,.4)" stroke-width="2"/>' +
        '<path d="M24 24h28M24 32h28M24 40h20" stroke="rgba(185,193,204,.55)"/>' +
        '<path d="M58 37h20" stroke="#00f2ff" stroke-width="2" marker-end="url(#a)"/>' +
        '<rect x="78" y="26" width="30" height="22" rx="3" fill="none" stroke="#ffd166" stroke-width="2"/>' +
        '<text x="93" y="40" font-size="10" fill="#ffd166" text-anchor="middle">5?</text>' +
        '<text x="30" y="68" font-size="8" fill="#b9c1cc">1 desk  2 stair  3 lift</text></svg>',
      en: [
        "Goal: get out of the closed archive - the five nights each ask for a different way out.",
        "Action: click a choice or press its number 1-4; Backspace retraces one passage and L reads your clue log aloud.",
        "Rule: a greyed choice is not a dead end, it names the item, flag or clue it still wants; the mapped rooms, satchel and clues stay on screen so you never have to remember.",
        "Turns: a shorter route scores better, so a run that walks the whole map will finish - it just will not shine.",
        "Endings: a ledger ending, a roof ending, and one secret ending that only the five clue tiles together will open.",
        "Before the night is dealt the story graph is checked by machine: every passage reachable, both standard endings reachable, no passage without a way onward.",
      ],
      zh: [
        "目标：从夜里关门的档案楼里出去——五个夜晚，各要你走一种不同的出去法。",
        "操作：点选项，或按它前面的数字 1-4；退格键退回一段，L 键把线索日志念出来。",
        "规则：灰掉的选项不是死路，它会写明还缺哪件东西、哪个状态或哪条线索；已探明的房间、口袋和线索一直摆在屏上，不用你记。",
        "步数：路线越短分越高，所以把整栋楼走完也能通关——只是不会太亮眼。",
        "结局：一个台账结局、一个屋顶结局，还有一个必须五块线索牌凑齐才会开的隐藏结局。",
        "开局前，机器会先校验这张故事图：每段都可达、两个常规结局都可达、没有任何一段进去就出不来。",
      ],
    },
  });

  /* Exported for the other modules. */
  App.initArchiveEscapeGame = initArchiveEscapeGame;
})(window.CapitalConvert = window.CapitalConvert || {});
