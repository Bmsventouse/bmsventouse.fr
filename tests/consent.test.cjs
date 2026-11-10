/* eslint-env node */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const bootstrap = fs.readFileSync('js/consent.js', 'utf8');
function machine(saved, search = '', timestamp) {
  const storage = new Map(saved ? [['bms_cookie_consent', saved]] : []);
  if (timestamp !== undefined) storage.set('bms_cookie_consent_date', String(timestamp));
  const scripts = [];
  const cookies = [];
  let reloads = 0;
  const location = { origin: 'https://bmsventouse.fr', hostname: 'bmsventouse.fr',
    pathname: '/contact/', search, href: 'https://bmsventouse.fr/contact/' + search,
    reload: () => { reloads++; } };
  const document = { head: { appendChild: s => scripts.push(s) }, referrer: 'https://example.org/?email=private@example.org',
    getElementById: id => scripts.find(s => s.id === id), createElement: () => ({}) };
  Object.defineProperty(document, 'cookie', { get: () => '_ga=sample; _clck=sample; business=keep', set: v => { cookies.push(v); } });
  const window = {};
  const context = vm.createContext({ window, document, location, URL, URLSearchParams, Date,
    localStorage: { getItem: k => storage.get(k) || null, setItem: (k, v) => storage.set(k, v) } });
  vm.runInContext(bootstrap, context);
  return { window, scripts, cookies, storage, location, reloads: () => reloads,
    commands: () => window.dataLayer.filter(x => x[0]).map(x => Array.from(x)),
    events: () => window.dataLayer.filter(x => x[0] === 'event') };
}
test('first visit: denied default, no third-party script or event', () => {
  const m = machine();
  assert.equal(m.commands()[0][2].analytics_storage, 'denied');
  assert.equal(m.scripts.length, 0);
  m.window.BMSAnalytics.track('phone_click');
  assert.equal(m.events().length, 0);
});
test('a saved refusal and public consent query cannot authorize measurement', () => {
  const m = machine('denied', '?consent=granted');
  assert.equal(m.window.BMSAnalytics.allowed(), false);
  assert.equal(m.scripts.length, 0);
});
test('saved consent updates the default before any config; each loader is unique', () => {
  const m = machine('granted');
  assert.equal(m.commands().slice(0, 3).map(x => x[0] + ':' + (x[0] === 'js' ? 'date' : x[1])).join(','), 'consent:default,consent:update,js:date');
  assert.equal(m.commands()[1][2].analytics_storage, 'granted');
  m.window.BMSAnalytics.setConsent(true);
  assert.equal(m.scripts.length, 3);
  assert.equal(new Set(m.scripts.map(x => x.id)).size, 3);
});
test('withdrawal denies, clears measurement cookies, stops Clarity and reloads', () => {
  const m = machine('granted');
  m.window.BMSAnalytics.setConsent(false);
  assert.equal(m.window.BMSAnalytics.allowed(), false);
  assert.equal(m.reloads(), 1);
  assert.equal(m.storage.get('bms_cookie_consent'), 'denied');
  assert.ok(m.cookies.some(x => x.startsWith('_ga=')));
  assert.ok(!m.cookies.some(x => x.startsWith('business=')));
  assert.ok(m.window.clarity.q.some(x => x[0] === 'stop'));
  m.window.BMSAnalytics.track('lead_contact', { contact_method: 'phone' });
  assert.equal(m.events().length, 0);
});
test('event allowlist excludes raw coordinates, URLs, free text and confirmed-lead names', () => {
  const m = machine('granted', '?email=private@example.org#private');
  m.window.BMSAnalytics.track('lead_contact', { contact_method: 'email', lead_origin: 'site', email: 'private@example.org', phone: '0612345678', details: 'private', page_location: 'secret' });
  m.window.BMSAnalytics.track('qualified_lead', { email: 'private@example.org' });
  assert.equal(m.events().length, 1);
  const data = m.events()[0][2];
  assert.deepEqual(Object.keys(data).sort(), ['contact_method', 'lead_origin', 'lead_stage']);
  assert.equal(data.lead_stage, 'contact_intent');
  const config = m.commands().find(x => x[0] === 'config')[2];
  assert.equal(config.page_location, 'https://bmsventouse.fr/contact/');
  assert.equal(config.page_referrer, 'https://example.org/');
});
test('validated click identifiers remain available for advertising attribution', () => {
  const m = machine('granted', '?gclid=ExampleClickId123&utm_source=private@example.org');
  const config = m.commands().find(x => x[0] === 'config')[2];
  assert.equal(config.page_location, 'https://bmsventouse.fr/contact/?gclid=ExampleClickId123');
});
test('contact classification excludes authorities, lookalike hosts and third-party phones', () => {
  const source = fs.readFileSync('js/script.js', 'utf8');
  const classifier = source.slice(source.indexOf('function getBMSContactMethod('), source.indexOf('function trackLeadContact('));
  const context = vm.createContext({ URL, location: { origin: 'https://bmsventouse.fr' } });
  vm.runInContext(classifier, context);
  for (const [url, expected] of [
    ['tel:+33646005642', 'phone'], ['mailto:contact@bmsventouse.fr?body=private', 'email'],
    ['https://wa.me/33646005642?text=private', 'whatsapp'],
    ['mailto:service.urbanisme@versailles.fr', null], ['tel:+33640982156', null],
    ['https://wa.me.evil.example/33646005642', null], ['https://wa.me/33123456789', null]
  ]) assert.equal(context.getBMSContactMethod(url), expected, url);
});
test('every HTML page initializes consent once, without a direct Google loader', () => {
  function walk(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e =>
    e.name.startsWith('.') || e.name === 'node_modules' ? [] : e.isDirectory() ? walk(dir + '/' + e.name) : e.name.endsWith('.html') ? [dir + '/' + e.name] : []); }
  const pages = walk('.');
  assert.equal(pages.length, 73);
  for (const page of pages) {
    const html = fs.readFileSync(page, 'utf8');
    assert.equal((html.match(/src="\/js\/consent.js\?/g) || []).length, 1, page);
    assert.ok(!html.includes('googletagmanager.com/gtag/js'), page);
    assert.ok(!html.includes('/images/hero-background-custom.jpg'), page);
    assert.ok(!html.includes('/images/service-cantine.jpg'), page);
    for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) assert.doesNotThrow(() => JSON.parse(match[1]), page);
  }
});

test('expired, future or invalid consent dates require a fresh choice', () => {
  for (const timestamp of [Date.now() - 181 * 86400000, Date.now() + 86400000, 'invalid']) {
    const m = machine('granted', '', timestamp);
    assert.equal(m.window.BMSAnalytics.hasChoice(), false);
    assert.equal(m.scripts.length, 0);
  }
});
