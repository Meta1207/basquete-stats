// Basquete Gouveia Play — views/favorites.js
import { SPORTS } from '../config.js';
import { V } from '../router.js';
import { getGames, memo } from '../services/espn.js';
import { bindGames, remember, skel } from '../ui/components.js';
import { ic, paintIcons } from '../ui/icons.js';
import { addDays, esc, fmtDay, fmtTime, isoLocal, startOfDay } from '../utils.js';

const TARGET_MIN = 1.20;
const TARGET_MAX = 1.30;
const SPORT_ORDER = ['tenis','futebol','nba'];

function decimalOdds(american){
  if(american==null || !Number.isFinite(Number(american)) || Number(american)===0) return null;
  const n=Number(american);
  return n>0 ? 1+(n/100) : 1+(100/Math.abs(n));
}
function favoriteFor(game){
  const o=game.odds;
  if(!o?.fav) return null;
  const side=o.fav==='home'?'home':'away';
  const team=game[side];
  const price=decimalOdds(side==='home'?o.hML:o.aML);
  if(!team || price==null) return null;
  return {team,price,side};
}
function favoriteCard(game){
  const fav=favoriteFor(game);
  if(!fav) return '';
  return `<div class="card" style="padding:12px;margin:8px 0">
    <div class="row" style="justify-content:space-between;gap:8px">
      <div style="min-width:0;flex:1">
        <div style="font-weight:800">${esc(game.home.name)} <span class="mut">×</span> ${esc(game.away.name)}</div>
        <div class="mut" style="font-size:12px;margin-top:4px">${fmtDay(game.date)} · ${fmtTime(game.date)} ${game.state==='in'?'· AO VIVO':''}</div>
        <div style="margin-top:7px"><span class="tag ok">FAVORITO</span> <b>${esc(fav.team.name)}</b></div>
      </div>
      <div style="text-align:right;flex:none"><div class="mut" style="font-size:11px">ODD</div><strong style="font-size:23px;color:var(--ok)">${fav.price.toFixed(2)}</strong></div>
    </div>
    <div class="dim" style="font-size:11px;margin-top:8px">Toque para abrir a análise da partida</div>
  </div>`;
}
async function renderFavorites(){
  const date=startOfDay(V.dataset.favDate ? new Date(V.dataset.favDate+'T12:00:00') : new Date());
  V.dataset.favDate=isoLocal(date);
  V.innerHTML=`<div class="card glow">
    <div class="ch">${ic('trophy')}<h3>Mercado de Clubes</h3><span class="sp"></span><button class="iconbtn" id="favRefresh">${ic('refresh')}</button></div>
    <p class="mut" style="font-size:13px;margin:-4px 0 12px">Clubes favoritos identificados pelas odds publicadas pela ESPN. Faixa de odds: 1,20 a 1,30.</p>
    <div class="row" style="margin-bottom:12px"><button class="iconbtn" id="favPrev">${ic('left')}</button><input type="date" class="sel" id="favDate" value="${isoLocal(date)}" style="flex:1"><button class="iconbtn" id="favNext">${ic('right')}</button><button class="btn ghost sm" id="favToday">Hoje</button></div>
    <div id="favResults">${skel(6)}</div>
  </div>`;
  paintIcons(V);
  const setDate=value=>{V.dataset.favDate=value;renderFavorites();};
  V.querySelector('#favPrev').onclick=()=>setDate(isoLocal(addDays(date,-1)));
  V.querySelector('#favNext').onclick=()=>setDate(isoLocal(addDays(date,1)));
  V.querySelector('#favToday').onclick=()=>setDate(isoLocal(new Date()));
  V.querySelector('#favDate').onchange=e=>{if(e.target.value)setDate(e.target.value);};
  V.querySelector('#favRefresh').onclick=()=>{memo.clear();renderFavorites();};
  const root=V.querySelector('#favResults');
  const all=[];
  for(const sk of SPORT_ORDER){
    const conf=SPORTS[sk];
    const jobs=conf.leagues.map(l=>getGames(sk,l.id,date,date,true).catch(()=>[]));
    const lists=await Promise.all(jobs);
    const games=lists.flat().filter(g=>g.state!=='post' && !g.completed);
    const picks=games.map(g=>({game:g,fav:favoriteFor(g)}))
      .filter(x=>x.fav && x.fav.price>=TARGET_MIN && x.fav.price<=TARGET_MAX)
      .sort((a,b)=>a.game.date-b.game.date);
    all.push({sk,conf,picks,total:games.length});
  }
  if(!root.isConnected) return;
  let html='';
  for(const section of all){
    html+=`<div class="section"><h4>${ic(section.conf.icon)} ${esc(section.conf.label)} <span class="mut" style="font-size:12px;font-weight:500">· ${section.picks.length} favorito(s) na faixa</span></h4>`;
    if(section.picks.length){
      const games=section.picks.map(x=>x.game);
      remember(games);
      html+=section.picks.map(x=>favoriteCard(x.game)).join('');
      // Mantém os cards ligados ao detalhe do jogo por um elemento de clique acessível.
      html+=`<div class="games" style="display:none">${games.map(g=>`<div class="g" data-gid="${esc(g.id)}"></div>`).join('')}</div>`;
    }else{
      html+=`<div class="empty">${section.total?'Nenhum jogo com odds publicadas na faixa 1,20–1,30.':'Nenhum jogo encontrado nesta data.'}</div>`;
    }
    html+='</div>';
  }
  root.innerHTML=html;
  bindGames(root);
  // Os cartões visuais também abrem o detalhe do jogo.
  root.querySelectorAll('.section').forEach((section,i)=>{
    const picks=all[i].picks;
    section.querySelectorAll('.card').forEach((card,j)=>card.addEventListener('click',()=>{
      const hidden=section.querySelectorAll('[data-gid]')[j];
      if(hidden) hidden.click();
    }));
  });
  paintIcons(root);
}
export { renderFavorites };
