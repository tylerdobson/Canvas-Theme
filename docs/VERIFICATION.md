# Verification

## Automated checks

Run `npm run check` and `npm test` with Node.js 24+ and C/C++17 compilers. The runner builds both examples with warnings treated as errors, runs the 15 backdrop and 9 terminal check groups, and removes the temporary binaries afterward.

Coverage includes dashboard-only guards, manifest permissions/resources, image signatures, CSS parsing, native node/event preservation, SVG geometry, animation progression, actual GIF pause, global/terminal preferences, persistence, reduced motion, visibility/offscreen suspension, duplicate/remount handling, and back-forward-cache recovery. Forty-nine terminal frames are compared character for character with the compiled C++ program. The entire visible C++ listing is also checked against its source file.

Repository packaging preserved the v1.2.0 extension files byte for byte. The installed Downloads copy was not moved or rewritten.

## Live screenshot verification

On September 15, 2026, the top C++/ASCII terminal and appearance controls were captured from the installed theme in live MyUSF Canvas at a 1512 × 805 desktop viewport. The screenshots show the source pane, rendered ASCII output, Pokémon strip, backdrop details, and complete settings panel. Opening and closing the theme controls was verified. Images were cropped at capture time to exclude all coursework, account/avatar, and browser-chrome regions; their exact scope is recorded in [screenshot notes](screenshots/README.md).

Earlier extension-management and local-file-preview attempts were blocked by browser policy. These new captures use the actual live Canvas page after the extension had been reloaded, not a workaround or a synthetic preview.

## Remaining live QA

The screenshots establish desktop appearance of the captured regions, not exhaustive browser compatibility or full-dashboard behavior. Still check:

1. All dashboard variants retain their intended layout.
2. Narrow/mobile layouts have no clipped output or overlapping controls.
3. Terminal pause leaves the existing backdrop running.
4. Global pause, reduced motion, and hidden-tab suspension behave as expected.
5. Native dashboard links/menus remain usable, without submitting or changing coursework during QA.

Canvas selector changes can require future compatibility updates. Passing simulated checks does not establish live visual correctness.
