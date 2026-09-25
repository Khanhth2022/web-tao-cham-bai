import assert from 'node:assert/strict';
import { parseQuizResponse } from '../quiz-response.js';

const quiz = { questions: [{ id: 1, text: 'Câu hỏi?' }] };
assert.deepEqual(parseQuizResponse(JSON.stringify(quiz)), quiz);
assert.deepEqual(parseQuizResponse(`\`\`\`json\n${JSON.stringify(quiz, null, 2)}\n\`\`\``), quiz);
assert.deepEqual(parseQuizResponse(`\`\`\`JSON\r\n${JSON.stringify(quiz)}\r\n\`\`\``), quiz);
assert.throws(() => parseQuizResponse('```json\n{bad json}\n```'), /JSON hợp lệ/);
assert.throws(() => parseQuizResponse('Lời giải: {"questions": []}'), /JSON hợp lệ/);
assert.throws(() => parseQuizResponse('{}'), /danh sách câu hỏi/);
console.log('PASS: parseQuizResponse accepts plain and fenced JSON.');
