# Blackout Pickleball

Brand website + merch store for [Blackout Pickleball](https://brandblackout.com) — a diversity and inclusion pickleball community.

**"Celebrate Diversity. Play with Purpose."**

## Tech Stack

- [Astro](https://astro.build) — Static + SSR hybrid
- [Tailwind CSS](https://tailwindcss.com) — Utility-first styling
- [Preact](https://preactjs.com) — Lightweight interactive islands (cart)
- [Stripe](https://stripe.com) — Product catalog + checkout
- [Vercel](https://vercel.com) — Hosting + edge CDN

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Environment Variables

Copy `.env.example` to `.env` and fill in your Stripe keys:

```
STRIPE_SECRET_KEY=sk_test_xxx
PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
SITE_URL=https://brandblackout.com
```

### SITE_URL Note

The `SITE_URL` env var is used for Stripe Checkout redirect URLs (success/cancel).
- **Vercel**: Set in Vercel Dashboard → Settings → Environment Variables
- **When connecting a custom domain** (brandblackout.com): Update `SITE_URL` in Vercel to the custom domain
- Current Vercel URL: `https://blackout-pickleball.vercel.app`
- Production domain: `https://brandblackout.com` (pending DNS transfer)

## Deployment

Pushes to `main` auto-deploy to Vercel.

---

Built by [HTEK](https://htek.dev)
