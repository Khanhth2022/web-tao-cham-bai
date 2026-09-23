# Lớp học số

MVP React + Node.js cho học sinh và gia sư: tạo đề, làm bài, chấm điểm và quét ảnh tạo đề.

## Chạy local

```bash
npm install
npm run build
npm start
```

Mở `http://localhost:3001`.

## Bật OpenAI Vision

1. Sao chép `.env.example` thành `.env`.
2. Điền `OPENAI_API_KEY` ở phía server; không dùng biến `VITE_` cho khóa bí mật.
3. Khởi động lại `npm start`.
4. Upload ảnh tại mục **Tạo đề bằng AI**.

Nếu chưa có khóa, API vẫn chạy chế độ demo để kiểm tra giao diện.

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
