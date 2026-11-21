// Basquete Gouveia Play — ui/icons.js


/* =========================================================
   ÍCONES
   ========================================================= */
const ICONS = {
  ball:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="12" r="9.5"/><path d="M2.5 12h19M12 2.5v19M5.3 5.3c3 2.6 3 10.8 0 13.4M18.7 5.3c-3 2.6-3 10.8 0 13.4"/></svg>',
  soccer:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><circle cx="12" cy="12" r="9.5"/><path d="M12 7.5l4 2.9-1.5 4.7h-5L8 10.4z"/><path d="M12 7.5V3M16 10.4l4.3-1.4M14.5 15.1l2.7 3.7M9.5 15.1l-2.7 3.7M8 10.4L3.7 9"/></svg>',
  tennis:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="12" cy="12" r="9.5"/><path d="M5.5 5c3.5 3.5 3.5 10.5 0 14M18.5 5c-3.5 3.5-3.5 10.5 0 14"/></svg>',
  bars:'<svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="13" width="4.2" height="8" rx="1.2"/><rect x="9.9" y="8" width="4.2" height="13" rx="1.2"/><rect x="16.8" y="3" width="4.2" height="18" rx="1.2"/></svg>',
  cal:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><rect x="3" y="4.5" width="18" height="16.5" rx="3"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/><circle cx="16" cy="15" r=".6" fill="currentColor"/><circle cx="16" cy="17.8" r=".6" fill="currentColor"/></svg>',
  user:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="10" cy="8" r="4.2"/><path d="M2.5 21c.6-4.2 3.6-6.5 7.5-6.5s6.9 2.3 7.5 6.5"/><path d="M15.5 4.2a4.2 4.2 0 0 1 0 7.6M18.5 14.8c1.8.9 2.8 2.8 3 5.2"/></svg>',
  trophy:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M7 3.5h10v5.5a5 5 0 0 1-10 0z"/><path d="M7 5.5H3.5v1.5A3.5 3.5 0 0 0 7 10.5M17 5.5h3.5v1.5a3.5 3.5 0 0 1-3.5 3.5M12 14v3.5M8 21h8l-.8-3.5H8.8z"/></svg>',
  home:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.2 2.6a1.3 1.3 0 0 1 1.6 0l8.6 7a1 1 0 0 1-.6 1.8H19V20a1.5 1.5 0 0 1-1.5 1.5H14v-6h-4v6H6.5A1.5 1.5 0 0 1 5 20v-8.6H3.2a1 1 0 0 1-.6-1.8z"/></svg>',
  gear:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><circle cx="12" cy="12" r="3.2"/><path d="M12 2.5l2 .4.6 2.3 1.6.9 2.3-.7 1.4 1.4-.7 2.3.9 1.6 2.3.6v2l-2.3.6-.9 1.6.7 2.3-1.4 1.4-2.3-.7-1.6.9-.6 2.3h-2l-.6-2.3-1.6-.9-2.3.7-1.4-1.4.7-2.3-.9-1.6-2.3-.6v-2l2.3-.6.9-1.6-.7-2.3 1.4-1.4 2.3.7 1.6-.9.6-2.3z"/></svg>',
  search:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/></svg>',
  left:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  right:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
  check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 12.5l5 5L19.5 7"/></svg>',
  close:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  swords:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M14.5 17.5L3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2M9.5 6.5L13 3h3v3l-3.5 3.5M5 14l2 2M3 19l3-3M5 21l-2-2"/></svg>',
  list:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/></svg>',
  refresh:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/></svg>'
};
const ic = (n, cls='') => `<span class="ico ${cls}">${ICONS[n]||''}</span>`;
function paintIcons(root=document){ root.querySelectorAll('.ico[data-i]').forEach(e=>{ e.innerHTML = ICONS[e.dataset.i]||''; }); }

export { ICONS, ic, paintIcons };
