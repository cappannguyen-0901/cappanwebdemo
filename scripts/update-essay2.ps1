$ErrorActionPreference = 'Stop'
$src = 'D:\Projectweb\cappan.doc'
$tmp = 'C:\Users\MSI\AppData\Local\Temp\cappan-update-4.doc'
Copy-Item -LiteralPath $src -Destination $tmp -Force

$raw = Get-Content -LiteralPath 'D:\Projectweb\scripts\update-essay.ps1' -Raw -Encoding UTF8
$m = [regex]::Match($raw, "(?s)\`$chapter = @'\r?\n(.*?)\r?\n'@")
if (-not $m.Success) { throw 'Không trích được nội dung chương' }
$chapter = $m.Groups[1].Value

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$doc = $word.Documents.Open($tmp, $false, $false)

# Tìm KẾT LUẬN thật từ cuối lên
$rEnd = $doc.Content
$rEnd.Collapse(0)
$fEnd = $rEnd.Find
$fEnd.ClearFormatting()
$fEnd.Text = 'KẾT LUẬN'
$fEnd.Forward = $false
$fEnd.Wrap = 1
$foundEnd = $fEnd.Execute()
if (-not $foundEnd) { throw 'Không tìm thấy KẾT LUẬN' }
$endPos = $rEnd.Start
Write-Output ('endPos=' + $endPos)

# Tìm heading chương 11 thật, lùi từ KẾT LUẬN
$rStart = $doc.Range(0, $endPos)
$rStart.Collapse(0)
$fStart = $rStart.Find
$fStart.ClearFormatting()
$fStart.Text = '11. CẬP NHẬT'
$fStart.Forward = $false
$fStart.Wrap = 1
$foundStart = $fStart.Execute()
if (-not $foundStart) { throw 'Không tìm thấy chương 11' }
$startPos = $rStart.Start
Write-Output ('startPos=' + $startPos)

$range = $doc.Range($startPos, $endPos)
$range.Text = $chapter
Write-Output ('replaced chars=' + $chapter.Length)

# Format heading styles
$newRange = $doc.Range($startPos, $startPos + $chapter.Length)
foreach ($p in $newRange.Paragraphs) {
  $t = $p.Range.Text.Trim()
  try {
    if ($t -match '^11\.\d+\.') { $p.Style = $doc.Styles.Item(-4) }
    elseif ($t -match '^11\.') { $p.Style = $doc.Styles.Item(-3) }
  } catch {}
}

$doc.Save()
$doc.Close(0)
$word.Quit()
Start-Sleep -Milliseconds 700
Copy-Item -LiteralPath $tmp -Destination $src -Force
Write-Output 'essay updated'
