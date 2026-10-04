/* Paradox Post - deliver parcels through a building whose doors lie about where they lead.
 * A doorway is worth whatever the side you approach it from says it is worth, so a route
 * has to be modelled instead of remembered, and every map here is proved completable by
 * the search at the top of this file before it is ever dealt to the player. */
(function (App) {
  var t = App.t;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  var createCampaign = App.createCampaign;
  var fillCampaignPicker = App.fillCampaignPicker;
  var starsFor = App.starsFor;

  var pdxStepCap = 24;
  var pdxUndoGrant = 3;

  /* ------------------------------------------------------------------
   * The topology engine, pure.
   *
   * A room lists its own doorways. One listing says: which wall the
   * opening sits in, which side of the room you must have come in on for
   * it to be worth anything ("any" for an honest door), and where it then
   * puts you, including which side of that room you land on. The same
   * wood seen from the far side is a separate listing and may say
   * something completely different. A room that does not list a doorway
   * is the one-way corridor: you arrive that way, you leave some other
   * way. Nothing here is a walk; it is a model of the space.
   * ------------------------------------------------------------------ */

  function pdxRoom(map, id) {
    if (!map || !map.rooms) { return null; }
    for (var i = 0; i < map.rooms.length; i += 1) {
      if (map.rooms[i].id === id) { return map.rooms[i]; }
    }
    return null;
  }

  /* THE RULE, pure: the side you knock from decides what a door is worth. */
  function paradoxEnter(map, room, side, door) {
    var result = { room: room, side: side, moved: false, cost: 0, note: "" };
    if (!map || !map.rooms) { return result; }
    var here = pdxRoom(map, room);
    if (!here) { return result; }
    var exists = false;
    var trip = null;
    for (var i = 0; i < here.doors.length; i += 1) {
      var listing = here.doors[i];
      if (listing.id !== door) { continue; }
      exists = true;
      if (listing.from === "any" || listing.from === side) {
        trip = listing;
        break;
      }
    }
    if (!exists) { return result; }
    result.cost = 1;
    if (!trip) {
      result.note = "blocked";
      return result;
    }
    if (!pdxRoom(map, trip.to)) {
      result.note = "nowhere";
      return result;
    }
    result.room = trip.to;
    result.side = trip.at;
    result.moved = true;
    return result;
  }

  /* What the courier has walked through personally: directed edges, each
   * stamped with the side it was knocked from. */
  function paradoxNotebook(state) {
    var rows = [];
    var seen = {};
    if (!state || !state.verified) { return rows; }
    for (var i = 0; i < state.verified.length; i += 1) {
      var row = state.verified[i];
      var key = row.from + "|" + row.side + ">" + row.to;
      if (seen[key] !== true) {
        seen[key] = true;
        rows.push(row);
      }
    }
    return rows;
  }

  function pdxStartSide(map) {
    if (map && typeof map.startSide === "string" && map.startSide !== "") { return map.startSide; }
    return "north";
  }

  /* "Deliver in this order": an earlier parcel must be gone before a
   * later one may be handed over. */
  function pdxOrderOk(map, delivered, parcel) {
    var order = (map && map.order) || [];
    for (var i = 0; i < order.length; i += 1) {
      if (order[i][1] === parcel.id && delivered[order[i][0]] !== true) { return false; }
    }
    return true;
  }

  /* Run a delivery plan over the directed-edge model, exactly once. A
   * parcel is picked up on entering its room and left on entering its
   * destination, the moment the order allows it. */
  function paradoxResolve(map, plan) {
    var result = { ok: false, steps: 0, deliveries: 0, stuck: "", rooms: [] };
    if (!map || !map.rooms || map.rooms.length === 0 || !map.parcels) { return result; }
    var room = map.start;
    var side = pdxStartSide(map);
    var picked = {};
    var delivered = {};
    var steps = plan || [];
    result.rooms.push(room);
    pdxCollect(map, room, picked, delivered);
    for (var i = 0; i < steps.length; i += 1) {
      var move = paradoxEnter(map, room, side, steps[i]);
      result.steps += move.cost;
      if (!move.moved) {
        result.stuck = "step" + (i + 1);
        return result;
      }
      room = move.room;
      side = move.side;
      result.rooms.push(room);
      pdxCollect(map, room, picked, delivered);
      for (var j = 0; j < map.parcels.length; j += 1) {
        var p = map.parcels[j];
        if (p.to === room && picked[p.id] === true && !delivered[p.id] && pdxOrderOk(map, delivered, p)) {
          delivered[p.id] = true;
          result.deliveries += 1;
        }
      }
    }
    result.ok = result.deliveries === map.parcels.length;
    return result;
  }

  function pdxCollect(map, room, picked, delivered) {
    for (var j = 0; j < map.parcels.length; j += 1) {
      var p = map.parcels[j];
      if (p.from === room && picked[p.id] !== true && !delivered[p.id]) { picked[p.id] = true; }
    }
  }

  /* Every doorway standing in one room, each named once. */
  function pdxOpenings(map, roomId) {
    var list = [];
    var seen = {};
    var room = pdxRoom(map, roomId);
    if (!room) { return list; }
    for (var i = 0; i < room.doors.length; i += 1) {
      var listing = room.doors[i];
      if (seen[listing.id] !== true) {
        seen[listing.id] = true;
        list.push({ id: listing.id, wall: listing.wall });
      }
    }
    return list;
  }

  /* All doorways of a map, tagged with the room they stand in. */
  function pdxAllOpenings(map) {
    var list = [];
    for (var i = 0; i < map.rooms.length; i += 1) {
      var openings = pdxOpenings(map, map.rooms[i].id);
      for (var j = 0; j < openings.length; j += 1) {
        list.push({ r: map.rooms[i].id, d: openings[j].id });
      }
    }
    return list;
  }

  /* Breadth-first over (room, side) states: the shortest run of doorways
   * that lands in a room, whichever side of it it arrives on. */
  function pdxBfsRoom(map, room, side, target) {
    if (room === target) { return []; }
    var openings = pdxAllOpenings(map);
    var visited = {};
    visited[room + "|" + side] = true;
    var queue = [{ r: room, s: side, plan: [] }];
    for (var head = 0; head < queue.length; head += 1) {
      var node = queue[head];
      for (var i = 0; i < openings.length; i += 1) {
        if (openings[i].r !== node.r) { continue; }
        var step = paradoxEnter(map, node.r, node.s, openings[i].d);
        if (!step.moved) { continue; }
        var key = step.room + "|" + step.side;
        if (visited[key] === true) { continue; }
        visited[key] = true;
        var plan = node.plan.concat([openings[i].d]);
        if (step.room === target) { return plan; }
        queue.push({ r: step.room, s: step.side, plan: plan });
      }
    }
    return null;
  }

  function pdxWalkTo(map, room, side, target, plan) {
    var route = pdxBfsRoom(map, room, side, target);
    if (route === null) { return null; }
    for (var i = 0; i < route.length; i += 1) {
      var step = paradoxEnter(map, room, side, route[i]);
      room = step.room;
      side = step.side;
    }
    return { plan: plan.concat(route), room: room, side: side };
  }

  /* A plan that works on any sane map: walk each parcel from its room to
   * its destination, one parcel after another. */
  function pdxCorePlan(map) {
    var plan = [];
    var room = map.start;
    var side = pdxStartSide(map);
    for (var i = 0; i < map.parcels.length; i += 1) {
      var p = map.parcels[i];
      var leg = pdxWalkTo(map, room, side, p.from, plan);
      if (!leg) { return null; }
      plan = leg.plan;
      room = leg.room;
      side = leg.side;
      if (room !== p.to) {
        leg = pdxWalkTo(map, room, side, p.to, plan);
        if (!leg) { return null; }
        plan = leg.plan;
        room = leg.room;
        side = leg.side;
      }
    }
    return plan;
  }

  /* The measured shortest plan: the core plan gives an upper bound, then
   * iterative deepening proves nothing shorter delivers everything. */
  function pdxShortestPlan(map) {
    if (!map || !map.rooms || !map.parcels) { return null; }
    var core = pdxCorePlan(map);
    if (!core) { return null; }
    var checked = paradoxResolve(map, core);
    if (!checked.ok) { return null; }
    var best = { plan: core, steps: checked.steps };
    var limit = Math.min(best.steps - 1, pdxStepCap);
    for (var depth = 1; depth <= limit; depth += 1) {
      var found = pdxSearchDepth(map, depth);
      if (found) {
        return { plan: found, steps: depth };
      }
    }
    return best;
  }

  function pdxSearchDepth(map, depth) {
    var openings = pdxAllOpenings(map);
    var path = [];
    var tried = 0;

    function walk(r, s, left) {
      if (left === 0) { return paradoxResolve(map, path).ok ? path.slice(0) : null; }
      for (var i = 0; i < openings.length; i += 1) {
        if (openings[i].r !== r) { continue; }
        tried += 1;
        if (tried > 40000) { return null; }
        var step = paradoxEnter(map, r, s, openings[i].d);
        if (!step.moved) { continue; }
        path.push(openings[i].d);
        var hit = walk(step.room, step.side, left - 1);
        path.pop();
        if (hit) { return hit; }
      }
      return null;
    }

    return walk(map.start, pdxStartSide(map), depth);
  }

  /* True when some plan lands every parcel inside the budget of the map.
   * A map is dealt only after this says yes. */
  function paradoxSolvable(map) {
    if (!map || !map.rooms || !map.parcels) { return false; }
    var shortest = pdxShortestPlan(map);
    if (!shortest) { return false; }
    return shortest.steps <= (map.budget || pdxStepCap);
  }

  /* ------------------------------------------------------------------
   * Authored content. One small building, twenty runs through it, dealt in
   * the order the search measures.
   *
   * Raw door rows are [room, door, wall, from, to, at]: the doorway
   * called door stands in room on wall, and it only gives at all if you
   * came into that room on side from ("any" for an honest door), in which
   * case it puts you in room to, standing on side at. Raw parcel rows are
   * [id, from room, to room, label].
   * ------------------------------------------------------------------ */

  var pdxPlaces = {
    hall: { name: { en: "Lobby", zh: "大厅" }, copy: { en: "Coat hooks, a brass rail, and a palm nobody waters.", zh: "衣帽钩、黄铜扶手，还有一株没人浇水的棕榈。" } },
    mailroom: { name: { en: "Mailroom", zh: "收发室" }, copy: { en: "Pigeonholes to the ceiling and a canvas sack on the floor.", zh: "鸽格摞到天花板，地板上摊着一只帆布袋。" } },
    records: { name: { en: "Records", zh: "档案室" }, copy: { en: "Twine, shelves, and a stamp that still smells of ink.", zh: "绳子、架子，和一枚还有墨味的图章。" } },
    office: { name: { en: "Office", zh: "办公室" }, copy: { en: "A desk with three phones, none of them ringing.", zh: "一张桌子三部电话，都没在响。" } },
    cold: { name: { en: "Cold Room", zh: "冷藏间" }, copy: { en: "Cold enough to see your breath, even in July.", zh: "冷得能看见呼吸，哪怕是七月。" } },
    boiler: { name: { en: "Boiler Room", zh: "锅炉房" }, copy: { en: "Sweating pipes and a gauge that twitches when you look.", zh: "管道出汗，你一看它表盘就抖一下。" } },
    cellar: { name: { en: "Cellar", zh: "地下室" }, copy: { en: "Wine racks, wet stone, and a smell of old rain.", zh: "酒架、湿石头，一股旧雨的味道。" } },
    corridor: { name: { en: "Back Corridor", zh: "后走廊" }, copy: { en: "Long and low, with doors that are on no floor plan.", zh: "又长又矮，门都不在任何图纸上。" } },
    attic: { name: { en: "Attic", zh: "顶层阁楼" }, copy: { en: "Boxes of photographs and one bright square of sky.", zh: "成箱的照片，和一方亮亮的天空。" } },
    studio: { name: { en: "Studio", zh: "绘图室" }, copy: { en: "A drafting table, a spilled cup, one room drawn twice.", zh: "绘图桌、洒了的杯子，同一间房画了两遍。" } },
    dark: { name: { en: "Dark Room", zh: "暗房" }, copy: { en: "No windows, and a draught from the wrong wall.", zh: "没有窗，却有风从不对的那面墙吹来。" } },
    shop: { name: { en: "Store Front", zh: "店面" }, copy: { en: "A counter, a bell, and a customer who never turned.", zh: "柜台、门铃，和一个始终没回头的顾客。" } },
    print: { name: { en: "Print Room", zh: "印刷间" }, copy: { en: "A press, drying racks, and sheets still warm.", zh: "印刷机、晾纸架，和还温热的纸。" } },
    bay: { name: { en: "Loading Bay", zh: "装卸月台" }, copy: { en: "A truck idling, a ramp, names crossed off a clipboard.", zh: "卡车怠速，一块斜坡，夹板上的名字被划掉。" } },
    lift: { name: { en: "Lift Lobby", zh: "电梯厅" }, copy: { en: "One lift, two buttons, neither of them labelled.", zh: "一部电梯两个按钮，都没有标签。" } },
  };

  var pdxRawMaps = [
    {
      id: "m1",
      name: { en: "The Wrong Side", zh: "错的那一边" },
      brief: { en: "Three parcels, one small building. The chute out of the mailroom only drops when you came into the mailroom from the lobby side.", zh: "三个包裹，一栋小楼。收发室的滑道只有在你从大厅那侧进来之后才落得下去。" },
      hint: { en: "Knock the chute from both sides.", zh: "两个边各敲一次滑道。" },
      rooms: ["hall", "mailroom", "records", "office", "cold", "cellar", "corridor", "bay"], start: "hall", at: "south", budget: 16, order: [],
      doors: [
        ["hall", "dLift", "north", "any", "mailroom", "south"],
        ["hall", "dDesk", "west", "any", "records", "east"],
        ["hall", "dStair", "south", "any", "office", "north"],
        ["mailroom", "dLift", "south", "any", "hall", "north"],
        ["mailroom", "dChute", "west", "south", "cold", "east"],
        ["cold", "dChute", "east", "any", "mailroom", "north"],
        ["cold", "dRun", "south", "any", "cellar", "north"],
        ["cellar", "dHatch", "east", "any", "office", "west"],
        ["office", "dHatch", "west", "any", "cellar", "east"],
        ["office", "dStair", "north", "any", "hall", "south"],
        ["records", "dDesk", "east", "any", "hall", "west"],
        ["records", "dDumb", "north", "any", "corridor", "south"],
        ["corridor", "dDumb", "south", "any", "records", "north"],
        ["corridor", "dBack", "east", "any", "mailroom", "east"],
        ["corridor", "dRamp", "west", "any", "bay", "north"],
        ["bay", "dRamp", "north", "any", "corridor", "west"],
        ["bay", "dSide", "east", "any", "hall", "south"]
      ],
      parcels: [
        ["p1", "mailroom", "cold", { en: "A crate marked GLASS", zh: "标着易碎的木箱" }],
        ["p2", "records", "cellar", { en: "A long thin box", zh: "细长的盒子" }],
        ["p3", "bay", "office", { en: "A sack of keys", zh: "一袋钥匙" }]
      ]
    },
    {
      id: "m2",
      name: { en: "Lift or Balcony", zh: "电梯还是阳台" },
      brief: { en: "The sixth-floor lift opens onto a balcony that is also the records room. Which side you came in on decides where it lets you out.", zh: "六层的电梯开向阳台，那阳台同时又连着档案室。你从哪边进来，就决定它放你去哪。" },
      hint: { en: "Come at the crossing from records.", zh: "从档案室那侧接近交叉门。" },
      rooms: ["bay", "hall", "lift", "office", "records", "corridor", "cold", "cellar"], start: "bay", at: "north", budget: 16, order: [],
      doors: [
        ["bay", "dFreight", "north", "any", "hall", "south"],
        ["hall", "dFreight", "south", "any", "bay", "north"],
        ["hall", "dLift", "north", "any", "lift", "south"],
        ["lift", "dLift", "south", "any", "hall", "north"],
        ["lift", "dBalcony", "east", "any", "office", "west"],
        ["office", "dBalcony", "west", "any", "lift", "east"],
        ["lift", "dCross", "north", "east", "records", "south"],
        ["office", "dCross", "south", "north", "records", "north"],
        ["records", "dCross", "north", "any", "corridor", "south"],
        ["corridor", "dCross", "south", "any", "records", "north"],
        ["corridor", "dStair", "east", "any", "cold", "west"],
        ["cold", "dStair", "west", "any", "corridor", "east"],
        ["cold", "dHatch", "south", "any", "cellar", "north"],
        ["cellar", "dHatch", "north", "any", "cold", "south"],
        ["cellar", "dDrain", "west", "any", "bay", "east"],
        ["bay", "dDrain", "east", "any", "cellar", "west"],
        ["records", "dPipe", "east", "north", "office", "south"]
      ],
      parcels: [
        ["p1", "bay", "office", { en: "A warm hamper", zh: "温热的食篮" }],
        ["p2", "lift", "cellar", { en: "A locked ledger", zh: "上了锁的账簿" }],
        ["p3", "corridor", "hall", { en: "A box of old letters", zh: "一箱旧信" }]
      ]
    },
    {
      id: "m3",
      name: { en: "Four Ways to Knock", zh: "四种敲门法" },
      brief: { en: "One east doorway in the lobby answers four different ways, by the side you crossed on. The manifest does not care how you got there.", zh: "大厅东边那一扇门按你进屋的那一边给出四个去处。运单不在乎你是怎么到的。" },
      hint: { en: "Walk all four sides of the lobby.", zh: "大厅四个边各走一遍。" },
      rooms: ["hall", "mailroom", "records", "office", "cold", "cellar", "corridor", "dark"], start: "hall", at: "north", budget: 18, order: [],
      doors: [
        ["hall", "dCross", "east", "north", "mailroom", "south"],
        ["hall", "dCross", "east", "west", "records", "east"],
        ["hall", "dCross", "east", "south", "office", "north"],
        ["hall", "dCross", "east", "east", "corridor", "west"],
        ["mailroom", "dCross", "west", "any", "hall", "south"],
        ["records", "dCross", "west", "any", "hall", "north"],
        ["office", "dCross", "west", "any", "hall", "east"],
        ["corridor", "dCross", "west", "any", "hall", "west"],
        ["mailroom", "dChute", "north", "any", "cold", "south"],
        ["cold", "dChute", "south", "any", "mailroom", "north"],
        ["records", "dRun", "south", "any", "cellar", "north"],
        ["cellar", "dRun", "north", "any", "records", "south"],
        ["office", "dHatch", "east", "any", "dark", "west"],
        ["dark", "dHatch", "west", "any", "office", "east"],
        ["dark", "dStair", "south", "any", "corridor", "north"],
        ["corridor", "dStair", "north", "any", "dark", "south"],
        ["cellar", "dCooler", "east", "any", "cold", "west"],
        ["cold", "dCooler", "west", "any", "cellar", "east"]
      ],
      parcels: [
        ["p1", "mailroom", "cellar", { en: "A parcel tied twice", zh: "打了两道绳的包裹" }],
        ["p2", "records", "dark", { en: "A tin of ink", zh: "一罐墨汁" }],
        ["p3", "hall", "cold", { en: "A wrapped map", zh: "包好的地图" }]
      ]
    },
    {
      id: "m4",
      name: { en: "The Double Ladder", zh: "两道梯子" },
      brief: { en: "The studio ladder climbs if you came in from the hall and drops if you came in from the boiler. Nobody built it that way. It simply is.", zh: "从大厅进来，绘图室的梯子上去；从锅炉房进来，它下去。没人这样盖过，它就是这样的。" },
      hint: { en: "Your side is set by the door you used.", zh: "你站在哪边，由你走的门决定。" },
      rooms: ["shop", "hall", "studio", "attic", "print", "corridor", "boiler", "cellar"], start: "shop", at: "south", budget: 18, order: [],
      doors: [
        ["shop", "dBell", "north", "any", "hall", "south"],
        ["hall", "dBell", "south", "any", "shop", "north"],
        ["hall", "dStair", "east", "any", "studio", "west"],
        ["studio", "dStair", "west", "any", "hall", "east"],
        ["studio", "dLadder", "north", "west", "attic", "south"],
        ["studio", "dLadder", "north", "east", "cellar", "west"],
        ["attic", "dLadder", "south", "any", "studio", "north"],
        ["attic", "dDumb", "east", "any", "print", "west"],
        ["print", "dDumb", "west", "any", "attic", "east"],
        ["print", "dRun", "south", "any", "corridor", "north"],
        ["corridor", "dRun", "north", "any", "print", "south"],
        ["corridor", "dStep", "east", "any", "boiler", "west"],
        ["boiler", "dStep", "west", "any", "corridor", "east"],
        ["boiler", "dPipe", "north", "any", "cellar", "south"],
        ["cellar", "dPipe", "south", "any", "boiler", "north"],
        ["cellar", "dTruck", "west", "any", "shop", "east"],
        ["shop", "dTruck", "east", "any", "cellar", "west"]
      ],
      parcels: [
        ["p1", "shop", "attic", { en: "A bucket of eels", zh: "一桶鳗鱼" }],
        ["p2", "print", "cellar", { en: "Three glass jars", zh: "三只玻璃罐" }],
        ["p3", "hall", "boiler", { en: "A hat, still warm", zh: "一顶还热的帽子" }]
      ]
    },
    {
      id: "m5",
      name: { en: "In That Order", zh: "按这个顺序" },
      brief: { en: "Sign the ledger before the cold room and the cold room before the dark room. The order is on the manifest, not in your head.", zh: "先签收账簿，再送冷藏间，再送暗房。顺序写在运单上，不在你脑子里。" },
      hint: { en: "Deliver in the listed order.", zh: "按清单上的顺序送。" },
      rooms: ["bay", "mailroom", "records", "office", "cold", "cellar", "corridor", "dark"], start: "bay", at: "west", budget: 20, order: [["p1", "p2"], ["p2", "p3"]],
      doors: [
        ["bay", "dLift", "east", "any", "mailroom", "west"],
        ["mailroom", "dLift", "west", "any", "bay", "east"],
        ["mailroom", "dChute", "north", "any", "records", "south"],
        ["records", "dChute", "south", "any", "mailroom", "north"],
        ["records", "dDesk", "east", "any", "office", "west"],
        ["office", "dDesk", "west", "any", "records", "east"],
        ["office", "dRegister", "north", "west", "cold", "south"],
        ["office", "dRegister", "north", "south", "dark", "east"],
        ["cold", "dRegister", "south", "any", "office", "north"],
        ["cold", "dRun", "east", "any", "cellar", "west"],
        ["cellar", "dRun", "west", "any", "cold", "east"],
        ["cellar", "dHatch", "north", "any", "corridor", "south"],
        ["corridor", "dHatch", "south", "any", "cellar", "north"],
        ["corridor", "dDark", "east", "any", "dark", "west"],
        ["dark", "dDark", "west", "any", "corridor", "east"],
        ["dark", "dFlue", "south", "any", "bay", "north"],
        ["bay", "dFlue", "north", "any", "dark", "south"]
      ],
      parcels: [
        ["p1", "mailroom", "records", { en: "A satchel of cheques", zh: "一夹子支票" }],
        ["p2", "records", "cold", { en: "A hamper of ice", zh: "一篮冰" }],
        ["p3", "bay", "dark", { en: "A sealed brown envelope", zh: "封口的牛皮纸袋" }]
      ]
    },
    {
      id: "m6",
      name: { en: "The Shortcut Bites", zh: "抄近路的代价" },
      brief: { en: "The mailroom chute spits you out on a different side than the one you fell in from, so the shortcut is only a shortcut the first time.", zh: "收发室的滑道把你吐在另一边上，和下去时的那一边不同，所以近路只在第一次算近路。" },
      hint: { en: "The chute is a one-way shortcut.", zh: "滑道是单向的近路。" },
      rooms: ["office", "attic", "hall", "mailroom", "records", "corridor", "bay", "cellar"], start: "office", at: "north", budget: 20, order: [],
      doors: [
        ["office", "dStair", "north", "any", "attic", "south"],
        ["attic", "dStair", "south", "any", "office", "north"],
        ["attic", "dBalcony", "east", "any", "hall", "west"],
        ["hall", "dBalcony", "west", "any", "attic", "east"],
        ["attic", "dFlue", "west", "north", "mailroom", "east"],
        ["mailroom", "dFlue", "east", "any", "attic", "west"],
        ["hall", "dLift", "north", "any", "records", "south"],
        ["records", "dLift", "south", "any", "hall", "north"],
        ["records", "dRun", "east", "any", "corridor", "west"],
        ["corridor", "dRun", "west", "any", "records", "east"],
        ["corridor", "dDark", "north", "west", "office", "south"],
        ["office", "dDark", "south", "any", "corridor", "north"],
        ["corridor", "dRamp", "south", "any", "bay", "north"],
        ["bay", "dRamp", "north", "any", "corridor", "south"],
        ["bay", "dHatch", "east", "any", "cellar", "west"],
        ["cellar", "dHatch", "west", "any", "bay", "east"],
        ["cellar", "dChute", "north", "any", "mailroom", "south"],
        ["mailroom", "dChute", "south", "west", "cellar", "north"],
        ["mailroom", "dDesk", "north", "any", "hall", "east"]
      ],
      parcels: [
        ["p1", "office", "cellar", { en: "A tin of letters", zh: "一罐信件" }],
        ["p2", "attic", "bay", { en: "A flat wooden case", zh: "扁木箱" }],
        ["p3", "hall", "mailroom", { en: "A register of debts", zh: "一本欠账登记" }]
      ]
    },
    {
      id: "m7",
      name: { en: "The Split Landing", zh: "两片的平台" },
      brief: { en: "The dumbwaiter in the attic leads to the corridor or back to the print room, never to both. It is the same hole in the same wall.", zh: "阁楼的送菜梯要么通向后走廊，要么退回印刷间，两者只能选一个。同一面墙上的同一个洞。" },
      hint: { en: "Read the notebook before you knock.", zh: "敲门之前先读笔记。" },
      rooms: ["print", "shop", "hall", "studio", "attic", "corridor", "boiler", "cellar"], start: "print", at: "east", budget: 20, order: [["p1", "p3"]],
      doors: [
        ["print", "dRun", "east", "any", "shop", "west"],
        ["shop", "dRun", "west", "any", "print", "east"],
        ["shop", "dBell", "north", "any", "hall", "south"],
        ["hall", "dBell", "south", "any", "shop", "north"],
        ["hall", "dStair", "east", "any", "studio", "west"],
        ["studio", "dStair", "west", "any", "hall", "east"],
        ["studio", "dLadder", "north", "west", "attic", "south"],
        ["attic", "dLadder", "south", "any", "studio", "north"],
        ["attic", "dDumb", "east", "south", "corridor", "north"],
        ["attic", "dDumb", "east", "north", "print", "south"],
        ["print", "dDumb", "south", "any", "attic", "north"],
        ["corridor", "dDumb", "north", "any", "attic", "east"],
        ["studio", "dStep", "east", "any", "boiler", "west"],
        ["boiler", "dStep", "west", "any", "studio", "east"],
        ["corridor", "dStair", "west", "any", "boiler", "east"],
        ["boiler", "dStair", "east", "any", "corridor", "west"],
        ["boiler", "dPipe", "south", "any", "cellar", "north"],
        ["cellar", "dPipe", "north", "any", "boiler", "south"],
        ["cellar", "dTruck", "east", "any", "print", "south"],
        ["print", "dTruck", "south", "any", "cellar", "east"]
      ],
      parcels: [
        ["p1", "print", "attic", { en: "A roll of posters", zh: "一卷海报" }],
        ["p2", "hall", "cellar", { en: "Two bottles of port", zh: "两瓶波特酒" }],
        ["p3", "shop", "corridor", { en: "A bag of coins", zh: "一袋硬币" }]
      ]
    },
    {
      id: "m8",
      name: { en: "The Sixth Floor", zh: "六层不在五层上" },
      brief: { en: "Half the doors here put you on the far side of the room you just left. Read the notebook before you reach for a handle.", zh: "这里一半的门，会把你放到刚刚离开那间房的对面一边。伸手拉门前先读笔记。" },
      hint: { en: "A blocked door costs one step.", zh: "推不开只亏一步。" },
      rooms: ["mailroom", "attic", "cold", "hall", "lift", "bay", "corridor", "cellar"], start: "mailroom", at: "north", budget: 18, order: [],
      doors: [
        ["mailroom", "dChute", "north", "any", "attic", "south"],
        ["attic", "dChute", "south", "any", "mailroom", "north"],
        ["mailroom", "dLift", "east", "any", "cold", "west"],
        ["cold", "dLift", "west", "any", "mailroom", "east"],
        ["cold", "dCross", "north", "east", "hall", "south"],
        ["cold", "dCross", "north", "west", "lift", "south"],
        ["hall", "dCross", "south", "any", "cold", "north"],
        ["lift", "dCross", "south", "any", "cold", "east"],
        ["hall", "dStair", "east", "any", "bay", "west"],
        ["bay", "dStair", "west", "any", "hall", "east"],
        ["bay", "dRamp", "north", "any", "corridor", "south"],
        ["corridor", "dRamp", "south", "any", "bay", "north"],
        ["corridor", "dDark", "east", "any", "lift", "west"],
        ["lift", "dDark", "west", "any", "corridor", "east"],
        ["lift", "dBalcony", "south", "north", "cellar", "north"],
        ["lift", "dBalcony", "south", "west", "mailroom", "west"],
        ["cellar", "dBalcony", "north", "any", "lift", "south"],
        ["cellar", "dHatch", "west", "any", "attic", "east"],
        ["attic", "dHatch", "east", "any", "cellar", "west"]
      ],
      parcels: [
        ["p1", "mailroom", "cellar", { en: "A crate of oranges", zh: "一箱橙子" }],
        ["p2", "attic", "bay", { en: "A framed photograph", zh: "镶框的照片" }],
        ["p3", "corridor", "cold", { en: "A side of beef", zh: "半扇牛肉" }]
      ]
    },
    {
      id: "m9",
      name: { en: "Wrong Walls", zh: "全都装错墙" },
      brief: { en: "Three rooms, three parcels, one chain: records before the cold room, the cold room before the cellar. Somebody moved the doors in June.", zh: "三间房三个包裹一条链：档案室之后才是冷藏间，冷藏间之后才是地下室。六月里有人动过门。" },
      hint: { en: "Plan the whole chain first.", zh: "先想清楚整条链。" },
      rooms: ["bay", "mailroom", "attic", "records", "office", "cold", "cellar", "hall"], start: "bay", at: "east", budget: 22, order: [["p1", "p2"], ["p2", "p3"]],
      doors: [
        ["bay", "dLift", "east", "any", "mailroom", "west"],
        ["mailroom", "dLift", "west", "any", "bay", "east"],
        ["bay", "dChute", "north", "east", "attic", "south"],
        ["mailroom", "dChute", "north", "south", "attic", "south"],
        ["attic", "dChute", "south", "any", "bay", "north"],
        ["attic", "dDesk", "east", "any", "records", "west"],
        ["records", "dDesk", "west", "any", "attic", "east"],
        ["records", "dPipe", "north", "any", "office", "south"],
        ["office", "dPipe", "south", "any", "records", "north"],
        ["office", "dRegister", "east", "north", "cold", "west"],
        ["office", "dRegister", "east", "west", "hall", "east"],
        ["cold", "dRegister", "west", "any", "office", "east"],
        ["cold", "dRun", "south", "any", "cellar", "north"],
        ["cellar", "dRun", "north", "any", "cold", "south"],
        ["cellar", "dHatch", "west", "any", "hall", "east"],
        ["hall", "dHatch", "east", "any", "cellar", "west"],
        ["hall", "dStair", "north", "any", "mailroom", "east"],
        ["mailroom", "dStair", "south", "any", "hall", "north"]
      ],
      parcels: [
        ["p1", "bay", "records", { en: "A tray of sorted mail", zh: "一盘分好的信" }],
        ["p2", "mailroom", "cold", { en: "A box of medicine", zh: "一盒药" }],
        ["p3", "attic", "cellar", { en: "A heavy brass clock", zh: "一只沉重的铜钟" }]
      ]
    },
    {
      id: "m10",
      name: { en: "Last Run Home", zh: "收尾一趟" },
      brief: { en: "Last run before the shutters come down. The crossing door in records remembers where you came in, so walk this building like you mean it.", zh: "拉闸前的最后一趟。档案室的交叉门记得你从哪边进来，所以这趟走稳一点。" },
      hint: { en: "Map a door once, use it ten times.", zh: "一次摸清一扇门，十次用得上。" },
      rooms: ["records", "office", "dark", "shop", "hall", "studio", "attic", "corridor"], start: "records", at: "south", budget: 22, order: [["p1", "p3"]],
      doors: [
        ["records", "dDesk", "east", "any", "office", "west"],
        ["office", "dDesk", "west", "any", "records", "east"],
        ["records", "dCross", "north", "east", "dark", "west"],
        ["records", "dCross", "north", "south", "shop", "south"],
        ["dark", "dCross", "west", "any", "records", "north"],
        ["shop", "dCross", "south", "any", "records", "west"],
        ["dark", "dStair", "south", "any", "office", "north"],
        ["office", "dStair", "north", "any", "dark", "south"],
        ["shop", "dBell", "east", "any", "hall", "west"],
        ["hall", "dBell", "west", "any", "shop", "east"],
        ["hall", "dStair", "north", "any", "studio", "south"],
        ["studio", "dStair", "south", "any", "hall", "north"],
        ["studio", "dLadder", "east", "any", "corridor", "west"],
        ["corridor", "dLadder", "west", "any", "studio", "east"],
        ["corridor", "dRun", "north", "east", "dark", "south"],
        ["dark", "dRun", "south", "any", "corridor", "north"],
        ["corridor", "dAttic", "east", "north", "attic", "south"],
        ["attic", "dAttic", "south", "any", "corridor", "east"],
        ["attic", "dDumb", "west", "any", "office", "east"],
        ["office", "dDumb", "east", "any", "attic", "west"]
      ],
      parcels: [
        ["p1", "records", "studio", { en: "A bundle of maps", zh: "一叠地图" }],
        ["p2", "shop", "attic", { en: "A parcel marked FRAGILE", zh: "标着轻拿轻放" }],
        ["p3", "dark", "hall", { en: "A wet canvas bag", zh: "湿透的帆布袋" }]
      ]
    },
    {
      id: "m11",
      name: { en: "The Going-Up Door", zh: "向上的那道门" },
      brief: { en: "The crossing door in records throws you forward when you came up the stairs and back when you came down. The floor plan shows one door and no arrow.", zh: "档案室那道交叉门：上楼进来它把你往前抛，下楼进来它把你往后抛。图纸上只画了一扇门，没画箭头。" },
      hint: { en: "One east doorway, two answers.", zh: "同一道东边的门，两种答法。" },
      rooms: ["shop", "hall", "mailroom", "records", "office", "cold", "cellar", "corridor"], start: "shop", at: "south", budget: 17, order: [],
      doors: [
        ["shop", "dBell", "north", "any", "hall", "south"],
        ["hall", "dBell", "south", "any", "shop", "north"],
        ["hall", "dLift", "north", "any", "mailroom", "south"],
        ["mailroom", "dLift", "south", "any", "hall", "north"],
        ["mailroom", "dChute", "north", "any", "records", "south"],
        ["records", "dChute", "south", "any", "mailroom", "north"],
        ["records", "dDesk", "north", "any", "office", "south"],
        ["office", "dDesk", "south", "any", "records", "north"],
        ["office", "dRegister", "north", "any", "cold", "south"],
        ["cold", "dRegister", "south", "any", "office", "north"],
        ["cold", "dRun", "north", "any", "cellar", "south"],
        ["cellar", "dRun", "south", "any", "cold", "north"],
        ["cellar", "dHatch", "north", "any", "corridor", "south"],
        ["corridor", "dHatch", "south", "any", "cellar", "north"],
        ["records", "dCross", "east", "south", "cold", "west"],
        ["cold", "dCross", "west", "any", "records", "east"],
        ["records", "dCross", "east", "north", "hall", "east"],
        ["hall", "dCross", "east", "any", "records", "west"]
      ],
      parcels: [
        ["p1", "shop", "cold", { en: "A crate of wet clay", zh: "一箱湿泥" }],
        ["p2", "hall", "cellar", { en: "A bundle of curtain rails", zh: "一捆窗帘杆" }],
        ["p3", "corridor", "mailroom", { en: "A sack with one boot in it", zh: "装着一只靴子的麻袋" }]
      ]
    },
    {
      id: "m12",
      name: { en: "Nine Rooms Deep", zh: "九间房到底" },
      brief: { en: "A long thin building. The mailroom crossing skips two rooms ahead if you came from below and two rooms back if you came from above, and the cold-room pipe only remembers the downward trip.", zh: "又长又窄的一栋。收发室那道交叉门：从下边来跳过两间往前，从上边来跳过两间往后；冷藏间那根管道只记得你往下走的那一趟。" },
      hint: { en: "Know which way you were travelling.", zh: "先搞清楚你刚才在往哪边走。" },
      rooms: ["print", "shop", "hall", "mailroom", "records", "office", "cold", "cellar", "corridor"], start: "print", at: "south", budget: 18, order: [],
      doors: [
        ["print", "dRun", "north", "any", "shop", "south"],
        ["shop", "dRun", "south", "any", "print", "north"],
        ["shop", "dBell", "north", "any", "hall", "south"],
        ["hall", "dBell", "south", "any", "shop", "north"],
        ["hall", "dLift", "north", "any", "mailroom", "south"],
        ["mailroom", "dLift", "south", "any", "hall", "north"],
        ["mailroom", "dChute", "north", "any", "records", "south"],
        ["records", "dChute", "south", "any", "mailroom", "north"],
        ["records", "dDesk", "north", "any", "office", "south"],
        ["office", "dDesk", "south", "any", "records", "north"],
        ["office", "dRegister", "north", "any", "cold", "south"],
        ["cold", "dRegister", "south", "any", "office", "north"],
        ["cold", "dFlue", "north", "any", "cellar", "south"],
        ["cellar", "dFlue", "south", "any", "cold", "north"],
        ["cellar", "dHatch", "north", "any", "corridor", "south"],
        ["corridor", "dHatch", "south", "any", "cellar", "north"],
        ["mailroom", "dCross", "east", "south", "office", "west"],
        ["office", "dCross", "west", "any", "mailroom", "east"],
        ["mailroom", "dCross", "east", "north", "shop", "east"],
        ["shop", "dCross", "east", "any", "mailroom", "west"],
        ["cold", "dPipe", "west", "north", "records", "east"],
        ["records", "dPipe", "east", "any", "cold", "west"]
      ],
      parcels: [
        ["p1", "print", "cellar", { en: "A hamper of pears", zh: "一篮梨" }],
        ["p2", "office", "shop", { en: "A tinned lamp", zh: "一罐灯油灯" }],
        ["p3", "corridor", "records", { en: "A strap of old papers", zh: "一扎旧文件" }]
      ]
    },
    {
      id: "m13",
      name: { en: "The Bell on the Far Wall", zh: "装在对面那面墙上的铃" },
      brief: { en: "Nine rooms on one stair. There is no stair to the lift lobby: the records crossing gives it only to whoever came into records from the office, and the office pipe throws you back to the loading bay only if you came up into the office from the cold room.", zh: "九间房一道梯。电梯厅没有梯子通向它：只有从办公室那侧进的档案室，交叉门才给你电梯厅；而办公室那根管道只在你从冷藏间上来时才应答，一答就把你抛回月台。" },
      hint: { en: "Some rooms hide behind a side, not behind a door.", zh: "有些房间挡在一边后面，而不是一扇门后面。" },
      rooms: ["bay", "hall", "mailroom", "records", "office", "cold", "cellar", "corridor", "lift"], start: "bay", at: "south", budget: 18, order: [],
      doors: [
        ["bay", "dRamp", "north", "any", "hall", "south"],
        ["hall", "dRamp", "south", "any", "bay", "north"],
        ["hall", "dLift", "north", "any", "mailroom", "south"],
        ["mailroom", "dLift", "south", "any", "hall", "north"],
        ["mailroom", "dChute", "north", "any", "records", "south"],
        ["records", "dChute", "south", "any", "mailroom", "north"],
        ["records", "dDesk", "north", "any", "office", "south"],
        ["office", "dDesk", "south", "any", "records", "north"],
        ["office", "dRegister", "north", "any", "cold", "south"],
        ["cold", "dRegister", "south", "any", "office", "north"],
        ["cold", "dFlue", "north", "any", "cellar", "south"],
        ["cellar", "dFlue", "south", "any", "cold", "north"],
        ["cellar", "dHatch", "north", "any", "corridor", "south"],
        ["corridor", "dHatch", "south", "any", "cellar", "north"],
        ["records", "dCross", "east", "south", "cellar", "west"],
        ["cellar", "dCross", "west", "any", "records", "east"],
        ["records", "dCross", "east", "north", "lift", "west"],
        ["lift", "dCross", "west", "any", "records", "east"],
        ["office", "dPipe", "west", "north", "bay", "east"],
        ["bay", "dPipe", "east", "any", "office", "west"]
      ],
      parcels: [
        ["p1", "bay", "cold", { en: "A crate of soda bottles", zh: "一箱汽水" }],
        ["p2", "cellar", "records", { en: "A sealed biscuit tin", zh: "封口的饼干铁盒" }],
        ["p3", "mailroom", "corridor", { en: "A basket of linens", zh: "一篮洗好的布单" }]
      ]
    },
    {
      id: "m14",
      name: { en: "Two Orders", zh: "两道命令" },
      brief: { en: "Sign for the bay first, then the attic, then the cellar. The print-room chute climbs to the attic when you came into print from the lobby and drops to the cellar when you came in from the studio.", zh: "先签收月台，再顶层阁楼，再地下室。印刷间那道滑道：从大厅那边进印刷间，它往上走；从绘图室那边进来，它往下落。" },
      hint: { en: "The order is on the manifest; the side is in the notebook.", zh: "顺序写在运单上，哪一边记在笔记里。" },
      rooms: ["hall", "print", "studio", "attic", "shop", "corridor", "boiler", "cellar", "bay"], start: "hall", at: "south", budget: 19, order: [["p1", "p2"], ["p2", "p3"]],
      doors: [
        ["hall", "dRun", "north", "any", "print", "south"],
        ["print", "dRun", "south", "any", "hall", "north"],
        ["print", "dDumb", "east", "any", "studio", "west"],
        ["studio", "dDumb", "west", "any", "print", "east"],
        ["studio", "dLadder", "north", "any", "attic", "south"],
        ["attic", "dLadder", "south", "any", "studio", "north"],
        ["studio", "dBell", "east", "any", "shop", "west"],
        ["shop", "dBell", "west", "any", "studio", "east"],
        ["shop", "dStep", "south", "any", "corridor", "north"],
        ["corridor", "dStep", "north", "any", "shop", "south"],
        ["corridor", "dPipe", "east", "any", "boiler", "west"],
        ["boiler", "dPipe", "west", "any", "corridor", "east"],
        ["boiler", "dFlue", "north", "any", "cellar", "south"],
        ["cellar", "dFlue", "south", "any", "boiler", "north"],
        ["cellar", "dTruck", "east", "any", "bay", "west"],
        ["bay", "dTruck", "west", "any", "cellar", "east"],
        ["print", "dChute", "west", "south", "attic", "west"],
        ["attic", "dChute", "west", "any", "print", "east"],
        ["print", "dChute", "west", "east", "cellar", "west"],
        ["cellar", "dChute", "west", "any", "print", "east"]
      ],
      parcels: [
        ["p1", "hall", "bay", { en: "A roll of burlap", zh: "一卷粗麻布" }],
        ["p2", "boiler", "attic", { en: "A kettle with a crack", zh: "裂了口的烧水壶" }],
        ["p3", "shop", "cellar", { en: "A basket of mussels", zh: "一篮淡菜" }]
      ]
    },
    {
      id: "m15",
      name: { en: "The Unfinished Wing", zh: "没完工的那一翼" },
      brief: { en: "The dark room has no doorway of its own: every way out of it is somebody else's door seen from the inside. Two stair doors here also put you down on the far side of the room, and the east doorway in records is bricked up.", zh: "暗房没有自己的门，从它出去的路全是别人家的门从里面看到的样子。这里有两道楼梯门还会把你放在刚才那间房的对面一边，而档案室东边那道门已经被砌死了。" },
      hint: { en: "A door on the plan can still be a wall.", zh: "图上画着的门，也可能是一堵墙。" },
      rooms: ["bay", "hall", "mailroom", "records", "office", "cold", "cellar", "corridor", "dark"], start: "bay", at: "south", budget: 20, order: [],
      doors: [
        ["bay", "dRamp", "north", "any", "hall", "south"],
        ["hall", "dRamp", "south", "any", "bay", "north"],
        ["hall", "dLift", "north", "any", "mailroom", "north"],
        ["mailroom", "dLift", "south", "any", "hall", "north"],
        ["mailroom", "dChute", "north", "any", "records", "north"],
        ["records", "dChute", "south", "any", "mailroom", "north"],
        ["records", "dDesk", "north", "any", "office", "south"],
        ["office", "dDesk", "south", "any", "records", "north"],
        ["office", "dRegister", "north", "any", "cold", "south"],
        ["cold", "dRegister", "south", "any", "office", "north"],
        ["cold", "dFlue", "north", "any", "cellar", "south"],
        ["cellar", "dFlue", "south", "any", "cold", "north"],
        ["cellar", "dHatch", "north", "any", "corridor", "south"],
        ["corridor", "dHatch", "south", "any", "cellar", "north"],
        ["corridor", "dStair", "east", "any", "dark", "west"],
        ["dark", "dStair", "west", "any", "corridor", "east"],
        ["dark", "dRegister", "north", "any", "office", "north"],
        ["records", "dBrick", "east", "any", "yard", "west"],
        ["cold", "dCross", "east", "south", "corridor", "north"],
        ["corridor", "dCross", "north", "any", "cold", "east"],
        ["cold", "dCross", "east", "north", "bay", "west"],
        ["bay", "dCross", "west", "any", "cold", "east"]
      ],
      parcels: [
        ["p1", "bay", "cellar", { en: "A coil of copper wire", zh: "一卷铜线" }],
        ["p2", "office", "dark", { en: "A tray of developing dishes", zh: "一盘显影盘" }],
        ["p3", "dark", "mailroom", { en: "A ream of damp paper", zh: "半令受潮的纸" }]
      ]
    },
    {
      id: "m16",
      name: { en: "Two Storeys, One Rope", zh: "两层楼一根绳" },
      brief: { en: "One stair, ten rooms, and a lift landing bolted to the wrong wall: the door out of the cold room puts you down facing back into it. The records crossing reads which way you were going and answers with the lift or the attic, so the lift lobby has to be earned.", zh: "一道梯，十个房间，电梯厅的落点拧错了墙：从冷藏间那道门出去，落地时正对着回来的方向。档案室那道交叉门看你走的方向回答，要么电梯厅，要么顶层阁楼，所以电梯厅得自己挣。" },
      hint: { en: "Which side you land on is not a hint.", zh: "落在哪一边，不是给你的暗示。" },
      rooms: ["attic", "print", "studio", "hall", "shop", "mailroom", "records", "office", "cold", "lift"], start: "attic", at: "south", budget: 20, order: [],
      doors: [
        ["attic", "dStair", "north", "any", "print", "south"],
        ["print", "dStair", "south", "any", "attic", "north"],
        ["print", "dDumb", "north", "any", "studio", "south"],
        ["studio", "dDumb", "south", "any", "print", "north"],
        ["studio", "dLadder", "north", "any", "hall", "south"],
        ["hall", "dLadder", "south", "any", "studio", "north"],
        ["hall", "dBell", "north", "any", "shop", "south"],
        ["shop", "dBell", "south", "any", "hall", "north"],
        ["shop", "dRun", "north", "any", "mailroom", "south"],
        ["mailroom", "dRun", "south", "any", "shop", "north"],
        ["mailroom", "dChute", "north", "any", "records", "south"],
        ["records", "dChute", "south", "any", "mailroom", "north"],
        ["records", "dDesk", "north", "any", "office", "south"],
        ["office", "dDesk", "south", "any", "records", "north"],
        ["office", "dRegister", "north", "any", "cold", "south"],
        ["cold", "dRegister", "south", "any", "office", "north"],
        ["cold", "dFlue", "north", "any", "lift", "north"],
        ["lift", "dFlue", "south", "any", "cold", "south"],
        ["records", "dCross", "east", "south", "lift", "west"],
        ["lift", "dCross", "west", "any", "records", "east"],
        ["records", "dCross", "east", "north", "attic", "west"],
        ["attic", "dCross", "west", "any", "records", "east"]
      ],
      parcels: [
        ["p1", "attic", "cold", { en: "A hatbox of screws", zh: "一盒螺丝钉" }],
        ["p2", "lift", "shop", { en: "A string of sausages", zh: "一串香肠" }],
        ["p3", "print", "records", { en: "A packet of needles", zh: "一包缝衣针" }]
      ]
    },
    {
      id: "m17",
      name: { en: "Ten Doors, One True Way", zh: "十道门一条活路" },
      brief: { en: "A ring of ten rooms with only one way back round it: the cellar door into the lobby gives nothing unless you came down into cellar from the corridor. Both crossings answer the side you carry in, and neither of them answers the side they drop you on.", zh: "十间房一圈，回路只有一条：地下室的门不回大厅，除非你是从后走廊下到地下室的。两道交叉门都只认你带进去的那一边，而且都不认它们自己把你放下来的那一边。" },
      hint: { en: "Two steps back can be one step forward.", zh: "退两步有时等于进一步。" },
      rooms: ["hall", "shop", "print", "studio", "attic", "records", "office", "dark", "corridor", "cellar"], start: "hall", at: "south", budget: 21, order: [["p1", "p3"]],
      doors: [
        ["hall", "dBell", "north", "any", "shop", "south"],
        ["shop", "dBell", "south", "any", "hall", "north"],
        ["shop", "dRun", "north", "any", "print", "south"],
        ["print", "dRun", "south", "any", "shop", "north"],
        ["print", "dDumb", "north", "any", "studio", "south"],
        ["studio", "dDumb", "south", "any", "print", "north"],
        ["studio", "dLadder", "north", "any", "attic", "south"],
        ["attic", "dLadder", "south", "any", "studio", "north"],
        ["studio", "dStep", "east", "any", "records", "west"],
        ["records", "dStep", "west", "any", "studio", "east"],
        ["records", "dDesk", "north", "any", "office", "south"],
        ["office", "dDesk", "south", "any", "records", "north"],
        ["records", "dCross", "east", "west", "corridor", "west"],
        ["corridor", "dCross", "west", "any", "records", "east"],
        ["records", "dCross", "east", "north", "attic", "west"],
        ["attic", "dCross", "west", "any", "records", "east"],
        ["office", "dFlue", "east", "any", "dark", "west"],
        ["dark", "dFlue", "west", "any", "office", "east"],
        ["office", "dDark", "north", "east", "print", "west"],
        ["print", "dDark", "west", "any", "office", "north"],
        ["office", "dDark", "north", "south", "cellar", "south"],
        ["cellar", "dDark", "south", "any", "office", "north"],
        ["dark", "dStair", "south", "any", "corridor", "north"],
        ["corridor", "dStair", "north", "any", "dark", "south"],
        ["corridor", "dHatch", "east", "any", "cellar", "north"],
        ["cellar", "dHatch", "north", "any", "corridor", "east"],
        ["cellar", "dTruck", "east", "north", "hall", "west"],
        ["hall", "dTruck", "west", "any", "cellar", "east"]
      ],
      parcels: [
        ["p1", "shop", "corridor", { en: "A coil of clothesline", zh: "一捆晾衣绳" }],
        ["p2", "dark", "print", { en: "A tray of wet prints", zh: "一盘湿照片" }],
        ["p3", "attic", "cellar", { en: "A roll of wallpaper", zh: "一卷墙纸" }]
      ]
    },
    {
      id: "m18",
      name: { en: "The Loading Bay Chain", zh: "月台那条链" },
      brief: { en: "Sign for the office before the cellar and the cellar before the records. The records crossing gives the attic to whoever came in from the mailroom and the cold room to whoever came in from the office, and three of this building's shortcuts only answer from one side.", zh: "先签收办公室，再地下室，再档案室。档案室那道交叉门：从收发室进来的给你顶层阁楼，从办公室进来的给你冷藏间；这栋楼还有三条近路，都只从一个边应答。" },
      hint: { en: "Read the order before the map.", zh: "先看运单顺序，再看图。" },
      rooms: ["bay", "shop", "hall", "print", "studio", "attic", "mailroom", "records", "office", "cold", "cellar", "corridor"], start: "bay", at: "south", budget: 22, order: [["p1", "p2"], ["p2", "p3"]],
      doors: [
        ["bay", "dFreight", "north", "any", "shop", "south"],
        ["shop", "dFreight", "south", "any", "bay", "north"],
        ["shop", "dBell", "north", "any", "hall", "south"],
        ["hall", "dBell", "south", "any", "shop", "north"],
        ["hall", "dRun", "north", "any", "print", "south"],
        ["print", "dRun", "south", "any", "hall", "north"],
        ["print", "dDumb", "north", "any", "studio", "south"],
        ["studio", "dDumb", "south", "any", "print", "north"],
        ["studio", "dLadder", "north", "any", "attic", "south"],
        ["attic", "dLadder", "south", "any", "studio", "north"],
        ["attic", "dChute", "east", "any", "mailroom", "west"],
        ["mailroom", "dChute", "west", "any", "attic", "east"],
        ["mailroom", "dDesk", "north", "any", "records", "south"],
        ["records", "dDesk", "south", "any", "mailroom", "north"],
        ["records", "dPipe", "north", "any", "office", "south"],
        ["office", "dPipe", "south", "any", "records", "north"],
        ["office", "dRegister", "north", "any", "cold", "south"],
        ["cold", "dRegister", "south", "any", "office", "north"],
        ["cold", "dFlue", "north", "any", "cellar", "south"],
        ["cellar", "dFlue", "south", "any", "cold", "north"],
        ["cellar", "dHatch", "north", "any", "corridor", "south"],
        ["corridor", "dHatch", "south", "any", "cellar", "north"],
        ["corridor", "dTruck", "east", "south", "shop", "west"],
        ["shop", "dTruck", "west", "any", "corridor", "east"],
        ["print", "dDark", "east", "south", "bay", "west"],
        ["bay", "dDark", "west", "any", "print", "east"],
        ["studio", "dStair", "east", "north", "cellar", "west"],
        ["cellar", "dStair", "west", "any", "studio", "east"],
        ["records", "dCross", "east", "south", "attic", "west"],
        ["attic", "dCross", "west", "any", "records", "east"],
        ["records", "dCross", "east", "north", "cold", "west"],
        ["cold", "dCross", "west", "any", "records", "east"],
        ["office", "dBack", "west", "south", "print", "west"],
        ["print", "dBack", "west", "any", "office", "west"]
      ],
      parcels: [
        ["p1", "bay", "office", { en: "A crate of motor oil", zh: "一箱机油" }],
        ["p2", "attic", "cellar", { en: "A bundle of garden hose", zh: "一捆浇花水管" }],
        ["p3", "studio", "records", { en: "A tin of picture hooks", zh: "一盒画钩" }]
      ]
    },
    {
      id: "m19",
      name: { en: "The Door That Keeps Score", zh: "会记账的那扇门" },
      brief: { en: "The east doorway in the lobby reads the side you carried in: coming from the bay it shows the cellar, coming from the mailroom it shows the office, and once you have used it at all it shows the lift. Nobody is going to explain it.", zh: "大厅东边那道门口认你带进来的那一边：从月台来它给你地下室，从收发室来它给你办公室，只要你用过它一次，它就给你电梯厅。没人打算解释。" },
      hint: { en: "The third answer needs the side the door itself gives you.", zh: "第三个答案要用那道门自己给你的那一边。" },
      rooms: ["bay", "hall", "mailroom", "records", "office", "cold", "cellar", "corridor", "attic", "lift"], start: "bay", at: "south", budget: 22, order: [],
      doors: [
        ["bay", "dRamp", "north", "any", "hall", "south"],
        ["hall", "dRamp", "south", "any", "bay", "north"],
        ["hall", "dLift", "north", "any", "mailroom", "south"],
        ["mailroom", "dLift", "south", "any", "hall", "north"],
        ["mailroom", "dChute", "north", "any", "records", "south"],
        ["records", "dChute", "south", "any", "mailroom", "north"],
        ["records", "dDesk", "north", "any", "office", "south"],
        ["office", "dDesk", "south", "any", "records", "north"],
        ["office", "dRegister", "north", "any", "cold", "south"],
        ["cold", "dRegister", "south", "any", "office", "north"],
        ["cold", "dFlue", "north", "any", "cellar", "south"],
        ["cellar", "dFlue", "south", "any", "cold", "north"],
        ["cellar", "dHatch", "north", "any", "corridor", "south"],
        ["corridor", "dHatch", "south", "any", "cellar", "north"],
        ["corridor", "dStair", "north", "any", "attic", "south"],
        ["attic", "dStair", "south", "any", "corridor", "north"],
        ["attic", "dBalcony", "north", "any", "lift", "south"],
        ["lift", "dBalcony", "south", "any", "attic", "north"],
        ["lift", "dFreight", "east", "any", "bay", "west"],
        ["bay", "dFreight", "west", "north", "lift", "east"],
        ["records", "dPipe", "east", "south", "cellar", "west"],
        ["cellar", "dPipe", "west", "any", "records", "east"],
        ["office", "dDark", "west", "north", "attic", "west"],
        ["attic", "dDark", "west", "any", "office", "west"],
        ["hall", "dCross", "east", "south", "cellar", "east"],
        ["cellar", "dCross", "east", "any", "hall", "east"],
        ["hall", "dCross", "east", "north", "office", "east"],
        ["office", "dCross", "east", "any", "hall", "east"],
        ["hall", "dCross", "east", "east", "lift", "north"],
        ["lift", "dCross", "north", "any", "hall", "east"]
      ],
      parcels: [
        ["p1", "bay", "attic", { en: "A hamper of windfalls", zh: "一篮落地果" }],
        ["p2", "lift", "records", { en: "A sealed tea chest", zh: "封口的茶叶箱" }],
        ["p3", "mailroom", "cold", { en: "A crate of linens", zh: "一箱布单" }]
      ]
    },
    {
      id: "m20",
      name: { en: "The Longest Round", zh: "最长的一趟" },
      brief: { en: "Twelve rooms, two crossings, a manifest with a chain on it, and both landings on the lift rung turned the wrong way. Before the shutters come down for good.", zh: "十二间房、两道交叉门、运单上挂着一条链，电梯那一横的两个落点还都拧反了。这是卷帘门落下前的最后一趟。" },
      hint: { en: "Plan the whole round before you knock once.", zh: "敲第一下之前，先把整趟排好。" },
      rooms: ["shop", "hall", "print", "studio", "attic", "mailroom", "records", "office", "cold", "cellar", "corridor", "lift"], start: "shop", at: "south", budget: 23, order: [["p1", "p2"], ["p2", "p3"]],
      doors: [
        ["shop", "dBell", "north", "any", "hall", "south"],
        ["hall", "dBell", "south", "any", "shop", "north"],
        ["hall", "dRun", "north", "any", "print", "south"],
        ["print", "dRun", "south", "any", "hall", "north"],
        ["print", "dDumb", "north", "any", "studio", "south"],
        ["studio", "dDumb", "south", "any", "print", "north"],
        ["studio", "dLadder", "north", "any", "attic", "south"],
        ["attic", "dLadder", "south", "any", "studio", "north"],
        ["attic", "dChute", "east", "any", "mailroom", "west"],
        ["mailroom", "dChute", "west", "any", "attic", "east"],
        ["mailroom", "dDesk", "north", "any", "records", "south"],
        ["records", "dDesk", "south", "any", "mailroom", "north"],
        ["records", "dPipe", "north", "any", "office", "south"],
        ["office", "dPipe", "south", "any", "records", "north"],
        ["office", "dRegister", "north", "any", "cold", "south"],
        ["cold", "dRegister", "south", "any", "office", "north"],
        ["cold", "dFlue", "north", "any", "cellar", "south"],
        ["cellar", "dFlue", "south", "any", "cold", "north"],
        ["cellar", "dHatch", "north", "any", "corridor", "south"],
        ["corridor", "dHatch", "south", "any", "cellar", "north"],
        ["corridor", "dStair", "east", "any", "lift", "west"],
        ["lift", "dStair", "west", "any", "corridor", "east"],
        ["shop", "dFreight", "south", "any", "corridor", "north"],
        ["corridor", "dFreight", "north", "any", "shop", "south"],
        ["print", "dCross", "east", "south", "records", "west"],
        ["records", "dCross", "west", "any", "print", "east"],
        ["hall", "dBalcony", "east", "north", "lift", "east"],
        ["lift", "dBalcony", "south", "any", "hall", "west"],
        ["records", "dDark", "east", "south", "cellar", "east"],
        ["cellar", "dDark", "east", "any", "records", "east"],
        ["records", "dDark", "east", "north", "lift", "north"],
        ["lift", "dDark", "north", "any", "records", "east"],
        ["studio", "dStep", "west", "south", "cold", "west"],
        ["cold", "dStep", "west", "any", "studio", "west"],
        ["studio", "dStep", "west", "north", "corridor", "west"],
        ["corridor", "dStep", "west", "any", "studio", "west"]
      ],
      parcels: [
        ["p1", "shop", "lift", { en: "A scaffold plank", zh: "一块脚手板" }],
        ["p2", "lift", "print", { en: "A drum of render", zh: "一桶灰泥" }],
        ["p3", "records", "attic", { en: "A bundle of sketching pencils", zh: "一捆绘图铅笔" }]
      ]
    }
  ];

  function pdxCompile(raw) {
    var map = {
      id: raw.id,
      name: raw.name,
      brief: raw.brief,
      hint: raw.hint,
      start: raw.start,
      startSide: raw.at,
      budget: raw.budget,
      order: raw.order,
      rooms: [],
      parcels: []
    };
    var i, j, k;
    for (i = 0; i < raw.rooms.length; i += 1) {
      var text = pdxPlaces[raw.rooms[i]] || pdxPlaces.hall;
      map.rooms.push({ id: raw.rooms[i], name: text.name, copy: text.copy, doors: [] });
    }
    for (j = 0; j < raw.doors.length; j += 1) {
      var row = raw.doors[j];
      var room = pdxRoom(map, row[0]);
      if (room) {
        room.doors.push({ id: row[1], wall: row[2], from: row[3], to: row[4], at: row[5] });
      }
    }
    for (k = 0; k < raw.parcels.length; k += 1) {
      var p = raw.parcels[k];
      map.parcels.push({ id: p[0], from: p[1], to: p[2], label: p[3] });
    }
    return map;
  }

  var pdxMaps = [];
  for (var pdxM = 0; pdxM < pdxRawMaps.length; pdxM += 1) { pdxMaps.push(pdxCompile(pdxRawMaps[pdxM])); }

  function pdxMapById(id) {
    for (var i = 0; i < pdxMaps.length; i += 1) {
      if (pdxMaps[i].id === id) { return pdxMaps[i]; }
    }
    return pdxMaps[0];
  }

  /* The measured par of one map: the shortest plan this file's own search can
   * prove for it, asked for once and then kept. Nothing here is typed in. An
   * unbuilt or unsolvable map falls back to its own budget, never to a number
   * written by hand. */
  var pdxPar = {};

  function pdxParOf(map) {
    if (!map) { return 0; }
    if (pdxPar[map.id] === undefined) {
      var shortest = pdxShortestPlan(map);
      pdxPar[map.id] = shortest ? shortest.steps : (map.budget || pdxStepCap);
    }
    return pdxPar[map.id];
  }

  /* Bands are measured off that par: three stars is the proved shortest run,
   * two stars gives it two more steps, one star spends the whole budget. The
   * budget doubles as the step line, so a map whose budget fell under the par
   * lifts its own ceiling instead of leaving the bottom band unreachable. */
  function pdxBandsFor(id) {
    var map = pdxMapById(id);
    var low = pdxParOf(map);
    var mid = low + 2;
    var top = map.budget || pdxStepCap;
    if (top < mid) { top = mid; }
    return [low, mid, top];
  }

  /* ------------------------------------------------------------------
   * The run: parcels carried, steps spent, and the edges the courier has
   * personally proved. Undo is a stack of snapshots, never a restart.
   * ------------------------------------------------------------------ */

  var pdxMap = null;
  var pdxLevel = null;
  var pdxCampaign = null;
  var pdxBest = 0;

  function pdxZh() {
    return App.currentLang === "zh";
  }

  function pdxText(pair) {
    if (!pair) { return ""; }
    return String(pdxZh() ? pair.zh : pair.en);
  }

  function pdxSideWord(side) {
    if (side === "east") { return t("pdxEast"); }
    if (side === "south") { return t("pdxSouth"); }
    if (side === "west") { return t("pdxWest"); }
    return t("pdxNorth");
  }

  function pdxWhere(id) {
    var room = pdxRoom(pdxMap, id);
    return room ? pdxText(room.name) : "?";
  }

  function pdxParcelText(id) {
    for (var i = 0; i < pdxMap.parcels.length; i += 1) {
      if (pdxMap.parcels[i].id === id) { return pdxText(pdxMap.parcels[i].label); }
    }
    return "";
  }

  function pdxDelivered(level) {
    var n = 0;
    for (var i = 0; i < pdxMap.parcels.length; i += 1) {
      if (level.done[pdxMap.parcels[i].id] === true) { n += 1; }
    }
    return n;
  }

  function pdxPush(level, line) {
    if (!line) { return; }
    level.log.push(line);
    while (level.log.length > 12) {
      level.log.shift();
    }
  }

  function createParadoxLevel(id, best) {
    pdxMap = pdxMapById(id);
    pdxBest = best || 0;
    pdxLevel = {
      mapId: pdxMap.id,
      steps: 0,
      maxSteps: pdxBandsFor(pdxMap.id)[2],
      undoLeft: pdxUndoGrant,
      room: pdxMap.start,
      side: pdxStartSide(pdxMap),
      carrying: [],
      done: {},
      history: [],
      verified: [],
      log: [],
      route: [],
      over: false,
      doneAll: false
    };
    pdxSweep(pdxLevel, true);
    pdxPush(pdxLevel, t("pdxArrived", { r: pdxWhere(pdxLevel.room), s: pdxSideWord(pdxLevel.side) }));
    return pdxLevel;
  }

  /* Pick up whatever waits in this room, hand over whatever is due. */
  function pdxSweep(level, atStart) {
    var i, p;
    for (i = 0; i < pdxMap.parcels.length; i += 1) {
      p = pdxMap.parcels[i];
      if (p.from === level.room && level.carrying.indexOf(p.id) < 0 && level.done[p.id] !== true) {
        level.carrying.push(p.id);
        pdxPush(level, t("pdxPicked", { p: pdxText(p.label) }));
      }
    }
    for (i = 0; i < pdxMap.parcels.length; i += 1) {
      p = pdxMap.parcels[i];
      if (p.to !== level.room || level.carrying.indexOf(p.id) < 0) { continue; }
      if (pdxOrderOk(pdxMap, level.done, p)) {
        level.done[p.id] = true;
        level.carrying.splice(level.carrying.indexOf(p.id), 1);
        pdxPush(level, t("pdxLeft", { p: pdxText(p.label), r: pdxWhere(p.to) }));
      } else if (!atStart) {
        pdxPush(level, t("pdxTooEarly", { p: pdxText(p.label) }));
      }
    }
    level.doneAll = pdxDelivered(level) === pdxMap.parcels.length;
  }

  function pdxSnapshot(level) {
    var done = [];
    for (var i = 0; i < pdxMap.parcels.length; i += 1) {
      if (level.done[pdxMap.parcels[i].id] === true) { done.push(pdxMap.parcels[i].id); }
    }
    return {
      room: level.room,
      side: level.side,
      steps: level.steps,
      carrying: level.carrying.slice(0),
      done: done,
      verified: level.verified.length,
      log: level.log.length,
      route: level.route.length
    };
  }

  function pdxRestore(level, snap) {
    var i;
    level.room = snap.room;
    level.side = snap.side;
    level.steps = snap.steps;
    level.carrying = snap.carrying.slice(0);
    level.done = {};
    for (i = 0; i < snap.done.length; i += 1) { level.done[snap.done[i]] = true; }
    level.verified.length = snap.verified;
    level.log.length = snap.log;
    level.route.length = snap.route;
    level.doneAll = pdxDelivered(level) === pdxMap.parcels.length;
  }

  /* One knock. The doorway is only worth the side you came in on, and a
   * wrong side costs a step instead of ending the run. */
  function interactParadoxDoor(index) {
    var level = pdxLevel;
    if (!level || level.over) { return; }
    if (level.steps >= level.maxSteps) { return; }
    var openings = pdxOpenings(pdxMap, level.room);
    var choice = openings[index];
    if (!choice) { return; }
    var snap = pdxSnapshot(level);
    var move = paradoxEnter(pdxMap, level.room, level.side, choice.id);
    if (move.cost === 0) { return; }
    level.history.push(snap);
    level.route.push(choice.id);
    level.steps += 1;
    if (!move.moved) {
      pdxPush(level, t("pdxStuck", { d: pdxDoorName(choice) }));
      renderParadoxAll();
      pdxFinishIfSpent();
      return;
    }
    level.verified.push({
      from: level.room,
      side: level.side,
      to: move.room,
      exit: move.side,
      door: choice.id
    });
    level.room = move.room;
    level.side = move.side;
    pdxPush(level, t("pdxArrived", { r: pdxWhere(move.room), s: pdxSideWord(move.side) }));
    pdxSweep(level, false);
    renderParadoxAll();
    if (level.doneAll) {
      winParadoxRun();
      return;
    }
    pdxFinishIfSpent();
  }

  function pdxDoorName(opening) {
    return t("pdxDoorLabel", { w: pdxSideWord(opening.wall) });
  }

  function interactParadoxUndo() {
    var level = pdxLevel;
    if (!level || level.doneAll || level.history.length === 0 || level.undoLeft <= 0) { return; }
    pdxRestore(level, level.history.pop());
    level.undoLeft -= 1;
    if (level.over) {
      level.over = false;
      pdxSayResult("", false);
    }
    pdxPush(level, t("pdxUndid"));
    renderParadoxAll();
  }

  /* ------------------------------------------------------------------
   * Rendering. Every node is made with createElement and every line of
   * prose is a string handed to textContent.
   * ------------------------------------------------------------------ */

  var pdxPanel = null;
  var pdxMapEl = null;
  var pdxNoteEl = null;
  var pdxLogEl = null;
  var pdxResultEl = null;
  var pdxSelectEl = null;
  var pdxBestEl = null;
  var pdxHintEl = null;
  var pdxStatEl = {};
  var pdxDoorEls = [];

  /* One node per call: tag, class, text, parent. */
  function pdxNode(tag, className, text, parent) {
    var el = document.createElement(tag);
    if (className) { el.className = className; }
    el.textContent = text === undefined || text === null ? "" : String(text);
    if (parent) { parent.appendChild(el); }
    return el;
  }

  function pdxSet(key, value) {
    if (pdxStatEl[key]) { pdxStatEl[key].textContent = String(value); }
  }

  function renderParadoxHud() {
    var level = pdxLevel;
    if (!level) { return; }
    pdxSet("steps", t("pdxStepsOf", { n: level.steps, m: level.maxSteps }));
    pdxSet("done", t("pdxDoneOf", { n: pdxDelivered(level), m: pdxMap.parcels.length }));
    pdxSet("carry", level.carrying.length);
    pdxSet("undo", level.undoLeft);
  }

  function renderParadoxStage() {
    if (!pdxMapEl) { return; }
    var level = pdxLevel;
    var room = pdxRoom(pdxMap, level.room);
    pdxMapEl.textContent = "";
    var card = pdxNode("div", "pdx-room", "", pdxMapEl);
    pdxNode("div", "pdx-room-name", pdxWhere(level.room), card);
    pdxNode("p", "pdx-room-copy", room ? pdxText(room.copy) : "", card);
    pdxNode("p", "pdx-room-side", t("pdxStanding", { s: pdxSideWord(level.side) }), card);
    pdxNode("p", "pdx-brief", pdxText(pdxMap.brief), pdxMapEl);

    var jobs = pdxNode("div", "pdx-jobs", "", pdxMapEl);
    pdxNode("div", "pdx-head", t("pdxManifestTitle"), jobs);
    for (var i = 0; i < pdxMap.parcels.length; i += 1) {
      var p = pdxMap.parcels[i];
      pdxNode("p", "pdx-job", t("pdxJobLine", {
        p: pdxText(p.label), f: pdxWhere(p.from), r: pdxWhere(p.to), s: pdxJobState(p)
      }), jobs);
    }
    if (pdxMap.order.length > 0) {
      pdxNode("p", "pdx-job pdx-job-order", t("pdxOrderLine", { o: pdxOrderText() }), jobs);
    }

    var doors = pdxNode("div", "pdx-doors", "", pdxMapEl);
    pdxNode("div", "pdx-head", t("pdxDoorsTitle"), doors);
    pdxDoorEls = [];
    var openings = pdxOpenings(pdxMap, level.room);
    for (var j = 0; j < openings.length; j += 1) { doors.appendChild(pdxDoorButton(openings[j], j)); }
  }

  function pdxJobState(p) {
    if (pdxLevel.done[p.id] === true) { return t("pdxStateDone"); }
    if (pdxLevel.carrying.indexOf(p.id) >= 0) { return t("pdxStateCarried"); }
    return t("pdxStateWaiting");
  }

  function pdxOrderText() {
    var parts = [];
    for (var i = 0; i < pdxMap.order.length; i += 1) { parts.push(pdxParcelText(pdxMap.order[i][0]) + " \u2192 " + pdxParcelText(pdxMap.order[i][1])); }
    return parts.join(pdxZh() ? String.fromCharCode(0xFF0C) : ", ");
  }

  function pdxDoorButton(opening, index) {
    var btn = pdxNode("button", "pdx-door-btn", index + 1 + ". " + pdxDoorName(opening) + " - " + pdxDoorKnown(opening.id));
    btn.type = "button";
    btn.title = t("pdxDoorTip");
    btn.addEventListener("click", function () { interactParadoxDoor(index); });
    pdxDoorEls.push(btn);
    return btn;
  }

  /* Where this doorway already proved it goes from the side you stand on. */
  function pdxDoorKnown(doorId) {
    var rows = paradoxNotebook(pdxLevel);
    for (var i = 0; i < rows.length; i += 1) {
      if (rows[i].door === doorId && rows[i].from === pdxLevel.room && rows[i].side === pdxLevel.side) { return pdxWhere(rows[i].to); }
    }
    return t("pdxUntried");
  }

  function renderParadoxNotebook() {
    if (!pdxNoteEl) { return; }
    var level = pdxLevel;
    var rows = paradoxNotebook(level);
    pdxNoteEl.textContent = "";
    pdxNode("div", "pdx-head", t("pdxNoteTitle"), pdxNoteEl);
    if (rows.length === 0) { pdxNode("p", "pdx-note-empty", t("pdxNoteEmpty"), pdxNoteEl); }
    for (var i = 0; i < rows.length; i += 1) {
      pdxNode("p", "pdx-note-line", t("pdxNoteLine", {
        f: pdxWhere(rows[i].from), s: pdxSideWord(rows[i].side), r: pdxWhere(rows[i].to), e: pdxSideWord(rows[i].exit)
      }), pdxNoteEl);
    }
    for (var j = 0; j < level.carrying.length; j += 1) {
      pdxNode("p", "pdx-note-line pdx-note-carry", t("pdxCarryingLine", { p: pdxParcelText(level.carrying[j]) }), pdxNoteEl);
    }
    var index = pdxNode("div", "pdx-index", "", pdxNoteEl);
    pdxNode("div", "pdx-head", t("pdxIndexTitle"), index);
    for (var k = 0; k < pdxMap.rooms.length; k += 1) {
      var seen = pdxSeenFrom(pdxMap.rooms[k].id);
      pdxNode("p", "pdx-index-line", pdxText(pdxMap.rooms[k].name) + " - " + (seen === 0 ? t("pdxNotWalked") : t("pdxEdgesSeen", { n: seen })), index);
    }
  }

  function pdxSeenFrom(roomId) {
    var rows = paradoxNotebook(pdxLevel);
    var n = 0;
    for (var i = 0; i < rows.length; i += 1) {
      if (rows[i].from === roomId) { n += 1; }
    }
    return n;
  }

  function renderParadoxLog() {
    if (!pdxLogEl) { return; }
    var level = pdxLevel;
    pdxLogEl.textContent = "";
    for (var i = level.log.length - 1; i >= 0; i -= 1) { pdxNode("p", "pdx-log-line", level.log[i], pdxLogEl); }
  }

  function renderParadoxBest() {
    if (!pdxBestEl) { return; }
    pdxBestEl.textContent = pdxBest === 0 ? t("noBest") : t("pdxBestLine", { n: pdxBest, l: pdxBandsFor(pdxLevel.mapId)[0] });
  }

  function renderParadoxAll() {
    if (!pdxLevel) { return; }
    renderParadoxHud();
    renderParadoxStage();
    renderParadoxNotebook();
    renderParadoxLog();
    renderParadoxBest();
    if (pdxHintEl) { pdxHintEl.textContent = pdxText(pdxMap.hint); }
  }

  /* ------------------------------------------------------------------
   * Endings, picker and loading.
   * ------------------------------------------------------------------ */

  function winParadoxRun() {
    var level = pdxLevel;
    level.over = true;
    var bands = pdxBandsFor(level.mapId);
    var stars = starsFor(level.steps, bands, "low");
    var outcome = pdxCampaign.record(level.mapId, { stars: stars, best: level.steps, better: "low" });
    pdxBest = pdxCampaign.best(level.mapId);
    var message = t("pdxFiled", { n: level.steps, s: stars, l: bands[0] });
    if (outcome.isBest) { message += " " + t("newBest"); }
    if (outcome.unlockedNext) { message += " " + t("pdxUnlocked"); } else if (pdxCampaign.clearedCount() === pdxLevels().length) { message += " " + t("pdxAllDone"); }
    pdxSayResult(message, false);
    logAction(t("logPdxMap", { n: level.mapId, s: level.steps }));
    var rect = pdxPanel.getBoundingClientRect();
    createConfetti(rect.left + rect.width / 2, rect.top + 140);
    petNotifyGame(outcome.isBest || outcome.firstClear);
    renderParadoxHud();
    renderParadoxBest();
    refreshParadoxPicker();
  }

  /* The step budget is the only failure line: a wrong side of a door
   * costs a step, it never restarts the map. */
  function pdxFinishIfSpent() {
    var level = pdxLevel;
    if (level.over || level.doneAll || level.steps < level.maxSteps) { return; }
    level.over = true;
    pdxSayResult(t("pdxSpent", { m: level.maxSteps, l: pdxBandsFor(level.mapId)[0] }), true);
    logAction(t("logPdxSpent", { n: level.mapId }));
    refreshParadoxPicker();
  }

  function pdxSayResult(message, lost) {
    if (!pdxResultEl) { return; }
    pdxResultEl.className = lost ? "game-result pdx-lost" : "game-result";
    pdxResultEl.textContent = message;
  }

  /* Only a map the building can actually be walked is dealt. pdxCorePlan is
   * the cheap half of that proof: it runs the manifest through the real
   * engine and returns no plan at all for a building that cannot be delivered.
   * The measured par against the budget - the half that costs a search - is
   * proved for every map in the file by the checks kept outside it. */
  function pdxLevels() {
    var list = [];
    for (var i = 0; i < pdxMaps.length; i += 1) {
      if (pdxCorePlan(pdxMaps[i])) {
        list.push({ id: pdxMaps[i].id, map: pdxMaps[i] });
      }
    }
    return list;
  }

  function refreshParadoxPicker() {
    if (!pdxSelectEl) { return; }
    fillCampaignPicker(
      pdxSelectEl,
      pdxCampaign,
      function (def) {
        return pdxText(def.map.name);
      },
      t("elementsLocked"),
    );
    pdxSelectEl.value = pdxLevel.mapId;
  }

  function loadParadoxMap(id) {
    var map = pdxMapById(id);
    pdxCampaign = pdxCampaign || createCampaign({ key: "paradox-post-campaign", levels: pdxLevels() });
    createParadoxLevel(map.id, pdxCampaign.best(map.id));
    pdxSayResult("", false);
    pdxResultEl.textContent = "";
    renderParadoxAll();
    refreshParadoxPicker();
  }

  /* ------------------------------------------------------------------
   * The panel.
   * ------------------------------------------------------------------ */

  function pdxStat(key, valueKey) {
    var stat = pdxNode("div", "game-stat");
    pdxNode("span", "", t(valueKey), stat).setAttribute("data-i18n", valueKey);
    pdxStatEl[key] = pdxNode("strong", "", "0", stat);
    return stat;
  }

  function pdxButton(className, textKey, handler) {
    var btn = pdxNode("button", className);
    btn.type = "button";
    pdxNode("span", "", t(textKey), pdxNode("span", "button-content", "", btn)).setAttribute("data-i18n", textKey);
    btn.addEventListener("click", handler);
    return btn;
  }

  function bindParadoxKeys(panelEl) {
    panelEl.addEventListener("keydown", function (ev) {
      if (!ev || ev.ctrlKey || ev.metaKey || ev.altKey) { return; }
      var code = ev.code || "";
      var key = String(ev.key || "");
      var digit = 0;
      if (code.indexOf("Digit") === 0) { digit = Number(code.replace("Digit", "")); } else if (key.length === 1 && key >= "1" && key <= "9") { digit = Number(key); }
      if (digit > 0) {
        if (digit <= pdxDoorEls.length && pdxDoorEls[digit - 1]) {
          if (typeof ev.preventDefault === "function") { ev.preventDefault(); }
          pdxDoorEls[digit - 1].click();
        }
        return;
      }
      if (key === "u" || key === "U" || code === "KeyU" || ev.keyCode === 117) {
        if (typeof ev.preventDefault === "function") { ev.preventDefault(); }
        interactParadoxUndo();
      }
    });
  }

  function initParadoxPostGame(panelEl) {
    if (!panelEl) { return; }
    pdxPanel = panelEl;
    pdxCampaign = createCampaign({ key: "paradox-post-campaign", levels: pdxLevels() });

    var hud = pdxNode("div", "game-hud", "", panelEl);
    hud.appendChild(pdxStat("steps", "pdxStepsLabel"));
    hud.appendChild(pdxStat("done", "pdxDoneLabel"));
    hud.appendChild(pdxStat("carry", "pdxCarryLabel"));
    hud.appendChild(pdxStat("undo", "pdxUndoLabel"));
    pdxMapEl = pdxNode("div", "pdx-map", "", panelEl);
    pdxNoteEl = pdxNode("div", "pdx-note", "", panelEl);
    pdxNoteEl.setAttribute("aria-label", t("pdxNoteTitle"));
    pdxLogEl = pdxNode("div", "pdx-log", "", panelEl);
    pdxLogEl.setAttribute("aria-live", "polite");
    pdxResultEl = pdxNode("p", "game-result", "", panelEl);
    pdxResultEl.setAttribute("role", "status");

    var pickRow = pdxNode("div", "elements-row", "", panelEl);
    var pickLabel = pdxNode("label", "elements-label", t("pdxMapSelectLabel"), pickRow);
    pickLabel.setAttribute("for", "pdxMapSel");
    pickLabel.setAttribute("data-i18n", "pdxMapSelectLabel");
    pdxSelectEl = pdxNode("select", "elements-select", "", pickRow);
    pdxSelectEl.id = "pdxMapSel";
    pdxSelectEl.setAttribute("aria-label", t("pdxMapSelectLabel"));

    var actions = pdxNode("div", "game-actions", "", panelEl);
    actions.appendChild(pdxButton("primary", "btnNewRound", function () {
      loadParadoxMap(pdxCampaign.nextLevelId());
    }));
    actions.appendChild(pdxButton("pdx-btn-undo", "pdxBtnUndo", function () {
      interactParadoxUndo();
    }));
    pdxBestEl = pdxNode("p", "game-best", "", actions);
    pdxHintEl = pdxNode("p", "game-hint", t("pdxHint"), panelEl);
    pdxHintEl.setAttribute("data-i18n", "pdxHint");

    pdxSelectEl.addEventListener("change", function () {
      var id = pdxSelectEl.value;
      if (pdxLevel && id === pdxLevel.mapId) { return; }
      loadParadoxMap(pdxCampaign.indexOf(id) >= 0 && pdxCampaign.isUnlocked(id) ? id : pdxLevel.mapId);
    });
    bindParadoxKeys(panelEl);
    loadParadoxMap(pdxCampaign.nextLevelId());

    App.quietResetParadoxPost = function () {
      if (!pdxLevel) { return; }
      pdxPush(pdxLevel, t("pdxPaused", { n: pdxLevel.steps }));
      renderParadoxLog();
    };
  }

  App.addStrings({
    en: {
      "tabParadoxPost": "Paradox Post",
      "pdxStepsLabel": "Steps",
      "pdxDoneLabel": "Delivered",
      "pdxCarryLabel": "Carrying",
      "pdxUndoLabel": "Steps back",
      "pdxMapSelectLabel": "Route map",
      "pdxBtnUndo": "Step back (U)",
      "pdxHint": "The notebook remembers every door.",
      "pdxManifestTitle": "Manifest",
      "pdxDoorsTitle": "Doorways here",
      "pdxNoteTitle": "Route notebook",
      "pdxIndexTitle": "The building",
      "pdxNoteEmpty": "Nothing proved yet. Knock a doorway.",
      "pdxOrderLine": "Order: {o}",
      "pdxJobLine": "{p}: {f} to {r} - {s}",
      "pdxStateWaiting": "waiting",
      "pdxStateCarried": "carried",
      "pdxStateDone": "done",
      "pdxDoorLabel": "{w} doorway",
      "pdxDoorTip": "Click it or press its number",
      "pdxUntried": "unmapped",
      "pdxNotWalked": "not walked",
      "pdxEdgesSeen": "{n} proved",
      "pdxNorth": "north",
      "pdxEast": "east",
      "pdxSouth": "south",
      "pdxWest": "west",
      "pdxStepsOf": "{n}/{m}",
      "pdxDoneOf": "{n}/{m}",
      "pdxStanding": "You stand on the {s}.",
      "pdxArrived": "You came in on the {s} of {r}.",
      "pdxPicked": "You lifted {p}.",
      "pdxLeft": "{p} left with {r}.",
      "pdxTooEarly": "{p} is not due yet.",
      "pdxStuck": "The {d} gives nothing from here.",
      "pdxUndid": "You stepped back one move.",
      "pdxNoteLine": "{f}, from the {s}: {r} ({e})",
      "pdxCarryingLine": "Carrying {p}",
      "pdxBestLine": "Best {n}, lowest {l}",
      "pdxFiled": "Delivered in {n} steps - {s} stars, lowest {l}.",
      "pdxSpent": "Out of steps at {m}; the lowest seen is {l}.",
      "pdxUnlocked": "This map is filed and the next is unlocked.",
      "pdxAllDone": "Every map on the round has been delivered.",
      "pdxPaused": "Paused at step {n}.",
      "logPdxMap": "Paradox Post map {n} delivered in {s} steps",
      "logPdxSpent": "Paradox Post map {n} ran out of steps",
    },
    zh: {
      "tabParadoxPost": "悖论邮局",
      "pdxStepsLabel": "步数",
      "pdxDoneLabel": "已送达",
      "pdxCarryLabel": "手上",
      "pdxUndoLabel": "可回头",
      "pdxMapSelectLabel": "路线图",
      "pdxBtnUndo": "退一步(U)",
      "pdxHint": "笔记替你记住每扇门。",
      "pdxManifestTitle": "运单",
      "pdxDoorsTitle": "这房的门口",
      "pdxNoteTitle": "路线笔记",
      "pdxIndexTitle": "这栋楼",
      "pdxNoteEmpty": "还没验证过任何门，先去敲一下。",
      "pdxOrderLine": "顺序：{o}",
      "pdxJobLine": "{p}：从{f}送到{r}——{s}",
      "pdxStateWaiting": "待取",
      "pdxStateCarried": "在手上",
      "pdxStateDone": "已送达",
      "pdxDoorLabel": "{w}的门口",
      "pdxDoorTip": "点它，或按它前面的数字键",
      "pdxUntried": "没摸清",
      "pdxNotWalked": "没走过",
      "pdxEdgesSeen": "已验证{n}条",
      "pdxNorth": "北边",
      "pdxEast": "东边",
      "pdxSouth": "南边",
      "pdxWest": "西边",
      "pdxStepsOf": "{n}/{m}",
      "pdxDoneOf": "{n}/{m}",
      "pdxStanding": "你站在{s}。",
      "pdxArrived": "你从{s}进了{r}。",
      "pdxPicked": "你抱起了{p}。",
      "pdxLeft": "把{p}交到{r}。",
      "pdxTooEarly": "{p}还不到交的时候。",
      "pdxStuck": "{d}在这一边什么也不给。",
      "pdxUndid": "你退回了一步。",
      "pdxNoteLine": "{f}·从{s}进：{r}（{e}）",
      "pdxCarryingLine": "手上：{p}",
      "pdxBestLine": "最佳{n}步，最短{l}步",
      "pdxFiled": "{n}步送完，得{s}星；最短是{l}步。",
      "pdxSpent": "在{m}步上用完了；最短是{l}步。",
      "pdxUnlocked": "这张图归档，下一张解锁了。",
      "pdxAllDone": "这一轮每张路线图都送完了。",
      "pdxPaused": "停在第{n}步。",
      "logPdxMap": "悖论邮局{n}用了{s}步送完",
      "logPdxSpent": "悖论邮局{n}步数用完",
    },
  });

  App.registerGame({
    name: "paradoxPost",
    tabKey: "tabParadoxPost",
    init: initParadoxPostGame,
    guide: {
      svg:
        '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="4" y="6" width="112" height="64" rx="5" fill="none" stroke="currentColor" stroke-width="1.6" opacity="0.5"/>' +
        '<rect x="12" y="14" width="34" height="22" rx="3" fill="none" stroke="currentColor" stroke-width="1.6" opacity="0.85"/>' +
        '<rect x="70" y="10" width="30" height="20" rx="3" fill="none" stroke="currentColor" stroke-width="1.4" opacity="0.6"/>' +
        '<rect x="66" y="44" width="36" height="22" rx="3" fill="none" stroke="currentColor" stroke-width="1.4" opacity="0.6"/>' +
        '<rect x="14" y="46" width="30" height="20" rx="3" fill="none" stroke="currentColor" stroke-width="1.4" opacity="0.6"/>' +
        '<path d="M46 24h24" fill="none" stroke="currentColor" stroke-width="1.8" opacity="0.9"/>' +
        '<path d="M64 21l5 3-5 3" fill="none" stroke="currentColor" stroke-width="1.8" opacity="0.9"/>' +
        '<path d="M46 28q26 10 26 26" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.7"/>' +
        '<path d="M68 52l5 3-1 6" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.7"/>' +
        '<path d="M44 56h22" fill="none" stroke="currentColor" stroke-width="1.4" stroke-dasharray="3 3" opacity="0.6"/>' +
        '<path d="M29 36v10" fill="none" stroke="currentColor" stroke-width="1.4" opacity="0.6"/>' +
        '<circle cx="48" cy="24" r="2.4" fill="currentColor" opacity="0.9"/>' +
        '<circle cx="48" cy="28" r="2.4" fill="currentColor" opacity="0.5"/>' +
        '<rect x="84" y="50" width="9" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.3" opacity="0.8"/>' +
        '<path d="M84 53h9" fill="none" stroke="currentColor" stroke-width="1.1" opacity="0.6"/>' +
        "</svg>",
      en: [
        "Deliver every parcel in a building where a doorway is worth the side you knock from.",
        "Click a doorway or press its number; each move costs one step of the map budget.",
        "The notebook writes down every connection you walked, with the side it was seen from.",
        "Some doors only open from one side and some put you on the far side of the room you left.",
        "A wrong side costs one step, never the run; Step back (U) undoes a move three times a map.",
        "All parcels delivered ends the map; stars come from steps and the low band is measured.",
      ],
      zh: [
        "在这栋楼里送一整轮包裹：一扇门值多少，取决于你敲的是哪一边。",
        "点门口，或按它前面的数字键；每走一步都花掉预算里的一步。",
        "笔记会写下你真走过的每条连接，以及它是从哪一边看到的。",
        "有些门只从一个边才开，有些会把你放到刚才那间房的对面一边。",
        "推错边只亏一步，不断送；退一步键每张图可以用三次。",
        "全部送到就算通关；星级看步数，最低那一档是算出来的。",
      ],
    },
  });

  /* Exported for the other modules and for the checks outside this file. */
  App.initParadoxPostGame = initParadoxPostGame;
  App.paradoxEnter = paradoxEnter;
  App.paradoxNotebook = paradoxNotebook;
  App.paradoxResolve = paradoxResolve;
  App.paradoxSolvable = paradoxSolvable;
  App.paradoxShortestPlan = pdxShortestPlan;
  App.paradoxMaps = pdxMaps;
  App.paradoxBands = pdxBandsFor;
})(window.CapitalConvert = window.CapitalConvert || {});

