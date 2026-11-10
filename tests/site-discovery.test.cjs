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

test('homepage promotional banner has accessible copy matching its visible message', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const css = fs.readFileSync('css/style.css', 'utf8');
  const promo = html.match(/<div class="promo-banner" id="promoBanner">([\s\S]*?)<\/div>/);
  assert.ok(promo, 'Homepage banner exists');
  assert.match(promo[1], /<strong>Devis en 24 h<\/strong>/);
  assert.doesNotMatch(promo[1], /350\s*€/);
  assert.match(css, /body\.page-accueil \.promo-banner strong::before\s*{\s*content:\s*none;/);
  assert.match(css, /body\.page-accueil \.promo-banner strong\s*{\s*font-size:\s*0\.95rem;/);
});

test('homepage copy does not contain contradictory office locations or legacy year', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const script = fs.readFileSync('js/script.js', 'utf8');
  assert.doesNotMatch(html, /Basée à Paris|Basée en Île|basée en Seine/);
  assert.doesNotMatch(html, /des <strong>Premier retour/);
  assert.doesNotMatch(html, /&copy; 2025 BMS Ventouse/);
  assert.doesNotMatch(script, /&copy; 2025 BMS Ventouse/);
});

test('sitemap contains precisely the indexable HTML pages with matching canonicals', () => {
  const siteOrigin = 'https://bmsventouse.fr';
  const sitemap = fs.readFileSync('sitemap.xml', 'utf8');
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  assert.equal(new Set(urls).size, urls.length, 'Duplicate sitemap URLs');

  const htmlFiles = [];
  function walk(dir) {
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      if (item.name.startsWith('.') || item.name === 'node_modules') continue;
      const file = path.join(dir, item.name);
      if (item.isDirectory()) walk(file);
      else if (item.name.endsWith('.html')) htmlFiles.push(file);
    }
  }
  walk('.');
  const indexable = new Set();
  for (const file of htmlFiles) {
    const html = fs.readFileSync(file, 'utf8');
    const head = html.split('</head>')[0];
    const robots = head.match(/<meta[^>]*name="robots"[^>]*>/i)?.[0] || '';
    const isNoindex = /noindex/i.test(robots);
    const normalized = file.split(path.sep).join('/').replace(/^\.\//, '');
    const pathname = normalized === 'index.html' ? '/' :
      normalized.endsWith('/index.html') ? '/' + normalized.slice(0, -'index.html'.length) :
        '/' + normalized;
    const url = siteOrigin + pathname;
    if (isNoindex) {
      assert.ok(!urls.includes(url), file + ' is noindex but listed in sitemap');
      continue;
    }
    const canonical = head.match(/<link[^>]*rel="canonical"[^>]*>/i)?.[0] || '';
    assert.ok(canonical.includes('href="' + url + '"'), file + ': canonical mismatch');
    assert.ok(urls.includes(url), file + ': missing indexable page in sitemap');
    indexable.add(url);
  }
  assert.deepEqual(new Set(urls), indexable, 'Sitemap has extra or missing indexable URLs');
});

test('CSS delivery is a single precombined stylesheet, not disconnected modular sources', () => {
  const css = fs.readFileSync('css/style.css', 'utf8');
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  assert.doesNotMatch(css, /@import\s+(?:url\()?['"]?[^;]+\.css/, 'Combined CSS must not import more stylesheets');
  assert.match(pkg.scripts.build, /npm run build:css/, 'Build must generate the primary CSS');
  assert.match(pkg.scripts.test, /npm run check:css/, 'Tests must reject a stale generated CSS');
  const modules = [
    'base.css', 'layout.css', 'components.css', 'faq.css',
    'animations.css', 'sections.css', 'pages.css', 'overrides.css'
  ];
  const combined = modules.map(name => fs.readFileSync(path.join('css', name), 'utf8')).join('');
  assert.equal(combined, css, 'Generated stylesheet differs from maintained CSS modules');

  function checkDir(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) checkDir(full);
      else if (entry.name.endsWith('.html')) {
        const html = fs.readFileSync(full, 'utf8');
        assert.doesNotMatch(html, /(?:href|src)=["']\/css\/(?:base|layout|components|sections|pages|faq)\.css(?:\?[^"']*)?["']/i,
          full + ': disconnected CSS module referenced directly');
      }
    }
  }
  checkDir('.');
});
