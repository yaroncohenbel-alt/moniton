/**
 * Standalone production server for Expo static builds.
 *
 * Routes:
 *   GET /manifest.json              → PWA manifest
 *   GET /sw.js                      → Service Worker
 *   GET /icon.png | /icon-192.png | /icon-512.png  → App icon (taxi)
 *   GET / (expo-platform header)    → Expo native manifest JSON
 *   GET / and all other paths       → Expo web app (SPA)
 *   GET /*                          → Static files from web build or Expo Go build
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

const STATIC_ROOT = path.resolve(__dirname, "..", "static-build");
const WEB_ROOT = path.join(STATIC_ROOT, "web");
const TEMPLATES_DIR = path.resolve(__dirname, "templates");
const ICON_PNG_PATH = path.resolve(__dirname, "..", "assets", "images", "icon.png");
const ICON_192_PATH = path.resolve(__dirname, "..", "assets", "images", "icon-192.png");
const ICON_512_PATH = path.resolve(__dirname, "..", "assets", "images", "icon-512.png");
const HAS_ICON_PNG = fs.existsSync(ICON_PNG_PATH);
const basePath = (process.env.BASE_PATH || "/").replace(/\/+$/, "");

// ── PWA version (written by scripts/post-export.mjs after every build) ────────
// Falls back to a safe default so the server runs even without a build.
let PWA_SW_URL = (basePath || "") + "/sw.js?v=26";
try {
  const versionFile = path.resolve(__dirname, "pwa-version.json");
  if (fs.existsSync(versionFile)) {
    const pwaVersion = JSON.parse(fs.readFileSync(versionFile, "utf-8"));
    if (pwaVersion.swUrl) PWA_SW_URL = (basePath || "") + pwaVersion.swUrl;
    console.log(`PWA version: ${pwaVersion.cacheName || "unknown"}`);
  }
} catch (e) {
  console.warn("Could not read pwa-version.json, using default SW URL");
}

const WEB_INDEX = path.join(WEB_ROOT, "index.html");
const HAS_WEB_BUILD = fs.existsSync(WEB_INDEX);

console.log(`Web build: ${HAS_WEB_BUILD ? "✓ found at " + WEB_ROOT : "✗ not found — will serve landing page"}`);

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".map": "application/json",
};

function mime(filePath) {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

// ── PWA manifest ────────────────────────────────────────────────────────────
function serveManifest(req, res) {
  const template = fs.readFileSync(path.join(TEMPLATES_DIR, "manifest.json"), "utf-8");
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers["host"];
  const content = template
    .replace(/BASE_PATH_PLACEHOLDER/g, basePath)
    .replace(/BASE_URL_PLACEHOLDER/g, `${proto}://${host}`);
  res.writeHead(200, { "content-type": "application/manifest+json", "cache-control": "public, max-age=3600" });
  res.end(content);
}

// ── Service worker ──────────────────────────────────────────────────────────
function serveServiceWorker(res) {
  const template = fs.readFileSync(path.join(TEMPLATES_DIR, "sw.js"), "utf-8");
  const content = template.replace(/BASE_PATH_PLACEHOLDER/g, basePath || "");
  res.writeHead(200, {
    "content-type": "application/javascript; charset=utf-8",
    "cache-control": "no-cache, no-store, must-revalidate",
    "service-worker-allowed": basePath + "/",
  });
  res.end(content);
}

// ── App icon ────────────────────────────────────────────────────────────────
function serveIconFile(res, filePath) {
  if (!fs.existsSync(filePath)) { res.writeHead(404); res.end("Not Found"); return; }
  res.writeHead(200, { "content-type": "image/png", "cache-control": "no-cache, must-revalidate" });
  res.end(fs.readFileSync(filePath));
}

// ── Expo native manifest (for Expo Go updates) ──────────────────────────────
function serveExpoManifest(platform, res) {
  const manifestPath = path.join(STATIC_ROOT, platform, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: `Manifest not found for platform: ${platform}` }));
    return;
  }
  res.writeHead(200, { "content-type": "application/json", "expo-protocol-version": "1", "expo-sfv-version": "0" });
  res.end(fs.readFileSync(manifestPath, "utf-8"));
}

// ── Inject PWA tags into HTML ────────────────────────────────────────────────
function injectPwaTags(html) {
  // Inject manifest link into <head> if missing
  if (!html.includes('rel="manifest"')) {
    html = html.replace("</head>", `  <link rel="manifest" href="${basePath || ""}/manifest.json" />\n</head>`);
  }
  // Inject full SW registration + immediate-update logic before </body> if missing
  if (!html.includes("serviceWorker") && !html.includes("sw.js")) {
    const swPath = PWA_SW_URL;
    const scope  = (basePath || "") + "/";
    const swScript = `<script>
(function () {
  if (!('serviceWorker' in navigator)) return;
  var reloading = false;
  function reloadOnce() { if (reloading) return; reloading = true; window.location.reload(); }
  navigator.serviceWorker.addEventListener('controllerchange', reloadOnce);
  navigator.serviceWorker.addEventListener('message', function (e) {
    if (e.data && e.data.type === 'SW_ACTIVATED') reloadOnce();
  });
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('${swPath}', { scope: '${scope}', updateViaCache: 'none' })
      .then(function (reg) {
        if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        reg.addEventListener('updatefound', function () {
          var n = reg.installing;
          if (!n) return;
          n.addEventListener('statechange', function () {
            if (n.state === 'installed') n.postMessage({ type: 'SKIP_WAITING' });
          });
        });
        setInterval(function () { reg.update(); }, 60000);
      })
      .catch(function (err) { console.warn('[PWA] SW failed:', err); });
  });
})();
</script>`;
    html = html.replace("</body>", swScript + "\n</body>");
  }
  return html;
}

// ── Web app (SPA) ───────────────────────────────────────────────────────────
function serveWebIndex(res) {
  const raw = fs.readFileSync(WEB_INDEX, "utf-8");
  const html = injectPwaTags(raw);
  res.writeHead(200, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-cache, no-store, must-revalidate",
  });
  res.end(html);
}

// ── Static file from web build ──────────────────────────────────────────────
function serveWebStatic(urlPath, res) {
  const safePath = path.normalize(urlPath).replace(/^(\.\.(\/|\\|$))+/, "");
  const filePath = path.join(WEB_ROOT, safePath);
  if (!filePath.startsWith(WEB_ROOT) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    // SPA fallback: unknown paths → index.html
    return serveWebIndex(res);
  }
  res.writeHead(200, { "content-type": mime(filePath), "cache-control": "public, max-age=31536000, immutable" });
  res.end(fs.readFileSync(filePath));
}

// ── Legacy Expo Go static files ─────────────────────────────────────────────
function serveExpoStatic(urlPath, res) {
  const safePath = path.normalize(urlPath).replace(/^(\.\.(\/|\\|$))+/, "");
  const filePath = path.join(STATIC_ROOT, safePath);
  if (!filePath.startsWith(STATIC_ROOT) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404); res.end("Not Found"); return;
  }
  res.writeHead(200, { "content-type": mime(filePath) });
  res.end(fs.readFileSync(filePath));
}

// ── Landing page (fallback when no web build) ───────────────────────────────
const landingTemplate = fs.readFileSync(path.join(TEMPLATES_DIR, "landing-page.html"), "utf-8");
function getAppName() {
  try {
    const j = JSON.parse(fs.readFileSync(path.resolve(__dirname, "..", "app.json"), "utf-8"));
    return j.expo?.name || "Taxi Meter Pro";
  } catch { return "Taxi Meter Pro"; }
}
const appName = getAppName();

function serveLandingPage(req, res) {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers["host"];
  const html = landingTemplate
    .replace(/BASE_URL_PLACEHOLDER/g, `${proto}://${host}`)
    .replace(/BASE_PATH_PLACEHOLDER/g, basePath)
    .replace(/EXPS_URL_PLACEHOLDER/g, host)
    .replace(/APP_NAME_PLACEHOLDER/g, appName);
  res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-cache" });
  res.end(html);
}

// ── Request handler ─────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  let pathname = url.pathname;

  // Strip base path prefix
  if (basePath && pathname.startsWith(basePath)) {
    pathname = pathname.slice(basePath.length) || "/";
  }

  // PWA assets — always served regardless of web build
  if (pathname === "/manifest.json") return serveManifest(req, res);
  if (pathname === "/sw.js")         return serveServiceWorker(res);
  if (pathname === "/icon.png")     return serveIconFile(res, ICON_PNG_PATH);
  if (pathname === "/icon-192.png") return serveIconFile(res, ICON_192_PATH);
  if (pathname === "/icon-512.png") return serveIconFile(res, ICON_512_PATH);
  if (pathname === "/favicon.png")  return serveIconFile(res, ICON_512_PATH);

  // Expo native manifest (Expo Go on iOS/Android)
  const platform = req.headers["expo-platform"];
  if ((pathname === "/" || pathname === "/manifest") && (platform === "ios" || platform === "android")) {
    return serveExpoManifest(platform, res);
  }

  if (HAS_WEB_BUILD) {
    // Serve the web app for everything else (SPA)
    if (pathname === "/") return serveWebIndex(res);
    return serveWebStatic(pathname, res);
  } else {
    // No web build — serve landing page or Expo Go static assets
    if (pathname === "/") return serveLandingPage(req, res);
    return serveExpoStatic(pathname, res);
  }
});

const port = parseInt(process.env.PORT || "3000", 10);
server.listen(port, "0.0.0.0", () => {
  console.log(`Taxi Meter Pro production server on port ${port}`);
  if (HAS_WEB_BUILD) {
    console.log("Serving Expo web app at /");
  } else {
    console.log("WARNING: No web build found — serving landing page. Run build first.");
  }
});
