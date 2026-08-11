# Bộ test case — Hệ thống kiểm tra Toán trực tuyến

> **Phiên bản:** 1.0  
> **Môi trường kiểm thử:** Local (`http://localhost:3000`) + MySQL seed demo  
> **Tài khoản mặc định:** xem `docs/database-description.md`

---

## Hướng dẫn sử dụng

| Cột | Mô tả |
|-----|--------|
| **Mã** | Mã định danh test case |
| **Tên** | Tên ngắn gọn |
| **Dữ liệu đầu vào** | Dữ liệu form/API hoặc thao tác UI |
| **Điều kiện trước** | Trạng thái hệ thống cần có trước khi chạy |
| **Các bước** | Thứ tự thao tác |
| **Kết quả mong đợi** | Hành vi đúng theo nghiệp vụ |
| **Kết quả thực tế** | *(Để trống khi viết tài liệu — điền khi test)* |
| **Đạt/Không đạt** | *(Để trống khi viết tài liệu — điền khi test)* |

**Ký hiệu vai trò:** GV = Giáo viên, HS = Học sinh

---

## Nhóm 1 — Tài khoản (Accounts)

| Mã | Tên | Dữ liệu đầu vào | Điều kiện trước | Các bước | Kết quả mong đợi | Kết quả thực tế | Đạt/Không đạt |
|----|-----|-----------------|-----------------|----------|------------------|-----------------|---------------|
| TC-ACC-01 | Chặn tự đăng ký giáo viên | Gửi payload `vaiTro=GIAO_VIEN` | Trang đăng ký công khai V1 chỉ dành cho học sinh | 1. Sửa payload vai trò thành GIAO_VIEN 2. Gửi form | HTTP 400; không tạo tài khoản giáo viên | | |
| TC-ACC-02 | Đăng ký học sinh thành công | hoTen="Trần HS", email="hs.moi@example.com", password="123456", vaiTro=HOC_SINH | Email chưa tồn tại | 1. Mở trang đăng ký 2. Nhập dữ liệu 3. Gửi form | Tạo tài khoản HS thành công | | |
| TC-ACC-03 | Đăng ký email trùng | email="teacher@example.com" (đã có trong seed) | Seed đã chạy | 1. Đăng ký với email trùng | Báo lỗi EMAIL_EXISTS / "Email đã được sử dụng"; không tạo bản ghi mới | | |
| TC-ACC-04 | Đăng ký mật khẩu quá ngắn | password="12345" (5 ký tự) | — | 1. Nhập mật khẩu < 6 ký tự 2. Gửi form | Validation lỗi; không tạo tài khoản | | |
| TC-ACC-05 | Đăng nhập GV đúng | email="teacher@example.com", password="123456" | Tài khoản HOAT_DONG | 1. Mở trang đăng nhập 2. Nhập email/mật khẩu 3. Đăng nhập | Đăng nhập thành công; session tạo; vào dashboard GV | | |
| TC-ACC-06 | Đăng nhập HS đúng | email="studenta@example.com", password="123456" | Tài khoản HOAT_DONG | 1. Đăng nhập HS A | Vào dashboard HS; hiển thị lớp đã tham gia | | |
| TC-ACC-07 | Đăng nhập sai mật khẩu | email="teacher@example.com", password="sai123" | — | 1. Nhập mật khẩu sai 2. Gửi | HTTP 401; báo email hoặc mật khẩu không đúng; không tạo session | | |
| TC-ACC-08 | Đăng xuất | — | Đã đăng nhập | 1. Bấm Đăng xuất | Session hủy; route web bảo vệ chuyển về đăng nhập; API bảo vệ trả 401 | | |
| TC-ACC-09 | Truy cập API không đăng nhập | GET `/api/attempts/1/state` | Chưa đăng nhập | 1. Gọi API không cookie | HTTP 401 `UNAUTHORIZED`, không redirect HTML | | |
| TC-ACC-10 | HS truy cập chức năng GV | GET `/teacher/dashboard` | Đăng nhập HS | 1. HS mở route giáo viên | HTTP 403 `FORBIDDEN` | | |

---

## Nhóm 2 — Lớp học (Classes)

| Mã | Tên | Dữ liệu đầu vào | Điều kiện trước | Các bước | Kết quả mong đợi | Kết quả thực tế | Đạt/Không đạt |
|----|-----|-----------------|-----------------|----------|------------------|-----------------|---------------|
| TC-CLS-01 | GV tạo lớp mới | tenLop="Toán 11A2", maLop="TOAN11A2" | Đăng nhập GV | 1. Vào Quản lý lớp 2. Tạo lớp mới 3. Lưu | Lớp tạo thành công; mã lớp duy nhất; trangThai=HOAT_DONG | | |
| TC-CLS-02 | Tạo lớp mã trùng | maLop="TOAN10A1" | Lớp TOAN10A1 đã có (seed) | 1. Tạo lớp mã trùng | Báo lỗi trùng mã; không tạo lớp | | |
| TC-CLS-03 | HS tham gia lớp đúng mã | maLop="TOAN10A1" | HS chưa thuộc lớp; lớp HOAT_DONG | 1. HS nhập mã TOAN10A1 2. Tham gia | Thêm thanh_vien_lop DANG_HOC; HS thấy lớp trong danh sách | | |
| TC-CLS-04 | HS tham gia mã không tồn tại | maLop="KHONGCO" | — | 1. Nhập mã sai 2. Tham gia | Báo CLASS_CODE_INVALID | | |
| TC-CLS-05 | HS tham gia lớp đã lưu trữ | maLop lớp LUU_TRU | GV đã archive lớp | 1. HS nhập mã lớp LUU_TRU | Báo CLASS_ARCHIVED; không thêm thành viên | | |
| TC-CLS-06 | GV xem danh sách thành viên | classId lớp TOAN10A1 | Seed + HS A, B đã tham gia | 1. GV mở chi tiết lớp 2. Xem thành viên | Hiển thị studenta, studentb trạng thái DANG_HOC | | |
| TC-CLS-07 | GV loại học sinh khỏi lớp | studentId=HS B, trangThai=DA_ROI_LOP | HS B DANG_HOC, không có lượt DANG_LAM | 1. GV chọn Loại HS B | Cập nhật DA_ROI_LOP; không DELETE vật lý | | |
| TC-CLS-08 | HS rời lớp khi đang thi | — | HS có lượt DANG_LAM thuộc lớp | 1. HS bấm Rời lớp | Báo ACTIVE_ATTEMPT_EXISTS; không rời được | | |
| TC-CLS-09 | HS rời lớp bình thường | — | HS DANG_HOC, không lượt DANG_LAM | 1. HS rời lớp | trangThai=DA_ROI_LOP | | |
| TC-CLS-10 | HS tham gia lại lớp đã rời | maLop="TOAN10A1" | HS trước đó DA_ROI_LOP | 1. HS nhập lại mã lớp | Kích hoạt lại DANG_HOC (không tạo bản ghi trùng) | | |
| TC-CLS-11 | GV lưu trữ lớp | — | Lớp HOAT_DONG | 1. GV bấm Lưu trữ | trangThai=LUU_TRU; không nhận thành viên mới | | |
| TC-CLS-12 | GV xóa lớp chưa thi | — | Lớp chưa có luot_lam_bai | 1. Bấm Xóa lớp | Xóa lop_hoc (cascade thành viên + phân công chưa thi) | | |
| TC-CLS-13 | Không xóa lớp đã có lượt làm | — | Lớp đã có luot_lam_bai | 1. Thử xóa | Báo lỗi; giữ bản ghi; gợi ý lưu trữ | | |
| TC-CLS-12 | GV sửa lớp không sở hữu | classId lớp GV khác | 2 tài khoản GV | 1. GV A gọi API sửa lớp GV B | HTTP 403 FORBIDDEN | | |

---

## Nhóm 3 — Câu hỏi & Chủ đề (Questions)

| Mã | Tên | Dữ liệu đầu vào | Điều kiện trước | Các bước | Kết quả mong đợi | Kết quả thực tế | Đạt/Không đạt |
|----|-----|-----------------|-----------------|----------|------------------|-----------------|---------------|
| TC-QST-01 | Tạo chủ đề | tenChuDe="Hàm số", khoiLop=10 | Đăng nhập GV | 1. Tạo chủ đề mới | Chủ đề lưu thành công | | |
| TC-QST-02 | Tạo câu MOT_DAP_AN hợp lệ | 4 đáp án, 1 đúng | Có chủ đề | 1. Tạo câu một đáp án 2. Lưu | Câu + 4 dòng dap_an lưu DB | | |
| TC-QST-03 | Tạo câu MOT_DAP_AN thiếu đáp án đúng | 2 đáp án, cả 2 sai | — | 1. Tạo câu 2. Gửi | Validation lỗi "phải có đúng 1 đáp án đúng" | | |
| TC-QST-04 | Tạo câu DUNG_SAI | 4 mệnh đề a–d, mỗi mệnh đề có đáp án chuẩn Đúng/Sai | — | 1. Tạo câu đúng/sai | Lưu thành công đúng 4 dòng dap_an | | |
| TC-QST-05 | Tạo câu TRA_LOI_NGAN | dapAnNganChuan="5" | — | 1. Tạo câu trả lời ngắn | Lưu dap_an_ngan_chuan | | |
| TC-QST-06 | Tạo câu TU_LUAN | Không có dapAn | — | 1. Tạo câu tự luận | Lưu thành công; không có bảng dap_an | | |
| TC-QST-07 | Sửa câu chưa dùng trong đề công bố | Sửa noiDung | Câu HOAT_DONG, chưa có lịch sử | 1. Sửa nội dung câu | Cập nhật thành công | | |
| TC-QST-08 | Sửa câu đã có lịch sử | Sửa noiDung câu đã thi | Câu thuộc đề DA_CONG_BO hoặc đã có chi_tiet_bai_lam | 1. Thử PATCH câu | Báo QUESTION_IMMUTABLE | | |
| TC-QST-09 | Sao chép câu lịch sử | — | Câu immutable | 1. Bấm Sao chép | Tạo câu mới độc lập; câu cũ giữ nguyên | | |
| TC-QST-10 | Xóa câu chưa thi | — | Câu HOAT_DONG, không thuộc đề DA_CONG_BO, chưa có lượt làm | 1. Bấm Xóa | Xóa khỏi DB; gỡ khỏi đề NHAP/DA_HUY; đồng bộ tong_diem | | |
| TC-QST-10b | Không xóa câu có lịch sử | — | Câu đã có cau_hoi_luot_lam | 1. Thử xóa | QUESTION_IMMUTABLE; giữ bản ghi | | |
| TC-QST-10c | Không xóa câu thuộc đề công bố | — | Câu thuộc đề DA_CONG_BO | 1. Thử xóa | QUESTION_IMMUTABLE; giữ bản ghi | | |
| TC-QST-11 | Upload ảnh câu hỏi | File PNG ≤ 5MB | Câu đã tạo | 1. Upload ảnh | anh_url cập nhật; hiển thị trên preview | | |
| TC-QST-12 | Upload ảnh quá dung lượng | File > 5MB | — | 1. Upload file lớn | Báo lỗi validation | | |
| TC-QST-13 | Xóa đáp án giữa rồi thêm lại | 4 đáp án, xóa dòng số 2 rồi thêm dòng mới | Form tạo/sửa MOT_DAP_AN | 1. Xóa dòng giữa 2. Thêm đáp án 3. Chọn đáp án đúng 4. Lưu | `correctIndex` được đánh lại liên tục; đáp án được chọn đúng trong DB | | |

---

## Nhóm 4 — Đề thi (Exams)

| Mã | Tên | Dữ liệu đầu vào | Điều kiện trước | Các bước | Kết quả mong đợi | Kết quả thực tế | Đạt/Không đạt |
|----|-----|-----------------|-----------------|----------|------------------|-----------------|---------------|
| TC-EXM-01 | Tạo đề nháp | tenDe, thoiLuongPhut=15, thoiGianBatDau/KetThuc hợp lệ | Đăng nhập GV | 1. Tạo đề mới | trangThai=NHAP; tongDiem=0 | | |
| TC-EXM-02 | Thêm câu vào đề nháp | 4 câu, tổng điểm 5.0 | Đề NHAP; ngân hàng có đủ 4 loại | 1. Thêm từng câu 2. Đặt điểm | cau_hoi_de_thi có 4 dòng; tongDiem=5.00 | | |
| TC-EXM-03 | Thời gian đề không hợp lệ | ketThuc <= batDau | — | 1. Tạo/sửa đề thời gian sai | Validation lỗi | | |
| TC-EXM-04 | Giao đề cho lớp | lopHocId=TOAN10A1 | Đề NHAP; lớp thuộc GV | 1. Giao đề cho lớp | Tạo phan_cong_de | | |
| TC-EXM-05 | Công bố đề thành công | — | Đề NHAP, có ≥1 câu, tổng điểm khớp | 1. Bấm Công bố đề | trangThai=DA_CONG_BO; khóa sửa cấu trúc | | |
| TC-EXM-06 | Công bố đề không có câu | — | Đề NHAP, 0 câu | 1. Thử công bố | Báo lỗi nghiệp vụ; không đổi trạng thái | | |
| TC-EXM-07 | Sửa cấu trúc đề đã công bố | Thêm/xóa câu | Đề DA_CONG_BO | 1. Thử thêm câu | EXAM_NOT_EDITABLE | | |
| TC-EXM-07b | Xóa đề nháp / đã hủy | — | Đề NHAP hoặc DA_HUY | 1. Bấm Xóa đề | Xóa de_thi; nếu có lượt làm thì xóa cascade lịch sử liên quan | | |
| TC-EXM-07c | Không xóa đề đang công bố | — | Đề DA_CONG_BO | 1. Thử xóa | Báo phải hủy công bố trước | | |
| TC-EXM-08 | Hủy giao đề đã có lượt làm | DELETE assign | Đã có luot_lam_bai | 1. Thử hủy giao | EXAM_HAS_ATTEMPTS | | |
| TC-EXM-09 | HS xem đề được giao | — | Đề DA_CONG_BO, đã giao lớp HS | 1. HS vào Danh sách đề | Hiển thị đề; không lộ đáp án đúng | | |
| TC-EXM-10 | HS không thấy đề chưa giao | — | Đề chưa assign lớp HS | 1. HS xem danh sách | Không hiển thị đề đó | | |
| TC-EXM-11 | Sắp xếp lại thứ tự câu (NHAP) | order mới | Đề NHAP, ≥2 câu | 1. Kéo thả / reorder API | thuTuGoc cập nhật đúng | | |

---

## Nhóm 5 — Làm bài thi (Taking Exam)

| Mã | Tên | Dữ liệu đầu vào | Điều kiện trước | Các bước | Kết quả mong đợi | Kết quả thực tế | Đạt/Không đạt |
|----|-----|-----------------|-----------------|----------|------------------|-----------------|---------------|
| TC-TAK-01 | Bắt đầu lượt làm | examId, lopHocId | HS DANG_HOC; đề DA_CONG_BO; trong khung giờ | 1. HS bấm Bắt đầu | Tạo luot_lam_bai DANG_LAM; cau_hoi_luot_lam đóng băng thứ tự | | |
| TC-TAK-02 | Trộn câu khi tronCauHoi=true | — | Đề seed tronCauHoi=TRUE | 1. HS A bắt đầu 2. Ghi thứ tự câu | Thứ tự có thể khác thuTuGoc; cố định sau khi tạo | | |
| TC-TAK-03 | Refresh không đổi thứ tự câu | — | Lượt DANG_LAM đã bắt đầu | 1. Ghi thứ tự 2. F5 trang 3. So sánh | thuTuHienThi giữ nguyên | | |
| TC-TAK-04 | Không bắt đầu khi chưa công bố | — | Đề NHAP | 1. HS thử start | EXAM_NOT_PUBLISHED | | |
| TC-TAK-05 | Không bắt đầu trước giờ mở | — | now < thoiGianBatDau | 1. HS thử start | EXAM_TIME_NOT_OPEN | | |
| TC-TAK-06 | Không bắt đầu sau giờ đóng | — | now > thoiGianKetThuc | 1. HS thử start | EXAM_TIME_CLOSED | | |
| TC-TAK-07 | Hết số lần làm | — | soLanDuocLam=1, đã nộp 1 lượt | 1. HS thử start lần 2 | ATTEMPT_LIMIT_REACHED | | |
| TC-TAK-08 | Lưu đáp án MOT_DAP_AN | dapAnDaChonId, answerVersion=1 | Lượt DANG_LAM | 1. Chọn đáp án 2. Autosave | chi_tiet_bai_lam lưu; answerVersion=1 | | |
| TC-TAK-09 | Lưu đáp án TRA_LOI_NGAN | noiDungTraLoi="5" | Lượt DANG_LAM | 1. Nhập đáp án 2. Lưu | Lưu noi_dung_tra_loi | | |
| TC-TAK-10 | Chống ghi đè version cũ | Gửi answerVersion=1 khi DB=3 | DB answerVersion=3 | 1. Gửi request version cũ | OLD_ANSWER_VERSION; không ghi đè | | |
| TC-TAK-11 | Autosave localStorage | — | Lượt DANG_LAM | 1. Trả lời vài câu 2. Kiểm tra localStorage | Key attempt:{id} có dữ liệu + version | | |
| TC-TAK-12 | Khôi phục sau refresh | — | Đã trả lời 2/4 câu | 1. F5 2. Kiểm tra UI | Đáp án hiển thị lại đúng | | |
| TC-TAK-13 | Đánh dấu câu cần xem lại | daDanhDau=true | Lượt DANG_LAM | 1. Bookmark câu 2 | da_danh_dau=TRUE trong DB | | |
| TC-TAK-14 | Heartbeat cập nhật last_seen | — | Lượt DANG_LAM | 1. Chờ 30s 2. Kiểm tra last_seen_at | Cập nhật ~30s/lần | | |
| TC-TAK-15 | Không lưu sau hạn nộp | — | hanNopHieuLuc đã qua | 1. Thử PUT answer | DEADLINE_PASSED | | |
| TC-TAK-16 | Nộp bài thủ công | loaiNop=THU_CONG | Lượt DANG_LAM, còn giờ | 1. Bấm Nộp bài | trangThai=DA_NOP; chấm tự động câu khách quan | | |
| TC-TAK-17 | Nộp bài hai lần | — | Đã DA_NOP | 1. Gọi submit lần 2 | ALREADY_SUBMITTED | | |
| TC-TAK-18 | Tự động nộp hết giờ | — | Lượt DANG_LAM, hết hanNopHieuLuc | 1. Chờ hết giờ hoặc job server | trangThai=TU_DONG_NOP; thoiGianNop ghi nhận | | |
| TC-TAK-19 | Đồng hồ theo serverTime | — | Lượt DANG_LAM | 1. Đổi giờ máy client 2. Quan sát countdown | Countdown theo server, không theo giờ máy | | |
| TC-TAK-20 | Offline → lưu local → online sync | — | Lượt DANG_LAM | 1. DevTools Offline 2. Trả lời câu 3. Online lại | localStorage giữ đáp án; sync lên server theo version | | |
| TC-TAK-21 | Không lộ đáp án đúng khi làm | — | Lượt DANG_LAM | 1. Inspect response API câu hỏi | Không có laDapAnDung / dapAnNganChuan | | |
| TC-TAK-22 | Hai request đến đảo thứ tự | v1=A, v2=B nhưng v2 tới server trước | Lượt DANG_LAM | 1. Làm chậm request v1 2. Gửi v2 3. Cho v1 hoàn tất | DB và UI vẫn giữ B; payload v1 không được tăng version rồi gửi lại | | |
| TC-TAK-23 | Nhập rồi nộp ngay | Câu tự luận đang debounce/pending | Lượt DANG_LAM còn hạn | 1. Nhập ký tự cuối 2. Bấm nộp ngay | Client chờ toàn bộ PUT lưu thành công rồi mới POST submit; bài chấm chứa nội dung mới nhất | | |

---

## Nhóm 6 — Chấm điểm & Kết quả (Grading)

| Mã | Tên | Dữ liệu đầu vào | Điều kiện trước | Các bước | Kết quả mong đợi | Kết quả thực tế | Đạt/Không đạt |
|----|-----|-----------------|-----------------|----------|------------------|-----------------|---------------|
| TC-GRD-01 | Chấm tự động MOT_DAP_AN đúng | Chọn đáp án đúng | HS nộp bài | 1. Nộp bài 2. Kiểm tra chi_tiet | la_dung=TRUE; diem_dat_duoc=điểm câu | | |
| TC-GRD-02 | Chấm tự động MOT_DAP_AN sai | Chọn đáp án sai | HS nộp bài | 1. Nộp 2. Kiểm tra | la_dung=FALSE; diem_dat_duoc=0 | | |
| TC-GRD-03 | Chấm tự động DUNG_SAI | Chọn đủ 4 mệnh đề | HS nộp | 1. Nộp | Áp dụng thang 1 / 0.5 / 0.25 / 0.1 / 0 theo số mệnh đề sai | | |
| TC-GRD-04 | Chấm TRA_LOI_NGAN đúng | noiDungTraLoi="5" | dapAnNganChuan="5" | 1. Nộp | la_dung=TRUE; chuẩn hóa trim/lowercase | | |
| TC-GRD-04b | Chấm TRA_LOI_NGAN phân số/thập phân | noiDungTraLoi="0,5" hoặc "1/2" | dapAnNganChuan="1/2\|0.5\|0,5" | 1. Nộp | la_dung=TRUE (tương đương số) | | |
| TC-GRD-05 | Chấm TRA_LOI_NGAN sai | noiDungTraLoi="6" | dapAnNganChuan="5" | 1. Nộp | la_dung=FALSE | | |
| TC-GRD-06 | GV chấm tự luận | diemDatDuoc=1.5, nhanXet | Lượt DA_NOP, câu TU_LUAN max 2.0 | 1. GV mở bài 2. Nhập điểm 3. Lưu | diem_dat_duoc=1.5; tong_diem cập nhật | | |
| TC-GRD-07 | Điểm tự luận vượt max | diemDatDuoc=3.0 | diem câu=2.0 | 1. Thử chấm 3.0 | Validation lỗi | | |
| TC-GRD-08 | Hoàn tất chấm → DA_CHAM | — | Mọi TU_LUAN đã có điểm | 1. Bấm Lưu điểm chấm | `trang_thai=DA_CHAM` | | |
| TC-GRD-09 | Đề không TU_LUAN → DA_CHAM ngay | — | Đề chỉ khách quan | 1. HS nộp | trangThai=DA_CHAM ngay sau nộp | | |
| TC-GRD-10 | Công bố kết quả | — | Mọi lượt đã chấm xong | 1. GV bấm Công bố kết quả | daCongBoKetQua=TRUE | | |
| TC-GRD-11 | HS xem kết quả trước công bố | — | daCongBoKetQua=FALSE | 1. HS mở kết quả | RESULTS_NOT_PUBLISHED | | |
| TC-GRD-12 | HS xem kết quả sau công bố | — | daCongBoKetQua=TRUE | 1. HS xem kết quả | Hiển thị tongDiem, điểm từng câu | | |
| TC-GRD-13 | Xem đáp án khi choXemDapAn=true | — | Công bố kết quả + choXemDapAn=TRUE | 1. HS xem chi tiết | Hiển thị lời giải/đáp án đúng | | |
| TC-GRD-14 | Không xem đáp án khi choXemDapAn=false | — | choXemDapAn=FALSE | 1. HS xem kết quả | Chỉ điểm, không lộ đáp án | | |
| TC-GRD-15 | Tính lại điểm không cộng dồn lặp | — | Nộp + chấm lại | 1. Chấm 2 lần cùng câu | tong_diem = SUM chi_tiet, không nhân đôi | | |
| TC-GRD-16 | Chặn công bố khi đề còn diễn ra | — | Đề còn giờ hoặc có lượt DANG_LAM | 1. GV bấm Công bố kết quả | Hệ thống từ chối; học sinh không thể mở đáp án | | |

---

## Nhóm 7 — Sự cố (Incidents)

| Mã | Tên | Dữ liệu đầu vào | Điều kiện trước | Các bước | Kết quả mong đợi | Kết quả thực tế | Đạt/Không đạt |
|----|-----|-----------------|-----------------|----------|------------------|-----------------|---------------|
| TC-INC-01 | HS báo sự cố mất mạng | loaiSuCo=MAT_MANG, moTa | Lượt DANG_LAM | 1. HS báo sự cố | su_co_bai_thi CHO_XAC_NHAN; tuDongPhatHien=false | | |
| TC-INC-02 | HS không tự nhập giây bù | — | Form báo sự cố | 1. Kiểm tra UI/API | Không có field soGiayBuGio cho HS | | |
| TC-INC-03 | GV duyệt bù 2 phút | quyetDinh=CHAP_NHAN, soGiayBuGio=120 | Sự cố CHO_XAC_NHAN | 1. GV duyệt | thoi_gian_bo_sung_giog += 120; hanNopHieuLuc tăng | | |
| TC-INC-04 | GV từ chối sự cố | quyetDinh=TU_CHOI | Sự cố CHO_XAC_NHAN | 1. GV từ chối | trangThai=TU_CHOI; không đổi thoi_gian_bo_sung | | |
| TC-INC-05 | Duyệt hai lần không cộng giờ 2 lần | — | Sự cố DA_CHAP_NHAN | 1. Thử duyệt lại | INCIDENT_ALREADY_REVIEWED | | |
| TC-INC-06 | Mở lại bài sau sự cố | — | Lượt đã nộp oan do mất mạng | 1. GV duyệt + mở lại | trangThai=DANG_LAM; log MO_LAI_SAU_SU_CO | | |
| TC-INC-07 | Phát hiện mất kết nối tự động | — | Heartbeat ngắt > ngưỡng | 1. Ngắt mạng lâu 2. Kiểm tra DB | Có thể tạo su_co tuDongPhatHien=true; log MAT_KET_NOI | | |
| TC-INC-08 | Lưu đáp án sau khi được bù giờ | — | Đã duyệt bù; còn trong hanNopHieuLuc mới | 1. HS tiếp tục làm 2. Lưu đáp án | Lưu thành công | | |
| TC-INC-09 | GV xem danh sách sự cố theo đề | — | Có ≥1 sự cố | 1. GV mở tab Sự cố | Liệt kê đúng lượt, loại, trạng thái | | |

---

## Nhóm 8 — Thống kê & Hệ thống

| Mã | Tên | Dữ liệu đầu vào | Điều kiện trước | Các bước | Kết quả mong đợi | Kết quả thực tế | Đạt/Không đạt |
|----|-----|-----------------|-----------------|----------|------------------|-----------------|---------------|
| TC-SYS-01 | Health check OK | GET /health | Server + DB chạy | 1. Gọi health | status=ok, database=connected | | |
| TC-SYS-02 | Health check DB lỗi | — | Tắt MySQL | 1. Gọi health | HTTP 503 | | |
| TC-SYS-03 | Thống kê đề — điểm TB | — | ≥5 lượt đã nộp | 1. GV xem thống kê đề | diemTrungBinh, phanBoDiem đúng | | |
| TC-SYS-04 | Thống kê tỷ lệ đúng theo câu | — | Nhiều lượt nộp | 1. Xem tiLeDungTheoCau | Tỷ lệ khớp chi_tiet_bai_lam | | |
| TC-SYS-05 | Rate limit đăng nhập | 21 lần sai liên tiếp trong 15 phút | — | 1. Đăng nhập sai liên tiếp | HTTP 429 sau 20 request | | |

---

## Ma trận phủ use case

| Use Case | Test case liên quan |
|----------|---------------------|
| UC-GV-01 | TC-ACC-01 |
| UC-GV-02 | TC-ACC-05, 07, 08 |
| UC-GV-03 | TC-CLS-01, 11 |
| UC-GV-04 | TC-CLS-06, 07 |
| UC-GV-05 | TC-QST-01 |
| UC-GV-06 | TC-QST-02 → 12 |
| UC-GV-07 | TC-EXM-01, 02, 11 |
| UC-GV-08 | TC-EXM-04 |
| UC-GV-09 | TC-EXM-05, 06, 07 |
| UC-GV-10 | TC-GRD-06 |
| UC-GV-11 | TC-GRD-06, 07, 08 |
| UC-GV-12 | TC-GRD-10, 11, 12 |
| UC-GV-13 | TC-SYS-03, 04 |
| UC-GV-14 | TC-INC-03, 04, 05 |
| UC-HS-01 | TC-ACC-02 |
| UC-HS-02 | TC-ACC-06, 08 |
| UC-HS-03 | TC-CLS-03, 04 |
| UC-HS-04 | TC-EXM-09 |
| UC-HS-05 | TC-TAK-01, 04, 05, 06 |
| UC-HS-06–08 | TC-TAK-08 → 13 |
| UC-HS-07 | TC-TAK-11, 12, 20 |
| UC-HS-09 | TC-TAK-16, 17, 18 |
| UC-HS-10 | TC-GRD-11, 12, 13 |
| UC-HS-11 | TC-INC-01, 02 |

---

## Ghi chú kiểm thử

1. **Chuẩn bị:** Chạy `reset-schema.sql` → `schema.sql` → `seed.sql` trước mỗi vòng test regression lớn.
2. **Công bố đề demo:** Seed để đề ở NHAP — cần công bố qua UI/API trước khi chạy nhóm Taking Exam.
3. **Thời gian:** Seed dùng `NOW()` + 7 ngày; test hết hạn có thể sửa `thoi_gian_ket_thuc` tạm thời.
4. **Offline test:** Dùng Chrome DevTools → Network → Offline.
5. **Version conflict:** Dùng Postman gửi PUT với `answerVersion` cố ý thấp hơn DB.

**Tổng số test case thủ công:** 99
