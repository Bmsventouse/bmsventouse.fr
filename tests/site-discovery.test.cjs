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

test('key landing pages use one blocking primary stylesheet without redundant preloads', () => {
  for (const filename of ['index.html', 'services/index.html', 'contact/index.html']) {
    const html = fs.readFileSync(filename, 'utf8');
    const styles = html.match(/<link rel="stylesheet" href="\/css\/style\.css\?v=[^"]+">/g) || [];
    assert.equal(styles.length, 1, filename + ': exactly one primary CSS link');
    assert.doesNotMatch(html, /<link rel="preload" href="\/css\/style\.css/, filename);
  }
  const homepage = fs.readFileSync('index.html', 'utf8');
  assert.match(homepage, /<link rel="describedby" href="\/llms\.txt" type="text\/plain">/);
});

test('deployed CSP policies remain identical between Netlify config files', () => {
  const headers = fs.readFileSync('_headers', 'utf8');
  const toml = fs.readFileSync('netlify.toml', 'utf8');
  const headerPolicy = headers.match(/^\s+Content-Security-Policy: ([^\r\n]+)$/m);
  const tomlPolicy = toml.match(/^\s+Content-Security-Policy = "([^"\r\n]+)"$/m);
  assert.ok(headerPolicy, 'Missing _headers CSP');
  assert.ok(tomlPolicy, 'Missing netlify.toml CSP');
  assert.equal(headerPolicy[1], tomlPolicy[1], 'Netlify CSP sources disagree');
  for (const domain of ['https://www.googletagmanager.com', 'https://region1.google-analytics.com']) {
    assert.ok(headerPolicy[1].includes(domain), 'Missing measurement domain: ' + domain);
  }
  assert.match(headerPolicy[1], /frame-ancestors 'none'/);
});
