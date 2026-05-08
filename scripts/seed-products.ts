#!/usr/bin/env npx tsx
/**
 * Blackout Pickleball — Stripe Product Seed Script
 *
 * Creates products and prices in Stripe from products.json config.
 * Safe to re-run — skips products that already exist (matched by name).
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_test_... npx tsx scripts/seed-products.ts
 *   STRIPE_SECRET_KEY=sk_test_... npx tsx scripts/seed-products.ts --dry-run
 *   STRIPE_SECRET_KEY=sk_test_... npx tsx scripts/seed-products.ts --force   # recreate all
 *
 * Env vars:
 *   STRIPE_SECRET_KEY  — required (test or live key)
 *
 * What it does:
 *   1. Reads products.json for the product catalog
 *   2. Fetches existing Stripe products to avoid duplicates
 *   3. Creates new products with sport metadata
 *   4. Creates price objects for each size variant
 *   5. Reports a summary of what was created/skipped
 */

import Stripe from 'stripe';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ── Config ──────────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const PRODUCTS_FILE = resolve(__dirname, 'products.json');

interface ProductPrice {
  size: string;
  price_cents: number;
}

interface ProductConfig {
  name: string;
  description: string;
  sport: string;
  images: string[];
  prices: ProductPrice[];
}

interface ProductsFile {
  products: ProductConfig[];
}

// ── CLI flags ───────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const FORCE = args.includes('--force');

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
  if (DRY_RUN) console.log(`   🏃 DRY RUN — no changes will be made`);
  if (FORCE) console.log(`   ⚠️  FORCE — will create duplicates if products exist`);
  console.log('');

  // 2. Load product config
  let config: ProductsFile;
  try {
    const raw = readFileSync(PRODUCTS_FILE, 'utf-8');
    config = JSON.parse(raw);
  } catch (err: any) {
    console.error(`❌ Failed to read ${PRODUCTS_FILE}: ${err.message}`);
    process.exit(1);
  }

  if (!config.products || !Array.isArray(config.products)) {
    console.error('❌ products.json must have a "products" array');
    process.exit(1);
  }

  console.log(`📦 Found ${config.products.length} product(s) in products.json\n`);

  // 3. Init Stripe
  const stripe = new Stripe(key);

  // 4. Fetch existing products for duplicate detection
  let existingProducts: Stripe.Product[] = [];
  if (!FORCE && !DRY_RUN) {
    console.log('🔍 Checking existing Stripe products...');
    const existing = await stripe.products.list({ limit: 100, active: true });
    existingProducts = existing.data;
    console.log(`   Found ${existingProducts.length} existing product(s)\n`);
  }

  const existingNames = new Set(existingProducts.map((p) => p.name.toLowerCase().trim()));

  // 5. Create products + prices
  let created = 0;
  let skipped = 0;
  let pricesCreated = 0;
  const results: Array<{ name: string; status: string; productId?: string; priceCount?: number }> = [];

  for (const product of config.products) {
    const normalizedName = product.name.toLowerCase().trim();

    // Skip if exists (unless --force)
    if (!FORCE && existingNames.has(normalizedName)) {
      console.log(`⏭️  SKIP: "${product.name}" — already exists in Stripe`);
      skipped++;
      results.push({ name: product.name, status: 'skipped (exists)' });
      continue;
    }

    if (DRY_RUN) {
      console.log(`🏃 DRY RUN: Would create "${product.name}" with ${product.prices.length} price(s)`);
      for (const price of product.prices) {
        console.log(`   → ${price.size}: $${(price.price_cents / 100).toFixed(2)}`);
      }
      results.push({ name: product.name, status: 'would create', priceCount: product.prices.length });
      continue;
    }

    // Create product
    console.log(`✨ Creating: "${product.name}"`);
    const stripeProduct = await stripe.products.create({
      name: product.name,
      description: product.description,
      images: product.images.length > 0 ? product.images : undefined,
      metadata: {
        sport: product.sport,
        source: 'seed-script',
        seeded_at: new Date().toISOString(),
      },
    });

    console.log(`   ✅ Product created: ${stripeProduct.id}`);
    created++;

    // Create prices for each size
    for (const priceConfig of product.prices) {
      const stripePrice = await stripe.prices.create({
        product: stripeProduct.id,
        unit_amount: priceConfig.price_cents,
        currency: 'usd',
        nickname: priceConfig.size,
        metadata: {
          size: priceConfig.size,
        },
      });
      console.log(`   💰 Price: ${priceConfig.size} → $${(priceConfig.price_cents / 100).toFixed(2)} (${stripePrice.id})`);
      pricesCreated++;
    }

    results.push({
      name: product.name,
      status: 'created',
      productId: stripeProduct.id,
      priceCount: product.prices.length,
    });
    console.log('');
  }

  // 6. Summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊 SEED SUMMARY');
  console.log('═'.repeat(60));
  console.log(`   Products created:  ${created}`);
  console.log(`   Products skipped:  ${skipped}`);
  console.log(`   Prices created:    ${pricesCreated}`);
  console.log(`   Mode:              ${isTest ? '🧪 TEST' : '🔴 LIVE'}`);
  if (DRY_RUN) console.log(`   ⚠️  DRY RUN — nothing was actually created`);
  console.log('');

  // Table
  console.log('   Product                          Status         ID');
  console.log('   ' + '─'.repeat(56));
  for (const r of results) {
    const name = r.name.padEnd(32);
    const status = r.status.padEnd(15);
    const id = r.productId || '—';
    console.log(`   ${name} ${status} ${id}`);
  }

  console.log('\n✅ Done! Products are now live in Stripe.');
  if (created > 0) {
    console.log('   → Shop page will auto-discover them on next request.');
    console.log('   → Add product images in Stripe Dashboard or update products.json and re-run.');
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
