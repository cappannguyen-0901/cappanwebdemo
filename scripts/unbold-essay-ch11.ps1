$ErrorActionPreference = 'Stop'
$src = 'D:\Projectweb\cappan.doc'
$tmp = 'C:\Users\MSI\AppData\Local\Temp\cappan-unbold.doc'
Copy-Item -LiteralPath $src -Destination $tmp -Force
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$doc = $word.Documents.Open($tmp, $false, $false)
$r = $doc.Content
$f = $r.Find
$f.ClearFormatting(); $f.Text = '11. CẬP NHẬT 3.0'; $f.Forward = $true; $f.Wrap = 1
if ($f.Execute()) {
  $start = $r.Start
  $r2 = $doc.Range($start, $doc.Content.End)
  $f2 = $r2.Find
  $f2.ClearFormatting(); $f2.Text = 'KẾT LUẬN'; $f2.Forward = $true; $f2.Wrap = 1
  if ($f2.Execute()) {
    $end = $r2.Start
    $body = $doc.Range($start, $end)
    $body.Font.Bold = 0
    Write-Output 'unbolded chapter 11'
  }
}
$doc.Save()
$doc.Close(0)
$word.Quit()
Start-Sleep -Milliseconds 1200
Copy-Item -LiteralPath $tmp -Destination $src -Force
Write-Output 'saved'
