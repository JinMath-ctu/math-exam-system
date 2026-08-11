-- =====================================================================
-- Dữ liệu demo tối thiểu — chạy sau schema.sql
-- Mật khẩu demo cho cả 3 tài khoản: 123456
-- Hash bên dưới được tạo bằng bcrypt (10 rounds), đã xác nhận khớp với
-- '123456' bằng bcrypt.compare(). Có thể tự sinh lại bằng:
--   node -e "require('bcrypt').hash('123456',10).then(console.log)"
--
-- Dùng biến session (@...) thay vì ID cứng, nên file chạy đúng ngay cả khi
-- database đã có các dữ liệu KHÁC và AUTO_INCREMENT không bắt đầu từ 1.
-- File này KHÔNG idempotent: không chạy lại lần hai nếu bộ dữ liệu demo
-- (email/mã lớp bên dưới) đã tồn tại — MySQL sẽ báo lỗi unique key. Khi
-- cần tạo lại từ đầu, hãy chạy reset-schema.sql trước.
--
-- Toàn bộ được bọc trong transaction. Khi chạy thủ công, nếu có câu lệnh
-- báo lỗi giữa chừng, KHÔNG được tiếp tục COMMIT. Hãy chạy ROLLBACK,
-- sau đó sửa lỗi và chạy lại file từ đầu.
-- =====================================================================
USE web_kiem_tra_toan;

SET NAMES utf8mb4;

START TRANSACTION;

-- ---------------------------------------------------------------------
-- Tài khoản demo (email chữ thường, khớp quy ước backend sẽ chuẩn hóa
-- bằng email.trim().toLowerCase() trước khi lưu/so khớp)
-- ---------------------------------------------------------------------
INSERT INTO nguoi_dung (ho_ten, email, mat_khau_hash, vai_tro) VALUES
('Giáo viên demo', 'teacher@example.com', '$2b$10$2JpBZaFWmlxfSxpo/MDdnOlx5V7DHTmK2XVgNS2vYUZrfJexR.0pe', 'GIAO_VIEN'),
('Học sinh demo A', 'studenta@example.com', '$2b$10$2JpBZaFWmlxfSxpo/MDdnOlx5V7DHTmK2XVgNS2vYUZrfJexR.0pe', 'HOC_SINH'),
('Học sinh demo B', 'studentb@example.com', '$2b$10$2JpBZaFWmlxfSxpo/MDdnOlx5V7DHTmK2XVgNS2vYUZrfJexR.0pe', 'HOC_SINH');

SET @gv_id = (SELECT id FROM nguoi_dung WHERE email = 'teacher@example.com');
SET @hs_a_id = (SELECT id FROM nguoi_dung WHERE email = 'studenta@example.com');
SET @hs_b_id = (SELECT id FROM nguoi_dung WHERE email = 'studentb@example.com');

-- ---------------------------------------------------------------------
-- Lớp học demo
-- ---------------------------------------------------------------------
INSERT INTO lop_hoc (giao_vien_id, ten_lop, ma_lop, mo_ta) VALUES
(@gv_id, 'Toán 10A1', 'TOAN10A1', 'Lớp demo dùng để kiểm thử hệ thống');

SET @lop_id = LAST_INSERT_ID();

INSERT INTO thanh_vien_lop (lop_hoc_id, hoc_sinh_id) VALUES
(@lop_id, @hs_a_id),
(@lop_id, @hs_b_id);

-- ---------------------------------------------------------------------
-- Chủ đề
-- ---------------------------------------------------------------------
INSERT INTO chu_de (giao_vien_id, ten_chu_de, khoi_lop, mo_ta) VALUES
(@gv_id, 'Phương trình bậc hai', 10, 'Chương phương trình - bất phương trình');

SET @chu_de_id = LAST_INSERT_ID();

-- ---------------------------------------------------------------------
-- Ngân hàng câu hỏi — đủ cả 4 loại để kiểm thử được toàn bộ luồng chấm
-- điểm, kể cả chấm tự luận thủ công của giáo viên.
-- ---------------------------------------------------------------------
INSERT INTO cau_hoi (giao_vien_id, chu_de_id, khoi_lop, loai_cau_hoi, noi_dung, muc_do, diem_mac_dinh, loi_giai) VALUES
(@gv_id, @chu_de_id, 10, 'MOT_DAP_AN', 'Phương trình $x^2 - 5x + 6 = 0$ có nghiệm là:', 'THONG_HIEU', 1.00, 'Delta = 25 - 24 = 1 > 0, x = (5±1)/2 => x = 2 hoặc x = 3');
SET @cau_mot_dap_an_id = LAST_INSERT_ID();

INSERT INTO cau_hoi (giao_vien_id, chu_de_id, khoi_lop, loai_cau_hoi, noi_dung, muc_do, diem_mac_dinh, loi_giai) VALUES
(@gv_id, @chu_de_id, 10, 'DUNG_SAI', 'Xét phương trình bậc hai $x^2 - 5x + 6 = 0$. Phát biểu nào sau đây đúng/sai?', 'NHAN_BIET', 1.00, 'Delta = 1 > 0 nên có 2 nghiệm thực phân biệt x=2, x=3. Tổng nghiệm = 5, tích = 6.');
SET @cau_dung_sai_id = LAST_INSERT_ID();

-- Đáp án ngắn chuẩn được đưa thẳng vào INSERT, không cần UPDATE lại sau đó.
INSERT INTO cau_hoi (giao_vien_id, chu_de_id, khoi_lop, loai_cau_hoi, noi_dung, muc_do, diem_mac_dinh, dap_an_ngan_chuan, loi_giai) VALUES
(@gv_id, @chu_de_id, 10, 'TRA_LOI_NGAN', 'Tổng hai nghiệm của phương trình $x^2 - 5x + 6 = 0$ là bao nhiêu?', 'THONG_HIEU', 1.00, '5', 'Theo Vi-et: tổng hai nghiệm = -b/a = 5');
SET @cau_tra_loi_ngan_id = LAST_INSERT_ID();

INSERT INTO cau_hoi (giao_vien_id, chu_de_id, khoi_lop, loai_cau_hoi, noi_dung, muc_do, diem_mac_dinh, loi_giai) VALUES
(@gv_id, @chu_de_id, 10, 'TU_LUAN', 'Giải phương trình $x^2 - 5x + 6 = 0$ và trình bày đầy đủ các bước.', 'VAN_DUNG', 2.00, 'Ta có $x^2 - 5x + 6 = (x-2)(x-3)$. Vậy $x=2$ hoặc $x=3$.');
SET @cau_tu_luan_id = LAST_INSERT_ID();

-- Đáp án cho câu MOT_DAP_AN
INSERT INTO dap_an (cau_hoi_id, noi_dung, la_dap_an_dung, thu_tu) VALUES
(@cau_mot_dap_an_id, 'x = 2 hoặc x = 3', TRUE, 1),
(@cau_mot_dap_an_id, 'x = -2 hoặc x = -3', FALSE, 2),
(@cau_mot_dap_an_id, 'x = 1 hoặc x = 6', FALSE, 3),
(@cau_mot_dap_an_id, 'Vô nghiệm', FALSE, 4);

-- 4 mệnh đề cho câu DUNG_SAI (la_dap_an_dung = TRUE nghĩa là đáp án chuẩn là Đúng)
INSERT INTO dap_an (cau_hoi_id, noi_dung, la_dap_an_dung, thu_tu) VALUES
(@cau_dung_sai_id, 'Phương trình có hai nghiệm thực phân biệt.', TRUE, 1),
(@cau_dung_sai_id, 'Tổng hai nghiệm bằng 5.', TRUE, 2),
(@cau_dung_sai_id, 'Tích hai nghiệm bằng $-6$.', FALSE, 3),
(@cau_dung_sai_id, 'Phương trình vô nghiệm thực.', FALSE, 4);

-- ---------------------------------------------------------------------
-- Đề thi demo — thời gian tính động theo NOW() để đề luôn còn hiệu lực
-- trong 7 ngày kể từ thời điểm chạy seed, không phụ thuộc một ngày cố
-- định trong mã nguồn (đề vẫn hết hạn sau 7 ngày như bình thường).
-- Giữ trạng thái NHAP để còn kiểm thử được tình huống "chặn sửa đề khi
-- không còn NHAP" (STT 7 trong scope.md) trước khi tự tay công bố.
-- ---------------------------------------------------------------------
SET @seed_now = NOW();

INSERT INTO de_thi (giao_vien_id, ten_de, mo_ta, thoi_luong_phut, tong_diem,
                     thoi_gian_bat_dau, thoi_gian_ket_thuc, tron_cau_hoi, cho_xem_dap_an, trang_thai)
VALUES
(@gv_id, 'Kiểm tra 15 phút - Phương trình bậc hai', 'Đề demo dùng để kiểm thử luồng thi',
    15, 5.00, @seed_now, DATE_ADD(@seed_now, INTERVAL 180 DAY), TRUE, TRUE, 'NHAP');

SET @de_thi_id = LAST_INSERT_ID();

-- Tổng điểm 5.00 = 1 (một đáp án) + 1 (đúng/sai) + 1 (trả lời ngắn) + 2 (tự luận)
INSERT INTO cau_hoi_de_thi (de_thi_id, cau_hoi_id, thu_tu_goc, diem) VALUES
(@de_thi_id, @cau_mot_dap_an_id, 1, 1.00),
(@de_thi_id, @cau_dung_sai_id, 2, 1.00),
(@de_thi_id, @cau_tra_loi_ngan_id, 3, 1.00),
(@de_thi_id, @cau_tu_luan_id, 4, 2.00);

INSERT INTO phan_cong_de (de_thi_id, lop_hoc_id) VALUES (@de_thi_id, @lop_id);

COMMIT;

-- Lưu ý: để test luồng làm bài, cần công bố đề (chuyển NHAP -> DA_CONG_BO).
-- Có 2 cách tùy bạn đang ở đâu:
--
-- (a) Trong CÙNG phiên/kết nối vừa chạy seed này (biến @de_thi_id còn tồn tại):
--   UPDATE de_thi SET trang_thai = 'DA_CONG_BO' WHERE id = @de_thi_id;
--
-- (b) Trong phiên/kết nối MỚI (biến session đã mất, không dùng @de_thi_id được):
--   SET @de_thi_id = (
--     SELECT dt.id
--     FROM de_thi dt
--     JOIN nguoi_dung nd ON nd.id = dt.giao_vien_id
--     WHERE nd.email = 'teacher@example.com'
--       AND dt.ten_de = 'Kiểm tra 15 phút - Phương trình bậc hai'
--       AND dt.trang_thai = 'NHAP'
--     ORDER BY dt.id DESC
--     LIMIT 1
--   );
--   UPDATE de_thi SET trang_thai = 'DA_CONG_BO' WHERE id = @de_thi_id;
--   -- Tra ID trước rồi mới UPDATE theo id (thay vì UPDATE trực tiếp bằng
--   -- JOIN + WHERE tên đề) để tránh cập nhật nhầm nhiều dòng nếu giáo viên
--   -- lỡ tạo thêm đề khác trùng tên.
--
-- Cả (a) và (b) chỉ nên dùng để kiểm thử database nhanh bằng tay. Khi đã
-- có backend, công bố đề nên đi qua API/giao diện giáo viên thật, vì đó
-- là nơi service kiểm tra đầy đủ: đề có câu hỏi, tổng điểm đúng, thời
-- gian hợp lệ, giáo viên sở hữu đề, và khóa cấu trúc đề sau khi công bố
-- (xem service-rules.md mục 1).
--
-- PHÂN BIỆT với việc CÔNG BỐ KẾT QUẢ (khác với công bố đề ở trên):
-- công bố đề chỉ cho phép học sinh BẮT ĐẦU LÀM BÀI; công bố kết quả mới
-- là bước cho học sinh XEM ĐIỂM sau khi đã chấm xong (xem service-rules.md
-- mục 13). Hai việc độc lập, làm ở hai thời điểm khác nhau trong thực tế.
-- Sau khi đã chấm xong bài, công bố kết quả bằng:
--   UPDATE de_thi
--   SET da_cong_bo_ket_qua = TRUE, thoi_gian_cong_bo_ket_qua = NOW()
--   WHERE id = @de_thi_id;
-- Vì seed đặt sẵn cho_xem_dap_an = TRUE, sau khi công bố kết quả học sinh
-- sẽ xem được cả điểm lẫn đáp án/lời giải. Trước thời điểm đó, cờ
-- cho_xem_dap_an chưa có tác dụng do quy tắc kiểm soát quyền xem ở tầng
-- service (xem service-rules.md mục 13). CHECK chk_cong_bo_ket_qua chỉ
-- bảo đảm cờ công bố kết quả nhất quán với thời gian công bố, không kiểm
-- soát cho_xem_dap_an.

-- ---------------------------------------------------------------------
-- Truy vấn kiểm tra nhanh sau khi seed chạy xong (không bắt buộc, chỉ để
-- xác nhận dữ liệu đã tạo đúng — có thể xóa khỏi file khi dùng thật).
-- ---------------------------------------------------------------------
SELECT
  @gv_id AS giao_vien_id,
  @hs_a_id AS hoc_sinh_a_id,
  @hs_b_id AS hoc_sinh_b_id,
  @lop_id AS lop_hoc_id,
  @chu_de_id AS chu_de_id,
  @de_thi_id AS de_thi_id;

-- Kỳ vọng: so_cau_hoi = 4, tong_diem = 5.00, tong_diem_cac_cau = 5.00, trang_thai = NHAP
SELECT
  dt.id,
  dt.ten_de,
  dt.tong_diem,
  dt.trang_thai,
  dt.thoi_gian_bat_dau,
  dt.thoi_gian_ket_thuc,
  COUNT(chdt.id) AS so_cau_hoi,
  SUM(chdt.diem) AS tong_diem_cac_cau
FROM de_thi dt
JOIN cau_hoi_de_thi chdt ON chdt.de_thi_id = dt.id
WHERE dt.id = @de_thi_id
GROUP BY dt.id, dt.ten_de, dt.tong_diem, dt.trang_thai, dt.thoi_gian_bat_dau, dt.thoi_gian_ket_thuc;
