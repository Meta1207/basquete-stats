// Basquete Gouveia Play — utils.js


/* =========================================================
   UTILIDADES DE DATA
   ========================================================= */
function addDays(d,n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }
function isoLocal(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function ymd(d){ return d.getFullYear()+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0'); }
function sameDay(a,b){ return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate(); }
function startOfDay(d){ return new Date(d.getFullYear(),d.getMonth(),d.getDate()); }
const MES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const MESC = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const fmtDay = d => `${String(d.getDate()).padStart(2,'0')} ${MESC[d.getMonth()]}`;
const fmtFull = d => d.toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});
const fmtTime = d => d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
const fmtDT = d => d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'})+' · '+fmtTime(d);
const esc = s => String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num = v => { if(v==null) return null; if(typeof v==='object') v = v.value ?? v.displayValue; const n = parseFloat(String(v).replace(',','.')); return isNaN(n)?null:n; };

export { MES, MESC, addDays, esc, fmtDT, fmtDay, fmtFull, fmtTime, isoLocal, num, sameDay, startOfDay, ymd };
