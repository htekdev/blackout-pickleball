export const prerender = false;

import type { APIRoute } from 'astro';
import Stripe from 'stripe';

const STRIPE_KEY = import.meta.env.STRIPE_SECRET_KEY || '';
const PLACEHOLDER_KEYS = ['', 'sk_test_placeholder', 'sk_test_xxx'];
const isStripeConfigured = !PLACEHOLDER_KEYS.includes(STRIPE_KEY);

export const POST: APIRoute = async ({ request }) => {
  const headers = { 'Content-Type': 'application/json' };

  // Guard: Stripe not configured yet
  if (!isStripeConfigured) {
    return new Response(
      JSON.stringify({
        error: 'Store coming soon! Payments are not yet enabled. Check back shortly.',
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

    const stripe = new Stripe(STRIPE_KEY);
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
      ? 'Store coming soon! Payments are not yet enabled. Check back shortly.'
      : 'Something went wrong creating your checkout session. Please try again.';

    return new Response(
      JSON.stringify({ error: message }),
      { status: isAuthError ? 503 : 500, headers }
    );
  }
};
