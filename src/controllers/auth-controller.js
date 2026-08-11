'use strict';

const { validationResult } = require('express-validator');
const authService = require('../services/auth-service');
const { regenerateWithUser } = require('../utils/session-auth');
const { AppError, ERROR_CODES } = require('../utils/errors');

function handleValidation(req) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0].msg, ERROR_CODES.VALIDATION_ERROR);
  }
}

function showLogin(req, res) {
  res.render('auth/login', {
    title: 'Đăng nhập',
    formData: {},
  });
}

function showRegister(req, res) {
  res.render('auth/register', {
    title: 'Đăng ký',
    formData: {},
  });
}

function showForgotPassword(req, res) {
  res.render('auth/forgot-password', {
    title: 'Quên mật khẩu',
    formData: {},
  });
}

function showResetPassword(req, res) {
  res.render('auth/reset-password', {
    title: 'Đặt lại mật khẩu',
    formData: { email: String(req.query.email || '') },
  });
}

async function register(req, res, next) {
  try {
    handleValidation(req);

    const { hoTen, email, password } = req.body;
    // V1 là hệ thống một giáo viên: tài khoản chủ hệ thống được tạo bằng seed,
    // còn đăng ký công khai luôn tạo học sinh dù client có sửa payload.
    const result = await authService.register({ hoTen, email, password, vaiTro: 'HOC_SINH' });

    await regenerateWithUser(req, {
      id: result.user.id,
      hoTen: result.user.ho_ten,
      email: result.user.email,
      vaiTro: result.user.vai_tro,
    });

    req.flash('success', 'Đăng ký thành công. Chào mừng bạn!');
    return res.redirect(result.redirectTo);
  } catch (error) {
    if (error instanceof AppError && error.code === ERROR_CODES.VALIDATION_ERROR) {
      return res.status(400).render('auth/register', {
        title: 'Đăng ký',
        formData: req.body,
        errorMessage: error.message,
      });
    }

    if (error instanceof AppError && error.code === ERROR_CODES.CONFLICT) {
      return res.status(409).render('auth/register', {
        title: 'Đăng ký',
        formData: req.body,
        errorMessage: error.message,
      });
    }

    return next(error);
  }
}

async function login(req, res, next) {
  try {
    handleValidation(req);

    const { email, password } = req.body;
    const result = await authService.login({ email, password });

    const returnTo = await regenerateWithUser(req, result.sessionUser);
    const redirectTo = returnTo || result.redirectTo;
    delete req.session.returnTo;

    req.flash('success', `Chào mừng trở lại, ${result.sessionUser.hoTen}!`);
    return res.redirect(redirectTo);
  } catch (error) {
    if (error instanceof AppError && (error.code === ERROR_CODES.VALIDATION_ERROR || error.code === ERROR_CODES.UNAUTHORIZED || error.code === ERROR_CODES.FORBIDDEN)) {
      return res.status(error.status).render('auth/login', {
        title: 'Đăng nhập',
        formData: req.body,
        errorMessage: error.message,
      });
    }

    return next(error);
  }
}

async function forgotPassword(req, res, next) {
  try {
    handleValidation(req);

    const result = await authService.requestPasswordReset({ email: req.body.email });
    req.flash('success', result.message);
    return res.redirect(`/auth/reset-password?email=${encodeURIComponent(req.body.email)}`);
  } catch (error) {
    if (error instanceof AppError && error.code === ERROR_CODES.VALIDATION_ERROR) {
      return res.status(400).render('auth/forgot-password', {
        title: 'Quên mật khẩu',
        formData: req.body,
        errorMessage: error.message,
      });
    }
    if (error && ['MAIL_NOT_CONFIGURED', 'MAIL_SEND_FAILED'].includes(error.code)) {
      return res.status(503).render('auth/forgot-password', {
        title: 'Quên mật khẩu',
        formData: req.body,
        errorMessage: error.code === 'MAIL_NOT_CONFIGURED'
          ? 'Chưa cấu hình gửi thư (SMTP). Vui lòng liên hệ quản trị viên.'
          : 'Không gửi được mã qua email. Thử lại sau hoặc kiểm tra cấu hình SMTP (Resend/Gmail).',
      });
    }
    return next(error);
  }
}

async function resetPassword(req, res, next) {
  try {
    handleValidation(req);

    const result = await authService.resetPassword({
      email: req.body.email,
      code: req.body.code,
      password: req.body.password,
    });

    req.flash('success', result.message);
    return res.redirect('/auth/login');
  } catch (error) {
    if (error instanceof AppError) {
      if (error.code === ERROR_CODES.VALIDATION_ERROR) {
        return res.status(400).render('auth/reset-password', {
          title: 'Đặt lại mật khẩu',
          formData: req.body,
          errorMessage: error.message,
        });
      }

      req.flash('error', error.message);
      return res.redirect('/auth/forgot-password');
    }
    return next(error);
  }
}

function logout(req, res, next) {
  req.session.destroy((error) => {
    if (error) {
      return next(error);
    }

    res.clearCookie('connect.sid');
    return res.redirect('/auth/login');
  });
}

module.exports = {
  showLogin,
  showRegister,
  showForgotPassword,
  showResetPassword,
  register,
  login,
  forgotPassword,
  resetPassword,
  logout,
};
