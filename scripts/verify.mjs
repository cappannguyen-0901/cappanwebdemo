#!/usr/bin/env node
/* Nghiệm thu bản dist: tự chứa, đúng chế độ, không còn tham chiếu file rời,
   không còn ảnh Internet (chạy được offline). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const errors = [];

if (!fs.existsSync(path.join(DIST, 'build.json'))) {
  console.error('✖ chưa có dist/build.json — chạy npm run build trước');
  process.exit(1);
}

const build = JSON.parse(fs.readFileSync(path.join(DIST, 'build.json'), 'utf8'));
const expected = fs.readdirSync(ROOT).filter(f => f.endsWith('.html')).sort();
const actual = fs.readdirSync(DIST).filter(f => f.endsWith('.html')).sort();

if (JSON.stringify(expected) !== JSON.stringify(actual)) {
  errors.push(`số trang không khớp: mong ${expected.length}, có ${actual.length}`);
}
if (!['demo', 'prod'].includes(build.mode)) errors.push(`mode lạ: ${build.mode}`);

for (const page of actual) {
  const html = fs.readFileSync(path.join(DIST, page), 'utf8');
  if (/\ssrc="js\//.test(html)) errors.push(`${page}: còn <script src="js/...">`);
  if (/<link[^>]+rel="stylesheet"[^>]+href="(?!https?:)[^"]+\.css"/.test(html)) {
    errors.push(`${page}: còn <link> CSS rời`);
  }
  if (!/<style\b/.test(html)) errors.push(`${page}: không có <style> nội tuyến`);
  if (!/window\.CAPPAN_MODE=/.test(html)) errors.push(`${page}: thiếu CAPPAN_MODE`);
  if (!/CappanConfig/.test(html)) errors.push(`${page}: thiếu js/core.js nội tuyến`);
  if (!/id="toast"/.test(html)) errors.push(`${page}: thiếu khung toast`);
  if (/<img[^>]+src=""/.test(html)) errors.push(`${page}: còn <img src="">`);
  if (/images\.unsplash\.com/.test(html)) errors.push(`${page}: còn ảnh Unsplash (mất mạng là vỡ)`);

  const bytes = Buffer.byteLength(html);
  if (bytes > 1.4 * 1024 * 1024) errors.push(`${page}: ${(bytes / 1024).toFixed(0)} KB (> 1.4 MB)`);

  /* Ảnh nội bộ phải được copy sang dist. */
  for (const m of html.matchAll(/assets\/images\/[^"')\s]+/g)) {
    if (!fs.existsSync(path.join(DIST, m[0]))) errors.push(`${page}: thiếu ảnh ${m[0]}`);
  }
}

if (build.mode === 'demo') {
  const idx = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
  if (!/name="robots"[^>]+noindex/.test(idx)) errors.push('bản demo nên có noindex');
} else {
  const login = fs.readFileSync(path.join(DIST, 'login.html'), 'utf8');
  if (/<div class="demo-accounts"/.test(login)) errors.push('bản prod còn khối tài khoản demo');
  if (/API\.users\.seedDemo\(\)/.test(login)) errors.push('bản prod còn seed tài khoản demo');
}

if (errors.length) {
  console.error(`✖ verify: ${errors.length} lỗi`);
  errors.forEach(e => console.error('   - ' + e));
  process.exit(1);
}
console.log(`✔ verify: ${actual.length} trang tự chứa · mode=${build.mode} · ${(build.totalBytes / 1024 / 1024).toFixed(1)} MB`);
