# Verification

## Automated checks

Run `npm run check` and `npm test` with Node.js 24+ and C/C++17 compilers. The runner builds both examples with warnings treated as errors, runs the 15 backdrop and 9 terminal check groups, and removes the temporary binaries afterward.

Coverage includes dashboard-only guards, manifest permissions/resources, image signatures, CSS parsing, native node/event preservation, SVG geometry, animation progression, actual GIF pause, global/terminal preferences, persistence, reduced motion, visibility/offscreen suspension, duplicate/remount handling, and back-forward-cache recovery. Forty-nine terminal frames are compared character for character with the compiled C++ program. The entire visible C++ listing is also checked against its source file.

Repository packaging preserved the v1.2.0 extension files byte for byte. The installed Downloads copy was not moved or rewritten.

## Live QA still required

The prior full-page scene was observed in live MyUSF Canvas. The newer top terminal panel was tested in DOM simulation, but its live layout and responsive appearance have not yet been verified. Browser policy blocked automated extension-management access and the isolated local visual-preview page. No workaround was attempted.

After manually reloading the extension, check:

1. The panel appears at the top; source and ASCII output are readable.
2. Desktop and narrow layouts have no clipped output or overlapping controls.
3. Terminal pause leaves the existing backdrop running.
4. Global pause, reduced motion, and hidden-tab suspension behave as expected.
5. Native dashboard links/menus remain usable, without submitting or changing coursework during QA.

Canvas selector changes can require future compatibility updates. Passing simulated checks does not establish live visual correctness.
