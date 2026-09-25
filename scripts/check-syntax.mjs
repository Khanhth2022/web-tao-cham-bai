// Kiểm tra tĩnh cho src/: parse JSX/JS bằng rolldown (oxc) và báo lỗi cú pháp.
// Bắt được các lỗi như: cú pháp sai, identifier không tồn tại ở mức parse
// (với `errors` từ oxc), JSX không hợp lệ.
//
// Dùng: node scripts/check-syntax.mjs src/main.jsx
import fs from 'fs';
import { transform } from 'rolldown/experimental';

const files = process.argv.slice(2);
if (!files.length) {
  console.error('Dùng: node scripts/check-syntax.mjs <file...>');
  process.exit(2);
}

let failed = 0;
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const r = await transform(f, src, {
    loader: f.endsWith('.jsx') ? 'jsx' : 'js',
    jsx: 'preserve',
    sourcemap: false,
  });
  const errors = r.errors || [];
  if (errors.length) {
    failed++;
    console.log(`\n${f}: ${errors.length} LOI`);
    for (const e of errors) {
      const loc = e.labels?.[0];
      const where = loc ? ` (dong ${loc.span?.line ?? '?'})` : '';
      console.log(`  - ${e.message}${where}`);
      if (loc?.span?.line) {
        const lines = src.split('\n');
        const n = loc.span.line;
        console.log(`      ${n}: ${(lines[n - 1] || '').slice(0, 160)}`);
      }
    }
  } else {
    console.log(`${f}: OK (khong loi cu phap)`);
  }
}

console.log(
  failed ? `\n>>> ${failed} file co loi` : '\n>>> Tat ca file deu sach',
);
process.exit(failed ? 1 : 0);
