// ══════════════════════════════════════════════════════════════════════════
//  🔔 AVISOS AUTOMÁTICOS · la campana de la cabecera
//
//  Muestra los avisos que la base deja cada mañana (sql/avisos_automaticos.sql):
//  documentos de equipos por vencer o vencidos y partes de turno no recibidos.
//  El correo diario lo manda la Edge Function avisos-diarios; esto es lo que
//  se ve dentro del sistema.
//
//  · Cada quien ve solo los avisos de los módulos a los que tiene acceso.
//  · El número rojo cuenta los que todavía no abrió (se recuerda en este
//    navegador, por el id más alto visto).
//  · La gente de campo (un solo módulo) no consulta nada: su carga es liviana.
//  · Si la tabla aún no existe (falta correr el SQL), la campana no aparece.
//
//  Prefijo _av.
// ══════════════════════════════════════════════════════════════════════════

const _AV_DIAS=7;                      // cuántos días hacia atrás se muestran
const _AV_LS='gdar_av_visto';
const _AV_NIVEL={
  vencido:{c:'#ef4444',t:'Vencido'},
  urgente:{c:'#f97316',t:'Urgente'},
  falta:  {c:'#f59e0b',t:'Falta'},
  proximo:{c:'#eab308',t:'Próximo'}
};
let _avLista=[];
const _avEsc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

// ¿Este usuario puede abrir ese módulo? Misma regla que el menú lateral
function _avPuedeVer(mod){
  if(typeof CU==='undefined'||!CU||!Array.isArray(CU.areas)||!mod)return false;
  const excl=new Set(CU.excludeModules||[]);
  if(excl.has(mod))return false;
  return CU.areas.some(ak=>{
    const a=(typeof AREAS!=='undefined'&&AREAS[ak])||null;if(!a)return false;
    const claves=[];
    (a.modules||[]).forEach(m=>{if(m.isSubgroup)(m.children||[]).forEach(c=>claves.push(c.key));else claves.push(m.key);});
    if(!claves.includes(mod))return false;
    const lista=(CU.areaModules&&CU.areaModules[ak])||CU.modules||null;
    return !lista||lista.includes(mod);
  });
}

function _avVisto(){try{return +localStorage.getItem(_AV_LS)||0;}catch(e){return 0;}}
function _avMarcarVisto(){
  const max=_avLista.reduce((m,a)=>Math.max(m,+a.id||0),0);
  try{localStorage.setItem(_AV_LS,String(max));}catch(e){}
}
function _avNuevos(){const v=_avVisto();return _avLista.filter(a=>+a.id>v).length;}

function _avHaceDias(n){
  const d=new Date(Date.now()-5*3600*1000);            // hoy en Perú
  d.setUTCDate(d.getUTCDate()-n);
  return d.toISOString().slice(0,10);
}

async function _avCargar(){
  _avEstilos();
  const btn=document.getElementById('btnAvisos');
  // Gente de campo: nada que consultar (y su carga debe seguir liviana)
  if(typeof _cuModuloUnico==='function'&&_cuModuloUnico()){if(btn)btn.style.display='none';return;}
  try{
    const{data,error}=await supa.from('avisos').select('*').gte('fecha',_avHaceDias(_AV_DIAS))
      .order('fecha',{ascending:false}).order('id',{ascending:false});
    if(error){if(btn)btn.style.display='none';return;}     // sin la tabla todavía
    _avLista=(data||[]).filter(a=>_avPuedeVer(a.modulo));
  }catch(e){_avLista=[];}
  _avPintarBoton();
}

function _avPintarBoton(){
  const btn=document.getElementById('btnAvisos');if(!btn)return;
  btn.style.display=_avLista.length?'':'none';
  const n=_avNuevos();
  const b=document.getElementById('avBadge');
  if(b){b.textContent=n>99?'99+':String(n);b.style.display=n?'':'none';}
  btn.title=_avLista.length?(n?n+' aviso(s) nuevo(s)':'Avisos de los últimos '+_AV_DIAS+' días'):'';
}

function _avFechaEtq(iso){
  if(iso===_avHaceDias(0))return 'Hoy';
  if(iso===_avHaceDias(1))return 'Ayer';
  const[y,m,d]=String(iso).split('-');return d+'/'+m+'/'+y;
}

function _avPanelHtml(){
  if(!_avLista.length)return '<div class="av-vacio">Sin avisos en los últimos '+_AV_DIAS+' días.</div>';
  const v=_avVisto();
  const grupos=[];
  _avLista.forEach(a=>{let g=grupos.find(x=>x.f===a.fecha);if(!g){g={f:a.fecha,l:[]};grupos.push(g);}g.l.push(a);});
  return grupos.map(g=>`<div class="av-dia">${_avEsc(_avFechaEtq(g.f))} · ${g.l.length}</div>`+
    g.l.map(a=>{const nv=_AV_NIVEL[a.nivel]||{c:'#64748b',t:a.nivel};
      return `<button type="button" class="av-item${+a.id>v?' av-nuevo':''}" style="border-left-color:${nv.c}" onclick="_avIr('${_avEsc(a.modulo)}')">
        <span class="av-nivel" style="color:${nv.c}">${_avEsc(nv.t)}</span>
        <span class="av-tit">${_avEsc(a.titulo)}</span>
        ${a.detalle?`<span class="av-det">${_avEsc(a.detalle)}</span>`:''}
      </button>`;}).join('')).join('');
}

function _avToggle(ev){
  if(ev)ev.stopPropagation();
  let p=document.getElementById('avPanel');
  if(p){p.remove();return;}
  _avEstilos();
  p=document.createElement('div');
  p.id='avPanel';
  p.innerHTML=`<div class="av-head"><b>🔔 Avisos</b><span>últimos ${_AV_DIAS} días</span></div><div class="av-lista">${_avPanelHtml()}</div>`;
  document.body.appendChild(p);
  _avMarcarVisto();
  _avPintarBoton();
  setTimeout(()=>document.addEventListener('mousedown',function cerrar(e){
    const q=document.getElementById('avPanel');
    if(!q){document.removeEventListener('mousedown',cerrar);return;}
    if(!q.contains(e.target)&&!(e.target.closest&&e.target.closest('#btnAvisos'))){q.remove();document.removeEventListener('mousedown',cerrar);}
  }),30);
}
function _avIr(mod){
  const p=document.getElementById('avPanel');if(p)p.remove();
  if(mod&&typeof setPage==='function')setPage(mod);
}

function _avEstilos(){
  if(document.getElementById('avEstilos'))return;
  const s=document.createElement('style');s.id='avEstilos';
  s.textContent=`
  #btnAvisos{position:relative;background:transparent;border:1px solid var(--border);border-radius:8px;color:var(--text);cursor:pointer;font-size:.95rem;padding:.3rem .55rem;line-height:1}
  #btnAvisos:hover{border-color:#f59e0b}
  #avBadge{position:absolute;top:-6px;right:-6px;min-width:17px;height:17px;padding:0 4px;border-radius:999px;background:#ef4444;color:#fff;font-size:.62rem;font-weight:800;line-height:17px;text-align:center}
  #avPanel{position:fixed;top:58px;right:12px;z-index:9999;width:min(420px,calc(100vw - 24px));max-height:70vh;display:flex;flex-direction:column;background:var(--panel);border:1px solid var(--border);border-radius:12px;box-shadow:0 12px 36px rgba(0,0,0,.6)}
  .av-head{display:flex;justify-content:space-between;align-items:baseline;padding:.7rem .9rem;border-bottom:1px solid var(--border)}
  .av-head b{font-size:.9rem;color:var(--text)}.av-head span{font-size:.68rem;color:var(--muted2)}
  .av-lista{overflow-y:auto;padding:.4rem .5rem .6rem;display:flex;flex-direction:column;gap:.3rem}
  .av-dia{font-size:.6rem;font-weight:800;letter-spacing:.09em;text-transform:uppercase;color:var(--muted2);padding:.5rem .3rem .15rem}
  .av-item{display:flex;flex-direction:column;align-items:flex-start;gap:.1rem;text-align:left;width:100%;background:var(--panel2);border:1px solid var(--border);border-left:4px solid;border-radius:7px;padding:.45rem .6rem;cursor:pointer;color:var(--text);font-family:inherit}
  .av-item:hover{border-color:#f59e0b}
  .av-item.av-nuevo{box-shadow:inset 0 0 0 1px rgba(245,158,11,.35)}
  .av-nivel{font-size:.58rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
  .av-tit{font-size:.78rem;font-weight:700}
  .av-det{font-size:.68rem;color:var(--muted2)}
  .av-vacio{padding:1.2rem;text-align:center;font-size:.8rem;color:var(--muted2)}`;
  document.head.appendChild(s);
}
