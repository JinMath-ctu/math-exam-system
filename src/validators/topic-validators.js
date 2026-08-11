'use strict';

const { body } = require('express-validator');

const topicRules = [
  body('tenChuDe')
    .trim()
    .notEmpty()
    .withMessage('Tên chủ đề là bắt buộc.')
    .isLength({ max: 150 })
    .withMessage('Tên chủ đề tối đa 150 ký tự.'),
  body('khoiLop')
    .optional({ checkFalsy: true })
    .isInt({ min: 1, max: 12 })
    .withMessage('Khối lớp phải từ 1 đến 12.')
    .toInt(),
  body('moTa')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Mô tả tối đa 2000 ký tự.'),
];

module.exports = {
  createTopicRules: topicRules,
  updateTopicRules: topicRules,
};
