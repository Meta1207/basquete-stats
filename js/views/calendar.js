// Basquete Gouveia Play — views/calendar.js
import { V } from '../router.js';
import { getGames } from '../services/espn.js';
import { S } from '../state.js';
import { bindGames, bindSportLeague, errBox, gamesList, leagueSelect, skel, sportSelect } from '../ui/components.js';
import { ic, paintIcons } from '../ui/icons.js';
import { MES, esc, fmtDay, fmtFull, isoLocal, sameDay, startOfDay } from '../utils.js';

/* =========================================================
   CALENDÁRIO
   ========================================================= */
async function renderCalendar(){
  const sk=S.sport, lg=S.league[sk];
  const m0=S.calMonth, y=m0.getFullYear(), mo=m0.getMonth();
  const years=[]; for(let i=new Date().getFullYear()+1;i>=2002;i--) years.push(i);
  V.innerHTML=`
  <div class="card glow">
    <div class="ch">${ic('cal')}<h3>Calendário de Jogos</h3><span class="sp"></span>
      <div class="seg" id="cseg"><button data-m="proximos" class="${S.calMode==='proximos'?'on':''}">Próximos</button><button data-m="anteriores" class="${S.calMode==='anteriores'?'on':''}">Anteriores</button></div></div>
    <div class="row" style="margin-bottom:10px">${sportSelect()}${leagueSelect(sk)}
      <input type="date" class="sel" id="dpick" value="${isoLocal(S.calDate)}">
      <button class="btn ghost sm" id="todayB">Hoje</button></div>
    <div class="calnav">
      <button class="iconbtn" id="pm">${ic('left')}</button>
      <div class="t">${ic('cal')}<select class="sel" id="mSel">${MES.map((n,i)=>`<option value="${i}" ${i===mo?'selected':''}>${n}</option>`).join('')}</select>
        <select class="sel" id="ySel">${years.map(v=>`<option ${v===y?'selected':''}>${v}</option>`).join('')}</select></div>
      <button class="iconbtn" id="nm">${ic('right')}</button>
    </div>
    <div class="cal" id="calg">${['D','S','T','Q','Q','S','S'].map(d=>`<div class="h">${d}</div>`).join('')}${skel(1)}</div>
    <div class="ch" style="margin:4px 0 8px"><h3 style="font-size:17px;text-transform:capitalize">${esc(fmtFull(S.calDate))}</h3><span class="sp"></span><span class="mut" id="cnt"></span></div>
    <div id="clist">${skel(5)}</div>
  </div>`;
  paintIcons(V);
  bindSportLeague(V, renderCalendar);
  V.querySelectorAll('#cseg button').forEach(b=>b.addEventListener('click',()=>{ S.calMode=b.dataset.m; renderCalendar(); }));
  const setMonth=(yy,mm)=>{ S.calMonth=new Date(yy,mm,1); S.calDate=new Date(yy,mm,Math.min(S.calDate.getDate(),new Date(yy,mm+1,0).getDate())); renderCalendar(); };
  V.querySelector('#pm').onclick=()=>setMonth(y,mo-1);
  V.querySelector('#nm').onclick=()=>setMonth(y,mo+1);
  V.querySelector('#mSel').onchange=e=>setMonth(y,+e.target.value);
  V.querySelector('#ySel').onchange=e=>setMonth(+e.target.value,mo);
  V.querySelector('#dpick').onchange=e=>{ const [a,b,c]=e.target.value.split('-').map(Number); if(!a) return; S.calDate=new Date(a,b-1,c); S.calMonth=new Date(a,b-1,1); renderCalendar(); };
  V.querySelector('#todayB').onclick=()=>{ S.calDate=new Date(); S.calMonth=new Date(S.calDate.getFullYear(),S.calDate.getMonth(),1); renderCalendar(); };

  const first=new Date(y,mo,1), last=new Date(y,mo+1,0);
  let monthGames=[];
  try{ monthGames = await getGames(sk,lg,first,last); }catch(e){ document.getElementById('clist').innerHTML=errBox(e); }
  if(S.view!=='calendario') return;
  const counts={}; monthGames.forEach(g=>{ const k=g.date.getDate(); counts[k]=(counts[k]||0)+1; });
  const today=new Date();
  let cells=['D','S','T','Q','Q','S','S'].map(d=>`<div class="h">${d}</div>`).join('');
  for(let i=0;i<first.getDay();i++) cells+=`<button class="o" disabled></button>`;
  for(let d=1; d<=last.getDate(); d++){
    const dt=new Date(y,mo,d);
    cells+=`<button data-d="${d}" class="${sameDay(dt,S.calDate)?'on':''} ${sameDay(dt,today)?'today':''}">${d}${counts[d]?`<i>${counts[d]} jogo${counts[d]>1?'s':''}</i>`:''}</button>`;
  }
  const cg=document.getElementById('calg'); cg.innerHTML=cells;
  cg.querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>{ S.calDate=new Date(y,mo,+b.dataset.d); renderCalendar(); });

  let list = monthGames.filter(g=>sameDay(g.date,S.calDate));
  if(!sameDay(S.calDate,today)){
    // dia selecionado: mostra tudo daquele dia
  } else {
    list = S.calMode==='proximos' ? list.filter(g=>!g.completed) : list;
  }
  if(sameDay(S.calDate,today) && S.calMode==='anteriores' && !list.some(g=>g.completed)){
    // hoje ainda sem jogos encerrados → mostra jogos de ontem
  }
  document.getElementById('cnt').textContent = list.length? `${list.length} partida${list.length>1?'s':''}`:'';
  const cl=document.getElementById('clist');
  if(!list.length){
    // Sugere o dia mais próximo com jogos (anterior ou próximo conforme o modo)
    const cand = S.calMode==='proximos' ? monthGames.filter(g=>g.date>S.calDate) : monthGames.filter(g=>g.date<startOfDay(S.calDate)).reverse();
    cl.innerHTML = `<div class="empty">Nenhum jogo nesta data.${cand[0]?`<br><br><button class="btn ghost sm" id="jump">Ir para ${fmtDay(cand[0].date)} (${S.calMode==='proximos'?'próximo':'anterior'} dia com jogos)</button>`:''}</div>`;
    const j=document.getElementById('jump'); if(j) j.onclick=()=>{ S.calDate=cand[0].date; renderCalendar(); };
    return;
  }
  cl.innerHTML = gamesList(list,{group:sk==='tenis'||sk==='futebol'});
  bindGames(cl);
}

export { renderCalendar };
