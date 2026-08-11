# Báo cáo JinMath

- `bao-cao.md` — mã nguồn Markdown (chỉnh sửa tại đây)
- `bao-cao.pdf` — bản nộp (đã xuất)
- `bao-cao.html` — bản trung gian khi xuất bằng Chrome
- `bao-cao-outline.md` — dàn ý gốc

## Xuất lại PDF (không cần Pandoc)

Từ thư mục gốc dự án (đã `npm install`):

```powershell
npm run demo:pdf
```

Script dùng Chrome/Edge headless (`puppeteer-core`) để in `bao-cao.md` → PDF A4.

## Cách khác (Pandoc)

```powershell
pandoc .\report\bao-cao.md -o .\report\bao-cao.pdf --pdf-engine=xelatex -V mainfont="Times New Roman"
```

Chèn thêm ảnh từ `screenshots/` vào Word/PDF nếu hội đồng yêu cầu minh họa trong thân báo cáo.
