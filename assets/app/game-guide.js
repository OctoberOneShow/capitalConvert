/* Game Guide - Per-game visual how-to. Injects a collapsible panel into
 * every game drawer panel: a mechanic diagram plus three or four concrete
 * steps, so no game needs guesswork to start. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  var t = App.t;
  var getElement = App.getElement;

  function board() {
    return '<rect x="6" y="6" width="108" height="64" rx="5" fill="rgba(30,41,59,.75)" stroke="rgba(148,163,184,.45)"/>';
  }
  function arrowRight(x, y) {
    return (
      '<path d="M' + x + " " + y + 'h16" stroke="#22d3ee" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      '<path d="M' + (x + 13) + " " + (y - 5) + 'l7 5-7 5" fill="none" stroke="#22d3ee" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'
    );
  }

  var guideData = {
    typing: {
      panel: "gamePanelTyping",
      svg: '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' + board() +
        '<rect x="18" y="22" width="58" height="5" rx="2" fill="#22d3ee"/><rect x="80" y="21" width="2.5" height="8" fill="#e2e8f0"/>' +
        '<rect x="18" y="34" width="78" height="5" rx="2" fill="rgba(226,232,240,.5)"/>' +
        '<rect x="18" y="46" width="44" height="5" rx="2" fill="rgba(226,232,240,.35)"/>' +
        '<text x="60" y="65" font-size="9" fill="#94a3b8" text-anchor="middle">10s</text></svg>',
      en: [
        "Aim: type the shown phrase as fast and accurately as you can.",
        "Clock: the 10-second timer starts on your first keystroke - read first, then type.",
        "Feedback: typed letters turn green (correct) or red (wrong); Backspace fixes reds.",
        "Finish: type the last letter before the clock hits 0.0s to complete the round.",
        "Scoring: WPM = correct characters per minute; pasting is blocked on purpose.",
      ],
      zh: [
        "目标：尽可能又快又准地打出给出的句子。",
        "计时：从你敲下的第一个键开始倒计时 10 秒——先读句子再动手。",
        "反馈：打过的字母变绿为正确、变红为出错；退格键可以修正。",
        "结束：在倒计时归零前打出最后一个字母即完成本轮。",
        "计分：WPM=每分钟正确字符数；禁止粘贴，纯拼手速。",
      ],
    },
    memory: {
      panel: "gamePanelMemory",
      svg: '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' + board() +
        '<rect x="20" y="16" width="22" height="20" rx="3" fill="#22d3ee"/>' +
        '<rect x="49" y="16" width="22" height="20" rx="3" fill="rgba(148,163,184,.35)"/>' +
        '<rect x="78" y="16" width="22" height="20" rx="3" fill="rgba(148,163,184,.35)"/>' +
        '<rect x="20" y="42" width="22" height="20" rx="3" fill="rgba(148,163,184,.35)"/>' +
        '<rect x="49" y="42" width="22" height="20" rx="3" fill="#22d3ee"/>' +
        '<rect x="78" y="42" width="22" height="20" rx="3" fill="rgba(148,163,184,.35)"/></svg>',
      en: [
        "Aim: uncover all six matching glyph pairs.",
        "Move: click any face-down card to flip it, then click a second card.",
        "Rule: a matching pair stays face up; a mismatch flips both back after a moment.",
        "Watch out: the clock runs the whole round and every flip counts as a move.",
        "Scoring: fewer moves and faster time earn more stars; later rungs deal bigger decks.",
      ],
      zh: [
        "目标：翻开全部六对相同灵符。",
        "操作：点击一张背面朝上的牌翻开，再点第二张。",
        "规则：配对成功会保持翻开；不配对则稍后自动扣回。",
        "小心：计时贯穿整局，每翻一张都计步数。",
        "计分：步数越少、用时越短星越多；后续关卡牌数更多。",
      ],
    },
    "2048": {
      panel: "gamePanel2048",
      svg: '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' + board() +
        '<rect x="18" y="20" width="24" height="24" rx="4" fill="rgba(34,211,238,.4)"/><text x="30" y="36" font-size="12" fill="#e2e8f0" text-anchor="middle">2</text>' +
        '<rect x="46" y="20" width="24" height="24" rx="4" fill="rgba(34,211,238,.4)"/><text x="58" y="36" font-size="12" fill="#e2e8f0" text-anchor="middle">2</text>' +
        arrowRight(74, 32) +
        '<rect x="92" y="20" width="22" height="24" rx="4" fill="#a3e635"/><text x="103" y="36" font-size="12" fill="#0f172a" text-anchor="middle">4</text></svg>',
      en: [
        "Aim: merge tiles until one tile reads 2048.",
        "Controls: arrow keys on keyboard, swipe on touch.",
        "Rules: each move slides ALL tiles in that direction; two equal tiles that collide merge into one tile worth their sum.",
        "Watch out: after every move a new 2 or 4 spawns - if no cell is empty and no merge is possible, the game ends.",
        "Tip: pin your biggest tile in one corner and build descending rows toward it.",
      ],
      zh: [
        "目标：合并方块，合出 2048。",
        "操作：键盘方向键，触屏滑动。",
        "规则：每步所有方块朝该方向滑到头；相撞的两个相同数字合并为它们的和。",
        "小心：每步之后会新增一个 2 或 4——棋盘填满且无法合并时结束。",
        "提示：把最大的数钉在一个角，按从大到小排好辅助行。",
      ],
    },
    reflex: {
      panel: "gamePanelReflex",
      svg: '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' + board() +
        '<rect x="30" y="14" width="60" height="24" rx="6" fill="rgba(251,113,133,.9)"/>' +
        '<text x="60" y="30" font-size="10" font-weight="bold" fill="#0f172a" text-anchor="middle">WAIT</text>' +
        '<rect x="30" y="44" width="60" height="22" rx="6" fill="#a3e635"/>' +
        '<text x="60" y="59" font-size="10" font-weight="bold" fill="#0f172a" text-anchor="middle">TAP!</text></svg>',
      en: [
        "Aim: measure your reaction speed to a colour change.",
        "Start: press Start - the pad shows WAIT for a random moment.",
        "Action: the instant the pad turns green and reads TAP, click it or press Space.",
        "Watch out: tapping while it is still red is a false start and wastes the round.",
        "Scoring: your time is shown to the millisecond; the best (lowest) time is kept.",
      ],
      zh: [
        "目标：测量你对颜色变化的反应速度。",
        "开始：按下开始，面板显示“等待”并持续随机的一段时间。",
        "动作：面板变绿显示“点击”的瞬间，立即点击面板或按空格。",
        "小心：还在红色时就点击算抢跑，本轮作废。",
        "计分：成绩精确到毫秒；保留最好（最低）成绩。",
      ],
    },
    caretDash: {
      panel: "gamePanelCaretDash",
      svg: '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' + board() +
        '<rect x="6" y="58" width="108" height="6" fill="rgba(148,163,184,.5)"/>' +
        '<circle cx="28" cy="50" r="7" fill="#22d3ee"/>' +
        '<path d="M62 56l5-10 5 10z" fill="#fb7185"/>' +
        '<rect x="86" y="30" width="10" height="10" fill="rgba(167,139,250,.8)"/>' +
        '<path d="M26 38v-12" stroke="#a3e635" stroke-width="3" stroke-linecap="round"/>' +
        '<path d="M21 31l5-7 5 7" fill="none" stroke="#a3e635" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      en: [
        "Aim: run as far as you can without hitting anything.",
        "Start: press Start and the ground begins to scroll toward you.",
        "Controls: Space or Arrow Up jumps (hold for a higher jump); Arrow Down ducks under floating glyphs. Touch: the Jump/Duck buttons, or tap and hold the field.",
        "Watch out: ground glitch punctuation must be jumped; floating glyphs must be ducked or cleared by a well-timed jump.",
        "Scoring: distance is the score, and the scroll speed keeps creeping up.",
      ],
      zh: [
        "目标：一路狂奔，别撞上任何东西。",
        "开始：按下开始，地面开始向你滚动。",
        "操作：空格或上方向键跳跃（长按跳更高）；下方向键从漂浮字符下滑过。触屏用“跳/蹲”按钮，或按住棋盘左右半边。",
        "小心：地面乱码必须跳过；漂浮字符要么蹲要么掐时机跳过。",
        "计分：距离即分数，滚动速度会越来越快。",
      ],
    },
    elements: {
      panel: "gamePanelElements",
      svg: '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' + board() +
        '<circle cx="40" cy="30" r="9" fill="none" stroke="#22d3ee" stroke-width="2"/>' +
        '<rect x="56" y="44" width="4" height="4" fill="#fbbf24"/><rect x="62" y="50" width="4" height="4" fill="#fbbf24"/>' +
        '<rect x="70" y="46" width="4" height="4" fill="#38bdf8"/><rect x="76" y="52" width="4" height="4" fill="#38bdf8"/>' +
        '<rect x="80" y="20" width="4" height="4" fill="#fb7185"/><rect x="86" y="16" width="4" height="4" fill="#fb7185"/></svg>',
      en: [
        "Aim: free-play sandbox by default; pressing Start switches to a timed challenge with a goal.",
        "Controls: pick an element from the palette and drag on the grid to paint. Keyboard: 1-9 picks an element, arrows move the cursor, Space paints.",
        "Rules: sand falls and piles, water flows and levels out, fire ignites plants and wood, lava melts and burns, stone is inert.",
        "Watch out: timed boards charge ink per stroke and run a countdown shown in the HUD.",
        "Tools: Pause freezes, Step advances one tick, Pick samples a cell, Undo rewinds strokes.",
        "Scoring: complete the goal (grow, extinguish, fill...) fast; stars by time.",
      ],
      zh: [
        "目标：默认是自由沙盘；按开始进入带目标的限时挑战。",
        "操作：在元素盘选元素，拖动涂画。键盘：1-9 选元素，方向键移动光标，空格放置。",
        "规则：沙会下落堆积，水会流动摊平，火点燃植物与木头，岩浆熔化燃烧，石头不动。",
        "小心：限时关卡每次落笔消耗墨水，HUD 里显示倒计时。",
        "工具：暂停冻结、单步推演、取色、撤销最近笔触。",
        "计分：尽快完成目标（生长、灭火、注水……），按用时评星。",
      ],
    },
    spotDiff: {
      panel: "gamePanelSpotDiff",
      svg: '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' + board() +
        '<rect x="14" y="22" width="92" height="5" rx="2" fill="rgba(226,232,240,.5)"/>' +
        '<rect x="14" y="40" width="92" height="5" rx="2" fill="rgba(226,232,240,.5)"/>' +
        '<rect x="58" y="38" width="9" height="9" fill="#fb7185"/>' +
        '<circle cx="98" cy="58" r="8" fill="none" stroke="#22d3ee" stroke-width="2"/></svg>',
      en: [
        "Aim: find the characters that were secretly broken in the edited line.",
        "Compare: the top line is the original, the bottom line is the edited copy - scan them side by side.",
        "Controls: click a suspicious character in the lower line, or move the caret with arrow keys and press Enter.",
        "Watch out: a wrong click counts a miss and adds a two-second penalty.",
        "Scoring: find every break as fast as you can; later rungs plant look-alike homoglyphs.",
      ],
      zh: [
        "目标：找出下排句子中被悄悄改坏的字符。",
        "对比：上排是原文，下排是改过的副本——逐字对照。",
        "操作：点击下排可疑字符，或用方向键移动光标后按回车。",
        "小心：点错一次记一次失误并加罚两秒。",
        "计分：越快找齐越好；后面的关卡会混入形近字。",
      ],
    },
    plumber: {
      panel: "gamePanelPlumber",
      svg: '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' + board() +
        '<rect x="56" y="14" width="9" height="9" fill="#22d3ee" transform="rotate(14 60 18)"/>' +
        '<path d="M58 30l2 5 2-5z" fill="#22d3ee"/>' +
        '<rect x="18" y="48" width="34" height="16" rx="3" fill="rgba(34,211,238,.55)"/>' +
        '<rect x="68" y="48" width="34" height="16" rx="3" fill="rgba(255,107,53,.55)"/></svg>',
      en: [
        "Aim: sort every falling punctuation mark into the correct bin.",
        "Start: press Start; glyphs spawn at the top and fall down the lane.",
        "Controls: Arrow Left sorts into the fullwidth bin, Arrow Right into the halfwidth bin; tap the bins on touch.",
        "Rule: fullwidth marks are the wide CJK-style ones (，。！？)；halfwidth are the narrow ASCII ones (, . ! ?).",
        "Watch out: three misses end the run and the fall speed keeps creeping up.",
        "Scoring: quick consecutive sorts build a combo multiplier.",
      ],
      zh: [
        "目标：把每个下落的标点分进正确的收纳槽。",
        "开始：按下开始，标点从顶部落下。",
        "操作：左方向键分进全角槽，右方向键分进半角槽；触屏直接点槽。",
        "规则：全角是宽的中文标点（，。！？），半角是窄的英文标点 (, . ! ?)。",
        "小心：漏接三次结束，下落速度还会越来越快。",
        "计分：快速连续分对可叠连击倍率。",
      ],
    },
    stack: {
      panel: "gamePanelStack",
      svg: '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' + board() +
        '<rect x="34" y="50" width="52" height="10" fill="#22d3ee"/>' +
        '<rect x="38" y="40" width="44" height="10" fill="rgba(34,211,238,.75)"/>' +
        '<rect x="44" y="30" width="32" height="10" fill="rgba(34,211,238,.55)"/>' +
        '<rect x="72" y="16" width="30" height="9" fill="#fbbf24"/>' +
        '<path d="M66 14v8" stroke="#a3e635" stroke-width="2"/><path d="M63 20l3 4 3-4z" fill="#a3e635"/></svg>',
      en: [
        "Aim: build the tallest tower by stacking sliding blocks.",
        "Controls: click the field or press Space to drop the moving block.",
        "Rules: whatever hangs over the block below is sliced off and falls away - only the overlap survives onto the tower.",
        "Watch out: a complete miss ends the game immediately.",
        "Scoring: perfect drops (nothing sliced) slowly restore width and build a streak bonus.",
      ],
      zh: [
        "目标：不断堆叠滑动的方块，建出高塔。",
        "操作：点击棋盘或按空格放下滑动的方块。",
        "规则：悬在下方方块之外的部分会被切掉——只有重叠部分留在塔上。",
        "小心：完全没搭上会立即结束。",
        "计分：完美下落（零切割）会慢慢回复宽度并叠加连击奖励。",
      ],
    },
    colorCode: {
      panel: "gamePanelColorCode",
      svg: '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' + board() +
        '<circle cx="26" cy="28" r="9" fill="#22d3ee"/><circle cx="46" cy="28" r="9" fill="#fbbf24"/>' +
        '<circle cx="66" cy="28" r="9" fill="rgba(148,163,184,.4)"/><circle cx="86" cy="28" r="9" fill="rgba(148,163,184,.4)"/>' +
        '<circle cx="48" cy="54" r="4" fill="#a3e635"/><circle cx="62" cy="54" r="4" fill="none" stroke="#fb7185" stroke-width="2"/></svg>',
      en: [
        "Aim: guess the hidden code of four coloured pegs.",
        "Controls: click a swatch to pick a colour, then click the slots of the current row to paint it; Check submits the row.",
        "Feedback: solid pegs = right colour in the right place; hollow pegs = right colour in the wrong place; peg order is random.",
        "Watch out: duplicate colours are legal and counted the Mastermind way.",
        "Scoring: fewer tries earn more stars; the streak counter tracks consecutive cracks.",
      ],
      zh: [
        "目标：猜出隐藏的四色密码。",
        "操作：点色盘选色，再点当前行的格位涂色；按“检查”提交该行。",
        "反馈：实心钉=颜色和位置都对；空心钉=颜色对位置错；钉的顺序随机。",
        "小心：允许重复颜色，并按大师规则逐一计算。",
        "计分：尝试次数越少星越多；连击计数记录连续破译。",
      ],
    },
    breakout: {
      panel: "gamePanelBreakout",
      svg: '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' + board() +
        '<rect x="16" y="12" width="22" height="7" fill="#f472b6"/><rect x="42" y="12" width="22" height="7" fill="#a3e635"/><rect x="68" y="12" width="22" height="7" fill="#fbbf24"/>' +
        '<circle cx="62" cy="36" r="4" fill="#22d3ee"/>' +
        '<rect x="48" y="58" width="26" height="6" rx="3" fill="#e2e8f0"/></svg>',
      en: [
        "Aim: smash every brick in the glyph wall without losing the ball.",
        "Start: press Start, then Space launches the ball off the paddle.",
        "Controls: mouse or arrow keys move the paddle; where the ball hits the paddle decides the bounce angle.",
        "Watch out: one ball lost costs one of three lives.",
        "Scoring: bricks chained between paddle touches build a combo bonus; clearing the wall advances the level.",
      ],
      zh: [
        "目标：击碎灵符墙的全部砖块，别丢球。",
        "开始：按开始，再按空格让球离开挡板。",
        "操作：鼠标或方向键移动挡板；球碰到挡板的位置决定反弹角度。",
        "小心：丢一颗球消耗一条命，一共三条。",
        "计分：两次触板之间连碎的砖叠连击；清空墙面进入下一关。",
      ],
    },
    emberDice: {
      panel: "gamePanelEmberDice",
      svg: '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' + board() +
        '<rect x="40" y="14" width="34" height="34" rx="6" fill="#e2e8f0"/>' +
        '<circle cx="51" cy="25" r="3.5" fill="#0f172a"/><circle cx="63" cy="37" r="3.5" fill="#0f172a"/><circle cx="57" cy="31" r="3.5" fill="#0f172a"/>' +
        '<circle cx="30" cy="58" r="3" fill="#ff6b35"/><circle cx="40" cy="60" r="3" fill="#ff6b35"/><circle cx="86" cy="58" r="3" fill="#a3e635"/></svg>',
      en: [
        "Aim: bank 40 points within ten turns.",
        "Turn: roll the die to pile embers onto the stake; then either roll again to push your luck or Bank it to keep the stake.",
        "Watch out: a roll of 1 burns the entire unbanked stake and ends the turn with nothing.",
        "Controls: click the die or the Roll button; Bank it locks the current stake into your total.",
        "Scoring: banking early is safe, pushing further is worth more - the star table rewards the brave.",
      ],
      zh: [
        "目标：十回合内存满 40 分。",
        "回合：掷骰把火种堆上赌注；然后要么继续掷拼运气，要么存入银行保住赌注。",
        "小心：掷出 1 会烧光全部未存入的火种，本回合颗粒无收。",
        "操作：点骰子或“掷”按钮；“存入”把当前赌注锁定进总分。",
        "计分：早存稳妥、晚存收益高——三星目标奖励胆大的人。",
      ],
    },
    snake: {
      panel: "gamePanelSnake",
      svg: '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' + board() +
        '<rect x="26" y="44" width="10" height="10" fill="#22d3ee"/><rect x="38" y="44" width="10" height="10" fill="#22d3ee"/>' +
        '<rect x="50" y="44" width="10" height="10" fill="#22d3ee"/><rect x="50" y="32" width="10" height="10" fill="#22d3ee"/>' +
        '<circle cx="88" cy="24" r="5" fill="#a3e635"/></svg>',
      en: [
        "Aim: eat the food quota of the selected house without dying.",
        "Controls: arrow keys or WASD steer; the serpent never stops moving.",
        "Watch out: walls kill, your own tail kills, and every bite makes you longer AND faster.",
        "Scoring: length and time are tracked live; clearing the quota advances the house.",
        "Tip: spiral along the walls to keep the centre free for escapes.",
      ],
      zh: [
        "目标：吃满所选房屋的食物配额，别死。",
        "操作：方向键或 WASD 转向；小蛇永远在移动。",
        "小心：撞墙即死、咬到自己即死，而且每吃一口都会更长更快。",
        "计分：实时显示长度与用时；吃满配额进入下一栋房屋。",
        "提示：沿墙螺旋游走，把中间留作逃生空间。",
      ],
    },
    lights: {
      panel: "gamePanelLights",
      svg: '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' + board() +
        '<rect x="48" y="14" width="12" height="12" fill="rgba(34,211,238,.8)"/>' +
        '<rect x="62" y="14" width="12" height="12" fill="rgba(148,163,184,.3)"/>' +
        '<rect x="34" y="28" width="12" height="12" fill="rgba(148,163,184,.3)"/>' +
        '<rect x="48" y="28" width="12" height="12" fill="rgba(34,211,238,.8)"/>' +
        '<rect x="62" y="28" width="12" height="12" fill="rgba(34,211,238,.8)"/>' +
        '<rect x="76" y="28" width="12" height="12" fill="rgba(148,163,184,.3)"/>' +
        '<rect x="48" y="42" width="12" height="12" fill="rgba(34,211,238,.8)"/>' +
        '<rect x="62" y="42" width="12" height="12" fill="rgba(148,163,184,.3)"/></svg>',
      en: [
        "Aim: turn every light off.",
        "Controls: click any cell - it flips itself and its plus-shaped neighbours.",
        "Rule: boards are generated FROM a solved board by random taps, so every board is solvable; tapping the same cell twice cancels out.",
        "Scoring: fewer moves earn more stars.",
        "Tip: chase lights row by row - decide the second row's taps to clear the first row, then finish downward.",
      ],
      zh: [
        "目标：把所有亮着的灯全部熄灭。",
        "操作：点击任意格子——它自己和十字相邻的格子一起翻转。",
        "规则：棋盘由已完成盘面随机打乱生成，所以必然可解；同一格点两次等于撤销。",
        "计分：步数越少星越多。",
        "提示：逐行“追灯”——用第二行的点击清掉第一行，再一路向下收尾。",
      ],
    },
    mines: {
      panel: "gamePanelMines",
      svg: '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' + board() +
        '<rect x="20" y="20" width="18" height="18" fill="rgba(148,163,184,.3)"/>' +
        '<text x="29" y="33" font-size="11" font-weight="bold" fill="#22d3ee" text-anchor="middle">2</text>' +
        '<rect x="42" y="20" width="18" height="18" fill="rgba(148,163,184,.3)"/>' +
        '<path d="M51 24v10" stroke="#e2e8f0" stroke-width="2"/><path d="M51 24l8 3-8 3z" fill="#a3e635"/>' +
        '<circle cx="75" cy="29" r="6" fill="#1a1026" stroke="#fb7185" stroke-width="2"/></svg>',
      en: [
        "Aim: dig every safe cell without detonating a mine.",
        "Start: press New Game and dig - your first dig is always safe.",
        "Controls: left-click digs; right-click (or the Flag toggle) plants and removes flags.",
        "Rules: a number shows how many of the eight surrounding cells hide a mine - flag those and dig everything else.",
        "Watch out: digging a mine is instant loss; clearing all safe cells wins, and faster wins earn more stars.",
      ],
      zh: [
        "目标：挖开所有安全格，别踩雷。",
        "开始：按新游戏后先随便挖——第一铲永远安全。",
        "操作：左键挖开；右键（或旗帜按钮）插旗/拔旗。",
        "规则：数字表示周围八格中埋雷数——据此插旗标记，挖开其余格子。",
        "小心：挖到雷立刻结束；清空所有安全格即胜，越快星越多。",
      ],
    },
    gomoku: {
      panel: "gamePanelGomoku",
      svg: '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' + board() +
        '<path d="M22 22h76M22 34h76M22 46h76M22 58h76M30 16v48M46 16v48M62 16v48M78 16v48" stroke="rgba(148,163,184,.3)" stroke-width="1"/>' +
        '<circle cx="46" cy="46" r="5" fill="#22d3ee"/><circle cx="62" cy="46" r="5" fill="#22d3ee"/><circle cx="78" cy="46" r="5" fill="#22d3ee"/>' +
        '<circle cx="30" cy="34" r="5" fill="#ff6b35"/>' +
        '<path d="M42 46h40" stroke="#a3e635" stroke-width="2"/></svg>',
      en: [
        "Aim: get five of your black stones in a row before the white AI does.",
        "Controls: click any empty intersection to place a stone; black always moves first.",
        "Lines: horizontal, vertical and both diagonals all count.",
        "Watch out: the AI strikes back - block its open threes and fours at once.",
        "Scoring: faster wins earn more stars; Undo removes a full round; each rank sharpens the AI.",
      ],
      zh: [
        "目标：抢在白方 AI 之前连成五颗黑子。",
        "操作：点击任意空位落子；黑方永远先行。",
        "连线：横、竖、两条斜线都算。",
        "小心：AI 会反打——立刻堵住它的活三、活四。",
        "计分：赢越快星越多；悔棋撤回一整回合；段位越高 AI 越强。",
      ],
    },
    traffic: {
      panel: "gamePanelTraffic",
      svg: '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' + board() +
        '<rect x="14" y="14" width="14" height="30" rx="3" fill="#f472b6"/>' +
        '<rect x="32" y="14" width="14" height="30" rx="3" fill="#fbbf24"/>' +
        '<rect x="32" y="48" width="14" height="18" rx="3" fill="#f472b6"/>' +
        '<rect x="56" y="24" width="30" height="14" rx="3" fill="#22d3ee"/>' +
        '<path d="M90 31h12" stroke="#a3e635" stroke-width="3" stroke-linecap="round"/>' +
        '<path d="M100 26l7 5-7 5" fill="none" stroke="#a3e635" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      en: [
        "Aim: drive the cyan taxi out of the exit gap on the right wall.",
        "Controls: click a car to select it, then drag along its axis; arrow keys nudge the selected car; Tab cycles between cars.",
        "Rules: horizontal cars only slide left/right, vertical cars only up/down, and cars never overlap.",
        "Watch out: the exit sits on the taxi's own row - every other car is an obstacle to shuffle away.",
        "Scoring: fewer moves earn more stars; every board is BFS-proven solvable.",
      ],
      zh: [
        "目标：把青色出租车从右侧墙的出口开出去。",
        "操作：点选车辆后沿其轴向拖动；方向键微调所选车辆；Tab 在车辆间切换。",
        "规则：横车只能左右滑、竖车只能上下滑，且车与车不能重叠。",
        "小心：出口就在出租车所在的那一行——其余车全是要挪开的障碍。",
        "计分：步数越少星越多；每张图都经 BFS 验证可解。",
      ],
    },
    vault: {
      panel: "gamePanelVault",
      svg: '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' + board() +
        '<rect x="16" y="14" width="16" height="18" rx="3" fill="#a3e635"/>' +
        '<rect x="36" y="14" width="16" height="18" rx="3" fill="#fbbf24"/>' +
        '<rect x="56" y="14" width="16" height="18" rx="3" fill="rgba(148,163,184,.4)"/>' +
        '<rect x="76" y="14" width="16" height="18" rx="3" fill="rgba(148,163,184,.4)"/>' +
        '<rect x="96" y="14" width="16" height="18" rx="3" fill="#a3e635"/>' +
        '<rect x="22" y="46" width="10" height="8" rx="2" fill="rgba(148,163,184,.35)"/>' +
        '<rect x="35" y="46" width="10" height="8" rx="2" fill="rgba(148,163,184,.35)"/>' +
        '<rect x="48" y="46" width="10" height="8" rx="2" fill="rgba(148,163,184,.35)"/>' +
        '<rect x="61" y="46" width="10" height="8" rx="2" fill="rgba(148,163,184,.35)"/>' +
        '<rect x="74" y="46" width="10" height="8" rx="2" fill="rgba(148,163,184,.35)"/></svg>',
      en: [
        "Aim: crack the five-letter word within six guesses.",
        "Controls: type on your keyboard or click the on-screen keys; Enter submits, Backspace erases.",
        "Feedback: green = right letter in the right spot; yellow = in the word but elsewhere; grey = not in the word.",
        "Rule: letters may repeat - yellow marks count duplicates the Wordle way.",
        "Modes: Daily gives everyone the same word today; Random deals a fresh one. Streaks track your solves.",
      ],
      zh: [
        "目标：六次之内猜出五字母单词。",
        "操作：用键盘或屏幕键盘输入；回车提交，退格删除。",
        "反馈：绿=字母位置都对；黄=在词中但位置不对；灰=不含此字母。",
        "规则：字母可以重复——黄色按 Wordle 规则逐个计算重复字母。",
        "模式：每日模式人人同词；随机模式发新词。连胜数记录你的战绩。",
      ],
    },
    glyphBlocks: {
      panel: "gamePanelGlyphBlocks",
      svg: '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' + board() +
        '<rect x="34" y="10" width="52" height="56" fill="rgba(15,23,42,.85)" stroke="rgba(148,163,184,.4)"/>' +
        '<rect x="58" y="16" width="11" height="11" fill="#22d3ee"/><rect x="70" y="16" width="11" height="11" fill="#22d3ee"/>' +
        '<rect x="58" y="28" width="11" height="11" fill="#22d3ee"/><rect x="70" y="28" width="11" height="11" fill="#22d3ee"/>' +
        '<rect x="34" y="55" width="22" height="11" fill="rgba(163,230,53,.85)"/>' +
        '<rect x="64" y="55" width="22" height="11" fill="rgba(251,191,36,.85)"/></svg>',
      en: [
        "Aim: clear the line goal for the floor before the stack reaches the top.",
        "Controls: Left/Right move, Up or Turn rotates, Down soft-drops, Space slams down; touch pads sit under the well.",
        "Rules: falling glyphs lock when they land; a completely filled row vanishes and everything above falls down.",
        "Watch out: the stack rises faster each floor; overflow ends the run.",
        "Scoring: single rows score little - plan multi-row clears for big points.",
      ],
      zh: [
        "目标：在堆到顶之前完成本层的消行目标。",
        "操作：左右移动，上键或“转”旋转，下键软降，空格砸底；井下方有触屏按钮。",
        "规则：下落灵符落地即锁定；填满的整行会消除，上方随之落下。",
        "小心：每层堆叠都会加速；溢出井口即结束。",
        "计分：单行分少——规划多消才有高分。",
      ],
    },
    inkCascade: {
      panel: "gamePanelInkCascade",
      svg: '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' + board() +
        '<circle cx="30" cy="28" r="9" fill="#f472b6"/><circle cx="50" cy="28" r="9" fill="#f472b6"/><circle cx="70" cy="28" r="9" fill="#f472b6"/>' +
        '<circle cx="90" cy="28" r="9" fill="#22d3ee"/>' +
        '<path d="M42 52h20" stroke="#a3e635" stroke-width="3" stroke-linecap="round"/>' +
        '<path d="M58 48l6 4-6 4" fill="none" stroke="#a3e635" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      en: [
        "Aim: score the target points within the move budget.",
        "Controls: click one ink cell, then a horizontal or vertical neighbour to swap them.",
        "Rules: only swaps that create a line of three or more matching inks are allowed; matched inks pop, gravity refills, chains trigger automatically.",
        "Scoring: each popped ink scores 10 × the cascade level - chain reactions pay the most.",
        "Tip: favour swaps near the bottom; they tend to cascade longest.",
      ],
      zh: [
        "目标：在限定步数内达到目标分。",
        "操作：点一枚墨滴，再点其上下左右的相邻墨滴交换。",
        "规则：只有形成三个以上同色连线的交换才有效；消除后重力补位，连锁自动触发。",
        "计分：每枚消除墨滴得 10 × 连锁等级——连锁越长收益越高。",
        "提示：优先找底部的交换，连锁通常最长。",
      ],
    },
    inkBeat: {
      panel: "gamePanelInkBeat",
      svg: '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' + board() +
        '<rect x="20" y="12" width="18" height="44" fill="rgba(148,163,184,.15)"/>' +
        '<rect x="42" y="12" width="18" height="44" fill="rgba(148,163,184,.15)"/>' +
        '<rect x="64" y="12" width="18" height="44" fill="rgba(148,163,184,.15)"/>' +
        '<rect x="86" y="12" width="18" height="44" fill="rgba(148,163,184,.15)"/>' +
        '<circle cx="29" cy="20" r="6" fill="#22d3ee"/><circle cx="73" cy="32" r="6" fill="#a3e635"/>' +
        '<rect x="18" y="58" width="88" height="4" fill="#e2e8f0"/></svg>',
      en: [
        "Aim: hit every falling note in rhythm until the track ends.",
        "Start: press Start; notes descend the four lanes in time with the drums.",
        "Controls: hit the note when it reaches the pad line - keyboard keys or tapping the lanes both work.",
        "Scoring: perfect timing scores more than sloppy hits; missed notes drain your run.",
        "Watch out: the track only advances while its own panel is visible.",
      ],
      zh: [
        "目标：跟着节奏敲完一整首曲目。",
        "开始：按开始；音符随鼓点沿四条轨道下落。",
        "操作：音符到达底部感应线时敲击——键盘按键或点轨道都行。",
        "计分：时机越准分越高；漏接会扣血。",
        "小心：只有回到本曲面板时，曲目才会继续推进。",
      ],
    },
    bubbleInk: {
      panel: "gamePanelBubbleInk",
      svg: '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' + board() +
        '<circle cx="30" cy="18" r="8" fill="#22d3ee"/><circle cx="46" cy="18" r="8" fill="#fbbf24"/><circle cx="62" cy="18" r="8" fill="#f472b6"/>' +
        '<circle cx="38" cy="32" r="8" fill="#a3e635"/><circle cx="54" cy="32" r="8" fill="#22d3ee"/>' +
        '<circle cx="60" cy="58" r="7" fill="#22d3ee"/>' +
        '<path d="M58 51L40 28" stroke="rgba(226,232,240,.6)" stroke-width="2" stroke-dasharray="3 3"/></svg>',
      en: [
        "Aim: pop bubbles to reach the score target before shots run out or the wall sinks to the bottom.",
        "Controls: move the mouse to aim (a dashed line previews the shot) and click to fire; the next bubble is queued.",
        "Rules: three or more connected same-colour bubbles pop; bubbles left hanging without support fall off for bonus points.",
        "Watch out: every shot costs one from the budget - wasted shots are the usual loss.",
        "Scoring: popped bubbles score 10 each, fallen ones 15 - aim for shots that detach whole groups.",
      ],
      zh: [
        "目标：在弹数耗尽或墙体触底前，弹出泡泡达到目标分。",
        "操作：移动鼠标瞄准（虚线预判弹道），点击发射；下一颗泡泡会提前显示。",
        "规则：同色相连三颗及以上即爆；失去支撑的泡泡坠落并给奖励分。",
        "小心：每发都消耗弹数——乱射是最常见的输法。",
        "计分：爆掉的泡泡一颗 10 分，坠落的 15 分——瞄准能带落成片泡泡的位置。",
      ],
    },
    glyphEcho: {
      panel: "gamePanelGlyphEcho",
      svg: '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' + board() +
        '<rect x="18" y="26" width="18" height="18" rx="4" fill="#22d3ee"/>' +
        '<rect x="40" y="26" width="18" height="18" rx="4" fill="rgba(148,163,184,.3)"/>' +
        '<rect x="62" y="26" width="18" height="18" rx="4" fill="rgba(148,163,184,.3)"/>' +
        '<rect x="84" y="26" width="18" height="18" rx="4" fill="rgba(148,163,184,.3)"/>' +
        '<path d="M20 20q8-9 16 0" fill="none" stroke="#22d3ee" stroke-width="2"/></svg>',
      en: [
        "Aim: repeat the pads' song exactly, note for note.",
        "Watch: the pads light up and sing their notes in order - stay quiet and remember.",
        "Controls: click the pads in the same order (or press their keys) to echo the sequence.",
        "Watch out: one wrong pad ends the run; every new round adds one more note.",
        "Scoring: the longest sequence you echo is your score.",
      ],
      zh: [
        "目标：一字不差地复述音块的“歌声”。",
        "观察：音块按顺序点亮并发声——安静看完并记住。",
        "操作：按相同顺序点击音块（或按对应按键）复述。",
        "小心：点错一个音本局结束；每一轮会多加一个音。",
        "计分：成功复述的最长序列就是成绩。",
      ],
    },
    inkSlash: {
      panel: "gamePanelInkSlash",
      svg: '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' + board() +
        '<circle cx="32" cy="24" r="9" fill="#f472b6"/><circle cx="62" cy="40" r="9" fill="#a3e635"/><circle cx="90" cy="20" r="9" fill="#fbbf24"/>' +
        '<circle cx="86" cy="56" r="8" fill="#1a1026" stroke="#fb7185" stroke-width="2"/>' +
        '<path d="M14 60L106 12" stroke="#e2e8f0" stroke-width="3" stroke-linecap="round"/></svg>',
      en: [
        "Aim: slash flying fruits for points before time runs out.",
        "Controls: press and swipe across a fruit - any swipe path passing through it cuts it.",
        "Watch out: dark bombs with a red ring must never be cut.",
        "Scoring: several fruits cut in one stroke build combo multipliers.",
        "Tip: wait for fruits to arc near each other, then cut them all in one long slash.",
      ],
      zh: [
        "目标：在限时内切开飞舞的水果得分。",
        "操作：按住并划过水果——划痕经过即切开。",
        "小心：深色带红圈的炸弹绝不能碰。",
        "计分：一刀连切多个可叠连击倍率。",
        "提示：等水果聚到一起，再一长刀全收。",
      ],
    },
    pegSplash: {
      panel: "gamePanelPegSplash",
      svg: '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' + board() +
        '<circle cx="30" cy="16" r="4" fill="#22d3ee"/><circle cx="52" cy="16" r="4" fill="#ff6b35"/><circle cx="74" cy="16" r="4" fill="#22d3ee"/>' +
        '<circle cx="41" cy="28" r="4" fill="#ff6b35"/><circle cx="63" cy="28" r="4" fill="#22d3ee"/><circle cx="52" cy="40" r="4" fill="#22d3ee"/>' +
        '<rect x="12" y="58" width="14" height="8" rx="3" fill="#e2e8f0"/><rect x="88" y="58" width="22" height="8" rx="3" fill="#a3e635"/>' +
        '<path d="M18 54L48 38" stroke="rgba(226,232,240,.6)" stroke-width="2" stroke-dasharray="3 3"/></svg>',
      en: [
        "Aim: hit every orange peg on the board.",
        "Controls: aim the launcher with the mouse and click to fire; the ball bounces off every peg it touches.",
        "Rule: the bucket slides along the bottom - catch the falling ball to get it back.",
        "Watch out: cleared orange pegs stay lit; the board only ends once all of them are hit.",
        "Scoring: fewer balls used earn more stars.",
      ],
      zh: [
        "目标：打中棋盘上的所有橙色钉。",
        "操作：鼠标瞄准发射器并点击发射；球碰到每一颗钉都会反弹。",
        "规则：底部滑动的桶接住下落的球即可回收再用。",
        "小心：已命中的橙钉保持点亮；全部命中棋盘才算完成。",
        "计分：用球越少星越多。",
      ],
    },
    glyphRaid: {
      panel: "gamePanelGlyphRaid",
      svg: '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' + board() +
        '<rect x="26" y="14" width="14" height="10" rx="2" fill="#f472b6"/><rect x="52" y="14" width="14" height="10" rx="2" fill="#f472b6"/><rect x="78" y="14" width="14" height="10" rx="2" fill="#f472b6"/>' +
        '<rect x="39" y="30" width="14" height="10" rx="2" fill="#fbbf24"/><rect x="65" y="30" width="14" height="10" rx="2" fill="#fbbf24"/>' +
        '<rect x="50" y="56" width="20" height="8" rx="3" fill="#22d3ee"/>' +
        '<path d="M6 46h108" stroke="#fb7185" stroke-width="1.5" stroke-dasharray="4 4"/></svg>',
      en: [
        "Aim: destroy every invader in the wave before they reach the dashed line.",
        "Controls: the ship fires upward on its own - Arrow Left/Right or A/D only steer.",
        "Watch out: red bombs rain down constantly; touching one, or letting invaders reach the dashed line, ends the run.",
        "Rules: invaders march sideways and step lower each time a formation edge is hit.",
        "Scoring: faster clears earn more stars; each wave is denser and quicker.",
      ],
      zh: [
        "目标：在敌阵压到虚线之前清空整波敌人。",
        "操作：飞船自动向上开火——左右方向键或 A/D 只负责走位。",
        "小心：红色炸弹不断落下；碰到炸弹或让敌阵抵达虚线都会结束。",
        "规则：敌阵左右行进，阵型边缘被击中后整体下压。",
        "计分：清波越快星越多；每一波都更密更快。",
      ],
    },
    glyphLeap: {
      panel: "gamePanelGlyphLeap",
      svg: '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' + board() +
        '<rect x="20" y="56" width="34" height="6" rx="3" fill="#94a3b8"/>' +
        '<rect x="66" y="42" width="30" height="6" rx="3" fill="#a3e635"/>' +
        '<rect x="26" y="24" width="30" height="6" rx="3" fill="rgba(148,163,184,.6)"/>' +
        '<circle cx="80" cy="34" r="6" fill="#22d3ee"/>' +
        '<path d="M78 24v-8" stroke="#a3e635" stroke-width="2.5" stroke-linecap="round"/>' +
        '<path d="M74 20l4-7 4 7" fill="none" stroke="#a3e635" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      en: [
        "Aim: climb to the height goal shown in the HUD.",
        "Controls: the blob bounces by itself; Arrow Left/Right or A/D steer mid-air; hold the left/right half of the canvas on touch.",
        "Rules: green ledges are springs (huge bounce), amber ledges drift sideways, grey ones are plain.",
        "Watch out: the edges wrap around - falling off one side returns on the other; falling off the BOTTOM ends the climb.",
        "Scoring: reach the goal fast for stars; ledge layouts are random every run.",
      ],
      zh: [
        "目标：爬到 HUD 显示的目标高度。",
        "操作：小胶块自动弹跳；左右方向键或 A/D 空中转向；触屏按住画布左/右半边。",
        "规则：绿色平台是大弹簧，琥珀色会左右漂移，灰色普通。",
        "小心：左右边缘相通——从一侧掉出会从另一侧回来；但跌出底部攀登就结束。",
        "计分：越快达标星越多；每次平台都是随机生成的。",
      ],
    },
    auroraFlow: {
      panel: "gamePanelAuroraFlow",
      svg: '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' + board() +
        '<circle cx="24" cy="24" r="5" fill="#22d3ee"/><circle cx="24" cy="52" r="5" fill="#22d3ee"/>' +
        '<circle cx="96" cy="24" r="5" fill="#f472b6"/><circle cx="96" cy="52" r="5" fill="#f472b6"/>' +
        '<path d="M24 24C48 8 72 40 96 24" fill="none" stroke="rgba(34,211,238,.75)" stroke-width="5" stroke-linecap="round"/>' +
        '<path d="M24 52C50 62 70 44 96 52" fill="none" stroke="rgba(244,114,182,.75)" stroke-width="5" stroke-linecap="round"/></svg>',
      en: [
        "Aim: connect every pair of twin-coloured dots with glowing ribbons.",
        "Controls: press on a dot and drag cell by cell toward its twin, then release.",
        "Rules: ribbons cannot cross or share cells, and each ribbon must end exactly on its twin.",
        "Watch out: dragging back onto the previous cell rewinds the ribbon - fix mistakes without restarting.",
        "Keyboard: arrows move the dashed cursor and Enter starts or ends a ribbon. Stars by time.",
      ],
      zh: [
        "目标：用发光丝带把每对孪生点都连起来。",
        "操作：按住一个光点，逐格拖向它的孪生点，松手结束。",
        "规则：丝带不能相交或共用格子，且必须恰好落在孪生点上。",
        "小心：往回拖会收回丝带——不用重来也能修错。",
        "键盘：方向键移动虚线光标，回车开始/结束丝带。按用时评星。",
      ],
    },
    cometGolf: {
      panel: "gamePanelCometGolf",
      svg: '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' + board() +
        '<circle cx="20" cy="58" r="4" fill="#22d3ee"/>' +
        '<circle cx="60" cy="36" r="10" fill="#ff6b35"/><circle cx="60" cy="36" r="5" fill="#1a1026"/>' +
        '<circle cx="102" cy="16" r="8" fill="none" stroke="#a3e635" stroke-width="2.5"/>' +
        '<path d="M20 54C36 30 54 52 72 44 86 38 94 26 99 20" fill="none" stroke="#22d3ee" stroke-width="2" stroke-dasharray="4 3"/></svg>',
      en: [
        "Aim: land the comet inside the green ring using as few launches as possible.",
        "Controls: press and drag anywhere - the aim line from the tee shows angle and power - release to launch. Arrows set angle/power, Space launches.",
        "Rules: gravity wells pull the comet; the closer you skim, the harder the pull - but touching a well burns the comet.",
        "Watch out: crashing, drifting off-screen or running out of flight time resets to the tee (the launch still counts).",
        "Scoring: par is shown per course; most courses need a hole-in-one for three stars.",
      ],
      zh: [
        "目标：用最少的发射次数把彗星送进绿色圆环。",
        "操作：按住任意处拖动——发射台伸出的瞄准线显示角度与力度——松手发射。方向键调角度力度，空格发射。",
        "规则：引力井会吸引彗星；贴得越近引力越强——但碰到井体彗星会烧毁。",
        "小心：撞井、飞出边界或超时都会回到发射台（这一发照样计次）。",
        "计分：每条赛道显示标准杆；多数赛道一杆进环才能拿三星。",
      ],
    },
    prismPath: {
      panel: "gamePanelPrismPath",
      svg: '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' + board() +
        '<circle cx="18" cy="38" r="7" fill="#ff6b35"/>' +
        '<path d="M25 38h30" stroke="rgba(255,107,53,.85)" stroke-width="3"/>' +
        '<path d="M62 46l14-16" stroke="#22d3ee" stroke-width="3"/>' +
        '<path d="M69 38l30-14" stroke="rgba(0,242,255,.85)" stroke-width="2.5"/>' +
        '<circle cx="100" cy="24" r="7" fill="none" stroke="#a3e635" stroke-width="2.5"/><circle cx="100" cy="24" r="3" fill="#a3e635"/></svg>',
      en: [
        "Aim: light every green target with the laser beam.",
        "Controls: click any mirror tile to flip it between the / and \ slopes; the beam redraws instantly.",
        "Rules: the beam travels straight, reflects off mirrors, passes straight through targets it lights, and stops on walls.",
        "Keyboard: arrows move the dashed cursor, Enter flips the mirror under it.",
        "Scoring: stars by time - flips are unlimited, so experiment freely.",
      ],
      zh: [
        "目标：用激光点亮所有绿色靶心。",
        "操作：点击镜面在 / 与 \ 两种朝向间翻转；光路即时重算。",
        "规则：光束直线传播、遇镜反射、穿过点亮的靶心、被峰壁挡断。",
        "键盘：方向键移动虚线光标，回车翻转脚下镜面。",
        "计分：按用时评星——翻转不限次数，随便试验。",
      ],
    },
    starfall: {
      panel: "gamePanelStarfall",
      svg: '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' + board() +
        '<path d="M78 14l8 12h-16z" fill="#22d3ee"/>' +
        '<path d="M75 30l5 9 5-9" fill="#fbbf24"/>' +
        '<path d="M6 56l22 6 28-10 22 8 16-4v14H6z" fill="rgba(71,85,105,.85)"/>' +
        '<path d="M66 52h24" stroke="#a3e635" stroke-width="3"/></svg>',
      en: [
        "Aim: touch down gently on the glowing green pad.",
        "Controls: hold Arrow Up or W to burn the engine; Arrow Left/Right or A/D tilt; touch pads sit below the canvas.",
        "Rules: gravity speeds you up constantly; thrust pushes along the lander's nose direction.",
        "Watch out: touchdown needs low vertical speed, low sideways speed AND a near-upright angle - otherwise it is a crash that rebuilds you at the drop point.",
        "Scoring: unused fuel earns the stars; a safe landing on an empty tank still clears the sector.",
      ],
      zh: [
        "目标：在发光的绿色平台上平稳着陆。",
        "操作：按住上方向键或 W 点火；左右方向键或 A/D 倾斜；触屏按钮在画布下方。",
        "规则：重力让你不断加速；推力沿登陆舱的朝向发力。",
        "小心：着陆需要垂直速度低、横向速度低且接近直立——否则就是坠毁，会在投放点重建。",
        "计分：剩余燃料换星星；燃料烧干但安全落地也能过关。",
      ],
    },
    inkSort: {
      panel: "gamePanelInkSort",
      svg: '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' + board() +
        '<rect x="30" y="10" width="22" height="52" rx="4" fill="rgba(15,23,42,.85)" stroke="rgba(148,163,184,.45)"/>' +
        '<rect x="68" y="10" width="22" height="52" rx="4" fill="rgba(15,23,42,.85)" stroke="rgba(148,163,184,.45)"/>' +
        '<rect x="33" y="30" width="16" height="10" fill="#f472b6"/><rect x="33" y="40" width="16" height="10" fill="#f472b6"/><rect x="33" y="50" width="16" height="10" fill="#22d3ee"/>' +
        '<path d="M56 16q12-8 18 4" fill="none" stroke="#a3e635" stroke-width="2.5"/></svg>',
      en: [
        "Aim: make every vial hold one single colour (or be empty).",
        "Controls: click a vial to lift it, click another to pour; arrow keys + Enter also work.",
        "Rules: you pour the lifted vial's top run of same colour, and only onto a matching top colour or into an empty vial with space.",
        "Watch out: finished vials lock automatically; there is no undo - New Round deals a fresh (always solvable) board.",
        "Scoring: fewer pours earn more stars; the built-in solver guarantees every deal can be finished.",
      ],
      zh: [
        "目标：让每只墨瓶只剩一种颜色（或为空）。",
        "操作：点一只墨瓶拿起，再点另一只倒入；方向键加回车也可以。",
        "规则：倒出的是顶部同色段，且只能倒在同色顶上，或倒入还有空间的空瓶。",
        "小心：完成的瓶自动锁定；没有撤销——“新一周”会重发一张（必然可解）的牌。",
        "计分：倾倒次数越少星越多；内置求解器保证每局都能完成。",
      ],
    },
    glyphCrossing: {
      panel: "gamePanelGlyphCrossing",
      svg: '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' + board() +
        '<rect x="6" y="10" width="108" height="16" fill="rgba(14,42,64,.9)"/>' +
        '<rect x="20" y="13" width="26" height="9" rx="3" fill="#fbbf24"/><rect x="72" y="13" width="26" height="9" rx="3" fill="#fbbf24"/>' +
        '<rect x="6" y="34" width="108" height="18" fill="rgba(15,23,42,.9)"/>' +
        '<rect x="28" y="38" width="22" height="10" rx="4" fill="#f472b6"/>' +
        '<circle cx="60" cy="62" r="6" fill="#4ade80"/><circle cx="104" cy="62" r="6" fill="none" stroke="#a3e635" stroke-width="2"/></svg>',
      en: [
        "Aim: fill all four lily pads along the top bank.",
        "Controls: arrow keys or WASD hop one square; on touch use the four hop buttons.",
        "Road: streaks sweep the three lanes - cross through the gaps, never into a streak.",
        "River: you cannot swim - hop onto a log and ride it; the median strip is a safe rest stop.",
        "Watch out: logs carry you sideways (off-screen means gone), each pad holds one frog, and three frogs are all you get.",
      ],
      zh: [
        "目标：占满顶部河岸的四片荷叶。",
        "操作：方向键或 WASD 逐格跳；触屏用四个跳跃按钮。",
        "马路：车流横扫三条车道——找空档穿过，别撞上车。",
        "小河：不能游泳——跳上木头随波横渡；中间安全带可以落脚。",
        "小心：木头会把你带偏（出屏即消失），每片荷叶只收一只蛙，一共三只。",
      ],
    },
    glyphPusher: {
      panel: "gamePanelGlyphPusher",
      svg: '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' + board() +
        '<circle cx="24" cy="38" r="8" fill="#22d3ee"/>' +
        '<rect x="50" y="30" width="16" height="16" rx="2" fill="#fbbf24"/>' +
        '<path d="M36 38h8" stroke="#a3e635" stroke-width="3" stroke-linecap="round"/>' +
        '<path d="M42 33l7 5-7 5" fill="none" stroke="#a3e635" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<rect x="84" y="31" width="13" height="13" fill="none" stroke="#a3e635" stroke-width="2" transform="rotate(45 90 38)"/></svg>',
      en: [
        "Aim: push every crate onto a green goal diamond.",
        "Controls: arrow keys or WASD move the worker and push crates ahead; swiping the canvas works too.",
        "Rules: crates slide one cell per push into empty space - they can never be pulled back.",
        "Watch out: a crate pushed into a corner or flat against a wall is stuck forever - plan before you shove.",
        "Tools: U or Backspace undoes one step; experimenting is free, but your push count decides the stars.",
      ],
      zh: [
        "目标：把每只木箱推上绿色菱形靶位。",
        "操作：方向键或 WASD 移动工人并推动前方的箱子；在盘面上滑动也行。",
        "规则：每次推动箱子滑一格到空地——永远不能往回拉。",
        "小心：箱子一旦被推进角落或贴平墙面就永远卡死——先想清楚再推。",
        "工具：U 或退格键撤销一步；试错免费，但推箱次数决定星星。",
      ],
    },
    glyphNet: {
      panel: "gamePanelGlyphNet",
      svg: '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' + board() +
        '<path d="M24 24h24v24" stroke="#22d3ee" stroke-width="6" fill="none"/>' +
        '<path d="M48 24h24" stroke="rgba(100,116,139,.85)" stroke-width="6"/>' +
        '<path d="M72 24h24v24h-24" stroke="rgba(100,116,139,.85)" stroke-width="6" fill="none"/>' +
        '<circle cx="24" cy="24" r="6" fill="#ff6b35"/><circle cx="48" cy="48" r="5" fill="#a3e635"/></svg>',
      en: [
        "Aim: rotate every tile so all pipes join one network back to the orange source.",
        "Controls: click a tile to rotate it clockwise; arrows move the cursor, Enter rotates.",
        "Rules: every pipe end must meet a matching pipe end - nothing may point at a wall - and all bulbs must connect to the source.",
        "Feedback: powered pipes and bulbs glow cyan or green; dead pipes stay grey.",
        "Scoring: solve in few rotations for stars; every deal is scrambled from a working network, so it is always solvable.",
      ],
      zh: [
        "目标：旋转所有卡牌，让管道连成一张回到橙色源头的完整网络。",
        "操作：点击卡牌顺时针旋转；方向键移动光标，回车旋转。",
        "规则：每个管口都必须接到对应管口——不能有朝向墙壁的开口——且所有灯泡都要连到源头。",
        "反馈：通电的管道和灯泡发青光/绿光；死管保持灰色。",
        "计分：旋转次数越少星越多；每局都由可用网络打乱而来，必然可解。",
      ],
    },
    glyphSketch: {
      panel: "gamePanelGlyphSketch",
      svg: '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' + board() +
        '<rect x="42" y="14" width="54" height="54" fill="none" stroke="rgba(148,163,184,.4)"/>' +
        '<path d="M60 14v54M78 14v54M42 32h54M42 50h54" stroke="rgba(148,163,184,.3)"/>' +
        '<rect x="62" y="16" width="16" height="14" fill="#22d3ee"/><rect x="44" y="34" width="16" height="14" fill="#22d3ee"/>' +
        '<text x="36" y="24" font-size="9" fill="#e2e8f0" text-anchor="end">1 1</text></svg>',
      en: [
        "Aim: reveal the hidden picture by filling exactly the right cells.",
        "Clues: each number is the length of one uninterrupted run of filled cells in that row or column; runs have at least one empty cell between them.",
        "Controls: click a cell to fill it, again to mark a cross (your note that it is empty), again to clear it.",
        "Keyboard: arrows move the cursor, Enter cycles the cell state.",
        "Tip: start from the biggest clues - a clue of five on a five-wide row fills completely. Every board is solvable by pure logic, never by guessing.",
      ],
      zh: [
        "目标：只填正确的格子，还原隐藏图案。",
        "线索：每个数字是该行/列中一段连续填充格的长度；两段之间至少隔一个空格。",
        "操作：点一格填色，再点标叉（标记这里为空），再点清空。",
        "键盘：方向键移动光标，回车切换单元格状态。",
        "提示：从最大的数字入手——五宽的行提示五，整行填满。每张图都保证纯逻辑可解，绝不需要猜。",
      ],
    },
    glyphFifteen: {
      panel: "gamePanelGlyphFifteen",
      svg: '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' + board() +
        '<rect x="22" y="14" width="22" height="22" rx="4" fill="#22d3ee"/><text x="33" y="29" font-size="12" fill="#101426" text-anchor="middle">1</text>' +
        '<rect x="48" y="14" width="22" height="22" rx="4" fill="#22d3ee"/><text x="59" y="29" font-size="12" fill="#101426" text-anchor="middle">2</text>' +
        '<rect x="74" y="14" width="22" height="22" rx="4" fill="#22d3ee"/><text x="85" y="29" font-size="12" fill="#101426" text-anchor="middle">3</text>' +
        '<rect x="22" y="40" width="22" height="22" rx="4" fill="#22d3ee"/><text x="33" y="55" font-size="12" fill="#101426" text-anchor="middle">4</text>' +
        '<rect x="48" y="40" width="22" height="22" rx="4" fill="rgba(148,163,184,.25)"/>' +
        '<path d="M74 51h12" stroke="#a3e635" stroke-width="2.5" stroke-linecap="round"/>' +
        '<path d="M84 46l7 5-7 5" fill="none" stroke="#a3e635" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      en: [
        "Aim: slide the tiles into ascending order with the gap at the end.",
        "Controls: click any tile in the same row or column as the gap - the whole run slides toward the gap. Arrow keys slide the tile on the opposite side of the gap.",
        "Rules: only tiles adjacent to the gap move, and each tile slid counts one move.",
        "Feedback: tiles sitting in their correct home glow green.",
        "Scoring: fewer slides earn more stars; every deal is generated by legal walks, so it is always solvable.",
      ],
      zh: [
        "目标：把木牌按从小到大滑回原位，空位留在最后。",
        "操作：点击与空位同行同列的任意木牌——整排一起滑向空位。方向键滑动空位对面的木牌。",
        "规则：只有紧邻空位的牌会动，每滑一格计一步。",
        "反馈：归位的木牌发绿光。",
        "计分：步数越少星越多；每局都由合法走位生成，必然可解。",
      ],
    },
    glyphSudoku: {
      panel: "gamePanelGlyphSudoku",
      svg: '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' + board() +
        '<path d="M30 10h60v56h-60z" fill="none" stroke="rgba(148,163,184,.4)"/>' +
        '<path d="M50 10v56M70 10v56M30 29h60M30 47h60" stroke="rgba(148,163,184,.3)"/>' +
        '<text x="40" y="24" font-size="13" fill="#e2e8f0" text-anchor="middle">1</text>' +
        '<text x="60" y="24" font-size="13" fill="#e2e8f0" text-anchor="middle">2</text>' +
        '<text x="40" y="43" font-size="13" fill="#22d3ee" text-anchor="middle">3</text>' +
        '<text x="60" y="43" font-size="13" fill="#fb7185" text-anchor="middle">3</text></svg>',
      en: [
        "Aim: fill the grid so every row, column and bold box contains the digits 1-N exactly once.",
        "Controls: click a cell, then type a digit or tap the number pad; Backspace or 0 erases; arrows move the selection.",
        "Feedback: a digit clashing with its row, column or box turns red and counts a miss.",
        "Watch out: the white digits are givens and cannot be changed.",
        "Scoring: faster solves earn more stars; every puzzle is carved from a full solution and has exactly one answer.",
      ],
      zh: [
        "目标：填满整盘，让每行、每列、每个粗线宫格都恰好包含 1-N。",
        "操作：点选格子后按数字键或点数字盘；退格或 0 擦除；方向键移动选区。",
        "反馈：与所在行、列、宫格冲突的数字会变红并计一次失误。",
        "小心：白色数字是给定提示，不能修改。",
        "计分：越快完成星越多；每题都从完整解 carving 而来，只有唯一答案。",
      ],
    },
    glyphReversi: {
      panel: "gamePanelGlyphReversi",
      svg: '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' + board() +
        '<circle cx="34" cy="38" r="11" fill="#22d3ee"/>' +
        '<circle cx="60" cy="38" r="11" fill="#ff6b35"/>' +
        '<circle cx="86" cy="38" r="11" fill="none" stroke="#00f2ff" stroke-width="2" stroke-dasharray="3 3"/>' +
        '<path d="M52 20q8-10 16 0" fill="none" stroke="#e2e8f0" stroke-width="2"/>' +
        '<path d="M64 18l4 3-5 2z" fill="#e2e8f0"/></svg>',
      en: [
        "Aim: own more discs than the rival when the board fills.",
        "Controls: click any square with a pulsing dot - only legal moves are marked.",
        "Rules: your disc must bracket one or more rival discs between itself and another of yours; every bracketed disc flips cyan.",
        "Watch out: with no legal move you pass and the rival goes again; if neither side can move, the game ends early.",
        "Strategy: corners can never be flipped - take them; the squares beside corners are bad gifts. The final margin decides your stars.",
      ],
      zh: [
        "目标：棋盘填满时，你的棋子数量多于对手。",
        "操作：点击任何带脉动圆点的格子——只有合法落子会被标出。",
        "规则：新落子必须与己子夹住一串对方棋子；被夹住的棋子全部翻转成青色。",
        "小心：无棋可走时自动停一手，对手继续；双方都不能走则提前终局。",
        "策略：角落永远翻不动——优先抢占；角落旁的格子是送礼。终盘子差决定星星。",
      ],
    },
    glyphGlide: {
      panel: "gamePanelGlyphGlide",
      svg: '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' + board() +
        '<rect x="16" y="28" width="58" height="14" rx="2" fill="rgba(34,211,238,.14)"/>' +
        '<circle cx="26" cy="35" r="7" fill="#22d3ee"/>' +
        '<circle cx="44" cy="35" r="2.5" fill="rgba(34,211,238,.55)"/><circle cx="56" cy="35" r="2" fill="rgba(34,211,238,.35)"/>' +
        '<rect x="94" y="18" width="10" height="32" fill="rgba(71,85,105,.9)"/>' +
        '<circle cx="52" cy="62" r="6" fill="none" stroke="#a3e635" stroke-width="2"/>' +
        '<rect x="74" y="58" width="8" height="8" fill="#fbbf24" transform="rotate(20 78 62)"/></svg>',
      en: [
        "Aim: slide onto the green goal ring, collecting every star on the way.",
        "Controls: arrow keys or WASD launch the blob in that direction; it slides until a wall stops it. On touch, tap any cell in the blob's row or column.",
        "Rules: you cannot stop mid-ice - walls and corners are your only brakes; the goal ring only activates once all stars are collected.",
        "Watch out: walls are your steering - sliding into the wrong wall can box you in; the HUD shows the par to beat.",
        "Scoring: solve in par or par+1 slides for top stars; every board is BFS-verified solvable.",
      ],
      zh: [
        "目标：滑上绿色圆环，并收齐沿途所有星星。",
        "操作：方向键或 WASD 朝该方向发射小胶块；它会一直滑到撞墙。触屏点击它所在行列的任意格子。",
        "规则：冰面中途无法停下——墙和拐角是唯一的刹车；收齐星星后圆环才会激活。",
        "小心：撞墙就是转向——滑错墙可能把自己困死；HUD 显示需要打败的标准步数。",
        "计分：标准步数或 +1 内完成可拿满星；每张图都经 BFS 验证可解。",
      ],
    },
    glyphFour: {
      panel: "gamePanelGlyphFour",
      svg: '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' + board() +
        '<path d="M30 12h60v54h-60z" fill="none" stroke="rgba(148,163,184,.4)"/>' +
        '<path d="M50 12v54M70 12v54M30 30h60M30 48h60" stroke="rgba(148,163,184,.25)"/>' +
        '<circle cx="40" cy="57" r="8" fill="#22d3ee"/><circle cx="60" cy="57" r="8" fill="#ff6b35"/>' +
        '<circle cx="60" cy="39" r="8" fill="#22d3ee"/>' +
        '<path d="M40 16v12" stroke="#22d3ee" stroke-width="2" stroke-dasharray="3 3"/>' +
        '<path d="M36 26l4 6 4-6z" fill="#22d3ee"/></svg>',
      en: [
        "Aim: line up four of your cyan discs before the rival lines up orange.",
        "Controls: click a column - your disc falls to the lowest empty cell and the rival immediately answers.",
        "Lines: horizontal, vertical and both diagonals count; the winning four pulse green.",
        "Watch out: the rival drops right after you - always check its three-in-a-rows before building your own.",
        "Scoring: the fewer discs you used, the more stars; each rival rank searches deeper than the last.",
      ],
      zh: [
        "目标：抢在对手之前把四枚青子连成一线。",
        "操作：点击某一列——你的棋子落到该列最低空位，对手随即回应。",
        "连线：横、竖、两条斜线都算；获胜的四子会闪绿光。",
        "小心：你落一子对手马上回应——先盯住它的三连，再发展自己。",
        "计分：用子越少星越多；每个对手的搜索深度都比上一位更深。",
      ],
    },
    glyphTower: {
      panel: "gamePanelGlyphTower",
      svg: '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' + board() +
        '<rect x="10" y="58" width="100" height="8" fill="rgba(71,85,105,.9)"/>' +
        '<rect x="27" y="24" width="5" height="34" fill="rgba(100,116,139,.85)"/>' +
        '<rect x="58" y="24" width="5" height="34" fill="rgba(100,116,139,.85)"/>' +
        '<rect x="88" y="24" width="5" height="34" fill="rgba(0,242,255,.8)"/>' +
        '<rect x="15" y="50" width="28" height="8" rx="3" fill="#22d3ee"/>' +
        '<rect x="20" y="41" width="18" height="8" rx="3" fill="#4ade80"/>' +
        '<rect x="76" y="50" width="28" height="8" rx="3" fill="rgba(34,211,238,.6)"/>' +
        '<path d="M88 16v6" stroke="#a3e635" stroke-width="2.5" stroke-linecap="round"/>' +
        '<path d="M84 20l4 5 4-5z" fill="#a3e635"/></svg>',
      en: [
        "Aim: move the whole stack from peg one to peg three (the arrow mark).",
        "Rule: lift only the top disc of a peg, and a disc can never rest on a smaller disc.",
        "Controls: click a peg to lift, click another to drop; keys 1, 2, 3 pick pegs; clicking the same peg puts the disc back.",
        "Scoring: the perfect run takes 2^n - 1 moves (the HUD shows it); extra moves cost stars.",
        "Tip: to move n discs, move the top n-1 aside first, shift the biggest, then rebuild them on top.",
      ],
      zh: [
        "目标：把整座塔从一号柱搬到三号柱（有箭头标记）。",
        "规则：只能拿每根柱最顶端的圆环，且大环永远不能压在小环上。",
        "操作：点柱子拿起顶环，再点另一根柱放下；数字键 1、2、3 选柱；点同一根柱放回原位。",
        "计分：完美走法是 2^n - 1 步（HUD 会显示）；多余步数会扣星。",
        "提示：搬 n 层时，先把上面 n-1 层挪到备用柱，搬走最大环，再把它们叠回来。",
      ],
    },
    glyphFleet: {
      panel: "gamePanelGlyphFleet",
      svg: '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' + board() +
        '<rect x="14" y="14" width="42" height="42" fill="rgba(34,211,238,.12)" stroke="rgba(148,163,184,.4)"/>' +
        '<rect x="64" y="14" width="42" height="42" fill="rgba(15,23,42,.85)" stroke="rgba(148,163,184,.4)"/>' +
        '<rect x="18" y="30" width="12" height="5" fill="rgba(34,211,238,.7)"/>' +
        '<rect x="42" y="44" width="5" height="12" fill="rgba(34,211,238,.7)"/>' +
        '<circle cx="85" cy="24" r="2.5" fill="rgba(148,163,184,.8)"/>' +
        '<rect x="79" y="42" width="9" height="9" fill="#fb7185"/>' +
        '<path d="M64 40h42" stroke="rgba(163,230,53,.35)" stroke-width="2"/></svg>',
      en: [
        "Aim: sink all four rival ships (4, 3, 3 and 2 cells) before the rival sinks yours.",
        "Controls: click any cell in the RIGHT grid to fire; your own fleet on the left is shot at automatically.",
        "Feedback: a grey dot is a miss, a burning cell is a hit, and a red outline means that ship is sunk.",
        "Watch out: the rival fires back after every one of your shots - each admiral rank aims smarter.",
        "Scoring: fewer shots earn more stars; after a hit, probe the neighbours before roaming.",
      ],
      zh: [
        "目标：抢在对手之前击沉全部四艘敌舰（4、3、3、2 格）。",
        "操作：点击右侧网格的任意格子开炮；左侧你的舰队会自动挨打。",
        "反馈：灰点=落空，燃烧格=命中，红色边框=该舰已沉。",
        "小心：你每开一炮对手都会还击——军衔越高，对手瞄得越准。",
        "计分：炮数越少星越多；命中后先搜邻居再换位。"],
    },

  };

  function initGameGuides() {
    if (!t) {
      return;
    }
    Object.keys(guideData).forEach(function (id) {
      var g = guideData[id];
      var panel = getElement(g.panel);
      if (!panel || panel.querySelector(".game-guide")) {
        return;
      }
      var details = document.createElement("details");
      details.className = "game-guide";
      var summary = document.createElement("summary");
      summary.textContent = t("gameGuideToggle");
      details.appendChild(summary);
      var body = document.createElement("div");
      body.className = "game-guide-body";
      var art = document.createElement("div");
      art.className = "game-guide-art";
      art.setAttribute("aria-hidden", "true");
      art.innerHTML = g.svg;
      body.appendChild(art);
      var steps = App.currentLang === "zh" ? g.zh : g.en;
      var list = document.createElement("ol");
      steps.forEach(function (step) {
        var li = document.createElement("li");
        /* Bold the leading label ("Goal:", "操作："...) for scannability. */
        var labelEn = /^([A-Za-z][A-Za-z ]{0,11}): ([\s\S]*)$/.exec(step);
        var labelZh = /^([一-鿿]{2,4})：([\s\S]*)$/.exec(step);
        if (labelEn) {
          var strongEn = document.createElement("strong");
          strongEn.textContent = labelEn[1] + ": ";
          li.appendChild(strongEn);
          li.appendChild(document.createTextNode(labelEn[2]));
        } else if (labelZh) {
          var strongZh = document.createElement("strong");
          strongZh.textContent = labelZh[1] + "：";
          li.appendChild(strongZh);
          li.appendChild(document.createTextNode(labelZh[2]));
        } else {
          li.textContent = step;
        }
        list.appendChild(li);
      });
      body.appendChild(list);
      details.appendChild(body);
      var hint = panel.querySelector(".game-hint");
      if (hint) {
        panel.insertBefore(details, hint);
      } else {
        panel.appendChild(details);
      }
    });
  }


  /* Exported for the other modules. */
  App.initGameGuides = initGameGuides;
})(window.CapitalConvert = window.CapitalConvert || {});
