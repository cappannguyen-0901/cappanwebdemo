$ErrorActionPreference = 'Stop'
$src = 'D:\Projectweb\cappan.doc'
$tmp = 'C:\Users\MSI\AppData\Local\Temp\cappan-numbers.doc'
Copy-Item -LiteralPath $src -Destination $tmp -Force
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$doc = $word.Documents.Open($tmp, $false, $false)

function ReplaceText($old, $new) {
  $find = $doc.Content.Find
  $find.ClearFormatting(); $find.Replacement.ClearFormatting()
  $find.Text = $old; $find.Replacement.Text = $new
  $find.Forward = $true; $find.Wrap = 1
  $ok = $find.Execute([ref]$old,[ref]$true,[ref]$false,[ref]$false,[ref]$false,[ref]$false,[ref]$true,[ref]1,[ref]$false,[ref]$new,[ref]2)
  Write-Output ("[$ok] " + $old + " -> " + $new)
}

ReplaceText 'gồm 12 trang dành cho khách hàng' 'gồm 13 trang dành cho khách hàng'
ReplaceText 'và 9 trang dành cho nhân viên' 'và 13 trang dành cho nhân viên'
ReplaceText 'Báo cáo được tổ chức thành 10 chương' 'Báo cáo được tổ chức thành 11 chương'
ReplaceText '110/110' '130/130'
ReplaceText '110 bài kiểm thử' '130 bài kiểm thử'
ReplaceText '110' '130'
ReplaceText '23 trang' '24 trang'
ReplaceText '19/19' '24/24'
ReplaceText '4,55' '4,30'
ReplaceText '3,75' '3,70'
ReplaceText '3,90' '3,95'
ReplaceText 'hai rule trên' 'ba rule trên (nhả bàn, món hết, BOM)'
ReplaceText 'Ngoài hai rule vận hành' 'Ngoài ba rule vận hành'
ReplaceText 'Local xử lý 80-90% câu hỏi phổ biến' 'Local xử lý phần lớn câu hỏi phổ biến (chưa đo tỷ lệ chính xác)'
ReplaceText 'Giảm 30-40% câu hỏi lặp (mục tiêu)' 'Mục tiêu giảm 30-40% câu hỏi lặp (chưa đo)'
ReplaceText '16 chỗ + 16 chỗ, 8 bàn' '16 chỗ Counter Pickup + 8 bàn ×2 chỗ = 16 chỗ Table Service (tổng 32 chỗ)'
ReplaceText 'Chương 11 trình bày chi tiết các thay đổi này.' 'Bản 2.0 có thử nghiệm KDS/Ambient Voice; 3.0 bỏ khỏi demo và giữ Order Board không voice. Chương 11 trình bày chi tiết.'
ReplaceText 'Nielsen, J. (2020). Usability Engineering. Morgan Kaufmann.' 'Nielsen, J. (1993). Usability Engineering. Morgan Kaufmann.'
ReplaceText 'LlamaIndex & LangChain Documentation. (2024). Concepts and Architectures of AI Agents in Workflow Automation.' 'LlamaIndex. (2024). LlamaIndex Documentation. https://docs.llamaindex.ai'

$doc.Save()
$doc.Close(0)
$word.Quit()
Start-Sleep -Milliseconds 700
Copy-Item -LiteralPath $tmp -Destination $src -Force
Write-Output 'numbers saved'
