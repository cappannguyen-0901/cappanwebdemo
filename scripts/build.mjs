#!/usr/bin/env node
/* Đóng gói toàn bộ trang thành HTML tự chứa trong dist/ (CSS + JS nhúng).
   Không cần cài gói. Chạy: node scripts/build.mjs [--mode demo|prod] */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'dist');
const args = process.argv.slice(2);
const modeArg = args.includes('--mode') ? args[args.indexOf('--mode') + 1] : 'demo';
const MODE = modeArg === 'prod' ? 'prod' : 'demo';
const pages = fs.readdirSync(ROOT).filter(f => f.endsWith('.html')).sort();

if (!OUT.startsWith(ROOT + path.sep)) {
  console.error('Đường dẫn dist không hợp lệ:', OUT);
  process.exit(1);
}

const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const escClose = (code, tag) => code.replace(new RegExp(`</${tag}`, 'gi'), `<\\/${tag}`);

let inlinedCss = 0;
let inlinedJs = 0;
const report = [];

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

for (const page of pages) {
  let html = read(page);

  /* 1. CSS nội bộ → <style> */
  html = html.replace(/<link\b[^>]*href="([^"]+\.css)"[^>]*>/gi, (tag, href) => {
    if (/^https?:|^\/\//.test(href)) return tag;
    const file = path.join(ROOT, href.split('?')[0]);
    if (!fs.existsSync(file)) throw new Error(`${page}: không tìm thấy CSS ${href}`);
    inlinedCss++;
    return `<style data-src="${href}">\n${escClose(fs.readFileSync(file, 'utf8'), 'style')}\n</style>`;
  });

  /* 2. JS nội bộ → <script> */
  html = html.replace(/<script\b([^>]*?)\bsrc="([^"]+)"([^>]*)><\/script>/gi, (tag, pre, src, post) => {
    if (/^https?:|^\/\//.test(src)) return tag;
    const clean = src.split('?')[0];
    const file = path.join(ROOT, clean);
    if (!fs.existsSync(file)) throw new Error(`${page}: không tìm thấy JS ${src}`);
    inlinedJs++;
    return `<script data-src="${src}">\n${escClose(fs.readFileSync(file, 'utf8'), 'script')}\n</script>`;
  });

  /* 3. Chế độ chạy (đọc bởi js/core.js) */
  html = html.replace(/<head(\s[^>]*)?>/i, m => `${m}\n<script>window.CAPPAN_MODE=${JSON.stringify(MODE)};</script>`);

  /* 3b. Bản prod: bỏ khối tài khoản demo khỏi trang đăng nhập + không seed demo. */
  if (MODE === 'prod') {
    html = html.replace(/\s*<div class="demo-accounts">[\s\S]*?<\/div>\s*<\/div>(?=\s*<\/div>)/, '');
    html = html.replace(/API\.users\.seedDemo\(\);/g, '/* seed demo da tat o ban prod */');
  }

  /* 4. Bản demo không cho máy tìm kiếm lập chỉ mục. */
  if (MODE === 'demo' && !/name="robots"/.test(html)) {
    html = html.replace('</title>', '</title>\n<meta name="robots" content="noindex">');
  }

  /* 5. Dấu build. */
  html = html.replace('<!DOCTYPE html>', `<!DOCTYPE html>\n<!-- CAPPAN build ${new Date().toISOString()} mode=${MODE} -->`);

  const outFile = path.join(OUT, page);
  fs.writeFileSync(outFile, html, 'utf8');
  report.push({ page, bytes: Buffer.byteLength(html) });
}

/* Tệp dùng chung */
for (const f of ['favicon.svg', 'robots.txt']) {
  if (fs.existsSync(path.join(ROOT, f))) fs.copyFileSync(path.join(ROOT, f), path.join(OUT, f));
}

/* Ảnh nội bộ dùng chung (không nhúng vào HTML để tránh phình trang). */
const ASSETS = path.join(ROOT, 'assets');
let assetsBytes = 0;
if (fs.existsSync(ASSETS)) {
  const target = path.join(OUT, 'assets');
  fs.cpSync(ASSETS, target, { recursive: true });
  const walkSize = dir => fs.readdirSync(dir, { withFileTypes: true }).reduce((sum, e) => {
    const full = path.join(dir, e.name);
    return sum + (e.isDirectory() ? walkSize(full) : fs.statSync(full).size);
  }, 0);
  assetsBytes = walkSize(target);
}
if (!fs.existsSync(path.join(OUT, 'robots.txt'))) {
  fs.writeFileSync(path.join(OUT, 'robots.txt'), 'User-agent: *\nAllow: /\nDisallow: /staff-\n', 'utf8');
}
if (fs.existsSync(path.join(ROOT, 'CHAY-WEB.bat'))) fs.copyFileSync(path.join(ROOT, 'CHAY-WEB.bat'), path.join(OUT, 'CHAY-WEB.bat'));

const total = report.reduce((s, r) => s + r.bytes, 0);
fs.writeFileSync(path.join(OUT, 'build.json'), JSON.stringify({
  mode: MODE,
  builtAt: new Date().toISOString(),
  pages: report,
  inlinedCss,
  inlinedJs,
  totalBytes: total,
  assetsBytes
}, null, 2), 'utf8');

console.log(`✔ build ${MODE}: ${report.length} trang → dist/`);
console.log(`  CSS nhúng: ${inlinedCss} · JS nhúng: ${inlinedJs} · HTML ${(total / 1024).toFixed(0)} KB · ảnh ${(assetsBytes / 1024 / 1024).toFixed(1)} MB`);
const big = report.filter(r => r.bytes > 1200 * 1024);
if (big.length) console.warn(`  ⚠ trang > 1.2 MB: ${big.map(b => b.page).join(', ')}`);
