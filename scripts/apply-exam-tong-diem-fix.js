'use strict';

/**
 * Áp migration cho phép tong_diem = 0 trên đề nháp.
 * node scripts/apply-exam-tong-diem-fix.js
 */

require('dotenv').config();
const { pool } = require('../src/config/database');

async function main() {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [checks] = await conn.query(
      `SELECT CONSTRAINT_NAME
       FROM information_schema.TABLE_CONSTRAINTS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'de_thi'
         AND CONSTRAINT_NAME = 'chk_de_thi_tong_diem'
         AND CONSTRAINT_TYPE = 'CHECK'`,
    );

    if (checks.length) {
      await conn.query('ALTER TABLE de_thi DROP CHECK chk_de_thi_tong_diem');
      console.log('Dropped chk_de_thi_tong_diem');
    } else {
      console.log('chk_de_thi_tong_diem not found (skip drop)');
    }

    await conn.query(
      'ALTER TABLE de_thi ADD CONSTRAINT chk_de_thi_tong_diem CHECK (tong_diem >= 0)',
    );
    console.log('Added chk_de_thi_tong_diem (tong_diem >= 0)');

    await conn.query(
      `ALTER TABLE de_thi
       MODIFY COLUMN tong_diem DECIMAL(6,2) NOT NULL DEFAULT 0.00
       COMMENT 'Đồng bộ từ SUM(cau_hoi_de_thi.diem); nháp chưa có câu = 0'`,
    );
    console.log('Updated tong_diem DEFAULT to 0.00');

    // Smoke: insert nháp tong_diem=0 must succeed (rollback)
    await conn.query(
      `INSERT INTO de_thi
         (giao_vien_id, ten_de, thoi_luong_phut, tong_diem,
          thoi_gian_bat_dau, thoi_gian_ket_thuc, trang_thai)
       SELECT id, '__smoke_tong_diem_0__', 45, 0,
              NOW(), DATE_ADD(NOW(), INTERVAL 1 DAY), 'NHAP'
       FROM nguoi_dung WHERE vai_tro = 'GIAO_VIEN' LIMIT 1`,
    );
    await conn.query("DELETE FROM de_thi WHERE ten_de = '__smoke_tong_diem_0__'");
    console.log('Smoke insert tong_diem=0: OK');

    await conn.commit();
    console.log('Migration applied successfully.');
  } catch (error) {
    await conn.rollback();
    console.error('Migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    conn.release();
    await pool.end();
  }
}

main();
