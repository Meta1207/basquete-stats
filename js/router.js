// Basquete Gouveia Play — router.js
import { S, store } from './state.js';
import { renderCalendar } from './views/calendar.js';
import { renderHome } from './views/home.js';
import { renderLive } from './views/live.js';
import { renderResults } from './views/results.js';
import { renderConfig } from './views/settings.js';
import { renderStats } from './views/stats.js';
import { renderTotals } from './views/totals.js';

/* =========================================================
   NAVEGAÇÃO
   ========================================================= */
const V = document.getElementById('view');
function go(view, opts={}){
  S.view=view; Object.assign(S,opts);
  document.querySelectorAll('#bot button').forEach(b=>b.classList.toggle('on',b.dataset.v===view));
  clearInterval(S.liveTimer);
  window.scrollTo({top:0,behavior:'smooth'});
  syncTabs();
  ({inicio:renderHome, calendario:renderCalendar, resultados:renderResults, estatisticas:renderStats, config:renderConfig, aovivo:renderLive, totais:renderTotals})[view]();
}
function syncTabs(){
  const active = S.view==='aovivo'?'aovivo':S.view==='totais'?'totais':S.sport;
  document.querySelectorAll('#tabs .tab').forEach(t=>t.classList.toggle('on',t.dataset.tab===active));
}
document.querySelectorAll('#bot button').forEach(b=>b.addEventListener('click',()=>go(b.dataset.v)));
document.querySelectorAll('#tabs .tab').forEach(t=>t.addEventListener('click',()=>{
  const k=t.dataset.tab;
  if(k==='aovivo'||k==='totais') return go(k);
  S.sport=k; store.set('sport',k);
  go(['calendario','resultados','estatisticas'].includes(S.view)?S.view:'inicio');
}));

export { V, go, syncTabs };
