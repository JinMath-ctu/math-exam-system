'use strict';

const express = require('express');
const attemptController = require('../../controllers/teacher-attempt-controller');
const asyncHandler = require('../../utils/async-handler');

const router = express.Router();

router.get('/:attemptId/grade', asyncHandler(attemptController.showGrade));
router.post('/:attemptId/grade', asyncHandler(attemptController.grade));

module.exports = router;
