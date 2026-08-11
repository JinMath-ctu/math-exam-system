'use strict';

const gradingService = require('../services/grading-service');
const { AppError } = require('../utils/errors');
const { formatDateTimeVN } = require('../utils/datetime');

async function listForExam(req, res, next) {
  try {
    const result = await gradingService.listAttemptsForExam(req.params.id, req.session.user.id, req.query);

    res.render('teacher/attempts/list', {
      title: `Lượt làm — ${result.exam.ten_de}`,
      user: req.session.user,
      exam: result.exam,
      assignedClasses: result.assignedClasses,
      publishResultsStatus: result.publishResultsStatus,
      attempts: result.rows,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
      filters: req.query,
      formatDateTimeVN,
    });
  } catch (error) {
    next(error);
  }
}

async function showGrade(req, res, next) {
  try {
    const {
      attempt,
      essayQuestions,
      reviewQuestions,
      canGrade,
      gradingBlockedReason,
    } = await gradingService.getGradeView(req.params.attemptId, req.session.user.id);

    res.render('teacher/attempts/grade', {
      title: `Chấm bài — ${attempt.ten_de}`,
      user: req.session.user,
      attempt,
      essayQuestions,
      reviewQuestions,
      canGrade,
      gradingBlockedReason,
      formatDateTimeVN,
    });
  } catch (error) {
    next(error);
  }
}

async function grade(req, res, next) {
  try {
    const result = await gradingService.gradeAttempt(req.params.attemptId, req.session.user.id, req.body.grades);
    req.flash('success', result.becameGraded
      ? 'Đã lưu điểm. Lượt làm đã được chấm xong (DA_CHAM).'
      : 'Đã lưu điểm chấm tự luận.');
    return res.redirect(`/teacher/attempts/${req.params.attemptId}/grade`);
  } catch (error) {
    if (error instanceof AppError) {
      req.flash('error', error.message);
      return res.redirect(`/teacher/attempts/${req.params.attemptId}/grade`);
    }
    return next(error);
  }
}

module.exports = {
  listForExam,
  showGrade,
  grade,
};
