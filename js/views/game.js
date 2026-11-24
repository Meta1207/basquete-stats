// Basquete Gouveia Play — views/game.js
import { SPORTS } from '../config.js';
import { V } from '../router.js';
import { api, base, getGames, getSummary, implied, memo, parseOdds } from '../services/espn.js';
import { S } from '../state.js';
import { GAMECACHE, bindGames, errBox, gamesList, img, skel } from '../ui/components.js';
import { ic, paintIcons } from '../ui/icons.js';
import { MESC, addDays, esc, fmtDT, fmtDay, fmtTime, num } from '../utils.js';
import { getTeamSchedule } from '../views/results.js';
import { getGouveiaPrediction } from '../services/gouveia-model.js?v=20261124b';
import { getGouveiaPlayerProjections } from '../services/gouveia-player-model.js?v=20261124a';

/* =========================================================
   DETALHE DO JOGO — todos os mercados
   ========================================================= */
const modal=document.getElementById('modal'), sheet=document.getElementById('sheet');
modal.addEventListener('click',e=>{ if(e.target===modal) closeModal(); });
let modalTimer=null;
function closeModal(){ clearInterval(modalTimer); modal.classList.remove('on'); document.body.style.overflow=''; }
async function pregameMarketsSection(m,sum){
  if(m.state!=='pre') return '';
  const pc=sum?.pickcenter?.[0];
  const odds=m.odds&&(m.odds.hML!=null||m.odds.fav||m.odds.ou!=null||m.odds.spread!=null)?m.odds:(pc?parseOdds(pc,m.home,m.away):m.odds);
  const espnPred=sum?.predictor;
  const espnHome=num(espnPred?.homeTeam?.gameProjection),espnAway=num(espnPred?.awayTeam?.gameProjection);
  const pHome=odds?implied(odds.hML):null,pAway=odds?implied(odds.aML):null,pDraw=odds?implied(odds.dML):null;
  const oddsFav=odds?.fav==='home'?m.home:odds?.fav==='away'?m.away:(pHome!=null&&pAway!=null?(pHome>pAway?m.home:pAway>pHome?m.away:null):null);
  const hasOdds=!!(odds&&(odds.hML!=null||odds.aML!=null||odds.spread!=null||odds.ou!=null||odds.dML!=null));
  const hasEspnProjection=espnHome!=null&&espnAway!=null;
  const pct=(v)=>v==null?'—':Math.round(v*100)+'%';
  let model={available:false,reason:'Motor próprio disponível nesta etapa apenas para a NBA.'};
  if(m.sk==='nba'){
    try{ model=await getGouveiaPrediction(m); }catch(e){ model={available:false,reason:'Não foi possível calcular a previsão independente.'}; }
  }
  const ownUnavailable=model.reason||'Histórico insuficiente para gerar uma previsão responsável.';
  let playerModel={available:false,reason:'Projeções individuais indisponíveis.'};
  if(m.sk==='nba'){
    try{ playerModel=await getGouveiaPlayerProjections(m); }
    catch(e){ playerModel={available:false,reason:'Não foi possível calcular as projeções individuais.'}; }
  }
  const favoriteTeam=model.available?(model.favorite==='home'?m.home:m.away):null;
  const favoriteProbability=model.available?(model.favorite==='home'?model.home.winProbability:model.away.winProbability):null;
  const marginText=model.available?(model.projectedMargin>=0?m.home.short+' por '+Math.abs(model.projectedMargin):m.away.short+' por '+Math.abs(model.projectedMargin)):'Análise indisponível';
  const ownRows=model.available?[
    [favoriteTeam.short+' · '+pct(favoriteProbability/100),'Equipe com maior probabilidade estimada pelo motor Gouveia'],
    [marginText,'Margem projetada; não é linha de aposta'],
    ['Total projetado '+model.projectedTotal,'Soma dos pontos estimados das duas equipes'],
    [m.home.short+' '+model.home.points+' · '+m.away.short+' '+model.away.points,'Placar estimado pelo motor Gouveia']
  ]:[null,null,null,null].map(()=>['Análise indisponível',ownUnavailable]);
  const marketRows=[
    ['Vencedor / moneyline',ownRows[0][0],ownRows[0][1],oddsFav?oddsFav.short:'Sem odds publicadas',odds?.hML!=null||odds?.aML!=null?m.home.short+' '+pct(pHome)+' · '+m.away.short+' '+pct(pAway):''],
    ['Handicap / spread',ownRows[1][0],ownRows[1][1],odds?.spread!=null?m.home.short+' '+(odds.spread>0?'+':'')+odds.spread:'Não disponibilizado pela ESPN',odds?.spread!=null?'Linha publicada pela ESPN':'Sem linha para comparar'],
    ['Total de pontos',ownRows[2][0],ownRows[2][1],odds?.ou!=null?'Linha '+odds.ou:'Não disponibilizado pela ESPN',odds?.ou!=null?'Over / Under':'Sem linha para comparar'],
    ['Projeção de pontos',ownRows[3][0],ownRows[3][1],hasEspnProjection?m.home.short+' '+espnHome+' · '+m.away.short+' '+espnAway:'Não disponibilizada','Projeção estatística da ESPN']
  ];
  const cards=marketRows.map(([name,ownValue,ownNote,sourceValue,sourceNote])=>'<div class="pregame-market-card"><h5>'+esc(name)+'</h5><div class="pregame-compare-grid"><div class="pregame-side own"><small>IA GOUVEIA</small><b>'+esc(String(ownValue))+'</b><span>'+esc(ownNote)+'</span></div><div class="pregame-side espn"><small>ESPN</small><b>'+esc(String(sourceValue))+'</b><span>'+esc(sourceNote||'Dado publicado pela fonte')+'</span></div></div></div>').join('');
  const modelStatus=model.available
    ? '<span class="pregame-status agree">Motor Gouveia calculou uma previsão independente</span>'
    : '<span class="pregame-status">IA Gouveia: '+esc(ownUnavailable)+'</span>';
  const modelDetails=model.available
    ? '<div class="pregame-disclaimer"><b>Confiança do modelo:</b> '+esc(model.confidence?.label||'Não calculada')+' ('+(model.confidence?.score??'—')+'/100). '+esc(model.confidence?.reason||'')+'<br><b>Base da análise:</b> últimos '+model.sample.home+' jogos de '+esc(m.home.short)+' e '+model.sample.away+' de '+esc(m.away.short)+'. '+esc(model.method)+'<br><b>Fatores:</b> '+esc((model.signals||[]).join(' · '))+'<br>'+esc(model.caveat)+'</div>'
    : '<p class="pregame-disclaimer">'+esc(ownUnavailable)+' A ESPN aparece apenas como referência externa; seus dados não entram no cálculo do motor Gouveia.</p>';
  const playerSection=playerModel.available
    ? '<div class="gouveia-player-block"><h5>Projeções individuais · jogadores NBA</h5>'+playerModel.teams.map(team=>'<div class="grp">'+esc(team.name)+'</div>'+(team.players.length?'<div class="tw"><table><thead><tr><th>Jogador</th><th>MIN</th><th>PTS</th><th>REB</th><th>AST</th><th>3PM</th><th>PRA</th></tr></thead><tbody>'+team.players.slice(0,6).map(p=>'<tr><td><b>'+esc(p.name)+'</b>'+(p.position?' <span class="dim">'+esc(p.position)+'</span>':'')+'</td><td>'+p.projected.min+'</td><td>'+p.projected.pts+'</td><td>'+p.projected.reb+'</td><td>'+p.projected.ast+'</td><td>'+p.projected.three+'</td><td class="hi">'+p.pra+'</td></tr>').join('')+'</tbody></table></div>':'<div class="dim">Sem histórico individual suficiente para esta equipe.</div>')).join('')+'<p class="pregame-disclaimer">'+esc(playerModel.note)+'</p></div>'
    : '<div class="gouveia-player-block"><h5>Projeções individuais</h5><p class="pregame-disclaimer">'+esc(playerModel.reason||'Dados individuais insuficientes.')+'</p></div>';
  return '<div class="section pregame-ai-section"><div class="pregame-ai-head"><div><h4>'+ic('brain')+'Análise pré-jogo · Gouveia × ESPN</h4><p>Previsão estatística independente para NBA</p></div><span class="pregame-tag">PRÉ-JOGO</span></div>'+modelStatus+'<div class="pregame-legend"><span>MODELO GOUVEIA</span><span>REFERÊNCIA ESPN</span></div><div class="pregame-market-list">'+cards+'</div>'+modelDetails+playerSection+'</div>';
}
async function openGame(m, keepScroll=false){
  clearInterval(modalTimer);
  const prevScroll = keepScroll ? sheet.scrollTop : 0;
  modal.classList.add('on'); document.body.style.overflow='hidden';
  if(m.state==='in' || (m.state==='pre' && m.date-Date.now()<20*60000)){
    modalTimer=setInterval(async()=>{
      if(!modal.classList.contains('on')) return clearInterval(modalTimer);
      const t=new Date(); const fresh=await getGames(m.sk,m.lg,addDays(t,-1),t,true).catch(()=>[]);
      const nu=fresh.find(x=>String(x.id)===String(m.id)); if(!nu) return;
      GAMECACHE.set(String(nu.id),nu); memo.forEach((v,k)=>{ if(k.includes('summary')&&k.includes(String(nu.eventId))) memo.delete(k); });
      openGame(nu,true);
    },30000);
  }
  const head = `<div class="sh"><span class="tag ${m.state==='in'?'live':''}">${esc(m.state==='in'?'AO VIVO · '+m.detail:m.completed?'ENCERRADO':'AGENDADO')}</span><span class="mut" style="font-size:14px">${esc(fmtDT(m.date))}${m.state==='in'?' · atualiza a cada 30s':''}</span><span style="flex:1"></span><button class="iconbtn" id="mx">${ic('close')}</button></div>
  <div class="score-hero">
    <div>${img(m.home.logo)}<div class="nm">${esc(m.home.name)}</div>${m.home.record?`<div class="dim" style="font-size:13px">${esc(m.home.record)}</div>`:''}</div>
    <div><div class="big">${m.state==='pre'?'<span style="font-size:28px">'+fmtTime(m.date)+'</span>':`<span class="${m.home.winner?'acc':''}">${m.home.score??'-'}</span> – <span class="${m.away.winner?'acc':''}">${m.away.score??'-'}</span>`}</div>
      <div class="mut" style="font-size:13px;margin-top:6px">${esc([m.tournament,m.round||m.note,m.venue].filter(Boolean).join(' · '))}</div></div>
    <div>${img(m.away.logo)}<div class="nm">${esc(m.away.name)}</div>${m.away.record?`<div class="dim" style="font-size:13px">${esc(m.away.record)}</div>`:''}</div>
  </div>`;
  sheet.innerHTML = head + `<div id="gd">${skel(6)}</div>`;
  paintIcons(sheet);
  sheet.querySelector('#mx').onclick=closeModal;
  sheet.querySelector('.score-hero').querySelectorAll('img').forEach(i=>{i.style.width='64px';i.style.height='64px';});
  const gd=sheet.querySelector('#gd');
  let sum=null;
  try{ sum = await getSummary(m); }catch(e){ /* tênis e alguns torneios não têm summary */ }
  let h = periodTable(m, sum);
  if(m.sk==='nba') h += pointByPointSection(m,sum);
  if(m.sk==='nba') h += nbaVisualCharts(m,sum);
  h += favSection(m, sum);
  h += await pregameMarketsSection(m,sum);
  if(m.sk!=='nba') h += favoriteWinnerCard(m,sum);
  if(m.sk==='nba') { h += await nbaAvailabilitySection(m,sum); h += nbaDetail(m,sum); h += nbaLiveAnalysisSection(m,sum); h += await raceXSection(m); }
  else if(m.sk==='futebol') h += soccerDetail(m,sum);
  else h += tennisDetail(m,sum);
  h += h2hSection(m,sum);
  gd.innerHTML = h || `<div class="empty">Detalhes indisponíveis para esta partida.</div>`;
  if(keepScroll) sheet.scrollTop=prevScroll;
  paintIcons(gd);
  bindTables(gd);
  bindWinProbability(gd);
  bindPointByPoint(gd);
  gd.querySelectorAll('[data-h2h]').forEach(b=>b.addEventListener('click',()=>loadH2H(m,b)));
  gd.querySelectorAll('[data-th2h]').forEach(b=>b.addEventListener('click',()=>loadTennisH2H(m,b)));
}
function periodTable(m,sum){
  let H=m.home.lines, A=m.away.lines;
  const comp = sum?.header?.competitions?.[0];
  if(comp){
    const cs=comp.competitors||[];
    const ch=cs.find(c=>String(c.id||c.team?.id)===String(m.home.id))||cs.find(c=>c.homeAway==='home');
    const ca=cs.find(c=>String(c.id||c.team?.id)===String(m.away.id))||cs.find(c=>c.homeAway==='away');
    if(ch?.linescores?.length>=H.length) H=ch.linescores.map(l=>({v:num(l.displayValue??l.value)}));
    if(ca?.linescores?.length>=A.length) A=ca.linescores.map(l=>({v:num(l.displayValue??l.value)}));
  }
  const n=Math.max(H.length,A.length); if(!n) return '';
  const cfg=SPORTS[m.sk];
  const lab = i => m.sk==='nba' ? (i<4?`${i+1}º Q`:`OT${i>4?i-3:''}`) : m.sk==='futebol' ? (i<2?`${i+1}º T`:i<4?`Prorr. ${i-1}`:'Pên.') : `Set ${i+1}`;
  const cell = (l,o) => l==null||l.v==null?'-':`<span class="${o&&o.v!=null&&l.v>o.v?'acc':''}" style="font-weight:700">${l.v}${l.tb!=null?`<sup>${l.tb}</sup>`:''}</span>`;
  let rows=`<tr><th>${m.sk==='tenis'?'Jogador':'Equipe'}</th>${Array.from({length:n},(_,i)=>`<th>${lab(i)}</th>`).join('')}<th>Total</th></tr>`;
  const tot = L => m.sk==='tenis' ? L.reduce((s,l)=>s+(l.v||0),0)+' g' : (L.reduce((s,l)=>s+(l.v||0),0));
  rows+=`<tr><td><b>${esc(m.home.short)}</b></td>${Array.from({length:n},(_,i)=>`<td>${cell(H[i],A[i])}</td>`).join('')}<td><b>${m.sk==='tenis'?tot(H):(m.home.score??tot(H))}</b></td></tr>`;
  rows+=`<tr><td><b>${esc(m.away.short)}</b></td>${Array.from({length:n},(_,i)=>`<td>${cell(A[i],H[i])}</td>`).join('')}<td><b>${m.sk==='tenis'?tot(A):(m.away.score??tot(A))}</b></td></tr>`;
  rows+=`<tr><td class="mut">Total</td>${Array.from({length:n},(_,i)=>`<td class="mut">${(H[i]?.v??0)+(A[i]?.v??0)}</td>`).join('')}<td class="hi">${m.sk==='tenis'?(tot(H).replace(' g','')*1+tot(A).replace(' g','')*1)+' games':(m.home.score??0)+(m.away.score??0)}</td></tr>`;
  return `<div class="section"><h4>${ic('list')}Placar por ${cfg.periodName.toLowerCase()}</h4><div class="tw"><table>${rows}</table></div></div>`;
}
function pointByPointSection(m,sum){
  if(m.sk!=='nba') return '';
  const plays=Array.isArray(sum?.plays)?sum.plays:[];
  const rows=plays
    .filter(p=>p?.scoringPlay===true)
    .map(p=>{
      const hs=num(p.homeScore),as=num(p.awayScore),period=num(p.period?.number??p.period);
      if(hs==null||as==null||period==null||period<1) return null;
      const teamId=String(p.team?.id??p.teamId??'');
      const scorer=teamId===String(m.home.id)?'home':teamId===String(m.away.id)?'away':'';
      return {period,hs,as,lead:hs-as,scorer,clock:String(p.clock?.displayValue??p.clock?.value??''),description:String(p.text??p.shortDescription??'')};
    })
    .filter(Boolean)
    .sort((a,b)=>a.period-b.period);
  const quarters=[1,2,3,4];
  const first=rows.length?rows[0].period:1;
  const renderRows=q=>{
    const list=rows.filter(r=>r.period===q);
    if(!list.length) return '<div class="pbp-empty">Nenhuma pontuação registrada neste quarto.</div>';
    return '<div class="pbp-list">'+list.map(r=>{
      const leadTag=r.lead>0?'<span class="pbp-lead home">+'+r.lead+'</span>':r.lead<0?'<span class="pbp-lead away">+'+Math.abs(r.lead)+'</span>':'<span class="pbp-lead tie">EMPATE</span>';
      return '<div class="pbp-row"><span class="pbp-lead-slot">'+(r.lead>0?leadTag:'')+'</span><span class="pbp-score '+(r.scorer==='home'?'home-score':'')+'">'+r.hs+'</span><span class="pbp-dash">–</span><span class="pbp-score '+(r.scorer==='away'?'away-score':'')+'">'+r.as+'</span><span class="pbp-lead-slot">'+(r.lead<0?leadTag:'')+'</span><small class="pbp-clock">'+esc(r.clock)+'</small><span class="pbp-description">'+esc(r.description)+'</span></div>';
    }).join('')+'</div>';
  };
  return '<div class="section pbp-section"><div class="pbp-heading"><div><h4>'+ic('list')+'Ponto a Ponto</h4><p>Placar após cada pontuação · vantagem atual da equipe à frente</p></div><span class="tag">ESPN</span></div><div class="pbp-quarters">'+quarters.map(q=>'<button type="button" class="pbp-quarter '+(q===first?'on':'')+'" data-pbp-quarter="'+q+'">'+q+'º QUARTO</button>').join('')+'</div>'+quarters.map(q=>'<div class="pbp-content" data-pbp-content="'+q+'" '+(q===first?'':'hidden')+'>'+renderRows(q)+'</div>').join('')+'<p class="pbp-note">Sequência baseada exclusivamente nas jogadas pontuadas disponibilizadas pela ESPN. +X representa a diferença do placar naquele momento.</p></div>';
}
function bindPointByPoint(root){
  root.querySelectorAll('.pbp-section').forEach(section=>{
    if(section.dataset.bound==='1') return;
    section.dataset.bound='1';
    section.querySelectorAll('[data-pbp-quarter]').forEach(btn=>btn.addEventListener('click',()=>{
      const quarter=btn.dataset.pbpQuarter;
      section.querySelectorAll('[data-pbp-quarter]').forEach(b=>b.classList.toggle('on',b===btn));
      section.querySelectorAll('[data-pbp-content]').forEach(panel=>{panel.hidden=panel.dataset.pbpContent!==quarter;});
    }));
  });
}
function nbaVisualCharts(m,sum){
  if(m.sk!=='nba') return '';
  const plays=(Array.isArray(sum?.plays)?sum.plays:[]).filter(p=>p?.scoringPlay===true)
    .map(p=>({q:num(p.period?.number),h:num(p.homeScore),a:num(p.awayScore),clock:p.clock?.displayValue||''}))
    .filter(p=>p.q&&p.h!=null&&p.a!=null).sort((a,b)=>a.q-b.q);
  let evolution='<div class="gp-chart-empty">A evolução do placar será exibida quando a ESPN disponibilizar as jogadas pontuadas.</div>';
  if(plays.length){
    const W=620,H=220,L=42,R=14,T=16,B=34, max=Math.max(10,...plays.map(p=>Math.max(p.h,p.a)))*1.08;
    const x=i=>L+(plays.length===1?0:i/(plays.length-1))*(W-L-R), y=v=>T+(H-T-B)*(1-v/max);
    const home=plays.map((p,i)=>x(i).toFixed(1)+','+y(p.h).toFixed(1)).join(' ');
    const away=plays.map((p,i)=>x(i).toFixed(1)+','+y(p.a).toFixed(1)).join(' ');
    const grid=[0,.25,.5,.75,1].map(k=>{const v=max*k,yy=y(v);return '<line x1="'+L+'" y1="'+yy+'" x2="'+(W-R)+'" y2="'+yy+'" class="gp-grid"/><text x="'+(L-8)+'" y="'+(yy+4)+'" text-anchor="end" class="gp-axis">'+Math.round(v)+'</text>';}).join('');
    const qmarks=[1,2,3,4].map(q=>{const ix=plays.findIndex(p=>p.q===q);return ix<0?'':'<text x="'+x(ix)+'" y="'+(H-8)+'" text-anchor="middle" class="gp-axis">'+q+'ºQ</text>';}).join('');
    evolution='<div class="gp-evo-wrap"><svg class="gp-evo" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Evolução do placar por quarto">'+grid+'<polyline points="'+home+'" class="gp-line-home"/><polyline points="'+away+'" class="gp-line-away"/>'+qmarks+'</svg><div class="gp-legend"><span><i class="gp-dot home"></i>'+esc(m.home.short)+'</span><span><i class="gp-dot away"></i>'+esc(m.away.short)+'</span><b>Último placar: '+plays[plays.length-1].h+' × '+plays[plays.length-1].a+'</b></div></div>';
  }
  const groups=sum?.boxscore?.players||[];
  const teams=groups.map(g=>({team:g.team,statistics:(g.statistics||[]).flatMap(s=>s.statistics||[])}));
  const ordered=String(teams[0]?.team?.id)===String(m.home.id)?teams:[teams[1],teams[0]];
  const stats=ordered.length===2?teamStatBars(ordered,[
    'fieldGoalPct','threePointFieldGoalPct','freeThrowPct','totalRebounds','assists','turnovers','steals','blocks','pointsInPaint','fastBreakPoints'
  ]):'';
  const statsHtml=stats?'<div class="gp-stat-bars">'+stats+'</div>':'<div class="gp-chart-empty">Estatísticas comparativas ainda não disponíveis no box score da ESPN.</div>';
  return '<div class="section gp-charts"><div class="gp-chart-head"><div><h4>'+ic('activity')+'Evolução da partida</h4><p>Placar acumulado a cada pontuação registrada</p></div><span class="gp-live-tag">'+(m.state==='in'?'AO VIVO':'ESPN')+'</span></div>'+evolution+'<div class="gp-chart-head gp-stat-head"><div><h4>'+ic('chart-no-axes-combined')+'Estatísticas comparativas</h4><p>Comparação entre as duas equipes</p></div></div>'+statsHtml+'<p class="gp-chart-foot">Gráficos baseados exclusivamente nos dados publicados pela ESPN. Indicadores ausentes não são estimados.</p></div>';
}
function marketTiles(items){ return `<div class="mk">${items.filter(x=>x&&x[1]!=null&&x[1]!=='').map(([l,v,sub])=>`<div class="tile"><small>${esc(l)}</small><b>${esc(v)}</b>${sub?`<div class="dim" style="font-size:12px">${esc(sub)}</div>`:''}</div>`).join('')}</div>`; }
function ouGrid(title, value, lines){
  if(value==null||isNaN(value)) return '';
  return `<div class="oug"><div class="t">${esc(title)} <b>${value}</b></div><div class="ou">${lines.map(l=>{ const o=value>l; return `<div class="${o?'y':'n'}">${o?'Over':'Under'} ${l}<small>${o?'✓ Over bateu':'✓ Under bateu'}</small></div>`; }).join('')}</div></div>`;
}
const rng=(a,b,st=1)=>{ const r=[]; for(let x=a;x<=b+1e-9;x+=st) r.push(+x.toFixed(1)); return r; };
const pctCell=(k,n)=>{ if(!n) return `<td data-v="-1">-</td>`; const p=Math.round(k/n*100); return `<td data-v="${p}"><span class="pct ${p>=70?'hiP':p<=30?'loP':''}">${p}%</span></td>`; };
function teamStatBars(teams, wanted){
  if(!teams||teams.length<2) return '';
  const [a,b]=teams; const get=(t,n)=>(t.statistics||[]).find(s=>s.name===n||s.label===n||s.abbreviation===n);
  let names = wanted || (a.statistics||[]).map(s=>s.name);
  let h='';
  for(const n of names){
    const x=get(a,n), y=get(b,n); if(!x&&!y) continue;
    const vx=num(x?.displayValue), vy=num(y?.displayValue);
    const tot=(vx||0)+(vy||0)||1;
    h+=`<div class="bar"><div class="lbl">${esc(PT[x?.name||n]||x?.label||n)}</div><div class="v">${esc(x?.displayValue??'-')}</div><div class="tr"><div class="a" style="width:${(vx||0)/tot*100}%"></div><div class="b" style="width:${(vy||0)/tot*100}%"></div></div><div class="v r">${esc(y?.displayValue??'-')}</div></div>`;
  }
  return h;
}
const PT = { // tradução de estatísticas ESPN
  fieldGoalsMade:'Arremessos de quadra', 'fieldGoalsMade-fieldGoalsAttempted':'Arremessos (C-T)', fieldGoalPct:'Aproveitamento FG %',
  'threePointFieldGoalsMade-threePointFieldGoalsAttempted':'Bolas de 3 (C-T)', threePointFieldGoalPct:'Aproveitamento 3P %',
  'freeThrowsMade-freeThrowsAttempted':'Lances livres (C-T)', freeThrowPct:'Lance livre %', totalRebounds:'Rebotes', offensiveRebounds:'Rebotes ofensivos',
  defensiveRebounds:'Rebotes defensivos', assists:'Assistências', steals:'Roubos de bola', blocks:'Tocos', turnovers:'Erros (turnovers)', totalTurnovers:'Erros (turnovers)',
  fouls:'Faltas', technicalFouls:'Faltas técnicas', flagrantFouls:'Faltas flagrantes', turnoverPoints:'Pontos após erro', fastBreakPoints:'Pontos de contra-ataque',
  pointsInPaint:'Pontos no garrafão', largestLead:'Maior vantagem', leadChanges:'Trocas de liderança', leadPercentage:'% do tempo na frente',
  foulsCommitted:'Faltas', yellowCards:'Cartões amarelos', redCards:'Cartões vermelhos', offsides:'Impedimentos', wonCorners:'Escanteios', saves:'Defesas do goleiro',
  possessionPct:'Posse de bola %', totalShots:'Finalizações', shotsOnTarget:'Finalizações no gol', shotPct:'Precisão de finalização', penaltyKickGoals:'Gols de pênalti',
  penaltyKickShots:'Pênaltis cobrados', accuratePasses:'Passes certos', totalPasses:'Passes', passPct:'Precisão de passe', accurateCrosses:'Cruzamentos certos',
  totalCrosses:'Cruzamentos', crossPct:'Precisão de cruzamento', totalLongBalls:'Bolas longas', accurateLongBalls:'Bolas longas certas', longballPct:'Precisão bolas longas',
  blockedShots:'Finalizações bloqueadas', effectiveTackles:'Desarmes certos', totalTackles:'Desarmes', tacklePct:'Precisão de desarme', interceptions:'Interceptações',
  effectiveClearance:'Cortes certos', totalClearance:'Cortes'
};

/* --- NBA: escalação e disponibilidade dos jogadores --- */
async function nbaAvailabilitySection(m,sum){
  const teamIds=[String(m.home.id),String(m.away.id)];
  const starters=(sum?.boxscore?.players||[]).map(group=>({teamId:String(group.team?.id||''),players:(group.statistics||[]).flatMap(stat=>(stat.athletes||[]).filter(row=>row.starter===true).map(row=>row.athlete||{}))}));
  const confirmed=starters.filter(group=>group.players.length);
  let injuryGroups=[];let injuryReportAvailable=true;
  const readInjuries=payload=>{const root=payload?.injuries;if(Array.isArray(root))return root;if(Array.isArray(root?.items))return root.items;if(Array.isArray(payload?.teams))return payload.teams;return [];};
  try{injuryGroups=readInjuries(sum);if(!injuryGroups.length){const feed=await api(base('nba','nba')+'/injuries',{}, {ttl:90});injuryGroups=readInjuries(feed);}}catch(e){/* mantém a escalação disponível se o feed falhar */}
  const injuryRows=[];
  for(const group of injuryGroups){const tid=String(group.team?.id||group.id||'');if(!teamIds.includes(tid))continue;for(const item of (group.injuries||group.athletes||[])){const athlete=item.athlete||item;const rawStatus=item.status;const status=String(typeof rawStatus==='object'?(rawStatus?.name||rawStatus?.type||''):rawStatus||'').trim();injuryRows.push({teamId:tid,name:athlete.displayName||athlete.fullName||athlete.shortName||'Jogador',position:athlete.position?.abbreviation||'',status:status||'Status não informado',reason:item.type?.name||item.details||item.longComment||item.shortComment||''});}}
  const unique=new Map();for(const row of injuryRows)unique.set(row.teamId+'-'+row.name,row);const injuries=[...unique.values()];
  const statusGroup=status=>{const s=status.toLowerCase();if(/\bout\b|fora|inactive|suspended|suspenso/.test(s))return 'out';if(/doubtful|improvável/.test(s))return 'doubtful';if(/questionable|day.to.day|game.time.decision|dúvida/.test(s))return 'questionable';return 'other';};
  const label=s=>s==='out'?'FORA':s==='doubtful'?'IMPROVÁVEL':s==='questionable'?'DÚVIDA':'INFORMADO';
  const badge=s=>s==='out'?'bad':s==='doubtful'?'bad':s==='questionable'?'warn':'';
  const renderTeam=side=>{const teamId=String(m[side].id);const group=confirmed.find(x=>x.teamId===teamId);const names=group?.players||[];return '<div class="availability-team"><div class="grp">'+esc(m[side].name)+'</div>'+(names.length?'<div class="availability-list">'+names.map(p=>'<div class="availability-player"><span>'+esc(p.displayName||p.fullName||'Jogador')+'</span><span class="tag ok">TITULAR</span></div>').join('')+'</div>':'<div class="dim" style="font-size:13px">Titulares ainda não confirmados pela ESPN.</div>')+'</div>';};
  const renderInjuries=side=>{const teamId=String(m[side].id);const rows=injuries.filter(x=>x.teamId===teamId);if(!rows.length)return '<div class="dim" style="font-size:13px">'+(injuryReportAvailable?'Nenhum desfalque listado pela ESPN.':'Relatório de lesões indisponível no momento.')+'</div>';return '<div class="availability-list">'+rows.map(row=>{const group=statusGroup(row.status);return '<div class="availability-player"><span><b>'+esc(row.name)+'</b>'+(row.position?' <small class="dim">'+esc(row.position)+'</small>':'')+(row.reason?'<small class="dim availability-reason">'+esc(row.reason)+'</small>':'')+'</span><span class="tag '+badge(group)+'">'+esc(label(group))+'</span></div>';}).join('')+'</div>';};
  const updated=new Date();
  const starterNote=confirmed.length?'Titulares exibidos somente quando a ESPN informa a escalação no box score.':'A ESPN ainda não publicou os titulares. Elenco e projeções não serão apresentados como escalação confirmada.';
  return '<div class="section availability-section"><h4>'+ic('users')+'Escalações e desfalques</h4><div class="availability-subtitle">Titulares confirmados</div><div class="availability-grid">'+renderTeam('home')+renderTeam('away')+'</div><div class="dim availability-note">'+starterNote+'</div><div class="availability-subtitle" style="margin-top:12px">Lesionados e situação para o jogo</div><div class="availability-grid"><div class="availability-team"><div class="grp">'+esc(m.home.short)+'</div>'+renderInjuries('home')+'</div><div class="availability-team"><div class="grp">'+esc(m.away.short)+'</div>'+renderInjuries('away')+'</div></div><div class="dim availability-note">Dados do relatório público da ESPN. “Fora” indica status Out; “Improvável” e “Dúvida” não são tratados como ausência confirmada. Consultado '+updated.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})+'.</div></div>';
}
/* --- NBA: box score com todos os mercados de jogador --- */
function parseNbaPlayers(sum){
  const out=[];
  for(const tp of (sum?.boxscore?.players||[])){
    const st=tp.statistics?.[0]; if(!st) continue;
    const labels=(st.labels||st.names||[]).map(x=>String(x).toUpperCase());
    const idx=k=>labels.indexOf(k);
    for(const a of (st.athletes||[])){
      if(a.didNotPlay || !a.stats || !a.stats.length) continue;
      const g=k=>{ const i=idx(k); return i<0?null:a.stats[i]; };
      const made=s=>s==null?0:num(String(s).split('-')[0])||0;
      const P=num(g('PTS'))||0, R=num(g('REB'))||0, A=num(g('AST'))||0, S_=num(g('STL'))||0, B=num(g('BLK'))||0, T3=made(g('3PT'));
      out.push({ team: tp.team, name:a.athlete?.shortName||a.athlete?.displayName, full:a.athlete?.displayName, id:a.athlete?.id, starter:a.starter,
        MIN:g('MIN')||'-', PTS:P, REB:R, AST:A, '3PM':T3, '3PT':g('3PT')||'-', STL:S_, BLK:B, TO:num(g('TO'))||0, FG:g('FG')||'-', FT:g('FT')||'-',
        PRA:P+R+A, 'P+R':P+R, 'P+A':P+A, 'R+A':R+A, 'S+B':S_+B, '+/-':g('+/-')||'-' });
    }
  }
  return out;
}
const NBA_COLS=['MIN','PTS','REB','AST','3PM','STL','BLK','TO','PRA','P+R','P+A','R+A','S+B','FG','3PT','FT','+/-'];
function nbaDetail(m,sum){
  let h='';
  const tot=(m.home.score||0)+(m.away.score||0);
  if(m.state!=='pre'){
    const H=m.home.lines.map(l=>l.v||0), A=m.away.lines.map(l=>l.v||0);
    const half=(H[0]||0)+(H[1]||0)+(A[0]||0)+(A[1]||0);
    const ou = m.odds?.ou ?? num(sum?.pickcenter?.[0]?.overUnder);
    h+=`<div class="section"><h4>${ic('bars')}Mercados do jogo</h4>${marketTiles([
      ['Total de pontos',tot, ou!=null?`Linha ${ou} · ${tot>ou?'OVER':'UNDER'}`:''],
      ['Diferença (margem)',Math.abs((m.home.score||0)-(m.away.score||0))],
      ['1º tempo (total)',H.length>=2?half:null], ['2º tempo (total)',H.length>=4?tot-half:null],
      ['1º quarto (total)',H.length?(H[0]+A[0]):null],

      [`${m.home.short} pontos`,m.home.score],[`${m.away.short} pontos`,m.away.score],
      ['Prorrogação',H.length>4?'Sim':'Não']
    ])}</div>`;
    if(m.completed){
      const b0 = ou!=null ? ou : Math.round(tot/5)*5+0.5;
      const b1 = Math.round(half/2.5)*2.5+0.5;
      h+=`<div class="section"><h4>${ic('list')}Linhas Over/Under — resultado</h4>
        ${ouGrid('Pontos (total)',tot,rng(b0-15,b0+15,5))}
        ${H.length>=2?ouGrid('Pontos 1º tempo',half,rng(b1-7.5,b1+7.5,5)):''}
        ${H.length?ouGrid('Pontos 1º quarto',H[0]+A[0],rng(Math.round((H[0]+A[0])/5)*5-9.5,Math.round((H[0]+A[0])/5)*5+10.5,5)):''}
        ${ouGrid('Pontos '+m.home.short,m.home.score,rng(Math.round(m.home.score/5)*5-9.5,Math.round(m.home.score/5)*5+10.5,5))}
        ${ouGrid('Pontos '+m.away.short,m.away.score,rng(Math.round(m.away.score/5)*5-9.5,Math.round(m.away.score/5)*5+10.5,5))}
      </div>
      <div class="section"><h4>${ic('swords')}Handicap — resultado</h4>
        ${hcpGrid('Margem '+m.home.short,(m.home.score||0)-(m.away.score||0),rng(-12.5,12.5,2.5).filter(x=>x%1!==0),m.home.short)}
        ${H.length>=2?hcpGrid('Margem 1º tempo '+m.home.short,(H[0]+H[1])-(A[0]+A[1]),rng(-7.5,7.5,2.5).filter(x=>x%1!==0),m.home.short):''}
      </div>`;
    }
  }
  // Exibe o mercado em qualquer fase; odds específicas só quando a fonte as publicar.
  {
    const H=m.home.lines.map(l=>l.v??null), A=m.away.lines.map(l=>l.v??null);
    const halfReady=H.length>=2 && A.length>=2 && H[0]!=null && H[1]!=null && A[0]!=null && A[1]!=null &&
      (m.completed || /halftime|half time|interval|3rd|4th|ot|final|encerrado/i.test(m.detail||''));
    const homeHalf=(H[0]||0)+(H[1]||0), awayHalf=(A[0]||0)+(A[1]||0);
    const halfWinner=halfReady?(homeHalf>awayHalf?m.home.short:awayHalf>homeHalf?m.away.short:'Empate'):null;
    const gameFavorite=m.odds?.fav==='home'?m.home:m.odds?.fav==='away'?m.away:null;
    h+=`<div class="section"><h4>${ic('trophy')}Vencedor do 1º tempo</h4>
      ${marketTiles([
        ['Mercado','Vencedor do 1º tempo',m.state==='pre'?'Pré-jogo':m.state==='in'?'Partida em andamento':'Partida encerrada'],
        ['Favorito indicado',gameFavorite?gameFavorite.short:'Não disponível',gameFavorite?'Favorito do jogo completo; não equivale a uma odd específica do 1º tempo':'A ESPN não indicou favorito para este confronto'],
        ['Odd 1º tempo',null,'Não publicada pela fonte de dados'],
        ['Resultado 1º tempo',halfWinner,halfReady?`Parcial: ${homeHalf} × ${awayHalf}`:'Será exibido quando o 2º quarto terminar']
      ])}
      <div class="dim" style="font-size:12px;margin-top:8px">A indicação de favorito é apenas referência do mercado de jogo completo. Não representa cotação nem garantia para o mercado de 1º tempo.</div>
    </div>`;
  }
  const bt=sum?.boxscore?.teams;
  if(bt&&bt.length===2){
    h+=`<div class="section"><h4>${ic('swords')}Estatísticas das equipes <span class="dim" style="font-weight:500">(${esc(m.home.short)} × ${esc(m.away.short)})</span></h4>`;
    // garante a ordem casa/fora
    const ord = String(bt[0].team?.id)===String(m.home.id)?bt:[bt[1],bt[0]];
    h+=teamStatBars(ord)+`</div>`;
  }
  const pl=parseNbaPlayers(sum);
  if(pl.length){
    h+=`<div class="section"><h4>${ic('user')}Jogadores — todos os mercados</h4>
      <div class="chips" style="margin-bottom:8px"><button class="chip on" data-tf="all">Todos</button><button class="chip" data-tf="${esc(m.home.id)}">${esc(m.home.short)}</button><button class="chip" data-tf="${esc(m.away.id)}">${esc(m.away.short)}</button></div>
      <div class="tw" data-sortable="nba"><table><thead><tr><th>Jogador</th>${NBA_COLS.map(c=>`<th data-k="${c}" class="${c==='PTS'?'on':''}">${c}</th>`).join('')}</tr></thead><tbody>
      ${pl.sort((a,b)=>b.PTS-a.PTS).map(p=>`<tr data-team="${esc(p.team?.id)}"><td>${img(p.team?.logo,'')} <b>${esc(p.name)}</b>${p.starter?'':' <span class="dim">(R)</span>'}</td>${NBA_COLS.map(c=>`<td data-v="${typeof p[c]==='number'?p[c]:-1}" class="${c==='PTS'?'hi':''}">${esc(p[c])}</td>`).join('')}</tr>`).join('')}
      </tbody></table></div><div class="dim" style="font-size:12px;margin-top:6px">PRA = pontos+rebotes+assistências · S+B = roubos+tocos · Toque no cabeçalho para ordenar.</div></div>`;
  } else if(m.completed){
    h+=`<div class="section"><div class="empty">Box score de jogadores ainda não disponível na fonte.</div></div>`;
  }
  // líderes
  const lead=sum?.leaders;
  if(!pl.length && lead?.length){
    h+=`<div class="section"><h4>${ic('trophy')}Líderes</h4>`+lead.map(t=>`<div class="grp">${esc(t.team?.displayName)}</div>`+(t.leaders||[]).map(c=>`<div class="mini"><span class="mut">${esc(c.displayName)}</span><span></span><span class="tm r">${esc(c.leaders?.[0]?.athlete?.displayName)} · <b>${esc(c.leaders?.[0]?.displayValue)}</b></span></div>`).join('')).join('')+`</div>`;
  }
  return h;
}
function favoriteWinnerCard(m,sum){
 const wp=Array.isArray(sum?.winprobability)?sum.winprobability:[];
 const raw=wp.length?num(wp[wp.length-1]?.homeWinPercentage):null;
 const hp=raw==null?null:Math.round(Math.max(0,Math.min(1,raw>1?raw/100:raw))*100),ap=hp==null?null:100-hp;
 const pc=sum?.pickcenter?.[0],odds=m.odds&&(m.odds.hML!=null||m.odds.fav)?m.odds:(pc?parseOdds(pc,m.home,m.away):m.odds);
 const mh=odds?implied(odds.hML):null,ma=odds?implied(odds.aML):null;
 const ph=num(sum?.predictor?.homeTeam?.gameProjection),pa=num(sum?.predictor?.awayTeam?.gameProjection);
 let team=null,pct=null,source='';
 if(m.state==='in'&&hp!=null){team=hp>50?m.home:hp<50?m.away:null;pct=team?(team===m.home?hp:ap):50;source='Probabilidade ao vivo ESPN';}
 else if(m.state==='pre'&&mh!=null&&ma!=null&&mh+ma>0){team=mh>ma?m.home:ma>mh?m.away:null;pct=team?Math.round((team===m.home?mh:ma)/(mh+ma)*100):50;source='Probabilidade implícita das odds';}
 else if(m.state==='pre'&&ph!=null&&pa!=null){team=ph>pa?m.home:pa>ph?m.away:null;pct=team?Math.round(Math.max(ph,pa)/(ph+pa||1)*100):50;source='Projeção pré-jogo ESPN';}
 if(!team)return '<div class="nba-analysis-card"><div class="nba-analysis-title">Favorito para vencer</div><div class="nba-no-data">Dados insuficientes para apontar um favorito com segurança.</div></div>';
 const label=pct>=75?'Favoritismo forte':pct>=60?'Favoritismo moderado':'Favoritismo leve';
 const hd=hp!=null?hp+'%':mh!=null?Math.round(mh/(mh+ma||1)*100)+'%':'—',ad=ap!=null?ap+'%':ma!=null?Math.round(ma/(mh+ma||1)*100)+'%':'—';
 return '<div class="nba-analysis-card nba-winner-card"><div class="nba-analysis-title">Favorito para vencer</div><div class="nba-winner-main"><div><small>MAIOR PROBABILIDADE</small><b>'+esc(team.name)+'</b><span>'+label+'</span></div><strong>'+pct+'%</strong></div><div class="nba-winner-track"><i style="width:'+pct+'%"></i></div><div class="nba-winner-meta"><span>'+esc(m.home.short)+' '+hd+'</span><span>'+esc(m.away.short)+' '+ad+'</span></div><p>'+source+'. Estimativa, não garantia de resultado.</p></div>';
}
function nbaLiveAnalysisSection(m,sum){
  if(m.sk!=='nba') return '';
  const homeId=String(m.home.id),awayId=String(m.away.id);
  const rawPlays=Array.isArray(sum?.plays)?sum.plays:
    Array.isArray(sum?.plays?.items)?sum.plays.items:
    Array.isArray(sum?.plays?.allPlays)?sum.plays.allPlays:
    Array.isArray(sum?.scoringPlays)?sum.scoringPlays:[];
  const teamId=p=>String(p.team?.id||p.teamId||p.competitor?.id||p.team?.uid||'');
  const clock=p=>String(p.clock?.displayValue||p.clock?.value||p.clock||'').trim();
  const period=p=>Number(p.period?.number||p.periodNumber||p.period||0)||null;
  const description=p=>String(p.text||p.description||p.shortDescription||p.type?.text||p.type?.name||p.commentary||p.playText||'').trim();
  let prevH=null,prevA=null,previousLeader=0;
  const events=[];
  for(const p of rawPlays){
    const hs=num(p.homeScore??p.homeTeamScore??p.score?.home);
    const as=num(p.awayScore??p.awayTeamScore??p.score?.away);
    const tid=teamId(p);
    let points=num(p.scoreValue??p.points??p.pointsScored),scoringTeam=tid,leadChange=false;
    if(hs!=null&&as!=null){
      if(prevH!=null&&prevA!=null){
        const dh=hs-prevH,da=as-prevA;
        if(dh>0&&da<=0){points=dh;scoringTeam=homeId;}
        else if(da>0&&dh<=0){points=da;scoringTeam=awayId;}
        else if(dh>0&&da>0){points=null;scoringTeam='';}
        const margin=hs-as;
        if(margin!==0&&previousLeader!==0&&Math.sign(margin)!==previousLeader) leadChange=true;
        if(margin!==0) previousLeader=Math.sign(margin);
      } else if(hs!==as) previousLeader=Math.sign(hs-as);
      prevH=hs;prevA=as;
    }
    const text=description(p);
    const isScoring=points>0||p.scoringPlay===true||/made.*(three|2.?pt|free throw)|three.point.*made|layup.*made|dunk.*made/i.test(text);
    if(!isScoring&&hs==null&&!text) continue;
    const knownTeam=scoringTeam===homeId||scoringTeam===awayId;
    events.push({team:knownTeam?scoringTeam:'',points:knownTeam&&points>0?points:null,hs,as,clock:clock(p),period:period(p),text:text||(isScoring?'Pontuação registrada':'Evento da partida'),scoring:isScoring,leadChange});
  }
  const scoring=events.filter(e=>e.scoring&&e.team&&e.points!=null);
  const recent=scoring.slice(-5),totals={home:0,away:0};
  recent.forEach(e=>{if(e.team===homeId)totals.home+=e.points||0;else if(e.team===awayId)totals.away+=e.points||0;});
  let runTeam='',runPoints=0,runPlays=0;
  for(let i=scoring.length-1;i>=0;i--){
    const e=scoring[i];if(!runTeam)runTeam=e.team;if(e.team!==runTeam)break;
    runPoints+=e.points||0;runPlays++;
  }
  const hasRecent=recent.length>0;
  const currentLead=(m.home.score??0)-(m.away.score??0);
  const leader=currentLead>0?m.home:currentLead<0?m.away:null;
  const wp=Array.isArray(sum?.winprobability)?sum.winprobability:[];
  const lastWp=wp.length?num(wp[wp.length-1]?.homeWinPercentage):null;
  const homePct=lastWp==null?null:Math.round(Math.max(0,Math.min(1,lastWp>1?lastWp/100:lastWp))*100);
  const awayPct=homePct==null?null:100-homePct;
  const periodName=n=>n?(n<=4?`${n}º quarto`:`${n-4}ª prorrogação`):'Período não informado';
  const timeline=events.filter(e=>e.text||e.hs!=null||e.scoring).slice(-7).reverse();
  const eventRows=timeline.map(e=>{
    const team=e.team===homeId?m.home.short:e.team===awayId?m.away.short:'';
    const score=e.hs!=null&&e.as!=null?`${e.hs} × ${e.as}`:'';
    return `<div class="nba-tl-row"><div class="nba-tl-time">${e.clock?esc(e.clock):periodName(e.period)}</div><div class="nba-tl-mark ${e.leadChange?'turn':e.scoring?'score':''}"></div><div class="nba-tl-copy"><div><b>${team?esc(team)+' · ':''}${esc(e.text)}</b><small>${e.leadChange?'VIRADA NO PLACAR':e.period?periodName(e.period):e.scoring?'PONTUAÇÃO':'EVENTO'}</small></div>${score?`<strong>${score}</strong>`:''}</div></div>`;
  }).join('');
  const insight=[];
  if(leader) insight.push(`${esc(leader.short)} está à frente por ${Math.abs(currentLead)} ponto${Math.abs(currentLead)===1?'':'s'} no placar atual.`);
  else if(m.state!=='pre') insight.push('O placar está empatado neste momento.');
  if(hasRecent){
    const recentLeader=totals.home>totals.away?m.home:totals.away>totals.home?m.away:null;
    if(recentLeader) insight.push(`${esc(recentLeader.short)} marcou mais pontos nos últimos ${recent.length} lances pontuados identificados (${totals.home} × ${totals.away}).`);
    else insight.push(`Os últimos ${recent.length} lances pontuados estão equilibrados (${totals.home} × ${totals.away}).`);
    if(runTeam&&runPlays>=2) insight.push(`${esc(runTeam===homeId?m.home.short:m.away.short)} marcou em sequência nos últimos ${runPlays} lances pontuados consecutivos (${runPoints||'pontuação não detalhada'} pontos identificados).`);
  }
  const leadChanges=events.filter(e=>e.leadChange).length;
  if(leadChanges) insight.push(`A linha do tempo registra ${leadChanges} virada${leadChanges===1?'':'s'} de liderança no placar.`);
  if(homePct!=null) insight.push(`Estimativa de vitória da ESPN: ${homePct}% para ${esc(m.home.short)} e ${awayPct}% para ${esc(m.away.short)}.`);
  const totalRecent=totals.home+totals.away;
  const homeWidth=totalRecent?totals.home/totalRecent*100:50,awayWidth=totalRecent?totals.away/totalRecent*100:50;
  const favoriteCard=favoriteWinnerCard(m,sum);
  const momentum=hasRecent?`<div class="nba-momentum-grid">
      <div class="nba-momentum-team"><span>${esc(m.home.short)}</span><b>${totals.home}</b><div class="nba-momentum-track"><i style="width:${homeWidth}%"></i></div></div>
      <div class="nba-momentum-team away"><span>${esc(m.away.short)}</span><b>${totals.away}</b><div class="nba-momentum-track"><i style="width:${awayWidth}%"></i></div></div>
    </div><div class="nba-momentum-note">Pontos identificados nos últimos ${recent.length} lances pontuados disponíveis no feed — não representa uma previsão.</div>
    ${runTeam&&runPlays>=2?`<div class="nba-run"><span>SEQUÊNCIA ATUAL</span><b>${esc(runTeam===homeId?m.home.short:m.away.short)} · ${runPoints||runPlays} pontos em ${runPlays} lances</b></div>`:''}`
    :`<div class="nba-no-data">A fonte ainda não disponibilizou lances pontuados suficientes para calcular o momentum. O painel será preenchido quando esses dados estiverem disponíveis.</div>`;
  const summary=insight.length?`<ul class="nba-insight-list">${insight.map(x=>`<li>${x}</li>`).join('')}</ul>`:`<div class="nba-no-data">Ainda não há dados suficientes para uma leitura automática desta partida.</div>`;
  const timelineHtml=eventRows?`<div class="nba-timeline">${eventRows}</div>`:`<div class="nba-no-data">A linha do tempo de jogadas não foi publicada pela fonte para esta partida.</div>`;
  return `<div class="section nba-live-analysis">
    <div class="nba-analysis-heading"><div><h4>${ic('bars')}Central de análise ao vivo</h4><p>Indicadores calculados somente com os dados disponíveis da ESPN</p></div><span class="nba-analysis-tag">${m.state==='in'?'AO VIVO':m.completed?'PÓS-JOGO':'PRÉ-JOGO'}</span></div>
    ${favoriteCard}
    <div class="nba-analysis-card"><div class="nba-analysis-title">${ic('bars')}Momentum · últimos lances</div>${momentum}</div>
    <div class="nba-analysis-card"><div class="nba-analysis-title">${ic('list')}Leitura automática da partida</div>${summary}</div>
    <div class="nba-analysis-card"><div class="nba-analysis-title">${ic('list')}Linha do tempo · principais registros</div>${timelineHtml}</div>
    <div class="nba-analysis-foot">A leitura é descritiva, não preditiva. Jogadas, placares e probabilidades podem não estar disponíveis em todas as partidas; dados ausentes não são estimados.</div>
  </div>`;
}

/* --- Corrida X: análise da pontuação inicial com base nos últimos jogos --- */
async function raceXSection(m){
  if(m.sk!=='nba') return '';
  const thresholds=[10,15,20];
  const pct=(n,d)=>d?Math.round(n/d*100):null;
  const clockMinutes=play=>{
    const raw=play.clock?.displayValue||play.clock?.value||play.clock||'';
    const mt=String(raw).match(/(\\d{1,2}):(\\d{2})/);
    if(!mt) return null;
    const period=Number(play.period?.number||play.periodNumber||1);
    const remaining=Number(mt[1])+Number(mt[2])/60;
    return Math.max(0,(period-1)*12+(12-remaining));
  };
  const getPlays=sum=>{
    if(Array.isArray(sum?.plays)) return sum.plays;
    if(Array.isArray(sum?.plays?.items)) return sum.plays.items;
    if(Array.isArray(sum?.scoringPlays)) return sum.scoringPlays;
    if(Array.isArray(sum?.plays?.allPlays)) return sum.plays.allPlays;
    return [];
  };
  const inspectGame=(sum,game)=>{
    const plays=getPlays(sum);
    if(!plays.length) return null;
    let homeScore=0, awayScore=0, hasCumulative=false;
    const first={10:null,15:null,20:null}, times={10:null,15:null,20:null};
    for(const p of plays){
      const hs=num(p.homeScore??p.homeTeamScore??p.score?.home);
      const as=num(p.awayScore??p.awayTeamScore??p.score?.away);
      if(hs!=null && as!=null){
        homeScore=hs; awayScore=as; hasCumulative=true;
      } else if(p.scoringPlay || p.scoreValue!=null){
        const tid=String(p.team?.id||p.teamId||p.competitor?.id||'');
        const value=num(p.scoreValue)||0;
        if(tid===String(game.home.id)) homeScore+=value;
        else if(tid===String(game.away.id)) awayScore+=value;
      } else continue;
      for(const n of thresholds){
        if(first[n]===null && homeScore>=n){ first[n]=String(game.home.id); times[n]=clockMinutes(p); }
        if(first[n]===null && awayScore>=n){ first[n]=String(game.away.id); times[n]=clockMinutes(p); }
      }
      if(thresholds.every(n=>first[n]!==null)) break;
    }
    if(!hasCumulative && homeScore===0 && awayScore===0) return null;
    return {first,times};
  };
  try{
    const [homeSchedule,awaySchedule]=await Promise.all([
      getTeamSchedule('nba',m.lg,m.home.id).catch(()=>[]),
      getTeamSchedule('nba',m.lg,m.away.id).catch(()=>[])
    ]);
    const candidates=[...new Map([...homeSchedule,...awaySchedule]
      .filter(g=>g.completed && String(g.id)!==String(m.id))
      .sort((a,b)=>b.date-a.date)
      .map(g=>[String(g.id),g])).values()];
    const forTeam=teamId=>candidates.filter(g=>
      String(g.home.id)===String(teamId)||String(g.away.id)===String(teamId)
    ).slice(0,10);
    const relevant=[...new Map([...forTeam(m.home.id),...forTeam(m.away.id)]
      .map(g=>[String(g.id),g])).values()];
    const summaries=[];
    for(let i=0;i<relevant.length;i+=5){
      const batch=await Promise.all(relevant.slice(i,i+5).map(g=>getSummary(g).then(sum=>({g,sum})).catch(()=>null)));
      summaries.push(...batch.filter(Boolean));
    }
    const records={home:[],away:[]};
    for(const item of summaries){
      const race=inspectGame(item.sum,item.g);
      if(!race) continue;
      for(const side of ['home','away']){
        const teamId=String(m[side].id);
        if(String(item.g.home.id)===teamId || String(item.g.away.id)===teamId){
          const ownSide=String(item.g.home.id)===teamId?'home':'away';
          records[side].push({
            first:thresholds.reduce((o,n)=>{
              const winner=race.first[n];
              o[n]=winner===teamId?1:winner===null?null:0;
              return o;
            },{}),
            times:thresholds.reduce((o,n)=>{
              const winner=race.first[n];
              o[n]=winner===ownSide?race.times[n]:null;
              return o;
            },{})
          });
        }
      }
    }
    const teamStats=side=>thresholds.map(n=>{
      const valid=records[side].filter(r=>r.first[n]!==null);
      const wins=valid.filter(r=>r.first[n]===1).length;
      const times=records[side].map(r=>r.times[n]).filter(v=>v!=null);
      return {n,total:valid.length,wins,pct:pct(wins,valid.length),avgTime:times.length?times.reduce((a,b)=>a+b,0)/times.length:null};
    });
    const H=teamStats('home'), A=teamStats('away');
    const card=(team,stat)=>`<div class="racex-option">
      <div class="racex-team">${img(team.logo)}<b>${esc(team.short)}</b></div>
      <div class="racex-percent">${stat.pct==null?'—':stat.pct+'%'}</div>
      <div class="racex-meta">${stat.total?stat.wins+'/'+stat.total+' jogos':'Sem dados suficientes'}</div>
      <div class="racex-track"><span style="width:${stat.pct??0}%"></span></div>
    </div>`;
    const blocks=thresholds.map((n,i)=>`<div class="racex-market">
      <div class="racex-market-title"><span>Primeiro a ${n} pontos</span><span class="racex-tag">CORRIDA ${n}</span></div>
      <div class="racex-options">${card(m.home,H[i])}${card(m.away,A[i])}</div>
      <div class="racex-insight">${(()=>{
        const h=H[i].pct,a=A[i].pct;
        if(h==null||a==null) return 'Histórico insuficiente para apontar uma tendência.';
        if(Math.abs(h-a)<10) return 'Confronto equilibrado no histórico analisado.';
        return h>a?`Maior frequência histórica: ${esc(m.home.short)}.`:`Maior frequência histórica: ${esc(m.away.short)}.`;
      })()}</div>
    </div>`).join('');
    const allGames=Math.max(...[records.home.length,records.away.length,0]);
    const timeLine=thresholds.map((n,i)=>{
      const ht=H[i].avgTime, at=A[i].avgTime;
      return `<div class="racex-time-row"><span>${n} pontos</span><b>${ht==null?'—':ht.toFixed(1)+' min'}</b><b>${at==null?'—':at.toFixed(1)+' min'}</b></div>`;
    }).join('');
    return `<div class="section racex-section">
      <div class="racex-heading"><div><h4>${ic('zap')}Corrida X · análise estatística</h4><div class="racex-subtitle">Qual equipe costuma alcançar a marca primeiro?</div></div><span class="racex-tag">ANÁLISE</span></div>
      <style>
        .racex-section .racex-subtitle{font-size:12px;color:var(--mut);margin-top:3px}
        .racex-section .racex-tag{font-size:10px;font-weight:800;letter-spacing:.06em;color:var(--acc);background:color-mix(in srgb,var(--acc) 13%,transparent);padding:6px 9px;border-radius:20px;white-space:nowrap}
        .racex-market{border:1px solid var(--line);border-radius:14px;padding:12px;margin-top:10px}
        .racex-market-title{display:flex;align-items:center;justify-content:space-between;font-weight:800;font-size:14px;margin-bottom:10px}
        .racex-options{display:grid;grid-template-columns:1fr 1fr;gap:9px}
        .racex-option{background:var(--surface2,var(--card2));border-radius:11px;padding:10px;min-width:0}
        .racex-team{display:flex;align-items:center;gap:6px;font-size:12px;min-width:0}
        .racex-team img{width:22px;height:22px;object-fit:contain}
        .racex-percent{font-size:23px;font-weight:850;margin-top:7px}
        .racex-meta{font-size:10px;color:var(--mut);margin-top:1px}
        .racex-track{height:5px;background:var(--line);border-radius:8px;overflow:hidden;margin-top:8px}
        .racex-track span{display:block;height:100%;background:var(--acc);border-radius:8px}
        .racex-insight{font-size:11px;color:var(--mut);margin-top:9px}
        .racex-times{border:1px solid var(--line);border-radius:12px;padding:11px;margin-top:12px}
        .racex-time-row{display:grid;grid-template-columns:1.1fr 1fr 1fr;gap:8px;padding:8px 0;border-bottom:1px solid var(--line);font-size:11px}
        .racex-time-row:last-child{border:0}
        .racex-time-row b{text-align:right}
        @media(max-width:380px){.racex-options{grid-template-columns:1fr}}
      </style>
      ${blocks}
      <div class="racex-times">
        <b style="font-size:13px">Tempo médio para alcançar a marca</b>
        <div class="racex-time-row" style="color:var(--mut)"><span>Meta</span><b>${esc(m.home.short)}</b><b>${esc(m.away.short)}</b></div>
        ${timeLine}
      </div>
      <div class="racex-insight" style="margin-top:10px">Base: até 10 partidas recentes por equipe com sequência de pontuação disponível. Amostra efetiva: ${records.home.length} jogos de ${esc(m.home.short)} e ${records.away.length} de ${esc(m.away.short)}. Percentuais consideram somente partidas com dados válidos. Tempo calculado pelo relógio de jogo quando publicado pela fonte.</div>
    </div>`;
  }catch(e){
    return `<div class="section"><h4>${ic('zap')}Corrida X · análise estatística</h4><div class="dim" style="font-size:13px">Não foi possível carregar o histórico de pontuação necessário. Tente novamente mais tarde.</div></div>`;
  }
}

function bindTables(root){
  root.querySelectorAll('[data-sortable]').forEach(tw=>{
    const tb=tw.querySelector('tbody');
    tw.querySelectorAll('th[data-k]').forEach((th,ci)=>th.addEventListener('click',()=>{
      tw.querySelectorAll('th').forEach(x=>x.classList.remove('on')); th.classList.add('on');
      const rows=[...tb.rows].sort((a,b)=>(+b.cells[ci+1].dataset.v)-(+a.cells[ci+1].dataset.v));
      rows.forEach(r=>{ [...r.cells].forEach((c,i)=>c.classList.toggle('hi',i===ci+1)); tb.appendChild(r); });
    }));
  });
  root.querySelectorAll('[data-tf]').forEach(ch=>ch.addEventListener('click',()=>{
    root.querySelectorAll('[data-tf]').forEach(x=>x.classList.toggle('on',x===ch));
    root.querySelectorAll('tr[data-team]').forEach(r=>r.style.display=(ch.dataset.tf==='all'||r.dataset.team===ch.dataset.tf)?'':'none');
  }));
}

/* --- Futebol: gols, escanteios, cartões e demais mercados --- */
function soccerDetail(m,sum){
  let h='';
  const bt=sum?.boxscore?.teams||[];
  const ord = bt.length===2 ? (String(bt[0].team?.id)===String(m.home.id)?bt:[bt[1],bt[0]]) : [];
  const sv=(t,n)=>num((t?.statistics||[]).find(s=>s.name===n)?.displayValue);
  if(m.state!=='pre'){
    const gH=m.home.score||0, gA=m.away.score||0;
    const kev=sum?.keyEvents||sum?.commentary||[];
    const goals1T = (sum?.keyEvents||[]).filter(e=>/goal/i.test(e.type?.type||e.type?.text||'') && !/disallowed|anulado/i.test(e.type?.text||'') && (e.period?.number===1)).length;
    const hasKE = (sum?.keyEvents||[]).length>0;
    const cH=sv(ord[0],'wonCorners'), cA=sv(ord[1],'wonCorners');
    const yH=sv(ord[0],'yellowCards'), yA=sv(ord[1],'yellowCards'), rH=sv(ord[0],'redCards'), rA=sv(ord[1],'redCards');
    const fH=sv(ord[0],'foulsCommitted'), fA=sv(ord[1],'foulsCommitted');
    const sH=sv(ord[0],'totalShots'), sA=sv(ord[1],'totalShots'), oH=sv(ord[0],'shotsOnTarget'), oA=sv(ord[1],'shotsOnTarget');
    const add=(a,b)=>a==null&&b==null?null:(a||0)+(b||0);
    h+=`<div class="section"><h4>${ic('bars')}Mercados da partida</h4>${marketTiles([
      ['Total de gols',gH+gA, (gH+gA)>2.5?'Over 2.5':'Under 2.5'],
      ['Ambas marcam',gH>0&&gA>0?'Sim':'Não'],
      ['Resultado',gH>gA?m.home.short:gA>gH?m.away.short:'Empate'],
      ['Gols 1º tempo',hasKE?goals1T:null], ['Gols 2º tempo',hasKE?(gH+gA-goals1T):null],
      ['Escanteios (total)',add(cH,cA), cH!=null?`${cH} × ${cA}`:''],
      ['Cartões amarelos',add(yH,yA), yH!=null?`${yH} × ${yA}`:''],
      ['Cartões vermelhos',add(rH,rA), rH!=null?`${rH} × ${rA}`:''],
      ['Total de cartões',add(add(yH,yA),add(rH,rA))],
      ['Faltas (total)',add(fH,fA), fH!=null?`${fH} × ${fA}`:''],
      ['Finalizações',add(sH,sA), sH!=null?`${sH} × ${sA}`:''],
      ['Chutes no gol',add(oH,oA), oH!=null?`${oH} × ${oA}`:''],
      ['Impedimentos',add(sv(ord[0],'offsides'),sv(ord[1],'offsides'))]
    ])}</div>`;
    const htGoals=hasKE?goals1T:null;
    const goalMarkets=[
      ['Over 0.5 HT',htGoals,'1º tempo'],
      ['Over 0.5 FT',gH+gA,'tempo integral'],
      ['Over 1.5 FT',gH+gA,'tempo integral'],
      ['Over 2.5 FT',gH+gA,'tempo integral'],
      ['Over 3.5 FT',gH+gA,'tempo integral'],
      ['Over 4.5 FT',gH+gA,'tempo integral'],
      ['Over 5.5 FT',gH+gA,'tempo integral']
    ];
    h+=`<div class="section"><h4>${ic('target')}Mercados de gols</h4>${marketTiles(goalMarkets.map(([label,goals,period])=>{
      const line=Number(label.match(/[0-9.]+/)[0]);
      const value=goals==null?'—':m.completed?(goals>line?'SIM':'NÃO'):'—';
      const detail=goals==null?'Dados do 1º tempo indisponíveis':m.completed?`Resultado · ${goals} gol(s) ${period}`:m.state==='pre'?'Pré-jogo · odds não fornecidas pela fonte':`Parcial: ${goals} gol(s) · resultado em aberto`;
      return [label,value,detail];
    }))}</div>`;
    if(m.completed){
      h+=`<div class="section"><h4>${ic('list')}Linhas Over/Under — resultado</h4>
        ${ouGrid('Gols (total)',gH+gA,rng(0.5,5.5))}
        ${hasKE?ouGrid('Gols 1º tempo',goals1T,rng(0.5,2.5)):''}
        ${hasKE?ouGrid('Gols 2º tempo',gH+gA-goals1T,rng(0.5,2.5)):''}
        ${ouGrid('Gols '+m.home.short,gH,rng(0.5,3.5))}
        ${ouGrid('Gols '+m.away.short,gA,rng(0.5,3.5))}
        ${ouGrid('Escanteios (total)',add(cH,cA),rng(6.5,12.5))}
        ${ouGrid('Escanteios '+m.home.short,cH,rng(2.5,6.5))}
        ${ouGrid('Escanteios '+m.away.short,cA,rng(2.5,6.5))}
        ${ouGrid('Cartões (total)',add(add(yH,yA),add(rH,rA)),rng(1.5,7.5))}
        ${ouGrid('Chutes no gol (total)',add(oH,oA),rng(4.5,10.5))}
      </div>
      <div class="section"><h4>${ic('swords')}Handicap asiático — resultado</h4>
        ${hcpGrid('Saldo '+m.home.short,gH-gA,[-2.5,-1.5,-1,-0.5,0,0.5,1,1.5,2.5],m.home.short)}
        ${hcpGrid('Saldo '+m.away.short,gA-gH,[-2.5,-1.5,-1,-0.5,0,0.5,1,1.5,2.5],m.away.short)}
        ${cH!=null?hcpGrid('Escanteios (saldo) '+m.home.short,cH-cA,[-3.5,-2.5,-1.5,-0.5,0.5,1.5,2.5,3.5],m.home.short):''}
      </div>`;
    }
  }
  if(ord.length===2){
    h+=`<div class="section"><h4>${ic('swords')}Estatísticas completas <span class="dim" style="font-weight:500">(${esc(m.home.short)} × ${esc(m.away.short)})</span></h4>${teamStatBars(ord,['possessionPct','totalShots','shotsOnTarget','wonCorners','foulsCommitted','yellowCards','redCards','offsides','saves','totalPasses','accuratePasses','passPct','totalCrosses','accurateCrosses','totalTackles','effectiveTackles','interceptions','totalClearance','blockedShots','totalLongBalls','penaltyKickGoals'])}</div>`;
  }
  const ke=(sum?.keyEvents||[]).filter(e=>/goal|card|penalty|substitution/i.test(e.type?.type||e.type?.text||'') && !/substitution/i.test(e.type?.type||''));
  if(ke.length){
    h+=`<div class="section"><h4>${ic('list')}Lances principais</h4><div class="games">${ke.map(e=>{
      const t=(e.type?.text||e.type?.type||''); const icn=/goal/i.test(t)?'⚽':/red/i.test(t)?'🟥':/yellow/i.test(t)?'🟨':'•';
      return `<div class="g" style="grid-template-columns:54px 30px 1fr;cursor:default"><div class="d" style="font-size:15px">${esc(e.clock?.displayValue||'')}</div><div>${icn}</div><div><b>${esc(e.participants?.map(p=>p.athlete?.displayName).filter(Boolean).join(', ')||t)}</b> <span class="mut">· ${esc(e.team?.displayName||'')}</span><div class="dim" style="font-size:13px">${esc(e.text||t)}</div></div></div>`; }).join('')}</div></div>`;
  }
  // estatísticas individuais (rosters)
  const rows=[];
  for(const r of (sum?.rosters||[])){
    for(const p of (r.roster||[])){
      const g=n=>num((p.stats||[]).find(s=>s.name===n||s.abbreviation===n)?.value ?? (p.stats||[]).find(s=>s.name===n||s.abbreviation===n)?.displayValue);
      const row={team:r.team, name:p.athlete?.displayName, G:g('totalGoals'), A:g('goalAssists'), SH:g('totalShots'), ST:g('shotsOnTarget'), FC:g('foulsCommitted'), FS:g('foulsSuffered'), YC:g('yellowCards'), RC:g('redCards'), OF:g('offsides'), SV:g('saves')};
      if(['G','A','SH','ST','FC','FS','YC','RC','SV'].some(k=>row[k])) rows.push(row);
    }
  }
  if(rows.length){
    const cols=[['G','Gols'],['A','Assist.'],['SH','Final.'],['ST','No gol'],['FC','Faltas'],['FS','Sofridas'],['YC','🟨'],['RC','🟥'],['OF','Imp.'],['SV','Defesas']];
    h+=`<div class="section"><h4>${ic('user')}Jogadores — mercados individuais</h4><div class="tw" data-sortable="s"><table><thead><tr><th>Jogador</th>${cols.map(([k,l])=>`<th data-k="${k}">${l}</th>`).join('')}</tr></thead><tbody>
    ${rows.sort((a,b)=>(b.G||0)-(a.G||0)||(b.SH||0)-(a.SH||0)).map(p=>`<tr data-team="${esc(p.team?.id)}"><td>${img(p.team?.logo)} <b>${esc(p.name)}</b></td>${cols.map(([k])=>`<td data-v="${p[k]??-1}">${p[k]??'-'}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;
  }
  if(!sum && m.completed) h+=`<div class="section"><div class="empty">Estatísticas detalhadas indisponíveis para esta partida na fonte.</div></div>`;
  return h;
}

/* --- Tênis: sets, games, tiebreaks, aces quando disponíveis --- */
function tennisDetail(m,sum){
  if(m.state==='pre') return `<div class="section"><h4>${ic('swords')}Confronto direto e forma recente</h4><button class="btn ghost sm" data-th2h>Carregar confrontos e últimos jogos (12 meses)</button><div id="th2h"></div></div>`;
  const H=m.home.lines.map(l=>l.v||0), A=m.away.lines.map(l=>l.v||0);
  const gH=H.reduce((a,b)=>a+b,0), gA=A.reduce((a,b)=>a+b,0);
  const isTB=i=>m.home.lines[i]?.tb!=null||m.away.lines[i]?.tb!=null||(H[i]===7&&A[i]===6)||(H[i]===6&&A[i]===7);
  const tbs=H.filter((_,i)=>isTB(i)).length;
  const setW=i=>H[i]>A[i]?m.home.short:A[i]>H[i]?m.away.short:'-';
  let h=`<div class="section"><h4>${ic('bars')}Mercados da partida</h4>${marketTiles([
    ['Vencedor',m.home.winner?m.home.short:m.away.winner?m.away.short:'-'],
    ['Placar em sets',`${m.home.score}–${m.away.score}`],
    ['Total de games',gH+gA], ['Total de sets',H.length],
    [`Games ${m.home.short}`,gH],[`Games ${m.away.short}`,gA],
    ['Handicap de games',`${gH-gA>0?'+':''}${gH-gA}`, m.home.short],
    ['Handicap de sets',`${m.home.score-m.away.score>0?'+':''}${m.home.score-m.away.score}`, m.home.short],
    ['Tie-breaks',tbs],
    ...H.map((_,i)=>[`${i+1}º set`,`${H[i]}–${A[i]}`,`${H[i]+A[i]} games · ${setW(i)}${isTB(i)?' · TB':''}`])
  ])}</div>`;
  if(m.completed){
    h+=`<div class="section"><h4>${ic('list')}Linhas Over/Under — resultado</h4>
    ${ouGrid('Games (total)',gH+gA,rng(17.5,25.5))}
    ${ouGrid('Sets (total)',H.length,[2.5,3.5,4.5])}
    ${H.map((_,i)=>ouGrid(`Games ${i+1}º set`,H[i]+A[i],rng(7.5,12.5))).join('')}
    ${ouGrid('Games '+m.home.short,gH,rng(9.5,14.5))}
    ${ouGrid('Games '+m.away.short,gA,rng(7.5,12.5))}</div>
    <div class="section"><h4>${ic('swords')}Handicap — resultado</h4>
    ${hcpGrid('Handicap de games '+m.home.short,gH-gA,rng(-6.5,6.5,1).filter(x=>x%1!==0),m.home.short)}
    ${hcpGrid('Handicap de sets '+m.home.short,m.home.score-m.away.score,[-1.5,1.5],m.home.short)}
    ${H.map((_,i)=>hcpGrid(`Handicap de games ${i+1}º set`,H[i]-A[i],[-3.5,-2.5,-1.5,1.5,2.5,3.5],m.home.short)).join('')}</div>`;
  }
  const stats = sum?.boxscore?.players || sum?.boxscore?.teams;
  if(stats && stats.length===2 && stats[0].statistics?.length){
    h+=`<div class="section"><h4>${ic('swords')}Estatísticas (aces, duplas faltas, saque)</h4>${teamStatBars(stats)}</div>`;
  } else {
    h+=`<div class="dim" style="font-size:12px;margin-top:8px">Aces e estatísticas de saque não são publicados pela fonte gratuita para esta partida.</div>`;
  }
  h+=`<div class="section"><h4>${ic('swords')}Confronto direto e forma recente</h4><button class="btn ghost sm" data-th2h>Carregar confrontos e últimos jogos (12 meses)</button><div id="th2h"></div></div>`;
  return h;
}
async function loadTennisH2H(m, btn){
  btn.disabled=true; btn.textContent='Buscando 12 meses de partidas…';
  const out=document.getElementById('th2h');
  try{
    const now=new Date(); const months=[];
    for(let i=0;i<12;i++){ const a=new Date(now.getFullYear(),now.getMonth()-i,1), b=new Date(now.getFullYear(),now.getMonth()-i+1,0); months.push([a,b]); }
    const lists=await Promise.all(months.map(([a,b])=>getGames('tenis',m.lg,a,b<now?b:now).catch(()=>[])));
    const all=lists.flat().filter(g=>g.completed); const seen=new Set();
    const uniq=all.filter(g=>!seen.has(g.id)&&seen.add(g.id)).sort((a,b)=>b.date-a.date);
    const isP=(g,p)=>String(g.home.id)===String(p.id)||String(g.away.id)===String(p.id)||g.home.name===p.name||g.away.name===p.name;
    const h2h=uniq.filter(g=>isP(g,m.home)&&isP(g,m.away)&&g.id!==m.id);
    const form=p=>uniq.filter(g=>isP(g,p)).slice(0,10);
    const wins=(list,p)=>list.filter(g=>{ const me=(String(g.home.id)===String(p.id)||g.home.name===p.name)?g.home:g.away; return me.winner || me.score>(me===g.home?g.away:g.home).score; }).length;
    const fH=form(m.home), fA=form(m.away);
    const avgG=l=>l.length?(l.reduce((s,g)=>s+g.home.lines.reduce((a,x)=>a+(x.v||0),0)+g.away.lines.reduce((a,x)=>a+(x.v||0),0),0)/l.length).toFixed(1):'-';
    let h=`${marketTiles([['Confrontos (12m)',h2h.length],[`Vitórias ${m.home.short}`,wins(h2h,m.home)],[`Vitórias ${m.away.short}`,wins(h2h,m.away)],
      [`Forma ${m.home.short}`,fH.length?`${wins(fH,m.home)}-${fH.length-wins(fH,m.home)}`:'-','últimos 10'],[`Forma ${m.away.short}`,fA.length?`${wins(fA,m.away)}-${fA.length-wins(fA,m.away)}`:'-','últimos 10'],
      [`Média games ${m.home.short}`,avgG(fH),'por jogo'],[`Média games ${m.away.short}`,avgG(fA),'por jogo']])}`;
    h+= h2h.length?`<div class="grp">Confrontos diretos</div>${gamesList(h2h)}`:`<div class="empty">Sem confrontos diretos nos últimos 12 meses (${esc(m.lg.toUpperCase())}).</div>`;
    h+=`<div class="two"><div><div class="grp">Últimos jogos · ${esc(m.home.short)}</div>${gamesList(fH)}</div><div><div class="grp">Últimos jogos · ${esc(m.away.short)}</div>${gamesList(fA)}</div></div>`;
    out.innerHTML=h; bindGames(out); btn.remove();
  }catch(e){ out.innerHTML=errBox(e); btn.disabled=false; btn.textContent='Tentar novamente'; }
}

/* --- Favorito: probabilidade, resultado e gráfico --- */
function hcpGrid(title, diff, lines, who){
  if(diff==null||isNaN(diff)) return '';
  return `<div class="oug"><div class="t">${esc(title)} <b>${diff>0?'+':''}${diff}</b></div><div class="ou">${lines.map(l=>{ const r=diff+l; const c=r>0?'y':r<0?'n':''; return `<div class="${c}">${esc(who)} ${l>0?'+':''}${l}<small>${r>0?'✓ cobriu':r<0?'✗ não cobriu':'devolvida'}</small></div>`; }).join('')}</div></div>`;
}
function probBar(items){
  const tot=items.reduce((s,x)=>s+(x[1]||0),0)||1;
  const cols=['var(--acc)','#64748b','#94a3b8'];
  return `<div style="display:flex;height:30px;border-radius:10px;overflow:hidden;margin:6px 0">${items.map((x,i)=>`<div style="width:${x[1]/tot*100}%;background:${cols[i]};display:grid;place-items:center;font-weight:800;font-size:13px;color:${i===0?'#061021':'#fff'};white-space:nowrap;overflow:hidden">${Math.round(x[1]/tot*100)}%</div>`).join('')}</div>
  <div style="display:flex;justify-content:space-between;font-size:13px" class="mut">${items.map(x=>`<span>${esc(x[0])}</span>`).join('')}</div>`;
}

function favSection(m,sum){
  const pc=sum?.pickcenter?.[0];
  const o = m.odds && (m.odds.hML!=null||m.odds.fav) ? m.odds : (pc? parseOdds(pc,m.home,m.away) : m.odds);
  const pred=sum?.predictor;
  const wp=sum?.winprobability;
  let h='';
  if(o && (o.hML!=null || o.fav)){
    let pH=implied(o.hML), pA=implied(o.aML), pD=implied(o.dML);
    const fav=o.fav==='home'?m.home:o.fav==='away'?m.away:null, dog=fav===m.home?m.away:m.home;
    const items=[[m.home.short,pH],...(pD!=null?[['Empate',pD]]:[]),[m.away.short,pA]].filter(x=>x[1]!=null);
    const favWon = m.completed && fav ? ((fav.score||0)>(dog.score||0) || fav.winner) : null;
    const draw = m.completed && m.sk==='futebol' && m.home.score===m.away.score;
    const margin = (m.home.score||0)-(m.away.score||0);
    const ats = m.completed && o.spread!=null ? margin + o.spread : null;
    h+=`<div class="section"><h4>${ic('trophy')}Favorito ${o.provider?`<span class="dim" style="font-weight:500">(odds ${esc(o.provider)})</span>`:''}</h4>
      ${marketTiles([
        ['Favorito', fav?fav.short:'—', o.det||''],
        ['Prob. implícita', fav? Math.round((fav===m.home?pH:pA)/((pH||0)+(pA||0)+(pD||0)||1)*100)+'%':null],
        ['Odds favorito', fav? fmtML(fav===m.home?o.hML:o.aML):null],
        ['Odds zebra', fav? fmtML(fav===m.home?o.aML:o.hML):null],
        ['Resultado', m.completed? (draw?'Empate':favWon?'Favorito venceu':'Zebra'):'Aguardando'],
        ['Handicap (linha)', o.spread!=null?`${m.home.short} ${o.spread>0?'+':''}${o.spread}`:null, ats!=null?(ats>0?`✓ ${m.home.short} cobriu`:ats<0?`✓ ${m.away.short} cobriu`:'devolvida'):'']
      ])}
      ${items.length>=2?`<div style="margin-top:10px" class="mut">Probabilidade implícita nas odds</div>${probBar(items)}`:''}
    </div>`;
  }
  if(pred && (pred.homeTeam||pred.awayTeam)){
    const ph=num(pred.homeTeam?.gameProjection), pa=num(pred.awayTeam?.gameProjection);
    if(ph!=null&&pa!=null) h+=`<div class="section"><h4>${ic('bars')}Projeção ESPN (antes do jogo)</h4>${probBar([[m.home.short,ph],[m.away.short,pa]])}</div>`;
  }
  if(wp && wp.length>3) h+=`<div class="section"><h4>${ic('bars')}Gráfico de probabilidade de vitória</h4>${wpChart(m,wp)}</div>`;
  if(!h && m.state!=='pre') h=`<div class="section"><h4>${ic('trophy')}Favorito</h4><div class="dim" style="font-size:13px">A fonte não publicou odds para esta partida.</div></div>`;
  return h;
}
const fmtML = v => v==null?'-':(v>0?'+':'')+v+` (${(v<0?1+100/-v:1+v/100).toFixed(2)})`;
function wpChart(m,wp){
  const W=720,H=230,pad=12;
  const points=(wp||[]).map((p,i)=>{
    const raw=num(p.homeWinPercentage); if(raw==null) return null;
    const pct=Math.max(0,Math.min(1,raw>1?raw/100:raw));
    const periodRaw=p.period?.number??p.periodNumber??(typeof p.period==='number'?p.period:null);
    const clock=p.clock?.displayValue??p.clock?.value??p.clock??'';
    const period=periodRaw!=null?Number(periodRaw):null;
    const hs=num(p.homeScore??p.homeTeamScore??p.score?.home),as=num(p.awayScore??p.awayTeamScore??p.score?.away);
    return {p:pct,period,clock:String(clock||''),hs,as,label:clock?String(clock):period?`${period}º período`:`Momento ${i+1}`};
  }).filter(Boolean);
  if(points.length<2) return `<div class="empty">A ESPN ainda não disponibilizou pontos suficientes para montar o gráfico de probabilidade.</div>`;
  const x=i=>pad+i/(points.length-1)*(W-pad*2),y=p=>pad+(1-p)*(H-pad*2);
  const path=points.map((p,i)=>(i?'L':'M')+x(i).toFixed(1)+' '+y(p.p).toFixed(1)).join(' ');
  const segments=points.slice(1).map((p,i)=>{const prev=points[i],color=((prev.p+p.p)/2)>=.5?'var(--acc)':'#60a5fa';return `<path d="M ${x(i).toFixed(1)} ${y(prev.p).toFixed(1)} L ${x(i+1).toFixed(1)} ${y(p.p).toFixed(1)}" stroke="${color}" stroke-width="3.5" stroke-linecap="round" fill="none" vector-effect="non-scaling-stroke"/>`;}).join('');
  const last=points[points.length-1].p,max=Math.max(...points.map(p=>p.p)),min=Math.min(...points.map(p=>p.p));
  const flips=points.slice(1).filter((p,i)=>(p.p>=.5)!==(points[i].p>=.5)).length;
  const periods=[...new Set(points.map(p=>p.period).filter(p=>p!=null))].sort((a,b)=>a-b);
  const periodLabel=n=>m.sk==='nba'?`${n}º quarto`:m.sk==='futebol'?`${n}º tempo`:`Período ${n}`;
  const periodButtons=periods.length>1?`<div class="wp-periods"><button class="wp-period on" data-period="all">Jogo todo</button>${periods.map(n=>`<button class="wp-period" data-period="${n}">${periodLabel(n)}</button>`).join('')}</div>`:'';
  const series=encodeURIComponent(JSON.stringify(points)),teamHome=esc(m.home.short),teamAway=esc(m.away.short);
  return `<div class="wp-panel" data-wp-series="${series}" data-wp-home="${teamHome}" data-wp-away="${teamAway}">
    <div class="wp-topline"><span class="wp-live"><i></i>${m.state==='in'?'ACOMPANHAMENTO AO VIVO':m.completed?'ANÁLISE DA PARTIDA':'PRÉ-JOGO'}</span><span class="wp-source">Probabilidade ESPN</span></div>
    <div class="wp-current"><div class="wp-team"><span class="wp-team-name">${teamHome}</span><strong class="wp-home-value">${Math.round(last*100)}%</strong></div><div class="wp-vs">CHANCE DE VITÓRIA</div><div class="wp-team away"><span class="wp-team-name">${teamAway}</span><strong class="wp-away-value">${Math.round((1-last)*100)}%</strong></div></div>
    <div class="wp-legend"><span><i class="home"></i>${teamHome} · mandante</span><span><i class="away"></i>${teamAway} · visitante</span></div>
    ${periodButtons}
    <div class="wp-plot-wrap"><div class="wp-axis"><span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span></div>
      <svg class="wp-plot" viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfico interativo de probabilidade de vitória">
        ${[0,.25,.5,.75,1].map(v=>`<line x1="${pad}" x2="${W-pad}" y1="${y(v)}" y2="${y(v)}" class="${v===.5?'mid':''}"/>`).join('')}
        <path d="${path} L ${x(points.length-1)} ${H-pad} L ${x(0)} ${H-pad} Z" class="wp-area"/>${segments}
        <line class="wp-cursor" id="wpCursorLine" x1="${x(points.length-1)}" x2="${x(points.length-1)}" y1="${pad}" y2="${H-pad}"/>
        <circle class="wp-cursor-dot" id="wpCursorDot" cx="${x(points.length-1)}" cy="${y(last)}" r="6"/>
        <rect class="wp-hitarea" x="${pad}" y="${pad}" width="${W-pad*2}" height="${H-pad*2}"/>
      </svg><div class="wp-axis-labels"><span>Início</span><span>Andamento da partida</span><span>Agora / final</span></div>
    </div>
    <div class="wp-inspector"><div><small>MOMENTO SELECIONADO</small><b class="wp-moment">${esc(points[points.length-1].label)}</b></div><div class="wp-score"><small>PLACAR REGISTRADO</small><b class="wp-score-value">${points[points.length-1].hs!=null&&points[points.length-1].as!=null?points[points.length-1].hs+' × '+points[points.length-1].as:'Não informado'}</b></div><div class="wp-inspector-probs"><span>${teamHome} <b class="wp-home-inspect">${Math.round(last*100)}%</b></span><span>${teamAway} <b class="wp-away-inspect">${Math.round((1-last)*100)}%</b></span></div></div>
    <label class="wp-range-label" for="wpRange"><span>Arraste para explorar a partida</span><span class="wp-range-count">${points.length} registros</span></label>
    <input class="wp-range" id="wpRange" type="range" min="0" max="${points.length-1}" value="${points.length-1}" step="1" aria-label="Selecionar momento da partida"/>
    <div class="wp-summary"><div><small>PICO ${teamHome}</small><b>${Math.round(max*100)}%</b></div><div><small>PICO ${teamAway}</small><b>${Math.round((1-min)*100)}%</b></div><div><small>TROCAS DE FAVORITO</small><b>${flips}</b></div></div>
    <p class="wp-help">Toque em qualquer ponto da linha ou arraste o controle para consultar a probabilidade naquele momento. Os percentuais são estimativas publicadas pela ESPN, não garantias de resultado.</p>
  </div>`;
}
function bindWinProbability(root){
  root.querySelectorAll('.wp-panel').forEach(panel=>{
    if(panel.dataset.bound==='1') return;panel.dataset.bound='1';
    let points=[];try{points=JSON.parse(decodeURIComponent(panel.dataset.wpSeries||''));}catch(e){return;}if(!points.length)return;
    const range=panel.querySelector('#wpRange'),svg=panel.querySelector('.wp-plot'),line=panel.querySelector('#wpCursorLine'),dot=panel.querySelector('#wpCursorDot');
    const update=index=>{
      const i=Math.max(Number(range.min)||0,Math.min(Number(range.max)||points.length-1,Number(index)||0)),p=points[i],pct=Math.round(p.p*100),x=12+i/(points.length-1)*696,y=12+(1-p.p)*206;
      range.value=String(i);
      panel.querySelector('.wp-home-value').textContent=pct+'%';panel.querySelector('.wp-away-value').textContent=(100-pct)+'%';
      panel.querySelector('.wp-home-inspect').textContent=pct+'%';panel.querySelector('.wp-away-inspect').textContent=(100-pct)+'%';
      panel.querySelector('.wp-moment').textContent=p.label||`Momento ${i+1}`;
      panel.querySelector('.wp-score-value').textContent=p.hs!=null&&p.as!=null?`${p.hs} × ${p.as}`:'Não informado';
      line.setAttribute('x1',x);line.setAttribute('x2',x);dot.setAttribute('cx',x);dot.setAttribute('cy',y);dot.classList.toggle('away-lead',p.p<.5);
      range.style.setProperty('--wp-progress',(i/(points.length-1)*100)+'%');
    };
    const setPeriod=period=>{
      const indexes=points.map((p,i)=>period==='all'||String(p.period)===String(period)?i:-1).filter(i=>i>=0);if(!indexes.length)return;
      range.min=String(indexes[0]);range.max=String(indexes[indexes.length-1]);update(indexes[indexes.length-1]);
      panel.querySelectorAll('.wp-period').forEach(b=>b.classList.toggle('on',b.dataset.period===String(period)));
    };
    range.addEventListener('input',()=>update(range.value));
    svg.addEventListener('pointerdown',e=>{const r=svg.getBoundingClientRect(),ratio=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),lo=Number(range.min),hi=Number(range.max);update(Math.round(lo+ratio*(hi-lo)));});
    panel.querySelectorAll('.wp-period').forEach(b=>b.addEventListener('click',()=>setPeriod(b.dataset.period)));
    update(points.length-1);
  });
}
/* --- Histórico de confrontos --- */
function h2hSection(m,sum){
  let h='';
  const ss=sum?.seasonseries;
  if(ss&&ss.length){
    h+=`<div class="section"><h4>${ic('swords')}Confronto na temporada</h4>`+ss.map(s=>`<div class="mut" style="margin-bottom:6px">${esc(s.title||'')} · <b style="color:var(--txt)">${esc(s.summary||'')}</b></div>
      <div class="games">${(s.events||[]).map(ev=>{ const cs=ev.competitors||[]; const a=cs[0]||{}, b=cs[1]||{}; const d=new Date(ev.date);
        return `<div class="g" style="cursor:default"><div class="d">${d.getDate()}<small>${MESC[d.getMonth()]} ${String(d.getFullYear()).slice(2)}</small></div><div class="tm">${img(a.team?.logo)}<span>${esc(a.team?.abbreviation)}</span></div><div class="sc"><span class="${a.winner?'w':'l'}">${esc(a.score??'-')}</span> – <span class="${b.winner?'w':'l'}">${esc(b.score??'-')}</span></div><div class="tm r"><span>${esc(b.team?.abbreviation)}</span>${img(b.team?.logo)}</div><div></div></div>`; }).join('')}</div>`).join('')+`</div>`;
  }
  const hh=sum?.headToHeadGames;
  if(hh&&hh.length){
    h+=`<div class="section"><h4>${ic('swords')}Últimos confrontos diretos</h4>`;
    for(const t of hh.slice(0,1)){
      h+=`<div class="games">${(t.events||[]).slice(0,10).map(ev=>{ const d=new Date(ev.gameDate);
        return `<div class="g" style="cursor:default;grid-template-columns:54px 1fr auto 1fr 28px"><div class="d">${d.getDate()}<small>${MESC[d.getMonth()]} ${String(d.getFullYear()).slice(2)}</small></div><div class="tm"><span>${esc(t.team?.displayName||'')}</span></div><div class="sc">${esc(ev.score||(ev.homeTeamScore!=null?ev.homeTeamScore+' – '+ev.awayTeamScore:'-'))}</div><div class="tm r"><span>${esc(ev.opponent?.displayName||'')}</span>${img(ev.opponentLogo||ev.opponent?.logo)}</div><div class="hit ${ev.gameResult==='V'||ev.gameResult==='W'?'y':ev.gameResult==='D'&&false?'n':''}">${esc(ev.gameResult||'')}</div></div>`; }).join('')}</div>`;
    }
    h+=`</div>`;
  }
  const l5=sum?.lastFiveGames;
  if(l5&&l5.length){
    h+=`<div class="section"><h4>${ic('list')}Últimos 5 jogos de cada equipe</h4><div class="two">`+l5.map(t=>`<div><div class="grp">${esc(t.team?.displayName||'')}</div>${(t.events||[]).map(ev=>{ const d=new Date(ev.gameDate); const r=ev.gameResult; return `<div class="mini" style="cursor:default"><span class="mut">${fmtDay(d)} ${esc(ev.atVs||'')} ${esc(ev.opponent?.abbreviation||ev.opponent?.displayName||'')}</span><span></span><span class="tm r"><b>${esc(ev.score||'')}</b> <span class="hit ${/^[VW]$/.test(r)?'y':/^[DL]$/.test(r)?'n':''}">${esc(r||'')}</span></span></div>`; }).join('')}</div>`).join('')+`</div></div>`;
  }
  if(!h && m.sk!=='tenis' && m.home.id && m.away.id){
    h=`<div class="section"><h4>${ic('swords')}Histórico de confrontos</h4><button class="btn ghost sm" data-h2h>Carregar confrontos das últimas temporadas</button><div id="h2hx"></div></div>`;
  }
  return h;
}
async function loadH2H(m, btn){
  btn.disabled=true; btn.textContent='Carregando…';
  const out=document.getElementById('h2hx');
  try{
    const now=new Date(); const cur = m.sk==='nba'?(now.getMonth()>=8?now.getFullYear()+1:now.getFullYear()):now.getFullYear();
    const seasons=[cur,cur-1,cur-2,cur-3];
    const lists=await Promise.all(seasons.map(s=>getTeamSchedule(m.sk,m.lg,m.home.id,s).catch(()=>[])));
    const games=lists.flat().filter(g=>g.completed && (String(g.home.id)===String(m.away.id)||String(g.away.id)===String(m.away.id))).sort((a,b)=>b.date-a.date);
    const seen=new Set(); const uniq=games.filter(g=>!seen.has(g.id)&&seen.add(g.id));
    let w=0; uniq.forEach(g=>{ const me=String(g.home.id)===String(m.home.id)?g.home:g.away, op=me===g.home?g.away:g.home; if(me.score>op.score) w++; });
    out.innerHTML = uniq.length? `<div class="mut" style="margin:8px 0">${esc(m.home.short)} venceu ${w} de ${uniq.length} confrontos recentes</div>`+gamesList(uniq) : `<div class="empty">Sem confrontos encontrados nas últimas temporadas desta competição.</div>`;
    bindGames(out); btn.remove();
  }catch(e){ out.innerHTML=errBox(e); btn.disabled=false; btn.textContent='Tentar novamente'; }
}

export { NBA_COLS, PT, bindTables, bindWinProbability, closeModal, favSection, fmtML, h2hSection, hcpGrid, loadH2H, loadTennisH2H, marketTiles, modal, modalTimer, nbaDetail, openGame, ouGrid, parseNbaPlayers, pctCell, periodTable, probBar, rng, sheet, soccerDetail, teamStatBars, tennisDetail, wpChart };
