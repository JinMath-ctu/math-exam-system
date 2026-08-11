'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { __testables } = require('../src/services/attempt-service');

test('object rỗng không được coi là đã gửi lựa chọn mệnh đề', () => {
  assert.equal(__testables.hasMeaningfulStatementSelections({}), false);
  assert.equal(__testables.hasMeaningfulStatementSelections(null), false);
  assert.equal(__testables.hasMeaningfulStatementSelections(undefined), false);
  assert.equal(__testables.hasMeaningfulStatementSelections([]), false);
});

test('object có key được coi là đã gửi lựa chọn mệnh đề', () => {
  assert.equal(__testables.hasMeaningfulStatementSelections({ '12': true }), true);
  assert.equal(__testables.hasMeaningfulStatementSelections({ '12': false }), true);
});
