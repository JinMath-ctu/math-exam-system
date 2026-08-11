'use strict';

const { AppError, ERROR_CODES } = require('../utils/errors');

function isApiRequest(req) {
  return req.originalUrl?.startsWith('/api/')
    || req.originalUrl === '/api'
    || req.xhr
    || req.headers.accept?.includes('application/json');
}

function requireAuth(req, res, next) {
  if (!req.session.user) {
    if (isApiRequest(req)) {
      return next(new AppError('Bạn cần đăng nhập để tiếp tục.', ERROR_CODES.UNAUTHORIZED));
    }

    req.session.returnTo = req.originalUrl;
    return res.redirect('/auth/login');
  }

  return next();
}

function requireGuest(req, res, next) {
  if (req.session.user) {
    const redirectPath = req.session.user.vaiTro === 'GIAO_VIEN'
      ? '/teacher/dashboard'
      : '/student/dashboard';
    return res.redirect(redirectPath);
  }

  return next();
}

function requireTeacher(req, res, next) {
  if (!req.session.user) {
    if (isApiRequest(req)) {
      return next(new AppError('Bạn cần đăng nhập để tiếp tục.', ERROR_CODES.UNAUTHORIZED));
    }

    req.session.returnTo = req.originalUrl;
    return res.redirect('/auth/login');
  }

  if (req.session.user.vaiTro !== 'GIAO_VIEN') {
    return next(new AppError('Chỉ giáo viên mới có quyền truy cập.', ERROR_CODES.FORBIDDEN));
  }

  return next();
}

function requireStudent(req, res, next) {
  if (!req.session.user) {
    if (isApiRequest(req)) {
      return next(new AppError('Bạn cần đăng nhập để tiếp tục.', ERROR_CODES.UNAUTHORIZED));
    }

    req.session.returnTo = req.originalUrl;
    return res.redirect('/auth/login');
  }

  if (req.session.user.vaiTro !== 'HOC_SINH') {
    return next(new AppError('Chỉ học sinh mới có quyền truy cập.', ERROR_CODES.FORBIDDEN));
  }

  return next();
}

module.exports = {
  isApiRequest,
  requireAuth,
  requireGuest,
  requireTeacher,
  requireStudent,
};
