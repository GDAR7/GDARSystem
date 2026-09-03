// ══════════════════════════════════════════════════════════════════════════
//  PANEL DE LIBERACIÓN DE RESTRICCIONES · Operaciones
//  Last Planner: una actividad entra al plan semanal solo cuando todas sus
//  áreas están en Liberado. Matriz actividad × área, bandeja por responsable
//  y bitácora de firmas.
//  Datos: lib_actividades · lib_requisitos · lib_bitacora  (ver sql/)
// ══════════════════════════════════════════════════════════════════════════

const LIB_AREAS=[
  {id:'MAT',n:'Almacén / Materiales',        resp:'Jefe de Almacén'},
  {id:'EQU',n:'Equipos y mantenimiento',     resp:'Jefe de Equipos'},
  {id:'PER',n:'Personal',                    resp:'Jefe de Personal'},
  {id:'CAL',n:'Calidad QA/QC',               resp:'Jefe de Calidad'},
  {id:'OFT',n:'Oficina técnica / Topografía',resp:'Jefe de Oficina Técnica'},
  {id:'SSO',n:'Seguridad SSOMA',             resp:'Jefe SSOMA'},
  {id:'PRO',n:'Producción',                  resp:'Ing. de Campo'},
  {id:'CLI',n:'Cliente / Permisos',          resp:'Buenaventura (CQA/CQC)'}
];
const LIB_EST={RES:'Restringido',PRO:'En proceso',LIB:'Liberado',NA:'No aplica'};
const LIB_ORDEN=['RES','PRO','LIB','NA'];
const LIB_COL={RES:'#ef4444',PRO:'#f59e0b',LIB:'#10b981',NA:'#6b7280'};

// ── Quién firma cada área ──────────────────────────────────────────────────
// Códigos de USERS (js/config.js). Editar aquí para reasignar responsables:
// es el único lugar donde se define quién puede cambiar el estado de un área.
const LIB_FIRMANTES={
  MAT:['YONMEL'],
  EQU:['CA-R-ZE','ECOMEC','JAYOJA'],
  PER:['JOR_JA'],
  CAL:[],
  OFT:['ANT_CER'],
  SSO:['FLOBEN'],
  PRO:['ELIDA'],
  CLI:[]
};
// Coordinadores: firman en cualquier área (PCO / Residente)
const LIB_COORD=['EIBEL25','ANDMAR'];

let _libTab=1,_libSem=null,_libQ='',_libFrente='',_libSoloPend=false;
let _libModalAct=null,_libAreaVista='';

// ── Helpers de datos ───────────────────────────────────────────────────────
function _libInit(){
  DB.libActividades=DB.libActividades||[];
  DB.libRequisitos=DB.libRequisitos||[];
  DB.libBitacora=DB.libBitacora||[];
}
function _libSemDefault(){
  const h=new Date(today()+'T12:00:00');
  const lunes=new Date(h);
  lunes.setDate(h.getDate()-((h.getDay()+6)%7));
  return lunes.toISOString().slice(0,10);
}
function _libNav(dias){
  const d=new Date((_libSem||_libSemDefault())+'T12:00:00');
  d.setDate(d.getDate()+dias);
  _libSem=d.toISOString().slice(0,10);
  _libRender();
}
function _libDMY(f){const p=String(f||'').split('-');return p.length===3?`${p[2]}/${p[1]}`:(f||'');}
function _libEsc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

// Actividades de la semana en curso
function _libActs(){
  return (DB.libActividades||[]).filter(a=>a.semanaInicio===_libSem);
}
function _libReqs(actId){
  return (DB.libRequisitos||[]).filter(r=>+r.actId===+actId);
}
// Estado de la actividad: RES si alguna restringida · LIB si todas liberadas
function _libEstadoAct(actId){
  const rs=_libReqs(actId).filter(r=>r.estado!=='NA');
  if(!rs.length)return'NA';
  if(rs.some(r=>r.estado==='RES'))return'RES';
  if(rs.every(r=>r.estado==='LIB'))return'LIB';
  return'PRO';
}
// Estado de una celda (actividad × área): null si esa área no tiene requisitos
function _libEstadoCelda(actId,area){
  const rs=_libReqs(actId).filter(r=>r.area===area);
  if(!rs.length)return null;
  const v=rs.filter(r=>r.estado!=='NA');
  if(!v.length)return{e:'NA',n:rs.length,lib:0};
  const lib=v.filter(r=>r.estado==='LIB').length;
  let e='PRO';
  if(v.some(r=>r.estado==='RES'))e='RES';else if(lib===v.length)e='LIB';
  return{e,n:v.length,lib};
}
function _libPasaFiltro(a){
  if(_libFrente&&a.frente!==_libFrente)return false;
  if(_libQ){
    const q=_libQ.toLowerCase();
    const enReq=_libReqs(a.id).some(r=>String(r.desc||'').toLowerCase().includes(q));
    if(!(String(a.nombre||'').toLowerCase().includes(q)||String(a.frente||'').toLowerCase().includes(q)||enReq))return false;
  }
  return true;
}

// ── Permisos de firma ──────────────────────────────────────────────────────
function _libEsCoord(){return !!(CU&&LIB_COORD.indexOf(CU.codigo)>=0);}
// Áreas que el usuario puede firmar
function _libMisAreas(){
  if(_libEsCoord())return LIB_AREAS.map(a=>a.id);
  if(!CU)return[];
  return Object.keys(LIB_FIRMANTES).filter(k=>(LIB_FIRMANTES[k]||[]).indexOf(CU.codigo)>=0);
}
function _libPuedeFirmar(area){return _libMisAreas().indexOf(area)>=0;}

// ── Render principal ───────────────────────────────────────────────────────
function rLiberacion(){
  _libInit();
  if(!_libSem)_libSem=_libSemDefault();
  if(!_libAreaVista){const m=_libMisAreas();_libAreaVista=m[0]||'MAT';}
  _libEnsureModals();
  _libRender();
}
function _libTabSwitch(n){_libTab=n;_libRender();}

function _libRender(){
  const cont=document.getElementById('libBody');if(!cont)return;
  // El render rehace toda la barra: hay que devolverle el foco al buscador
  // o se pierde en cada tecla que se escribe.
  const act=document.activeElement;
  const enBusca=!!(act&&act.id==='libQ');
  const selIni=enBusca?act.selectionStart:null,selFin=enBusca?act.selectionEnd:null;
  const acts=_libActs();
  const finSem=(()=>{const d=new Date(_libSem+'T12:00:00');d.setDate(d.getDate()+6);return d.toISOString().slice(0,10);})();

  // KPIs
  let lib=0,pro=0,res=0;
  acts.forEach(a=>{const e=_libEstadoAct(a.id);if(e==='LIB')lib++;else if(e==='RES')res++;else if(e==='PRO')pro++;});
  const vig=acts.flatMap(a=>_libReqs(a.id)).filter(r=>r.estado!=='NA');
  const irr=vig.length?Math.round(vig.filter(r=>r.estado==='LIB').length/vig.length*100):0;
  const irrCol=irr>=80?'#10b981':irr>=50?'#f59e0b':'#ef4444';

  // Pendientes que esperan mi firma
  const misA=_libMisAreas();
  const mios=acts.flatMap(a=>_libReqs(a.id)).filter(r=>misA.indexOf(r.area)>=0&&r.estado!=='LIB'&&r.estado!=='NA').length;

  const frentes=[...new Set((DB.libActividades||[]).map(a=>a.frente).filter(Boolean))].sort();
  const inpS='font-size:.72rem;padding:.22rem .45rem;border-radius:5px;border:1px solid var(--border);background:var(--panel2);color:var(--text)';
  const tabBtn=(n,lbl)=>{const s=_libTab===n;return`<button onclick="_libTabSwitch(${n})" style="font-size:.74rem;padding:.35rem .9rem;border-radius:7px 7px 0 0;border:1px solid ${s?'var(--ope)':'var(--border)'};border-bottom:${s?'1px solid var(--panel)':'1px solid var(--border)'};background:${s?'rgba(245,158,11,.14)':'var(--panel2)'};color:${s?'var(--ope)':'var(--muted2)'};cursor:pointer;font-weight:${s?'800':'500'}">${lbl}</button>`;};

  cont.innerHTML=`
  <div class="kpi-row">
    <div class="kpi" style="--kc:#10b981"><div class="kpi-lbl">Actividades Liberadas</div><div class="kpi-val">${lib}</div><div class="kpi-sub">de ${acts.length} programadas</div></div>
    <div class="kpi" style="--kc:#f59e0b"><div class="kpi-lbl">En Proceso</div><div class="kpi-val">${pro}</div><div class="kpi-sub">con requisitos avanzando</div></div>
    <div class="kpi" style="--kc:#ef4444"><div class="kpi-lbl">Restringidas</div><div class="kpi-val">${res}</div><div class="kpi-sub">no pueden arrancar</div></div>
    <div class="kpi" style="--kc:${irrCol}"><div class="kpi-lbl">IRR · Requisitos Liberados</div><div class="kpi-val">${irr}%</div><div class="kpi-sub">${vig.filter(r=>r.estado==='LIB').length} de ${vig.length} requisitos</div></div>
  </div>

  <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;margin-bottom:.7rem;padding:.45rem .7rem;background:var(--panel2);border:1px solid var(--border);border-radius:8px">
    <span style="font-size:.62rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.08em">Semana</span>
    <button onclick="_libNav(-7)" style="background:none;border:1px solid var(--border);border-radius:5px;color:var(--text);cursor:pointer;font-size:.85rem;padding:.12rem .5rem" title="Semana anterior">‹</button>
    <input type="date" value="${_libSem}" onchange="_libSem=this.value;_libRender()" style="${inpS};width:135px">
    <button onclick="_libNav(7)" style="background:none;border:1px solid var(--border);border-radius:5px;color:var(--text);cursor:pointer;font-size:.85rem;padding:.12rem .5rem" title="Semana siguiente">›</button>
    <span style="font-size:.72rem;color:var(--ope);font-weight:700;font-family:monospace">${_libDMY(_libSem)} – ${_libDMY(finSem)}</span>
    <button onclick="_libSem=_libSemDefault();_libRender()" style="font-size:.62rem;padding:.2rem .5rem;border-radius:5px;border:1px solid var(--border);background:transparent;color:var(--muted2);cursor:pointer">Semana actual</button>
    <div style="width:1px;height:18px;background:var(--border)"></div>
    <select onchange="_libFrente=this.value;_libRender()" style="${inpS}">
      <option value="">Todos los frentes</option>
      ${frentes.map(f=>`<option value="${_libEsc(f)}"${f===_libFrente?' selected':''}>${_libEsc(f)}</option>`).join('')}
    </select>
    <input id="libQ" type="search" value="${_libEsc(_libQ)}" oninput="_libQ=this.value;_libRender()" placeholder="Buscar actividad o requisito" style="${inpS};min-width:200px">
    <label style="display:inline-flex;align-items:center;gap:.3rem;font-size:.72rem;color:var(--muted2);cursor:pointer">
      <input type="checkbox" ${_libSoloPend?'checked':''} onchange="_libSoloPend=this.checked;_libRender()" style="width:auto;margin:0;cursor:pointer"> Solo pendientes
    </label>
    <button onclick="_libNuevaAct()" class="btn btn-a" style="--ba:var(--ope);margin-left:auto">＋ Actividad</button>
    <button onclick="_libResumen()" class="btn" style="background:var(--panel);border:1px solid var(--border);color:var(--muted2)">📋 Copiar resumen</button>
    <button onclick="_libExcel()" style="background:#166534;color:#fff;border:none;border-radius:7px;padding:.32rem .9rem;font-size:.76rem;font-weight:700;cursor:pointer">📊 Excel</button>
  </div>

  <div style="display:flex;gap:.3rem;align-items:flex-end;border-bottom:1px solid var(--border)">
    ${tabBtn(1,'🧮 Matriz de liberación')}
    ${tabBtn(2,'📥 Mi bandeja'+(mios?` (${mios})`:''))}
    ${tabBtn(3,'🕘 Bitácora')}
  </div>
  <div id="libVista" style="margin-top:.8rem"></div>`;

  if(_libTab===2)_libBandeja();
  else if(_libTab===3)_libBitacora();
  else _libMatriz();

  if(enBusca){
    const q=document.getElementById('libQ');
    if(q){q.focus();try{q.setSelectionRange(selIni,selFin);}catch(e){}}
  }
}

function _libVacio(t,s){return`<div class="card" style="padding:2.2rem;text-align:center"><div style="font-size:1rem;font-weight:700;color:var(--text);margin-bottom:.3rem">${t}</div><div style="font-size:.78rem;color:var(--muted2)">${s}</div></div>`;}

// ── Vista 1: matriz actividad × área ───────────────────────────────────────
function _libMatriz(){
  const el=document.getElementById('libVista');if(!el)return;
  const TH='padding:.45rem .5rem;font-size:.62rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted2);border:1px solid var(--border);text-align:center';
  const TD='border:1px solid var(--border);font-size:.75rem;vertical-align:middle';
  let body='',n=0;
  _libActs().forEach(a=>{
    if(!_libPasaFiltro(a))return;
    const ea=_libEstadoAct(a.id);
    if(_libSoloPend&&ea==='LIB')return;
    n++;
    const celdas=LIB_AREAS.map(ar=>{
      const c=_libEstadoCelda(a.id,ar.id);
      if(!c)return`<td style="${TD};text-align:center;color:var(--muted);background:rgba(148,163,184,.04)">·</td>`;
      const txt=c.e==='NA'?'n/a':(c.e==='LIB'?c.n+'/'+c.n:c.lib+'/'+c.n);
      const col=LIB_COL[c.e];
      return`<td style="${TD};padding:0">
        <button onclick="_libOpenAct(${a.id},'${ar.id}')" title="${_libEsc(ar.n)} — ${LIB_EST[c.e]}"
          style="width:100%;border:0;background:${col}22;color:${col};cursor:pointer;font-weight:800;font-size:.74rem;padding:.55rem .2rem;font-family:monospace">${txt}</button>
      </td>`;
    }).join('');
    body+=`<tr>
      <td style="${TD};padding:.5rem .6rem">
        <div style="font-size:.62rem;color:#06b6d4;letter-spacing:.03em">${_libEsc(a.frente)}</div>
        <div style="font-weight:600;color:var(--text)">${_libEsc(a.nombre)}</div>
        <div style="font-size:.65rem;color:var(--muted2)">${a.meta?fmtN(a.meta)+' '+_libEsc(a.unidad||''):_libEsc(a.unidad||'')} · ejecuta ${_libEsc(a.ejecutor||'—')}</div>
      </td>
      ${celdas}
      <td style="${TD};text-align:center;padding:0">
        <button onclick="_libOpenAct(${a.id},'')" style="width:100%;border:0;background:${LIB_COL[ea]}22;color:${LIB_COL[ea]};cursor:pointer;font-weight:800;font-size:.72rem;padding:.55rem .3rem">${LIB_EST[ea]}</button>
      </td>
    </tr>`;
  });
  if(!n){
    el.innerHTML=_libVacio(_libActs().length?'Ninguna actividad coincide':'Sin actividades en esta semana',
      _libActs().length?'Cambia el frente o limpia la búsqueda.':'Usa el botón ＋ Actividad para armar el tablero de la semana.');
    return;
  }
  el.innerHTML=`
  <div class="card" style="padding:0"><div class="tbl-wrap">
    <table style="min-width:100%;border-collapse:collapse">
      <thead><tr style="background:var(--panel2)">
        <th style="${TH};text-align:left;min-width:280px">Actividad<div style="font-weight:400;text-transform:none;letter-spacing:0;font-size:.62rem">frente · meta de la semana</div></th>
        ${LIB_AREAS.map(a=>`<th style="${TH};min-width:62px" title="${_libEsc(a.resp)}">${a.id}<div style="font-weight:400;text-transform:none;letter-spacing:0;font-size:.58rem">${_libEsc(a.resp.replace('Jefe de ',''))}</div></th>`).join('')}
        <th style="${TH};min-width:96px">Estado</th>
      </tr></thead>
      <tbody>${body}</tbody>
    </table>
  </div></div>
  <div style="margin-top:.5rem;font-size:.64rem;color:var(--muted2);display:flex;gap:1rem;flex-wrap:wrap;align-items:center">
    ${LIB_ORDEN.map(e=>`<span><span style="color:${LIB_COL[e]}">●</span> ${LIB_EST[e]}</span>`).join('')}
    <span style="margin-left:auto">Una actividad entra al plan semanal solo cuando todas sus áreas están en Liberado · la celda muestra liberados/total</span>
  </div>`;
}

// ── Vista 2: mi bandeja ────────────────────────────────────────────────────
function _libBandeja(){
  const el=document.getElementById('libVista');if(!el)return;
  const misA=_libMisAreas();
  if(!misA.length){
    el.innerHTML=_libVacio('No tienes un área asignada',
      'Pídele al PCO que agregue tu código de usuario en LIB_FIRMANTES (js/liberacion.js) para poder firmar.');
    return;
  }
  if(misA.indexOf(_libAreaVista)<0)_libAreaVista=misA[0];
  const inpS='font-size:.72rem;padding:.22rem .45rem;border-radius:5px;border:1px solid var(--border);background:var(--panel2);color:var(--text)';
  let h='',n=0;
  _libActs().forEach(a=>{
    if(!_libPasaFiltro(a))return;
    let rs=_libReqs(a.id).filter(r=>r.area===_libAreaVista);
    if(_libSoloPend)rs=rs.filter(r=>r.estado!=='LIB'&&r.estado!=='NA');
    if(!rs.length)return;
    n+=rs.length;
    const ea=_libEstadoAct(a.id);
    h+=`<div class="card" style="padding:0;margin-bottom:.6rem">
      <div class="card-head" style="gap:.6rem">
        <span class="card-title"><span style="color:#06b6d4;font-size:.68rem">${_libEsc(a.frente)}</span> · ${_libEsc(a.nombre)}</span>
        <div class="card-head-right"><span class="badge" style="background:${LIB_COL[ea]}22;color:${LIB_COL[ea]};border:1px solid ${LIB_COL[ea]}55">${LIB_EST[ea]}</span></div>
      </div>
      ${rs.map(_libFilaReq).join('')}
    </div>`;
  });
  const selArea=`<select onchange="_libAreaVista=this.value;_libRender()" style="${inpS}">
    ${LIB_AREAS.filter(a=>misA.indexOf(a.id)>=0).map(a=>`<option value="${a.id}"${a.id===_libAreaVista?' selected':''}>${a.id} — ${_libEsc(a.n)}</option>`).join('')}
  </select>`;
  el.innerHTML=`
  <div style="display:flex;align-items:center;gap:.6rem;flex-wrap:wrap;margin-bottom:.7rem">
    <span style="font-size:.72rem;color:var(--muted2)">Firmando como</span>
    ${selArea}
    <span style="font-size:.72rem;color:var(--text);font-weight:700">${_libEsc(CU?CU.nombre:'—')}</span>
    <span style="font-size:.68rem;color:var(--muted2)">${_libEsc(CU?CU.cargo:'')}${_libEscCoordTxt()}</span>
  </div>
  ${n?h:_libVacio('Sin requisitos para '+_libEsc((LIB_AREAS.find(x=>x.id===_libAreaVista)||{}).n||''),
      _libSoloPend?'Quita el filtro de pendientes para ver los ya liberados.':'Abre una celda de la matriz para agregar el primero.')}`;
}
function _libEscCoordTxt(){return _libEsCoord()?' · <span style="color:#a78bfa">coordinador: firma todas las áreas</span>':'';}

function _libFilaReq(r){
  const puede=_libPuedeFirmar(r.area);
  const ar=LIB_AREAS.find(x=>x.id===r.area)||{id:r.area,resp:''};
  const firma=r.firmadoPor?`${_libEsc(r.firmadoPor)}${r.firmadoAt?' · '+new Date(r.firmadoAt).toLocaleString('es-PE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):''}`:'sin firmar';
  const vence=r.fechaComp&&r.fechaComp<today()&&r.estado!=='LIB'&&r.estado!=='NA';
  return`<div style="display:grid;grid-template-columns:1fr auto;gap:.7rem;padding:.6rem .8rem;border-top:1px solid var(--border);align-items:start">
    <div>
      <div style="font-size:.8rem;font-weight:500;color:var(--text)">${_libEsc(r.desc)}</div>
      <div style="font-size:.66rem;color:var(--muted2);margin-top:.15rem">${ar.id} · ${_libEsc(ar.resp)} · ${firma}</div>
      <div style="display:flex;gap:.4rem;margin-top:.4rem;flex-wrap:wrap">
        <input type="date" value="${r.fechaComp||''}" ${puede?'':'disabled'} onchange="_libSetCampo(${r.id},'fechaComp',this.value)" title="Fecha comprometida"
          style="font-size:.72rem;padding:.2rem .4rem;border-radius:5px;border:1px solid ${vence?'#ef4444':'var(--border)'};background:var(--panel2);color:${vence?'#ef4444':'var(--text)'}">
        <input type="text" value="${_libEsc(r.comentario||'')}" ${puede?'':'disabled'} onchange="_libSetCampo(${r.id},'comentario',this.value)"
          placeholder="Comentario: qué falta, con quién, N° de vale..."
          style="font-size:.72rem;padding:.2rem .45rem;border-radius:5px;border:1px solid var(--border);background:var(--panel2);color:var(--text);min-width:240px;flex:1">
      </div>
    </div>
    <div style="display:flex;gap:.2rem;flex-wrap:wrap;align-items:flex-start">
      ${LIB_ORDEN.map(e=>{
        const act=r.estado===e;
        return`<button ${puede?'':'disabled'} onclick="_libSetEstado(${r.id},'${e}')" title="${puede?'':'Solo el responsable de '+ar.id+' puede firmar'}"
          style="font-size:.66rem;font-weight:700;padding:.3rem .55rem;border-radius:6px;white-space:nowrap;
          border:1px solid ${act?LIB_COL[e]:'var(--border)'};background:${act?LIB_COL[e]:'transparent'};
          color:${act?'#fff':'var(--muted2)'};cursor:${puede?'pointer':'not-allowed'};opacity:${puede?1:.45}">${LIB_EST[e]}</button>`;
      }).join('')}
      <button onclick="_libDelReq(${r.id})" title="Eliminar requisito" ${puede?'':'disabled'}
        style="font-size:.66rem;padding:.3rem .5rem;border-radius:6px;border:1px solid var(--border);background:transparent;color:#ef4444;cursor:${puede?'pointer':'not-allowed'};opacity:${puede?1:.45}">🗑</button>
    </div>
  </div>`;
}

// ── Vista 3: bitácora ──────────────────────────────────────────────────────
function _libBitacora(){
  const el=document.getElementById('libVista');if(!el)return;
  const log=(DB.libBitacora||[]).slice().sort((a,b)=>String(b.registradoAt||'').localeCompare(String(a.registradoAt||''))).slice(0,200);
  if(!log.length){el.innerHTML=_libVacio('Bitácora vacía','Cada cambio de estado queda registrado aquí con nombre, cargo y hora.');return;}
  el.innerHTML=`<div class="card" style="padding:0"><div class="tbl-wrap"><table>
    <thead><tr><th>Cuándo</th><th>Quién</th><th style="text-align:center">Área</th><th>Requisito</th><th style="text-align:center">Cambio</th></tr></thead>
    <tbody>${log.map(l=>`<tr>
      <td style="font-size:.72rem;white-space:nowrap">${l.registradoAt?new Date(l.registradoAt).toLocaleString('es-PE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'—'}</td>
      <td style="font-size:.74rem">${_libEsc(l.usuario)}<div style="font-size:.63rem;color:var(--muted2)">${_libEsc(l.cargo||'')}</div></td>
      <td style="text-align:center"><span class="badge" style="background:rgba(148,163,184,.12);color:var(--muted2);border:1px solid var(--border)">${_libEsc(l.area)}</span></td>
      <td style="font-size:.74rem">${_libEsc(l.desc)}<div style="font-size:.63rem;color:var(--muted2)">${_libEsc(l.actNombre||'')}</div></td>
      <td style="text-align:center;white-space:nowrap">
        <span style="color:${LIB_COL[l.estadoDe]||'var(--muted2)'};font-size:.7rem;font-weight:700">${LIB_EST[l.estadoDe]||l.estadoDe||'—'}</span>
        <span style="color:var(--muted2)"> → </span>
        <span style="color:${LIB_COL[l.estadoA]||'var(--muted2)'};font-size:.7rem;font-weight:700">${LIB_EST[l.estadoA]||l.estadoA||'—'}</span>
      </td>
    </tr>`).join('')}</tbody></table></div></div>`;
}

// ── Cambios de estado y campos ─────────────────────────────────────────────
function _libSetEstado(reqId,e){
  const r=(DB.libRequisitos||[]).find(x=>+x.id===+reqId);
  if(!r||r.estado===e)return;
  if(!_libPuedeFirmar(r.area)){toast('Solo el responsable de '+r.area+' puede firmar esta restricción',true);return;}
  const a=(DB.libActividades||[]).find(x=>+x.id===+r.actId);
  const previo=r.estado;
  r.estado=e;
  r.firmadoPor=CU?CU.nombre:'';
  r.firmadoCargo=CU?CU.cargo:'';
  r.firmadoAt=new Date().toISOString();
  syncSheet('saveLibRequisito',r);
  // Bitácora: la escribe el front porque el trigger original dependía de auth.uid()
  const b={
    id:nidSeguro('libB','libBitacora'),
    reqId:r.id,actNombre:a?a.nombre:'',area:r.area,desc:r.desc,
    estadoDe:previo,estadoA:e,
    usuario:CU?CU.nombre:'',cargo:CU?CU.cargo:'',
    registradoAt:new Date().toISOString()
  };
  DB.libBitacora.push(b);
  syncSheet('saveLibBitacora',b);
  _libRender();
  if(_libModalAct!==null)_libPintarModal();
  toast('Firmado como '+LIB_EST[e]);
}
function _libSetCampo(reqId,campo,val){
  const r=(DB.libRequisitos||[]).find(x=>+x.id===+reqId);
  if(!r)return;
  if(!_libPuedeFirmar(r.area)){toast('No puedes editar requisitos de '+r.area,true);return;}
  r[campo]=val;
  syncSheet('saveLibRequisito',r);
  toast(campo==='fechaComp'?'Compromiso guardado':'Comentario guardado');
}
function _libDelReq(reqId){
  const r=(DB.libRequisitos||[]).find(x=>+x.id===+reqId);if(!r)return;
  if(!_libPuedeFirmar(r.area)){toast('No puedes eliminar requisitos de '+r.area,true);return;}
  if(!confirm('¿Eliminar el requisito "'+r.desc+'"?'))return;
  DB.libRequisitos=DB.libRequisitos.filter(x=>+x.id!==+reqId);
  supaDelete('libRequisitos',reqId);
  _libRender();
  if(_libModalAct!==null)_libPintarModal();
}

// ── Modales ────────────────────────────────────────────────────────────────
function _libEnsureModals(){
  if(document.getElementById('mLibAct'))return;
  const d=document.createElement('div');
  d.innerHTML=`
<div class="mo" id="mLibAct"><div class="modal" style="max-width:820px">
  <div class="mh"><span class="mttl" id="libMTit">Actividad</span><button class="mx" onclick="closeM('mLibAct')">✕</button></div>
  <div class="mb" style="padding:0">
    <div id="libMSub" style="padding:.55rem .9rem;background:var(--panel2);border-bottom:1px solid var(--border);font-size:.72rem;color:var(--muted2)"></div>
    <div id="libMBody"></div>
    <div id="libMAdd" style="padding:.65rem .9rem;border-top:1px solid var(--border);background:var(--panel2);display:flex;gap:.4rem;flex-wrap:wrap;align-items:center"></div>
  </div>
</div></div>
<div class="mo" id="mLibNueva"><div class="modal" style="max-width:560px">
  <div class="mh"><span class="mttl" id="libNTit">Nueva Actividad</span><button class="mx" onclick="closeM('mLibNueva')">✕</button></div>
  <div class="mb">
    <div class="fg-grid">
      <div class="fg" style="grid-column:1/-1"><label>Actividad *</label><input id="libNNombre" placeholder="¿Qué se va a ejecutar esta semana?"></div>
      <div class="fg"><label>Frente</label><input id="libNFrente" list="libFrenteList" placeholder="Dique Principal..."><datalist id="libFrenteList"></datalist></div>
      <div class="fg"><label>Ejecutor</label><input id="libNEjec" list="libEjecList" placeholder="ECOSERMO"><datalist id="libEjecList"><option>ECOSERMO</option><option>Buenaventura</option></datalist></div>
      <div class="fg"><label>Meta</label><input id="libNMeta" type="number" step="0.01" placeholder="0"></div>
      <div class="fg"><label>Unidad</label><input id="libNUnidad" placeholder="m3, m2, glb..."></div>
      <div class="fg" style="grid-column:1/-1"><label>Proyecto</label><select id="libNProy"></select></div>
    </div>
  </div>
  <div class="mf">
    <button onclick="closeM('mLibNueva')" class="btn btn-out">Cancelar</button>
    <button onclick="_libGuardarAct()" class="btn btn-a" style="--ba:#059669">Guardar</button>
  </div>
</div></div>`;
  document.body.appendChild(d);
}

function _libOpenAct(actId,areaId){
  _libModalAct={act:+actId,area:areaId||''};
  const a=(DB.libActividades||[]).find(x=>+x.id===+actId);if(!a)return;
  document.getElementById('libMTit').textContent=a.nombre;
  document.getElementById('libMSub').innerHTML=
    `${_libEsc(a.frente)} · ${a.meta?fmtN(a.meta)+' '+_libEsc(a.unidad||''):_libEsc(a.unidad||'')} · ejecuta ${_libEsc(a.ejecutor||'—')}`+
    (areaId?` · filtrado por ${_libEsc((LIB_AREAS.find(x=>x.id===areaId)||{}).n||areaId)}`:'');
  _libPintarModal();
  openM('mLibAct');
}
function _libPintarModal(){
  if(!_libModalAct)return;
  const{act,area}=_libModalAct;
  const rs=_libReqs(act).filter(r=>!area||r.area===area);
  document.getElementById('libMBody').innerHTML=rs.length
    ?rs.map(_libFilaReq).join('')
    :'<div style="padding:1.6rem;text-align:center;color:var(--muted2);font-size:.78rem">Esta actividad no tiene requisitos aquí. Agrégalos abajo.</div>';
  const misA=_libMisAreas();
  const inpS='font-size:.72rem;padding:.25rem .45rem;border-radius:5px;border:1px solid var(--border);background:var(--panel);color:var(--text)';
  document.getElementById('libMAdd').innerHTML=`
    <select id="libNArea" style="${inpS}">
      ${LIB_AREAS.map(x=>`<option value="${x.id}"${x.id===(area||misA[0]||'MAT')?' selected':''}>${x.id} — ${_libEsc(x.n)}</option>`).join('')}
    </select>
    <input type="text" id="libNDesc" placeholder="Nuevo requisito o recurso para esta actividad" style="${inpS};flex:1;min-width:220px">
    <button onclick="_libAddReq()" class="btn btn-a" style="--ba:#059669">Agregar requisito</button>
    <button onclick="_libDelAct()" class="btn" style="background:transparent;border:1px solid var(--border);color:#ef4444;margin-left:auto">Eliminar actividad</button>`;
}
function _libAddReq(){
  if(!_libModalAct)return;
  const area=document.getElementById('libNArea').value;
  const desc=document.getElementById('libNDesc').value.trim();
  if(!desc){toast('Escribe el requisito',true);return;}
  if(!_libPuedeFirmar(area)){toast('Solo el responsable de '+area+' (o el coordinador) puede agregar requisitos de esa área',true);return;}
  const r={
    id:nidSeguro('libR','libRequisitos'),
    actId:_libModalAct.act,area,desc,estado:'RES',
    fechaComp:'',comentario:'',firmadoPor:'',firmadoCargo:'',firmadoAt:''
  };
  DB.libRequisitos.push(r);
  syncSheet('saveLibRequisito',r);
  document.getElementById('libNDesc').value='';
  _libPintarModal();_libRender();
  toast('Requisito agregado');
}
function _libDelAct(){
  if(!_libModalAct)return;
  if(!_libEsCoord()){toast('Solo el PCO o el Residente pueden eliminar actividades',true);return;}
  const a=(DB.libActividades||[]).find(x=>+x.id===+_libModalAct.act);if(!a)return;
  if(!confirm('¿Eliminar la actividad "'+a.nombre+'" y todos sus requisitos?'))return;
  _libReqs(a.id).forEach(r=>supaDelete('libRequisitos',r.id));
  DB.libRequisitos=DB.libRequisitos.filter(r=>+r.actId!==+a.id);
  DB.libActividades=DB.libActividades.filter(x=>+x.id!==+a.id);
  supaDelete('libActividades',a.id);
  closeM('mLibAct');_libModalAct=null;_libRender();
  toast('Actividad eliminada');
}

function _libNuevaAct(){
  if(!_libEsCoord()){toast('Solo el PCO o el Residente arman el tablero de la semana',true);return;}
  _libEnsureModals();
  document.getElementById('libNNombre').value='';
  document.getElementById('libNFrente').value=_libFrente||'';
  document.getElementById('libNEjec').value='ECOSERMO';
  document.getElementById('libNMeta').value='';
  document.getElementById('libNUnidad').value='';
  document.getElementById('libFrenteList').innerHTML=
    [...new Set((DB.libActividades||[]).map(a=>a.frente).filter(Boolean))].map(f=>`<option>${_libEsc(f)}</option>`).join('');
  document.getElementById('libNProy').innerHTML='<option value="">— Sin proyecto —</option>'+
    (DB.proyectos||[]).map(p=>`<option value="${_libEsc(p.codigo)}">[${_libEsc(p.codigo)}] ${_libEsc(p.nombre)}</option>`).join('');
  openM('mLibNueva');
}
function _libGuardarAct(){
  const nombre=document.getElementById('libNNombre').value.trim();
  if(!nombre){toast('Escribe el nombre de la actividad',true);return;}
  const a={
    id:nidSeguro('libA','libActividades'),
    proy:document.getElementById('libNProy').value||'',
    frente:document.getElementById('libNFrente').value.trim()||'Sin frente',
    nombre,
    unidad:document.getElementById('libNUnidad').value.trim()||'glb',
    meta:+document.getElementById('libNMeta').value||0,
    ejecutor:document.getElementById('libNEjec').value.trim()||'ECOSERMO',
    semanaInicio:_libSem,
    wbsId:null,cumplio:null,causaNoCump:'',
    creadoPor:CU?CU.nombre:''
  };
  DB.libActividades.push(a);
  syncSheet('saveLibActividad',a);
  closeM('mLibNueva');
  _libRender();
  _libOpenAct(a.id,'');
  toast('Actividad creada · agrégale sus requisitos');
}

// ── Exportar ───────────────────────────────────────────────────────────────
function _libExcel(){
  if(typeof XLSX==='undefined'){toast('Librería Excel no disponible',true);return;}
  const acts=_libActs();
  if(!acts.length){toast('No hay actividades en esta semana',true);return;}
  const finSem=(()=>{const d=new Date(_libSem+'T12:00:00');d.setDate(d.getDate()+6);return d.toISOString().slice(0,10);})();
  const aoa=[
    ['PANEL DE LIBERACIÓN DE RESTRICCIONES — Semana '+_libDMY(_libSem)+' al '+_libDMY(finSem)],
    ['Frente','Actividad','Meta','Unidad','Ejecutor','Área','Responsable','Requisito','Estado','Fecha comprometida','Comentario','Firmado por','Último cambio']
  ];
  acts.forEach(a=>{
    const rs=_libReqs(a.id);
    if(!rs.length){aoa.push([a.frente,a.nombre,a.meta||'',a.unidad||'',a.ejecutor||'','','','(sin requisitos)','','','','','']);return;}
    rs.forEach(r=>{
      const ar=LIB_AREAS.find(x=>x.id===r.area)||{n:r.area,resp:''};
      aoa.push([a.frente,a.nombre,a.meta||'',a.unidad||'',a.ejecutor||'',ar.n,ar.resp,r.desc,LIB_EST[r.estado]||r.estado,
        r.fechaComp||'',r.comentario||'',r.firmadoPor||'',
        r.firmadoAt?new Date(r.firmadoAt).toLocaleString('es-PE'):'']);
    });
  });
  // Resumen por área al pie
  aoa.push([]);
  aoa.push(['RESUMEN POR ÁREA','Restringidos','En proceso','Liberados','No aplica']);
  LIB_AREAS.forEach(ar=>{
    const rs=acts.flatMap(a=>_libReqs(a.id)).filter(r=>r.area===ar.id);
    if(!rs.length)return;
    aoa.push([ar.id+' — '+ar.n,
      rs.filter(r=>r.estado==='RES').length,rs.filter(r=>r.estado==='PRO').length,
      rs.filter(r=>r.estado==='LIB').length,rs.filter(r=>r.estado==='NA').length]);
  });
  const ws=XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols']=[{wch:20},{wch:42},{wch:9},{wch:8},{wch:14},{wch:24},{wch:22},{wch:46},{wch:14},{wch:16},{wch:34},{wch:22},{wch:18}];
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Liberación');
  XLSX.writeFile(wb,'liberacion_restricciones_'+_libSem+'.xlsx');
  toast('✓ Excel descargado');
}

function _libResumen(){
  const acts=_libActs();
  const vig=acts.flatMap(a=>_libReqs(a.id)).filter(r=>r.estado!=='NA');
  const irr=vig.length?Math.round(vig.filter(r=>r.estado==='LIB').length/vig.length*100):0;
  let t='PANEL DE LIBERACION - Semana '+_libDMY(_libSem)+'\n';
  t+='IRR: '+irr+'% de requisitos liberados ('+vig.filter(r=>r.estado==='LIB').length+' de '+vig.length+')\n\n';
  let hay=false;
  acts.forEach(a=>{
    const e=_libEstadoAct(a.id);
    if(e==='LIB')return;
    const pend=_libReqs(a.id).filter(r=>r.estado==='RES');
    if(!pend.length)return;
    hay=true;
    t+='* '+a.nombre+' ('+a.frente+') - '+LIB_EST[e]+'\n';
    pend.forEach(r=>{
      const ar=LIB_AREAS.find(x=>x.id===r.area)||{resp:''};
      t+='   - ['+r.area+' / '+ar.resp+'] '+r.desc+(r.fechaComp?' (compromiso '+r.fechaComp+')':'')+'\n';
    });
  });
  if(!hay)t+='Sin restricciones abiertas: todas las actividades estan liberadas.\n';
  t+='\nCada area responde en el panel antes de la reunion de programacion.';
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(t).then(
      ()=>toast('Resumen copiado · pégalo en WhatsApp o el correo'),
      ()=>_libResumenFallback(t));
  }else _libResumenFallback(t);
}
function _libResumenFallback(t){
  const w=window.open('','_blank','width=700,height=600');
  if(w){w.document.write('<pre style="font:13px/1.5 monospace;white-space:pre-wrap;padding:16px">'+_libEsc(t)+'</pre>');w.document.close();}
  else toast('No se pudo copiar el resumen',true);
}
