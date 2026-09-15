import fs from "node:fs/promises";
import { FileBlob, PresentationFile } from "@oai/artifact-tool";

const source = "C:\\Users\\Harrel\\.codex\\plugins\\cache\\openai-curated-remote\\openai-templates\\0.1.1\\skills\\artifact-template-project-kickoff\\assets\\reference.pptx";
const outDir = "C:\\Users\\Harrel\\Desktop\\capitalConvert\\.codex-build\\template-preview";
await fs.mkdir(outDir, { recursive: true });
const deck = await PresentationFile.importPptx(await FileBlob.load(source));
const snapshot = await deck.inspect({ kind: "deck,slide,textbox,shape,image,table,chart,layout", maxChars: 30000 });
await fs.writeFile(`${outDir}\\inspect.ndjson`, snapshot.ndjson);
const montage = await deck.export({ format: "png", montage: true, scale: 0.55 });
await fs.writeFile(`${outDir}\\montage.png`, new Uint8Array(await montage.arrayBuffer()));
for (let i = 0; i < deck.slides.items.length; i++) {
  const png = await deck.slides.items[i].export({ format: "png", scale: 1 });
  await fs.writeFile(`${outDir}\\slide-${i + 1}.png`, new Uint8Array(await png.arrayBuffer()));
}
console.log(`slides=${deck.slides.items.length}`);
console.log(snapshot.ndjson);
