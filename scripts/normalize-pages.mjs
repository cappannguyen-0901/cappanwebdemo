#!/usr/bin/env node
/* Chuẩn hoá <head> + thứ tự nạp script + các thuộc tính trợ năng cho toàn bộ trang.
   Chạy: node scripts/normalize-pages.mjs
   Idempotent: chạy nhiều lần không nhân bản thẻ. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pages = fs.readdirSync(ROOT).filter(f => f.endsWith('.html')).sort();

const DESCRIPTION =
  'CAPPAN – Coffee & More · Home Study. Đặt bàn theo sơ đồ, gọi món, theo dõi đơn và trò chuyện ' +
  'với trợ lý AI tại quán cà phê CAPPAN, Gò Vấp, TP.HCM.';
const HEAD_BLOCK = `<!-- CAPPAN head chuẩn hoá -->
<link rel="icon" type="image/svg+xml" href="favicon.svg">
<meta name="theme-color" content="#6F4E37">
<meta name="color-scheme" content="light dark">
<meta name="description" content="${DESCRIPTION}">
<meta property="og:title" content="CAPPAN – Coffee & More">
<meta property="og:description" content="${DESCRIPTION}">
<meta property="og:type" content="website">
<meta property="og:locale" content="vi_VN">
<meta property="og:image" content="assets/images/photo-1554118811-1e0d58224f24-w900.jpg">
<meta name="twitter:card" content="summary_large_image">`;

/* Khối theme thứ hai (trùng với khối đầu) — xoá để chỉ còn một nguồn. */
const DUP_THEME = /<script>\s*\(function\(\)\{try\{\s*var t = localStorage\.getItem\('cappan_theme'\) \|\| 'light';\s*if \(t === 'dark'\) document\.documentElement\.setAttribute\('data-theme', 'dark'\);\s*\}catch\(e\)\{\}\}\)\(\);\s*<\/script>\s*/g;

/* Các tiêu đề trang: giữ nguyên <title> hiện có, chỉ bổ sung khi thiếu. */
let changed = 0;
for (const file of pages) {
  const full = path.join(ROOT, file);
  let html = fs.readFileSync(full, 'utf8');
  const before = html;

  /* 1. Bỏ khối theme lặp (giữ khối đầu tiên đọc prefers-color-scheme). */
  html = html.replace(DUP_THEME, '');

  /* 2. Head chuẩn: favicon, theme-color, description, OG. Đặt ngay sau </title>. */
  if (!/name="description"/.test(html)) {
    if (/<\/title>/.test(html)) html = html.replace(/<\/title>/, '</title>\n' + HEAD_BLOCK);
    else html = html.replace(/<head>/i, '<head>\n' + HEAD_BLOCK);
  } else if (!/rel="icon"/.test(html)) {
    html = html.replace(/<meta name="viewport"[^>]*>/, m => `${m}\n<link rel="icon" type="image/svg+xml" href="favicon.svg">`);
  }

  /* 3. Nạp core trước api (một lần duy nhất). */
  if (!/js\/core\.js/.test(html) && /<script src="js\/api\/index\.js"><\/script>/.test(html)) {
    html = html.replace(
      '<script src="js/api/index.js"></script>',
      '<script src="js/core.js"></script>\n<script src="js/api/index.js"></script>'
    );
  }

  /* 4. Ảnh có src rỗng: bỏ src, JS sẽ gắn khi có ảnh thật. */
  html = html.replace(/<img id="seatInfoImg" src="" alt="Chỗ ngồi">/g, '<img id="seatInfoImg" alt="Chỗ ngồi">');

  /* 5. Nhãn cho các nút biểu tượng (trợ lý, theme, menu) + aria-current cho nav. */
  html = html.replace(/<button class="menu-toggle"([^>]*)>/g, (m, attrs) =>
    /aria-label/.test(attrs) ? m : `<button class="menu-toggle" aria-label="Mở menu"${attrs}>`);
  html = html.replace(/<button class="theme-toggle"([^>]*)>/g, (m, attrs) =>
    /aria-label/.test(attrs) ? m : `<button class="theme-toggle" aria-label="Chuyển chế độ sáng/tối"${attrs}>`);
  html = html.replace(/<button class="chat-btn"([^>]*)>/g, (m, attrs) =>
    /aria-label/.test(attrs) ? m : `<button class="chat-btn" aria-label="Mở trợ lý AI" aria-controls="chatBox" aria-expanded="false"${attrs}>`);
  html = html.replace(/<a href="([^"]+)" class="active">/g,
    '<a href="$1" class="active" aria-current="page">');

  /* 6. Toast là vùng thông báo cho trình đọc màn hình. */
  html = html.replace(/<div class="toast" id="toast">/g,
    '<div class="toast" id="toast" role="status" aria-live="polite">');

  /* 7. Nút chat đóng/mở: đồng bộ aria-expanded khi bấm. */
  html = html.replace(/<button class="chat-btn"([^>]*)>/g, (m, attrs) =>
    /aria-expanded/.test(attrs) ? m : `<button class="chat-btn" aria-expanded="false"${attrs}>`);

  if (html !== before) {
    fs.writeFileSync(full, html, 'utf8');
    changed++;
    console.log('updated', file);
  }
}
console.log(`normalize-pages: ${changed}/${pages.length} trang thay đổi`);
