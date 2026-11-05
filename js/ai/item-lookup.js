/* ============================================================
   ITEM LOOKUP — hiểu người dùng đang nói về MÓN GÌ
   ------------------------------------------------------------
   - resolve(raw): phân loại 1 câu thành
       { kind:'item' }      → đúng một món trong menu
       { kind:'category' }  → cả nhóm (trà, cà phê, sinh tố…)
       { kind:'unknown' }   → món/đồ uống không có trong menu (kèm gợi ý)
       { kind:'catalog' }   → xem toàn bộ menu
       null                 → không phải câu hỏi món (đặt bàn, số người, giờ…)
   - Tuyệt đối KHÔNG coi "2 người", "bàn 4 người", "19h", "ngày mai" là tên món.
   - So khớp không dấu, chịu được câu có số lượng/đơn vị/động từ ("cho 2 ly trà sữa").
   - Gợi ý thay thế theo đúng nhóm món (trà sữa → các món trà), không random.
   ============================================================ */

const ItemLookup = {
  PATTERNS: [
    // "tìm món X"
    /(?:tìm|tim|search)\s+(?:món|mon|đồ uống|do uong|nước|nuoc|ly)\s+(.+?)(?:\s+(?:giá|gia|bao nhiêu|bao nhieu|không|khong|ko|nào|nao|vậy|vay)|$)/i,
    // "có món X không"
    /(?:có|có bán|co)\s+(?:món|mon|đồ uống|do uong|nước|nuoc)\s+(.+?)\s+(?:không|khong|ko|nào|nao)/i,
    // "quán có X không"
    /(?:quán|quan)\s+(?:có|co)\s+(.+?)\s+(?:không|khong|ko|nào|nao)/i,
    // "muốn uống X"
    /(?:muốn|muon|mình muốn|minh muon)\s+(?:uống|uong|ăn|an|gọi|goi)\s+(.+?)(?:\s+(?:giá|gia|bao nhiêu|bao nhieu)|$)/i,
    // "X giá bao nhiêu"
    /^(.{3,30}?)\s+(?:giá|gia)\s+(?:bao nhiêu|bao nhieu|sao|thế nào|the nao|mấy|may|nhiêu|nhieu)/i,
    // "X bao nhiêu tiền"
    /^(.{3,30}?)\s+(?:bao nhiêu|bao nhieu)\s+(?:tiền|tien|vậy|vay|ạ|a)?\s*$/i,
  ],

  STOPWORDS: new Set([
    'gì', 'gi', 'nào', 'nao', 'vậy', 'vay', 'thế', 'the', 'đó', 'do',
    'tôi', 'toi', 'mình', 'minh', 'em', 'anh', 'chị', 'chi', 'bạn', 'ban', 'ơi', 'oi', 'ạ', 'a',
    'muốn', 'muon', 'uống', 'uong', 'ăn', 'an', 'gọi', 'goi', 'mua', 'có', 'co',
    'món', 'mon', 'đồ', 'do', 'nước', 'nuoc', 'ly', 'cốc', 'coc', 'phần', 'phan',
    'ngon', 'không', 'khong', 'ko', 'hay', 'tốt', 'tot', 'tệ', 'te', 'dở',
    'rẻ', 're', 'mắc', 'mac', 'đắt', 'dat', 'chạy', 'chay',
    'giá', 'gia', 'tiền', 'tien', 'bao', 'nhiêu', 'nhieu', 'sao',
    'cho', 'nhé', 'nhe', 'nha', 'nhi', 'với', 'voi', 'và', 'va', 'thì', 'thi',
    'người', 'nguoi', 'khách', 'khach', 'bàn', 'ban', 'ghế', 'ghe', 'chỗ', 'cho',
  ]),

  NON_ITEM_RE: /\b(wifi|wi-fi|gui xe|dau xe|bai xe|parking|dia chi|hotline|email|gio mo|gio dong|gio hoat dong|app|ung dung|tuyen dung|xin viec|chinh sach|thanh toan|nguoi|khach|ban|ghe|phong|check in|checkin|ship|giao hang|khuyen mai|ma giam|voucher|diem|lich|ca lam|nhan vien|doanh thu|hoa don)\b/,
  GENERIC_INDICATORS: /\b(gì|gi|nào|nao|đó|do|ké|ke|vài|vai|chút|chut)\b/i,

  PURE_CATEGORY: [
    'tra', 'ca phe', 'cafe', 'coffee', 'sinh to', 'smoothie', 'nuoc ep', 'juice',
    'soda', 'da xay', 'banh', 'trang mieng', 'khac', 'other', 'menu', 'thuc don',
    'do uong', 'mon an', 'nuoc'
  ],

  /* Nhóm món tương ứng với từ khoá đầu câu — dùng cho gợi ý thông minh */
  CATEGORY_ALIASES: {
    tea: ['tra', 'tra sua', 'tra xanh', 'matcha', 'tra dao', 'tra sen', 'tra gung'],
    coffee: ['ca phe', 'cafe', 'coffee', 'latte', 'espresso', 'cappuccino', 'capuchino',
             'americano', 'mocha', 'bac xiu', 'cà phê', 'flat white'],
    smoothie: ['sinh to', 'smoothie'],
    juice: ['nuoc ep', 'juice'],
    soda: ['soda'],
    other: ['da xay', 'banh', 'flan', 'kem', 'sua chua', 'socola', 'chocolate', 'trang mieng']
  },

  /* Từ khoá đầu câu đủ để coi là "đang hỏi món" dù menu chưa có */
  FOOD_HEADS: [
    'tra', 'capuchino', 'cappuccino', 'ca phe', 'cafe', 'coffee', 'latte', 'espresso',
    'matcha', 'mocha', 'americano', 'cold brew', 'flat white', 'macchiato', 'affogato',
    'milkshake', 'smoothie', 'sinh to', 'nuoc ep', 'soda', 'da xay', 'sua chua',
    'banh', 'flan', 'kem', 'socola', 'chocolate', 'combo', 'tra sua', 'tran chau'
  ],

  /* Tên đồ uống phổ biến quán KHÔNG bán — luôn chặn để không hứa hẹn sai */
  EXPLICIT_FAKES: [
    'tran chau', 'tra sua', 'matcha latte', 'flat white', 'cold brew', 'affogato',
    'macchiato', 'americano', 'capuchino', 'cappuccino sua', 'mojito', 'pina colada',
    'milkshake', 'ice blend', 'sinh to dua', 'sinh to kiwi', 'sinh to mam xoi',
    'sinh to mo', 'sting', 'coca', 'pepsi', 'red bull', 'trasua'
  ],

  /* Tính từ vị/healthy: để LocalBrain tư vấn, không báo "chưa có món <tính từ>" */
  TASTE_WORDS: new Set([
    'chua', 'ngot', 'dang', 'beo', 'man', 'cay', 'thanh mat', 'it ngot', 'it duong',
    'khong duong', 'healthy', 'chay', 'an kieng', 'diet', 'mat', 'nong', 'lanh'
  ]),

  /* ---------------- API công khai ---------------- */

  /**
   * Phân loại câu người dùng. Trả null nếu không liên quan tới món.
   */
  resolve(raw) {
    if (raw === null || raw === undefined) return null;
    const rawStr = String(raw).trim();
    if (!rawStr || rawStr.length > 120) return null;
    const n = this._norm(rawStr);
    if (!n) return null;

    /* Combo/size/topping: combo có thẻ riêng; size/topping để LocalBrain xử lý */
    if (!/\bcombo\b/.test(n) && /\b(topping|size)\b/.test(n)) return null;

    /* 1. Xem toàn bộ menu */
    const askCatalog =
      /^(menu|thuc don|full menu|toan bo menu)$/.test(n) ||
      /^(menu|thuc don)\b.*\b(gi|nao)\s*$/.test(n) ||
      /^(quan\s+)?(co|ban)\s+(nhung\s+|cac\s+)?(mon\s+|do uong\s+|nuoc\s+)?(gi|nao)\s*$/.test(n) ||
      /^quan\s+(co|ban)\s+(nhung\s+|cac\s+)?mon\s*$/.test(n);
    if (askCatalog) {
      return { kind: 'catalog', display: 'thực đơn' };
    }

    /* 1b. Combo ưu đãi */
    if (/\bcombo\b/.test(n)) {
      const all = (typeof KB !== 'undefined' && Array.isArray(KB.combos)) ? KB.combos : [];
      if (!all.length) return null;
      let list = all;
      if (/\bsang\b/.test(n)) list = all.filter(c => /sáng/i.test(c.name));
      else if (/\bchieu\b/.test(n)) list = all.filter(c => /chiều/i.test(c.name));
      else if (/\b(nhom|hoc tap)\b/.test(n)) list = all.filter(c => /nhóm|học/i.test(c.name));
      if (!list.length) list = all;
      if (/\bre\b|\btiet kiem\b/.test(n)) list = list.slice().sort((a, b) => a.comboPrice - b.comboPrice);
      return { kind: 'combo', combos: list, display: 'combo' };
    }

    /* 2. Nhóm món thuần: "trà", "menu trà", "các món cà phê"… */
    if (this.PURE_CATEGORY.includes(n)) {
      const cat = this._categoryFor(n);
      if (cat) return this._categoryResult(cat, 'thực đơn');
    }
    const catPhrase = n
      .replace(/^(menu|thuc don|xem|liet ke|danh sach|cac loai|cac mon|nhung mon|mon|loai|do uong|nuoc)\s+/, '')
      .replace(/^(ve|gom|bao gom)\s+/, '')
      .replace(/\s+(gi|nao|co gi|khong|vay|a|oi)$/, '')
      .trim();
    if (this.PURE_CATEGORY.includes(catPhrase)) {
      const cat = this._categoryFor(catPhrase);
      if (cat) return this._categoryResult(cat, 'thực đơn');
    }

    /* 3. Trích tên món (pattern rõ ràng trước, sau đó bỏ số lượng/đơn vị) */
    const ext = this.extract(rawStr);
    let candidate = (ext && !ext.generic && ext.name) ? this._norm(ext.name) : '';
    let display = (ext && !ext.generic && ext.name) ? ext.name : '';
    if (!candidate) {
      candidate = this._stripNoise(n);
      display = this._displayOf(rawStr, candidate);
    }
    if (!candidate) return null;

    const tokens = candidate.split(' ').filter(t => t.length >= 2);
    if (!tokens.length || tokens.length > 6) return null;
    if (this.isNonItemPhrase(candidate)) return null;
    if (this.PURE_CATEGORY.includes(candidate)) {
      const cat = this._categoryFor(candidate);
      if (cat) return this._categoryResult(cat, display || 'thực đơn');
    }

    /* 4. Đúng một món trong menu? (ưu tiên trước khi coi là tính từ vị) */
    if (tokens.length === 1 && this.TASTE_WORDS.has(candidate)) return null;
    const item = this._matchItem(candidate);
    if (item) {
      return {
        kind: 'item',
        item,
        candidate,
        display: display || item.name
      };
    }

    /* Tính từ vị / healthy → để LocalBrain tư vấn, không báo "chưa có" */
    if (tokens.every(t => this.TASTE_WORDS.has(t))) return null;
    if (tokens.some(t => this.TASTE_WORDS.has(t)) && this._foodHead(candidate)) return null;

    /* 5. Có phải đang hỏi món/đồ uống không? */
    const head = this._foodHead(candidate);
    const menuLike = this._menuLike(candidate);
    const fake = this.EXPLICIT_FAKES.some(f => candidate === f || candidate.indexOf(f + ' ') === 0 || candidate.indexOf(' ' + f + ' ') >= 0);
    if (!head && !menuLike && !fake) return null;

    const cat = head ? this._categoryFor(head) : null;
    return {
      kind: 'unknown',
      candidate,
      display: display || candidate,
      head: head || '',
      category: cat,
      suggestions: this.suggestFor({ candidate, head, category: cat }, 3)
    };
  },

  /** Gợi ý món thay thế: ưu tiên đúng nhóm, sau đó mới tới gần tên. */
  suggestFor(res, limit = 3) {
    const out = [];
    const seen = new Set();
    const push = m => {
      if (!m || !m.id || seen.has(m.id) || m.inStock === false) return;
      seen.add(m.id);
      out.push(m);
    };

    if (res && res.head) {
      const headWords = String(res.head).split(' ').filter(Boolean);
      API.menu.getAll().forEach(m => {
        if (out.length >= limit) return;
        const mn = this._norm(m.name);
        if (headWords.some(w => mn.includes(w))) push(m);
      });
    }
    if (out.length < limit && res && res.category) {
      API.menu.getByCategory(res.category).forEach(push);
    }
    if (out.length < limit) {
      (this.suggestSimilar((res && (res.candidate || res.head)) || '', limit) || []).forEach(push);
    }
    return out.slice(0, limit);
  },

  /** Chỉ dùng cho test/guard: câu có phải câu hỏi món không. */
  isMenuItemQuestion(raw) {
    const r = this.resolve(raw);
    return !!r && (r.kind === 'item' || r.kind === 'category' || r.kind === 'unknown');
  },

  /* ---------------- Trích xuất & so khớp ---------------- */

  extract(raw) {
    if (!raw || typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    if (!trimmed || trimmed.length > 120) return null;

    for (const re of this.PATTERNS) {
      const m = trimmed.match(re);
      if (!m || !m[1]) continue;

      if (this.GENERIC_INDICATORS.test(m[1])) return { name: '', generic: true };

      let name = m[1]
        .toLowerCase()
        .replace(/\b(món|mon|đồ uống|do uong|nước|nuoc|ly|cho|tôi|toi|mình|minh|em|anh|chị|chi)\b/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (!name) continue;
      if (this.NON_ITEM_RE.test(this._norm(name))) continue;

      const tokens = name.split(' ').filter(Boolean);
      const meaningful = tokens.filter(t => {
        const normT = this._norm(t);
        return !this.STOPWORDS.has(t) && !this.STOPWORDS.has(normT) && normT.length >= 2;
      });

      if (meaningful.length === 0) return { name: '', generic: true };
      return { name: meaningful.join(' '), generic: false };
    }
    return null;
  },

  /* Bỏ số lượng/đơn vị/động từ để còn lại tên món.
     "cho 2 ly trà sữa" → "tra sua"; "2 người" → "" (không phải món). */
  _stripNoise(n) {
    return String(n || '')
      .replace(/\b\d{1,3}\b/g, ' ')
      .replace(/\b(nguoi lon|nguoi|khach hang|khach|ly|coc|phan|suat|chai|lon|hop|ban|ghe|phong|cho|gio|ngay|hom nay|ngay mai|toi nay|sang mai|chieu mai|toi mai|phut|tieng)\b/g, ' ')
      .replace(/\b(cho toi|cho minh|toi|minh|em|anh|chi|muon|uong|an|goi|dat|lay|mua|co|khong|ko|gia|bao nhieu|tien|mon|do uong|nuoc|ngon|nao|gi|sao|the nao|vay|ha|them|order|ship|giao|vao|vai|chut|quan|oi|nhe|nha|nhi|the|thoi|duoc)\b/g, ' ')
      .replace(/\b(calo|kcal|duong|dang|beo|cafein|ngot|man|thanh mat|nong|lanh|size|review|danh gia|dinh duong|vitamin|tot khong|uong duoc|an duoc|bao lau|o dau|o day|dau|day)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  },

  isNonItemPhrase(norm) {
    return this.NON_ITEM_RE.test(norm);
  },

  /* Giữ nguyên dấu tiếng Việt cho câu trả lời, chỉ bỏ phần số lượng/đuôi giá. */
  _displayOf(rawStr, fallback) {
    let s = String(rawStr || '').trim();
    s = s
      .replace(/^(?:cho\s+(?:tôi|toi|mình|minh|em|anh|chị|chi)?\s*)/i, '')
      .replace(/^(?:quán|quan|có|co|bán|ban|mình|minh|tôi|toi|em|anh|chị|chi)\s+/i, '')
      .replace(/^(?:(?:quán|quan|có|co|bán|ban|mình|minh|tôi|toi|em|anh|chị|chi)\s+)+/i, '')
      .replace(/^(?:\d{1,2}\s+)?(?:ly|cốc|coc|phần|phan|suất|suat|chai|lon)\s+/i, '')
      .replace(/\s+(?:giá|gia|bao nhiêu|bao nhieu|mấy|may|nhiêu|nhieu|tiền|tien)(?=\s|$)[\s\S]*$/i, '')
      .replace(/\s+(?:có|co|không|khong|ko|calo|đường|duong|ngon|tốt|tot|được|duoc|ở đâu|o dau|ở đây|o day)(?=\s|$)[\s\S]*$/i, '')
      .replace(/[?!.,;]+$/, '')
      .trim();
    const words = s.split(/\s+/).filter(Boolean);
    if (!s || words.length > 5 || /\d/.test(s)) return fallback || s;
    return s;
  },

  /** So khớp: tất cả từ của câu phải nằm trong CÙNG một tên món. */
  _matchItem(candidate) {
    const tokens = String(candidate || '').split(' ').filter(t => t.length >= 2);
    if (!tokens.length) return null;
    let best = null;
    let bestScore = -1;
    for (const m of API.menu.getAll()) {
      const mn = this._norm(m.name);
      const mt = mn.split(' ').filter(t => t.length >= 2);
      const all = tokens.every(t => mt.some(x => x === t));
      if (!all) continue;
      let score = tokens.length * 4;
      if (mn === candidate) score += 10;
      if (mn.indexOf(candidate) === 0) score += 3;
      if (score > bestScore) { bestScore = score; best = m; }
    }
    return best;
  },

  _menuLike(candidate) {
    const tokens = String(candidate || '').split(' ').filter(t => t.length >= 2);
    if (!tokens.length) return false;
    const set = new Set();
    API.menu.getAll().forEach(m => {
      this._norm(m.name).split(' ').filter(t => t.length >= 2).forEach(t => set.add(t));
    });
    return tokens.every(t => set.has(t));
  },

  _foodHead(candidate) {
    const c = String(candidate || '');
    for (const head of this.FOOD_HEADS) {
      if (c === head || c.indexOf(head + ' ') === 0 || c.indexOf(' ' + head + ' ') >= 0) return head;
    }
    return '';
  },

  _categoryFor(word) {
    const w = this._norm(word);
    if (!w) return null;
    for (const cat of Object.keys(this.CATEGORY_ALIASES)) {
      if (this.CATEGORY_ALIASES[cat].some(a => {
        const an = this._norm(a);
        return w === an || w.indexOf(an + ' ') === 0 || w.indexOf(' ' + an + ' ') >= 0;
      })) return cat;
    }
    return null;
  },

  _categoryResult(catId, display) {
    const cat = (typeof API !== 'undefined' && API.categories) ? API.categories.getById(catId) : null;
    return {
      kind: 'category',
      category: catId,
      categoryName: cat ? cat.name : catId,
      items: API.menu.getAll().filter(m => m.categoryId === catId),
      display: display || (cat ? cat.name : catId)
    };
  },

  /* ---------- API cũ (giữ để không phá chỗ khác) ---------- */

  isInMenu(name) {
    if (!name) return true;
    const norm = this._norm(name);
    if (!norm) return true;
    if (this._matchItem(norm)) return true;
    const qTokens = norm.split(' ').filter(t => t.length >= 2);
    if (!qTokens.length) return true;
    for (const m of API.menu.getAll()) {
      const mTokens = this._norm(m.name).split(' ').filter(t => t.length >= 2);
      const overlap = qTokens.filter(t =>
        mTokens.some(mt => mt === t || (t.length >= 4 && mt.indexOf(t) === 0))
      ).length;
      if (overlap / qTokens.length >= 0.5) return true;
    }
    return false;
  },

  suggestSimilar(name, limit = 3) {
    const norm = this._norm(name);
    const words = norm.split(' ').filter(w => w.length >= 2);
    if (words.length === 0) return API.menu.getAvailable().slice(0, limit);

    const scored = API.menu.getAll()
      .filter(m => m.inStock)
      .map(m => {
        const mNorm = this._norm(m.name);
        const mTokens = mNorm.split(' ').filter(t => t.length >= 2);
        let score = 0;
        words.forEach(w => {
          if (mNorm.indexOf(w) >= 0) score += 2;
          if (mTokens.some(mt => mt === w || mt.indexOf(w) === 0 || w.indexOf(mt) === 0)) score += 1;
        });
        return { m, score };
      })
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score);

    if (scored.length === 0) {
      return API.menu.getAvailable().slice(0, limit);
    }
    return scored.slice(0, limit).map(x => x.m);
  },

  _norm(s) {
    return String(s || '').toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd').replace(/[^a-z0-9 ]+/g, ' ')
      .replace(/\s+/g, ' ').trim();
  }
};

window.ItemLookup = ItemLookup;
