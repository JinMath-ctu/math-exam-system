# Kịch bản thuyết trình trực tiếp dự án JinMath

> **Hình thức:** Mở website và vừa thao tác vừa thuyết trình, không sử dụng slide  
> **Thời lượng đề xuất:** 12–15 phút  
> **Điểm cần làm nổi bật:** tự động lưu, làm bài khi mất mạng tạm thời, đồng bộ lại và khôi phục sau khi tải lại trang

---

## 1. Chuẩn bị trước khi trình bày

Chuẩn bị hai cửa sổ trình duyệt hoặc hai hồ sơ trình duyệt riêng:

- **Cửa sổ 1 — Giáo viên:** `teacher@example.com` / `123456`
- **Cửa sổ 2 — Học sinh:** `studenta@example.com` / `123456`
- Mở sẵn DevTools ở cửa sổ học sinh để có thể chuyển Network sang Offline.
- Kiểm tra MySQL, server và đường dẫn `http://localhost:3000`.
- Dữ liệu demo gồm lớp `Toán 10A1`, mã `TOAN10A1`, bốn loại câu hỏi và một đề kiểm tra mẫu.
- Kiểm tra thời gian mở và đóng đề để học sinh có thể bắt đầu làm.
- Nếu cần trình diễn công bố kết quả, chuẩn bị một đề hoặc lượt làm đã đủ điều kiện công bố.

Không đăng nhập cả giáo viên và học sinh trong cùng một cửa sổ thông thường vì hai tài khoản sẽ dùng chung session.

---

## 2. Mở đầu tại trang chủ — khoảng 1 phút

**Màn hình:** Trang chủ JinMath.

**Lời nói:**

> Kính thưa quý thầy cô trong hội đồng. Em tên là **[Họ tên]**, mã số sinh viên **[MSSV]**. Sau đây, em xin trình bày trực tiếp sản phẩm của đề tài **“Xây dựng website kiểm tra Toán trực tuyến hỗ trợ tự động lưu và khôi phục bài làm”**.
>
> Đây là hệ thống kiểm tra trực tuyến dành cho hai đối tượng chính là giáo viên và học sinh. Giáo viên có thể quản lý lớp học, ngân hàng câu hỏi, tạo và giao đề, chấm bài, công bố kết quả và xử lý sự cố. Học sinh có thể tham gia lớp, làm bài trực tuyến, tự động lưu đáp án, nộp bài và xem kết quả.
>
> Vấn đề chính mà đề tài hướng đến là hạn chế mất dữ liệu khi học sinh gặp sự cố như mạng không ổn định, tải lại trang hoặc đóng trình duyệt ngoài ý muốn. Vì vậy, ngoài các chức năng kiểm tra thông thường, hệ thống có cơ chế lưu đáp án cả trên server lẫn trình duyệt, đồng thời kiểm soát phiên bản để dữ liệu cũ không ghi đè dữ liệu mới.

**Chuyển sang đăng nhập giáo viên:**

> Đầu tiên, em xin trình bày các chức năng ở phía giáo viên.

---

## 3. Đăng nhập và trang tổng quan giáo viên — khoảng 45 giây

**Thao tác:**

1. Bấm **Đăng nhập**.
2. Đăng nhập tài khoản giáo viên.
3. Dừng tại Dashboard giáo viên.

**Lời nói:**

> Trong phiên bản hiện tại, hệ thống hoạt động theo mô hình một giáo viên đồng thời là chủ hệ thống. Tài khoản giáo viên được tạo sẵn khi cài đặt; chức năng đăng ký công khai chỉ dành cho học sinh.
>
> Sau khi đăng nhập, trang tổng quan giúp giáo viên theo dõi nhanh các lớp học, đề thi, lượt làm và những nghiệp vụ cần xử lý. Hệ thống sử dụng session để duy trì trạng thái đăng nhập và middleware để kiểm tra vai trò. Vì vậy, học sinh không thể truy cập các chức năng dành cho giáo viên chỉ bằng cách nhập trực tiếp đường dẫn.

---

## 4. Quản lý lớp học — khoảng 45 giây

**Thao tác:**

1. Mở **Quản lý lớp học**.
2. Mở lớp `Toán 10A1`.
3. Chỉ mã lớp `TOAN10A1` và danh sách thành viên.

**Lời nói:**

> Tại chức năng quản lý lớp, giáo viên có thể tạo, chỉnh sửa và quản lý thành viên của từng lớp. Mỗi lớp có một mã tham gia duy nhất. Học sinh sử dụng mã này để tự tham gia lớp, giúp giáo viên không phải nhập thủ công từng tài khoản.
>
> Trong dữ liệu demo, em đã chuẩn bị lớp Toán 10A1 với mã `TOAN10A1` và một số học sinh để thực hiện đầy đủ luồng kiểm tra.

**Nếu không đủ thời gian:** Không tạo lớp mới; chỉ giới thiệu lớp đã có.

---

## 5. Chủ đề và ngân hàng câu hỏi — khoảng 1 phút

**Thao tác:**

1. Mở **Ngân hàng câu hỏi**.
2. Lọc hoặc mở chủ đề *Phương trình bậc hai*.
3. Mở một câu có công thức Toán.
4. Chỉ lần lượt bốn loại câu hỏi.

**Lời nói:**

> Tiếp theo là ngân hàng câu hỏi. Giáo viên có thể tổ chức câu hỏi theo chủ đề và mức độ. Hệ thống hỗ trợ hiển thị công thức Toán bằng KaTeX, đồng thời cho phép đính kèm hình ảnh khi nội dung câu hỏi cần hình minh họa.
>
> Hệ thống hiện hỗ trợ bốn dạng câu. Thứ nhất là câu một đáp án đúng. Thứ hai là câu đúng–sai gồm bốn mệnh đề a, b, c, d. Thứ ba là câu trả lời ngắn, được chấm tự động theo đáp án chuẩn sau khi chuẩn hóa dữ liệu. Cuối cùng là câu tự luận, giáo viên sẽ chấm điểm thủ công và có thể nhập nhận xét.
>
> Với câu hỏi đã được sử dụng trong một đề công bố, hệ thống hạn chế sửa trực tiếp. Giáo viên có thể sao chép thành câu hỏi mới để tránh làm thay đổi nội dung của các đề và lượt làm đã phát sinh.

---

## 6. Tạo, giao và công bố đề thi — khoảng 1 phút 15 giây

**Thao tác:**

1. Mở **Quản lý đề thi**.
2. Mở đề *Kiểm tra 15 phút – Phương trình bậc hai*.
3. Chỉ trạng thái đề, số câu, tổng điểm, thời lượng và tùy chọn trộn câu.
4. Chỉ lớp `Toán 10A1` trong phần phân công.
5. Nếu đề đang nháp, bấm **Công bố đề**.

**Lời nói:**

> Giáo viên tạo đề ở trạng thái nháp, sau đó chọn câu từ ngân hàng, sắp xếp hoặc trộn câu, thiết lập điểm cho từng câu, thời lượng làm bài và khoảng thời gian mở đề.
>
> Sau khi hoàn thiện, giáo viên giao đề cho một hoặc nhiều lớp. Ở đây, đề kiểm tra mẫu được giao cho lớp Toán 10A1, gồm bốn câu với đủ bốn dạng câu hỏi.
>
> Khi giáo viên bấm công bố, đề chuyển từ trạng thái nháp sang đã công bố. Từ thời điểm này, cấu trúc đề được khóa, không cho tùy ý thêm hoặc xóa câu. Quy tắc này bảo đảm các học sinh nhận cùng một cấu trúc đề, kể cả khi bắt đầu làm ở những thời điểm khác nhau.
>
> Em cũng xin phân biệt hai khái niệm: công bố đề là cho phép học sinh bắt đầu làm; công bố kết quả là cho phép học sinh xem điểm sau khi kỳ thi đã kết thúc. Đây là hai bước độc lập.

**Chuyển cửa sổ:**

> Sau khi giáo viên đã công bố đề, em chuyển sang vai trò học sinh để trình bày phần quan trọng nhất của hệ thống.

---

## 7. Học sinh đăng nhập, tham gia lớp và mở đề — khoảng 1 phút

**Thao tác:**

1. Chuyển sang cửa sổ học sinh.
2. Đăng nhập tài khoản học sinh.
3. Mở danh sách lớp; nếu cần, chỉ chức năng nhập mã lớp.
4. Mở danh sách đề được giao.
5. Chọn đề và bấm **Bắt đầu làm bài**.

**Lời nói:**

> Học sinh có thể đăng ký tài khoản, đăng nhập và tham gia lớp bằng mã do giáo viên cung cấp. Sau khi đã là thành viên, học sinh chỉ nhìn thấy những đề được giao cho đúng lớp của mình và đã được giáo viên công bố.
>
> Khi em bấm bắt đầu làm bài, server kiểm tra quyền truy cập, thời gian mở đề và việc học sinh có thuộc lớp hay không. Sau đó hệ thống tạo một lượt làm trong transaction.
>
> Tại thời điểm này, danh sách câu hỏi, điểm tối đa và thứ tự câu được đóng băng vào lượt làm. Nếu đề bật trộn câu thì mỗi học sinh có thể nhận thứ tự khác nhau, nhưng chính học sinh đó tải lại trang vẫn giữ nguyên thứ tự ban đầu.

---

## 8. Phòng thi và tự động lưu — khoảng 1 phút 30 giây

**Thao tác:**

1. Trả lời câu một đáp án.
2. Chọn đủ bốn mệnh đề của câu đúng–sai.
3. Nhập câu trả lời ngắn.
4. Nhập một đoạn ngắn vào câu tự luận.
5. Đánh dấu một câu cần xem lại.
6. Chỉ đồng hồ và trạng thái **Đã lưu**.

**Lời nói:**

> Đây là giao diện phòng thi. Bên cạnh nội dung câu hỏi, hệ thống hiển thị đồng hồ đếm ngược, trạng thái từng câu và chức năng đánh dấu câu cần xem lại.
>
> Khi học sinh thay đổi một đáp án, hệ thống thực hiện hai bước. Đầu tiên, dữ liệu được ghi vào localStorage trên trình duyệt để tạo bản dự phòng. Sau đó, trình duyệt gửi yêu cầu lưu lên server bằng Fetch API.
>
> Mỗi lần sửa đáp án đều làm tăng một số phiên bản gọi là `answerVersion`. Server chỉ chấp nhận phiên bản mới hơn phiên bản hiện có trong cơ sở dữ liệu. Ví dụ, nếu phiên bản 6 đến trước còn phiên bản 5 đến sau do mạng chậm, server sẽ từ chối phiên bản 5. Nhờ đó, đáp án cũ không thể ghi đè lên đáp án mới.
>
> Câu lựa chọn được gửi gần như ngay lập tức. Câu trả lời ngắn và tự luận có một khoảng chờ ngắn để tránh gửi request sau từng ký tự. Khi server xác nhận thành công, giao diện chuyển sang trạng thái đã lưu.

**Câu nhấn mạnh:**

> Như vậy, localStorage bảo vệ dữ liệu trên thiết bị, còn `answerVersion` bảo vệ tính đúng đắn của dữ liệu trên server.

---

## 9. Demo mất mạng và đồng bộ lại — khoảng 1 phút 15 giây

**Thao tác:**

1. Mở DevTools → Network → chọn **Offline**.
2. Thay đổi câu trả lời ngắn hoặc thêm nội dung tự luận.
3. Chỉ trạng thái mất kết nối hoặc chờ đồng bộ.
4. Chuyển Network trở lại **Online**.
5. Chờ trạng thái **Đã lưu**.

**Lời nói:**

> Tiếp theo, em giả lập tình huống học sinh bị mất mạng trong lúc đang làm bài.

*(Chuyển sang Offline và sửa đáp án.)*

> Lúc này, request chưa thể gửi đến server nên giao diện báo mất kết nối hoặc chờ đồng bộ. Tuy nhiên, nội dung học sinh vừa nhập vẫn được lưu trong localStorage với trạng thái pending, vì vậy dữ liệu không biến mất.

*(Chuyển lại Online.)*

> Khi kết nối được khôi phục, sự kiện online của trình duyệt kích hoạt quá trình đồng bộ lại. Hệ thống gửi các đáp án pending lên server theo phiên bản và chuyển trạng thái trở lại đã lưu. Đây là chức năng trọng tâm mà đề tài hướng đến.

---

## 10. Demo tải lại trang và khôi phục bài — khoảng 1 phút

**Thao tác:**

1. Ghi nhớ đáp án, dấu xem lại và thứ tự câu.
2. Nhấn F5.
3. Chỉ các dữ liệu vẫn còn và thứ tự câu không đổi.

**Lời nói:**

> Bây giờ, em tải lại toàn bộ trang để mô phỏng trường hợp học sinh vô tình bấm refresh hoặc mở lại phòng thi.

*(Nhấn F5 và chờ trang tải.)*

> Sau khi tải lại, hệ thống lấy trạng thái chính thức từ server, đọc thêm bản lưu cục bộ và so sánh phiên bản giữa hai phía. Các đáp án, câu đã đánh dấu và thứ tự câu hỏi vẫn được khôi phục. Hệ thống cũng không tạo thêm một lượt làm mới.
>
> Cơ chế này giúp học sinh có thể tiếp tục bài thi thay vì phải làm lại từ đầu sau một gián đoạn ngắn.

---

## 11. Đồng hồ, hết giờ và báo sự cố — khoảng 45 giây

**Thao tác:**

1. Chỉ đồng hồ đếm ngược.
2. Nếu đủ thời gian, mở nhanh chức năng **Báo sự cố** nhưng không nhất thiết gửi.

**Lời nói:**

> Đồng hồ phòng thi không tin tuyệt đối thời gian trên máy học sinh mà được tính theo độ lệch với thời gian server. Mọi yêu cầu lưu và nộp đều được server kiểm tra lại hạn hiệu lực.
>
> Việc hết giờ được bảo vệ ở nhiều mức: trình duyệt tự gửi yêu cầu nộp, API từ chối thao tác quá hạn và một job trên server định kỳ quét các lượt đã hết giờ. Vì vậy, đóng trình duyệt không giúp kéo dài thời gian làm bài.
>
> Nếu gặp sự cố thực tế, học sinh có thể gửi báo cáo. Giáo viên xem xét và quyết định duyệt hoặc từ chối. Số giây bù chỉ được cộng sau khi giáo viên duyệt và thao tác này được thực hiện trong transaction để tránh cập nhật dang dở hoặc cộng lặp.

---

## 12. Nộp bài — khoảng 45 giây

**Thao tác:**

1. Bấm **Nộp bài**.
2. Xác nhận nộp.
3. Chỉ trạng thái lượt làm sau khi nộp.

**Lời nói:**

> Khi học sinh chọn nộp bài, hệ thống hoàn tất các yêu cầu lưu còn chờ, sau đó server xử lý nộp trong transaction. Ba loại câu khách quan gồm một đáp án, đúng–sai và trả lời ngắn được chấm tự động. Câu tự luận được chuyển sang chờ giáo viên chấm.
>
> Sau khi server xác nhận nộp thành công, bản localStorage của lượt làm mới được xóa. Học sinh chưa thể xem điểm ngay vì kết quả chỉ hiển thị sau khi giáo viên công bố.

---

## 13. Giáo viên chấm tự luận — khoảng 1 phút

**Thao tác:**

1. Chuyển lại cửa sổ giáo viên.
2. Mở đề → danh sách lượt làm.
3. Mở bài vừa nộp.
4. Chỉ điểm tự động của các câu khách quan.
5. Nhập điểm và nhận xét cho câu tự luận, sau đó lưu.

**Lời nói:**

> Em quay lại phía giáo viên. Trong danh sách lượt làm, giáo viên có thể xem trạng thái và chi tiết bài của từng học sinh.
>
> Các câu khách quan đã được hệ thống chấm tự động. Đối với câu đúng–sai bốn mệnh đề, hệ thống tính điểm theo số mệnh đề học sinh trả lời đúng. Đối với câu tự luận, giáo viên nhập điểm trong giới hạn điểm tối đa và có thể thêm nhận xét.
>
> Khi tất cả câu tự luận đã được chấm, lượt làm chuyển sang trạng thái đã chấm và sẵn sàng cho bước công bố kết quả.

---

## 14. Công bố kết quả và thống kê — khoảng 1 phút

**Thao tác:**

1. Mở chức năng công bố kết quả hoặc đề đã chuẩn bị sẵn đủ điều kiện.
2. Công bố kết quả.
3. Mở trang thống kê.

**Lời nói:**

> Hệ thống chỉ cho phép công bố kết quả khi đề đã qua giờ đóng, không còn lượt đang làm và các bài cần chấm đã được xử lý đầy đủ. Quy tắc này giúp tránh việc học sinh xem điểm hoặc đáp án trong khi kỳ thi vẫn diễn ra.
>
> Sau khi công bố, giáo viên có thể xem các thống kê cơ bản như số học sinh đã làm, điểm trung bình, điểm cao nhất, thấp nhất, phân bố điểm và tỷ lệ trả lời đúng theo từng câu. Biểu đồ được hiển thị bằng Chart.js và hỗ trợ giáo viên đánh giá kết quả cũng như chất lượng đề.

---

## 15. Học sinh xem kết quả — khoảng 30 giây

**Thao tác:**

1. Chuyển sang cửa sổ học sinh.
2. Mở **Kết quả bài thi**.
3. Chỉ tổng điểm, điểm từng câu và đáp án nếu được phép.

**Lời nói:**

> Sau khi giáo viên công bố, học sinh mới xem được tổng điểm, điểm của từng câu và nhận xét đối với phần tự luận. Nếu giáo viên bật tùy chọn cho xem đáp án, học sinh có thể đối chiếu đáp án và lời giải; nếu không, hệ thống chỉ hiển thị kết quả theo đúng cấu hình của đề.

---

## 16. Trình bày ngắn về kỹ thuật — khoảng 45 giây

**Màn hình:** Có thể quay về trang chủ hoặc mở nhanh cấu trúc mã nguồn nếu hội đồng muốn xem kỹ thuật.

**Lời nói:**

> Về mặt kỹ thuật, hệ thống được xây dựng theo mô hình ba tầng. Giao diện sử dụng EJS, HTML, CSS và JavaScript; server sử dụng Node.js và Express; cơ sở dữ liệu sử dụng MySQL với 15 bảng nghiệp vụ.
>
> Ở phía server, mã nguồn được tách theo Route, Controller, Service và Repository. Các nghiệp vụ quan trọng như tạo lượt, nộp bài và duyệt bù giờ dùng transaction. Hệ thống cũng sử dụng bcrypt để băm mật khẩu, session lưu trong MySQL, CSRF, Helmet, rate limit, validation và truy vấn SQL có tham số.
>
> Bộ regression tự động hiện có 60 trên 60 kiểm thử đạt. Ngoài ra, hệ thống có ảnh smoke test cho 18 màn hình chính và checklist 99 test case thủ công.

---

## 17. Kết luận — khoảng 45 giây

**Lời kết:**

> Qua phần trình bày, hệ thống đã thực hiện được đầy đủ quy trình từ quản lý lớp, ngân hàng câu hỏi, tạo và giao đề, học sinh làm bài, tự động lưu, nộp bài, chấm điểm đến công bố kết quả và thống kê.
>
> Kết quả quan trọng nhất của đề tài là cơ chế bảo vệ bài làm bằng ba lớp: lưu tạm trên trình duyệt, lưu chính thức trên server và kiểm soát phiên bản để ngăn dữ liệu cũ ghi đè dữ liệu mới. Cơ chế này giúp học sinh khôi phục bài sau khi mất mạng hoặc tải lại trang mà không thay đổi thứ tự câu hỏi.
>
> Phiên bản hiện tại vẫn còn một số hạn chế như mới phục vụ một giáo viên chủ hệ thống, chưa có ứng dụng di động, chưa có thông báo realtime và câu tự luận vẫn cần chấm thủ công. Trong tương lai, hệ thống có thể mở rộng cho nhiều giáo viên, nhiều môn học, bổ sung WebSocket, import câu hỏi và cải thiện trải nghiệm trên thiết bị di động.
>
> Phần trình bày sản phẩm của em đến đây là kết thúc. Em xin chân thành cảm ơn quý thầy cô đã lắng nghe và em xin tiếp thu các câu hỏi, nhận xét từ hội đồng.

---

## 18. Bản nói rút gọn khi chỉ có 7–8 phút

Nếu hội đồng giới hạn thời gian, chỉ thực hiện các phần sau:

1. Mở đầu tại trang chủ — 40 giây.
2. Giáo viên mở nhanh ngân hàng câu hỏi và công bố đề — 1 phút 20 giây.
3. Học sinh bắt đầu và trả lời câu hỏi — 1 phút.
4. Giải thích `localStorage` và `answerVersion` — 1 phút.
5. Demo Offline → Online — 1 phút.
6. Demo F5 khôi phục bài — 45 giây.
7. Nộp bài, giáo viên mở màn hình chấm — 1 phút.
8. Kết luận — 40 giây.

**Lược bỏ khi thiếu thời gian:** tạo lớp, tạo câu hỏi mới, báo sự cố thật, công bố kết quả trực tiếp và xem toàn bộ trang thống kê. Chỉ giới thiệu ngắn các phần này bằng lời.

---

## 19. Cách xử lý nếu demo gặp sự cố

### Server hoặc cơ sở dữ liệu không phản hồi

> Trong trường hợp môi trường demo vừa phát sinh lỗi kết nối, em xin sử dụng bộ ảnh giao diện đã chuẩn bị để tiếp tục trình bày đúng luồng của hệ thống.

Sau đó mở ảnh trong thư mục `screenshots/`, không cố sửa lỗi quá lâu trước hội đồng.

### Đề không xuất hiện ở tài khoản học sinh

Kiểm tra nhanh ba điều kiện: đề đã công bố, đã giao đúng lớp và hiện đang nằm trong thời gian cho phép.

### Không thấy trạng thái Offline

Chỉ vào nội dung vẫn còn trên màn hình và giải thích rằng dữ liệu đã được ghi vào localStorage; sau đó bật Online để trình diễn đồng bộ. Không dành quá nhiều thời gian thao tác DevTools.

### Không thể công bố kết quả trong buổi demo

> Hệ thống đang chặn thao tác vì đề chưa qua giờ đóng hoặc vẫn còn lượt chưa chấm. Đây là quy tắc nghiệp vụ có chủ đích để tránh công bố điểm khi kỳ thi chưa hoàn tất. Em xin chuyển sang một đề đã chuẩn bị đủ điều kiện để minh họa màn hình kết quả.

### Thao tác bị chậm

Không xin lỗi nhiều lần. Tiếp tục giải thích cơ chế đang diễn ra trong khi chờ trang phản hồi.

---

## 20. Những câu tuyệt đối nên nói đúng

- “Công bố đề và công bố kết quả là hai bước độc lập.”
- “localStorage là bản dự phòng; cơ sở dữ liệu trên server mới là nguồn dữ liệu chính thức.”
- “Server chỉ chấp nhận `answerVersion` mới hơn, nên request cũ không ghi đè được đáp án mới.”
- “Thứ tự câu được đóng băng khi bắt đầu lượt làm, vì vậy refresh không trộn lại câu.”
- “Thời gian server là căn cứ cuối cùng khi kiểm tra hạn lưu và hạn nộp.”
- “60/60 là kết quả regression test tự động; 99 test case là checklist kiểm thử thủ công đã xây dựng.”

## 21. Những điều không nên nói quá khả năng hiện có

- Không nói hệ thống vẫn gửi dữ liệu lên server trong lúc hoàn toàn mất mạng. Hãy nói dữ liệu được giữ cục bộ và gửi lại khi có mạng.
- Không nói localStorage bảo đảm tuyệt đối. Người dùng chủ động xóa dữ liệu trình duyệt vẫn có thể làm mất phần pending chưa đồng bộ.
- Không nói hệ thống đã dùng AI, OCR, WebSocket hoặc có ứng dụng mobile.
- Không nói 99 test case thủ công đều đã chạy và đạt nếu chưa có biên bản kết quả cho từng case.
- Không mô tả phiên bản V1 là hệ thống SaaS cho nhiều trường hoặc nhiều giáo viên độc lập.
