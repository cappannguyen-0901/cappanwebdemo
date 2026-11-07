# THUYẾT TRÌNH CAPPAN 3.0
## 12 slide · 12 phút · demo 4 phút

> **Thông điệp:** CAPPAN không làm mọi thứ. CAPPAN giữ cho quán không bỏ sót bàn, không bán khống, và chủ quán biết ngay khi có chuyện.

---

# 0. Chuẩn bị

Mở cùng một cửa sổ Chrome, Ctrl + F5:

```text
http://127.0.0.1:5173/
http://127.0.0.1:5173/staff-order-board.html?as=0900000002
http://127.0.0.1:5173/staff-runner.html?as=0900000002
http://127.0.0.1:5173/table.html?table=A1&code=1234
http://127.0.0.1:5173/staff-cashier.html?as=0900000002
http://127.0.0.1:5173/staff-owner.html?as=0900000002
```

Dự phòng: video 60–90 giây, ảnh 5 màn hình chính.

---

# Slide 1 — Giới thiệu (45 giây)

> “Quán 32 chỗ, 4 tầng, 5–10 nhân viên. Mỗi ngày có hàng trăm quyết định nhỏ: bàn nào trống, đơn nào trước, món nào sắp hết, chủ quán cần biết gì.
>
> CAPPAN không thay tất cả. CAPPAN giữ cho các quyết định đó không bị rơi.”

Định vị:

```text
Workflow layer cho quán cà phê độc lập
Không phải hệ điều hành
Không thay POS thuế
```

---

# Slide 2 — Ba vai, ba vấn đề (1 phút)

| Vai | Câu hỏi | Vấn đề |
|---|---|---|
| Khách | Có chỗ không? Bao lâu có nước? | Không biết, phải chờ, sợ nhầm bàn |
| Nhân viên | Đơn nào trước? Bàn nào dọn? | Quản bàn tay, dễ sót đơn |
| Chủ quán | Hôm nay mất gì? | Không hao hụt, no-show, baseline |

> “Ba người, ba câu hỏi, một nguồn sự thật thiếu.”

---

# Slide 3 — Quy trình khách (2 phút)

Bốn trường hợp:

## 1. Mua tại quầy

```text
Không điện thoại → POS → trả tiền → mã pickup → tự lấy
```

## 2. Ngồi bàn

```text
QR bàn → mã bàn → trả trước → Order Board → Runner
```

## 3. Đặt trước

```text
Cọc → check-in → mở phiên → tự trừ cọc → trả phần chênh
```

## 4. Mang đi / giao hàng

```text
Không bàn · mã pickup / phí ship · Order Board
```

Nhấn:

> “Không khách nào bị chặn vì không có điện thoại.”

---

# Slide 4 — Quy trình nhân viên (2 phút)

## Order Board

```text
MỚI → ĐANG LÀM → SẴN SÀNG
```

- Chỉ đơn đã thanh toán.
- Barista tự bấm Bắt đầu / Xong.
- Quản lý ca override.
- Không voice.

## Runner View

- Chỉ Table Service đã sẵn sàng.
- Số bàn + món.
- Nút “Đã mang ra”.

## POS

- Counter Pickup: không bàn, mã pickup.
- Table Service: bắt buộc chọn bàn, tự mở phiên + occupied.

> “Nhân viên không đánh dấu bàn. Hệ thống đánh dấu.”

---

# Slide 5 — Chủ quán + email (1,5 phút)

Owner Cockpit:

```text
Alert → Insight → Recommendation
```

- Alert: nguyên liệu cạn, bàn đang dọn, khu tự do hết chỗ.
- Insight: doanh thu, món bán chạy, khung giờ vắng.
- Recommendation: nhập hàng, mở khu, đổi ca.

Báo cáo email cuối ngày — giữ báo cáo cũ + thêm kho **chỉ cho báo cáo ngày**:

```text
Doanh thu
Đơn hoàn tất / hủy
AOV
Kênh bán
Booking / cọc
Lấp bàn
Top món
Gợi ý hướng đi của AI
Kho hôm nay: SKU · sắp cạn · đã hết
```

> “Báo cáo tuần/tháng/năm giữ nguyên như cũ, không thêm kho. Chỉ báo cáo ngày mới có trạng thái kho.”

---

# Slide 6 — AI/chatbot làm được gì (1,5 phút)

Bốn việc:

1. Chat khách: menu, giá, thành phần, đặt bàn, theo dõi đơn.
2. Generative UI: trả thẻ dữ liệu + nút hành động.
3. Hỗ trợ nhân viên: tra đơn, booking, KPI, tồn kho.
4. Owner Copilot: giải thích alert, gợi ý hành động.

> “AI không tự huỷ, không tự hoàn tiền, không tự đổi giá.”

---

# Slide 7 — Kiến trúc AI (1,5 phút)

Pipeline 6 tầng:

```text
Chuẩn hoá → Ý định → Dữ liệu → LLM → Guard → UI
```

- Rule trước, LLM sau.
- KB + LocalBrain + API nội bộ.
- LLM chỉ fallback.
- Chống bịa, kiểm chứng nguồn.
- Generative UI.

Công nghệ:

```text
HTML/CSS/JS · Web Speech API
localStorage API · LLM fallback · Generative UI
```

Thuật toán:

```text
intent classification · slot filling
draft engine · tool calling · anti-hallucination
```

---

# Slide 8 — Automation (1 phút)

Ba rule:

1. Nhả bàn held quá hạn.
2. Khoá món khi hết nguyên liệu.
3. Tổng hợp báo cáo cuối ngày + email.

> “Tự động hoá việc lặp lại, không thay quyết định.”

Demo: AutomationEngine trong tab. Production: n8n/worker + SMTP.

---

# Slide 9 — Demo (4 phút)

## Bước 1 — Khách tại bàn

1. Mở Table A1.
2. Thêm Matcha.
3. Gửi order.
4. Chỉ “Thanh toán demo · trả trước”.

## Bước 2 — Order Board

1. Bấm Bắt đầu.
2. Bấm Xong.
3. Mở Runner View → Đã mang ra.

## Bước 3 — Matcha + Owner

1. Ingredients: Matcha 3g.
2. Order ly cuối → menu khoá.
3. Owner: alert + recommendation.

## Bước 4 — Không điện thoại

1. POS: Counter Pickup.
2. Thu tiền.
3. Đọc mã pickup.

## Kết

> “Một order đi từ khách → bảng → runner → chủ quán. Không KDS voice. Không bill mở. Không ép QR.”

---

# Slide 10 — Minh chứng và giới hạn (1 phút)

```text
26 trang · 130 test · 24 smoke · 26 verify
```

Thật:

- bàn, QR, session;
- order, cọc, BOM;
- Order Board, Runner, Owner.

Giả lập:

- thanh toán;
- hóa đơn;
- POS đối tác.

> “Demo không giả vờ là production.”

Còn P0:

- atomic cọc;
- chỉ áp cọc đã trả;
- xử lý cọc dư.

---

# Slide 11 — Tầm nhìn (45 giây)

```text
Phase 0 — Demo
Phase 1 — Pilot 1 quán
Phase 2 — Production
```

- Phase 1: backend/API, QR payment, POS/hóa đơn đối tác, KPI 30 ngày.
- Phase 2: e-invoice, offline, backup, nhiều chi nhánh.

> “Workflow layer, không thay POS thuế.”

---

# Slide 12 — Kết (30 giây)

> “CAPPAN không làm mọi thứ.  
> Nó giúp quán không bán khống, không bỏ sót bàn, và chủ quán biết ngay khi có chuyện.”

Câu cuối:

> “Khách tự chọn. Hệ thống giữ bàn. Nhân viên chỉ bưng nước và xử lý ngoại lệ.”

---

# Q&A dự kiến

| Câu hỏi | Trả lời |
|---|---|
| Sao bỏ KDS/voice? | STT tiếng Việt trong môi trường ồn không ổn định; bỏ khỏi MVP, giữ Order Board |
| Hóa đơn điện tử? | Adapter demo; production cần đối tác và xác nhận thuế |
| Có POS thật? | Chưa; demo là Order Layer + adapter giả lập |
| AI có tự đặt món? | Không; AI tư vấn, khách xác nhận |
| Booking thế nào? | Check-in mở session; cọc tự trừ; slot là đề xuất |
| Có đo chưa? | Chưa pilot; KPI trong báo cáo |
