'use strict';

require('dotenv').config();
const { pool } = require('../src/config/database');

async function columnExists() {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS n
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'cau_hoi'
       AND COLUMN_NAME = 'khoi_lop'`,
  );
  return Number(rows[0].n) > 0;
}

async function main() {
  if (await columnExists()) {
    console.log('khoi_lop already exists on cau_hoi');
  } else {
    await pool.execute(
      `ALTER TABLE cau_hoi
       ADD COLUMN khoi_lop TINYINT UNSIGNED NULL
         COMMENT 'Khối lớp (1–12) để lọc ngân hàng câu hỏi'
         AFTER chu_de_id`,
    );
    console.log('Added column khoi_lop');

    try {
      await pool.execute(
        `ALTER TABLE cau_hoi
         ADD CONSTRAINT chk_cau_hoi_khoi_lop
           CHECK (khoi_lop IS NULL OR (khoi_lop BETWEEN 1 AND 12))`,
      );
      console.log('Added check constraint');
    } catch (error) {
      if (error.code !== 'ER_CHECK_CONSTRAINT_DUP_NAME' && error.errno !== 3822) {
        throw error;
      }
    }

    try {
      await pool.execute('ALTER TABLE cau_hoi ADD INDEX idx_cau_hoi_khoi_lop (khoi_lop)');
      console.log('Added index');
    } catch (error) {
      if (error.code !== 'ER_DUP_KEYNAME') {
        throw error;
      }
    }
  }

  const [result] = await pool.execute(
    `UPDATE cau_hoi ch
     JOIN chu_de cd ON cd.id = ch.chu_de_id
     SET ch.khoi_lop = cd.khoi_lop
     WHERE ch.khoi_lop IS NULL AND cd.khoi_lop IS NOT NULL`,
  );
  console.log('Backfilled from topics:', result.affectedRows || 0);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
