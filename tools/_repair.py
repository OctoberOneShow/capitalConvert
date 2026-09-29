import io

p = "tools/static-checks.js"
s = io.open(p, encoding="utf-8").read()
broken = """    const gravity = Number(/v
console.log("\\\\n== summary ==");"""
fixed = """    const gravity = Number(/var leapGravity = (\\d+);/.exec(src)[1]);
    const apex = (bounce * bounce) / (2 * gravity);
    const block = /var leapLevels = \\[([\\s\\S]*?)\\n  \\];/.exec(src);
    if (!block) return false;
    const gapMaxes = Array.from(block[1].matchAll(/gapMax:\\s*(\\d+)/g)).map((m) =>
      Number(m[1]),
    );
    const goals = Array.from(block[1].matchAll(/goal:\\s*(\\d+)/g)).map((m) =>
      Number(m[1]),
    );
    if (gapMaxes.length !== 8 || goals.length !== 8) return false;
    return (
      gapMaxes.every((g) => g <= apex - 4) &&
      goals.every((g, i) => i === 0 || g > goals[i - 1])
    );
  })(),
);
check(
  "every Bubble Ink spring asks for a score the wall can actually pay",
  (() => {
    const src = fs.readFileSync(
      path.join(root, "assets", "app", "game-bubble-ink.js"),
      "utf8",
    );
    const block = /var bubLevels = \\[([\\s\\S]*?)\\n  \\];/.exec(src);
    if (!block) return false;
    const rows = Array.from(block[1].matchAll(/rows:\\s*(\\d+)/g)).map((m) => Number(m[1]));
    const targets = Array.from(block[1].matchAll(/target:\\s*(\\d+)/g)).map((m) => Number(m[1]));
    if (rows.length !== 10 || targets.length !== 10) return false;
    return rows.every((rowCount, i) => {
      const bubbles = rowCount * 14;
      return targets[i] * 1.4 <= bubbles * 12 && targets[i] >= 300;
    });
  })(),
);
[
  "tabGlyphSketch", "skLevelSelectLabel", "skL1", "skL6",
  "skFieldLabel", "skPrompt", "skReady", "skPaused", "skCleared",
  "skNextBoard", "skCampaignDone", "skHint", "logGlyphSketch",
  "tabGlyphFifteen", "ftLevelSelectLabel", "ftL1", "ftL6",
  "ftFieldLabel", "ftPrompt", "ftReady", "ftPaused", "ftCleared",
  "ftNextBoard", "ftCampaignDone", "ftHint", "logGlyphFifteen",
  "leapL7", "leapL8", "inkL9", "inkL10", "bubL9", "bubL10",
  "pegL7", "pegL8", "raidL7", "raidL8",
].forEach((key) => {
  check(
    `the "${key}" key exists in both languages`,
    countOccurrences(appJs, `"${key}":`) === 2,
    String(countOccurrences(appJs, `"${key}":`)),
  );
});

console.log("\\n== summary ==");"""
assert s.count(broken) == 1, s.count(broken)
s = s.replace(broken, fixed)
io.open(p, "w", encoding="utf-8", newline="").write(s)
print("repaired")
