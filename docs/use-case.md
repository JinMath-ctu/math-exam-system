# Use Case

## Tổng quan

Hệ thống V1 có hai actor: **Giáo viên chủ hệ thống** và **Học sinh**. Tài khoản giáo viên được tạo khi cài đặt; chỉ học sinh tự đăng ký công khai.

**Sơ đồ Use Case UML (cho báo cáo):** `docs/use-case-diagrams.md` · xem `docs/use-case-diagrams-preview.html` · ảnh PNG/SVG trong `docs/diagrams/`.

**Đặc tả Use Case (mục 2.3 báo cáo):** `docs/use-case-spec.md` — chi tiết 5 nhóm UC tiêu biểu + rút gọn các UC còn lại + NFR.

| Mã sơ đồ | Nội dung |
|----------|----------|
| UCD-01 | Tổng quan hệ thống (UML) |
| UCD-02 | Góc nhìn Giáo viên (UML) |
| UCD-03 | Góc nhìn Học sinh (UML) |
| UCD-04 | Phòng thi — include/extend (UML) |

## Giáo viên

| Mã | Use Case | Mô tả ngắn |
|----|----------|------------|
| UC-GV-01 | Khởi tạo tài khoản chủ | Tài khoản GIAO_VIEN được tạo sẵn bằng dữ liệu cài đặt/seed, không đăng ký công khai |
| UC-GV-02 | Đăng nhập / Đăng xuất | Xác thực session |
| UC-GV-03 | Quản lý lớp | Tạo, sửa, lưu trữ, xóa lớp (khi chưa có lượt làm) |
| UC-GV-04 | Quản lý thành viên | Xem, loại học sinh (cập nhật trạng thái) |
| UC-GV-05 | Quản lý chủ đề | CRUD chủ đề câu hỏi |
| UC-GV-06 | Quản lý câu hỏi | Tạo 4 loại, sửa/sao chép/xóa, upload ảnh |
| UC-GV-07 | Tạo đề | Tạo đề NHAP, thêm/xóa câu, đặt điểm |
| UC-GV-08 | Giao đề | Gán đề cho lớp |
| UC-GV-09 | Công bố đề | NHAP → DA_CONG_BO, khóa cấu trúc |
| UC-GV-10 | Xem bài làm | Danh sách lượt làm theo đề |
| UC-GV-11 | Chấm tự luận | Nhập điểm và nhận xét |
| UC-GV-12 | Công bố kết quả | Cho học sinh xem điểm |
| UC-GV-13 | Xem thống kê | Số liệu và biểu đồ cơ bản |
| UC-GV-14 | Xử lý sự cố | Duyệt/từ chối báo cáo, bù giờ |
| UC-GV-15 | Xem tài khoản học sinh | Xem danh sách tài khoản HOC_SINH đã đăng ký (chỉ đọc) |

## Học sinh

| Mã | Use Case | Mô tả ngắn |
|----|----------|------------|
| UC-HS-01 | Đăng ký | Tạo tài khoản vai trò HOC_SINH |
| UC-HS-02 | Đăng nhập / Đăng xuất | Xác thực session |
| UC-HS-03 | Tham gia lớp | Nhập mã lớp |
| UC-HS-04 | Xem đề | Danh sách đề được giao |
| UC-HS-05 | Bắt đầu bài | Tạo lượt, đóng băng câu |
| UC-HS-06 | Làm bài | Phòng thi, chọn/nhập đáp án |
| UC-HS-07 | Lưu đáp án | Autosave + localStorage |
| UC-HS-08 | Đánh dấu câu | Bookmark xem lại |
| UC-HS-09 | Nộp bài | Nộp thủ công hoặc hết giờ |
| UC-HS-10 | Xem kết quả | Sau công bố kết quả |
| UC-HS-11 | Báo sự cố | Gửi báo cáo chờ giáo viên xử lý |

## Quan hệ Use Case chính

```
[Giáo viên] -- tạo --> [Đề thi] -- giao --> [Lớp]
[Học sinh] -- thuộc --> [Lớp] -- bắt đầu --> [Lượt làm]
[Lượt làm] -- lưu --> [Chi tiết bài làm]
[Giáo viên] -- chấm --> [Tự luận] -- công bố --> [Kết quả]
```
