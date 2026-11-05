# KIẾN TRÚC CAPPAN v4.2

## 1. Sơ đồ tầng

```
┌─────────────────────────────────────────────────────────────┐
│ 21 trang HTML (source)                                      │
│   markup gốc + <script src="..."> theo thứ tự cố định       │
└───────────────┬─────────────────────────────────────────────┘
                │ chỉ gọi API / hàm UI dùng chung
┌───────────────▼─────────────────────────────────────────────┐
│ js/main.js · chat-panel.js · cashier.js · demo.js · fx.js   │
│ toast · modal · chat widget · render · thu ngân · dữ liệu mẫu│
└───────────────┬─────────────────────────────────────────────┘
                │
┌───────────────▼─────────────────────────────────────────────┐
│ js/api/index.js — facade dữ liệu (localStorage)             │
│ users · menu · promotions · seats · bookings · orders ·     │
│ cart · shifts · staff · stats · pos · audit · utils         │
└───────────────┬─────────────────────────────────────────────┘
                │ dùng hàm thuần
┌───────────────▼─────────────────────────────────────────────┐
│ js/core.js — lõi thuần                                      │
│ CappanConfig · Pricing · BookingRules · Policy · Audit      │
└───────────────┬─────────────────────────────────────────────┘
                │
┌───────────────▼─────────────────────────────────────────────┐
│ localStorage: cappan_users · cappan_menu_* · cappan_orders  │
│ cappan_bookings · cappan_seats_state · cappan_cart_* ·      │
│ cappan_audit …                                              │
└─────────────────────────────────────────────────────────────┘
```

`js/ai/*` là tầng hội thoại: nhận câu nói → phân loại ý định → gọi `API` qua tool executor.
AI **không** đọc localStorage trực tiếp (trừ cache/telemetry của chính nó). Mọi tool ghi dữ liệu
đều đi qua `API`, nên chịu cùng luật giá/quyền/audit với web.

## 2. Luồng đặt hàng (giá tính lại)

```
cart.html / chat
  → API.orders.preview({ items, promoCode, userId })
      → Pricing.quote(...)
          → menu catalog + KB.combos  (giá gốc, size, topping)
          → API.promotions.evaluate   (mã, minOrder, %/tiền, first-order)
      ← { lines, subtotal, shipping, discount, total }
  → hiển thị tổng + xác nhận
  → API.orders.create({ items, promoCode, address, phone, ... })
      → preview lại (không tin total client)
      → lưu order với lines/giá đã chuẩn hoá + audit
```

Điểm quan trọng: **client không gửi `total` nữa**; nếu gửi cũng bị bỏ qua. Phí ship luôn lấy
`Pricing.SHIPPING_FEE` (15.000đ), không nhận từ client. Mỗi dòng hàng giữ `itemId/name/price/qty/img`
để hoá đơn và giỏ hiển thị lại được.

### 2.1. Hiểu món trước khi gợi ý

`js/ai/item-lookup.js → ItemLookup.resolve(raw)` phân loại câu thành:

| Kết quả | Ví dụ | Phản hồi |
|---|---|---|
| `item` | “trà đào”, “cà phê sữa đá giá bao nhiêu” | thẻ đúng món + giá + size + nút Thêm |
| `category` | “trà”, “menu trà”, “nước ép” | thẻ cả nhóm |
| `catalog` | “menu”, “thực đơn” | thẻ toàn bộ menu |
| `unknown` | “trà sữa”, “matcha latte” | “menu chưa có …” + gợi ý **cùng nhóm** |
| `null` | “2 người”, “8 người”, “19h”, “đặt bàn”, “wifi” | nhường luồng đặt bàn/KB |

Quy tắc quan trọng: **không bao giờ** coi số người/giờ/ngày/chỗ ngồi là tên món; so khớp không dấu
và bỏ số lượng/đơn vị (“cho 2 ly trà sữa” → “trà sữa”). Khi người dùng chỉ nói số người
(“2 người”, “bàn 4 người”), `AIBrain._draftEngineCore` mở draft đặt bàn và hỏi giờ.

## 3. Luồng đặt bàn

```
booking.html / chat
  → validateBooking(...)                  (UI, phản hồi nhanh)
  → API.bookings.create(data)
      → bàn tồn tại + trống
      → Policy (khách chỉ đặt cho mình)
      → BookingRules.validate({ date, time, guests, seat, now })
      → lưu booking + đánh dấu ghế + audit
```

Trạng thái booking: `confirmed ⇄ held → seated → completed`, nhánh `cancelled` / `no_show`.
`held` = bàn đang được giữ (staff bật/tắt), vẫn chiếm bàn và hiện màu vàng trên sơ đồ.

| Trạng thái | Nghĩa | Bàn |
|---|---|---|
| `confirmed` | đã đặt, chưa đến | bị chiếm |
| `held` | đang giữ bàn cho khách | bị chiếm (vàng) |
| `seated` | khách đã đến / khách vãng lai | bị chiếm |
| `completed` | đã trả bàn | nhả |
| `cancelled` | huỷ | nhả |
| `no_show` | khách không đến | nhả + tăng `noShowCount` |

Dữ liệu mẫu gọi `create(data, { seed: true })` để bỏ qua luật thời gian (ngày quá khứ).

### 3.1. Thu ngân tại quầy

```
staff-cashier.html
  → API.pos.quote({ items, promoCode })       (shipping = 0)
      → Pricing.quote(...)                    (giá catalog, size, topping, mã)
  → chọn tiền mặt / chuyển khoản / thẻ
  → API.pos.createSale({ items, promoCode, paymentMethod, cashReceived })
      → kiểm tiền mặt đủ, tính tiền thối
      → order channel='pos', step=4, status='completed', paidAt
      → audit; doanh thu quầy vào API.stats
```

`API.pos.summary()` tổng hợp theo ngày và hình thức thanh toán.

### 3.2. Khách vãng lai / check-in

- `API.bookings.createWalkIn({ seatId, guests, customerName, phone })` — nhân viên xếp bàn ngay,
  không cần tài khoản, không cần đặt trước; booking `status='seated'`, `walkIn=true`.
- `API.bookings.createByStaff(data)` — nhân viên đặt hộ: tìm khách theo SĐT, bỏ giới hạn 3 chỗ, vẫn validate ngày/giờ/sức chứa.
- `API.bookings.hold({ seatId, guests, ... })` — giữ bàn ngay, status `held`, mã `BH…`.
- `API.bookings.setHeld(id, true|false)` — bật/tắt “đang giữ”; `API.bookings.setDepositPaid(id, bool)` — thu cọc.
- `API.bookings.checkIn(id)` — `confirmed|held → seated`, bàn vẫn bị chiếm.
- Cả hai đều qua Policy + Audit; UI ở `staff-bookings.html` (nút ＋ Khách vãng lai, 🪑 check-in).

### 3.3. Thống kê doanh thu

`API.stats` có 2 lớp:
- **Theo khoảng**: `preset(today|7d|30d|month)`, `range(from,to)` → doanh thu (chỉ đơn `step >= 4`),
  số đơn, AOV, `byChannel` (delivery/pos), `byPayment` (cash/transfer/card/none);
  `dailySeries(from,to)` cho biểu đồ; `trend(period)` so kỳ trước; `topItemsInRange`.
- **Vận hành**: `bookingsSummary()` (confirmed/held/seated/no_show, occupancy, cọc đã thu/chờ thu),
  `depositsToday()`, `occupancyRate()` tính cả bàn `held`.

Cọc **không** cộng vào doanh thu đơn; hiển thị thành KPI riêng. Trang `staff-stats.html` xuất CSV.

### 3.4. Theo dõi đơn (demo)

`tracking.html` tự chạy tiến trình mỗi 5 giây bằng `API.orders.advanceDemo(id)`:
khách chỉ chạy được đơn **của mình**, tối đa tới bước 3; `API.orders.updateStep` (đổi bước tự do)
dành cho nhân viên. Bản prod không auto-advance.

## 4. Phân quyền

`js/core.js → Policy.ACTIONS` là bảng duy nhất:

```js
'booking.cancel': { guest: false, customer: 'own', staff: 'any', owner: 'any' }
```

`Policy.authorize(actor, action, resource)` trả `{ allowed, reason }`.
`API` dùng `_policyAllow(action, resource)`; nếu chưa đăng nhập (seed/test) thì cho qua,
vì UI đã yêu cầu đăng nhập trước khi gọi. Mọi lần bị từ chối đều ghi audit `FORBIDDEN`.

Các action đang được áp: `booking.create/cancel/complete/update/checkIn/walkIn/noShow/hold/deposit`,
`order.create/cancel/step/demoStep`, `menu.write`, `promotion.write`, `pos.sale.create`,
`audit.read`, `stats.read`, `shift.write`, `staff.write`.

## 5. Audit

`Audit.log({ action, targetId, ok, code })` ghi 500 dòng gần nhất vào `cappan_audit`.
Các điểm ghi: đăng nhập/đăng ký, tạo/huỷ/bước đơn, tạo/huỷ/hoàn tất/check-in/no-show/khách vãng lai,
thu tiền tại quầy, lỗi giao diện toàn cục. Trang Tổng quan nhân viên hiển thị 10 dòng mới nhất.

## 6. Mật khẩu

- `CappanHash` (trong `js/core.js`) băm **SHA-256 + muối 16 byte riêng cho từng tài khoản, 600 vòng**,
  chạy đồng bộ bằng JS thuần (không phụ thuộc WebCrypto) để `Auth.login` vẫn là hàm đồng bộ.
- Lưu trữ: `passwordSalt` + `passwordHash`; **không** lưu `password`. Phiên đăng nhập cũng bỏ cả ba.
- Dữ liệu cũ còn `password` được `API.users.migratePasswords()` nâng cấp ngay khi nạp API;
  nếu vì lý do nào đó chưa migrate, `Auth.login` vẫn xác thực được và tự nâng cấp sau lần đăng nhập đầu.
- Đây là **hợp đồng phía client**, không phải bảo mật thật: khi có backend, thay bằng Argon2/PBKDF2
  ở server mà không phải sửa UI.

## 7. Layout một nguồn

`scripts/sync-layout.mjs` sinh lại `<header>`/`<footer>` cho cả 21 trang từ một cấu hình
(`CUSTOMER_LINKS`, `FOOTER_LINKS`). `scripts/normalize-pages.mjs` chuẩn hoá `<head>`, bỏ khối theme
lặp, thêm favicon/description/OG/aria, chèn `js/core.js` trước API. `tests/static.test.mjs` so từng
trang với kết quả sinh ra nên không thể lệch âm thầm.

## 8. Build

`scripts/build.mjs`:

1. đọc từng `.html` gốc;
2. thay `<link rel="stylesheet" href="*.css">` bằng `<style>` (nội dung CSS);
3. thay `<script src="*.js">` bằng `<script>` (nội dung JS), escape `</script>`;
4. chèn `window.CAPPAN_MODE` (demo/prod);
5. bản prod: bỏ khối tài khoản demo, bỏ `API.users.seedDemo()`;
6. thêm `noindex` cho demo; copy ảnh/favicon/robots; ghi `dist/build.json`.

`verify.mjs` chặn nếu còn `<script src="js/...">`, CSS rời, thiếu core/mode, ảnh `src=""`,
còn ảnh Unsplash. `smoke.mjs` mở 19 trang dist bằng Chrome/Edge headless, kiểm DOM do JS sinh.

## 9. Kiểm thử

| Tầng | Tệp | Nội dung |
|---|---|---|
| AI/chat | `tests/regression.test.mjs`, `behavior`, `injection`, `multi-intent`, `partial-refusal` | 140 assert hồi quy + golden 21/21 + 60 test hành vi/an toàn |
| Hiểu món | `tests/ai-routing.test.mjs` | 24 test: món/nhóm món/số người/chip đặt bàn/đoàn đông/quick replies |
| Tích hợp | `tests/integration/core-api.test.mjs` | 29 test: pricing, order, booking, policy, audit, POS, no-show, check-in, walk-in, hash mật khẩu |
| Tĩnh | `tests/static.test.mjs` | 39 test: head, thứ tự script, layout, tài nguyên, ảnh nội bộ |
| Kịch bản | `tests/scenarios.test.mjs` | 8 nhóm: 45 câu khách + 25 câu staff + quy trình API |
| Trình duyệt | `scripts/smoke.mjs` | 19 trang dist trên Chrome |

Sandbox Node: `tests/helpers/sandbox.mjs` tạo `vm` + `localStorage` giả, nạp đúng thứ tự script.

## 10. Quy ước

- Không thêm thư viện ngoài; chạy được với Node ≥ 20 và không cần `npm install`.
- Tệp JS là script cổ điển (không `import`) để source mở bằng `file://` vẫn chạy.
- Hàm lõi không đọc DOM, không gọi `Date.now()` ngầm — thời gian truyền qua tham số.
- Mọi thao tác ghi quan trọng phải có audit; mọi giá phải qua `Pricing`.
- Trang mới: thêm vào `scripts/sync-layout.mjs` (nếu có header/footer), chạy `npm run sync`
  và `npm run normalize`, thêm ca vào `scripts/smoke.mjs`.
