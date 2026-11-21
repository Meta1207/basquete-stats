// Basquete Gouveia Play — services/live-updater.js
import { getGames } from '../services/espn.js';
import { GAMECACHE, gameRow, miniRow } from '../ui/components.js';
import { paintIcons } from '../ui/icons.js';
import { addDays, fmtTime } from '../utils.js';
import { openGame } from '../views/game.js';

/* =========================================================
   PLACAR AO VIVO — atualiza qualquer jogo ao vivo na tela a cada 30s
   ========================================================= */
let liveLoop=null;
function startLiveLoop(){
  clearInterval(liveLoop);
  liveLoop=setInterval(refreshLiveRows, 30000);
}
async function refreshLiveRows(){
  if(document.hidden) return;
  const els=[...document.querySelectorAll('[data-gid]')];
  const games=[...new Set(els.map(e=>e.dataset.gid))].map(id=>GAMECACHE.get(id)).filter(Boolean);
  const now=Date.now();
  const watch=games.filter(m=>m.state==='in' || (m.state==='pre' && m.date-now<20*60000 && now-m.date<5*3600000));
  if(!watch.length) return;
  const keys=new Map(); watch.forEach(m=>keys.set(m.sk+'|'+m.lg,[m.sk,m.lg]));
  const today=new Date();
  const fresh=(await Promise.all([...keys.values()].map(([sk,lg])=>getGames(sk,lg,addDays(today,-1),today,true).catch(()=>[])))).flat();
  const byId=new Map(fresh.map(m=>[String(m.id),m]));
  for(const old of watch){
    const nu=byId.get(String(old.id)); if(!nu) continue;
    const changed = nu.home.score!==old.home.score || nu.away.score!==old.away.score || nu.state!==old.state || nu.detail!==old.detail;
    GAMECACHE.set(String(nu.id),nu);
    if(!changed) continue;
    [...document.querySelectorAll('[data-gid]')].filter(e=>e.dataset.gid===String(nu.id)).forEach(el=>{
      const tpl=document.createElement('div');
      tpl.innerHTML = el.classList.contains('mini')?miniRow(nu):el.classList.contains('g')?gameRow(nu):'';
      const ne=tpl.firstElementChild; if(!ne) return;
      el.replaceWith(ne); ne.addEventListener('click',()=>openGame(GAMECACHE.get(String(nu.id))));
      const sc=ne.querySelector('.sc'); if(sc && (nu.home.score!==old.home.score||nu.away.score!==old.away.score)) sc.classList.add('flash');
      paintIcons(ne);
    });
  }
  const u=document.getElementById('liveUpd'); if(u) u.textContent='Placar atualizado '+fmtTime(new Date());
}
startLiveLoop();
document.addEventListener('visibilitychange',()=>{ if(!document.hidden) refreshLiveRows(); });

export { liveLoop, refreshLiveRows, startLiveLoop };
