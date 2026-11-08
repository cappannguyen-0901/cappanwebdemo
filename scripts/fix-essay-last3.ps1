$ErrorActionPreference = 'Stop'
$src = 'D:\Projectweb\cappan.doc'
$tmp = 'C:\Users\MSI\AppData\Local\Temp\cappan-last3.doc'
Get-Process WINWORD,wps -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Milliseconds 700
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
  $ok = $f.Execute([ref]$old,[ref]$true,[ref]$false,[ref]$false,[ref]$false,[ref]$false,[ref]$true,[ref]1,[ref]$false,[ref]$new,[ref]2)
  Write-Output ("[$ok] " + $old)
}

ReplaceText 'Bản 3.0 bổ sung bốn service mode, TableSession, Order Board, Runner View, BOM, Owner Cockpit và báo cáo email.' 'Bản 3.0 bổ sung bốn service mode; TableSession; Order Board ba cột; Runner View; BOM tự khóa món khi hết nguyên liệu; Owner Cockpit và báo cáo email. Các lỗi P0 còn lại thuộc giai đoạn pilot.'

# Insert tag correction note before B.3
for ($i = 1; $i -le $doc.Paragraphs.Count; $i++) {
  $t = $doc.Paragraphs.Item($i).Range.Text.Trim()
  if ($t -like 'B.3.*FAQ*') {
    $doc.Paragraphs.Item($i).Range.InsertBefore('Ghi chú hiệu chỉnh nhãn: M101 có caffeine do nền trà; M301 có trái cây; M501 là Sữa Chua Cà Phê (không phải Cà Phê Muối).' + "`r")
    Write-Output 'tag note inserted'
    break
  }
}

$doc.Save()
$doc.Close(0)
$word.Quit()
Start-Sleep -Milliseconds 1200
Get-Process WINWORD,wps -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Milliseconds 500
Copy-Item -LiteralPath $tmp -Destination $src -Force
Write-Output 'last3 saved'
