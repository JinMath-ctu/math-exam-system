'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { isApiRequest, requireAuth, requireTeacher } = require('../src/middleware/auth');
const { preserveReturnTo, restoreReturnTo } = require('../src/utils/session-auth');
const { ERROR_CODES } = require('../src/utils/errors');

function request(overrides = {}) {
  return {
    originalUrl: '/student/dashboard',
    path: '/student/dashboard',
    headers: {},
    session: {},
    xhr: false,
    ...overrides,
  };
}

test('nested /api route is recognized from originalUrl', () => {
  const req = request({
    originalUrl: '/api/attempts/12/state',
    path: '/12/state',
  });

  assert.equal(isApiRequest(req), true);
});

test('unauthenticated API request returns UNAUTHORIZED instead of redirecting', () => {
  const req = request({
    originalUrl: '/api/attempts/12/state',
    path: '/12/state',
  });
  let redirected = false;
  let forwardedError = null;

  requireAuth(req, { redirect() { redirected = true; } }, (error) => {
    forwardedError = error;
  });

  assert.equal(redirected, false);
  assert.equal(forwardedError.code, ERROR_CODES.UNAUTHORIZED);
  assert.equal(forwardedError.status, 401);
});

test('student cannot enter teacher area', () => {
  const req = request({
    session: { user: { id: 2, vaiTro: 'HOC_SINH' } },
  });
  let forwardedError = null;

  requireTeacher(req, {}, (error) => {
    forwardedError = error;
  });

  assert.equal(forwardedError.code, ERROR_CODES.FORBIDDEN);
  assert.equal(forwardedError.status, 403);
});

test('preserveReturnTo giữ đường dẫn nội bộ trước regenerate', () => {
  assert.equal(preserveReturnTo({ returnTo: '/teacher/exams/3' }), '/teacher/exams/3');
  assert.equal(preserveReturnTo({ returnTo: 'https://evil.example/phish' }), null);
  assert.equal(preserveReturnTo({ returnTo: '//evil.example' }), null);
  assert.equal(preserveReturnTo({}), null);
});

test('restoreReturnTo gắn lại returnTo vào session mới', () => {
  const session = { user: { id: 1 } };
  restoreReturnTo(session, '/student/exams/2');
  assert.equal(session.returnTo, '/student/exams/2');
});
