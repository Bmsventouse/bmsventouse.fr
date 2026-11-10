'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.resolve(__dirname,'../ventousage-paris/index.html'),'utf8');
const count=s=>html.split(s).length-1;
test('Core SEO and direct quotation buttons',()=>{
  assert.equal(count('<h1'),1);
  assert.ok(html.includes('Ventousage Paris : ventouseur'));
  assert.ok(!html.includes('Vos Places Libres à 100%'));
  assert.equal(count('href="mailto:contact@bmsventouse.fr?subject='),2);
});
test('Unique FAQs and headings',()=>{
  const hs=[...html.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/g)].map(m=>m[1].replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim());
  assert.equal(hs.length,new Set(hs).size);
  assert.equal(count('Questions fréquentes —'),1);
  assert.ok(html.includes('Que fait un ventouseur à Paris'));
});
test('Current AOT process and structured schema validity',()=>{
  assert.ok(html.includes('au moins trois semaines avant'));
  assert.ok(!html.includes('depuis notre base'));
  const jsons=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1]));
  assert.ok(jsons.length>=1);
  assert.ok(jsons.every(j=>!Array.isArray(j)&&j['@type']!=='FAQPage'));
});
