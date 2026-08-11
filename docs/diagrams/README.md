# Bộ sơ đồ dùng cho báo cáo JinMath

Tổng cộng **15 sơ đồ**:

- **4 Use Case UML:** tổng quan, giáo viên, học sinh và phòng thi.
- **10 sơ đồ tuần tự:** các luồng nghiệp vụ chính từ đăng nhập đến tạo câu hỏi.
- **1 sơ đồ phân rã chức năng:** mức 0–2 của toàn hệ thống.

## 4 sơ đồ Use Case

| Mã | Nội dung | SVG | PNG | Nguồn |
|---|---|---|---|---|
| UCD-01 | Tổng quan hệ thống | `ucd-01-overview.svg` | `ucd-01-overview.png` | `ucd-01-overview.puml` |
| UCD-02 | Góc nhìn Giáo viên | `ucd-02-teacher.svg` | `ucd-02-teacher.png` | `ucd-02-teacher.puml` |
| UCD-03 | Góc nhìn Học sinh | `ucd-03-student.svg` | `ucd-03-student.png` | `ucd-03-student.puml` |
| UCD-04 | Phòng thi trực tuyến | `ucd-04-exam-taking.svg` | `ucd-04-exam-taking.png` | `ucd-04-exam-taking.puml` |

## 10 sơ đồ tuần tự

Ảnh và nguồn Mermaid nằm trong thư mục `sequence/`:

| Mã | Nội dung | Tên file cơ sở |
|---|---|---|
| SD-01 | Đăng nhập và tạo session | `sd-01-login` |
| SD-02 | Tạo đề → giao lớp → công bố | `sd-02-create-assign-publish-exam` |
| SD-03 | Bắt đầu lượt + đóng băng câu | `sd-03-start-attempt-freeze-questions` |
| SD-04 | Autosave và `answerVersion` | `sd-04-autosave-answer-version` |
| SD-05 | Khôi phục offline/online | `sd-05-restore-offline-online` |
| SD-06 | Nộp bài và chấm tự động | `sd-06-submit-auto-grade` |
| SD-07 | Chấm tự luận và công bố kết quả | `sd-07-essay-grade-publish-results` |
| SD-08 | Báo sự cố và bù giờ | `sd-08-incident-compensation` |
| SD-09 | Tham gia lớp bằng mã | `sd-09-join-class` |
| SD-10 | Tạo câu hỏi bốn loại | `sd-10-create-question` |

Mỗi tên file có ba định dạng: `.mmd` để chỉnh sửa, `.svg` để chèn Word/PDF với
độ nét tốt nhất và `.png` để dùng khi phần mềm không hỗ trợ SVG.

## Sơ đồ phân rã chức năng

- Nguồn Mermaid: `functional-decomposition.mmd`.
- Ảnh: `functional-decomposition.svg` và `functional-decomposition.png`.
- Nội dung giải thích: `../functional-decomposition.md`.

## Xem và xuất lại

- Mở `../diagram-catalog-preview.html` để xem toàn bộ 15 sơ đồ trên một trang.
- Chạy `npm run diagrams:export` để tách nguồn và xuất lại ảnh sequence/phân rã.
- Nội dung sequence gốc được quản lý tại `../sequence-diagrams.md`.
- Nội dung Use Case được quản lý tại `../use-case-diagrams.md` và các file `.puml`.

