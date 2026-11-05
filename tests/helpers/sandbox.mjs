/* Sandbox Node cho các script cổ điển của CAPPAN (không cần trình duyệt).
   Nạp đúng thứ tự script như trang HTML thật. */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export function memoryStorage() {
  const m = new Map();
  return {
    getItem: k => (m.has(String(k)) ? m.get(String(k)) : null),
    setItem: (k, v) => { m.set(String(k), String(v)); },
    removeItem: k => { m.delete(String(k)); },
    clear: () => m.clear(),
    key: i => [...m.keys()][i] ?? null,
    get length() { return m.size; }
  };
}

const noop = () => {};

export function createContext() {
  const local = memoryStorage();
  const session = memoryStorage();
  const windowObj = {
    addEventListener: noop,
    removeEventListener: noop,
    dispatchEvent: () => true,
    location: { href: '', pathname: '/index.html', search: '', replace: noop },
    matchMedia: () => ({ matches: false, addEventListener: noop }),
    localStorage: local,
    sessionStorage: session,
    setTimeout,
    clearTimeout
  };
  const ctx = {
    console: { log: noop, info: noop, warn: noop, error: noop, debug: noop },
    window: windowObj,
    document: {
      getElementById: () => null,
      createElement: () => ({ style: {}, dataset: {}, classList: { add: noop, remove: noop }, appendChild: noop }),
      addEventListener: noop,
      querySelector: () => null,
      querySelectorAll: () => [],
      documentElement: { classList: { add: noop, remove: noop }, dataset: {}, setAttribute: noop, getAttribute: () => null },
      body: { dataset: {}, appendChild: noop }
    },
    localStorage: local,
    sessionStorage: session,
    setTimeout, clearTimeout, setInterval, clearInterval,
    Date, JSON, Promise, Math, Object, Array, String, Number, Boolean,
    parseInt, parseFloat, isFinite, isNaN, RegExp, Set, Map, WeakMap, Error,
    performance, queueMicrotask,
    fetch: () => Promise.reject(new Error('offline test')),
    AbortController, TextEncoder, TextDecoder,
    crypto: globalThis.crypto,
    structuredClone
  };
  vm.createContext(ctx);
  return ctx;
}

export function loadFiles(ctx, files) {
  const code = files.map(f => fs.readFileSync(path.join(ROOT, 'js', f), 'utf8')).join('\n;\n');
  vm.runInContext(code, ctx);
  /* Các khai báo `const` ở cấp script không tự thành thuộc tính của context. */
  vm.runInContext(
    ';this.API=(typeof API!=="undefined")?API:undefined;' +
    'this.Auth=(typeof Auth!=="undefined")?Auth:undefined;' +
    'this.KB=(typeof KB!=="undefined")?KB:undefined;' +
    'this.CappanConfig=(typeof CappanConfig!=="undefined")?CappanConfig:undefined;' +
    'this.CappanHash=(typeof CappanHash!=="undefined")?CappanHash:undefined;' +
    'this.Pricing=(typeof Pricing!=="undefined")?Pricing:undefined;' +
    'this.BookingRules=(typeof BookingRules!=="undefined")?BookingRules:undefined;' +
    'this.Policy=(typeof Policy!=="undefined")?Policy:undefined;' +
    'this.Audit=(typeof Audit!=="undefined")?Audit:undefined;' +
    'this.SEED_MENU_ITEMS=(typeof SEED_MENU_ITEMS!=="undefined")?SEED_MENU_ITEMS:undefined;' +
    'this.STORAGE_KEYS=(typeof STORAGE_KEYS!=="undefined")?STORAGE_KEYS:undefined;' +
    'this.LocalBrain=(typeof LocalBrain!=="undefined")?LocalBrain:undefined;' +
    'this.AIBrain=(typeof AIBrain!=="undefined")?AIBrain:undefined;' +
    'this.AIBrainLegacy=(typeof AIBrainLegacy!=="undefined")?AIBrainLegacy:undefined;' +
    'this.ItemLookup=(typeof ItemLookup!=="undefined")?ItemLookup:undefined;' +
    'this.AIInput=(typeof AIInput!=="undefined")?AIInput:undefined;' +
    'this.AIOutput=(typeof AIOutput!=="undefined")?AIOutput:undefined;' +
    'this.KBFast=(typeof KBFast!=="undefined")?KBFast:undefined;',
    ctx
  );
  return ctx;
}

/* Nạp đủ tầng dữ liệu + API, không nạp DOM/AI. */
export function loadApi() {
  const ctx = createContext();
  loadFiles(ctx, [
    'data/schema.js',
    'core.js',
    'data/seed.js',
    'data/recipes.js',
    'data/kb.js',
    'data/promotions.js',
    'api/index.js',
    'auth.js'
  ]);
  return ctx;
}

export function loadAi() {
  const ctx = loadApi();
  loadFiles(ctx, [
    'main.js',
    'ai/ai-input.js',
    'ai/ai-output.js',
    'ai/brain-legacy.js',
    'ai/brain.js'
  ]);
  return ctx;
}

/* Nạp đủ chuỗi chat như trang thật (để test routing món/đặt bàn/chat-interactions). */
export function loadChat() {
  const ctx = loadApi();
  loadFiles(ctx, [
    'ai/ai-input.js',
    'ai/ai-output.js',
    'ai/item-lookup.js',
    'ai/injection-guard.js',
    'ai/multi-intent-splitter.js',
    'ai/intent-authorization.js',
    'ai/emotional-handler.js',
    'ai/user-memory.js',
    'ai/brain-legacy.js',
    'ai/brain.js',
    'main.js',
    'ai/proactive.js',
    'ai/handover.js',
    'ai/chat-interactions.js'
  ]);
  return ctx;
}
