/* eslint-env node */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('llms.txt has a canonical site title and an agent-readable link directory', () => {
  const content = fs.readFileSync('llms.txt', 'utf8');
  const lines = content.split(/\r?\n/);
  assert.equal(lines[0], '# BMS Ventouse');
  assert.match(content, /^> .+/m);
  assert.equal(lines.filter(line => /^# /.test(line)).length, 1);
  assert.equal(lines.filter(line => /^## /.test(line)).length >= 2, true);

  const links = [...content.matchAll(/^- \[([^\]]+)\]\((https:\/\/bmsventouse\.fr\/[^)]+)\)(?:: .+)?$/gm)];
  assert.equal(links.length >= 10, true, 'Expected useful, descriptive links');
  const unique = new Set();
  for (const [, label, url] of links) {
    assert.ok(label.trim());
    assert.ok(!unique.has(url), 'Duplicate destination: ' + url);
    unique.add(url);
    const pathname = new URL(url).pathname;
    const local = pathname.endsWith('/') ? path.join('.', pathname, 'index.html') : '.' + pathname;
    assert.ok(fs.existsSync(local), 'Missing target: ' + local);
  }
});

test('homepage declares its primary CSS before painting and describes llms.txt', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  assert.match(html, /<link rel="stylesheet" href="\/css\/style\.css\?v=[^"]+">/);
  assert.doesNotMatch(html, /<link rel="preload" href="\/css\/style\.css/);
  assert.match(html, /<link rel="describedby" href="\/llms\.txt" type="text\/plain">/);
});
