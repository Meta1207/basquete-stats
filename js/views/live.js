// Basquete Gouveia Play — views/live.js
import { SPORTS } from '../config.js';
import { V, go } from '../router.js';
import { getGames, memo } from '../services/espn.js';
import { S } from '../state.js';
import { bindGames, gamesList, skel } from '../ui/components.js';
import { ic, paintIcons } from '../ui/icons.js';
import { esc, fmtTime } from '../utils.js';

/* =========================================================
   AO VIVO
   ========================================================= */
async function renderLive(){
  V.innerHTML=`<div class="card glow"><div class="ch"><span class="reddot"></span><h3>Ao vivo agora</h3><span class="sp"></span><span class="mut" id="upd"></span><button class="iconbtn" id="rf">${ic('refresh')}</button></div><div id="lv">${skel(5)}</div></div>`;
  paintIcons(V);
  V.querySelector('#rf').onclick=()=>{ memo.clear(); load(); };
  async function load(){
    const today=new Date();
    const jobs=Object.entries(SPORTS).flatMap(([sk,c])=>c.leagues.map(l=>[sk,l.id]));
    const res=await Promise.all(jobs.map(([sk,lg])=>getGames(sk,lg,today,today,true).catch(()=>[])));
    if(S.view!=='aovivo') return;
    let h='';
    jobs.forEach(([sk,lg],i)=>{
      const live=res[i].filter(m=>m.state==='in'); const nm=SPORTS[sk].leagues.find(l=>l.id===lg)?.name;
      if(live.length) h+=`<div class="grp">${ic(SPORTS[sk].icon)} ${esc(nm)} · ${live.length} ao vivo</div>${gamesList(live,{group:sk==='tenis'})}`;
    });
    if(!h){
      h=`<div class="empty">Nenhuma partida ao vivo neste momento.</div>`;
      jobs.forEach(([sk,lg],i)=>{ const up=res[i].filter(m=>m.state==='pre').slice(0,4); if(up.length) h+=`<div class="grp">Hoje · ${esc(SPORTS[sk].leagues.find(l=>l.id===lg)?.name)}</div>${gamesList(up)}`; });
    }
    const el=document.getElementById('lv'); el.innerHTML=h; paintIcons(el); bindGames(el);
    document.getElementById('upd').textContent='Atualizado '+fmtTime(new Date());
  }
  await load();
  S.liveTimer=setInterval(load,30000);
}
async function updateLivePill(){
  try{
    const t=new Date();
    const r=await Promise.all(Object.entries(SPORTS).flatMap(([sk,c])=>c.leagues.map(l=>getGames(sk,l.id,t,t).catch(()=>[]))));
    const n=r.flat().filter(m=>m.state==='in').length;
    document.getElementById('liveTxt').textContent = n? `${n} ao vivo` : 'Ao vivo'; const lc=document.getElementById('liveCnt'); if(lc){ lc.textContent=n; lc.hidden=!n; }
  }catch(e){}
}
document.getElementById('livePill').onclick=()=>go('aovivo');

export { renderLive, updateLivePill };
