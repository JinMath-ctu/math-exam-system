'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { ERROR_CODES } = require('../src/utils/errors');
const { __testables: gradingPolicy } = require('../src/services/grading-service');

function exam(overrides = {}) {
  return { da_cong_bo_ket_qua: false, ...overrides };
}

function attempt(overrides = {}) {
  return { trang_thai: 'DA_NOP', ...overrides };
}

test('grading is read-only and rejected after result publication', () => {
  const policy = gradingPolicy.getGradingPolicy(
    exam({ da_cong_bo_ket_qua: true }),
    attempt({ trang_thai: 'DA_CHAM' }),
  );

  assert.equal(policy.allowed, false);
  assert.equal(policy.code, ERROR_CODES.CONFLICT);
  assert.match(policy.reason, /đã được công bố/);
  assert.throws(
    () => gradingPolicy.assertCanGrade(
      exam({ da_cong_bo_ket_qua: true }),
      attempt({ trang_thai: 'DA_CHAM' }),
    ),
    (error) => error.code === ERROR_CODES.CONFLICT,
  );
});

test('grading is rejected while the student is still working', () => {
  const policy = gradingPolicy.getGradingPolicy(exam(), attempt({ trang_thai: 'DANG_LAM' }));

  assert.equal(policy.allowed, false);
  assert.equal(policy.code, ERROR_CODES.VALIDATION_ERROR);
  assert.match(policy.reason, /chưa nộp bài/);
});

test('grading is rejected while an incident is pending review', () => {
  const policy = gradingPolicy.getGradingPolicy(exam(), attempt(), true);

  assert.equal(policy.allowed, false);
  assert.equal(policy.code, ERROR_CODES.CONFLICT);
  assert.match(policy.reason, /sự cố chờ xử lý/);
});

test('submitted and graded attempts remain correctable before publication', () => {
  assert.equal(gradingPolicy.getGradingPolicy(exam(), attempt({ trang_thai: 'DA_NOP' })).allowed, true);
  assert.equal(gradingPolicy.getGradingPolicy(exam(), attempt({ trang_thai: 'TU_DONG_NOP' })).allowed, true);
  assert.equal(gradingPolicy.getGradingPolicy(exam(), attempt({ trang_thai: 'DA_CHAM' })).allowed, true);
});
