'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { ERROR_CODES } = require('../src/utils/errors');

test('ERROR_CODES có EXAM_HAS_ATTEMPTS cho hủy giao lớp', () => {
  assert.equal(ERROR_CODES.EXAM_HAS_ATTEMPTS, 'EXAM_HAS_ATTEMPTS');
});
