# Bài thuyết trình bảo vệ niên luận

> **Đề tài:** Xây dựng website kiểm tra Toán trực tuyến hỗ trợ tự động lưu và khôi phục bài làm  
> **Thời lượng đề xuất:** 12–15 phút, gồm 7–8 phút trình bày và 5–7 phút demo  
> **Cách dùng:** Nội dung trong phần “Lời thuyết trình” có thể nói trực tiếp. Thay các vị trí `[Họ tên]`, `[MSSV]`, `[Giảng viên hướng dẫn]` trước khi trình bày.

---

## 1. Phân bổ thời gian

| Phần | Nội dung | Thời lượng |
|---|---|---:|
| 1 | Chào hỏi, giới thiệu đề tài | 40 giây |
| 2 | Lý do chọn đề tài, bài toán cần giải quyết | 1 phút |
| 3 | Mục tiêu, đối tượng và phạm vi | 1 phút |
| 4 | Phân tích chức năng | 1 phút |
| 5 | Kiến trúc và cơ sở dữ liệu | 1 phút 30 giây |
| 6 | Giải pháp autosave và khôi phục | 2 phút |
| 7 | Kiểm thử, kết quả và đánh giá | 1 phút |
| 8 | Demo luồng chính | 5–7 phút |
| 9 | Kết luận, hạn chế và hướng phát triển | 1 phút |

---

## 2. Lời thuyết trình theo từng slide

### Slide 1 — Trang bìa

**Nội dung trên slide**

- Tên đề tài
- Họ tên, MSSV
- Giảng viên hướng dẫn
- Đơn vị, năm học

**Lời thuyết trình**

> Kính thưa quý thầy cô trong hội đồng. Em tên là **[Họ tên]**, mã số sinh viên **[MSSV]**. Hôm nay, em xin trình bày đề tài niên luận: **“Xây dựng website kiểm tra Toán trực tuyến hỗ trợ tự động lưu và khôi phục bài làm”**, được thực hiện dưới sự hướng dẫn của **[Giảng viên hướng dẫn]**.
>
> Nội dung trình bày của em gồm năm phần chính: lý do chọn đề tài; mục tiêu và phạm vi; phân tích, thiết kế hệ thống; kết quả xây dựng và kiểm thử; cuối cùng là phần demo sản phẩm.

**Câu chuyển ý**

> Trước tiên, em xin trình bày bài toán thực tế đã dẫn đến việc lựa chọn đề tài này.

---

### Slide 2 — Lý do chọn đề tài

**Nội dung trên slide**

- Kiểm tra trực tuyến ngày càng phổ biến
- Mất mạng, tải lại trang hoặc đóng trình duyệt có thể làm mất bài
- Dữ liệu cũ có thể ghi đè dữ liệu mới nếu đồng bộ không đúng
- Môn Toán cần nhiều dạng câu hỏi và hiển thị công thức

**Lời thuyết trình**

> Trong quá trình kiểm tra trực tuyến, học sinh có thể gặp các tình huống như mạng Internet không ổn định, vô tình tải lại trang hoặc đóng trình duyệt. Nếu hệ thống chỉ lưu dữ liệu tại thời điểm nộp bài, những sự cố này có thể làm mất một phần hoặc toàn bộ nội dung đã làm.
>
> Ngay cả khi có chức năng tự động lưu, một vấn đề khác vẫn có thể xảy ra: các yêu cầu gửi lên server không đến đúng thứ tự, khiến một đáp án cũ ghi đè lên đáp án mới. Đối với môn Toán, hệ thống còn phải hỗ trợ công thức và nhiều dạng câu hỏi khác nhau.
>
> Vì vậy, đề tài không chỉ xây dựng một website ra đề và làm bài thông thường, mà tập trung giải quyết bài toán **lưu đáp án an toàn, đồng bộ đúng phiên bản và khôi phục được phiên làm bài**.

**Câu chuyển ý**

> Từ bài toán đó, em xác định các mục tiêu cụ thể như sau.

---

### Slide 3 — Mục tiêu, đối tượng và phạm vi

**Nội dung trên slide**

- Hai vai trò: Giáo viên và Học sinh
- Bốn loại câu hỏi
- Autosave online và localStorage
- Khôi phục sau mất mạng hoặc refresh
- Chấm điểm, công bố kết quả, xử lý sự cố
- V1 dành cho một giáo viên chủ hệ thống

**Lời thuyết trình**

> Mục tiêu tổng quát của đề tài là xây dựng một website kiểm tra Toán trực tuyến phục vụ hai nhóm người dùng: giáo viên và học sinh.
>
> Hệ thống hỗ trợ bốn loại câu hỏi gồm: một đáp án, đúng–sai với bốn mệnh đề, trả lời ngắn và tự luận. Ba dạng câu khách quan được chấm tự động; câu tự luận do giáo viên chấm thủ công.
>
> Mục tiêu trọng tâm là tự động lưu đáp án lên server, đồng thời lưu tạm trên trình duyệt bằng localStorage. Khi mạng được khôi phục hoặc người dùng tải lại trang, hệ thống có thể phục hồi dữ liệu và tiếp tục đồng bộ.
>
> Trong phạm vi phiên bản V1, hệ thống được xây dựng theo mô hình cá nhân: một giáo viên là chủ hệ thống và quản lý các lớp của mình. Đề tài chưa triển khai quản trị nhiều trường học, ứng dụng di động, camera giám sát, OCR hay chấm tự luận bằng trí tuệ nhân tạo.

---

### Slide 4 — Chức năng chính của hệ thống

**Nội dung trên slide**

| Giáo viên | Học sinh |
|---|---|
| Quản lý lớp và thành viên | Tham gia lớp bằng mã |
| Quản lý chủ đề, câu hỏi | Xem đề được giao |
| Tạo, giao và công bố đề | Làm bài, đánh dấu câu |
| Chấm tự luận | Tự động lưu và khôi phục |
| Công bố kết quả, thống kê | Nộp bài, xem kết quả |
| Xử lý sự cố, duyệt bù giờ | Báo cáo sự cố |

**Lời thuyết trình**

> Về chức năng, phía giáo viên có thể quản lý lớp, thành viên, chủ đề và ngân hàng câu hỏi; tạo đề ở trạng thái nháp, thêm câu, thiết lập điểm, giao đề cho lớp và công bố đề. Sau khi học sinh nộp bài, giáo viên chấm câu tự luận, công bố kết quả, xem thống kê và xử lý các báo cáo sự cố.
>
> Phía học sinh có thể đăng ký tài khoản, tham gia lớp bằng mã, xem các đề được giao và làm bài trong phòng thi. Trong quá trình làm, đáp án được tự động lưu; học sinh có thể đánh dấu câu cần xem lại, báo sự cố, nộp bài và xem kết quả sau khi giáo viên công bố.
>
> Hệ thống tách rõ **công bố đề** và **công bố kết quả**. Công bố đề cho phép học sinh bắt đầu làm; còn công bố kết quả chỉ được thực hiện khi bài thi đã kết thúc và các lượt làm đã được chấm đầy đủ.

---

### Slide 5 — Kiến trúc và công nghệ

**Nội dung trên slide**

```text
Trình duyệt
EJS + JavaScript + Fetch API + localStorage
              ↕ HTTP, session, CSRF
Node.js + Express
Route → Controller → Service → Repository
              ↕ SQL có tham số, transaction
MySQL
```

**Lời thuyết trình**

> Hệ thống được tổ chức theo mô hình ba tầng. Tầng giao diện chạy trên trình duyệt, sử dụng EJS, HTML, CSS và JavaScript thuần. Fetch API được dùng cho các thao tác trong phòng thi; localStorage giữ bản sao dự phòng trên thiết bị. KaTeX hỗ trợ hiển thị công thức Toán và Chart.js dùng để trực quan hóa thống kê.
>
> Tầng xử lý sử dụng Node.js và Express. Mã nguồn được tách thành Route, Controller, Service và Repository. Trong đó, Service xử lý quy tắc nghiệp vụ, còn Repository chịu trách nhiệm truy vấn cơ sở dữ liệu. Cách phân tầng này giúp mã nguồn rõ ràng, dễ kiểm thử và dễ bảo trì.
>
> Tầng dữ liệu sử dụng MySQL. Các thao tác quan trọng như tạo lượt làm, nộp bài và duyệt bù giờ được thực hiện trong transaction để bảo đảm tính nhất quán.

---

### Slide 6 — Thiết kế cơ sở dữ liệu

**Nội dung trên slide**

- 15 bảng nghiệp vụ
- Các nhóm chính:
  - người dùng, lớp học, thành viên
  - chủ đề, câu hỏi, đáp án
  - đề thi, câu hỏi đề, phân công đề
  - lượt làm, câu hỏi lượt làm, chi tiết bài làm
  - nhật ký thi, sự cố, đặt lại mật khẩu
- Ràng buộc khóa ngoại, `UNIQUE`, `CHECK`, `ENUM`

**Lời thuyết trình**

> Cơ sở dữ liệu gồm 15 bảng nghiệp vụ. Các bảng được chia thành những nhóm chính: người dùng và lớp học; ngân hàng câu hỏi; đề thi và phân công đề; lượt làm và chi tiết bài làm; cuối cùng là nhật ký, sự cố và đặt lại mật khẩu.
>
> Hai bảng có vai trò quan trọng trong phòng thi là `cau_hoi_luot_lam` và `chi_tiet_bai_lam`. Khi học sinh bắt đầu, danh sách câu và điểm của từng câu được đóng băng vào lượt làm. Nhờ vậy, nếu ngân hàng câu hỏi thay đổi về sau thì bài thi đang diễn ra vẫn không bị ảnh hưởng. Bảng chi tiết bài làm lưu đáp án, điểm, trạng thái đánh dấu và `answer_version` của từng câu.
>
> Hệ thống sử dụng khóa ngoại, ràng buộc duy nhất, `CHECK` và `ENUM` để tăng tính toàn vẹn của dữ liệu ngay từ tầng cơ sở dữ liệu.

---

### Slide 7 — Giải pháp autosave và chống ghi đè

**Nội dung trên slide**

```text
Học sinh sửa đáp án
        ↓
Tăng answerVersion
        ↓
Lưu localStorage: synced = false
        ↓
Gửi API lưu lên server
        ↓
Server chỉ nhận phiên bản mới hơn
        ↓
Thành công → synced = true
Mất mạng → giữ pending và gửi lại khi online
```

**Lời thuyết trình**

> Đây là giải pháp trọng tâm của đề tài. Mỗi khi học sinh thay đổi đáp án, phía trình duyệt tăng một số phiên bản gọi là `answerVersion`. Dữ liệu được ghi vào localStorage trước với trạng thái chưa đồng bộ, sau đó mới gửi lên server.
>
> Server kiểm tra lượt làm có còn hiệu lực hay không, câu hỏi có thuộc lượt làm hay không và phiên bản gửi lên có mới hơn phiên bản trong cơ sở dữ liệu hay không. Chỉ phiên bản mới hơn mới được chấp nhận.
>
> Ví dụ, nếu yêu cầu phiên bản 6 đến server trước và phiên bản 5 đến sau do mạng chậm, server sẽ từ chối phiên bản 5. Nhờ đó, đáp án cũ không thể ghi đè đáp án mới.
>
> Khi mất mạng, bản pending vẫn còn trong localStorage. Sự kiện trình duyệt trở lại online sẽ kích hoạt đồng bộ lại. Tùy loại câu hỏi, hệ thống sử dụng thời gian chờ khác nhau: câu lựa chọn được gửi gần như ngay lập tức, trả lời ngắn khoảng 600 mili giây và tự luận khoảng 1.500 mili giây để hạn chế gửi quá nhiều yêu cầu khi người dùng đang nhập.

**Điểm cần nhấn giọng**

> localStorage giúp **không mất dữ liệu trên thiết bị**, còn `answerVersion` giúp **không sai dữ liệu trên server**. Hai cơ chế giải quyết hai rủi ro khác nhau và bổ sung cho nhau.

---

### Slide 8 — Khôi phục bài làm và quản lý thời gian

**Nội dung trên slide**

- Tải trạng thái chính thức từ server
- So sánh với bản local theo version
- Gửi lại các đáp án pending
- Thứ tự câu được đóng băng, không trộn lại khi refresh
- Đồng hồ dựa trên thời gian server
- Tự nộp ở client, API và job server

**Lời thuyết trình**

> Khi học sinh tải lại phòng thi, hệ thống lấy trạng thái chính thức từ server, sau đó đọc bản lưu cục bộ và so sánh phiên bản. Những đáp án chưa đồng bộ sẽ được đưa vào hàng chờ để gửi lại. Thứ tự câu đã được lưu trong lượt làm nên không bị trộn lại sau khi refresh.
>
> Về thời gian, hệ thống dùng thời gian server làm nguồn chính xác, không phụ thuộc hoàn toàn vào đồng hồ máy học sinh. Hạn nộp gốc là thời điểm nhỏ hơn giữa thời gian bắt đầu cộng thời lượng đề và thời gian đóng đề. Nếu giáo viên duyệt sự cố, số giây bù được cộng vào hạn nộp hiệu lực.
>
> Việc tự động nộp được bảo vệ ở ba mức: đồng hồ trên trình duyệt, kiểm tra tại API và một job trên server quét các lượt quá hạn. Vì vậy, ngay cả khi học sinh đóng trình duyệt, server vẫn có thể kết thúc lượt làm đúng quy định.

---

### Slide 9 — Bảo mật và tính nhất quán

**Nội dung trên slide**

- Mật khẩu băm bằng bcrypt
- Session lưu trong MySQL
- Phân quyền Giáo viên/Học sinh
- CSRF, Helmet, rate limit
- Validation, SQL placeholder
- Không trả đáp án đúng khi đang thi
- Transaction cho các nghiệp vụ quan trọng

**Lời thuyết trình**

> Về bảo mật, mật khẩu được băm bằng bcrypt; trạng thái đăng nhập được quản lý bằng session lưu trong MySQL. Middleware kiểm tra đăng nhập, vai trò và quyền sở hữu tài nguyên trước khi xử lý yêu cầu.
>
> Hệ thống sử dụng CSRF token, Helmet, giới hạn tần suất đăng nhập, kiểm tra dữ liệu đầu vào và câu lệnh SQL có placeholder. Đặc biệt, API phòng thi không trả đáp án đúng cho học sinh khi bài thi đang diễn ra.
>
> Các nghiệp vụ có nhiều bước cập nhật dữ liệu được đặt trong transaction. Nếu một bước thất bại, toàn bộ thao tác được hoàn tác, tránh tình trạng dữ liệu chỉ cập nhật một phần.

---

### Slide 10 — Kiểm thử và kết quả đạt được

**Nội dung trên slide**

- 60/60 regression test tự động đạt
- 18 màn hình smoke UI có ảnh minh chứng
- Checklist 99 test case thủ công đã được xây dựng
- Kiểm tra các tình huống đặc biệt:
  - offline/online, refresh
  - request cũ đến muộn
  - double-click bắt đầu hoặc nộp bài
  - hết giờ và bù giờ
  - phân quyền, công bố kết quả

**Lời thuyết trình**

> Hệ thống đã được kiểm thử bằng nhiều hình thức. Bộ regression tự động hiện có 60 trên 60 kiểm thử đạt. Phần giao diện đã được smoke test và lưu ảnh minh chứng cho 18 màn hình chính.
>
> Ngoài ra, em đã xây dựng checklist 99 test case thủ công theo các nhóm tài khoản, lớp học, câu hỏi, đề thi, làm bài, chấm điểm, sự cố và hệ thống. Em xin lưu ý rằng đây là checklist phục vụ kiểm thử thủ công; kết quả 60 trên 60 là số liệu của bộ regression tự động.
>
> Các tình huống trọng tâm đã được kiểm tra gồm mất và khôi phục kết nối, tải lại trang, request cũ đến muộn, nhấn nút hai lần, hết giờ, bù giờ và kiểm soát quyền truy cập.

---

### Slide 11 — Demo hệ thống

**Lời dẫn vào demo**

> Sau đây, em xin trình bày luồng hoạt động chính của hệ thống. Để tiết kiệm thời gian, dữ liệu lớp học, bốn loại câu hỏi và một đề kiểm tra mẫu đã được chuẩn bị sẵn.

#### Bước 1 — Giáo viên công bố đề

**Thao tác**

1. Đăng nhập bằng tài khoản giáo viên.
2. Mở lớp `Toán 10A1`, chỉ mã lớp và thành viên.
3. Mở ngân hàng câu hỏi, chỉ bốn loại câu và công thức KaTeX.
4. Mở đề mẫu, chỉ số câu, tổng điểm, thời lượng và lớp được giao.
5. Công bố đề.

**Lời nói**

> Giáo viên có thể quản lý lớp và ngân hàng câu hỏi theo chủ đề. Đề thi được tạo ở trạng thái nháp để giáo viên hoàn thiện cấu trúc và điểm. Khi công bố, cấu trúc đề được khóa nhằm bảo đảm công bằng cho các học sinh bắt đầu ở những thời điểm khác nhau.

#### Bước 2 — Học sinh bắt đầu và làm bài

**Thao tác**

1. Chuyển sang cửa sổ học sinh.
2. Mở đề vừa công bố và bắt đầu làm.
3. Trả lời nhanh cả bốn loại câu.
4. Đánh dấu một câu cần xem lại.
5. Chỉ trạng thái “Đã lưu”.

**Lời nói**

> Khi học sinh bắt đầu, hệ thống tạo duy nhất một lượt làm và đóng băng danh sách câu hỏi. Trong quá trình làm, mỗi thay đổi được lưu cục bộ trước, sau đó đồng bộ lên server. Trạng thái lưu được hiển thị để học sinh biết dữ liệu đã an toàn hay đang chờ đồng bộ.

#### Bước 3 — Trình diễn mất mạng

**Thao tác**

1. Mở DevTools, chuyển Network sang Offline.
2. Sửa một đáp án.
3. Chỉ trạng thái mất kết nối hoặc chờ đồng bộ.
4. Chuyển lại Online và chờ trạng thái “Đã lưu”.

**Lời nói**

> Em giả lập tình huống mất mạng. Mặc dù chưa gửi được lên server, nội dung vừa nhập vẫn được giữ trong localStorage với trạng thái pending. Khi kết nối trở lại, hệ thống tự động gửi lại phiên bản chưa đồng bộ và chuyển trạng thái sang đã lưu.

#### Bước 4 — Trình diễn refresh và khôi phục

**Thao tác**

1. Ghi nhớ thứ tự câu và các đáp án hiện tại.
2. Nhấn F5.
3. Chỉ thứ tự câu, nội dung trả lời và dấu xem lại vẫn còn.

**Lời nói**

> Sau khi tải lại trang, hệ thống không tạo lượt mới và cũng không trộn lại câu hỏi. Trạng thái bài làm được khôi phục từ server kết hợp với bản lưu cục bộ. Đây là kết quả trực tiếp của cơ chế đóng băng câu hỏi, autosave và kiểm soát phiên bản.

#### Bước 5 — Nộp, chấm và công bố kết quả

**Thao tác**

1. Học sinh nộp bài.
2. Chuyển sang giáo viên, mở lượt làm và chấm câu tự luận.
3. Công bố kết quả nếu dữ liệu demo đã đủ điều kiện.
4. Mở thống kê.
5. Quay lại học sinh và mở kết quả.

**Lời nói**

> Khi nộp bài, hệ thống hoàn tất các yêu cầu lưu còn chờ và chấm tự động ba loại câu khách quan. Giáo viên chấm câu tự luận, nhập điểm và nhận xét. Sau khi đề đã đóng và các lượt làm đã được chấm, giáo viên mới có thể công bố kết quả. Lúc này học sinh mới xem được điểm và đáp án, nếu đề cho phép.

---

### Slide 12 — Đánh giá, hạn chế và hướng phát triển

**Nội dung trên slide**

**Kết quả**

- Hoàn thành luồng kiểm tra trực tuyến cho giáo viên và học sinh
- Autosave nhiều lớp, chống ghi đè và khôi phục bài làm
- Hỗ trợ bốn loại câu hỏi Toán
- Chấm điểm, sự cố và thống kê có kiểm soát

**Hạn chế**

- V1 chỉ dành cho một giáo viên chủ hệ thống
- Chưa có ứng dụng di động và thông báo realtime
- Tự luận vẫn chấm thủ công
- Giao diện responsive ở mức cơ bản

**Hướng phát triển**

- Hỗ trợ nhiều giáo viên, nhiều môn và nhiều đơn vị
- WebSocket và thông báo realtime
- Import câu hỏi từ Excel/Word
- Cải thiện giao diện di động
- Nghiên cứu AI hỗ trợ chấm tự luận

**Lời thuyết trình**

> Qua quá trình thực hiện, đề tài đã hoàn thành luồng kiểm tra trực tuyến từ quản lý lớp, xây dựng đề, làm bài, tự động lưu, nộp bài, chấm điểm đến công bố kết quả và thống kê. Kết quả quan trọng nhất là cơ chế lưu nhiều lớp, có kiểm soát phiên bản và có khả năng khôi phục sau gián đoạn.
>
> Tuy nhiên, phiên bản hiện tại vẫn có một số hạn chế: chỉ phù hợp với một giáo viên chủ hệ thống; chưa có ứng dụng di động và thông báo realtime; phần tự luận vẫn cần giáo viên chấm; giao diện responsive mới ở mức cơ bản.
>
> Trong tương lai, hệ thống có thể mở rộng cho nhiều giáo viên và nhiều môn học, bổ sung WebSocket, import câu hỏi, cải thiện trải nghiệm trên thiết bị di động và nghiên cứu AI để hỗ trợ giáo viên chấm tự luận. Đây là các hướng phát triển, chưa phải chức năng hiện có của sản phẩm.

---

### Slide 13 — Kết luận và cảm ơn

**Lời kết hoàn chỉnh**

> Tóm lại, đề tài đã xây dựng được một website kiểm tra Toán trực tuyến đáp ứng hai nhóm người dùng là giáo viên và học sinh, hỗ trợ đầy đủ bốn loại câu hỏi, quy trình tạo đề, làm bài, chấm điểm và công bố kết quả.
>
> Điểm nổi bật của hệ thống là khả năng tự động lưu lên server, lưu dự phòng trên trình duyệt, chống ghi đè bằng phiên bản và khôi phục bài làm khi mất mạng hoặc tải lại trang. Qua đó, hệ thống góp phần giảm rủi ro mất dữ liệu và tạo sự an tâm hơn cho học sinh trong quá trình kiểm tra trực tuyến.
>
> Em xin chân thành cảm ơn **[Giảng viên hướng dẫn]** đã hướng dẫn em trong quá trình thực hiện đề tài, đồng thời cảm ơn quý thầy cô trong hội đồng đã lắng nghe phần trình bày. Em xin tiếp thu ý kiến và trả lời các câu hỏi của quý thầy cô.

---

## 3. Phiên bản mở đầu ngắn nếu hội đồng giới hạn thời gian

> Kính thưa quý thầy cô. Em tên là **[Họ tên]**, mã số sinh viên **[MSSV]**. Em xin trình bày đề tài **“Xây dựng website kiểm tra Toán trực tuyến hỗ trợ tự động lưu và khôi phục bài làm”**.
>
> Đề tài xuất phát từ rủi ro mất đáp án khi học sinh bị mất mạng hoặc tải lại trang trong lúc thi. Hệ thống của em hỗ trợ giáo viên quản lý lớp, câu hỏi, đề thi và chấm điểm; học sinh làm bài với bốn loại câu hỏi. Điểm trọng tâm là đáp án được lưu đồng thời trên trình duyệt và server, đồng thời dùng số phiên bản để ngăn dữ liệu cũ ghi đè dữ liệu mới. Sau đây, em xin trình bày thiết kế và demo giải pháp.

---

## 4. Câu hỏi phản biện thường gặp và câu trả lời gợi ý

### 1. Điểm mới hoặc điểm nổi bật của đề tài là gì?

> Điểm nổi bật không nằm ở chức năng thi trực tuyến đơn thuần, mà ở cơ chế bảo vệ dữ liệu bài làm. Hệ thống kết hợp ba yếu tố: lưu trên server, dự phòng bằng localStorage và kiểm soát `answerVersion`. Nhờ đó, hệ thống vừa phục hồi được khi gián đoạn, vừa ngăn request cũ ghi đè đáp án mới.

### 2. Tại sao phải dùng localStorage khi đã lưu trên server?

> Khi mất mạng, trình duyệt không thể gửi dữ liệu lên server. localStorage giữ tạm phần thay đổi chưa gửi được, kể cả khi người dùng refresh trang. Khi có mạng lại, hệ thống đọc phần pending và đồng bộ lên server. Nếu chỉ dùng server thì nội dung nhập trong lúc offline có thể bị mất.

### 3. localStorage có phải nguồn dữ liệu chính không?

> Không. Server và cơ sở dữ liệu vẫn là nguồn dữ liệu chính thức. localStorage chỉ là bản dự phòng phía client. Khi khôi phục, hệ thống so sánh phiên bản giữa hai phía và chỉ gửi lại dữ liệu cục bộ chưa đồng bộ.

### 4. `answerVersion` giải quyết vấn đề gì?

> Nó giải quyết tình huống request đến server không đúng thứ tự. Server chỉ nhận phiên bản lớn hơn phiên bản đang lưu. Vì vậy, một request cũ đến muộn sẽ bị từ chối và không thể ghi đè dữ liệu mới.

### 5. Nếu học sinh xóa localStorage thì sao?

> Những đáp án đã đồng bộ vẫn còn trong cơ sở dữ liệu và được tải lại từ server. Chỉ phần vừa nhập trong lúc offline nhưng chưa từng gửi lên server có thể mất nếu người dùng chủ động xóa dữ liệu trình duyệt. Đây là giới hạn của giải pháp lưu cục bộ trên web.

### 6. Nếu học sinh đổi sang thiết bị khác thì có khôi phục được không?

> Thiết bị mới khôi phục được tất cả dữ liệu đã đồng bộ lên server. Phần pending chỉ tồn tại trên thiết bị cũ thì không thể xuất hiện trên thiết bị mới. Vì vậy, giao diện luôn hiển thị trạng thái đã lưu hay đang chờ đồng bộ để người dùng nhận biết.

### 7. Tại sao không dùng WebSocket?

> Phạm vi V1 tập trung vào độ an toàn của dữ liệu bài làm. Fetch API kết hợp sự kiện online, heartbeat và cơ chế retry đã đáp ứng luồng này với kiến trúc đơn giản hơn. WebSocket là hướng phát triển phù hợp cho thông báo và giám sát realtime trong phiên bản sau.

### 8. Vì sao chọn Node.js, Express và MySQL?

> Node.js phù hợp với ứng dụng web có nhiều thao tác bất đồng bộ như autosave và heartbeat. Express có hệ sinh thái middleware tốt và giúp xây dựng route, API nhanh. MySQL phù hợp với dữ liệu có quan hệ chặt chẽ như người dùng, lớp, đề và lượt làm; đồng thời hỗ trợ transaction và ràng buộc toàn vẹn.

### 9. Vì sao dùng EJS thay vì React hoặc Vue?

> Với phạm vi niên luận V1, EJS giúp triển khai giao diện server-rendered gọn và giảm độ phức tạp. Phần cần tương tác cao nhất là phòng thi vẫn được xử lý bằng JavaScript và Fetch API. Cách chọn này đủ đáp ứng yêu cầu, đồng thời tập trung thời gian cho bài toán autosave và khôi phục.

### 10. Làm sao bảo đảm học sinh không xem được đáp án khi đang thi?

> API trạng thái phòng thi chỉ trả nội dung cần thiết để làm bài, không trả cờ đáp án đúng hoặc lời giải. Việc xem đáp án chỉ được mở sau khi giáo viên công bố kết quả và đề cho phép xem đáp án. Server kiểm tra quyền và trạng thái thay vì chỉ ẩn ở giao diện.

### 11. Tại sao phải đóng băng câu hỏi khi bắt đầu lượt làm?

> Đóng băng giúp thứ tự câu, nội dung tham chiếu và điểm tối đa của lượt làm không thay đổi trong suốt bài thi. Nhờ vậy, refresh không trộn lại câu và việc sửa ngân hàng câu hỏi về sau không làm sai lệch lượt đang thi hoặc kết quả đã nộp.

### 12. Hệ thống xử lý hết giờ như thế nào?

> Đồng hồ client dựa trên độ lệch với thời gian server. Khi hết giờ, client gửi yêu cầu nộp. API cũng tự kiểm tra hạn ở mọi thao tác lưu và nộp. Ngoài ra, job server định kỳ quét các lượt quá hạn để tự nộp ngay cả khi trình duyệt đã đóng.

### 13. Vì sao thời gian server là nguồn chính xác?

> Đồng hồ trên thiết bị học sinh có thể sai hoặc bị thay đổi. Server trả thời gian và hạn nộp hiệu lực; client chỉ dùng độ lệch để hiển thị đếm ngược. Mọi quyết định cho phép lưu hoặc nộp cuối cùng đều được kiểm tra lại tại server.

### 14. Bù giờ có thể bị cộng hai lần không?

> Nghiệp vụ duyệt sự cố và cộng giây được thực hiện trong transaction, đồng thời kiểm tra trạng thái sự cố. Một sự cố đã xử lý không được duyệt lại theo luồng bình thường, nhờ đó hạn chế việc cộng giờ lặp.

### 15. Cách chấm câu đúng–sai bốn mệnh đề như thế nào?

> Hệ thống so sánh cả bốn mệnh đề và áp dụng thang điểm theo số mệnh đề sai: đúng cả bốn được toàn bộ điểm; sai một, hai hoặc ba mệnh đề nhận các tỷ lệ tương ứng 0,5; 0,25; 0,1; sai cả bốn nhận 0 điểm. Điểm thực tế được nhân với điểm tối đa của câu trong đề.

### 16. Trả lời ngắn được chấm như thế nào?

> Câu trả lời được chuẩn hóa trước khi so sánh, chẳng hạn loại bỏ khoảng trắng thừa và thống nhất một số định dạng đầu vào. Phiên bản hiện tại chấm theo đáp án chuẩn, chưa dùng hệ thống đại số máy tính nên các biểu thức tương đương quá phức tạp có thể chưa được nhận diện.

### 17. Hệ thống đã được kiểm thử ra sao?

> Hệ thống có 60 regression test tự động và tất cả đều đạt tại lần chạy được ghi nhận. Ngoài ra có smoke test cho 18 màn hình và checklist 99 test case thủ công. Em phân biệt rõ: 60/60 là kết quả tự động; 99 case là bộ kịch bản thủ công đã chuẩn bị, không trình bày sai thành 99 case tự động đã chạy.

### 18. Hạn chế lớn nhất hiện tại là gì?

> Hạn chế lớn nhất là mô hình V1 chỉ dành cho một giáo viên chủ hệ thống, chưa hỗ trợ nhiều đơn vị độc lập. Ngoài ra, dữ liệu pending chỉ nằm trên thiết bị hiện tại; tự luận vẫn chấm thủ công; chưa có thông báo realtime và ứng dụng di động.

### 19. Nếu triển khai thực tế cần bổ sung gì?

> Cần triển khai HTTPS, quản lý secret an toàn, sao lưu cơ sở dữ liệu, giám sát server, log tập trung, chính sách lưu trữ dữ liệu và kiểm thử tải. Nếu mở rộng nhiều trường học, cần thiết kế tenant, quyền quản trị và quy trình vận hành tương ứng.

### 20. Vì sao đề tài không có vai trò Admin?

> Đây là quyết định phạm vi. V1 vận hành theo mô hình một giáo viên đồng thời là chủ hệ thống; tài khoản giáo viên được tạo khi cài đặt, còn đăng ký công khai chỉ dành cho học sinh. Admin riêng chỉ cần thiết khi hệ thống mở rộng cho nhiều giáo viên hoặc nhiều đơn vị.

---

## 5. Lưu ý khi trình bày

- Không đọc nguyên văn nội dung trên slide; slide chỉ giữ từ khóa, phần diễn giải dùng lời nói.
- Nhấn mạnh ba cụm: **localStorage**, **answerVersion**, **khôi phục không đổi thứ tự câu**.
- Khi nói số liệu kiểm thử, dùng đúng câu: **“60/60 regression test tự động đạt; 99 test case thủ công đã được xây dựng làm checklist.”**
- Không giới thiệu AI, OCR, WebSocket hay mobile app như chức năng đã có; đó chỉ là hướng phát triển.
- Trong demo, luôn dùng hai cửa sổ hoặc hai profile riêng cho giáo viên và học sinh.
- Thử thao tác offline và refresh ít nhất một lần trước buổi bảo vệ.
- Nếu demo gặp lỗi, chuyển sang ảnh trong thư mục `screenshots/` và tiếp tục giải thích luồng; không dành quá nhiều thời gian sửa lỗi trước hội đồng.
- Kết thúc mỗi phần bằng một câu chuyển ý để bài nói liền mạch, tránh nói “tiếp theo là slide...”.

## 6. Checklist trước buổi bảo vệ

- [ ] Điền họ tên, MSSV và giảng viên hướng dẫn.
- [ ] MySQL và server đã chạy; `/health` báo kết nối cơ sở dữ liệu thành công.
- [ ] Đăng nhập thử tài khoản giáo viên và học sinh.
- [ ] Dữ liệu đề demo có thời gian bắt đầu/kết thúc phù hợp.
- [ ] Đề đang ở trạng thái cần thiết cho đúng kịch bản.
- [ ] Thử trước offline → online → refresh → nộp bài.
- [ ] Chuẩn bị sẵn ảnh giao diện dự phòng.
- [ ] Tắt thông báo cá nhân và các ứng dụng không liên quan.
- [ ] Phóng to trình duyệt đủ để hội đồng quan sát.
- [ ] Tập nói có bấm giờ ít nhất hai lần, mục tiêu không quá 15 phút.
