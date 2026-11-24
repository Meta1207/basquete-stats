// Cloudflare Pages Function: ESPN proxy (compatible with /api/espn)
const HOSTS = {
  site: 'https://site.api.espn.com',
  web: 'https://site.web.api.espn.com',
  core: 'https://sports.core.api.espn.com',
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function onRequestGet({ request }) {
  try {
    const incoming = new URL(request.url);
    const q = incoming.searchParams;
    const hostKey = q.get('host') || 'site';
    const base = HOSTS[hostKey];
    const path = q.get('path') || '';
    const ttl = Math.min(Math.max(parseInt(q.get('ttl') || '30', 10) || 30, 10), 86400);

    if (!base || !/^\/(apis|v2|v3)\/[\w\-\/.]+$/.test(path)) {
      return Response.json({ error: 'parâmetros inválidos' }, {
        status: 400, headers: corsHeaders(),
      });
    }

    const target = new URL(base + path);
    for (const [key, value] of q.entries()) {
      if (!['host', 'path', 'ttl'].includes(key)) target.searchParams.set(key, value);
    }

    const cache = caches.default;
    const cacheKey = new Request(target.toString(), { method: 'GET' });
    let upstream = await cache.match(cacheKey);
    if (!upstream) {
      const response = await fetch(target.toString(), {
        headers: {
          'User-Agent': 'BasqueteGouveiaPlay/3.0',
          'Accept': 'application/json',
        },
      });
      const body = await response.text();
      const headers = new Headers({
        ...corsHeaders(),
        'Content-Type': 'application/json; charset=utf-8',
      });
      if (response.ok) headers.set('Cache-Control', `public, max-age=0, s-maxage=${ttl}, stale-while-revalidate=${ttl * 2}`);
      upstream = new Response(body, { status: response.status, headers });
      if (response.ok) {
        const cacheCopy = upstream.clone();
        cacheCopy.headers.set('Cache-Control', `public, max-age=${ttl}`);
        await cache.put(cacheKey, cacheCopy);
      }
    }

    const headers = new Headers(upstream.headers);
    for (const [key, value] of Object.entries(corsHeaders())) headers.set(key, value);
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch (error) {
    return Response.json(
      { error: 'falha ao consultar a fonte', detail: String(error?.message || error) },
      { status: 502, headers: corsHeaders() },
    );
  }
}
