-- Cho phép đề nháp có tong_diem = 0 (chưa gắn câu hỏi).
-- Chạy một lần trên DB hiện có:
--   mysql -u root -p web_kiem_tra_toan < database/fix-exam-tong-diem-draft.sql
-- Hoặc: node scripts/apply-exam-tong-diem-fix.js

USE web_kiem_tra_toan;

ALTER TABLE de_thi DROP CHECK chk_de_thi_tong_diem;

ALTER TABLE de_thi
  ADD CONSTRAINT chk_de_thi_tong_diem CHECK (tong_diem >= 0);

ALTER TABLE de_thi
  MODIFY COLUMN tong_diem DECIMAL(6,2) NOT NULL DEFAULT 0.00
    COMMENT 'Đồng bộ từ SUM(cau_hoi_de_thi.diem); nháp chưa có câu = 0';
