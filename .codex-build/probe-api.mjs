import { FileBlob, PresentationFile } from "@oai/artifact-tool";
const source = "C:\\Users\\Harrel\\.codex\\plugins\\cache\\openai-curated-remote\\openai-templates\\0.1.1\\skills\\artifact-template-project-kickoff\\assets\\reference.pptx";
const deck = await PresentationFile.importPptx(await FileBlob.load(source));
function methods(obj) {
  const out = new Set();
  let cur = obj;
  while (cur && cur !== Object.prototype) {
    for (const n of Object.getOwnPropertyNames(cur)) if (typeof obj[n] === 'function') out.add(n);
    cur = Object.getPrototypeOf(cur);
  }
  return [...out].sort();
}
console.log('slides', methods(deck.slides));
console.log('slide', methods(deck.slides.items[0]));
console.log('shape', methods(deck.slides.items[0].shapes.items[0]));
console.log('text', methods(deck.slides.items[0].shapes.items[0].text));
console.log('image', methods(deck.slides.items[2].images.items[0]));
