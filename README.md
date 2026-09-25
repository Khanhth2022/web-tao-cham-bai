# Lớp học số

MVP React + Node.js cho học sinh và gia sư: tạo đề, làm bài, chấm điểm và quét ảnh tạo đề.

## Chạy local

```bash
npm install
npm run build
npm start
```

Mở `http://localhost:3001`.

## Bật DeepSeek Vision

1. Tạo API key tại https://platform.deepseek.com/api_keys.
2. Sao chép `.env.example` thành `.env`.
3. Điền `DEEPSEEK_API_KEY` ở phía server; không dùng biến `VITE_` cho khóa bí mật.
4. API mặc định gọi endpoint OpenAI-compatible `https://api.xompet.io.vn/v1/chat/completions` với model `deepseek-v4-flash-vision-exp`. Có thể đổi endpoint bằng biến `DEEPSEEK_BASE_URL`.
5. Khởi động lại `npm start`.
6. Upload ảnh tại mục **Tạo đề bằng AI**.

Nếu chưa có khóa, API vẫn chạy chế độ demo để kiểm tra giao diện. Có thể upload trực tiếp PDF, PNG hoặc JPG tại mục tạo đề AI. Server chuyển tối đa 10 trang PDF đầu tiên thành ảnh PNG rồi gửi các ảnh đó cho Vision qua một request; tệp gốc không được lưu trên server. Giới hạn upload 10 MB; PDF lớn nên chia nhỏ trước khi tải lên.

## Kiểm tra API đang chạy thật hay demo

Sau khi đã điền `.env`, chạy:

```bash
npm run check:api
```

- `PASS: API phản hồi thành công` nghĩa là URL, API key và model đã được nhà cung cấp chấp nhận.
- `HTTP 401/403` nghĩa là API key sai, hết hạn hoặc không có quyền.
- `HTTP 404` nghĩa là endpoint hoặc model không tồn tại.
- `HTTP 429` nghĩa là hết quota/đang bị giới hạn.

Khi chạy web, mở hai URL local này để kiểm tra mà không lộ key:

```text
http://localhost:3001/api/health
http://localhost:3001/api/vision-status
```

`/api/vision-status` trả `mode: "live-ready"` khi server đã đọc được `DEEPSEEK_API_KEY`, nhưng chỉ lệnh `npm run check:api` hoặc upload một ảnh mới xác minh được key thực sự gọi thành công tới nhà cung cấp.

## Bật Supabase

1. Tạo project tại https://supabase.com.
2. Mở SQL Editor và chạy toàn bộ `supabase-schema.sql`.
3. Lấy `SUPABASE_URL` và `SUPABASE_ANON_KEY` vào `.env`.
4. Bước tiếp theo sẽ nối client React vào Auth/Database; không đưa `SUPABASE_SERVICE_ROLE_KEY` vào frontend.

## Deploy Render

- Build Command: `npm install && npm run build`
- Start Command: `npm start`
- Environment Variables: `OPENAI_API_KEY`, `OPENAI_VISION_MODEL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`
- Không commit `.env` lên GitHub.
