'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const postcss = require('postcss');
const root = path.resolve(__dirname, '../extension');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const pkg = require('../package.json');

assert.equal(manifest.manifest_version, 3);
assert.equal(manifest.version, pkg.version);
assert.deepEqual(manifest.permissions, ['storage']);
assert(!manifest.background && !manifest.host_permissions);
assert.deepEqual(manifest.content_scripts[0].matches, ['https://usflearn.instructure.com/*']);
assert.equal(manifest.content_scripts[0].all_frames, false);
for (const file of manifest.content_scripts[0].js) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  new vm.Script(source, { filename: file });
  assert(source.includes("location.hostname !== 'usflearn.instructure.com'"));
  assert(source.includes('window.top !== window'));
}
for (const file of ['dashboard.css', 'panel.css', 'terminal.css']) {
  postcss.parse(fs.readFileSync(path.join(root, file), 'utf8'), { from: file });
}
for (const group of manifest.web_accessible_resources) {
  assert.deepEqual(group.matches, ['https://usflearn.instructure.com/*']);
  for (const resource of group.resources) {
    assert(!resource.includes('..') && !path.isAbsolute(resource));
    if (!resource.includes('*')) assert(fs.existsSync(path.join(root, resource)), resource);
  }
}
for (const file of fs.readdirSync(path.join(root, 'assets'))) {
  const data = fs.readFileSync(path.join(root, 'assets', file));
  if (file.endsWith('.png')) assert.equal(data.readUInt32BE(0), 0x89504e47);
  else if (file.endsWith('.gif')) assert.equal(data.subarray(0, 3).toString(), 'GIF');
  else assert.fail('Unexpected asset: ' + file);
}
console.log('PASS manifest, JavaScript syntax, stylesheet parsing, runtime resources, and image signatures');
