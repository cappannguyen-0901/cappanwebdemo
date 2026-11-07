/* Kiểm tra tĩnh: head, thứ tự script, tài nguyên nội bộ, layout một nguồn, ảnh.
   Chạy tự động trong `npm test` — không cần trình duyệt. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { headerFor, footerFor, CUSTOMER_LINKS } from '../scripts/sync-layout.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pages = fs.readdirSync(ROOT).filter(f => f.endsWith('.html')).sort();

const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\r\n/g, '\n');

for (const page of pages) {
  test(`trang ${page}: head + thứ tự script + tài nguyên`, () => {
    const html = read(page);
    assert.match(html, /<html lang="vi">/);
    assert.match(html, /name="viewport"/);
    assert.match(html, /<link rel="icon"[^>]+favicon\.svg/);
    assert.match(html, /name="description"/);
    assert.match(html, /name="theme-color"/);
    assert.match(html, /property="og:title"/);
    assert.match(html, /<body[^>]+data-page="[^"]+"/);

    // Chỉ một khối đọc cappan_theme trong HTML (không lặp 2 lần).
    const themeRefs = (html.match(/cappan_theme/g) || []).length;
    assert.equal(themeRefs, 1, `cappan_theme xuất hiện ${themeRefs} lần`);

    // core phải nạp trước api.
    const coreAt = html.indexOf('js/core.js');
    const apiAt = html.indexOf('js/api/index.js');
    assert.ok(coreAt > 0, 'thiếu js/core.js');
    assert.ok(apiAt > coreAt, 'js/core.js phải nạp trước js/api/index.js');

    // Không có script trùng.
    const srcs = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m => m[1]);
    const dup = srcs.filter((s, i) => srcs.indexOf(s) !== i);
    assert.deepEqual([...new Set(dup)], [], `script trùng: ${[...new Set(dup)].join(', ')}`);

    // Không phụ thuộc ảnh Internet (mất mạng vẫn đủ giao diện).
    assert.ok(!/images\.unsplash\.com/.test(html), 'còn ảnh Unsplash');

    // Mọi tài nguyên nội bộ phải tồn tại.
    const refs = [...html.matchAll(/(?:src|href)="((?!https?:|data:|tel:|mailto:|javascript:|#|\$\{)[^"]+)"/g)].map(m => m[1]);
    for (const ref of refs) {
      const clean = ref.split('?')[0].split('#')[0];
      if (!clean || clean.startsWith('//')) continue;
      assert.ok(fs.existsSync(path.join(ROOT, clean)), `${page}: thiếu tệp ${clean}`);
    }

    // Không còn ảnh src rỗng.
    assert.ok(!/<img[^>]+src=""/.test(html), 'còn <img src="">');
  });
}

test('mọi ảnh nội bộ được tham chiếu đều tồn tại', () => {
  const files = [];
  const walk = dir => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (['cappan-v2', 'dist', 'node_modules', '.git', 'assets'].includes(e.name)) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (/\.(js|css|html)$/.test(e.name)) files.push(full);
    }
  };
  walk(ROOT);
  const missing = new Set();
  for (const f of files) {
    for (const m of fs.readFileSync(f, 'utf8').matchAll(/assets\/images\/[^"')\s]+/g)) {
      if (!fs.existsSync(path.join(ROOT, m[0]))) missing.add(`${path.relative(ROOT, f)} → ${m[0]}`);
    }
  }
  assert.deepEqual([...missing], []);
});

test(`header của ${pages.length} trang khớp một nguồn (scripts/sync-layout.mjs)`, () => {
  for (const page of pages) {
    assert.ok(read(page).includes(headerFor(page)), `${page}: header lệch — chạy npm run sync`);
  }
});

test('footer của các trang khớp một nguồn', () => {
  for (const page of pages) {
    const footer = footerFor(page);
    if (!footer) continue;
    assert.ok(read(page).includes(footer), `${page}: footer lệch — chạy npm run sync`);
  }
});

test('không trang nào còn khối theme lặp', () => {
  for (const page of pages) {
    const html = read(page);
    const blocks = html.match(/localStorage\.getItem\('cappan_theme'\)/g) || [];
    assert.equal(blocks.length, 1, `${page}: ${blocks.length} khối theme`);
  }
});

test('menu khách có đủ link (không còn Giỏ hàng trên nav) ở mọi trang khách', () => {
  const customerPages = pages.filter(p => !p.startsWith('staff-'));
  for (const page of customerPages) {
    const html = read(page);
    for (const [href] of CUSTOMER_LINKS) {
      assert.ok(html.includes(`href="${href}"`), `${page}: thiếu link ${href}`);
    }
  }
});

test('trang nhân viên có guard + core + API trước khi render', () => {
  const staffPages = pages.filter(p => p.startsWith('staff-'));
  assert.ok(staffPages.length >= 9, 'phải có đủ trang nhân viên');
  for (const page of staffPages) {
    const html = read(page);
    assert.match(html, /js\/staff-guard\.js/, `${page}: thiếu staff-guard.js`);
    assert.match(html, /js\/core\.js/, `${page}: thiếu core.js`);
    assert.match(html, /js\/api\/index\.js/, `${page}: thiếu api/index.js`);
  }
});

test('trang thu ngân tồn tại và nằm trong menu nhân viên', () => {
  assert.ok(fs.existsSync(path.join(ROOT, 'staff-cashier.html')));
  const nav = read('js/staff-nav.js');
  assert.match(nav, /staff-cashier\.html/);
  assert.match(read('staff-cashier.html'), /js\/cashier\.js/);
  assert.match(read('staff-cashier.html'), /cashier\.css/);
});

test('mọi trang khách đều có trợ lý AI (kể cả đăng nhập / chính sách)', () => {
  const customerPages = pages.filter(p => !p.startsWith('staff-'));
  for (const page of customerPages) {
    const html = read(page);
    assert.match(html, /id="chatBox"/, `${page}: thiếu khung chat`);
    assert.match(html, /id="chatInput"/, `${page}: thiếu ô nhập chat`);
  }
});

test('FX không làm ẩn panel danh sách dài (lỗi đơn hàng vào không hiện)', () => {
  const fx = read('js/fx.js');
  assert.ok(!/REVEAL_EARLY\s*=\s*[^;]*\.staff-panel/.test(fx), 'staff-panel phải ra khỏi REVEAL_EARLY');
  assert.match(fx, /innerHeight\s*\*\s*0\.9/, 'phải bỏ qua reveal cho khối cao hơn viewport');
});

test('Nhân viên có nút đặt bàn + tab đang giữ + cọc', () => {
  const html = read('staff-bookings.html');
  assert.match(html, /id="staffBookingModal"/);
  assert.match(html, /openStaffBooking\(\)/);
  assert.match(html, /setFilter\('held'\)/);
  assert.match(html, /toggleDeposit/);
  assert.match(html, /createByStaff/);
});

test('Trang báo cáo có kỳ ngày/tuần/tháng/năm, KPI, kênh bán, booking, email, xuất CSV', () => {
  const html = read('staff-stats.html');
  for (const id of ['statsGrid', 'chartBars', 'channelPayment', 'topItems', 'bookingStats', 'reportHeadline', 'reportInsights']) {
    assert.match(html, new RegExp('id="' + id + '"'));
  }
  assert.match(html, /setStatsRange\('week'\)/);
  assert.match(html, /setStatsRange\('year'\)/);
  assert.match(html, /exportStatsCSV/);
  assert.match(html, /API\.stats\.bookingsSummary/);
  assert.match(html, /sendReportEmail/);
  assert.match(html, /emailSettingsModal/);
  assert.match(html, /ReportEngine/);
});

test('Automation engine có 3 rule, dry-run/undo/audit và nạp qua Ctrl+Shift+D', () => {
  const auto = read('js/automation.js');
  const demo = read('js/demo.js');
  assert.match(auto, /autoReleaseHeld/);
  assert.match(auto, /outOfStock/);
  assert.match(auto, /syncIngredientRule/);
  assert.match(auto, /ingredientEnabled/);
  assert.match(auto, /undoLast/);
  assert.match(auto, /heldMinutes/);
  assert.match(demo, /automationDemo/);
  assert.match(demo, /Ctrl/);
  assert.match(demo, /e\.key === 'D'/);
});

test('Trang đơn hàng render lại khi dữ liệu đổi + chịu được đơn thiếu items', () => {
  const html = read('staff-orders.html');
  assert.match(html, /cappan:sync/);
  assert.match(html, /Array\.isArray\(o\.items\)/);
  assert.match(html, /renderOrderTabCounts/);
});

test('Schema & booking page có trạng thái held + cọc', () => {
  const schema = read('js/data/schema.js');
  assert.match(schema, /bookingStatus:\s*\[[^\]]*'held'/);
  const booking = read('booking.html');
  assert.match(booking, /legendHeld/);
  assert.match(booking, /bkDeposit/);
  assert.match(booking, /isHeld/);
});

test('Chat đặt bàn = giữ bàn + cọc; form có giờ gợi ý chữ nâu', () => {
  const main = read('js/main.js');
  const brain = read('js/ai/brain.js');
  const booking = read('booking.html');
  const css = read('ui-polish.css');
  assert.match(main, /BOOKING_PAYMENT/);
  assert.match(main, /Mở trang thanh toán/);
  assert.match(brain, /API\.bookings\.hold\(/);
  assert.match(brain, /_bookingDepositStep/);
  assert.match(booking, /id="timeSuggest"/);
  assert.match(booking, /function renderTimeSuggestions/);
  assert.match(css, /\.time-suggest .quick-time-btn/);
});

test('Chữ nhập dùng màu nâu ở cả light/dark, chat/tìm kiếm giữ nền trắng', () => {
  const css = read('ui-polish.css');
  assert.match(css, /--input-ink:\s*#5D4037/);
  assert.match(css, /--input-ink:\s*#E7C9A9/);
  assert.match(css, /html\[data-theme\] body \.search-box input/);
  assert.match(css, /html\[data-theme\] body #menuSearch/);
  assert.match(css, /html body input\[type\]:not\(\[type="submit"\]\)/);
  assert.match(css, /-webkit-text-fill-color:\s*#5D4037 !important/);
});

test('Chat không tự reset: transcript đầy đủ được lưu và khôi phục', () => {
  const main = read('js/main.js');
  assert.match(main, /cappan_chat_transcript_v1/);
  assert.match(main, /ChatTranscript\.render\(\)/);
  assert.match(main, /recordCardData/);
  const panel = read('js/chat-panel.js');
  assert.match(panel, /ChatTranscript\.render\(\)/);
  assert.match(panel, /ChatTranscript\.clear\(\)/);
});

test('Realtime cùng tab + sơ đồ ghế nhân viên + bỏ giỏ hàng khỏi nav', () => {
  const rt = read('js/realtime.js');
  assert.match(rt, /queueMicrotask\(\(\) => routeSync\(data\)\)/);
  assert.match(rt, /payload:\s*e && e\.detail/);
  const dash = read('staff-dashboard.html');
  assert.match(dash, /openWalkInSeat\(/);
  assert.match(dash, /id="dashWalkInModal"/);
  assert.match(dash, /createWalkIn/);
  for (const page of ['index.html', 'menu.html', 'order.html', 'booking.html', 'cart.html', 'tracking.html', 'contact.html', 'profile.html', 'login.html', 'register.html', 'privacy.html']) {
    assert.ok(!read(page).includes('<li><a href="cart.html"'), `${page}: vẫn còn link Giỏ hàng trên nav`);
  }
});
