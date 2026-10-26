// ══ CONFIGURACIÓN · CONTROL DE EDICIÓN ══
// Interruptor del administrador para abrir la corrección de registros que ya
// pasaron su tiempo de bloqueo (hoy: Kardex de Combustible, 48 h). Se guarda en
// Supabase (sql/control_edicion.sql) para que aplique a todos a la vez; la base
// solo deja escribir al administrador, no basta con ver esta pantalla.
//
// Cada apertura dice DESDE qué fecha de movimiento se abre y, si se quiere, a
// qué hora se cierra sola. Cerrada (o vencida), cada módulo vuelve a su regla.
const _CED_TABLA='control_edicion';
const _CED_ADMIN='EIBEL25';
const _CED_MODULOS={
  combustible:{label:'Kardex de Combustible',icon:'⛽',
    regla:'Cada movimiento se corrige durante sus primeras 48 horas desde que se registró; después queda con 🔒.',
    abre:'Los movimientos desde la fecha indicada vuelven a tener ✏️ editar y 🗑 eliminar. Los «Cerrado» siguen sin editarse.'}
};
let _cedEstado={};          // modulo → {activo,desde,hasta,por,en}
let _cedCarga='';           // '' · 'cargando' · 'ok' · 'error'
let _cedCargaT=0;           // cuándo terminó la última lectura (bien o mal)
let _cedErr='';             // mensaje de la última falla
let _cedPromesa=null;       // lectura en curso: quien llega mientras tanto la espera
let _cedGuardando='';       // módulo que se está guardando
const _CED_FRESCO=60000;    // sin forzar, se vuelve a leer como mucho una vez por minuto

const _cedEsAdmin=()=>typeof CU!=='undefined'&&!!CU&&String(CU.codigo||'').trim().toUpperCase()===_CED_ADMIN;
const _cedEsc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const _ced2=n=>String(n).padStart(2,'0');
const _cedFmtF=iso=>iso?String(iso).slice(0,10).split('-').reverse().join('/'):'—';
function _cedFmtFH(iso){
  const d=new Date(iso);if(!iso||!isFinite(d.getTime()))return'—';
  return`${_ced2(d.getDate())}/${_ced2(d.getMonth()+1)}/${d.getFullYear()} ${_ced2(d.getHours())}:${_ced2(d.getMinutes())}`;
}
// Valor para <input type="datetime-local"> (hora local)
function _cedLocal(t){
  const d=new Date(t);if(!isFinite(d.getTime()))return'';
  return`${d.getFullYear()}-${_ced2(d.getMonth()+1)}-${_ced2(d.getDate())}T${_ced2(d.getHours())}:${_ced2(d.getMinutes())}`;
}

function _cedFila(r){
  return{activo:!!r.activo,desde:r.desde?String(r.desde).slice(0,10):'',hasta:r.hasta||'',
    por:r.actualizado_por||'',en:r.actualizado_en||''};
}

// ¿Está abierta ahora? Activa y, si tiene cierre automático, antes de esa hora
function _cedAbierta(mod){
  const e=_cedEstado[mod];
  if(!e||!e.activo)return false;
  if(!e.hasta)return true;
  const t=new Date(e.hasta).getTime();
  return isFinite(t)&&Date.now()<t;
}
const _cedDesde=mod=>(_cedEstado[mod]&&_cedEstado[mod].desde)||'';
const _cedHasta=mod=>(_cedEstado[mod]&&_cedEstado[mod].hasta)||'';
// Lo que falta para el cierre automático, en texto («5 h», «2 d 3 h»)
function _cedRestanteTxt(mod){
  const t=new Date(_cedHasta(mod)).getTime();if(!isFinite(t))return'';
  const h=Math.max(0,Math.ceil((t-Date.now())/3600000));
  return h<48?h+' h':Math.floor(h/24)+' d '+(h%24)+' h';
}

// ── Lectura ────────────────────────────────────────────────────────────────
// Al llegar se redibuja la página abierta que lo usa (el kardex solo si cambió)
function _cedCargar(forzar){
  if(_cedPromesa)return _cedPromesa;
  if(!forzar&&_cedCargaT&&Date.now()-_cedCargaT<_CED_FRESCO)return Promise.resolve();
  if(typeof supa==='undefined')return Promise.resolve();
  _cedCarga='cargando';
  const antes=JSON.stringify(_cedEstado);
  _cedPromesa=(async()=>{
    try{
      const{data,error}=await supa.from(_CED_TABLA).select('*');
      if(error)throw error;
      const nuevo={};(data||[]).forEach(r=>{nuevo[r.modulo]=_cedFila(r);});
      _cedEstado=nuevo;_cedCarga='ok';_cedErr='';
    }catch(e){
      console.warn('[Control de edición]',e);_cedCarga='error';
      _cedErr=(e&&e.code==='PGRST205')?'falta la tabla':String((e&&e.message)||e);
    }
    _cedCargaT=Date.now();_cedPromesa=null;
    _cedRedibujar(antes!==JSON.stringify(_cedEstado));
  })();
  return _cedPromesa;
}
function _cedRedibujar(cambio){
  const act=document.querySelector('.page.active');const id=act?act.id:'';
  if(id==='page-controlEdicion')rControlEdicion();
  else if(cambio&&id==='page-combustible'&&typeof rComb==='function')rComb();
}
// Antes de guardar algo que solo se puede tocar por la edición abierta, se
// pregunta de nuevo a la base: pudo cerrarse con el formulario abierto.
// true solo si la base confirmó que sigue abierta.
async function _cedVerificar(mod){
  await _cedCargar(true);
  return _cedCarga==='ok'&&_cedAbierta(mod);
}

// ── Guardar ────────────────────────────────────────────────────────────────
// activar=true abre (o guarda los cambios de fechas); false cierra ya
async function _cedGuardar(mod,activar){
  if(!_cedEsAdmin()){toast('Solo el administrador puede cambiar la edición',true);return;}
  if(_cedGuardando)return;
  const g=id=>document.getElementById(id);
  const desde=((g('ceDesde-'+mod)||{}).value||'').trim();
  const auto=!!(g('ceAuto-'+mod)||{}).checked;
  const hastaTxt=((g('ceHasta-'+mod)||{}).value||'').trim();
  let hasta=null;
  if(activar){
    if(!desde){toast('Indique desde qué fecha de movimiento se abre',true);return;}
    if(auto){
      const t=new Date(hastaTxt).getTime();
      if(!hastaTxt||!isFinite(t)){toast('Indique la fecha y hora del cierre automático',true);return;}
      if(t<=Date.now()){toast('El cierre automático tiene que ser más adelante que ahora',true);return;}
      hasta=new Date(t).toISOString();
    }
  }
  const M=_CED_MODULOS[mod];
  if(!activar&&!confirm(`¿Cerrar ya la edición de ${M.label}?\n\nLos movimientos vuelven a su bloqueo normal.`))return;
  const fila={modulo:mod,activo:!!activar,desde:desde||_cedDesde(mod)||null,hasta,
    actualizado_por:String(CU.nombre||CU.codigo||''),actualizado_en:new Date().toISOString()};
  _cedGuardando=mod;rControlEdicion();
  try{
    const{data,error}=await supa.from(_CED_TABLA).upsert(fila).select();
    if(error)throw error;
    // Sin fila de vuelta: la base no lo aceptó (sesión que no es la del administrador)
    if(!data||!data.length)throw new Error('La base no aceptó el cambio');
    _cedEstado[mod]=_cedFila(data[0]);
    toast(activar?`🔓 Edición de ${M.label} abierta`:`🔒 Edición de ${M.label} cerrada`);
  }catch(e){
    console.warn('[Control de edición] guardar',e);
    toast('No se pudo guardar: '+((e&&e.message)||e),true);
  }
  _cedGuardando='';
  rControlEdicion();
}

// ── Pantalla ───────────────────────────────────────────────────────────────
// Fecha «desde» que se propone al abrir: el inicio del período en curso
function _cedDesdeDef(mod){
  if(mod==='combustible'&&typeof _cbPeriodoDe==='function')return _cbPeriodoDe().desde;
  const d=new Date();return`${d.getFullYear()}-${_ced2(d.getMonth()+1)}-01`;
}
function _cedTarjeta(mod){
  const M=_CED_MODULOS[mod];
  const e=_cedEstado[mod]||{activo:false,desde:'',hasta:'',por:'',en:''};
  const ab=_cedAbierta(mod), vencida=e.activo&&!ab;
  const col=ab?'#10b981':vencida?'#f59e0b':'#64748b';
  const ocupado=_cedGuardando===mod;
  // Cierre propuesto para una apertura nueva: mañana a las 23:59
  const man=new Date();man.setDate(man.getDate()+1);man.setHours(23,59,0,0);
  const vHasta=ab&&e.hasta?_cedLocal(e.hasta):_cedLocal(man);
  const auto=ab?!!e.hasta:true;
  const vDesde=(ab&&e.desde)||_cedDesdeDef(mod);
  const estado=ab
    ?`🔓 <b>Abierta</b> · movimientos desde el ${_cedFmtF(e.desde)} · ${e.hasta
      ?`se cierra sola el ${_cedFmtFH(e.hasta)} <span style="opacity:.8">(quedan ${_cedRestanteTxt(mod)})</span>`
      :'sin cierre automático: queda abierta hasta que la desactive'}`
    :vencida?`🔒 <b>Cerrada</b> · se cerró sola el ${_cedFmtFH(e.hasta)}`
    :'🔒 <b>Cerrada</b> · rige el bloqueo normal';
  const inp='background:var(--panel2);border:1px solid var(--border);border-radius:6px;padding:.35rem .6rem;font-size:.78rem;color:var(--text);font-family:inherit;color-scheme:dark';
  const lbl='font-size:.72rem;color:var(--muted2);min-width:150px';
  const btn=(c,txt,fn)=>`<button class="btn btn-sm" ${ocupado?'disabled':''} onclick="${fn}" style="background:${c}22;border:1px solid ${c};color:${c};font-weight:700;padding:.4rem .9rem;${ocupado?'opacity:.5;cursor:wait':''}">${txt}</button>`;
  return`<div class="card" style="border:1px solid ${col}">
    <div style="display:flex;align-items:center;gap:.6rem;border-bottom:1px solid var(--border);padding-bottom:.7rem;margin-bottom:.85rem">
      <span style="font-size:1.2rem">${M.icon}</span>
      <span style="font-weight:700;font-size:.9rem">${M.label}</span>
      <span style="margin-left:auto;font-size:.68rem;font-weight:700;padding:2px 10px;border-radius:12px;border:1px solid ${col};color:${col};background:${col}1f">${ab?'● ABIERTA':'○ CERRADA'}</span>
    </div>
    <div style="padding:.55rem .75rem;border:1px solid ${col};border-radius:7px;background:${col}14;color:${col};font-size:.76rem;line-height:1.5;margin-bottom:.85rem">${estado}</div>
    <div style="font-size:.7rem;color:var(--muted2);line-height:1.6;margin-bottom:.85rem">${M.regla}<br>${M.abre}</div>
    <div style="display:flex;flex-direction:column;gap:.6rem">
      <div style="display:flex;align-items:center;gap:.75rem;flex-wrap:wrap">
        <label style="${lbl}" for="ceDesde-${mod}">Abrir movimientos desde</label>
        <input id="ceDesde-${mod}" type="date" value="${_cedEsc(vDesde)}" style="${inp}">
      </div>
      <div style="display:flex;align-items:center;gap:.75rem;flex-wrap:wrap">
        <label style="${lbl};display:flex;align-items:center;gap:.4rem;cursor:pointer">
          <input id="ceAuto-${mod}" type="checkbox" ${auto?'checked':''} onchange="document.getElementById('ceHasta-${mod}').disabled=!this.checked" style="width:auto;accent-color:#10b981">
          Cierre automático
        </label>
        <input id="ceHasta-${mod}" type="datetime-local" value="${_cedEsc(vHasta)}" ${auto?'':'disabled'} style="${inp}">
      </div>
    </div>
    <div style="display:flex;gap:.6rem;flex-wrap:wrap;margin-top:1rem">
      ${ab?btn('#3b82f6','💾 Guardar cambios',`_cedGuardar('${mod}',true)`)+btn('#ef4444','🔒 Desactivar ahora',`_cedGuardar('${mod}',false)`)
          :btn('#10b981','🔓 Activar edición',`_cedGuardar('${mod}',true)`)}
      ${ocupado?'<span style="font-size:.72rem;color:var(--muted2);align-self:center">Guardando…</span>':''}
    </div>
    ${e.en?`<div style="margin-top:.85rem;font-size:.65rem;color:var(--muted)">Último cambio: ${_cedEsc(e.por||'—')} · ${_cedFmtFH(e.en)}</div>`:''}
  </div>`;
}
function rControlEdicion(){
  const p=document.getElementById('page-controlEdicion');if(!p)return;
  const cab=`<div class="ph"><div class="ph-title" style="color:#6366f1">🔓 Control de edición</div><div class="ph-sub">Abrir y cerrar la corrección de registros que ya pasaron su tiempo de bloqueo · Solo administrador</div></div>`;
  const caja=c=>`<div style="max-width:720px;margin:0 auto;display:flex;flex-direction:column;gap:1.2rem;padding:0 1rem 2rem">${c}</div>`;
  const aviso=(c,t)=>`<div class="card" style="border:1px solid ${c};color:${c};font-size:.8rem;line-height:1.6">${t}</div>`;
  if(!_cedEsAdmin()){p.innerHTML=cab+caja(aviso('#f59e0b','🔒 Este módulo es solo para el administrador.'));return;}
  _cedCargar();
  let cuerpo;
  if(_cedCarga==='error'){
    cuerpo=aviso('#ef4444',_cedErr==='falta la tabla'
      ?'⚠ Todavía no existe la tabla <b>control_edicion</b> en Supabase. Corra <b>sql/control_edicion.sql</b> en el SQL Editor y luego presione Reintentar.'
      :'⚠ No se pudo leer el estado: '+_cedEsc(_cedErr))
      +`<div><button class="btn btn-out btn-sm" onclick="_cedCargar(true)">↻ Reintentar</button></div>`;
  }else if(!_cedCargaT||_cedErr){              // primera lectura o reintento tras una falla
    cuerpo=`<div style="color:var(--muted2);font-size:.8rem;text-align:center;padding:2rem">Cargando…</div>`;
  }else{
    cuerpo=Object.keys(_CED_MODULOS).map(_cedTarjeta).join('');
  }
  p.innerHTML=cab+caja(cuerpo);
}
