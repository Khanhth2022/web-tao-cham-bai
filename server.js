import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { parseQuizResponse } from './quiz-response.js';
import { selectPdfPages } from './page-selection.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
// Cho phép trỏ dữ liệu ra ngoài thư mục build (Render Disk, volume, ...).
// Mặc định vẫn là ./data để chạy local không cần cấu hình gì.
const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(__dirname, 'data');
const usersFile = path.join(dataDir, 'users.json');
const classesFile = path.join(dataDir, 'classes.json');
const assignmentsFile = path.join(dataDir, 'assignments.json');
const sessions = new Map();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
app.use(express.json());
async function readJson(file, fallback) { try { return JSON.parse(await fs.readFile(file, 'utf8')); } catch { return fallback; } }
async function writeJson(file, value) { await fs.mkdir(dataDir, { recursive: true }); await fs.writeFile(file, JSON.stringify(value, null, 2)); }
const adminEmail = process.env.ADMIN_EMAIL || 'admin@lopso.vn';
const hashPassword = password => { const salt = crypto.randomBytes(16).toString('hex'); return `${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}`; };
const verifyPassword = (password, hash) => { if (!hash || typeof hash !== 'string') return false; const [salt, expected] = hash.split(':'); if (!salt || !expected || expected.length !== 128) return false; return crypto.timingSafeEqual(crypto.scryptSync(password, salt, 64), Buffer.from(expected, 'hex')); };
await fs.mkdir(dataDir, { recursive: true });
console.log(`Dữ liệu đang lưu tại: ${dataDir}`);
if (!(await fs.stat(usersFile).catch(() => null))) {
  if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.length < 12) throw new Error('Cấu hình ADMIN_PASSWORD tối thiểu 12 ký tự trong .env để tạo tài khoản gia sư.');
  await writeJson(usersFile, [{ id: 'admin', email: adminEmail, passwordHash: hashPassword(process.env.ADMIN_PASSWORD), name: 'Gia sư / Quản trị viên', role: 'admin' }]);
}
function admin(req, res, next) { if (req.userId !== 'admin') return res.status(403).json({ message: 'Chỉ quản trị viên mới có quyền.' }); next(); }
function auth(req, res, next) { const token = req.headers.authorization?.replace(/^Bearer\s+/i, ''); const userId = token && sessions.get(token); if (!userId) return res.status(401).json({ message: 'Vui lòng đăng nhập.' }); req.userId = userId; next(); }
app.post('/api/auth/login', async (req, res) => { const users = await readJson(usersFile, []); const user = users.find(item => item.email.toLowerCase() === String(req.body.email || '').toLowerCase() && verifyPassword(String(req.body.password || ''), item.passwordHash)); if (!user) return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng.' }); const token = crypto.randomBytes(24).toString('hex'); sessions.set(token, user.id); res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } }); });
app.get('/api/auth/me', auth, async (req, res) => { const user = (await readJson(usersFile, [])).find(item => item.id === req.userId); if (!user) return res.status(401).json({ message: 'Phiên đăng nhập không hợp lệ.' }); res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } }); });
app.post('/api/auth/logout', auth, (req, res) => { sessions.delete(req.headers.authorization.replace(/^Bearer\s+/i, '')); res.json({ ok: true }); });
app.get('/api/admin/users', auth, admin, async (_req, res) => { const users = await readJson(usersFile, []); res.json({ users: users.map(({ passwordHash, ...user }) => user) }); });
app.post('/api/admin/users', auth, admin, async (req, res) => { const users = await readJson(usersFile, []); const email = String(req.body.email || '').trim().toLowerCase(); if (!email || typeof req.body.password !== 'string' || req.body.password.length < 12) return res.status(400).json({ message: 'Cần email và mật khẩu tối thiểu 12 ký tự.' }); if (users.some(item => item.email === email)) return res.status(409).json({ message: 'Email đã tồn tại.' }); const user = { id: crypto.randomUUID(), email, passwordHash: hashPassword(req.body.password), name: req.body.name || email, role: 'student' }; users.push(user); await writeJson(usersFile, users); res.status(201).json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } }); });
app.get('/api/classes', auth, async (req, res) => { const classes = await readJson(classesFile, []); res.json({ classes: req.userId === 'admin' ? classes : classes.filter(item => item.studentIds.includes(req.userId)) }); });
app.post('/api/admin/classes', auth, admin, async (req, res) => { const classes = await readJson(classesFile, []); const item = { id: crypto.randomUUID(), name: String(req.body.name || '').trim(), code: String(req.body.code || '').trim().toUpperCase(), studentIds: Array.isArray(req.body.studentIds) ? req.body.studentIds : [] }; if (!item.name) return res.status(400).json({ message: 'Cần nhập tên lớp.' }); classes.push(item); await writeJson(classesFile, classes); res.status(201).json({ class: item }); });
app.get('/api/assignments', auth, async (req, res) => { const assignments = await readJson(assignmentsFile, []); const classes = await readJson(classesFile, []); const visibleClassIds = new Set(classes.filter(item => req.userId === 'admin' || item.studentIds.includes(req.userId)).map(item => item.id)); res.json({ assignments: assignments.filter(item => req.userId === 'admin' || !item.classId || visibleClassIds.has(item.classId)) }); });
app.post('/api/assignments', auth, admin, async (req, res) => { const assignments = await readJson(assignmentsFile, []); if (!String(req.body.title || '').trim()) return res.status(400).json({ message: 'Cần nhập tên đề.' }); const item = { ...req.body, id: crypto.randomUUID(), createdBy: req.userId, createdAt: new Date().toISOString() }; assignments.push(item); await writeJson(assignmentsFile, assignments); res.status(201).json({ assignment: item }); });
app.patch('/api/assignments/:id', auth, admin, async (req, res) => { const assignments = await readJson(assignmentsFile, []); const index = assignments.findIndex(item => item.id === req.params.id); if (index < 0) return res.status(404).json({ message: 'Không tìm thấy đề.' }); assignments[index] = { ...assignments[index], ...req.body, id: req.params.id, createdBy: assignments[index].createdBy }; await writeJson(assignmentsFile, assignments); res.json({ assignment: assignments[index] }); });

// Endpoint kiểm tra server và cấu hình, không trả về API key.
app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'classmate-grader-api', time: new Date().toISOString() }));
app.get('/api/vision-status', (_req, res) => res.json({
  configured: Boolean(process.env.DEEPSEEK_API_KEY),
  baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.xompet.io.vn/v1',
  model: process.env.DEEPSEEK_VISION_MODEL || 'deepseek-v4-flash-vision-exp',
  mode: process.env.DEEPSEEK_API_KEY ? 'live-ready' : 'demo'
}));

app.post('/api/scan-to-quiz', auth, admin, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Vui lòng chọn ảnh hoặc PDF.' });
  const title = req.body.title || 'Đề bài từ ảnh quét';
  let images;
  try {
    images = req.file.mimetype === 'application/pdf'
      ? await pdfToImages(req.file.buffer, req.body.pageSelection)
      : [{ mimeType: req.file.mimetype, base64: req.file.buffer.toString('base64'), pageNumber: 1 }];
  } catch (error) {
    return res.status(400).json({ message: 'Không thể chuyển PDF thành ảnh.', detail: error.message });
  }
  if (!process.env.DEEPSEEK_API_KEY) return res.status(503).json({ message: 'Chưa cấu hình AI Vision. Liên hệ quản trị viên.' });
  try {
    const response = await fetch(`${process.env.DEEPSEEK_BASE_URL || 'https://api.xompet.io.vn/v1'}/chat/completions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` },
      body: JSON.stringify({ model: process.env.DEEPSEEK_VISION_MODEL || 'deepseek-v4-flash-vision-exp', temperature: 0.2, response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: 'Bạn là trợ lý tạo đề. Đọc toàn bộ các trang ảnh/tài liệu và trả JSON tiếng Việt có dạng {"questions":[{"id":1,"type":"multiple-choice", "short-answer" hoặc "true-false","text":"...","options":["..."],"answer":"A","points":1,"page":1,"bbox":[0.1,0.2,0.9,0.35]}]}. Phân loại cả câu trả lời ngắn (short-answer) và dạng đúng/sai gồm đề và BỐN mệnh đề A, B, C, D (true-false); mỗi nhóm bốn ý là MỘT câu hỏi, không tách riêng từng ý. Với true-false, options là mảng đúng bốn chuỗi mệnh đề A–D, answer là object {"A":"true","B":"false","C":"true","D":"false"} theo đáp án đọc được; nếu không có đáp án trong tài liệu thì để chuỗi rỗng, không suy đoán. Với câu trắc nghiệm multiple-choice, answer CHỈ là một chữ cái A/B/C/D, không kèm nội dung lựa chọn. page là số trang bắt đầu từ 1 và bbox là [xMin,yMin,xMax,yMax] theo tọa độ tỷ lệ 0..1 cho MỌI loại câu hỏi, bao trọn câu và các lựa chọn (nếu có) trên trang, không cắt sót ký hiệu/toán. Nội dung câu sẽ hiển thị bằng ảnh cắt từ tài liệu gốc thay vì text; trả bbox chính xác dựa trên ảnh gốc; nếu không xác định được, bỏ bbox. Hãy tạo đủ tất cả câu hỏi/bài tập thực sự xuất hiện trong tài liệu, không tự đặt giới hạn số câu, không gộp hoặc bỏ qua câu. Giữ đúng kiến thức trong ảnh, không bịa. Nếu tài liệu có 20, 50 hoặc nhiều câu hơn thì trả về đầy đủ.' },
          { role: 'user', content: [{ type: 'text', text: `Đọc các trang ảnh này để tạo đề/chấm theo đáp án. Tiêu đề: ${title}` }, ...images.flatMap(image => [{ type: 'text', text: `Ảnh sau là trang PDF số ${image.pageNumber}. Mọi câu trên ảnh này phải có page=${image.pageNumber}.` }, { type: 'image_url', image_url: { url: `data:${image.mimeType};base64,${image.base64}` } }])] }] })
    });
    if (!response.ok) throw new Error(`DeepSeek ${response.status}: ${(await response.text()).slice(0, 800)}`);
    const data = await response.json();
    const parsed = parseQuizResponse(data.choices?.[0]?.message?.content || '');
    res.json({ title, source: req.file.originalname, pages: images.length, sourceImages: images.map(image => `data:${image.mimeType};base64,${image.base64}`), pageNumbers: images.map(image => image.pageNumber), demo: false, questions: await attachQuestionImages(normalizeQuestions(parsed.questions || []), images), note: 'Đề được tạo bởi AI Vision. Câu trắc nghiệm hiển thị bằng ảnh gốc và đáp án được lưu riêng dưới dạng A/B/C/D.' });
  } catch (error) { console.error(error); res.status(502).json({ message: 'Không thể đọc ảnh bằng AI lúc này.', detail: error.message }); }
});
function normalizeQuestions(questions) {
  if (!Array.isArray(questions)) return [];
  return questions.map(q => {
    if (q.type === 'true-false') {
      const values = q.answer && typeof q.answer === 'object' && !Array.isArray(q.answer) ? q.answer : {};
      const answer = Object.fromEntries('ABCD'.split('').map((letter, index) => {
        const raw = values[letter] ?? (Array.isArray(q.answer) ? q.answer[index] : undefined);
        const normalized = raw === true || /^(true|đúng|d|1)$/i.test(String(raw ?? '').trim()) ? 'true'
          : raw === false || /^(false|sai|s|0)$/i.test(String(raw ?? '').trim()) ? 'false' : '';
        return [letter, normalized];
      }));
      return { ...q, options: Array.from({ length: 4 }, (_, index) => q.options?.[index] || ''), answer };
    }
    if (q.type !== 'multiple-choice') return q;
    const raw = q.answer;
    const index = typeof raw === 'number' ? raw : /^\s*[A-D](?=[^a-zA-Z]|$)/i.test(String(raw ?? ''))
      ? String(raw).trim().toUpperCase().charCodeAt(0) - 65 : -1;
    return { ...q, answer: index >= 0 && index < 4 ? 'ABCD'[index] : '' };
  });
}

async function attachQuestionImages(questions, images) {
  return Promise.all(questions.map(async question => {
    const pageNumber = Number(question.page || 1);
    const pageIndex = images.findIndex(image => image.pageNumber === pageNumber) >= 0
      ? images.findIndex(image => image.pageNumber === pageNumber)
      : Math.max(0, pageNumber - 1);
    const source = images[pageIndex];
    if (!source) return question;
    const sourceUrl = `data:${source.mimeType};base64,${source.base64}`;
    if (!Array.isArray(question.bbox) || question.bbox.length !== 4) {
      return { ...question, image: sourceUrl };
    }
    const image = await loadImage(Buffer.from(source.base64, 'base64'));
    const [x1, y1, x2, y2] = question.bbox.map(Number);
    const left = Math.max(0, Math.floor(Math.min(x1, x2) * image.width));
    const top = Math.max(0, Math.floor(Math.min(y1, y2) * image.height));
    const right = Math.min(image.width, Math.ceil(Math.max(x1, x2) * image.width));
    const bottom = Math.min(image.height, Math.ceil(Math.max(y1, y2) * image.height));
    if (right <= left || bottom <= top) return { ...question, image: sourceUrl };
    const canvas = createCanvas(right - left, bottom - top);
    canvas.getContext('2d').drawImage(image, left, top, right - left, bottom - top, 0, 0, right - left, bottom - top);
    return { ...question, image: `data:image/png;base64,${canvas.toBuffer('image/png').toString('base64')}` };
  }));
}

async function pdfToImages(buffer, pageSelection) {
  const document = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
  const maxPages = Number(process.env.PDF_MAX_PAGES || document.numPages);
  const pageNumbers = selectPdfPages(pageSelection, document.numPages, maxPages);
  const scale = Number(process.env.PDF_RENDER_SCALE || 1.5);
  const pages = [];
  for (const pageNumber of pageNumbers) {
    const page = await document.getPage(pageNumber);
    const viewport = page.getViewport({ scale });
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const context = canvas.getContext('2d');
    await page.render({ canvasContext: context, viewport }).promise;
    pages.push({ mimeType: 'image/png', base64: canvas.toBuffer('image/png').toString('base64'), pageNumber });
  }
  return pages;
}



const dist = path.join(__dirname, 'dist');
app.use(express.static(dist));
app.use((req, res) => res.sendFile(path.join(dist, 'index.html')));

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`API running on http://localhost:${port}`));
