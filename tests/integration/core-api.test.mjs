/* Test tích hợp: core + API, chạy hoàn toàn trong Node (không cần trình duyệt).
   Bao phủ: tính giá, đặt món, đặt bàn, phân quyền, audit, POS, theo dõi đơn. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadApi } from '../helpers/sandbox.mjs';

const futureDate = (days = 3) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

test('Pricing tính giá từ catalog: size L + topping', () => {
  const ctx = loadApi();
  const q = ctx.Pricing.quote({
    items: [{ itemId: 'M001', size: 'L', qty: 2, toppings: ['Kem'] }],
    menu: ctx.API.menu.getAll(),
    combos: ctx.KB.combos,
    evaluatePromo: () => ({ ok: true, discount: 0 })
  });
  assert.equal(q.ok, true, q.error);
  // 35.000 + 10.000 size L + 8.000 kem = 53.000/ly
  assert.equal(q.lines[0].price, 53000);
  assert.equal(q.subtotal, 106000);
  assert.equal(q.total, 121000);
  // Dòng hàng giữ ảnh để hoá đơn/giỏ hiển thị được.
  assert.ok(q.lines[0].img, 'd�ng h�ng ph?i gi? ?nh m�n');
});

test('Pricing nhận combo và chặn món không tồn tại', () => {
  const ctx = loadApi();
  const combo = ctx.KB.combos[0];
  const q = ctx.Pricing.quote({
    items: [{ itemId: 'COMBO_' + combo.id, size: 'Combo', qty: 1 }],
    menu: ctx.API.menu.getAll(),
    combos: ctx.KB.combos,
    evaluatePromo: () => ({ ok: true, discount: 0 })
  });
  assert.equal(q.ok, true, q.error);
  assert.equal(q.lines[0].price, combo.comboPrice);
  assert.ok(q.lines[0].img, 'combo phải có ảnh đại diện');

  const bad = ctx.Pricing.quote({
    items: [{ itemId: 'KHONG_CO', qty: 1 }],
    menu: ctx.API.menu.getAll(),
    combos: ctx.KB.combos,
    evaluatePromo: () => ({ ok: true, discount: 0 })
  });
  assert.equal(bad.ok, false);
  assert.match(bad.error, /không còn trong thực đơn/);
});

test('orders.create bỏ qua total client gửi lên', () => {
  const ctx = loadApi();
  const { API } = ctx;
  const order = API.orders.create({
    userId: 'U001',
    items: [{ itemId: 'M001', size: 'M', qty: 2 }],
    total: 0,
    subtotal: 0,
    shipping: 0,
    discount: 999999,
    address: '12 Lê Lợi',
    phone: '0900000001'
  });
  assert.ok(order && order.id, API._lastError || 'tạo đơn thất bại');
  // 2 × 35.000 + ship 15.000
  assert.equal(order.subtotal, 70000);
  assert.equal(order.shipping, 15000);
  assert.equal(order.discount, 0);
  assert.equal(order.total, 85000);
});

test('orders.create áp mã giảm giá và chặn món hết hàng', () => {
  const ctx = loadApi();
  const { API } = ctx;
  API.menu.markOutOfStock('M104');
  const blocked = API.orders.create({
    userId: 'U001', items: [{ itemId: 'M104', qty: 1 }], address: 'x', phone: '09'
  });
  assert.equal(blocked, null);
  assert.match(API._lastError, /hết hàng/);

  const order = API.orders.create({
    userId: 'U002',
    items: [{ itemId: 'M001', size: 'M', qty: 3 }],
    promoCode: 'CAFE20',
    address: '12 Lê Lợi',
    phone: '0900000002'
  });
  // 105.000 + 15.000 - 20.000
  assert.equal(order.discount, 20000);
  assert.equal(order.total, 100000);
});

test('orders.create chặn đơn rỗng và ghi audit', () => {
  const ctx = loadApi();
  const { API } = ctx;
  const user = API.users.getById('U001');
  API.users.setCurrent(user);
  const empty = API.orders.create({ userId: 'U001', items: [], address: 'x', phone: '09' });
  assert.equal(empty, null);
  assert.match(API._lastError, /trống/);

  const order = API.orders.create({
    userId: 'U001', items: [{ itemId: 'M002', qty: 1 }], address: 'x', phone: '09'
  });
  assert.ok(order.id);
  API.users.setCurrent(API.users.getById('U002'));
  assert.ok(API.audit.getRecent(10).some(r => r.action === 'order.create' && r.targetId === order.id));
});

test('BookingRules: ngày quá khứ, giờ, sức chứa, đặt trước 30 phút', () => {
  const ctx = loadApi();
  const seat = ctx.API.seats.getAll().find(s => s.status === 'available');
  const now = new Date(2026, 10, 4, 10, 0); // 04/11/2026 10:00

  const past = ctx.BookingRules.validate({
    date: '2026-11-03', time: '19:00', guests: 1, seat, now, activeCount: 0
  });
  assert.equal(past.ok, false);
  assert.match(past.error, /ngày đã qua/);

  const late = ctx.BookingRules.validate({
    date: '2026-11-04', time: '22:30', guests: 1, seat, now, activeCount: 0
  });
  assert.equal(late.ok, false);
  assert.match(late.error, /07:00/);

  const soon = ctx.BookingRules.validate({
    date: '2026-11-04', time: '10:15', guests: 1, seat, now, activeCount: 0
  });
  assert.equal(soon.ok, false);
  assert.match(soon.error, /30 phút/);

  const tooMany = ctx.BookingRules.validate({
    date: '2026-11-05', time: '19:00', guests: 99, seat, now, activeCount: 0
  });
  assert.equal(tooMany.ok, false);
  assert.match(tooMany.error, /tối đa/);

  const ok = ctx.BookingRules.validate({
    date: '2026-11-05', time: '19:00', guests: 1, seat, now, activeCount: 0
  });
  assert.equal(ok.ok, true, ok.error);
});

test('bookings.create chặn ngày quá khứ, nhận ngày hợp lệ, ghi audit', () => {
  const ctx = loadApi();
  const { API } = ctx;
  const seat = API.seats.getAll().find(s => s.status === 'available');
  API.users.setCurrent(API.users.getById('U001'));

  const bad = API.bookings.create({
    userId: 'U001', seatId: seat.id, floorId: seat.floorId,
    date: '2020-01-01', time: '19:00', guests: 1
  });
  assert.equal(bad, null);
  assert.match(API._lastError, /ngày đã qua/);

  const bk = API.bookings.create({
    userId: 'U001', seatId: seat.id, floorId: seat.floorId,
    date: futureDate(3), time: '19:00', guests: 1
  });
  assert.ok(bk && bk.id, API._lastError || 'đặt bàn thất bại');
  API.users.setCurrent(API.users.getById('U002'));
  assert.ok(API.audit.getRecent(5).some(r => r.action === 'booking.create' && r.targetId === bk.id));
});

test('bookings.create cho phép bypass luật khi { seed: true }', () => {
  const ctx = loadApi();
  const { API } = ctx;
  const seat = API.seats.getAll().find(s => s.status === 'available');
  const bk = API.bookings.create({
    userId: 'U001', seatId: seat.id, floorId: seat.floorId,
    date: '2020-01-01', time: '23:00', guests: 2
  }, { seed: true });
  assert.ok(bk && bk.id);
});

test('Policy: khách chỉ huỷ đặt chỗ của mình, nhân viên huỷ được hộ', () => {
  const ctx = loadApi();
  const { API } = ctx;
  const seats = API.seats.getAll().filter(s => s.status === 'available');
  const u1 = API.users.getById('U001');
  const u2 = API.users.getById('U002');

  API.users.setCurrent(u2);
  const bk2 = API.bookings.create({
    userId: u2.id, seatId: seats[0].id, floorId: seats[0].floorId,
    date: futureDate(3), time: '19:00', guests: 1
  });
  assert.ok(bk2, API._lastError || 'staff phải đặt được');

  API.users.setCurrent(u1);
  assert.equal(API.bookings.cancel(bk2.id), null, 'khách không được huỷ booking người khác');
  assert.equal(API.bookings.getAll().find(b => b.id === bk2.id).status, 'confirmed');

  API.users.setCurrent(u2);
  assert.ok(API.bookings.cancel(bk2.id));
  assert.equal(API.bookings.getAll().find(b => b.id === bk2.id).status, 'cancelled');
});

test('Policy: khách không đặt được đơn cho người khác', () => {
  const ctx = loadApi();
  const { API } = ctx;
  API.users.setCurrent(API.users.getById('U001'));
  const order = API.orders.create({
    userId: 'U002', items: [{ itemId: 'M001', qty: 1 }], address: 'x', phone: '09'
  });
  assert.equal(order, null);
  assert.match(API._lastError, /quyền/);
});

test('Seed tài khoản demo tồn tại ngay khi nạp API', () => {
  const ctx = loadApi();
  const users = ctx.API.users.getAll();
  assert.ok(users.some(u => u.phone === '0900000001' && u.role === 'customer'));
  assert.ok(users.some(u => u.phone === '0900000002' && u.role === 'staff'));
});

test('Phiên đăng nhập không chứa mật khẩu', () => {
  const ctx = loadApi();
  ctx.API.users.setCurrent(ctx.API.users.getById('U001'));
  const raw = ctx.sessionStorage.getItem(ctx.STORAGE_KEYS.currentUser);
  assert.ok(raw);
  assert.ok(!raw.includes('"password"'));
});

test('cart.add tôn trọng số lượng và cộng dồn', () => {
  const ctx = loadApi();
  const { API } = ctx;
  API.cart.clear();
  API.cart.add({ itemId: 'M001', size: 'M', qty: 2, price: 1, name: 'fake' });
  API.cart.add({ itemId: 'M001', size: 'M', qty: 3, price: 1, name: 'fake' });
  const cart = API.cart.get();
  assert.equal(cart.length, 1);
  assert.equal(cart[0].qty, 5);
});

test('POS: không phí ship, tính tiền thối, doanh thu quầy', () => {
  const ctx = loadApi();
  const { API } = ctx;
  API.users.setCurrent(API.users.getById('U002'));

  const q = API.pos.quote({ items: [{ itemId: 'M001', size: 'M', qty: 2 }] });
  assert.equal(q.ok, true, q.error);
  assert.equal(q.subtotal, 70000);
  assert.equal(q.shipping, 0);
  assert.equal(q.total, 70000);

  const sale = API.pos.createSale({
    items: [{ itemId: 'M001', size: 'M', qty: 2 }],
    paymentMethod: 'cash',
    cashReceived: 100000
  });
  assert.equal(sale.total, 70000);
  assert.equal(sale.change, 30000);
  assert.equal(sale.channel, 'pos');
  assert.equal(sale.status, 'completed');
  assert.equal(sale.step, 4);
  assert.ok(API.orders.getAll().some(o => o.id === sale.id));

  const sum = API.pos.summary();
  assert.equal(sum.count, 1);
  assert.equal(sum.revenue, 70000);
  assert.equal(sum.byMethod.cash, 70000);
});

test('POS: tiền mặt thiếu thì chặn; khách không thu tiền được', () => {
  const ctx = loadApi();
  const { API } = ctx;
  API.users.setCurrent(API.users.getById('U002'));
  assert.throws(() => API.pos.createSale({
    items: [{ itemId: 'M001', size: 'M', qty: 1 }],
    paymentMethod: 'cash',
    cashReceived: 1000
  }), /chưa đủ/);

  API.users.setCurrent(API.users.getById('U001'));
  assert.throws(() => API.pos.createSale({
    items: [{ itemId: 'M001', size: 'M', qty: 1 }],
    paymentMethod: 'cash', cashReceived: 100000
  }), /quyền/);
});

test('Đăng nhập: sai mật khẩu bị chặn, đúng thì có audit', () => {
  const ctx = loadApi();
  const { Auth, API } = ctx;

  const bad = Auth.login('0900000001', 'sai-mat-khau');
  assert.equal(bad.ok, false);
  assert.match(bad.error, /Mật khẩu/);

  const ok = Auth.login('0900000001', '123');
  assert.equal(ok.ok, true);
  const raw = ctx.sessionStorage.getItem(ctx.STORAGE_KEYS.currentUser);
  assert.ok(raw);
  assert.ok(!raw.includes('"password"'), 'session không được chứa password');
  assert.equal(JSON.parse(raw).id, 'U001');
  API.users.setCurrent(API.users.getById('U002'));
  assert.ok(API.audit.getRecent(10).some(r => r.action === 'auth.login' && r.ok === true));
});

test('markNoShow: nhả bàn, tăng noShowCount, chỉ nhân viên làm được', () => {
  const ctx = loadApi();
  const { API } = ctx;
  const seat = API.seats.getAll().find(s => s.status === 'available');
  const customer = API.users.getById('U001');
  const staff = API.users.getById('U002');

  API.users.setCurrent(customer);
  const bk = API.bookings.create({
    userId: customer.id, seatId: seat.id, floorId: seat.floorId,
    date: futureDate(3), time: '19:00', guests: 1
  });
  assert.ok(bk, API._lastError);

  // Khách không được tự đánh dấu no-show
  assert.equal(API.bookings.markNoShow(bk.id), null);

  const before = Number(API.users.getById(customer.id).noShowCount) || 0;
  API.users.setCurrent(staff);
  const res = API.bookings.markNoShow(bk.id);
  assert.ok(res);
  assert.equal(res.status, 'no_show');
  assert.equal(API.seats.getAll().find(s => s.id === seat.id).status, 'available');
  assert.equal(Number(API.users.getById(customer.id).noShowCount), before + 1);
});

test('Theo dõi đơn: khách tự chạy tiến trình đơn của mình, không nhảy cóc', () => {
  const ctx = loadApi();
  const { API } = ctx;
  const customer = API.users.getById('U001');
  API.users.setCurrent(customer);
  const order = API.orders.create({
    userId: customer.id, items: [{ itemId: 'M001', qty: 1 }], address: 'x', phone: '09'
  });
  assert.ok(order.id);

  const s1 = API.orders.advanceDemo(order.id);
  assert.equal(s1.step, 1);

  // Nhảy cóc bị chặn: updateStep chỉ dành cho nhân viên.
  assert.equal(API.orders.updateStep(order.id, 4), null);

  // Khách khác không đụng được đơn này.
  API.users.setCurrent(API.users.getById('U002'));
  API.users.setCurrent({ ...API.users.getById('U002'), id: 'U999', role: 'customer' });
  // (không có user U999 trong danh sách nhưng policy chỉ so id)
  assert.equal(API.orders.advanceDemo(order.id), null);
});

test('Bản prod: không seed tài khoản demo', () => {
  const ctx = loadApi();
  // Mô phỏng prod trước khi nạp API là việc của trình duyệt (window.CAPPAN_MODE);
  // ở đây kiểm tra cờ cấu hình và hàm seedDemo tôn trọng cờ.
  ctx.CappanConfig.mode = 'prod';
  ctx.localStorage.removeItem(ctx.STORAGE_KEYS.users);
  ctx.API.users.seedDemo();
  assert.equal(ctx.API.users.getAll().length, 0);
});

test('checkIn: chỉ nhân viên, bàn vẫn bị chiếm, hoàn tất mới nhả', () => {
  const ctx = loadApi();
  const { API } = ctx;
  const seat = API.seats.getAll().find(s => s.status === 'available');
  const customer = API.users.getById('U001');
  const staff = API.users.getById('U002');

  API.users.setCurrent(customer);
  const bk = API.bookings.create({
    userId: customer.id, seatId: seat.id, floorId: seat.floorId,
    date: futureDate(3), time: '19:00', guests: 2
  });
  assert.ok(bk, API._lastError);

  // Khách không được tự check-in
  assert.equal(API.bookings.checkIn(bk.id), null);

  API.users.setCurrent(staff);
  const checked = API.bookings.checkIn(bk.id);
  assert.ok(checked);
  assert.equal(checked.status, 'seated');
  assert.equal(API.seats.getById(seat.id).status, 'booked', 'bàn vẫn phải bị chiếm khi khách đang ngồi');

  const done = API.bookings.complete(bk.id);
  assert.equal(done.status, 'completed');
  assert.equal(API.seats.getById(seat.id).status, 'available');
});

test('Khách vãng lai: nhân viên xếp bàn ngay, không cần tài khoản', () => {
  const ctx = loadApi();
  const { API } = ctx;
  const staff = API.users.getById('U002');
  const seat = API.seats.getAll().find(s => s.status === 'available');

  // Khách không xếp được khách vãng lai
  API.users.setCurrent(API.users.getById('U001'));
  assert.equal(API.bookings.createWalkIn({ seatId: seat.id, guests: 2 }), null);
  assert.match(API._lastError, /nhân viên/i);

  API.users.setCurrent(staff);
  const wk = API.bookings.createWalkIn({
    seatId: seat.id, guests: 2, customerName: 'Khách đi đường', phone: '0909999999'
  });
  assert.ok(wk, API._lastError);
  assert.equal(wk.status, 'seated');
  assert.equal(wk.walkIn, true);
  assert.equal(wk.customerName, 'Khách đi đường');
  assert.equal(API.seats.getById(seat.id).status, 'booked');

  // Bàn đã bị chiếm thì không xếp thêm
  const dup = API.bookings.createWalkIn({ seatId: seat.id, guests: 1 });
  assert.equal(dup, null);
  assert.match(API._lastError, /đã có người/);
});

test('Hash: SHA-256 đúng chuẩn, salt khác → hash khác, không lộ plaintext', () => {
  const ctx = loadApi();
  const H = ctx.CappanHash;

  // Vector chuẩn FIPS: SHA-256("abc")
  const abc = H._hex(H._sha256(H._utf8('abc')));
  assert.equal(abc, 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');

  const a = H.create('mat-khau-123');
  const b = H.create('mat-khau-123');
  assert.ok(a.passwordSalt && a.passwordHash);
  assert.notEqual(a.passwordSalt, b.passwordSalt, 'mỗi tài khoản một muối riêng');
  assert.notEqual(a.passwordHash, b.passwordHash, 'cùng mật khẩu nhưng hash khác nhau');
  assert.equal(H.verify('mat-khau-123', a.passwordSalt, a.passwordHash), true);
  assert.equal(H.verify('sai', a.passwordSalt, a.passwordHash), false);
  assert.ok(!a.passwordHash.includes('mat-khau'));
});

test('Người dùng mới không lưu mật khẩu thô, đăng nhập bằng hash', () => {
  const ctx = loadApi();
  const { API, Auth } = ctx;
  const user = API.users.create({ name: 'Test Hash', phone: '0911111111', password: 'bi-mat-456' });
  const stored = API.users.getAll().find(u => u.id === user.id);
  assert.equal(stored.password, undefined, 'không được lưu password thô');
  assert.ok(stored.passwordHash && stored.passwordSalt);

  const ok = Auth.login('0911111111', 'bi-mat-456');
  assert.equal(ok.ok, true, ok.error);
  assert.equal(Auth.login('0911111111', 'sai').ok, false);
});

test('Tài khoản cũ (plaintext) tự nâng cấp sau lần đăng nhập đầu', () => {
  const ctx = loadApi();
  const { API, Auth } = ctx;
  // Mô phỏng dữ liệu cũ: ghi thẳng user có password thô
  const raw = JSON.parse(ctx.localStorage.getItem(ctx.STORAGE_KEYS.users));
  raw.push({ id: 'U900', name: 'Legacy', phone: '0922222222', password: '123', role: 'customer' });
  ctx.localStorage.setItem(ctx.STORAGE_KEYS.users, JSON.stringify(raw));

  const res = Auth.login('0922222222', '123');
  assert.equal(res.ok, true, res.error);
  const after = API.users.getById('U900');
  assert.equal(after.password, undefined);
  assert.ok(after.passwordHash);

  // Lần đăng nhập sau vẫn đúng
  assert.equal(Auth.login('0922222222', '123').ok, true);
  assert.equal(Auth.login('0922222222', '124').ok, false);
});

test('Đăng ký: tạo tài khoản bằng hash, đăng nhập lại được', () => {
  const ctx = loadApi();
  const { Auth, API } = ctx;
  const res = Auth.register({ name: 'Người Mới', phone: '0933333333', password: 'abc123' });
  assert.equal(res.ok, true, res.error);
  const stored = API.users.getByPhone('0933333333');
  assert.equal(stored.password, undefined);
  assert.ok(stored.passwordHash && stored.passwordSalt);
  assert.equal(API.users.getCurrent().id, stored.id);
  API.users.setCurrent(null);
  assert.equal(Auth.login('0933333333', 'abc123').ok, true);
  assert.equal(Auth.login('0933333333', 'abc124').ok, false);
});

test('Nhân viên đặt bàn hộ: tìm khách theo SĐT, tính cọc, ghi staff', () => {
  const ctx = loadApi();
  const { API } = ctx;
  const staff = API.users.getById('U002');
  API.users.setCurrent(staff);
  const seat = API.seats.getAll().find(s => s.status === 'available' && s.capacity >= 4);

  const bk = API.bookings.createByStaff({
    seatId: seat.id, date: futureDate(2), time: '19:00', guests: 4,
    phone: '0900000001', note: 'Đặt hộ', depositPaid: true
  });
  assert.ok(bk, API._lastError);
  assert.equal(bk.userId, 'U001', 'phải gắn đúng khách theo SĐT');
  assert.equal(bk.customerName, 'Khách Demo');
  assert.equal(bk.createdBy, 'staff');
  assert.equal(bk.deposit, 70000);
  assert.equal(bk.depositPaid, true);
  assert.equal(API.seats.getById(seat.id).status, 'booked');
});

test('Trạng thái đang giữ: bàn chuyển held → booked khi nhận bàn', () => {
  const ctx = loadApi();
  const { API } = ctx;
  API.users.setCurrent(API.users.getById('U002'));
  const seat = API.seats.getAll().find(s => s.status === 'available' && s.capacity >= 2);

  const bk = API.bookings.createByStaff({
    seatId: seat.id, date: futureDate(2), time: '18:00', guests: 2, customerName: 'Khách Giữ'
  });
  assert.ok(bk, API._lastError);
  const held = API.bookings.setHeld(bk.id, true);
  assert.equal(held.status, 'held');
  assert.equal(API.seats.getById(seat.id).status, 'held');

  const checked = API.bookings.checkIn(bk.id);
  assert.equal(checked.status, 'seated');
  assert.equal(checked.held, false);
  assert.equal(API.seats.getById(seat.id).status, 'booked');

  // Không thể giữ lại bàn đã check-in
  assert.equal(API.bookings.setHeld(bk.id, true), null);
});

test('Giữ bàn trực tiếp (hold) + thu cọc', () => {
  const ctx = loadApi();
  const { API } = ctx;
  API.users.setCurrent(API.users.getById('U002'));
  const seat = API.seats.getAll().find(s => s.status === 'available' && s.capacity >= 4);

  const hold = API.bookings.hold({ seatId: seat.id, guests: 4, customerName: 'Giữ chỗ' });
  assert.ok(hold, API._lastError);
  assert.equal(hold.status, 'held');
  assert.equal(hold.deposit, 70000);
  assert.equal(API.seats.getById(seat.id).status, 'held');

  const paid = API.bookings.setDepositPaid(hold.id, true);
  assert.equal(paid.depositPaid, true);
  assert.ok(paid.depositPaidAt);

  // Khách thường không được giữ bàn / thu cọc
  API.users.setCurrent(API.users.getById('U001'));
  assert.equal(API.bookings.setDepositPaid(hold.id, false), null);
});

test('Automation: nhả bàn held quá hạn + hoàn tác', () => {
  const ctx = loadApi();
  const { API } = ctx;
  API.users.setCurrent(API.users.getById('U002'));
  const seat = API.seats.getAll().find(s => s.status === 'available' && s.capacity >= 4);
  const hold = API.bookings.hold({ seatId: seat.id, guests: 4, customerName: 'Automation' });
  assert.ok(hold, API._lastError);

  const released = API.bookings.autoReleaseHeld(hold.id);
  assert.ok(released, API._lastError);
  assert.equal(API.bookings.getById(hold.id).status, 'cancelled');
  assert.equal(API.bookings.getById(hold.id).cancelledBy, 'automation:held_expired');
  assert.equal(API.seats.getById(seat.id).status, 'available');

  const restored = API.bookings.autoRestoreHeld(hold.id);
  assert.ok(restored, API._lastError);
  assert.equal(API.bookings.getById(hold.id).status, 'held');
  assert.equal(API.seats.getById(seat.id).status, 'held');
});

test('Stats: preset tuần/năm + monthlySeries', () => {
  const ctx = loadApi();
  const { API } = ctx;
  const week = API.stats.preset('week');
  const year = API.stats.preset('year');
  assert.equal(week.key, 'week');
  assert.equal(year.key, 'year');
  assert.ok(year.from < week.from);
  const months = API.stats.monthlySeries(year.from, year.to);
  assert.ok(months.length >= 1);
  assert.equal(typeof months[0].revenue, 'number');
});

test('Stats: range/trend/dailySeries/bookingsSummary có held + cọc', () => {
  const ctx = loadApi();
  const { API } = ctx;
  API.users.setCurrent(API.users.getById('U002'));
  const seat = API.seats.getAll().find(s => s.status === 'available' && s.capacity >= 4);
  const bk = API.bookings.createByStaff({
    seatId: seat.id, date: futureDate(3), time: '19:00', guests: 4, customerName: 'A', depositPaid: true
  });
  assert.ok(bk, API._lastError);

  const today = API.stats.preset('today');
  const r = API.stats.range(today.from, today.to);
  assert.ok('revenue' in r && 'byChannel' in r && 'byPayment' in r);
  assert.ok(Array.isArray(API.stats.dailySeries(today.from, Date.now())));
  assert.equal(API.stats.dailySeries(today.from, Date.now()).length, 1);

  const summary = API.stats.bookingsSummary();
  assert.ok(summary.total >= 1);
  assert.ok(summary.depositCollected >= 70000);
  assert.ok(typeof summary.occupancy === 'number');
  assert.ok(typeof API.stats.trend('today').pct === 'number');
});
