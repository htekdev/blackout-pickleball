import Stripe from 'stripe';

// Server-only — never import this on the client
export const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');

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
  prices: Array<{
    id: string;
    amount: number;
    currency: string;
    size: string;
  }>;
}

export async function getCatalog(): Promise<CatalogItem[]> {
  const [products, prices] = await Promise.all([
    getActiveProducts(),
    getActivePrices(),
  ]);

  const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL'];

  return products.map((product) => ({
    id: product.id,
    name: product.name,
    description: product.description,
    images: product.images,
    sport: (product.metadata?.sport || 'pickleball').toLowerCase(),
    prices: prices
      .filter((p) => p.product === product.id)
      .map((p) => ({
        id: p.id,
        amount: p.unit_amount || 0,
        currency: p.currency,
        size: p.metadata?.size || p.nickname || 'One Size',
      }))
      .sort(
        (a, b) => sizeOrder.indexOf(a.size) - sizeOrder.indexOf(b.size)
      ),
  }));
}
