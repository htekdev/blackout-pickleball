export const prerender = false;

import type { APIRoute } from 'astro';
import type Stripe from 'stripe';
import { stripe, isRealPriceId } from '../../lib/stripe';

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
      display_name: 'Standard Shipping (5–7 business days)',
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
      display_name: 'Priority Shipping (2–3 business days)',
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
      display_name: 'Express Shipping (1–2 business days)',
      delivery_estimate: {
        minimum: { unit: 'business_day', value: 1 },
        maximum: { unit: 'business_day', value: 2 },
      },
    },
  },
];

interface CheckoutItem {
  priceId: string;
  quantity: number;
  size?: string;
  name?: string;
}

export const POST: APIRoute = async ({ request }) => {
  const headers = { 'Content-Type': 'application/json' };

  try {
    const { items } = await request.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: 'No items provided' }), {
        status: 400,
        headers,
      });
    }

    // Validate all price IDs are real Stripe prices (not fake demo IDs)
    const invalidPrices = items.filter(
      (item: { priceId: string }) => !isRealPriceId(item.priceId)
    );
    if (invalidPrices.length > 0) {
      console.error(
        'Checkout blocked: fake price IDs detected:',
        invalidPrices.map((i: { priceId: string }) => i.priceId)
      );
      return new Response(
        JSON.stringify({
          error: 'Your cart contains items from preview mode. Please clear your cart and re-add items from the shop.',
          code: 'DEMO_PRICES',
        }),
        { status: 400, headers }
      );
    }

    const origin = import.meta.env.SITE_URL || 'https://brandblackout.com';

    // Each price ID now belongs to a per-size Stripe product whose name
    // already includes the size (e.g. "Gold Men's Crew Tee - L").
    // No need for inline price_data — Stripe shows the product name
    // directly in the dashboard transaction view.
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

    // Friendly message for invalid price errors
    const isPriceError =
      error?.type === 'StripeInvalidRequestError' &&
      error?.message?.includes('price');

    let message: string;
    let status: number;

    if (isAuthError) {
      message = 'Payment processing is temporarily unavailable. Please try again shortly.';
      status = 503;
    } else if (isPriceError) {
      message = 'One or more items in your cart are no longer available. Please clear your cart and try again.';
      status = 400;
    } else {
      message = 'Something went wrong creating your checkout session. Please try again.';
      status = 500;
    }

    return new Response(
      JSON.stringify({ error: message }),
      { status, headers }
    );
  }
};
