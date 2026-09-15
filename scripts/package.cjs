'use strict';
const { readdirSync, lstatSync, mkdtempSync, mkdirSync, readFileSync, copyFileSync, unlinkSync, rmdirSync } = require('node:fs');
const { join, resolve } = require('node:path');
const { tmpdir } = require('node:os');
const { execFileSync } = require('node:child_process');
require('./check.cjs');
const root = resolve(__dirname, '..');
const extension = join(root, 'extension');
const version = JSON.parse(readFileSync(join(extension, 'manifest.json'), 'utf8')).version;
if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Invalid package version');
const expected = new Set(['manifest.json', 'content.js', 'terminal.js', 'dashboard.css', 'panel.css', 'terminal.css', 'render.c', 'render.cpp', 'assets']);
const files = [];
for (const name of readdirSync(extension).sort()) {
  if (!expected.has(name)) throw new Error('Unexpected extension entry: ' + name);
  const full = join(extension, name);
  if (lstatSync(full).isSymbolicLink()) throw new Error('Symlinks cannot be packaged');
  if (name === 'assets') {
    for (const asset of readdirSync(full).sort()) {
      if (!/^[a-z-]+\.(gif|png)$/.test(asset) || !lstatSync(join(full, asset)).isFile()) throw new Error('Unexpected asset: ' + asset);
      files.push('assets/' + asset);
    }
  } else {
    if (!lstatSync(full).isFile()) throw new Error('Expected regular file: ' + name);
    files.push(name);
  }
}
const scratch = mkdtempSync(join(tmpdir(), 'canvas-theme-package-'));
const archive = join(scratch, 'extension.zip');
try {
  execFileSync('zip', ['-q', '-X', archive, ...files], { cwd: extension, stdio: 'inherit' });
  mkdirSync(join(root, 'dist'), { recursive: true });
  const output = join(root, 'dist', 'canvas-theme-' + version + '.zip');
  copyFileSync(archive, output);
  console.log('Packaged ' + files.length + ' extension files: ' + output);
} finally {
  try { unlinkSync(archive); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  rmdirSync(scratch);
}
