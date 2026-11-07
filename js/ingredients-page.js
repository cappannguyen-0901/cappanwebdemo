/* ============================================================
   TRANG QUẢN LÝ NGUYÊN LIỆU — BOM / TỒN KHO
   Không tự ý sửa stock bằng tay: mọi thay đổi đi qua API.ingredients
   để có log và để menu tự cập nhật trạng thái.
============================================================ */
(function () {
  'use strict';

  let search = '';
  let modalMode = 'import';
  let modalId = '';
  let renderTimer = null;

  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  function toast(msg, color) {
    if (typeof showToast === 'function') return showToast(msg, color);
    console.log(msg);
  }

  function round(n) {
    const x = Math.round(Number(n) * 100) / 100;
    return Number.isInteger(x) ? String(x) : x.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  }

  function fmtQty(n, unit) {
    const x = Number(n) || 0;
    if (unit === 'ml' && Math.abs(x) >= 1000) return round(x / 1000) + ' L';
    if (unit === 'g' && Math.abs(x) >= 1000) return round(x / 1000) + ' kg';
    return round(x) + ' ' + (unit || '');
  }

  function fmtMoney(n) {
    const x = Number(n) || 0;
    try {
      if (typeof API !== 'undefined' && API.utils && API.utils.formatVND) return API.utils.formatVND(Math.round(x));
    } catch (e) {}
    return Math.round(x).toLocaleString('vi-VN') + 'đ';
  }

  function fmtUnitCost(n) {
    const x = Number(n) || 0;
    if (x > 0 && x < 0.01) return x.toFixed(3).replace('.', ',') + 'đ';
    if (x > 0 && x < 1) return x.toFixed(2).replace('.', ',') + 'đ';
    return fmtMoney(x);
  }

  function stockState(ing) {
    const stock = Number(ing.stock) || 0;
    const min = Number(ing.minStock) || 0;
    if (stock <= 0) return { cls: 'out', label: 'Hết' };
    if (stock <= min) return { cls: 'low', label: 'Sắp hết' };
    return { cls: 'ok', label: 'Đủ' };
  }

  function statusBadge(ing) {
    const st = stockState(ing);
    const demo = ing.id === 'I_MATCHA' ? ' <span class="ing-badge demo">DEMO</span>' : '';
    return `<span class="ing-badge ${st.cls}">${st.label}</span>${demo}`;
  }

  function renderKpis() {
    const list = API.ingredients.getAll();
    const low = API.ingredients.getLowStock();
    const out = API.ingredients.getOutOfStock();
    const value = API.ingredients.getValue();
    const box = $('ingKpis');
    if (!box) return;
    box.innerHTML = `
      <div class="ing-kpi">
        <div class="label">Nguyên liệu</div>
        <div class="value">${list.length}</div>
        <div class="hint">đang được quản lý</div>
      </div>
      <div class="ing-kpi ${low.length ? 'warn' : ''}">
        <div class="label">Sắp hết</div>
        <div class="value">${low.length}</div>
        <div class="hint">dưới hoặc bằng ngưỡng</div>
      </div>
      <div class="ing-kpi ${out.length ? 'danger' : ''}">
        <div class="label">Hết hàng</div>
        <div class="value">${out.length}</div>
        <div class="hint">tồn kho bằng 0</div>
      </div>
      <div class="ing-kpi">
        <div class="label">Giá trị tồn</div>
        <div class="value" style="font-size:23px">${fmtMoney(value)}</div>
        <div class="hint">theo giá vốn hiện tại</div>
      </div>`;
  }

  function renderTable() {
    const body = $('ingTableBody');
    if (!body) return;
    const q = search.toLowerCase().trim();
    const list = API.ingredients.getAll()
      .filter(x => !q || (x.name + ' ' + x.id + ' ' + (x.supplier || '')).toLowerCase().includes(q));
    if (!list.length) {
      body.innerHTML = `<tr><td colspan="6"><div class="ing-empty">Không có nguyên liệu khớp “${esc(search)}”.</div></td></tr>`;
      return;
    }
    body.innerHTML = list.map(ing => {
      const demo = ing.id === 'I_MATCHA';
      const st = stockState(ing);
      return `<tr class="${demo ? 'demo-row' : ''}">
        <td>
          <span class="ing-name">${esc(ing.name)}</span>
          <span class="ing-sub">${esc(ing.id)} · ${esc(ing.supplier || '—')}${demo ? ' · mẻ demo 1 ly' : ''}</span>
        </td>
        <td class="num"><strong>${fmtQty(ing.stock, ing.unit)}</strong></td>
        <td class="num">${fmtQty(ing.minStock, ing.unit)}</td>
        <td class="num">${fmtUnitCost(ing.unitCost)}<span class="ing-sub">/${esc(ing.unit)}</span></td>
        <td>${statusBadge(ing)}</td>
        <td>
          <div class="ing-actions">
            <button type="button" class="primary" onclick="openIngredientModal('import','${esc(ing.id)}')">+ Nhập</button>
            <button type="button" onclick="openIngredientModal('adjust','${esc(ing.id)}')">Điều chỉnh</button>
          </div>
        </td>
      </tr>`;
    }).join('');
  }

  function renderBom() {
    const box = $('bomList');
    if (!box) return;
    const items = API.menu.getAll().filter(m => m.inventoryManaged);
    if (!items.length) {
      box.innerHTML = '<div class="ing-empty">Chưa có món nào được gắn BOM.</div>';
      return;
    }
    // Đưa món demo lên đầu để dễ thuyết trình
    items.sort((a, b) => (b.id === 'M102') - (a.id === 'M102'));
    box.innerHTML = items.map(m => {
      const bom = API.ingredients.getBom(m.id);
      const lines = bom ? bom.lines.map(l => {
        const ing = API.ingredients.getById(l.ingredientId);
        return `${ing ? ing.name : l.ingredientId} ${round(l.qty)}${ing ? ing.unit : ''}`;
      }).join(' · ') : '';
      const max = m.maxServings == null ? '—' : m.maxServings;
      const status = m.ingredientAvailable
        ? `<span class="ing-badge ${max <= 2 ? 'low' : 'ok'}">${max <= 2 ? 'Sắp hết' : 'Còn bán'}</span>`
        : '<span class="ing-badge out">Hết nguyên liệu</span>';
      return `<div class="bom-row ${m.id === 'M102' ? 'demo' : ''}">
        <div>
          <div class="bom-title">${esc(m.name)} <span class="ing-sub" style="display:inline">${esc(m.id)}</span></div>
          <div class="bom-lines">${esc(lines)}</div>
        </div>
        <div class="bom-max">${max}<small>ly còn bán được</small></div>
        <div>${status}</div>
      </div>`;
    }).join('');
  }

  function renderLogs() {
    const box = $('inventoryLog');
    if (!box) return;
    const logs = API.ingredients.getLogs(12);
    if (!logs.length) {
      box.innerHTML = '<div class="ing-empty">Chưa có giao dịch kho.</div>';
      return;
    }
    const typeLabel = { sale: 'Bán', import: 'Nhập', adjust: 'Đ.chỉnh', refund: 'Hoàn' };
    box.innerHTML = logs.map(l => {
      const time = l.at ? new Date(l.at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—';
      const q = Number(l.qty) || 0;
      const sign = q > 0 ? '+' : '';
      const order = l.orderId ? ` · ${esc(l.orderId)}` : '';
      return `<div class="log-row">
        <span class="log-type ${esc(l.type)}">${typeLabel[l.type] || esc(l.type)}</span>
        <span class="log-main">${time} · ${esc(l.name || l.ingredientId)}${order}${l.note ? ' · ' + esc(l.note) : ''}</span>
        <span class="log-qty">${sign}${fmtQty(q, l.unit)}</span>
      </div>`;
    }).join('');
  }

  function renderAll() {
    try {
      renderKpis();
      renderTable();
      renderBom();
      renderLogs();
    } catch (e) {
      console.error('[ingredients] render error:', e);
    }
  }

  function scheduleRender() {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(renderAll, 80);
  }

  window.openIngredientModal = function (mode, id) {
    const ing = API.ingredients.getById(id);
    if (!ing) return;
    modalMode = mode === 'adjust' ? 'adjust' : 'import';
    modalId = id;
    $('ingModalMode').value = modalMode;
    $('ingModalId').value = id;
    $('ingModalTitle').textContent = modalMode === 'import' ? 'Nhập kho nguyên liệu' : 'Điều chỉnh tồn kho';
    $('ingModalSub').textContent = modalMode === 'import'
      ? `Cộng thêm vào tồn kho hiện tại của ${ing.name}.`
      : `Đặt lại tồn kho thực tế của ${ing.name}.`;
    $('ingModalUnit').textContent = '(' + (ing.unit || '') + ')';
    $('ingModalQty').value = modalMode === 'import'
      ? (ing.id === 'I_MATCHA' ? 3 : (ing.unit === 'ml' ? 1000 : ing.unit === 'g' ? 100 : 10))
      : ing.stock;
    $('ingModalNote').value = '';
    $('ingModal').classList.add('open');
    setTimeout(() => $('ingModalQty').focus(), 50);
  };

  window.closeIngredientModal = function () {
    $('ingModal').classList.remove('open');
  };

  window.saveIngredientModal = function () {
    const id = $('ingModalId').value;
    const qty = Number($('ingModalQty').value);
    const note = $('ingModalNote').value.trim();
    if (!Number.isFinite(qty) || qty < 0 || (modalMode === 'import' && qty <= 0)) {
      toast('Số lượng không hợp lệ', '#c62828');
      return;
    }
    const res = modalMode === 'import'
      ? API.ingredients.importStock(id, qty, note)
      : API.ingredients.adjustStock(id, qty, note);
    if (!res || !res.ok) {
      toast((res && res.error) || 'Không lưu được tồn kho', '#c62828');
      return;
    }
    closeIngredientModal();
    renderAll();
    toast(modalMode === 'import' ? '✓ Đã nhập kho' : '✓ Đã điều chỉnh tồn kho');
  };

  window.resetInventoryDemo = function () {
    if (!confirm('Reset toàn bộ nguyên liệu, BOM và lịch sử kho về dữ liệu demo ban đầu?')) return;
    API.ingredients.resetDemo();
    renderAll();
    toast('✓ Đã reset kho demo — Matcha còn đúng 1 ly');
  };

  function init() {
    if (typeof Auth === 'undefined' || !Auth.requireStaff()) return;
    if (typeof renderStaffNav === 'function') renderStaffNav('ingredients');

    const searchEl = $('ingSearch');
    if (searchEl) searchEl.addEventListener('input', () => {
      search = searchEl.value;
      renderTable();
    });

    $('ingModal')?.addEventListener('click', e => {
      if (e.target === $('ingModal')) closeIngredientModal();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeIngredientModal();
    });

    renderAll();
    window.addEventListener('cappan:sync', scheduleRender);
    window.addEventListener('cappan:automation', scheduleRender);
    window.addEventListener('storage', scheduleRender);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
