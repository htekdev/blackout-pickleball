/**
 * Generate branded QR code poster SVGs for Blackout
 * 
 * Creates two premium, minimalist poster designs:
 *   1. "Visit Us" — links to brandblackout.com
 *   2. "Shop Now" — links to brandblackout.com/shop
 * 
 * Brand: White/clean theme, Urbanist + Inter fonts, #0a0a0a primary
 */

import QRCode from 'qrcode';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'assets', 'qr');

// Blackout brand wordmark SVG paths (from blackout-only-black.svg)
const WORDMARK_PATHS = `
<path transform="matrix(1,0,0,-1,49.3864,78.5811)" d="M0 0V37.437H5.671C6.929 37.437 11.03 37.062 11.03 32.234V5.984C11.03 2.013 9.227 0 5.671 0ZM0-11.157H5.671C8.116-11.157 11.03-12.168 11.03-16.985V-43.391C11.03-48.228 7.283-48.75 5.671-48.75H0ZM8.796 49.531H-11.938V-60.688H8.796C16.669-60.688 22.963-54.467 23.125-46.516V-14.487C23.127-14.229 23.112-8.025 17.51-5.579 23.201-3.094 23.126 3.269 23.125 3.328V35.367C22.963 43.309 16.669 49.531 8.796 49.531"/>
<path transform="matrix(1,0,0,-1,130.9476,32.9097)" d="M0 0C0 2.018-1.644 3.677-3.86 3.86H-12.095V-106.36H15.203C19.081-106.36 20.858-104.628 21.674-103.158 21.971-102.563 22.815-100.632 23.708-98.588 24.247-97.354 24.806-96.073 25.276-95.016L25.54-94.421H0Z"/>
<path transform="matrix(1,0,0,-1,200.8353,29.049805)" d="M0 0H-6.457L-23.074-109.734-23.148-110.22H-9.942L-.469-37.743 9.005-110.22H22.211L6.354-6.294C5.852-3.109 4.947 0 0 0"/>
<path transform="matrix(1,0,0,-1,279.4291,27.9561)" d="M0 0H-6.875C-14.862 0-21.36-6.428-21.36-14.329V-98.079C-21.36-105.979-14.862-112.407-6.875-112.407H.018C7.78-112.084 13.86-105.79 13.86-98.079V-71.023L13.266-71.287C12.208-71.757 10.928-72.316 9.694-72.855 7.649-73.748 5.718-74.591 5.107-74.897 3.654-75.704 1.921-77.482 1.921-81.36V-96.047C1.921-99.227-.57-101.719-3.75-101.719-6.843-101.719-9.265-99.227-9.265-96.047V-16.204C-9.265-13.163-6.791-10.688-3.75-10.688-.57-10.688 1.921-13.112 1.921-16.204V-41.395L10.64-37.371C11.608-36.941 13.86-35.463 13.86-31.047V-14.329C13.86-6.587 7.646-.159 0 0"/>
<path transform="matrix(1,0,0,-1,375.9659,29.362305)" d="M0 0H-12.62L-25.647-37.454V.312L-33.622 .309C-36.215-.015-37.585-1.619-37.585-4.329V-109.907H-25.647V-63.396L-11.382-109.907H1.226L-17.811-49.65Z"/>
<path transform="matrix(1,0,0,-1,437.9093,44.315904)" d="M0 0V-79.688C0-82.867-2.423-85.359-5.515-85.359H-7.214C-10.317-85.211-12.749-82.72-12.749-79.688V0C-12.749 3.032-10.317 5.524-7.234 5.671H-5.515C-2.423 5.671 0 3.18 0 0M-1.748 16.36H-10.359C-18.346 16.36-24.844 9.932-24.844 2.031V-81.884C-24.681-89.694-18.184-96.047-10.359-96.047H-1.748C6.072-95.721 12.09-89.633 12.251-81.875V2.031C12.251 9.739 6.102 16.033-1.748 16.36"/>
<path transform="matrix(1,0,0,-1,516.0331,124.0034)" d="M0 0C0-3.041-2.474-5.515-5.515-5.515H-7.234C-10.239-5.515-12.593-3.092-12.593 0V94.954H-20.984C-22.881 94.954-24.507 93.412-24.687 91.406V-2.031C-24.687-9.803-18.394-15.891-10.359-15.891H-1.343V-15.72C6.226-15.354 12.095-9.417 12.095-2.031V94.954H0Z"/>
<path transform="matrix(1,0,0,-1,565.2042,29.049805)" d="M0 0C-2.092 0-3.86-1.768-3.86-3.86V-11.938H11.921V-107.454C11.921-108.729 12.85-110.22 15.469-110.22H23.86L23.857-14.219C23.983-13.086 24.845-11.938 26.25-11.938H35C39.412-11.938 40.89-9.691 41.322-8.722L45.348 0Z"/>
`;

/**
 * Generate a QR code as raw SVG path data (no wrapper)
 */
async function generateQRSvgContent(url) {
  const svgString = await QRCode.toString(url, {
    type: 'svg',
    errorCorrectionLevel: 'H', // High — survives logo overlay
    margin: 0,
    color: {
      dark: '#0a0a0a',
      light: '#ffffff',
    },
    width: 300,
  });

  // Extract just the inner content (paths) from the SVG
  const innerMatch = svgString.match(/<svg[^>]*>([\s\S]*?)<\/svg>/);
  return {
    inner: innerMatch ? innerMatch[1] : '',
    full: svgString,
  };
}

/**
 * Build a complete branded poster SVG
 */
async function createPoster({ url, headline, subtext, filename }) {
  const qr = await generateQRSvgContent(url);

  // Poster dimensions (portrait, print-ready at 300dpi)
  // 8.5" x 11" = 2550 x 3300 at 300dpi, but we use viewBox units
  const W = 850;
  const H = 1100;
  const QR_SIZE = 340;
  const QR_X = (W - QR_SIZE) / 2;
  const QR_Y = 340;

  // Wordmark positioning — original viewBox is ~582 wide, scale to ~320px
  const wordmarkScale = 0.52;
  const wordmarkW = 582 * wordmarkScale;
  const wordmarkX = (W - wordmarkW) / 2;
  const wordmarkY = 100;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Urbanist:wght@300;400;500;600;700&amp;family=Inter:wght@300;400;500&amp;display=swap');
    </style>
  </defs>

  <!-- Background -->
  <rect width="${W}" height="${H}" fill="#ffffff"/>

  <!-- Subtle top accent line -->
  <rect x="0" y="0" width="${W}" height="4" fill="#0a0a0a"/>

  <!-- Blackout wordmark -->
  <g transform="translate(${wordmarkX}, ${wordmarkY}) scale(${wordmarkScale})" fill="#0a0a0a">
    ${WORDMARK_PATHS}
  </g>

  <!-- Tagline -->
  <text
    x="${W / 2}" y="${wordmarkY + 100}"
    text-anchor="middle"
    font-family="'Urbanist', 'Inter', system-ui, sans-serif"
    font-size="16"
    font-weight="300"
    letter-spacing="4"
    fill="#999999"
  >CELEBRATE DIVERSITY. PLAY WITH PURPOSE.</text>

  <!-- Thin separator -->
  <line x1="${W / 2 - 60}" y1="${QR_Y - 40}" x2="${W / 2 + 60}" y2="${QR_Y - 40}" stroke="#e5e5e5" stroke-width="1"/>

  <!-- QR Code container with subtle shadow -->
  <rect
    x="${QR_X - 24}" y="${QR_Y - 24}"
    width="${QR_SIZE + 48}" height="${QR_SIZE + 48}"
    rx="8" ry="8"
    fill="#ffffff"
    stroke="#f0f0f0"
    stroke-width="1"
  />

  <!-- QR Code -->
  <g transform="translate(${QR_X}, ${QR_Y})">
    <svg viewBox="0 0 300 300" width="${QR_SIZE}" height="${QR_SIZE}">
      ${qr.inner}
    </svg>
  </g>

  <!-- Headline -->
  <text
    x="${W / 2}" y="${QR_Y + QR_SIZE + 80}"
    text-anchor="middle"
    font-family="'Urbanist', 'Inter', system-ui, sans-serif"
    font-size="42"
    font-weight="600"
    letter-spacing="2"
    fill="#0a0a0a"
  >${headline}</text>

  <!-- Subtext / CTA -->
  <text
    x="${W / 2}" y="${QR_Y + QR_SIZE + 125}"
    text-anchor="middle"
    font-family="'Inter', system-ui, sans-serif"
    font-size="18"
    font-weight="400"
    fill="#6b6b6b"
  >${subtext}</text>

  <!-- URL display -->
  <text
    x="${W / 2}" y="${QR_Y + QR_SIZE + 175}"
    text-anchor="middle"
    font-family="'Inter', system-ui, sans-serif"
    font-size="15"
    font-weight="300"
    letter-spacing="1.5"
    fill="#999999"
  >${url.replace('https://', '').toUpperCase()}</text>

  <!-- Bottom accent bar -->
  <rect x="0" y="${H - 60}" width="${W}" height="60" fill="#0a0a0a"/>

  <!-- Bottom bar text -->
  <text
    x="${W / 2}" y="${H - 28}"
    text-anchor="middle"
    font-family="'Urbanist', 'Inter', system-ui, sans-serif"
    font-size="13"
    font-weight="400"
    letter-spacing="3"
    fill="#ffffff"
  >DIVERSITY IN SPORTS — BRANDBLACKOUT.COM</text>

  <!-- Decorative corner marks (print crop marks style — premium touch) -->
  <line x1="30" y1="40" x2="30" y2="56" stroke="#e5e5e5" stroke-width="0.5"/>
  <line x1="30" y1="40" x2="46" y2="40" stroke="#e5e5e5" stroke-width="0.5"/>
  <line x1="${W - 30}" y1="40" x2="${W - 30}" y2="56" stroke="#e5e5e5" stroke-width="0.5"/>
  <line x1="${W - 30}" y1="40" x2="${W - 46}" y2="40" stroke="#e5e5e5" stroke-width="0.5"/>
</svg>`;

  const outPath = join(OUT_DIR, filename);
  writeFileSync(outPath, svg, 'utf-8');
  console.log(`✅ Created: ${outPath}`);
  return outPath;
}

// Generate both posters
async function main() {
  console.log('🏓 Generating Blackout branded QR posters...\n');

  await createPoster({
    url: 'https://www.brandblackout.com',
    headline: 'VISIT US',
    subtext: 'Scan the code to explore the Blackout brand',
    filename: 'poster-visit.svg',
  });

  await createPoster({
    url: 'https://www.brandblackout.com/shop',
    headline: 'SHOP NOW',
    subtext: 'Scan the code to browse our merch collection',
    filename: 'poster-shop.svg',
  });

  console.log('\n🎉 Done! Posters saved to public/assets/qr/');
}

main().catch(console.error);
