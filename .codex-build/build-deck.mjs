import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { FileBlob, PresentationFile } from "@oai/artifact-tool";

const workspaceDir = "C:\\Users\\Harrel\\Desktop\\capitalConvert";
const SKILL_DIR = "C:\\Users\\Harrel\\.codex\\plugins\\cache\\openai-primary-runtime\\presentations\\26.905.11957\\skills\\presentations";
const RUNTIME_PYTHON = "C:\\Users\\Harrel\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe";
const RUNTIME_NODE = "C:\\Users\\Harrel\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\bin\\node.exe";
const RUNTIME_NODE_MODULES = "C:\\Users\\Harrel\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules";
const RUNTIME_BIN_DIR = "C:\\Users\\Harrel\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\bin\\override";
const sourceTemplatePath = "C:\\Users\\Harrel\\.codex\\plugins\\cache\\openai-curated-remote\\openai-templates\\0.1.1\\skills\\artifact-template-project-kickoff\\assets\\reference.pptx";
const coverPath = path.join(workspaceDir, "assets", "transformers-placement-cover.png");
const stillLifePath = path.join(workspaceDir, "assets", "film-product-placement-still-life.png");
const stagingDir = path.join(workspaceDir, ".codex-finalizer");
const outputDir = path.join(workspaceDir, "output");
const previewDir = path.join(workspaceDir, ".codex-build", "final-preview");
const FINAL_PPTX = path.join(outputDir, "变形金刚3_国产品牌植入广告分析_最终版.pptx");
const FONT = "Noto Sans SC";
const WHITE = "#F4F8F4";
const MUTED = "#C8D5CE";
const LIME = "#B7F34A";
const DEEP = "#003523";
const PANEL = "#294D40";

await fs.mkdir(stagingDir, { recursive: true });
await fs.mkdir(outputDir, { recursive: true });
await fs.mkdir(previewDir, { recursive: true });
process.env.SKILL_DIR = SKILL_DIR;
process.env.TMP_DIR = stagingDir;
process.env.RUNTIME_NODE = RUNTIME_NODE;
process.env.RUNTIME_NODE_MODULES = RUNTIME_NODE_MODULES;
process.env.RUNTIME_BIN_DIR = RUNTIME_BIN_DIR;
process.env.RUNTIME_PYTHON = RUNTIME_PYTHON;

const deck = await PresentationFile.importPptx(await FileBlob.load(sourceTemplatePath));
const original = [...deck.slides.items];
const cover = original[0];
const background = original[2];
const brands = original[6];
const strengths = original[4];
const problems = strengths.duplicate();
const conclusion = original[5];
const keep = [cover, background, brands, strengths, problems, conclusion];
const keepSet = new Set(keep);
for (const slide of [...deck.slides.items]) {
  if (!keepSet.has(slide)) slide.delete();
}
keep.forEach((slide, i) => slide.moveTo(i));

function setSimpleText(shape, text, { sizePt = 24, color = WHITE, bold = false, align = "left", valign = "top", autoFit = "none", lineSpacing = 1.08 } = {}) {
  shape.text = [[{ run: text, textStyle: { typeface: FONT, fontSize: `${sizePt}pt`, color, bold } }]];
  shape.text.style = {
    typeface: FONT,
    fontSizePt: sizePt,
    color,
    bold,
    alignment: align,
    verticalAlignment: valign,
    autoFit,
    lineSpacing,
  };
}

function setTitleBody(shape, title, body, { titleSize = 20, bodySize = 14.5, bodyColor = WHITE, titleColor = LIME, spaceAfter = 700 } = {}) {
  shape.text = [
    {
      runs: [{ run: title, textStyle: { typeface: FONT, fontSize: `${titleSize}pt`, color: titleColor, bold: true } }],
      spaceAfter,
      paragraphStyle: { alignment: "left" },
    },
    {
      runs: [{ run: body, textStyle: { typeface: FONT, fontSize: `${bodySize}pt`, color: bodyColor } }],
      paragraphStyle: { alignment: "left" },
    },
  ];
  shape.text.style = {
    typeface: FONT,
    color: bodyColor,
    fontSizePt: bodySize,
    alignment: "left",
    verticalAlignment: "top",
    autoFit: "none",
    lineSpacing: 1.18,
  };
}

function replaceTitleBody(slide, shape, title, body, options = {}) {
  const frame = { ...shape.frame };
  shape.delete();
  const fresh = slide.shapes.add({
    geometry: "textbox",
    position: frame,
    fill: "none",
    line: { fill: "none", width: 0 },
  });
  setTitleBody(fresh, title, body, options);
  return fresh;
}

function setSlideTitle(shape, text) {
  setSimpleText(shape, text, { sizePt: 28, color: WHITE, bold: true, autoFit: "shrinkText", lineSpacing: 1.0 });
}

function updateSlideNumbers() {
  deck.slides.items.forEach((slide, i) => {
    for (const shape of slide.shapes.items) {
      if (shape.placeholder?.type === "slideNumber") {
        setSimpleText(shape, String(i + 1), { sizePt: 8.5, color: WHITE, align: "right", valign: "middle" });
      }
    }
  });
}

// Slide 1: cover. Rebuild foreground in the selected template's visual language.
for (const shape of [...cover.shapes.items]) shape.delete();
const coverBytes = new Uint8Array(await fs.readFile(coverPath));
cover.images.add({
  blob: coverBytes,
  contentType: "image/png",
  alt: "原创科幻机械城市与四类无品牌产品的概念图",
  prompt: "Original cinematic giant-robot product-placement concept art; no logos or recognizable characters.",
  fit: "cover",
  position: { left: 0, top: 0, width: 1280, height: 720 },
});
const coverPill = cover.shapes.add({
  geometry: "roundRect",
  position: { left: 72, top: 92, width: 212, height: 46 },
  fill: PANEL,
  line: { fill: "none", width: 0 },
});
setSimpleText(coverPill, "广告学案例分析", { sizePt: 14, color: WHITE, bold: true, align: "center", valign: "middle" });
const coverTitle = cover.shapes.add({
  geometry: "textbox",
  position: { left: 72, top: 184, width: 650, height: 224 },
  fill: "none",
  line: { fill: "none", width: 0 },
});
setSimpleText(coverTitle, "《变形金刚3》\n中国品牌植入广告分析", { sizePt: 39, color: LIME, bold: true, autoFit: "shrinkText", lineSpacing: 0.96 });
const coverSub = cover.shapes.add({
  geometry: "textbox",
  position: { left: 76, top: 445, width: 620, height: 92 },
  fill: "none",
  line: { fill: "none", width: 0 },
});
setSimpleText(coverSub, "美特斯·邦威  ·  伊利舒化奶  ·  TCL  ·  联想\n姓名：________    课程：广告学", { sizePt: 17, color: WHITE, autoFit: "shrinkText", lineSpacing: 1.25 });
cover.speakerNotes.textFrame.setText("内容依据：用户提供的作业题目与六页文稿。封面配图为 OpenAI ImageGen 生成的原创概念图，不是电影剧照或真实产品图。");

// Slide 2: background and core observation.
setSlideTitle(deck.resolve("sh/507y1gbi"), "案例背景");
replaceTitleBody(
  background,
  deck.resolve("sh/cza94vmx"),
  "好莱坞大片中的中国品牌",
  "《变形金刚3》拥有全球受众。影片集中出现四个中国品牌，使商业植入本身成为观影话题。",
  { titleSize: 19, bodySize: 14.5 },
);
replaceTitleBody(
  background,
  deck.resolve("sh/d0jax03i"),
  "从曝光走向争议",
  "品牌通过服装、饮品和电子设备进入场景。部分观众甚至“记住牛奶、忘了剧情”，说明记忆度与好感度并不等同。",
  { titleSize: 19, bodySize: 14.2 },
);
const still = deck.resolve("im/3elwnup0");
const stillFrame = still.frame;
still.replace({
  blob: new Uint8Array(await fs.readFile(stillLifePath)),
  contentType: "image/png",
  alt: "原创电影片场中的T恤、牛奶盒、电视和笔记本电脑静物概念图",
  prompt: "Original editorial film-set still life with four unbranded consumer products.",
  fit: "cover",
});
still.frame = stillFrame;
still.fit = "cover";
still.geometry = "roundRect";
still.borderRadius = "rounded-xl";
background.speakerNotes.textFrame.setText("内容依据：用户提供文稿。右侧配图为 OpenAI ImageGen 生成的原创概念图，不是电影剧照或真实产品图。");

// Slide 3: four brands and their integration depth.
setSlideTitle(deck.resolve("sh/tsjad0z2"), "四个品牌的植入方式");
setSimpleText(
  deck.resolve("sh/dcbud0ra"),
  "四个品牌采用了不同的\n融合深度。\n\n评价植入质量，要兼顾\n可见度、剧情关联和观影干扰",
  { sizePt: 19, color: WHITE, bold: false, autoFit: "shrinkText", lineSpacing: 1.28 },
);
const brandLabels = [
  ["sh/25ojml43", "联想 Lenovo"],
  ["sh/o761ov2t", "美特斯·邦威"],
  ["sh/eh4jil4r", "TCL"],
  ["sh/jedkn654", "伊利舒化奶"],
];
for (const [id, text] of brandLabels) setSimpleText(deck.resolve(id), text, { sizePt: 14.5, color: LIME, bold: true, valign: "middle", autoFit: "shrinkText" });
const brandBodies = [
  ["sh/xcz2l03q", "电脑道具多次展示标识。小机器人变形为新款笔记本，属于道具加轻度剧情植入。"],
  ["sh/p8fih03e", "男女主角穿品牌T恤出镜较久。标识较弱，属于隐蔽式服装道具植入。"],
  ["sh/f2d0b6lc", "3D电视作为室内场景道具。镜头停留较短，曝光方式较为含蓄。"],
  ["sh/id4ju1oz", "角色直接拿起并展示饮品。镜头清晰但转折突兀，属于显性道具植入。"],
];
for (const [id, text] of brandBodies) setSimpleText(deck.resolve(id), text, { sizePt: 12.8, color: WHITE, valign: "middle", autoFit: "shrinkText", lineSpacing: 1.18 });
brands.speakerNotes.textFrame.setText("内容依据：用户提供文稿。分类用于比较四个品牌的植入方式与叙事融合深度。");

// Slide 4: strengths.
setSlideTitle(deck.resolve("sh/cf2tcr61"), "优势与可取之处");
const strengthBoxes = [
  ["sh/w32dkbuh", "大片IP放大知名度", "借助全球发行和成熟类型片，品牌获得国际化联想，也提升国内曝光。"],
  ["sh/x4vedgvm", "形式覆盖多种层级", "服装、饮品、电子设备和轻度剧情融合，为国产品牌合作提供了早期参考。"],
  ["sh/z2tcnm5s", "话题带来二次传播", "舒化奶的突兀感引发调侃，社交讨论继续扩大品牌记忆。"],
  ["sh/yhkbe1o7", "受众与品牌客群相近", "影片核心观众偏年轻，与服装、数码和消费品的目标人群相近。"],
];
for (const [id, title, body] of strengthBoxes) replaceTitleBody(strengths, deck.resolve(id), title, body, { titleSize: 20, bodySize: 14.5, spaceAfter: 600 });
strengths.speakerNotes.textFrame.setText("内容依据：用户提供文稿。优势从传播范围、植入形式、二次讨论和受众匹配四个方面归纳。");

// Slide 5: problems, using the duplicated four-point layout.
const problemTitle = problems.shapes.items.find((s) => s.placeholder?.type === "title");
setSlideTitle(problemTitle, "问题与争议");
const problemContentShapes = problems.shapes.items.filter((s) => s.name === "Content Placeholder 9" || s.name === "Content Placeholder 10");
const problemCopy = [
  ["曝光压过叙事", "舒化奶等镜头缺少人物动机支撑，容易打断观影沉浸。"],
  ["品牌效果不均", "联想兼有剧情和标识，邦威与TCL则过于隐蔽，识别度差异明显。"],
  ["记忆不等于好感", "“只记得牛奶”说明品牌被看见，也可能伴随广告打扰感。"],
  ["文化适配不足", "中国品牌进入美式叙事时，若缺少自然使用场景，容易显得生硬。"],
];
problemContentShapes
  .sort((a, b) => (a.frame.top - b.frame.top) || (a.frame.left - b.frame.left))
  .forEach((shape, i) => replaceTitleBody(problems, shape, problemCopy[i][0], problemCopy[i][1], { titleSize: 20, bodySize: 14.5, titleColor: "#F7C85C", spaceAfter: 600 }));
problems.speakerNotes.textFrame.setText("内容依据：用户提供文稿。争议集中在叙事干扰、曝光不均、品牌好感和文化适配。");

// Slide 6: conclusion and recommendations.
const conclusionTitle = conclusion.shapes.items.find((s) => s.placeholder?.type === "title");
setSlideTitle(conclusionTitle, "总结与启示");
setSimpleText(deck.resolve("sh/47yh0ve5"), "植入效果的关键", { sizePt: 25, color: LIME, bold: true, autoFit: "shrinkText", lineSpacing: 1.0 });
setSimpleText(
  deck.resolve("sh/v2tcn650"),
  "《变形金刚3》让国产品牌进入国际大片视野，也暴露了早期植入广告偏重曝光的问题。\n\n好的植入需要让产品功能、角色行为与故事逻辑互相支持。",
  { sizePt: 16.5, color: WHITE, autoFit: "shrinkText", lineSpacing: 1.25 },
);
replaceTitleBody(conclusion, deck.resolve("sh/ml07i9sv"), "可见度与自然度", "太隐蔽无法传达品牌，太直白容易引发抵触。镜头既要服务剧情，也要让品牌可识别。", { titleSize: 18.5, bodySize: 13.5, titleColor: WHITE, bodyColor: MUTED, spaceAfter: 450 });
replaceTitleBody(conclusion, deck.resolve("sh/oryp8fah"), "叙事适配优先", "选择大片前，应判断产品能否自然进入角色生活和场景，而不是只依靠高流量IP。", { titleSize: 18.5, bodySize: 13.5, titleColor: WHITE, bodyColor: MUTED, spaceAfter: 450 });
conclusion.speakerNotes.textFrame.setText("内容依据：用户提供文稿。结论强调可见度、自然度与叙事适配之间的平衡。");

// Keep the template background and chrome, and make all visible imported text use a CJK-safe font.
for (const slide of deck.slides.items) {
  for (const shape of slide.shapes.items) {
    if (shape.text && String(shape.text).trim()) {
      try { shape.text.typeface = FONT; } catch {}
    }
  }
}
updateSlideNumbers();

const candidatePath = path.join(stagingDir, "candidate-transformers-placement.pptx");
await (await PresentationFile.exportPptx(deck)).save(candidatePath);

const { finalizePresentation } = await import(pathToFileURL(path.join(SKILL_DIR, "container_tools", "artifact_tool_utils.mjs")).href);
const requirements = {
  explicitTotalSlideCount: 6,
  requiredNativeTableOwnerSlides: [],
  requiredNativeChartOwnerSlides: [],
};
const result = await finalizePresentation({
  ...requirements,
  workspaceDir,
  candidatePath,
  finalPath: FINAL_PPTX,
  pythonExecutable: RUNTIME_PYTHON,
  integrityValidatorPath: path.join(SKILL_DIR, "container_tools", "inspect_presentation_package_integrity.py"),
  layoutValidatorPath: path.join(SKILL_DIR, "container_tools", "inspect_presentation_layout_geometry.py"),
  layoutArgs: [
    "--expected-slide-size-emu", "12192000,6858000",
    "--validate-bullet-geometry",
    "--validate-heading-fit",
  ],
  requiredNativeTableOwnerSlides: [],
  fontPolicy: { basis: "design", families: [FONT] },
  verifyArtifactToolImport: true,
  receiptPath: path.join(stagingDir, `${path.basename(FINAL_PPTX)}.validation.json`),
});

const finalDeck = await PresentationFile.importPptx(await FileBlob.load(FINAL_PPTX));
const montage = await finalDeck.export({ format: "png", montage: true, scale: 0.55 });
await fs.writeFile(path.join(previewDir, "montage.png"), new Uint8Array(await montage.arrayBuffer()));
for (let i = 0; i < finalDeck.slides.items.length; i++) {
  const png = await finalDeck.slides.items[i].export({ format: "png", scale: 1 });
  await fs.writeFile(path.join(previewDir, `slide-${i + 1}.png`), new Uint8Array(await png.arrayBuffer()));
}
const inspect = await finalDeck.inspect({ kind: "deck,slide,textbox,image,notes,layout", maxChars: 30000 });
await fs.writeFile(path.join(previewDir, "inspect.ndjson"), inspect.ndjson);
console.log(JSON.stringify({ finalPath: FINAL_PPTX, result }, null, 2));
