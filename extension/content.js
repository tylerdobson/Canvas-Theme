(() => {
  'use strict';

  // This presentation-only extension runs on the dashboard, never in courses,
  // assignments, quizzes, conversations, sign-in pages, or embedded tools.
  if (location.hostname !== 'usflearn.instructure.com' ||
      !/^\/(?:dashboard\/?)?$/.test(location.pathname) || window.top !== window) return;
  const ROOT_ID = 'uc-unova-theme';
  if (document.getElementById(ROOT_ID)) return;
  const KEY = 'unovaDashboardPreferences';
  const SWITCHES = ['enabled', 'backdrop', 'skyline', 'code', 'wireframe', 'pokemon', 'motion'];
  const DEFAULTS = { enabled: true, backdrop: true, skyline: true, code: true, wireframe: true, pokemon: true, motion: true, intensity: 80 };
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const species = ['snivy', 'tepig', 'oshawott', 'zorua', 'chandelure'];
  let settings = { ...DEFAULTS };
  let shadow, host, mesh, stage, panel, gear, frame = 0, lastTime = 0, phase = 0;
  let saveQueue = Promise.resolve();
  const asset = path => chrome.runtime.getURL(path);
  const activeMotion = () => settings.enabled && settings.backdrop && settings.motion &&
    (settings.pokemon || settings.code || settings.wireframe) && !reduced.matches && !document.hidden;

  function normalize(value) {
    const result = { ...DEFAULTS };
    for (const key of SWITCHES) if (typeof value?.[key] === 'boolean') result[key] = value[key];
    if (Number.isFinite(value?.intensity)) result.intensity = Math.max(25, Math.min(100, value.intensity));
    return result;
  }

  function save() {
    const value = { ...settings };
    saveQueue = saveQueue.catch(() => {}).then(() => chrome.storage.local.set({ [KEY]: value }));
    saveQueue.catch(() => {
      shadow.querySelector('#save-status').textContent = 'Applied now; could not save settings for next time.';
    });
  }

  // Same torus geometry and rotations as render.c, projected into SVG paths.
  // The browser runs JavaScript; the bundled C example remains a standalone file.
  function wireframePath(a, b) {
    const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
    const project = (u, v) => {
      const r = 1.6 + .6 * Math.cos(v);
      const x = r * Math.cos(u), y = r * Math.sin(u), z = .6 * Math.sin(v);
      const y1 = y * ca - z * sa, z1 = y * sa + z * ca;
      const x2 = x * cb + z1 * sb, z2 = -x * sb + z1 * cb;
      const inverse = 1 / (z2 + 6);
      return (250 + 480 * x2 * inverse).toFixed(2) + ' ' + (250 - 480 * y1 * inverse).toFixed(2);
    };
    let d = '';
    for (let ring = 0; ring < 10; ring++) {
      const v = ring / 10 * Math.PI * 2;
      for (let point = 0; point <= 64; point++)
        d += (point ? 'L' : 'M') + project(point / 64 * Math.PI * 2, v);
      d += 'Z';
    }
    for (let segment = 0; segment < 20; segment++) {
      const u = segment / 20 * Math.PI * 2;
      for (let point = 0; point <= 24; point++)
        d += (point ? 'L' : 'M') + project(u, point / 24 * Math.PI * 2);
      d += 'Z';
    }
    return d;
  }

  function animate(time) {
    frame = 0;
    if (!activeMotion() || !settings.wireframe) return;
    if (time - lastTime >= 80) {
      phase += Math.min((time - lastTime) / 1000, .12);
      lastTime = time;
      mesh.setAttribute('d', wireframePath(.6 + phase * .22, phase * .16));
    }
    frame = requestAnimationFrame(animate);
  }

  function syncMotion() {
    cancelAnimationFrame(frame);
    frame = 0;
    const moving = activeMotion();
    stage.dataset.moving = String(moving);
    for (const img of shadow.querySelectorAll('.pokemon img')) {
      // Changing to PNG truly pauses GIF playback. Do not reload unchanged GIFs
      // while the intensity slider moves.
      const url = asset('assets/' + img.dataset.species + '.' + (moving && settings.pokemon ? 'gif' : 'png'));
      if (img.getAttribute('src') !== url) img.src = url;
    }
    const pause = shadow.querySelector('#motion-toggle');
    pause.textContent = settings.motion ? 'Pause animation' : 'Resume animation';
    pause.disabled = reduced.matches || !settings.enabled || !settings.backdrop;
    pause.title = reduced.matches ? 'Your system prefers reduced motion.' : '';
    shadow.querySelector('#motion-note').textContent = reduced.matches
      ? 'System reduced-motion preference is active.' : 'Animations pause automatically in background tabs.';
    if (moving && settings.wireframe) {
      lastTime = performance.now();
      frame = requestAnimationFrame(animate);
    }
  }

  function apply() {
    const root = document.documentElement;
    root.toggleAttribute('data-uc-dark', settings.enabled);
    root.toggleAttribute('data-uc-backdrop', settings.enabled && settings.backdrop);
    if (!shadow) return;
    stage.hidden = !(settings.enabled && settings.backdrop);
    for (const key of ['skyline', 'code', 'wireframe', 'pokemon']) stage.dataset[key] = String(settings[key]);
    stage.style.setProperty('--scene-opacity', String(settings.intensity / 100));
    gear.classList.toggle('disabled-theme', !settings.enabled);
    for (const key of SWITCHES) shadow.getElementById(key).checked = settings[key];
    shadow.getElementById('intensity').value = settings.intensity;
    shadow.getElementById('intensity-value').textContent = settings.intensity + '%';
    syncMotion();
  }

  function togglePanel(open) {
    panel.hidden = !open;
    gear.setAttribute('aria-expanded', String(open));
    if (open) shadow.getElementById('enabled').focus();
    else gear.focus();
  }

  function showSource(container) {
    const excerpt = [
      '// render.c — Unova after dark',
      '#include <math.h>',
      '#include <stdio.h>',
      '',
      'static void render(double a, double b) {',
      '  double ca = cos(a), sa = sin(a);',
      '  double cb = cos(b), sb = sin(b);',
      '',
      '  for (double u = 0; u < 6.28318; u += .075) {',
      '    double cu = cos(u), su = sin(u);',
      '    for (double v = 0; v < 6.28318; v += .11) {',
      '      double r = 1.6 + .6 * cos(v);',
      '      double x = r * cu, y = r * su;',
      '      // rotate, project, illuminate',
      '    }',
      '  }',
      '}',
      '',
      'int main(void) {',
      '  for (int frame = 0; frame < 360; ++frame) {',
      '    double t = frame / 12.0;',
      '    render(.6 + t * .52, t * .31);',
      '  }',
      '  return 0;',
      '}'
    ];
    const pattern = /(\/\/.*$|#[a-z]+|<[^>]+>|\b(?:static|int|double|void|for|return)\b|\b\d+(?:\.\d+)?f?\b|\b(?:main|render|cos|sin)\b)/g;
    excerpt.forEach((line, index) => {
      const row = document.createElement('div');
      row.className = 'code-line';
      const number = document.createElement('span');
      number.className = 'line-number';
      number.textContent = String(index + 1).padStart(2, '0');
      row.append(number);
      let end = 0;
      for (const token of line.matchAll(pattern)) {
        row.append(document.createTextNode(line.slice(end, token.index)));
        const span = document.createElement('span'), text = token[0];
        span.className = text.startsWith('//') ? 'comment' : text.startsWith('<') ? 'header-token' :
          /^\d/.test(text) ? 'number' : /^(render|main|cos|sin)$/.test(text) ? 'function' : 'keyword';
        span.textContent = text;
        row.append(span);
        end = token.index + text.length;
      }
      row.append(document.createTextNode(line.slice(end) || (line ? '' : ' ')));
      container.append(row);
    });
  }

  function mount() {
    if (!document.getElementById('content') && !document.getElementById('dashboard')) return false;
    // Mount beside Canvas, outside React's content container. This creates no
    // header or empty layout space and puts the fixed scene behind the app.
    if (host) {
      if (!host.isConnected) document.body.append(host);
      return true;
    }
    host = document.createElement('section');
    host.id = ROOT_ID;
    host.setAttribute('aria-label', 'Unova dashboard theme controls');
    shadow = host.attachShadow({ mode: 'open' });
    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = asset('panel.css');
    shadow.append(stylesheet);
    const body = document.createElement('div');
    // Static extension markup only. Never copies or replaces Canvas content.
    body.innerHTML = [
      '<div id="stage" aria-hidden="true" inert>',
        '<div class="skyline-layer"><img id="skyline-art" alt="" draggable="false"></div>',
        '<div class="night-vignette"></div>',
        '<div class="source-pane"><span class="source-label">C &nbsp; render.c</span><pre id="source"></pre></div>',
        '<div class="wireframe-pane"><svg viewBox="0 0 500 500" fill="none"><path id="mesh"></path></svg></div>',
        '<div class="wireframe-echo" aria-hidden="true"></div>',
        '<div class="pokemon"></div>',
      '</div>',
      '<button id="gear" type="button" aria-expanded="false" aria-controls="settings">Canvas theme</button>',
      '<section id="settings" hidden aria-label="Canvas theme settings">',
        '<header><strong>Unova after dark</strong><button id="close-settings" type="button" aria-label="Close theme settings">×</button></header>',
        '<label><span>Enable theme</span><input id="enabled" type="checkbox"></label>',
        '<label><span>Full-page backdrop</span><input id="backdrop" type="checkbox"></label>',
        '<label><span>Night skyline</span><input id="skyline" type="checkbox"></label>',
        '<label><span>Faint C code</span><input id="code" type="checkbox"></label>',
        '<label><span>Wireframe rendering</span><input id="wireframe" type="checkbox"></label>',
        '<label><span>Pokémon at the edges</span><input id="pokemon" type="checkbox"></label>',
        '<label><span>Animations</span><input id="motion" type="checkbox"></label>',
        '<label for="intensity">Backdrop intensity <output id="intensity-value">80%</output></label>',
        '<input id="intensity" type="range" min="25" max="100" step="5">',
        '<p id="motion-note"></p><p id="save-status" role="status"></p>',
        '<div class="settings-actions"><button id="motion-toggle" type="button">Pause animation</button><button id="reset" type="button">Reset</button></div>',
      '</section>'
    ].join('');
    shadow.append(body);
    stage = shadow.getElementById('stage');
    mesh = shadow.getElementById('mesh');
    panel = shadow.getElementById('settings');
    gear = shadow.getElementById('gear');
    shadow.getElementById('skyline-art').src = asset('assets/unova-skyline.png');
    mesh.setAttribute('d', wireframePath(.6, 0));
    showSource(shadow.getElementById('source'));
    species.forEach((name, index) => {
      const figure = document.createElement('figure');
      figure.className = 'companion ' + name;
      figure.style.setProperty('--offset', (index * -.47) + 's');
      const img = document.createElement('img');
      img.dataset.species = name;
      img.alt = '';
      img.width = name === 'chandelure' ? 76 : 54;
      img.height = 60;
      img.draggable = false;
      figure.append(img);
      shadow.querySelector('.pokemon').append(figure);
    });
    gear.addEventListener('click', () => togglePanel(panel.hidden));
    shadow.getElementById('close-settings').addEventListener('click', () => togglePanel(false));
    shadow.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !panel.hidden) { event.stopPropagation(); togglePanel(false); }
    });
    shadow.getElementById('motion-toggle').addEventListener('click', () => {
      settings.motion = !settings.motion; apply(); save();
    });
    for (const key of SWITCHES) shadow.getElementById(key).addEventListener('change', event => {
      settings[key] = event.target.checked; apply(); save();
    });
    shadow.getElementById('intensity').addEventListener('input', event => {
      settings.intensity = Number(event.target.value); apply();
    });
    shadow.getElementById('intensity').addEventListener('change', save);
    shadow.getElementById('reset').addEventListener('click', () => {
      settings = { ...DEFAULTS }; apply(); save();
    });
    document.addEventListener('visibilitychange', syncMotion);
    reduced.addEventListener('change', syncMotion);
    apply();
    document.body.append(host);
    return true;
  }

  async function init() {
    try { settings = normalize((await chrome.storage.local.get(KEY))[KEY]); }
    catch { settings = { ...DEFAULTS }; }
    apply();
    if (document.readyState === 'loading') await new Promise(resolve =>
      document.addEventListener('DOMContentLoaded', resolve, { once: true }));
    mount();
    const observer = new MutationObserver(() => { if (!host?.isConnected) mount(); });
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('pagehide', () => { cancelAnimationFrame(frame); observer.disconnect(); });
    window.addEventListener('pageshow', event => {
      if (event.persisted) {
        observer.observe(document.body, { childList: true, subtree: true });
        if (shadow) syncMotion();
      }
    });
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes[KEY]) { settings = normalize(changes[KEY].newValue); apply(); }
    });
  }
  init().catch(error => console.warn('Unova theme could not initialize:', error.message));
})();
