/* ============================================================
   AUTOMATION ENGINE — rule nội bộ, không cần backend
   Rule 1: nhả bàn held quá hạn (mặc định 15 phút, trừ booking đã cọc)
   Rule 2: làm mờ + chặn đặt món hết hàng (UI/API đã chặn; engine log + giám sát)
   Rule 3: BOM — tự đánh dấu món hết/sắp hết theo tồn kho nguyên liệu
   Có dry-run, undo, audit, realtime.
   ============================================================ */
(function () {
  const SET_KEY = 'cappan_automation_settings_v1';
  const LOG_KEY = 'cappan_automation_log_v1';
  const DEFAULTS = {
    enabled: true,
    heldEnabled: true,
    heldMinutes: 15,
    stockEnabled: true,
    ingredientEnabled: true
  };

  function read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; }
    catch (e) { return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }

  let settings = Object.assign({}, DEFAULTS, read(SET_KEY, {}));
  let logs = read(LOG_KEY, []);
  if (!Array.isArray(logs)) logs = [];
  let timer = null;
  let running = false;
  let syncTimer = null;
  let stockSeen = {};
  let ingredientSeen = {};

  function saveSettings() { write(SET_KEY, settings); }
  function saveLogs() { write(LOG_KEY, logs.slice(0, 80)); }

  function pushLog(entry) {
    const row = Object.assign({ at: new Date().toISOString() }, entry || {});
    logs.unshift(row);
    if (logs.length > 80) logs.length = 80;
    saveLogs();
    try {
      window.dispatchEvent(new CustomEvent('cappan:automation', { detail: row }));
    } catch (e) {}
  }

  function heldBookings() {
    try { return API.bookings.getAll().filter(b => b && b.status === 'held'); }
    catch (e) { return []; }
  }

  function bookingTime(bk) {
    try {
      if (!bk || !bk.date || !bk.time) return 0;
      const [y, m, d] = String(bk.date).split('-').map(Number);
      const [hh, mm] = String(bk.time).split(':').map(Number);
      if (!y || !m || !d || !Number.isFinite(hh) || !Number.isFinite(mm)) return 0;
      return new Date(y, m - 1, d, hh, mm, 0, 0).getTime();
    } catch (e) { return 0; }
  }

  /* Quá hạn = quá giờ đặt + số phút ân hạn. Nếu không có giờ đặt thì dùng heldAt. */
  function isExpired(bk, minutes) {
    if (!bk || bk.depositPaid) return false;
    /* Chờ chuyển khoản: giữ tạm tối đa số phút, không chờ tới giờ đặt. */
    if (bk.paymentPending) {
      const th = new Date(bk.heldAt || bk.createdAt || 0).getTime();
      return !!th && Date.now() - th >= minutes * 60 * 1000;
    }
    const scheduled = bookingTime(bk);
    if (scheduled) return Date.now() >= scheduled + minutes * 60 * 1000;
    const t = new Date(bk.heldAt || bk.createdAt || 0).getTime();
    return !!t && Date.now() - t >= minutes * 60 * 1000;
  }

  function releaseExpiredHeld() {
    if (!settings.enabled || !settings.heldEnabled) return 0;
    const minutes = Math.max(1, Number(settings.heldMinutes) || 15);
    let released = 0;
    heldBookings().forEach(bk => {
      /* Booking đã thu cọc: không tự hủy, để nhân viên xử lý. */
      if (bk.depositPaid || !isExpired(bk, minutes)) return;
      const snapshot = API.bookings.autoReleaseHeld(bk.id);
      if (snapshot) {
        released++;
        pushLog({
          action: 'held_release',
          title: 'Tự nhả bàn quá giờ đặt',
          message: `Bàn ${bk.seatId} · ${bk.customerName || 'Khách'} · quá ${minutes} phút`,
          undo: { type: 'held_restore', bookingId: bk.id }
        });
      }
    });
    return released;
  }

  function syncStockRule() {
    if (!settings.enabled || !settings.stockEnabled) return;
    let oos = [];
    try { oos = API.menu.getOutOfStock() || []; } catch (e) {}
    // Món do BOM hết nguyên liệu được log riêng ở syncIngredientRule().
    oos = oos.filter(m => !(m.inventoryManaged && !m.ingredientAvailable));
    const ids = new Set(oos.map(m => m.id));
    oos.forEach(m => {
      if (!stockSeen[m.id]) {
        stockSeen[m.id] = true;
        pushLog({
          action: 'stock_dim',
          title: 'Làm mờ món hết hàng',
          message: `${m.name} đã được làm mờ và chặn khách đặt hàng`,
          undo: null
        });
      }
    });
    Object.keys(stockSeen).forEach(id => {
      if (!ids.has(id)) {
        delete stockSeen[id];
        const m = API.menu.getById(id);
        if (m && m.inventoryManaged && !m.ingredientAvailable) return;
        pushLog({
          action: 'stock_restore',
          title: 'Mở lại món đã nhập hàng',
          message: `${m ? m.name : id} đã có hàng trở lại`,
          undo: null
        });
      }
    });
  }

  /* Rule 3: BOM — tự đánh dấu món hết/sắp hết theo tồn kho nguyên liệu.
     API.menu.getAll() đã trả cờ ingredientAvailable/maxServings; rule này
     chỉ quan sát, log và phát tín hiệu để UI cập nhật. */
  function syncIngredientRule() {
    if (!settings.enabled || !settings.ingredientEnabled) return;
    let items = [];
    try { items = API.menu.getAll().filter(m => m && m.inventoryManaged); } catch (e) { return; }
    const seenNow = {};
    for (const m of items) {
      const status = !m.ingredientAvailable ? 'out' : (Number(m.maxServings) <= 2 ? 'low' : 'ok');
      seenNow[m.id] = status;
      const prev = ingredientSeen[m.id];
      if (status === 'out' && prev !== 'out') {
        pushLog({
          action: 'ingredient_out',
          title: 'Hết nguyên liệu — tự đánh dấu món',
          message: `${m.name} còn 0 ly · thiếu ${m.limitingIngredient || 'nguyên liệu'} · đã chặn đặt`,
          undo: null
        });
      } else if (status === 'low' && prev !== 'low') {
        pushLog({
          action: 'ingredient_low',
          title: 'Sắp hết nguyên liệu',
          message: `${m.name} còn ${m.maxServings} ly · giới hạn bởi ${m.limitingIngredient || 'nguyên liệu'}`,
          undo: null
        });
      } else if (status === 'ok' && (prev === 'out' || prev === 'low')) {
        pushLog({
          action: 'ingredient_restore',
          title: 'Đã có nguyên liệu trở lại',
          message: `${m.name} đã mở bán · còn ${m.maxServings} ly`,
          undo: null
        });
      }
    }
    ingredientSeen = seenNow;
  }

  function run(force) {
    if (running) return;
    if (!settings.enabled && !force) return;
    running = true;
    try {
      if (typeof API === 'undefined' || !API.bookings) return;
      releaseExpiredHeld();
      syncStockRule();
      syncIngredientRule();
    } catch (e) {
      console.warn('[Automation] run:', e);
    } finally {
      running = false;
    }
  }

  function scheduleRun() {
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(() => run(false), 250);
  }

  const AutomationEngine = {
    DEFAULTS,
    get settings() { return Object.assign({}, settings); },
    get logs() { return logs.slice(); },

    start() {
      if (timer) return;
      run(false);
      timer = setInterval(() => run(false), 5000);
      window.addEventListener('cappan:sync', scheduleRun);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') run(false);
      });
    },
    stop() {
      if (timer) clearInterval(timer);
      timer = null;
    },
    run(force) { return run(force); },

    /* Xem trước, không ghi dữ liệu: dùng cho nút "Kiểm tra". */
    preview() {
      const minutes = Math.max(1, Number(settings.heldMinutes) || 15);
      const expired = heldBookings().filter(bk => isExpired(bk, minutes));
      let oos = [];
      let lowIngredients = [];
      try { oos = API.menu.getOutOfStock(); } catch (e) {}
      try {
        lowIngredients = API.menu.getAll()
          .filter(m => m && m.inventoryManaged && m.ingredientAvailable && Number(m.maxServings) <= 2)
          .map(m => ({ id: m.id, name: m.name, maxServings: m.maxServings, limiting: m.limitingIngredient }));
      } catch (e) {}
      return {
        expired: expired.map(bk => ({ id: bk.id, seatId: bk.seatId, customerName: bk.customerName })),
        outOfStock: oos.map(m => ({ id: m.id, name: m.name, limiting: m.limitingIngredient || null })),
        lowIngredients
      };
    },

    setSettings(patch) {
      settings = Object.assign({}, settings, patch || {});
      saveSettings();
      pushLog({ action: 'settings', title: 'Cập nhật tự động hóa', message: this.describe(), undo: null });
      run(false);
      return this.settings;
    },
    describe() {
      if (!settings.enabled) return 'Đang tắt';
      const parts = [];
      if (settings.heldEnabled) parts.push(`nhả bàn quá giờ ${settings.heldMinutes} phút`);
      if (settings.stockEnabled) parts.push('làm mờ món hết hàng');
      if (settings.ingredientEnabled) parts.push('kiểm tra BOM & tự chặn món hết nguyên liệu');
      return parts.length ? parts.join(' · ') : 'Không có rule nào bật';
    },
    undoLast() {
      const row = logs.find(x => x && x.undo);
      if (!row) return null;
      let result = null;
      try {
        if (row.undo.type === 'held_restore') {
          result = API.bookings.autoRestoreHeld(row.undo.bookingId);
        }
      } catch (e) {}
      if (result) {
        pushLog({ action: 'undo', title: 'Hoàn tác tự động hóa', message: row.title || row.action, undo: null });
        return result;
      }
      return null;
    },
    status() {
      let held = [];
      let oos = [];
      let lowIngredients = [];
      try { held = heldBookings(); } catch (e) {}
      try { oos = API.menu.getOutOfStock(); } catch (e) {}
      try {
        lowIngredients = API.menu.getAll()
          .filter(m => m && m.inventoryManaged && m.ingredientAvailable && Number(m.maxServings) <= 2);
      } catch (e) {}
      return {
        settings: this.settings,
        describe: this.describe(),
        heldCount: held.length,
        outOfStockCount: oos.length,
        lowIngredientCount: lowIngredients.length,
        logs: this.logs
      };
    }
  };

  window.AutomationEngine = AutomationEngine;
  if (typeof module !== 'undefined' && module.exports) module.exports = AutomationEngine;

  /* Script được nạp sau API; chờ 1 nhịp để dữ liệu seed sẵn sàng. */
  setTimeout(() => { try { AutomationEngine.start(); } catch (e) {} }, 700);
})();
