$ErrorActionPreference = 'Stop'
$src = 'D:\Projectweb\cappan.doc'
$tmp = 'C:\Users\MSI\AppData\Local\Temp\cappan-email2.doc'
Copy-Item -LiteralPath $src -Destination $tmp -Force
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$doc = $word.Documents.Open($tmp, $false, $false)
$pairs = @(
  @('doanh thu, số đơn hoàn tất/hủy, AOV; kho: tổng SKU, sắp cạn, đã hết và danh sách nguyên liệu', 'doanh thu, số đơn hoàn tất/hủy, AOV, kênh bán, booking, cọc, lấp bàn, top món và gợi ý hướng đi của AI. Riêng báo cáo ngày có thêm trạng thái kho: tổng SKU, sắp cạn, đã hết và danh sách nguyên liệu; báo cáo tuần/tháng/năm giữ nguyên, không thêm kho'),
  @('trang Thống kê có nút Gửi email báo cáo để kết xuất nội dung email', 'trang Thống kê có nút Gửi email báo cáo để kết xuất nội dung email; báo cáo ngày có thêm kho, báo cáo tuần/tháng/năm giữ nguyên')
)
foreach ($pair in $pairs) {
  $find = $doc.Content.Find
  $find.ClearFormatting()
  $find.Replacement.ClearFormatting()
  $find.Text = $pair[0]
  $find.Replacement.Text = $pair[1]
  $find.Forward = $true
  $find.Wrap = 1
  [void]$find.Execute([ref]$pair[0],[ref]$true,[ref]$false,[ref]$false,[ref]$false,[ref]$false,[ref]$true,[ref]1,[ref]$false,[ref]$pair[1],[ref]2)
}
$doc.Save()
$doc.Close(0)
$word.Quit()
Start-Sleep -Milliseconds 500
Copy-Item -LiteralPath $tmp -Destination $src -Force
Write-Output 'essay email restored'
