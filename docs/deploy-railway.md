# Deploy JinMath lên Railway (demo thuyết trình)

Hướng dẫn deploy **Node.js + MySQL** cho hệ thống kiểm tra Toán. Phù hợp demo bảo vệ khi cần URL public.

## 0. Chuẩn bị

- Tài khoản [Railway](https://railway.app) (đăng nhập bằng GitHub)
- Repo GitHub chứa project (khuyến nghị: push thư mục `math-exam-system`)
- Máy local còn MySQL client (để import `database/demo-backup.sql`)

Đã chỉnh trong source để deploy ổn hơn:

- `app.listen(..., '0.0.0.0')` — lắng nghe mọi interface trong container
- `database.js` nhận cả `DB_*` và biến Railway `MYSQL*`

## 1. Đẩy code lên GitHub

Trong thư mục `math-exam-system` (hoặc repo cha, nhớ set Root Directory ở bước sau):

```powershell
git status
git add .
git commit -m "Prepare deploy for Railway"
git push origin main
```

**Không** commit file `.env`.

## 2. Tạo project trên Railway

1. Vào [railway.app/new](https://railway.app/new)
2. **Deploy from GitHub repo** → chọn repo
3. Nếu repo là monorepo (có thư mục ngoài `math-exam-system`):  
   Service → **Settings** → **Root Directory** = `math-exam-system`
4. **Settings → Deploy**:
   - Start Command: `npm start` (mặc định từ `package.json` là đủ)
   - Không cần Build Command riêng (`npm install` Railway tự chạy)

## 3. Thêm MySQL

1. Trong cùng project: **New** → **Database** → **MySQL**
2. Đợi MySQL provision xong
3. Vào service **web app** → **Variables** → **Add Variable** / **Variable Reference**

Gán như sau (tên service MySQL phải khớp — thường là `MySQL`):

| Variable | Giá trị |
|----------|---------|
| `NODE_ENV` | `production` |
| `PORT` | *(để trống — Railway tự inject)* |
| `SESSION_SECRET` | chuỗi ≥ 32 ký tự (xem lệnh bên dưới) |
| `DB_HOST` | `${{MySQL.MYSQLHOST}}` |
| `DB_PORT` | `${{MySQL.MYSQLPORT}}` |
| `DB_USER` | `${{MySQL.MYSQLUSER}}` |
| `DB_PASSWORD` | `${{MySQL.MYSQLPASSWORD}}` |
| `DB_NAME` | `web_kiem_tra_toan` |
| `DB_TIMEZONE` | `+07:00` |

Tạo `SESSION_SECRET` trên máy:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> **Quan trọng:** App và file SQL dùng database tên `web_kiem_tra_toan`. Đặt `DB_NAME=web_kiem_tra_toan` (không dùng tên mặc định `railway` của plugin), rồi import SQL ở bước 5 để tạo DB đó.

SMTP (quên mật khẩu) **không bắt buộc** cho demo. Có thể bỏ trống.

## 4. Bật domain public cho web

1. Service web → **Settings** → **Networking** → **Generate Domain**
2. Ghi lại URL dạng `https://xxx.up.railway.app`
3. (Tuỳ chọn) Healthcheck path: `/health`

Redeploy sau khi thêm biến môi trường.

## 5. Import database (demo data)

Railway MySQL mặc định chưa có bảng/dữ liệu demo. Cần import `database/demo-backup.sql`.

### Cách A — TCP Proxy + mysql local (dễ nhất)

1. Service **MySQL** → **Settings** → **Networking** → **TCP Proxy** → Enable  
2. Copy host/port public (ví dụ `xxx.proxy.rlwy.net` + port)
3. Trên máy, từ thư mục project:

```powershell
# Thay HOST, PORT, USER, PASS bằng thông tin TCP Proxy / Variables của MySQL
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" `
  -h HOST -P PORT -u USER -pPASS `
  --default-character-set=utf8mb4 `
  -e "source database/demo-backup.sql"
```

Hoặc:

```powershell
Get-Content database\demo-backup.sql -Raw -Encoding UTF8 |
  & "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -h HOST -P PORT -u USER -pPASS --default-character-set=utf8mb4
```

File này sẽ `CREATE DATABASE web_kiem_tra_toan` + bảng + seed (GV/HS mật khẩu `123456`).

4. Sau khi import xong **nên tắt TCP Proxy** (bảo mật) nếu không còn cần kết nối từ ngoài.

### Cách B — Railway CLI

```powershell
npm i -g @railway/cli
railway login
railway link
# Chọn project + service MySQL
railway connect mysql
# Trong shell mysql: source /path/... (hoặc paste SQL)
```

## 6. Kiểm tra deploy

1. Mở `https://YOUR-APP.up.railway.app/health`  
   Kỳ vọng: `"database":"connected"`
2. Trang chủ mở được
3. Đăng nhập:
   - GV: `teacher@example.com` / `123456`
   - HS: `studenta@example.com` / `123456`

Nếu deploy fail, xem **Deployments → View Logs**:

| Lỗi log | Nguyên nhân thường gặp |
|---------|------------------------|
| `SESSION_SECRET phải được cấu hình...` | Thiếu / secret < 32 ký tự |
| `Access denied` / `ECONNREFUSED` | Sai `DB_*` hoặc chưa reference MySQL |
| `Unknown database 'web_kiem_tra_toan'` | Chưa import SQL hoặc sai `DB_NAME` |
| Crash loop | Xem stack; thường do DB chưa sẵn sàng — Redeploy sau khi MySQL healthy |

## 7. Lưu ý khi demo trên Railway

- **Uploads ảnh câu hỏi** nằm trên disk container → mất khi redeploy (seed text vẫn ổn). Cần giữ ảnh lâu dài thì gắn Railway Volume vào `/app/uploads` (tuỳ chọn).
- **Công bố đề / giờ thi:** chỉnh thời gian đề trên UI hoặc SQL qua TCP proxy trước buổi thuyết trình (xem `docs/demo-script.md`).
- Gói free/hobby Railway có thể **sleep** khi không traffic — mở URL trước 1–2 phút.
- Chi phí: MySQL + Web = 2 service; theo dõi usage trên dashboard.

## 8. Checklist trước thuyết trình

- [ ] `/health` → database connected  
- [ ] Login GV + HS OK  
- [ ] Đề demo công bố được / giờ còn hạn  
- [ ] 2 profile Chrome (GV / HS)  
- [ ] Plan B: `npm start` local + screenshots nếu Railway chậm  

## Tài khoản demo

| Vai trò | Email | Mật khẩu |
|---------|-------|----------|
| Giáo viên | `teacher@example.com` | `123456` |
| Học sinh A | `studenta@example.com` | `123456` |
| Học sinh B | `studentb@example.com` | `123456` |
