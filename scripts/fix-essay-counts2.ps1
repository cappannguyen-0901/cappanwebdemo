$ErrorActionPreference = 'Stop'
$src = 'D:\Projectweb\cappan.doc'
$tmp = 'C:\Users\MSI\AppData\Local\Temp\cappan-counts2.doc'
Copy-Item -LiteralPath $src -Destination $tmp -Force
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$doc = $word.Documents.Open($tmp, $false, $false)
$pairs = @(
  @('129 trường hợp', '130 trường hợp'),
  @('Khu khách hàng gồm 12 trang, khu nhân viên gồm 9 trang.', 'Khu khách hàng gồm 13 trang, khu nhân viên gồm 13 trang.')
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
Write-Output 'counts2 updated'
