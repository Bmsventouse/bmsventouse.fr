/* eslint-env node */
/**
 * Build the single production stylesheet from maintained CSS modules.
 * No dependencies, no CSS rewriting: preserving cascade order is intentional.
 *
 * Usage: node scripts/build-css.js [--check]
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const MODULES = Object.freeze([
  'base.css',
  'layout.css',
  'components.css',
  'faq.css',
  'animations.css',
  'sections.css',
  'pages.css',
  'overrides.css'
]);
const output = path.join(root, 'css', 'style.css');
const compiled = MODULES.map(name =>
  fs.readFileSync(path.join(root, 'css', name), 'utf8')
).join('');

if (process.argv.includes('--check')) {
  const current = fs.readFileSync(output, 'utf8');
  if (current !== compiled) {
    console.error('CSS output is outdated. Run: npm run build:css');
    process.exitCode = 1;
  } else {
    console.log('CSS modules match css/style.css exactly.');
  }
} else {
  fs.writeFileSync(output, compiled, 'utf8');
  console.log('Generated css/style.css from ' + MODULES.length + ' modules.');
}
