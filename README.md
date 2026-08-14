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
| Customer account | `chicya-customer-account` | Loyalty banner on the order status page |
| Delivery | `chicya-delivery` | Prefixes delivery option titles with "CHICYA ·" |
| Discounts | `chicya-discount` | 10% order discount, 20% product discount, 100% shipping discount |
| Flow | `chicya-flow` | Tags new orders with `chicya` |
| POS | `chicya-pos` | Home tile + modal |
| Theme | `chicya-theme-extension` | "CHICYA Vibe Block" with configurable settings |
| Web pixel | `chicya-web-pixel` | Sends 8 event types to the app backend |

All ten extension targets are **built from a single codebase** and deployed as one app (`chicya-app`).

---

## Architecture

```
Shopify (store)  ── app proxy / webhooks / pixel ──►  Vercel serverless API  ──►  Upstash Redis
     │                                                      │
     └── functions (Rust→wasm) + UI extensions ─────────────┘         ▲ persistence
```

### Backend (`api/` — plain JS ESM, Vercel serverless)
- `index.js` — embedded Admin console (App Bridge) with live webhook event table
- `oauth.js` — OAuth callback: verifies HMAC, exchanges code for `access_token`, stores it in Redis
- `events.js` — webhook + pixel receiver with HMAC verification, persists events to Redis (in-memory fallback)
- `proxy/lookbook.js` — App Proxy page rendering the store's **real product data** via Admin API (static demo fallback)
- `lib/redis.js` — zero-dependency Upstash REST client (HTTP + pipeline)
- `lib/gift.js` — auto-creates the $0 "CHICYA Free Gift" product + shop metafield on install

### Free gift loop (fully self-closing)
1. On install, backend creates a $0 gift product and writes its variant ID to a shop metafield (`$app/giftVariantId`) + Redis.
2. The checkout extension reads that shop metafield and, when checked, writes `requestedFreeGift` + `giftVariantId` cart metafields.
3. The cart-transform function reads the cart metafield and `lineExpand`s the gift line at $0.

---

## Tech stack

- **App**: `@shopify/app` + Shopify CLI; API version `2026-07`
- **Functions**: Rust (`wasm32-unknown-unknown`), `shopify_function` crate, GraphQL typegen
- **UI**: Preact + `@shopify/ui-extensions` (2026.7.0)
- **Backend**: Vercel serverless, Node ESM, global `fetch`
- **Persistence**: Upstash Redis (HTTP REST — no SDK dependency)
- **Pixel**: `@shopify/web-pixels-extension`

---

## Repo layout

```
api/                     Vercel serverless backend
  lib/                   redis client + gift provisioning
  oauth.js               OAuth callback
  events.js              webhook / pixel receiver + console data
  proxy/lookbook.js      App Proxy renderer
extensions/
  chicya-{admin,checkout,customer-account,pos,web-pixel}   JS/TSX UI extensions
  chicya-{cart-transform,delivery,discount}                Rust functions
  chicya-flow            Flow template
  chicya-theme-extension Theme block (Liquid)
shopify.app.toml         App config (scopes, webhooks, app proxy)
vercel.json              Serverless rewrites + CSP
.vercelignore            Excludes wasm build dirs from backend deploys
```

---

## Setup

Requirements: Shopify **Basic** plan (or dev store) + **Vercel Hobby** + free **Upstash Redis**.

1. **Provision resources**
   ```bash
   vercel integration add upstash/upstash-kv --name upstash-chicya-app
   vercel env pull .env.local        # KV_REST_API_URL, KV_REST_API_TOKEN, ...
   ```

2. **Environment variables** (Vercel project)
   | Var | Purpose |
   |---|---|
   | `SHOPIFY_API_KEY` | App client id |
   | `SHOPIFY_API_SECRET` | App secret (used to verify HMAC) |
   | `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Upstash Redis access |

3. **Install on a store**
   Visit the OAuth authorize URL (or install from the Shopify App Store / dev dashboard). The callback stores the access token in Redis and auto-creates the gift product.

4. **Deploy**
   ```bash
   vercel deploy --prod                # backend → app.chicya.com
   shopify app deploy --allow-updates  # extensions + webhooks
   ```

---

## Scripts

```bash
npm run dev          # vercel dev
shopify app build    # build all 10 extensions
shopify app deploy   # release a version (use --allow-updates non-interactively)
node verify.mjs      # check Redis state: token / gift variant / events (needs .env.local)
```

---

## Notes & caveats

- Webhook events are capped at the latest 50 (`LTRIM`).
- Lookbook uses live product data when a token exists; otherwise falls back to static demo data.
- The `GIFT_VARIANT_ID` constant in `cart-transform` is a fallback; the real value comes from the shop metafield via checkout.
- Built for demonstration — persistence is intentionally minimal (Upstash Redis) to stay within free tiers.

---

## License

MIT © ai-shady — built as a demo / portfolio project.