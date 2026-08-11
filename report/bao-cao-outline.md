# Dàn ý báo cáo niên luận

> **Đề tài:** Xây dựng website kiểm tra Toán trực tuyến hỗ trợ tự động lưu và khôi phục bài làm  
> **Giai đoạn:** 27 — Viết báo cáo niên luận  
> **Hướng dẫn:** Copy dàn ý này sang Word, mở rộng từng mục thành nội dung hoàn chỉnh. Chèn ảnh giao diện, sơ đồ và đoạn code minh họa ngắn (không quá dài).

---

## LỜI CẢM ƠN

## LỜI MỞ ĐẦU

- Lý do chọn đề tài (tóm tắt)
- Mục tiêu nghiên cứu
- Phạm vi thực hiện
- Phương pháp thực hiện
- Cấu trúc báo cáo

---

## CHƯƠNG 1 — TỔNG QUAN

### 1.1. Giới thiệu đề tài

- 1.1.1. Bối cảnh kiểm tra trực tuyến trong giáo dục
- 1.1.2. Vấn đề mất dữ liệu khi thi online (mất mạng, refresh, đóng trình duyệt)
- 1.1.3. Nhu cầu hệ thống kiểm tra Toán có autosave và khôi phục

### 1.2. Lý do chọn đề tài

- 1.2.1. Thực trạng các hệ thống thi trực tuyến hiện nay
- 1.2.2. Ý nghĩa giải quyết bài toán lưu/khôi phục bài làm
- 1.2.3. Phù hợp với chuyên ngành và khả năng triển khai

### 1.3. Mục tiêu nghiên cứu

- 1.3.1. Mục tiêu chung
- 1.3.2. Mục tiêu cụ thể (website Toán, 4 loại câu, autosave, khôi phục, chấm điểm, sự cố)

### 1.4. Phạm vi nghiên cứu

- 1.4.1. Phạm vi chức năng (giáo viên / học sinh — tham chiếu `docs/scope.md`)
- 1.4.2. Phạm vi công nghệ (Node.js, Express, EJS, MySQL, localStorage…)
- 1.4.3. Giới hạn — chức năng **không** thực hiện (AI, OCR, mobile app, WebSocket…)

### 1.5. Đối tượng sử dụng

- 1.5.1. Vai trò Giáo viên (GIAO_VIEN)
- 1.5.2. Vai trò Học sinh (HOC_SINH)
- 1.5.3. Lý do không xây dựng Admin riêng

### 1.6. Phương pháp thực hiện

- 1.6.1. Thu thập và phân tích yêu cầu
- 1.6.2. Phân tích và thiết kế hệ thống
- 1.6.3. Lập trình và tích hợp
- 1.6.4. Kiểm thử và đánh giá

### 1.7. Công nghệ sử dụng

- 1.7.1. Frontend: HTML5, CSS3, JavaScript, EJS, Fetch API, localStorage, KaTeX, Chart.js
- 1.7.2. Backend: Node.js, Express.js
- 1.7.3. Database: MySQL >= 8.0.16, mysql2
- 1.7.4. Bảo mật và tiện ích: bcrypt, session, CSRF, helmet, rate limit…

---

## CHƯƠNG 2 — PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG

### 2.1. Khảo sát và phân tích yêu cầu

- 2.1.1. Yêu cầu chức năng — Giáo viên
- 2.1.2. Yêu cầu chức năng — Học sinh
- 2.1.3. Yêu cầu phi chức năng (bảo mật, hiệu năng, khả dụng, múi giờ)

### 2.2. Mô hình Use Case

- 2.2.1. Sơ đồ Use Case tổng quát (2 actor: GV, HS)
- 2.2.2. Bảng Use Case giáo viên (UC-GV-01 → UC-GV-14)
- 2.2.3. Bảng Use Case học sinh (UC-HS-01 → UC-HS-11)
- 2.2.4. Quan hệ Use Case chính (tạo đề → giao → làm bài → chấm → kết quả)

### 2.3. Mô tả Use Case tiêu biểu

- 2.3.1. UC: Giáo viên tạo và công bố đề thi
- 2.3.2. UC: Học sinh bắt đầu và làm bài thi
- 2.3.3. UC: Tự động lưu và khôi phục đáp án
- 2.3.4. UC: Giáo viên chấm tự luận và công bố kết quả
- 2.3.5. UC: Xử lý sự cố và bù giờ

### 2.4. Thiết kế cơ sở dữ liệu

- 2.4.1. Lựa chọn MySQL >= 8.0.16 (CHECK constraint)
- 2.4.2. ERD 15 bảng nghiệp vụ (tham chiếu `diagrams/erd.md`)
- 2.4.3. Mô tả từng bảng chính
- 2.4.4. FK ghép: `luot_lam_bai`, `chi_tiet_bai_lam`
- 2.4.5. Ràng buộc toàn vẹn (CHECK, UNIQUE, ENUM)

### 2.5. Thiết kế kiến trúc hệ thống

- 2.5.1. Mô hình 3 tầng: Browser → Express → MySQL
- 2.5.2. Phân tầng Route / Controller / Service / Repository
- 2.5.3. Hai kênh: Server-rendered (EJS) và REST API (phòng thi)
- 2.5.4. Sơ đồ kiến trúc (tham chiếu `docs/architecture.md`)

### 2.6. Thiết kế luồng xử lý chính

- 2.6.1. Luồng đăng nhập và phân quyền
- 2.6.2. Luồng giáo viên tạo đề (NHAP → DA_CONG_BO)
- 2.6.3. Luồng học sinh bắt đầu bài (transaction, đóng băng câu)
- 2.6.4. Luồng autosave (answer_version, chống ghi đè)
- 2.6.5. Luồng khôi phục (server state + localStorage)
- 2.6.6. Luồng nộp bài (thủ công, hết giờ, job server)
- 2.6.7. Luồng bù giờ và xử lý sự cố (transaction)

### 2.7. Thiết kế bốn loại câu hỏi

- 2.7.1. MOT_DAP_AN — một đáp án đúng
- 2.7.2. DUNG_SAI — đúng / sai
- 2.7.3. TRA_LOI_NGAN — chấm tự động theo đáp án chuẩn
- 2.7.4. TU_LUAN — giáo viên chấm thủ công

### 2.8. Quy tắc thời gian và hạn nộp

- 2.8.1. Thời gian server (+07:00) là nguồn chính xác
- 2.8.2. Công thức `han_nop` gốc
- 2.8.3. Công thức `han_nop_hieu_luc` sau bù giờ
- 2.8.4. Quy tắc không lưu đáp án sau hạn hiệu lực

---

## CHƯƠNG 3 — XÂY DỰNG HỆ THỐNG

### 3.1. Cấu trúc project Node.js

- 3.1.1. Tổ chức thư mục (`src/`, `public/`, `database/`, `docs/`)
- 3.1.2. Package và script (`npm run dev`, dependencies)
- 3.1.3. Cấu hình môi trường (`.env`, `.env.example`)

### 3.2. Kết nối và quản lý database

- 3.2.1. Connection pool (`src/config/database.js`)
- 3.2.2. Thiết lập múi giờ `+07:00`
- 3.2.3. Transaction helper (`with-transaction.js`)
- 3.2.4. Repository pattern và SQL placeholder

### 3.3. Khởi tạo Express và middleware

- 3.3.1. Cấu hình `app.js` (helmet, morgan, session, static)
- 3.3.2. Session store MySQL (`express-mysql-session`)
- 3.3.3. Error handler và trang 404/500

### 3.4. Module đăng nhập và phân quyền

- 3.4.1. Đăng ký — validation, bcrypt hash
- 3.4.2. Đăng nhập — session regenerate
- 3.4.3. Middleware: `requireAuth`, `requireTeacher`, `requireStudent`
- 3.4.4. Rate limit cho login/register

### 3.5. Module lớp học

- 3.5.1. Giáo viên: CRUD lớp, quản lý thành viên
- 3.5.2. Học sinh: tham gia bằng mã, rời lớp
- 3.5.3. Quy tắc: mã duy nhất, lưu trữ, không rời khi đang thi

### 3.6. Module chủ đề và ngân hàng câu hỏi

- 3.6.1. CRUD chủ đề
- 3.6.2. Tạo 4 loại câu hỏi + validation đáp án
- 3.6.3. Upload ảnh câu hỏi (multer)
- 3.6.4. Hiển thị công thức Toán (KaTeX)
- 3.6.5. Sao chép câu lịch sử, xóa câu hỏi

### 3.7. Module đề thi

- 3.7.1. Tạo đề nháp, thêm/xóa câu, đặt điểm
- 3.7.2. Đồng bộ `tong_diem`
- 3.7.3. Giao đề cho lớp (`phan_cong_de`)
- 3.7.4. Công bố đề — khóa cấu trúc

### 3.8. Module bắt đầu lượt làm bài

- 3.8.1. API start attempt — kiểm tra điều kiện
- 3.8.2. Transaction và chống double-click
- 3.8.3. Trộn câu Fisher-Yates, lưu `cau_hoi_luot_lam`

### 3.9. Module phòng thi

- 3.9.1. Giao diện phòng thi (EJS + `exam-room.js`)
- 3.9.2. API state — câu hỏi, đáp án, serverTime, effectiveDeadline
- 3.9.3. Đồng hồ đếm ngược theo server offset
- 3.9.4. Đánh dấu câu cần xem lại (bookmark)

### 3.10. Module autosave và localStorage

- 3.10.1. Luồng lưu: UI → tăng version → localStorage → API
- 3.10.2. Key localStorage: `math_exam_user_<userId>_attempt_<attemptId>`
- 3.10.3. Kiểm soát `answer_version` trên server
- 3.10.4. Debounce theo loại câu hỏi
- 3.10.5. Trạng thái đồng bộ: Đang lưu / Đã lưu / Chờ đồng bộ / Mất kết nối

### 3.11. Module heartbeat và phát hiện gián đoạn

- 3.11.1. Heartbeat 30 giây — cập nhật `last_seen_at`
- 3.11.2. Phát hiện mất kết nối — log MAT_KET_NOI / KHOI_PHUC
- 3.11.3. Tạo sự cố tự động khi cần

### 3.12. Module nộp bài

- 3.12.1. Nộp thủ công — chống double-click
- 3.12.2. Tự động nộp khi hết giờ (client)
- 3.12.3. Job server quét lượt quá hạn (`auto-submit-job.js`)
- 3.12.4. Transaction nộp — chấm tự động, cập nhật trạng thái

### 3.13. Module chấm điểm

- 3.13.1. Chấm trắc nghiệm và đúng/sai
- 3.13.2. Chấm trả lời ngắn — chuẩn hóa chuỗi
- 3.13.3. Chấm tự luận — giáo viên nhập điểm và nhận xét
- 3.13.4. Chuyển trạng thái DA_CHAM

### 3.14. Module công bố kết quả

- 3.14.1. Giáo viên công bố — `da_cong_bo_ket_qua = TRUE`
- 3.14.2. Học sinh xem kết quả và đáp án (nếu `cho_xem_dap_an`)

### 3.15. Module xử lý sự cố

- 3.15.1. Học sinh báo sự cố
- 3.15.2. Giáo viên duyệt/từ chối — transaction bù giờ
- 3.15.3. Mở lại bài sau sự cố (MO_LAI_SAU_SU_CO)

### 3.16. Module thống kê

- 3.16.1. Số liệu: đã làm, chưa làm, điểm TB/cao/thấp
- 3.16.2. Biểu đồ Chart.js: phân bố điểm, tỷ lệ đúng từng câu

### 3.17. Bảo mật

- 3.17.1. bcrypt, session an toàn, CSRF
- 3.17.2. Rate limit, SQL placeholder
- 3.17.3. Upload an toàn, Helmet CSP
- 3.17.4. Không lộ đáp án đúng khi đang thi

---

## CHƯƠNG 4 — KIỂM THỬ VÀ ĐÁNH GIÁ

### 4.1. Môi trường kiểm thử

- 4.1.1. Phần cứng và phần mềm
- 4.1.2. Cấu hình: Node.js LTS, MySQL 8.0.16+, localhost:3000
- 4.1.3. Dữ liệu seed demo

### 4.2. Bộ test case

- 4.2.1. Tổng quan 99 test case thủ công và bộ regression test tự động (`test/`)
- 4.2.2. Nhóm tài khoản (TC-ACC)
- 4.2.3. Nhóm lớp học (TC-CLS)
- 4.2.4. Nhóm câu hỏi (TC-QST)
- 4.2.5. Nhóm đề thi (TC-EXM)
- 4.2.6. Nhóm làm bài (TC-TKN)
- 4.2.7. Nhóm chấm điểm và kết quả (TC-GRD)
- 4.2.8. Nhóm sự cố (TC-INC)
- 4.2.9. Nhóm hệ thống (TC-SYS)

### 4.3. Kết quả kiểm thử

- 4.3.1. Bảng tổng hợp Đạt / Không đạt theo nhóm
- 4.3.2. Ảnh chụp màn hình minh chứng (screenshots/)

### 4.4. Kiểm thử các tình huống đặc biệt

- 4.4.1. Tắt/bật mạng khi đang làm bài
- 4.4.2. Refresh trang — khôi phục đáp án, thứ tự câu không đổi
- 4.4.3. Nộp bài hai lần (double-click)
- 4.4.4. Bắt đầu bài hai request đồng thời
- 4.4.5. Request cũ đến muộn (OLD_ANSWER_VERSION)
- 4.4.6. Hết giờ — client tự nộp và job server
- 4.4.7. Đóng/mở trình duyệt — server tự nộp
- 4.4.8. Bù giờ và mở lại bài sau sự cố
- 4.4.9. Phân quyền — sai vai trò, sai quyền sở hữu

### 4.5. Demo hệ thống

- 4.5.1. Kịch bản demo 10–15 phút (`docs/demo-script.md`)
- 4.5.2. Luồng GV → HS → chấm → thống kê
- 4.5.3. Nhấn mạnh autosave và khôi phục

### 4.6. Đánh giá hệ thống

- 4.6.1. Ưu điểm
  - Autosave đa tầng (server + localStorage + version)
  - Khôi phục bài làm ổn định
  - Hỗ trợ 4 loại câu hỏi Toán (KaTeX)
  - Quy trình chấm điểm và sự cố rõ ràng
  - Kiến trúc phân tầng, dễ bảo trì
- 4.6.2. Hạn chế
  - Chưa hỗ trợ mobile app
  - Không có thông báo realtime (WebSocket)
  - Chấm tự luận thủ công, chưa AI
  - Giao diện responsive cơ bản
- 4.6.3. So sánh với mục tiêu ban đầu

---

## KẾT LUẬN

### Kết quả đạt được

- Xây dựng website kiểm tra Toán trực tuyến hoàn chỉnh
- Triển khai autosave, localStorage, khôi phục bài làm
- Đáp ứng phạm vi đã khóa trong `docs/scope.md`

### Ý nghĩa và giá trị

- Giải quyết bài toán mất bài khi thi online
- Ứng dụng thực tế cho giáo viên và học sinh THPT

### Hạn chế

- (Tóm tắt từ mục 4.6.2)

### Hướng phát triển

> **Lưu ý:** Các hướng dưới đây là **đề xuất tương lai**, không phải chức năng hiện có.

- Ứng dụng di động (React Native / Flutter)
- Thông báo realtime qua WebSocket
- Import câu hỏi từ Excel
- Hỗ trợ nhiều môn học
- Cải thiện giao diện responsive
- Tích hợp AI hỗ trợ chấm tự luận (ngoài phạm vi hiện tại)

---

## TÀI LIỆU THAM KHẢO

## PHỤ LỤC

- Phụ lục A: Hướng dẫn cài đặt (README.md)
- Phụ lục B: Tài liệu API (docs/api.md)
- Phụ lục C: ERD (diagrams/erd.md)
- Phụ lục D: Một số đoạn mã nguồn minh họa
- Phụ lục E: Bảng test case chi tiết
