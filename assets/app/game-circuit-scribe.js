/* Circuit Scribe - a gate-placement puzzle in the shared game drawer.
 * Each net is a hand-authored DAG with a target truth table, and the shipped
 * gate assignment is the one a brute-force pass proved cheapest, so every net
 * can be completed and the star line is honest. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  var t = App.t;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  var createCampaign = App.createCampaign;
  var fillCampaignPicker = App.fillCampaignPicker;
  var starsFor = App.starsFor;

  var cirTwo = ["and", "or", "xor"];
  var cirOne = ["not", "wire"];
  var cirAll = ["and", "or", "xor", "not", "wire"];

  /* `a`/`b` name inputs or earlier slots; a slot without `b` only takes the
   * one-legged parts. `truth` lists the wanted output for every input row,
   * counting A as the high bit. */
  var cirLevels = [
    {
      id: "k1",
      labelKey: "cirL1",
      inputs: ["A", "B"],
      truth: "0110",
      out: "s4",
      slots: [
        { id: "s1", a: "A", b: "B" },
        { id: "s2", a: "A", b: "B" },
        { id: "s3", a: "s1", b: "s2" },
        { id: "s4", a: "s3" },
        { id: "s5", a: "A" },
      ],
      gates: { s1: "xor", s3: "xor", s4: "wire" },
      par: 3,
    },
    {
      id: "k2",
      labelKey: "cirL2",
      inputs: ["A", "B", "C"],
      truth: "00010111",
      out: "s4",
      slots: [
        { id: "s1", a: "A", b: "B" },
        { id: "s2", a: "A", b: "B" },
        { id: "s3", a: "s2", b: "C" },
        { id: "s4", a: "s1", b: "s3" },
        { id: "s5", a: "s4", b: "A" },
        { id: "s6", a: "B", b: "C" },
      ],
      gates: { s1: "and", s2: "or", s3: "and", s4: "or" },
      par: 4,
    },
    {
      id: "k3",
      labelKey: "cirL3",
      inputs: ["A", "B", "C"],
      truth: "01101000",
      out: "s5",
      slots: [
        { id: "s1", a: "A", b: "B" },
        { id: "s2", a: "s1", b: "C" },
        { id: "s3", a: "A", b: "C" },
        { id: "s4", a: "s1", b: "s3" },
        { id: "s5", a: "s2", b: "s4" },
      ],
      gates: { s1: "xor", s2: "xor", s3: "xor", s4: "or", s5: "and" },
      par: 5,
    },
    {
      id: "k4",
      labelKey: "cirL4",
      inputs: ["A", "B", "C"],
      truth: "01100000",
      out: "s3",
      slots: [
        { id: "s1", a: "A" },
        { id: "s2", a: "B", b: "C" },
        { id: "s3", a: "s1", b: "s2" },
        { id: "s4", a: "s3" },
        { id: "s5", a: "A", b: "s2" },
        { id: "s6", a: "s4", b: "s5" },
      ],
      gates: { s1: "not", s2: "xor", s3: "and" },
      par: 3,
    },
    {
      id: "k5",
      labelKey: "cirL5",
      inputs: ["A", "B", "C"],
      truth: "00010110",
      out: "s6",
      slots: [
        { id: "s1", a: "A", b: "B" },
        { id: "s2", a: "s1", b: "C" },
        { id: "s3", a: "A", b: "C" },
        { id: "s4", a: "s1", b: "s3" },
        { id: "s5", a: "s2", b: "s4" },
        { id: "s6", a: "s5" },
      ],
      gates: { s1: "xor", s2: "xor", s3: "or", s4: "or", s5: "xor", s6: "wire" },
      par: 6,
    },
  ];

  function cirGate(gate, a, b) {
    if (gate === "and") {
      return a && b ? 1 : 0;
    }
    if (gate === "or") {
      return a || b ? 1 : 0;
    }
    if (gate === "xor") {
      return a !== b ? 1 : 0;
    }
    if (gate === "not") {
      return a ? 0 : 1;
    }
    if (gate === "wire") {
      return a ? 1 : 0;
    }
    /* An empty socket is dead wire, which is what makes a bypass cheap. */
    return 0;
  }

  function cirSlot(netlist, id) {
    var list = (netlist && netlist.slots) || [];
    for (var i = 0; i < list.length; i += 1) {
      if (list[i].id === id) {
        return list[i];
      }
    }
    return null;
  }

  function cirArity(slot) {
    return slot && slot.b ? 2 : 1;
  }

  function cirMenu(slot) {
    return cirArity(slot) === 2 ? cirTwo : cirOne;
  }

  /* Pure topological pass over the DAG: named inputs read the probe, a slot
   * reads its own gate, and a cycle just resolves low instead of recursing. */
  function cirSignals(netlist, inputs) {
    var memo = {};
    var visit = {};
    var probe = inputs || {};
    var list = (netlist && netlist.slots) || [];
    function value(ref) {
      if (ref === undefined || ref === null) {
        return 0;
      }
      if (memo[ref] !== undefined) {
        return memo[ref];
      }
      var slot = cirSlot(netlist, ref);
      if (!slot) {
        memo[ref] = probe[ref] ? 1 : 0;
        return memo[ref];
      }
      if (visit[ref]) {
        return 0;
      }
      visit[ref] = true;
      var a = value(slot.a);
      var b = value(slot.b);
      visit[ref] = false;
      memo[ref] = cirGate(slot.gate || "", a, b);
      return memo[ref];
    }
    for (var i = 0; i < list.length; i += 1) {
      value(list[i].id);
    }
    return memo;
  }

  /* Pure: the output bit for one set of input bits. */
  function cirEval(netlist, inputs) {
    if (!netlist || !netlist.out) {
      return 0;
    }
    var signals = cirSignals(netlist, inputs);
    var out = signals[netlist.out];
    return out === undefined ? 0 : out;
  }

  /* Pure: every row as { in, out, index } for a truth string. */
  function cirTable(level) {
    var rows = [];
    if (!level || !level.inputs || !level.inputs.length || !level.truth) {
      return rows;
    }
    var k = level.inputs.length;
    var total = 1 << k;
    for (var i = 0; i < total; i += 1) {
      var bits = {};
      for (var c = 0; c < k; c += 1) {
        var shift = k - 1 - c;
        bits[level.inputs[c]] = (i >> shift) & 1;
      }
      rows.push({ in: bits, out: parseInt(level.truth.charAt(i), 10) || 0, index: i });
    }
    return rows;
  }

  /* Pure: which required rows the current net already satisfies. */
  function cirRows(netlist, table) {
    var out = [];
    if (!table) {
      return out;
    }
    for (var i = 0; i < table.length; i += 1) {
      out.push(cirEval(netlist, table[i].in) === (table[i].out ? 1 : 0));
    }
    return out;
  }

  function cirWith(level, gates) {
    var slots = [];
    for (var i = 0; i < level.slots.length; i += 1) {
      var src = level.slots[i];
      slots.push({ id: src.id, a: src.a, b: src.b, gate: gates[src.id] || "" });
    }
    return { inputs: level.inputs, slots: slots, out: level.out };
  }

  function cirParts(gates) {
    var n = 0;
    for (var key in gates) {
      if (gates[key]) {
        n += 1;
      }
    }
    return n;
  }
  App.circuitEval = cirEval;
  App.circuitRows = cirRows;
  App.circuitTable = cirTable;
  App.circuitSignals = cirSignals;
  App.circuitArity = cirArity;
  App.circuitMenu = cirMenu;
  App.circuitLevels = cirLevels;
  App.circuitWith = cirWith;
  App.circuitParts = cirParts;
  App.circuitGate = cirGate;

  function initCircuitScribeGame(panelEl) {
    if (!panelEl) {
      return;
    }

    var campaign = createCampaign({ key: "circuit-scribe-campaign", levels: cirLevels });
    var open = campaign.indexOf(campaign.nextLevelId());
    var level = cirLevels[open < 0 ? 0 : open];
    var table = cirTable(level);
    var gates = {};
    var netlist = cirWith(level, gates);
    var probe = {};
    var picked = level.slots[0].id;
    var solved = false;
    var slotEls = {};
    var pinEls = {};
    var liveEls = {};
    var rowEls = [];

    var hud = document.createElement("div");
    hud.className = "game-hud";
    var partsEl = document.createElement("strong");
    var rowsEl = document.createElement("strong");
    hud.appendChild(makeStat("cirPartsLabel", partsEl));
    hud.appendChild(makeStat("cirRowsLabel", rowsEl));

    var board = document.createElement("div");
    board.className = "cir-board";
    board.setAttribute("tabindex", "0");
    board.setAttribute("role", "application");
    board.setAttribute("aria-label", t("cirFieldLabel"));

    var rail = document.createElement("div");
    rail.className = "cir-rail";
    var railLabel = document.createElement("span");
    railLabel.className = "cir-rail-label";
    railLabel.setAttribute("data-i18n", "cirRailLabel");
    railLabel.textContent = t("cirRailLabel");
    rail.appendChild(railLabel);

    var palette = document.createElement("div");
    palette.className = "cir-palette";
    palette.setAttribute("aria-label", t("cirPaletteLabel"));
    palette.setAttribute("role", "group");

    var outRow = document.createElement("div");
    outRow.className = "cir-out";
    var outLabel = document.createElement("span");
    outLabel.className = "cir-out-label";
    outLabel.setAttribute("data-i18n", "cirOutLabel");
    outLabel.textContent = t("cirOutLabel");
    var outValue = document.createElement("strong");
    outValue.className = "cir-out-value";
    outRow.appendChild(outLabel);
    outRow.appendChild(outValue);

    var tableBox = document.createElement("div");
    tableBox.className = "cir-table";
    tableBox.setAttribute("role", "table");
    tableBox.setAttribute("aria-label", t("cirTableLabel"));

    var result = document.createElement("p");
    result.className = "game-result";
    result.setAttribute("role", "status");

    var netRow = document.createElement("div");
    netRow.className = "elements-row";
    var netLabel = document.createElement("label");
    netLabel.className = "elements-label";
    netLabel.setAttribute("for", "cirNetSel");
    netLabel.setAttribute("data-i18n", "cirNetSelectLabel");
    netLabel.textContent = t("cirNetSelectLabel");
    var netSel = document.createElement("select");
    netSel.className = "elements-select";
    netSel.id = "cirNetSel";
    netRow.appendChild(netLabel);
    netRow.appendChild(netSel);

    var actions = document.createElement("div");
    actions.className = "game-actions";
    var clearBtn = makeButton("primary", "cirBtnClear", t("cirBtnClear"));
    var bestEl = document.createElement("p");
    bestEl.className = "game-best";
    actions.appendChild(clearBtn);
    actions.appendChild(bestEl);

    var hint = document.createElement("p");
    hint.className = "game-hint";
    hint.setAttribute("data-i18n", "cirHint");
    hint.textContent = t("cirHint");

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

    function makeButton(extra, key, text) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = extra;
      var span = document.createElement("span");
      span.setAttribute("data-i18n", key);
      span.textContent = text;
      var content = document.createElement("span");
      content.className = "button-content";
      content.appendChild(span);
      btn.appendChild(content);
      return btn;
    }

    [hud, board, palette, tableBox, result, netRow, actions, hint].forEach(function (node) {
      panelEl.appendChild(node);
    });

    function gateWord(gate) {
      if (!gate) {
        return t("cirGateEmpty");
      }
      return t("cirGate" + gate.charAt(0).toUpperCase() + gate.slice(1));
    }

    /* --- board: input pins, one row per socket, then the output --- */
    function buildBoard() {
      while (board.firstChild) {
        board.removeChild(board.firstChild);
      }
      while (palette.firstChild) {
        palette.removeChild(palette.firstChild);
      }
      while (tableBox.firstChild) {
        tableBox.removeChild(tableBox.firstChild);
      }
      slotEls = {};
      pinEls = {};
      liveEls = {};
      rowEls = [];

      for (var p = 0; p < level.inputs.length; p += 1) {
        var pin = level.inputs[p];
        var pinBtn = document.createElement("button");
        pinBtn.type = "button";
        pinBtn.className = "cir-pin";
        pinBtn.dataset.pin = pin;
        (function (name) {
          pinBtn.addEventListener("click", function () {
            probe[name] = probe[name] ? 0 : 1;
            render();
          });
        })(pin);
        rail.appendChild(pinBtn);
        pinEls[pin] = pinBtn;
      }
      board.appendChild(rail);

      for (var i = 0; i < level.slots.length; i += 1) {
        var slot = level.slots[i];
        var row = document.createElement("div");
        row.className = "cir-row";
        var wires = document.createElement("span");
        wires.className = "cir-wires";
        wires.textContent = slot.b ? slot.a + " " + slot.b : slot.a;
        row.appendChild(wires);

        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "cir-slot";
        btn.dataset.slot = slot.id;
        (function (target) {
          btn.addEventListener("click", function () {
            picked = target.id;
            render();
            result.textContent = t("cirPicked", { slot: target.id, wires: cirArity(target) });
          });
        })(slot);
        row.appendChild(btn);
        slotEls[slot.id] = btn;

        var live = document.createElement("span");
        live.className = "cir-live";
        row.appendChild(live);
        liveEls[slot.id] = live;
        board.appendChild(row);
      }
      board.appendChild(outRow);

      var parts = cirAll.concat(["clear"]);
      for (var g = 0; g < parts.length; g += 1) {
        var gate = parts[g] === "clear" ? "" : parts[g];
        var item = makeButton("cir-chip", "cirGateChip" + (gate || "Empty"), gateWord(gate));
        (function (value) {
          item.addEventListener("click", function () {
            assign(value);
          });
        })(gate);
        palette.appendChild(item);
      }

      var head = document.createElement("p");
      head.className = "cir-score";
      tableBox.appendChild(head);
      for (var r = 0; r < table.length; r += 1) {
        var line = document.createElement("p");
        line.className = "cir-line";
        tableBox.appendChild(line);
        rowEls.push(line);
      }
    }

    function cycle(slot) {
      var menu = cirMenu(slot);
      var current = gates[slot.id] || "";
      var at = current ? menu.indexOf(current) : -1;
      var value = at + 1 >= menu.length ? "" : menu[at + 1];
      assignTo(slot, value);
    }

    function assign(gate) {
      var slot = cirSlot(netlist, picked);
      if (!slot) {
        return;
      }
      assignTo(slot, gate);
    }

    /* The netlist only accepts a part that matches its wire count. */
    function assignTo(slot, gate) {
      if (solved) {
        result.textContent = t("cirDoneAlready", { name: t(level.labelKey) });
        return;
      }
      if (gate && cirMenu(slot).indexOf(gate) === -1) {
        result.textContent = t("cirArity", {
          slot: slot.id,
          n: cirArity(slot),
          gate: gateWord(gate),
        });
        return;
      }
      picked = slot.id;
      gates[slot.id] = gate;
      netlist = cirWith(level, gates);
      render();
      if (gate) {
        result.textContent = t("cirPlaced", { slot: slot.id, gate: gateWord(gate) });
      } else {
        result.textContent = t("cirPulled", { slot: slot.id });
      }
      check();
    }

    function refreshPicker() {
      fillCampaignPicker(
        netSel,
        campaign,
        function (def) {
          return t(def.labelKey);
        },
        t("elementsLocked"),
      );
      netSel.value = level.id;
      var best = campaign.best(level.id);
      bestEl.textContent =
        t("campaignStars", { n: campaign.totalStars(), max: campaign.maxStars() }) +
        " \u00b7 " +
        (best > 0 ? t("cirBestParts", { n: best }) : t("noBest"));
    }

    function render() {
      var signals = cirSignals(netlist, probe);
      var hits = cirRows(netlist, table);
      var pass = 0;
      for (var i = 0; i < hits.length; i += 1) {
        if (hits[i]) {
          pass += 1;
        }
      }
      partsEl.textContent = t("cirPartsNow", { n: cirParts(gates), par: level.par });
      rowsEl.textContent = t("cirRowsNow", { n: pass, max: hits.length });
      for (var p = 0; p < level.inputs.length; p += 1) {
        var pin = level.inputs[p];
        var bit = probe[pin] ? 1 : 0;
        pinEls[pin].textContent = pin + " " + bit;
        pinEls[pin].className = "cir-pin" + (bit ? " is-high" : "");
        pinEls[pin].setAttribute("aria-label", t("cirPinLabel", { a: pin, b: bit }));
      }
      for (var s = 0; s < level.slots.length; s += 1) {
        var slot = level.slots[s];
        var el = slotEls[slot.id];
        if (!el) {
          continue;
        }
        var gate = gates[slot.id] || "";
        el.textContent = gate ? gate.toUpperCase() : "\u2014";
        el.className = "cir-slot" + (picked === slot.id ? " is-picked" : "") + (gate ? " is-set" : "");
        el.setAttribute(
          "aria-label",
          t("cirSlotLabel", { a: slot.id, b: slot.b ? slot.a + " " + slot.b : slot.a, c: gateWord(gate) }),
        );
        el.setAttribute("aria-pressed", picked === slot.id ? "true" : "false");
        var live = liveEls[slot.id];
        if (live) {
          live.textContent = "\u2192 " + (signals[slot.id] ? 1 : 0);
        }
      }
      outValue.textContent = "\u2192 " + (signals[level.out] ? 1 : 0);
      var head = tableBox.firstChild;
      if (head) {
        head.textContent = t("cirScore", { n: pass, max: hits.length });
      }
      for (var r = 0; r < table.length; r += 1) {
        var line = rowEls[r];
        if (!line) {
          continue;
        }
        var want = table[r].out ? 1 : 0;
        var got = cirEval(netlist, table[r].in);
        var label = "";
        for (var c = 0; c < level.inputs.length; c += 1) {
          label = label + level.inputs[c] + table[r].in[level.inputs[c]];
          if (c + 1 < level.inputs.length) {
            label += " ";
          }
        }
        line.textContent = t("cirRowLine", {
          in: label,
          w: want,
          g: got,
          m: hits[r] ? "\u2713" : "\u2717",
        });
        line.className = "cir-line" + (hits[r] ? " is-pass" : " is-fail");
      }
    }

    function check() {
      if (solved) {
        return;
      }
      var hits = cirRows(netlist, table);
      for (var i = 0; i < hits.length; i += 1) {
        if (!hits[i]) {
          return;
        }
      }
      finish();
    }

    function finish() {
      solved = true;
      var used = cirParts(gates);
      var starsWon = starsFor(used, [level.par, level.par + 1, level.par + 2], "low");
      var outcome = campaign.record(level.id, {
        stars: starsWon,
        best: used,
        better: "low",
      });
      var message = t("cirCleared", { n: used, s: starsWon, p: level.par });
      if (outcome.isBest) {
        message += " " + t("newBest");
      }
      if (outcome.unlockedNext) {
        message += " " + t("cirNextNet");
      } else if (campaign.clearedCount() === cirLevels.length) {
        message += " " + t("cirCampaignDone");
      }
      result.textContent = message;
      logAction(t("logCircuitScribe", { n: used }));
      var rect = clearBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      refreshPicker();
    }

    function loadNet(def) {
      level = def;
      table = cirTable(level);
      gates = {};
      netlist = cirWith(level, gates);
      probe = {};
      for (var i = 0; i < level.inputs.length; i += 1) {
        probe[level.inputs[i]] = 0;
      }
      picked = level.slots[0].id;
      solved = false;
      buildBoard();
      refreshPicker();
      render();
      result.textContent = t("cirPrompt", {
        name: t(level.labelKey),
        n: table.length,
        p: level.par,
      });
    }

    board.addEventListener("keydown", function (event) {
      var step = { ArrowUp: -1, ArrowDown: 1, ArrowLeft: -1, ArrowRight: 1 };
      if (step[event.key] !== undefined) {
        event.preventDefault();
        var at = 0;
        for (var i = 0; i < level.slots.length; i += 1) {
          if (level.slots[i].id === picked) {
            at = i;
          }
        }
        var next = (at + step[event.key] + level.slots.length) % level.slots.length;
        picked = level.slots[next].id;
        render();
        result.textContent = t("cirPicked", {
          slot: picked,
          wires: level.slots[next].b ? 2 : 1,
        });
        return;
      }
      if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
        event.preventDefault();
        var slot = cirSlot(netlist, picked);
        if (slot) {
          cycle(slot);
        }
      }
    });

    netSel.addEventListener("change", function () {
      var pick = campaign.indexOf(netSel.value);
      if (pick < 0) {
        return;
      }
      if (!campaign.isUnlocked(netSel.value)) {
        netSel.value = level.id;
        result.textContent = t("cirLocked", { name: t(cirLevels[pick].labelKey) });
        return;
      }
      loadNet(cirLevels[pick]);
    });

    clearBtn.addEventListener("click", function () {
      loadNet(level);
    });

    loadNet(cirLevels[open < 0 ? 0 : open]);
  }

  /* Bilingual copy travels with the game: addStrings only fills keys i18n.js
   * does not already own, so the shared dictionary stays authoritative. */
  App.addStrings({
    en: {
      "tabCircuitScribe": "Circuit Scribe",
      "cirL1": "Parity Bell",
      "cirL2": "Majority Vote",
      "cirL3": "Exactly One",
      "cirL4": "Cellar Alarm",
      "cirL5": "Two-Stage Relay",
      "cirPartsLabel": "Parts",
      "cirRowsLabel": "Rows",
      "cirNetSelectLabel": "Pick a net",
      "cirBtnClear": "Clear Net",
      "cirRailLabel": "probe",
      "cirOutLabel": "output",
      "cirPaletteLabel": "Gate palette",
      "cirTableLabel": "Required rows",
      "cirFieldLabel": "Gate board: arrows pick a socket, Enter cycles its part, Space opens the palette row. Each socket lists the wires it has.",
      "cirPartsNow": "{n} / par {par}",
      "cirRowsNow": "{n}/{max} pass",
      "cirScore": "rows holding: {n}/{max}",
      "cirRowLine": "{in} - want {w}, got {g} {m}",
      "cirGateEmpty": "empty",
      "cirGateAnd": "AND",
      "cirGateOr": "OR",
      "cirGateXor": "XOR",
      "cirGateNot": "NOT",
      "cirGateWire": "wire",
      "cirGateChipAnd": "AND",
      "cirGateChipOr": "OR",
      "cirGateChipXor": "XOR",
      "cirGateChipNot": "NOT",
      "cirGateChipWire": "wire",
      "cirGateChipEmpty": "clear",
      "cirPinLabel": "Probe input {a}, currently {b}",
      "cirSlotLabel": "Socket {a} fed by {b}: {c}",
      "cirPrompt": "{name}: {n} rows must hold. Par is {p} parts.",
      "cirPlaced": "{slot} now carries a {gate}.",
      "cirPulled": "{slot} is bare wire again.",
      "cirPicked": "{slot} picked - it has {wires} wire(s).",
      "cirArity": "{slot} only has {n} wire(s), so a {gate} will not seat there.",
      "cirDoneAlready": "{name} is already singing - clear the net or pick another.",
      "cirCleared": "Every row holds on {n} parts (par {p}) - {s} stars.",
      "cirBestParts": "best {n} parts",
      "cirNextNet": "Next net unlocked.",
      "cirCampaignDone": "Five nets, all truthing out.",
      "cirLocked": "{name} is taped over until the net before it works.",
      "cirHint": "A dead socket reads as 0, so an OR or XOR on a spare wire passes the live one straight through.",
      "logCircuitScribe": "Truthed out a net on {n} parts",
    },
    zh: {
      "tabCircuitScribe": "电路抄写员",
      "cirL1": "奇偶校验铃",
      "cirL2": "多数表决",
      "cirL3": "恰好一个",
      "cirL4": "地窖警铃",
      "cirL5": "两级合成",
      "cirPartsLabel": "元件",
      "cirRowsLabel": "行",
      "cirNetSelectLabel": "选择电路",
      "cirBtnClear": "清空电路",
      "cirRailLabel": "试电",
      "cirOutLabel": "输出",
      "cirPaletteLabel": "门电路盘",
      "cirTableLabel": "必须成立的输入行",
      "cirFieldLabel": "门电路盘：方向键选择插座，回车更换元件，空格同样可换。每个插座都会标出自己有几根线。",
      "cirPartsNow": "{n} / 标准 {par}",
      "cirRowsNow": "{n}/{max} 行通过",
      "cirScore": "成立的行：{n}/{max}",
      "cirRowLine": "{in} - 应为 {w}，实为 {g} {m}",
      "cirGateEmpty": "空",
      "cirGateAnd": "与门",
      "cirGateOr": "或门",
      "cirGateXor": "异或门",
      "cirGateNot": "非门",
      "cirGateWire": "直通线",
      "cirGateChipAnd": "与",
      "cirGateChipOr": "或",
      "cirGateChipXor": "异或",
      "cirGateChipNot": "非",
      "cirGateChipWire": "直通",
      "cirGateChipEmpty": "清空",
      "cirPinLabel": "试输入 {a}，当前为 {b}",
      "cirSlotLabel": "插座 {a}，进线 {b}：{c}",
      "cirPrompt": "{name}：{n} 行输入都必须成立。标准用量 {p} 个元件。",
      "cirPlaced": "{slot} 装上了{gate}。",
      "cirPulled": "{slot} 又空了下来。",
      "cirPicked": "已选 {slot}——它有 {wires} 根进线。",
      "cirArity": "{slot} 只有 {n} 根进线，{gate}装不下。",
      "cirDoneAlready": "「{name}」已经全部通过——清空重来或换一张电路。",
      "cirCleared": "{n} 个元件让所有行都成立（标准 {p}）- 获得 {s} 星。",
      "cirBestParts": "最佳 {n} 个元件",
      "cirNextNet": "解锁下一张电路。",
      "cirCampaignDone": "五张电路全部按预期出电平。",
      "cirLocked": "「{name}」还被胶带封着——先让上一张电路工作。",
      "cirHint": "空插座读作 0，所以把多余的那一路接成或门或异或门，就等于让有效信号直通过去。",
      "logCircuitScribe": "用 {n} 个元件接好了一张电路",
    },
  });

  App.registerGame({
    name: "circuitScribe",
    tabKey: "tabCircuitScribe",
    init: initCircuitScribeGame,
    guide: {
      svg:
        '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="6" y="6" width="108" height="64" rx="5" fill="rgba(30,41,59,.75)" stroke="rgba(148,163,184,.45)"/>' +
        '<path d="M14 24h16M14 52h16M46 30h14M46 46h14M76 38h26" stroke="rgba(148,163,184,.55)" stroke-width="2" fill="none"/>' +
        '<path d="M30 18q14 0 14 12t-14 12" fill="none" stroke="#22d3ee" stroke-width="2"/>' +
        '<path d="M30 40q14 0 14 12t-14 12" fill="none" stroke="#22d3ee" stroke-width="2"/>' +
        '<path d="M60 30q14 0 14 10t-14 10" fill="none" stroke="#a3e635" stroke-width="2"/>' +
        '<text x="18" y="21" font-size="8" fill="#94a3b8">A</text>' +
        '<text x="18" y="49" font-size="8" fill="#94a3b8">B</text>' +
        '<text x="92" y="41" font-size="9" fill="#fbbf24">1</text></svg>',
      en: [
        "Aim: seat gates so the output matches the required truth table on every row.",
        "Pick: click a socket, or arrow through them, then choose from the palette or press Enter to cycle its parts.",
        "Wires: a socket with two wires takes AND, OR or XOR; a one-wire socket takes NOT or a plain wire. The wrong part simply will not seat.",
        "Live: the row list prints want and got as text, so a tick is a row that already holds - no colour needed.",
        "Watch out: an empty socket reads as 0, which is handy for bypasses but still costs you nothing to leave bare.",
        "Scoring: every part you seat counts against par, so the tidy net wins the stars.",
      ],
      zh:
        [
          "目标：装好门电路，让输出在每一种输入组合下都和要求的真值表一致。",
          "选择：点击插座，或用方向键在插座间移动，然后从门电路盘里挑，或按回车轮换元件。",
          "进线：两根线的插座只能装与门、或门、异或门；一根线的插座装非门或直通线。装错了坐不下去。",
          "实时：下方逐行写出“应为”和“实为”，打了勾就是这一行已经成立，不靠颜色判断。",
          "注意：空插座读作 0，这能帮你做直通，但空着不花元件。",
          "计分：装上的每个元件都要和标准用量对比，接得越干净星越多。",
        ],
    },
  });

  /* Exported for the other modules. */
  App.initCircuitScribeGame = initCircuitScribeGame;
})(window.CapitalConvert = window.CapitalConvert || {});
