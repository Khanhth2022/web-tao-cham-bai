import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
app.use(express.json());

app.post('/api/scan-to-quiz', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Vui lòng chọn ảnh đề bài.' });
  const title = req.body.title || 'Đề bài từ ảnh quét';
  if (!process.env.DEEPSEEK_API_KEY) {
    return res.json({ title, source: req.file.originalname, demo: true, questions: demoQuestions(), note: 'Chưa cấu hình DEEPSEEK_API_KEY nên đang dùng bản demo.' });
  }
  try {
    const base64 = req.file.buffer.toString('base64');
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` },
      body: JSON.stringify({ model: process.env.DEEPSEEK_VISION_MODEL || 'deepseek-v4-flash-vision-exp', temperature: 0.2, response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: 'Bạn là trợ lý tạo đề. Đọc ảnh đáp án/tài liệu và trả JSON tiếng Việt có dạng {"questions":[{"id":1,"type":"multiple-choice" hoặc "short-answer","text":"...","options":["..."],"answer":0,"points":1}]}. Tạo tối đa 10 câu, giữ đúng kiến thức trong ảnh, không bịa.' },
          { role: 'user', content: [{ type: 'text', text: `Đọc ảnh này để tạo đề/chấm theo đáp án. Tiêu đề: ${title}` }, { type: 'image_url', image_url: { url: `data:${req.file.mimetype};base64,${base64}` } }] }] })
    });
    if (!response.ok) throw new Error(`DeepSeek ${response.status}`);
    const data = await response.json();
    const parsed = JSON.parse(data.choices?.[0]?.message?.content || '{}');
    res.json({ title, source: req.file.originalname, demo: false, questions: parsed.questions || [], note: 'Đề được tạo bởi OpenAI Vision. Gia sư cần kiểm duyệt trước khi xuất bản.' });
  } catch (error) { console.error(error); res.status(502).json({ message: 'Không thể đọc ảnh bằng AI lúc này.', detail: error.message }); }
});
function demoQuestions() { return [
  { id: 1, type: 'multiple-choice', text: 'Theo nội dung ảnh, ý chính của bài là gì?', options: ['Khái niệm nền tảng', 'Bài tập vận dụng', 'Thí nghiệm thực hành', 'Ôn tập tổng hợp'], answer: 0, points: 1 },
  { id: 2, type: 'short-answer', text: 'Hãy nêu một kết luận quan trọng được rút ra từ tài liệu.', answer: 'Câu trả lời theo nội dung tài liệu.', points: 1 }
]; }

const dist = path.join(__dirname, 'dist');
app.use(express.static(dist));
app.use((req, res) => res.sendFile(path.join(dist, 'index.html')));

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`API running on http://localhost:${port}`));
