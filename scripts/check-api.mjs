import 'dotenv/config';

const baseUrl = (process.env.DEEPSEEK_BASE_URL || 'https://api.xompet.io.vn/v1').replace(/\/$/, '');
const apiKey = process.env.DEEPSEEK_API_KEY;
const model = process.env.DEEPSEEK_VISION_MODEL || 'deepseek-v4-flash-vision-exp';

if (!apiKey) {
  console.error('FAIL: Thiếu DEEPSEEK_API_KEY. Hãy tạo file .env từ .env.example.');
  process.exit(1);
}

try {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages: [{ role: 'user', content: 'Trả lời đúng một từ: OK' }], max_tokens: 5, temperature: 0 })
  });
  const text = await response.text();
  if (!response.ok) {
    console.error(`FAIL: API trả HTTP ${response.status}.`);
    console.error(text.slice(0, 800));
    process.exit(1);
  }
  const data = JSON.parse(text);
  console.log('PASS: API phản hồi thành công.');
  console.log(`Endpoint: ${baseUrl}/chat/completions`);
  console.log(`Model: ${model}`);
  console.log(`Nội dung: ${data.choices?.[0]?.message?.content || '(không có content)'}`);
} catch (error) {
  console.error(`FAIL: Không thể kết nối API: ${error.message}`);
  process.exit(1);
}
