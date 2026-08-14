function getEndpoint() {
  const url = process.env.KV_REST_API_URL || '';
  const token = process.env.KV_REST_API_TOKEN || '';
  if (!url || !token) return null;
  return { url, token };
}

export function redisAvailable() {
  return getEndpoint() !== null;
}

async function request(body, path = '') {
  const endpoint = getEndpoint();
  if (!endpoint) return null;
  try {
    const res = await fetch(endpoint.url + path, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${endpoint.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function redis(...args) {
  const data = await request(args);
  if (!data) return null;
  return data.result ?? null;
}

export async function redisPipeline(commands) {
  const data = await request(commands, '/pipeline');
  if (!data || !Array.isArray(data)) return null;
  return data.map((item) => item?.result ?? null);
}
