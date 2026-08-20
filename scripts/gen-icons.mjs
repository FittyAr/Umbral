// Generates PWA icons from public/favicon.svg using sharp.
// Output: public/icons/icon-192.png, icon-512.png, icon-512-maskable.png
import sharp from 'sharp';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());
const SVG_PATH = path.join(ROOT, 'public', 'favicon.svg');
const OUT = path.join(ROOT, 'public', 'icons');

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const svgRaw = await fs.readFile(SVG_PATH, 'utf8');
  const inner = svgRaw.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');

  // Build a 512 viewBox SVG that includes the inner content, centered with safe-zone padding
  const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
    <rect width="512" height="512" fill="#0f172a"/>
    <g transform="translate(80, 80) scale(11)">${inner}</g>
  </svg>`;

  const regularSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
    <rect width="512" height="512" fill="#0f172a"/>
    <g transform="translate(0,0) scale(16)">${inner}</g>
  </svg>`;

  await sharp(Buffer.from(regularSvg)).resize(192, 192).png().toFile(path.join(OUT, 'icon-192.png'));
  await sharp(Buffer.from(regularSvg)).resize(512, 512).png().toFile(path.join(OUT, 'icon-512.png'));
  await sharp(Buffer.from(maskableSvg)).resize(512, 512).png().toFile(path.join(OUT, 'icon-512-maskable.png'));

  console.log('[gen-icons] OK');
}

main().catch((e) => {
  console.error('[gen-icons] FAIL', e);
  process.exit(1);
});
