// Basquete Gouveia Play — router.js
import { S, store } from './state.js';
import { renderCalendar } from './views/calendar.js';
import { renderHome } from './views/home.js';
import { renderLive } from './views/live.js';
import { renderResults } from './views/results.js';
import { renderConfig } from './views/settings.js';
import { renderStats } from './views/stats.js';
import { renderTotals } from './views/totals.js';
import { renderFavorites } from './views/favorites.js';

/* =========================================================
   NAVEGAÇÃO
   ========================================================= */
const V = document.getElementById('view');
function go(view, opts={}){
  if(view==='mercado-futebol') S.sport='futebol';
  if(view==='mercado-pontos') S.sport='nba';
  S.view=view; Object.assign(S,opts);
  document.querySelectorAll('#bot button').forEach(b=>b.classList.toggle('on',b.dataset.v===view));
  clearInterval(S.liveTimer);
  window.scrollTo({top:0,behavior:'smooth'});
  syncTabs();
  ({inicio:renderHome, calendario:renderCalendar, resultados:renderResults, estatisticas:renderStats, config:renderConfig, aovivo:renderLive, totais:renderTotals, favoritos:renderFavorites, 'mercado-futebol':renderTotals, 'mercado-pontos':renderTotals})[view]();
}
function syncTabs(){
  const active = S.view==='aovivo'?'aovivo':S.view==='totais'?'totais':S.view==='favoritos'?'mercado-clubes':S.view==='mercado-futebol'?'mercado-futebol':S.view==='mercado-pontos'?'mercado-pontos':S.sport;
  document.querySelectorAll('#tabs .tab').forEach(t=>t.classList.toggle('on',t.dataset.tab===active));
}
document.querySelectorAll('#bot button').forEach(b=>b.addEventListener('click',()=>go(b.dataset.v)));
document.querySelectorAll('#tabs .tab').forEach(t=>t.addEventListener('click',()=>{
  const k=t.dataset.tab;
  if(k==='aovivo'||k==='totais'||k==='favoritos') return go(k);
  if(k==='mercado-clubes') return go('favoritos');
  if(k==='mercado-futebol') return go('mercado-futebol');
  if(k==='mercado-pontos') return go('mercado-pontos');
  S.sport=k; store.set('sport',k);
  go(['calendario','resultados','estatisticas'].includes(S.view)?S.view:'inicio');
}));

export { V, go, syncTabs };
