/**
 * patch-icon.mjs
 *
 * Replaces the Hebrew text on the car door in the taxi icon with "TAXI".
 * Uses sharp's SVG composite feature — no raster font rendering needed.
 *
 * Run: node scripts/patch-icon.mjs
 */

import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMAGES = path.join(__dirname, '..', 'assets', 'images');

// ── The source is the 512×512 icon ──────────────────────────────────────────
const SRC_512 = path.join(IMAGES, 'icon-512.png');

// ── Where the Hebrew text sits in the 512×512 image ─────────────────────────
// Car door area, lower-left quadrant of the car body.
// Tweak these if the patch needs repositioning.
const PATCH = {
  x: 96,
  y: 280,
  w: 155,
  h: 44,
};

// ── Build an SVG overlay that covers the old text and draws "TAXI" ───────────
function makeSvgOverlay(W, H, scale = 1) {
  const p = {
    x: Math.round(PATCH.x * scale),
    y: Math.round(PATCH.y * scale),
    w: Math.round(PATCH.w * scale),
    h: Math.round(PATCH.h * scale),
  };

  // font size tuned so "TAXI" fills ~80% of the patch width
  const fontSize = Math.round(p.h * 0.72);
  const cx = p.x + p.w / 2;
  const cy = p.y + p.h / 2 + fontSize * 0.35;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <!-- White patch to erase Hebrew glyphs -->
  <rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}"
        fill="#EFEFEF" rx="3" ry="3"/>
  <!-- TAXI label in bold dark italic (matches Israeli taxi door style) -->
  <text x="${cx}" y="${cy}"
        font-family="Arial Black, Arial, sans-serif"
        font-size="${fontSize}"
        font-weight="900"
        font-style="italic"
        fill="#1a1a1a"
        text-anchor="middle"
        dominant-baseline="auto">TAXI</text>
</svg>`;
}

async function patchIcon(srcPath, dstPath, size) {
  const scale = size / 512;
  const svg = makeSvgOverlay(size, size, scale);
  const svgBuf = Buffer.from(svg);

  await sharp(srcPath)
    .resize(size, size, { fit: 'contain', background: '#000000' })
    .composite([{ input: svgBuf, blend: 'over' }])
    .png({ compressionLevel: 9 })
    .toFile(dstPath);

  console.log(`[patch-icon] wrote ${dstPath} (${size}×${size})`);
}

// Patch the 512 size in-place first, then derive 192 from it
const TMP_512 = path.join(IMAGES, '_icon-512-patched.png');

await patchIcon(SRC_512, TMP_512, 512);

// Save final 512
import { renameSync, copyFileSync } from 'fs';
const DST_512 = path.join(IMAGES, 'icon-512.png');
renameSync(TMP_512, DST_512);
console.log('[patch-icon] icon-512.png replaced');

// Derive 192 from patched 512
const DST_192 = path.join(IMAGES, 'icon-192.png');
await sharp(DST_512)
  .resize(192, 192, { fit: 'contain', background: '#000000' })
  .png({ compressionLevel: 9 })
  .toFile(DST_192);
console.log('[patch-icon] icon-192.png replaced');

console.log('[patch-icon] ✓ done — run post-export.mjs to copy into static-build/');
