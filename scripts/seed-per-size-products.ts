#!/usr/bin/env npx tsx
/**
 * Blackout Pickleball — Per-Size Stripe Product Seeder
 *
 * Creates SEPARATE Stripe products for each size variant so Jonathan
 * sees the exact size in every Stripe dashboard transaction.
 *
 * Instead of:  "Gold Men's Crew Tee" (1 product, 5 prices)
 * Creates:     "Gold Men's Crew Tee - S" (1 product, 1 price)
 *              "Gold Men's Crew Tee - M" (1 product, 1 price)
 *              "Gold Men's Crew Tee - L" (1 product, 1 price)
 *              ... etc.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_live_... npx tsx scripts/seed-per-size-products.ts
 *   STRIPE_SECRET_KEY=sk_live_... npx tsx scripts/seed-per-size-products.ts --dry-run
 *   STRIPE_SECRET_KEY=sk_live_... npx tsx scripts/seed-per-size-products.ts --skip-archive
 *
 * Steps:
 *   1. Archives ALL existing active products (deactivates them)
 *   2. Creates 60 per-size products with metadata.base_slug for site grouping
 *   3. Each product gets exactly ONE price
 *   4. Site's getCatalog() groups by base_slug → shows 12 cards with size selectors
 */

import Stripe from 'stripe';

// ── CLI flags ───────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const SKIP_ARCHIVE = args.includes('--skip-archive');

// ── Product definitions ─────────────────────────────────────────────────────

const MEN_SIZES = ['S', 'M', 'L', 'XL', 'XXL'];
const WOMEN_SIZES = ['XS', 'S', 'M', 'L', 'XL'];

const MEN_TEE_PRICE = 3999;   // $39.99
const WOMEN_TANK_PRICE = 3499; // $34.99

const TEE_DESC = `Premium court-ready crew tee — 85% Polyester / 15% Spandex. Breathable 4-way stretch, moisture-wicking technology, anti-odor treatment. Designed for peak performance in the heat of the game.`;
const TANK_DESC = `Performance racerback tank — 90% Polyester / 10% Spandex. Ultra-lightweight with open back design for maximum airflow. Breathable mesh panels keep you cool during intense rallies.`;

interface BaseProduct {
  baseSlug: string;
  baseName: string;
  description: string;
  category: string;
  colorName: string;
  colorHex: string;
  sport: string;
  sizes: string[];
  pricePerSize: number;
}

const BASE_PRODUCTS: BaseProduct[] = [
  { baseSlug: 'gold-crew-tee', baseName: "Gold Men's Crew Tee", description: TEE_DESC, category: 'mens-crew-tee', colorName: 'Gold / Mustard', colorHex: '#C8A951', sport: 'pickleball', sizes: MEN_SIZES, pricePerSize: MEN_TEE_PRICE },
  { baseSlug: 'black-holographic-crew-tee', baseName: "Black Holographic Men's Crew Tee", description: TEE_DESC, category: 'mens-crew-tee', colorName: 'Black / Holographic', colorHex: '#1A1A1A', sport: 'pickleball', sizes: MEN_SIZES, pricePerSize: MEN_TEE_PRICE },
  { baseSlug: 'black-racerback-tank', baseName: "Black Women's Racerback Tank", description: TANK_DESC, category: 'womens-racerback-tank', colorName: 'Black / Holographic', colorHex: '#1A1A1A', sport: 'pickleball', sizes: WOMEN_SIZES, pricePerSize: WOMEN_TANK_PRICE },
  { baseSlug: 'tan-crew-tee', baseName: "Tan Men's Crew Tee", description: TEE_DESC, category: 'mens-crew-tee', colorName: 'Tan / Sand', colorHex: '#C2AD8D', sport: 'pickleball', sizes: MEN_SIZES, pricePerSize: MEN_TEE_PRICE },
  { baseSlug: 'black-white-crew-tee', baseName: "Black Men's Crew Tee", description: TEE_DESC, category: 'mens-crew-tee', colorName: 'Black / White Logo', colorHex: '#111111', sport: 'pickleball', sizes: MEN_SIZES, pricePerSize: MEN_TEE_PRICE },
  { baseSlug: 'gray-crew-tee', baseName: "Gray Men's Crew Tee", description: TEE_DESC, category: 'mens-crew-tee', colorName: 'Gray', colorHex: '#8C8C8C', sport: 'pickleball', sizes: MEN_SIZES, pricePerSize: MEN_TEE_PRICE },
  { baseSlug: 'steel-blue-racerback-tank', baseName: "Steel Blue Women's Racerback Tank", description: TANK_DESC, category: 'womens-racerback-tank', colorName: 'Steel Blue', colorHex: '#5B7FA5', sport: 'pickleball', sizes: WOMEN_SIZES, pricePerSize: WOMEN_TANK_PRICE },
  { baseSlug: 'olive-crew-tee', baseName: "Olive Men's Crew Tee", description: TEE_DESC, category: 'mens-crew-tee', colorName: 'Olive / Army Green', colorHex: '#5C6B3C', sport: 'pickleball', sizes: MEN_SIZES, pricePerSize: MEN_TEE_PRICE },
  { baseSlug: 'maroon-racerback-tank', baseName: "Maroon Women's Racerback Tank", description: TANK_DESC, category: 'womens-racerback-tank', colorName: 'Maroon / Burgundy', colorHex: '#6B2D3E', sport: 'pickleball', sizes: WOMEN_SIZES, pricePerSize: WOMEN_TANK_PRICE },
  { baseSlug: 'navy-crew-tee', baseName: "Navy Blue Men's Crew Tee", description: TEE_DESC, category: 'mens-crew-tee', colorName: 'Navy Blue / Holographic', colorHex: '#1B2A4A', sport: 'pickleball', sizes: MEN_SIZES, pricePerSize: MEN_TEE_PRICE },
  { baseSlug: 'red-crew-tee', baseName: "Red Men's Crew Tee", description: TEE_DESC, category: 'mens-crew-tee', colorName: 'Red', colorHex: '#C0392B', sport: 'pickleball', sizes: MEN_SIZES, pricePerSize: MEN_TEE_PRICE },
  { baseSlug: 'charcoal-racerback-tank', baseName: "Charcoal Women's Racerback Tank", description: TANK_DESC, category: 'womens-racerback-tank', colorName: 'Charcoal Gray', colorHex: '#4A4A4A', sport: 'pickleball', sizes: WOMEN_SIZES, pricePerSize: WOMEN_TANK_PRICE },
];

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.error('❌ STRIPE_SECRET_KEY environment variable is required.');
    process.exit(1);
  }

  const isTest = key.startsWith('sk_test_');
  const isLive = key.startsWith('sk_live_');
  if (!isTest && !isLive) {
    console.error('❌ STRIPE_SECRET_KEY must start with sk_test_ or sk_live_');
    process.exit(1);
  }

  const totalProducts = BASE_PRODUCTS.reduce((sum, p) => sum + p.sizes.length, 0);

  console.log(`\n🏓 Blackout Pickleball — Per-Size Stripe Product Seeder`);
  console.log(`   Mode: ${isTest ? '🧪 TEST' : '🔴 LIVE'}`);
  console.log(`   Base products: ${BASE_PRODUCTS.length}`);
  console.log(`   Per-size products to create: ${totalProducts}`);
  if (DRY_RUN) console.log(`   🏃 DRY RUN — no changes will be made`);
  if (SKIP_ARCHIVE) console.log(`   ⏭️  SKIP ARCHIVE — will not deactivate old products`);
  console.log('');

  const stripe = new Stripe(key);

  // ── Step 1: Archive all existing active products ──────────────────────

  if (!SKIP_ARCHIVE && !DRY_RUN) {
    console.log('🗄️  Archiving ALL existing active products...');
    let archived = 0;
    let hasMore = true;
    let startingAfter: string | undefined;

    while (hasMore) {
      const batch = await stripe.products.list({
        limit: 100,
        active: true,
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      });

      for (const product of batch.data) {
        // First deactivate all prices for this product
        const prices = await stripe.prices.list({
          product: product.id,
          active: true,
          limit: 100,
        });
        for (const price of prices.data) {
          await stripe.prices.update(price.id, { active: false });
        }

        // Then deactivate the product
        await stripe.products.update(product.id, { active: false });
        console.log(`   📦 Archived: "${product.name}" (${product.id})`);
        archived++;
      }

      hasMore = batch.has_more;
      if (batch.data.length > 0) {
        startingAfter = batch.data[batch.data.length - 1].id;
      }
    }
    console.log(`   ✅ Archived ${archived} product(s)\n`);
  } else if (!SKIP_ARCHIVE && DRY_RUN) {
    console.log('🏃 WOULD archive all existing active products\n');
  }

  // ── Step 2: Create per-size products ──────────────────────────────────

  let created = 0;
  const mapping: Array<{
    displayName: string;
    stripeProductId: string;
    stripePriceId: string;
    baseSlug: string;
    size: string;
  }> = [];

  for (const base of BASE_PRODUCTS) {
    console.log(`📦 ${base.baseName} (${base.sizes.length} sizes)`);

    for (const size of base.sizes) {
      const displayName = `${base.baseName} - ${size}`;
      const sizeSlug = `${base.baseSlug}-${size.toLowerCase()}`;

      if (DRY_RUN) {
        console.log(`   🏃 WOULD CREATE: "${displayName}" @ $${(base.pricePerSize / 100).toFixed(2)}`);
        mapping.push({ displayName, stripeProductId: '—', stripePriceId: '—', baseSlug: base.baseSlug, size });
        continue;
      }

      // Create the product with size in the name
      const stripeProduct = await stripe.products.create({
        name: displayName,
        description: base.description,
        metadata: {
          base_slug: base.baseSlug,     // For site grouping (12 display products)
          slug: sizeSlug,               // Unique per-size slug
          size: size,                    // The size
          sport: base.sport,
          category: base.category,
          color_name: base.colorName,
          color_hex: base.colorHex,
          source: 'seed-per-size',
          seeded_at: new Date().toISOString(),
        },
      });

      // Create exactly ONE price for this product
      const stripePrice = await stripe.prices.create({
        product: stripeProduct.id,
        unit_amount: base.pricePerSize,
        currency: 'usd',
        metadata: {
          size: size,
          base_slug: base.baseSlug,
        },
      });

      console.log(`   ✅ ${size}: ${stripeProduct.id} → ${stripePrice.id}`);
      mapping.push({
        displayName,
        stripeProductId: stripeProduct.id,
        stripePriceId: stripePrice.id,
        baseSlug: base.baseSlug,
        size,
      });
      created++;
    }
    console.log('');
  }

  // ── Summary ───────────────────────────────────────────────────────────

  console.log('═'.repeat(70));
  console.log('📊 SEED SUMMARY');
  console.log('═'.repeat(70));
  console.log(`   Per-size products created: ${created}`);
  console.log(`   Mode: ${isTest ? '🧪 TEST' : '🔴 LIVE'}`);
  if (DRY_RUN) console.log(`   ⚠️  DRY RUN — nothing was actually created`);
  console.log('');

  // Grouped mapping table
  console.log('   STRIPE PRODUCT MAPPING (grouped by base product)');
  console.log('   ' + '─'.repeat(66));
  let currentBase = '';
  for (const m of mapping) {
    if (m.baseSlug !== currentBase) {
      currentBase = m.baseSlug;
      console.log(`\n   ${m.baseSlug}:`);
    }
    console.log(`     ${m.size.padEnd(4)} → Product: ${m.stripeProductId}  Price: ${m.stripePriceId}`);
  }

  console.log(`\n\n✅ Done! ${created} per-size products created.`);
  console.log('   → Each product name includes the size (e.g. "Gold Men\'s Crew Tee - L")');
  console.log('   → Jonathan sees the EXACT size in Stripe dashboard transactions');
  console.log('   → Site groups products by metadata.base_slug for display');
  console.log('');
}

main().catch((err) => {
  console.error('\n❌ Fatal error:', err.message);
  if (err.type === 'StripeAuthenticationError') {
    console.error('   Check your STRIPE_SECRET_KEY — it may be invalid or expired.');
  }
  process.exit(1);
});
