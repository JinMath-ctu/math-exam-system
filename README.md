# Website kiểm tra Toán trực tuyến hỗ trợ tự động lưu và khôi phục bài làm

Hệ thống web V1 dành cho **một giáo viên chủ hệ thống** tạo đề kiểm tra môn Toán, giao cho các lớp của mình và chấm điểm; học sinh làm bài trực tuyến với cơ chế **tự động lưu đáp án** lên server, **lưu tạm trên trình duyệt (localStorage)** và **khôi phục bài làm** khi tải lại trang hoặc mất mạng tạm thời.

## Mô tả ngắn

Dự án niên luận xây dựng website kiểm tra Toán trực tuyến với hai vai trò **Giáo viên** và **Học sinh**. V1 vận hành theo mô hình cá nhân: tài khoản giáo viên được tạo sẵn khi cài đặt, còn trang đăng ký công khai chỉ dành cho học sinh. Hệ thống hỗ trợ bốn loại câu hỏi (một đáp án, đúng/sai, trả lời ngắn, tự luận), phòng thi có đồng hồ theo thời gian server, autosave có kiểm soát phiên bản (`answer_version`), xử lý sự cố và bù giờ có kiểm soát.

## Chức năng chính

### Giáo viên

- Đăng nhập, đăng xuất bằng tài khoản giáo viên được tạo sẵn
- Quản lý lớp học và thành viên lớp
- Quản lý chủ đề và ngân hàng câu hỏi (4 loại câu)
- Tạo đề thi nháp, thêm câu, đặt điểm, giao đề cho lớp
- Công bố đề (`NHAP` → `DA_CONG_BO`)
- Xem lượt làm bài, chấm câu tự luận
- Công bố kết quả, xem thống kê cơ bản (Chart.js)
- Xem và xử lý sự cố bài thi (duyệt/từ chối bù giờ)

### Học sinh

- Đăng ký, đăng nhập, đăng xuất
- Tham gia lớp bằng mã, rời lớp
- Xem đề được giao, bắt đầu bài thi
- Làm bài trực tuyến, đánh dấu câu cần xem lại
- Tự động lưu đáp án, khôi phục khi tải lại trang
- Đồng bộ đáp án sau khi có mạng lại
- Nộp bài (thủ công hoặc hết giờ)
- Xem kết quả sau khi giáo viên công bố
- Báo sự cố

## Công nghệ

| Tầng | Công nghệ |
|------|-----------|
| Frontend | HTML5, CSS3, JavaScript thuần, EJS, Fetch API, localStorage, KaTeX, Chart.js |
| Backend | Node.js, Express.js |
| Database | MySQL >= 8.0.16, mysql2 |
| Bảo mật / tiện ích | bcrypt, express-session, express-mysql-session, dotenv, express-validator, multer, helmet, method-override, morgan, express-rate-limit, csrf-csrf |

## Yêu cầu hệ thống

- **Node.js** bản LTS
- **MySQL** >= 8.0.16 (bắt buộc — các `CHECK constraint` chỉ được MySQL **thực thi** từ bản 8.0.16 trở lên)
- npm (đi kèm Node.js)

## Cài đặt

```bash
# 1. Clone hoặc giải nén source vào thư mục dự án
cd math-exam-system

# 2. Cài dependencies
npm install

# 3. Tạo file cấu hình môi trường
copy .env.example .env        # Windows (CMD)
# cp .env.example .env        # Linux / macOS / Git Bash
```

Mở `.env` và điền ít nhất:

```env
DB_USER=root                  # hoặc user MySQL của bạn
DB_PASSWORD=<mat_khau_mysql>  # mật khẩu MySQL — KHÔNG commit file .env
SESSION_SECRET=<chuoi_bi_mat_dai_va_ngau_nhien>
```

> **Lưu ý bảo mật:** Không ghi mật khẩu MySQL thật vào README, báo cáo hay commit Git. Chỉ cấu hình trong `.env` cục bộ.

## Tạo cơ sở dữ liệu

Chạy **ba lệnh riêng biệt** theo đúng thứ tự (không gộp `reset-schema.sql` với `seed.sql`):

```bash
mysql -u root -p < database/reset-schema.sql
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
```

**Trên Windows PowerShell**, dùng tùy chọn `-e "source ..."` vì toán tử nhập `<` không hoạt động như CMD/Bash:

```powershell
# MySQL cài riêng — chạy từ thư mục gốc dự án
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p -e "source database/reset-schema.sql"
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p -e "source database/schema.sql"
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p -e "source database/seed.sql"

# XAMPP
& "C:\xampp\mysql\bin\mysql.exe" -u root -p -e "source database/reset-schema.sql"
```

Sau khi chạy xong, database `web_kiem_tra_toan` có **15 bảng nghiệp vụ** (gồm `dat_lai_mat_khau`). Khi chạy ứng dụng lần đầu, `express-mysql-session` có thể tạo thêm bảng `sessions` (bảng kỹ thuật, không thuộc ERD nghiệp vụ).

**Cách nhanh — 1 file đủ cấu trúc + dữ liệu hiện tại để nộp/demo:**

```powershell
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p -e "source database/demo-backup.sql"
```

### Nâng cấp DB đã cài trước đây (chỉ khi thiếu)

```powershell
# Bảng quên mật khẩu (nếu schema cũ chưa có)
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p -e "source database/password-reset.sql"

# CHECK tong_diem >= 0 (nếu schema cũ còn tong_diem > 0)
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p -e "source database/fix-exam-tong-diem-draft.sql"
# hoặc: node scripts/apply-exam-tong-diem-fix.js

# Câu đúng/sai 4 mệnh đề (nếu còn dạng 2 lựa chọn cũ)
node scripts/apply-dung-sai-4-statements.js
```

Trong `.env`, thêm cấu hình email (Gmail dùng **App Password**):

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=email_cua_ban@gmail.com
SMTP_PASS=mat_khau_ung_dung_16_ky_tu
MAIL_FROM="Kiem tra Toan <email_cua_ban@gmail.com>"
```

Khi người dùng quên mật khẩu, hệ thống gửi mã xác nhận 6 số qua Gmail. Mã có hiệu lực 10 phút và chỉ dùng được một lần. Nếu chưa cấu hình SMTP:

- **Development / demo:** mã được in ra console máy chủ; người dùng vẫn đặt lại mật khẩu bình thường.
- **Production:** trang báo lỗi cấu hình Gmail (503) — cần điền đủ `SMTP_*` trong `.env`.

## Chạy ứng dụng

```bash
npm run dev
```

Mở trình duyệt tại `http://localhost:3000`.

Script khác:

```bash
npm start    # chạy production (node src/app.js)
npm test     # chạy regression tests tự động
npm run check # quét encoding + render smoke-test các giao diện chính
```

## Tài khoản demo

| Email | Mật khẩu | Vai trò |
|-------|----------|---------|
| `teacher@example.com` | `123456` | Giáo viên |
| `studenta@example.com` | `123456` | Học sinh |
| `studentb@example.com` | `123456` | Học sinh |

**Lưu ý quan trọng:** Đề thi demo trong `seed.sql` được tạo ở trạng thái **`NHAP`** (nháp). Giáo viên cần **công bố đề** qua giao diện web (`NHAP` → `DA_CONG_BO`) trước khi học sinh có thể bắt đầu làm bài. Công bố đề khác với công bố kết quả — hai bước độc lập.

Nếu thiếu tài khoản demo trên DB hiện có:

```bash
npm run demo:accounts
```

### Hồ sơ nộp niên luận

| Thành phần | Đường dẫn |
|------------|-----------|
| Báo cáo PDF | `report/bao-cao.pdf` |
| Ảnh giao diện | `screenshots/` |
| Backup DB | `database/demo-backup.sql` |
| Kết quả kiểm thử | `docs/test-results.md` |
| Checklist | `docs/checklist-final.md` |

Xuất lại / đóng gói:

```bash
npm run demo:backup
npm run demo:pdf
npm run demo:screenshots
npm run package   # tạo dist/JinMath-nien-luan-YYYY-MM-DD.zip (không gồm .env, node_modules)
```

Dữ liệu seed còn bao gồm: lớp `TOAN10A1`, 4 câu hỏi (đủ 4 loại), đề 15 phút tổng 5.00 điểm, phân công cho lớp demo.

## Cấu trúc thư mục

```
math-exam-system/
├── database/              # SQL: reset, schema, seed
├── docs/                  # Tài liệu kỹ thuật (scope, API, test-cases…)
├── diagrams/              # ERD và sơ đồ
├── public/                # CSS, JS, vendor (KaTeX, Chart.js)
│   ├── css/
│   ├── js/                # exam-room.js — logic phòng thi
│   └── vendor/
├── report/                # Dàn ý và báo cáo niên luận
├── screenshots/           # Ảnh chụp màn hình demo
├── uploads/questions/     # Ảnh câu hỏi đã upload
├── src/
│   ├── app.js             # Khởi động Express
│   ├── config/            # Kết nối MySQL
│   ├── controllers/       # Xử lý request
│   ├── middleware/        # Auth, CSRF, rate limit, upload…
│   ├── repositories/      # Truy vấn database
│   ├── routes/            # Route web + API
│   ├── services/          # Nghiệp vụ (attempt, exam, grading…)
│   ├── validators/        # express-validator
│   ├── jobs/              # auto-submit-job.js
│   ├── utils/             # Helper (transaction, shuffle, datetime…)
│   └── views/             # Template EJS (auth, teacher, student)
├── .env.example
├── package.json
└── README.md
```

## Cơ chế autosave, localStorage và version

### Luồng lưu đáp án

1. Học sinh thay đổi đáp án trên giao diện phòng thi.
2. Client tăng `answerVersion` (bắt đầu từ 0, tăng dần mỗi lần sửa).
3. Ghi vào **localStorage** với key `math_exam_user_<userId>_attempt_<attemptId>`, đánh dấu `synced: false`.
4. Gửi `PUT /api/attempts/:attemptId/answers/:questionId` kèm `answerVersion` và `clientRequestId`.
5. Server kiểm tra: lượt đang làm, chưa hết hạn, câu thuộc lượt, version mới hơn DB.
6. Nếu thành công → cập nhật `chi_tiet_bai_lam.answer_version`, đánh dấu `synced: true` trên localStorage.
7. Nếu thất bại (mất mạng) → giữ `pending` trên localStorage.

### Chống ghi đè request cũ

- Mỗi lần lưu, client gửi `answerVersion` tăng dần.
- Server **từ chối ghi đè** nếu `answerVersion` request ≤ bản trong database (trả mã `OLD_ANSWER_VERSION`).
- Client tự động tăng version và gửi lại khi gặp lỗi này.

### Khôi phục khi refresh / mất mạng

- Khi vào phòng thi: tải state từ server (`GET /api/attempts/:attemptId/state`), render câu hỏi và đáp án.
- Đọc localStorage, so sánh version với server.
- Câu `pending` (chưa `synced`) được gửi lại tự động.
- Sự kiện `online` trên trình duyệt cũng kích hoạt đồng bộ lại.
- Thứ tự câu **không đổi** khi refresh (đã đóng băng trong `cau_hoi_luot_lam`).

### Tần suất gửi

| Loại câu | Debounce |
|----------|----------|
| Một đáp án / Đúng-Sai | Gửi ngay |
| Trả lời ngắn | ~600 ms |
| Tự luận | ~1500 ms |

### Xóa localStorage

Chỉ xóa sau khi server xác nhận **nộp bài thành công**.

## Quy tắc thời gian

Thời gian server (`Asia/Ho_Chi_Minh`, `+07:00`) là nguồn chính xác. Đồng hồ phòng thi tính theo `serverTime` (offset), không tin tuyệt đối đồng hồ máy học sinh.

**Hạn nộp gốc** (cột `han_nop`, không đổi sau khi tạo lượt):

```
han_nop = MIN(
  thoi_gian_bat_dau_luot + thoi_luong_de,
  thoi_gian_ket_thuc_de
)
```

**Hạn nộp hiệu lực** (dùng để kiểm tra lưu/nộp):

```
han_nop_hieu_luc = han_nop + thoi_gian_bo_sung_giay
```

- Không lưu đáp án sau `han_nop_hieu_luc`.
- Giây bù (`thoi_gian_bo_sung_giay`) chỉ tăng khi giáo viên **duyệt sự cố**, không cộng trực tiếp vào `han_nop`.
- Tự động nộp: client khi đồng hồ về 0, API kiểm tra quá hạn, và job server quét mỗi 30–60 giây.

## Tài liệu liên quan

| File | Nội dung |
|------|----------|
| `docs/scope.md` | Phạm vi niên luận (đã khóa) |
| `docs/service-rules.md` | Quy tắc nghiệp vụ chi tiết |
| `docs/api.md` | Tài liệu REST API |
| `docs/test-cases.md` | Bộ test case |
| `docs/demo-script.md` | Kịch bản demo 10–15 phút |
| `docs/architecture.md` | Kiến trúc và luồng xử lý |
| `diagrams/erd.md` | ERD 15 bảng nghiệp vụ |

## Giấy phép

Dự án phục vụ mục đích học tập / niên luận.
