/* Courtroom of Animals - the argument case in the shared game drawer.
 * Three witnesses, a shelf of fixed exhibits, a bench of claims and a limited
 * number of court actions. Claim strength and witness trust are two separate
 * numbers, and a true claim carried by a distrusted witness still loses: that
 * trade-off is the game. Registered through the game registry, so it needs no
 * markup in the four pages, and every case is proved reachable by
 * courtSolvable before it is ever dealt. Turn based: no timers at all. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  var t = App.t;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  var createCampaign = App.createCampaign;
  var fillCampaignPicker = App.fillCampaignPicker;
  var starsFor = App.starsFor;
  var ctaTrustMax = 5;
  var ctaHasOwn = Object.prototype.hasOwnProperty;

  /* --- the docket: eight authored cases ---------------------------------- */
  var ctaCases = [
    {
      id: "k1", labelKey: "ctaCase1", time: 8, culprit: "rat",
      bar: { strength: 5, trust: 2 },
      charge: {
        en: "Farmer Owl's grain sack went out of the barn overnight. Two neighbours have already been named for it, and the string on the floor has not been read by anyone.",
        zh: "猫头鹰农夫的粮袋昨夜从谷仓里消失了。已经有两个邻居被点了名，可地上那截绳子还没人读过。",
      },
      suspects: [
        { id: "rat", en: "Rufus the Rat", zh: "老鼠鲁福" },
        { id: "hen", en: "Petra the Hen", zh: "母鸡佩特拉" },
        { id: "goose", en: "Barnaby the Goose", zh: "鹅巴纳比" },
      ],
      exhibits: [
        { id: "k1e1", weight: 2, en: "The sack's string, gnawed through in neat teeth-marks, not cut.", zh: "袋口的绳子是被整齐的牙印咬断的，不是割断的。" },
        { id: "k1e2", weight: 1, en: "A webbed print in the threshing dust, dry and unbroken since Tuesday.", zh: "打谷场的灰上有一个蹼印，从周二起就干着，谁也没踩破。" },
        { id: "k1e3", weight: 2, en: "A trail of spilled grain running straight to a hole under the floor.", zh: "一路洒落的谷粒，笔直通向地板下的一个洞。" },
      ],
      witnesses: [
        {
          id: "k1w1", trust: 3, en: "Petra the Hen", zh: "母鸡佩特拉",
          statements: [
            { id: "k1s1", claim: "k1c1", en: "I heard gnawing under the floorboards at second bell - slow, patient, unhurried.", zh: "二更的时候，我听见地板下有咬啮声，又慢又有耐心，一点不着急。" },
            { id: "k1s2", contra: ["k1e2"], en: "Barnaby sleeps in the loft and never comes down before the door is opened.", zh: "巴纳比住在阁楼上，门没开之前他从不下来。" },
          ],
        },
        {
          id: "k1w2", trust: 3, en: "Barnaby the Goose", zh: "鹅巴纳比",
          statements: [
            { id: "k1s3", en: "I saw Petra at the sack in the dusk, pecking at the knot.", zh: "黄昏时我看见佩特拉在袋子旁边，啄那个结。" },
            { id: "k1s4", contra: ["k1e2"], en: "My feet are webbed. I could not climb the loft ladder, let alone the wall.", zh: "我脚上是蹼。阁楼的梯子我都上不去，更别说翻墙。" },
          ],
        },
        {
          id: "k1w3", trust: 2, en: "Rufus the Rat", zh: "老鼠鲁福",
          statements: [
            { id: "k1s5", en: "I keep to the granary wall. Sacks are nothing to me.", zh: "我只在谷仓墙根活动，麻袋跟我没有关系。" },
            { id: "k1s6", claim: "k1c1", en: "There is a warm hole under the floor by the sack. I put my whiskers in and it was full of grain dust.", zh: "地板下、袋子旁边有个暖和的洞。我把胡须探进去，里面全是谷壳的粉。" },
          ],
        },
      ],
      presses: [],
      vouches: [],
      claims: [
        { id: "k1c1", accused: "rat", statements: ["k1s1", "k1s6"], exhibits: ["k1e1", "k1e3"], en: "Rufus gnawed the string and dragged the sack under the floor", zh: "鲁福咬断绳子，把袋子拖进了地板下" },
        { id: "k1c2", accused: "hen", statements: ["k1s3"], exhibits: ["k1e2"], en: "Petra picked the knot and hid the sack in the yard", zh: "佩特拉啄开结，把袋子藏在院里" },
      ],
    },
    {
      id: "k2", labelKey: "ctaCase2", time: 11, culprit: "boar",
      bar: { strength: 6, trust: 2 },
      charge: {
        en: "Badger's kitchen garden was flattened before dawn. The court already likes one witness and dislikes another, and it will tell you so in numbers.",
        zh: "獾的菜园在天亮前被踩成平地。法庭本来就信一个证人、不信另一个，而且会用数字告诉你这一点。",
      },
      suspects: [
        { id: "boar", en: "Torvald the Boar", zh: "野猪托瓦" },
        { id: "goat", en: "Milly the Goat", zh: "山羊米莉" },
        { id: "crow", en: "Corvin the Crow", zh: "乌鸦科尔文" },
      ],
      exhibits: [
        { id: "k2e1", weight: 2, en: "A furrow turned up snout-first, from the gate to the beans, one depth all the way.", zh: "一道从门口翻到豆畦的垄，鼻子先入，深浅一路一样。" },
        { id: "k2e2", weight: 1, en: "Clover crushed flat by a wide soft pad, not by a hoof.", zh: "三叶草是被宽软的脚掌压平的，不是蹄子。" },
        { id: "k2e3", weight: 2, en: "The garden gate, latched from the outside with a wire that is not Badger's.", zh: "菜园门从外面用一截不是獾的铁丝别住了。" },
      ],
      witnesses: [
        {
          id: "k2w1", trust: 5, en: "Wenda the Sheep", zh: "绵羊温达",
          statements: [
            { id: "k2s1", claim: "k2c1", en: "Torvald roots for grubs before dawn. He turned my corner over last spring and I watched him do it.", zh: "托瓦天亮前就翻土找虫。去年春天他把我家那角拱翻过，我亲眼看着的。" },
            { id: "k2s2", en: "Milly stood in the north field. I grazed beside her and she never left me.", zh: "米莉在北边地里。我就在她旁边吃草，她一步没离开。" },
          ],
        },
        {
          id: "k2w2", trust: 1, en: "Torvald the Boar", zh: "野猪托瓦",
          statements: [
            { id: "k2s3", contra: ["k2e3"], en: "I root where I please, but not in a walled garden. The gate was shut against me.", zh: "我想拱哪儿就拱哪儿，但不在有墙的菜园里。那道门是关住我的。" },
            { id: "k2s4", claim: "k2c1", contra: ["k2e2"], en: "The furrow at the gate is one depth with the furrow at the beans. One animal made both, and it was not a light one.", zh: "门口的垄和豆畦的垄是一个深度。两处是同一只动物拱的，而且它不轻。" },
          ],
        },
        {
          id: "k2w3", trust: 3, en: "Milly the Goat", zh: "山羊米莉",
          statements: [
            { id: "k2s5", contra: ["k2e2"], en: "Something ate the bean flowers and left the stems standing. That is a mouth, not a snout.", zh: "有东西把豆花吃了、茎却留着。那是张嘴，不是鼻子。" },
            { id: "k2s6", claim: "k2c3", en: "The crushed clover along the wall is a flat pad. My hoof makes holes, not pads.", zh: "墙边压平的是三叶草上的宽脚掌印。我的蹄子留下的是坑，不是掌印。" },
          ],
        },
      ],
      presses: [
        { id: "k2p1", witness: "k2w1", with: "k2s4", contra: ["k2s1"], claim: "k2c1", cost: 1, en: "You watched him root your corner in spring, but nobody watched him enter a locked garden.", zh: "你春天看着他拱翻你那角，可没人看着他进过一道锁着的园子。" },
        { id: "k2p2", witness: "k2w1", with: "k2e3", contra: ["k2s1"], claim: "k2c1", cost: 1, en: "If you saw him go in, you also saw a gate that latches from outside open from inside.", zh: "你既然看见他进去，那也就看见了一道从外面别上的门从里面开了。" },
      ],
      vouches: [
        { id: "k2v1", witness: "k2w2", exhibit: "k2e1", claim: "k2c1", en: "The furrow's depth matches his snout to a finger's width: the court reads an honest measurement, not a confession.", zh: "垄的深度和他的鼻子只差一指宽：法庭读出来的是老实的测量，不是招供。" },
      ],
      claims: [
        { id: "k2c1", accused: "boar", statements: ["k2s1", "k2s4"], exhibits: ["k2e1", "k2e3"], en: "Torvald rooted the garden flat before dawn", zh: "托瓦在天亮前把菜园拱平" },
        { id: "k2c2", accused: "goat", statements: ["k2s5", "k2s6"], exhibits: ["k2e2"], en: "Milly broke the hedge for the bean flowers", zh: "米莉为豆花撞倒了篱笆" },
        { id: "k2c3", accused: "crow", statements: ["k2s5"], exhibits: ["k2e2", "k2e3"], en: "Corvin undid the wire and let the damage in", zh: "科尔文拨开铁丝，把祸放进来" },
      ],
    },
    {
      id: "k3", labelKey: "ctaCase3", time: 12, culprit: "beaver",
      bar: { strength: 8, trust: 2 },
      charge: {
        en: "The low dam gave way at midnight and the mill race ran dry. One witness here is telling an untruth about the bank, and only pressure will show which one.",
        zh: "低坝半夜溃了，磨坊水道见了底。这堂上有一位关于堤岸说了假话，只有逼问才能看出是哪一位。",
      },
      suspects: [
        { id: "beaver", en: "Ossian the Beaver", zh: "河狸奥西安" },
        { id: "otter", en: "Lys the Otter", zh: "水獭丽丝" },
        { id: "heron", en: "Marda the Heron", zh: "苍鹭玛尔达" },
      ],
      exhibits: [
        { id: "k3e1", weight: 1, en: "A seep-mark a hand below the crest. That mark takes an hour of running water to make.", zh: "渗痕在坝顶下一掌高。这样的印子要流水走一个钟头才留得下。" },
        { id: "k3e2", weight: 2, en: "A fresh float-groove in the clay, wide for one log and for no more.", zh: "黏土上一道新的漂木槽，只容一根木头，别的都不容。" },
        { id: "k3e3", weight: 2, en: "Ossian's own tally of timber, short by one log, dated the night of the burst.", zh: "奥西安自己的木材流水账，短了一根，日期正是溃坝那夜。" },
        { id: "k3e4", weight: 1, en: "Lys's haul, drawn up and undamaged on her own bank.", zh: "丽丝的拖囊收在自己岸上，一处没破。" },
      ],
      witnesses: [
        {
          id: "k3w1", trust: 4, en: "Marda the Heron", zh: "苍鹭玛尔达",
          statements: [
            { id: "k3s1", claim: "k3c1", en: "The low bank was weeping before dusk. I stood on it and I said nothing, and I have thought about that all night.", zh: "天没黑，低堤就在渗水了。我就站在上面，什么也没说，整夜都在想这件事。" },
            { id: "k3s2", en: "Lys swam the tail race all night. She was in the water when it went.", zh: "丽丝整夜在尾渠里游。坝塌的时候她就在水里。" },
          ],
        },
        {
          id: "k3w2", trust: 4, en: "Ossian the Beaver", zh: "河狸奥西安",
          statements: [
            { id: "k3s3", lie: true, en: "I left the bank sound at dusk. I wiped my blade and went home to bark-tea.", zh: "我走的时候堤岸是好的。我擦了刀，回家喝树皮茶去了。" },
            { id: "k3s4", en: "There is a float-groove under the crest. I know the shape of one: I have cut them for forty years.", zh: "坝顶下面有一道漂木槽。那形状我认得：我刨了四十年。" },
          ],
        },
        {
          id: "k3w3", trust: 2, en: "Lys the Otter", zh: "水獭丽丝",
          statements: [
            { id: "k3s5", contra: ["k3s2"], en: "I swim the tail race. I do not climb a crest with a load on my back.", zh: "我只在尾渠里游。我背上驮着东西的时候，从不上坝顶。" },
            { id: "k3s6", claim: "k3c1", en: "There were fresh chips on my bank stones, and somebody carried them past my water at midnight.", zh: "我家门口的石头上有新木屑，还有人在半夜抱着东西从我的水边过去。" },
          ],
        },
      ],
      presses: [
        { id: "k3p1", witness: "k3w2", with: "k3e1", contra: ["k3s3"], exposes: "k3s3", claim: "k3c1", cost: 1, en: "A seep-mark that size needs an hour of water, so the bank was not sound when you left it.", zh: "那么大的渗痕要流水走一个钟头，所以你走的时候堤岸并不是好的。" },
        { id: "k3p2", witness: "k3w2", with: "k3s6", contra: ["k3s4"], claim: "k3c1", cost: 1, en: "You know the groove because you cut it, and your tally is one log lighter than your neighbour's bridge.", zh: "你认得那道槽，因为是你刨的；你的流水账比邻桥少一根木头。" },
      ],
      vouches: [
        { id: "k3v1", witness: "k3w3", exhibit: "k3e4", claim: "k3c1", en: "A haul left undamaged on her own bank is a character reference written by the mud.", zh: "拖囊在自己岸上一处没破，这是泥浆替她写的一份品行证明。" },
      ],
      claims: [
        { id: "k3c1", accused: "beaver", statements: ["k3s1", "k3s6"], exhibits: ["k3e2", "k3e3"], en: "Ossian undercut the bank to float one log and let the dam go", zh: "奥西安为了漂一根木头刨空了堤脚，把坝放倒" },
        { id: "k3c2", accused: "otter", statements: ["k3s2", "k3s5"], exhibits: ["k3e1"], en: "Lys's swimming weakened the tail race", zh: "丽丝夜夜游水，把尾渠泡松了" },
        { id: "k3c3", accused: "heron", statements: ["k3s3", "k3s2"], exhibits: ["k3e1", "k3e4"], en: "Marda knew and said nothing, so the bank is nobody's fault", zh: "玛尔达早知道却没说，所以谁也不怪，只怪堤" },
      ],
    },
    {
      id: "k4", labelKey: "ctaCase4", time: 9, culprit: "fox",
      bar: { strength: 9, trust: 3 },
      charge: {
        en: "The cathedral's silver star went out of the tower at the eleventh bell. Two animals hold an alibi for each other, and the docket closes in nine actions.",
        zh: "大教堂的银星在第十一下钟声里从塔上不见了。有两只动物互相为对方作证，而案卷只给你九次庭上动作。",
      },
      suspects: [
        { id: "fox", en: "Reynard the Fox", zh: "狐狸雷诺" },
        { id: "crow", en: "Corvin the Crow", zh: "乌鸦科尔文" },
        { id: "dog", en: "Barnabus the Bell-Ringer", zh: "敲钟犬巴纳" },
      ],
      exhibits: [
        { id: "k4e1", weight: 3, en: "Red river mud on the tower stair, dried in the shape of a clawed, dogless print.", zh: "塔梯上有红色的河泥，干成了带爪、无蹄印的形状。" },
        { id: "k4e2", weight: 2, en: "The bell rope, still damp in the middle, where a body leaned.", zh: "钟绳中段还是潮的，那里曾靠过一副身子。" },
        { id: "k4e3", weight: 2, en: "The silver star, found in the reeds below the tower, one claw mark across the star.", zh: "银星在塔下的芦苇里找到，星身上有一道爪痕。" },
      ],
      witnesses: [
        {
          id: "k4w1", trust: 3, en: "Corvin the Crow", zh: "乌鸦科尔文",
          statements: [
            { id: "k4s1", lie: true, en: "Reynard was with me on the tower from vespers to the eleventh bell. We watched the river together.", zh: "雷诺从晚祷到第十一下钟声都和我在塔上，我们一起看河。" },
            { id: "k4s2", contra: ["k4e2"], en: "The rope was wet that night, and I do not know why.", zh: "那晚钟绳是湿的，我不知道为什么。" },
          ],
        },
        {
          id: "k4w2", trust: 2, en: "Reynard the Fox", zh: "狐狸雷诺",
          statements: [
            { id: "k4s3", en: "I was asleep in my earth. The crow can prove it, if a crow's word is proof.", zh: "我在我洞里睡死了。乌鸦能证明——如果乌鸦的话算证明。" },
            { id: "k4s4", contra: ["k4e1"], en: "I carry red mud on my hind foot from the riverbank. It is from the riverbank, and I say so before anyone accuses me.", zh: "我后脚上带着红河泥，是从河滩来的。我先把话说在前头，不等人来指我。" },
          ],
        },
        {
          id: "k4w3", trust: 4, en: "Barnabus the Bell-Ringer", zh: "敲钟犬巴纳",
          statements: [
            { id: "k4s5", claim: "k4c1", contra: ["k4s1"], en: "I rang the eleventh bell alone. The tower was empty and so was the stair, and I counted the steps as I went up.", zh: "第十一下钟是我一个人敲的。塔上没人，梯上也没人，上去时我还在数台阶。" },
            { id: "k4s6", claim: "k4c1", en: "The rope was wet from wet fur. Only one animal here swims and then climbs.", zh: "钟绳是被湿毛蹭潮的。这儿只有一只动物会游水，游完还往上爬。" },
          ],
        },
      ],
      presses: [
        { id: "k4p1", witness: "k4w1", with: "k4e1", contra: ["k4s1"], exposes: "k4s1", claim: "k4c1", cost: 1, en: "Clawed mud on the stair, and a bird who swears the tower was company all evening.", zh: "梯上有带爪的泥，而一只鸟却赌咒说塔上整晚都有伴。" },
        { id: "k4p2", witness: "k4w2", with: "k4s5", contra: ["k4s3"], claim: "k4c1", cost: 1, en: "You slept in your earth, yet the bell-ringer counted an empty stair and a wet rope.", zh: "你说在洞里睡觉，可敲钟人数过空梯，绳还是湿的。" },
        { id: "k4p3", witness: "k4w3", with: "k4s1", contra: ["k4s5"], claim: "k4c1", cost: 1, en: "You say you were alone, but you also say nobody was on the tower - twice, in different words.", zh: "你说你独自一人，又说塔上没人——两遍，用了两种说法。" },
      ],
      vouches: [
        { id: "k4v1", witness: "k4w3", exhibit: "k4e2", claim: "k4c1", en: "A damp middle on the rope is a second body, which is exactly what the bell-ringer said and nobody believed.", zh: "钟绳中段的水印就是第二副身子，这正是敲钟人说了却没人信的那句话。" },
      ],
      claims: [
        { id: "k4c1", accused: "fox", statements: ["k4s5", "k4s6"], exhibits: ["k4e1", "k4e2", "k4e3"], en: "Reynard climbed the tower at the eleventh bell", zh: "雷诺在第十一下钟声时爬上了塔" },
        { id: "k4c2", accused: "crow", statements: ["k4s4", "k4s5"], exhibits: ["k4e3"], en: "Corvin took the star and laid mud to hang the fox", zh: "科尔文取了银星，又布下泥陷害狐狸" },
        { id: "k4c3", accused: "dog", statements: ["k4s1", "k4s3"], exhibits: ["k4e2"], en: "Barnabus rang an empty tower and kept the star himself", zh: "巴纳独自敲一座空塔，银星是他自己藏的" },
      ],
    },
    {
      id: "k5", labelKey: "ctaCase5", time: 11, culprit: "marten",
      bar: { strength: 12, trust: 3 },
      charge: {
        en: "The village bee-tree was opened in the night and one whole comb went off it. The lid lies on the ground, and the wax on that lid is still warm.",
        zh: "村口那棵蜂树夜里被人打开，一整块蜜脾不见了。盖子扔在地上，上头的蜡还是温的。",
      },
      suspects: [
        { id: "marten", en: "Sable the Pine Marten", zh: "紫貂萨贝尔" },
        { id: "jay", en: "Jesse the Jay", zh: "松鸦杰西" },
        { id: "stoat", en: "Cobb the Stoat", zh: "白鼬科布" },
      ],
      exhibits: [
        { id: "k5e1", weight: 3, en: "The lid of the bee-tree, one edge smeared with wax in four long parallel scratches.", zh: "蜂树的盖子，一边抹着蜡，蜡上留着四道又长又直的平行抓痕。" },
        { id: "k5e2", weight: 2, en: "A honey trail from the tree to the fence, and then up the fence post for three feet.", zh: "一路蜜痕从蜂树通到篱笆，然后又顺着篱笆柱往上爬了三尺。" },
        { id: "k5e3", weight: 2, en: "A whole comb weighs six pounds, and no bird on this bench can lift six pounds off the ground.", zh: "一整块蜜脾有六磅重。庭上这些鸟，没有一只叼得动它。" },
        { id: "k5e4", weight: 1, en: "The jay's winter hoard under the eaves: sixty cocoons of bee-moth, and not one flake of wax.", zh: "屋檐下松鸦的冬储：六十个蜂蛾的茧，一片蜡屑都没有。" },
      ],
      witnesses: [
        {
          id: "k5w1", trust: 4, en: "Jesse the Jay", zh: "松鸦杰西",
          statements: [
            { id: "k5s1", claim: "k5c1", en: "I sat on that post from first light. Nothing went up it on four feet without my seeing it, and the one thing that went up dragged its belly.", zh: "头一道亮光我就在那根柱子上。四条腿的东西想上去，没有一样躲得过我的眼。真上去的那一只，肚子是拖着地的。" },
            { id: "k5s2", contra: ["k5e2"], en: "What a jay carries, a jay carries in its bill and flies off with. I do not climb with a load.", zh: "松鸦搬东西靠嘴叼，叼起来就飞。我不会驮着东西往上爬。" },
          ],
        },
        {
          id: "k5w2", trust: 5, en: "Cobb the Stoat", zh: "白鼬科布",
          statements: [
            { id: "k5s3", claim: "k5c1", en: "A stoat is quick but short in the back. Whatever turned inside that tree was long in the body, and a long body goes low.", zh: "白鼬身子灵活，可背太短。在那树里还能转开身子的，是条长背的东西，走路压得低低的。" },
            { id: "k5s4", claim: "k5c2", en: "The trail up that post was poured, not walked. Honey does not climb on its own to a hole no bird lives in.", zh: "柱上那道蜜痕是倒上去的，不是走上去的。蜜自己不会往一个连鸟都不住的洞上爬。" },
          ],
        },
        {
          id: "k5w3", trust: 4, en: "Sable the Pine Marten", zh: "紫貂萨贝尔",
          statements: [
            { id: "k5s5", lie: true, en: "I have not been near the bee-tree since the autumn. My feet are dry, and the orchard kept me all season.", zh: "入秋以来我没靠近过蜂树。我脚上是干的，果园整季都留着我。" },
            { id: "k5s6", claim: "k5c1", en: "A comb comes out of a hollow whole only if the thief can tear wax with claws and turn in the dark. I know that shape of mark. I make marks.", zh: "一块整脾能从树洞里完好出来，除非来客会用爪子撕蜡，又能在黑地里转身。那种印子的样子我认得——我自己也留印子。" },
          ],
        },
      ],
      presses: [
        { id: "k5p1", witness: "k5w3", with: "k5e1", contra: ["k5s5"], claim: "k5c1", cost: 1, en: "Warm wax on a lid, four fingers wide, and a mouth that says the orchard kept it.", zh: "盖上的蜡还温着，四指宽。而这张嘴却说果园留住了它。" },
        { id: "k5p2", witness: "k5w3", with: "k5e2", contra: ["k5s5"], exposes: "k5s5", claim: "k5c1", cost: 1, en: "A belly that drags leaves honey three feet up a post. Ask that animal to say once more that its feet are dry.", zh: "拖着肚皮的家伙把蜜带上柱头三尺高。再叫它说一遍：它的脚是干的。" },
        { id: "k5p3", witness: "k5w1", with: "k5e4", contra: ["k5s2"], claim: "k5c1", cost: 1, en: "Your hoard is sixty cocoons and no wax at all, so that comb was never a bird's to carry off.", zh: "你囤的是六十个茧，一星蜡也没有。所以那块脾从来不是鸟叼得走的。" },
        { id: "k5p4", witness: "k5w1", with: "k5e3", contra: ["k5s4"], claim: "k5c2", cost: 1, en: "You say the trail was poured. Then you came down with six pounds in your bill, set them down, and flew.", zh: "你说那道痕是倒出来的。那你就得叼着六磅落到地上，把它放下，再飞起来。" },
      ],
      vouches: [
        { id: "k5v1", witness: "k5w3", exhibit: "k5e3", claim: "k5c1", en: "Six pounds off the ground is a body and a back. The bench reads that as a shape, and not as a confession.", zh: "六磅离地，靠的是身子加一条背。法庭把这读成一种身形，不读成一份招供。" },
      ],
      claims: [
        { id: "k5c1", accused: "marten", statements: ["k5s1", "k5s3", "k5s6"], exhibits: ["k5e1", "k5e2", "k5e3"], en: "Sable climbed the post, opened the bee-tree and carried the comb whole", zh: "萨贝尔爬上篱笆柱，打开蜂树，把整块蜜脾搬走" },
        { id: "k5c2", accused: "jay", statements: ["k5s2", "k5s4"], exhibits: ["k5e2", "k5e4"], en: "Jesse poured a false trail up the post and flew the comb away", zh: "杰西沿柱子倒出一条假道，把蜜脾叼着飞走" },
        { id: "k5c3", accused: "stoat", statements: ["k5s5"], exhibits: ["k5e1", "k5e4"], en: "Cobb slid the lid off and took the comb for his own winter", zh: "科布挪开盖子，把蜜脾搬回去过冬" },
      ],
    },
    {
      id: "k6", labelKey: "ctaCase6", time: 12, culprit: "cat",
      bar: { strength: 13, trust: 3 },
      charge: {
        en: "Two crocks of cream went off Barley's cool-room shelf, and the sill they were taken over was left greased. This bench believes one witness easier than the others, and it says so in numbers.",
        zh: "巴利乳品房里两只奶油罐从架上没了，翻出去的那道窗台留下了油。这位证人比别位更容易被信，而法庭会用数字说这一点。",
      },
      suspects: [
        { id: "cat", en: "Malkin the Cat", zh: "猫马尔金" },
        { id: "rook", en: "Ambrose the Rook", zh: "秃鼻乌鸦安布罗斯" },
        { id: "mink", en: "Vess the Mink", zh: "水貂薇丝" },
      ],
      exhibits: [
        { id: "k6e1", weight: 3, en: "The cool-room sill, greased along its outer edge at the height of a sitting body.", zh: "乳品房那道窗台，外沿抹着油，油正到一只坐着的身子那么高。" },
        { id: "k6e2", weight: 3, en: "One crock left in the yard, licked clean to a ring at the rim, its lid still on the hasp.", zh: "院里剩下的那只罐被舔到口上留了一圈，盖子还搭在门销上。" },
        { id: "k6e3", weight: 1, en: "The floor within, swept in long arcs that morning, holding one line of grease and no print.", zh: "屋里的地板当天早上用长扫帚扫过，只留下一道油线，一个脚印也没有。" },
        { id: "k6e4", weight: 2, en: "A print in the cream spill outside: a broad pad with the claw-points out, dry since the scuttle shut.", zh: "屋外奶油渍里一个掌印：又宽又露着爪尖，从柜子关上起就干着了。" },
      ],
      witnesses: [
        {
          id: "k6w1", trust: 4, en: "Malkin the Cat", zh: "猫马尔金",
          statements: [
            { id: "k6s1", claim: "k6c1", en: "Cream is not eaten, it is licked, and a licking leaves a ring at the rim. That ring is on the yard crock, and I have seen it.", zh: "奶油不是吃下去的，是舔下去的。舔过就在罐口留一圈。院里那只罐上就是这么一圈，我亲眼看见了。" },
            { id: "k6s2", lie: true, en: "That sill was shut on the latch, and I stood in the barn the whole night. The dog will say so for me.", zh: "那道窗台是闩着的，我在谷仓里站了整夜。这一点，狗可以替我说。" },
          ],
        },
        {
          id: "k6w2", trust: 4, en: "Ambrose the Rook", zh: "秃鼻乌鸦安布罗斯",
          statements: [
            { id: "k6s3", claim: "k6c1", en: "I watched that sill from the ridge. What left it sat down first, the way a footed thing sits, and it sat on grease.", zh: "我从屋脊上看着那道窗台。离开台子的那只先坐了下来，像有脚的东西那样坐。而它坐的地方有油。" },
            { id: "k6s4", claim: "k6c2", en: "A crock cannot be flown, and no bird sat on that sill. What went over came down the chimney and stood on the shelf.", zh: "罐子飞不动，那道台子上也没有鸟坐过。翻过去的是一只从烟筒下来、站在架子上的东西。" },
          ],
        },
        {
          id: "k6w3", trust: 5, en: "Vess the Mink", zh: "水貂薇丝",
          statements: [
            { id: "k6s5", claim: "k6c1", en: "My neck goes into a crock and my head comes out dry. A cat licks a ring; a mink takes the whole top off.", zh: "我脖子探得进罐子，抽出来头还是干的。猫是把口舔成一圈，水貂是把顶上整个舔掉。" },
            { id: "k6s6", contra: ["k6e3"], en: "Water was my road in and out. There is no wet print at that door and no drip on that swept floor.", zh: "水才是我进出的路。那门口没有湿印，那道扫过的地板上一滴也没有。" },
          ],
        },
      ],
      presses: [
        { id: "k6p1", witness: "k6w1", with: "k6e1", contra: ["k6s2"], claim: "k6c1", cost: 1, en: "A shut sill does not get greased on its own outer edge at the height of a sitting body.", zh: "闩着的窗台，不会在自己外沿、一只坐着的身子那么高的地方留下油。" },
        { id: "k6p2", witness: "k6w1", with: "k6e2", contra: ["k6s2"], exposes: "k6s2", claim: "k6c1", cost: 1, en: "The lid still on the hasp and the rim licked to a ring. Now say the whole night in the barn again.", zh: "盖子还搭在销上，罐口舔成一圈。那就把你整夜在谷仓那句，再说一遍。" },
        { id: "k6p3", witness: "k6w2", with: "k6e4", contra: ["k6s3"], claim: "k6c1", cost: 1, en: "You saw a sit-down on that sill and you say nothing of a pad with the claw-points out in the spill.", zh: "你看见那台子上有只东西坐下去，却对渍里那个露着爪尖的掌印一个字不提。" },
        { id: "k6p4", witness: "k6w2", with: "k6e3", contra: ["k6s4"], claim: "k6c2", cost: 1, en: "You say the thing came down the chimney. Then you stood on the ridge and watched a shelf being emptied.", zh: "你说那只是从烟筒下来的。那你就一直站在屋脊上，看着一只架子被舔空。" },
      ],
      vouches: [
        { id: "k6v1", witness: "k6w1", exhibit: "k6e4", claim: "k6c1", en: "Claw-points out is a cat's print, and this farm keeps no other climber. The bench reads one print it can see before a tale it must take on trust.", zh: "爪尖外露就是猫的印子，这农庄不养第二只会爬的。法庭先读一只看得见的爪印，再读一句只能靠信的话。" },
        { id: "k6v2", witness: "k6w2", exhibit: "k6e1", claim: "k6c1", en: "The height of the grease and the height of a sit-down are one height, and a witness who only watched set neither of them there.", zh: "油的高度，和坐下那一下的高度，是同一个高度。一位只是看着的证人，两样都不是他放上去的。" },
      ],
      claims: [
        { id: "k6c1", accused: "cat", statements: ["k6s1", "k6s3", "k6s5"], exhibits: ["k6e1", "k6e2", "k6e3"], en: "Malkin went over the greased sill and licked two crocks clean", zh: "马尔金越过抹了油的窗台，把两只罐舔得干干净净" },
        { id: "k6c2", accused: "rook", statements: ["k6s2", "k6s4"], exhibits: ["k6e3", "k6e4"], en: "Ambrose came down the chimney and took the cream off the shelf", zh: "安布罗斯落下烟筒，从架上取走了奶油" },
        { id: "k6c3", accused: "mink", statements: ["k6s4", "k6s6"], exhibits: ["k6e2", "k6e4"], en: "Vess came up the water and took the whole top off both crocks", zh: "薇丝顺着水路进来，把两只罐顶上整个舔掉" },
      ],
    },
    {
      id: "k7", labelKey: "ctaCase7", time: 13, culprit: "weasel",
      bar: { strength: 15, trust: 4 },
      charge: {
        en: "The best fleece of the shearing came off the drying room rack and a damp second-grade one was laid in its place. No rain fell all night, so somebody carried the wet in.",
        zh: "剪下来最好的一条羊毛被人从烘干架上拿走，上面放了条潮的二等毛。整夜没落一滴雨，所以那点儿湿是来客自己带进来的。",
      },
      suspects: [
        { id: "weasel", en: "Tams the Weasel", zh: "黄鼬塔姆" },
        { id: "magpie", en: "Odric the Magpie", zh: "喜鹊奥德里克" },
        { id: "dog", en: "Fen the Sheepdog", zh: "牧羊犬芬" },
      ],
      exhibits: [
        { id: "k7e1", weight: 3, en: "The fleece's own tally tag, its cord bitten through and the ends frayed inward.", zh: "那条羊毛自己的计数字牌，绳是被咬断的，断头朝里起毛。" },
        { id: "k7e2", weight: 3, en: "The fleece that came back: damp at one corner, and a burr of burdock caught in the wool.", zh: "换回来的那条毛：一角是潮的，毛里还卡着一粒牛蒡子。" },
        { id: "k7e3", weight: 2, en: "A drag on the drying room floor, one body wide, running from the rack to the crack under the wall.", zh: "烘干房地上一道拖痕，一个身宽，从毛架直墙根那道缝。" },
        { id: "k7e4", weight: 1, en: "The dog's bowl overturned, and the damp under it older than last night.", zh: "狗的盆被人掀翻，盆底下那片潮比昨夜还旧。" },
      ],
      witnesses: [
        {
          id: "k7w1", trust: 4, en: "Fen the Sheepdog", zh: "牧羊犬芬",
          statements: [
            { id: "k7s1", claim: "k7c1", en: "A tag cord goes at one bite, and the ends fray inward when the biter is small and wants the wool and not the tag.", zh: "计数绳一口就断。断头朝里起毛，说明咬的家伙个头小，要的是毛，不是那块牌。" },
            { id: "k7s2", contra: ["k7e4"], en: "I lay by that door and my bowl stood where I left it. Somebody turned it over and let it lie there, and it was not me.", zh: "我就躺在那门边，我的盆还在原处。有人把它掀翻就那么扔着，那不是我。" },
          ],
        },
        {
          id: "k7w2", trust: 4, en: "Odric the Magpie", zh: "喜鹊奥德里克",
          statements: [
            { id: "k7s3", claim: "k7c1", en: "I have taken bright things off that rack for two seasons and never once took a thing that was not light. A fleece is not light.", zh: "那架子上亮闪闪的东西我捡了两季，从没拿过一样不轻的。一条羊毛可不轻。" },
            { id: "k7s4", claim: "k7c2", en: "The burr in that fleece is burdock, and burdock stands only on the north bank, where nothing walks but a dog.", zh: "那条毛上的刺果是牛蒡。牛蒡只长在北岸，而北岸只有狗走过。" },
          ],
        },
        {
          id: "k7w3", trust: 4, en: "Tams the Weasel", zh: "黄鼬塔姆",
          statements: [
            { id: "k7s5", lie: true, en: "The drying room was barred and I was in the hayloft, and there is hayloft hay in my fur to prove it.", zh: "烘干房是闩着的，我在草料阁上。草料阁的草就在我毛里，这就是凭据。" },
            { id: "k7s6", claim: "k7c1", en: "Whatever went through that crack went in on its belly and came out the same way, and a damp corner means it was carried low through wet grass.", zh: "从那道缝进去的东西是贴着肚皮进的，也贴着肚皮出的。一角潮，说明它是从湿草里低低拖出来的。" },
          ],
        },
      ],
      presses: [
        { id: "k7p1", witness: "k7w1", with: "k7e2", contra: ["k7s2"], claim: "k7c1", cost: 1, en: "You keep that rack, and you saw a burr come in on a damp corner, and your own bowl lay turned and you never said so.", zh: "毛架归你看着。你看见带牛蒡的一角是潮着进来的，可你的盆被人掀翻扔在地上，你一个字没提。" },
        { id: "k7p2", witness: "k7w2", with: "k7e3", contra: ["k7s4"], claim: "k7c1", cost: 1, en: "A drag one body wide runs from the rack to the crack under the wall, and north bank burdock grows nowhere near that crack.", zh: "一个身宽的拖痕从毛架到墙缝，而北岸的牛蒡离那道缝远得很。" },
        { id: "k7p3", witness: "k7w3", with: "k7e1", contra: ["k7s5"], exposes: "k7s5", claim: "k7c1", cost: 1, en: "Hay in your fur, a cord bitten inward by a small mouth, and a barred room that holds nothing without shoulders.", zh: "你毛里带着草，绳被一张小口朝里咬断。而那间闩住的房子，根本拦不住一个没有肩的东西。" },
        { id: "k7p4", witness: "k7w2", with: "k7e4", contra: ["k7s3"], claim: "k7c2", cost: 1, en: "You say a fleece is too heavy for a bird. Then you watched one change hands on that rack and told the bench nothing.", zh: "你说一条羊毛重得鸟抬不动。那你就眼看着它在架上换了手，而庭上一字没说。" },
      ],
      vouches: [
        { id: "k7v1", witness: "k7w1", exhibit: "k7e1", claim: "k7c1", en: "A cord bitten inward is a small mouth's work, and the dog who counts the tags described that bite before anyone asked him.", zh: "绳朝里咬断是小口干的活。而数牌牌的那条狗，在被问之前就说清了这一口。" },
        { id: "k7v2", witness: "k7w2", exhibit: "k7e4", claim: "k7c1", en: "A bird who never once lifted a thing that was not light is a witness about weight, and the bench believes its own arithmetic.", zh: "从没拿过不轻东西的鸟，就是关于重量的证人。法庭信的正是它这笔账。" },
        { id: "k7v3", witness: "k7w3", exhibit: "k7e2", claim: "k7c1", en: "The burr and the damp corner are the road in and the road out, and they were named by the one mouth with every reason to leave them out.", zh: "牛蒡和那一角潮，就是进的路、出的路。说出这两样的，恰恰是最有理由不提它的那张嘴。" },
      ],
      claims: [
        { id: "k7c1", accused: "weasel", statements: ["k7s1", "k7s3", "k7s6"], exhibits: ["k7e1", "k7e2", "k7e3"], en: "Tams went in on her belly through the wall crack and swapped the fleece", zh: "塔姆贴着肚皮从墙缝进去，把那条羊毛换了出去" },
        { id: "k7c2", accused: "magpie", statements: ["k7s3", "k7s4"], exhibits: ["k7e2", "k7e4"], en: "Odric marked the fleece by the burr and carried word of it to the north bank", zh: "奥德里克靠那粒牛蒡认准了那条毛，还把信儿递到了北岸" },
        { id: "k7c3", accused: "dog", statements: ["k7s5"], exhibits: ["k7e4", "k7e1"], en: "Fen barred the room against a body with no shoulders and took the fleece himself", zh: "芬说房子闩住的是没有肩的东西，毛其实是他自己拿的" },
      ],
    },
    {
      id: "k8", labelKey: "ctaCase8", time: 14, culprit: "vole",
      bar: { strength: 17, trust: 4 },
      charge: {
        en: "The winter tally stick went out of the ash pit at the storehouse, the stick that counts every sack the village owes. The notches came back re-cut, and the pit lid was set down straight again.",
        zh: "库房灰坑里那根冬计棍不见了，那根棍记着全村每一袋欠账。刻痕重刻过，坑盖却端端正正又盖了回去。",
      },
      suspects: [
        { id: "vole", en: "Mops the Vole", zh: "田鼠莫普斯" },
        { id: "owl", en: "Stoop the Barn Owl", zh: "仓鸮斯图普" },
        { id: "hare", en: "Havick the Hare", zh: "野兔哈维克" },
      ],
      exhibits: [
        { id: "k8e1", weight: 3, en: "The tally stick itself: the old notches dark with ash, the new ones pale and cut deeper than any knife in that house.", zh: "计数棍本身：旧刻痕让灰浸得发黑，新的还发白，深得屋里哪把刀都刻不出来。" },
        { id: "k8e2", weight: 3, en: "The underside of the pit lid, greased along one edge, with ash pressed into the shape of a small belly.", zh: "坑盖底下，一边抹着油，油上的灰压出一个小肚子的形状。" },
        { id: "k8e3", weight: 3, en: "The storehouse ledger, written wet that morning, and short by one sack against the stick.", zh: "库房账簿那天早上是湿着写的，比棍子上的数少一袋。" },
        { id: "k8e4", weight: 1, en: "A tuft of under-fur caught in the hinge of the lid, from something with a short neck.", zh: "坑盖铰链上挂着一撮绒毛，来自某样脖子短的东西。" },
      ],
      witnesses: [
        {
          id: "k8w1", trust: 4, en: "Stoop the Barn Owl", zh: "仓鸮斯图普",
          statements: [
            { id: "k8s1", claim: "k8c1", en: "I hunt those rafters. All night I heard wood being worked by a small mouth, and it stopped every time the lid moved.", zh: "我在那梁上打猎。整夜我听见一张小口在硬木上做工，盖子一动它就停。" },
            { id: "k8s2", claim: "k8c1", en: "A deep notch holds no ash and a shallow one holds all of it. That stick was cut by teeth that were never hurried.", zh: "刻痕深就存不住灰，浅就全都存着。那根棍，是被从不慌张的牙刻的。" },
          ],
        },
        {
          id: "k8w2", trust: 4, en: "Havick the Hare", zh: "野兔哈维克",
          statements: [
            { id: "k8s3", claim: "k8c1", en: "I break sticks at the threshing floor. A hare's tooth scrapes before it notches, and there is no scrape on that tally.", zh: "我在打谷场咬断过棍子。兔牙刻痕之前先刮出一道毛，而这条计棍上一道刮痕都没有。" },
            { id: "k8s4", claim: "k8c2", en: "A lid set down straight was lifted by two hands or by none. A hare goes over a pit on his hind feet and never touches a lid.", zh: "盖得端正的盖子，是两只手放的，或者谁也没动过。兔子是后腿越过坑的，从不碰盖。" },
          ],
        },
        {
          id: "k8w3", trust: 4, en: "Mops the Vole", zh: "田鼠莫普斯",
          statements: [
            { id: "k8s5", lie: true, en: "I keep to the corn in the loft, and that stick never entered my mouth. The hunter above me all night can answer for me.", zh: "我只在阁楼的粮上待着，那根棍从没进过我的嘴。整夜在我上头的那位猎手，可以替我答话。" },
            { id: "k8s6", claim: "k8c1", en: "A notch is a mouthful. Whoever cut these cut them one mouthful at a time, and a mouthful of hard wood leaves filing in the cheeks.", zh: "一个刻痕就是一口。这些痕是一口一口刻下来的。一口硬木下去，腮里就攒着木屑。" },
          ],
        },
      ],
      presses: [
        { id: "k8p1", witness: "k8w1", with: "k8e3", contra: ["k8s2"], claim: "k8c1", cost: 1, en: "You heard the work all night from the rafters, and you never looked at a ledger written wet. A hunter keeps his own count.", zh: "你在梁上听了一夜的活，那本湿着写的账却一眼没看。猎手也记自己的账。" },
        { id: "k8p2", witness: "k8w2", with: "k8e1", contra: ["k8s3"], claim: "k8c1", cost: 1, en: "You know the scrape a hare's tooth leaves, and you know these notches carry none. Then you also know whose tooth does this work.", zh: "兔牙先刮一道，你认得。这些痕一道刮痕也没有，那你也认得出这活是哪颗牙干的。" },
        { id: "k8p3", witness: "k8w3", with: "k8e4", contra: ["k8s5"], exposes: "k8s5", claim: "k8c1", cost: 1, en: "Your own fur is in the hinge of the lid you never lifted, and the stick you never held is worn smooth where a mouth was.", zh: "你从没掀过的盖子上，挂着你自己的毛。你从没拿过的棍子，被嘴碰过的那一头已经磨亮。" },
        { id: "k8p4", witness: "k8w1", with: "k8s5", contra: ["k8s1"], claim: "k8c2", cost: 1, en: "The vole makes you his answer: you were above him all night. A witness who heard everything and told nobody has a use for silence.", zh: "田鼠拿你当答复：说他整夜就在你底下。一位什么都听见、却谁也没告诉的证人，沉默是有用处的。" },
        { id: "k8p5", witness: "k8w2", with: "k8e2", contra: ["k8s4"], claim: "k8c3", cost: 1, en: "You say two hands set that lid straight. Describe those two hands, and then say a hare never lifts a lid.", zh: "你说把盖子摆端正的是两只手。那就先把这两只手描述一遍，再说兔子从不掀盖。" },
      ],
      vouches: [
        { id: "k8v1", witness: "k8w1", exhibit: "k8e1", claim: "k8c1", en: "A notch cut deeper than any knife in that house is a mouth's work, and the hunter who knew the sound of it before she was asked describes a tool she never held.", zh: "刻痕深得屋里哪把刀都刻不出，那就是牙的活。那位被问之前就说得出声响的猎手，描述的是一把从没拿过的工具。" },
        { id: "k8v2", witness: "k8w2", exhibit: "k8e3", claim: "k8c1", en: "A hundred broken sticks at the threshing make a judge of teeth, and the bench takes a witness who can tell a scrape from a notch.", zh: "在打谷场咬断过一百根棍子，就成了牙的鉴定人。法庭信一位分得清刮痕和刻痕的证人。" },
        { id: "k8v3", witness: "k8w3", exhibit: "k8e2", claim: "k8c1", en: "A small belly pressed into the ash under a lid is a body read where it passed, and the shortest neck here is the one that knew the mouthful.", zh: "坑盖底下的灰上压着一个小肚子，就是它过路时留下的身子。而这儿脖子最短的那位，恰恰说中了一口一口这件事。" },
      ],
      claims: [
        { id: "k8c1", accused: "vole", statements: ["k8s1", "k8s2", "k8s3", "k8s6"], exhibits: ["k8e1", "k8e2", "k8e3"], en: "Mops came off the lid, ate the count and re-cut the tally one mouthful at a time", zh: "莫普斯从坑盖上下来，一口一口把数目吃掉、把计棍重刻" },
        { id: "k8c2", accused: "hare", statements: ["k8s4", "k8s5"], exhibits: ["k8e3", "k8e4"], en: "Havick crossed the pit on his hind feet and re-cut the tally with his own teeth", zh: "哈维克后腿越过坑，用自己的牙重刻了计棍" },
        { id: "k8c3", accused: "owl", statements: ["k8s1", "k8s4"], exhibits: ["k8e4", "k8e2"], en: "Stoop heard the cutting all night and kept the silence for his own counting", zh: "斯图普听了一夜刻痕，把沉默留下来算自己的账" },
      ],
    },
  ];

  /* --- pure core --------------------------------------------------------- */
  function ctaText(value) {
    return value == null ? "" : String(value);
  }

  function ctaClamp(value, low, high) {
    return Math.max(low, Math.min(high, value));
  }

  function ctaCount(map) {
    var n = 0;
    var key;
    for (key in map || {}) {
      if (map && ctaHasOwn.call(map, key) && map[key]) {
        n += 1;
      }
    }
    return n;
  }

  /* Accepts an array of ids, an array of records, or a {id: 1} map. */
  function ctaIds(value) {
    var out = [];
    var key;
    var i;
    if (value == null) {
      return out;
    }
    if (Object.prototype.toString.call(value) === "[object Array]") {
      for (i = 0; i < value.length; i += 1) {
        key = value[i];
        if (key != null) {
          out.push(ctaText(typeof key === "object" ? key.id : key));
        }
      }
    } else if (typeof value === "object") {
      for (key in value) {
        if (ctaHasOwn.call(value, key) && value[key]) {
          out.push(ctaText(key));
        }
      }
    } else {
      out.push(ctaText(value));
    }
    return out;
  }

  function ctaHas(list, id) {
    return (list || []).indexOf(ctaText(id)) !== -1;
  }

  function ctaFind(list, id) {
    var pool = list || [];
    for (var i = 0; i < pool.length; i += 1) {
      if (pool[i] && pool[i].id === ctaText(id)) {
        return pool[i];
      }
    }
    return null;
  }

  function ctaCaseById(id) {
    return ctaFind(ctaCases, id);
  }

  function ctaIn(def, kind, id) {
    return ctaFind(def && def[kind], id);
  }

  function ctaSuspect(def, id) {
    return ctaFind(def && def.suspects, id);
  }

  function ctaOwner(def, statementId) {
    var list = (def && def.witnesses) || [];
    var words;
    var i;
    var j;
    for (i = 0; i < list.length; i += 1) {
      words = list[i].statements || [];
      for (j = 0; j < words.length; j += 1) {
        if (words[j].id === ctaText(statementId)) {
          return { witness: list[i], index: j };
        }
      }
    }
    return null;
  }

  function ctaUnique(list) {
    var out = [];
    var ids = ctaIds(list);
    for (var i = 0; i < ids.length; i += 1) {
      if (ids[i] && out.indexOf(ids[i]) === -1) {
        out.push(ids[i]);
      }
    }
    return out;
  }

  /* Testimony is taken in order, so reaching a witness's third word means the
   * first two came with it. That is how a play is costed honestly. */
  function ctaGatherThrough(state, def, id) {
    var owner = ctaOwner(def, id);
    if (!owner) {
      return false;
    }
    for (var i = 0; i <= owner.index; i += 1) {
      state.statements[owner.witness.statements[i].id] = 1;
    }
    return true;
  }

  /* The eight bags a court state owns, named once for the factory and for the
   * safe reader. */
  var ctaBags = ["statements", "exhibits", "presses", "vouches", "delta",
    "raised", "exposed", "wer"];

  function courtState(caseDef) {
    var def = typeof caseDef === "string" ? ctaCaseById(caseDef) : caseDef;
    var state = { caseId: def ? def.id : "", spent: 0 };
    for (var i = 0; i < ctaBags.length; i += 1) {
      state[ctaBags[i]] = {};
    }
    return state;
  }

  /* A state straight from a caller may be missing a bag; every reader goes
   * through this, so no lookup can meet an undefined. */
  function ctaSafeState(def, state) {
    var fresh = courtState(def);
    var source = state || {};
    var i;
    for (i = 0; i < ctaBags.length; i += 1) {
      if (source[ctaBags[i]] && typeof source[ctaBags[i]] === "object") {
        fresh[ctaBags[i]] = source[ctaBags[i]];
      }
    }
    fresh.caseId = source.caseId || fresh.caseId;
    fresh.spent = Number(source.spent) || 0;
    return fresh;
  }

  function ctaWeight(def, id) {
    var exhibit = ctaIn(def, "exhibits", id);
    return exhibit ? Number(exhibit.weight) || 1 : 0;
  }

  function ctaWord(def, record) {
    if (!record) {
      return "";
    }
    return App.currentLang === "zh" ?
      ctaText(record.zh || record.en) : ctaText(record.en);
  }

  /* Names any id in the docket: exhibit, witness, claim, press, vouch or a
   * single statement. Unknown ids render as nothing, never as undefined. */
  function ctaName(def, id) {
    var kinds = ["exhibits", "witnesses", "claims", "presses", "vouches"];
    var owner;
    var hit = null;
    var i;
    if (!def) {
      return "";
    }
    for (i = 0; i < kinds.length && !hit; i += 1) {
      hit = ctaIn(def, kinds[i], id);
    }
    if (!hit) {
      owner = ctaOwner(def, id);
      hit = owner ? owner.witness.statements[owner.index] : null;
    }
    return hit ? ctaWord(def, hit) : "";
  }

  function ctaNameList(def, ids) {
    var list = ctaIds(ids);
    var out = [];
    for (var i = 0; i < list.length; i += 1) {
      var name = ctaName(def, list[i]);
      if (name) {
        out.push(name);
      }
    }
    return out.join(" \u00b7 ");
  }

  function ctaSuspectName(def, id) {
    var suspect = ctaSuspect(def, id);
    return suspect ? ctaWord(def, suspect) : "";
  }

  /* Everything the court has heard or holds, as one bag of ids. */
  function courtGathered(state) {
    return ctaIds(state && state.exhibits)
      .concat(ctaIds(state && state.presses))
      .concat(ctaIds(state && state.vouches));
  }

  /* Which charges a bag of evidence and a bag of testimony support or pull
   * apart. Pure, and the same function the docket proof runs. */
  function courtLinks(evidence, statements) {
    var ev = ctaIds(evidence);
    var st = ctaIds(statements);
    var all = ev.concat(st);
    var exposed = {};
    var supports = [];
    var contradicts = [];
    var partial = [];
    var conflicts = [];
    var c;
    var i;
    var j;
    for (c = 0; c < ctaCases.length; c += 1) {
      var def = ctaCases[c];
      var presses = def.presses || [];
      var pairs = [];
      for (i = 0; i < presses.length; i += 1) {
        if (presses[i].exposes && ctaHas(ev, presses[i].id)) {
          exposed[presses[i].exposes] = 1;
        }
      }
      /* A live contradiction is a heard statement pulling against something the
       * court already holds. Counted once per pair, not once per charge. */
      for (i = 0; i < (def.witnesses || []).length; i += 1) {
        var words = def.witnesses[i].statements || [];
        for (j = 0; j < words.length; j += 1) {
          var hits = words[j].contra || [];
          if (!ctaHas(st, words[j].id)) {
            continue;
          }
          for (var h = 0; h < hits.length; h += 1) {
            if (ctaHas(all, hits[h]) && !pairs[words[j].id + hits[h]]) {
              pairs[words[j].id + hits[h]] = 1;
              conflicts.push({ a: words[j].id, b: hits[h] });
            }
          }
        }
      }
      for (j = 0; j < (def.claims || []).length; j += 1) {
        var claim = def.claims[j];
        var want = (claim.statements || []).concat(claim.exhibits || []);
        var missing = [];
        var broken = false;
        var split = false;
        for (i = 0; i < want.length; i += 1) {
          if (!ctaHas(st, want[i]) && !ctaHas(ev, want[i])) {
            missing.push(want[i]);
          } else if (exposed[want[i]]) {
            broken = true;
          }
        }
        /* Only a pull that lands inside this charge's own basis can break it; a
         * witness merely squaring off with the shelf is a warning, not a verdict. */
        for (i = 0; i < conflicts.length; i += 1) {
          if (ctaHas(claim.statements, conflicts[i].a) &&
            ctaHas(claim.exhibits, conflicts[i].b)) {
            split = true;
          }
        }
        if (broken || split) {
          contradicts.push(claim.id);
        } else if (!missing.length) {
          supports.push(claim.id);
        } else {
          partial.push({ id: claim.id, missing: missing });
        }
      }
    }
    return {
      supports: supports,
      contradicts: contradicts,
      partial: partial,
      conflicts: conflicts,
      exposed: ctaIds(exposed),
    };
  }

  /* Trust is a separate number from strength: presses and a detected lie pull
   * a witness down, corroboration lifts them, and the range stays 0 to 5. */
  function courtTrust(caseDef, state, witnessId) {
    var def = typeof caseDef === "string" ? ctaCaseById(caseDef) : caseDef;
    var witness = ctaIn(def, "witnesses", witnessId);
    var value;
    if (!witness) {
      return 0;
    }
    var delta = (state && state.delta) || {};
    var raised = (state && state.raised) || {};
    value = Number(witness.trust) + (Number(delta[witnessId]) || 0) +
      (raised[witnessId] ? 1 : 0);
    return ctaClamp(value, 0, ctaTrustMax);
  }

  /* Case points: the standing worth of every contradiction landed and every
   * corroboration used - the third number on the panel, beside strength. */
  function courtPoints(state) {
    var pts = 0;
    var c;
    for (c = 0; c < ctaCases.length; c += 1) {
      pts += ctaUses(ctaCases[c], "presses", "", state) * 2;
      pts += ctaUses(ctaCases[c], "vouches", "", state) * 1;
    }
    return pts;
  }

  /* How many of a case's presses or corroboration a state has spent. With no
   * witness named it counts the whole bag. */
  function ctaUses(def, kind, witnessId, state) {
    var list = (def && def[kind]) || [];
    var bag = (state && state[kind]) || {};
    var n = 0;
    for (var i = 0; i < list.length; i += 1) {
      if (bag[list[i].id] && (!witnessId || list[i].witness === witnessId)) {
        n += 1;
      }
    }
    return n;
  }

  function ctaVouched(def, witnessId, state) {
    return ctaUses(def, "vouches", witnessId, state) > 0;
  }

  /* The charge's own footing: which of its ids are in the bag, which are not,
   * which witnesses stand behind it and how far they are believed. */
  function ctaBasis(def, claim, state) {
    var out = { have: [], unlinked: [], owners: [], trust: 0, basis: [] };
    var i;
    var id;
    var owner;
    if (!claim) {
      return out;
    }
    state = ctaSafeState(def, state);
    for (i = 0; i < (claim.statements || []).length; i += 1) {
      id = claim.statements[i];
      if (!state.statements[id]) {
        out.unlinked.push(id);
        continue;
      }
      out.have.push(id);
      out.basis.push(id);
      owner = ctaOwner(def, id);
      if (owner && out.owners.indexOf(owner.witness.id) === -1) {
        out.owners.push(owner.witness.id);
        out.trust = out.owners.length === 1 ?
          courtTrust(def, state, owner.witness.id) :
          Math.min(out.trust, courtTrust(def, state, owner.witness.id));
      }
    }
    for (i = 0; i < (claim.exhibits || []).length; i += 1) {
      id = claim.exhibits[i];
      if (state.exhibits[id]) {
        out.have.push(id);
        out.basis.push(id);
      } else {
        out.unlinked.push(id);
      }
    }
    return out;
  }

  /* Case strength for one charge: testimony counts, exhibit weight, the two
   * points of every contradiction that serves it, the one point of whatever
   * corroborates a witness who stands behind it. */
  function ctaStrength(def, claim, state) {
    var basis = ctaBasis(def, claim, state);
    var value = 0;
    var i;
    state = ctaSafeState(def, state);
    for (i = 0; i < basis.have.length; i += 1) {
      value += state.statements[basis.have[i]] ?
        1 : ctaWeight(def, basis.have[i]);
    }
    var probes = (def.presses || []).concat(def.vouches || []);
    for (i = 0; i < probes.length; i += 1) {
      var kind = probes[i].exhibit ? "vouches" : "presses";
      if (probes[i].claim !== claim.id || !state[kind][probes[i].id]) {
        continue;
      }
      if (kind === "presses") {
        value += 2;
      } else if (basis.owners.indexOf(probes[i].witness) !== -1) {
        value += 1;
      }
    }
    return value;
  }

  /* What the charge still lacks: the ids it names that were never gathered, and
   * the contradictions that would have served it but were never put. */
  function ctaUnlinked(def, claim, state) {
    var basis = ctaBasis(def, claim, state);
    var un = basis.unlinked.slice();
    var presses = def.presses || [];
    for (var i = 0; i < presses.length; i += 1) {
      if (presses[i].claim === claim.id && !state.presses[presses[i].id]) {
        un.push(presses[i].id);
      }
    }
    return un;
  }

  /* A press or a corroboration is live only once its anchor - an exhibit
   * already on the table, or testimony already taken - is in hand. */
  function ctaCanAsk(def, state, item) {
    var anchor;
    var kind;
    if (!item) {
      return false;
    }
    kind = item.exhibit ? "vouches" : "presses";
    anchor = item.exhibit || item.with;
    if (state[kind][item.id]) {
      return false;
    }
    if (kind === "vouches" && courtTrust(def, state, item.witness) >= ctaTrustMax) {
      return false;
    }
    return !!state.exhibits[anchor] || !!state.statements[anchor];
  }

  /* Ids a docket list shares with the named charges: walking def.claims gathers
   * the field it names, walking presses or vouches gathers the item ids whose
   * `claim` points at one of them. */
  function ctaPick(def, source, claimIds, field) {
    var out = [];
    var pool = (def && def[source]) || [];
    var list;
    var i;
    var j;
    for (i = 0; i < pool.length; i += 1) {
      if (claimIds.length && claimIds.indexOf(
        source === "claims" ? pool[i].id : pool[i].claim) === -1) {
        continue;
      }
      list = source === "claims" ? (pool[i][field] || []) : [pool[i].id];
      for (j = 0; j < list.length; j += 1) {
        if (out.indexOf(list[j]) === -1) {
          out.push(list[j]);
        }
      }
    }
    return out;
  }

  /* Every play worth measuring: the charge, the contradictions taken, the
   * corroboration used. Returns null when the docket cannot afford it. */
  function ctaLine(def, claim, pressIds, vouchIds) {
    if (!def || !claim) {
      return null;
    }
    var wanted = ctaUnique(pressIds);
    var used = ctaUnique(vouchIds);
    var state = courtState(def);
    var i;
    var anchor;
    for (i = 0; i < (claim.statements || []).length; i += 1) {
      ctaGatherThrough(state, def, claim.statements[i]);
    }
    for (i = 0; i < (claim.exhibits || []).length; i += 1) {
      state.exhibits[claim.exhibits[i]] = 1;
    }
    /* A press only exists if its anchor is in hand, so an anchor that is
     * testimony costs the questions that reach it - including the words that
     * came before it. */
    for (i = 0; i < wanted.length; i += 1) {
      var press = ctaIn(def, "presses", wanted[i]);
      if (!press) {
        continue;
      }
      anchor = press.with;
      if (!state.exhibits[anchor] && !state.statements[anchor]) {
        if (ctaIn(def, "exhibits", anchor)) {
          state.exhibits[anchor] = 1;
        } else if (!ctaGatherThrough(state, def, anchor)) {
          continue;
        }
      }
      state.presses[press.id] = 1;
      if (press.exposes) {
        state.exposed[press.exposes] = 1;
      }
      state.delta[press.witness] = (state.delta[press.witness] || 0) -
        (press.cost == null ? 1 : press.cost);
    }
    for (i = 0; i < used.length; i += 1) {
      var vouch = ctaIn(def, "vouches", used[i]);
      if (!vouch) {
        continue;
      }
      state.exhibits[vouch.exhibit] = 1;
      state.vouches[vouch.id] = 1;
      state.raised[vouch.witness] = 1;
    }
    var basis = ctaBasis(def, claim, state);
    var cost = ctaCount(state.statements) + ctaCount(state.presses) +
      ctaCount(state.vouches);
    var verdict = courtVerdict(state, claim.id);
    return {
      claimId: claim.id,
      accused: claim.accused,
      strength: ctaStrength(def, claim, state),
      trust: basis.trust,
      actions: cost,
      withinTime: cost <= def.time,
      quality: verdict.quality,
      presses: ctaIds(state.presses),
      vouches: ctaIds(state.vouches),
    };
  }

  function ctaSound(line, def) {
    return !!(line && line.withinTime && line.accused === def.culprit &&
      line.strength >= def.bar.strength && line.trust >= def.bar.trust);
  }

  /* The best-play line for a case: the highest sound verdict, and inside that
   * the cheapest way to reach it. Bands are measured from here. */
  function ctaBestLine(def) {
    def = typeof def === "string" ? ctaCaseById(def) : def;
    if (!def) {
      return null;
    }
    var best = null;
    var all = [0, 1, 2, 3];
    var claims = def.claims || [];
    var i;
    var j;
    var k;
    for (i = 0; i < claims.length; i += 1) {
      var serve = ctaPick(def, "presses", [claims[i].id], null);
      var lift = ctaPick(def, "vouches", [claims[i].id], null);
      for (j = 0; j < all.length; j += 1) {
        for (k = 0; k < all.length; k += 1) {
          var line = ctaLine(def, claims[i], serve.slice(0, j), lift.slice(0, k));
          if (!line || !line.withinTime) {
            continue;
          }
          if (!best ||
            (line.quality > best.quality) ||
            (line.quality === best.quality && ctaSound(line, def) &&
              (line.strength > best.strength ||
                (line.strength === best.strength && line.actions < best.actions)))) {
            best = line;
          }
        }
      }
    }
    if (best) {
      var cheap = ctaLine(def, ctaIn(def, "claims", best.claimId), [], []);
      best.sound = ctaSound(best, def);
      best.cheapestSound = cheap && ctaSound(cheap, def) ? cheap.actions : best.actions;
    }
    return best;
  }

  /* Star bands, measured off the exported best-play line instead of invented:
   * three stars is the full line, two is a point off it, one is the case's own
   * bar for a sound verdict. */
  function ctaBands(caseDef) {
    var def = typeof caseDef === "string" ? ctaCaseById(caseDef) : caseDef;
    var best = def ? ctaBestLine(def) : null;
    var top = best && best.strength > 0 ? best.strength : 6;
    var bar = def && def.bar && def.bar.strength > 0 ? def.bar.strength : 1;
    var mid = Math.max(bar, top - 2);
    return [top, mid, Math.min(mid, bar)];
  }

  /* The deal-time proof: every clue any charge needs must be reachable inside
   * the action budget, and at least one sound verdict must exist. */
  function courtSolvable(caseDef) {
    var def = typeof caseDef === "string" ? ctaCaseById(caseDef) : caseDef;
    var report = {
      ok: false, caseId: def ? def.id : "", time: def ? def.time : 0,
      needed: 0, best: null, feasible: [], unreachable: [], dangling: [],
      highQuality: false,
    };
    var claims;
    var pieces;
    var claim;
    var probe;
    var i;
    if (!def) {
      return report;
    }
    claims = def.claims || [];
    for (i = 0; i < claims.length; i += 1) {
      claim = claims[i];
      probe = ctaLine(def, claim, [], []);
      if (probe && probe.withinTime) {
        report.feasible.push(claim.id);
      }
      /* A clue that points at nothing is a broken case, however reachable the
       * rest of it is, so every id the charge names has to resolve. */
      pieces = (claim.statements || []).concat(claim.exhibits || []);
      for (var p = 0; p < pieces.length; p += 1) {
        if (!ctaName(def, pieces[p])) {
          report.dangling.push(pieces[p]);
        }
      }
      if (claim.accused && !ctaSuspect(def, claim.accused)) {
        report.dangling.push(claim.accused);
      }
    }
    /* The clock test for the whole case at once: gather every clue any
     * feasible charge rests on, plus every contradiction and corroboration that
     * could serve them, and cost it through the same line a real play takes -
     * so the proof can never drift away from the game. */
    var all = ctaLine(def, {
      id: "",
      statements: ctaPick(def, "claims", report.feasible, "statements"),
      exhibits: ctaPick(def, "claims", report.feasible, "exhibits"),
      accused: def.culprit,
    }, ctaPick(def, "presses", report.feasible, null),
      ctaPick(def, "vouches", report.feasible, null));
    report.needed = all ? all.actions : 0;
    report.unreachable = all && all.withinTime ? [] :
      ctaPick(def, "claims", report.feasible, "statements");
    report.best = ctaBestLine(def);
    report.highQuality = ctaSound(report.best, def);
    report.ok = !!report.best && report.highQuality &&
      report.unreachable.length === 0 && report.dangling.length === 0 &&
      report.feasible.length > 0 && !!def.culprit;
    return report;
  }

  /* Deterministic outcome plus the reason keys that explain it. */
  function courtVerdict(state, argument) {
    var def = ctaCaseById(state && state.caseId);
    if (!def) {
      def = ctaCases[0];
    }
    var claim = ctaIn(def, "claims", argument);
    state = ctaSafeState(def, state);
    var heard = ctaCount(state.statements);
    var basis = ctaBasis(def, claim, state);
    var strength = claim ? ctaStrength(def, claim, state) : 0;
    var trust = claim ? basis.trust : 0;
    var unlinked = claim ? ctaUnlinked(def, claim, state) : [];
    var broken = [];
    var notes = [];
    var verdict = "silent";
    var quality = 0;
    var i;
    for (i = 0; i < basis.basis.length; i += 1) {
      if (state.exposed[basis.basis[i]]) {
        broken.push(basis.basis[i]);
      }
    }
    if (!claim || !heard) {
      notes.push({ key: "ctaWhySilent" });
    } else {
      notes.push({
        key: "ctaWhyBasis",
        vars: { ids: basis.basis, n: strength, t: trust },
      });
      if (broken.length) {
        verdict = "recanted";
        notes.push({ key: "ctaWhyRecanted", vars: { ids: broken } });
      } else if (claim.accused !== def.culprit) {
        verdict = "wrong";
        notes.push({ key: "ctaWhyWrong", vars: { who: claim.accused, n: strength } });
      } else if (strength < def.bar.strength) {
        verdict = "thin";
        notes.push({ key: "ctaWhyThin", vars: { n: strength, bar: def.bar.strength } });
      } else if (trust < def.bar.trust) {
        verdict = "doubt";
        quality = 1;
        notes.push({
          key: "ctaWhyTrust",
          vars: { ids: basis.owners, n: trust, bar: def.bar.trust },
        });
      } else {
        verdict = "just";
        quality = 3;
        notes.push({
          key: "ctaWhyCarried",
          vars: { ids: basis.owners, t: trust, n: strength, bar: def.bar.strength },
        });
      }
      if (unlinked.length) {
        notes.push({ key: "ctaWhyUnlinked", vars: { ids: unlinked } });
      }
    }
    notes.push({
      key: "ctaWhySpend",
      vars: { n: state.spent, total: def.time, left: Math.max(0, def.time - state.spent) },
    });
    return {
      verdict: verdict,
      quality: quality,
      strength: strength,
      trust: trust,
      bar: def.bar,
      notes: notes,
      claimId: claim ? claim.id : "",
      accused: claim ? claim.accused : "",
      culprit: def.culprit,
      unlinked: unlinked,
      owners: basis.owners,
      heard: heard,
    };
  }

  /* Copy the verdict and the actions can reach, but only ever by a computed
   * name: every one of these is checked, so a missing line shows up as a
   * message on the panel instead of a raw key in front of the player. */
  var ctaNoteKeys = [
    "ctaWhyBasis", "ctaWhyUnlinked", "ctaWhyTrust", "ctaWhyWrong", "ctaWhyCarried",
    "ctaWhySilent", "ctaWhyRecanted", "ctaWhyThin", "ctaWhySpend",
    "ctaVJust", "ctaVDoubt", "ctaVThin", "ctaVWrong", "ctaVSilent", "ctaVRecanted",
    "ctaBtnPress", "ctaBtnVouch", "ctaTrustDown", "ctaTrustUp",
    "ctaPressOut", "ctaPressOk", "ctaPressAgain",
    "ctaVouchOut", "ctaVouchOk", "ctaVouchAgain", "ctaMarked", "ctaUnmarked",
  ];

  function ctaCopyCheck() {
    var missing = [];
    for (var i = 0; i < ctaNoteKeys.length; i += 1) {
      if (t(ctaNoteKeys[i]) === ctaNoteKeys[i]) {
        missing.push(ctaNoteKeys[i]);
      }
    }
    return missing;
  }

  /* Exported for the other modules and for the docket proof. */
  App.courtCases = ctaCases;
  App.courtState = courtState;
  App.courtGathered = courtGathered;
  App.courtLinks = courtLinks;
  App.courtVerdict = courtVerdict;
  App.courtSolvable = courtSolvable;
  App.courtTrust = courtTrust;
  App.courtPoints = courtPoints;
  App.courtBestLine = ctaBestLine;
  App.courtBands = ctaBands;
  App.courtCopyCheck = ctaCopyCheck;

  /* --- the panel --------------------------------------------------------- */
  function initCourtroomOfAnimalsGame(panelEl) {
    if (!panelEl) {
      return;
    }

    var campaign = createCampaign({ key: "courtroom-animals-campaign", levels: ctaCases });
    var startIndex = campaign.indexOf(campaign.nextLevelId());
    var caseDef = ctaCases[startIndex < 0 ? 0 : startIndex];
    var state = courtState(caseDef);
    var view = "roster";
    var focusId = "";
    var options = [];
    var cursor = 0;
    var over = false;
    var record = [];
    var why = [];

    /* One builder for every node: class, optional translated label, optional
     * attributes. Nothing here ever touches innerHTML. */
    function el(tag, cls, attrs) {
      var node = document.createElement(tag);
      var key;
      if (cls) {
        node.className = cls;
      }
      for (key in attrs || {}) {
        if (!ctaHasOwn.call(attrs, key)) {
          continue;
        }
        if (key === "text") {
          node.textContent = ctaText(attrs[key]);
        } else if (key === "i18n") {
          node.setAttribute("data-i18n", attrs[key]);
          node.textContent = t(attrs[key]);
        } else {
          node.setAttribute(key, ctaText(attrs[key]));
        }
      }
      return node;
    }

    function into(parent, list) {
      for (var i = 0; i < list.length; i += 1) {
        parent.appendChild(list[i]);
      }
      return parent;
    }

    var hud = el("div", "game-hud");
    var timeEl = el("strong");
    var wordsEl = el("strong");
    var pointsEl = el("strong");
    var trustEl = el("strong");
    var readyEl = el("strong");

    function stat(key, valueEl) {
      var box = el("div", "game-stat");
      box.appendChild(el("span", "", { i18n: key }));
      box.appendChild(valueEl);
      return box;
    }

    into(hud, [
      stat("ctaTimeLabel", timeEl), stat("ctaWordsLabel", wordsEl),
      stat("ctaPointsLabel", pointsEl), stat("ctaTrustLabel", trustEl),
      stat("ctaReadyLabel", readyEl),
    ]);

    var bench = el("div", "cta-bench", { role: "group", "aria-label": t("ctaBenchAria") });
    var shelf = el("div", "cta-shelf", { role: "group", "aria-label": t("ctaShelfAria") });
    var focusTitle = el("p", "cta-focus-title");
    var focusBody = el("p", "cta-focus-body");
    var focusBox = into(el("div", "cta-focus", { tabindex: "0" }), [focusTitle, focusBody]);
    var optionBox = el("div", "cta-options", {
      role: "group", "aria-label": t("ctaCourtAria"),
    });
    var recordBox = el("div", "cta-record");
    var whyBox = el("div", "cta-why", { "aria-label": t("ctaWhyAria") });
    var wrap = into(el("div", "cta-wrap"), [
      el("p", "cta-row-label", { i18n: "ctaBenchLabel" }), bench,
      el("p", "cta-row-label", { i18n: "ctaShelfLabel" }), shelf,
      focusBox, optionBox, recordBox, whyBox,
    ]);

    var result = el("p", "game-result", { role: "status" });

    var caseSel = el("select", "elements-select", { id: "ctaCaseSel" });
    var caseRow = into(el("div", "elements-row"), [
      el("label", "elements-label", {
        for: "ctaCaseSel", i18n: "ctaCaseSelectLabel",
      }),
      caseSel,
    ]);

    var newBtn = into(el("button", "primary", { type: "button" }),
      [into(el("span", "button-content"), [el("span", "", { i18n: "btnNewRound" })])]);
    var bestEl = el("p", "game-best");
    var actions = into(el("div", "game-actions"), [newBtn, bestEl]);

    var hint = el("p", "game-hint", { i18n: "ctaHint" });

    into(panelEl, [hud, wrap, result, caseRow, actions, hint]);

    function totalWords() {
      var n = 0;
      var list = caseDef.witnesses || [];
      for (var i = 0; i < list.length; i += 1) {
        n += list[i].statements.length;
      }
      return n;
    }

    function timeLeft() {
      return Math.max(0, caseDef.time - state.spent);
    }

    function spend() {
      if (over || timeLeft() <= 0) {
        return false;
      }
      state.spent += 1;
      return true;
    }

    function remaining(witness) {
      var out = [];
      var list = witness.statements || [];
      for (var i = 0; i < list.length; i += 1) {
        if (!state.statements[list[i].id]) {
          out.push(list[i]);
        }
      }
      return out;
    }

    function addNote(text) {
      if (!text) {
        return;
      }
      record.push(ctaText(text));
      if (record.length > 40) {
        record.shift();
      }
    }

    /* --- verdict copy --------------------------------------------------- */
    /* Six headlines, all asked for by literal key so the copy audit can see
     * each one, all reading off the same numbers the charge was judged by. */
    function ctaHead(v) {
      var vars = {
        a: ctaSuspectName(caseDef, v.accused),
        c: ctaName(caseDef, v.claimId),
        s: ctaText(v.strength),
        t: ctaText(v.trust),
        tt: ctaText(v.trust),
        n: ctaText(v.bar.strength),
        m: ctaText(v.bar.trust),
      };
      var heads = {
        just: t("ctaVJust", vars),
        doubt: t("ctaVDoubt", vars),
        thin: t("ctaVThin", vars),
        wrong: t("ctaVWrong", vars),
        recanted: t("ctaVRecanted", vars),
        silent: t("ctaVSilent", { n: ctaText(v.heard) }),
      };
      return heads[v.verdict] || heads.silent;
    }

    /* The notes arrive as keys plus ids; the panel turns ids into the names the
     * player is reading this session. */
    function renderNote(note) {
      var vars = {};
      var src = note.vars || {};
      var key;
      for (key in src) {
        if (!ctaHasOwn.call(src, key)) {
          continue;
        }
        if (key === "ids") {
          vars.list = ctaNameList(caseDef, src[key]);
        } else if (key === "who") {
          vars.list = ctaSuspectName(caseDef, src[key]);
        } else {
          vars[key] = src[key];
        }
      }
      vars.list = vars.list || t("ctaNothing");
      return t(note.key, vars);
    }

    function deliver(claimId) {
      if (over) {
        return;
      }
      var v = courtVerdict(state, claimId);
      var bands = ctaBands(caseDef);
      var i = 0;
      over = true;
      view = "closed";
      why = [];
      for (i = 0; i < v.notes.length; i += 1) {
        why.push(renderNote(v.notes[i]));
      }
      addNote(t("ctaNoteClosed", {
        c: ctaName(caseDef, v.claimId),
        s: ctaText(v.strength),
      }));
      result.textContent = ctaHead(v);
      if (v.quality < 2) {
        result.textContent = result.textContent + " " + t("ctaRetry");
        render();
        return;
      }
      var stars = starsFor(v.strength, bands, "high");
      var outcome = campaign.record(caseDef.id, {
        stars: stars,
        best: v.strength,
        better: "high",
      });
      result.textContent = result.textContent + " " +
        t("ctaFiled", { n: ctaText(state.spent), s: ctaText(stars), p: ctaText(bands[0]) }) +
        (outcome.isBest ? " " + t("newBest") : "");
      if (outcome.unlockedNext) {
        result.textContent = result.textContent + " " + t("ctaNextCase");
      } else if (campaign.clearedCount() === ctaCases.length) {
        result.textContent = result.textContent + " " + t("ctaAllCases");
      }
      logAction(t("logCourtroomOfAnimals", {
        c: t(caseDef.labelKey),
        s: ctaText(v.strength),
        t: ctaText(v.trust),
      }));
      var rect = newBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      refreshPicker();
      render();
    }

    /* --- actions -------------------------------------------------------- */
    /* Three views, one mover: the roster, a witness, and the closing. Nothing
     * moves once the court has ruled. */
    function go(to, id) {
      if (over) {
        return;
      }
      view = to;
      focusId = ctaText(id);
      cursor = 0;
      render();
    }

    /* The clock is the only scarce thing, so every paid action starts here. */
    function pay() {
      if (over) {
        return false;
      }
      if (spend()) {
        return true;
      }
      result.textContent = t("ctaNoTime");
      ranOut();
      render();
      return false;
    }

    function ask(witness) {
      var left = remaining(witness);
      if (over) {
        return;
      }
      if (!left.length) {
        result.textContent = t("ctaNothingMore", { w: ctaWord(caseDef, witness) });
        return;
      }
      if (!pay()) {
        return;
      }
      state.statements[left[0].id] = 1;
      addNote(t("ctaSaid", {
        w: ctaWord(caseDef, witness),
        s: ctaWord(caseDef, left[0]),
      }));
      ranOut();
      render();
    }

    /* Pressing buys case strength and pays with trust; corroborating buys both
     * and pays an exhibit. Same shape, so the two share one body. */
    function use(kind, witness, item) {
      var bag = state[kind];
      var anchor = kind === "presses" ? item.with : item.exhibit;
      var owner;
      if (over) {
        return;
      }
      if (bag[item.id]) {
        result.textContent = t(kind === "presses" ? "ctaPressAgain" : "ctaVouchAgain");
        return;
      }
      if (!ctaCanAsk(caseDef, state, item)) {
        result.textContent = t("ctaNeeds", { w: ctaName(caseDef, anchor) });
        return;
      }
      if (!pay()) {
        return;
      }
      bag[item.id] = 1;
      if (kind === "presses") {
        state.delta[witness.id] = (state.delta[witness.id] || 0) -
          (item.cost == null ? 1 : item.cost);
        if (item.exposes) {
          state.exposed[item.exposes] = 1;
          owner = ctaOwner(caseDef, item.exposes);
          if (owner) {
            state.wer[owner.witness.id] = 1;
            addNote(t("ctaLieOut", {
              s: ctaName(caseDef, item.exposes),
              w: ctaWord(caseDef, owner.witness),
            }));
          }
        }
      } else {
        state.raised[witness.id] = 1;
      }
      addNote(t(kind === "presses" ? "ctaPressOut" : "ctaVouchOut", {
        w: ctaWord(caseDef, witness),
        c: ctaWord(caseDef, item),
        e: ctaName(caseDef, item.exhibit),
      }));
      result.textContent = t(kind === "presses" ? "ctaPressOk" : "ctaVouchOk", {
        w: ctaWord(caseDef, witness),
        n: 2,
        tt: courtTrust(caseDef, state, witness.id),
        total: ctaTrustMax,
      });
      ranOut();
      render();
    }

    function mark(exhibit) {
      if (over || state.exhibits[exhibit.id]) {
        if (!over) {
          result.textContent = t("ctaAlreadyMarked", { c: ctaWord(caseDef, exhibit) });
        }
        return;
      }
      /* Marking is free: the cost is remembering that an exhibit proves nothing
       * until somebody links it to a charge. */
      state.exhibits[exhibit.id] = 1;
      addNote(t("ctaExhibitOn", {
        c: ctaWord(caseDef, exhibit),
        n: ctaText(exhibit.weight),
      }));
      render();
    }

    /* Once the time is gone the bench calls for the closing, so nothing a
     * player gathered can be stranded. */
    function ranOut() {
      if (!over && timeLeft() <= 0) {
        view = "closing";
        cursor = 0;
        result.textContent = t("ctaTimeUp", { total: ctaText(caseDef.time) });
      }
    }

    /* L reads the whole case out, so memory is never the challenge. */
    function speakFacts() {
      var links = courtLinks(courtGathered(state), ctaIds(state.statements));
      var claims = caseDef.claims || [];
      var stood = 0;
      var i;
      for (i = 0; i < claims.length; i += 1) {
        if (links.supports.indexOf(claims[i].id) !== -1) {
          stood += 1;
        }
      }
      result.textContent = t("ctaFactList", {
        w: ctaNameList(caseDef, ctaIds(state.statements)) || t("ctaNothing"),
        e: ctaNameList(caseDef, ctaIds(state.exhibits)) || t("ctaNothing"),
        n: ctaText(courtPoints(state)),
        p: ctaText(ctaCount(state.presses)),
        t: ctaText(timeLeft()),
        s: ctaText(stood),
        x: ctaText(links.conflicts.length),
      });
    }

    /* --- rendering ------------------------------------------------------ */
    function renderHud() {
      var witnesses = caseDef.witnesses || [];
      var claims = caseDef.claims || [];
      var lowest = ctaTrustMax;
      var ready = 0;
      var i;
      for (i = 0; i < witnesses.length; i += 1) {
        lowest = Math.min(lowest, courtTrust(caseDef, state, witnesses[i].id));
      }
      for (i = 0; i < claims.length; i += 1) {
        if (ctaStrength(caseDef, claims[i], state) >= caseDef.bar.strength) {
          ready += 1;
        }
      }
      timeEl.textContent = t("ctaTimeLeft", {
        n: ctaText(timeLeft()), total: ctaText(caseDef.time),
      });
      wordsEl.textContent = t("ctaWordsNow", {
        n: ctaCount(state.statements), total: ctaText(totalWords()),
      });
      pointsEl.textContent = t("ctaPointsNow", {
        n: ctaText(courtPoints(state)),
        p: ctaCount(state.presses),
      });
      trustEl.textContent = t("ctaTrustNow", { n: ctaText(lowest), total: ctaTrustMax });
      readyEl.textContent = t("ctaReadyNow", { n: ctaText(ready), total: ctaText(claims.length) });
    }

    function card(cls, title, meta, on, disabled) {
      var btn = into(el("button", cls, { type: "button" }), [
        el("span", "cta-card-name", { text: ctaText(title) }),
        el("span", "cta-card-meta", { text: ctaText(meta) }),
      ]);
      if (disabled) {
        btn.disabled = true;
      }
      btn.addEventListener("click", on);
      return btn;
    }

    /* One line per entry, and nothing is ever asked of the player's memory. */
    function paint(parent, cls, list) {
      parent.textContent = "";
      for (var i = 0; i < list.length; i += 1) {
        parent.appendChild(el("p", cls, { text: ctaText(list[i]) }));
      }
    }

    function renderBench() {
      bench.textContent = "";
      var list = caseDef.witnesses || [];
      for (var i = 0; i < list.length; i += 1) {
        (function (witness, index) {
          var pressed = ctaUses(caseDef, "presses", witness.id, state);
          var meta = t("ctaCardTrust", {
            n: ctaText(courtTrust(caseDef, state, witness.id)),
            total: ctaTrustMax,
            w: ctaText(index + 1),
          }) + " " + t("ctaCardWords", {
            n: ctaText(witness.statements.length - remaining(witness).length),
            total: ctaText(witness.statements.length),
          });
          if (ctaVouched(caseDef, witness.id, state)) {
            meta += " " + t("ctaCardVouched");
          }
          if (pressed) {
            meta += " " + t("ctaCardPressed", { n: ctaText(pressed) });
          }
          var cls = "cta-card cta-witness" +
            (witness.id === focusId && view === "witness" ? " cta-card-on" : "");
          bench.appendChild(card(cls, ctaWord(caseDef, witness), meta, function () {
            go("witness", witness.id);
          }, over));
        })(list[i], i);
      }
    }

    function renderShelf() {
      shelf.textContent = "";
      var list = caseDef.exhibits || [];
      for (var i = 0; i < list.length; i += 1) {
        (function (exhibit) {
          shelf.appendChild(card("cta-card cta-exhibit", ctaWord(caseDef, exhibit),
            t("ctaWeight", { n: ctaText(exhibit.weight) }) + " " +
            t(state.exhibits[exhibit.id] ? "ctaMarked" : "ctaUnmarked"),
            function () {
              mark(exhibit);
            }, over));
        })(list[i]);
      }
    }

    function renderFocus() {
      var lines = [];
      var witness = ctaIn(caseDef, "witnesses", focusId);
      var heard;
      var i;
      if (over) {
        focusTitle.textContent = t("ctaClosedTitle");
        focusBody.textContent = t("ctaClosedBody");
      } else if (view === "witness" && witness) {
        focusTitle.textContent = ctaWord(caseDef, witness) + " - " + t("ctaCardTrust", {
          n: ctaText(courtTrust(caseDef, state, witness.id)),
          total: ctaTrustMax,
        });
        heard = witness.statements || [];
        for (i = 0; i < heard.length; i += 1) {
          if (!state.statements[heard[i].id]) {
            lines.push(t("ctaWordUnheard", { n: ctaText(i + 1) }));
          } else if (state.exposed[heard[i].id]) {
            lines.push(t("ctaWordLie", { s: ctaWord(caseDef, heard[i]) }));
          } else {
            lines.push(ctaWord(caseDef, heard[i]));
          }
        }
        focusBody.textContent = lines.length ? lines.join(" / ") : t("ctaNothingYet");
      } else if (view === "closing") {
        focusTitle.textContent = t("ctaCloseTitle");
        focusBody.textContent = t("ctaCloseBody", {
          s: ctaText(caseDef.bar.strength),
          m: ctaText(caseDef.bar.trust),
        });
      } else {
        focusTitle.textContent = t("ctaRosterTitle");
        focusBody.textContent = ctaWord(caseDef, caseDef.charge);
      }
      paint(recordBox, "cta-record-row", record.slice(-12));
      paint(whyBox, "cta-why-line", why);
    }

    function buildOptions() {
      var out = [];
      var witnesses = caseDef.witnesses || [];
      var probes = (caseDef.presses || []).concat(caseDef.vouches || []);
      var claims = caseDef.claims || [];
      var i;
      var left;
      var anchor;

      function push(label, note, run, disabled) {
        if (out.length < 4) {
          out.push({ label: label, note: note, run: run, disabled: !!disabled });
        }
      }

      if (over) {
        push(t("ctaBtnAgain"), t("ctaCostNone"), function () {
          startCase(caseDef);
        });
        var next = ctaCases[campaign.indexOf(campaign.nextLevelId())] || caseDef;
        push(t("ctaBtnNext"), t(next.labelKey), function () {
          startCase(next);
        });
        return out;
      }
      if (view === "witness") {
        var witness = ctaIn(caseDef, "witnesses", focusId);
        if (!witness) {
          view = "roster";
          return buildOptions();
        }
        left = remaining(witness);
        push(t("ctaBtnAsk", { w: ctaWord(caseDef, witness) }),
          left.length ? t("ctaCostOne") : t("ctaAskSpent"),
          function () {
            ask(witness);
          }, !left.length);
        for (i = 0; i < probes.length && out.length < 3; i += 1) {
          (function (item) {
            var kind = item.exhibit ? "vouches" : "presses";
            if (item.witness !== witness.id || state[kind][item.id]) {
              return;
            }
            anchor = item.exhibit || item.with;
            push(t(kind === "presses" ? "ctaBtnPress" : "ctaBtnVouch",
              { w: ctaWord(caseDef, witness) }),
              (ctaCanAsk(caseDef, state, item) ? t("ctaWith") :
                t("ctaNeeds", { w: ctaName(caseDef, anchor) })) + " " +
              t(kind === "presses" ? "ctaTrustDown" : "ctaTrustUp",
                { n: ctaText(item.cost == null ? 1 : item.cost) }),
              function () {
                use(kind, witness, item);
              }, !ctaCanAsk(caseDef, state, item));
          })(probes[i]);
        }
        push(t("ctaBtnBack"), t("ctaCostNone"), function () {
          go("roster", "");
        });
        push(t("ctaBtnClose"), t("ctaCloseHint", { n: ctaText(timeLeft()) }),
          function () {
            go("closing", "");
          });
        return out;
      }
      if (view === "closing") {
        for (i = 0; i < claims.length && out.length < 3; i += 1) {
          (function (claim) {
            var basis = ctaBasis(caseDef, claim, state);
            push(ctaWord(caseDef, claim), t("ctaDigits", {
              s: ctaText(ctaStrength(caseDef, claim, state)),
              t: ctaText(basis.trust),
              bar: ctaText(caseDef.bar.strength),
              need: ctaText(caseDef.bar.trust),
            }), function () {
              deliver(claim.id);
            });
          })(claims[i]);
        }
        push(t("ctaBtnBack"), t("ctaCostNone"), function () {
          go("roster", "");
        });
        return out;
      }
      for (i = 0; i < witnesses.length && out.length < 3; i += 1) {
        (function (witness, index) {
          left = remaining(witness).length;
          push(ctaWord(caseDef, witness), t("ctaCardTrust", {
            n: ctaText(courtTrust(caseDef, state, witness.id)),
            total: ctaTrustMax,
            w: ctaText(index + 1),
          }) + " " + t("ctaCardWords", {
            n: ctaText(witness.statements.length - left),
            total: ctaText(witness.statements.length),
          }), function () {
            go("witness", witness.id);
          });
        })(witnesses[i], i);
      }
      push(t("ctaBtnClose"), t("ctaCloseHint", { n: ctaText(timeLeft()) }),
        function () {
          go("closing", "");
        });
      return out;
    }

    function activate(index) {
      var option = options[index];
      if (!option) {
        result.textContent = t("ctaNoOption", { n: ctaText(index + 1) });
        return;
      }
      if (option.disabled) {
        result.textContent = t("ctaLockedOption", { w: ctaText(option.note) });
        return;
      }
      cursor = index;
      if (typeof option.run === "function") {
        option.run();
      }
    }

    function renderOptions() {
      options = buildOptions();
      if (cursor > options.length - 1) {
        cursor = options.length ? options.length - 1 : 0;
      }
      optionBox.textContent = "";
      for (var i = 0; i < options.length; i += 1) {
        (function (index) {
          var btn = into(el("button", "cta-option" +
            (index === cursor ? " cta-sel" : ""), { type: "button" }), [
            el("span", "cta-option-key", { text: ctaText(index + 1) }),
            el("span", "cta-option-label", { text: ctaText(options[index].label) }),
            el("span", "cta-option-note", { text: ctaText(options[index].note) }),
          ]);
          if (options[index].disabled) {
            btn.disabled = true;
          }
          btn.addEventListener("click", function () {
            activate(index);
          });
          optionBox.appendChild(btn);
        })(i);
      }
    }

    function render() {
      renderHud();
      renderBench();
      renderShelf();
      renderFocus();
      renderOptions();
    }

    function refreshPicker() {
      fillCampaignPicker(caseSel, campaign, function (def) {
        return t(def.labelKey);
      }, t("elementsLocked"));
      caseSel.value = caseDef.id;
      bestEl.textContent = t("campaignStars", {
        n: ctaText(campaign.totalStars()),
        max: ctaText(campaign.maxStars()),
      });
    }

    function startCase(def) {
      caseDef = def || caseDef;
      state = courtState(caseDef);
      view = "roster";
      focusId = "";
      cursor = 0;
      over = false;
      record = [];
      why = [];
      var proof = courtSolvable(caseDef);
      var bands = ctaBands(caseDef);
      addNote(t("ctaCourtOpen", {
        c: t(caseDef.labelKey),
        total: ctaText(caseDef.time),
        s: ctaText(bands[0]),
      }));
      result.textContent = t("ctaObjective", {
        name: t(caseDef.labelKey),
        n: ctaText(caseDef.time),
        s: ctaText(caseDef.bar.strength),
        m: ctaText(caseDef.bar.trust),
        p: ctaText(bands[0]),
        f: proof.feasible.length ? t("ctaProved") : t("ctaProofBroken"),
      });
      refreshPicker();
      render();
    }

    caseSel.addEventListener("change", function () {
      var index = campaign.indexOf(caseSel.value);
      if (index >= 0 && campaign.isUnlocked(caseSel.value)) {
        startCase(ctaCases[index]);
      }
    });

    newBtn.addEventListener("click", function () {
      startCase(caseDef);
    });

    /* The arrows walk the same list the digits pick from, so the keyboard path
     * never reaches an option the mouse cannot. */
    var ctaSteps = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    panelEl.addEventListener("keydown", function (event) {
      var step = ctaHasOwn.call(ctaSteps, event.key) ? ctaSteps[event.key] : 0;
      var digit = "1234".indexOf(event.key);
      if (step) {
        event.preventDefault();
        cursor = options.length ?
          (cursor + step + options.length) % options.length : 0;
        renderOptions();
        return;
      }
      if (digit !== -1) {
        event.preventDefault();
        activate(digit);
        return;
      }
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        activate(cursor);
        return;
      }
      if (event.key === "Escape" || event.key === "Backspace") {
        event.preventDefault();
        go("roster", "");
        return;
      }
      if (event.key === "l" || event.key === "L") {
        event.preventDefault();
        speakFacts();
      }
    });

    /* Pausing the drawer restates the clock only: the transcript and everything
     * the court has gathered stay exactly where the player left them. */
    App.quietResetCourtroomOfAnimals = function () {
      if (!over) {
        timeEl.textContent = t("ctaTimeLeft", {
          n: ctaText(timeLeft()),
          total: ctaText(caseDef.time),
        });
      }
    };

    startCase(ctaCases[campaign.indexOf(campaign.nextLevelId())] || ctaCases[0]);
    if (ctaCopyCheck().length) {
      result.textContent = t("ctaCopyBroken");
    }
  }

  /* Bilingual copy travels with the game: addStrings only fills keys i18n.js
   * does not already own, so the shared dictionary stays authoritative. */
  App.addStrings({
    en: {
      "tabCourtroomOfAnimals": "Courtroom of Animals",
      "ctaCase1": "The Missing Grain Sack",
      "ctaCase2": "The Trampled Garden",
      "ctaCase3": "The Broken Dam",
      "ctaCase4": "The Long Docket",
      "ctaCase5": "The Opened Bee-Tree",
      "ctaCase6": "The Greased Sill",
      "ctaCase7": "The Changed Fleece",
      "ctaCase8": "The Altered Tally",
      "ctaCaseSelectLabel": "Take a case from the docket",
      "ctaTimeLabel": "Court time",
      "ctaWordsLabel": "Testimony",
      "ctaPointsLabel": "Case points",
      "ctaTrustLabel": "Lowest trust",
      "ctaReadyLabel": "Docket",
      "ctaBenchLabel": "The bench: three witnesses",
      "ctaShelfLabel": "The shelf: fixed exhibits, weight shown in points",
      "ctaTimeLeft": "{n} of {total} left",
      "ctaWordsNow": "{n} of {total} heard",
      "ctaPointsNow": "{n} points from {p} presses",
      "ctaTrustNow": "{n} of {total}",
      "ctaReadyNow": "{n} of {total} charges reachable",
      "ctaBenchAria": "Witnesses, with their trust as a number",
      "ctaShelfAria": "Exhibits, with their weight as a number",
      "ctaCourtAria": "Court actions: number keys 1 to 4 pick one, Enter confirms, Escape returns to the bench, L reads what you have",
      "ctaWhyAria": "Why this verdict",
      "ctaRosterTitle": "Open the case",
      "ctaCloseTitle": "Your closing",
      "ctaCloseBody": "Name one charge and stand on it. The bench wants strength {s} and trust {m}, and both numbers are shown before you choose.",
      "ctaClosedTitle": "The court has ruled",
      "ctaClosedBody": "Read the notes below: they say which part of your case carried, which witness was too distrusted, and which exhibit was never linked.",
      "ctaCardTrust": "trust {n}/{total}",
      "ctaCardWords": "{n}/{total} heard",
      "ctaCardPressed": "pressed {n}",
      "ctaCardVouched": "corroborated",
      "ctaWeight": "weight {n}",
      "ctaMarked": "on the table",
      "ctaUnmarked": "not yet marked",
      "ctaBtnAsk": "Question {w}",
      "ctaBtnPress": "Press {w} with the contradiction",
      "ctaBtnVouch": "Corroborate {w} with the exhibit",
      "ctaBtnClose": "Make the closing argument",
      "ctaBtnBack": "Back to the bench",
      "ctaBtnAgain": "Try this case again",
      "ctaBtnNext": "Next case on the docket",
      "ctaCostOne": "1 court action",
      "ctaCostNone": "free",
      "ctaWith": "ready to use",
      "ctaNeeds": "needs {w} first",
      "ctaTrustDown": "trust -{n}",
      "ctaTrustUp": "trust +1",
      "ctaCloseHint": "closing: {n} actions left",
      "ctaDigits": "claim strength {s} / trust {t} - the bench wants {bar} / {need}",
      "ctaNothing": "nothing",
      "ctaNothingYet": "This witness has not said anything yet.",
      "ctaNothingMore": "{w} has said everything they will say.",
      "ctaAskSpent": "nothing left to hear",
      "ctaNoTime": "The court time is gone.",
      "ctaTimeUp": "Time is called after {total} actions. The bench asks you to close now.",
      "ctaSaid": "{w}: {s}",
      "ctaExhibitOn": "Marked as an exhibit ({n} points): {c}",
      "ctaAlreadyMarked": "{c} is already on the table.",
      "ctaPressOut": "Pressed: {w} - {c}",
      "ctaPressOk": "{w} gives way: case strength +{n}, and {w} is now trusted at {tt}/{total}.",
      "ctaPressAgain": "That pressure has already been put. The bench remembers it.",
      "ctaVouchOut": "Corroboration: {w} stands with {e}. {c}",
      "ctaVouchOk": "{w} is believed a little more: trust {tt}/{total}.",
      "ctaVouchAgain": "That witness is already corroborated by this exhibit.",
      "ctaLieOut": "The account is out: {s} - said by {w}, and now nobody will take it whole.",
      "ctaWordLie": "RECALLED - {s}",
      "ctaWordUnheard": "(not yet asked: word {n})",
      "ctaNoOption": "There is no option {n} on this bench.",
      "ctaLockedOption": "That one is not ready: {w}",
      "ctaFactList": "Heard: {w} || Exhibits: {e} || Case points {n} from {p} presses || {s} charges fully linked, {x} live contradiction(s) || {t} actions left.",
      "ctaNoteClosed": "Closing delivered: {c}, strength {s}.",
      "ctaVJust": "FOUND: {a} did it, on '{c}' - strength {s} against {t} trust, over the bar of {n} strength and {m} trust.",
      "ctaVDoubt": "THROWN OUT: '{c}' is true and strong enough at {s}, but it stands on a witness trusted at {t}, under the {m} the bench needs.",
      "ctaVThin": "NOT PROVEN: '{c}' carried strength {s} where {n} was wanted. The bench will not stretch.",
      "ctaVWrong": "THE WRONG ANIMAL: you proved a case at strength {s} against {a}, who did not do it.",
      "ctaVSilent": "MISTRIAL: you closed having heard {n} witnesses. There was no case to weigh.",
      "ctaVRecanted": "RECASED: '{c}' was built on an account your own pressing destroyed.",
      "ctaWhyBasis": "What you actually put on the table ({n} strength, {t} trust): {list}",
      "ctaWhyUnlinked": "Never linked into the charge: {list}",
      "ctaWhyTrust": "Too distrusted to carry it: {list}",
      "ctaWhyWrong": "Not the culprit, whatever the numbers said: {list}",
      "ctaWhyCarried": "What carried it: {list} were believed at {t}, and the charge stood at {n} against a bar of {bar}.",
      "ctaWhySilent": "You questioned nobody, so the court had nothing to weigh.",
      "ctaWhyRecanted": "Your own press proved this an untruth: {list}",
      "ctaWhyThin": "Strength {n} against a bar of {bar}: the charge was under-built, not untrue.",
      "ctaWhySpend": "Court time: {n} of {total} actions used, {left} still on the clock when you closed.",
      "ctaCourtOpen": "Case taken: {c}. The clock is {total} actions and a sound verdict measures at {s} strength.",
      "ctaObjective": "{name}: {n} court actions. A sound verdict needs strength {s} with trust {m}; three stars are worth {p} strength. {f}",
      "ctaProved": "Every clue in this case is reachable without restarting.",
      "ctaProofBroken": "This case failed its own reachability proof. Report it.",
      "ctaCopyBroken": "Some verdict copy is missing. Report it.",
      "ctaFiled": "Case closed in {n} actions - {s} stars, best line is {p}.",
      "ctaRetry": "No stars logged: reach a sound verdict and the docket will record you.",
      "ctaNextCase": "Next case unlocked.",
      "ctaAllCases": "The whole docket is closed.",
      "ctaHint": "Number keys 1 to 4 pick the option, Enter confirms, Escape returns to the bench, L reads what you have established. Strength and trust are two numbers: press a witness for one and pay with the other.",
      "logCourtroomOfAnimals": "Pleaded {c} at strength {s} with trust {t}",
    },
    zh: {
      "tabCourtroomOfAnimals": "动物法庭",
      "ctaCase1": "失踪的粮袋",
      "ctaCase2": "被踩烂的菜园",
      "ctaCase3": "溃决的矮坝",
      "ctaCase4": "排满的案卷",
      "ctaCase5": "被打开的蜂树",
      "ctaCase6": "抹了油的窗台",
      "ctaCase7": "被换掉的羊毛",
      "ctaCase8": "重刻的计棍",
      "ctaCaseSelectLabel": "从案卷里挑一件案子",
      "ctaTimeLabel": "庭上时间",
      "ctaWordsLabel": "证词",
      "ctaPointsLabel": "案件点",
      "ctaTrustLabel": "最低信任",
      "ctaReadyLabel": "可成的指控",
      "ctaBenchLabel": "证人席：三位证人",
      "ctaShelfLabel": "证物台：固定的物证，点数为它的分量",
      "ctaTimeLeft": "还剩 {n}/{total} 次",
      "ctaWordsNow": "已听到 {n}/{total} 句",
      "ctaPointsNow": "{n} 点，来自 {p} 次逼问",
      "ctaTrustNow": "{n}/{total}",
      "ctaReadyNow": "{total} 项指控里已成 {n} 项",
      "ctaBenchAria": "证人，信任度用数字表示",
      "ctaShelfAria": "物证，分量用数字表示",
      "ctaCourtAria": "庭上动作：数字键 1-4 选一项，回车确认，Esc 回证人席，L 键念出你已确立的事实",
      "ctaWhyAria": "这个判决是为什么",
      "ctaRosterTitle": "开庭",
      "ctaCloseTitle": "你的结案陈词",
      "ctaCloseBody": "只指一项指控并站住它。法庭要的是强度 {s}、信任 {m}，两个数字都会在你选之前摆出来。",
      "ctaClosedTitle": "法庭已经宣判",
      "ctaClosedBody": "读下面几条说明：它们讲清你的案子哪一部分站住了、哪位证人太不被信、哪件物证始终没接上。",
      "ctaCardTrust": "信任 {n}/{total}",
      "ctaCardWords": "已听到 {n}/{total}",
      "ctaCardPressed": "被逼问 {n} 次",
      "ctaCardVouched": "已被旁证",
      "ctaWeight": "分量 {n}",
      "ctaMarked": "已呈堂",
      "ctaUnmarked": "尚未呈上",
      "ctaBtnAsk": "询问{w}",
      "ctaBtnPress": "用矛盾逼问{w}",
      "ctaBtnVouch": "用物证为{w}作旁证",
      "ctaBtnClose": "开始结案陈词",
      "ctaBtnBack": "回到证人席",
      "ctaBtnAgain": "把这件案子再审一遍",
      "ctaBtnNext": "案卷上的下一件",
      "ctaCostOne": "花 1 次庭上动作",
      "ctaCostNone": "不费时",
      "ctaWith": "已可动用",
      "ctaNeeds": "先得有{w}",
      "ctaTrustDown": "信任 -{n}",
      "ctaTrustUp": "信任 +1",
      "ctaCloseHint": "结案：还剩 {n} 次动作",
      "ctaDigits": "指控强度 {s} / 信任 {t} - 法庭要 {bar} / {need}",
      "ctaNothing": "什么都没有",
      "ctaWordLie": "已被推翻 - {s}",
      "ctaWordUnheard": "（还没问到的第 {n} 句）",
      "ctaNothingYet": "这位证人还什么都没说。",
      "ctaNothingMore": "{w}该说的都说完了。",
      "ctaAskSpent": "已无话可问",
      "ctaNoTime": "庭上时间用完了。",
      "ctaTimeUp": "{total} 次动作之后时间到。法庭请你即刻结案。",
      "ctaSaid": "{w}：{s}",
      "ctaExhibitOn": "已呈堂（{n} 点）：{c}",
      "ctaAlreadyMarked": "{c}已经在证物台上了。",
      "ctaPressOut": "逼问：{w}——{c}",
      "ctaPressOk": "{w}松了口：案件强度 +{n}，而{w}的信任降为 {tt}/{total}。",
      "ctaPressAgain": "这一逼已经逼过了，法庭记着。",
      "ctaVouchOut": "旁证：{w}站住了{e}。{c}",
      "ctaVouchOk": "{w}更被信一些了：信任 {tt}/{total}。",
      "ctaVouchAgain": "这位证人已经用过这件物证的旁证。",
      "ctaLieOut": "说法被推翻了：{s}——出自{w}，如今再没人会全盘信它。",
      "ctaNoOption": "这席上没有第 {n} 项。",
      "ctaLockedOption": "这一项还没准备好：{w}",
      "ctaFactList": "已听到：{w} || 已呈堂：{e} || 案件点 {n}（含 {p} 次逼问）|| 完全接上的指控 {s} 项，眼下对着干的矛盾 {x} 处 || 还剩 {t} 次动作。",
      "ctaNoteClosed": "结案陈词已出：{c}，强度 {s}。",
      "ctaVJust": "成立：{a}就是犯人，凭'{c}'——强度 {s}、信任 {t}，过了强度 {n}、信任 {m} 这条线。",
      "ctaVDoubt": "当庭驳回：'{c}'是真的，强度 {s} 也够，可它站在一个只有 {t} 分的证人身上，不到法庭要的 {m}。",
      "ctaVThin": "证据不足：'{c}'只有强度 {s}，而法庭要 {n}。法庭不会替你伸长。",
      "ctaVWrong": "抓错了动物：你用强度 {s} 把案子做在了{a}身上，而那位的的确确没做。",
      "ctaVSilent": "审判无效：你结案时只问了 {n} 位证人，庭上没有可秤的东西。",
      "ctaVRecanted": "自拆台脚：'{c}'靠的正是你自己逼问推翻的那句话。",
      "ctaWhyBasis": "你真正摆上桌的东西（强度 {n}、信任 {t}）：{list}",
      "ctaWhyUnlinked": "始终没接进指控：{list}",
      "ctaWhyTrust": "太不被信，撑不住：{list}",
      "ctaWhyWrong": "不管数字多漂亮，它都不是犯人：{list}",
      "ctaWhySilent": "你一位证人都没问，法庭无从秤起。",
      "ctaWhyCarried": "撑起判决的是：{list}被法庭信到 {t} 分，而这条指控站在 {n} 分上，线是 {bar} 分。",
      "ctaWhyRecanted": "你自己的逼问证明了它是假话：{list}",
      "ctaWhyThin": "强度 {n}，线是 {bar}：这条指控是没搭够，不是不真。",
      "ctaWhySpend": "庭上时间：用了 {n}/{total} 次动作，结案时钟上还剩 {left}。",
      "ctaCourtOpen": "受理：{c}。钟是 {total} 次动作，一个站得住的判决量到 {s} 强度。",
      "ctaObjective": "{name}：庭上动作 {n} 次。站得住的判决要强度 {s}、信任 {m}；三星值 {p} 强度。{f}",
      "ctaProved": "本案每一条线索都能在不重开的情况下拿到。",
      "ctaProofBroken": "本案没通过它自己的可达性校验，请报告。",
      "ctaCopyBroken": "有判决文案缺失，请报告。",
      "ctaFiled": "用了 {n} 次动作结案 - 获得 {s} 星，满线是 {p}。",
      "ctaRetry": "不记星：先做出一个站得住的判决，案卷才会记下你。",
      "ctaNextCase": "解锁下一件案子。",
      "ctaAllCases": "整本案卷审完了。",
      "ctaHint": "数字键 1-4 选项，回车确认，Esc 回证人席，L 念出你已确立的事实。强度和信任是两个数字：逼一个证人换来其一，就要用其二来付。",
      "logCourtroomOfAnimals": "在{c}里以强度 {s}、信任 {t} 结案",
    },
  });

  App.registerGame({
    name: "courtroomOfAnimals",
    tabKey: "tabCourtroomOfAnimals",
    init: initCourtroomOfAnimalsGame,
    guide: {
      svg:
        '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="4" y="6" width="112" height="64" rx="5" fill="rgba(20,24,32,.92)" stroke="rgba(148,163,184,.45)"/>' +
        '<path d="M20 20h30v40H20z" fill="none" stroke="rgba(185,193,204,.5)" stroke-width="2"/>' +
        '<text x="35" y="34" font-size="8" fill="#b9c1cc" text-anchor="middle">trust 1/5</text>' +
        '<text x="35" y="48" font-size="12" fill="#ffd166" text-anchor="middle">S6</text>' +
        '<path d="M52 40h18" stroke="#00f2ff" stroke-width="2"/>' +
        '<rect x="72" y="24" width="34" height="16" rx="3" fill="none" stroke="#00f2ff" stroke-width="2"/>' +
        '<text x="89" y="35" font-size="8" fill="#00f2ff" text-anchor="middle">strength</text>' +
        '<rect x="72" y="46" width="34" height="16" rx="3" fill="none" stroke="#ff6b35" stroke-width="2"/>' +
        '<text x="89" y="57" font-size="8" fill="#ff6b35" text-anchor="middle">trust</text></svg>',
      en: [
        "Goal: close one of eight cases with a verdict the numbers behind it actually support.",
        "Action: click a witness to take their testimony in order, click an exhibit to mark it, then press 1 to 4 to spend an action, Enter to confirm, Escape back to the bench, L to read out everything you have established.",
        "Two numbers: claim strength comes from testimony, exhibit weight and contradictions; witness trust is separate, starts at the case's own value, and is what the bench will believe.",
        "The trade-off: pressing a witness adds 2 to the charge it serves and costs that witness 1 trust; corroborating a witness with a marked exhibit adds 1 to both.",
        "Watch out: a true charge on a witness trusted below the bar is thrown out, and a charge resting on an account you exposed as a lie recants itself.",
        "Scoring: the verdict quality is the gate, the case strength of your closing sets the stars, and the bands are measured from each case's own best-play line.",
      ],
      zh: [
        "目标：在八件案子里结一件，判决要能被它背后的数字真正撑住。",
        "操作：点证人按顺序取他的证词，点物证把它呈堂，再按 1 到 4 花掉一次庭上动作，回车确认，Esc 回证人席，L 键念出你已确立的一切。",
        "两个数字：指控强度来自证词、物证分量与矛盾；证人信任是另一回事，由案子自己给定，那才是法庭愿意信多少。",
        "取舍：逼一个证人，替他服务的那条指控加 2，可这位证人的信任减 1；用已呈堂的物证为他旁证，两边各加 1。",
        "小心：真指控站在一个信任不够的证人身上会被当庭驳回；而建立在你亲耳推翻的假话上的指控，会自己塌掉。",
        "计分：判决质量是门槛，结案陈词的案件强度定星数，星数的档位是从每件案子自己的最优打法量出来的。",
      ],
    },
  });

  /* Exported for the other modules. */
  App.initCourtroomOfAnimalsGame = initCourtroomOfAnimalsGame;
})(window.CapitalConvert = window.CapitalConvert || {});
