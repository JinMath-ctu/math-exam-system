'use strict';

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

function dbConfig() {
  return {
    host: process.env.DB_HOST || process.env.MYSQLHOST || 'localhost',
    port: Number(process.env.DB_PORT || process.env.MYSQLPORT) || 3306,
    user: process.env.DB_USER || process.env.MYSQLUSER,
    password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '',
  };
}

function databaseName() {
  return process.env.DB_NAME || process.env.MYSQLDATABASE || 'web_kiem_tra_toan';
}

/**
 * Tạo database nếu thiếu; nếu chưa có bảng thì nạp demo-backup.sql (1 lần).
 * Phục vụ Railway / máy mới không cần TCP Proxy import thủ công.
 */
async function ensureDatabaseReady() {
  const base = dbConfig();
  const dbName = databaseName();
  if (!base.host || !base.user) {
    throw new Error('Thiếu cấu hình DB_HOST/DB_USER (hoặc MYSQL*)');
  }

  const conn = await mysql.createConnection({
    ...base,
    multipleStatements: true,
    charset: 'utf8mb4',
  });

  try {
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
    await conn.query(`USE \`${dbName}\``);

    const [tables] = await conn.query("SHOW TABLES LIKE 'nguoi_dung'");
    if (tables.length === 0) {
      const sqlPath = path.join(__dirname, '..', '..', 'database', 'demo-backup.sql');
      if (!fs.existsSync(sqlPath)) {
        throw new Error(`Chưa có bảng và không tìm thấy ${sqlPath}`);
      }

      console.log(`Database '${dbName}' trống — đang nạp demo-backup.sql ...`);
      const sql = fs.readFileSync(sqlPath, 'utf8');
      await conn.query(sql);
      console.log('Đã nạp dữ liệu demo (teacher@ / studenta@ — mật khẩu 123456).');
    } else {
      console.log(`Database '${dbName}' đã sẵn sàng.`);
    }

    // express-mysql-session cần bảng sessions (demo-backup không có).
    // Store được khởi tạo trước khi DB sẵn sàng nên có thể bỏ lỡ bước tự tạo.
    await conn.query(`
      CREATE TABLE IF NOT EXISTS \`sessions\` (
        \`session_id\` varchar(128) NOT NULL,
        \`expires\` int unsigned NOT NULL,
        \`data\` mediumtext,
        PRIMARY KEY (\`session_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin
    `);

    return { imported: tables.length === 0 };
  } finally {
    await conn.end();
  }
}

module.exports = {
  ensureDatabaseReady,
  databaseName,
};
