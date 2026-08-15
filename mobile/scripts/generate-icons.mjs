/**
 * Generates the NearBitez app icons and splash image.
 *
 * Written as a script rather than committing opaque binaries so the marks can
 * be regenerated or retuned later without a design tool, and so the geometry
 * behind them is reviewable.
 *
 * Encodes PNG directly (zlib is in Node's standard library) to avoid adding an
 * image dependency to an app that ships no image processing of its own.
 *
 *   node scripts/generate-icons.mjs
 *
 * Produces, in ./assets:
 *   icon.png           1024×1024  full-bleed, used for the store listing
 *   adaptive-icon.png  1024×1024  foreground only; Android masks it to the
 *                                 launcher's shape, so the mark stays inside
 *                                 the centre 66% safe zone
 *   splash.png         1024×1024  mark + wordmark, transparent background
 *   notification-icon.png 96×96   white-on-transparent silhouette, which is
 *                                 all Android renders in the status bar
 */

import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "assets");

/* ── PNG encoding ───────────────────────────────────────────────────────── */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

const crc32 = (buffer) => {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const chunk = (type, data) => {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
};

/** `pixels` is RGBA, 4 bytes per pixel, row-major. */
const encodePng = (width, height, pixels) => {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // adaptive filtering
  ihdr[12] = 0; // no interlace

  // Each scanline is prefixed with filter type 0 (none).
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
};

/* ── Drawing ────────────────────────────────────────────────────────────── */

const BRAND = { r: 0xea, g: 0x58, b: 0x0c }; // #ea580c
const CREAM = { r: 0xff, g: 0xff, b: 0xff };

const createCanvas = (size, background) => {
  const pixels = Buffer.alloc(size * size * 4);
  if (background) {
    for (let i = 0; i < size * size; i += 1) {
      pixels[i * 4] = background.r;
      pixels[i * 4 + 1] = background.g;
      pixels[i * 4 + 2] = background.b;
      pixels[i * 4 + 3] = 255;
    }
  }
  return pixels;
};

/**
 * Blends a colour into one pixel.
 *
 * `alpha` is 0–1 and carries the antialiasing: every shape below reports how
 * far a pixel sits from its edge, which is what keeps curves smooth at icon
 * sizes without any supersampling.
 */
const blend = (pixels, size, x, y, colour, alpha) => {
  if (alpha <= 0 || x < 0 || y < 0 || x >= size || y >= size) return;
  const i = (y * size + x) * 4;
  const a = Math.min(1, alpha);
  const existing = pixels[i + 3] / 255;
  const out = a + existing * (1 - a);

  pixels[i] = Math.round((colour.r * a + pixels[i] * existing * (1 - a)) / (out || 1));
  pixels[i + 1] = Math.round((colour.g * a + pixels[i + 1] * existing * (1 - a)) / (out || 1));
  pixels[i + 2] = Math.round((colour.b * a + pixels[i + 2] * existing * (1 - a)) / (out || 1));
  pixels[i + 3] = Math.round(out * 255);
};

/** Signed distance to a circle's edge; negative inside. */
const circleSdf = (x, y, cx, cy, radius) => Math.hypot(x - cx, y - cy) - radius;

/**
 * The NearBitez mark: a filled disc with a bite taken out of the upper right,
 * and a fork-tine notch cut from the lower edge.
 *
 * Reads as food at 48 px and stays balanced when a launcher masks it to a
 * circle, a squircle or a rounded square.
 */
const drawMark = (pixels, size, colour, scale = 1, offsetY = 0) => {
  const cx = size / 2;
  const cy = size / 2 + offsetY;
  const radius = size * 0.3 * scale;

  // The bite: a disc subtracted from the top-right rim.
  const biteR = radius * 0.46;
  const biteX = cx + radius * 0.72;
  const biteY = cy - radius * 0.66;

  // Three tines notched into the bottom, echoing a fork.
  //
  // Kept shallow on purpose: cut any deeper and the disc stops reading as food
  // and starts looking like a jellyfish at launcher sizes.
  const tineWidth = radius * 0.13;
  const tineTop = cy + radius * 0.62;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const px = x + 0.5;
      const py = y + 0.5;

      let d = circleSdf(px, py, cx, cy, radius);
      // Subtracting a shape = intersecting with its complement.
      d = Math.max(d, -circleSdf(px, py, biteX, biteY, biteR));

      if (py > tineTop) {
        for (const dx of [-1, 0, 1]) {
          const slotX = cx + dx * radius * 0.42;
          const inSlot = Math.abs(px - slotX) - tineWidth / 2;
          // Cut the slot only where it overlaps the disc.
          d = Math.max(d, -Math.max(inSlot, tineTop - py));
        }
      }

      // A one-pixel band across the edge gives the antialiased ramp.
      blend(pixels, size, x, y, colour, Math.min(1, Math.max(0, 0.5 - d)));
    }
  }
};

/** Blocky wordmark under the splash logo. Drawn from a 5×7 bitmap font. */
const GLYPHS = {
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
};

const drawText = (pixels, size, text, colour, { x0, y0, pixelSize, gap }) => {
  let cursor = x0;
  for (const char of text.toUpperCase()) {
    const glyph = GLYPHS[char];
    if (!glyph) {
      cursor += pixelSize * 3;
      continue;
    }
    glyph.forEach((row, ry) => {
      [...row].forEach((cell, rx) => {
        if (cell !== "1") return;
        for (let dy = 0; dy < pixelSize; dy += 1) {
          for (let dx = 0; dx < pixelSize; dx += 1) {
            blend(pixels, size, cursor + rx * pixelSize + dx, y0 + ry * pixelSize + dy, colour, 1);
          }
        }
      });
    });
    cursor += pixelSize * 5 + gap;
  }
  return cursor;
};

const textWidth = (text, pixelSize, gap) => text.length * (pixelSize * 5 + gap) - gap;

/* ── Outputs ────────────────────────────────────────────────────────────── */

mkdirSync(OUT, { recursive: true });

const write = (name, size, pixels) => {
  writeFileSync(resolve(OUT, name), encodePng(size, size, pixels));
  console.log(`  ${name}  ${size}x${size}`);
};

console.log("Generating NearBitez assets into assets/");

// Store icon: white mark on the brand orange, full bleed.
{
  const size = 1024;
  const pixels = createCanvas(size, BRAND);
  drawMark(pixels, size, CREAM);
  write("icon.png", size, pixels);
}

// Adaptive foreground: transparent, and scaled to 0.72 so the mark survives
// the aggressive circular mask some launchers apply.
{
  const size = 1024;
  const pixels = createCanvas(size, null);
  drawMark(pixels, size, CREAM, 0.72);
  write("adaptive-icon.png", size, pixels);
}

// Splash: brand mark above the wordmark, transparent so the configured
// background colour shows through in both themes.
{
  const size = 1024;
  const pixels = createCanvas(size, null);
  drawMark(pixels, size, BRAND, 0.62, -110);

  const pixelSize = 14;
  const gap = 10;
  const word = "NEARBITEZ";
  drawText(pixels, size, word, BRAND, {
    x0: Math.round((size - textWidth(word, pixelSize, gap)) / 2),
    y0: 620,
    pixelSize,
    gap,
  });
  write("splash.png", size, pixels);
}

// Notification icon: Android draws only the alpha channel of this, tinting it
// white, so anything but a flat silhouette is wasted.
{
  const size = 96;
  const pixels = createCanvas(size, null);
  drawMark(pixels, size, CREAM, 1.1);
  write("notification-icon.png", size, pixels);
}

console.log("Done.");
