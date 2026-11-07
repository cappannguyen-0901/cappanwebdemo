from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

BG = RGBColor(0x1B, 0x12, 0x0E)
CARD = RGBColor(0x2A, 0x1A, 0x14)
GOLD = RGBColor(0xE8, 0xC7, 0x66)
CREAM = RGBColor(0xF5, 0xEA, 0xD9)
MUTED = RGBColor(0xC9, 0xB8, 0xA4)
GREEN = RGBColor(0x8F, 0xC9, 0x8A)
RED = RGBColor(0xE6, 0x9A, 0x8A)

prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)


def slide():
    s = prs.slides.add_slide(prs.slide_layouts[6])
    bg = s.background.fill
    bg.solid()
    bg.fore_color.rgb = BG
    return s


def text(s, txt, x, y, w, h, size=18, color=CREAM, bold=False, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP):
    box = s.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = box.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = anchor
    p = tf.paragraphs[0]
    p.alignment = align
    r = p.add_run()
    r.text = txt
    r.font.size = Pt(size)
    r.font.bold = bold
    r.font.name = 'Arial'
    r.font.color.rgb = color
    return box


def card(s, x, y, w, h, color=CARD, line=None):
    shp = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(x), Inches(y), Inches(w), Inches(h))
    shp.fill.solid()
    shp.fill.fore_color.rgb = color
    if line:
        shp.line.color.rgb = line
        shp.line.width = Pt(0.8)
    else:
        shp.line.fill.background()
    shp.shadow.inherit = False
    return shp


def kicker(s, txt):
    text(s, txt.upper(), 0.65, 0.42, 12.0, 0.3, 10, GOLD, True)


def title(s, txt, sub=None, size=31):
    text(s, txt, 0.65, 0.78, 12.0, 0.8, size, CREAM, True)
    if sub:
        text(s, sub, 0.68, 1.5, 11.8, 0.4, 12, MUTED)


def footer(s, n):
    text(s, 'CAPPAN · 2026', 0.65, 7.06, 6.0, 0.25, 8.5, MUTED)
    text(s, f'{n:02d} / 10', 11.9, 7.06, 0.8, 0.25, 8.5, MUTED, align=PP_ALIGN.RIGHT)


# 1 — Giới thiệu
s = slide()
card(s, 8.35, 0.75, 4.35, 5.95, CARD, GOLD)
text(s, 'CAPPAN', 8.95, 1.15, 3.3, 0.7, 34, GOLD, True)
text(s, 'WORKFLOW LAYER', 8.98, 1.9, 3.2, 0.3, 10, MUTED, True)
text(s, 'Vận hành quán\ncà phê,\nkhông bỏ sót bàn.', 8.95, 2.4, 3.55, 1.9, 24, CREAM, True)
text(s, 'Khách tự chọn · Hệ thống giữ bàn\nNhân viên chỉ xử lý ngoại lệ', 8.98, 4.55, 3.25, 0.8, 10.5, MUTED)
text(s, 'BẢN DEMO · 11/2026', 0.7, 0.55, 4.0, 0.3, 10, GOLD, True)
text(s, 'Một nguồn sự thật\ncho khách — nhân viên — chủ quán.', 0.75, 1.9, 7.2, 1.75, 31, CREAM, True)
text(s, '32 chỗ · 4 tầng · 24 món · 5–10 nhân viên', 0.78, 4.0, 7.0, 0.4, 13, MUTED)
text(s, '26 trang · 13 khách + 13 nhân viên · 130 test', 0.78, 4.5, 7.2, 0.4, 13, GOLD)
footer(s, 1)

# 2 — Web giải quyết gì
s = slide(); kicker(s, '01 · VẤN ĐỀ'); title(s, 'Web giải quyết việc gì cho ba vai?', 'Không phải thêm một trang web. Là bớt việc rơi.')
cols = [
    ('KHÁCH HÀNG', 'Không biết chỗ, chờ lâu, sợ nhầm bàn, ngại gọi thêm', 'QR bàn · đặt trước · theo dõi đơn · gọi thêm', GREEN),
    ('NHÂN VIÊN', 'Quản bàn tay, sót đơn, không biết đơn nào trước', 'POS · Order Board · Runner View · BOM', GOLD),
    ('CHỦ QUÁN', 'Không biết doanh thu thật, hao hụt, no-show', 'Owner Cockpit · email báo cáo · gợi ý AI', RED),
]
for i, (h, problem, solution, c) in enumerate(cols):
    x = 0.65 + i * 4.15
    card(s, x, 1.95, 3.85, 4.55, CARD, c)
    text(s, h, x + 0.25, 2.2, 3.3, 0.3, 9, c, True)
    text(s, problem, x + 0.25, 2.75, 3.25, 1.3, 15, CREAM, True)
    text(s, '→ ' + solution, x + 0.25, 4.45, 3.25, 1.1, 10.5, MUTED)
footer(s, 2)

# 3 — Quy trình khách
s = slide(); kicker(s, '02 · KHÁCH HÀNG'); title(s, 'Một số quy trình và trường hợp khách.', 'Bốn trường hợp — bốn lời hứa dịch vụ.')
rows = [
    ('01', 'Mua tại quầy', 'Không điện thoại → POS → mã pickup → tự lấy', 'Counter Pickup'),
    ('02', 'Ngồi bàn', 'QR bàn → mã bàn → trả trước → nhân viên mang ra', 'Table Service'),
    ('03', 'Đặt trước', 'Cọc → check-in → mở phiên → tự trừ cọc', 'Booking'),
    ('04', 'Mang đi / giao hàng', 'Mã pickup / địa chỉ + phí ship', 'Remote'),
]
for i, (n, h, b, tag) in enumerate(rows):
    y = 1.95 + i * 1.12
    text(s, n, 0.7, y, 0.5, 0.35, 11, GOLD, True)
    text(s, h, 1.2, y - 0.05, 5.2, 0.4, 18, CREAM, True)
    text(s, b, 1.22, y + 0.36, 6.3, 0.35, 10.5, MUTED)
    card(s, 8.7, y - 0.08, 3.5, 0.65, CARD, GOLD)
    text(s, tag, 8.92, y + 0.08, 3.1, 0.28, 10, GOLD, True)
text(s, 'Không khách nào bị chặn vì không có điện thoại.', 0.7, 6.55, 12.0, 0.35, 13, GOLD, True)
footer(s, 3)

# 4 — Nhân viên
s = slide(); kicker(s, '03 · NHÂN VIÊN'); title(s, 'Quy trình nhân viên: một bảng, một màn hình.', 'Order Board cho barista. Runner View cho người mang nước.')
card(s, 0.65, 1.95, 6.0, 4.55, CARD, GOLD)
text(s, 'ORDER BOARD', 0.92, 2.2, 3.5, 0.3, 10, GOLD, True)
for i, (h, b) in enumerate([('MỚI', 'Chờ bắt đầu'), ('ĐANG LÀM', 'Đang pha'), ('SẴN SÀNG', 'Chờ runner')]):
    x = 0.95 + i * 1.85
    card(s, x, 2.8, 1.65, 1.3, BG, GOLD)
    text(s, h, x + 0.1, 2.9, 1.45, 0.22, 7.5, GOLD, True)
    text(s, b, x + 0.1, 3.22, 1.45, 0.35, 7.5, MUTED)
text(s, 'Chỉ đơn đã thanh toán · barista tự quyết · quản lý ca override', 0.95, 4.65, 5.3, 0.55, 10.5, MUTED)
text(s, 'Không AI tự chuyển trạng thái.', 0.95, 5.45, 5.0, 0.3, 10.5, RED, True)
card(s, 6.95, 1.95, 5.7, 4.55, CARD, GREEN)
text(s, 'RUNNER VIEW', 7.22, 2.2, 3.5, 0.3, 10, GREEN, True)
text(s, 'Chỉ Table Service đã sẵn sàng.', 7.22, 2.8, 5.0, 0.7, 21, CREAM, True)
text(s, 'Số bàn · món · nút “Đã mang ra”.\nKhông cần nhìn bảng lớn.', 7.24, 3.7, 5.0, 0.8, 11, MUTED)
text(s, 'POS Table Service: chọn bàn → tự mở phiên → occupied.', 7.22, 5.55, 5.1, 0.55, 9.5, GOLD, True)
footer(s, 4)

# 5 — Chủ quán + email
s = slide(); kicker(s, '04 · CHỦ QUÁN'); title(s, 'Chủ quán biết qua email báo cáo.', 'Báo cáo cũ + gợi ý AI; chỉ báo cáo ngày mới thêm kho.')
items = [
    ('ALERT', 'Nguyên liệu cạn\nBàn đang dọn\nĐơn chờ lâu', RED),
    ('INSIGHT', 'Doanh thu\nMón bán chạy\nKhung giờ vắng', GOLD),
    ('GỢI Ý AI', 'Nhập hàng\nMở khu\nĐổi ca', GREEN),
]
for i, (h, b, c) in enumerate(items):
    x = 0.65 + i * 4.15
    card(s, x, 1.9, 3.85, 3.25, CARD, c)
    text(s, h, x + 0.26, 2.15, 3.3, 0.3, 9, c, True)
    text(s, b, x + 0.26, 2.7, 3.2, 1.45, 16, CREAM, True)
    text(s, 'Từ dữ liệu thật trong demo' if i < 2 else 'Đồng ý / Từ chối · audit', x + 0.26, 4.45, 3.2, 0.3, 9, MUTED)
card(s, 0.65, 5.4, 12.0, 1.25, CARD, GOLD)
text(s, '📧 EMAIL BÁO CÁO', 0.9, 5.55, 3.5, 0.28, 9, GOLD, True)
text(s, 'Doanh thu · đơn · AOV · kênh · booking · cọc · lấp bàn · top món · gợi ý AI', 0.9, 5.85, 9.4, 0.3, 10.5, CREAM)
text(s, '+ Kho: chỉ báo cáo NGÀY · tuần/tháng/năm giữ nguyên', 9.15, 6.12, 3.25, 0.3, 8.5, GOLD, align=PP_ALIGN.RIGHT)
footer(s, 5)

# 6 — AI làm được gì
s = slide(); kicker(s, '05 · AI & CHATBOT'); title(s, 'AI/chatbot làm được gì?', 'Tư vấn, tra cứu, gợi ý — không tự quyết định tiền.')
caps = [
    ('CHAT KHÁCH', 'Menu · giá · thành phần\nđặt bàn · theo dõi đơn'),
    ('GENERATIVE UI', 'Trả thẻ dữ liệu + nút\nkhông chỉ văn bản'),
    ('HỖ TRỢ NHÂN VIÊN', 'Tra đơn · booking\nKPI · tồn kho'),
    ('OWNER COPILOT', 'Giải thích alert\nvà gợi ý hành động'),
]
for i, (h, b) in enumerate(caps):
    x = 0.65 + (i % 2) * 6.2
    y = 1.95 + (i // 2) * 2.1
    card(s, x, y, 5.85, 1.8, CARD, GOLD if i == 0 else None)
    text(s, h, x + 0.25, y + 0.2, 5.2, 0.3, 9, GOLD, True)
    text(s, b, x + 0.25, y + 0.6, 5.2, 0.8, 14, CREAM, True)
text(s, 'Không tự huỷ · không tự hoàn tiền · không tự đổi giá.', 0.7, 6.5, 12.0, 0.35, 12, RED, True)
footer(s, 6)

# 7 — Kiến trúc AI
s = slide(); kicker(s, '06 · KIẾN TRÚC AI'); title(s, 'Rule trước, LLM sau, dữ liệu là gốc.', 'Pipeline 6 tầng, có guard và Generative UI.')
steps = [
    ('01', 'Chuẩn hoá', 'tiếng Việt\nkhông dấu'),
    ('02', 'Ý định', 'rule + slot\nmulti-intent'),
    ('03', 'Dữ liệu', 'KB · LocalBrain\nAPI nội bộ'),
    ('04', 'LLM', 'chỉ khi cần\nfallback'),
    ('05', 'Guard', 'chống bịa\nkiểm chứng'),
    ('06', 'UI', 'text + thẻ\nhành động'),
]
for i, (n, h, b) in enumerate(steps):
    x = 0.55 + i * 2.1
    card(s, x, 1.9, 1.9, 2.8, CARD, GOLD if i == 3 else None)
    text(s, n, x + 0.15, 2.08, 0.5, 0.25, 8, GOLD, True)
    text(s, h, x + 0.15, 2.4, 1.65, 0.35, 13, CREAM, True)
    text(s, b, x + 0.15, 2.95, 1.65, 0.85, 8.5, MUTED)
text(s, 'Công nghệ: HTML/CSS/JS · Web Speech API · localStorage API · LLM fallback · Generative UI', 0.7, 5.35, 12.0, 0.35, 10.5, GOLD)
text(s, 'Thuật toán: intent classification · slot filling · draft engine · tool calling · anti-hallucination', 0.7, 5.85, 12.0, 0.35, 10, MUTED)
text(s, 'Source: js/ai/brain.js · multi-intent-splitter.js · injection-guard.js · handover.js · ai-output.js', 0.7, 6.35, 12.0, 0.3, 8.5, MUTED)
footer(s, 7)

# 8 — Automation
s = slide(); kicker(s, '07 · AUTOMATION'); title(s, 'Automation: việc lặp lại, có log và undo.', 'Rule chạy trong tab; production có thể chuyển n8n/worker.')
rules = [
    ('RULE 01', 'Nhả bàn held quá hạn', '15 phút · trừ booking đã cọc\nBàn về available'),
    ('RULE 02', 'Món hết nguyên liệu', 'Tự khoá menu\nOrder Board vẫn chạy'),
    ('RULE 03', 'BOM sắp cạn', 'Cảnh báo tồn kho\nGợi ý nhập hàng'),
]
for i, (n, h, b) in enumerate(rules):
    x = 0.65 + i * 4.15
    card(s, x, 1.95, 3.85, 3.1, CARD, GOLD)
    text(s, n, x + 0.25, 2.15, 3.0, 0.3, 9, GOLD, True)
    text(s, h, x + 0.25, 2.55, 3.25, 0.85, 16, CREAM, True)
    text(s, b, x + 0.25, 3.65, 3.2, 0.85, 10, MUTED)
text(s, 'Báo cáo email: tổng hợp doanh thu + gợi ý AI; kho chỉ thêm cho báo cáo ngày.', 0.7, 5.55, 12.0, 0.4, 11, GOLD)
text(s, 'Mỗi rule có điều kiện · hành động · log · hoàn tác.', 0.7, 6.05, 12.0, 0.35, 10, MUTED)
footer(s, 8)

# 9 — Demo
s = slide(); kicker(s, '08 · DEMO'); title(s, 'Demo sản phẩm: một ly matcha cuối cùng.', 'Khách → Order Board → Runner → Owner.')
steps = [
    ('01', 'Khách', 'QR bàn A1\nthanh toán demo'),
    ('02', 'Order Board', 'đã thanh toán\nMới → Đang làm'),
    ('03', 'Runner', 'Sẵn sàng\nĐã mang ra'),
    ('04', 'Owner', 'Alert\nGợi ý AI'),
]
for i, (n, h, b) in enumerate(steps):
    x = 0.55 + i * 3.15
    card(s, x, 1.95, 2.95, 3.15, CARD, GOLD if i == 1 else None)
    text(s, n, x + 0.18, 2.15, 0.5, 0.25, 9, GOLD, True)
    text(s, h, x + 0.18, 2.5, 2.6, 0.4, 15, CREAM, True)
    text(s, b, x + 0.18, 3.15, 2.6, 0.9, 9.5, MUTED)
text(s, 'Demo: 26 trang · 130 test · 24 smoke · 26 verify', 0.7, 5.55, 12.0, 0.4, 11, GOLD)
text(s, 'URL: table.html?table=A1&code=1234 · staff-order-board.html · staff-runner.html', 0.7, 6.05, 12.0, 0.35, 9.5, MUTED)
footer(s, 9)

# 10 — Tầm nhìn
s = slide(); kicker(s, '09 · TẦM NHÌN'); title(s, 'Hướng đi tiếp theo: từ demo đến pilot.', 'Workflow layer, không thay POS thuế.')
rows = [
    ('PHASE 0', 'Demo hôm nay', '26 trang · localStorage\nOrder Board · Runner · Owner'),
    ('PHASE 1', 'Pilot 1 quán', 'backend/API · QR payment\nPOS/hóa đơn đối tác · KPI 30 ngày'),
    ('PHASE 2', 'Production', 'e-invoice · offline · backup\nnhiều chi nhánh · phân quyền'),
]
for i, (n, h, b) in enumerate(rows):
    x = 0.65 + i * 4.15
    card(s, x, 1.95, 3.85, 3.0, CARD, GOLD)
    text(s, n, x + 0.25, 2.15, 3.0, 0.3, 9, GOLD, True)
    text(s, h, x + 0.25, 2.55, 3.2, 0.45, 17, CREAM, True)
    text(s, b, x + 0.25, 3.2, 3.2, 1.0, 10, MUTED)
text(s, 'Không bán “AI thay người”. Bán thời gian, bàn, và quyết định.', 0.7, 5.5, 12.0, 0.4, 12, GOLD, True)
text(s, 'Cảm ơn — CAPPAN', 0.7, 6.15, 4.0, 0.35, 13, CREAM, True)
footer(s, 10)

prs.save(r'D:\Projectweb\cappan-slides-v4.pptx')
print('saved', len(prs.slides), 'slides')
