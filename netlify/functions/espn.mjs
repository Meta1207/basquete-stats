// Netlify Function: mesmo proxy da ESPN usado na Vercel (api/espn.js).
const HOSTS = { site: 'https://site.api.espn.com', web: 'https://site.web.api.espn.com', core: 'https://sports.core.api.espn.com' };
export default async (req) => {
  const u = new URL(req.url);
  const q = Object.fromEntries(u.searchParams);
  const base = HOSTS[q.host || 'site'];
  const path = String(q.path || '');
  const ttl = Math.min(Math.max(parseInt(q.ttl || '30', 10) || 30, 10), 86400);
  delete q.host; delete q.path; delete q.ttl;
  const json = (body, status, extra = {}) => new Response(body, { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', ...extra } });
  if (!base || !/^\/(apis|v2|v3)\/[\w\-\/.]+$/.test(path)) return json(JSON.stringify({ error: 'parâmetros inválidos' }), 400);
  try {
    const target = new URL(base + path);
    Object.entries(q).forEach(([k, v]) => target.searchParams.set(k, v));
    const r = await fetch(target, { headers: { 'User-Agent': 'BasqueteGouveiaPlay/3.0', Accept: 'application/json' } });
    const body = await r.text();
    return json(body, r.status, r.ok ? { 'Cache-Control': `public, max-age=0`, 'Netlify-CDN-Cache-Control': `public, s-maxage=${ttl}, stale-while-revalidate=${ttl * 2}` } : {});
  } catch (e) {
    return json(JSON.stringify({ error: 'falha ao consultar a fonte', detail: String(e?.message || e) }), 502);
  }
};
export const config = { path: '/api/espn' };
