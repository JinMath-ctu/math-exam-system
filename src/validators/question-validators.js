'use strict';

const { body } = require('express-validator');

const QUESTION_TYPES = ['MOT_DAP_AN', 'DUNG_SAI', 'TRA_LOI_NGAN', 'TU_LUAN'];
const DIFFICULTY_LEVELS = ['NHAN_BIET', 'THONG_HIEU', 'VAN_DUNG'];

const baseRules = [
  body('noiDung')
    .trim()
    .notEmpty()
    .withMessage('Nội dung câu hỏi là bắt buộc.'),
  body('mucDo')
    .notEmpty()
    .withMessage('Mức độ là bắt buộc.')
    .isIn(DIFFICULTY_LEVELS)
    .withMessage('Mức độ không hợp lệ.'),
  body('diemMacDinh')
    .notEmpty()
    .withMessage('Điểm mặc định là bắt buộc.')
    .isFloat({ gt: 0 })
    .withMessage('Điểm mặc định phải lớn hơn 0.'),
  body('chuDeId')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('Chủ đề không hợp lệ.'),
  body('khoiLop')
    .optional({ checkFalsy: true })
    .isInt({ min: 1, max: 12 })
    .withMessage('Khối lớp phải từ 1 đến 12.'),
  body('noiDungLatex')
    .optional({ checkFalsy: true })
    .trim(),
  body('loiGiai')
    .optional({ checkFalsy: true })
    .trim(),
  body('dapAnNganChuan')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage('Đáp án chuẩn tối đa 500 ký tự.'),
  body('dapAnNoiDung.*')
    .optional({ checkFalsy: true })
    .trim(),
  body('correctIndex')
    .optional({ checkFalsy: true })
    .isInt({ min: 0 })
    .withMessage('Đáp án đúng không hợp lệ.'),
];

const createRules = [
  body('loaiCauHoi')
    .notEmpty()
    .withMessage('Loại câu hỏi là bắt buộc.')
    .isIn(QUESTION_TYPES)
    .withMessage('Loại câu hỏi không hợp lệ.'),
  ...baseRules,
];

const updateRules = [...baseRules];

module.exports = {
  QUESTION_TYPES,
  DIFFICULTY_LEVELS,
  createRules,
  updateRules,
};
