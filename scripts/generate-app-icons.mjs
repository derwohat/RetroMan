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
import { mkdir, readFile, writeFile } from "node:fs/promises";
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
  // Browser tab. Two grooves instead of three: below 64px the third one
  // closes up into a smudge and the disc stops reading as a disc.
  { file: join(root, "src/app/icon.png"), size: 64, ratio: 0.92, grooves: 2 },
  { file: join(root, "public/icon-32.png"), size: 32, ratio: 0.92, grooves: 1 },
];

await mkdir(join(root, "public"), { recursive: true });
for (const t of targets) {
  await writePng(discSvg(t.size, t.ratio, t.grooves), t.size, t.file);
}

// favicon.ico, built by hand rather than with another dependency: an ICO
// may carry a PNG verbatim, so the container is a 6-byte header plus one
// 16-byte directory entry. Firefox asks for /favicon.ico before it reads
// any link tag, and an .ico from July is what it kept showing.
{
  const png = await readFile(join(root, "public/icon-32.png"));
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = icon
  header.writeUInt16LE(1, 4); // one image
  const entry = Buffer.alloc(16);
  entry[0] = 32;              // width
  entry[1] = 32;              // height
  entry[2] = 0;               // palette colours: 0 = truecolour
  entry[3] = 0;               // reserved
  entry.writeUInt16LE(1, 4);  // colour planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(header.length + entry.length, 12);
  const out = join(root, "public/favicon.ico");
  await writeFile(out, Buffer.concat([header, entry, png]));
  console.log(`${out.replace(root, ".")}  32x32  ${png.length} Bytes PNG im ICO-Container`);
}
