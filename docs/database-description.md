# Mô tả cơ sở dữ liệu

Database: `web_kiem_tra_toan`  
Charset: `utf8mb4` / `utf8mb4_unicode_ci`  
MySQL: >= 8.0.16 (CHECK được thực thi)

## 15 bảng nghiệp vụ

| # | Bảng | Vai trò |
|---|------|---------|
| 1 | nguoi_dung | Tài khoản giáo viên / học sinh |
| 2 | lop_hoc | Lớp do giáo viên tạo |
| 3 | thanh_vien_lop | Thành viên lớp (N-N) |
| 4 | chu_de | Chủ đề câu hỏi |
| 5 | cau_hoi | Ngân hàng câu hỏi |
| 6 | dap_an | Đáp án lựa chọn (MOT_DAP_AN, DUNG_SAI) |
| 7 | de_thi | Đề thi |
| 8 | cau_hoi_de_thi | Câu trong đề + điểm + thứ tự gốc |
| 9 | phan_cong_de | Giao đề cho lớp |
| 10 | luot_lam_bai | Lượt làm của học sinh |
| 11 | cau_hoi_luot_lam | Thứ tự & điểm đóng băng theo lượt |
| 12 | chi_tiet_bai_lam | Đáp án học sinh + version |
| 13 | nhat_ky_thi | Log sự kiện làm bài |
| 14 | su_co_bai_thi | Báo cáo sự cố / bù giờ |
| 15 | dat_lai_mat_khau | Mã xác nhận quên mật khẩu (hash, hết hạn, đã dùng) |

> Bảng `sessions` (nếu có) do `express-mysql-session` tạo — **không** thuộc 15 bảng nghiệp vụ.

## Quan hệ chính

- `nguoi_dung` 1–N `lop_hoc`
- `lop_hoc` N–N `nguoi_dung` qua `thanh_vien_lop`
- `nguoi_dung` 1–N `cau_hoi`
- `chu_de` 1–N `cau_hoi`
- `de_thi` N–N `cau_hoi` qua `cau_hoi_de_thi`
- `de_thi` N–N `lop_hoc` qua `phan_cong_de`
- `luot_lam_bai` 1–N `cau_hoi_luot_lam`
- `luot_lam_bai` 1–N `chi_tiet_bai_lam`
- `luot_lam_bai` 1–N `nhat_ky_thi`
- `luot_lam_bai` 1–N `su_co_bai_thi`
- `nguoi_dung` 1–N `dat_lai_mat_khau`

## FK ghép quan trọng

- `luot_lam_bai(de_thi_id, lop_hoc_id)` → `phan_cong_de`
- `chi_tiet_bai_lam(luot_lam_bai_id, cau_hoi_id)` → `cau_hoi_luot_lam`
- `chi_tiet_bai_lam(cau_hoi_id, dap_an_da_chon_id)` → `dap_an`

## Thứ tự chạy

```bash
mysql -u root -p < database/reset-schema.sql
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
```

Không gộp reset với seed.

## Tài khoản seed

| Email | Mật khẩu | Vai trò |
|-------|----------|---------|
| teacher@example.com | 123456 | GIAO_VIEN |
| studenta@example.com | 123456 | HOC_SINH |
| studentb@example.com | 123456 | HOC_SINH |

Đề demo: 4 câu, tổng điểm 5.00, trạng thái NHAP (cần công bố qua giao diện để thi).
