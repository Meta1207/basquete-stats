// Basquete Gouveia Play — services/espn.js
import { SPORTS } from '../config.js';
import { addDays, num, startOfDay, ymd } from '../utils.js';

/* =========================================================
   CAMADA DE DADOS (proxy Vercel → fallback ESPN direto)
   ========================================================= */
const HOSTS = { site:'https://site.api.espn.com', web:'https://site.web.api.espn.com', core:'https://sports.core.api.espn.com' };
const memo = new Map();
let proxyOK = null; // null = desconhecido
async function api(path, params={}, {host='site', ttl=30, fresh=false}={}){
  const qs = new URLSearchParams(params).toString();
  const key = host+path+'?'+qs;
  const hit = memo.get(key);
  if(hit && !fresh && Date.now()-hit.t < ttl*1000) return hit.p;
  const p = (async()=>{
    if(proxyOK !== false){
      try{
        const u = `/api/espn?${new URLSearchParams({host, path, ttl, ...params})}`;
        const r = await fetch(u);
        const ct = r.headers.get('content-type')||'';
        if(r.ok && ct.includes('json')){ proxyOK = true; return await r.json(); }
        if(r.status===404 || !ct.includes('json')) proxyOK = false;
        else throw new Error('HTTP '+r.status);
      }catch(e){ if(proxyOK) throw e; proxyOK = false; }
    }
    const r = await fetch(HOSTS[host]+path+(qs?'?'+qs:''));
    if(!r.ok) throw new Error('HTTP '+r.status);
    return await r.json();
  })();
  memo.set(key,{t:Date.now(),p});
  p.catch(()=>memo.delete(key));
  return p;
}
const base = (sk, lg) => `/apis/site/v2/sports/${SPORTS[sk].sport}/${lg}`;

/* Normaliza um evento da ESPN em uma partida simples */
function teamOf(c, sk){
  if(!c) return {name:'—'};
  const t = c.team || {};
  const a = c.athlete || (c.athletes && c.athletes[0] && c.athletes[0].athlete) || null;
  const roster = c.roster && c.roster.athletes ? c.roster.athletes.map(x=>x.athlete||x) : null;
  let name = t.displayName || t.name || (a && (a.displayName||a.fullName)) || (roster && roster.map(r=>r.shortName||r.displayName).join(' / ')) || c.name || '—';
  let short = t.shortDisplayName || t.abbreviation || (a && (a.shortName || String(a.displayName||'').split(' ').slice(-1)[0])) || name;
  let logo = t.logo || (t.logos && t.logos[0] && t.logos[0].href) || (a && a.flag && a.flag.href) || (a && a.headshot && a.headshot.href) || '';
  const lines = (c.linescores||[]).map(l=>({v: num(l.value ?? l.displayValue), tb: l.tiebreak ?? null, w: l.winner}));
  let score = num(c.score);
  return { id: t.id || (a&&a.id) || c.id, name, short, abbr: t.abbreviation||short, logo, score, lines, winner: !!c.winner, homeAway: c.homeAway, record: c.records && c.records[0] && c.records[0].summary };
}
/* Odds (linha de fechamento publicada pela fonte) */
function mlOf(o){ if(!o) return null; return num(o.moneyLine ?? o.moneyline ?? o.odds?.value ?? o.close?.odds ?? o.current?.moneyLine?.american); }
function parseOdds(o, H, A){
  if(!o) return null;
  const hO=o.homeTeamOdds||{}, aO=o.awayTeamOdds||{};
  let hML=mlOf(hO) ?? num(o.moneyline?.home?.close?.odds ?? o.moneyline?.home?.open?.odds);
  let aML=mlOf(aO) ?? num(o.moneyline?.away?.close?.odds ?? o.moneyline?.away?.open?.odds);
  const dML=mlOf(o.drawOdds) ?? num(o.moneyline?.draw?.close?.odds);
  let fav=null;
  if(hO.favorite===true) fav='home'; else if(aO.favorite===true) fav='away';
  else if(hML!=null&&aML!=null&&hML!==aML) fav=hML<aML?'home':'away';
  else if(o.details && H && A){ const d=String(o.details).toUpperCase();
    if(H.abbr && d.startsWith(String(H.abbr).toUpperCase())) fav='home'; else if(A.abbr && d.startsWith(String(A.abbr).toUpperCase())) fav='away'; }
  let spread=num(o.spread); // linha do mandante (negativa = mandante favorito)
  if(spread!=null && fav==='away' && spread<0) spread=-spread;
  if(spread==null && o.details){ const mm=String(o.details).match(/(-?\d+(\.\d+)?)\s*$/); if(mm){ const v=Math.abs(+mm[1]); spread = fav==='home'?-v:fav==='away'?v:null; } }
  return { ou:num(o.overUnder), det:o.details, provider:o.provider?.name, hML, aML, dML, fav, spread };
}
const implied = ml => ml==null?null: ml<0 ? -ml/(-ml+100) : 100/(ml+100);
function normComp(ev, comp, sk, lg, extra={}){
  const cs = comp.competitors || [];
  let home, away;
  if(sk==='tenis'){ const s=[...cs].sort((a,b)=>(a.order||0)-(b.order||0)); home=s[0]; away=s[1]; }
  else { home = cs.find(c=>c.homeAway==='home')||cs[0]; away = cs.find(c=>c.homeAway==='away')||cs[1]; }
  const st = (comp.status||ev.status||{}).type || {};
  const H = teamOf(home,sk), A = teamOf(away,sk);
  if(sk==='tenis'){ // sets ganhos calculados pelos games quando 'winner' do set não vem
    const sets=[0,0]; const n=Math.max(H.lines.length,A.lines.length);
    for(let i=0;i<n;i++){ const a=H.lines[i]?.v, b=A.lines[i]?.v; if(a==null||b==null) continue;
      const done = st.completed || i<n-1; if(!done) continue; if(a>b) sets[0]++; else if(b>a) sets[1]++; }
    H.score=sets[0]; A.score=sets[1];
  }
  const odds = (comp.odds && comp.odds[0]) || null;
  return {
    id: comp.id || ev.id, eventId: ev.id, sk, lg,
    date: new Date(comp.date || ev.date),
    state: st.state || 'pre', completed: !!st.completed, detail: st.shortDetail || st.detail || st.description || '',
    home: H, away: A,
    venue: comp.venue && comp.venue.fullName,
    odds: parseOdds(odds, H, A),
    note: extra.note || (comp.notes && comp.notes[0] && comp.notes[0].headline) || '',
    round: comp.round && (comp.round.displayName||comp.round.name) || '',
    tournament: extra.tournament || '',
    name: ev.name
  };
}
function normScoreboard(json, sk, lg){
  const out=[];
  for(const ev of (json.events||[])){
    if(ev.groupings && ev.groupings.length){
      for(const g of ev.groupings){
        const gname = (g.grouping && (g.grouping.displayName||g.grouping.name)) || '';
        for(const c of (g.competitions||[])) out.push(normComp(ev,c,sk,lg,{tournament: ev.name||ev.shortName, note: gname}));
      }
    } else if(ev.competitions && ev.competitions.length){
      if(sk==='tenis') for(const c of ev.competitions) out.push(normComp(ev,c,sk,lg,{tournament:ev.name}));
      else out.push(normComp(ev, ev.competitions[0], sk, lg));
    }
  }
  return out.filter(m=>m.home && m.away && !isNaN(m.date));
}
function ttlFor(endDate){ return startOfDay(endDate) < addDays(startOfDay(new Date()),-1) ? 86400 : 30; }

/* Busca jogos entre duas datas locais (inclusive). Busca 1 dia de margem por fuso. */
async function getGames(sk, lg, from, to, fresh=false){
  const a = addDays(from,-1), b = addDays(to,1);
  let list=[];
  try{
    const j = await api(base(sk,lg)+'/scoreboard', {dates: ymd(a)+'-'+ymd(b), limit: 1000}, {ttl: ttlFor(b), fresh});
    list = normScoreboard(j, sk, lg);
  }catch(e){
    // fallback: dia a dia
    const days=[]; for(let d=new Date(a); d<=b; d=addDays(d,1)) days.push(new Date(d));
    const parts = await Promise.all(days.map(d=>api(base(sk,lg)+'/scoreboard',{dates:ymd(d)},{ttl:ttlFor(d)}).then(j=>normScoreboard(j,sk,lg)).catch(()=>[])));
    list = parts.flat();
  }
  const f=startOfDay(from), t=addDays(startOfDay(to),1);
  const seen=new Set();
  return list.filter(m=>m.date>=f && m.date<t && !seen.has(m.id) && seen.add(m.id)).sort((x,y)=>x.date-y.date);
}
async function getSummary(m){
  return api(base(m.sk,m.lg)+'/summary', {event: m.eventId}, {ttl: m.completed?86400:20});
}

export { HOSTS, api, base, getGames, getSummary, implied, memo, mlOf, normComp, normScoreboard, parseOdds, proxyOK, teamOf, ttlFor };
