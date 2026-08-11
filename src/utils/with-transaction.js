'use strict';

const { pool } = require('../config/database');

async function withTransaction(callback) {
  const connection = await pool.getConnection();
  const timezone = process.env.DB_TIMEZONE || '+07:00';

  try {
    await connection.beginTransaction();
    await connection.execute('SET time_zone = ?', [timezone]);
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = withTransaction;
