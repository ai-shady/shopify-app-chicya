# CHICYA Shopify App — Vibe Coding Demo

A full-stack Shopify app built as a **skills showcase**: it exercises nearly every major Shopify developer surface — UI extensions, checkout blocks, functions (Rust/Wasm), app proxy, webhooks, web pixel, POS, Flow, theme extension, and a serverless backend with real persistence.

> This is a **demo** built for a basic Shopify store + free Vercel account, with zero monthly cost beyond those plans.

## Live
- Store: `d4wpzt-qv.myshopify.com`
- App backend: `https://app.chicya.com`
- App proxy lookbook: `https://app.chicya.com/apps/lookbook` (inside Shopify admin, `/apps/lookbook`)

---

## What it does

An apparel brand voice ("CHICYA") applied across the store:

| Surface | Extension | Capability |
|---|---|---|
| Admin | `chicya-admin` | Branding block on the product details page |
| Cart | `chicya-cart-transform` | Renames the highest-priced line to a "CHICYA Vibe Pick", and **auto-adds a $0 free gift** (via `lineExpand`) when the customer requests one at checkout |
| Checkout | `chicya-checkout` | "Add my free gift" checkbox that writes cart metafields (`$app/requestedFreeGift`, `$app/giftVariantId`) |
| Checkout validation | `chicya-checkout-validation` | Blocking validation (function) that errors at checkout if the requested free gift is not in the cart |
| Customer account | `chicya-customer-account` | Loyalty banner on the order status page |
| Delivery | `chicya-delivery` | Prefixes delivery option titles with "CHICYA ·" |
| Discounts | `chicya-discount` | 10% order discount, 20% product discount, 100% shipping discount |
| Flow | `chicya-flow` | Tags new orders with `chicya` |
| POS | `chicya-pos` | Home tile + modal |
| Theme | `chicya-theme-extension` | "CHICYA Vibe Block" with configurable settings |
| Web pixel | `chicya-web-pixel` | Sends 8 event types to the app backend |

All eleven extension targets are **built from a single codebase** and deployed as one app (`chicya-app`).

---

## Architecture

```
Shopify (store)  ── app proxy / webhooks / pixel ──►  Vercel serverless API  ──►  Neon Postgres (+ Upstash Redis)
     │                                                      │
     └── functions (Rust→wasm) + UI extensions ─────────────┘         ▲ persistence
```

### Backend (`api/` — plain JS ESM, Vercel serverless)
- `oauth.js` — OAuth callback: verifies HMAC, exchanges code for `access_token`, stores it in Redis
- `events.js` — webhook + pixel receiver with HMAC verification, persists events to **Neon Postgres** (Redis + in-memory fallback), exposes stats
- `proxy/lookbook.js` — App Proxy page rendering the store's **real product data** via Admin API (static demo fallback)
- `lib/redis.js` — zero-dependency Upstash REST client (HTTP + pipeline)
- `lib/pg.js` — lazy `pg.Pool` client for Neon Postgres
- `lib/gift.js` — auto-creates the $0 "CHICYA Free Gift" product + shop metafield on install

### Embedded console (`web/` — Polaris + App Bridge React, built to `public/`)
The storefront admin console is a Vite SPA using **Polaris** (`@shopify/polaris`) and **App Bridge v4** (`@shopify/app-bridge-react`), bundled into `public/` and served at `/`. It shows the live webhook event feed with toasts/navigation via App Bridge.

### Free gift loop (fully self-closing)
1. On install, backend creates a $0 gift product and writes its variant ID to a shop metafield (`$app/giftVariantId`) + Redis.
2. The checkout extension reads that shop metafield and, when checked, writes `requestedFreeGift` + `giftVariantId` cart metafields.
3. The cart-transform function reads the cart metafield and `lineExpand`s the gift line at $0.

---

## Tech stack

- **App**: `@shopify/app` + Shopify CLI; API version `2026-07`
- **Functions**: Rust (`wasm32-unknown-unknown`), `shopify_function` crate, GraphQL typegen
- **UI**: Preact + `@shopify/ui-extensions` (2026.7.0); embedded console in React + `@shopify/polaris` (^13) + `@shopify/app-bridge-react` (v4)
- **Backend**: Vercel serverless, Node ESM, global `fetch`
- **Persistence**: Neon Postgres (`pg` + `chicya_events` table) for event history; Upstash Redis (HTTP REST — no SDK dependency) for OAuth token + gift variant KV
- **Pixel**: `@shopify/web-pixels-extension`

---

## Repo layout

```
api/                     Vercel serverless backend
  lib/                   redis client + pg client + gift provisioning
  oauth.js               OAuth callback
  events.js              webhook / pixel receiver + console data
  proxy/lookbook.js      App Proxy renderer
scripts/                 migration / backfill helpers (events → Postgres)
web/                     Embedded admin console (Polaris + App Bridge React, Vite)
  public/                Build output, served at / on Vercel
extensions/
  chicya-{admin,checkout,customer-account,pos,web-pixel}   JS/TSX UI extensions
  chicya-{cart-transform,delivery,discount}                Rust functions
  chicya-checkout-validation                               Rust validation function
  chicya-flow            Flow template
  chicya-theme-extension Theme block (Liquid)
shopify.app.toml         App config (scopes, webhooks, app proxy)
vercel.json              Serverless rewrites + CSP
.vercelignore            Excludes wasm build dirs from backend deploys
```

---

## Setup

Requirements: Shopify **Basic** plan (or dev store) + **Vercel Hobby** + free **Neon Postgres** + free **Upstash Redis**.

1. **Provision resources**
   ```bash
   vercel integration add upstash/upstash-kv --name upstash-chicya-app
   vercel integration add neon --name neon-chicya-app
   vercel env pull .env.local        # KV_REST_API_URL, POSTGRES_URL/DATABASE_URL, ...
   node scripts/migrate-events.mjs   # create chicya_events table (run once)
   ```

2. **Environment variables** (Vercel project)
   | Var | Purpose |
   |---|---|
   | `SHOPIFY_API_KEY` | App client id |
   | `SHOPIFY_API_SECRET` | App secret (used to verify HMAC) |
   | `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Upstash Redis access |
   | `DATABASE_URL` (or `POSTGRES_URL`) | Neon Postgres connection |

3. **Install on a store**
   Visit the OAuth authorize URL (or install from the Shopify App Store / dev dashboard). The callback stores the access token in Redis and auto-creates the gift product.

4. **Deploy**
   ```bash
   cd web && npm run build            # rebuild SPA into public/
   cd .. && vercel deploy --prod --force   # backend + SPA → app.chicya.com
   shopify app deploy --allow-updates  # extensions + webhooks
   ```

---

## Scripts

```bash
npm run dev          # vercel dev (backend) / web: npm run dev (console SPA)
shopify app build    # build all 11 extensions
shopify app deploy   # release a version (use --allow-updates non-interactively)
node verify.mjs      # check Redis state: token / gift variant / events (needs .env.local)
node scripts/migrate-events.mjs   # create chicya_events table (idempotent)
node scripts/backfill-events.mjs  # copy Redis events into Postgres
```

---

## Notes & caveats

- Event history lives in **Neon Postgres** (`chicya_events`); the webhook receiver falls back to Redis (`LTRIM` 50) then in-memory if Postgres is unreachable.
- Lookbook uses live product data when a token exists; otherwise falls back to static demo data.
- The `GIFT_VARIANT_ID` constant in `cart-transform` is a fallback; the real value comes from the shop metafield via checkout.
- The checkout-validation function blocks checkout (error at `$.cart`) if `requestedFreeGift` is set but the gift variant isn't in the cart — closing the loop end-to-end.
- Rebuild the console SPA before backend deploys: `cd web && npm run build`, then `vercel deploy --prod --force`.
- Built for demonstration — persistence is intentionally minimal (Neon Postgres + Upstash Redis) to stay within free tiers.

---

## License

MIT © ai-shady — built as a demo / portfolio project.