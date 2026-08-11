'use strict';

const examService = require('../services/exam-service');
const attemptService = require('../services/attempt-service');
const { AppError, ERROR_CODES } = require('../utils/errors');
const { formatDateTimeVN } = require('../utils/datetime');

function parseId(value, message) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(message || 'Mã định danh không hợp lệ.', ERROR_CODES.VALIDATION_ERROR);
  }
  return id;
}

async function listExams(req, res) {
  const exams = await examService.listAssignedExams(req.session.user.id);

  res.render('student/exams/list', {
    title: 'Bài thi được giao',
    user: req.session.user,
    exams,
    formatDateTimeVN,
  });
}

async function examDetail(req, res) {
  const examId = parseId(req.params.examId, 'Mã đề thi không hợp lệ.');
  const detail = await examService.getAssignedExamDetail(examId, req.session.user.id);

  res.render('student/exams/detail', {
    title: detail.exam.ten_de,
    user: req.session.user,
    ...detail,
    formatDateTimeVN,
  });
}

async function attemptRoom(req, res) {
  const attemptId = parseId(req.params.attemptId, 'Mã lượt làm bài không hợp lệ.');
  const { attempt, exam } = await attemptService.getRoomBootstrap(attemptId, req.session.user.id);

  res.render('student/attempts/room', {
    title: `Phòng thi — ${exam.ten_de}`,
    user: req.session.user,
    attempt,
    exam,
  });
}

module.exports = {
  listExams,
  examDetail,
  attemptRoom,
};
