# Screenshots giao diện JinMath

Ảnh chụp tự động phục vụ báo cáo niên luận (2026-08-06).

| File | Mô tả |
|------|--------|
| `01-trang-chu.png` | Trang chủ |
| `02-dang-nhap.png` | Đăng nhập |
| `03-dang-ky-hoc-sinh.png` | Đăng ký học sinh |
| `04-gv-dashboard.png` | Dashboard giáo viên |
| `05-gv-lop-hoc.png` | Quản lý lớp |
| `06-gv-ngan-hang-cau-hoi.png` | Ngân hàng câu hỏi |
| `07-gv-tao-cau-hoi.png` | Tạo câu hỏi |
| `08-gv-danh-sach-de.png` | Danh sách đề thi |
| `09-gv-chi-tiet-de.png` | Chi tiết đề (nháp) |
| `10-hs-dashboard.png` | Dashboard học sinh |
| `11-hs-lop-hoc.png` | Lớp của học sinh |
| `12-hs-de-thi.png` | Đề thi học sinh |
| `13-gv-su-co.png` | Sự cố thi (GV) |
| `14-gv-thong-ke.png` | Thống kê đề |
| `15-gv-luot-lam.png` | Danh sách lượt làm |
| `16-hs-ket-qua.png` | Kết quả học sinh |
| `17-hs-chi-tiet-de.png` | Chi tiết đề (HS) |
| `18-hs-phong-thi.png` | Phòng thi đang làm |

Chụp lại:

```bash
node scripts/ensure-demo-accounts.js
node scripts/ensure-demo-exam-data.js
node scripts/capture-screenshots.js
node scripts/capture-screenshots-student.js
node scripts/capture-screenshots-extra.js
```
