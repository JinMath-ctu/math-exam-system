'use strict';

const { pool } = require('../config/database');

async function invalidateActiveTokens(nguoiDungId, executor = pool) {
  await executor.execute(
    `UPDATE dat_lai_mat_khau
     SET da_su_dung = 1
     WHERE nguoi_dung_id = ?
       AND da_su_dung = 0`,
    [nguoiDungId],
  );
}

async function createToken({ nguoiDungId, tokenHash, hetHanLuc }, executor = pool) {
  const [result] = await executor.execute(
    `INSERT INTO dat_lai_mat_khau (nguoi_dung_id, token_hash, het_han_luc, da_su_dung)
     VALUES (?, ?, ?, 0)`,
    [nguoiDungId, tokenHash, hetHanLuc],
  );
  return result.insertId;
}

async function findValidByTokenHash(tokenHash, executor = pool, { forUpdate = false } = {}) {
  const lock = forUpdate ? ' FOR UPDATE' : '';
  const [rows] = await executor.execute(
    `SELECT id, nguoi_dung_id, token_hash, het_han_luc, da_su_dung
     FROM dat_lai_mat_khau
     WHERE token_hash = ?
       AND da_su_dung = 0
       AND het_han_luc > NOW()
     LIMIT 1${lock}`,
    [tokenHash],
  );
  return rows[0] || null;
}

async function markUsed(id, executor = pool) {
  const [result] = await executor.execute(
    `UPDATE dat_lai_mat_khau
     SET da_su_dung = 1
     WHERE id = ? AND da_su_dung = 0`,
    [id],
  );
  return result.affectedRows > 0;
}

/** Xóa token đã dùng hoặc đã hết hạn để bảng không phình theo thời gian. */
async function deleteStaleTokens(executor = pool) {
  const [result] = await executor.execute(
    `DELETE FROM dat_lai_mat_khau
     WHERE da_su_dung = 1
        OR het_han_luc < NOW()`,
  );
  return result.affectedRows;
}

module.exports = {
  invalidateActiveTokens,
  createToken,
  findValidByTokenHash,
  markUsed,
  deleteStaleTokens,
};
