/* ============================================================
   KDS + AMBIENT VOICE (demo)
   - Hàng đợi ưu tiên theo kênh + thời gian chờ
   - Web Speech API: STT push-to-talk + TTS
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
    stopSpeech();
    let i = 0;
    const playNext = () => {
      if (i >= chunks.length) return;
      const q = encodeURIComponent(chunks[i++]);
      const url = 'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=vi&q=' + q;
      ttsAudio = new Audio(url);
      ttsAudio.onended = playNext;
      ttsAudio.onerror = () => {
        setStatusLine('Không phát được Google TTS (mạng?). Nội dung đã hiện trên màn hình.');
        ttsAudio = null;
      };
      const p = ttsAudio.play();
      if (p && p.catch) p.catch(() => {
        setStatusLine('Trình duyệt chặn autoplay. Bấm “Test” hoặc “Đọc đơn tiếp theo” một lần.');
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
      stopSpeech();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = v.lang || 'vi-VN';
      u.rate = 1.02;
      u.pitch = 1;
      u.voice = v;
      window.speechSynthesis.speak(u);
      setStatusLine(voiceStatus());
    } catch (e) {}
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

  function describe(o) {
    const svc = SERVICE_LABEL[o.serviceType] || 'Tại bàn';
    const where = o.tableId ? ` bàn ${o.tableId}` : (o.serviceType === 'delivery' ? ' giao hàng' : '');
    return `${orderLabel(o)}, ${svc}${where}: ${itemText(o)}.`;
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
      stopListening();
      setStatusLine('Chế độ Screen Only: AI không nói, chỉ hiện màn hình.');
    } else {
      setStatusLine(mode === 'voice' ? 'Voice Only: AI nói và nghe. Dùng tai nghe để tránh vọng.' : 'Voice + Screen: AI nói và hiện xác nhận.');
    }
    log('sys', 'Chuyển chế độ: ' + (mode === 'voice' ? 'Voice Only' : mode === 'both' ? 'Voice + Screen' : 'Screen Only'));
  }

  function setMicButton() {
    const b = $('kdsMic');
    if (!b) return;
    b.classList.toggle('listening', listening);
    b.textContent = listening ? '⏹ Đang nghe…' : '🎙 Bật mic';
  }

  function startListening() {
    if (!SR) {
      toast('Trình duyệt không hỗ trợ micro. Dùng Chrome/Edge hoặc nút trên thẻ.', '#c62828');
      log('sys', 'Không có SpeechRecognition — dùng fallback nút bấm.');
      return;
    }
    if (mode === 'screen') {
      toast('Đang ở Screen Only. Chuyển Voice + Screen để nói.', '#856404');
      return;
    }
    if (listening) return;
    if (!recognition) {
      recognition = new SR();
      recognition.lang = 'vi-VN';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onresult = e => {
        const text = e.results[0][0].transcript;
        log('user', text);
        handleCommand(text);
      };
      recognition.onerror = e => {
        const msg = e.error === 'not-allowed' ? 'Chưa cấp quyền micro. Bấm cho phép trên trình duyệt.' : 'Lỗi mic: ' + e.error;
        setStatusLine(msg);
        log('sys', msg);
        toast(msg, '#c62828');
      };
      recognition.onend = () => { listening = false; setMicButton(); };
    }
    try {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      recognition.start();
      listening = true;
      setMicButton();
      setStatusLine('Đang nghe… nói ngắn: “đơn tiếp theo”, “xong A12”, “hết sữa”.');
    } catch (e) {
      listening = false;
      setMicButton();
      log('sys', 'Không khởi động được mic: ' + (e.message || e));
    }
  }

  function stopListening() {
    try { if (recognition) recognition.stop(); } catch (e) {}
    listening = false;
    setMicButton();
  }

  function toggleMic() {
    if (listening) {
      stopListening();
      setStatusLine('Đã tắt mic.');
      log('sys', 'Đã tắt mic.');
    } else {
      startListening();
    }
  }

  function findQueueOrder(code) {
    const queue = API.orders.getKdsQueue();
    if (!code) return queue[0] || null;
    return queue.find(o => String(o.kitchenCode || '').toUpperCase() === code) ||
      queue.find(o => String(o.id || '').toUpperCase().endsWith(code)) || null;
  }

  function extractCode(text) {
    const m = String(text || '').toUpperCase().match(/\bA\s?(\d{1,3})\b/);
    return m ? 'A' + m[1] : null;
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
        speak(`Đã hủy ${orderLabel(o)}.`);
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

  function handleCommand(raw) {
    const text = normalize(raw);
    if (!text) return;

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
    const statusMap = [
      { re: /^(bat dau|start)\b/, status: 'preparing' },
      { re: /^(xong|hoan thanh|done)\b/, status: 'ready' },
      { re: /^(da giao|phuc vu|served)\b/, status: 'served' }
    ];
    for (const item of statusMap) {
      if (item.re.test(text)) {
        const o = findQueueOrder(code);
        if (!o) { speak('Không tìm thấy đơn trong hàng đợi.'); return; }
        setStatus(o.id, item.status);
        return;
      }
    }

    if (/^(huy|huy don)\b/.test(text)) {
      const o = findQueueOrder(code);
      if (!o) { speak('Không tìm thấy đơn để hủy.'); return; }
      pending = { type: 'cancel', orderId: o.id };
      speak(`Đơn ${orderLabel(o)}, ${itemText(o)}. Xác nhận hủy?`);
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
    speak(`Đã ${label.toLowerCase()} ${orderLabel(o)}.`);
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
    log('sys', 'KDS sẵn sàng. Bấm “Bật mic” hoặc dùng nút trên thẻ.');
    log('sys', voiceStatus());
  }

  window.KDS = {
    setMode, toggleMic, announceNext, setStatus, cancel, loadDemoOrders, undoLast, handleCommand, render,
    setVoice, testVoice: () => speak('Xin chào, đây là giọng tiếng Việt của trợ lý bếp CAPPAN.', true)
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
