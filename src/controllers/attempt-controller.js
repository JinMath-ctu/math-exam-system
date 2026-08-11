'use strict';

const { validationResult } = require('express-validator');
const attemptService = require('../services/attempt-service');
const { toIso8601VN } = require('../utils/datetime');
const { AppError, ERROR_CODES } = require('../utils/errors');

function handleValidation(req) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0].msg, ERROR_CODES.VALIDATION_ERROR);
  }
}

function parseId(value, message) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(message || 'Mã định danh không hợp lệ.', ERROR_CODES.VALIDATION_ERROR);
  }
  return id;
}

function ok(res, data, status = 200) {
  return res.status(status).json({
    success: true,
    data,
    meta: { serverTime: toIso8601VN(new Date()) },
  });
}

// POST /api/exams/:examId/classes/:classId/start
async function start(req, res) {
  const examId = parseId(req.params.examId, 'Mã đề thi không hợp lệ.');
  const classId = parseId(req.params.classId, 'Mã lớp học không hợp lệ.');

  const { attempt, isNew } = await attemptService.startAttempt(examId, classId, req.session.user.id);

  return ok(res, {
    attemptId: attempt.id,
    examId: attempt.de_thi_id,
    classId: attempt.lop_hoc_id,
    lanThu: attempt.lan_thu,
    status: attempt.trang_thai,
    startedAt: toIso8601VN(attempt.thoi_gian_bat_dau),
    effectiveDeadline: toIso8601VN(attemptService.computeEffectiveDeadline(attempt)),
    isNew,
  }, isNew ? 201 : 200);
}

// GET /api/attempts/:attemptId
async function getOne(req, res) {
  const attemptId = parseId(req.params.attemptId, 'Mã lượt làm bài không hợp lệ.');
  const summary = await attemptService.getOwnedAttemptSummary(attemptId, req.session.user.id);
  return ok(res, summary);
}

// GET /api/attempts/:attemptId/state
async function getState(req, res) {
  const attemptId = parseId(req.params.attemptId, 'Mã lượt làm bài không hợp lệ.');
  const state = await attemptService.getState(attemptId, req.session.user.id);
  return ok(res, state);
}

// PUT /api/attempts/:attemptId/answers/:questionId
async function saveAnswer(req, res) {
  handleValidation(req);

  const attemptId = parseId(req.params.attemptId, 'Mã lượt làm bài không hợp lệ.');
  const questionId = parseId(req.params.questionId, 'Mã câu hỏi không hợp lệ.');

  const result = await attemptService.saveAnswer(attemptId, req.session.user.id, questionId, req.body || {});
  return ok(res, result);
}

// POST /api/attempts/:attemptId/heartbeat
async function heartbeat(req, res) {
  const attemptId = parseId(req.params.attemptId, 'Mã lượt làm bài không hợp lệ.');
  const result = await attemptService.heartbeat(attemptId, req.session.user.id);
  return ok(res, result);
}

// POST /api/attempts/:attemptId/submit
async function submit(req, res) {
  const attemptId = parseId(req.params.attemptId, 'Mã lượt làm bài không hợp lệ.');
  const result = await attemptService.submitAttempt(attemptId, req.session.user.id, {
    auto: false,
    clientAutoRequested: req.body?.autoSubmit === true,
  });
  return ok(res, result);
}

module.exports = {
  start,
  getOne,
  getState,
  saveAnswer,
  heartbeat,
  submit,
};
