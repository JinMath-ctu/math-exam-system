'use strict';

const passwordResetRepository = require('../repositories/password-reset-repository');

// Dọn token đặt lại mật khẩu đã dùng / hết hạn định kỳ (bảng dat_lai_mat_khau).
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 giờ
let intervalId = null;
let isRunning = false;

async function runPasswordResetCleanup() {
  if (isRunning) {
    return;
  }
  isRunning = true;

  try {
    const deleted = await passwordResetRepository.deleteStaleTokens();
    if (deleted > 0 && process.env.NODE_ENV === 'development') {
      console.log(`[password-reset-cleanup] Đã xóa ${deleted} token cũ.`);
    }
  } catch (error) {
    console.error('[password-reset-cleanup] Lỗi khi dọn token:', error.message);
  } finally {
    isRunning = false;
  }
}

function startPasswordResetCleanupJob() {
  if (intervalId) {
    return;
  }

  // Chạy một lần khi khởi động để dọn dữ liệu cũ ngay.
  runPasswordResetCleanup();
  intervalId = setInterval(runPasswordResetCleanup, CLEANUP_INTERVAL_MS);
  if (typeof intervalId.unref === 'function') {
    intervalId.unref();
  }
}

function stopPasswordResetCleanupJob() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

module.exports = {
  startPasswordResetCleanupJob,
  stopPasswordResetCleanupJob,
  runPasswordResetCleanup,
};
