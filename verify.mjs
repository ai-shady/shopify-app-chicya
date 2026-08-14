import fs from 'fs';

const raw = fs.readFileSync('.env.local', 'utf8');
for (const line of raw.split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)="?([^"]*)"?$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const { redis, redisAvailable } = await import('./api/lib/redis.js');

console.log('redisAvailable:', redisAvailable());

const shops = ['d4wpzt-qv.myshopify.com', 'd4wpzt-qv'];
for (const shop of shops) {
  const token = await redis('GET', `shopify:token:${shop}`);
  const gift = await redis('GET', `shopify:gift_variant:${shop}`);
  const events = await redis('LLEN', 'chicya:events');
  console.log(`[${shop}] token_stored:${!!token} gift_variant:${gift ?? 'none'} events:${events}`);
}
