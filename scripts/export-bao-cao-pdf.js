'use strict';

/**
 * Xuất report/bao-cao.pdf từ report/bao-cao.md bằng Chrome headless.
 * node scripts/export-bao-cao-pdf.js
 */

const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const puppeteer = require('puppeteer-core');

const ROOT = path.join(__dirname, '..');
const mdPath = path.join(ROOT, 'report', 'bao-cao.md');
const htmlPath = path.join(ROOT, 'report', 'bao-cao.html');
const pdfPath = path.join(ROOT, 'report', 'bao-cao.pdf');
const CHROME = process.env.CHROME_PATH
  || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const md = fs.readFileSync(mdPath, 'utf8');
const body = marked.parse(md);

const html = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8">
<title>Báo cáo niên luận — JinMath</title>
<style>
  @page { margin: 20mm 18mm; }
  body {
    font-family: "Times New Roman", "Segoe UI", serif;
    font-size: 12.5pt;
    line-height: 1.55;
    color: #152A46;
    max-width: 900px;
    margin: 0 auto;
  }
  h1, h2, h3, h4 { color: #152A46; page-break-after: avoid; }
  h1 { font-size: 20pt; text-align: center; margin-top: 1.5em; }
  h2 { font-size: 16pt; border-bottom: 1px solid #ccc; padding-bottom: 0.2em; margin-top: 1.4em; }
  h3 { font-size: 13.5pt; margin-top: 1.1em; }
  p, li { text-align: justify; }
  code, pre { font-family: Consolas, monospace; font-size: 10.5pt; }
  pre { background: #f6f8fa; padding: 10px; border-radius: 6px; overflow-x: auto; }
  table { border-collapse: collapse; width: 100%; margin: 1em 0; font-size: 11pt; }
  th, td { border: 1px solid #ccc; padding: 6px 8px; vertical-align: top; }
  th { background: #eef2f8; }
  img { max-width: 100%; }
  blockquote { border-left: 3px solid #3563E9; margin-left: 0; padding-left: 1em; color: #444; }
</style>
</head>
<body>
${body}
</body>
</html>`;

fs.writeFileSync(htmlPath, html, 'utf8');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage();
  await page.goto('file:///' + htmlPath.replace(/\\/g, '/'), { waitUntil: 'networkidle0' });
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '18mm', bottom: '18mm', left: '16mm', right: '16mm' },
  });
  await browser.close();
  console.log('Wrote', pdfPath, `(${Math.round(fs.statSync(pdfPath).size / 1024)} KB)`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
