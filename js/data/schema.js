/* ============================================================
   SCHEMA — ĐỊNH NGHĨA CẤU TRÚC DỮ LIỆU
   Chỉ là tài liệu tham khảo — KHÔNG chứa logic
=========================================================== */

const SCHEMA = {
  users: {
    /* `password` chỉ còn ở dữ liệu cũ; API tự nâng cấp sang salt+hash khi nạp. */
    fields: ['id', 'name', 'phone', 'passwordHash', 'passwordSalt', 'role', 'email', 'address', 'birthday', 'joinedAt', 'noShowCount'],
    desc: 'Người dùng (khách + nhân viên)'
  },
  categories: {
    fields: ['id', 'name', 'order'],
    desc: 'Nhóm đồ uống'
  },
  menuItems: {
    fields: ['id', 'name', 'categoryId', 'price', 'img', 'description', 'badge', 'inStock', 'sizes', 'toppings',
             'inventoryManaged', 'ingredientAvailable', 'maxServings', 'limitingIngredient'],
    desc: 'Món đồ uống (các cờ inventory* là computed từ BOM, không lưu vào menu)'
  },
  floors: {
    fields: ['id', 'name', 'purpose', 'description', 'img'],
    desc: 'Tầng/khu vực'
  },
  seats: {
    fields: ['id', 'floorId', 'zone', 'capacity', 'status', 'img', 'description'],
    desc: 'Chỗ ngồi'
  },
  bookings: {
    fields: ['id', 'userId', 'seatId', 'floorId', 'date', 'time', 'guests', 'note', 'status', 'createdAt',
             'customerName', 'phone', 'walkIn', 'checkedInAt', 'noShowAt', 'updatedAt',
             'createdBy', 'heldAt', 'deposit', 'depositPaid', 'depositPaidAt'],
    desc: 'Lịch sử đặt chỗ (kể cả khách vãng lai)'
  },
  orders: {
    fields: ['id', 'userId', 'items', 'subtotal', 'shipping', 'discount', 'total', 'promoCode',
             'address', 'phone', 'note', 'customerName', 'status', 'step', 'channel',
             'paymentMethod', 'cashReceived', 'change', 'staffId', 'createdAt', 'completedAt', 'paidAt',
             'inventoryDeducted', 'inventoryRestoredAt'],
    desc: 'Lịch sử đơn hàng (giao hàng + thu ngân tại quầy)'
  },
  ingredients: {
    fields: ['id', 'name', 'unit', 'stock', 'minStock', 'unitCost', 'supplier', 'note', 'updatedAt'],
    desc: 'Nguyên liệu — đơn vị gốc ml/g/cái, tồn kho là số thực'
  },
  bom: {
    fields: ['menuItemId', 'lines', 'wasteRate', 'sizes'],
    desc: 'Định mức nguyên vật liệu (Bill of Materials) cho một món'
  },
  inventoryLog: {
    fields: ['id', 'at', 'type', 'ingredientId', 'name', 'unit', 'qty', 'before', 'after', 'orderId', 'note'],
    desc: 'Nhật ký kho: import / sale / adjust / refund'
  },
  audit: {
    fields: ['at', 'actor', 'action', 'targetId', 'ok', 'code'],
    desc: 'Nhật ký thao tác (500 dòng gần nhất)'
  }
};

const ENUMS = {
  userRole:      ['customer', 'staff'],
  bookingStatus: ['confirmed', 'held', 'seated', 'completed', 'cancelled', 'no_show'],
  orderStatus:   ['pending', 'preparing', 'delivering', 'completed', 'cancelled'],
  floorPurpose:  ['lobby', 'study', 'group', 'outdoor'],
  seatZone:      ['window', 'center', 'quiet', 'group'],
  seatStatus:    ['available', 'booked'],
  inventoryType: ['import', 'sale', 'adjust', 'refund']
};

const STORAGE_KEYS = {
  currentUser:  'cappan_current_user',
  users:        'cappan_users',
  bookings:     'cappan_bookings',
  orders:       'cappan_orders',
  currentOrder: 'cappan_current_order',
  ingredients:  'cappan_ingredients_v1',
  bom:          'cappan_bom_v1',
  inventoryLog: 'cappan_inventory_log_v1'
};
