'use strict';

require('dotenv').config();
const { pool } = require('../src/config/database');

(async () => {
  try {
    const [rows] = await pool.query("SHOW TABLES LIKE 'dat_lai_mat_khau'");
    if (!rows.length) {
      console.log('TABLE_MISSING');
      return;
    }
    console.log('TABLE_EXISTS');
    const [cols] = await pool.query('DESCRIBE dat_lai_mat_khau');
    console.log(cols.map((c) => c.Field).join(', '));
  } catch (error) {
    console.log('ERROR', error.code || error.message);
  } finally {
    await pool.end();
  }
})();
