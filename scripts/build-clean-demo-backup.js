'use strict';

/**
 * Tạo database/demo-backup.sql SẠCH từ schema.sql + seed.sql
 * (không dump DB đang chạy — tránh lộ email cá nhân, sessions, token reset).
 *
 * node scripts/build-clean-demo-backup.js
 */

require('dotenv').config({ quiet: true });
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const ROOT = path.join(__dirname, '..');
const outPath = path.join(ROOT, 'database', 'demo-backup.sql');
const TEMP_DB = 'web_kiem_tra_toan_clean_export';

const mysqlBinCandidates = [
  'C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysql.exe',
  'C:\\xampp\\mysql\\bin\\mysql.exe',
];
const dumpCandidates = [
  'C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysqldump.exe',
  'C:\\xampp\\mysql\\bin\\mysqldump.exe',
];

const mysqlBin = mysqlBinCandidates.find((p) => fs.existsSync(p));
const mysqldump = dumpCandidates.find((p) => fs.existsSync(p));

if (!mysqlBin || !mysqldump) {
  console.error('Không tìm thấy mysql.exe / mysqldump.exe');
  process.exit(1);
}

const host = process.env.DB_HOST || 'localhost';
const port = String(process.env.DB_PORT || 3306);
const user = process.env.DB_USER;
const password = process.env.DB_PASSWORD || '';

if (!user) {
  console.error('Thiếu DB_USER trong .env');
  process.exit(1);
}

function run(bin, args, inputFile) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, {
      env: { ...process.env, MYSQL_PWD: password },
      stdio: inputFile ? ['pipe', 'pipe', 'pipe'] : ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (buf) => { stdout += buf.toString(); });
    child.stderr.on('data', (buf) => { stderr += buf.toString(); });
    if (inputFile) {
      fs.createReadStream(inputFile).pipe(child.stdin);
    }
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`${path.basename(bin)} failed: ${stderr || stdout || code}`));
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

function dumpArgs(database) {
  return [
    `-h${host}`,
    `-P${port}`,
    `-u${user}`,
    '--databases', database,
    '--routines',
    '--triggers',
    '--single-transaction',
    '--default-character-set=utf8mb4',
    '--set-gtid-purged=OFF',
    `--ignore-table=${database}.sessions`,
  ];
}

(async () => {
  const admin = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user,
    password,
    multipleStatements: true,
  });

  try {
    await admin.query(`DROP DATABASE IF EXISTS \`${TEMP_DB}\``);
    await admin.query(
      `CREATE DATABASE \`${TEMP_DB}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
  } finally {
    await admin.end();
  }

  // schema.sql tạo DB web_kiem_tra_toan — rewrite tạm sang TEMP_DB
  const schemaRaw = fs.readFileSync(path.join(ROOT, 'database', 'schema.sql'), 'utf8');
  const seedRaw = fs.readFileSync(path.join(ROOT, 'database', 'seed.sql'), 'utf8');

  const schemaForTemp = schemaRaw
    .replace(/CREATE DATABASE IF NOT EXISTS web_kiem_tra_toan[\s\S]*?USE web_kiem_tra_toan;/m,
      `USE \`${TEMP_DB}\`;`)
    .replace(/USE web_kiem_tra_toan;/g, `USE \`${TEMP_DB}\`;`);

  const seedForTemp = seedRaw
    .replace(/USE web_kiem_tra_toan;/g, `USE \`${TEMP_DB}\`;`);

  const tempSchema = path.join(ROOT, 'database', '.tmp-clean-schema.sql');
  const tempSeed = path.join(ROOT, 'database', '.tmp-clean-seed.sql');
  fs.writeFileSync(tempSchema, schemaForTemp, 'utf8');
  fs.writeFileSync(tempSeed, seedForTemp, 'utf8');

  const mysqlArgs = [`-h${host}`, `-P${port}`, `-u${user}`];

  try {
    await run(mysqlBin, mysqlArgs, tempSchema);
    await run(mysqlBin, mysqlArgs, tempSeed);

    const dump = await new Promise((resolve, reject) => {
      const child = spawn(mysqldump, dumpArgs(TEMP_DB), {
        env: { ...process.env, MYSQL_PWD: password },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      const chunks = [];
      let err = '';
      child.stdout.on('data', (buf) => chunks.push(buf));
      child.stderr.on('data', (buf) => { err += buf.toString(); });
      child.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(err || `mysqldump exit ${code}`));
          return;
        }
        resolve(Buffer.concat(chunks).toString('utf8'));
      });
    });

    // Đổi tên DB trong dump về web_kiem_tra_toan để restore đúng
    const normalized = dump
      .replace(new RegExp(TEMP_DB, 'g'), 'web_kiem_tra_toan');

    const header = [
      '-- Demo backup SẠCH cho math-exam-system / JinMath',
      `-- Generated: ${new Date().toISOString()}`,
      '-- Nguồn: schema.sql + seed.sql (không dump DB đang chạy)',
      '-- Chỉ gồm 3 tài khoản demo; dat_lai_mat_khau rỗng; không có sessions data',
      '-- Restore: mysql -u root -p < database/demo-backup.sql',
      '',
    ].join('\n');

    fs.writeFileSync(outPath, header + normalized, 'utf8');
    console.log('Wrote clean', outPath, `(${Math.round(Buffer.byteLength(header + normalized) / 1024)} KB)`);
  } finally {
    for (const file of [tempSchema, tempSeed]) {
      try { fs.unlinkSync(file); } catch {}
    }
    const cleanup = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 3306),
      user,
      password,
    });
    try {
      await cleanup.query(`DROP DATABASE IF EXISTS \`${TEMP_DB}\``);
    } finally {
      await cleanup.end();
    }
  }
})().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
