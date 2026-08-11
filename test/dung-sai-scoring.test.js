'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  parseStatementSelections,
  serializeStatementSelections,
  gradeDungSaiStatements,
} = require('../src/utils/dung-sai-scoring');

const statements = [
  { id: 1, la_dap_an_dung: true },
  { id: 2, la_dap_an_dung: false },
  { id: 3, la_dap_an_dung: true },
  { id: 4, la_dap_an_dung: false },
];

test('parse/serialize chỉ giữ lựa chọn boolean hợp lệ', () => {
  const serialized = serializeStatementSelections({ 1: true, 2: false, 3: 'true', 4: null });
  assert.deepEqual(JSON.parse(serialized), { selections: { 1: true, 2: false } });
  assert.deepEqual(parseStatementSelections(serialized), { 1: true, 2: false });
  assert.deepEqual(parseStatementSelections('không-phải-json'), {});
});

test('chấm đúng/sai 4 mệnh đề theo đúng các mức điểm V1', () => {
  const cases = [
    [{ 1: true, 2: false, 3: true, 4: false }, 2, true],
    [{ 1: false, 2: false, 3: true, 4: false }, 1, false],
    [{ 1: false, 2: true, 3: true, 4: false }, 0.5, false],
    [{ 1: false, 2: true, 3: false, 4: false }, 0.2, false],
    [{ 1: false, 2: true, 3: false, 4: true }, 0, false],
  ];

  cases.forEach(([selections, expectedScore, expectedCorrect]) => {
    const result = gradeDungSaiStatements(statements, selections, 2);
    assert.equal(result.diem, expectedScore);
    assert.equal(result.laDung, expectedCorrect);
  });
});

test('mệnh đề bỏ trống được tính là sai', () => {
  const result = gradeDungSaiStatements(statements, { 1: true, 2: false, 3: true }, 2);
  assert.equal(result.diem, 1);
  assert.equal(result.laDung, false);
});
