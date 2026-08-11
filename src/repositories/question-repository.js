'use strict';

const { pool } = require('../config/database');

const QUESTION_COLUMNS = `
  ch.id, ch.giao_vien_id, ch.chu_de_id, ch.khoi_lop, ch.loai_cau_hoi, ch.noi_dung,
  ch.noi_dung_latex, ch.anh_url, ch.muc_do, ch.diem_mac_dinh,
  ch.dap_an_ngan_chuan, ch.loi_giai, ch.trang_thai, ch.created_at, ch.updated_at
`;

function buildListFilters({ giaoVienId, chuDeId, khoiLop, loaiCauHoi, mucDo, trangThai, q }) {
  const conditions = ['ch.giao_vien_id = ?'];
  const params = [giaoVienId];

  if (chuDeId) {
    conditions.push('ch.chu_de_id = ?');
    params.push(chuDeId);
  }

  if (khoiLop) {
    conditions.push('ch.khoi_lop = ?');
    params.push(khoiLop);
  }

  if (loaiCauHoi) {
    conditions.push('ch.loai_cau_hoi = ?');
    params.push(loaiCauHoi);
  }

  if (mucDo) {
    conditions.push('ch.muc_do = ?');
    params.push(mucDo);
  }

  if (trangThai) {
    conditions.push('ch.trang_thai = ?');
    params.push(trangThai);
  }

  if (q) {
    conditions.push('ch.noi_dung LIKE ?');
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
    `SELECT ${QUESTION_COLUMNS}, cd.ten_chu_de
     FROM cau_hoi ch
     LEFT JOIN chu_de cd ON cd.id = ch.chu_de_id
     WHERE ${where}
     ORDER BY ch.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM cau_hoi ch WHERE ${where}`,
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

async function findById(id) {
  const [rows] = await pool.execute(
    `SELECT ${QUESTION_COLUMNS}, cd.ten_chu_de
     FROM cau_hoi ch
     LEFT JOIN chu_de cd ON cd.id = ch.chu_de_id
     WHERE ch.id = ?
     LIMIT 1`,
    [id],
  );

  return rows[0] || null;
}

async function findByIdForTeacher(id, giaoVienId) {
  const question = await findById(id);
  if (!question || Number(question.giao_vien_id) !== Number(giaoVienId)) {
    return null;
  }

  return question;
}

async function create(connection, data) {
  const runner = connection || pool;
  const [result] = await runner.execute(
    `INSERT INTO cau_hoi
       (giao_vien_id, chu_de_id, khoi_lop, loai_cau_hoi, noi_dung, noi_dung_latex, anh_url,
        muc_do, diem_mac_dinh, dap_an_ngan_chuan, loi_giai, trang_thai)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'HOAT_DONG')`,
    [
      data.giaoVienId,
      data.chuDeId || null,
      data.khoiLop || null,
      data.loaiCauHoi,
      data.noiDung,
      data.noiDungLatex || null,
      data.anhUrl || null,
      data.mucDo,
      data.diemMacDinh,
      data.dapAnNganChuan || null,
      data.loiGiai || null,
    ],
  );

  return result.insertId;
}

async function update(connection, id, data) {
  const runner = connection || pool;
  await runner.execute(
    `UPDATE cau_hoi
     SET chu_de_id = ?, khoi_lop = ?, noi_dung = ?, noi_dung_latex = ?, anh_url = ?,
         muc_do = ?, diem_mac_dinh = ?, dap_an_ngan_chuan = ?, loi_giai = ?
     WHERE id = ?`,
    [
      data.chuDeId || null,
      data.khoiLop || null,
      data.noiDung,
      data.noiDungLatex || null,
      data.anhUrl || null,
      data.mucDo,
      data.diemMacDinh,
      data.dapAnNganChuan || null,
      data.loiGiai || null,
      id,
    ],
  );
}

async function setTrangThai(id, giaoVienId, trangThai) {
  const [result] = await pool.execute(
    `UPDATE cau_hoi SET trang_thai = ? WHERE id = ? AND giao_vien_id = ?`,
    [trangThai, id, giaoVienId],
  );

  return result.affectedRows > 0;
}

// "Câu đã thuộc đề công bố": đang nằm trong ít nhất một đề thi có
// trang_thai = DA_CONG_BO tại thời điểm hiện tại.
async function isInPublishedExam(cauHoiId) {
  const [rows] = await pool.execute(
    `SELECT 1
     FROM cau_hoi_de_thi chdt
     JOIN de_thi dt ON dt.id = chdt.de_thi_id
     WHERE chdt.cau_hoi_id = ? AND dt.trang_thai = 'DA_CONG_BO'
     LIMIT 1`,
    [cauHoiId],
  );

  return rows.length > 0;
}

// "Đã có lịch sử làm bài": câu đã được đóng băng vào ít nhất một lượt làm
// (cau_hoi_luot_lam), bất kể đề thi hiện đang ở trạng thái nào.
async function hasAttemptHistory(cauHoiId) {
  const [rows] = await pool.execute(
    `SELECT 1 FROM cau_hoi_luot_lam WHERE cau_hoi_id = ? LIMIT 1`,
    [cauHoiId],
  );

  return rows.length > 0;
}

async function isLocked(cauHoiId) {
  const [published, hasHistory] = await Promise.all([
    isInPublishedExam(cauHoiId),
    hasAttemptHistory(cauHoiId),
  ]);

  return published || hasHistory;
}

/** Gỡ câu khỏi đề nháp/đã hủy (không đụng đề đang công bố). Trả về id đề bị ảnh hưởng. */
async function detachFromDraftOrCancelledExams(connection, cauHoiId) {
  const runner = connection || pool;
  const [linked] = await runner.execute(
    `SELECT chdt.de_thi_id
     FROM cau_hoi_de_thi chdt
     JOIN de_thi dt ON dt.id = chdt.de_thi_id
     WHERE chdt.cau_hoi_id = ? AND dt.trang_thai IN ('NHAP', 'DA_HUY')`,
    [cauHoiId],
  );

  if (linked.length === 0) {
    return [];
  }

  await runner.execute(
    `DELETE chdt FROM cau_hoi_de_thi chdt
     JOIN de_thi dt ON dt.id = chdt.de_thi_id
     WHERE chdt.cau_hoi_id = ? AND dt.trang_thai IN ('NHAP', 'DA_HUY')`,
    [cauHoiId],
  );

  return linked.map((row) => row.de_thi_id);
}

async function deleteOwned(connection, id, giaoVienId) {
  const runner = connection || pool;
  const [result] = await runner.execute(
    'DELETE FROM cau_hoi WHERE id = ? AND giao_vien_id = ?',
    [id, giaoVienId],
  );

  return result.affectedRows > 0;
}

module.exports = {
  list,
  findById,
  findByIdForTeacher,
  create,
  update,
  setTrangThai,
  isInPublishedExam,
  hasAttemptHistory,
  isLocked,
  detachFromDraftOrCancelledExams,
  deleteOwned,
};
