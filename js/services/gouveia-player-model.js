// IA Gouveia — projeções individuais NBA (experimental)
// Usa game logs individuais públicos da ESPN como dados de entrada.
// Não utiliza odds, linhas de casas ou projeções externas.
import { api, base } from './espn.js';

const CACHE = new Map();
const MAX_PLAYERS_PER_TEAM = 8;
const MAX_GAMES = 10;
const MIN_GAMES = 4;
const round = (n, p=1) => {
  const x = Math.pow(10,p);
  return Math.round(n*x)/x;
};
const numeric = value => {
  if (value == null || value === '' || value === '--' || value === '-') return null;
  const n = Number(String(value).replace('%',''));
  return Number.isFinite(n) ? n : null;
};
const first = (...values) => values.find(v => v != null && v !== '');
const seasonFor = date => {
  const d = new Date(date);
  return d.getUTCMonth() >= 9 ? d.getUTCFullYear()+1 : d.getUTCFullYear();
};
const weighted = values => {
  let total=0, weights=0;
  values.forEach((v,i)=>{
    if (!Number.isFinite(v)) return;
    const w=Math.pow(0.90,i);
    total+=v*w; weights+=w;
  });
  return weights ? total/weights : null;
};
const fieldIndex = (payload, aliases) => {
  const names=(payload.names||[]).map(x=>String(x).toLowerCase());
  const labels=(payload.labels||[]).map(x=>String(x).toLowerCase());
  for(const alias of aliases){
    let i=names.indexOf(alias.toLowerCase());
    if(i<0) i=labels.indexOf(alias.toLowerCase());
    if(i>=0) return i;
  }
  return -1;
};
function readRoster(payload) {
  const raw=payload?.athletes || payload?.roster?.athletes || payload?.entries || payload?.team?.athletes || [];
  return raw.map(row=>row.athlete||row).filter(p=>p && p.id && (p.displayName||p.fullName||p.shortName));
}
function readGameRows(payload) {
  const events=payload?.events || payload?.seasonTypes?.flatMap(t=>t.categories||[]) || [];
  const idx={
    min:fieldIndex(payload,['minutes','MIN']),
    pts:fieldIndex(payload,['points','PTS']),
    reb:fieldIndex(payload,['rebounds','REB']),
    ast:fieldIndex(payload,['assists','AST']),
    three:fieldIndex(payload,['threePointsMade','3PT']),
    stl:fieldIndex(payload,['steals','STL']),
    blk:fieldIndex(payload,['blocks','BLK'])
  };
  return events.map(event=>{
    const stats=event.stats||event.statistics||[];
    const get=(key)=>{
      const i=idx[key];
      if(i<0 || stats[i]==null) return null;
      const value=String(stats[i]);
      if(key==='min') return numeric(value.split(':')[0]);
      if(key==='three' && value.includes('-')) return numeric(value.split('-')[0]);
      return numeric(value);
    };
    return {
      date:event.date||event.eventDate,
      min:get('min'), pts:get('pts'), reb:get('reb'), ast:get('ast'),
      three:get('three'), stl:get('stl'), blk:get('blk'),
      didNotPlay:!!(event.didNotPlay || event.didNotParticipate)
    };
  }).filter(g=>!g.didNotPlay && g.date && g.min!=null && g.min>0 && g.pts!=null)
    .sort((a,b)=>new Date(b.date)-new Date(a.date))
    .slice(0,MAX_GAMES);
}
async function getRoster(teamId) {
  const data=await api(base('nba','nba')+'/teams/'+encodeURIComponent(teamId)+'/roster',{}, {ttl:900});
  return readRoster(data);
}
async function getPlayerLog(playerId, season) {
  const path='/apis/common/v3/sports/basketball/nba/athletes/'+encodeURIComponent(playerId)+'/gamelog';
  const key=playerId+':'+season;
  const hit=CACHE.get(key);
  if(hit && Date.now()-hit.time<15*60*1000) return hit.value;
  let data;
  try {
    data=await api(path,{season},{host:'web',ttl:900});
    let rows=readGameRows(data);
    if(!rows.length) {
      data=await api(path,{}, {host:'web',ttl:900});
      rows=readGameRows(data);
    }
    CACHE.set(key,{time:Date.now(),value:rows});
    return rows;
  } catch(e) {
    return [];
  }
}
function projectPlayer(player, games) {
  const avg=key=>weighted(games.map(g=>g[key]));
  const minutes=avg('min');
  if(minutes==null || games.length<MIN_GAMES) return null;
  const pts=avg('pts'), reb=avg('reb'), ast=avg('ast'), three=avg('three'), stl=avg('stl'), blk=avg('blk');
  const lastFive=games.slice(0,5);
  const recentPts=weighted(lastFive.map(g=>g.pts));
  const recentMin=weighted(lastFive.map(g=>g.min));
  const trend=recentPts!=null&&pts!=null?recentPts-pts:0;
  // Minutos recentes recebem peso moderado; não extrapola tendência agressivamente.
  const minutesAdj=minutes!=null&&recentMin!=null?Math.max(-2.5,Math.min(2.5,(recentMin-minutes)*0.25)):0;
  const rate=minutes>0?Math.max(0.65,Math.min(1.15,(minutes+minutesAdj)/minutes)):1;
  const projected={
    min:round(minutes+minutesAdj), pts:round(pts*rate), reb:round(reb*rate),
    ast:round(ast*rate), three:round((three||0)*rate), stl:round((stl||0)*rate),
    blk:round((blk||0)*rate)
  };
  const volatility=games.map(g=>g.pts).reduce((s,v)=>s+Math.pow(v-pts,2),0)/games.length;
  const consistency=round(100/(1+Math.sqrt(volatility)/10),0);
  return {
    id:String(player.id), name:player.displayName||player.fullName||player.shortName,
    position:player.position?.abbreviation||player.position?.name||'',
    games:games.length, average:{min:round(minutes),pts:round(pts),reb:round(reb),ast:round(ast)},
    projected, pra:round(projected.pts+projected.reb+projected.ast),
    consistency, trend:round(trend)
  };
}
async function teamProjections(teamId, season) {
  const roster=await getRoster(teamId).catch(()=>[]);
  if(!roster.length) return [];
  const candidates=roster.slice(0,30);
  const logs=await Promise.all(candidates.map(async player=>({
    player, games:await getPlayerLog(player.id,season)
  })));
  return logs.map(x=>projectPlayer(x.player,x.games)).filter(Boolean)
    .sort((a,b)=>b.average.min-a.average.min).slice(0,MAX_PLAYERS_PER_TEAM);
}
export async function getGouveiaPlayerProjections(match) {
  if(!match || match.sk!=='nba' || match.state!=='pre') {
    return {available:false,reason:'Projeções individuais disponíveis nesta etapa apenas para jogos pré-jogo da NBA.'};
  }
  try {
    const season=seasonFor(match.date);
    const [home,away]=await Promise.all([
      teamProjections(match.home.id,season),
      teamProjections(match.away.id,season)
    ]);
    if(!home.length && !away.length) return {available:false,reason:'Não foi possível obter game logs individuais para este confronto.'};
    return {
      available:true,season,
      teams:[
        {id:String(match.home.id),name:match.home.name,players:home},
        {id:String(match.away.id),name:match.away.name,players:away}
      ],
      note:'Projeções experimentais calculadas com até 10 jogos recentes disponíveis. Não confirmam escalação, minutos futuros ou condição física; desfalques e restrições de minutos podem alterar os números.'
    };
  } catch(e) {
    return {available:false,reason:'Falha ao carregar os históricos individuais.'};
  }
}
