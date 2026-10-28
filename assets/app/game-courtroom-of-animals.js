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

  /* --- the docket: twenty-four authored cases ---------------------------- */
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
    {
      id: "k9", labelKey: "ctaCase9", time: 14, culprit: "badger",
      bar: { strength: 11, trust: 4 },
      charge: {
        en: "Four sacks of seed went onto the miller's I.O.U. last autumn, and one morning the name was scratched out of the counting-room copy. Two of these witnesses have never carried a charge for this bench, and the bench prices a charge before it votes on one.",
        zh: "去年秋天，四袋种子上了磨坊主那张欠条。一天早上，账房底单上的名字被人划掉了。庭上有两位证人从来没被这群法官信过，而他们投票之前，会先把一条指控的价钱报给你。",
      },
      suspects: [
        { id: "badger", en: "Bram the Badger", zh: "獾布拉姆" },
        { id: "hedgehog", en: "Pip the Hedgehog", zh: "刺猬皮普" },
        { id: "newt", en: "Nell the Newt", zh: "蝾螈内尔" },
      ],
      exhibits: [
        { id: "k9e1", weight: 3, en: "The I.O.U. copy: the name scratched through four times, slow and deep, and every tally figure under it left untouched.", zh: "欠条的底单：名字被划了四下，又慢又深，底下一个数目都没动。" },
        { id: "k9e2", weight: 3, en: "The counting-room sill, one wet print in it and a smear of fish-silt carried up out of the mill pond.", zh: "账房的窗台，上面一个湿印，还有一道从磨坊塘里带上来的鱼泥。" },
        { id: "k9e3", weight: 2, en: "The miller's own copy of the same debt: four sacks, and in the corner a seal pressed in the shape of a broad back.", zh: "磨坊主自己留的那张债单：四袋种子，角上一个印子，压出一条宽背的形状。" },
        { id: "k9e4", weight: 1, en: "A hedgehog's quill in the door hasp, dry and curled, where it has sat since the hasp was last oiled.", zh: "门鼻上卡着一根刺猬的刺，干了也卷了，从门鼻上回油那天起就卡在那儿。" },
        { id: "k9e5", weight: 2, en: "Newt skin shed on the sill stone that same week, and a mud track running from the pond wall to the sill.", zh: "窗台石上留着那周蜕下的蝾螈皮，塘墙到窗台还有一条泥道。" },
      ],
      witnesses: [
        {
          id: "k9w1", trust: 3, en: "Nell the Newt", zh: "蝾螈内尔",
          statements: [
            { id: "k9s1", claim: "k9c1", en: "I lay on that sill the whole of the moonless night, and I heard the scratching: four strokes, slow, and then the door.", zh: "那一夜没有月亮，我整夜趴在那道窗台上。我听见划字的声音：四下，很慢，然后门响了。" },
            { id: "k9s2", contra: ["k9e4"], en: "Nobody went in at the door. A dry quill in a shut hasp proves somebody closed it, not that anybody opened it.", zh: "没有人从门进去。门鼻关着，上头一根干刺，只能证明有人把门带上过，不能证明有人推开过。" },
          ],
        },
        {
          id: "k9w2", trust: 3, en: "Pip the Hedgehog", zh: "刺猬皮普",
          statements: [
            { id: "k9s3", claim: "k9c1", en: "Bram owed the miller four sacks and would not own it once in the market. I kept that tally for him all autumn, and a debt kept by proxy is a debt with a witness to it.", zh: "布拉姆欠磨坊主四袋，集上死活不认。那年秋天那笔账是我替他记的。托人记账的债，本身就带着知情人。" },
            { id: "k9s4", claim: "k9c2", contra: ["k9e1"], en: "A name goes through scratch by scratch, and a hedgehog scratches once with a hind foot and then goes.", zh: "划名字是一道一道划的。刺猬只用后腿划一道，划完就走。" },
          ],
        },
        {
          id: "k9w3", trust: 4, en: "Bram the Badger", zh: "獾布拉姆",
          statements: [
            { id: "k9s5", lie: true, en: "I have not been into a counting room since that debt was written, and my name in a ledger is a name any animal could copy.", zh: "那张欠条写下之后，我一步没进过账房。账上的名字，随便哪只动物都能照抄。" },
            { id: "k9s6", claim: "k9c3", en: "That sill is Nell's road in and out, and if she says she stood there all night she stood there all night. I will not argue with a wet print.", zh: "那道窗台本来就是内尔进出的路。她说她整夜在那儿，那就是整夜在那儿。我不跟一个湿脚印犟嘴。" },
          ],
        },
      ],
      presses: [
        { id: "k9p1", witness: "k9w3", with: "k9e3", contra: ["k9s5"], claim: "k9c1", cost: 1, en: "You have not been in since the debt was written, and yet your own back is pressed into the corner of the miller's copy.", zh: "你说欠条写下之后你就没进过账房。可磨坊主那张底单的角上，压着的正是你那条背。" },
        { id: "k9p2", witness: "k9w3", with: "k9e2", contra: ["k9s5"], exposes: "k9s5", claim: "k9c1", cost: 1, en: "Fish-silt came up the pond wall on a wet back to that sill, and four slow strokes are a patience no hedgehog and no newt has any use for.", zh: "鱼泥是顺着一副湿背从塘墙爬上那道窗台的。四下又慢又深的划痕，是刺猬和蝾螈都用不着的耐心。" },
        { id: "k9p3", witness: "k9w2", with: "k9e1", contra: ["k9s4"], claim: "k9c1", cost: 2, en: "You kept his tally, so you know the figures, and you know four deep strokes through a name is not a foot's work at all.", zh: "那笔账是你替他记的，所以你认得这些数目，也认得划穿名字的四道深痕根本不是脚划出来的。" },
        { id: "k9p4", witness: "k9w1", with: "k9e4", contra: ["k9s2"], claim: "k9c2", cost: 1, en: "You heard the door and you say nobody used it, which is a thing heard from a sill and never from a hinge.", zh: "你听见了门，又说没人用过它。这是趴在窗台上听得出的话，贴在门轴上才听不出。" },
      ],
      vouches: [
        { id: "k9v1", witness: "k9w1", exhibit: "k9e5", claim: "k9c1", en: "Skin shed on that stone the same week and a mud track from the pond: the bench is given a road the witness walked, not only a story she told.", zh: "同一周蜕在那块石头上的皮，加上一条从塘边来的泥道：法庭拿到的是这位证人走过的路，不只是她说过的一段话。" },
        { id: "k9v2", witness: "k9w2", exhibit: "k9e3", claim: "k9c1", en: "The counter-tally is written on the back of the miller's copy, and no animal writes down a debt he never carried.", zh: "对账的字就写在磨坊主那张底单的背面。没有谁会把一笔自己从没背过的债写下来。" },
        { id: "k9v3", witness: "k9w3", exhibit: "k9e4", claim: "k9c2", en: "A quill in the hasp is a hedgehog standing at that door, and the door is the only road this tally ever admits.", zh: "门鼻上的刺就是刺猬站在那道门口。而那笔账从头到尾只认门这一条路。" },
      ],
      claims: [
        { id: "k9c1", accused: "badger", statements: ["k9s1", "k9s3"], exhibits: ["k9e1", "k9e2", "k9e3"], en: "Bram came over the sill, scratched his own name off the copy and left the debt standing", zh: "布拉姆翻过窗台，把自己的名字从底单上划掉，把债留在原处" },
        { id: "k9c2", accused: "hedgehog", statements: ["k9s4"], exhibits: ["k9e1", "k9e4"], en: "Pip opened the door he was never at and scratched the name for a share of the four sacks", zh: "皮普开了那道他根本没到过的门，划掉名字，好分那四袋种子" },
        { id: "k9c3", accused: "newt", statements: ["k9s2", "k9s6"], exhibits: ["k9e2", "k9e5"], en: "Nell lay on her own sill all night, knew the whole of it and said nothing until she was asked", zh: "内尔整夜趴在自己那道窗台上，什么都知道，不问一句就不开口" },
      ],
    },
    {
      id: "k10", labelKey: "ctaCase10", time: 14, culprit: "pike",
      bar: { strength: 12, trust: 4 },
      charge: {
        en: "The last stone of the stone weir came over on the flood night and the village's winter eels went down the race with the gap. One witness here stood in that water all night, and the loudest thing the court can do to him is the one thing that loses the case.",
        zh: "发大水那夜，石坝上最后一块石头翻了，村里过冬的鳝鱼顺着豁口全下了水道。这堂上有一位证人整夜就站在那片水里。法庭能对他做得最响的一件事，恰恰是把这案子输掉的那一件事。",
      },
      suspects: [
        { id: "pike", en: "Percival the Pike", zh: "狗鱼珀西" },
        { id: "ram", en: "Grieve the Ram", zh: "公羊格里夫" },
        { id: "wagtail", en: "Tib the Wagtail", zh: "鹡鸰蒂布" },
      ],
      exhibits: [
        { id: "k10e1", weight: 3, en: "The last weir stone, laid down with its wet face to the race and one end out of the mud it sat in for eleven summers.", zh: "坝上最后一块石头，潮的那一面朝水道放着，一头已经脱出了它待过十一个夏天的淤泥。" },
        { id: "k10e2", weight: 2, en: "The flood-mark on the weir post: the water stood a hand below a standing ram's chest the whole night through.", zh: "坝柱上的洪痕：整夜的水位，就在站着的公羊胸口底下那一掌。" },
        { id: "k10e3", weight: 2, en: "A broken toe-hold on the slick stone and a crescent of horn-scour braced there, old and fresh in the one crescent.", zh: "那块滑石上一个磕坏的趾窝，一弯角磨出来的痕。同一弯里，旧的新的都有。" },
        { id: "k10e4", weight: 3, en: "The eel-basket off the weir shelf: its withy lid bitten open from the inside, and no print of a foot on that shelf.", zh: "坝架上那只鳝篓：藤条盖是从里面咬开的，架子上却一个脚印都没有。" },
        { id: "k10e5", weight: 1, en: "Wagtail marks along the crest, every one of them dry: a bird that walked the top of the weir while the water went under it.", zh: "坝顶上一路鹡鸰的脚印，个个是干的：水在下面过的时候，这只鸟一直走在坝顶。" },
      ],
      witnesses: [
        {
          id: "k10w1", trust: 3, en: "Grieve the Ram", zh: "公羊格里夫",
          statements: [
            { id: "k10s1", claim: "k10c1", en: "I stood braced on that stone the whole flood night, because the eel-basket sat under it and the basket is the village's winter.", zh: "那一整夜我撑开腿站在那块石头上。鳝篓就压在石头底下，那篓子是全村过冬的口粮。" },
            { id: "k10s2", claim: "k10c1", en: "The water came over the last stone from the deep side, and a long head went through the gap, widening it as it went.", zh: "水是从深那一侧漫过最后一块石头的。一个长头的东西从豁口钻过去，一边钻一边把它顶大。" },
          ],
        },
        {
          id: "k10w2", trust: 4, en: "Tib the Wagtail", zh: "鹡鸰蒂布",
          statements: [
            { id: "k10s3", claim: "k10c1", en: "That gap was leaned open from inside the race. Nothing with feet stood in that water at that hour, and no bird can shoulder a weir stone with his breast.", zh: "那道豁口是从水道里面被顶开的。那个钟头，水里没有一只长脚的东西站过。而鸟的胸口也顶不动一块坝石。" },
            { id: "k10s4", claim: "k10c2", contra: ["k10e2"], en: "I held the crest all night and never once came down to the stones, so the dry marks are mine and the wet ones are somebody else's.", zh: "我整夜都在坝顶上，一次都没下到石头那儿。所以干印子是我的，湿印子是别人的。" },
          ],
        },
        {
          id: "k10w3", trust: 2, en: "Percival the Pike", zh: "狗鱼珀西",
          statements: [
            { id: "k10s5", lie: true, en: "I lay under the far root the whole flood, where every pike lies when the water runs brown, and the water never came up to my head.", zh: "整场大水我都趴在对面那个树根底下——水一浑，狗鱼都趴在那儿。水头一直没到我这颗头。" },
            { id: "k10s6", claim: "k10c3", en: "The ram will swear he saw a head in the water. He saw my back going up the race at dusk, and in brown water a back is a head to anything that is frightened.", zh: "公羊赌咒说他在水里看见一个头。他看见的是我傍晚顺着水道上去的背。水浑的时候，心里发毛的，谁都能把背看成头。" },
          ],
        },
      ],
      presses: [
        { id: "k10p1", witness: "k10w3", with: "k10e1", contra: ["k10s5"], claim: "k10c1", cost: 1, en: "A pike that lay under a root all flood had no need of a moved stone, and less need of a lid bitten open from the inside.", zh: "整夜趴在树根底下的狗鱼，用不着一块被人搬开的石头。而从里面咬开的盖子，他更用不着。" },
        { id: "k10p2", witness: "k10w3", with: "k10s3", contra: ["k10s5"], claim: "k10c1", cost: 1, en: "You say the water never reached your head, and the gap was leaned from inside the race, where only a swimmer can get a shoulder under.", zh: "你说水头没到你这颗头。可那道豁口是从水道里面顶开的——在那儿，只有会游的才把得住肩膀。" },
        { id: "k10p3", witness: "k10w1", with: "k10e2", contra: ["k10s1"], exposes: "k10s2", claim: "k10c1", cost: 1, en: "The flood stood a hand below your chest all night, so what you saw of a stone's wet underside was the water over it and nothing else.", zh: "整夜的水位就在你胸口下面一掌。那块石头潮的那一面，你看见的只能是压在上头的水，别的一样也看不见。" },
        { id: "k10p4", witness: "k10w2", with: "k10e5", contra: ["k10s4"], claim: "k10c3", cost: 1, en: "Dry marks, a crest all night, and a gap that opened under your own eyes without one word coming off you.", zh: "印子是干的，你整夜在坝顶上，豁口就在你眼皮底下开起来，而你一个字都没说。" },
      ],
      vouches: [
        { id: "k10v1", witness: "k10w1", exhibit: "k10e3", claim: "k10c1", en: "A broken toe-hold and a night of horn-scour on the one stone: the bench is shown where a witness stood, which is more than most oaths carry.", zh: "同一块石头上一道磕坏的趾窝、一整夜的角磨痕：法庭看见的是这位证人站在哪儿。这比多数赌咒扛得住。" },
        { id: "k10v2", witness: "k10w2", exhibit: "k10e5", claim: "k10c1", en: "Dry marks along the crest are a witness who could see the whole of that weir and could not move one stone of it.", zh: "坝顶那一路干印子，说的是这位证人看得见整座坝，却搬不动坝上一块石头。" },
        { id: "k10v3", witness: "k10w3", exhibit: "k10e4", claim: "k10c2", en: "A lid bitten from the inside is a pike's own work, and this bench will corroborate a suspect who tells the shape of one thing truly.", zh: "从里面咬开的盖子是狗鱼自己干的活。这位嫌疑犯把一样东西的形状说对了，法庭就把这一分给他。" },
      ],
      claims: [
        { id: "k10c1", accused: "pike", statements: ["k10s1", "k10s2", "k10s3"], exhibits: ["k10e1", "k10e2", "k10e4"], en: "Percival went in on the flood and leaned the last stone over to run the eels down the race", zh: "珀西趁着大水进去，把最后一块石头顶翻，把鳝鱼放进水道" },
        { id: "k10c2", accused: "ram", statements: ["k10s4", "k10s6"], exhibits: ["k10e3", "k10e4"], en: "Grieve stood on the stone, leaned it over himself and named a fish to cover the wet print", zh: "格里夫站在那块石头上，自己把石头顶翻，又指一条鱼来盖住那个湿印" },
        { id: "k10c3", accused: "wagtail", statements: ["k10s5"], exhibits: ["k10e1", "k10e5"], en: "Tib walked the crest, saw the gap made and let the night's count fall on a pike", zh: "蒂布在坝顶走着，眼看着豁口开起来，却把这夜的账推到一条狗鱼身上" },
      ],
    },
    {
      id: "k11", labelKey: "ctaCase11", time: 12, culprit: "stoat",
      bar: { strength: 10, trust: 2 },
      charge: {
        en: "A lamb went out of the fold at dark and the latch was found bent, not broken. This bench believes a witness it has pressed less than a witness it has corroborated, and it prices that difference in front of you.",
        zh: "天黑时一只羊羔从圈里出去了，门闩找到时是弯的，不是断的。这群法官信被逼问过的证人，远不如信被佐证过的证人，而这个价钱他们会当你的面报出来。",
      },
      suspects: [
        { id: "stoat", en: "Niv the Stoat", zh: "白鼬尼夫" },
        { id: "pika", en: "Munt the Pika", zh: "鼠兔芒特" },
        { id: "wren", en: "Tuck the Wren", zh: "鹪鹩塔克" },
      ],
      exhibits: [
        { id: "k11e1", weight: 3, en: "The latch iron, bent outward in one slow curve: the bend a shoulder makes, and no hand and no bill can make.", zh: "门闩的铁向外弯成一道慢弧。那是肩膀弯得出的弧，手和嘴都弯不出来。" },
        { id: "k11e2", weight: 2, en: "A drag under the gate rail one low body wide, the grass laid flat going out and standing everywhere coming in.", zh: "门栏底下一道拖痕，一个低身子那么宽。出去的草被压平了，回来的地方草全立着。" },
        { id: "k11e3", weight: 2, en: "The wool on the gate post rubbed off on one side only, at the height of a running stoat's flank.", zh: "门柱上的羊毛只磨掉了一边，高度正是一只跑着的白鼬的肋侧。" },
        { id: "k11e4", weight: 1, en: "Munt's own food-hole under that post: husk to the back of it, and not one thread of lamb.", zh: "门柱底下芒特自己的粮洞：一直通到后头，全是壳，一星羊肉的丝都没有。" },
      ],
      witnesses: [
        {
          id: "k11w1", trust: 4, en: "Perrin the Ewe", zh: "母羊佩林",
          statements: [
            { id: "k11s1", claim: "k11c1", en: "I stood in that fold till the last bell. A latch does not bend itself, and what bent it had no hands to leave and no wings to lift.", zh: "最后一声钟之前我一直待在圈里。门闩不会自己弯。把它弯下去的，既没有手可留，也没有翅膀可抬。" },
            { id: "k11s2", contra: ["k11e4"], en: "Nothing went out of my fold through the ground. A hole under a post is a hole, and it is not a gate.", zh: "我圈里没一样东西是从地底下出去的。柱子底下那个洞是个洞，可它不是门。" },
          ],
        },
        {
          id: "k11w2", trust: 2, en: "Niv the Stoat", zh: "白鼬尼夫",
          statements: [
            { id: "k11s3", lie: true, en: "I have not been in that yard since the barley was cut. Ask the bird on the post: he saw the whole of my going and my coming.", zh: "大麦割完以后我就没进过那个院子。柱子上那只鸟你问去，我什么时候去的、什么时候走的，他全看见了。" },
            { id: "k11s4", claim: "k11c2", en: "A pika goes under a rail as easily as I do, and a pika has a lamb's taste and none of a lamb's luck.", zh: "栏底下的缝，鼠兔跟我一样钻得过去。鼠兔既尝过羊羔的味道，又没有羊羔的运气。" },
          ],
        },
        {
          id: "k11w3", trust: 2, en: "Munt the Pika", zh: "鼠兔芒特",
          statements: [
            { id: "k11s5", claim: "k11c1", en: "What went under that rail went in flat on its belly. I am short in the back and I cannot lay myself down that long, and he can.", zh: "从栏底下过去的那位，是整个肚皮贴地钻的。我背短，趴不成那么长的一条。他倒能。" },
            { id: "k11s6", claim: "k11c3", contra: ["k11e1"], en: "The wren has sat on that gate post three days running. A latch turned by a bill is a thing a bird does and a pika does not.", zh: "鹪鹩连着三天都蹲在那根门柱上。用嘴把闩拧开，是鸟干得出来、鼠兔干不出来的事。" },
          ],
        },
      ],
      presses: [
        { id: "k11p1", witness: "k11w3", with: "k11e1", contra: ["k11s6"], claim: "k11c1", cost: 1, en: "You say a bill turned that iron, and yet the curve is one slow bend outward, which no beak has ever left.", zh: "你说是嘴把那块铁拧开的。可那弧是慢慢往外的一道弯，天底下没有嘴能留下这种印子。" },
        { id: "k11p2", witness: "k11w2", with: "k11e2", contra: ["k11s3"], claim: "k11c2", cost: 1, en: "The grass lies flat going out and stands coming in, so whoever you have seen in that yard, he came back.", zh: "出去的草是倒的，回来的草立着。所以你在院里见过的那位，是又回来了的。" },
        { id: "k11p3", witness: "k11w2", with: "k11e1", contra: ["k11s3"], exposes: "k11s3", claim: "k11c3", cost: 1, en: "You have not been in the yard, yet the wool on that post is at the height of your flank and no other animal's.", zh: "你说你没进过院子。可柱子上那层羊毛的高度正是你这副肋侧，别家的都不到。" },
      ],
      vouches: [
        { id: "k11v1", witness: "k11w3", exhibit: "k11e4", claim: "k11c1", en: "A food-hole clean of lamb and stuffed with husk is a pika written off by his own winter, and the bench reads a larder before a grudge.", zh: "粮洞里只有壳、没有羊肉，那是芒特自己的过冬在替他说话。法庭宁可信一仓粮，也不赌一口气。" },
        { id: "k11v2", witness: "k11w2", exhibit: "k11e3", claim: "k11c2", en: "The rubbed wool sits at the height of a passing body, and the passing body here was named before it spoke.", zh: "磨掉的那层羊毛正到一个过路身子的高度，而过路的那位，还没开口就先被人点了名。" },
      ],
      claims: [
        { id: "k11c1", accused: "stoat", statements: ["k11s1", "k11s5"], exhibits: ["k11e1", "k11e2", "k11e3"], en: "Niv went under the rail on his belly and turned the latch with his own shoulder", zh: "尼夫肚皮贴地从门栏下钻过去，用自己的肩膀把闩顶开" },
        { id: "k11c2", accused: "pika", statements: ["k11s4"], exhibits: ["k11e2", "k11e3"], en: "Munt is low enough for that gap and went out through it with the lamb", zh: "芒特的身板配得上那道缝，羊羔是他带着从缝里出去的" },
        { id: "k11c3", accused: "wren", statements: ["k11s3", "k11s6"], exhibits: ["k11e1", "k11e4"], en: "Tuck turned the latch with his bill and left the yard to somebody else", zh: "塔克用嘴拧开门闩，把院子留给别人" },
      ],
    },
    {
      id: "k12", labelKey: "ctaCase12", time: 12, culprit: "rook",
      bar: { strength: 12, trust: 3 },
      charge: {
        en: "The seed was sown in eleven rows on Sunday and by Monday the rows were crossed with a dragging line. Nothing in this case can be forced out of a witness: the bench will only lift it if an exhibit stands beside the mouth that says it.",
        zh: "周日种子下成十一行，周一那些行上就多了一道拖出来的横线。这一案里，任何东西都从证人嘴里逼不出来：除非证物站在那张嘴旁边，否则法庭一分也不给。",
      },
      suspects: [
        { id: "rook", en: "Pell the Rook", zh: "秃鼻乌鸦佩尔" },
        { id: "marten", en: "Rookmund the Marten", zh: "黄貂鲁克蒙" },
        { id: "hare", en: "Sim the Hare", zh: "野兔西姆" },
      ],
      exhibits: [
        { id: "k12e1", weight: 3, en: "The crossed line: seed dragged out of the furrow in a straight thread, the thread of something flown low and heavy.", zh: "那道横线：种子被从垄里拖出来，拉成一条直线——那是贴着地、驮着分量飞的东西才拖得出的线。" },
        { id: "k12e2", weight: 2, en: "The seed bag, its neck stretched into a wide gullet and the twine worn through where a breast rubbed it.", zh: "种子袋的袋口被撑成一条宽嗓子，麻绳在胸口蹭过的那一处已经磨穿了。" },
        { id: "k12e3", weight: 2, en: "One row left whole at the end of the field, and its grain turned the other way from all the rest.", zh: "地头剩下一行没动，那一行的谷粒朝向跟其余十行全都相反。" },
        { id: "k12e4", weight: 1, en: "Pell's own store of acorns under the ridge, sixty of them, and not one grain of barley.", zh: "佩尔在山脊下自己藏的橡子，六十颗，一粒大麦都没有。" },
        { id: "k12e5", weight: 1, en: "A marten print at the field corner, dry, and older than Sunday's sowing by a day of rain.", zh: "田角上一个黄貂的印子，是干的，比周日下种那天早一场雨。" },
      ],
      witnesses: [
        {
          id: "k12w1", trust: 4, en: "Pell the Rook", zh: "秃鼻乌鸦佩尔",
          statements: [
            { id: "k12s1", claim: "k12c1", en: "A rook carries in his bill and drops it standing. What crossed those rows dragged, and a thing that drags had the whole of it in its crop.", zh: "乌鸦用嘴叼东西，落地就丢。把那些行横着拖过去的，是拖着的。会拖的，整份分量都还在嗓子眼里。" },
            { id: "k12s2", claim: "k12c2", en: "Rookmund came to the corner on the night. I have a marten's print in my own field and I say it out loud.", zh: "鲁克蒙当夜到过田角。我自己地里就有黄貂的印子，这话我敢大声说。" },
          ],
        },
        {
          id: "k12w2", trust: 3, en: "Bess the Sower", zh: "播种人贝丝",
          statements: [
            { id: "k12s3", claim: "k12c1", en: "I sowed eleven rows and I left one whole at the headland, and the whole row was the one that flies look at before they settle.", zh: "十一行是我下的，地头留了一行没动。会飞的东西落下来之前，先看的正是那一行。" },
            { id: "k12s4", lie: true, en: "The bag was tied with the twine still whole when I shut the store, and no animal of the air came at it.", zh: "我锁库房的时候，袋口的绳还是整的。天上飞的没有一个碰过它。" },
          ],
        },
        {
          id: "k12w3", trust: 2, en: "Rookmund the Marten", zh: "黄貂鲁克蒙",
          statements: [
            { id: "k12s5", claim: "k12c3", en: "The crossed line runs out of the field, not into it. Whoever made it was carrying the seed away from the sowing, and I only took what lay loose at the corner.", zh: "那道横线是从田里拖出去的，不是拖进来的。画它的东西把种子往田外带。我只捡了田角散着的那点。" },
            { id: "k12s6", claim: "k12c1", en: "My print at that corner is Sunday's and it is dry. I was there before the sowing and I went before the crossing was made.", zh: "我田角那个印子是周日的，是干的。下种之前我就在那儿，横线画成之前我就走了。" },
          ],
        },
      ],
      presses: [
        { id: "k12p1", witness: "k12w3", with: "k12e5", contra: ["k12s5"], claim: "k12c2", cost: 1, en: "You were at the corner before the sowing, and the line was drawn after it, which leaves your print and your absence in the same day.", zh: "你说下种前你就在田角。可那道线是下种之后拖出来的。这样你的印子你的不在场，就落在同一天里了。" },
        { id: "k12p2", witness: "k12w1", with: "k12e4", contra: ["k12s1"], claim: "k12c3", cost: 1, en: "You teach the bench how a rook carries, and your own store is sixty acorns with never a grain of barley in it.", zh: "你教法庭乌鸦怎么搬东西。可你自己的囤是六十颗橡子，一粒大麦也没有。" },
      ],
      vouches: [
        { id: "k12v1", witness: "k12w1", exhibit: "k12e4", claim: "k12c1", en: "A store of another animal's winter is a throat proved full of something else, and the bench will take a larder over a lecture.", zh: "囤里装的是别家的过冬，那就等于把嗓子证明满了别的东西。法庭宁肯信一仓粮，不信一堂讲义。" },
        { id: "k12v2", witness: "k12w2", exhibit: "k12e2", claim: "k12c1", en: "The twine worn through at the height of a breast is a second mouth on that bag, and the sower who read it is the sower who wrote it.", zh: "麻绳磨穿的地方正到胸口的高度，那就是袋子上第二张嘴。读出这一点的播种人，也正是写下这一点的人。" },
        { id: "k12v3", witness: "k12w3", exhibit: "k12e3", claim: "k12c1", en: "A row left whole and turned the wrong way is a mark made by an eye, and the marten who named it had no reason in the world to look.", zh: "留下一行、还把谷粒朝反了放，那是一双眼睛做的记号。说出这句的黄貂，本来一点理由都不必去看。" },
      ],
      claims: [
        { id: "k12c1", accused: "rook", statements: ["k12s1", "k12s3", "k12s6"], exhibits: ["k12e1", "k12e2", "k12e3"], en: "Pell lightened the bag at the store and drew the seed out across the rows", zh: "佩尔在库房把袋子掏轻，把种子横着拖过了十一行" },
        { id: "k12c2", accused: "marten", statements: ["k12s2"], exhibits: ["k12e2", "k12e5"], en: "Rookmund came over the corner and dragged the seed to his own hole", zh: "鲁克蒙从田角过来，把种子拖回自己的洞" },
        { id: "k12c3", accused: "hare", statements: ["k12s4", "k12s5"], exhibits: ["k12e1", "k12e4"], en: "Sim crossed the rows from below and the whole row at the headland is his leavings", zh: "西姆从下头横过那些行，地头留下的整一行是他的剩饭" },
      ],
    },
    {
      id: "k13", labelKey: "ctaCase13", time: 11, culprit: "heron",
      bar: { strength: 12, trust: 3 },
      charge: {
        en: "The salmon yard's first spawn-stone was lifted off the shallows and set down in the reeds, and the water ran out from under the eggs by morning. To break the lying account in this case costs a coin of trust, and the coin is paid to the witness you need most.",
        zh: "产卵滩上第一块孵卵石被人从浅处搬起来，扔进芦苇里，早上水就从卵底下走光了。这一案要戳穿那句谎话，就得赔上一枚信任的钱币，而赔的正是你最靠得住的那位证人。",
      },
      suspects: [
        { id: "heron", en: "Sarka the Heron", zh: "苍鹭萨尔卡" },
        { id: "otter", en: "Lys the Otter", zh: "水獭丽丝" },
        { id: "dipper", en: "Hob the Dipper", zh: "河乌霍布" },
      ],
      exhibits: [
        { id: "k13e1", weight: 3, en: "The spawn-stone out in the reeds, its under-face still wet on one side only, and the reeds about it unbroken.", zh: "芦苇里那块孵卵石，底面只有一边还是湿的，四周的芦苇一根没折。" },
        { id: "k13e2", weight: 2, en: "A long leg-print in the wet sand of the shallows, three toes, and the hollow where a knee rested.", zh: "浅滩湿沙上一个长腿印子，三个趾，外加膝盖撑过的一坑。" },
        { id: "k13e3", weight: 2, en: "The mark the stone left on the bed: a seat pressed two hands deep, dry all the previous week.", zh: "石头在河床上留下的坑：两个手深，前一个整星期都是干的。" },
        { id: "k13e4", weight: 1, en: "Sarka's own feathers laid along the reed bed, where she stood a full hour and never stirred.", zh: "芦苇荡里落着萨尔卡自己的羽毛——她在那儿站了整整一个钟头，一步没动。" },
        { id: "k13e5", weight: 2, en: "A fish-head buried at the head of the spawn-stone, and no gull and no bird of prey on this water takes heads.", zh: "孵卵石上头埋着一个鱼头。这片水上的鸥和鹰类，没有一样吃鱼头的。" },
      ],
      witnesses: [
        {
          id: "k13w1", trust: 4, en: "Sarka the Heron", zh: "苍鹭萨尔卡",
          statements: [
            { id: "k13s1", claim: "k13c1", en: "I stood on that stone's seat all evening and the water was over it. What moved it moved it after dark, and after dark nothing on this water walks but me.", zh: "那块石头的坑边我站了整个傍晚，那时候水还盖着它。挪动它的，是天黑以后挪的。入夜这片水上会走的只有我。" },
            { id: "k13s2", claim: "k13c3", en: "The dipper dives to that stone every morning and stacks its chips on the brim. His work is on it and mine is nowhere on it.", zh: "河乌每天早上都潜到那块石头，把碎壳堆在沿上。他做的活在上头，我做的活哪儿都没有。" },
          ],
        },
        {
          id: "k13w2", trust: 3, en: "Lys the Otter", zh: "水獭丽丝",
          statements: [
            { id: "k13s3", lie: true, en: "I was off the shallows entirely that night. My slide is up the bank and dry at the top, and a dry top is a beast that never came down.", zh: "那夜我压根没到浅滩来。我滑水的道子在岸上，顶上还是干的。顶上干，就是从没下来的畜。" },
            { id: "k13s4", claim: "k13c1", en: "There is a knee-hollow in that sand at the height of a standing bird, and otter knees go under a body, not beside it.", zh: "沙上那坑膝盖撑过的窝，高正好到一只站着的鸟。水獭的膝盖是压在身子底下的，不是撑在身旁的。" },
          ],
        },
        {
          id: "k13w3", trust: 3, en: "Hob the Dipper", zh: "河乌霍布",
          statements: [
            { id: "k13s5", claim: "k13c2", en: "I have built at the head of that stone two seasons and I know its weight in water, which is nothing; out of water it is a horse's labour.", zh: "那块石头上头我垒了两季巢。它在水里没什么分量，离了水那就是一匹马的力气。" },
            { id: "k13s6", claim: "k13c1", en: "Whoever went over that sand had one long leg and put a knee down. He put it down on the side the stone was carried to, and lifted it up on the side it came from.", zh: "过那片沙的那位一条长腿，还跪了一下。他跪在石头被搬去的那一头，抬脚在石头来时的这一头。" },
          ],
        },
      ],
      presses: [
        { id: "k13p1", witness: "k13w2", with: "k13e1", contra: ["k13s3"], exposes: "k13s3", claim: "k13c1", cost: 1, en: "The stone lay on one wet face in standing reeds, so it was carried and not rolled, and it came down where something knelt.", zh: "石头一面朝湿地躺在没有折断的芦苇里，说明它是被抬来而不是滚来的。放下来的那一处，有东西跪过。" },
        { id: "k13p2", witness: "k13w3", with: "k13e3", contra: ["k13s5"], claim: "k13c2", cost: 1, en: "You know the stone's weight and its seat, and you have sat on both; a bird who lifts nothing still knows exactly what lifting is.", zh: "这块石头多重、原来的坑多深你都知道，而且那两样你都坐过。一只抬不动东西的鸟，对抬起来是什么感觉倒是一清二楚。" },
        { id: "k13p3", witness: "k13w1", with: "k13e2", contra: ["k13s2"], claim: "k13c3", cost: 2, en: "You stood on that seat all evening with the water over it, and the stone went out into the reeds without one reed being broken.", zh: "你整个傍晚都站在那坑边上，水还盖着它。石头后来进了芦苇荡，可一根芦苇都没折断。" },
      ],
      vouches: [
        { id: "k13v1", witness: "k13w2", exhibit: "k13e5", claim: "k13c1", en: "A fish-head buried at a spawn-stone is heron's housekeeping, and the otter who found it had eaten hers elsewhere.", zh: "孵卵石上头埋着鱼头，那是苍鹭过日子的做派。发现它的这只水獭，自己那一顿是在别处吃的。" },
        { id: "k13v2", witness: "k13w3", exhibit: "k13e4", claim: "k13c1", en: "Feathers laid along one bed for an hour are a stand recorded by the stand itself, and the bench can read a shape it can see.", zh: "一片羽毛顺着一个巢荡落了一个钟头，那就是那份站立自己记下的站立。法庭读的是看得见的形状。" },
      ],
      claims: [
        { id: "k13c1", accused: "heron", statements: ["k13s1", "k13s4", "k13s6"], exhibits: ["k13e1", "k13e2", "k13e3"], en: "Sarka lifted the spawn-stone after dark and set it in the reeds to drain the eggs", zh: "萨尔卡天黑后把孵卵石搬起来放进芦苇，把卵下的水放干" },
        { id: "k13c2", accused: "otter", statements: ["k13s3", "k13s5"], exhibits: ["k13e3", "k13e5"], en: "Lys dragged over the seat and the water went out wherever she slid", zh: "丽丝从坑上拖过去，水从她滑过的每一处走了" },
        { id: "k13c3", accused: "dipper", statements: ["k13s2"], exhibits: ["k13e1", "k13e2"], en: "Hob stacked his chips to raise the stone and let the race take the spawn", zh: "霍布把碎壳垒起来撬起那块石头，让水道把卵带走" },
      ],
    },
    {
      id: "k14", labelKey: "ctaCase14", time: 12, culprit: "jay",
      bar: { strength: 13, trust: 3 },
      charge: {
        en: "The drying-loft window stood open with the latch up and four of the twelve skeins were gone by dawn, cut from the same side every one. Four animals have been named for this bench and only one of the four charges can be stood on without a witness pulling against his own shelf.",
        zh: "晾房的窗开着，闩支了起来，天亮时十二条纱线少了四条，每一条都是从同一头割下来的。法庭点了四个名字，可这四条指控里只有一条站得住——站得住的那条，证人不会和自己面前的证物互相打架。",
      },
      suspects: [
        { id: "jay", en: "Jesup the Jay", zh: "松鸦杰瑟普" },
        { id: "marten", en: "Mardoc the Pine Marten", zh: "紫貂马多克" },
        { id: "squirrel", en: "Kitthe the Squirrel", zh: "松鼠基茜" },
        { id: "crow", en: "Corvin the Crow", zh: "乌鸦科尔文" },
      ],
      exhibits: [
        { id: "k14e1", weight: 3, en: "The four cut skeins: one edge of wool severed at the same slant, and no second start in any of the four cuts.", zh: "那四条被割下来的纱：毛断的斜度一模一样，每一刀都没有第二次的起头。" },
        { id: "k14e2", weight: 3, en: "The window's latch, raised from the outside with something that had a hooked upper foot and could hold it up while it worked.", zh: "窗闩是从外头支起来的，支它的东西上脚带钩，还能一边支着一边干活。" },
        { id: "k14e3", weight: 2, en: "The loft floor under the window: one line of dust broken, and the break goes to the beam and stops dead there.", zh: "窗下晾房的地：一道灰被踩断了，断口走到横梁那儿就断了。" },
        { id: "k14e4", weight: 2, en: "A jay's cache under the beam, four knots of wool and no more, buried the same night.", zh: "横梁底下松鸦藏的粮：正好四团毛线，别的一样没有，是当夜埋的。" },
        { id: "k14e5", weight: 1, en: "The marten's own shears from the tool shelf, oiled and shut, with no wool in the joint.", zh: "工具架上黄貂自己的剪子，上了油、合着口，缝里一毛不挂。" },
      ],
      witnesses: [
        {
          id: "k14w1", trust: 4, en: "Jesup the Jay", zh: "松鸦杰瑟普",
          statements: [
            { id: "k14s1", claim: "k14c1", en: "A one-cut slant is a mouth and a foot together. A bird has the mouth and no foot to hold the latch, and the animal who had both has been on that sill this season.", zh: "一刀下来的斜口，是一张嘴加一只脚一块儿干的。鸟有嘴，可没有能支闩的脚。两样齐全的这位，这一季就在那道窗台上待过。" },
            { id: "k14s2", claim: "k14c2", contra: ["k14e5"], en: "The marten keeps the shears and the shears were on the shelf shut and clean. A clean tool is a tool that was used somewhere else.", zh: "剪子是黄貂的。剪子在架子上合着口、干干净净。干净的家伙是别处用过的家伙。" },
          ],
        },
        {
          id: "k14w2", trust: 3, en: "Mardoc the Pine Marten", zh: "紫貂马多克",
          statements: [
            { id: "k14s3", claim: "k14c3", contra: ["k14e1"], en: "The squirrel runs the beam and takes what she can carry in her fore paws, and four skeins is a body's load, not a paw's.", zh: "松鼠走横梁，前爪抓得住的才拿。四条纱是一副身子的分量，不是一只爪的分量。" },
            { id: "k14s4", lie: true, en: "I was on the roof of the storehouse till the second bell and the loft window was shut at the passing of it.", zh: "二更之前我在库房顶上，路过的时候晾房的窗还是关着的。" },
          ],
        },
        {
          id: "k14w3", trust: 2, en: "Kitthe the Squirrel", zh: "松鼠基茜",
          statements: [
            { id: "k14s5", claim: "k14c2", contra: ["k14e3"], en: "My line on that beam is old and unbroken, and dust that has not been walked in is dust that has not been walked in.", zh: "我梁上那条道又旧又没断。灰上没踩过，就是没踩过。" },
            { id: "k14s6", claim: "k14c1", en: "Whoever went in at that window went in hook-first and came out the same way, and he took only what was cut and not what was pulled.", zh: "从那儿进去的，是先挂住钩子进去，再原样出来。他拿走的都是割下来的，一件不是扯下来的。" },
          ],
        },
      ],
      presses: [
        { id: "k14p1", witness: "k14w2", with: "k14e1", contra: ["k14s4"], claim: "k14c1", cost: 1, en: "You were on the storehouse roof till second bell and you swear the window was shut at the passing, which is a thing seen from a sill and not from a roof.", zh: "你说二更前在库房顶上，路过时窗还关着。这是趴在窗台上才看得出的事，在房顶上看不出来。" },
        { id: "k14p2", witness: "k14w1", with: "k14e2", contra: ["k14s1"], claim: "k14c1", cost: 1, en: "You have taught this bench what a one-cut slant costs in feet, and you were the one bird here seen on that sill all season.", zh: "你教过法庭一刀斜口要搭进去几只脚。这一庭上这一季在窗台出现过的鸟，只有你。" },
        { id: "k14p3", witness: "k14w3", with: "k14e5", contra: ["k14s2"], claim: "k14c4", cost: 2, en: "You say a clean tool was used elsewhere. Name the elsewhere, and name the wool that is not in it.", zh: "你说干净的家伙是在别处用过的。那就把那个别处说出来，再把不在别处的毛说出来。" },
      ],
      vouches: [
        { id: "k14v1", witness: "k14w3", exhibit: "k14e4", claim: "k14c1", en: "A cache of four knots buried that same night is a tally kept by the digger, and the bench will weigh a hole against a hedge.", zh: "当夜埋下的四团线，是挖坑的人自己记的账。法庭宁可拿一个洞去比一句搪塞。" },
        { id: "k14v2", witness: "k14w1", exhibit: "k14e3", claim: "k14c1", en: "The broken line of dust goes to the beam and stops, which is exactly where the one who watched it said he would never be walked.", zh: "断掉的那道灰走到横梁就停。而那位盯着看过的证人，说的正是自己绝不会被踩到的地方。" },
      ],
      claims: [
        { id: "k14c1", accused: "jay", statements: ["k14s1", "k14s6"], exhibits: ["k14e1", "k14e2", "k14e4"], en: "Jesup held the latch with a hooked foot and cut four skeins for his own nest", zh: "杰瑟普用带钩的脚支住闩，割下四条纱给自己垒巢" },
        { id: "k14c2", accused: "marten", statements: ["k14s2", "k14s5"], exhibits: ["k14e2", "k14e5"], en: "Mardoc cut from the sill with his own shears and laid the cut where a bird would be found", zh: "马多克用自己的剪子在窗台上割，把割口放在一只鸟会被找到的地方" },
        { id: "k14c3", accused: "squirrel", statements: ["k14s3"], exhibits: ["k14e3", "k14e1"], en: "Kitthe came along the beam and lifted the four skeins whole", zh: "基茜顺着梁过来，把四条纱整个搬走" },
        { id: "k14c4", accused: "crow", statements: ["k14s4"], exhibits: ["k14e2", "k14e4"], en: "Corvin watched the loft from the roof and kept the four skeins for his own cache", zh: "科尔文在房顶上看着晾房，那四条纱是他自己藏的" },
      ],
    },
    {
      id: "k15", labelKey: "ctaCase15", time: 13, culprit: "otter",
      bar: { strength: 14, trust: 4 },
      charge: {
        en: "The salmon weir's paddle was found stacked open and the night's catch was gone out of the box. This docket has no spare action in it and the bench will not lower its bar for the sake of your time: what you spend you cannot borrow back.",
        zh: "拦鱼坝的挡板被发现支开了，一夜的鱼空了箱子。这本案卷里没有一次多余的动作，而法庭不会为了你的工夫把标准放低：花掉的动作，借不回来。",
      },
      suspects: [
        { id: "otter", en: "Nessa the Otter", zh: "水獭妮莎" },
        { id: "ram", en: "Grieve the Ram", zh: "公羊格里夫" },
        { id: "otterhound", en: "Kip the Otter-Hound", zh: "水猎犬基普" },
      ],
      exhibits: [
        { id: "k15e1", weight: 3, en: "The paddle stacked open with a withy through the hasp, and the withy bitten through at one end by small teeth.", zh: "挡板被支住，门销里插了一根柳条，柳条一头被小牙咬断。" },
        { id: "k15e2", weight: 2, en: "The fish box, its lid lifted straight off and set back on the same way, and one salmon left under it scaled at the belly.", zh: "鱼箱的盖整个抬起又整个放回，同一种放法。盖下剩一条鲑鱼，肚子上掉了鳞。" },
        { id: "k15e3", weight: 2, en: "A slide from the water to the box, wet at the top and dry at the bottom, which is the track of something going up with a load.", zh: "一道从水面到箱子的滑道，上头湿、下头干。那是驮着东西往上去的走法。" },
        { id: "k15e4", weight: 1, en: "Kip's own collar found at the weir head with a notch in the leather, and the notch not made by a fish.", zh: "坝头上找到水猎犬自己的项圈，皮上豁了一个口，豁口不是鱼弄的。" },
        { id: "k15e5", weight: 3, en: "The weir-man's tally board: the box was locked at first bell and the key was on the nail until dawn.", zh: "管坝人的记账板：一更时鱼箱是锁的，钥匙在钉子上挂到天亮。" },
      ],
      witnesses: [
        {
          id: "k15w1", trust: 5, en: "Nessa the Otter", zh: "水獭妮莎",
          statements: [
            { id: "k15s1", claim: "k15c1", en: "A paddle stacked with a withy needs two feet and a mouth. I have the mouth and the fore paws, and the withy bitten at one end is the mouth's part of the work.", zh: "用柳条支起挡板，需要两只脚加一张嘴。嘴和前爪我都有，而柳条被咬断的一头，正是那张嘴干的活。" },
            { id: "k15s2", claim: "k15c2", contra: ["k15e4"], en: "The dog went the length of the water all night and his collar came off in the slide, which is the one place a collar comes off.", zh: "狗整夜沿水边走，项圈正是在滑道上掉的。项圈会掉，就只在那一处会掉。" },
          ],
        },
        {
          id: "k15w2", trust: 4, en: "Kip the Otter-Hound", zh: "水猎犬基普",
          statements: [
            { id: "k15s3", claim: "k15c3", en: "I put my nose to that box and there was no fish on the wood, only water, and a dog who found water on a box has been where the water came from.", zh: "我在箱子上闻过，木头上没有鱼味，只有水。箱子上有水，就等于它到过水上。" },
            { id: "k15s4", claim: "k15c1", en: "Whoever lifted that lid lifted it square and laid it square back. Nothing with claws lays a lid square, and nothing worried by a dog lays it at all.", zh: "抬那个盖的东西抬得正、放得也正。有爪的放不正，被狗撵的压根放不了。" },
          ],
        },
        {
          id: "k15w3", trust: 2, en: "Grieve the Ram", zh: "公羊格里夫",
          statements: [
            { id: "k15s5", lie: true, en: "I stood on the weir head from dusk to the locked hour and I saw nobody come out of the water.", zh: "从天黑到落锁我一直站在坝头，没看见一样东西从水里出来。" },
            { id: "k15s6", claim: "k15c2", en: "The notch in that leather is a withy's notch, and an animal who was never at the paddle cannot know how a withy bites.", zh: "皮上的豁口是柳条豁的。从没碰过挡板的畜，不知道柳条是怎么咬住东西的。" },
          ],
        },
      ],
      presses: [
        { id: "k15p1", witness: "k15w3", with: "k15e1", contra: ["k15s5"], claim: "k15c1", cost: 1, en: "You stood on the weir head till the locking and you never once saw a slide made wet going up.", zh: "你在坝头站到落锁，可滑道往上那一段是湿的，你一次都没看见。" },
        { id: "k15p2", witness: "k15w1", with: "k15e3", contra: ["k15s2"], claim: "k15c1", cost: 1, en: "The slide is wet at the top and dry at the bottom, which is a road going out of the water with a load, not a road of a collar falling.", zh: "滑道上头湿、下头干，那是一条驮着东西出水的路，不是一条项圈掉落的路。" },
        { id: "k15p3", witness: "k15w2", with: "k15e5", contra: ["k15s3"], claim: "k15c2", cost: 1, en: "The box was locked at first bell and the key was on its nail, so whatever you put your nose to, it was not the night's fish.", zh: "鱼箱一更就锁了，钥匙在钉子上。所以你凑上去闻的那只箱子，跟一夜的鱼没有关系。" },
        { id: "k15p4", witness: "k15w2", with: "k15e2", contra: ["k15s4"], claim: "k15c3", cost: 2, en: "You say a worried animal lays no lid. You also say you found water on the wood, which you could not know standing off it.", zh: "你说被撵的动物不会放盖。可你又说木头上有水——离得远远的，你没法知道这件事。" },
      ],
      vouches: [
        { id: "k15v1", witness: "k15w2", exhibit: "k15e5", claim: "k15c1", en: "A dog who came back off a locked box with nothing in his mouth is a dog read as honest by the lock, not by himself.", zh: "一只对着锁着的箱子回来、嘴里空空的狗，他的老实是锁说的，不是他自己说的。" },
        { id: "k15v2", witness: "k15w3", exhibit: "k15e4", claim: "k15c2", en: "A collar with a withy notch in it is a body held where the withy was worked, and the bench reads a strap before a story.", zh: "项圈上豁着柳条的口，那就是身子被柳条拴住的地方。法庭先读一条皮带，再读一段话。" },
        { id: "k15v3", witness: "k15w1", exhibit: "k15e1", claim: "k15c3", en: "The bitten withy and the dog's notch are the same bite, and the one mouth here that was proved at that paddle has told on itself.", zh: "被咬断的柳条和项圈上的豁口是同一个口。在这儿被证明碰过挡板的那张嘴，把自己说了出来。" },
      ],
      claims: [
        { id: "k15c1", accused: "otter", statements: ["k15s1", "k15s2", "k15s4"], exhibits: ["k15e1", "k15e3", "k15e5"], en: "Nessa stacked the paddle with a withy and slid the night's catch up the bank", zh: "妮莎用柳条支起挡板，把一夜的鱼从滑道上拖上岸" },
        { id: "k15c2", accused: "ram", statements: ["k15s6", "k15s5"], exhibits: ["k15e2", "k15e4"], en: "Grieve went down the slide himself, took the box and told the standing he had kept", zh: "格里夫自己下了滑道，搬了箱子，还说他就站在坝上" },
        { id: "k15c3", accused: "otterhound", statements: ["k15s3"], exhibits: ["k15e2", "k15e4"], en: "Kip broke his own collar on the hasp and lifted the lid to lay the notch on a fish", zh: "基普的项圈挣在门销上，抬盖是为了把那个豁口推给一条鱼" },
      ],
    },
    {
      id: "k16", labelKey: "ctaCase16", time: 12, culprit: "magpie",
      bar: { strength: 15, trust: 3 },
      charge: {
        en: "The churchwarden's tin box came off the vestry nail with the money in it, and the only mouth on this bench that was in that room that night is the mouth of the accused. Nothing here can be forced: a pressed suspect is a suspect nobody further believes.",
        zh: "教堂管事人的铁皮箱从祭衣室的钉子上下来了，钱还在里头。这一庭上那夜在那个屋子里的唯一一张嘴，就是被告的嘴。这案子里什么也逼不出来：被硬逼的被告，往后谁也不再多信一句。",
      },
      suspects: [
        { id: "magpie", en: "Odric the Magpie", zh: "喜鹊奥德里克" },
        { id: "jackdaw", en: "Ness the Jackdaw", zh: "寒鸦妮丝" },
        { id: "stoat", en: "Cobb the Stoat", zh: "白鼬科布" },
      ],
      exhibits: [
        { id: "k16e1", weight: 3, en: "The vestry nail, bent down and not out, with the box's own hanging-wear still bright on one side.", zh: "祭衣室那根钉子，是往下压弯的，不是往外掰的。箱子上常年挂出来的那面还亮着。" },
        { id: "k16e2", weight: 3, en: "A coin under the form: one silver piece rolled to the seam of the boards, and the seam too tight for a bill.", zh: "长凳底下一枚钱：一块银币滚进板缝里，那道缝窄得嘴叼不住。" },
        { id: "k16e3", weight: 2, en: "The box lid found in the yard, its hasp worked from the wrong side, which is the side of a body standing on the box.", zh: "箱盖在院里找到，门销是从反的那一头拨开的——那是站在箱子上才够得着的一头。" },
        { id: "k16e4", weight: 2, en: "Silver filings on the sill stone, and a magpie takes bright metal and leaves its dust where it worked.", zh: "窗台石上有银屑。喜鹊拿走发亮的金属，做活的地方就留下屑。" },
        { id: "k16e5", weight: 1, en: "Odric's own hoard in the churchyard yew: six buttons, two nails, and no coin at all.", zh: "奥德里克在教堂墓园紫杉里藏的：六颗扣子、两颗钉，一枚钱也没有。" },
      ],
      witnesses: [
        {
          id: "k16w1", trust: 2, en: "Odric the Magpie", zh: "喜鹊奥德里克",
          statements: [
            { id: "k16s1", claim: "k16c1", en: "I will say the room and say the hour, since the room is the one place I am not believed for being. The nail went down, not out, and a bird pulls.", zh: "既然那间屋子正是我去了也没人信的地方，那我就说屋子、说时辰。那钉子是往下塌的，不是往外掰的。鸟只会拽。" },
            { id: "k16s2", claim: "k16c3", contra: ["k16e4"], en: "The silver dust on that sill is a bird's dust, and a bird who worked a hasp leaves dust where he stood and not in the weather.", zh: "窗台上的银屑是鸟的屑。在门销上干过活的鸟，屑留在他站过的地方，不会留在外头受风吹的地方。" },
          ],
        },
        {
          id: "k16w2", trust: 4, en: "Ness the Jackdaw", zh: "寒鸦妮丝",
          statements: [
            { id: "k16s3", claim: "k16c1", en: "I was on the tower loop and I saw the vestry door stand whole and dark till third bell. Nothing left that room by the door, and a thing that leaves no way out went out by the way it came in.", zh: "我在塔眼上看着，祭衣室的门一直到三更都是好好的、黑的。没有什么东西从门出去。没留下出路的东西，就是从进来的那条路出去的。" },
            { id: "k16s4", claim: "k16c2", en: "A hasp worked from the wrong side wants a foot on the lid and a bill at the pin. I have the bill and the lid is a weight I do not stand on.", zh: "从反头拨门销，得一只脚踩盖、一张嘴对销。嘴我有，可盖子那种东西我从不站上去。" },
          ],
        },
        {
          id: "k16w3", trust: 3, en: "Cobb the Stoat", zh: "白鼬科布",
          statements: [
            { id: "k16s5", lie: true, en: "I never once went into that yard, and the lid lying there is a lid any child could put in the wrong place.", zh: "那个院子我一次都没进过。盖扔在那儿，扔错地方这种事随便哪个孩子都干得出来。" },
            { id: "k16s6", claim: "k16c1", en: "The seam under the form is too tight for a bill and too tight for a paw, and a coin in a tight seam went there from a mouth that was shut on it and opened over the boards.", zh: "长凳底下那道缝，嘴叼不住，爪也夹不住。钱进那么窄的缝，是从一张含着它、又在板子上头张开的那张嘴里掉的。" },
          ],
        },
      ],
      presses: [
        { id: "k16p1", witness: "k16w3", with: "k16e3", contra: ["k16s5"], claim: "k16c1", cost: 1, en: "You have never been in that yard, and yet you know the hasp was worked from the wrong side, which a body knows only by standing on the lid.", zh: "你说那个院子你从没进过。可你连门销是从反头拨的都清楚——这种事，只有踩过盖子的人才知道。" },
        { id: "k16p2", witness: "k16w1", with: "k16e2", contra: ["k16s1"], claim: "k16c2", cost: 1, en: "You describe the seam and the coin in it to a bench that never said the coin was found, and you were the only mouth in that room.", zh: "板缝里那枚钱，你说得比法庭还细——而法庭从头到尾没说过这枚钱被找到了。那间屋子里，只有你一张嘴。" },
        { id: "k16p3", witness: "k16w2", with: "k16e1", contra: ["k16s4"], claim: "k16c3", cost: 2, en: "You watched that door whole till third bell and you also tell the bench how a hasp is worked on the inside of it.", zh: "你说那门好好的直到三更。可你也把一门门销从里头怎么拨说得一清二楚。" },
      ],
      vouches: [
        { id: "k16v1", witness: "k16w1", exhibit: "k16e5", claim: "k16c1", en: "A hoard of buttons and nails with no coin in it is a thief who never came off with silver, and this is the one suspect whose own store can be opened.", zh: "囤里全是扣子和钉、一枚钱没有，那就是没带着银子跑过的贼。这庭上只有这位被告的自家窝是打得开的。" },
        { id: "k16v2", witness: "k16w2", exhibit: "k16e1", claim: "k16c1", en: "The nail bent down and the jackdaw's dark whole door are one room read from two ends, and the bench will believe the two ends before the middle.", zh: "往下塌的钉子，和寒鸦看见的那扇一直黑着的门，是一间屋子读出的两头。法庭信两头，不信中间。" },
        { id: "k16v3", witness: "k16w3", exhibit: "k16e4", claim: "k16c1", en: "Silver dust on the sill stone is a place, and the stoat who was not in the yard has given the bench a place he was.", zh: "窗台上的银屑是一处地方。说院子没进过的白鼬，等于给法庭交出他自己在那儿待过的地方。" },
      ],
      claims: [
        { id: "k16c1", accused: "magpie", statements: ["k16s1", "k16s3", "k16s6"], exhibits: ["k16e1", "k16e2", "k16e3", "k16e4"], en: "Odric took the box off the nail in the room he alone was in and let one coin fall at the seam", zh: "奥德里克在他独自待过的屋子里把箱子从钉子上取下来，一枚钱掉在板缝里" },
        { id: "k16c2", accused: "jackdaw", statements: ["k16s2", "k16s4"], exhibits: ["k16e2", "k16e3"], en: "Ness worked the hasp from the wrong side and put the lid in the yard to be found", zh: "妮丝从反头拨开门销，把盖子扔到院里等人来捡" },
        { id: "k16c3", accused: "stoat", statements: ["k16s5"], exhibits: ["k16e1", "k16e4"], en: "Cobb stood on the box in the yard, bent the nail down and rolled the coin under the form", zh: "科布在院里站上箱子，把钉子压弯，把钱滚到长凳底下" },
      ],
    },
    {
      id: "k17", labelKey: "ctaCase17", time: 11, culprit: "mole",
      bar: { strength: 14, trust: 3 },
      charge: {
        en: "The seed drill's copper hopper was taken out of the tool shed and the shed door was never opened. Two of these presses are worth the same two points, and one of them costs the bench a witness it cannot buy back.",
        zh: "播种机的铜斗从工具房里被搬走，工具房的门却一次也没开过。这庭上有两次逼问一样值钱，都值两分。可其中那一次，法庭要赔进去一位再也买不回来的证人。",
      },
      suspects: [
        { id: "mole", en: "Barny the Mole", zh: "鼹鼠巴尼" },
        { id: "vole", en: "Mops the Vole", zh: "田鼠莫普斯" },
        { id: "shrew", en: "Fan the Shrew", zh: "鼩鼱范" },
      ],
      exhibits: [
        { id: "k17e1", weight: 3, en: "The drill's own runway: a hole under the shed wall, pushed from the inside of the shed, with the cut root of a couch grass in the lip of it.", zh: "播种机那条道：工具房墙根底下那个洞是从房里往外推开的，洞沿上带着一截被咬断的匍根草。" },
        { id: "k17e2", weight: 2, en: "The copper hopper in the field, one edge scratched with soil grains and the scratching all on the underside.", zh: "田里那只铜斗，边上叫土粒划出道来，划痕全在底下这一面。" },
        { id: "k17e3", weight: 2, en: "The shed floor: no track across it and one mound of fresh cast at the wall, thrown up toward the drill.", zh: "工具房地上一道印子没有，墙根却有一堆新翻的土，翻的方向正冲着播种机。" },
        { id: "k17e4", weight: 1, en: "Fan's own tunnel, six inches under the shed, and the six inches never broken from the shed side.", zh: "范自己的地道在工具房底下六寸，那六寸从没从工具房这一头破开过。" },
        { id: "k17e5", weight: 3, en: "A pile of couch-grass root ends in the mole's gallery, cut the same day as the root in the hole's lip.", zh: "鼹鼠的洞里一堆匍根草根头，割断的日子和洞沿上那截是同一日。" },
      ],
      witnesses: [
        {
          id: "k17w1", trust: 4, en: "Fan the Shrew", zh: "鼩鼱范",
          statements: [
            { id: "k17s1", claim: "k17c1", en: "I work six inches under that shed and I have never once broken up into it. What broke into the shed broke up from below at the wall, and that is a mole's road and a mole's cast.", zh: "我在那工具房底下六寸做工，从来没往房里破过一层。闯进房的那位是从墙根底下往上破的。那是鼹鼠的路，也是鼹鼠翻的土。" },
            { id: "k17s2", claim: "k17c2", contra: ["k17e5"], en: "There is cut root lying in that hole and cut root is what a vole banks his own gallery with, so the hole was made by a mouth that keeps roots.", zh: "那洞里就有一截断根。断根是田鼠垒自己洞用的东西，所以洞是张爱存根子的嘴挖的。" },
          ],
        },
        {
          id: "k17w2", trust: 3, en: "Mops the Vole", zh: "田鼠莫普斯",
          statements: [
            { id: "k17s3", claim: "k17c1", en: "A copper hopper cannot be dragged over a sill and cannot be flown, and the only animal here that goes under a wall with a load on its back is the one who throws a cast doing it.", zh: "铜斗抬不过门槛，也叼不起来。这儿唯一能在墙底下驮着东西走的，就是那种边走边翻土的东西。" },
            { id: "k17s4", lie: true, en: "I know nothing of that hole and I have not been under the shed since the drill was taken in for the autumn.", zh: "那洞我一无所知。播种机秋里推进房以后，我就没到房底下来过。" },
          ],
        },
        {
          id: "k17w3", trust: 2, en: "Barny the Mole", zh: "鼹鼠巴尼",
          statements: [
            { id: "k17s5", claim: "k17c3", en: "A cast thrown toward the drill is a cast thrown at the thing that was taken, and whoever threw it knew what he was coming for before he broke the root.", zh: "土往播种机那一边翻，就是奔着被搬走的东西翻的。翻土的在咬断草根之前就知道自己要来取什么。" },
            { id: "k17s6", claim: "k17c2", en: "The scratching on that copper is all underneath, which is the way a hopper is carried on a back and not on a bill or in a paw.", zh: "铜斗上的划痕全在底下。那是驮在背上的样子，不是叼在嘴上、也不是抱在爪里的样子。" },
          ],
        },
      ],
      presses: [
        { id: "k17p1", witness: "k17w3", with: "k17e3", contra: ["k17s5"], claim: "k17c1", cost: 1, en: "You describe the direction of that cast for a bench that has not been told the cast was thrown toward anything.", zh: "你说那堆土是朝着什么翻的——而法庭从头到尾还没说过那堆土有个方向。" },
        { id: "k17p2", witness: "k17w1", with: "k17e4", contra: ["k17s1"], claim: "k17c1", cost: 1, en: "You have never broken up into the shed, and yet you have read the hole's lip, the root in it and the way the cast lies.", zh: "你说你从没往房里破过一层。可洞沿、上头的断根、土翻的方向，你一样一样都读出来了。" },
        { id: "k17p3", witness: "k17w2", with: "k17e1", contra: ["k17s4"], exposes: "k17s4", claim: "k17c1", cost: 2, en: "The root cut in that lip is dated by your own heap of cut roots, and a mouth that banks with a root knows the day it was cut.", zh: "洞沿上那截断根，日期就记在你自己那堆断根上。用根子垒洞的嘴，认得它是哪天断的。" },
      ],
      vouches: [
        { id: "k17v1", witness: "k17w2", exhibit: "k17e5", claim: "k17c1", en: "A vole who keeps roots and can name a cut root is a witness about roots, and this bench will hear the trade it can prove.", zh: "田鼠存根子，又认得断根，那就是关于根子的内行。法庭要听一门拿得出货的内行。" },
        { id: "k17v2", witness: "k17w1", exhibit: "k17e2", claim: "k17c1", en: "The shrew who has never once come up into that shed is the only mouth here with a clean claim to the road below it.", zh: "从没往那房里上来过的鼩鼱，是这庭上唯一对底下那条道说得清、又说得干净的一张嘴。" },
      ],
      claims: [
        { id: "k17c1", accused: "mole", statements: ["k17s1", "k17s3"], exhibits: ["k17e1", "k17e2", "k17e3", "k17e4"], en: "Barny broke up under the shed wall and carried the hopper out on his back", zh: "巴尼从墙根底下破上来，把铜斗驮在背上搬走" },
        { id: "k17c2", accused: "vole", statements: ["k17s2", "k17s6"], exhibits: ["k17e1", "k17e5"], en: "Mops made that hole to bank his own gallery and took the copper for the lining of it", zh: "莫普斯为了垒自己的洞挖开那条道，把铜搬回去衬洞" },
        { id: "k17c3", accused: "shrew", statements: ["k17s5"], exhibits: ["k17e3", "k17e4"], en: "Fan went up from six inches under and threw the cast to hide a road he alone could read", zh: "范从底下六寸上来，把土翻出去，好盖住只有他读得懂的那条道" },
      ],
    },
    {
      id: "k18", labelKey: "ctaCase18", time: 12, culprit: "hare",
      bar: { strength: 15, trust: 3 },
      charge: {
        en: "The stack of winter turnips was opened at the foot and forty bushels stood out in the frost. Two animals hold an alibi for each other and both alibis are true, which is the trouble: the only way to reach one of them is to press a witness this case cannot afford to press.",
        zh: "过冬的萝卜垛从底下被掏开，四十桶萝卜冻在外头。有两头牲口互相为对方作证，而那两份证词句句是真——麻烦就在这儿。要够到其中一份，就只能逼问一位这个案子根本逼不起的证人。",
      },
      suspects: [
        { id: "hare", en: "Havick the Hare", zh: "野兔哈维克" },
        { id: "ram", en: "Broun the Ram", zh: "公羊布劳恩" },
        { id: "weasel", en: "Tams the Weasel", zh: "黄鼬塔姆" },
      ],
      exhibits: [
        { id: "k18e1", weight: 3, en: "The foot of the stack, opened in a hollow the width of a sitting body and roofed with clean snow under it.", zh: "垛底下被掏开一个洞，一只坐着的身子那么宽，洞顶上一层雪干干净净。" },
        { id: "k18e2", weight: 3, en: "Forty bushels laid in a row in the frost, every one turned top-heavy, which is a row made by something going back and forth.", zh: "四十桶萝卜在霜里排成一行，每一桶都头重脚轻。来回跑的东西才排得出这样一行。" },
        { id: "k18e3", weight: 2, en: "The run from the stack to the hedge, three feet wide at the middle and pinched at both ends.", zh: "从垛到篱笆的那条跑道，两头窄，当中宽出三尺。" },
        { id: "k18e4", weight: 1, en: "Broun's own wet patch on the barn floor where he lay the whole of the frost night.", zh: "谷仓地上布劳自己趴了一夜的那片潮印，整夜霜天他都在那儿。" },
        { id: "k18e5", weight: 2, en: "Tams's print in the hollow at the stack foot, and the print laid before the snow roof formed.", zh: "垛脚洞里塔姆的印子，而这印子比顶上那层雪早。" },
      ],
      witnesses: [
        {
          id: "k18w1", trust: 3, en: "Broun the Ram", zh: "公羊布劳恩",
          statements: [
            { id: "k18s1", claim: "k18c3", en: "I lay on the barn floor from dusk and Tams lay by the door, and the two of us can name every bell of that night to each other.", zh: "从天黑我就趴在谷仓地上，塔姆趴在门口。那一夜每一声钟，我们两个都能替对方报出来。" },
            { id: "k18s2", claim: "k18c1", en: "A hollow roofed with clean snow was dug from inside the stack and the digger had to come out low and backwards, which is the way a hare leaves a hole he made with his own body.", zh: "顶上盖着净雪的那个洞，是从垛里头掏出来的。挖它的得倒退着低低地爬出来——那正是野兔用自己身子窝出来的洞的走法。" },
          ],
        },
        {
          id: "k18w2", trust: 4, en: "Tams the Weasel", zh: "黄鼬塔姆",
          statements: [
            { id: "k18s3", claim: "k18c2", en: "I know the shape of a body that goes three feet wide in the middle and pinched at both ends, and it is not the shape of anything with a back to bend.", zh: "两头窄、当中三尺宽的那种走法我认得。那不是会弯腰的东西的走法。" },
            { id: "k18s4", claim: "k18c1", en: "The print in that hollow is mine and I say so. I went in at dusk for the warmth and came out before the frost, and the bushels were standing in a row when I went.", zh: "洞里头那个印子是我的，我自己认。我天黑进去取暖，霜下来之前就出来了。我走的时候桶已经排成一行。" },
          ],
        },
        {
          id: "k18w3", trust: 2, en: "Havick the Hare", zh: "野兔哈维克",
          statements: [
            { id: "k18s5", claim: "k18c2", contra: ["k18e3"], en: "A hare goes straight and does not turn a run out wide in the middle. Whatever made that run was carrying something at the turning and putting it down.", zh: "兔子走的道是一条直线，不会在当中鼓出三尺。把道走宽的，是拐那一下正驮着东西、把它放下来的那位。" },
            { id: "k18s6", claim: "k18c1", en: "Turnips top-heavy in a row means the row was laid by a body that came back for the next one, and a back that goes low at the foot of a stack is a body going in on itself.", zh: "萝卜排成头重的一行，说明排它的那位一趟一趟回头取。在垛底下把背压低的，就是把自己塞进洞去的那位。" },
          ],
        },
      ],
      presses: [
        { id: "k18p1", witness: "k18w2", with: "k18e5", contra: ["k18s3"], exposes: "k18s3", claim: "k18c1", cost: 1, en: "You knew the width of that run before the bench was told of it, and your own print sits in the stack foot under a roof of snow you say you did not see laid.", zh: "那条道多宽，法庭还不知道，你先说出来了。你自己那个印子就在垛脚，顶上那层雪你说没看见它是怎么盖上的。" },
        { id: "k18p2", witness: "k18w1", with: "k18e4", contra: ["k18s1"], claim: "k18c2", cost: 1, en: "You lay on that floor and you also name every bell to a witness who was not in the barn, which is a clock kept for somebody.", zh: "你趴在谷仓地上，却把每一声钟都报给一位不在仓里的证人——这台钟是替谁走的。" },
        { id: "k18p3", witness: "k18w2", with: "k18e2", contra: ["k18s4"], claim: "k18c3", cost: 2, en: "You went out before the frost and the bushels were in a row, and forty bushels do not row themselves before anything has carried them.", zh: "你说霜前就出来了，桶那时已经排好。四十桶萝卜不会自己排队，得先有东西把它们一趟趟搬过去。" },
      ],
      vouches: [
        { id: "k18v1", witness: "k18w3", exhibit: "k18e1", claim: "k18c1", en: "A hollow the width of a sitting body is a hole dug by the body that sits in it, and the accused who owns that measure has told the bench the rest.", zh: "一只坐着的身子那么宽的洞，就是坐得进去的那副身子掏的。被告的身材正合这个尺寸，而别的话都是他自己交上来的。" },
        { id: "k18v2", witness: "k18w1", exhibit: "k18e3", claim: "k18c1", en: "The ram's wet patch held him in the barn all night, and a road he watched being pinched at both ends is a road he is given credit for seeing.", zh: "谷仓地上那片潮印把公羊一夜钉在仓里。而他看见的那条两头窄的道，法庭就按他看见的算。" },
        { id: "k18v3", witness: "k18w2", exhibit: "k18e5", claim: "k18c1", en: "A print owned out loud before anyone thought to ask is the one print on this docket nobody has had to argue into the ground.", zh: "没人问就先把自己印子认下来的，这本案卷上只有这一个。这个印子不用人跟到地里去争。" },
      ],
      claims: [
        { id: "k18c1", accused: "hare", statements: ["k18s2", "k18s4", "k18s6"], exhibits: ["k18e1", "k18e2", "k18e3"], en: "Havick hollowed the stack foot from inside and laid the bushels back and forth", zh: "哈维克从垛里头把底下窝空，一趟一趟把萝卜排成一行" },
        { id: "k18c2", accused: "ram", statements: ["k18s1", "k18s3"], exhibits: ["k18e3", "k18e4"], en: "Broun kept the bells and the run both, and the wide middle was made turning for him", zh: "钟声和跑道布劳都攥着，当中那三尺宽是替他拐出来的" },
        { id: "k18c3", accused: "weasel", statements: ["k18s5"], exhibits: ["k18e1", "k18e5"], en: "Tams went in the hollow for the warmth and left the stack to be opened after him", zh: "塔姆钻进洞取暖，出来之后那垛就被人掏开了" },
      ],
    },
    {
      id: "k19", labelKey: "ctaCase19", time: 11, culprit: "lynx",
      bar: { strength: 14, trust: 5 },
      charge: {
        en: "The counting-room candle and the tally board went out together in the dark, and one animal on this bench is believed outright by everybody in the village. That belief is the only coin this case can be paid in, and a bench that has been made to doubt it will not take it back.",
        zh: "账房的蜡烛和计板在黑暗里一块儿没了。庭上这位证人，是全村信到底的那一位。这份信任是这案子唯一付得出的钱币——而一旦让法官起了疑，他们就不打算再收回去。",
      },
      suspects: [
        { id: "lynx", en: "Kessel the Lynx", zh: "猞猁凯塞尔" },
        { id: "cat", en: "Malkin the Cat", zh: "猫马尔金" },
        { id: "marten", en: "Sable the Pine Marten", zh: "紫貂萨贝尔" },
      ],
      exhibits: [
        { id: "k19e1", weight: 3, en: "The tally board on the beam outside, its cord cut with something that sheathed the blade, and no splinter on the sill where it was taken up.", zh: "计板落在外头的梁上，挂它的绳是被带鞘的刃割断的，取走的窗台上一根木刺都没留。" },
        { id: "k19e2", weight: 3, en: "The candle stub in the snow: one guttered side and a pair of tufted ears burned flat at the tips where the flame stood.", zh: "雪里那截蜡头：一面淌焦。一对耳尖带着毛烧秃了，烧的时候正立在火苗旁边。" },
        { id: "k19e3", weight: 2, en: "A print in the gutter outside the counting room, broad at the heel and closed-toed, with the claw marks not showing at all.", zh: "账房外那道水沟里的印子：脚跟宽、趾头并着，一个爪尖都没露。" },
        { id: "k19e4", weight: 2, en: "The sheath of the counting-room knife, found on the sill, and its strap buckled by somebody who had done it before.", zh: "账房那把刀的鞘在窗台上找到，鞘带上的扣，扣它的手法是一扣就成的熟手。" },
        { id: "k19e5", weight: 1, en: "A tuft of lynx ear-fur in the beam's chink, and no fur of any other animal in it.", zh: "梁缝里卡着一撮猞猁耳尖的毛，别家的毛一星没有。" },
      ],
      witnesses: [
        {
          id: "k19w1", trust: 4, en: "Malkin the Cat", zh: "猫马尔金",
          statements: [
            { id: "k19s1", claim: "k19c1", en: "I was in that room at the counting and I heard the cord go: one draw of a blade that was covered, and the flame bent toward a body coming up off the sill.", zh: "数账的时候我就在屋里。我听见那根绳断的声音——是带鞘的刃拉的一下。火苗朝一个从窗台往上来的身子偏过去。" },
            { id: "k19s2", claim: "k19c2", en: "The claw I do not show on a sill, and the claw Kessel does not show either. A cat's print and a lynx's print are the same print at two sizes, and this yard has one animal of the larger size.", zh: "我在窗台上不留爪印，凯塞尔也不留。猫和猞猁的印子是同一个印子的两个尺寸，而这个场院里大尺寸的那只只有一只。" },
          ],
        },
        {
          id: "k19w2", trust: 3, en: "Kessel the Lynx", zh: "猞猁凯塞尔",
          statements: [
            { id: "k19s3", lie: true, en: "I never once put a foot in that gutter, and I have not been past the counting-room since the board was hung.", zh: "那道水沟我一步都没踩过。计板挂上去以后，账房门口我一次都没过。" },
            { id: "k19s4", claim: "k19c3", en: "A covered blade is a tool of the house and not of the field, and the house keeps its knife on a nail that was found empty.", zh: "带鞘的刃是屋里的家伙，不是地里的。屋里那把刀挂在钉子上——那根钉子被人找到时是空的。" },
          ],
        },
        {
          id: "k19w3", trust: 2, en: "Sable the Pine Marten", zh: "紫貂萨贝尔",
          statements: [
            { id: "k19s5", claim: "k19c2", en: "The flame bent off the sill toward the beam, and the beam is the one place in this village a cat would not leave a print and a lynx would.", zh: "火苗从窗台那头朝梁上偏。全村只有那一处，是猫不留印、猞猁才留印的地方。" },
            { id: "k19s6", claim: "k19c3", contra: ["k19e1"], en: "A cord cut with no splinter on the sill was cut by a hand at work above the sill, and a mouth cannot keep a sheath buckled.", zh: "窗台上一根刺都没断的绳，是在窗台以上干活的手割的。一张嘴扣不住一副鞘带。" },
          ],
        },
      ],
      presses: [
        { id: "k19p1", witness: "k19w2", with: "k19e3", contra: ["k19s3"], exposes: "k19s3", claim: "k19c1", cost: 1, en: "There is a broad closed-toed print in that gutter with no claw in it, and the only animal here who keeps his claws sheathed at the heel is the one who denied the gutter.", zh: "水沟里一个脚跟宽、趾头并着、不露爪的印子。这儿脚跟不露爪的那位，恰恰是赖过水沟的那位。" },
        { id: "k19p2", witness: "k19w3", with: "k19e2", contra: ["k19s5"], claim: "k19c1", cost: 1, en: "You saw which way a candle flame bent in a room you were not in, and you knew the beam before anybody told you the board was on it.", zh: "你没在那间屋里，可你看清了蜡火朝哪边偏。没人告诉你计板落在梁上，你先就认得那道梁。" },
        { id: "k19p3", witness: "k19w1", with: "k19e4", contra: ["k19s2"], claim: "k19c2", cost: 1, en: "You tell the bench what a lynx's print is from the inside of his foot, and you were standing at that sill when the cord went.", zh: "你把猞猁的印子讲得像从他自己脚里头看出去的。绳断的时候，你正站在那道窗台边上。" },
      ],
      vouches: [
        { id: "k19v1", witness: "k19w1", exhibit: "k19e5", claim: "k19c1", en: "A witness this village believes without counting is a coin spent once in a lifetime, and the tuft in the beam is the bench's own receipt that she was there.", zh: "全村不数就信的一位证人，一辈子只花得出去一次。梁缝里那撮毛，就是法庭收她的凭据：她确实在那儿。" },
        { id: "k19v2", witness: "k19w1", exhibit: "k19e4", claim: "k19c1", en: "The sheath buckled by a practiced hand and found on the sill under the witness who heard the cut are one sill read twice, once by an ear and once by a hand.", zh: "一副熟手扣上的鞘，在听见割断的那位证人脚底下的窗台上找到。同一道窗台被读了两遍：一遍用耳朵，一遍用手。" },
      ],
      claims: [
        { id: "k19c1", accused: "lynx", statements: ["k19s1", "k19s2"], exhibits: ["k19e1", "k19e2", "k19e3", "k19e4"], en: "Kessel came up off the sill with a covered blade, cut the board's cord and carried it to the beam", zh: "凯塞尔带着一把藏了刃的刀从窗台上来，割断计板的绳，把它架上梁" },
        { id: "k19c2", accused: "cat", statements: ["k19s5"], exhibits: ["k19e3", "k19e5"], en: "Malkin took the board by borrowing a larger print and the flame bent toward her own sill", zh: "马尔金借了一个更大号的印子拿走计板，火苗正朝她那道窗台偏" },
        { id: "k19c3", accused: "marten", statements: ["k19s3", "k19s6"], exhibits: ["k19e1", "k19e4"], en: "Sable cut at the cord from above the sill and set the board on the beam for a footed animal to be blamed for", zh: "萨贝尔从窗台以上割绳，把计板架上梁，好推给一只带爪的畜" },
      ],
    },
    {
      id: "k20", labelKey: "ctaCase20", time: 12, culprit: "wren",
      bar: { strength: 20, trust: 3 },
      charge: {
        en: "The village key-board was emptied of the three storehouse keys and the board's own peg was found pushed in from the far side. Three charges are written on this docket, the clock has no slack in it, and every one of the three witnesses must be believed at the bar while two of them have been pulled down to it.",
        zh: "全村的钥匙板上三把库房钥匙一起没了，板上那根木闩是从外那一头推进去的。这案卷上写着三条指控，钟点一次富余也没有。三位证人都得被信到门槛上，而其中两位是先被压下去、再被抬回门槛的。",
      },
      suspects: [
        { id: "wren", en: "Tib the Wren", zh: "鹪鹩蒂布" },
        { id: "mouse", en: "Pip the Harvest Mouse", zh: "巢鼠皮普" },
        { id: "hound", en: "Kip the Otter-Hound", zh: "水猎犬基普" },
      ],
      exhibits: [
        { id: "k20e1", weight: 3, en: "The board's peg pushed in from the far side, and the wood on that side worn bright in a circle the size of a perched body.", zh: "板上那根木闩是从外那一头推进去的。那一面的木头被磨得发亮，一圈，正是落着一只身子的地方。" },
        { id: "k20e2", weight: 3, en: "Three keys off one board, and the ring they hung on found laid open at the seam, not broken.", zh: "一块板上掉了三把钥匙。挂它们的环是顺着缝被摊开的，不是掰断的。" },
        { id: "k20e3", weight: 3, en: "A thread of board-hangings in the eaves above the board, wound twice, and the knot of it a bird's knot.", zh: "钥匙板上头那道檐口里绞着一根木花丝，绞了两道，结是鸟打的结。" },
        { id: "k20e4", weight: 2, en: "The storehouse door opened with the key and not with a mouth: no scratch on the lock and no bent ward.", zh: "库房门是用钥匙开的，不是用嘴开的。锁上一道划都没有，齿也没歪。" },
        { id: "k20e5", weight: 1, en: "Pip's nest under the board with three husks and no metal in it, and a mouse carries metal if she can carry anything.", zh: "板底下皮普的窝，三片壳，一星金属也没有。皮普要是能搬动东西，是连金属也搬的。" },
        { id: "k20e6", weight: 2, en: "The hound's own print under the board, and the peg-mark of his collar caught in the board's edge.", zh: "板底下基普自己的印子，板边上还挂住他项圈上那根小闩的印子。" },
      ],
      witnesses: [
        {
          id: "k20w1", trust: 3, en: "Pip the Harvest Mouse", zh: "巢鼠皮普",
          statements: [
            { id: "k20s1", claim: "k20c1", en: "The peg went in from the far side, so whoever set it had to stand where the wood is worn, and the wear is a perched body's wear and a bill's reach at once.", zh: "木闩是从外那头推进去的，推它的就得站在那圈磨亮的地方。那磨亮是一只在落住的身子磨的，也是一张够得着的嘴够的。" },
            { id: "k20s2", claim: "k20c2", contra: ["k20e3"], en: "A thread of hangings wound twice over the board is a nest's thread, and a mouse's nest is under the board, not above it.", zh: "板子上一根绞了两道的木花丝，是窝里的丝。而我的窝在板底下，不在板上头。" },
          ],
        },
        {
          id: "k20w2", trust: 2, en: "Kip the Otter-Hound", zh: "水猎犬基普",
          statements: [
            { id: "k20s3", claim: "k20c3", en: "I lay under that board most nights and never once did a key come off it into my mouth. A dog opens a lock with his nose and gets nothing for it, and I was not hungry enough to be silly.", zh: "多数夜里我都趴在那块板底下，可没有一把钥匙从我嘴边下来过。狗开锁靠鼻子，开了什么也落不着。我还没傻到那个饿法。" },
            { id: "k20s4", lie: true, en: "I have not been at the storehouse since the autumn keying, and my print under the board is old and weathered out.", zh: "秋里上钥匙以后我就没到库房来过。板底下那个印子是旧的，早叫天气磨平了。" },
          ],
        },
        {
          id: "k20w3", trust: 5, en: "Tib the Wren", zh: "鹪鹩蒂布",
          statements: [
            { id: "k20s5", claim: "k20c3", en: "A ring laid open at the seam is a ring that was worked, not broken, and only a bill works a seam. I have watched a bill do it and I can put my own in the same shape.", zh: "顺着缝摊开的环，是被人拨开的，不是掰断的。缝只有嘴能拨。我见过嘴这么干，我自己也能把环拨成那个形状。" },
            { id: "k20s6", claim: "k20c1", en: "The wear on the far side of that peg is at the height of a perched bird, and the three keys went off the board in the one hour the eaves above it were empty.", zh: "木闩外那面的磨亮，高正是一只在落住的鸟。三把钥匙下来的那一个钟头，它上头那道檐口是空的。" },
          ],
        },
      ],
      presses: [
        { id: "k20p1", witness: "k20w3", with: "k20e3", contra: ["k20s5"], claim: "k20c1", cost: 1, en: "You can put your own bill in the shape that opened that ring, and you knew the hour the eaves were empty before anybody asked you what you had seen.", zh: "你说你能把嘴摆成拨开那个环的形状。可檐口空着是哪一个钟头，还没人问你看见了什么，你先就说出来了。" },
        { id: "k20p2", witness: "k20w1", with: "k20e1", contra: ["k20s1"], claim: "k20c1", cost: 1, en: "You read the far side of that peg, the wear on it and a bill's reach, from a nest under the board that never once went above it.", zh: "木闩外那面、上头的磨亮、一张嘴能够多远——你全是从板底下那个从没上到板上头去的窝里读出来的。" },
        { id: "k20p3", witness: "k20w2", with: "k20e6", contra: ["k20s4"], exposes: "k20s4", claim: "k20c1", cost: 1, en: "The peg-mark of your collar is in the edge of the board you never stood under in the autumn, and the print you call weathered is sharp at one heel.", zh: "你项圈上小闩的印子挂在板边上——那块板你秋里从没站到过。你叫它磨平了的那个印子，脚跟一头还清清楚楚。" },
      ],
      vouches: [
        { id: "k20v1", witness: "k20w1", exhibit: "k20e5", claim: "k20c1", en: "A nest of husks with no metal in it is a mouth proved off metal by its own hoard, and the bench will believe a hole it can look into.", zh: "窝里只有壳、一星金属没有，那是自己那仓替这张嘴作的保。法庭信一个它看得见底的洞。" },
        { id: "k20v2", witness: "k20w2", exhibit: "k20e4", claim: "k20c1", en: "The lock was opened without a scratch, which is a key's work, and the one animal here with a nose for a keyhole has told the bench he was not hungry enough to be silly.", zh: "锁开得一道划痕没有，那是钥匙的活。这儿唯一闻得出锁眼的这位，自己说了他还没饿到发傻。" },
        { id: "k20v3", witness: "k20w3", exhibit: "k20e3", claim: "k20c1", en: "A thread wound twice in the eaves with a bird's knot in it is a road marked by the feet that marked it, and the eaves above that board are the only post this charge has ever had.", zh: "檐口里绞了两道、打了个鸟结的丝，是踩它的那双脚留下的路。这块板上头那道檐口，是这条指控从头到尾仅有的一处落脚点。" },
      ],
      claims: [
        { id: "k20c1", accused: "wren", statements: ["k20s1", "k20s6"], exhibits: ["k20e1", "k20e2", "k20e3", "k20e4"], en: "Tib came down to the far side of the board, opened the ring at the seam and took the three keys for the storehouse door", zh: "蒂布落到板子外那一头，顺着缝摊开环，取下三把钥匙去开库房" },
        { id: "k20c2", accused: "mouse", statements: ["k20s2", "k20s5"], exhibits: ["k20e1", "k20e5"], en: "Pip went up from her nest to the board and wound the thread to hold the peg in from the far side", zh: "皮普从窝上到板上，把丝绞住，从外那头把闩顶进去" },
        { id: "k20c3", accused: "hound", statements: ["k20s3", "k20s4"], exhibits: ["k20e2", "k20e6"], en: "Kip laid the ring open with his teeth and let the three keys fall where a bird would be named", zh: "基普用牙把环摊开，让三把钥匙落在一只鸟会被点名的地方" },
      ],
    },
    /* k21 teaches what a deep press costs. The seal is the one witness who can
     * read the tap, and the bench believes him outright. The court must press
     * him twice - the first press takes two actions to reconstruct what he
     * heard - and then mend the trust it spent with exactly one corroboration.
     * At one action the press would leave his word standing on its own and the
     * corroboration would buy nothing; at two it is the whole verdict. */
    {
      id: "k21", labelKey: "ctaCase21", time: 12, culprit: "crab",
      bar: { strength: 21, trust: 3 },
      charge: {
        en: "The tide-mill's lamp ran dry between the bells and the oil drum under it was found open at dawn. One charge here rests on a witness the bench believes outright, and every question put to him must be mended before the court will close on his word.",
        zh: "潮磨的灯在两次钟声之间灭了，灯下的油桶天亮时敞着。这里有一条指控，全压在一个法庭原本全然相信的证人身上；问他的每一句话，都得先补回来，法庭才肯凭他的话结案。",
      },
      suspects: [
        { id: "crab", en: "Crabble the Crab", zh: "蟹克拉布" },
        { id: "gull", en: "Wick the Gull", zh: "海鸥威克" },
        { id: "otter", en: "Fen the Otter", zh: "水獭芬" },
      ],
      exhibits: [
        { id: "k21e1", weight: 3, en: "The brass tap on the oil drum stands a quarter-turn open, its handle worn bright underneath where a claw closed and turned it against the spring.", zh: "油桶上的铜龙头开着四分之一圈，把手下头磨得发亮——那是有爪子扣住、逆着弹簧拧过的地方。" },
        { id: "k21e2", weight: 3, en: "A crab's walking-scrape crosses the wet sand at the drum's foot: five points and a drag, deepest on the seaward side where the body leaned back against a pull.", zh: "油桶脚下的湿沙上横着一道蟹的爬痕：五个点，后面拖着一条，靠海那一面最深——那是身子拽着东西往后仰压出来的。" },
        { id: "k21e3", weight: 3, en: "A line of lamp oil runs down the ebb rocks and stops at a crab's reach above the waterline. Above that line the rock is dry.", zh: "一道灯油顺着退潮的石头往下淌，停在离水线一只蟹够得到的地方。那道线以上，石头是干的。" },
        { id: "k21e4", weight: 2, en: "A gull's feather on the mill rail, dry to the vane, with no oil in it.", zh: "磨坊栏杆上一根海鸥羽毛，连羽片都是干的，一星油也没沾。" },
      ],
      witnesses: [
        {
          id: "k21w1", trust: 4, en: "Wick the Gull", zh: "海鸥威克",
          statements: [
            { id: "k21s1", claim: "k21c1", en: "The tap was whole at dusk and whole again when I left the rail at the first bell. Whatever turned it did it after the mill went dark.", zh: "天黑时龙头还是好的；一更我离了栏杆，它还是好的。拧它的那位，是在磨坊黑透以后才动的手。" },
            { id: "k21s2", claim: "k21c1", en: "A feather on a dry rail is a bird that stayed on the rail. The wind off the ebb would have wet it through if I had gone down to the drum.", zh: "干栏杆上的羽毛，是留在栏杆上的鸟。要是我下到油桶那儿，退潮的风早把它打透了。" },
          ],
        },
        {
          id: "k21w2", trust: 5, en: "Marrow the Seal", zh: "海豹马罗",
          statements: [
            { id: "k21s3", claim: "k21c1", en: "I keep the ebb channel. The tap did not sound like a tap: it sounded like a shell being turned over, slow, a quarter at a time, and it stopped when the light went out.", zh: "我守退潮水道。那龙头响得不像龙头，倒像有人把一只壳慢慢翻过来，一次四分之一圈；灯灭的时候，它停了。" },
            { id: "k21s4", claim: "k21c1", en: "I came up the ramp at the third bell and the drum was open. There was a scrape in the sand and it was not a flipper's scrape; a flipper leaves one line and no points.", zh: "三更我上了坡道，油桶已经开着。沙上有一道刮痕，不是鳍刮的；鳍只留一条线，不留点。" },
          ],
        },
        {
          id: "k21w3", trust: 3, en: "Crabble the Crab", zh: "蟹克拉布",
          statements: [
            { id: "k21s5", claim: "k21c1", en: "I was under the drum at the third bell, and the sand there is mine. A crab goes where the water leaves food, and the drum leaks a little; that is all I went for.", zh: "三更我在油桶底下，那儿的沙是我的。水把吃食留在哪儿，蟹就往哪儿去；油桶有点漏，我下去就为这个。" },
            { id: "k21s6", claim: "k21c1", en: "Oil on a rock is a thing a crab will walk around, not through. My feet were dry when I went down to the water, and dry when I came up.", zh: "石头上的油，蟹是绕着走的，不会踩过去。我下水时脚是干的，上来时也是干的。" },
          ],
        },
      ],
      presses: [
        { id: "k21p1", witness: "k21w2", with: "k21e1", claim: "k21c1", cost: 2, en: "You heard the tap turn a quarter at a time and stop. Here is the tap, a quarter open, and a tap does not stop itself. Say how you knew it stopped, and say what stopped it, or say you did not.", zh: "你听见龙头一次转四分之一圈，然后停了。龙头就在这儿，开着四分之一圈；龙头不会自己停。说清楚你怎么知道它停了，是什么让它停的；说不清，就说你不知道。" },
        { id: "k21p2", witness: "k21w2", with: "k21e2", claim: "k21c1", cost: 1, en: "You say a flipper leaves one line and no points. There are five points in the sand at the drum's foot and a drag behind them. Put your flipper beside that print and let the court see which of you made it.", zh: "你说鳍只留一条线、不留点。油桶脚下的沙里有五个点，后面拖着一条。把你的鳍搁到那个印子旁边，让法庭看看是谁留下的。" },
        { id: "k21p3", witness: "k21w1", with: "k21e4", claim: "k21c2", cost: 1, en: "You sat the rail from dusk to the first bell and saw a light go out and a drum stand open, and you said nothing until the court asked. A bird that watches and does not cry out has a reason for watching.", zh: "你从天黑坐到一更，看见灯灭了、油桶敞着，却直到法庭问起才开口。看着而不叫的鸟，自有它看的道理。" },
      ],
      vouches: [
        { id: "k21v1", witness: "k21w2", exhibit: "k21e3", claim: "k21c1", en: "The oil stops at a crab's reach and the rock above it is dry. The seal's word is worth what the line is worth, and the line says a small body stood at the drum and drank.", zh: "油停在蟹够得到的高度，上面的石头是干的。海豹的话值多少，就看这道线值多少；而这道线说：有个小身子站在桶边喝过。" },
        { id: "k21v2", witness: "k21w1", exhibit: "k21e4", claim: "k21c2", en: "A dry feather is a bird that stayed dry. The gull's rail is the one place the oil never reached, and the court will believe a bird about the rail it sat on.", zh: "干羽毛，是没沾湿的鸟。海鸥那条栏杆，是油唯一没到过的地方；鸟讲自己坐过的栏杆，法庭是信的。" },
      ],
      claims: [
        { id: "k21c1", accused: "crab", statements: ["k21s1", "k21s2", "k21s3", "k21s4", "k21s5", "k21s6"], exhibits: ["k21e1", "k21e2", "k21e3", "k21e4"], en: "Crabble came up the ebb rocks, turned the drum's tap a quarter with one claw and drank until the lamp went out", zh: "克拉布顺着退潮的石头上来，用一只爪把龙头拧开四分之一圈，一直喝到灯灭" },
        { id: "k21c2", accused: "gull", statements: ["k21s1", "k21s2"], exhibits: ["k21e4"], en: "Wick left the rail, came down to the drum and drank the oil before the light failed", zh: "威克离开栏杆，下到油桶边，在灯灭之前把油喝了" },
        { id: "k21c3", accused: "otter", statements: ["k21s3", "k21s5"], exhibits: ["k21e2"], en: "Fen slipped up the ramp, opened the tap and carried the oil away in his mouth", zh: "芬溜上坡道，拧开龙头，用嘴把油叼走了" },
      ],
    },
    /* k22 teaches the cost of a word the charge never uses. The pit-proof names
     * six statements, but reaching the toad's second word means hearing her
     * first one too, so the honest line spends seven actions on testimony and
     * exactly fills the clock. There is one true charge and one line; every
     * press and every corroboration in it is load-bearing. */
    {
      id: "k22", labelKey: "ctaCase22", time: 12, culprit: "marmot",
      bar: { strength: 22, trust: 4 },
      charge: {
        en: "The seed pit under the flat stone was opened from below and the pine-nuts carried off. Three animals speak to it, and the charge names six of their words. The court will make it hear one more.",
        zh: "平石底下的种子窖被人从下面掏开，松子全搬走了。三只动物为此开口，而指控只引了它们六句话。法庭会让它多听一句。",
      },
      suspects: [
        { id: "marmot", en: "Thistle the Marmot", zh: "旱獭蓟" },
        { id: "toad", en: "Barrow the Toad", zh: "蟾蜍巴罗" },
        { id: "adder", en: "Siss the Adder", zh: "蝰蛇西斯" },
      ],
      exhibits: [
        { id: "k22e1", weight: 3, en: "A tunnel scratched up into the seed pit from the burrow side, wide as a marmot's shoulders and clawed in pairs.", zh: "一条从窝那头往上掏进种子窖的地道，宽窄正好是一只旱獭的肩，爪痕成对。" },
        { id: "k22e2", weight: 3, en: "Pine-nut husks in a line up the marmot's run, fresh and unweathered, and a split husk still wet at the seam.", zh: "松子壳沿着旱獭的跑道排成一线，新鲜，没经过风雨；有一片裂壳的缝里还湿着。" },
        { id: "k22e3", weight: 3, en: "The pit's flat stone is propped on a wedge of marmot-chewed root, and the tooth-marks on the wedge match the marks on the pit's lip.", zh: "窖上的平石被一块旱獭啃过的树根楔住，楔子上的牙印和窖口的牙印对得上。" },
        { id: "k22e4", weight: 1, en: "A toad's footprint by the pit mouth, old, pressed into mud that dried before the seed went.", zh: "窖口一个蟾蜍脚印，旧了，踩进泥里；那泥在种子丢失之前就干透了。" },
        { id: "k22e5", weight: 1, en: "An adder's cast skin on the warm side of the stone, whole and empty.", zh: "石头向阳那面一张蛇蜕，完整，空着。" },
      ],
      witnesses: [
        {
          id: "k22w1", trust: 5, en: "Barrow the Toad", zh: "蟾蜍巴罗",
          statements: [
            { id: "k22s1", claim: "k22c1", en: "I keep the low bank and I hear the pit. The stone was lifted once in the night and set down once, and between the two there was no sound of a bird or a hoof.", zh: "我守低岸，听得见种子窖。夜里石头被抬起一回、又放下一回，中间没有鸟声，也没有蹄声。" },
            { id: "k22s2", claim: "k22c1", en: "The pit was full at dusk. At dawn the stone was propped and the pit was empty, and nothing had gone in or out over the top of the stone.", zh: "天黑时窖是满的。天亮时石头被支起来，窖空了；可没有东西从石头上头进去或出来。" },
            { id: "k22s3", claim: "k22c2", en: "A toad's print by the mouth is old mud. I was not at the mouth that night; I was on the bank, and the bank is where I sing.", zh: "窖口那个蟾蜍印是陈泥。那夜我不在窖口，我在岸上；岸上才是我唱歌的地方。" },
          ],
        },
        {
          id: "k22w2", trust: 4, en: "Thistle the Marmot", zh: "旱獭蓟",
          statements: [
            { id: "k22s4", claim: "k22c1", en: "I dug my run before the frost and it comes up under the flat stone. A marmot's run is a marmot's road; that does not make everything carried on it mine.", zh: "上冻之前我就挖好了这条跑道，它从平石底下出头。旱獭的跑道是旱獭的路；路上搬过的东西，不能都算我的。" },
            { id: "k22s5", claim: "k22c1", en: "The husks on my run are husks I spat there at supper. I have eaten pine-nuts all winter, and the court may count the shells and welcome.", zh: "我跑道上的壳，是我吃晚饭时吐在那儿的。我一冬都在吃松子，法庭要数壳，尽管数。" },
            { id: "k22s6", claim: "k22c1", en: "I slept from the second bell to light and never left my nest. Ask the adder; she keeps the warm side and she would have seen me go.", zh: "二更到天亮我都在睡，没离过窝。问蝰蛇去；她守着向阳那面，我要是出去，她看得见。" },
          ],
        },
        {
          id: "k22w3", trust: 5, en: "Siss the Adder", zh: "蝰蛇西斯",
          statements: [
            { id: "k22s7", claim: "k22c1", en: "I keep the warm side of the stone and I do not blink. The stone went up once, and what came out from under it came out low and heavy and went down the marmot's run.", zh: "我守石头向阳那面，眼都不眨。石头抬起过一回，从底下出来的东西又低又沉，顺着旱獭的跑道下去了。" },
            { id: "k22s8", claim: "k22c1", en: "A marmot carries nuts in its cheek-pouches, not in its arms. The line of husks runs up the run from the pit, not down it; that is a loaded animal going home.", zh: "旱獭用腮袋装松子，不用胳膊。那道壳线是从窖口往跑道上去的，不是下来的；那是一只装着东西回家的畜生。" },
            { id: "k22s9", claim: "k22c1", en: "The pit was opened from below. A stone lifted from above leaves the lip clean; this lip is clawed from underneath, and the claws are a marmot's.", zh: "窖是从下面掏开的。从上面抬石头，窖口是干净的；这个窖口是从底下抓开的，爪印是旱獭的。" },
          ],
        },
      ],
      presses: [
        { id: "k22p1", witness: "k22w1", with: "k22e1", claim: "k22c1", cost: 2, en: "You heard the stone lift and set down, and you told the court only what it was not: no bird, no hoof. You lay on the bank with your ear to the ground. What did you hear under the stone?", zh: "你听见石头被抬起又放下，却只告诉法庭它不是什么：不是鸟，不是蹄。你趴在岸上，耳朵贴着地。石头底下，你到底听见了什么？" },
        { id: "k22p2", witness: "k22w2", with: "k22e2", claim: "k22c1", cost: 1, en: "You say the husks on your run are your own supper. Then count them. There are husks in that line enough for a winter, and the last of them is three paces short of your nest. A supper does not walk home ahead of the animal that ate it.", zh: "你说跑道上的壳是你自己的晚饭。那就数一数。那条线上的壳够吃一冬，最后一片离你的窝还有三步远。晚饭不会走在吃它的畜生前头回家。" },
        { id: "k22p3", witness: "k22w3", with: "k22e3", claim: "k22c1", cost: 1, en: "You say the stone was propped on a wedge of root. A wedge is cut and set; the stone did not fall open. Tell the court who was under the stone when the prop went in, and why you did not blink then.", zh: "你说石头是被一块树根楔住的。楔子是砍出来、垫进去的；石头不会自己摔开。告诉法庭，楔子垫进去的时候谁在石头底下，你那时为什么不眨眼。" },
      ],
      vouches: [
        { id: "k22v1", witness: "k22w1", exhibit: "k22e1", claim: "k22c1", en: "The toad's ear is the court's ear under the stone. She heard the lift and the set-down, and the tunnel in the pit was dug before the stone ever moved.", zh: "蟾蜍的耳朵，就是法庭在石头底下的耳朵。她听见了抬起和放下；而窖里那条地道，在石头动之前就挖好了。" },
        { id: "k22v2", witness: "k22w2", exhibit: "k22e2", claim: "k22c1", en: "The husks on the marmot's run are fresh and wet at the seam. A marmot may lie about a nest, but a husk does not lie about a supper.", zh: "旱獭跑道上的壳是新鲜的，裂缝里还湿。旱獭可以就自己的窝撒谎，可一片壳不会就一顿晚饭撒谎。" },
      ],
      claims: [
        { id: "k22c1", accused: "marmot", statements: ["k22s2", "k22s4", "k22s5", "k22s7", "k22s8", "k22s9"], exhibits: ["k22e1", "k22e2", "k22e3"], en: "Thistle dug up into the pit from below, carried the pine-nuts down the run in her cheeks and left the husks along her own road", zh: "蓟从下面掏进种子窖，用腮袋把松子顺跑道搬走，把壳一路留在自己的路上" },
        { id: "k22c2", accused: "toad", statements: ["k22s1", "k22s2"], exhibits: ["k22e4"], en: "Barrow came up from the bank, lifted the stone and took the seeds while the pit stood open", zh: "巴罗从岸上过来，抬起石头，趁窖敞着把种子拿了" },
        { id: "k22c3", accused: "adder", statements: ["k22s8", "k22s9"], exhibits: ["k22e5"], en: "Siss slipped under the stone, ate the seeds where they lay and left her skin for the court", zh: "西斯从石头底下溜进去，就地把种子吃了，把蛇蜕留给法庭" },
      ],
    },
    /* k23 teaches that an outright-believed witness is a debt. All three stand
     * at five, the bench's ceiling, so every press must be answered by one
     * corroboration to bring its witness back to five. The bar is five, so a
     * single unpressed or unmended witness loses the case; the court may not
     * offer the corroboration until the press has happened, and that order is
     * the whole mechanic. */
    {
      id: "k23", labelKey: "ctaCase23", time: 12, culprit: "lobster",
      bar: { strength: 23, trust: 5 },
      charge: {
        en: "The smokehouse door stood open at dawn and the night's fish were gone from the rack. The bench believes all three witnesses outright. Here every question the court asks must be paid for twice: once in the asking, and once in the mending.",
        zh: "熏鱼房的门天亮时敞着，一夜的鱼全从架上没了。三位证人，法庭原本个个全信。这里每问一句话都要付两回账：一回是问，一回是补。",
      },
      suspects: [
        { id: "lobster", en: "Grip the Lobster", zh: "龙虾格里普" },
        { id: "ray", en: "Skate the Ray", zh: "鳐鱼斯凯特" },
        { id: "eel", en: "Sleeve the Eel", zh: "鳗鱼斯利夫" },
      ],
      exhibits: [
        { id: "k23e1", weight: 3, en: "The smokehouse door-spring was sprung from inside: the hook is straightened, not broken, and the mark of a hard shell is pressed into the wood beside it.", zh: "熏鱼房的门簧是从里头弹开的：挂钩被拉直了，没有断，旁边木头上压着一个硬壳印。" },
        { id: "k23e2", weight: 3, en: "A wet track crosses the smokehouse floor from the rack to the drain: a broad tail-fan drag with two claw-hooks at the front, and it goes out by the water.", zh: "一道湿痕从架子横过熏鱼房的地面，通到排水口：前面宽宽的尾扇拖痕，带两个爪钩，最后从水里出去了。" },
        { id: "k23e3", weight: 3, en: "A lobster's antenna-case, whole and glossy, caught under the rack where nothing else reaches.", zh: "架子底下卡着一只龙虾的触角壳，完整，发亮，别的东西够不到那儿。" },
      ],
      witnesses: [
        {
          id: "k23w1", trust: 5, en: "Skate the Ray", zh: "鳐鱼斯凯特",
          statements: [
            { id: "k23s1", claim: "k23c1", en: "I lie over the drain and I feel every foot that crosses that floor. Something crossed at the third bell, heavy at the front and light behind, and it did not come back over the floor.", zh: "我伏在排水口上，地板上有谁的脚走过，我都觉得出。三更有什么东西走了过去，前头沉、后头轻，后来没再从地板上回去。" },
            { id: "k23s2", claim: "k23c1", en: "The door-spring sang once. A door pushed from outside sings twice, coming and going; this sang once, and the drain pulled after it.", zh: "门簧只响了一声。从外头推的门要响两声，来一声去一声；这个只响了一声，随后排水口那边一抽。" },
          ],
        },
        {
          id: "k23w2", trust: 5, en: "Grip the Lobster", zh: "龙虾格里普",
          statements: [
            { id: "k23s3", claim: "k23c1", en: "I was under the rack at the second bell. The rack is where the salt drips, and salt is good for a shell; that is why I was there and no other reason.", zh: "二更我在架子底下。架子上往下滴盐卤，盐卤对壳好；我就在那儿，不为别的。" },
            { id: "k23s4", claim: "k23c1", en: "A lobster walks the drain, and a lobster's track is a tail-drag with hooks. The court may look at the floor and see every crawler has written its name there.", zh: "龙虾走排水口，龙虾的痕迹是尾扇一拖、带两个钩。法庭尽管看地板，这儿每个爬过去的都把名字写在地上了。" },
          ],
        },
        {
          id: "k23w3", trust: 5, en: "Sleeve the Eel", zh: "鳗鱼斯利夫",
          statements: [
            { id: "k23s5", claim: "k23c1", en: "I keep the drain mouth and I do not sleep. Something went out at the third bell, wide and hard-shelled, and it went with the ebb and did not come back.", zh: "我守排水口，不睡。三更有什么东西出去了，又宽又硬，跟着退潮走的，没回来。" },
            { id: "k23s6", claim: "k23c1", en: "A fish is soft and a shell is hard. The thing that passed me had edges, and when I put my whiskers to it the water tasted of smoke and salt.", zh: "鱼是软的，壳是硬的。打我跟前过去的东西有棱，我把须子贴上去，水里有烟味，还有盐味。" },
          ],
        },
      ],
      presses: [
        { id: "k23p1", witness: "k23w1", with: "k23e1", claim: "k23c1", cost: 1, en: "You feel every foot that crosses the floor, and you told the court the door sang once. A door that sings once and a drain that pulls after it is a door opened from inside. Say what crossed, and say why you did not say it before.", zh: "地板上谁的脚走过你都觉得出，你告诉法庭门簧只响了一声。只响一声的门，后面跟着排水口一抽，就是从里头开、从水里走的门。说是什么过去了，再说你先前为什么不说。" },
        { id: "k23p2", witness: "k23w2", with: "k23e2", claim: "k23c1", cost: 1, en: "You say a lobster's track is a tail-drag with hooks. Here is the track, here are the hooks, and here is your own shell beside it. The court asks you plainly: whose track is this?", zh: "你说龙虾的痕迹是尾扇一拖、带两个钩。痕迹在这儿，钩在这儿，你自己的壳也在旁边。法庭只问你一句：这是谁的痕迹？" },
        { id: "k23p3", witness: "k23w3", with: "k23e3", claim: "k23c1", cost: 1, en: "You keep the drain mouth and you do not sleep. An antenna-case does not swim; it was carried. Tell the court what carried it past you, and why you let it pass.", zh: "你守排水口，不睡。触角壳不会游水，它是被带过去的。告诉法庭，是什么把它从你身边带过去，你又为什么放它过去。" },
      ],
      vouches: [
        { id: "k23v1", witness: "k23w1", exhibit: "k23e1", claim: "k23c1", en: "The spring was straightened from inside and the hook bears a shell's mark. The ray heard the door sing once; believe the door, and believe the ray for the door.", zh: "门簧是从里头拉直的，钩上压着壳印。鳐鱼听见门只响了一声；信门，也信鳐鱼讲的门。" },
        { id: "k23v2", witness: "k23w2", exhibit: "k23e2", claim: "k23c1", en: "The track is a tail-drag with hooks and it goes to the drain. The lobster says the floor writes every crawler's name; the floor has written his.", zh: "痕迹是尾扇一拖、带两个钩，一直通到排水口。龙虾说地板会写下每个爬过去的姓名；地板已经写下了他的。" },
        { id: "k23v3", witness: "k23w3", exhibit: "k23e3", claim: "k23c1", en: "The eel's whiskers tasted smoke and salt on a hard-shelled thing going out with the ebb. An eel does not invent a taste.", zh: "鳗鱼的须子在一个硬壳东西身上尝到了烟味和盐味，那东西正跟着退潮出去。鳗鱼不会凭空尝出一种味道。" },
      ],
      claims: [
        { id: "k23c1", accused: "lobster", statements: ["k23s1", "k23s2", "k23s3", "k23s4", "k23s5", "k23s6"], exhibits: ["k23e1", "k23e2", "k23e3"], en: "Grip came out from under the rack, hooked the door-spring straight and carried the night's fish out through the drain", zh: "格里普从架子底下出来，把门簧钩直，带着一夜的鱼从排水口走了" },
        { id: "k23c2", accused: "ray", statements: ["k23s1", "k23s2"], exhibits: ["k23e1"], en: "Skate came up over the sill, lifted the fish from the rack and slid back down the drain", zh: "斯凯特越过门槛进来，把鱼从架上取下，又顺着排水口滑了回去" },
        { id: "k23c3", accused: "eel", statements: ["k23s5", "k23s6"], exhibits: ["k23e3"], en: "Sleeve came up the drain, took the fish from the rack and carried them out with the ebb", zh: "斯利夫从排水口上来，把鱼从架上取了，跟着退潮带了出去" },
      ],
    },
    /* k24 is the whole bench. The true charge has three owners at four, and the
     * bench wants four, so each owner must be pressed and then mended. The
     * conger is believed outright and cannot be mended until he is pressed;
     * one press costs two actions, and one press crosses to another witness's
     * word and recants the rival charge. The true closing costs thirteen and
     * the whole docket costs fifteen, which is the clock. */
    {
      id: "k24", labelKey: "ctaCase24", time: 15, culprit: "cuttlefish",
      bar: { strength: 25, trust: 4 },
      charge: {
        en: "The hatchery tank's sluice was lifted in the night and the seed oysters were gone from the trays. Three animals speak, and every one of them stands behind the one charge that answers; the bench wants all three at four, and it wants the whole docket reached inside a single tide.",
        zh: "孵化池的闸门夜里被抬开，育种的牡蛎从托盘上全没了。三只动物开口，能答这件案子的那条指控，三位证人一个也不少；法庭要他们每一个都站在四分上，还要在同一个潮头里把整本案卷都走到。",
      },
      suspects: [
        { id: "cuttlefish", en: "Ink the Cuttlefish", zh: "乌贼墨" },
        { id: "conger", en: "Coil the Conger", zh: "康吉鳗科伊尔" },
        { id: "seal", en: "Harbour the Seal", zh: "海豹哈伯" },
      ],
      exhibits: [
        { id: "k24e1", weight: 3, en: "The tank's sluice grate is lifted a hand's width and the bars are bruised with a soft, many-armed grip.", zh: "池子的闸栅被抬起一掌宽，栅条上压着一种又软、又多腕的握痕。" },
        { id: "k24e2", weight: 3, en: "A cuttlebone floats in the tank's overflow, whole and fresh, the ink-sac still dark.", zh: "池子的溢流口漂着一片乌贼骨，完整，新鲜，墨囊还是黑的。" },
        { id: "k24e3", weight: 2, en: "The tank floor is printed with a spray of suckers in pairs, small and close, crossing from the oyster trays to the sluice.", zh: "池底印着一片成对的吸盘痕，小而密，从牡蛎托盘一直横到闸口。" },
        { id: "k24e4", weight: 2, en: "A line of ink in the overflow channel, thinning downstream, and no ink above the sluice.", zh: "溢流槽里一道墨线，越往下越淡，闸口以上一点墨也没有。" },
        { id: "k24e5", weight: 1, en: "The conger's hole under the tank is empty of oyster shell, though the conger has eaten oysters all summer.", zh: "池底康吉鳗的洞是空的，一片牡蛎壳也没有——可这整个夏天，康吉鳗都在吃牡蛎。" },
        { id: "k24e6", weight: 1, en: "A tern's feather on the hatchery rail, dry, above the high-water line.", zh: "孵化场栏杆上一根海鸥羽毛，干着，在高水线以上。" },
        { id: "k24e7", weight: 1, en: "The conger's track in the silt outside the sluice: one long body-drag, entering and leaving by the same mouth.", zh: "闸口外淤泥里康吉鳗的痕迹：一条长长的身子拖痕，进和出都走同一个口。" },
        { id: "k24e8", weight: 1, en: "A seal's claw-mark on the outer grate, old and weathered, from before the new bars went in.", zh: "外闸栅上一道海豹的爪痕，又旧又经了风雨，是新栅条装上以前留下的。" },
      ],
      witnesses: [
        {
          id: "k24w1", trust: 4, en: "Pip the Tern", zh: "燕鸥皮普",
          statements: [
            { id: "k24s1", claim: "k24c1", en: "I sit the hatchery rail at dusk and I do not fish the tank. The sluice grate was down when I came and up when the light went, and nothing crossed the rail to lift it.", zh: "天黑的时我坐在孵化场栏杆上，从不伸嘴进池。我来时闸栅是落下的，灯灭时它抬起来了，可没有东西越过栏杆去抬它。" },
            { id: "k24s2", claim: "k24c1", en: "A cuttlebone floats. A cuttlebone does not swim and does not fall from the sky; it came out of the tank with the water, and the water goes one way.", zh: "乌贼骨会漂。乌贼骨不会游水，也不会从天上掉下来；它是跟着水从池子里出来的，而水只往一个方向走。" },
          ],
        },
        {
          id: "k24w2", trust: 5, en: "Coil the Conger", zh: "康吉鳗科伊尔",
          statements: [
            { id: "k24s3", claim: "k24c2", en: "I keep the hole under the tank and I have eaten oysters all summer. The court may look in my hole and see what I have eaten; I do not hide a shell.", zh: "我守在池底那个洞里，吃了一个夏天的牡蛎。法庭尽管到我洞里看，看我吃了什么；我不藏壳。" },
            { id: "k24s4", claim: "k24c1", en: "The sluice grate was lifted from inside; a body outside pulls a grate down, not up. The bars are bruised where a soft grip closed on them, and a conger has no hands.", zh: "闸栅是从里头抬起来的；外头的身子只会把闸栅往下压，不会往上提。栅条上是有软东西握住压出的痕，可康吉鳗没有手。" },
            { id: "k24s5", claim: "k24c1", en: "The sucker-prints cross the tank floor in pairs. A conger leaves a body-drag and no pairs; the court may put my track beside that print.", zh: "吸盘印成对地横过池底。康吉鳗只留一条身子拖痕，不留下成对的印；法庭尽管把我的痕迹摆到那印子旁边。" },
          ],
        },
        {
          id: "k24w3", trust: 4, en: "Ink the Cuttlefish", zh: "乌贼墨",
          statements: [
            { id: "k24s6", claim: "k24c1", en: "I came into the tank on the flood for the oyster spawn, as I do every spring. The spawn was gone and the tank was open, and I left by the overflow because the sluice was the only water moving.", zh: "涨潮时我进池子来吃牡蛎的卵，年年春天都这样。这回卵没了，池子敞着；我从溢流口出去，因为闸口那边只有水在动。" },
            { id: "k24s7", claim: "k24c1", en: "Ink in a channel is a cuttlefish's ink. I will not say it is not mine; I will say I did not carry oysters, and the trays were already empty when I came.", zh: "槽里的墨，是乌贼的墨。我不说它不是我的；我只说我没搬牡蛎，我来的时候托盘已经空了。" },
          ],
        },
      ],
      presses: [
        { id: "k24p1", witness: "k24w1", with: "k24e3", exposes: "k24s3", claim: "k24c1", cost: 1, en: "You sat the rail and saw nothing cross it, and the conger says his hole is empty of shell. A conger that has eaten oysters all summer and keeps no shell has eaten somewhere else or hidden the shell. Which is it, and why did you not say the hole was empty when the court asked what you saw?", zh: "你在栏杆上坐着，说什么也没越过去；康吉鳗呢，说他洞里一片壳也没有。吃了一夏天牡蛎的康吉鳗，洞里不留壳，那他是在别处吃的，就是把壳藏了。是哪一样？法庭问你看见了什么的时候，你为什么不说他的洞是空的？" },
        { id: "k24p2", witness: "k24w2", with: "k24e2", claim: "k24c1", cost: 2, en: "You say the court may look in your hole; it has looked, and there is no shell. You say a conger has no hands; true. But a conger has a mouth, and there is a fresh cuttlebone in the water you came out of. Account for it, and account for the ink, or leave both on the table.", zh: "你说法庭尽管到你洞里看；它看过了，一片壳也没有。你说康吉鳗没有手；不错。可康吉鳗有嘴，而你出来的水里正漂着一片新鲜乌贼骨。给个说法，连那道墨一起给；给不出，就都留在桌上。" },
        { id: "k24p3", witness: "k24w3", with: "k24e4", claim: "k24c1", cost: 1, en: "You say the trays were empty when you came. The ink line thins downstream and stops below the sluice; ink laid before the water rose would have smeared above it. The tank was opened after the tide turned, and you were in it. Say when you came, to the bell.", zh: "你说你来的时候托盘已经空了。墨线越往下越淡，止在闸口以下；水涨之前下的墨，会在闸口以上洇开。池子是在潮水转过以后才开的，而你就在池子里。说你是什么时辰进来的，说到钟上。" },
        { id: "k24p4", witness: "k24w1", with: "k24e7", claim: "k24c2", cost: 1, en: "The conger's track enters and leaves by the same mouth. A body that went in and out by one mouth did not carry a winter of oysters up the overflow; it went in for its own supper and came out again.", zh: "康吉鳗的痕迹，进和出都走同一个口。一个身子从一个口进去、又从一个口出来，搬不走一冬的牡蛎；它是进来吃自己的晚饭，吃完又出去了。" },
      ],
      vouches: [
        { id: "k24v1", witness: "k24w1", exhibit: "k24e5", claim: "k24c1", en: "The tern did not fish the tank and did not cross the rail. The conger's hole is empty of shell, and a hole with no shell in it is a hole that has not been eating. Believe the rail, and believe the tern about the rail.", zh: "燕鸥没有伸嘴进池，也没有越过栏杆。康吉鳗的洞里没有壳；一个没有壳的洞，就是一个没在吃的洞。信栏杆，也信燕鸥讲的栏杆。" },
        { id: "k24v2", witness: "k24w2", exhibit: "k24e1", claim: "k24c1", en: "The conger has no hands and the grate was lifted from inside. His own track enters and leaves by the same mouth, and the sluice is not that mouth. The court will believe him against his own hole.", zh: "康吉鳗没有手，而闸栅是从里头抬起来的。他自己的痕迹出进走同一个口，那口不是闸口。法庭会信他，拿他的话对他自己的洞。" },
        { id: "k24v3", witness: "k24w3", exhibit: "k24e4", claim: "k24c1", en: "Ink in the overflow is the cuttlefish's own hand. He does not deny the ink; he denies the oysters. The court will take the ink and weigh the trays.", zh: "溢流槽里的墨，是乌贼自己的手。他不赖墨，他赖的是牡蛎。法庭就把墨收下，把托盘称一称。" },
        { id: "k24v4", witness: "k24w1", exhibit: "k24e7", claim: "k24c2", en: "The conger's track is a single drag in and out. A track that goes both ways is a track that carried nothing away, and the court has looked in the hole and found it bare.", zh: "康吉鳗的痕迹只有一道，进去出来。来回走同一道的痕迹，是没带走东西的痕迹；法庭已经看过那个洞，里头光着。" },
      ],
      claims: [
        { id: "k24c1", accused: "cuttlefish", statements: ["k24s1", "k24s2", "k24s4", "k24s5", "k24s6", "k24s7"], exhibits: ["k24e1", "k24e2", "k24e3", "k24e4", "k24e5"], en: "Ink came into the tank on the flood, lifted the sluice from inside with its arms, took the seed oysters and left by the overflow", zh: "墨趁着涨潮进了池子，用腕从里头抬起闸门，取了育种的牡蛎，从溢流口走了" },
        { id: "k24c2", accused: "conger", statements: ["k24s3", "k24s4"], exhibits: ["k24e7"], en: "Coil came up from his hole, forced the grate and carried the oysters down to his hole", zh: "科伊尔从洞里上来，顶开闸栅，把牡蛎搬回自己的洞里" },
        { id: "k24c3", accused: "seal", statements: ["k24s2", "k24s6"], exhibits: ["k24e8"], en: "Harbour reached over the outer grate, hooked the sluice open and scooped the oysters from the tank", zh: "哈伯越过外闸栅，用爪子钩开闸门，把池里的牡蛎捞走了" },
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
      "ctaCase9": "The Scratched Name",
      "ctaCase10": "The Weir Gap",
      "ctaCase11": "The Loosened Latch",
      "ctaCase12": "The Crossed Seed Rows",
      "ctaCase13": "The Moved Spawn-Stone",
      "ctaCase14": "The Four Names",
      "ctaCase15": "The Stacked Paddle",
      "ctaCase16": "The Only Mouth in the Room",
      "ctaCase17": "The Cast at the Wall",
      "ctaCase18": "The Paired Alibi",
      "ctaCase19": "Believed Outright",
      "ctaCase20": "No Slack in the Clock",
      "ctaCase21": "The Deep Press",
      "ctaCase22": "The Unnamed Word",
      "ctaCase23": "Believed at Five",
      "ctaCase24": "The Whole Bench",
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
      "ctaCase9": "划掉的名字",
      "ctaCase10": "决口的石坝",
      "ctaCase11": "松了的门闩",
      "ctaCase12": "拖过种子行的那道线",
      "ctaCase13": "搬走的孵卵石",
      "ctaCase14": "四个名字",
      "ctaCase15": "支起来的挡板",
      "ctaCase16": "屋里唯一的那张嘴",
      "ctaCase17": "墙根下那堆新土",
      "ctaCase18": "互相作证的两位",
      "ctaCase19": "信到底的证人",
      "ctaCase20": "没有富余的钟点",
      "ctaCase21": "深深一压",
      "ctaCase22": "未引的那句话",
      "ctaCase23": "信到五分",
      "ctaCase24": "整个证人席",
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
        "Goal: close one of twenty-four cases with a verdict the numbers behind it actually support.",
        "Action: click a witness to take their testimony in order, click an exhibit to mark it, then press 1 to 4 to spend an action, Enter to confirm, Escape back to the bench, L to read out everything you have established.",
        "Two numbers: claim strength comes from testimony, exhibit weight and contradictions; witness trust is separate, starts at the case's own value, and is what the bench will believe.",
        "The trade-off: pressing a witness adds 2 to the charge it serves and costs that witness 1 trust; corroborating a witness with a marked exhibit adds 1 to both.",
        "Watch out: a true charge on a witness trusted below the bar is thrown out, and a charge resting on an account you exposed as a lie recants itself.",
        "Scoring: the verdict quality is the gate, the case strength of your closing sets the stars, and the bands are measured from each case's own best-play line.",
      ],
      zh: [
        "目标：在二十四件案子里结一件，判决要能被它背后的数字真正撑住。",
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
