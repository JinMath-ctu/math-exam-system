-- Chuyển câu Đúng/Sai từ 2 lựa chọn sang 4 mệnh đề (kiểu THPT).
-- Khuyến nghị chạy script Node (an toàn hơn với dữ liệu hiện có):
--   node scripts/apply-dung-sai-4-statements.js
--
-- Thang điểm (theo số mệnh đề sai, bỏ trống = sai):
--   0 sai → 1.0×điểm | 1 → 0.5× | 2 → 0.25× | 3 → 0.1× | 4 → 0

USE web_kiem_tra_toan;

-- File này chỉ ghi chú; áp dụng thực tế bằng script Node ở trên.
SELECT 'Use node scripts/apply-dung-sai-4-statements.js' AS huong_dan;
