$ErrorActionPreference = 'Stop'
$src = 'D:\Projectweb\cappan.doc'
$tmp = 'C:\Users\MSI\AppData\Local\Temp\cappan-fix.doc'
Copy-Item -LiteralPath $src -Destination $tmp -Force

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$doc = $word.Documents.Open($tmp, $false, $false)

# Find chapter range from end
$rEnd = $doc.Content
$rEnd.Collapse(0)
$f = $rEnd.Find
$f.Text = 'KẾT LUẬN'
$f.Forward = $false
$f.Wrap = 1
if (-not $f.Execute()) { throw 'No conclusion' }
$endPos = $rEnd.Start

$rStart = $doc.Range(0, $endPos)
$rStart.Collapse(0)
$f2 = $rStart.Find
$f2.Text = '11. CẬP NHẬT'
$f2.Forward = $false
$f2.Wrap = 1
if (-not $f2.Execute()) { throw 'No chapter 11' }
$startPos = $rStart.Start

$range = $doc.Range($startPos, $endPos)
$count = 0
foreach ($p in $range.Paragraphs) {
  $t = $p.Range.Text.Trim()
  if ($t -match '^11\.\d+\.') { $p.Style = $doc.Styles.Item(-4); $count++ }
  elseif ($t -match '^11\.') { $p.Style = $doc.Styles.Item(-3); $count++ }
}
Write-Output ("formatted=" + $count)

try { $doc.TablesOfContents.Item(1).Update() } catch { Write-Output 'toc update failed' }

$doc.Save()
$doc.Close(0)
$word.Quit()
Start-Sleep -Milliseconds 600
Copy-Item -LiteralPath $tmp -Destination $src -Force
Write-Output 'headings and toc fixed'
