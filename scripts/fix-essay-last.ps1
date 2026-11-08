$ErrorActionPreference = 'Stop'
$src = 'D:\Projectweb\cappan.doc'
$tmp = 'C:\Users\MSI\AppData\Local\Temp\cappan-last.doc'
Get-Process WINWORD,wps -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Milliseconds 800
Copy-Item -LiteralPath $src -Destination $tmp -Force
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$doc = $word.Documents.Open($tmp, $false, $false)
function ReplaceText($old, $new) {
  $f = $doc.Content.Find
  $f.ClearFormatting(); $f.Replacement.ClearFormatting()
  $f.Text = $old; $f.Replacement.Text = $new
  $f.Forward = $true; $f.Wrap = 1
  [void]$f.Execute([ref]$old,[ref]$true,[ref]$false,[ref]$false,[ref]$false,[ref]$false,[ref]$true,[ref]1,[ref]$false,[ref]$new,[ref]2)
}
ReplaceText 'xác nhận thanh toán)' 'xác nhận thanh toán, QR bàn)'
ReplaceText 'thống kê AI)' 'thống kê AI, Order Board, Runner, Owner, nguyên liệu)'
ReplaceText 'có trách nhiệm.' 'có trách nhiệm. Bản 3.0 bổ sung bốn service mode, TableSession, Order Board, Runner View, BOM và báo cáo email.'
$doc.Save()
$doc.Close(0)
$word.Quit()
Start-Sleep -Milliseconds 1200
Get-Process WINWORD,wps -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Milliseconds 500
Copy-Item -LiteralPath $tmp -Destination $src -Force
Write-Output 'last fixes saved'
