'use strict';

require('dotenv').config();
const { pool } = require('../src/config/database');

const sql = `
CREATE TABLE IF NOT EXISTS dat_lai_mat_khau (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nguoi_dung_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  het_han_luc DATETIME NOT NULL,
  da_su_dung TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_dlmk_nguoi_dung
    FOREIGN KEY (nguoi_dung_id) REFERENCES nguoi_dung(id) ON DELETE CASCADE,
  UNIQUE KEY uk_dlmk_token_hash (token_hash),
  INDEX idx_dlmk_user (nguoi_dung_id),
  INDEX idx_dlmk_expiry (het_han_luc)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`;

(async () => {
  try {
    await pool.query(sql);
    const [rows] = await pool.query("SHOW TABLES LIKE 'dat_lai_mat_khau'");
    console.log(rows.length ? 'CREATED_OK' : 'STILL_MISSING');
  } catch (error) {
    console.log('FAIL', error.code || error.message);
  } finally {
    await pool.end();
  }
})();
