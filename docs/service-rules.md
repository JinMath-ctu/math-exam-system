# Quy tắc nghiệp vụ (Service Rules)

Tài liệu này là nguồn ràng buộc nghiệp vụ cho tầng service. Schema MySQL chỉ bảo đảm một phần; các quy tắc dưới đây **bắt buộc** được kiểm tra trong code.

## 1. Chỉnh sửa đề thi

- Chỉ sửa cấu trúc đề (câu hỏi, điểm, thứ tự, thời lượng, thời gian, giao lớp) khi `trang_thai = NHAP`.
- Sau `DA_CONG_BO` hoặc khi đã có lượt làm: **không** sửa cấu trúc đề.
- Không xóa vật lý `phan_cong_de` đã phát sinh lượt làm.

## 2. Quyền sở hữu và thành viên

- Giáo viên chỉ thao tác trên lớp, chủ đề, câu hỏi, đề thi do mình sở hữu.
- Học sinh chỉ bắt đầu / làm bài khi đang thuộc lớp (`thanh_vien_lop.trang_thai = DANG_HOC`) và đề đã được giao cho lớp đó.
- Không thao tác trên dữ liệu của người dùng khác.

## 3. Thời gian

- **Thời gian server** là nguồn chính xác (múi giờ `+07:00` / Asia/Ho_Chi_Minh).
- Hạn nộp gốc:

```
han_nop = MIN(
  thoi_gian_bat_dau_luot + thoi_luong_de,
  thoi_gian_ket_thuc_de
)
```

- Hạn nộp hiệu lực:

```
han_nop_hieu_luc = han_nop + thoi_gian_bo_sung_giay
```

- Không lưu đáp án sau hạn nộp hiệu lực.
- Client đồng hồ phải tính theo `serverTime` (offset), không tin tuyệt đối đồng hồ máy học sinh.

## 4. Đóng băng câu hỏi khi bắt đầu lượt

- Khi bắt đầu lượt: tạo `cau_hoi_luot_lam` với thứ tự (Fisher–Yates nếu `tron_cau_hoi`) và điểm đóng băng.
- **Không** trộn lại câu khi refresh.
- **Không** thêm/xóa/đổi điểm trong `cau_hoi_luot_lam` sau khi đã tạo.

## 5. Version đáp án (chống ghi đè)

- Mỗi lần client lưu: tăng `answer_version`.
- Nếu `answer_version` request **≤** bản trong database → **không ghi đè** và trả `OLD_ANSWER_VERSION`, ngoại trừ retry idempotent có cùng `client_request_id` và cùng version.
- Client chỉ retry sau `OLD_ANSWER_VERSION` khi state cục bộ hiện tại thực sự mới hơn payload vừa bị từ chối; không tăng version để gửi lại payload cũ.
- Kiểm tra version và ghi đáp án nằm trong cùng transaction đã khóa dòng lượt làm; không suy luận request cũ từ `affectedRows` của MySQL.
- `client_request_id` dùng cho retry idempotent, không unique toàn hệ thống.

## 6. Nộp bài

- Mỗi lượt chỉ nộp **một lần** (chỉ cập nhật khi `trang_thai = DANG_LAM`, kiểm tra `affectedRows`).
- Nộp thủ công phải chờ mọi debounce/pending/in-flight autosave hoàn tất; nếu còn save lỗi thì chưa gửi lệnh nộp.
- Save và submit khóa cùng dòng lượt làm theo cùng thứ tự để submit không chấm snapshot nằm giữa một lần lưu.
- Điểm phải **tính lại từ chi tiết**, không cộng dồn cộng lặp.
- Tự động nộp: client hết giờ + API kiểm tra quá hạn + job quét server 30–60 giây.

## 7. Chấm điểm

- MOT_DAP_AN: theo `la_dap_an_dung` của đáp án đã chọn (đúng hết điểm hoặc 0).
- DUNG_SAI: **4 mệnh đề** a–d; mỗi mệnh đề chọn Đúng/Sai. `dap_an.noi_dung` = nội dung mệnh đề; `la_dap_an_dung` = đáp án chuẩn là Đúng. Học sinh lưu JSON `{selections:{dapAnId:true|false}}` trong `noi_dung_tra_loi`. Thang điểm theo số mệnh đề sai (bỏ trống tính sai): 0→1.0×điểm, 1→0.5×, 2→0.25×, 3→0.1×, 4→0.
- TRA_LOI_NGAN: chuẩn hóa trim/khoảng trắng/chữ thường cho văn bản; với giá trị số chấp nhận thập phân (`0.5`/`0,5`), phân số (`1/2`), hỗn số (`1 1/2`) và các dạng tương đương; giáo viên có thể ghi nhiều đáp án chấp nhận cách nhau bằng `|`.
- TU_LUAN: giáo viên chấm; `0 <= diem_dat_duoc <= diem` đóng băng.
- Đề **không** có tự luận: sau nộp + chấm tự động → `DA_CHAM`.
- Đề **có** tự luận: sau nộp → `DA_NOP` / `TU_DONG_NOP`; chỉ → `DA_CHAM` khi giáo viên chấm đủ.

## 8. Sự cố và bù giờ

- Học sinh không tự nhập số giây bù.
- Duyệt bù giờ **bắt buộc dùng transaction**.
- Duyệt hai lần không được cộng giờ hai lần.
- Có thể mở lại bài nếu hợp lệ; ghi log `MO_LAI_SAU_SU_CO`.
- Không duyệt bù giờ hoặc mở lại lượt làm sau khi kết quả đề đã được công bố.

## 9. Heartbeat

- Cập nhật `last_seen_at` khoảng 30 giây/lần.
- **Không** ghi log HEARTBEAT cho mọi lần gọi.
- Khi khoảng gián đoạn lớn: có thể ghi `MAT_KET_NOI` / `KHOI_PHUC` và tạo sự cố tự động.

## 10. Kết quả

- Chỉ công bố kết quả khi không còn lượt `DANG_LAM`, không còn `DA_NOP`/`TU_DONG_NOP` chưa chấm, và không còn sự cố chờ xử lý.
- Sau giờ đóng đề: được công bố kể cả khi chưa có lượt làm.
- Trước giờ đóng đề: được công bố sớm nếu đã có bài `DA_CHAM` và mọi bài đã nộp đều đã chấm xong.
- Học sinh chỉ xem lượt `DA_CHAM` đã nộp sau `da_cong_bo_ket_qua = TRUE`.
- `cho_xem_dap_an` chỉ có hiệu lực sau khi đã công bố kết quả.
- Nếu học sinh có lượt `DANG_LAM` được mở lại cho cùng đề, tạm ẩn mọi kết quả cũ của đề đó để tránh lộ đáp án.

## 11. Xóa dữ liệu

- Xóa đề thi: chỉ khi `NHAP` hoặc `DA_HUY` (đề `DA_CONG_BO` phải hủy công bố trước). Nếu đã có lượt làm, hệ thống xóa luôn các `luot_lam_bai` và dữ liệu liên quan (điểm, log, sự cố) rồi mới xóa đề.
- Xóa câu hỏi: **chưa** có lịch sử làm bài và **không** thuộc đề `DA_CONG_BO`; gỡ khỏi đề nháp/đã hủy (đồng bộ lại `tong_diem`), xóa `dap_an` (CASCADE) rồi xóa bản ghi `cau_hoi`. Câu đã thi / thuộc đề công bố không xóa được — dùng sao chép để chỉnh sửa.
- Rời lớp / loại học sinh: cập nhật trạng thái, không DELETE cứng nếu cần giữ lịch sử.

## 12. Câu hỏi lịch sử

- Câu đã thuộc đề công bố hoặc đã có lịch sử làm bài: không sửa trực tiếp nội dung/đáp án.
- Sao chép thành câu mới khi cần sửa câu đã khóa (đã thi / thuộc đề công bố).
- Xóa cứng khi chưa có lịch sử làm bài và không thuộc đề `DA_CONG_BO`; nếu còn gắn đề nháp/đã hủy thì gỡ liên kết, cập nhật `tong_diem`, rồi xóa.

## 13. Lớp học

- Mã lớp duy nhất.
- Lớp `LUU_TRU` không nhận thành viên mới.
- Không cho học sinh rời lớp khi còn lượt `DANG_LAM` thuộc lớp đó.
- Thành viên đã rời có thể kích hoạt lại.
- Xóa lớp: chỉ khi **chưa có** `luot_lam_bai` thuộc lớp. Thành viên và `phan_cong_de` (chưa phát sinh lượt làm) bị gỡ theo CASCADE. Lớp đã có lịch sử làm bài chỉ được lưu trữ, không xóa cứng.

## 14. Múi giờ

- Node.js và MySQL thống nhất `+07:00`. Mỗi connection: `SET time_zone = '+07:00'`.
