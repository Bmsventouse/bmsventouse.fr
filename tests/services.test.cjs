'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '../services/index.html'),'utf8');
test('Services page has one H1, canonical and unique IDs', () => {
  assert.equal((html.match(/<h1\\b/g)||[]).length,1);
  assert.match(html, /<link rel="canonical" href="https:\/\/bmsventouse.fr\/services\/"/);
  const ids=[...html.matchAll(/\\bid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(ids.length,new Set(ids).size);
});
test('Service pricing and freebies are never advertised without an agreed quotation', () => {
  assert.doesNotMatch(html, /350 € HT \/ 24 h en Île-de-France|Signalisation offerte|Repérage offert|Services offerts en cas de collaboration/);
  assert.doesNotMatch(html, /Basée à Paris/);
});
test('Service CTAs are consistent and avoid unnecessary intermediate contact page', () => {
  assert.equal((html.match(/href="mailto:contact@bmsventouse\\.fr\\?subject=/g)||[]).length,2);
  assert.ok((html.match(/https:\/\/wa\\.me\/33646005642\\?text=/g)||[]).length>=2);
});
test('Service structured data matches visible content', () => {
  const parsed=[...html.matchAll(/<script type="application\\/ld\\+json">([\\s\\S]*?)<\\/script>/g)].map(m=>JSON.parse(m[1]));
  assert.ok(parsed.some(x=>x['@type']==='Service'));
  assert.ok(!parsed.some(x=>x['@type']==='FAQPage' || Array.isArray(x)));
});
test('Core ventousage is the first service card',()=>{
  const grid=html.slice(html.indexOf('<div class="services-grid-visual">'));
  const first=grid.match(/<article class="service-card-visual animated-item">([\\s\\S]*?)<\\/article>/);
  assert.ok(first&&first[1].includes('Ventousage &amp; Stationnement'));
});
