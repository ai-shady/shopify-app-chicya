import crypto from 'crypto';
import https from 'https';

const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY || '';
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET || '';

function verifyHmac(query) {
  if (!query.hmac || !SHOPIFY_API_SECRET) return false;
  const hmac = query.hmac;
  const params = Object.keys(query)
    .filter((k) => k !== 'hmac')
    .sort()
    .map((k) => `${k}=${Array.isArray(query[k]) ? query[k].join(',') : query[k]}`)
    .join('&');
  const digest = crypto.createHmac('sha256', SHOPIFY_API_SECRET).update(params).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmac));
  } catch {
    return false;
  }
}

function exchangeCode(shop, code) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      client_id: SHOPIFY_API_KEY,
      client_secret: SHOPIFY_API_SECRET,
      code
    });
    const req = https.request(
      {
        hostname: shop,
        path: '/admin/oauth/access_token',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length
        }
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch {
            resolve({ error: body });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

const STYLE = `
:root{--bg:#FFF6EF;--fg:#121212;--lime:#D6F32F;--blue:#2F4BFF;}
body{margin:0;font-family:Poppins,system-ui,sans-serif;background:var(--bg);color:var(--fg);padding:48px 24px;max-width:640px;margin:0 auto;text-align:center}
h1{font-family:Anton,sans-serif;font-size:48px;text-transform:uppercase;line-height:.95}
.card{background:#fff;border:2px solid var(--fg);border-radius:24px;padding:32px;margin:24px 0;box-shadow:8px 8px 0 var(--fg)}
.code{background:var(--fg);color:var(--lime);padding:12px;border-radius:12px;font-family:monospace;font-size:13px;text-align:left;word-break:break-all}
a.btn{display:inline-block;background:var(--fg);color:var(--lime);padding:14px 24px;border-radius:100px;text-decoration:none;font-weight:700;text-transform:uppercase;margin-top:16px}
`;

function renderPage(title, message, code) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
<style>${STYLE}</style>
</head>
<body>
  <h1>${title}</h1>
  <div class="card">
    <p>${message}</p>
    ${code ? `<div class="code">${code}</div>` : ''}
    <a class="btn" href="/">返回 Demos</a>
  </div>
</body>
</html>`;
}

export default async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const query = Object.fromEntries(url.searchParams.entries());

  if (!query.shop || !query.code) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(400).send(renderPage('Missing params', '缺少 shop 或 code 参数。'));
  }

  if (!verifyHmac(query)) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(403).send(renderPage('Invalid HMAC', 'OAuth HMAC 校验失败。'));
  }

  if (!SHOPIFY_API_KEY || !SHOPIFY_API_SECRET) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(500).send(renderPage('Config error', '缺少 SHOPIFY_API_KEY / SHOPIFY_API_SECRET。'));
  }

  const result = await exchangeCode(query.shop, query.code);

  if (result.error || result.errors) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(400).send(renderPage('Exchange failed', '换取 access_token 失败：', JSON.stringify(result, null, 2)));
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(renderPage('Installed', `chicya-app 已在 <strong>${query.shop}</strong> 重新安装。App proxy 配置已生效，请等待 1-2 分钟后访问 /apps/lookbook。`));
}
