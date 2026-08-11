'use strict';

const mysql = require('mysql2/promise');

// Hỗ trợ cả biến dự án (DB_*) và biến mặc định của Railway MySQL (MYSQL*)
const pool = mysql.createPool({
  host: process.env.DB_HOST || process.env.MYSQLHOST || 'localhost',
  port: Number(process.env.DB_PORT || process.env.MYSQLPORT) || 3306,
  user: process.env.DB_USER || process.env.MYSQLUSER,
  password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '',
  database: process.env.DB_NAME || process.env.MYSQLDATABASE || 'web_kiem_tra_toan',
  timezone: process.env.DB_TIMEZONE || '+07:00',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

async function testDatabase() {
  const connection = await pool.getConnection();
  try {
    const timezone = process.env.DB_TIMEZONE || '+07:00';
    await connection.execute('SET time_zone = ?', [timezone]);
    await connection.execute('SELECT 1 AS ok');
  } finally {
    connection.release();
  }
}

module.exports = {
  pool,
  testDatabase,
};
