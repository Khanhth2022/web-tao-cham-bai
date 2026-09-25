// Vision providers may wrap JSON mode output in a Markdown code fence.
export function parseQuizResponse(content) {
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('AI không trả nội dung JSON.');
  }
  const text = content.trim();
  const fenced = text.match(/^```(?:json)?\s*\r?\n([\s\S]*?)\r?\n```\s*$/i);
  let parsed;
  try {
    parsed = JSON.parse(fenced ? fenced[1].trim() : text);
  } catch {
    throw new Error('AI trả nội dung không phải JSON hợp lệ. Vui lòng thử quét lại.');
  }
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.questions)) {
    throw new Error('AI không trả danh sách câu hỏi hợp lệ. Vui lòng thử quét lại.');
  }
  return parsed;
}
