-- Thêm khối lớp trên câu hỏi để lọc ngân hàng (độc lập với chủ đề).
-- Chạy: node scripts/apply-cau-hoi-khoi-lop.js

USE web_kiem_tra_toan;

ALTER TABLE cau_hoi
  ADD COLUMN khoi_lop TINYINT UNSIGNED NULL
    COMMENT 'Khối lớp (1–12) để lọc ngân hàng câu hỏi'
    AFTER chu_de_id;

ALTER TABLE cau_hoi
  ADD CONSTRAINT chk_cau_hoi_khoi_lop
    CHECK (khoi_lop IS NULL OR (khoi_lop BETWEEN 1 AND 12));

ALTER TABLE cau_hoi
  ADD INDEX idx_cau_hoi_khoi_lop (khoi_lop);

-- Backfill từ chủ đề nếu có
UPDATE cau_hoi ch
JOIN chu_de cd ON cd.id = ch.chu_de_id
SET ch.khoi_lop = cd.khoi_lop
WHERE ch.khoi_lop IS NULL AND cd.khoi_lop IS NOT NULL;
