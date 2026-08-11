-- Bảng quên mật khẩu — ĐÃ GỘP vào database/schema.sql (bảng 15).
-- File này chỉ giữ lại để nâng cấp DB cũ đã cài schema trước khi gộp.
-- Cài mới: chỉ cần reset-schema.sql → schema.sql → seed.sql
--
-- mysql -u root -p web_kiem_tra_toan < database/password-reset.sql

USE web_kiem_tra_toan;

CREATE TABLE IF NOT EXISTS dat_lai_mat_khau (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nguoi_dung_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  het_han_luc DATETIME NOT NULL,
  da_su_dung TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_dlmk_nguoi_dung
    FOREIGN KEY (nguoi_dung_id) REFERENCES nguoi_dung(id) ON DELETE CASCADE,
  UNIQUE KEY uk_dlmk_token_hash (token_hash),
  INDEX idx_dlmk_user (nguoi_dung_id),
  INDEX idx_dlmk_expiry (het_han_luc)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
