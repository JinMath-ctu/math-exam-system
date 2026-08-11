'use strict';

const { body } = require('express-validator');

const examMetaRules = [
  body('tenDe')
    .trim()
    .notEmpty()
    .withMessage('Tên đề thi là bắt buộc.')
    .isLength({ max: 200 })
    .withMessage('Tên đề thi tối đa 200 ký tự.'),
  body('moTa')
    .optional({ checkFalsy: true })
    .trim(),
  body('thoiLuongPhut')
    .notEmpty()
    .withMessage('Thời lượng làm bài là bắt buộc.')
    .isInt({ min: 1 })
    .withMessage('Thời lượng làm bài phải là số nguyên dương (phút).'),
  body('thoiGianBatDau')
    .notEmpty()
    .withMessage('Giờ mở đề là bắt buộc.'),
  body('thoiGianKetThuc')
    .notEmpty()
    .withMessage('Giờ đóng đề là bắt buộc.'),
  body('soLanDuocLam')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('Số lần được làm phải là số nguyên dương.'),
];

const addQuestionRules = [
  body('cauHoiIds')
    .optional()
    .customSanitizer((value) => (Array.isArray(value) ? value : value != null && value !== '' ? [value] : [])),
  body('cauHoiId')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('Câu hỏi không hợp lệ.'),
  body('diem')
    .optional({ checkFalsy: true })
    .isFloat({ gt: 0 })
    .withMessage('Điểm câu hỏi phải lớn hơn 0.'),
];

const updateScoreRules = [
  body('diem')
    .notEmpty()
    .withMessage('Điểm câu hỏi là bắt buộc.')
    .isFloat({ gt: 0 })
    .withMessage('Điểm câu hỏi phải lớn hơn 0.'),
];

const updateScoresRules = [
  body().custom((_, { req }) => {
    const body = req.body || {};
    const hasFlat = Object.keys(body).some((key) => /^diemCauHoi_\d+$/.test(key));
    const nested = body.diemCauHoi;
    const hasNested = nested != null && typeof nested === 'object' && Object.keys(nested).length > 0;
    if (!hasFlat && !hasNested) {
      throw new Error('Danh sách điểm không hợp lệ.');
    }
    return true;
  }),
];

const assignRules = [
  body('lopHocId')
    .notEmpty()
    .withMessage('Vui lòng chọn lớp cần giao đề.')
    .isInt({ min: 1 })
    .withMessage('Lớp học không hợp lệ.'),
];

const unassignRules = [
  body('lopHocId')
    .notEmpty()
    .withMessage('Vui lòng chọn lớp cần hủy giao.')
    .isInt({ min: 1 })
    .withMessage('Lớp học không hợp lệ.'),
];

module.exports = {
  examMetaRules,
  addQuestionRules,
  updateScoreRules,
  updateScoresRules,
  assignRules,
  unassignRules,
};
