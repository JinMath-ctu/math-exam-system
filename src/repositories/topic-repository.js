'use strict';

const { pool } = require('../config/database');

function getExecutor(executor) {
  return executor || pool;
}

async function createTopic({ giaoVienId, tenChuDe, khoiLop, moTa }, executor) {
  const db = getExecutor(executor);
  const [result] = await db.execute(
    `INSERT INTO chu_de (giao_vien_id, ten_chu_de, khoi_lop, mo_ta)
     VALUES (?, ?, ?, ?)`,
    [giaoVienId, tenChuDe, khoiLop || null, moTa || null],
  );

  return findById(result.insertId, executor);
}

async function findById(id, executor) {
  const db = getExecutor(executor);
  const [rows] = await db.execute(
    `SELECT id, giao_vien_id, ten_chu_de, khoi_lop, mo_ta, created_at, updated_at
     FROM chu_de
     WHERE id = ?
     LIMIT 1`,
    [id],
  );

  return rows[0] || null;
}

async function findByIdForTeacher(id, giaoVienId, executor) {
  const db = getExecutor(executor);
  const [rows] = await db.execute(
    `SELECT id, giao_vien_id, ten_chu_de, khoi_lop, mo_ta, created_at, updated_at
     FROM chu_de
     WHERE id = ? AND giao_vien_id = ?
     LIMIT 1`,
    [id, giaoVienId],
  );

  return rows[0] || null;
}

async function listByTeacher(giaoVienId, { khoiLop, q } = {}, executor) {
  const db = getExecutor(executor);
  const conditions = ['cd.giao_vien_id = ?'];
  const params = [giaoVienId];

  if (khoiLop) {
    conditions.push('cd.khoi_lop = ?');
    params.push(khoiLop);
  }

  if (q) {
    conditions.push('cd.ten_chu_de LIKE ?');
    params.push(`%${q}%`);
  }

  const [rows] = await db.execute(
    `SELECT cd.id, cd.ten_chu_de, cd.khoi_lop, cd.mo_ta, cd.created_at,
       (SELECT COUNT(*) FROM cau_hoi ch
          WHERE ch.chu_de_id = cd.id AND ch.trang_thai = 'HOAT_DONG') AS so_cau_hoi
     FROM chu_de cd
     WHERE ${conditions.join(' AND ')}
     ORDER BY cd.ten_chu_de ASC`,
    params,
  );

  return rows;
}

async function updateTopic(id, { tenChuDe, khoiLop, moTa }, executor) {
  const db = getExecutor(executor);
  const [result] = await db.execute(
    `UPDATE chu_de
     SET ten_chu_de = ?, khoi_lop = ?, mo_ta = ?
     WHERE id = ?`,
    [tenChuDe, khoiLop || null, moTa || null, id],
  );

  return result.affectedRows > 0;
}

async function deleteTopic(id, executor) {
  const db = getExecutor(executor);
  const [result] = await db.execute('DELETE FROM chu_de WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

async function countActiveQuestions(topicId, executor) {
  const db = getExecutor(executor);
  const [rows] = await db.execute(
    `SELECT COUNT(*) AS total FROM cau_hoi WHERE chu_de_id = ? AND trang_thai = 'HOAT_DONG'`,
    [topicId],
  );

  return rows[0]?.total || 0;
}

module.exports = {
  createTopic,
  findById,
  findByIdForTeacher,
  listByTeacher,
  updateTopic,
  deleteTopic,
  countActiveQuestions,
};
