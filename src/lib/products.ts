/**
 * Static product catalog for Blackout Pickleball.
 *
 * Products auto-discovered from Stripe when connected; this file provides
 * the full catalog for demo/development mode with real product data,
 * local 360° images, and accurate descriptions.
 */

export interface ProductImage {
  /** Path to front-facing hero image (angle 1) */
  thumbnail: string;
  /** Paths to all 8 360° angle images */
  angles: string[];
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: 'mens-crew-tee' | 'womens-racerback-tank';
  colorName: string;
  colorHex: string;
  sport: string;
  images: ProductImage;
  prices: Array<{
    id: string;
    amount: number;
    currency: string;
    size: string;
  }>;
}

// Sizes by garment type
const MEN_SIZES = ['S', 'M', 'L', 'XL', 'XXL'];
const WOMEN_SIZES = ['XS', 'S', 'M', 'L', 'XL'];

function makeAngles(slug: string): ProductImage {
  const base = `/images/products/${slug}`;
  return {
    thumbnail: `${base}/angle-1.webp`,
    angles: Array.from({ length: 8 }, (_, i) => `${base}/angle-${i + 1}.webp`),
  };
}

function menPrices(id: string, amount: number) {
  return MEN_SIZES.map((size) => ({
    id: `${id}_${size.toLowerCase()}`,
    amount,
    currency: 'usd',
    size,
  }));
}

function womenPrices(id: string, amount: number) {
  return WOMEN_SIZES.map((size) => ({
    id: `${id}_${size.toLowerCase()}`,
    amount,
    currency: 'usd',
    size,
  }));
}

const TEE_DESC = `Premium court-ready crew tee — 85% Polyester / 15% Spandex. Breathable 4-way stretch, moisture-wicking technology, anti-odor treatment. Designed for peak performance in the heat of the game.

Features:
• Moisture-wicking technology
• 4-way stretch for unrestricted movement
• Anti-odor treatment
• Tagless comfort
• Blackout Pickleball branding`;

const TANK_DESC = `Performance racerback tank — 90% Polyester / 10% Spandex. Ultra-lightweight with open back design for maximum airflow. Breathable mesh panels keep you cool during intense rallies.

Features:
• Racerback design for full range of motion
• Moisture-wicking fabric
• Breathable mesh panels
• Flatlock seams to reduce chafing
• Blackout Pickleball branding`;

export const PRODUCT_CATALOG: Product[] = [
  {
    id: 'gold_crew_tee',
    slug: 'gold-crew-tee',
    name: "Gold Men's Crew Tee",
    description: TEE_DESC,
    category: 'mens-crew-tee',
    colorName: 'Gold / Mustard',
    colorHex: '#C8A951',
    sport: 'pickleball',
    images: makeAngles('gold-crew-tee'),
    prices: menPrices('gold_crew_tee', 3500),
  },
  {
    id: 'black_holo_crew_tee',
    slug: 'black-holographic-crew-tee',
    name: "Black Holographic Men's Crew Tee",
    description: TEE_DESC.replace('Blackout Pickleball branding', 'Holographic Blackout Pickleball branding — iridescent logo that shifts color in the light'),
    category: 'mens-crew-tee',
    colorName: 'Black / Holographic',
    colorHex: '#1A1A1A',
    sport: 'pickleball',
    images: makeAngles('black-holographic-crew-tee'),
    prices: menPrices('black_holo_crew_tee', 3800),
  },
  {
    id: 'black_racerback_tank',
    slug: 'black-racerback-tank',
    name: "Black Women's Racerback Tank",
    description: TANK_DESC.replace('Blackout Pickleball branding', 'Holographic Blackout Pickleball branding — iridescent logo that shifts color in the light'),
    category: 'womens-racerback-tank',
    colorName: 'Black / Holographic',
    colorHex: '#1A1A1A',
    sport: 'pickleball',
    images: makeAngles('black-racerback-tank'),
    prices: womenPrices('black_racerback_tank', 3200),
  },
  {
    id: 'tan_crew_tee',
    slug: 'tan-crew-tee',
    name: "Tan Men's Crew Tee",
    description: TEE_DESC,
    category: 'mens-crew-tee',
    colorName: 'Tan / Sand',
    colorHex: '#C2AD8D',
    sport: 'pickleball',
    images: makeAngles('tan-crew-tee'),
    prices: menPrices('tan_crew_tee', 3500),
  },
  {
    id: 'black_white_crew_tee',
    slug: 'black-white-crew-tee',
    name: "Black Men's Crew Tee",
    description: TEE_DESC.replace('Blackout Pickleball branding', 'Clean white Blackout Pickleball logo with signature sleeve stripes'),
    category: 'mens-crew-tee',
    colorName: 'Black / White Logo',
    colorHex: '#111111',
    sport: 'pickleball',
    images: makeAngles('black-white-crew-tee'),
    prices: menPrices('black_white_crew_tee', 3500),
  },
  {
    id: 'gray_crew_tee',
    slug: 'gray-crew-tee',
    name: "Gray Men's Crew Tee",
    description: TEE_DESC,
    category: 'mens-crew-tee',
    colorName: 'Gray',
    colorHex: '#8C8C8C',
    sport: 'pickleball',
    images: makeAngles('gray-crew-tee'),
    prices: menPrices('gray_crew_tee', 3500),
  },
  {
    id: 'steel_blue_tank',
    slug: 'steel-blue-racerback-tank',
    name: "Steel Blue Women's Racerback Tank",
    description: TANK_DESC,
    category: 'womens-racerback-tank',
    colorName: 'Steel Blue',
    colorHex: '#5B7FA5',
    sport: 'pickleball',
    images: makeAngles('steel-blue-racerback-tank'),
    prices: womenPrices('steel_blue_tank', 3200),
  },
  {
    id: 'olive_crew_tee',
    slug: 'olive-crew-tee',
    name: "Olive Men's Crew Tee",
    description: TEE_DESC,
    category: 'mens-crew-tee',
    colorName: 'Olive / Army Green',
    colorHex: '#5C6B3C',
    sport: 'pickleball',
    images: makeAngles('olive-crew-tee'),
    prices: menPrices('olive_crew_tee', 3500),
  },
  {
    id: 'maroon_tank',
    slug: 'maroon-racerback-tank',
    name: "Maroon Women's Racerback Tank",
    description: TANK_DESC,
    category: 'womens-racerback-tank',
    colorName: 'Maroon / Burgundy',
    colorHex: '#6B2D3E',
    sport: 'pickleball',
    images: makeAngles('maroon-racerback-tank'),
    prices: womenPrices('maroon_tank', 3200),
  },
  {
    id: 'navy_crew_tee',
    slug: 'navy-crew-tee',
    name: "Navy Blue Men's Crew Tee",
    description: TEE_DESC.replace('Blackout Pickleball branding', 'Holographic Blackout Pickleball branding — iridescent logo that shifts color in the light'),
    category: 'mens-crew-tee',
    colorName: 'Navy Blue / Holographic',
    colorHex: '#1B2A4A',
    sport: 'pickleball',
    images: makeAngles('navy-crew-tee'),
    prices: menPrices('navy_crew_tee', 3800),
  },
  {
    id: 'red_crew_tee',
    slug: 'red-crew-tee',
    name: "Red Men's Crew Tee",
    description: TEE_DESC,
    category: 'mens-crew-tee',
    colorName: 'Red',
    colorHex: '#C0392B',
    sport: 'pickleball',
    images: makeAngles('red-crew-tee'),
    prices: menPrices('red_crew_tee', 3500),
  },
  {
    id: 'charcoal_tank',
    slug: 'charcoal-racerback-tank',
    name: "Charcoal Women's Racerback Tank",
    description: TANK_DESC,
    category: 'womens-racerback-tank',
    colorName: 'Charcoal Gray',
    colorHex: '#4A4A4A',
    sport: 'pickleball',
    images: makeAngles('charcoal-racerback-tank'),
    prices: womenPrices('charcoal_tank', 3200),
  },
];

/** Find a product by slug or id */
export function findProduct(idOrSlug: string): Product | undefined {
  return PRODUCT_CATALOG.find(
    (p) => p.id === idOrSlug || p.slug === idOrSlug
  );
}

/** Get all products in a category */
export function getByCategory(category: Product['category']): Product[] {
  return PRODUCT_CATALOG.filter((p) => p.category === category);
}

/** Convert to CatalogItem shape for compatibility with existing shop page */
export function toCatalogItem(p: Product) {
  return {
    id: p.slug,
    name: p.name,
    description: p.description.split('\n')[0],
    images: p.images.angles,
    sport: p.sport,
    colorName: p.colorName,
    colorHex: p.colorHex,
    category: p.category,
    prices: p.prices,
  };
}
