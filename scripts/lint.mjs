#!/usr/bin/env node
/* Lint nhẹ, không cần cài gói: cú pháp JS + bất biến HTML + cảnh báo chất lượng. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const warnings = [];

const rel = p => path.relative(ROOT, p).replace(/\\/g, '/');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

/* ---------- 1. Cú pháp JavaScript ---------- */
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'dist', 'cappan-v2', 'assets'].includes(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (e.name.endsWith('.js') || e.name.endsWith('.mjs')) out.push(full);
  }
  return out;
}

const jsFiles = walk(ROOT).filter(f => !f.includes(`${path.sep}scripts${path.sep}`));
for (const file of jsFiles) {
  const code = fs.readFileSync(file, 'utf8');
  try {
    if (file.endsWith('.mjs')) {
      if (typeof vm.SourceTextModule === 'function') new vm.SourceTextModule(code, { identifier: file });
    } else {
      new vm.Script(code, { filename: file });
    }
  } catch (e) {
    errors.push(`${rel(file)}: lỗi cú pháp — ${e.message}`);
  }
}

/* ---------- 2. Bất biến HTML ---------- */
const pages = fs.readdirSync(ROOT).filter(f => f.endsWith('.html')).sort();
let totalScripts = 0;
for (const page of pages) {
  const html = read(page);
  const where = `${page}`;

  if (!/<html lang="vi">/.test(html)) errors.push(`${where}: thiếu <html lang="vi">`);
  if (!/name="viewport"/.test(html)) errors.push(`${where}: thiếu viewport`);
  if (!/<title>[^<]+<\/title>/.test(html)) errors.push(`${where}: thiếu <title>`);
  if (!/name="description"/.test(html)) errors.push(`${where}: thiếu meta description`);
  if (!/rel="icon"/.test(html)) errors.push(`${where}: thiếu favicon`);
  if (!/theme-color/.test(html)) errors.push(`${where}: thiếu theme-color`);
  if (!/js\/core\.js/.test(html)) errors.push(`${where}: thiếu js/core.js`);
  if (/images\.unsplash\.com/.test(html)) errors.push(`${where}: còn ảnh Unsplash`);

  const themeRefs = (html.match(/cappan_theme/g) || []).length;
  if (themeRefs !== 1) errors.push(`${where}: cappan_theme xuất hiện ${themeRefs} lần (phải 1)`);

  const coreAt = html.indexOf('js/core.js');
  const apiAt = html.indexOf('js/api/index.js');
  if (coreAt < 0 || apiAt < 0 || coreAt > apiAt) errors.push(`${where}: core phải nạp trước api`);

  const srcs = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m => m[1]);
  totalScripts += srcs.length;
  const dups = [...new Set(srcs.filter((s, i) => srcs.indexOf(s) !== i))];
  if (dups.length) errors.push(`${where}: script trùng — ${dups.join(', ')}`);

  const refs = [...html.matchAll(/(?:src|href)="((?!https?:|data:|tel:|mailto:|javascript:|#|\$\{)[^"]+)"/g)].map(m => m[1]);
  for (const ref of refs) {
    const clean = ref.split('?')[0].split('#')[0];
    if (clean && !fs.existsSync(path.join(ROOT, clean))) {
      errors.push(`${where}: thiếu tệp ${clean}`);
    }
  }

  if (/<img[^>]+src=""/.test(html)) errors.push(`${where}: còn <img src="">`);
}

/* ---------- 3. Cảnh báo (không chặn) ---------- */
const apiCode = read('js/api/index.js');
const localCount = (apiCode.match(/localStorage/g) || []).length;
if (localCount > 60) warnings.push(`js/api/index.js gọi localStorage ${localCount} lần — nên gom vào storage driver`);
if (/console\.log\(/.test(apiCode)) warnings.push('js/api/index.js còn console.log');

for (const page of pages) {
  const html = read(page);
  const inline = (html.match(/onclick="/g) || []).length;
  if (inline > 30) warnings.push(`${page}: ${inline} onclick nội tuyến — khó bảo trì`);
}

if (totalScripts > 520) warnings.push(`tổng ${totalScripts} thẻ <script src> — nên gom entry theo trang`);

/* ---------- 4. Kết quả ---------- */
if (warnings.length) {
  console.log(`\n⚠  ${warnings.length} cảnh báo:`);
  warnings.forEach(w => console.log('   - ' + w));
}
if (errors.length) {
  console.error(`\n✖ ${errors.length} lỗi lint:`);
  errors.forEach(e => console.error('   - ' + e));
  process.exit(1);
}
console.log(`\n✔ lint sạch: ${jsFiles.length} tệp JS, ${pages.length} trang HTML, ${totalScripts} thẻ script`);
