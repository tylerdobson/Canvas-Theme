(() => {
  'use strict';

  // Independent, additive top panel. The v1.1 backdrop is not modified.
  if (location.hostname !== 'usflearn.instructure.com' ||
      !/^\/(?:dashboard\/?)?$/.test(location.pathname) || window.top !== window) return;
  const ROOT_ID = 'uc-unova-terminal';
  if (document.getElementById(ROOT_ID) || globalThis.__ucUnovaTerminalStarted) return;
  globalThis.__ucUnovaTerminalStarted = true;
  const THEME_KEY = 'unovaDashboardPreferences';
  const PAUSE_KEY = 'unovaTerminalPaused';
  const CPP_SOURCE = "// render.cpp -- Unova terminal / a study in light and motion\n// Build: c++ -std=c++17 -O2 render.cpp -o render\n// Run: ./render        Single frame: ./render 0\n#include <algorithm>\n#include <array>\n#include <chrono>\n#include <cmath>\n#include <iostream>\n#include <string>\n#include <thread>\n\nnamespace unova {\nconstexpr int width = 64;\nconstexpr int height = 24;\nconstexpr double tau = 6.283185307179586;\nconstexpr double fps = 12.0;\nconstexpr char shades[] = \".,-~:;=!*#$@\";\n\nclass AsciiRenderer {\n    std::array<char, width * height> pixels{};\n    std::array<double, width * height> depth{};\n\npublic:\n    std::string render(double a, double b) {\n        pixels.fill(' ');\n        depth.fill(0.0);\n        const double ca = std::cos(a), sa = std::sin(a);\n        const double cb = std::cos(b), sb = std::sin(b);\n\n        // Sample the surface of a torus in two angles.\n        for (double u = 0; u < tau; u += .075) {\n            const double cu = std::cos(u), su = std::sin(u);\n            for (double v = 0; v < tau; v += .11) {\n                const double cv = std::cos(v), sv = std::sin(v);\n                const double radius = 1.6 + .6 * cv;\n                const double x = radius * cu, y = radius * su;\n                const double z = .6 * sv;\n\n                // Rotate around X, then Y; project to the screen.\n                const double y1 = y * ca - z * sa;\n                const double z1 = y * sa + z * ca;\n                const double x2 = x * cb + z1 * sb;\n                const double z2 = -x * sb + z1 * cb;\n                const double inverse = 1.0 / (z2 + 6.0);\n                const int col = static_cast<int>(\n                    std::floor(width / 2 + 44 * x2 * inverse));\n                const int row = static_cast<int>(\n                    std::floor(height / 2 - 22 * y1 * inverse));\n                if (col < 0 || col >= width || row < 0 || row >= height)\n                    continue;\n\n                // A depth buffer keeps only the nearest surface.\n                const int index = row * width + col;\n                if (inverse <= depth[index]) continue;\n                depth[index] = inverse;\n\n                // Transform the normal and shade with a fixed light.\n                const double ny = su * cv * ca - sv * sa;\n                const double nz1 = su * cv * sa + sv * ca;\n                const double nz = -cu * cv * sb + nz1 * cb;\n                const double light = std::clamp(.3 + .45 * ny - .5 * nz, 0.0, 1.0);\n                pixels[index] = shades[static_cast<int>(light * 11)];\n            }\n        }\n\n        std::string screen;\n        screen.reserve((width + 1) * height);\n        for (int row = 0; row < height; ++row) {\n            screen.append(pixels.data() + row * width, width);\n            screen.push_back('\\n');\n        }\n        return screen;\n    }\n};\n} // namespace unova\n\nint main(int argc, char* argv[]) {\n    unova::AsciiRenderer renderer;\n    // An optional frame index makes the output deterministic for testing.\n    if (argc == 2) {\n        try {\n            const double t = std::stod(argv[1]) / unova::fps;\n            if (!std::isfinite(t) || t < 0) return 1;\n            std::cout << renderer.render(.6 + t * .52, t * .31);\n            return 0;\n        } catch (...) { return 1; }\n    }\n    if (argc != 1) return 1;\n\n    // Redraw the same terminal area for a 30-second animation.\n    std::cout << \"\\x1b[2J\";\n    for (int frame = 0; frame < 360; ++frame) {\n        const auto next = std::chrono::steady_clock::now()\n            + std::chrono::milliseconds(83);\n        const double t = frame / unova::fps;\n        std::cout << \"\\x1b[H\" << renderer.render(.6 + t * .52, t * .31)\n                  << std::flush;\n        std::this_thread::sleep_until(next);\n    }\n    return 0;\n}";
  const species = ['snivy', 'tepig', 'oshawott', 'zorua', 'chandelure'];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const asset = path => chrome.runtime.getURL(path);
  let enabled = true, motion = true, pokemon = true, paused = false;
  let host, shadow, output, pause, state, companions, visibilityObserver;
  let visible = true, pageActive = true, frame = 0, lastTime = 0, frameIndex = 0;
  let saveQueue = Promise.resolve();
  const moving = () => enabled && motion && !paused && !reduced.matches &&
    !document.hidden && visible && pageActive && host?.isConnected;

  function readTheme(value) {
    enabled = value?.enabled !== false;
    motion = value?.motion !== false;
    pokemon = value?.pokemon !== false;
  }

  function asciiFrame(a, b) {
    const width = 64, height = 24;
    const pixels = Array(width * height).fill(' ');
    const depth = new Float64Array(width * height);
    const shades = '.,-~:;=!*#$@';
    const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
    for (let u = 0; u < Math.PI * 2; u += .075) {
      const cu = Math.cos(u), su = Math.sin(u);
      for (let v = 0; v < Math.PI * 2; v += .11) {
        const cv = Math.cos(v), sv = Math.sin(v);
        const radius = 1.6 + .6 * cv;
        const x = radius * cu, y = radius * su, z = .6 * sv;
        const y1 = y * ca - z * sa, z1 = y * sa + z * ca;
        const x2 = x * cb + z1 * sb, z2 = -x * sb + z1 * cb;
        const inverse = 1 / (z2 + 6);
        const col = Math.floor(width / 2 + 44 * x2 * inverse);
        const row = Math.floor(height / 2 - 22 * y1 * inverse);
        if (col < 0 || col >= width || row < 0 || row >= height) continue;
        const index = row * width + col;
        if (inverse <= depth[index]) continue;
        depth[index] = inverse;
        const ny = su * cv * ca - sv * sa;
        const nz1 = su * cv * sa + sv * ca;
        const nz = -cu * cv * sb + nz1 * cb;
        const light = Math.max(0, Math.min(1, .3 + .45 * ny - .5 * nz));
        pixels[index] = shades[Math.floor(light * (shades.length - 1))];
      }
    }
    const lines = [];
    for (let row = 0; row < height; row++) lines.push(pixels.slice(row * width, (row + 1) * width).join(''));
    return lines.join('\n');
  }


  function animate(time) {
    frame = 0;
    if (!moving()) return;
    if (time - lastTime >= 1000 / 12) {
      lastTime = time;
      const t = ++frameIndex / 12;
      output.textContent = asciiFrame(.6 + t * .52, t * .31);
    }
    frame = requestAnimationFrame(animate);
  }

  function sync() {
    if (!shadow) return;
    cancelAnimationFrame(frame);
    frame = 0;
    host.hidden = !enabled;
    companions.hidden = !pokemon;
    const playing = Boolean(moving());
    pause.textContent = paused ? 'Resume terminal' : 'Pause terminal';
    pause.setAttribute('aria-pressed', String(paused));
    pause.disabled = !enabled || !motion || reduced.matches;
    pause.title = reduced.matches ? 'System reduced motion is enabled.' :
      !motion ? 'Animations are disabled in Canvas theme settings.' : 'Only affects this top panel.';
    state.textContent = reduced.matches ? 'Reduced motion' :
      !motion || paused ? 'Paused' : !visible || document.hidden || !pageActive ? 'Standby' : '12 FPS · live preview';
    for (const img of shadow.querySelectorAll('.terminal-companions img')) {
      const url = asset('assets/' + img.dataset.species + '.' + (playing && pokemon ? 'gif' : 'png'));
      if (img.getAttribute('src') !== url) img.src = url;
    }
    if (playing) {
      lastTime = performance.now();
      frame = requestAnimationFrame(animate);
    }
  }

  function highlightSource() {
    const source = shadow.getElementById('cpp-source');
    const pattern = /(\/\/.*$|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|#[a-z]+|<\w+>|\b(?:namespace|constexpr|class|public|const|int|double|char|for|if|continue|return|try|catch|auto|static_cast)\b|\b\d+(?:\.\d+)?\b|\b[A-Za-z_]\w*(?=\())/g;
    CPP_SOURCE.split('\n').forEach((line, index) => {
      const row = document.createElement('span');
      row.className = 'code-line';
      const number = document.createElement('span');
      number.className = 'line-number';
      number.setAttribute('aria-hidden', 'true');
      number.textContent = String(index + 1);
      row.append(number);
      let end = 0;
      for (const token of line.matchAll(pattern)) {
        row.append(document.createTextNode(line.slice(end, token.index)));
        const span = document.createElement('span'), text = token[0];
        span.className = text.startsWith('//') ? 'comment' :
          /^["'<]/.test(text) ? 'literal' : /^\d/.test(text) ? 'number' :
          line[token.index + text.length] === '(' ? 'function' : 'keyword';
        span.textContent = text;
        row.append(span);
        end = token.index + text.length;
      }
      row.append(document.createTextNode(line.slice(end) || (line ? '' : ' ')));
      source.append(row);
    });
  }

  function mount() {
    const target = document.getElementById('content') || document.getElementById('dashboard');
    if (!target) return;
    if (!host) {
      host = document.createElement('section');
      host.id = ROOT_ID;
      host.setAttribute('aria-label', 'Unova C++ terminal');
      // Independent shadow root prevents selectors from either theme leaking in.
      shadow = host.attachShadow({ mode: 'open' });
      const style = document.createElement('link');
      style.rel = 'stylesheet';
      style.href = asset('terminal.css');
      shadow.append(style);
      const body = document.createElement('div');
      body.className = 'workbench';
      body.innerHTML = [
        '<header class="tab-strip">',
          '<div class="source-tab"><span class="cpp-icon" aria-hidden="true">C++</span> render.cpp</div>',
          '<span class="workspace-label">UNOVA / GEN V</span>',
          '<button id="terminal-pause" type="button" aria-pressed="false">Pause terminal</button>',
        '</header>',
        '<div class="split-view">',
          '<div class="editor">',
            '<div class="breadcrumbs">unova / src / render.cpp</div>',
            '<pre id="cpp-source" tabindex="0" aria-label="Complete C++ source, scroll to read"></pre>',
          '</div>',
          '<section class="terminal" aria-label="ASCII render terminal preview">',
            '<div class="terminal-heading"><span>TERMINAL</span><span>C++17 / preview</span></div>',
            '<div class="command"><span class="prompt">unova@canvas:~$</span> ./render</div>',
            '<div class="compile-note">JavaScript preview of the bundled C++ renderer</div>',
            '<div class="ascii-wrap"><pre id="ascii-output" aria-hidden="true"></pre></div>',
            '<span class="sr-only">Animated ASCII torus, using the same projection as render.cpp. Use Pause terminal to freeze the output.</span>',
          '</section>',
        '</div>',
        '<div class="terminal-companions" aria-label="Unova Pokémon"></div>',
        '<footer class="scene-status"><span><span class="status-dot" aria-hidden="true"></span>VS Code / Dark+</span><span id="terminal-state">12 FPS · live preview</span><span>UTF-8 &nbsp; C++</span></footer>'
      ].join('');
      shadow.append(body);
      output = shadow.getElementById('ascii-output');
      pause = shadow.getElementById('terminal-pause');
      state = shadow.getElementById('terminal-state');
      companions = shadow.querySelector('.terminal-companions');
      output.textContent = asciiFrame(.6, 0);
      highlightSource();
      for (const name of species) {
        const figure = document.createElement('figure');
        const img = document.createElement('img');
        img.dataset.species = name;
        img.alt = '';
        img.width = 46; img.height = 48; img.draggable = false;
        const label = document.createElement('figcaption');
        label.textContent = name[0].toUpperCase() + name.slice(1);
        figure.append(img, label);
        companions.append(figure);
      }
      pause.addEventListener('click', () => {
        paused = !paused;
        sync();
        const value = paused;
        saveQueue = saveQueue.catch(() => {}).then(() => chrome.storage.local.set({ [PAUSE_KEY]: value }));
        saveQueue.catch(() => { state.textContent = 'Applied · preference not saved'; });
      });
      if ('IntersectionObserver' in window) {
        visible = false;
        visibilityObserver = new IntersectionObserver(entries => {
          visible = entries.some(entry => entry.isIntersecting);
          sync();
        }, { threshold: 0 });
        visibilityObserver.observe(host);
      }
    }
    if (host.parentElement !== target || target.firstElementChild !== host) {
      target.prepend(host); // Add only our panel; never replace native children.
      sync();
    }
  }

  async function init() {
    try {
      const saved = await chrome.storage.local.get([THEME_KEY, PAUSE_KEY]);
      readTheme(saved[THEME_KEY]);
      paused = saved[PAUSE_KEY] === true;
    } catch { /* Safe defaults if browser storage is temporarily unavailable. */ }
    if (document.readyState === 'loading') await new Promise(resolve =>
      document.addEventListener('DOMContentLoaded', resolve, { once: true }));
    mount();
    const observer = new MutationObserver(mount);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('visibilitychange', sync);
    reduced.addEventListener('change', sync);
    window.addEventListener('pagehide', () => {
      pageActive = false; sync(); observer.disconnect(); visibilityObserver?.disconnect();
    });
    window.addEventListener('pageshow', event => {
      if (event.persisted) {
        pageActive = true;
        observer.observe(document.body, { childList: true, subtree: true });
        mount();
        if (host) visibilityObserver?.observe(host);
        sync();
      }
    });
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return;
      if (changes[THEME_KEY]) readTheme(changes[THEME_KEY].newValue);
      if (changes[PAUSE_KEY]) paused = changes[PAUSE_KEY].newValue === true;
      if (changes[THEME_KEY] || changes[PAUSE_KEY]) sync();
    });
  }
  init().catch(error => console.warn('Unova terminal could not initialize:', error.message));
})();

