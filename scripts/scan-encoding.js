'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const EXTS = new Set(['.ejs', '.js', '.css', '.md', '.json', '.html', '.txt']);
const SKIP = new Set(['node_modules', 'vendor', '.git']);
const SELF_TEST_FILES = new Set(['scan-encoding.js', 'verify-vn.js']);

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (EXTS.has(path.extname(name)) && !SELF_TEST_FILES.has(name)) out.push(full);
  }
  return out;
}

function hasBom(buf) {
  return buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;
}

function looksMojibake(text) {
  return /Ã.|Ä.|á»|áº|â€|â—|ToÃ¡n|ÄÄƒng|GiÃ¡o|Há»|Kiá»|Máº|Táº|Ä‘á»|lâº|vá»/.test(text);
}

const dirs = ['src', 'public', 'docs', 'report', 'diagrams', 'scripts']
  .map((d) => path.join(ROOT, d))
  .filter((d) => fs.existsSync(d));

const files = dirs.flatMap((d) => walk(d));
const bad = [];

for (const file of files) {
  const buf = fs.readFileSync(file);
  const bom = hasBom(buf);
  const text = buf.toString('utf8');
  const badText = looksMojibake(text);
  if (bom || badText) {
    bad.push({
      file: path.relative(ROOT, file),
      bom,
      badText,
    });
  }
}

console.log(JSON.stringify(bad, null, 2));
console.log('TOTAL', bad.length);
if (bad.length > 0) {
  process.exitCode = 1;
}
