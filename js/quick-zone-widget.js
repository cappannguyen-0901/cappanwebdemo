/* Quick Zone widget — chỉ hiển thị trạng thái khu tự do, không giữ chỗ */
(function () {
  'use strict';
  function paint() {
    if (typeof API === 'undefined' || !API.quickZone) return;
    let el = document.getElementById('quickZoneWidget');
    if (!el) {
      el = document.createElement('div');
      el.id = 'quickZoneWidget';
      el.style.cssText = 'position:fixed;left:14px;bottom:14px;z-index:900;background:#2a1a14;color:#f3dc82;border:1px solid #c9a227;border-radius:10px;padding:8px 11px;font:600 11px/1.35 Inter,system-ui,sans-serif;box-shadow:0 8px 22px rgba(0,0,0,.18);max-width:250px;';
      document.body.appendChild(el);
    }
    const status = API.quickZone.get();
    const label = API.quickZone.label(status);
    el.innerHTML = `<div style="font-size:9px;letter-spacing:.12em;text-transform:uppercase;opacity:.8">Khu tự do · Counter Pickup</div>
      <div style="font-size:13px;margin-top:2px">${label}</div>
      <div style="font-size:9.5px;opacity:.75;margin-top:2px">Không giữ chỗ · ưu tiên khách không điện thoại</div>`;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', paint);
  else paint();
  setInterval(paint, 4000);
  window.addEventListener('cappan:sync', paint);
})();
