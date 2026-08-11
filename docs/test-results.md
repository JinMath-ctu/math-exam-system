# Kết quả kiểm thử tổng hợp

> **Ngày chạy:** 2026-08-11  
> **Môi trường:** Windows 10, Node.js LTS, MySQL 8.0, `http://localhost:3000`  
> **Dữ liệu:** tài khoản demo seed + lớp `TOAN10A1`  
> **npm audit:** 0 lỗ hổng (prod + dev; `brace-expansion` đã nâng lên 5.0.9)

## 1. Regression tự động

Lệnh: `npm test`

| Kết quả | Chi tiết |
|---------|----------|
| **60/60 PASS** | Bộ test trong `test/` (policy công bố kết quả, CSRF multipart + cleanup upload, guard xóa câu/đề, timer sau bù giờ, chuẩn hóa trả lời ngắn, picker câu hỏi đề thi, returnTo sau đăng nhập…) |

## 2. Smoke UI (có ảnh minh chứng)

Script: `capture-screenshots.js` + `capture-screenshots-student.js` + `capture-screenshots-extra.js`

| # | Màn hình | File | Kết quả |
|---|----------|------|---------|
| 1 | Trang chủ | `screenshots/01-trang-chu.png` | Đạt |
| 2 | Đăng nhập | `screenshots/02-dang-nhap.png` | Đạt |
| 3 | Đăng ký học sinh | `screenshots/03-dang-ky-hoc-sinh.png` | Đạt |
| 4 | Dashboard GV | `screenshots/04-gv-dashboard.png` | Đạt |
| 5 | Lớp học GV | `screenshots/05-gv-lop-hoc.png` | Đạt |
| 6 | Ngân hàng câu hỏi | `screenshots/06-gv-ngan-hang-cau-hoi.png` | Đạt |
| 7 | Tạo câu hỏi | `screenshots/07-gv-tao-cau-hoi.png` | Đạt |
| 8 | Danh sách đề | `screenshots/08-gv-danh-sach-de.png` | Đạt |
| 9 | Chi tiết đề | `screenshots/09-gv-chi-tiet-de.png` | Đạt |
| 10 | Dashboard HS | `screenshots/10-hs-dashboard.png` | Đạt |
| 11 | Lớp học HS | `screenshots/11-hs-lop-hoc.png` | Đạt |
| 12 | Đề thi HS | `screenshots/12-hs-de-thi.png` | Đạt |
| 13 | Sự cố GV | `screenshots/13-gv-su-co.png` | Đạt |
| 14 | Thống kê đề | `screenshots/14-gv-thong-ke.png` | Đạt |
| 15 | Lượt làm GV | `screenshots/15-gv-luot-lam.png` | Đạt |
| 16 | Kết quả HS | `screenshots/16-hs-ket-qua.png` | Đạt |
| 17 | Chi tiết đề HS | `screenshots/17-hs-chi-tiet-de.png` | Đạt |
| 18 | Phòng thi | `screenshots/18-hs-phong-thi.png` | Đạt |

## 3. Ánh xạ nhóm test case thủ công (`docs/test-cases.md`)

| Nhóm | Số case (ước lượng) | Đánh giá | Cơ sở |
|------|---------------------|----------|-------|
| TC-ACC Tài khoản | ~10 | **Đạt (smoke + code)** | Đăng nhập GV/HS demo; đăng ký chỉ HS; chặn GV đăng ký công khai |
| TC-CLS Lớp học | ~12 | **Đạt (smoke)** | GV xem lớp `TOAN10A1`; HS đã tham gia lớp |
| TC-QST Câu hỏi | ~15 | **Đạt (code + smoke)** | Form 4 loại; DUNG_SAI 4 mệnh đề; unit/service rules |
| TC-EXM Đề thi | ~15 | **Đạt (smoke)** | Tạo/xem đề nháp; `tong_diem` nháp = 0 hợp lệ |
| TC-TKN Làm bài | ~20 | **Đạt (code)** | Logic autosave/version/submit trong `attempt-service` + `exam-room.js`; regression timer |
| TC-GRD Chấm & kết quả | ~15 | **Đạt (code)** | Grading DUNG_SAI thang điểm; policy công bố kết quả (npm test) |
| TC-INC Sự cố | ~8 | **Đạt (code)** | `incident-service` + transaction bù giờ |
| TC-SYS Hệ thống | ~4 | **Đạt** | CSRF, rate limit, phân quyền middleware |

> **Ghi chú trung thực:** Bộ 99 case trong `docs/test-cases.md` đã được **chuẩn bị** làm checklist. Kết quả ở bảng trên chủ yếu từ **regression tự động + smoke UI + đối chiếu code**, chưa phải là việc điền đủ cột “Kết quả thực tế” cho từng dòng thủ công. Nên demo lại theo `docs/demo-script.md` khi bảo vệ.

## 4. Tài khoản dùng khi kiểm thử

| Email | Mật khẩu | Vai trò |
|-------|----------|---------|
| `teacher@example.com` | `123456` | Giáo viên |
| `studenta@example.com` | `123456` | Học sinh |
| `studentb@example.com` | `123456` | Học sinh |

Khôi phục nhanh nếu thiếu: `node scripts/ensure-demo-accounts.js`
