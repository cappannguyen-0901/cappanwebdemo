# NÂNG CẤP v4.2 — nhật ký thay đổi

**Ngày:** 04/11/2026
**Gốc:** `Projectweb` (bản có bộ AI/chat đầy đủ nhất trong ba bản).
**Tham chiếu:** bản nâng cấp v4.1 ở thư mục gốc repo và `cappannguyenwebdemo` (kiến trúc domain/policy/test).
**Nguyên tắc:** giữ nguyên giao diện, giữ **toàn bộ** chức năng sẵn có (chat, AI, hiệu ứng, 19 trang),
chỉ bổ sung hạ tầng + nghiệp vụ còn thiếu và sửa lỗi thật.

---

## 1. Sửa lỗi thật

| # | Lỗi | Trước | Sau |
|---|---|---|---|
| 1 | **Treo trang giỏ hàng trên mobile** | `MutationObserver` theo dõi cả `document.body` rồi ghi vào `#mobileTotal` → tự kích hoạt vòng lặp vô hạn khi màn hình ≤ 900px (Chrome headless treo vô hạn) | Chỉ theo dõi `#sumTotal`, chỉ ghi khi giá trị đổi; smoke chạy được `cart.html` |
| 2 | Giá do client quyết | `orders.create` lưu nguyên `total` client gửi | `Pricing.quote` tính lại từ catalog + size + topping + combo + mã; client chỉ gửi món |
| 3 | Phí ship do client quyết | nhận `data.shipping` | bỏ qua, luôn dùng `Pricing.SHIPPING_FEE` |
| 4 | Đặt bàn không kiểm luật ở API | chỉ kiểm bàn trống | `BookingRules.validate`: ngày quá khứ, quá 14 ngày, giờ 07:00–22:00, đặt trước 30 phút, sức chứa, tối đa 3 chỗ |
| 5 | Không kiểm quyền sở hữu | khách huỷ được booking/đơn người khác nếu biết mã | `Policy` + `_policyAllow` cho đặt/huỷ/hoàn tất/sửa/check-in/no-show/walk-in/đơn/POS/audit |
| 6 | Mật khẩu nằm trong phiên + lưu thô | `setCurrent` lưu cả `password`; `cappan_users` chứa mật khẩu plaintext | phiên bỏ `password`/hash; mật khẩu băm **SHA-256 + muối 16B, 600 vòng**, tự nâng cấp dữ liệu cũ; prod yêu cầu ≥ 6 ký tự |
| 7 | Khối theme lặp 2 lần | 19/19 trang | còn 1 khối, có test chặn tái diễn |
| 8 | Ảnh `src=""` | `booking.html` tải lại chính trang | bỏ `src`, JS gắn khi có ảnh |
| 9 | Lỗi im lặng | không bắt lỗi toàn cục | bắt `error` + `unhandledrejection`, toast + audit; ảnh lỗi thay bằng SVG nội bộ |
| 10 | Bản prod vẫn là demo | seed tài khoản demo, `?as=` chạy | `--mode prod`: không seed, không `?as=`, bỏ khối tài khoản demo khỏi login |
| 11 | No-show chỉ hiển thị | có `noShowCount` nhưng không có cách tăng | nút "Khách không đến": nhả bàn, tăng `noShowCount`, ghi audit |
| 12 | Trang theo dõi tự đổi bước đơn | gọi `updateStep` trực tiếp (sau khi thêm Policy sẽ bị chặn nhầm) | `API.orders.advanceDemo` kiểm sở hữu + chế độ demo, giới hạn bước 3 |
| 13 | Đổi bàn không kiểm bàn mới | `bookings.update` book mù | kiểm tồn tại + còn trống + chạy lại `BookingRules` |
| 14 | `bookings.create` trả `null` không lý do | UI báo "bàn vừa được đặt" cho mọi lỗi | `API._lastError` + UI hiển thị đúng lý do |
| 15 | Thiếu ảnh khi mất mạng | 62 URL Unsplash | 21 ảnh nội bộ trong `assets/images`, thay toàn bộ URL |
| 16 | `[hidden]` bị class `display` đè | trang giỏ hiện cả khối "trống" lẫn form | thêm `[hidden]{display:none!important}` cuối cascade |
| 17 | Input form tràn khỏi modal | input không có `width` nên rộng hơn cột grid | `width:100%` cho input/select/textarea trong `.form-group` |

## 2. Thêm mới

### Hạ tầng

- **`js/core.js`** — lõi thuần dùng chung: `CappanConfig` · `Pricing` · `BookingRules` · `Policy` · `Audit`.
- **Audit 500 dòng** + bảng "Nhật ký hoạt động" ở trang Tổng quan nhân viên.
- **`?as=<sđt>`** — vào nhanh vai ở bản demo, chạy trước `staff-guard.js`.
- **Ảnh nội bộ** — 21 ảnh + `assets/images/CREDITS.md`, chạy offline hoàn toàn.
- **SEO/head chuẩn** — favicon, theme-color, description, Open Graph, Twitter card, `robots.txt`.
- **Header/footer một nguồn** — `scripts/sync-layout.mjs` sinh lại 19 trang; thêm link **Giỏ hàng**
  còn thiếu ở menu/footer nhiều trang; test chặn lệch.
- **`scripts/normalize-pages.mjs`** — chuẩn hoá head, aria, bỏ theme lặp, chèn `core.js`.
- **Bộ script không phụ thuộc gói ngoài**: `lint.mjs`, `build.mjs`, `verify.mjs`, `smoke.mjs`
  (Chrome/Edge headless), `serve.mjs`, `sync-layout.mjs`, `normalize-pages.mjs`.
- **`dist/` tự chứa** — mỗi trang 1 tệp HTML (CSS + JS nhúng), mở bằng `file://`; copy ảnh sang dist.
- **Tài liệu** — `README.md`, `docs/KIEN-TRUC.md`, `.env.example`, `.gitignore`, `CHAY-WEB.bat`.

### Nghiệp vụ

- **Thu ngân tại quầy** — `staff-cashier.html` + `js/cashier.js` + `cashier.css` + `API.pos`:
  báo giá không phí ship, thu tiền mặt/chuyển khoản/thẻ, tính tiền thối, sổ ca ngày,
  hoá đơn vào doanh thu; có trong menu nhân viên và lối tắt ở Tổng quan.
- **Check-in** — `API.bookings.checkIn` + nút 🪑: `confirmed → seated`, bàn vẫn bị chiếm.
- **Khách vãng lai** — `API.bookings.createWalkIn` + modal "＋ Khách vãng lai" ở trang Booking:
  xếp bàn ngay, không cần tài khoản, ghi audit `booking.walk_in`.
- **Trạng thái `seated`** — hiển thị ở bảng booking, tab "Đang ngồi", hồ sơ khách, chat của nhân viên.

### Kiểm thử

- `tests/integration/core-api.test.mjs` — **29 test**: pricing, đơn hàng, đặt bàn, policy,
  audit, POS, no-show, check-in, khách vãng lai, theo dõi đơn, prod.
- `tests/static.test.mjs` — **39 test**: head, thứ tự script, layout, tài nguyên, ảnh nội bộ,
  menu khách, guard trang nhân viên, trang thu ngân.
- `tests/helpers/sandbox.mjs` — sandbox `vm` + localStorage giả.
- Giữ nguyên 5 bộ test AI sẵn có (hồi quy 140 assert + golden 21/21 + 60 test hành vi/an toàn).

## 3. Trước / sau

| Hạng mục | Trước (Projectweb) | Sau (v4.2) |
|---|---|---|
| Tầng lõi dùng chung | không | `js/core.js` (Pricing/BookingRules/Policy/Audit) |
| Giá đơn hàng | client quyết | tính lại 100% từ catalog |
| Quyền huỷ đơn/chỗ | không kiểm | kiểm sở hữu + audit |
| Đặt bàn | chỉ kiểm bàn trống | đầy đủ luật thời gian/sức chứa/số chỗ |
| Thu ngân / POS | không | trang riêng + `API.pos` + sổ ca |
| No-show | chỉ hiển thị | nút ghi nhận + tăng `noShowCount` |
| Check-in / khách vãng lai | không | API + UI |
| Build | không | `dist/` 21 trang tự chứa |
| Prod | không | `--mode prod` |
| Lint | không | `node scripts/lint.mjs` sạch |
| Smoke trình duyệt | không | 19 trang trên Chrome/Edge headless |
| Test | 5 bộ AI (không có tích hợp/tĩnh) | 5 bộ AI + 21 tích hợp + 27 tĩnh |
| Mật khẩu | plaintext trong localStorage | **SHA-256 + muối 16B, 600 vòng**, tự migrate dữ liệu cũ |
| Head mỗi trang | thiếu meta/favicon/OG | đủ, có test |
| Ảnh | 62 URL Unsplash | 21 ảnh nội bộ, offline |
| Tài liệu chạy | không README | README + KIEN-TRUC + `.env.example` |

## 4. Kiểm chứng

```bash
node scripts/lint.mjs
node --test "tests/*.test.mjs" "tests/integration/*.test.mjs"
node scripts/build.mjs && node scripts/verify.mjs
node scripts/smoke.mjs
node scripts/build.mjs --mode prod && node scripts/verify.mjs
```

Kết quả tại thời điểm chốt: lint sạch (48 JS, 21 trang), **107 test** (AI + routing + tích hợp + tĩnh + kịch bản) xanh,
build demo/prod OK, verify 21 trang tự chứa, smoke 19 trang trên Chrome không lỗi JS.

## 5. Còn lại (chưa làm trong v4.2)

- **Gộp script theo entry**: mỗi trang vẫn nạp nhiều `<script src>` (559 toàn bộ, ~28/trang).
  Hướng làm: entry theo trang hoặc build-time concat; hiện chưa làm vì muốn giữ "mở tệp là chạy".
- **Cọc giữ bàn** và **vai chủ quán + báo cáo so sánh kỳ**: nền `Policy`/`Audit`/`BookingRules` đã sẵn.
- **CI thật** (chưa push GitHub) và **Lighthouse**: chưa đo.
- **`cappan-v2/`** trong thư mục này là scaffold tham chiếu còn sót; đã cho vào `.gitignore`,
  không tham gia build/test.

---

## 6. v4.3 — hiểu người dùng & chat (bản vá AI)

**Vấn đề thực tế:** người dùng bấm chip **"2 người"** / gõ **"8 người"** trong luồng đặt bàn thì bot trả
“quán chưa có "2 người" trong menu”; gõ **"trà đào giá bao nhiêu"** (món có thật) cũng bị báo chưa có.
Nguyên nhân: một lớp chặn cũ coi **mọi câu 2–5 từ** là tên món, kể cả số người/giờ/ngày.

**Cách sửa:** thay lớp chặn bằng bộ hiểu món (`js/ai/item-lookup.js`) + routing trong `AIBrain`:

| Câu người dùng | Trước | Sau |
|---|---|---|
| `2 người`, `8 người`, `bàn 4 người` | “chưa có 2 người trong menu” | vào **luồng đặt bàn**: ghi số người → chọn giờ → gợi ý bàn đủ chỗ |
| `đặt bàn` → chip `8 người` | lỗi menu | thẻ `UI_TIME_PICK` đúng luồng |
| `trà đào`, `cà phê sữa đá` | gợi ý chung “(trà)” | thẻ **đúng món** + giá + size + nút Thêm |
| `trà đào giá bao nhiêu` | “chưa có trà đào” (lỗi dấu) | đúng món + 45.000đ |
| `trà sữa` | gợi ý trà chung chung | “menu chưa có trà sữa” + **gợi ý cùng nhóm trà** |
| `menu trà`, `các loại trà` | không rõ | thẻ **nhóm Trà (4 món)** |
| `menu`, `thực đơn` | trả lời rời | thẻ **toàn bộ thực đơn** |
| `20 người` | chưa có chỗ / lỗi menu | báo **bàn tối đa 8 chỗ** + hotline ghép bàn |
| khách chưa đăng nhập gõ `2 người` | lỗi menu | mời **đăng nhập để đặt bàn** |

**Cải thiện thêm:**

- Gợi ý thay thế **ưu tiên cùng nhóm** (trà sữa → trà đào/matcha/trà sen), không random.
- Hiểu câu có số lượng/đơn vị: “cho 2 ly trà sữa”, “1 phần bánh flan”, “trà đào có đường không”.
- Không coi câu về **calo/đường/healthy** là tên món; không coi giờ/ngày/chỗ ngồi là món.
- Quick replies luôn có `label` + hành động (trước đây một số chip rỗng).
- Thẻ mới có tiêu đề rõ: `Chi tiết món`, `Chưa có "X" — gợi ý gần nhất`, `🍵 Trà (4 món)`, `Toàn bộ thực đơn`.
- Bổ sung intro thẻ cho `UI_BOOKING_PLAN`, `UI_TIME_PICK`, `UI_BOOKING_CONFIRM`, `UI_ORDER_PICK`…

**Hiểu ngữ cảnh & combo (cùng đợt):**

- **Combo:** "combo", "combo sáng", "combo trà chiều", "combo nhóm học tập", "combo rẻ" → thẻ `UI_COMBO`
  có nút **Mua** (bấm là thêm đúng combo vào giỏ), kèm giá gốc/giá combo/tiết kiệm.
- **Câu nối tiếp:** sau khi xem một món, "món này giá bao nhiêu?", "còn không?", "thông tin món này"
  → trả lời đúng món vừa xem (không hỏi lại), nhưng không cướp câu hỏi về món khác.
- **Lời chào theo trang:** trang Đặt bàn mời chọn **2/4/8 người**; trang Thực đơn mời **Trà/Cà phê/Sinh tố/Combo**;
  trang Giỏ hàng mời **Thanh toán**; trang Theo dõi mời **Đơn của tôi**.
- **Grounding cho LLM:** system prompt luôn kèm **MENU THẬT + giá + combo thật** (≈700 token)
  và quy tắc "không bịa món/giá ngoài danh sách" — giảm ảo giác khi câu hỏi rơi xuống LLM.

**Sẵn có:** khung chat có mặt ở **mọi trang khách** (thêm cả đăng nhập / đăng ký / chính sách — trước đây trống), nên trợ lý luôn gọi được.

**Chat UI:** ô nhập chat + ô tìm kiếm (menu, thu ngân) nay **nền trắng – chữ đen** ở cả light/dark
(`ui-polish.css`), có caret và placeholder tương phản; sửa lỗi chữ nhập bị đen trên nền tối.

**Kiểm thử:** thêm `tests/ai-routing.test.mjs` — **24 test** cho: nhận món có dấu, nhóm món, món thiếu,
calo/đường, số người, chip đặt bàn, đoàn > sức chứa, khách chưa đăng nhập, quick replies, pipeline chat.
Tổng bộ test hiện tại: **107** (AI + routing + tích hợp + tĩnh), tất cả xanh.

## 7. v4.4 — nhân viên đặt bàn, giữ bàn, cọc, thống kê & thẻ

### Nhân viên đặt bàn hộ khách
- Trang **Booking** có nút **＋ Đặt bàn**: nhập SĐT (tự tìm tài khoản khách), họ tên, tầng/bàn còn trống,
  ngày, giờ, số khách, ghi chú, **đã thu cọc**.
- API `bookings.createByStaff`: tìm khách theo SĐT, không có thì lưu khách vãng lai;
  nhân viên **bỏ giới hạn 3 chỗ** nhưng vẫn kiểm ngày/giờ/sức chứa; ghi `createdBy: 'staff'` + audit.

### Trạng thái “đang giữ bàn”
- Thêm status `held` (mã `BH…`), bàn chuyển màu **vàng** trên sơ đồ khách và dashboard.
- Tab **Đang giữ**; thao tác **⏸ Giữ bàn / ▶ Bỏ giữ / 🪑 Nhận bàn**; `held → seated` vẫn giữ bàn,
  hủy/hoàn tất mới nhả bàn.
- Legend khách có **Đang giữ**; khách thấy booking “Đang giữ bàn”; AI/chat cũng tính held là booking hoạt động.
- `Bookings.getActiveBySeat`, `seats.syncFromBookings`, `occupancyRate` đều tính held.

### Cọc giữ bàn
- Công thức: `Math.ceil(capacity / 2) × 35.000đ` (2 chỗ → 35k, 4 → 70k, 6 → 105k, 8 → 140k).
- Lưu `deposit / depositPaid / depositPaidAt` trên booking; khách thấy cọc dự kiến trong modal đặt bàn;
  nhân viên bấm **Thu cọc / ✓ đã thu** trong bảng booking; profile khách hiện cọc.
- Doanh thu đơn **không** cộng cọc; trang thống kê có KPI **Cọc đã thu** + **Cọc chờ thu** riêng.

### Thống kê doanh thu
- Chọn kỳ **Hôm nay / 7 ngày / 30 ngày / Tháng này**, so sánh **kỳ trước** (% tăng/giảm).
- KPI: doanh thu, đơn hoàn tất, AOV, cọc; biểu đồ theo ngày; **kênh bán** (giao hàng / POS);
  **phương thức thanh toán** (tiền mặt / chuyển khoản / thẻ / chưa ghi nhận); top món theo kỳ;
  booking (hoạt động / đang giữ / đang ngồi / no-show / vãng lai), tỷ lệ lấp bàn, cọc.
- Nút **⬇ Xuất CSV** (UTF-8 BOM) gồm từng ngày + tổng kỳ.

### Sửa lỗi trang đơn hàng “vào không hiện, bấm tab mới hiện”
- Nguyên nhân: `fx.js` đưa `.staff-panel` vào scroll-reveal; panel cao ~22.000px nên
  threshold 12% **không bao giờ đạt** → panel bị `opacity:0`.
- Bỏ `.staff-panel` khỏi danh sách reveal + bỏ qua mọi khối cao hơn 90% viewport.
- Gia cố render: `items` thiếu/null không làm sập danh sách, có fallback; tab có **số lượng**;
  tự render lại khi `cappan:sync`/storage đổi.

### Thẻ đồng nhất
- Hệ thẻ chung: bo góc 18px, viền mảnh, bóng mềm, hover nhấc nhẹ cho `.staff-panel / .stat-card /
  .order-card / .menu-card / .history-card / .ui-card`; icon stat có khối nền; dark mode riêng.
- Bảng booking gọn (SĐT gộp dưới tên), cột **Thao tác dính phải** để không bị cắt khi hẹp.

**Kiểm thử:** **107 test** — AI 24 routing, tích hợp **31**, tĩnh **39**, kịch bản **8**, 5 bộ AI. Lint sạch, build 21 trang,
verify + smoke 19 trang Chrome xanh.

## 8. v4.5 — chữ nhập màu nâu

- Tokens mới trong `ui-polish.css`: `--input-ink` (light **#5D4037**, dark **#E7C9A9**), `--input-placeholder`.
- Áp dụng cho **input / textarea / select** trên toàn bộ trang: chat, tìm kiếm, thông tin cá nhân, địa chỉ,
  đặt bàn, đăng nhập/đăng ký, thu ngân, ghi chú…
- **Chat / tìm kiếm / POS** vẫn **nền trắng** ở cả 2 theme nên chữ luôn dùng nâu đậm (#5D4037),
  không dùng nâu sáng của dark mode.
- Placeholder màu nâu xám (#A1887F light / #A9907A dark), caret nâu; select option có nền/chữ tương phản.
- Không đổi nền trắng của chat/search, không ảnh hưởng checkbox/radio/nút submit.

## 9. Bộ kịch bản khách & nhân viên (v4.6)

- Thêm [tests/scenarios.test.mjs](../tests/scenarios.test.mjs): **8 nhóm test**, phủ **45 câu khách + 25 câu nhân viên**,
  quy trình giỏ/đơn/đặt bàn/cọc và quy trình nhân viên (đặt hộ, giữ bàn, check-in, cọc, no-show, vãng lai, POS, thống kê).
- Danh sách đầy đủ câu hỏi, quy trình và kết quả: [docs/BO-KIEM-THU.md](BO-KIEM-THU.md).
- Sửa thêm trong đợt test:
  - Staff query bị chặn bởi `_strict` → staff giờ nhận KPI/đơn/booking/chỗ/cọc bằng dữ liệu thật.
  - `_selfService` (giỏ/đơn/booking của tôi) trước đây **không được gọi** → đã nối vào draft engine.
  - “booking của tôi”, “hóa đơn”, “đặt nước”, “cọc giữ bàn”, “gặp nhân viên”, “khiếu nại” trả đúng thẻ.
  - “đặt bàn” trần không còn bị hiểu là xem danh sách booking.
  - Thẻ `[UI_...]` được tách khỏi message trước khi trả UI (không còn raw JSON).
- Tổng test hiện tại: **107** (thêm automation, báo cáo và 2 test tĩnh), browser E2E **21/21** (menu search xác nhận riêng khi chờ DOM), console **20/20** trang.

## 10. v4.7 — chat không reset, realtime tức thì, nav gọn, sơ đồ ghế tương tác

### Chat không tự reset
- Thêm `ChatTranscript` trong `js/main.js`: lưu **text + thẻ UI** theo từng phiên vào
  `cappan_chat_transcript_v1`, tối đa 160 mục.
- Đổi trang/reload: `restoreChatHistory()` và `ChatPanel.restoreHistory()` dựng lại nguyên đoạn chat,
  không chèn lời chào mới; chỉ nút **Xóa lịch sử** mới xóa transcript + AI history.
- Card được ghi theo dữ liệu parse (`recordCardData`) nên không lưu HTML trung gian, không lộ raw `[UI_...]`.

### Realtime tức thì
- `Realtime.emit` phát **DOM event cùng tab** bằng `queueMicrotask`, đồng thời BroadcastChannel + storage + polling 2s.
- Hook đúng **`storeSet`** (chỉ khi ghi localStorage thật), bỏ hook mọi method API —
  tránh vòng lặp do hàm đọc như `promotions.status()` phát event.
- `audit:changed` có kênh riêng `cappan:audit`, không gộp vào `cappan:sync`.
- `updatePageUI` bổ sung menu/tracking; dashboard/booking/orders/bookings/stats/cashier/chat panel
  cập nhật ngay khi API ghi (cùng tab hoặc tab khác).

### Nav khách
- Bỏ mục **Giỏ hàng** khỏi thanh điều hướng ở tất cả trang khách; giỏ vẫn mở bằng **icon 🛒** trên header.

### Sơ đồ ghế nhân viên
- Bàn xanh trên `staff-dashboard.html` click được → modal **Xếp khách vãng lai**
  (tên, SĐT, số khách, ghi chú) → `createWalkIn` → bàn chuyển `seated`, dashboard tự cập nhật.
- Có hỗ trợ bàn phím (Enter/Space), nút ✕ reset vẫn giữ.

**Kiểm thử:** **107 test** (tĩnh **39**), smoke 19 trang, browser E2E 21 kịch bản, console 21/21.

## 11. v4.8 — Automation 2 rule + báo cáo cuối kỳ + email

### Automation có kiểm soát
- Rule **nhả bàn held quá hạn**: mặc định 15 phút, bỏ qua booking đã cọc, có ân hạn, log/audit/undo.
- Rule **món hết hàng**: làm mờ + chặn đặt ở menu/order/cart; không xóa món, nhân viên vẫn thấy.
- Panel **🤖 Tự động hóa ca** trên dashboard: bật/tắt, đổi số phút, chạy kiểm tra, hoàn tác, log realtime.
- API bổ sung `autoReleaseHeld` / `autoRestoreHeld` (chỉ automation dùng); test tích hợp.

### Báo cáo cuối kỳ
- `ReportEngine` + trang Thống kê: kỳ **ngày / tuần / tháng / năm** (thêm preset `week`, `year`, `monthlySeries`).
- KPI, top món, kênh, thanh toán, booking/cọc, lấp bàn.
- **Gợi ý kinh doanh** theo luật + số liệu, không câu chung chung.
- Gửi email: mặc định **mailto**; **EmailJS** tùy chọn (service/template/public key lưu localStorage).
- Tải **HTML/CSV**, copy báo cáo.
- Demo bằng `Ctrl+Shift+D` hoặc nút **🎬 Demo automation**.

### Giới hạn
- Web tĩnh: không thể tự gửi email lúc 23:59 khi tab đã đóng — cần backend/n8n/Apps Script.
- EmailJS public key lộ trong trình duyệt; chỉ dùng demo, template cố định người nhận.
- Báo cáo hiện là **doanh thu & vận hành**; muốn lãi/lỗ cần thêm module chi phí.

**Kịch bản báo cáo cho giảng viên:** `docs/KICH-BAN-BAO-CAO.md`.

## 12. v4.9 — Đặt bàn qua chat = giữ bàn + cọc, giờ gợi ý màu nâu

### Chat booking
- Xác nhận trong chat gọi `API.bookings.hold` → bàn **held**, không còn tạo `confirmed`.
- Thẻ mới **UI_BOOKING_PAYMENT**: QR + link trang thanh toán; chỉ trang thanh toán xác nhận mới thu cọc. Không còn cọc khi đến.
- Chọn cọc → `setDepositPaid`; thẻ **`UI_BOOKING_DONE`** hiện mã giữ bàn + trạng thái cọc.
- Policy mở cho khách tự giữ bàn / cọc **của mình**; vẫn chặn thao tác lên booking người khác.
- Chat hiển thị ngày thân thiện (“hôm nay”), không lộ ISO.

### Form đặt chỗ
- Thay nút giờ tĩnh bằng **Giờ gợi ý động** theo ngày:
  - Hôm nay: chỉ giờ còn hợp lệ (sau hiện tại + 30 phút), có gợi ý 19:00/20:00.
  - Ngày khác: 08:00, 10:00, 12:00, 15:00, 17:30, 19:00.
- Bấm chip điền ngay vào ô giờ; chip đang chọn có trạng thái active.
- Chữ giờ gợi ý + nhãn form chuyển **màu nâu** (`#5D4037` light, `#E7C9A9` dark).

**Kiểm thử:** 107/107 pass; browser xác nhận held + cọc + giờ gợi ý.

## 13. v4.10 — Cọc chuyển khoản QR + trang thanh toán + đồng bộ UI nhân viên

### Chat: chỉ cọc bằng chuyển khoản
- Bỏ hoàn toàn lựa chọn “cọc khi đến”.
- Booking giữ chỗ có `paymentPending`; thẻ `UI_BOOKING_PAYMENT` hiện số cọc, QR và link **Mở trang thanh toán**.
- Chỉ trang `payment-success.html` (token riêng) gọi `confirmDepositByToken` mới ghi nhận `depositPaid` và tính **giữ bàn thành công**.
- Chat theo dõi thanh toán mỗi 2 giây; khi trang xác nhận, tự chèn thẻ **Giữ bàn thành công**.
- QR dùng ảnh từ api.qrserver.com, có fallback; môi trường offline vẫn bấm được link thanh toán.
- Lưu ý demo: dữ liệu nằm trong localStorage từng trình duyệt, nên quét QR trên thiết bị khác chỉ mô phỏng giao diện; muốn đồng bộ thật cần backend.

### Giao diện nhân viên
- Bảng booking: bỏ cột thao tác sticky (trước đây che cột trạng thái), sửa header trùng “Khách” → **Số khách**, ngày dd/mm, nút cọc dạng pill, đủ 5 nút thao tác.
- Tab mặc định **Đang hoạt động** = confirmed + held + seated, khớp danh sách ở dashboard.
- Trang booking tự cập nhật mỗi 4 giây + khi focus/storage/realtime.
- Sơ đồ ghế dashboard cao cố định 120px, không co giãn khi đổi trạng thái; hover không scale.

**Trang mới:** `payment-success.html` → **21 trang**; **107 test** (tĩnh **39**).
