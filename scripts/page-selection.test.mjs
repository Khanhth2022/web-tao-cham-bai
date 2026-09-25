import assert from 'node:assert/strict';
import { selectPdfPages } from '../page-selection.js';
assert.deepEqual(selectPdfPages('', 4), [1, 2, 3, 4]);
assert.deepEqual(selectPdfPages('1, 3, 5-6, 6', 8), [1, 3, 5, 6]);
assert.throws(() => selectPdfPages('0,2', 4), /từ 1 đến 4/);
assert.throws(() => selectPdfPages('2-9', 4), /từ 1 đến 4/);
assert.throws(() => selectPdfPages('1-3', 5, 2), /tối đa 2 trang/);
console.log('PASS: PDF page selection validation.');
