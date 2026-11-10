/* eslint-env node */
'use strict';
// Reports CSS class names that do not occur in HTML or runtime JavaScript.
// This conservative static audit never removes styles automatically.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'css/style.css'), 'utf8');
const files = [];
function collect(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    if (item.name.startsWith('.') || ['node_modules', 'docs', 'tests', 'scripts'].includes(item.name)) continue;
    const full = path.join(dir, item.name);
    if (item.isDirectory()) collect(full);
    else {
      const rel = path.relative(root, full).split(path.sep).join('/');
      if (rel.endsWith('.html') || (rel.startsWith('js/') && rel.endsWith('.js'))) files.push(full);
    }
  }
}
collect(root);
const contents = files.map(f => fs.readFileSync(f, 'utf8')).join('\n');
const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
const classes = [...new Set([...stripped.matchAll(/\.([a-zA-Z_][\w-]*)/g)].map(m => m[1]))].sort();
const unused = classes.filter(name => !new RegExp('(^|[^\\w-])' + name + '(?![\\w-])').test(contents));
console.log(JSON.stringify({
  scannedFiles: files.length, cssClassNames: classes.length,
  candidates: unused,
  note: 'Verify browser interactions and computed styles before removing a candidate.'
}, null, 2));
