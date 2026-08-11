'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseSelectedQuestions } = require('../src/services/exam-service').__testables;

test('parseSelectedQuestions đọc nhiều id và điểm theo map', () => {
  const selected = parseSelectedQuestions({
    cauHoiIds: ['3', '7', '3'],
    diemCauHoi: { 3: '1.5', 7: '2' },
  });

  assert.deepEqual(selected, [
    { cauHoiId: 3, diem: 1.5 },
    { cauHoiId: 7, diem: 2 },
  ]);
});

test('parseSelectedQuestions chấp nhận một id đơn', () => {
  const selected = parseSelectedQuestions({
    cauHoiIds: '11',
    diemCauHoi: { 11: '1' },
  });
  assert.deepEqual(selected, [{ cauHoiId: 11, diem: 1 }]);
});

test('parseSelectedQuestions báo lỗi khi điểm không hợp lệ', () => {
  assert.throws(
    () => parseSelectedQuestions({ cauHoiIds: ['5'], diemCauHoi: { 5: '0' } }),
    /Điểm của câu hỏi #5/,
  );
});

test('parseSelectedQuestions đọc điểm từ field phẳng diemCauHoi_ID', () => {
  const selected = parseSelectedQuestions({
    cauHoiIds: ['7', '8'],
    diemCauHoi_7: '0.5',
    diemCauHoi_8: '1.25',
  });

  assert.deepEqual(selected, [
    { cauHoiId: 7, diem: 0.5 },
    { cauHoiId: 8, diem: 1.25 },
  ]);
});

test('parseSelectedQuestions ưu tiên field phẳng hơn map lồng', () => {
  const selected = parseSelectedQuestions({
    cauHoiIds: ['9'],
    diemCauHoi: { 9: '3' },
    diemCauHoi_9: '1.5',
  });
  assert.deepEqual(selected, [{ cauHoiId: 9, diem: 1.5 }]);
});
