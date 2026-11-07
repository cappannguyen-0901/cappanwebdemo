import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadApi } from './helpers/sandbox.mjs';

function fresh() {
  const ctx = loadApi();
  return ctx.API;
}

test('BOM seed: Matcha chỉ đủ đúng 1 ly', () => {
  const api = fresh();
  const m = api.menu.getById('M102');
  assert.equal(m.inStock, true);
  assert.equal(m.inventoryManaged, true);
  assert.equal(m.maxServings, 1);
  assert.equal(api.ingredients.getById('I_MATCHA').stock, 3);
});

test('Bán 1 Matcha: trừ 3g và tự đánh dấu hết nguyên liệu', () => {
  const api = fresh();
  const res = api.ingredients.deductOrder('OD_TEST_1', [
    { itemId: 'M102', qty: 1, size: 'M' }
  ]);
  assert.equal(res.ok, true);
  assert.equal(api.ingredients.getById('I_MATCHA').stock, 0);

  const m = api.menu.getById('M102');
  assert.equal(m.maxServings, 0);
  assert.equal(m.ingredientAvailable, false);
  assert.equal(m.inStock, false);
  assert.equal(api.menu.getOutOfStock().some(x => x.id === 'M102'), true);
});

test('Không cho bán ly thứ 2 khi Matcha đã hết', () => {
  const api = fresh();
  api.ingredients.deductOrder('OD_TEST_2', [{ itemId: 'M102', qty: 1, size: 'M' }]);
  const check = api.ingredients.checkItems([{ itemId: 'M102', qty: 1, size: 'M' }]);
  assert.equal(check.ok, false);
  assert.match(check.error, /Bột matcha/);
});

test('Hoàn kho một đơn sẽ mở lại món', () => {
  const api = fresh();
  api.ingredients.deductOrder('OD_TEST_3', [{ itemId: 'M102', qty: 1, size: 'M' }]);
  assert.equal(api.menu.getById('M102').inStock, false);

  const restored = api.ingredients.restoreOrder('OD_TEST_3');
  assert.equal(restored.ok, true);
  assert.equal(api.ingredients.getById('I_MATCHA').stock, 3);
  assert.equal(api.menu.getById('M102').inStock, true);
});

test('Order online trừ kho khi tạo và hoàn kho khi huỷ', () => {
  const api = fresh();
  api.users.seedDemo();
  const customer = api.users.getAll().find(u => u.role === 'customer');
  api.users.setCurrent(customer);

  const order = api.orders.create({
    userId: customer.id,
    items: [{ itemId: 'M102', qty: 1, size: 'M' }],
    customerName: 'Khách Test',
    phone: '0909123456',
    address: 'Quận Gò Vấp'
  });
  assert.ok(order && order.id);
  assert.equal(order.inventoryDeducted, true);
  assert.equal(api.ingredients.getById('I_MATCHA').stock, 0);

  api.orders.cancel(order.id);
  assert.equal(api.ingredients.getById('I_MATCHA').stock, 3);
  assert.equal(api.menu.getById('M102').inStock, true);
});

test('POS trừ kho ngay khi thu tiền', () => {
  const api = fresh();
  api.users.seedDemo();
  const staff = api.users.getAll().find(u => u.role === 'staff');
  api.users.setCurrent(staff);

  const sale = api.pos.createSale({
    items: [{ itemId: 'M102', qty: 1, size: 'M' }],
    paymentMethod: 'cash',
    cashReceived: 100000
  });
  assert.ok(sale && sale.id);
  assert.equal(sale.inventoryDeducted, true);
  assert.equal(api.ingredients.getById('I_MATCHA').stock, 0);
});

test('Nhập thêm Matcha sẽ mở bán lại', () => {
  const api = fresh();
  api.ingredients.deductOrder('OD_TEST_4', [{ itemId: 'M102', qty: 1, size: 'M' }]);
  assert.equal(api.menu.getById('M102').inStock, false);

  const imported = api.ingredients.importStock('I_MATCHA', 3, 'nhập demo');
  assert.equal(imported.ok, true);
  assert.equal(api.ingredients.getById('I_MATCHA').stock, 3);
  assert.equal(api.menu.getById('M102').inStock, true);
});

test('BOM nhiều nguyên liệu: lấy mức tối thiểu', () => {
  const api = fresh();
  const m = api.menu.getById('M003'); // Latte: sữa 200ml (+5%), cà phê 18g (+5%)
  assert.equal(m.inventoryManaged, true);
  assert.equal(m.maxServings, 23); // 5000 / 210 = 23
  const av = api.ingredients.availability('M003');
  assert.equal(av.limiting, 'Sữa tươi');
});

test('Món không có BOM không bị chặn bởi tồn kho', () => {
  const api = fresh();
  const m = api.menu.getById('M501');
  assert.equal(m.inventoryManaged, false);
  assert.equal(m.inStock, true);
  assert.equal(m.maxServings, null);
});

test('Trừ nhiều món trong một đơn: gộp nguyên liệu trước khi kiểm', () => {
  const api = fresh();
  const check = api.ingredients.checkItems([
    { itemId: 'M102', qty: 1, size: 'M' },
    { itemId: 'M003', qty: 1, size: 'M' }
  ]);
  assert.equal(check.ok, true);
  assert.ok(check.need.I_MILK > 100); // 100ml matcha + 210ml latte
  assert.ok(check.need.I_MATCHA >= 3);
});
