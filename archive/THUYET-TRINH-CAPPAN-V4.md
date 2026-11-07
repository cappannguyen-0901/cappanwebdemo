# THUYẾT TRÌNH CAPPAN 4.0
## 10 slide · 10–12 phút · bám theo source code

> **Một câu xuyên suốt:** CAPPAN không làm mọi thứ. CAPPAN giữ cho quán không bỏ sót bàn, không bán khống, và chủ quán biết ngay khi có chuyện.

---

# Slide 1 — Giới thiệu (45 giây)

> “Quán 32 chỗ, 4 tầng, 5–10 nhân viên. Mỗi ngày có hàng trăm quyết định nhỏ: bàn nào trống, đơn nào trước, món nào sắp hết, chủ quán cần biết gì.
>
> CAPPAN không thay tất cả. CAPPAN giữ cho các quyết định đó không bị rơi.”

Nói ngắn:

```text
Workflow layer cho quán cà phê độc lập
26 trang: 13 khách + 13 nhân viên
130 test · 24 smoke · 26 verify
```

---

# Slide 2 — Web giải quyết vấn đề gì? (1,5 phút)

## Khách hàng

```text
Không biết chỗ → sơ đồ bàn
Chờ lâu → theo dõi đơn
Sợ nhầm bàn → QR + mã bàn
Ngại gọi thêm → gọi trên web
Không có điện thoại → Counter Pickup
```

## Nhân viên

```text
Quản bàn tay → hệ thống tự mở phiên
Sót đơn → Order Board
Không biết đơn nào trước → 3 cột Mới/Đang làm/Sẵn sàng
Mang nước → Runner View
```

## Chủ quán

```text
Không biết doanh thu → báo cáo
Không biết hao hụt → BOM/tồn kho
Không biết việc cần quyết → Alert/Insight/Recommendation
Không có báo cáo đều → email báo cáo
```

> “Ba vai, một nguồn sự thật.”

---

# Slide 3 — Quy trình và trường hợp khách (2 phút)

## 1. Mua tại quầy

```text
Không điện thoại
→ nhân viên nhập POS
→ Counter Pickup
→ trả tiền
→ nhận mã pickup
→ tự lấy nước
```

Không bàn, không QR, không session.

## 2. Ngồi bàn

```text
QR bàn
→ nhập mã bàn
→ hệ thống mở TableSession
→ bàn occupied
→ trả trước
→ Order Board → Runner
```

## 3. Đặt trước

```text
Đặt bàn + cọc
→ check-in
→ mở phiên
→ order
→ tự trừ cọc
→ trả phần chênh
```

## 4. Mang đi / giao hàng

```text
Không bàn
Mã pickup / địa chỉ + phí ship
Order Board
```

> “Không khách nào bị chặn vì không có điện thoại.”

---

# Slide 4 — Quy trình nhân viên (2 phút)

## POS

```text
Counter Pickup: không bàn, mã pickup
Table Service: bắt buộc chọn bàn
→ thanh toán → tự mở phiên → occupied
```

## Order Board

```text
MỚI / ĐANG LÀM / SẴN SÀNG
Chỉ đơn đã thanh toán
Barista bấm Bắt đầu / Xong
Quản lý ca override
Không voice
```

## Runner View

```text
Chỉ Table Service đã sẵn sàng
Số bàn + món
Đã mang ra bàn
```

> “Nhân viên không đánh dấu bàn. Hệ thống đánh dấu.”

---

# Slide 5 — Chủ quán biết qua email báo cáo (1,5 phút)

Owner Cockpit:

```text
Alert → Insight → Recommendation
```

Email báo cáo giữ bản cũ:

```text
Doanh thu
Đơn hoàn tất / hủy
AOV
Kênh bán
Booking / cọc
Lấp bàn
Top món
Gợi ý hướng đi của AI
```

Riêng báo cáo **ngày** thêm:

```text
Kho hôm nay: SKU · sắp cạn · đã hết
Sắp cạn: ...
Đã hết: ...
```

> “Báo cáo tuần/tháng/năm giữ nguyên, không thêm kho. Chỉ báo cáo ngày mới có kho.”

---

# Slide 6 — AI/chatbot làm được gì (1,5 phút)

Bốn việc:

1. **Chat khách**: menu, giá, thành phần, đặt bàn, theo dõi đơn.
2. **Generative UI**: trả thẻ dữ liệu + nút hành động.
3. **Hỗ trợ nhân viên**: tra đơn, booking, KPI, tồn kho.
4. **Owner Copilot**: giải thích alert, gợi ý hành động.

> “AI không tự huỷ, không tự hoàn tiền, không tự đổi giá.”

---

# Slide 7 — Kiến trúc AI, kỹ thuật, thuật toán, công nghệ (2 phút)

## Pipeline

```text
Chuẩn hoá tiếng Việt
→ phân loại ý định
→ tách multi-intent
→ kiểm tra an toàn
→ gọi handler nội bộ / KB / LocalBrain
→ LLM chỉ khi cần
→ Generative UI
```

## Kỹ thuật / thuật toán

```text
Rule-based intent
Slot filling
Draft engine
Multi-intent splitter
Tool calling
Anti-hallucination guard
Human handover
```

## Công nghệ

```text
HTML / CSS / JavaScript thuần
localStorage API
Web Speech API
LLM fallback
Generative UI
EmailJS / mailto
```

Nguồn chính:

```text
js/ai/brain.js
js/ai/multi-intent-splitter.js
js/ai/injection-guard.js
js/ai/handover.js
js/ai/ai-output.js
```

---

# Slide 8 — Automation (1 phút)

Ba rule:

1. **Nhả bàn held quá hạn** — 15 phút, trừ booking đã cọc.
2. **Món hết nguyên liệu** — tự khoá menu, Order Board vẫn chạy.
3. **BOM sắp cạn** — cảnh báo tồn kho, gợi ý nhập hàng.

Mỗi rule có:

```text
điều kiện · hành động · log · hoàn tác
```

Báo cáo email: tổng hợp doanh thu + gợi ý AI; kho chỉ thêm cho báo cáo ngày.

> “Tự động hoá việc lặp lại, không thay quyết định.”

---

# Slide 9 — Demo sản phẩm (3–4 phút)

## Chuẩn bị

```text
http://127.0.0.1:5173/table.html?table=A1&code=1234
http://127.0.0.1:5173/staff-order-board.html?as=0900000002
http://127.0.0.1:5173/staff-runner.html?as=0900000002
http://127.0.0.1:5173/staff-owner.html?as=0900000002
```

## Các bước

1. Table A1: thêm Matcha, gửi order.
2. Order Board: Bắt đầu → Xong.
3. Runner: Đã mang ra bàn.
4. Ingredients: Matcha 3g → bán ly cuối → menu khoá.
5. Owner: alert + gợi ý.
6. POS: Counter Pickup → mã pickup.

Câu chốt:

> “Một order đi từ khách → bảng → runner → chủ quán. Không KDS voice. Không bill mở. Không ép QR.”

---

# Slide 10 — Tầm nhìn, hướng đi tiếp theo (1 phút)

```text
Phase 0 — Demo hôm nay
26 trang · localStorage
Order Board · Runner · Owner

Phase 1 — Pilot 1 quán
backend/API · QR payment
POS/hóa đơn đối tác · KPI 30 ngày

Phase 2 — Production
e-invoice · offline · backup
nhiều chi nhánh · phân quyền
```

> “Workflow layer, không thay POS thuế.”

Kết:

> “Khách tự chọn. Hệ thống giữ bàn. Nhân viên chỉ bưng nước và xử lý ngoại lệ.”

---

# Q&A nhanh

| Câu hỏi | Trả lời |
|---|---|
| AI có tự đặt món? | Không; AI tư vấn, khách xác nhận |
| Báo cáo email có kho không? | Chỉ báo cáo ngày; tuần/tháng/năm giữ nguyên |
| Có POS thật chưa? | Chưa; demo dùng adapter giả lập |
| Hóa đơn điện tử? | Chưa; production cần đối tác và xác nhận thuế |
| Không có điện thoại? | Counter Pickup tại quầy |
| Dữ liệu ở đâu? | localStorage; production cần backend |
