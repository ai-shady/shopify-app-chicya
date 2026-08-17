import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)="?([^"]*)"?$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
loadEnv();

const { redis, redisAvailable } = await import('../api/lib/redis.js');
const { pgQuery, pgAvailable, pgEnd } = await import('../api/lib/pg.js');

if (!redisAvailable()) { console.error('Redis unavailable'); process.exit(1); }
if (!pgAvailable()) { console.error('PG unavailable'); process.exit(1); }

const raw = await redis('LRANGE', 'chicya:events', 0, 100);
if (!Array.isArray(raw) || raw.length === 0) {
  console.log('No Redis events to migrate');
  await pgEnd();
  process.exit(0);
}
const events = raw
  .map((s) => { try { return JSON.parse(s); } catch { return null; } })
  .filter(Boolean);

let migrated = 0;
for (const e of events) {
  if (!e || !e.id) continue;
  const res = await pgQuery(
    'INSERT INTO chicya_events (id, time, type, source, payload) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING',
    [e.id, e.time, e.type, e.source, JSON.stringify(e.payload || {})]
  );
  if (res.ok && res.rowCount > 0) migrated++;
}

const stat = await pgQuery('SELECT count(*)::int AS n FROM chicya_events');
console.log(`migrated ${migrated}/${events.length} events to Postgres; total in PG: ${stat.rows[0].n}`);
await pgEnd();