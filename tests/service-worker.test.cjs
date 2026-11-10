/* eslint-env node */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function worker(online) {
  const listeners = {};
  const stored = new Map([['https://bmsventouse.fr/js/script.js', new Response('old')]]);
  const deleted = [];
  const cache = { put: async (request, value) => stored.set(request.url, value), addAll: async () => {} };
  const context = vm.createContext({ URL, Response,
    self: { location: { origin: 'https://bmsventouse.fr' }, addEventListener: (name, fn) => { listeners[name] = fn; }, clients: { claim: async () => {} } },
    caches: { open: async () => cache, match: async request => stored.get(request.url || request),
      keys: async () => ['bms-cache-v2-old', 'business-cache', 'bms-cache-v3'], delete: async name => deleted.push(name) },
    fetch: online });
  vm.runInContext(fs.readFileSync('sw.js', 'utf8'), context);
  return { listeners, stored, deleted, get: async (url, method = 'GET') => {
    let result;
    listeners.fetch({ request: { url, method, mode: 'same-origin' }, respondWith: value => { result = value; } });
    return result;
  } };
}
test('online clients get fresh JS rather than the offline cache, with HTTP revalidation', async () => {
  const w = worker(async (_, options) => { assert.equal(options.cache, 'no-cache'); return new Response('fresh'); });
  assert.equal(await (await w.get('https://bmsventouse.fr/js/script.js')).text(), 'fresh');
  assert.equal(await w.stored.get('https://bmsventouse.fr/js/script.js').text(), 'fresh');
});
test('offline clients retain access to previously cached assets', async () => {
  const w = worker(async () => { throw new Error('offline'); });
  assert.equal(await (await w.get('https://bmsventouse.fr/js/script.js')).text(), 'old');
});
test('404 responses do not poison the cache; external calls and submissions are untouched', async () => {
  const w = worker(async () => new Response('missing', { status: 404 }));
  assert.equal((await w.get('https://bmsventouse.fr/missing.js')).status, 404);
  assert.equal(w.stored.has('https://bmsventouse.fr/missing.js'), false);
  assert.equal(await w.get('https://other.example/js/script.js'), undefined);
  assert.equal(await w.get('https://bmsventouse.fr/contact/', 'POST'), undefined);
});
test('activation removes only obsolete BMS caches', async () => {
  const w = worker(async () => new Response('fresh'));
  let activation;
  w.listeners.activate({ waitUntil: value => { activation = value; } });
  await activation;
  assert.deepEqual(w.deleted, ['bms-cache-v2-old']);
});
