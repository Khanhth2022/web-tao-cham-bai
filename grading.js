// Chấm điểm bài làm của học sinh.
//
// Quy ước dữ liệu câu hỏi (do AI sinh ra trong /api/scan-to-quiz hoặc do
// giáo viên sửa trong QuizEditor):
//   - multiple-choice: answer là 'A' | 'B' | 'C' | 'D'
//   - true-false:      answer là { A: 'true'|'false', B: ..., C: ..., D: ... }
//   - short-answer:    câu tự luận, không chấm tự động được
//
// Hàm thuần, không phụ thuộc React, để test được bằng `node --test`.

export function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFC')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

// So khớp đáp án tự luận: chấp nhận nhiều đáp án đúng, ngăn cách bằng '|'.
// Bỏ qua khác biệt hoa/thường và mọi khoảng trắng, để "x = 4" khớp "x=4".
export function normalizeAnswer(value) {
  return normalizeText(value).replace(/\s+/g, '');
}

export function isShortAnswerCorrect(given, expected) {
  const text = normalizeAnswer(given);
  if (!text) return false;
  const accepted = String(expected ?? '')
    .split('|')
    .map(normalizeAnswer)
    .filter(Boolean);
  if (!accepted.length) return false;
  return accepted.includes(text);
}

// Trả về điểm thô (theo thang điểm của đề) cho một câu.
// Câu tự luận luôn trả về `null` nghĩa là "cần giáo viên chấm tay".
export function gradeQuestion(question, answer) {
  const type = question?.type || 'short-answer';

  if (type === 'multiple-choice') {
    const expected = normalizeText(question.answer).toUpperCase();
    if (!expected) return null;
    return String(answer ?? '').toUpperCase() === expected ? 1 : 0;
  }

  if (type === 'true-false') {
    const expected = question.answer;
    // Đề cũ có thể lưu answer dạng chuỗi rỗng — coi như chưa có đáp án.
    if (!expected || typeof expected !== 'object') return null;
    const letters = ['A', 'B', 'C', 'D'].filter(letter => normalizeText(expected[letter]));
    if (!letters.length) return null;
    const given = answer && typeof answer === 'object' ? answer : {};
    // Mỗi ý trả lời đúng được tính là một phần bằng nhau của câu.
    const correct = letters.filter(letter => normalizeText(given[letter]) === normalizeText(expected[letter]));
    return correct.length / letters.length;
  }

  // Tự luận: không có đáp án mẫu => giáo viên chấm tay, không được tự cho 0.
  const hasKey = String(question?.answer ?? '')
    .split('|')
    .some(part => normalizeAnswer(part));
  if (!hasKey) return null;
  return isShortAnswerCorrect(answer, question.answer) ? 1 : 0;
}

// Chấm cả bài. Trả về điểm hệ 10 và thông tin chi tiết để hiển thị lại.
export function gradeSubmission(questions, answers) {
  const list = Array.isArray(questions) ? questions : [];
  const totalPoints = list.reduce((sum, question) => sum + Number(question?.points ?? 1), 0);

  let earned = 0;
  let autoGraded = 0;
  let needsReview = 0;

  list.forEach((question, index) => {
    const points = Number(question?.points ?? 1);
    const ratio = gradeQuestion(question, answers?.[index]);
    if (ratio === null) {
      needsReview += 1;
      return;
    }
    autoGraded += 1;
    earned += ratio * points;
  });

  const score = totalPoints > 0 ? Math.round((earned / totalPoints) * 100) / 10 : 0;

  return {
    score: Math.max(0, Math.min(10, score)),
    earned: Math.round(earned * 100) / 100,
    totalPoints,
    autoGraded,
    needsReview,
    // Chỉ công bố điểm khi mọi câu đều chấm tự động được.
    provisional: needsReview > 0
  };
}
