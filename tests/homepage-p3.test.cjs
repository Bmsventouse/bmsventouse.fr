/* Homepage P3 guardrails — no browser dependencies. */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const html = read('index.html');

test('Homepage SEO metadata and real image are consistent', () => {
  assert.match(html, /<link rel="canonical" href="https:\/\/bmsventouse\.fr\/"/);
  assert.match(html, /<meta name="description" content="[^"]+"/);
  assert.match(html, /<meta property="og:image" content="https:\/\/bmsventouse\.fr\/images\/hero-background-custom-1920\.jpg"/);
  assert.match(html, /<meta name="twitter:image" content="https:\/\/bmsventouse\.fr\/images\/hero-background-custom-1920\.jpg"/);
  assert.match(html, /fetchpriority="high"/);
});

test('Homepage remains navigable with a single H1 and unique IDs', () => {
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  assert.equal(ids.length, new Set(ids).size);
  for (const name of ['services', 'ventousage-coeur-metier', 'pourquoi-bms', 'comment-ca-marche', 'references', 'zones-desservies', 'faq', 'contact']) {
    assert.ok(ids.includes(name), 'Missing section: ' + name);
  }
});

test('Both quote CTAs keep useful prefilled contact methods', () => {
  assert.equal((html.match(/href="mailto:contact@bmsventouse\.fr\?subject=/g) || []).length, 2);
  assert.ok((html.match(/href="https:\/\/wa\.me\/33646005642\?text=/g) || []).length >= 2);
  assert.doesNotMatch(html, /hero-contact-fallback/);
});

test('Animations preserve essential content without JS or observer support', () => {
  const css = read('css/animations.css');
  const script = read('js/script.js');
  assert.match(css, /\.animated-item\s*\{\s*opacity:\s*1;/);
  assert.match(css, /\.js-animations \.animated-item:not\(\.is-visible\)/);
  assert.match(script, /typeof IntersectionObserver === 'undefined'/);
  assert.match(script, /classList\.add\('js-animations'\)/);
});

test('Generated stylesheet is an exact concatenation of maintained modules', () => {
  const modules = ['base','layout','components','faq','animations','sections','pages','overrides'];
  assert.equal(read('css/style.css'), modules.map(n => read('css/' + n + '.css')).join(''));
});

test('Homepage lastmod reflects the preview update without changing other URLs', () => {
  assert.match(read('sitemap.xml'), /<loc>https:\/\/bmsventouse\.fr\/</loc>\s*<lastmod>2026-11-10</);
});

test('Structured service data avoids false physical-local presence and unverified creation date', () => {
  const blocks = [...html.matchAll(/<script type="application\\/ld\\+json">([\\s\\S]*?)<\\/script>/g)].map(m => JSON.parse(m[1]));
  const service = blocks.find(x => x['@type'] === 'ProfessionalService');
  assert.ok(service);
  assert.equal(service.foundingDate, undefined);
  assert.equal(service.geo, undefined);
  assert.equal(service.address, undefined);
  assert.match(service.hasOfferCatalog.itemListElement[0].itemOffered.description, /stationnement/);
  assert.doesNotMatch(html, /<meta name="geo.position"/);
});
test('Each authorized reference logo appears only once in the homepage carousel', () => {
  for (const file of ['logo-netflix.png', 'logo-jo2024.svg', 'logo-conseil-regional.svg']) {
    assert.equal(html.split('src="/images/' + file + '"').length - 1, 1, file);
  }
});
