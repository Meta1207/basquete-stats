// Basquete Gouveia Play — views/results.js
import { V } from '../router.js';
import { api, base, getGames, normComp } from '../services/espn.js';
import { S } from '../state.js';
import { bindGames, bindSportLeague, errBox, gamesList, leagueSelect, remember, skel, sportSelect } from '../ui/components.js';
import { ic, paintIcons } from '../ui/icons.js';
import { addDays, esc, isoLocal } from '../utils.js';

/* =========================================================
   RESULTADOS
   ========================================================= */
async function renderResults(){
  const sk=S.sport, lg=S.league[sk];
  const team=S.resTeam;
  V.innerHTML=`
  <div class="card glow">
    <div class="ch">${ic('bars')}<h3>Resultados Anteriores</h3><span class="sp"></span>${team?`<span class="chip on">${esc(team.name)} <button id="clrT" style="margin-left:6px">✕</button></span>`:''}</div>
    <div class="row" style="margin-bottom:12px">${sportSelect()}${leagueSelect(sk)}
      ${team && !team.text ? `<select class="sel" id="seas">${seasonOpts(sk)}</select>` : `
      <button class="iconbtn" id="pd">${ic('left')}</button>
      <input type="date" class="sel" id="rdate" value="${isoLocal(S.resDate)}" max="${isoLocal(new Date())}">
      <button class="iconbtn" id="nd">${ic('right')}</button>
      <select class="sel" id="rdays">${[[1,'Somente o dia'],[3,'3 dias'],[7,'7 dias'],[15,'15 dias'],[30,'30 dias']].map(([v,t])=>`<option value="${v}" ${S.resDays==v?'selected':''}>${t}</option>`).join('')}</select>`}
    </div>
    <div class="row" style="margin-bottom:10px"><label class="sbox" style="min-height:44px;flex:1">${ic('search')}<input id="rf" placeholder="Filtrar por equipe ou jogador" value="${team&&team.text?esc(team.name):''}"></label></div>
    <div id="rlist">${skel(6)}</div>
  </div>`;
  paintIcons(V);
  bindSportLeague(V, ()=>{ S.resTeam=null; renderResults(); });
  const ct=V.querySelector('#clrT'); if(ct) ct.onclick=()=>{ S.resTeam=null; renderResults(); };
  const rd=V.querySelector('#rdate');
  if(rd){
    rd.onchange=e=>{ const [a,b,c]=e.target.value.split('-').map(Number); if(a){ S.resDate=new Date(a,b-1,c); renderResults(); } };
    V.querySelector('#pd').onclick=()=>{ S.resDate=addDays(S.resDate,-S.resDays); renderResults(); };
    V.querySelector('#nd').onclick=()=>{ const n=addDays(S.resDate,S.resDays); if(n<=new Date()){ S.resDate=n; renderResults(); } };
    V.querySelector('#rdays').onchange=e=>{ S.resDays=+e.target.value; renderResults(); };
  }
  const el=document.getElementById('rlist');
  let list=[];
  try{
    if(team && !team.text){
      const season=+(V.querySelector('#seas')?.value)||undefined;
      list = await getTeamSchedule(sk,lg,team.id,season);
    } else {
      const from = team&&team.text ? addDays(new Date(),-30) : addDays(S.resDate,-(S.resDays-1));
      const to = team&&team.text ? new Date() : S.resDate;
      list = await getGames(sk,lg,from,to);
    }
  }catch(e){ el.innerHTML=errBox(e); return; }
  if(S.view!=='resultados') return;
  const all = list.filter(m=>m.completed || m.state==='in').sort((a,b)=>b.date-a.date);
  const draw=()=>{
    const f=(V.querySelector('#rf').value||'').toLowerCase().trim();
    const vis = f? all.filter(m=>[m.home.name,m.away.name,m.home.short,m.away.short].some(x=>(x||'').toLowerCase().includes(f))) : all;
    let h='';
    if(team && !team.text && vis.length){
      const tid=String(team.id); let w=0,l=0,d=0;
      vis.filter(m=>m.completed).forEach(m=>{ const me=String(m.home.id)===tid?m.home:m.away, op=me===m.home?m.away:m.home; if(me.score>op.score) w++; else if(me.score<op.score) l++; else d++; });
      h+=`<div class="tiles" style="margin-bottom:12px"><div class="tile"><small>Jogos</small><b>${vis.length}</b></div><div class="tile"><small>Vitórias</small><b class="acc">${w}</b></div><div class="tile"><small>Derrotas</small><b>${l}</b></div><div class="tile"><small>${sk==='futebol'?'Empates':'Aprov.'}</small><b>${sk==='futebol'?d:(vis.length?Math.round(w/(w+l||1)*100)+'%':'-')}</b></div></div>`;
    }
    h+=gamesList(vis,{group:sk!=='nba' && !team});
    el.innerHTML=h; bindGames(el);
  };
  V.querySelector('#rf').addEventListener('input',draw);
  const se=V.querySelector('#seas'); if(se) se.onchange=()=>renderResults();
  draw();
}
function seasonOpts(sk){
  const now=new Date(); const cur = sk==='nba' ? (now.getMonth()>=8?now.getFullYear()+1:now.getFullYear()) : now.getFullYear();
  const sel = S.resSeason || cur; let h='';
  for(let y=cur;y>=cur-15;y--) h+=`<option value="${y}" ${y==sel?'selected':''}>${sk==='nba'?`Temporada ${y-1}-${String(y).slice(2)}`:`Temporada ${y}`}</option>`;
  return h;
}
async function getTeamSchedule(sk,lg,teamId,season){
  S.resSeason=season;
  const params = season? {season} : {};
  const j = await api(base(sk,lg)+`/teams/${teamId}/schedule`, params, {ttl:600});
  const evs=(j.events||[]).map(ev=>normComp(ev, ev.competitions[0], sk, lg));
  if(sk==='nba' && !season){ // inclui playoffs quando houver
    try{ const p=await api(base(sk,lg)+`/teams/${teamId}/schedule`,{seasontype:3},{ttl:600}); (p.events||[]).forEach(ev=>evs.push(normComp(ev,ev.competitions[0],sk,lg))); }catch(e){}
  }
  return remember(evs);
}

export { getTeamSchedule, renderResults, seasonOpts };
