'use strict';

/**
 * Đóng gói thư mục nộp niên luận (loại trừ .env, node_modules, uploads tạm…).
 * node scripts/package-submission.js
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'dist');
// Local calendar date (VN) — tránh ZIP mang nhãn ngày UTC lệch 1 ngày
const _now = new Date();
const STAMP = [
  _now.getFullYear(),
  String(_now.getMonth() + 1).padStart(2, '0'),
  String(_now.getDate()).padStart(2, '0'),
].join('-');
const ZIP_NAME = `JinMath-nien-luan-${STAMP}.zip`;
const ZIP_PATH = path.join(OUT_DIR, ZIP_NAME);

const exclude = [
  'node_modules',
  '.env',
  '.git',
  'dist',
  '.cursor',
  'coverage',
  'uploads',
];

fs.mkdirSync(OUT_DIR, { recursive: true });
if (fs.existsSync(ZIP_PATH)) {
  fs.unlinkSync(ZIP_PATH);
}

const excludeArgs = exclude.flatMap((item) => ['-xr!', item]);

// Prefer tar (Windows 10+) which creates zip when --format=zip
const tarArgs = [
  '-a',
  '-c',
  '-f', ZIP_PATH,
  ...exclude.map((item) => `--exclude=${item}`),
  '-C', ROOT,
  'src',
  'public',
  'database',
  'docs',
  'diagrams',
  'report',
  'screenshots',
  'test',
  'scripts',
  'package.json',
  'package-lock.json',
  '.env.example',
  'README.md',
  '.gitignore',
].filter((item, index, arr) => {
  // keep only existing top-level entries for -C ROOT listing; tar on Windows is picky
  return true;
});

// Seed sạch không phụ thuộc ảnh — không đóng gói uploads/ (thư mục tạo lúc chạy app).
const includeGlobs = [
  'src', 'public', 'database', 'docs', 'diagrams', 'report', 'screenshots',
  'test', 'scripts', 'package.json', 'package-lock.json', '.env.example',
  'README.md', '.gitignore',
].map((name) => path.join(ROOT, name)).filter((p) => fs.existsSync(p));

const ps = `
$ErrorActionPreference = 'Stop'
$dest = '${ZIP_PATH.replace(/'/g, "''")}'
if (Test-Path $dest) { Remove-Item $dest -Force }
$items = @(${includeGlobs.map((p) => `'${p.replace(/'/g, "''")}'`).join(',')})
Compress-Archive -Path $items -DestinationPath $dest -CompressionLevel Optimal
Write-Output "Created $dest"
Get-Item $dest | Select-Object FullName, Length
`;

const result = spawnSync('powershell', ['-NoProfile', '-Command', ps], {
  encoding: 'utf8',
  maxBuffer: 10 * 1024 * 1024,
});

if (result.status !== 0) {
  console.error(result.stderr || result.stdout);
  process.exit(1);
}
console.log(result.stdout);
