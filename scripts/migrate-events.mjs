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

const directUrl = process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL;
if (!directUrl) {
  console.error('No DATABASE_URL_UNPOOLED / POSTGRES_URL_NON_POOLING / DATABASE_URL in env');
  process.exit(1);
}
if (!directUrl.includes('@')) {
  console.error('DATABASE_URL looks like a placeholder (no @host):', directUrl.slice(0, 20));
  process.exit(1);
}

const { default: pg } = await import('pg');
const client = new pg.Client({ connectionString: directUrl, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  await client.query(`
    CREATE TABLE IF NOT EXISTS chicya_events (
      id        TEXT PRIMARY KEY,
      time      TIMESTAMPTZ NOT NULL,
      type      TEXT NOT NULL,
      source    TEXT NOT NULL,
      payload   JSONB NOT NULL
    )
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_chicya_events_time ON chicya_events (time DESC)
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_chicya_events_type ON chicya_events (type)
  `);
  const { rows } = await client.query('SELECT count(*)::int AS n FROM chicya_events');
  console.log('migration OK — chicya_events ready, existing rows:', rows[0].n);
} catch (err) {
  console.error('migration failed:', err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}