'use strict';

const { pool } = require('../config/database');

function getExecutor(executor) {
  return executor || pool;
}

const ATTEMPT_COLUMNS = `
  llb.id, llb.de_thi_id, llb.hoc_sinh_id, llb.lop_hoc_id, llb.lan_thu,
  llb.thoi_gian_bat_dau, llb.han_nop, llb.thoi_gian_nop, llb.thoi_gian_bo_sung_giay,
  llb.diem_tu_dong, llb.diem_tu_luan, llb.tong_diem, llb.trang_thai, llb.last_seen_at,
  llb.created_at, llb.updated_at
`;

async function findById(id, executor) {
  const db = getExecutor(executor);
  const [rows] = await db.execute(
    `SELECT ${ATTEMPT_COLUMNS} FROM luot_lam_bai llb WHERE llb.id = ? LIMIT 1`,
    [id],
  );
  return rows[0] || null;
}

async function findByIdForUpdate(connection, id) {
  const [rows] = await connection.execute(
    `SELECT ${ATTEMPT_COLUMNS} FROM luot_lam_bai llb WHERE llb.id = ? LIMIT 1 FOR UPDATE`,
    [id],
  );
  return rows[0] || null;
}

async function listByExamAndStudent(deThiId, hocSinhId) {
  const [rows] = await pool.execute(
    `SELECT ${ATTEMPT_COLUMNS} FROM luot_lam_bai llb
     WHERE llb.de_thi_id = ? AND llb.hoc_sinh_id = ?
     ORDER BY llb.lan_thu DESC`,
    [deThiId, hocSinhId],
  );
  return rows;
}

async function findByIdForOwner(id, hocSinhId) {
  const attempt = await findById(id);
  if (!attempt || Number(attempt.hoc_sinh_id) !== Number(hocSinhId)) {
    return null;
  }
  return attempt;
}

// Khóa (FOR UPDATE) toàn bộ lượt làm hiện có của học sinh cho một đề thi, dùng
// khi bắt đầu lượt mới để tính lan_thu chính xác và tránh race-condition khi
// double-click (xem docs/service-rules.md mục 6 và use-case UC-HS-05).
async function lockAttemptsForStart(connection, deThiId, hocSinhId) {
  const [rows] = await connection.execute(
    `SELECT ${ATTEMPT_COLUMNS} FROM luot_lam_bai llb
     WHERE llb.de_thi_id = ? AND llb.hoc_sinh_id = ?
     FOR UPDATE`,
    [deThiId, hocSinhId],
  );
  return rows;
}

async function createAttempt(connection, data) {
  const [result] = await connection.execute(
    `INSERT INTO luot_lam_bai
       (de_thi_id, hoc_sinh_id, lop_hoc_id, lan_thu, thoi_gian_bat_dau, han_nop,
        thoi_gian_bo_sung_giay, trang_thai, last_seen_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, 'DANG_LAM', ?)`,
    [
      data.deThiId,
      data.hocSinhId,
      data.lopHocId,
      data.lanThu,
      data.thoiGianBatDau,
      data.hanNop,
      data.thoiGianBatDau,
    ],
  );
  return result.insertId;
}

async function insertFrozenQuestions(connection, luotLamBaiId, orderedQuestions) {
  if (!orderedQuestions.length) {
    return;
  }

  const values = [];
  const placeholders = orderedQuestions
    .map((question, index) => {
      values.push(luotLamBaiId, question.cau_hoi_id, index + 1, question.diem);
      return '(?, ?, ?, ?)';
    })
    .join(', ');

  await connection.query(
    `INSERT INTO cau_hoi_luot_lam (luot_lam_bai_id, cau_hoi_id, thu_tu_hien_thi, diem)
     VALUES ${placeholders}`,
    values,
  );
}

// Danh sách câu hỏi đã "đóng băng" cho một lượt làm (thứ tự + điểm cố định),
// kèm nội dung câu hỏi và danh sách đáp án KHÔNG gồm la_dap_an_dung — dùng cho
// GET /api/attempts/:attemptId/state (xem docs/service-rules.md mục 4 và 5).
async function listFrozenQuestions(luotLamBaiId) {
  const [rows] = await pool.execute(
    `SELECT chll.cau_hoi_id, chll.thu_tu_hien_thi, chll.diem,
            ch.loai_cau_hoi, ch.noi_dung, ch.noi_dung_latex, ch.anh_url
     FROM cau_hoi_luot_lam chll
     JOIN cau_hoi ch ON ch.id = chll.cau_hoi_id
     WHERE chll.luot_lam_bai_id = ?
     ORDER BY chll.thu_tu_hien_thi ASC`,
    [luotLamBaiId],
  );
  return rows;
}

async function findFrozenQuestion(luotLamBaiId, cauHoiId, executor) {
  const db = getExecutor(executor);
  const [rows] = await db.execute(
    `SELECT chll.cau_hoi_id, chll.thu_tu_hien_thi, chll.diem, ch.loai_cau_hoi
     FROM cau_hoi_luot_lam chll
     JOIN cau_hoi ch ON ch.id = chll.cau_hoi_id
     WHERE chll.luot_lam_bai_id = ? AND chll.cau_hoi_id = ?
     LIMIT 1`,
    [luotLamBaiId, cauHoiId],
  );
  return rows[0] || null;
}

async function listAnswersForAttempt(luotLamBaiId) {
  const [rows] = await pool.execute(
    `SELECT cau_hoi_id, dap_an_da_chon_id, noi_dung_tra_loi, da_danh_dau, answer_version,
            la_dung, diem_dat_duoc, nhan_xet, saved_at_server
     FROM chi_tiet_bai_lam
     WHERE luot_lam_bai_id = ?`,
    [luotLamBaiId],
  );
  return rows;
}

async function getAnswerVersion(luotLamBaiId, cauHoiId, executor) {
  const db = getExecutor(executor);
  const [rows] = await db.execute(
    `SELECT answer_version FROM chi_tiet_bai_lam
     WHERE luot_lam_bai_id = ? AND cau_hoi_id = ?
     LIMIT 1`,
    [luotLamBaiId, cauHoiId],
  );
  return rows.length ? rows[0].answer_version : null;
}

async function getAnswerSaveState(luotLamBaiId, cauHoiId, executor) {
  const db = getExecutor(executor);
  const [rows] = await db.execute(
    `SELECT answer_version, client_request_id, saved_at_server
     FROM chi_tiet_bai_lam
     WHERE luot_lam_bai_id = ? AND cau_hoi_id = ?
     LIMIT 1`,
    [luotLamBaiId, cauHoiId],
  );
  return rows[0] || null;
}

// Upsert nguyên tử chống ghi đè: nếu bản ghi đã tồn tại và answer_version mới
// KHÔNG lớn hơn answer_version hiện có trong DB, các cột SET giữ nguyên giá trị
// cũ (IF trả về giá trị hiện tại) nên MySQL báo affectedRows = 0 cho câu lệnh
// UPDATE nhánh đó. Executor phải là cùng connection đã khóa luot_lam_bai để
// thao tác lưu không thể chạy xen kẽ với transaction nộp/chấm bài.
async function upsertAnswer(luotLamBaiId, cauHoiId, data, executor) {
  const db = getExecutor(executor);
  const [result] = await db.execute(
    `INSERT INTO chi_tiet_bai_lam
       (luot_lam_bai_id, cau_hoi_id, dap_an_da_chon_id, noi_dung_tra_loi, da_danh_dau,
        answer_version, client_request_id, saved_at_server)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       dap_an_da_chon_id = IF(VALUES(answer_version) > answer_version, VALUES(dap_an_da_chon_id), dap_an_da_chon_id),
       noi_dung_tra_loi = IF(VALUES(answer_version) > answer_version, VALUES(noi_dung_tra_loi), noi_dung_tra_loi),
       da_danh_dau = IF(VALUES(answer_version) > answer_version, VALUES(da_danh_dau), da_danh_dau),
       client_request_id = IF(VALUES(answer_version) > answer_version, VALUES(client_request_id), client_request_id),
       saved_at_server = IF(VALUES(answer_version) > answer_version, VALUES(saved_at_server), saved_at_server),
       answer_version = IF(VALUES(answer_version) > answer_version, VALUES(answer_version), answer_version)`,
    [
      luotLamBaiId,
      cauHoiId,
      data.dapAnDaChonId,
      data.noiDungTraLoi,
      data.daDanhDau,
      data.answerVersion,
      data.clientRequestId,
      data.savedAtServer,
    ],
  );
  return result.affectedRows;
}

async function updateLastSeenAt(id, mysqlDatetime, executor) {
  const db = getExecutor(executor);
  await db.execute('UPDATE luot_lam_bai SET last_seen_at = ? WHERE id = ?', [mysqlDatetime, id]);
}

// Chấm/ghi điểm một dòng chi_tiet_bai_lam đã tồn tại (chỉ dùng khi nộp bài).
async function updateGrade(connection, chiTietId, laDung, diemDatDuoc) {
  await connection.execute(
    'UPDATE chi_tiet_bai_lam SET la_dung = ?, diem_dat_duoc = ? WHERE id = ?',
    [laDung, diemDatDuoc, chiTietId],
  );
}

// Ảnh chụp toàn bộ dữ liệu cần để chấm điểm tại thời điểm nộp bài: điểm đóng
// băng, loại câu hỏi, đáp án chuẩn (TRA_LOI_NGAN), câu trả lời của học sinh và
// việc lựa chọn có đúng hay không (MOT_DAP_AN/DUNG_SAI). FOR UPDATE khóa các
// dòng chi_tiet_bai_lam liên quan để tránh học sinh lưu đáp án trong lúc đang
// chấm (xem service-rules.md mục 6).
async function getGradingSnapshot(connection, luotLamBaiId) {
  const [rows] = await connection.execute(
    `SELECT chll.cau_hoi_id, chll.diem AS diem_dong_bang, ch.loai_cau_hoi, ch.dap_an_ngan_chuan,
            ctbl.id AS chi_tiet_id, ctbl.dap_an_da_chon_id, ctbl.noi_dung_tra_loi,
            ctbl.diem_dat_duoc AS diem_hien_tai,
            da.la_dap_an_dung
     FROM cau_hoi_luot_lam chll
     JOIN cau_hoi ch ON ch.id = chll.cau_hoi_id
     LEFT JOIN chi_tiet_bai_lam ctbl
       ON ctbl.luot_lam_bai_id = chll.luot_lam_bai_id AND ctbl.cau_hoi_id = chll.cau_hoi_id
     LEFT JOIN dap_an da
       ON da.id = ctbl.dap_an_da_chon_id AND da.cau_hoi_id = chll.cau_hoi_id
     WHERE chll.luot_lam_bai_id = ?
     FOR UPDATE`,
    [luotLamBaiId],
  );
  return rows;
}

async function finalizeSubmit(connection, id, { trangThai, thoiGianNop, diemTuDong, diemTuLuan, tongDiem }) {
  const [result] = await connection.execute(
    `UPDATE luot_lam_bai
     SET trang_thai = ?, thoi_gian_nop = ?, diem_tu_dong = ?, diem_tu_luan = ?, tong_diem = ?
     WHERE id = ? AND trang_thai = 'DANG_LAM'`,
    [trangThai, thoiGianNop, diemTuDong, diemTuLuan, tongDiem, id],
  );
  return result.affectedRows > 0;
}

async function logEvent(executor, luotLamBaiId, loaiSuKien, noiDung, duLieuJson) {
  const db = getExecutor(executor);
  await db.execute(
    `INSERT INTO nhat_ky_thi (luot_lam_bai_id, loai_su_kien, noi_dung, du_lieu_json)
     VALUES (?, ?, ?, ?)`,
    [luotLamBaiId, loaiSuKien, noiDung || null, duLieuJson ? JSON.stringify(duLieuJson) : null],
  );
}

async function createAutoIncident(luotLamBaiId, { loaiSuCo, batDauLuc, ketThucLuc, moTa }, executor) {
  const db = getExecutor(executor);
  await db.execute(
    `INSERT INTO su_co_bai_thi
       (luot_lam_bai_id, loai_su_co, bat_dau_luc, ket_thuc_luc, tu_dong_phat_hien, mo_ta, trang_thai)
     VALUES (?, ?, ?, ?, TRUE, ?, 'CHO_XAC_NHAN')`,
    [luotLamBaiId, loaiSuCo, batDauLuc || null, ketThucLuc || null, moTa || null],
  );
}

// Quét lượt làm đã quá hạn nộp hiệu lực (han_nop + thoi_gian_bo_sung_giay) mà
// vẫn còn DANG_LAM — dùng cho job tự động nộp bài (xem service-rules.md mục 6).
async function findExpiredInProgress() {
  const [rows] = await pool.execute(
    `SELECT id, hoc_sinh_id FROM luot_lam_bai
     WHERE trang_thai = 'DANG_LAM'
       AND NOW() > DATE_ADD(han_nop, INTERVAL thoi_gian_bo_sung_giay SECOND)`,
  );
  return rows;
}

// =====================================================================
// Phần dưới đây phục vụ module Chấm điểm / Công bố kết quả / Sự cố /
// Thống kê (Giai đoạn 18-21). Không sửa các hàm phía trên để tránh ảnh
// hưởng luồng làm bài/nộp bài đang được xây dựng song song.
// =====================================================================

function essayCountSubqueries() {
  return `
    (SELECT COUNT(*) FROM cau_hoi_luot_lam chll2
       JOIN cau_hoi ch2 ON ch2.id = chll2.cau_hoi_id
       WHERE chll2.luot_lam_bai_id = llb.id AND ch2.loai_cau_hoi = 'TU_LUAN') AS so_cau_tu_luan,
    (SELECT COUNT(*) FROM chi_tiet_bai_lam ctbl2
       JOIN cau_hoi ch3 ON ch3.id = ctbl2.cau_hoi_id
       WHERE ctbl2.luot_lam_bai_id = llb.id AND ch3.loai_cau_hoi = 'TU_LUAN' AND ctbl2.la_dung IS NOT NULL) AS so_cau_da_cham
  `;
}

// Xác thực quyền giáo viên (sở hữu đề của lượt làm) — dùng cho trang chấm bài,
// danh sách lượt làm theo đề và duyệt sự cố.
async function findByIdForTeacher(attemptId, giaoVienId, executor) {
  const db = getExecutor(executor);
  const [rows] = await db.execute(
    `SELECT ${ATTEMPT_COLUMNS}, ${essayCountSubqueries()},
            dt.ten_de, dt.giao_vien_id, dt.cho_xem_dap_an, dt.da_cong_bo_ket_qua,
            dt.tong_diem AS de_tong_diem,
            nd.ho_ten AS hoc_sinh_ho_ten, nd.email AS hoc_sinh_email,
            lh.ten_lop, lh.ma_lop
     FROM luot_lam_bai llb
     JOIN de_thi dt ON dt.id = llb.de_thi_id
     JOIN nguoi_dung nd ON nd.id = llb.hoc_sinh_id
     JOIN lop_hoc lh ON lh.id = llb.lop_hoc_id
     WHERE llb.id = ? AND dt.giao_vien_id = ?
     LIMIT 1`,
    [attemptId, giaoVienId],
  );
  return rows[0] || null;
}

// Lượt làm của học sinh kèm metadata đề (dùng cho trang xem kết quả / báo sự cố).
async function findByIdForStudentWithExam(attemptId, hocSinhId) {
  const [rows] = await pool.execute(
    `SELECT ${ATTEMPT_COLUMNS},
            dt.id AS de_thi_id, dt.ten_de, dt.cho_xem_dap_an, dt.da_cong_bo_ket_qua,
            dt.thoi_gian_cong_bo_ket_qua, dt.tong_diem AS de_tong_diem
     FROM luot_lam_bai llb
     JOIN de_thi dt ON dt.id = llb.de_thi_id
     WHERE llb.id = ? AND llb.hoc_sinh_id = ?
     LIMIT 1`,
    [attemptId, hocSinhId],
  );
  return rows[0] || null;
}

// Truy vấn dành riêng cho trang kết quả: chỉ trả về lượt đã nộp và chấm xong,
// thuộc đề đã công bố kết quả. Nếu học sinh đang có một lượt khác của cùng đề
// được mở lại thì tạm ẩn kết quả để không lộ đáp án giữa các lần làm.
async function findPublishedResultForStudent(attemptId, hocSinhId) {
  const [rows] = await pool.execute(
    `SELECT ${ATTEMPT_COLUMNS},
            dt.id AS de_thi_id, dt.ten_de, dt.cho_xem_dap_an, dt.da_cong_bo_ket_qua,
            dt.thoi_gian_cong_bo_ket_qua, dt.tong_diem AS de_tong_diem
     FROM luot_lam_bai llb
     JOIN de_thi dt ON dt.id = llb.de_thi_id
     WHERE llb.id = ?
       AND llb.hoc_sinh_id = ?
       AND llb.trang_thai = 'DA_CHAM'
       AND llb.thoi_gian_nop IS NOT NULL
       AND dt.da_cong_bo_ket_qua = TRUE
       AND NOT EXISTS (
         SELECT 1
         FROM luot_lam_bai active_llb
         WHERE active_llb.de_thi_id = llb.de_thi_id
           AND active_llb.hoc_sinh_id = llb.hoc_sinh_id
           AND active_llb.trang_thai = 'DANG_LAM'
       )
     LIMIT 1`,
    [attemptId, hocSinhId],
  );
  return rows[0] || null;
}

async function listByExam(examId, filters = {}) {
  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(filters.limit) || 20));
  const offset = (page - 1) * limit;

  const conditions = ['llb.de_thi_id = ?'];
  const params = [examId];

  if (filters.trangThai) {
    conditions.push('llb.trang_thai = ?');
    params.push(filters.trangThai);
  }

  if (filters.lopHocId) {
    conditions.push('llb.lop_hoc_id = ?');
    params.push(filters.lopHocId);
  }

  const where = conditions.join(' AND ');

  const [rows] = await pool.query(
    `SELECT ${ATTEMPT_COLUMNS}, ${essayCountSubqueries()},
            nd.ho_ten AS hoc_sinh_ho_ten, nd.email AS hoc_sinh_email,
            lh.ten_lop, lh.ma_lop
     FROM luot_lam_bai llb
     JOIN nguoi_dung nd ON nd.id = llb.hoc_sinh_id
     JOIN lop_hoc lh ON lh.id = llb.lop_hoc_id
     WHERE ${where}
     ORDER BY llb.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM luot_lam_bai llb WHERE ${where}`,
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

// Câu tự luận của một lượt làm kèm câu trả lời (nếu có) — dùng cho trang chấm
// bài. LEFT JOIN vì học sinh có thể bỏ trống câu tự luận (không có dòng
// chi_tiet_bai_lam), giáo viên vẫn phải chấm được (mặc định 0 điểm).
async function listEssayQuestionsForGrading(luotLamBaiId, executor) {
  const db = getExecutor(executor);
  const [rows] = await db.execute(
    `SELECT chll.cau_hoi_id, chll.thu_tu_hien_thi, chll.diem,
            ch.noi_dung, ch.noi_dung_latex, ch.loi_giai,
            ctbl.noi_dung_tra_loi, ctbl.diem_dat_duoc, ctbl.nhan_xet,
            (ctbl.la_dung IS NOT NULL) AS da_cham
     FROM cau_hoi_luot_lam chll
     JOIN cau_hoi ch ON ch.id = chll.cau_hoi_id
     LEFT JOIN chi_tiet_bai_lam ctbl
       ON ctbl.luot_lam_bai_id = chll.luot_lam_bai_id AND ctbl.cau_hoi_id = chll.cau_hoi_id
     WHERE chll.luot_lam_bai_id = ? AND ch.loai_cau_hoi = 'TU_LUAN'
     ORDER BY chll.thu_tu_hien_thi ASC`,
    [luotLamBaiId],
  );
  return rows;
}

async function countEssayTotal(executor, luotLamBaiId) {
  const db = getExecutor(executor);
  const [rows] = await db.execute(
    `SELECT COUNT(*) AS total FROM cau_hoi_luot_lam chll
     JOIN cau_hoi ch ON ch.id = chll.cau_hoi_id
     WHERE chll.luot_lam_bai_id = ? AND ch.loai_cau_hoi = 'TU_LUAN'`,
    [luotLamBaiId],
  );
  return rows[0]?.total || 0;
}

async function countEssayGraded(executor, luotLamBaiId) {
  const db = getExecutor(executor);
  const [rows] = await db.execute(
    `SELECT COUNT(*) AS total FROM chi_tiet_bai_lam ctbl
     JOIN cau_hoi ch ON ch.id = ctbl.cau_hoi_id
     WHERE ctbl.luot_lam_bai_id = ? AND ch.loai_cau_hoi = 'TU_LUAN' AND ctbl.la_dung IS NOT NULL`,
    [luotLamBaiId],
  );
  return rows[0]?.total || 0;
}

// Upsert điểm chấm tự luận. Schema không có cột da_cham — dùng la_dung IS NOT NULL
// để đánh dấu đã chấm (kể cả điểm 0). la_dung = TRUE nếu đạt điểm tối đa câu, ngược lại FALSE.
async function upsertEssayGrade(executor, luotLamBaiId, cauHoiId, diemDatDuoc, nhanXet, diemToiDa) {
  const db = getExecutor(executor);
  const laDung = Number(diemDatDuoc) >= Number(diemToiDa);
  await db.execute(
    `INSERT INTO chi_tiet_bai_lam (luot_lam_bai_id, cau_hoi_id, diem_dat_duoc, nhan_xet, la_dung)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       diem_dat_duoc = VALUES(diem_dat_duoc),
       nhan_xet = VALUES(nhan_xet),
       la_dung = VALUES(la_dung)`,
    [luotLamBaiId, cauHoiId, diemDatDuoc, nhanXet, laDung],
  );
}

// Tính lại diem_tu_luan từ chi_tiet_bai_lam và cập nhật tong_diem = diem_tu_dong
// (đã chốt lúc nộp bài, không đổi) + diem_tu_luan mới (service-rules.md mục 7).
async function recalcTuLuanScores(executor, luotLamBaiId) {
  const db = getExecutor(executor);
  const [rows] = await db.execute(
    `SELECT COALESCE(SUM(ctbl.diem_dat_duoc), 0) AS tong
     FROM chi_tiet_bai_lam ctbl
     JOIN cau_hoi ch ON ch.id = ctbl.cau_hoi_id
     WHERE ctbl.luot_lam_bai_id = ? AND ch.loai_cau_hoi = 'TU_LUAN'`,
    [luotLamBaiId],
  );
  const diemTuLuan = Number(rows[0].tong);

  await db.execute(
    `UPDATE luot_lam_bai
     SET diem_tu_luan = ?, tong_diem = diem_tu_dong + ?
     WHERE id = ?`,
    [diemTuLuan, diemTuLuan, luotLamBaiId],
  );

  return diemTuLuan;
}

async function markDaChamIfSubmitted(executor, luotLamBaiId) {
  const db = getExecutor(executor);
  const [result] = await db.execute(
    `UPDATE luot_lam_bai SET trang_thai = 'DA_CHAM'
     WHERE id = ? AND trang_thai IN ('DA_NOP', 'TU_DONG_NOP')`,
    [luotLamBaiId],
  );
  return result.affectedRows > 0;
}

async function addBuGioSeconds(executor, luotLamBaiId, seconds) {
  const db = getExecutor(executor);
  await db.execute(
    'UPDATE luot_lam_bai SET thoi_gian_bo_sung_giay = thoi_gian_bo_sung_giay + ? WHERE id = ?',
    [seconds, luotLamBaiId],
  );
}

// Khi một bài đã nộp được mở lại, mọi kết quả chấm cũ đều trở thành dữ liệu
// tạm thời không còn hợp lệ. Giữ nguyên câu trả lời/version để học sinh tiếp
// tục làm, nhưng xóa điểm/nhận xét để lần nộp kế tiếp chấm lại từ đầu.
async function resetGradesForReopen(executor, luotLamBaiId) {
  const db = getExecutor(executor);
  await db.execute(
    `UPDATE chi_tiet_bai_lam
     SET la_dung = NULL, diem_dat_duoc = 0, nhan_xet = NULL
     WHERE luot_lam_bai_id = ?`,
    [luotLamBaiId],
  );
  await db.execute(
    `UPDATE luot_lam_bai
     SET diem_tu_dong = 0, diem_tu_luan = 0, tong_diem = 0
     WHERE id = ?`,
    [luotLamBaiId],
  );
}

// Mở lại lượt làm đã nộp (oan do sự cố) về DANG_LAM, dùng khi duyệt sự cố hợp
// lệ (service-rules.md mục 8). Chỉ chuyển từ DA_NOP/TU_DONG_NOP, không đụng
// vào lượt đã DA_CHAM (tránh mở lại bài đã chấm xong).
async function reopenIfSubmitted(executor, luotLamBaiId, { lastSeenAt }) {
  const db = getExecutor(executor);
  const [result] = await db.execute(
    `UPDATE luot_lam_bai
     SET trang_thai = 'DANG_LAM', thoi_gian_nop = NULL, last_seen_at = ?
     WHERE id = ? AND trang_thai IN ('DA_NOP', 'TU_DONG_NOP')`,
    [lastSeenAt, luotLamBaiId],
  );
  return result.affectedRows > 0;
}

// Chi tiết từng câu dùng cho giáo viên xem bài và cho trang kết quả của học sinh.
// Luồng học sinh phải kiểm tra policy công bố trước và truyền includeAnswerKey=false
// khi giáo viên không cho xem đáp án; khi đó SQL không đọc lời giải/đáp án ngắn ra.
async function listResultQuestions(luotLamBaiId, { includeAnswerKey = true } = {}) {
  const [rows] = await pool.execute(
    `SELECT chll.cau_hoi_id, chll.thu_tu_hien_thi, chll.diem AS diem_toi_da,
            ch.noi_dung, ch.noi_dung_latex, ch.loai_cau_hoi,
            CASE WHEN ? THEN ch.loi_giai ELSE NULL END AS loi_giai,
            CASE WHEN ? THEN ch.dap_an_ngan_chuan ELSE NULL END AS dap_an_ngan_chuan,
            ctbl.dap_an_da_chon_id, ctbl.noi_dung_tra_loi, ctbl.diem_dat_duoc, ctbl.nhan_xet, ctbl.la_dung,
            ctbl.answer_version, ctbl.saved_at_server, ctbl.da_danh_dau
     FROM cau_hoi_luot_lam chll
     JOIN cau_hoi ch ON ch.id = chll.cau_hoi_id
     LEFT JOIN chi_tiet_bai_lam ctbl
       ON ctbl.luot_lam_bai_id = chll.luot_lam_bai_id AND ctbl.cau_hoi_id = chll.cau_hoi_id
     WHERE chll.luot_lam_bai_id = ?
     ORDER BY chll.thu_tu_hien_thi ASC`,
    [includeAnswerKey, includeAnswerKey, luotLamBaiId],
  );
  return rows;
}

// Danh sách lượt làm đã có kết quả công bố của một học sinh (mọi đề), dùng
// cho trang "Kết quả của tôi".
async function listMyPublishedResults(hocSinhId, filters = {}) {
  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(filters.limit) || 20));
  const offset = (page - 1) * limit;

  const [rows] = await pool.query(
    `SELECT llb.id, llb.lan_thu, llb.thoi_gian_bat_dau, llb.thoi_gian_nop, llb.tong_diem, llb.trang_thai,
            dt.id AS de_thi_id, dt.ten_de, dt.tong_diem AS de_tong_diem,
            dt.da_cong_bo_ket_qua, dt.thoi_gian_cong_bo_ket_qua
     FROM luot_lam_bai llb
     JOIN de_thi dt ON dt.id = llb.de_thi_id
     WHERE llb.hoc_sinh_id = ?
       AND llb.trang_thai = 'DA_CHAM'
       AND llb.thoi_gian_nop IS NOT NULL
       AND dt.da_cong_bo_ket_qua = TRUE
       AND NOT EXISTS (
         SELECT 1
         FROM luot_lam_bai active_llb
         WHERE active_llb.de_thi_id = llb.de_thi_id
           AND active_llb.hoc_sinh_id = llb.hoc_sinh_id
           AND active_llb.trang_thai = 'DANG_LAM'
       )
     ORDER BY dt.thoi_gian_cong_bo_ket_qua DESC, llb.id DESC
     LIMIT ? OFFSET ?`,
    [hocSinhId, limit, offset],
  );

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM luot_lam_bai llb
     JOIN de_thi dt ON dt.id = llb.de_thi_id
     WHERE llb.hoc_sinh_id = ?
       AND llb.trang_thai = 'DA_CHAM'
       AND llb.thoi_gian_nop IS NOT NULL
       AND dt.da_cong_bo_ket_qua = TRUE
       AND NOT EXISTS (
         SELECT 1
         FROM luot_lam_bai active_llb
         WHERE active_llb.de_thi_id = llb.de_thi_id
           AND active_llb.hoc_sinh_id = llb.hoc_sinh_id
           AND active_llb.trang_thai = 'DANG_LAM'
       )`,
    [hocSinhId],
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

module.exports = {
  findById,
  findByIdForUpdate,
  findByIdForOwner,
  listByExamAndStudent,
  lockAttemptsForStart,
  createAttempt,
  insertFrozenQuestions,
  listFrozenQuestions,
  findFrozenQuestion,
  listAnswersForAttempt,
  getAnswerVersion,
  getAnswerSaveState,
  upsertAnswer,
  updateLastSeenAt,
  updateGrade,
  getGradingSnapshot,
  finalizeSubmit,
  logEvent,
  createAutoIncident,
  findExpiredInProgress,
  findByIdForTeacher,
  findByIdForStudentWithExam,
  findPublishedResultForStudent,
  listByExam,
  listEssayQuestionsForGrading,
  countEssayTotal,
  countEssayGraded,
  upsertEssayGrade,
  recalcTuLuanScores,
  markDaChamIfSubmitted,
  addBuGioSeconds,
  resetGradesForReopen,
  reopenIfSubmitted,
  listResultQuestions,
  listMyPublishedResults,
};
