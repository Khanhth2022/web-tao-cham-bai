// Tái hiện lỗi "l is not a function": mô phỏng React commitHookEffectListUnmount
// để chứng minh useEffect(()=>{load()},[]) an toàn còn useEffect(load,[]) thì nổ.
//
// Chạy: node scripts/verify-effect-cleanup.mjs
import fs from 'fs';

const SRC = 'src/main.jsx';

// 1. Kiểm tra tĩnh: mọi useEffect phải truyền arrow wrapper, không truyền tên hàm trần.
const src = fs.readFileSync(SRC, 'utf8');
const re = /useEffect\(\s*([^,]+?)\s*,/g;
let m;
const offenders = [];
let total = 0;
while ((m = re.exec(src))) {
  total++;
  const arg = m[1].trim();
  // Hợp lệ: "() => ..." hoặc "()=>..." hoặc "function(){}"
  const isWrapper = /^\(\s*\)\s*=>/.test(arg) || /^function\s*\(/.test(arg);
  if (!isWrapper) {
    const line = src.slice(0, m.index).split('\n').length;
    offenders.push({ line, arg });
  }
}
console.log(`Tim thay ${total} useEffect trong ${SRC}`);
if (offenders.length) {
  for (const o of offenders) {
    console.log(`  [X] dong ${o.line}: useEffect(${o.arg}, ...) <- truyen ten ham tran`);
  }
} else {
  console.log('  [OK] tat ca useEffect deu dung arrow wrapper');
}

// 2. Mô phỏng cơ chế React: cleanup chỉ được lưu nếu !== undefined, và React
//    gọi nó mà KHÔNG kiểm tra typeof.
function commitUnmount(effectReturnValue) {
  const destroy = effectReturnValue;
  if (destroy !== undefined) {
    // React làm đúng như trong bundle: var c = l; l = destroy; try { l() }
    destroy();
  }
}

console.log('\nMo phong commitHookEffectListUnmount:');

// Trường hợp bug: arrow concise body trả về Promise
const buggyLoad = () => Promise.resolve('data');
try {
  commitUnmount(buggyLoad());
  console.log('  [??] truong hop bug KHONG nem loi (khong mong doi)');
} catch (e) {
  console.log(`  [X] truong hop bug nem: ${e.constructor.name}: ${e.message}`);
}

// Trường hợp đã sửa: arrow block body trả về undefined
const fixed = () => { buggyLoad(); };
try {
  commitUnmount(fixed());
  console.log('  [OK] truong hop da sua: khong nem loi');
} catch (e) {
  console.log(`  [X] truong hop da sua nem: ${e.message}`);
}

// 3. Xác nhận bản sửa có mặt trong file
const fixedPresent = /useEffect\(\(\)=>\{load\(\)\},\[\]\)/.test(src.replace(/\s+/g, ''));
const buggyAbsent = !/useEffect\(load,\[\]\)/.test(src);
console.log(`\nBan sua co trong ${SRC}: ${fixedPresent}`);
console.log(`Khong con useEffect(load,[]): ${buggyAbsent}`);

const ok = offenders.length === 0 && fixedPresent && buggyAbsent;
console.log(ok ? '\n>>> PASS' : '\n>>> FAIL');
process.exit(ok ? 0 : 1);
