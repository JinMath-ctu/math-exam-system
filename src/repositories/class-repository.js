'use strict';

const { pool } = require('../config/database');

function getExecutor(executor) {
  return executor || pool;
}

async function createClass({ giaoVienId, tenLop, maLop, moTa }, executor) {
  const db = getExecutor(executor);
  const [result] = await db.execute(
    `INSERT INTO lop_hoc (giao_vien_id, ten_lop, ma_lop, mo_ta)
     VALUES (?, ?, ?, ?)`,
    [giaoVienId, tenLop, maLop, moTa || null],
  );

  return findById(result.insertId, executor);
}

async function findById(id, executor) {
  const db = getExecutor(executor);
  const [rows] = await db.execute(
    `SELECT id, giao_vien_id, ten_lop, ma_lop, mo_ta, trang_thai, created_at, updated_at
     FROM lop_hoc
     WHERE id = ?
     LIMIT 1`,
    [id],
  );

  return rows[0] || null;
}

async function findByMaLop(maLop, executor) {
  const db = getExecutor(executor);
  const [rows] = await db.execute(
    `SELECT id, giao_vien_id, ten_lop, ma_lop, mo_ta, trang_thai
     FROM lop_hoc
     WHERE ma_lop = ?
     LIMIT 1`,
    [maLop],
  );

  return rows[0] || null;
}

async function findByMaLopForUpdate(maLop, executor) {
  const db = getExecutor(executor);
  const [rows] = await db.execute(
    `SELECT id, giao_vien_id, ten_lop, ma_lop, mo_ta, trang_thai
     FROM lop_hoc
     WHERE ma_lop = ?
     LIMIT 1
     FOR UPDATE`,
    [maLop],
  );

  return rows[0] || null;
}

async function listByTeacher(giaoVienId, { trangThai, q } = {}, executor) {
  const db = getExecutor(executor);
  const conditions = ['l.giao_vien_id = ?'];
  const params = [giaoVienId];

  if (trangThai) {
    conditions.push('l.trang_thai = ?');
    params.push(trangThai);
  }

  if (q) {
    conditions.push('(l.ten_lop LIKE ? OR l.ma_lop LIKE ?)');
    params.push(`%${q}%`, `%${q}%`);
  }

  const [rows] = await db.execute(
    `SELECT l.id, l.ten_lop, l.ma_lop, l.mo_ta, l.trang_thai, l.created_at,
       (SELECT COUNT(*) FROM thanh_vien_lop tv
          WHERE tv.lop_hoc_id = l.id AND tv.trang_thai = 'DANG_HOC') AS so_thanh_vien,
       (SELECT COUNT(*) FROM luot_lam_bai llb
          WHERE llb.lop_hoc_id = l.id) AS so_luot_lam
     FROM lop_hoc l
     WHERE ${conditions.join(' AND ')}
     ORDER BY l.created_at DESC`,
    params,
  );

  return rows;
}

async function updateClass(id, { tenLop, moTa }, executor) {
  const db = getExecutor(executor);
  const [result] = await db.execute(
    `UPDATE lop_hoc
     SET ten_lop = ?, mo_ta = ?
     WHERE id = ?`,
    [tenLop, moTa || null, id],
  );

  return result.affectedRows > 0;
}

async function archiveClass(id, executor) {
  const db = getExecutor(executor);
  const [result] = await db.execute(
    `UPDATE lop_hoc
     SET trang_thai = 'LUU_TRU'
     WHERE id = ? AND trang_thai = 'HOAT_DONG'`,
    [id],
  );

  return result.affectedRows > 0;
}

async function listMembers(lopHocId, { trangThai } = {}, executor) {
  const db = getExecutor(executor);
  const conditions = ['tv.lop_hoc_id = ?'];
  const params = [lopHocId];

  if (trangThai) {
    conditions.push('tv.trang_thai = ?');
    params.push(trangThai);
  }

  const [rows] = await db.execute(
    `SELECT tv.id, tv.hoc_sinh_id, tv.trang_thai, tv.ngay_tham_gia,
       u.ho_ten, u.email
     FROM thanh_vien_lop tv
     JOIN nguoi_dung u ON u.id = tv.hoc_sinh_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY u.ho_ten ASC`,
    params,
  );

  return rows;
}

async function findMembershipForUpdate(lopHocId, hocSinhId, executor) {
  const db = getExecutor(executor);
  const [rows] = await db.execute(
    `SELECT id, lop_hoc_id, hoc_sinh_id, trang_thai
     FROM thanh_vien_lop
     WHERE lop_hoc_id = ? AND hoc_sinh_id = ?
     LIMIT 1
     FOR UPDATE`,
    [lopHocId, hocSinhId],
  );

  return rows[0] || null;
}

async function addMember(lopHocId, hocSinhId, executor) {
  const db = getExecutor(executor);
  await db.execute(
    `INSERT INTO thanh_vien_lop (lop_hoc_id, hoc_sinh_id, trang_thai)
     VALUES (?, ?, 'DANG_HOC')`,
    [lopHocId, hocSinhId],
  );
}

async function setMemberStatus(membershipId, trangThai, executor) {
  const db = getExecutor(executor);
  const resetJoinDate = trangThai === 'DANG_HOC';
  const [result] = await db.execute(
    `UPDATE thanh_vien_lop
     SET trang_thai = ?${resetJoinDate ? ', ngay_tham_gia = CURRENT_TIMESTAMP' : ''}
     WHERE id = ?`,
    [trangThai, membershipId],
  );

  return result.affectedRows > 0;
}

async function listMyClasses(hocSinhId, executor) {
  const db = getExecutor(executor);
  const [rows] = await db.execute(
    `SELECT l.id, l.ten_lop, l.ma_lop, l.mo_ta, l.trang_thai, tv.ngay_tham_gia
     FROM thanh_vien_lop tv
     JOIN lop_hoc l ON l.id = tv.lop_hoc_id
     WHERE tv.hoc_sinh_id = ? AND tv.trang_thai = 'DANG_HOC'
     ORDER BY tv.ngay_tham_gia DESC`,
    [hocSinhId],
  );

  return rows;
}

async function hasActiveAttemptInClass(lopHocId, hocSinhId, executor) {
  const db = getExecutor(executor);
  const [rows] = await db.execute(
    `SELECT id
     FROM luot_lam_bai
     WHERE lop_hoc_id = ? AND hoc_sinh_id = ? AND trang_thai = 'DANG_LAM'
     LIMIT 1`,
    [lopHocId, hocSinhId],
  );

  return rows.length > 0;
}

async function countAttemptsInClass(lopHocId, executor) {
  const db = getExecutor(executor);
  const [rows] = await db.execute(
    'SELECT COUNT(*) AS total FROM luot_lam_bai WHERE lop_hoc_id = ?',
    [lopHocId],
  );
  return rows[0]?.total || 0;
}

async function findByIdForTeacherForUpdate(connection, id, giaoVienId) {
  const [rows] = await connection.execute(
    `SELECT id, giao_vien_id, ten_lop, ma_lop, mo_ta, trang_thai
     FROM lop_hoc
     WHERE id = ? AND giao_vien_id = ?
     LIMIT 1
     FOR UPDATE`,
    [id, giaoVienId],
  );
  return rows[0] || null;
}

async function deleteOwned(connection, id, giaoVienId) {
  const runner = connection || pool;
  const [result] = await runner.execute(
    'DELETE FROM lop_hoc WHERE id = ? AND giao_vien_id = ?',
    [id, giaoVienId],
  );
  return result.affectedRows > 0;
}

module.exports = {
  createClass,
  findById,
  findByMaLop,
  findByMaLopForUpdate,
  findByIdForTeacherForUpdate,
  listByTeacher,
  updateClass,
  archiveClass,
  deleteOwned,
  countAttemptsInClass,
  listMembers,
  findMembershipForUpdate,
  addMember,
  setMemberStatus,
  listMyClasses,
  hasActiveAttemptInClass,
};
