# Hướng dẫn deploy lên Render — Lớp Số (web-tao-cham-bai)

Tài liệu này hướng dẫn **từng bước một** cách đưa app lên Render, dành cho người chưa từng dùng Render.

Đọc theo thứ tự. Đừng nhảy cóc qua **Bước 0**, vì lựa chọn ở đó quyết định toàn bộ phần còn lại.

---

## Bước 0 — Quyết định trước: bạn cần giữ dữ liệu không?

Đây là câu hỏi quan trọng nhất, vì app này **lưu dữ liệu vào file trên ổ đĩa của server** (`users.json`, `classes.json`, `assignments.json` trong thư mục `DATA_DIR`).

Render mặc định **xoá sạch ổ đĩa mỗi lần deploy**. Muốn giữ dữ liệu thì phải gắn thêm **Persistent Disk** — và **Disk chỉ gắn được cho gói trả phí**.

| | **Gói Free (0đ)** | **Gói trả phí (~7 USD/tháng)** |
|---|---|---|
| Gắn được Disk | ❌ Không | ✅ Có |
| Dữ liệu khi deploy lại | **MẤT HẾT** | Giữ nguyên |
| Dữ liệu khi service ngủ | **MẤT HẾT** | Không ngủ |
| Service ngủ khi rảnh | ⚠️ Ngủ sau **15 phút** không ai truy cập | Không ngủ |
| Thời gian "thức dậy" | ~1 phút (khách thấy trang chờ) | Tức thì |
| Zero-downtime deploy | ✅ Có | ❌ **Mất** (web chết vài giây mỗi lần deploy) |
| Phù hợp với | Thử nghiệm, demo, cho người khác xem giao diện | Dùng thật, có học sinh dùng thường xuyên |

**Chọn theo tình huống của bạn:**

- *"Tôi chỉ muốn xem app chạy trên mạng trông thế nào"* → Chọn **Free**, làm **Phần A**. Biết trước là dữ liệu sẽ mất.
- *"Tôi muốn giáo viên/học sinh dùng thật, dữ liệu phải còn"* → Chọn **trả phí**, làm **Phần B**. Không có cách nào khác: Free không gắn được Disk.

> Có một hướng thứ ba không tốn tiền Render: deploy lên **VPS** (thuê server ảo ~5 USD/tháng, tự quản). Xem `DEPLOY.md` Cách 2. VPS cũng có ổ đĩa thật nên dữ liệu không mất.

---

## Phần A — Deploy gói Free (0 đồng), từng bước

### A0. Điều kiện cần

1. **Tài khoản GitHub** (miễn phí) — https://github.com/signup
2. **Tài khoản Render** (miễn phí) — https://dashboard.render.com/register (đăng ký bằng chính tài khoản GitHub cho nhanh)
3. **Mã nguồn app** đang nằm trong `C:\Users\dell\Documents\PTUD\web-tao-cham-bai`
4. **DeepSeek API key** — chuỗi `sk-...` để app đọc ảnh đề thi. Không có thì app vẫn chạy nhưng chức năng "quét ảnh thành đề" báo lỗi.

### A1. Đưa code lên GitHub

Kiểm tra trước xem `.env` có bị đẩy nhầm không:

```powershell
cd C:\Users\dell\Documents\PTUD\web-tao-cham-bai
git status
```

Trong danh sách file, **không được** thấy `.env` hay thư mục `data/`. File `.gitignore` trong repo đã chặn hai thứ này rồi; nếu vẫn thấy thì dừng lại, đừng push.

Tạo repo rỗng trên GitHub (đặt tên ví dụ `lopso`), rồi:

```powershell
git add .
git commit -m "Chuan bi deploy len Render"
git branch -M main
git remote add origin https://github.com/<tên-tài-khoản-của-bạn>/lopso.git
git push -u origin main
```

> Nếu `git remote add` báo `remote origin already exists`, dùng `git remote set-url origin <địa-chỉ-mới>`.
>
> Khi push, GitHub sẽ hỏi mật khẩu. GitHub **không** nhận mật khẩu tài khoản nữa — bạn cần **Personal Access Token** (Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token, tick ô `repo`). Dán token đó vào chỗ mật khẩu. Hoặc cài GitHub Desktop / dùng `gh auth login` cho đỡ phiền.

### A2. Tạo Web Service trên Render

1. Vào https://dashboard.render.com/
2. Bấm **+ New** (góc trên bên phải) → chọn **Web Service**
3. Nếu chưa liên kết GitHub, bấm **Configure account** / **Connect GitHub** và cho phép Render đọc repo của bạn. Sau đó danh sách repo hiện ra.
4. Tìm repo `lopso` → bấm **Connect**
5. Điền form cấu hình:

| Ô | Điền gì | Ghi chú |
|---|---|---|
| **Name** | `lopso` | Tên này thành địa chỉ web: `https://lopso.onrender.com`. Phải là duy nhất trên toàn Render — nếu trùng thì thêm số, ví dụ `lopso-cua-toi`. |
| **Region** | `Singapore` | Gần Việt Nam nhất → tải nhanh nhất. |
| **Branch** | `main` | |
| **Root Directory** | *(để trống)* | Code nằm ở gốc repo nên không cần điền. |
| **Language / Runtime** | `Node` | |
| **Build Command** | `npm install` | **Không** cần thêm `&& npm run build`. Lý do: `package.json` đã có `"postinstall": "npm run build"`, nên `npm install` tự build giao diện luôn. |
| **Start Command** | `npm start` | |
| **Instance Type / Compute** | **Free** | Kéo xuống dưới, chọn gói Free. |

6. Mở mục **Advanced** (nếu có) → ô **Health Check Path**, điền `/api/health`.

7. Kéo xuống mục **Environment Variables** → bấm **+ Add Environment Variable**, thêm 5 biến:

| Key | Value | Bắt buộc |
|---|---|---|
| `ADMIN_EMAIL` | `admin@lopso.vn` (hoặc email bạn muốn) | |
| `ADMIN_PASSWORD` | mật khẩu mạnh của bạn | ✅ **≥ 12 ký tự** |
| `DEEPSEEK_API_KEY` | `sk-...` của bạn | ✅ (nếu muốn dùng chức năng quét ảnh) |
| `DEEPSEEK_BASE_URL` | `https://api.xompet.io.vn/v1` | |
| `DEEPSEEK_VISION_MODEL` | `deepseek-v4-flash-vision-exp` | |

> ⚠️ **`ADMIN_PASSWORD` phải từ 12 ký tự trở lên.** Nếu ngắn hơn (hoặc bạn quên biến này), server sẽ **crash ngay khi khởi động** với dòng log:
> `Cấu hình ADMIN_PASSWORD tối thiểu 12 ký tự trong .env để tạo tài khoản gia sư.`
> Deploy sẽ báo **Failed**. Đây là lỗi phổ biến nhất khi deploy lần đầu.
>
> ⚠️ **KHÔNG khai báo `DATA_DIR`** trên gói Free. Không có Disk để trỏ vào, khai báo cũng vô ích.

8. **Không** bấm vào mục **Disks** — gói Free không có mục này (hoặc có nhưng sẽ báo lỗi khi lưu).

9. Bấm **Create Web Service** (nút ở cuối form).

### A3. Theo dõi deploy

Render tự chuyển sang trang **Logs** và bắt đầu chạy. Bạn sẽ thấy lần lượt:

```
==> Cloning from https://github.com/...
==> Running build command 'npm install'...
...
Dữ liệu đang lưu tại: /opt/render/project/src/data      ← xem dòng này
...
==> Running 'npm start'
==> Your service is live 🎉
```

Khi thấy **`Your service is live 🎉`** và trạng thái ở góc trên là **Live** (màu xanh) — xong.

Lần đầu thường mất **2–4 phút**. Nếu trạng thái thành **Failed** (màu đỏ), đọc phần **Xử lý sự cố** ở cuối tài liệu.

⚠️ Để ý dòng `Dữ liệu đang lưu tại:`. Trên gói Free nó sẽ là đường dẫn **nằm trong thư mục code** (`/opt/render/project/src/data`) — nghĩa là dữ liệu sẽ mất khi deploy lại. Đó là điều đã biết trước ở Bước 0, không phải lỗi.

### A4. Mở web và kiểm tra

1. Địa chỉ web ở góc trên trang service: `https://lopso.onrender.com` (bấm vào để mở).
2. **Lần truy cập đầu sau khi service ngủ sẽ chậm** — Render hiện trang "spinning up", chờ khoảng 1 phút là vào.
3. Đăng nhập bằng đúng `ADMIN_EMAIL` / `ADMIN_PASSWORD` bạn đã điền ở A2 bước 7.
4. Tạo thử 1 lớp + 1 bài tập để chắc chắn app ghi được dữ liệu.
5. Kiểm tra API bằng trình duyệt: mở `https://lopso.onrender.com/api/health` — phải thấy:
   ```json
   {"ok":true,"service":"classmate-grader-api",...}
   ```

### A5. Điều bạn phải chấp nhận với gói Free

1. **Ai đó mở web sau 15 phút vắng khách → chờ ~1 phút.** Không sửa được. Đây là cơ chế của Render Free.
2. **Mỗi lần deploy lại = mất sạch tài khoản, lớp, bài tập.** Vì thư mục code bị xoá và tạo lại. Tài khoản admin được tạo lại từ `ADMIN_PASSWORD` trong Environment Variables, nhưng mọi thứ bạn tạo trong app thì mất.
3. **Service có thể tự ngủ/khởi động lại bất cứ lúc nào** → cũng mất dữ liệu.
4. **750 giờ Free/tháng cho mỗi workspace.** Service đang ngủ không tính giờ, nên dùng bình thường không lo hết.
5. Render có thể **tạm ngưng** service Free nếu nó tự gọi API ra ngoài quá nhiều (app này gọi DeepSeek Vision mỗi lần quét ảnh — dùng nhiều có thể chạm ngưỡng).

Nếu 5 điều trên là không chấp nhận được → làm **Phần B**.

---

## Phần B — Deploy gói trả phí (giữ được dữ liệu)

Khác Phần A ở đúng **2 chỗ**: chọn Compute là gói trả phí, và gắn thêm **Disk** + biến `DATA_DIR`.

### B1. Làm y hệt A1 → A2

Chỉ khác ở bước 5:

| Ô | Điền gì |
|---|---|
| **Instance Type / Compute** | Chọn **Starter** (hoặc gói trả phí rẻ nhất). **Không** chọn Free. |
| Build / Start Command | Giữ nguyên `npm install` và `npm start` |

Ở bước 7 (Environment Variables), thêm **đủ 6 biến** — thêm một biến nữa so với Phần A:

| Key | Value |
|---|---|
| `DATA_DIR` | `/var/data` ← **biến thứ 6, chỉ có ở Phần B** |

### B2. Gắn Disk

Có 2 cách làm — chọn 1.

**Cách B2a — qua giao diện (làm ngay khi tạo service):**

1. Trong form tạo service, kéo xuống cuối, bấm **Advanced**
2. Tìm mục **Disks** → bấm **Add Disk**
3. Điền:
   - **Name**: `lopso-data`
   - **Mount Path**: `/var/data` ← **phải giống hệt `DATA_DIR`**
   - **Size**: `1 GB` (đủ cho hàng nghìn bài tập dạng JSON; sau này tăng được, nhưng **không giảm** được)
4. Bấm **Add Disk** để xác nhận

**Cách B2b — sau khi service đã tạo:**

1. Vào trang service → tab **Disks** (menu bên trái)
2. Điền **Mount Path** `/var/data`, **Size** `1 GB` → **Add disk**
3. Render **tự deploy lại** một lần để gắn đĩa. Chờ nó chạy xong.

> ⚠️ Nếu service đã tạo mà chưa có `DATA_DIR`, thêm biến đó ở tab **Environment** rồi bấm **Save Changes** — Render sẽ deploy lại.
>
> ⚠️ **Mount Path và `DATA_DIR` phải khớp từng ký tự.** Lệch một chữ là dữ liệu ghi vào thư mục code và mất sạch mỗi lần deploy, trong khi bạn tưởng đã an toàn.

### B3. Kiểm tra đã ăn Disk chưa

Đây là bước xác minh quan trọng nhất, đừng bỏ qua.

1. Vào tab **Logs** của service
2. Tìm dòng `Dữ liệu đang lưu tại:`
3. Nó phải ghi **`Dữ liệu đang lưu tại: /var/data`**

Nếu vẫn ghi đường dẫn có `project/src` → `DATA_DIR` chưa được nhận. Kiểm tra lại tên biến (đúng `DATA_DIR`, không có khoảng trắng) rồi deploy lại.

4. Tạo thử 1 lớp + 1 bài tập.
5. Vào tab **Manual Deploy** → **Deploy latest commit**. Chờ deploy xong.
6. Mở lại web, đăng nhập, kiểm tra lớp và bài tập **vẫn còn**. Nếu còn → Disk hoạt động đúng.

### B4. Điều bạn phải chấp nhận với gói trả phí

**Mất zero-downtime deploy.** Zero-downtime cần Render dựng instance mới chạy song song rồi mới tắt instance cũ — tức là cần 2 instance cùng lúc. Nhưng Render **không cho gắn Disk vào service chạy nhiều hơn 1 instance** (một ổ đĩa không thể chia sẻ cho hai máy). Nên khi có Disk, mỗi lần deploy Render buộc phải tắt cái cũ trước, bật cái mới sau → web **chết vài giây**. Người đang dùng có thể thấy lỗi tạm thời. Không tránh được, trừ khi bỏ Disk.

Các điểm còn lại:

- Disk chỉ gắn được **1 instance** → không scale lên nhiều instance được. Với app này thì không cần.
- Disk **không** truy cập được từ Build Command hay Pre-Deploy Command → đừng viết script build cần đọc dữ liệu.
- Render **tự chụp snapshot mỗi 24 giờ**, giữ ít nhất 7 ngày. Cần thì vào tab **Disks** → **Restore**. Lưu ý: restore là quay lui **toàn bộ** ổ đĩa, mọi thay đổi sau snapshot mất hết.
- Tăng dung lượng Disk được (không downtime), **giảm thì không**.

---

## Phần C — Dùng `render.yaml` (Blueprint) thay vì bấm tay

Nếu bạn thấy bấm form nhiều ô ở Phần A/B phiền, hoặc sau này muốn dựng lại y hệt ở nơi khác, repo đã có sẵn 2 file Blueprint:

| File | Dùng cho |
|---|---|
| `render.yaml` | Gói **Free** (không Disk, mất dữ liệu) |
| `render.paid.yaml` | Gói **trả phí** (có Disk `/var/data`, giữ dữ liệu) |

**Cách dùng:**

1. Đảm bảo file bạn chọn đã được `git push` lên GitHub.
2. Render Dashboard → **+ New** → **Blueprint** → chọn repo → **Connect**
3. Ở ô **Blueprint Path**:
   - Dùng gói Free → ghi `render.yaml` (hoặc để trống, vì đây là tên mặc định)
   - Dùng gói trả phí → ghi đúng `render.paid.yaml`
4. Render hiện danh sách resource nó sắp tạo → bấm **Deploy Blueprint**
5. Render sẽ **hỏi giá trị** các biến đánh dấu `sync: false` (`ADMIN_PASSWORD`, `DEEPSEEK_API_KEY`) — điền tại đây. Các biến này cố tình không ghi vào file để bạn không push mật khẩu lên GitHub.

> ⚠️ **Chỉ chọn một Blueprint cho một service.** Đừng tạo Blueprint trỏ vào `render.yaml` rồi lại tạo thêm cái nữa trỏ vào `render.paid.yaml` — cả hai cùng khai báo service tên `lopso`, Blueprint tạo sau sẽ **giành quyền quản lý** service đó, và bạn sẽ không hiểu vì sao cấu hình tự đổi. Muốn đổi từ Free sang trả phí thì xoá Blueprint cũ trên Dashboard trước, rồi tạo Blueprint mới.

**Vài điều cần biết về Blueprint:**

- File Blueprint là **nguồn chân lý**. Sửa gì qua giao diện Render cũng sẽ bị nó **ghi đè** ở lần sync sau. Muốn đổi cấu hình thì sửa file rồi push.
- Xoá một resource khỏi file → Render **không** xoá resource đó (cơ chế bảo vệ). Muốn xoá thật thì xoá trong file, sync, **rồi** xoá tay trên Dashboard.
- Xoá resource trên Dashboard → lần sync sau Render **tạo lại**. Đừng ngạc nhiên.
- Mỗi push sửa Blueprint lên branch đã liên kết sẽ **tự động deploy** resource bị ảnh hưởng. Muốn tự kiểm soát: vào Settings của Blueprint, đặt **Auto Sync** = **No**, rồi bấm **Manual Sync** khi cần.
- Đừng quản một resource bằng 2 Blueprint cùng lúc.

---

## Phần D — Deploy lại mỗi khi bạn sửa code

Câu hỏi: *"tôi sửa code của mình thì deploy lại thế nào?"*

### D1. Kiểm tra ở máy trước

```powershell
cd C:\Users\dell\Documents\PTUD\web-tao-cham-bai
npm run test:nospawn      # 12/12 test phải pass
npm run build             # build lại giao diện
npm start                 # mở http://localhost:3001 xem thử
```

`npm run build` **bắt buộc** nếu bạn sửa bất cứ file nào trong `src/`. Sửa `server.js` hay `grading.js` thì không bắt buộc, nhưng chạy cho chắc cũng chỉ mất ~0.5 giây.

> Dùng `test:nospawn` thay vì `npm test` nếu bạn gặp lỗi `spawn EPERM`. Đó là giới hạn của môi trường, không phải code hỏng.

### D2. Đẩy lên

```powershell
git add .
git commit -m "sua cham diem"
git push
```

**Hết.** Render tự phát hiện commit mới trên branch `main`, chạy lại `npm install` (bao gồm cả build giao diện nhờ `postinstall`), rồi khởi động lại. Bạn không phải bấm gì.

Theo dõi ở tab **Logs** của service. Khi thấy `Your service is live 🎉` là xong.

### D3. Deploy lại bằng tay (không muốn push code)

Vào trang service → nút **Manual Deploy** ở góc trên → chọn:

| Lựa chọn | Khi nào dùng |
|---|---|
| **Deploy latest commit** | Deploy lại đúng code hiện tại. Dùng khi deploy trước đó lỗi và bạn muốn thử lại. |
| **Clear build cache & deploy** | Deploy lỗi một cách khó hiểu, nghi ngờ cache build. Chậm hơn nhưng sạch. |
| **Restart service** | Chỉ khởi động lại, **không** build lại. Dùng khi service treo. |

### D4. Muốn Render bỏ qua một commit

Ghi `[skip render]` hoặc `[render skip]` trong commit message — Render sẽ không deploy commit đó. Hữu ích khi bạn push sửa mỗi file README.

### D5. Sau khi deploy lại

Mở web và **nhấn Ctrl+F5** (hard refresh). Trình duyệt rất hay giữ file JS cũ trong cache, khiến bạn tưởng deploy thất bại. Nếu giao diện không đổi, **gần như luôn luôn** là cache trình duyệt, không phải lỗi deploy.

### D6. Quay lui (rollback)

Vào tab **Deploys** → tìm bản deploy cũ đang chạy tốt → bấm **Rollback** → **Rollback to this deploy**. Render dùng lại bản build cũ nên rollback nhanh hơn deploy thường.

Rollback **không** hoàn tác được mọi thứ. Cụ thể:

- **Không** hoàn tác ổ đĩa. Disk giữ nguyên trạng thái qua mọi lần deploy — dữ liệu ghi sau bản deploy đó vẫn còn. Muốn quay lui dữ liệu thì phải **Restore snapshot** (mục trên), không phải Rollback.
- **Không** hoàn tác Custom domain, compute plan. Riêng **Environment variables thì CÓ** — rollback dùng lại đúng bộ biến của bản deploy đó. Nếu bạn vừa sửa `ADMIN_PASSWORD` rồi rollback, biến sẽ quay về giá trị cũ.
- Rollback **tắt auto-deploy**. Render làm vậy để commit mới không đè lại bản vừa quay lui. Xử lý xong phải vào **Settings** bật lại, không thì push code mới sẽ không tự deploy — đây là chỗ nhiều người tưởng Render hỏng.
- Số bản build giữ lại tuỳ theo gói (workspace plan), và chỉ rollback được tới bản mà artifact **còn lưu**. Render không công bố con số cụ thể cho từng gói; vào tab Deploys xem bản nào còn nút **Rollback** thì biết bản đó còn dùng được.

---

## Xử lý sự cố

| Hiện tượng | Nguyên nhân | Cách sửa |
|---|---|---|
| Deploy **Failed**, log ghi `Cấu hình ADMIN_PASSWORD tối thiểu 12 ký tự` | Thiếu biến `ADMIN_PASSWORD` hoặc ngắn hơn 12 ký tự | Sửa ở tab **Environment** → **Save Changes**. Render deploy lại. |
| Deploy **Failed**, log ghi `Cannot find module 'express'` | Build Command bị đổi thành thứ khác | Build Command phải là `npm install` |
| Deploy **Live** nhưng mở web ra **404 / trang trắng** | Giao diện chưa được build | Kiểm tra `package.json` còn dòng `"postinstall": "npm run build"`. Nếu bạn đã xoá nó, đổi Build Command thành `npm install && npm run build`. |
| Mở web chờ mãi rồi mới vào | Service Free đang ngủ, đang "thức dậy" | Bình thường. Chờ ~1 phút. Gói trả phí không bị. |
| **Mất sạch dữ liệu sau khi deploy lại** | `DATA_DIR` chưa trỏ vào Disk, hoặc đang dùng gói Free | Xem Phần B. Trên Free **không có cách sửa** — phải nâng gói. |
| Đăng nhập không được sau deploy | Đổi `ADMIN_PASSWORD` nhưng `users.json` đã tồn tại (server không ghi đè) | Dùng mật khẩu cũ, hoặc xoá `users.json` trong `DATA_DIR` (mất hết tài khoản) rồi deploy lại |
| Giao diện không đổi dù deploy thành công | Cache trình duyệt | Ctrl+F5 |
| Bấm "quét ảnh thành đề" báo lỗi | Thiếu/sai `DEEPSEEK_API_KEY` | Sửa ở tab **Environment** → **Save Changes**. Cũng kiểm tra `DEEPSEEK_BASE_URL`. |
| Upload ảnh báo `Unexpected file field` | Client gửi sai tên field | Field phải tên là `image` (không phải `file`) — đây là lỗi code, không phải lỗi deploy |
| Log ghi `Dữ liệu đang lưu tại: /opt/render/project/src/data` | Chưa đặt `DATA_DIR` — dữ liệu sẽ mất khi deploy | Đặt `DATA_DIR=/var/data`, đảm bảo Disk đã gắn ở đúng `/var/data` |
| Deploy xong web chết vài giây | Đã gắn Disk → mất zero-downtime deploy | Không tránh được. Đây là đánh đổi của Disk. |

---

## Phụ lục — Biến môi trường app này dùng

| Biến | Bắt buộc | Mặc định | Ý nghĩa |
|---|---|---|---|
| `ADMIN_EMAIL` | | `admin@lopso.vn` | Email tài khoản quản trị tạo lần đầu |
| `ADMIN_PASSWORD` | ✅ | — | Mật khẩu tài khoản đó. **≥ 12 ký tự.** Chỉ dùng khi `users.json` chưa tồn tại |
| `DATA_DIR` | Chỉ khi có Disk | `./data` | Thư mục lưu `users.json`, `classes.json`, `assignments.json`. Phải khớp Mount Path của Disk |
| `DEEPSEEK_API_KEY` | ✅ (cho tính năng quét ảnh) | — | Khoá gọi DeepSeek Vision |
| `DEEPSEEK_BASE_URL` | | `https://api.xompet.io.vn/v1` | Endpoint OpenAI-compatible |
| `DEEPSEEK_VISION_MODEL` | | `deepseek-v4-flash-vision-exp` | Model đọc ảnh đề thi |
| `PDF_MAX_PAGES` | | tất cả số trang | Giới hạn số trang PDF xử lý |
| `PDF_RENDER_SCALE` | | `1.5` | Độ phân giải khi render PDF thành ảnh (cao hơn = nét hơn nhưng chậm hơn) |
| `PORT` | | `3001` | **Đừng đặt trên Render** — Render tự cấp qua biến này. Đặt tay sẽ làm service không nhận request. |

`SUPABASE_*` và `VITE_SUPABASE_*` có trong `.env.example` nhưng **hiện chưa được dùng ở đâu trong code** — bỏ qua.

---

## Tóm tắt một dòng

**Free (mất dữ liệu):** push code lên GitHub → New → Web Service → Build `npm install` → Start `npm start` → Compute **Free** → điền `ADMIN_PASSWORD` (≥12 ký tự) + `DEEPSEEK_API_KEY`.

**Trả phí (giữ dữ liệu):** giống trên nhưng Compute **Starter**, thêm Disk mount `/var/data` + biến `DATA_DIR=/var/data`, rồi **kiểm tra log ghi đúng `/var/data`**.

**Mỗi lần sửa code:** `npm run test:nospawn` → `npm run build` → `git push` → chờ log `Your service is live 🎉` → Ctrl+F5.
