// ══ VENTA → Valorización al cliente (el render vive en js/valorizacion.js) ══
function rVenta(){rValorizacion();}

// ══ TARIFAS DE EQUIPOS ══
let _tarifaEditId=null;

function rTarifas(){
  const tarifas=[...DB.tarifasEq].sort((a,b)=>(a.tipo||'').localeCompare(b.tipo||'')||(a.desc||'').localeCompare(b.desc||''));
  const grupos={};
  tarifas.forEach(t=>{const k=t.tipo||'Otros';if(!grupos[k])grupos[k]=[];grupos[k].push(t);});

  const TH=`background:var(--panel2);color:var(--muted2);font-size:.67rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;padding:.45rem .65rem;white-space:nowrap`;
  const TD=`padding:.45rem .65rem;border-bottom:1px solid var(--border);font-size:.8rem;vertical-align:middle`;

  const TIPO_C={
    'Línea Amarilla':'#f59e0b','Línea Blanca':'#64748b',
    'Vehículo Menor':'#8b5cf6','Equipos Menores':'#10b981','Otros':'#a78bfa'
  };

  let body='';
  Object.entries(grupos).forEach(([tipo,items])=>{
    const tc=TIPO_C[tipo]||'#06b6d4';
    body+=`<tr><td colspan="6" style="${TH};background:rgba(5,150,105,.06);color:#059669;font-size:.7rem">${tipo} &nbsp;·&nbsp; ${items.length} tarifa(s)</td></tr>`;
    items.forEach(t=>{
      const margen=null; // margen ya no aplica aquí; costo proveedor viene del Master
      body+=`<tr onmouseover="this.style.background='var(--hover)'" onmouseout="this.style.background=''">
        <td style="${TD}">
          <span style="background:${tc}18;color:${tc};border:1px solid ${tc}40;border-radius:4px;padding:2px 8px;font-size:.65rem;font-weight:700">${t.unidad||'HM'}</span>
        </td>
        <td style="${TD};font-weight:600">${t.desc||'—'}</td>
        <td style="${TD};text-align:right;font-family:monospace;color:#06b6d4;font-weight:700">${_ccFmt(t.tarifaSeca||0)}</td>
        <td style="${TD};text-align:right;font-family:monospace;color:#8b5cf6;font-weight:700">${_ccFmt(t.tarifaFull||0)}</td>
        <td style="${TD};font-size:.68rem;color:var(--muted2);max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${t.palabrasClave||''}">${t.palabrasClave||'—'}</td>
        <td style="${TD};white-space:nowrap">
          <button class="btn btn-out btn-sm" onclick="openTarifaEdit(${t.id})" title="Editar" style="color:#f59e0b;border-color:#f59e0b50;margin-right:.25rem">✏️</button>
          <button class="btn btn-del btn-sm" onclick="delTarifa(${t.id})" title="Eliminar">🗑</button>
        </td>
      </tr>`;
    });
  });

  if(!body) body=`<tr><td colspan="6" style="text-align:center;padding:2.5rem;color:var(--muted2);font-size:.85rem">
    Sin tarifas registradas. &nbsp;
    <button onclick="cargarTarifasIniciales()" style="background:rgba(5,150,105,.15);border:1px solid rgba(5,150,105,.4);color:#059669;border-radius:7px;padding:.3rem .8rem;font-size:.78rem;font-weight:700;cursor:pointer">⬇ Cargar tarifas contractuales</button>
  </td></tr>`;

  document.getElementById('page-tarifas').innerHTML=`
  <div style="padding:1rem 1.2rem">
    <!-- Header -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:.6rem;margin-bottom:.9rem">
      <div>
        <h2 style="font-size:1.35rem;font-weight:900;color:var(--text);margin:0;letter-spacing:-.02em">🏷️ Tarifas de Equipos</h2>
        <div style="font-size:.74rem;color:var(--muted2);margin-top:.2rem">${tarifas.length} tarifa(s) · Tarifa Venta (Seca / Full) · Costo Proveedor se toma del Master de Equipos</div>
      </div>
      <div style="display:flex;gap:.4rem;flex-wrap:wrap">
        ${!tarifas.length?`<button onclick="cargarTarifasIniciales()" style="background:rgba(5,150,105,.1);border:1px solid rgba(5,150,105,.4);color:#059669;border-radius:7px;padding:.35rem .85rem;font-size:.78rem;font-weight:700;cursor:pointer">⬇ Cargar iniciales</button>`:''}
        <button onclick="openTarifaNew()" style="background:rgba(5,150,105,.15);border:1px solid rgba(5,150,105,.5);color:#059669;border-radius:7px;padding:.35rem .9rem;font-size:.8rem;font-weight:700;cursor:pointer">+ Nueva Tarifa</button>
      </div>
    </div>

    <!-- Leyenda -->
    <div style="display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:.8rem;font-size:.72rem;color:var(--muted2)">
      <span style="display:flex;align-items:center;gap:.3rem"><span style="width:9px;height:9px;background:#06b6d4;border-radius:2px"></span>Tarifa Venta Seca</span>
      <span style="display:flex;align-items:center;gap:.3rem"><span style="width:9px;height:9px;background:#8b5cf6;border-radius:2px"></span>Tarifa Venta Full</span>
      <span style="display:flex;align-items:center;gap:.3rem"><span style="width:9px;height:9px;background:#a78bfa;border-radius:2px"></span>Costo Proveedor → viene del campo "Tarifa S/." en el Master de Equipos</span>
    </div>

    <!-- Tabla -->
    <div style="overflow-x:auto;border-radius:10px;border:1px solid var(--border)">
      <table style="width:100%;border-collapse:collapse;min-width:750px">
        <thead><tr>
          <th style="${TH};text-align:center">Un.</th>
          <th style="${TH}">Descripción</th>
          <th style="${TH};text-align:right">Venta Seca</th>
          <th style="${TH};text-align:right">Venta Full</th>
          <th style="${TH}">Palabras Clave</th>
          <th style="${TH};text-align:center">Acc.</th>
        </tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>
  </div>`;
}

// ── Autocomplete descripción tarifa desde Master ──
document.addEventListener('click',e=>{
  const drop=document.getElementById('tfDescDrop');
  if(drop&&!document.getElementById('tfDesc')?.closest('[style*="position:relative"]')?.contains(e.target))
    drop.style.display='none';
});
function _tfDescSearch(q){
  const drop=document.getElementById('tfDescDrop');if(!drop)return;
  const txt=(q||'').toLowerCase().trim();
  // Agrupamos por subtipo para no mostrar duplicados (un subtipo puede tener varios equipos)
  const vistos=new Set();
  const lista=(DB.equipos||[]).filter(e=>{
    const key=(e.sub||e.nombre||'').trim().toLowerCase();
    if(vistos.has(key))return false;
    if(txt&&!((e.sub||'')+(e.nombre||'')+(e.tipo||'')).toLowerCase().includes(txt))return false;
    vistos.add(key);return true;
  }).sort((a,b)=>(a.tipo||'').localeCompare(b.tipo||'')||(a.sub||'').localeCompare(b.sub||''));
  if(!lista.length){drop.style.display='none';return;}
  drop.innerHTML=lista.map(e=>{
    const desc=(e.sub||e.nombre||'').trim();
    const un=e.tarifaUn||'HM';
    return`<div onclick="_tfDescSelect('${desc.replace(/'/g,"\\'")}','${(e.tipo||'').replace(/'/g,"\\'")}','${un}');event.stopPropagation()"
      style="padding:.45rem .8rem;cursor:pointer;font-size:.8rem;border-bottom:1px solid var(--border)"
      onmouseover="this.style.background='var(--hover)'" onmouseout="this.style.background=''">
      <span style="font-weight:700">${desc}</span>
      <span style="font-size:.68rem;color:var(--muted2);margin-left:.5rem">${e.tipo||''}</span>
      <span style="float:right;font-size:.65rem;background:rgba(6,182,212,.15);color:#06b6d4;border-radius:3px;padding:1px 6px">${un}</span>
    </div>`;
  }).join('');
  drop.style.display='block';
}
function _tfDescSelect(desc,tipo,un){
  const inp=document.getElementById('tfDesc');if(inp)inp.value=desc;
  const t=document.getElementById('tfTipo');if(t&&tipo)t.value=tipo;
  const u=document.getElementById('tfUn');if(u&&un)u.value=un;
  const drop=document.getElementById('tfDescDrop');if(drop)drop.style.display='none';
}

function openTarifaNew(){
  _tarifaEditId=null;
  document.getElementById('mTarifaTtl').textContent='Nueva Tarifa';
  ['tfDesc','tfSeca','tfFull','tfKw'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  const t=document.getElementById('tfTipo');if(t)t.value='Línea Amarilla';
  const u=document.getElementById('tfUn');if(u)u.value='HM';
  const drop=document.getElementById('tfDescDrop');if(drop)drop.style.display='none';
  openM('mTarifa');
}

function openTarifaEdit(id){
  const t=DB.tarifasEq.find(x=>x.id===id);if(!t)return;
  _tarifaEditId=id;
  document.getElementById('mTarifaTtl').textContent='Editar Tarifa';
  document.getElementById('tfTipo').value=t.tipo||'Línea Amarilla';
  document.getElementById('tfDesc').value=t.desc||'';
  document.getElementById('tfUn').value=t.unidad||'HM';
  document.getElementById('tfSeca').value=t.tarifaSeca||'';
  document.getElementById('tfFull').value=t.tarifaFull||'';
  document.getElementById('tfKw').value=t.palabrasClave||'';
  const drop=document.getElementById('tfDescDrop');if(drop)drop.style.display='none';
  openM('mTarifa');
}

function gTarifa(){
  const descVal=(document.getElementById('tfDesc').value||'').trim();
  if(!descVal){toast('Ingrese una descripción',true);return;}
  const rec={
    tipo:document.getElementById('tfTipo').value,
    desc:descVal,
    unidad:document.getElementById('tfUn').value,
    tarifaSeca:+document.getElementById('tfSeca').value||0,
    tarifaFull:+document.getElementById('tfFull').value||0,
    palabrasClave:(document.getElementById('tfKw').value||'').trim()
  };
  if(_tarifaEditId!==null){
    const idx=DB.tarifasEq.findIndex(x=>x.id===_tarifaEditId);
    if(idx>-1){Object.assign(DB.tarifasEq[idx],rec);syncSheet('saveTarifaEq',DB.tarifasEq[idx]);}
    _tarifaEditId=null;
  }else{
    rec.id=nidSeguro('teq','tarifasEq');
    DB.tarifasEq.push(rec);
    syncSheet('saveTarifaEq',rec);
  }
  closeM('mTarifa');rTarifas();toast('Tarifa guardada');
}

function delTarifa(id){
  if(!confirm('¿Eliminar esta tarifa?'))return;
  DB.tarifasEq=DB.tarifasEq.filter(x=>x.id!==id);
  supaDelete('tarifasEq',id);
  rTarifas();toast('Tarifa eliminada');
}

async function cargarTarifasIniciales(){
  if(!confirm(`¿Cargar las ${_CC_TARIFA_EQ.length} tarifas contractuales como punto de partida?\nPodrás editarlas después.`))return;
  for(const t of _CC_TARIFA_EQ){
    const rec={id:nidSeguro('teq','tarifasEq'),tipo:t.tipo||'Otros',desc:t.lab,unidad:t.un,
      tarifaSeca:t.seca,tarifaFull:t.full,tarifaCosto:0,palabrasClave:t.kw.join(', ')};
    DB.tarifasEq.push(rec);
    syncSheet('saveTarifaEq',rec);
  }
  rTarifas();toast('Tarifas iniciales cargadas — ingresa las tarifas costo de proveedor');
}

// ══ COST CONTROL ══
let _ccOffset=0, _ccTarifaModo='seca', _ccTabActiva='equipos';
// Precio S/ por galón para valorizar combustible en Cost Control (independiente del costo de almacén)
let _ccPrecioComb=+(localStorage.getItem('ccPrecioComb')||0)||null;
// ── Sin IGV — SOLO combustible ──────────────────────────────────────────────
// En el módulo de Combustible los precios se registran con IGV incluido, así
// que este interruptor divide entre 1.18 ÚNICAMENTE el costo de combustible.
// Las tarifas de venta y el costo de proveedor no se tocan.
const _CC_IGV=1.18;
let _ccSinIgv=localStorage.getItem('ccSinIgv')==='1';
const _ccFComb=()=>_ccSinIgv?1/_CC_IGV:1;
function _ccToggleIgv(v){
  _ccSinIgv=!!v;
  try{localStorage.setItem('ccSinIgv',_ccSinIgv?'1':'0');}catch(e){}
  rCostControl();
  toast(_ccSinIgv?'Combustible neto · sin IGV (÷ 1.18)':'Combustible con IGV incluido');
}
// ── Precio de combustible ───────────────────────────────────────────────────
// Por defecto el costo sale del registro real de Combustible (cada despacho con
// su propio precio). El precio manual es opcional, para simulaciones.
let _ccPrecioManual=localStorage.getItem('ccPrecioManual')==='1';
function _ccTogglePrecioManual(v){
  _ccPrecioManual=!!v;
  try{localStorage.setItem('ccPrecioManual',_ccPrecioManual?'1':'0');}catch(e){}
  rCostControl();
  toast(_ccPrecioManual?'Combustible valorizado al precio manual':'Combustible al costo real del registro');
}
function _ccSetPrecioComb(v){
  const n=+v||0;
  _ccPrecioComb=n>0?n:null;
  if(n>0)localStorage.setItem('ccPrecioComb',n);else localStorage.removeItem('ccPrecioComb');
  rCostControl();
}

// ── Tarifas de equipos (valores contractuales — fallback si la tabla DB está vacía) ──
const _CC_TARIFA_EQ=[
  {tipo:'Línea Amarilla', kw:['martillo'],                                   lab:'Excavadora Martillo Hidráulico', seca:383.32,   full:457.32,   un:'HM'},
  {tipo:'Línea Amarilla', kw:['excavadora','excavador'],                     lab:'Excavadora Normal',               seca:253.45,   full:383.32,   un:'HM'},
  {tipo:'Línea Amarilla', kw:['cargador frontal','cargador'],                lab:'Cargador Frontal',                seca:258.40,   full:318.25,   un:'HM'},
  {tipo:'Línea Amarilla', kw:['tractor oruga','tractor'],                    lab:'Tractor Oruga',                   seca:237.50,   full:363.47,   un:'HM'},
  {tipo:'Línea Amarilla', kw:['retroexcavadora'],                            lab:'Retroexcavadora',                 seca:105.45,   full:155.96,   un:'HM'},
  {tipo:'Línea Amarilla', kw:['motoniveladora'],                             lab:'Motoniveladora',                  seca:222.00,   full:299.92,   un:'HM'},
  {tipo:'Línea Amarilla', kw:['rodillo'],                                    lab:'Rodillo de 19 TN',               seca:171.00,   full:227.32,   un:'HM'},
  {tipo:'Línea Blanca',   kw:['volquete'],                                   lab:'Camión Volquete 15 M3',           seca:107.30,   full:153.48,   un:'HM'},
  {tipo:'Línea Blanca',   kw:['cisterna de agua','cisterna agua'],           lab:'Cisterna de Agua 5000 GLN',       seca:23145.50, full:28773.20, un:'MES'},
  {tipo:'Línea Blanca',   kw:['cisterna de combustible 2000','combustible 2000','comb 2000'],
                                                                              lab:'Cisterna Combustible 2000 GLN',  seca:17860.00, full:21467.50, un:'MES'},
  {tipo:'Línea Blanca',   kw:['cisterna de combustible','cisterna combustible','cisterna comb','cisterna d2l'],
                                                                              lab:'Cisterna Combustible 1000 GLN',  seca:12464.40, full:14773.20, un:'MES'},
  {tipo:'Línea Blanca',   kw:['utilitario','camion utilitario'],             lab:'Camión Utilitario Mecánico',      seca:20550.60, full:24773.20, un:'MES'},
  {tipo:'Vehículo Menor', kw:['coaster','couster'],                          lab:'Couster 25 Pasajeros',            seca:16428.00, full:18022.20, un:'MES'},
  {tipo:'Vehículo Menor', kw:['camioneta','pickup','pick-up'],               lab:'Camioneta 4 Pasajeros',           seca:8769.00,  full:9934.50,  un:'MES'},
];

// ── Tarifas de personal por cargo (costo mensual) ──
const _CC_TARIFA_HH=[
  {kw:['operador excavadora','op. excavadora'],         lab:'Operador Excavadora',         mes:6091.40},
  {kw:['operador volquete','op. volquete'],             lab:'Operador Volquete',           mes:5237.30},
  {kw:['operador motoniveladora','op. motonil'],        lab:'Operador Motoniveladora',     mes:6091.40},
  {kw:['operador tractor'],                             lab:'Operador Tractor Oruga',      mes:6091.40},
  {kw:['operador rodillo'],                             lab:'Operador Rodillo',            mes:5749.70},
  {kw:['operador retroexcavadora','op. retro'],         lab:'Operador Retroexcavadora',    mes:5749.70},
  {kw:['operador cargador'],                            lab:'Operador Cargador Frontal',   mes:6091.40},
  {kw:['operador cisterna agua'],                       lab:'Operador Cisterna Agua',      mes:5237.30},
  {kw:['operador múltiple l.amarilla','op múltiple amarilla','operador multiple amarilla'],
                                                         lab:'Op. Múltiple L.Amarilla',    mes:6518.30},
  {kw:['operador múltiple l.blanca','op múltiple blanca','operador multiple blanca'],
                                                         lab:'Op. Múltiple L.Blanca',      mes:6518.30},
  {kw:['operador cisterna combustible','operador cisterna'],lab:'Op. Cisterna Combustible',mes:5237.30},
  {kw:['conductor coaster','conductor bus'],            lab:'Conductor Coaster',           mes:5151.80},
  {kw:['conductor camioneta'],                          lab:'Conductor Camioneta',         mes:4793.60},
  {kw:['supervisor técnico','supervisor tecnico'],      lab:'Supervisor Técnico',          mes:11130.20},
  {kw:['operario'],                                     lab:'Operario',                    mes:5237.30},
  {kw:['oficial'],                                      lab:'Oficial',                     mes:4981.10},
  {kw:['peón','peon'],                                  lab:'Peón',                        mes:4724.90},
];

// ── Período 21→20 ──
function _ccPeriodo(){
  const hoy=new Date();
  const d=hoy.getDate(), m=hoy.getMonth(), y=hoy.getFullYear();
  // Inicio del período actual: si hoy ≥ 21 → empieza este mes; si no → empezó el mes pasado
  let baseY=y, baseM=m;
  if(d<21){baseM=m-1; if(baseM<0){baseM=11;baseY=y-1;}}
  // Aplicar offset en meses completos
  let iniM=baseM+_ccOffset, iniY=baseY;
  while(iniM>11){iniM-=12;iniY++;}
  while(iniM<0){iniM+=12;iniY--;}
  const ini=new Date(iniY,iniM,21);
  const fin=new Date(iniY,iniM+1,20);
  const fmtD=x=>`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;
  const MESES=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const diasTot=Math.round((fin-ini)/86400000)+1;
  return {desde:fmtD(ini), hasta:fmtD(fin), label:`${MESES[fin.getMonth()]} ${fin.getFullYear()}`, dias:diasTot};
}

// ── Coincidencia tarifa equipo (usa DB si tiene datos, sino fallback hardcoded) ──
// Normaliza texto: minúsculas, sin tildes, sin puntuación
function _ccNorm(s){
  return (s||'').toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g,"")
    .replace(/[.,;:]/g,' ').replace(/\s+/g,' ').trim();
}
function _ccMatchEq(eq){
  const txt=_ccNorm((eq.sub||'')+' '+(eq.nombre||'')+' '+(eq.marca||'')+' '+(eq.modelo||''));
  const dbTarifas=DB.tarifasEq||[];
  if(dbTarifas.length){
    // 1º pasada: por palabras clave (más específico)
    for(const t of dbTarifas){
      const kws=(t.palabrasClave||'').split(',').map(k=>_ccNorm(k)).filter(Boolean);
      if(kws.length&&kws.some(k=>txt.includes(k))){
        return{lab:t.desc,seca:+t.tarifaSeca||0,full:+t.tarifaFull||0,costo:+t.tarifaCosto||0,un:t.unidad||'HM'};
      }
    }
    // 2º pasada: por descripción de la tarifa (fallback)
    for(const t of dbTarifas){
      const desc=_ccNorm(t.desc);
      if(desc&&txt.includes(desc)){
        return{lab:t.desc,seca:+t.tarifaSeca||0,full:+t.tarifaFull||0,costo:+t.tarifaCosto||0,un:t.unidad||'HM'};
      }
    }
    return null;
  }
  for(const t of _CC_TARIFA_EQ){
    if(t.kw.some(k=>txt.includes(k.toLowerCase()))) return t;
  }
  return null;
}

// ── Coincidencia tarifa personal ──
// Tarifa de venta del cargo. Manda lo configurado en HH Venta (tabla
// venta_personal); si ese cargo no está cargado ahí, se usa la lista de
// referencia del código como respaldo.
function _ccMatchHH(cargo){
  const c=(cargo||'').toLowerCase();
  const norm=x=>String(x||'').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^A-Z0-9]+/g,' ').trim();
  const nc=norm(cargo);
  const v=(DB.ventaPersonal||[]).find(t=>norm(t.cargo)===nc);
  if(v&&+v.tarifaMes>0)return{lab:v.cargo,mes:+v.tarifaMes,fuente:'HH Venta'};
  for(const t of _CC_TARIFA_HH){
    if(t.kw.some(k=>c.includes(k.toLowerCase())))return{...t,fuente:'referencia'};
  }
  return null;
}

function _ccFmt(n){return 'S/ '+Number(n||0).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});}

// ── Render principal ──
function rCostControl(){
  const per=_ccPeriodo();
  const modo=_ccTarifaModo;
  const KEY=modo==='seca'?'seca':'full';

  // Partes del período
  const partes=(DB.partes||[]).filter(p=>p.fecha>=per.desde&&p.fecha<=per.hasta);

  // — Combustible del período (despachos de almacén por equipo) —
  const despComb=(DB.combustible||[]).filter(c=>c.tipoMov!=='Ingreso'&&c.eqId&&c.fecha>=per.desde&&c.fecha<=per.hasta);
  const galMap={},costoRealMap={};let _galPerTot=0,_costoAlmTot=0;
  despComb.forEach(c=>{
    const g=+c.gal||0,imp=g*(+c.precio||0);
    galMap[c.eqId]=(galMap[c.eqId]||0)+g;
    // Costo REAL: cada despacho con el precio con el que se registró
    costoRealMap[c.eqId]=(costoRealMap[c.eqId]||0)+imp;
    _galPerTot+=g;_costoAlmTot+=imp;
  });
  const precioAlm=_galPerTot>0?_costoAlmTot/_galPerTot:0;       // precio promedio de almacén (referencia)
  const precioComb=_ccPrecioComb||precioAlm||6.30;               // precio configurable para Cost Control

  // — Costo real del proveedor: EDP ya emitidos en el período —
  // Si el equipo tiene un EDP emitido, ESE es el costo real (ya se acordó con el
  // proveedor). El cálculo automático horas × tarifa es solo el estimado para
  // los equipos que todavía no tienen su estado de pago.
  const edpMap={};
  (DB.edpProveedores||[]).forEach(e=>{
    if(e.estado==='Anulado'||!e.eqId)return;
    if((e.hasta||'')<per.desde||(e.desde||'')>per.hasta)return;   // fuera del período
    const mon=e.moneda||'SOLES';
    // Los EDP en dólares se convierten con el T.C. del módulo de proveedores
    const monto=typeof _aSoles==='function'?_aSoles(e.subtotal,mon):(+e.subtotal||0);
    const a=edpMap[e.eqId]||(edpMap[e.eqId]={monto:0,n:0,nums:[],moneda:'SOLES',orig:0});
    a.monto+=monto;a.orig+=+e.subtotal||0;a.n++;a.nums.push(e.numEdp||'');
    if(mon!=='SOLES')a.moneda=mon;
  });

  // — Costos de equipos —
  const eqMap={};
  partes.forEach(p=>{
    const eq=DB.equipos.find(e=>e.id===p.eqId);if(!eq)return;
    if(!eqMap[eq.id])eqMap[eq.id]={eq,horasEf:0,diasPresentes:new Set(),tarifa:_ccMatchEq(eq)};
    eqMap[eq.id].horasEf+=Math.max(0,+p.ef||0);
    eqMap[eq.id].diasPresentes.add(p.fecha);
  });
  const eqRows=Object.values(eqMap).map(r=>{
    const t=r.tarifa;
    const dias=r.diasPresentes.size;
    const factor=per.dias>0?dias/per.dias:0;
    // Unidad VENTA: viene de la tarifa coincidente (cómo se cobra al cliente)
    const unVenta=t?.un||r.eq.tarifaUn||'HM';
    // Unidad COSTO PROV.: viene del Master del equipo (cómo cobra el proveedor) — puede ser distinta
    const unCosto=r.eq.tarifaUn||unVenta;

    // Calcular VENTA según unidad de tarifa
    let venta=0;
    if(t){
      if(unVenta==='HM')       venta=r.horasEf*(t[KEY]||0);
      else if(unVenta==='DIA') venta=dias*(t[KEY]||0);
      else                     venta=factor*(t[KEY]||0); // MES
    }

    // COSTO PROVEEDOR — primero el EDP emitido (es lo que realmente se paga);
    // si no hay EDP, se estima con la tarifa del Máster según su unidad.
    let costoProveedor=0;
    const _edp=edpMap[r.eq.id];
    const tRate=+r.eq.tarifa||0;
    if(_edp){
      costoProveedor=_edp.monto;
    }else{
      if(unCosto==='HM')       costoProveedor=r.horasEf*tRate;
      else if(unCosto==='DIA') costoProveedor=dias*tRate;       // ej: 17 días × S/200
      else                     costoProveedor=factor*tRate;      // MES: incidencia × tarifa
    }

    // Combustible: por defecto el costo REAL registrado en cada despacho.
    // Con el precio manual activo se recalcula a galones × precio configurado.
    const galones=galMap[r.eq.id]||0;
    const costoBruto=_ccPrecioManual?galones*precioComb:(costoRealMap[r.eq.id]||0);
    // El registro de Combustible tiene los precios con IGV: solo este importe
    // se lleva a neto. Venta y costo de proveedor quedan como están.
    const costoComb=+(costoBruto*_ccFComb()).toFixed(2);
    // Margen: Full → Venta − (Costo Prov. + Combustible) · Seca → Venta − Costo Prov.
    const margen=venta-costoProveedor-(KEY==='full'?costoComb:0);

    return{...r,costo:venta,costoProveedor,galones,costoComb,margen,tarifaObj:t,un:unVenta,unCosto,edp:_edp||null};
  });
  const totalVentaEq=eqRows.reduce((s,r)=>s+r.costo,0);
  const totalCostoEq=eqRows.reduce((s,r)=>s+r.costoProveedor,0);
  const totalGalEq=eqRows.reduce((s,r)=>s+r.galones,0);
  const totalCombEq=eqRows.reduce((s,r)=>s+r.costoComb,0);
  const totalMargenEq=eqRows.reduce((s,r)=>s+r.margen,0);

  // — Costos de personal —
  // Misma regla que el módulo HH Venta (TD + TN + A5 + DL + DLT×2.5): antes
  // aquí solo se contaban los días trabajados y salía menos venta que allá.
  const hhRows=hhVentaPeriodo(per.desde,per.hasta).filas.map(r=>({
    persona:r.p,dias:r.trab+r.libre+r.dlt,
    tarifa:{lab:r.cargo,mes:r.tarifa},
    costoDia:per.dias>0?r.tarifa/per.dias:0,
    costo:r.venta
  }));
  const totalHH=hhRows.reduce((s,r)=>s+r.costo,0);
  const totalGen=totalVentaEq+totalHH;

  const _tabBtn=(k,label)=>{
    const act=_ccTabActiva===k;
    return`<button id="ccTab-${k}" onclick="_ccTab('${k}')" style="padding:.4rem 1rem;border:none;border-radius:7px 7px 0 0;cursor:pointer;font-size:.8rem;font-weight:700;background:${act?'var(--acc)':'transparent'};color:${act?'#fff':'var(--muted2)'};transition:all .2s">${label}</button>`;
  };

  document.getElementById('page-costControl').innerHTML=`
  <div style="padding:1rem 1.2rem">
    <!-- Encabezado -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:.6rem;margin-bottom:1rem">
      <div>
        <h2 style="font-size:1.45rem;font-weight:900;color:var(--text);margin:0;letter-spacing:-.02em">Cost Control</h2>
        <div style="font-size:.76rem;color:var(--muted2);margin-top:.2rem">Período 21→20 · <span class="mono">${per.desde}</span> al <span class="mono">${per.hasta}</span> · ${per.dias} días
          ${_ccSinIgv?'<span style="color:#10b981;font-weight:700;margin-left:.4rem">· COMB. SIN IGV</span>':''}
          ${_ccPrecioManual?'<span style="color:#f97316;font-weight:700;margin-left:.4rem">· PRECIO MANUAL</span>':''}</div>
      </div>
      <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap">
        <!-- Navegación de período -->
        <div style="display:flex;align-items:center;background:var(--panel2);border:1px solid var(--border);border-radius:8px;overflow:hidden">
          <button onclick="_ccNav(-1)" style="background:none;border:none;border-right:1px solid var(--border);color:var(--text);cursor:pointer;font-size:1.1rem;padding:.35rem .7rem;line-height:1">‹</button>
          <span style="font-weight:800;font-size:.88rem;color:var(--text);min-width:130px;text-align:center;padding:0 .5rem">${per.label}</span>
          <button onclick="_ccNav(1)" style="background:none;border:none;border-left:1px solid var(--border);color:var(--text);cursor:pointer;font-size:1.1rem;padding:.35rem .7rem;line-height:1">›</button>
        </div>
        <!-- Toggle Seca / Full -->
        <div style="display:flex;background:var(--panel2);border:1px solid var(--border);border-radius:8px;padding:.2rem;gap:.2rem">
          <button onclick="_ccSetModo('seca')" style="padding:.3rem .85rem;border-radius:6px;border:none;cursor:pointer;font-size:.75rem;font-weight:700;background:${modo==='seca'?'#3b82f6':'transparent'};color:${modo==='seca'?'#fff':'var(--muted2)'}">Máq. Seca</button>
          <button onclick="_ccSetModo('full')" style="padding:.3rem .85rem;border-radius:6px;border:none;cursor:pointer;font-size:.75rem;font-weight:700;background:${modo==='full'?'#8b5cf6':'transparent'};color:${modo==='full'?'#fff':'var(--muted2)'}">Tarifa Full</button>
        </div>
        <!-- Combustible: costo real del registro o precio manual (opcional) -->
        <div style="display:flex;align-items:center;gap:.5rem;background:var(--panel2);border:1px solid rgba(249,115,22,.4);border-radius:8px;padding:.28rem .6rem">
          <span style="font-size:.74rem;font-weight:700;color:#f97316">⛽</span>
          <label title="Sin marcar, el costo sale de cada despacho registrado en Combustible con su propio precio. Al marcarlo se recalcula todo a un precio único."
            style="display:flex;align-items:center;gap:.3rem;cursor:pointer;user-select:none">
            <input type="checkbox" ${_ccPrecioManual?'checked':''} onchange="_ccTogglePrecioManual(this.checked)" style="width:auto;margin:0;cursor:pointer;accent-color:#f97316">
            <span style="font-size:.68rem;font-weight:700;color:${_ccPrecioManual?'#f97316':'var(--muted2)'};white-space:nowrap">Precio manual</span>
          </label>
          <input id="ccPrecioComb" type="number" step="0.01" min="0" value="${precioComb.toFixed(2)}" ${_ccPrecioManual?'':'disabled'}
            onchange="_ccSetPrecioComb(this.value)"
            style="width:60px;background:transparent;border:none;border-bottom:1px dashed rgba(249,115,22,.5);color:${_ccPrecioManual?'var(--text)':'var(--muted)'};font-family:monospace;font-weight:700;font-size:.82rem;outline:none;text-align:right;opacity:${_ccPrecioManual?'1':'.45'}">
          <span style="font-size:.62rem;color:var(--muted2);white-space:nowrap">/gal${!_ccPrecioManual&&precioAlm>0?` · real S/ ${precioAlm.toFixed(2)}`:''}</span>
        </div>
        <!-- Sin IGV: solo el combustible -->
        <label title="El registro de Combustible tiene los precios con IGV. Marca esto para llevar SOLO el costo de combustible a valor neto (÷ 1.18). Venta y costo de proveedor no cambian."
          style="display:flex;align-items:center;gap:.4rem;background:${_ccSinIgv?'rgba(16,185,129,.15)':'var(--panel2)'};border:1px solid ${_ccSinIgv?'#10b981':'var(--border)'};border-radius:8px;padding:.3rem .7rem;cursor:pointer;user-select:none">
          <input type="checkbox" ${_ccSinIgv?'checked':''} onchange="_ccToggleIgv(this.checked)" style="width:auto;margin:0;cursor:pointer;accent-color:#10b981">
          <span style="font-size:.75rem;font-weight:700;color:${_ccSinIgv?'#10b981':'var(--muted2)'};white-space:nowrap">Comb. sin IGV</span>
          <span style="font-size:.62rem;color:var(--muted)">÷ 1.18</span>
        </label>
      </div>
    </div>
    ${(_ccSinIgv||_ccPrecioManual)?`<div style="margin:-.5rem 0 1rem;padding:.35rem .8rem;border-left:3px solid ${_ccPrecioManual?'#f97316':'#10b981'};background:${_ccPrecioManual?'rgba(249,115,22,.08)':'rgba(16,185,129,.08)'};border-radius:0 6px 6px 0;font-size:.7rem;color:${_ccPrecioManual?'#f97316':'#10b981'}">
      ${_ccPrecioManual
        ?`<strong>Combustible simulado</strong> — no se usa el costo registrado sino ${_ccSinIgv?`S/ ${(precioComb/_CC_IGV).toFixed(2)}/gal neto (S/ ${precioComb.toFixed(2)} ÷ ${_CC_IGV})`:`S/ ${precioComb.toFixed(2)}/gal`} para todos los despachos.`
        :`<strong>Combustible sin IGV</strong> — el costo real registrado se divide entre ${_CC_IGV}. Venta y costo de proveedor se mantienen tal cual.`}
    </div>`:''}

    <!-- KPIs -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(175px,1fr));gap:.65rem;margin-bottom:1.2rem">
      ${[
        {l:'Venta Equipos',       v:_ccFmt(totalVentaEq), c:'#06b6d4', s:`${eqRows.length} equipo(s) con partes`, ico:'🚜'},
        {l:'Venta Personal HH',   v:_ccFmt(totalHH),      c:'#8b5cf6', s:`${hhRows.length} persona(s) — ${per.dias}d`, ico:'👷'},
        {l:'Costo Prov. Eq.',     v:_ccFmt(totalCostoEq), c:'#f59e0b', s:(()=>{
          const nE=eqRows.filter(r=>r.edp).length,nS=eqRows.length-nE;
          return nE?`<span style="color:#10b981;font-weight:700">${nE} con EDP</span>${nS?` · ${nS} estimado${nS===1?'':'s'}`:''}`
                   :'estimado desde Tarifa del Master';
        })(), ico:'💸'},
        {l:'Combustible Eq.',     v:_ccFmt(totalCombEq),  c:'#f97316', s:`${totalGalEq.toFixed(1)} gal · S/ ${(totalGalEq>0?totalCombEq/totalGalEq:0).toFixed(2)}/gal ${_ccPrecioManual?'<span style="color:#f97316;font-weight:700">manual</span>':'<span style="color:var(--muted)">real</span>'}${_ccSinIgv?' <span style="color:#10b981;font-weight:700">neto</span>':''}`, ico:'⛽'},
        {l:'Margen Bruto Eq.',    v:_ccFmt(totalMargenEq), c:'#10b981', s:modo==='full'?'Venta − (C.Prov. + Comb.)':'Venta − Costo Prov.', ico:'📈'},
      ].map(k=>`
      <div style="background:var(--panel2);border:2px solid ${k.c}55;border-radius:10px;padding:.85rem 1rem;border-left:4px solid ${k.c}">
        <div style="font-size:.68rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.07em">${k.ico} ${k.l}</div>
        <div style="font-size:1.18rem;font-weight:900;color:${k.c};margin:.25rem 0;font-family:monospace;letter-spacing:-.01em">${k.v}</div>
        <div style="font-size:.66rem;color:var(--muted2)">${k.s}</div>
      </div>`).join('')}
    </div>

    <!-- Tabs -->
    <div style="display:flex;gap:.2rem;border-bottom:2px solid var(--border);margin-bottom:.9rem">
      ${_tabBtn('equipos','🚜 Equipos')}
      ${_tabBtn('personal','👷 Personal')}
      ${_tabBtn('resumen','📊 Resumen')}
    </div>

    <!-- Paneles -->
    <div id="ccPanel-equipos"  style="display:${_ccTabActiva==='equipos'?'':'none'}">${_ccPanelEquipos(eqRows,KEY,per.dias)}</div>
    <div id="ccPanel-personal" style="display:${_ccTabActiva==='personal'?'':'none'}">${_ccPanelPersonal(hhRows,per.dias)}</div>
    <div id="ccPanel-resumen"  style="display:${_ccTabActiva==='resumen'?'':'none'}">${_ccPanelResumen(eqRows,hhRows,totalVentaEq,totalCostoEq,totalHH,totalGen,KEY,totalCombEq,totalMargenEq)}</div>
  </div>`;
}

function _ccNav(dir){_ccOffset+=dir;rCostControl();}
function _ccSetModo(m){_ccTarifaModo=m;rCostControl();}
function _ccTab(t){
  _ccTabActiva=t;
  ['equipos','personal','resumen'].forEach(k=>{
    const p=document.getElementById('ccPanel-'+k);
    const b=document.getElementById('ccTab-'+k);
    if(p)p.style.display=k===t?'':'none';
    if(b){b.style.background=k===t?'var(--acc)':'transparent';b.style.color=k===t?'#fff':'var(--muted2)';}
  });
}

// ── Panel Equipos ──
function _ccPanelEquipos(rows,KEY,diasPeriodo){
  if(!rows.length) return`<div style="text-align:center;padding:3rem;color:var(--muted2);font-size:.88rem">Sin partes registrados en este período</div>`;

  const TH=`background:var(--panel2);color:var(--muted2);font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;padding:.5rem .7rem;white-space:nowrap`;
  const TD=`padding:.5rem .7rem;border-bottom:1px solid var(--border);font-size:.81rem;vertical-align:middle`;

  const grupos={};
  rows.forEach(r=>{const k=r.eq.tipo||'Otros';if(!grupos[k])grupos[k]=[];grupos[k].push(r);});

  let body='';
  Object.entries(grupos).forEach(([tipo,items])=>{
    const subVenta=items.reduce((s,r)=>s+r.costo,0);
    const subCosto=items.reduce((s,r)=>s+r.costoProveedor,0);
    const subGal=items.reduce((s,r)=>s+(r.galones||0),0);
    const subComb=items.reduce((s,r)=>s+(r.costoComb||0),0);
    const subMargen=items.reduce((s,r)=>s+(r.margen||0),0);
    body+=`<tr><td colspan="11" style="${TH};background:rgba(6,182,212,.07);color:#06b6d4;font-size:.71rem">${tipo} &nbsp;·&nbsp; ${items.length} equipo(s)</td></tr>`;
    items.forEach(r=>{
      const t=r.tarifaObj;
      const sinTarifa=!t;
      const dias=r.diasPresentes.size;
      const factor=diasPeriodo>0?dias/diasPeriodo:0;

      // Columna Incidencia
      const un=r.un||'HM';
      const incCell=un==='HM'
        ?`<span style="font-family:monospace;font-weight:700">${r.horasEf.toFixed(1)} h</span>`
        :un==='DIA'
        ?`<span style="font-family:monospace;font-weight:700">${dias} días</span>`
        :`<span style="font-family:monospace;font-weight:700">${dias}<span style="color:var(--muted2);font-weight:400">/${diasPeriodo}</span></span>
          <br><span style="font-size:.7rem;font-weight:700;color:${factor>=1?'#10b981':'#f59e0b'}">${(factor*100).toFixed(0)}%</span>`;

      // Columna Tarifa
      const unLabel=un==='HM'?'hora':un==='DIA'?'día':'mes';
      const tarifaCell=t?_ccFmt(t[KEY])+`<br><span style="font-size:.62rem;color:var(--muted2)">/${unLabel}</span>`
        :'<span style="color:#f59e0b;font-size:.72rem">Sin tarifa</span>';

      // Columna Costo Proveedor — el EDP emitido manda sobre el estimado
      const unCosto=r.unCosto||r.un||'HM';
      const sinCostoEq=!r.eq.tarifa;
      let costoPCell;
      if(r.edp){
        const nums=r.edp.nums.filter(Boolean).join(', ');
        const mx=r.edp.moneda!=='SOLES'
          ?`<br><span style="font-size:.6rem;color:#fbbf24">${r.edp.moneda==='DOLARES'?'US$':'€'} ${_ccFmt(r.edp.orig).replace('S/ ','')} × ${typeof _tcGet==='function'?_tcGet(r.edp.moneda):''}</span>`:'';
        costoPCell=`${_ccFmt(r.costoProveedor)}
          <br><span title="Costo real del EDP N° ${nums} emitido a este proveedor" style="font-size:.58rem;font-weight:800;color:#10b981;border:1px solid #10b98166;background:rgba(16,185,129,.14);border-radius:3px;padding:0 4px">EDP ${nums}</span>${mx}`;
      } else if(sinCostoEq){
        costoPCell=`<span style="color:var(--muted2);font-size:.7rem">Sin tarifa en<br>Master</span>`;
      } else {
        // Sin EDP: estimado con la tarifa del Máster, se muestra la fórmula
        const baseFmt=unCosto==='HM'?r.horasEf.toFixed(1)+'h':unCosto==='DIA'?dias+'d':((factor*100).toFixed(0)+'%');
        costoPCell=`${_ccFmt(r.costoProveedor)}
          <br><span title="Estimado: aún no hay EDP emitido para este equipo en el período" style="font-size:.61rem;color:rgba(245,158,11,.75)">≈ ${baseFmt} × S/${(+r.eq.tarifa||0).toFixed(0)}</span>`;
      }

      // Combustible (galones despachados en el período × precio configurado)
      const galones=r.galones||0;
      const combCell=galones>0
        ?`<span style="font-family:monospace;font-weight:700;color:#f97316">${galones.toFixed(1)}</span><span style="font-size:.62rem;color:var(--muted2)"> gal</span>`
        :'<span style="color:var(--muted2)">—</span>';
      const costoCombCell=galones>0
        ?_ccFmt(r.costoComb)
        :'<span style="color:var(--muted2)">—</span>';

      // Margen (Full: Venta − C.Prov − Comb · Seca: Venta − C.Prov)
      const margen=r.margen||0;
      const margenPct=r.costo>0?(margen/r.costo*100).toFixed(0):null;
      const margenColor=margen>0?'#10b981':margen<0?'#ef4444':'var(--muted2)';

      body+=`<tr onmouseover="this.style.background='var(--hover)'" onmouseout="this.style.background=''">
        <td style="${TD}"><span ondblclick="editEquipo(${r.eq.id})" title="Doble click: editar en Master de Equipos" style="font-family:monospace;font-size:.74rem;font-weight:700;color:#06b6d4;cursor:pointer;text-decoration:underline dotted;text-underline-offset:3px">${r.eq.codigo}</span></td>
        <td style="${TD}"><div style="font-weight:600">${r.eq.marca||''} ${r.eq.modelo||''}</div><div style="font-size:.68rem;color:var(--muted2)">${r.eq.sub||''}</div></td>
        <td style="${TD};text-align:center"><span style="background:rgba(6,182,212,.1);color:#06b6d4;border:1px solid rgba(6,182,212,.3);border-radius:4px;padding:2px 7px;font-size:.65rem;font-weight:700">${un}</span></td>
        <td style="${TD};text-align:center">${incCell}</td>
        <td style="${TD};text-align:right;font-family:monospace">${tarifaCell}</td>
        <td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:${sinTarifa?'#f59e0b':r.costo>0?'#06b6d4':'var(--muted2)'}">${sinTarifa?'—':_ccFmt(r.costo)}</td>
        <td style="${TD};text-align:right">${combCell}</td>
        <td style="${TD};text-align:right;font-family:monospace;font-weight:700;color:#f97316">${costoCombCell}</td>
        <td style="${TD};text-align:right;font-family:monospace;font-weight:700;color:#f59e0b">${costoPCell}</td>
        <td style="${TD};text-align:right;font-family:monospace;font-weight:700;color:${margenColor}">${margenPct!==null?margenPct+'%':'—'}</td>
        <td style="${TD};font-size:.72rem;color:#a78bfa">${r.eq.proyecto||'—'}</td>
      </tr>`;
    });
    body+=`<tr style="background:rgba(6,182,212,.04)">
      <td colspan="5" style="${TD};text-align:right;font-size:.76rem;font-weight:700;color:var(--muted2)">Subtotal ${tipo}</td>
      <td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:#06b6d4">${_ccFmt(subVenta)}</td>
      <td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:#f97316">${subGal>0?subGal.toFixed(1)+' gal':''}</td>
      <td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:#f97316">${_ccFmt(subComb)}</td>
      <td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:#f59e0b">${_ccFmt(subCosto)}</td>
      <td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:#10b981">${_ccFmt(subMargen)}</td>
      <td style="${TD}"></td>
    </tr>`;
  });

  const totVenta=rows.reduce((s,r)=>s+r.costo,0);
  const totCosto=rows.reduce((s,r)=>s+r.costoProveedor,0);
  const totGal=rows.reduce((s,r)=>s+(r.galones||0),0);
  const totComb=rows.reduce((s,r)=>s+(r.costoComb||0),0);
  const totMargen=rows.reduce((s,r)=>s+(r.margen||0),0);
  body+=`<tr style="background:rgba(6,182,212,.08)">
    <td colspan="5" style="${TD};font-weight:900;color:var(--text);font-size:.84rem;text-align:right">TOTAL EQUIPOS</td>
    <td style="${TD};text-align:right;font-family:monospace;font-weight:900;font-size:.95rem;color:#06b6d4">${_ccFmt(totVenta)}</td>
    <td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:#f97316">${totGal>0?totGal.toFixed(1)+' gal':''}</td>
    <td style="${TD};text-align:right;font-family:monospace;font-weight:900;font-size:.95rem;color:#f97316">${_ccFmt(totComb)}</td>
    <td style="${TD};text-align:right;font-family:monospace;font-weight:900;font-size:.95rem;color:#f59e0b">${_ccFmt(totCosto)}</td>
    <td style="${TD};text-align:right;font-family:monospace;font-weight:900;font-size:.95rem;color:#10b981">${_ccFmt(totMargen)}</td>
    <td style="${TD}"></td>
  </tr>`;

  return`<div style="overflow-x:auto;border-radius:10px;border:1px solid var(--border)">
    <table style="width:100%;border-collapse:collapse;min-width:1050px">
      <thead><tr>
        <th style="${TH}">Código</th><th style="${TH}">Equipo</th><th style="${TH};text-align:center">Un.</th>
        <th style="${TH};text-align:center">Incidencia</th><th style="${TH};text-align:right">Tarifa</th>
        <th style="${TH};text-align:right">Venta</th>
        <th style="${TH};text-align:right">Combustible</th>
        <th style="${TH};text-align:right">Costo Comb.</th>
        <th style="${TH};text-align:right">Costo Prov.</th>
        <th style="${TH};text-align:right">Margen</th>
        <th style="${TH}">Proyecto</th>
      </tr></thead>
      <tbody>${body}</tbody>
    </table>
  </div>`;
}

// ── Panel Personal ──
function _ccPanelPersonal(rows, diasPeriodo){
  if(!rows.length) return`<div style="text-align:center;padding:3rem;color:var(--muted2);font-size:.88rem">Sin personal registrado en este período (verificar tareaje)</div>`;

  const TH=`background:var(--panel2);color:var(--muted2);font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;padding:.5rem .7rem;white-space:nowrap`;
  const TD=`padding:.5rem .7rem;border-bottom:1px solid var(--border);font-size:.81rem;vertical-align:middle`;

  const sorted=[...rows].sort((a,b)=>b.costo-a.costo);
  const totalHH=sorted.reduce((s,r)=>s+r.costo,0);

  const filas=sorted.map(r=>`
    <tr onmouseover="this.style.background='var(--hover)'" onmouseout="this.style.background=''">
      <td style="${TD}"><span style="font-weight:700">${r.persona.ape||''}, ${r.persona.nom||''}</span></td>
      <td style="${TD};font-size:.74rem;color:var(--muted2)">${r.persona.cargo||'—'}</td>
      <td style="${TD}"><span style="background:rgba(139,92,246,.1);color:#8b5cf6;border:1px solid rgba(139,92,246,.3);border-radius:4px;padding:2px 8px;font-size:.64rem;font-weight:700">${r.tarifa.lab}</span></td>
      <td style="${TD};text-align:right;font-family:monospace;font-size:.78rem">${_ccFmt(r.tarifa.mes)}</td>
      <td style="${TD};text-align:center;font-family:monospace;font-weight:800;font-size:.9rem">${r.dias}</td>
      <td style="${TD};text-align:right;font-family:monospace;font-size:.76rem;color:var(--muted2)">${_ccFmt(r.costoDia)}</td>
      <td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:#8b5cf6">${_ccFmt(r.costo)}</td>
    </tr>`).join('');

  return`<div style="overflow-x:auto;border-radius:10px;border:1px solid var(--border)">
    <table style="width:100%;border-collapse:collapse;min-width:700px">
      <thead><tr>
        <th style="${TH}">Nombre</th><th style="${TH}">Cargo</th><th style="${TH}">Categoría HH</th>
        <th style="${TH};text-align:right">Costo Mensual</th><th style="${TH};text-align:center">Días</th>
        <th style="${TH};text-align:right">Costo / Día</th><th style="${TH};text-align:right">Total</th>
      </tr></thead>
      <tbody>
        ${filas}
        <tr style="background:rgba(139,92,246,.07)">
          <td colspan="6" style="${TD};text-align:right;font-weight:900;font-size:.84rem;color:var(--text)">TOTAL PERSONAL</td>
          <td style="${TD};text-align:right;font-family:monospace;font-weight:900;font-size:1rem;color:#8b5cf6">${_ccFmt(totalHH)}</td>
        </tr>
      </tbody>
    </table>
  </div>`;
}

// ── Panel Resumen ──
function _ccPanelResumen(eqRows,hhRows,totalVentaEq,totalCostoEq,totalHH,totalGen,KEY,totalCombEq,totalMargenEq){
  const totalEq=totalVentaEq;
  const BAR=(v,max,c)=>{
    const p=max>0?Math.min(100,(v/max)*100):0;
    return`<div style="height:5px;background:var(--border);border-radius:3px;margin-top:5px"><div style="width:${p.toFixed(1)}%;height:100%;background:${c};border-radius:3px"></div></div>`;
  };
  const PCT=(v,tot)=>tot>0?'('+((v/tot)*100).toFixed(1)+'%)':'(0%)';

  // Agrupaciones equipo
  const eqGrupo={};
  eqRows.forEach(r=>{const k=r.eq.tipo||'Otros';if(!eqGrupo[k])eqGrupo[k]={items:0,costo:0};eqGrupo[k].items++;eqGrupo[k].costo+=r.costo;});
  // Agrupaciones HH
  const hhGrupo={};
  hhRows.forEach(r=>{const k=r.tarifa.lab;if(!hhGrupo[k])hhGrupo[k]={count:0,costo:0};hhGrupo[k].count++;hhGrupo[k].costo+=r.costo;});

  // Desglose por tipo de tarifa equipo (HM vs MES)
  const costoHM=eqRows.filter(r=>r.tarifaObj?.un==='HM').reduce((s,r)=>s+r.costo,0);
  const costoMES=eqRows.filter(r=>r.tarifaObj?.un==='MES').reduce((s,r)=>s+r.costo,0);

  const P2='background:var(--panel2);border:1px solid var(--border);border-radius:10px;padding:1rem';
  const ROW=(lab,v,tot,c)=>`<div style="margin-bottom:.65rem">
    <div style="display:flex;justify-content:space-between;font-size:.79rem">
      <span style="color:var(--text);font-weight:600">${lab}</span>
      <span style="font-family:monospace;font-weight:700;color:${c}">${_ccFmt(v)} <span style="color:var(--muted2);font-weight:400;font-size:.7rem">${PCT(v,tot)}</span></span>
    </div>${BAR(v,tot,c)}</div>`;

  return`<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">

    <!-- Equipos por línea -->
    <div style="${P2}">
      <div style="font-weight:800;font-size:.88rem;color:var(--text);margin-bottom:.9rem">🚜 Equipos por Línea</div>
      ${Object.entries(eqGrupo).map(([t,{items,costo}])=>ROW(`${t} (${items})`,costo,totalEq,'#06b6d4')).join('')}
      <div style="font-size:.7rem;color:var(--muted2);margin:-.2rem 0 .5rem">
        Por unidad: <span style="color:#06b6d4">HM ${_ccFmt(costoHM)}</span> · <span style="color:#0ea5e9">MES ${_ccFmt(costoMES)}</span>
      </div>
      <div style="border-top:1px solid var(--border);padding-top:.5rem;display:flex;justify-content:space-between;font-weight:900">
        <span style="font-size:.82rem;color:var(--text)">Total Equipos</span>
        <span style="font-family:monospace;color:#06b6d4">${_ccFmt(totalEq)}</span>
      </div>
    </div>

    <!-- Personal por categoría -->
    <div style="${P2}">
      <div style="font-weight:800;font-size:.88rem;color:var(--text);margin-bottom:.9rem">👷 Personal por Categoría HH</div>
      ${Object.entries(hhGrupo).map(([k,{count,costo}])=>ROW(`${k} (${count})`,costo,totalHH,'#8b5cf6')).join('')}
      <div style="border-top:1px solid var(--border);padding-top:.5rem;display:flex;justify-content:space-between;font-weight:900">
        <span style="font-size:.82rem;color:var(--text)">Total Personal</span>
        <span style="font-family:monospace;color:#8b5cf6">${_ccFmt(totalHH)}</span>
      </div>
    </div>

    <!-- Gran Total -->
    <div style="grid-column:1/-1;${P2};background:linear-gradient(120deg,rgba(245,158,11,.08),rgba(6,182,212,.06));border-color:rgba(245,158,11,.35)">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.8rem">
        <div>
          <div style="font-size:.75rem;color:var(--muted2);font-weight:700;letter-spacing:.08em;text-transform:uppercase">Venta Total del Período</div>
          <div style="font-size:2.1rem;font-weight:900;color:#06b6d4;font-family:monospace;letter-spacing:-.02em;line-height:1.1">${_ccFmt(totalGen)}</div>
          <div style="font-size:.72rem;color:var(--muted2);margin-top:.25rem">
            Eq. Venta <span style="color:#06b6d4">${_ccFmt(totalVentaEq)}</span> &nbsp;·&nbsp;
            Eq. Costo Prov. <span style="color:#f59e0b">${_ccFmt(totalCostoEq)}</span> &nbsp;·&nbsp;
            Combustible <span style="color:#f97316">${_ccFmt(totalCombEq||0)}</span> &nbsp;·&nbsp;
            HH <span style="color:#8b5cf6">${_ccFmt(totalHH)}</span>
          </div>
          <div style="font-size:.76rem;font-weight:700;color:#10b981;margin-top:.3rem">
            Margen Eq.: ${_ccFmt(totalMargenEq||0)}
            ${totalVentaEq>0?' ('+((totalMargenEq||0)/totalVentaEq*100).toFixed(1)+'%)':''}
            <span style="color:var(--muted2);font-weight:400;font-size:.68rem">${KEY==='full'?'= Venta − (C.Prov. + Comb.)':'= Venta − Costo Prov.'}</span>
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-size:.8rem;color:var(--muted2)">${eqRows.length} equipo(s) con partes</div>
          <div style="font-size:.8rem;color:var(--muted2)">${hhRows.length} persona(s) en período</div>
          <div style="font-size:.74rem;font-weight:700;color:#f59e0b;margin-top:.3rem">Tarifa: ${_ccTarifaModo==='seca'?'Máquina Seca':'Full (seca + combustible)'}</div>
        </div>
      </div>
    </div>

  </div>`;
}
