'use strict';

const express = require('express');
const questionController = require('../../controllers/teacher-question-controller');
const { uploadQuestionImage } = require('../../middleware/upload');
const { verifyDeferredCsrf } = require('../../middleware/csrf');
const { createRules, updateRules } = require('../../validators/question-validators');
const asyncHandler = require('../../utils/async-handler');

const router = express.Router();

router.get('/', asyncHandler(questionController.list));
router.get('/create', asyncHandler(questionController.showCreate));
router.post('/', uploadQuestionImage, verifyDeferredCsrf, createRules, asyncHandler(questionController.create));
router.post('/create', uploadQuestionImage, verifyDeferredCsrf, createRules, asyncHandler(questionController.create));

router.get('/:id', asyncHandler(questionController.showDetail));
router.get('/:id/edit', asyncHandler(questionController.showEdit));
router.put('/:id', uploadQuestionImage, verifyDeferredCsrf, updateRules, asyncHandler(questionController.update));
router.post('/:id/image', uploadQuestionImage, verifyDeferredCsrf, asyncHandler(questionController.updateImage));
router.post('/:id/delete', asyncHandler(questionController.remove));
router.delete('/:id', asyncHandler(questionController.remove));
router.post('/:id/copy', asyncHandler(questionController.copy));

module.exports = router;
