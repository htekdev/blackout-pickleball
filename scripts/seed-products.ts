#!/usr/bin/env npx tsx
/**
 * Blackout Pickleball — Stripe Product Seed Script
 *
 * Creates ALL 12 products from the local PRODUCT_CATALOG in Stripe,
 * with metadata.slug for correlation between Stripe and local data.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_test_... npx tsx scripts/seed-products.ts
 *   STRIPE_SECRET_KEY=sk_test_... npx tsx scripts/seed-products.ts --dry-run
 *   STRIPE_SECRET_KEY=sk_test_... npx tsx scripts/seed-products.ts --force   # recreate all
 *
 * What it does:
 *   1. Reads the 12-product PRODUCT_CATALOG from src/lib/products.ts
 *   2. Fetches existing Stripe products to avoid duplicates (matched by metadata.slug)
 *   3. Creates products with metadata: slug, sport, color_name, color_hex, category
 *   4. Creates price objects for each size variant with metadata.size
 *   5. Reports a mapping of local slug → Stripe product ID → price IDs
 *
 * After running:
 *   - Shop page auto-discovers products via getCatalog() which merges
 *     Stripe prices (real IDs) with local images (360° photos)
 *   - Checkout uses real Stripe price IDs → payments work end-to-end
 */

import Stripe from 'stripe';

// ── Import product catalog ─────────────────────────────────────────────────
// We import the compiled catalog from the source of truth

interface ProductImage {
  thumbnail: string;
  angles: string[];
}

interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  colorName: string;
  colorHex: string;
  sport: string;
  images: ProductImage;
  prices: Array<{ id: string; amount: number; currency: string; size: string }>;
}

// ── CLI flags ───────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const FORCE = args.includes('--force');

// ── Inline product catalog (matches src/lib/products.ts exactly) ────────

const MEN_SIZES = ['S', 'M', 'L', 'XL', 'XXL'];
const WOMEN_SIZES = ['XS', 'S', 'M', 'L', 'XL'];

const MEN_TEE_PRICE = 3999;
const WOMEN_TANK_PRICE = 3499;

const TEE_DESC = `Premium court-ready crew tee — 85% Polyester / 15% Spandex. Breathable 4-way stretch, moisture-wicking technology, anti-odor treatment. Designed for peak performance in the heat of the game.`;

const TANK_DESC = `Performance racerback tank — 90% Polyester / 10% Spandex. Ultra-lightweight with open back design for maximum airflow. Breathable mesh panels keep you cool during intense rallies.`;

interface SeedProduct {
  slug: string;
  name: string;
  description: string;
  category: string;
  colorName: string;
  colorHex: string;
  sport: string;
  sizes: string[];
  pricePerSize: number;
}

const PRODUCTS: SeedProduct[] = [
  { slug: 'gold-crew-tee', name: "Gold Men's Crew Tee", description: TEE_DESC, category: 'mens-crew-tee', colorName: 'Gold / Mustard', colorHex: '#C8A951', sport: 'pickleball', sizes: MEN_SIZES, pricePerSize: MEN_TEE_PRICE },
  { slug: 'black-holographic-crew-tee', name: "Black Holographic Men's Crew Tee", description: TEE_DESC, category: 'mens-crew-tee', colorName: 'Black / Holographic', colorHex: '#1A1A1A', sport: 'pickleball', sizes: MEN_SIZES, pricePerSize: MEN_TEE_PRICE },
  { slug: 'black-racerback-tank', name: "Black Women's Racerback Tank", description: TANK_DESC, category: 'womens-racerback-tank', colorName: 'Black / Holographic', colorHex: '#1A1A1A', sport: 'pickleball', sizes: WOMEN_SIZES, pricePerSize: WOMEN_TANK_PRICE },
  { slug: 'tan-crew-tee', name: "Tan Men's Crew Tee", description: TEE_DESC, category: 'mens-crew-tee', colorName: 'Tan / Sand', colorHex: '#C2AD8D', sport: 'pickleball', sizes: MEN_SIZES, pricePerSize: MEN_TEE_PRICE },
  { slug: 'black-white-crew-tee', name: "Black Men's Crew Tee", description: TEE_DESC, category: 'mens-crew-tee', colorName: 'Black / White Logo', colorHex: '#111111', sport: 'pickleball', sizes: MEN_SIZES, pricePerSize: MEN_TEE_PRICE },
  { slug: 'gray-crew-tee', name: "Gray Men's Crew Tee", description: TEE_DESC, category: 'mens-crew-tee', colorName: 'Gray', colorHex: '#8C8C8C', sport: 'pickleball', sizes: MEN_SIZES, pricePerSize: MEN_TEE_PRICE },
  { slug: 'steel-blue-racerback-tank', name: "Steel Blue Women's Racerback Tank", description: TANK_DESC, category: 'womens-racerback-tank', colorName: 'Steel Blue', colorHex: '#5B7FA5', sport: 'pickleball', sizes: WOMEN_SIZES, pricePerSize: WOMEN_TANK_PRICE },
  { slug: 'olive-crew-tee', name: "Olive Men's Crew Tee", description: TEE_DESC, category: 'mens-crew-tee', colorName: 'Olive / Army Green', colorHex: '#5C6B3C', sport: 'pickleball', sizes: MEN_SIZES, pricePerSize: MEN_TEE_PRICE },
  { slug: 'maroon-racerback-tank', name: "Maroon Women's Racerback Tank", description: TANK_DESC, category: 'womens-racerback-tank', colorName: 'Maroon / Burgundy', colorHex: '#6B2D3E', sport: 'pickleball', sizes: WOMEN_SIZES, pricePerSize: WOMEN_TANK_PRICE },
  { slug: 'navy-crew-tee', name: "Navy Blue Men's Crew Tee", description: TEE_DESC, category: 'mens-crew-tee', colorName: 'Navy Blue / Holographic', colorHex: '#1B2A4A', sport: 'pickleball', sizes: MEN_SIZES, pricePerSize: MEN_TEE_PRICE },
  { slug: 'red-crew-tee', name: "Red Men's Crew Tee", description: TEE_DESC, category: 'mens-crew-tee', colorName: 'Red', colorHex: '#C0392B', sport: 'pickleball', sizes: MEN_SIZES, pricePerSize: MEN_TEE_PRICE },
  { slug: 'charcoal-racerback-tank', name: "Charcoal Women's Racerback Tank", description: TANK_DESC, category: 'womens-racerback-tank', colorName: 'Charcoal Gray', colorHex: '#4A4A4A', sport: 'pickleball', sizes: WOMEN_SIZES, pricePerSize: WOMEN_TANK_PRICE },
];

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  // 1. Validate env
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.error('❌ STRIPE_SECRET_KEY environment variable is required.');
    console.error('   Usage: STRIPE_SECRET_KEY=sk_test_... npx tsx scripts/seed-products.ts');
    process.exit(1);
  }

  const isTest = key.startsWith('sk_test_');
  const isLive = key.startsWith('sk_live_');
  if (!isTest && !isLive) {
    console.error('❌ STRIPE_SECRET_KEY must start with sk_test_ or sk_live_');
    process.exit(1);
  }

  console.log(`\n🏓 Blackout Pickleball — Stripe Product Seeder`);
  console.log(`   Mode: ${isTest ? '🧪 TEST' : '🔴 LIVE'}`);
  console.log(`   Products: ${PRODUCTS.length}`);
  if (DRY_RUN) console.log(`   🏃 DRY RUN — no changes will be made`);
  if (FORCE) console.log(`   ⚠️  FORCE — will create even if products already exist`);
  console.log('');

  // 2. Init Stripe
  const stripe = new Stripe(key);

  // 3. Fetch existing products for duplicate detection (match by metadata.slug)
  const existingSlugs = new Map<string, string>(); // slug → productId
  if (!FORCE && !DRY_RUN) {
    console.log('🔍 Checking existing Stripe products...');
    let hasMore = true;
    let startingAfter: string | undefined;
    while (hasMore) {
      const batch: Stripe.ApiList<Stripe.Product> = await stripe.products.list({
        limit: 100,
        active: true,
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      });
      for (const p of batch.data) {
        if (p.metadata?.slug) {
          existingSlugs.set(p.metadata.slug, p.id);
        }
      }
      hasMore = batch.has_more;
      if (batch.data.length > 0) {
        startingAfter = batch.data[batch.data.length - 1].id;
      }
    }
    console.log(`   Found ${existingSlugs.size} existing product(s) with slug metadata\n`);
  }

  // 4. Create products + prices
  let created = 0;
  let skipped = 0;
  let pricesCreated = 0;
  const mapping: Array<{
    slug: string;
    name: string;
    status: string;
    stripeProductId?: string;
    prices?: Array<{ size: string; stripePriceId: string; amount: number }>;
  }> = [];

  for (const product of PRODUCTS) {
    // Skip if exists (unless --force)
    if (!FORCE && existingSlugs.has(product.slug)) {
      console.log(`⏭️  SKIP: "${product.name}" (${product.slug}) — already in Stripe (${existingSlugs.get(product.slug)})`);
      skipped++;
      mapping.push({ slug: product.slug, name: product.name, status: 'skipped', stripeProductId: existingSlugs.get(product.slug) });
      continue;
    }

    if (DRY_RUN) {
      console.log(`🏃 WOULD CREATE: "${product.name}" (${product.slug}) — ${product.sizes.length} size(s) @ $${(product.pricePerSize / 100).toFixed(2)}`);
      mapping.push({ slug: product.slug, name: product.name, status: 'dry-run' });
      continue;
    }

    // Create product with slug metadata for correlation
    console.log(`✨ Creating: "${product.name}" (${product.slug})`);
    const stripeProduct = await stripe.products.create({
      name: product.name,
      description: product.description,
      metadata: {
        slug: product.slug,
        sport: product.sport,
        category: product.category,
        color_name: product.colorName,
        color_hex: product.colorHex,
        source: 'seed-script',
        seeded_at: new Date().toISOString(),
      },
    });

    console.log(`   ✅ Product: ${stripeProduct.id}`);
    created++;

    // Create prices for each size
    const productPrices: Array<{ size: string; stripePriceId: string; amount: number }> = [];
    for (const size of product.sizes) {
      const stripePrice = await stripe.prices.create({
        product: stripeProduct.id,
        unit_amount: product.pricePerSize,
        currency: 'usd',
        nickname: `${product.name} - ${size}`,
        metadata: { size },
      });
      console.log(`   💰 ${size}: $${(product.pricePerSize / 100).toFixed(2)} → ${stripePrice.id}`);
      productPrices.push({ size, stripePriceId: stripePrice.id, amount: product.pricePerSize });
      pricesCreated++;
    }

    mapping.push({
      slug: product.slug,
      name: product.name,
      status: 'created',
      stripeProductId: stripeProduct.id,
      prices: productPrices,
    });
    console.log('');
  }

  // 5. Summary
  console.log('\n' + '═'.repeat(70));
  console.log('📊 SEED SUMMARY');
  console.log('═'.repeat(70));
  console.log(`   Products created:  ${created}`);
  console.log(`   Products skipped:  ${skipped}`);
  console.log(`   Prices created:    ${pricesCreated}`);
  console.log(`   Mode:              ${isTest ? '🧪 TEST' : '🔴 LIVE'}`);
  if (DRY_RUN) console.log(`   ⚠️  DRY RUN — nothing was actually created`);
  console.log('');

  // Mapping table
  console.log('   LOCAL SLUG → STRIPE ID MAPPING');
  console.log('   ' + '─'.repeat(66));
  console.log(`   ${'Slug'.padEnd(35)} ${'Status'.padEnd(10)} Stripe Product ID`);
  console.log('   ' + '─'.repeat(66));
  for (const m of mapping) {
    console.log(`   ${m.slug.padEnd(35)} ${m.status.padEnd(10)} ${m.stripeProductId || '—'}`);
  }

  console.log('\n✅ Done!');
  if (created > 0) {
    console.log('   → Shop page will auto-discover these products via getCatalog()');
    console.log('   → Local 360° images merge with Stripe prices via metadata.slug');
    console.log('   → Checkout uses real Stripe price IDs — payments work end-to-end');
  }
  console.log('');
}

main().catch((err) => {
  console.error('\n❌ Fatal error:', err.message);
  if (err.type === 'StripeAuthenticationError') {
    console.error('   Check your STRIPE_SECRET_KEY — it may be invalid or expired.');
  }
  process.exit(1);
});
