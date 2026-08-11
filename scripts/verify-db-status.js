'use strict';

require('dotenv').config({ quiet: true });
const { pool } = require('../src/config/database');

(async () => {
  const [[db]] = await pool.query('SELECT DATABASE() AS db');

  const [tables] = await pool.query("SHOW TABLES LIKE 'dat_lai_mat_khau'");

  const [chk] = await pool.query(
    `SELECT CHECK_CLAUSE
     FROM information_schema.CHECK_CONSTRAINTS
     WHERE CONSTRAINT_SCHEMA = DATABASE()
       AND CONSTRAINT_NAME = 'chk_de_thi_tong_diem'`,
  );

  const [ds] = await pool.query(
    `SELECT c.id, COUNT(d.id) AS n
     FROM cau_hoi c
     LEFT JOIN dap_an d ON d.cau_hoi_id = c.id
     WHERE c.loai_cau_hoi = 'DUNG_SAI'
     GROUP BY c.id`,
  );

  const [users] = await pool.query(
    `SELECT email, vai_tro
     FROM nguoi_dung
     WHERE email IN ('teacher@example.com', 'studenta@example.com', 'studentb@example.com')
     ORDER BY email`,
  );

  const [exams] = await pool.query(
    'SELECT id, ten_de, trang_thai, tong_diem FROM de_thi ORDER BY id DESC LIMIT 5',
  );

  console.log(JSON.stringify({
    database: db.db,
    passwordResetTable: tables.length > 0,
    tongDiemCheck: chk[0] ? chk[0].CHECK_CLAUSE : null,
    dungSaiAnswers: ds,
    demoUsers: users,
    recentExams: exams,
  }, null, 2));

  await pool.end();
})().catch(async (error) => {
  console.error(error.message);
  try { await pool.end(); } catch {}
  process.exit(1);
});
