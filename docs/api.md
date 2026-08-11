# API và route đã triển khai — V1

Tài liệu này mô tả đúng các endpoint đang tồn tại trong mã nguồn V1. Hệ thống không dùng tiền tố `/api/v1`; JSON API hiện tại có base URL:

```text
http://localhost:3000/api
```

Các màn hình quản lý của giáo viên và học sinh là route web render bằng EJS. JSON API chỉ phục vụ phòng thi và kiểm tra phiên đăng nhập.

## Quy ước chung

- Xác thực bằng session cookie `connect.sid`.
- Các request `POST`, `PUT`, `PATCH`, `DELETE` phải gửi CSRF token.
- Form EJS gửi token qua trường `_csrf`.
- Fetch/JSON gửi token qua header `X-CSRF-Token`.
- JSON request dùng `Content-Type: application/json`.
- Thời gian JSON trả về theo ISO 8601, múi giờ Việt Nam.
- ID phải là số nguyên dương.

Phản hồi JSON thành công:

```json
{
  "success": true,
  "data": {},
  "meta": {
    "serverTime": "2026-08-06T17:00:00+07:00"
  }
}
```

Phản hồi JSON lỗi:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dữ liệu không hợp lệ."
  }
}
```

Một số mã lỗi nghiệp vụ thường gặp: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `EXAM_CLOSED`, `ATTEMPT_SUBMITTED`, `ATTEMPT_NOT_IN_PROGRESS`, `DEADLINE_PASSED`, `OLD_ANSWER_VERSION`, `RESULTS_NOT_PUBLISHED`.

## Health check

### `GET /health`

Endpoint công khai để kiểm tra cả ứng dụng và kết nối database.

- `200`: ứng dụng hoạt động, database kết nối được.
- `503`: database không sẵn sàng.

Ví dụ thành công:

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "database": "connected",
    "uptimeSeconds": 120,
    "version": "1.0.0"
  },
  "meta": {
    "serverTime": "2026-08-06T17:00:00+07:00"
  }
}
```

### `GET /api/health`

Kiểm tra session hiện tại. Endpoint này yêu cầu đăng nhập và trả về `id`, `vaiTro` của người dùng trong session. Đây không phải health check hạ tầng; dùng `/health` cho mục đích đó.

## JSON API phòng thi

Tất cả endpoint trong phần này yêu cầu vai trò `HOC_SINH`.

### Bắt đầu hoặc tiếp tục lượt làm

`POST /api/exams/:examId/classes/:classId/start`

Body:

```json
{}
```

Kết quả chứa `attemptId`, `examId`, `classId`, `lanThu`, `status`, `startedAt`, `effectiveDeadline` và `isNew`.

- `201` khi tạo lượt mới.
- `200` khi double-click hoặc gọi lại và hệ thống trả về lượt `DANG_LAM` hiện có.
- Chỉ được bắt đầu khi tài khoản đang hoạt động, học sinh thuộc lớp, đề đã giao và đang trong thời gian mở.
- Không tạo lượt mới nếu kết quả của đề đã được công bố.

### Lấy tóm tắt lượt làm

`GET /api/attempts/:attemptId`

Chỉ chủ sở hữu lượt làm được truy cập. Kết quả gồm trạng thái, lần làm, thời điểm bắt đầu và hạn nộp hiệu lực.

### Lấy trạng thái phòng thi

`GET /api/attempts/:attemptId/state`

Kết quả gồm:

- Danh sách câu hỏi đã đóng băng theo lượt làm.
- Thứ tự và điểm đã đóng băng.
- Các lựa chọn nhưng không có cờ đáp án đúng.
- Câu trả lời hiện tại và `answerVersion` của từng câu.
- `serverTime` và `effectiveDeadline` để đồng hồ phía client đồng bộ với server.

API này không trả `la_dap_an_dung`, đáp án ngắn chuẩn hoặc lời giải.

### Lưu đáp án

`PUT /api/attempts/:attemptId/answers/:questionId`

Body chung:

```json
{
  "selectedAnswerId": null,
  "answerText": null,
  "statementSelections": {},
  "bookmarked": false,
  "answerVersion": 3,
  "clientRequestId": "cm0example123"
}
```

Trường theo loại câu:

| Loại | Dữ liệu câu trả lời |
|---|---|
| `MOT_DAP_AN` | `selectedAnswerId` |
| `DUNG_SAI` | `statementSelections`, dạng `{ "dapAnId": true/false }` cho 4 mệnh đề |
| `TRA_LOI_NGAN` | `answerText` |
| `TU_LUAN` | `answerText` |

`answerVersion` là số nguyên dương và phải lớn hơn phiên bản đang có trên server. `clientRequestId` giúp một request được gửi lại sau khi mất response trở thành idempotent.

Ví dụ thành công:

```json
{
  "success": true,
  "data": {
    "saved": true,
    "answerVersion": 3,
    "savedAtServer": "2026-08-06T17:03:12+07:00"
  },
  "meta": {
    "serverTime": "2026-08-06T17:03:12+07:00"
  }
}
```

Nếu phiên bản cũ, server trả `409 OLD_ANSWER_VERSION` kèm `details.currentAnswerVersion`. Client chỉ retry state cục bộ thực sự mới hơn; không tăng version để gửi lại payload cũ.

### Heartbeat

`POST /api/attempts/:attemptId/heartbeat`

Body:

```json
{}
```

Server cập nhật `last_seen_at`, trả trạng thái và hạn nộp hiệu lực. Khoảng gián đoạn vượt ngưỡng có thể được ghi thành sự cố tự động.

### Nộp bài

`POST /api/attempts/:attemptId/submit`

Body:

```json
{}
```

Client chờ các autosave đang debounce/pending/in-flight hoàn tất trước khi nộp thủ công. Server khóa lượt làm trong transaction, chấm các câu khách quan và chuyển trạng thái:

- `DA_CHAM` nếu không có câu tự luận.
- `DA_NOP` nếu còn câu tự luận cần giáo viên chấm.

Job hết giờ dùng cùng service và có thể chuyển sang `TU_DONG_NOP` khi còn tự luận. Gọi nộp lần nữa trả `409 ATTEMPT_SUBMITTED` và không chấm hai lần.

## Route web xác thực

| Method | Route | Mục đích |
|---|---|---|
| GET/POST | `/auth/login` | Đăng nhập |
| GET/POST | `/auth/register` | Đăng ký học sinh; payload sửa thành `GIAO_VIEN` bị từ chối |
| GET/POST | `/auth/forgot-password` | Yêu cầu mã đặt lại mật khẩu |
| GET/POST | `/auth/reset-password` | Đặt lại mật khẩu bằng mã 6 số |
| POST | `/auth/logout` | Đăng xuất |

Tài khoản giáo viên chủ hệ thống được tạo khi cài đặt/seed, không được tạo qua trang đăng ký công khai.

## Route web giáo viên

Tất cả route `/teacher/*` yêu cầu vai trò `GIAO_VIEN`.

- Dashboard: `/teacher/dashboard`.
- Lớp và thành viên: `/teacher/classes/*`.
- Chủ đề: `/teacher/topics/*`.
- Ngân hàng câu hỏi: `/teacher/questions/*`.
- Đề thi, giao lớp, công bố đề/kết quả: `/teacher/exams/*`.
- Danh sách lượt làm, xem bài và chấm tự luận: `/teacher/exams/:id/attempts`, `/teacher/attempts/:attemptId/grade`.
- Thống kê: `/teacher/exams/:id/statistics`.
- Duyệt sự cố: `/teacher/incidents/*`.

Các thao tác thay đổi dữ liệu là form POST/PUT/PATCH/DELETE và phải có `_csrf`.

## Route web học sinh

Tất cả route `/student/*` yêu cầu vai trò `HOC_SINH`.

- Dashboard: `/student/dashboard`.
- Tham gia/rời lớp: `/student/classes/*`.
- Danh sách và chi tiết đề: `/student/exams`, `/student/exams/:examId`.
- Phòng thi: `/student/attempts/:attemptId`.
- Báo và xem lịch sử sự cố của lượt làm: `/student/attempts/:attemptId/incidents/new`.
- Kết quả đã công bố: `/student/results`, `/student/results/:attemptId`.

Học sinh chỉ thấy kết quả của lượt `DA_CHAM` sau khi giáo viên công bố. Nếu đề có một lượt đang được mở lại ở trạng thái `DANG_LAM`, kết quả cũ của cùng học sinh được ẩn để tránh lộ đáp án.

## Upload ảnh câu hỏi

Upload là một phần của form tạo/sửa câu hỏi, field `anh`:

- Định dạng: JPG, JPEG, PNG, WEBP.
- Dung lượng tối đa: 5 MB.
- Tối đa một file mỗi request.
- File được đổi sang tên ngẫu nhiên và lưu dưới `uploads/questions/`.

## Chính sách công bố kết quả

Giáo viên chỉ công bố kết quả khi:

1. Đề ở trạng thái `DA_CONG_BO` và đã qua giờ đóng.
2. Không còn lượt `DANG_LAM`.
3. Không còn lượt `DA_NOP` hoặc `TU_DONG_NOP` chưa chấm.
4. Kết quả chưa từng được công bố.

Sau khi công bố, hệ thống chặn tạo lượt mới và chặn duyệt sự cố theo cách bù giờ/mở lại lượt làm.
