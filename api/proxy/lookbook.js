import crypto from 'crypto';
import { redis, redisAvailable } from '../lib/redis.js';

const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET || '';
const ADMIN_API_VERSION = '2026-07';

const VIBE_THEMES = [
  { name: 'Pink Pop', color: '#FF3EA5', text: '#121212' },
  { name: 'Electric Blue', color: '#2F4BFF', text: '#FFF6EF' },
  { name: 'Lime Punch', color: '#D6F32F', text: '#121212' },
  { name: 'Orange Crush', color: '#FF6B2B', text: '#121212' }
];

const STATIC_LOOKBOOK = {
  title: 'CHICYA VIBE LOOKBOOK',
  subtitle: 'Colour is a language. We are fluent.',
  vibes: [
    {
      ...VIBE_THEMES[0],
      items: [
        { title: 'Pink Pop Mini Dress', handle: null, image: null },
        { title: 'Clash Print Slip Dress', handle: null, image: null }
      ]
    },
    {
      ...VIBE_THEMES[1],
      items: [
        { title: 'Electric Blue Blazer', handle: null, image: null },
        { title: 'Cobalt Wide-Leg Trousers', handle: null, image: null }
      ]
    },
    {
      ...VIBE_THEMES[2],
      items: [
        { title: 'Lime Punch Crop Top', handle: null, image: null },
        { title: 'Acid Lime Mesh Skirt', handle: null, image: null }
      ]
    },
    {
      ...VIBE_THEMES[3],
      items: [
        { title: 'Orange Crush Cargo Skirt', handle: null, image: null },
        { title: 'Tangerine Boxy Shirt', handle: null, image: null }
      ]
    }
  ]
};

function verifyProxySignature(query) {
  if (!query.signature || !SHOPIFY_API_SECRET) return false;
  const signature = query.signature;
  const params = Object.keys(query)
    .filter((k) => k !== 'signature')
    .sort()
    .map((k) => `${k}=${Array.isArray(query[k]) ? query[k].join(',') : query[k]}`)
    .join('');
  const digest = crypto.createHmac('sha256', SHOPIFY_API_SECRET).update(params).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
  } catch {
    return false;
  }
}

async function getStoredToken(shop) {
  if (!redisAvailable() || !shop) return null;
  const raw = await redis('GET', `shopify:token:${shop}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw).access_token || null;
  } catch {
    return null;
  }
}

const PRODUCTS_QUERY = `
{
  products(first: 12, query: "published_status:published", sortKey: BEST_SELLING) {
    edges {
      node {
        title
        handle
        featuredImage {
          url
          altText
        }
      }
    }
  }
}
`;

async function fetchLiveProducts(shop, token) {
  const res = await fetch(`https://${shop}/admin/api/${ADMIN_API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token
    },
    body: JSON.stringify({ query: PRODUCTS_QUERY }),
    signal: AbortSignal.timeout(8000)
  });
  if (!res.ok) return null;
  const data = await res.json();
  const edges = data?.data?.products?.edges;
  if (!Array.isArray(edges) || edges.length === 0) return null;
  return edges.map((edge) => ({
    title: edge.node.title,
    handle: edge.node.handle,
    image: edge.node.featuredImage?.url || null
  }));
}

function buildLiveLookbook(products) {
  const vibes = VIBE_THEMES.map((theme) => ({ ...theme, items: [] }));
  products.forEach((product, index) => {
    vibes[index % vibes.length].items.push(product);
  });
  return {
    title: 'CHICYA VIBE LOOKBOOK',
    subtitle: 'Colour is a language. We are fluent.',
    vibes: vibes.filter((v) => v.items.length > 0)
  };
}

function renderItem(item, vibe) {
  const image = item.image
    ? `<img src="${item.image}" alt="" style="width:100%;height:160px;object-fit:cover;border-radius:14px;margin-bottom:12px;border:2px solid ${vibe.text};">`
    : '';
  const label = item.handle
    ? `<a href="/products/${item.handle}" style="color:inherit;text-decoration:none;">${item.title} ↗</a>`
    : item.title;
  return `<li style="background:rgba(255,255,255,.35);padding:20px;border-radius:20px;font-weight:700;border:2px solid ${vibe.text};">${image}${label}</li>`;
}

function renderLiquid(lookbook, source) {
  const sections = lookbook.vibes.map((v) => `
  <section style="background:${v.color};color:${v.text};padding:64px 24px;margin:24px 0;border-radius:32px;border:3px solid #121212;box-shadow:10px 10px 0 #121212;">
    <div style="max-width:960px;margin:0 auto;">
      <h2 style="font-family:Anton,sans-serif;font-size:48px;text-transform:uppercase;margin:0 0 16px;">${v.name}</h2>
      <ul style="list-style:none;padding:0;display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));">
        ${v.items.map((item) => renderItem(item, v)).join('')}
      </ul>
    </div>
  </section>
`).join('');

  const sourceNote = source === 'live'
    ? 'Live product data via Admin API'
    : 'Static demo data · 重新安装 App 以连接真实商品';

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${lookbook.title}</title>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
<style>
body{margin:0;font-family:Poppins,system-ui,sans-serif;background:#FFF6EF;color:#121212}
.hero{background:#121212;color:#D6F32F;padding:80px 24px;text-align:center}
.hero h1{font-family:Anton,sans-serif;font-size:clamp(48px,9vw,120px);text-transform:uppercase;margin:0;line-height:.9}
.hero p{font-size:20px;margin:16px 0 0}
.container{max-width:1100px;margin:0 auto;padding:24px}
.footer{text-align:center;padding:60px 24px;color:#666}
</style>
</head>
<body>
  <div class="hero">
    <h1>${lookbook.title}</h1>
    <p>{{ shop.name }} · ${lookbook.subtitle}</p>
  </div>
  <div class="container">
    ${sections}
  </div>
  <div class="footer">
    <p>Rendered by CHICYA App Proxy · {{ shop.domain }} · ${sourceNote}</p>
  </div>
</body>
</html>`;
}

function renderJSON(lookbook, verified, source) {
  return JSON.stringify({ lookbook, verified, source, generated_at: new Date().toISOString() }, null, 2);
}

export default async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const query = Object.fromEntries(url.searchParams.entries());
  const isVerified = verifyProxySignature(query);
  const wantsJson = query.view === 'json' || req.headers.accept?.includes('application/json');

  let lookbook = STATIC_LOOKBOOK;
  let source = 'static';

  const shop = query.shop || '';
  const token = await getStoredToken(shop);
  if (token) {
    try {
      const products = await fetchLiveProducts(shop, token);
      if (products) {
        lookbook = buildLiveLookbook(products);
        source = 'live';
      }
    } catch {
      lookbook = STATIC_LOOKBOOK;
    }
  }

  if (wantsJson) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).send(renderJSON(lookbook, isVerified, source));
  }

  res.setHeader('Content-Type', 'application/liquid');
  return res.status(200).send(renderLiquid(lookbook, source));
}
