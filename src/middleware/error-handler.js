'use strict';

const { AppError, ERROR_CODES } = require('../utils/errors');

function isApiRequest(req) {
  return req.originalUrl?.startsWith('/api/')
    || req.originalUrl === '/api'
    || req.xhr
    || req.headers.accept?.includes('application/json');
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  let appError = err;

  if (!(err instanceof AppError)) {
    console.error(err);
    appError = new AppError(
      process.env.NODE_ENV === 'production'
        ? 'Đã xảy ra lỗi hệ thống.'
        : err.message || 'Đã xảy ra lỗi hệ thống.',
      ERROR_CODES.DATABASE_ERROR,
      500,
    );
  }

  const payload = {
    success: false,
    error: {
      code: appError.code,
      message: appError.message,
    },
  };

  if (appError.details !== undefined) {
    payload.error.details = appError.details;
  }

  if (process.env.NODE_ENV !== 'production' && err.stack) {
    payload.error.stack = err.stack;
  }

  if (isApiRequest(req)) {
    return res.status(appError.status).json(payload);
  }

  if (appError.status === 404) {
    return res.status(404).render('errors/404', {
      title: 'Không tìm thấy trang',
      message: appError.message,
    });
  }

  return res.status(appError.status >= 400 && appError.status < 600 ? appError.status : 500).render('errors/500', {
    title: 'Lỗi hệ thống',
    message: appError.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
}

function notFoundHandler(req, res, next) {
  next(new AppError('Không tìm thấy trang yêu cầu.', ERROR_CODES.NOT_FOUND));
}

module.exports = {
  errorHandler,
  notFoundHandler,
};
