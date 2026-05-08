import Stripe from 'stripe';
import { findProduct, PRODUCT_CATALOG, type Product } from './products';

// Server-only — never import this on the client.
// Use process.env for Vercel serverless runtime access.
const stripeKey = process.env.STRIPE_SECRET_KEY || import.meta.env.STRIPE_SECRET_KEY || '';
export const stripe = new Stripe(stripeKey);

export async function getActiveProducts() {
  // With per-size products, we may have 60+ active products
  const allProducts: Stripe.Product[] = [];
  let hasMore = true;
  let startingAfter: string | undefined;

  while (hasMore) {
    const batch = await stripe.products.list({
      active: true,
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });
    allProducts.push(...batch.data);
    hasMore = batch.has_more;
    if (batch.data.length > 0) {
      startingAfter = batch.data[batch.data.length - 1].id;
    }
  }

  return allProducts;
}

export async function getActivePrices() {
  const allPrices: Stripe.Price[] = [];
  let hasMore = true;
  let startingAfter: string | undefined;

  while (hasMore) {
    const batch = await stripe.prices.list({
      active: true,
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });
    allPrices.push(...batch.data);
    hasMore = batch.has_more;
    if (batch.data.length > 0) {
      startingAfter = batch.data[batch.data.length - 1].id;
    }
  }

  return allPrices;
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
 * Architecture: Each size variant is a SEPARATE Stripe product so Jonathan
 * sees the exact size in his Stripe dashboard (e.g. "Gold Men's Crew Tee - L").
 *
 * Grouping strategy:
 *   1. Products with metadata.base_slug are grouped into one CatalogItem
 *      per base_slug (e.g. all "gold-crew-tee-*" → one display product)
 *   2. Legacy products (metadata.slug, no base_slug) matched 1:1 as before
 *   3. Name-based fuzzy matching as final fallback
 *
 * This merge gives us:
 *   - REAL Stripe price IDs from per-size products (for checkout)
 *   - LOCAL images (for 360° viewer)
 *   - LOCAL color info (for swatches)
 *   - Slug-based IDs (for stable URLs)
 */
export async function getCatalog(): Promise<CatalogItem[]> {
  const [products, prices] = await Promise.all([
    getActiveProducts(),
    getActivePrices(),
  ]);

  // ── Group per-size products by base_slug ──────────────────────────────
  // Products with metadata.base_slug are per-size variants that should be
  // grouped into a single display product with multiple price options.

  const perSizeGroups = new Map<string, {
    products: Stripe.Product[];
    prices: Stripe.Price[];
  }>();

  const legacyProducts: Stripe.Product[] = [];

  for (const product of products) {
    const baseSlug = product.metadata?.base_slug;
    if (baseSlug) {
      // Per-size product — group by base_slug
      if (!perSizeGroups.has(baseSlug)) {
        perSizeGroups.set(baseSlug, { products: [], prices: [] });
      }
      const group = perSizeGroups.get(baseSlug)!;
      group.products.push(product);
      // Collect prices for this per-size product
      const productPrices = prices.filter((p) => p.product === product.id);
      group.prices.push(...productPrices);
    } else {
      // Legacy product (no base_slug) — handle individually
      legacyProducts.push(product);
    }
  }

  const catalogItems: CatalogItem[] = [];
  const matchedLocalIds = new Set<string>();

  // ── Build catalog items from per-size groups ──────────────────────────
  for (const [baseSlug, group] of perSizeGroups) {
    // Find local product by base_slug
    const local = findProduct(baseSlug);
    if (local) matchedLocalIds.add(local.id);

    // Use the first product for shared metadata (description, etc.)
    const firstProduct = group.products[0];

    // Strip " - SIZE" suffix from the product name for display
    const displayName = firstProduct.name.replace(/\s*-\s*\S+$/, '');

    const stripePrices = group.prices
      .map((p) => ({
        id: p.id,
        amount: p.unit_amount || 0,
        currency: p.currency,
        size: p.metadata?.size || 'One Size',
      }))
      .sort((a, b) => SIZE_ORDER.indexOf(a.size) - SIZE_ORDER.indexOf(b.size));

    catalogItems.push({
      id: baseSlug,
      stripeProductId: firstProduct.id, // representative product ID
      name: local?.name || displayName,
      description: firstProduct.description,
      images: local ? local.images.angles : firstProduct.images,
      sport: (firstProduct.metadata?.sport || 'pickleball').toLowerCase(),
      colorName: local?.colorName || firstProduct.metadata?.color_name,
      colorHex: local?.colorHex || firstProduct.metadata?.color_hex,
      category: local?.category || firstProduct.metadata?.category,
      isLive: stripePrices.length > 0,
      prices: stripePrices,
    });
  }

  // ── Handle legacy products (no base_slug) ─────────────────────────────
  for (const product of legacyProducts) {
    const slug = product.metadata?.slug;
    let local: Product | undefined = slug ? findProduct(slug) : undefined;

    if (!local) {
      local = findLocalByName(product.name);
      if (local && matchedLocalIds.has(local.id)) {
        local = undefined;
      }
    }

    if (local) matchedLocalIds.add(local.id);

    const stripePrices = prices
      .filter((p) => p.product === product.id)
      .map((p) => ({
        id: p.id,
        amount: p.unit_amount || 0,
        currency: p.currency,
        size: p.metadata?.size || p.nickname || 'One Size',
      }))
      .sort((a, b) => SIZE_ORDER.indexOf(a.size) - SIZE_ORDER.indexOf(b.size));

    catalogItems.push({
      id: slug || local?.slug || product.id,
      stripeProductId: product.id,
      name: product.name,
      description: product.description,
      images: local ? local.images.angles : product.images,
      sport: (product.metadata?.sport || 'pickleball').toLowerCase(),
      colorName: local?.colorName || product.metadata?.color_name,
      colorHex: local?.colorHex || product.metadata?.color_hex,
      category: local?.category || product.metadata?.category,
      isLive: stripePrices.length > 0,
      prices: stripePrices,
    });
  }

  return catalogItems;
}

/**
 * Fetch a single product from Stripe by slug.
 *
 * For per-size products: searches by metadata.base_slug, collects all
 * size variants, and returns a single CatalogItem with multiple prices.
 * Falls back to metadata.slug search for legacy products.
 */
export async function getProductBySlug(slug: string): Promise<CatalogItem | null> {
  const local = findProduct(slug);

  // Strategy 1: Search for per-size products by base_slug
  let perSizeProducts: Stripe.Product[] = [];
  try {
    const result = await stripe.products.search({
      query: `metadata['base_slug']:'${slug}'`,
      limit: 100,
    });
    perSizeProducts = result.data.filter((p) => p.active);
  } catch {
    // Search API might not be available — fall back below
  }

  if (perSizeProducts.length > 0) {
    // Collect prices from all per-size products
    const allPrices: Stripe.Price[] = [];
    for (const product of perSizeProducts) {
      const productPrices = await stripe.prices.list({
        product: product.id,
        active: true,
        limit: 10,
      });
      allPrices.push(...productPrices.data);
    }

    const stripePrices = allPrices
      .map((p) => ({
        id: p.id,
        amount: p.unit_amount || 0,
        currency: p.currency,
        size: p.metadata?.size || 'One Size',
      }))
      .sort((a, b) => SIZE_ORDER.indexOf(a.size) - SIZE_ORDER.indexOf(b.size));

    const firstProduct = perSizeProducts[0];
    const displayName = firstProduct.name.replace(/\s*-\s*\S+$/, '');

    return {
      id: slug,
      stripeProductId: firstProduct.id,
      name: local?.name || displayName,
      description: firstProduct.description,
      images: local ? local.images.angles : firstProduct.images,
      sport: (firstProduct.metadata?.sport || 'pickleball').toLowerCase(),
      colorName: local?.colorName || firstProduct.metadata?.color_name,
      colorHex: local?.colorHex || firstProduct.metadata?.color_hex,
      category: local?.category || firstProduct.metadata?.category,
      isLive: stripePrices.length > 0,
      prices: stripePrices,
    };
  }

  // Strategy 2: Legacy — search by metadata.slug
  let stripeProduct: Stripe.Product | undefined;
  try {
    const products = await stripe.products.search({
      query: `metadata['slug']:'${slug}'`,
      limit: 1,
    });
    stripeProduct = products.data[0];
  } catch {
    // Search API might not be available
  }

  // Strategy 3: Name-based fallback
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
