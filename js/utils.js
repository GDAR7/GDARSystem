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
// El email se deriva de la credencial, asi que la persona sigue escribiendo una
// sola cosa en un solo campo. Los codigos traen puntos y guiones bajos
// (CP.BISA_, J_A_TA) que no valen en un email: se normalizan igual que en
// herramientas/migrarAuth.js, o el email no coincidiria con el creado alli.
// Modo de acceso. Si empresa.js no lo define, se comporta como siempre.
function _authModo(){
  return (typeof AUTH_MODO!=='undefined'&&AUTH_MODO)?AUTH_MODO:'local';
}
function _authEmail(cred){
  return cred.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')+'@gdarei.com';
}
async function doLogin(){
  const cod=document.getElementById('loginCodigo').value.trim().toUpperCase();
  const campoClave=document.getElementById('loginClave');
  const err=document.getElementById('loginErr');
  const btn=document.querySelector('#loginScreen .login-btn');
  err.style.display='none';
  if(!cod)return;
  const modo=_authModo();

  if(modo==='supabase'||modo==='mixto'){
    // La clave va aparte del codigo: por eso se puede cambiar sin que el
    // email deje de coincidir. El email sale solo del codigo, que no cambia.
    const clave=campoClave?campoClave.value:'';
    // En mixto, sin clave puede tratarse de alguien que aun usa su credencial
    // vieja de un solo campo: se salta al esquema local en vez de exigirle una
    // clave que todavia no tiene.
    if(!clave){
      if(modo==='supabase'){
        err.textContent='Escriba su clave.';err.style.display='block';return;
      }
    }else{
      if(btn){btn.disabled=true;btn.style.opacity=.6;}
      let entro=false, cortar=false;
      try{
        const{data,error}=await supa.auth.signInWithPassword({
          email:_authEmail(cod),password:clave});
        if(error||!data||!data.user){
          if(modo==='supabase'){
            err.textContent='Codigo o clave incorrectos.';
            err.style.display='block';cortar=true;
          }
        }else{
          const m=data.user.user_metadata||{};
          if(!m.areas||!m.areas.length){
            console.error('Entro pero no trae permisos en user_metadata');
            err.textContent='Su usuario no tiene permisos asignados. Avise al administrador.';
            err.style.display='block';cortar=true;
            try{await supa.auth.signOut();}catch(e){}
          }else{
            CU=m;entro=true;
          }
        }
      }catch(ex){
        console.error('Fallo al iniciar sesion:',ex);
        if(modo==='supabase'){
          err.textContent='No se pudo conectar. Intente de nuevo.';
          err.style.display='block';cortar=true;
        }
      }finally{
        if(btn){btn.disabled=false;btn.style.opacity=1;}
    }
    if(entro){if(campoClave)campoClave.value='';launchApp();return;}
    if(cortar)return;
    }
    // modo mixto y Auth no la reconocio: sigue abajo
  }

  // Esquema anterior: codigo+DNI juntos en el primer campo
  const u=USERS.find(u=>cod===(u.codigo+u.dni).toUpperCase());
  if(!u){err.textContent='Codigo incorrecto. Verifique sus credenciales.';
    err.style.display='block';return;}
  CU=u;launchApp();
}

// ══ CLAVE PROPIA ══
// Solo tiene sentido con Supabase Auth: en el esquema local la credencial
// vive en el archivo y cambiarla desde aqui no serviria de nada.
// Prepara la pagina de Mi Seguridad. La llama renderPage al entrar.
function rMiSeguridad(){
  ['segActual','segNueva','segRepe'].forEach(id=>{
    const e=document.getElementById(id);if(e)e.value='';});
  ['segErr','segOk'].forEach(id=>{
    const e=document.getElementById(id);if(e)e.style.display='none';});
  const info=document.getElementById('segInfo');
  if(info&&CU)info.innerHTML='<strong>'+(CU.nombre||'')+'</strong>'
    +'<div style="color:var(--muted2);font-size:.74rem;margin-top:.2rem">'
    +(CU.cargo||'')+' · codigo de usuario <strong>'+(CU.codigo||'')+'</strong></div>';
}
async function guardarClave(){
  const act=document.getElementById('segActual').value;
  const n  =document.getElementById('segNueva').value;
  const r  =document.getElementById('segRepe').value;
  const err=document.getElementById('segErr');
  const ok =document.getElementById('segOk');
  const btn=document.getElementById('segBtn');
  const avisar=t=>{err.textContent=t;err.style.display='block';};
  err.style.display='none';ok.style.display='none';
  if(!act)      return avisar('Escriba su clave actual.');
  if(n.length<8)return avisar('La clave nueva debe tener al menos 8 caracteres.');
  if(n!==r)     return avisar('Las dos claves nuevas no coinciden.');
  if(n===act)   return avisar('La clave nueva debe ser distinta de la actual.');
  if(btn){btn.disabled=true;btn.style.opacity=.6;}
  try{
    // Se comprueba la clave actual antes de cambiarla: si no, cualquiera que
    // encuentre una sesion abierta podria dejar al dueno fuera de su cuenta.
    const{error:eAct}=await supa.auth.signInWithPassword({
      email:_authEmail(CU&&CU.codigo||''),password:act});
    if(eAct)return avisar('La clave actual no es correcta.');
    const{error}=await supa.auth.updateUser({password:n});
    if(error)return avisar('No se pudo cambiar: '+error.message);
    ['segActual','segNueva','segRepe'].forEach(id=>{document.getElementById(id).value='';});
    ok.textContent='✓ Clave cambiada. Usela la proxima vez que entre.';
    ok.style.display='block';
    toast('✓ Clave cambiada');
  }catch(ex){
    console.error('Fallo al cambiar la clave:',ex);
    avisar('No se pudo conectar. Intente de nuevo.');
  }finally{
    if(btn){btn.disabled=false;btn.style.opacity=1;}
  }
}
function doLogout(){
  // Cierra tambien la sesion de Supabase: si no, el token seguiria vivo en el
  // navegador y con el, el acceso a los datos.
  if(typeof AUTH_MODO!=='undefined'&&AUTH_MODO==='supabase'&&typeof supa!=='undefined')
    try{supa.auth.signOut();}catch(e){}
  CU=null;
  document.getElementById('appShell').style.display='none';
  document.getElementById('loginScreen').style.display='flex';
  document.getElementById('loginCodigo').value='';
  const _lc=document.getElementById('loginClave');if(_lc)_lc.value='';
}


// ══ LAUNCH ══
function launchApp(){
  // El boton de clave solo aplica con Supabase Auth
  const _bc=document.getElementById('btnClave');
  if(_bc)_bc.style.display=_authModo()==='local'?'none':'';
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


  // Fuera de las areas, siempre visible: cambiar la propia clave no depende
  // de los permisos de nadie. Solo aplica con Supabase Auth.
  if(_authModo()!=='local'){
    h += `
      <div style="border-top:1px solid var(--border);margin:.5rem .6rem"></div>
      <div class="nav-mod" id="nm-miSeguridad" style="--nc:#6366f1" onclick="setPage('miSeguridad')">
        <span class="nav-mod-icon">🔑</span>Mi Seguridad
      </div>`;
  }
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
  const m={dashboard:rDash,dashEquipos:rDashEquipos,personal:rPersonal,asistencia:rAsistencia,planilla:_plRenderTabs,renta5ta:rRenta5ta,afpTasas:rAfpTasas,asistentaSocial:rSocial,viaticos:rViaticos,residencia:rResidencia,alimentacion:rAli,hospedaje:rHosp,lavanderia:rLav,almacen:rAlm,combustible:rComb,proyectos:rProyectos,requerimientos:rReq,materiales:rMateriales,facturasPago:rFPago,analisisAbc:rAnalisisAbc,kardexEpp:rKardexEpp,insumosAux:rInsumosAux,informePeriodo:rInformePeriodo,supervision:rSuper,liberacion:rLiberacion,seguridad:rSeg,cursosSeguridad:rCursosSeguridad,medioAmbiente:rAmb,masterEquipos:rMaster,programacionEquipos:rProg,auxiliosMecanicos:rAuxMec,engraseEquipos:rEngrase,salidaEquipos:rSalidaEquipos,tareaje:rTareaje,resumenTareaje:rTareResumenPg,roster:()=>_rosterTab(_rosterTabAct),planner:rPlanner,flotaEquipos:rFlotaEquipos,lineaAmarilla:()=>rLinea('Línea Amarilla'),lineaBlanca:()=>rLinea('Línea Blanca'),vehiculosMenores:()=>rLinea('Vehículo Menor'),equiposMenores:()=>rLinea('Equipos Menores'),panelHoras:rPanelHoras,reporteMensual:rReporteMensual,reporteEquipos:rReporteEquipos,proveedores:()=>_edpTab(_edpTabAct),resultadoOperativo:rResultadoOperativo,hhVenta:rHhVenta,corteEquipos:rCorteEquipos,costoM3:rCostoM3,dailyReport:rDailyReport,frentesTrabajo:rFrentes,tipoMaterial:rTipoMaterial,tramos:rTramos,facturacion:rFact,costos:rCostos,lps:rLps,pizarra:rPizarra,avanceMT:rAvanceMT,recrecimiento:rRecrecimiento,histograma:rHistograma,seguimiento:rSeguimiento,notificaciones:rNotificaciones,miSeguridad:rMiSeguridad,costControl:rCostControl,venta:rVenta,tarifas:rTarifas,valorizaciones:rValorizaciones,hes:rHes};
  if(m[k])m[k]();
}

// ══ CLOCK ══
function startClock(){
  const u=()=>document.getElementById('hDate').textContent=new Date().toLocaleDateString('es-PE',{weekday:'short',day:'2-digit',month:'short',year:'numeric'}).toUpperCase()+' · '+new Date().toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'});
  u();setInterval(u,30000);
}

