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
  /* `a` is the zero-based index of the right option; `stars` are the counts of
   * correct answers worth 3, 2 and 1 star. */
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


  /* Exported for the other modules. */
  App.republicDecks = rqDecks;
  App.initRepublicQuizGame = initRepublicQuizGame;
})(window.CapitalConvert = window.CapitalConvert || {});
