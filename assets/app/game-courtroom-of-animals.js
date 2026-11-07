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

  /* --- the docket: thirty authored cases --------------------------------- */
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
    /* k25 teaches the price of a question. The owl is believed outright and the
     * court may ask it one question costing three, but three is more than the
     * bench's three-point trust can survive even with a mending; the winning
     * line routes around the question. At one action the same question is
     * affordable and joins the line, so the measured best play moves. */
    {
      id: "k25", labelKey: "ctaCase25", time: 17, culprit: "marten",
      bar: { strength: 25, trust: 3 },
      charge: {
        en: "The shrine lamp went out before the last bell and its oil jar was found turned open, the wick still warm. The owl watched the whole night and the bench believes the owl outright. The court may ask the owl anything, but it will pay for the answer twice over.",
        zh: "神龛的灯在末钟之前就灭了，油罐被发现拧开了口，灯芯还温着。猫头鹰守了一整夜，法庭对它是全然相信的。尽可以问它，只是每问一句，都要付两回账。",
      },
      suspects: [
        { id: "marten", en: "Sable the Marten", zh: "貂塞布尔" },
        { id: "badger", en: "Brock the Badger", zh: "獾布罗克" },
        { id: "magpie", en: "Chatter the Magpie", zh: "喜鹊查特" },
      ],
      exhibits: [
        { id: "k25e1", weight: 3, en: "The oil jar's stopper stands a quarter-turn out of its thread, the brass clean and unbruised: it was turned, not forced.", zh: "油罐的塞子拧出螺纹四分之一圈，铜面干净，一点没磕碰：是拧开的，不是撬开的。" },
        { id: "k25e2", weight: 3, en: "A track crosses the shrine wall: light going up, deep going down, with five points and a drag between them.", zh: "一道痕迹横过神龛的墙：上去时轻，下来时深，中间五个点，拖着一条。" },
        { id: "k25e3", weight: 3, en: "A magpie's feather on the sill, vane oiled and still soft, though the bird's roost is three branches above.", zh: "窗台上一根喜鹊羽毛，羽片沾着油，还软着，可那鸟的栖枝在三根树枝以上。" },
        { id: "k25e4", weight: 3, en: "A line of lamp oil runs from the jar's foot to the wall and stops under a marten's ledge; above the line the stone is dry.", zh: "一道灯油从罐脚通到墙边，停在一处貂的岩台底下；油线以上的石头是干的。" },
      ],
      witnesses: [
        {
          id: "k25w1", trust: 5, en: "Moth the Owl", zh: "猫头鹰莫斯",
          statements: [
            { id: "k25s1", claim: "k25c1", en: "I sat the shrine roof from dusk. The lamp burned steady, then it drank itself small and went out between the second bell and the third.", zh: "天黑起我就蹲在龛顶上。灯先烧得稳，后来把油喝少了，在二更和三更之间灭的。" },
            { id: "k25s2", claim: "k25c1", en: "A marten smells of pine sap and warm fur. That smell came up the wall at midnight and went down heavier than it came.", zh: "貂身上是松脂和暖毛的气味。半夜那股味从墙上下来，下来时比上去时沉。" },
            { id: "k25s3", claim: "k25c1", en: "The jar's stopper was turned, not gnawed. A turned stopper is a hand's work, and a marten has hands enough.", zh: "罐塞子是拧开的，不是啃开的。拧开的塞子是手的活计，而貂的手够用。" },
          ],
        },
        {
          id: "k25w2", trust: 4, en: "Clover the Hare", zh: "野兔克洛弗",
          statements: [
            { id: "k25s4", claim: "k25c1", en: "I crossed the yard at the second bell. The jar stood full then, and the lamp was still bright enough to throw my shadow.", zh: "二更我穿过院子。那会儿罐子还是满的，灯还亮得能照出我的影子。" },
            { id: "k25s5", claim: "k25c1", en: "A marten goes up a wall light and comes down heavy. I have watched that track all my life and it never runs the other way.", zh: "貂上墙轻，下墙沉。这道痕迹我看了一辈子，从没有反过来的时候。" },
            { id: "k25s6", claim: "k25c1", en: "The badger's sett was stopped with earth all night. I passed it twice and the earth was not broken either time.", zh: "獾的洞整夜用土堵着。我打那儿过了两回，两回土都没破。" },
          ],
        },
        {
          id: "k25w3", trust: 4, en: "Reed the Fox", zh: "狐狸里德",
          statements: [
            { id: "k25s7", claim: "k25c1", en: "I keep the hedge and I hear the roost. The magpie never left its branch, and a bird that never leaves its branch does not oil a feather on the sill.", zh: "我守树篱，听得见栖枝。喜鹊一夜没离那根枝；不离枝的鸟，不会在窗台上给羽毛上油。" },
            { id: "k25s8", claim: "k25c1", en: "The oil was poured, not spilled. The lip is dry on the outside and wet on the inside, and a spill wets both.", zh: "油是倒出去的，不是洒的。罐口外头干、里头湿；洒出来的两边都湿。" },
            { id: "k25s9", claim: "k25c1", en: "A marten can turn a stopper with its forepaws. A badger's paws are shovels, and a shovel does not turn a thread.", zh: "貂能用前爪拧塞子。獾的爪是铲子，铲子拧不了螺纹。" },
          ],
        },
      ],
      presses: [
        { id: "k25p1", witness: "k25w2", with: "k25e1", claim: "k25c1", cost: 1, en: "You crossed the yard at the second bell and say the jar was full. The stopper has been turned a quarter since, and the thread is clean. A full jar does not turn its own stopper. Say what you saw at the wall, and say why you did not stop.", zh: "你二更穿过院子，说罐子是满的。那以后塞子被拧了四分之一圈，螺纹干干净净。满罐子不会自己拧塞子。说你在墙边看见了什么，再说你为什么没拦住。" },
        { id: "k25p2", witness: "k25w3", with: "k25e2", claim: "k25c1", cost: 1, en: "You keep the hedge and say the magpie never stirred. Here is the track up the wall and down again, and it comes down heavier. Put your nose to it and tell the court whose feet wrote it.", zh: "你守树篱，说喜鹊没动。这儿有一道上下墙的痕迹，下来时更沉。把鼻子凑上去，告诉法庭这是谁的脚写的。" },
        { id: "k25p3", witness: "k25w1", with: "k25e4", claim: "k25c1", cost: 3, en: "You watched the roof from dusk to dawn and you did not cry out once. The oil line runs from the jar to the marten's ledge, and a silent owl is a paid owl. The court will ask you three times: who paid you, and with what, and why were you silent?", zh: "你从天黑守到天亮，一声也没叫。油线从罐子一直通到貂的岩台；不叫的猫头鹰，是收了钱的猫头鹰。法庭要问你三遍：谁付了你，用什么付的，你为什么不出声？" },
        { id: "k25p4", witness: "k25w2", with: "k25e3", claim: "k25c2", cost: 1, en: "You say the magpie never came down. Its feather is on the sill with oil on the vane. A roosting feather does not oil itself; tell the court what carried it down.", zh: "你说喜鹊没下来。它的羽毛就落在窗台上，羽片上沾着油。栖着的羽毛不会自己上油；告诉法庭，是什么把它带下来的。" },
      ],
      vouches: [
        { id: "k25v1", witness: "k25w2", exhibit: "k25e1", claim: "k25c1", en: "The hare crossed the yard while the jar was still full. The stopper was turned after the second bell, and the hare has no reason to move the hour. Believe the hare about the hour, and the jar about the hand.", zh: "兔子过院子时罐子还满着。塞子是二更以后才被拧开的，兔子没有理由挪动时辰。信兔子讲的时辰，也信罐子讲的那只手。" },
        { id: "k25v2", witness: "k25w3", exhibit: "k25e2", claim: "k25c1", en: "The fox read the wall-track: up light and down heavy. A fox does not invent a track it has followed all its life; believe the fox about the wall.", zh: "狐狸读懂了墙上的痕迹：上去轻，下来沉。狐狸不会编造一道它跟了一辈子的印子；信狐狸讲的墙。" },
        { id: "k25v3", witness: "k25w2", exhibit: "k25e3", claim: "k25c2", en: "The hare crossed the yard and saw the roost; the magpie's feather came down after the second bell. Believe the hare about the hour, and the feather will answer for the bird.", zh: "兔子穿过院子，看见过栖枝；喜鹊的羽毛是二更以后才落下来的。信兔子讲的时辰，羽毛自会替那只鸟答话。" },
      ],
      claims: [
        { id: "k25c1", accused: "marten", statements: ["k25s1", "k25s2", "k25s3", "k25s4", "k25s5", "k25s6", "k25s7", "k25s8", "k25s9"], exhibits: ["k25e1", "k25e2", "k25e3", "k25e4"], en: "Sable came up the wall at midnight, turned the jar's stopper with her forepaws and poured the shrine's oil away", zh: "塞布尔半夜上了墙，用前爪拧开罐塞，把神龛的油倒走了" },
        { id: "k25c2", accused: "magpie", statements: ["k25s7"], exhibits: ["k25e3"], en: "Chatter came down from the roost, fouled the sill and drank the oil from the jar", zh: "查特从栖枝上下来，弄脏了窗台，把罐里的油喝了" },
        { id: "k25c3", accused: "badger", statements: ["k25s6"], exhibits: ["k25e1"], en: "Brock broke out of his stopped sett, climbed the wall and turned the stopper with his claws", zh: "布罗克从堵着的洞里出来，爬上墙，用爪子拧开了塞子" },
      ],
    },
    /* k26 teaches the cross-witness recant. The true charge is answered by the
     * heron's third word about the pike, and the frog's question exposes that
     * word. Because the exposed word sits only in the rival charge, the rival
     * recants and the true charge stands; aimed at the true charge instead the
     * same press would destroy the case. */
    {
      id: "k26", labelKey: "ctaCase26", time: 18, culprit: "heron",
      bar: { strength: 27, trust: 5 },
      charge: {
        en: "The keep-net at the fish-weir was cut open in the night and the catch was gone. The heron names the pike, and it is the heron's own third word that the court must take apart. The frog can put that word where it belongs, and the charge that rests on it will not survive.",
        zh: "鱼梁的养鱼网夜里被割开，一夜的鱼获没了。苍鹭咬定是狗鱼干的，而法庭要拆的，正是苍鹭自己的第三句话。青蛙能把那句话放回它该在的地方，压在那句话上的指控便活不下来。",
      },
      suspects: [
        { id: "heron", en: "Stilt the Heron", zh: "苍鹭斯蒂尔特" },
        { id: "pike", en: "Tarn the Pike", zh: "狗鱼塔恩" },
        { id: "mink", en: "Rill the Mink", zh: "水貂里尔" },
      ],
      exhibits: [
        { id: "k26e1", weight: 3, en: "The keep-net is parted in one clean stroke at the head-rope; the strands are not frayed, so it was cut, not bitten.", zh: "养鱼网在头绳处一下齐口断开；网线没有起毛，是割的，不是咬的。" },
        { id: "k26e2", weight: 3, en: "A print in the soft mud by the net: three long toes and no heel, pressed deep where the bird put its weight down.", zh: "网边软泥里一个印子：三个长趾，没有后跟，鸟把重心压下去的地方很深。" },
        { id: "k26e3", weight: 3, en: "A heron's feather caught on the net post, though the heron's own post stands ten paces upstream and is bare.", zh: "网桩上挂着一根苍鹭羽毛，可苍鹭自己的桩在上游十步远，那根桩上光着。" },
        { id: "k26e4", weight: 2, en: "A pike's scale on the net head-rope above the waterline, and the deep water below it is undisturbed.", zh: "网头绳上、水线以上有一片狗鱼鳞，下面深水却一点没被搅动。" },
      ],
      witnesses: [
        {
          id: "k26w1", trust: 5, en: "Pip the Frog", zh: "青蛙皮普",
          statements: [
            { id: "k26s1", claim: "k26c1", en: "I sat the weir post from dark. The net was tied at dusk with a double knot, and I heard the knot give at the third bell.", zh: "我从天黑起就蹲在鱼梁桩上。网是黄昏时用双结系好的，三更我听见结松了。" },
            { id: "k26s2", claim: "k26c1", en: "Something stepped into the shallows on two legs, not four, and it stepped carefully, the way a bird steps when it does not want the water to talk.", zh: "有什么东西两条腿踩进浅水，不是四条；踩得很小心，像鸟不想让水说话那样。" },
            { id: "k26s3", claim: "k26c1", en: "A heron's foot leaves three long toes and no heel. The print by the net has the three toes, and the mud is dry in the heel place.", zh: "苍鹭的脚留三个长趾，没有后跟。网边的印子有三个趾，后跟那儿泥是干的。" },
          ],
        },
        {
          id: "k26w2", trust: 5, en: "Brim the Duck", zh: "野鸭布里姆",
          statements: [
            { id: "k26s4", claim: "k26c1", en: "I kept the reeds. The pike was in the deep water all night; I saw his back turn once and no more, and a pike does not climb a weir post.", zh: "我守芦苇。狗鱼整夜都在深水里；我只见他翻过一次背，再没有第二回；狗鱼不会爬上鱼梁桩。" },
            { id: "k26s5", claim: "k26c1", en: "The net was cut, not bitten. The strands are parted at one stroke and a pike's teeth would have frayed them.", zh: "网是割开的，不是咬开的。网线一下子断开，狗鱼的牙会把线磨毛。" },
            { id: "k26s6", claim: "k26c1", en: "The heron's post was empty at the third bell. I looked for him because the net was singing, and his post was bare.", zh: "三更苍鹭的桩是空的。网响的时候我找他，他的桩上光着。" },
          ],
        },
        {
          id: "k26w3", trust: 5, en: "Stilt the Heron", zh: "苍鹭斯蒂尔特",
          statements: [
            { id: "k26s7", claim: "k26c1", en: "I stood my post until the moon crossed the alder. A heron does not leave a post while the eels run.", zh: "我在桩上站到月亮过了赤杨。鳗鱼上水的时辰，苍鹭不离桩。" },
            { id: "k26s8", claim: "k26c1", en: "The pike rose once and took a fish. That is what a pike does, and the court may not hang a whole net on one rise.", zh: "狗鱼上来过一次，叼走一条鱼。狗鱼就是干这个的，法庭不能把整张网挂在那一次上浮上。" },
            { id: "k26s9", claim: "k26c2", en: "I saw the pike at the net with my own eyes and heard the knot part in his teeth. The court has my word, and my word is enough.", zh: "我亲眼看见狗鱼在网边，亲耳听见结在他牙间断开。法庭有我的话，我的话就够了。" },
          ],
        },
      ],
      presses: [
        { id: "k26p1", witness: "k26w1", with: "k26e1", exposes: "k26s9", claim: "k26c1", cost: 1, en: "You say you saw a pike at the net and heard the knot part in his teeth. A pike has no teeth for cutting rope, and the net is cut clean. You were not at the net; you were told. Tell the court who told you, and when.", zh: "你说你亲眼看见狗鱼在网边，亲耳听见结在他牙间断开。狗鱼没有割绳的牙，而网是齐口割开的。你不在网边，你是听来的。告诉法庭，是谁说的，什么时候说的。" },
        { id: "k26p2", witness: "k26w2", with: "k26e2", claim: "k26c1", cost: 1, en: "You kept the reeds and saw the pike turn once. Here is the print by the net: three long toes and no heel, pressed where the mud was soft. Tell the court what stood there, and why you did not name it before.", zh: "你守芦苇，看见狗鱼翻过一次身。这儿是网边的印子：三个长趾，没有后跟，踩在软泥上。告诉法庭那儿站的是什么，再说你先前为什么不说。" },
        { id: "k26p3", witness: "k26w3", with: "k26e3", claim: "k26c1", cost: 1, en: "You say you never left your post. A heron's feather is on the net post, and the net post is not your post. A bird that stands still does not shed on another bird's perch. Account for the feather, and for the hour.", zh: "你说你从没离桩。网桩上有一根苍鹭的羽毛，那根桩不是你的桩。站着不动的鸟，不会在别的鸟的架上掉毛。给羽毛一个说法，也给那个时辰一个说法。" },
        { id: "k26p4", witness: "k26w1", with: "k26e4", claim: "k26c2", cost: 1, en: "You say the pike took one fish. A scale is on the net, above the waterline, and a pike does not jump a weir to leave a scale. Tell the court how it climbed.", zh: "你说狗鱼只叼了一条鱼。网口上、水线以上有一片狗鱼鳞，狗鱼不会跳鱼梁来留一片鳞。告诉法庭它是怎么爬上去的。" },
      ],
      vouches: [
        { id: "k26v1", witness: "k26w1", exhibit: "k26e1", claim: "k26c1", en: "The frog heard the knot give at the third bell and found the cut edge clean. The frog was at the post and the water was quiet; believe the frog about the hour, and the net about the cut.", zh: "青蛙三更听见结松了，看见断口是齐的。青蛙就在桩上，水是静的；信青蛙讲的时辰，也信网讲的这一刀。" },
        { id: "k26v2", witness: "k26w2", exhibit: "k26e2", claim: "k26c1", en: "The duck kept the reeds and saw the pike turn once, no more. The print by the net has three toes and no heel; the duck can read a print it has seen all its life.", zh: "鸭子守着芦苇，看见狗鱼只翻了一次身。网边的印子三趾无跟；鸭子认了一辈子的印子，读得懂。" },
        { id: "k26v3", witness: "k26w3", exhibit: "k26e3", claim: "k26c1", en: "The heron's post was empty at the third bell and his feather is on the net post. Believe the duck about the empty post, and the post will answer for the bird.", zh: "三更苍鹭的桩是空的，他的羽毛却在网桩上。信鸭子讲的空桩，桩自会替那只鸟答话。" },
      ],
      claims: [
        { id: "k26c1", accused: "heron", statements: ["k26s1", "k26s2", "k26s3", "k26s4", "k26s5", "k26s6", "k26s7", "k26s8"], exhibits: ["k26e1", "k26e2", "k26e3", "k26e4"], en: "Stilt left his post at the third bell, cut the keep-net with his beak and carried the catch off the weir", zh: "斯蒂尔特三更离了桩，用喙割开养鱼网，把鱼获带下鱼梁" },
        { id: "k26c2", accused: "pike", statements: ["k26s8", "k26s9"], exhibits: ["k26e4"], en: "Tarn rose at the third bell, tore the net with his teeth and took the catch into the deep water", zh: "塔恩三更上浮，用牙撕开网，把鱼获拖进深水" },
        { id: "k26c3", accused: "mink", statements: ["k26s7"], exhibits: ["k26e1"], en: "Rill came along the bank, bit through the net and swam the catch down the ditch", zh: "里尔沿河岸过来，咬穿网，把鱼获顺沟游走了" },
      ],
    },
    /* k27 teaches corroboration ordering. Both owners stand at the ceiling, so
     * the bench refuses a corroboration until the witness has been pressed down
     * from five; the only legal order is question, then mending, and both pairs
     * are needed for the bar. The gate reads the askability off the panel's own
     * rule instead of trusting the statement. */
    {
      id: "k27", labelKey: "ctaCase27", time: 19, culprit: "weasel",
      bar: { strength: 28, trust: 5 },
      charge: {
        en: "The tower bell was cut down in the night and the alarm rope lay in two pieces on the floor. The bat is the bench's favourite and stands at the very top of its trust. While a witness stands at the top the court will not hear a word of corroboration, so the question must come first and the mending after.",
        zh: "钟楼的钟夜里被放了下来，警绳断成两截躺在地上。蝙蝠是法庭最信的一位，正站在信任的顶格。证人还站在顶格的时候，法庭一句旁证也不听，所以问要先来，补要后到。",
      },
      suspects: [
        { id: "weasel", en: "Sly the Weasel", zh: "黄鼠狼斯莱" },
        { id: "jackdaw", en: "Caw the Jackdaw", zh: "寒鸦考" },
        { id: "cat", en: "Velvet the Cat", zh: "猫维尔维特" },
      ],
      exhibits: [
        { id: "k27e1", weight: 3, en: "The alarm rope's two ends: the cut is high above the knot and clean, at the height of a small body standing on the ladder.", zh: "警绳的两个断头：断口在结以上很高，齐整，正好是个小身子站在梯子上够得着的高度。" },
        { id: "k27e2", weight: 3, en: "A five-toed print in the flour by the grain door, the toes spread in a soft fan and no claw marks anywhere in it.", zh: "粮门边面粉里一个五趾印，趾头软软地铺开，整只印里没有一处爪痕。" },
        { id: "k27e3", weight: 3, en: "The grain-door bar lies on the inside flagstone: it was lifted out of its keep and laid down, not forced.", zh: "粮门的门闩躺在里头的石板上：是被抬出槽、放下的，不是撞开的。" },
        { id: "k27e4", weight: 3, en: "A jackdaw's feather under the louvre, dry and dusty, with the dust of the louvre still on it and none of the stair.", zh: "百叶窗下一根寒鸦羽毛，又干又灰，上头的灰还是窗上的灰，楼梯上的灰一点没沾。" },
        { id: "k27e5", weight: 3, en: "The bell's cradle is greased where the rope runs, and the grease is marked by a long, low body that had to stretch.", zh: "钟架的绳槽抹了油，油上压着一道又长又低的身印，得使劲伸才够得着。" },
        { id: "k27e6", weight: 2, en: "A cat's paw-mark on the outer sill, old and weathered, from a night when the bell was still hung.", zh: "外窗台上一道猫爪印，又旧又经了风雨，是钟还挂着的那一夜留下的。" },
      ],
      witnesses: [
        {
          id: "k27w1", trust: 5, en: "Flit the Bat", zh: "蝙蝠弗利特",
          statements: [
            { id: "k27s1", claim: "k27c1", en: "I hung in the belfry and I do not sleep at night. The rope was whole when the moon rose and in two pieces when it set.", zh: "我挂在钟楼里，夜里是不睡的。月亮上来时绳子还完整，落下去时已成两截。" },
            { id: "k27s2", claim: "k27c1", en: "The cut is high, above the knot, where a small body on the ladder would reach. A cat cuts low; a weasel climbs.", zh: "断口在高处，结的上面，只有小身子站在梯子上才够得着。猫在低处下口；貂才往上爬。" },
            { id: "k27s3", claim: "k27c1", en: "The bell did not fall by itself. It was lowered on the rope, slow, and it rang once against the frame when it landed.", zh: "钟不是自己掉下来的。它是被绳子慢慢放下来的，落地时在钟架上撞响了一声。" },
          ],
        },
        {
          id: "k27w2", trust: 5, en: "Moss the Vole", zh: "田鼠莫斯",
          statements: [
            { id: "k27s4", claim: "k27c1", en: "I keep the stair-foot. Something came down the stair at the third bell, light and quick, and went out by the grain door.", zh: "我守楼梯脚。三更有什么东西从楼上下来，又轻又快，从粮门出去了。" },
            { id: "k27s5", claim: "k27c1", en: "A weasel's foot is five toes in a soft fan. There is a print in the flour by the grain door with five toes and no claw marks.", zh: "貂的脚印是五个趾，软软地铺开。粮门边的面粉里有一个印子，五个趾，没有爪痕。" },
            { id: "k27s6", claim: "k27c1", en: "The jackdaw roosted in the louvre all night and never came down. I would have heard a bird on the stair; birds are loud on stone.", zh: "寒鸦整夜歇在百叶窗里，没下来过。楼梯上有鸟我会听见；鸟踩石头是响的。" },
          ],
        },
        {
          id: "k27w3", trust: 4, en: "Grey the Moth", zh: "飞蛾格雷",
          statements: [
            { id: "k27s7", claim: "k27c2", en: "I was on the bell-frame all night. The rope went slack twice: once when it was cut, and once when the bell was lowered.", zh: "我整夜在钟架上。绳子松过两回：一回是被割断，一回是钟被放下去。" },
            { id: "k27s8", claim: "k27c2", en: "A moth does not make a sound, but a moth sees. The thing on the ladder had a long back and a tail, and a cat has neither.", zh: "蛾子不出声，可蛾子看得见。梯子上那东西背长，还有尾巴；猫这两样都没有。" },
            { id: "k27s9", claim: "k27c2", en: "The grain door was unbarred from the inside. Whatever left by it knew the tower, and the weasel has slept in the grain room all winter.", zh: "粮门是从里头抽开闩的。从那儿出去的东西认得这座塔，而貂在粮房里睡了一冬。" },
          ],
        },
      ],
      presses: [
        { id: "k27p1", witness: "k27w1", with: "k27e1", claim: "k27c1", cost: 1, en: "You hung in the belfry and heard the rope go slack twice. Here are the two ends: the cut is high and clean. You are the bench's own witness and the court will ask you plainly: who was on the ladder?", zh: "你挂在钟楼里，听见绳子松了两回。这儿是两个断头：断口又高又齐。你是法庭自己的证人，法庭只问你一句：梯子上是谁？" },
        { id: "k27p2", witness: "k27w2", with: "k27e2", claim: "k27c1", cost: 1, en: "You keep the stair-foot and say something came down at the third bell. Here is the print in the flour: five toes, no claws. Put your own foot beside it and tell the court which of you climbs.", zh: "你守楼梯脚，说三更有什么下来了。这儿是面粉里的印子：五个趾，没有爪。把你的脚搁在旁边，告诉法庭你们俩谁往上爬。" },
        { id: "k27p3", witness: "k27w3", with: "k27e3", claim: "k27c2", cost: 1, en: "You were on the bell-frame and saw a long back with a tail. The grain door was unbarred from inside. Tell the court what you saw take the stair, and why the door was open for it.", zh: "你在钟架上，看见一个长背带尾的东西。粮门是从里头抽开的。告诉法庭你看见什么下了楼，那门又为什么替它开着。" },
        { id: "k27p4", witness: "k27w3", with: "k27e4", claim: "k27c2", cost: 1, en: "You say the jackdaw never came down. Its feather is under the louvre with the louvre's own dust on it and none of the stair. A bird that never left the louvre did not cut a rope below it.", zh: "你说寒鸦没下来。它的羽毛在百叶窗下，上头的灰是窗上的灰，楼梯上的灰一点没沾。没离窗的鸟，割不了下面的绳。" },
        { id: "k27p5", witness: "k27w2", with: "k27e5", claim: "k27c2", cost: 1, en: "You say the thing on the stair was light. The rope-cradle grease carries a long, low body that had to stretch. Tell the court what stretched, and how it got down without the stair.", zh: "你说楼梯上的东西很轻。绳槽的油上压着一道又长又低的身印，得使劲伸才够得着。告诉法庭是什么伸了身子，又怎么不踩楼梯下来的。" },
      ],
      vouches: [
        { id: "k27v1", witness: "k27w1", exhibit: "k27e1", claim: "k27c1", en: "The bat heard the rope go slack twice and the cut is high. A bat does not sleep through a bell; believe the bat about the ladder.", zh: "蝙蝠听见绳子松了两回，断口在高处。钟响的时候蝙蝠不会睡；信蝙蝠讲的梯子。" },
        { id: "k27v2", witness: "k27w2", exhibit: "k27e2", claim: "k27c1", en: "The vole read the print in its own flour: five toes and no claws. The vole has no reason to climb and every reason to look; believe the vole about the stair.", zh: "田鼠在自己磨的面粉里读出印子：五个趾，没有爪。田鼠没有理由上楼，却有十足的理由看；信田鼠讲的楼梯。" },
        { id: "k27v3", witness: "k27w3", exhibit: "k27e3", claim: "k27c2", en: "The moth saw the long back and the bar was lifted from inside. A moth does not invent a shape; believe the moth about the stair, and the bar about the hand.", zh: "飞蛾看见了长背，门闩是从里头抬开的。飞蛾不会凭空编一个形状；信飞蛾讲的楼梯，也信门闩讲的那只手。" },
      ],
      claims: [
        { id: "k27c1", accused: "weasel", statements: ["k27s1", "k27s2", "k27s3", "k27s4", "k27s5", "k27s6"], exhibits: ["k27e1", "k27e2", "k27e3", "k27e4", "k27e5", "k27e6"], en: "Sly climbed the ladder, cut the alarm rope high and lowered the bell, then left by the grain door he knew", zh: "斯莱爬上梯子，在高处割断警绳，把钟放了下来，再从他熟悉的粮门走了" },
        { id: "k27c2", accused: "jackdaw", statements: ["k27s7", "k27s8", "k27s9"], exhibits: ["k27e3", "k27e4"], en: "Caw came down from the louvre, pecked the rope apart and let the bell fall to wake the tower", zh: "考从百叶窗下来，把绳子啄断，让钟掉下来惊醒全塔" },
        { id: "k27c3", accused: "cat", statements: ["k27s4"], exhibits: ["k27e6"], en: "Velvet slipped up the stair, cut the rope at paw-height and rolled the bell off its cradle", zh: "维尔维特溜上楼梯，在爪子够得着的高度割断绳，把钟滚下钟架" },
      ],
    },
    /* k28 teaches the exact clock. The true charge hears twelve words, asks
     * three questions and mends all three witnesses, which is exactly the
     * eighteen actions the tide allows; the whole docket proof also spends
     * eighteen. One action less and no sound line fits, so the clock is a wall,
     * not a margin. */
    {
      id: "k28", labelKey: "ctaCase28", time: 18, culprit: "grebe",
      bar: { strength: 29, trust: 5 },
      charge: {
        en: "The salt-pan's sluice boards were lifted in the night and the brine ran out into the marsh, leaving the pan dry at dawn. The tide gives the court eighteen actions and not one more: every word, every question and every mending has to be measured against the water.",
        zh: "盐田的闸板夜里被抬开，卤水淌进沼泽，天亮时盐田干了。潮水只给法庭十八次动作，一次也不多：每一句话、每一问、每一回补，都得拿水来量。",
      },
      suspects: [
        { id: "grebe", en: "Dab the Grebe", zh: "鸊鷉达布" },
        { id: "eel", en: "Sleeve the Eel", zh: "鳗鱼斯利夫" },
        { id: "rat", en: "Gnaw the Rat", zh: "老鼠诺" },
      ],
      exhibits: [
        { id: "k28e1", weight: 3, en: "The sluice boards stand lifted and wedged with a wet feather and a smear of grebe oil, and the wedge was set from the water side.", zh: "闸板被抬起，用一根湿羽毛和一道鸊鷉油楔住；楔子是从水那一面打进去的。" },
        { id: "k28e2", weight: 3, en: "Grebe tracks cross the pan rim from the channel and go back the same way, webbed and close together, and no track goes near the rat's wall.", zh: "鸊鷉的蹼印从水道越过盐田边，又原路回去，脚印挨得密；老鼠的墙根一道印也没有。" },
        { id: "k28e3", weight: 3, en: "The pan's brine-gate cord is cut and knotted again at the top, at the height of a swimming bird's neck, not a rat's teeth.", zh: "盐田卤水闸的绳被割断，又在高处重新打了个结，正好是游禽脖子够得着的高度，不是老鼠牙咬的。" },
      ],
      witnesses: [
        {
          id: "k28w1", trust: 5, en: "Skitter the Sandpiper", zh: "鹬斯基特",
          statements: [
            { id: "k28s1", claim: "k28c1", en: "I keep the pan rim. The boards were down at dusk and the brine stood at the second mark when the moon came up.", zh: "我守盐田边。黄昏时闸板是落下的，月亮上来时卤水还在第二道刻度上。" },
            { id: "k28s2", claim: "k28c1", en: "At the third bell the boards were up and the brine was running. I heard the wedge go in: one knock, from the water side.", zh: "三更闸板抬起来了，卤水在流。我听见楔子打进去：一声，从水那一面。" },
            { id: "k28s3", claim: "k28c1", en: "A grebe swims low and works with its neck. The cord was knotted high, and a rat would have had to climb the gate to knot it there.", zh: "鸊鷉游得低，用脖子干活。绳子结在高处，老鼠要结在那儿，得爬上闸门。" },
            { id: "k28s4", claim: "k28c1", en: "The eel was in the channel all night; I saw its back in the shallows and it never came over the rim.", zh: "鳗鱼整夜都在水道里；我看见它在浅水露背，从没越过田边。" },
          ],
        },
        {
          id: "k28w2", trust: 5, en: "Click the Shrimp", zh: "虾克利克",
          statements: [
            { id: "k28s5", claim: "k28c1", en: "I was under the boards. The wedge went in above me and the water came down on my back, and the thing that set it had a breast, not a belly.", zh: "我在闸板底下。楔子在我头上打进去，水压到我背上；打楔子的那东西有胸脯，不是肚皮贴地。" },
            { id: "k28s6", claim: "k28c1", en: "A rat works with its teeth and leaves a chewed edge. The cord is cut clean and knotted again, and no tooth has touched it.", zh: "老鼠用牙干活，留下啃过的毛边。这绳是齐口割断又重打的结，没有一颗牙碰过。" },
            { id: "k28s7", claim: "k28c1", en: "The rat's wall was quiet all night. I would have felt a rat cross the pan; the pan rings under a rat.", zh: "老鼠的墙整夜没动静。老鼠过盐田我会觉得出；老鼠一踩，盐田就响。" },
            { id: "k28s8", claim: "k28c1", en: "The boards were lifted straight up, both together. A rat pulls one board down; a swimming bird pushes both up with its back.", zh: "两块闸板是一起直着抬起来的。老鼠把一块板往下拽；游禽用背把两块一起顶上去。" },
          ],
        },
        {
          id: "k28w3", trust: 5, en: "Barnacle the Limpet", zh: "帽贝巴纳克尔",
          statements: [
            { id: "k28s9", claim: "k28c1", en: "I do not move, so I see what moves. The grebe came up the channel twice: once light, once low in the water.", zh: "我不动，所以看得见什么在动。鸊鷉从水道上来过两回：一回轻，一回压在水里。" },
            { id: "k28s10", claim: "k28c1", en: "The second time it came it carried the smell of salt and its breast was wet above the waterline.", zh: "第二回上来时它带着盐味，胸脯在水线以上是湿的。" },
            { id: "k28s11", claim: "k28c1", en: "A rat leaves a dry track and a grebe leaves a wet one. The rim is wet where the webbed print is, and dry where the rat's wall meets it.", zh: "老鼠留干印，鸊鷉留湿印。蹼印那儿的田边是湿的，老鼠墙根接上来的地方是干的。" },
            { id: "k28s12", claim: "k28c1", en: "The eel cannot lift a board with its back and cannot knot a cord with its tail. Whatever did this had a neck and two feet.", zh: "鳗鱼不能用背顶起闸板，也不能用尾巴打结。干这事的东西有脖子，有两只脚。" },
          ],
        },
      ],
      presses: [
        { id: "k28p1", witness: "k28w1", with: "k28e1", claim: "k28c1", cost: 1, en: "You keep the rim and heard one knock from the water side. Here is the wedge: a wet feather and grebe oil. Tell the court what had a breast to push with, and why you did not cry out at the third bell.", zh: "你守田边，听见水那一面一声响。这儿是楔子：一根湿羽毛，一道鸊鷉油。告诉法庭是什么用胸脯顶的，三更你又为什么没叫。" },
        { id: "k28p2", witness: "k28w2", with: "k28e2", claim: "k28c1", cost: 1, en: "You were under the boards and felt the wedge go in above you. The webbed print on the rim goes back the same way it came. Put the court's eye on the print and tell it what swam.", zh: "你在闸板底下，觉得楔子从头上打进去。田边的蹼印原路来、原路去。把法庭的眼睛按到印子上，告诉它游过去的是什么。" },
        { id: "k28p3", witness: "k28w3", with: "k28e3", claim: "k28c1", cost: 1, en: "You do not move, so you see what moves. The grebe came twice, the second time low and wet to the breast. Account for the second coming, and for the cord knotted at a swimmer's height.", zh: "你不动，所以看得见什么在动。鸊鷉来了两回，第二回压得低，胸脯湿到水线上。给第二回一个说法，也给那根结在游禽高度上的绳一个说法。" },
      ],
      vouches: [
        { id: "k28v1", witness: "k28w1", exhibit: "k28e1", claim: "k28c1", en: "The sandpiper heard one knock and the wedge carries a grebe's feather. Believe the sandpiper about the knock, and the wedge about the breast that pushed it.", zh: "鹬听见一声响，楔子上带着鸊鷉的羽毛。信鹬讲的那一声，也信楔子讲的胸脯。" },
        { id: "k28v2", witness: "k28w2", exhibit: "k28e2", claim: "k28c1", en: "The shrimp felt the water come down and the print on the rim is webbed. A shrimp does not invent a print; believe the shrimp about the boards.", zh: "虾觉得水压下来，田边的印子是蹼印。虾不会凭空编一个印子；信虾讲的闸板。" },
        { id: "k28v3", witness: "k28w3", exhibit: "k28e3", claim: "k28c1", en: "The limpet saw the grebe come twice and the cord is knotted at a swimmer's height. The limpet has nowhere to go and no reason to lie; believe the limpet about the second coming.", zh: "帽贝看见鸊鷉来了两回，绳子结在游禽的高度上。帽贝没处可去，也没理由撒谎；信帽贝讲的第二回。" },
      ],
      claims: [
        { id: "k28c1", accused: "grebe", statements: ["k28s1", "k28s2", "k28s3", "k28s4", "k28s5", "k28s6", "k28s7", "k28s8", "k28s9", "k28s10", "k28s11", "k28s12"], exhibits: ["k28e1", "k28e2", "k28e3"], en: "Dab came up the channel twice, lifted both boards with its back and let the brine run into the marsh", zh: "达布从水道上来两回，用背顶起两块闸板，让卤水淌进沼泽" },
        { id: "k28c2", accused: "eel", statements: ["k28s4", "k28s12"], exhibits: ["k28e3"], en: "Sleeve came over the rim, unknotted the cord with its tail and pulled the boards down", zh: "斯利夫越过田边，用尾巴解开绳，把闸板拽了下来" },
        { id: "k28c3", accused: "rat", statements: ["k28s7", "k28s8"], exhibits: ["k28e2"], en: "Gnaw climbed the gate, chewed the cord and dragged one board open with his teeth", zh: "诺爬上闸门，啃断绳，用牙把一块闸板拽开" },
      ],
    },
    /* k29 teaches the mending that rescues a broken press. Every press costs
     * two and takes a witness believed at five down to three, under the bar of
     * four; only its corroboration puts it back. If the press were cheap the
     * corroboration could be dropped and the case would still close, so the cut
     * makes the press cheap and removes the vouch at once. */
    {
      id: "k29", labelKey: "ctaCase29", time: 20, culprit: "stoat",
      bar: { strength: 30, trust: 4 },
      charge: {
        en: "The salmon ladder's counting gate was wedged open in the night and the run went up unwatched. Every question in this case costs the witness two points of trust and leaves it below the bar; the court must mend each witness it breaks, or close on nobody.",
        zh: "鲑鱼梯的计数闸夜里被楔开，鱼群从没人看着的地方上去了。这件案子里，每一问都要从证人身上拿走两分信任，把它压到杠下；法庭折了谁，就得把谁补回来，不然一个证人也留不住。",
      },
      suspects: [
        { id: "stoat", en: "Whisk the Stoat", zh: "白鼬威斯克" },
        { id: "osprey", en: "Talons the Osprey", zh: "鱼鹰塔隆斯" },
        { id: "newt", en: "Slick the Newt", zh: "蝾螈斯利克" },
      ],
      exhibits: [
        { id: "k29e1", weight: 3, en: "The counting gate is wedged with a fish-tail and a smear of stoat musk; the wedge went in from the ladder top.", zh: "计数闸被一段鱼尾和一道白鼬麝香楔住；楔子是从梯顶打进去的。" },
        { id: "k29e2", weight: 3, en: "A stoat's track crosses the ladder grating and comes back with a fish-scale caught in the print.", zh: "白鼬的印子横过梯上的格栅，回来时印子里卡着一片鱼鳞。" },
        { id: "k29e3", weight: 3, en: "The gate cord is gnawed at the knot, not cut; the teeth are small and sharp and set in pairs.", zh: "闸绳在结上被啃过，不是割的；齿印又小又尖，成对。" },
        { id: "k29e4", weight: 2, en: "The osprey's perch above the ladder is empty of fish bones, though the perch is white with them every other morning.", zh: "鱼鹰在梯上的栖木上一根鱼骨也没有，可别的早晨那栖木白花花全是骨头。" },
        { id: "k29e5", weight: 2, en: "A newt's slime trail stops at the ladder's foot; the grating above it is dry.", zh: "蝾螈的黏液痕停在梯脚；上面的格栅是干的。" },
      ],
      witnesses: [
        {
          id: "k29w1", trust: 5, en: "Redd the Salmon", zh: "鲑鱼雷德",
          statements: [
            { id: "k29s1", claim: "k29c1", en: "I came up the ladder at the second bell. The gate was down and the counting cord was taut and whole.", zh: "二更我上梯。闸是落下的，计数绳绷着，完好。" },
            { id: "k29s2", claim: "k29c1", en: "At the third bell the gate was wedged and the cord was slack. I felt the wedge go in with my own back.", zh: "三更闸被楔住了，绳子松了。那楔子打进去，是我自己背上觉出来的。" },
            { id: "k29s3", claim: "k29c1", en: "A stoat crosses the grating with its belly low. The track I passed had a fish-scale in it, and a stoat does not eat scales.", zh: "白鼬过格栅时肚皮贴得低。我路过的那道印子里卡着一片鱼鳞；白鼬不吃鳞。" },
          ],
        },
        {
          id: "k29w2", trust: 5, en: "Sieve the Lamprey", zh: "七鳃鳗西夫",
          statements: [
            { id: "k29s4", claim: "k29c1", en: "I hold the ladder foot. The gate cord was whole at dusk; at the third bell it was gnawed at the knot.", zh: "我守梯脚。黄昏时闸绳还是好的；三更结上就有了啃痕。" },
            { id: "k29s5", claim: "k29c1", en: "The teeth marks are small and paired. An osprey's beak cannot make pairs, and a newt has no teeth worth the name.", zh: "齿印又小又成对。鱼鹰的喙做不出成对的印，蝾螈的牙也不成气候。" },
            { id: "k29s6", claim: "k29c1", en: "The newt's trail stops at the foot and the grating above is dry. Whatever went up the ladder did not come up wet from the newt's way.", zh: "蝾螈的痕停在梯脚，上面格栅是干的。上梯的东西，不是从蝾螈那条湿路来的。" },
          ],
        },
        {
          id: "k29w3", trust: 5, en: "Dip the Dipper", zh: "河乌迪普",
          statements: [
            { id: "k29s7", claim: "k29c1", en: "I keep the ladder head. The gate went open at the third bell and the run went up under it, fast and silent.", zh: "我守梯顶。三更闸开了，鱼群从底下上去，又快又静。" },
            { id: "k29s8", claim: "k29c1", en: "The osprey was on the far bank at the third bell. I saw her shadow on the water and her perch was empty behind her.", zh: "三更鱼鹰在远岸。我看见她投在水上的影子，她身后的栖木空着。" },
            { id: "k29s9", claim: "k29c1", en: "A stoat's musk is sharp and it was on the wedge. I smelled it from the ladder head and it did not come from the water.", zh: "白鼬的麝香很冲，就在楔子上。我在梯顶就闻到了，那味不是水里来的。" },
          ],
        },
      ],
      presses: [
        { id: "k29p1", witness: "k29w1", with: "k29e1", claim: "k29c1", cost: 2, en: "You came up at the second bell and felt the wedge go in at the third. Here is the wedge with stoat musk on it. A salmon does not smell musk in the water and forget it; tell the court what crossed the grating, and how it carried a scale away.", zh: "你二更上梯，三更觉出楔子打进去。这儿是带白鼬麝香的楔子。鲑鱼在水里闻到麝香，不会转头就忘；告诉法庭是什么过了格栅，又怎么带走一片鳞。" },
        { id: "k29p2", witness: "k29w2", with: "k29e3", claim: "k29c1", cost: 2, en: "You hold the foot and say the cord was gnawed at the knot. The marks are small and paired, and no beak makes pairs. Put your mouth to the cord and tell the court whose teeth these are.", zh: "你守梯脚，说绳结上有啃痕。齿印又小又成对，没有哪只喙能做出成对的印。把你的嘴凑到绳上，告诉法庭这是谁的牙。" },
        { id: "k29p3", witness: "k29w3", with: "k29e2", claim: "k29c1", cost: 2, en: "You keep the head and smelled musk on the wedge. The track on the grating comes back with a scale in it. Tell the court what walked up dry and came back with a fish's coat on its foot.", zh: "你守梯顶，在楔子上闻到麝香。格栅上的印子回来时卡着一片鳞。告诉法庭，是什么干着脚上去，回来时脚上带着鱼的衣服。" },
        { id: "k29p4", witness: "k29w1", with: "k29e4", claim: "k29c2", cost: 2, en: "You say the osprey was on the far bank. Her perch is empty of bones, and it is never empty. Tell the court where she ate, if not here.", zh: "你说鱼鹰在远岸。她的栖木上一根骨头也没有，而它从来不空。告诉法庭，她要是不在这儿吃，是在哪儿吃的。" },
        { id: "k29p5", witness: "k29w2", with: "k29e5", claim: "k29c3", cost: 2, en: "You say the newt came up wet. Its trail stops at the foot and the grating is dry. Tell the court how a newt climbs a dry ladder.", zh: "你说蝾螈湿着上来。它的痕停在梯脚，格栅是干的。告诉法庭，蝾螈怎么爬一架干梯子。" },
      ],
      vouches: [
        { id: "k29v1", witness: "k29w1", exhibit: "k29e1", claim: "k29c1", en: "The salmon felt the wedge go in and the wedge smells of stoat. A salmon does not invent a smell it has spent its life avoiding; believe the salmon about the grating.", zh: "鲑鱼觉出楔子打进去，楔子上有白鼬的味。鲑鱼躲了一辈子的气味，不会凭空编出来；信鲑鱼讲的格栅。" },
        { id: "k29v2", witness: "k29w2", exhibit: "k29e3", claim: "k29c1", en: "The lamprey read the gnawed knot: small, paired teeth. The lamprey has a mouth of its own and no reason to praise another's; believe the lamprey about the cord.", zh: "七鳃鳗读出了啃过的结：小齿，成对。它自己有嘴，没理由夸别人的牙；信七鳃鳗讲的绳。" },
        { id: "k29v3", witness: "k29w3", exhibit: "k29e2", claim: "k29c1", en: "The dipper smelled musk at the head and the track carries a fish-scale. The dipper works this ladder every day; believe it about the grating.", zh: "河乌在梯顶闻到麝香，印子里带着鱼鳞。河乌天天在这架梯上做工；信它讲的格栅。" },
        { id: "k29v4", witness: "k29w3", exhibit: "k29e5", claim: "k29c2", en: "The dipper saw the osprey's shadow on the far water and her perch bare. Believe the dipper about the far bank, and the perch about the bird.", zh: "河乌看见鱼鹰的影子投在远水上，栖木空着。信河乌讲的远岸，也信栖木讲的那只鸟。" },
      ],
      claims: [
        { id: "k29c1", accused: "stoat", statements: ["k29s1", "k29s2", "k29s3", "k29s4", "k29s5", "k29s6", "k29s7", "k29s8", "k29s9"], exhibits: ["k29e1", "k29e2", "k29e3", "k29e4", "k29e5"], en: "Whisk wedged the counting gate from the ladder top, gnawed the cord and walked the run with a fish-scale on its foot", zh: "威斯克从梯顶楔开计数闸，啃断绳，脚上带着鱼鳞走了一趟" },
        { id: "k29c2", accused: "osprey", statements: ["k29s8", "k29s7"], exhibits: ["k29e4"], en: "Talons came off the far bank, forced the gate with her beak and took the run from above", zh: "塔隆斯从远岸过来，用喙顶开闸，从上面截走了鱼群" },
        { id: "k29c3", accused: "newt", statements: ["k29s6"], exhibits: ["k29e5"], en: "Slick climbed the wet ladder foot, squeezed the gate cord loose and let the run pass", zh: "斯利克从湿的梯脚爬上来，把闸绳蹭松，让鱼群过去了" },
      ],
    },
    /* k30 is the summit and the last mechanic: the exhibit that waits on a
     * witness. The bronze mirror is named by the true charge, but the only
     * question that puts it to the court is held by the crow and anchored on the
     * mole's third word. Until that word is heard the question is illegal, and
     * the exhibit proves nothing. Swap the anchor for the mirror itself and the
     * measured line loses the mole's three words; remove the mirror and the bar
     * is out of reach. */
    {
      id: "k30", labelKey: "ctaCase30", time: 23, culprit: "raven",
      bar: { strength: 32, trust: 4 },
      charge: {
        en: "The bronze mirror left on the hill cairn at midsummer was gone by morning, and the raven's ledge glittered. The mirror is the whole case, but it is only put to the court through the crow's question, and that question waits on the mole's third word. Until the mole speaks, the exhibit is only a shine on a ledge.",
        zh: "仲夏留在山间石堆上的铜镜，天亮时没了，乌鸦的岩台却闪着光。整件案子就靠这面镜子，可它只能借乌鸦那一问呈到堂上，而那一问又等着鼹鼠的第三句话。鼹鼠不开口，那物证也不过是岩台上的一道亮。",
      },
      suspects: [
        { id: "raven", en: "Ash the Raven", zh: "乌鸦阿什" },
        { id: "tortoise", en: "Grit the Tortoise", zh: "陆龟格里特" },
        { id: "shrew", en: "Quill the Shrew", zh: "鼩鼱奎尔" },
      ],
      exhibits: [
        { id: "k30e1", weight: 3, en: "The cairn mirror, found on the raven's ledge: the bronze is scratched by a beak's grip, and the cairn's moss is still in its rim.", zh: "在乌鸦岩台上找到的石堆铜镜：铜面被喙抓出划痕，镜框里还嵌着石堆上的苔。" },
        { id: "k30e2", weight: 3, en: "A raven's feather on the cairn, split at the quill, with bronze dust caught in the split.", zh: "石堆上一根乌鸦羽毛，羽根裂开，裂缝里嵌着铜屑。" },
        { id: "k30e3", weight: 3, en: "Three-toed claw-prints on the cairn's top stone, deep at the front, where a bird landed heavy with something.", zh: "石堆顶石上有三趾爪印，前头深——是鸟带着重东西落下来的样子。" },
        { id: "k30e4", weight: 3, en: "A scrape of drystone runs from the cairn's face to the raven's ledge, the lichen broken in one long line.", zh: "一道干石刮痕从石堆正面通到乌鸦岩台，地衣被拉成一条长线。" },
        { id: "k30e5", weight: 1, en: "The mirror's notch in the top stone: the moss about it is torn in a ring, not a stripe.", zh: "顶石上放镜子的槽：四周的苔被扯成一圈，不是一道。" },
      ],
      witnesses: [
        {
          id: "k30w1", trust: 5, en: "Sker the Lizard", zh: "蜥蜴斯克尔",
          statements: [
            { id: "k30s1", claim: "k30c1", en: "I warm on the cairn's top stone. At dusk the mirror stood in its notch and the moss around it was unbroken.", zh: "我在石堆顶石上晒太阳。黄昏时镜子还在它的槽里，周围的苔没被碰过。" },
            { id: "k30s2", claim: "k30c1", en: "At the third bell something came down on the top stone heavy and went off again lighter. I felt the stone jump under me.", zh: "三更有什么重东西落到顶石上，又轻着走了。我觉出身下的石头跳了一下。" },
            { id: "k30s3", claim: "k30c1", en: "A raven lands with its claws forward and takes off with its feet behind. The claw-prints are deep at the front and shallow behind.", zh: "乌鸦落下来爪子在前，起飞时脚在后。那爪印前深后浅。" },
            { id: "k30s4", claim: "k30c1", en: "The tortoise was under the wall all night; I saw his shell in the same place at dusk and at dawn.", zh: "陆龟整夜在墙根下；黄昏和天亮我都看见他的壳在同一个地方。" },
            { id: "k30s14", claim: "k30c1", en: "The mirror's notch was empty at dawn and the moss about it was torn in a ring. A thing lifted straight up leaves a ring; a thing dragged leaves a stripe.", zh: "天亮时镜槽空了，四周的苔被扯成一圈。直着抬起来的东西留下圈；拖着走的东西留下道。" },
          ],
        },
        {
          id: "k30w2", trust: 5, en: "Croak the Crow", zh: "乌鸦克罗克",
          statements: [
            { id: "k30s5", claim: "k30c1", en: "I keep the far ash and I watch the cairn. A raven crossed to the ledge at the third bell with something bright in its beak.", zh: "我守远处那棵白蜡树，看着石堆。三更一只乌鸦飞到岩台去，喙里衔着亮东西。" },
            { id: "k30s6", claim: "k30c1", en: "The scrape on the drystone is one long line, not two. A bird carried the mirror along the wall and did not come back by the same road.", zh: "干石上的刮痕是一条长线，不是两条。鸟带着镜子沿墙走，没从原路回来。" },
            { id: "k30s7", claim: "k30c1", en: "Bronze dust is in the feather's split quill. Bronze dust does not blow upward to a cairn; it falls from what was carried.", zh: "铜屑嵌在羽毛裂开的羽根里。铜屑不会往石堆上吹；它是从被带走的东西上掉下来的。" },
            { id: "k30s8", claim: "k30c1", en: "The shrew keeps the cairn's foot and never lies about a smell. She will tell the court what crossed her stone before the third bell.", zh: "鼩鼱守石堆脚，从不对气味撒谎。她会告诉法庭，三更以前是什么踩过她的石头。" },
          ],
        },
        {
          id: "k30w3", trust: 5, en: "Snout the Mole", zh: "鼹鼠斯瑙特",
          statements: [
            { id: "k30s9", claim: "k30c1", en: "I keep the cairn's foot under the moss. At the second bell a bird walked past me, heavy at the front, and it smelled of bronze and raven.", zh: "我守石堆脚下苔里。二更一只鸟从我旁边走过，前头沉，身上是铜和乌鸦的味。" },
            { id: "k30s10", claim: "k30c2", en: "The tortoise's shell was cold in the same place all night. I know cold stone when I put my nose to it.", zh: "陆龟的壳整夜在同一个地方，凉着。我把鼻子贴上去，就认得冷石头。" },
            { id: "k30s11", claim: "k30c2", en: "A tortoise cannot climb a cairn and cannot grip a mirror with a beak. The court may put his shell against the scrape and see which of them is worn.", zh: "陆龟爬不上石堆，也不能用喙抓住镜子。法庭尽管把他的壳摆到刮痕旁边，看是谁磨的。" },
            { id: "k30s12", claim: "k30c1", en: "The thing that walked past me stopped at the cairn's face and pushed. I heard the bronze ring once against the stone, and then it went up.", zh: "从我旁边走过去的东西，在石堆正面停下，推了一下。我听见铜在石头上响了一声，然后就上去了。" },
          ],
        },
      ],
      presses: [
        { id: "k30p1", witness: "k30w2", with: "k30s12", claim: "k30c1", cost: 2, en: "You keep the far ash and saw a raven cross with something bright. The mole heard the bronze ring and go up, and the scrape runs one way only. Put the mirror's story to the court: what crossed, what rang, and what never came back.", zh: "你守白蜡树，看见一只乌鸦衔着亮东西过去。鼹鼠听见铜响了一声就上去了，刮痕只朝一个方向。把镜子的故事摆到法庭上：什么过去了，什么响了，什么再没回来。" },
        { id: "k30p2", witness: "k30w1", with: "k30e2", claim: "k30c1", cost: 1, en: "You warm on the top stone and felt it jump at the third bell. A raven's feather is split with bronze dust in it. Tell the court what landed heavy and left light.", zh: "你在顶石上晒太阳，觉出三更石头跳了一下。一根乌鸦羽毛裂着，缝里嵌着铜屑。告诉法庭，什么落下来时沉，走时轻。" },
        { id: "k30p3", witness: "k30w3", with: "k30e3", claim: "k30c1", cost: 1, en: "You keep the foot and smelled bronze and raven at the second bell. The claw-prints on the top stone are deep at the front. Tell the court what walked past you, and what it pushed before it went up.", zh: "你守石堆脚，二更闻到铜和乌鸦的味。顶石上的爪印前头深。告诉法庭什么从你旁边走过，上去之前又推了什么。" },
        { id: "k30p4", witness: "k30w1", with: "k30e4", claim: "k30c2", cost: 1, en: "You say the tortoise was under the wall all night. A tortoise pushes with the front of its shell, and the scrape on the drystone runs high, above a shell's reach. Tell the court what made it, if not a bird.", zh: "你说陆龟整夜在墙根下。陆龟用壳的前头推，可干石上的刮痕在高处，壳够不到。告诉法庭，要不是鸟，是什么弄出来的。" },
        { id: "k30p5", witness: "k30w3", with: "k30s10", claim: "k30c2", cost: 1, en: "You say the tortoise's shell was cold in one place all night. A tortoise cannot climb a cairn. Tell the court why his shell is answer enough, and why the mirror is not his.", zh: "你说陆龟的壳整夜凉在一个地方。陆龟爬不上石堆。告诉法庭，为什么他的壳就够答话了，镜子又为什么不是他的。" },
      ],
      vouches: [
        { id: "k30v1", witness: "k30w2", exhibit: "k30e1", claim: "k30c1", en: "The crow saw the raven cross with something bright and the mirror was found on the raven's ledge with the cairn's moss in its rim. Believe the crow about the crossing, and the mirror about the ledge.", zh: "乌鸦看见那只乌鸦衔着亮东西过去，镜子在乌鸦岩台上找到，框里还嵌着石堆的苔。信乌鸦讲的那一趟，也信镜子讲的岩台。" },
        { id: "k30v2", witness: "k30w1", exhibit: "k30e2", claim: "k30c1", en: "The lizard felt the stone jump and the feather holds bronze dust. A lizard does not invent a jump it felt under its belly; believe the lizard about the landing.", zh: "蜥蜴觉出石头跳了，羽毛里嵌着铜屑。蜥蜴不会编造肚子底下的一跳；信蜥蜴讲的落地。" },
        { id: "k30v3", witness: "k30w3", exhibit: "k30e3", claim: "k30c1", en: "The mole smelled bronze and raven before the third bell and the claw-prints are deep in front. The mole lives under the stone and has no quarrel with the bird; believe the mole.", zh: "鼹鼠三更前闻到铜和乌鸦的味，爪印前头深。鼹鼠住在石头底下，和那只鸟没仇；信鼹鼠。" },
        { id: "k30v4", witness: "k30w3", exhibit: "k30e4", claim: "k30c2", en: "The mole knows cold shell from cold stone. The tortoise's shell never moved, and the scrape is a bird's one-way road. Believe the mole about the shell.", zh: "鼹鼠分得清冷壳和冷石。陆龟的壳一夜没动，刮痕是鸟的单程路。信鼹鼠讲的壳。" },
      ],
      claims: [
        { id: "k30c1", accused: "raven", statements: ["k30s1", "k30s2", "k30s3", "k30s4", "k30s14", "k30s5", "k30s6", "k30s7", "k30s8", "k30s9"], exhibits: ["k30e1", "k30e2", "k30e3", "k30e4", "k30e5"], en: "Ash landed on the cairn, gripped the bronze mirror, carried it along the drystone to the ledge and left the moss in its rim", zh: "阿什落在石堆上，抓住铜镜，沿干石把它带到岩台，镜框里还留着石堆的苔" },
        { id: "k30c2", accused: "tortoise", statements: ["k30s10", "k30s11"], exhibits: ["k30e3"], en: "Grit climbed the cairn in the dark, pushed the mirror off its notch and carried it down in his shell", zh: "格里特摸黑爬上石堆，把镜子从槽里推下来，用壳驮走了" },
        { id: "k30c3", accused: "shrew", statements: ["k30s9"], exhibits: ["k30e4"], en: "Quill came over the cairn's foot, dragged the mirror down the drystone and hid it in the wall", zh: "奎尔从石堆脚过来，把镜子沿干石拖下去，藏在墙里" },
      ],
    },
    /* k31-k40 - the tower tier, and its dial is the mud a question throws. A
     * press may name a `taints` witness: the question drags that neighbour's
     * name through the same mud it opens, and the bench believes the neighbour
     * less for it - `taintCost` points of trust, one unless the case says
     * otherwise - until a corroboration mends them. Structurally nothing
     * before the tier names a taint, so every shipped press costs exactly what
     * it cost. The cases walk the same ground the endgame walked - a toll tin,
     * a cellar, a nest, a sluice - with the mud thrown deeper rung by rung:
     * one taint at one point on the first case, three tainted questions by the
     * last, the deepest at four points against a bar of two. Every number
     * below is re-measured by the release gate through the module's own
     * prover, which is deterministic - there are no seeds to pin. The bands
     * open above k30's 32 and climb strictly (33 to 42); cutting the taint out
     * of any tier press leaves a cheaper sound line on the same docket, and
     * playing the tainted press without its mending lands the verdict in
     * doubt - the prover's own numbers, never a guess. */
    {
      id: "k31", labelKey: "ctaCase31", time: 21, culprit: "kingfisher",
      bar: { strength: 32, trust: 3 },
      charge: {
        en: "The toll tin hung on the ferry post at dusk with the crossing pennies in it, and at dawn it hung empty with the latch still shut. One charge here rests on a witness a tainted question would drag down, so the court must sweep up the mud its own question throws before it closes.",
        zh: "黄昏时渡口的费钱罐挂在渡桩上，里面是过渡的铜子；天亮时罐子还挂着，锁扣没开，里面却空了。这里的一条指控，压在一位会被带泥的问题拖下水的证人身上——法庭得先扫清自己这一问溅出的泥，才好结案。",
      },
      suspects: [
        { id: "kingfisher", en: "Dart the Kingfisher", zh: "翠鸟达特" },
        { id: "water-rat", en: "Rill the Water Rat", zh: "水鼠里尔" },
        { id: "moorhen", en: "Skerry the Moorhen", zh: "黑水鸡斯凯丽" },
      ],
      exhibits: [
        { id: "k31e1", weight: 3, en: "The toll tin's latch is bent up at one corner, pried by something narrow and hard, and the tin's lid still carries the print of that pry.", zh: "费钱罐的锁扣一角被撬得翘起，撬它的东西又窄又硬；罐盖上还留着那一撬的印子。" },
        { id: "k31e2", weight: 3, en: "A kingfisher's drop of white and a blue body-feather lie together on the post's top, fresh with the morning's first light.", zh: "渡桩顶上并排落着一点翠鸟的白粪和一根蓝身子羽，还是今晨头一茬光里新的。" },
        { id: "k31e3", weight: 3, en: "Pennies lie in the mud below the post in a scatter that starts under the tin and runs toward the water, not away from it.", zh: "铜子散在桩下的泥里，散落的方向从罐底下起头、朝着水去，不是背着水去的。" },
        { id: "k31e4", weight: 3, en: "The rat's run along the bank passes the post but shows no claw-mark on the post itself, and the mud at its foot is unbroken.", zh: "水鼠沿岸的跑道经过渡桩，可桩身上没有爪痕，桩脚的泥也没破。" },
        { id: "k31e5", weight: 3, en: "A blue body-feather floats in the pool below the willow, and the oil on it beads the water it floats on.", zh: "柳树下的水塘里漂着一根蓝身子羽，羽上的油把托着它的水顶出一圈亮珠。" },
        { id: "k31e6", weight: 2, en: "The post's top is ringed with droppings this morning, white over the old grey, and none of it was there at dusk.", zh: "今天早上桩顶围了一圈鸟粪，白的压着旧的灰；黄昏时那儿还什么都没有。" },
      ],
      witnesses: [
        {
          id: "k31w1", trust: 4, en: "Brose the water-rat", zh: "水鼠布罗斯",
          statements: [
            { id: "k31s1", claim: "k31c1", en: "I run the bank at night. The tin was heavy at dusk - I heard the pennies settle when the wind shook the post.", zh: "我夜里沿岸跑。黄昏时罐子是沉的——风摇渡桩的时候，我听见铜子在里头作响。" },
            { id: "k31s2", claim: "k31c1", en: "A rat could climb that post, but the mud at its foot was unbroken at dawn, and my run passes it twice a night. If a rat had climbed, the mud would say so.", zh: "鼠爬得上那根桩，可天亮时桩脚的泥没破；我的跑道一夜经过它两回。要是有鼠爬过，泥会说出来的。" },
            { id: "k31s3", claim: "k31c1", en: "The latch was still shut at dawn and the pennies were gone. A rat takes a tin down to open it; nothing carried the tin away.", zh: "天亮时锁扣还关着，铜子却没了。鼠会连罐拖下来再撬；可罐子没被带走。" },
          ],
        },
        {
          id: "k31w2", trust: 4, en: "Pile the moorhen", zh: "黑水鸡派尔",
          statements: [
            { id: "k31s4", claim: "k31c1", en: "I nest past the reeds and I saw a blue streak come off the post top at first light, low and fast, toward the far bank.", zh: "我在苇子那头做窝。头一茬光里，我看见一道蓝影从桩顶蹿下去，又低又快，直奔对岸。" },
            { id: "k31s5", claim: "k31c1", en: "A moorhen cannot pry a latch shut with a bent corner. My bill is a reed-cutter, not a pry.", zh: "黑水鸡撬不出翘角的锁扣。我的嘴是割苇子的，不是撬东西的。" },
            { id: "k31s6", claim: "k31c1", en: "The kingfisher's perch is the willow right over the ferry; he dives past that post a dozen times a day and he weighs nothing.", zh: "翠鸟的落脚点就在渡口上头那棵柳树；他一天从那根桩边掠过十几回，身上一点分量都没有。" },
          ],
        },
        {
          id: "k31w3", trust: 4, en: "Dart the kingfisher", zh: "翠鸟达特",
          statements: [
            { id: "k31s7", claim: "k31c1", en: "I fish the pool below the willow. I take minnows, not pennies; a penny is worth nothing in my beak and heavier than my breakfast.", zh: "我在柳树下的水塘捕鱼。我叼小鱼，不叼铜子；铜子在我嘴里一文不值，还比我的早饭沉。" },
            { id: "k31s8", claim: "k31c1", en: "I was on the willow from the last bell to first light. I saw nothing on the post, because I sleep with my head under my wing.", zh: "从末次钟到头一茬光，我都在柳树上。桩上有什么我没看见——我睡觉时头埋在翅膀底下。" },
          ],
        },
      ],
      presses: [
        { id: "k31p1", witness: "k31w1", with: "k31e4", claim: "k31c1", cost: 1, en: "You say the mud would tell on a climbing rat. Here is the unbroken mud and your own run past it twice a night. Tell the court what the mud says about you.", zh: "你说泥会作证鼠爬过桩。泥就在这儿，没破；你的跑道一夜两回打它旁边过。说说看，泥对你自己说了什么。" },
        { id: "k31p2", witness: "k31w2", with: "k31e3", claim: "k31c1", cost: 1, taints: "k31w3", taintCost: 1, en: "You saw a blue streak and now the pennies scatter toward the water. A moorhen picks the mud too, and a moorhen's bill pries reed joints open all day. Say why the scatter is not yours - and mind you do not drag the fisher's name through it to save your own.", zh: "你看见蓝影，如今铜子又朝着水散。黑水鸡也拾泥里的东西，整天用嘴撬苇节。说说这摊铜子为什么不是你拿的——可别为了洗清自己，把捕鱼那位拖下水。" },
        { id: "k31p3", witness: "k31w3", with: "k31e2", claim: "k31c1", cost: 1, en: "You sleep with your head under your wing, and yet a drop and a feather sit on the post top, fresh. A kingfisher's own sign is under your beak. Say what a court should make of a bird whose sign outvotes his sleep.", zh: "你说睡觉时头埋在翅膀底下，可桩顶上明明落着一摊粪一根羽，还新鲜着。你自己的凭据就在嘴边。说说看，一只鸟的凭据和他的瞌睡，法庭该信哪个。" },
        { id: "k31p4", witness: "k31w1", with: "k31e1", claim: "k31c2", cost: 1, en: "You say a rat takes the tin down to open it. Here is the pry-mark, and the tin still hangs. Say what pries a latch on the post itself, with the tin never coming down.", zh: "你说鼠会把罐子拖下来再撬。撬痕就在这儿，罐子却还挂着。说说看，罐子没下来，锁扣是在桩上被什么撬开的。" },
      ],
      vouches: [
        { id: "k31v1", witness: "k31w1", exhibit: "k31e4", claim: "k31c1", en: "The bank run is the rat's own road and it passes the post twice a night; believe the rat about the road he keeps.", zh: "沿岸的跑道是水鼠自己走的路，一夜两回打桩边过；关于他守着的这条路，信水鼠的。" },
        { id: "k31v2", witness: "k31w3", exhibit: "k31e2", claim: "k31c1", en: "The feather on the post is the blue streak's own. The moorhen saw what flew, and the feather says whose it was; believe the kingfisher's sign over the moorhen's eye.", zh: "桩上那根羽就是蓝影留下的。黑水鸡看见的是飞过去的那个，羽毛说明了它是谁的；信翠鸟的凭据，胜过信黑水鸡的眼。" },
        { id: "k31v3", witness: "k31w2", exhibit: "k31e5", claim: "k31c1", en: "The moorhen saw the blue streak leave the post at first light, and the feather in the pool below the willow still beads its oil. A moorhen's eye is the pond's own eye; believe her about the flight she saw.", zh: "黑水鸡看见头一茬光里那道蓝影离开桩顶；柳树下水塘里那根羽，油还珠一样顶着水。黑水鸡的眼就是这口塘的眼；关于她看见的那一趟，信她的。" },
      ],
      claims: [
        { id: "k31c1", accused: "kingfisher", statements: ["k31s1", "k31s2", "k31s3", "k31s4", "k31s5", "k31s6", "k31s7", "k31s8"], exhibits: ["k31e1", "k31e2", "k31e3", "k31e4", "k31e5", "k31e6"], en: "Dart pried the toll tin's latch on the post and let the pennies fall to the water, scattering them toward the pool where he fishes", zh: "达特撬开桩上费钱罐的锁扣，让铜子落进水里，散在他捕鱼的水塘那边" },
        { id: "k31c2", accused: "water-rat", statements: ["k31s1", "k31s3"], exhibits: ["k31e4"], en: "Rill climbed the post in the dark, pried the latch and carried the pennies down his run", zh: "里尔摸黑爬上渡桩，撬开锁扣，把铜子顺着跑道搬走了" },
        { id: "k31c3", accused: "moorhen", statements: ["k31s4"], exhibits: ["k31e3"], en: "Skerry picked the mud for pennies at dawn and scattered the rest toward the water", zh: "斯凯丽天亮时在泥里拾铜子，把剩下的朝着水那边扒散了" },
      ],
    },
    {
      id: "k32", labelKey: "ctaCase32", time: 22, culprit: "squirrel",
      bar: { strength: 33, trust: 3 },
      charge: {
        en: "The walnut cellar under the snag was shuttered for winter, and at first frost the shutters stood open and the store was gone. Two questions here drag the same neighbour's name through the mud, and only two mendings set the name straight again.",
        zh: "枯树底下的核桃窖入冬前封好了门；头一场霜下来，窖门开着，存粮没了。这案子里两问都把同一位邻居的名字拖进泥里，也只有两回作证能把名字洗干净。",
      },
      suspects: [
        { id: "squirrel", en: "Furl the Squirrel", zh: "松鼠弗尔" },
        { id: "jay", en: "Cass the Jay", zh: "松鸦卡斯" },
        { id: "woodmouse", en: "Pip the Wood Mouse", zh: "林鼠皮普" },
      ],
      exhibits: [
        { id: "k32e1", weight: 4, en: "The cellar's shutter is gnawed at the lift-edge in paired gouges a jaw's width apart, and a curl of snag-wood still hangs in the bite.", zh: "窖门的提边上有一对对牙啃的豁口，豁口间距正好一张嘴的宽，咬口里还挂着一卷枯树木屑。" },
        { id: "k32e2", weight: 4, en: "Walnut shells in a drift against the snag's north side, cracked in two clean halves, each half licked empty.", zh: "枯树北面堆着扇形的核桃壳，都裂成干净的两半，每半都舔得干干净净。" },
        { id: "k32e3", weight: 3, en: "A grey tail-hair caught in the shutter's bite, kinked the way a squirrel's tail-hair kinks.", zh: "窖门咬口里挂着一根灰尾毛，弯的，弯法正是松鼠尾毛的弯法。" },
        { id: "k32e4", weight: 3, en: "A jay's blue wing-feather on the cellar roof, whole and unruffled, with no husk-dust anywhere on the stone.", zh: "窖顶上一根松鸦蓝翅羽，完整平整；石头上哪儿都没有壳屑。" },
        { id: "k32e5", weight: 3, en: "The squirrel's drey hangs in the snag's crown, and the drey's floor is packed with walnut husk, still green with the season.", zh: "松鼠的窝就挂在枯树顶上；窝底垫满了核桃壳，还带着这个季节的青气。" },
        { id: "k32e6", weight: 3, en: "The frost line stops at the snag's waist, and every gouge on the shutter sits above it, cut after the cold came down.", zh: "霜线停在枯树的腰上；窖门上每一道豁口都在霜线以上——都是霜降之后啃的。" },
      ],
      witnesses: [
        {
          id: "k32w1", trust: 4, en: "Cass the jay", zh: "松鸦卡斯",
          statements: [
            { id: "k32s1", claim: "k32c1", en: "I fly the glade at dusk. The shutters were fast when the frost came down, and the gnawing is fresh above the frost line.", zh: "黄昏时我在林间空地飞。霜下来的时候窖门还扣得紧紧的；啃痕是新的，就在霜线以上。" },
            { id: "k32s2", claim: "k32c1", en: "A jay carries one acorn at a time and screams about it. Nobody has ever heard a jay keep a cellar quiet through a whole night.", zh: "松鸦一回衔一颗橡子，还叫得满林子都听见。谁也没听说过松鸦能整夜不出声地守着一窖粮。" },
          ],
        },
        {
          id: "k32w2", trust: 4, en: "Pip the wood mouse", zh: "林鼠皮普",
          statements: [
            { id: "k32s3", claim: "k32c1", en: "I run under the leaves. The shells are licked clean in both halves, and a mouse cannot crack a walnut - I have tried all my life and the nut wins.", zh: "我在落叶底下跑。壳是两半都舔干净的；鼠咬不开核桃——我试了一辈子，赢的总是核桃。" },
            { id: "k32s4", claim: "k32c1", en: "The drift of shells leans north, against the wind that night. Whoever cracked them sat on the north side and tossed them over a shoulder.", zh: "壳堆朝北歪，顶着那夜的风。嗑壳的那位坐在北面，嗑完往肩后一扔。" },
          ],
        },
        {
          id: "k32w3", trust: 4, en: "Furl the squirrel", zh: "松鼠弗尔",
          statements: [
            { id: "k32s5", claim: "k32c1", en: "I bury my own nuts and I forget half of them. I did not need this cellar; I had my own maps.", zh: "我自己埋的核桃自己都忘一半。我不缺这一窖；我自己有图。" },
            { id: "k32s6", claim: "k32c1", en: "The snag is two jumps from my drey. I cross that roof twice a day in autumn, but crossing is not gnawing.", zh: "枯树离我的窝两跳远。秋天我一天打窖顶过两回，可路过不是啃。" },
          ],
        },
      ],
      presses: [
        { id: "k32p1", witness: "k32w1", with: "k32e4", claim: "k32c1", cost: 1, en: "You say a jay screams about every acorn. Here is your own feather on the cellar roof and not a husk on the stone. Say what a jay was doing at the roof of a robbed cellar, screaming or not.", zh: "你说松鸦得了橡子必叫。你的羽毛就在被劫的窖顶上，石头上却一粒壳屑都没有。叫也好不叫也好，说说一只松鸦在窖顶上做什么。" },
        { id: "k32p2", witness: "k32w3", with: "k32e1", claim: "k32c1", cost: 1, taints: "k32w2", taintCost: 1, en: "You say crossing is not gnawing, and here are paired gouges a jaw apart. A wood mouse gnaws too, and small. Say whose jaw the bite is - and do not hang it on the mouse under the leaves to keep it off your own drey.", zh: "你说路过不是啃，可成对的豁口就在这儿，间距一张嘴的宽。林鼠也会啃，嘴还小。说说这一口是谁的嘴——别顺手挂到落叶底下的鼠身上，好摘了你自己的窝。" },
        { id: "k32p3", witness: "k32w2", with: "k32e2", claim: "k32c1", cost: 1, en: "You say a mouse cannot crack a walnut. The drift leans north against the wind, and a squirrel sits its tail on the north side to crack. Say what else licks both halves clean.", zh: "你说鼠咬不开核桃。壳堆顶着风朝北歪，松鼠嗑壳就爱把尾巴坐在北面。说说看，还有谁能把两半壳都舔得这么干净。" },
        { id: "k32p4", witness: "k32w1", with: "k32e1", claim: "k32c2", cost: 1, en: "You fly the glade at dusk and the frost line tells you the bite is fresh. A jay's eye is the sharpest in the glade. Say why your eye found no bird at the shutters that night.", zh: "黄昏你在这片空地飞，霜线告诉你咬痕是新的。松鸦的眼是全林子最尖的。说说那夜你的眼为什么没在窖门上看见一只鸟。" },
      ],
      vouches: [
        { id: "k32v1", witness: "k32w3", exhibit: "k32e3", claim: "k32c1", en: "The tail-hair in the bite kinks the squirrel's way, and a kink is a name. Believe the hair over the drey two jumps away.", zh: "咬口里那根尾毛的弯法是松鼠的弯法；弯法就是名字。信这根毛，别信两跳之外那个窝。" },
        { id: "k32v2", witness: "k32w2", exhibit: "k32e2", claim: "k32c1", en: "The wood mouse told the court about the shells because the shells were all a mouse could do. Believe the mouse about the cracking he cannot do.", zh: "林鼠把壳的事讲给法庭，是因为壳的事就是一只鼠能做的全部。关于他做不出的那一口，信他的话。" },
        { id: "k32v3", witness: "k32w1", exhibit: "k32e4", claim: "k32c1", en: "The jay's feather sits unruffled on the cellar roof and the stone under it is clean of husk; a jay that cracked a cellar open carries the dust of it in her wings. Believe the jay about the roof she kept, and the stone about the night.", zh: "松鸦的羽毛平平地落在窖顶上，底下的石头上一点壳屑都没有；撬开那口窖的松鸦，翅膀里总该带着屑。关于她守的那块窖顶，信松鸦的；那一夜，信石头的。" },
      ],
      claims: [
        { id: "k32c1", accused: "squirrel", statements: ["k32s1", "k32s2", "k32s3", "k32s4", "k32s5", "k32s6"], exhibits: ["k32e1", "k32e2", "k32e3", "k32e4", "k32e5", "k32e6"], en: "Furl gnawed the cellar shutters open from the north side and cracked the winter store clean over two nights", zh: "弗尔从北面啃开窖门，两夜把过冬的存粮嗑得干干净净" },
        { id: "k32c2", accused: "jay", statements: ["k32s1", "k32s2"], exhibits: ["k32e4"], en: "Cass lifted the shutter with her bill and flew the walnuts off one at a time", zh: "卡斯用嘴掀起窖门，把核桃一颗一颗叼走了" },
        { id: "k32c3", accused: "woodmouse", statements: ["k32s3", "k32s4"], exhibits: ["k32e1"], en: "Pip opened the cellar from under the leaves and hauled the store away in pairs", zh: "皮普从落叶底下开的窖，把存粮一对一对拖走了" },
      ],
    },
    {
      id: "k33", labelKey: "ctaCase33", time: 23, culprit: "moorhen",
      bar: { strength: 34, trust: 2 },
      charge: {
        en: "The reed nest on the mill pond held five coot eggs at dusk and five moorhen eggs at dawn, and one coot nest stands robbed behind the reeds. The court's best question here muddies a neighbour two points deep, and nothing but a corroboration washes it.",
        zh: "磨坊塘苇丛里的窝，黄昏时是五个白骨顶的蛋，天亮时成了五个黑水鸡的蛋；苇子后头有一处白骨顶的窝被掏了。这案子里法庭最好的一问会把邻居拖进两指深的泥里，也唯有作证能洗净。",
      },
      suspects: [
        { id: "moorhen", en: "Skerry the Moorhen", zh: "黑水鸡斯凯丽" },
        { id: "coot", en: "Bald the Coot", zh: "白骨顶波德" },
        { id: "grebe", en: "Crest the Grebe", zh: "鸊鷉克雷斯特" },
      ],
      exhibits: [
        { id: "k33e1", weight: 4, en: "The robbed nest's rim is torn toward the water on one side, in a way a swimming body leaning in makes and a flying body does not.", zh: "被掏的窝沿有一面朝着水撕开，那是游水的身子探进来才撕得出的口子，飞着的身子撕不出。" },
        { id: "k33e2", weight: 4, en: "Two coot down-feathers ride in the moorhen's new nest-lining, still curled from the robbed nest's cup.", zh: "黑水鸡新垫的窝衬里混着两根白骨顶的绒羽，卷曲的样子还是被掏那个窝里的样子。" },
        { id: "k33e3", weight: 4, en: "A wake runs from the robbed nest's mouth to the reed screen, narrow, low and single - one body, swimming, at night.", zh: "一道水纹从被掏的窝口通到苇障，又窄又低，只有一道——夜里一个身子，游过去的。" },
        { id: "k33e4", weight: 3, en: "The grebe's raft lies sunken-flat at its moorings all night, and no egg was ever laid or taken on a raft that flat.", zh: "鸊鷉的浮窝整夜平平地沉在水线，那么平的浮窝，从来放不下也藏不住一枚蛋。" },
        { id: "k33e5", weight: 3, en: "A moorhen's lobed track pads the mud from the reed screen to the robbed nest's mouth, fresh and one-way.", zh: "苇障到被掏的窝口之间的泥上，印着黑水鸡带蹼瓣的脚印，新鲜的，只朝一个方向。" },
        { id: "k33e6", weight: 3, en: "The coot's tally reed at her own nest still shows five nicks, one per egg, cut the evening before.", zh: "白骨顶自家窝边那根记数的苇秆上还有五个刻口，一枚蛋一个；是前一晚刻的。" },
      ],
      witnesses: [
        {
          id: "k33w1", trust: 4, en: "Bald the coot", zh: "白骨顶波德",
          statements: [
            { id: "k33s1", claim: "k33c1", en: "I count my own eggs at dusk; five. I count them again at dawn off the water; none. A coot does not miscount her own nest.", zh: "黄昏我数自己的蛋，五个。天亮再下水数，一个不剩。白骨顶不会数错自己的窝。" },
            { id: "k33s2", claim: "k33c1", en: "The robbers on this pond are divers, not flyers. A flyer leaves a wing-print on the reeds; the reeds are not broken that way.", zh: "这塘里的贼是游水的，不是飞的。飞的会在苇子上留翅膀印；苇子没那样破过。" },
          ],
        },
        {
          id: "k33w2", trust: 4, en: "Crest the grebe", zh: "鸊鷉克雷斯特",
          statements: [
            { id: "k33s3", claim: "k33c1", en: "I dive for fish and I sleep on my raft. My raft was flat all night; a grebe with a stolen egg rides low, and mine rode lower still, but empty of anything but me.", zh: "我潜水抓鱼，睡在自己的浮窝上。我的浮窝整夜平平；叼着赃蛋的鸊鷉吃水更深，我的也沉，可上头除了我什么都没有。" },
            { id: "k33s4", claim: "k33c1", en: "The wake is single and it runs to the reed screen, and the reed screen is one nest wide. Ask the nest what it lined itself with at dawn.", zh: "水纹只有一道，通到苇障；苇障后头就是一个窝的宽。去问那个窝，天亮时它拿什么衬了窝。" },
          ],
        },
        {
          id: "k33w3", trust: 3, en: "Skerry the moorhen", zh: "黑水鸡斯凯丽",
          statements: [
            { id: "k33s5", claim: "k33c1", en: "My five eggs are my own; I laid them over five nights and I sat them before the court knew this pond had a thief.", zh: "我的五个蛋是我自己的；我下了五个晚上，早在法庭知道这塘里有贼之前就孵上了。" },
            { id: "k33s6", claim: "k33c1", en: "A moorhen's nest is a working nest; I line it every morning. What I line it with, the pond sheds and I gather.", zh: "黑水鸡的窝是要天天拾掇的窝；我每天早上都要衬它。衬窝的东西，塘里漂来什么，我拾什么。" },
          ],
        },
      ],
      presses: [
        { id: "k33p1", witness: "k33w1", with: "k33e4", claim: "k33c1", cost: 1, en: "You say the divers did it, and the grebe's raft is the flattest thing on this pond. Say what a flat raft proves about the nest behind the reeds.", zh: "你说贼是游水的，这塘里再没有比鸊鷉浮窝更平的东西了。说说那么平的浮窝，跟苇子后头那个被掏的窝有什么关系。" },
        { id: "k33p2", witness: "k33w3", with: "k33e2", claim: "k33c1", cost: 1, taints: "k33w1", taintCost: 2, en: "You line your nest every morning with what the pond sheds. Two coot feathers ride in your lining, still curled. Say whose cup they were curled in - and do not count the robbed nest's owner a miscounting fool to keep them yours.", zh: "你说你的窝每天早上都用塘里漂来的东西衬。你的窝衬里混着两根白骨顶的绒羽，卷曲如故。说说它们原先蜷在谁的窝里——可别把被掏窝的那位说成数错蛋的糊涂虫，好把蛋说成你的。" },
        { id: "k33p3", witness: "k33w2", with: "k33e3", claim: "k33c1", cost: 1, en: "You sleep on your raft and the wake is single. Say what swims this pond at night that is not you, and what it was doing at the robbed nest's mouth.", zh: "你睡在浮窝上，水纹只有一道。说说这塘里夜里游动的除了你还有谁，它在那被掏的窝口做什么。" },
        { id: "k33p4", witness: "k33w1", with: "k33e1", claim: "k33c2", cost: 1, en: "You count your nest twice a day. Here is the rim torn toward the water, torn by a swimmer leaning in. Say what a counting coot was doing asleep while her rim was torn.", zh: "你一天数两回自己的窝。窝沿就在这儿，朝着水撕开，是游水的身子探进来撕的。说说窝沿被撕的时候，一位天天数蛋的白骨顶在睡什么觉。" },
      ],
      vouches: [
        { id: "k33v1", witness: "k33w1", exhibit: "k33e1", claim: "k33c1", en: "The coot counts her own nest because the nest is hers to lose. Believe the coot about the count she never got wrong before this night.", zh: "白骨顶数自己的蛋，因为窝是她的，丢的是她的。关于她从没数错过的一回，信她。" },
        { id: "k33v2", witness: "k33w2", exhibit: "k33e4", claim: "k33c1", en: "The grebe's raft was flat and empty all night, and the grebe told the court so before anyone asked. Believe the grebe about the raft he sleeps on.", zh: "鸊鷉的浮窝整夜平平、空空，没人问他他自己先说了。关于他睡觉的那只浮窝，信他。" },
        { id: "k33v3", witness: "k33w3", exhibit: "k33e2", claim: "k33c1", en: "The feathers in the lining are the moorhen's own gathering, and a gatherer is not always a thief. Believe the moorhen about what the pond sheds, and the count about whose cup they left.", zh: "衬窝里的羽毛是黑水鸡拾来的，拾东西的不见得就是贼。塘里漂来什么，信她的；那两根羽离开谁的窝，信数出来的。" },
      ],
      claims: [
        { id: "k33c1", accused: "moorhen", statements: ["k33s1", "k33s2", "k33s3", "k33s4", "k33s5", "k33s6"], exhibits: ["k33e1", "k33e2", "k33e3", "k33e4", "k33e5", "k33e6"], en: "Skerry swam the wake to the robbed nest at night, rolled the coot's five eggs into her own lining and let her nest tell the tale", zh: "斯凯丽夜里顺着水纹游到被掏的窝，把白骨顶的五枚蛋卷进自己的窝衬，让窝自己招了供" },
        { id: "k33c2", accused: "grebe", statements: ["k33s3", "k33s4"], exhibits: ["k33e3"], en: "Crest slipped off his raft at the third bell and rolled the eggs through the reed screen", zh: "克雷斯特三更离开浮窝，把蛋从苇障里滚走了" },
        { id: "k33c3", accused: "coot", statements: ["k33s1"], exhibits: ["k33e2"], en: "Bald hid her own eggs in the reeds to claim the mill's feeding ground and cried robbery at dawn", zh: "波德把自己的蛋藏进苇丛，好独占磨坊的食场，天亮时却喊起了被盗" },
      ],
    },
    {
      id: "k34", labelKey: "ctaCase34", time: 24, culprit: "dormouse",
      bar: { strength: 35, trust: 3 },
      charge: {
        en: "The bee-bread crocks in the orchard wall were sealed with clay in autumn, and at the first warm night every seal was lifted whole and the crocks scooped. Two questions here drag two different neighbours, one two points deep, and the court must mend both before it closes.",
        zh: "果园墙里的蜂窝粮坛入秋就用泥封好了；头一个暖夜，封泥被整块起走，坛被掏空。这案子里两问各拖了一位邻居，一处两指深——法庭得把两处都洗净才能结案。",
      },
      suspects: [
        { id: "dormouse", en: "Hank the Dormouse", zh: "睡鼠汉克" },
        { id: "hedgehog", en: "Brack the Hedgehog", zh: "刺猬布拉克" },
        { id: "wren", en: "Kex the Wren", zh: "鹪鹩凯克斯" },
      ],
      exhibits: [
        { id: "k34e1", weight: 4, en: "Every clay seal is lifted in one piece and set down beside its crock, unbroken - a claw small enough to feel the seam and patient enough to keep it whole.", zh: "每一块封泥都整块起出、又搁在坛边，一点没碎——那是小得能摸出泥缝、又有耐性不弄破的爪子干的。" },
        { id: "k34e2", weight: 4, en: "A dormouse's drop, dry and pale, sits on the third crock's shoulder, and a dormouse hair rides in the lifted clay beside it.", zh: "第三个坛肩上有一粒睡鼠的粪，干而发白；旁边起下的封泥里还夹着一根睡鼠毛。" },
        { id: "k34e3", weight: 4, en: "The wall's weep-holes are clean of clay crumbs the whole length, so the seals were never carried far and never dropped.", zh: "整条墙的泄水孔都干干净净，没有泥屑——封泥没被搬远，也没掉过。" },
        { id: "k34e4", weight: 3, en: "A hedgehog track under the wall turns back on itself at the third crock, twice, in the manner of a body that found nothing worth the climb.", zh: "墙根下一道刺猬的脚印，在第三个坛前折了两回——像个什么都没找到、觉得不值得爬的身子走出来的。" },
        { id: "k34e5", weight: 3, en: "The ivy up the orchard wall carries a rubbed strip at dormouse height, and a hair from the strip matches the hair in the lifted clay.", zh: "果园墙上的藤在睡鼠那么高的地方磨出了一条光带；带子里的一根毛，和封泥里那根对得上。" },
        { id: "k34e6", weight: 3, en: "The crocks' wax lids are scored all the way round from underneath, the way a hand works a lid loose instead of a beak knocking one off.", zh: "坛口的蜡盖从底下被划了一整圈——那是一双手起盖子的手法，不是一张嘴啄开的路数。" },
      ],
      witnesses: [
        {
          id: "k34w1", trust: 4, en: "Brack the hedgehog", zh: "刺猬布拉克",
          statements: [
            { id: "k34s1", claim: "k34c1", en: "I sniff the wall every night for grubs. The seals were whole at dusk and the clay smell still held; whatever lifted them came after I turned back.", zh: "我夜夜沿着墙嗅虫子。黄昏时封泥都完整，泥味还没散；起封泥的那位，是在我回头之后来的。" },
            { id: "k34s2", claim: "k34c1", en: "A hedgehog cannot open a seam without breaking it. I have broken three crocks in my life and I broke them honestly, by standing on them.", zh: "刺猬开泥封，没法不弄破。我这辈子弄破过三个坛子，都是实打实踩破的。" },
            { id: "k34s3", claim: "k34c1", en: "My track turns back at the third crock because the grubs ended there. The wall goes on; my supper did not.", zh: "我的脚印在第三个坛前折回来，是因为虫子到那儿就没了。墙还长着；我的晚饭没有了。" },
          ],
        },
        {
          id: "k34w2", trust: 4, en: "Kex the wren", zh: "鹪鹩凯克斯",
          statements: [
            { id: "k34s4", claim: "k34c1", en: "I wake before the worms do. At the warm night's first light a small round body slipped out of the wall's crack and went up the ivy heavy.", zh: "我比虫子醒得早。那个暖夜头一茬光里，一个圆滚滚的小身子从墙缝里溜出来，沉沉地顺着藤爬上去。" },
            { id: "k34s5", claim: "k34c1", en: "A wren cannot lift a clay seal whole; my bill lifts twigs. But a dormouse's hands lift seals the way a thief lifts lids - gently, and often.", zh: "鹪鹩的嘴只能掀树枝，整块起封泥是起不动的。可睡鼠的手起封泥，就像贼起盖子——又轻又熟。" },
          ],
        },
        {
          id: "k34w3", trust: 5, en: "Hank the dormouse", zh: "睡鼠汉克",
          statements: [
            { id: "k34s6", claim: "k34c1", en: "I sleep the warm nights through in the beam bank; ask the beetles if I stirred. Bee-bread is wasp work to dig and I am not a wasp.", zh: "暖夜里我在梁土里睡到天亮；问虫子去，我动没动。蜂窝粮要黄蜂的力气才掏得动，我不是黄蜂。" },
            { id: "k34s7", claim: "k34c1", en: "The crocks sit above my beam bank and I have passed them all summer without a look. Passing is not scooping.", zh: "那些坛子就在我梁土的上头，我整个夏天打它们跟前过，一眼都没多看。路过不是掏。" },
          ],
        },
      ],
      presses: [
        { id: "k34p1", witness: "k34w1", with: "k34e4", claim: "k34c1", cost: 1, en: "You turned back at the third crock, you say, for the grubs ended. Here is your track turning twice. Say what a grubs-ended hedgehog smells like from the fourth crock on.", zh: "你说虫子到第三个坛就没了，你才回头。你的脚印在这儿，折了两回。说说看，从第四个坛起，一只没虫可吃的刺猬闻起来是什么味。" },
        { id: "k34p2", witness: "k34w2", with: "k34e2", claim: "k34c1", cost: 1, taints: "k34w3", taintCost: 2, en: "You saw a small round body heavy up the ivy, and the third crock's shoulder carries a dormouse's drop. Say the body's name - and do not soften it by making the beam bank a sleeper's alibi.", zh: "你看见一个圆滚滚的小身子沉沉地爬上藤，第三个坛肩上还有一粒睡鼠的粪。把那个身子的名字说出来——别把它说轻了，把梁土说成什么瞌睡的不在场。" },
        { id: "k34p3", witness: "k34w3", with: "k34e1", claim: "k34c1", cost: 1, en: "You say wasp work, and here are every seal lifted whole. Only a hand lifts clay like that. Say whose hands the court should look at, if not yours.", zh: "你说那得黄蜂的力气，可封泥全都是整块起出来的。那样的活只有手干得出来。如果不是你的手，法庭该看谁的手。" },
        { id: "k34p4", witness: "k34w1", with: "k34e3", claim: "k34c2", cost: 1, taints: "k34w2", taintCost: 1, en: "The weep-holes are clean the whole wall's length, so the seals never travelled. Say what else was awake at the wall that night - and mind, the small brown bird you blame was awake for the worms, not the crocks.", zh: "整条墙的泄水孔都干净，封泥没挪过窝。说说那夜墙头醒着的还有谁——可你怪的那只小棕鸟，醒着是为了虫子，不是为了坛子。" },
        { id: "k34p5", witness: "k34w2", with: "k34e1", claim: "k34c3", cost: 1, en: "You wake before the worms. Say what the wall's crack sounds like when a seal comes out whole, if you were awake to hear it.", zh: "你比虫子醒得早。既然醒着，说说整块封泥出墙时，那墙缝是什么响法。" },
      ],
      vouches: [
        { id: "k34v1", witness: "k34w1", exhibit: "k34e4", claim: "k34c1", en: "The hedgehog's track turned twice and told the truth twice; a turn is not a theft. Believe the hedgehog about the grubs that ended.", zh: "刺猬的脚印折了两回，也说了两回实话；折返不是偷。关于虫子的尽头，信刺猬的。" },
        { id: "k34v2", witness: "k34w3", exhibit: "k34e2", claim: "k34c1", en: "The drop on the crock's shoulder is the dormouse's own and the hair in the clay is his; a drop is a name a body cannot drop twice. Believe the drop over the beam bank.", zh: "坛肩上的粪是睡鼠自己的，封泥里的毛也是他的；粪是身上掉不出去的名字。信这粒粪，别信梁土。" },
        { id: "k34v3", witness: "k34w2", exhibit: "k34e3", claim: "k34c1", en: "The wren wakes for worms and sleeps among twigs; a wren cannot carry what the weep-holes say was never carried. Believe the wren about the wall's quiet.", zh: "鹪鹩为虫子醒，在树枝里睡；泄水孔证明封泥没挪过窝，鹪鹩也确实搬不动它们。关于那面墙的安静，信鹪鹩的。" },
      ],
      claims: [
        { id: "k34c1", accused: "dormouse", statements: ["k34s1", "k34s2", "k34s3", "k34s4", "k34s5", "k34s6", "k34s7"], exhibits: ["k34e1", "k34e2", "k34e3", "k34e4", "k34e5", "k34e6"], en: "Hank lifted every seal whole in the warm night, scooped the bee-bread and went heavy up the ivy to his beam bank", zh: "暖夜里汉克把封泥整块起出、掏空蜂窝粮，沉沉地顺着藤爬回梁土去了" },
        { id: "k34c2", accused: "hedgehog", statements: ["k34s1", "k34s2"], exhibits: ["k34e4"], en: "Brack broke the seals for grubs and stood on the crocks he could not open", zh: "布拉克为虫子破了封泥，还踩开了他打不开的坛子" },
        { id: "k34c3", accused: "wren", statements: ["k34s4", "k34s5"], exhibits: ["k34e3"], en: "Kex lifted the seals for the wax to line her nest", zh: "凯克斯为衬窝掀走封泥，图的是里头的蜡" },
      ],
    },
    {
      id: "k35", labelKey: "ctaCase35", time: 25, culprit: "newt",
      bar: { strength: 36, trust: 2 },
      charge: {
        en: "The eel-grate at the mill race was wired shut against the fry, and at the spring spate the wires stood spread and the fry went down the race. One question here muddies a neighbour three points deep against a bar of two, and only its own mending puts the name back.",
        zh: "磨坊水口的鳗栅为了拦鱼苗用铁丝扎死；春汛一来，铁丝全撑开了，鱼苗顺水口去了。这案子里有一问把邻居拖进三指深的泥，门槛只有两指——唯有它自己的那回作证能把名字捞回来。",
      },
      suspects: [
        { id: "newt", en: "Elm the Newt", zh: "蝾螈埃尔姆" },
        { id: "pike", en: "Gaff the Pike", zh: "狗鱼加夫" },
        { id: "tortoise", en: "Grit the Tortoise", zh: "陆龟格里特" },
      ],
      exhibits: [
        { id: "k35e1", weight: 4, en: "The grate's wires are spread in one wide gap, bent outward, and the bends carry the slick of a small slick body working them loose night after night.", zh: "栅上的铁丝撑开一道大口，向外弯着；弯头上有一层滑腻，是滑腻的小身子一夜一夜把它们拨松留下的。" },
        { id: "k35e2", weight: 4, en: "A newt's cast skin hangs whole on the top wire, folded the way a newt folds when it backs out of its own coat.", zh: "栅顶的铁丝上挂着一张完整的蝾螈蜕，折法正是蝾螈蜕皮时倒退着出来的折法。" },
        { id: "k35e3", weight: 4, en: "Fry scales dust the sill below the spread gap, and no scale lies above it on the dry stone.", zh: "撑开的口下面的门槛上积着一层鱼苗鳞；口上头的干石上，一片鳞也没有。" },
        { id: "k35e4", weight: 4, en: "The tortoise's wall-hole at the race's edge sits dry, webbed with old spiderwork, the way it has sat since the spring before.", zh: "水口边的陆龟墙洞干着，结着陈年的蛛网——打去年春天起就是那个样子。" },
        { id: "k35e5", weight: 4, en: "The spread wires' ends carry fine paired teeth-marks, bright over the old rust, and the pairs march the length of the gap.", zh: "撑开的铁丝头上留着细细的成对牙印，亮的压着旧的锈；一对一对，顺着那道口排到头。" },
        { id: "k35e6", weight: 3, en: "Fry hover at the gap's mouth on the morning after, and the tortoise's wall-hole below the race sits behind them, unused.", zh: "第二天早上，鱼苗就在那道口边上打着转；水口下陆龟的墙洞在它们身后，一动没动。" },
      ],
      witnesses: [
        {
          id: "k35w1", trust: 4, en: "Grit the tortoise", zh: "陆龟格里特",
          statements: [
            { id: "k35s1", claim: "k35c1", en: "I keep the race's edge in flood time. The fry went through at the spate in one bright ribbon, and the ribbon came out of one gap, not many.", zh: "涨水的时候我守在水口边。鱼苗是汛头上过去的，亮亮的一条线；那线只从一个口里出来，不是许多口。" },
            { id: "k35s2", claim: "k35c1", en: "A tortoise cannot spread iron wires. I push with my shell and my shell pushes down, not out.", zh: "陆龟撑不开铁丝。我用壳推，壳只会往下推，不会往外。" },
          ],
        },
        {
          id: "k35w2", trust: 4, en: "Gaff the pike", zh: "狗鱼加夫",
          statements: [
            { id: "k35s3", claim: "k35c1", en: "I hunt the pool below the race. The fry came down to me already scattered, and a pike herds, he does not scatter. Scattered fry are fry that slipped a grate.", zh: "我在水口下面的塘里猎食。鱼苗到我这里时已经散了；狗鱼只会赶，不会散。散了的鱼苗，是从栅上溜下来的鱼苗。" },
            { id: "k35s4", claim: "k35c1", en: "A pike's snout bends wires outward, it is true - if he could hold them. Water does not let a pike hold anything small that long. Say who has hands instead of water.", zh: "狗鱼的吻确实能把铁丝往外顶——只要顶得住。水里可没有谁能那么久地按住一根小铁丝。说说谁有手，不用跟水较劲。" },
          ],
        },
        {
          id: "k35w3", trust: 5, en: "Elm the newt", zh: "蝾螈埃尔姆",
          statements: [
            { id: "k35s5", claim: "k35c1", en: "I sleep in the grate's shade; the shade is mine. A newt could not move a wire a fry could pass through, and a newt does not eat fry.", zh: "我睡在栅荫里；那荫是我的。蝾螈挪不动一根鱼苗钻得过的铁丝，蝾螈也不吃鱼苗。" },
            { id: "k35s6", claim: "k35c1", en: "My skin splits of itself at the spate; every newt's does. A coat left on a wire is no more a crime than a coat left on a fence.", zh: "汛头我的皮自己就裂；每只蝾螈都这样。蜕挂在铁丝上，跟蜕挂在篱笆上一样，不算罪。" },
          ],
        },
      ],
      presses: [
        { id: "k35p1", witness: "k35w1", with: "k35e4", claim: "k35c1", cost: 1, en: "You keep the edge in flood time and your wall-hole sits webbed since last spring. Say what you keep at the edge, if not the sight of the gap opening.", zh: "涨水时你守在水口边，你的墙洞从去年春天起就结着蛛网。说说你守在水口边守的是什么——若不是看着那道口撑开。" },
        { id: "k35p2", witness: "k35w2", with: "k35e2", claim: "k35c1", cost: 1, taints: "k35w3", taintCost: 3, en: "You say scattered fry are fry that slipped a grate, and the grate's own shade hangs a newt's coat. Say the slinker's name three times, if you saw him - and do not lean your whole hunt on a coat the water sheds anyway.", zh: "你说散了的鱼苗就是溜了栅的鱼苗，栅荫上又正挂着一件蝾螈的蜕。既然看见了，把那个溜边的名字连说三遍——可别把整场追猎押在一件水里随时会蜕的皮上。" },
        { id: "k35p3", witness: "k35w3", with: "k35e1", claim: "k35c1", cost: 1, en: "You sleep in the grate's shade and the wires' bends carry a slick. Say what else works a wire loose night after night from inside a shade it owns.", zh: "你睡在栅荫里，铁丝的弯头上有滑腻。说说看，还有什么能一夜一夜、在它自己占着的荫里把铁丝拨松。" },
        { id: "k35p4", witness: "k35w1", with: "k35e3", claim: "k35c2", cost: 1, en: "The fry scales dust the sill under the gap and none lie above. Say where the ribbon began, if not at the gap the wires show.", zh: "鱼苗鳞积在口下面的门槛上，口上头一片也没有。若不是铁丝撑开的那道口，那亮亮的一条线是从哪儿起的头。" },
        { id: "k35p5", witness: "k35w2", with: "k35e1", claim: "k35c3", cost: 1, en: "You herd fry for a living. Say what a herded ribbon does at a gap that was not there the dusk before.", zh: "你赶鱼苗是老本行。说说一队赶拢的鱼苗，撞上前一晚还不存在的那道口，会怎么样。" },
      ],
      vouches: [
        { id: "k35v1", witness: "k35w1", exhibit: "k35e4", claim: "k35c1", en: "The tortoise's hole is webbed and dry and has been since the spring before; a body does not rob through a spider's front door. Believe the tortoise about the edge he keeps.", zh: "陆龟的墙洞干着、结着蛛网，去年春天就这样；没有谁会从蛛网的大门去行窃。关于他守的水口，信陆龟的。" },
        { id: "k35v2", witness: "k35w3", exhibit: "k35e2", claim: "k35c1", en: "The coat on the wire is the newt's own, and a shed coat is a season, not a deed. Believe the newt about the coat, and the bends about the body that worked them.", zh: "铁丝上的蜕是蝾螈自己的；蜕皮是节令，不是罪。蜕的事信蝾螈的；铁丝的弯头，信那双拨松它的身子。" },
        { id: "k35v3", witness: "k35w2", exhibit: "k35e3", claim: "k35c1", en: "The pike read the scattered ribbon before the court did, and a hunter knows his own scatter from another's. Believe the pike about the fry he never touched.", zh: "鱼苗散了，狗鱼比法庭先看出来；猎手认得自己的散场和别人的散场。关于他没碰过的那些鱼苗，信狗鱼的。" },
      ],
      claims: [
        { id: "k35c1", accused: "newt", statements: ["k35s1", "k35s2", "k35s3", "k35s4", "k35s5", "k35s6"], exhibits: ["k35e1", "k35e2", "k35e3", "k35e4", "k35e5", "k35e6"], en: "Elm worked the wires loose from the shade night after night, spread the gap for the spate and let the fry go down the race", zh: "埃尔姆一夜一夜在栅荫里把铁丝拨松，汛前撑开那道口，让鱼苗顺水口去了" },
        { id: "k35c2", accused: "pike", statements: ["k35s3", "k35s4"], exhibits: ["k35e3"], en: "Gaff bent the wires with his snout to herd the fry down to his pool", zh: "加夫用吻顶弯铁丝，把鱼苗赶进自己的塘里" },
        { id: "k35c3", accused: "tortoise", statements: ["k35s1"], exhibits: ["k35e4"], en: "Grit widened his wall-hole under the race and let the fry out at his own door", zh: "格里特把水口下的墙洞拓宽，让鱼苗从自家门口出去" },
      ],
    },
    {
      id: "k36", labelKey: "ctaCase36", time: 26, culprit: "wagtail",
      bar: { strength: 37, trust: 3 },
      charge: {
        en: "The chapel bell's pull-rope was frayed at dusk and cut clean at dawn, and the bell has not rung true since. Two questions here each muddy a different neighbour two points deep, and the court must mend both names before the charge stands.",
        zh: "礼拜堂钟的拉绳黄昏时还只是起毛，天亮时被齐齐割断，钟声从此不正。这案子里两问各拖一位邻居、各两指深——两条名字都洗净了，指控才立得住。",
      },
      suspects: [
        { id: "wagtail", en: "Quill the Wagtail", zh: "鹡鸰奎尔" },
        { id: "bat", en: "Veil the Bat", zh: "蝙蝠维尔" },
        { id: "starling", en: "Murm the Starling", zh: "椋鸟默姆" },
      ],
      exhibits: [
        { id: "k36e1", weight: 4, en: "The rope's cut end shows one clean slice through the laid strands, the slice of a fine hard edge drawn once and true.", zh: "绳的断口把搓紧的股绳一刀过净——那是一口又细又硬的刃，抽过一次，抽得又直又准。" },
        { id: "k36e2", weight: 4, en: "A wagtail lands and walks the bell-loft sill every morning; the sill's dust holds her three-toed walk in a fresh line to the frayed place.", zh: "鹡鸰每天早上都落进钟楼、在门槛上走；槛上的灰留着她三趾的脚印，新鲜的，一直走到起毛的地方。" },
        { id: "k36e3", weight: 4, en: "A strand of the bell-rope hangs in the bat's corner crevice, pulled in and packed like lining.", zh: "钟绳的一股挂在蝙蝠的墙角缝里，抽进去、垫成了衬里。" },
        { id: "k36e4", weight: 4, en: "The starling's roost is the elm off the chapel yard, and the elm's droppings hold no fibre at all on the morning after.", zh: "椋鸟宿在礼拜堂院子外那棵榆树上；第二天早上，榆树下的白粪里一点纤维也没有。" },
        { id: "k36e5", weight: 4, en: "A wagtail's dropping sits on the frayed place of the rope, fresh, white over the rope's old grey.", zh: "拉绳起毛的地方落着一撮鹡鸰的粪，新鲜的，白的压着绳上旧的灰。" },
        { id: "k36e6", weight: 4, en: "The loft doorstone carries three-toed prints in and out, fresh in the dawn damp, and the door was shut at dusk.", zh: "钟楼的门槛石上进进出出印着三趾的脚印，晨潮里还新着；可黄昏时门是关着的。" },
      ],
      witnesses: [
        {
          id: "k36w1", trust: 5, en: "Veil the bat", zh: "蝙蝠维尔",
          statements: [
            { id: "k36s1", claim: "k36c1", en: "I fly the yard between the bells. The rope frayed at dusk, top to bottom, and a fray is worn, not cut. What cut it came after the fraying wore it thin.", zh: "两钟之间我在院子里飞。黄昏时绳是起毛的，从头到脚；起毛是磨出来的，不是割出来的。割它的那位，是等它磨细了才来的。" },
            { id: "k36s2", claim: "k36c1", en: "A bat hangs in crevices and lines them with whatever hangs loose. A strand of rope in my corner is a strand of rope in my corner; the cut was not made by hanging.", zh: "蝙蝠宿在缝里，缝里垫的都是挂得松的东西。我墙角里那股绳，就是一股绳；割口可不是垫窝垫出来的。" },
          ],
        },
        {
          id: "k36w2", trust: 4, en: "Murm the starling", zh: "椋鸟默姆",
          statements: [
            { id: "k36s3", claim: "k36c1", en: "I roost over the yard and I read the yard each dawn. A rope does not cut itself clean in one slice; I have pulled many a thread loose and none of them ends the way that rope ends.", zh: "我在院子里过夜，每天早上把院子读一遍。绳不会自己齐齐地一刀断；我扯过的线头多了，没有一根的断口像那根绳。" },
            { id: "k36s4", claim: "k36c1", en: "The wagtail walks the sill every morning and the sill shows her walk to the very fray. Ask what she walked there for, at an hour when no bell calls anyone.", zh: "鹡鸰天天早上在门槛上走，槛上的灰一直记到起毛的地方。问问她无钟可敲的时辰，去那儿走的什么路。" },
          ],
        },
        {
          id: "k36w3", trust: 5, en: "Quill the wagtail", zh: "鹡鸰奎尔",
          statements: [
            { id: "k36s5", claim: "k36c1", en: "I walk sills for midges; midges bank on warm stone at dawn. A walk is a walk, and a walk does not cut laid rope.", zh: "我在槛上走是为了小蚊虫；天亮时暖石头上蚊子成堆。走就是走，走路割不断搓紧的绳。" },
            { id: "k36s6", claim: "k36c1", en: "My bill is a fly-picker, a soft pick at a hard edge. It has never sliced anything, and it never will.", zh: "我的嘴是拣虫子的嘴，碰上硬边也只能轻轻啄。它什么都没割过，以后也不会。" },
          ],
        },
      ],
      presses: [
        { id: "k36p1", witness: "k36w1", with: "k36e3", claim: "k36c1", cost: 1, en: "You line your corner with whatever hangs loose, and a rope strand hangs there packed like lining. Say when you pulled it in, if the rope was whole at dusk and cut at dawn.", zh: "你的墙角什么松挂什么，一股绳就垫在里头。黄昏绳还是整的，天亮就断了——说说你是什么时候把它拽进缝里的。" },
        { id: "k36p2", witness: "k36w2", with: "k36e1", claim: "k36c1", cost: 1, taints: "k36w3", taintCost: 2, en: "You read the yard each dawn, and the slice is a fine hard edge drawn once. A wagtail's bill is exactly that edge. Say so plainly to the court - and do not soften it by turning a midge-walk into an alibi.", zh: "你每天早上读院子，断口是一口又细又硬的刃抽出来的；鹡鸰的嘴正是这样一口刃。跟法庭直说——别拿什么捉蚊子的散步，把话说软了。" },
        { id: "k36p3", witness: "k36w3", with: "k36e2", claim: "k36c1", cost: 1, taints: "k36w1", taintCost: 2, en: "You pick flies soft, you say, and yet the sill's dust shows your three toes at the fray at first light. Say what a fly-picker was picking at a frayed rope's foot - and do not hang the cut on the crevice's sleeper to be rid of it.", zh: "你说你的嘴软，只会拣虫子；可槛上的灰记着你天亮时三趾走过起毛的绳脚。说说一位拣虫子的在起了毛的绳脚上拣什么——也别为了脱身，把割口挂到缝里睡觉的那位头上。" },
        { id: "k36p4", witness: "k36w2", with: "k36e4", claim: "k36c2", cost: 1, en: "Your droppings hold no fibre the morning after, and a roost that cuts rope eats fibre. Say what a fibre-less roost proves about the sleeper in it.", zh: "第二天早上你的白粪里一点纤维没有；割绳的宿处该吃下纤维。说说一口没有纤维的白粪，替里头睡的那位证明了什么。" },
        { id: "k36p5", witness: "k36w1", with: "k36e1", claim: "k36c2", cost: 1, en: "You fly between the bells and you know the rope's voice. Say what a cut rope does to a bell's voice, and who in the yard gains a quiet bell.", zh: "你在两钟之间飞，你认得钟绳的嗓音。说说割断的绳会把钟声变成什么样，又有什么人图一口安静的钟。" },
        { id: "k36p6", witness: "k36w3", with: "k36e1", claim: "k36c3", cost: 1, en: "You say your bill never sliced anything. Here is one clean slice through laid strands. Say what else in this yard draws an edge once and true.", zh: "你说你的嘴什么都没割过。齐齐的一刀就在这儿。说说这院子里还有谁能把刃抽得又直又准。" },
      ],
      vouches: [
        { id: "k36v1", witness: "k36w1", exhibit: "k36e3", claim: "k36c1", en: "The bat hangs in crevices and lines them; lining is not cutting, and the bat said frayed before anyone said cut. Believe the bat about the fraying.", zh: "蝙蝠宿缝、缝里垫东西；垫不是割。人人说割之前，蝙蝠先说的是起毛。关于起毛，信蝙蝠的。" },
        { id: "k36v2", witness: "k36w2", exhibit: "k36e4", claim: "k36c1", en: "The starling's roost holds no fibre and the starling read the cut for what it was. Believe the starling about the yard he reads every dawn.", zh: "椋鸟的白粪里没有纤维，断口也被他一眼读成了一刀。关于他每天早上读的院子，信椋鸟的。" },
        { id: "k36v3", witness: "k36w3", exhibit: "k36e2", claim: "k36c1", en: "The wagtail's walk was a midge-walk and the midges bank at dawn; the walk put her at the sill, and the sill put her near the fray - near, not at it. Believe the walk about the midges and the court about the slice.", zh: "鹡鸰走槛是为小蚊虫，蚊子天亮时在暖石上成堆；那趟路把她带到了槛上，也把她带到了起毛处——是旁边，不是跟前。走的事信她的，那一刀，信法庭的。" },
      ],
      claims: [
        { id: "k36c1", accused: "wagtail", statements: ["k36s1", "k36s2", "k36s3", "k36s4", "k36s5", "k36s6"], exhibits: ["k36e1", "k36e2", "k36e3", "k36e4", "k36e5", "k36e6"], en: "Quill walked the sill to the frayed rope at first light and cut the strands clean with a bill honed on midges", zh: "奎尔天亮时沿槛走到起毛的绳脚，用一张拣虫子磨利的嘴把绳股齐齐割断" },
        { id: "k36c2", accused: "bat", statements: ["k36s1", "k36s2"], exhibits: ["k36e3"], en: "Veil cut the rope in the dark and hauled the strand in for lining", zh: "维尔夜里割了绳，把那股绳拖进缝里垫了窝" },
        { id: "k36c3", accused: "starling", statements: ["k36s3"], exhibits: ["k36e4"], en: "Murm cut the rope to still a bell that woke his roost", zh: "默姆割了绳，好让吵醒他一窝的钟从此哑了" },
      ],
    },
    {
      id: "k37", labelKey: "ctaCase37", time: 27, culprit: "coot",
      bar: { strength: 38, trust: 2 },
      charge: {
        en: "The mill-sluice's flood boards were drawn at dusk and two stood drawn at dawn, and the millpond mudded the watercress beds below. One question here muddies a neighbour three points deep against a bar of two, and only its own mending puts the name back.",
        zh: "磨坊闸口的挡水板黄昏时都插得好好的，天亮时两块被抽起，塘水浑了下游的豆瓣菜田。这案子里有一问把邻居拖进三指深的泥，而门槛只有两指——唯有它自己的那回作证能把名字捞回来。",
      },
      suspects: [
        { id: "coot", en: "Bald the Coot", zh: "白骨顶波德" },
        { id: "moorhen", en: "Skerry the Moorhen", zh: "黑水鸡斯凯丽" },
        { id: "mallard", en: "Reed the Mallard", zh: "绿头鸭里德" },
      ],
      exhibits: [
        { id: "k37e1", weight: 5, en: "The two drawn boards stand stacked on the sill's dry end, lifted not dropped, with the wet line of their edges still matched.", zh: "两块抽起的挡水板齐齐摞在闸台干处，是搬上去的，不是扔下的；板沿的湿线还一对得齐齐的。" },
        { id: "k37e2", weight: 4, en: "A coot's big lobed foot prints the sill's mud at both drawn slots, and the prints press deeper at the heel than at the toes.", zh: "闸台泥上、两个抽空的槽口边，都印着白骨顶那带蹼瓣的大脚；印子脚跟深、脚趾浅。" },
        { id: "k37e3", weight: 4, en: "The cress beds below wear a fan of fresh silt the morning after, fanned wide exactly where the drawn boards let the pond cut loose.", zh: "第二天早上，下游的豆瓣菜田上蒙着一层新泥扇，扇开的宽窄正好是挡板抽走后塘水撒欢的地方。" },
        { id: "k37e4", weight: 4, en: "The mallard's night stand is the bank gravel above the weir, and the gravel shows no track down to the sluice at all.", zh: "绿头鸭夜里宿在堰上头的砾石岸；砾石上根本没有通到闸口的脚印。" },
        { id: "k37e5", weight: 4, en: "The sill's mud carries the wet line of the two drawn slots, and the boards were never dropped to the mud at all - lifted and stacked dry.", zh: "闸台的泥上留着一道湿线，正是两个抽空槽口的位置；那两块板压根没落到泥里——是干着被摞上去的。" },
        { id: "k37e6", weight: 4, en: "A coot's breast-feather rides the stack's top board, pressed into the wet line while it was still wet.", zh: "摞顶那块板上有一根白骨顶的胸羽，是湿线未干的时候压上去的。" },
      ],
      witnesses: [
        {
          id: "k37w1", trust: 4, en: "Reed the mallard", zh: "绿头鸭里德",
          statements: [
            { id: "k37s1", claim: "k37c1", en: "I sleep on the gravel and I wake with the wind. No board was drawn while I stood the bank; the drawing came in the last dark hour, and the bank is too far back to see it.", zh: "我睡在砾石上，风一吹就醒。我守岸的时候没有板被抽走；抽板是最后那段黑夜里的事，岸离得远，看不见。" },
            { id: "k37s2", claim: "k37c1", en: "A mallard cannot stack wet boards end to end and match their wet lines. My bill drags, it does not stack.", zh: "绿头鸭没法把湿板端端正正摞起来、把湿线对齐。我的嘴只会拖，不会摞。" },
          ],
        },
        {
          id: "k37w2", trust: 5, en: "Skerry the moorhen", zh: "黑水鸡斯凯丽",
          statements: [
            { id: "k37s3", claim: "k37c1", en: "I nest below the cress and I know what silt does to a cress bed. The fan is fresh and the fan is single - one drawing, at one hour, by one body.", zh: "我在豆瓣菜田下游做窝，泥沙毁起菜田来我见得多了。那把泥扇是新的，也只有一把——一次抽板、一个时辰、一个身子。" },
            { id: "k37s4", claim: "k37c1", en: "A moorhen's foot is small and light on a sill; my prints never press heel-deep in sill mud. The prints at the slots are not mine.", zh: "黑水鸡的脚小而轻，落在闸台的泥上从没压出过跟深的印。槽口边的印子不是我的。" },
          ],
        },
        {
          id: "k37w3", trust: 3, en: "Bald the coot", zh: "白骨顶波德",
          statements: [
            { id: "k37s5", claim: "k37c1", en: "I dive for weed all day and sleep in the reeds at night. The cress below is every diving bird's larder; muddying it starves my own table too.", zh: "我白天潜水衔草，夜里睡在苇丛。下游的菜田是所有潜水鸟的粮库；搅浑它，饿的是我自己的桌子。" },
            { id: "k37s6", claim: "k37c1", en: "My feet are big, yes - big feet grip wet boards better than small ones. Any foot could have printed that sill if any foot had reason to.", zh: "我的脚是大——大脚抓湿板才抓得稳。只要有必要，谁的脚都能在闸台上留下印子。" },
          ],
        },
      ],
      presses: [
        { id: "k37p1", witness: "k37w1", with: "k37e4", claim: "k37c1", cost: 1, en: "You stand the bank too far back to see the drawing, you say, and the gravel shows no track to the sluice. Say what a bank-sleeper knows of the last dark hour at all.", zh: "你说岸离得远看不见抽板，砾石上也没有通到闸口的脚印。说说看，一位岸上睡觉的，对最后那段黑夜到底知道多少。" },
        { id: "k37p2", witness: "k37w3", with: "k37e2", claim: "k37c1", cost: 1, taints: "k37w2", taintCost: 3, en: "You say any foot could print the sill if any foot had reason. The prints are heel-deep and lobed, and only one bird on this pond wears lobes. Say the bird's name - and do not drown the moorhen's small feet in your big answer.", zh: "你说只要有理由，谁的脚都能在闸台留印。可那印子跟深、带蹼瓣，这塘里只有一位脚上带蹼瓣。把那位指出来——别用你那套大脚的讲究，把黑水鸡的小脚淹了。" },
        { id: "k37p3", witness: "k37w2", with: "k37e3", claim: "k37c1", cost: 1, en: "You know what silt does to a cress bed, and the fan is single and fresh. Say what hour a single drawing must fall on, if the cress below still feeds the pond at dawn.", zh: "你见过泥沙毁菜田，那把泥扇又是新的、只有一把。若天亮时下游的菜田还养着这塘的鸟，说说那一回抽板该落在哪个时辰。" },
        { id: "k37p4", witness: "k37w3", with: "k37e1", claim: "k37c2", cost: 1, en: "You muddying your own larder is a fair question, and here stand your boards stacked dry and matched. Say who else on this pond stacks wet boards like a cooper.", zh: "搅浑自家粮库这一条，问得在理；你的板就在这儿，端端正正摞着、湿线对齐。说说这塘里还有谁能像箍桶匠一样摞湿板。" },
        { id: "k37p5", witness: "k37w1", with: "k37e2", claim: "k37c2", cost: 1, taints: "k37w3", taintCost: 2, en: "You woke with the wind and heard nothing, you say. The sill's mud says heel-deep lobes, and only one lobe wears this pond. Say whose lobes the court should read - and do not be kind about it at your bank's distance.", zh: "你说风吹就醒、什么都没听见。闸台的泥说：跟深、带蹼瓣。这塘里只有一副蹼瓣。说说法庭该去读谁的蹼瓣——隔着一条岸，就别装好人了。" },
        { id: "k37p6", witness: "k37w2", with: "k37e1", claim: "k37c3", cost: 1, en: "You read the fan as one drawing, one hour, one body. Say what else the stacked boards say about the hour, if the dry end held them above the spate line.", zh: "你把泥扇读成一次抽板、一个时辰、一个身子。若闸台干处把板留在汛线以上，说说那摞板对时辰还说了什么。" },
      ],
      vouches: [
        { id: "k37v1", witness: "k37w1", exhibit: "k37e4", claim: "k37c1", en: "The mallard's gravel shows no track down to the sluice, and a mallard cannot stack what he cannot reach. Believe the mallard about the bank he slept on.", zh: "绿头鸭的砾石岸上没有通到闸口的脚印，够不着的东西他也摞不了。关于他睡的岸，信绿头鸭的。" },
        { id: "k37v2", witness: "k37w2", exhibit: "k37e3", claim: "k37c1", en: "The moorhen reads silt the way a farmer reads weather, and her own feet never pressed the sill. Believe the moorhen about the fan and about the prints that are not hers.", zh: "黑水鸡读泥沙像庄稼人读天时，她自己的脚从没压过闸台。关于那把泥扇，也关于那双不是她的脚印，信黑水鸡的。" },
        { id: "k37v3", witness: "k37w3", exhibit: "k37e2", claim: "k37c1", en: "The coot's lobes are the pond's only lobes, and a print is a name pressed into mud. Believe the mud over the muddied.", zh: "白骨顶的蹼瓣是全塘独一份；印子就是踩进泥里的名字。信泥，别信被泥糊住的。" },
      ],
      claims: [
        { id: "k37c1", accused: "coot", statements: ["k37s1", "k37s2", "k37s3", "k37s4", "k37s5", "k37s6"], exhibits: ["k37e1", "k37e2", "k37e3", "k37e4", "k37e5", "k37e6"], en: "Bald drew the flood boards in the last dark hour to splash the cress beds and open the weed below for her own diving", zh: "波德在最后那段黑夜里抽起挡水板，搅浑菜田，好让下游的草根露出水面自己取食" },
        { id: "k37c2", accused: "mallard", statements: ["k37s1", "k37s2"], exhibits: ["k37e4"], en: "Reed drew the boards from the bank to muddy the beds he grazes at dawn", zh: "里德从岸上抽了板，搅浑他清早吃草的那几块田" },
        { id: "k37c3", accused: "moorhen", statements: ["k37s3"], exhibits: ["k37e3"], en: "Skerry drew the boards to shell the cress beds into her own nest lining", zh: "斯凯丽抽了板，把菜田里的嫩芽搅下来衬自己的窝" },
      ],
    },
    {
      id: "k38", labelKey: "ctaCase38", time: 28, culprit: "starling",
      bar: { strength: 39, trust: 2 },
      charge: {
        en: "The weathercock's mica scales were whole at dusk and at dawn the cock stood bald on the wind side, the scales gone. Two questions here drag two different neighbours three points deep, and both names must be mended twice over.",
        zh: "风信鸡上的云母鳞片黄昏时还全着，天亮时迎风那面秃了，鳞片没了。这案子里两问各拖一位邻居、各三指深，两条名字都得洗净两回。",
      },
      suspects: [
        { id: "starling", en: "Murm the Starling", zh: "椋鸟默姆" },
        { id: "bat", en: "Veil the Bat", zh: "蝙蝠维尔" },
        { id: "magpie", en: "Tess the Magpie", zh: "喜鹊特丝" },
      ],
      exhibits: [
        { id: "k38e1", weight: 5, en: "The cock's wind side is peeled in overlapping scoops, each scoop the width of a starling's breast, and the mica's backing-paper still hangs in two of them.", zh: "风信鸡迎风那面的鳞被一片片剥下，每片的宽窄正合一只椋鸟的胸；其中两片还挂着云母的衬纸。" },
        { id: "k38e2", weight: 5, en: "A mica scale lies in the starling's roost-elm fork, worked into the nest-moss like a shining tile.", zh: "一片云母鳞嵌在椋鸟宿的榆树杈上，砌进窝苔里，亮得像一片瓦。" },
        { id: "k38e3", weight: 4, en: "The bat's crevice under the loft carries no mica and no fibre, and the crevice's lining is moss as it has been all season.", zh: "钟楼下的蝙蝠墙缝里没有云母也没有纤维，缝里衬的还是苔，一整季都没变过。" },
        { id: "k38e4", weight: 4, en: "A magpie's track circles the weathervane's post twice in the frost, and every circle keeps to the ground.", zh: "霜上有一道喜鹊的脚印，绕着风信鸡的杆转了两圈；每一圈都贴着地面。" },
        { id: "k38e5", weight: 4, en: "The peeled scoops climb the wind side one under another, low first, and the lowest sits one hop off the loft sill.", zh: "剥口顺着迎风面一片压一片往上爬，最低的那片起头，就在离钟楼门槛一跳远的地方。" },
        { id: "k38e6", weight: 4, en: "The roost-elm's fork holds moss worked into a cup this week, and the cup's rim shines with mica dust.", zh: "宿榆的树杈上有个这星期才絮起来的苔杯；杯沿上闪着云母的粉。" },
      ],
      witnesses: [
        {
          id: "k38w1", trust: 5, en: "Tess the magpie", zh: "喜鹊特丝",
          statements: [
            { id: "k38s1", claim: "k38c1", en: "I collect what shines; the whole village knows my wire. If I had taken those scales the wire would hold them, and my wire holds nothing new since midwinter.", zh: "我收亮的东西；全村都知道我那根铁丝。要是我拿的那些鳞片，铁丝上就该有；冬至以来，铁丝上没添过新东西。" },
            { id: "k38s2", claim: "k38c1", en: "My track circles the post and stays on the ground. A magpie scales a post from the ground up in hops, and the frost shows my hops - none reach the cock.", zh: "我的脚印绕着杆转，一直贴着地面。喜鹊上杆是一蹦一蹦的，霜上就有我的蹦痕——没有一蹦够到鸡身。" },
          ],
        },
        {
          id: "k38w2", trust: 4, en: "Veil the bat", zh: "蝙蝠维尔",
          statements: [
            { id: "k38s3", claim: "k38c1", en: "I fly the yard at dusk and I sleep the dark through. A bat cannot peel mica from a wind side; my thumbs are hooks for hanging, not scoops.", zh: "黄昏我在院里飞，黑透就睡。蝙蝠剥不下迎风面的云母；我的拇指是挂东西的钩，不是剥皮的铲。" },
            { id: "k38s4", claim: "k38c1", en: "My crevice lines with moss all season and the moss is moss still. Say what a lining that never changed proves about the crevice's tenant.", zh: "我的墙缝整季衬苔，如今还是苔。说说一季没变过的衬里，替缝里住的那位证明了什么。" },
          ],
        },
        {
          id: "k38w3", trust: 5, en: "Murm the starling", zh: "椋鸟默姆",
          statements: [
            { id: "k38s5", claim: "k38c1", en: "I line with moss and feather, not with tile. A scale in a fork is a scale the wind put there; the wind peels that cock every hard frost.", zh: "我衬窝用苔和羽毛，不用瓦片。树杈上那片鳞是风放的；每回硬霜过后，风都会剥那只风信鸡。" },
            { id: "k38s6", claim: "k38c1", en: "My roost is the elm and the fork is mine, yes. What the fork holds, forty birds hold with me.", zh: "我宿榆树，那树杈是我的，没错。可那杈上的东西，是四十只鸟一起的家当。" },
          ],
        },
      ],
      presses: [
        { id: "k38p1", witness: "k38w1", with: "k38e4", claim: "k38c1", cost: 1, en: "You collect what shines, you say, and your wire holds nothing new. Say what a collector's eye was doing circling the cock's post twice in the frost.", zh: "你说你收亮的东西，铁丝上没添新的。那双收藏家的眼，霜天里绕着风信鸡的杆转了两圈，是在做什么。" },
        { id: "k38p2", witness: "k38w2", with: "k38e3", claim: "k38c1", cost: 1, taints: "k38w3", taintCost: 3, en: "Your crevice's moss is moss as it has been all season, you say. The scoops on the cock are a starling's breast wide, and the fork over the roost holds a scale. Say the tenant's name the court should read - and do not let a season of moss wash a whole wind side clean.", zh: "你说墙缝的衬苔一季没变。可鸡身的鳞片剥口一片个顶个椋鸟胸的宽，宿树的树杈上就嵌着一片。说说法庭该去读哪一位的名字——别拿一季的苔，把迎风整面洗得干干净净。" },
        { id: "k38p3", witness: "k38w3", with: "k38e1", claim: "k38c1", cost: 1, taints: "k38w1", taintCost: 3, en: "You blame the wind, and the backing-paper still hangs in two of the scoops - wind does not leave paper. Say whose breast the scoops are the width of, and do not send the court counting a magpie's hops for it.", zh: "你怪风，可剥口里有两片还挂着衬纸——风可留不下纸。说说那些剥口个个是什么胸口的宽——也别把法庭支去数喜鹊的蹦痕。" },
        { id: "k38p4", witness: "k38w1", with: "k38e1", claim: "k38c2", cost: 1, en: "The wire holds nothing new, you say, and two scoops still hang their backing-paper. Say what a peeled cock is worth at a roost forty birds strong.", zh: "你说铁丝上没添新的，可两片剥口还挂着衬纸。说说一只剥秃的风信鸡，对一窝四十口的宿处值多少。" },
        { id: "k38p5", witness: "k38w2", with: "k38e4", claim: "k38c2", cost: 1, en: "You sleep the dark through, you say, and the frost held two clean circles of a ground bird. Say what a crevice's tenant knows of a frost-bound post at all.", zh: "你说你黑透就睡。霜上可是清清楚楚两圈贴地的鸟踪。说说缝里的住户，对一根冻透的杆子能知道什么。" },
        { id: "k38p6", witness: "k38w3", with: "k38e2", claim: "k38c3", cost: 1, en: "Forty birds hold the fork, you say, and one scale worked into the moss like a tile. Say what forty birds wanted with a single shining tile.", zh: "你说那树杈是四十口的家当，可嵌进苔里的亮瓦只有一片。说说四十只鸟要一片亮瓦做什么。" },
      ],
      vouches: [
        { id: "k38v1", witness: "k38w1", exhibit: "k38e4", claim: "k38c1", en: "The magpie's hops stay on the ground and her wire tells on her for a fact. Believe the magpie about the hops, and the wire about the wire.", zh: "喜鹊的蹦痕贴着地面，铁丝也不替她瞒事。蹦的事信她的；铁丝的事信铁丝的。" },
        { id: "k38v2", witness: "k38w2", exhibit: "k38e3", claim: "k38c1", en: "The crevice's moss is the season's own moss, and a tenant whose lining never changed never left. Believe the bat about the dark.", zh: "墙缝的苔就是这一季的苔；衬里没换过的住户，就没出过门。关于黑夜，信蝙蝠的。" },
        { id: "k38v3", witness: "k38w3", exhibit: "k38e2", claim: "k38c1", en: "The scale in the fork is worked in like a tile and a tile is a choice, not a windfall. Believe the fork over the wind the starling blamed.", zh: "树杈上那片鳞是砌进去的，像一片瓦；瓦是挑来的，不是天上刮来的。信那道树杈，别信椋鸟怪的风。" },
      ],
      claims: [
        { id: "k38c1", accused: "starling", statements: ["k38s1", "k38s2", "k38s3", "k38s4", "k38s5", "k38s6"], exhibits: ["k38e1", "k38e2", "k38e3", "k38e4", "k38e5", "k38e6"], en: "Murm peeled the cock's wind side scale by scale at the roost hour and tiled the shining scales into the roost fork", zh: "默姆趁着宿树的时辰，一片一片剥下风信鸡迎风面的鳞，把亮瓦砌进了宿树的树杈" },
        { id: "k38c2", accused: "magpie", statements: ["k38s1", "k38s2"], exhibits: ["k38e4"], en: "Tess took the scales for her wire and hid the shine under her circling", zh: "特丝把鳞片收去她的铁丝，用绕圈把亮处藏了" },
        { id: "k38c3", accused: "bat", statements: ["k38s3"], exhibits: ["k38e3"], en: "Veil peeled the scales on a dusk flight and hung them in the crevice", zh: "维尔黄昏一次飞掠剥了鳞，挂进了墙缝" },
      ],
    },
    {
      id: "k39", labelKey: "ctaCase39", time: 29, culprit: "woodmouse",
      bar: { strength: 40, trust: 2 },
      charge: {
        en: "The vestry's candle ends were boxed for the winter feast, and at the feast's eve the box stood open, its wax shavings gone and the shavings' smell all through the wall. One question here muddies a neighbour four points deep against a bar of two, and only a mending that names the smell can lift it.",
        zh: "圣器室攒着过冬节用的蜡烛头，装了箱；节前夜箱子敞着，蜡屑没了，墙里都是蜡的气味。这案子里有一问把邻居拖进四指深的泥，门槛只有两指——唯有指名道姓洗那股气味的作证才捞得回来。",
      },
      suspects: [
        { id: "woodmouse", en: "Pip the Wood Mouse", zh: "林鼠皮普" },
        { id: "shrew", en: "Quill the Shrew", zh: "鼩鼱奎尔" },
        { id: "rook", en: "Croak the Rook", zh: "白嘴鸦克罗克" },
      ],
      exhibits: [
        { id: "k39e1", weight: 5, en: "The box's lid is gnawed at the lip in paired gouges no wider than a thumb-nail, and a whisker - a mouse's whisker - rests in the wax still soft at the rim.", zh: "箱盖的口沿上有一对对牙啃的豁口，宽不过一个拇指甲；一根胡须——鼠的胡须——落在蜡上，蜡沿还软着。" },
        { id: "k39e2", weight: 5, en: "A wax-shaving trail runs from the vestry's wall to the mouse-hole by the boiler, shavings dropped narrow-side up the whole way.", zh: "一路蜡屑从圣器室的墙根通到锅炉边的鼠洞；一路上屑片都是窄面朝上掉的。" },
        { id: "k39e3", weight: 5, en: "The rook's roost-tree stands bare of wax smell at every nest, and the shrew's run by the vestry carries no shavings at all.", zh: "白嘴鸦的宿树上，每个窝都闻不到蜡味；鼩鼱沿圣器室的跑道上一粒蜡屑也没有。" },
        { id: "k39e4", weight: 4, en: "The vestry's cat-shaped shadow of a doorstone shows no dropping of any kind the whole frost week.", zh: "门槛石那一块，整整一个霜周，什么粪都没有落过。" },
        { id: "k39e5", weight: 4, en: "The boiler hole's threshold carries wax shavings packed into the nest-moss, fresh over the old seed-husks.", zh: "锅炉洞的门槛上，蜡屑被压进了窝苔里；新鲜的压着旧的谷壳。" },
        { id: "k39e6", weight: 4, en: "The vestry wall's skirting is gnawed at one point, paired gouges no wider than a thumb-nail, and the gnawing smells of wax.", zh: "圣器室的墙脚有一处被啃过，成对的豁口宽不过一个拇指甲；啃口上就是蜡的气味。" },
      ],
      witnesses: [
        {
          id: "k39w1", trust: 4, en: "Quill the shrew", zh: "鼩鼱奎尔",
          statements: [
            { id: "k39s1", claim: "k39c1", en: "I run the vestry wall at night and I smell everything twice. The wax smell lived in the wall by the boiler, and it did not live there the frost week before.", zh: "我夜里沿圣器室的墙跑，什么气味都过两遍鼻子。蜡味是后来才住进锅炉边的墙里的；前一个霜周还没有。" },
            { id: "k39s2", claim: "k39c1", en: "A shrew eats her own weight in one day and none of it is wax. A shrew cannot even lift a candle end; my jaws close on worms, not on tallow.", zh: "鼩鼱一天吃下与自己等重的食物，没有一样是蜡。鼩鼱连蜡烛头都衔不动；我的嘴合上是捉虫的，合不上牛脂。" },
          ],
        },
        {
          id: "k39w2", trust: 4, en: "Croak the rook", zh: "白嘴鸦克罗克",
          statements: [
            { id: "k39s3", claim: "k39c1", en: "I roost high and I read the yard from the roost. Wax does not fly to a roost-tree; every nest is cold of it. Say where the smell went, if not along the ground.", zh: "我宿在高处，从宿树上读院子。蜡不会飞上宿树；每个窝都闻不到。若不是贴着地面走的，那股味儿去了哪儿。" },
            { id: "k39s4", claim: "k39c1", en: "A rook's bill is a pick and a tear, and a box lid is neither. Say what ground-runner the paired gouges fit, if not the run that passes the vestry wall.", zh: "白嘴鸦的嘴是啄的、撕的，箱盖两样都沾不上。说说那一对对的豁口合哪位贴地跑的，若不是打圣器室墙边过的那条跑道。" },
          ],
        },
        {
          id: "k39w3", trust: 5, en: "Pip the wood mouse", zh: "林鼠皮普",
          statements: [
            { id: "k39s5", claim: "k39c1", en: "I carry seeds and I sleep deep. The vestry is the cat's ground, and no mouse crosses a cat's ground for wax.", zh: "我搬种子、睡得沉。圣器室是猫的地界，没有鼠会为蜡闯猫的地界。" },
            { id: "k39s6", claim: "k39c1", en: "My whiskers break all winter; a whisker in the wax is a whisker, not a witness. Say what a whisker knows of a whole box of candle ends.", zh: "我的胡须一冬要断好几根；落在蜡里的胡须就是胡须，不是证人。说说一嘴胡须，对一整箱蜡烛头能知道什么。" },
          ],
        },
      ],
      presses: [
        { id: "k39p1", witness: "k39w1", with: "k39e4", claim: "k39c1", cost: 1, en: "You smell everything twice, you say, and the doorstone's shadow held nothing the whole frost week. Say what a clean doorstone proves about the runners under the vestry wall.", zh: "你说什么气味都过两遍鼻子，可门槛石那一块，整一个霜周什么都没落。说说一块干净的门槛石，替圣器室墙下跑动的各位证明了什么。" },
        { id: "k39p2", witness: "k39w2", with: "k39e1", claim: "k39c1", cost: 1, taints: "k39w3", taintCost: 4, en: "You read the yard from the roost and the gouges fit a ground-runner's jaw. Say the jaw's owner four times if you dare - and do not pick at the shrew to soften the name, for her jaws close on worms and not on wax.", zh: "你从宿树上读院子，豁口合一张贴地跑的嘴。敢的话，把那张嘴的主人连说四遍——可别拿鼩鼱垫话，她的嘴合上捉虫，合不上蜡。" },
        { id: "k39p3", witness: "k39w3", with: "k39e2", claim: "k39c2", cost: 1, en: "You carry seeds and the shaving trail runs narrow-side up to your own boiler hole. Say what else drops shavings narrow-side up the whole wall.", zh: "你说你搬种子，可蜡屑一路窄面朝上、一直落到你的锅炉洞口。说说还有谁能把屑片撒得一路窄面朝上。" },
        { id: "k39p4", witness: "k39w1", with: "k39e3", claim: "k39c2", cost: 1, taints: "k39w2", taintCost: 2, en: "The roost-tree is cold of wax and your run carries no shavings, you both say. Say what a clean roost and a clean run prove about the smell that stayed in the wall - and do not hang the wall on wings that were asleep above it.", zh: "宿树上闻不到蜡味，你的跑道上一粒蜡屑也没有——你们两位都这么说。说说干净的宿树和干净的跑道，替留在墙里的那股气味证明了什么——可别把墙上的事，挂到头顶上睡着的翅膀身上。" },
        { id: "k39p5", witness: "k39w2", with: "k39e3", claim: "k39c3", cost: 1, en: "You read the yard from the roost. Say what a roost reads of a wall that never shows itself above the frost.", zh: "你从宿树上读院子。说说一面从不出霜线的墙，宿树能读到它什么。" },
        { id: "k39p6", witness: "k39w3", with: "k39e1", claim: "k39c3", cost: 1, en: "A whisker is not a witness, you say. Here are paired gouges no wider than a thumb-nail, and a trail to your own door. Say what a court should weigh: the whisker, or the walk it took.", zh: "你说胡须不是证人。一对对豁口就在这儿，宽不过一个拇指甲；屑路一直通到你家门口。说说法庭该称一称哪个：那根胡须，还是它走过的那条路。" },
        { id: "k39p7", witness: "k39w1", with: "k39e2", claim: "k39c1", cost: 1, en: "You smell everything twice, and the trail of shavings runs narrow-side up the whole wall. Say what a twice-smelled trail says about the hole it stops at.", zh: "你说什么气味都要过两遍鼻子；屑路一路窄面朝上、贴着整面墙走。说说一条嗅过两遍的屑路，对它停住的洞口说了什么。" },
      ],
      vouches: [
        { id: "k39v1", witness: "k39w1", exhibit: "k39e3", claim: "k39c1", en: "The shrew's run is clean of shavings and her jaws close on worms. Believe the shrew about the wall she smells twice, and the wax she cannot carry.", zh: "鼩鼱的跑道上一粒蜡屑没有，她的嘴合上捉虫。关于她嗅两遍的那面墙，也关于她衔不动的蜡，信鼩鼱的。" },
        { id: "k39v2", witness: "k39w2", exhibit: "k39e3", claim: "k39c1", en: "The rook read the yard from above and read it cold of wax. Believe the rook about the roost-tree, and the ground about the ground-runner.", zh: "白嘴鸦从高处读院子，读出宿树上一星蜡味也无。宿树的事信白嘴鸦的；贴地跑的事，信地面本身。" },
        { id: "k39v3", witness: "k39w3", exhibit: "k39e2", claim: "k39c1", en: "The trail ends at the boiler hole and nowhere else, and the whisker in the wax is soft at the rim. Believe the trail over the whisker's owner, and the whisker over his forgetting.", zh: "屑路到锅炉洞口为止，再没有第二头；蜡里的胡须落处还软着。信那条屑路，别信屑路主人的嘴；信胡须，别信他的忘性。" },
      ],
      claims: [
        { id: "k39c1", accused: "woodmouse", statements: ["k39s1", "k39s2", "k39s3", "k39s4", "k39s5", "k39s6"], exhibits: ["k39e1", "k39e2", "k39e3", "k39e4", "k39e5", "k39e6"], en: "Pip gnawed the box's lid for the candle ends and hauled the shavings home to the boiler hole down a trail of his own dropping", zh: "皮普啃开箱盖叼走蜡烛头，顺着一路掉屑的道把蜡屑搬回了锅炉洞" },
        { id: "k39c2", accused: "shrew", statements: ["k39s1", "k39s2"], exhibits: ["k39e3"], en: "Quill stripped the box for the tallow grubs she hunts in wax", zh: "奎尔为了蜡里她猎的虫，把箱子掏空了" },
        { id: "k39c3", accused: "rook", statements: ["k39s3"], exhibits: ["k39e1"], en: "Croak lifted the box's lid from the roost flight and carried the ends to the tree", zh: "克罗克从宿树上俯冲下来掀了箱盖，把蜡烛头带回树上" },
      ],
    },
    {
      id: "k40", labelKey: "ctaCase40", time: 30, culprit: "plover",
      bar: { strength: 41, trust: 2 },
      charge: {
        en: "The salt-marsh sheep were marked in their own grease at shearing, and on the market's eve three fleeces stood re-marked in another flock's grease, clean over the old marks. Three questions here muddy all three neighbours, two and three points deep against a bar of two, and every name the court muddies it must mend before the verdict holds.",
        zh: "盐沼的羊剪毛时就用自家羊油打了记号；集前夜，三张毛皮被用别家的羊油重新打了记号，旧记号盖得干干净净。这案子里三问把三位邻居都拖进泥里，两指、三指深，门槛只有两指——法庭糊了谁的名字，就得先把谁洗净，判决才算数。",
      },
      suspects: [
        { id: "plover", en: "Reeve the Plover", zh: "鸻里夫" },
        { id: "curlew", en: "Skein the Curlew", zh: "杓鹬斯凯恩" },
        { id: "hare", en: "Moss the Hare", zh: "野兔莫斯" },
      ],
      exhibits: [
        { id: "k40e1", weight: 4, en: "The re-marked grease is river-clay yellow, not marsh-green, and the clay is the plover's bathing pool at the river's bend, the one warm spate leaves.", zh: "重打的油痕是河泥的黄，不是盐沼的绿；那河泥正是鸻在河湾打滚的塘——涨水时唯一留暖水的塘。" },
        { id: "k40e2", weight: 4, en: "A plover's short bill prints the re-marked grease on all three fleeces, and the print's two steps walk the fleece from shoulder to tail, marking as it goes.", zh: "三张毛皮的新油痕上，都印着鸻那短嘴的印；印子两步一步从肩走到尾，边走边打。" },
        { id: "k40e3", weight: 4, en: "The curlew's long bill cannot press a print shorter than itself, and no curlew print of any length lies in the re-marked grease.", zh: "杓鹬的长嘴压不出比自己短的印；重打的油痕上，什么长度的杓鹬嘴印都没有。" },
        { id: "k40e4", weight: 4, en: "The hare's form by the marsh gate sits on old wool the wind gathered, and the wool is this flock's, unmarked and ungreased.", zh: "盐沼门口的野兔窝里垫着风刮拢的旧羊毛；那羊毛是这群羊的，没打过记号，也没沾过油。" },
        { id: "k40e5", weight: 4, en: "The bathing pool's clay is stamped at first light with one bird's prints, three toes forward, and the prints leave the pool by the marsh path.", zh: "头一茬光里，河泥塘的泥上印着一只鸟的脚印，三趾朝前；印子出塘，顺着上滩的那条路去了。" },
      ],
      witnesses: [
        {
          id: "k40w1", trust: 5, en: "Skein the curlew", zh: "杓鹬斯凯恩",
          statements: [
            { id: "k40s1", claim: "k40c1", en: "I probe the marsh from dusk to dark and my bill is a yard of it. The re-marking smells of river clay, and the river clay is one pool's; the marsh has no clay in it at all.", zh: "我从黄昏探到天黑，嘴就有一码长。重打的油是河泥味；河泥只有一个塘有，盐沼里可一星半点都没有。" },
            { id: "k40s2", claim: "k40c1", en: "A curlew cannot walk a fleece; my legs are built for the marsh and a fleece rolls under them. The prints walk shoulder to tail in two steps, and two steps is a short bill's ground.", zh: "杓鹬上不了羊毛皮；我的腿是盐沼的腿，羊毛皮会从脚下滚走。那些印子两步从肩走到尾——两步，正是短嘴的地界。" },
            { id: "k40s7", claim: "k40c1", en: "The marsh has no clay in it; I have probed every yard of it for worms. The clay the fleeces wear is river clay, and the river is one bend away.", zh: "盐沼里没有河泥；为了虫子我一码一码都探过。毛皮上那层泥是河泥；河湾就在一步之外。" },
            { id: "k40s8", claim: "k40c1", en: "A curlew's print is a long sickle in the mud. There is no sickle on the fleeces; the prints there are short, and they walk.", zh: "杓鹬的印子在泥里是一把长镰。毛皮上没有镰刀印；那儿的印子短短的，是走出来的。" },
          ],
        },
        {
          id: "k40w2", trust: 4, en: "Moss the hare", zh: "野兔莫斯",
          statements: [
            { id: "k40s3", claim: "k40c1", en: "I sit the gate at night and I chew what the wind brings. The wool in my form is this flock's and the wind gathered it; a hare does not shear, and a hare does not grease.", zh: "我夜里守着门，风送来什么我嚼什么。窝里的羊毛是这群羊的，风刮的；野兔不剪毛，也不打油。" },
            { id: "k40s4", claim: "k40c1", en: "The plover bathes at the river bend at first light, every day, and comes up the marsh after. Ask the flock what the marsh smelled like the morning after the market's eve.", zh: "鸻每天头一茬光在河湾打滚，然后上盐沼来。问问这群羊，集前夜过后那个早上，盐沼闻着是什么味。" },
            { id: "k40s9", claim: "k40c1", en: "The flock pens two fields from my gate, and the gate's mud held no track to the pen on the market's eve. A hare sits where the night happens, and the night happened over there.", zh: "羊栏离我的门两块田；集前夜，门口的泥上没有一道通向羊栏的脚印。野兔守在夜发生的地方，而那夜的案子出在另一头。" },
            { id: "k40s10", claim: "k40c1", en: "A hare greases nothing; my form is wool and wind, and the wool in it is this flock's own, gathered unmarked.", zh: "野兔什么油也打不了；我的窝是羊毛和风，窝里那点毛是这群羊自己的，风刮来的，没打过记号。" },
          ],
        },
        {
          id: "k40w3", trust: 5, en: "Reeve the plover", zh: "鸻里夫",
          statements: [
            { id: "k40s5", claim: "k40c1", en: "I bathe in clay because the marsh has no fresh water; every shore bird on this marsh bathes somewhere, and the curlew bathes in the sea. Clay is a bath, not a brush.", zh: "我在河泥里打滚是因为盐沼没有淡水；这滩上每个岸鸟都得找个地方洗，杓鹬洗的是海水。泥是澡，不是刷子。" },
            { id: "k40s6", claim: "k40c1", en: "My bill is short and my walk is short, and I have never stood on a fleece in my life. A bird who prints as he walks is a bird who walks - say where the walking is, if not at the bath.", zh: "我嘴短步子也短，这辈子没站上过羊毛皮。边走边印的鸟就是走路的鸟——如果不是在洗澡塘，说说它还在哪儿走。" },
            { id: "k40s11", claim: "k40c1", en: "I bathe at the bend and I walk up the marsh after, every day of the season. Say what a walking bird walks over, if three fleeces lie penned two fields from the gate.", zh: "我在这塘里洗澡，洗完就上滩走一趟——这个季节天天如此。若三张毛皮关在离门两块田的栏里，说说一只走路的鸟都走过了什么。" },
            { id: "k40s12", claim: "k40c1", en: "The re-marking is not my brush; I have no brush. A bill that prints as it walks prints its own short walk, and my walk is the pool's.", zh: "重打的记号不是我的刷子干的；我没有刷子。边走边印的嘴印出来的是自己的短步子；我的步子，是那口塘的。" },
            { id: "k40s13", claim: "k40c1", en: "The old marks stood in the grease a whole season; the new ones sat on top of them wet. Ask the shearer which mark the wool held first.", zh: "旧记号在羊油里站了一整个季节；新记号是湿着压上去的。去问剪毛的，羊毛上先有的是哪一个。" },
            { id: "k40s14", claim: "k40c1", en: "If the court wants my pool's clay on a fleece, let it lay pool clay on old grease and read the wet of it. Wet clay marks deep and dries light; the fleeces' new marks are deep still.", zh: "法庭若要证明毛皮上有我塘里的泥，就拿塘泥抹到旧油上，读它的湿气。湿泥打的记号深、干了就淡；毛皮上的新记号到现在还深着。" },
          ],
        },
      ],
      presses: [
        { id: "k40p1", witness: "k40w1", with: "k40e3", claim: "k40c1", cost: 1, taints: "k40w2", taintCost: 2, en: "Your bill is a yard of marsh, you say, and no print of any length lies in the re-marked grease. Say what a marsh-yard knows of a river-clay pool it never probes.", zh: "你说你的嘴是盐沼里的一码。可重打的油痕上，什么长度的嘴印都没有。说说一码的盐沼嘴，对它从不去探的河泥塘知道什么。" },
        { id: "k40p2", witness: "k40w2", with: "k40e1", claim: "k40c1", cost: 1, taints: "k40w3", taintCost: 3, en: "The re-marking is river-clay yellow, and one bird on this marsh bathes in river clay. Say the bather's name - and do not sweep the marsh floor with a hare's form to blur the yellow.", zh: "重打的油是河泥的黄，这滩上只有一位在河泥里打滚。把打滚的那位指出来——可别拿野兔窝里那点旧毛把满滩一扫，把黄色扫糊了。" },
        { id: "k40p3", witness: "k40w3", with: "k40e2", claim: "k40c1", cost: 1, taints: "k40w1", taintCost: 3, en: "You print as you walk, you say, and the prints walk shoulder to tail on all three fleeces. Say whose ground two steps is - and do not put your short bill's ground under a yard-long marsh bill to be rid of it.", zh: "你说你边走边印，三张毛皮上的印子都两步从肩走到尾。说说两步是谁的地界——可别把短嘴的地界，硬塞给那一码长的盐沼嘴。" },
        { id: "k40p4", witness: "k40w1", with: "k40e1", claim: "k40c2", cost: 1, taints: "k40w2", taintCost: 2, en: "The clay is the river pool's and the marsh has none of its own, you say. Say what a gate-sitting hare knows of river clay at all - and mind, the form she sits is lined with wool, not with clay.", zh: "你说河泥是那个塘的、盐沼里没有。说说守门的野兔对河泥到底知道多少——还有，她窝里垫的是羊毛，可不是泥。" },
        { id: "k40p5", witness: "k40w2", with: "k40e2", claim: "k40c2", cost: 1, en: "You sit the gate at night, and the fleeces stand penned two fields from the gate. Say what a sitting hare hears of three fleeces re-marked in one night.", zh: "你夜里守着门，可那三张毛皮关在离门两块田的栏里。说说守门的野兔，对一夜之间重打记号的三张毛皮听见了什么。" },
        { id: "k40p6", witness: "k40w3", with: "k40e1", claim: "k40c3", cost: 1, en: "Clay is a bath, you say, and the clay on the fleeces is the pool's own yellow. Say what a bath leaves behind, if it leaves its own colour on another flock's grease.", zh: "你说泥是澡堂。可毛皮上的泥就是那个塘的黄。说说一池澡堂留得下什么——若它把自己的颜色留在了别家羊的油上。" },
      ],
      vouches: [
        { id: "k40v1", witness: "k40w1", exhibit: "k40e3", claim: "k40c1", en: "The curlew's yard is a yard long and the grease holds no print of it, long or short. Believe the curlew about the bill the marsh built her.", zh: "杓鹬的地界有一码长，油痕上却没有她的印，长的短的都没有。关于盐沼给她造的那张嘴，信杓鹬的。" },
        { id: "k40v2", witness: "k40w2", exhibit: "k40e4", claim: "k40c1", en: "The hare's form is lined with the flock's own wool, gathered, not greased. Believe the hare about the wool, and the gate about the night.", zh: "野兔窝里垫的是这群羊自己的毛，风刮的，没沾油。毛的事信野兔的；那夜的事信门口的。" },
        { id: "k40v3", witness: "k40w3", exhibit: "k40e2", claim: "k40c1", en: "The prints are short and they walk, and the only short walker who bathes in that yellow is the plover himself. Believe the prints over the bather's bath.", zh: "印子短，而且是走出来的；在那塘黄泥里洗澡的短嘴鸟，只有鸻自己。信印子，别信洗澡的嘴。" },
      ],
      claims: [
        { id: "k40c1", accused: "plover", statements: ["k40s1", "k40s2", "k40s3", "k40s4", "k40s5", "k40s6", "k40s7", "k40s8", "k40s9", "k40s10", "k40s11", "k40s12", "k40s13", "k40s14"], exhibits: ["k40e1", "k40e2", "k40e3", "k40e4", "k40e5"], en: "Reeve came up from his clay bath on the market's eve and walked all three fleeces shoulder to tail, re-marking them clean over the old grease", zh: "集前夜里夫从河泥塘上来，把三张毛皮从肩到尾走了一遍，用塘里的黄泥把旧记号齐齐盖了" },
        { id: "k40c2", accused: "curlew", statements: ["k40s1", "k40s2"], exhibits: ["k40e3"], en: "Skein probed the fleeces at dusk and re-marked them with marsh grease on a yard-long bill", zh: "斯凯恩黄昏在毛皮上探了一遍，用一码长嘴蘸着盐沼的油重打了记号" },
        { id: "k40c3", accused: "hare", statements: ["k40s3"], exhibits: ["k40e4"], en: "Moss greased the fleeces from her form at the gate to hide the wool she had gathered", zh: "莫斯为了盖住她窝里垫的羊毛，从门口的窝里出去给毛皮打了油" },
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
      if (press.taints) {
        /* The tower presses: a question can drag a neighbour's name through
         * the same mud it opens, and the bench believes the neighbour less
         * for it until a corroboration mends them. Nothing before the tier
         * names a taint, so every shipped press costs exactly what it cost. */
        state.delta[press.taints] = (state.delta[press.taints] || 0) -
          (press.taintCost == null ? 1 : press.taintCost);
      }
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
  App.courtCanAsk = ctaCanAsk;
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
        if (item.taints) {
          /* The tower presses: the question also drags the named neighbour's
           * name through the mud, and the bench believes them less for it
           * until a corroboration mends them. Nothing before the tier names
           * a taint, so every shipped press costs exactly what it cost. */
          state.delta[item.taints] = (state.delta[item.taints] || 0) -
            (item.taintCost == null ? 1 : item.taintCost);
          addNote(t("ctaTaintOut", {
            w: ctaWord(caseDef, ctaIn(caseDef, "witnesses", item.taints) || witness),
            c: ctaWord(caseDef, item),
          }));
        }
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
      "ctaCase25": "The Unpayable Question",
      "ctaCase26": "The Rival's Own Word",
      "ctaCase27": "Never at the Ceiling",
      "ctaCase28": "Eighteen Actions",
      "ctaCase29": "The Mended Witness",
      "ctaCase30": "The Exhibit That Waited",
      "ctaCase31": "The Ferry Tin",
      "ctaCase32": "The Open Shutters",
      "ctaCase33": "The Swapped Eggs",
      "ctaCase34": "The Lifted Seals",
      "ctaCase35": "The Spread Grate",
      "ctaCase36": "The Cut Bell-Rope",
      "ctaCase37": "The Drawn Boards",
      "ctaCase38": "The Stripped Weathervane",
      "ctaCase39": "The Candle Box",
      "ctaCase40": "The Re-marked Fleeces",
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
      "ctaTaintOut": "The word is tainted: {c} dragged {w}'s name through the mud, and the bench believes them less for it.",
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
      "ctaCase25": "问不起的一句话",
      "ctaCase26": "对家的原话",
      "ctaCase27": "顶格不收旁证",
      "ctaCase28": "十八次动作",
      "ctaCase29": "补回来的证人",
      "ctaCase30": "等着证人的物证",
      "ctaCase31": "渡口铁盒",
      "ctaCase32": "开着的仓门",
      "ctaCase33": "换过的鸟蛋",
      "ctaCase34": "揭开的泥封",
      "ctaCase35": "撑开的铁栅",
      "ctaCase36": "割断的钟绳",
      "ctaCase37": "拉起的闸板",
      "ctaCase38": "剥鳞的风标",
      "ctaCase39": "蜡烛匣",
      "ctaCase40": "重新做记号的羊毛",
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
      "ctaTaintOut": "证词被拖下泥：{c}把{w}的名字搅进了泥里，法庭因此不再全信他。",
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
        "Goal: close one of forty cases with a verdict the numbers behind it actually support.",
        "Action: click a witness to take their testimony in order, click an exhibit to mark it, then press 1 to 4 to spend an action, Enter to confirm, Escape back to the bench, L to read out everything you have established.",
        "Two numbers: claim strength comes from testimony, exhibit weight and contradictions; witness trust is separate, starts at the case's own value, and is what the bench will believe.",
        "The trade-off: pressing a witness adds 2 to the charge it serves and costs that witness 1 trust; corroborating a witness with a marked exhibit adds 1 to both.",
        "Watch out: a true charge on a witness trusted below the bar is thrown out, and a charge resting on an account you exposed as a lie recants itself.",
        "Scoring: the verdict quality is the gate, the case strength of your closing sets the stars, and the bands are measured from each case's own best-play line.",
      ],
      zh: [
        "目标：在四十件案子里结一件，判决要能被它背后的数字真正撑住。",
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
