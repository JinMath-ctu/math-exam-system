'use strict';

const { validationResult } = require('express-validator');
const incidentService = require('../services/incident-service');
const attemptRepository = require('../repositories/attempt-repository');
const { AppError, ERROR_CODES } = require('../utils/errors');
const { formatDateTimeVN } = require('../utils/datetime');
const { LOAI_SU_CO_VALUES } = require('../validators/incident-validators');

function handleValidation(req) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0].msg, ERROR_CODES.VALIDATION_ERROR);
  }
}

async function showReportForm(req, res, next) {
  try {
    const attempt = await attemptRepository.findByIdForStudentWithExam(req.params.attemptId, req.session.user.id);
    if (!attempt) {
      req.flash('error', 'Không tìm thấy lượt làm bài.');
      return res.redirect('/student/dashboard');
    }

    const incidents = await incidentService.listForStudentAttempt(attempt.id, req.session.user.id);

    return res.render('student/attempts/report-incident', {
      title: 'Báo cáo sự cố bài thi',
      user: req.session.user,
      attempt,
      incidents,
      loaiSuCoValues: LOAI_SU_CO_VALUES,
      formatDateTimeVN,
    });
  } catch (error) {
    return next(error);
  }
}

async function reportIncident(req, res, next) {
  try {
    handleValidation(req);
    await incidentService.reportIncident(req.params.attemptId, req.session.user.id, req.body);
    req.flash('success', 'Đã gửi báo cáo sự cố. Vui lòng chờ giáo viên xem xét và duyệt bù giờ (nếu hợp lệ).');
  } catch (error) {
    if (error instanceof AppError) {
      req.flash('error', error.message);
    } else {
      return next(error);
    }
  }
  return res.redirect(`/student/attempts/${req.params.attemptId}/incidents/new`);
}

module.exports = {
  showReportForm,
  reportIncident,
};
