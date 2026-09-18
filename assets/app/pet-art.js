/* Pet art - Pure SVG builders for the creature, stages, accessories and icons. */
(function (App) {
  var Pet = App.Pet;
  /* Shared names from the other modules (see window.CapitalConvert). */
  var petAccessoryClass = App.petAccessoryClass;
  var petAccessoryOrder = App.petAccessoryOrder;
  var petStageClass = App.petStageClass;
  var petStageOrder = App.petStageOrder;
  var petSvgNamespace = App.petSvgNamespace;
  /* --- artwork ----------------------------------------------------- */

  function petSvg(tag, attrs) {
    var node = document.createElementNS(petSvgNamespace, tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (name) {
        node.setAttribute(name, String(attrs[name]));
      });
    }
    return node;
  }

  function petAppendAll(parent, nodes) {
    nodes.forEach(function (node) {
      if (!node) {
        return;
      }
      if (Array.isArray(node)) {
        petAppendAll(parent, node);
        return;
      }
      parent.appendChild(node);
    });
    return parent;
  }

  function petEye(cx, cy) {
    return [
      petSvg("circle", { class: "pet-eye", cx: cx, cy: cy, r: 6.4 }),
      petSvg("circle", {
        class: "pet-eye-shine",
        cx: cx + 2.2,
        cy: cy - 2.2,
        r: 1.9,
      }),
    ];
  }

  function petCheek(cx, cy) {
    return petSvg("circle", { class: "pet-cheek", cx: cx, cy: cy, r: 4.4 });
  }

  function petMouthSet(cx, cy) {
    return [
      petSvg("path", {
        class: "pet-mouth pet-mouth-happy",
        d:
          "M" + (cx - 8) + " " + (cy - 2) + "c2.6 6.4 13.4 6.4 16 0",
      }),
      petSvg("path", {
        class: "pet-mouth pet-mouth-neutral",
        d: "M" + (cx - 6) + " " + cy + "h12",
      }),
      petSvg("ellipse", {
        class: "pet-mouth pet-mouth-hungry",
        cx: cx,
        cy: cy + 1,
        rx: 6.4,
        ry: 7.4,
      }),
      petSvg("path", {
        class: "pet-mouth pet-mouth-sleepy",
        d:
          "M" + (cx - 6) + " " + cy + "c2-3.2 4-3.2 6 0s4 3.2 6 0",
      }),
    ];
  }

  function petZzz(x, y) {
    var group = petSvg("g", { class: "pet-zzz" });
    return petAppendAll(group, [
      petSvg("path", { d: "M" + x + " " + y + "h9l-9 9h9" }),
      petSvg("path", {
        d: "M" + (x + 14) + " " + (y - 9) + "h6.5l-6.5 6.5h6.5",
      }),
    ]);
  }

  function petLook(nodes) {
    var group = petSvg("g", { class: "pet-look" });
    return petAppendAll(group, nodes);
  }

  /* All evolution stages are rendered; CSS reveals the active one. */
  function petStageParts() {
    return petStageOrder.map(function (stage) {
      var group = petSvg("g", {
        class: "pet-stage-part " + petStageClass[stage],
        "data-stage": stage,
      });
      if (stage === "baby") {
        petAppendAll(group, [
          petSvg("path", { d: "M50 20c-5-5-4-11 0-13 3 3 4 9 0 13z" }),
        ]);
      } else if (stage === "grown") {
        petAppendAll(group, [
          petSvg("path", { d: "M33 68c10 7 24 7 34 0" }),
        ]);
      } else {
        petAppendAll(group, [
          petSvg("circle", { cx: 50, cy: 52, r: 45 }),
          petSvg("path", { d: "M38 22l-4-12 8 6z" }),
          petSvg("path", { d: "M62 22l4-12-8 6z" }),
        ]);
      }
      return group;
    });
  }

  /* All accessories are rendered; CSS reveals the equipped one. */
  function petAccessoryParts() {
    return petAccessoryOrder.map(function (accessory) {
      if (accessory === "none") {
        return null;
      }
      var group = petSvg("g", {
        class: "pet-acc " + petAccessoryClass[accessory],
        "data-acc": accessory,
      });
      if (accessory === "hat") {
        petAppendAll(group, [
          petSvg("path", { d: "M50 2l14 14H36z" }),
          petSvg("path", { d: "M33 16h34" }),
        ]);
      } else if (accessory === "scarf") {
        petAppendAll(group, [
          petSvg("path", { d: "M31 68c12 8 26 8 38 0" }),
          petSvg("path", { d: "M62 72l4 10-8-3z" }),
        ]);
      } else if (accessory === "glasses") {
        petAppendAll(group, [
          petSvg("circle", { cx: 41, cy: 50, r: 9 }),
          petSvg("circle", { cx: 59, cy: 50, r: 9 }),
          petSvg("path", { d: "M50 50h0" }),
        ]);
      } else if (accessory === "crown") {
        petAppendAll(group, [
          petSvg("path", { d: "M34 18l6-10 5 7 5-10 5 10 5-7 6 10z" }),
        ]);
      } else if (accessory === "medal") {
        petAppendAll(group, [
          petSvg("path", { d: "M40 54l10 12 10-12" }),
          petSvg("circle", { cx: 50, cy: 76, r: 8 }),
        ]);
      } else {
        petAppendAll(group, [
          petSvg("circle", { cx: 50, cy: 50, r: 40 }),
        ]);
      }
      return group;
    });
  }

  function petCreateArt(species, className) {
    var svg = petSvg("svg", {
      viewBox: "0 0 100 100",
      class: className || "pet-svg",
      "aria-hidden": "true",
      focusable: "false",
      "data-species": species,
    });

    if (species === "quillop") {
      petAppendAll(svg, [
        petSvg("path", {
          class: "pet-accent pet-drop",
          d: "M50 4c3.4 4.6 5.4 7.2 5.4 10.2a5.4 5.4 0 0 1-10.8 0c0-3 2-5.6 5.4-10.2z",
        }),
        petSvg("path", {
          class: "pet-limb",
          d: "M27 58c-6 1-10 5-11 9 5.2 1 10.4-1 13.4-4.2",
        }),
        petSvg("path", {
          class: "pet-limb",
          d: "M73 58c6 1 10 5 11 9-5.2 1-10.4-1-13.4-4.2",
        }),
        petSvg("path", {
          class: "pet-body",
          d: "M50 14c15 17.4 23.5 28.6 23.5 40.2a23.5 23.5 0 0 1-47 0C26.5 42.6 35 31.4 50 14z",
        }),
        petSvg("path", { class: "pet-seam", d: "M50 42v28" }),
        petSvg("circle", {
          class: "pet-accent pet-breather",
          cx: 50,
          cy: 72,
          r: 3.4,
        }),
        petLook([petEye(42, 50), petEye(58, 50)]),
        petCheek(30, 61),
        petCheek(70, 61),
        petMouthSet(50, 62),
        petStageParts(),
        petAccessoryParts(),
        petZzz(70, 22),
      ]);
      return svg;
    }

    if (species === "tagling") {
      petAppendAll(svg, [
        petSvg("path", {
          class: "pet-body",
          d: "M30 18h30l20 20v32a12 12 0 0 1-12 12H30a12 12 0 0 1-12-12V30a12 12 0 0 1 12-12z",
        }),
        petSvg("circle", { class: "pet-hole", cx: 30, cy: 33, r: 5 }),
        petSvg("path", { class: "pet-limb", d: "M38 62l-6 5.5 6 5.5" }),
        petSvg("path", { class: "pet-limb", d: "M64 62l6 5.5-6 5.5" }),
        petSvg("rect", {
          class: "pet-foot",
          x: 36,
          y: 78,
          width: 10,
          height: 11,
          rx: 5,
        }),
        petSvg("rect", {
          class: "pet-foot",
          x: 54,
          y: 78,
          width: 10,
          height: 11,
          rx: 5,
        }),
        petLook([petEye(44, 44), petEye(60, 44)]),
        petCheek(33, 55),
        petCheek(71, 55),
        petMouthSet(52, 56),
        petStageParts(),
        petAccessoryParts(),
        petZzz(74, 16),
      ]);
      return svg;
    }

    petAppendAll(svg, [
      petSvg("path", { class: "pet-limb", d: "M50 30V17" }),
      petSvg("circle", {
        class: "pet-accent pet-antenna",
        cx: 50,
        cy: 13,
        r: 4.4,
      }),
      petSvg("path", {
        class: "pet-limb",
        d: "M28 42c-8 0-4 8-12 8 8 0 4 8 12 8",
      }),
      petSvg("path", {
        class: "pet-limb",
        d: "M72 42c8 0 4 8 12 8-8 0-4 8-12 8",
      }),
      petSvg("rect", {
        class: "pet-body",
        x: 22,
        y: 28,
        width: 56,
        height: 54,
        rx: 24,
      }),
      petSvg("rect", {
        class: "pet-foot",
        x: 34,
        y: 74,
        width: 11,
        height: 12,
        rx: 5.5,
      }),
      petSvg("rect", {
        class: "pet-foot",
        x: 55,
        y: 74,
        width: 11,
        height: 12,
        rx: 5.5,
      }),
      petLook([petEye(41, 50), petEye(59, 50)]),
      petCheek(31, 61),
      petCheek(69, 61),
      petMouthSet(50, 63),
      petStageParts(),
      petAccessoryParts(),
      petZzz(74, 20),
    ]);
    return svg;
  }

  function petIcon(pathData) {
    var svg = petSvg("svg", {
      viewBox: "0 0 24 24",
      class: "pet-icon",
      "aria-hidden": "true",
      focusable: "false",
    });
    svg.appendChild(petSvg("path", { d: pathData }));
    return svg;
  }

  /* --- markup ------------------------------------------------------ */

  function petCreate(tag, className) {
    var node = document.createElement(tag);
    if (className) {
      node.className = className;
    }
    return node;
  }

  function petCreateStat(key, labelKey) {
    var row = petCreate("div", "pet-stat");
    var label = petCreate("span", "pet-stat-label");
    label.setAttribute("data-i18n", labelKey);
    var bar = petCreate("span", "pet-bar");
    var fill = petCreate("i", "pet-bar-fill");
    fill.setAttribute("id", "petBar" + key.charAt(0).toUpperCase() + key.slice(1));
    bar.appendChild(fill);
    var value = petCreate("span", "pet-stat-value");
    value.setAttribute("id", "petStatValue" + key.charAt(0).toUpperCase() + key.slice(1));
    return { row: row, fill: fill, value: value, label: label, bar: bar };
  }

  function petAddI18nText(parent, key, tag, className) {
    var node = petCreate(tag || "span", className);
    node.setAttribute("data-i18n", key);
    parent.appendChild(node);
    return node;
  }

  function petCreateSubview(id, titleKey, backId) {
    var view = petCreate("div", "pet-subview");
    view.setAttribute("id", id);
    view.hidden = true;
    var bar = petCreate("div", "pet-sub-head");
    petAddI18nText(bar, titleKey, "span", "pet-sub-title");
    var back = petCreate("button", "pet-action pet-back");
    back.type = "button";
    back.setAttribute("id", backId);
    back.setAttribute("data-i18n", "petBtnBack");
    back.setAttribute("data-view", "main");
    bar.appendChild(back);
    view.appendChild(bar);
    return { view: view, back: back };
  }


  /* Exported for the other modules. */
  App.petAddI18nText = petAddI18nText;
  App.petAppendAll = petAppendAll;
  App.petCreate = petCreate;
  App.petCreateArt = petCreateArt;
  App.petCreateStat = petCreateStat;
  App.petCreateSubview = petCreateSubview;
  App.petIcon = petIcon;
  App.petSvg = petSvg;
})(window.CapitalConvert = window.CapitalConvert || {});
