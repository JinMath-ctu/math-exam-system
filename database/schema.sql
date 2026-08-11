-- =====================================================================
-- Schema niên luận: Web kiểm tra Toán trực tuyến
-- Công nghệ: MySQL >= 8.0.16 (yêu cầu bắt buộc — CHECK constraint chỉ
--   được MySQL THỰC THI từ bản 8.0.16 trở lên; bản thấp hơn vẫn chấp
--   nhận cú pháp nhưng ÂM THẦM BỎ QUA ràng buộc, dễ gây hiểu lầm là an toàn).
-- Node.js, Express.js, EJS
-- Phiên bản: bản chốt cuối sau các vòng rà soát thiết kế
--
-- LƯU Ý: file này KHÔNG chạy lại được nhiều lần liên tiếp (các CREATE TABLE
-- không có IF NOT EXISTS — cố tình không thêm, vì IF NOT EXISTS có thể che
-- giấu việc schema cũ chưa được cập nhật đúng). Muốn xóa và tạo lại toàn bộ
-- khi đang phát triển, dùng database/reset-schema.sql thay vì sửa file này.
-- =====================================================================

CREATE DATABASE IF NOT EXISTS web_kiem_tra_toan
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE web_kiem_tra_toan;

-- Thứ tự tạo bảng tuân theo phụ thuộc khóa ngoại: không tạo ngược.

-- ---------------------------------------------------------------------
-- 1. nguoi_dung
-- ---------------------------------------------------------------------
CREATE TABLE nguoi_dung (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ho_ten VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL,
  mat_khau_hash VARCHAR(255) NOT NULL,
  vai_tro ENUM('GIAO_VIEN','HOC_SINH') NOT NULL,
  anh_dai_dien VARCHAR(255) NULL,
  trang_thai ENUM('HOAT_DONG','TAM_KHOA') NOT NULL DEFAULT 'HOAT_DONG',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_nguoi_dung_email (email)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 2. lop_hoc
-- ---------------------------------------------------------------------
CREATE TABLE lop_hoc (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  giao_vien_id BIGINT UNSIGNED NOT NULL,
  ten_lop VARCHAR(150) NOT NULL,
  ma_lop VARCHAR(20) NOT NULL,
  mo_ta TEXT NULL,
  trang_thai ENUM('HOAT_DONG','LUU_TRU') NOT NULL DEFAULT 'HOAT_DONG',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_lop_giao_vien FOREIGN KEY (giao_vien_id) REFERENCES nguoi_dung(id),
  UNIQUE KEY uk_lop_ma_lop (ma_lop),
  INDEX idx_lop_giao_vien (giao_vien_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 3. thanh_vien_lop
-- ---------------------------------------------------------------------
CREATE TABLE thanh_vien_lop (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  lop_hoc_id BIGINT UNSIGNED NOT NULL,
  hoc_sinh_id BIGINT UNSIGNED NOT NULL,
  ngay_tham_gia DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  trang_thai ENUM('DANG_HOC','DA_ROI_LOP') NOT NULL DEFAULT 'DANG_HOC',
  UNIQUE KEY uk_thanh_vien_lop (lop_hoc_id, hoc_sinh_id),
  CONSTRAINT fk_tvl_lop FOREIGN KEY (lop_hoc_id) REFERENCES lop_hoc(id) ON DELETE CASCADE,
  CONSTRAINT fk_tvl_hoc_sinh FOREIGN KEY (hoc_sinh_id) REFERENCES nguoi_dung(id),
  INDEX idx_tvl_hoc_sinh (hoc_sinh_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 4. chu_de
-- ---------------------------------------------------------------------
CREATE TABLE chu_de (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  giao_vien_id BIGINT UNSIGNED NOT NULL,
  ten_chu_de VARCHAR(150) NOT NULL,
  khoi_lop TINYINT UNSIGNED NULL,
  mo_ta TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_chu_de_gv FOREIGN KEY (giao_vien_id) REFERENCES nguoi_dung(id),
  CONSTRAINT chk_chu_de_khoi_lop CHECK (khoi_lop IS NULL OR khoi_lop BETWEEN 1 AND 12)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 5. cau_hoi
-- ---------------------------------------------------------------------
CREATE TABLE cau_hoi (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  giao_vien_id BIGINT UNSIGNED NOT NULL,
  chu_de_id BIGINT UNSIGNED NULL,
  khoi_lop TINYINT UNSIGNED NULL COMMENT 'Khối lớp (1–12) để lọc ngân hàng câu hỏi; độc lập với chu_de.khoi_lop',
  loai_cau_hoi ENUM('MOT_DAP_AN','DUNG_SAI','TRA_LOI_NGAN','TU_LUAN') NOT NULL,
  noi_dung LONGTEXT NOT NULL,
  noi_dung_latex LONGTEXT NULL,
  anh_url VARCHAR(255) NULL,
  muc_do ENUM('NHAN_BIET','THONG_HIEU','VAN_DUNG') NOT NULL DEFAULT 'NHAN_BIET',
  diem_mac_dinh DECIMAL(5,2) NOT NULL DEFAULT 1.00,
  dap_an_ngan_chuan VARCHAR(500) NULL COMMENT 'Dùng để so khớp tự động cho câu TRA_LOI_NGAN',
  loi_giai LONGTEXT NULL,
  trang_thai ENUM('HOAT_DONG','NGUNG_SU_DUNG') NOT NULL DEFAULT 'HOAT_DONG',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cau_hoi_gv FOREIGN KEY (giao_vien_id) REFERENCES nguoi_dung(id),
  CONSTRAINT fk_cau_hoi_chu_de FOREIGN KEY (chu_de_id) REFERENCES chu_de(id) ON DELETE SET NULL,
  CONSTRAINT chk_cau_hoi_diem_mac_dinh CHECK (diem_mac_dinh > 0),
  CONSTRAINT chk_cau_hoi_khoi_lop CHECK (khoi_lop IS NULL OR (khoi_lop BETWEEN 1 AND 12)),
  INDEX idx_cau_hoi_gv (giao_vien_id),
  INDEX idx_cau_hoi_chu_de (chu_de_id),
  INDEX idx_cau_hoi_khoi_lop (khoi_lop)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 6. dap_an
-- ---------------------------------------------------------------------
CREATE TABLE dap_an (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  cau_hoi_id BIGINT UNSIGNED NOT NULL,
  noi_dung LONGTEXT NOT NULL,
  noi_dung_latex LONGTEXT NULL,
  la_dap_an_dung BOOLEAN NOT NULL DEFAULT FALSE,
  thu_tu TINYINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_dap_an_thu_tu (cau_hoi_id, thu_tu),
  UNIQUE KEY uk_dap_an_cau_hoi_id (cau_hoi_id, id) COMMENT 'Cho phép chi_tiet_bai_lam tham chiếu FK ghép (cau_hoi_id, dap_an_id) để đảm bảo đáp án chọn đúng thuộc câu hỏi',
  CONSTRAINT fk_dap_an_cau_hoi FOREIGN KEY (cau_hoi_id) REFERENCES cau_hoi(id) ON DELETE CASCADE,
  CONSTRAINT chk_dap_an_thu_tu CHECK (thu_tu > 0)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 7. de_thi
-- ---------------------------------------------------------------------
CREATE TABLE de_thi (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  giao_vien_id BIGINT UNSIGNED NOT NULL,
  ten_de VARCHAR(200) NOT NULL,
  mo_ta TEXT NULL,
  thoi_luong_phut INT UNSIGNED NOT NULL,
  tong_diem DECIMAL(6,2) NOT NULL DEFAULT 0.00 COMMENT 'Đồng bộ từ SUM(cau_hoi_de_thi.diem); nháp chưa có câu = 0',
  thoi_gian_bat_dau DATETIME NOT NULL COMMENT 'Giờ mở đề',
  thoi_gian_ket_thuc DATETIME NOT NULL COMMENT 'Giờ đóng đề chung cho cả lớp',
  so_lan_duoc_lam TINYINT UNSIGNED NOT NULL DEFAULT 1,
  tron_cau_hoi BOOLEAN NOT NULL DEFAULT FALSE,
  cho_xem_dap_an BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Chỉ có tác dụng khi da_cong_bo_ket_qua = TRUE (xem service-rules.md mục 13)',
  da_cong_bo_ket_qua BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'TRUE khi giáo viên đã công bố điểm; học sinh chỉ xem được điểm chính thức khi cột này TRUE',
  thoi_gian_cong_bo_ket_qua DATETIME NULL,
  -- Trạng thái lưu trữ tối giản; trạng thái "đang mở/đã đóng" theo thời gian
  -- được SUY RA ở tầng service từ thoi_gian_bat_dau/thoi_gian_ket_thuc,
  -- không lưu cứng trong DB (xem service-rules.md mục 1).
  trang_thai ENUM('NHAP','DA_CONG_BO','DA_HUY') NOT NULL DEFAULT 'NHAP',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_de_thi_gv FOREIGN KEY (giao_vien_id) REFERENCES nguoi_dung(id),
  CONSTRAINT chk_de_thi_thoi_gian CHECK (thoi_gian_ket_thuc > thoi_gian_bat_dau),
  CONSTRAINT chk_de_thi_thoi_luong CHECK (thoi_luong_phut > 0),
  CONSTRAINT chk_de_thi_tong_diem CHECK (tong_diem >= 0),
  CONSTRAINT chk_de_thi_so_lan CHECK (so_lan_duoc_lam > 0),
  CONSTRAINT chk_cong_bo_ket_qua CHECK (
    (da_cong_bo_ket_qua = FALSE AND thoi_gian_cong_bo_ket_qua IS NULL)
    OR
    (da_cong_bo_ket_qua = TRUE AND thoi_gian_cong_bo_ket_qua IS NOT NULL)
  ),
  INDEX idx_de_thi_gv (giao_vien_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 8. cau_hoi_de_thi
-- ---------------------------------------------------------------------
CREATE TABLE cau_hoi_de_thi (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  de_thi_id BIGINT UNSIGNED NOT NULL,
  cau_hoi_id BIGINT UNSIGNED NOT NULL,
  thu_tu_goc INT UNSIGNED NOT NULL,
  diem DECIMAL(5,2) NOT NULL,
  UNIQUE KEY uk_de_cau_hoi (de_thi_id, cau_hoi_id),
  UNIQUE KEY uk_de_thu_tu (de_thi_id, thu_tu_goc),
  CONSTRAINT fk_chdt_de FOREIGN KEY (de_thi_id) REFERENCES de_thi(id) ON DELETE CASCADE,
  CONSTRAINT fk_chdt_cau_hoi FOREIGN KEY (cau_hoi_id) REFERENCES cau_hoi(id),
  CONSTRAINT chk_chdt_diem CHECK (diem > 0),
  CONSTRAINT chk_chdt_thu_tu CHECK (thu_tu_goc > 0),
  INDEX idx_chdt_cau_hoi (cau_hoi_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 9. phan_cong_de
-- ---------------------------------------------------------------------
-- LƯU Ý HÀNH VI CASCADE: bảng này có ON DELETE CASCADE với de_thi/lop_hoc,
-- nhưng luot_lam_bai tham chiếu đến (de_thi_id, lop_hoc_id) của bảng này
-- KHÔNG có ON DELETE CASCADE (xem fk_llb_phan_cong). Do đó:
--   - Phân công CHƯA có lượt làm nào -> xóa được bình thường.
--   - Phân công ĐÃ có lượt làm -> MySQL từ chối DELETE trực tiếp (FK).
--     Khi giáo viên xóa đề (NHAP/DA_HUY), exam-service xóa luot_lam_bai trước
--     rồi mới xóa de_thi (CASCADE phan_cong_de). Không xóa phan_cong_de lẻ
--     khi còn lượt làm — xem service-rules.md.
CREATE TABLE phan_cong_de (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  de_thi_id BIGINT UNSIGNED NOT NULL,
  lop_hoc_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_de_lop (de_thi_id, lop_hoc_id),
  CONSTRAINT fk_pcd_de FOREIGN KEY (de_thi_id) REFERENCES de_thi(id) ON DELETE CASCADE,
  CONSTRAINT fk_pcd_lop FOREIGN KEY (lop_hoc_id) REFERENCES lop_hoc(id) ON DELETE CASCADE,
  INDEX idx_pcd_lop (lop_hoc_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 10. luot_lam_bai
-- ---------------------------------------------------------------------
CREATE TABLE luot_lam_bai (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  de_thi_id BIGINT UNSIGNED NOT NULL,
  hoc_sinh_id BIGINT UNSIGNED NOT NULL,
  lop_hoc_id BIGINT UNSIGNED NOT NULL COMMENT 'Lớp mà học sinh sử dụng để thực hiện lượt làm; phải thuộc phân công của đề thi (đảm bảo bằng FK ghép fk_llb_phan_cong)',
  lan_thu TINYINT UNSIGNED NOT NULL DEFAULT 1,
  thoi_gian_bat_dau DATETIME NOT NULL,
  -- han_nop = hạn nộp GỐC, không đổi sau khi tạo. Không cộng dồn trực tiếp
  -- vào cột này khi bù giờ (xem service-rules.md mục 3 và mục 8).
  han_nop DATETIME NOT NULL,
  thoi_gian_nop DATETIME NULL,
  thoi_gian_bo_sung_giay INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Tổng số giây được bù do sự cố đã duyệt; han_nop_hieu_luc = han_nop + thoi_gian_bo_sung_giay',
  diem_tu_dong DECIMAL(6,2) NOT NULL DEFAULT 0,
  diem_tu_luan DECIMAL(6,2) NOT NULL DEFAULT 0,
  tong_diem DECIMAL(6,2) NOT NULL DEFAULT 0,
  -- CHỈ quản lý vòng đời làm bài. Trạng thái xử lý sự cố (chờ duyệt/đã duyệt/từ
  -- chối) đọc riêng từ su_co_bai_thi.trang_thai, KHÔNG gộp vào đây để tránh mất
  -- thông tin "bài đang làm hay đã nộp trước khi có sự cố" (xem service-rules.md mục 13).
  trang_thai ENUM('DANG_LAM','DA_NOP','TU_DONG_NOP','DA_CHAM') NOT NULL DEFAULT 'DANG_LAM',
  last_seen_at DATETIME NULL COMMENT 'Cập nhật mỗi lần nhận heartbeat từ client',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_attempt (de_thi_id, hoc_sinh_id, lan_thu),
  -- FK ghép: đảm bảo học sinh chỉ có thể làm đề thông qua đúng lớp đã được giao đề đó.
  CONSTRAINT fk_llb_phan_cong FOREIGN KEY (de_thi_id, lop_hoc_id) REFERENCES phan_cong_de(de_thi_id, lop_hoc_id),
  CONSTRAINT fk_llb_hs FOREIGN KEY (hoc_sinh_id) REFERENCES nguoi_dung(id),
  CONSTRAINT chk_llb_lan_thu CHECK (lan_thu > 0),
  CONSTRAINT chk_llb_han_nop CHECK (han_nop > thoi_gian_bat_dau),
  CONSTRAINT chk_llb_diem CHECK (diem_tu_dong >= 0 AND diem_tu_luan >= 0 AND tong_diem >= 0),
  -- uk_attempt cố tình KHÔNG gồm lop_hoc_id: số lần làm bài tính theo (de_thi_id,
  -- hoc_sinh_id), không tính theo lớp — tránh học sinh thuộc 2 lớp cùng được
  -- giao 1 đề bị nhân đôi số lượt được làm.
  INDEX idx_llb_phan_cong (de_thi_id, lop_hoc_id) COMMENT 'Phục vụ FK ghép fk_llb_phan_cong và truy vấn theo cặp đề-lớp',
  INDEX idx_llb_hs (hoc_sinh_id),
  INDEX idx_llb_lop (lop_hoc_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 11. cau_hoi_luot_lam  (thứ tự câu đã "đóng băng" cho từng lượt làm)
-- ---------------------------------------------------------------------
CREATE TABLE cau_hoi_luot_lam (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  luot_lam_bai_id BIGINT UNSIGNED NOT NULL,
  cau_hoi_id BIGINT UNSIGNED NOT NULL,
  thu_tu_hien_thi INT UNSIGNED NOT NULL COMMENT 'Thứ tự sau khi trộn (Fisher-Yates ở Node.js), ghi cố định, không trộn lại khi refresh',
  diem DECIMAL(5,2) NOT NULL COMMENT 'Điểm "đóng băng" tại thời điểm bắt đầu làm, không đổi dù giáo viên sửa điểm câu hỏi sau đó',
  UNIQUE KEY uk_llb_thu_tu (luot_lam_bai_id, thu_tu_hien_thi),
  UNIQUE KEY uk_llb_cau_hoi (luot_lam_bai_id, cau_hoi_id),
  CONSTRAINT fk_chll_llb FOREIGN KEY (luot_lam_bai_id) REFERENCES luot_lam_bai(id) ON DELETE CASCADE,
  CONSTRAINT fk_chll_cau_hoi FOREIGN KEY (cau_hoi_id) REFERENCES cau_hoi(id),
  CONSTRAINT chk_chll_diem CHECK (diem > 0),
  CONSTRAINT chk_chll_thu_tu CHECK (thu_tu_hien_thi > 0)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 12. chi_tiet_bai_lam
-- ---------------------------------------------------------------------
CREATE TABLE chi_tiet_bai_lam (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  luot_lam_bai_id BIGINT UNSIGNED NOT NULL,
  cau_hoi_id BIGINT UNSIGNED NOT NULL,
  dap_an_da_chon_id BIGINT UNSIGNED NULL COMMENT 'Chỉ dùng cho MOT_DAP_AN/DUNG_SAI; quan hệ đáp án thuộc đúng câu hỏi được bảo đảm bởi FK ghép fk_ctbl_dap_an',
  noi_dung_tra_loi LONGTEXT NULL COMMENT 'TRA_LOI_NGAN/TU_LUAN: văn bản; DUNG_SAI: JSON {selections:{dapAnId:true|false}}',
  da_danh_dau BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Bookmark "câu cần xem lại"',
  answer_version INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Tăng dần mỗi lần client gửi lưu; dùng để chống request cũ ghi đè request mới (xem service-rules.md mục 5)',
  client_request_id VARCHAR(64) NULL COMMENT 'Chỉ để theo dõi/debug request gần nhất, KHÔNG unique toàn hệ thống',
  la_dung BOOLEAN NULL,
  diem_dat_duoc DECIMAL(5,2) NOT NULL DEFAULT 0,
  nhan_xet TEXT NULL COMMENT 'Nhận xét của giáo viên khi chấm tự luận',
  saved_at_server DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_llb_cau_hoi_answer (luot_lam_bai_id, cau_hoi_id),
  -- FK ghép: đảm bảo câu hỏi thực sự thuộc lượt làm này (đã có trong
  -- cau_hoi_luot_lam), không chỉ đơn thuần là một câu hỏi tồn tại trong hệ
  -- thống. Nhờ ON DELETE CASCADE, xóa luot_lam_bai sẽ cascade qua
  -- cau_hoi_luot_lam rồi tới đây, giữ nguyên hành vi dọn dữ liệu như trước.
  CONSTRAINT fk_ctbl_cau_hoi_luot_lam FOREIGN KEY (luot_lam_bai_id, cau_hoi_id) REFERENCES cau_hoi_luot_lam(luot_lam_bai_id, cau_hoi_id) ON DELETE CASCADE,
  -- FK ghép: đảm bảo đáp án được chọn thực sự thuộc đúng câu hỏi đó, không
  -- chỉ đơn thuần là một đáp án tồn tại trong hệ thống (có thể thuộc câu
  -- khác). Khi dap_an_da_chon_id NULL (câu TRA_LOI_NGAN/TU_LUAN), InnoDB
  -- không kiểm tra FK ghép này (chỉ enforce khi mọi cột đều khác NULL).
  -- Mặc định RESTRICT: không cho xóa một đáp án đang được chi_tiet_bai_lam
  -- tham chiếu, để KHÔNG làm mất lịch sử học sinh đã chọn đáp án nào (xem
  -- service-rules.md mục 1).
  CONSTRAINT fk_ctbl_dap_an FOREIGN KEY (cau_hoi_id, dap_an_da_chon_id) REFERENCES dap_an(cau_hoi_id, id),
  CONSTRAINT chk_ctbl_diem CHECK (diem_dat_duoc >= 0),
  CONSTRAINT chk_ctbl_mot_kieu_tra_loi CHECK (dap_an_da_chon_id IS NULL OR noi_dung_tra_loi IS NULL),
  INDEX idx_ctbl_dap_an_cau_hoi (cau_hoi_id, dap_an_da_chon_id),
  INDEX idx_ctbl_client_request (client_request_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 13. nhat_ky_thi  (log sự kiện trong quá trình làm bài)
-- ---------------------------------------------------------------------
CREATE TABLE nhat_ky_thi (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  luot_lam_bai_id BIGINT UNSIGNED NOT NULL,
  loai_su_kien ENUM('BAT_DAU','LUU_DAP_AN','HEARTBEAT','MAT_KET_NOI','KHOI_PHUC','CHUYEN_TAB','NOP_BAI','TU_DONG_NOP','MO_LAI_SAU_SU_CO','LOI_HE_THONG') NOT NULL,
  noi_dung TEXT NULL,
  du_lieu_json JSON NULL,
  thoi_gian DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_nkt_llb FOREIGN KEY (luot_lam_bai_id) REFERENCES luot_lam_bai(id) ON DELETE CASCADE,
  INDEX idx_nkt_llb_time (luot_lam_bai_id, thoi_gian)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 14. su_co_bai_thi  (bản giản lược — Mức 3, chỉ ghi nhận + xét bù giờ)
-- ---------------------------------------------------------------------
CREATE TABLE su_co_bai_thi (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  luot_lam_bai_id BIGINT UNSIGNED NOT NULL,
  loai_su_co ENUM('MAT_DIEN','MAT_MANG','LOI_TRINH_DUYET','LOI_HE_THONG','KHAC') NOT NULL,
  bat_dau_luc DATETIME NULL,
  ket_thuc_luc DATETIME NULL,
  tu_dong_phat_hien BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'TRUE = hệ thống tự tạo do vượt ngưỡng heartbeat; FALSE = học sinh chủ động báo',
  mo_ta TEXT NULL,
  trang_thai ENUM('CHO_XAC_NHAN','DA_CHAP_NHAN','TU_CHOI') NOT NULL DEFAULT 'CHO_XAC_NHAN',
  so_giay_bu_gio INT UNSIGNED NOT NULL DEFAULT 0,
  ly_do_xu_ly TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_su_co_llb FOREIGN KEY (luot_lam_bai_id) REFERENCES luot_lam_bai(id) ON DELETE CASCADE,
  CONSTRAINT chk_su_co_thoi_gian CHECK (ket_thuc_luc IS NULL OR bat_dau_luc IS NULL OR ket_thuc_luc >= bat_dau_luc),
  INDEX idx_su_co_llb (luot_lam_bai_id),
  INDEX idx_su_co_trang_thai (trang_thai)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 15. dat_lai_mat_khau  (mã xác nhận quên mật khẩu)
-- ---------------------------------------------------------------------
CREATE TABLE dat_lai_mat_khau (
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
) ENGINE=InnoDB;

-- =====================================================================
-- Ghi chú quan hệ chính
-- =====================================================================
-- Giáo viên  1 --- N  Lớp học
-- Lớp học    N --- N  Học sinh          (qua thanh_vien_lop)
-- Giáo viên  1 --- N  Câu hỏi
-- Chủ đề     1 --- N  Câu hỏi
-- Đề thi     N --- N  Câu hỏi           (qua cau_hoi_de_thi)
-- Đề thi     1 --- N  Lượt làm bài
-- Lượt làm   1 --- N  Câu hỏi lượt làm  (thứ tự đã trộn, cố định)
-- Lượt làm   1 --- N  Chi tiết bài làm
-- Lượt làm   1 --- N  Nhật ký thi
-- Lượt làm   1 --- N  Sự cố bài thi
-- Người dùng 1 --- N  Đặt lại mật khẩu  (dat_lai_mat_khau)
--
-- Các CHECK constraint trong file này ngăn các giá trị vô lý trong cùng
-- một bảng, ví dụ điểm <= 0, thời lượng <= 0 hoặc khối lớp ngoài 1-12.
--
-- Một số ràng buộc liên bảng đã được bảo đảm bằng FOREIGN KEY ghép:
--   - luot_lam_bai chỉ thuộc cặp đề-lớp đã tồn tại trong phan_cong_de
--     (fk_llb_phan_cong);
--   - chi_tiet_bai_lam chỉ lưu câu hỏi thuộc đúng lượt làm
--     (fk_ctbl_cau_hoi_luot_lam);
--   - đáp án được chọn phải thuộc đúng câu hỏi (fk_ctbl_dap_an).
--
-- Những quy tắc nghiệp vụ phức tạp còn lại vẫn phải xử lý ở tầng service:
--   - người dùng phải đúng vai trò;
--   - học sinh phải đang thuộc lớp;
--   - giáo viên phải sở hữu lớp, câu hỏi và đề thi;
--   - chỉ sửa đề khi trạng thái là NHAP;
--   - không sửa câu hỏi hoặc đáp án thuộc đề đã công bố;
--   - sau khi lượt làm được tạo, không thêm/xóa/đổi điểm câu trong
--     cau_hoi_luot_lam (vì fk_ctbl_cau_hoi_luot_lam có ON DELETE CASCADE —
--     xóa một dòng cau_hoi_luot_lam sẽ xóa luôn câu trả lời tương ứng);
--   - điểm đạt được không vượt điểm tối đa của câu;
--   - tổng điểm đề bằng tổng điểm các câu;
--   - không lưu đáp án sau hạn nộp hiệu lực;
--   - chống request cũ ghi đè request mới;
--   - chống bắt đầu, nộp bài hoặc duyệt bù giờ hai lần.
--
-- Xem chi tiết trong docs/service-rules.md.
--
-- Múi giờ: toàn bộ cột DATETIME trong schema này giả định đã thống nhất
-- một múi giờ duy nhất giữa Node.js và MySQL (khuyến nghị Asia/Ho_Chi_Minh,
-- xem service-rules.md mục 14). DATETIME không tự quy đổi múi giờ như
-- TIMESTAMP, nên nếu ứng dụng và server DB lệch múi giờ, đồng hồ đếm ngược
-- của phòng thi sẽ tính sai.
-- =====================================================================
