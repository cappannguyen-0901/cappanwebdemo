(function() {
  // ⚡ HARDENING: mọi truy cập storage đều bọc try/catch — trình duyệt chặn storage
  // ("Block all cookies") không được giết module (trước đây hook realtime sẽ không cài).
  const _lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const _lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const _lsDel = k => { try { localStorage.removeItem(k); } catch (e) {} };

  const channel = (typeof BroadcastChannel !== 'undefined') ? new BroadcastChannel('cappan_sync') : null;

  let lastSyncTime = _lsGet('cappan_sync_ping') || '0';

  // ⚡ BẢN ĐỒ ÁNH XẠ SỰ KIỆN: Tách kênh lõi và kênh AI
  const ROUTABLE_EVENTS = {
    'data:changed': 'cappan:sync',
    'audit:changed': 'cappan:audit',
    'ai:metrics':   'cappan:ai-metrics',
    'ai:feedback':  'cappan:ai-feedback'
  };

  window.Realtime = {
    emit(event, payload) {
      const ping = Date.now() + Math.random();
      lastSyncTime = String(ping);   // ⚡ chặn polling tự kích tab gốc
      _lsSet('cappan_sync_ping', String(ping));
      const data = { event, payload, ts: ping };
      try {
        if (channel) channel.postMessage(data);
      } catch (e) {}
      /* Cùng tab: storage event không tự bắn, BroadcastChannel không nhận lại chính nó.
         Dispatch ngay (microtask) để UI đang mở cập nhật trạng thái tức thì. */
      try {
        queueMicrotask(() => routeSync(data));
      } catch (e) {
        routeSync(data);
      }
    },
    on(event, handler) {
      const domEvent = ROUTABLE_EVENTS[event];
      if (!domEvent) { console.warn('[Realtime] unknown event:', event); return; }
      window.addEventListener(domEvent, (e) => handler({
        event,
        payload: e && e.detail ? e.detail.payload : undefined
      }));
    }
  };

  function routeSync(payload) {
    const evt = payload && payload.event;
    /* Event lạ không được gộp thành data:changed — tránh vòng lặp render
       (ví dụ audit:changed trước đây kích hoạt cappan:sync vô hạn). */
    const domEvent = ROUTABLE_EVENTS[evt];
    if (!domEvent) return;
    window.dispatchEvent(new CustomEvent(domEvent, {
      detail: { event: evt, payload: payload && payload.payload }
    }));
  }

  // Lớp 1: BroadcastChannel
  if (channel) {
    channel.addEventListener('message', (e) => { if (e.data) routeSync(e.data); });
  }

  // Lớp 2: Storage Event (Fallback)
  window.addEventListener('storage', (e) => {
    if (e.key === 'cappan_sync_ping') {
      routeSync({ event: 'data:changed' });
      lastSyncTime = e.newValue;
    }
  });

  // Lớp 3: Polling (Bảo hiểm)
  setInterval(() => {
    const currentPing = _lsGet('cappan_sync_ping') || '0';
    if (currentPing !== lastSyncTime) {
      lastSyncTime = currentPing;
      routeSync({ event: 'data:changed' });
    }
  }, 2000);

  /* Chỉ phát sự kiện khi có GHI THẬT vào localStorage (storeSet).
     Không hook mọi method API: các hàm đọc như promotions.status()/orders.isActive()
     cũng bị hook trước đây → render gọi đọc lại phát event → vòng lặp vô hạn. */
  try {
    if (typeof storeSet === 'function') {
      const origStoreSet = storeSet;
      storeSet = function (key, val) {
        const ok = origStoreSet(key, val);
        if (ok) {
          try { Realtime.emit('data:changed', { key }); } catch (e) {}
        }
        return ok;
      };
    }
  } catch (e) { console.warn('[Realtime] không hook được storeSet:', e); }
})();