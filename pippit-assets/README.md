# CAPPAN — Pippit.ai Asset Pack

Bộ ảnh giao diện sạch, chụp trực tiếp từ bản demo CAPPAN, dùng làm nguồn hình ảnh chính cho Pippit.ai. Không dùng ảnh mockup, không watermark.

## 1. Ảnh giao diện

8 ảnh giao diện là **PNG, 2400×1350, tỷ lệ 16:9**, chụp đúng khung màn hình, không cắt. Poster Facebook là ảnh dọc **2160×2700, tỷ lệ 4:5**.

| Tệp | Màn hình | Nội dung chính |
|---|---|---|
| `01-trang-chu.png` | Trang chủ | Hero CAPPAN, slogan, nút “Đặt chỗ ngay” / “Xem thực đơn” |
| `02-thuc-don.png` | Thực đơn | 24 món, 6 nhóm, tìm kiếm; Latte Nóng 55.000đ |
| `03-them-mon.png` | Đặt nước / thêm vào giỏ | Latte Nóng size M, 55.000đ, đã thêm 1 món vào giỏ |
| `04-chat-dat-ban.png` | Chat đặt bàn | “đặt bàn 2 người 19h” → xác nhận bàn A1, 2 người, 19h hôm nay |
| `05-thanh-toan-qr.png` | Thanh toán / QR | Chuyển khoản cọc giữ bàn, bàn A1, cọc 35.000đ, QR |
| `06-xac-nhan.png` | Xác nhận thành công | “Thanh toán cọc thành công!”, A1, 19:00 05/11/2026, cọc 35.000đ |
| `07-dashboard.png` | Dashboard vận hành | KPI 32 chỗ, 31 trống, 1 đang giữ; sơ đồ bàn A1 |
| `08-pos.png` | POS | 2 Cà phê sữa + 1 Trà đào = 115.000đ; khách đưa 200.000đ; thối 85.000đ |
| `09-poster-3-tinh-nang.png` | Poster Facebook (4:5) | “Một khung chat. Ba việc.” — 3 tính năng, ảnh UI thật, CTA CAPPAN |

Ảnh giao diện 16:9 đã ẩn banner “Bản demo”, toast và các nút debug. Giữ nguyên header, nav, chat launcher và nội dung sản phẩm. Poster `09-...` là ảnh dọc **2160×2700 (4:5)**, dùng cho bài đăng Facebook.

> Prompt gợi ý để dán trực tiếp vào Pippit: `pippit-prompt.md`.

## 2. Luồng sản phẩm chính

**Khách mở menu → chọn Latte Nóng → thêm vào giỏ → đặt bàn 19:00 → xác nhận bàn A1 → thanh toán cọc 35.000đ → nhân viên thấy A1 trên dashboard.**

Thứ tự dùng trong Pippit:

1. `01-trang-chu.png`
2. `02-thuc-don.png`
3. `03-them-mon.png`
4. `04-chat-dat-ban.png`
5. `05-thanh-toan-qr.png`
6. `06-xac-nhan.png`
7. `07-dashboard.png`

`08-pos.png` là màn hình bổ trợ cho phần vận hành, không bắt buộc nằm trong luồng đặt bàn.

## 3. Nội dung chữ chính xác

### Trang chủ
- `CAPPAN`
- `COFFEE & MORE - HOME STUDY`
- `Hương vị đậm đà · Không gian yên tĩnh · Nơi lý tưởng để học tập & làm việc`
- Nút: `Đặt chỗ ngay`, `Xem thực đơn`

### Thực đơn / món
- `Thực Đơn CAPPAN`
- `Khám phá 24 món đồ uống đặc sắc`
- `Latte Nóng` — `55.000đ`
- `Cà Phê Sữa Đá` — `35.000đ`
- `Trà Đào Cam Sả` — `45.000đ`
- Nút: `+ Đặt món này`, `+ Thêm vào giỏ`

### Chat đặt bàn
- Người dùng: `đặt bàn 2 người 19h`
- Bot: `Dạ em gợi ý: bàn A1 (sức chứa 2) trống lúc 19:00 hôm nay — cho 2 người. Anh/chị kiểm tra thẻ bên dưới rồi xác nhận nhé ạ?`
- Thẻ: `Xem lại bàn đã chọn`
- `Bàn A1 · sức chứa 2 · 2 người`
- `19h hôm nay`
- Nút: `Giữ bàn & chọn cọc`, `Đổi bàn khác`, `Hủy`

### Thanh toán / QR
- `Chuyển khoản cọc giữ bàn`
- `Bàn A1 · 2 người`
- `19h hôm nay`
- `Cọc: 35.000đ · chỉ nhận chuyển khoản`
- `35.000đ`
- `Quét QR bằng điện thoại hoặc mở trang thanh toán trên thiết bị này.`
- Nút: `Mở trang thanh toán`, `Kiểm tra thanh toán`, `Hủy giữ bàn`
- `Mã giữ chỗ: BH...`

### Xác nhận thành công
- `Thanh toán cọc thành công!`
- `CAPPAN đã ghi nhận cọc và giữ bàn cho bạn. Hẹn gặp bạn tại quán!`
- `Bàn A1 · 2 người`
- `19:00 05/11/2026`
- `Cọc đã thu: 35.000đ`
- Nút: `Về trang chủ`, `Booking của tôi`

### Dashboard
- `Tổng quan ca làm việc`
- `32` — `TỔNG SỐ CHỖ`
- `31` — `CHỖ TRỐNG`
- `1` — `ĐANG GIỮ`
- `0` — `ĐÃ ĐẶT`
- `Sơ đồ chỗ ngồi`
- `A1` — `2 khách`
- `Đơn hàng đang xử lý`

### POS
- `Thu ngân tại quầy`
- `Thực đơn`, `Hoá đơn`
- `Cà Phê Sữa Đá` ×2 — `70.000đ`
- `Trà Đào Cam Sả` ×1 — `45.000đ`
- `Tạm tính` / `Tổng cộng`: `115.000đ`
- `Khách đưa`: `200000`
- `Tiền thối: 85.000đ`
- Nút: `Thu tiền`

## 4. Tài sản thương hiệu

- **Logo SVG:** `logo-cappan.svg`
- **Logo PNG trong suốt:** `logo-cappan.png` — 1024×1024
- **Màu chính:**
  - Nâu cà phê `#6F4E37`
  - Nâu đậm `#3E2723` / `#2A1A14`
  - Vàng gold `#C9A227`
  - Kem `#F5E6D3` / `#FBF7F0`
  - Xanh success `#2E7D32`
  - Đỏ cảnh báo `#C62828`
- **Font:**
  - UI: `Inter` (fallback `Segoe UI`, system-ui)
  - Heading/logo: `Playfair Display` (fallback `Georgia`)
- **Ảnh sản phẩm:** `product/latte-nong.jpg`, `product/tra-dao-cam-sa.jpg`, `product/ca-phe-sua-da.jpg`
- **Ảnh nền quán:** `background-quan.jpg`

## 5. Cách dùng với Pippit.ai

- Upload 7 ảnh theo đúng thứ tự luồng; dùng `08-pos.png` ở cảnh vận hành nếu cần.
- Giữ nguyên tỷ lệ **16:9**; không crop mất header/nút.
- Không để Pippit tự sinh lại chữ trong UI; dùng đúng nội dung ở mục 3.
- Có thể zoom nhẹ vào thẻ xác nhận, QR, hoặc bàn A1; không làm mờ chữ.
- Logo dùng `logo-cappan.png` hoặc `logo-cappan.svg`.
- Nhạc/SFX/voiceover: thêm ở Pippit; bộ ảnh này không có audio.
- Thanh toán trong ảnh là **mô phỏng**, không phải giao dịch thật.

## 6. Bản chạy tham khảo

- Demo cục bộ: `http://localhost:5173`
- Mã nguồn: `https://github.com/cappannguyen-0901/cappanwebdemo`
- Video quay màn hình: `../demo-cappan-notalk.mp4` (4:45, không audio)
- Video có phụ đề: `../demo-cappan-5phut.mp4`

## 7. Lưu ý

- Ảnh được chụp từ giao diện thật, không dùng AI để vẽ lại UI.
- Nếu Pippit cần thêm ảnh trạng thái, có thể bổ sung: login, profile, tracking, staff-bookings, staff-stats.
- Nếu cần ảnh **chỉ có UI, không có header** hoặc ảnh **9:16**, có thể xuất thêm từ cùng bộ trạng thái.
