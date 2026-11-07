$ErrorActionPreference = 'Stop'
$src = 'D:\Projectweb\cappan.doc'
$tmp = 'C:\Users\MSI\AppData\Local\Temp\cappan-counts.doc'
Copy-Item -LiteralPath $src -Destination $tmp -Force
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$doc = $word.Documents.Open($tmp, $false, $false)
$pairs = @(
  @('25 trang', '26 trang'),
  @('12 trang khach', '13 trang khach'),
  @('12 trang khách', '13 trang khách'),
  @('12 trang nhan vien', '13 trang nhan vien'),
  @('12 trang nhân viên', '13 trang nhân viên'),
  @('9 trang nhan vien', '13 trang nhan vien'),
  @('9 trang nhân viên', '13 trang nhân viên'),
  @('129 test', '130 test'),
  @('23 trang smoke', '24 trang smoke')
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
Write-Output 'counts updated'
