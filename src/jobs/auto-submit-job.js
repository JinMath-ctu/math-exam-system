'use strict';

const attemptRepository = require('../repositories/attempt-repository');
const attemptService = require('../services/attempt-service');

// Quét mỗi 45 giây các lượt DANG_LAM đã quá hạn nộp hiệu lực
// (NOW() > han_nop + thoi_gian_bo_sung_giay giây) và tự động nộp bài, phòng
// trường hợp client không kịp gọi API submit khi hết giờ (mất mạng, đóng tab,
// tắt máy...). Xem docs/service-rules.md mục 6.
const AUTO_SUBMIT_INTERVAL_MS = 45 * 1000;
let intervalId = null;
let isRunning = false;

async function runAutoSubmitScan() {
  if (isRunning) {
    return;
  }
  isRunning = true;

  try {
    const expiredAttempts = await attemptRepository.findExpiredInProgress();

    for (const row of expiredAttempts) {
      try {
        // hocSinhId = null: job chạy phía server, không có ngữ cảnh phiên đăng
        // nhập nên bỏ qua kiểm tra chủ sở hữu (attempt-service đã xử lý riêng).
        // eslint-disable-next-line no-await-in-loop
        await attemptService.submitAttempt(row.id, null, { auto: true });
      } catch (error) {
        // ATTEMPT_SUBMITTED nghĩa là đã có request khác (client hoặc lần quét
        // trước) nộp bài trước — bỏ qua an toàn, không phải lỗi thật sự.
        if (error.code !== 'ATTEMPT_SUBMITTED') {
          console.error(`[auto-submit] Lỗi khi tự động nộp lượt #${row.id}:`, error.message);
        }
      }
    }

    if (expiredAttempts.length > 0 && process.env.NODE_ENV === 'development') {
      console.log(`[auto-submit] Đã tự động nộp ${expiredAttempts.length} lượt làm quá hạn.`);
    }
  } catch (error) {
    console.error('[auto-submit] Lỗi khi quét lượt làm quá hạn:', error.message);
  } finally {
    isRunning = false;
  }
}

function startAutoSubmitJob() {
  if (intervalId) {
    return intervalId;
  }

  intervalId = setInterval(runAutoSubmitScan, AUTO_SUBMIT_INTERVAL_MS);
  runAutoSubmitScan();

  return intervalId;
}

function stopAutoSubmitJob() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

module.exports = {
  startAutoSubmitJob,
  stopAutoSubmitJob,
  runAutoSubmitScan,
};
