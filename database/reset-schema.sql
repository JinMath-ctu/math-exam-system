-- =====================================================================
-- CHỈ DÙNG TRONG MÔI TRƯỜNG PHÁT TRIỂN.
-- LỆNH DƯỚI ĐÂY XÓA TOÀN BỘ DATABASE VÀ DỮ LIỆU BÊN TRONG.
-- KHÔNG chạy file này trên môi trường có dữ liệu thật cần giữ lại.
--
-- Cách dùng khi đang phát triển và muốn làm lại từ đầu:
--   mysql -u root -p < database/reset-schema.sql
--   mysql -u root -p < database/schema.sql
--   mysql -u root -p < database/seed.sql
-- =====================================================================

DROP DATABASE IF EXISTS web_kiem_tra_toan;
