# BÁO CÁO VẬN HÀNH CAPPAN
## Bản đồ vận hành trước khi code — phiên bản demo

> **Trạng thái:** bản thiết kế vận hành cho demo, chưa phải POS thương mại.
> **Phạm vi:** khách hàng, nhân viên, chủ quán; 4 service mode; Order Board; Runner View; BOM; Owner Cockpit.
> **Không có trong bản này:** đối tác POS, cổng thanh toán thật, hóa đơn điện tử thật, KDS voice.

---

## 0. Tóm tắt điều hành

CAPPAN không cố thay toàn bộ POS thuế ngay. Trong giai đoạn demo:

> **CAPPAN là lớp order/table/queue + owner cockpit.  
> Thanh toán và hóa đơn là adapter giả lập.  
> Khi có đối tác, thay adapter — không đổi luồng.**

Ba quyết định gốc:

1. **Không ép mọi khách dùng điện thoại.**
2. **Không ép mọi đơn phải có bàn.**
3. **Nhân viên chỉ xử lý ngoại lệ; hệ thống giữ bàn, tính cọc, xếp hàng đợi.**

---

## 1. Phạm vi và giả định

| Hạng mục | Giá trị |
|---|---|
| Mô hình | Quán cà phê độc lập, 4 tầng |
| Chỗ ngồi | 32 chỗ |
| Phân khu demo | 16 chỗ Counter Pickup + 16 chỗ Table Service |
| Bàn service demo | 8 bàn × 2 chỗ (số bàn thật lấy từ pilot) |
| Menu | 24 món, 6 nhóm |
| Nhân sự | 5–10 người |
| Kênh | Tại quầy, QR tại bàn, booking, mang đi, giao hàng |
| Thanh toán | Demo; chưa có cổng thật |
| Hóa đơn | Demo; chưa có đối tác thuế |

Các con số 16 + 16, 8 bàn, 90 phút, 15 phút, 3–5% hao hụt là **đề xuất**, không phải số đo.

---

## 2. Vấn đề hiện tại

### 2.1. Khách hàng

| Vấn đề | Hậu quả |
|---|---|
| Không mang điện thoại | Bị chặn nếu chỉ có QR |
| Chỉ mua nước, ngồi xíu | Bị ép chọn bàn, mở session |
| Không biết bàn trống | Phải hỏi nhân viên |
| Chờ lâu, không biết khi nào có nước | Bực bội, hỏi lại |
| Đổi bàn | Nước mang sai bàn |
| Booking không rõ thời lượng | Bàn bị giữ, khách sau chờ |
| QR bị chụp ảnh | Người ngoài đặt món |
| Thanh toán lỗi | Không rõ đã trả chưa |
| Món hết sau thanh toán | Không rõ hoàn/đổi |
| Nhóm đông | Không có bàn đủ lớn |
| Xin hóa đơn / chia tiền | Chưa có quy trình |

### 2.2. Nhân viên

| Vấn đề | Hậu quả |
|---|---|
| Quản bàn, gán bàn, nhả bàn thủ công | Quá tải giờ cao điểm |
| Vừa thu tiền, pha chế, chạy bàn | Sai sót |
| Không có SOP ca | Mỗi người làm một kiểu |
| Bàn giao ca | Mất đơn, mất tiền |
| Kiểm kho thủ công | Hao hụt không biết |
| Không biết đơn nào ưu tiên | Khách chờ |
| Hoàn tiền không có thẩm quyền | Khách bức xúc |
| KDS/voice không ổn định | Mất thời gian |

### 2.3. Chủ quán

| Vấn đề | Hậu quả |
|---|---|
| Không biết doanh thu thật | Thất thoát tiền mặt |
| Không biết món nào lãi | Bán nhiều, lợi nhuận thấp |
| Không biết hao hụt | COGS tăng |
| Không biết no-show | Mất bàn |
| Không có baseline | Không đo được cải thiện |
| Quá nhiều alert | Bỏ qua cảnh báo |
| Không có phương án mất điện/mạng | Tê liệt |

---

## 3. Nguyên nhân gốc

1. Một luồng cho mọi khách.
2. Không phân biệt Counter Pickup / Table Service / Booking.
3. Không có trạng thái bàn và thời lượng booking.
4. Thanh toán trước nhưng chưa có hoàn tiền.
5. SOP quá nặng cho quán 5–10 người.
6. Không có KPI/baseline.
7. AI bị đặt làm trung tâm.
8. Demo thiếu backend/payment.

---

## 4. Mô hình phục vụ

### 4.1. Bốn service mode

```text
counter_pickup   → mua tại quầy, tự lấy nước
table_service    → ngồi bàn, nhân viên mang ra
takeaway         → mang đi
delivery         → giao hàng
```

`booking` là **cờ** trên `table_service`, không phải mode riêng.

### 4.2. Ba hành trình khách

1. **Mua nhanh tại quầy** — không cần bàn, không cần QR.
2. **Ngồi bàn được phục vụ** — có QR hoặc nhân viên gán bàn; có thể đặt trước.
3. **Đặt trước** — booking + cọc + check-in.

---

## 5. Sơ đồ bàn

Chỉ bàn **Table Service** mới có trạng thái:

```text
Trống
  ↓ khách chọn / quét QR
Đang giữ (5 phút)
  ↓ thanh toán
Có khách
  ↓ khách rời
Đang dọn
  ↓ nhân viên bấm “Đã dọn”
Trống
```

- Bàn Counter Pickup: không trạng thái từng bàn.
- Khu Counter Pickup: 3 mức `Còn nhiều / Sắp hết / Hết chỗ`, nhân viên bấm.
- Mã bàn 4 số; đổi sau khi dọn; chỉ người mở phiên đầu cần nhập.
- QR chỉ gắn bàn service/booking.

---

## 6. Luồng khách

### Flow A — Không điện thoại / mua nước ngồi xíu

```text
Quầy → nhân viên nhập POS → Counter Pickup → thu tiền demo
→ nhận số P01 → tự lấy nước khi màn hình gọi → ngồi khu tự do
```

Không bàn, không QR, không session.

### Flow B — Table Service

```text
Bàn service → quét QR → nhập mã bàn → thanh toán demo
→ Order Board → barista làm → Runner View → mang ra bàn
```

### Flow C — Table Service tại quầy

```text
Quầy → nhân viên nhập POS → khách chọn bàn
→ giữ bàn 5 phút → thanh toán → bàn Có khách → order
```

### Flow D — Booking

```text
Đặt bàn + cọc → bàn reserved → khách đến
→ self check-in / nhân viên check-in → mở phiên
→ order → trả phần chênh
```

- Slot 90 phút + 15 phút dọn `[Đề xuất]`.
- Grace 15 phút `[Đề xuất]`.
- Cọc = số người × giá ly rẻ nhất.
- Mỗi người một ly chỉ áp dụng booking.

### Flow E — Takeaway

```text
Web/quầy → thanh toán demo → mã pickup → Order Board → gọi số
```

### Flow F — Delivery

```text
Web → địa chỉ → phí ship → thanh toán demo → Order Board → giao
```

---

## 7. Quy tắc nghiệp vụ

### 7.1. Thanh toán

```text
unpaid → paid → preparing → served → completed
        ↘ failed
        ↘ refund_pending → refunded / partially_refunded
```

- Chỉ đơn `paid` mới lên Order Board.
- Món hết sau thanh toán: hoàn/đổi.
- Hủy trước pha: hoàn 100% `[Đề xuất]`.
- Đã pha: chính sách `[Đề xuất]`.

### 7.2. Cọc và khuyến mãi

```text
Cọc = số người × giá ly rẻ nhất (chỉ đồ uống)
Giảm giá tối đa = max(0, subtotal − deposit)
```

Nhờ vậy không có cọc dư.

### 7.3. Booking

- Slot 90 phút `[Đề xuất]`.
- Buffer dọn 15 phút `[Đề xuất]`.
- No-show 15 phút, giữ cọc theo điều khoản `[Đề xuất]`.
- Điều khoản cọc hiện trước khi thanh toán.

### 7.4. Bàn

- Giữ bàn 5 phút trước thanh toán.
- Đang dọn chặn QR.
- Mã bàn đổi sau khi dọn.
- Nhân viên bấm “Đã dọn” một chạm.

---

## 8. Order Board và Runner View

### Order Board

```text
MỚI        ĐANG LÀM        SẴN SÀNG
```

- Chỉ đơn đã thanh toán.
- Sắp mặc định: giờ hứa → thời gian chờ → loại đơn.
- Barista bấm Bắt đầu / Xong.
- Barista được kéo đơn lên; quản lý ca override.
- Không voice, không AI tự chuyển trạng thái.

### Runner View

- Chỉ đơn Table Service đã sẵn sàng.
- Hiện số bàn + món.
- Nút “Đã mang ra bàn”.
- Không voice.

---

## 9. Nhân viên

### Vai trò

| Vai trò | Việc chính |
|---|---|
| Thu ngân | POS, tiền mặt, mã pickup, tra booking |
| Barista | Pha chế, Order Board, kiểm kho |
| Runner | Mang nước, Runner View |
| Quản lý ca | Ngoại lệ, hoàn tiền, dọn bàn, báo cáo |
| Chủ quán | Owner Cockpit, duyệt |

### Việc nhân viên không làm

- Không quản lý toàn bộ sơ đồ bàn.
- Không xác nhận từng khách.
- Không kích hoạt QR.
- Không nhắc “mỗi người một ly”.
- Không tự nhả bàn.
- Không tự tính cọc.

### SOP một trang

- Mở ca: tiền lẻ, máy, nguyên liệu, bàn.
- Giữa ca: kho, vệ sinh, hàng đợi.
- Đóng ca: đối soát tiền, kiểm kho, bàn giao.
- Sự cố: 5 bước service recovery.

---

## 10. Kho và BOM

- 18 nguyên liệu, 12 BOM.
- Đơn vị ml/g/cái.
- Hao hụt cho phép 3–5% `[Đề xuất]`.
- FIFO.
- Kiểm kê cuối ngày/tuần.
- Chênh lệch lý thuyết/thực tế.
- Món hết nguyên liệu tự khóa menu.

---

## 11. Owner Cockpit

### Alert

- Nguyên liệu cạn.
- Bàn đang dọn.
- Khu tự do hết chỗ.
- Đơn chờ lâu.
- Booking quá hạn.
- Chênh lệch tiền mặt.

### Insight

- Doanh thu hôm nay.
- Món bán chạy.
- Khung giờ vắng.
- Hao hụt.

### Recommendation

- Nhập nguyên liệu.
- Mở thêm khu tự do.
- Điều chỉnh ca.
- Gửi voucher.

Chủ quán bấm **Đồng ý / Từ chối**, có audit.

---

## 12. Ranh giới demo

| Thành phần | Demo |
|---|---|
| Bàn, QR, session | Thật (localStorage) |
| Order, cọc, BOM | Thật |
| Order Board | Thật |
| Runner View | Thật |
| Payment | Giả lập |
| Hóa đơn | “Hóa đơn demo” |
| POS đối tác | Không có |
| E-invoice | Không có |

Câu ghi trong tài liệu:

> Thanh toán và hóa đơn trong demo là adapter giả lập. Không có giá trị pháp lý. Khi có đối tác, thay adapter, không đổi luồng.

---

## 13. KPI và pilot

| Nhóm | KPI |
|---|---|
| Khách | thời gian chờ, order đúng, quay lại, khiếu nại |
| Nhân viên | bước/đơn, thời gian pha, sai sót, giờ làm |
| Chủ quán | doanh thu, COGS, labor, hao hụt, no-show, công suất bàn, chênh lệch tiền mặt |
| AI | trả lời được, chuyển người, chi phí/đơn |

Pilot 30 ngày; baseline 2 tuần.

---

## 14. Roadmap

### Phase 0 — Demo (hiện tại)

- Web tĩnh, localStorage.
- Payment/invoice giả lập.
- Order Board, Runner, Owner.
- Không KDS/voice.

### Phase 1 — Pilot

- Một quán thật.
- Backend/API.
- QR payment thật.
- POS adapter/e-invoice partner.
- Shadow mode.
- Đo KPI.

### Phase 2 — Production

- Multi-device, backup, phân quyền.
- Hóa đơn điện tử.
- Offline/fallback.
- Báo cáo thuế.

---

## 15. Điều chưa chốt

1. Có đối tác POS/hóa đơn chưa? **Chưa.**
2. Quán pilot là quán nào? **Chưa.**
3. Slot 90 phút có đúng không? **Đề xuất.**
4. No-show 15 phút giữ cọc? **Đề xuất.**
5. 16 + 16 chỗ có đúng không? **Ví dụ.**
6. Có bán POS thay thế hay chỉ lớp order? **Demo: lớp order.**

---

## 16. Kết luận

> **CAPPAN không ép khách dùng điện thoại.  
> Không ép mọi đơn có bàn.  
> Nhân viên chỉ xử lý ngoại lệ.**

Và:

> **Một nguồn sự thật trong demo là thật.  
> Chỉ tiền và hóa đơn là giả lập.**
