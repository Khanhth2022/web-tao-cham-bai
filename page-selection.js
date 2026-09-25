// An empty selection means every page. Page numbers are 1-based PDF page labels.
export function selectPdfPages(selection, pageCount, maxPages = pageCount) {
  if (!Number.isSafeInteger(pageCount) || pageCount < 1) throw new Error('PDF không có trang hợp lệ.');
  const limit = Number(maxPages);
  if (!Number.isSafeInteger(limit) || limit < 1) throw new Error('PDF_MAX_PAGES phải là số nguyên dương.');
  const value = String(selection ?? '').trim();
  const result = [];
  const seen = new Set();
  if (!value) {
    if (pageCount > limit) throw new Error(`Chỉ được quét tối đa ${limit} trang. Hãy chọn trang cần quét.`);
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }
  for (const token of value.split(',')) {
    const match = token.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!match) throw new Error('Trang PDF không hợp lệ. Ví dụ: 1,3,5-8.');
    const from = Number(match[1]);
    const to = match[2] ? Number(match[2]) : from;
    if (!Number.isSafeInteger(from) || !Number.isSafeInteger(to) || from < 1 || to < from || to > pageCount) {
      throw new Error(`Vui lòng chọn trang từ 1 đến ${pageCount}, theo thứ tự tăng dần trong mỗi khoảng.`);
    }
    for (let n = from; n <= to; n++) {
      if (!seen.has(n)) { result.push(n); seen.add(n); }
      if (result.length > limit) throw new Error(`Chỉ được quét tối đa ${limit} trang.`);
    }
  }
  return result;
}
