/* ============================================================
   OWNER COCKPIT — Alert / Insight / Recommendation (rule-based)
   Không phải ML: mọi kết luận lấy từ dữ liệu thật trong API.
   AI chat ở đây là lớp giải thích + gợi ý, không chạm DB.
============================================================ */
(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
  const money = n => (API.utils ? API.utils.formatVND(Number(n) || 0) : (Number(n) || 0).toLocaleString('vi-VN') + 'đ');
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
  const ACT_KEY = 'cappan_owner_actions_v1';

  function toast(msg) {
    if (typeof showToast === 'function') return showToast(msg);
    console.log(msg);
  }

  function getActions() {
    try { return JSON.parse(localStorage.getItem(ACT_KEY) || '[]'); } catch (e) { return []; }
  }
  function saveAction(a) {
    const list = getActions();
    list.unshift({ at: new Date().toISOString(), ...a });
    try { localStorage.setItem(ACT_KEY, JSON.stringify(list.slice(0, 50))); } catch (e) {}
  }

  function snapshot() {
    const today = API.stats.today();
    const orders = API.orders.getAll();
    const activeTables = API.tableSessions.getAll().filter(s => s.status === 'active');
    const held = API.bookings.getAll().filter(b => b.status === 'held');
    const low = API.ingredients.getLowStock();
    const out = API.ingredients.getOutOfStock();
    const kds = API.orders.getKdsQueue();
    const cleaning = API.seats.getAll().filter(s => s.status === 'cleaning');
    const quickZone = API.quickZone ? API.quickZone.get() : 'many';
    let top = null;
    try { top = API.stats.topItems(1)[0] || null; } catch (e) {}
    return { today, orders, activeTables, held, low, out, kds, top, cleaning, quickZone };
  }

  function kpis() {
    const s = snapshot();
    const el = $('ownerKpis');
    if (!el) return;
    el.innerHTML = `
      <div class="own-kpi"><div class="label">Doanh thu hôm nay</div><div class="value">${money(s.today.total)}</div><div class="hint">${s.today.completedCount} đơn hoàn tất / ${s.today.count} đơn</div></div>
      <div class="own-kpi"><div class="label">Bàn đang mở</div><div class="value">${s.activeTables.length}</div><div class="hint">phiên TableSession active</div></div>
      <div class="own-kpi"><div class="label">Đơn trong bếp</div><div class="value">${s.kds.length}</div><div class="hint">chờ / đang pha / sẵn sàng</div></div>
      <div class="own-kpi"><div class="label">Nguyên liệu cần chú ý</div><div class="value">${s.low.length + s.out.length}</div><div class="hint">${s.low.length} sắp hết · ${s.out.length} hết</div></div>`;
  }

  function alerts() {
    const s = snapshot();
    const el = $('ownerAlerts');
    if (!el) return;
    const rows = [];
    s.out.forEach(ing => rows.push({
      level: 'red', title: 'Hết nguyên liệu: ' + ing.name,
      body: `${ing.name} đã về 0. Các món dùng nguyên liệu này đã bị chặn trên menu.`,
      action: 'stock'
    }));
    s.low.slice(0, 3).forEach(ing => rows.push({
      level: 'yellow', title: 'Sắp cạn: ' + ing.name,
      body: `Còn ${ing.stock}${ing.unit} (ngưỡng ${ing.minStock}${ing.unit}). Nên nhập trước giờ cao điểm.`,
      action: 'stock'
    }));
    s.held.slice(0, 2).forEach(b => rows.push({
      level: 'red', title: `Bàn ${b.seatId} đang giữ`,
      body: `${b.customerName || 'Khách'} · ${b.time || ''} · chưa check-in. Automation sẽ nhả nếu quá hạn.`,
      action: 'ack'
    }));
    const old = s.kds.filter(o => (o.ageMinutes || 0) >= 15).slice(0, 2);
    old.forEach(o => rows.push({
      level: 'yellow', title: `Đơn ${o.kitchenCode || o.id} chờ lâu`,
      body: `${o.ageMinutes} phút · ${(o.items || []).map(i => i.name).join(', ')}. Kiểm tra Order Board.`,
      action: 'ack'
    }));
    if (s.quickZone === 'full') rows.push({
      level: 'yellow', title: 'Khu Counter Pickup đã hết chỗ',
      body: 'Khách mua nước tại quầy có thể phải chờ hoặc mang đi. Cân nhắc mở thêm khu tự do.',
      action: 'ack'
    });
    s.cleaning.slice(0, 2).forEach(seat => rows.push({
      level: 'yellow', title: `Bàn ${seat.id} đang dọn`,
      body: 'Bàn chưa sẵn sàng cho khách mới. Nhân viên bấm “Đã dọn” trên Order Board.',
      action: 'ack'
    }));
    if (!rows.length) rows.push({ level: 'green', title: 'Không có bất thường', body: 'Doanh thu, bàn, bếp và kho đang trong ngưỡng.', action: 'ack' });
    el.innerHTML = rows.slice(0, 6).map(r => `
      <div class="own-alert">
        <span class="own-dot ${r.level}"></span>
        <div><b>${esc(r.title)}</b><p>${esc(r.body)}</p></div>
        <button type="button" onclick="OwnerCopilot.resolve('${esc(r.action)}')">${r.action === 'stock' ? 'Xử lý' : 'Đã xem'}</button>
      </div>`).join('');
  }

  function insightText() {
    const s = snapshot();
    const parts = [];
    parts.push(`Hôm nay quán ghi nhận ${money(s.today.total)} từ ${s.today.completedCount} đơn hoàn tất.`);
    if (s.top) parts.push(`Món bán chạy nhất: ${s.top.name} (${s.top.qty} ly).`);
    if (s.low.length || s.out.length) {
      parts.push(`${s.low.length} nguyên liệu sắp cạn, ${s.out.length} đã hết — đây là rủi ro vận hành trước giờ cao điểm.`);
    } else {
      parts.push('Kho nguyên liệu đang trong ngưỡng an toàn.');
    }
    parts.push('Đây là quan sát từ dữ liệu hôm nay, không phải kết luận nhân quả.');
    return parts.join(' ');
  }

  function recommendations() {
    const s = snapshot();
    const list = [];
    if (s.low.length || s.out.length) {
      const ing = (s.out[0] || s.low[0]);
      list.push({
        id: 'REC_STOCK',
        title: 'Nhập thêm ' + ing.name,
        body: `${ing.name} còn ${ing.stock}${ing.unit}. Đề xuất tạo phiếu nhập nháp để không gián đoạn bán.`,
        action: 'Tạo phiếu nhập nháp'
      });
    } else if (s.top) {
      list.push({
        id: 'REC_TOP',
        title: 'Chuẩn bị cho món bán chạy',
        body: `${s.top.name} đang dẫn đầu. Kiểm tra BOM và tồn nguyên liệu trước ca tối.`,
        action: 'Đã kiểm tra'
      });
    } else {
      list.push({
        id: 'REC_DATA',
        title: 'Chưa đủ dữ liệu để gợi ý',
        body: 'Hãy bán ít nhất vài đơn để Owner Copilot có dữ liệu. Đây là demo, không tự bịa số.',
        action: 'Đã hiểu'
      });
    }
    return list;
  }

  function renderRec() {
    const el = $('ownerRec');
    if (!el) return;
    const list = recommendations();
    const actions = getActions();
    el.innerHTML = list.map(r => {
      const done = actions.some(a => a.id === r.id);
      return `<div class="own-rec">
        <h4>${esc(r.title)}</h4>
        <p>${esc(r.body)}</p>
        <div class="btns">
          <button class="yes" type="button" ${done ? 'disabled' : ''} onclick="OwnerCopilot.approve('${esc(r.id)}')">${done ? '✓ Đã duyệt' : 'Đồng ý · ' + esc(r.action)}</button>
          <button class="no" type="button" onclick="OwnerCopilot.reject('${esc(r.id)}')">Từ chối</button>
        </div>
      </div>`;
    }).join('');
  }

  function renderChatLog() {
    const el = $('ownerChatLog');
    if (!el) return;
    if (!el.dataset.ready) {
      el.innerHTML = '<div class="a">Chào anh/chị. Em có thể trả lời: hôm nay thế nào, vì sao, gợi ý, tồn kho, đơn trong bếp.</div>';
      el.dataset.ready = '1';
    }
  }

  function render() {
    kpis();
    alerts();
    renderRec();
    renderChatLog();
    const el = $('ownerInsight');
    if (el) el.innerHTML = `<div class="own-insight"><div class="k">INSIGHT · HÔM NAY</div>${esc(insightText())}</div>`;
  }

  function resolve(action) {
    if (action === 'stock') {
      toast('Đang mở trang Nguyên liệu để nhập kho…');
      setTimeout(() => { location.href = 'staff-ingredients.html'; }, 450);
      return;
    }
    toast('Đã đánh dấu đã xem.');
  }

  function approve(id) {
    const r = recommendations().find(x => x.id === id);
    if (!r) return;
    saveAction({ id, title: r.title, status: 'approved' });
    try { API.audit.log({ action: 'owner.recommendation.approve', targetId: id, ok: true, code: 'demo' }); } catch (e) {}
    toast('✓ Đã duyệt: ' + r.title + ' (demo)');
    renderRec();
  }

  function reject(id) {
    saveAction({ id, status: 'rejected' });
    toast('Đã từ chối gợi ý.');
    renderRec();
  }

  function answer(q) {
    const t = norm(q);
    const s = snapshot();
    if (!t) return 'Anh/chị muốn hỏi gì ạ?';
    if (/(chao|hello|hi)\b/.test(t)) return 'Chào anh/chị. Quán hôm nay có ' + s.today.count + ' đơn, doanh thu ' + money(s.today.total) + '.';
    if (/(doanh thu|hom nay|bao nhieu tien|revenue)/.test(t)) {
      return `Hôm nay: ${money(s.today.total)} từ ${s.today.completedCount} đơn hoàn tất. Đơn trong bếp: ${s.kds.length}. Bàn đang mở: ${s.activeTables.length}.`;
    }
    if (/(vi sao|tai sao|insight|phan tich)/.test(t)) return insightText();
    if (/(goi y|de xuat|recommend|nen lam gi)/.test(t)) {
      const r = recommendations()[0];
      return `${r.title}. ${r.body}`;
    }
    if (/(ton kho|nguyen lieu|sap het|het hang)/.test(t)) {
      const low = s.low.map(x => `${x.name} còn ${x.stock}${x.unit}`).join(', ');
      const out = s.out.map(x => x.name).join(', ');
      return [out ? 'Đã hết: ' + out : '', low ? 'Sắp cạn: ' + low : '', !out && !low ? 'Kho đang ổn.' : ''].filter(Boolean).join(' ');
    }
    if (/(don|kds|bep|hang doi)/.test(t)) {
      if (!s.kds.length) return 'Bếp đang trống, không có đơn chờ.';
      const o = s.kds[0];
      return `Có ${s.kds.length} đơn trong bếp. Ưu tiên ${o.kitchenCode || o.id}: ${(o.items || []).map(i => i.name).join(', ')} (${o.ageMinutes} phút).`;
    }
    if (/(ban|table|check-in|booking)/.test(t)) {
      return `Có ${s.activeTables.length} bàn đang mở và ${s.held.length} booking đang giữ.`;
    }
    return 'Em đang ở chế độ demo. Anh/chị hỏi: “hôm nay thế nào?”, “vì sao?”, “gợi ý”, “tồn kho”, “đơn trong bếp”.';
  }

  function ask(e) {
    if (e) e.preventDefault();
    const input = $('ownerChatInput');
    const log = $('ownerChatLog');
    if (!input || !log) return;
    const q = input.value.trim();
    if (!q) return;
    const a = answer(q);
    const qd = document.createElement('div');
    qd.className = 'q'; qd.textContent = 'Bạn: ' + q;
    const ad = document.createElement('div');
    ad.className = 'a'; ad.textContent = 'Copilot: ' + a;
    log.appendChild(qd); log.appendChild(ad);
    log.scrollTop = log.scrollHeight;
    input.value = '';
  }

  function emailReport() {
    const s = snapshot();
    const lines = [];
    lines.push('CAPPAN — BÁO CÁO CUỐI NGÀY');
    lines.push('Ngày: ' + new Date().toLocaleDateString('vi-VN'));
    lines.push('');
    lines.push('DOANH THU');
    lines.push('- Doanh thu: ' + money(s.today.total));
    lines.push('- Đơn hoàn tất: ' + s.today.completedCount + '/' + s.today.count);
    lines.push('');
    lines.push('VẬN HÀNH');
    lines.push('- Bàn đang mở: ' + s.activeTables.length);
    lines.push('- Đơn trong Order Board: ' + s.kds.length);
    lines.push('- Bàn đang dọn: ' + s.cleaning.length);
    lines.push('- Khu tự do: ' + (API.quickZone ? API.quickZone.label(s.quickZone) : '—'));
    lines.push('');
    lines.push('CẢNH BÁO KHO');
    lines.push('- Sắp cạn: ' + (s.low.length ? s.low.map(x => x.name).join(', ') : 'Không'));
    lines.push('- Đã hết: ' + (s.out.length ? s.out.map(x => x.name).join(', ') : 'Không'));
    lines.push('');
    lines.push('3 VIỆC CẦN QUYẾT');
    lines.push('1. ' + (s.out[0] || s.low[0] ? 'Nhập thêm ' + (s.out[0] || s.low[0]).name : 'Không có cảnh báo kho'));
    lines.push('2. ' + (s.cleaning.length ? 'Dọn bàn ' + s.cleaning.map(x => x.id).join(', ') : 'Không có bàn đang dọn'));
    lines.push('3. ' + (s.kds.length ? 'Kiểm tra ' + s.kds.length + ' đơn trên Order Board' : 'Order Board trống'));
    const body = lines.join('\n');
    const subject = 'CAPPAN — Báo cáo cuối ngày ' + new Date().toLocaleDateString('vi-VN');
    const url = 'mailto:owner@cappan.vn?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    try {
      window.location.href = url;
      toast('📧 Đã mở báo cáo email (demo)');
    } catch (e) {
      toast('Không mở được email — nội dung đã sẵn sàng.');
    }
    return body;
  }

  function init() {
    if (typeof Auth === 'undefined' || !Auth.requireStaff()) return;
    if (typeof renderStaffNav === 'function') renderStaffNav('owner');
    render();
    window.addEventListener('cappan:sync', render);
    window.addEventListener('cappan:automation', render);
    window.addEventListener('storage', render);
    setInterval(render, 5000);
  }

  window.OwnerCopilot = { ask, approve, reject, resolve, render, emailReport };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
