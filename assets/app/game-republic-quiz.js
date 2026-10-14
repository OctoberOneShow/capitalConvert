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
    },
    zh: {
      "rqD8": "信俗篇",
      "rqD9": "文艺篇",
      "rqD10": "贯通篇",
    },
  });

  /* Exported for the other modules. */
  App.republicDecks = rqDecks;
  App.initRepublicQuizGame = initRepublicQuizGame;
})(window.CapitalConvert = window.CapitalConvert || {});
