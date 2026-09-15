const { JSDOM, VirtualConsole } = require('jsdom');
const { readFileSync, existsSync } = require('node:fs');
const assert = require('node:assert/strict');
const postcss = require('postcss');
const root = require('node:path').resolve(__dirname, '../extension');
const source = readFileSync(root + '/content.js', 'utf8');
const manifest = JSON.parse(readFileSync(root + '/manifest.json', 'utf8'));
const tick = () => new Promise(resolve => setImmediate(resolve));
let passed = 0;
function pass(label) { passed++; console.log('PASS ' + label); }

async function environment({ path = '/', reduced = false, saved = {}, content = true } = {}) {
  const errors = [], writes = [], callbacks = new Map(), listeners = [];
  const console = new VirtualConsole();
  console.on('jsdomError', error => errors.push(error.message));
  const native = '<a id="assignment" href="/courses/example/assignments/example">Course assignment</a><button id="native">Original action</button>';
  const dom = new JSDOM('<!doctype html><html><body><div id="application">' + (content ? '<main id="content">' + native + '</main>' : '') + '</div></body></html>', {
    url: 'https://usflearn.instructure.com' + path, runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: console
  });
  const w = dom.window;
  let data = structuredClone(saved), readCount = 0, next = 0, hidden = false;
  Object.defineProperty(w.document, 'hidden', { get: () => hidden });
  const media = { matches: reduced, addEventListener: (_, cb) => listeners.push(cb) };
  w.matchMedia = () => media;
  w.requestAnimationFrame = cb => { const id = ++next; callbacks.set(id, cb); return id; };
  w.cancelAnimationFrame = id => callbacks.delete(id);
  w.chrome = {
    runtime: { getURL: path => 'chrome-extension://test-unova/' + path },
    storage: {
      local: {
        get: async key => { readCount++; return { [key]: data[key] }; },
        set: async value => { data = { ...data, ...JSON.parse(JSON.stringify(value)) }; writes.push(value); }
      },
      onChanged: { addListener: () => {} }
    }
  };
  let clicks = 0;
  w.document.getElementById('native')?.addEventListener('click', () => clicks++);
  w.eval(source);
  await tick(); await tick();
  return {
    w, dom, errors, callbacks, writes, native,
    shadow: () => w.document.getElementById('uc-unova-theme')?.shadowRoot,
    clicks: () => clicks, reads: () => readCount, data: () => data,
    hide: value => { hidden = value; w.document.dispatchEvent(new w.Event('visibilitychange')); },
    reduce: value => { media.matches = value; listeners.forEach(cb => cb()); }
  };
}

(async () => {
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.version, '1.2.0');
  assert.deepEqual(manifest.permissions, ['storage']);
  assert.deepEqual(manifest.content_scripts[0].matches, ['https://usflearn.instructure.com/*']);
  assert.equal(manifest.content_scripts[0].all_frames, false);
  assert(!manifest.background && !manifest.host_permissions);
  for (const file of [...manifest.content_scripts[0].js, ...manifest.content_scripts[0].css, 'panel.css', 'render.c']) assert(existsSync(root + '/' + file));
  for (const file of ['dashboard.css', 'panel.css']) assert(postcss.parse(readFileSync(root + '/' + file, 'utf8')).nodes.length > 10);
  pass('Manifest, exact host boundary, permissions, file references, and CSS parsing');

  for (const name of ['snivy', 'tepig', 'oshawott', 'zorua', 'chandelure']) {
    assert(readFileSync(root + '/assets/' + name + '.gif').subarray(0, 3).equals(Buffer.from('GIF')));
    assert.equal(readFileSync(root + '/assets/' + name + '.png').readUInt32BE(0), 0x89504e47);
  }
  pass('Five local animated GIFs and five valid static PNG counterparts');
  assert.equal(readFileSync(root + '/assets/unova-skyline.png').readUInt32BE(0), 0x89504e47);

  const e = await environment();
  const s = e.shadow();
  assert(s && e.w.document.documentElement.hasAttribute('data-uc-dark'));
  assert.equal(s.querySelectorAll('.pokemon img').length, 5);
  assert.equal(s.querySelector('#stage').hidden, false);
  assert.equal(e.callbacks.size, 1);
  assert([...s.querySelectorAll('.pokemon img')].every(img => img.src.endsWith('.gif')));
  assert(s.querySelector('#skyline-art').src.endsWith('/assets/unova-skyline.png'));
  assert(s.querySelector('#stage').hasAttribute('inert'));
  assert.equal(s.querySelector('#stage').getAttribute('aria-hidden'), 'true');
  assert.equal(e.w.document.getElementById('uc-unova-theme').parentElement, e.w.document.body);
  assert.equal(e.w.document.querySelector('#content').innerHTML, e.native);
  pass('Dashboard mount, dark root, five visible sprite elements, one animation loop');

  const path = s.querySelector('#mesh').getAttribute('d');
  assert.equal((path.match(/M/g) || []).length, 30);
  assert.equal((path.match(/Z/g) || []).length, 30);
  assert(!/NaN|Infinity|undefined/.test(path));
  const coordinates = path.match(/-?\d+\.\d+/g).map(Number);
  assert.equal(coordinates.length, 2300);
  assert(coordinates.every(n => n > 0 && n < 500));
  assert.equal(s.querySelectorAll('.code-line').length, 25);
  pass('Wireframe has 30 closed torus loops with finite coordinates; C excerpt rendered safely');

  const before = path;
  const [id, callback] = [...e.callbacks][0];
  e.callbacks.delete(id); callback(e.w.performance.now() + 120);
  assert.notEqual(s.querySelector('#mesh').getAttribute('d'), before);
  assert.equal(e.callbacks.size, 1);
  pass('Animation advances the frame without creating duplicate loops');

  e.w.document.querySelector('#native').click();
  assert.equal(e.clicks(), 1);
  assert.equal(e.w.document.querySelector('#assignment').getAttribute('href'), '/courses/example/assignments/example');
  assert.equal(e.w.document.querySelector('#assignment').textContent, 'Course assignment');
  pass('Existing page links, text, and click handlers preserved');

  s.querySelector('#motion-toggle').click();
  await tick();
  assert.equal(e.callbacks.size, 0);
  assert([...s.querySelectorAll('.pokemon img')].every(img => img.src.endsWith('.png')));
  assert.equal(e.data().unovaDashboardPreferences.motion, false);
  s.querySelector('#motion-toggle').click();
  await tick();
  assert.equal(e.callbacks.size, 1);
  pass('Pause stops rendering AND GIFs; resume works; preference is saved');

  e.hide(true);
  assert.equal(e.callbacks.size, 0);
  assert([...s.querySelectorAll('.pokemon img')].every(img => img.src.endsWith('.png')));
  e.hide(false); assert.equal(e.callbacks.size, 1);
  e.reduce(true); assert.equal(e.callbacks.size, 0);
  assert(s.querySelector('#motion-toggle').disabled);
  e.reduce(false); assert.equal(e.callbacks.size, 1);
  pass('Hidden-tab suspension and live system reduced-motion changes');

  s.querySelector('#wireframe').click(); await tick();
  assert.equal(e.callbacks.size, 0);
  assert.equal(s.querySelector('#stage').dataset.wireframe, 'false');
  assert.equal(s.querySelector('#stage').dataset.moving, 'true');
  s.querySelector('#wireframe').click(); await tick();
  assert.equal(e.callbacks.size, 1);
  for (const key of ['skyline', 'code']) {
    s.querySelector('#' + key).click(); await tick();
    assert.equal(s.querySelector('#stage').dataset[key], 'false');
    assert.equal(e.data().unovaDashboardPreferences[key], false);
    s.querySelector('#' + key).click(); await tick();
  }
  let srcChanges = 0;
  const watcher = new e.w.MutationObserver(records => { srcChanges += records.length; });
  watcher.observe(s.querySelector('.pokemon'), { subtree: true, attributes: true, attributeFilter: ['src'] });
  s.querySelector('#intensity').value = '60';
  s.querySelector('#intensity').dispatchEvent(new e.w.Event('input'));
  await tick();
  assert.equal(srcChanges, 0); watcher.disconnect();
  pass('Independent layer controls persist; disabling wireframe stops its loop; intensity does not reload GIFs');

  s.querySelector('#gear').click();
  assert.equal(s.querySelector('#settings').hidden, false);
  assert.equal(s.activeElement.id, 'enabled');
  s.querySelector('#pokemon').click();
  assert.equal(s.querySelector('#stage').dataset.pokemon, 'false');
  s.querySelector('#backdrop').click();
  assert(s.querySelector('#stage').hidden);
  assert.equal(e.callbacks.size, 0);
  assert.equal(s.querySelector('#gear').hidden, false);
  s.querySelector('#enabled').click();
  assert(!e.w.document.documentElement.hasAttribute('data-uc-dark'));
  s.querySelector('#intensity').value = '45';
  s.querySelector('#intensity').dispatchEvent(new e.w.Event('input'));
  s.querySelector('#intensity').dispatchEvent(new e.w.Event('change'));
  await tick(); await tick();
  assert.equal(s.querySelector('#intensity-value').textContent, '45%');
  pass('Appearance controls, master disable, intensity, and settings access with backdrop hidden');

  const reload = await environment({ saved: e.data() });
  assert(!reload.w.document.documentElement.hasAttribute('data-uc-dark'));
  assert.equal(reload.shadow().querySelector('#intensity').value, '45');
  assert(reload.shadow().querySelector('#stage').hidden);
  reload.dom.window.close();
  s.querySelector('#reset').click(); await tick();
  assert(e.w.document.documentElement.hasAttribute('data-uc-dark'));
  assert.equal(s.querySelector('#intensity').value, '80');
  s.querySelector('#settings').dispatchEvent(new e.w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert(s.querySelector('#settings').hidden);
  assert.equal(s.activeElement.id, 'gear');
  pass('Preferences survive reload; reset and Escape restore expected state/focus');

  const legacy = await environment({ saved: { unovaDashboardPreferences: { enabled: true, backdrop: true, pokemon: false, motion: false, intensity: 200, skyline: 'invalid' } } });
  assert.equal(legacy.shadow().querySelector('#intensity').value, '100');
  for (const key of ['skyline', 'code', 'wireframe']) assert(legacy.shadow().querySelector('#' + key).checked);
  assert(!legacy.shadow().querySelector('#pokemon').checked);
  assert.equal(legacy.callbacks.size, 0);
  legacy.dom.window.close();
  pass('Version 1 preferences migrate; invalid values normalize and intensity is clamped');

  e.w.eval(source); await tick();
  assert.equal(e.w.document.querySelectorAll('#uc-unova-theme').length, 1);
  const h = e.w.document.querySelector('#uc-unova-theme');
  h.remove(); await tick();
  assert(h.isConnected);
  assert.equal(e.callbacks.size, 1);
  assert.deepEqual(e.errors, []);
  e.dom.window.close();
  pass('No duplicate mount, remount after Canvas refresh, no DOM runtime errors');

  for (const path of ['/courses/123', '/courses/123/quizzes/7/take', '/login', '/conversations', '/dashboard-extra']) {
    const excluded = await environment({ path });
    assert(!excluded.shadow()); assert.equal(excluded.reads(), 0);
    assert(!excluded.w.document.documentElement.hasAttribute('data-uc-dark'));
    excluded.dom.window.close();
  }
  pass('Course, quiz, login, inbox, and non-dashboard routes are untouched');

  for (const path of ['/?view=feed', '/dashboard', '/dashboard/']) {
    const allowed = await environment({ path, reduced: true });
    assert(allowed.shadow()); assert.equal(allowed.callbacks.size, 0);
    allowed.dom.window.close();
  }
  const late = await environment({ content: false });
  const container = late.w.document.createElement('main'); container.id = 'content'; late.w.document.body.append(container);
  await tick(); assert(late.shadow()); late.dom.window.close();
  pass('Dashboard URL variants, reduced-motion initial load, asynchronously mounted dashboard');
  console.log('\n' + passed + ' check groups passed. DOM simulation only; live visual QA remains pending.');
})().catch(error => { console.error(error); process.exitCode = 1; });
