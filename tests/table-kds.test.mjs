import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadApi } from './helpers/sandbox.mjs';

function fresh() {
  const ctx = loadApi();
  return ctx.API;
}

test('TableSession: mở phiên, join lại cùng bàn, bill cộng dồn', () => {
  const api = fresh();
  const a = api.tableSessions.join('A1');
  assert.equal(a.ok, true);
  assert.equal(a.session.tableId, 'A1');

  const order = api.orders.create({
    serviceType: 'table_service',
    source: 'qr_table',
    tableId: 'A1',
    tableSessionId: a.session.id,
    paymentMethod: 'mock_qr',
    paymentStatus: 'paid',
    items: [{ itemId: 'M003', qty: 1, size: 'M' }]
  });
  assert.ok(order && order.id);
  assert.equal(order.serviceType, 'table_service');
  assert.equal(order.source, 'qr_table');
  assert.equal(order.tableSessionId, a.session.id);
  assert.match(order.kitchenCode, /^A\d+$/);
  assert.equal(order.shipping, 0);
  assert.equal(order.total, 55000);

  const b = api.tableSessions.join('A1');
  assert.equal(b.existing, true);
  assert.equal(b.session.id, a.session.id);

  const bill = api.tableSessions.getBill(a.session.id);
  assert.equal(bill.orderCount, 1);
  assert.ok(bill.total > 0);
});

test('KDS queue + update trạng thái bếp', () => {
  const api = fresh();
  const joined = api.tableSessions.join('A2');
  const order = api.orders.create({
    serviceType: 'table_service',
    source: 'qr_table',
    tableId: 'A2',
    tableSessionId: joined.session.id,
    paymentMethod: 'mock_qr',
    items: [{ itemId: 'M003', qty: 1, size: 'M' }]
  });
  const queue = api.orders.getKdsQueue();
  assert.equal(queue.some(o => o.id === order.id), true);

  api.orders.updateKitchen(order.id, 'preparing');
  assert.equal(api.orders.getById(order.id).kitchenStatus, 'preparing');

  api.orders.updateKitchen(order.id, 'ready');
  assert.equal(api.orders.getById(order.id).kitchenStatus, 'ready');

  api.orders.updateKitchen(order.id, 'served');
  assert.equal(api.orders.getById(order.id).kitchenStatus, 'served');
  assert.equal(api.orders.getKdsQueue().some(o => o.id === order.id), false);
});

test('TableSession settle: đóng phiên và đánh dấu đã thanh toán', () => {
  const api = fresh();
  const joined = api.tableSessions.join('A3');
  const order = api.orders.create({
    serviceType: 'table_service',
    source: 'qr_table',
    tableId: 'A3',
    tableSessionId: joined.session.id,
    paymentMethod: 'mock_qr',
    items: [{ itemId: 'M003', qty: 1, size: 'M' }]
  });
  const settled = api.tableSessions.settle(joined.session.id);
  assert.equal(settled.ok, true);
  assert.ok(settled.total > 0);
  assert.equal(api.tableSessions.getById(joined.session.id).status, 'closed');
  assert.equal(api.orders.getById(order.id).paymentStatus, 'settled');
});

test('POS sale vẫn vào KDS với source counter_pos', () => {
  const api = fresh();
  api.users.seedDemo();
  const staff = api.users.getAll().find(u => u.role === 'staff');
  api.users.setCurrent(staff);
  const sale = api.pos.createSale({
    items: [{ itemId: 'M003', qty: 1, size: 'M' }],
    paymentMethod: 'cash',
    cashReceived: 100000
  });
  assert.equal(sale.serviceType, 'counter_pickup');
  assert.equal(sale.source, 'counter_pos');
  assert.equal(sale.kitchenStatus, 'submitted');
  assert.equal(api.orders.getKdsQueue().some(o => o.id === sale.id), true);
});

test('KDS tự cấp mã A.. cho order cũ thiếu kitchenCode', () => {
  const api = fresh();
  const order = api.orders.create({
    serviceType: 'takeaway',
    source: 'web',
    paymentMethod: 'cash',
    items: [{ itemId: 'M003', qty: 1, size: 'M' }]
  });
  api.orders.update(order.id, { kitchenCode: null });
  const q = api.orders.getKdsQueue();
  const found = q.find(o => o.id === order.id);
  assert.ok(found);
  assert.match(found.kitchenCode, /^A\d{2}$/);
});
