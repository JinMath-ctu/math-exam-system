'use strict';

const express = require('express');
const { requireStudent } = require('../../middleware/auth');
const { submitLimiter } = require('../../middleware/rate-limits');
const asyncHandler = require('../../utils/async-handler');
const attemptController = require('../../controllers/attempt-controller');
const { saveAnswerRules } = require('../../validators/attempt-validators');

const router = express.Router();

router.get('/:attemptId/state', requireStudent, asyncHandler(attemptController.getState));
router.put(
  '/:attemptId/answers/:questionId',
  requireStudent,
  saveAnswerRules,
  asyncHandler(attemptController.saveAnswer),
);
router.post('/:attemptId/heartbeat', requireStudent, asyncHandler(attemptController.heartbeat));
router.post('/:attemptId/submit', requireStudent, submitLimiter, asyncHandler(attemptController.submit));
router.get('/:attemptId', requireStudent, asyncHandler(attemptController.getOne));

module.exports = router;
