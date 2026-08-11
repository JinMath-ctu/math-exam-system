# Phạm vi niên luận — Đã khóa

## Tên đề tài

Xây dựng website kiểm tra Toán trực tuyến hỗ trợ tự động lưu và khôi phục bài làm

## Lý do chọn đề tài

Khi làm bài thi trực tuyến, học sinh thường gặp mất mạng, tải lại trang hoặc đóng trình duyệt ngoài ý muốn. Nhiều hệ thống chưa hỗ trợ lưu đáp án tạm thời và khôi phục đúng phiên bản, dẫn đến mất bài hoặc ghi đè dữ liệu mới bằng dữ liệu cũ. Đề tài tập trung giải quyết bài toán này cho môn Toán, kết hợp ngân hàng câu hỏi, phòng thi và quy trình chấm điểm rõ ràng.

## Mục tiêu

1. Xây dựng website kiểm tra Toán trực tuyến cho giáo viên và học sinh.
2. Hỗ trợ bốn loại câu hỏi: một đáp án, đúng/sai, trả lời ngắn, tự luận.
3. Tự động lưu đáp án online, lưu tạm localStorage và đồng bộ khi có mạng lại.
4. Khôi phục bài khi refresh mà không đổi thứ tự câu.
5. Chấm tự động câu khách quan; giáo viên chấm tự luận.
6. Xử lý sự cố và bù giờ có kiểm soát bằng transaction.

## Đối tượng sử dụng

### Mô hình vận hành V1

V1 là hệ thống cá nhân do **một giáo viên đồng thời là chủ hệ thống** vận hành cho các lớp của mình. Tài khoản giáo viên được tạo sẵn khi cài đặt/seed; trang đăng ký công khai chỉ tạo tài khoản học sinh. Thiết kế chưa hướng tới SaaS công khai, nhiều trường học hoặc nhiều đơn vị độc lập.

| Vai trò | Mô tả |
|---------|--------|
| GIAO_VIEN | Quản lý lớp, câu hỏi, đề thi, chấm bài, thống kê, xử lý sự cố |
| HOC_SINH | Tham gia lớp, làm bài, nộp bài, xem kết quả, báo sự cố |

Không xây dựng vai trò Admin riêng; giáo viên chủ hệ thống thực hiện các công việc vận hành cần thiết.

## Chức năng giáo viên

- Đăng nhập, đăng xuất bằng tài khoản chủ hệ thống được tạo sẵn
- Quản lý lớp học và thành viên lớp
- Quản lý chủ đề và ngân hàng câu hỏi
- Tạo đề thi nháp, thêm câu, đặt điểm
- Giao đề cho lớp, công bố đề
- Xem lượt làm bài, chấm tự luận
- Công bố kết quả, xem thống kê cơ bản
- Xem và xử lý sự cố bài thi (duyệt/từ chối bù giờ)

## Chức năng học sinh

- Đăng ký, đăng nhập, đăng xuất
- Tham gia lớp bằng mã, rời lớp
- Xem đề được giao, bắt đầu bài thi
- Làm bài trực tuyến, đánh dấu câu cần xem lại
- Tự động lưu đáp án, khôi phục khi tải lại trang
- Đồng bộ đáp án sau khi có mạng lại
- Nộp bài, xem kết quả sau khi giáo viên công bố
- Báo sự cố

## Bốn loại câu hỏi

| Loại | Mô tả |
|------|--------|
| MOT_DAP_AN | Ít nhất 2 đáp án, đúng đúng 1 |
| DUNG_SAI | 4 mệnh đề a–d, mỗi mệnh đề Đúng/Sai; thang điểm 1 / 0.5 / 0.25 / 0.1 / 0 theo số mệnh đề sai |
| TRA_LOI_NGAN | Không có dòng đáp án lựa chọn; có đáp án chuẩn để chấm tự động |
| TU_LUAN | Không có dòng đáp án lựa chọn; giáo viên chấm thủ công |

## Công nghệ

**Frontend:** HTML5, CSS3, JavaScript thuần, EJS, Fetch API, localStorage, KaTeX, Chart.js

**Backend:** Node.js, Express.js

**Database:** MySQL >= 8.0.16, mysql2

**Bảo mật / tiện ích:** bcrypt, express-session, express-mysql-session, dotenv, express-validator, multer, helmet, method-override, morgan, express-rate-limit

## Chức năng không thực hiện

- Upload Word/PDF tự chuyển đề online
- Import Excel
- OCR
- AI tạo câu hỏi / AI chấm tự luận
- Camera giám sát, nhận diện khuôn mặt
- Chat
- Ứng dụng mobile
- Admin riêng
- Nhiều đáp án đúng
- Thanh toán
- Thông báo realtime bằng WebSocket

## Tiêu chí hoàn thành

- [x] Phạm vi đã được khóa trong tài liệu này
- [x] Hệ thống chạy được với database seed demo
- [x] Giáo viên thực hiện đủ luồng: lớp → câu hỏi → đề → giao → công bố → chấm → công bố kết quả
- [x] Học sinh thực hiện đủ luồng: tham gia lớp → làm bài → autosave/khôi phục → nộp → xem kết quả
- [x] Không còn chức năng ngoài phạm vi đã khóa
- [x] README cho phép người khác cài và chạy dự án

> **Khóa yêu cầu:** Sau giai đoạn 0, không tự ý thêm chức năng ngoài danh sách trên.
