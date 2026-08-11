'use strict';

const express = require('express');
const { pool } = require('../config/database');
const { toIso8601VN } = require('../utils/datetime');

const router = express.Router();

router.get('/', (req, res) => {
  if (req.session.user) {
    const redirectPath = req.session.user.vaiTro === 'GIAO_VIEN'
      ? '/teacher/dashboard'
      : '/student/dashboard';
    return res.redirect(redirectPath);
  }

  return res.render('home', {
    title: 'Trang chủ',
  });
});

router.get('/health', async (req, res) => {
  try {
    await pool.execute('SELECT 1 AS ok');
    return res.json({
      success: true,
      data: {
        status: 'ok',
        database: 'connected',
        uptimeSeconds: Math.floor(process.uptime()),
        version: require('../../package.json').version,
      },
      meta: { serverTime: toIso8601VN(new Date()) },
    });
  } catch (error) {
    return res.status(503).json({
      success: false,
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'Không thể kết nối cơ sở dữ liệu.',
      },
      meta: { serverTime: toIso8601VN(new Date()) },
    });
  }
});

module.exports = router;
