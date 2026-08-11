'use strict';

const { body } = require('express-validator');

const registerRules = [
  body('hoTen')
    .trim()
    .notEmpty()
    .withMessage('Họ tên là bắt buộc.')
    .isLength({ max: 120 })
    .withMessage('Họ tên tối đa 120 ký tự.'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email là bắt buộc.')
    .isEmail()
    .withMessage('Email không hợp lệ.')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Mật khẩu là bắt buộc.')
    .isLength({ min: 6 })
    .withMessage('Mật khẩu phải có ít nhất 6 ký tự.'),
  body('vaiTro')
    .notEmpty()
    .withMessage('Vai trò là bắt buộc.')
    .equals('HOC_SINH')
    .withMessage('Trang đăng ký công khai chỉ dành cho học sinh.'),
];

const loginRules = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email là bắt buộc.')
    .isEmail()
    .withMessage('Email không hợp lệ.'),
  body('password')
    .notEmpty()
    .withMessage('Mật khẩu là bắt buộc.'),
];

const forgotPasswordRules = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email là bắt buộc.')
    .isEmail()
    .withMessage('Email không hợp lệ.'),
];

const resetPasswordRules = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email là bắt buộc.')
    .isEmail()
    .withMessage('Email không hợp lệ.'),
  body('code')
    .trim()
    .matches(/^\d{6}$/)
    .withMessage('Mã xác nhận phải gồm 6 chữ số.'),
  body('password')
    .notEmpty()
    .withMessage('Mật khẩu là bắt buộc.')
    .isLength({ min: 6 })
    .withMessage('Mật khẩu phải có ít nhất 6 ký tự.'),
  body('passwordConfirm')
    .notEmpty()
    .withMessage('Vui lòng xác nhận mật khẩu.')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Mật khẩu xác nhận không khớp.');
      }
      return true;
    }),
];

module.exports = {
  registerRules,
  loginRules,
  forgotPasswordRules,
  resetPasswordRules,
};
