'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const EXTS = new Set(['.ejs', '.js', '.css', '.md', '.json', '.html', '.txt']);
const SKIP = new Set(['node_modules', 'vendor', '.git']);

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (EXTS.has(path.extname(name))) out.push(full);
  }
  return out;
}

function stripBom(file) {
  const buf = fs.readFileSync(file);
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    fs.writeFileSync(file, buf.slice(3));
    return true;
  }
  return false;
}

const dirs = ['src', 'public', 'docs', 'report', 'diagrams', 'scripts']
  .map((d) => path.join(ROOT, d));

let count = 0;
for (const dir of dirs) {
  for (const file of walk(dir)) {
    if (stripBom(file)) {
      count += 1;
      console.log('stripped BOM:', path.relative(ROOT, file));
    }
  }
}

console.log('DONE stripped', count);
