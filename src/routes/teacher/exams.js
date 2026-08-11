'use strict';

const express = require('express');
const examController = require('../../controllers/teacher-exam-controller');
const attemptController = require('../../controllers/teacher-attempt-controller');
const statisticsController = require('../../controllers/teacher-statistics-controller');
const {
  examMetaRules,
  addQuestionRules,
  updateScoreRules,
  updateScoresRules,
  assignRules,
  unassignRules,
} = require('../../validators/exam-validators');
const asyncHandler = require('../../utils/async-handler');

const router = express.Router();

router.get('/', asyncHandler(examController.list));
router.get('/create', asyncHandler(examController.showCreate));
router.post('/', examMetaRules, asyncHandler(examController.create));
router.post('/create', examMetaRules, asyncHandler(examController.create));

router.get('/:id', asyncHandler(examController.showDetail));
router.get('/:id/edit', asyncHandler(examController.showEdit));
router.put('/:id', examMetaRules, asyncHandler(examController.update));

router.post('/:id/questions', addQuestionRules, asyncHandler(examController.addQuestion));
router.post('/:id/questions/scores', updateScoresRules, asyncHandler(examController.updateQuestionScores));
router.put('/:id/questions/:questionId', updateScoreRules, asyncHandler(examController.updateQuestionScore));
router.delete('/:id/questions/:questionId', asyncHandler(examController.removeQuestion));

router.post('/:id/assign', assignRules, asyncHandler(examController.assignClass));
router.post('/:id/unassign', unassignRules, asyncHandler(examController.unassignClass));
router.post('/:id/publish', asyncHandler(examController.publish));
router.post('/:id/cancel', asyncHandler(examController.cancel));
router.post('/:id/delete', asyncHandler(examController.remove));
router.post('/:id/publish-results', asyncHandler(examController.publishResults));

router.get('/:id/attempts', asyncHandler(attemptController.listForExam));
router.get('/:id/statistics', asyncHandler(statisticsController.show));

module.exports = router;
