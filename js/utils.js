// ══ UTILS ══
const fmt=n=>'S/ '+Number(n).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});
const fmtN=n=>Number(n).toLocaleString('es-PE',{minimumFractionDigits:1,maximumFractionDigits:1});
const today=()=>new Date().toISOString().split('T')[0];
const nid=k=>DB.nx[k]++;
// ── Id nuevo a prueba de colisiones ─────────────────────────────────────────
// Los contadores de DB.nx arrancan en 1 en cada carga de página y solo se
// sincronizan con la base para las tablas listadas en el nxMap del loader.
// Para las que faltan, nid() devolvía un id ya usado y el upsert PISABA la fila
// existente. Este helper calcula el id desde los registros ya cargados, así que
// no puede desfasarse aunque la tabla no esté en el mapa.
//   nxKey = clave del contador (ej. 'teq') · dbKey = arreglo en DB (ej. 'tarifasEq')
function nidSeguro(nxKey,dbKey){
  const max=(DB[dbKey]||[]).reduce((m,r)=>Math.max(m,+r.id||0),0);
  const id=max+1;
  if(DB.nx&&DB.nx[nxKey]!==undefined)DB.nx[nxKey]=id+1;   // deja el contador coherente
  return id;
}
function toast(m,e=false){const t=document.getElementById('toast');t.textContent=(e?'✗ ':'✔ ')+m;t.className='show'+(e?' err':'');setTimeout(()=>t.className='',2500);}
function openM(id){document.getElementById(id).classList.add('open');refreshSelects();}
function closeM(id){document.getElementById(id).classList.remove('open');}
function toggleCardBody(id,btn){
  const el=document.getElementById(id);if(!el)return;
  const collapsed=el.style.display==='none';
  el.style.display=collapsed?'':'none';
  if(btn){btn.textContent=collapsed?'▲ Contraer':'▼ Expandir';}
}

function bge(e){
  const m={'Activo':'b-green','Operativo':'b-green','Pagada':'b-green','Conforme':'b-green','Resuelto':'b-green','Completado':'b-green','Levantado':'b-green','Cerrado':'b-green','Entregado':'b-green','Finalizado':'b-green',
    'En Mantenimiento':'b-yellow','De Permiso':'b-yellow','Enviada':'b-yellow','En Proceso':'b-yellow','En Curso':'b-yellow','Investigando':'b-yellow','Activo':'b-green','Reportado':'b-yellow','Programado':'b-blue','En Lavado':'b-yellow',
    'Pendiente':'b-yellow','Disponible':'b-cyan','Derivado':'b-blue','Recibido':'b-blue',
    'Parado':'b-red','Inactivo':'b-red','Observada':'b-red','No Conforme':'b-red','Grave':'b-red','Crítico':'b-red','Retrasado':'b-red','Observado':'b-yellow','Leve':'b-yellow','Moderado':'b-yellow','Vencido':'b-red','Inoperativo':'b-red','Postergado':'b-red','Desmovilizado':'b-purple',
    'Normal':'b-cyan','Urgente':'b-yellow','Muy Urgente':'b-red',
    'Atendido':'b-green','Atendido Parcial':'b-yellow','Anulado':'b-red',
    'Verificado':'b-cyan','Recibido':'b-blue','Pagado':'b-green','Factura':'b-orange','Boleta de Venta':'b-purple','Nota de Débito':'b-yellow','Nota de Crédito':'b-teal',
    'Costo Directo':'b-orange','Costo Indirecto':'b-purple','Reembolsable':'b-teal','Costo de Terceros':'b-blue'};
  return`<span class="badge ${m[e]||'b-blue'}">${e}</span>`;
}

function flt(inp,tid){
  const v=inp.value.toLowerCase();
  const tb=document.getElementById(tid);if(!tb)return;
  Array.from(tb.rows).forEach(r=>r.style.display=r.textContent.toLowerCase().includes(v)?'':'none');
}

// Quita tildes para comparar cargos sin importar si están escritos con o sin acento (ej. "MECANICO" vs "Mecánico")
const _sinTildes=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'');
// Personal para los selectores de atención mecánica (Mecánico / Ayudante Mecánico) + opción Terceros
// sel = valor ya guardado del registro (se conserva como opción aunque ya no califique, para no perderlo al editar)
function _mecOptsHtml(sel){
  sel=sel||'';
  const list=DB.personal.filter(p=>p.est==='Activo'&&_sinTildes(p.cargo).toLowerCase().includes('mecan'));
  let html='<option value="">— Seleccionar —</option>'+
    list.map(p=>{const n=`${p.ape}, ${p.nom}`;return`<option${n===sel?' selected':''}>${n}</option>`;}).join('')+
    `<option value="Terceros"${sel==='Terceros'?' selected':''}>Terceros (externo)</option>`;
  if(sel&&sel!=='Terceros'&&!list.some(p=>`${p.ape}, ${p.nom}`===sel))html+=`<option value="${sel.replace(/"/g,'&quot;')}" selected>${sel}</option>`;
  return html;
}

// Proveedores registrados en el Master de Equipos (tab Contrato/Proveedor) + "Almacén ECO" y "Otros"
// Usado en el "Origen" de insumos/repuestos de Auxilios Mecánicos
function _provOptsHtml(sel){
  sel=sel||'';
  if(sel==='Almacén')sel='Almacén ECO'; // alias del valor antiguo
  const set=new Set();
  (DB.equipos||[]).forEach(e=>{if(e.proveedor)set.add(e.proveedor.trim());});
  const provs=[...set].filter(Boolean).sort();
  let html=`<option${sel==='Almacén ECO'?' selected':''}>Almacén ECO</option>`+
    provs.map(p=>`<option${p===sel?' selected':''}>${p}</option>`).join('')+
    `<option${sel==='Otros'?' selected':''}>Otros</option>`;
  if(sel&&sel!=='Almacén ECO'&&sel!=='Otros'&&!provs.includes(sel))html+=`<option value="${sel.replace(/"/g,'&quot;')}" selected>${sel}</option>`;
  return html;
}

// ══ SELECTS REFRESH ══
function refreshSelects(){
  const trabList=DB.personal.filter(p=>p.est==='Activo').map(p=>`<option>${p.ape}, ${p.nom}</option>`).join('');
  const eqList=DB.equipos.map(e=>`<option value="${e.id}">${e.codigo} – ${e.nombre.split(' ').slice(0,3).join(' ')}${e.placa?' ['+e.placa+']':''}</option>`).join('');
  const eqListOpt='<option value="">— Ninguno —</option>'+eqList;
  const almList=DB.personal.filter(p=>p.est==='Activo'&&p.cargo.toLowerCase().includes('almacen')).map(p=>`<option>${p.ape}, ${p.nom}</option>`).join('')||trabList;
  const persItemList=DB.personal.map(p=>`<option>${p.ape}, ${p.nom}${p.dni?' – '+p.dni:''}</option>`).join('');
  const eqNomList=DB.equipos.map(e=>`<option>${e.codigo} – ${e.nombre}</option>`).join('');
  const allPersEq=persItemList+'<optgroup label="──Equipos──">'+eqNomList+'</optgroup>';
  // stock items for salida
  const stock=getStock();
  const stockOpts=Object.entries(stock).map(([cod,v])=>`<option value="${cod}">${cod} – ${v.nombre} (Stock: ${fmtN(v.stock)} ${v.unidad})</option>`).join('');

  const frenteOpts=DB.frentesTrabajo.map(f=>`<option>${f.nombre}</option>`).join('');
  const areaOpts='<option>Operaciones</option><option>Seguridad</option><option>Mantenimiento</option><option>Administración</option><option>Control de Proyectos</option><option>Almacén y Logística</option><option>Bienestar Social</option><option>Otros</option>';//+DB.frentesTrabajo.map(f=>`<option>${f.nombre}</option>`).join('')
  const reqOpts='<option value="">— Sin Requerimiento —</option>'+DB.requerimientos.map(r=>`<option value="${r.id}">[${r.est}] ${r.num} – ${r.solicitante}</option>`).join('');

  [['soT',trabList],['rT',trabList],['alT',trabList],['hT',trabList],['lvT',trabList],
   ['inTr',trabList],['ptR',trabList],['suS',trabList],['acRe',trabList],
   // cbEq no va aquí: el selector de equipo de Combustible es un buscador con
   // dropdown (_cbEqSearch), no un <select>; se puebla solo desde DB.equipos.
   ['otEq',eqList],['otMec',_mecOptsHtml('')],['cbOp',trabList],
   ['coEq',eqListOpt],['rpEq',eqList],['rpOp',trabList],
   ['aePers',trabList],['emPers',almList],
   ['asItem',stockOpts],
   ['rqArea',areaOpts],
   ['fpReq',reqOpts]
  ].forEach(([id,html])=>{
    const el=document.getElementById(id);if(!el)return;
    const prev=el.value;
    el.innerHTML=html;
    if(prev)el.value=prev;
  });
}

// ══ DEMO CHIPS ══
function buildDemos(){
  const demos=[
    {c:'ECOADMIN00000001',l:'Administrador',s:'Acceso Total'},
    {c:'ECOADM87654321',l:'Carmen Salazar',s:'Administración'},
    {c:'ECOBSW11112222',l:'María Torres',s:'Bienestar Social'},
    {c:'ECOALM33334444',l:'Zein Alcedo',s:'Almacén y Logística'},
    {c:'ECOSEG12345678',l:'Pablo Quispe',s:'Seguridad'},
    {c:'ECOMEC55556666',l:'Roberto Yauri',s:'Mantenimiento'},
    {c:'ECOCTL99887766',l:'Marco Valdivia',s:'Control Proy./Equipos'},
    {c:'ECOOTRO55667788',l:'Ana García',s:'Otros'},
  ];
  const demoEl=document.getElementById('demoChips');if(!demoEl)return;
  demoEl.innerHTML=demos.map(d=>`
    <div class="demo-chip" onclick="autoLogin('${d.c}')">
      <span class="demo-code">${d.c}</span>
      <span class="demo-name">${d.l}</span>
      <span class="demo-area">${d.s}</span>
    </div>`).join('');
}
function autoLogin(c){document.getElementById('loginCodigo').value=c;doLogin();}

// ══ AUTH ══
function doLogin(){
  const raw=document.getElementById('loginCodigo').value.trim().toUpperCase();
  const err=document.getElementById('loginErr');
  err.style.display='none';
  const u=USERS.find(u=>raw===(u.codigo+u.dni).toUpperCase());
  if(!u){err.style.display='block';return;}
  CU=u;launchApp();
}
function doLogout(){
  CU=null;
  document.getElementById('appShell').style.display='none';
  document.getElementById('loginScreen').style.display='flex';
  document.getElementById('loginCodigo').value='';
}


// ══ LAUNCH ══
function launchApp(){
  document.getElementById('loginScreen').style.display='none';
  const app=document.getElementById('appShell');
  app.style.display='flex';
  const a1=AREAS[CU.areas[0]];
  const multi=CU.areas.length>1;
  const lbl=document.getElementById('hArea');
  lbl.textContent=multi?'Acceso General':a1.label.toUpperCase();
  const c=multi?'#f59e0b':a1.color;
  lbl.style.cssText=`color:${c};border-color:${c}40;background:${c}15;`;
  document.getElementById('hDot').style.background=multi?'#f59e0b':a1.color;
  document.getElementById('hHex').style.background=multi?'#f59e0b':a1.color;
  document.getElementById('hName').textContent=CU.nombre;
  document.getElementById('hRole').textContent=CU.cargo;
  buildSidebar();
  startClock();
  setPage('dashboard');
  loadSheetsData();
}

// ══ SIDEBAR ══
function buildSidebar(){
const nav = document.getElementById('sideNav');
  let h = `<div class="nav-dash active" id="nd-dashboard" onclick="setPage('dashboard')">
    <span style="font-size:.9rem">📊</span> Panel General
  </div>`;

  // CU.modules (opcional): lista blanca global de módulos visibles
  // CU.excludeModules (opcional): lista negra global de módulos ocultos
  // CU.areaModules (opcional): {areaKey:[modKey,...]} lista blanca por área específica
  const allowedMods = CU.modules || null;
  const excludedMods = CU.excludeModules ? new Set(CU.excludeModules) : null;

  CU.areas.forEach(ak => {
    const a = AREAS[ak];
    let modsHtml = '';
    // lista blanca específica de esta área (tiene prioridad sobre allowedMods global)
    const areaMods = CU.areaModules && CU.areaModules[ak] ? CU.areaModules[ak] : null;
    const effectiveMods = areaMods || allowedMods;

    a.modules.forEach(m => {
      if(m.isSubgroup){
        const visibleChildren = m.children.filter(c =>
          (!effectiveMods || effectiveMods.includes(c.key)) &&
          (!excludedMods || !excludedMods.has(c.key))
        );
        if(visibleChildren.length === 0) return;
        const children = visibleChildren.map(c =>
          `<div class="nav-submod" id="nm-${c.key}" style="--nc:${a.color}" onclick="setPage('${c.key}')">
            <span style="font-size:.78rem">${c.icon}</span>${c.label}
          </div>`
        ).join('');
        modsHtml += `
          <div class="nav-subgroup-wrap" id="nsg-${m.key}">
            <div class="nav-subgroup-head" onclick="toggleSubgroup('${m.key}')">
              <span style="font-size:.82rem">${m.icon}</span>
              <span>${m.label}</span>
              <span class="nav-subgroup-head-chev">▶</span>
            </div>
            <div class="nav-submods">${children}</div>
          </div>`;
      } else {
        if(effectiveMods && !effectiveMods.includes(m.key)) return;
        if(excludedMods && excludedMods.has(m.key)) return;
        modsHtml += `
          <div class="nav-mod" id="nm-${m.key}" style="--nc:${a.color}" onclick="setPage('${m.key}')">
            <span class="nav-mod-icon">${m.icon}</span>${m.label}
          </div>`;
      }
    });

    h += `
      <div class="nav-area-wrap open" id="na-${ak}">
        <div class="nav-ah" onclick="toggleArea('${ak}')" style="color:${a.color}">
          <span class="nav-ah-icon">${a.icon}</span>
          <span class="nav-ah-name">${a.label}</span>
          <span class="nav-ah-chev">▶</span>
        </div>
        <div class="nav-mods">${modsHtml}</div>
      </div>`;
  });

  nav.innerHTML = h;
}
function toggleArea(k){document.getElementById('na-'+k)?.classList.toggle('open');}
function toggleSubgroup(k){
  document.getElementById('nsg-'+k)?.classList.toggle('open');
}

// ══ PAGE NAV ══
function setPage(k){
  AP=k;
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-'+k)?.classList.add('active');
  document.querySelectorAll('.nav-dash,.nav-mod').forEach(el=>el.classList.remove('active'));
  (document.getElementById('nd-'+k)||document.getElementById('nm-'+k))?.classList.add('active');
  renderPage(k);
}
function renderPage(k){
  const m={dashboard:rDash,dashEquipos:rDashEquipos,personal:rPersonal,asistencia:rAsistencia,planilla:_plRenderTabs,renta5ta:rRenta5ta,asistentaSocial:rSocial,viaticos:rViaticos,residencia:rResidencia,alimentacion:rAli,hospedaje:rHosp,lavanderia:rLav,almacen:rAlm,combustible:rComb,proyectos:rProyectos,requerimientos:rReq,materiales:rMateriales,facturasPago:rFPago,analisisAbc:rAnalisisAbc,kardexEpp:rKardexEpp,insumosAux:rInsumosAux,informePeriodo:rInformePeriodo,supervision:rSuper,seguridad:rSeg,cursosSeguridad:rCursosSeguridad,medioAmbiente:rAmb,masterEquipos:rMaster,programacionEquipos:rProg,auxiliosMecanicos:rAuxMec,engraseEquipos:rEngrase,salidaEquipos:rSalidaEquipos,tareaje:rTareaje,resumenTareaje:rTareResumenPg,roster:()=>_rosterTab(_rosterTabAct),planner:rPlanner,flotaEquipos:rFlotaEquipos,lineaAmarilla:()=>rLinea('Línea Amarilla'),lineaBlanca:()=>rLinea('Línea Blanca'),vehiculosMenores:()=>rLinea('Vehículo Menor'),equiposMenores:()=>rLinea('Equipos Menores'),panelHoras:rPanelHoras,reporteMensual:rReporteMensual,reporteEquipos:rReporteEquipos,proveedores:()=>_edpTab(_edpTabAct),resultadoOperativo:rResultadoOperativo,hhVenta:rHhVenta,corteEquipos:rCorteEquipos,costoM3:rCostoM3,dailyReport:rDailyReport,frentesTrabajo:rFrentes,tipoMaterial:rTipoMaterial,tramos:rTramos,facturacion:rFact,costos:rCostos,lps:rLps,pizarra:rPizarra,avanceMT:rAvanceMT,recrecimiento:rRecrecimiento,histograma:rHistograma,seguimiento:rSeguimiento,notificaciones:rNotificaciones,costControl:rCostControl,venta:rVenta,tarifas:rTarifas,valorizaciones:rValorizaciones,hes:rHes};
  if(m[k])m[k]();
}

// ══ CLOCK ══
function startClock(){
  const u=()=>document.getElementById('hDate').textContent=new Date().toLocaleDateString('es-PE',{weekday:'short',day:'2-digit',month:'short',year:'numeric'}).toUpperCase()+' · '+new Date().toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'});
  u();setInterval(u,30000);
}

