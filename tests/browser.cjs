/* eslint-env node */
// Requires Playwright and Chromium; use the built static site, never production.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');
const base = process.env.BMS_TEST_URL || 'http://127.0.0.1:8081';
const csp = fs.readFileSync('netlify.toml', 'utf8').match(/Content-Security-Policy = "([^"]+)"/)[1];
function pages(dir = '.') {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e =>
    e.name.startsWith('.') || e.name === 'node_modules' ? [] : e.isDirectory() ? pages(dir + '/' + e.name) : e.name.endsWith('.html') ? [dir + '/' + e.name] : []);
}
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  let checks = 0;
  async function context(width = 390, saved) {
    const c = await browser.newContext({ viewport: { width, height: 844 }, serviceWorkers: 'block' });
    if (saved) await c.addInitScript(v => { try { localStorage.setItem('bms_cookie_consent', v); } catch (_) { /* about:blank has no storage */ } }, saved);
    const errors = [];
    const measures = [];
    await c.route('**/*', async route => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.origin === base) {
        const response = await route.fetch();
        await route.fulfill({ response, headers: { ...response.headers(), 'content-security-policy': csp,
          'content-security-policy-report-only': "require-trusted-types-for 'script'; trusted-types default;" } });
      } else {
        if (/\/gtag\/js|\/gtm.js|clarity.ms\/tag\//.test(url.href)) measures.push(url.href);
        // Do not send audit traffic or conversions to Google/Microsoft.
        await route.fulfill({ status: 200, contentType: request.resourceType() === 'stylesheet' ? 'text/css' : 'application/javascript', body: '' });
      }
    });
    c.on('page', p => {
      p.on('pageerror', e => errors.push(e.message));
      p.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
      p.on('response', r => { if (r.url().startsWith(base) && r.status() >= 400) errors.push(r.status() + ' ' + r.url()); });
    });
    return { c, errors, measures };
  }
  try {
    const { c, errors, measures } = await context();
    const p = await c.newPage();
    await p.goto(base + '/contact/?consent=granted&email=private@example.org');
    assert.equal(await p.evaluate(() => window.BMSAnalytics.allowed()), false);
    assert.equal(measures.length, 0);
    const bounds = await p.locator('#cookie-banner').boundingBox();
    assert.ok(bounds.y >= 0 && bounds.y + bounds.height <= 844);
    await p.locator('#cookie-decline').click();
    assert.equal(await p.locator('#cookie-banner').count(), 0);
    await p.reload();
    assert.equal(measures.length, 0);
    // Contacts work while analytics is refused: no preventDefault from site code.
    assert.equal(await p.locator('.hero a[href^="tel:"]').first().getAttribute('href'), 'tel:+33646005642');
    assert.equal(await p.evaluate(() => {
      let preventedBySite;
      document.addEventListener('click', e => { preventedBySite = e.defaultPrevented; e.preventDefault(); }, { once: true });
      const e = new MouseEvent('click', { bubbles: true, cancelable: true });
      document.querySelector('.hero a[href^="tel:"]').dispatchEvent(e);
      return preventedBySite;
    }), false);
    assert.equal(await p.evaluate(() => window.dataLayer.filter(x => x[0] === 'event').length), 0);
    await p.locator('.manage-cookies').first().click();
    assert.equal(await p.locator('#cookie-decline').evaluate(e => document.activeElement === e), true);
    await p.locator('#cookie-accept').click();
    await p.waitForFunction(() => document.querySelectorAll('#bms-google-tag,#bms-gtm,#bms-clarity').length === 3);
    assert.equal(measures.length, 3);
    const clickEvents = async (url, selector, expected) => {
      await p.goto(base + url);
      await p.evaluate(() => {
        window.dataLayer.length = 0;
        document.addEventListener('click', e => e.preventDefault(), true);
      });
      await p.locator(selector).first().evaluate(e => e.click());
      const events = await p.evaluate(() => window.dataLayer.filter(x => x[0] === 'event').map(x => [x[1], x[2]]));
      assert.deepEqual(events.map(x => x[0]), expected);
      assert.ok(!JSON.stringify(events).includes('@'));
      assert.ok(!JSON.stringify(events).includes('wa.me'));
      assert.ok(events.every(x => !('page_location' in x[1]) && !('event_label' in x[1])));
      checks++;
    };
    await clickEvents('/contact/', 'a[href^="tel:"]', ['phone_click', 'lead_contact']);
    await clickEvents('/contact/', 'a[href^="mailto:contact@"]', ['email_click', 'lead_contact']);
    await clickEvents('/contact/', 'a[href^="https://wa.me/"]', ['whatsapp_click', 'lead_contact']);
    await clickEvents('/contact-nfc/', '#nfc-whatsapp', ['whatsapp_click', 'lead_contact']);
    await clickEvents('/contact-nfc/', '#nfc-email', ['email_click', 'lead_contact']);
    await clickEvents('/ventousage-versailles/', 'a[href="mailto:service.urbanisme@versailles.fr"]', []);
    await p.goto(base + '/contact/?success=1');
    assert.equal(await p.getByText('Votre demande a été envoyée.', { exact: false }).count(), 0);
    await p.evaluate(() => { document.cookie = '_ga=test; path=/'; });
    await p.locator('.manage-cookies').first().click();
    await Promise.all([p.waitForNavigation(), p.locator('#cookie-decline').click()]);
    assert.equal(await p.evaluate(() => window.BMSAnalytics.allowed()), false);
    assert.equal(await p.locator('#bms-google-tag,#bms-gtm,#bms-clarity').count(), 0);
    assert.ok(!await p.evaluate(() => document.cookie.includes('_ga=')));
    assert.deepEqual(errors, []);
    await c.close();

    // Small mobile viewport: banner stays accessible, refuse is as easy as accept,
    // and changing a stored choice never creates duplicate third-party loaders.
    const { c: small, errors: smallErrors, measures: smallMeasures } = await context(320);
    const mobile = await small.newPage();
    await mobile.setViewportSize({ width: 320, height: 568 });
    await mobile.goto(base + '/');
    assert.equal(await mobile.locator('#cookie-banner').count(), 1);
    assert.equal(smallMeasures.length, 0);
    assert.equal(await mobile.evaluate(() => {
      const b = document.getElementById('cookie-banner').getBoundingClientRect();
      return b.left >= 0 && b.right <= innerWidth &&
        b.top >= 0 && b.bottom <= innerHeight;
    }), true, '320px mobile: cookie controls fit within the screen');
    assert.equal(await mobile.locator('#cookie-decline').isVisible(), true);
    assert.equal(await mobile.locator('#cookie-accept').isVisible(), true);
    await mobile.locator('#cookie-decline').focus();
    await mobile.keyboard.press('Enter');
    assert.equal(await mobile.locator('#cookie-banner').count(), 0);
    assert.equal(await mobile.evaluate(() => window.BMSAnalytics.allowed()), false);
    assert.equal(smallMeasures.length, 0);
    await mobile.reload();
    assert.equal(await mobile.locator('#cookie-banner').count(), 0);
    await mobile.locator('.manage-cookies').first().click();
    assert.equal(await mobile.locator('#cookie-banner').count(), 1);
    await mobile.locator('#cookie-accept').focus();
    await mobile.keyboard.press('Enter');
    await mobile.waitForFunction(() => document.querySelectorAll('#bms-google-tag,#bms-gtm,#bms-clarity').length === 3);
    assert.equal(smallMeasures.length, 3);
    await mobile.locator('.manage-cookies').first().click();
    await mobile.locator('#cookie-accept').click();
    assert.equal(smallMeasures.length, 3, 'Reaccept must not duplicate trackers');
    assert.deepEqual(smallErrors, []);
    await small.close();

    // Check every document on narrow mobile and representative routes on desktop.
    for (const width of [360, 1280]) {
      const { c, errors } = await context(width, 'denied');
      const p = await c.newPage();
      // Capture layout shifts from the first paint, before page scripts run.
      // Diagnostic only: third-party calls are mocked in this test environment.
      if (width === 360) {
        await p.addInitScript(() => {
          window.__bmsLayoutShifts = [];
          try {
            const observer = new PerformanceObserver(list => {
              for (const entry of list.getEntries()) {
                if (entry.hadRecentInput) continue;
                window.__bmsLayoutShifts.push({
                  value: entry.value,
                  sources: (entry.sources || []).slice(0, 5).map(source => {
                    const node = source.node;
                    if (!node) return '(detached)';
                    const id = node.id ? '#' + node.id : '';
                    const cls = node.classList ? '.' + [...node.classList].slice(0, 3).join('.') : '';
                    return (node.tagName || 'node').toLowerCase() + id + cls;
                  })
                });
              }
            });
            observer.observe({ type: 'layout-shift', buffered: true });
          } catch (_) { /* Browser does not expose layout-shift entries. */ }
        });
      }
      const paths = width === 360 ? pages().map(f => '/' + f.replace(/^\.\//, '')) :
        ['/', '/contact/', '/contact-direct/', '/contact-nfc/', '/services/', '/cantine-catering/', '/logistique-val-d-oise/', '/transport-materiel-audiovisuel-paris/', '/infos-ia/', '/en/'];
      for (const path of paths) {
        await p.goto(base + path);
        await p.waitForTimeout(80);
        if (width === 360 && (path === '/' || path === '/index.html')) {
          // Let font swaps and deferred DOM updates settle before reporting.
          await p.waitForTimeout(1600);
          const shifts = await p.evaluate(() => window.__bmsLayoutShifts || []);
          const cls = shifts.reduce((total, entry) => total + entry.value, 0);
          const top = [...shifts].sort((a, b) => b.value - a.value).slice(0, 5);
          console.log('[CLS diagnostic] mobile ' + path + ': ' + cls.toFixed(4) +
            ', sources=' + JSON.stringify(top));
        }
        assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, path + ': overflow');
        assert.ok(await p.evaluate(() => document.styleSheets.length > 0), path + ': styles');
        assert.equal(await p.locator('form').count(), 0, path + ': no unverified form');
        // Trigger lazy loading so broken supporting images are caught too.
        await p.evaluate(() => { document.querySelectorAll('img').forEach(i => { i.loading = 'eager'; }); });
        await p.waitForFunction(() => [...document.images].every(i => i.complete));
        assert.deepEqual(await p.evaluate(() => [...document.images].filter(i => !i.naturalWidth).map(i => i.src)), [], path);
        if ((path === '/' || path === '/index.html') && width === 360) {
          await p.locator('#hamburger').click();
          assert.equal(await p.locator('#hamburger').getAttribute('aria-expanded'), 'true');
          await p.keyboard.press('Escape');
          assert.equal(await p.locator('#hamburger').getAttribute('aria-expanded'), 'false');
        }
        checks++;
      }
      assert.deepEqual(errors, []);
      await c.close();
    }
    console.log('PASS: consent lifecycle, six contact cases and ' + (checks - 6) + ' responsive page checks; no local HTTP/console errors.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
