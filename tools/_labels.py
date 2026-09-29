# -*- coding: utf-8 -*-
import io

# 1) prism typo: stray "s:" key in the p7 mirror
p = "assets/app/game-prism-path.js"
s = io.open(p, encoding="utf-8").read()
a = '{ x: 3, y: 3, s: 0, slope: 0 },'
assert s.count(a) == 1
s = s.replace(a, '{ x: 3, y: 3, slope: 0 },')
io.open(p, "w", encoding="utf-8", newline="").write(s)
print("prism typo fixed")

# 2) i18n labels for every new level, both languages
p = "assets/app/i18n.js"
s = io.open(p, encoding="utf-8-sig").read()
en_anchor = '      "logGlyphFleet": "Glyph Fleet: {n} shots",\n'
zh_anchor = '      "logGlyphFleet": "\u7075\u7b26\u8230\u961f\uff1a\u53d1\u70ae {n} \u6b21",\n'
assert s.count(en_anchor) == 1 and s.count(zh_anchor) == 1

en_new = en_anchor + '''      "beatL7": "Voltage",
      "beatL8": "Overdrive",
      "slashL7": "Riptide",
      "slashL8": "Monsoon",
      "brkL16": "Encore",
      "brkL17": "Grand Slam",
      "snkL11": "Twin Towers",
      "snkL12": "Stepping Stones",
      "diceTable6": "High Stakes",
      "diceRule6": "High Stakes: 1 burns, banking loses 5. Target {t}.",
      "diceTable7": "The Abyss",
      "diceRule7": "The Abyss: 1 and 6 burn, banking loses 5. Target {t}.",
      "inkL11": "Ink Sea",
      "inkL12": "The Source",
      "bubL11": "Abyssal",
      "bubL12": "Hadal",
      "pegL9": "Spire",
      "pegL10": "Heaven",
      "raidL9": "Siege",
      "raidL10": "Armageddon",
      "leapL9": "Stratosphere",
      "leapL10": "Mesosphere",
      "echoL7": "Requiem",
      "echoL8": "Eternity",
      "netL7": "Metropolis",
      "netL8": "Gigalopolis",
      "glL7": "Whiteout",
      "glL8": "Polar Night",
      "sorL7": "Eight Gems",
      "sorL8": "Kaleidoscope",
      "ftL7": "Labyrinth",
      "ftL8": "Pandemonium",
      "sudL7": "Ridge",
      "sudL8": "Everest",
      "revL7": "Legend",
      "revL8": "Myth",
      "c4L7": "Sage",
      "c4L8": "Deity",
      "fltL7": "Vice Admiral",
      "fltL8": "Fleet Admiral",
      "prismL7": "Cathedral",
      "prismL8": "Observatory",
      "auroL7": "Corona",
      "auroL8": "Zenith",
      "lantL7": "Highland",
      "lantL8": "Summit Ridge",
      "sokL7": "Twin Bays",
      "sokL8": "The Vault",
'''
zh_new = zh_anchor + '''      "beatL7": "\u8d85\u538b",
      "beatL8": "\u6781\u9a70",
      "slashL7": "\u6025\u6d6a",
      "slashL8": "\u5b63\u98ce",
      "brkL16": "\u5b89\u53ef",
      "brkL17": "\u5168\u5792\u6253",
      "snkL11": "\u53cc\u5854",
      "snkL12": "\u8df3\u77f3",
      "diceTable6": "\u8c6a\u8d4c\u5c40",
      "diceRule6": "\u8c6a\u8d4c\u5c40\uff1a1 \u70b9\u71c3\u70e7\uff0c\u5b58\u5165\u635f 5\u3002\u76ee\u6807 {t}\u3002",
      "diceTable7": "\u6df1\u6e0a\u5c40",
      "diceRule7": "\u6df1\u6e0a\u5c40\uff1a1 \u548c 6 \u70b9\u71c3\u70e7\uff0c\u5b58\u5165\u635f 5\u3002\u76ee\u6807 {t}\u3002",
      "inkL11": "\u58a8\u6d77",
      "inkL12": "\u58a8\u6e90",
      "bubL11": "\u6df1\u6e0a\u5e95",
      "bubL12": "\u8d85\u6df1\u6e0a",
      "pegL9": "\u5c16\u5854",
      "pegL10": "\u5929\u7a79",
      "raidL9": "\u56f4\u653b",
      "raidL10": "\u51b3\u6218",
      "leapL9": "\u5e73\u6d41\u5c42",
      "leapL10": "\u4e2d\u95f4\u5c42",
      "echoL7": "\u5b89\u9b42\u66f2",
      "echoL8": "\u6c38\u6052",
      "netL7": "\u90fd\u4f1a",
      "netL8": "\u5de8\u578b\u90fd\u4f1a",
      "glL7": "\u767d\u832b\u832b",
      "glL8": "\u6781\u591c",
      "sorL7": "\u516b\u5b9d\u7409\u7483",
      "sorL8": "\u4e07\u82b1\u7b52",
      "ftL7": "\u8ff7\u5bab",
      "ftL8": "\u4e71\u5883",
      "sudL7": "\u5c71\u810a",
      "sudL8": "\u73e0\u5cf0",
      "revL7": "\u4f20\u5947",
      "revL8": "\u795e\u8bdd",
      "c4L7": "\u8d24\u8005",
      "c4L8": "\u795e\u8c15",
      "fltL7": "\u4e2d\u5c06",
      "fltL8": "\u8230\u961f\u5143\u5e05",
      "prismL7": "\u5927\u6559\u5802",
      "prismL8": "\u89c2\u661f\u53f0",
      "auroL7": "\u65e5\u5195",
      "auroL8": "\u5929\u9876",
      "lantL7": "\u9ad8\u5730",
      "lantL8": "\u9876\u5cf0\u5c71\u810a",
      "sokL7": "\u53cc\u5b50\u8231",
      "sokL8": "\u79d8\u5e93",
'''
s = s.replace(en_anchor, en_new).replace(zh_anchor, zh_new)
io.open(p, "w", encoding="utf-8-sig", newline="").write(s)
print("i18n labels added")

# 3) memory grid: CSS rule for cols=6
p = "assets/styles/games.css"
s = io.open(p, encoding="utf-8").read()
a = '.memory-grid[data-cols="5"] {'
assert s.count(a) == 1
s = s.replace(a, '''.memory-grid[data-cols="6"] {
    grid-template-columns: repeat(6, minmax(0, 1fr));
}

.memory-grid[data-cols="6"] .memory-card {
    font-size: clamp(18px, 4.6vw, 30px);
}

''' + a)
io.open(p, "w", encoding="utf-8", newline="").write(s)
print("memory cols=6 css added")

# 4) static-checks: pinned campaign counts
p = "tools/static-checks.js"
s = io.open(p, encoding="utf-8").read()
s = s.replace('{ file: "game-breakout", table: "brkLevels", count: 15, select: "brkLevelSel" }',
              '{ file: "game-breakout", table: "brkLevels", count: 17, select: "brkLevelSel" }')
s = s.replace('{ file: "game-snake", table: "snkLevels", count: 10, select: "snkLevelSel" }',
              '{ file: "game-snake", table: "snkLevels", count: 12, select: "snkLevelSel" }')
s = s.replace('{ file: "game-ember-dice", table: "diceTables", count: 5, select: "diceTableSel" }',
              '{ file: "game-ember-dice", table: "diceTables", count: 7, select: "diceTableSel" }')
io.open(p, "w", encoding="utf-8", newline="").write(s)
print("pinned counts updated")
