// Basquete Gouveia Play — state.js
import { addDays } from './utils.js';

/* =========================================================
   ESTADO / PREFERÊNCIAS
   ========================================================= */
const store = {
  get(k, d){ try{ const v = localStorage.getItem('bsp_'+k); return v==null?d:JSON.parse(v); }catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem('bsp_'+k, JSON.stringify(v)); }catch(e){} }
};
const S = {
  view: 'inicio',
  tab: 'nba',
  sport: store.get('sport','nba'),
  league: store.get('league',{nba:'nba',futebol:'bra.1',tenis:'atp'}),
  theme: store.get('theme2','laranja'),
  favPlayer: store.get('favPlayer',{id:'3975',name:'Stephen Curry',team:'Golden State Warriors'}),
  calDate: new Date(),
  calMonth: null,
  calMode: 'anteriores',
  resDate: addDays(new Date(),-1),
  resDays: 1,
  resTeam: null,
  homeMode: 'anteriores',
  statSeason: null,
  statN: 10,
  statMarket: 'PTS',
  statLine: '',
  player: null
};
S.calMonth = new Date(S.calDate.getFullYear(), S.calDate.getMonth(), 1);

export { S, store };
