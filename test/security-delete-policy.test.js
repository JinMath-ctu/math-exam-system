'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const csrf = require('../src/middleware/csrf');
const { ERROR_CODES } = require('../src/utils/errors');
const { __testables: questionPolicy } = require('../src/services/question-service');
const { __testables: examPolicy } = require('../src/services/exam-service');
const { __testables: classPolicy } = require('../src/services/class-service');
const { __testables: rateLimitPolicy } = require('../src/middleware/rate-limits');

const { shouldDeferMultipartCsrf } = csrf.__testables;

function multipartReq(overrides = {}) {
  return {
    method: 'POST',
    path: '/auth/logout',
    headers: { 'content-type': 'multipart/form-data; boundary=----x' },
    body: {},
    session: { csrfToken: 'valid-token' },
    get() { return null; },
    ...overrides,
  };
}

test('multipart CSRF chỉ defer cho route upload câu hỏi', () => {
  assert.equal(
    shouldDeferMultipartCsrf(multipartReq({ path: '/teacher/questions' })),
    true,
  );
  assert.equal(
    shouldDeferMultipartCsrf(multipartReq({ path: '/teacher/questions/create' })),
    true,
  );
  assert.equal(
    shouldDeferMultipartCsrf(multipartReq({
      method: 'PUT',
      path: '/teacher/questions/12',
    })),
    true,
  );
  assert.equal(
    shouldDeferMultipartCsrf(multipartReq({ path: '/teacher/exams/1/cancel' })),
    false,
  );
  assert.equal(
    shouldDeferMultipartCsrf(multipartReq({ path: '/auth/logout' })),
    false,
  );
  assert.equal(
    shouldDeferMultipartCsrf(multipartReq({ path: '/teacher/questions/5/delete' })),
    false,
  );
});

test('multipart POST không token tới action thường bị từ chối CSRF', () => {
  const req = multipartReq({ path: '/teacher/exams/1/delete' });
  let error = null;

  csrf(req, { locals: {} }, (err) => {
    error = err;
  });

  assert.ok(error);
  assert.equal(error.code, ERROR_CODES.FORBIDDEN);
  assert.equal(req.deferredCsrf, undefined);
});

test('multipart upload câu hỏi được defer CSRF (chưa verify)', () => {
  const req = multipartReq({ path: '/teacher/questions/create' });
  let calledNext = false;

  csrf(req, { locals: {} }, (err) => {
    assert.equal(err, undefined);
    calledNext = true;
  });

  assert.equal(calledNext, true);
  assert.equal(req.deferredCsrf, true);
});

test('không xóa cứng câu hỏi đã có lịch sử làm bài', () => {
  assert.throws(
    () => questionPolicy.assertQuestionHardDeleteAllowed({
      hasHistory: true,
      inPublishedExam: false,
    }),
    (error) => error.code === ERROR_CODES.QUESTION_IMMUTABLE,
  );
});

test('không xóa cứng câu hỏi thuộc đề đang công bố', () => {
  assert.throws(
    () => questionPolicy.assertQuestionHardDeleteAllowed({
      hasHistory: false,
      inPublishedExam: true,
    }),
    (error) => error.code === ERROR_CODES.QUESTION_IMMUTABLE,
  );
});

test('cho phép xóa cứng câu hỏi chưa thi, không thuộc đề công bố', () => {
  assert.doesNotThrow(() => questionPolicy.assertQuestionHardDeleteAllowed({
    hasHistory: false,
    inPublishedExam: false,
  }));
});

test('cho phép xóa cứng đề đã hủy kể cả khi có lượt làm', () => {
  assert.doesNotThrow(() => examPolicy.assertExamHardDeleteAllowed({
    trangThai: 'DA_HUY',
  }));
});

test('không xóa cứng đề đang công bố', () => {
  assert.throws(
    () => examPolicy.assertExamHardDeleteAllowed({
      trangThai: 'DA_CONG_BO',
    }),
    (error) => error.code === ERROR_CODES.EXAM_NOT_EDITABLE,
  );
});

test('không xóa cứng lớp đã có lượt làm', () => {
  assert.throws(
    () => classPolicy.assertClassHardDeleteAllowed(3),
    (error) => error.code === ERROR_CODES.CONFLICT,
  );
});

test('cho phép xóa cứng lớp chưa có lượt làm', () => {
  assert.doesNotThrow(() => classPolicy.assertClassHardDeleteAllowed(0));
});

test('rate limit không open-redirect theo Referer ngoài origin', () => {
  const req = {
    protocol: 'http',
    get(name) {
      if (name === 'host') return 'localhost:3000';
      if (name === 'Referer') return 'https://evil.example/phish';
      return undefined;
    },
  };

  assert.equal(rateLimitPolicy.safeAuthRedirect(req, '/auth/login'), '/auth/login');
});

test('rate limit chấp nhận Referer cùng origin dưới /auth/', () => {
  const req = {
    protocol: 'http',
    get(name) {
      if (name === 'host') return 'localhost:3000';
      if (name === 'Referer') return 'http://localhost:3000/auth/register?x=1';
      return undefined;
    },
  };

  assert.equal(rateLimitPolicy.safeAuthRedirect(req, '/auth/login'), '/auth/register?x=1');
});

test('multipart upload token sai: CSRF fail và xóa file multer đã ghi', async () => {
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const { verifyDeferredCsrf } = require('../src/middleware/csrf');

  const tmpPath = path.join(os.tmpdir(), `jinmath-csrf-orphan-${Date.now()}.png`);
  fs.writeFileSync(tmpPath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));

  const req = {
    deferredCsrf: true,
    session: { csrfToken: 'valid-token' },
    body: { _csrf: 'wrong-token' },
    file: { path: tmpPath, filename: path.basename(tmpPath) },
    get() { return null; },
  };

  const error = await new Promise((resolve) => {
    verifyDeferredCsrf(req, {}, (err) => resolve(err));
  });

  assert.ok(error);
  assert.equal(error.code, ERROR_CODES.FORBIDDEN);
  assert.equal(fs.existsSync(tmpPath), false);
  assert.equal(req.file, undefined);
});
