/* One-shot: insert the art-direction layer into games.css at the only cascade
 * position that works for it - after the drawer shell rules it must override,
 * and before the per-game sheets that may override it.
 * Run with node tools/insert-layer.js */
const fs = require("fs");
const file = "assets/styles/games.css";
const layerFile = "tools/.staging/skin-layer.css";
const css = fs.readFileSync(file, "utf8");
if (css.includes("ART DIRECTION LAYER")) {
  console.log("layer already present");
  process.exit(0);
}
const eol = css.includes("\r\n") ? "\r\n" : "\n";
const layer = fs.readFileSync(layerFile, "utf8").replace(/\r?\n/g, eol);
const sheetAt = css.search(/\/\* game-[a-z0-9-]+ \((?:drawer|registry) game\) \*\//);
if (sheetAt < 0) {
  console.error("no sheet banner to anchor the layer");
  process.exit(1);
}
const out = css.slice(0, sheetAt).replace(/[ \t\r\n]+$/, "") + eol + eol + layer + eol + eol + css.slice(sheetAt).replace(/^[ \t\r\n]+/, "");
let depth = 0;
let skip = false;
for (let i = 0; i < out.length; i += 1) {
  const two = out.slice(i, i + 2);
  if (skip) { if (two === "*/") { skip = false; i += 1; } continue; }
  if (two === "/*") { skip = true; i += 1; continue; }
  if (out[i] === "{") depth += 1;
  else if (out[i] === "}") depth -= 1;
}
if (depth !== 0) {
  console.error("refusing to write: brace depth would end at " + depth);
  process.exit(1);
}
fs.writeFileSync(file, out);
console.log("layer inserted before the sheets; lines = " + out.split(/\r?\n/).length);
