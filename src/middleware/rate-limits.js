'use strict';

const rateLimit = require('express-rate-limit');

function safeAuthRedirect(req, fallback) {
  const referer = req.get('Referer');
  if (!referer) {
    return fallback;
  }

  try {
    const target = new URL(referer, `${req.protocol}://${req.get('host')}`);
    const host = req.get('host');
    if (target.host === host && target.pathname.startsWith('/auth/')) {
      return `${target.pathname}${target.search}`;
    }
  } catch (_error) {
    // ignore invalid Referer
  }

  return fallback;
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Quá nhiều lần thử. Vui lòng thử lại sau.',
    },
  },
  handler(req, res) {
    if (req.path.startsWith('/api') || req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(429).json(this.message);
    }

    req.flash('error', 'Quá nhiều lần thử. Vui lòng thử lại sau 15 phút.');
    let fallback = '/auth/login';
    if (req.originalUrl.includes('register')) fallback = '/auth/register';
    else if (req.originalUrl.includes('forgot-password')) fallback = '/auth/forgot-password';
    else if (req.originalUrl.includes('reset-password')) fallback = '/auth/forgot-password';
    return res.redirect(safeAuthRedirect(req, fallback));
  },
});

const startLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Quá nhiều lần bắt đầu bài thi. Vui lòng chờ một lát.',
    },
  },
});

const submitLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Quá nhiều lần nộp bài. Vui lòng chờ một lát.',
    },
  },
});

const incidentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Quá nhiều báo cáo sự cố. Vui lòng thử lại sau.',
    },
  },
});

module.exports = {
  authLimiter,
  startLimiter,
  submitLimiter,
  incidentLimiter,
  __testables: {
    safeAuthRedirect,
  },
};
