/* eslint-env node */
'use strict';
/* Conservative audit only: reported selectors are candidates, not safe deletions. */
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
    else if (item.name.endsWith('.html') || /^js\\/.+\\.js$/.test(path.relative(root, full).replace(/\\\\/g, '/'))) files.push(full);
  }
}
collect(root);
const contents = files.map(f => fs.readFileSync(f, 'utf8')).join('\n');
const classes = [...new Set([...css.replace(/\\/\\*[\\s\\S]*?\\*\\//g, '').matchAll(/\\.([a-zA-Z_][\\w-]*)/g)].map(m => m[1]))].sort();
const unused = classes.filter(name => !new RegExp('(^|[^\\w-])' + name + '(?![\\w-])').test(contents));
console.log(JSON.stringify({
  scannedFiles: files.length, cssClassNames: classes.length,
  candidates: unused,
  note: 'Review runtime interactions and computed styles before removing a candidate.'
}, null, 2));
