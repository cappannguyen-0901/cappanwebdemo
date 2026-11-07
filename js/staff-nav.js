/* ============================================================
   STAFF NAV — menu dùng chung cho tất cả trang staff
============================================================ */

function renderStaffNav(activePage) {
  const nav = document.getElementById('mainNav');
  if (!nav) return;

  const items = [
    { href: 'staff-dashboard.html', label: '📊 Tổng quan',     id: 'dashboard' },
    { href: 'staff-owner.html',     label: '🧭 Owner',          id: 'owner' },
    { href: 'staff-cashier.html',   label: '🧾 Thu ngân',       id: 'cashier' },
    { href: 'staff-kds.html',       label: '🎙 KDS',            id: 'kds' },
    { href: 'staff-stats.html',     label: '📈 Thống kê',       id: 'stats' },
    { href: 'staff-ai.html',        label: '🤖 AI',             id: 'ai' },
    { href: 'staff-orders.html',    label: '📦 Đơn',            id: 'orders' },
    { href: 'staff-bookings.html',  label: '🪑 Booking',         id: 'bookings' },
    { href: 'staff-menu-manage.html', label: '☕ Menu',          id: 'menu' },
    { href: 'staff-ingredients.html', label: '📦 Kho',           id: 'ingredients' },
    { href: 'staff-promotions.html', label: '🎁 KM',             id: 'promotions' },
    { href: 'staff-schedule.html',  label: '📅 Ca',             id: 'schedule' }
  ];

  const listHtml = items.map(it =>
    `<li><a href="${it.href}" class="${it.id === activePage ? 'active' : ''}">${it.label}</a></li>`
  ).join('');

  // ⚡ Cập nhật: Thêm nút Dark Mode vào ngay sau khu vực user
  nav.innerHTML = `
    <ul class="nav-list">${listHtml}</ul>
    <div class="user-area" id="userArea"></div>
    <button class="theme-toggle" id="themeToggle" onclick="toggleDarkMode()" title="Chuyển chế độ Sáng/Tối">🌙</button>
  `;

  if (typeof updateUserArea === 'function') updateUserArea();
  
  // ⚡ Đồng bộ icon Sáng/Tối ngay khi render menu
  if (typeof updateThemeIcon === 'function') {
        updateThemeIcon(document.documentElement.getAttribute('data-theme') === 'dark');
  }
}