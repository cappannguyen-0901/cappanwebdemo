/* Runner View — chỉ Table Service đã sẵn sàng */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
  const money = n => API.utils ? API.utils.formatVND(Number(n) || 0) : (Number(n) || 0) + 'đ';

  function render() {
    let list = [];
    try {
      list = API.orders.getKdsQueue().filter(o =>
        o.serviceType === 'table_service' && o.kitchenStatus === 'ready' && o.tableId
      );
    } catch (e) {}
    const box = $('runnerList');
    if (!box) return;
    if (!list.length) {
      box.innerHTML = '<div class="rv-empty">Chưa có đơn Table Service nào sẵn sàng.</div>';
      return;
    }
    box.innerHTML = list.map(o => `<article class="rv-card">
      <div class="rv-code">${esc(o.kitchenCode || o.id)}</div>
      <div class="rv-table">Bàn ${esc(o.tableId)}</div>
      <ul class="rv-items">${(o.items || []).map(i => `<li>${esc(i.qty)} × ${esc(i.name)}</li>`).join('')}</ul>
      <button type="button" onclick="Runner.done('${esc(o.id)}')">Đã mang ra bàn</button>
    </article>`).join('');
  }

  function done(id) {
    const r = API.orders.updateKitchen(id, 'served');
    if (r) { render(); if (typeof showToast === 'function') showToast('✓ Đã mang ra bàn'); }
    else if (typeof showToast === 'function') showToast('Không cập nhật được đơn.', '#c62828');
  }

  function init() {
    if (typeof Auth === 'undefined' || !Auth.requireStaff()) return;
    if (typeof renderStaffNav === 'function') renderStaffNav('runner');
    render();
    setInterval(render, 2500);
    window.addEventListener('cappan:sync', render);
  }

  window.Runner = { done, render };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
