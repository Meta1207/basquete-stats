// Basquete Gouveia Play — views/settings.js
import { SPORTS } from '../config.js';
import { V, go, syncTabs } from '../router.js';
import { memo } from '../services/espn.js';
import { S, store } from '../state.js';
import { sportSelect, toast } from '../ui/components.js';
import { ic, paintIcons } from '../ui/icons.js';
import { esc } from '../utils.js';
import { clearTeams } from '../views/home.js';

/* =========================================================
   CONFIGURAÇÕES
   ========================================================= */
function applyTheme(){ ['azul','verde','preto'].forEach(theme=>document.body.classList.toggle('theme-'+theme,S.theme===theme)); }
function renderConfig(){
  V.innerHTML=`<div class="card glow"><div class="ch">${ic('gear')}<h3>Configurações</h3></div>
    <div class="setrow"><div><b>Cor principal</b><p>Identidade visual do aplicativo</p></div><div class="sw"><button data-th="laranja" class="${S.theme==='laranja'?'on':''}" style="background:#ff8a1f" title="Laranja"></button><button data-th="azul" class="${S.theme==='azul'?'on':''}" style="background:#2f8cff" title="Azul"></button><button data-th="verde" class="${S.theme==='verde'?'on':''}" style="background:#22c55e" title="Verde"></button><button data-th="preto" class="${S.theme==='preto'?'on':''}" style="background:#090909;border:1px solid #777" title="Preto"></button></div></div>
    <div class="setrow"><div><b>Esporte padrão</b><p>Abre o app neste esporte</p></div>${sportSelect('cfgSp')}</div>
    <div class="setrow"><div><b>Liga de futebol padrão</b><p>Usada no Início, Ao vivo e Totais</p></div><select class="sel" id="cfgFut">${SPORTS.futebol.leagues.map(l=>`<option value="${l.id}" ${S.league.futebol===l.id?'selected':''}>${esc(l.name)}</option>`).join('')}</select></div>
    <div class="setrow"><div><b>Circuito de tênis padrão</b></div><select class="sel" id="cfgTen">${SPORTS.tenis.leagues.map(l=>`<option value="${l.id}" ${S.league.tenis===l.id?'selected':''}>${l.name}</option>`).join('')}</select></div>
    <div class="setrow"><div><b>Jogador em destaque</b><p>${esc(S.favPlayer.name)} · altere em Estatísticas → ☆ Favoritar</p></div><button class="btn ghost sm" id="goSt">Escolher</button></div>
    <div class="setrow"><div><b>Atualizar dados</b><p>Limpa o cache local e busca tudo de novo</p></div><button class="btn ghost sm" id="clr">${ic('refresh')} Limpar cache</button></div>
    <div class="setrow"><div><b>Fonte dos dados</b><p>ESPN — placares ao vivo, calendário, box scores, estatísticas por período, histórico de temporadas anteriores e confrontos. Nenhum dado é simulado.</p></div></div>
    <div class="setrow"><div><b>Fuso horário</b><p>${esc(Intl.DateTimeFormat().resolvedOptions().timeZone)} (automático)</p></div></div>
    <div class="setrow"><div><b>Versão</b><p>Basquete Gouveia Play 3.0</p></div></div>
  </div>`;
  paintIcons(V);
  V.querySelectorAll('[data-th]').forEach(b=>b.onclick=()=>{ S.theme=b.dataset.th; store.set('theme2',S.theme); applyTheme(); renderConfig(); });
  V.querySelector('#cfgSp').onchange=e=>{ S.sport=e.target.value; store.set('sport',S.sport); syncTabs(); toast('Esporte padrão salvo'); };
  V.querySelector('#cfgFut').onchange=e=>{ S.league.futebol=e.target.value; store.set('league',S.league); toast('Liga salva'); };
  V.querySelector('#cfgTen').onchange=e=>{ S.league.tenis=e.target.value; store.set('league',S.league); toast('Circuito salvo'); };
  V.querySelector('#goSt').onclick=()=>{ S.sport='nba'; go('estatisticas'); };
  V.querySelector('#clr').onclick=()=>{ memo.clear(); clearTeams(); toast('Cache limpo'); };
}

export { applyTheme, renderConfig };
