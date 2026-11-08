$ErrorActionPreference = 'Stop'
$src = 'D:\Projectweb\cappan.doc'
$tmp = 'C:\Users\MSI\AppData\Local\Temp\cappan-smallfix.doc'
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

ReplaceText 'Phụ lục D cung cấp JSON workflow mẫu để import vào n8n.' 'Phụ lục C cung cấp JSON workflow mẫu để import vào n8n.'
ReplaceText 'Chương 9, 10' 'Chương 9, 10, 11'
ReplaceText 'Ún tắc' 'Ùn tắc'
ReplaceText 'lance chốt' 'chốt chặn'
ReplaceText ', cafein nhẹ.' '.'
ReplaceText ', Sữa Chua (nếu có)' ''

# Table 5.5 Console row
foreach ($table in $doc.Tables) {
  for ($r = 1; $r -lt $table.Rows.Count; $r++) {
    $c = $table.Cell($r, 1).Range.Text.Trim()
    if ($c -like '*Console*') {
      try { $table.Cell($r, 1).Range.Text = 'Kiểm tra console' } catch {}
      try { $table.Cell($r + 1, 3).Range.Text = '0 lỗi' } catch {}
    }
  }
}
Write-Output 'text/table5 fixed'

# Table 7.1: find staff table and add missing pages
$staffTable = $null
foreach ($table in $doc.Tables) {
  $hasDash = $false
  for ($r = 1; $r -le $table.Rows.Count; $r++) {
    if ($table.Cell($r, 2).Range.Text -like '*staff-dashboard.html*') { $hasDash = $true; break }
  }
  if ($hasDash -and $table.Rows.Count -ge 15) { $staffTable = $table; break }
}
if ($staffTable) {
  $add = @(
    @('Khách','table.html','QR bàn, TableSession, gọi món tại bàn'),
    @('Nhân viên','staff-order-board.html','Order Board 3 cột, trạng thái món'),
    @('Nhân viên','staff-runner.html','Runner View, đơn Table Service sẵn sàng'),
    @('Nhân viên','staff-ingredients.html','BOM, tồn kho, định mức nguyên liệu'),
    @('Nhân viên','staff-owner.html','Owner Cockpit, alert/insight/recommendation')
  )
  foreach ($a in $add) {
    $row = $staffTable.Rows.Add()
    $row.Cells.Item(1).Range.Text = $a[0]
    $row.Cells.Item(2).Range.Text = $a[1]
    $row.Cells.Item(3).Range.Text = $a[2]
  }
  Write-Output 'table 7.1 rows added'
}

# Remove Facebook Group row
foreach ($table in $doc.Tables) {
  for ($r = $table.Rows.Count; $r -ge 1; $r--) {
    try {
      if ($table.Cell($r, 1).Range.Text -like '*Facebook Group*') { $table.Rows.Item($r).Delete(); Write-Output 'facebook group removed' }
    } catch {}
  }
}

$doc.Save()
$doc.Close(0)
$word.Quit()
Start-Sleep -Milliseconds 1200
Get-Process WINWORD,wps -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Milliseconds 500
Copy-Item -LiteralPath $tmp -Destination $src -Force
Write-Output 'small fixes saved'
