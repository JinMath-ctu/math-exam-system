'use strict';

const { validationResult } = require('express-validator');
const topicService = require('../services/topic-service');
const { AppError, ERROR_CODES } = require('../utils/errors');

function handleValidation(req) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0].msg, ERROR_CODES.VALIDATION_ERROR);
  }
}

function parseId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError('Mã chủ đề không hợp lệ.', ERROR_CODES.VALIDATION_ERROR);
  }
  return id;
}

async function index(req, res) {
  const { khoiLop, q } = req.query;
  const topics = await topicService.listTopicsForTeacher(req.session.user.id, {
    khoiLop: khoiLop ? Number(khoiLop) : undefined,
    q: q ? String(q).trim() : undefined,
  });

  res.render('teacher/topics/index', {
    title: 'Chủ đề',
    user: req.session.user,
    topics,
    filters: { khoiLop: khoiLop || '', q: q || '' },
  });
}

async function create(req, res, next) {
  try {
    handleValidation(req);

    const { tenChuDe, khoiLop, moTa } = req.body;
    await topicService.createTopic({
      giaoVienId: req.session.user.id,
      tenChuDe,
      khoiLop: khoiLop ? Number(khoiLop) : null,
      moTa,
    });

    req.flash('success', 'Đã tạo chủ đề mới.');
  } catch (error) {
    if (error instanceof AppError) {
      req.flash('error', error.message);
    } else {
      return next(error);
    }
  }

  return res.redirect('/teacher/topics');
}

async function update(req, res, next) {
  const topicId = parseId(req.params.id);

  try {
    handleValidation(req);

    const { tenChuDe, khoiLop, moTa } = req.body;
    await topicService.updateTopic(topicId, req.session.user.id, {
      tenChuDe,
      khoiLop: khoiLop ? Number(khoiLop) : null,
      moTa,
    });

    req.flash('success', 'Đã cập nhật chủ đề.');
  } catch (error) {
    if (error instanceof AppError) {
      req.flash('error', error.message);
    } else {
      return next(error);
    }
  }

  return res.redirect('/teacher/topics');
}

async function remove(req, res, next) {
  const topicId = parseId(req.params.id);

  try {
    await topicService.deleteTopic(topicId, req.session.user.id);
    req.flash('success', 'Đã xóa chủ đề.');
  } catch (error) {
    if (error instanceof AppError) {
      req.flash('error', error.message);
    } else {
      return next(error);
    }
  }

  return res.redirect('/teacher/topics');
}

module.exports = {
  index,
  create,
  update,
  remove,
};
