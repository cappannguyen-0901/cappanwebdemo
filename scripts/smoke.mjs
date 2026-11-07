#!/usr/bin/env node
/* Smoke trên Chromium thật (Chrome/Edge headless), chạy bản dist tự chứa.
   Không cài Playwright. Bỏ qua nếu máy không có Chrome/Edge. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');

const CHROME_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
];
const chrome = CHROME_CANDIDATES.find(p => fs.existsSync(p));
if (!chrome) {
  console.log('⚠ không tìm thấy Chrome/Edge — bỏ qua smoke (chạy được trên máy có trình duyệt)');
  process.exit(0);
}
if (!fs.existsSync(path.join(DIST, 'build.json'))) {
  console.error('✖ chưa có dist — chạy npm run build trước');
  process.exit(1);
}

const build = JSON.parse(fs.readFileSync(path.join(DIST, 'build.json'), 'utf8'));
const CASES = [
  { page: 'index.html', must: ['floor-card', 'Tầng trệt'] },
  { page: 'menu.html', must: ['Cà Phê Sữa Đá', 'menu-card'] },
  { page: 'booking.html', must: ['Đặt chỗ', 'seat'] },
  { page: 'cart.html', must: ['Giỏ'] },
  { page: 'login.html', must: ['Tài khoản demo', 'loginPhone'] },
  { page: 'tracking.html', must: ['Theo dõi'] },
  { page: 'contact.html', must: ['Liên hệ'] },
  { page: 'privacy.html', must: ['Chính sách'] },
  { page: 'order.html', must: ['Đặt nước'] },
  { page: 'profile.html', must: ['Hồ sơ'] }
];

/* ?as= chỉ có ở bản demo: kiểm luôn các trang nhân viên. */
if (build.mode === 'demo') {
  CASES.push(
    { page: 'staff-dashboard.html', query: '?as=0900000002', must: ['Nhật ký hoạt động', 'Sơ đồ chỗ ngồi'] },
    { page: 'staff-cashier.html', query: '?as=0900000002', must: ['Thu ngân', 'Hoá đơn'] },
    { page: 'staff-order-board.html', query: '?as=0900000002', must: ['Order Board', 'MỚI'] },
    { page: 'staff-runner.html', query: '?as=0900000002', must: ['Runner View', 'Table Service'] },
    { page: 'staff-owner.html', query: '?as=0900000002', must: ['Owner Cockpit', 'Alert Center'] },
    { page: 'table.html', query: '?table=A1&code=1234', must: ['QR TABLE SESSION', 'Bàn A1'] },
    { page: 'staff-orders.html', query: '?as=0900000002', must: ['Đơn hàng'] },
    { page: 'staff-bookings.html', query: '?as=0900000002', must: ['Danh sách booking'] },
    { page: 'staff-stats.html', query: '?as=0900000002', must: ['Thống kê'] },
    { page: 'staff-menu-manage.html', query: '?as=0900000002', must: ['Quản lý menu'] },
    { page: 'staff-ingredients.html', query: '?as=0900000002', must: ['Quản lý nguyên liệu', 'Bột matcha'] },
    { page: 'staff-promotions.html', query: '?as=0900000002', must: ['Khuyến mãi'] },
    { page: 'staff-schedule.html', query: '?as=0900000002', must: ['Lịch ca'] },
    { page: 'staff-ai.html', query: '?as=0900000002', must: ['AI'] }
  );
}

const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cappan-smoke-'));
let failed = 0;

function run(url) {
  return spawnSync(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--allow-file-access-from-files',
    '--user-data-dir=' + profileDir,
    '--virtual-time-budget=5000',
    '--dump-dom',
    url
  ], { encoding: 'utf8', timeout: 45000, maxBuffer: 32 * 1024 * 1024 });
}

for (const c of CASES) {
  const file = path.join(DIST, c.page);
  const url = 'file:///' + file.replace(/\\/g, '/') + (c.query || '');
  const res = run(url);

  if (res.error || res.status !== 0) {
    console.error(`✖ ${c.page}: Chrome lỗi — ${res.error ? res.error.message : 'exit ' + res.status}`);
    failed++;
    continue;
  }
  const dom = res.stdout || '';
  const err = res.stderr || '';
  const missing = c.must.filter(m => !dom.includes(m));
  const jsError = /Uncaught (TypeError|ReferenceError|SyntaxError)/.test(err);
  if (missing.length || jsError) {
    console.error(`✖ ${c.page}: thiếu [${missing.join(', ')}]${jsError ? ' · có lỗi JS' : ''}`);
    if (jsError) console.error(err.split('\n').filter(l => /Uncaught|TypeError|ReferenceError/.test(l)).slice(0, 3).join('\n'));
    failed++;
  } else {
    console.log(`✔ ${c.page}`);
  }
}

/* Banner demo chỉ xuất hiện ở mode demo. */
const idx = run('file:///' + path.join(DIST, 'index.html').replace(/\\/g, '/'));
const hasBanner = /<div class="demo-banner"/.test(idx.stdout || '');
if (build.mode === 'demo' && !hasBanner) { console.error('✖ demo: thiếu banner demo'); failed++; }
if (build.mode === 'prod' && hasBanner) { console.error('✖ prod: vẫn còn banner demo'); failed++; }

try { fs.rmSync(profileDir, { recursive: true, force: true }); } catch (e) {}

if (failed) {
  console.error(`✖ smoke: ${failed} mục lỗi`);
  process.exit(1);
}
console.log(`✔ smoke: ${CASES.length} trang trên ${path.basename(chrome)} · mode=${build.mode}`);
