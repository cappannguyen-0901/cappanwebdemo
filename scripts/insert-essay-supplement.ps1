$ErrorActionPreference = 'Stop'
$src = 'D:\Projectweb\cappan.doc'
$tmp = 'C:\Users\MSI\AppData\Local\Temp\cappan-insert.doc'
$sec10 = 'D:\Projectweb\scripts\essay-sec10.docx'
$bom = 'D:\Projectweb\scripts\essay-bom.docx'
Copy-Item -LiteralPath $src -Destination $tmp -Force

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$doc = $word.Documents.Open($tmp, $false, $false)

# Find blank section 10 by scanning backwards
$p10 = $null
for ($i = $doc.Paragraphs.Count; $i -ge 1; $i--) {
  $t = $doc.Paragraphs.Item($i).Range.Text.Trim()
  if ($t -eq '10.' -or $t -eq '10') { $p10 = $doc.Paragraphs.Item($i); break }
}
if (-not $p10) { throw 'No blank section 10' }
$r10 = $p10.Range
$r10.Text = ''
$r10.InsertFile($sec10)
Write-Output 'section 10 inserted'

# Find chapter 11, then 11.9
$r = $doc.Content
$f = $r.Find
$f.ClearFormatting()
$f.Text = '11. CẬP NHẬT 3.0'
$f.Forward = $true
$f.Wrap = 1
if (-not $f.Execute()) { throw 'No chapter 11' }
$chStart = $r.Start
$r2 = $doc.Range($chStart, $doc.Content.End)
$f2 = $r2.Find
$f2.ClearFormatting()
$f2.Text = '11.9. Demo và minh chứng'
$f2.Forward = $true
$f2.Wrap = 1
if (-not $f2.Execute()) { throw 'No 11.9 heading' }
$ins = $doc.Range($r2.Start, $r2.Start)
$ins.InsertFile($bom)
Write-Output 'BOM inserted'

$doc.Save()
$doc.Close(0)
$word.Quit()
Start-Sleep -Milliseconds 700
Copy-Item -LiteralPath $tmp -Destination $src -Force
Write-Output 'saved'
