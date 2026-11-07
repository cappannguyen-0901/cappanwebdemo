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
    text(s, txt.upper(), 0.65, 0.4, 12.0, 0.3, 10, GOLD, True)


def title(s, txt, sub=None, size=30):
    text(s, txt, 0.65, 0.74, 12.0, 0.8, size, CREAM, True)
    if sub:
        text(s, sub, 0.68, 1.46, 11.8, 0.4, 11.5, MUTED)


def footer(s, n):
    text(s, 'CAPPAN · 2026', 0.65, 7.08, 5.5, 0.22, 8.5, MUTED)
    text(s, f'{n:02d} / 16', 11.9, 7.08, 0.8, 0.22, 8.5, MUTED, align=PP_ALIGN.RIGHT)


# 1 — Cover
s = slide()
card(s, 8.45, 0.75, 4.2, 5.95, CARD, GOLD)
text(s, 'CAPPAN', 9.0, 1.15, 3.2, 0.7, 33, GOLD, True)
text(s, 'WORKFLOW LAYER', 9.02, 1.9, 3.2, 0.3, 9.5, MUTED, True)
text(s, 'Vận hành quán\ncà phê,\nkhông bỏ sót bàn.', 8.98, 2.4, 3.5, 1.9, 23, CREAM, True)
text(s, 'Khách tự chọn · Hệ thống giữ bàn\nNhân viên chỉ xử lý ngoại lệ', 9.0, 4.55, 3.2, 0.8, 10.2, MUTED)
text(s, 'BẢN DEMO · 11/2026', 0.7, 0.55, 4.0, 0.3, 10, GOLD, True)
text(s, 'Một nguồn sự thật\ncho khách — nhân viên — chủ quán.', 0.75, 1.85, 7.2, 1.8, 30, CREAM, True)
text(s, '32 chỗ · 4 tầng · 24 món · 5–10 nhân viên', 0.78, 3.95, 7.0, 0.4, 13, MUTED)
text(s, '26 trang · 13 khách + 13 nhân viên · 130 test', 0.78, 4.45, 7.2, 0.4, 13, GOLD)
text(s, 'Order Board · Runner View · Owner Cockpit · AI Chatbot', 0.78, 4.95, 7.2, 0.4, 11, MUTED)
footer(s, 1)

# 2 — Bối cảnh & mục tiêu
s = slide(); kicker(s, '00 · BỐI CẢNH'); title(s, 'Bài toán: quán nhỏ, nhiều quyết định rơi.', 'Mục tiêu không phải thêm thật nhiều tính năng.')
card(s, 0.65, 1.9, 5.9, 4.65, CARD, GOLD)
text(s, 'BỐI CẢNH CAPPAN', 0.92, 2.15, 4.0, 0.3, 9, GOLD, True)
text(s, '32 chỗ · 4 tầng\n24 món · 6 nhóm\n5–10 nhân viên\nKhách sinh viên, văn phòng, freelancer', 0.92, 2.65, 5.0, 2.4, 16, CREAM, True)
text(s, 'Điểm nghẽn: bàn, đơn, kho, báo cáo', 0.92, 5.45, 5.0, 0.4, 10.5, MUTED)
card(s, 6.8, 1.9, 5.85, 4.65, CARD, GREEN)
text(s, 'MỤC TIÊU 3.0', 7.08, 2.15, 4.0, 0.3, 9, GREEN, True)
text(s, 'Không ép mọi khách dùng điện thoại\nKhông ép mọi đơn phải có bàn\nNhân viên chỉ xử lý ngoại lệ\nMột nguồn dữ liệu cho 3 vai', 7.08, 2.65, 5.1, 2.4, 15, CREAM, True)
text(s, 'Demo local-first · chưa phải POS thương mại', 7.08, 5.45, 5.0, 0.4, 10, GOLD)
footer(s, 2)

# 3 — Ba vai
s = slide(); kicker(s, '01 · BA VAI'); title(s, 'Mỗi vai có một câu hỏi khác nhau.', 'Web phải trả lời cả ba, bằng cùng một dữ liệu.')
cols = [
    ('KHÁCH HÀNG', 'Có chỗ không?\nBao lâu có nước?\nCó phải đứng dậy?', 'Sơ đồ bàn · QR · theo dõi đơn · gọi thêm', GREEN),
    ('NHÂN VIÊN', 'Đơn nào trước?\nBàn nào đang dọn?\nAi mang ra?', 'POS · Order Board · Runner View · BOM', GOLD),
    ('CHỦ QUÁN', 'Hôm nay bao nhiêu?\nMất gì?\nCần quyết gì?', 'Owner Cockpit · email báo cáo · gợi ý AI', RED),
]
for i, (h, q, s2, c) in enumerate(cols):
    x = 0.65 + i * 4.15
    card(s, x, 1.9, 3.85, 4.5, CARD, c)
    text(s, h, x + 0.25, 2.15, 3.3, 0.3, 9, c, True)
    text(s, q, x + 0.25, 2.65, 3.25, 1.55, 17, CREAM, True)
    text(s, '→ ' + s2, x + 0.25, 4.65, 3.25, 0.9, 10, MUTED)
footer(s, 3)

# 4 — Khách 4 cases
s = slide(); kicker(s, '02 · KHÁCH HÀNG'); title(s, 'Bốn trường hợp khách — bốn luồng khác nhau.', 'Không ép tất cả vào QR/bàn.')
rows = [
    ('01', 'Mua tại quầy', 'Không điện thoại · không bàn · mã pickup · tự lấy', 'Counter Pickup', GREEN),
    ('02', 'Ngồi bàn', 'QR bàn · mã bàn · trả trước · nhân viên mang ra', 'Table Service', GOLD),
    ('03', 'Đặt trước', 'Cọc · check-in · mở phiên · tự trừ cọc', 'Booking', CREAM),
    ('04', 'Mang đi / giao hàng', 'Mã pickup / địa chỉ + phí ship', 'Remote', RED),
]
for i, (n, h, b, tag, c) in enumerate(rows):
    y = 1.9 + i * 1.16
    text(s, n, 0.7, y, 0.5, 0.35, 11, GOLD, True)
    text(s, h, 1.2, y - 0.05, 5.2, 0.4, 17, CREAM, True)
    text(s, b, 1.22, y + 0.36, 6.3, 0.35, 10.3, MUTED)
    card(s, 8.7, y - 0.08, 3.5, 0.7, CARD, c)
    text(s, tag, 8.92, y + 0.1, 3.1, 0.28, 9.5, c, True)
text(s, 'Không khách nào bị chặn vì không có điện thoại.', 0.7, 6.55, 12.0, 0.35, 12, GOLD, True)
footer(s, 4)

# 5 — Khách chi tiết
s = slide(); kicker(s, '03 · KHÁCH HÀNG'); title(s, 'Bàn, phiên, cọc — ba thứ phải khớp.', 'Ví dụ: cọc 70k, order 55k → còn 15k.')
card(s, 0.65, 1.9, 5.9, 4.55, CARD, GOLD)
text(s, 'BÀN TABLE SERVICE', 0.92, 2.15, 4.0, 0.3, 9, GOLD, True)
text(s, 'Trống → Giữ → Có khách → Đang dọn', 0.92, 2.65, 5.2, 0.5, 17, CREAM, True)
text(s, 'QR bàn trống: mở phiên + occupied ngay\nBàn đang dọn/đã đặt: chặn, gợi ý bàn khác\nMã bàn 4 số · đổi sau khi dọn\nTableSession lưu order + deposit\nCounter Pickup: không trạng thái bàn', 0.92, 3.2, 5.1, 1.8, 10.5, MUTED)
text(s, 'Phiên lưu: tableId · bookingId · depositRemaining · orders', 0.92, 5.05, 5.1, 0.35, 8.5, GOLD)
text(s, 'Không cần nhân viên đánh dấu bàn.', 0.92, 5.55, 5.0, 0.35, 9.5, GOLD, True)
card(s, 6.8, 1.9, 5.85, 4.55, CARD, GREEN)
text(s, 'BOOKING + CỌC', 7.08, 2.15, 4.0, 0.3, 9, GREEN, True)
text(s, 'depositApplied = min(cọc còn lại, order.total)', 7.08, 2.6, 5.2, 0.5, 12, CREAM, True)
text(s, 'Cọc 70.000đ · order 55.000đ\n→ trừ 55.000đ · còn 15.000đ\n→ amountDue = 0đ\nOrder 2: 50.000đ → trừ 15.000đ\n→ khách trả thêm 35.000đ\nCuối phiên: hoàn/credit phần dư', 7.08, 3.25, 5.1, 1.7, 10.3, MUTED)
text(s, 'Nếu order < cọc: giữ phần dư cho order sau hoặc hoàn khi đóng phiên.', 7.08, 5.05, 5.1, 0.35, 8.5, GOLD)
text(s, 'Mỗi order tự trừ; không nhân viên nào bấm trừ cọc.', 7.08, 5.55, 5.1, 0.35, 9.2, GOLD, True)
footer(s, 5)

# 6 — Nhân viên POS
s = slide(); kicker(s, '04 · NHÂN VIÊN'); title(s, 'POS: Counter Pickup hay Table Service?', 'Table Service bắt buộc bàn — thanh toán xong tự mở phiên.')
card(s, 0.65, 1.9, 5.9, 4.55, CARD, GREEN)
text(s, 'COUNTER PICKUP', 0.92, 2.15, 4.0, 0.3, 9, GREEN, True)
text(s, 'Không cần bàn', 0.92, 2.6, 4.5, 0.5, 20, CREAM, True)
text(s, 'POS chọn Counter Pickup\n→ thu tiền\n→ sinh mã P01\n→ khách tự lấy', 0.92, 3.35, 5.0, 1.4, 12, MUTED)
text(s, 'Không tạo TableSession.', 0.92, 5.55, 5.0, 0.35, 10, GOLD, True)
card(s, 6.8, 1.9, 5.85, 4.55, CARD, GOLD)
text(s, 'TABLE SERVICE', 7.08, 2.15, 4.0, 0.3, 9, GOLD, True)
text(s, 'Bắt buộc chọn bàn', 7.08, 2.6, 4.5, 0.5, 20, CREAM, True)
text(s, 'Chọn bàn → thu tiền\n→ API mở TableSession\n→ bàn occupied\n→ order gắn session', 7.08, 3.35, 5.0, 1.4, 12, MUTED)
text(s, 'Không có bàn → không cho thu tiền.', 7.08, 5.55, 5.0, 0.35, 10, GOLD, True)
footer(s, 6)

# 7 — Order Board + Runner
s = slide(); kicker(s, '05 · NHÂN VIÊN'); title(s, 'Order Board và Runner View.', 'Một bảng cho barista, một màn hình cho người mang nước.')
card(s, 0.65, 1.9, 6.0, 4.55, CARD, GOLD)
text(s, 'ORDER BOARD', 0.92, 2.15, 3.5, 0.3, 9, GOLD, True)
for i, (h, b) in enumerate([('MỚI', 'Chờ bắt đầu'), ('ĐANG LÀM', 'Đang pha'), ('SẴN SÀNG', 'Chờ runner')]):
    x = 0.95 + i * 1.85
    card(s, x, 2.7, 1.65, 1.3, BG, GOLD)
    text(s, h, x + 0.1, 2.8, 1.45, 0.22, 7.5, GOLD, True)
    text(s, b, x + 0.1, 3.12, 1.45, 0.35, 7.5, MUTED)
text(s, 'Chỉ đơn đã thanh toán\nSắp theo giờ hứa + thời gian chờ\nThẻ: mã · bàn/mã pickup · món · tuổi đơn\nBarista bấm Bắt đầu / Xong\nQuản lý ca override — có audit', 0.95, 4.3, 5.3, 1.45, 9.2, MUTED)
text(s, 'Ưu tiên: due_at → tuổi đơn → loại đơn', 0.95, 5.95, 5.2, 0.3, 8.5, GOLD, True)
card(s, 6.95, 1.9, 5.7, 4.55, CARD, GREEN)
text(s, 'RUNNER VIEW', 7.22, 2.15, 3.5, 0.3, 9, GREEN, True)
text(s, 'Chỉ Table Service đã sẵn sàng.', 7.22, 2.65, 5.0, 0.6, 19, CREAM, True)
text(s, 'Số bàn · món · mã đơn\nNút “Đã mang ra” → served\nKhông nhận Counter Pickup\nKhông cần nhìn bảng lớn\nMột người một việc', 7.22, 3.4, 5.0, 1.6, 10.2, MUTED)
text(s, 'Runner chỉ cần 1 màn hình; không voice, không thẻ rung.', 7.22, 5.55, 5.1, 0.35, 8.5, GOLD, True)
footer(s, 7)

# 8 — Owner + email
s = slide(); kicker(s, '06 · CHỦ QUÁN'); title(s, 'Chủ quán biết qua email báo cáo.', 'Báo cáo cũ + gợi ý AI; kho chỉ có trong báo cáo ngày.')
items = [
    ('ALERT', 'Nguyên liệu cạn\nBàn đang dọn\nĐơn chờ lâu', RED),
    ('INSIGHT', 'Doanh thu\nMón bán chạy\nKhung giờ vắng', GOLD),
    ('GỢI Ý AI', 'Nhập hàng\nMở khu\nĐổi ca', GREEN),
]
for i, (h, b, c) in enumerate(items):
    x = 0.65 + i * 4.15
    card(s, x, 1.9, 3.85, 3.0, CARD, c)
    text(s, h, x + 0.25, 2.15, 3.3, 0.3, 9, c, True)
    text(s, b, x + 0.25, 2.65, 3.2, 1.4, 15, CREAM, True)
    text(s, 'Từ dữ liệu thật trong demo' if i < 2 else 'Đồng ý / Từ chối · audit', x + 0.25, 4.35, 3.2, 0.3, 8.5, MUTED)
card(s, 0.65, 5.15, 12.0, 1.55, CARD, GOLD)
text(s, '📧 BÁO CÁO EMAIL', 0.9, 5.3, 3.5, 0.28, 9, GOLD, True)
text(s, 'Doanh thu · đơn · AOV · kênh · booking · cọc · lấp bàn · top món · gợi ý AI', 0.9, 5.6, 9.4, 0.3, 10, CREAM)
text(s, 'Kho: CHỈ báo cáo NGÀY · tuần/tháng/năm giữ nguyên', 0.9, 5.98, 8.5, 0.3, 9, GOLD)
text(s, 'Nút gửi ở trang Thống kê', 9.75, 5.98, 2.6, 0.3, 8, MUTED, align=PP_ALIGN.RIGHT)
footer(s, 8)

# 9 — AI capabilities
s = slide(); kicker(s, '07 · AI & CHATBOT'); title(s, 'AI/chatbot làm được gì?', 'Tư vấn, tra cứu, gợi ý — không tự quyết định tiền.')
caps = [
    ('CHAT KHÁCH', 'Menu · giá · thành phần\nđặt bàn · theo dõi đơn\nđổi món · hủy đơn'),
    ('GENERATIVE UI', 'Trả thẻ dữ liệu + nút\nkhông chỉ văn bản\nmenu card · booking card'),
    ('HỖ TRỢ NHÂN VIÊN', 'Tra đơn · booking\nKPI · tồn kho\nđiều kiện an toàn'),
    ('OWNER COPILOT', 'Giải thích alert/insight\ngợi ý hành động\ntrả lời câu hỏi vận hành'),
]
for i, (h, b) in enumerate(caps):
    x = 0.65 + (i % 2) * 6.2
    y = 1.9 + (i // 2) * 2.2
    card(s, x, y, 5.85, 1.9, CARD, GOLD if i == 0 else None)
    text(s, h, x + 0.25, y + 0.18, 5.2, 0.3, 9, GOLD, True)
    text(s, b, x + 0.25, y + 0.55, 5.2, 1.1, 12.5, CREAM, True)
text(s, 'Không tự huỷ · không tự hoàn tiền · không tự đổi giá.', 0.7, 6.6, 12.0, 0.3, 11, RED, True)
footer(s, 9)

# 10 — AI architecture
s = slide(); kicker(s, '08 · KIẾN TRÚC AI'); title(s, 'Kiến trúc AI: rule trước, LLM sau.', 'Pipeline 6 tầng + guard + Generative UI.')
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
    card(s, x, 1.9, 1.9, 2.7, CARD, GOLD if i == 3 else None)
    text(s, n, x + 0.15, 2.08, 0.5, 0.25, 8, GOLD, True)
    text(s, h, x + 0.15, 2.4, 1.65, 0.35, 12.5, CREAM, True)
    text(s, b, x + 0.15, 2.95, 1.65, 0.85, 8, MUTED)
text(s, 'Fast-path <100ms · Smart Router · Context Engine · tool calling', 0.7, 5.15, 12.0, 0.35, 11, GOLD)
text(s, 'Nguồn: js/ai/brain.js · multi-intent-splitter.js · injection-guard.js · handover.js · ai-output.js', 0.7, 5.65, 12.0, 0.3, 9, MUTED)
text(s, 'Mục tiêu: trả lời nhanh, đúng dữ liệu, chuyển người khi không chắc.', 0.7, 6.1, 12.0, 0.3, 9.5, MUTED)
text(s, 'Guard gồm: prompt injection · giá/tồn kho sai · vượt quyền · handover', 0.7, 6.45, 12.0, 0.3, 9, MUTED)
footer(s, 10)

# 11 — AI algorithms/tech
s = slide(); kicker(s, '09 · KỸ THUẬT & CÔNG NGHỆ'); title(s, 'Thuật toán và công nghệ đang dùng.', 'Không chỉ gọi API: có lớp xử lý trước và sau LLM.')
card(s, 0.65, 1.9, 5.9, 4.55, CARD, GOLD)
text(s, 'THUẬT TOÁN', 0.92, 2.15, 4.0, 0.3, 9, GOLD, True)
text(s, 'Intent classification bằng rule\nSlot filling cho đặt bàn/đơn\nMulti-intent splitter\nDraft engine + context engine\nTool calling có phân quyền\nAnti-hallucination guard\nHuman handover', 0.92, 2.65, 5.1, 2.8, 12.5, CREAM, True)
text(s, 'Scoring món theo nhu cầu/ngân sách/khẩu vị\nƯu tiên dữ liệu thật từ API\nKhông để LLM tự bịa giá/tồn kho', 0.92, 5.55, 5.2, 0.8, 8.5, MUTED)
card(s, 6.8, 1.9, 5.85, 4.55, CARD, GREEN)
text(s, 'CÔNG NGHỆ', 7.08, 2.15, 4.0, 0.3, 9, GREEN, True)
text(s, 'HTML / CSS / JavaScript thuần\nlocalStorage API\nWeb Speech API\nLLM fallback (Groq/Gemini)\nGenerative UI\nEmailJS / mailto\nKhông backend ở bản demo', 7.08, 2.6, 5.0, 2.7, 12.3, CREAM, True)
text(s, 'Static build 26 trang · responsive · dark/light\n130 test · 24 smoke · 26 verify', 7.08, 5.55, 5.1, 0.5, 8.5, MUTED)
footer(s, 11)

# 12 — Automation
s = slide(); kicker(s, '10 · AUTOMATION'); title(s, 'Automation: việc lặp lại, có log và undo.', 'Rule chạy trong tab; production chuyển n8n/worker.')
rules = [
    ('RULE 01', 'Nhả bàn held quá hạn', '15 phút · trừ booking đã cọc\nBàn về available'),
    ('RULE 02', 'Món hết nguyên liệu', 'Tự khoá menu\nOrder Board vẫn chạy'),
    ('RULE 03', 'BOM sắp cạn', 'Cảnh báo tồn kho\nGợi ý nhập hàng'),
]
for i, (n, h, b) in enumerate(rules):
    x = 0.65 + i * 4.15
    card(s, x, 1.9, 3.85, 3.1, CARD, GOLD)
    text(s, n, x + 0.25, 2.1, 3.0, 0.3, 9, GOLD, True)
    text(s, h, x + 0.25, 2.5, 3.25, 0.85, 15, CREAM, True)
    text(s, b, x + 0.25, 3.6, 3.2, 0.85, 10, MUTED)
text(s, 'Mỗi rule có: điều kiện · hành động · log · hoàn tác · dry-run.', 0.7, 5.45, 12.0, 0.35, 11, GOLD)
text(s, 'Báo cáo email: doanh thu + gợi ý AI; kho chỉ thêm cho báo cáo ngày.', 0.7, 5.95, 12.0, 0.35, 10, MUTED)
footer(s, 12)

# 13 — Demo
s = slide(); kicker(s, '11 · DEMO'); title(s, 'Demo sản phẩm: một ly matcha cuối cùng.', 'Khách → Order Board → Runner → Owner; cuối cùng là POS không điện thoại.')
steps = [
    ('01', 'Khách', 'Table A1 · mã 1234\nthêm Matcha · gửi order'),
    ('02', 'Order Board', 'Bắt đầu → Xong\nđơn chuyển Sẵn sàng'),
    ('03', 'Runner', 'Mở Runner View\nbấm Đã mang ra'),
    ('04', 'Kho + Owner', 'Matcha 3g → hết\nmenu khoá · alert'),
]
for i, (n, h, b) in enumerate(steps):
    x = 0.55 + i * 3.15
    card(s, x, 1.9, 2.95, 2.9, CARD, GOLD if i == 1 else None)
    text(s, n, x + 0.18, 2.1, 0.5, 0.25, 9, GOLD, True)
    text(s, h, x + 0.18, 2.45, 2.6, 0.4, 14.5, CREAM, True)
    text(s, b, x + 0.18, 3.1, 2.6, 0.9, 9.2, MUTED)
text(s, 'Thêm 20 giây: POS Counter Pickup → mã P01 → khách không điện thoại.', 0.7, 5.15, 12.0, 0.35, 10.5, GOLD)
text(s, 'Thao tác: Table A1 → thêm Matcha → Order Board Bắt đầu/Xong → Runner Đã mang ra → Ingredients → Owner.', 0.7, 5.55, 12.0, 0.35, 9, MUTED)
text(s, '26 trang · 130 test · 24 smoke · 26 verify', 0.7, 5.95, 12.0, 0.3, 9.5, MUTED)
text(s, 'URL: table.html?table=A1&code=1234 · staff-order-board.html · staff-runner.html · staff-stats.html', 0.7, 6.3, 12.0, 0.3, 8.2, MUTED)
footer(s, 13)

# 14 — Evidence/limits
s = slide(); kicker(s, '12 · MINH CHỨNG & GIỚI HẠN'); title(s, 'Demo chạy được, nhưng không giả vờ là production.', 'Ranh giới rõ ràng để bảo vệ.')
card(s, 0.65, 1.9, 5.9, 4.35, CARD, GREEN)
text(s, 'THẬT TRONG DEMO', 0.92, 2.15, 4.0, 0.3, 9, GREEN, True)
text(s, 'Bàn · QR · TableSession\nOrder · cọc · BOM\nOrder Board · Runner\nOwner Cockpit · báo cáo\n130 test · 26 trang', 0.92, 2.6, 5.1, 2.4, 12.5, CREAM, True)
text(s, 'Dữ liệu thật trong localStorage\nCó audit + realtime demo', 0.92, 5.35, 5.1, 0.5, 8.5, MUTED)
card(s, 6.8, 1.9, 5.85, 4.35, CARD, RED)
text(s, 'GIẢ LẬP / CHƯA CÓ', 7.08, 2.15, 4.0, 0.3, 9, RED, True)
text(s, 'Thanh toán QR thật\nHóa đơn điện tử\nPOS đối tác\nBackend / multi-device\nP0: atomic cọc, cọc dư', 7.08, 2.6, 5.0, 2.4, 12.5, CREAM, True)
text(s, 'Email demo: mailto/EmailJS\nProduction: SMTP/n8n', 7.08, 5.35, 5.1, 0.5, 8.5, MUTED)
text(s, 'Không claim production readiness.', 0.7, 6.5, 12.0, 0.3, 10, GOLD, True)
footer(s, 14)

# 15 — Vision
s = slide(); kicker(s, '13 · TẦM NHÌN'); title(s, 'Hướng đi tiếp theo: từ demo đến pilot.', 'Workflow layer, không thay POS thuế.')
rows = [
    ('PHASE 0', 'Demo hôm nay', '26 trang · localStorage\nOrder Board · Runner · Owner'),
    ('PHASE 1', 'Pilot 1 quán', 'backend/API · QR payment\nPOS/hóa đơn đối tác · KPI 30 ngày'),
    ('PHASE 2', 'Production', 'e-invoice · offline · backup\nnhiều chi nhánh · phân quyền'),
]
for i, (n, h, b) in enumerate(rows):
    x = 0.65 + i * 4.15
    card(s, x, 1.9, 3.85, 2.9, CARD, GOLD)
    text(s, n, x + 0.25, 2.1, 3.0, 0.3, 9, GOLD, True)
    text(s, h, x + 0.25, 2.5, 3.2, 0.45, 16, CREAM, True)
    text(s, b, x + 0.25, 3.15, 3.2, 1.0, 9.5, MUTED)
text(s, 'Không bán “AI thay người”. Bán thời gian, bàn, và quyết định.', 0.7, 5.5, 12.0, 0.4, 11.5, GOLD, True)
footer(s, 15)

# 16 — Closing
s = slide()
card(s, 0.65, 0.75, 12.0, 5.95, CARD, GOLD)
text(s, 'CAPPAN', 1.05, 1.05, 4.0, 0.5, 13, GOLD, True)
text(s, 'Không làm mọi thứ.\nLàm đúng một việc:\ngiữ cho quán không bỏ sót bàn,\nkhông bán khống,\nvà chủ quán biết ngay\nkhi có chuyện.', 1.05, 1.65, 7.2, 3.4, 26, CREAM, True)
text(s, 'Khách tự chọn. Hệ thống giữ bàn.\nNhân viên chỉ bưng nước và xử lý ngoại lệ.', 1.07, 5.35, 7.0, 0.8, 11, MUTED)
text(s, 'CẢM ƠN', 9.8, 5.55, 2.0, 0.4, 11, GOLD, True)
footer(s, 16)

prs.save(r'D:\Projectweb\cappan-slides-v5.pptx')
print('saved', len(prs.slides), 'slides')
