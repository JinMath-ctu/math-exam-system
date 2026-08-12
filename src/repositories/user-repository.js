'use strict';

const { pool } = require('../config/database');

async function findByEmail(email) {
  const [rows] = await pool.execute(
    `SELECT id, ho_ten, email, mat_khau_hash, vai_tro, trang_thai
     FROM nguoi_dung
     WHERE email = ?
     LIMIT 1`,
    [email],
  );

  return rows[0] || null;
}

async function findById(id) {
  const [rows] = await pool.execute(
    `SELECT id, ho_ten, email, vai_tro, trang_thai
     FROM nguoi_dung
     WHERE id = ?
     LIMIT 1`,
    [id],
  );

  return rows[0] || null;
}

async function createUser({ hoTen, email, matKhauHash, vaiTro }) {
  const [result] = await pool.execute(
    `INSERT INTO nguoi_dung (ho_ten, email, mat_khau_hash, vai_tro, trang_thai)
     VALUES (?, ?, ?, ?, 'HOAT_DONG')`,
    [hoTen, email, matKhauHash, vaiTro],
  );

  return findById(result.insertId);
}

async function updatePasswordHash(userId, matKhauHash, executor = pool) {
  await executor.execute(
    `UPDATE nguoi_dung
     SET mat_khau_hash = ?
     WHERE id = ?`,
    [matKhauHash, userId],
  );
}

/**
 * Danh sách tài khoản học sinh (không trả mat_khau_hash).
 * Dùng cho giáo viên chủ hệ thống V1 — chỉ đọc.
 */
async function listStudents({ trangThai, q, limit = 500 } = {}) {
  const conditions = ["nd.vai_tro = 'HOC_SINH'"];
  const params = [];

  if (trangThai) {
    conditions.push('nd.trang_thai = ?');
    params.push(trangThai);
  }

  if (q) {
    conditions.push('(nd.ho_ten LIKE ? OR nd.email LIKE ?)');
    params.push(`%${q}%`, `%${q}%`);
  }

  const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 1000) : 500;

  const [rows] = await pool.execute(
    `SELECT nd.id, nd.ho_ten, nd.email, nd.trang_thai, nd.created_at,
       (SELECT COUNT(*) FROM thanh_vien_lop tvl
          WHERE tvl.hoc_sinh_id = nd.id AND tvl.trang_thai = 'DANG_HOC') AS so_lop_dang_hoc
     FROM nguoi_dung nd
     WHERE ${conditions.join(' AND ')}
     ORDER BY nd.created_at DESC, nd.id DESC
     LIMIT ${safeLimit}`,
    params,
  );

  return rows;
}

module.exports = {
  findByEmail,
  findById,
  createUser,
  updatePasswordHash,
  listStudents,
};
