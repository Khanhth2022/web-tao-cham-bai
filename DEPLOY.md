# Deploy "Lớp Số" (web-tao-cham-bai) lên web

Tài liệu này gồm 2 phần:

- **Phần A — Deploy lần đầu**: đưa app từ máy bạn lên internet.
- **Phần B — Deploy lại khi sửa code**: bạn sửa code trên máy, làm sao để bản trên web cập nhật.

Đọc lướt **Phần C — Những thứ phải nhớ** trước khi deploy thật, vì có 3 điểm dễ làm mất dữ liệu.

---

## App này gồm những gì

| Thành phần | File | Ghi chú |
|---|---|---|
| Giao diện (React + Vite) | `src/` | build ra `dist/` |
| API (Express) | `server.js` | phục vụ luôn `dist/` |
| Chấm điểm | `grading.js` | dùng chung cho web + test |
| Dữ liệu | `DATA_DIR` (mặc định `./data`) | `users.json`, `classes.json`, `assignments.json` |

App là **một process duy nhất**: `node server.js` vừa trả API vừa trả file giao diện đã build. Không cần tách frontend/backend riêng.

---

## Phần A — Deploy lần đầu

### A1. Chuẩn bị code

```bash
cd web-tao-cham-bai
npm install
cp .env.example .env      # Windows: copy .env.example .env
```

### A2. Tạo file `.env`

Mở `.env` và điền. **Bắt buộc đổi `ADMIN_PASSWORD`**, đừng để mật khẩu mẫu:

```env
PORT=3001
ADMIN_EMAIL=admin@lopso.vn
ADMIN_PASSWORD=<mật-khẩu-mạnh-của-bạn>
SESSION_SECRET=<chuỗi-ngẫu-nhiên-dài>
```

Tạo `SESSION_SECRET` bằng:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> **Quan trọng:** `ADMIN_PASSWORD` chỉ có tác dụng **lần đầu**, khi `users.json` chưa tồn tại. Nếu đã có `users.json`, server **không** ghi đè mật khẩu. Muốn đổi mật khẩu sau này thì dùng chức năng trong app, hoặc xoá `users.json` (sẽ mất hết tài khoản).

### A3. Build giao diện

```bash
npm run build
```

Lệnh này tạo thư mục `dist/`. `server.js` sẽ tự phục vụ thư mục đó.

### A4. Chạy thử ở máy

```bash
npm start
```

Mở http://localhost:3001 — đăng nhập bằng `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

### A5. Đưa lên internet

Chọn **một** trong hai cách. Cách 1 dễ hơn, cách 2 rẻ hơn.

#### Cách 1 — Render (có giao diện web, dễ nhất)

1. Đẩy code lên GitHub (nhớ `.gitignore` đã bỏ `.env` và `data/`).
2. Vào https://render.com → **New** → **Web Service** → chọn repo.
3. Điền:
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/api/health`
4. Mục **Environment** → thêm các biến: `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `SESSION_SECRET`.
5. Mục **Disks** → **Add Disk**:
   - **Mount Path**: `/var/data`
   - **Size**: 1 GB
6. Thêm biến môi trường `DATA_DIR=/var/data` ← **bước này bắt buộc**, xem Phần C.

Nhấn **Create Web Service**. Sau vài phút Render cho bạn địa chỉ dạng `https://ten-app.onrender.com`.

#### Cách 2 — VPS (tự quản, rẻ, chạy nhanh)

Trên VPS Ubuntu:

```bash
sudo apt update && sudo apt install -y nodejs npm nginx
sudo npm i -g pm2

# đưa code lên
git clone <repo-của-bạn> /var/www/lopso
cd /var/www/lopso
npm install && npm run build
cp .env.example .env && nano .env    # điền ADMIN_PASSWORD, SESSION_SECRET

sudo mkdir -p /var/data && sudo chown $USER /var/data
pm2 start server.js --name lopso --update-env
pm2 save && pm2 startup
```

Đặt `DATA_DIR=/var/data` trong `.env`.

Nginx làm proxy (để có HTTPS và cổng 80/443):

```nginx
server {
  listen 80;
  server_name ten-mien-cua-ban.com;

  location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Rồi `sudo certbot --nginx -d ten-mien-cua-ban.com` để lấy HTTPS miễn phí.

### A6. Kiểm tra sau khi deploy

```bash
curl https://ten-app-cua-ban/api/health
# phải trả: {"ok":true,"service":"classmate-grader-api",...}
```

Rồi mở trình duyệt, đăng nhập, tạo thử 1 lớp + 1 bài tập để chắc chắn ghi được dữ liệu.

---

## Phần B — Deploy lại khi bạn sửa code

Câu hỏi: *"tôi sửa code chính mình thì deploy lại thế nào?"*

Nguyên tắc: **giao diện phải build lại, API chỉ cần restart**. Vì `src/` được biên dịch thành `dist/`, còn `server.js` chạy thẳng.

### B1. Sửa ở máy và kiểm tra

```bash
cd web-tao-cham-bai

# sửa code...

npm test          # chạy toàn bộ test
npm run build     # build lại giao diện  ← BẮT BUỘC nếu sửa src/
npm start         # mở http://localhost:3001 xem thử
```

Nếu chỉ sửa `server.js` hoặc `grading.js` thì vẫn nên `npm run build` cho chắc — build chỉ mất ~0.5 giây.

### B2. Đưa lên

#### Nếu deploy bằng Render

```bash
git add .
git commit -m "sửa chấm điểm"
git push
```

Render **tự động** phát hiện commit mới, chạy lại `npm install && npm run build`, rồi khởi động lại. Bạn không phải làm gì thêm. Theo dõi ở tab **Logs**.

> Dữ liệu **không** mất khi deploy lại, miễn là bạn đã đặt `DATA_DIR` trỏ vào Disk (Phần A5 bước 6). Render xoá sạch thư mục code mỗi lần deploy — chỉ Disk là còn.

#### Nếu deploy bằng VPS

```bash
ssh user@vps-cua-ban
cd /var/www/lopso
git pull
npm install          # chỉ cần khi bạn thêm/bớt thư viện
npm run build        # build lại giao diện
pm2 restart lopso    # khởi động lại API
```

Lệnh gộp, dùng khi bạn chỉ sửa giao diện:

```bash
cd /var/www/lopso && git pull && npm run build && pm2 restart lopso
```

### B3. Sau khi deploy lại

- Mở web và **nhấn Ctrl+F5** (hard refresh). Trình duyệt hay giữ file JS cũ trong cache, dễ tưởng là deploy lỗi.
- Nếu giao diện không đổi, đó gần như luôn là cache trình duyệt, không phải lỗi deploy.

---

## Phần C — Những thứ phải nhớ

### 1. `DATA_DIR` — đặt sai là mất sạch dữ liệu

Mặc định app ghi vào `./data` **nằm trong thư mục code**. Trên các nền tảng như Render, mỗi lần deploy là thư mục code bị xoá và tạo lại → **mất hết tài khoản, lớp, bài tập**.

Cách chữa: tạo Disk (ổ đĩa riêng, không bị xoá) và trỏ `DATA_DIR` vào đó:

```env
DATA_DIR=/var/data
```

Server in ra dòng này lúc khởi động để bạn kiểm tra:

```
Dữ liệu đang lưu tại: /var/data
```

**Hãy đọc dòng đó trong Logs.** Nếu nó ghi đường dẫn nằm trong thư mục code thì dữ liệu của bạn đang gặp nguy hiểm.

### 2. `.env` không được đẩy lên GitHub

`.env` chứa `ADMIN_PASSWORD` và `SESSION_SECRET`. Kiểm tra `.gitignore` có `.env` trước khi `git push`. Trên Render/VPS thì khai báo biến trong phần Environment, không dùng file.

### 3. Sao lưu dữ liệu

Toàn bộ dữ liệu là 3 file JSON trong `DATA_DIR`. Sao lưu định kỳ:

```bash
# VPS
tar czf backup-$(date +%F).tar.gz /var/data
```

### 4. Đổi `SESSION_SECRET` là đăng xuất tất cả

Mọi người dùng sẽ phải đăng nhập lại. Không sao, chỉ cần biết trước.

---

## Chạy test

```bash
npm test
```

Kết quả mong đợi: **12/12 pass** (10 test chấm điểm + page-selection + quiz-response).

Nếu gặp lỗi `spawn EPERM` (một số môi trường bị chặn tạo tiến trình con):

```bash
npm run test:nospawn
```

---

## Xử lý sự cố

| Hiện tượng | Nguyên nhân thường gặp | Cách sửa |
|---|---|---|
| Deploy xong mở web thấy lỗi cũ | Cache trình duyệt | Ctrl+F5 |
| Mất sạch dữ liệu sau deploy | `DATA_DIR` chưa trỏ vào Disk | Đặt `DATA_DIR=/var/data`, deploy lại |
| Đăng nhập không được sau deploy | Đổi `ADMIN_PASSWORD` nhưng `users.json` đã tồn tại | Dùng mật khẩu cũ, hoặc xoá `users.json` |
| `/api/health` không trả về | Sai Start Command | Phải là `npm start` |
| Giao diện trắng, API vẫn chạy | Chưa `npm run build` | Chạy `npm run build` rồi deploy lại |
| Upload ảnh báo `Unexpected file field` | Sai tên field | Field phải tên là `image` |

---

## Tóm tắt một dòng

**Lần đầu:** `npm install` → điền `.env` → `npm run build` → tạo Disk + `DATA_DIR` → deploy.
**Mỗi lần sửa code:** `npm test` → `npm run build` → `git push` (Render tự lo) hoặc `git pull && npm run build && pm2 restart lopso` (VPS).
