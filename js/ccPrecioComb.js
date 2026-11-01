// ══ COST CONTROL · PRECIO DE COMBUSTIBLE POR PERÍODO ══
// Con «Precio manual» activado, el combustible de cada período 21→20 se
// valoriza con SU precio, grabado en Supabase (sql/cc_precio_combustible.sql)
// para que lo vea todo el equipo. La matriz Anual usa el precio de cada mes.
//
//   · Período con precio grabado        → ese precio.
//   · Período sin precio                → el último grabado de un período anterior.
//   · Ninguno grabado antes de ese mes  → el precio promedio real de los despachos.
//
// Solo el administrador (EIBEL25) graba; la base lo exige, no solo la pantalla.
// Mientras la tabla no exista (SQL sin correr) todo sigue como antes: un solo
// precio guardado en el navegador.
const _CCPC_TABLA='cc_precio_combustible';
const _CCPC_ADMIN='EIBEL25';
const _CCPC_FRESCO=60000;      // sin forzar, se relee como mucho una vez por minuto
let _ccpcPrecios={};           // 'AAAA-MM-20' → {precio,por,en}
let _ccpcCarga='';             // '' · 'cargando' · 'ok' · 'error'
let _ccpcErr='', _ccpcT=0, _ccpcProm=null;
let _ccpcVer=0;                // sube con cada cambio: invalida el caché de la matriz Anual
let _ccpcGuardando='';         // período que se está grabando
let _ccpcAnio=0;               // año que muestra la lista de precios

const _ccpcEsAdmin=()=>typeof CU!=='undefined'&&!!CU&&String(CU.codigo||'').trim().toUpperCase()===_CCPC_ADMIN;
const _ccpcActivo=()=>_ccpcCarga==='ok';
const _ccpcEsc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const _CCPC_MESES=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
// '2026-10-20' → 'Octubre 2026' (el período lleva el nombre del mes en que termina)
function _ccpcEtiqueta(hasta){
  const[y,m]=String(hasta).split('-');
  return (_CCPC_MESES[(+m||1)-1]||'')+' '+y;
}
function _ccpcFechaHora(iso){
  const d=new Date(iso);if(!iso||!isFinite(d.getTime()))return'';
  const p=n=>String(n).padStart(2,'0');
  return`${p(d.getDate())}/${p(d.getMonth()+1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// ── Lectura ────────────────────────────────────────────────────────────────
function _ccpcCargar(forzar){
  if(_ccpcProm)return _ccpcProm;
  if(!forzar&&_ccpcT&&Date.now()-_ccpcT<_CCPC_FRESCO)return Promise.resolve();
  if(typeof supa==='undefined')return Promise.resolve();
  const antes=_ccpcCarga+JSON.stringify(_ccpcPrecios);
  _ccpcProm=(async()=>{
    try{
      const{data,error}=await supa.from(_CCPC_TABLA).select('*');
      if(error)throw error;
      const nuevo={};
      (data||[]).forEach(r=>{const k=String(r.periodo||'').slice(0,10);
        if(k&&+r.precio>0)nuevo[k]={precio:+r.precio,por:r.actualizado_por||'',en:r.actualizado_en||''};});
      _ccpcPrecios=nuevo;_ccpcCarga='ok';_ccpcErr='';
    }catch(e){
      console.warn('[Precio combustible por período]',e);_ccpcCarga='error';
      _ccpcErr=(e&&e.code==='PGRST205')?'falta la tabla':String((e&&e.message)||e);
    }
    _ccpcT=Date.now();_ccpcProm=null;
    if(antes!==_ccpcCarga+JSON.stringify(_ccpcPrecios))_ccpcCambio();
  })();
  return _ccpcProm;
}
// Algo cambió: la matriz Anual se recalcula y la pantalla abierta se redibuja
function _ccpcCambio(){
  _ccpcVer++;
  if(typeof _ccaCache!=='undefined')_ccaCache=null;
  const act=document.querySelector&&document.querySelector('.page.active');
  if(act&&act.id==='page-costControl'&&typeof rCostControl==='function')rCostControl();
  if(document.getElementById('ccpcOverlay'))_ccpcPintar();
}

// ── El precio de un período ────────────────────────────────────────────────
// null = no hay nada grabado que aplique (Cost Control decide el respaldo)
function _ccpcPara(hasta){
  if(!_ccpcActivo())return null;
  const e=_ccpcPrecios[hasta];
  if(e)return{precio:e.precio,fuente:'grabado',periodo:hasta};
  const ant=Object.keys(_ccpcPrecios).filter(k=>k<hasta).sort().pop();
  return ant?{precio:_ccpcPrecios[ant].precio,fuente:'anterior',periodo:ant}:null;
}
// Texto corto de dónde salió el precio, para la barra y los exportes
function _ccpcFuenteTxt(fuente,periodo){
  return fuente==='grabado'?'grabado para este período'
    :fuente==='anterior'?'sin precio propio · usa el de '+_ccpcEtiqueta(periodo)
    :fuente==='real'?'sin precio grabado · promedio real de despachos'
    :'';
}

// ── Grabar ─────────────────────────────────────────────────────────────────
// Vacío o 0 quita el precio del período (vuelve a usar el anterior)
async function _ccpcGuardar(hasta,valor){
  const redibujar=()=>{
    if(typeof rCostControl==='function'&&document.getElementById('page-costControl'))rCostControl();
    if(document.getElementById('ccpcOverlay'))_ccpcPintar();
  };
  if(!_ccpcEsAdmin()){toast('Solo el administrador graba el precio del combustible',true);redibujar();return;}
  if(_ccpcGuardando)return;
  const n=Math.round((parseFloat(String(valor).replace(',','.'))||0)*10000)/10000;
  const lab=_ccpcEtiqueta(hasta);
  if(n<0||n>1000){toast('Precio fuera de rango: indique S/ por galón',true);redibujar();return;}
  if(n===0&&!_ccpcPrecios[hasta]){redibujar();return;}
  if(n>0&&_ccpcPrecios[hasta]&&_ccpcPrecios[hasta].precio===n){redibujar();return;}
  if(n===0&&!confirm(`¿Quitar el precio grabado de ${lab}?\n\nEse período usará el último precio grabado antes de él.`)){redibujar();return;}
  _ccpcGuardando=hasta;
  try{
    let r;
    if(n>0){
      r=await supa.from(_CCPC_TABLA).upsert({periodo:hasta,precio:n,
        actualizado_por:String(CU.nombre||CU.codigo||''),actualizado_en:new Date().toISOString()}).select();
    }else{
      r=await supa.from(_CCPC_TABLA).delete().eq('periodo',hasta).select();
    }
    if(r.error)throw r.error;
    // Sin filas de vuelta = la base no dejó escribir (permiso)
    if(!r.data||!r.data.length)throw new Error('la base no aceptó el cambio (¿sesión de administrador?)');
    if(n>0){const f=r.data[0];_ccpcPrecios[hasta]={precio:+f.precio,por:f.actualizado_por||'',en:f.actualizado_en||''};}
    else delete _ccpcPrecios[hasta];
    _ccpcGuardando='';
    toast(n>0?`✓ ${lab}: S/ ${n.toFixed(2)}/gal grabado`:`✓ ${lab}: precio quitado`);
    _ccpcCambio();
  }catch(e){
    _ccpcGuardando='';
    console.warn('[Precio combustible por período]',e);
    toast('No se pudo grabar el precio: '+((e&&e.message)||e),true);
    redibujar();
  }
}

// ── Lista de precios del año ───────────────────────────────────────────────
function _ccpcAbrir(){
  if(!_ccpcActivo()){
    toast(_ccpcErr==='falta la tabla'
      ?'Falta crear la tabla: ejecute sql/cc_precio_combustible.sql en Supabase'
      :'Los precios por período aún no cargan'+(_ccpcErr?': '+_ccpcErr:''),true);
    _ccpcCargar(true);return;
  }
  _ccpcAnio=+String(_ccPeriodo().hasta).slice(0,4);
  const ov=document.createElement('div');
  ov.id='ccpcOverlay';
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9000;display:flex;align-items:center;justify-content:center;padding:16px';
  ov.onclick=e=>{if(e.target===ov)_ccpcCerrar();};
  document.body.appendChild(ov);
  document.addEventListener('keydown',_ccpcTecla);
  _ccpcPintar();
}
function _ccpcTecla(e){if(e.key==='Escape')_ccpcCerrar();}
function _ccpcCerrar(){
  const o=document.getElementById('ccpcOverlay');if(o)o.remove();
  document.removeEventListener('keydown',_ccpcTecla);
}
function _ccpcAnioNav(d){_ccpcAnio+=d;_ccpcPintar();}
function _ccpcPintar(){
  const ov=document.getElementById('ccpcOverlay');if(!ov)return;
  const adm=_ccpcEsAdmin(), visto=_ccPeriodo().hasta, C='#f97316';
  const pers=typeof _ccaPeriodos==='function'?_ccaPeriodos(_ccpcAnio):[];
  const TD='padding:.4rem .55rem;border-bottom:1px solid var(--border);font-size:.76rem;vertical-align:middle';
  const TH='padding:.4rem .55rem;font-size:.62rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted2);text-align:left;white-space:nowrap';
  const fd=iso=>iso.slice(8,10)+'/'+iso.slice(5,7);
  const filas=pers.map(p=>{
    const e=_ccpcPrecios[p.hasta], u=_ccpcPara(p.hasta), esVisto=p.hasta===visto;
    const celda=adm
      ?`<input type="number" step="0.01" min="0" value="${e?e.precio:''}" placeholder="${u?u.precio.toFixed(2):'—'}"
          ${_ccpcGuardando?'disabled':''} onchange="_ccpcGuardar('${p.hasta}',this.value)"
          style="width:82px;background:var(--panel2);border:1px solid ${e?C:'var(--border)'};border-radius:6px;color:var(--text);font-family:monospace;font-weight:700;font-size:.8rem;padding:.2rem .4rem;text-align:right">`
      :`<span style="font-family:monospace;font-weight:700;color:${e?C:'var(--muted2)'}">${e?e.precio.toFixed(2):'—'}</span>`;
    const nota=e?`<span style="color:#10b981">grabado</span>${e.por?` · ${_ccpcEsc(e.por)}`:''}${e.en?` · ${_ccpcFechaHora(e.en)}`:''}`
      :u?`usa S/ ${u.precio.toFixed(2)} de ${_ccpcEtiqueta(u.periodo)}`
      :'<span style="color:#f59e0b">sin precio · promedio real de despachos</span>';
    return`<tr style="${esVisto?'background:rgba(249,115,22,.08)':''}">
      <td style="${TD};font-weight:700;white-space:nowrap">${_ccpcEtiqueta(p.hasta)}${esVisto?' <span style="font-size:.6rem;color:'+C+'">◀ en pantalla</span>':''}</td>
      <td style="${TD};font-family:monospace;color:var(--muted2);white-space:nowrap">${fd(p.desde)} → ${fd(p.hasta)}</td>
      <td style="${TD};text-align:right;white-space:nowrap">${celda}</td>
      <td style="${TD};font-size:.68rem;color:var(--muted2)">${nota}</td>
    </tr>`;
  }).join('');
  ov.innerHTML=`<div style="background:var(--panel);border:1px solid ${C};border-radius:12px;width:min(720px,100%);max-height:90vh;overflow:auto;box-shadow:0 20px 50px rgba(0,0,0,.5)">
    <div style="display:flex;align-items:center;gap:.6rem;padding:.75rem 1rem;border-bottom:1px solid var(--border);background:rgba(249,115,22,.08)">
      <div style="flex:1">
        <div style="font-weight:900;font-size:.95rem;color:${C}">⛽ Precio de combustible por período</div>
        <div style="font-size:.68rem;color:var(--muted2);margin-top:.1rem">S/ por galón con IGV · se usa con «Precio manual» activado${adm?'':' · solo el administrador lo graba'}</div>
      </div>
      <div style="display:flex;align-items:center;border:1px solid var(--border);border-radius:7px;overflow:hidden">
        <button onclick="_ccpcAnioNav(-1)" style="background:none;border:none;color:var(--text);cursor:pointer;padding:.2rem .6rem">‹</button>
        <span style="font-weight:800;font-family:monospace;padding:0 .3rem">${_ccpcAnio}</span>
        <button onclick="_ccpcAnioNav(1)" style="background:none;border:none;color:var(--text);cursor:pointer;padding:.2rem .6rem">›</button>
      </div>
      <button onclick="_ccpcCerrar()" title="Cerrar (Esc)" style="background:transparent;border:1px solid var(--border);color:var(--muted2);border-radius:7px;cursor:pointer;padding:.2rem .55rem;font-size:.8rem">✕</button>
    </div>
    <div style="padding:.6rem 1rem 1rem">
      <div class="tbl-wrap"><table style="width:100%;border-collapse:collapse">
        <thead><tr style="background:var(--panel2)"><th style="${TH}">Período</th><th style="${TH}">21 → 20</th><th style="${TH};text-align:right">S/ / gal</th><th style="${TH}">Origen del precio</th></tr></thead>
        <tbody>${filas}</tbody>
      </table></div>
      <div style="font-size:.66rem;color:var(--muted2);margin-top:.55rem;line-height:1.5">
        Un período sin precio propio usa el último grabado antes de él.${adm?' Para quitar un precio, borre el número.':''}</div>
    </div>
  </div>`;
}
