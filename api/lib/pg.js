import pg from 'pg';

let pool = null;
let poolError = null;

export function pgAvailable() {
  return Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL);
}

function getPool() {
  if (pool) return pool;
  const conn = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
  if (!conn) {
    poolError = 'DATABASE_URL not configured';
    return null;
  }
  try {
    pool = new pg.Pool({ connectionString: conn, max: 1, idleTimeoutMillis: 0 });
    pool.on('error', (err) => {
      poolError = err.message;
    });
    return pool;
  } catch (err) {
    poolError = err.message;
    return null;
  }
}

export async function pgQuery(text, params = []) {
  if (!pgAvailable()) return { ok: false, reason: 'pg not configured' };
  const p = getPool();
  if (!p) return { ok: false, reason: poolError || 'pool unavailable' };
  try {
    const res = await p.query(text, params);
    return { ok: true, rows: res.rows, rowCount: res.rowCount };
  } catch (err) {
    return { ok: false, reason: err.message };
  }
}

export async function pgEnd() {
  if (!pool) return;
  const p = pool;
  pool = null;
  try {
    await p.end();
  } catch {
    /* ignore */
  }
}