// ══ VENTA (placeholder) ══
function rVenta(){
  document.getElementById('page-venta').innerHTML=`
  <div style="padding:1rem 1.2rem">
    <h2 style="font-size:1.4rem;font-weight:900;color:var(--text);margin:0 0 .4rem">Venta</h2>
    <div style="font-size:.8rem;color:var(--muted2)">Módulo en construcción</div>
  </div>`;
}

// ══ TARIFAS DE EQUIPOS ══
let _tarifaEditId=null;
const _TF_IS='width:100%;background:var(--panel2);border:1px solid var(--border);border-radius:7px;padding:.45rem .65rem;color:var(--text);font-size:.82rem;box-sizing:border-box';

function rTarifas(){
  const tarifas=[...DB.tarifasEq].sort((a,b)=>(a.tipo||'').localeCompare(b.tipo||'')||(a.descripcion||'').localeCompare(b.descripcion||''));
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
    body+=`<tr><td colspan="8" style="${TH};background:rgba(5,150,105,.06);color:#059669;font-size:.7rem">${tipo} &nbsp;·&nbsp; ${items.length} tarifa(s)</td></tr>`;
    items.forEach(t=>{
      const margen=t.tarifaSeca>0&&t.tarifaCosto>0?((t.tarifaSeca-t.tarifaCosto)/t.tarifaSeca*100):null;
      body+=`<tr onmouseover="this.style.background='var(--hover)'" onmouseout="this.style.background=''">
        <td style="${TD}">
          <span style="background:${tc}18;color:${tc};border:1px solid ${tc}40;border-radius:4px;padding:2px 8px;font-size:.65rem;font-weight:700">${t.unidad||'HM'}</span>
        </td>
        <td style="${TD};font-weight:600">${t.descripcion||'—'}</td>
        <td style="${TD};text-align:right;font-family:monospace;color:#06b6d4;font-weight:700">${_ccFmt(t.tarifaSeca||0)}</td>
        <td style="${TD};text-align:right;font-family:monospace;color:#8b5cf6;font-weight:700">${_ccFmt(t.tarifaFull||0)}</td>
        <td style="${TD};text-align:right;font-family:monospace;color:#f59e0b;font-weight:700">${_ccFmt(t.tarifaCosto||0)}</td>
        <td style="${TD};text-align:center;font-size:.75rem;font-weight:700;color:${margen!==null?(margen>=20?'#10b981':'#f59e0b'):'var(--muted2)'}">${margen!==null?margen.toFixed(1)+'%':'—'}</td>
        <td style="${TD};font-size:.68rem;color:var(--muted2);max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${t.palabrasClave||''}">${t.palabrasClave||'—'}</td>
        <td style="${TD};white-space:nowrap">
          <button class="btn btn-out btn-sm" onclick="openTarifaEdit(${t.id})" title="Editar" style="color:#f59e0b;border-color:#f59e0b50;margin-right:.25rem">✏️</button>
          <button class="btn btn-del btn-sm" onclick="delTarifa(${t.id})" title="Eliminar">🗑</button>
        </td>
      </tr>`;
    });
  });

  if(!body) body=`<tr><td colspan="8" style="text-align:center;padding:2.5rem;color:var(--muted2);font-size:.85rem">
    Sin tarifas registradas. &nbsp;
    <button onclick="cargarTarifasIniciales()" style="background:rgba(5,150,105,.15);border:1px solid rgba(5,150,105,.4);color:#059669;border-radius:7px;padding:.3rem .8rem;font-size:.78rem;font-weight:700;cursor:pointer">⬇ Cargar tarifas contractuales</button>
  </td></tr>`;

  document.getElementById('page-tarifas').innerHTML=`
  <div style="padding:1rem 1.2rem">
    <!-- Header -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:.6rem;margin-bottom:.9rem">
      <div>
        <h2 style="font-size:1.35rem;font-weight:900;color:var(--text);margin:0;letter-spacing:-.02em">🏷️ Tarifas de Equipos</h2>
        <div style="font-size:.74rem;color:var(--muted2);margin-top:.2rem">${tarifas.length} tarifa(s) configurada(s) · Tarifa Venta (Seca / Full) y Tarifa Costo Proveedor</div>
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
      <span style="display:flex;align-items:center;gap:.3rem"><span style="width:9px;height:9px;background:#f59e0b;border-radius:2px"></span>Tarifa Costo Proveedor</span>
      <span style="display:flex;align-items:center;gap:.3rem"><span style="width:9px;height:9px;background:#10b981;border-radius:2px"></span>% Margen (Seca−Costo)</span>
    </div>

    <!-- Tabla -->
    <div style="overflow-x:auto;border-radius:10px;border:1px solid var(--border)">
      <table style="width:100%;border-collapse:collapse;min-width:750px">
        <thead><tr>
          <th style="${TH};text-align:center">Un.</th>
          <th style="${TH}">Descripción</th>
          <th style="${TH};text-align:right">Venta Seca</th>
          <th style="${TH};text-align:right">Venta Full</th>
          <th style="${TH};text-align:right">Costo Proveedor</th>
          <th style="${TH};text-align:center">Margen</th>
          <th style="${TH}">Palabras Clave</th>
          <th style="${TH};text-align:center">Acc.</th>
        </tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>
  </div>

  <!-- Modal Nueva/Editar Tarifa -->
  <div id="mTarifa" class="modal" onclick="if(event.target===this)closeM('mTarifa')">
    <div class="mcont" style="max-width:520px">
      <div class="mhdr">
        <span class="mttl" id="mTarifaTtl">Nueva Tarifa</span>
        <button class="mclose" onclick="closeM('mTarifa')">✕</button>
      </div>
      <div style="padding:1rem 1.1rem;display:grid;grid-template-columns:1fr 1fr;gap:.7rem">
        <div style="grid-column:1/-1">
          <div style="font-size:.7rem;color:var(--muted2);font-weight:700;margin-bottom:.25rem">TIPO DE EQUIPO</div>
          <select id="tfTipo" style="${_TF_IS}">
            <option>Línea Amarilla</option><option>Línea Blanca</option>
            <option>Vehículo Menor</option><option>Equipos Menores</option><option>Otros</option>
          </select>
        </div>
        <div style="grid-column:1/-1">
          <div style="font-size:.7rem;color:var(--muted2);font-weight:700;margin-bottom:.25rem">DESCRIPCIÓN DEL EQUIPO</div>
          <input id="tfDesc" placeholder="Ej: Excavadora Normal 336" style="${_TF_IS}">
        </div>
        <div>
          <div style="font-size:.7rem;color:var(--muted2);font-weight:700;margin-bottom:.25rem">UNIDAD</div>
          <select id="tfUn" style="${_TF_IS}">
            <option value="HM">HM — Hora Máquina</option>
            <option value="MES">MES — Mensual</option>
          </select>
        </div>
        <div></div>
        <div>
          <div style="font-size:.7rem;color:#06b6d4;font-weight:700;margin-bottom:.25rem">TARIFA VENTA SECA S/</div>
          <input id="tfSeca" type="number" step="0.01" min="0" placeholder="0.00" style="${_TF_IS};color:#06b6d4">
        </div>
        <div>
          <div style="font-size:.7rem;color:#8b5cf6;font-weight:700;margin-bottom:.25rem">TARIFA VENTA FULL S/</div>
          <input id="tfFull" type="number" step="0.01" min="0" placeholder="0.00" style="${_TF_IS};color:#8b5cf6">
        </div>
        <div style="grid-column:1/-1">
          <div style="font-size:.7rem;color:#f59e0b;font-weight:700;margin-bottom:.25rem">TARIFA COSTO PROVEEDOR S/</div>
          <input id="tfCosto" type="number" step="0.01" min="0" placeholder="0.00" style="${_TF_IS};color:#f59e0b">
        </div>
        <div style="grid-column:1/-1">
          <div style="font-size:.7rem;color:var(--muted2);font-weight:700;margin-bottom:.25rem">PALABRAS CLAVE (separadas por coma)</div>
          <input id="tfKw" placeholder="excavadora, excavador, cat 336" style="${_TF_IS}">
          <div style="font-size:.65rem;color:var(--muted2);margin-top:.3rem">Términos del nombre o subtipo del equipo para asignación automática en Cost Control.</div>
        </div>
      </div>
      <div style="padding:0 1.1rem 1rem;display:flex;justify-content:flex-end;gap:.5rem">
        <button onclick="closeM('mTarifa')" class="btn btn-out">Cancelar</button>
        <button onclick="gTarifa()" style="background:#059669;color:#fff;border:none;border-radius:7px;padding:.4rem 1.1rem;font-weight:700;cursor:pointer;font-size:.85rem">Guardar</button>
      </div>
    </div>
  </div>`;
}

function openTarifaNew(){
  _tarifaEditId=null;
  document.getElementById('mTarifaTtl').textContent='Nueva Tarifa';
  ['tfDesc','tfSeca','tfFull','tfCosto','tfKw'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  const t=document.getElementById('tfTipo');if(t)t.value='Línea Amarilla';
  const u=document.getElementById('tfUn');if(u)u.value='HM';
  openM('mTarifa');
}

function openTarifaEdit(id){
  const t=DB.tarifasEq.find(x=>x.id===id);if(!t)return;
  _tarifaEditId=id;
  document.getElementById('mTarifaTtl').textContent='Editar Tarifa';
  document.getElementById('tfTipo').value=t.tipo||'Línea Amarilla';
  document.getElementById('tfDesc').value=t.descripcion||'';
  document.getElementById('tfUn').value=t.unidad||'HM';
  document.getElementById('tfSeca').value=t.tarifaSeca||'';
  document.getElementById('tfFull').value=t.tarifaFull||'';
  document.getElementById('tfCosto').value=t.tarifaCosto||'';
  document.getElementById('tfKw').value=t.palabrasClave||'';
  openM('mTarifa');
}

function gTarifa(){
  const desc=(document.getElementById('tfDesc').value||'').trim();
  if(!desc){toast('Ingrese una descripción',true);return;}
  const rec={
    tipo:document.getElementById('tfTipo').value,
    descripcion:desc,
    unidad:document.getElementById('tfUn').value,
    tarifaSeca:+document.getElementById('tfSeca').value||0,
    tarifaFull:+document.getElementById('tfFull').value||0,
    tarifaCosto:+document.getElementById('tfCosto').value||0,
    palabrasClave:(document.getElementById('tfKw').value||'').trim()
  };
  if(_tarifaEditId!==null){
    const idx=DB.tarifasEq.findIndex(x=>x.id===_tarifaEditId);
    if(idx>-1){Object.assign(DB.tarifasEq[idx],rec);syncSheet('saveTarifaEq',DB.tarifasEq[idx]);}
    _tarifaEditId=null;
  }else{
    rec.id=nid('teq');
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
    const rec={id:nid('teq'),tipo:t.tipo||'Otros',descripcion:t.lab,unidad:t.un,
      tarifaSeca:t.seca,tarifaFull:t.full,tarifaCosto:0,palabrasClave:t.kw.join(', ')};
    DB.tarifasEq.push(rec);
    syncSheet('saveTarifaEq',rec);
  }
  rTarifas();toast('Tarifas iniciales cargadas — ingresa las tarifas costo de proveedor');
}

// ══ COST CONTROL ══
let _ccOffset=0, _ccTarifaModo='seca', _ccTabActiva='equipos';

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
function _ccMatchEq(eq){
  const txt=((eq.sub||'')+' '+(eq.nombre||'')+' '+(eq.marca||'')+' '+(eq.modelo||'')).toLowerCase();
  const dbTarifas=DB.tarifasEq||[];
  if(dbTarifas.length){
    for(const t of dbTarifas){
      const kws=(t.palabrasClave||'').split(',').map(k=>k.trim().toLowerCase()).filter(Boolean);
      if(kws.length&&kws.some(k=>txt.includes(k))){
        // Normalizar campos DB al mismo shape que hardcoded
        return{lab:t.descripcion,seca:+t.tarifaSeca||0,full:+t.tarifaFull||0,costo:+t.tarifaCosto||0,un:t.unidad||'HM'};
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
function _ccMatchHH(cargo){
  const c=(cargo||'').toLowerCase();
  for(const t of _CC_TARIFA_HH){
    if(t.kw.some(k=>c.includes(k.toLowerCase()))) return t;
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
    const costo=t?(t.un==='HM'?r.horasEf*(t[KEY]):(t[KEY])):0;
    return{...r,costo,tarifaObj:t};
  });
  const totalEq=eqRows.reduce((s,r)=>s+r.costo,0);

  // — Costos de personal —
  const hhMap={};
  const personal=(DB.personal||[]).filter(p=>(p.est||'').toLowerCase()==='activo'||(p.est||'')==='');
  const tareajeP=(DB.tareaje||[]).filter(t=>t.fecha>=per.desde&&t.fecha<=per.hasta&&['TD','TN','A5'].includes(t.tipo||''));
  tareajeP.forEach(t=>{
    const per2=personal.find(p=>p.id===t.personalId);if(!per2)return;
    const tarHH=_ccMatchHH(per2.cargo);if(!tarHH)return;
    if(!hhMap[per2.id])hhMap[per2.id]={persona:per2,dias:0,tarifa:tarHH};
    hhMap[per2.id].dias++;
  });
  const hhRows=Object.values(hhMap).map(r=>{
    const costoDia=r.tarifa.mes/30;
    return{...r,costoDia,costo:costoDia*r.dias};
  });
  const totalHH=hhRows.reduce((s,r)=>s+r.costo,0);
  const totalGen=totalEq+totalHH;

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
        <div style="font-size:.76rem;color:var(--muted2);margin-top:.2rem">Período 21→20 · <span class="mono">${per.desde}</span> al <span class="mono">${per.hasta}</span> · ${per.dias} días</div>
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
      </div>
    </div>

    <!-- KPIs -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(175px,1fr));gap:.65rem;margin-bottom:1.2rem">
      ${[
        {l:'Costo Equipos',       v:_ccFmt(totalEq),      c:'#06b6d4', s:`${eqRows.length} equipo(s) con partes`, ico:'🚜'},
        {l:'Costo Personal (HH)', v:_ccFmt(totalHH),      c:'#8b5cf6', s:`${hhRows.length} persona(s) registradas`, ico:'👷'},
        {l:'Costo Total',         v:_ccFmt(totalGen),      c:'#f59e0b', s:`Período ${per.label}`, ico:'💰'},
        {l:'Partes en Período',   v:partes.length,         c:'#10b981', s:`${per.dias} días de corte`, ico:'📋'},
      ].map(k=>`
      <div style="background:var(--panel2);border:1px solid var(--border);border-radius:10px;padding:.85rem 1rem;border-left:3px solid ${k.c}">
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
    <div id="ccPanel-equipos"  style="display:${_ccTabActiva==='equipos'?'':'none'}">${_ccPanelEquipos(eqRows,KEY)}</div>
    <div id="ccPanel-personal" style="display:${_ccTabActiva==='personal'?'':'none'}">${_ccPanelPersonal(hhRows,per.dias)}</div>
    <div id="ccPanel-resumen"  style="display:${_ccTabActiva==='resumen'?'':'none'}">${_ccPanelResumen(eqRows,hhRows,totalEq,totalHH,totalGen,KEY)}</div>
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
function _ccPanelEquipos(rows,KEY){
  if(!rows.length) return`<div style="text-align:center;padding:3rem;color:var(--muted2);font-size:.88rem">Sin partes registrados en este período</div>`;

  const TH=`background:var(--panel2);color:var(--muted2);font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;padding:.5rem .7rem;white-space:nowrap`;
  const TD=`padding:.5rem .7rem;border-bottom:1px solid var(--border);font-size:.81rem;vertical-align:middle`;

  // Agrupar por tipo de equipo
  const grupos={};
  rows.forEach(r=>{const k=r.eq.tipo||'Otros';if(!grupos[k])grupos[k]=[];grupos[k].push(r);});

  let body='';
  Object.entries(grupos).forEach(([tipo,items])=>{
    const sub=items.reduce((s,r)=>s+r.costo,0);
    body+=`<tr><td colspan="7" style="${TH};background:rgba(6,182,212,.07);color:#06b6d4;font-size:.71rem">${tipo} &nbsp;·&nbsp; ${items.length} equipo(s)</td></tr>`;
    items.forEach(r=>{
      const t=r.tarifaObj;
      const sinTarifa=!t;
      const val=t?_ccFmt(t[KEY])+`<br><span style="font-size:.63rem;color:var(--muted2)">/${t.un==='HM'?'hora':'mes'}</span>`:'<span style="color:#f59e0b;font-size:.72rem">Sin tarifa asignada</span>';
      const med=t?.un==='HM'?r.horasEf.toFixed(1)+' h':r.diasPresentes.size+' días';
      body+=`<tr onmouseover="this.style.background='var(--hover)'" onmouseout="this.style.background=''">
        <td style="${TD}"><span style="font-family:monospace;font-size:.74rem;font-weight:700;color:#06b6d4">${r.eq.codigo}</span></td>
        <td style="${TD}"><div style="font-weight:600">${r.eq.marca||''} ${r.eq.modelo||''}</div><div style="font-size:.68rem;color:var(--muted2)">${r.eq.sub||''}</div></td>
        <td style="${TD};text-align:center"><span style="background:rgba(6,182,212,.1);color:#06b6d4;border:1px solid rgba(6,182,212,.3);border-radius:4px;padding:2px 7px;font-size:.65rem;font-weight:700">${t?.un||'?'}</span></td>
        <td style="${TD};text-align:right;font-family:monospace;font-weight:700">${med}</td>
        <td style="${TD};text-align:right;font-family:monospace">${val}</td>
        <td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:${sinTarifa?'#f59e0b':r.costo>0?'#06b6d4':'var(--muted2)'}">${sinTarifa?'—':_ccFmt(r.costo)}</td>
        <td style="${TD};font-size:.72rem;color:#a78bfa">${r.eq.proyecto||'—'}</td>
      </tr>`;
    });
    body+=`<tr style="background:rgba(6,182,212,.04)">
      <td colspan="5" style="${TD};text-align:right;font-size:.76rem;font-weight:700;color:var(--muted2)">Subtotal ${tipo}</td>
      <td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:#06b6d4">${_ccFmt(sub)}</td>
      <td style="${TD}"></td>
    </tr>`;
  });

  const totalEq=rows.reduce((s,r)=>s+r.costo,0);
  body+=`<tr style="background:rgba(6,182,212,.08)">
    <td colspan="5" style="${TD};font-weight:900;color:var(--text);font-size:.84rem;text-align:right">TOTAL EQUIPOS</td>
    <td style="${TD};text-align:right;font-family:monospace;font-weight:900;font-size:1rem;color:#06b6d4">${_ccFmt(totalEq)}</td>
    <td style="${TD}"></td>
  </tr>`;

  return`<div style="overflow-x:auto;border-radius:10px;border:1px solid var(--border)">
    <table style="width:100%;border-collapse:collapse;min-width:680px">
      <thead><tr>
        <th style="${TH}">Código</th><th style="${TH}">Equipo</th><th style="${TH};text-align:center">Un.</th>
        <th style="${TH};text-align:right">Horas / Días</th><th style="${TH};text-align:right">Tarifa</th>
        <th style="${TH};text-align:right">Costo</th><th style="${TH}">Proyecto</th>
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
function _ccPanelResumen(eqRows,hhRows,totalEq,totalHH,totalGen,KEY){
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
          <div style="font-size:.75rem;color:var(--muted2);font-weight:700;letter-spacing:.08em;text-transform:uppercase">Costo Total del Período</div>
          <div style="font-size:2.1rem;font-weight:900;color:#f59e0b;font-family:monospace;letter-spacing:-.02em;line-height:1.1">${_ccFmt(totalGen)}</div>
          <div style="font-size:.72rem;color:var(--muted2);margin-top:.25rem">
            Equipos <span style="color:#06b6d4">${_ccFmt(totalEq)} ${PCT(totalEq,totalGen)}</span> &nbsp;·&nbsp;
            Personal <span style="color:#8b5cf6">${_ccFmt(totalHH)} ${PCT(totalHH,totalGen)}</span>
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-size:.8rem;color:var(--muted2)">${eqRows.length} equipo(s) con partes</div>
          <div style="font-size:.8rem;color:var(--muted2)">${hhRows.length} persona(s) en período</div>
          <div style="font-size:.74rem;font-weight:700;color:#f59e0b;margin-top:.3rem">Tarifa: ${_ccTarifaModo==='seca'?'Máquina Seca':'Full (con operador)'}</div>
        </div>
      </div>
    </div>

  </div>`;
}
