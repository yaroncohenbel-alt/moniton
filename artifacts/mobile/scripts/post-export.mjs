/**
 * post-export.mjs
 *
 * Runs automatically after every `expo export --platform web`.
 * Expo export wipes index.html and icon files on every run.
 * This script restores everything and stamps a new cache-bust version.
 *
 * Usage (called by `pnpm run build:web`):
 *   node scripts/post-export.mjs
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT        = path.resolve(__dirname, '..');
const STATIC_DIR  = path.join(ROOT, 'static-build', 'web');
const TEMPLATES   = path.join(ROOT, 'server', 'templates');
const ASSETS      = path.join(ROOT, 'assets', 'images');
const VERSION_FILE = path.join(ROOT, 'server', 'pwa-version.json');

// ── 1. Version for this build ────────────────────────────────────────────────
// Human-readable version number.  Bump this manually before deploying a new build
// so installed PWAs that are stuck on an old Service Worker receive a forced update.
const version   = '29';
const cacheName = `taximeter-v${version}`;
const swUrl     = `/sw.js?v=${version}`;

console.log(`[post-export] version=${version}  cacheName=${cacheName}`);

// ── 2. Find the bundle filename from the exported index.html ──────────────────
const exportedHtml = fs.readFileSync(path.join(STATIC_DIR, 'index.html'), 'utf-8');
const bundleMatch  = exportedHtml.match(/src="(\/_expo\/static\/js\/web\/entry-[^"]+\.js)"/);
if (!bundleMatch) {
  console.error('[post-export] ERROR: cannot find bundle src in exported index.html');
  process.exit(1);
}
const bundleSrc = bundleMatch[1];
console.log(`[post-export] bundle=${bundleSrc}`);

// ── 3. Verify sw.js template CACHE_NAME matches our version ───────────────────
// We no longer stamp a timestamp — the version is a human-readable number managed
// manually.  Just ensure the template already has the right CACHE_NAME; if not,
// patch it so template and index.html stay in sync.
const swTemplate = fs.readFileSync(path.join(TEMPLATES, 'sw.js'), 'utf-8');
const updatedSw  = swTemplate.replace(
  /const CACHE_NAME = '[^']+';/,
  `const CACHE_NAME = '${cacheName}';`
);
fs.writeFileSync(path.join(TEMPLATES, 'sw.js'), updatedSw, 'utf-8');
console.log('[post-export] sw.js template updated');

// ── 4. Write pwa-version.json (read by serve.js at runtime) ──────────────────
fs.writeFileSync(VERSION_FILE, JSON.stringify({ version, cacheName, swUrl, bundleSrc }), 'utf-8');
console.log('[post-export] pwa-version.json written');

// ── 5. Write the full custom index.html (replaces expo's stripped version) ────
const html = `<!DOCTYPE html>
<html lang="he">
  <head>
    <meta charset="utf-8" />
    <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
    <title>Taxi Meter Pro</title>
    <link rel="manifest" href="/manifest.json" />
    <link rel="icon" href="/favicon.ico" />
    <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
    <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
    <link rel="apple-touch-icon" href="/icon-192.png" />
    <link rel="apple-touch-icon" sizes="192x192" href="/icon-192.png" />
    <link rel="apple-touch-icon" sizes="512x512" href="/icon-512.png" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Taxi Meter Pro" />
    <meta name="mobile-web-app-capable" content="yes" />
    <style id="expo-reset">
      html, body { height: 100%; }
      body { overflow: hidden; }
      #root { display: flex; height: 100%; flex: 1; }
    </style>
    <meta name="theme-color" content="#FFD60A">
    <meta name="description" content="מחשבון מונית חכם לישראל">
    <script>
(function(){
  if('serviceWorker'in navigator){navigator.serviceWorker.getRegistrations().then(function(r){r.forEach(function(reg){reg.unregister();})});}
  if('caches'in window){caches.keys().then(function(n){n.forEach(function(name){caches.delete(name);})});}
})();
    </script>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
    <script src="${bundleSrc}" defer></script>
    <script>
(function () {
  if (!('serviceWorker' in navigator)) return;
  var SW_URL = '${swUrl}';
  var reloading = false;

  // Only reload when a NEW controller takes over a tab that already had one.
  // Avoids a false reload loop on first install (no previous controller).
  var hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (!hadController) { hadController = true; return; }
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });
  navigator.serviceWorker.addEventListener('message', function (e) {
    if (e.data && e.data.type === 'SW_ACTIVATED' && hadController && !reloading) {
      reloading = true;
      window.location.reload();
    }
  });

  window.addEventListener('load', function () {
    // Evict every old SW whose scriptURL does not end with the current SW_URL.
    navigator.serviceWorker.getRegistrations().then(function (regs) {
      var evictions = regs.filter(function (r) {
        var url = (r.active || r.installing || r.waiting || {}).scriptURL || '';
        return !url.endsWith(SW_URL);
      }).map(function (r) { return r.unregister(); });
      return Promise.all(evictions);
    }).then(function () {
      return navigator.serviceWorker.register(SW_URL, { scope: '/', updateViaCache: 'none' });
    }).then(function (reg) {
      // Force-activate any SW already waiting (e.g. from a previous load)
      if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });

      // Check for a new SW version immediately on every launch — bypasses
      // browser HTTP cache because updateViaCache:'none' was set above.
      reg.update();

      // Push skip-waiting to any new SW the moment it finishes installing
      reg.addEventListener('updatefound', function () {
        var n = reg.installing;
        if (!n) return;
        n.addEventListener('statechange', function () {
          if (n.state === 'installed') n.postMessage({ type: 'SKIP_WAITING' });
        });
      });

      // Also poll every 30 s so long-running sessions stay fresh
      setInterval(function () { reg.update(); }, 30000);
    }).catch(function (err) { console.warn('[PWA] SW failed:', err); });
  });
})();
    </script>
  </body>
</html>
`;
fs.writeFileSync(path.join(STATIC_DIR, 'index.html'), html, 'utf-8');
console.log('[post-export] index.html written');

// ── 6. Restore taxi icons (expo export overwrites favicon.ico only) ───────────
const icons = [
  ['icon.png',     'icon.png'],
  ['icon-192.png', 'icon-192.png'],
  ['icon-512.png', 'icon-512.png'],
  ['favicon.png',  'favicon.png'],
];
for (const [src, dst] of icons) {
  const srcPath = path.join(ASSETS, src);
  const dstPath = path.join(STATIC_DIR, dst);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, dstPath);
    console.log(`[post-export] icon restored: ${dst}`);
  } else {
    console.warn(`[post-export] WARNING: icon source not found: ${srcPath}`);
  }
}

console.log(`[post-export] ✓ done — build version ${version}`);
