from docx import Document
from docx.shared import Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH

# Section 10
d = Document()
h = d.add_heading('10. TỔNG KẾT VÀ CHUYỂN TIẾP', level=1)
h.paragraph_format.space_before = Pt(0)
d.add_heading('10.1. Những gì đã hoàn thành', level=2)
d.add_paragraph('Đến cuối phiên bản 2.0, CAPPAN đã có một AI Agent chạy trên website tĩnh: chatbot tư vấn món, đặt bàn, theo dõi đơn, tra cứu vận hành; một lớp automation xử lý bàn giữ quá hạn và trạng thái món; một website 26 trang phục vụ khách và nhân viên; cùng bộ kiểm thử tự động 130 trường hợp. Sản phẩm đã chứng minh được ba việc: dữ liệu đi xuyên từ giao diện đến nghiệp vụ, AI gọi công cụ thay vì chỉ trả lời văn bản, và automation giảm việc lặp lại mà vẫn có log/hoàn tác.')
d.add_heading('10.2. Hạn chế', level=2)
d.add_paragraph('Bản 2.0 vẫn là demo local-first. Thanh toán và hóa đơn điện tử chưa có đối tác thật; dữ liệu nằm trong localStorage; chưa có backend, phân quyền server và multi-device. Một số quy tắc vận hành mới như cọc theo từng order, trạng thái bàn occupied/cleaning và báo cáo email theo ngày vẫn cần được chuẩn hóa để không mâu thuẫn với luồng cũ.')
d.add_heading('10.3. Lý do cập nhật 3.0', level=2)
d.add_paragraph('Từ những hạn chế trên, phiên bản 3.0 chuyển trọng tâm từ “trình diễn AI” sang “lớp vận hành”. Các thay đổi chính gồm: bốn service mode; TableSession là trung tâm; POS Table Service tự mở phiên; Order Board và Runner View thay cho điều phối thủ công; BOM tự khóa món khi hết nguyên liệu; báo cáo email giữ bản cũ và chỉ thêm kho cho báo cáo ngày. Chương 11 trình bày chi tiết các thay đổi này.')
d.save(r'D:\Projectweb\scripts\essay-sec10.docx')

# BOM section
d = Document()
d.add_heading('11.8.1. BOM — cơ chế tự đánh dấu hết món', level=3)
paras = [
    'BOM (Bill of Materials) là định mức nguyên liệu cho một món. Trong CAPPAN, mỗi món có thể có một BOM gồm nhiều dòng nguyên liệu, mỗi dòng có ingredientId và qty. Ví dụ món Trà Xanh Matcha dùng 3g bột matcha, 100ml sữa, 15ml nước đường, 150g đá và một bộ ly/nắp/ống hút. BOM là nguồn sự thật để hệ thống biết một ly cần bao nhiêu nguyên liệu, thay vì để nhân viên tự nhớ.',
    'Công thức định lượng một dòng món được cài trong API.ingredients._explode(menuItemId, size, quantity): qty = line.qty × sizeFactor × (1 + wasteRate) × quantity. sizeFactor của size M là 1, size L là 1.25 nếu BOM không khai báo riêng; wasteRate là hao hụt định mức. Ví dụ Matcha có wasteRate = 0 nên size M cần đúng 3g; size L cần 3,75g. Với món có wasteRate = 0,05 như Latte, 18g cà phê cho size M được tính thành 18,9g.',
    'Từ định lượng một ly, API.ingredients.availability(menuItemId, size) tính số ly còn bán được. Với từng dòng BOM, hệ thống lấy possible = floor(stock / qty) nếu stock > 0, ngược lại bằng 0. maxServings là giá trị nhỏ nhất trong các possible; nguyên liệu tạo ra giá trị nhỏ nhất được ghi là limitingIngredient. available = maxServings > 0. Ví dụ sữa còn 5.000ml và mỗi ly dùng 100ml thì được 50 ly; matcha còn 3g và mỗi ly dùng 3g thì được 1 ly; maxServings = min(50, 1) = 1, và limitingIngredient là bột matcha.',
    'API.menu.getAll() áp kết quả BOM lên từng món. Cờ thủ công inStock của nhân viên được giữ làm lớp nền; nếu món có BOM được quản lý, hệ thống ghi thêm ingredientAvailable, maxServings, limitingIngredient và inventoryManaged. Công thức cuối cùng là inStock = cờ thủ công AND ingredientAvailable. Nhờ vậy, món chỉ bán được khi cả hai điều kiện đúng: nhân viên không đánh dấu hết và nguyên liệu vẫn đủ. Món không có BOM có inventoryManaged = false và không bị khóa tự động.',
    'Khi khách đặt món, API.ingredients.checkItems(items) cộng dồn nhu cầu của toàn bộ order theo từng nguyên liệu, rồi so với tồn kho. Nếu bất kỳ nguyên liệu nào thiếu, hàm trả về ok = false kèm thông báo cần bao nhiêu và còn bao nhiêu. Nếu đủ, API.ingredients.deductOrder(orderId, items) trừ kho, ghi inventory log và đánh dấu order.inventoryDeducted. Nếu lưu order thất bại hoặc order bị hủy, restoreOrder(orderId) hoàn lại đúng các dòng đã trừ.',
    'Ví dụ trọn vẹn: trước khi bán, I_MATCHA.stock = 3g, M102.maxServings = 1, M102.inStock = true. Khách order một Matcha; checkItems thấy đủ; deductOrder trừ 3g, stock còn 0; menu.getAll() tính lại availability = 0, ingredientAvailable = false, maxServings = 0, inStock = false. Menu Matcha bị khóa trên UI, AI/get_menu thấy inStock = false, Order Board không nhận món, và automation ghi log ingredient_out. Đây là cơ chế “một ly cuối cùng” của bản demo.',
    'Automation chỉ quan sát và ghi log, không tự nhập kho. syncIngredientRule() phân loại out khi !ingredientAvailable, low khi maxServings <= 2, còn lại là ok; mỗi lần trạng thái đổi, engine ghi ingredient_out, ingredient_low hoặc ingredient_restore. Việc nhập kho vẫn do nhân viên thực hiện, sau đó menu tự mở lại nếu cờ thủ công không chặn.',
    'Các trường hợp biên đã được xử lý: món không có BOM không bị khóa tự động; thiếu một nguyên liệu làm available = false và maxServings = 0; nhiều dòng BOM lấy min; size L tốn 1,25 lần; wasteRate làm tăng lượng cần; cờ thủ công có thể giữ món ở trạng thái hết dù kho đã có lại; hủy order hoàn kho. Cơ chế này được kiểm thử trong tests/inventory.test.mjs với các nhóm định mức, trừ kho, hoàn kho, POS, order online và món hết hàng.'
]
for p in paras:
    d.add_paragraph(p)
d.save(r'D:\Projectweb\scripts\essay-bom.docx')
print('supplements created')
