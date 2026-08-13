import crypto from 'crypto';

const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET || '';

const LOOKBOOK = {
  title: 'CHICYA VIBE LOOKBOOK',
  subtitle: 'Colour is a language. We are fluent.',
  vibes: [
    {
      name: 'Pink Pop',
      color: '#FF3EA5',
      text: '#121212',
      items: ['Pink Pop Mini Dress', 'Clash Print Slip Dress']
    },
    {
      name: 'Electric Blue',
      color: '#2F4BFF',
      text: '#FFF6EF',
      items: ['Electric Blue Blazer', 'Cobalt Wide-Leg Trousers']
    },
    {
      name: 'Lime Punch',
      color: '#D6F32F',
      text: '#121212',
      items: ['Lime Punch Crop Top', 'Acid Lime Mesh Skirt']
    },
    {
      name: 'Orange Crush',
      color: '#FF6B2B',
      text: '#121212',
      items: ['Orange Crush Cargo Skirt', 'Tangerine Boxy Shirt']
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

function renderLiquid(lookbook) {
  const sections = lookbook.vibes.map((v) => `
  <section style="background:${v.color};color:${v.text};padding:64px 24px;margin:24px 0;border-radius:32px;border:3px solid #121212;box-shadow:10px 10px 0 #121212;">
    <div style="max-width:960px;margin:0 auto;">
      <h2 style="font-family:Anton,sans-serif;font-size:48px;text-transform:uppercase;margin:0 0 16px;">${v.name}</h2>
      <ul style="list-style:none;padding:0;display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));">
        ${v.items.map((item) => `<li style="background:rgba(255,255,255,.35);padding:20px;border-radius:20px;font-weight:700;border:2px solid ${v.text};">${item}</li>`).join('')}
      </ul>
    </div>
  </section>
`).join('');

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
    <p>Rendered by CHICYA App Proxy · {{ shop.domain }}</p>
  </div>
</body>
</html>`;
}

function renderJSON(lookbook, verified) {
  return JSON.stringify({ lookbook, verified, generated_at: new Date().toISOString() }, null, 2);
}

export default function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const query = Object.fromEntries(url.searchParams.entries());
  const isVerified = verifyProxySignature(query);
  const wantsJson = query.view === 'json' || req.headers.accept?.includes('application/json');

  if (wantsJson) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).send(renderJSON(LOOKBOOK, isVerified));
  }

  res.setHeader('Content-Type', 'application/liquid');
  return res.status(200).send(renderLiquid(LOOKBOOK));
}
