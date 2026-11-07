# CAPPAN — NỘI DUNG THUYẾT TRÌNH & BẢO VỆ
## Phiên bản Workflow OS · 25 slide · 15–20 phút

> **Một câu chốt:**
> “POS ghi nhận đơn. CAPPAN điều phối việc con người làm. Web demo là lát cắt chứng minh điều đó chạy được.”

---

## 1. Cấu trúc 15 phút

| Thời lượng | Nội dung | Slide |
|---:|---|---|
| 0:00–2:00 | Vấn đề & tầm nhìn | 1–5 |
| 2:00–5:00 | Kiến trúc, workflow, AI | 6–15 |
| 5:00–11:00 | Demo: QR → KDS voice → Owner | 16–18 |
| 11:00–14:00 | Bằng chứng thực thi + mô hình kinh doanh | 19–24 |
| 14:00–15:00 | Giới hạn, roadmap, Q&A | 24–25 |

Nếu có 20 phút: thêm phần deep-dive slide 8–15 và Q&A kỹ thuật.

---

## 2. Lời mở đầu (30 giây)

> “Em không làm một website đặt món. Em đang thiết kế **lớp điều phối vận hành** cho quán cà phê: khách tự order tại bàn, bếp điều phối bằng KDS và giọng nói, chủ quán chỉ nhận việc cần quyết. Web demo là **Phase 0** — lát cắt chạy được để chứng minh tầm nhìn, không phải sản phẩm cuối.”

---

## 3. Vấn đề (1 phút)

> “Quán 32 chỗ, 4 tầng, 24 món. Mọi thứ đang chạy bằng tin nhắn, sổ tay và trí nhớ:
> - bàn giữ ảo, khách không đến;
> - hết nguyên liệu vẫn bán;
> - đơn sai, hoàn tiền;
> - chủ quán không biết vì sao hôm nay vắng.
>
> POS giải quyết **ghi đơn**. Nó không giải quyết **dòng chảy công việc**.”

Nhấn mạnh:

> “Điểm nghẽn không nằm ở chỗ thiếu phần mềm. Nằm ở chỗ con người phải làm việc quanh phần mềm.”

---

## 4. Tầm nhìn (1 phút) — slide 5

> “CAPPAN có ba lớp:
> 1. **Guest Layer** — khách tự order tại bàn qua QR, gọi thêm, bill chung.
> 2. **Staff Layer** — KDS + Ambient Voice: tay bận vẫn điều khiển được hàng đợi.
> 3. **Owner Layer** — Alert, Insight, Recommendation: chỉ quyết việc quan trọng.
>
> Đó là lý do web demo không phải ‘trang đặt món’. Nó là **reference implementation** của ba lớp này.”

Câu chốt:

> “POS ghi đơn. CAPPAN điều phối việc con người làm.”

---

## 5. Kiến trúc & AI (2 phút) — slide 6–15

### 5.1. Kiến trúc

> “Mọi dữ liệu đi qua `API Facade`. AI không chạm database, chỉ gọi endpoint whitelist. Nhờ vậy sau này thay localStorage bằng backend mà không phải viết lại UI.”

### 5.2. AI pipeline

> “Local-first: KB/LocalBrain xử lý phần lớn câu hỏi, 0 token. LLM chỉ là fallback. Tool-call bắt buộc cho hành động; Generative UI trả JSON contract, renderer cố định — không trả HTML thô.”

### 5.3. An toàn

> “Guard, phân quyền theo intent, tool executor kiểm tra role, confirm 2 bước, anti-hallucination. AI không được tự nhận ‘đã đặt’ nếu không có tool-call.”

### 5.4. BOM

> “Matcha demo có đúng 3g bột cho 1 ly. Bán 1 ly là kho về 0; menu tự chuyển ‘Hết nguyên liệu’. Đây là ví dụ nhỏ nhưng chứng minh logic vận hành thật.”

---

## 6. Demo (6 phút) — slide 16–18

### Act 1 — Khách (2 phút)

Mở `table.html?table=A1`.

> “Khách quét QR bàn A1. Hệ thống mở TableSession. Khách chọn Latte, gửi order. Order vào KDS với source `qr_table`, không có phí ship.”

Nếu muốn show AI chat:

Mở `index.html`, hỏi:

> “Gợi ý món ít ngọt dưới 50k.”
> “Đặt bàn 2 người 19h.”

Nói:

> “AI trả thẻ dữ liệu thật, có lý do; không bịa món/giá.”

### Act 2 — Bếp (2 phút)

Mở `staff-kds.html?as=0900000002`.

- Bấm **“Nạp 3 đơn demo”**.
- Bấm **“Đọc đơn tiếp theo”** — AI TTS đọc.
- Bấm **Bắt đầu** / **Xong** trên thẻ — hoặc nói:
  - “Đơn tiếp theo”
  - “Xong A12”
  - “Hết sữa” → AI đọc danh sách món bị khóa, hỏi xác nhận.
- Chỉ vào 3 chế độ: Voice Only / Voice + Screen / Screen Only.
- Nếu AI đọc sai giọng: mở dropdown **Giọng**, chọn giọng `vi-VN` (Microsoft HoaiMy/NamMinh hoặc Google Tiếng Việt), bấm **Test**.

Nói:

> “Voice dùng Web Speech API. Push-to-talk, whitelist, 2-step confirm, undo. Nếu mic lỗi, vẫn bấm nút — demo không bị chặn. Nếu máy chưa có giọng tiếng Việt, em chọn trong dropdown hoặc cài Vietnamese voice trong Windows.”

### Act 3 — Chủ quán (2 phút)

Mở `staff-owner.html?as=0900000002`.

- Alert: “Sắp cạn Bột matcha”.
- Insight: doanh thu, món bán chạy, rủi ro tồn kho.
- Recommendation: “Nhập thêm Bột matcha”.
- Bấm **Đồng ý** → audit + toast.
- Hỏi Owner Copilot: “Hôm nay thế nào?”, “Vì sao?”, “Gợi ý”.

Nói:

> “Đây là rule-based copilot, không phải ML. Mọi câu trả lời lấy từ dữ liệu thật; không tự bịa số.”

---

## 7. Bằng chứng thực thi (2 phút) — slide 19–22

> “Em không chỉ vẽ slide:
> - 25 trang: 13 khách + 12 nhân viên;
> - 128 test tự động;
> - 23 trang smoke trên Chrome;
> - 3 rule automation;
> - 10 test BOM, 4 test TableSession/KDS;
> - build 25 trang tự chứa.”

Câu chốt:

> “Web demo là bằng chứng nhỏ nhất rằng domain model, API facade, AI local-first, BOM và KDS chạy được.”

---

## 8. Mô hình kinh doanh & roadmap (2 phút) — slide 23–24

> “Định vị: **Workflow Layer / Add-on** trên POS hiện có, không thay POS ngay.
> Target: quán 5–10 nhân viên, >100 ly/ngày.
> Pilot 30 ngày; đo no-show, hao hụt, thời gian order.
> Nếu pilot đạt, mới mở rộng; nếu không, đo lại — không hứa ROI khi chưa có số.”

Roadmap:

- P0: web demo (hiện tại).
- P1: QR/KDS/voice/Owner + pilot.
- P2: backend/payment/POS.
- P3: Workflow OS.

---

## 9. Giới hạn — nói thẳng (1 phút)

> “Bản demo vẫn:
> - localStorage, chưa multi-device;
> - cọc/payment mô phỏng;
> - voice là Web Speech API, chưa phải STT production;
> - automation chạy trong tab;
> - BOM một cấp.
>
> Đây là Phase 0. Em không claim production.”

Câu chốt:

> “Em xin thầy/cô đánh giá **hướng đi và khả năng thực thi**, không phải một hệ thống đã hoàn chỉnh.”

---

## 10. Q&A — câu trả lời mẫu

### “Vì sao gọi là Operating System?”

> “Đó là cách gọi tầm nhìn: một lớp điều phối ba vai trò. Bản hiện tại là reference implementation, chưa phải OS production. Em dùng ‘Workflow Layer’ khi nói với quán.”

### “Khác KiotViet/Sapo thế nào?”

> “Không cạnh tranh ở POS. KiotViet mạnh về giao dịch, hóa đơn, payment. CAPPAN bổ sung lớp workflow: QR TableSession, KDS voice, Owner Cockpit. Trước mắt là add-on.”

### “Voice có thật không?”

> “Có, ở mức demo: Web Speech API STT + TTS. Production cần Vbee/Google STT, headset và backend. Em chọn push-to-talk vì quán ồn và cần riêng tư.”

### “AI có bịa không?”

> “AI local-first, tool-call bắt buộc cho hành động, anti-hallucination guard, policy. Nếu không có tool-call, AI không được nhận ‘đã đặt’.”

### “Vì sao web tĩnh?”

> “PoC local-first để chứng minh luồng và domain model. Mọi thứ qua API Facade; backend là Phase 1. Web tĩnh giúp demo offline, không phụ thuộc server.”

### “Sao không làm backend luôn?”

> “Thời gian và phạm vi. Em chọn làm lát cắt chạy được trước, backend sau. Nếu làm backend ngay, em không có demo để bảo vệ.”

### “Có multi-device không?”

> “Demo dùng localStorage + BroadcastChannel 2 tab. Chưa phải multi-device thật. Production cần backend/DB.”

### “TableSession có xử lý split bill không?”

> “Chưa. Demo mới cộng bill theo phiên. Split/merge là Phase 2; em ghi rõ trong hạn chế.”

### “Tự động phạt cọc?”

> “Không. Em dùng ‘giữ cọc theo chính sách’, không tự phạt. Cần điều khoản và nhân viên xử lý tranh chấp.”

### “Queue ưu tiên delivery trước có đúng không?”

> “Đó là rule demo. Production nên dùng SLA + thời gian chờ + thời gian pha, có aging; em đã ghi trong phần hạn chế.”

### “ROI có thật không?”

> “Các con số ROI là mô hình giả định, chưa pilot. Em không claim đã đo. Bước tiếp theo là pilot 30 ngày.”

### “Điểm mạnh nhất của đồ án?”

> “Domain model TableSession/DepositLedger + workflow ba lớp + web demo chạy được. Không phải mô hình AI mới.”

---

## 11. Câu kết (30 giây)

> “CAPPAN bắt đầu từ một web demo nhỏ, nhưng không dừng ở web. Nó là lát cắt của một lớp điều phối vận hành: khách tự phục vụ, bếp được AI hỗ trợ, chủ quán chỉ quyết việc quan trọng.
>
> Em không xin thầy/cô tin rằng hệ thống đã hoàn chỉnh. Em xin thầy/cô đánh giá xem **hướng đi này có đúng và có thể mở rộng hay không**.”

---

## 12. Checklist trước bảo vệ

- [ ] Mở `staff-kds.html?as=0900000002`, bấm “Nạp 3 đơn demo” trước.
- [ ] Mở `staff-owner.html?as=0900000002`, kiểm tra alert hiển thị.
- [ ] Mở `table.html?table=A1`, thử thêm món.
- [ ] Cấp quyền micro; chuẩn bị headset.
- [ ] Có fallback nút bấm nếu voice lỗi.
- [ ] Reset kho demo trước khi quay.
- [ ] Chuẩn bị video quay màn hình dự phòng.
- [ ] Nói rõ: “Phase 0 / prototype / demo”, không nói “production”.
- [ ] Không nói “ăn đứt KiotViet”, “AI thay nhân viên”, “tiết kiệm 10 lần”.

---

## 13. Slide map nhanh

| Slide | Nội dung |
|---:|---|
| 1 | Cover |
| 2 | Vấn đề |
| 3 | Người dùng |
| 4 | Giải pháp / 3 nguyên tắc |
| 5 | **Một order — ba góc nhìn** |
| 6 | Kiến trúc 5 tầng |
| 7 | Pipeline 8 tầng |
| 8–15 | Deep dive kỹ thuật |
| 16 | **QR → KDS → Voice** |
| 17 | **Owner Cockpit** |
| 18 | Demo giao diện |
| 19 | Mô hình & kiểm thử |
| 20 | Gợi ý món |
| 21 | Website 25 trang |
| 22 | Facebook |
| 23 | **Roadmap / mô hình kinh doanh** |
| 24 | Kết quả |
| 25 | Q&A |
