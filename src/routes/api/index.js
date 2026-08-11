'use strict';

const express = require('express');
const { requireAuth } = require('../../middleware/auth');
const examAttemptsRoutes = require('./exam-attempts');
const attemptsRoutes = require('./attempts');

const router = express.Router();

router.get('/health', requireAuth, (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.session.user.id,
      vaiTro: req.session.user.vaiTro,
    },
  });
});

router.use('/exams', examAttemptsRoutes);
router.use('/attempts', attemptsRoutes);

module.exports = router;
