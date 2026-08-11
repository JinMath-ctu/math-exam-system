'use strict';

const { body } = require('express-validator');

const createClassRules = [
  body('tenLop')
    .trim()
    .notEmpty()
    .withMessage('Tên lớp là bắt buộc.')
    .isLength({ max: 150 })
    .withMessage('Tên lớp tối đa 150 ký tự.'),
  body('maLop')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 4, max: 20 })
    .withMessage('Mã lớp phải có 4-20 ký tự.')
    .matches(/^[A-Za-z0-9]+$/)
    .withMessage('Mã lớp chỉ gồm chữ và số, không dấu, không khoảng trắng.'),
  body('moTa')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Mô tả tối đa 2000 ký tự.'),
];

const updateClassRules = [
  body('tenLop')
    .trim()
    .notEmpty()
    .withMessage('Tên lớp là bắt buộc.')
    .isLength({ max: 150 })
    .withMessage('Tên lớp tối đa 150 ký tự.'),
  body('moTa')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Mô tả tối đa 2000 ký tự.'),
];

const joinClassRules = [
  body('maLop')
    .trim()
    .notEmpty()
    .withMessage('Mã lớp là bắt buộc.')
    .isLength({ min: 4, max: 20 })
    .withMessage('Mã lớp phải có 4-20 ký tự.'),
];

module.exports = {
  createClassRules,
  updateClassRules,
  joinClassRules,
};
