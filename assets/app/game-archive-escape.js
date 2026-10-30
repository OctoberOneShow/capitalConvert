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
  var arcRoomArt = { front: "lantern", plant: "gear", stacks: "book", ledger: "chest", roof: "moon", yard: "valve" };
  var arcSceneArt = {
    front: { icon: "lantern", minis: ["envelope", "key"], pattern: "felt" },
    plant: { icon: "gear", minis: ["bolt", "valve"], pattern: "planks" },
    stacks: { icon: "book", minis: ["scroll", "quill"], pattern: "weave" },
    ledger: { icon: "chest", minis: ["book", "coin"], pattern: "marble" },
    roof: { icon: "moon", minis: ["rain", "cloud"], pattern: "stars" },
    yard: { icon: "valve", minis: ["chain", "coin"], pattern: "marble" },
  };
  var arcEndingArt = { ledger: "book", roof: "moon", secret: "crystal", yard: "chain" };
  var arcItemArt = { key: "key", card: "card", lamp: "lantern", rope: "chain", chit: "stamp", tea: "flask", ledger: "book" };
  var arcClueArt = { c1: "card", c2: "map", c3: "scroll", c4: "magnifier", c5: "wave" };

  /* Same map, thirty escalating nights. The first eight are graded purely off the
   * solved minimum turn count for each goal; the two chute nights are graded off
   * their stored solution line, whose hop count is band0, so replaying the line
   * as written earns exactly three stars. `solution` is the node path, joined on
   * ">"; arcWalk replays it through arcApply and counts the hops. */
  var arcLevels = [
    { id: "a1", labelKey: "arcZ1", goal: "any" },
    { id: "a2", labelKey: "arcZ2", goal: "ledger" },
    { id: "a3", labelKey: "arcZ3", goal: "roof" },
    { id: "a4", labelKey: "arcZ4", goal: "clues" },
    { id: "a5", labelKey: "arcZ5", goal: "secret" },
    { id: "a6", labelKey: "arcZ6", goal: "tea" },
    { id: "a7", labelKey: "arcZ7", goal: "roofFull" },
    { id: "a8", labelKey: "arcZ8", goal: "ledgerFull" },
    {
      id: "a9",
      labelKey: "arcZ9",
      goal: "yard",
      solution: "lobby>desk>stair>landing>aisles>toolbox>aisles>landing>stair>breaker>shelf>sump>shelf>stokers>chutetop>yardGate>endYard",
      starTurns: [16, 20, 26],
    },
    {
      id: "a10",
      labelKey: "arcZ10",
      goal: "yardLedger",
      solution: "lobby>desk>drawer>stair>landing>aisles>plaques>aisles>toolbox>aisles>landing>ledgerDoor>turnstile>ledgerRoom>strongbox>ledgerOpen>landing>stair>breaker>shelf>sump>shelf>stokers>chutetop>yardGate>endYard",
      starTurns: [25, 29, 35],
    },
    /* Nights eleven to twenty are case files: the same map, but the ending has
     * to arrive with named evidence in the satchel and without the tools the
     * earlier nights leaned on. Every case is proved by the same BFS below. */
    { id: "a11", labelKey: "arcZ11", goal: "roofNoLamp" },
    { id: "a12", labelKey: "arcZ12", goal: "yardTea" },
    { id: "a13", labelKey: "arcZ13", goal: "ledgerTeaNoLamp" },
    { id: "a14", labelKey: "arcZ14", goal: "everyItem" },
    { id: "a15", labelKey: "arcZ15", goal: "secretTeaFull" },
    { id: "a16", labelKey: "arcZ16", goal: "secretLedger" },
    { id: "a17", labelKey: "arcZ17", goal: "roofTeaFull" },
    { id: "a18", labelKey: "arcZ18", goal: "yardEveryItem" },
    { id: "a19", labelKey: "arcZ19", goal: "yardLedgerFull" },
    { id: "a20", labelKey: "arcZ20", goal: "yardEveryItemFull" },
    /* Nights twenty-one to twenty-four: the satchel law. Every case above
     * this line asked for a laden ending; the deep tier sends the whole
     * loadout to doors it has never reached, then sends it dry. a21 takes
     * every item and every clue up to the roof; a22 does the same for the
     * hidden stacks; a23 carries the case out past the shutters without
     * the thermos; a24 - the capstone - walks the entire case dry out the
     * coal yard, the longest haul in the building, minus the one sip the
     * walk used to be built around. The BFS below proves each case
     * solvable and bands it off its own minimum turns; the gate proves the
     * satchel's tools load-bearing by taking them away from the full yard
     * case and finding nothing left. */
    { id: "a21", labelKey: "arcZ21", goal: "roofEveryItemFull" },
    { id: "a22", labelKey: "arcZ22", goal: "secretEveryItemFull" },
    { id: "a23", labelKey: "arcZ23", goal: "ledgerDryFull" },
    { id: "a24", labelKey: "arcZ24", goal: "yardDryFull" },
    /* Nights twenty-five to thirty: the water tier. The capstone dry walk
     * only proved the yard could be crossed empty-handed; these six send the
     * full case back down into the parts of the building the plans forgot.
     * a25 kills the backup power under the full loadout, so the walk has to
     * lean on the plant and the chute alone. a26 opens the survey cage, a27
     * wades the drowned stacks and cages the roof, a28 adds the weigh-house
     * manifest to the dry yard, a29 takes the wet stacks and the manifest up
     * to the roof, and a30 - the capstone - presses a copy of a page that is
     * not in the building and carries it to the secret ending. Every branch
     * is a dead end: it grants only its own flag and never shortens a
     * shipped route. The BFS below prices each rung, and bands hang off that
     * measured minimum. */
    { id: "a25", labelKey: "arcZ25", goal: "yardNoPowerFull" },
    { id: "a26", labelKey: "arcZ26", goal: "yardCageDryFull" },
    { id: "a27", labelKey: "arcZ27", goal: "roofWetCageFull" },
    { id: "a28", labelKey: "arcZ28", goal: "yardCageManifestDryFull" },
    { id: "a29", labelKey: "arcZ29", goal: "roofWetManifestFull" },
    { id: "a30", labelKey: "arcZ30", goal: "secretCageManifestPressFull" },
  ];

  /* The additive case-file layer. A goal named here is met only at its named
   * ending (if any) with every listed clue, item and flag present and nothing
   * from the ban list present. Goals that are not listed keep walking the
   * original predicates untouched. */
  var arcCases = {
    roofNoLamp: { ending: "roof", ban: { items: ["lamp"] } },
    yardTea: { ending: "yard", items: ["tea"] },
    ledgerTeaNoLamp: { ending: "ledger", items: ["tea"], ban: { items: ["lamp"] } },
    everyItem: { items: ["key", "card", "lamp", "rope", "chit", "tea", "ledger"] },
    secretTeaFull: {
      ending: "secret",
      items: ["tea"],
      clues: ["c1", "c2", "c3", "c4", "c5"],
    },
    secretLedger: { ending: "secret", items: ["ledger"] },
    roofTeaFull: {
      ending: "roof",
      items: ["tea"],
      clues: ["c1", "c2", "c3", "c4", "c5"],
    },
    yardEveryItem: {
      ending: "yard",
      items: ["key", "card", "lamp", "rope", "chit", "tea", "ledger"],
    },
    yardLedgerFull: {
      ending: "yard",
      items: ["ledger"],
      clues: ["c1", "c2", "c3", "c4", "c5"],
    },
    yardEveryItemFull: {
      ending: "yard",
      items: ["key", "card", "lamp", "rope", "chit", "tea", "ledger"],
      clues: ["c1", "c2", "c3", "c4", "c5"],
    },
    /* The deep tier's cases: the full loadout at doors it has never
     * reached, then the same haul with the thermos banned. */
    roofEveryItemFull: {
      ending: "roof",
      items: ["key", "card", "lamp", "rope", "chit", "tea", "ledger"],
      clues: ["c1", "c2", "c3", "c4", "c5"],
    },
    secretEveryItemFull: {
      ending: "secret",
      items: ["key", "card", "lamp", "rope", "chit", "tea", "ledger"],
      clues: ["c1", "c2", "c3", "c4", "c5"],
    },
    ledgerDryFull: {
      ending: "ledger",
      items: ["key", "card", "lamp", "rope", "chit", "ledger"],
      clues: ["c1", "c2", "c3", "c4", "c5"],
      ban: { items: ["tea"] },
    },
    yardDryFull: {
      ending: "yard",
      items: ["key", "card", "lamp", "rope", "chit", "ledger"],
      clues: ["c1", "c2", "c3", "c4", "c5"],
      ban: { items: ["tea"] },
    },
    /* The water tier. a25's case is a foreclosed tool: the full loadout at
     * the yard, but the backup power must never be restored. The rest ask
     * for one of the dead-end side rooms to be opened on the way out. */
    yardNoPowerFull: {
      ending: "yard",
      items: ["key", "card", "lamp", "rope", "chit", "tea", "ledger"],
      clues: ["c1", "c2", "c3", "c4", "c5"],
      ban: { flags: ["power"] },
    },
    yardCageDryFull: {
      ending: "yard",
      items: ["key", "card", "lamp", "rope", "chit", "ledger"],
      clues: ["c1", "c2", "c3", "c4", "c5"],
      flags: ["caged"],
      ban: { items: ["tea"] },
    },
    roofWetCageFull: {
      ending: "roof",
      items: ["key", "card", "lamp", "rope", "chit", "tea", "ledger"],
      clues: ["c1", "c2", "c3", "c4", "c5"],
      flags: ["wet", "caged"],
    },
    yardCageManifestDryFull: {
      ending: "yard",
      items: ["key", "card", "lamp", "rope", "chit", "ledger"],
      clues: ["c1", "c2", "c3", "c4", "c5"],
      flags: ["caged", "manifest"],
      ban: { items: ["tea"] },
    },
    roofWetManifestFull: {
      ending: "roof",
      items: ["key", "card", "lamp", "rope", "chit", "tea", "ledger"],
      clues: ["c1", "c2", "c3", "c4", "c5"],
      flags: ["wet", "manifest"],
    },
    secretCageManifestPressFull: {
      ending: "secret",
      items: ["key", "card", "lamp", "rope", "chit", "tea", "ledger"],
      clues: ["c1", "c2", "c3", "c4", "c5"],
      flags: ["caged", "manifest", "pressed"],
    },
  };

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
        { to: "stokers", need: { item: "lamp" }, en: "Follow the pipe run behind the boiler", zh: "沿管道绕到锅炉后面" },
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
        { to: "pumpRoom", en: "Wade behind the sump to the pump housing", zh: "涉水绕到集水坑后的泵房" },
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
      id: "stokers", room: "plant", set: "flue",
      en: "Behind the boiler the stokers' passage runs low and black, and you go along it with your shoulder in the soot. The flue cover has been left standing open on its hook, and the draft coming up out of it is warm and smells of coal dust. The chute is clear, and it goes down.",
      zh: "锅炉后面是一条又矮又黑的司炉通道，你得侧着肩在烟灰里走。烟道盖被人挂在钩子上敞着，从下面上来的风是暖的，带着煤灰味。滑道是通的，而且一直通到下面。",
      choices: [
        { to: "chutetop", need: { item: "rope" }, en: "Rig the cable to the chute's pull ring", zh: "把缆绳系上滑道的拉环" },
        { to: "shelf", en: "Back along the pipes to the shelf", zh: "顺管道回架子" },
        { to: "breaker", en: "Back out to the panel", zh: "绕回配电屏" },
      ],
    },
    {
      id: "chutetop", room: "plant",
      en: "The mouth of the coal chute is a square of cold galvanised light. A pull ring is bolted to the sill, a canvas tarp lies under it that nobody has ever folded away, and the whole shoot goes down at about forty degrees into dark. Dropping in is easy. Getting out again is the climb.",
      zh: "输煤滑道的口是一块四方的冷镀锌铁皮光。边沿上钉着一只拉环，底下摊着一张从没人叠起来的帆布垫；整条滑道以大约四十度的坡度向下通进黑暗。跳下去容易，再上来就是爬了。",
      choices: [
        { to: "yardGate", en: "Sit on the sill and go down", zh: "坐上边沿，滑下去" },
        { to: "stokers", en: "Back up into the passage", zh: "退回通道" },
      ],
    },
    {
      id: "yardGate", room: "yard",
      en: "The chute empties you into the coal yard: hard standing, one weighbridge, one gate. The gate is the first thing in this whole building wearing a proper sign, and it works - it reads a chit, counts you as one, and only then remembers that it is also a door.",
      zh: "滑道把你倒进堆煤场：硬地面，一台地磅，一道门。这道门是整栋楼里第一块挂了正经牌子的东西，而且它好用——它先读通行证，把你算作一个人，然后才想起自己也是一扇门。",
      choices: [
        { to: "endYard", need: { item: "chit" }, en: "Give the gate its chit", zh: "把通行证交给门" },
        { to: "chutetop", en: "Climb back up the chute", zh: "顺着滑道爬回去" },
        { to: "weighHouse", en: "Cross to the weigh house beside the gate", zh: "走到门边的地磅房" },
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
        { to: "survey", en: "Climb the survey ladder behind the false plaque", zh: "爬上假巷道牌后的检修梯" },
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
        { to: "copyRoom", en: "Step into the copy room", zh: "走进旁边的复印室" },
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
    {
      id: "endYard", room: "yard", ending: "yard",
      en: "The gate takes the chit, counts you once and lets you into the delivery yard, then closes behind you like a drawer going home. Nobody stops you, because nobody is supposed to be here at all. The coal you landed in keeps the shape of you for about as long as it takes to rain flat.",
      zh: "门收下通行证，数了你一次，把你放进卸货场，然后在身后合上——像一只抽屉被推回原位。没人拦你，因为这种时候本不该有人在这儿。你砸出来的那个煤坑，能保持你的形状，直到被雨浇平为止。",
      choices: [
        { to: "lobby", en: "Start the night over, properly", zh: "把这一夜重新走一遍" },
        { to: "yardGate", en: "Back in through the gate", zh: "从门里再进去" },
      ],
    },
    /* The water tier's dead ends. Each branch is a one-way detour: it hands
     * back exactly one flag and nothing an earlier night ever needed, so the
     * shipped routes and their minima stay put while the case files below
     * can ask for the room by name. */
    {
      id: "pumpRoom", room: "plant",
      en: "A service door behind the sump stands open on a pump room no plan admits to. The floor is wet to the ankle and the walls are furred with lime. A sump pump the size of a boiler idles in the dark, and a handwheel beside it is painted the colour of a thing that wants turning.",
      zh: "集水坑后面一扇检修门开着，通向一间图纸上从不存在的泵房。地面积水到脚踝，墙上结着石灰的白霜。一台锅炉大小的排水泵在黑暗里空转，旁边的握手轮漆着一种\u201c该转我\u201d的颜色。",
      choices: [
        { to: "cistern", en: "Follow the pump's discharge pipe", zh: "沿排水泵的出水管走" },
        { to: "sump", en: "Back to the sump", zh: "回集水坑" },
      ],
    },
    {
      id: "cistern", room: "plant",
      en: "The discharge pipe climbs into a brick cistern whose ceiling is out of sight. A service walkway crosses the black water at shoulder height, and on the far side a stack of record crates has been left in the dry, labelled in a hand that stopped writing decades ago.",
      zh: "出水管爬进一口砖砌蓄水池，池顶望不见。一条检修走道齐肩高，横过黑色的水面；对岸干处堆着一摞档案箱，标签上的字迹几十年前就停笔了。",
      choices: [
        { to: "wetStack", en: "Cross the walkway to the crates", zh: "走过检修道去箱子那边" },
        { to: "pumpRoom", en: "Back through the pump room", zh: "穿过泵房回去" },
      ],
    },
    {
      id: "wetStack", room: "plant", set: "wet",
      en: "The crates are swollen shut, but the top one has split along its lid. Inside is a drowned register with the archive's true floor plan inked on the endpaper: the sump, the cistern, the chute, and a coal yard that was never on the map. You take the page. The water below takes one step closer to the walkway.",
      zh: "箱子都泡胀了打不开，最上面那只却沿盖缝裂开。里面是一本泡水的登记册，衬页上画着档案馆真正的平面图：集水坑、蓄水池、滑道，还有一座从没上过图纸的堆煤场。你撕下这一页。脚下的水又朝检修道逼近一步。",
      choices: [
        { to: "cistern", en: "Fold the page and cross back", zh: "折好这一页，原路回去" },
      ],
    },
    {
      id: "survey", room: "stacks",
      en: "Behind the false plaque a service ladder goes up into the dark between the shelf tops. It ends at a survey cage bolted under the roof trusses, the kind the city sends a man into once a decade with a plumb line and a bad temper.",
      zh: "假巷道牌后面有一道检修梯，向上没入书架顶之间的黑暗。梯子通到一只固定在天花桁架下的测绘铁笼——市里每十年才派人带着铅垂线和一肚子火气爬进去一次的那种。",
      choices: [
        { to: "cage", en: "Open the cage's inspection hatch", zh: "打开检修笼的检查口" },
        { to: "plaques", en: "Back down to the plaques", zh: "下回巷道牌那里" },
      ],
    },
    {
      id: "cage", room: "stacks", set: "caged",
      en: "Inside, a surveyor's level still sits on its tripod and a brass tag is wired to the rail: every wall in the stacks has been measured for movement, and the readings have been getting worse since spring. You take the tag and wire the cage door open behind you.",
      zh: "笼里，一台水准仪还架在三脚架上，栏杆上系着一块铜牌：书架区每一面墙都测过位移，而读数从春天起越来越糟。你取下铜牌，又用牌上的铁丝把笼门别住，让它敞在身后。",
      choices: [
        { to: "survey", en: "Climb back down the ladder", zh: "顺梯子爬回去" },
      ],
    },
    {
      id: "weighHouse", room: "yard",
      en: "A weigh house stands beside the gate, brick to the sill and glass above it, with a ticket window papered over from the inside. The door is not locked. It has merely been nailed shut once and opened again many times since.",
      zh: "门边立着一间地磅房，砖砌到窗台，上面全是玻璃；售票窗口从里面糊死了。门没锁——它只是被钉死过一次，之后又被打开过很多次。",
      choices: [
        { to: "dispatch", en: "Step into the dispatch desk", zh: "走进调度台" },
        { to: "yardGate", en: "Back to the gate", zh: "回大门" },
      ],
    },
    {
      id: "dispatch", room: "yard", set: "manifest",
      en: "The dispatch desk is a slab of deal under a dead lamp. Every lorry that ever left this yard is in the book, and every load is signed for twice: once by the driver, and once by someone whose signature is a single vertical stroke. The last manifest is still in the machine, dated tomorrow. You take it.",
      zh: "调度台是一块松木板，头顶一盏死灯。这院子开出去的每辆卡车都记在簿上，每车货都签两次：一次是司机，一次是某个只画一道竖线的人。最后一张清单还卡在机器里，日期是明天。你把它抽了出来。",
      choices: [
        { to: "weighHouse", en: "Fold the manifest and go back", zh: "折起清单，退回去" },
      ],
    },
    {
      id: "copyRoom", room: "ledger",
      en: "A copy room opens off the ledger room, no wider than a corridor. A wet-process copier stands against one wall with its tray full of blank paper and its crank still warm. The door closes behind you on a spring.",
      zh: "台账室侧面开着一间复印室，窄得像走廊。靠墙一台湿法复印机，纸盘里全是白纸，摇柄还是温的。门在身后被弹簧带上了。",
      choices: [
        { to: "press", en: "Turn the copier's crank", zh: "摇动复印机的摇柄" },
        { to: "ledgerRoom", en: "Back into the ledger room", zh: "回台账室" },
      ],
    },
    {
      id: "press", room: "ledger", set: "pressed",
      en: "The copier takes the blank sheet, hesitates, and gives you back a copy of a page that is not in the building: the same strongbox dial, the same five slots, and a fifth name added in the margin in the same vertical hand as the yard manifests. The original stays inside the glass. You take the copy.",
      zh: "复印机吃进白纸，迟疑了一下，吐回一页楼里根本不存在的纸：同样的保险柜转盘，同样的五个槽，页边还多用与煤场清单相同的竖笔迹添了第五个名字。原件留在玻璃里。你拿走副本。",
      choices: [
        { to: "copyRoom", en: "Take the copy and step out", zh: "拿着副本退出去" },
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
    /* The later nights combine a way out with what you are still carrying:
     * the thermos has to come with you, or the ending has to arrive with the
     * whole clue set in the log rather than only the tiles the door wanted. */
    if (goal === "tea") {
      return !!state.items.tea;
    }
    if (goal === "roofFull") {
      return ending === "roof" && arcCount(state.clues) >= arcClueTotal;
    }
    if (goal === "ledgerFull") {
      return ending === "ledger" && arcCount(state.clues) >= arcClueTotal;
    }
    /* The chute nights leave by the coal yard, which no earlier night walks:
     * the gate there spends a night chit, and the long one spends it still
     * carrying the spring ledger. */
    if (goal === "yard") {
      return ending === "yard";
    }
    if (goal === "yardLedger") {
      return ending === "yard" && !!state.items.ledger;
    }
    /* The case-file layer. Listed goals replace the single-ending test with a
     * named ending plus required and banned evidence; unlisted goals fall
     * through exactly as before. */
    var caseFile = arcCases[goal];
    if (caseFile) {
      if (caseFile.ending && ending !== caseFile.ending) {
        return false;
      }
      var must = caseFile.clues || [];
      for (var m = 0; m < must.length; m += 1) {
        if (!state.clues[must[m]]) {
          return false;
        }
      }
      var carry = caseFile.items || [];
      for (var n = 0; n < carry.length; n += 1) {
        if (!state.items[carry[n]]) {
          return false;
        }
      }
      var raised = caseFile.flags || [];
      for (var f = 0; f < raised.length; f += 1) {
        if (!state.flags[raised[f]]) {
          return false;
        }
      }
      var banned = caseFile.ban || {};
      var bannedItems = banned.items || [];
      for (var b = 0; b < bannedItems.length; b += 1) {
        if (state.items[bannedItems[b]]) {
          return false;
        }
      }
      var bannedFlags = banned.flags || [];
      for (var g = 0; g < bannedFlags.length; g += 1) {
        if (state.flags[bannedFlags[g]]) {
          return false;
        }
      }
      return true;
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
    while (head < queue.length && guard < 300000) {
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
        if (!arcCan(state, node.choices[c])) {
          continue;
        }
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
    var goals = [
      "any", "ledger", "roof", "clues", "secret", "tea", "roofFull", "ledgerFull", "yard", "yardLedger",
      "roofNoLamp", "yardTea", "ledgerTeaNoLamp", "everyItem", "secretTeaFull",
      "secretLedger", "roofTeaFull", "yardEveryItem", "yardLedgerFull", "yardEveryItemFull",
      "roofEveryItemFull", "secretEveryItemFull", "ledgerDryFull", "yardDryFull",
      "yardNoPowerFull", "yardCageDryFull", "roofWetCageFull",
      "yardCageManifestDryFull", "roofWetManifestFull",
      "secretCageManifestPressFull",
    ];
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
        !!endings.yard &&
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

  /* Bands come out of measurement, never out of a guess: either a rung ships
   * the line it was measured with, or it takes the solved minimum for its goal. */
  function arcBands(level) {
    if (level && level.starTurns && level.starTurns.length === 3) {
      return level.starTurns.slice();
    }
    var proof = arcSolve();
    var min = proof.turns[level ? level.goal : ""];
    if (!(min > 0)) {
      min = 24;
    }
    return [min + 3, min + 7, min + 13];
  }

  /* Replay a stored solution line - the node path a rung shipped with, joined
   * on ">" - against the same pure rules the player walks. It answers three
   * questions at once: is every hop legal, where does it land, and how many
   * turns does the line measure. Bands for those rungs are pinned to that. */
  function arcWalk(line, goal) {
    var hops = String(line || "").split(">").filter(Boolean);
    var state = arcStart();
    var i;
    if (!hops.length || hops[0] !== state.node) {
      return { ok: false, turns: 0, node: state.node, why: "start", miss: 0 };
    }
    for (i = 1; i < hops.length; i += 1) {
      var node = arcNode(state.node);
      var wanted = null;
      for (var c = 0; node && c < node.choices.length; c += 1) {
        if (node.choices[c].to === hops[i] && !wanted) {
          wanted = node.choices[c];
        }
      }
      if (!wanted) {
        return { ok: false, turns: i - 1, node: state.node, why: "passage", miss: i };
      }
      if (!arcCan(state, wanted)) {
        return { ok: false, turns: i - 1, node: state.node, why: "locked", miss: i };
      }
      state = arcApply(state, wanted);
    }
    var landed = arcNode(state.node);
    return {
      ok: !!landed && (!goal || arcGoalMet(goal, state)),
      turns: state.turns,
      node: state.node,
      why: landed && landed.ending ? landed.ending : "open",
      miss: 0,
    };
  }

  App.archiveGraph = arcGraph;
  App.archiveSolve = arcSolve;
  App.archiveApply = arcApply;
  App.archiveCan = arcCan;
  App.archiveStart = arcStart;
  App.archiveNode = arcNode;
  App.archiveWalk = arcWalk;
  App.archiveBands = arcBands;
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
    var bands = arcBands(level);
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
      var order = ["front", "plant", "stacks", "ledger", "roof", "yard"];
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
      bands = arcBands(level);
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
      "arcZ6": "The Thermos Night",
      "arcZ7": "The Collector's Night",
      "arcZ8": "The Full Ledger Night",
      "arcZ9": "The Chute Night",
      "arcZ10": "The Carrier's Night",
      "arcZ11": "The Dark Roof",
      "arcZ12": "The Yard Thermos",
      "arcZ13": "The Lamp-Less Ledger",
      "arcZ14": "The Full Satchel",
      "arcZ15": "The Secret Thermos",
      "arcZ16": "The Secret Ledger",
      "arcZ17": "The Roof Thermos",
      "arcZ18": "The Yard Satchel",
      "arcZ19": "The Ledger File",
      "arcZ20": "The Full Case",
      "arcZ21": "The Roof Take",
      "arcZ22": "The Stacks Take",
      "arcZ23": "The Dry Ledger",
      "arcZ24": "The Dry Yard",
      "arcZ25": "The Dead Power",
      "arcZ26": "The Survey Cage",
      "arcZ27": "The Drowned Stacks",
      "arcZ28": "The Weigh-House Night",
      "arcZ29": "The Wet Manifest",
      "arcZ30": "The Press Copy",
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
      "arcAllNights": "Thirty nights, thirty ways out of it.",
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
      "arcRoomYard": "Yard",
      "arcItKey": "\u26ff brass key",
      "arcItCard": "\u25ae keycard",
      "arcItLamp": "\u2609 hand lamp",
      "arcItRope": "\u223f hoist cable",
      "arcItChit": "\u2726 night chit",
      "arcItTea": "\u2668 thermos",
      "arcItLedger": "\u2263 spring ledger",
      "arcFlagPower": "backup power",
      "arcFlagFlue": "the open flue",
      "arcFlagWet": "the drowned floor plan",
      "arcFlagCaged": "the open survey cage",
      "arcFlagManifest": "the weigh-house manifest",
      "arcFlagPressed": "the pressed copy",
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
      "arcGoalTea": "escape still holding the thermos",
      "arcGoalRoofFull": "reach the roof ending holding all five clues",
      "arcGoalLedgerFull": "reach the ledger ending holding all five clues",
      "arcGoalYard": "get out through the coal yard, which needs the cable, the open flue and the gate's chit",
      "arcGoalYardLedger": "get out through the coal yard still carrying the spring ledger",
      "arcGoalRoofNoLamp": "reach the roof ending without the hand lamp",
      "arcGoalYardTea": "get out through the coal yard still holding the thermos",
      "arcGoalLedgerTeaNoLamp": "reach the ledger ending with the thermos and without the hand lamp",
      "arcGoalEveryItem": "reach any ending still carrying every item in the building",
      "arcGoalSecretTeaFull": "reach the secret ending with the thermos and all five clues",
      "arcGoalSecretLedger": "reach the secret ending still carrying the spring ledger",
      "arcGoalRoofTeaFull": "reach the roof ending with the thermos and all five clues",
      "arcGoalYardEveryItem": "get out through the coal yard still carrying every item in the building",
      "arcGoalYardLedgerFull": "get out through the coal yard with the spring ledger and all five clues",
      "arcGoalYardEveryItemFull": "get out through the coal yard with every item and all five clues",
      "arcGoalRoofEveryItemFull": "reach the roof ending with every item and all five clues",
      "arcGoalSecretEveryItemFull": "reach the secret ending with every item and all five clues",
      "arcGoalLedgerDryFull": "reach the ledger ending dry-handed with all five clues",
      "arcGoalYardDryFull": "get out through the coal yard dry-handed with all five clues",
      "arcGoalYardNoPowerFull": "get out through the coal yard with every item and all five clues while the backup power stays dead",
      "arcGoalYardCageDryFull": "get out through the coal yard dry-handed with all five clues and the survey cage checked",
      "arcGoalRoofWetCageFull": "reach the roof ending with every item, all five clues, the drowned stacks and the survey cage",
      "arcGoalYardCageManifestDryFull": "get out through the coal yard dry-handed with all five clues, the survey cage and the weigh-house manifest",
      "arcGoalRoofWetManifestFull": "reach the roof ending with every item, all five clues, the drowned stacks and the weigh-house manifest",
      "arcGoalSecretCageManifestPressFull": "reach the secret ending with every item, all five clues, the survey cage, the weigh-house manifest and the copy press",
      "arcEndLedger": "Ledger ending",
      "arcEndRoof": "Roof ending",
      "arcEndSecret": "Secret ending",
      "arcEndYard": "Yard ending",
    },
    zh: {
      "tabArchiveEscape": "档案楼脱身",
      "arcZ1": "任意出路",
      "arcZ2": "台账之夜",
      "arcZ3": "屋顶之夜",
      "arcZ4": "五块牌片",
      "arcZ5": "错误的一年",
      "arcZ6": "保温壶之夜",
      "arcZ7": "收藏家之夜",
      "arcZ8": "满账之夜",
      "arcZ9": "滑道之夜",
      "arcZ10": "扛账之夜",
      "arcZ11": "暗顶之夜",
      "arcZ12": "煤场暖壶",
      "arcZ13": "无灯抱账",
      "arcZ14": "满袋之夜",
      "arcZ15": "密道暖壶",
      "arcZ16": "密道抱账",
      "arcZ17": "屋顶暖壶",
      "arcZ18": "煤场满袋",
      "arcZ19": "台账全卷",
      "arcZ20": "全案之夜",
      "arcZ21": "天窗满载",
      "arcZ22": "书架满载",
      "arcZ23": "干手账本",
      "arcZ24": "干手煤场",
      "arcZ25": "断电之夜",
      "arcZ26": "测绘铁笼",
      "arcZ27": "淹水书库",
      "arcZ28": "地磅房之夜",
      "arcZ29": "湿清单",
      "arcZ30": "压印副本",
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
      "arcAllNights": "三十个夜晚，三十种出来的法子。",
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
      "arcRoomYard": "煤场",
      "arcItKey": "\u26ff 铜钥匙",
      "arcItCard": "\u25ae 门禁卡",
      "arcItLamp": "\u2609 手提灯",
      "arcItRope": "\u223f 吊缆",
      "arcItChit": "\u2726 夜间通行证",
      "arcItTea": "\u2668 保温壶",
      "arcItLedger": "\u2263 春季台账",
      "arcFlagPower": "备用电源",
      "arcFlagFlue": "敞开的烟道",
      "arcFlagWet": "泡水的平面图",
      "arcFlagCaged": "敞开的测绘笼",
      "arcFlagManifest": "地磅房清单",
      "arcFlagPressed": "压印副本",
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
      "arcGoalTea": "带着保温壶逃出去",
      "arcGoalRoofFull": "带着五条线索走到屋顶结局",
      "arcGoalLedgerFull": "带着五条线索走到台账结局",
      "arcGoalYard": "从堆煤场走出去——要吊缆、敞开的烟道，还有交给门的那张通行证",
      "arcGoalYardLedger": "抱着春季台账从堆煤场走出去",
      "arcGoalRoofNoLamp": "不带手提灯走到屋顶结局",
      "arcGoalYardTea": "端着保温壶从堆煤场走出去",
      "arcGoalLedgerTeaNoLamp": "不带手提灯、端着保温壶走到台账结局",
      "arcGoalEveryItem": "带着楼里所有物件走到任意结局",
      "arcGoalSecretTeaFull": "端着保温壶、带齐五条线索走到隐藏结局",
      "arcGoalSecretLedger": "抱着春季台账走到隐藏结局",
      "arcGoalRoofTeaFull": "端着保温壶、带齐五条线索走到屋顶结局",
      "arcGoalYardEveryItem": "带着楼里所有物件从堆煤场走出去",
      "arcGoalYardLedgerFull": "抱着春季台账、带齐五条线索从堆煤场走出去",
      "arcGoalYardEveryItemFull": "带齐所有物件和五条线索从堆煤场走出去",
      "arcGoalRoofEveryItemFull": "带着所有物件和五条线索走到屋顶结局",
      "arcGoalSecretEveryItemFull": "带着所有物件和五条线索走到隐藏结局",
      "arcGoalLedgerDryFull": "不带保温壶、带齐五条线索走到台账结局",
      "arcGoalYardDryFull": "不带保温壶、带齐五条线索从堆煤场走出去",
      "arcGoalYardNoPowerFull": "在备用电源始终不恢复的情况下，带着所有物件和五条线索从堆煤场走出去",
      "arcGoalYardCageDryFull": "不带保温壶、带着五条线索和已打开的测绘笼，从堆煤场走出去",
      "arcGoalRoofWetCageFull": "带着所有物件、五条线索、淹水书库和测绘笼走到屋顶结局",
      "arcGoalYardCageManifestDryFull": "不带保温壶、带着五条线索、测绘笼和地磅房清单，从堆煤场走出去",
      "arcGoalRoofWetManifestFull": "带着所有物件、五条线索、淹水书库和地磅房清单走到屋顶结局",
      "arcGoalSecretCageManifestPressFull": "带着所有物件、五条线索、测绘笼、地磅房清单和压印副本走到隐藏结局",
      "arcEndLedger": "台账结局",
      "arcEndRoof": "屋顶结局",
      "arcEndSecret": "隐藏结局",
      "arcEndYard": "煤场结局",
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
        "Goal: get out of the closed archive - the thirty nights each ask for a different way out.",
        "Action: click a choice or press its number 1-4; Backspace retraces one passage and L reads your clue log aloud.",
        "Rule: a greyed choice is not a dead end, it names the item, flag or clue it still wants; the mapped rooms, satchel and clues stay on screen so you never have to remember.",
        "Turns: a shorter route scores better, so a run that walks the whole map will finish - it just will not shine.",
        "Endings: a ledger ending, a roof ending, a coal-yard ending reached by rigging the hoist cable to the chute behind the boiler, and one secret ending that only the five clue tiles together will open.",
        "Before the night is dealt the story graph is checked by machine: every passage reachable, all three standard endings reachable, no passage without a way onward.",
      ],
      zh: [
        "目标：从夜里关门的档案楼里出去——三十个夜晚，各要你走一种不同的出去法。",
        "操作：点选项，或按它前面的数字 1-4；退格键退回一段，L 键把线索日志念出来。",
        "规则：灰掉的选项不是死路，它会写明还缺哪件东西、哪个状态或哪条线索；已探明的房间、口袋和线索一直摆在屏上，不用你记。",
        "步数：路线越短分越高，所以把整栋楼走完也能通关——只是不会太亮眼。",
        "结局：一个台账结局、一个屋顶结局、一个把吊缆系上锅炉后滑道才能走到的煤场结局，还有一个必须五块线索牌凑齐才会开的隐藏结局。",
        "开局前，机器会先校验这张故事图：每段都可达、三个常规结局都可达、没有任何一段进去就出不来。",
      ],
    },
  });

  /* Exported for the other modules. */
  App.initArchiveEscapeGame = initArchiveEscapeGame;
})(window.CapitalConvert = window.CapitalConvert || {});
