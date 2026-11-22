// Basquete Gouveia Play — views/game.js
import { SPORTS } from '../config.js';
import { V } from '../router.js';
import { getGames, getSummary, implied, memo, parseOdds } from '../services/espn.js';
import { S } from '../state.js';
import { GAMECACHE, bindGames, errBox, gamesList, img, skel } from '../ui/components.js';
import { ic, paintIcons } from '../ui/icons.js';
import { MESC, addDays, esc, fmtDT, fmtDay, fmtTime, num } from '../utils.js';
import { getTeamSchedule } from '../views/results.js';

/* =========================================================
   DETALHE DO JOGO — todos os mercados
   ========================================================= */
const modal=document.getElementById('modal'), sheet=document.getElementById('sheet');
modal.addEventListener('click',e=>{ if(e.target===modal) closeModal(); });
let modalTimer=null;
function closeModal(){ clearInterval(modalTimer); modal.classList.remove('on'); document.body.style.overflow=''; }
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
  h += favSection(m, sum);
  if(m.sk==='nba') h += nbaDetail(m,sum);
  else if(m.sk==='futebol') h += soccerDetail(m,sum);
  else h += tennisDetail(m,sum);
  h += h2hSection(m,sum);
  gd.innerHTML = h || `<div class="empty">Detalhes indisponíveis para esta partida.</div>`;
  if(keepScroll) sheet.scrollTop=prevScroll;
  paintIcons(gd);
  bindTables(gd);
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
  let h=handicapMarketSection(m,sum,'pontos');
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
  let h=handicapMarketSection(m,sum,'gols');
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
  const handicap=handicapMarketSection(m,sum,'games');
  if(m.state==='pre') return handicap+`<div class="section"><h4>${ic('swords')}Confronto direto e forma recente</h4><button class="btn ghost sm" data-th2h>Carregar confrontos e últimos jogos (12 meses)</button><div id="th2h"></div></div>`;
  const H=m.home.lines.map(l=>l.v||0), A=m.away.lines.map(l=>l.v||0);
  const gH=H.reduce((a,b)=>a+b,0), gA=A.reduce((a,b)=>a+b,0);
  const isTB=i=>m.home.lines[i]?.tb!=null||m.away.lines[i]?.tb!=null||(H[i]===7&&A[i]===6)||(H[i]===6&&A[i]===7);
  const tbs=H.filter((_,i)=>isTB(i)).length;
  const setW=i=>H[i]>A[i]?m.home.short:A[i]>H[i]?m.away.short:'-';
  let h=handicap+`<div class="section"><h4>${ic('bars')}Mercados da partida</h4>${marketTiles([
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
function handicapMarketSection(m,sum,unit){
  const pc=sum?.pickcenter?.[0];
  const odds=(m.odds?.spread!=null)?m.odds:(pc?parseOdds(pc,m.home,m.away):m.odds);
  const spread=odds?.spread;
  const title=unit==='pontos'?'Handicap de pontos':unit==='gols'?'Handicap de gols':'Handicap de games';
  if(spread==null) return `<div class="section"><h4>${ic('swords')}${title}</h4><div class="dim" style="font-size:13px">A fonte não publicou uma linha de handicap para esta partida. Não será estimada uma cotação.</div></div>`;
  const homeLine=Number(spread), awayLine=-homeLine;
  const margin=unit==='games'?m.home.lines.reduce((s,l)=>s+(l.v||0),0)-m.away.lines.reduce((s,l)=>s+(l.v||0),0):(m.home.score||0)-(m.away.score||0);
  const covered=m.completed?(margin+homeLine>0?m.home.short:margin+homeLine<0?m.away.short:'Empate / devolução'):null;
  return `<div class="section"><h4>${ic('swords')}${title}</h4>${marketTiles([
    [m.home.short,homeLine>0?'+'+homeLine:String(homeLine),m.completed?(covered===m.home.short?'Cobriu o handicap':covered==='Empate / devolução'?'Devolvida':'Não cobriu'):'Linha publicada pela fonte'],
    [m.away.short,awayLine>0?'+'+awayLine:String(awayLine),m.completed?(covered===m.away.short?'Cobriu o handicap':covered==='Empate / devolução'?'Devolvida':'Não cobriu'):'Linha oposta'],
    ['Fonte',odds.provider||'ESPN']
  ])}</div>`;
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
  const W=640,H=200,pts=wp.map((p,i)=>[i/(wp.length-1)*W, (1-(num(p.homeWinPercentage)??.5))*H]);
  const path=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
  const last=num(wp[wp.length-1].homeWinPercentage);
  return `<div class="tw" style="padding:10px"><div class="row" style="justify-content:space-between;font-size:13px;margin-bottom:4px"><span><b class="acc">${esc(m.home.short)}</b> acima</span><span class="mut">final: ${Math.round((last??0)*100)}% ${esc(m.home.short)}</span><span><b>${esc(m.away.short)}</b> abaixo</span></div>
  <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="width:100%;height:170px;display:block">
    <defs><linearGradient id="wpg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--acc)" stop-opacity=".45"/><stop offset=".5" stop-color="var(--acc)" stop-opacity="0"/></linearGradient></defs>
    <rect width="${W}" height="${H}" fill="none"/>
    ${[0.25,0.75].map(y=>`<line x1="0" x2="${W}" y1="${y*H}" y2="${y*H}" stroke="var(--line)" stroke-dasharray="4 6"/>`).join('')}
    <line x1="0" x2="${W}" y1="${H/2}" y2="${H/2}" stroke="var(--line2)" stroke-width="1.5"/>
    <path d="${path} L ${W} ${H/2} L 0 ${H/2} Z" fill="url(#wpg)"/>
    <path d="${path}" fill="none" stroke="var(--acc)" stroke-width="2.5" vector-effect="non-scaling-stroke"/>
  </svg><div class="row" style="justify-content:space-between;font-size:12px" class="dim"><span class="dim">Início</span><span class="dim">50%</span><span class="dim">Fim</span></div></div>`;
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

export { NBA_COLS, PT, bindTables, closeModal, favSection, fmtML, h2hSection, hcpGrid, loadH2H, loadTennisH2H, marketTiles, modal, modalTimer, nbaDetail, openGame, ouGrid, parseNbaPlayers, pctCell, periodTable, probBar, rng, sheet, soccerDetail, teamStatBars, tennisDetail, wpChart };
