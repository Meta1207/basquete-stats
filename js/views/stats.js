// Basquete Gouveia Play — views/stats.js
import { V, go } from '../router.js';
import { api, base, getGames, getSummary } from '../services/espn.js';
import { S, store } from '../state.js';
import { bindGames, bindSportLeague, errBox, gamesList, img, leagueSelect, remember, skel, sportSelect, toast } from '../ui/components.js';
import { ic, paintIcons } from '../ui/icons.js';
import { addDays, esc, fmtDay, num } from '../utils.js';
import { bindTables, marketTiles, pctCell } from '../views/game.js?v=20261124a';
import { getTeams, setupSearch } from '../views/home.js';

/* =========================================================
   ESTATÍSTICAS DE JOGADORES (NBA) — histórico por mercado
   ========================================================= */
async function getGamelog(id, season){
  const params = season? {season}: {};
  const j = await api(`/apis/common/v3/sports/basketball/nba/athletes/${id}/gamelog`, params, {host:'web', ttl:900});
  const labels=(j.labels||[]).map(s=>String(s).toUpperCase());
  const evMeta=j.events||{};
  const games=[];
  for(const stp of (j.seasonTypes||[])){
    const tname=stp.displayName||'';
    if(/pre/i.test(tname)) continue; // ignora pré-temporada
    for(const cat of (stp.categories||[])){
      for(const e of (cat.events||[])){
        const meta=evMeta[e.eventId]||{};
        const g=k=>{ const i=labels.indexOf(k); return i<0?null:e.stats[i]; };
        const made=s=>s==null?0:num(String(s).split('-')[0])||0;
        const P=num(g('PTS'))||0,R=num(g('REB'))||0,A=num(g('AST'))||0,S_=num(g('STL'))||0,B=num(g('BLK'))||0;
        games.push({ id:e.eventId, date:new Date(meta.gameDate), opp:meta.opponent?.abbreviation||meta.opponent?.displayName||'', oppLogo:meta.opponent?.logo, atVs:meta.atVs||'', res:meta.gameResult||'', score:meta.score||'', type:tname,
          s:{ MIN:num(g('MIN'))||0, PTS:P, REB:R, AST:A, '3PM':made(g('3PT')), STL:S_, BLK:B, TO:num(g('TO'))||0, PRA:P+R+A, 'P+R':P+R, 'P+A':P+A, 'R+A':R+A, 'S+B':S_+B }, raw:{FG:g('FG'),'3PT':g('3PT'),FT:g('FT')} });
      }
    }
  }
  const seen=new Set();
  const list=games.filter(g=>!seen.has(g.id)&&seen.add(g.id)).sort((a,b)=>b.date-a.date);
  const ath=j.athlete||{};
  let name=ath.displayName, team=ath.team?.displayName, teamLogo=ath.team?.logos?.[0]?.href, headshot=ath.headshot?.href;
  return { games:list, name, team, teamLogo, headshot };
}
const MKTS=['PTS','REB','AST','3PM','STL','BLK','TO','PRA','P+R','P+A','R+A','S+B','MIN'];
const MKT_PT={PTS:'Pontos',REB:'Rebotes',AST:'Assistências','3PM':'Bolas de 3',STL:'Roubos',BLK:'Tocos',TO:'Erros',PRA:'Pts+Reb+Ast','P+R':'Pts+Reb','P+A':'Pts+Ast','R+A':'Reb+Ast','S+B':'Roubos+Tocos',MIN:'Minutos'};
async function renderStats(){
  if(S.sport!=='nba'){ return renderTeamStats(); }
  const now=new Date(); const cur=now.getMonth()>=8?now.getFullYear()+1:now.getFullYear();
  V.innerHTML=`
  <div class="card glow">
    <div class="ch">${ic('user')}<h3>Análises de Jogadores</h3><span class="sp"></span>${sportSelect()}</div>
    <div class="search" style="position:relative;margin-top:0">
      <label class="sbox">${ic('search')}<input id="q" placeholder="Buscar jogador da NBA (ex.: Curry, LeBron, Jokic)" autocomplete="off"></label>
      <button class="btn" id="qb">Buscar</button><div class="sugg" id="sugg"></div>
    </div>
    <div class="row" style="margin-bottom:8px"><span class="mut">ou escolha pelo time:</span><select class="sel" id="tSel"><option value="">Time…</option></select><select class="sel" id="pSel" disabled><option>Jogador…</option></select></div>
  </div>
  <div id="pbody" style="margin-top:14px"></div>`;
  paintIcons(V);
  bindSportLeague(V, ()=>go(S.view));
  setupSearch();
  getTeams('nba','nba').then(ts=>{ const s=V.querySelector('#tSel'); if(!s) return; ts.sort((a,b)=>a.name.localeCompare(b.name)).forEach(t=>s.insertAdjacentHTML('beforeend',`<option value="${t.id}">${esc(t.name)}</option>`)); });
  V.querySelector('#tSel').onchange=async e=>{
    const ps=V.querySelector('#pSel'); ps.disabled=true; ps.innerHTML='<option>Carregando…</option>';
    try{ const j=await api(base('nba','nba')+`/teams/${e.target.value}/roster`,{},{ttl:3600});
      const ath=(j.athletes||[]).flatMap(a=>a.items?a.items:[a]);
      ps.innerHTML='<option value="">Jogador…</option>'+ath.map(a=>`<option value="${a.id}">${esc(a.displayName)} · ${esc(a.position?.abbreviation||'')}</option>`).join(''); ps.disabled=false;
    }catch(err){ ps.innerHTML='<option>Erro ao carregar</option>'; }
  };
  V.querySelector('#pSel').onchange=e=>{ if(!e.target.value) return; S.player={id:e.target.value,name:e.target.selectedOptions[0].text.split(' · ')[0]}; S.statSeason=null; drawPlayer(); };
  if(!S.player) S.player={id:S.favPlayer.id,name:S.favPlayer.name};
  drawPlayer();

  async function drawPlayer(){
    const pb=document.getElementById('pbody'); pb.innerHTML=`<div class="card">${skel(6)}</div>`;
    const season=S.statSeason||cur;
    let g;
    try{ g=await getGamelog(S.player.id, season); }catch(e){ pb.innerHTML=`<div class="card">${errBox(e)}</div>`; return; }
    if(S.view!=='estatisticas') return;
    const N=S.statN, mk=S.statMarket;
    const games=g.games.slice(0,N);
    const avg=k=>games.length?(games.reduce((s,x)=>s+(x.s[k]||0),0)/games.length):0;
    const line=parseFloat(String(S.statLine).replace(',','.'));
    const hasLine=!isNaN(line);
    const hits=hasLine?games.filter(x=>x.s[mk]>line).length:0;
    const max=Math.max(1,...games.map(x=>x.s[mk]||0), hasLine?line:0);
    const seasons=[]; for(let y=cur;y>=cur-20;y--) seasons.push(y);
    pb.innerHTML=`
    <div class="card glow">
      <div class="ply">${img(g.headshot||`https://a.espncdn.com/i/headshots/nba/players/full/${S.player.id}.png`,'hs')}<div><h4>${esc(g.name||S.player.name)}</h4><div class="mut">${esc(g.team||'')}</div></div>${g.teamLogo?img(g.teamLogo,'lg'):''}
        <button class="btn ghost sm" id="fav" style="margin-left:${g.teamLogo?'8px':'auto'}">${S.favPlayer.id===S.player.id?'★ Favorito':'☆ Favoritar'}</button></div>
      <div class="row" style="margin-bottom:12px">
        <select class="sel" id="sSeas">${seasons.map(y=>`<option value="${y}" ${y===season?'selected':''}>Temporada ${y-1}-${String(y).slice(2)}</option>`).join('')}</select>
        <select class="sel" id="sN">${[5,10,15,20,30,82].map(n=>`<option value="${n}" ${n===N?'selected':''}>${n===82?'Temporada toda':'Últimos '+n}</option>`).join('')}</select>
      </div>
      <div class="tiles" style="grid-template-columns:repeat(auto-fill,minmax(92px,1fr))">${MKTS.map(k=>`<button class="tile ${k===mk?'':''}" data-mk="${k}" style="${k===mk?'border-color:var(--acc);box-shadow:0 0 0 1px var(--acc) inset':''}"><small>${k}</small><b>${avg(k).toFixed(1)}</b><div class="dim" style="font-size:11px">${MKT_PT[k]}</div></button>`).join('')}</div>
      <div class="section"><h4>${ic('bars')}${esc(MKT_PT[mk])} — jogo a jogo</h4>
        <div class="row" style="margin-bottom:10px"><span class="mut">Linha:</span><input class="sel" id="sLine" inputmode="decimal" placeholder="ex.: ${(Math.round(avg(mk))-.5).toFixed(1)}" value="${esc(S.statLine)}" style="width:110px">
          ${hasLine?`<span class="tag ${hits/games.length>=.5?'ok':'bad'}">Over ${line}: ${hits}/${games.length} (${Math.round(hits/games.length*100)}%)</span><span class="tag">Under: ${games.length-hits}/${games.length}</span>`:'<span class="dim">Digite uma linha para ver a taxa de acerto Over/Under</span>'}</div>
        <div id="chart" style="display:flex;align-items:flex-end;gap:4px;height:150px;padding:6px 0;position:relative;border-bottom:1px solid var(--line)">
          ${hasLine?`<div style="position:absolute;left:0;right:0;bottom:${line/max*138+6}px;border-top:2px dashed var(--warn);opacity:.8"></div>`:''}
          ${[...games].reverse().map(x=>{ const v=x.s[mk]||0; const ok=hasLine?v>line:null; return `<div title="${fmtDay(x.date)} ${esc(x.atVs)} ${esc(x.opp)}: ${v}" style="flex:1;min-width:6px;display:flex;flex-direction:column;align-items:center;gap:2px"><span style="font-size:11px;font-weight:700">${v}</span><div style="width:100%;height:${v/max*120}px;border-radius:6px 6px 2px 2px;background:${ok===null?'var(--acc)':ok?'#22c55e':'#ef4444'}"></div></div>`; }).join('')}
        </div>
      </div>
      <div class="section"><h4>${ic('list')}Histórico de jogos</h4>
        <div class="tw" data-sortable="p"><table><thead><tr><th>Data</th><th>Adv.</th><th>Res.</th>${MKTS.map(k=>`<th data-k="${k}" class="${k===mk?'on':''}">${k}</th>`).join('')}<th>FG</th><th>3PT</th><th>FT</th></tr></thead><tbody>
        ${games.map(x=>`<tr><td>${fmtDay(x.date)}<span class="dim"> ${String(x.date.getFullYear()).slice(2)}</span></td><td data-v="0">${esc(x.atVs)} ${esc(x.opp)}</td><td data-v="0"><span class="hit ${x.res==='W'?'y':'n'}">${x.res==='W'?'V':x.res==='L'?'D':esc(x.res)}</span> ${esc(x.score)}</td>${MKTS.map(k=>`<td data-v="${x.s[k]}" class="${k===mk?'hi':''}">${x.s[k]}</td>`).join('')}<td data-v="0">${esc(x.raw.FG||'-')}</td><td data-v="0">${esc(x.raw['3PT']||'-')}</td><td data-v="0">${esc(x.raw.FT||'-')}</td></tr>`).join('')}
        </tbody></table></div>
        ${!games.length?'<div class="empty">Sem jogos nesta temporada.</div>':''}
      </div>
    </div>`;
    paintIcons(pb);
    // ordenação: colunas de mercado começam no índice 3
    pb.querySelectorAll('th[data-k]').forEach(th=>th.addEventListener('click',()=>{ S.statMarket=th.dataset.k; drawPlayer(); }));
    pb.querySelectorAll('[data-mk]').forEach(b=>b.onclick=()=>{ S.statMarket=b.dataset.mk; S.statLine=''; drawPlayer(); });
    pb.querySelector('#sSeas').onchange=e=>{ S.statSeason=+e.target.value; drawPlayer(); };
    pb.querySelector('#sN').onchange=e=>{ S.statN=+e.target.value; drawPlayer(); };
    const sl=pb.querySelector('#sLine'); sl.onchange=()=>{ S.statLine=sl.value; drawPlayer(); }; sl.onkeydown=e=>{ if(e.key==='Enter'){ S.statLine=sl.value; drawPlayer(); } };
    pb.querySelector('#fav').onclick=()=>{ S.favPlayer={id:S.player.id,name:g.name||S.player.name,team:g.team||''}; store.set('favPlayer',S.favPlayer); toast('Jogador favorito atualizado'); drawPlayer(); };
  }
}

/* Estatísticas para futebol e tênis: médias por equipe a partir dos jogos reais */
async function renderTeamStats(){
  const sk=S.sport, lg=S.league[sk];
  V.innerHTML=`<div class="card glow"><div class="ch">${ic('trophy')}<h3>Estatísticas ${sk==='futebol'?'por equipe':'do período'}</h3><span class="sp"></span>${sportSelect()}${leagueSelect(sk)}</div>
    <div class="row" style="margin-bottom:10px"><select class="sel" id="per">${[[7,'Últimos 7 dias'],[14,'Últimos 14 dias'],[30,'Últimos 30 dias']].map(([v,t])=>`<option value="${v}" ${S.tsDays==v?'selected':''}>${t}</option>`).join('')}</select></div>
    <div id="tsb">${skel(6)}</div></div>`;
  paintIcons(V);
  bindSportLeague(V, ()=>go('estatisticas'));
  V.querySelector('#per').onchange=e=>{ S.tsDays=+e.target.value; renderTeamStats(); };
  const days=S.tsDays||14;
  const el=document.getElementById('tsb');
  let list;
  try{ list=(await getGames(sk,lg,addDays(new Date(),-days),new Date())).filter(m=>m.completed); }catch(e){ el.innerHTML=errBox(e); return; }
  remember(list);
  if(!list.length){ el.innerHTML='<div class="empty">Sem partidas encerradas no período.</div>'; return; }
  if(sk==='tenis'){
    const tg=list.map(m=>m.home.lines.reduce((s,l)=>s+(l.v||0),0)+m.away.lines.reduce((s,l)=>s+(l.v||0),0));
    const sets=list.map(m=>Math.max(m.home.lines.length,m.away.lines.length));
    const avg=a=>(a.reduce((x,y)=>x+y,0)/a.length).toFixed(1);
    const o=(a,l)=>Math.round(a.filter(x=>x>l).length/a.length*100)+'%';
    el.innerHTML=`<div class="mut" style="margin-bottom:10px">${list.length} partidas encerradas analisadas</div>${marketTiles([
      ['Média de games',avg(tg)],['Over 20.5 games',o(tg,20.5)],['Over 22.5 games',o(tg,22.5)],['Média de sets',avg(sets)],
      ['Jogos em 3+ sets',o(sets,2.5)],['Jogos em 5 sets',o(sets,4.5)]])}
      <div class="section"><h4>${ic('list')}Partidas</h4>${gamesList(list.slice().reverse(),{group:true})}</div>`;
    bindGames(el); paintIcons(el); return;
  }
  // futebol: carrega summaries para escanteios/cartões
  el.innerHTML=`<div class="mut">Carregando estatísticas de ${list.length} partidas…</div>${skel(4)}`;
  const sums=await Promise.all(list.map(m=>getSummary(m).catch(()=>null)));
  const T={};
  list.forEach((m,i)=>{
    const bt=sums[i]?.boxscore?.teams||[];
    for(const side of ['home','away']){
      const me=m[side], op=side==='home'?m.away:m.home;
      const t=T[me.id]||(T[me.id]={name:me.name,short:me.short,logo:me.logo,id:me.id,j:0,gf:0,ga:0,c:0,cc:0,cards:0,btts:0,o25:0,ns:0,o05:0,o15:0,o35:0,o45:0,u25:0,cs:0,fts:0,c85:0,c95:0,c105:0,k35:0,k45:0});
      t.j++; t.gf+=me.score||0; t.ga+=op.score||0; if(me.score>0&&op.score>0) t.btts++; const tg=(me.score||0)+(op.score||0); if(tg>0.5) t.o05++; if(tg>1.5) t.o15++; if(tg>2.5) t.o25++; else t.u25++; if(tg>3.5) t.o35++; if(tg>4.5) t.o45++; if(!op.score) t.cs++; if(!me.score) t.fts++;
      const mine=bt.find(x=>String(x.team?.id)===String(me.id)), oth=bt.find(x=>String(x.team?.id)===String(op.id));
      const sv=(x,n)=>num((x?.statistics||[]).find(s=>s.name===n)?.displayValue);
      if(mine){ t.ns++; const c1=sv(mine,'wonCorners')||0, c2=sv(oth,'wonCorners')||0; t.c+=c1; t.cc+=c2; const tc=c1+c2; if(tc>8.5) t.c85++; if(tc>9.5) t.c95++; if(tc>10.5) t.c105++;
        const k1=(sv(mine,'yellowCards')||0)+(sv(mine,'redCards')||0), k2=(sv(oth,'yellowCards')||0)+(sv(oth,'redCards')||0); t.cards+=k1; if(k1+k2>3.5) t.k35++; if(k1+k2>4.5) t.k45++; }
    }
  });
  const rows=Object.values(T).sort((a,b)=>b.j-a.j||a.name.localeCompare(b.name));
  const f=(a,b)=>b?(a/b).toFixed(1):'-';
  const allG=list.map(m=>(m.home.score||0)+(m.away.score||0));
  const lp=l=>Math.round(allG.filter(g=>g>l).length/allG.length*100)+'%';
  el.innerHTML=`<div class="mut" style="margin-bottom:10px">${list.length} partidas encerradas · % de jogos em que cada linha bateu</div>
   ${marketTiles([['Média de gols',(allG.reduce((a,b)=>a+b,0)/allG.length).toFixed(2)],['Over 0.5',lp(0.5)],['Over 1.5',lp(1.5)],['Over 2.5',lp(2.5)],['Over 3.5',lp(3.5)],['Over 4.5',lp(4.5)],['Ambas marcam',Math.round(list.filter(m=>m.home.score>0&&m.away.score>0).length/list.length*100)+'%']])}
   <div class="tw" data-sortable="t" style="margin-top:12px"><table><thead><tr><th>Equipe</th>${['J','Gols pró','Gols contra','O 0.5','O 1.5','O 2.5','U 2.5','O 3.5','O 4.5','Ambas','Sem sofrer','Sem marcar','Escanteios','Esc. sofridos','Esc. O 8.5','Esc. O 9.5','Esc. O 10.5','Cartões','Cart. O 3.5','Cart. O 4.5'].map((l,i)=>`<th data-k="${i}">${l}</th>`).join('')}</tr></thead><tbody>
   ${rows.map(t=>`<tr><td>${img(t.logo)} <b>${esc(t.short)}</b></td><td data-v="${t.j}">${t.j}</td><td data-v="${t.gf/t.j}">${f(t.gf,t.j)}</td><td data-v="${t.ga/t.j}">${f(t.ga,t.j)}</td>${[t.o05,t.o15,t.o25,t.u25,t.o35,t.o45,t.btts,t.cs,t.fts].map(k=>pctCell(k,t.j)).join('')}<td data-v="${t.ns?t.c/t.ns:-1}">${f(t.c,t.ns)}</td><td data-v="${t.ns?t.cc/t.ns:-1}">${f(t.cc,t.ns)}</td>${[t.c85,t.c95,t.c105].map(k=>pctCell(k,t.ns)).join('')}<td data-v="${t.ns?t.cards/t.ns:-1}">${f(t.cards,t.ns)}</td>${[t.k35,t.k45].map(k=>pctCell(k,t.ns)).join('')}</tr>`).join('')}
   </tbody></table></div><div class="dim" style="font-size:12px;margin-top:6px">Linhas de escanteios e cartões contam o total do jogo (as duas equipes). Toque no cabeçalho para ordenar.</div>`;
  bindTables(el);
}

export { MKTS, MKT_PT, getGamelog, renderStats, renderTeamStats };
