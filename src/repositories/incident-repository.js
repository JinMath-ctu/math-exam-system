'use strict';

const { pool } = require('../config/database');

function getExecutor(executor) {
  return executor || pool;
}

const INCIDENT_COLUMNS = `
  sc.id, sc.luot_lam_bai_id, sc.loai_su_co, sc.bat_dau_luc, sc.ket_thuc_luc,
  sc.tu_dong_phat_hien, sc.mo_ta, sc.trang_thai, sc.so_giay_bu_gio, sc.ly_do_xu_ly,
  sc.created_at, sc.updated_at
`;

// Báo cáo sự cố do CHÍNH HỌC SINH gửi (tu_dong_phat_hien = FALSE). Khác với
// attemptRepository.createAutoIncident() (hệ thống tự phát hiện qua heartbeat),
// hàm này phục vụ luồng UC-HS-11 — học sinh KHÔNG tự nhập số giây bù giờ,
// so_giay_bu_gio luôn khởi tạo 0 và chỉ được set khi giáo viên duyệt.
async function createStudentReport({ luotLamBaiId, loaiSuCo, batDauLuc, ketThucLuc, moTa }, executor) {
  const db = getExecutor(executor);
  const [result] = await db.execute(
    `INSERT INTO su_co_bai_thi
       (luot_lam_bai_id, loai_su_co, bat_dau_luc, ket_thuc_luc, tu_dong_phat_hien, mo_ta, trang_thai)
     VALUES (?, ?, ?, ?, FALSE, ?, 'CHO_XAC_NHAN')`,
    [luotLamBaiId, loaiSuCo, batDauLuc || null, ketThucLuc || null, moTa || null],
  );
  return result.insertId;
}

async function findById(id, executor) {
  const db = getExecutor(executor);
  const [rows] = await db.execute(
    `SELECT ${INCIDENT_COLUMNS} FROM su_co_bai_thi sc WHERE sc.id = ? LIMIT 1`,
    [id],
  );
  return rows[0] || null;
}

// FOR UPDATE — dùng trong transaction duyệt/từ chối để chống duyệt hai lần
// đồng thời (service-rules.md mục 8).
async function findByIdForUpdate(connection, id) {
  const [rows] = await connection.execute(
    `SELECT ${INCIDENT_COLUMNS} FROM su_co_bai_thi sc WHERE sc.id = ? LIMIT 1 FOR UPDATE`,
    [id],
  );
  return rows[0] || null;
}

// Xác thực quyền giáo viên: sự cố phải thuộc lượt làm của đề do giáo viên sở hữu.
async function findByIdForTeacher(id, giaoVienId) {
  const [rows] = await pool.execute(
    `SELECT ${INCIDENT_COLUMNS},
            llb.de_thi_id, llb.hoc_sinh_id, llb.lop_hoc_id, llb.trang_thai AS attempt_trang_thai,
            llb.lan_thu, llb.thoi_gian_bo_sung_giay,
            dt.ten_de, dt.giao_vien_id,
            nd.ho_ten AS hoc_sinh_ho_ten, nd.email AS hoc_sinh_email,
            lh.ten_lop, lh.ma_lop
     FROM su_co_bai_thi sc
     JOIN luot_lam_bai llb ON llb.id = sc.luot_lam_bai_id
     JOIN de_thi dt ON dt.id = llb.de_thi_id
     JOIN nguoi_dung nd ON nd.id = llb.hoc_sinh_id
     JOIN lop_hoc lh ON lh.id = llb.lop_hoc_id
     WHERE sc.id = ? AND dt.giao_vien_id = ?
     LIMIT 1`,
    [id, giaoVienId],
  );
  return rows[0] || null;
}

async function hasPending(luotLamBaiId, executor) {
  const db = getExecutor(executor);
  const [rows] = await db.execute(
    `SELECT 1 FROM su_co_bai_thi WHERE luot_lam_bai_id = ? AND trang_thai = 'CHO_XAC_NHAN' LIMIT 1`,
    [luotLamBaiId],
  );
  return rows.length > 0;
}

async function countPendingForExam(examId, executor) {
  const db = executor || pool;
  const [rows] = await db.execute(
    `SELECT COUNT(*) AS total
     FROM su_co_bai_thi sc
     JOIN luot_lam_bai llb ON llb.id = sc.luot_lam_bai_id
     WHERE llb.de_thi_id = ? AND sc.trang_thai = 'CHO_XAC_NHAN'`,
    [examId],
  );
  return rows[0]?.total || 0;
}

// Gọi sau khi đã khóa de_thi và các luot_lam_bai liên quan. FOR UPDATE giữ
// các sự cố đang chờ ổn định cho tới khi transaction công bố/giải quyết xong.
async function listPendingForExamForUpdate(connection, examId) {
  const [rows] = await connection.execute(
    `SELECT sc.id, sc.luot_lam_bai_id
     FROM su_co_bai_thi sc
     JOIN luot_lam_bai llb ON llb.id = sc.luot_lam_bai_id
     WHERE llb.de_thi_id = ? AND sc.trang_thai = 'CHO_XAC_NHAN'
     FOR UPDATE`,
    [examId],
  );
  return rows;
}

// Lịch sử sự cố của chính học sinh cho một lượt làm. Điều kiện ownership được
// đặt ngay trong query để URL không thể dùng để xem báo cáo của học sinh khác.
async function listForStudentAttempt(luotLamBaiId, hocSinhId) {
  const [rows] = await pool.execute(
    `SELECT ${INCIDENT_COLUMNS}
     FROM su_co_bai_thi sc
     JOIN luot_lam_bai llb ON llb.id = sc.luot_lam_bai_id
     WHERE sc.luot_lam_bai_id = ? AND llb.hoc_sinh_id = ?
     ORDER BY sc.created_at DESC`,
    [luotLamBaiId, hocSinhId],
  );
  return rows;
}

async function listForTeacher(giaoVienId, filters = {}) {
  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(filters.limit) || 20));
  const offset = (page - 1) * limit;

  const conditions = ['dt.giao_vien_id = ?'];
  const params = [giaoVienId];

  if (filters.trangThai) {
    conditions.push('sc.trang_thai = ?');
    params.push(filters.trangThai);
  }

  if (filters.examId) {
    conditions.push('llb.de_thi_id = ?');
    params.push(filters.examId);
  }

  const where = conditions.join(' AND ');

  const [rows] = await pool.query(
    `SELECT ${INCIDENT_COLUMNS},
            llb.de_thi_id, llb.lan_thu,
            dt.ten_de,
            nd.ho_ten AS hoc_sinh_ho_ten, nd.email AS hoc_sinh_email,
            lh.ten_lop
     FROM su_co_bai_thi sc
     JOIN luot_lam_bai llb ON llb.id = sc.luot_lam_bai_id
     JOIN de_thi dt ON dt.id = llb.de_thi_id
     JOIN nguoi_dung nd ON nd.id = llb.hoc_sinh_id
     JOIN lop_hoc lh ON lh.id = llb.lop_hoc_id
     WHERE ${where}
     ORDER BY (sc.trang_thai = 'CHO_XAC_NHAN') DESC, sc.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM su_co_bai_thi sc
     JOIN luot_lam_bai llb ON llb.id = sc.luot_lam_bai_id
     JOIN de_thi dt ON dt.id = llb.de_thi_id
     WHERE ${where}`,
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

// Duyệt sự cố — chỉ cập nhật khi đang CHO_XAC_NHAN (affectedRows = 0 nếu đã
// xử lý trước đó / duyệt trùng), dùng trong transaction cùng lockById.
async function approve(connection, id, { soGiayBuGio, lyDoXuLy }) {
  const [result] = await connection.execute(
    `UPDATE su_co_bai_thi
     SET trang_thai = 'DA_CHAP_NHAN', so_giay_bu_gio = ?, ly_do_xu_ly = ?
     WHERE id = ? AND trang_thai = 'CHO_XAC_NHAN'`,
    [soGiayBuGio, lyDoXuLy || null, id],
  );
  return result.affectedRows > 0;
}

async function reject(connection, id, { lyDoXuLy }) {
  const [result] = await connection.execute(
    `UPDATE su_co_bai_thi
     SET trang_thai = 'TU_CHOI', ly_do_xu_ly = ?
     WHERE id = ? AND trang_thai = 'CHO_XAC_NHAN'`,
    [lyDoXuLy, id],
  );
  return result.affectedRows > 0;
}

module.exports = {
  createStudentReport,
  findById,
  findByIdForUpdate,
  findByIdForTeacher,
  hasPending,
  countPendingForExam,
  listPendingForExamForUpdate,
  listForStudentAttempt,
  listForTeacher,
  approve,
  reject,
};
