// Basquete Gouveia Play — ui/components.js
import { SPORTS } from '../config.js';
import { syncTabs } from '../router.js';
import { S, store } from '../state.js';
import { ic } from '../ui/icons.js';
import { MESC, esc, fmtTime } from '../utils.js';
import { openGame } from '../views/game.js';

/* =========================================================
   COMPONENTES DE UI
   ========================================================= */
const img = (src, cls='') => src ? `<img class="${cls}" src="${esc(src)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">` : `<span class="${cls}" style="width:30px;height:30px;display:inline-block"></span>`;
function scoreHTML(m){
  if(m.state==='pre') return `<div class="sc pre">${fmtTime(m.date)}</div>`;
  const h=m.home.score??'-', a=m.away.score??'-';
  const hw = m.completed && (m.home.winner || (h>a)), aw = m.completed && (m.away.winner || (a>h));
  return `<div class="sc ${m.state==='in'?'live':''}"><span class="${hw?'w':'l'}">${h}</span> – <span class="${aw?'w':'l'}">${a}</span>${m.state==='in'&&m.detail?`<small class="lv">● ${esc(m.detail)}</small>`:''}</div>`;
}
function statusHTML(m){
  if(m.state==='in') return `<div class="st live">AO<br>VIVO</div>`;
  if(m.completed) return `<div class="st">${ic('check')}</div>`;
  return `<div class="st dim"></div>`;
}
function gameRow(m){
  return `<div class="g" data-gid="${esc(m.id)}">
    <div class="d">${m.date.getDate()}<small>${MESC[m.date.getMonth()]}</small></div>
    <div class="tm">${img(m.home.logo)}<span>${esc(m.home.short)}</span></div>
    ${scoreHTML(m)}
    <div class="tm r"><span>${esc(m.away.short)}</span>${img(m.away.logo)}</div>
    ${statusHTML(m)}
  </div>`;
}
function miniRow(m){
  return `<div class="mini" data-gid="${esc(m.id)}">
    <div class="tm">${img(m.home.logo,'lg')}<span>${esc(m.home.short)}</span></div>
    <div class="sc ${m.state==='pre'?'pre':''}" style="min-width:0;background:none;font-size:${m.state==='pre'?15:20}px">${m.state==='pre'?fmtTime(m.date):`<span class="${m.home.winner?'w':'l'}">${m.home.score??'-'}</span> – <span class="${m.away.winner?'w':'l'}">${m.away.score??'-'}</span>${m.state==='in'?`<small class="lv">● ${esc(m.detail||'AO VIVO')}</small>`:''}`}</div>
    <div class="tm r"><span>${esc(m.away.short)}</span>${img(m.away.logo,'lg')}</div></div>`;
}
const GAMECACHE = new Map();
function remember(list){ list.forEach(m=>GAMECACHE.set(String(m.id),m)); return list; }
function bindGames(root){
  root.querySelectorAll('[data-gid]').forEach(el=>el.addEventListener('click',()=>{ const m=GAMECACHE.get(el.dataset.gid); if(m) openGame(m); }));
}
function groupByTournament(list){
  const map=new Map(); list.forEach(m=>{ const k=(m.tournament?m.tournament+' · ':'')+(m.note||''); if(!map.has(k)) map.set(k,[]); map.get(k).push(m); });
  return map;
}
function gamesList(list, {group=false}={}){
  if(!list.length) return `<div class="empty">Nenhum jogo encontrado para este período.</div>`;
  remember(list);
  if(group && list.some(m=>m.tournament||m.note)){
    let h=''; for(const [k,v] of groupByTournament(list)) h+=`<div class="grp">${esc(k||'Partidas')}</div><div class="games">${v.map(gameRow).join('')}</div>`;
    return h;
  }
  return `<div class="games">${list.map(gameRow).join('')}</div>`;
}
const skel = n => Array.from({length:n},()=>'<div class="skel"></div>').join('');
const errBox = e => `<div class="err">Não foi possível carregar os dados agora (${esc(e.message||e)}). Tente novamente em instantes.</div>`;
function leagueSelect(sk, id='lgSel'){
  return `<select class="sel" id="${id}">${SPORTS[sk].leagues.map(l=>`<option value="${l.id}" ${S.league[sk]===l.id?'selected':''}>${esc(l.name)}</option>`).join('')}</select>`;
}
function sportSelect(id='spSel'){
  return `<select class="sel" id="${id}">${Object.entries(SPORTS).map(([k,v])=>`<option value="${k}" ${S.sport===k?'selected':''}>${v.label}</option>`).join('')}</select>`;
}
function bindSportLeague(root, rerender){
  const sp=root.querySelector('#spSel'), lg=root.querySelector('#lgSel');
  sp && sp.addEventListener('change',()=>{ S.sport=sp.value; store.set('sport',S.sport); syncTabs(); rerender(); });
  lg && lg.addEventListener('change',()=>{ S.league[S.sport]=lg.value; store.set('league',S.league); rerender(); });
}
function toast(t){ const el=document.getElementById('toast'); el.textContent=t; el.style.display='block'; clearTimeout(toast.h); toast.h=setTimeout(()=>el.style.display='none',2400); }

export { GAMECACHE, bindGames, bindSportLeague, errBox, gameRow, gamesList, groupByTournament, img, leagueSelect, miniRow, remember, scoreHTML, skel, sportSelect, statusHTML, toast };
