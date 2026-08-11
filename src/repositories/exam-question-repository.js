'use strict';

const { pool } = require('../config/database');

async function listByExam(deThiId) {
  const [rows] = await pool.execute(
    `SELECT chdt.id, chdt.de_thi_id, chdt.cau_hoi_id, chdt.thu_tu_goc, chdt.diem,
            ch.noi_dung, ch.noi_dung_latex, ch.loai_cau_hoi, ch.muc_do, ch.trang_thai AS cau_hoi_trang_thai
     FROM cau_hoi_de_thi chdt
     JOIN cau_hoi ch ON ch.id = chdt.cau_hoi_id
     WHERE chdt.de_thi_id = ?
     ORDER BY chdt.thu_tu_goc ASC`,
    [deThiId],
  );

  return rows;
}

async function findOne(deThiId, cauHoiId) {
  const [rows] = await pool.execute(
    `SELECT id, de_thi_id, cau_hoi_id, thu_tu_goc, diem
     FROM cau_hoi_de_thi
     WHERE de_thi_id = ? AND cau_hoi_id = ?
     LIMIT 1`,
    [deThiId, cauHoiId],
  );

  return rows[0] || null;
}

async function nextThuTu(connection, deThiId) {
  const runner = connection || pool;
  const [rows] = await runner.execute(
    'SELECT COALESCE(MAX(thu_tu_goc), 0) + 1 AS next_thu_tu FROM cau_hoi_de_thi WHERE de_thi_id = ?',
    [deThiId],
  );

  return rows[0].next_thu_tu;
}

async function add(connection, { deThiId, cauHoiId, diem, thuTuGoc }) {
  const runner = connection || pool;
  await runner.execute(
    'INSERT INTO cau_hoi_de_thi (de_thi_id, cau_hoi_id, thu_tu_goc, diem) VALUES (?, ?, ?, ?)',
    [deThiId, cauHoiId, thuTuGoc, diem],
  );
}

async function updateScore(connection, deThiId, cauHoiId, diem) {
  const runner = connection || pool;
  const [result] = await runner.execute(
    'UPDATE cau_hoi_de_thi SET diem = ? WHERE de_thi_id = ? AND cau_hoi_id = ?',
    [diem, deThiId, cauHoiId],
  );

  return result.affectedRows > 0;
}

async function remove(connection, deThiId, cauHoiId) {
  const runner = connection || pool;
  const [result] = await runner.execute(
    'DELETE FROM cau_hoi_de_thi WHERE de_thi_id = ? AND cau_hoi_id = ?',
    [deThiId, cauHoiId],
  );

  return result.affectedRows > 0;
}

async function sumScore(connection, deThiId) {
  const runner = connection || pool;
  const [rows] = await runner.execute(
    'SELECT COALESCE(SUM(diem), 0) AS total FROM cau_hoi_de_thi WHERE de_thi_id = ?',
    [deThiId],
  );

  return Number(rows[0].total);
}

async function count(deThiId) {
  const [rows] = await pool.execute(
    'SELECT COUNT(*) AS total FROM cau_hoi_de_thi WHERE de_thi_id = ?',
    [deThiId],
  );

  return rows[0]?.total || 0;
}

async function hasEssayQuestions(deThiId) {
  const [rows] = await pool.execute(
    `SELECT 1
     FROM cau_hoi_de_thi chdt
     JOIN cau_hoi ch ON ch.id = chdt.cau_hoi_id
     WHERE chdt.de_thi_id = ? AND ch.loai_cau_hoi = 'TU_LUAN'
     LIMIT 1`,
    [deThiId],
  );

  return rows.length > 0;
}

module.exports = {
  listByExam,
  findOne,
  nextThuTu,
  add,
  updateScore,
  remove,
  sumScore,
  count,
  hasEssayQuestions,
};
