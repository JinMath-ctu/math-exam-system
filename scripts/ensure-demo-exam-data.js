'use strict';

/**
 * Đảm bảo teacher@example.com có đủ lớp + 4 câu + đề + phân công (không xóa user khác).
 * node scripts/ensure-demo-exam-data.js
 */

require('dotenv').config({ quiet: true });
const { pool } = require('../src/config/database');

const HASH = '$2b$10$2JpBZaFWmlxfSxpo/MDdnOlx5V7DHTmK2XVgNS2vYUZrfJexR.0pe';

async function ensureUser(email, hoTen, vaiTro) {
  const [rows] = await pool.execute('SELECT id FROM nguoi_dung WHERE email = ? LIMIT 1', [email]);
  if (rows.length) {
    await pool.execute(
      `UPDATE nguoi_dung SET ho_ten = ?, mat_khau_hash = ?, vai_tro = ?, trang_thai = 'HOAT_DONG' WHERE id = ?`,
      [hoTen, HASH, vaiTro, rows[0].id],
    );
    return rows[0].id;
  }
  const [result] = await pool.execute(
    `INSERT INTO nguoi_dung (ho_ten, email, mat_khau_hash, vai_tro, trang_thai)
     VALUES (?, ?, ?, ?, 'HOAT_DONG')`,
    [hoTen, email, HASH, vaiTro],
  );
  return result.insertId;
}

(async () => {
  const gvId = await ensureUser('teacher@example.com', 'Giáo viên demo', 'GIAO_VIEN');
  const hsA = await ensureUser('studenta@example.com', 'Học sinh demo A', 'HOC_SINH');
  const hsB = await ensureUser('studentb@example.com', 'Học sinh demo B', 'HOC_SINH');

  let [[klass]] = await pool.query(
    "SELECT id FROM lop_hoc WHERE giao_vien_id = ? AND ma_lop = 'TOAN10A1' LIMIT 1",
    [gvId],
  );
  if (!klass) {
    const [r] = await pool.execute(
      `INSERT INTO lop_hoc (giao_vien_id, ten_lop, ma_lop, mo_ta, trang_thai)
       VALUES (?, 'Toán 10A1', 'TOAN10A1', 'Lớp demo', 'HOAT_DONG')`,
      [gvId],
    );
    klass = { id: r.insertId };
  }

  for (const hsId of [hsA, hsB]) {
    const [mem] = await pool.query(
      'SELECT id FROM thanh_vien_lop WHERE lop_hoc_id = ? AND hoc_sinh_id = ? LIMIT 1',
      [klass.id, hsId],
    );
    if (!mem.length) {
      await pool.execute(
        `INSERT INTO thanh_vien_lop (lop_hoc_id, hoc_sinh_id, trang_thai) VALUES (?, ?, 'DANG_HOC')`,
        [klass.id, hsId],
      );
    }
  }

  let [[topic]] = await pool.query(
    'SELECT id FROM chu_de WHERE giao_vien_id = ? ORDER BY id ASC LIMIT 1',
    [gvId],
  );
  if (!topic) {
    const [r] = await pool.execute(
      `INSERT INTO chu_de (giao_vien_id, ten_chu_de, khoi_lop, mo_ta)
       VALUES (?, 'Phương trình bậc hai', 10, 'Chủ đề demo')`,
      [gvId],
    );
    topic = { id: r.insertId };
  }

  const [qs] = await pool.query(
    'SELECT id, loai_cau_hoi FROM cau_hoi WHERE giao_vien_id = ? AND trang_thai = \'HOAT_DONG\'',
    [gvId],
  );
  const byType = Object.fromEntries(qs.map((q) => [q.loai_cau_hoi, q.id]));

  async function ensureQuestion(type, builder) {
    if (byType[type]) return byType[type];
    const id = await builder();
    byType[type] = id;
    return id;
  }

  const q1 = await ensureQuestion('MOT_DAP_AN', async () => {
    const [r] = await pool.execute(
      `INSERT INTO cau_hoi (giao_vien_id, chu_de_id, khoi_lop, loai_cau_hoi, noi_dung, muc_do, diem_mac_dinh, loi_giai, trang_thai)
       VALUES (?, ?, 10, 'MOT_DAP_AN', 'Phương trình $x^2 - 5x + 6 = 0$ có nghiệm là:', 'THONG_HIEU', 1.00, 'x=2 hoặc x=3', 'HOAT_DONG')`,
      [gvId, topic.id],
    );
    const id = r.insertId;
    await pool.query(
      `INSERT INTO dap_an (cau_hoi_id, noi_dung, la_dap_an_dung, thu_tu) VALUES
         (?, 'x = 2 hoặc x = 3', TRUE, 1),
         (?, 'x = -2 hoặc x = -3', FALSE, 2),
         (?, 'x = 1 hoặc x = 6', FALSE, 3),
         (?, 'Vô nghiệm', FALSE, 4)`,
      [id, id, id, id],
    );
    return id;
  });

  const q2 = await ensureQuestion('DUNG_SAI', async () => {
    const [r] = await pool.execute(
      `INSERT INTO cau_hoi (giao_vien_id, chu_de_id, khoi_lop, loai_cau_hoi, noi_dung, muc_do, diem_mac_dinh, loi_giai, trang_thai)
       VALUES (?, ?, 10, 'DUNG_SAI', 'Xét $x^2 - 5x + 6 = 0$. Phát biểu đúng/sai:', 'NHAN_BIET', 1.00, 'Có 2 nghiệm', 'HOAT_DONG')`,
      [gvId, topic.id],
    );
    const id = r.insertId;
    await pool.query(
      `INSERT INTO dap_an (cau_hoi_id, noi_dung, la_dap_an_dung, thu_tu) VALUES
         (?, 'Có hai nghiệm thực phân biệt.', TRUE, 1),
         (?, 'Tổng hai nghiệm bằng 5.', TRUE, 2),
         (?, 'Tích hai nghiệm bằng $-6$.', FALSE, 3),
         (?, 'Vô nghiệm thực.', FALSE, 4)`,
      [id, id, id, id],
    );
    return id;
  });

  const q3 = await ensureQuestion('TRA_LOI_NGAN', async () => {
    const [r] = await pool.execute(
      `INSERT INTO cau_hoi (giao_vien_id, chu_de_id, khoi_lop, loai_cau_hoi, noi_dung, muc_do, diem_mac_dinh, dap_an_ngan_chuan, loi_giai, trang_thai)
       VALUES (?, ?, 10, 'TRA_LOI_NGAN', 'Tổng hai nghiệm của $x^2 - 5x + 6 = 0$?', 'THONG_HIEU', 1.00, '5', 'Vi-et', 'HOAT_DONG')`,
      [gvId, topic.id],
    );
    return r.insertId;
  });

  const q4 = await ensureQuestion('TU_LUAN', async () => {
    const [r] = await pool.execute(
      `INSERT INTO cau_hoi (giao_vien_id, chu_de_id, khoi_lop, loai_cau_hoi, noi_dung, muc_do, diem_mac_dinh, loi_giai, trang_thai)
       VALUES (?, ?, 10, 'TU_LUAN', 'Giải $x^2 - 5x + 6 = 0$ và trình bày.', 'VAN_DUNG', 2.00, 'x=2 hoặc x=3', 'HOAT_DONG')`,
      [gvId, topic.id],
    );
    return r.insertId;
  });

  let [[exam]] = await pool.query(
    `SELECT id FROM de_thi
     WHERE giao_vien_id = ? AND ten_de = 'Kiểm tra 15 phút - Phương trình bậc hai'
     ORDER BY id DESC LIMIT 1`,
    [gvId],
  );

  if (!exam) {
    const [r] = await pool.execute(
      `INSERT INTO de_thi
         (giao_vien_id, ten_de, mo_ta, thoi_luong_phut, tong_diem,
          thoi_gian_bat_dau, thoi_gian_ket_thuc, so_lan_duoc_lam, tron_cau_hoi, cho_xem_dap_an, trang_thai)
       VALUES (?, 'Kiểm tra 15 phút - Phương trình bậc hai', 'Đề demo', 15, 5.00,
               NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY), 1, 1, 1, 'NHAP')`,
      [gvId],
    );
    exam = { id: r.insertId };
  } else {
    await pool.execute(
      `UPDATE de_thi
       SET thoi_gian_bat_dau = NOW(), thoi_gian_ket_thuc = DATE_ADD(NOW(), INTERVAL 7 DAY), tong_diem = 5.00
       WHERE id = ?`,
      [exam.id],
    );
  }

  await pool.execute('DELETE FROM cau_hoi_de_thi WHERE de_thi_id = ?', [exam.id]);
  await pool.query(
    `INSERT INTO cau_hoi_de_thi (de_thi_id, cau_hoi_id, thu_tu_goc, diem) VALUES
       (?, ?, 1, 1.00), (?, ?, 2, 1.00), (?, ?, 3, 1.00), (?, ?, 4, 2.00)`,
    [exam.id, q1, exam.id, q2, exam.id, q3, exam.id, q4],
  );

  const [assign] = await pool.query(
    'SELECT id FROM phan_cong_de WHERE de_thi_id = ? AND lop_hoc_id = ? LIMIT 1',
    [exam.id, klass.id],
  );
  if (!assign.length) {
    await pool.execute(
      'INSERT INTO phan_cong_de (de_thi_id, lop_hoc_id) VALUES (?, ?)',
      [exam.id, klass.id],
    );
  }

  console.log(JSON.stringify({
    gvId, hsA, hsB, classId: klass.id, examId: exam.id, questions: { q1, q2, q3, q4 },
  }));
  await pool.end();
})().catch(async (error) => {
  console.error(error);
  try { await pool.end(); } catch {}
  process.exit(1);
});
