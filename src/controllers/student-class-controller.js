'use strict';

const { validationResult } = require('express-validator');
const classService = require('../services/class-service');
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

async function index(req, res) {
  const classes = await classService.listMyClasses(req.session.user.id);

  res.render('student/classes/index', {
    title: 'Lớp học của tôi',
    user: req.session.user,
    classes,
  });
}

function showJoin(req, res) {
  res.render('student/classes/join', {
    title: 'Tham gia lớp học',
    user: req.session.user,
    formData: {},
  });
}

async function join(req, res, next) {
  try {
    handleValidation(req);

    const { maLop } = req.body;
    const cls = await classService.joinClass(req.session.user.id, maLop);

    req.flash('success', `Đã tham gia lớp "${cls.ten_lop}".`);
    return res.redirect('/student/classes');
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.status).render('student/classes/join', {
        title: 'Tham gia lớp học',
        user: req.session.user,
        formData: req.body,
        errorMessage: error.message,
      });
    }
    return next(error);
  }
}

async function leave(req, res, next) {
  const classId = parseId(req.params.id, 'Mã lớp không hợp lệ.');

  try {
    await classService.leaveClass(req.session.user.id, classId);
    req.flash('success', 'Đã rời lớp học.');
  } catch (error) {
    if (error instanceof AppError) {
      req.flash('error', error.message);
    } else {
      return next(error);
    }
  }

  return res.redirect('/student/classes');
}

module.exports = {
  index,
  showJoin,
  join,
  leave,
};
