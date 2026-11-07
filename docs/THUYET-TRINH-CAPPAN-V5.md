# THUYẾT TRÌNH CAPPAN 5.0
## 16 slide · 12–15 phút · bám theo source code

> **Thông điệp:** CAPPAN không làm mọi thứ. CAPPAN giữ cho quán không bỏ sót bàn, không bán khống, và chủ quán biết ngay khi có chuyện.

---

# Slide 1 — Giới thiệu

- CAPPAN: lớp vận hành cho quán cà phê độc lập.
- Bối cảnh: 32 chỗ, 4 tầng, 24 món, 5–10 nhân viên.
- Demo: 26 trang (13 khách + 13 nhân viên), 130 test.
- Không thay POS thuế; không dùng KDS voice.

Câu nói:

> “Mỗi ngày quán có hàng trăm quyết định nhỏ. CAPPAN giữ cho chúng không bị rơi.”

---

# Slide 2 — Bài toán và mục tiêu

## Bối cảnh

- Quán nhỏ, nhiều tầng, nhân sự mỏng.
- Khách hỏi chỗ, nhân viên quản bàn tay, chủ quán thiếu số.
- Dữ liệu nằm rải rác.

## Mục tiêu

```text
Không ép mọi khách dùng điện thoại
Không ép mọi đơn phải có bàn
Nhân viên chỉ xử lý ngoại lệ
Một nguồn dữ liệu cho 3 vai
```

---

# Slide 3 — Ba vai

## Khách

- Có chỗ không?
- Bao lâu có nước?
- Có phải đứng dậy gọi thêm?

## Nhân viên

- Đơn nào làm trước?
- Bàn nào đang dọn?
- Ai mang ra?

## Chủ quán

- Hôm nay bao nhiêu?
- Mất gì?
- Cần quyết gì?

Giải pháp:

```text
Khách: sơ đồ bàn · QR · theo dõi đơn
Nhân viên: POS · Order Board · Runner
Chủ: Owner Cockpit · email báo cáo
```

---

# Slide 4 — Bốn trường hợp khách

## 1. Counter Pickup

```text
Không điện thoại → POS → trả tiền → mã P01 → tự lấy
```

Không bàn, không session.

## 2. Table Service

```text
QR bàn → mã bàn → trả trước → nhân viên mang ra
```

## 3. Booking

```text
Cọc → check-in → mở phiên → order → tự trừ cọc
```

## 4. Takeaway / Delivery

```text
Mã pickup / địa chỉ + phí ship
Không bàn
```

---

# Slide 5 — Bàn, phiên, cọc

## Trạng thái bàn

```text
Trống → Giữ → Có khách → Đang dọn
```

- QR bàn trống: mở phiên + occupied ngay.
- Bàn đang dọn/đã đặt: chặn.
- Mã bàn 4 số, đổi sau khi dọn.
- Counter Pickup không có trạng thái bàn.

## Cọc

```text
depositApplied = min(depositRemaining, order.total)
```

Ví dụ:

```text
Cọc 70k · order 55k
→ trừ 55k · còn 15k
→ amountDue = 0

Order 2: 50k
→ trừ 15k · khách trả 35k
```

Cuối phiên: hoàn/credit phần dư theo chính sách.

---

# Slide 6 — POS

## Counter Pickup

- Không cần bàn.
- Thu tiền → sinh mã pickup.
- Không tạo TableSession.

## Table Service

- Bắt buộc chọn bàn.
- Thanh toán xong:
  - mở TableSession;
  - bàn occupied;
  - order gắn session.
- Không có bàn → không cho thu tiền.

---

# Slide 7 — Order Board + Runner

## Order Board

- 3 cột: Mới / Đang làm / Sẵn sàng.
- Chỉ đơn đã thanh toán.
- Sắp theo giờ hứa + tuổi đơn + loại đơn.
- Barista bấm Bắt đầu / Xong.
- Quản lý ca override, có audit.

## Runner View

- Chỉ Table Service đã sẵn sàng.
- Số bàn + món + mã đơn.
- Nút Đã mang ra → served.
- Không nhận Counter Pickup.

---

# Slide 8 — Chủ quán + email

## Owner Cockpit

```text
Alert → Insight → Recommendation
```

## Email báo cáo

Giữ báo cáo cũ:

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

Chỉ báo cáo **ngày** thêm:

```text
Kho hôm nay: SKU · sắp cạn · đã hết
```

Tuần/tháng/năm: giữ nguyên, không kho.

---

# Slide 9 — AI/chatbot làm được gì

1. Chat khách: menu, giá, thành phần, đặt bàn, theo dõi đơn, đổi/hủy.
2. Generative UI: thẻ dữ liệu + nút hành động.
3. Hỗ trợ nhân viên: tra đơn, booking, KPI, tồn kho.
4. Owner Copilot: giải thích alert/insight, gợi ý hành động.

Nguyên tắc:

```text
Không tự hủy
Không tự hoàn tiền
Không tự đổi giá
```

---

# Slide 10 — Kiến trúc AI

Pipeline:

```text
Chuẩn hoá tiếng Việt
→ phân loại ý định
→ tách multi-intent
→ kiểm tra an toàn
→ KB / LocalBrain / API
→ LLM khi cần
→ Generative UI
```

Thành phần:

- Fast-path cho câu đơn giản.
- Smart router.
- Context engine 10 lượt.
- Tool calling có phân quyền.
- Guard + human handover.

Nguồn:

```text
js/ai/brain.js
js/ai/multi-intent-splitter.js
js/ai/injection-guard.js
js/ai/handover.js
js/ai/ai-output.js
```

---

# Slide 11 — Thuật toán và công nghệ

## Thuật toán

- Intent classification bằng rule.
- Slot filling đặt bàn/đơn.
- Multi-intent splitter.
- Draft engine + context engine.
- Tool calling có phân quyền.
- Anti-hallucination.
- Human handover.

## Công nghệ

- HTML / CSS / JavaScript thuần.
- localStorage API.
- Web Speech API.
- LLM fallback (Groq/Gemini).
- Generative UI.
- EmailJS / mailto.
- Static build 26 trang.

---

# Slide 12 — Automation

Ba rule trong `js/automation.js`:

1. Nhả bàn held quá hạn — 15 phút, trừ booking đã cọc.
2. Món hết nguyên liệu — tự khoá menu.
3. BOM sắp cạn — cảnh báo tồn kho.

Mỗi rule:

```text
điều kiện · hành động · log · hoàn tác · dry-run
```

Báo cáo email: doanh thu + gợi ý AI; kho chỉ báo cáo ngày.

---

# Slide 13 — Demo

## Chuẩn bị

```text
Table A1: table.html?table=A1&code=1234
Order Board: staff-order-board.html
Runner: staff-runner.html
Owner: staff-owner.html
Stats: staff-stats.html
```

## Các bước

1. Table A1: thêm Matcha, gửi order.
2. Order Board: Bắt đầu → Xong.
3. Runner: Đã mang ra.
4. Ingredients: Matcha 3g → hết, menu khoá.
5. Owner: alert + gợi ý.
6. POS: Counter Pickup → mã P01.

Câu chốt:

> “Một order đi từ khách → bảng → runner → chủ quán.”

---

# Slide 14 — Minh chứng và giới hạn

Thật:

- bàn, QR, TableSession;
- order, cọc, BOM;
- Order Board, Runner;
- Owner Cockpit, báo cáo;
- 130 test, 26 trang.

Giả lập/chưa có:

- thanh toán QR thật;
- hóa đơn điện tử;
- POS đối tác;
- backend/multi-device;
- P0: atomic cọc, cọc dư.

---

# Slide 15 — Tầm nhìn

```text
Phase 0 — Demo
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

---

# Slide 16 — Kết

> “CAPPAN không làm mọi thứ.
> Nó giúp quán không bán khống, không bỏ sót bàn, và chủ quán biết ngay khi có chuyện.”

> “Khách tự chọn. Hệ thống giữ bàn. Nhân viên chỉ bưng nước và xử lý ngoại lệ.”
