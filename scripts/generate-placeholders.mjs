/**
 * Generate professional placeholder product images for the shop.
 *
 * Creates 8 angle images per product using sharp — each shows
 * the product color with Blackout branding and angle indicator.
 * These serve as production-ready placeholders until Jonathan
 * sends the real multi-angle product photos.
 *
 * Usage: node scripts/generate-placeholders.mjs
 */
import sharp from 'sharp';
import { mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, '..', 'public', 'images', 'products');

const products = [
  { slug: 'gold-crew-tee', color: '#C8A951', name: "Gold Men's Crew Tee", type: 'tee' },
  { slug: 'black-holographic-crew-tee', color: '#1A1A1A', name: "Black Holo Men's Crew Tee", type: 'tee' },
  { slug: 'black-racerback-tank', color: '#1A1A1A', name: "Black Women's Racerback Tank", type: 'tank' },
  { slug: 'tan-crew-tee', color: '#C2AD8D', name: "Tan Men's Crew Tee", type: 'tee' },
  { slug: 'black-white-crew-tee', color: '#111111', name: "Black Men's Crew Tee", type: 'tee' },
  { slug: 'gray-crew-tee', color: '#8C8C8C', name: "Gray Men's Crew Tee", type: 'tee' },
  { slug: 'steel-blue-racerback-tank', color: '#5B7FA5', name: "Steel Blue Women's Tank", type: 'tank' },
  { slug: 'olive-crew-tee', color: '#5C6B3C', name: "Olive Men's Crew Tee", type: 'tee' },
  { slug: 'maroon-racerback-tank', color: '#6B2D3E', name: "Maroon Women's Tank", type: 'tank' },
  { slug: 'navy-crew-tee', color: '#1B2A4A', name: "Navy Blue Men's Crew Tee", type: 'tee' },
  { slug: 'red-crew-tee', color: '#C0392B', name: "Red Men's Crew Tee", type: 'tee' },
  { slug: 'charcoal-racerback-tank', color: '#4A4A4A', name: "Charcoal Women's Tank", type: 'tank' },
];

// Lighten or darken a hex color
function adjustColor(hex, amount) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, ((num >> 16) & 0xFF) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xFF) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xFF) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

// Determine if color is dark (for text contrast)
function isDark(hex) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = (num >> 16) & 0xFF;
  const g = (num >> 8) & 0xFF;
  const b = num & 0xFF;
  return (r * 0.299 + g * 0.587 + b * 0.114) < 128;
}

function makeSvg(product, angle) {
  const { color, name, type } = product;
  const textColor = isDark(color) ? '#FFFFFF' : '#111111';
  const subtleColor = isDark(color) ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)';
  const highlight = adjustColor(color, isDark(color) ? 30 : -30);

  // T-shirt or tank top silhouette
  const silhouette = type === 'tee'
    ? `<path d="M200,160 L160,140 L120,160 L80,155 L60,200 L100,220 L110,320 L110,430 L290,430 L290,320 L300,220 L340,200 L320,155 L280,160 L240,140 Z" fill="${highlight}" opacity="0.6" />`
    : `<path d="M220,160 L180,145 L140,170 L130,200 L130,430 L270,430 L270,200 L260,170 L220,145 Z" fill="${highlight}" opacity="0.6" />
       <path d="M180,145 L160,160 L140,170 M220,145 L240,160 L260,170" stroke="${highlight}" stroke-width="3" fill="none" opacity="0.5" />`;

  // Rotation indicator (shows angle around a circle)
  const angleRad = ((angle - 1) / 8) * Math.PI * 2 - Math.PI / 2;
  const dotX = 200 + Math.cos(angleRad) * 20;
  const dotY = 500 + Math.sin(angleRad) * 20;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="560" viewBox="0 0 400 560">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${adjustColor(color, isDark(color) ? 15 : -10)}" />
      <stop offset="100%" stop-color="${color}" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="400" height="560" fill="url(#bg)" rx="0" />

  <!-- Subtle grid pattern -->
  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="${subtleColor}" stroke-width="0.5" />
  </pattern>
  <rect width="400" height="560" fill="url(#grid)" />

  <!-- Garment silhouette -->
  ${silhouette}

  <!-- BLACKOUT wordmark -->
  <text x="200" y="80" font-family="system-ui, -apple-system, sans-serif" font-size="36" font-weight="900"
        fill="${textColor}" text-anchor="middle" letter-spacing="8" opacity="0.9">BLACKOUT</text>

  <!-- Product name -->
  <text x="200" y="470" font-family="system-ui, sans-serif" font-size="13" font-weight="600"
        fill="${textColor}" text-anchor="middle" opacity="0.7">${name}</text>

  <!-- Angle indicator -->
  <circle cx="200" cy="500" r="20" fill="none" stroke="${textColor}" stroke-width="1.5" opacity="0.3" />
  <circle cx="${dotX}" cy="${dotY}" r="4" fill="${textColor}" opacity="0.8" />
  <text x="200" y="540" font-family="system-ui, sans-serif" font-size="11" font-weight="500"
        fill="${textColor}" text-anchor="middle" opacity="0.5">ANGLE ${angle}/8</text>
</svg>`;
}

async function main() {
  let count = 0;
  for (const product of products) {
    const dir = join(PUBLIC, product.slug);
    mkdirSync(dir, { recursive: true });

    for (let angle = 1; angle <= 8; angle++) {
      const svg = makeSvg(product, angle);
      const outPath = join(dir, `angle-${angle}.webp`);

      await sharp(Buffer.from(svg))
        .resize(800, 1120)
        .webp({ quality: 85 })
        .toFile(outPath);
      count++;
    }
    console.log(`✅ ${product.slug} — 8 angles generated`);
  }
  console.log(`\n🏓 Done! Generated ${count} placeholder images for ${products.length} products.`);
}

main().catch(console.error);
