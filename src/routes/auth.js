'use strict';

const express = require('express');
const authController = require('../controllers/auth-controller');
const { requireGuest } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rate-limits');
const {
  registerRules,
  loginRules,
  forgotPasswordRules,
  resetPasswordRules,
} = require('../validators/auth-validators');
const asyncHandler = require('../utils/async-handler');

const router = express.Router();

router.get('/login', requireGuest, authController.showLogin);
router.post('/login', requireGuest, authLimiter, loginRules, asyncHandler(authController.login));

router.get('/register', requireGuest, authController.showRegister);
router.post('/register', requireGuest, authLimiter, registerRules, asyncHandler(authController.register));

router.get('/forgot-password', requireGuest, authController.showForgotPassword);
router.post(
  '/forgot-password',
  requireGuest,
  authLimiter,
  forgotPasswordRules,
  asyncHandler(authController.forgotPassword),
);

router.get('/reset-password', requireGuest, authController.showResetPassword);
router.post(
  '/reset-password',
  requireGuest,
  authLimiter,
  resetPasswordRules,
  asyncHandler(authController.resetPassword),
);

router.post('/logout', authController.logout);

module.exports = router;
