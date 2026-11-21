// Basquete Gouveia Play — config.js


/* =========================================================
   CONFIGURAÇÃO DE ESPORTES / COMPETIÇÕES
   ========================================================= */
const SPORTS = {
  nba:    { label:'NBA',     sport:'basketball', icon:'ball',   period:'Q',   periodName:'Quarto',
            leagues:[{id:'nba',name:'NBA'},{id:'wnba',name:'WNBA'}] },
  futebol:{ label:'Futebol', sport:'soccer',     icon:'soccer', period:'T',   periodName:'Tempo',
            leagues:[{id:'bra.1',name:'Brasileirão Série A'},{id:'bra.2',name:'Brasileirão Série B'},{id:'bra.copa_do_brazil',name:'Copa do Brasil'},
                     {id:'conmebol.libertadores',name:'Libertadores'},{id:'conmebol.sudamericana',name:'Sul-Americana'},
                     {id:'uefa.champions',name:'Champions League'},{id:'eng.1',name:'Premier League'},{id:'esp.1',name:'La Liga'},
                     {id:'ita.1',name:'Serie A (Itália)'},{id:'ger.1',name:'Bundesliga'},{id:'fra.1',name:'Ligue 1'},
                     {id:'por.1',name:'Liga Portugal'},{id:'usa.1',name:'MLS'},{id:'fifa.world',name:'Copa do Mundo'}] },
  tenis:  { label:'Tênis',   sport:'tennis',     icon:'tennis', period:'Set', periodName:'Set',
            leagues:[{id:'atp',name:'ATP'},{id:'wta',name:'WTA'}] }
};

export { SPORTS };
