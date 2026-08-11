# 10 sơ đồ tuần tự — khớp `src` hiện tại

> Nguồn: route / controller / service thật trong `math-exam-system/src`.  
> Xem trước: mở `docs/sequence-diagrams-preview.html`.  
> Ảnh SVG/PNG để chèn báo cáo: `docs/diagrams/sequence/`.

| Mã | Luồng | Endpoint chính |
|----|--------|----------------|
| SD-01 | Đăng nhập | `POST /auth/login` |
| SD-02 | Tạo đề → giao lớp → công bố | `POST /teacher/exams/create` → `.../assign` → `.../publish` |
| SD-03 | Bắt đầu bài + đóng băng câu | `POST /api/exams/:examId/classes/:classId/start` |
| SD-04 | Autosave đáp án | `PUT /api/attempts/:attemptId/answers/:questionId` |
| SD-05 | Khôi phục phiên | `GET /api/attempts/:attemptId/state` + sync local |
| SD-06 | Nộp bài + chấm tự động | `POST /api/attempts/:attemptId/submit` |
| SD-07 | Chấm TL → công bố KQ → HS xem | grade → publish-results → results |
| SD-08 | Báo sự cố → duyệt bù giờ | report → approve |
| SD-09 | Tham gia lớp bằng mã | `POST /student/classes/join` |
| SD-10 | Tạo câu hỏi | `POST /teacher/questions` |

---

## SD-01 — Đăng nhập (session)

**File:** `routes/auth.js` → `auth-controller.login` → `auth-service.login` → `session-auth.regenerateWithUser`

```mermaid
sequenceDiagram
    actor User as Người dùng
    participant Browser as Trình duyệt
    participant Ctrl as auth-controller
    participant Svc as auth-service
    participant Sess as session-auth
    participant DB as MySQL

    User->>Browser: Nhập email + mật khẩu
    Browser->>Ctrl: POST /auth/login (CSRF + authLimiter)
    Ctrl->>Svc: login({ email, password })
    Note over Svc: email = trim().toLowerCase()
    Svc->>DB: SELECT nguoi_dung WHERE email = ?
    DB-->>Svc: user / null
    alt Không có user
        Svc-->>Ctrl: UNAUTHORIZED (401)
        Ctrl-->>Browser: Flash lỗi, ở /auth/login
    else trang_thai != HOAT_DONG
        Svc-->>Ctrl: FORBIDDEN (403)
        Ctrl-->>Browser: Flash tài khoản khóa
    else Tài khoản đang hoạt động
        Svc->>Svc: bcrypt.compare(password, mat_khau_hash)
        alt Mật khẩu không khớp
            Svc-->>Ctrl: UNAUTHORIZED (401)
            Ctrl-->>Browser: Flash lỗi, không tiết lộ email tồn tại
        else Mật khẩu khớp
            Svc-->>Ctrl: { sessionUser, redirectTo }
            Ctrl->>Sess: regenerateWithUser(req, sessionUser)
            Sess->>DB: Lưu session (express-mysql-session)
            alt Có returnTo nội bộ hợp lệ
                Ctrl-->>Browser: 302 returnTo
            else vaiTro = GIAO_VIEN
                Ctrl-->>Browser: 302 /teacher/dashboard
            else vaiTro = HOC_SINH
                Ctrl-->>Browser: 302 /student/dashboard
            end
        end
    end
```

---

## SD-02 — Tạo đề → giao lớp → công bố đề

**File:** `routes/teacher/exams.js` → `teacher-exam-controller` → `exam-service`  
(`createExam` / `assignClass` / `publishExam`)

```mermaid
sequenceDiagram
    actor GV as Giáo viên
    participant Browser as Trình duyệt
    participant Ctrl as teacher-exam-controller
    participant Svc as exam-service
    participant DB as MySQL

    Note over GV,DB: Bước 1 — Tạo đề nháp
    GV->>Browser: Form tạo đề (+ tùy chọn chọn câu)
    Browser->>Ctrl: POST /teacher/exams/create (examMetaRules)
    Ctrl->>Svc: createExam(giaoVienId, body)
    Svc->>DB: INSERT de_thi (trang_thai=NHAP, tong_diem=0)
    opt Có cauHoiIds / diemCauHoi_*
        Svc->>DB: INSERT cau_hoi_de_thi
        Svc->>DB: UPDATE de_thi.tong_diem
    end
    Svc-->>Ctrl: examId
    Ctrl-->>Browser: 302 /teacher/exams/:id

    Note over GV,DB: Bước 2 — Giao đề cho lớp
    GV->>Browser: Chọn lớp
    Browser->>Ctrl: POST /teacher/exams/:id/assign
    Ctrl->>Svc: assignClass(examId, giaoVienId, lopHocId)
    Svc->>DB: Kiểm tra de_thi + lop_hoc thuộc GV
    alt Đề DA_HUY
        Svc-->>Ctrl: EXAM_NOT_EDITABLE (422)
    else Đã giao trước đó
        Svc-->>Ctrl: CONFLICT (409)
    else OK
        Svc->>DB: INSERT phan_cong_de
        Ctrl-->>Browser: Flash Đã giao đề
    end

    Note over GV,DB: Bước 3 — Công bố đề
    GV->>Browser: Bấm Công bố đề
    Browser->>Ctrl: POST /teacher/exams/:id/publish
    Ctrl->>Svc: publishExam(examId, giaoVienId)
    Svc->>DB: Kiểm tra NHAP, có câu, có lớp giao, tong_diem, thời gian
    alt Thiếu điều kiện
        Svc-->>Ctrl: VALIDATION_ERROR / EXAM_NOT_EDITABLE
        Ctrl-->>Browser: Flash lỗi
    else OK
        Svc->>DB: UPDATE de_thi SET trang_thai=DA_CONG_BO
        Note over Svc,DB: Khóa sửa cấu trúc đề
        Ctrl-->>Browser: Flash đã công bố
    end
```

---

## SD-03 — Bắt đầu bài + đóng băng câu

**File:** `routes/api/exam-attempts.js` → `attempt-controller.start` → `attempt-service.startAttempt`

```mermaid
sequenceDiagram
    actor HS as Học sinh
    participant Browser as Trình duyệt
    participant Ctrl as attempt-controller
    participant Svc as attempt-service
    participant DB as MySQL

    HS->>Browser: Bấm Bắt đầu làm bài
    Browser->>Ctrl: POST /api/exams/:examId/classes/:classId/start
    Note over Ctrl: requireStudent + startLimiter
    Ctrl->>Svc: startAttempt(examId, classId, hocSinhId)
    Svc->>DB: BEGIN + khóa de_thi / kiểm tra membership
    alt Không thuộc lớp
        Svc-->>Ctrl: NOT_CLASS_MEMBER (403)
    else Đề chưa DA_CONG_BO
        Svc-->>Ctrl: EXAM_NOT_PUBLISHED (422)
    else Ngoài khung giờ / đã đóng
        Svc-->>Ctrl: EXAM_TIME_NOT_OPEN / EXAM_CLOSED
    else Hết số lần làm
        Svc-->>Ctrl: ATTEMPT_LIMIT_REACHED (422)
    else Đã có lượt DANG_LAM
        Svc-->>Ctrl: 200 { attemptId, isNew:false }
    else Tạo lượt mới
        Svc->>Svc: han_nop = MIN(bắt đầu + thời lượng, giờ đóng đề)
        Svc->>DB: INSERT luot_lam_bai (DANG_LAM)
        alt tron_cau_hoi = true
            Svc->>Svc: Fisher–Yates trộn thứ tự
        end
        Svc->>DB: INSERT cau_hoi_luot_lam (đóng băng thứ tự + điểm)
        Svc->>DB: INSERT nhat_ky_thi (BAT_DAU)
        Svc->>DB: COMMIT
        Svc-->>Ctrl: 201 { attemptId, isNew:true }
    end
    Ctrl-->>Browser: JSON / redirect phòng thi
    Browser-->>HS: GET /student/attempts/:attemptId
```

---

## SD-04 — Autosave đáp án (`answer_version`)

**File:** `routes/api/attempts.js` → `attempt-controller.saveAnswer` → `attempt-service.saveAnswer`  
**Client:** `public/js/exam-room.js`

```mermaid
sequenceDiagram
    actor HS as Học sinh
    participant JS as exam-room.js
    participant LS as localStorage
    participant Ctrl as attempt-controller
    participant Svc as attempt-service
    participant DB as MySQL

    HS->>JS: Chọn / nhập đáp án
    JS->>JS: answerVersion++
    JS->>LS: math_exam_user_{uid}_attempt_{attemptId} (synced=false)
    JS->>JS: Debounce + queue theo câu
    JS->>Ctrl: PUT /api/attempts/:attemptId/answers/:questionId
    Note over JS,Ctrl: Body: answerVersion, clientRequestId,<br/>selectedAnswerId / answerText / statementSelections
    Ctrl->>Svc: saveAnswer(...)
    Svc->>DB: BEGIN + FOR UPDATE luot_lam_bai
    alt Không còn DANG_LAM
        Svc-->>Ctrl: ATTEMPT_NOT_IN_PROGRESS (422)
    else Quá han_nop_hieu_luc
        Svc-->>Ctrl: DEADLINE_PASSED (422)
    else answerVersion request nhỏ hơn hoặc bằng DB
        Svc-->>Ctrl: OLD_ANSWER_VERSION (409)
        Ctrl-->>JS: Không ghi đè
    else Cùng clientRequestId + version (idempotent)
        Svc-->>Ctrl: 200 OK (không ghi log mới)
        Ctrl-->>JS: OK
        JS->>LS: synced=true
    else Hợp lệ
        Svc->>DB: UPSERT chi_tiet_bai_lam
        Svc->>DB: INSERT nhat_ky_thi (LUU_DAP_AN)
        Svc->>DB: COMMIT
        Svc-->>Ctrl: saved + answerVersion
        Ctrl-->>JS: 200 OK
        JS->>LS: synced=true
    end
```

---

## SD-05 — Khôi phục phiên (refresh / offline → online)

**Server:** `GET /api/attempts/:attemptId/state` → `attempt-service.getState`  
**Client:** `exam-room.js` (`mergeWithLocalPending` + `resyncPendingAnswers`)

```mermaid
sequenceDiagram
    actor HS as Học sinh
    participant Browser as Trình duyệt
    participant JS as exam-room.js
    participant LS as localStorage
    participant Ctrl as attempt-controller
    participant Svc as attempt-service
    participant DB as MySQL

    HS->>Browser: F5 / mở lại phòng thi
    Browser->>JS: Load /student/attempts/:attemptId
    JS->>Ctrl: GET /api/attempts/:attemptId/state
    Ctrl->>Svc: getState(attemptId, hocSinhId)
    Svc->>DB: Đọc luot_lam_bai + cau_hoi_luot_lam + chi_tiet_bai_lam + dap_an
    Note over Svc,DB: Không tạo lượt mới, không trộn lại câu<br/>Không trả la_dap_an_dung
    Svc-->>Ctrl: state JSON
    Ctrl-->>JS: 200 state
    JS->>JS: Render câu + đáp án từ server
    JS->>LS: Đọc pending
    alt Lượt không còn DANG_LAM
        JS->>LS: discard local
    else Có pending version mới hơn server
        JS->>Ctrl: PUT .../answers/:questionId (từng câu)
        Ctrl->>Svc: saveAnswer (SD-04)
        Svc-->>JS: OK / OLD_ANSWER_VERSION
        JS->>LS: cập nhật synced
    else Không pending
        JS-->>HS: Trạng thái Đã lưu
    end
    Note over Browser,JS: window online → resyncPendingAnswers()
    loop ~30 giây khi DANG_LAM
        JS->>Ctrl: POST /api/attempts/:attemptId/heartbeat
        Ctrl->>Svc: Cập nhật last_seen_at
    end
```

---

## SD-06 — Nộp bài + chấm tự động

**File:** `POST /api/attempts/:attemptId/submit` → `attempt-service.submitAttempt`  
(Job server cũng gọi cùng `submitAttempt` khi quá `han_nop_hieu_luc`)

```mermaid
sequenceDiagram
    actor HS as Học sinh
    participant JS as exam-room.js
    participant Ctrl as attempt-controller
    participant Svc as attempt-service
    participant Job as auto-submit-job
    participant DB as MySQL

    alt Nộp thủ công
        HS->>JS: Bấm Nộp bài
        JS->>JS: Flush debounce, chờ save pending/in-flight
        JS->>Ctrl: POST /api/attempts/:attemptId/submit
        Note over Ctrl: requireStudent + submitLimiter
        Ctrl->>Svc: submitAttempt(..., auto=false)
    else Hết giờ phía client
        JS->>Ctrl: POST .../submit { autoSubmit:true }
        Ctrl->>Svc: submitAttempt(..., auto flag)
    else Job quét quá hạn (mỗi 45 giây)
        Job->>Svc: submitAttempt(..., auto=true, hocSinhId=null)
    end

    Svc->>DB: BEGIN + FOR UPDATE luot_lam_bai
    alt trang_thai != DANG_LAM
        Svc-->>Ctrl: ATTEMPT_SUBMITTED (409)
    else Client auto nhưng chưa tới hạn
        Svc-->>Ctrl: { submitted:false, status:DANG_LAM }
    else Hợp lệ
        Svc->>Svc: Chấm MOT_DAP_AN / DUNG_SAI / TRA_LOI_NGAN
        Svc->>DB: UPDATE chi_tiet_bai_lam (điểm)
        alt Không còn câu TU_LUAN
            Svc->>DB: luot_lam_bai.trang_thai = DA_CHAM
        else Nộp thủ công
            Svc->>DB: trang_thai = DA_NOP
        else Nộp tự động
            Svc->>DB: trang_thai = TU_DONG_NOP
        end
        Svc->>DB: INSERT nhat_ky_thi (NOP_BAI / TU_DONG_NOP)
        Svc->>DB: COMMIT
        Svc-->>Ctrl: OK
        Ctrl-->>JS: success
        JS->>JS: removeItem localStorage
    end
```

---

## SD-07 — Chấm tự luận → công bố kết quả → HS xem điểm

**Grade:** `POST /teacher/attempts/:attemptId/grade` → `grading-service.gradeAttempt`  
**Publish:** `POST /teacher/exams/:id/publish-results` → `exam-service.publishResults`  
**View:** `GET /student/results/:attemptId` → `result-service.getResultDetail`

```mermaid
sequenceDiagram
    actor GV as Giáo viên
    actor HS as Học sinh
    participant Browser as Trình duyệt
    participant GradeCtrl as teacher-attempt-controller
    participant GradeSvc as grading-service
    participant ExamCtrl as teacher-exam-controller
    participant ExamSvc as exam-service
    participant ResultCtrl as student-result-controller
    participant ResultSvc as result-service
    participant DB as MySQL

    Note over GV,DB: 1) Chấm tự luận
    GV->>Browser: Nhập điểm / nhận xét câu TU_LUAN
    Browser->>GradeCtrl: POST /teacher/attempts/:attemptId/grade
    GradeCtrl->>GradeSvc: gradeAttempt(attemptId, giaoVienId, grades)
    GradeSvc->>DB: FOR UPDATE de_thi + luot_lam_bai
    alt Đã công bố KQ / còn sự cố chờ / đang DANG_LAM
        GradeSvc-->>GradeCtrl: CONFLICT / VALIDATION_ERROR
    else OK
        GradeSvc->>DB: UPSERT điểm chi_tiet_bai_lam (TU_LUAN)
        opt Mọi câu tự luận đã chấm
            GradeSvc->>DB: trang_thai = DA_CHAM
        end
        GradeCtrl-->>Browser: Flash đã lưu điểm chấm
    end

    Note over GV,DB: 2) Công bố kết quả
    GV->>Browser: Công bố kết quả (+ tùy chọn cho xem đáp án)
    Browser->>ExamCtrl: POST /teacher/exams/:id/publish-results
    ExamCtrl->>ExamSvc: publishResults(examId, giaoVienId, body)
    ExamSvc->>DB: Kiểm tra lượt + sự cố pending
    alt Chưa đủ điều kiện
        ExamSvc-->>ExamCtrl: VALIDATION_ERROR (blockers)
        ExamCtrl-->>Browser: Flash lý do
    else OK
        ExamSvc->>DB: da_cong_bo_ket_qua=TRUE, thoi_gian_cong_bo_ket_qua=NOW()
        ExamCtrl-->>Browser: Flash đã công bố
    end

    Note over HS,DB: 3) Học sinh xem điểm
    HS->>Browser: Mở kết quả
    Browser->>ResultCtrl: GET /student/results/:attemptId
    ResultCtrl->>ResultSvc: getResultDetail(attemptId, hocSinhId)
    alt Chưa công bố / chưa DA_CHAM
        ResultSvc-->>ResultCtrl: RESULTS_NOT_PUBLISHED (422)
    else OK
        ResultSvc->>DB: Đọc điểm (+ dap_an nếu cho_xem_dap_an)
        ResultCtrl-->>Browser: Trang chi tiết kết quả
    end
```

---

## SD-08 — Báo sự cố → GV duyệt bù giờ

**Report:** `POST /student/attempts/:attemptId/incidents` → `incident-service.reportIncident`  
**Approve:** `POST /teacher/incidents/:id/approve` → `incident-service.approveIncident`

```mermaid
sequenceDiagram
    actor HS as Học sinh
    actor GV as Giáo viên
    participant Browser as Trình duyệt
    participant StuCtrl as student-attempt-controller
    participant TeaCtrl as teacher-incident-controller
    participant Svc as incident-service
    participant DB as MySQL

    Note over HS,DB: 1) Học sinh báo sự cố
    HS->>Browser: Chọn loại + mô tả (không nhập giây bù)
    Browser->>StuCtrl: POST /student/attempts/:attemptId/incidents
    Note over StuCtrl: incidentLimiter + reportIncidentRules
    StuCtrl->>Svc: reportIncident(...)
    Svc->>DB: BEGIN + khóa de_thi → luot_lam_bai
    alt Đã công bố KQ / DA_CHAM / đã có sự cố chờ
        Svc-->>StuCtrl: CONFLICT
    else OK
        Svc->>DB: INSERT su_co_bai_thi (CHO_XAC_NHAN)
        Note over Svc: loai: MAT_DIEN, MAT_MANG, LOI_TRINH_DUYET,...
        StuCtrl-->>Browser: Flash đã gửi
    end

    Note over GV,DB: 2) Giáo viên duyệt + bù giờ
    GV->>Browser: Nhập so_giay_bu_gio (1..7200)
    Browser->>TeaCtrl: POST /teacher/incidents/:id/approve
    TeaCtrl->>Svc: approveIncident(id, giaoVienId, soGiayBuGio)
    Svc->>DB: BEGIN + khóa de_thi → luot_lam_bai → su_co
    alt Đã duyệt trước đó
        Svc-->>TeaCtrl: INCIDENT_ALREADY_REVIEWED (409)
    else OK
        Svc->>DB: Cộng thoi_gian_bo_sung_giay (một lần)
        Svc->>DB: su_co.trang_thai = DA_CHAP_NHAN
        opt Lượt đang DA_NOP / TU_DONG_NOP — mở lại hợp lệ
            Svc->>DB: trang_thai = DANG_LAM (reset điểm tự luận nếu cần)
            Svc->>DB: INSERT nhat_ky_thi (MO_LAI_SAU_SU_CO)
        end
        Svc->>DB: COMMIT
        Note over Svc,DB: han_nop_hieu_luc = han_nop + thoi_gian_bo_sung_giay
        TeaCtrl-->>Browser: Flash đã duyệt
    end
```

---

## SD-09 — Học sinh tham gia lớp bằng mã

**File:** `POST /student/classes/join` → `student-class-controller.join` → `class-service.joinClass`

```mermaid
sequenceDiagram
    actor HS as Học sinh
    participant Browser as Trình duyệt
    participant Ctrl as student-class-controller
    participant Svc as class-service
    participant DB as MySQL

    HS->>Browser: Nhập mã lớp
    Browser->>Ctrl: POST /student/classes/join (joinClassRules)
    Ctrl->>Svc: joinClass(hocSinhId, maLop)
    Svc->>DB: SELECT lop_hoc FOR UPDATE WHERE ma_lop = ?
    alt Không có lớp
        Svc-->>Ctrl: NOT_FOUND — Mã lớp không tồn tại
        Ctrl-->>Browser: Flash lỗi
    else trang_thai = LUU_TRU
        Svc-->>Ctrl: CONFLICT — Lớp đã lưu trữ
        Ctrl-->>Browser: Flash lỗi
    else Đang là thành viên DANG_HOC
        Svc-->>Ctrl: CONFLICT — Đã là thành viên
        Ctrl-->>Browser: Flash lỗi
    else Từng DA_ROI_LOP
        Svc->>DB: UPDATE thanh_vien_lop SET trang_thai=DANG_HOC
        Ctrl-->>Browser: 302 /student/classes
    else Thành viên mới
        Svc->>DB: INSERT thanh_vien_lop (DANG_HOC)
        Ctrl-->>Browser: 302 /student/classes
    end
```

---

## SD-10 — Giáo viên tạo câu hỏi (4 loại)

**File:** `POST /teacher/questions` → `teacher-question-controller.create` → `question-service.createQuestion`  
**Middleware:** `uploadQuestionImage` + `verifyDeferredCsrf` + `createRules`

```mermaid
sequenceDiagram
    actor GV as Giáo viên
    participant Browser as Trình duyệt
    participant Upload as upload middleware
    participant Ctrl as teacher-question-controller
    participant Svc as question-service
    participant DB as MySQL

    GV->>Browser: Chọn loại, lớp (khoi_lop), chủ đề, nội dung (+ ảnh)
    Browser->>Upload: POST /teacher/questions (multipart)
    Upload->>Ctrl: file + body (sau verifyDeferredCsrf)
    Ctrl->>Svc: createQuestion({ giaoVienId, body, file })
    Svc->>Svc: Validate theo loai_cau_hoi
    Note over Svc: MOT_DAP_AN: đúng 1 đáp án đúng<br/>DUNG_SAI: 4 mệnh đề a–d<br/>TRA_LOI_NGAN: bắt buộc dap_an_ngan_chuan<br/>TU_LUAN: không bắt buộc dap_an
    alt Chủ đề không thuộc GV / dữ liệu sai
        Svc->>Svc: Xóa file upload nếu có
        Svc-->>Ctrl: VALIDATION_ERROR
        Ctrl-->>Browser: Flash / form lỗi
    else OK
        Svc->>DB: BEGIN
        Svc->>DB: INSERT cau_hoi (chu_de_id, khoi_lop, muc_do, anh_url...)
        opt MOT_DAP_AN / DUNG_SAI
            Svc->>DB: INSERT dap_an (nhiều dòng)
        end
        Svc->>DB: COMMIT
        Svc-->>Ctrl: questionId
        Ctrl-->>Browser: 302 /teacher/questions/:id
    end
```

---

## Ghi chú độ chính xác

- Mã lỗi và path lấy từ `src/routes/**`, `src/controllers/**`, `src/services/**`, `src/utils/errors.js`.
- SD-02 / SD-07 / SD-08 là **nhiều HTTP request** liên tiếp (đúng cách hệ thống chạy), không gộp giả thành 1 API.
- Client chỉ xuất hiện ở SD-04, SD-05, SD-06 (`public/js/exam-room.js`) vì autosave / restore / nộp phụ thuộc JS + `localStorage`.
