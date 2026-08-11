'use strict';

const { pool } = require('../config/database');

function getExecutor(executor) {
  return executor || pool;
}

const EXAM_COLUMNS = `
  dt.id, dt.giao_vien_id, dt.ten_de, dt.mo_ta, dt.thoi_luong_phut, dt.tong_diem,
  dt.thoi_gian_bat_dau, dt.thoi_gian_ket_thuc, dt.so_lan_duoc_lam, dt.tron_cau_hoi,
  dt.cho_xem_dap_an, dt.da_cong_bo_ket_qua, dt.thoi_gian_cong_bo_ket_qua,
  dt.trang_thai, dt.created_at, dt.updated_at
`;

function buildListFilters({ giaoVienId, trangThai, q }) {
  const conditions = ['dt.giao_vien_id = ?'];
  const params = [giaoVienId];

  if (trangThai) {
    conditions.push('dt.trang_thai = ?');
    params.push(trangThai);
  }

  if (q) {
    conditions.push('dt.ten_de LIKE ?');
    params.push(`%${q}%`);
  }

  return { where: conditions.join(' AND '), params };
}

async function list(filters) {
  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(filters.limit) || 20));
  const offset = (page - 1) * limit;

  const { where, params } = buildListFilters(filters);

  const [rows] = await pool.query(
    `SELECT ${EXAM_COLUMNS}
     FROM de_thi dt
     WHERE ${where}
     ORDER BY dt.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM de_thi dt WHERE ${where}`,
    params,
  );

  const total = countRows[0]?.total || 0;

  return {
    rows,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

async function findById(id, executor) {
  const db = getExecutor(executor);
  const [rows] = await db.execute(
    `SELECT ${EXAM_COLUMNS} FROM de_thi dt WHERE dt.id = ? LIMIT 1`,
    [id],
  );

  return rows[0] || null;
}

async function findByIdForUpdate(connection, id) {
  const [rows] = await connection.execute(
    `SELECT ${EXAM_COLUMNS} FROM de_thi dt WHERE dt.id = ? LIMIT 1 FOR UPDATE`,
    [id],
  );

  return rows[0] || null;
}

async function findByIdForTeacherForUpdate(connection, id, giaoVienId) {
  const [rows] = await connection.execute(
    `SELECT ${EXAM_COLUMNS}
     FROM de_thi dt
     WHERE dt.id = ? AND dt.giao_vien_id = ?
     LIMIT 1 FOR UPDATE`,
    [id, giaoVienId],
  );

  return rows[0] || null;
}

async function findByIdForTeacher(id, giaoVienId) {
  const exam = await findById(id);
  if (!exam || Number(exam.giao_vien_id) !== Number(giaoVienId)) {
    return null;
  }

  return exam;
}

async function create(data, connection) {
  const runner = connection || pool;
  // tong_diem = 0 khi mới tạo; sync lại khi thêm/sửa/xóa câu (CHECK cho phép >= 0)
  const [result] = await runner.execute(
    `INSERT INTO de_thi
       (giao_vien_id, ten_de, mo_ta, thoi_luong_phut, tong_diem, thoi_gian_bat_dau,
        thoi_gian_ket_thuc, so_lan_duoc_lam, tron_cau_hoi, cho_xem_dap_an, trang_thai)
     VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?, 'NHAP')`,
    [
      data.giaoVienId,
      data.tenDe,
      data.moTa || null,
      data.thoiLuongPhut,
      data.thoiGianBatDau,
      data.thoiGianKetThuc,
      data.soLanDuocLam,
      data.tronCauHoi,
      data.choXemDapAn,
    ],
  );

  return result.insertId;
}

async function updateMeta(id, data) {
  await pool.execute(
    `UPDATE de_thi
     SET ten_de = ?, mo_ta = ?, thoi_luong_phut = ?, thoi_gian_bat_dau = ?,
         thoi_gian_ket_thuc = ?, so_lan_duoc_lam = ?, tron_cau_hoi = ?, cho_xem_dap_an = ?
     WHERE id = ?`,
    [
      data.tenDe,
      data.moTa || null,
      data.thoiLuongPhut,
      data.thoiGianBatDau,
      data.thoiGianKetThuc,
      data.soLanDuocLam,
      data.tronCauHoi,
      data.choXemDapAn,
      id,
    ],
  );
}

async function updateTongDiem(connection, id, tongDiem) {
  const runner = connection || pool;
  await runner.execute('UPDATE de_thi SET tong_diem = ? WHERE id = ?', [tongDiem, id]);
}

async function setTrangThai(id, trangThai) {
  const [result] = await pool.execute(
    'UPDATE de_thi SET trang_thai = ? WHERE id = ?',
    [trangThai, id],
  );

  return result.affectedRows > 0;
}

async function publishResults(connection, id, { thoiGianCongBoKetQua, choXemDapAn }) {
  const [result] = await connection.execute(
    `UPDATE de_thi
     SET da_cong_bo_ket_qua = TRUE, thoi_gian_cong_bo_ket_qua = ?, cho_xem_dap_an = ?
     WHERE id = ? AND da_cong_bo_ket_qua = FALSE`,
    [thoiGianCongBoKetQua, choXemDapAn, id],
  );

  return result.affectedRows > 0;
}

async function listAttemptStatuses(examId, executor) {
  const db = getExecutor(executor);
  const [rows] = await db.execute(
    `SELECT id, trang_thai
     FROM luot_lam_bai
     WHERE de_thi_id = ?`,
    [examId],
  );
  return rows;
}

// Khóa toàn bộ lượt làm của đề trong cùng transaction công bố kết quả. Kết hợp
// với khóa hàng de_thi ở luồng bắt đầu bài thi để không thể tạo/mở thêm lượt làm
// chen giữa bước kiểm tra trạng thái và bước công bố.
async function listAttemptStatusesForUpdate(connection, examId) {
  const [rows] = await connection.execute(
    `SELECT id, trang_thai
     FROM luot_lam_bai
     WHERE de_thi_id = ?
     FOR UPDATE`,
    [examId],
  );

  return rows;
}

async function countAttempts(examId, executor) {
  const db = getExecutor(executor);
  const [rows] = await db.execute(
    'SELECT COUNT(*) AS total FROM luot_lam_bai WHERE de_thi_id = ?',
    [examId],
  );

  return rows[0]?.total || 0;
}

/** Xóa mọi lượt làm của đề (CASCADE chi tiết/log/sự cố). Cần trước khi xóa de_thi có lịch sử. */
async function deleteAttemptsByExam(connection, examId) {
  const [result] = await connection.execute(
    'DELETE FROM luot_lam_bai WHERE de_thi_id = ?',
    [examId],
  );
  return result.affectedRows || 0;
}

async function deleteOwned(connection, id, giaoVienId) {
  const runner = connection || pool;
  const [result] = await runner.execute(
    `DELETE FROM de_thi
     WHERE id = ? AND giao_vien_id = ? AND trang_thai IN ('NHAP', 'DA_HUY')`,
    [id, giaoVienId],
  );

  return result.affectedRows > 0;
}

async function countUngradedAttempts(examId) {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS total FROM luot_lam_bai
     WHERE de_thi_id = ? AND trang_thai IN ('DA_NOP', 'TU_DONG_NOP')`,
    [examId],
  );

  return rows[0]?.total || 0;
}

// Module lớp học đầy đủ chưa thuộc phạm vi giai đoạn này; các hàm dưới đây
// chỉ phục vụ tối thiểu cho tính năng "giao đề cho lớp" của module đề thi.
async function listActiveClassesByTeacher(giaoVienId) {
  const [rows] = await pool.execute(
    `SELECT id, ten_lop, ma_lop
     FROM lop_hoc
     WHERE giao_vien_id = ? AND trang_thai = 'HOAT_DONG'
     ORDER BY ten_lop ASC`,
    [giaoVienId],
  );

  return rows;
}

async function findClassOwnedByTeacher(lopHocId, giaoVienId) {
  const [rows] = await pool.execute(
    `SELECT id, ten_lop, ma_lop, trang_thai
     FROM lop_hoc
     WHERE id = ? AND giao_vien_id = ?
     LIMIT 1`,
    [lopHocId, giaoVienId],
  );

  return rows[0] || null;
}

async function assignClass(deThiId, lopHocId) {
  await pool.execute(
    'INSERT INTO phan_cong_de (de_thi_id, lop_hoc_id) VALUES (?, ?)',
    [deThiId, lopHocId],
  );
}

async function removeAssignment(deThiId, lopHocId) {
  const [result] = await pool.execute(
    'DELETE FROM phan_cong_de WHERE de_thi_id = ? AND lop_hoc_id = ?',
    [deThiId, lopHocId],
  );
  return result.affectedRows > 0;
}

async function countAttemptsForClass(examId, lopHocId) {
  const [rows] = await pool.execute(
    'SELECT COUNT(*) AS total FROM luot_lam_bai WHERE de_thi_id = ? AND lop_hoc_id = ?',
    [examId, lopHocId],
  );
  return rows[0]?.total || 0;
}

async function listAssignedClasses(deThiId) {
  const [rows] = await pool.execute(
    `SELECT pcd.id, pcd.lop_hoc_id, pcd.created_at, lh.ten_lop, lh.ma_lop
     FROM phan_cong_de pcd
     JOIN lop_hoc lh ON lh.id = pcd.lop_hoc_id
     WHERE pcd.de_thi_id = ?
     ORDER BY lh.ten_lop ASC`,
    [deThiId],
  );

  return rows;
}

async function countAssignedClasses(deThiId) {
  const [rows] = await pool.execute(
    'SELECT COUNT(*) AS total FROM phan_cong_de WHERE de_thi_id = ?',
    [deThiId],
  );

  return rows[0]?.total || 0;
}

async function findAssignment(deThiId, lopHocId, executor) {
  const db = executor || pool;
  const [rows] = await db.execute(
    'SELECT id FROM phan_cong_de WHERE de_thi_id = ? AND lop_hoc_id = ? LIMIT 1',
    [deThiId, lopHocId],
  );

  return rows[0] || null;
}

// Danh sách đề đã được giao cho các lớp mà học sinh đang DANG_HOC (mỗi dòng là
// một cặp đề-lớp phân công), kèm tóm tắt lượt làm của chính học sinh đó, dùng
// cho GET /student/exams (xem docs/service-rules.md mục 2).
async function listAssignedForStudent(hocSinhId) {
  const [rows] = await pool.execute(
    `SELECT dt.id AS de_thi_id, dt.ten_de, dt.mo_ta, dt.thoi_luong_phut, dt.tong_diem,
            dt.thoi_gian_bat_dau, dt.thoi_gian_ket_thuc, dt.so_lan_duoc_lam,
            dt.trang_thai AS de_trang_thai, dt.da_cong_bo_ket_qua,
            lh.id AS lop_hoc_id, lh.ten_lop,
            (SELECT COUNT(*) FROM luot_lam_bai llb
               WHERE llb.de_thi_id = dt.id AND llb.hoc_sinh_id = ?) AS so_lan_da_lam,
            (SELECT llb2.id FROM luot_lam_bai llb2
               WHERE llb2.de_thi_id = dt.id AND llb2.hoc_sinh_id = ? AND llb2.trang_thai = 'DANG_LAM'
               LIMIT 1) AS dang_lam_id,
            (SELECT llb3.trang_thai FROM luot_lam_bai llb3
               WHERE llb3.de_thi_id = dt.id AND llb3.hoc_sinh_id = ?
               ORDER BY llb3.lan_thu DESC LIMIT 1) AS trang_thai_gan_nhat
     FROM phan_cong_de pcd
     JOIN de_thi dt ON dt.id = pcd.de_thi_id
     JOIN lop_hoc lh ON lh.id = pcd.lop_hoc_id
     JOIN thanh_vien_lop tvl ON tvl.lop_hoc_id = lh.id AND tvl.hoc_sinh_id = ? AND tvl.trang_thai = 'DANG_HOC'
     WHERE dt.trang_thai = 'DA_CONG_BO'
        OR (
          dt.trang_thai = 'DA_HUY'
          AND EXISTS (
            SELECT 1 FROM luot_lam_bai llb_hist
            WHERE llb_hist.de_thi_id = dt.id AND llb_hist.hoc_sinh_id = ?
          )
        )
     ORDER BY dt.thoi_gian_bat_dau DESC`,
    [hocSinhId, hocSinhId, hocSinhId, hocSinhId, hocSinhId],
  );
  return rows;
}

// Các lớp mà học sinh đang DANG_HOC và đã được giao đề này — dùng để hiển thị
// nút "Bắt đầu làm bài" (kèm classId) trên trang chi tiết đề của học sinh.
async function listAssignedClassesForStudent(deThiId, hocSinhId) {
  const [rows] = await pool.execute(
    `SELECT lh.id, lh.ten_lop, lh.ma_lop
     FROM phan_cong_de pcd
     JOIN lop_hoc lh ON lh.id = pcd.lop_hoc_id
     JOIN thanh_vien_lop tvl ON tvl.lop_hoc_id = lh.id AND tvl.hoc_sinh_id = ? AND tvl.trang_thai = 'DANG_HOC'
     WHERE pcd.de_thi_id = ?
     ORDER BY lh.ten_lop ASC`,
    [hocSinhId, deThiId],
  );
  return rows;
}

module.exports = {
  list,
  findById,
  findByIdForUpdate,
  findByIdForTeacher,
  findByIdForTeacherForUpdate,
  create,
  updateMeta,
  updateTongDiem,
  setTrangThai,
  publishResults,
  listAttemptStatuses,
  listAttemptStatusesForUpdate,
  countAttempts,
  deleteAttemptsByExam,
  deleteOwned,
  countUngradedAttempts,
  listActiveClassesByTeacher,
  findClassOwnedByTeacher,
  assignClass,
  removeAssignment,
  countAttemptsForClass,
  listAssignedClasses,
  countAssignedClasses,
  findAssignment,
  listAssignedForStudent,
  listAssignedClassesForStudent,
};
