import Stripe from 'stripe';
import { findProduct, PRODUCT_CATALOG, type Product } from './products';

// Server-only — never import this on the client.
// Use process.env for Vercel serverless runtime access.
const stripeKey = process.env.STRIPE_SECRET_KEY || import.meta.env.STRIPE_SECRET_KEY || '';
export const stripe = new Stripe(stripeKey);

export async function getActiveProducts() {
  const products = await stripe.products.list({ active: true, limit: 100 });
  return products.data;
}

export async function getActivePrices() {
  const prices = await stripe.prices.list({ active: true, limit: 100 });
  return prices.data;
}

export interface CatalogItem {
  id: string;
  name: string;
  description: string | null;
  images: string[];
  sport: string;
  colorName?: string;
  colorHex?: string;
  category?: string;
  stripeProductId?: string;
  /** True when using real Stripe price IDs (checkout will work) */
  isLive: boolean;
  prices: Array<{
    id: string;
    amount: number;
    currency: string;
    size: string;
  }>;
}

const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', 'One Size'];

/**
 * Normalize a product name for fuzzy matching.
 * Strips common suffixes, lowercases, removes non-alphanumeric chars.
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/\s*(men'?s?|women'?s?)\s*/gi, ' ')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Find a local product that matches a Stripe product by name similarity.
 * Uses normalized name comparison as fallback when metadata.slug is missing.
 */
function findLocalByName(stripeName: string): Product | undefined {
  const normalized = normalizeName(stripeName);

  // Try exact normalized match first
  const exact = PRODUCT_CATALOG.find(
    (p) => normalizeName(p.name) === normalized
  );
  if (exact) return exact;

  // Try contains-based matching (Stripe name contains local name or vice versa)
  const byContains = PRODUCT_CATALOG.find((p) => {
    const localNorm = normalizeName(p.name);
    return normalized.includes(localNorm) || localNorm.includes(normalized);
  });
  if (byContains) return byContains;

  // Try keyword overlap scoring
  const normalizedWords = new Set(normalized.split(' ').filter(w => w.length > 2));
  let bestMatch: Product | undefined;
  let bestScore = 0;

  for (const p of PRODUCT_CATALOG) {
    const localWords = new Set(normalizeName(p.name).split(' ').filter(w => w.length > 2));
    let score = 0;
    for (const word of normalizedWords) {
      if (localWords.has(word)) score++;
    }
    // Need at least 2 matching keywords (e.g. "gold" + "crew" or "black" + "holographic")
    if (score > bestScore && score >= 2) {
      bestScore = score;
      bestMatch = p;
    }
  }

  return bestMatch;
}

/**
 * Fetch the live Stripe catalog and merge with local product data.
 *
 * Matching strategy (in order of priority):
 *   1. metadata.slug → findProduct(slug) — canonical match
 *   2. Name-based fuzzy matching — fallback for products without slug metadata
 *
 * This merge gives us:
 *   - REAL Stripe price IDs (for checkout)
 *   - LOCAL images (for 360° viewer)
 *   - LOCAL color info (for swatches)
 *   - Slug-based IDs (for stable URLs)
 */
export async function getCatalog(): Promise<CatalogItem[]> {
  const [products, prices] = await Promise.all([
    getActiveProducts(),
    getActivePrices(),
  ]);

  // Track which local products have been matched (avoid double-matching)
  const matchedLocalIds = new Set<string>();

  return products.map((product) => {
    // Strategy 1: Look up by metadata.slug (canonical)
    const slug = product.metadata?.slug;
    let local: Product | undefined = slug ? findProduct(slug) : undefined;

    // Strategy 2: Name-based fallback matching
    if (!local) {
      local = findLocalByName(product.name);
      // Don't reuse a local that's already matched to another Stripe product
      if (local && matchedLocalIds.has(local.id)) {
        local = undefined;
      }
    }

    if (local) {
      matchedLocalIds.add(local.id);
    }

    const stripePrices = prices
      .filter((p) => p.product === product.id)
      .map((p) => ({
        id: p.id,
        amount: p.unit_amount || 0,
        currency: p.currency,
        size: p.metadata?.size || p.nickname || 'One Size',
      }))
      .sort((a, b) => SIZE_ORDER.indexOf(a.size) - SIZE_ORDER.indexOf(b.size));

    return {
      // Use slug or local slug as ID (keeps URLs stable), fall back to Stripe ID
      id: slug || local?.slug || product.id,
      stripeProductId: product.id,
      name: product.name,
      description: product.description,
      // Prefer local images (360° photos) over Stripe images
      images: local ? local.images.angles : product.images,
      sport: (product.metadata?.sport || 'pickleball').toLowerCase(),
      colorName: local?.colorName || product.metadata?.color_name,
      colorHex: local?.colorHex || product.metadata?.color_hex,
      category: local?.category || product.metadata?.category,
      // These are REAL Stripe price IDs — checkout will work
      isLive: stripePrices.length > 0,
      prices: stripePrices,
    };
  });
}

/**
 * Fetch a single product from Stripe by slug.
 * Searches by metadata.slug first, then falls back to name matching.
 */
export async function getProductBySlug(slug: string): Promise<CatalogItem | null> {
  // Try local product for images
  const local = findProduct(slug);

  // Strategy 1: Search Stripe by metadata.slug
  let stripeProduct: Stripe.Product | undefined;
  try {
    const products = await stripe.products.search({
      query: `metadata['slug']:'${slug}'`,
      limit: 1,
    });
    stripeProduct = products.data[0];
  } catch {
    // Search API might not be available — fall back to listing
  }

  // Strategy 2: If no slug match, search by name
  if (!stripeProduct && local) {
    const allProducts = await getActiveProducts();
    stripeProduct = allProducts.find((p) => {
      const matched = findLocalByName(p.name);
      return matched?.slug === slug;
    });
  }

  if (!stripeProduct) return null;

  const prices = await stripe.prices.list({
    product: stripeProduct.id,
    active: true,
    limit: 100,
  });

  const stripePrices = prices.data
    .map((p) => ({
      id: p.id,
      amount: p.unit_amount || 0,
      currency: p.currency,
      size: p.metadata?.size || p.nickname || 'One Size',
    }))
    .sort((a, b) => SIZE_ORDER.indexOf(a.size) - SIZE_ORDER.indexOf(b.size));

  return {
    id: slug,
    stripeProductId: stripeProduct.id,
    name: stripeProduct.name,
    description: stripeProduct.description,
    images: local ? local.images.angles : stripeProduct.images,
    sport: (stripeProduct.metadata?.sport || 'pickleball').toLowerCase(),
    colorName: local?.colorName || stripeProduct.metadata?.color_name,
    colorHex: local?.colorHex || stripeProduct.metadata?.color_hex,
    category: local?.category || stripeProduct.metadata?.category,
    isLive: stripePrices.length > 0,
    prices: stripePrices,
  };
}

/**
 * Validate that a price ID is a real Stripe price (starts with "price_").
 * Fake/demo IDs look like "gold_crew_tee_m" — these will fail at checkout.
 */
export function isRealPriceId(priceId: string): boolean {
  return priceId.startsWith('price_');
}
