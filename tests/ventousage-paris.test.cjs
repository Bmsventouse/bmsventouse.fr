'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.resolve(__dirname,'../ventousage-paris/index.html'),'utf8');
const count=s=>html.split(s).length-1;
test('Core SEO and direct quotation buttons',()=>{
  assert.equal(count('<h1'),1);
  assert.match(html, /Ventousage Paris<\/span> : ventouseur/);
  assert.ok(!html.includes('Vos Places Libres à 100%'));
  assert.equal(count('href="mailto:contact@bmsventouse.fr"'),1);
  assert.ok(html.includes('href="/contact-direct/#contact-direct-options"'));
});
test('Unique FAQs and headings',()=>{
  const hs=[...html.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/g)].map(m=>m[1].replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim());
  assert.equal(hs.length,new Set(hs).size);
  assert.equal(count('Questions fréquentes —'),1);
  assert.equal(count('<section'),7);
  assert.ok(html.includes('Que fait un ventouseur à Paris'));
});
test('Current AOT process and structured schema validity',()=>{
  assert.ok(html.includes('au moins trois semaines avant'));
  assert.ok(!html.includes('depuis notre base'));
  const jsons=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1]));
  assert.ok(jsons.length>=1);
  assert.ok(jsons.every(j=>!Array.isArray(j)&&j['@type']!=='FAQPage'));
});

test('Ventousage Paris hero unclamped and commercial page links preserved',()=>{
  const css=fs.readFileSync(path.resolve(__dirname,'../css/pages.css'),'utf8');
  assert.ok(css.includes('body.page-ventousage-paris .hero-overlay p'));
  assert.ok(css.includes('-webkit-line-clamp: unset'));
  for(const link of ['/panneaux-demenagement/','/demenagement-aot/','/convoyage-vehicules-decors/','/transport-materiel-audiovisuel-paris/']) {
    assert.ok(html.includes('href="'+link+'"'),link);
  }
});

test('Mobile sticky actions, real case proofs and consent compatibility exist',()=>{
  assert.ok(html.includes('class="bms-vp-mobile-actions"'));
  assert.ok(html.includes('id="vp-cas-reels"'));
  assert.ok(html.includes('id="vp-galerie"'));
  const css=fs.readFileSync(path.resolve(__dirname,'../css/pages.css'),'utf8');
  assert.ok(css.includes(':has(#cookie-banner)'));
});

test('Direct contact replaces the quote form and preserves a compact page',()=>{
  assert.equal(count('<form'),0);
  assert.equal(count('href="/contact-direct/#contact-direct-options"'),4);
  assert.ok(!html.includes('devis-ventousage-paris'));
  assert.ok(!html.includes('Offre promotionnelle : 350'));
  assert.ok(!html.includes('Drancy'));
  assert.equal(count('Missions réelles de ventousage à Paris'),1);
  assert.equal(count("Zones d'intervention à Paris"),1);
});
