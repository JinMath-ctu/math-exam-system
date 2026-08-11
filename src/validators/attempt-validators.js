'use strict';

const { body } = require('express-validator');

const saveAnswerRules = [
  body('answerVersion')
    .notEmpty()
    .withMessage('answerVersion là bắt buộc.')
    .isInt({ min: 1 })
    .withMessage('answerVersion phải là số nguyên dương.'),
  body('selectedAnswerId')
    .optional({ nullable: true, checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('selectedAnswerId không hợp lệ.'),
  body('answerText')
    .optional({ nullable: true })
    .isString()
    .isLength({ max: 10000 })
    .withMessage('Nội dung trả lời tối đa 10000 ký tự.'),
  body('bookmarked')
    .optional()
    .isBoolean()
    .withMessage('bookmarked phải là kiểu boolean.'),
  body('clientRequestId')
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .isLength({ max: 64 })
    .withMessage('clientRequestId tối đa 64 ký tự.'),
];

module.exports = {
  saveAnswerRules,
};
