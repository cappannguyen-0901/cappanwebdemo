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


def text(s, txt, x, y, w, h, size=18, color=CREAM, bold=False, font='Arial', align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP):
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
    r.font.name = font
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


def title(s, txt, sub=None, size=34):
    text(s, txt, 0.65, 0.78, 12.0, 0.75, size, CREAM, True, 'Arial')
    if sub:
        text(s, sub, 0.68, 1.5, 11.8, 0.45, 13, MUTED, False)


def footer(s, n):
    text(s, 'CAPPAN · VẬN HÀNH QUÁN CÀ PHÊ', 0.65, 7.06, 7.5, 0.25, 8.5, MUTED)
    text(s, f'{n:02d} / 12', 11.9, 7.06, 0.8, 0.25, 8.5, MUTED, align=PP_ALIGN.RIGHT)


# 1 — Cover
s = slide()
card(s, 8.4, 0.8, 4.25, 5.9, CARD, GOLD)
text(s, 'CAPPAN', 9.0, 1.25, 3.2, 0.7, 34, GOLD, True, 'Arial')
text(s, 'WORKFLOW LAYER', 9.02, 2.0, 3.2, 0.3, 10, MUTED, True)
text(s, 'Vận hành quán\ncà phê,\nkhông bỏ sót bàn.', 8.95, 2.55, 3.5, 1.9, 25, CREAM, True, 'Arial')
text(s, 'Khách tự chọn · Hệ thống giữ bàn\nNhân viên chỉ xử lý ngoại lệ', 8.98, 4.65, 3.25, 0.8, 11, MUTED)
text(s, 'BẢN DEMO · 2026', 0.7, 0.55, 4.0, 0.3, 10, GOLD, True)
text(s, 'Một nguồn sự thật\ncho khách — nhân viên — chủ quán.', 0.75, 2.0, 7.2, 1.66, 31, CREAM, True, 'Arial')
text(s, '32 chỗ · 4 tầng · 24 món · 5–10 nhân viên', 0.78, 4.05, 7.0, 0.4, 13, MUTED)
text(s, 'Order Board thay KDS voice · Runner View · Owner Cockpit', 0.78, 4.55, 7.2, 0.4, 13, GOLD)
footer(s, 1)

# 2 — Problem
s = slide(); kicker(s, '01 · VẤN ĐỀ'); title(s, 'Ba người, ba câu hỏi, một nguồn sự thật thiếu.', 'Không ai thấy cùng một bức tranh.')
cards = [
    ('KHÁCH', 'Tôi có chỗ không?\nBao lâu có nước?', 'Không điện thoại · ngồi xíu · booking'),
    ('NHÂN VIÊN', 'Đơn nào làm trước?\nBàn nào đang dọn?', 'Quản bàn tay · thiếu SOP · quá tải'),
    ('CHỦ QUÁN', 'Hôm nay mất gì?\nAi cần xử lý?', 'Không hao hụt · không no-show · không baseline'),
]
for i, (h, q, b) in enumerate(cards):
    x = 0.65 + i * 4.15
    card(s, x, 2.05, 3.85, 4.55, CARD, GOLD if i == 1 else None)
    text(s, h, x + 0.28, 2.3, 3.2, 0.3, 10, GOLD, True)
    text(s, q, x + 0.28, 2.85, 3.25, 1.25, 21, CREAM, True, 'Arial')
    text(s, b, x + 0.28, 5.35, 3.2, 0.85, 11, MUTED)
footer(s, 2)

# 3 — Insight
s = slide(); kicker(s, '02 · INSIGHT'); title(s, 'Không phải mọi khách đều đi qua QR.', 'Không phải mọi đơn đều cần bàn.')
rows = [
    ('01', 'Mua nhanh tại quầy', 'Không điện thoại · ngồi xíu · mang đi', 'Counter Pickup'),
    ('02', 'Ngồi bàn được phục vụ', 'QR hoặc nhân viên gán bàn', 'Table Service'),
    ('03', 'Đặt trước', 'Cọc · khung giờ · check-in', 'Booking'),
]
for i, (n, h, b, tag) in enumerate(rows):
    y = 2.1 + i * 1.25
    text(s, n, 0.7, y, 0.5, 0.35, 11, GOLD, True)
    text(s, h, 1.2, y - 0.05, 5.2, 0.4, 19, CREAM, True)
    text(s, b, 1.22, y + 0.38, 6.2, 0.35, 11, MUTED)
    card(s, 8.6, y - 0.12, 3.7, 0.75, CARD, GOLD)
    text(s, tag, 8.85, y + 0.08, 3.2, 0.3, 11, GOLD, True)
text(s, 'Sai lầm lớn nhất: ép cả ba vào một luồng.', 0.7, 6.2, 11.8, 0.4, 15, RED, True)
footer(s, 3)

# 4 — Service modes
s = slide(); kicker(s, '03 · MÔ HÌNH'); title(s, 'Bốn service mode. Booking không phải mode.', 'Một hệ thống, bốn lời hứa dịch vụ.', 28)
modes = [
    ('counter_pickup', 'Mua tại quầy', 'Trả tiền · nhận số · tự lấy', GREEN),
    ('table_service', 'Ngồi bàn', 'QR/POS · trả tiền · mang ra bàn', GOLD),
    ('takeaway', 'Mang đi', 'Trả tiền · mã pickup', CREAM),
    ('delivery', 'Giao hàng', 'Địa chỉ · phí ship · giao', RED),
]
for i, (k, h, b, c) in enumerate(modes):
    x = 0.65 + (i % 2) * 6.2
    y = 2.0 + (i // 2) * 2.15
    card(s, x, y, 5.85, 1.8, CARD, c)
    text(s, k, x + 0.25, y + 0.2, 5.2, 0.3, 9, c, True)
    text(s, h, x + 0.25, y + 0.55, 5.1, 0.4, 19, CREAM, True, 'Arial')
    text(s, b, x + 0.25, y + 1.12, 5.2, 0.35, 11, MUTED)
text(s, 'booking = true trên table_service  ·  table_id chỉ bắt buộc với table_service', 0.7, 6.55, 12.0, 0.35, 12, GOLD)
footer(s, 4)

# 5 — Customer
s = slide(); kicker(s, '04 · KHÁCH HÀNG'); title(s, 'Hai lời hứa. Không khách nào bị chặn.', 'Counter Pickup và Table Service là hai trải nghiệm khác nhau.')
card(s, 0.65, 2.0, 5.9, 4.55, CARD, GREEN)
text(s, 'COUNTER PICKUP', 0.92, 2.25, 4.0, 0.3, 10, GREEN, True)
text(s, 'Trả tiền → nhận số → tự lấy', 0.92, 2.85, 5.2, 0.9, 22, CREAM, True, 'Arial')
text(s, 'Không bàn · không QR · không session\nPhù hợp: không điện thoại, ngồi xíu, khách vội', 0.94, 4.0, 5.2, 0.9, 12, MUTED)
card(s, 6.8, 2.0, 5.85, 4.55, CARD, GOLD)
text(s, 'TABLE SERVICE', 7.08, 2.25, 4.0, 0.3, 10, GOLD, True)
text(s, 'Trả tiền → nhân viên mang ra bàn', 7.08, 2.85, 5.2, 0.9, 22, CREAM, True, 'Arial')
text(s, 'Có bàn · có QR · có Runner\nPhù hợp: ngồi lâu, gọi thêm, booking', 7.1, 4.0, 5.2, 0.9, 12, MUTED)
text(s, 'Không bắt khách dùng điện thoại. Không ép mọi đơn có bàn.', 0.7, 6.75, 12.0, 0.3, 13, GOLD, True)
footer(s, 5)

# 6 — Staff
s = slide(); kicker(s, '05 · NHÂN VIÊN'); title(s, 'Bỏ voice, không bỏ hàng đợi.', 'Order Board cho barista. Runner View cho người mang nước.')
card(s, 0.65, 2.0, 6.0, 4.5, CARD, GOLD)
text(s, 'ORDER BOARD', 0.92, 2.25, 3.5, 0.3, 10, GOLD, True)
cols = [('MỚI', 'Chờ bắt đầu'), ('ĐANG LÀM', 'Đang pha'), ('SẴN SÀNG', 'Chờ runner')]
for i, (h, b) in enumerate(cols):
    x = 0.95 + i * 1.85
    card(s, x, 2.9, 1.65, 1.35, BG, GOLD)
    text(s, h, x + 0.12, 3.0, 1.4, 0.25, 8, GOLD, True)
    text(s, b, x + 0.12, 3.35, 1.4, 0.4, 8, MUTED)
text(s, 'Chỉ đơn đã thanh toán · barista tự quyết · quản lý ca override', 0.95, 4.65, 5.3, 0.55, 11, MUTED)
text(s, 'Không AI tự chuyển trạng thái.', 0.95, 5.45, 5.0, 0.35, 11, RED, True)
card(s, 6.95, 2.0, 5.7, 4.5, CARD, GREEN)
text(s, 'RUNNER VIEW', 7.22, 2.25, 3.5, 0.3, 10, GREEN, True)
text(s, 'Chỉ Table Service đã sẵn sàng.', 7.22, 2.85, 5.0, 0.7, 22, CREAM, True, 'Arial')
text(s, 'Số bàn · món · nút “Đã mang ra”.\nKhông cần nhìn bảng lớn.', 7.24, 3.75, 5.0, 0.8, 12, MUTED)
text(s, 'Một đơn — một trạng thái — một người chịu trách nhiệm.', 7.22, 5.7, 5.0, 0.5, 10, GOLD, True)
footer(s, 6)

# 7 — Owner
s = slide(); kicker(s, '06 · CHỦ QUÁN'); title(s, 'Không phải dashboard. Là ba việc cần quyết.', 'Alert → Insight → Recommendation.')
items = [
    ('ALERT', 'Nguyên liệu cạn\nBàn đang dọn\nKhu tự do hết chỗ', RED),
    ('INSIGHT', 'Doanh thu hôm nay\nMón bán chạy\nKhung giờ vắng', GOLD),
    ('RECOMMENDATION', 'Nhập hàng\nMở khu\nĐổi ca', GREEN),
]
for i, (h, b, c) in enumerate(items):
    x = 0.65 + i * 4.15
    card(s, x, 2.05, 3.85, 3.9, CARD, c)
    text(s, h, x + 0.26, 2.3, 3.3, 0.3, 9, c, True)
    text(s, b, x + 0.26, 2.9, 3.25, 1.8, 16, CREAM, True, 'Arial')
    text(s, 'Đồng ý / Từ chối · có audit' if i == 2 else 'Từ dữ liệu thật trong demo', x + 0.26, 5.2, 3.2, 0.35, 9.5, MUTED)
text(s, 'Chủ quán không cần nhìn 20 báo cáo. Chỉ cần biết việc gì cần quyết.', 0.7, 6.3, 12.0, 0.4, 13, GOLD, True)
footer(s, 7)

# 8 — Demo flow
s = slide(); kicker(s, '07 · DEMO'); title(s, 'Một đơn đi qua ba mặt.', 'Khách → Barista/Runner → Chủ quán.')
steps = [
    ('01', 'Khách', 'QR bàn / quầy\nthanh toán demo'),
    ('02', 'Order Board', 'đã thanh toán\nMới → Đang làm'),
    ('03', 'Runner', 'Sẵn sàng\nĐã mang ra'),
    ('04', 'Owner', 'Alert / Insight\nRecommendation'),
]
for i, (n, h, b) in enumerate(steps):
    x = 0.55 + i * 3.15
    card(s, x, 2.15, 2.95, 3.35, CARD, GOLD if i == 1 else None)
    text(s, n, x + 0.18, 2.35, 0.5, 0.3, 10, GOLD, True)
    text(s, h, x + 0.18, 2.75, 2.6, 0.45, 16, CREAM, True, 'Arial')
    text(s, b, x + 0.18, 3.45, 2.6, 1.15, 9.5, MUTED)
text(s, 'Không KDS voice. Không bill mở. Không ép QR.', 0.7, 6.25, 12.0, 0.4, 14, GOLD, True)
footer(s, 8)

# 9 — Rules
s = slide(); kicker(s, '08 · LUẬT VẬN HÀNH'); title(s, 'Những con số phải rõ trước khi code.', 'Các mốc dưới đây là đề xuất, chưa phải số đo của quán.')
rules = [
    ('Bàn', 'Giữ 5 phút\nTrống → Giữ → Có khách → Dọn'),
    ('Booking', 'Slot 90 phút + 15 phút dọn\nGrace 15 phút'),
    ('Cọc', 'Số người × ly rẻ nhất\nGiảm giá chỉ trên phần vượt cọc'),
    ('Thanh toán', 'Chỉ đơn paid mới lên Order Board\nRefund có trạng thái'),
]
for i, (h, b) in enumerate(rules):
    x = 0.65 + (i % 2) * 6.2
    y = 2.0 + (i // 2) * 2.05
    card(s, x, y, 5.85, 1.75, CARD)
    text(s, h, x + 0.24, y + 0.18, 5.2, 0.3, 9, GOLD, True)
    text(s, b, x + 0.24, y + 0.55, 5.2, 0.9, 14, CREAM, True)
text(s, '[Đề xuất] · cần chốt với quán pilot trước khi triển khai', 0.7, 6.55, 12.0, 0.3, 10, MUTED)
footer(s, 9)

# 10 — Boundary
s = slide(); kicker(s, '09 · RANH GIỚI'); title(s, 'Demo không giả vờ có đối tác.', 'Một nguồn sự thật là thật. Chỉ tiền và hóa đơn là giả lập.')
left = [('THẬT', 'Bàn · QR · session\nOrder · cọc · BOM\nOrder Board · Runner\nOwner Cockpit'), ('GIẢ LẬP', 'Thanh toán QR\nTiền mặt\nHóa đơn điện tử\nPOS đối tác')]
for i, (h, b) in enumerate(left):
    card(s, 0.65 + i * 6.2, 2.05, 5.85, 3.85, CARD, GREEN if i == 0 else RED)
    text(s, h, 0.92 + i * 6.2, 2.3, 3.0, 0.3, 10, GREEN if i == 0 else RED, True)
    text(s, b, 0.92 + i * 6.2, 2.9, 5.1, 1.9, 17, CREAM, True, 'Arial')
text(s, 'Khi có đối tác: thay adapter, không đổi luồng.', 0.7, 6.35, 12.0, 0.4, 13, GOLD, True)
footer(s, 10)

# 11 — Evidence
s = slide(); kicker(s, '10 · BẰNG CHỨNG'); title(s, 'Không chỉ vẽ slide.', 'Code chạy được, test tự động, build tĩnh.')
nums = [('26', 'trang web'), ('130', 'test'), ('24', 'smoke'), ('26', 'verify')]
for i, (n, l) in enumerate(nums):
    x = 0.65 + i * 3.15
    card(s, x, 2.0, 2.9, 2.15, CARD, GOLD)
    text(s, n, x + 0.2, 2.25, 2.5, 0.85, 40, GOLD, True, 'Arial')
    text(s, l, x + 0.22, 3.3, 2.4, 0.35, 11, MUTED)
text(s, 'Order Board · Runner View · Table Service · BOM · Owner Cockpit', 0.7, 4.85, 12.0, 0.4, 13, CREAM)
text(s, 'Bỏ KDS voice sau khi thử nghiệm STT tiếng Việt không ổn định trong môi trường ồn.', 0.7, 5.55, 12.0, 0.55, 11, MUTED)
text(s, 'Đây là product judgment, không phải thất bại.', 0.7, 6.3, 12.0, 0.3, 12, GOLD, True)
footer(s, 11)

# 12 — Closing
s = slide()
card(s, 0.65, 0.7, 12.0, 6.05, CARD, GOLD)
text(s, 'CAPPAN', 1.05, 1.05, 5.0, 0.5, 13, GOLD, True)
text(s, 'Không làm mọi thứ.\nLàm đúng một việc:\ngiữ cho quán không bỏ sót bàn,\nkhông bán khống,\nvà chủ quán biết ngay\nkhi có chuyện.', 1.05, 1.65, 7.2, 3.4, 28, CREAM, True, 'Arial')
text(s, 'Khách tự chọn. Hệ thống giữ bàn.\nNhân viên chỉ bưng nước và xử lý ngoại lệ.', 1.07, 5.35, 7.0, 0.8, 12, MUTED)
text(s, 'CẢM ƠN', 9.8, 5.55, 2.0, 0.4, 11, GOLD, True)
footer(s, 12)

prs.save(r'D:\Projectweb\cappan-slides-v2.pptx')
print('saved', len(prs.slides), 'slides')
