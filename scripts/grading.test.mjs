import { test } from 'node:test';
import assert from 'node:assert/strict';

import { gradeQuestion, gradeSubmission, isShortAnswerCorrect } from '../grading.js';

const mc = (answer, points = 1) => ({ type: 'multiple-choice', answer, points });
const tf = (answer, points = 1) => ({ type: 'true-false', answer, points });
const sa = (answer, points = 1) => ({ type: 'short-answer', answer, points });

test('trắc nghiệm: đúng sai rõ ràng, không phân biệt hoa thường', () => {
  assert.equal(gradeQuestion(mc('B'), 'B'), 1);
  assert.equal(gradeQuestion(mc('b'), 'B'), 1);
  assert.equal(gradeQuestion(mc('B'), 'C'), 0);
  assert.equal(gradeQuestion(mc('B'), undefined), 0);
});

test('trắc nghiệm không có đáp án thì trả null (chấm tay)', () => {
  assert.equal(gradeQuestion(mc(''), 'A'), null);
  assert.equal(gradeQuestion({ type: 'multiple-choice' }, 'A'), null);
});

test('đúng/sai: tính theo tỉ lệ số ý đúng', () => {
  const question = tf({ A: 'true', B: 'false', C: 'true', D: 'false' });
  assert.equal(gradeQuestion(question, { A: 'true', B: 'false', C: 'true', D: 'false' }), 1);
  assert.equal(gradeQuestion(question, { A: 'true', B: 'false', C: 'false', D: 'false' }), 0.75);
  assert.equal(gradeQuestion(question, { A: 'false', B: 'true', C: 'false', D: 'true' }), 0);
});

test('đúng/sai: đề cũ lưu answer rỗng thì không chấm bừa', () => {
  assert.equal(gradeQuestion(tf(''), { A: 'true' }), null);
  assert.equal(gradeQuestion(tf({ A: '', B: '', C: '', D: '' }), { A: 'true' }), null);
});

test('tự luận: nhiều đáp án chấp nhận, chuẩn hoá khoảng trắng', () => {
  assert.equal(isShortAnswerCorrect('  x = 4 ', '4|x=4'), true);
  assert.equal(isShortAnswerCorrect('X=4', '4|x=4'), true);
  assert.equal(isShortAnswerCorrect('5', '4|x=4'), false);
  assert.equal(isShortAnswerCorrect('', '4|x=4'), false);
});

test('chấm cả bài: điểm hệ 10 theo trọng số points', () => {
  const questions = [mc('A', 2), mc('B', 2), mc('D', 1)];
  const result = gradeSubmission(questions, { 0: 'A', 1: 'C', 2: 'D' });
  // đúng câu 1 (2đ) + câu 3 (1đ) trên tổng 5đ = 3/5 = 6/10
  assert.equal(result.score, 6);
  assert.equal(result.provisional, false);
  assert.equal(result.needsReview, 0);
});

test('chấm cả bài: học sinh không trả lời gì thì 0 điểm, không phải 10', () => {
  const questions = [mc('A'), mc('B')];
  const result = gradeSubmission(questions, {});
  assert.equal(result.score, 0);
});

test('chấm cả bài: tự luận có đáp án mẫu thì chấm tự động được', () => {
  const questions = [mc('A'), sa('42')];
  const result = gradeSubmission(questions, { 0: 'A', 1: '42' });
  assert.equal(result.needsReview, 0);
  assert.equal(result.provisional, false);
  assert.equal(result.score, 10);
});

test('chấm cả bài: tự luận không có đáp án mẫu thì cần chấm tay', () => {
  const questions = [mc('A'), sa('')];
  const result = gradeSubmission(questions, { 0: 'A', 1: 'trình bày lời giải' });
  assert.equal(result.needsReview, 1);
  assert.equal(result.provisional, true);
  assert.equal(result.autoGraded, 1);
  // 1/2 câu chấm được và đúng -> 5/10, nhưng vẫn báo là điểm tạm
  assert.equal(result.score, 5);
});

test('chấm cả bài: đề rỗng không chia cho 0', () => {
  const result = gradeSubmission([], {});
  assert.equal(result.score, 0);
  assert.equal(result.totalPoints, 0);
});
