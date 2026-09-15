# Installation and updates

## From the repository

Download or clone the repository. In Chrome's `chrome://extensions` page, enable Developer mode, choose **Load unpacked**, and select `extension/`. Refresh the MyUSF Canvas dashboard and scroll to the top. This uses Chrome's [local extension workflow](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked).

Do not load the repository root. No localhost server, Canvas admin permissions, or npm setup is needed to use the extension. The changes apply only in the browser profile where the extension is installed.

## From a package

Run `npm run package` after installing development dependencies. Extract the resulting `dist/canvas-theme-<version>.zip`, then load the extracted directory that contains `manifest.json`. Chrome does not load the ZIP itself as an unpacked extension.

## Existing installation

The original Downloads installation was preserved when this repository was packaged. You may keep using it, but later repository edits will not automatically update that separate copy. To switch, disable the old extension, then load this repository's `extension/` directory. Chrome treats different unpacked paths as different installations, so local appearance preferences may need to be selected again.

## Updating

Keep the installed folder in place. After pulling changes, click **Reload** on the extension's Chrome card, then refresh Canvas. Manifest changes also require this extension reload.

## Controls

**Canvas theme**, at the bottom right, controls the master theme, skyline, backdrop code, wireframe, Pokémon, animation, and intensity. **Pause terminal**, at the top, pauses only that panel. The global animation preference and system reduced-motion preference override terminal playback. The panel continues to appear when only the backdrop is disabled.

## Removal

Turn off the theme in its settings, or disable/remove the extension in Chrome. No coursework or account settings need to be restored. Extension-management actions must be performed manually when browser automation policies block them.
