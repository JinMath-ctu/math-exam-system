'use strict';

/**
 * Lưu lại returnTo trước regenerate vì session.regenerate() tạo session mới
 * và xóa toàn bộ dữ liệu session cũ (kể cả returnTo).
 */
function preserveReturnTo(session) {
  const value = session && session.returnTo;
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  // Chỉ chấp nhận đường dẫn nội bộ tương đối để tránh open redirect.
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return null;
  }
  return trimmed;
}

function restoreReturnTo(session, returnTo) {
  if (returnTo) {
    session.returnTo = returnTo;
  }
}

/**
 * regenerate session (chống session fixation) rồi gán user, giữ returnTo nếu có.
 */
function regenerateWithUser(req, sessionUser) {
  const returnTo = preserveReturnTo(req.session);

  return new Promise((resolve, reject) => {
    req.session.regenerate((regenerateError) => {
      if (regenerateError) {
        reject(regenerateError);
        return;
      }

      req.session.user = sessionUser;
      restoreReturnTo(req.session, returnTo);

      req.session.save((saveError) => {
        if (saveError) {
          reject(saveError);
          return;
        }
        resolve(returnTo);
      });
    });
  });
}

module.exports = {
  preserveReturnTo,
  restoreReturnTo,
  regenerateWithUser,
};
