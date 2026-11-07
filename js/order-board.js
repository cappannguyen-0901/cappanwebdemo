/* ============================================================
   ORDER BOARD — hàng đợi đơn đã thanh toán, không voice
   Barista bấm trạng thái; quản lý ca có thể đổi thứ tự.
============================================================ */
(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
  const SERVICE = { counter_pickup: 'Quầy', table_service: 'Tại bàn', takeaway: 'Mang đi', delivery: 'Giao hàng' };
  let timer = null;

  function toast(msg) {
    if (typeof showToast === 'function') return showToast(msg);
    console.log(msg);
  }

  function label(o) {
    return o.kitchenCode || ('#' + String(o.id || '').slice(-4).toUpperCase());
  }

  function location(o) {
    if (o.serviceType === 'table_service') return o.tableId ? 'Bàn ' + o.tableId : 'Chưa gán bàn';
    if (o.pickupCode) return 'Mã ' + o.pickupCode;
    return SERVICE[o.serviceType] || '';
  }

  function card(o) {
    const ks = o.kitchenStatus || 'submitted';
    const actions = [];
    if (ks === 'submitted') actions.push('<button class="primary" type="button" onclick="OrderBoard.status(\'' + esc(o.id) + '\',\'preparing\')">Bắt đầu</button>');
    if (ks === 'preparing') actions.push('<button class="primary" type="button" onclick="OrderBoard.status(\'' + esc(o.id) + '\',\'ready\')">Xong</button>');
    if (ks === 'ready') actions.push('<button class="primary" type="button" onclick="OrderBoard.status(\'' + esc(o.id) + '\',\'served\')">Đã phục vụ</button>');
    actions.push('<button type="button" onclick="OrderBoard.cancel(\'' + esc(o.id) + '\')">Hủy</button>');
    return `<article class="ob-card ${esc(o.serviceType)}">
      <div class="ob-top"><span class="ob-code">${esc(label(o))}</span><span class="ob-service">${esc(SERVICE[o.serviceType] || '')}</span></div>
      <div class="ob-meta">${esc(location(o))} · ${Number(o.ageMinutes) || 0} phút · ${esc(ks)}</div>
      <ul class="ob-items">${(o.items || []).map(i => `<li><span>${esc(i.name)}</span><b>×${esc(i.qty)}</b></li>`).join('')}</ul>
      <div class="ob-actions">${actions.join('')}</div>
    </article>`;
  }

  function render() {
    let q = [];
    try { q = API.orders.getKdsQueue(); } catch (e) {}
    const cols = { submitted: [], preparing: [], ready: [] };
    q.forEach(o => { const s = o.kitchenStatus || 'submitted'; if (cols[s]) cols[s].push(o); });
    [['obNew', cols.submitted], ['obDoing', cols.preparing], ['obReady', cols.ready]].forEach(([id, list]) => {
      const el = $(id);
      if (el) el.innerHTML = list.length ? list.map(card).join('') : '<div class="ob-empty">Trống.</div>';
    });
    renderCleaning();
  }

  function renderCleaning() {
    const box = $('obCleaning');
    const listEl = $('obCleaningList');
    if (!box || !listEl) return;
    let seats = [];
    try { seats = API.seats.getAll().filter(s => s.status === 'cleaning'); } catch (e) {}
    if (!seats.length) { box.style.display = 'none'; listEl.innerHTML = ''; return; }
    box.style.display = 'block';
    listEl.innerHTML = seats.map(s =>
      `<button type="button" onclick="OrderBoard.clean('${esc(s.id)}')" style="margin:2px;border:1px solid #d9c8b5;border-radius:6px;background:#fffdf9;padding:3px 7px;cursor:pointer;">Bàn ${esc(s.id)} · Đã dọn</button>`
    ).join('');
  }

  function clean(id) {
    API.seats.setStatus(id, 'available');
    render();
    toast('✓ Bàn ' + id + ' đã sẵn sàng');
  }

  function setQuickZone(status) {
    API.quickZone.set(status);
    toast('Khu tự do: ' + API.quickZone.label(status));
  }

  function status(id, next) {
    const r = API.orders.updateKitchen(id, next);
    if (!r) { toast('Không cập nhật được đơn.'); return; }
    render();
    toast(next === 'preparing' ? '▶ Đã bắt đầu' : next === 'ready' ? '✓ Đơn sẵn sàng' : '✓ Đã phục vụ');
  }

  function cancel(id) {
    const o = API.orders.getById(id);
    if (!o) return;
    if (!confirm(`Hủy đơn ${label(o)}?`)) return;
    if (API.orders.cancel(id)) { render(); toast('Đã hủy đơn.'); }
    else toast('Không hủy được đơn.');
  }

  function loadDemo() {
    const count = API.orders.getAll().length;
    const demos = [
      { serviceType: 'delivery', source: 'web', items: [{ itemId: 'M003', qty: 1, size: 'M' }], customerName: 'Khách giao hàng', phone: '0909000001', address: 'Gò Vấp', paymentMethod: 'mock_qr', paymentStatus: 'paid' },
      { serviceType: 'takeaway', source: 'web', items: [{ itemId: 'M101', qty: 1, size: 'M' }], customerName: 'Khách mang đi', paymentMethod: 'mock_qr', paymentStatus: 'paid' },
      { serviceType: 'table_service', source: 'qr_table', tableId: 'A1', items: [{ itemId: 'M001', qty: 1, size: 'M' }], customerName: 'Khách bàn A1', paymentMethod: 'mock_qr', paymentStatus: 'paid' }
    ];
    const table = API.tableSessions.join('A1');
    if (table.ok) demos[2].tableSessionId = table.session.id;
    let n = 0;
    demos.forEach(d => { if (API.orders.create(d)) n++; });
    if (n) { render(); toast(`✓ Đã nạp ${n} đơn demo`); }
    else toast('Không tạo được đơn demo (hết nguyên liệu?).');
  }

  function init() {
    if (typeof Auth === 'undefined' || !Auth.requireStaff()) return;
    if (typeof renderStaffNav === 'function') renderStaffNav('order-board');
    const qz = $('quickZone');
    if (qz) qz.value = API.quickZone.get();
    render();
    timer = setInterval(render, 2500);
    window.addEventListener('cappan:sync', render);
  }

  window.OrderBoard = { status, cancel, loadDemo, render, clean, setQuickZone };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
