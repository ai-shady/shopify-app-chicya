import crypto from 'crypto';
import { redis, redisPipeline, redisAvailable } from './lib/redis.js';
import { pgQuery, pgAvailable } from './lib/pg.js';

export const config = { api: { bodyParser: false } };

const MAX_EVENTS = 50;
const EVENTS_KEY = 'chicya:events';
const events = [];

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

function verifyWebhook(rawBody, hmacHeader, secret) {
  if (!hmacHeader || !secret) return false;
  const digest = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmacHeader));
  } catch {
    return false;
  }
}

function buildEvent(type, source, payload) {
  return {
    id: crypto.randomUUID(),
    time: new Date().toISOString(),
    type,
    source,
    payload
  };
}

function normalizePgRow(r) {
  return {
    id: r.id,
    time: r.time instanceof Date ? r.time.toISOString() : r.time,
    type: r.type,
    source: r.source,
    payload: typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload
  };
}

async function pushPgEvent(event) {
  return pgQuery(
    'INSERT INTO chicya_events (id, time, type, source, payload) VALUES ($1, $2, $3, $4, $5)',
    [event.id, event.time, event.type, event.source, JSON.stringify(event.payload)]
  );
}

async function loadPgEvents(limit = MAX_EVENTS) {
  const res = await pgQuery(
    'SELECT id, time, type, source, payload FROM chicya_events ORDER BY time DESC LIMIT $1',
    [limit]
  );
  if (!res.ok) return { rows: null, reason: res.reason };
  return { rows: res.rows.map(normalizePgRow), reason: null };
}

async function loadPgStats() {
  const total = await pgQuery('SELECT count(*)::int AS n FROM chicya_events');
  const byType = await pgQuery(
    'SELECT type, count(*)::int AS n FROM chicya_events GROUP BY type ORDER BY n DESC'
  );
  if (!total.ok || !byType.ok) return null;
  return { total: total.rows[0].n, byType: byType.rows };
}

async function pushEvent(type, source, payload) {
  const event = buildEvent(type, source, payload);
  events.unshift(event);
  while (events.length > MAX_EVENTS) events.pop();

  if (pgAvailable()) {
    const res = await pushPgEvent(event);
    if (res.ok) return event;
  }
  if (redisAvailable()) {
    await redisPipeline([
      ['LPUSH', EVENTS_KEY, JSON.stringify(event)],
      ['LTRIM', EVENTS_KEY, 0, MAX_EVENTS - 1]
    ]);
  }
  return event;
}

async function loadEvents() {
  if (pgAvailable()) {
    const pg = await loadPgEvents();
    if (pg.rows) return pg.rows;
  }
  if (redisAvailable()) {
    const raw = await redis('LRANGE', EVENTS_KEY, 0, MAX_EVENTS - 1);
    if (Array.isArray(raw)) {
      const parsed = raw
        .map((item) => {
          try {
            return JSON.parse(item);
          } catch {
            return null;
          }
        })
        .filter(Boolean);
      if (parsed.length) return parsed;
    }
  }
  return events;
}

async function getStats() {
  if (pgAvailable()) {
    const s = await loadPgStats();
    if (s) return s;
  }
  const byType = {};
  const loaded = await loadEvents();
  for (const e of loaded) byType[e.type] = (byType[e.type] || 0) + 1;
  return { total: loaded.length, byType: Object.entries(byType).map(([type, n]) => ({ type, n })) };
}

function storageLabel() {
  if (pgAvailable()) return 'Postgres (Neon)';
  if (redisAvailable()) return 'Redis (Upstash)';
  return '内存 (实例重启即丢失)';
}

const STYLE = `
:root{--bg:#FFF6EF;--fg:#121212;--pink:#FF3EA5;--lime:#D6F32F;--blue:#2F4BFF;--orange:#FF6B2B;--cream:#EBDBCE;}
*{box-sizing:border-box}
body{margin:0;font-family:Poppins,system-ui,sans-serif;background:var(--bg);color:var(--fg);padding:48px 24px;max-width:1200px;margin:0 auto}
h1{font-family:Anton,sans-serif;font-size:clamp(40px,7vw,80px);text-transform:uppercase;line-height:.95;margin:0 0 12px}
.badge{display:inline-block;background:var(--lime);color:var(--fg);padding:6px 14px;border-radius:100px;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.05em}
.card{background:#fff;border:2px solid var(--fg);border-radius:24px;padding:24px;margin:20px 0;box-shadow:8px 8px 0 var(--fg)}
table{width:100%;border-collapse:collapse;background:#fff;border:2px solid var(--fg);border-radius:16px;overflow:hidden}
th{background:var(--fg);color:var(--lime);text-align:left;padding:14px;font-weight:700;text-transform:uppercase;font-size:12px;letter-spacing:.05em}
td{padding:14px;border-bottom:1px solid var(--cream);vertical-align:top;font-size:14px}
tr:hover td{background:#fff8f0}
.status-dot{display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--lime);margin-right:8px;animation:pulse 1.5s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
.empty{text-align:center;padding:60px 20px;color:#666}
.code{background:var(--fg);color:var(--lime);padding:12px;border-radius:12px;font-family:monospace;font-size:12px;max-height:200px;overflow:auto;white-space:pre-wrap}
a.btn{display:inline-block;background:var(--fg);color:var(--lime);padding:12px 20px;border-radius:100px;text-decoration:none;font-weight:700;text-transform:uppercase;letter-spacing:.02em}
`;

function renderPanel(req, events, stats) {
  const host = req.headers.host || 'app.chicya.com';
  const storage = storageLabel();
  const rows = events.length
    ? events.map((e) => `
      <tr>
        <td>${new Date(e.time).toLocaleString('zh-CN')}</td>
        <td><strong>${e.type}</strong></td>
        <td>${e.source}</td>
        <td><div class="code">${JSON.stringify(e.payload, null, 2).slice(0, 400)}${JSON.stringify(e.payload).length > 400 ? '…' : ''}</div></td>
      </tr>`).join('')
    : `<tr><td colspan="4" class="empty">暂无事件。创建一个商品或订单后刷新此页。</td></tr>`;

  const statChips = stats && stats.byType.length
    ? stats.byType.map((s) => `<span class="badge" style="margin:2px">${s.type}: ${s.n}</span>`).join('')
    : '<span>暂无</span>';

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>CHICYA Webhook Events</title>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
<style>${STYLE}</style>
<meta http-equiv="refresh" content="8">
</head>
<body>
  <span class="badge">live</span>
  <h1>Webhook<br>events</h1>
  <div class="card">
    <p><span class="status-dot"></span>监听 <code>products/create</code> 与 <code>orders/create</code>。Endpoint: <code>https://${host}/events/webhook</code> · 存储: <code>${storage}</code></p>
    <p>累计: <strong>${stats?.total ?? 0}</strong> ${statChips}</p>
    <a class="btn" href="/events">立即刷新</a>
  </div>
  <table>
    <thead><tr><th>时间</th><th>Topic</th><th>来源</th><th>Payload 摘要</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;
}

export default async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const secret = process.env.SHOPIFY_API_SECRET || '';

  if (req.method === 'GET') {
    const loaded = await loadEvents();
    if (url.searchParams.get('view') === 'json') {
      const stats = await getStats();
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.status(200).send(JSON.stringify({ count: loaded.length, events: loaded, stats, storage: storageLabel() }));
    }
    const stats = await getStats();
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(renderPanel(req, loaded, stats));
  }

  if (req.method === 'POST' && url.pathname.startsWith('/events/webhook')) {
    const raw = await readRawBody(req);
    const hmac = req.headers['x-shopify-hmac-sha256'] || '';
    const topic = req.headers['x-shopify-topic'] || 'unknown';

    if (!secret) {
      return res.status(500).json({ error: 'SHOPIFY_API_SECRET not configured' });
    }

    if (!verifyWebhook(raw, hmac, secret)) {
      return res.status(401).json({ error: 'HMAC verification failed' });
    }

    let payload;
    try {
      payload = JSON.parse(raw.toString('utf8'));
    } catch {
      payload = { raw: raw.toString('utf8') };
    }

    await pushEvent(topic, req.headers['x-shopify-shop-domain'] || 'shopify', {
      id: payload.id,
      title: payload.title,
      handle: payload.handle,
      name: payload.name
    });

    return res.status(200).json({ received: true, topic });
  }

  if (req.method === 'POST' && url.pathname.startsWith('/events/pixel')) {
    const raw = await readRawBody(req);
    let payload;
    try {
      payload = JSON.parse(raw.toString('utf8'));
    } catch {
      payload = { raw: raw.toString('utf8') };
    }
    await pushEvent(payload.eventName || 'pixel_event', 'pixel', payload);
    return res.status(200).json({ received: true });
  }

  res.status(404).json({ error: 'not found' });
}