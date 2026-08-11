'use strict';

/**
 * Chuyển câu DUNG_SAI cũ (2 lựa chọn Đúng/Sai) sang 4 mệnh đề.
 * node scripts/apply-dung-sai-4-statements.js
 */

require('dotenv').config();
const { pool } = require('../src/config/database');

async function main() {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [questions] = await conn.query(
      `SELECT id, noi_dung FROM cau_hoi WHERE loai_cau_hoi = 'DUNG_SAI'`,
    );

    let converted = 0;

    for (const question of questions) {
      const [answers] = await conn.query(
        `SELECT id, noi_dung, la_dap_an_dung, thu_tu
         FROM dap_an WHERE cau_hoi_id = ? ORDER BY thu_tu ASC, id ASC`,
        [question.id],
      );

      const looksLegacy = answers.length === 2
        && answers.every((row) => row.noi_dung === 'Đúng' || row.noi_dung === 'Sai');

      const alreadyFour = answers.length === 4
        && !answers.every((row) => row.noi_dung === 'Đúng' || row.noi_dung === 'Sai');

      if (alreadyFour) {
        continue;
      }

      if (!looksLegacy && answers.length !== 0) {
        console.log(`Skip question #${question.id}: không nhận dạng được định dạng cũ (${answers.length} đáp án).`);
        continue;
      }

      // Xóa đáp án cũ của học sinh trước (FK tới dap_an)
      await conn.query(
        `UPDATE chi_tiet_bai_lam
         SET dap_an_da_chon_id = NULL,
             noi_dung_tra_loi = NULL,
             la_dung = NULL,
             diem_dat_duoc = 0
         WHERE cau_hoi_id = ?`,
        [question.id],
      );

      await conn.query('DELETE FROM dap_an WHERE cau_hoi_id = ?', [question.id]);
      await conn.query(
        `UPDATE cau_hoi
         SET noi_dung = ?,
             loi_giai = ?
         WHERE id = ?`,
        [
          'Xét phương trình bậc hai $x^2 - 5x + 6 = 0$. Phát biểu nào sau đây đúng/sai?',
          'Delta = 1 > 0 nên có 2 nghiệm thực phân biệt x=2, x=3. Tổng nghiệm = 5, tích = 6.',
          question.id,
        ],
      );

      await conn.query(
        `INSERT INTO dap_an (cau_hoi_id, noi_dung, la_dap_an_dung, thu_tu) VALUES
           (?, 'Phương trình có hai nghiệm thực phân biệt.', TRUE, 1),
           (?, 'Tổng hai nghiệm bằng 5.', TRUE, 2),
           (?, 'Tích hai nghiệm bằng $-6$.', FALSE, 3),
           (?, 'Phương trình vô nghiệm thực.', FALSE, 4)`,
        [question.id, question.id, question.id, question.id],
      );

      converted += 1;
      console.log(`Converted DUNG_SAI question #${question.id}`);
    }

    await conn.commit();
    console.log(`Done. Converted ${converted} question(s).`);
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
