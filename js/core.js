/* ============================================================
   CAPPAN CORE — cấu hình, giá, luật đặt bàn, phân quyền, audit.
   Tệp này là mã "thuần" (không DOM, không render) để:
     - web và chat dùng CÙNG một luật;
     - test được bằng Node mà không cần trình duyệt.

   Nạp trước js/api/index.js. Không phụ thuộc API lúc nạp.
   ============================================================ */
(function (global) {
  'use strict';

  /* ----------------------------------------------------------
     1. CONFIG
     ---------------------------------------------------------- */
  var CappanConfig = {
    version: '4.2.0',
    mode: (global.CAPPAN_MODE === 'prod') ? 'prod' : 'demo',
    isDemo: function () { return this.mode !== 'prod'; },
    isProd: function () { return this.mode === 'prod'; }
  };

  /* ----------------------------------------------------------
     2. PRICING — giá luôn tính lại từ catalog, không tin client
     ---------------------------------------------------------- */
  var Pricing = {
    SHIPPING_FEE: 15000,
    MAX_QTY: 99,
    COMBO_PREFIX: 'COMBO_',

    _toppingList: function (item) {
      return (item && Array.isArray(item.toppings)) ? item.toppings : [];
    },

    _findCombo: function (combos, itemId) {
      if (!Array.isArray(combos)) return null;
      var id = String(itemId || '');
      var raw = id.indexOf(this.COMBO_PREFIX) === 0 ? id.slice(this.COMBO_PREFIX.length) : id;
      return combos.find(function (c) { return c && (c.id === id || c.id === raw); }) || null;
    },

    /**
     * Tính giá một dòng hàng từ catalog.
     * line: { itemId, size, toppings, qty }
     * Trả { ok, error } hoặc { ok:true, line:{...} }
     */
    unitPrice: function (line, menu, combos) {
      if (!line || !line.itemId) return { ok: false, error: 'Thiếu mã món trong giỏ' };
      var qty = Number(line.qty);
      if (!Number.isInteger(qty) || qty < 1 || qty > this.MAX_QTY) {
        return { ok: false, error: 'Số lượng món không hợp lệ (1–' + this.MAX_QTY + ')' };
      }

      var combo = this._findCombo(combos, line.itemId);
      if (combo) {
        var comboPrice = Number(combo.comboPrice);
        if (!Number.isFinite(comboPrice) || comboPrice < 0) {
          return { ok: false, error: 'Combo "' + combo.name + '" chưa có giá hợp lệ' };
        }
        /* Ảnh đại diện combo: lấy từ món đầu tiên nếu combo không có ảnh riêng
           (để hoá đơn/giỏ hàng không bị trống ảnh). */
        var comboImg = combo.img || '';
        if (!comboImg && Array.isArray(combo.itemIds) && Array.isArray(menu)) {
          for (var ci = 0; ci < combo.itemIds.length; ci++) {
            var cm = menu.find(function (m) { return m && m.id === combo.itemIds[ci]; });
            if (cm && cm.img) { comboImg = cm.img; break; }
          }
        }
        return {
          ok: true,
          line: {
            itemId: String(line.itemId),
            name: combo.name,
            price: comboPrice,
            qty: qty,
            lineTotal: comboPrice * qty,
            size: 'Combo',
            toppings: [],
            img: comboImg
          }
        };
      }

      var item = (menu || []).find(function (m) { return m && m.id === line.itemId; });
      if (!item) return { ok: false, error: 'Món "' + line.itemId + '" không còn trong thực đơn' };
      if (item.inStock === false) return { ok: false, error: 'Món "' + item.name + '" đang hết hàng' };

      var base = Number(item.price);
      if (!Number.isFinite(base) || base < 0) {
        return { ok: false, error: 'Món "' + item.name + '" chưa có giá hợp lệ' };
      }

      var sizeName = line.size || 'M';
      var sizeExtra = 0;
      var sizes = Array.isArray(item.sizes) ? item.sizes : [];
      if (sizes.length) {
        var size = sizes.find(function (s) { return s && s.name === sizeName; });
        if (!size) return { ok: false, error: 'Size "' + sizeName + '" không có cho món "' + item.name + '"' };
        sizeExtra = Number(size.extraPrice) || 0;
      } else {
        sizeName = 'M';
      }

      var toppingNames = Array.isArray(line.toppings) ? line.toppings : [];
      var toppingTotal = 0;
      var cleanToppings = [];
      for (var i = 0; i < toppingNames.length; i++) {
        var raw = toppingNames[i];
        var name = (raw && typeof raw === 'object') ? raw.name : raw;
        if (!name) continue;
        var found = this._toppingList(item).find(function (t) { return t && t.name === name; });
        if (!found) {
          return { ok: false, error: 'Topping "' + name + '" không có cho món "' + item.name + '"' };
        }
        toppingTotal += Number(found.price) || 0;
        cleanToppings.push(found.name);
      }

      var price = base + sizeExtra + toppingTotal;
      return {
        ok: true,
        line: {
          itemId: item.id,
          name: item.name,
          price: price,
          qty: qty,
          lineTotal: price * qty,
          size: sizeName,
          toppings: cleanToppings,
          img: item.img || ''
        }
      };
    },

    /**
     * Báo giá đầy đủ. Không đọc storage; mọi phụ thuộc được truyền vào.
     * evaluatePromo(code, subtotal, shipping, userId) -> { ok, discount, error }
     */
    quote: function (input) {
      input = input || {};
      var items = Array.isArray(input.items) ? input.items : [];
      if (!items.length) return { ok: false, error: 'Giỏ hàng đang trống' };

      var lines = [];
      var subtotal = 0;
      for (var i = 0; i < items.length; i++) {
        var r = this.unitPrice(items[i], input.menu, input.combos);
        if (!r.ok) return { ok: false, error: r.error };
        lines.push(r.line);
        subtotal += r.line.lineTotal;
      }

      var shipping = Number(input.shipping);
      if (!Number.isFinite(shipping) || shipping < 0) shipping = this.SHIPPING_FEE;
      shipping = Math.min(shipping, 50000);
      var discount = 0;
      var promoCode = String(input.promoCode || '').trim().toUpperCase();
      if (promoCode) {
        if (typeof input.evaluatePromo !== 'function') {
          return { ok: false, error: 'Chưa nạp được bộ khuyến mãi' };
        }
        var promo = input.evaluatePromo(promoCode, subtotal, shipping, input.userId);
        if (!promo || !promo.ok) {
          return { ok: false, error: 'Mã ' + promoCode + ': ' + ((promo && promo.error) || 'không dùng được') };
        }
        discount = Number(promo.discount) || 0;
      }

      discount = Math.max(0, Math.min(discount, subtotal + shipping));
      return {
        ok: true,
        lines: lines,
        subtotal: subtotal,
        shipping: shipping,
        discount: discount,
        promoCode: promoCode,
        total: Math.max(0, subtotal + shipping - discount)
      };
    }
  };

  /* ----------------------------------------------------------
     3. BOOKING RULES — luật đặt bàn thuần, thời gian truyền vào
     ---------------------------------------------------------- */
  var BookingRules = {
    OPEN_MIN: 7 * 60,          // 07:00
    CLOSE_MIN: 22 * 60,        // 22:00 (giống UI hiện tại)
    MAX_DAYS_AHEAD: 14,
    LEAD_MINUTES: 30,
    MAX_ACTIVE: 3,

    _pad: function (n) { return String(n).padStart(2, '0'); },

    ymd: function (d) {
      return d.getFullYear() + '-' + this._pad(d.getMonth() + 1) + '-' + this._pad(d.getDate());
    },

    parseDate: function (s) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s || ''))) return null;
      var p = String(s).split('-').map(Number);
      var d = new Date(p[0], p[1] - 1, p[2]);
      if (d.getFullYear() !== p[0] || d.getMonth() !== p[1] - 1 || d.getDate() !== p[2]) return null;
      return d;
    },

    parseTime: function (s) {
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(s || ''))) return null;
      var p = String(s).split(':').map(Number);
      return p[0] * 60 + p[1];
    },

    /**
     * input: { date, time, guests, seat, now, activeCount }
     * now: Date (bắt buộc để test được)
     */
    validate: function (input) {
      input = input || {};
      var now = input.now instanceof Date ? input.now : new Date();
      var date = this.parseDate(input.date);
      if (!date) return { ok: false, error: 'Ngày đặt chỗ không hợp lệ' };

      var mins = this.parseTime(input.time);
      if (mins === null) return { ok: false, error: 'Giờ đặt chỗ không hợp lệ (HH:MM)' };

      var today = this.parseDate(this.ymd(now));
      if (date < today) return { ok: false, error: 'Không thể đặt chỗ cho ngày đã qua' };

      var max = new Date(today.getTime());
      max.setDate(max.getDate() + this.MAX_DAYS_AHEAD);
      if (date > max) return { ok: false, error: 'Chỉ nhận đặt trước tối đa ' + this.MAX_DAYS_AHEAD + ' ngày' };

      if (mins < this.OPEN_MIN || mins > this.CLOSE_MIN) {
        return { ok: false, error: 'Giờ đặt phải trong khoảng 07:00 – 22:00' };
      }

      if (date.getTime() === today.getTime()) {
        var nowMins = now.getHours() * 60 + now.getMinutes();
        if (mins < nowMins) return { ok: false, error: 'Giờ này đã qua, vui lòng chọn giờ sau thời điểm hiện tại' };
        if (mins < nowMins + this.LEAD_MINUTES) {
          return { ok: false, error: 'Cần đặt trước ít nhất ' + this.LEAD_MINUTES + ' phút so với hiện tại' };
        }
      }

      var seat = input.seat;
      if (!seat) return { ok: false, error: 'Bàn đã chọn không tồn tại' };
      if (seat.status !== 'available') return { ok: false, error: 'Bàn ' + seat.id + ' đã có người đặt' };

      var guests = Number(input.guests);
      if (!Number.isInteger(guests) || guests < 1) return { ok: false, error: 'Số khách không hợp lệ' };
      if (Number(seat.capacity) > 0 && guests > Number(seat.capacity)) {
        return { ok: false, error: 'Bàn ' + seat.id + ' chỉ chứa tối đa ' + seat.capacity + ' khách' };
      }

      if (Number(input.activeCount) >= this.MAX_ACTIVE) {
        return { ok: false, error: 'Bạn đang có ' + this.MAX_ACTIVE + ' chỗ đặt hoạt động, vui lòng hoàn tất/hủy bớt trước' };
      }

      return { ok: true };
    },

    /* Cọc = số người × giá ly rẻ nhất (chỉ đồ uống). */
    DEPOSIT_PER_SEAT: 35000,
    depositFor: function (seat, guests) {
      var cap = Number(seat && seat.capacity) || 0;
      var n = Number(guests) || Math.ceil(cap / 2) || 1;
      var cheapest = this.DEPOSIT_PER_SEAT;
      try {
        if (typeof API !== 'undefined' && API.menu) {
          var prices = API.menu.getAll()
            .filter(function (m) { return ['coffee', 'tea', 'smoothie', 'juice', 'soda'].indexOf(m.categoryId) >= 0; })
            .map(function (m) { return Number(m.price) || 0; })
            .filter(function (p) { return p > 0; });
          if (prices.length) cheapest = Math.min.apply(null, prices);
        }
      } catch (e) {}
      return Math.max(0, n) * cheapest;
    }
  };

  /* ----------------------------------------------------------
     4. POLICY — một bảng quyền cho web và chat
     ---------------------------------------------------------- */
  var Policy = {
    ROLES: ['guest', 'customer', 'staff', 'owner'],

    /* Giá trị: 'own' | 'any' | false */
    ACTIONS: {
      'booking.create': { guest: false, customer: 'own', staff: 'any', owner: 'any' },
      'booking.cancel': { guest: false, customer: 'own', staff: 'any', owner: 'any' },
      'booking.complete': { guest: false, customer: false, staff: 'any', owner: 'any' },
      'booking.noShow': { guest: false, customer: false, staff: 'any', owner: 'any' },
      'booking.checkIn': { guest: false, customer: false, staff: 'any', owner: 'any' },
      'booking.hold': { guest: false, customer: 'own', staff: 'any', owner: 'any' },
      'booking.deposit': { guest: false, customer: 'own', staff: 'any', owner: 'any' },
      'booking.walkIn': { guest: false, customer: false, staff: 'any', owner: 'any' },
      'booking.update': { guest: false, customer: 'own', staff: 'any', owner: 'any' },
      'order.create': { guest: false, customer: 'own', staff: 'any', owner: 'any' },
      'order.cancel': { guest: false, customer: 'own', staff: 'any', owner: 'any' },
      'order.step': { guest: false, customer: false, staff: 'any', owner: 'any' },
      /* Bước mô phỏng của trang theo dõi (demo) — khách được tự chạy tiến trình
         cho đơn CỦA MÌNH, không đụng được đơn người khác. */
      'order.demoStep': { guest: false, customer: 'own', staff: 'any', owner: 'any' },
      'menu.write': { guest: false, customer: false, staff: 'any', owner: 'any' },
      'promotion.write': { guest: false, customer: false, staff: 'any', owner: 'any' },
      'shift.write': { guest: false, customer: false, staff: 'any', owner: 'any' },
      'staff.write': { guest: false, customer: false, staff: 'any', owner: 'any' },
      'stats.read': { guest: false, customer: false, staff: 'any', owner: 'any' },
      'pos.sale.create': { guest: false, customer: false, staff: 'any', owner: 'any' },
      'pos.read': { guest: false, customer: false, staff: 'any', owner: 'any' },
      'audit.read': { guest: false, customer: false, staff: 'any', owner: 'any' }
    },

    actor: function (user) {
      return {
        userId: (user && user.id != null) ? user.id : null,
        role: (user && this.ROLES.indexOf(user.role) >= 0) ? user.role : 'guest'
      };
    },

    authorize: function (actor, action, resource) {
      var role = (actor && this.ROLES.indexOf(actor.role) >= 0) ? actor.role : 'guest';
      var rule = this.ACTIONS[action];
      if (!rule) return { allowed: false, reason: 'Không có chính sách cho ' + action };

      var need = rule[role];
      if (!need) return { allowed: false, reason: 'Vai trò ' + role + ' không được ' + action };

      var ownerId = resource && (resource.ownerId != null ? resource.ownerId : resource.userId);
      var own = actor && actor.userId != null && ownerId != null && actor.userId === ownerId;
      var allowed = need === 'any' || (need === 'own' && own);
      return {
        allowed: allowed,
        reason: allowed ? 'Được phép' : ('Vai trò ' + role + ' chỉ được ' + action + ' với dữ liệu của mình')
      };
    }
  };

  /* ----------------------------------------------------------
     5. AUDIT — nhật ký thao tác, giữ 500 dòng gần nhất
     ---------------------------------------------------------- */
  var Audit = {
    KEY: 'cappan_audit',
    MAX: 500,

    _read: function () {
      try {
        var rows = JSON.parse(global.localStorage.getItem(this.KEY) || '[]');
        return Array.isArray(rows) ? rows : [];
      } catch (e) { return []; }
    },

    _write: function (rows) {
      try { global.localStorage.setItem(this.KEY, JSON.stringify(rows)); } catch (e) {}
    },

    _actor: function () {
      try {
        var u = (typeof API !== 'undefined' && API.users) ? API.users.getCurrent() : null;
        return Policy.actor(u);
      } catch (e) { return { userId: null, role: 'guest' }; }
    },

    log: function (entry) {
      entry = entry || {};
      var actor = entry.actor || this._actor();
      var row = {
        at: new Date().toISOString(),
        actor: {
          userId: actor.userId != null ? actor.userId : null,
          role: actor.role || 'guest',
          channel: entry.channel || 'web'
        },
        action: String(entry.action || 'unknown'),
        targetId: entry.targetId != null ? String(entry.targetId) : null,
        ok: entry.ok !== false,
        code: entry.code || null
      };
      var rows = this._read();
      rows.push(row);
      if (rows.length > this.MAX) rows = rows.slice(-this.MAX);
      this._write(rows);
      try {
        if (global.Realtime && typeof global.Realtime.emit === 'function') {
          global.Realtime.emit('audit:changed', { action: row.action });
        }
      } catch (e) {}
      return row;
    },

    getRecent: function (limit) {
      var n = Number(limit);
      if (!Number.isInteger(n) || n < 1 || n > this.MAX) n = 50;
      return this._read().slice(-n).reverse();
    },

    clear: function () {
      try { global.localStorage.removeItem(this.KEY); } catch (e) {}
    }
  };

  /* ----------------------------------------------------------
     6. HASH — băm mật khẩu có muối, đồng bộ (không cần WebCrypto)
     Mục đích: localStorage không còn lưu mật khẩu dạng thô. Đây là
     "hợp đồng" để sau này thay bằng backend/PBKDF2 thật; không phải
     bảo mật tuyệt đối vì toàn bộ chạy phía client.
     ---------------------------------------------------------- */
  var CappanHash = {
    ITERATIONS: 600,
    SALT_BYTES: 16,

    /* ---- SHA-256 thuần JS (input: Uint8Array, output: Uint8Array 32B) ---- */
    _sha256: (function () {
      var K = [
        0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
        0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
        0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
        0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
        0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
        0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
        0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
        0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
      ];
      var rotr = function (x, n) { return (x >>> n) | (x << (32 - n)); };

      return function (bytes) {
        var H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
                 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
        var len = bytes.length;
        var padLen = (((len + 9) + 63) >> 6) << 6;
        var m = new Uint8Array(padLen);
        m.set(bytes);
        m[len] = 0x80;
        var bitsHi = Math.floor((len * 8) / 0x100000000);
        var bitsLo = (len * 8) >>> 0;
        m[padLen - 8] = (bitsHi >>> 24) & 255;
        m[padLen - 7] = (bitsHi >>> 16) & 255;
        m[padLen - 6] = (bitsHi >>> 8) & 255;
        m[padLen - 5] = bitsHi & 255;
        m[padLen - 4] = (bitsLo >>> 24) & 255;
        m[padLen - 3] = (bitsLo >>> 16) & 255;
        m[padLen - 2] = (bitsLo >>> 8) & 255;
        m[padLen - 1] = bitsLo & 255;

        var w = new Array(64);
        for (var off = 0; off < padLen; off += 64) {
          var i;
          for (i = 0; i < 16; i++) {
            var p = off + i * 4;
            w[i] = (m[p] << 24) | (m[p + 1] << 16) | (m[p + 2] << 8) | m[p + 3];
          }
          for (i = 16; i < 64; i++) {
            var s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
            var s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
            w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
          }
          var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
          for (i = 0; i < 64; i++) {
            var S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
            var ch = (e & f) ^ (~e & g);
            var t1 = (h + S1 + ch + K[i] + w[i]) | 0;
            var S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
            var maj = (a & b) ^ (a & c) ^ (b & c);
            var t2 = (S0 + maj) | 0;
            h = g; g = f; f = e; e = (d + t1) | 0;
            d = c; c = b; b = a; a = (t1 + t2) | 0;
          }
          H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0;
          H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
          H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0;
          H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
        }

        var out = new Uint8Array(32);
        for (var k = 0; k < 8; k++) {
          out[k * 4] = (H[k] >>> 24) & 255;
          out[k * 4 + 1] = (H[k] >>> 16) & 255;
          out[k * 4 + 2] = (H[k] >>> 8) & 255;
          out[k * 4 + 3] = H[k] & 255;
        }
        return out;
      };
    })(),

    _utf8: function (str) {
      var s = String(str);
      var out = [];
      for (var i = 0; i < s.length; i++) {
        var c = s.charCodeAt(i);
        if (c < 0x80) {
          out.push(c);
        } else if (c < 0x800) {
          out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
        } else if (c >= 0xd800 && c <= 0xdbff) {
          var c2 = s.charCodeAt(++i);
          var cp = 0x10000 + ((c - 0xd800) << 10) + ((c2 & 0x3ff));
          out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 63), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
        } else {
          out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
        }
      }
      return new Uint8Array(out);
    },

    _hex: function (bytes) {
      var s = '';
      for (var i = 0; i < bytes.length; i++) s += (bytes[i] < 16 ? '0' : '') + bytes[i].toString(16);
      return s;
    },

    newSalt: function () {
      var out = '';
      var i;
      try {
        if (global.crypto && typeof global.crypto.getRandomValues === 'function') {
          var buf = new Uint8Array(this.SALT_BYTES);
          global.crypto.getRandomValues(buf);
          for (i = 0; i < buf.length; i++) out += ('0' + buf[i].toString(16)).slice(-2);
          return out;
        }
      } catch (e) {}
      for (i = 0; i < this.SALT_BYTES; i++) {
        out += ('0' + Math.floor(Math.random() * 256).toString(16)).slice(-2);
      }
      return out;
    },

    /* 600 vòng: đủ chậm để dò thủ công, đủ nhanh để đăng nhập < 50ms. */
    hash: function (password, salt, iterations) {
      var rounds = Number(iterations) || this.ITERATIONS;
      var secret = this._utf8(String(password) + '|' + String(salt));
      var digest = this._sha256(secret);
      for (var i = 1; i < rounds; i++) {
        var buf = new Uint8Array(digest.length + secret.length);
        buf.set(digest);
        buf.set(secret, digest.length);
        digest = this._sha256(buf);
      }
      return this._hex(digest);
    },

    verify: function (password, salt, expectedHash) {
      if (!salt || !expectedHash) return false;
      return this.hash(password, salt) === String(expectedHash);
    },

    /* Tạo bộ trường lưu trữ cho mật khẩu mới. */
    create: function (password) {
      var salt = this.newSalt();
      return { passwordSalt: salt, passwordHash: this.hash(password, salt) };
    }
  };

  /* ----------------------------------------------------------
     7. Xuất ra global (window trong trình duyệt, sandbox trong test)
     ---------------------------------------------------------- */
  global.CappanConfig = CappanConfig;
  global.Pricing = Pricing;
  global.BookingRules = BookingRules;
  global.Policy = Policy;
  global.Audit = Audit;
  global.CappanHash = CappanHash;

  /* Cho phép test ESM đọc nhanh nếu chạy trong Node */
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      CappanConfig: CappanConfig, Pricing: Pricing, BookingRules: BookingRules,
      Policy: Policy, Audit: Audit, CappanHash: CappanHash
    };
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
