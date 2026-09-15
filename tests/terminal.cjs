const { JSDOM, VirtualConsole } = require('jsdom');
const { readFileSync } = require('node:fs');
const { execFileSync } = require('node:child_process');
const assert = require('node:assert/strict');
const postcss = require('postcss');
const root = require('node:path').resolve(__dirname, '../extension');
const source = readFileSync(root + '/terminal.js', 'utf8');
const backdropSource = readFileSync(root + '/content.js', 'utf8');
const cpp = readFileSync(root + '/render.cpp', 'utf8').trimEnd();
const THEME = 'unovaDashboardPreferences', PAUSE = 'unovaTerminalPaused';
const tick = () => new Promise(resolve => setImmediate(resolve));
let count = 0;
const pass = name => { count++; console.log('PASS ' + name); };

async function env({ path = '/', saved = {}, reduced = false, late = false, together = false } = {}) {
  const errors = [], changes = [], mediaListeners = [], callbacks = new Map(), writes = [];
  const vc = new VirtualConsole(); vc.on('jsdomError', e => errors.push(e.message));
  const dom = new JSDOM('<!doctype html><html><body><div id="application">' + (late ? '' : '<main id="content"><div id="dashboard"><button id="native">Original action</button><a id="assignment" href="/courses/example">Course</a></div></main>') + '</div></body></html>', { url: 'https://usflearn.instructure.com' + path, runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc });
  const w = dom.window;
  let data = structuredClone(saved), next = 0, hidden = false, io;
  const original = w.document.getElementById('dashboard');
  const originalMarkup = original?.innerHTML;
  let clicks = 0; w.document.getElementById('native')?.addEventListener('click', () => clicks++);
  Object.defineProperty(w.document, 'hidden', { get: () => hidden });
  Object.defineProperty(w.performance, 'now', { value: () => 0 });
  const media = { matches: reduced, addEventListener: (_, callback) => mediaListeners.push(callback) };
  w.matchMedia = () => media;
  w.requestAnimationFrame = callback => { callbacks.set(++next, callback); return next; };
  w.cancelAnimationFrame = id => callbacks.delete(id);
  w.IntersectionObserver = class { constructor(cb) { io = cb; } observe() {} disconnect() {} };
  w.chrome = { runtime: { getURL: p => 'chrome-extension://test-unova/' + p }, storage: { local: {
    get: async keys => Object.fromEntries((Array.isArray(keys) ? keys : [keys]).map(k => [k, data[k]])),
    set: async value => { writes.push(JSON.parse(JSON.stringify(value))); data = { ...data, ...value }; }
  }, onChanged: { addListener: cb => changes.push(cb) } } };
  if (together) w.eval(backdropSource);
  w.eval(source); await tick(); await tick();
  io?.([{ isIntersecting: true }]);
  return { w, dom, callbacks, errors, writes, original, originalMarkup, clicks: () => clicks,
    host: () => w.document.getElementById('uc-unova-terminal'), shadow: () => w.document.getElementById('uc-unova-terminal')?.shadowRoot,
    visible: v => io([{ isIntersecting: v }]),
    hide: v => { hidden = v; w.document.dispatchEvent(new w.Event('visibilitychange')); },
    reduce: v => { media.matches = v; mediaListeners.forEach(cb => cb()); },
    change: values => { const delta = Object.fromEntries(Object.entries(values).map(([k,v]) => [k,{newValue:v}])); data = {...data,...values}; changes.forEach(cb => cb(delta,'local')); },
    step: time => { const pending = [...callbacks]; callbacks.clear(); pending.forEach(([,cb]) => cb(time)); }
  };
}

(async () => {
  const manifest = JSON.parse(readFileSync(root + '/manifest.json'));
  assert.equal(manifest.version, '1.2.0');
  assert.deepEqual(manifest.content_scripts[0].js, ['content.js', 'terminal.js']);
  assert.deepEqual(manifest.permissions, ['storage']);
  postcss.parse(readFileSync(root + '/terminal.css', 'utf8'));
  pass('Manifest loads additive terminal without new permissions; CSS parses');
  const e = await env(); const s = e.shadow();
  assert.equal(e.host().parentElement.id, 'content');
  assert.equal(e.host(), e.w.document.getElementById('content').firstElementChild);
  assert.equal(e.w.document.getElementById('dashboard'), e.original);
  assert.equal(e.original.innerHTML, e.originalMarkup);
  e.w.document.getElementById('native').click(); assert.equal(e.clicks(),1);
  assert.equal(s.querySelector('#ascii-output').getAttribute('aria-hidden'), 'true');
  assert.equal(s.querySelector('#cpp-source').tabIndex, 0);
  assert.equal(s.querySelectorAll('.terminal-companions img').length, 5);
  pass('Top-of-content placement, native node/event preservation, accessible source and quiet ASCII');
  const shownSource = [...s.querySelectorAll('.code-line')].map(row => [...row.childNodes].filter(n => n.nodeType !== 1 || !n.classList.contains('line-number')).map(n => n.textContent).join('').trimEnd()).join('\n');
  assert.equal(shownSource, cpp);
  assert(s.querySelectorAll('.code-line').length > 80);
  pass('Entire syntax-highlighted C++ listing exactly matches the bundled source');
  const binary = process.env.UNOVA_TEST_RENDER;
  assert(binary, 'Run through npm test to compile the C++ renderer first');
  for (let index = 0; index <= 48; index++) {
    if (index) e.step(index * 84);
    const text = s.querySelector('#ascii-output').textContent;
    assert.equal(text + '\n', execFileSync(binary, [String(index)], {encoding:'utf8'}));
    assert.equal(text.split('\n').length,24);
    assert(text.split('\n').every(line => line.length === 64));
    assert.equal(e.callbacks.size,1);
  }
  pass('49 animated ASCII frames match compiled C++ character for character, one loop only');
  s.querySelector('#terminal-pause').click(); await tick();
  assert.equal(e.callbacks.size,0);
  assert(s.querySelector('#terminal-pause').textContent.includes('Resume'));
  assert([...s.querySelectorAll('img')].every(img => img.src.endsWith('.png')));
  assert.deepEqual(e.writes,[{[PAUSE]:true}]);
  s.querySelector('#terminal-pause').click(); await tick(); assert.equal(e.callbacks.size,1);
  pass('Terminal-only pause switches GIFs to PNGs and saves only its own preference');
  for (const operation of ['visible','hide','reduce']) {
    e[operation](operation === 'visible' ? false : true); assert.equal(e.callbacks.size,0);
    e[operation](operation === 'visible' ? true : false); assert.equal(e.callbacks.size,1);
  }
  e.change({[THEME]: {enabled:true,motion:false}}); assert.equal(e.callbacks.size,0); assert(s.querySelector('#terminal-pause').disabled);
  e.change({[THEME]: {enabled:false}}); assert(e.host().hidden);
  e.change({[THEME]: {enabled:true,backdrop:false,pokemon:false}}); assert(!e.host().hidden); assert.equal(e.callbacks.size,1); assert(s.querySelector('.terminal-companions').hidden);
  pass('Visibility, offscreen, reduced motion, master and Pokémon preferences; independent of backdrop switch');
  e.w.eval(source); await tick(); assert.equal(e.w.document.querySelectorAll('#uc-unova-terminal').length,1);
  e.host().remove(); await tick(); assert(e.host().isConnected);
  const nativeNew = e.w.document.createElement('div'); nativeNew.id='new-native'; e.host().parentElement.prepend(nativeNew); await tick();
  assert.equal(e.host().parentElement.firstElementChild,e.host()); assert(nativeNew.isConnected);
  e.w.dispatchEvent(new e.w.Event('pagehide')); assert.equal(e.callbacks.size,0);
  e.w.dispatchEvent(new e.w.PageTransitionEvent('pageshow',{persisted:true})); e.visible(true); assert.equal(e.callbacks.size,1);
  assert.deepEqual(e.errors,[]); e.dom.window.close();
  pass('No duplicate panel, remounts after native changes, back-forward cache resumes without errors');
  const combined = await env({together:true});
  assert.equal(combined.callbacks.size,2);
  const backHost = combined.w.document.getElementById('uc-unova-theme');
  assert.equal(backHost.parentElement,combined.w.document.body);
  const sceneBefore = backHost.shadowRoot.querySelector('#stage').outerHTML;
  combined.shadow().querySelector('#terminal-pause').click(); await tick();
  assert.equal(combined.callbacks.size,1);
  assert.equal(backHost.shadowRoot.querySelector('#stage').outerHTML,sceneBefore);
  combined.dom.window.close();
  pass('Both scripts coexist; terminal pause leaves the existing backdrop DOM and loop unchanged');
  for (const path of ['/courses/123','/courses/123/quizzes/7/take','/login','/conversations','/dashboard-extra']) {
    const x = await env({path}); assert(!x.host()); assert.equal(x.callbacks.size,0); x.dom.window.close();
  }
  for (const path of ['/?view=feed','/dashboard','/dashboard/']) {
    const x = await env({path,saved:{[PAUSE]:true}}); assert(x.host()); assert.equal(x.callbacks.size,0); x.dom.window.close();
  }
  const x = await env({late:true}); const content=x.w.document.createElement('main');content.id='content';x.w.document.body.append(content);await tick();assert(x.host());x.dom.window.close();
  pass('Only dashboard routes, saved pause, and late-mounted dashboard supported');
  console.log('\n'+count+' terminal check groups passed.');
})().catch(e => {console.error(e);process.exitCode=1;});
