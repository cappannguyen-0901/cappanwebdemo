$ErrorActionPreference = 'Stop'
$src = 'D:\Projectweb\cappan.doc'
$tmp = 'C:\Users\MSI\AppData\Local\Temp\cappan-update-3.doc'
Copy-Item -LiteralPath $src -Destination $tmp -Force

$chapter = @'
11. CẬP NHẬT 3.0 — TỪ AI AGENT SANG LỚP VẬN HÀNH CAPPAN
11.1. Định vị lại sản phẩm
Phiên bản 2.0 đặt trọng tâm vào KDS và Ambient Voice. Sau khi thử nghiệm, nhóm nhận thấy nhận dạng tiếng Việt trong môi trường quán ồn không ổn định, chi phí kiểm thử cao và rủi ro demo lớn. Vì vậy, phiên bản 3.0 bỏ KDS voice khỏi phạm vi demo, giữ lại hàng đợi đơn dưới dạng Order Board không voice. Đây là quyết định sản phẩm có chủ đích: không đưa công nghệ chưa đủ tin cậy vào luồng vận hành chính.
CAPPAN được định vị là lớp vận hành cho quán cà phê độc lập, không phải hệ điều hành thay thế toàn bộ POS. Trong bản demo, CAPPAN giữ vai trò lớp order, bàn, hàng đợi và báo cáo chủ quán; thanh toán và hóa đơn là adapter giả lập. Khi có đối tác POS/hóa đơn, chỉ thay adapter, không đổi luồng nghiệp vụ.
Ba nguyên tắc của bản 3.0:
- Không ép mọi khách dùng điện thoại.
- Không ép mọi đơn phải có bàn.
- Nhân viên chỉ xử lý ngoại lệ; hệ thống giữ bàn, tính cọc và xếp hàng đợi.
11.2. Ba vai và vấn đề cần giải quyết
Đối với khách hàng, các vấn đề chính là không biết còn chỗ hay không, không biết bao lâu có nước, phải chờ để gọi món, sợ ngồi nhầm bàn đã đặt, ngại gọi thêm và không muốn bị buộc phải dùng điện thoại. Bản 3.0 giải quyết bằng ba hành trình: mua nhanh tại quầy, ngồi bàn được phục vụ và đặt trước. Khách không có điện thoại đi luồng quầy; khách muốn ngồi lâu dùng QR hoặc nhân viên gán bàn; khách đặt trước có cọc và check-in.
Đối với nhân viên, vấn đề là quản bàn thủ công, nhập đơn trùng, không biết đơn nào làm trước, bàn nào đang dọn và dễ sót đơn giờ cao điểm. Bản 3.0 đưa vào Order Board ba cột Mới, Đang làm, Sẵn sàng; Runner View cho người mang nước; POS Table Service bắt buộc chọn bàn và tự mở phiên bàn sau khi thanh toán. Nhân viên không phải đánh dấu bàn thủ công.
Đối với chủ quán, vấn đề là không biết doanh thu thật, không biết hao hụt, không biết no-show và không có báo cáo đều đặn. Bản 3.0 dùng Owner Cockpit để tổng hợp Alert, Insight, Recommendation; đồng thời thiết kế báo cáo cuối ngày gửi qua email cho chủ quán. Trong demo, nội dung báo cáo được tổng hợp từ dữ liệu localStorage và kết xuất thành nội dung email; ở production, Automation Engine hoặc n8n sẽ gửi qua SMTP.
11.3. Bốn service mode
Hệ thống dùng bốn service mode:
- counter_pickup: khách mua tại quầy, không cần bàn, nhận mã pickup và tự lấy nước.
- table_service: khách ngồi bàn, có QR hoặc nhân viên gán bàn, nhân viên mang nước ra bàn.
- takeaway: khách mang đi, không bàn, có mã pickup.
- delivery: khách đặt giao hàng, không bàn, có địa chỉ và phí ship.
Booking không phải service mode riêng mà là cờ booking trên table_service. Cách tách này giúp một bàn có thể vừa phục vụ khách vãng lai vừa nhận khách đặt trước mà không tạo thêm nhánh nghiệp vụ.
11.4. Quy trình khách hàng
Trường hợp 1 — khách mua tại quầy, không dùng điện thoại: khách nói món, nhân viên nhập POS, chọn Counter Pickup, thu tiền, hệ thống trả mã pickup. Khách ngồi khu tự do và tự lấy nước khi nghe gọi số. Không tạo TableSession, không cần bàn.
Trường hợp 2 — khách ngồi bàn và gọi qua QR: khách quét QR, nhập mã bàn bốn số, hệ thống kiểm tra trạng thái bàn. Nếu bàn trống, hệ thống mở TableSession và chuyển bàn sang occupied ngay trước khi khách chọn món. Khách thanh toán demo, order gắn table_id và table_session_id, Order Board nhận đơn, Runner View nhận đơn khi sẵn sàng. Nếu bàn đang dọn hoặc đã đặt, hệ thống chặn và gợi ý bàn khác.
Trường hợp 3 — khách đặt bàn trước: khách đặt bàn và thanh toán cọc. Khi đến, khách đưa số điện thoại hoặc mã booking; nhân viên check-in. Hệ thống mở TableSession cho đúng bàn, chuyển bàn sang occupied và ghi nhận depositRemaining. Khi khách gọi món, mỗi order tự trừ cọc theo nguyên tắc depositApplied = min(depositRemaining, order.total); phần còn lại là amountDue. Cuối phiên, nếu cọc còn dư thì xử lý theo chính sách hoàn/credit. Khách có thể order tại quầy hoặc tại bàn.
Trường hợp 4 — khách mang đi hoặc giao hàng: không tạo TableSession. Mang đi có mã pickup; giao hàng có địa chỉ và phí ship. Cả hai đều đi qua Order Board và chỉ vào hàng đợi khi đã thanh toán.
Trạng thái bàn chỉ áp dụng cho bàn Table Service: Trống, Đang giữ, Có khách, Đang dọn. Bàn Counter Pickup không có trạng thái từng bàn; khu tự do dùng ba mức ước lượng do nhân viên bấm: còn nhiều, sắp hết, hết chỗ.
11.5. Quy trình nhân viên
Order Board là màn hình tại quầy pha chế, gồm ba cột Mới, Đang làm, Sẵn sàng. Chỉ đơn đã thanh toán mới xuất hiện. Hệ thống sắp mặc định theo giờ hứa, thời gian chờ và loại đơn; barista bấm Bắt đầu, Xong và có thể kéo đơn lên; quản lý ca có quyền override. Không có voice, không AI tự chuyển trạng thái.
Runner View là màn hình riêng cho người mang nước, chỉ hiện đơn Table Service đã sẵn sàng, kèm số bàn và nút Đã mang ra bàn. Nhờ tách hai màn hình, barista không phải kiêm việc điều phối runner.
POS tại quầy có hai lựa chọn: Counter Pickup hoặc Table Service. Với Table Service, POS bắt buộc chọn bàn trước khi thu tiền; sau khi thanh toán thành công, API tự mở TableSession, chuyển bàn sang occupied và gắn order vào phiên. Với Counter Pickup, POS không yêu cầu bàn và sinh mã pickup.
Khi bàn đang dọn, nhân viên bấm Đã dọn trên dashboard hoặc Order Board; bàn trở về available và mã bàn được đổi. Đây là thao tác một chạm duy nhất còn lại của nhân viên trên sơ đồ bàn.
11.6. Chủ quán và báo cáo email
Owner Cockpit tổng hợp ba lớp thông tin:
- Alert: nguyên liệu cạn, bàn đang dọn, khu tự do hết chỗ, đơn chờ lâu, booking quá hạn.
- Insight: doanh thu hôm nay, món bán chạy, khung giờ vắng, hao hụt.
- Recommendation: nhập nguyên liệu, mở thêm khu, điều chỉnh ca, gửi voucher.
Báo cáo cuối ngày được thiết kế để gửi qua email với các nhóm nội dung: doanh thu, số đơn theo service mode, no-show, món hết, cảnh báo tồn kho và ba việc cần quyết. Trong bản demo, nút Tạo báo cáo email kết xuất nội dung email từ dữ liệu hiện tại để chủ quán xem trước; production sẽ nối SMTP/n8n để gửi tự động. Cách làm này giữ đúng nguyên tắc: demo không giả vờ có hạ tầng email thật, nhưng nội dung và luồng báo cáo đã rõ.
11.7. AI và chatbot
AI Agent trong CAPPAN không thay nhân viên và không tự quyết định tiền. AI đảm nhận bốn việc:
- Chatbot khách: trả lời menu, giá, thành phần, gợi ý món, hướng dẫn đặt bàn và theo dõi đơn.
- Generative UI: trả về thẻ dữ liệu có nút hành động thay vì chỉ văn bản.
- Hỗ trợ nhân viên: tra cứu đơn, booking, tồn kho, KPI.
- Owner Copilot: giải thích alert/insight và gợi ý hành động.
Kiến trúc AI gồm các tầng: chuẩn hoá tiếng Việt, phân loại ý định, tách multi-intent, kiểm tra an toàn, gọi handler nội bộ, LocalBrain/KB, và chỉ gọi LLM khi cần. Các kỹ thuật chính gồm rule-based intent, slot filling, draft engine, knowledge base, tool calling, kiểm chứng dữ liệu và anti-hallucination guard. Công nghệ sử dụng: HTML/CSS/JavaScript thuần, Web Speech API cho đầu vào giọng nói ở chat khách, local-first API trên localStorage, mô hình ngôn ngữ lớn làm fallback, và Generative UI.
Nguyên tắc an toàn: dữ liệu nghiệp vụ lấy từ API, không để LLM tự bịa giá; câu hỏi ngoài phạm vi được chuyển nhân viên; thao tác huỷ/hoàn tiền phải có xác nhận; mọi hành động quan trọng ghi audit.
11.8. Automation
AutomationEngine xử lý các rule vận hành:
- nhả bàn held quá hạn;
- tự khoá món khi nguyên liệu hết;
- cảnh báo tồn kho thấp;
- tổng hợp báo cáo cuối ngày;
- tạo nội dung email báo cáo.
Mỗi rule có điều kiện, hành động, log và khả năng hoàn tác. Trong production, các rule này có thể chuyển sang n8n hoặc worker server để chạy ngoài trình duyệt. Bản demo chạy trong tab để giữ tính local-first.
11.9. Demo và minh chứng
Bản demo 3.0 gồm 26 trang: 13 trang khách và 13 trang nhân viên. Các màn hình chính: trang chủ, menu, đặt bàn, QR bàn, POS, Order Board, Runner View, BOM, Owner Cockpit. Dữ liệu nằm trong localStorage; thanh toán và hóa đơn là adapter giả lập.
Kịch bản demo trọng tâm là Một ly matcha cuối cùng: kho còn 3g, khách order ly cuối, menu tự khoá, Order Board xử lý, Runner mang ra bàn, Owner nhận alert. Kịch bản này chứng minh vòng khép kín bán → kho → menu → báo cáo → quyết định.
Kết quả kiểm thử: 130 test tự động, build 26 trang, smoke 24 trang trên Chrome headless, verify 26 trang tự chứa.
11.10. Giới hạn
Bản demo chưa có backend, chưa có thanh toán thật, chưa có hóa đơn điện tử thật, chưa có đối tác POS. Mã bàn demo là 1234 và được đổi sau khi kết thúc phiên. Các con số 16 chỗ + 16 chỗ, 8 bàn, 90 phút, 15 phút, 3–5% hao hụt là đề xuất, chưa đo từ quán thật. Các lỗi P0 còn lại gồm trừ cọc chưa atomic, áp cọc khi booking chưa thanh toán, và xử lý cọc dư cuối phiên; đây là việc của giai đoạn pilot, không phải demo.
'@

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$doc = $word.Documents.Open($tmp, $false, $false)

$starts = @()
$ends = @()
for ($i = 1; $i -le $doc.Paragraphs.Count; $i++) {
  $t = $doc.Paragraphs.Item($i).Range.Text.Trim()
  if ($t -like '11. CẬP NHẬT*') { $starts += $i }
  if ($t -like 'KẾT LUẬN*') { $ends += $i }
}
if ($starts.Count -eq 0 -or $ends.Count -eq 0) { throw "Không tìm thấy chương 11 hoặc KẾT LUẬN" }
$startPara = $starts[$starts.Count - 1]
$endPara = $ends[$ends.Count - 1]
if ($endPara -le $startPara) { throw "Vị trí KẾT LUẬN không hợp lệ" }

$startPos = $doc.Paragraphs.Item($startPara).Range.Start
$endPos = $doc.Paragraphs.Item($endPara).Range.Start
$range = $doc.Range($startPos, $endPos)
$range.Text = $chapter

# Format headings in the replaced range
$newRange = $doc.Range($startPos, $startPos + $chapter.Length)
foreach ($p in $newRange.Paragraphs) {
  $t = $p.Range.Text.Trim()
  try {
    if ($t -match '^11\.\d+\.') { $p.Style = $doc.Styles.Item(-4) }
    elseif ($t -match '^11\.') { $p.Style = $doc.Styles.Item(-3) }
  } catch {}
}

# Update stale counts
$repls = @(
  @('25 trang', '26 trang'),
  @('12 trang khách', '13 trang khách'),
  @('12 trang nhân viên', '13 trang nhân viên'),
  @('9 trang nhân viên', '13 trang nhân viên'),
  @('129 test', '130 test'),
  @('23 trang smoke', '24 trang smoke')
)
foreach ($pair in $repls) {
  $find = $doc.Content.Find
  $find.ClearFormatting()
  $find.Replacement.ClearFormatting()
  $find.Text = $pair[0]
  $find.Replacement.Text = $pair[1]
  $find.Forward = $true
  $find.Wrap = 1
  [void]$find.Execute([ref]$pair[0],[ref]$true,[ref]$false,[ref]$false,[ref]$false,[ref]$false,[ref]$true,[ref]1,[ref]$false,[ref]$pair[1],[ref]2)
}

try { $doc.TablesOfContents.Item(1).Update() } catch {}
try { $doc.Fields.Update() } catch {}

$doc.Save()
$doc.Close(0)
$word.Quit()
Start-Sleep -Milliseconds 700
Copy-Item -LiteralPath $tmp -Destination $src -Force
Write-Output "essay updated"
