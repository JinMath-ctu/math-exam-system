'use strict';

function flashMiddleware(req, res, next) {
  const success = req.session.flashSuccess || [];
  const error = req.session.flashError || [];
  const info = req.session.flashInfo || [];

  delete req.session.flashSuccess;
  delete req.session.flashError;
  delete req.session.flashInfo;

  res.locals.flash = {
    success,
    error,
    info,
  };

  req.flash = function flash(type, message) {
    const keyMap = {
      success: 'flashSuccess',
      error: 'flashError',
      info: 'flashInfo',
    };

    const key = keyMap[type];
    if (!key || !message) {
      return;
    }

    if (!req.session[key]) {
      req.session[key] = [];
    }

    req.session[key].push(String(message));
  };

  next();
}

module.exports = flashMiddleware;
