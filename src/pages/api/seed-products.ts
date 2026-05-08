export const prerender = false;

import type { APIRoute } from 'astro';
import { stripe, getActiveProducts, getActivePrices } from '../../lib/stripe';
import { PRODUCT_CATALOG } from '../../lib/products';

/**
 * POST /api/seed-products — Seeds all 12 products into Stripe with proper metadata.
 *
 * This runs server-side where STRIPE_SECRET_KEY is available.
 * Idempotent: skips products that already have metadata.slug matching local catalog.
 *
 * Query params:
 *   ?dry-run=true  — report what would be created without creating
 *   ?force=true    — create even if products already exist (creates duplicates)
 *
 * Security: Only works with sk_test_ keys (blocks live mode for safety).
 */
export const POST: APIRoute = async ({ request }) => {
  const headers = { 'Content-Type': 'application/json' };
  const url = new URL(request.url);
  const dryRun = url.searchParams.get('dry-run') === 'true';
  const force = url.searchParams.get('force') === 'true';

  try {
    // Safety check — only allow in test mode
    const key = process.env.STRIPE_SECRET_KEY || import.meta.env.STRIPE_SECRET_KEY || '';
    if (!key.startsWith('sk_test_')) {
      return new Response(
        JSON.stringify({ error: 'Seed only allowed in test mode (sk_test_ key required)' }),
        { status: 403, headers }
      );
    }

    // 1. Fetch existing products and check which slugs already exist
    const existingProducts = await getActiveProducts();
    const existingSlugs = new Map<string, string>();
    for (const p of existingProducts) {
      if (p.metadata?.slug) {
        existingSlugs.set(p.metadata.slug, p.id);
      }
    }

    // 2. Seed missing products
    const results: Array<{
      slug: string;
      name: string;
      status: 'created' | 'skipped' | 'dry-run';
      stripeProductId?: string;
      pricesCreated?: number;
    }> = [];

    let created = 0;
    let skipped = 0;
    let pricesCreated = 0;

    // Men's sizes and Women's sizes
    const MEN_SIZES = ['S', 'M', 'L', 'XL', 'XXL'];
    const WOMEN_SIZES = ['XS', 'S', 'M', 'L', 'XL'];

    for (const product of PRODUCT_CATALOG) {
      // Skip if already exists (unless force)
      if (!force && existingSlugs.has(product.slug)) {
        skipped++;
        results.push({
          slug: product.slug,
          name: product.name,
          status: 'skipped',
          stripeProductId: existingSlugs.get(product.slug),
        });
        continue;
      }

      if (dryRun) {
        results.push({ slug: product.slug, name: product.name, status: 'dry-run' });
        continue;
      }

      // Create the product
      const stripeProduct = await stripe.products.create({
        name: product.name,
        description: product.description.split('\n')[0], // First line only
        metadata: {
          slug: product.slug,
          sport: product.sport,
          category: product.category,
          color_name: product.colorName,
          color_hex: product.colorHex,
          source: 'api-seed',
          seeded_at: new Date().toISOString(),
        },
      });

      // Create prices for each size
      const sizes = product.category === 'womens-racerback-tank' ? WOMEN_SIZES : MEN_SIZES;
      const unitAmount = product.prices[0]?.amount || 3999;

      let productPrices = 0;
      for (const size of sizes) {
        await stripe.prices.create({
          product: stripeProduct.id,
          unit_amount: unitAmount,
          currency: 'usd',
          nickname: `${product.name} - ${size}`,
          metadata: { size },
        });
        productPrices++;
        pricesCreated++;
      }

      created++;
      results.push({
        slug: product.slug,
        name: product.name,
        status: 'created',
        stripeProductId: stripeProduct.id,
        pricesCreated: productPrices,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        dryRun,
        summary: {
          total: PRODUCT_CATALOG.length,
          created,
          skipped,
          pricesCreated,
          existingWithSlugs: existingSlugs.size,
        },
        results,
      }),
      { status: 200, headers }
    );
  } catch (error: any) {
    console.error('Seed error:', error);
    return new Response(
      JSON.stringify({ error: error.message, type: error.type }),
      { status: 500, headers }
    );
  }
};

/**
 * GET /api/seed-products — Returns current Stripe catalog diagnostic info.
 * Shows what products exist, which have slug metadata, and which are missing.
 */
export const GET: APIRoute = async () => {
  const headers = { 'Content-Type': 'application/json' };

  try {
    const [products, prices] = await Promise.all([
      getActiveProducts(),
      getActivePrices(),
    ]);

    // Analyze products
    const productInfo = products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.metadata?.slug || null,
      hasSlug: !!p.metadata?.slug,
      metadata: p.metadata,
      priceCount: prices.filter((pr) => pr.product === p.id).length,
      prices: prices
        .filter((pr) => pr.product === p.id)
        .map((pr) => ({
          id: pr.id,
          amount: pr.unit_amount,
          size: pr.metadata?.size || pr.nickname || 'unknown',
        })),
    }));

    // Compare with local catalog
    const localSlugs = PRODUCT_CATALOG.map((p) => p.slug);
    const matchedSlugs = productInfo.filter((p) => p.hasSlug).map((p) => p.slug);
    const missingSlugs = localSlugs.filter((s) => !matchedSlugs.includes(s));

    return new Response(
      JSON.stringify({
        stripeProducts: productInfo.length,
        withSlugMetadata: productInfo.filter((p) => p.hasSlug).length,
        withoutSlugMetadata: productInfo.filter((p) => !p.hasSlug).length,
        totalPrices: prices.length,
        localCatalogSize: PRODUCT_CATALOG.length,
        missingSlugs,
        products: productInfo,
      }),
      { status: 200, headers }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message, type: error.type }),
      { status: 500, headers }
    );
  }
};
