/* Republic Rewind - The history and culture quiz about the Republic of China
 * in the shared game drawer. Every card is an encyclopaedic fact with a short
 * note, so a wrong answer still teaches something. */
(function (App) {
  var localStorage = App.storage;
  /* Shared names from the other modules (see window.CapitalConvert). */
  var t = App.t;
  var getElement = App.getElement;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  var createCampaign = App.createCampaign;
  var fillCampaignPicker = App.fillCampaignPicker;
  var starsFor = App.starsFor;
  /* Row fields the engine actually reads - a field nothing reads is not a lever:
   *   id        the unlock chain plus the progress record key (game-campaign.js)
   *   labelKey  the deck's picker label, resolved through t() in both languages
   *   stars     [3-star, 2-star, 1-star] lines handed to starsFor(score, ..., high)
   *   cards     the round: cards.length is the HUD total, the score denominator
   *             and the number of clicks a sitting takes.
   * That is the whole list. This engine has no per-row round timer, wager, joker
   * budget, category lock or wrong-answer cost field, and the Streak in the HUD
   * is one global localStorage counter that scoring never consults, so a rung can
   * only ever change two things: how many cards a round deals and where its three
   * bands sit within that length. Difficulty itself is knowledge. */
  var rqDecks = [
    {
      id: "q1",
      labelKey: "rqD1",
      stars: [4, 3, 2],
      cards: [
        {
          q: { en: "In which year was the Republic of China founded?", zh: "中华民国成立于哪一年？" },
          o: [{ en: "1894", zh: "1894" }, { en: "1912", zh: "1912" },
              { en: "1919", zh: "1919" }, { en: "1927", zh: "1927" }],
          a: 1,
          note: { en: "The provisional government was inaugurated in Nanjing on 1 January 1912.", zh: "临时政府于1912年1月1日在南京成立。" },
        },
        {
          q: { en: "Who became the first provisional president?", zh: "首位临时大总统是谁？" },
          o: [{ en: "Yuan Shikai", zh: "袁世凯" }, { en: "Chiang Kai-shek", zh: "蒋介石" },
              { en: "Sun Yat-sen", zh: "孙中山" }, { en: "Li Yuanhong", zh: "黎元洪" }],
          a: 2,
          note: { en: "Sun Yat-sen took office on 1 January 1912 and stepped down weeks later in a negotiated transfer of power.", zh: "孙中山于1912年1月1日就职，数后在权力交接谈判中卸任。" },
        },
        {
          q: { en: "The Minguo calendar counts year 1 from which year?", zh: "民国纪年的元年是哪一年？" },
          o: [{ en: "1908", zh: "1908" }, { en: "1911", zh: "1911" },
              { en: "1912", zh: "1912" }, { en: "1928", zh: "1928" }],
          a: 2,
          note: { en: "Subtract 1911 to convert: 2026 is Minguo year 115.", zh: "换算时减去1911：2026年即民国115年。" },
        },
        {
          q: { en: "Which uprising ended more than two thousand years of imperial rule?", zh: "哪次起义终结了延续两千余年的帝制？" },
          o: [{ en: "The Boxer Rebellion", zh: "义和团运动" }, { en: "The Xinhai Revolution", zh: "辛亥革命" },
              { en: "The Northern Expedition", zh: "北伐" }, { en: "The May Fourth Movement", zh: "五四运动" }],
          a: 1,
          note: { en: "The Wuchang uprising of 10 October 1911 began the Xinhai Revolution.", zh: "1911年10月10日的武昌起义揭开了辛亥革命的序幕。" },
        },
      ],
    },
    {
      id: "q2",
      labelKey: "rqD2",
      stars: [4, 3, 2],
      cards: [
        {
          q: { en: "In the flag's official reading, what does the red field stand for?", zh: "按国旗的官方释义，红色象征什么？" },
          o: [{ en: "Liberty", zh: "自由" }, { en: "Equality", zh: "平等" },
              { en: "Fraternity", zh: "博爱" }, { en: "Prosperity", zh: "富强" }],
          a: 2,
          note: { en: "Blue stands for liberty, white for equality, red for fraternity.", zh: "青象征自由，白象征平等，红象征博爱。" },
        },
        {
          q: { en: "How many rays does the white sun carry?", zh: "白日有几道光芒？" },
          o: [{ en: "Eight", zh: "八道" }, { en: "Ten", zh: "十道" },
              { en: "Twelve", zh: "十二道" }, { en: "Fourteen", zh: "十四道" }],
          a: 2,
          note: { en: "The twelve rays stand for the twelve hours of a day and the twelve months of a year.", zh: "十二道光芒象征一日十二时辰与一年十二个月。" },
        },
        {
          q: { en: "The Three Principles of the People are nationalism, democracy and...", zh: "三民主义除民族、民权外，还包括……" },
          o: [{ en: "Livelihood", zh: "民生" }, { en: "Military rule", zh: "军政" },
              { en: "Meritocracy", zh: "贤能" }, { en: "Localism", zh: "地方" }],
          a: 0,
          note: { en: "Sun Yat-sen's third principle, minsheng, concerns the people's livelihood.", zh: "孙中山的第三主义即民生主义，关注人民生计。" },
        },
        {
          q: { en: "Which blossom was named the official flower in 1964?", zh: "1964年被定为国花的是哪种花？" },
          o: [{ en: "Peony", zh: "牡丹" }, { en: "Plum blossom", zh: "梅花" },
              { en: "Chrysanthemum", zh: "菊花" }, { en: "Lotus", zh: "莲花" }],
          a: 1,
          note: { en: "The plum was chosen for blossoming in winter, standing for endurance.", zh: "梅花因凌冬开花而被选定，象征坚韧。" },
        },
      ],
    },
    {
      id: "q3",
      labelKey: "rqD3",
      stars: [4, 3, 2],
      cards: [
        {
          q: { en: "What is the highest peak in the Republic of China?", zh: "中华民国境内最高峰是哪座山？" },
          o: [{ en: "Alishan", zh: "阿里山" }, { en: "Yushan", zh: "玉山" },
              { en: "Xueshan", zh: "雪山" }, { en: "Taroko", zh: "太鲁阁" }],
          a: 1,
          note: { en: "Yushan (Jade Mountain) rises to 3,952 metres.", zh: "玉山海拔3952米。" },
        },
        {
          q: { en: "Which strait separates the Republic of China from the mainland?", zh: "中华民国与大陆之间是哪条海峡？" },
          o: [{ en: "Luzon Strait", zh: "巴士海峡" }, { en: "Korea Strait", zh: "朝鲜海峡" },
              { en: "Qiongzhou Strait", zh: "琼州海峡" }, { en: "Taiwan Strait", zh: "台湾海峡" }],
          a: 3,
          note: { en: "The Taiwan Strait is about 130 kilometres across at its narrowest.", zh: "台湾海峡最窄处约130公里。" },
        },
        {
          q: { en: "Which ROC national park is famous for a marble gorge cut by the Liwu River?", zh: "中华民国哪座公园以立雾溪切割的大理石峡谷闻名？" },
          o: [{ en: "Taroko", zh: "太鲁阁" }, { en: "Kenting", zh: "垦丁" },
              { en: "Yangmingshan", zh: "阳明山" }, { en: "Taitong", zh: "台东" }],
          a: 0,
          note: { en: "Taroko's cliffs were folded and lifted from seabed marble.", zh: "太鲁阁的峭壁源于海底大理石经褶皱抬升。" },
        },
        {
          q: { en: "Which is the largest natural lake in the Republic of China?", zh: "中华民国最大的天然湖泊是哪个？" },
          o: [{ en: "Clearwater Lake", zh: "澄清湖" }, { en: "Lih Tang", zh: "鲤鱼潭" },
              { en: "Sun Moon Lake", zh: "日月潭" }, { en: "Zengwen Reservoir", zh: "曾文水库" }],
          a: 2,
          note: { en: "Sun Moon Lake sits about 748 metres up in Nantou county.", zh: "日月潭位于南投县，海拔约748米。" },
        },
      ],
    },
    {
      id: "q4",
      labelKey: "rqD4",
      stars: [4, 3, 2],
      cards: [
        {
          q: { en: "When Taipei 101 opened in 2004 it became the world's tallest building. How high is it?", zh: "台北101于2004年落成时为世界最高建筑。它有多高？" },
          o: [{ en: "408 m", zh: "408米" }, { en: "508 m", zh: "508米" },
              { en: "601 m", zh: "601米" }, { en: "828 m", zh: "828米" }],
          a: 1,
          note: { en: "Its 101 storeys top out at 508 metres; the record passed to the Burj Khalifa in 2010.", zh: "共101层、高508米；该纪录于2010年被哈利法塔超越。" },
        },
        {
          q: { en: "Which city hosts the ROC's seat of government?", zh: "中华民国政府所在地设于哪座城市？" },
          o: [{ en: "Taichung", zh: "台中" }, { en: "Kaohsiung", zh: "高雄" },
              { en: "Tainan", zh: "台南" }, { en: "Taipei", zh: "台北" }],
          a: 3,
          note: { en: "Taipei has been the administrative centre since 1949.", zh: "自1949年起，台北即为行政中心。" },
        },
        {
          q: { en: "In which year was the ROC chipmaker TSMC founded?", zh: "中华民国的芯片制造商台积电创立于哪一年？" },
          o: [{ en: "1977", zh: "1977" }, { en: "1987", zh: "1987" },
              { en: "1997", zh: "1997" }, { en: "2005", zh: "2005" }],
          a: 1,
          note: { en: "It opened in 1987 beside the Hsinchu Science Park.", zh: "1987年创立于新竹科学园区旁。" },
        },
        {
          q: { en: "Which writing system does the Republic of China use officially?", zh: "中华民国官方使用的中文书写系统是？" },
          o: [{ en: "Traditional characters", zh: "繁体字" }, { en: "Simplified characters", zh: "简体字" },
              { en: "Hangul", zh: "谚文" }, { en: "Kana", zh: "假名" }],
          a: 0,
          note: { en: "Documents, signage and schoolbooks use full-form characters.", zh: "公文、路牌与教科书均使用正体字。" },
        },
      ],
    },
    {
      id: "q5",
      labelKey: "rqD5",
      stars: [4, 3, 2],
      cards: [
        {
          q: { en: "In which year did the ROC constitution take effect?", zh: "《中华民国宪法》正式施行于哪一年？" },
          o: [{ en: "1928", zh: "1928" }, { en: "1947", zh: "1947" },
              { en: "1954", zh: "1954" }, { en: "1966", zh: "1966" }],
          a: 1,
          note: { en: "Drafted in late 1946 and in force from 25 December 1947.", zh: "1946年底制定，1947年12月25日起施行。" },
        },
        {
          q: { en: "Which yuan runs civil service examinations and appointment?", zh: "五院中掌管公务人员考选与铨叙的是哪一院？" },
          o: [{ en: "Legislative Yuan", zh: "立法院" }, { en: "Judicial Yuan", zh: "司法院" },
              { en: "Examination Yuan", zh: "考试院" }, { en: "Control Yuan", zh: "监察院" }],
          a: 2,
          note: { en: "The Examination Yuan is the modern heir to the imperial civil service exam.", zh: "考试院承袭了古代科举选才的传统。" },
        },
        {
          q: { en: "The ROC national anthem's lyrics come from what text?", zh: "中华民国国歌的歌词取自哪一篇文本？" },
          o: [{ en: "Sun Yat-sen's Whampoa pledge", zh: "孙中山黄埔校训词" },
              { en: "The provisional charter", zh: "临时约法序文" },
              { en: "A Tang dynasty poem", zh: "唐代诗歌" },
              { en: "The Nine Principles", zh: "建国大纲" }],
          a: 0,
          note: { en: "Music by Cheng Mau-yun; adopted as the anthem in 1943.", zh: "程懋筠谱曲，1943年定为国歌。" },
        },
        {
          q: { en: "Which city served as the wartime capital during the war of resistance?", zh: "抗战时期的战时首都是哪座城市？" },
          o: [{ en: "Chongqing", zh: "重庆" }, { en: "Kaohsiung", zh: "高雄" },
              { en: "Beijing", zh: "北京" }, { en: "Hangzhou", zh: "杭州" }],
          a: 0,
          note: { en: "The government withdrew inland and sat in Chongqing from 1937 to 1946.", zh: "1937至1946年间政府内迁重庆办公。" },
        },
      ],
    },
    {
      id: "q6",
      labelKey: "rqD6",
      stars: [4, 3, 2],
      cards: [
        {
          q: { en: "In which year was the Provisional Constitution of the Republic of China passed?", zh: "《中华民国临时约法》制定于哪一年？" },
          o: [{ en: "1905", zh: "1905" }, { en: "1912", zh: "1912" },
              { en: "1921", zh: "1921" }, { en: "1928", zh: "1928" }],
          a: 1,
          note: { en: "Passed on 11 March 1912 to bound the new republic's executive power.", zh: "1912年3月11日公布，用以约束新共和国的行政权。" },
        },
        {
          q: { en: "The 1928 flag change in the northeast ended which era?", zh: "1928年东北易帜终结了哪个阶段？" },
          o: [{ en: "Warlord rule in the north", zh: "北洋军阀割据" },
              { en: "The Qing court", zh: "清朝朝廷" },
              { en: "Japanese rule on the island", zh: "日本在台统治" },
              { en: "The Constitutional era", zh: "行宪时期" }],
          a: 0,
          note: { en: "Zhang Xueliang exchanged the five-colour flag, completing the northern expedition.", zh: "张学良改挂国旗，北伐至此形式上完成。" },
        },
        {
          q: { en: "By what honorific is Sun Yat-sen remembered in the ROC?", zh: "在中华民国，孙中山被尊称为什么？" },
          o: [{ en: "Father of the Nation", zh: "国父" }, { en: "First Emperor", zh: "始皇帝" },
              { en: "Sage of the Age", zh: "至圣" }, { en: "Prime Minister", zh: "相国" }],
          a: 0,
          note: { en: "The title was in general use by 1940 and appears on ROC currency.", zh: "1940年起通称国父，并见于民国货币。" },
        },
        {
          q: { en: "When was the ROC president first chosen by direct popular vote?", zh: "中华民国总统首次由公民直选是在哪一年？" },
          o: [{ en: "1972", zh: "1972" }, { en: "1987", zh: "1987" },
              { en: "1996", zh: "1996" }, { en: "2000", zh: "2000" }],
          a: 2,
          note: { en: "The March 1996 election followed the constitutional amendments of the early 1990s.", zh: "1996年3月的直选源于1990年代初的宪法增修。" },
        },
      ],
    },
    {
      id: "q7",
      labelKey: "rqD7",
      stars: [4, 3, 2],
      cards: [
        {
          q: { en: "What is the ROC's current currency?", zh: "中华民国现行流通货币是什么？" },
          o: [{ en: "Silver dollar", zh: "银元" }, { en: "New Taiwan dollar", zh: "新台币" },
              { en: "Legal tender note", zh: "法币" }, { en: "Customs gold unit", zh: "关金券" }],
          a: 1,
          note: { en: "The New Taiwan dollar took its current form in 1949 and is issued by the Central Bank.", zh: "新台币1949年改制发行，由中央银行发行。" },
        },
        {
          q: { en: "Which institution is the ROC's central bank?", zh: "中华民国的中央银行是哪一家？" },
          o: [{ en: "Bank of Taiwan", zh: "台湾银行" },
              { en: "Central Bank of the Republic of China", zh: "中华民国中央银行" },
              { en: "Land Bank", zh: "土地银行" },
              { en: "Cooperative Financial Bank", zh: "合作金库" }],
          a: 1,
          note: { en: "Founded in 1928 and re-established in Taipei in 1961.", zh: "1928年设立，1961年在台北复设。" },
        },
        {
          q: { en: "Which state carrier handles ROC mail and stamps?", zh: "中华民国的邮政与邮票由哪家机构经办？" },
          o: [{ en: "China Post", zh: "中国邮政" }, { en: "Korea Post", zh: "韩国邮政" },
              { en: "Japan Post", zh: "日本邮政" }, { en: "Chunghwa Post", zh: "中华邮政" }],
          a: 3,
          note: { en: "It took over the postal system in 2003 as a state-owned company.", zh: "2003年由邮政体制改制为国营公司。" },
        },
        {
          q: { en: "Under what name do ROC athletes compete at the Olympics?", zh: "中华民国运动员以何名义参加奥运会？" },
          o: [{ en: "Taiwan, China", zh: "中国台湾" }, { en: "Chinese Taipei", zh: "中华台北" },
              { en: "Formosa", zh: "福尔摩沙" }, { en: "Republic of China", zh: "中华民国" }],
          a: 1,
          note: { en: "The name has been used at the Games since the 1984 Sarajevo and Los Angeles events.", zh: "自1984年萨拉热窝与洛杉矶奥运会起沿用此名。" },
        },
      ],
    },
    /* Rung eight: the first round longer than it is hard. Six cards instead of
     * the four every shipped deck deals, and the three-star line sits at five,
     * so one miss no longer ends the chance of a full band. */
    {
      id: "q8",
      labelKey: "rqD8",
      stars: [5, 4, 3],
      cards: [
        {
          q: { en: "The tea house Chunshui Tang, which claims to have invented bubble milk tea, opened in which city?", zh: "宣称发明珍珠奶茶的春水堂茶馆，是在哪座城市开设的？" },
          o: [{ en: "Tainan", zh: "台南" }, { en: "Taichung", zh: "台中" },
              { en: "Taipei", zh: "台北" }, { en: "Kaohsiung", zh: "高雄" }],
          a: 1,
          note: { en: "Chunshui Tang dates its iced milk tea with tapioca pearls to the 1980s in Taichung; a Tainan tea house puts forward a rival claim.", zh: "春水堂把加珍珠的冰奶茶追到1980年代的台中；台南一家茶馆则提出另一种说法。" },
        },
        {
          q: { en: "Setting wishes on a paper sky lantern and letting it go is the signature custom of which district?", zh: "把心愿写在纸天灯上放飞，是哪一带的标志性习俗？" },
          o: [{ en: "Pingxi", zh: "平溪" }, { en: "Beipu", zh: "北埔" },
              { en: "Lukang", zh: "鹿港" }, { en: "Meinong", zh: "美浓" }],
          a: 0,
          note: { en: "The lanterns rose from the Pingxi coal valley, where families floated them to signal that the paths home were safe; the town's public release dates from the late 1990s.", zh: "天灯出于平溪煤矿聚落，居民曾放灯告知家人道路已安；当地的集体施放始于1990年代末。" },
        },
        {
          q: { en: "The long annual walking pilgrimage from Dajia's Zhenlan Temple honours which deity?", zh: "大甲镇澜宫每年举行的徒步绕境进香，奉祀的是哪位神明？" },
          o: [{ en: "Guan Yu", zh: "关公" }, { en: "Guanyin", zh: "观音" },
              { en: "Shennong", zh: "神农" }, { en: "Mazu", zh: "妈祖" }],
          a: 3,
          note: { en: "Mazu, the sea goddess, is the deity of the Dajia pilgrimage, which walks some three hundred kilometres over nine days and gathers hundreds of thousands of participants.", zh: "大甲绕境奉海神妈祖，九天行程逾三百公里，参与人数常达数十万。" },
        },
        {
          q: { en: "Which is the largest of the Republic's officially recognised indigenous peoples?", zh: "中华民国官方认定的原住民族中，人口最多的是哪一族？" },
          o: [{ en: "Paiwan", zh: "排湾族" }, { en: "Amis", zh: "阿美族" },
              { en: "Atayal", zh: "泰雅族" }, { en: "Thao", zh: "邵族" }],
          a: 1,
          note: { en: "The Pangcah, long recorded as the Amis, number well over two hundred thousand and live mostly along the eastern coast.", zh: "阿美族自称Pangcah，人口逾二十万，多分布于东部海岸。" },
        },
        {
          q: { en: "The island's indigenous languages belong to which language family?", zh: "岛上各族原住民的语言属于哪一语系？" },
          o: [{ en: "Sino-Tibetan", zh: "汉藏语系" }, { en: "Japonic", zh: "日本语系" },
              { en: "Austroasiatic", zh: "南亚语系" }, { en: "Austronesian", zh: "南岛语系" }],
          a: 3,
          note: { en: "The Formosan languages are the oldest branches of Austronesian, the family that later spread across the Pacific and into the Indian Ocean.", zh: "台湾南岛诸语属于南岛语系中最古老的分支，该语系后来扩散至太平洋与印度洋。" },
        },
        {
          q: { en: "Which partly oxidised tea, sitting between green and black, is the Republic's best-known leaf?", zh: "发酵程度介于绿茶与红茶之间、最具代表性的茶是哪一种？" },
          o: [{ en: "Oolong", zh: "乌龙茶" }, { en: "Pu-erh", zh: "普洱" },
              { en: "Matcha", zh: "抹茶" }, { en: "Longjing", zh: "龙井" }],
          a: 0,
          note: { en: "Oolong is rolled and bruised part-way through oxidation; Dongding in Nantou and Jishan in Hsinchu are among its best-known homes.", zh: "乌龙茶经部分发酵与揉捻成形，南投冻顶、新竹宝山皆为其著名产区。" },
        },
      ],
    },
    /* Rung nine: five cards of arts and letters, and the deck's real rule is its
     * floor. Three stars still forgives one miss (4 of 5), but a single correct
     * card earns a star here, where the shipped decks need two. */
    {
      id: "q9",
      labelKey: "rqD9",
      stars: [4, 3, 1],
      cards: [
        {
          q: { en: "Which 1989 film by Hou Hsiao-hsien won the Golden Lion at the Venice Film Festival?", zh: "侯孝贤1989年的哪部电影获得威尼斯影展金狮奖？" },
          o: [{ en: "A City of Sadness", zh: "悲情城市" }, { en: "Yi Yi", zh: "一一" },
              { en: "Crouching Tiger, Hidden Dragon", zh: "卧虎藏龙" }, { en: "A Brighter Summer Day", zh: "牯岭街少年杀人事件" }],
          a: 0,
          note: { en: "Hou's postwar family drama took Venice's top prize in 1989; Edward Yang's Yi Yi followed eleven years later, and Yang also directed A Brighter Summer Day.", zh: "《悲情城市》获1989年威尼斯最高奖；杨德昌的《一一》在其十一年后问世，《牯岭街少年杀人事件》亦出自杨德昌。" },
        },
        {
          q: { en: "Who directed Crouching Tiger, Hidden Dragon, the 2000 film that won the Academy Award for best foreign-language film?", zh: "2000年获奥斯卡最佳外语片的《卧虎藏龙》由谁执导？" },
          o: [{ en: "Tsai Ming-liang", zh: "蔡明亮" }, { en: "Hou Hsiao-hsien", zh: "侯孝贤" },
              { en: "Ang Lee", zh: "李安" }, { en: "Edward Yang", zh: "杨德昌" }],
          a: 2,
          note: { en: "Ang Lee took the award for that film and later won consecutive Best Director Oscars for Life of Pi and The Revenant.", zh: "李安凭此片获奖，其后以《少年Pi的奇幻漂流》与《神鬼猎人》连续获得最佳导演奖。" },
        },
        {
          q: { en: "Among the National Palace Museum's three most-photographed pieces, which is jadeite carved as a vegetable?", zh: "台北故宫人气最高的三件藏品中，以翡翠雕成蔬菜的是哪一件？" },
          o: [{ en: "The Meat-shaped Stone", zh: "肉形石" }, { en: "The Jadeite Cabbage", zh: "翠玉白菜" },
              { en: "Travelers among Mountains and Streams", zh: "谿山行旅图" }, { en: "The Duke Mao Tripod", zh: "毛公鼎" }],
          a: 1,
          note: { en: "The cabbage and the meat-shaped stone play on the colours natural to jadeite and agate; the Duke Mao tripod completes the trio with the longest inscription cast on any bronze.", zh: "翠玉白菜与肉形石利用石材天然色泽成形；毛公鼎以铭文最长的青铜器并列第三。" },
        },
        {
          q: { en: "Which poet is remembered above all for the four-stanza poem Nostalgia, long set reading in the Republic's schools?", zh: "以四节短诗《乡愁》闻名、长期入选中华民国教材的诗人是谁？" },
          o: [{ en: "Yang Mu", zh: "杨牧" }, { en: "Ling Yu", zh: "洛夫" },
              { en: "Wang Tuo", zh: "王文兴" }, { en: "Yu Guangzhong", zh: "余光中" }],
          a: 3,
          note: { en: "Yu Guangzhong (1928-2017) wrote Nostalgia in the early 1970s, measuring four separations across the strait in a single short poem.", zh: "余光中（1928-2017）于1970年代初写作《乡愁》，以四节写尽海峡两端的别离。" },
        },
        {
          q: { en: "Which stage art puts the performer's hand inside a cloth figure, so it moves on those fingers?", zh: "表演者的手伸入布制戏偶之中、偶随指头动作的是哪种舞台艺术？" },
          o: [{ en: "Glove puppetry", zh: "布袋戏" }, { en: "Shadow puppetry", zh: "皮影戏" },
              { en: "Peking opera", zh: "京剧" }, { en: "Kua-a-hi opera", zh: "歌仔戏" }],
          a: 0,
          note: { en: "The cloth bag the hand wears gives the art its name; the performer speaks and chants the roles in Hokkien.", zh: "手套入布偶因而得名，表演者以闽南语口白兼饰各角。" },
        },
      ],
    },
    /* Rung ten: the capstone is the widest round in the ladder — seven cards —
     * and the bands widen with it. Three stars forgives two misses (5 of 7),
     * the two-star line sits at four, and only a blank sheet earns nothing. */
    {
      id: "q10",
      labelKey: "rqD10",
      stars: [5, 4, 2],
      cards: [
        {
          q: { en: "Which of these events came first in the Republic's story?", zh: "下列事件中，最早发生的是哪一个？" },
          o: [{ en: "The Xingzhonghui is founded in Honolulu", zh: "兴中会在檀香山成立" },
              { en: "The Wuchang uprising", zh: "武昌起义" },
              { en: "The Northern Expedition begins", zh: "北伐开始" },
              { en: "The constitution takes effect", zh: "宪法施行" }],
          a: 0,
          note: { en: "Sun Yat-sen's Xingzhonghui, the first republican society, was organised in Honolulu in November 1894; the others fall in 1911, 1926 and 1947.", zh: "孙中山的兴中会为首个共和团体，1894年11月成立于檀香山；其余三事分别见于1911年、1926年与1947年。" },
        },
        {
          q: { en: "Which of these events came last?", zh: "下列事件中，最晚发生的是哪一个？" },
          o: [{ en: "The first direct presidential election", zh: "总统首次公民直选" },
              { en: "The Provisional Constitution is promulgated", zh: "临时约法公布" },
              { en: "The northeast changes its flag", zh: "东北易帜" },
              { en: "Martial law is lifted", zh: "解除戒严" }],
          a: 0,
          note: { en: "Martial law ended in 1987 and the March 1996 election followed, the first in which voters in the Republic chose their own president.", zh: "1987年解除戒严，1996年3月举行的选举是中华民国民众首次直选总统。" },
        },
        {
          q: { en: "Which physicist shared the 1957 Nobel Prize in Physics with Tsung-Dao Lee?", zh: "与李政道共同获得1957年诺贝尔物理学奖的是哪位物理学家？" },
          o: [{ en: "Tsien Hsue-shen", zh: "钱学森" }, { en: "Samuel C. C. Ting", zh: "丁肇中" },
              { en: "Chen-Ning Yang", zh: "杨振宁" }, { en: "Shing-Tung Yau", zh: "丘成桐" }],
          a: 2,
          note: { en: "Their 1956 paper showed that the weak interaction does not respect mirror symmetry; Chien-Shiung Wu's cobalt-60 experiment confirmed it.", zh: "两人1956年的论文指出弱交互作用不遵守镜像对称，吴健雄的钴60实验证实了这一点。" },
        },
        {
          q: { en: "Which of the five yuan exercises the Republic's legislative power in a single chamber?", zh: "五院之中以单一议会行使国家立法权的是哪一院？" },
          o: [{ en: "The Control Yuan", zh: "监察院" }, { en: "The Legislative Yuan", zh: "立法院" },
              { en: "The Judicial Yuan", zh: "司法院" }, { en: "The Examination Yuan", zh: "考试院" }],
          a: 1,
          note: { en: "The Legislative Yuan is unicameral, seating 113 members elected for four-year terms.", zh: "立法院为单选区与政党票选出的113席，任期四年。" },
        },
        {
          q: { en: "In which sport did Chinese Taipei win its first Olympic gold medal, at the 2004 Athens Games?", zh: "2004年雅典奥运，中华台北在哪个项目夺得史上首面奥运金牌？" },
          o: [{ en: "Archery", zh: "射箭" }, { en: "Weightlifting", zh: "举重" },
              { en: "Taekwondo", zh: "跆拳道" }, { en: "Table tennis", zh: "乒乓球" }],
          a: 2,
          note: { en: "Chen Shih-hsin took the women's finweight taekwondo title in Athens, the first gold won under the Chinese Taipei name.", zh: "陈诗欣在雅典夺得女子轻量级跆拳道金牌，是中华台北名义下的首面奥运金牌。" },
        },
        {
          q: { en: "The 1943 Cairo Declaration was issued by the United States, the United Kingdom and which third government?", zh: "1943年《开罗宣言》由美国、英国与哪一个政府共同发表？" },
          o: [{ en: "The Soviet Union", zh: "苏联" }, { en: "France", zh: "法国" },
              { en: "Canada", zh: "加拿大" }, { en: "The Republic of China", zh: "中华民国" }],
          a: 3,
          note: { en: "Roosevelt, Churchill and Chiang Kai-shek met in Cairo in November 1943 and published the statement on 1 December.", zh: "罗斯福、丘吉尔与蒋介石于1943年11月会于开罗，12月1日发表宣言。" },
        },
        {
          q: { en: "Which Taipei university opened as an imperial university in 1928 and took its present name in 1945?", zh: "哪所台北的大学于1928年以帝国大学创立、1945年改用现名？" },
          o: [{ en: "National Chengchi University", zh: "国立政治大学" },
              { en: "National Taiwan University", zh: "国立台湾大学" },
              { en: "National Tsing Hua University", zh: "国立清华大学" },
              { en: "National Cheng Kung University", zh: "国立成功大学" }],
          a: 1,
          note: { en: "Founded as Taihoku Imperial University, it has carried the name National Taiwan University since the 1945 renaming.", zh: "该校前身为台北帝国大学，1945年改称国立台湾大学。" },
        },
      ],
    },
/* Decks 11-20 widen the quiz beyond the Republic's own story: world
     * geography, the ancient world, the sky, inventions, literature, the
     * body, the sea, art and music, harvests, and the industrial age. Every
     * answer carries its note in both languages, and the bands hold the
     * shipped shape - three stars forgives two misses. */
    {
      id: "q11",
      labelKey: "rqD11",
      stars: [5, 4, 2],
      cards: [
        {
          q: { en: "The Danube rises in Germany's Black Forest and empties into which sea?", zh: "多瑙河发源于德国黑森林，最终注入哪片海？" },
          o: [{ en: "The Black Sea", zh: "黑海" }, { en: "The Adriatic Sea", zh: "亚得里亚海" },
              { en: "The Baltic Sea", zh: "波罗的海" }, { en: "The Aegean Sea", zh: "爱琴海" }],
          a: 0,
          note: { en: "Europe's second-longest river ends in a vast delta on the Romanian Black Sea coast.", zh: "这条欧洲第二长河在罗马尼亚黑海海岸汇入三角洲。" },
        },
        {
          q: { en: "Which is the only South American country whose coastline lies entirely on the Pacific?", zh: "南美洲唯一海岸线完全临太平洋的国家是哪一个？" },
          o: [{ en: "Chile", zh: "智利" }, { en: "Argentina", zh: "阿根廷" },
              { en: "Colombia", zh: "哥伦比亚" }, { en: "Uruguay", zh: "乌拉圭" }],
          a: 0,
          note: { en: "Argentina and Uruguay face the Atlantic; Colombia touches both oceans, so Chile alone is Pacific-only.", zh: "阿根廷与乌拉圭临大西洋，哥伦比亚两洋皆临，只有智利独对太平洋。" },
        },
        {
          q: { en: "Mount Kilimanjaro stands in which country?", zh: "乞力马扎罗山位于哪个国家？" },
          o: [{ en: "Kenya", zh: "肯尼亚" }, { en: "Tanzania", zh: "坦桑尼亚" },
              { en: "Uganda", zh: "乌干达" }, { en: "Ethiopia", zh: "埃塞俄比亚" }],
          a: 1,
          note: { en: "Africa's highest peak rises just inside Tanzania, close to the Kenyan border.", zh: "非洲最高峰位于坦桑尼亚境内、邻近肯尼亚边界。" },
        },
        {
          q: { en: "Which strait separates Asia from North America at its closest point?", zh: "亚洲与北美洲最近处隔哪条海峡相望？" },
          o: [{ en: "The Bering Strait", zh: "白令海峡" }, { en: "The Strait of Malacca", zh: "马六甲海峡" },
              { en: "The Dover Strait", zh: "多佛海峡" }, { en: "The Magellan Strait", zh: "麦哲伦海峡" }],
          a: 0,
          note: { en: "The two continents come within about 85 kilometres of each other across the Bering Strait.", zh: "两大洲隔白令海峡相距最近处约85公里。" },
        },
        {
          q: { en: "Lake Baikal, the world's deepest lake, lies in which country?", zh: "世界最深的湖泊贝加尔湖位于哪个国家？" },
          o: [{ en: "Mongolia", zh: "蒙古" }, { en: "Kazakhstan", zh: "哈萨克斯坦" },
              { en: "Russia", zh: "俄罗斯" }, { en: "China", zh: "中国" }],
          a: 2,
          note: { en: "Baikal holds about a fifth of the world's unfrozen fresh surface water.", zh: "贝加尔湖蓄有全球约五分之一的未冻结淡水。" },
        },
        {
          q: { en: "The Sahara reaches which ocean at its western edge?", zh: "撒哈拉沙漠西缘直达哪片大洋？" },
          o: [{ en: "The Atlantic", zh: "大西洋" }, { en: "The Indian Ocean", zh: "印度洋" },
              { en: "The Red Sea", zh: "红海" }, { en: "The Mediterranean", zh: "地中海" }],
          a: 0,
          note: { en: "The Sahara's western margin runs down to the Atlantic along Mauritania and Western Sahara.", zh: "撒哈拉西缘沿毛里塔尼亚与西撒哈拉直抵大西洋。" },
        },
        {
          q: { en: "Which country is made up of more than seventeen thousand islands?", zh: "哪个国家由一万七千多个岛屿组成？" },
          o: [{ en: "The Philippines", zh: "菲律宾" }, { en: "Japan", zh: "日本" },
              { en: "Indonesia", zh: "印度尼西亚" }, { en: "Madagascar", zh: "马达加斯加" }],
          a: 2,
          note: { en: "Indonesia counts over seventeen thousand islands, the world's largest archipelagic state.", zh: "印度尼西亚拥有一万七千多个岛屿，是世界最大的群岛国家。" },
        },
      ],
    },
    {
      id: "q12",
      labelKey: "rqD12",
      stars: [5, 4, 2],
      cards: [
        {
          q: { en: "The Rosetta Stone unlocked which writing system?", zh: "罗塞塔石碑帮助释读了哪套文字系统？" },
          o: [{ en: "Cuneiform", zh: "楔形文字" }, { en: "Egyptian hieroglyphs", zh: "埃及圣书体" },
              { en: "Linear B", zh: "线形文字B" }, { en: "The Phoenician alphabet", zh: "腓尼基字母" }],
          a: 1,
          note: { en: "Champollion used the stone's Greek parallel text to crack the hieroglyphs in 1822.", zh: "商博良于1822年借助石碑上的希腊文对照释读成功。" },
        },
        {
          q: { en: "Hammurabi's law code was issued in which Mesopotamian city-state?", zh: "汉摩拉比法典颁布于美索不达米亚哪个城邦？" },
          o: [{ en: "Uruk", zh: "乌鲁克" }, { en: "Ur", zh: "乌尔" },
              { en: "Babylon", zh: "巴比伦" }, { en: "Nineveh", zh: "尼尼微" }],
          a: 2,
          note: { en: "Babylon's king issued the code around 1750 BC, carved on a diorite stele.", zh: "巴比伦王约在公元前1750年颁令，刻于闪长岩石柱。" },
        },
        {
          q: { en: "Which Athenian reform is remembered as the foundation stone of citizen juries?", zh: "哪位雅典改革者被视为公民陪审制度的奠基人？" },
          o: [{ en: "Draco", zh: "德拉古" }, { en: "Solon", zh: "梭伦" },
              { en: "Pericles", zh: "伯里克利" }, { en: "Themistocles", zh: "地米斯托克利" }],
          a: 1,
          note: { en: "Solon's sixth-century BC reforms opened the courts to ordinary citizens; Pericles later added pay for jurors.", zh: "梭伦在公元前六世纪的改革向平民开放法庭，伯里克利其后为陪审员设立津贴。" },
        },
        {
          q: { en: "Roman concrete owed its seawater durability chiefly to which ingredient?", zh: "罗马混凝土耐海水主要归功于哪一种成分？" },
          o: [{ en: "Volcanic ash", zh: "火山灰" }, { en: "Crushed marble", zh: "碎大理石" },
              { en: "Bone ash", zh: "骨灰" }, { en: "River sand", zh: "河沙" }],
          a: 0,
          note: { en: "Pozzolana ash from the Gulf of Naples reacts with seawater to grow crystals that seal cracks.", zh: "那不勒斯湾的火山灰与海水反应生成晶体，自行填补裂缝。" },
        },
        {
          q: { en: "The Library of Alexandria stood under which dynasty?", zh: "亚历山大图书馆兴建于哪个王朝治下？" },
          o: [{ en: "The Ptolemies", zh: "托勒密王朝" }, { en: "The Seleucids", zh: "塞琉古王朝" },
              { en: "The Antigonids", zh: "安提柯王朝" }, { en: "The Sassanids", zh: "萨珊王朝" }],
          a: 0,
          note: { en: "The Ptolemies founded the Mouseion and library in the third century BC.", zh: "托勒密王朝于公元前三世纪兴建缪斯学宫与图书馆。" },
        },
        {
          q: { en: "The Persian royal road famously carried couriers between Susa and which sea-side city?", zh: "波斯御道以驿使连接苏萨与哪座海滨城市著称？" },
          o: [{ en: "Ephesus", zh: "以弗所" }, { en: "Sardis", zh: "萨迪斯" },
              { en: "Miletus", zh: "米利都" }, { en: "Tyre", zh: "推罗" }],
          a: 1,
          note: { en: "Herodotus admired the relay stations along the roughly 2,700-kilometre road to Sardis.", zh: "希罗多德盛赞这条约2700公里驿道上的换马站。" },
        },
        {
          q: { en: "Which wonder of the ancient world stood in Alexandria's harbour?", zh: "古代世界七大奇迹中哪一座立于亚历山大港？" },
          o: [{ en: "The Colossus of Rhodes", zh: "罗得岛巨像" }, { en: "The Lighthouse of Pharos", zh: "法罗斯灯塔" },
              { en: "The Mausoleum at Halicarnassus", zh: "摩索拉斯陵墓" }, { en: "The Hanging Gardens", zh: "空中花园" }],
          a: 1,
          note: { en: "The Pharos lighthouse guided shipping for centuries until earthquakes felled it.", zh: "法罗斯灯塔引航数百年，终毁于地震。" },
        },
      ],
    },
    {
      id: "q13",
      labelKey: "rqD13",
      stars: [5, 4, 2],
      cards: [
        {
          q: { en: "Which planet spins fastest, turning once in under ten hours?", zh: "哪颗行星自转最快，不到十小时便自转一周？" },
          o: [{ en: "Jupiter", zh: "木星" }, { en: "Saturn", zh: "土星" },
              { en: "Mercury", zh: "水星" }, { en: "Neptune", zh: "海王星" }],
          a: 0,
          note: { en: "Jupiter finishes a rotation in about 9.9 hours, the fastest of the eight planets.", zh: "木星自转一周约9.9小时，为八大行星之最。" },
        },
        {
          q: { en: "A light-year measures which of these?", zh: "光年量度的是下列哪一项？" },
          o: [{ en: "Time", zh: "时间" }, { en: "Distance", zh: "距离" },
              { en: "Brightness", zh: "亮度" }, { en: "Temperature", zh: "温度" }],
          a: 1,
          note: { en: "One light-year is the distance light covers in a year, about 9.46 trillion kilometres.", zh: "一光年是光在一年中走过的距离，约9.46万亿公里。" },
        },
        {
          q: { en: "Which space telescope first showed the deep field crowded with galaxies?", zh: "哪台太空望远镜首次拍到挤满星系的深场照片？" },
          o: [{ en: "Hubble", zh: "哈勃" }, { en: "Spitzer", zh: "斯皮策" },
              { en: "Kepler", zh: "开普勒" }, { en: "Chandra", zh: "钱德拉" }],
          a: 0,
          note: { en: "The 1995 Hubble Deep Field counted thousands of galaxies in a patch of apparently empty sky.", zh: "1995年的哈勃深空场在一片看似空无一物的天空里数出数千个星系。" },
        },
        {
          q: { en: "The asteroid belt circles the Sun between which two planets?", zh: "小行星带位于哪两颗行星之间？" },
          o: [{ en: "Earth and Mars", zh: "地球与火星" }, { en: "Mars and Jupiter", zh: "火星与木星" },
              { en: "Jupiter and Saturn", zh: "木星与土星" }, { en: "Venus and Earth", zh: "金星与地球" }],
          a: 1,
          note: { en: "The belt's total mass is less than the Moon's, most of it in Ceres.", zh: "小行星带总质量不及月球，其中大部分集中于谷神星。" },
        },
        {
          q: { en: "What is the Sun's surface, the photosphere, at roughly?", zh: "太阳的表面——光球层——温度大约是多少？" },
          o: [{ en: "1,500 °C", zh: "1500摄氏度" }, { en: "5,500 °C", zh: "5500摄氏度" },
              { en: "15,000 °C", zh: "15000摄氏度" }, { en: "1,500,000 °C", zh: "150万摄氏度" }],
          a: 1,
          note: { en: "The visible surface runs near 5,500 °C; the corona above it is paradoxically far hotter.", zh: "可见表面约5500摄氏度，其上方的日冕反而热得多。" },
        },
        {
          q: { en: "Which moon of Saturn keeps its atmosphere thicker than Earth's relative to size?", zh: "土星哪颗卫星拥有相对其体型而言极厚的大气？" },
          o: [{ en: "Enceladus", zh: "恩克拉多斯" }, { en: "Titan", zh: "泰坦" },
              { en: "Mimas", zh: "米玛斯" }, { en: "Iapetus", zh: "伊阿佩托斯" }],
          a: 1,
          note: { en: "Titan's nitrogen atmosphere presses down harder than Earth's does per unit area.", zh: "泰坦的氮气大气在地表压强上超过地球。" },
        },
        {
          q: { en: "Halley's Comet last rounded the Sun in which year?", zh: "哈雷彗星最近一次过近日点是在哪一年？" },
          o: [{ en: "1976", zh: "1976年" }, { en: "1986", zh: "1986年" },
              { en: "1996", zh: "1996年" }, { en: "2006", zh: "2006年" }],
          a: 1,
          note: { en: "It returns to the inner solar system about every 76 years, next due in 2061.", zh: "它约每76年回归内太阳系一次，下一次在2061年。" },
        },
      ],
    },
    {
      id: "q14",
      labelKey: "rqD14",
      stars: [5, 4, 2],
      cards: [
        {
          q: { en: "Movable-type printing with carved characters first appears in which civilisation?", zh: "活字印刷最早出现在哪个文明？" },
          o: [{ en: "Song China", zh: "宋代中国" }, { en: "Abbasid Baghdad", zh: "阿拔斯巴格达" },
              { en: "Mainz, Germany", zh: "德国美因茨" }, { en: "Mughal India", zh: "莫卧儿印度" }],
          a: 0,
          note: { en: "Bi Sheng fired ceramic movable type in the eleventh century, four centuries before Gutenberg's metal type.", zh: "毕昇于十一世纪烧制胶泥活字，早于谷登堡的金属活字四百年。" },
        },
        {
          q: { en: "Which invention came first?", zh: "下列哪一项发明最早？" },
          o: [{ en: "The telegraph", zh: "电报" }, { en: "The telephone", zh: "电话" },
              { en: "The radio", zh: "无线电" }, { en: "The television", zh: "电视" }],
          a: 0,
          note: { en: "Morse's telegraph ran from 1844; the telephone followed in 1876, radio in the 1890s, television in the 1920s.", zh: "莫尔斯电报始于1844年，电话1876年、无线电1890年代、电视1920年代相继问世。" },
        },
        {
          q: { en: "The Wright brothers' first powered flight lasted about how long?", zh: "莱特兄弟的首次动力飞行大约持续了多久？" },
          o: [{ en: "12 seconds", zh: "12秒" }, { en: "2 minutes", zh: "2分钟" },
              { en: "12 minutes", zh: "12分钟" }, { en: "An hour", zh: "一小时" }],
          a: 0,
          note: { en: "The 1903 flight at Kitty Hawk covered 36 metres in twelve seconds.", zh: "1903年小鹰镇的首次飞行12秒飞了36米。" },
        },
        {
          q: { en: "Who patented the first practical incandescent lamp with a carbon filament?", zh: "谁为首个实用的碳丝白炽灯取得专利？" },
          o: [{ en: "Nikola Tesla", zh: "特斯拉" }, { en: "Thomas Edison", zh: "爱迪生" },
              { en: "Joseph Swan", zh: "约瑟夫·斯旺" }, { en: "Humphry Davy", zh: "汉弗里·戴维" }],
          a: 1,
          note: { en: "Edison's 1879 filament lamp burned long enough to matter; Swan in England patented a similar lamp the same era, and the two later merged their firms.", zh: "爱迪生1879年的碳丝灯寿命可观；英国的斯旺同期也有类似专利，两人后来合并公司。" },
        },
        {
          q: { en: "The first vaccine in history was against which disease?", zh: "史上第一支疫苗针对哪种疾病？" },
          o: [{ en: "Polio", zh: "小儿麻痹" }, { en: "Smallpox", zh: "天花" },
              { en: "Rabies", zh: "狂犬病" }, { en: "Cholera", zh: "霍乱" }],
          a: 1,
          note: { en: "Jenner's 1796 cowpox inoculation gave the practice its name, from vacca, cow.", zh: "1796年金纳的牛痘接种开创先河， vaccine 一词即源于母牛。" },
        },
        {
          q: { en: "The diesel engine was first built to burn which fuel?", zh: "狄塞尔发动机最初设计燃用哪种燃料？" },
          o: [{ en: "Coal dust", zh: "煤粉" }, { en: "Peanut oil", zh: "花生油" },
              { en: "Whale oil", zh: "鲸油" }, { en: "Kerosene", zh: "煤油" }],
          a: 1,
          note: { en: "Rudolf Diesel demonstrated his 1900 engine running on peanut oil; petroleum diesel came later.", zh: "狄塞尔1900年的样机以花生油运转，石油柴油是后来的事。" },
        },
        {
          q: { en: "Which country issued the first paper banknotes?", zh: "哪个国家最早发行纸币？" },
          o: [{ en: "Persia", zh: "波斯" }, { en: "China", zh: "中国" },
              { en: "The Dutch Republic", zh: "荷兰共和国" }, { en: "The Ottoman Empire", zh: "奥斯曼帝国" }],
          a: 1,
          note: { en: "Song-era Jiaozi notes circulated from the eleventh century, centuries before European paper money.", zh: "宋代交子自十一世纪流通，早于欧洲纸币数百年。" },
        },
      ],
    },
    {
      id: "q15",
      labelKey: "rqD15",
      stars: [5, 4, 2],
      cards: [
        {
          q: { en: "Which epic opens by invoking its 'man of twists and turns'?", zh: "哪部史诗开篇呼唤那位'机敏百变的男子'？" },
          o: [{ en: "The Iliad", zh: "《伊利亚特》" }, { en: "The Odyssey", zh: "《奥德赛》" },
              { en: "The Aeneid", zh: "《埃涅阿斯纪》" }, { en: "Beowulf", zh: "《贝奥武甫》" }],
          a: 1,
          note: { en: "Homer's Odyssey asks the Muse to sing of Odysseus, the man of many turns.", zh: "荷马《奥德赛》请缪斯歌咏'机敏百变'的奥德修斯。" },
        },
        {
          q: { en: "The Tale of Genji, often called the world's first novel, was written by whom?", zh: "常被视为世界首部长篇小说的《源氏物语》作者是谁？" },
          o: [{ en: "Sei Shonagon", zh: "清少纳言" }, { en: "Murasaki Shikibu", zh: "紫式部" },
              { en: "Izumi Shikibu", zh: "和泉式部" }, { en: "Lady Sarashina", zh: "更级日记作者" }],
          a: 1,
          note: { en: "Murasaki Shikibu completed the tale's early chapters around the year 1008 at the Heian court.", zh: "紫式部约于1008年在平安宫廷写成初章。" },
        },
        {
          q: { en: "Which play gives us the line 'The lady doth protest too much'?", zh: "'这位女士誓愿太深'一句出自哪部戏剧？" },
          o: [{ en: "Macbeth", zh: "《麦克白》" }, { en: "Hamlet", zh: "《哈姆雷特》" },
              { en: "King Lear", zh: "《李尔王》" }, { en: "Othello", zh: "《奥赛罗》" }],
          a: 1,
          note: { en: "Hamlet says it watching the play-within-the-play; Gertrude takes the line up in reply.", zh: "哈姆雷特观戏中戏时说出，王后随后应声引用。" },
        },
        {
          q: { en: "Don Quixote was published in two parts how many years apart?", zh: "《堂吉诃德》两部分隔多少年出版？" },
          o: [{ en: "Two", zh: "两年" }, { en: "Five", zh: "五年" },
              { en: "Ten", zh: "十年" }, { en: "Twenty", zh: "二十年" }],
          a: 2,
          note: { en: "Part one appeared in 1605 and part two in 1615, a year before Cervantes died.", zh: "上卷1605年、下卷1615年出版，次年塞万提斯去世。" },
        },
        {
          q: { en: "Which novel opens with the sentence about it being 'the best of times, it was the worst of times'?", zh: "以'这是最好的时代，也是最坏的时代'开篇的小说是哪一部？" },
          o: [{ en: "Great Expectations", zh: "《远大前程》" }, { en: "Oliver Twist", zh: "《雾都孤儿》" },
              { en: "A Tale of Two Cities", zh: "《双城记》" }, { en: "David Copperfield", zh: "《大卫·科波菲尔》" }],
          a: 2,
          note: { en: "Dickens's 1859 novel sets its opening in the age of revolution.", zh: "狄更斯1859年的小说以革命时代开篇。" },
        },
        {
          q: { en: "The Rubaiyat of Omar Khayyam is written in which form?", zh: "欧玛尔·海亚姆《柔巴依集》采用什么诗体？" },
          o: [{ en: "The sonnet", zh: "十四行诗" }, { en: "The quatrain", zh: "四行诗" },
              { en: "The haiku", zh: "俳句" }, { en: "The epic hexameter", zh: "史诗长行" }],
          a: 1,
          note: { en: "Each ruba'i is a four-line stanza rhyming aaba, as FitzGerald's translation kept.", zh: "每首柔巴依为四行一韵(aaba)，费兹杰罗译本保留了这一形式。" },
        },
        {
          q: { en: "Which poet wrote 'I took the road less traveled by'?", zh: "写下'而我选了人迹更少的一条'的是哪位诗人？" },
          o: [{ en: "Walt Whitman", zh: "惠特曼" }, { en: "Robert Frost", zh: "弗罗斯特" },
              { en: "Emily Dickinson", zh: "狄金森" }, { en: "Carl Sandburg", zh: "卡尔·桑德堡" }],
          a: 1,
          note: { en: "Frost's 'The Road Not Taken' closes on the line his readers quote most.", zh: "弗罗斯特《未选择的路》以此句收尾，也是他流传最广的一句。" },
        },
      ],
    },
    {
      id: "q16",
      labelKey: "rqD16",
      stars: [5, 4, 2],
      cards: [
        {
          q: { en: "How many chambers does the human heart have?", zh: "人类心脏有几个腔？" },
          o: [{ en: "Two", zh: "两个" }, { en: "Three", zh: "三个" },
              { en: "Four", zh: "四个" }, { en: "Six", zh: "六个" }],
          a: 2,
          note: { en: "Two atria receive blood and two ventricles pump it out.", zh: "两个心房收血，两个心室泵血。" },
        },
        {
          q: { en: "Which blood cells carry oxygen?", zh: "哪种血细胞负责携氧？" },
          o: [{ en: "White cells", zh: "白细胞" }, { en: "Red cells", zh: "红细胞" },
              { en: "Platelets", zh: "血小板" }, { en: "Plasma cells", zh: "浆细胞" }],
          a: 1,
          note: { en: "Haemoglobin in red cells binds oxygen in the lungs and releases it in the tissues.", zh: "红细胞中的血红蛋白在肺部携氧、在组织中释氧。" },
        },
        {
          q: { en: "The body's largest organ is which of these?", zh: "人体最大的器官是下列哪一个？" },
          o: [{ en: "The liver", zh: "肝脏" }, { en: "The skin", zh: "皮肤" },
              { en: "The brain", zh: "大脑" }, { en: "The lungs", zh: "肺" }],
          a: 1,
          note: { en: "An adult's skin weighs around four kilograms and renews itself about every month.", zh: "成年人皮肤约重4公斤，约每月更新一次。" },
        },
        {
          q: { en: "Insulin is produced in which organ?", zh: "胰岛素由哪个器官分泌？" },
          o: [{ en: "The pancreas", zh: "胰腺" }, { en: "The thyroid", zh: "甲状腺" },
              { en: "The spleen", zh: "脾脏" }, { en: "The kidneys", zh: "肾脏" }],
          a: 0,
          note: { en: "The pancreas's islet cells secrete insulin to move glucose out of the blood.", zh: "胰岛细胞分泌胰岛素，把葡萄糖移出血流。" },
        },
        {
          q: { en: "How many pairs of ribs does a typical adult have?", zh: "成年人一般有多少对肋骨？" },
          o: [{ en: "Ten", zh: "十对" }, { en: "Twelve", zh: "十二对" },
              { en: "Fourteen", zh: "十四对" }, { en: "Sixteen", zh: "十六对" }],
          a: 1,
          note: { en: "Twelve pairs, the lowest two of which 'float' without a front attachment.", zh: "十二对，最下两对不与胸前连接，称浮肋。" },
        },
        {
          q: { en: "Which part of the brain coordinates balance and fine motion?", zh: "脑的哪一部分负责协调平衡与精细动作？" },
          o: [{ en: "The cerebellum", zh: "小脑" }, { en: "The medulla", zh: "延脑" },
              { en: "The frontal lobe", zh: "额叶" }, { en: "The hippocampus", zh: "海马体" }],
          a: 0,
          note: { en: "The cerebellum holds more than half the brain's neurons despite its small share of its volume.", zh: "小脑体积不大，神经元数量却占全脑一半以上。" },
        },
        {
          q: { en: "The smallest bone in the body sits in which part?", zh: "人体最小的骨头位于何处？" },
          o: [{ en: "The wrist", zh: "手腕" }, { en: "The ear", zh: "耳朵" },
              { en: "The foot", zh: "脚掌" }, { en: "The spine", zh: "脊柱" }],
          a: 1,
          note: { en: "The stapes in the middle ear is about three millimetres long and transmits sound to the inner ear.", zh: "中耳的镫骨长约3毫米，负责把声音传入内耳。" },
        },
      ],
    },
    {
      id: "q17",
      labelKey: "rqD17",
      stars: [5, 4, 2],
      cards: [
        {
          q: { en: "The Mariana Trench lies in which ocean?", zh: "马里亚纳海沟位于哪个大洋？" },
          o: [{ en: "The Atlantic", zh: "大西洋" }, { en: "The Pacific", zh: "太平洋" },
              { en: "The Indian Ocean", zh: "印度洋" }, { en: "The Arctic", zh: "北冰洋" }],
          a: 1,
          note: { en: "Challenger Deep bottoms out near 10,900 metres, the ocean's deepest surveyed point.", zh: "挑战者深渊深约10900米，是已测得的海洋最深处。" },
        },
        {
          q: { en: "Coral reefs thrive in symbiosis with which organisms?", zh: "珊瑚礁与哪类生物共生而繁盛？" },
          o: [{ en: "Algae", zh: "藻类" }, { en: "Sponges", zh: "海绵" },
              { en: "Crabs", zh: "蟹类" }, { en: "Seagrass", zh: "海草" }],
          a: 0,
          note: { en: "Zooxanthellae algae live inside coral tissue, photosynthesising food for their host.", zh: "虫黄藻栖于珊瑚组织内，为宿主提供光合产物。" },
        },
        {
          q: { en: "Which current warms northwest Europe?", zh: "哪条洋流使西北欧温暖？" },
          o: [{ en: "The Gulf Stream's North Atlantic Drift", zh: "湾流的北大西洋暖流" }, { en: "The Humboldt Current", zh: "洪堡寒流" },
              { en: "The Canary Current", zh: "加那利寒流" }, { en: "The Kuroshio", zh: "黑潮" }],
          a: 0,
          note: { en: "The drift carries tropical heat northeast, keeping ports ice-free far above the latitude of Labrador.", zh: "暖流把热带热量送往东北，使远高于拉布拉多纬度的港口不冻。" },
        },
        {
          q: { en: "The Great Barrier Reef runs along which coast?", zh: "大堡礁沿哪片海岸延伸？" },
          o: [{ en: "Australia's northeast", zh: "澳大利亚东北" }, { en: "Australia's southeast", zh: "澳大利亚东南" },
              { en: "Africa's east", zh: "非洲东岸" }, { en: "Brazil's north", zh: "巴西北岸" }],
          a: 0,
          note: { en: "It stretches about 2,300 kilometres along Queensland - the largest reef system on Earth.", zh: "它沿昆士兰绵延约2300公里，是全球最大的珊瑚礁系统。" },
        },
        {
          q: { en: "Tides are raised mainly by which two bodies?", zh: "潮汐主要由哪两个天体引起？" },
          o: [{ en: "The Sun and Mars", zh: "太阳与火星" }, { en: "The Moon and the Sun", zh: "月球与太阳" },
              { en: "The Moon and Venus", zh: "月球与金星" }, { en: "Jupiter and the Moon", zh: "木星与月球" }],
          a: 1,
          note: { en: "The Moon's proximity beats the Sun's mass, so lunar tides dominate.", zh: "月球虽小而近，引潮力胜过太阳。" },
        },
        {
          q: { en: "Ocean currents are set in motion chiefly by which two forces?", zh: "洋流运动主要由哪两种力驱动？" },
          o: [{ en: "Wind and density differences", zh: "风与密度差" }, { en: "Moonlight and earthquakes", zh: "月光与地震" },
              { en: "Ship traffic and rain", zh: "航运与降雨" }, { en: "Volcanoes and tides only", zh: "火山与潮汐" }],
          a: 0,
          note: { en: "Surface winds drive the gyres while sinking cold, salty water powers the deep circulation.", zh: "表层风驱动环流，冷而咸的沉降海水带动深层环流。" },
        },
        {
          q: { en: "What share of Earth's surface does ocean cover, roughly?", zh: "海洋大约覆盖地球表面的百分之多少？" },
          o: [{ en: "About half", zh: "约一半" }, { en: "About 61 percent", zh: "约61%" },
              { en: "About 71 percent", zh: "约71%" }, { en: "About 85 percent", zh: "约85%" }],
          a: 2,
          note: { en: "About 71 percent, and the ocean holds roughly 97 percent of the planet's water.", zh: "约71%，且全球约97%的水在海洋。" },
        },
      ],
    },
    {
      id: "q18",
      labelKey: "rqD18",
      stars: [5, 4, 2],
      cards: [
        {
          q: { en: "How many strings does a standard classical guitar have?", zh: "标准古典吉他有几根弦？" },
          o: [{ en: "Four", zh: "四根" }, { en: "Five", zh: "五根" },
              { en: "Six", zh: "六根" }, { en: "Twelve", zh: "十二根" }],
          a: 2,
          note: { en: "Six nylon strings tuned E-A-d-g-b-e; twelve-string guitars pair them in courses.", zh: "六根尼龙弦按E-A-d-g-b-e定音；十二弦琴则成对配置。" },
        },
        {
          q: { en: "Beethoven wrote his final symphony while experiencing what?", zh: "贝多芬创作最后一部交响曲时处于什么状态？" },
          o: [{ en: "Complete deafness", zh: "完全失聪" }, { en: "Exile", zh: "流亡" },
              { en: "Youth", zh: "青年时期" }, { en: "Blindness", zh: "失明" }],
          a: 0,
          note: { en: "The Ninth premiered in 1824; its deaf composer had to be turned around to see the applause.", zh: "第九交响曲1824年首演，失聪的作曲家被转身才看见掌声。" },
        },
        {
          q: { en: "Which colour cannot be mixed from others, according to the traditional painter's wheel?", zh: "按传统画家色轮，下列哪种颜色无法由其他颜色调出？" },
          o: [{ en: "Brown", zh: "棕色" }, { en: "Violet", zh: "紫色" },
              { en: "Primary red", zh: "原色红" }, { en: "Olive", zh: "橄榄绿" }],
          a: 2,
          note: { en: "The three primaries - red, yellow, blue - are the wheel's unmixed starting points.", zh: "红黄蓝三原色是色轮上不可调配的起点。" },
        },
        {
          q: { en: "Katsushika Hokusai's Great Wave appears in which print series?", zh: "葛饰北斋《巨浪》出自哪套版画系列？" },
          o: [{ en: "Thirty-six Views of Mount Fuji", zh: "《富岳三十六景》" }, { en: "One Hundred Famous Views of Edo", zh: "《名所江户百景》" },
              { en: "Fifty-three Stations of the Tokaido", zh: "《东海道五十三次》" }, { en: "Sixty-nine Stations of the Kiso Road", zh: "《木曾街道六十九次》" }],
          a: 0,
          note: { en: "Under the Wave off Kanagawa opens the Fuji series, printed around 1831.", zh: "《神奈川冲浪里》为富士系列开卷，约1831年刊行。" },
        },
        {
          q: { en: "The piano's invention is credited to which maker?", zh: "钢琴的发明归功于哪位制琴师？" },
          o: [{ en: "Antonio Stradivari", zh: "斯特拉迪瓦里" }, { en: "Bartolomeo Cristofori", zh: "克里斯托弗里" },
              { en: "Andreas Stein", zh: "安德烈亚斯·施泰因" }, { en: "Sebastian Erard", zh: "埃拉尔" }],
          a: 1,
          note: { en: "Cristofori's Medici workshop built the gravicembalo col piano e forte around 1700.", zh: "克里斯托弗里约1700年在美第奇工坊造出'能弱能强'的羽管键琴。" },
        },
        {
          q: { en: "Which museum holds the Mona Lisa?", zh: "《蒙娜丽莎》藏于哪家博物馆？" },
          o: [{ en: "The Uffizi", zh: "乌菲兹美术馆" }, { en: "The Prado", zh: "普拉多博物馆" },
              { en: "The Louvre", zh: "卢浮宫" }, { en: "The Hermitage", zh: "冬宫" }],
          a: 2,
          note: { en: "Leonardo carried the panel to France; it entered the royal collection that became the Louvre's.", zh: "达·芬奇携画赴法，画作后入王室收藏，即卢浮宫的源头。" },
        },
        {
          q: { en: "In written music, what does a sharp sign do to a note?", zh: "乐谱中的升记号对音符起什么作用？" },
          o: [{ en: "Raises it a half step", zh: "升高半音" }, { en: "Lowers it a half step", zh: "降低半音" },
              { en: "Doubles its length", zh: "时值加倍" }, { en: "Silences it", zh: "使其静默" }],
          a: 0,
          note: { en: "A sharp raises the pitch one semitone; a flat lowers it, and a natural cancels both.", zh: "升记号升高半音，降记号降低半音，本位号取消两者。" },
        },
      ],
    },
    {
      id: "q19",
      labelKey: "rqD19",
      stars: [5, 4, 2],
      cards: [
        {
          q: { en: "Which staple crop originated in the Andes?", zh: "哪一种主粮起源于安第斯山区？" },
          o: [{ en: "Rice", zh: "水稻" }, { en: "The potato", zh: "马铃薯" },
              { en: "Wheat", zh: "小麦" }, { en: "Maize", zh: "玉米" }],
          a: 1,
          note: { en: "Potatoes were domesticated around Lake Titicaca and reached Europe in the sixteenth century.", zh: "马铃薯在的的喀喀湖一带驯化，十六世纪传入欧洲。" },
        },
        {
          q: { en: "Chocolate is prepared from the seeds of which tree?", zh: "巧克力由哪种树的种子制成？" },
          o: [{ en: "The cacao tree", zh: "可可树" }, { en: "The kola tree", zh: "可乐树" },
              { en: "The carob tree", zh: "角豆树" }, { en: "The coffee tree", zh: "咖啡树" }],
          a: 0,
          note: { en: "Cacao pods grow straight from the trunk, and the bitter seeds are fermented before roasting.", zh: "可可荚直接长在树干上，苦种子先发酵再烘焙。" },
        },
        {
          q: { en: "Which spice was once worth more than its weight in gold?", zh: "哪种香料一度贵比黄金？" },
          o: [{ en: "Black pepper", zh: "黑胡椒" }, { en: "Cinnamon", zh: "肉桂" },
              { en: "Saffron", zh: "藏红花" }, { en: "Cloves", zh: "丁香" }],
          a: 2,
          note: { en: "Saffron threads are hand-picked stigmas - about 150 flowers for a single gram.", zh: "藏红花是手工摘取的柱头，一克约需150朵花。" },
        },
        {
          q: { en: "Sourdough bread rises without commercial yeast thanks to what?", zh: "酸面包不加商业酵母也能发起，靠的是什么？" },
          o: [{ en: "A wild yeast and bacteria culture", zh: "野生酵母与菌种" }, { en: "Baking soda", zh: "小苏打" },
              { en: "Beer", zh: "啤酒" }, { en: "Sunlight", zh: "阳光" }],
          a: 0,
          note: { en: "A starter ferments flour and water with wild yeasts and lactic acid bacteria.", zh: "酵种以野生酵母与乳酸菌发酵面粉与水。" },
        },
        {
          q: { en: "Which drink was first brewed from hops in medieval Europe?", zh: "中世纪欧洲最先以啤酒花酿制的是哪种饮品？" },
          o: [{ en: "Mead", zh: "蜂蜜酒" }, { en: "Beer", zh: "啤酒" },
              { en: "Cider", zh: "苹果酒" }, { en: "Wine", zh: "葡萄酒" }],
          a: 1,
          note: { en: "Hops preserved beer and defined its bitter taste; Hildegard of Bingen recorded their use in the twelfth century.", zh: "啤酒花防腐并定其苦味，宾根的希尔德加德于十二世纪记录其用法。" },
        },
        {
          q: { en: "The tomato reached Europe from which region?", zh: "番茄从哪个地区传入欧洲？" },
          o: [{ en: "The Andes via Mesoamerica", zh: "经中美洲的安第斯地区" }, { en: "The Mediterranean", zh: "地中海" },
              { en: "Persia", zh: "波斯" }, { en: "The African savannah", zh: "非洲草原" }],
          a: 0,
          note: { en: "Tomatoes were domesticated in Mesoamerica from Andean ancestors and arrived in Spain in the sixteenth century.", zh: "番茄由安第斯祖先种在中美洲驯化，十六世纪传入西班牙。" },
        },
        {
          q: { en: "Honey never spoils mainly because it is what?", zh: "蜂蜜久存不坏主要因为它是什么？" },
          o: [{ en: "Very low in water and acidic", zh: "含水极低且呈酸性" }, { en: "Irradiated by the hive", zh: "经蜂巢辐照" },
              { en: "Full of wax", zh: "富含蜂蜡" }, { en: "Kept frozen", zh: "冷藏保存" }],
          a: 0,
          note: { en: "Edible honey has been recovered from millennia-old Egyptian tombs.", zh: "埃及数千年古墓中曾出土可食用的蜂蜜。" },
        },
      ],
    },
    {
      id: "q20",
      labelKey: "rqD20",
      stars: [5, 4, 2],
      cards: [
        {
          q: { en: "The first practical steam engine to pump water was improved by which engineer?", zh: "首台实用的抽水蒸汽机由哪位工程师改良？" },
          o: [{ en: "James Watt", zh: "瓦特" }, { en: "Thomas Newcomen", zh: "纽科门" },
              { en: "Richard Trevithick", zh: "特里维西克" }, { en: "George Stephenson", zh: "斯蒂芬森" }],
          a: 1,
          note: { en: "Newcomen's 1712 engine drained mines; Watt's separate condenser later cut its fuel bill fourfold.", zh: "纽科门1712年的机器为矿井排水；瓦特的分离冷凝器后来把燃料开支降到四分之一。" },
        },
        {
          q: { en: "Which railway opened as the first public steam-hauled line?", zh: "哪条铁路是世界上首条公共蒸汽铁路？" },
          o: [{ en: "The Stockton and Darlington", zh: "斯托克顿—达灵顿铁路" }, { en: "The Liverpool and Manchester", zh: "利物浦—曼彻斯特铁路" },
              { en: "The Baltimore and Ohio", zh: "巴尔的摩—俄亥俄铁路" }, { en: "The Trans-Siberian", zh: "西伯利亚大铁路" }],
          a: 0,
          note: { en: "The 1825 Stockton and Darlington line ran Stephenson's Locomotion No. 1 for public freight and passengers.", zh: "1825年的斯托克顿—达灵顿铁路以'动力一号'承运公共货运与客旅。" },
        },
        {
          q: { en: "The spinning jenny let one worker spin what?", zh: "珍妮纺纱机让一名工人能同时纺什么？" },
          o: [{ en: "Many threads at once", zh: "多根纱线" }, { en: "Silk only", zh: "仅蚕丝" },
              { en: "Copper wire", zh: "铜丝" }, { en: "Rope", zh: "绳索" }],
          a: 0,
          note: { en: "Hargreaves's 1764 jenny began with eight spindles and grew to over a hundred.", zh: "哈格里夫斯1764年的珍妮机由八锭起步，后增至逾百锭。" },
        },
        {
          q: { en: "London's Great Stink of 1858 drove which civic project?", zh: "1858年伦敦'大恶臭'推动了哪项市政工程？" },
          o: [{ en: "The sewer system of Joseph Bazalgette", zh: "巴泽尔杰特的下水道系统" }, { en: "The Underground railway", zh: "地下铁路" },
              { en: "The Thames bridges", zh: "泰晤士桥群" }, { en: "The postal reform", zh: "邮政改革" }],
          a: 0,
          note: { en: "Parliament acted in weeks; Bazalgette's intercepting sewers and embankments followed.", zh: "议会数周内立法，巴泽尔杰特的截流下水道与滨河工程随之兴建。" },
        },
        {
          q: { en: "Bessemer's converter made which material cheap for the first time?", zh: "贝塞麦转炉首次让哪种材料变得廉价？" },
          o: [{ en: "Aluminium", zh: "铝" }, { en: "Steel", zh: "钢" },
              { en: "Rubber", zh: "橡胶" }, { en: "Glass", zh: "玻璃" }],
          a: 1,
          note: { en: "Blasting air through molten pig iron burned off carbon in minutes, making cheap rails and frames possible.", zh: "向铁水鼓风数分钟即除碳，廉价钢轨与钢架由此可能。" },
        },
        {
          q: { en: "The first transcontinental telegraph completed in North America ended the career of what?", zh: "北美首条横贯电报线竣工结束了什么事业？" },
          o: [{ en: "The Pony Express", zh: "小马快递" }, { en: "The stagecoach", zh: "驿马车" },
              { en: "The canal barge", zh: "运河驳船" }, { en: "The clipper ship", zh: "飞剪式帆船" }],
          a: 0,
          note: { en: "The 1861 line crossed the continent in days of construction and two days of messages; the Pony Express folded almost at once.", zh: "1861年线路数月建成、消息两日横贯，小马快递几乎立即歇业。" },
        },
        {
          q: { en: "Which development made skyscrapers practical?", zh: "哪项技术使摩天楼成为可能？" },
          o: [{ en: "The safety elevator and steel frames", zh: "安全电梯与钢框架" }, { en: "Reinforced glass", zh: "强化玻璃" },
              { en: "Air conditioning", zh: "空调" }, { en: "The telephone", zh: "电话" }],
          a: 0,
          note: { en: "Otis's 1852 safety brake and Bessemer steel let buildings climb past ten storeys.", zh: "奥的斯1852年的安全制动器与贝塞麦钢让建筑突破十层。" },
        },
      ],
    },
    {
      id: "q21",
      labelKey: "rqD21",
      stars: [5, 4, 2],
      cards: [
        {
          q: { en: "Which motto did Immanuel Kant identify as the herald of the Enlightenment?", zh: "康德将哪句箴言视为启蒙运动的先声？" },
          o: [{ en: "Sapere aude (Dare to know)", zh: "敢于求知（Sapere aude）" }, { en: "Cogito, ergo sum", zh: "我思故我在" },
              { en: "Tabula rasa", zh: "白板说" }, { en: "Amor fati", zh: "命运之爱" }],
          a: 0,
          note: { en: "Kant's 1784 essay defined Enlightenment as human emergence from self-imposed tutelage, calling on all to 'Dare to know!'.", zh: "康德在1784年的文章中将启蒙定义为人类走出自我招致的不成熟，呼吁人们'敢于求知！'。" },
        },
        {
          q: { en: "Jeremy Bentham formulated which ethical doctrine based on the greatest happiness principle?", zh: "边沁创立了基于'最大幸福原则'的哪种伦理学说？" },
          o: [{ en: "Utilitarianism", zh: "功利主义" }, { en: "Virtue ethics", zh: "美德伦理学" },
              { en: "Deontology", zh: "义务论" }, { en: "Nihilism", zh: "虚无主义" }],
          a: 0,
          note: { en: "Bentham proposed evaluating actions by whether they maximize pleasure and minimize suffering for the greatest number.", zh: "边沁提出应以行为是否能为绝大多数人带来最大快乐、减少痛苦来衡量道德。" },
        },
        {
          q: { en: "Jean-Jacques Rousseau opened 'The Social Contract' with which famous proclamation?", zh: "卢梭在《社会契约论》开篇写下了哪句名言？" },
          o: [{ en: "Man is born free, and everywhere he is in chains", zh: "人人生而自由，却无往不在枷锁之中" }, { en: "Life without philosophy is blind", zh: "未经省察的人生不值得过" },
              { en: "Knowledge is power", zh: "知识就是力量" }, { en: "God is dead", zh: "上帝已死" }],
          a: 0,
          note: { en: "Rousseau sought political legitimacy through the 'general will' of equal sovereign citizens.", zh: "卢梭试图通过主权公民平等的'公意'来构建政治合法性。" },
        },
        {
          q: { en: "Who introduced the concept of the 'categorical imperative' in moral philosophy?", zh: "道德哲学中的'定言令式'由谁提出？" },
          o: [{ en: "Immanuel Kant", zh: "康德" }, { en: "David Hume", zh: "休谟" },
              { en: "John Locke", zh: "洛克" }, { en: "Baruch Spinoza", zh: "斯宾诺莎" }],
          a: 0,
          note: { en: "Kant held that moral commands must be unconditional and universalizable across all rational beings.", zh: "康德认为道德法则必须无条件且适用于一切理性存在者。" },
        },
        {
          q: { en: "Which 19th-century Danish thinker is recognized as the father of Christian existentialism?", zh: "哪位19世纪丹麦思想家被公认为基督教存在主义之父？" },
          o: [{ en: "Søren Kierkegaard", zh: "克尔凯郭尔" }, { en: "Arthur Schopenhauer", zh: "叔本华" },
              { en: "Friedrich Nietzsche", zh: "尼采" }, { en: "Henri Bergson", zh: "柏格森" }],
          a: 0,
          note: { en: "Kierkegaard examined individual angst, choice, and the 'leap of faith' in works like 'Fear and Trembling'.", zh: "克尔凯郭尔在《恐惧与战栗》等著作中深入探讨了个体焦虑、抉择与'信仰之跃'。" },
        },
        {
          q: { en: "Thomas Kuhn coined which term to describe fundamental shifts in scientific worldviews?", zh: "托马斯·库恩用哪个术语指代科学世界观的根本转变？" },
          o: [{ en: "Paradigm shift", zh: "范式转换" }, { en: "Dialectical leap", zh: "辩证飞跃" },
              { en: "Epistemic rupture", zh: "认识断裂" }, { en: "Critical threshold", zh: "临界阈值" }],
          a: 0,
          note: { en: "Kuhn's 1962 'The Structure of Scientific Revolutions' showed science advances through sudden paradigm replacements.", zh: "库恩在1962年的《科学革命的结构》中阐述了科学通过范式颠覆实现飞跃的发展机制。" },
        },
        {
          q: { en: "Which philosophical school, pioneered by Peirce and James, evaluates ideas by their practical consequences?", zh: "由皮尔士和詹姆斯开创、以实践效果衡量思想的哲学流派是？" },
          o: [{ en: "Pragmatism", zh: "实用主义" }, { en: "Rationalism", zh: "唯理主义" },
              { en: "Scholasticism", zh: "经院哲学" }, { en: "Phenomenology", zh: "现象学" }],
          a: 0,
          note: { en: "American pragmatism asserted that the meaning and truth of a belief reside in its observable consequences in life.", zh: "美国实用主义主张观念的意义与真理性在于其在生活中的实际效用与体验。" },
        },
      ],
    },
    {
      id: "q22",
      labelKey: "rqD22",
      stars: [5, 4, 2],
      cards: [
        {
          q: { en: "Brunelleschi constructed the dome of Florence Cathedral without which traditional support?", zh: "布鲁内莱斯基建造佛罗伦萨大教堂穹顶时摒弃了哪种传统支撑？" },
          o: [{ en: "Wooden centering scaffolds", zh: "木质支撑拱架" }, { en: "Mortar", zh: "灰浆" },
              { en: "Brick rings", zh: "砖砌环带" }, { en: "Stone ribs", zh: "石质肋拱" }],
          a: 0,
          note: { en: "Brunelleschi invented self-supporting herringbone brickwork and innovative hoisting cranes.", zh: "布鲁内莱斯基发明了自承重的鱼骨砌砖法与起重吊机，免去了庞大的木拱架。" },
        },
        {
          q: { en: "Which architectural element allowed Gothic cathedrals to open wide stained-glass walls?", zh: "哪种建筑构件使哥特式大教堂得以开辟高大的彩色玻璃花窗？" },
          o: [{ en: "Flying buttresses", zh: "飞扶壁" }, { en: "Solid dome pendentive", zh: "实心帆拱" },
              { en: "Barrel vaults", zh: "筒形拱顶" }, { en: "Cantilevered balconies", zh: "悬臂外廊" }],
          a: 0,
          note: { en: "Flying buttresses carried lateral thrusts outside to external piers, relieving the walls of heavy stone loads.", zh: "飞扶壁将拱顶的横向推力引向外侧立柱，使外墙摆脱承重束缚以开大窗。" },
        },
        {
          q: { en: "The Roman Pont du Gard aqueduct carried mountain spring water using which driving force?", zh: "罗马著名的加尔桥输水道依靠什么动力输送山泉？" },
          o: [{ en: "Gentle natural gravity gradient", zh: "微小的自然重力坡度" }, { en: "Water wheels", zh: "水车提水" },
              { en: "Pneumatic siphons", zh: "气动虹吸" }, { en: "Steam pumps", zh: "蒸汽水泵" }],
          a: 0,
          note: { en: "Dropping merely 12 metres over 50 kilometres (about 1:3000), it delivered millions of gallons daily to Nîmes.", zh: "输水道全长50公里仅落差12米（坡度约三千分之一），每日为尼姆送水上万立方米。" },
        },
        {
          q: { en: "Gustave Eiffel's 1889 tower demonstrated the structural strength of which refined metal?", zh: "居斯塔夫·埃菲尔的1889年铁塔展现了哪种精炼金属的结构强度？" },
          o: [{ en: "Puddle iron (wrought iron)", zh: "锻铁（熟铁/搅拌铁）" }, { en: "Cast bronze", zh: "铸造青铜" },
              { en: "Galvanized titanium", zh: "镀锌钛合金" }, { en: "Stainless steel", zh: "不锈钢" }],
          a: 0,
          note: { en: "Composed of over 18,000 wrought-iron pieces riveted together, it stood as the world's tallest man-made structure for 41 years.", zh: "铁塔由逾1.8万个锻铁构件铆接而成，保持世界最高人造建筑纪录长达41年。" },
        },
        {
          q: { en: "The Panama Canal bypassed mountain ranges and sea-level differences through which engineering solution?", zh: "巴拿马运河通过哪项工程方案克服了山脉阻隔与水位差？" },
          o: [{ en: "Gravity-fed water locks and Gatun Lake", zh: "重力船闸与加通人工湖" }, { en: "A continuous sea-level trench", zh: "全平原海平面深槽" },
              { en: "Electric boat elevators", zh: "大型电动升船机" }, { en: "Underground tunnel siphons", zh: "地下隧道暗河" }],
          a: 0,
          note: { en: "Ships are lifted 26 metres above sea level into Lake Gatun via three sets of paired water locks.", zh: "通过三组阶梯船闸利用加通湖重力水将船舶抬升26米穿过分水岭。" },
        },
        {
          q: { en: "The Golden Gate Bridge was designed with aerodynamic deck stiffening after engineers studied what?", zh: "在研究了哪种自然力影响后，金门大桥强化了空气动力学抗风设计？" },
          o: [{ en: "Pacific gale vortex shedding and wind oscillation", zh: "太平洋风暴涡流与风振" }, { en: "Saltwater expansion", zh: "海盐膨胀" },
              { en: "Tidal cavitation", zh: "潮汐空化" }, { en: "Solar expansion waves", zh: "日照热胀波" }],
          a: 0,
          note: { en: "Chief engineer Joseph Strauss and consulting mathematicians reinforced the truss to resist catastrophic wind resonance.", zh: "工程师团队强化了钢桁梁抗风设计，使跨海长桥能抵御强风共振风险。" },
        },
        {
          q: { en: "Which 20th-century design school in Weimar championed 'form follows function' and industrial craft?", zh: "魏玛建立的哪所20世纪设计学院倡导'形式追随功能'与工业手艺结合？" },
          o: [{ en: "Bauhaus", zh: "包豪斯" }, { en: "Art Nouveau", zh: "新艺术运动" },
              { en: "Beaux-Arts", zh: "巴黎美术学院" }, { en: "Constructivism", zh: "构成主义" }],
          a: 0,
          note: { en: "Founded by Walter Gropius in 1919, the Bauhaus revolutionized modern architecture, typography, and product design.", zh: "瓦尔特·格罗皮乌斯于1919年创立的包豪斯深刻影响了现代建筑与工业设计体系。" },
        },
      ],
    },
    {
      id: "q23",
      labelKey: "rqD23",
      stars: [5, 4, 2],
      cards: [
        {
          q: { en: "Gerardus Mercator's 1569 map projection was revolutionary for mariners because lines of constant compass bearing plot as what?", zh: "麦卡托1569年的地图投影对航海家极具革命性，因为恒定航向线在图上表现为？" },
          o: [{ en: "Straight lines (rhumb lines)", zh: "直线（等角航线）" }, { en: "Elliptical curves", zh: "椭圆曲线" },
              { en: "Sine waves", zh: "正弦波" }, { en: "Parabolas", zh: "抛物线" }],
          a: 0,
          note: { en: "Navigators could draw a single straight line on the chart and sail by maintaining a constant compass heading.", zh: "航海家只需在海图上连一直线，沿途保持固定罗盘读数即可航行。" },
        },
        {
          q: { en: "John Harrison solved the centuries-old 'longitude problem' at sea by inventing which device?", zh: "约翰·哈里森通过发明什么精密仪器解决了海上的'经度难题'？" },
          o: [{ en: "A marine chronometer unaffected by motion (H4)", zh: "抗晃动精密航海钟（H4）" }, { en: "The optical sextant", zh: "光学六分仪" },
              { en: "The magnetic gyrocompass", zh: "磁力陀螺罗经" }, { en: "The mercury barometer", zh: "水银气压计" }],
          a: 0,
          note: { en: "Comparing local solar noon to Greenwich time carried on an accurate clock yielded exact longitude.", zh: "将当地正午太阳与精准钟表指示的格林尼治时间比对，即可推算出经度。" },
        },
        {
          q: { en: "Which lone surviving ship completed Magellan's circumnavigation under Juan Sebastián Elcano in 1522?", zh: "麦哲伦船队在埃尔卡诺带领下，1522年仅存哪艘船完成了人类首次环球航行？" },
          o: [{ en: "The Victoria", zh: "维多利亚号" }, { en: "The Trinidad", zh: "特立尼达号" },
              { en: "The Santa Maria", zh: "圣玛利亚号" }, { en: "The Golden Hind", zh: "金鹿号" }],
          a: 0,
          note: { en: "Out of five ships and 270 men who departed Spain in 1519, only the Victoria and 18 crew members returned.", zh: "1519年从西班牙出发的五艘船270人中，最终只有维多利亚号携18名水手归航。" },
        },
        {
          q: { en: "Which crucial oasis garrison guarded the convergence of the northern and southern Silk Roads?", zh: "扼守古代丝绸之路南北两线交汇点的著名绿洲咽喉是哪座城市？" },
          o: [{ en: "Dunhuang", zh: "敦煌" }, { en: "Chang'an", zh: "长安" },
              { en: "Kashgar", zh: "喀什" }, { en: "Turpan", zh: "吐鲁番" }],
          a: 0,
          note: { en: "Dunhuang served as the gateway between the Hexi Corridor and the Taklamakan Desert, famed for its Mogao Caves.", zh: "敦煌位于河西走廊西端与塔克拉玛干沙漠交界处，以莫高窟与咽喉重镇闻名。" },
        },
        {
          q: { en: "Who led the first successful expedition through the elusive Northwest Passage in 1903-1906?", zh: "谁在1903至1906年间率领船队首次成功穿航西北航道？" },
          o: [{ en: "Roald Amundsen", zh: "罗尔德·阿蒙森" }, { en: "John Franklin", zh: "约翰·富兰克林" },
              { en: "Robert Peary", zh: "罗伯特·皮里" }, { en: "Fridtjof Nansen", zh: "弗里乔夫·南森" }],
          a: 0,
          note: { en: "Amundsen navigated the shallow Arctic maze aboard the small herring boat Gjøa, learning Inuit winter survival skills.", zh: "阿蒙森驾驶小帆船'约阿号'穿越北极碎冰群岛，并向因纽特人学习极地生存之道。" },
        },
        {
          q: { en: "The decipherment of Egyptian hieroglyphs by Champollion in 1822 was unlocked by which artefact?", zh: "商博良在1822年破译埃及象形文字，关键依托了哪件刻有三体对照文本的文物？" },
          o: [{ en: "The Rosetta Stone", zh: "罗塞塔石碑" }, { en: "The Narmer Palette", zh: "那尔迈调色板" },
              { en: "The Papyrus of Ani", zh: "阿尼纸草书" }, { en: "The Turin King List", zh: "都灵王表" }],
          a: 0,
          note: { en: "The stone bore the same priestly decree in Egyptian hieroglyphs, Demotic, and Ancient Greek.", zh: "石碑上刻有同篇僧侣诏书的三种文字：象形文、通俗体与古希腊文。" },
        },
        {
          q: { en: "Which dietary staple was strictly rationed aboard Captain Cook's voyages to eliminate scurvy?", zh: "库克船长的远航通过在船员伙食中严格定量配发什么，成功克服了坏血病？" },
          o: [{ en: "Sauerkraut and malt wort", zh: "腌酸菜与麦芽汁" }, { en: "Salt pork", zh: "腌咸肉" },
              { en: "Dried cod", zh: "干鳕鱼" }, { en: "Hardtack biscuits", zh: "压缩硬饼干" }],
          a: 0,
          note: { en: "By enforcing cleanliness, ventilation, and daily vitamin-rich preserved cabbage, Cook lost not a single man to scurvy.", zh: "库克严格要求舱室卫生并在饮食中每日供应富含维生素的腌酸菜，实现了零坏血病死亡。" },
        },
      ],
    },
    {
      id: "q24",
      labelKey: "rqD24",
      stars: [5, 4, 2],
      cards: [
        {
          q: { en: "Ada Lovelace wrote the world's first published machine algorithm for which proposed mechanical computer?", zh: "阿达·洛芙莱斯为哪种构想中的机械计算机编写了世界上首个公开发表的算法？" },
          o: [{ en: "Charles Babbage's Analytical Engine", zh: "查尔斯·巴贝奇的分析机" }, { en: "The Difference Engine No. 1", zh: "差分机一号" },
              { en: "Pascal's Pascaline", zh: "帕斯卡加法器" }, { en: "The Hollerith tabulator", zh: "霍勒里斯打孔机" }],
          a: 0,
          note: { en: "Lovelace's 1843 notes included an algorithm to calculate Bernoulli numbers, anticipating general computing.", zh: "阿达1843年的注解中包含计算伯努利数的算法步骤，预见了通用计算的未来。" },
        },
        {
          q: { en: "Claude Shannon's 1948 landmark paper established which fundamental field of engineering?", zh: "克劳德·香农在1948年的开创性论文中奠定了哪门工程学科的基础？" },
          o: [{ en: "Information Theory", zh: "信息论" }, { en: "Cybernetics", zh: "控制论" },
              { en: "Quantum electrodynamics", zh: "量子电动力学" }, { en: "Finite element analysis", zh: "有限元分析" }],
          a: 0,
          note: { en: "Shannon defined the 'bit' as the fundamental unit of information and proved channel capacity limits.", zh: "香农将'比特'确立为信息度量基准，并证明了噪声信道编码的传输极限容量。" },
        },
        {
          q: { en: "Alan Turing designed which electromechanical machine to break the Enigma cipher at Bletchley Park?", zh: "阿兰·图灵在布莱切利庄园设计了哪种机电设备以破译恩尼格玛密码？" },
          o: [{ en: "The Bombe", zh: "炸弹机（Bombe）" }, { en: "The Colossus", zh: "巨人机（Colossus）" },
              { en: "The Curta calculator", zh: "科塔计算器" }, { en: "The Manchester Mark 1", zh: "曼彻斯特一号" }],
          a: 0,
          note: { en: "Turing's Bombe simulated dozens of rotating Enigma rotors simultaneously to deduce daily German keys.", zh: "图灵的炸弹机通过同时模拟多组转子轮盘运动，大幅加速破解德军每日通讯密钥。" },
        },
        {
          q: { en: "What breakthrough invention at Bell Labs in 1947 replaced fragile vacuum tubes?", zh: "贝尔实验室在1947年发明了什么划时代器件，取代了脆弱庞大的真空电子管？" },
          o: [{ en: "The point-contact transistor", zh: "点接触晶体管" }, { en: "The cathode ray tube", zh: "阴极射线管" },
              { en: "The ferrite core memory", zh: "磁芯存储器" }, { en: "The printed circuit board", zh: "印刷电路板" }],
          a: 0,
          note: { en: "Bardeen, Brattain, and Shockley won the Nobel Prize for inventing the solid-state semiconductor amplifier.", zh: "巴丁、布拉顿与肖克利凭借固态半导体放大器件的发明荣获诺贝尔物理学奖。" },
        },
        {
          q: { en: "The 1969 transmission between UCLA and Stanford marked the birth of which packet-switched network?", zh: "1969年加利福尼亚大学洛杉矶分校与斯坦福之间的连线标志着哪个分组交换网络的诞生？" },
          o: [{ en: "ARPANET", zh: "阿帕网（ARPANET）" }, { en: "ALOHANET", zh: "阿罗哈网（ALOHANET）" },
              { en: "Usenet", zh: "新闻组网（Usenet）" }, { en: "Bitnet", zh: "比特网（Bitnet）" }],
          a: 0,
          note: { en: "Pioneered by DARPA, ARPANET introduced decentralised packet switching that grew into the global Internet.", zh: "在五角大楼高级研究计划局资助下，阿帕网开创了分布式分组数据交换技术。" },
        },
        {
          q: { en: "Tim Berners-Lee invented the World Wide Web in 1989 while working at which research centre?", zh: "蒂姆·伯纳斯-李在1989年发明万维网时正在哪座欧洲研究机构工作？" },
          o: [{ en: "CERN", zh: "欧洲核子研究中心（CERN）" }, { en: "Max Planck Institute", zh: "马克斯·普朗克研究所" },
              { en: "Rutherford Appleton Laboratory", zh: "拉瑟福德实验室" }, { en: "Cambridge Computer Lab", zh: "剑桥大学计算机实验室" }],
          a: 0,
          note: { en: "He created HTML, HTTP, and the first web browser to allow physicists to share hyperlinked research globally.", zh: "他设计了HTML、HTTP协议与首个网页浏览器，以便全球科研人员共享超链接学术文档。" },
        },
        {
          q: { en: "Which theoretical problem, proven unsolvable by Turing in 1936, established fundamental limits of computing?", zh: "图灵在1936年证明不可解的哪个著名问题，划定了机器计算的根本极限？" },
          o: [{ en: "The Halting Problem", zh: "停机问题（Halting Problem）" }, { en: "The Travelling Salesperson Problem", zh: "旅行商问题" },
              { en: "The P versus NP problem", zh: "P与NP问题" }, { en: "The Collatz Conjecture", zh: "考拉兹猜想" }],
          a: 0,
          note: { en: "Turing demonstrated that no general algorithm can decide whether an arbitrary program will ever halt or run forever.", zh: "图灵证明了不存在通用的预言算法能在有限时间内判断任意程序是否会停机。" },
        },
      ],
    },
  ];

  function rqText(pair) {
    return (App.currentLang === "zh" ? pair.zh : pair.en) || pair.en;
  }

  function rqShuffle(list) {
    var order = list.slice();
    for (var index = order.length - 1; index > 0; index -= 1) {
      var swap = Math.floor(Math.random() * (index + 1));
      var held = order[index];
      order[index] = order[swap];
      order[swap] = held;
    }
    return order;
  }

  function initRepublicQuizGame() {
    var questionEl = getElement("rqQuestion");
    var optionsEl = getElement("rqOptions");
    var noteEl = getElement("rqNote");
    var progressEl = getElement("rqProgress");
    var scoreEl = getElement("rqScore");
    var streakEl = getElement("rqStreak");
    var resultEl = getElement("rqResult");
    var nextBtn = getElement("rqNextBtn");
    var newBtn = getElement("rqNewBtn");
    var bestEl = getElement("rqBest");
    var deckEl = getElement("rqDeckSel");
    if (
      !questionEl ||
      !optionsEl ||
      !noteEl ||
      !progressEl ||
      !scoreEl ||
      !streakEl ||
      !resultEl ||
      !nextBtn ||
      !newBtn ||
      !bestEl ||
      !deckEl
    ) {
      return;
    }

    var campaign = createCampaign({ key: "republic-quiz-campaign", levels: rqDecks });
    var deck = rqDecks[campaign.indexOf(campaign.nextLevelId())];
    var order = [];
    var optionOrder = [];
    var position = 0;
    var score = 0;
    var answered = false;
    var done = false;
    var streakKey = "republic-quiz-streak";

    function readInt(key) {
      var value = parseInt(localStorage.getItem(key), 10);
      return isNaN(value) ? 0 : value;
    }

    function currentCard() {
      return deck.cards[order[position]];
    }

    function renderHud() {
      progressEl.textContent = Math.min(position + 1, deck.cards.length) + "/" + deck.cards.length;
      scoreEl.textContent = String(score);
      streakEl.textContent = String(readInt(streakKey));
    }

    function renderCard() {
      var card = currentCard();
      answered = false;
      questionEl.textContent = rqText(card.q);
      optionsEl.textContent = "";
      noteEl.textContent = "";
      optionOrder = rqShuffle(card.o.map(function (option, index) { return index; }));
      optionOrder.forEach(function (index) {
        var button = document.createElement("button");
        button.type = "button";
        button.className = "rq-option";
        button.textContent = rqText(card.o[index]);
        button.addEventListener("click", function () {
          choose(index);
        });
        optionsEl.appendChild(button);
      });
      nextBtn.disabled = true;
      renderHud();
    }

    function reveal(card) {
      var buttons = optionsEl.children;
      for (var index = 0; index < buttons.length; index += 1) {
        buttons[index].disabled = true;
        if (optionOrder[index] === card.a) {
          buttons[index].classList.add("is-right");
        }
      }
    }

    function choose(index) {
      if (answered || done) {
        return;
      }
      var card = currentCard();
      answered = true;
      var right = index === card.a;
      if (right) {
        score += 1;
        localStorage.setItem(streakKey, String(readInt(streakKey) + 1));
      } else {
        localStorage.setItem(streakKey, "0");
        optionsEl.children[optionOrder.indexOf(index)].classList.add("is-wrong");
      }
      reveal(card);
      noteEl.textContent = rqText(card.note);
      nextBtn.disabled = false;
      nextBtn.focus();
      renderHud();
    }

    function advance() {
      if (!answered || done) {
        return;
      }
      if (position + 1 >= deck.cards.length) {
        finish();
        return;
      }
      position += 1;
      renderCard();
    }

    function finish() {
      done = true;
      var starsWon = starsFor(score, deck.stars, "high");
      var outcome = campaign.record(deck.id, {
        stars: starsWon,
        best: score,
        better: "high",
      });
      var message =
        t("rqScored", { n: score, total: deck.cards.length, s: starsWon }) +
        (outcome.isBest ? " " + t("newBest") : "");
      if (outcome.unlockedNext) {
        message += " " + t("rqNextDeck");
      } else if (campaign.clearedCount() === rqDecks.length) {
        message += " " + t("rqAllDecks");
      }
      resultEl.textContent = message;
      logAction(t("logRepublic", { n: score + "/" + deck.cards.length }));
      if (starsWon) {
        var rect = newBtn.getBoundingClientRect();
        createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      }
      petNotifyGame(outcome.isBest || outcome.firstClear);
      questionEl.textContent = t("rqDeckDone");
      optionsEl.textContent = "";
      noteEl.textContent = "";
      nextBtn.disabled = true;
      renderHud();
      refreshPicker();
    }

    function refreshPicker() {
      fillCampaignPicker(
        deckEl,
        campaign,
        function (def) {
          return t(def.labelKey);
        },
        t("elementsLocked"),
      );
      deckEl.value = deck.id;
      bestEl.textContent = t("campaignStars", {
        n: campaign.totalStars(),
        max: campaign.maxStars(),
      });
    }

    function startRound(deckDef) {
      deck = deckDef || deck;
      order = rqShuffle(
        deck.cards.map(function (card, index) {
          return index;
        }),
      );
      position = 0;
      score = 0;
      done = false;
      renderCard();
      refreshPicker();
      resultEl.textContent = t("rqPrompt", {
        name: t(deck.labelKey),
        n: deck.cards.length,
      });
    }

    nextBtn.addEventListener("click", advance);
    newBtn.addEventListener("click", function () {
      startRound();
    });
    deckEl.addEventListener("change", function () {
      var index = campaign.indexOf(deckEl.value);
      if (index >= 0 && campaign.isUnlocked(deckEl.value)) {
        startRound(rqDecks[index]);
      }
    });

    startRound(deck);
  }


  /* The ten-deck ladder: rungs one to seven are named in i18n.js, the three new
   * ones travel with this file. addStrings only fills keys the shared dictionary
   * does not already hold, and card copy (question, options, note) is carried
   * bilingually inside each deck row, so nothing here shadows i18n.js. */
  App.addStrings({
    en: {
      "rqD8": "Faith & Festivals",
      "rqD9": "Letters & Screens",
      "rqD10": "Across the Centuries",
      "rqD11": "World Atlas", "rqD12": "The Ancient World", "rqD13": "The Night Sky",
      "rqD14": "Inventions", "rqD15": "World Letters", "rqD16": "The Human Machine",
      "rqD17": "The Deep Blue", "rqD18": "Art and Music", "rqD19": "Harvest and Table", "rqD20": "The Industrial Age",
      "rqD21": "Modern Thought", "rqD22": "Engineering Marvels", "rqD23": "Age of Discovery", "rqD24": "The Computing Age",
    },
    zh: {
      "rqD8": "信俗篇",
      "rqD9": "文艺篇",
      "rqD10": "贯通篇",
      "rqD11": "世界地图", "rqD12": "古代世界", "rqD13": "夜空",
      "rqD14": "发明故事", "rqD15": "世界文学", "rqD16": "人体机器",
      "rqD17": "深蓝海洋", "rqD18": "艺术与音乐", "rqD19": "物产餐桌", "rqD20": "工业时代",
      "rqD21": "近现代思想", "rqD22": "工程奇迹", "rqD23": "大航海时代", "rqD24": "计算时代",
    },
  });

  /* Exported for the other modules. */
  App.republicDecks = rqDecks;
  App.initRepublicQuizGame = initRepublicQuizGame;
})(window.CapitalConvert = window.CapitalConvert || {});
