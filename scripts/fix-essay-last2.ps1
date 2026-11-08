$ErrorActionPreference = 'Stop'
$src = 'D:\Projectweb\cappan.doc'
$tmp = 'C:\Users\MSI\AppData\Local\Temp\cappan-last2.doc'
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

ReplaceText 'BOM và báo cáo email.' 'BOM, Owner Cockpit và báo cáo email.'
ReplaceText 'nhãn chua/thanh/giải nhiệt.' 'nhãn chua/thanh/giải nhiệt, cafein nhẹ.'

# Table 9.3: status of report row
foreach ($table in $doc.Tables) {
  for ($r = 1; $r -le $table.Rows.Count; $r++) {
    try {
      $c = $table.Cell($r, 2).Range.Text.Trim()
      if ($c -like '*Báo cáo tiểu luận*') {
        $table.Cell($r, 4).Range.Text = 'Hoàn thành (còn P0 ở 11.10)'
        Write-Output 'table 9.3 status updated'
      }
    } catch {}
  }
}

# Appendix B.2 tags and M501 name
foreach ($table in $doc.Tables) {
  for ($r = 1; $r -le $table.Rows.Count; $r++) {
    try {
      $code = $table.Cell($r, 1).Range.Text.Trim()
      if ($code -eq 'M101') {
        $table.Cell($r, 5).Range.Text = 'cafein, chua, thanh, giải nhiệt'
        Write-Output 'M101 tag fixed'
      }
      if ($code -eq 'M301') {
        $table.Cell($r, 5).Range.Text = 'trái cây, chua, thanh, ít ngọt'
        Write-Output 'M301 tag fixed'
      }
      if ($code -eq 'M501') {
        $table.Cell($r, 2).Range.Text = 'Sữa Chua Cà Phê'
        $table.Cell($r, 5).Range.Text = 'cafein, chua, béo, ngọt'
        Write-Output 'M501 fixed'
      }
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
Write-Output 'last2 saved'
