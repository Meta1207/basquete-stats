// Proxy seguro para a API pública da ESPN (dados reais, sem chave).
// Uso: /api/espn?host=site&path=/apis/site/v2/sports/basketball/nba/scoreboard&dates=20251120
const HOSTS = {
  site: 'https://site.api.espn.com',
  web: 'https://site.web.api.espn.com',
  core: 'https://sports.core.api.espn.com',
};
module.exports = async (req, res) => {
  try {
    const q = { ...req.query };
    const base = HOSTS[q.host || 'site'];
    const path = String(q.path || '');
    const ttl = Math.min(Math.max(parseInt(q.ttl || '30', 10) || 30, 10), 86400);
    delete q.host; delete q.path; delete q.ttl;
    if (!base || !/^\/(apis|v2|v3)\/[\w\-\/.]+$/.test(path)) {
      res.status(400).json({ error: 'parâmetros inválidos' });
      return;
    }
    const url = new URL(base + path);
    Object.entries(q).forEach(([k, v]) => url.searchParams.set(k, String(v)));
    const r = await fetch(url, { headers: { 'User-Agent': 'BasqueteGouveiaPlay/3.0', Accept: 'application/json' } });
    const body = await r.text();
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (r.ok) res.setHeader('Cache-Control', `public, s-maxage=${ttl}, stale-while-revalidate=${ttl * 2}`);
    res.status(r.status).send(body);
  } catch (e) {
    res.status(502).json({ error: 'falha ao consultar a fonte', detail: String(e && e.message || e) });
  }
};
