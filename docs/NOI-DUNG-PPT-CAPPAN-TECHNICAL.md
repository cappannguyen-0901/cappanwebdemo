# NỘI DUNG PPT CAPPAN — BẢN KỸ THUẬT CHI TIẾT
## Dùng để tự thiết kế slide · bám theo source code · không sơ sài

> **Thông điệp:** CAPPAN không làm mọi thứ. CAPPAN giữ cho quán không bỏ sót bàn, không bán khống, và chủ quán biết ngay khi có chuyện.

---

# PHẦN A — KIẾN TRÚC WEB VÀ NGHIỆP VỤ

## A.1. Kiến trúc tổng thể

CAPPAN là ứng dụng web tĩnh, không backend ở bản demo. Toàn bộ dữ liệu nằm trong `localStorage`; giao diện gọi qua một lớp API duy nhất.

```text
HTML/CSS/JS
   ↓
API Facade (js/api/index.js)
   ↓
localStorage
   ↑
Realtime (BroadcastChannel + storage event)
```

### Thành phần

| Thành phần | File | Vai trò |
|---|---|---|
| API Facade | `js/api/index.js` | Một cửa vào dữ liệu: orders, seats, tableSessions, bookings, ingredients, pos, promotions |
| Realtime | `js/realtime.js` | Đồng bộ tab, phát `cappan:sync` |
| Automation | `js/automation.js` | Rule nền: nhả bàn, kho, BOM |
| Report Engine | `js/report-engine.js` | Báo cáo, CSV, HTML, email |
| AI Input | `js/ai/ai-input.js` | Chuẩn hoá, phân loại, entity, multi-intent |
| AI Brain | `js/ai/brain.js` | Router, tool calling, LLM fallback, Generative UI |
| AI Output | `js/ai/ai-output.js` | Validate card, truncate, chống lỗi UI |
| Guards | `js/ai/injection-guard.js`, `handover.js` | Chặn prompt injection, chuyển người |
| Pages | 26 HTML | 13 khách + 13 nhân viên |

### Vì sao chọn local-first?

- Demo chạy offline, không cần server.
- Dễ trình bày, không phụ thuộc mạng.
- Đổi lại: không multi-device thật, không phân quyền server, không giao dịch thật.

---

## A.2. Data model cốt lõi

### Order

```js
{
  id, userId,
  serviceType: 'counter_pickup' | 'table_service' | 'takeaway' | 'delivery',
  source: 'qr_table' | 'counter_pos' | 'web',
  tableId, tableSessionId, bookingId,
  items: [{ itemId, qty, size }],
  subtotal, discount, shipping, total,
  depositApplied, amountDue,
  paymentMethod, paymentStatus,
  kitchenCode, pickupCode,
  kitchenStatus: 'submitted' | 'preparing' | 'ready' | 'served',
  createdAt
}
```

### TableSession

```js
{
  id, tableId,
  status: 'active' | 'closed',
  bookingId,
  depositTotal, depositUsed, depositRemaining,
  openedAt, closedAt
}
```

### Table state

```text
available → held → occupied → cleaning → available
```

Chỉ áp dụng bàn Table Service. Counter Pickup không có trạng thái bàn.

### Booking

```js
{
  id, userId, seatId,
  date, time, guests,
  deposit, depositPaid,
  status: 'confirmed' | 'held' | 'seated' | 'completed' | 'no_show' | 'cancelled'
}
```

---

## A.3. Luồng khách — chi tiết

### 1. Counter Pickup

```text
Khách ra quầy
→ nhân viên chọn Counter Pickup
→ thêm món
→ thu tiền
→ API sinh pickupCode P01
→ order.paymentStatus = paid
→ order vào Order Board
→ khách tự lấy khi gọi số
```

- Không tạo `TableSession`.
- Không cần `tableId`.
- Không cần QR.

### 2. Table Service qua QR

```text
Khách quét QR bàn
→ nhập mã bàn 4 số
→ API kiểm tra trạng thái bàn
→ nếu available: mở TableSession + set occupied
→ khách chọn món
→ thanh toán demo
→ order gắn tableId + tableSessionId
→ Order Board
→ Runner View
```

Chặn:

- bàn `cleaning`;
- bàn `booked`/`held` nhưng không có booking code;
- mã bàn sai.

### 3. Booking + cọc

```text
Đặt bàn + cọc
→ booking.status = confirmed
→ khách đến
→ nhân viên check-in
→ booking.status = seated
→ API.tableSessions.open(seatId, booking)
→ bàn occupied
→ session.depositRemaining = booking.deposit
→ order
→ applyDeposit(sessionId, order.total)
```

Công thức:

```text
depositApplied = min(session.depositRemaining, order.total)
amountDue = order.total - depositApplied
session.depositRemaining -= depositApplied
```

Ví dụ:

```text
Cọc 70.000đ
Order 55.000đ
→ depositApplied = 55.000đ
→ amountDue = 0đ
→ còn 15.000đ

Order 2: 50.000đ
→ depositApplied = 15.000đ
→ amountDue = 35.000đ
```

### 4. Takeaway / Delivery

```text
Không bàn
Không TableSession
Takeaway: pickupCode
Delivery: address + shipping
```

---

## A.4. Luồng nhân viên — chi tiết

### POS

```text
Counter Pickup:
  không cần bàn → tạo pickupCode

Table Service:
  bắt buộc chọn bàn
  → API.tableSessions.open(tableId)
  → bàn occupied
  → order gắn tableSessionId
```

### Order Board

```text
Cột: Mới / Đang làm / Sẵn sàng
Chỉ order.paymentStatus = paid
Sắp xếp:
  1. due_at
  2. age
  3. serviceType weight
Barista: Bắt đầu / Xong
Quản lý ca: override + audit
```

### Runner View

```text
Chỉ table_service + kitchenStatus = ready
Hiện: số bàn, món, mã đơn
Nút: Đã mang ra → served
```

---

## A.5. Báo cáo và email

### Report Engine

`js/report-engine.js` gồm:

```text
build(period)
summaryLines(report)
toText(report)
toHtml(report)
toCsv(report)
mailtoUrl(report, recipient)
sendEmailJS(report, config)
```

### Nội dung báo cáo

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
Kho hôm nay: 18 SKU · 1 sắp cạn · 0 đã hết
Sắp cạn: Bột matcha
Đã hết: Không
```

Điều kiện code:

```js
if (r.period === 'today') {
  // thêm inventory vào summaryLines / CSV
}
```

Tuần/tháng/năm: không thêm kho.

### Kênh gửi

- Demo: `mailto:` hoặc EmailJS.
- Production: SMTP/n8n.

---

# PHẦN B — AI VÀ CHATBOT

## B.1. AI làm được gì

### Chat khách

- menu, giá, thành phần;
- gợi ý món theo khẩu vị/ngân sách;
- đặt bàn;
- theo dõi đơn;
- đổi/hủy món;
- hỏi giờ mở cửa, wifi, địa chỉ, gửi xe.

### Generative UI

AI không chỉ trả text. Nó trả các khối:

```text
[UI_MENU]...[/UI_MENU]
[UI_BOOKING_CONFIRM]...[/UI_BOOKING_CONFIRM]
[UI_ORDER]...[/UI_ORDER]
[UI_HANDOVER]...[/UI_HANDOVER]
```

UI đọc JSON trong block và render card + nút hành động.

### Hỗ trợ nhân viên

- tra đơn;
- tra booking;
- KPI;
- tồn kho;
- công thức pha chế;
- lịch ca.

### Owner Copilot

- giải thích alert/insight;
- gợi ý nhập hàng/mở khu/đổi ca;
- trả lời câu hỏi vận hành.

### Nguyên tắc

```text
AI không tự hủy
AI không tự hoàn tiền
AI không tự đổi giá
```

---

## B.2. Kiến trúc AI — pipeline thực tế

### Sơ đồ

```text
User input
  ↓
AIInput.process()
  - normalize
  - validate
  - detectLang
  - classify intent
  - extract entities
  - splitMulti
  ↓
AIBrain._streamReplyCore()
  - cache
  - injection guard
  - staff fast path
  - multi-intent
  - draft engine
  - KBFast / LocalBrain
  - tool calling
  - LLM fallback
  ↓
AIOutput.build()
  - truncate
  - validate cards
  - dedupe
  - intro
  ↓
UI render
```

### 1. Chuẩn hoá

`AIInput.normalize(raw)`:

- lowercase;
- NFD + bỏ dấu;
- đ → d;
- bỏ ký tự đặc biệt;
- chuẩn hoá teencode:

```text
ko → khong
k → khong
dc → duoc
sdt → so dien thoai
cf/cafe → ca phe
nhiu → bao nhieu
```

- dấu phẩy/chấm phẩy → `va`.

### 2. Validate

`AIInput.validate`:

```text
MAX_LEN = 500
BLOCK_LEN = 2000
empty, too_long, blocked_length, injection
```

Chặn prompt injection sớm.

### 3. Phân loại ý định

`AIInput._intent` dùng rule, trả về một trong:

```text
kb_static, kb_faq, seat_query, drink_query, price_query,
action_write, data_query, greeting, thanks, cancel,
reco_query, health_fit, compare, booking_flow, order_flow,
unknown
```

Ví dụ:

- `wifi` → `kb_static`;
- `đặt bàn 2 người` → `booking_flow`;
- `đơn của tôi` → `data_query`;
- `hủy đơn` → `action_write`;
- `món ít ngọt` → `reco_query`.

### 4. Entity extraction

`AIInput._entities`:

```text
seatIds: A1..D12
orderIds: OD...
bookingIds: BK...
menuIds: M...
guests: 1..10
time: 19:00
date: today/tomorrow
floor: F1..F4
```

### 5. Multi-intent

`MultiIntentSplitter`:

- đếm động từ + entity;
- tách theo dấu `,`, `;`, `và`, `rồi`, `sau đó`;
- confidence;
- giới hạn số nhánh;
- mỗi nhánh xử lý riêng, rồi gộp.

Ví dụ:

```text
“đặt bàn 2 người 19h và gợi ý món ít ngọt”
→ booking branch
→ recommendation branch
```

### 6. Fast path

`FAST_PATH` trả lời ngay các câu:

- chào;
- wifi;
- địa chỉ;
- giờ mở cửa;
- hotline;
- gửi xe.

Mục tiêu: <100ms, không gọi LLM.

### 7. KBFast / LocalBrain

- `KBFast.answer` tra Knowledge Base.
- `LocalBrain` xử lý hội thoại có ngữ cảnh.
- Nếu confidence ≥ `AI_LOCAL_MIN_CONF = 0.5`, trả luôn.

### 8. Tool calling

`AI_TOOLS` gồm:

```text
get_menu, search_menu, get_promotions, check_seats,
get_order_status, cancel_my_order, cancel_order,
search_customer_history, get_recipe, get_revenue_stats,
get_shift_schedule, get_staff_list, cancel_my_booking,
update_booking, reset_all_seats, reset_seat
```

Mỗi tool có `roles`:

```text
customer / staff
```

Tool nguy hiểm:

```text
cancel_my_order
cancel_order
cancel_my_booking
update_booking
reset_all_seats
reset_seat
```

Quy tắc:

- kiểm tra role trước;
- tool nguy hiểm cần xác nhận;
- không để LLM tự gọi tool ngoài quyền.

### 9. LLM fallback

`AI_CONFIG`:

```text
temperature: 0.4
timeoutMs: 15000
cooldownMs: 60000
local-first: true
min confidence: 0.5
```

Provider:

```text
Groq: openai/gpt-oss-20b, gpt-oss-120b
Gemini: gemini-3.8-flash, gemini-3.6-flash
```

Có proxy và slot/cooldown để tránh quá tải.

LLM chỉ nhận:

- system prompt;
- history đã lọc;
- context;
- tool results.

Không nhận toàn bộ localStorage.

### 10. AIOutput

`AIOutput.build`:

- text tối đa 800 ký tự;
- tối đa 12 card;
- mỗi card tối đa 4096 bytes;
- chống trùng card;
- tự thêm câu dẫn nếu chỉ có card;
- fallback message nếu rỗng.

### 11. Guard

- `InjectionGuard`: chặn prompt injection.
- `Handover`: chuyển nhân viên khi khách bực/k hông hài lòng.
- `IntentAuthorization`: kiểm tra quyền tool.
- `AIOutput`: chặn card lỗi.

---

## B.3. Thuật toán chính

### Intent classification

```text
if greeting → greeting
if thanks → thanks
if cancel → cancel
if health → health_fit
if compare → compare
if action_write → action_write
if data_query → data_query
if kb_static → kb_static
if faq → kb_faq
if taste → reco_query
if seat → seat_query
if booking → booking_flow
if order → order_flow
if price → price_query
if drink → drink_query
else unknown
```

### Slot filling

Ví dụ đặt bàn:

```text
state = {
  guests, date, time, seatId
}
```

Nếu thiếu:

- thiếu người → hỏi số người;
- thiếu giờ → hỏi giờ;
- thiếu ngày → mặc định hôm nay;
- thiếu bàn → gợi ý bàn trống.

### Tool calling loop

```text
LLM trả tool_calls
→ kiểm tra role
→ chạy tool
→ đưa kết quả vào messages
→ LLM trả lời cuối
```

Giới hạn vòng lặp để tránh treo.

### Anti-hallucination

- giá/menu/tồn kho lấy từ API;
- không để LLM tự bịa;
- câu ngoài phạm vi → handover;
- output có nguồn `rule`, `local`, `llm`, `draft`, `guard`.

---

# PHẦN C — AUTOMATION

## C.1. Kiến trúc

`js/automation.js`:

```text
AutomationEngine.init()
  → run() ngay
  → setInterval(run, 5000)
  → nghe cappan:sync → scheduleRun 250ms
  → visibilitychange → run()
```

### Cấu hình

```js
DEFAULTS = {
  enabled: true,
  heldEnabled: true,
  heldMinutes: 15,
  stockEnabled: true,
  ingredientEnabled: true
}
```

### Log

- tối đa 80 bản ghi;
- mỗi bản ghi có `at`, `action`, `title`, `message`, `undo`;
- phát `cappan:automation`.

---

## C.2. Rule 1 — Nhả bàn held quá hạn

Điều kiện:

```text
booking.status = held
booking.depositPaid = false
now >= bookingTime + heldMinutes
```

Nếu chuyển khoản chờ:

```text
now - heldAt >= heldMinutes
```

Hành động:

```text
API.bookings.autoReleaseHeld(id)
→ bàn available
→ log
→ undo: held_restore
```

---

## C.3. Rule 2 — Món hết hàng

`syncStockRule`:

```text
API.menu.getOutOfStock()
→ log món hết
→ UI/API đã chặn đặt
```

Khi có hàng lại:

```text
stock_restore
```

---

## C.4. Rule 3 — BOM sắp cạn

`syncIngredientRule`:

```text
m.inventoryManaged
m.ingredientAvailable
m.maxServings
```

Trạng thái:

```text
out: !ingredientAvailable
low: maxServings <= 2
ok
```

Log:

```text
ingredient_out
ingredient_low
ingredient_restore
```

---

## C.5. Dry-run và undo

`dryRun()` trả:

```text
expired bookings
outOfStock
lowIngredients
```

Không ghi dữ liệu.

Undo:

```text
held_restore
```

Các rule kho chỉ log, không tự nhập kho.

---

# PHẦN D — DEMO

## D.1. Chuẩn bị

```text
http://127.0.0.1:5173/table.html?table=A1&code=1234
http://127.0.0.1:5173/staff-order-board.html?as=0900000002
http://127.0.0.1:5173/staff-runner.html?as=0900000002
http://127.0.0.1:5173/staff-owner.html?as=0900000002
http://127.0.0.1:5173/staff-stats.html?as=0900000002
```

Cùng một cửa sổ Chrome. Ctrl + F5.

## D.2. Kịch bản

1. Table A1: thêm Matcha, gửi order.
2. Order Board: Bắt đầu → Xong.
3. Runner: Đã mang ra.
4. Ingredients: Matcha 3g → bán ly cuối → menu khoá.
5. Owner: alert + gợi ý.
6. POS: Counter Pickup → mã P01.
7. Stats: gửi email báo cáo; chỉ báo cáo ngày có kho.

## D.3. Câu chốt

> “Một order đi từ khách → bảng → runner → chủ quán. Không bill mở. Không ép QR.”

---

# PHẦN E — GIỚI HẠN VÀ TẦM NHÌN

## E.1. Thật trong demo

- bàn, QR, TableSession;
- order, cọc, BOM;
- Order Board, Runner;
- Owner Cockpit;
- báo cáo;
- 130 test, 24 smoke, 26 verify.

## E.2. Giả lập / chưa có

- thanh toán QR thật;
- hóa đơn điện tử;
- POS đối tác;
- backend;
- multi-device;
- P0: atomic cọc, chỉ áp cọc đã trả, xử lý cọc dư.

## E.3. Roadmap

```text
Phase 0 — Demo
Phase 1 — Pilot 1 quán
Phase 2 — Production
```

---

# PHẦN F — GỢI Ý CHIA SLIDE

| Slide | Nội dung | Mức chi tiết |
|---|---|---|
| 1 | Giới thiệu | 1 câu + 3 số |
| 2 | Bối cảnh | 4 dòng |
| 3 | Ba vai | 3 cột |
| 4 | Khách | 4 case |
| 5 | Bàn/cọc | công thức + ví dụ |
| 6 | POS | 2 nhánh |
| 7 | Order Board/Runner | 3 cột + 4 bullet |
| 8 | Owner + email | 3 lớp + email |
| 9 | AI làm gì | 4 ô |
| 10 | Kiến trúc AI | pipeline |
| 11 | Thuật toán/công nghệ | 2 cột |
| 12 | Automation | 3 rule |
| 13 | Demo | 6 bước |
| 14 | Minh chứng/giới hạn | 2 cột |
| 15 | Tầm nhìn | 3 phase |

---

# PHẦN G — CÂU CHỐT

> “CAPPAN không làm mọi thứ.  
> Nó giúp quán không bán khống, không bỏ sót bàn, và chủ quán biết ngay khi có chuyện.”

> “Khách tự chọn. Hệ thống giữ bàn. Nhân viên chỉ bưng nước và xử lý ngoại lệ.”
