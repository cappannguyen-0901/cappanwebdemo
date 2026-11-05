/* Test hiểu người dùng: món vs nhóm món vs số người vs đặt bàn.
   Chạy trong VM Node với đúng thứ tự script như trang thật. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadChat } from './helpers/sandbox.mjs';

const customerCtx = () => {
  const ctx = loadChat();
  ctx.API.users.setCurrent(ctx.API.users.getById('U001'));
  return ctx;
};

test('ItemLookup: số người / đặt bàn / giờ KHÔNG bị coi là tên món', () => {
  const ctx = customerCtx();
  for (const q of ['2 người', '8 người', 'bàn 4 người', 'cho 2 người', '19h tối nay',
                   'ngày mai', 'đặt bàn 2 người', 'mấy giờ mở cửa', 'wifi']) {
    assert.equal(ctx.ItemLookup.resolve(q), null, `${q} phải là null, không phải món`);
  }
});

test('ItemLookup: nhận đúng món có dấu, kể cả câu hỏi giá', () => {
  const ctx = customerCtx();
  const cases = [
    ['trà đào', 'Trà Đào Cam Sả'],
    ['trà đào giá bao nhiêu', 'Trà Đào Cam Sả'],
    ['cà phê sữa đá', 'Cà Phê Sữa Đá'],
    ['sinh tố bơ', 'Sinh Tố Bơ'],
    ['bánh flan', 'Bánh Flan'],
    ['bạc xỉu', 'Bạc Xỉu']
  ];
  for (const [q, name] of cases) {
    const r = ctx.ItemLookup.resolve(q);
    assert.ok(r, `${q}: phải resolve được`);
    assert.equal(r.kind, 'item', `${q}: phải là item`);
    assert.equal(r.item.name, name, `${q}: sai món`);
  }
});

test('ItemLookup: nhận đúng nhóm món và toàn menu', () => {
  const ctx = customerCtx();
  assert.equal(ctx.ItemLookup.resolve('trà').kind, 'category');
  assert.equal(ctx.ItemLookup.resolve('trà').category, 'tea');
  assert.equal(ctx.ItemLookup.resolve('menu trà').category, 'tea');
  assert.equal(ctx.ItemLookup.resolve('cà phê').category, 'coffee');
  assert.equal(ctx.ItemLookup.resolve('sinh tố').category, 'smoothie');
  assert.equal(ctx.ItemLookup.resolve('menu').kind, 'catalog');
  assert.equal(ctx.ItemLookup.resolve('thực đơn').kind, 'catalog');
});

test('ItemLookup: món không có → gợi ý cùng nhóm, không random', () => {
  const ctx = customerCtx();
  const r = ctx.ItemLookup.resolve('trà sữa');
  assert.ok(r);
  assert.equal(r.kind, 'unknown');
  assert.equal(r.category, 'tea');
  assert.ok(r.suggestions.length >= 1);
  for (const m of r.suggestions) {
    assert.equal(m.categoryId, 'tea', `${m.name} phải cùng nhóm trà`);
  }
  const r2 = ctx.ItemLookup.resolve('sinh tố mít');
  assert.equal(r2.kind, 'unknown');
  assert.equal(r2.category, 'smoothie');
});

test('LocalBrain: "2 người"/"8 người" không còn báo "chưa có món"', () => {
  const ctx = customerCtx();
  for (const q of ['2 người', '8 người', 'bàn 4 người']) {
    const r = ctx.LocalBrain.answer(q);
    const text = (r && r.text) || '';
    assert.ok(!/chưa có/i.test(text), `${q}: không được báo chưa có món — nhận: ${text}`);
  }
});

test('LocalBrain: món thật trả đúng tên + giá + thẻ món', () => {
  const ctx = customerCtx();
  const r = ctx.LocalBrain.answer('trà đào giá bao nhiêu');
  assert.ok(r);
  assert.match(r.text, /Trà Đào Cam Sả/);
  assert.match(r.text, /45\.000đ/);
  assert.ok(r.recommendationData && r.recommendationData.items.length === 1);
  assert.equal(r.recommendationData.items[0].id, 'M101');
});

test('LocalBrain: "trà sữa" vẫn báo chưa có nhưng kèm gợi ý trà', () => {
  const ctx = customerCtx();
  const r = ctx.LocalBrain.answer('trà sữa');
  assert.match(r.text, /chưa có/i);
  assert.match(r.text, /trà sữa/i);
  assert.ok(r.recommendationData);
  assert.ok(r.recommendationData.items.length >= 1);
});

test('Đặt bàn: chip "2 người" mở đúng luồng chọn giờ', () => {
  const ctx = customerCtx();
  const sid = 'customer_U001';
  const q = '2 người';
  const res = ctx.AIBrain._draftEngineCore(q, sid, 'customer', ctx.AIInput.process(q, 'customer'));
  assert.ok(res, 'phải có phản hồi');
  assert.equal(res.intent, 'booking');
  assert.match(res.message, /2 người/);
  const draft = ctx.AIBrain._drafts[sid];
  assert.ok(draft);
  assert.equal(draft.kind, 'booking');
  assert.equal(draft.stage, 'ask_time');
  assert.equal(draft.data.guests, 2);
});

test('Đặt bàn: "8 người 19h ngày mai" ra gợi ý bàn đủ 8 chỗ', () => {
  const ctx = customerCtx();
  const sid = 'customer_U001';
  const q = '8 người 19h ngày mai';
  const res = ctx.AIBrain._draftEngineCore(q, sid, 'customer', ctx.AIInput.process(q, 'customer'));
  assert.ok(res);
  assert.equal(res.intent, 'booking');
  assert.match(res.message, /8 người/);
  const draft = ctx.AIBrain._drafts[sid];
  assert.equal(draft.stage, 'confirm');
  assert.ok(draft.seatId);
  const seat = ctx.API.seats.getById(draft.seatId);
  assert.ok(Number(seat.capacity) >= 8, 'bàn gợi ý phải chứa được 8 người');
});

test('Đặt bàn: "bàn 4 người" vào luồng đặt bàn, không phải menu', () => {
  const ctx = customerCtx();
  const sid = 'customer_U001';
  const q = 'bàn 4 người';
  const res = ctx.AIBrain._draftEngineCore(q, sid, 'customer', ctx.AIInput.process(q, 'customer'));
  assert.ok(res);
  assert.equal(res.intent, 'booking');
  assert.equal(ctx.AIBrain._drafts[sid].data.guests, 4);
});

test('Đặt bàn: chỉ nói buổi (tối nay/sáng mai) thì KHÔNG tự điền giờ', () => {
  const ctx = customerCtx();
  const sid = 'customer_U001';
  const q = 'đặt bàn 2 người tối nay';
  const res = ctx.AIBrain._draftEngineCore(q, sid, 'customer', ctx.AIInput.process(q, 'customer'));
  assert.ok(res);
  assert.equal(res.intent, 'booking');
  assert.match(res.message, /giờ cụ thể/i, 'phải hỏi lại giờ, không tự chốt 19:00');
  const draft = ctx.AIBrain._drafts[sid];
  assert.equal(draft.stage, 'ask_time');
  assert.equal(draft.data.guests, 2);
  assert.equal(draft.data.time, null);
});

test('Đặt bàn: giữ "Ngày mai" khi khách bổ sung giờ cụ thể', () => {
  const ctx = customerCtx();
  const sid = 'customer_U001';
  let q = 'đặt bàn 2 người ngày mai';
  ctx.AIBrain._draftEngineCore(q, sid, 'customer', ctx.AIInput.process(q, 'customer'));
  let draft = ctx.AIBrain._drafts[sid];
  assert.equal(draft.stage, 'ask_time');
  assert.equal(draft.data.time, null);
  assert.equal(draft.data.date, 'Ngày mai');

  q = '12h';
  ctx.AIBrain._draftEngineCore(q, sid, 'customer', ctx.AIInput.process(q, 'customer'));
  draft = ctx.AIBrain._drafts[sid];
  assert.equal(draft.data.time, '12:00');
  assert.equal(draft.data.date, 'Ngày mai', 'không được rơi về Hôm nay khi đã nói Ngày mai');
});

test('Pipeline: đặt bàn → 2 người → "tối nay" vẫn hỏi giờ, không tự chốt 19:00', async () => {
  const ctx = customerCtx();
  const sid = 'customer_U001';
  const ask = async q => ctx.AIBrain._streamReplyCore(q, () => {}, {});

  await ask('đặt bàn');
  await ask('2 người');
  const res = await ask('tối nay');
  assert.match(res.message, /giờ cụ thể/i);
  const draft = ctx.AIBrain._drafts[sid];
  assert.equal(draft.stage, 'ask_time');
  assert.equal(draft.data.time, null);
  assert.equal(draft.data.guests, 2);
});

test('Pipeline chat: món / nhóm món / menu / số người trả đúng thẻ', async () => {
  const ctx = customerCtx();
  const ask = async q => ctx.AIBrain._streamReplyCore(q, () => {}, {});

  const item = await ask('trà đào');
  assert.match(item.message, /Trà Đào Cam Sả/);
  assert.match(item.cards || '', /\[UI_MENU\]/);

  const cat = await ask('menu trà');
  assert.match(cat.message, /Trà/);
  assert.match(cat.cards || '', /\[UI_MENU\]/);

  const catalog = await ask('menu');
  assert.match(catalog.cards || '', /\[UI_CATALOG\]/);

  const unknown = await ask('trà sữa');
  assert.match(unknown.message, /chưa có/i);
  assert.match(unknown.cards || '', /\[UI_MENU\]/);

  const party = await ask('2 người');
  assert.match(party.message, /2 người/);
  assert.match(String(party.cards || party.message), /UI_TIME_PICK/);
});

test('Quick replies luôn có label + hành động (không chip rỗng)', () => {
  const ctx = customerCtx();
  for (const [src, intent] of [['kb', null], ['rule', 'booking'], ['rule', 'drink'], ['menu', null]]) {
    const qr = ctx.AIBrain._quickRepliesFor('wifi quán', src, intent);
    if (!qr) continue;
    for (const q of qr) {
      assert.ok(q.label, `chip thiếu label: ${JSON.stringify(q)}`);
      assert.ok(q.text || q.href, `chip thiếu text/href: ${JSON.stringify(q)}`);
    }
  }
});

test('Đặt bàn: đoàn đông hơn sức chứa lớn nhất → báo rõ + hotline', () => {
  const ctx = customerCtx();
  const sid = 'customer_U001';
  const q = 'đặt bàn 20 người';
  const res = ctx.AIBrain._draftEngineCore(q, sid, 'customer', ctx.AIInput.process(q, 'customer'));
  assert.ok(res);
  assert.match(res.message, /tối đa \*\*8 chỗ\*\*/);
  assert.match(res.message, /hotline/);
  assert.equal(ctx.AIBrain._drafts[sid], undefined, 'phải xoá draft để không kẹt');
});

test('Khách chưa đăng nhập: "2 người" được mời đăng nhập, không báo thiếu món', () => {
  const ctx = loadChat();
  const q = '2 người';
  const res = ctx.AIBrain._draftEngineCore(q, 'guest_x', 'guest', ctx.AIInput.process(q, 'guest'));
  assert.ok(res);
  assert.match(res.message, /đăng nhập/i);
  assert.ok(!/chưa có/i.test(res.message));
});

test('Menu: câu hỏi có số lượng vẫn nhận đúng món / món thiếu', () => {
  const ctx = customerCtx();
  const item = ctx.ItemLookup.resolve('cho tôi 2 ly cà phê sữa đá');
  assert.equal(item.kind, 'item');
  assert.equal(item.item.name, 'Cà Phê Sữa Đá');

  const fake = ctx.ItemLookup.resolve('cho 2 ly trà sữa');
  assert.equal(fake.kind, 'unknown');
  assert.match(fake.display, /trà sữa/i);
});

test('Menu: "menu có gì" trả toàn bộ thực đơn', () => {
  const ctx = customerCtx();
  for (const q of ['menu có gì', 'quán có món gì', 'có món gì', 'quán bán gì']) {
    const r = ctx.ItemLookup.resolve(q);
    assert.ok(r, q);
    assert.equal(r.kind, 'catalog', q);
  }
});

test('ItemLookup: không nhầm "sữa chua" thành "sữa", "nước ép" là cả nhóm', () => {
  const ctx = customerCtx();
  const sua = ctx.ItemLookup.resolve('sữa chua cà phê');
  assert.equal(sua.kind, 'item');
  assert.equal(sua.item.name, 'Sữa Chua Cà Phê');

  const juice = ctx.ItemLookup.resolve('nước ép');
  assert.equal(juice.kind, 'category');
  assert.equal(juice.category, 'juice');

  const ask = ctx.ItemLookup.resolve('quán có bán trà sữa không');
  assert.equal(ask.kind, 'unknown');
  assert.equal(ask.display, 'trà sữa');
});

test('Pipeline: "đặt bàn" → chip "8 người" → chọn giờ (đúng ca bug cũ)', async () => {
  const ctx = customerCtx();
  const sid = 'customer_U001';
  ctx.AIBrain._drafts = {};
  ctx.AIBrain._saveDrafts();

  const first = await ctx.AIBrain._streamReplyCore('đặt bàn', () => {}, {});
  assert.match(String(first.cards || first.message), /UI_BOOKING_PLAN/, 'phải mời chọn số người');

  const second = await ctx.AIBrain._streamReplyCore('8 người', () => {}, {});
  assert.match(String(second.cards || second.message), /UI_TIME_PICK/, 'phải chuyển sang chọn giờ');
  assert.match(second.message, /8 người/);
  assert.ok(!/chưa có/i.test(second.message), 'không được báo chưa có món');
  assert.equal(ctx.AIBrain._drafts[sid].data.guests, 8);
});

test('Đặt bàn: viết tắt "8ng" vẫn hiểu là 8 người', () => {
  const ctx = customerCtx();
  const sid = 'customer_U001';
  const q = '8ng';
  const res = ctx.AIBrain._draftEngineCore(q, sid, 'customer', ctx.AIInput.process(q, 'customer'));
  assert.ok(res);
  assert.equal(res.intent, 'booking');
  assert.equal(ctx.AIBrain._drafts[sid].data.guests, 8);
});

test('ItemLookup: tính từ vị không bị coi là món, "sữa chua" vẫn là món', () => {
  const ctx = customerCtx();
  for (const q of ['chua', 'đắng', 'ít ngọt', 'mát lạnh', 'trà chua']) {
    assert.equal(ctx.ItemLookup.resolve(q), null, `${q} phải để tầng tư vấn xử lý`);
  }
  const sua = ctx.ItemLookup.resolve('sữa chua');
  assert.equal(sua.kind, 'item');
  assert.equal(sua.item.name, 'Sữa Chua Cà Phê');
});

test('Combo: hiểu "combo", "combo sáng", "combo trà chiều" và trả thẻ UI_COMBO', () => {
  const ctx = customerCtx();
  const all = ctx.ItemLookup.resolve('combo');
  assert.equal(all.kind, 'combo');
  assert.equal(all.combos.length, 3);

  const sang = ctx.ItemLookup.resolve('combo sáng');
  assert.equal(sang.kind, 'combo');
  assert.equal(sang.combos.length, 1);
  assert.match(sang.combos[0].name, /Sáng/);

  const chieu = ctx.ItemLookup.resolve('combo trà chiều');
  assert.equal(chieu.combos[0].name, 'Combo Trà Chiều');

  const rep = ctx.AIBrain._menuReply(sang);
  assert.match(rep.message, /combo/i);
  assert.match(rep.cards, /\[UI_COMBO\]/);
});

test('LLM grounding: system prompt chứa menu + combo + giá thật', () => {
  const ctx = customerCtx();
  const p = ctx.AIBrain._buildSystemPrompt('customer');
  assert.match(p, /\[MENU THẬT/);
  assert.match(p, /\[COMBO THẬT\]/);
  assert.match(p, /Cà Phê Sữa Đá – 35k/);
  assert.match(p, /Combo Sáng Tỉnh Táo: 52k/);
  // Prompt không được rỗng và không quá phình to
  assert.ok(p.length > 800 && p.length < 6000, 'prompt dài bất thường: ' + p.length);
});

test('Follow-up: "món này giá / còn không / thông tin" bám đúng món vừa xem', async () => {
  const ctx = customerCtx();
  const ask = q => ctx.AIBrain._streamReplyCore(q, () => {}, {});

  const first = await ask('trà đào');
  assert.match(first.message, /Trà Đào Cam Sả/);

  const price = await ask('món này giá bao nhiêu');
  assert.match(price.message, /45\.000đ/);
  assert.match(price.cards || '', /\[UI_MENU\]/);

  const stock = await ask('món này còn không');
  assert.match(stock.message, /còn hàng/i);

  const info = await ask('thông tin món này');
  assert.match(info.message, /Trà Đào Cam Sả/);

  // Không được hijack khi người dùng hỏi món khác
  const other = await ask('trà sữa giá bao nhiêu');
  assert.match(other.message, /chưa có/i);
});

test('Greeting theo trang: booking/menu/cart gợi ý đúng việc', () => {
  const ctx = customerCtx();
  const titles = [];
  for (const page of ['booking', 'menu', 'cart', 'index']) {
    ctx.document.body.dataset.page = page;
    const g = ctx.LocalBrain.getSmartGreeting();
    assert.match(g, /\[UI_WELCOME\]/);
    const json = JSON.parse(g.match(/\[UI_WELCOME\]([\s\S]*?)\[\/UI_WELCOME\]/)[1]);
    titles.push(json.title);
    if (page === 'booking') assert.ok(json.options.some(o => /2 người/.test(o.label)));
    if (page === 'menu') assert.ok(json.options.some(o => /Combo/.test(o.label)));
    if (page === 'cart') assert.ok(json.options.some(o => /Thanh toán/.test(o.label)));
  }
  assert.equal(new Set(titles).size, 4, 'mỗi trang phải có lời mời khác nhau');
});
