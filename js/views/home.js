// Basquete Gouveia Play — views/home.js
import { SPORTS } from '../config.js';
import { V, go } from '../router.js';
import { api, base, getGames } from '../services/espn.js';
import { S, store } from '../state.js';
import { bindGames, errBox, gamesList, img, leagueSelect, miniRow, remember, skel } from '../ui/components.js';
import { ic, paintIcons } from '../ui/icons.js';
import { MESC, addDays, esc, fmtDay, isoLocal, sameDay, startOfDay, ymd } from '../utils.js';
import { updateLivePill } from '../views/live.js';
import { getGamelog } from '../views/stats.js';

/* =========================================================
   INÍCIO
   ========================================================= */
async function renderHome(){
  const sk=S.sport, cfg=SPORTS[sk], lg=S.league[sk];
  const lgName = cfg.leagues.find(l=>l.id===lg)?.name || cfg.label;
  S.homeDate = S.homeDate || {}; const hd = S.homeDate[sk] || startOfDay(new Date());
  V.innerHTML = `
  <section class="hero">
    <h2>Análises completas ${sk==='nba'?'da':'do'} <b>${esc(sk==='nba'?lgName:cfg.label)}</b></h2>
    <p>Estatísticas, histórico de jogos, resultados anteriores, calendário e todos os mercados — com dados reais.</p>
    <div class="search" style="position:relative">
      <label class="sbox">${ic('search')}<input id="q" placeholder="${sk==='nba'?'Ex.: Stephen Curry, Lakers, Celtics...':sk==='futebol'?'Ex.: Flamengo, Palmeiras, Real Madrid...':'Ex.: Sinner, Alcaraz, Swiatek...'}" autocomplete="off"></label>
      <button class="btn" id="qb">Buscar ${ic('right')}</button>
      <div class="sugg" id="sugg"></div>
    </div>
  </section>
  <div class="grid3">
    <button class="feat" data-go="calendario">${ic('cal')}<h3>Calendário de Jogos</h3><p>Próximos, em andamento e jogos anteriores</p></button>
    <button class="feat" data-go="resultados">${ic('bars')}<h3>Resultados Anteriores</h3><p>Placar, estatísticas e desempenho por equipe</p></button>
    <button class="feat" data-go="estatisticas">${ic('user')}<h3>Análises de Jogadores</h3><p>Pontos, rebotes, assistências, tocos, roubos e combinados</p></button>
  </div>
  <div class="two">
    <div class="card glow">
      <div class="ch">${ic('cal')}<h3>Jogos por data <small>(${esc(lgName)})</small></h3><span class="sp"></span>${leagueSelect(sk,'hLg')}</div>
      <div class="row" style="margin-bottom:8px"><button class="iconbtn" id="sPrev">${ic('left')}</button><input type="date" class="sel" id="hDate" value="${isoLocal(hd)}" style="flex:1"><button class="iconbtn" id="sNext">${ic('right')}</button><button class="btn ghost sm" id="sToday">Hoje</button></div>
      <div class="strip" id="strip">${Array.from({length:22},(_,i)=>addDays(hd,i-14)).map(d=>`<button data-sd="${ymd(d)}" class="${sameDay(d,hd)?'on':''} ${sameDay(d,new Date())?'today':''}"><small>${['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][d.getDay()]}</small>${d.getDate()}<small>${MESC[d.getMonth()]}</small></button>`).join('')}</div>
      <div class="updbar"><span class="dot"></span><span id="liveUpd">Placar ao vivo atualiza sozinho a cada 30s</span></div>
      <div id="hcal">${skel(5)}</div>
      <div class="more"><button class="btn ghost sm" data-go="calendario">${ic('cal')} Calendário completo (mês e ano) ${ic('right')}</button></div>
    </div>
    <div class="stack">
      <div class="card glow">
        <div class="ch">${ic('trophy')}<h3>Últimos Resultados</h3></div>
        <div id="hres">${skel(3)}</div>
        <div class="more"><button class="link" data-go="resultados">Ver mais resultados ${ic('right')}</button></div>
      </div>
      <div class="card glow" id="hstat"></div>
    </div>
  </div>`;
  paintIcons(V);
  V.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.go)));
  const setHD=d=>{ S.homeDate[sk]=startOfDay(d); renderHome(); };
  V.querySelectorAll('[data-sd]').forEach(b=>b.addEventListener('click',()=>{ const v=b.dataset.sd; setHD(new Date(+v.slice(0,4),+v.slice(4,6)-1,+v.slice(6))); }));
  V.querySelector('#sPrev').onclick=()=>setHD(addDays(hd,-1));
  V.querySelector('#sNext').onclick=()=>setHD(addDays(hd,1));
  V.querySelector('#sToday').onclick=()=>setHD(new Date());
  V.querySelector('#hDate').onchange=e=>{ const [a,b,c]=e.target.value.split('-').map(Number); if(a) setHD(new Date(a,b-1,c)); };
  V.querySelector('#hLg').onchange=e=>{ S.league[sk]=e.target.value; store.set('league',S.league); renderHome(); };
  const stEl=V.querySelector('#strip .on'), stW=V.querySelector('#strip'); if(stEl&&stW) stW.scrollLeft=stEl.offsetLeft-stW.offsetLeft-stW.clientWidth/2+stEl.clientWidth/2;
  setupSearch();

  const today=startOfDay(new Date());
  const span = sk==='futebol'?10:sk==='tenis'?3:6;
  getGames(sk,lg,hd,hd).then(list=>{
    const c=document.getElementById('hcal'); if(!c) return;
    list.sort((a,b)=>(a.state==='in'?-1:0)-(b.state==='in'?-1:0) || a.date-b.date);
    c.innerHTML = list.length? gamesList(list,{group:sk!=='nba'}) : `<div class="empty">Nenhum jogo de ${esc(lgName)} em ${fmtDay(hd)}. Use as setas ou a faixa de datas.</div>`;
    bindGames(c);
  }).catch(e=>{ const c=document.getElementById('hcal'); if(c) c.innerHTML=errBox(e); });
  getGames(sk,lg,addDays(today,-span),today).then(list=>{
    const fin = remember(list.filter(m=>m.completed)).reverse();
    const el=document.getElementById('hres'); if(!el) return;
    el.innerHTML = fin.length? fin.slice(0,4).map(miniRow).join('') : `<div class="empty">Sem resultados recentes nesta competição.</div>`;
    bindGames(el);
  }).catch(e=>{ const el=document.getElementById('hres'); if(el) el.innerHTML=errBox(e); });
  renderFavCard(document.getElementById('hstat'));
  updateLivePill();
}
async function renderFavCard(el){
  const fp=S.favPlayer;
  el.innerHTML=`<div class="ch">${ic('bars')}<h3>Principais Estatísticas <small>(Últimos 5 jogos)</small></h3></div>${skel(2)}`;
  paintIcons(el);
  try{
    const g = await getGamelog(fp.id);
    const last = g.games.slice(0,5);
    if(!last.length) throw new Error('sem jogos na temporada');
    const av = k => (last.reduce((s,x)=>s+(x.s[k]||0),0)/last.length).toFixed(1);
    el.innerHTML = `<div class="ch">${ic('bars')}<h3>Principais Estatísticas <small>(Últimos 5 jogos)</small></h3></div>
      <div class="ply">${img(g.headshot||`https://a.espncdn.com/i/headshots/nba/players/full/${fp.id}.png`,'hs')}<div><h4>${esc(g.name||fp.name)}</h4><div class="mut">${esc(g.team||fp.team||'')}</div></div>${g.teamLogo?img(g.teamLogo,'lg'):''}</div>
      <div class="tiles">${['PTS','REB','AST','3PM'].map(k=>`<div class="tile"><small>${k==='3PM'?'3PTS':k}</small><b>${av(k)}</b></div>`).join('')}</div>
      <div class="more"><button class="link" id="favMore">Ver análise completa ${ic('right')}</button></div>`;
    el.querySelector('#favMore').addEventListener('click',()=>{ S.player={id:fp.id,name:g.name||fp.name}; S.sport='nba'; go('estatisticas'); });
  }catch(e){
    el.innerHTML = `<div class="ch">${ic('bars')}<h3>Principais Estatísticas</h3></div><div class="empty">Estatísticas de ${esc(fp.name)} indisponíveis agora (${esc(e.message)}).</div>`;
  }
}

/* Busca (times e jogadores) */
let TEAMS = {};
function clearTeams(){ TEAMS = {}; }
async function getTeams(sk, lg){
  const k=sk+lg; if(TEAMS[k]) return TEAMS[k];
  const j = await api(base(sk,lg)+'/teams', {limit:400}, {ttl:86400});
  const list = (j.sports?.[0]?.leagues?.[0]?.teams||[]).map(x=>x.team).map(t=>({id:t.id,name:t.displayName,short:t.shortDisplayName,abbr:t.abbreviation,logo:t.logos?.[0]?.href}));
  return TEAMS[k]=list;
}
async function searchPlayers(q){
  try{
    const j = await api('/apis/common/v3/search', {query:q, limit:10, type:'player'}, {host:'web', ttl:3600});
    const items=[];
    const walk=o=>{ if(!o||typeof o!=='object') return; if(Array.isArray(o)) return o.forEach(walk);
      if((o.uid||'').includes('~a:') && (o.displayName||o.name)) items.push(o); Object.values(o).forEach(walk); };
    walk(j.results||j.items||j);
    const out=[]; const seen=new Set();
    for(const it of items){
      const id=(it.uid.match(/~a:(\d+)/)||[])[1]; const isNBA = /s:40~l:46~/.test(it.uid);
      if(!id||seen.has(id)||!isNBA) continue; seen.add(id);
      out.push({id, name: it.displayName||it.name, sub: it.subtitle||it.description||'', img: it.image?.default || it.headshot?.href || `https://a.espncdn.com/i/headshots/nba/players/full/${id}.png`});
    }
    return out;
  }catch(e){ return []; }
}
function setupSearch(){
  const q=document.getElementById('q'), sg=document.getElementById('sugg'), qb=document.getElementById('qb');
  if(!q) return;
  let t;
  const run = async()=>{
    const s=q.value.trim(); if(s.length<2){ sg.style.display='none'; return; }
    const sk=S.sport, lg=S.league[sk];
    sg.innerHTML=`<div class="empty">Buscando…</div>`; sg.style.display='block';
    const [teams, players] = await Promise.all([
      sk==='tenis'? Promise.resolve([]) : getTeams(sk,lg).catch(()=>[]),
      sk==='nba'? searchPlayers(s) : Promise.resolve([])
    ]);
    const n=s.toLowerCase();
    const tm=teams.filter(t=>[t.name,t.short,t.abbr].some(x=>(x||'').toLowerCase().includes(n))).slice(0,5);
    let html = tm.map(t=>`<button data-team="${t.id}">${img(t.logo)}<div><b>${esc(t.name)}</b><div class="mut" style="font-size:13px">Time · resultados e confrontos</div></div></button>`).join('');
    html += players.slice(0,6).map(p=>`<button data-pl="${p.id}" data-nm="${esc(p.name)}">${img(p.img)}<div><b>${esc(p.name)}</b><div class="mut" style="font-size:13px">Jogador · ${esc(p.sub||'NBA')}</div></div></button>`).join('');
    if(sk==='tenis') html = `<button data-tq="${esc(s)}">${ic('search')}<div><b>Buscar "${esc(s)}" nos resultados</b><div class="mut" style="font-size:13px">Últimos 30 dias · ATP/WTA</div></div></button>`;
    sg.innerHTML = html || `<div class="empty">Nada encontrado. ${sk==='nba'?'Tente o nome completo do jogador ou do time.':''}</div>`;
    paintIcons(sg);
    sg.querySelectorAll('[data-team]').forEach(b=>b.addEventListener('click',()=>{ const t=tm.find(x=>x.id===b.dataset.team); go('resultados',{resTeam:t}); }));
    sg.querySelectorAll('[data-pl]').forEach(b=>b.addEventListener('click',()=>{ S.player={id:b.dataset.pl,name:b.dataset.nm}; go('estatisticas'); }));
    sg.querySelectorAll('[data-tq]').forEach(b=>b.addEventListener('click',()=>go('resultados',{resTeam:{id:null,name:s,text:true}})));
  };
  q.addEventListener('input',()=>{ clearTimeout(t); t=setTimeout(run,320); });
  q.addEventListener('keydown',e=>{ if(e.key==='Enter') run(); });
  qb.addEventListener('click',run);
  document.addEventListener('click',e=>{ if(!e.target.closest('.search')) sg.style.display='none'; },{once:false});
}

export { TEAMS, clearTeams, getTeams, renderFavCard, renderHome, searchPlayers, setupSearch };
