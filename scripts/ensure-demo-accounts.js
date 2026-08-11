'use strict';

/**
 * Đảm bảo 3 tài khoản demo seed tồn tại (không xóa user khác).
 * node scripts/ensure-demo-accounts.js
 */

require('dotenv').config({ quiet: true });
const { pool } = require('../src/config/database');

// Hash bcrypt của '123456' lấy từ database/seed.sql
const HASH_123456 = '$2b$10$2JpBZaFWmlxfSxpo/MDdnOlx5V7DHTmK2XVgNS2vYUZrfJexR.0pe';

const demos = [
  { hoTen: 'Giáo viên demo', email: 'teacher@example.com', vaiTro: 'GIAO_VIEN' },
  { hoTen: 'Học sinh demo A', email: 'studenta@example.com', vaiTro: 'HOC_SINH' },
  { hoTen: 'Học sinh demo B', email: 'studentb@example.com', vaiTro: 'HOC_SINH' },
];

(async () => {
  for (const user of demos) {
    const [rows] = await pool.execute(
      'SELECT id FROM nguoi_dung WHERE email = ? LIMIT 1',
      [user.email],
    );
    if (rows.length) {
      await pool.execute(
        `UPDATE nguoi_dung
         SET ho_ten = ?, mat_khau_hash = ?, vai_tro = ?, trang_thai = 'HOAT_DONG'
         WHERE email = ?`,
        [user.hoTen, HASH_123456, user.vaiTro, user.email],
      );
      console.log('updated', user.email);
    } else {
      await pool.execute(
        `INSERT INTO nguoi_dung (ho_ten, email, mat_khau_hash, vai_tro, trang_thai)
         VALUES (?, ?, ?, ?, 'HOAT_DONG')`,
        [user.hoTen, user.email, HASH_123456, user.vaiTro],
      );
      console.log('created', user.email);
    }
  }

  // Đảm bảo có lớp demo gắn GV nếu chưa có
  const [[gv]] = await pool.query(
    "SELECT id FROM nguoi_dung WHERE email = 'teacher@example.com' LIMIT 1",
  );
  const [classes] = await pool.query(
    "SELECT id FROM lop_hoc WHERE giao_vien_id = ? AND ma_lop = 'TOAN10A1' LIMIT 1",
    [gv.id],
  );
  if (!classes.length) {
    await pool.execute(
      `INSERT INTO lop_hoc (giao_vien_id, ten_lop, ma_lop, mo_ta, trang_thai)
       VALUES (?, 'Toán 10A1', 'TOAN10A1', 'Lớp demo dùng để kiểm thử hệ thống', 'HOAT_DONG')`,
      [gv.id],
    );
    console.log('created class TOAN10A1');
  }

  const [[klass]] = await pool.query(
    "SELECT id FROM lop_hoc WHERE ma_lop = 'TOAN10A1' AND giao_vien_id = ? LIMIT 1",
    [gv.id],
  );

  for (const email of ['studenta@example.com', 'studentb@example.com']) {
    const [[hs]] = await pool.query('SELECT id FROM nguoi_dung WHERE email = ? LIMIT 1', [email]);
    const [mem] = await pool.query(
      'SELECT id FROM thanh_vien_lop WHERE lop_hoc_id = ? AND hoc_sinh_id = ? LIMIT 1',
      [klass.id, hs.id],
    );
    if (!mem.length) {
      await pool.execute(
        `INSERT INTO thanh_vien_lop (lop_hoc_id, hoc_sinh_id, trang_thai)
         VALUES (?, ?, 'DANG_HOC')`,
        [klass.id, hs.id],
      );
      console.log('joined', email, '-> TOAN10A1');
    }
  }

  await pool.end();
  console.log('Demo accounts ready: teacher@ / studenta@ / studentb@  password 123456');
})().catch(async (error) => {
  console.error(error);
  try { await pool.end(); } catch {}
  process.exit(1);
});
