'use strict';

const crypto = require('crypto');
const bcrypt = require('bcrypt');
const userRepository = require('../repositories/user-repository');
const passwordResetRepository = require('../repositories/password-reset-repository');
const { sendMail } = require('../utils/mailer');
const withTransaction = require('../utils/with-transaction');
const { AppError, ERROR_CODES } = require('../utils/errors');

const SALT_ROUNDS = 10;
const CODE_TTL_MS = 10 * 60 * 1000; // 10 phút

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function getDashboardPath(vaiTro) {
  return vaiTro === 'GIAO_VIEN' ? '/teacher/dashboard' : '/student/dashboard';
}

function toSessionUser(user) {
  return {
    id: user.id,
    hoTen: user.ho_ten,
    email: user.email,
    vaiTro: user.vai_tro,
  };
}

function hashResetCode(email, code) {
  return crypto.createHmac('sha256', process.env.SESSION_SECRET || 'reset-code-secret')
    .update(`${normalizeEmail(email)}:${String(code)}`)
    .digest('hex');
}

function toMysqlDatetime(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} `
    + `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

async function register({ hoTen, email, password, vaiTro }) {
  const normalizedEmail = normalizeEmail(email);

  const existing = await userRepository.findByEmail(normalizedEmail);
  if (existing) {
    throw new AppError('Email đã được sử dụng.', ERROR_CODES.CONFLICT);
  }

  const matKhauHash = await bcrypt.hash(password, SALT_ROUNDS);

  let user;
  try {
    user = await userRepository.createUser({
      hoTen: hoTen.trim(),
      email: normalizedEmail,
      matKhauHash,
      vaiTro,
    });
  } catch (error) {
    // Hai request đăng ký đồng thời có thể cùng vượt qua bước SELECT phía trên.
    // Unique key của DB là hàng rào cuối; ánh xạ lỗi driver thành lỗi nghiệp vụ 409.
    if (error && error.code === 'ER_DUP_ENTRY') {
      throw new AppError('Email đã được sử dụng.', ERROR_CODES.CONFLICT);
    }
    throw error;
  }

  return {
    user,
    redirectTo: getDashboardPath(user.vai_tro),
  };
}

async function login({ email, password }) {
  const normalizedEmail = normalizeEmail(email);
  const user = await userRepository.findByEmail(normalizedEmail);

  if (!user) {
    throw new AppError('Email hoặc mật khẩu không đúng.', ERROR_CODES.UNAUTHORIZED);
  }

  if (user.trang_thai !== 'HOAT_DONG') {
    throw new AppError('Tài khoản đã bị khóa. Vui lòng liên hệ quản trị.', ERROR_CODES.FORBIDDEN);
  }

  const passwordMatch = await bcrypt.compare(password, user.mat_khau_hash);
  if (!passwordMatch) {
    throw new AppError('Email hoặc mật khẩu không đúng.', ERROR_CODES.UNAUTHORIZED);
  }

  return {
    sessionUser: toSessionUser(user),
    redirectTo: getDashboardPath(user.vai_tro),
  };
}

/**
 * Gửi mã xác nhận đặt lại mật khẩu tới email đã đăng ký.
 * Luôn trả thông báo thành công chung để không lộ email có tồn tại hay không.
 */
async function requestPasswordReset({ email }) {
  const normalizedEmail = normalizeEmail(email);
  let genericMessage = 'Nếu email đã đăng ký, mã xác nhận đã được gửi.';

  await passwordResetRepository.deleteStaleTokens();

  const user = await userRepository.findByEmail(normalizedEmail);
  if (!user || user.trang_thai !== 'HOAT_DONG') {
    return { message: genericMessage };
  }

  const code = crypto.randomInt(0, 1000000).toString().padStart(6, '0');
  const tokenHash = hashResetCode(normalizedEmail, code);
  const hetHanLuc = toMysqlDatetime(new Date(Date.now() + CODE_TTL_MS));

  await withTransaction(async (connection) => {
    await passwordResetRepository.invalidateActiveTokens(user.id, connection);
    await passwordResetRepository.createToken({
      nguoiDungId: user.id,
      tokenHash,
      hetHanLuc,
    }, connection);
  });

  try {
    await sendMail({
      to: user.email,
      subject: 'Mã xác nhận đặt lại mật khẩu — JinMath',
      text: [
        `Xin chào ${user.ho_ten},`,
        '',
        'Mã xác nhận đặt lại mật khẩu của bạn là:',
        code,
        '',
        'Mã có hiệu lực trong 10 phút và chỉ dùng được một lần.',
        'Nếu bạn không yêu cầu, hãy bỏ qua email này.',
      ].join('\n'),
      html: `
        <p>Xin chào,</p>
        <p>Mã xác nhận đặt lại mật khẩu JinMath của bạn là:</p>
        <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px">${code}</p>
        <p>Mã có hiệu lực trong <strong>10 phút</strong> và chỉ dùng được một lần.</p>
        <p>Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
      `,
    });
  } catch (error) {
    // Dev/demo: chưa cấu hình SMTP thì in mã ra console thay vì 503.
    if (error.code === 'MAIL_NOT_CONFIGURED' && process.env.NODE_ENV !== 'production') {
      console.warn(`[auth] SMTP chưa cấu hình — mã đặt lại mật khẩu cho ${user.email}: ${code}`);
      genericMessage = 'SMTP chưa cấu hình. Mã xác nhận đã in ra console máy chủ (chỉ môi trường development).';
      return { message: genericMessage };
    }

    // Không để mã ở trạng thái sử dụng được nếu email chưa được gửi thành công.
    await passwordResetRepository.invalidateActiveTokens(user.id);
    throw error;
  }

  return { message: genericMessage };
}

async function getValidResetCode(email, code) {
  if (!/^\d{6}$/.test(String(code || ''))) {
    throw new AppError('Mã xác nhận không hợp lệ.', ERROR_CODES.VALIDATION_ERROR);
  }

  const record = await passwordResetRepository.findValidByTokenHash(hashResetCode(email, code));
  if (!record) {
    throw new AppError('Mã xác nhận không đúng, đã hết hạn hoặc đã được sử dụng.', ERROR_CODES.VALIDATION_ERROR);
  }

  return record;
}

async function resetPassword({ email, code, password }) {
  const normalizedEmail = normalizeEmail(email);
  const record = await getValidResetCode(normalizedEmail, code);
  const matKhauHash = await bcrypt.hash(password, SALT_ROUNDS);

  await withTransaction(async (connection) => {
    const stillValid = await passwordResetRepository.findValidByTokenHash(
      hashResetCode(normalizedEmail, code),
      connection,
      { forUpdate: true },
    );
    if (!stillValid || stillValid.id !== record.id) {
      throw new AppError('Mã xác nhận đã hết hạn hoặc đã được sử dụng.', ERROR_CODES.CONFLICT);
    }

    await userRepository.updatePasswordHash(record.nguoi_dung_id, matKhauHash, connection);
    const marked = await passwordResetRepository.markUsed(record.id, connection);
    if (!marked) {
      throw new AppError('Mã xác nhận đã hết hạn hoặc đã được sử dụng.', ERROR_CODES.CONFLICT);
    }
  });

  return {
    message: 'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.',
  };
}

module.exports = {
  register,
  login,
  normalizeEmail,
  getDashboardPath,
  requestPasswordReset,
  getValidResetCode,
  resetPassword,
};
