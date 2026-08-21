'use strict';

const crypto = require('crypto');
const fs = require('fs');
const { AppError, ERROR_CODES } = require('../utils/errors');

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Chỉ các route upload câu hỏi (multer) được defer CSRF đến sau khi parse body. */
function shouldDeferMultipartCsrf(req) {
  const contentType = String(req.headers['content-type'] || '');
  if (!contentType.includes('multipart/form-data')) {
    return false;
  }

  const path = req.path || '';
  if (req.method === 'POST' && (path === '/teacher/questions' || path === '/teacher/questions/create')) {
    return true;
  }

  // Đổi/xóa ảnh (kể cả câu đã khóa nội dung)
  if (req.method === 'POST' && /^\/teacher\/questions\/\d+\/image$/.test(path)) {
    return true;
  }

  // Form sửa: POST ?_method=PUT → PUT /teacher/questions/:id sau method-override
  if (req.method === 'PUT' && /^\/teacher\/questions\/\d+$/.test(path)) {
    return true;
  }

  return false;
}

function generateCsrfToken() {
  return crypto.randomBytes(32).toString('hex');
}

function readSubmittedToken(req) {
  return req.get('X-CSRF-Token') || req.body?._csrf || null;
}

function assertCsrf(req) {
  const submittedToken = readSubmittedToken(req);
  if (!submittedToken || submittedToken !== req.session.csrfToken) {
    throw new AppError('Phiên làm việc không hợp lệ. Vui lòng thử lại.', ERROR_CODES.FORBIDDEN);
  }
}

function cleanupUploadedRequestFile(req) {
  const filePath = req.file && req.file.path;
  if (!filePath) {
    return Promise.resolve();
  }

  return fs.promises.unlink(filePath).catch(() => {}).finally(() => {
    req.file = undefined;
  });
}

function csrfMiddleware(req, res, next) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = generateCsrfToken();
  }

  res.locals.csrfToken = req.session.csrfToken;

  if (!UNSAFE_METHODS.has(req.method)) {
    return next();
  }

  if (shouldDeferMultipartCsrf(req)) {
    req.deferredCsrf = true;
    return next();
  }

  try {
    assertCsrf(req);
  } catch (error) {
    return next(error);
  }

  return next();
}

function verifyDeferredCsrf(req, res, next) {
  if (!req.deferredCsrf) {
    return next();
  }

  try {
    assertCsrf(req);
    req.deferredCsrf = false;
  } catch (error) {
    cleanupUploadedRequestFile(req).finally(() => next(error));
    return;
  }

  return next();
}

module.exports = csrfMiddleware;
module.exports.verifyDeferredCsrf = verifyDeferredCsrf;
module.exports.__testables = {
  shouldDeferMultipartCsrf,
  assertCsrf,
  readSubmittedToken,
  cleanupUploadedRequestFile,
};
