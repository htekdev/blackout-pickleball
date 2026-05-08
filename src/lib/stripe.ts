import Stripe from 'stripe';
import { findProduct, type Product } from './products';

// Server-only — never import this on the client.
// Use process.env for Vercel serverless runtime access.
const stripeKey = process.env.STRIPE_SECRET_KEY || import.meta.env.STRIPE_SECRET_KEY || 'sk_test_placeholder';
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
  prices: Array<{
    id: string;
    amount: number;
    currency: string;
    size: string;
  }>;
}

const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', 'One Size'];

/**
 * Fetch the live Stripe catalog and merge with local product data.
 *
 * Each Stripe product should have `metadata.slug` matching a local product slug.
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

  return products.map((product) => {
    // Look up local product by metadata.slug for images/colors
    const slug = product.metadata?.slug;
    const local: Product | undefined = slug ? findProduct(slug) : undefined;

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
      // Use slug as ID (keeps URLs stable), fall back to Stripe ID
      id: slug || product.id,
      stripeProductId: product.id,
      name: product.name,
      description: product.description,
      // Prefer local images (360° photos) over Stripe images
      images: local ? local.images.angles : product.images,
      sport: (product.metadata?.sport || 'pickleball').toLowerCase(),
      colorName: local?.colorName || product.metadata?.color_name,
      colorHex: local?.colorHex || product.metadata?.color_hex,
      category: local?.category || product.metadata?.category,
      // REAL Stripe price IDs for checkout
      prices: stripePrices,
    };
  });
}

/**
 * Fetch a single product from Stripe by slug.
 * Searches Stripe products by metadata.slug, merges with local data.
 */
export async function getProductBySlug(slug: string): Promise<CatalogItem | null> {
  // Try local product for images
  const local = findProduct(slug);

  // Search Stripe for product with this slug
  const products = await stripe.products.search({
    query: `metadata['slug']:'${slug}'`,
    limit: 1,
  });

  const stripeProduct = products.data[0];
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
    prices: stripePrices,
  };
}
