// Painel visual de futebol — Gouveia Play
// Dados exclusivamente do resumo público da ESPN; nenhum evento ou indicador é estimado.
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num = value => { const n=Number(String(value??'').replace('%','').replace(',','.')); return Number.isFinite(n)?n:null; };
const read = (team,name) => {
  const s=(team?.statistics||[]).find(x=>x.name===name||x.abbreviation===name||x.label===name);
  return num(s?.displayValue ?? s?.value);
};
const minuteOf = event => {
  const raw=String(event?.clock?.displayValue ?? event?.clock?.value ?? event?.time?.displayValue ?? '');
  const match=raw.match(/(\d{1,3})(?::\d{2})?/);
  const period=num(event?.period?.number ?? event?.periodNumber);
  if(!match) return period===2?60:period===1?15:null;
  let minute=Number(match[1]);
  if(period===2 && minute<=45) minute+=45;
  else if(period>2) minute=90+(period-2)*15+minute;
  return Math.max(0,Math.min(120,minute));
};
const typeOf = event => {
  const raw=[event?.type?.text,event?.type?.type,event?.type?.name,event?.text,event?.shortDescription,event?.description].filter(Boolean).join(' ').toLowerCase();
  if(/goal|gol|scored/.test(raw)) return {key:'goal',icon:'⚽',label:'Gol'};
  if(/red card|cartão vermelho|expuls/.test(raw)) return {key:'red',icon:'🟥',label:'Cartão vermelho'};
  if(/yellow card|cartão amarelo/.test(raw)) return {key:'yellow',icon:'🟨',label:'Cartão amarelo'};
  if(/substitut|substituição/.test(raw)) return {key:'sub',icon:'🔁',label:'Substituição'};
  if(/corner|escanteio/.test(raw)) return {key:'corner',icon:'🚩',label:'Escanteio'};
  if(/shot|finalização|attempt/.test(raw)) return {key:'shot',icon:'🎯',label:'Finalização'};
  if(/save|defesa/.test(raw)) return {key:'save',icon:'🧤',label:'Defesa'};
  if(/penalt/.test(raw)) return {key:'penalty',icon:'⚽',label:'Pênalti'};
  if(/offside|impedimento/.test(raw)) return {key:'offside',icon:'🚩',label:'Impedimento'};
  if(/foul|falta/.test(raw)) return {key:'foul',icon:'⚑',label:'Falta'};
  return {key:'other',icon:'•',label:'Evento'};
};
function soccerVisualCharts(m,sum){
  if(!m || m.sk!=='futebol') return '';
  const homeId=String(m.home.id), awayId=String(m.away.id);
  const groups=Array.isArray(sum?.boxscore?.teams)?sum.boxscore.teams:[];
  const ordered=groups.length===2?(String(groups[0]?.team?.id)===homeId?groups:[groups[1],groups[0]]):[];
  const plays=Array.isArray(sum?.plays)?sum.plays:Array.isArray(sum?.plays?.items)?sum.plays.items:[];
  const keyEvents=Array.isArray(sum?.keyEvents)?sum.keyEvents:[];
  const source=[...plays,...keyEvents];
  const seen=new Set();
  const events=source.map((event,index)=>{
    const teamId=String(event?.team?.id ?? event?.teamId ?? event?.competitor?.id ?? '');
    const type=typeOf(event);
    const minute=minuteOf(event);
    const text=String(event?.text ?? event?.shortDescription ?? event?.description ?? event?.type?.text ?? type.label);
    const athlete=(event?.participants||[]).map(p=>p?.athlete?.displayName).filter(Boolean).join(', ');
    const clock=String(event?.clock?.displayValue ?? event?.time?.displayValue ?? (minute!=null?minute+"'":''));
    const key=[teamId,minute,type.key,text].join('|');
    if(seen.has(key)) return null; seen.add(key);
    if(!['goal','red','yellow','sub','corner','shot','save','penalty','offside','foul'].includes(type.key)) return null;
    return {teamId,side:teamId===homeId?'home':teamId===awayId?'away':'',type,minute,clock,text,athlete,index};
  }).filter(Boolean).sort((a,b)=>(a.minute??999)-(b.minute??999));
  // Intensidade ofensiva estimada por eventos identificados; não é tracking territorial.
  const buckets=Array.from({length:36},(_,i)=>({minute:i*2.5,home:0,away:0}));
  const weight={goal:5,penalty:4,shot:3,corner:2,save:2,offside:1.2,foul:.35,yellow:.25,red:.5,sub:0};
  events.forEach(e=>{
    if(e.minute==null||!e.side) return;
    const idx=Math.min(35,Math.floor(e.minute/2.5));
    buckets[idx][e.side]+=weight[e.type.key]??0;
  });
  const max=Math.max(1,...buckets.flatMap(b=>[b.home,b.away]));
  const bars=buckets.map(b=>{
    const heightH=b.home/max*84, heightA=b.away/max*84;
    return '<div class="gpf-bin" title="'+b.minute+'–'+(b.minute+2.5)+' min · '+esc(m.home.short)+' '+b.home.toFixed(1)+' · '+esc(m.away.short)+' '+b.away.toFixed(1)+'"><i class="home" style="height:'+heightH+'px"></i><i class="away" style="height:'+heightA+'px"></i></div>';
  }).join('');
  const eventMarkers=events.filter(e=>e.minute!=null&&e.side).map((e,i)=>{
    const left=Math.max(0,Math.min(100,e.minute/90*100));
    const top=e.side==='home'?(i%3===0?8:i%3===1?24:40):(i%3===0?57:i%3===1?73:89);
    return '<span class="gpf-marker '+e.side+'" style="left:'+left+'%;top:'+top+'%" title="'+esc(e.clock+' · '+e.type.label+' · '+e.text)+'">'+e.type.icon+'</span>';
  }).join('');
  const timeMarks=[0,15,30,45,60,75,90].map(minute=>'<span style="left:'+(minute/90*100)+'%">'+(minute===45?"45'":minute+"'")+'</span>').join('');
  const eventRows=events.slice(0,80).map(e=>{
    const team=e.side==='home'?m.home.short:e.side==='away'?m.away.short:'';
    const who=e.athlete?e.athlete+' · ':'';
    return '<div class="gpf-event"><span class="gpf-minute">'+esc(e.clock||'—')+'</span><span class="gpf-event-icon">'+e.type.icon+'</span><div><b>'+esc(team?team+' · ':'')+esc(who)+esc(e.type.label)+'</b><small>'+esc(e.text)+'</small></div></div>';
  }).join('');
  const metrics=[
    ['Posse de bola','possessionPct','%','⚽'],['Finalizações','totalShots','','🎯'],['No gol','shotsOnTarget','','🥅'],
    ['Escanteios','wonCorners','','🚩'],['Passes certos','accuratePasses','','👟'],['Faltas','foulsCommitted','','⚑'],
    ['Cartões amarelos','yellowCards','','🟨'],['Cartões vermelhos','redCards','','🟥'],['Defesas','saves','','🧤']
  ];
  const statCards=ordered.length===2?metrics.map(([label,key,suffix,icon])=>{
    const a=read(ordered[0],key),b=read(ordered[1],key);
    if(a==null&&b==null) return '';
    const av=a??0,bv=b??0,top=Math.max(1,av,bv);
    return '<div class="gpf-stat"><div class="gpf-stat-title"><span>'+icon+'</span>'+label+'</div><div class="gpf-stat-values"><b>'+esc(a==null?'—':a+suffix)+'</b><b>'+esc(b==null?'—':b+suffix)+'</b></div><div class="gpf-stat-track"><i class="home" style="width:'+(av/top*100)+'%"></i><i class="away" style="width:'+(bv/top*100)+'%"></i></div></div>';
  }).join(''):'';
  const availableStats=!!statCards;
  const hasEvents=events.length>0;
  const legend='<div class="gpf-legend"><span><i class="home"></i>'+esc(m.home.short)+'</span><span><i class="away"></i>'+esc(m.away.short)+'</span></div>';
  return '<section class="section gpf-panel"><style>'+
    '.gpf-panel{background:linear-gradient(180deg,rgba(17,31,53,.7),rgba(5,12,25,.45));border:1px solid var(--line);border-radius:16px;padding:14px;overflow:hidden}'+
    '.gpf-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}.gpf-head h4{margin:0}.gpf-tag{font-size:10px;font-weight:800;letter-spacing:.08em;color:var(--acc);border:1px solid var(--line2);border-radius:20px;padding:5px 8px}'+
    '.gpf-sub{color:var(--mut);font-size:12px;margin:3px 0 12px}.gpf-legend{display:flex;gap:18px;flex-wrap:wrap;color:var(--mut);font-size:12px;margin:8px 0}.gpf-legend span{display:flex;align-items:center;gap:6px}.gpf-legend i{width:9px;height:9px;border-radius:50%;display:inline-block}.gpf-legend .home,.gpf-stat-track .home{background:#e07855}.gpf-legend .away,.gpf-stat-track .away{background:#168fc2}'+
    '.gpf-pressure{position:relative;height:214px;margin:8px 0 24px;overflow:hidden;border:1px solid rgba(120,145,175,.12);border-radius:12px;background:repeating-linear-gradient(to right,transparent 0,transparent calc(16.666% - 1px),rgba(140,160,190,.13) calc(16.666% - 1px),rgba(140,160,190,.13) 16.666%)}.gpf-pressure:before{content:"";position:absolute;left:0;right:0;top:50%;height:3px;background:#64748b;z-index:2}.gpf-pressure-bars{position:absolute;inset:0;display:flex;align-items:center;gap:1px;padding:0 2px}.gpf-bin{height:100%;flex:1;min-width:0;position:relative;z-index:1}.gpf-bin i{position:absolute;left:0;right:0;display:block;min-height:0;border-radius:2px}.gpf-bin .home{bottom:50%;background:#bd765e}.gpf-bin .away{top:50%;background:#087eae}.gpf-markers{position:absolute;inset:0;z-index:3;pointer-events:none}.gpf-marker{position:absolute;transform:translate(-50%,-50%);font-size:13px;line-height:19px;width:20px;height:20px;text-align:center;border-radius:50%;background:#25364a;border:1px solid rgba(255,255,255,.12);box-shadow:0 1px 4px #07111f;white-space:nowrap}.gpf-marker.home{color:#e58b6c}.gpf-marker.away{color:#36b8ed}.gpf-time-axis{position:absolute;left:0;right:0;bottom:-20px;height:18px;color:var(--mut);font-size:10px}.gpf-time-axis span{position:absolute;transform:translateX(-50%)}.gpf-time-axis span:first-child{transform:none}.gpf-time-axis span:last-child{transform:translateX(-100%)}'+
    '.gpf-timeline{display:grid;gap:7px;margin-top:10px}.gpf-event{display:grid;grid-template-columns:42px 24px minmax(0,1fr);align-items:start;gap:8px;padding:8px;border:1px solid var(--line);border-radius:10px;background:rgba(4,10,20,.45)}.gpf-minute{color:var(--acc2);font-weight:800;font-size:12px}.gpf-event-icon{font-size:17px;line-height:1.1}.gpf-event b{display:block;font-size:12px}.gpf-event small{display:block;color:var(--mut);font-size:11px;margin-top:2px;overflow-wrap:anywhere}'+
    '.gpf-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.gpf-stat{padding:10px;border:1px solid var(--line);border-radius:11px;background:rgba(4,10,20,.4);min-width:0}.gpf-stat-title{font-size:11px;color:var(--mut);font-weight:700}.gpf-stat-title span{font-size:15px;margin-right:5px}.gpf-stat-values{display:flex;justify-content:space-between;gap:8px;margin:7px 0;font-size:15px}.gpf-stat-track{display:flex;height:5px;border-radius:8px;overflow:hidden;background:var(--line);gap:2px}.gpf-stat-track i{display:block;height:100%;border-radius:8px}.gpf-note{font-size:11px;color:var(--mut);line-height:1.45;margin-top:10px}.gpf-empty{padding:14px;border:1px dashed var(--line2);border-radius:10px;color:var(--mut);font-size:12px}'+
    '@media(max-width:420px){.gpf-panel{padding:11px}.gpf-stats{gap:6px}.gpf-stat{padding:8px}.gpf-stat-values{font-size:13px}.gpf-event{grid-template-columns:36px 22px minmax(0,1fr);gap:6px}}'+
    '</style><div class="gpf-head"><div><h4>📊 Evolução e pressão da partida</h4><div class="gpf-sub">Atividade ofensiva por faixa de 5 minutos · eventos publicados pela ESPN</div></div><span class="gpf-tag">'+(m.state==='in'?'AO VIVO':m.completed?'PÓS-JOGO':'PRÉ-JOGO')+'</span></div>'+
    (hasEvents?legend+'<div class="gpf-pressure" role="img" aria-label="Indicadores de atividade ofensiva ao longo da partida"><div class="gpf-pressure-bars">'+bars+'</div><div class="gpf-markers">'+eventMarkers+'</div></div><div class="gpf-time-axis">'+timeMarks+'</div><div class="gpf-sub">Mandante acima da linha central · visitante abaixo · intensidade calculada por eventos ofensivos identificados.</div>':'<div class="gpf-empty">A ESPN ainda não disponibilizou eventos com minuto e equipe suficientes para montar a evolução. O gráfico será preenchido quando houver dados.</div>')+
    '<div class="gpf-head" style="margin-top:16px"><div><h4>📈 Estatísticas comparativas</h4><div class="gpf-sub">Indicadores oficiais do box score</div></div></div>'+
    (availableStats?legend+'<div class="gpf-stats">'+statCards+'</div>':'<div class="gpf-empty">Estatísticas comparativas ainda não disponíveis no box score desta partida.</div>')+
    '<div class="gpf-head" style="margin-top:16px"><div><h4>🧭 Linha do tempo e ícones</h4><div class="gpf-sub">Gols, cartões, substituições, escanteios, finalizações, defesas, impedimentos e faltas</div></div></div>'+
    (hasEvents?'<div class="gpf-timeline">'+eventRows+'</div>':'<div class="gpf-empty">Nenhum lance detalhado foi publicado para esta partida.</div>')+
    '<p class="gpf-note">Os indicadores são apresentados somente quando existem dados da ESPN. O gráfico reproduz o estilo visual de pressão com intensidade estimada por eventos ofensivos identificados; não representa rastreamento territorial nem uma métrica oficial de pressão. Mapa de calor posicional depende de coordenadas de rastreamento que não estão disponíveis neste feed; por isso não é simulado.</p></section>';
}
export { soccerVisualCharts };
