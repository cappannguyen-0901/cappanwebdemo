# NỘI DUNG PPT CAPPAN — BẢN CHI TIẾT
## 20 slide · dùng để tự thiết kế slide · bám theo source code

> **Thông điệp xuyên suốt:**
> CAPPAN không làm mọi thứ. CAPPAN giữ cho quán không bỏ sót bàn, không bán khống, và chủ quán biết ngay khi có chuyện.

---

# Slide 1 — Giới thiệu

## Nội dung trên slide

```text
CAPPAN
Lớp vận hành cho quán cà phê độc lập

32 chỗ · 4 tầng · 24 món · 5–10 nhân viên
26 trang web: 13 khách + 13 nhân viên
130 test · 24 smoke · 26 verify
```

## Lời nói

> “CAPPAN không phải một hệ điều hành thay thế mọi thứ. Đây là lớp vận hành giúp quán nhỏ giữ được ba thứ: bàn, đơn, và quyết định của chủ quán.”

## Điểm nhấn

- Khách không bị ép dùng điện thoại.
- Nhân viên không phải quản bàn thủ công.
- Chủ quán nhận báo cáo qua email.

---

# Slide 2 — Bối cảnh và mục tiêu

## Bối cảnh CAPPAN

```text
Quán 32 chỗ, 4 tầng
24 món, 6 nhóm
5–10 nhân viên
Khách: sinh viên, dân văn phòng, freelancer
```

## Vấn đề chung

- Bàn, đơn, kho, báo cáo nằm ở nhiều nơi.
- Giờ cao điểm dễ sót đơn, nhầm bàn.
- Chủ quán thiếu số liệu để quyết định.

## Mục tiêu

```text
1. Không ép mọi khách dùng điện thoại
2. Không ép mọi đơn phải có bàn
3. Nhân viên chỉ xử lý ngoại lệ
4. Một nguồn dữ liệu cho 3 vai
```

## Lời nói

> “Mục tiêu không phải thêm thật nhiều tính năng. Mục tiêu là bớt việc bị rơi.”

---

# Slide 3 — Ba vai, ba câu hỏi

## Khách hàng

```text
Có chỗ không?
Bao lâu có nước?
Có phải đứng dậy gọi thêm?
```

Giải pháp:

- sơ đồ bàn;
- QR gọi món;
- theo dõi đơn;
- gọi thêm trên web;
- Counter Pickup nếu không có điện thoại.

## Nhân viên

```text
Đơn nào làm trước?
Bàn nào đang dọn?
Ai mang nước ra?
```

Giải pháp:

- POS;
- Order Board;
- Runner View;
- BOM/tồn kho.

## Chủ quán

```text
Hôm nay bao nhiêu?
Mất gì?
Cần quyết gì?
```

Giải pháp:

- Owner Cockpit;
- email báo cáo;
- gợi ý hướng đi của AI.

## Câu chốt

> “Ba vai, một nguồn sự thật.”

---

# Slide 4 — Web giải quyết vấn đề gì cho khách?

## Vấn đề

| Vấn đề | Hậu quả |
|---|---|
| Không biết bàn trống | Phải hỏi nhân viên |
| Chờ lâu | Không biết khi nào có nước |
| Sợ ngồi nhầm bàn đã đặt | Tranh chấp |
| Ngại gọi thêm | Không gọi thêm |
| Không mang điện thoại | Bị chặn nếu chỉ có QR |

## Giải pháp

```text
Sơ đồ bàn trực tiếp
QR tại bàn + mã bàn
Theo dõi trạng thái đơn
Gọi thêm trên web
Counter Pickup tại quầy
```

## Lời nói

> “Không khách nào bị chặn vì không có điện thoại.”

---

# Slide 5 — Web giải quyết vấn đề gì cho nhân viên?

## Vấn đề

- Quản bàn, gán bàn, nhả bàn thủ công.
- Nhập đơn hai lần.
- Không biết đơn nào ưu tiên.
- Bàn đang dọn nhưng vẫn nhận khách.
- Mang nước sai bàn.

## Giải pháp

### POS

- Counter Pickup: không bàn, mã pickup.
- Table Service: bắt buộc chọn bàn.

### Tự động hóa

- Thanh toán xong → mở TableSession.
- Bàn → occupied.
- Order gắn session.

### Order Board

- 3 cột: Mới / Đang làm / Sẵn sàng.
- Chỉ đơn đã thanh toán.

### Runner View

- Chỉ Table Service ready.
- Số bàn + món.

## Câu chốt

> “Nhân viên không đánh dấu bàn. Hệ thống đánh dấu.”

---

# Slide 6 — Web giải quyết vấn đề gì cho chủ quán?

## Vấn đề

- Không biết doanh thu thật.
- Không biết hao hụt.
- Không biết no-show.
- Không có báo cáo đều đặn.
- Không có baseline để quyết định.

## Giải pháp

### Owner Cockpit

```text
Alert
Insight
Recommendation
```

### Báo cáo email

- doanh thu;
- đơn hoàn tất/hủy;
- AOV;
- kênh bán;
- booking/cọc;
- lấp bàn;
- top món;
- gợi ý AI.

### Kho

Chỉ báo cáo **ngày** mới thêm:

```text
SKU · sắp cạn · đã hết
```

## Lời nói

> “Chủ quán không cần nhìn 20 báo cáo. Chỉ cần biết việc gì cần quyết.”

---

# Slide 7 — Bốn service mode

## Nội dung

| Mode | Dùng khi | Bàn? |
|---|---|---|
| `counter_pickup` | Mua tại quầy, tự lấy | Không |
| `table_service` | Ngồi bàn, nhân viên mang ra | Có |
| `takeaway` | Mang đi | Không |
| `delivery` | Giao hàng | Không |

`booking` không phải mode riêng — là cờ trên `table_service`.

## Lời nói

> “Bốn mode, bốn lời hứa dịch vụ. Không ép tất cả vào một luồng.”

---

# Slide 8 — Quy trình khách 1: Counter Pickup

## Luồng

```text
Khách ra quầy
→ nhân viên nhập POS
→ chọn Counter Pickup
→ thu tiền
→ hệ thống sinh mã P01
→ khách ngồi khu tự do
→ tự lấy nước khi gọi số
```

## Điểm quan trọng

- Không tạo TableSession.
- Không cần bàn.
- Không cần QR.
- Không cần điện thoại.

## Dùng khi

- khách không mang điện thoại;
- khách chỉ mua nước, ngồi xíu;
- khách vội.

---

# Slide 9 — Quy trình khách 2: Table Service qua QR

## Luồng

```text
Khách ngồi bàn có QR
→ quét QR
→ nhập mã bàn 4 số
→ hệ thống kiểm tra trạng thái
→ bàn trống: mở TableSession + occupied
→ chọn món
→ thanh toán demo
→ Order Board
→ Runner View
→ nhân viên mang ra
```

## Chặn

- Bàn đang dọn → chặn.
- Bàn đã đặt → yêu cầu booking.
- Mã bàn sai → chặn.

## Điểm quan trọng

- Bàn được đánh dấu **ngay khi quét QR**, trước khi order.
- Không cần nhân viên thao tác.

---

# Slide 10 — Quy trình khách 3: Booking + cọc

## Luồng

```text
Đặt bàn + cọc
→ bàn reserved
→ khách đến
→ nhân viên check-in
→ mở TableSession
→ bàn occupied
→ order
→ tự trừ cọc
→ trả phần chênh
```

## Công thức

```text
Cọc = số người × giá ly rẻ nhất
depositApplied = min(depositRemaining, order.total)
amountDue = order.total - depositApplied
```

## Ví dụ

```text
Cọc 70.000đ
Order 55.000đ
→ trừ 55.000đ
→ còn 15.000đ
→ khách trả thêm 0đ

Order 2: 50.000đ
→ trừ 15.000đ
→ khách trả thêm 35.000đ
```

## Cuối phiên

- Cọc còn dư → hoàn/credit theo chính sách.
- Không nhân viên nào bấm trừ cọc tay.

---

# Slide 11 — Quy trình khách 4: Mang đi / giao hàng

## Mang đi

```text
Web/quầy
→ chọn món
→ thanh toán
→ mã pickup
→ Order Board
→ gọi số
```

## Giao hàng

```text
Web
→ địa chỉ
→ phí ship
→ thanh toán
→ Order Board
→ giao
```

## Điểm chung

- Không bàn.
- Không TableSession.
- Có mã pickup hoặc địa chỉ.

---

# Slide 12 — Quy trình nhân viên: POS

## Counter Pickup

```text
POS → chọn Counter Pickup
→ thu tiền
→ sinh mã P01
```

Không cần bàn.

## Table Service

```text
POS → chọn Table Service
→ bắt buộc chọn bàn
→ thu tiền
→ tự mở TableSession
→ bàn occupied
→ order gắn session
```

Không có bàn → không cho thu tiền.

## Lời nói

> “Một thao tác của nhân viên; phần còn lại hệ thống làm.”

---

# Slide 13 — Quy trình nhân viên: Order Board + Runner

## Order Board

```text
MỚI / ĐANG LÀM / SẴN SÀNG
```

- Chỉ đơn đã thanh toán.
- Sắp theo:
  1. giờ hứa;
  2. tuổi đơn;
  3. loại đơn.
- Thẻ có:
  - mã đơn;
  - bàn/mã pickup;
  - món;
  - tuổi đơn.
- Barista bấm Bắt đầu / Xong.
- Quản lý ca override, có audit.

## Runner View

- Chỉ Table Service ready.
- Số bàn + món.
- Nút Đã mang ra → served.
- Không nhận Counter Pickup.
- Không cần nhìn bảng lớn.

## Câu chốt

> “Barista không kiêm điều phối runner.”

---

# Slide 14 — Chủ quán: Owner Cockpit

## Alert

- nguyên liệu cạn;
- bàn đang dọn;
- khu tự do hết chỗ;
- đơn chờ lâu;
- booking quá hạn.

## Insight

- doanh thu hôm nay;
- món bán chạy;
- khung giờ vắng;
- hao hụt.

## Recommendation

- nhập nguyên liệu;
- mở thêm khu;
- điều chỉnh ca;
- gửi voucher.

## Cách hoạt động

- Dữ liệu lấy từ API/localStorage.
- Chủ quán bấm Đồng ý / Từ chối.
- Có audit.

---

# Slide 15 — Chủ quán nhận báo cáo qua email

## Báo cáo giữ bản cũ

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

## Chỉ báo cáo ngày thêm kho

```text
Kho hôm nay: 18 SKU
Sắp cạn: ...
Đã hết: ...
```

## Không thêm kho cho

- tuần;
- tháng;
- năm.

## Kênh gửi

- Demo: `mailto:` hoặc EmailJS.
- Production: SMTP/n8n.

## Lời nói

> “Báo cáo doanh thu có sẵn ở trang Thống kê; chỉ cần thêm trạng thái kho cho báo cáo ngày.”

---

# Slide 16 — AI/chatbot làm được gì?

## 1. Chat khách

- menu;
- giá;
- thành phần;
- đặt bàn;
- theo dõi đơn;
- đổi/hủy món.

## 2. Generative UI

- trả thẻ dữ liệu;
- nút hành động;
- không chỉ văn bản.

## 3. Hỗ trợ nhân viên

- tra đơn;
- booking;
- KPI;
- tồn kho.

## 4. Owner Copilot

- giải thích alert/insight;
- gợi ý hành động;
- trả lời câu hỏi vận hành.

## Nguyên tắc

```text
Không tự hủy
Không tự hoàn tiền
Không tự đổi giá
```

---

# Slide 17 — Kiến trúc AI/chatbot

## Pipeline

```text
1. Chuẩn hoá tiếng Việt
2. Phân loại ý định
3. Tách multi-intent
4. Kiểm tra an toàn
5. KB / LocalBrain / API
6. LLM khi cần
7. Generative UI
```

## Thành phần

- Fast-path cho câu đơn giản.
- Smart router.
- Context engine 10 lượt.
- Tool calling có phân quyền.
- Anti-hallucination guard.
- Human handover.

## Nguồn

```text
js/ai/brain.js
js/ai/ai-input.js
js/ai/multi-intent-splitter.js
js/ai/injection-guard.js
js/ai/handover.js
js/ai/ai-output.js
```

## Lời nói

> “Rule trước, LLM sau, dữ liệu là gốc.”

---

# Slide 18 — Kỹ thuật, thuật toán, công nghệ

## Thuật toán

- Intent classification bằng rule.
- Slot filling đặt bàn/đơn.
- Multi-intent splitter.
- Draft engine + context engine.
- Tool calling có phân quyền.
- Anti-hallucination.
- Human handover.

## Công nghệ

```text
HTML / CSS / JavaScript thuần
localStorage API
Web Speech API
LLM fallback (Groq/Gemini)
Generative UI
EmailJS / mailto
Static build 26 trang
```

## Kiểm thử

```text
130 test
24 smoke
26 verify
```

## Lời nói

> “Không chỉ gọi API: có lớp xử lý trước và sau LLM.”

---

# Slide 19 — Automation

## 3 rule thật trong `js/automation.js`

### Rule 1 — Nhả bàn held quá hạn

- 15 phút;
- trừ booking đã cọc;
- bàn về available.

### Rule 2 — Món hết nguyên liệu

- tự khoá menu;
- Order Board vẫn chạy.

### Rule 3 — BOM sắp cạn

- cảnh báo tồn kho;
- gợi ý nhập hàng.

## Cơ chế

```text
điều kiện · hành động · log · hoàn tác · dry-run
```

## Báo cáo email

- doanh thu + gợi ý AI;
- kho chỉ báo cáo ngày.

## Lời nói

> “Tự động hoá việc lặp lại, không thay quyết định.”

---

# Slide 19B — BOM: vì sao món tự hết?

## Nội dung trên slide

```text
BOM Matcha:
1 ly = 3g bột matcha

Tồn kho: 3g
→ maxServings = floor(3 / 3) = 1

Bán 1 ly:
stock = 0g
→ ingredientAvailable = false
→ menu.inStock = false
```

## Công thức

```text
qty = line.qty × sizeFactor × (1 + wasteRate) × quantity
maxServings = min(floor(stock / qty)) trên mọi dòng BOM
```

## Chuỗi tự động

```text
Order
→ checkItems
→ deductOrder
→ stock giảm
→ menu.getAll() tính lại
→ inStock = false
→ UI / AI / Order Board đều chặn
```

## Ví dụ

```text
Còn 3g matcha
Khách order 1 Matcha
→ bán được
→ tồn 0g
→ menu khoá Matcha
→ automation log ingredient_out
```

## Lời nói

> “Món không tự hết. BOM và tồn kho làm nó hết.”

## Điểm cần nhấn

- `maxServings` lấy theo nguyên liệu **eo hẹp nhất**.
- Size L tốn 1.25 lần.
- Hao hụt làm tăng lượng cần.
- Món không có BOM không bị khoá tự động.
- Automation chỉ log/gợi ý, không tự nhập kho.

---

# Slide 20 — Demo sản phẩm

## Chuẩn bị

```text
Table A1: table.html?table=A1&code=1234
Order Board: staff-order-board.html
Runner: staff-runner.html
Owner: staff-owner.html
Stats: staff-stats.html
POS: staff-cashier.html
```

Dùng cùng một cửa sổ Chrome, Ctrl + F5.

## Các bước

### 1. Khách

- mở Table A1;
- thêm Matcha;
- gửi order;
- chỉ “Thanh toán demo · trả trước”.

### 2. Order Board

- Bắt đầu;
- Xong.

### 3. Runner

- mở Runner View;
- Đã mang ra bàn.

### 4. Kho + Owner

- Ingredients: Matcha 3g;
- bán ly cuối;
- menu khoá;
- Owner alert + gợi ý.

### 5. POS

- Counter Pickup;
- thu tiền;
- đọc mã P01.

### 6. Email

- mở Stats;
- gửi email báo cáo;
- chỉ báo cáo ngày có kho.

## Câu chốt

> “Một order đi từ khách → bảng → runner → chủ quán. Không bill mở. Không ép QR.”

---

# Slide 21 — Tầm nhìn, hướng đi tiếp theo

## Phase 0 — Demo

```text
26 trang
localStorage
Order Board · Runner · Owner
```

## Phase 1 — Pilot 1 quán

```text
backend/API
QR payment
POS/hóa đơn đối tác
KPI 30 ngày
```

## Phase 2 — Production

```text
e-invoice
offline
backup
nhiều chi nhánh
phân quyền
```

## Định vị

> “Workflow layer, không thay POS thuế.”

## Kết

> “Khách tự chọn. Hệ thống giữ bàn. Nhân viên chỉ bưng nước và xử lý ngoại lệ.”

---

# Phụ lục — Số liệu và giới hạn

## Số liệu

```text
26 trang HTML
13 trang khách
13 trang nhân viên
130 test
24 smoke
26 verify
```

## Thật trong demo

- bàn;
- QR;
- TableSession;
- order;
- cọc;
- BOM;
- Order Board;
- Runner;
- Owner Cockpit;
- báo cáo.

## Giả lập / chưa có

- thanh toán QR thật;
- hóa đơn điện tử;
- POS đối tác;
- backend;
- multi-device;
- P0: atomic cọc, chỉ áp cọc đã trả, xử lý cọc dư.

## Câu chốt

> “Demo không giả vờ là production.”
