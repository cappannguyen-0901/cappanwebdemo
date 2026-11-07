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


def title(s, txt, sub=None, size=32):
    text(s, txt, 0.65, 0.78, 12.0, 0.8, size, CREAM, True)
    if sub:
        text(s, sub, 0.68, 1.52, 11.8, 0.4, 12, MUTED)


def footer(s, n):
    text(s, 'CAPPAN · WORKFLOW LAYER', 0.65, 7.06, 7.0, 0.25, 8.5, MUTED)
    text(s, f'{n:02d} / 12', 11.9, 7.06, 0.8, 0.25, 8.5, MUTED, align=PP_ALIGN.RIGHT)


# 1 Cover
s = slide()
card(s, 8.4, 0.8, 4.25, 5.9, CARD, GOLD)
text(s, 'CAPPAN', 9.0, 1.2, 3.2, 0.7, 34, GOLD, True)
text(s, 'WORKFLOW LAYER', 9.02, 1.95, 3.2, 0.3, 10, MUTED, True)
text(s, 'Vận hành quán\ncà phê,\nkhông bỏ sót bàn.', 8.95, 2.5, 3.5, 1.9, 25, CREAM, True)
text(s, 'Khách tự chọn · Hệ thống giữ bàn\nNhân viên chỉ xử lý ngoại lệ', 8.98, 4.6, 3.25, 0.8, 11, MUTED)
text(s, 'BẢN DEMO · 2026', 0.7, 0.55, 4.0, 0.3, 10, GOLD, True)
text(s, 'Một nguồn sự thật\ncho khách — nhân viên — chủ quán.', 0.75, 1.95, 7.2, 1.7, 31, CREAM, True)
text(s, '32 chỗ · 4 tầng · 24 món · 5–10 nhân viên', 0.78, 4.0, 7.0, 0.4, 13, MUTED)
text(s, 'Order Board · Runner View · Owner Cockpit · AI Chatbot', 0.78, 4.5, 7.2, 0.4, 13, GOLD)
footer(s, 1)

# 2 Problem
s = slide(); kicker(s, '01 · VẤN ĐỀ'); title(s, 'Ba người, ba câu hỏi, một nguồn sự thật thiếu.', 'Không ai thấy cùng một bức tranh.')
cards = [
    ('KHÁCH', 'Có chỗ không?\nBao lâu có nước?', 'Không điện thoại · ngồi xíu · booking'),
    ('NHÂN VIÊN', 'Đơn nào trước?\nBàn nào đang dọn?', 'Quản bàn tay · thiếu SOP · quá tải'),
    ('CHỦ QUÁN', 'Hôm nay mất gì?\nAi cần xử lý?', 'Hao hụt · no-show · không baseline'),
]
for i, (h, q, b) in enumerate(cards):
    x = 0.65 + i * 4.15
    card(s, x, 2.05, 3.85, 4.55, CARD, GOLD if i == 1 else None)
    text(s, h, x + 0.28, 2.3, 3.2, 0.3, 10, GOLD, True)
    text(s, q, x + 0.28, 2.85, 3.25, 1.25, 21, CREAM, True)
    text(s, b, x + 0.28, 5.35, 3.2, 0.85, 11, MUTED)
footer(s, 2)

# 3 Customer flows
s = slide(); kicker(s, '02 · KHÁCH HÀNG'); title(s, 'Không phải mọi khách đều đi qua QR.', 'Bốn trường hợp, bốn lời hứa dịch vụ.')
rows = [
    ('01', 'Mua tại quầy', 'Không điện thoại · nhận mã pickup · tự lấy', 'Counter Pickup'),
    ('02', 'Ngồi bàn', 'QR bàn · trả trước · nhân viên mang ra', 'Table Service'),
    ('03', 'Đặt trước', 'Cọc · check-in · tự trừ cọc', 'Booking'),
    ('04', 'Mang đi / giao hàng', 'Mã pickup · phí ship · Order Board', 'Remote'),
]
for i, (n, h, b, tag) in enumerate(rows):
    y = 1.95 + i * 1.12
    text(s, n, 0.7, y, 0.5, 0.35, 11, GOLD, True)
    text(s, h, 1.2, y - 0.05, 5.0, 0.4, 18, CREAM, True)
    text(s, b, 1.22, y + 0.35, 6.3, 0.35, 10.5, MUTED)
    card(s, 8.7, y - 0.08, 3.5, 0.65, CARD, GOLD)
    text(s, tag, 8.92, y + 0.08, 3.1, 0.28, 10, GOLD, True)
text(s, 'Không khách nào bị chặn vì không có điện thoại.', 0.7, 6.55, 12.0, 0.35, 13, GOLD, True)
footer(s, 3)

# 4 Staff
s = slide(); kicker(s, '03 · NHÂN VIÊN'); title(s, 'Bỏ voice, không bỏ hàng đợi.', 'Một bảng cho barista. Một màn hình cho runner.')
card(s, 0.65, 1.95, 6.0, 4.6, CARD, GOLD)
text(s, 'ORDER BOARD', 0.92, 2.2, 3.5, 0.3, 10, GOLD, True)
for i, (h, b) in enumerate([('MỚI', 'Chờ bắt đầu'), ('ĐANG LÀM', 'Đang pha'), ('SẴN SÀNG', 'Chờ runner')]):
    x = 0.95 + i * 1.85
    card(s, x, 2.8, 1.65, 1.3, BG, GOLD)
    text(s, h, x + 0.1, 2.9, 1.45, 0.22, 7.5, GOLD, True)
    text(s, b, x + 0.1, 3.22, 1.45, 0.35, 7.5, MUTED)
text(s, 'Chỉ đơn đã thanh toán · barista tự quyết · quản lý ca override', 0.95, 4.65, 5.3, 0.55, 10.5, MUTED)
text(s, 'Không AI tự chuyển trạng thái.', 0.95, 5.45, 5.0, 0.3, 10.5, RED, True)
card(s, 6.95, 1.95, 5.7, 4.6, CARD, GREEN)
text(s, 'RUNNER VIEW', 7.22, 2.2, 3.5, 0.3, 10, GREEN, True)
text(s, 'Chỉ Table Service đã sẵn sàng.', 7.22, 2.8, 5.0, 0.7, 21, CREAM, True)
text(s, 'Số bàn · món · nút “Đã mang ra”.\nKhông cần nhìn bảng lớn.', 7.24, 3.7, 5.0, 0.8, 11, MUTED)
text(s, 'POS Table Service: chọn bàn → tự mở phiên → occupied.', 7.22, 5.55, 5.1, 0.55, 9.5, GOLD, True)
footer(s, 4)

# 5 Owner + email
s = slide(); kicker(s, '04 · CHỦ QUÁN'); title(s, 'Không phải dashboard. Là ba việc cần quyết.', 'Alert → Insight → Recommendation → Email cuối ngày.')
items = [
    ('ALERT', 'Nguyên liệu cạn\nBàn đang dọn\nKhu tự do hết chỗ', RED),
    ('INSIGHT', 'Doanh thu hôm nay\nMón bán chạy\nKhung giờ vắng', GOLD),
    ('RECOMMENDATION', 'Nhập hàng\nMở khu\nĐổi ca', GREEN),
]
for i, (h, b, c) in enumerate(items):
    x = 0.65 + i * 4.15
    card(s, x, 1.95, 3.85, 3.4, CARD, c)
    text(s, h, x + 0.26, 2.2, 3.3, 0.3, 9, c, True)
    text(s, b, x + 0.26, 2.75, 3.2, 1.5, 15, CREAM, True)
    text(s, 'Từ dữ liệu thật trong demo' if i < 2 else 'Đồng ý / Từ chối · audit', x + 0.26, 4.65, 3.2, 0.3, 9, MUTED)
card(s, 0.65, 5.55, 12.0, 1.05, CARD, GOLD)
text(s, '📧 BÁO CÁO EMAIL CUỐI NGÀY', 0.9, 5.7, 4.5, 0.28, 9, GOLD, True)
text(s, 'Doanh thu · đơn theo mode · no-show · món hết · 3 việc cần quyết', 0.9, 6.0, 9.5, 0.35, 11, CREAM)
text(s, 'Demo: tạo nội dung email · Production: SMTP/n8n', 9.3, 5.95, 3.1, 0.3, 8.5, MUTED, align=PP_ALIGN.RIGHT)
footer(s, 5)

# 6 AI capability
s = slide(); kicker(s, '05 · AI & CHATBOT'); title(s, 'AI không thay người. AI trả lời và gợi ý.', 'Bốn việc, có kiểm soát.')
caps = [
    ('CHAT KHÁCH', 'Menu · giá · thành phần\nđặt bàn · theo dõi đơn'),
    ('GENERATIVE UI', 'Trả thẻ dữ liệu + nút\nkhông chỉ văn bản'),
    ('HỖ TRỢ NHÂN VIÊN', 'Tra đơn · booking\nKPI · tồn kho'),
    ('OWNER COPILOT', 'Giải thích alert\ngợi ý hành động'),
]
for i, (h, b) in enumerate(caps):
    x = 0.65 + (i % 2) * 6.2
    y = 1.95 + (i // 2) * 2.15
    card(s, x, y, 5.85, 1.85, CARD, GOLD if i == 0 else None)
    text(s, h, x + 0.25, y + 0.2, 5.2, 0.3, 9, GOLD, True)
    text(s, b, x + 0.25, y + 0.6, 5.2, 0.85, 14, CREAM, True)
text(s, 'Không tự huỷ · không tự hoàn tiền · không tự đổi giá.', 0.7, 6.55, 12.0, 0.35, 12, RED, True)
footer(s, 6)

# 7 AI architecture
s = slide(); kicker(s, '06 · KIẾN TRÚC AI'); title(s, 'Rule trước, LLM sau, dữ liệu là gốc.', 'Pipeline 6 tầng + Generative UI.')
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
    card(s, x, 2.0, 1.9, 2.9, CARD, GOLD if i == 3 else None)
    text(s, n, x + 0.15, 2.18, 0.5, 0.25, 8, GOLD, True)
    text(s, h, x + 0.15, 2.5, 1.65, 0.35, 13, CREAM, True)
    text(s, b, x + 0.15, 3.05, 1.65, 0.9, 8.5, MUTED)
text(s, 'Công nghệ: HTML/CSS/JS · Web Speech API · localStorage API · LLM fallback · Generative UI', 0.7, 5.65, 12.0, 0.4, 11, GOLD)
text(s, 'Thuật toán: intent classification · slot filling · draft engine · tool calling · anti-hallucination', 0.7, 6.15, 12.0, 0.4, 10.5, MUTED)
footer(s, 7)

# 8 Automation
s = slide(); kicker(s, '07 · AUTOMATION'); title(s, 'Tự động hoá việc lặp lại, không thay quyết định.', 'Rule có log, có undo.', 28)
rules = [
    ('RULE 01', 'Nhả bàn held quá hạn', 'Bàn về available\nGhi audit'),
    ('RULE 02', 'Món hết nguyên liệu', 'Khóa menu\nOrder Board vẫn chạy'),
    ('RULE 03', 'Báo cáo cuối ngày', 'Tổng hợp số\nTạo email'),
]
for i, (n, h, b) in enumerate(rules):
    x = 0.65 + i * 4.15
    card(s, x, 1.95, 3.85, 3.0, CARD, GOLD)
    text(s, n, x + 0.25, 2.15, 3.0, 0.3, 9, GOLD, True)
    text(s, h, x + 0.25, 2.55, 3.25, 0.9, 16, CREAM, True)
    text(s, b, x + 0.25, 3.65, 3.2, 0.6, 10.5, MUTED)
text(s, 'Demo: AutomationEngine trong tab · Production: n8n/worker + SMTP', 0.7, 5.55, 12.0, 0.4, 11, GOLD)
text(s, 'Mỗi rule có điều kiện · hành động · log · hoàn tác.', 0.7, 6.05, 12.0, 0.35, 10.5, MUTED)
footer(s, 8)

# 9 Demo flow
s = slide(); kicker(s, '08 · DEMO'); title(s, 'Một ly matcha cuối cùng.', 'Khách → Order Board → Runner → Owner.')
steps = [
    ('01', 'Khách', 'QR bàn A1\nthanh toán demo'),
    ('02', 'Order Board', 'đã thanh toán\nMới → Đang làm'),
    ('03', 'Runner', 'Sẵn sàng\nĐã mang ra'),
    ('04', 'Owner', 'Alert\nRecommendation'),
]
for i, (n, h, b) in enumerate(steps):
    x = 0.55 + i * 3.15
    card(s, x, 2.0, 2.95, 3.2, CARD, GOLD if i == 1 else None)
    text(s, n, x + 0.18, 2.2, 0.5, 0.25, 9, GOLD, True)
    text(s, h, x + 0.18, 2.55, 2.6, 0.4, 15, CREAM, True)
    text(s, b, x + 0.18, 3.2, 2.6, 0.9, 9.5, MUTED)
text(s, 'Không KDS voice. Không bill mở. Không ép QR.', 0.7, 5.65, 12.0, 0.4, 13, GOLD, True)
text(s, 'Demo: 26 trang · 130 test · 24 smoke · 26 verify', 0.7, 6.2, 12.0, 0.35, 10.5, MUTED)
footer(s, 9)

# 10 Evidence / limits
s = slide(); kicker(s, '09 · MINH CHỨNG'); title(s, 'Demo chạy được, nhưng không giả vờ là production.', 'Ranh giới rõ ràng.')
left = [('THẬT', 'Bàn · QR · session\nOrder · cọc · BOM\nOrder Board · Runner\nOwner Cockpit'), ('GIẢ LẬP', 'Thanh toán QR\nTiền mặt\nHóa đơn điện tử\nPOS đối tác')]
for i, (h, b) in enumerate(left):
    card(s, 0.65 + i * 6.2, 1.95, 5.85, 3.55, CARD, GREEN if i == 0 else RED)
    text(s, h, 0.92 + i * 6.2, 2.2, 3.0, 0.3, 10, GREEN if i == 0 else RED, True)
    text(s, b, 0.92 + i * 6.2, 2.8, 5.1, 1.7, 15, CREAM, True)
text(s, 'Khi có đối tác: thay adapter, không đổi luồng.', 0.7, 5.85, 12.0, 0.4, 13, GOLD, True)
text(s, 'Còn lại P0: atomic cọc · chỉ áp cọc đã trả · xử lý cọc dư.', 0.7, 6.3, 12.0, 0.35, 10, MUTED)
footer(s, 10)

# 11 Vision
s = slide(); kicker(s, '10 · TẦM NHÌN'); title(s, 'Từ demo đến pilot, không phải “hệ điều hành”.', 'Workflow layer, không thay POS thuế.')
rows = [
    ('PHASE 0', 'Demo', '26 trang · localStorage\nOrder Board · Runner · Owner'),
    ('PHASE 1', 'Pilot 1 quán', 'backend/API · QR payment\nPOS/hóa đơn đối tác · KPI 30 ngày'),
    ('PHASE 2', 'Production', 'e-invoice · offline · backup\nnhiều chi nhánh · phân quyền'),
]
for i, (n, h, b) in enumerate(rows):
    x = 0.65 + i * 4.15
    card(s, x, 2.0, 3.85, 3.2, CARD, GOLD)
    text(s, n, x + 0.25, 2.2, 3.0, 0.3, 9, GOLD, True)
    text(s, h, x + 0.25, 2.6, 3.2, 0.45, 18, CREAM, True)
    text(s, b, x + 0.25, 3.25, 3.2, 1.1, 10.5, MUTED)
text(s, 'Không bán “AI thay người”. Bán thời gian, bàn, và quyết định.', 0.7, 5.7, 12.0, 0.4, 12, GOLD, True)
footer(s, 11)

# 12 Closing
s = slide()
card(s, 0.65, 0.7, 12.0, 6.05, CARD, GOLD)
text(s, 'CAPPAN', 1.05, 1.02, 5.0, 0.5, 13, GOLD, True)
text(s, 'Không làm mọi thứ.\nLàm đúng một việc:\ngiữ cho quán không bỏ sót bàn,\nkhông bán khống,\nvà chủ quán biết ngay\nkhi có chuyện.', 1.05, 1.65, 7.2, 3.4, 27, CREAM, True)
text(s, 'Khách tự chọn. Hệ thống giữ bàn.\nNhân viên chỉ bưng nước và xử lý ngoại lệ.', 1.07, 5.35, 7.0, 0.8, 12, MUTED)
text(s, 'CẢM ƠN', 9.8, 5.55, 2.0, 0.4, 11, GOLD, True)
footer(s, 12)

prs.save(r'D:\Projectweb\cappan-slides-v3.pptx')
print('saved', len(prs.slides), 'slides')
