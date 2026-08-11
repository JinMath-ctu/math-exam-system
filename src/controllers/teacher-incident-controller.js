'use strict';

const { validationResult } = require('express-validator');
const incidentService = require('../services/incident-service');
const { AppError, ERROR_CODES } = require('../utils/errors');
const { formatDateTimeVN } = require('../utils/datetime');

function handleValidation(req) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0].msg, ERROR_CODES.VALIDATION_ERROR);
  }
}

async function list(req, res, next) {
  try {
    const result = await incidentService.listForTeacher(req.session.user.id, req.query);

    res.render('teacher/incidents/list', {
      title: 'Sự cố bài thi',
      user: req.session.user,
      incidents: result.rows,
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

async function detail(req, res, next) {
  try {
    const incident = await incidentService.getDetailForTeacher(req.params.id, req.session.user.id);

    res.render('teacher/incidents/detail', {
      title: 'Chi tiết sự cố',
      user: req.session.user,
      incident,
      formatDateTimeVN,
    });
  } catch (error) {
    next(error);
  }
}

async function approve(req, res, next) {
  try {
    handleValidation(req);
    await incidentService.approveIncident(req.params.id, req.session.user.id, req.body);
    req.flash('success', 'Đã duyệt sự cố và cộng thời gian bù giờ cho học sinh.');
  } catch (error) {
    if (error instanceof AppError) {
      req.flash('error', error.message);
    } else {
      return next(error);
    }
  }
  return res.redirect(`/teacher/incidents/${req.params.id}`);
}

async function reject(req, res, next) {
  try {
    handleValidation(req);
    await incidentService.rejectIncident(req.params.id, req.session.user.id, req.body);
    req.flash('success', 'Đã từ chối sự cố.');
  } catch (error) {
    if (error instanceof AppError) {
      req.flash('error', error.message);
    } else {
      return next(error);
    }
  }
  return res.redirect(`/teacher/incidents/${req.params.id}`);
}

module.exports = {
  list,
  detail,
  approve,
  reject,
};
