/* ============================================================
   KDS + AMBIENT VOICE (demo)
   - Hàng đợi ưu tiên theo kênh + thời gian chờ
   - Web Speech API: STT mic tự bật + TTS tiếng Việt
   - 3 chế độ: Voice Only / Voice + Screen / Screen Only
   - Fallback nút bấm nếu mic lỗi
============================================================ */
(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  let listening = false;
  let micOn = false;
  let micStarting = false;
  let micManualOff = false;
  let speaking = false;
  let mode = 'both';
  let pending = null;
  let lastAction = null;
  let voices = [];
  let selectedVoiceName = '';
  let ttsAudio = null;
  let renderTimer = null;

  const VOICE_KEY = 'cappan_kds_voice_v1';
  const GOOGLE_VOICE = '__google_vi__';

  const SERVICE_LABEL = { delivery: 'Giao hàng', takeaway: 'Mang đi', dine_in: 'Tại bàn' };
  const STATUS_LABEL = { submitted: 'Chờ làm', preparing: 'Đang pha', ready: 'Sẵn sàng', served: 'Đã phục vụ' };

  function toast(msg, color) {
    if (typeof showToast === 'function') return showToast(msg, color);
    console.log(msg);
  }

  function normalize(s) {
    return String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /* Chuyển số nói thành số viết cho mã đơn: "mười hai" -> 12, "hai mươi" -> 20. */
  function normalizeNumbers(s) {
    const map = { khong: 0, mot: 1, hai: 2, ba: 3, bon: 4, nam: 5, sau: 6, bay: 7, tam: 8, chin: 9 };
    let t = normalize(s);
    t = t.replace(/\bmuoi\s+(khong|mot|hai|ba|bon|nam|sau|bay|tam|chin)\b/g,
      (_, d) => String(10 + map[d]));
    t = t.replace(/\b(khong|mot|hai|ba|bon|nam|sau|bay|tam|chin)\s+muoi\s+(khong|mot|hai|ba|bon|nam|sau|bay|tam|chin)\b/g,
      (_, a, b) => String(map[a] * 10 + map[b]));
    t = t.replace(/\b(khong|mot|hai|ba|bon|nam|sau|bay|tam|chin)\s+muoi\b/g,
      (_, a) => String(map[a] * 10));
    return t;
  }

  function log(role, text) {
    const box = $('kdsTranscript');
    if (!box) return;
    const div = document.createElement('div');
    div.className = 'kds-line ' + role;
    div.textContent = (role === 'ai' ? 'AI: ' : role === 'user' ? 'Bạn: ' : '• ') + text;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
  }

  function setStatusLine(text) {
    const el = $('kdsStatus');
    if (el) el.textContent = text;
  }

  function loadVoices() {
    if (!('speechSynthesis' in window)) return;
    const all = window.speechSynthesis.getVoices() || [];
    voices = all.slice().sort((a, b) => {
      const av = /^vi/i.test(a.lang) ? 0 : 1;
      const bv = /^vi/i.test(b.lang) ? 0 : 1;
      if (av !== bv) return av - bv;
      return String(a.name).localeCompare(String(b.name));
    });
    populateVoiceSelect();
  }

  function viVoices() {
    return voices.filter(v => /^vi([-_]|$)/i.test(v.lang) || /vietnam|tiếng việt/i.test(v.name));
  }

  function pickVoice() {
    if (!voices.length) loadVoices();
    if (selectedVoiceName === GOOGLE_VOICE) return null;
    if (selectedVoiceName && selectedVoiceName !== GOOGLE_VOICE) {
      const chosen = voices.find(v => v.name === selectedVoiceName);
      if (chosen && /^vi([-_]|$)/i.test(chosen.lang)) return chosen;
    }
    return viVoices()[0] || null;
  }

  function useGoogleVoice() {
    return selectedVoiceName === GOOGLE_VOICE || (!viVoices().length && selectedVoiceName !== '');
  }

  function populateVoiceSelect() {
    const sel = $('kdsVoice');
    if (!sel) return;
    const vlist = viVoices();
    const hasVi = vlist.length > 0;
    const current = selectedVoiceName || (hasVi ? vlist[0].name : GOOGLE_VOICE);
    const opts = [];
    opts.push(`<option value="${GOOGLE_VOICE}" ${current === GOOGLE_VOICE ? 'selected' : ''}>Tiếng Việt — Google TTS (online)</option>`);
    if (vlist.length) {
      opts.push(...vlist.map(v =>
        `<option value="${esc(v.name)}" ${v.name === current ? 'selected' : ''}>${esc(v.name)} · ${esc(v.lang)}${v.localService ? ' · offline' : ''}</option>`
      ));
    }
    sel.innerHTML = opts.join('');
    selectedVoiceName = current;
  }

  function voiceStatus() {
    const v = pickVoice();
    if (v) return 'Giọng: ' + v.name + ' (' + v.lang + ')' + (v.localService ? ' · offline' : ' · online');
    if (useGoogleVoice() || !viVoices().length) return 'Giọng: Google TTS tiếng Việt (online, dự phòng)';
    return 'Chưa có giọng tiếng Việt. Chọn Google TTS hoặc cài Vietnamese voice trong Windows.';
  }

  function stopSpeech() {
    try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) {}
    try { if (ttsAudio) { ttsAudio.pause(); ttsAudio = null; } } catch (e) {}
  }

  /* Tạm dừng nhận lệnh khi AI đang nói để mic không thu lại chính giọng AI.
     Mic vẫn ở trạng thái bật; sau khi nói xong tự nghe lại. */
  function pauseMicForSpeech() {
    speaking = true;
    try { if (recognition) recognition.abort(); } catch (e) {}
    listening = false;
    micStarting = false;
    setMicButton();
  }

  function resumeMicAfterSpeech() {
    speaking = false;
    if (micOn && !micManualOff && !listening) {
      setTimeout(() => {
        if (micOn && !micManualOff && !listening && !speaking) startListening();
      }, 260);
    }
  }

  function googleChunks(text) {
    const clean = String(text || '').replace(/\s+/g, ' ').trim();
    const parts = clean.split(/(?<=[.!?])\s+/);
    const out = [];
    for (const p of parts) {
      if (p.length <= 180) { if (p) out.push(p); continue; }
      let rest = p;
      while (rest.length > 180) {
        let cut = rest.lastIndexOf(' ', 180);
        if (cut < 60) cut = 180;
        out.push(rest.slice(0, cut));
        rest = rest.slice(cut).trim();
      }
      if (rest) out.push(rest);
    }
    return out.slice(0, 6);
  }

  function speakGoogle(text, force) {
    if (mode === 'screen' && !force) return;
    const chunks = googleChunks(text);
    if (!chunks.length) return;
    pauseMicForSpeech();
    stopSpeech();
    let i = 0;
    const finish = () => {
      ttsAudio = null;
      resumeMicAfterSpeech();
    };
    const playNext = () => {
      if (i >= chunks.length) { finish(); return; }
      const q = encodeURIComponent(chunks[i++]);
      const url = 'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=vi&q=' + q;
      ttsAudio = new Audio(url);
      ttsAudio.onended = playNext;
      ttsAudio.onerror = () => {
        setStatusLine('Không phát được Google TTS (mạng?). Nội dung đã hiện trên màn hình.');
        finish();
      };
      const p = ttsAudio.play();
      if (p && p.catch) p.catch(() => {
        setStatusLine('Trình duyệt chặn autoplay. Bấm “Test” hoặc “Đọc đơn tiếp theo” một lần.');
        finish();
      });
    };
    playNext();
  }

  function speak(text, force) {
    if (!text) return;
    log('ai', text);
    if (mode === 'screen' && !force) return;
    const v = pickVoice();
    if (!v && useGoogleVoice()) {
      speakGoogle(text, force);
      setStatusLine(voiceStatus());
      return;
    }
    if (!('speechSynthesis' in window)) {
      setStatusLine('Trình duyệt không hỗ trợ TTS. Nội dung đã hiện trên màn hình.');
      return;
    }
    if (!v) {
      setStatusLine('Chưa có giọng tiếng Việt — chọn Google TTS ở dropdown hoặc cài Vietnamese voice.');
      return;
    }
    try {
      pauseMicForSpeech();
      stopSpeech();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = v.lang || 'vi-VN';
      u.rate = 1.02;
      u.pitch = 1;
      u.voice = v;
      u.onend = resumeMicAfterSpeech;
      u.onerror = resumeMicAfterSpeech;
      window.speechSynthesis.speak(u);
      setStatusLine(voiceStatus());
    } catch (e) {
      resumeMicAfterSpeech();
    }
  }

  function setVoice(name) {
    selectedVoiceName = name || '';
    try { localStorage.setItem(VOICE_KEY, selectedVoiceName); } catch (e) {}
    setStatusLine(voiceStatus());
    speak('Xin chào, tôi là trợ lý bếp CAPPAN. Giọng tiếng Việt đã sẵn sàng.', true);
  }

  function itemText(o) {
    return (o.items || []).map(i => `${i.qty} ${i.name}`).join(', ');
  }

  function orderLabel(o) {
    return o.kitchenCode || ('#' + String(o.id || '').slice(-4).toUpperCase());
  }

  function voiceCode(o) {
    const d = String(orderLabel(o)).replace(/\D/g, '');
    return d ? 'số ' + d : orderLabel(o);
  }

  function describe(o) {
    const code = voiceCode(o);
    if (o.serviceType === 'delivery') return `${code}, giao hàng: ${itemText(o)}.`;
    if (o.serviceType === 'takeaway') return `${code}, mang đi: ${itemText(o)}.`;
    const table = o.tableId ? `bàn ${o.tableId}` : 'chưa gán bàn';
    return `${code}, ${table}: ${itemText(o)}.`;
  }

  function render() {
    const grid = $('kdsGrid');
    if (!grid) return;
    let queue = [];
    try { queue = API.orders.getKdsQueue(); } catch (e) { queue = []; }
    if (!queue.length) {
      grid.innerHTML = '<div class="kds-empty">Chưa có đơn trong bếp. Bấm <strong>“Nạp 3 đơn demo”</strong> hoặc tạo đơn từ POS/QR.</div>';
      return;
    }
    grid.innerHTML = queue.map(o => {
      const svc = o.serviceType || 'dine_in';
      const ks = o.kitchenStatus || 'submitted';
      const actions = [];
      if (ks === 'submitted') actions.push(`<button class="primary" onclick="KDS.setStatus('${esc(o.id)}','preparing')">Bắt đầu</button>`);
      if (ks === 'preparing') actions.push(`<button class="primary" onclick="KDS.setStatus('${esc(o.id)}','ready')">Xong</button>`);
      if (ks === 'ready') actions.push(`<button class="primary" onclick="KDS.setStatus('${esc(o.id)}','served')">Đã phục vụ</button>`);
      actions.push(`<button class="danger" onclick="KDS.cancel('${esc(o.id)}')">Hủy</button>`);
      return `<div class="kds-card ${esc(svc)} ${ks === 'ready' ? 'ready' : ''}">
        <div class="kds-top">
          <span class="kds-code">${esc(orderLabel(o))}</span>
          <span class="kds-service ${esc(svc)}">${esc(SERVICE_LABEL[svc] || svc)}</span>
        </div>
        <div class="kds-meta">
          ${o.tableId ? `Bàn ${esc(o.tableId)} · ` : ''}
          ${esc(STATUS_LABEL[ks] || ks)} · ${Number(o.ageMinutes) || 0} phút
          ${o.paymentStatus === 'paid' ? ' · đã trả' : ' · trả sau'}
        </div>
        <ul class="kds-items">${(o.items || []).map(i =>
          `<li><span>${esc(i.name)}${i.note ? ` <small>(${esc(i.note)})</small>` : ''}</span><b>×${esc(i.qty)}</b></li>`
        ).join('')}</ul>
        <div class="kds-actions">${actions.join('')}</div>
      </div>`;
    }).join('');
  }

  function scheduleRender() {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(render, 80);
  }

  function setMode(next) {
    mode = ['voice', 'both', 'screen'].includes(next) ? next : 'both';
    document.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
    if (mode === 'screen') {
      setStatusLine('Screen Only: AI không nói, nhưng mic vẫn nghe lệnh. Tắt mic bằng nút hoặc nói “tắt mic”.');
    } else {
      setStatusLine(mode === 'voice' ? 'Voice Only: AI nói và nghe. Mic tự động bật; dùng tai nghe để tránh vọng.' : 'Voice + Screen: AI nói và hiện xác nhận. Mic tự động bật.');
    }
    log('sys', 'Chuyển chế độ: ' + (mode === 'voice' ? 'Voice Only' : mode === 'both' ? 'Voice + Screen' : 'Screen Only'));
  }

  function setMicButton() {
    const b = $('kdsMic');
    if (!b) return;
    b.classList.toggle('listening', micOn && listening);
    b.textContent = speaking
      ? '🔊 AI đang nói…'
      : (micOn
        ? (listening ? '⏹ Tắt mic — đang nghe' : '⏳ Đang khởi động mic…')
        : '🎙 Bật mic');
  }

  function startListening() {
    if (!SR) {
      toast('Trình duyệt không hỗ trợ micro. Dùng Chrome/Edge hoặc nút trên thẻ.', '#c62828');
      log('sys', 'Không có SpeechRecognition — dùng fallback nút bấm.');
      return;
    }
    if (listening || micStarting) return;
    if (speaking) return;
    micOn = true;
    micManualOff = false;
    micStarting = true;
    setMicButton();
    if (!recognition) {
      recognition = new SR();
      recognition.lang = 'vi-VN';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 3;
      recognition.onresult = e => {
        const result = e.results[0];
        let text = result[0] ? result[0].transcript : '';
        // Chọn alternative khớp lệnh tốt nhất nếu trình duyệt trả nhiều biến thể.
        for (let i = 1; i < result.length; i++) {
          const candidate = result[i] && result[i].transcript;
          if (candidate && looksLikeCommand(candidate)) { text = candidate; break; }
        }
        log('user', text);
        handleCommand(text);
      };
      recognition.onerror = e => {
        if (e.error === 'aborted' || speaking) return;
        const msg = e.error === 'not-allowed' ? 'Chưa cấp quyền micro. Bấm cho phép trên trình duyệt.' : 'Lỗi mic: ' + e.error;
        setStatusLine(msg);
        log('sys', msg);
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          micOn = false;
          micManuallyOff = true;
          micStarting = false;
          setMicButton();
        }
      };
      recognition.onend = () => {
        listening = false;
        micStarting = false;
        setMicButton();
        if (speaking) return;
        // Mic luôn bật: tự khởi động lại sau mỗi lần trình duyệt tự ngắt.
        if (micOn) {
          setTimeout(() => {
            if (micOn && !listening && !micStarting && !speaking) startListening();
          }, 280);
        }
      };
    }
    try {
      recognition.start();
      listening = true;
      micStarting = false;
      setMicButton();
      setStatusLine('Mic đang bật. Nói: “đơn tiếp theo”, “xong A12”, “hết sữa”, “tắt mic”.');
    } catch (e) {
      listening = false;
      micStarting = false;
      setMicButton();
      log('sys', 'Không khởi động được mic: ' + (e.message || e));
    }
  }

  function stopListening(manual) {
    micOn = false;
    micStarting = false;
    micManualOff = manual !== false;
    try { if (recognition) recognition.abort(); } catch (e) {}
    listening = false;
    setMicButton();
    if (manual !== false) {
      setStatusLine('Đã tắt mic. Bấm “Bật mic” để bật lại.');
      log('sys', 'Đã tắt mic.');
    }
  }

  function toggleMic() {
    if (micOn || listening) {
      stopListening(true);
    } else {
      startListening();
    }
  }

  function findQueueOrder(code, table) {
    const queue = API.orders.getKdsQueue();
    const digits = String(code || '').replace(/\D/g, '');
    const tableDigits = String(table || '').replace(/\D/g, '');
    if (table) {
      const byTable = queue.find(o => String(o.tableId || '').toUpperCase() === table) ||
        queue.find(o => tableDigits && String(o.tableId || '').replace(/\D/g, '') === tableDigits);
      if (byTable) return byTable;
    }
    if (!code) return queue[0] || null;
    return queue.find(o => String(o.kitchenCode || '').toUpperCase() === code) ||
      queue.find(o => digits && String(o.kitchenCode || '').replace(/\D/g, '') === digits) ||
      queue.find(o => String(o.id || '').toUpperCase().endsWith(code)) || null;
  }

  function extractCode(text) {
    const t = String(text || '').toUpperCase();
    const a = t.match(/\bA\s?(\d{1,3})\b/);
    if (a) return 'A' + a[1];
    // Cho phép nói số không cần chữ A: "xong 12", "xong 01".
    const nums = t.match(/\b\d{1,3}\b/g);
    if (nums && nums.length) return 'A' + nums[0];
    return null;
  }

  function extractTable(text) {
    const t = normalize(text);
    let m = t.match(/\bban\s+([a-z]\s?\d{1,2})\b/);
    if (m) return m[1].replace(/\s+/g, '').toUpperCase();
    m = t.match(/\bban\s+(\d{1,2})\b/);
    return m ? m[1] : null;
  }

  function executePending() {
    if (!pending) {
      speak('Không có hành động nào đang chờ xác nhận.');
      return;
    }
    const p = pending;
    pending = null;
    if (p.type === 'cancel') {
      const o = API.orders.getById(p.orderId);
      if (!o) { speak('Không tìm thấy đơn.'); return; }
      if (API.orders.cancel(p.orderId)) {
        speak(`Đã hủy ${voiceCode(o)}${o.tableId ? ', bàn ' + o.tableId : ''}.`);
        lastAction = null;
        render();
      } else {
        speak('Không hủy được đơn này.');
      }
    } else if (p.type === 'out') {
      const ing = API.ingredients.getById(p.ingredientId);
      if (!ing) { speak('Không tìm thấy nguyên liệu.'); return; }
      const before = Number(ing.stock) || 0;
      const r = API.ingredients.adjustStock(ing.id, 0, 'voice: hết nguyên liệu');
      if (!r.ok) { speak(r.error || 'Không cập nhật được kho.'); return; }
      lastAction = { type: 'stock', ingredientId: ing.id, before };
      const affected = API.menu.getAll().filter(m => m.inventoryManaged && !m.ingredientAvailable);
      speak(`Đã khóa ${affected.length} món có ${ing.name}. Menu khách đã cập nhật.`);
      render();
    }
  }

  function looksLikeCommand(s) {
    const t = normalize(s);
    return /(don tiep theo|tiep theo|bat dau|xong|hoan thanh|da giao|phuc vu|het sua|hoan tac|tat mic|bat mic|huy don|xac nhan)/.test(t) ||
      /\b(A|a)\s?\d{1,3}\b/.test(String(s));
  }

  function handleCommand(raw) {
    let text = normalizeNumbers(raw);
    if (!text) return;
    text = text.replace(/^(u|uh|o|day|nhe|vay|thi)\s+/, '');

    if (pending && /^(xac nhan|dong y|dung roi|ok)\b/.test(text)) {
      executePending();
      return;
    }
    if (pending && /^(huy|khong|thoi)\b/.test(text)) {
      pending = null;
      speak('Đã bỏ xác nhận.');
      return;
    }

    if (/(don tiep theo|tiep theo|doc don|don nao moi)/.test(text)) {
      announceNext();
      return;
    }

    if (/(tat mic|dung nghe|ngung nghe)/.test(text)) {
      stopListening();
      setStatusLine('Đã tắt mic.');
      log('sys', 'Đã tắt mic.');
      return;
    }

    if (/(hoan tac|undo)/.test(text)) {
      undoLast();
      return;
    }

    if (/(het sua|sua het|can sua)/.test(text) || /^het\s+/.test(text)) {
      const keyword = text.includes('sua') ? 'sữa' : text.replace(/^het\s+/, '').trim();
      const ing = API.ingredients.getAll().find(x =>
        normalize(x.name).includes(normalize(keyword)) || normalize(x.id).includes(normalize(keyword))
      );
      if (!ing) {
        speak(`Không tìm thấy nguyên liệu "${keyword}".`);
        return;
      }
      const affected = API.menu.getAll().filter(m => {
        if (!m.inventoryManaged) return false;
        const bom = API.ingredients.getBom(m.id);
        return bom && bom.lines.some(l => l.ingredientId === ing.id);
      });
      pending = { type: 'out', ingredientId: ing.id };
      speak(`Sẽ khóa ${affected.length} món có ${ing.name}: ${affected.map(m => m.name).join(', ')}. Xác nhận?`);
      return;
    }

    const code = extractCode(text);
    const table = extractTable(text);
    const statusMap = [
      { re: /^(bat dau|start)\b/, status: 'preparing' },
      { re: /^(xong|hoan thanh|done)\b/, status: 'ready' },
      { re: /^(da giao|phuc vu|served)\b/, status: 'served' }
    ];
    for (const item of statusMap) {
      if (item.re.test(text)) {
        const queue = API.orders.getKdsQueue();
        if (!code && !table && queue.length > 1) {
          speak(`Có ${queue.length} đơn. Anh/chị đọc mã đơn, ví dụ A12, hoặc nói “bàn A1”.`);
          return;
        }
        const o = findQueueOrder(code, table);
        if (!o) { speak('Không tìm thấy đơn trong hàng đợi.'); return; }
        setStatus(o.id, item.status);
        return;
      }
    }

    if (/^(huy|huy don)\b/.test(text)) {
      const queue = API.orders.getKdsQueue();
      if (!code && !table && queue.length > 1) {
        speak(`Có ${queue.length} đơn. Anh/chị đọc mã đơn cần hủy, ví dụ A12.`);
        return;
      }
      const o = findQueueOrder(code, table);
      if (!o) { speak('Không tìm thấy đơn để hủy.'); return; }
      pending = { type: 'cancel', orderId: o.id };
      speak(`Đơn ${voiceCode(o)}${o.tableId ? ', bàn ' + o.tableId : ''}, ${itemText(o)}. Xác nhận hủy?`);
      return;
    }

    speak('Mình chưa hiểu lệnh. Thử: “đơn tiếp theo”, “xong A12”, “hết sữa”, “hoàn tác”.');
  }

  function setStatus(id, status) {
    const o = API.orders.getById(id);
    if (!o) { speak('Không tìm thấy đơn.'); return; }
    const prev = { kitchenStatus: o.kitchenStatus, step: o.step, status: o.status };
    const r = API.orders.updateKitchen(id, status);
    if (!r) { speak('Không cập nhật được đơn.'); return; }
    lastAction = { type: 'status', orderId: id, prev };
    const label = STATUS_LABEL[status] || status;
    const where = o.tableId ? `, bàn ${o.tableId}` : '';
    speak(`Đã ${label.toLowerCase()} ${voiceCode(o)}${where}.`);
    render();
  }

  function cancel(id) {
    const o = API.orders.getById(id);
    if (!o) return;
    if (!confirm(`Hủy đơn ${orderLabel(o)} của ${o.tableId ? 'bàn ' + o.tableId : 'khách'}?`)) return;
    pending = { type: 'cancel', orderId: id };
    executePending();
  }

  function announceNext() {
    let queue = [];
    try { queue = API.orders.getKdsQueue(); } catch (e) {}
    if (!queue.length) {
      speak('Không có đơn nào đang chờ.');
      return;
    }
    const o = queue[0];
    speak(`Đơn ưu tiên: ${describe(o)}`);
  }

  function undoLast() {
    if (!lastAction) {
      speak('Không có hành động nào để hoàn tác.');
      return;
    }
    if (lastAction.type === 'status') {
      const p = lastAction.prev;
      const r = API.orders.update(lastAction.orderId, {
        kitchenStatus: p.kitchenStatus || 'submitted',
        step: p.step,
        status: p.status
      });
      if (r) {
        speak('Đã hoàn tác trạng thái đơn.');
        lastAction = null;
        render();
      } else speak('Không hoàn tác được.');
      return;
    }
    if (lastAction.type === 'stock') {
      const r = API.ingredients.adjustStock(lastAction.ingredientId, lastAction.before, 'undo voice');
      if (r.ok) {
        speak('Đã hoàn tác khóa nguyên liệu.');
        lastAction = null;
        render();
        return;
      }
    }
    speak('Không hoàn tác được hành động này.');
  }

  function loadDemoOrders() {
    try {
      const demos = [
        { serviceType: 'delivery', source: 'web', items: [{ itemId: 'M003', qty: 1, size: 'M' }], customerName: 'Khách giao hàng', phone: '0909000001', address: 'Gò Vấp' },
        { serviceType: 'takeaway', source: 'web', items: [{ itemId: 'M101', qty: 1, size: 'M' }], customerName: 'Khách mang đi' },
        { serviceType: 'dine_in', source: 'qr_table', tableId: 'A1', items: [{ itemId: 'M001', qty: 1, size: 'M' }], customerName: 'Khách bàn A1' }
      ];
      let n = 0;
      for (const d of demos) {
        if (d.tableId) {
          const s = API.tableSessions.join(d.tableId);
          if (s.ok) d.tableSessionId = s.session.id;
        }
        const o = API.orders.create(d);
        if (o) n++;
      }
      if (n) {
        toast(`✓ Đã nạp ${n} đơn demo`);
        const q = API.orders.getKdsQueue();
        speak(`Đã nạp ${n} đơn demo.${q[0] ? ' Đơn ưu tiên: ' + describe(q[0]) : ''}`);
        render();
      } else {
        toast('Không tạo được đơn demo (có thể hết nguyên liệu)', '#c62828');
      }
    } catch (e) {
      toast('Lỗi tạo đơn demo: ' + (e.message || e), '#c62828');
    }
  }

  function init() {
    if (typeof Auth === 'undefined' || !Auth.requireStaff()) return;
    if (typeof renderStaffNav === 'function') renderStaffNav('kds');
    try { selectedVoiceName = localStorage.getItem(VOICE_KEY) || ''; } catch (e) {}
    loadVoices();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => {
        loadVoices();
        setStatusLine(voiceStatus());
      };
    }
    setMode('both');
    setStatusLine(voiceStatus());
    render();
    setInterval(render, 2500);
    window.addEventListener('cappan:sync', scheduleRender);
    window.addEventListener('cappan:automation', scheduleRender);
    log('sys', 'KDS sẵn sàng.');
    log('sys', voiceStatus());
    // Mic luôn bật: tự xin quyền và khởi động sau khi trang ổn định.
    setTimeout(() => {
      if (!micOn && !listening && !micManualOff) startListening();
    }, 900);
  }

  window.KDS = {
    setMode, toggleMic, announceNext, setStatus, cancel, loadDemoOrders, undoLast, handleCommand, render,
    setVoice, testVoice: () => speak('Xin chào, đây là giọng tiếng Việt của trợ lý bếp CAPPAN.', true)
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
