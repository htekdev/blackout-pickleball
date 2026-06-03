export const prerender = false;

import type { APIRoute } from 'astro';
import { stripe } from '../../lib/stripe';

/**
 * POST /api/validate-promo
 *
 * Validates a promotion code against Stripe's Promotion Codes API.
 * Returns the discount details if valid, or an error message if not.
 *
 * Stripe Promotion Codes are created in the Stripe Dashboard under
 * Products → Coupons → Promotion Codes. Each code maps to an underlying
 * Coupon that defines the discount (% off or $ off).
 */
export const POST: APIRoute = async ({ request }) => {
  const headers = { 'Content-Type': 'application/json' };

  try {
    const { code } = await request.json();

    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Please enter a promo code.' }),
        { status: 400, headers }
      );
    }

    const trimmedCode = code.trim().toUpperCase();

    // Search for an active promotion code matching the input
    const promotionCodes = await stripe.promotionCodes.list({
      code: trimmedCode,
      active: true,
      limit: 1,
    });

    if (promotionCodes.data.length === 0) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Invalid or expired promo code.' }),
        { status: 200, headers }
      );
    }

    const promoCode = promotionCodes.data[0];
    const coupon = promoCode.coupon;

    // Check if coupon is still valid
    if (!coupon.valid) {
      return new Response(
        JSON.stringify({ valid: false, error: 'This promo code has expired.' }),
        { status: 200, headers }
      );
    }

    // Build discount display info
    let discountLabel: string;
    let discountAmount: number | null = null;
    let discountPercent: number | null = null;

    if (coupon.percent_off) {
      discountPercent = coupon.percent_off;
      discountLabel = `${coupon.percent_off}% off`;
    } else if (coupon.amount_off) {
      discountAmount = coupon.amount_off;
      discountLabel = `$${(coupon.amount_off / 100).toFixed(2)} off`;
    } else {
      discountLabel = 'Discount applied';
    }

    return new Response(
      JSON.stringify({
        valid: true,
        promoCodeId: promoCode.id,
        code: trimmedCode,
        discountLabel,
        discountPercent,
        discountAmount,
        couponName: coupon.name || trimmedCode,
      }),
      { status: 200, headers }
    );
  } catch (error: any) {
    console.error('Promo code validation error:', error);

    return new Response(
      JSON.stringify({ valid: false, error: 'Unable to validate code. Please try again.' }),
      { status: 500, headers }
    );
  }
};
