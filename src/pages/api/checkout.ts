export const prerender = false;

import type { APIRoute } from 'astro';
import Stripe from 'stripe';

// Helper: read Stripe key fresh on every request (not cached at module level).
// Vercel serverless instances may cold-start before env vars propagate — evaluating
// process.env inside the handler guarantees we always pick up the latest value.
function getStripeKey(): string {
  return process.env.STRIPE_SECRET_KEY || import.meta.env.STRIPE_SECRET_KEY || '';
}

function isStripeReady(key: string): boolean {
  return key.startsWith('sk_') && key.length > 30;
}

/**
 * Shipping rate options for Stripe Checkout.
 *
 * Stripe Checkout natively supports `shipping_options` — an array of
 * shipping rate configs the customer chooses from at checkout. Combined
 * with `shipping_address_collection`, Stripe collects the address and
 * applies the selected rate automatically. No carrier API needed.
 *
 * The store owner can later create persistent Shipping Rates in the Stripe
 * Dashboard (Settings → Shipping rates) and reference them by ID here
 * instead of inline `shipping_rate_data`. That way he can adjust prices
 * without a code deploy.
 */
const SHIPPING_OPTIONS: Stripe.Checkout.SessionCreateParams.ShippingOption[] = [
  {
    shipping_rate_data: {
      type: 'fixed_amount',
      fixed_amount: { amount: 599, currency: 'usd' },
      display_name: 'Standard Shipping',
      description: 'Estimated 5–7 business days',
      delivery_estimate: {
        minimum: { unit: 'business_day', value: 5 },
        maximum: { unit: 'business_day', value: 7 },
      },
    },
  },
  {
    shipping_rate_data: {
      type: 'fixed_amount',
      fixed_amount: { amount: 999, currency: 'usd' },
      display_name: 'Priority Shipping',
      description: 'Estimated 2–3 business days',
      delivery_estimate: {
        minimum: { unit: 'business_day', value: 2 },
        maximum: { unit: 'business_day', value: 3 },
      },
    },
  },
  {
    shipping_rate_data: {
      type: 'fixed_amount',
      fixed_amount: { amount: 1499, currency: 'usd' },
      display_name: 'Express Shipping',
      description: 'Estimated 1–2 business days',
      delivery_estimate: {
        minimum: { unit: 'business_day', value: 1 },
        maximum: { unit: 'business_day', value: 2 },
      },
    },
  },
];

export const POST: APIRoute = async ({ request }) => {
  const headers = { 'Content-Type': 'application/json' };

  // Evaluate Stripe key fresh per-request (not module-level cache)
  const stripeKey = getStripeKey();

  // Guard: Stripe not configured yet
  if (!isStripeReady(stripeKey)) {
    return new Response(
      JSON.stringify({
        error: 'Checkout is temporarily unavailable. Please try again in a moment.',
        code: 'STRIPE_NOT_CONFIGURED',
      }),
      { status: 503, headers }
    );
  }

  try {
    const { items } = await request.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: 'No items provided' }), {
        status: 400,
        headers,
      });
    }

    const stripe = new Stripe(stripeKey);
    const origin = import.meta.env.SITE_URL || 'https://brandblackout.com';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: items.map((item: { priceId: string; quantity: number }) => ({
        price: item.priceId,
        quantity: item.quantity,
      })),
      shipping_address_collection: {
        allowed_countries: ['US'],
      },
      shipping_options: SHIPPING_OPTIONS,
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/shop`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers,
    });
  } catch (error: any) {
    console.error('Checkout error:', error);

    // Friendly message for Stripe authentication failures
    const isAuthError =
      error?.type === 'StripeAuthenticationError' ||
      error?.statusCode === 401;

    const message = isAuthError
      ? 'Checkout is temporarily unavailable. Please try again in a moment.'
      : 'Something went wrong creating your checkout session. Please try again.';

    return new Response(
      JSON.stringify({ error: message }),
      { status: isAuthError ? 503 : 500, headers }
    );
  }
};
