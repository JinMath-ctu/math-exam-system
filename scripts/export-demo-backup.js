'use strict';

/**
 * Export thô DB đang chạy — KHÔNG dùng cho nộp bài.
 * Dùng scripts/build-clean-demo-backup.js (npm run demo:backup) để tạo file sạch.
 */

console.error(
  'Đã tắt export dump DB đang chạy để tránh lộ dữ liệu cá nhân.\n'
  + 'Chạy: npm run demo:backup   (build-clean-demo-backup.js từ schema + seed)',
);
process.exit(1);
