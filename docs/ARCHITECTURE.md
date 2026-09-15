# Architecture

## Runtime

`extension/` is the canonical, directly loadable Manifest V3 extension. It has no build step, service worker, runtime npm dependencies, or external asset requests.

- `content.js` owns `#uc-unova-theme`, mounted beside the Canvas application under `document.body`. Its shadow root contains the fixed background scene and floating settings. `panel.css` remains confined to that root.
- `dashboard.css` is the only page-level stylesheet. Every theme rule is gated by dashboard-specific root attributes. It provides dark reading surfaces and leaves the scene visible in the margins.
- `terminal.js` independently prepends `#uc-unova-terminal` inside the dashboard content container. Its shadow root and `terminal.css` prevent style collisions with the existing backdrop. It adds no inputs capable of executing shell commands.
- `render.c` and `render.cpp` are standalone examples. Browser JavaScript reproduces the projection without compiling or executing those files.

Both content scripts use exact host/path/top-frame guards and mutation observers to preserve their own mounts when Canvas refreshes its UI. They never replace native assignment nodes. The terminal's frame loop additionally pauses through IntersectionObserver when it scrolls out of view.

## Preferences

`unovaDashboardPreferences` contains enabled, backdrop, skyline, code, wireframe, pokemon, motion, and intensity. `unovaTerminalPaused` is a separate boolean, so its pause control does not change the backdrop. All values are stored through `chrome.storage.local`.

## Source synchronization

The complete C++ listing is embedded as text in `terminal.js`. If `render.cpp` changes, update the embedded `CPP_SOURCE` too. Tests require exact text equality and compare 49 output frames against the compiled C++ implementation.

## Packaging boundary

Tests and scripts are development-only. The ZIP contains only `extension/` contents with `manifest.json` at its root. Documentation, Git history, npm dependencies, local paths, caches, credentials, and compiled test binaries are excluded.
