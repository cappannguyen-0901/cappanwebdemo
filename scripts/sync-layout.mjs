#!/usr/bin/env node
/* Một nguồn cho header/footer: sinh lại <header>/<footer> của mọi trang từ cấu hình.
   Chạy: node scripts/sync-layout.mjs
   Đổi menu/footer chỉ sửa tệp này, không phải sửa 19 trang. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const CUSTOMER_LINKS = [
  ['index.html', 'Trang chủ'],
  ['menu.html', 'Thực đơn'],
  ['booking.html', 'Đặt chỗ'],
  ['order.html', 'Đặt nước'],
  ['tracking.html', 'Theo dõi đơn'],
  ['contact.html', 'Liên hệ']
];

const THEME_BUTTON = '<button class="theme-toggle" aria-label="Chuyển chế độ sáng/tối" id="themeToggle" onclick="toggleDarkMode()" title="Chuyển chế độ Sáng/Tối">🌙</button>';

export function renderCustomerHeader(activePage) {
  const items = CUSTOMER_LINKS.map(([href, label]) => {
    const active = href === activePage;
    return `      <li><a href="${href}"${active ? ' class="active" aria-current="page"' : ''}>${label}</a></li>`;
  }).join('\n');
  return `<header class="app-header">
  <a class="logo" href="index.html">
    <span class="brand">CAPP<span>AN</span></span>
    <span class="tagline">Coffee &amp; More - Home Study</span>
  </a>
  <button class="menu-toggle" aria-label="Mở menu" onclick="toggleMobileMenu()">☰</button>
  <nav class="nav" id="mainNav">
    <ul class="nav-list">
${items}
    </ul>
    <div class="user-area" id="userArea"></div>
    ${THEME_BUTTON}
  </nav>
</header>`;
}

export function renderStaffHeader() {
  return `<header class="app-header">
  <a class="logo" href="staff-dashboard.html">
    <span class="brand">CAPP<span>AN</span></span>
    <span class="tagline">Staff Panel</span>
  </a>
  <button class="menu-toggle" aria-label="Mở menu" onclick="toggleMobileMenu()">☰</button>
  <nav class="nav" id="mainNav"></nav>
</header>`;
}

export function headerFor(page) {
  return page.startsWith('staff-') ? renderStaffHeader() : renderCustomerHeader(page);
}

const FOOTER_LINKS = [
  ['index.html', 'Trang chủ'],
  ['menu.html', 'Thực đơn'],
  ['booking.html', 'Đặt chỗ'],
  ['order.html', 'Đặt nước'],
  ['cart.html', 'Giỏ hàng'],
  ['tracking.html', 'Theo dõi đơn'],
  ['contact.html', 'Liên hệ'],
  ['privacy.html', 'Chính sách bảo mật']
];

export function renderFooter(minimal = false) {
  const links = (minimal ? [['privacy.html', 'Chính sách bảo mật']] : FOOTER_LINKS)
    .map(([href, label]) => `    <a href="${href}">${label}</a>`).join('\n');
  const copy = minimal
    ? '© CAPPANNGUYEN · Hotline: 0366 444 038'
    : '© CAPPANNGUYEN · Công viên Gia Định, P. Hạnh Thông, Q.Gò Vấp, TP.HCM · Hotline: 0366 444 038';
  return `<footer class="app-footer">
  <div class="footer-brand">CAPP<span>AN</span></div>
  <div class="footer-tagline">Coffee &amp; More - Home Study</div>
  <div class="footer-links">
${links}
  </div>
  <div class="footer-copy">${copy}</div>
</footer>`;
}

export function footerFor(page) {
  if (page.startsWith('staff-')) return null;
  return renderFooter(page === 'login.html' || page === 'register.html');
}

function main() {
  const pages = fs.readdirSync(ROOT).filter(f => f.endsWith('.html')).sort();
  let changed = 0;
  for (const page of pages) {
    const full = path.join(ROOT, page);
    const html = fs.readFileSync(full, 'utf8');
    let next = html.replace(/<header class="app-header">[\s\S]*?<\/header>/, headerFor(page));
    const footer = footerFor(page);
    if (footer) next = next.replace(/<footer class="app-footer">[\s\S]*?<\/footer>/, footer);
    /* Chuẩn hoá xuống dòng để so sánh/ghi tệp ổn định trên Windows và Linux. */
    next = next.replace(/\r\n/g, '\n');
    if (next !== html) {
      fs.writeFileSync(full, next, 'utf8');
      changed++;
      console.log('layout →', page);
    }
  }
  console.log(`sync-layout: ${changed}/${pages.length} trang cập nhật`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
