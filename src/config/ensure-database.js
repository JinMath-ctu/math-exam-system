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

    // demo-backup cũ có thể thiếu cau_hoi.khoi_lop — code hiện tại cần cột này.
    const [khoiCols] = await conn.query(
      `SELECT COUNT(*) AS n
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'cau_hoi' AND COLUMN_NAME = 'khoi_lop'`,
      [dbName],
    );
    if (Number(khoiCols[0].n) === 0) {
      console.log('Thêm cột cau_hoi.khoi_lop ...');
      await conn.query(`
        ALTER TABLE cau_hoi
          ADD COLUMN khoi_lop TINYINT UNSIGNED NULL
            COMMENT 'Khối lớp (1–12) để lọc ngân hàng câu hỏi'
            AFTER chu_de_id
      `);
      await conn.query(`
        ALTER TABLE cau_hoi
          ADD CONSTRAINT chk_cau_hoi_khoi_lop
            CHECK (khoi_lop IS NULL OR (khoi_lop BETWEEN 1 AND 12))
      `).catch(() => {});
      await conn.query(`
        ALTER TABLE cau_hoi
          ADD INDEX idx_cau_hoi_khoi_lop (khoi_lop)
      `).catch(() => {});
      await conn.query(`
        UPDATE cau_hoi ch
        JOIN chu_de cd ON cd.id = ch.chu_de_id
        SET ch.khoi_lop = cd.khoi_lop
        WHERE ch.khoi_lop IS NULL AND cd.khoi_lop IS NOT NULL
      `);
      console.log('Đã thêm cau_hoi.khoi_lop.');
    }

    return { imported: tables.length === 0 };
  } finally {
    await conn.end();
  }
}

module.exports = {
  ensureDatabaseReady,
  databaseName,
};
