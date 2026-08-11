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

module.exports = {
  findByEmail,
  findById,
  createUser,
  updatePasswordHash,
};
