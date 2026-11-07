/* ============================================================
   QR TABLE ORDER — phiên bàn, gọi món, gọi thêm, bill chung
   Demo local-first: table_id + table_session_id lưu localStorage.
============================================================ */
(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
  const money = n => (typeof API !== 'undefined' && API.utils)
    ? API.utils.formatVND(Number(n) || 0)
    : (Number(n) || 0).toLocaleString('vi-VN') + 'đ';

  let tableId = '';
  let session = null;
  let cart = [];
  let category = 'all';
  let renderTimer = null;

  function toast(msg, color) {
    const el = $('tblToast');
    if (!el) return;
    el.textContent = msg;
    el.style.background = color || '#2a1a14';
    el.style.color = color ? '#fff' : '#f3dc82';
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 2600);
  }

  function renderCats() {
    const box = $('tblCats');
    if (!box) return;
    const cats = [{ id: 'all', name: 'Tất cả' }, ...API.categories.getAll()];
    box.innerHTML = cats.map(c =>
      `<button type="button" class="btn ${category === c.id ? '' : 'btn-outline'}"
        style="font-size:11px;padding:6px 10px" onclick="TableOrder.setCategory('${esc(c.id)}')">${esc(c.name)}</button>`
    ).join('');
  }

  function renderMenu() {
    const box = $('tblMenu');
    if (!box) return;
    const all = API.menu.getAll().filter(m => category === 'all' || m.categoryId === category);
    if (!all.length) {
      box.innerHTML = '<div class="tbl-empty">Không có món trong nhóm này.</div>';
      return;
    }
    box.innerHTML = all.map(m => {
      const out = !m.inStock;
      const low = m.inventoryManaged && m.maxServings != null && m.maxServings <= 2 && !out;
      return `<article class="tbl-card">
        <img src="${esc(m.img || 'assets/images/photo-1510707577719-ae7c14805e3a-w600.jpg')}" alt="${esc(m.name)}" loading="lazy">
        <div class="info">
          <h4>${esc(m.name)}</h4>
          <div class="price">${money(m.price)}</div>
          ${low ? `<span class="tag">Còn ${m.maxServings} ly</span>` : ''}
          ${out ? `<span class="tag" style="background:#f8dedb;color:#a5221a">Hết nguyên liệu</span>` : ''}
          <button type="button" class="${out ? '' : 'primary'}" ${out ? 'disabled' : ''}
            onclick="TableOrder.add('${esc(m.id)}')">${out ? 'Tạm hết' : '+ Thêm món'}</button>
        </div>
      </article>`;
    }).join('');
  }

  function renderCart() {
    const box = $('tblCart');
    const sub = $('tblCartSub');
    const total = cart.reduce((s, x) => s + x.price * x.qty, 0);
    if (sub) sub.textContent = cart.length ? `${cart.reduce((s, x) => s + x.qty, 0)} món` : 'Chưa có món nào.';
    if (box) {
      box.innerHTML = cart.length ? cart.map((x, i) => `
        <div class="tbl-line">
          <span>${esc(x.name)}</span>
          <span class="qty">
            <button type="button" onclick="TableOrder.qty(${i},-1)">−</button>
            <span>${x.qty}</span>
            <button type="button" onclick="TableOrder.qty(${i},1)">+</button>
          </span>
          <b>${money(x.price * x.qty)}</b>
        </div>`).join('') : '<div class="tbl-empty" style="padding:12px">Chọn món bên trái.</div>';
    }
    if ($('tblTotal')) $('tblTotal').textContent = money(total);
  }

  function renderBill() {
    const el = $('tblBill');
    if (!el || !session) return;
    const bill = API.tableSessions.getBill(session.id);
    const orders = bill.orders;
    if (!orders.length) {
      el.innerHTML = 'Chưa có bill. Order đầu tiên sẽ mở bill bàn.';
      return;
    }
    el.innerHTML = `<div><b>Bill bàn ${esc(session.tableId)}</b> · ${orders.length} order · ${money(bill.total)}</div>` +
      orders.slice(-5).map(o => {
        const code = o.kitchenCode || ('#' + String(o.id).slice(-4));
        return `<div style="margin-top:4px">${esc(code)} · ${esc(o.kitchenStatus || 'submitted')} · ${money(o.total)}</div>`;
      }).join('');
  }

  function render() {
    renderCats();
    renderMenu();
    renderCart();
    renderBill();
  }

  function scheduleRender() {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(render, 80);
  }

  function init() {
    const params = new URLSearchParams(location.search);
    tableId = String(params.get('table') || 'A1').toUpperCase();
    const seat = API.seats.getById(tableId);
    if (!seat) {
      $('tblTitle').textContent = 'Bàn không tồn tại';
      $('tblSub').textContent = `Không tìm thấy bàn ${tableId}. Hãy quét lại QR hoặc gọi nhân viên.`;
      return;
    }
    if (seat.status === 'cleaning') {
      $('tblTitle').textContent = 'Bàn đang dọn';
      $('tblSub').textContent = 'Bàn này vừa có khách rời. Vui lòng chọn bàn khác hoặc gọi nhân viên.';
      return;
    }
    const active = (API.tableSessions.getAll ? API.tableSessions.getAll() : [])
      .find(s => s.tableId === tableId && s.status === 'active');
    if (!active) {
      let code = params.get('code') || '';
      if (!code) {
        code = window.prompt(`Nhập mã 4 số trên bàn ${tableId}:`, '') || '';
      }
      if (!API.seats.verifyCode(tableId, code)) {
        $('tblTitle').textContent = 'Sai mã bàn';
        $('tblSub').textContent = 'Mã bàn không đúng. Quét lại QR trên bàn hoặc gọi nhân viên.';
        return;
      }
    }
    const joined = API.tableSessions.join(tableId);
    if (!joined || !joined.ok) {
      $('tblSub').textContent = joined && joined.error ? joined.error : 'Không mở được phiên bàn.';
      return;
    }
    session = joined.session;
    API.tableSessions.setCurrent(session);
    $('tblTitle').textContent = 'Bàn ' + tableId;
    $('tblSub').textContent = `Bạn đang ngồi tại bàn ${tableId}. Gọi món, gọi thêm — mỗi order thanh toán ngay, gắn cùng phiên bàn.`;
    $('tblSession').textContent = 'Phiên: ' + session.id + (joined.existing ? ' · đang mở' : ' · vừa mở');
    render();
    window.addEventListener('cappan:sync', scheduleRender);
    window.addEventListener('storage', scheduleRender);
    setInterval(renderBill, 3000);
  }

  function add(itemId) {
    const item = API.menu.getById(itemId);
    if (!item || !item.inStock) {
      toast('Món này đang tạm hết.', '#b3261e');
      return;
    }
    const found = cart.find(x => x.itemId === item.id);
    if (found) found.qty++;
    else cart.push({ itemId: item.id, name: item.name, price: Number(item.price) || 0, qty: 1, size: 'M' });
    renderCart();
    toast('✓ Đã thêm ' + item.name);
  }

  function qty(index, delta) {
    const line = cart[index];
    if (!line) return;
    line.qty += delta;
    if (line.qty <= 0) cart.splice(index, 1);
    renderCart();
  }

  function submit() {
    if (!session) {
      toast('Chưa có phiên bàn.', '#b3261e');
      return;
    }
    if (!cart.length) {
      toast('Chưa chọn món.', '#b3261e');
      return;
    }
    const order = API.orders.create({
      serviceType: 'table_service',
      source: 'qr_table',
      tableId,
      tableSessionId: session.id,
      paymentMethod: 'mock_qr',
      paymentStatus: 'paid',
      items: cart.map(x => ({ itemId: x.itemId, qty: x.qty, size: x.size || 'M' })),
      customerName: 'Khách bàn ' + tableId,
      note: 'Order tại bàn qua QR · thanh toán demo'
    });
    if (!order || !order.id) {
      toast('⚠ ' + (API._lastError || 'Không gửi được order.'), '#b3261e');
      return;
    }
    cart = [];
    render();
    toast(`✓ Đã gửi ${order.kitchenCode || order.id} xuống bếp`);
    renderBill();
  }

  window.TableOrder = {
    add, qty, submit,
    setCategory(cat) { category = cat; renderCats(); renderMenu(); }
  };

  document.addEventListener('DOMContentLoaded', init);
})();
