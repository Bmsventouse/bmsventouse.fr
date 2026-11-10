'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.resolve(__dirname,'../ventousage-paris/index.html'),'utf8');
const count=s=>html.split(s).length-1;
test('Core SEO and direct quotation buttons',()=>{
  assert.equal(count('<h1'),1);
  assert.ok(html.includes('Ventousage Paris : ventouseur'));
  assert.ok(!html.includes('Vos Places Libres à 100%'));
  assert.equal(count('href="mailto:contact@bmsventouse.fr?subject='),1);
  assert.ok(html.includes('href="#devis-ventousage-paris"'));
});
test('Unique FAQs and headings',()=>{
  const hs=[...html.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/g)].map(m=>m[1].replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim());
  assert.equal(hs.length,new Set(hs).size);
  assert.equal(count('Questions fréquentes —'),1);
  assert.equal(count('<section'),11);
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

test('Quick quote form is real Netlify HTML with fields, anti-spam and confirmation',()=>{
  assert.ok(html.includes('name="ventousage-paris-devis" method="POST"'));
  assert.ok(html.includes('data-netlify="true"'));
  assert.ok(html.includes('netlify-honeypot="bot-field"'));
  assert.ok(html.includes('action="/merci-devis/"'));
  for(const name of ['dates','lieu','besoin','email']) assert.ok(html.includes('name="'+name+'"'));
  const thanks=fs.readFileSync(path.resolve(__dirname,'../merci-devis/index.html'),'utf8');
  assert.ok(thanks.includes('Votre demande a été transmise'));
  assert.ok(thanks.includes('noindex'));
});
test('Mobile sticky actions, real case proofs and consent compatibility exist',()=>{
  assert.ok(html.includes('class="bms-vp-mobile-actions"'));
  assert.ok(html.includes('id="vp-cas-reels"'));
  assert.ok(html.includes('id="vp-galerie"'));
  assert.ok(html.includes('id="devis-ventousage-paris"'));
  const css=fs.readFileSync(path.resolve(__dirname,'../css/pages.css'),'utf8');
  assert.ok(css.includes(':has(#cookie-banner)'));
});

test('Form tracking reports only an attempt and contains no personal fields',()=>{
  const js=fs.readFileSync(path.resolve(__dirname,'../js/ventousage-paris-leads.js'),'utf8');
  assert.ok(js.includes('quote_form_submit_attempt'));
  assert.ok(!js.includes('FormData'));
  assert.ok(html.includes('src="/js/ventousage-paris-leads.js"'));
});

test('Single, correctly placed form and no unauthorized discount or repeated sales blocks',()=>{
  assert.equal(count('<form'),1);
  assert.ok(!html.includes('Offre promotionnelle : 350'));
  assert.ok(!html.includes('Drancy'));
  assert.ok(html.indexOf('id="vp-cas-reels"') < html.indexOf('id="devis-ventousage-paris"'));
  assert.ok(html.indexOf('id="devis-ventousage-paris"') < html.indexOf('Démarches officielles'));
  assert.equal(count('Missions réelles de ventousage à Paris'),1);
  assert.equal(count("Zones d'intervention à Paris"),1);
});
test('Conversion event is allowed by consent-safe analytics',()=>{
  const consent=fs.readFileSync(path.resolve(__dirname,'../js/consent.js'),'utf8');
  assert.ok(consent.includes("'quote_form_submit_attempt'"));
});
