// Generates the home-screen icons from one geometry, so a change to the mark
// is re-rendered rather than redrawn by hand.
//
//   node scripts/generate-app-icons.mjs
//
// Codebook product-standards.md, "Symbole für den Startbildschirm":
//  - iOS reads apple-icon.png only: PNG, opaque RGB, no pre-applied rounding.
//  - Android needs a manifest plus a *separate* maskable version, because
//    launchers crop to a circle, squircle or teardrop and only a circle of
//    80% diameter is guaranteed to survive.
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const BRAND = "#ff2d78";      // background
const OUTER_RING = "#ffd0e4"; // outermost groove, separates disc from ground
const DISC_FACE = "#15070d";  // disc body, a very dark red-black
const HUB = "#180b0f";
// Lighter than the original palette: at icon size the old tones sat too close
// to the disc face to register at all.
const SHADES = ["#e0246c", "#c0185a", "#a01349", "#800f3a"];

// Three grooves plus the centre dot. Six fine ones merged into a smear at
// 60px, which is the size the icon is actually seen at. The light rim is the
// disc edge and is not counted among them.
const GROOVES = 3;

/**
 * Vinyl disc centred in a square canvas.
 * @param size    canvas edge length
 * @param ratio   disc diameter as a fraction of the canvas
 * @param rings   number of grooves including the outer neon one
 */
function discSvg(size, ratio, grooveCount) {
  const c = size / 2;
  const r = (size * ratio) / 2;

  const rimR = r * 0.974;  // light disc edge
  const dotR = r * 0.05;   // centre dot
  // Grooves sit at even intervals across the span between rim and dot, so
  // rim → groove → groove → groove → dot are all the same distance apart.
  const step = (rimR - dotR) / (grooveCount + 1);

  let marks = `<circle cx="${c}" cy="${c}" r="${rimR.toFixed(1)}" fill="none" stroke="${OUTER_RING}" stroke-width="${(r * 0.042).toFixed(1)}"/>`;
  for (let i = 1; i <= grooveCount; i++) {
    const rr = rimR - i * step;
    marks += `<circle cx="${c}" cy="${c}" r="${rr.toFixed(1)}" fill="none" stroke="${SHADES[(i - 1) % SHADES.length]}" stroke-width="${(r * 0.06).toFixed(1)}"/>`;
  }
  return `<svg viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
<rect width="${size}" height="${size}" fill="${BRAND}"/>
<circle cx="${c}" cy="${c}" r="${r.toFixed(1)}" fill="${DISC_FACE}"/>
${marks}
<circle cx="${c}" cy="${c}" r="${dotR.toFixed(1)}" fill="${SHADES[0]}"/>
</svg>`;
}

// flatten() drops the alpha channel: iOS composites transparency onto black,
// and the Codebook requires colour type 2 (RGB without alpha).
async function writePng(svg, size, outPath) {
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .flatten({ background: BRAND })
    .png({ compressionLevel: 9 })
    .toFile(outPath);
  const meta = await sharp(outPath).metadata();
  console.log(`${outPath.replace(root, ".")}  ${meta.width}x${meta.height}  Kanäle=${meta.channels}  Alpha=${meta.hasAlpha}`);
}

const targets = [
  // iOS home screen. Disc nearly fills the frame; iOS applies its own mask.
  { file: join(root, "src/app/apple-icon.png"), size: 180, ratio: 0.845, grooves: GROOVES },
  // Android, unmasked — used for install prompts.
  { file: join(root, "public/icon-192.png"), size: 192, ratio: 0.845, grooves: GROOVES },
  { file: join(root, "public/icon-512.png"), size: 512, ratio: 0.845, grooves: GROOVES },
  // Android, maskable — disc at 80% so it survives every launcher crop.
  { file: join(root, "public/icon-maskable-512.png"), size: 512, ratio: 0.80, grooves: GROOVES },
];

await mkdir(join(root, "public"), { recursive: true });
for (const t of targets) {
  await writePng(discSvg(t.size, t.ratio, t.grooves), t.size, t.file);
}
