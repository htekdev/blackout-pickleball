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

## Deployment

Pushes to `main` auto-deploy to Vercel.

---

Built by [HTEK](https://htek.dev)
