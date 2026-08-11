# Kịch bản demo — Hệ thống kiểm tra Toán trực tuyến

> **Thời lượng:** 10–15 phút  
> **Đối tượng:** Hội đồng / giảng viên hướng dẫn  
> **Mục tiêu:** Trình diễn đủ luồng giáo viên → học sinh → chấm điểm → thống kê, nhấn mạnh **tự động lưu và khôi phục bài làm**

---

## Chuẩn bị trước demo (5 phút — không trình diễn)

| Hạng mục | Chi tiết |
|----------|----------|
| Server | `npm start` hoặc `nodemon` — chạy tại `http://localhost:3000` |
| Database | Đã chạy `reset-schema.sql` → `schema.sql` → `password-reset.sql` → `seed.sql` |
| Trình duyệt | 2 cửa sổ/profile: **Cửa sổ A** (GV), **Cửa sổ B** (HS) |
| Tài khoản | GV: `teacher@example.com` / `123456` — HS: `studenta@example.com` / `123456` |
| DevTools | Cửa sổ B mở sẵn tab Network (để demo offline sau) |
| Ghi chú | Seed tạo đề **NHAP** — demo sẽ **công bố đề** qua giao diện |

Để có thể trình diễn luôn bước công bố kết quả (V1 chỉ cho công bố sau giờ đóng đề), hãy chạy câu lệnh sau **ngay trước khi bắt đầu demo** rồi giữ tổng thời lượng đúng kịch bản:

```sql
UPDATE de_thi
SET thoi_gian_bat_dau = DATE_SUB(NOW(), INTERVAL 1 MINUTE),
    thoi_gian_ket_thuc = DATE_ADD(NOW(), INTERVAL 10 MINUTE)
WHERE ten_de = 'Kiểm tra 15 phút - Phương trình bậc hai'
  AND trang_thai = 'NHAP';
```

**Dữ liệu seed sẵn có:**
- Lớp `Toán 10A1`, mã `TOAN10A1`
- HS A, B đã trong lớp
- 4 câu hỏi (đủ 4 loại), đề 15 phút / 5 điểm (chưa công bố)

---

## Tóm tắt timeline

| Phút | Nội dung | Người demo |
|------|----------|------------|
| 0:00–1:30 | Giới thiệu + đăng nhập GV | GV |
| 1:30–4:00 | Lớp, câu hỏi, đề, giao & công bố | GV |
| 4:00–9:00 | HS làm bài, offline, refresh, nộp | HS |
| 9:00–12:00 | GV chấm, công bố kết quả, thống kê | GV |
| 12:00–14:00 | HS xem kết quả + kết luận | HS |

---

## Phần 1 — Mở đầu (≈ 1,5 phút)

**Người nói:** Giảng viên / sinh viên thực hiện

> "Xin chào thầy/cô. Em xin demo **website kiểm tra Toán trực tuyến** — hệ thống hỗ trợ giáo viên ra đề, giao bài và chấm điểm; học sinh làm bài online với **tự động lưu đáp án** và **khôi phục khi mất mạng hoặc tải lại trang**.
>
> Hệ thống có bốn loại câu: một đáp án, đúng/sai, trả lời ngắn và tự luận. Câu khách quan chấm tự động; tự luận do giáo viên chấm thủ công."

**Thao tác:**
1. Mở trang chủ hệ thống.
2. **Cửa sổ A** → Đăng nhập `teacher@example.com`.

**Nói thêm (15 giây):**
> "Phía giáo viên quản lý lớp, ngân hàng câu hỏi, đề thi và xử lý sự cố. Phía học sinh tham gia lớp bằng mã, làm bài trong phòng thi có đồng hồ đếm theo giờ server."

---

## Phần 2 — Giáo viên: Lớp → Câu hỏi → Đề → Giao → Công bố (≈ 2,5 phút)

### 2.1 Quản lý lớp (30 giây)

**Thao tác:**
1. Vào **Quản lý lớp** → mở lớp `Toán 10A1`.
2. Chỉ vào **Mã lớp: TOAN10A1** và danh sách 2 học sinh demo.

**Lời thoại:**
> "Giáo viên tạo lớp với mã duy nhất. Học sinh tham gia bằng mã này. Ở đây lớp và thành viên đã có sẵn từ seed để tiết kiệm thời gian demo."

*(Tùy chọn nhanh — 20 giây)* Tạo lớp phụ `Toán 10A2` / mã `DEMO102` để chứng minh CRUD, rồi quay lại lớp chính.

---

### 2.2 Ngân hàng câu hỏi (45 giây)

**Thao tác:**
1. Vào **Ngân hàng câu hỏi** → chủ đề *Phương trình bậc hai*.
2. Mở preview 1 câu **MOT_DAP_AN** (có KaTeX: `$x^2 - 5x + 6 = 0$`).
3. Lướt qua 4 loại câu.

**Lời thoại:**
> "Mỗi câu thuộc chủ đề, có mức độ và hỗ trợ công thức Toán bằng KaTeX. Câu đã dùng trong đề công bố không sửa trực tiếp — hệ thống yêu cầu sao chép bản mới."

*(Tùy chọn — 30 giây)* Tạo nhanh 1 câu TRA_LOI_NGAN mới → Lưu → quay lại danh sách.

---

### 2.3 Đề thi: kiểm tra & công bố (1 phút)

**Thao tác:**
1. Vào **Quản lý đề thi** → mở *Kiểm tra 15 phút - Phương trình bậc hai*.
2. Chỉ **4 câu / 5 điểm / 15 phút / trộn câu bật**.
3. Tab **Lớp được giao** → xác nhận `Toán 10A1`.
4. Bấm **Công bố đề** → xác nhận trạng thái `Đã công bố`.

**Lời thoại:**
> "Đề ban đầu ở trạng thái nháp. Giáo viên thêm câu, đặt điểm, giao lớp rồi công bố. Sau công bố, cấu trúc đề bị khóa — không thêm/xóa câu để đảm bảo công bằng cho học sinh đã bắt đầu làm."

---

## Phần 3 — Học sinh: Tham gia → Làm bài → Offline → Refresh → Nộp (≈ 5 phút)

> **Chuyển sang Cửa sổ B**

### 3.1 Đăng nhập & vào đề (45 giây)

**Thao tác:**
1. Đăng nhập `studenta@example.com`.
2. Dashboard → thấy lớp `Toán 10A1`.
3. Vào **Bài kiểm tra được giao** → chọn đề vừa công bố.
4. Đọc thông tin: thời lượng, hạn làm bài → **Bắt đầu làm bài**.

**Lời thoại:**
> "Học sinh chỉ thấy đề đã giao cho lớp mình và đã được giáo viên công bố. Khi bắt đầu, hệ thống tạo lượt làm và **đóng băng thứ tự câu** — nếu bật trộn câu thì mỗi học sinh có thứ tự riêng nhưng **refresh không trộn lại**."

---

### 3.2 Làm bài & autosave (1,5 phút)

**Thao tác:**
1. **Câu 1 — MOT_DAP_AN:** Chọn `x = 2 hoặc x = 3`.
2. **Câu 2 — DUNG_SAI:** Chọn đủ 4 mệnh đề lần lượt `Đúng`, `Đúng`, `Sai`, `Sai`.
3. **Câu 3 — TRA_LOI_NGAN:** Nhập `5`.
4. **Câu 4 — TU_LUAN:** Nhập lời giải ngắn (ví dụ: "Δ=1, x=2 hoặc x=3").
5. Đánh dấu **cần xem lại** ở câu 3.
6. Chỉ indicator **"Đã lưu"** / thời gian lưu gần nhất (hoặc Network tab: PUT answer).

**Lời thoại:**
> "Mỗi lần chọn đáp án, client tự động lưu lên server sau vài giây — debounce — đồng thời ghi **localStorage** làm bản dự phòng. Hệ thống dùng **answer version** để request cũ không ghi đè request mới."

---

### 3.3 Demo offline → online (1,5 phút) ⭐ Điểm nhấn

**Thao tác:**
1. Mở DevTools → **Network → Offline**.
2. Sửa câu 3 thành `6` (cố ý sai) hoặc thêm nội dung câu 4.
3. Quan sát UI chuyển sang **"Mất kết nối"**; dữ liệu vẫn còn trong localStorage.
4. Bật lại **Online**.
5. Chờ vài giây → indicator trở về **"Đã lưu"**.

**Lời thoại:**
> "Khi mất mạng, đáp án vẫn lưu trên trình duyệt. Có mạng lại, client đồng bộ theo thứ tự version — đúng với mục tiêu chính của đề tài: **không mất bài khi mất kết nối**."

---

### 3.4 Demo refresh trang (1 phút) ⭐ Điểm nhấn

**Thao tác:**
1. Ghi nhớ **thứ tự câu hiện tại** (ví dụ câu 2 đang ở vị trí số 3).
2. Nhấn **F5** (refresh).
3. Kiểm tra: thứ tự câu giữ nguyên; 4 đáp án đã chọn/nhập còn đó; bookmark câu 3 còn.

**Lời thoại:**
> "Tải lại trang không tạo lượt mới và không trộn lại câu. Server trả trạng thái lượt làm đầy đủ — đây là cơ chế khôi phục phiên làm bài."

---

### 3.5 Báo sự cố, bù giờ & nộp bài (≈ 1 phút)

**Thao tác:**
1. *(Tùy chọn)* Bấm **Báo sự cố** → chọn `Mất mạng` → gửi.
2. Chuyển nhanh sang cửa sổ GV → **Sự cố** → duyệt và bù `120` giây khi lượt vẫn đang làm.
3. Quay lại cửa sổ HS, heartbeat cập nhật hạn nộp mới.
4. Bấm **Nộp bài** → xác nhận.
5. Trang chi tiết đề hiển thị lượt đã nộp; kết quả vẫn chưa xuất hiện.

**Lời thoại:**
> "Giây bù chỉ do giáo viên duyệt và được cộng trong transaction. Khi nộp, client chờ toàn bộ autosave hoàn tất; câu khách quan được chấm ngay, câu tự luận chờ giáo viên. Học sinh **chưa** thấy điểm cho đến khi giáo viên công bố kết quả."

---

## Phần 4 — Giáo viên: Chấm → Công bố kết quả → Thống kê (≈ 3 phút)

> **Quay lại Cửa sổ A**

### 4.1 Xem bài làm & chấm tự luận (1,5 phút)

**Thao tác:**
1. Vào đề → tab **Lượt làm bài** → mở bài HS A.
2. Xem điểm tự động 3 câu khách quan (kỳ vọng ~3/3 nếu làm đúng câu 1–3).
3. Câu tự luận → nhập điểm `1.5/2` + nhận xét ngắn.
4. Bấm **Lưu điểm chấm**; khi mọi câu tự luận đã có điểm, lượt chuyển sang `DA_CHAM`.

**Lời thoại:**
> "Giáo viên xem chi tiết từng câu. Ba loại khách quan đã có điểm tự động. Tự luận chấm trong khoảng 0 đến điểm tối đa của câu — điểm này đã đóng băng khi học sinh bắt đầu làm."

---

### 4.2 Nhắc lại xử lý sự cố (15 giây — nếu đã demo ở 3.5)

**Thao tác:**
1. Mở lại lịch sử sự cố vừa duyệt.
2. Chỉ trạng thái `Đã duyệt` và số giây bù.

**Lời thoại:**
> "Học sinh không tự nhập giây bù. Giáo viên duyệt trong transaction — tránh cộng giờ hai lần. Hạn nộp hiệu lực = hạn gốc + tổng giây được bù."

> Không duyệt bù giờ sau khi học sinh đã nộp trong luồng demo này, vì thao tác đó có thể mở lại lượt làm. Sau khi công bố kết quả, V1 chặn hoàn toàn việc bù giờ/mở lại để tránh lộ đáp án.

*(Nếu không demo sự cố: bỏ qua.)*

---

### 4.3 Công bố kết quả (45 giây)

**Thao tác:**
1. Vào đề → **Công bố kết quả**.
2. Xác nhận đề đã qua giờ đóng và không còn lượt đang làm/chưa chấm.
3. Bấm công bố; cấu hình seed đang bật `Cho xem đáp án`.

**Lời thoại:**
> "Công bố kết quả khác công bố đề. Hệ thống chỉ cho phép thao tác sau giờ đóng đề, khi không còn lượt đang làm và mọi bài đã chấm xong. Chỉ sau bước này học sinh mới xem được điểm chính thức."

---

### 4.4 Thống kê (45 giây)

**Thao tác:**
1. Mở **Thống kê đề** → biểu đồ phân bố điểm (Chart.js).
2. Chỉ tỷ lệ đúng câu 1, điểm trung bình (1 lượt demo).

**Lời thoại:**
> "Giáo viên có thống kê cơ bản: số lượt nộp, điểm trung bình, phân bố điểm và tỷ lệ đúng theo từng câu — hỗ trợ đánh giá chất lượng đề."

---

## Phần 5 — Học sinh xem kết quả & Kết luận (≈ 2 phút)

> **Cửa sổ B** — refresh trang kết quả hoặc vào **Kết quả bài thi**

### 5.1 Xem điểm (1 phút)

**Thao tác:**
1. Mở kết quả đề vừa thi.
2. Hiển thị: **Tổng điểm** (~4.5/5), điểm từng câu.
3. Vì `choXemDapAn = true` → mở lời giải câu 1.

**Lời thoại:**
> "Trước khi giáo viên công bố, học sinh không xem được điểm. Sau công bố, xem tổng và chi tiết. Nếu giáo viên bật xem đáp án, học sinh đối chiếu lời giải."

---

### 5.2 Kết luận (1 phút)

**Lời thoại kết:**

> "Tóm lại, hệ thống đáp ứng các mục tiêu chính:
>
> 1. **Website kiểm tra Toán** cho giáo viên và học sinh với bốn loại câu hỏi.
> 2. **Tự động lưu** online và localStorage, **đồng bộ** khi có mạng.
> 3. **Khôi phục bài** khi refresh mà không đổi thứ tự câu.
> 4. **Chấm tự động** câu khách quan; **chấm tự luận** và **công bố kết quả** có kiểm soát.
> 5. **Xử lý sự cố** và bù giờ an toàn bằng transaction.
>
> Công nghệ: Node.js, Express, MySQL, EJS, KaTeX, Chart.js. Em xin cảm ơn thầy/cô."

---

## Plan B — Xử lý sự cố khi demo

| Tình huống | Cách xử lý nhanh |
|------------|------------------|
| Server không chạy | Chạy sẵn trước; có screenshot/video dự phòng 2 phút |
| Quên công bố đề | GV công bố ngay — HS refresh danh sách đề |
| Autosave không hiện | Mở Network tab, chỉ request PUT `/answers` |
| Offline không sync | F5 sau khi online; giải thích queue client |
| Hết giờ đề seed | `UPDATE de_thi SET thoi_gian_ket_thuc = DATE_ADD(NOW(), INTERVAL 1 DAY)` |
| KaTeX không render | Kiểm tra asset trong `public/vendor/katex`; đọc câu hỏi dạng text vẫn demo được luồng chính |

---

## Checklist trước khi lên sóng

- [ ] MySQL chạy, seed OK
- [ ] Server `localhost:3000` phản hồi `/health` với `database=connected`
- [ ] Đăng nhập được cả GV và HS
- [ ] Đề đã công bố (`DA_CONG_BO`) trước khi HS bắt đầu
- [ ] DevTools Offline test thử 1 lần
- [ ] Refresh test thử 1 lần
- [ ] Thời lượng tổng ≤ 15 phút (t practice 1 lượt đầy đủ)

---

## Phụ lục — Mapping demo ↔ tài liệu

| Đoạn demo | API / Use case | Test case tham chiếu |
|-----------|----------------|----------------------|
| Công bố đề | POST `/teacher/exams/:id/publish` | TC-EXM-05 |
| Bắt đầu làm | POST `/api/exams/:examId/classes/:classId/start` | TC-TAK-01 |
| Autosave | PUT `/api/attempts/:id/answers/:questionId` | TC-TAK-08 |
| Offline sync | localStorage + PUT khi online | TC-TAK-20 |
| Refresh | GET `/api/attempts/:id/state` | TC-TAK-12 |
| Nộp bài | POST `/api/attempts/:id/submit` | TC-TAK-16 |
| Chấm tự luận | POST `/teacher/attempts/:id/grade` | TC-GRD-06 |
| Công bố KQ | POST `/teacher/exams/:id/publish-results` | TC-GRD-10 |
| Xem kết quả | GET `/student/results/:id` | TC-GRD-12 |
| Báo/duyệt sự cố | POST các route `/student/.../incidents` và `/teacher/incidents/...` | TC-INC-01, 03 |
