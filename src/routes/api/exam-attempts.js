'use strict';

const express = require('express');
const { requireStudent } = require('../../middleware/auth');
const { startLimiter } = require('../../middleware/rate-limits');
const asyncHandler = require('../../utils/async-handler');
const attemptController = require('../../controllers/attempt-controller');

const router = express.Router();

// POST /api/exams/:examId/classes/:classId/start
router.post(
  '/:examId/classes/:classId/start',
  requireStudent,
  startLimiter,
  asyncHandler(attemptController.start),
);

module.exports = router;
