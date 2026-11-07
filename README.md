# CAPPAN — Coffee & More · Home Study

**Repo:** https://github.com/cappannguyen-0901/cappanwebdemo

Web quán cà phê CAPPAN: đặt bàn theo sơ đồ, gọi món, giỏ hàng, theo dõi đơn, khuyến mãi,
**thu ngân tại quầy**, 13 trang nhân viên và trợ lý AI tiếng Việt.

Bản **v4.2** hoàn thiện từ `Projectweb`: giữ nguyên giao diện, toàn bộ chức năng AI/chat và
các lớp hiệu ứng sẵn có; bổ sung tầng lõi dùng chung, kiểm thử tự động, đóng gói `dist/`,
chế độ prod, ảnh nội bộ (chạy offline) và các nghiệp vụ còn thiếu.

---

## 1. Mở trong 10 giây

**Cách 1 — bản đóng gói (khuyến nghị):**

```
Bấm đúp:  dist/index.html
hoặc  :   CHAY-WEB.bat
```

Mỗi trang trong `dist/` là **một tệp HTML tự chứa** (CSS + JS nhúng). Chép lẻ tệp vẫn chạy,
không cần cài đặt, không cần web server. Ảnh nằm trong `dist/assets/images` nên **mất mạng vẫn đủ giao diện**.

**Cách 2 — chạy bản source (cần Node ≥ 20):**

```bash
node scripts/serve.mjs          # http://localhost:5173
```

Hoặc mở thẳng các `.html` ở thư mục gốc: source dùng script cổ điển + đường dẫn tương đối
nên vẫn chạy bằng `file://`.

### Tài khoản demo

| Vai | Số điện thoại | Mật khẩu | Vào nhanh |
|---|---|---|---|
| Khách | 0900000001 | 123 | `login.html?as=0900000001` |
| Nhân viên | 0900000002 | 123 | `staff-dashboard.html?as=0900000002` |

`?as=` chỉ tồn tại ở bản demo; bản prod đã cắt và không seed tài khoản demo.

### Chat có LLM (tuỳ chọn)

```bash
cp server/.env.example server/.env     # điền GROQ_KEYS / GEMINI_KEYS
node server/proxy.js                   # http://localhost:8787
```

Không có proxy thì trợ lý vẫn trả lời bằng luật cục bộ + KB, 0 token, chạy offline.

---

## 2. Chức năng

### Khách

- **Đặt chỗ**: sơ đồ 4 tầng, kiểm tra ngày/giờ/sức chứa/đặt trước 30 phút, tối đa 3 chỗ; bàn **đang giữ** hiện màu vàng; **cọc giữ bàn** theo sức chứa (35k/70k/105k/140k). Form có **giờ gợi ý động** (chữ nâu), lọc giờ đã qua.
- **Đặt bàn qua chat**: xác nhận = **giữ bàn (held)**, sau đó **chỉ nhận cọc chuyển khoản**: chat tạo QR + link trang thanh toán; chỉ khi trang xác nhận mới tính giữ bàn thành công.
- **Gọi món**: menu theo nhóm, size, topping, combo; giỏ hàng, mã giảm giá, phí ship.
- **Theo dõi đơn**: 5 bước, mô phỏng giao hàng, bản đồ shipper, huỷ đơn.
- **Hồ sơ**: thông tin cá nhân, lịch sử đơn/đặt chỗ, xuất hoá đơn.
- **Chat AI**: streaming, thẻ món/đơn/đặt bàn, quick replies, micro tiếng Việt, 👍/👎, **lưu nguyên đoạn chat khi đổi trang/reload**,
  lịch sử theo phiên, gợi ý món theo khẩu vị/sức khoẻ, chuyển nhân viên khi cần.
  **Realtime cùng tab**: mọi thao tác ghi dữ liệu cập nhật ngay giỏ/đơn/bàn/booking, không cần tải lại.
  Hiểu đúng **món lẻ / cả nhóm / món chưa có** (gợi ý cùng nhóm), hiểu **số người** để vào
  luồng đặt bàn, không còn nhầm “2 người” thành tên món. Khung chat có mặt trên **mọi trang khách**.
- **Ô nhập liệu**: chữ **nâu cà phê** trên nền sáng, nâu sáng ấm ở dark mode; chat/tìm kiếm/POS vẫn nền trắng, placeholder nâu xám.

### Nhân viên (13 trang)

| Trang | Việc chính |
|---|---|
| `staff-dashboard.html` | Tổng quan ca, **sơ đồ bàn click để xếp khách vãng lai**, đơn/booking đang chạy, **nhật ký hoạt động** |
| `staff-owner.html` | **Owner Cockpit**: Alert Center, Insight, Recommendation, chat hỏi nhanh |
| `staff-order-board.html` | **Order Board**: Mới / Đang làm / Sẵn sàng; chỉ đơn đã thanh toán; không voice |
| `staff-runner.html` | **Runner View**: đơn Table Service sẵn sàng, số bàn, xác nhận đã mang ra |
| `staff-cashier.html` | **Thu ngân tại quầy**: Counter Pickup, chọn món, áp mã, tiền mặt/chuyển khoản/thẻ, tính tiền thối, sổ ca |
| `staff-orders.html` | Xác nhận, chuyển bước, huỷ đơn; **hiển thị ngay** + số lượng theo tab |
| `staff-bookings.html` | **Đặt bàn hộ khách**, **giữ bàn**, **thu cọc**, check-in, hoàn tất, **khách không đến**, **khách vãng lai** |
| `staff-menu-manage.html` | Thêm/sửa/xoá món, bật tắt còn hàng |
| `staff-ingredients.html` | **Quản lý nguyên liệu + BOM**: nhập kho, định mức món, tự trừ khi bán, tự đánh dấu hết nguyên liệu |
| `staff-promotions.html` | Thêm/sửa/xoá mã giảm giá |
| `staff-schedule.html` | Lịch ca tuần, xếp nhân viên |
| `staff-stats.html` | **Doanh thu theo kỳ**, so kỳ trước, kênh bán, thanh toán, top món, booking/cọc, **xuất CSV** |
| `staff-ai.html` | Thống kê & debug trợ lý AI |

Đăng nhập nhân viên demo: `0900000002 / 123`.

### Lõi dùng chung (`js/core.js`)

- `CappanConfig` — phiên bản, chế độ `demo`/`prod`.
- `Pricing` — **mọi giá tính lại từ thực đơn** (size, topping, combo, mã giảm giá); client
  không quyết được tổng tiền.
- `BookingRules` — ngày quá khứ, quá 14 ngày, giờ mở cửa, đặt trước 30 phút, sức chứa, tối đa 3 chỗ.
- `Policy` — một bảng quyền cho web và chat (khách chỉ thao tác trên dữ liệu của mình).
- `Audit` — 500 thao tác gần nhất, hiển thị ở trang Tổng quan.

---

## 3. Kiểm tra (đều phải xanh)

```bash
node scripts/lint.mjs
node --test "tests/*.test.mjs" "tests/integration/*.test.mjs"
node scripts/build.mjs
node scripts/verify.mjs
node scripts/smoke.mjs        # Chrome/Edge thật, bản dist
```

Hoặc `npm run check`. Hiện tại:

- **AI/chat**: 5 bộ test (hồi quy 140 assert + golden 21/21, hành vi 39, injection 7, đa ý định 9, partial-refusal 5) + **24 test routing** (món/nhóm món/số người/đặt bàn/thẻ). Tổng **107 test** AI/chat.
- **Tích hợp**: 31 test cho Pricing, đơn hàng, đặt bàn, policy, audit, POS, no-show, check-in, khách vãng lai, hash mật khẩu, automation.
- **Tồn kho/BOM**: **10 test** cho định mức, trừ kho, hoàn kho, POS, order online, món hết hàng, món không có BOM.
- **Tĩnh**: 39 test cho head/asset/thứ tự script/layout/ảnh nội bộ.
- **Kịch bản**: 8 nhóm test phủ **45 câu khách + 25 câu nhân viên** và quy trình API (xem `docs/BO-KIEM-THU.md`).
- **Kịch bản báo cáo cho giảng viên**: `docs/KICH-BAN-BAO-CAO.md`.
- **Báo cáo sản phẩm**: `docs/TONG-KET-SAN-PHAM.md`.
- **Báo cáo vận hành mới**: [`docs/BAO-CAO-VAN-HANH-CAPPAN.md`](docs/BAO-CAO-VAN-HANH-CAPPAN.md) · [`CAPPAN-BAO-CAO-VAN-HANH.docx`](CAPPAN-BAO-CAO-VAN-HANH.docx).
- **Kịch bản thuyết trình + demo**: [`docs/THUYET-TRINH-CAPPAN-V4.md`](docs/THUYET-TRINH-CAPPAN-V4.md).
- **Slide mới**: `cappan-slides-v4.pptx` · `cappan-slides.pptx`.
- **Tổng**: **130 test**; smoke **24 trang** trên Chrome headless.

---

## 4. Cấu trúc

```
*.html                 26 trang (source, mở trực tiếp được)
*.css                  style / theme / dark-mode / staff / chat-panel / card-premium / ui-polish / cashier
assets/images/         22 ảnh nội bộ (không phụ thuộc Unsplash)
js/
  core.js              CẤU HÌNH + GIÁ + LUẬT ĐẶT BÀN + PHÂN QUYỀN + AUDIT (thuần)
  api/index.js         facade dữ liệu (localStorage), nơi UI gọi
  auth.js              đăng nhập / đăng ký / guard
  cashier.js           thu ngân tại quầy
  ai/                  AI input, output, brain, luật cục bộ, tool, chat-interactions
  main.js              toast, modal, chat widget, render dùng chung, lưới an toàn
  demo.js              dữ liệu mẫu + panel trình diễn
  realtime.js          đồng bộ nhiều tab (BroadcastChannel + storage + polling)
scripts/
  serve.mjs            server tĩnh (source hoặc --dist)
  lint.mjs             lint nhẹ, không cần cài gói
  normalize-pages.mjs  chuẩn hoá head/aria cho mọi trang
  sync-layout.mjs      một nguồn cho header/footer
  build.mjs            đóng gói dist/ tự chứa (+ --mode prod)
  verify.mjs           nghiệm thu dist
  smoke.mjs            smoke trên Chrome/Edge headless
server/
  proxy.js             proxy LLM giữ key ở server (CORS, rate-limit, SSE)
  static-dev.js        server tĩnh cho dev
tests/                 test AI + test tích hợp + helper sandbox
docs/                  kiến trúc, nâng cấp, playbook bảo vệ
```

---

## 5. Đóng gói & prod

```bash
node scripts/build.mjs              # demo → dist/
node scripts/build.mjs --mode prod  # prod: không tài khoản demo, không ?as=, không seed demo
node scripts/verify.mjs
```

`build.mjs` nhúng CSS/JS vào từng trang, chèn `window.CAPPAN_MODE`, thêm `noindex` cho bản demo,
copy ảnh/favicon/robots. Bản prod bỏ khối tài khoản demo ở trang đăng nhập.

---

## 6. Tài liệu

- [`docs/KIEN-TRUC.md`](docs/KIEN-TRUC.md) — kiến trúc tầng, luồng giá/đặt bàn/POS/quyền/audit.
- [`docs/NANG-CAP.md`](docs/NANG-CAP.md) — nhật ký nâng cấp v4.2 và việc còn lại.
- [`docs/01-defense-playbook.md`](docs/01-defense-playbook.md), [`docs/defense-prep.md`](docs/defense-prep.md) — câu hỏi bảo vệ đồ án.
- [`docs/02-technical-specification.md`](docs/02-technical-specification.md), [`docs/03-deep-dive-architecture.md`](docs/03-deep-dive-architecture.md) — đặc tả kỹ thuật.

---

## 7. Giới hạn đã biết

- **localStorage, không backend**: dữ liệu nằm trên trình duyệt. Mật khẩu được băm **SHA-256 + muối riêng,
  600 vòng** và tự nâng cấp từ dữ liệu cũ khi đăng nhập; phiên đăng nhập không chứa mật khẩu/hash.
  Đây vẫn không phải bảo mật thật vì toàn bộ chạy phía client — cần backend khi triển khai thực tế.
- Policy/audit là **hợp đồng phía client** để sau này thay bằng API thật mà không phải viết lại UI.
- Bản prod chỉ là "prod demo": cắt tài khoản/mã mời, không có thanh toán thật.
- Chưa gộp script theo entry: mỗi trang vẫn nạp nhiều thẻ `<script src>` (559 toàn bộ). Đã ghi
  trong `docs/NANG-CAP.md` như việc tiếp theo.
- Bản dist tự chứa nên mỗi trang ~0,8 MB; tổng ~18.8 MB. Phù hợp nộp/demo offline, chưa tối ưu CDN.
