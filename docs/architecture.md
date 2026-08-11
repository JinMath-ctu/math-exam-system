# Kiến trúc hệ thống

> Website kiểm tra Toán trực tuyến — hỗ trợ tự động lưu và khôi phục bài làm

## 1. Tổng quan kiến trúc

Hệ thống theo mô hình **3 tầng** (Three-tier): trình duyệt ↔ server Node.js/Express ↔ MySQL.

```
┌─────────────────────────────────────────────────────────────┐
│                     TRÌNH DUYỆT (Client)                     │
│  EJS views │ exam-room.js │ localStorage │ Fetch API │ KaTeX │
└────────────────────────────┬────────────────────────────────┘
                             │ HTTP (session cookie + CSRF)
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                   EXPRESS SERVER (Node.js)                   │
│                                                              │
│  ┌─────────┐   ┌─────────────┐   ┌──────────┐   ┌────────┐ │
│  │ Routes  │ → │ Controllers │ → │ Services │ → │ Repos  │ │
│  └─────────┘   └─────────────┘   └──────────┘   └───┬────┘ │
│         ▲                                            │       │
│  ┌──────┴──────┐  ┌────────────┐  ┌──────────────┐  │       │
│  │ Middleware  │  │ Validators │  │ Jobs         │  │       │
│  │ auth, csrf  │  │            │  │ auto-submit  │  │       │
│  │ rate-limit  │  │            │  │              │  │       │
│  └─────────────┘  └────────────┘  └──────────────┘  │       │
└──────────────────────────────────────────────────────┼───────┘
                                                       │ mysql2 pool
                                                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    MySQL (web_kiem_tra_toan)                 │
│  15 bảng nghiệp vụ + bảng sessions (express-mysql-session)  │
└─────────────────────────────────────────────────────────────┘
```

### Phân tầng chi tiết

| Tầng | Thư mục | Trách nhiệm |
|------|---------|-------------|
| Route | `src/routes/` | Ánh xạ URL → controller; phân nhóm teacher / student / api |
| Controller | `src/controllers/` | Nhận request, gọi service, trả view hoặc JSON |
| Service | `src/services/` | Nghiệp vụ: kiểm tra quyền, transaction, quy tắc thời gian |
| Repository | `src/repositories/` | SQL với placeholder, không chứa logic nghiệp vụ |
| Middleware | `src/middleware/` | Auth, CSRF, rate limit, upload, flash, error handler |
| Job | `src/jobs/` | Quét lượt quá hạn và tự động nộp bài |

### Hai kênh giao tiếp

1. **Server-rendered (EJS):** form đăng nhập, quản lý lớp/câu hỏi/đề, chấm bài, thống kê.
2. **REST API (JSON):** phòng thi — bắt đầu lượt, lấy state, lưu đáp án, heartbeat, nộp bài.

---

## 2. Luồng đăng nhập

```mermaid
sequenceDiagram
    actor User as Người dùng
    participant Browser as Trình duyệt
    participant Auth as auth-controller
    participant Svc as auth-service
    participant DB as MySQL

    User->>Browser: Nhập email + mật khẩu
    Browser->>Auth: POST /auth/login
    Auth->>Svc: login(email, password)
    Svc->>DB: SELECT nguoi_dung WHERE email = ?
    DB-->>Svc: user row
    Svc->>Svc: bcrypt.compare(password, hash)
    alt Sai mật khẩu / tài khoản khóa
        Svc-->>Auth: UNAUTHORIZED / FORBIDDEN
        Auth-->>Browser: Flash lỗi
    else Thành công
        Svc-->>Auth: user info
        Auth->>Auth: session.regenerate()
        Auth->>Auth: session.user = { id, hoTen, email, vaiTro }
        Auth-->>Browser: Redirect dashboard
        alt GIAO_VIEN
            Browser->>Browser: /teacher/dashboard
        else HOC_SINH
            Browser->>Browser: /student/dashboard
        end
    end
```

**Điểm quan trọng:**
- Email được chuẩn hóa `trim().toLowerCase()` trước khi tra cứu.
- Session lưu trong MySQL qua `express-mysql-session`.
- Cookie: `httpOnly`, `sameSite: lax`, `secure` khi production.

---

## 3. Luồng giáo viên tạo và công bố đề

```mermaid
flowchart TD
    A[Đăng nhập GV] --> B[Tạo đề NHAP]
    B --> C[Thêm câu hỏi + đặt điểm]
    C --> D[Đồng bộ tong_diem]
    D --> E[Giao đề cho lớp]
    E --> F{Công bố đề?}
    F -->|Kiểm tra: có câu, tổng điểm đúng, có lớp| G[trang_thai = DA_CONG_BO]
    F -->|Thiếu điều kiện| H[Báo lỗi]
    G --> I[Khóa sửa cấu trúc đề]
    I --> J[HS có thể bắt đầu làm bài]
```

**Quy tắc:**
- Chỉ sửa cấu trúc đề khi `trang_thai = NHAP`.
- Sau `DA_CONG_BO`: không thêm/xóa/đổi câu, điểm, thời lượng.
- Công bố đề ≠ công bố kết quả (hai bước độc lập).

---

## 4. Luồng học sinh bắt đầu bài

```mermaid
sequenceDiagram
    actor HS as Học sinh
    participant API as exam-attempts API
    participant Svc as attempt-service
    participant DB as MySQL

    HS->>API: POST /api/exams/:examId/classes/:classId/start
    API->>Svc: startAttempt(examId, classId, studentId)
    Svc->>DB: START TRANSACTION
    Svc->>DB: SELECT ... FOR UPDATE (chống double-click)
    Note over Svc: Kiểm tra: thuộc lớp, đề DA_CONG_BO,<br/>trong thời gian mở, chưa vượt số lần,<br/>không có lượt DANG_LAM
    Svc->>Svc: Tính han_nop = MIN(bat_dau + thoi_luong, ket_thuc_de)
    Svc->>DB: INSERT luot_lam_bai
    Svc->>Svc: Fisher-Yates trộn câu (nếu tron_cau_hoi)
    Svc->>DB: INSERT cau_hoi_luot_lam (đóng băng thứ tự + điểm)
    Svc->>DB: INSERT nhat_ky_thi (BAT_DAU)
    Svc->>DB: COMMIT
    Svc-->>API: attemptId
    API-->>HS: Redirect /student/attempts/:attemptId
```

**Điểm quan trọng:**
- Thứ tự câu và điểm được **đóng băng** tại `cau_hoi_luot_lam`.
- Hai request đồng thời: một thành công, request còn lại trả về lượt vừa tạo.

---

## 5. Luồng autosave (lưu đáp án online)

```mermaid
sequenceDiagram
    actor HS as Học sinh
    participant JS as exam-room.js
    participant LS as localStorage
    participant API as attempts API
    participant Svc as attempt-service
    participant DB as MySQL

    HS->>JS: Chọn / nhập đáp án
    JS->>JS: answerVersion++
    JS->>LS: Lưu pending (synced: false)
    JS->>JS: Xếp vào queue tuần tự theo từng câu
    JS->>API: PUT .../answers/:questionId
    API->>Svc: saveAnswer(payload)
    Svc->>DB: START TRANSACTION + khóa lượt làm FOR UPDATE
    Svc->>DB: Đọc answer_version hiện tại
    alt answerVersion request <= DB version
        alt Cùng clientRequestId và cùng version
            Svc-->>API: OK idempotent
        else Request cũ
            Svc-->>API: OLD_ANSWER_VERSION
            API-->>JS: Chỉ retry nếu local state thực sự mới hơn
        end
    else Quá hạn (han_nop_hieu_luc)
        Svc-->>API: DEADLINE_PASSED
    else Hợp lệ
        Svc->>DB: UPSERT + đọc xác minh state đã ghi
        Svc->>DB: INSERT nhat_ky_thi (LUU_DAP_AN)
        Svc-->>API: saved + answerVersion
        API-->>JS: OK
        JS->>LS: synced: true
    end
```

**Tần suất debounce:** trắc nghiệm gửi ngay; trả lời ngắn ~600 ms; tự luận ~1500 ms.

Backend không dựa vào `affectedRows` để nhận biết request cũ, vì MySQL có thể bật `CLIENT_FOUND_ROWS` và trả số dòng khớp ngay cả khi UPDATE không đổi dữ liệu.

---

## 6. Luồng khôi phục (refresh / mất mạng)

```mermaid
flowchart TD
    A[Tải phòng thi / Refresh] --> B[GET /api/attempts/:id/state]
    B --> C[Render câu hỏi + đáp án từ server]
    C --> D[Đọc localStorage]
    D --> E{Có pending chưa synced?}
    E -->|Có| F[Gửi lại PUT answers]
    E -->|Không| G[Hiển thị trạng thái Đã lưu]
    F --> H{Thành công?}
    H -->|Có| I[Đánh dấu synced]
    H -->|Không| J[Giữ pending — Chờ đồng bộ / Mất kết nối]
    K[Sự kiện online trên browser] --> F
    L[Heartbeat 30 giây] --> M[Cập nhật last_seen_at]
    M --> N{Gián đoạn lớn?}
    N -->|Có| O[Ghi MAT_KET_NOI / KHOI_PHUC<br/>Có thể tạo su_co tự động]
```

**Nguyên tắc:**
- Thứ tự câu **không đổi** sau refresh (đọc từ `cau_hoi_luot_lam`).
- localStorage key: `math_exam_user_<userId>_attempt_<attemptId>`.
- Chỉ xóa localStorage sau nộp bài thành công.

---

## 7. Luồng nộp bài

```mermaid
sequenceDiagram
    participant Client as exam-room.js
    participant API as attempts API
    participant Svc as attempt-service
    participant Job as auto-submit-job
    participant DB as MySQL

    Note over Client: Ba tầng tự động nộp
    Client->>Client: Đồng hồ về 0 → submitAttempt(true)
    Client->>Client: Flush debounce và chờ pending/in-flight save
    Client->>API: POST .../submit
    API->>Svc: submitAttempt()
    Svc->>DB: START TRANSACTION + SELECT FOR UPDATE
    alt trang_thai != DANG_LAM
        Svc-->>API: ATTEMPT_SUBMITTED (409)
    else Hợp lệ
        Svc->>Svc: Chấm tự động (trắc nghiệm + trả lời ngắn)
        Svc->>DB: Cập nhật điểm + trang_thai (DA_NOP / TU_DONG_NOP)
        Svc->>DB: Ghi nhat_ky_thi (NOP_BAI / TU_DONG_NOP)
        Svc->>DB: COMMIT
        Svc-->>API: OK
        API-->>Client: success
        Client->>Client: clearLocalStorage()
    end
    Job->>Svc: Quét lượt DANG_LAM quá han_nop_hieu_luc (30-60s)
    Job->>Svc: submitAttempt() — cùng logic
```

**Chống nộp hai lần:** chỉ cập nhật khi `trang_thai = DANG_LAM`, kiểm tra `affectedRows`.

Nộp thủ công bị chặn nếu còn đáp án chưa lưu; auto-submit vẫn gửi lệnh nộp khi hết giờ. Save và submit cùng khóa dòng lượt làm trước nên server không chấm một snapshot nằm giữa lần lưu.

---

## 8. Luồng xử lý sự cố và bù giờ

```mermaid
sequenceDiagram
    actor HS as Học sinh
    actor GV as Giáo viên
    participant Svc as incident-service
    participant DB as MySQL

    HS->>Svc: POST báo sự cố (loai_su_co, mo_ta)
    Svc->>DB: INSERT su_co_bai_thi (CHO_XAC_NHAN)
    Note over Svc: HS không tự nhập số giây bù

    alt Giáo viên duyệt
        GV->>Svc: POST approve (so_giay_bu_gio)
        Svc->>DB: START TRANSACTION
        Svc->>DB: Khóa su_co + luot_lam_bai
        Svc->>DB: Cộng thoi_gian_bo_sung_giay (một lần)
        Svc->>DB: trang_thai = DA_CHAP_NHAN
        alt Bài đã nộp do hết giờ — mở lại hợp lệ
            Svc->>DB: Mở lại lượt (DANG_LAM)
            Svc->>DB: Ghi MO_LAI_SAU_SU_CO
        end
        Svc->>DB: COMMIT
    else Giáo viên từ chối
        GV->>Svc: POST reject (ly_do)
        Svc->>DB: trang_thai = TU_CHOI
    end
```

**Công thức hạn sau bù giờ:**

```
han_nop_hieu_luc = han_nop + thoi_gian_bo_sung_giay
```

`han_nop` gốc **không đổi**; giây bù cộng vào cột riêng.

---

## 9. Luồng chấm điểm và công bố kết quả

```mermaid
flowchart LR
    A[Nộp bài] --> B{Đề có tự luận?}
    B -->|Không| C[Chấm tự động xong → DA_CHAM]
    B -->|Có| D[DA_NOP / TU_DONG_NOP]
    D --> E[GV chấm từng câu TU_LUAN]
    E --> F{Tất cả tự luận đã chấm?}
    F -->|Có| G[DA_CHAM]
    G --> H{Đã qua giờ đóng và<br/>mọi lượt đều DA_CHAM?}
    H -->|Có| I[GV công bố kết quả]
    I --> J[da_cong_bo_ket_qua = TRUE]
    J --> K[HS xem điểm + đáp án nếu cho_xem_dap_an]
```

---

## 10. Bảo mật trong kiến trúc

| Cơ chế | Vị trí |
|--------|--------|
| bcrypt hash mật khẩu | `auth-service` |
| Session MySQL store | `app.js` + `express-mysql-session` |
| CSRF token | `middleware/csrf.js` — form EJS + header Fetch |
| Rate limit | `middleware/rate-limits.js` — login, register, start, submit, incident |
| SQL placeholder | Tất cả repository dùng `pool.execute(?, [...])` |
| Helmet + CSP | `app.js` — KaTeX/Chart.js serve cục bộ |
| Kiểm tra sở hữu | Service layer — GV chỉ thao tác dữ liệu của mình |
| Không lộ đáp án đúng | API state phòng thi không trả `la_dap_an_dung` |

---

## 11. Tài liệu tham chiếu

- Quy tắc nghiệp vụ chi tiết: `docs/service-rules.md`
- Mô tả 15 bảng: `docs/database-description.md`
- ERD: `diagrams/erd.md`
- API: `docs/api.md`
