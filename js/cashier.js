/* ============================================================
   THU NGÂN TẠI QUẦY (POS)
   - Giá luôn tính lại từ thực đơn qua API.pos.quote → Pricing
   - Không có phí giao hàng
   - Tiền mặt: kiểm đủ + tính tiền thối
   - Hoá đơn vào doanh thu (channel = 'pos')
============================================================ */
(function () {
  'use strict';

  let posCat = 'all';
  let posBill = [];
  let posPromo = '';

  const $ = id => document.getElementById(id);
  const money = n => API.utils.formatVND(Number(n) || 0);

  function priceOf(item, size) {
    if (!item) return 0;
    const base = Number(item.price) || 0;
    const sz = (item.sizes || []).find(s => s.name === size);
    const extra = sz ? Number(sz.extraPrice) || 0 : 0;
    return base + extra;
  }

  function renderCats() {
    const el = $('posCats');
    if (!el) return;
    const cats = [{ id: 'all', name: 'Tất cả' }].concat(API.categories.getAll());
    el.innerHTML = cats.map(c => `
      <button type="button" class="staff-tab ${c.id === posCat ? 'active' : ''}"
              onclick="setPosCat('${esc(c.id)}')">${esc(c.name)}</button>
    `).join('');
  }

  function renderMenu() {
    const el = $('posMenu');
    if (!el) return;
    const kw = String(($('posSearch') || {}).value || '').toLowerCase().trim();
    let items = API.menu.getAll().filter(m => m.inStock);
    if (posCat !== 'all') items = items.filter(m => m.categoryId === posCat);
    if (kw) items = items.filter(m => (m.name || '').toLowerCase().includes(kw));

    const countEl = $('posCount');
    if (countEl) countEl.textContent = items.length + ' món';
    if (!items.length) { el.innerHTML = '<p class="empty-note">Không có món phù hợp.</p>'; return; }

    el.innerHTML = items.map(m => `
      <button type="button" class="pos-item" onclick="addPosItem('${esc(m.id)}')">
        <img src="${esc(m.img)}" alt="${esc(m.name)}" loading="lazy">
        <span class="pos-item-name">${esc(m.name)}</span>
        <span class="pos-item-price">${money(m.price)}</span>
      </button>
    `).join('');
  }

  function quote() {
    return API.pos.quote({ items: posBill, promoCode: posPromo });
  }

  function renderBill() {
    const linesEl = $('posLines');
    const sumEl = $('posSummary');
    if (!linesEl || !sumEl) return;

    if (!posBill.length) {
      linesEl.innerHTML = '<p class="empty-note">Chưa chọn món nào.</p>';
    } else {
      linesEl.innerHTML = posBill.map((l, i) => {
        const m = API.menu.getById(l.itemId);
        const price = priceOf(m, l.size);
        return `
          <div class="pos-line">
            <div class="pos-line-name">
              <strong>${esc(m ? m.name : l.itemId)}</strong>
              <small>Size ${esc(l.size)} · ${money(price)}</small>
            </div>
            <div class="pos-qty">
              <button type="button" onclick="changePosQty(${i}, -1)" aria-label="Bớt">−</button>
              <span>${l.qty}</span>
              <button type="button" onclick="changePosQty(${i}, 1)" aria-label="Thêm">+</button>
            </div>
            <div class="pos-line-total">${money(price * l.qty)}</div>
            <button type="button" class="pos-remove" onclick="removePosLine(${i})" aria-label="Xoá dòng">✕</button>
          </div>
        `;
      }).join('');
    }

    if (!posBill.length) {
      sumEl.innerHTML = '<div class="pos-summary-row total"><span>Tổng cộng</span><span>0đ</span></div>';
      renderChange({ ok: true, total: 0 });
      return;
    }

    const q = quote();
    if (!q.ok) {
      sumEl.innerHTML = `<p class="empty-note" style="color:var(--red);">${esc(q.error || 'Không tính được hoá đơn')}</p>`;
      return;
    }
    sumEl.innerHTML = `
      <div class="pos-summary-row"><span>Tạm tính</span><span>${money(q.subtotal)}</span></div>
      ${q.discount ? `<div class="pos-summary-row"><span>Giảm giá ${esc(q.promoCode || '')}</span><span>−${money(q.discount)}</span></div>` : ''}
      <div class="pos-summary-row total"><span>Tổng cộng</span><span>${money(q.total)}</span></div>
    `;
    renderChange(q);
  }

  function renderChange(q) {
    const method = ($('posMethod') || {}).value || 'cash';
    const cashRow = $('posCashRow');
    if (cashRow) cashRow.style.display = method === 'cash' ? '' : 'none';
    const qq = q || quote();
    const el = $('posChange');
    if (!el) return;
    if (!qq.ok) { el.textContent = ''; return; }
    if (method !== 'cash') { el.textContent = 'Khách trả đủ bằng chuyển khoản/thẻ.'; return; }
    const cash = Number(($('posCash') || {}).value) || 0;
    if (!cash) { el.textContent = 'Nhập tiền khách đưa để tính tiền thối.'; return; }
    el.textContent = cash >= qq.total
      ? `Tiền thối: ${money(cash - qq.total)}`
      : `Còn thiếu: ${money(qq.total - cash)}`;
  }

  function renderRecent() {
    const el = $('posRecent');
    if (!el) return;
    const rows = API.orders.getAll().filter(o => o.channel === 'pos').slice(-6).reverse();
    const today = API.pos.summary();
    const todayEl = $('posToday');
    if (todayEl) todayEl.textContent = `Hôm nay: ${today.count} hoá đơn · ${money(today.revenue)}`;

    if (!rows.length) { el.innerHTML = '<p class="empty-note">Chưa có hoá đơn nào.</p>'; return; }
    const methodName = { cash: 'Tiền mặt', transfer: 'Chuyển khoản', card: 'Thẻ' };
    el.innerHTML = `
      <table class="staff-table">
        <thead><tr><th>Mã</th><th>Thời gian</th><th>Hình thức</th><th>Tổng</th></tr></thead>
        <tbody>
          ${rows.map(o => `
            <tr>
              <td><strong>${esc(o.id)}</strong></td>
              <td>${new Date(o.createdAt).toLocaleString('vi-VN')}</td>
              <td>${esc(methodName[o.paymentMethod] || '—')}</td>
              <td>${money(o.total)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  function clearBill() {
    posBill = [];
    posPromo = '';
    const p = $('posPromo');
    if (p) p.value = '';
    const msg = $('posMsg');
    if (msg) { msg.textContent = ''; msg.className = 'pos-msg'; }
    const cash = $('posCash');
    if (cash) cash.value = '';
    renderBill();
  }

  /* ---------- API cho HTML (inline handler) ---------- */
  window.setPosCat = function (id) {
    posCat = id;
    renderCats();
    renderMenu();
  };

  window.addPosItem = function (itemId) {
    const m = API.menu.getById(itemId);
    if (!m || !m.inStock) { showToast('⚠ Món đã hết hàng', '#c62828'); return; }
    const size = (m.sizes && m.sizes[0] && m.sizes[0].name) || 'M';
    const ex = posBill.find(l => l.itemId === m.id && l.size === size);
    if (ex) ex.qty = Math.min(99, ex.qty + 1);
    else posBill.push({ itemId: m.id, size, qty: 1 });
    renderBill();
  };

  window.changePosQty = function (idx, delta) {
    const line = posBill[idx];
    if (!line) return;
    line.qty += delta;
    if (line.qty <= 0) posBill.splice(idx, 1);
    renderBill();
  };

  window.removePosLine = function (idx) {
    posBill.splice(idx, 1);
    renderBill();
  };

  window.clearBill = clearBill;

  window.applyPosPromo = function () {
    const input = $('posPromo');
    posPromo = String((input && input.value) || '').trim().toUpperCase();
    const msg = $('posMsg');
    const q = quote();
    if (posPromo && !q.ok) {
      posPromo = '';
      if (msg) { msg.textContent = '⚠ ' + q.error; msg.className = 'pos-msg err'; }
    } else if (msg) {
      msg.textContent = posPromo ? '✓ Đã áp dụng ' + posPromo : '';
      msg.className = 'pos-msg ok';
    }
    renderBill();
  };

  window.renderPosMenu = renderMenu;
  window.renderBill = renderBill;
  window.renderChange = renderChange;

  window.checkoutPos = function () {
    const q = quote();
    if (!q.ok) { showToast('⚠ ' + q.error, '#c62828'); return; }
    const method = ($('posMethod') || {}).value || 'cash';
    const cash = Number(($('posCash') || {}).value) || 0;
    if (method === 'cash' && cash < q.total) {
      showToast('⚠ Tiền khách đưa chưa đủ ' + money(q.total), '#c62828');
      return;
    }
    const methodLabel = method === 'cash' ? 'tiền mặt' : method === 'transfer' ? 'chuyển khoản' : 'thẻ';
    if (!confirm(`Thu ${money(q.total)} (${methodLabel})?`)) return;

    let sale;
    try {
      sale = API.pos.createSale({
        items: posBill, promoCode: posPromo, paymentMethod: method, cashReceived: cash
      });
    } catch (err) {
      showToast('⚠ ' + (err && err.message ? err.message : 'Không thu được tiền'), '#c62828');
      return;
    }

    const change = Number(sale.change) || 0;
    showToast(change > 0
      ? `✓ Đã thu ${money(sale.total)} · thối ${money(change)} · ${sale.id}`
      : `✓ Đã thu ${money(sale.total)} · ${sale.id}`);
    clearBill();
    renderRecent();
    if (typeof renderMenu === 'function') renderMenu();
  };

  /* ---------- KHỞI ĐỘNG ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    if (typeof Auth === 'undefined' || !Auth.requireStaff()) return;
    if (typeof renderStaffNav === 'function') renderStaffNav('cashier');
    renderCats();
    renderMenu();
    renderBill();
    renderRecent();

    const method = $('posMethod');
    if (method) method.addEventListener('change', () => renderBill());
    document.addEventListener('cappan:sync', renderRecent);
  });
})();
