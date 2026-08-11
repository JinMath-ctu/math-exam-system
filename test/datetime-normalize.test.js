'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  toDatetimeInputValue,
  toDatetimeVnInputValue,
  toMysqlDatetime,
  dateToMysqlDatetime,
  toIso8601VN,
} = require('../src/utils/datetime');
const { normalizeShortAnswer } = require('../src/utils/normalize');

test('định dạng thời gian Việt Nam không phụ thuộc timezone máy chạy Node', () => {
  const instant = new Date('2026-08-06T08:05:09.000Z');
  assert.equal(toDatetimeInputValue(instant), '2026-08-06T15:05');
  assert.equal(toDatetimeVnInputValue(instant), '06/08/2026 15:05');
  assert.equal(dateToMysqlDatetime(instant), '2026-08-06 15:05:09');
  assert.equal(toIso8601VN(instant), '2026-08-06T15:05:09+07:00');
});

test('datetime-local được chuyển thành chuỗi MySQL có giây', () => {
  assert.equal(toMysqlDatetime('2026-08-06T15:05'), '2026-08-06 15:05:00');
  assert.equal(toMysqlDatetime('2026-08-06T15:05:12'), '2026-08-06 15:05:12');
});

test('ô nhập dd/mm/yyyy HH:mm được chuyển đúng thứ tự ngày tháng', () => {
  assert.equal(toMysqlDatetime('08/08/2026 03:24'), '2026-08-08 03:24:00');
  assert.equal(toMysqlDatetime('10/08/2026 15:30'), '2026-08-10 15:30:00');
  assert.equal(toMysqlDatetime('32/08/2026 15:30'), null);
  assert.equal(toDatetimeVnInputValue('2026-08-10T15:30'), '10/08/2026 15:30');
});

test('đáp án ngắn được chuẩn hóa khoảng trắng và chữ hoa thường', () => {
  assert.equal(normalizeShortAnswer('  Hàm   Số  '), 'hàm số');
  assert.equal(normalizeShortAnswer(null), '');
});
