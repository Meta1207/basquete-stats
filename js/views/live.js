// Basquete Gouveia Play — views/live.js
import { SPORTS } from '../config.js';
import { V, go } from '../router.js';
import { getGames, memo } from '../services/espn.js';
import { S } from '../state.js';
import { bindGames, gamesList, skel } from '../ui/components.js';
import { ic, paintIcons } from '../ui/icons.js';
import { esc, fmtTime } from '../utils.js';

/* =========================================================
   AO VIVO — painel separado por modalidade
   Exibe partidas em andamento de cada esporte. Quando uma
   modalidade não tiver jogo ao vivo, mostra próximos jogos
   claramente identificados como programação (sem simular
   placar ou status ao vivo).
   ========================================================= */
async function renderLive(){
  V.innerHTML=`<div class="card glow"><div class="ch"><span class="reddot"></span><h3>Ao vivo agora</h3><span class="sp"></span><span class="mut" id="upd"></span><button class="iconbtn" id="rf">${ic('refresh')}</button></div><div id="lv">${skel(5)}</div></div>`;
  paintIcons(V);
  V.querySelector('#rf').onclick=()=>{ memo.clear(); load(); };
  async function load(){
    const today=new Date();
    const sports=Object.entries(SPORTS);
    const jobs=sports.flatMap(([sk,c])=>c.leagues.map(l=>[sk,l]));
    const res=await Promise.all(jobs.map(([sk,l])=>getGames(sk,l.id,today,today,true).catch(()=>[])));
    if(S.view!=='aovivo') return;
    let h='';
    for(const [sk,conf] of sports){
      const indexes=jobs.map((job,i)=>job[0]===sk?i:-1).filter(i=>i>=0);
      const live=indexes.flatMap(i=>res[i].filter(m=>m.state==='in'));
      if(live.length){
        h+=`<div class="grp">${ic(conf.icon)} ${esc(conf.label)} · ${live.length} ${live.length===1?'partida ao vivo':'partidas ao vivo'}</div>${gamesList(live,{group:sk==='tenis'})}`;
      }else{
        const upcoming=indexes.flatMap(i=>res[i].filter(m=>m.state==='pre'));
        upcoming.sort((a,b)=>a.date-b.date);
        if(upcoming.length){
          h+=`<div class="grp">${ic(conf.icon)} ${esc(conf.label)} · Próximos jogos</div>${gamesList(upcoming.slice(0,3),{group:sk==='tenis'})}`;
        }else{
          h+=`<div class="grp">${ic(conf.icon)} ${esc(conf.label)}</div><div class="empty">Nenhuma partida ao vivo ou programada para hoje.</div>`;
        }
      }
    }
    const el=document.getElementById('lv');
    if(el){ el.innerHTML=h; paintIcons(el); bindGames(el); }
    const upd=document.getElementById('upd');
    if(upd) upd.textContent='Atualizado '+fmtTime(new Date());
  }
  await load();
  clearInterval(S.liveTimer);
  S.liveTimer=setInterval(load,30000);
}
async function updateLivePill(){
  try{
    const t=new Date();
    const r=await Promise.all(Object.entries(SPORTS).flatMap(([sk,c])=>c.leagues.map(l=>getGames(sk,l.id,t,t).catch(()=>[]))));
    const n=r.flat().filter(m=>m.state==='in').length;
    const txt=document.getElementById('liveTxt');
    if(txt) txt.textContent=n?`${n} ao vivo`:'Ao vivo';
    const lc=document.getElementById('liveCnt');
    if(lc){ lc.textContent=n; lc.hidden=!n; }
  }catch(e){}
}
document.getElementById('livePill').onclick=()=>go('aovivo');

export { renderLive, updateLivePill };
