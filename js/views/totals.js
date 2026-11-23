// Basquete Gouveia Play — views/totals.js
import { V } from '../router.js';
import { getGames } from '../services/espn.js';
import { S } from '../state.js';
import { bindGames, bindSportLeague, errBox, leagueSelect, remember, skel, sportSelect } from '../ui/components.js';
import { ic, paintIcons } from '../ui/icons.js';
import { addDays, esc, fmtDay, fmtTime, isoLocal, ymd } from '../utils.js';
import { marketTiles, probBar, rng } from '../views/game.js?v=20261124a';

/* =========================================================
   TOTAIS
   ========================================================= */
async function renderTotals(){
  const sk=S.sport, lg=S.league[sk];
  const d=S.totDate||addDays(new Date(),-1); const span=S.totDays||1;
  V.innerHTML=`<div class="card glow"><div class="ch">${ic('bars')}<h3>Totais e linhas Over/Under</h3><span class="sp"></span></div>
    <div class="row" style="margin-bottom:12px">${sportSelect()}${leagueSelect(sk)}<button class="iconbtn" id="pd">${ic('left')}</button><input type="date" class="sel" id="td" value="${isoLocal(d)}"><button class="iconbtn" id="nd">${ic('right')}</button>
      <select class="sel" id="tdays">${[[1,'Somente o dia'],[3,'Últimos 3 dias'],[7,'Últimos 7 dias'],[15,'Últimos 15 dias'],[30,'Últimos 30 dias']].map(([v,t])=>`<option value="${v}" ${span==v?'selected':''}>${t}</option>`).join('')}</select></div>
    <div id="tt">${skel(5)}</div></div>`;
  paintIcons(V);
  bindSportLeague(V, renderTotals);
  V.querySelector('#pd').onclick=()=>{ S.totDate=addDays(d,-span); renderTotals(); };
  V.querySelector('#nd').onclick=()=>{ S.totDate=addDays(d,span); renderTotals(); };
  V.querySelector('#tdays').onchange=e=>{ S.totDays=+e.target.value; renderTotals(); };
  V.querySelector('#td').onchange=e=>{ const [a,b,c]=e.target.value.split('-').map(Number); if(a){ S.totDate=new Date(a,b-1,c); renderTotals(); } };
  const el=document.getElementById('tt');
  let list; try{ list=await getGames(sk,lg,addDays(d,-(span-1)),d); }catch(e){ el.innerHTML=errBox(e); return; }
  remember(list);
  if(!list.length){ el.innerHTML='<div class="empty">Sem partidas nesta data.</div>'; return; }
  const perLab = i => sk==='nba'?(i<4?`Q${i+1}`:'OT'):sk==='futebol'?`${i+1}ºT`:`S${i+1}`;
  const tot=m=> sk==='tenis' ? m.home.lines.reduce((s,l)=>s+(l.v||0),0)+m.away.lines.reduce((s,l)=>s+(l.v||0),0) : (m.home.score||0)+(m.away.score||0);
  const done=list.filter(m=>m.state!=='pre');
  const avg = done.length? (done.reduce((s,m)=>s+tot(m),0)/done.length).toFixed(1):'-';
  let h=marketTiles([['Partidas',list.length],['Encerradas',list.filter(m=>m.completed).length],[sk==='tenis'?'Média de games':sk==='nba'?'Média de pontos':'Média de gols',avg],
    ['Maior total',done.length?Math.max(...done.map(tot)):'-'],['Menor total',done.length?Math.min(...done.map(tot)):'-']]);
  const fin=list.filter(m=>m.completed), tv=fin.map(tot);
  const LINES = sk==='futebol'?rng(0.5,5.5): sk==='tenis'?rng(18.5,24.5): (()=>{ const a=tv.length?Math.round(tv.reduce((x,y)=>x+y,0)/tv.length/5)*5+0.5:225.5; return rng(a-15,a+15,5); })();
  if(fin.length){
    h+=`<div class="section"><h4>${ic('list')}% de jogos que bateram cada linha (${fin.length} encerrados)</h4><div class="ou">${LINES.map(l=>{ const k=tv.filter(v=>v>l).length, p=Math.round(k/tv.length*100); return `<div class="${p>=50?'y':'n'}">Over ${l}<small>${p}% · ${k}/${tv.length}</small></div>`; }).join('')}${sk==='futebol'?(()=>{ const k=fin.filter(m=>m.home.score>0&&m.away.score>0).length, p=Math.round(k/fin.length*100); return `<div class="${p>=50?'y':'n'}">Ambas marcam<small>${p}% · ${k}/${fin.length}</small></div>`; })():''}</div></div>`;
  }
  const withFav=fin.filter(m=>m.odds&&m.odds.fav);
  if(withFav.length){
    const res=withFav.map(m=>{ const f=m.odds.fav==='home'?m.home:m.away, d=f===m.home?m.away:m.home; return f.score>d.score?'W':f.score<d.score?'L':'D'; });
    const W=res.filter(r=>r==='W').length, Lz=res.filter(r=>r==='L').length, D=res.filter(r=>r==='D').length;
    const atsL=withFav.filter(m=>m.odds.spread!=null), cov=atsL.filter(m=>{ const r=(m.home.score-m.away.score)+m.odds.spread; return m.odds.fav==='home'?r>0:r<0; }).length;
    // gráfico por dia
    const byDay=new Map(); withFav.forEach((m,i)=>{ const k=ymd(m.date); const x=byDay.get(k)||{d:m.date,w:0,n:0}; x.n++; if(res[i]==='W') x.w++; byDay.set(k,x); });
    const days=[...byDay.values()].sort((a,b)=>a.d-b.d);
    h+=`<div class="section"><h4>${ic('trophy')}Vitória do favorito (${withFav.length} jogos com odds)</h4>${marketTiles([
      ['Favorito venceu',Math.round(W/withFav.length*100)+'%',`${W} de ${withFav.length}`],['Zebras',Lz,Math.round(Lz/withFav.length*100)+'%'],
      ...(sk==='futebol'?[['Empates',D]]:[]),
      ...(atsL.length?[['Favorito cobriu handicap',Math.round(cov/atsL.length*100)+'%',`${cov} de ${atsL.length}`]]:[])])}
      ${probBar([['Favorito venceu',W],...(D?[['Empate',D]]:[]),['Zebra',Lz]])}
      ${days.length>1?`<div class="mut" style="margin-top:12px">% de vitórias do favorito por dia</div><div style="display:flex;align-items:flex-end;gap:6px;height:130px;margin-top:6px;border-bottom:1px solid var(--line)">${days.map(x=>{ const p=Math.round(x.w/x.n*100); return `<div title="${fmtDay(x.d)}: ${x.w}/${x.n}" style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px"><span style="font-size:11px;font-weight:700">${p}%</span><div style="width:100%;height:${p}px;border-radius:6px 6px 2px 2px;background:${p>=50?'var(--acc)':'#64748b'}"></div></div>`; }).join('')}</div><div style="display:flex;gap:6px">${days.map(x=>`<span class="dim" style="flex:1;text-align:center;font-size:10px">${x.d.getDate()}/${x.d.getMonth()+1}</span>`).join('')}</div>`:''}
    </div>`;
  } else if(fin.length){
    h+=`<div class="dim" style="font-size:13px;margin-top:10px">A fonte não publicou odds para estas partidas, então não há como calcular o favorito.</div>`;
  }
  const COLS = sk==='futebol'?[0.5,1.5,2.5,3.5,4.5,5.5]:[];
  h+=`<div class="tw" style="margin-top:12px"><table><thead><tr><th>Partida</th><th>Placar</th><th>${sk==='tenis'?'Games':'Total'}</th>${sk==='futebol'?'<th>O 0.5 HT</th>':''}${COLS.map(l=>`<th>O ${l} FT</th>`).join('')}${sk==='futebol'?'<th>Ambas</th>':''}${sk==='nba'?'<th>Pontos casa</th><th>Pontos fora</th><th>Linha</th><th>O/U</th>':''}<th>Favorito</th><th>Parciais (total)</th></tr></thead><tbody>
  ${list.map(m=>{ const t=tot(m); const ou=m.odds?.ou; const n=Math.max(m.home.lines.length,m.away.lines.length);
    const parts=Array.from({length:n},(_,i)=>`${perLab(i)}: ${(m.home.lines[i]?.v||0)+(m.away.lines[i]?.v||0)}`).join(' · ');
    const ht=(m.home.lines[0]?.v||0)+(m.away.lines[0]?.v||0);
    return `<tr data-gid="${esc(m.id)}" style="cursor:pointer"><td>${span>1?`<span class="dim">${fmtDay(m.date)}</span> `:''}<b>${esc(m.home.short)}</b> × <b>${esc(m.away.short)}</b></td><td>${m.state==='pre'?fmtTime(m.date):`${m.home.score}–${m.away.score}`}</td><td class="hi">${m.state==='pre'?'-':t}</td>${sk==='futebol'?`<td>${m.completed?(ht>0?'<span class="hit y">✓</span>':'<span class="hit n">✗</span>'):'-'}</td>`:''}${COLS.map(l=>`<td>${m.completed?(t>l?'<span class="hit y">✓</span>':'<span class="hit n">✗</span>'):'-'}</td>`).join('')}${sk==='futebol'?`<td>${m.completed?(m.home.score>0&&m.away.score>0?'<span class="hit y">Sim</span>':'<span class="hit n">Não</span>'):'-'}</td>`:''}${sk==='nba'?`<td>${m.state==='pre'?'-':m.home.score??'-'}</td><td>${m.state==='pre'?'-':m.away.score??'-'}</td><td>${ou??'-'}</td><td>${ou!=null&&m.completed?`<span class="tag ${t>ou?'ok':'bad'}">${t>ou?'OVER':t<ou?'UNDER':'PUSH'}</span>`:'-'}</td>`:''}<td>${(()=>{ const o=m.odds; if(!o||!o.fav) return '-'; const f=o.fav==='home'?m.home:m.away, d=f===m.home?m.away:m.home; return esc(f.short)+(m.completed?(f.score>d.score?' <span class="hit y">✓</span>':f.score<d.score?' <span class="hit n">✓</span>':' ='):''); })()}</td><td class="mut" style="text-align:left">${parts||'-'}</td></tr>`; }).join('')}
  </tbody></table></div><div class="dim" style="font-size:12px;margin-top:6px">Futebol: O 0.5 HT e linhas FT de 0.5 a 5.5. Basquete: pontos de cada equipe, total e linha Over/Under publicada pela fonte. Toque numa partida para ver todos os mercados.</div>`;
  el.innerHTML=h; bindGames(el);
}

export { renderTotals };
