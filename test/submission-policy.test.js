'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { __testables } = require('../src/services/attempt-service');

function attemptWithDeadline(deadlineIso, extraSeconds = 0) {
  return {
    han_nop: new Date(deadlineIso),
    thoi_gian_bo_sung_giay: extraSeconds,
  };
}

test('request submit đến sau hạn được phân loại tự nộp dù client không gửi cờ auto', () => {
  const attempt = attemptWithDeadline('2026-08-06T10:00:00.000Z');
  const afterDeadline = new Date('2026-08-06T10:00:00.001Z').getTime();

  const result = __testables.classifySubmission(attempt, false, afterDeadline);
  assert.equal(result.shouldSubmit, true);
  assert.equal(result.isAutoSubmit, true);
});

test('submit thủ công trước hạn vẫn là nộp thủ công và có tính giờ bù', () => {
  const attempt = attemptWithDeadline('2026-08-06T10:00:00.000Z', 120);

  const before = __testables.classifySubmission(
    attempt,
    false,
    new Date('2026-08-06T10:01:00.000Z').getTime(),
  );
  const atDeadline = __testables.classifySubmission(
    attempt,
    false,
    new Date('2026-08-06T10:02:00.000Z').getTime(),
  );
  assert.deepEqual({ shouldSubmit: before.shouldSubmit, isAutoSubmit: before.isAutoSubmit }, {
    shouldSubmit: true,
    isAutoSubmit: false,
  });
  assert.deepEqual({ shouldSubmit: atDeadline.shouldSubmit, isAutoSubmit: atDeadline.isAutoSubmit }, {
    shouldSubmit: true,
    isAutoSubmit: true,
  });
});

test('timer client không được tự nộp theo deadline cũ sau khi server đã bù giờ', () => {
  const attempt = attemptWithDeadline('2026-08-06T10:00:00.000Z', 120);
  const result = __testables.classifySubmission(
    attempt,
    true,
    new Date('2026-08-06T10:00:30.000Z').getTime(),
  );

  assert.equal(result.shouldSubmit, false);
  assert.equal(result.isAutoSubmit, false);
});
