/* ============================================================
   REPORT ENGINE — báo cáo cuối ngày/tuần/tháng/năm + gợi ý kinh doanh
   Không backend. Email qua mailto hoặc EmailJS (tùy chọn).
   ============================================================ */
(function () {
  const EMAIL_KEY = 'cappan_email_settings_v1';

  const money = n => (typeof API !== 'undefined' && API.utils)
    ? API.utils.formatVND(Number(n) || 0)
    : (Number(n) || 0).toLocaleString('vi-VN') + 'đ';

  function pct(a, b) {
    if (!b) return a ? 100 : 0;
    return Math.round(((a - b) / b) * 100);
  }

  function topShare(top, totalQty) {
    if (!top.length || !totalQty) return 0;
    return Math.round((top[0].qty / totalQty) * 100);
  }

  function buildInsights(r, prev, bs, top) {
    const out = [];
    const delta = r.revenue - prev.revenue;
    const deltaPct = pct(r.revenue, prev.revenue);

    if (!r.revenue && !r.completed) {
      return [{
        icon: '📭', tone: 'info', title: 'Chưa có giao dịch trong kỳ',
        text: 'Bấm “Nạp demo automation” hoặc tạo đơn/booking mới để dashboard có số liệu và gợi ý thực tế.'
      }];
    }

    if (!prev.revenue && r.revenue > 0) {
      out.push({ icon: '🚀', tone: 'good', title: 'Kỳ đầu tiên có doanh thu', text: `Đã ghi nhận ${money(r.revenue)}. Hãy giữ nhịp và bắt đầu so sánh với kỳ sau để thấy xu hướng.` });
    } else if (deltaPct >= 8) {
      out.push({ icon: '📈', tone: 'good', title: `Doanh thu tăng ${deltaPct}%`, text: `Tăng ${money(delta)} so với kỳ trước. Nên giữ các món/kênh đang kéo doanh thu và thử nhân rộng combo.` });
    } else if (deltaPct <= -8) {
      out.push({ icon: '📉', tone: 'warn', title: `Doanh thu giảm ${Math.abs(deltaPct)}%`, text: `Giảm ${money(Math.abs(delta))} so với kỳ trước. Kiểm tra giờ vắng, tồn món và các đơn bị hủy trước khi tăng chi phí marketing.` });
    } else {
      out.push({ icon: '➖', tone: 'info', title: 'Doanh thu ổn định', text: `Chênh lệch ${delta >= 0 ? '+' : ''}${deltaPct}% so với kỳ trước. Có thể tập trung tăng giá trị trung bình mỗi đơn.` });
    }

    if (r.aov > 0 && prev.aov > 0 && r.aov < prev.aov * 0.92) {
      out.push({ icon: '🧾', tone: 'warn', title: 'Giá trị đơn đang giảm', text: `AOV ${money(r.aov)} thấp hơn kỳ trước (${money(prev.aov)}). Thử combo, topping hoặc gợi ý thêm món khi khách thanh toán.` });
    } else if (r.aov > 0) {
      out.push({ icon: '🧾', tone: 'good', title: `AOV ${money(r.aov)}`, text: 'Giá trị trung bình mỗi đơn đang giữ. Có thể thử upsell nhẹ với bánh flan hoặc topping.' });
    }

    const qty = top.reduce((s, x) => s + x.qty, 0);
    const share = topShare(top, qty);
    if (top.length && share >= 40) {
      out.push({ icon: '🏆', tone: 'warn', title: `${top[0].name} chiếm ${share}% lượng bán`, text: 'Doanh thu đang phụ thuộc một món. Nên tạo combo hoặc đẩy thêm 1–2 món chủ lực để giảm rủi ro.' });
    } else if (top.length) {
      out.push({ icon: '🏆', tone: 'info', title: `Top món: ${top.slice(0, 3).map(x => x.name).join(', ')}`, text: 'Đây là nhóm nên đưa lên đầu menu, banner và gợi ý trong chat.' });
    }

    const cancelRate = r.count ? Math.round((r.cancelledCount / r.count) * 100) : 0;
    if (cancelRate >= 10) {
      out.push({ icon: '⚠️', tone: 'warn', title: `Tỷ lệ hủy đơn ${cancelRate}%`, text: 'Kiểm tra thời gian chờ, tình trạng món và thao tác xác nhận đơn. Hủy cao thường do thiếu hàng hoặc giao chậm.' });
    }

    const noShow = bs.no_show || 0;
    const activeBk = (bs.active || 0) + noShow;
    if (activeBk >= 4 && noShow / activeBk >= 0.12) {
      out.push({ icon: '🪑', tone: 'warn', title: `No-show ${Math.round(noShow / activeBk * 100)}%`, text: 'Nên nhắc khách trước 2 giờ và yêu cầu cọc với bàn lớn/giờ cao điểm.' });
    }

    if (bs.occupancy < 40 && bs.total > 0) {
      out.push({ icon: '📣', tone: 'info', title: `Tỷ lệ lấp bàn ${bs.occupancy}%`, text: 'Còn nhiều bàn trống. Thử khung giờ happy hour hoặc đẩy đặt bàn trên chat/facebook.' });
    } else if (bs.occupancy >= 80) {
      out.push({ icon: '🔥', tone: 'good', title: `Công suất bàn ${bs.occupancy}%`, text: 'Gần đầy. Nên tối ưu thời gian ngồi, mở thêm khung giờ hoặc nhân viên cho cao điểm.' });
    }

    let outOfStock = [];
    try { outOfStock = API.menu.getOutOfStock() || []; } catch (e) {}
    if (outOfStock.length) {
      out.push({ icon: '🥤', tone: 'warn', title: `${outOfStock.length} món đang hết hàng`, text: `${outOfStock.slice(0, 3).map(m => m.name).join(', ')}. Nên nhập lại hoặc đẩy món thay thế trong chat/menu.` });
    }

    if (r.byChannel.pos === 0 && r.byChannel.delivery > 0) {
      out.push({ icon: '🏪', tone: 'info', title: 'Chưa có doanh thu tại quầy', text: 'Có thể thử đẩy bán tại quầy/POS, đặc biệt giờ cao điểm, để tăng thêm doanh thu ngoài giao hàng.' });
    }

    return out.slice(0, 6);
  }

  const ReportEngine = {
    periods() {
      return [
        { key: 'today', label: 'Hôm nay', short: 'ngày' },
        { key: 'week', label: 'Tuần này', short: 'tuần' },
        { key: 'month', label: 'Tháng này', short: 'tháng' },
        { key: 'year', label: 'Năm nay', short: 'năm' }
      ];
    },

    build(period) {
      const key = period || 'today';
      const p = API.stats.preset(key);
      const prevP = API.stats.previousPreset(key);
      const r = API.stats.range(p.from, p.to);
      const prev = API.stats.range(prevP.from, prevP.to);
      const top = API.stats.topItemsInRange(p.from, p.to, 5);
      const bs = API.stats.bookingsSummary();
      const insights = buildInsights(r, prev, bs, top);
      const deltaPct = pct(r.revenue, prev.revenue);
      const delta = r.revenue - prev.revenue;

      return {
        period: key,
        label: p.label,
        from: p.from,
        to: p.to,
        prevFrom: prevP.from,
        prevTo: prevP.to,
        revenue: r.revenue,
        prevRevenue: prev.revenue,
        delta,
        deltaPct,
        orders: r.count,
        completed: r.completedCount,
        cancelled: r.cancelledCount,
        aov: r.aov,
        byChannel: r.byChannel,
        byPayment: r.byPayment,
        top,
        bookings: bs,
        occupancy: bs.occupancy,
        outOfStock: (() => { try { return API.menu.getOutOfStock() || []; } catch (e) { return []; } })(),
        insights
      };
    },

    summaryLines(r) {
      return [
        `Kỳ: ${r.label} (${new Date(r.from).toLocaleDateString('vi-VN')} – ${new Date(r.to).toLocaleDateString('vi-VN')})`,
        `Doanh thu: ${money(r.revenue)} (${r.deltaPct >= 0 ? '+' : ''}${r.deltaPct}% so với kỳ trước)`,
        `Đơn hoàn tất: ${r.completed}/${r.orders} · Hủy: ${r.cancelled}`,
        `AOV: ${money(r.aov)}`,
        `Kênh: giao hàng ${money(r.byChannel.delivery)} · tại quầy ${money(r.byChannel.pos)}`,
        `Booking: ${r.bookings.active} hoạt động · ${r.bookings.held} đang giữ · ${r.bookings.seated} đang ngồi · no-show ${r.bookings.no_show}`,
        `Cọc: đã thu ${money(r.bookings.depositCollected)} · chờ thu ${money(r.bookings.depositPending)}`,
        `Lấp bàn: ${r.occupancy}%`,
        `Top món: ${r.top.length ? r.top.map(x => `${x.name} (${x.qty})`).join(', ') : 'chưa có'}`
      ];
    },

    toText(r) {
      const lines = ['CAPPAN — BÁO CÁO TÀI CHÍNH & VẬN HÀNH', ''];
      lines.push(...this.summaryLines(r));
      lines.push('', 'GỢI Ý HƯỚNG ĐI TIẾP THEO:');
      r.insights.forEach((x, i) => lines.push(`${i + 1}. ${x.title}: ${x.text}`));
      lines.push('', '— Báo cáo tự động từ CAPPAN Demo.');
      return lines.join('\n');
    },

    toHtml(r) {
      const lines = this.summaryLines(r).map(x => `<li>${x.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</li>`).join('');
      const insights = r.insights.map(x => `<div style="margin:10px 0;padding:10px 12px;border:1px solid #E7C873;border-radius:10px;background:#FFFDF7"><strong>${x.icon} ${x.title}</strong><div style="font-size:13px;color:#5D4037">${x.text}</div></div>`).join('');
      return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Báo cáo ${r.label}</title></head>
<body style="margin:0;background:#F6EFE3;font-family:Arial,sans-serif;color:#3E2723">
<div style="max-width:720px;margin:24px auto;background:#FFFDF7;border:1.5px solid #E7C873;border-radius:18px;padding:24px;box-shadow:0 10px 28px rgba(111,78,55,.12)">
<h1 style="font-family:Georgia,serif;color:#4A2E20;margin:0 0 4px">CAPPAN — Báo cáo ${r.label}</h1>
<p style="color:#8A6A55;margin:0 0 18px">${new Date(r.from).toLocaleDateString('vi-VN')} – ${new Date(r.to).toLocaleDateString('vi-VN')}</p>
<ul style="line-height:1.8;padding-left:18px">${lines}</ul>
<h2 style="font-family:Georgia,serif;color:#4A2E20;margin-top:22px">Gợi ý hướng đi</h2>
${insights}
<p style="font-size:12px;color:#8A6A55;margin-top:20px">Báo cáo từ CAPPAN Demo · không phải báo cáo tài chính kiểm toán.</p>
</div></body></html>`;
    },

    toCsv(r) {
      const rows = [
        ['Kỳ', r.label],
        ['Từ', new Date(r.from).toISOString()],
        ['Đến', new Date(r.to).toISOString()],
        ['Doanh thu', r.revenue],
        ['Chênh lệch kỳ trước (%)', r.deltaPct],
        ['Đơn', r.orders],
        ['Hoàn tất', r.completed],
        ['Hủy', r.cancelled],
        ['AOV', r.aov],
        ['Giao hàng', r.byChannel.delivery],
        ['Tại quầy', r.byChannel.pos],
        ['Booking hoạt động', r.bookings.active],
        ['Đang giữ', r.bookings.held],
        ['No-show', r.bookings.no_show],
        ['Cọc đã thu', r.bookings.depositCollected],
        ['Cọc chờ thu', r.bookings.depositPending],
        ['Lấp bàn (%)', r.occupancy],
        [],
        ['Top món', 'Số lượng', 'Doanh thu']
      ];
      r.top.forEach(x => rows.push([x.name, x.qty, x.revenue]));
      rows.push([], ['Gợi ý', 'Nội dung']);
      r.insights.forEach(x => rows.push([x.title, x.text]));
      return '\uFEFF' + rows.map(row => row.map(cell => `"${String(cell == null ? '' : cell).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    },

    emailConfig() {
      try { return JSON.parse(localStorage.getItem(EMAIL_KEY) || '{}') || {}; }
      catch (e) { return {}; }
    },
    saveEmailConfig(cfg) {
      const safe = {
        recipient: String((cfg && cfg.recipient) || '').trim(),
        method: (cfg && cfg.method) === 'emailjs' ? 'emailjs' : 'mailto',
        serviceId: String((cfg && cfg.serviceId) || '').trim(),
        templateId: String((cfg && cfg.templateId) || '').trim(),
        publicKey: String((cfg && cfg.publicKey) || '').trim()
      };
      try { localStorage.setItem(EMAIL_KEY, JSON.stringify(safe)); } catch (e) {}
      return safe;
    },
    mailtoUrl(r, recipient) {
      const subject = `[CAPPAN] Báo cáo ${r.label} — ${new Date(r.to).toLocaleDateString('vi-VN')}`;
      const body = this.toText(r);
      return `mailto:${encodeURIComponent(recipient || '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body.slice(0, 1800))}`;
    },
    async sendEmailJS(r, cfg) {
      cfg = cfg || this.emailConfig();
      if (!cfg.serviceId || !cfg.templateId || !cfg.publicKey) {
        throw new Error('Chưa cấu hình EmailJS (service ID / template ID / public key).');
      }
      const payload = {
        service_id: cfg.serviceId,
        template_id: cfg.templateId,
        user_id: cfg.publicKey,
        template_params: {
          to_email: cfg.recipient || '',
          subject: `[CAPPAN] Báo cáo ${r.label}`,
          message: this.toText(r),
          html: this.toHtml(r),
          period: r.label
        }
      };
      const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error('EmailJS lỗi ' + res.status + (txt ? ': ' + txt.slice(0, 120) : ''));
      }
      return true;
    },
    download(filename, content, mime) {
      try {
        const blob = new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        return true;
      } catch (e) { return false; }
    }
  };

  window.ReportEngine = ReportEngine;
  if (typeof module !== 'undefined' && module.exports) module.exports = ReportEngine;
})();
