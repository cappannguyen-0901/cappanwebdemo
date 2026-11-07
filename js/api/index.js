/* ============================================================
   API GIẢ — MÔ PHỎNG BACKEND (ĐÃ FIX LỖI LOGIC)
============================================================ */

/* Bản chụp khuyến mãi mặc định — chỉ dùng để nạp lần đầu */
const _PROMO_SEED = (typeof SEED_PROMOTIONS !== 'undefined' ? SEED_PROMOTIONS : []).map(p => ({ ...p }));
/* Bản chụp menu gốc */
const _MENU_BASE = (typeof SEED_MENU_ITEMS !== 'undefined' ? SEED_MENU_ITEMS : []).map(m => ({ ...m }));

/* ---------- CẦU NỐI TỚI CAPPAN CORE (js/core.js) ----------
   Toàn bộ giá/luật đặt bàn/quyền/audit nằm ở core.js để web và chat
   dùng CÙNG một luật. Nếu core.js chưa nạp (trang cũ) thì các hàm dưới
   trả về "cho qua" để không làm sập giao diện. */
function _audit(entry) {
  try { if (typeof Audit !== 'undefined') Audit.log(entry); } catch (e) {}
}
/* Trả về true/false. Không có người đăng nhập (seed/test) thì cho qua,
   vì luồng UI đã yêu cầu đăng nhập trước khi gọi. */
function _policyAllow(action, resource) {
  try {
    if (typeof Policy === 'undefined') return true;
    const user = API.users.getCurrent();
    if (!user) return true;
    const chk = Policy.authorize(Policy.actor(user), action, resource);
    if (!chk.allowed) {
      _audit({ action, targetId: resource && (resource.id || resource.targetId), ok: false, code: 'FORBIDDEN' });
    }
    return chk.allowed;
  } catch (e) { return true; }
}
function _userId() {
  try { const u = API.users.getCurrent(); return u ? u.id : null; } catch (e) { return null; }
}
function _isDemo() {
  try { return typeof CappanConfig === 'undefined' ? true : CappanConfig.isDemo(); } catch (e) { return true; }
}
/* Ghi lỗi nghiệp vụ gần nhất để UI hiển thị đúng lý do (thay vì "bàn đã có người"). */
function _setLastError(err) {
  try { API._lastError = err ? String(err) : null; } catch (e) {}
  return null;
}

/* ⚡ HARDENING: mọi mutation ghi localStorage phải qua storeSet —
   storage đầy/bị chặn (QuotaExceededError / SecurityError) không được ném
   xuyên qua làm hỏng trạng thái nửa vời (VD: booking ghi được, ghế không đổi). */
function storeSet(key, val) {
  try {
    localStorage.setItem(key, val);
    return true;
  } catch (e) {
    try { console.warn('[API] ⚠ Không lưu được "' + key + '" — localStorage đầy hoặc bị chặn:', e && e.name || e); } catch (e2) {}
    return false;
  }
}

const API = {

  /* ---------- USERS ---------- */
  users: {
  getAll() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.users) || '[]'); }
    catch { return []; }
  },
  getById(id) { return this.getAll().find(u => u.id === id) || null; },
  getByPhone(p) { return this.getAll().find(u => u.phone === p) || null; },

  // ⚡ FIX 3: Đã xóa cặp hàm trùng lặp. Chỉ dùng sessionStorage để mỗi tab có phiên riêng.
    getCurrent() {
      try {
        // ⚡ CHỈ ĐỌC TỪ SESSION STORAGE. Mỗi tab có một session riêng.
        const raw = sessionStorage.getItem(STORAGE_KEYS.currentUser);
        return JSON.parse(raw || 'null'); 
      } catch { return null; }
    },
    
    setCurrent(u) {
      if (u) {
        // ⚡ CHỈ LƯU VÀO SESSION STORAGE. Không can thiệp vào localStorage chung.
        // ⚡ Không lưu mật khẩu/hash vào sessionStorage — chỉ giữ hồ sơ cần cho UI.
        const safe = { ...u };
        delete safe.password;
        delete safe.passwordHash;
        delete safe.passwordSalt;
        sessionStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(safe));
      } else {
        sessionStorage.removeItem(STORAGE_KEYS.currentUser);
      }
    },

  /* Chuẩn hoá mật khẩu: không bao giờ lưu plaintext nếu có CappanHash. */
  _passwordFields(plain) {
    if (typeof CappanHash === 'undefined' || plain === undefined || plain === null) return {};
    return CappanHash.create(String(plain));
  },

  /* Đặt/đổi mật khẩu: lưu salt + hash, xoá plaintext cũ. */
  setPassword(id, plain) {
    const list = this.getAll();
    const i = list.findIndex(u => u.id === id);
    if (i === -1) return null;
    const fields = this._passwordFields(plain);
    delete list[i].password;
    list[i] = { ...list[i], ...fields, passwordUpdatedAt: new Date().toISOString() };
    storeSet(STORAGE_KEYS.users, JSON.stringify(list));
    const cur = this.getCurrent();
    if (cur && cur.id === id) this.setCurrent(list[i]);
    return list[i];
  },

  /* Kiểm mật khẩu. Tài khoản cũ (plaintext) vẫn đăng nhập được và tự nâng cấp. */
  verifyPassword(user, plain) {
    if (!user) return { ok: false };
    if (user.passwordSalt && user.passwordHash && typeof CappanHash !== 'undefined') {
      return { ok: CappanHash.verify(plain, user.passwordSalt, user.passwordHash) };
    }
    if (typeof user.password === 'string') {
      return { ok: user.password === plain, legacy: true };
    }
    return { ok: false };
  },

  /* Nâng cấp mọi tài khoản còn lưu plaintext (chạy 1 lần khi nạp API). */
  migratePasswords() {
    if (typeof CappanHash === 'undefined') return 0;
    const list = this.getAll();
    let n = 0;
    for (const u of list) {
      if (u.password && !u.passwordHash) {
        const fields = this._passwordFields(u.password);
        delete u.password;
        Object.assign(u, fields);
        n++;
      }
    }
    if (n) storeSet(STORAGE_KEYS.users, JSON.stringify(list));
    return n;
  },

  create(data) {
    const list = this.getAll();
    const pwFields = this._passwordFields(data.password);
    const user = {
      id: 'U' + String(list.length + 1).padStart(3, '0'),
      name: data.name,
      phone: data.phone,
      ...pwFields,
      role: data.role || 'customer',
      email: data.email || '',
      address: data.address || '',
      birthday: data.birthday || '',
      joinedAt: new Date().toISOString(),
      noShowCount: 0
    };
    list.push(user);
    storeSet(STORAGE_KEYS.users, JSON.stringify(list));
    return user;
  },
  update(id, patch) {
    const list = this.getAll();
    const i = list.findIndex(u => u.id === id);
    if (i === -1) return null;
    list[i] = { ...list[i], ...patch };
    storeSet(STORAGE_KEYS.users, JSON.stringify(list));
    const cur = this.getCurrent();
    if (cur && cur.id === id) this.setCurrent(list[i]);
    return list[i];
  },
  seedDemo() {
    if (typeof CappanConfig !== 'undefined' && CappanConfig.isProd()) return;
    if (this.getAll().length > 0) return;
    const pw = this._passwordFields('123');
    const demo = [
      { id:'U001', name:'Khách Demo', phone:'0900000001', ...pw, role:'customer', joinedAt:new Date().toISOString(), noShowCount:0 },
      { id:'U002', name:'Nhân viên Demo', phone:'0900000002', ...pw, role:'staff', joinedAt:new Date().toISOString(), noShowCount:0 }
    ];
    storeSet(STORAGE_KEYS.users, JSON.stringify(demo));
  }
},

  /* ---------- CATEGORIES ---------- */
  categories: {
    getAll() { return [...SEED_CATEGORIES].sort((a,b) => a.order - b.order); },
    getById(id) { return SEED_CATEGORIES.find(c => c.id === id) || null; }
  },

    /* ---------- MENU ---------- */
  menu: {
    // ⚡ FIX 4.3: cache in-memory với epoch counter
    _cache: null,
    _epoch: 0,
    _epochAtBuild: -1,
    _inventoryEpoch: -1,

    _invalidate() {
      this._cache = null;
      this._epochAtBuild = -1;
    },

    _getStateMap() {
      try { return JSON.parse(localStorage.getItem('cappan_menu_state') || '{}'); }
      catch { return {}; }
    },
    _setStateMap(map) { storeSet('cappan_menu_state', JSON.stringify(map)); },

    _read(key, fallback) {
      try {
        const v = JSON.parse(localStorage.getItem(key));
        return v === null || v === undefined ? fallback : v;
      } catch { return fallback; }
    },
    _custom()    { const v = this._read('cappan_menu_custom', []);    return Array.isArray(v) ? v : []; },
    _removed()   { const v = this._read('cappan_menu_removed', []);   return Array.isArray(v) ? v : []; },
    _overrides() { const v = this._read('cappan_menu_overrides', {}); return (v && typeof v === 'object') ? v : {}; },

    _syncSeed() {
      if (typeof SEED_MENU_ITEMS === 'undefined') return;
      const all = this.getAll();
      SEED_MENU_ITEMS.length = 0;
      all.forEach(m => SEED_MENU_ITEMS.push(m));
    },

    /* ⚡ Cache hit nếu epoch chưa đổi kể từ lần build trước */
    getAll() {
      const invEpoch = (typeof API !== 'undefined' && API.ingredients)
        ? (API.ingredients._epoch || 0) : 0;
      if (this._cache && this._epochAtBuild === this._epoch && this._inventoryEpoch === invEpoch) {
        return this._cache;
      }

      const stateMap = this._getStateMap();
      const removed = this._removed();
      const overrides = this._overrides();
      const custom = this._custom();

      const result = [..._MENU_BASE, ...custom]
        .filter(m => !removed.includes(m.id))
        .map(m => {
          const merged = { ...m, ...(overrides[m.id] || {}) };
          merged.inStock = stateMap[m.id] !== undefined ? stateMap[m.id] : merged.inStock;

          // ⚡ Tồn kho nguyên liệu là lớp phủ, không ghi đè cờ thủ công.
          let inv = null;
          try {
            inv = (typeof API !== 'undefined' && API.ingredients)
              ? API.ingredients.availability(m.id) : null;
          } catch (e) { inv = null; }
          if (inv && inv.managed) {
            merged.ingredientAvailable = !!inv.available;
            merged.maxServings = inv.maxServings;
            merged.limitingIngredient = inv.limiting;
            merged.inventoryManaged = true;
            merged.inStock = !!merged.inStock && !!inv.available;
          } else {
            merged.ingredientAvailable = true;
            merged.maxServings = null;
            merged.limitingIngredient = null;
            merged.inventoryManaged = false;
          }
          return merged;
        });

      this._cache = result;
      this._epochAtBuild = this._epoch;
      this._inventoryEpoch = invEpoch;
      return result;
    },

    getById(id) { return this.getAll().find(m => m.id === id) || null; },
    getByCategory(catId) { return this.getAll().filter(m => m.categoryId === catId); },
    getAvailable() { return this.getAll().filter(m => m.inStock); },
    getOutOfStock() { return this.getAll().filter(m => !m.inStock); },

    search(kw) {
      const k = String(kw || '').toLowerCase().trim();
      if (!k) return this.getAll();
      return this.getAll().filter(m => m.name.toLowerCase().includes(k));
    },

    markOutOfStock(id) {
      const map = this._getStateMap();
      map[id] = false;
      this._setStateMap(map);
      this._epoch++;                    // ⚡ bump epoch
      this._invalidate();                // ⚡ xoá cache
      return this.getById(id);
    },

    markInStock(id) {
      const map = this._getStateMap();
      map[id] = true;
      this._setStateMap(map);
      this._epoch++;
      this._invalidate();
      return this.getById(id);
    },

    add(item) {
      const newItem = {
        id: 'M' + Date.now().toString().slice(-6),
        name: item.name,
        categoryId: item.categoryId,
        price: item.price,
        img: item.img || 'assets/images/photo-1510707577719-ae7c14805e3a-w600.jpg',
        description: item.description || '',
        badge: item.badge || '',
        inStock: true,
        sizes: item.sizes || [],
        toppings: item.toppings || []
      };
      const custom = this._custom();
      custom.push(newItem);
      storeSet('cappan_menu_custom', JSON.stringify(custom));
      this._epoch++;
      this._invalidate();
      this._syncSeed();
      return newItem;
    },

    update(id, patch) {
      const exists = this.getById(id);
      if (!exists) return null;
      const safe = { ...patch };
      delete safe.id;
      const custom = this._custom();
      const ci = custom.findIndex(m => m.id === id);
      if (ci >= 0) {
        custom[ci] = { ...custom[ci], ...safe };
        storeSet('cappan_menu_custom', JSON.stringify(custom));
      } else {
        const ov = this._overrides();
        ov[id] = { ...(ov[id] || {}), ...safe };
        storeSet('cappan_menu_overrides', JSON.stringify(ov));
      }
      this._epoch++;
      this._invalidate();
      this._syncSeed();
      return this.getById(id);
    },

    remove(id) {
      if (!this.getById(id)) return false;
      const custom = this._custom();
      const ci = custom.findIndex(m => m.id === id);
      if (ci >= 0) {
        custom.splice(ci, 1);
        storeSet('cappan_menu_custom', JSON.stringify(custom));
      } else {
        const removed = this._removed();
        if (!removed.includes(id)) removed.push(id);
        storeSet('cappan_menu_removed', JSON.stringify(removed));
      }
      const map = this._getStateMap();
      delete map[id];
      this._setStateMap(map);
      const ov = this._overrides();
      delete ov[id];
      storeSet('cappan_menu_overrides', JSON.stringify(ov));
      this._epoch++;
      this._invalidate();
      this._syncSeed();
      return true;
    }
  },

  /* ---------- INGREDIENTS / BOM / INVENTORY ---------- */
  ingredients: {
    ING_KEY: 'cappan_ingredients_v1',
    BOM_KEY: 'cappan_bom_v1',
    LOG_KEY: 'cappan_inventory_log_v1',
    _epoch: 1,

    _read(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        if (raw === null) return fallback;
        const val = JSON.parse(raw);
        return val === null || val === undefined ? fallback : val;
      } catch (e) { return fallback; }
    },

    _write(key, val) {
      return storeSet(key, JSON.stringify(val));
    },

    _ensure() {
      try {
        if (localStorage.getItem(this.ING_KEY) === null) {
          const seed = (typeof SEED_INGREDIENTS !== 'undefined') ? SEED_INGREDIENTS : [];
          this._write(this.ING_KEY, seed.map(x => ({ ...x })));
        }
        if (localStorage.getItem(this.BOM_KEY) === null) {
          const seed = (typeof SEED_BOM !== 'undefined') ? SEED_BOM : {};
          this._write(this.BOM_KEY, JSON.parse(JSON.stringify(seed)));
        }
      } catch (e) {
        console.warn('[inventory] seed failed:', e);
      }
    },

    getAll() {
      this._ensure();
      const list = this._read(this.ING_KEY, []);
      return Array.isArray(list) ? list : [];
    },

    getById(id) {
      return this.getAll().find(x => x.id === id) || null;
    },

    getLogs(limit) {
      const list = this._read(this.LOG_KEY, []);
      const n = Math.max(1, Math.min(Number(limit) || 200, 500));
      return Array.isArray(list) ? list.slice(0, n) : [];
    },

    getBom(menuItemId) {
      this._ensure();
      const all = this._read(this.BOM_KEY, {});
      const bom = all && all[menuItemId];
      return (bom && Array.isArray(bom.lines) && bom.lines.length) ? bom : null;
    },

    getAllBom() {
      this._ensure();
      const all = this._read(this.BOM_KEY, {});
      return (all && typeof all === 'object') ? all : {};
    },

    setBom(menuItemId, lines, wasteRate) {
      if (!menuItemId) return { ok: false, error: 'Thiếu mã món' };
      const clean = (Array.isArray(lines) ? lines : [])
        .map(x => ({ ingredientId: String(x.ingredientId || ''), qty: Number(x.qty) || 0 }))
        .filter(x => x.ingredientId && x.qty > 0);
      if (!clean.length) return { ok: false, error: 'BOM phải có ít nhất 1 nguyên liệu' };
      const all = this.getAllBom();
      all[menuItemId] = { name: (all[menuItemId] && all[menuItemId].name) || '', lines: clean, wasteRate: Math.max(0, Number(wasteRate) || 0) };
      this._write(this.BOM_KEY, all);
      this._epoch++;
      return { ok: true, bom: all[menuItemId] };
    },

    _sizeFactor(size, bom) {
      if (!size) return 1;
      if (bom && bom.sizes && bom.sizes[size] !== undefined) return Number(bom.sizes[size]) || 1;
      return String(size).toUpperCase() === 'L' ? 1.25 : 1;
    },

    /* Định lượng một dòng món (đã gồm size + hao hụt). */
    _explode(menuItemId, size, quantity) {
      const bom = this.getBom(menuItemId);
      if (!bom) return [];
      const factor = this._sizeFactor(size, bom);
      const waste = Math.max(0, Number(bom.wasteRate) || 0);
      return bom.lines.map(line => {
        const ing = this.getById(line.ingredientId);
        return {
          ingredientId: line.ingredientId,
          name: ing ? ing.name : line.ingredientId,
          unit: ing ? ing.unit : '',
          qty: (Number(line.qty) || 0) * factor * (1 + waste) * (Number(quantity) || 0)
        };
      }).filter(x => x.qty > 0);
    },

    availability(menuItemId, size) {
      const bom = this.getBom(menuItemId);
      if (!bom) {
        return { managed: false, available: true, maxServings: null, limiting: null, lines: [] };
      }
      const per = this._explode(menuItemId, size, 1);
      if (!per.length) {
        return { managed: false, available: true, maxServings: null, limiting: null, lines: [] };
      }
      let max = Infinity;
      let limiting = null;
      const lines = [];
      for (const line of per) {
        const ing = this.getById(line.ingredientId);
        if (!ing) {
          return { managed: true, available: false, maxServings: 0, limiting: line.name, error: 'Thiếu nguyên liệu ' + line.name, lines: [] };
        }
        const possible = ing.stock > 0 ? Math.floor(ing.stock / line.qty + 1e-9) : 0;
        if (possible < max) { max = possible; limiting = ing.name; }
        lines.push({ ingredientId: ing.id, name: ing.name, unit: ing.unit, perServing: line.qty, stock: ing.stock, possible });
      }
      return {
        managed: true,
        available: max > 0,
        maxServings: Number.isFinite(max) ? max : 0,
        limiting,
        lines
      };
    },

    checkItems(items) {
      const need = {};
      for (const raw of (Array.isArray(items) ? items : [])) {
        const menuItemId = raw.itemId || raw.id || raw.menuItemId;
        const qty = Number(raw.qty || raw.quantity || 0);
        if (!menuItemId || qty <= 0) continue;
        for (const line of this._explode(menuItemId, raw.size, qty)) {
          need[line.ingredientId] = (need[line.ingredientId] || 0) + line.qty;
        }
      }
      const shortages = [];
      for (const [id, qty] of Object.entries(need)) {
        const ing = this.getById(id);
        if (!ing) {
          shortages.push({ ingredientId: id, name: id, needed: qty, stock: 0 });
        } else if (Number(ing.stock) + 1e-9 < qty) {
          shortages.push({ ingredientId: id, name: ing.name, unit: ing.unit, needed: qty, stock: Number(ing.stock) });
        }
      }
      if (shortages.length) {
        const s = shortages[0];
        return {
          ok: false,
          error: `Không đủ ${s.name}: cần ${this._fmt(s.needed)}${s.unit || ''}, còn ${this._fmt(s.stock)}${s.unit || ''}`,
          need, shortages
        };
      }
      return { ok: true, need };
    },

    _fmt(n) {
      const x = Math.round(Number(n) * 100) / 100;
      return Number.isInteger(x) ? String(x) : x.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
    },

    deductOrder(orderId, items) {
      const check = this.checkItems(items);
      if (!check.ok) return check;
      if (!Object.keys(check.need).length) return { ok: true, need: {}, lines: [] };

      const list = this.getAll();
      const touched = [];
      for (const [id, qty] of Object.entries(check.need)) {
        const i = list.findIndex(x => x.id === id);
        if (i === -1) continue;
        const before = Number(list[i].stock) || 0;
        list[i].stock = Math.max(0, Math.round((before - qty) * 1000) / 1000);
        list[i].updatedAt = new Date().toISOString();
        touched.push({ ingredientId: id, name: list[i].name, unit: list[i].unit, qty: -qty, before, after: list[i].stock });
      }
      if (!this._write(this.ING_KEY, list)) return { ok: false, error: 'Không lưu được tồn kho' };
      const log = this._read(this.LOG_KEY, []);
      const at = new Date().toISOString();
      for (const t of touched) {
        log.unshift({ id: 'INV' + Date.now().toString(36) + Math.random().toString(36).slice(2, 4), at, type: 'sale', orderId, ...t });
      }
      this._write(this.LOG_KEY, log.slice(0, 500));
      this._epoch++;
      return { ok: true, need: check.need, lines: touched };
    },

    restoreOrder(orderId) {
      const logs = this._read(this.LOG_KEY, []);
      if (!Array.isArray(logs)) return { ok: false, error: 'Không có log kho' };
      if (logs.some(l => l.orderId === orderId && l.type === 'refund')) {
        return { ok: true, already: true };
      }
      const saleLines = logs.filter(l => l.orderId === orderId && l.type === 'sale');
      if (!saleLines.length) return { ok: false, error: 'Đơn chưa trừ kho' };

      const list = this.getAll();
      const at = new Date().toISOString();
      for (const s of saleLines) {
        const i = list.findIndex(x => x.id === s.ingredientId);
        if (i === -1) continue;
        const before = Number(list[i].stock) || 0;
        const add = Math.abs(Number(s.qty) || 0);
        list[i].stock = Math.round((before + add) * 1000) / 1000;
        list[i].updatedAt = at;
        logs.unshift({ id: 'INV' + Date.now().toString(36) + Math.random().toString(36).slice(2, 4), at, type: 'refund', orderId, ingredientId: s.ingredientId, name: s.name, unit: s.unit, qty: add, before, after: list[i].stock });
      }
      this._write(this.ING_KEY, list);
      this._write(this.LOG_KEY, logs.slice(0, 500));
      this._epoch++;
      return { ok: true, restored: saleLines.length };
    },

    importStock(id, qty, note) {
      const amount = Number(qty);
      if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: 'Số lượng nhập phải > 0' };
      const list = this.getAll();
      const i = list.findIndex(x => x.id === id);
      if (i === -1) return { ok: false, error: 'Không tìm thấy nguyên liệu' };
      const before = Number(list[i].stock) || 0;
      list[i].stock = Math.round((before + amount) * 1000) / 1000;
      list[i].updatedAt = new Date().toISOString();
      if (!this._write(this.ING_KEY, list)) return { ok: false, error: 'Không lưu được tồn kho' };
      const log = this._read(this.LOG_KEY, []);
      log.unshift({ id: 'INV' + Date.now().toString(36) + Math.random().toString(36).slice(2, 4), at: new Date().toISOString(), type: 'import', ingredientId: id, name: list[i].name, unit: list[i].unit, qty: amount, before, after: list[i].stock, note: note || '' });
      this._write(this.LOG_KEY, log.slice(0, 500));
      this._epoch++;
      return { ok: true, ingredient: list[i] };
    },

    adjustStock(id, newStock, note) {
      const value = Number(newStock);
      if (!Number.isFinite(value) || value < 0) return { ok: false, error: 'Tồn kho phải >= 0' };
      const list = this.getAll();
      const i = list.findIndex(x => x.id === id);
      if (i === -1) return { ok: false, error: 'Không tìm thấy nguyên liệu' };
      const before = Number(list[i].stock) || 0;
      list[i].stock = Math.round(value * 1000) / 1000;
      list[i].updatedAt = new Date().toISOString();
      if (!this._write(this.ING_KEY, list)) return { ok: false, error: 'Không lưu được tồn kho' };
      const log = this._read(this.LOG_KEY, []);
      log.unshift({ id: 'INV' + Date.now().toString(36) + Math.random().toString(36).slice(2, 4), at: new Date().toISOString(), type: 'adjust', ingredientId: id, name: list[i].name, unit: list[i].unit, qty: list[i].stock - before, before, after: list[i].stock, note: note || '' });
      this._write(this.LOG_KEY, log.slice(0, 500));
      this._epoch++;
      return { ok: true, ingredient: list[i] };
    },

    getLowStock() {
      return this.getAll().filter(x => Number(x.stock) > 0 && Number(x.stock) <= Number(x.minStock || 0));
    },

    getOutOfStock() {
      return this.getAll().filter(x => Number(x.stock) <= 0);
    },

    getValue() {
      return this.getAll().reduce((s, x) => s + (Number(x.stock) || 0) * (Number(x.unitCost) || 0), 0);
    },

    resetDemo() {
      this._write(this.ING_KEY, (typeof SEED_INGREDIENTS !== 'undefined' ? SEED_INGREDIENTS : []).map(x => ({ ...x })));
      this._write(this.BOM_KEY, JSON.parse(JSON.stringify(typeof SEED_BOM !== 'undefined' ? SEED_BOM : {})));
      this._write(this.LOG_KEY, []);
      this._epoch++;
      return { ok: true };
    }
  },

  /* ---------- TABLE SESSIONS (QR tại bàn) ---------- */
  tableSessions: {
    KEY: 'cappan_table_sessions_v1',
    CURRENT: 'cappan_current_table_session',

    _read() {
      try {
        const raw = JSON.parse(localStorage.getItem(this.KEY) || '[]');
        return Array.isArray(raw) ? raw : [];
      } catch (e) { return []; }
    },

    _write(list) {
      return storeSet(this.KEY, JSON.stringify(list));
    },

    getAll() { return this._read(); },

    getById(id) { return this._read().find(s => s.id === id) || null; },

    getOpenByTable(tableId) {
      return this._read().find(s => s.tableId === tableId && s.status === 'active') || null;
    },

    open(tableId) {
      const table = String(tableId || '').trim().toUpperCase();
      if (!table) return { ok: false, error: 'Thiếu mã bàn' };
      const existing = this.getOpenByTable(table);
      if (existing) return { ok: true, session: existing, existing: true };
      const list = this._read();
      const day = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const seq = list.filter(s => s.tableId === table && s.id.includes(day)).length + 1;
      const session = {
        id: `TS_${table}_${day}_${String(seq).padStart(2, '0')}`,
        tableId: table,
        status: 'active',
        openedAt: new Date().toISOString(),
        closedAt: null,
        total: 0,
        orderCount: 0,
        source: 'qr_table'
      };
      list.unshift(session);
      if (!this._write(list)) return { ok: false, error: 'Không lưu được phiên bàn' };
      try { _audit({ action: 'table.session_open', targetId: session.id, ok: true }); } catch (e) {}
      return { ok: true, session, existing: false };
    },

    join(tableId) {
      return this.open(tableId);
    },

    setCurrent(session) {
      try {
        if (session) sessionStorage.setItem(this.CURRENT, JSON.stringify(session));
        else sessionStorage.removeItem(this.CURRENT);
      } catch (e) {}
    },

    getCurrent() {
      try {
        const raw = sessionStorage.getItem(this.CURRENT);
        return raw ? JSON.parse(raw) : null;
      } catch (e) { return null; }
    },

    getBill(id) {
      let orders = [];
      try { orders = API.orders.getAll(); } catch (e) {}
      const lines = orders.filter(o => o.tableSessionId === id && o.status !== 'cancelled');
      return {
        sessionId: id,
        orders: lines,
        total: lines.reduce((s, o) => s + (Number(o.total) || 0), 0),
        orderCount: lines.length
      };
    },

    settle(id) {
      const session = this.getById(id);
      if (!session || session.status !== 'active') return { ok: false, error: 'Phiên bàn không mở' };
      const bill = this.getBill(id);
      const orders = API.orders.getAll().map(o =>
        o.tableSessionId === id ? { ...o, paymentStatus: 'settled', paymentMethod: o.paymentMethod || 'pay_later' } : o
      );
      if (!storeSet(STORAGE_KEYS.orders, JSON.stringify(orders))) return { ok: false, error: 'Không lưu được thanh toán' };
      const list = this._read();
      const i = list.findIndex(s => s.id === id);
      if (i !== -1) {
        list[i].status = 'closed';
        list[i].closedAt = new Date().toISOString();
        list[i].total = bill.total;
        list[i].orderCount = bill.orderCount;
        this._write(list);
      }
      this.setCurrent(null);
      try { _audit({ action: 'table.session_close', targetId: id, ok: true }); } catch (e) {}
      return { ok: true, total: bill.total, orderCount: bill.orderCount, session: list[i] };
    }
  },

  /* ---------- PROMOTIONS (quản lý trên giao diện staff) ---------- */
  promotions: {
    KEY: 'cappan_promotions',

    _save(list) {
      storeSet(this.KEY, JSON.stringify(list));
      this._sync(list);
    },

    /* Giữ SEED_PROMOTIONS khớp dữ liệu thật (cho trang nào còn đọc trực tiếp) */
    _sync(list) {
      if (typeof SEED_PROMOTIONS === 'undefined') return;
      const src = list || this.getAll();
      SEED_PROMOTIONS.length = 0;
      src.forEach(p => SEED_PROMOTIONS.push(p));
    },

    getAll() {
      try {
        const raw = localStorage.getItem(this.KEY);
        if (raw === null) {                      // lần đầu: nạp mã mặc định
          const seed = _PROMO_SEED.map(p => ({ ...p }));
          storeSet(this.KEY, JSON.stringify(seed));
          return seed;
        }
        const arr = JSON.parse(raw);
        return Array.isArray(arr) ? arr : [];
      } catch { return []; }
    },

    getByCode(code) {
      const c = String(code || '').toUpperCase().trim();
      return this.getAll().find(p => p.code === c) || null;
    },

    /* 'active' | 'upcoming' | 'expired' | 'off' */
    status(p, today) {
      const d = today || API.utils.today();
      if (!p.active) return 'off';
      if (p.startDate && d < p.startDate) return 'upcoming';
      if (p.endDate && d > p.endDate) return 'expired';
      return 'active';
    },

    getActive(today)   { return this.getAll().filter(p => this.status(p, today) === 'active'); },

    /* Kiểm tra & tính giảm giá cho 1 mã. Trả { ok, discount, promo } hoặc { ok:false, error } */
    evaluate(code, subtotal, shipping, userId) {
      const p = this.getByCode(code);
      if (!p) return { ok: false, error: 'Mã khuyến mãi không tồn tại' };
      const st = this.status(p);
      if (st !== 'active') {
        return { ok: false, error: st === 'upcoming' ? 'Mã chưa đến thời gian áp dụng' : st === 'expired' ? 'Mã đã hết hạn' : 'Mã đang tạm tắt' };
      }
      if (p.minOrder && subtotal < p.minOrder) {
        return { ok: false, error: 'Đơn tối thiểu ' + API.utils.formatVND(p.minOrder) + ' mới dùng được mã này' };
      }
      if (/đầu tiên/i.test(p.terms || '') && userId &&
          API.orders.getByUser(userId).some(o => o.status !== 'cancelled')) {
        return { ok: false, error: 'Mã chỉ dành cho đơn hàng đầu tiên' };
      }
      const d = String(p.discount || '');
      let discount = 0;
      if (d.includes('%')) {
        discount = Math.round(subtotal * (parseFloat(d) || 0) / 100);
        if (p.maxDiscount) discount = Math.min(discount, p.maxDiscount);
      } else {
        discount = parseInt(d.replace(/\D/g, ''), 10) || 0;
      }
      if (/ship|giao hàng/i.test((p.name || '') + ' ' + (p.description || ''))) discount = Math.min(discount || shipping, shipping);
      discount = Math.max(0, Math.min(discount, subtotal + shipping));
      return { ok: true, discount, promo: p };
    },
    getUpcoming(today) { return this.getAll().filter(p => this.status(p, today) === 'upcoming'); },

    _normalize(data) {
      const num = v => { const n = Number(v); return isFinite(n) && n > 0 ? n : 0; };
      const out = {
        code: String(data.code || '').toUpperCase().replace(/\s+/g, ''),
        name: String(data.name || '').trim(),
        description: String(data.description || '').trim(),
        discount: String(data.discount || '').trim(),
        minOrder: num(data.minOrder),
        active: data.active !== false,
        startDate: data.startDate || '',
        endDate: data.endDate || '',
        terms: String(data.terms || '').trim()
      };
      const max = num(data.maxDiscount);
      if (max) out.maxDiscount = max;
      return out;
    },

    _validate(p) {
      if (!p.code) return 'Vui lòng nhập mã khuyến mãi';
      if (!/^[A-Z0-9_-]{3,20}$/.test(p.code)) return 'Mã chỉ gồm chữ/số/gạch (3–20 ký tự)';
      if (!p.name) return 'Vui lòng nhập tên chương trình';
      if (!p.discount) return 'Vui lòng nhập mức giảm (VD: 10% hoặc 20.000đ)';
      if (p.startDate && p.endDate && p.endDate < p.startDate) return 'Ngày kết thúc phải sau ngày bắt đầu';
      return null;
    },

    add(data) {
      const p = this._normalize(data);
      const err = this._validate(p);
      if (err) return { ok: false, error: err };
      const list = this.getAll();
      if (list.some(x => x.code === p.code)) return { ok: false, error: `Mã ${p.code} đã tồn tại` };
      list.push(p);
      this._save(list);
      return { ok: true, promo: p };
    },

    update(code, data) {
      const list = this.getAll();
      const i = list.findIndex(x => x.code === String(code).toUpperCase());
      if (i === -1) return { ok: false, error: 'Không tìm thấy mã khuyến mãi' };
      const p = this._normalize({ ...list[i], ...data, code: list[i].code });
      const err = this._validate(p);
      if (err) return { ok: false, error: err };
      list[i] = p;
      this._save(list);
      return { ok: true, promo: p };
    },

    remove(code) {
      const c = String(code).toUpperCase();
      const list = this.getAll();
      const next = list.filter(x => x.code !== c);
      if (next.length === list.length) return false;
      this._save(next);
      return true;
    }
  },

  /* ---------- FLOORS ---------- */
  floors: {
    getAll() { return SEED_FLOORS; },
    getById(id) { return SEED_FLOORS.find(f => f.id === id) || null; }
  },

  /* ---------- SEATS ---------- */
  seats: {
    _getStateMap() {
      try {
        const saved = JSON.parse(localStorage.getItem('cappan_seats_state') || '{}');
        if (Array.isArray(saved)) {
          const map = {};
          saved.forEach(s => {
            if (s.id && s.status === 'booked') map[s.id] = 'booked';
          });
          storeSet('cappan_seats_state', JSON.stringify(map));
          return map;
        }
        return (saved && typeof saved === 'object') ? saved : {};
      } catch (e) {
        console.warn('Lỗi đọc seats state:', e);
        return {};
      }
    },

    _setStateMap(map) {
      storeSet('cappan_seats_state', JSON.stringify(map));
    },

    syncFromBookings() {
      const map = this._getStateMap();
      const bookings = API.bookings.getAll();
      /* 'held' (đang giữ bàn) và 'seated' (đã vào bàn) vẫn chiếm bàn. */
      const active = bookings.filter(b =>
        b.status === 'confirmed' || b.status === 'seated' || b.status === 'held');
      const activeSeatIds = active.map(b => b.seatId);
      const heldSeatIds = active.filter(b => b.status === 'held').map(b => b.seatId);

      Object.keys(map).forEach(seatId => {
        if ((map[seatId] === 'booked' || map[seatId] === 'held') && !activeSeatIds.includes(seatId)) {
          delete map[seatId];
        }
      });

      activeSeatIds.forEach(seatId => {
        map[seatId] = heldSeatIds.includes(seatId) ? 'held' : 'booked';
      });

      this._setStateMap(map);
      return map;
    },

    getAll() {
      const map = this._getStateMap();
      return SEED_SEATS.map(s => ({
        ...s,
        status: map[s.id] || 'available'
      }));
    },

    getById(id) {
      const found = this.getAll().find(s => s.id === id);
      return found || null;
    },

    getByFloor(fId) {
      return this.getAll().filter(s => s.floorId === fId);
    },

    getAvailable() {
      return this.getAll().filter(s => s.status === 'available');
    },

    getBooked() {
      return this.getAll().filter(s => s.status === 'booked');
    },

    getHeld() {
      return this.getAll().filter(s => s.status === 'held');
    },

    book(id) {
      const map = this._getStateMap();
      map[id] = 'booked';
      this._setStateMap(map);
      return this.getById(id);
    },

    release(id) {
      const map = this._getStateMap();
      map[id] = 'available';
      this._setStateMap(map);
      return this.getById(id);
    },

    releaseAll() {
      this._setStateMap({});
    },

    releaseByFloor(floorId) {
      const map = this._getStateMap();
      SEED_SEATS.filter(s => s.floorId === floorId).forEach(s => {
        delete map[s.id];
      });
      this._setStateMap(map);
    },

    resetToDefault() {
      localStorage.removeItem('cappan_seats_state');
    },

    /* Hoàn tất các booking đang hoạt động thỏa điều kiện, trả về số booking */
    _completeActive(filterFn) {
      const active = API.bookings.getAll()
        .filter(b => (b.status === 'confirmed' || b.status === 'seated' || b.status === 'held') && filterFn(b));
      active.forEach(b => API.bookings.complete(b.id));
      return active.length;
    },

    /* Reset 1 chỗ: hoàn tất booking đang giữ chỗ rồi trả ghế */
    resetSeat(id) {
      const n = this._completeActive(b => b.seatId === id);
      this.release(id);
      this.syncFromBookings();
      return n;
    },

    resetByFloor(floorId) {
      const ids = SEED_SEATS.filter(s => s.floorId === floorId).map(s => s.id);
      const n = this._completeActive(b => ids.includes(b.seatId));
      this.releaseByFloor(floorId);
      this.syncFromBookings();
      return n;
    },

    resetAll() {
      const n = this._completeActive(() => true);
      this.releaseAll();
      this.syncFromBookings();
      return n;
    }
  },

  /* ---------- BOOKINGS ---------- */
  bookings: {
    getAll() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.bookings) || '[]');
      } catch { return []; }
    },

    getById(id) {
      return this.getAll().find(b => b.id === id) || null;
    },

    getByUser(uid) {
      return this.getAll().filter(b => b.userId === uid);
    },

    getBySeat(sid) {
      return this.getAll().filter(b => b.seatId === sid);
    },

    getActiveBySeat(sid) {
      return this.getAll().find(b => b.seatId === sid && (b.status === 'confirmed' || b.status === 'seated' || b.status === 'held')) || null;
    },

    create(data, opts) {
      data = data || {};
      opts = opts || {};
      // ⚡ P1-3: Validate seat trước khi tạo booking (chặn double-booking)
      const seat = API.seats.getById(data.seatId);
      if (!seat) { console.warn('[bookings.create] Seat không tồn tại:', data.seatId); return _setLastError('Bàn đã chọn không tồn tại'); }
      if (seat.status !== 'available') { console.warn('[bookings.create] Seat đã được đặt:', data.seatId); return _setLastError('Bàn ' + data.seatId + ' đã có người đặt'); }

      /* ⚡ Luật đặt bàn ở tầng nghiệp vụ (không chỉ ở UI):
         ngày quá khứ, quá 14 ngày, giờ mở cửa, đặt trước 30 phút, sức chứa, tối đa 3 chỗ.
         Dữ liệu mẫu (demo.js) được phép bỏ qua bằng opts.seed.
         Nhân viên đặt hộ (opts.byStaff) vẫn kiểm thời gian/sức chứa nhưng bỏ giới hạn 3 chỗ. */
      if (!opts.seed) {
        const ownerId = data.userId || _userId();
        if (!_policyAllow('booking.create', { ownerId })) {
          return _setLastError('Bạn không có quyền đặt chỗ cho tài khoản khác');
        }
        if (typeof BookingRules !== 'undefined') {
          const activeCount = (ownerId && !opts.byStaff)
            ? this.getByUser(ownerId).filter(b => b.status === 'confirmed' || b.status === 'seated' || b.status === 'held').length
            : 0;
          const chk = BookingRules.validate({
            date: data.date,
            time: data.time,
            guests: data.guests,
            seat,
            now: opts.now instanceof Date ? opts.now : new Date(),
            activeCount
          });
          if (!chk.ok) {
            _audit({ action: 'booking.create', targetId: data.seatId, ok: false, code: 'INVALID' });
            return _setLastError(chk.error);
          }
        }
      }

      const list = this.getAll();
      const deposit = opts.seed ? 0 : (Number.isFinite(Number(data.deposit))
        ? Math.max(0, Number(data.deposit))
        : (typeof BookingRules !== 'undefined' ? BookingRules.depositFor(seat) : 0));
      const bk = {
        id: 'BK' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        userId: data.userId || null,
        seatId: data.seatId,
        floorId: data.floorId || seat.floorId,
        date: data.date,
        time: data.time,
        guests: data.guests || 2,
        note: data.note || '',
        customerName: String(data.customerName || '').trim(),
        phone: String(data.phone || '').trim(),
        createdBy: opts.byStaff ? 'staff' : (data.userId ? 'customer' : 'guest'),
        deposit,
        depositPaid: opts.seed ? false : !!data.depositPaid,
        depositPaidAt: (!opts.seed && data.depositPaid) ? new Date().toISOString() : null,
        status: 'confirmed',
        createdAt: new Date().toISOString()
      };
      list.push(bk);
      if (!storeSet(STORAGE_KEYS.bookings, JSON.stringify(list))) return _setLastError('Không lưu được đặt chỗ — bộ nhớ đầy hoặc bị chặn'); // ⚡ HARDENING: ghi fail → không book ghế, trả null như chỗ vừa bị mất

      API.seats.book(data.seatId);
      API.seats.syncFromBookings();
      _audit({ action: 'booking.create', targetId: bk.id, ok: true, code: opts.byStaff ? 'staff' : null });

      return bk;
    },

    /* Nhân viên đặt bàn hộ khách: tìm khách theo SĐT, hoặc lưu khách vãng lai. */
    createByStaff(data) {
      data = data || {};
      if (!_policyAllow('booking.create', null)) return _setLastError('Chỉ nhân viên mới đặt bàn hộ được');
      const phone = String(data.phone || '').trim();
      const user = data.userId
        ? API.users.getById(data.userId)
        : (phone ? API.users.getByPhone(phone) : null);
      return this.create({
        ...data,
        userId: user ? user.id : null,
        customerName: String(data.customerName || (user ? user.name : '') || 'Khách').trim(),
        phone: phone || (user ? user.phone : '')
      }, { byStaff: true });
    },

    /* Giữ bàn cho khách chưa đến (staff). Bàn chuyển sang trạng thái 'held'. */
    hold(data) {
      data = data || {};
      const now = new Date();
      const p = n => String(n).padStart(2, '0');
      const me = API.users.getCurrent();
      const phone = String(data.phone || '').trim();
      let user = data.userId ? API.users.getById(data.userId) : (phone ? API.users.getByPhone(phone) : null);
      if (!user && me) user = me;
      const ownerId = user ? user.id : (me ? me.id : null);
      if (!_policyAllow('booking.hold', { ownerId })) return _setLastError('Bạn không có quyền giữ bàn này');

      const seat = API.seats.getById(data.seatId);
      if (!seat) return _setLastError('Bàn ' + data.seatId + ' không tồn tại');
      if (seat.status !== 'available') return _setLastError('Bàn ' + data.seatId + ' đã có người');

      const guests = Number(data.guests) || 1;
      if (!Number.isInteger(guests) || guests < 1) return _setLastError('Số khách không hợp lệ');
      if (Number(seat.capacity) > 0 && guests > Number(seat.capacity)) {
        return _setLastError('Bàn ' + seat.id + ' chỉ chứa tối đa ' + seat.capacity + ' khách');
      }
      if (me && me.role === 'customer') {
        const active = this.getByUser(me.id).filter(b => b.status === 'held' || b.status === 'confirmed' || b.status === 'seated').length;
        if (active >= 3) return _setLastError('Bạn đang có 3 booking hoạt động, vui lòng hoàn tất/hủy bớt');
      }

      const date = data.date || API.utils.today();
      const time = data.time || (p(now.getHours()) + ':' + p(now.getMinutes()));
      if (data.date && data.time && typeof BookingRules !== 'undefined') {
        const chk = BookingRules.validate({ date, time, guests, seat, now: new Date(), activeCount: 0 });
        if (!chk.ok) return _setLastError(chk.error);
      }
      const deposit = typeof BookingRules !== 'undefined' ? BookingRules.depositFor(seat) : 0;
      const list = this.getAll();
      const bk = {
        id: 'BH' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
        userId: user ? user.id : null,
        seatId: seat.id,
        floorId: seat.floorId,
        date,
        time,
        guests,
        note: data.note || '',
        customerName: String(data.customerName || (user ? user.name : '') || 'Khách giữ bàn').trim(),
        phone: phone || (user ? user.phone : ''),
        createdBy: me && me.role === 'staff' ? 'staff' : (user ? 'customer' : 'guest'),
        held: true,
        status: 'held',
        heldAt: now.toISOString(),
        deposit,
        depositPaid: false,
        paymentPending: !!data.pendingPayment,
        paymentToken: 'PAY' + Date.now().toString(36) + Math.random().toString(36).slice(2, 9),
        createdAt: now.toISOString()
      };
      list.push(bk);
      if (!storeSet(STORAGE_KEYS.bookings, JSON.stringify(list))) return _setLastError('Không lưu được lượt giữ bàn — bộ nhớ đầy');
      API.seats.book(seat.id);
      API.seats.syncFromBookings();
      _audit({ action: 'booking.hold', targetId: bk.id, ok: true });
      return bk;
    },

    /* Bật/tắt đánh dấu "đang giữ bàn" cho một booking đã có. */
    setHeld(id, held) {
      const list = this.getAll();
      const i = list.findIndex(b => b.id === id);
      if (i === -1) return null;
      if (!_policyAllow('booking.hold', { id, ownerId: list[i].userId })) return null;
      const current = list[i].status;
      if (held) {
        if (current !== 'confirmed') return null;
        list[i].status = 'held';
        list[i].held = true;
        list[i].heldAt = new Date().toISOString();
      } else {
        if (current !== 'held') return null;
        list[i].status = 'confirmed';
        list[i].held = false;
        list[i].heldAt = null;
      }
      if (!storeSet(STORAGE_KEYS.bookings, JSON.stringify(list))) return null;
      API.seats.syncFromBookings();
      _audit({ action: held ? 'booking.hold' : 'booking.unhold', targetId: id, ok: true });
      return list[i];
    },

    /* Thu cọc (staff) — chỉ ghi nhận, không xử lý thanh toán thật. */
    setDepositPaid(id, paid) {
      const list = this.getAll();
      const i = list.findIndex(b => b.id === id);
      if (i === -1) return null;
      if (!_policyAllow('booking.deposit', { id, ownerId: list[i].userId })) return null;
      list[i].depositPaid = !!paid;
      list[i].depositPaidAt = paid ? new Date().toISOString() : null;
      if (!storeSet(STORAGE_KEYS.bookings, JSON.stringify(list))) return null;
      _audit({ action: 'booking.deposit', targetId: id, ok: true, code: paid ? 'paid' : 'unpaid' });
      return list[i];
    },

    /* Xác nhận cọc qua trang thanh toán/QR — chỉ cần token, không cần đăng nhập.
       Chỉ booking đang held + đúng token mới được ghi nhận. */
    confirmDepositByToken(id, token) {
      const list = this.getAll();
      const i = list.findIndex(b => b.id === id);
      if (i === -1) return { ok: false, error: 'Không tìm thấy booking' };
      const bk = list[i];
      if (!bk.paymentToken || String(bk.paymentToken) !== String(token || '')) {
        return { ok: false, error: 'Mã thanh toán không hợp lệ' };
      }
      if (bk.status !== 'held') return { ok: false, error: 'Booking không còn ở trạng thái giữ bàn' };
      if (bk.depositPaid) return { ok: true, booking: bk };
      /* Nếu bàn đã bị người khác lấy (trường hợp hiếm), không đánh dấu thành công. */
      const seat = API.seats.getById(bk.seatId);
      if (seat && seat.status !== 'held' && seat.status !== 'booked') {
        return { ok: false, error: 'Bàn đã được người khác giữ. Vui lòng chọn bàn khác.' };
      }
      bk.depositPaid = true;
      bk.depositPaidAt = new Date().toISOString();
      bk.paymentPending = false;
      bk.paymentMethod = 'bank_transfer';
      bk.paidAt = new Date().toISOString();
      if (!storeSet(STORAGE_KEYS.bookings, JSON.stringify(list))) {
        return { ok: false, error: 'Không lưu được thanh toán — bộ nhớ đầy' };
      }
      API.seats.syncFromBookings();
      _audit({ action: 'booking.deposit', targetId: id, ok: true, code: 'qr_transfer' });
      return { ok: true, booking: bk };
    },

    /* Automation: nhả một booking held đã quá hạn. Chỉ dùng cho rule nội bộ,
       không thay thế cancel() của người dùng. */
    autoReleaseHeld(id) {
      const list = this.getAll();
      const i = list.findIndex(b => b.id === id);
      if (i === -1 || list[i].status !== 'held') return null;
      const snapshot = { ...list[i] };
      list[i].status = 'cancelled';
      list[i].cancelledAt = new Date().toISOString();
      list[i].cancelledBy = 'automation:held_expired';
      if (!storeSet(STORAGE_KEYS.bookings, JSON.stringify(list))) return null;
      API.seats.release(list[i].seatId);
      API.seats.syncFromBookings();
      _audit({ action: 'booking.auto_release', targetId: id, ok: true, code: 'held_expired' });
      return snapshot;
    },

    /* Automation undo: đưa booking vừa bị auto-release về held. */
    autoRestoreHeld(id) {
      const list = this.getAll();
      const i = list.findIndex(b => b.id === id);
      if (i === -1 || list[i].status !== 'cancelled') return null;
      if (list[i].cancelledBy !== 'automation:held_expired') return null;
      const seat = API.seats.getById(list[i].seatId);
      if (!seat || seat.status !== 'available') return null;
      list[i].status = 'held';
      list[i].held = true;
      list[i].heldAt = new Date().toISOString();
      list[i].cancelledAt = null;
      list[i].cancelledBy = null;
      if (!storeSet(STORAGE_KEYS.bookings, JSON.stringify(list))) return null;
      API.seats.book(list[i].seatId);
      API.seats.syncFromBookings();
      _audit({ action: 'booking.auto_restore', targetId: id, ok: true, code: 'undo' });
      return list[i];
    },

    cancel(id) {
      const list = this.getAll();
      const i = list.findIndex(b => b.id === id);
      if (i === -1) return null;
      if (!_policyAllow('booking.cancel', { id, ownerId: list[i].userId })) return null;
      list[i].status = 'cancelled';
      if (!storeSet(STORAGE_KEYS.bookings, JSON.stringify(list))) return null; // ⚡ HARDENING: ghi fail → giữ ghế, báo lỗi

      API.seats.release(list[i].seatId);
      API.seats.syncFromBookings();
      _audit({ action: 'booking.cancel', targetId: id, ok: true });

      return list[i];
    },

    complete(id) {
      const list = this.getAll();
      const i = list.findIndex(b => b.id === id);
      if (i === -1) return null;
      if (!_policyAllow('booking.complete', { id, ownerId: list[i].userId })) return null;
      list[i].status = 'completed';
      if (!storeSet(STORAGE_KEYS.bookings, JSON.stringify(list))) return null; // ⚡ HARDENING: ghi fail → giữ ghế, báo lỗi

      API.seats.release(list[i].seatId);
      API.seats.syncFromBookings();
      _audit({ action: 'booking.complete', targetId: id, ok: true });

      return list[i];
    },

    /* Khách không đến: nhả bàn + tăng noShowCount của khách (chỉ nhân viên). */
    markNoShow(id) {
      const list = this.getAll();
      const i = list.findIndex(b => b.id === id);
      if (i === -1) return null;
      if (list[i].status !== 'confirmed') return null;
      if (!_policyAllow('booking.noShow', { id, ownerId: list[i].userId })) return null;

      list[i].status = 'no_show';
      list[i].noShowAt = new Date().toISOString();
      if (!storeSet(STORAGE_KEYS.bookings, JSON.stringify(list))) return null;

      API.seats.release(list[i].seatId);
      API.seats.syncFromBookings();

      const user = API.users.getById(list[i].userId);
      if (user) API.users.update(user.id, { noShowCount: (Number(user.noShowCount) || 0) + 1 });

      _audit({ action: 'booking.no_show', targetId: id, ok: true });
      return list[i];
    },

    /* Khách đã đến: chuyển booking sang 'seated' — bàn vẫn bị chiếm. */
    checkIn(id) {
      const list = this.getAll();
      const i = list.findIndex(b => b.id === id);
      if (i === -1) return null;
      if (list[i].status !== 'confirmed' && list[i].status !== 'held') return null;
      if (!_policyAllow('booking.checkIn', { id, ownerId: list[i].userId })) return null;

      list[i].status = 'seated';
      list[i].held = false;
      list[i].heldAt = null;
      list[i].checkedInAt = new Date().toISOString();
      if (!storeSet(STORAGE_KEYS.bookings, JSON.stringify(list))) return null;

      API.seats.syncFromBookings();
      _audit({ action: 'booking.check_in', targetId: id, ok: true });
      return list[i];
    },

    /* Khách vãng lai: nhân viên xếp bàn ngay, không cần tài khoản/đặt trước. */
    createWalkIn(data) {
      data = data || {};
      if (!_policyAllow('booking.walkIn', null)) return _setLastError('Chỉ nhân viên mới xếp được khách vãng lai');

      const seat = API.seats.getById(data.seatId);
      if (!seat) return _setLastError('Bàn ' + data.seatId + ' không tồn tại');
      if (seat.status !== 'available') return _setLastError('Bàn ' + data.seatId + ' đã có người');

      const guests = Number(data.guests) || 1;
      if (!Number.isInteger(guests) || guests < 1) return _setLastError('Số khách không hợp lệ');
      if (Number(seat.capacity) > 0 && guests > Number(seat.capacity)) {
        return _setLastError('Bàn ' + seat.id + ' chỉ chứa tối đa ' + seat.capacity + ' khách');
      }

      const now = new Date();
      const p = n => String(n).padStart(2, '0');
      const list = this.getAll();
      const bk = {
        id: 'WK' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
        userId: null,
        seatId: seat.id,
        floorId: seat.floorId,
        date: API.utils.today(),
        time: p(now.getHours()) + ':' + p(now.getMinutes()),
        guests,
        note: data.note || '',
        customerName: String(data.customerName || 'Khách vãng lai').trim() || 'Khách vãng lai',
        phone: String(data.phone || '').trim(),
        walkIn: true,
        status: 'seated',
        checkedInAt: now.toISOString(),
        createdBy: 'staff',
        deposit: 0,
        depositPaid: false,
        createdAt: now.toISOString()
      };
      list.push(bk);
      if (!storeSet(STORAGE_KEYS.bookings, JSON.stringify(list))) return _setLastError('Không lưu được lượt khách — bộ nhớ đầy');

      API.seats.book(seat.id);
      API.seats.syncFromBookings();
      _audit({ action: 'booking.walk_in', targetId: bk.id, ok: true });
      return bk;
    },

        /* ⚡ THÊM MỚI: Cập nhật booking (Fix lỗi bypass Realtime) */
    update(id, patch) {
      const list = this.getAll();
      const i = list.findIndex(b => b.id === id);
      if (i === -1) return null;
      if (!_policyAllow('booking.update', { id, ownerId: list[i].userId })) return null;

      const old = { ...list[i] };

      /* Đổi bàn: bàn mới phải tồn tại và còn trống (trước đây book mù). */
      if (patch.seatId && patch.seatId !== old.seatId) {
        const nextSeat = API.seats.getById(patch.seatId);
        if (!nextSeat) return _setLastError('Bàn ' + patch.seatId + ' không tồn tại');
        if (nextSeat.status !== 'available') return _setLastError('Bàn ' + patch.seatId + ' đã có người đặt');
      }
      /* Đổi ngày/giờ/số khách: chạy lại luật (bỏ qua giới hạn "3 chỗ" vì chỉ sửa). */
      if (typeof BookingRules !== 'undefined' && (patch.date || patch.time || patch.guests || patch.seatId)) {
        const seat = API.seats.getById(patch.seatId || old.seatId);
        const chk = BookingRules.validate({
          date: patch.date || old.date,
          time: patch.time || old.time,
          guests: patch.guests || old.guests,
          seat: seat && seat.status === 'available'
            ? seat
            : { ...(seat || {}), status: 'available' },   // sửa trên bàn hiện tại → coi như trống
          now: new Date(),
          activeCount: 0
        });
        if (!chk.ok) return _setLastError(chk.error);
      }

      list[i] = { ...old, ...patch, updatedAt: new Date().toISOString() };
      if (!storeSet(STORAGE_KEYS.bookings, JSON.stringify(list))) return null; // ⚡ HARDENING: ghi fail → không đụng ghế

      // Đổi bàn → release ghế cũ, book ghế mới (chỉ khi ghi thành công)
      if (patch.seatId && patch.seatId !== old.seatId) {
        API.seats.release(old.seatId);
        API.seats.book(patch.seatId);
      }

      API.seats.syncFromBookings();
      _audit({ action: 'booking.update', targetId: id, ok: true });

      return list[i];
    },
  },

  /* ---------- ORDERS ---------- */
  orders: {
    getAll() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.orders) || '[]');
      } catch {
        return [];
      }
    },

    getById(id) {
      return this.getAll().find(o => o.id === id) || null;
    },

    getByUser(uid) {
      return this.getAll().filter(o => o.userId === uid);
    },

    /* Đơn đang xử lý = chưa hoàn tất VÀ chưa bị hủy */
    isActive(o) { return o.step < 4 && o.status !== 'cancelled'; },
    getActive() { return this.getAll().filter(o => this.isActive(o)); },

    update(id, patch) {
      const list = this.getAll();
      const i = list.findIndex(o => o.id === id);
      if (i === -1) return null;
      list[i] = { ...list[i], ...patch };
      storeSet(STORAGE_KEYS.orders, JSON.stringify(list));
      const cur = this.getCurrent();
      if (cur && cur.id === id) this.setCurrent(list[i]);
      return list[i];
    },

    cancel(id) {
      const o = this.getById(id);
      if (!o || o.status === 'cancelled') return null;
      if (!_policyAllow('order.cancel', { id: o.id, ownerId: o.userId })) return null;
      const res = this.update(id, { status: 'cancelled', cancelledAt: new Date().toISOString() });
      if (res && o.inventoryDeducted && typeof API.ingredients !== 'undefined') {
        API.ingredients.restoreOrder(id);
        this.update(id, { inventoryDeducted: false, inventoryRestoredAt: new Date().toISOString() });
      }
      _audit({ action: 'order.cancel', targetId: id, ok: true });
      return res;
    },

    getCurrent() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.currentOrder) || 'null');
      } catch {
        return null;
      }
    },

    setCurrent(o) {
      if (o) {
        storeSet(STORAGE_KEYS.currentOrder, JSON.stringify(o));
      } else {
        localStorage.removeItem(STORAGE_KEYS.currentOrder);
      }
    },

    /* Báo giá trước khi đặt: giá lấy từ catalog, không tin số client gửi lên.
       Trả { ok, lines, subtotal, shipping, discount, total } hoặc { ok:false, error }. */
    preview(data) {
      data = data || {};
      if (typeof Pricing === 'undefined') {
        return { ok: false, error: 'Chưa nạp được bộ tính giá (js/core.js)' };
      }
      const promoCode = String(data.promoCode || '').trim().toUpperCase();
      try {
        return Pricing.quote({
          items: data.items,
          promoCode,
          userId: data.userId || _userId(),
          menu: API.menu.getAll(),
          combos: (typeof KB !== 'undefined' && Array.isArray(KB.combos)) ? KB.combos : [],
          evaluatePromo: (code, subtotal, shipping, userId) =>
            API.promotions.evaluate(code, subtotal, shipping, userId)
        });
      } catch (e) {
        return { ok: false, error: e.message || 'Không tính được giá đơn hàng' };
      }
    },

    _nextKdsCode(list) {
      const src = Array.isArray(list) ? list : this.getAll();
      const used = new Set(src.map(o => o && o.kitchenCode).filter(Boolean));
      let n = 1;
      let code = '';
      do {
        code = 'A' + String(n).padStart(2, '0');
        n++;
      } while (used.has(code));
      return code;
    },

    create(data) {
      data = data || {};
      const quote = this.preview(data);
      if (!quote.ok) return _setLastError(quote.error);

      const ownerId = data.userId || _userId();
      if (!_policyAllow('order.create', { ownerId })) {
        return _setLastError('Bạn không có quyền tạo đơn cho tài khoản khác');
      }

      const serviceType = ['dine_in', 'takeaway', 'delivery'].includes(data.serviceType)
        ? data.serviceType : 'delivery';
      const source = data.source || (serviceType === 'dine_in' ? 'counter_pos' : 'web');
      let tableId = data.tableId ? String(data.tableId).toUpperCase() : null;
      let tableSessionId = data.tableSessionId || null;
      if (serviceType === 'dine_in' && tableId && !tableSessionId && typeof API.tableSessions !== 'undefined') {
        const joined = API.tableSessions.join(tableId);
        if (joined && joined.ok) tableSessionId = joined.session.id;
      }
      const paymentMethod = data.paymentMethod || 'pay_later';
      const paymentStatus = data.paymentStatus || (
        paymentMethod === 'pay_later' ? 'pay_later_open' : (data.paid ? 'paid' : 'unpaid')
      );

      const list = this.getAll();
      const shipping = (serviceType === 'dine_in' || serviceType === 'takeaway') ? 0 : quote.shipping;
      const total = (serviceType === 'dine_in' || serviceType === 'takeaway')
        ? Math.max(0, quote.subtotal - quote.discount)
        : quote.total;
      const o = {
        id: 'OD' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        userId: ownerId,
        serviceType,
        source,
        tableId,
        tableSessionId,
        items: quote.lines,
        total,
        subtotal: quote.subtotal,
        shipping,
        discount: quote.discount,
        promoCode: quote.promoCode || '',
        address: data.address || '',
        phone: data.phone || '',
        note: data.note || '',
        customerName: data.customerName || '',
        status: 'pending',
        step: 0,
        kitchenStatus: 'submitted',
        kitchenCode: this._nextKdsCode(),
        paymentMethod,
        paymentStatus,
        createdAt: new Date().toISOString()
      };
      // ⚡ Trừ kho tại thời điểm bán/đặt: một ly matcha cuối cùng sẽ làm món hết ngay.
      const inv = (typeof API.ingredients !== 'undefined')
        ? API.ingredients.deductOrder(o.id, quote.lines)
        : { ok: true, lines: [] };
      if (!inv.ok) return _setLastError(inv.error || 'Không đủ nguyên liệu');
      o.inventoryDeducted = Array.isArray(inv.lines) && inv.lines.length > 0;
      list.push(o);
      if (!storeSet(STORAGE_KEYS.orders, JSON.stringify(list))) {
        if (o.inventoryDeducted) API.ingredients.restoreOrder(o.id);
        return _setLastError('Không lưu được đơn hàng — bộ nhớ đầy hoặc bị chặn');
      }
      this.setCurrent(o);
      _audit({ action: 'order.create', targetId: o.id, ok: true });
      return o;
    },

    /* KDS: chỉ cập nhật trạng thái bếp, không phá vỡ status/step của luồng giao hàng. */
    updateKitchen(id, kitchenStatus) {
      const allowed = ['submitted', 'preparing', 'ready', 'served', 'cancelled'];
      if (!allowed.includes(kitchenStatus)) return null;
      const o = this.getById(id);
      if (!o) return null;
      if (!_policyAllow('order.step', { id: o.id, ownerId: o.userId })) return null;
      const now = new Date().toISOString();
      const patch = { kitchenStatus, kitchenUpdatedAt: now };
      if (kitchenStatus === 'preparing') { patch.step = Math.max(1, Number(o.step) || 0); patch.status = 'preparing'; }
      if (kitchenStatus === 'ready') { patch.step = Math.max(2, Number(o.step) || 0); patch.status = 'preparing'; }
      if (kitchenStatus === 'served') { patch.step = Math.max(3, Number(o.step) || 0); patch.status = 'delivering'; }
      if (kitchenStatus === 'cancelled') { patch.status = 'cancelled'; patch.cancelledAt = now; }
      return this.update(id, patch);
    },

    getKdsQueue() {
      const now = Date.now();
      const list = this.getAll();
      // Backfill mã A.. cho order cũ / order tạo trước khi có KDS code.
      let changed = false;
      const used = new Set(list.map(o => o && o.kitchenCode).filter(Boolean));
      let seq = 1;
      const nextCode = () => {
        let code = '';
        do {
          code = 'A' + String(seq).padStart(2, '0');
          seq++;
        } while (used.has(code));
        used.add(code);
        return code;
      };
      list.forEach(o => {
        if (!o) return;
        if (o.kitchenCode && /^A\d{2,}$/.test(String(o.kitchenCode))) return;
        if (o.status === 'cancelled') return;
        const ks = o.kitchenStatus || 'submitted';
        if (ks === 'served' || ks === 'completed') return;
        o.kitchenCode = nextCode();
        changed = true;
      });
      if (changed) storeSet(STORAGE_KEYS.orders, JSON.stringify(list));
      return list
        .filter(o => o && o.status !== 'cancelled' &&
          !['served', 'cancelled'].includes(o.kitchenStatus) &&
          (o.kitchenStatus || 'submitted') !== 'completed')
        .map(o => {
          const age = Math.max(0, (now - new Date(o.createdAt || 0).getTime()) / 60000);
          const base = o.serviceType === 'delivery' ? 30 : o.serviceType === 'takeaway' ? 20 : 10;
          return { ...o, ageMinutes: Math.round(age), priorityScore: base + age };
        })
        .sort((a, b) => b.priorityScore - a.priorityScore);
    },

    getByTableSession(sessionId) {
      return this.getAll().filter(o => o.tableSessionId === sessionId && o.status !== 'cancelled');
    },

    /* Ghi bước đơn — dùng nội bộ, KHÔNG kiểm quyền (caller đã kiểm). */
    _applyStep(id, step, auditAction, code) {
      const list = this.getAll();
      const i = list.findIndex(o => o.id === id);
      if (i === -1) return null;
      if (list[i].status === 'cancelled') return list[i];

      list[i].step = step;
      const map = ['pending', 'preparing', 'delivering', 'delivering', 'completed'];
      list[i].status = map[step] || 'pending';
      if (step >= 4) list[i].completedAt = new Date().toISOString();

      if (!storeSet(STORAGE_KEYS.orders, JSON.stringify(list))) return null;
      _audit({ action: auditAction, targetId: id, ok: true, code: code || ('step=' + step) });

      const cur = this.getCurrent();
      if (cur && cur.id === id) this.setCurrent(list[i]);

      return list[i];
    },

    updateStep(id, step) {
      const o = this.getById(id);
      if (!o) return null;
      if (o.status === 'cancelled') return o;   // đơn đã hủy không đổi bước nữa
      if (!_policyAllow('order.step', { id, ownerId: o.userId })) return null;
      return this._applyStep(id, step, 'order.step');
    },

    /* ⚡ Mô phỏng tiến trình đơn cho trang Theo dõi (demo):
       khách được tự chạy tiến trình cho đơn CỦA MÌNH, nhưng không được
       nhảy cóc / sửa đơn người khác / bỏ qua bước. */
    advanceDemo(id) {
      const o = this.getById(id);
      if (!o) return null;
      if (!_isDemo()) return null;
      if (o.status === 'cancelled' || o.status === 'completed' || o.step >= 3) return null;
      if (!_policyAllow('order.demoStep', { id: o.id, ownerId: o.userId })) return null;
      return this._applyStep(o.id, Math.min(Number(o.step) + 1, 3), 'order.demoStep', 'demo');
    },

    remove(id) {
      const list = this.getAll();
      const i = list.findIndex(o => o.id === id);
      if (i === -1) return false;

      list.splice(i, 1);
      storeSet(STORAGE_KEYS.orders, JSON.stringify(list));

      const cur = this.getCurrent();
      if (cur && cur.id === id) this.setCurrent(null);

      return true;
    },

    clearAll() {
      localStorage.removeItem(STORAGE_KEYS.orders);
      this.setCurrent(null);
    },

    clearOld(days = 1) {
      const list = this.getAll();
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

      const filtered = list.filter(o => {
        const created = new Date(o.createdAt).getTime();
        return created > cutoff;
      });

      const removed = list.length - filtered.length;
      if (removed > 0) {
        storeSet(STORAGE_KEYS.orders, JSON.stringify(filtered));
      }

      return removed;
    }
  },

  /* ---------- CART ---------- */
  cart: {
    _getKey() {
      const user = API.users.getCurrent();
      if (user && user.id) {
        return `cappan_cart_${user.id}`;
      }
      return 'cappan_cart_guest';
    },

    _getUserId() {
      const user = API.users.getCurrent();
      return user ? user.id : null;
    },

    get() {
      try {
        const key = this._getKey();
        return JSON.parse(localStorage.getItem(key) || '[]');
      } catch { return []; }
    },

        set(items) {
      const key = this._getKey();
      try {
        storeSet(key, JSON.stringify(items));
      } catch (e) {
        console.warn('[API.cart] Bộ nhớ LocalStorage đầy hoặc bị khóa:', e);
        // Có thể xóa bớt cache AI cũ để giải phóng dung lượng
        try { localStorage.removeItem('cappan_ai_cache'); } catch(err) {}
        try { localStorage.removeItem('cappan_ai_metrics'); } catch(err) {}
        // Thử lưu lại lần 2
        storeSet(key, JSON.stringify(items));
      }
    },

    add(item) {
      const menuItem = item && item.itemId ? API.menu.getById(item.itemId) : null;
      if (menuItem && menuItem.inStock === false) return null; // rule: món hết hàng không cho đặt
      const cart = this.get();
      const qty = Math.max(1, Math.min(99, Number(item && item.qty) || 1));
      const ex = cart.find(i => i.itemId === item.itemId && i.size === item.size);
      if (ex) ex.qty = Math.min(99, ex.qty + qty);
      else cart.push({ ...item, qty });
      this.set(cart);
      return cart;
    },

    remove(itemId, size) {
      const cart = this.get().filter(i => !(i.itemId === itemId && i.size === size));
      this.set(cart);
      return cart;
    },

    clear() {
      const key = this._getKey();
      localStorage.removeItem(key);
    },

    mergeGuestToUser(userId) {
      try {
        const guestKey = 'cappan_cart_guest';
        const userKey = `cappan_cart_${userId}`;

        const guestCart = JSON.parse(localStorage.getItem(guestKey) || '[]');
        if (guestCart.length === 0) return;

        const userCart = JSON.parse(localStorage.getItem(userKey) || '[]');

        guestCart.forEach(gItem => {
          const ex = userCart.find(uItem =>
            uItem.itemId === gItem.itemId && uItem.size === gItem.size
          );
          if (ex) ex.qty += gItem.qty;
          else userCart.push(gItem);
        });

        storeSet(userKey, JSON.stringify(userCart));
        localStorage.removeItem(guestKey);
      } catch (e) {
        console.warn('Lỗi merge cart:', e);
      }
    },

    getByUserId(userId) {
      try {
        const key = `cappan_cart_${userId}`;
        return JSON.parse(localStorage.getItem(key) || '[]');
      } catch { return []; }
    },

    clearByUserId(userId) {
      localStorage.removeItem(`cappan_cart_${userId}`);
    }
  },

      /* ---------- STAFF ---------- */
  staff: {
    _getStateKey() { return 'cappan_staff_list'; },
    _getCustomStaff() { try { return JSON.parse(localStorage.getItem(this._getStateKey()) || '[]'); } catch { return []; } },
    _setCustomStaff(list) { storeSet(this._getStateKey(), JSON.stringify(list)); },
    
    getAll() {
      let custom = this._getCustomStaff();
      const staffUsers = API.users.getAll().filter(u => u.role === 'staff');
      let changed = false;

      // Đồng bộ user role staff vào list (Không dùng đệ quy gọi lại getAll)
      staffUsers.forEach(u => {
        if (!custom.find(s => s.userId === u.id) && !SEED_STAFF.find(s => s.phone === u.phone)) {
          const allExisting = [...SEED_STAFF, ...custom];
          const maxId = allExisting.reduce((max, s) => {
            const num = parseInt((s.id || '').replace('S', ''), 10);
            return isNaN(num) ? max : Math.max(max, num);
          }, 0);
          
          custom.push({
            id: 'S' + String(maxId + 1).padStart(3, '0'),
            userId: u.id,
            name: u.name || 'Nhân viên mới',
            role: 'Nhân viên',
            phone: u.phone || '',
            avatar: (u.name || 'N').trim().charAt(0).toUpperCase(),
            joinedAt: new Date().toISOString(),
            isNew: true
          });
          changed = true;
        }
      });

      if (changed) this._setCustomStaff(custom);
      return [...SEED_STAFF, ...custom];
    },
    
    getById(id) { return this.getAll().find(s => s.id === id) || null; },
    
    addFromUser(user) {
      if (!user || user.role !== 'staff') return null;
      const custom = this._getCustomStaff();
      if (custom.find(s => s.userId === user.id) || SEED_STAFF.find(s => s.phone === user.phone)) return null;

      // Không dùng this.getAll() ở đây để tránh đệ quy
      const allExisting = [...SEED_STAFF, ...custom];
      const maxId = allExisting.reduce((max, s) => {
        const num = parseInt((s.id || '').replace('S', ''), 10);
        return isNaN(num) ? max : Math.max(max, num);
      }, 0);
      const newId = 'S' + String(maxId + 1).padStart(3, '0');

      const newStaff = {
        id: newId,
        userId: user.id,
        name: user.name || 'Nhân viên mới',
        role: 'Nhân viên',
        phone: user.phone || '',
        avatar: (user.name || 'N').trim().charAt(0).toUpperCase(),
        joinedAt: new Date().toISOString(),
        isNew: true
      };
      
      custom.push(newStaff);
      this._setCustomStaff(custom);
      return newStaff;
    },
    
    removeCustom(staffId) { 
      const custom = this._getCustomStaff().filter(s => s.id !== staffId); 
      this._setCustomStaff(custom); 
      return true; 
    },
    
    resetCustom() { localStorage.removeItem(this._getStateKey()); }
  },

  /* ---------- SHIFTS (ĐÃ DỌN DẸP TRÙNG LẶP) ---------- */
  shifts: {
    getAll() {
      return SEED_SHIFTS;
    },
    getById(id) {
      return SEED_SHIFTS.find(s => s.id === id) || null;
    },

    getSchedule() {
      try {
        return JSON.parse(localStorage.getItem('cappan_schedule') || '{}');
      } catch { return {}; }
    },

    setSchedule(schedule) {
      storeSet('cappan_schedule', JSON.stringify(schedule));
    },

    getStaffInShift(date, shiftId) {
      const schedule = this.getSchedule();
      return (schedule[date] && schedule[date][shiftId]) || [];
    },

    addStaffToShift(date, shiftId, staffId) {
  // ⚡ P2-6: Chặn xếp 2+ ca/ngày cho cùng 1 nhân viên
  const busyShift = this.isStaffBusy(date, staffId);
  if (busyShift && busyShift !== shiftId) {
    console.warn(`[shifts] ${staffId} đã có ca ${busyShift} ngày ${date}`);
    return false;
  }

  const schedule = this.getSchedule();
  if (!schedule[date]) schedule[date] = {};
  if (!schedule[date][shiftId]) schedule[date][shiftId] = [];

  if (schedule[date][shiftId].includes(staffId)) return false;

  schedule[date][shiftId].push(staffId);
  this.setSchedule(schedule);
  return true;
},

    /* Chỉ giữ lại DUY NHẤT 1 hàm isStaffBusy sạch sẽ ở đây */
    isStaffBusy(date, staffId) {
      const schedule = this.getSchedule();
      if (!schedule[date]) return null;
      for (const shiftId of Object.keys(schedule[date])) {
        if (schedule[date][shiftId].includes(staffId)) {
          return shiftId;
        }
      }
      return null;
    },

    removeStaffFromShift(date, shiftId, staffId) {
      const schedule = this.getSchedule();
      if (!schedule[date] || !schedule[date][shiftId]) return false;
      const idx = schedule[date][shiftId].indexOf(staffId);
      if (idx === -1) return false;
      schedule[date][shiftId].splice(idx, 1);
      this.setSchedule(schedule);
      return true;
    },

    clearAll() {
      localStorage.removeItem('cappan_schedule');
    }
  },

  /* ---------- STATS ---------- */
  stats: {
        revenueInRange(fromTs, toTs) {
      const all = API.orders.getAll().filter(o => {
        const t = new Date(o.createdAt).getTime();
        return t >= fromTs && t <= toTs && o.status !== 'cancelled';
      });

      // ⚡ FIX: Chỉ tính doanh thu từ đơn đã hoàn tất (step >= 4)
      const completed = all.filter(o => o.step >= 4);

      return {
        total: completed.reduce((s, o) => s + o.total, 0),
        count: all.length,
        completedCount: completed.length,
        pendingCount: all.length - completed.length, // ⚡ Bổ sung dòng này
        orders: all
      };
    },

    today() {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      return this.revenueInRange(start.getTime(), Date.now());
    },

    thisWeek() {
      const now = new Date();
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(now.setDate(diff));
      monday.setHours(0, 0, 0, 0);
      return this.revenueInRange(monday.getTime(), Date.now());
    },

    thisMonth() {
      const d = new Date();
      const start = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
      return this.revenueInRange(start, Date.now());
    },

    last7Days() {
      return this.lastNDays(7);
    },

    /* N ngày gần nhất (gồm hôm nay) — dùng chung cho chart. */
    lastNDays(n) {
      const days = [];
      const count = Math.max(1, Math.min(90, Number(n) || 7));
      for (let i = count - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        d.setHours(0, 0, 0, 0);
        const start = d.getTime();
        const end = start + 24 * 60 * 60 * 1000 - 1;
        const r = this.revenueInRange(start, end);
        const p = n => String(n).padStart(2, '0');
        days.push({
          date: `${d.getDate()}/${d.getMonth() + 1}`,
          iso: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`,
          revenue: r.total,
          count: r.completedCount,
          orders: r.count
        });
      }
      return days;
    },

    /* Chuỗi doanh thu theo từng ngày trong khoảng (tối đa 90 ngày). */
    dailySeries(fromTs, toTs) {
      const days = [];
      const d = new Date(Number(fromTs));
      d.setHours(0, 0, 0, 0);
      const end = new Date(Number(toTs));
      const p = n => String(n).padStart(2, '0');
      while (d.getTime() <= end.getTime() && days.length < 90) {
        const start = d.getTime();
        const endDay = start + 24 * 60 * 60 * 1000 - 1;
        const r = this.revenueInRange(start, endDay);
        days.push({
          date: `${d.getDate()}/${d.getMonth() + 1}`,
          iso: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`,
          revenue: r.total,
          count: r.completedCount,
          orders: r.count
        });
        d.setDate(d.getDate() + 1);
      }
      return days;
    },

    /* Chuỗi doanh thu theo từng tháng (dùng cho báo cáo năm). */
    monthlySeries(fromTs, toTs) {
      const months = [];
      const d = new Date(Number(fromTs));
      d.setDate(1); d.setHours(0, 0, 0, 0);
      const end = new Date(Number(toTs));
      while (d.getTime() <= end.getTime() && months.length < 24) {
        const start = d.getTime();
        const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
        const endMonth = next.getTime() - 1;
        const r = this.revenueInRange(start, endMonth);
        months.push({
          date: `T${d.getMonth() + 1}`,
          iso: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
          revenue: r.total,
          count: r.completedCount,
          orders: r.count
        });
        d.setMonth(d.getMonth() + 1);
      }
      return months;
    },

    /* Khoảng thời gian theo preset: today | week | 7d | 30d | month | year */
    preset(period) {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      let from;
      let label;
      if (period === 'week') {
        const day = startOfToday.getDay();
        from = new Date(startOfToday);
        from.setDate(from.getDate() - ((day + 6) % 7));
        label = 'Tuần này';
      } else if (period === '7d') {
        from = new Date(startOfToday); from.setDate(from.getDate() - 6); label = '7 ngày gần nhất';
      } else if (period === '30d') {
        from = new Date(startOfToday); from.setDate(from.getDate() - 29); label = '30 ngày gần nhất';
      } else if (period === 'month') {
        from = new Date(now.getFullYear(), now.getMonth(), 1); label = 'Tháng này';
      } else if (period === 'year') {
        from = new Date(now.getFullYear(), 0, 1); label = 'Năm nay';
      } else {
        from = startOfToday; label = 'Hôm nay';
      }
      return { key: period || 'today', label, from: from.getTime(), to: Date.now() };
    },

    /* Kỳ trước cùng độ dài (để tính % tăng/giảm). */
    previousPreset(period) {
      const cur = this.preset(period);
      if ((period || 'today') === 'today') {
        const day = 24 * 60 * 60 * 1000;
        return { from: cur.from - day, to: cur.to - day };
      }
      const span = cur.to - cur.from;
      return { from: cur.from - span - 1, to: cur.from - 1 };
    },

    /* Thống kê đầy đủ trong 1 khoảng: doanh thu, đơn, kênh, thanh toán, AOV. */
    range(fromTs, toTs) {
      const from = Number(fromTs);
      const to = Number(toTs);
      const all = API.orders.getAll().filter(o => {
        const t = new Date(o.createdAt).getTime();
        return t >= from && t <= to;
      });
      const active = all.filter(o => o.status !== 'cancelled');
      const completed = active.filter(o => Number(o.step) >= 4);
      const revenue = completed.reduce((s, o) => s + (Number(o.total) || 0), 0);
      const byChannel = { delivery: 0, pos: 0 };
      const byPayment = { cash: 0, transfer: 0, card: 0, none: 0 };
      completed.forEach(o => {
        const amount = Number(o.total) || 0;
        byChannel[o.channel === 'pos' ? 'pos' : 'delivery'] += amount;
        const method = byPayment[o.paymentMethod] !== undefined ? o.paymentMethod : 'none';
        byPayment[method] += amount;
      });
      return {
        from, to,
        orders: active,
        revenue,
        count: active.length,
        completedCount: completed.length,
        cancelledCount: all.length - active.length,
        aov: completed.length ? Math.round(revenue / completed.length) : 0,
        byChannel,
        byPayment
      };
    },

    /* So sánh kỳ hiện tại với kỳ trước. */
    trend(period) {
      const cur = this.range(this.preset(period).from, this.preset(period).to);
      const prevRange = this.previousPreset(period);
      const prev = this.range(prevRange.from, prevRange.to);
      const delta = cur.revenue - prev.revenue;
      const pct = prev.revenue > 0 ? Math.round((delta / prev.revenue) * 100) : (cur.revenue > 0 ? 100 : 0);
      return { current: cur, previous: prev, delta, pct };
    },

    topItemsInRange(fromTs, toTs, limit = 5) {
      const map = {};
      API.orders.getAll().forEach(o => {
        const t = new Date(o.createdAt).getTime();
        if (t < fromTs || t > toTs || o.status === 'cancelled' || Number(o.step) < 4) return;
        (Array.isArray(o.items) ? o.items : []).forEach(it => {
          if (!it || !it.name) return;
          if (!map[it.name]) map[it.name] = { name: it.name, qty: 0, revenue: 0 };
          map[it.name].qty += Number(it.qty) || 0;
          map[it.name].revenue += (Number(it.price) || 0) * (Number(it.qty) || 0);
        });
      });
      return Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, limit);
    },

    /* Tổng hợp booking + cọc cho trang thống kê. */
    bookingsSummary() {
      const list = API.bookings.getAll();
      const active = list.filter(b => ['confirmed', 'seated', 'held'].includes(b.status));
      const depositCollected = list
        .filter(b => b.depositPaid && Number(b.deposit) > 0 && b.status !== 'cancelled')
        .reduce((s, b) => s + (Number(b.deposit) || 0), 0);
      const depositPending = active
        .filter(b => !b.depositPaid && Number(b.deposit) > 0)
        .reduce((s, b) => s + (Number(b.deposit) || 0), 0);
      const occupancy = this.occupancyRate();
      return {
        total: list.length,
        active: active.length,
        confirmed: list.filter(b => b.status === 'confirmed').length,
        held: list.filter(b => b.status === 'held').length,
        seated: list.filter(b => b.status === 'seated').length,
        completed: list.filter(b => b.status === 'completed').length,
        cancelled: list.filter(b => b.status === 'cancelled').length,
        no_show: list.filter(b => b.status === 'no_show').length,
        walkIn: list.filter(b => b.walkIn).length,
        occupancy,
        depositCollected,
        depositPending
      };
    },

    depositsToday() {
      const today = API.utils.today();
      return API.bookings.getAll().filter(b => {
        if (!b.depositPaid || !b.depositPaidAt) return false;
        const d = new Date(b.depositPaidAt);
        const p = n => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` === today;
      }).reduce((s, b) => s + (Number(b.deposit) || 0), 0);
    },

    topItems(limit = 5) {
      const map = {};
      API.orders.getAll().forEach(o => {
        if (o.status === 'cancelled') return;
        (Array.isArray(o.items) ? o.items : []).forEach(it => {
          if (!it || !it.name) return;
          if (!map[it.name]) map[it.name] = { name: it.name, qty: 0, revenue: 0 };
          map[it.name].qty += Number(it.qty) || 0;
          map[it.name].revenue += (Number(it.price) || 0) * (Number(it.qty) || 0);
        });
      });
      return Object.values(map)
        .sort((a, b) => b.qty - a.qty)
        .slice(0, limit);
    },

    ordersByStatus() {
      const list = API.orders.getAll();
      return {
        pending:    list.filter(o => o.status !== 'cancelled' && o.step === 0).length,
        preparing:  list.filter(o => o.status !== 'cancelled' && o.step === 1).length,
        shipping:   list.filter(o => o.status !== 'cancelled' && (o.step === 2 || o.step === 3)).length,
        completed:  list.filter(o => o.status !== 'cancelled' && o.step >= 4).length,
        cancelled:  list.filter(o => o.status === 'cancelled').length
      };
    },

    bookingsByStatus() {
      const list = API.bookings.getAll();
      return {
        confirmed: list.filter(b => b.status === 'confirmed').length,
        held: list.filter(b => b.status === 'held').length,
        seated: list.filter(b => b.status === 'seated').length,
        completed: list.filter(b => b.status === 'completed').length,
        cancelled: list.filter(b => b.status === 'cancelled').length,
        no_show: list.filter(b => b.status === 'no_show').length
      };
    },

    occupancyRate() {
      const seats = API.seats.getAll();
      const busy = seats.filter(s => s.status === 'booked' || s.status === 'held').length;
      return seats.length ? Math.round((busy / seats.length) * 100) : 0;
    }
  },

  /* ---------- POS / THU NGÂN TẠI QUẦY ---------- */
  pos: {
    /* Báo giá tại quầy: không có phí giao hàng. */
    quote(data) {
      data = data || {};
      if (typeof Pricing === 'undefined') return { ok: false, error: 'Chưa nạp được bộ tính giá' };
      try {
        return Pricing.quote({
          items: data.items,
          promoCode: data.promoCode,
          userId: data.userId || _userId(),
          shipping: 0,
          menu: API.menu.getAll(),
          combos: (typeof KB !== 'undefined' && Array.isArray(KB.combos)) ? KB.combos : [],
          evaluatePromo: (code, subtotal, shipping, userId) =>
            API.promotions.evaluate(code, subtotal, 0, userId)
        });
      } catch (e) {
        return { ok: false, error: e.message || 'Không tính được hoá đơn' };
      }
    },

    createSale(data) {
      data = data || {};
      if (!_policyAllow('pos.sale.create', null)) throw new Error('Bạn không có quyền thu tiền');
      const quote = this.quote(data);
      if (!quote.ok) throw new Error(quote.error);

      const method = ['cash', 'transfer', 'card'].includes(data.paymentMethod) ? data.paymentMethod : 'cash';
      const cashReceived = method === 'cash' ? Number(data.cashReceived) : quote.total;
      if (method === 'cash' && (!Number.isFinite(cashReceived) || cashReceived < quote.total)) {
        throw new Error('Tiền khách đưa chưa đủ ' + API.utils.formatVND(quote.total));
      }

      const list = API.orders.getAll();
      const staff = API.users.getCurrent();
      const sale = {
        id: 'POS' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
        userId: data.customerId || null,
        serviceType: 'dine_in',
        source: 'counter_pos',
        tableId: data.tableId ? String(data.tableId).toUpperCase() : null,
        tableSessionId: data.tableSessionId || null,
        kitchenStatus: 'submitted',
        kitchenCode: API.orders._nextKdsCode(),
        paymentStatus: 'paid',
        channel: 'pos',
        items: quote.lines,
        subtotal: quote.subtotal,
        shipping: 0,
        discount: quote.discount,
        promoCode: quote.promoCode || '',
        total: quote.total,
        paymentMethod: method,
        cashReceived: method === 'cash' ? cashReceived : quote.total,
        change: method === 'cash' ? cashReceived - quote.total : 0,
        staffId: staff ? staff.id : null,
        status: 'completed',
        step: 4,
        note: data.note || '',
        createdAt: new Date().toISOString(),
        paidAt: new Date().toISOString()
      };
      // ⚡ POS cũng trừ kho ngay khi thu tiền.
      const inv = (typeof API.ingredients !== 'undefined')
        ? API.ingredients.deductOrder(sale.id, quote.lines)
        : { ok: true, lines: [] };
      if (!inv.ok) throw new Error(inv.error || 'Không đủ nguyên liệu');
      sale.inventoryDeducted = Array.isArray(inv.lines) && inv.lines.length > 0;
      list.push(sale);
      if (!storeSet(STORAGE_KEYS.orders, JSON.stringify(list))) {
        if (sale.inventoryDeducted) API.ingredients.restoreOrder(sale.id);
        throw new Error('Không lưu được hoá đơn — bộ nhớ đầy hoặc bị chặn');
      }
      _audit({ action: 'pos.sale', targetId: sale.id, ok: true, code: method });
      return sale;
    },

    summary(date) {
      const day = date || API.utils.today();
      const p = n => String(n).padStart(2, '0');
      const localDay = iso => {
        const d = new Date(iso);
        return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
      };
      const rows = API.orders.getAll().filter(o =>
        o.channel === 'pos' && o.status !== 'cancelled' &&
        o.createdAt && localDay(o.createdAt) === day
      );
      const byMethod = { cash: 0, transfer: 0, card: 0 };
      let revenue = 0;
      for (const r of rows) {
        revenue += Number(r.total) || 0;
        if (byMethod[r.paymentMethod] !== undefined) byMethod[r.paymentMethod] += Number(r.total) || 0;
      }
      return { date: day, count: rows.length, revenue, byMethod };
    }
  },

  /* ---------- AUDIT ---------- */
  audit: {
    getRecent(limit) {
      if (!_policyAllow('audit.read', null)) return [];
      if (typeof Audit === 'undefined') return [];
      return Audit.getRecent(limit);
    },
    log(entry) {
      if (typeof Audit === 'undefined') return null;
      return Audit.log(entry);
    },
    clear() {
      if (!_policyAllow('audit.read', null)) return false;
      if (typeof Audit === 'undefined') return false;
      Audit.clear();
      return true;
    }
  },

  /* ---------- UTILS ---------- */
  utils: {
    formatVND(n) { return n.toLocaleString('vi-VN') + 'đ'; },
    randomId(prefix='ID', len=4) { return prefix + Math.floor(Math.random() * Math.pow(10, len)); },
    now() { return new Date().toISOString(); },
    today() {
      const d = new Date();
      const p = n => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;   // giờ địa phương
    }
  }
};
/* ============================================================
   UPGRADE 11: Schema versioning + migration
============================================================ */
(function migrateSchema() {
  const SCHEMA_VERSION = 2;
  const KEY = 'cappan_schema_version';
  const current = parseInt(localStorage.getItem(KEY) || '0', 10);

  if (current === SCHEMA_VERSION) return;

  console.info(`[schema] Migrating from v${current} → v${SCHEMA_VERSION}`);

  try {
    // v1 → v2: đảm bảo orders có field subtotal/shipping/discount
    if (current < 2) {
      const orders = JSON.parse(localStorage.getItem(STORAGE_KEYS.orders) || '[]');
      let patched = 0;
      orders.forEach(o => {
        if (o.subtotal === undefined) { o.subtotal = o.total; patched++; }
        if (o.shipping === undefined) { o.shipping = 0; patched++; }
        if (o.discount === undefined) { o.discount = 0; patched++; }
      });
      if (patched > 0) {
        storeSet(STORAGE_KEYS.orders, JSON.stringify(orders));
        console.info(`[schema] Patched ${patched} fields in orders`);
      }
    }
    storeSet(KEY, String(SCHEMA_VERSION));
    console.info('[schema] Migration complete');
  } catch (e) {
    console.error('[schema] Migration failed:', e);
  }
})();
/* Seed demo users khi load */
API.users.seedDemo();
/* Nâng cấp tài khoản cũ còn lưu mật khẩu plaintext → salt + hash. */
try { API.users.migratePasswords(); } catch (e) { console.warn('[API] migratePasswords:', e); }
API.menu._syncSeed();
API.promotions._sync();

/* ?as=<sđt> — vào nhanh một vai ở bản demo (bị cắt ở bản prod).
   Chạy trước staff-guard.js nên mở thẳng trang nhân viên vẫn qua được. */
(function demoLoginFromParam() {
  try {
    if (typeof CappanConfig !== 'undefined' && CappanConfig.isProd()) return;
    var q = (typeof window !== 'undefined' && window.location && window.location.search) || '';
    if (!q || q.indexOf('as=') < 0) return;
    var as = '';
    if (typeof URLSearchParams !== 'undefined') as = new URLSearchParams(q).get('as') || '';
    else {
      var m = q.match(/[?&]as=([^&]+)/);
      as = m ? decodeURIComponent(m[1]) : '';
    }
    if (!as) return;
    var u = API.users.getByPhone(as);
    if (u) API.users.setCurrent(u);
  } catch (e) {}
})();

/* ⚡ FIX 4.3b: đồng bộ cache menu giữa các tab cùng trình duyệt
   - storage event KHÔNG fire trên tab gây ra thay đổi → tab gốc đã tự
     invalidate qua mutation method (markOutOfStock/add/update/remove)
   - storage event fire TRÊN tab khác → phải invalidate cache + thông báo UI
   - e.key === null xảy ra khi localStorage.clear() → vẫn phải invalidate
*/
window.addEventListener('storage', (e) => {
  // e.key === null → localStorage.clear() (xoá toàn bộ)
  // e.key bắt đầu cappan_menu_ → 1 trong 4 key menu bị thay đổi
  const isMenuChange = (e.key === null) ||
                       (e.key && e.key.startsWith('cappan_menu_'));
  // e.storageArea check: storage event cũng fire cho sessionStorage
  //   → sessionStorage của app không dùng prefix cappan_menu_ nên an toàn,
  //     nhưng check rõ ràng để tránh bug tương lai
  const isLocalStorage = !e.storageArea || e.storageArea === localStorage;

  if (isMenuChange && isLocalStorage) {
    API.menu._invalidate();
    // _epoch++ không cần vì _invalidate đã set _cache = null → chắc chắn miss.
    // Giữ để phòng thủ nếu sau này _invalidate đổi implementation:
    API.menu._epoch++;

    // ⚡ Optional: dispatch để page tự re-render (xem mục D)
    try {
      window.dispatchEvent(new CustomEvent('cappan:menu-changed', {
        detail: { key: e.key, newValue: e.newValue }
      }));
    } catch (err) { /* CustomEvent không hỗ trợ trên browser cũ */ }
  }
});