/**
 * Split composite product mockup images into individual angle shots.
 *
 * Each composite image contains 8 angles in a 4×2 grid.
 * This script splits them into individual images for the 360° viewer.
 *
 * Usage:
 *   node scripts/split-composites.mjs <input-dir>
 *
 * Input files should be named: {product-slug}.{png|jpg|jpeg|webp}
 * Output: public/images/products/{product-slug}/angle-{1-8}.webp
 *
 * Grid layout assumed (4 columns × 2 rows):
 *   [1] [2] [3] [4]
 *   [5] [6] [7] [8]
 */
import sharp from 'sharp';
import { readdirSync, mkdirSync } from 'node:fs';
import { join, dirname, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, '..', 'public', 'images', 'products');

const COLS = 4;
const ROWS = 2;
const ANGLES = COLS * ROWS;
const OUTPUT_WIDTH = 800;
const OUTPUT_QUALITY = 88;

async function splitComposite(inputPath, slug) {
  const meta = await sharp(inputPath).metadata();
  const cellW = Math.floor(meta.width / COLS);
  const cellH = Math.floor(meta.height / ROWS);

  const outDir = join(PUBLIC, slug);
  mkdirSync(outDir, { recursive: true });

  for (let i = 0; i < ANGLES; i++) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);

    await sharp(inputPath)
      .extract({
        left: col * cellW,
        top: row * cellH,
        width: cellW,
        height: cellH,
      })
      .resize(OUTPUT_WIDTH, null, { fit: 'inside' })
      .webp({ quality: OUTPUT_QUALITY })
      .toFile(join(outDir, `angle-${i + 1}.webp`));
  }

  console.log(`✅ ${slug} — ${ANGLES} angles extracted (${cellW}×${cellH} each)`);
}

async function main() {
  const inputDir = process.argv[2];
  if (!inputDir) {
    console.error('Usage: node scripts/split-composites.mjs <input-directory>');
    console.error('');
    console.error('Input directory should contain composite images named by product slug.');
    console.error('Example: gold-crew-tee.png, black-holographic-crew-tee.jpg');
    process.exit(1);
  }

  const files = readdirSync(inputDir).filter((f) =>
    /\.(png|jpe?g|webp)$/i.test(f)
  );

  if (files.length === 0) {
    console.error(`No image files found in ${inputDir}`);
    process.exit(1);
  }

  console.log(`Found ${files.length} composite images to split...\n`);

  for (const file of files) {
    const slug = basename(file, extname(file));
    const inputPath = join(inputDir, file);
    await splitComposite(inputPath, slug);
  }

  console.log(`\n🏓 Done! Split ${files.length} composites into ${files.length * ANGLES} angle images.`);
  console.log('Images saved to: public/images/products/{slug}/angle-{1-8}.webp');
}

main().catch(console.error);
