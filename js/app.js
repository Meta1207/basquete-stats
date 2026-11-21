// Basquete Gouveia Play — app.js
import { go } from './router.js';
import { refreshLiveRows } from './services/live-updater.js';
import { S } from './state.js';
import { paintIcons } from './ui/icons.js';
import { closeModal } from './views/game.js';
import { applyTheme } from './views/settings.js';

/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */
applyTheme();
paintIcons();
window.BSP = { refreshLiveRows, go, S };
document.addEventListener('keydown',e=>{ if(e.key==='Escape') closeModal(); });
go('inicio');


