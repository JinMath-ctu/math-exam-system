'use strict';

/**
 * Tạo DB + nạp demo trên Railway (chạy 1 lần trong container web).
 * Không cần TCP Proxy từ máy local.
 *
 * Usage (Railway Console / one-off start):
 *   node scripts/init-railway-db.js
 *
 * Sau khi xong: Start Command lại thành `npm start` và Redeploy.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function main() {
  const host = process.env.DB_HOST || process.env.MYSQLHOST;
  const port = Number(process.env.DB_PORT || process.env.MYSQLPORT) || 3306;
  const user = process.env.DB_USER || process.env.MYSQLUSER;
  const password = process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '';

  if (!host || !user) {
    throw new Error('Thiếu DB_HOST/MYSQLHOST hoặc DB_USER/MYSQLUSER');
  }

  const sqlPath = path.join(__dirname, '..', 'database', 'demo-backup.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log(`Connecting ${user}@${host}:${port} (no default database)...`);
  const conn = await mysql.createConnection({
    host,
    port,
    user,
    password,
    multipleStatements: true,
    charset: 'utf8mb4',
  });

  try {
    console.log('Importing database/demo-backup.sql ...');
    await conn.query(sql);
    console.log('OK: database web_kiem_tra_toan + demo data sẵn sàng.');
    console.log('Accounts: teacher@example.com / studenta@example.com  password 123456');
  } finally {
    await conn.end();
  }
}

main().catch((error) => {
  console.error('INIT DB FAILED:', error.message);
  process.exit(1);
});
