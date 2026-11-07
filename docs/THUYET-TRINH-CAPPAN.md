# THUYẾT TRÌNH CAPPAN
## Kịch bản 12 phút + demo 5 phút

> **Thông điệp xuyên suốt:**
> “CAPPAN không ép khách dùng điện thoại. Không ép mọi đơn có bàn. Nhân viên chỉ xử lý ngoại lệ.”

---

## 0. Chuẩn bị trước khi lên

### Mở sẵn

```text
http://localhost:5173/
http://localhost:5173/staff-order-board.html?as=0900000002
http://localhost:5173/staff-runner.html?as=0900000002
http://localhost:5173/table.html?table=A1&code=1234
http://localhost:5173/staff-cashier.html?as=0900000002
http://localhost:5173/staff-owner.html?as=0900000002
```

### Dự phòng

- Video quay sẵn 60–90 giây.
- Ảnh chụp 5 màn hình chính.
- Nếu mất mạng: dùng ảnh/video, không live.

### Lưu ý

- Nhấn **Ctrl + F5** trước khi demo.
- Dùng **cùng một cửa sổ Chrome** để localStorage chia sẻ.
- Không mở nhiều profile khác nhau.
- Không hứa “POS thật”, “hóa đơn thật”, “AI thay người”.

---

# PHẦN A — THUYẾT TRÌNH (12 phút)

## Slide 1 — Mở đầu (45 giây)

> “Một quán cà phê 32 chỗ, 4 tầng, 5–10 nhân viên. Mỗi ngày có hàng trăm quyết định nhỏ: bàn nào trống, ai đang chờ, món nào sắp hết, khách nào đã cọc.
>
> CAPPAN không cố thay toàn bộ hệ thống. CAPPAN làm một việc: **giữ cho các quyết định đó không bị rơi**.”

Nhấn mạnh:

- Không phải “hệ điều hành”.
- Không phải “AI thay người”.
- Là **lớp vận hành nhỏ**.

## Slide 2 — Vấn đề (1 phút)

Ba câu hỏi:

```text
Khách: Tôi có chỗ không? Bao lâu có nước?
Nhân viên: Đơn nào làm trước? Bàn nào đang dọn?
Chủ quán: Hôm nay mất gì? Ai cần xử lý?
```

> “Cả ba cùng thiếu một nguồn sự thật.”

Liệt kê nhanh:

- Khách không điện thoại.
- Khách chỉ mua nước, ngồi xíu.
- Nhân viên quản bàn thủ công.
- Chủ quán không biết hao hụt.
- Booking giữ bàn vô hạn.

## Slide 3 — Insight (1 phút)

> “Không phải mọi khách đều đi qua QR. Không phải mọi đơn đều cần bàn.”

Ba hành trình:

1. Mua nhanh tại quầy.
2. Ngồi bàn được phục vụ.
3. Đặt trước.

Nói:

> “Trước đây em cố ép cả ba vào một luồng. Đó là sai lầm lớn nhất.”

## Slide 4 — Mô hình 4 service mode (1 phút)

```text
counter_pickup
table_service
takeaway
delivery
```

Booking là cờ trên `table_service`.

Nhấn:

> “Counter Pickup không cần bàn. Table Service mới cần bàn. Đây là chìa khóa.”

## Slide 5 — Khách hàng (1 phút)

Hai lời hứa:

| Mode | Lời hứa |
|---|---|
| Counter Pickup | Trả tiền, nhận số, tự lấy |
| Table Service | Trả tiền, nhân viên mang ra bàn |

Không điện thoại:

```text
Quầy → POS → nhận số → tự lấy
```

Nhấn:

> “Không có khách nào bị chặn vì không có điện thoại.”

## Slide 6 — Nhân viên (1,5 phút)

Order Board:

```text
MỚI / ĐANG LÀM / SẴN SÀNG
```

- Chỉ đơn đã thanh toán.
- Barista tự quyết.
- Quản lý ca override.
- Không voice.

Runner View:

- Chỉ Table Service ready.
- Số bàn.
- “Đã mang ra”.

Nhấn:

> “Bỏ voice, không bỏ hàng đợi.”

## Slide 7 — Chủ quán (1,5 phút)

Owner Cockpit:

- Alert: nguyên liệu cạn, bàn đang dọn, khu tự do hết chỗ.
- Insight: doanh thu, món bán chạy.
- Recommendation: nhập hàng, mở khu, đổi ca.

Nhấn:

> “Chủ quán không cần nhìn 20 báo cáo. Chỉ cần 3 việc cần quyết.”

## Slide 8 — Demo (3 phút)

Chuyển sang phần B.

## Slide 9 — Kiến trúc demo (1 phút)

```text
Web khách / POS / Order Board / Runner / Owner
        ↓
   API local-first (localStorage)
        ↓
Payment Adapter (demo) · Invoice Adapter (demo)
```

Nói rõ:

> “Thanh toán và hóa đơn là giả lập. Không có giá trị pháp lý.”

## Slide 10 — Bằng chứng (1 phút)

- 26 trang.
- 130 test.
- 24 smoke.
- 26 verify.
- Order Board + Runner.
- BOM Matcha.
- Owner Cockpit.

Nhấn:

> “Em không chỉ vẽ slide. Em có code chạy được.”

## Slide 11 — Bài học (1 phút)

> “Em thử KDS voice. STT tiếng Việt trong môi trường ồn không ổn định. Em bỏ khỏi MVP.
>
> Bài học: không đưa công nghệ vào demo nếu chưa đủ tin cậy.”

Đây là **product judgment**, không phải thất bại.

## Slide 12 — Kết (45 giây)

> “CAPPAN không cố làm hệ điều hành.  
> Nó giúp quán không bán khống, không bỏ sót bàn, và chủ quán biết ngay khi có chuyện.”

Câu cuối:

> “Khách tự chọn. Hệ thống giữ bàn. Nhân viên chỉ bưng nước và xử lý ngoại lệ.”

---

# PHẦN B — DEMO (5 phút)

## Bước 1 — Khách không điện thoại (1 phút)

Mở POS:

```text
/staff-cashier.html?as=0900000002
```

Thao tác:

1. Chọn 1 món.
2. Thanh toán tiền mặt.
3. Nhấn thu tiền.
4. Đọc mã pickup hiện ra.

Nói:

> “Khách không cần điện thoại. Nhận số, tự lấy nước.”

## Bước 2 — Khách tại bàn (1,5 phút)

Mở:

```text
/table.html?table=A1&code=1234
```

Thao tác:

1. Thêm 1 món.
2. Gửi order.
3. Chỉ ra: “Thanh toán demo · trả trước”.
4. Mở Order Board: đơn đã lên cột MỚI.

Nói:

> “Order chỉ lên bảng khi đã thanh toán.”

## Bước 3 — Barista (1 phút)

Mở:

```text
/staff-order-board.html?as=0900000002
```

Thao tác:

1. Bấm **Bắt đầu**.
2. Bấm **Xong**.
3. Mở **Runner View**.
4. Bấm **Đã mang ra bàn**.

Nói:

> “Barista tự quyết. Runner biết đơn nào sẵn sàng.”

## Bước 4 — BOM (45 giây)

Mở:

```text
/staff-ingredients.html?as=0900000002
```

Thao tác:

1. Chỉ Matcha 3g.
2. Bán ly cuối.
3. Menu khóa món.

Nói:

> “Một ly cuối cùng — không bán khống.”

## Bước 5 — Owner (45 giây)

Mở:

```text
/staff-owner.html?as=0900000002
```

Thao tác:

1. Alert nguyên liệu.
2. Insight.
3. Recommendation.

Nói:

> “Chủ quán chỉ cần quyết 3 việc.”

## Bước 6 — Kết demo (30 giây)

> “Một order đi từ khách → quầy → bếp → runner → chủ quán.  
> Không KDS voice. Không bill mở. Không ép QR.”

---

# PHẦN C — Q&A DỰ KIẾN

## “Sao bỏ KDS/voice?”

> “Vì STT tiếng Việt trong môi trường quán không ổn định. Bỏ voice, giữ Order Board. Bài học: không đưa công nghệ chưa chín vào demo.”

## “Sao không thay POS?”

> “Trong demo, CAPPAN là lớp order. Muốn thay POS thật cần đối tác hóa đơn điện tử, cổng thanh toán, máy in, offline. Em không hứa khi chưa có.”

## “Hóa đơn điện tử đâu?”

> “Là adapter demo. Khi có đối tác, thay adapter. Chưa có giá trị pháp lý.”

## “AI đâu?”

> “AI chat khách và Owner Copilot. AI không tự chuyển trạng thái, không voice.”

## “Khác gì POS hiện có?”

> “Không chỉ bán hàng. CAPPAN giữ bàn, cọc, order board, runner, BOM, owner cockpit — một nguồn sự thật.”

## “Có pilot chưa?”

> “Chưa. Đây là demo. Cần một quán thật, baseline 2 tuần, pilot 30 ngày.”

---

# PHẦN D — CÂU CHỐT

> **“CAPPAN không làm mọi thứ.  
> Nó làm đúng một việc: giữ cho quán không bỏ sót bàn, không bán khống, và chủ quán biết ngay khi có chuyện.”**
