'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { ERROR_CODES } = require('../src/utils/errors');
const { __testables: examPolicy } = require('../src/services/exam-service');
const { __testables: resultPolicy } = require('../src/services/result-service');

function publishedExam(overrides = {}) {
  return {
    trang_thai: 'DA_CONG_BO',
    da_cong_bo_ket_qua: false,
    thoi_gian_ket_thuc: new Date('2026-08-06T02:00:00.000Z'),
    ...overrides,
  };
}

test('summarizeAttemptStatuses counts every attempt state', () => {
  const counts = examPolicy.summarizeAttemptStatuses([
    { trang_thai: 'DANG_LAM' },
    { trang_thai: 'DA_NOP' },
    { trang_thai: 'TU_DONG_NOP' },
    { trang_thai: 'DA_CHAM' },
    { trang_thai: 'DA_CHAM' },
  ]);

  assert.deepEqual(counts, {
    total: 5,
    DANG_LAM: 1,
    DA_NOP: 1,
    TU_DONG_NOP: 1,
    DA_CHAM: 2,
  });
});

test('result publication is rejected before close when there is no graded attempt yet', () => {
  const counts = examPolicy.summarizeAttemptStatuses([]);

  assert.throws(
    () => examPolicy.assertCanPublishResults(
      publishedExam(),
      counts,
      new Date('2026-08-06T01:59:59.000Z').getTime(),
    ),
    (error) => error.code === ERROR_CODES.VALIDATION_ERROR
      && /công bố sớm/.test(error.message),
  );
});

test('result publication is allowed early when every attempt is graded before close', () => {
  const counts = examPolicy.summarizeAttemptStatuses([
    { trang_thai: 'DA_CHAM' },
    { trang_thai: 'DA_CHAM' },
  ]);

  assert.doesNotThrow(() => examPolicy.assertCanPublishResults(
    publishedExam(),
    counts,
    new Date('2026-08-06T01:59:59.000Z').getTime(),
  ));
});

test('result publication is rejected while an attempt is in progress', () => {
  const counts = examPolicy.summarizeAttemptStatuses([
    { trang_thai: 'DA_CHAM' },
    { trang_thai: 'DANG_LAM' },
  ]);

  assert.throws(
    () => examPolicy.assertCanPublishResults(
      publishedExam(),
      counts,
      new Date('2026-08-06T02:00:01.000Z').getTime(),
    ),
    (error) => error.code === ERROR_CODES.VALIDATION_ERROR
      && /đang diễn ra/.test(error.message),
  );
});

test('result publication is rejected while a submitted attempt is ungraded', () => {
  const counts = examPolicy.summarizeAttemptStatuses([
    { trang_thai: 'DA_CHAM' },
    { trang_thai: 'DA_NOP' },
    { trang_thai: 'TU_DONG_NOP' },
  ]);

  assert.throws(
    () => examPolicy.assertCanPublishResults(
      publishedExam(),
      counts,
      new Date('2026-08-06T02:00:01.000Z').getTime(),
    ),
    (error) => error.code === ERROR_CODES.VALIDATION_ERROR
      && /chưa chấm xong/.test(error.message),
  );
});

test('result publication is allowed after close when every attempt is graded', () => {
  const counts = examPolicy.summarizeAttemptStatuses([
    { trang_thai: 'DA_CHAM' },
    { trang_thai: 'DA_CHAM' },
  ]);

  assert.doesNotThrow(() => examPolicy.assertCanPublishResults(
    publishedExam(),
    counts,
    new Date('2026-08-06T02:00:01.000Z').getTime(),
  ));
});

test('only a published, submitted and fully graded attempt is an official result', () => {
  assert.doesNotThrow(() => resultPolicy.assertOfficialResultVisible({
    da_cong_bo_ket_qua: true,
    trang_thai: 'DA_CHAM',
    thoi_gian_nop: new Date(),
  }));

  assert.throws(
    () => resultPolicy.assertOfficialResultVisible({
      da_cong_bo_ket_qua: false,
      trang_thai: 'DA_CHAM',
      thoi_gian_nop: new Date(),
    }),
    (error) => error.code === ERROR_CODES.RESULTS_NOT_PUBLISHED,
  );

  assert.throws(
    () => resultPolicy.assertOfficialResultVisible({
      da_cong_bo_ket_qua: true,
      trang_thai: 'DA_NOP',
      thoi_gian_nop: new Date(),
    }),
    (error) => error.code === ERROR_CODES.RESULTS_NOT_PUBLISHED,
  );

  assert.throws(
    () => resultPolicy.assertOfficialResultVisible({
      da_cong_bo_ket_qua: true,
      trang_thai: 'DA_CHAM',
      thoi_gian_nop: null,
    }),
    (error) => error.code === ERROR_CODES.RESULTS_NOT_PUBLISHED,
  );

  assert.throws(
    () => resultPolicy.assertOfficialResultVisible({
      da_cong_bo_ket_qua: true,
      trang_thai: 'DA_CHAM',
      thoi_gian_nop: new Date(),
    }, { hasInProgressAttempt: true }),
    (error) => error.code === ERROR_CODES.RESULTS_NOT_PUBLISHED
      && /lượt làm đang diễn ra/.test(error.message),
  );
});
