import { FileBlob, PresentationFile } from "@oai/artifact-tool";
const file = "C:\\Users\\Harrel\\Desktop\\capitalConvert\\output\\变形金刚3_国产品牌植入广告分析.pptx";
const deck = await PresentationFile.importPptx(await FileBlob.load(file));
const shape = deck.slides.items[3].shapes.items.find(s => String(s.text).includes('大片IP'));
console.log(shape.name, shape.frame, String(shape.text));
console.log(shape.getParagraphs());
console.log(Object.keys(shape.text));
