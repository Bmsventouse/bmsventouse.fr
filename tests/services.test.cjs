'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '../services/index.html'), 'utf8');
const count = (fragment) => html.split(fragment).length - 1;

test('Services page has one H1, canonical and unique IDs', () => {
  assert.equal(count('<h1'), 1);
  assert.ok(html.includes('<link rel="canonical" href="https://bmsventouse.fr/services/"'));
  const ids = Array.from(html.matchAll(/\bid="([^"]+)"/g), m => m[1]);
  assert.equal(ids.length, new Set(ids).size);
});
test('Services page avoids unverified blanket promotions and local premises', () => {
  for (const phrase of ['350 € HT / 24 h en Île-de-France', 'Signalisation offerte', 'Repérage offert', 'Services offerts en cas de collaboration', 'Basée à Paris']) {
    assert.ok(!html.includes(phrase), phrase);
  }
});
test('Services page has two direct email CTAs and WhatsApp', () => {
  assert.equal(count('href="mailto:contact@bmsventouse.fr?subject='), 2);
  assert.ok(count('https://wa.me/33646005642?text=') >= 2);
});
test('Structured data is valid and avoids invisible FAQPage markup', () => {
  const scripts = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  const blocks = scripts.map(m => JSON.parse(m[1]));
  assert.ok(blocks.some(block => block['@type'] === 'Service'));
  assert.ok(!blocks.some(block => block['@type'] === 'FAQPage'));
});
test('Ventousage leads the service catalog', () => {
  const grid = html.slice(html.indexOf('<div class="services-grid-visual">'));
  const first = grid.match(/<article class="service-card-visual animated-item">([\s\S]*?)<\/article>/);
  assert.ok(first && first[1].includes('Ventousage &amp; Stationnement'));
});
