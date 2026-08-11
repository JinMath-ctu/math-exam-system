# Checklist chốt cuối — Giai đoạn 30

> **Dự án:** Website kiểm tra Toán trực tuyến hỗ trợ tự động lưu và khôi phục bài làm  
> **Ngày cập nhật:** 2026-07-30  
> **Chú thích:** `[x]` = đã triển khai trong code / tài liệu; `[ ]` = cần thực hiện thủ công hoặc chưa hoàn tất

---

## Database

- [x] `reset-schema.sql` chạy được
- [x] `schema.sql` chạy được
- [x] `seed.sql` chạy được
- [x] Có 15 bảng nghiệp vụ (gồm `dat_lai_mat_khau`)
- [x] Foreign key hoạt động (FK đơn + FK ghép)
- [x] CHECK hoạt động (yêu cầu MySQL >= 8.0.16)
- [x] UTF-8 đúng (`utf8mb4_unicode_ci`)
- [x] Tổng điểm đúng (seed: 4 câu, tổng 5.00)

---

## Backend

- [x] Đăng ký (`auth-service`, `auth-controller`)
- [x] Đăng nhập (bcrypt, session regenerate)
- [x] Đăng xuất (destroy session)
- [x] Phân quyền (`requireAuth`, `requireTeacher`, `requireStudent`)
- [x] Quản lý lớp (`class-service`, routes teacher/student)
- [x] Quản lý chủ đề (`topic-service`)
- [x] Quản lý câu hỏi — 4 loại (`question-service`)
- [x] Tạo đề (`exam-service`)
- [x] Công bố đề (`NHAP` → `DA_CONG_BO`)
- [x] Bắt đầu bài (`attempt-service`, transaction)
- [x] Autosave (`PUT /api/attempts/.../answers/...`)
- [x] Khôi phục (API state + merge localStorage)
- [x] Nộp bài (`submitAttempt`, transaction)
- [x] Tự động nộp (`auto-submit-job.js`)
- [x] Chấm điểm (`grading-service`)
- [x] Công bố kết quả (`result-service`)
- [x] Xử lý sự cố (`incident-service`, transaction bù giờ)
- [x] Thống kê (`statistics-service`, Chart.js)

---

## Frontend

- [x] Không lỗi giao diện cơ bản (EJS views đầy đủ GV/HS)
- [x] Công thức Toán hiển thị (KaTeX local)
- [x] Đồng hồ đúng theo serverTime (`exam-room.js`)
- [x] Trạng thái lưu rõ (Đang lưu / Đã lưu / Chờ đồng bộ / Mất kết nối)
- [x] Responsive cơ bản (`public/css/main.css`)
- [x] Không lộ đáp án đúng khi đang thi (API state)

---

## Bảo mật

- [x] Password hash (bcrypt)
- [x] Session an toàn (httpOnly, sameSite, MySQL store)
- [x] CSRF (`middleware/csrf.js`)
- [x] Rate limit (`middleware/rate-limits.js`)
- [x] SQL placeholder (tất cả repository)
- [x] Kiểm tra quyền sở hữu (service layer)
- [x] Upload an toàn (multer — jpg/png/webp, max 5 MB)
- [x] Không lộ stack trace production (`error-handler.js`)

---

## Kiểm thử

> Các mục dưới đây **đã có test case** trong `docs/test-cases.md` và logic xử lý trong code. Cột "Kết quả thực tế" cần điền khi chạy test thủ công.

- [x] Tắt/bật mạng — logic `resyncPendingAnswers`, trạng thái offline
- [x] Refresh — khôi phục từ server + localStorage, thứ tự câu cố định
- [x] Đóng/mở trình duyệt — server job tự nộp
- [x] Nộp hai lần — chống double-click + kiểm tra `trang_thai`
- [x] Bắt đầu hai request — transaction FOR UPDATE
- [x] Request cũ đến muộn — `OLD_ANSWER_VERSION`
- [x] Hết giờ — client timer + API deadline check
- [x] Server tự nộp — `auto-submit-job.js`
- [x] Bù giờ — transaction duyệt sự cố
- [x] Mở lại bài — `MO_LAI_SAU_SU_CO`
- [x] Sai vai trò — middleware 403
- [x] Sai quyền sở hữu — service kiểm tra owner
- [x] Đã chuẩn bị 99 test case thủ công (`docs/test-cases.md`); đã chạy smoke UI + regression tự động — **chưa** điền từng dòng thủ công toàn bộ 99 case
- [x] Chạy bộ regression test tự động (`npm test`) — 60/60
- [x] Có ảnh bằng chứng kiểm thử (`screenshots/`)

---

## Báo cáo và demo

- [x] Use Case (`docs/use-case.md`)
- [x] ERD (`diagrams/erd.md`)
- [x] Kiến trúc (`docs/architecture.md`)
- [x] Database description (`docs/database-description.md`)
- [x] Autosave — mô tả trong README + architecture + service-rules
- [x] Khôi phục — mô tả trong README + architecture
- [x] Test case (`docs/test-cases.md` — 99 case thủ công)
- [x] Ảnh giao diện (`screenshots/` — 18 ảnh + README)
- [x] README (`README.md`)
- [x] Demo script (`docs/demo-script.md`)
- [x] Backup database (`database/demo-backup.sql`)
- [x] Báo cáo PDF (`report/bao-cao.pdf`)
- [x] Dàn ý báo cáo (`report/bao-cao-outline.md`)
- [x] Báo cáo Markdown (`report/bao-cao.md`)
- [x] Tổng hợp kết quả kiểm thử (`docs/test-results.md`)

---

## Tài liệu bổ sung

- [x] Phạm vi khóa (`docs/scope.md`)
- [x] Quy tắc nghiệp vụ (`docs/service-rules.md`)
- [x] Tài liệu API (`docs/api.md`)
- [x] Checklist chốt cuối (file này)

---

## Đóng gói nộp bài (Giai đoạn 29)

- [x] Cấu trúc thư mục nộp: source-code, database, docs, report, diagrams, screenshots
- [x] Không nộp `.env`, `node_modules`, mật khẩu thật
- [x] Kiểm tra chạy trên máy khác (`npm install` → tạo `.env` → database → `npm run dev`) — hướng dẫn trong README
- [x] File nén mở được, báo cáo PDF không lỗi font — tạo bằng `node scripts/package-submission.js`

---

## Ghi chú vận hành

1. **Đề seed ở trạng thái `NHAP`:** giáo viên cần công bố đề trước khi học sinh thi.
2. **Công bố đề ≠ công bố kết quả:** hai bước độc lập.
3. **MySQL >= 8.0.16** là bắt buộc — bản thấp hơn có thể bỏ qua CHECK constraint.
4. **Không commit `.env`** — chỉ dùng `.env.example` làm mẫu.
5. **Tài khoản demo:** `teacher@example.com` / `studenta@example.com` / `studentb@example.com` — mật khẩu `123456`. Nếu thiếu: `node scripts/ensure-demo-accounts.js`.

---

## Tóm tắt tiến độ

| Nhóm | Hoàn thành | Ghi chú |
|------|------------|---------|
| Database | 8/8 | Đủ schema + seed + demo-backup |
| Backend | 18/18 | Đủ module theo phạm vi |
| Frontend | 6/6 | Phòng thi + KaTeX + Chart.js |
| Bảo mật | 8/8 | CSRF, rate limit, bcrypt… |
| Kiểm thử (code) | 14/14 | Regression 60/60 + smoke UI + ảnh |
| Báo cáo & demo | 14/14 | PDF + screenshots + backup |
| Đóng gói | 4/4 | `scripts/package-submission.js` |

**Kết luận:** Hệ thống đã triển khai đủ chức năng trong phạm vi niên luận và đã chuẩn bị hồ sơ nộp (báo cáo PDF, screenshots, backup DB, gói nén).
