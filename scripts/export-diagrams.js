'use strict';

/**
 * Xuất bộ sơ đồ phục vụ báo cáo:
 * - tách 10 sequence Mermaid thành .mmd;
 * - tạo một trang xem trước gồm 4 Use Case + 10 sequence + 1 phân rã;
 * - render sequence và phân rã thành SVG/PNG bằng Chrome.
 *
 * Usage: node scripts/export-diagrams.js
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const ROOT = path.resolve(__dirname, '..');
const DOCS = path.join(ROOT, 'docs');
const DIAGRAMS = path.join(DOCS, 'diagrams');
const SEQUENCE_OUT = path.join(DIAGRAMS, 'sequence');
const PREVIEW = path.join(DOCS, 'diagram-catalog-preview.html');
const CHROME = process.env.CHROME_PATH
  || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const sequenceNames = [
  'login',
  'create-assign-publish-exam',
  'start-attempt-freeze-questions',
  'autosave-answer-version',
  'restore-offline-online',
  'submit-auto-grade',
  'essay-grade-publish-results',
  'incident-compensation',
  'join-class',
  'create-question',
];

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function parseSequenceDiagrams(markdown) {
  const diagrams = [];
  const pattern = /^## (SD-(\d{2})) — ([^\r\n]+)[\s\S]*?```mermaid\r?\n([\s\S]*?)```/gm;
  let match;
  while ((match = pattern.exec(markdown))) {
    const index = Number(match[2]) - 1;
    diagrams.push({
      id: match[1].toLowerCase().replace('-', ''),
      code: match[1],
      title: match[3].trim(),
      source: match[4].trim() + '\n',
      filename: `${match[1].toLowerCase()}-${sequenceNames[index]}`,
    });
  }
  if (diagrams.length !== 10) {
    throw new Error(`Cần đúng 10 sequence diagram, tìm thấy ${diagrams.length}.`);
  }
  return diagrams;
}

function parseFirstMermaid(markdown) {
  const matched = markdown.match(/```mermaid\r?\n([\s\S]*?)```/);
  if (!matched) throw new Error('Không tìm thấy sơ đồ Mermaid phân rã.');
  return matched[1].trim() + '\n';
}

function useCaseCards() {
  const entries = [
    ['UCD-01', 'Tổng quan hệ thống', 'ucd-01-overview.svg'],
    ['UCD-02', 'Góc nhìn Giáo viên', 'ucd-02-teacher.svg'],
    ['UCD-03', 'Góc nhìn Học sinh', 'ucd-03-student.svg'],
    ['UCD-04', 'Phòng thi trực tuyến', 'ucd-04-exam-taking.svg'],
  ];
  return entries.map(([code, title, file]) => `
    <section class="card use-case-card">
      <h2>${code} — ${title}</h2>
      <img src="diagrams/${file}" alt="${code} — ${title}">
    </section>`).join('\n');
}

function mermaidCard(diagram, kind) {
  return `
    <section class="card render-card" id="${diagram.id}" data-export="${diagram.filename}" data-kind="${kind}">
      <h2>${diagram.code} — ${escapeHtml(diagram.title)}</h2>
      <pre class="mermaid">${escapeHtml(diagram.source)}</pre>
    </section>`;
}

function buildPreview(sequenceDiagrams, decomposition) {
  const sequenceCards = sequenceDiagrams.map((item) => mermaidCard(item, 'sequence')).join('\n');
  const decompositionCard = mermaidCard(decomposition, 'decomposition');
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Bộ 15 sơ đồ — JinMath</title>
  <style>
    :root { color-scheme:light; --bg:#eef2f7; --card:#fff; --text:#172033; --muted:#526071; --line:#d8e0ea; }
    * { box-sizing:border-box; }
    body { margin:0; font-family:"Segoe UI",Arial,sans-serif; background:var(--bg); color:var(--text); }
    header { padding:22px 28px; background:#173b6c; color:#fff; }
    header h1 { margin:0 0 6px; font-size:26px; }
    header p { margin:0; opacity:.9; }
    nav { display:flex; flex-wrap:wrap; gap:8px; margin-top:14px; }
    nav a { color:#173b6c; background:#fff; text-decoration:none; padding:5px 10px; border-radius:999px; font-size:13px; }
    main { max-width:1500px; margin:auto; padding:22px; display:grid; gap:22px; }
    .group-title { margin:8px 0 -8px; padding-bottom:8px; border-bottom:2px solid #9fb4ce; }
    .card { background:var(--card); border:1px solid var(--line); border-radius:12px; padding:18px; overflow:auto; box-shadow:0 2px 7px rgba(15,23,42,.05); }
    .card h2 { margin:0 0 15px; font-size:18px; }
    .card img { display:block; max-width:100%; height:auto; margin:auto; }
    .mermaid { display:flex; justify-content:center; min-width:max-content; margin:0; background:#fff; }
    .mermaid svg { background:#fff; }
  </style>
</head>
<body>
  <header>
    <h1>Bộ 15 sơ đồ phân tích hệ thống JinMath</h1>
    <p>4 Use Case · 10 sơ đồ tuần tự · 1 sơ đồ phân rã chức năng</p>
    <nav><a href="#usecase">Use Case</a><a href="#sequence">Tuần tự</a><a href="#decomposition">Phân rã</a></nav>
  </header>
  <main>
    <h2 class="group-title" id="usecase">I. Bốn sơ đồ Use Case</h2>
    ${useCaseCards()}
    <h2 class="group-title" id="sequence">II. Mười sơ đồ tuần tự</h2>
    ${sequenceCards}
    <h2 class="group-title" id="decomposition">III. Sơ đồ phân rã chức năng</h2>
    ${decompositionCard}
  </main>
  <script type="module">
    import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
    mermaid.initialize({
      startOnLoad:true,
      theme:'neutral',
      securityLevel:'loose',
      flowchart:{ htmlLabels:true, curve:'basis', nodeSpacing:26, rankSpacing:42 },
      sequence:{ actorMargin:32, messageMargin:38, noteMargin:12, width:170 }
    });
  </script>
</body>
</html>`;
}

async function renderUseCasesWithKroki() {
  const sources = [
    'ucd-01-overview',
    'ucd-02-teacher',
    'ucd-03-student',
    'ucd-04-exam-taking',
  ];
  for (const baseName of sources) {
    const source = fs.readFileSync(path.join(DIAGRAMS, `${baseName}.puml`), 'utf8');
    for (const format of ['svg', 'png']) {
      const response = await fetch(`https://kroki.io/plantuml/${format}`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        body: source,
        signal: AbortSignal.timeout(120000),
      });
      if (!response.ok) {
        throw new Error(`Kroki không render được ${baseName}.${format}: HTTP ${response.status}`);
      }
      const output = Buffer.from(await response.arrayBuffer());
      fs.writeFileSync(path.join(DIAGRAMS, `${baseName}.${format}`), output);
    }
    console.log('saved', `docs\\diagrams\\${baseName}.svg`, 'and PNG');
  }
}

async function exportRenderedDiagrams(allDiagrams) {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--allow-file-access-from-files'],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1800, height: 1200, deviceScaleFactor: 2 });
    await page.goto(`file:///${PREVIEW.replaceAll('\\', '/')}`, { waitUntil: 'networkidle2', timeout: 120000 });
    await page.waitForFunction(
      (count) => document.querySelectorAll('.render-card .mermaid svg').length === count,
      { timeout: 120000 },
      allDiagrams.length,
    );

    for (const diagram of allDiagrams) {
      const card = await page.$(`[data-export="${diagram.filename}"]`);
      if (!card) throw new Error(`Không tìm thấy card ${diagram.filename}.`);
      const svgElement = await card.$('.mermaid svg');
      if (!svgElement) throw new Error(`Không render được SVG ${diagram.filename}.`);

      const outDir = diagram.kind === 'sequence' ? SEQUENCE_OUT : DIAGRAMS;
      const svgPath = path.join(outDir, `${diagram.filename}.svg`);
      const pngPath = path.join(outDir, `${diagram.filename}.png`);
      const svg = await svgElement.evaluate((element) => {
        const clone = element.cloneNode(true);
        clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        return `<?xml version="1.0" encoding="UTF-8"?>\n${clone.outerHTML}`;
      });
      fs.writeFileSync(svgPath, svg, 'utf8');
      await svgElement.screenshot({ path: pngPath, omitBackground: false });
      console.log('saved', path.relative(ROOT, svgPath), 'and PNG');
    }
  } finally {
    const chromeProcess = browser.process();
    await Promise.race([
      browser.close(),
      new Promise((resolve) => setTimeout(resolve, 5000)),
    ]);
    if (chromeProcess && !chromeProcess.killed) {
      chromeProcess.kill('SIGKILL');
    }
  }
}

(async () => {
  fs.mkdirSync(SEQUENCE_OUT, { recursive: true });

  const sequenceDiagrams = parseSequenceDiagrams(read('docs/sequence-diagrams.md'));
  for (const item of sequenceDiagrams) {
    fs.writeFileSync(path.join(SEQUENCE_OUT, `${item.filename}.mmd`), item.source, 'utf8');
  }

  const decompositionSource = parseFirstMermaid(read('docs/functional-decomposition.md'));
  const decomposition = {
    id: 'functional-decomposition',
    code: 'FDD-01',
    title: 'Phân rã chức năng hệ thống JinMath (mức 0–2)',
    filename: 'functional-decomposition',
    source: decompositionSource,
    kind: 'decomposition',
  };
  fs.writeFileSync(path.join(DIAGRAMS, 'functional-decomposition.mmd'), decompositionSource, 'utf8');

  if (!process.argv.includes('--skip-usecase')) {
    await renderUseCasesWithKroki();
  }
  fs.writeFileSync(PREVIEW, buildPreview(sequenceDiagrams, decomposition), 'utf8');
  await exportRenderedDiagrams([
    ...sequenceDiagrams.map((item) => ({ ...item, kind: 'sequence' })),
    decomposition,
  ]);
  console.log('DONE: 4 Use Case + 10 sequence + 1 phân rã.');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
