// ══ DASHBOARD ══
function rDash(){
  document.getElementById('dashSub').textContent=`Bienvenido, ${CU.nombre} · ${CU.cargo}`;
  const areas=CU.areas;
  const tF=DB.facturas.reduce((a,f)=>a+f.monto,0);
  const tC=DB.costos.reduce((a,c)=>a+c.monto,0);
  const kpis=[
    {l:'Personal Activo',v:DB.personal.filter(p=>p.est==='Activo').length,s:'Trabajadores',c:'#3b82f6',a:['administracion']},
    {l:'Equipos Operativos',v:`${DB.equipos.filter(e=>e.est==='Operativo').length}/${DB.equipos.length}`,s:'Flota activa',c:'#10b981',a:['controlEquipos','mantenimiento']},
    {l:'Facturado Total',v:fmt(tF),s:'Todas las facturas',c:'#a78bfa',a:['otros']},
    {l:'Costos del Mes',v:fmt(tC),s:'Egresos',c:'#ef4444',a:['otros']},
    {l:'Incidentes Abiertos',v:DB.incidentes.filter(i=>i.est!=='Cerrado').length,s:'Sin cerrar',c:'#ef4444',a:['seguridad']},
    {l:'Stock Items',v:Object.keys(getStock()).length,s:'Tipos en almacén',c:'#f97316',a:['almacenLogistica']},
    {l:'Mantenimientos OT',v:DB.mantenimientos.filter(m=>m.est!=='Completado').length,s:'Pendientes/en proceso',c:'#8b5cf6',a:['mantenimiento']},
    {l:'Actividades en Curso',v:DB.planner.filter(p=>p.est==='En Curso').length,s:'Del proyecto',c:'#10b981',a:['controlProyecto']},
  ].filter(k=>k.a.some(a=>areas.includes(a))||areas.length>3);
  document.getElementById('dashKpis').innerHTML=kpis.map(k=>`<div class="kpi" style="--kc:${k.c}"><div class="kpi-lbl">${k.l}</div><div class="kpi-val">${k.v}</div><div class="kpi-sub">${k.s}</div></div>`).join('');

  let cards='';
  if(areas.includes('controlEquipos')||areas.includes('mantenimiento')||areas.length>3){
    cards+=`<div class="card"><div class="card-head"><span class="card-title">🚜 Estado de Flota</span></div><div class="card-body">
      ${DB.equipos.map(e=>`<div class="stat-row" style="margin-bottom:.4rem;padding:.4rem .6rem;background:var(--panel2);border-radius:5px;"><span class="mono" style="color:var(--muted2);font-size:.72rem">${e.codigo}</span><strong style="margin-left:.4rem;font-size:.78rem">${e.nombre.split(' ').slice(0,3).join(' ')}</strong><span style="margin-left:auto">${bge(e.est)}</span></div>`).join('')}
    </div></div>`;
  }
  if(areas.includes('seguridad')||areas.length>3){
    cards+=`<div class="card"><div class="card-head"><span class="card-title">⛑️ Últimos Eventos Seg.</span></div><div class="card-body">
      ${DB.incidentes.slice(-3).reverse().map(i=>`<div class="stat-row" style="margin-bottom:.5rem;padding:.4rem .6rem;background:var(--panel2);border-radius:5px;"><strong style="font-size:.78rem">${i.tipo}</strong> · <span style="font-size:.74rem">${i.area}</span><span style="margin-left:auto">${bge(i.sev)}</span></div>`).join('')}
    </div></div>`;
  }
  if(areas.includes('controlProyecto')||areas.length>3){
    cards+=`<div class="card"><div class="card-head"><span class="card-title">📈 Avance Actividades</span></div><div class="card-body">
      ${DB.planner.map(a=>`<div style="margin-bottom:.7rem"><div class="stat-row" style="margin-bottom:.3rem"><strong style="font-size:.78rem">${a.nom}</strong><span style="margin-left:auto;font-family:'Roboto Mono',monospace;font-size:.72rem;color:var(--ctl)">${a.av}%</span></div><div class="prog-wrap"><div class="prog-bar" style="width:${a.av}%;background:${a.av>=80?'var(--ctl)':a.av>=40?'var(--ope)':'var(--seg)'}"></div></div></div>`).join('')}
    </div></div>`;
  }
  if(areas.includes('almacenLogistica')||areas.length>3){
    const totComb=DB.combustible.reduce((a,c)=>a+c.gal*c.precio,0);
    cards+=`<div class="card"><div class="card-head"><span class="card-title">⛽ Combustible del Mes</span></div><div class="card-body">
      <div class="stat-row" style="margin-bottom:.5rem"><span>Total Galones</span><strong style="margin-left:auto">${DB.combustible.reduce((a,c)=>a+c.gal,0)} gal</strong></div>
      <div class="stat-row"><span>Costo Total</span><strong style="margin-left:auto;color:var(--alm)">${fmt(totComb)}</strong></div>
    </div></div>`;
  }
  document.getElementById('dashCards').innerHTML=cards;
}

// ══ PERSONAL ══
let _perFiltered=[];

function rPersonal(){
  // Poblar selector de proyectos
  const selProy=document.getElementById('perFProy');
  if(selProy&&selProy.options.length<=1){
    const proyCodes=[...new Set(DB.personal.map(p=>p.proy).filter(Boolean))].sort();
    proyCodes.forEach(cod=>{
      const pr=DB.proyectos.find(x=>x.codigo===cod);
      const opt=document.createElement('option');
      opt.value=cod;opt.textContent=pr?`[${cod}] ${pr.nombre}`:cod;
      selProy.appendChild(opt);
    });
  }
  _perFiltrar();
}

let _perShowQr=localStorage.getItem('_perShowQr')==='1';
function _perToggleQr(){
  _perShowQr=!_perShowQr;
  localStorage.setItem('_perShowQr',_perShowQr?'1':'0');
  _perFiltrar();
}
function _perGetFiltros(){
  return{
    proy:(document.getElementById('perFProy')||{}).value||'',
    est:(document.getElementById('perFEst')||{}).value||'',
    desde:(document.getElementById('perFDesde')||{}).value||'',
    hasta:(document.getElementById('perFHasta')||{}).value||'',
    qr:(document.getElementById('perFQr')||{}).value||'',
    busq:((document.getElementById('perBuscador')||{}).value||'').toLowerCase().trim()
  };
}

function _perFiltrar(){
  const f=_perGetFiltros();
  _perFiltered=DB.personal.filter(p=>{
    if(f.proy&&p.proy!==f.proy)return false;
    if(f.est&&p.est!==f.est)return false;
    if(f.desde&&(p.ing||'')<f.desde)return false;
    if(f.hasta&&(p.ing||'')>f.hasta)return false;
    if(f.qr==='con'&&!(p.codigoQr||'').trim())return false;
    if(f.qr==='sin'&&(p.codigoQr||'').trim())return false;
    if(f.busq){
      const txt=`${p.dni} ${p.ape} ${p.nom} ${p.cargo} ${p.proc||''} ${p.proy||''} ${p.codigoQr||''}`.toLowerCase();
      if(!txt.includes(f.busq))return false;
    }
    return true;
  });
  // Mostrar/ocultar columna y estado del botón 🪪
  const thQr=document.getElementById('thPerQr');if(thQr)thQr.style.display=_perShowQr?'':'none';
  const btnQr=document.getElementById('perBtnQr');if(btnQr){btnQr.style.opacity=_perShowQr?'1':'.5';btnQr.style.textDecoration=_perShowQr?'none':'line-through';}
  const contador=document.getElementById('perContador');
  if(contador)contador.textContent=`${_perFiltered.length} de ${DB.personal.length}`;
  document.getElementById('tbPersonal').innerHTML=_perFiltered.map(p=>{
    const proy=p.proy?DB.proyectos.find(x=>x.codigo===p.proy):null;
    return`<tr>
    <td class="mono">${p.dni}</td><td><strong>${p.ape}, ${p.nom}</strong></td><td>${p.cargo}</td>
    <td><span class="badge b-blue">${p.cat}</span></td>
    <td>${proy?`<span class="mono" style="font-size:.73rem;color:#a78bfa">${proy.codigo}</span>`:'<span style="color:var(--muted)">—</span>'}</td>
    <td>${p.proc||'<span style="color:var(--muted)">—</span>'}</td>
    <td>${p.tipo?`<span class="badge" style="background:${p.tipo==='Staff'?'rgba(99,102,241,.2)':'rgba(16,185,129,.2)'};color:${p.tipo==='Staff'?'#818cf8':'#34d399'};border:1px solid ${p.tipo==='Staff'?'#818cf860':'#34d39960'}">${p.tipo}</span>`:'<span style="color:var(--muted)">—</span>'}</td>
    <td>${p.guardia?`<span class="badge" style="background:rgba(245,158,11,.15);color:#f59e0b;border:1px solid #f59e0b60">Grd. ${p.guardia}</span>`:'<span style="color:var(--muted)">—</span>'}</td>
    <td class="mono">${p.ing}</td>
    <td>${bge(p.est)}</td>
    ${_perShowQr?`<td class="mono" style="font-size:.72rem;color:${(p.codigoQr||'').trim()?'#22d3ee':'#ef4444'}">${(p.codigoQr||'').trim()||'⚠ SIN CÓDIGO'}</td>`:''}
    <td style="max-width:160px;font-size:.75rem;color:var(--muted2)">${p.notas||'<span style="color:var(--muted)">—</span>'}</td>
    <td style="display:flex;gap:.3rem"><button class="btn btn-sm" style="background:rgba(245,158,11,.15);border:1px solid #f59e0b60;color:#f59e0b" onclick="openPersonalEdit(${p.id})">✏️</button></td>
  </tr>`;}).join('');
}

function _perLimpiarFiltros(){
  ['perFProy','perFEst','perFDesde','perFHasta','perFQr'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  const b=document.getElementById('perBuscador');if(b)b.value='';
  _perFiltrar();
}

// ── PDF del personal filtrado (incluye Cód. Fotocheck/QR, resalta los vacíos) ──
function printPersonalQR(){
  const datos=_perFiltered.length?_perFiltered:DB.personal;
  if(!datos.length){toast('Sin datos para imprimir',true);return;}
  const f=_perGetFiltros();
  const sinCod=datos.filter(p=>!(p.codigoQr||'').trim()).length;
  const filtros=[
    f.proy?'Proyecto: '+f.proy:'',
    f.est?'Estado: '+f.est:'',
    f.qr==='sin'?'Solo SIN código':f.qr==='con'?'Solo CON código':'',
    f.busq?'Búsqueda: "'+f.busq+'"':''
  ].filter(Boolean).join(' · ')||'Sin filtros (todo el personal)';
  const _logoUrl=window.location.href.replace(/[^\/\\]+$/,'')+'09.-ERP/Imagenes/ECOSERMO-LOGO.png';
  const rows=datos.map((p,i)=>{
    const cod=(p.codigoQr||'').trim();
    return`<tr${cod?'':' style="background:#fef2f2"'}>
      <td style="text-align:center">${i+1}</td>
      <td style="font-family:monospace">${p.dni||''}</td>
      <td style="font-weight:700">${p.ape}, ${p.nom}</td>
      <td>${p.cargo||''}</td>
      <td style="text-align:center">${p.guardia||'—'}</td>
      <td style="text-align:center">${p.est||''}</td>
      <td style="font-family:monospace;${cod?'color:#0e7490':'color:#b91c1c;font-weight:800'}">${cod||'⚠ SIN CÓDIGO'}</td>
    </tr>`;
  }).join('');
  const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Personal — Cód. Fotocheck/QR</title>
  <style>@page{size:A4;margin:1cm}body{font-family:Arial,sans-serif;font-size:10px;color:#111;margin:0}
  *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
  table{width:100%;border-collapse:collapse}th{background:#1e3a5f;color:#fff;padding:4px 6px;font-size:9px;text-transform:uppercase}
  td{border:1px solid #cbd5e1;padding:3px 6px;font-size:9.5px}
  </style></head><body>
  <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #1e3a5f;padding-bottom:6px;margin-bottom:8px">
    <img src="${_logoUrl}" style="height:40px;object-fit:contain">
    <div style="text-align:center"><div style="font-size:14px;font-weight:900;color:#1e3a5f">PERSONAL — CÓDIGO DE FOTOCHECK / QR</div><div style="font-size:9px;color:#64748b">${filtros}</div></div>
    <div style="text-align:right;font-size:9px;color:#64748b">${new Date().toLocaleDateString('es-PE')}<br><b>${datos.length}</b> persona(s) · <b style="color:#b91c1c">${sinCod}</b> sin código</div>
  </div>
  <table><thead><tr><th style="width:26px">N°</th><th style="width:70px">DNI</th><th style="text-align:left">Apellidos y Nombres</th><th style="text-align:left">Cargo</th><th style="width:48px">Guardia</th><th style="width:52px">Estado</th><th style="width:150px">Cód. Fotocheck/QR</th></tr></thead>
  <tbody>${rows}</tbody></table>
  </body></html>`;
  const win=window.open('','_blank');if(!win){toast('Active ventanas emergentes',true);return;}
  win.document.write(html);win.document.close();win.focus();setTimeout(()=>win.print(),400);
}

function exportPersonalXLSX(){
  const datos=_perFiltered.length?_perFiltered:DB.personal;
  if(!datos.length){toast('Sin datos para exportar',true);return;}
  const f=_perGetFiltros();

  const BOR={top:{style:'thin',color:{rgb:'94a3b8'}},bottom:{style:'thin',color:{rgb:'94a3b8'}},left:{style:'thin',color:{rgb:'94a3b8'}},right:{style:'thin',color:{rgb:'94a3b8'}}};
  const HDR='1E3A5F',HDRT='FFFFFF',SBGR='EFF6FF';

  const S=(v,bold,bg,color,align)=>({v:v??'',t:'s',s:{
    font:{bold:!!bold,color:{rgb:color||'1e293b'},sz:9},
    fill:bg?{fgColor:{rgb:bg}}:{},
    alignment:{horizontal:align||'left',vertical:'center',wrapText:true},
    border:BOR
  }});

  const wsData=[];
  // Título
  const nCols=12;
  wsData.push([S('LISTADO DE PERSONAL / RR.HH.',true,HDR,HDRT,'center'),...Array(nCols-1).fill(S('',false,HDR,HDRT))]);
  const filtDesc=[
    f.proy?`Proyecto: ${f.proy}`:'',
    f.est?`Estado: ${f.est}`:'',
    f.desde?`Desde: ${f.desde}`:'',
    f.hasta?`Hasta: ${f.hasta}`:'',
    f.busq?`Búsqueda: "${f.busq}"`:'',
  ].filter(Boolean).join('  |  ')||'Sin filtros activos';
  wsData.push([S(filtDesc,false,'EEF2FF','475569'),...Array(nCols-1).fill(S('',false,'EEF2FF'))]);
  wsData.push([S(`Total: ${datos.length} trabajadores`,true,'DBEAFE','1e3a8a'),...Array(nCols-1).fill(S('',false,'DBEAFE'))]);
  wsData.push(Array(nCols).fill(S('')));

  // Cabeceras
  const cols=['DNI','APELLIDOS','NOMBRES','CARGO','CATEGORÍA','PROYECTO','PROCEDENCIA','TIPO','GUARDIA','F. INGRESO','ESTADO','NOTAS'];
  wsData.push(cols.map(c=>({v:c,t:'s',s:{font:{bold:true,color:{rgb:HDRT},sz:9},fill:{fgColor:{rgb:HDR}},alignment:{horizontal:'center',vertical:'center'},border:BOR}})));

  // Filas
  datos.forEach((p,i)=>{
    const pr=p.proy?DB.proyectos.find(x=>x.codigo===p.proy):null;
    const bg=i%2===0?'F8FAFC':'FFFFFF';
    wsData.push([
      S(p.dni||'',false,bg,'334155','center'),
      S(p.ape||'',true,bg,'0f172a'),
      S(p.nom||'',false,bg,'0f172a'),
      S(p.cargo||'',false,bg,'334155'),
      S(p.cat||'',false,bg,'1d4ed8','center'),
      S(pr?pr.codigo:p.proy||'',false,bg,'7c3aed','center'),
      S(p.proc||'',false,bg,'334155'),
      S(p.tipo||'',false,bg,'047857','center'),
      S(p.guardia?`Grd. ${p.guardia}`:'',false,bg,'b45309','center'),
      S(p.ing||'',false,bg,'334155','center'),
      S(p.est||'',p.est==='Activo',bg,p.est==='Activo'?'166534':'991b1b','center'),
      S(p.notas||'',false,bg,'475569'),
    ]);
  });

  const ws=XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols']=[8,18,14,22,12,12,12,10,9,11,10,22].map(w=>({wch:w}));
  ws['!merges']=[[0,1,nCols-1],[1,1,nCols-1],[2,1,nCols-1]].map(([r,c,e])=>({s:{r,c:0},e:{r,c:e}}));
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Personal');
  const fecha=today().replace(/-/g,'');
  XLSX.writeFile(wb,`Personal_RRHH_${fecha}.xlsx`);
  toast('✓ Excel exportado correctamente');
}
function _poblarProyPersonal(sel){
  sel.innerHTML='<option value="">— Sin proyecto —</option>'+DB.proyectos.map(p=>`<option value="${p.codigo}">[${p.codigo}] ${p.nombre}</option>`).join('');
}
function perGoTab(n){
  [0,1].forEach(i=>{
    const p=document.getElementById('perP'+i),t=document.getElementById('perTab'+i);
    if(p)p.style.display=i===n?'grid':'none';
    if(t)t.classList.toggle('eq-tab-act',i===n);
  });
  const prev=document.getElementById('perBPrev'),next=document.getElementById('perBNext'),save=document.getElementById('perBSave');
  if(prev)prev.style.display=n>0?'':'none';
  if(next)next.style.display=n<1?'':'none';
  if(save)save.style.display=n===1?'':'none';
}
function _fillCargoList(){
  const dl=document.getElementById('wCargoList');if(!dl)return;
  const cargos=[...new Set(DB.personal.map(p=>p.cargo||'').filter(Boolean))].sort();
  dl.innerHTML=cargos.map(c=>`<option value="${c}">`).join('');
}
function openPersonalNew(){
  _editPersonalId=null;
  _fillCargoList();
  ['wDni','wApe','wNom','wCargo','wSue','wProc','wNotas','wCuspp','wCuenta'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('wCat').value='Operador A';
  document.getElementById('wTipo').value='';
  document.getElementById('wGuardia').value='';
  document.getElementById('wAsig').value='0';
  document.getElementById('wEst').value='Activo';
  document.getElementById('wIng').value=today();
  document.getElementById('wAfp').value='';
  document.getElementById('wBanco').value='';
  document.getElementById('wMovilidad').value='0';
  const ps=document.getElementById('wProy');if(ps){_poblarProyPersonal(ps);ps.value='';}
  document.querySelector('#mPersonal .mttl').textContent='Agregar Trabajador';
  perGoTab(0);
  openM('mPersonal');
}
function openPersonalEdit(id){
  const p=DB.personal.find(x=>x.id===id);if(!p)return;
  _editPersonalId=id;
  _fillCargoList();
  document.getElementById('wDni').value=p.dni||'';
  document.getElementById('wCodigoQr').value=p.codigoQr||'';
  document.getElementById('wApe').value=p.ape||'';
  document.getElementById('wNom').value=p.nom||'';
  document.getElementById('wCargo').value=p.cargo||'';
  document.getElementById('wCat').value=p.cat||'Operador A';
  document.getElementById('wProc').value=p.proc||'';
  document.getElementById('wTipo').value=p.tipo||'';
  document.getElementById('wGuardia').value=p.guardia||'';
  document.getElementById('wIng').value=p.ing||'';
  document.getElementById('wSue').value=p.sue||'';
  document.getElementById('wAsig').value=p.asig!=null?String(p.asig):'0';
  document.getElementById('wEst').value=p.est||'Activo';
  document.getElementById('wNotas').value=p.notas||'';
  document.getElementById('wAfp').value=p.afp||'';
  document.getElementById('wCuspp').value=p.cuspp||'';
  document.getElementById('wBanco').value=p.banco||'';
  document.getElementById('wCuenta').value=p.cuenta||'';
  document.getElementById('wMovilidad').value=p.movilidad||0;
  const ps=document.getElementById('wProy');if(ps){_poblarProyPersonal(ps);ps.value=p.proy||'';}
  document.querySelector('#mPersonal .mttl').textContent='Editar Trabajador';
  perGoTab(0);
  openM('mPersonal');
}
// Si el formulario se abrió desde la grilla de Tareaje, refrescarla al guardar
function _refrescarTareajeSiActivo(){
  if(document.getElementById('page-tareaje')?.classList.contains('active')&&typeof rTareaje==='function')rTareaje();
}
function gPersonal(){
  const dni=document.getElementById('wDni').value.trim(),nom=document.getElementById('wNom').value.trim();
  if(!dni||!nom){toast('Ingrese DNI y nombre',true);return;}
  const rec={dni,ape:document.getElementById('wApe').value,nom,cargo:document.getElementById('wCargo').value,cat:document.getElementById('wCat').value,proy:document.getElementById('wProy').value,proc:document.getElementById('wProc').value,tipo:document.getElementById('wTipo').value,guardia:document.getElementById('wGuardia').value,ing:document.getElementById('wIng').value,sue:+document.getElementById('wSue').value||0,asig:+document.getElementById('wAsig').value,est:document.getElementById('wEst').value,notas:document.getElementById('wNotas').value,afp:document.getElementById('wAfp').value,cuspp:document.getElementById('wCuspp').value,banco:document.getElementById('wBanco').value,cuenta:document.getElementById('wCuenta').value,movilidad:+document.getElementById('wMovilidad').value||0,codigoQr:document.getElementById('wCodigoQr').value.trim()};
  if(_editPersonalId){
    const idx=DB.personal.findIndex(x=>x.id===_editPersonalId);
    if(idx>-1){
      const oldProy=DB.personal[idx].proy;
      if(oldProy&&rec.proy&&oldProy!==rec.proy){
        DB.tareaje.filter(r=>r.personalId===_editPersonalId&&!r.proy).forEach(r=>{r.proy=oldProy;syncSheet('saveTareaje',r);});
      }
      Object.assign(DB.personal[idx],rec);syncSheet('savePersonal',DB.personal[idx]);
    }
    _editPersonalId=null;
    closeM('mPersonal');rPersonal();_refrescarTareajeSiActivo();toast('Trabajador actualizado');
  }else{
    rec.id=nid('personal');
    DB.personal.push(rec);
    syncSheet('savePersonal',DB.personal[DB.personal.length-1]);
    closeM('mPersonal');rPersonal();toast('Trabajador registrado');
  }
}
// ══ ASISTENCIA / TAREAJE ══
let _html5QrScanner=null,_scannerCooldown=false;
let _manualAsiPersonalId=null,_manualAsiFecha=null;
let _scanWorker=null,_scanTipoSel='TD';
let _barcodeDetector=null,_videoStream=null,_detectLoop=null;

async function rAsistencia(){
  const dateEl=document.getElementById('asiDate');
  if(!dateEl.value) dateEl.value=today();
  const fecha=dateEl.value;
  const guardia=document.getElementById('asiGuardia').value;
  const tareoFilt=document.getElementById('asiTareo')?.value||'';
  const nomFiltro=(document.getElementById('asiNomFiltro')?.value||'').trim().toLowerCase();
  await loadAsistenciaFecha(fecha);
  let trabajadores=DB.personal.filter(p=>{
    if(p.est!=='Activo') return false;
    if(guardia&&p.guardia!==guardia) return false;
    if(nomFiltro){const full=((p.ape||'')+' '+(p.nom||'')).toLowerCase();if(!full.includes(nomFiltro)) return false;}
    return true;
  });
  if(tareoFilt){
    trabajadores=trabajadores.filter(p=>{
      const tr=DB.tareaje.find(r=>r.personalId===p.id&&r.fecha===fecha);
      if(tareoFilt==='__sin__') return !tr||!tr.tipo;
      return tr&&tr.tipo===tareoFilt;
    });
  }
  const registros=DB.asistencia.filter(a=>a.fecha===fecha);
  const presentes=registros.filter(a=>a.horaEntrada).length;
  const conSalida=registros.filter(a=>a.horaEntrada&&a.horaSalida).length;
  const enTurno=presentes-conSalida;
  const ausentes=trabajadores.length-presentes;
  document.getElementById('asiKpis').innerHTML=[
    {l:'Total Activos',v:trabajadores.length,c:'#3b82f6'},
    {l:'Presentes',v:presentes,c:'#10b981'},
    {l:'Ausentes',v:ausentes<0?0:ausentes,c:'#ef4444'},
    {l:'En Turno (sin salida)',v:enTurno,c:'#f59e0b'}
  ].map(k=>`<div class="kpi" style="--kc:${k.c}"><div class="kpi-lbl">${k.l}</div><div class="kpi-val">${k.v}</div></div>`).join('');
  document.getElementById('tbAsistencia').innerHTML=trabajadores.map(p=>{
    const reg=registros.find(a=>a.personalId===p.id);
    const entrada=reg?.horaEntrada||'';
    const salida=reg?.horaSalida||'';
    const horas=entrada&&salida?calcHoras(entrada,salida):'';
    const tareoRec=DB.tareaje.find(r=>r.personalId===p.id&&r.fecha===fecha);
    const tareoTipo=tareoRec?tareoRec.tipo:'';
    const _tt=tareoTipo&&_TARE_T?_TARE_T[tareoTipo]:null;
    const tareoBadge=_tt
      ?`<span class="badge" style="background:${_tt.bg};color:${_tt.tx};font-size:.65rem">${tareoTipo}</span>`
      :'<span style="color:var(--muted)">—</span>';
    const estadoBadge=!entrada
      ?'<span class="badge" style="background:rgba(239,68,68,.18);color:#ef4444;border:1px solid #ef444435">AUSENTE</span>'
      :!salida
        ?'<span class="badge" style="background:rgba(245,158,11,.18);color:#f59e0b;border:1px solid #f59e0b35">EN TURNO</span>'
        :'<span class="badge" style="background:rgba(16,185,129,.18);color:#10b981;border:1px solid #10b98135">COMPLETO</span>';
    const tipoBadge=p.tipo?`<span class="badge" style="background:${p.tipo==='Staff'?'rgba(99,102,241,.2)':'rgba(16,185,129,.2)'};color:${p.tipo==='Staff'?'#818cf8':'#34d399'};border:1px solid ${p.tipo==='Staff'?'#818cf860':'#34d39960'}">${p.tipo}</span>`:'<span style="color:var(--muted)">—</span>';
    const grdBadge=p.guardia?`<span class="badge" style="background:rgba(245,158,11,.15);color:#f59e0b;border:1px solid #f59e0b50">Grd.${p.guardia}</span>`:'<span style="color:var(--muted)">—</span>';
    const esManual=!!(reg&&reg.registradoPor);
    const entradaCell=entrada
      ?(esManual?`<span title="Registro manual · por ${reg.registradoPor}">✋ ${entrada}</span>`:entrada)
      :'<span style="color:var(--muted)">—</span>';
    const btnManual=`<button onclick="marcarManualAsi(${p.id},'${fecha}',this)" title="Registrar asistencia manual: Día = 06:00 · Noche = 18:00" style="background:none;border:1px solid var(--border);border-radius:5px;color:var(--muted2);cursor:pointer;font-size:.72rem;padding:.08rem .38rem;margin-left:.35rem">✋</button>`;
    return `<tr>
      <td class="mono">${p.dni}</td>
      <td><strong>${p.ape}, ${p.nom}</strong></td>
      <td>${tipoBadge}</td><td>${grdBadge}</td>
      <td class="mono" style="color:${esManual?'#f59e0b':'#10b981'};font-weight:600">${entradaCell}</td>
      <td class="mono">${horas||'<span style="color:var(--muted)">—</span>'}</td>
      <td>${tareoBadge}</td>
      <td>${estadoBadge}${btnManual}</td>
    </tr>`;
  }).join('');
  if(typeof _notifActualizarBotones==='function')_notifActualizarBotones();
}

function calcHoras(e,s){
  try{const[eh,em]=e.split(':').map(Number),[sh,sm]=s.split(':').map(Number);
  const m=(sh*60+sm)-(eh*60+em);if(m<=0)return '—';return Math.floor(m/60)+'h '+String(m%60).padStart(2,'0')+'m';}catch{return '—';}
}

async function loadAsistenciaFecha(fecha){
  try{
    const[asiRes,tarRes]=await Promise.all([
      supa.from('asistencia').select('*').eq('fecha',fecha),
      supa.from('tareaje').select('*').eq('fecha',fecha)
    ]);
    if(!asiRes.error&&asiRes.data)DB.asistencia=asiRes.data.map(toCamel);
    if(!tarRes.error&&tarRes.data){
      DB.tareaje=DB.tareaje.filter(r=>r.fecha!==fecha);
      DB.tareaje.push(...tarRes.data.map(toCamel));
    }
  }catch(e){console.warn('[Asistencia]',e);}
}

// ── ESCÁNER QR ──
function openScanner(){
  _scanWorker=null;_scanTipoSel='TD';
  document.getElementById('mScanner').classList.add('open');
  document.getElementById('scanWorkerPanel').style.display='none';
  document.getElementById('qr-reader').style.display='block';
  setScannerStatus('Iniciando cámara...','wait');
  setTimeout(iniciarScanner,300);
}
function _detenerCamara(){
  if(_detectLoop){cancelAnimationFrame(_detectLoop);_detectLoop=null;}
  if(_videoStream){_videoStream.getTracks().forEach(t=>t.stop());_videoStream=null;}
  if(_html5QrScanner){_html5QrScanner.stop().catch(()=>{});_html5QrScanner=null;}
  _barcodeDetector=null;
}
function closeScanner(){
  _detenerCamara();
  document.getElementById('mScanner').classList.remove('open');
}
function setScannerStatus(msg,type){
  const el=document.getElementById('scannerStatus');
  el.textContent=msg;el.className='scanner-status scanner-'+type;
}
function _scanBeep(){
  try{
    const ctx=new(window.AudioContext||window.webkitAudioContext)();
    const o=ctx.createOscillator();const g=ctx.createGain();
    o.connect(g);g.connect(ctx.destination);
    o.frequency.value=1480;o.type='sine';
    g.gain.setValueAtTime(0,ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.4,ctx.currentTime+0.01);
    g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.18);
    o.start(ctx.currentTime);o.stop(ctx.currentTime+0.18);
  }catch(e){}
}
function _scanSuccess(){
  try{navigator.vibrate&&navigator.vibrate([60,30,60]);}catch(e){}
  _scanBeep();
  const ov=document.getElementById('scanOverlay');
  if(ov){ov.classList.add('scan-ok-flash');setTimeout(()=>ov.classList.remove('scan-ok-flash'),400);}
}
function _scanOverlayHTML(){
  return`<div id="scanOverlay" class="scan-overlay">
    <div class="scan-vignette"></div>
    <div class="scan-zone">
      <div class="scan-corner tl"></div><div class="scan-corner tr"></div>
      <div class="scan-corner bl"></div><div class="scan-corner br"></div>
      <div class="scan-line"></div>
    </div>
  </div>`;
}

async function iniciarScanner(){
  console.log('[SCAN] iniciando. BarcodeDetector disponible:', 'BarcodeDetector' in window, '| Html5Qrcode:', typeof Html5Qrcode);
  // Motor 1: BarcodeDetector nativo (Android Chrome — rápido y preciso)
  if('BarcodeDetector' in window){
    try{
      const supported=await BarcodeDetector.getSupportedFormats().catch(()=>[]);
      console.log('[SCAN M1] formatos soportados:', supported);
      const want=['qr_code','data_matrix','aztec','code_128','code_39','ean_13','ean_8','upc_a','upc_e','itf','codabar'];
      const fmts=supported.length?want.filter(f=>supported.includes(f)):want;
      console.log('[SCAN M1] usando formatos:', fmts);
      _barcodeDetector=new BarcodeDetector({formats:fmts});
      const stream=await navigator.mediaDevices.getUserMedia({
        video:{facingMode:'environment',width:{ideal:1920},height:{ideal:1080}}
      });
      _videoStream=stream;
      const qrDiv=document.getElementById('qr-reader');
      qrDiv.innerHTML=`<div class="scan-wrap">
        <video id="scanVideo" autoplay playsinline muted style="width:100%;max-height:300px;object-fit:cover;display:block"></video>
        ${_scanOverlayHTML()}
      </div>`;
      const vid=document.getElementById('scanVideo');
      vid.srcObject=stream;
      await new Promise(r=>vid.onloadedmetadata=r);
      vid.play();
      console.log('[SCAN M1] video listo, readyState:', vid.readyState, 'size:', vid.videoWidth+'x'+vid.videoHeight);
      setScannerStatus('📷 Apunte el código al centro del recuadro','wait');
      let _frameSkip=0, _detectCount=0;
      const loop=async()=>{
        if(!_barcodeDetector)return;
        _frameSkip=(_frameSkip+1)%2;
        if(!_frameSkip){
          try{
            const res=await _barcodeDetector.detect(vid);
            _detectCount++;
            if(_detectCount%60===0) console.log('[SCAN M1] frames procesados:',_detectCount,'| cooldown:',_scannerCooldown);
            if(res.length&&!_scannerCooldown){
              console.log('[SCAN M1] ¡DETECTADO!', res[0].rawValue, 'formato:', res[0].format);
              _scannerCooldown=true;
              _scanSuccess();
              procesarQR(res[0].rawValue);
            }
          }catch(e){if(_detectCount<3)console.warn('[SCAN M1] error detect:',e);}
        }
        _detectLoop=requestAnimationFrame(loop);
      };
      _detectLoop=requestAnimationFrame(loop);
      return;
    }catch(err){
      console.warn('[SCAN M1] falló, usando Motor 2:', err.message||err);
    }
  }
  // Motor 2: Html5Qrcode (iOS Safari y otros)
  if(typeof Html5Qrcode==='undefined'){
    console.error('[SCAN] Html5Qrcode no disponible');
    setScannerStatus('Error: escáner no disponible en este navegador','err');return;
  }
  console.log('[SCAN M2] iniciando Html5Qrcode');
  const _fmts=typeof Html5QrcodeSupportedFormats!=='undefined'
    ?{formatsToSupport:[Html5QrcodeSupportedFormats.QR_CODE,Html5QrcodeSupportedFormats.DATA_MATRIX,Html5QrcodeSupportedFormats.CODE_128,Html5QrcodeSupportedFormats.CODE_39,Html5QrcodeSupportedFormats.EAN_13]}
    :{};
  _html5QrScanner=new Html5Qrcode('qr-reader',_fmts);
  _html5QrScanner.start(
    {facingMode:'environment'},
    {fps:25,qrbox:{width:250,height:250},aspectRatio:1.0,disableFlip:false},
    (decoded)=>{
      console.log('[SCAN M2] ¡DETECTADO!', decoded);
      if(_scannerCooldown)return;
      _scannerCooldown=true;
      _scanSuccess();
      procesarQR(decoded);
      setTimeout(()=>{_scannerCooldown=false;},2500);
    },
    ()=>{}
  ).then(()=>{
    console.log('[SCAN M2] cámara activa');
    setScannerStatus('📷 Apunte el código al centro del recuadro','wait');
    const qrDiv=document.getElementById('qr-reader');
    const ov=document.createElement('div');
    ov.innerHTML=_scanOverlayHTML();
    ov.style.cssText='position:absolute;inset:0;pointer-events:none;z-index:20';
    qrDiv.style.position='relative';
    qrDiv.appendChild(ov.firstChild);
  }).catch(err=>{
    console.error('[SCAN M2] error:', err);
    setScannerStatus('Error de cámara: '+err,'err');
  });
}
function _hablar(texto){
  if(!window.speechSynthesis)return;
  window.speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(texto);
  u.lang='es-PE';u.rate=1.05;u.volume=1;
  window.speechSynthesis.speak(u);
}

async function procesarQR(texto){
  let p=null;
  const match=texto.match(/ECO-PERSONAL-(\d+)/);
  if(match){p=DB.personal.find(x=>x.id===parseInt(match[1]));}
  if(!p){p=DB.personal.find(x=>x.dni===texto.trim());}
  if(!p){p=DB.personal.find(x=>x.codigoQr&&x.codigoQr===texto.trim());}
  if(!p){
    _hablar('No está en el sistema');
    setScannerStatus('⚠ No encontrado: '+texto.trim(),'err');
    setTimeout(()=>{_scannerCooldown=false;setScannerStatus('📷 Apunte el código al centro del recuadro','wait');},2500);
    return;
  }

  try{
    // El escáner SOLO marca la hora de entrada.
    // El tareo (TD/TN/A5) se registra en lote con el botón "Registrar Tareo" del módulo Asistencia.
    const fecha=document.getElementById('asiDate')?.value||today();
    await loadAsistenciaFecha(fecha);
    const ahora=new Date().toTimeString().slice(0,5);

    // ── Guardar asistencia (solo si no tiene entrada aún) ──
    const asiExist=DB.asistencia.find(a=>a.personalId===p.id&&a.fecha===fecha);
    if(!asiExist){
      const newRec={personalId:p.id,fecha,horaEntrada:ahora,horaSalida:'',guardia:p.guardia||'',estado:'Presente'};
      const{data,error}=await supa.from('asistencia').insert(toSnake(newRec)).select().single();
      if(error){
        console.warn('[Asistencia insert]',error.message);
        _hablar('Error, reintente');
        setScannerStatus('⚠ No se pudo guardar la hora — reintente el escaneo','err');
        setTimeout(reiniciarEscaner,2500);
        return;
      }
      if(data){newRec.id=data.id;DB.asistencia.push(newRec);}
    }

    // ── Feedback y reinicio ──
    const nombreCorto=(p.ape||'').split(' ')[0]+', '+(p.nom||'').split(' ')[0];
    _hablar('Registrado');
    setScannerStatus(`✓ ${nombreCorto} · ${asiExist?'ya tenía hora '+asiExist.horaEntrada:'hora '+ahora}`,'ok');
    if(AP==='tareaje')rTareaje();
    if(AP==='asistencia')rAsistencia();
    document.getElementById('scanWorkerPanel').style.display='none';
    setTimeout(reiniciarEscaner,2000);
  }catch(e){
    console.error('[procesarQR]',e);
    setScannerStatus('⚠ Error al registrar — reintentando...','err');
    setTimeout(reiniciarEscaner,2500);
  }
}
// ── REGISTRO DE TAREO EN LOTE ──
// Marca el tareo de todos los que tienen hora de entrada en la fecha:
// TD si la entrada fue de 05:00 a 16:59, TN en otro horario · A5 (Anexo 5) en sus primeros 4 días trabajados
const AM_DIAS_A5=4;
async function registrarTareoAsistencia(){
  const fecha=document.getElementById('asiDate')?.value||today();
  toast('Cargando asistencia de '+fecha+'...');
  await loadAsistenciaFecha(fecha);
  const asis=DB.asistencia.filter(a=>a.fecha===fecha&&a.horaEntrada);
  if(!asis.length){toast('No hay personal con hora marcada en '+fecha,true);return;}
  if(!confirm(`Se registrará el tareo (TD/TN/A5) de ${asis.length} persona(s) con hora de entrada del ${fecha}.\n\n¿Continuar?`))return;
  let ok=0,err=0,a5=0;
  const fallidos=[];
  for(const a of asis){
    const p=DB.personal.find(x=>x.id===a.personalId);
    if(!p){err++;fallidos.push('#'+a.personalId);continue;}
    const h=parseInt(String(a.horaEntrada).slice(0,2),10);
    const turno=(h>=5&&h<17)?'TD':'TN';
    const prevDias=(DB.tareaje||[]).filter(r=>
      r.personalId===p.id&&r.fecha&&r.fecha<fecha&&
      ['TD','TN','DLT','A5'].includes(r.tipo)
    );
    const tipo=prevDias.length<AM_DIAS_A5?'A5':turno;
    const existente=DB.tareaje.find(r=>r.personalId===p.id&&r.fecha===fecha);
    let e;
    if(existente){
      existente.tipo=tipo;
      e=await supaUpsert('tareaje',existente);
    }else{
      const rec={id:nid('tar'),personalId:p.id,fecha,tipo,proy:p.proy||''};
      DB.tareaje.push(rec);
      e=await supaUpsert('tareaje',rec);
      if(e)DB.tareaje=DB.tareaje.filter(r=>r!==rec); // no quedó en servidor: retirar copia local
    }
    if(e){err++;fallidos.push(`${p.ape}, ${p.nom}`);}
    else{ok++;if(tipo==='A5')a5++;}
  }
  if(AP==='asistencia')rAsistencia();
  if(AP==='tareaje')rTareaje();
  const msg=`Tareo registrado: ${ok} ✓${a5?` · ${a5} A5 (ingreso nuevo)`:''}${err?` · ${err} FALLARON`:''}`;
  toast(msg,err>0);
  if(err)alert('⚠ No se pudo registrar el tareo de:\n\n'+fallidos.join('\n')+'\n\nVuelva a presionar "Registrar Tareo" para reintentar solo los pendientes.');
}

function _swSelTipo(k){
  _scanTipoSel=k;
  ['TD','TN','A5'].forEach(t=>{
    const b=document.getElementById('swT-'+t);if(!b)return;
    const v=_TARE_T[t];
    b.style.background=t===k?v.bg:'var(--panel2)';
    b.style.color=t===k?v.tx:'var(--text)';
  });
}
async function guardarTareoEscaner(){
  if(!_scanWorker||!_scanTipoSel)return;
  const p=_scanWorker,tipo=_scanTipoSel;
  const fecha=document.getElementById('asiDate')?.value||today();
  // 1. Guardar / actualizar en tariaje
  const existing=DB.tareaje.find(r=>r.personalId===p.id&&r.fecha===fecha);
  if(existing){existing.tipo=tipo;syncSheet('saveTareaje',existing);}
  else{
    const rec={id:nid('tar'),personalId:p.id,fecha,tipo,proy:p.proy||''};
    DB.tareaje.push(rec);syncSheet('saveTareaje',rec);
  }
  // 2. Guardar entrada en asistencia (solo si no tiene registro aún)
  const ahora=new Date().toTimeString().slice(0,5);
  const asiExist=DB.asistencia.find(a=>a.personalId===p.id&&a.fecha===fecha);
  let asiMsg='';
  if(!asiExist){
    const newRec={personalId:p.id,fecha,horaEntrada:ahora,horaSalida:'',guardia:p.guardia||'',estado:'Presente'};
    const{data}=await supa.from('asistencia').insert(toSnake(newRec)).select().single();
    if(data){newRec.id=data.id;DB.asistencia.push(newRec);}
    asiMsg=` | Entrada ${ahora}`;
  }
  const btn=document.getElementById('swBtnGuardar');
  btn.disabled=true;btn.textContent='✓ Guardado';
  const est=document.getElementById('swEstado');
  est.style.cssText='background:rgba(16,185,129,.18);color:#10b981;border-radius:6px;padding:.35rem .65rem;font-size:.72rem;font-weight:700';
  est.innerHTML=`✅ ${tipo} guardado${asiMsg}`;
  if(AP==='tareaje')rTareaje();
  if(AP==='asistencia')rAsistencia();
}
function reiniciarEscaner(){
  _detenerCamara();
  _scanWorker=null;_scanTipoSel='TD';_scannerCooldown=false;
  document.getElementById('scanWorkerPanel').style.display='none';
  const qrDiv=document.getElementById('qr-reader');
  qrDiv.style.display='block';qrDiv.innerHTML='';
  setScannerStatus('Reiniciando cámara...','wait');
  setTimeout(iniciarScanner,300);
}

// ── FOTOCHECK QR ──
function openQRFotocheck(){
  const sel=document.getElementById('fotocheckSelect');
  sel.innerHTML='<option value="">— Seleccionar trabajador —</option>'+
    DB.personal.filter(p=>p.est==='Activo').map(p=>`<option value="${p.id}">${p.ape}, ${p.nom}</option>`).join('');
  document.getElementById('fotocheckDisplay').style.display='none';
  document.getElementById('fc-qr').innerHTML='';
  openM('mFotocheck');
}
function renderFotocheck(){
  const id=parseInt(document.getElementById('fotocheckSelect').value);
  if(!id){document.getElementById('fotocheckDisplay').style.display='none';return;}
  const p=DB.personal.find(x=>x.id===id);if(!p)return;
  document.getElementById('fotocheckDisplay').style.display='block';
  document.getElementById('fc-nombre').textContent=`${p.ape}, ${p.nom}`;
  document.getElementById('fc-cargo').textContent=p.cargo||'';
  document.getElementById('fc-dni').textContent='DNI: '+p.dni;
  document.getElementById('fc-guardia').textContent=(p.guardia?'Guardia '+p.guardia:'')+' '+(p.tipo||'');
  const qrDiv=document.getElementById('fc-qr');
  qrDiv.innerHTML='';
  if(typeof QRCode!=='undefined'){
    new QRCode(qrDiv,{text:'ECO-PERSONAL-'+p.id,width:160,height:160,colorDark:'#0a0a1a',colorLight:'#ffffff'});
  }
}
function imprimirFotocheck(){
  const card=document.getElementById('fotocheckCard').outerHTML;
  const win=window.open('','_blank');
  if(!win){toast('Active ventanas emergentes para imprimir',true);return;}
  const S='<'+'/';
  const css='body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f0f0f0;font-family:Arial,sans-serif}'
    +'.fotocheck-card{background:#fff;color:#0a0a1a;border-radius:12px;border:2px solid #1e3a6e;padding:1.4rem 1.2rem;text-align:center;width:200px;box-shadow:0 4px 16px #0003}'
    +'.fc-brand{font-size:.55rem;letter-spacing:.2em;color:#1e3a6e;text-transform:uppercase;font-weight:700;margin-bottom:.4rem}'
    +'.fc-nombre{font-weight:900;font-size:.9rem;margin-bottom:.15rem;color:#0a0a1a;line-height:1.2}'
    +'.fc-cargo{font-size:.65rem;color:#444;margin-bottom:.8rem}'
    +'.fc-dni{font-family:monospace;font-size:.72rem;margin-top:.5rem;color:#333}'
    +'.fc-guardia{font-size:.62rem;color:#666;margin-top:.2rem}'
    +'@media print{body{background:#fff}}';
  const html='<!DOCTYPE html><html><head><title>Fotocheck'+S+'title><style>'+css+S+'style>'+S+'head><body>'+card+S+'body>'+S+'html>';
  win.document.write(html);win.document.close();win.focus();
  setTimeout(function(){win.print();},400);
}

// ── REGISTRO MANUAL ──
// ── ASISTENCIA MANUAL RÁPIDA (✋ → ☀ Día 06:00 · 🌙 Noche 18:00) ──
// Hora fija por convención para diferenciar los registros manuales de los escaneados (hora real)
// Ventana emergente al presionar ✋: asistencia manual (☀/🌙/⌫) + TODAS las opciones de tareaje
let _asiPickerCb=null;
function _asiCloseMenu(){
  if(_asiPickerCb){document.removeEventListener('click',_asiPickerCb);_asiPickerCb=null;}
  const pk=document.getElementById('asiPicker');if(pk)pk.style.display='none';
}
function marcarManualAsi(personalId,fecha,btn){
  _asiCloseMenu();
  let pk=document.getElementById('asiPicker');
  if(!pk){pk=document.createElement('div');pk.id='asiPicker';document.body.appendChild(pk);}
  const p=DB.personal.find(x=>x.id===personalId);
  const rec=DB.tareaje.find(r=>r.personalId===personalId&&r.fecha===fecha);
  const cur=rec?rec.tipo:'';
  let html=`<div style="font-size:.62rem;color:var(--text);margin-bottom:.4rem;font-weight:700">${p?p.ape+', '+p.nom:''} <span style="color:var(--muted2);font-family:monospace;font-weight:400">· ${fecha}</span></div>`;
  html+=`<div style="font-size:.56rem;color:var(--muted2);text-transform:uppercase;letter-spacing:.06em;margin-bottom:.25rem">Asistencia manual (hora fija)</div>
  <div style="display:flex;gap:.3rem;margin-bottom:.55rem">
    <button onclick="_asiCloseMenu();gManualTurno(${personalId},'${fecha}','D')" style="flex:1;background:rgba(245,158,11,.15);border:1px solid #f59e0b60;border-radius:5px;color:#f59e0b;cursor:pointer;font-size:.66rem;padding:.28rem .4rem;font-weight:700;white-space:nowrap">☀ Día 06:00</button>
    <button onclick="_asiCloseMenu();gManualTurno(${personalId},'${fecha}','N')" style="flex:1;background:rgba(59,130,246,.15);border:1px solid #3b82f660;border-radius:5px;color:#60a5fa;cursor:pointer;font-size:.66rem;padding:.28rem .4rem;font-weight:700;white-space:nowrap">🌙 Noche 18:00</button>
    <button onclick="_asiCloseMenu();gManualLimpiar(${personalId},'${fecha}')" title="Borrar la marca de asistencia del día" style="background:rgba(239,68,68,.12);border:1px solid #ef444450;border-radius:5px;color:#ef4444;cursor:pointer;font-size:.66rem;padding:.28rem .4rem;font-weight:700;white-space:nowrap">⌫ Borrar</button>
  </div>`;
  html+=`<div style="font-size:.56rem;color:var(--muted2);text-transform:uppercase;letter-spacing:.06em;margin-bottom:.25rem">Tareo del día (solo tareaje, sin hora)</div>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px;min-width:240px">`;
  Object.entries(_TARE_T).forEach(([k,v])=>{
    html+=`<button onclick="_asiSetTareo(${personalId},'${fecha}','${k}')" style="background:${v.bg};color:${v.tx};border:2px solid ${k===cur?'#fff':'transparent'};border-radius:5px;padding:4px 2px;font-size:.65rem;font-weight:700;cursor:pointer" title="${v.l}">${k}</button>`;
  });
  html+=`<button onclick="_asiSetTareo(${personalId},'${fecha}','')" style="background:#374151;color:#9ca3af;border:1px solid #6b7280;border-radius:5px;padding:4px 2px;font-size:.62rem;font-weight:700;cursor:pointer" title="Quitar el tareo del día">✕ Quitar</button>
  </div>`;
  const r=btn.getBoundingClientRect();
  const w=260,h=250;
  const left=Math.max(4,Math.min(r.left,window.innerWidth-w-10));
  const top=(window.innerHeight-r.bottom-6>=h)?r.bottom+4:Math.max(4,r.top-h-4);
  pk.style.cssText=`display:block;position:fixed;left:${left}px;top:${top}px;z-index:9999;background:var(--panel2);border:1px solid var(--border);border-radius:8px;padding:.6rem;box-shadow:0 8px 24px rgba(0,0,0,.65);min-width:${w}px`;
  pk.innerHTML=html;
  _asiPickerCb=e=>{if(!pk.contains(e.target))_asiCloseMenu();};
  setTimeout(()=>document.addEventListener('click',_asiPickerCb),10);
}
// Fija cualquier tipo de tareo del día desde Asistencia (no toca la hora de entrada)
async function _asiSetTareo(personalId,fecha,tipo){
  _asiCloseMenu();
  const p=DB.personal.find(x=>x.id===personalId);
  const existing=DB.tareaje.find(r=>r.personalId===personalId&&r.fecha===fecha);
  if(!tipo){
    if(existing){await supaDelete('tareaje',existing.id);DB.tareaje=DB.tareaje.filter(r=>r!==existing);toast('Tareo del día quitado');}
  }else if(existing){
    existing.tipo=tipo;
    const e=await supaUpsert('tareaje',existing);
    if(e)return;
    toast('Tareo: '+tipo+(_TARE_T[tipo]?' — '+_TARE_T[tipo].l:''));
  }else{
    const rec={id:nid('tar'),personalId,fecha,tipo,proy:p?.proy||''};
    DB.tareaje.push(rec);
    const e=await supaUpsert('tareaje',rec);
    if(e){DB.tareaje=DB.tareaje.filter(r=>r!==rec);return;}
    toast('Tareo: '+tipo+(_TARE_T[tipo]?' — '+_TARE_T[tipo].l:''));
  }
  rAsistencia();
  if(AP==='tareaje')rTareaje();
}
async function gManualLimpiar(personalId,fecha){
  const existing=DB.asistencia.find(a=>a.personalId===personalId&&a.fecha===fecha);
  if(!existing){rAsistencia();return;}
  const p=DB.personal.find(x=>x.id===personalId);
  if(!confirm(`¿Quitar la marca de asistencia de ${p?p.ape+', '+p.nom:'#'+personalId} del ${fecha}?\n\nQuedará como AUSENTE (también se quita su tareo TD/TN/A5 si ya fue registrado).`))return;
  const{error}=await supa.from('asistencia').delete().eq('id',existing.id);
  if(error){toast('Error al eliminar: '+error.message,true);return;}
  DB.asistencia=DB.asistencia.filter(a=>a!==existing);
  // Quitar también el tareo del día, solo si es de trabajo (TD/TN/A5) — DL, vacaciones, etc. se respetan
  const tar=DB.tareaje.find(r=>r.personalId===personalId&&r.fecha===fecha&&['TD','TN','A5'].includes(r.tipo));
  if(tar){
    await supaDelete('tareaje',tar.id);
    DB.tareaje=DB.tareaje.filter(r=>r!==tar);
  }
  toast('Marca eliminada — queda como AUSENTE');
  rAsistencia();
}
async function gManualTurno(personalId,fecha,turno){
  const hora=turno==='N'?'18:00':'06:00';
  const p=DB.personal.find(x=>x.id===personalId);
  const existing=DB.asistencia.find(a=>a.personalId===personalId&&a.fecha===fecha);
  if(existing){
    Object.assign(existing,{horaEntrada:hora,registradoPor:CU.nombre});
    const{error}=await supa.from('asistencia').update(toSnake(existing)).eq('id',existing.id);
    if(error){toast('Error al guardar: '+error.message,true);return;}
  }else{
    const rec={personalId,fecha,horaEntrada:hora,horaSalida:'',guardia:p?.guardia||'',estado:'Presente',registradoPor:CU.nombre};
    const{data,error}=await supa.from('asistencia').insert(toSnake(rec)).select().single();
    if(error){toast('Error al guardar: '+error.message,true);return;}
    if(data){rec.id=data.id;DB.asistencia.push(rec);}
  }
  toast(`✋ Manual: ${p?p.ape+', '+p.nom:('#'+personalId)} · ${turno==='N'?'NOCHE 18:00':'DÍA 06:00'}`);
  rAsistencia();
}
function registrarManualAsistencia(personalId,fecha){
  _manualAsiPersonalId=personalId;_manualAsiFecha=fecha;
  const p=DB.personal.find(x=>x.id===personalId);
  const reg=DB.asistencia.find(a=>a.personalId===personalId&&a.fecha===fecha);
  document.getElementById('manAsiNombre').textContent=p?`${p.ape}, ${p.nom} — ${fecha}`:'';
  // Registro manual: hora fija 07:00 por convención, para diferenciarlo de los escaneados (hora real)
  document.getElementById('manAsiEntrada').value=reg?.horaEntrada||'07:00';
  document.getElementById('manAsiSalida').value=reg?.horaSalida||'';
  document.getElementById('manAsiObs').value=reg?.obs||'';
  openM('mManualAsi');
}
async function gManualAsi(){
  const entrada=document.getElementById('manAsiEntrada').value;
  const salida=document.getElementById('manAsiSalida').value;
  const obs=document.getElementById('manAsiObs').value;
  if(!entrada){toast('Ingrese hora de entrada',true);return;}
  const p=DB.personal.find(x=>x.id===_manualAsiPersonalId);
  const fecha=_manualAsiFecha;
  const existing=DB.asistencia.find(a=>a.personalId===_manualAsiPersonalId&&a.fecha===fecha);
  if(existing){
    Object.assign(existing,{horaEntrada:entrada,horaSalida:salida,obs,registradoPor:CU.nombre});
    await supa.from('asistencia').update(toSnake(existing)).eq('id',existing.id);
  }else{
    const rec={personalId:_manualAsiPersonalId,fecha,horaEntrada:entrada,horaSalida:salida,guardia:p?.guardia||'',estado:'Presente',obs,registradoPor:CU.nombre};
    const{data}=await supa.from('asistencia').insert(toSnake(rec)).select().single();
    if(data){rec.id=data.id;DB.asistencia.push(rec);}
  }
  // El tareo NO se crea aquí: se registra en lote con el botón "✅ Registrar Tareo"
  closeM('mManualAsi');rAsistencia();toast('Asistencia manual guardada');
}

// ── EXPORTAR PDF TAREAJE ──
function exportTareajePDF(){
  const fecha=document.getElementById('asiDate').value||today();
  const guardia=document.getElementById('asiGuardia').value;
  const trabajadores=DB.personal.filter(p=>p.est==='Activo'&&(!guardia||p.guardia===guardia));
  const rows=trabajadores.map(p=>{
    const reg=DB.asistencia.find(a=>a.personalId===p.id&&a.fecha===fecha);
    const entrada=reg?.horaEntrada||'—';
    const salida=reg?.horaSalida||'—';
    const horas=reg?.horaEntrada&&reg?.horaSalida?calcHoras(reg.horaEntrada,reg.horaSalida):'—';
    const estado=!reg?.horaEntrada?'AUSENTE':!reg?.horaSalida?'EN TURNO':'COMPLETO';
    const color=estado==='AUSENTE'?'#ef4444':estado==='EN TURNO'?'#f59e0b':'#059669';
    return '<tr><td>'+p.dni+'</td><td>'+p.ape+', '+p.nom+'</td><td>'+(p.tipo||'—')+'</td><td>'+(p.guardia?'Grd.'+p.guardia:'—')+'</td><td style="color:#059669;font-weight:600">'+entrada+'</td><td style="color:#d97706;font-weight:600">'+salida+'</td><td>'+horas+'</td><td style="color:'+color+';font-weight:700">'+estado+'</td><td style="height:28px;border-bottom:1px solid #ccc;min-width:80px"></td></tr>';
  }).join('');
  const presentes=DB.asistencia.filter(a=>a.fecha===fecha&&a.horaEntrada).length;
  const win=window.open('','_blank');
  if(!win){toast('Active ventanas emergentes para exportar PDF',true);return;}
  const S='<'+'/';
  const css='body{font-family:Arial,sans-serif;font-size:11px;padding:20px;color:#000}'
    +'.hdr{text-align:center;margin-bottom:12px;border-bottom:3px solid #1e3a6e;padding-bottom:8px}'
    +'h2{margin:0;font-size:15px;color:#1e3a6e}p{margin:3px 0;font-size:10px;color:#555}'
    +'table{width:100%;border-collapse:collapse}'
    +'th{background:#1e3a6e;color:#fff;padding:6px 4px;text-align:left;font-size:10px}'
    +'td{padding:5px 4px;border-bottom:1px solid #eee;font-size:10px}'
    +'tr:nth-child(even){background:#f9f9f9}'
    +'.footer{margin-top:16px;font-size:9px;color:#888;text-align:right}'
    +'@media print{button{display:none}}';
  let body='<div class="hdr"><h2>ECOSERMO — CONTROL DE ASISTENCIA / TAREAJE</h2>';
  body+='<p>Fecha: <strong>'+fecha+'</strong>'+(guardia?' · Guardia: '+guardia:'')+' · Generado por: '+CU.nombre+' · Presentes: '+presentes+'/'+trabajadores.length+'</p></div>';
  body+='<table><thead><tr><th>DNI</th><th>Apellidos y Nombres</th><th>Tipo</th><th>Guardia</th><th>Entrada</th><th>Salida</th><th>Horas</th><th>Estado</th><th>Firma / V°B°</th></tr></thead>';
  body+='<tbody>'+rows+'</tbody></table>';
  body+='<div class="footer">ECOSERMO · Sistema de Gestion Operativa</div>';
  const html='<!DOCTYPE html><html><head><meta charset=utf-8><title>Tareaje '+fecha+S+'title><style>'+css+S+'style>'+S+'head><body>'+body+S+'body>'+S+'html>';
  win.document.write(html);win.document.close();win.focus();
  setTimeout(function(){win.print();},400);
}


// ══ BIENESTAR ══
function rSocial(){document.getElementById('tbSocial').innerHTML=DB.social.map(r=>`<tr><td class="mono">${r.fecha}</td><td>${r.trab}</td><td><span class="badge b-pink">${r.tipo}</span></td><td>${r.desc}</td><td>${r.deriv}</td><td>${bge(r.est)}</td><td><button class="btn btn-del btn-sm" onclick="del('social',${r.id})">🗑</button></td></tr>`).join('');}
function gSocial(){DB.social.push({id:nid('social'),fecha:document.getElementById('soF').value||today(),trab:document.getElementById('soT').value,tipo:document.getElementById('soTi').value,desc:document.getElementById('soD').value,deriv:document.getElementById('soDr').value,est:document.getElementById('soE').value});syncSheet('saveSocial',DB.social[DB.social.length-1]);closeM('mSocial');rSocial();toast('Atención registrada');}

function rResidencia(){
  const ocu=DB.residencia.filter(r=>r.est==='Ocupado').length,tot=DB.residencia.length;
  document.getElementById('resKpis').innerHTML=[{l:'Total Hab.',v:tot,c:'#3b82f6'},{l:'Ocupadas',v:ocu,c:'#f59e0b'},{l:'Disponibles',v:tot-ocu,c:'#10b981'}].map(k=>`<div class="kpi" style="--kc:${k.c}"><div class="kpi-lbl">${k.l}</div><div class="kpi-val">${k.v}</div></div>`).join('');
  document.getElementById('tbResidencia').innerHTML=DB.residencia.map(r=>`<tr><td class="mono" style="color:var(--bsw);font-weight:700">Hab.${r.hab}</td><td>${r.trab||'<span class="text-muted">—</span>'}</td><td>${r.area||'—'}</td><td class="mono">${r.ing||'—'}</td><td class="mono">${r.sal||'—'}</td><td>${bge(r.est)}</td><td>${r.est==='Ocupado'?`<button class="btn btn-del btn-sm" onclick="libHab(${r.id})">↩ Liberar</button>`:''}</td></tr>`).join('');
}
function gResidencia(){const h=document.getElementById('rH').value.trim();if(!h){toast('Ingrese N° habitación',true);return;}DB.residencia.push({id:nid('res'),hab:h,trab:document.getElementById('rT').value,area:document.getElementById('rA').value,ing:document.getElementById('rI').value||today(),sal:document.getElementById('rS').value,est:'Ocupado'});syncSheet('saveResidencia',DB.residencia[DB.residencia.length-1]);closeM('mResidencia');rResidencia();toast('Habitación asignada');}
function libHab(id){const r=DB.residencia.find(x=>x.id===id);if(r){Object.assign(r,{est:'Disponible',trab:'',area:'',ing:'',sal:''});syncSheet('saveResidencia',r);}rResidencia();toast('Habitación liberada');}

function rAli(){
  const t=DB.alimentacion.length;
  document.getElementById('aliKpis').innerHTML=[{l:'Registros del Mes',v:t,c:'#ec4899'},{l:'Desayunos',v:DB.alimentacion.filter(a=>a.des==='✔ Sí').length,c:'#f59e0b'},{l:'Almuerzos',v:DB.alimentacion.filter(a=>a.alm==='✔ Sí').length,c:'#10b981'}].map(k=>`<div class="kpi" style="--kc:${k.c}"><div class="kpi-lbl">${k.l}</div><div class="kpi-val">${k.v}</div></div>`).join('');
  document.getElementById('tbAli').innerHTML=DB.alimentacion.map(r=>`<tr><td class="mono">${r.fecha}</td><td><span class="badge b-blue">${r.turno}</span></td><td>${r.trab}</td><td>${r.area}</td><td>${r.des==='✔ Sí'?'<span class="badge b-green">✔ Sí</span>':'<span class="badge b-red">✘ No</span>'}</td><td>${r.alm==='✔ Sí'?'<span class="badge b-green">✔ Sí</span>':'<span class="badge b-red">✘ No</span>'}</td><td>${r.cen==='✔ Sí'?'<span class="badge b-green">✔ Sí</span>':'<span class="badge b-red">✘ No</span>'}</td><td>${r.obs||'—'}</td><td><button class="btn btn-del btn-sm" onclick="del('alimentacion',${r.id})">🗑</button></td></tr>`).join('');
}
function gAli(){DB.alimentacion.push({id:nid('ali'),fecha:document.getElementById('alF').value||today(),turno:document.getElementById('alTu').value,trab:document.getElementById('alT').value,area:document.getElementById('alA').value,des:document.getElementById('alD').value,alm:document.getElementById('alAl').value,cen:document.getElementById('alC').value,obs:document.getElementById('alO').value});syncSheet('saveAlimentacion',DB.alimentacion[DB.alimentacion.length-1]);closeM('mAli');rAli();toast('Alimentación registrada');}

function rHosp(){document.getElementById('tbHosp').innerHTML=DB.hospedaje.map(r=>`<tr><td class="mono">${r.fecha}</td><td>${r.trab}</td><td>${r.estab}</td><td class="mono tr">${r.noches} noc.</td><td class="mono tr">${fmt(r.costo)}</td><td>${bge(r.tipoCosto)}</td><td>${bge(r.est)}</td><td><button class="btn btn-del btn-sm" onclick="del('hospedaje',${r.id})">🗑</button></td></tr>`).join('');}
function gHosp(){DB.hospedaje.push({id:nid('hosp'),fecha:document.getElementById('hF').value||today(),trab:document.getElementById('hT').value,estab:document.getElementById('hEs').value,noches:+document.getElementById('hN').value||1,costo:+document.getElementById('hC').value||0,tipoCosto:document.getElementById('hTc').value,est:document.getElementById('hE').value});syncSheet('saveHospedaje',DB.hospedaje[DB.hospedaje.length-1]);closeM('mHosp');rHosp();toast('Hospedaje registrado');}

function rLav(){document.getElementById('tbLav').innerHTML=DB.lavanderia.map(r=>`<tr><td class="mono">${r.fecha}</td><td>${r.trab}</td><td><span class="badge b-blue">${r.prendas}</span></td><td class="mono tr">${r.cant}</td><td class="mono">${r.fEnt}</td><td>${bge(r.est)}</td><td><button class="btn btn-del btn-sm" onclick="del('lavanderia',${r.id})">🗑</button></td></tr>`).join('');}
function gLav(){DB.lavanderia.push({id:nid('lav'),fecha:document.getElementById('lvF').value||today(),trab:document.getElementById('lvT').value,prendas:document.getElementById('lvP').value,cant:+document.getElementById('lvC').value||1,fEnt:document.getElementById('lvFE').value,est:document.getElementById('lvE').value});syncSheet('saveLavanderia',DB.lavanderia[DB.lavanderia.length-1]);closeM('mLav');rLav();toast('Lavandería registrada');}

// ══════════════════════════════════════════════════════════════
// ROSTER DE GUARDIAS – Ciclo 14T / 7D proyectado
// ══════════════════════════════════════════════════════════════
let _rosterInicioVista=null;
const _ROSTER_CICLO_T=14, _ROSTER_CICLO_D=7, _ROSTER_CICLO=21;
let _rosterFiltroCargos=new Set(); // cargos seleccionados (vacío = todos)
let _rosterCargoDropEl=null;
const _ROSTER_GUARDIAS=['A','B','C'];

function _rosterLunes(d=new Date()){
  const dx=new Date(d);const day=dx.getDay();
  dx.setDate(dx.getDate()-day+(day===0?-6:1));
  return dx.toISOString().split('T')[0];
}
function _rosterAddDays(iso,n){
  const d=new Date(iso+'T12:00:00');d.setDate(d.getDate()+n);return d.toISOString().split('T')[0];
}
function _rosterFmt(iso){
  const[,m,d]=iso.split('-');return`${d}/${m}`;
}
function _rosterDia(iso){return new Date(iso+'T12:00:00').getDay();}
const _DN=['DO','LU','MA','MI','JU','VI','SA'];

// El turno y el inicio de ciclo de la guardia se pueden sobreescribir por persona
function _rosterTipoPersona(fecha,cfg,personalId){
  const pCfg=(DB.personalRosterCfg||[]).find(c=>+c.personalId===+personalId);
  if(pCfg&&(pCfg.turno||pCfg.fechaInicio)){
    return _rosterTipo(fecha,{
      ...cfg,
      turno:       pCfg.turno       ||cfg?.turno,
      fechaInicio: pCfg.fechaInicio ||cfg?.fechaInicio
    });
  }
  return _rosterTipo(fecha,cfg);
}

function _rosterPersonaTurnoPicker(personalId,ev){
  ev.stopPropagation();
  const existing=document.getElementById('_pRosterPicker');if(existing)existing.remove();
  const p=(DB.personal||[]).find(x=>x.id===personalId);
  const pCfg=(DB.personalRosterCfg||[]).find(c=>+c.personalId===+personalId);
  const cur=pCfg?.turno||null;
  const div=document.createElement('div');
  div.id='_pRosterPicker';
  div.style.cssText='position:fixed;z-index:99999;background:var(--panel);border:1px solid var(--border);border-radius:10px;padding:.65rem .7rem;box-shadow:0 8px 32px rgba(0,0,0,.65);min-width:210px;font-family:inherit';
  const nm=p?(p.ape||'')+', '+((p.nom||'').split(' ')[0]):'—';
  const opts=[
    {v:'DIA',  ic:'☀️', lb:'Solo Día (TD)', co:'#f59e0b'},
    {v:'NOCHE',ic:'🌙', lb:'Solo Noche (TN)',co:'#818cf8'},
    {v:'MIXTO',ic:'☀️🌙',lb:'Mixto 7D+7N',  co:'#10b981'}
  ];
  const curIni=pCfg?.fechaInicio||'';
  const cfgGrd=p?_rosterGetCfg(p.guardia):null;
  const iniGrd=cfgGrd?.fechaInicio||'';
  div.innerHTML=`<div style="font-size:.68rem;font-weight:700;color:var(--text);margin-bottom:.1rem">${nm}</div>
    <div style="font-size:.58rem;color:var(--muted2);margin-bottom:.55rem">Configuración individual (sobreescribe la guardia)</div>
    <div style="display:flex;flex-direction:column;gap:.28rem">
      ${opts.map(o=>`<button onclick="_rosterSetPersonaTurno(${personalId},'${o.v}')" style="display:flex;align-items:center;gap:.5rem;background:${cur===o.v?'rgba(168,85,247,.2)':'rgba(255,255,255,.04)'};border:1px solid ${cur===o.v?'#a855f7':'var(--border)'};border-radius:6px;padding:.3rem .6rem;color:${cur===o.v?'#a855f7':o.co};cursor:pointer;font-size:.7rem;font-weight:${cur===o.v?'700':'500'};text-align:left"><span style="font-size:.8rem">${o.ic}</span>${o.lb}${cur===o.v?' ✓':''}</button>`).join('')}
      <button onclick="_rosterSetPersonaTurno(${personalId},null)" style="display:flex;align-items:center;gap:.5rem;background:${!cur?'rgba(168,85,247,.1)':'rgba(255,255,255,.03)'};border:1px solid ${!cur?'#a855f7':'var(--border)'};border-radius:6px;padding:.3rem .6rem;color:${!cur?'#a855f7':'var(--muted2)'};cursor:pointer;font-size:.7rem;font-weight:${!cur?'700':'400'};text-align:left"><span>↩</span>Heredar turno de guardia${!cur?' ✓':''}</button>
    </div>
    <div style="border-top:1px solid var(--border);margin:.6rem 0 .45rem"></div>
    <div style="font-size:.58rem;color:var(--muted2);margin-bottom:.3rem">Inicio de ciclo individual</div>
    <input type="date" id="_pRosterIni" value="${curIni}" class="date-ic-azul"
      style="width:100%;background:var(--panel2);border:1px solid ${curIni?'#a855f7':'var(--border)'};border-radius:6px;padding:.28rem .45rem;color:var(--text);font-size:.72rem;color-scheme:dark">
    <div style="display:flex;gap:.28rem;margin-top:.35rem">
      <button onclick="_rosterSetPersonaInicio(${personalId},document.getElementById('_pRosterIni').value)"
        style="flex:1;background:#a855f7;border:none;border-radius:6px;padding:.3rem;color:#fff;cursor:pointer;font-size:.68rem;font-weight:700">💾 Guardar</button>
      <button onclick="_rosterSetPersonaInicio(${personalId},null)"
        style="flex:1;background:rgba(255,255,255,.04);border:1px solid var(--border);border-radius:6px;padding:.3rem;color:var(--muted2);cursor:pointer;font-size:.68rem">↩ Usar guardia</button>
    </div>
    <div style="font-size:.55rem;color:var(--muted);margin-top:.35rem;line-height:1.4">
      ${curIni?`Ciclo propio desde <strong style="color:#a855f7">${_rosterFmt(curIni)}</strong>`:iniGrd?`Hereda de la guardia: <strong>${_rosterFmt(iniGrd)}</strong>`:'La guardia no tiene ciclo configurado'}
    </div>`;
  document.body.appendChild(div);
  const r=ev.target.getBoundingClientRect();
  let top=r.bottom+4,left=r.left;
  if(left+230>window.innerWidth)left=window.innerWidth-235;
  if(top+340>window.innerHeight)top=Math.max(6,r.top-345);
  div.style.top=top+'px';div.style.left=left+'px';
  setTimeout(()=>document.addEventListener('click',function h(e){if(!div.contains(e.target)){div.remove();document.removeEventListener('click',h);}},{capture:true,once:false}),50);
}

// Guarda o limpia un campo de la config individual; si queda vacía, borra el registro
function _rosterSetPersonaCfg(personalId,campo,valor,msg){
  document.getElementById('_pRosterPicker')?.remove();
  const existing=(DB.personalRosterCfg||[]).find(c=>+c.personalId===+personalId);
  if(existing){
    existing[campo]=valor||null;
    if(!existing.turno&&!existing.fechaInicio){
      DB.personalRosterCfg=DB.personalRosterCfg.filter(c=>c.id!==existing.id);
      supaDelete('personalRosterCfg',existing.id);
    }else syncSheet('savePersonalRosterCfg',existing);
  }else if(valor){
    const rec={id:nid('prc'),personalId,turno:null,fechaInicio:null};
    rec[campo]=valor;
    DB.personalRosterCfg.push(rec);syncSheet('savePersonalRosterCfg',rec);
  }
  rRoster();
  toast(msg);
}
function _rosterSetPersonaTurno(personalId,turno){
  _rosterSetPersonaCfg(personalId,'turno',turno,turno?'✓ Turno personal actualizado':'✓ Turno heredado de la guardia');
}
function _rosterSetPersonaInicio(personalId,fecha){
  if(fecha&&!/^\d{4}-\d{2}-\d{2}$/.test(fecha)){toast('Fecha inválida',true);return;}
  _rosterSetPersonaCfg(personalId,'fechaInicio',fecha,fecha?'✓ Inicio de ciclo individual: '+_rosterFmt(fecha):'✓ Inicio heredado de la guardia');
}

function _rosterTipo(fecha,cfg){
  if(!cfg||!cfg.fechaInicio)return null;
  const ini=new Date(cfg.fechaInicio+'T12:00:00');
  const f=new Date(fecha+'T12:00:00');
  const diff=Math.round((f-ini)/(86400000));
  if(diff<0)return null;
  const pos=((diff%_ROSTER_CICLO)+_ROSTER_CICLO)%_ROSTER_CICLO;
  if(cfg.turno==='MIXTO'){
    if(pos<7)return'TD';
    if(pos<14)return'TN';
    return'D';
  }
  return pos<_ROSTER_CICLO_T?(cfg.turno==='NOCHE'?'TN':'TD'):'D';
}

function _rosterGetCfg(guardia){
  return (DB.rosterConfig||[]).find(r=>r.guardia===guardia&&r.activo!==false)||null;
}

function rRoster(){
  if(!_rosterInicioVista)_rosterInicioVista=_rosterLunes();
  const hoy=today();
  const dias35=Array.from({length:35},(_,i)=>_rosterAddDays(_rosterInicioVista,i));
  const mesLabel=()=>{
    const meses=new Set(dias35.map(d=>d.slice(0,7)));
    return [...meses].map(m=>{const[y,mo]=m.split('-');return new Date(y,mo-1,1).toLocaleString('es-PE',{month:'long'}).replace(/^\w/,c=>c.toUpperCase())+' '+y;}).join(' / ');
  };

  const personalActivo=(DB.personal||[]).filter(p=>p.est==='Activo');
  const filtroGrd=document.getElementById('rosterFiltroGrd')?.value||'';
  const cargos=[...new Set(personalActivo.map(p=>(p.cargo||'Sin cargo').toUpperCase()))].sort();

  const personasFiltradas=personalActivo.filter(p=>{
    if(filtroGrd&&p.guardia!==filtroGrd)return false;
    if(_rosterFiltroCargos.size&&!_rosterFiltroCargos.has((p.cargo||'Sin cargo').toUpperCase()))return false;
    return true;
  });
  const _cargoLabel=_rosterFiltroCargos.size===0?'Todos los cargos':_rosterFiltroCargos.size===1?[..._rosterFiltroCargos][0].slice(0,20):`${_rosterFiltroCargos.size} cargos`;

  // ── cabecera de días ──
  const hdrs=dias35.map(d=>{
    const dow=_rosterDia(d);
    const esHoy=d===hoy;
    const esDom=dow===0;
    return`<th style="min-width:30px;width:30px;padding:2px 1px;text-align:center;font-size:.55rem;${esHoy?'background:#f59e0b20;color:#f59e0b;border-left:2px solid #f59e0b;border-right:2px solid #f59e0b':''}">${_rosterFmt(d)}<div style="font-size:.45rem;opacity:.7;${esDom?'color:#ef4444;font-weight:700':''}">${_DN[dow]}</div></th>`;
  }).join('');

  // ── secciones por guardia ──
  const secciones=_ROSTER_GUARDIAS.map(grd=>{
    if(filtroGrd&&filtroGrd!==grd)return'';
    const cfg=_rosterGetCfg(grd);
    const personas=personasFiltradas.filter(p=>p.guardia===grd);
    if(!personas.length&&!cfg)return'';

    const cfgLabel=cfg
      ?`<span style="font-size:.62rem;color:var(--muted2)">· Inicio ciclo: <strong style="color:#e2e8f0">${_rosterFmt(cfg.fechaInicio)}</strong> · <strong style="color:${cfg.turno==='NOCHE'?'#6366f1':cfg.turno==='MIXTO'?'#10b981':'#f59e0b'}">${cfg.turno==='NOCHE'?'🌙 Turno Noche':cfg.turno==='MIXTO'?'☀️🌙 Mixto 7D+7N':'☀️ Turno Día'}</strong></span>`
      :`<span style="font-size:.6rem;color:#ef4444">⚠️ Sin configurar</span>`;

    const rows=personas.map(p=>{
      const pCfgPersona=(DB.personalRosterCfg||[]).find(c=>+c.personalId===+p.id);
      const cells=dias35.map(d=>{
        const tipoBase=_rosterTipoPersona(d,cfg,p.id);
        const ovr=DB.rosterOvr.find(o=>+o.personalId===+p.id&&o.fecha===d);
        const tipo=ovr?ovr.tipo:tipoBase;
        const esOvr=!!ovr;
        const esHoy=d===hoy;
        const dow=_rosterDia(d);
        let bg='',tx='',lbl='';
        if(!tipo){bg='rgba(255,255,255,.02)';tx='#374151';lbl='·';}
        else if(tipo==='TD'){bg='rgba(16,185,129,.18)';tx='#10b981';lbl='TD';}
        else if(tipo==='TN'){bg='rgba(99,102,241,.18)';tx='#818cf8';lbl='TN';}
        else{bg='rgba(239,68,68,.1)';tx='#64748b';lbl='DL';}
        const mKey=`${p.id}|${d}`;
        const isSel=_rosterMultiSel.has(mKey);
        return`<td onclick="${_rosterMultiMode?`_rosterMultiToggleCell('${mKey}',this)`:`_rosterOvrPicker(${p.id},'${d}',event)`}" title="${esOvr?'⚠️ Día sobreescrito':'Click para cambiar'}" style="text-align:center;padding:0;height:24px;font-size:.55rem;font-weight:700;background:${isSel?'rgba(168,85,247,.45)':bg};color:${isSel?'#fff':tx};${esHoy?'border-left:2px solid #f59e0b;border-right:2px solid #f59e0b':''};cursor:pointer;${isSel?'outline:2px solid #a855f7;outline-offset:-2px;':''}">${lbl}${esOvr&&!isSel?'<span style="font-size:.4rem;line-height:1;display:block;color:#f59e0b">✎</span>':''}</td>`;
      }).join('');
      const grdBadge=p.guardia?`<span style="font-size:.5rem;padding:1px 4px;background:rgba(245,158,11,.15);color:#f59e0b;border-radius:3px;font-weight:700">${p.guardia}</span>`:'';
      const _pTurno=pCfgPersona?.turno;
      const _pIni=pCfgPersona?.fechaInicio;
      const _pTurnoIc=_pTurno==='DIA'?'☀️':_pTurno==='NOCHE'?'🌙':_pTurno==='MIXTO'?'⇄':null;
      const _pIc=(_pTurnoIc||'')+(_pIni?'📅':'')||'⚙';
      const _pTit=[_pTurno?'Turno personal: '+_pTurno:'',_pIni?'Inicio de ciclo propio: '+_rosterFmt(_pIni):''].filter(Boolean).join(' · ')||'Click para configurar turno e inicio de ciclo individual';
      const _pAct=_pTurno||_pIni;
      const turnoBadge=`<span onclick="_rosterPersonaTurnoPicker(${p.id},event)" title="${_pTit}" style="cursor:pointer;margin-left:2px;font-size:.45rem;padding:1px 4px;border-radius:3px;font-weight:700;${_pAct?'background:rgba(168,85,247,.2);color:#a855f7;border:1px solid rgba(168,85,247,.4)':'background:rgba(255,255,255,.05);color:var(--muted2);border:1px solid rgba(255,255,255,.1)'}">${_pIc}</span>`;
      return`<tr>
        <td style="padding:.2rem .5rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:.68rem;font-weight:600;color:var(--text);width:175px;max-width:175px">${p.ape||''}, ${(p.nom||'').split(' ')[0]} ${grdBadge}${turnoBadge}</td>
        <td style="padding:.2rem .5rem;font-size:.62rem;color:var(--muted2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:125px;max-width:125px">${(p.cargo||'').toUpperCase().slice(0,18)}</td>
        ${cells}
      </tr>`;
    }).join('');

    const sinPersonas=personas.length===0
      ?`<tr><td colspan="${35+2}" style="text-align:center;font-size:.65rem;color:var(--muted2);padding:.6rem">Sin personal asignado a Guardia ${grd}</td></tr>`:'';

    const _tipoHoyBase=cfg?_rosterTipo(hoy,cfg):null;
    let _cTD=0,_cTN=0,_cDL=0;
    personas.forEach(p=>{
      const ovr=DB.rosterOvr.find(o=>+o.personalId===+p.id&&o.fecha===hoy);
      const t=ovr?ovr.tipo:_tipoHoyBase;
      if(t==='TD')_cTD++;else if(t==='TN')_cTN++;else if(t==='D'||t==='DL')_cDL++;
    });
    const _tipoHoy=_tipoHoyBase;
    const _badge=(n,lbl,bg,col)=>n>0?`<span style="font-size:.65rem;font-weight:700;background:${bg};color:${col};padding:2px 9px;border-radius:4px">${n} ${lbl}</span>`:'';
    const resumenHoy=_tipoHoy?`<div style="display:flex;align-items:center;gap:.35rem;margin-left:.4rem"><span style="font-size:.58rem;color:var(--muted2);font-weight:600">HOY:</span>${_badge(_cTD,'TD','rgba(16,185,129,.22)','#10b981')}${_badge(_cTN,'TN','rgba(99,102,241,.22)','#818cf8')}${_badge(_cDL,'DL','rgba(100,116,139,.22)','#94a3b8')}</div>`:'';
    return`<div style="margin-bottom:1.2rem">
      <div style="display:flex;align-items:center;gap:.6rem;padding:.4rem .6rem;background:rgba(245,158,11,.08);border-left:4px solid #f59e0b;border-radius:0 6px 6px 0;margin-bottom:.4rem;flex-wrap:wrap">
        <span style="font-size:.75rem;font-weight:800;color:#f59e0b">GUARDIA ${grd}</span>
        <span style="font-size:.62rem;color:var(--muted2)">· ${personas.length} persona${personas.length!==1?'s':''}</span>
        ${cfgLabel}
        ${resumenHoy}
        <button onclick="_rosterOpenCfg('${grd}')" style="margin-left:auto;background:rgba(99,102,241,.12);border:1px solid rgba(99,102,241,.3);color:#818cf8;border-radius:5px;padding:2px 8px;font-size:.6rem;cursor:pointer">⚙️ Configurar</button>
      </div>
      <div style="overflow-x:auto">
        <table style="border-collapse:collapse;table-layout:fixed;font-size:.65rem">
          <thead><tr>
            <th style="text-align:left;padding:.2rem .5rem;font-size:.6rem;color:var(--muted2);white-space:nowrap;width:175px;min-width:175px">Nombre</th>
            <th style="text-align:left;padding:.2rem .5rem;font-size:.6rem;color:var(--muted2);white-space:nowrap;width:125px;min-width:125px">Cargo</th>
            ${hdrs}
          </tr></thead>
          <tbody>${rows}${sinPersonas}</tbody>
        </table>
      </div>
    </div>`;
  }).join('');

  // ── KPI del día activo (hoy) ──
  let _kpiTD=0,_kpiTN=0,_kpiDL=0;
  personasFiltradas.filter(p=>p.guardia).forEach(p=>{
    const cfg=_rosterGetCfg(p.guardia);
    if(!cfg)return;
    const ovr=DB.rosterOvr.find(o=>+o.personalId===+p.id&&o.fecha===hoy);
    const t=ovr?ovr.tipo:_rosterTipo(hoy,cfg);
    if(t==='TD')_kpiTD++;
    else if(t==='TN')_kpiTN++;
    else if(t==='D'||t==='DL')_kpiDL++;
  });
  const kpiHoy=`<div style="display:flex;gap:.6rem;flex-wrap:wrap;margin-bottom:.8rem">
    <div style="background:var(--panel);border:1px solid var(--border);border-top:3px solid #10b981;border-radius:8px;padding:.55rem .9rem;display:flex;flex-direction:column;gap:.15rem;min-width:110px">
      <span style="font-size:.58rem;text-transform:uppercase;letter-spacing:.07em;color:var(--muted2)">TD · Hoy</span>
      <span style="font-size:1.8rem;font-weight:800;color:#10b981;line-height:1">${_kpiTD}</span>
      <span style="font-size:.58rem;color:var(--muted2)">personas en obra</span>
    </div>
    <div style="background:var(--panel);border:1px solid var(--border);border-top:3px solid #818cf8;border-radius:8px;padding:.55rem .9rem;display:flex;flex-direction:column;gap:.15rem;min-width:110px">
      <span style="font-size:.58rem;text-transform:uppercase;letter-spacing:.07em;color:var(--muted2)">TN · Hoy</span>
      <span style="font-size:1.8rem;font-weight:800;color:#818cf8;line-height:1">${_kpiTN}</span>
      <span style="font-size:.58rem;color:var(--muted2)">turno noche</span>
    </div>
    <div style="background:var(--panel);border:1px solid var(--border);border-top:3px solid #64748b;border-radius:8px;padding:.55rem .9rem;display:flex;flex-direction:column;gap:.15rem;min-width:110px">
      <span style="font-size:.58rem;text-transform:uppercase;letter-spacing:.07em;color:var(--muted2)">DL · Hoy</span>
      <span style="font-size:1.8rem;font-weight:800;color:#64748b;line-height:1">${_kpiDL}</span>
      <span style="font-size:.58rem;color:var(--muted2)">día libre</span>
    </div>
    <div style="background:var(--panel);border:1px solid var(--border);border-top:3px solid #f59e0b;border-radius:8px;padding:.55rem .9rem;display:flex;flex-direction:column;gap:.15rem;min-width:110px">
      <span style="font-size:.58rem;text-transform:uppercase;letter-spacing:.07em;color:var(--muted2)">Total activos</span>
      <span style="font-size:1.8rem;font-weight:800;color:#f59e0b;line-height:1">${_kpiTD+_kpiTN+_kpiDL}</span>
      <span style="font-size:.58rem;color:var(--muted2)">con guardia asignada</span>
    </div>
  </div>`;

  // ── barra resumen diario TD+TN ──
  const _sumaDia=dias35.map(d=>{
    let n=0;
    _ROSTER_GUARDIAS.forEach(g=>{
      const cfg=_rosterGetCfg(g);if(!cfg)return;
      personasFiltradas.filter(p=>p.guardia===g).forEach(p=>{
        const tipoBase=_rosterTipoPersona(d,cfg,p.id);
        const ovr=DB.rosterOvr.find(o=>+o.personalId===+p.id&&o.fecha===d);
        const t=ovr?ovr.tipo:tipoBase;
        if(t==='TD'||t==='TN')n++;
      });
    });
    return n;
  });
  const barraResumen=`<div style="overflow-x:auto;margin-bottom:.5rem">
    <table style="border-collapse:collapse;table-layout:fixed;font-size:.65rem">
      <tbody><tr>
        <td style="width:175px;min-width:175px;padding:.3rem .5rem;font-size:.6rem;font-weight:700;color:#10b981;white-space:nowrap;background:rgba(16,185,129,.07);border-left:4px solid #10b981;border-radius:0 4px 4px 0">TD + TN · TOTAL</td>
        <td style="width:125px;min-width:125px;background:rgba(16,185,129,.07)"></td>
        ${dias35.map((d,i)=>{const n=_sumaDia[i];const esHoy=d===hoy;const dow=_rosterDia(d);const esDom=dow===0;return`<td style="text-align:center;width:30px;min-width:30px;padding:2px 0;font-size:.68rem;font-weight:800;color:${n>0?'#10b981':'var(--muted2)'};background:${esHoy?'rgba(245,158,11,.15)':n>0?'rgba(16,185,129,.07)':'transparent'};${esHoy?'border-left:2px solid #f59e0b;border-right:2px solid #f59e0b':''};${esDom?'color:#f87171':''}border-bottom:1px solid var(--border)">${n>0?n:'·'}</td>`;}).join('')}
      </tr></tbody>
    </table>
  </div>`;

  // ── leyenda ──
  const leyenda=`<div style="display:flex;gap:.6rem;flex-wrap:wrap;align-items:center;margin-bottom:.8rem;font-size:.65rem">
    <span style="background:rgba(16,185,129,.18);color:#10b981;border-radius:4px;padding:2px 8px;font-weight:700">TD = Turno Día</span>
    <span style="background:rgba(99,102,241,.18);color:#818cf8;border-radius:4px;padding:2px 8px;font-weight:700">TN = Turno Noche</span>
    <span style="background:rgba(239,68,68,.1);color:#64748b;border-radius:4px;padding:2px 8px;font-weight:700">DL = Día Libre</span>
    <span style="background:#f59e0b20;color:#f59e0b;border-radius:4px;padding:2px 8px;font-weight:700;border:1px solid #f59e0b40">HOY</span>
    <span style="font-size:.58rem;color:var(--muted2);margin-left:.3rem">Ciclo: ${_ROSTER_CICLO_T} días trabajando · ${_ROSTER_CICLO_D} días descansando</span>
  </div>`;

  document.getElementById('rosterBody').innerHTML=`
    <!-- Controles -->
    <div style="display:flex;gap:.6rem;flex-wrap:wrap;align-items:flex-end;margin-bottom:.9rem">
      <div>
        <div style="font-size:.6rem;color:var(--muted2);margin-bottom:.2rem;text-transform:uppercase;letter-spacing:.05em">Guardia</div>
        <select id="rosterFiltroGrd" onchange="rRoster()" style="background:var(--panel2);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:.3rem .65rem;font-size:.78rem">
          <option value="">Todas</option>
          <option value="A" ${filtroGrd==='A'?'selected':''}>Guardia A</option>
          <option value="B" ${filtroGrd==='B'?'selected':''}>Guardia B</option>
          <option value="C" ${filtroGrd==='C'?'selected':''}>Guardia C</option>
        </select>
      </div>
      <div style="position:relative">
        <div style="font-size:.6rem;color:var(--muted2);margin-bottom:.2rem;text-transform:uppercase;letter-spacing:.05em">Cargo</div>
        <button id="rosterCargoBtn" onclick="_rosterOpenCargoFilter(event)" style="background:var(--panel2);border:1px solid ${_rosterFiltroCargos.size?'#a855f7':'var(--border)'};border-radius:6px;color:${_rosterFiltroCargos.size?'#a855f7':'var(--text)'};padding:.3rem .65rem;font-size:.78rem;cursor:pointer;min-width:160px;text-align:left;display:flex;align-items:center;gap:.4rem">
          <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${_cargoLabel}</span>
          <span style="font-size:.6rem;color:var(--muted2)">▾</span>
          ${_rosterFiltroCargos.size?`<span onclick="event.stopPropagation();_rosterFiltroCargos.clear();rRoster()" style="font-size:.65rem;color:#ef4444;margin-left:.2rem" title="Limpiar filtro">✕</span>`:''}
        </button>
      </div>
      <div style="display:flex;align-items:center;gap:.4rem;margin-left:auto">
        <button onclick="_rosterNavegar(-35)" style="background:var(--panel2);border:1px solid var(--border);border-radius:6px;padding:.3rem .7rem;color:var(--text);cursor:pointer;font-size:.8rem" title="5 semanas atrás">«</button>
        <button onclick="_rosterNavegar(-7)" style="background:var(--panel2);border:1px solid var(--border);border-radius:6px;padding:.3rem .7rem;color:var(--text);cursor:pointer;font-size:.8rem">◀</button>
        <span style="font-size:.78rem;font-weight:700;color:var(--text);min-width:200px;text-align:center">${mesLabel()}</span>
        <button onclick="_rosterNavegar(7)" style="background:var(--panel2);border:1px solid var(--border);border-radius:6px;padding:.3rem .7rem;color:var(--text);cursor:pointer;font-size:.8rem">▶</button>
        <button onclick="_rosterNavegar(35)" style="background:var(--panel2);border:1px solid var(--border);border-radius:6px;padding:.3rem .7rem;color:var(--text);cursor:pointer;font-size:.8rem" title="5 semanas adelante">»</button>
        <button onclick="_rosterInicioVista=_rosterLunes();rRoster()" style="background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.3);border-radius:6px;padding:.3rem .7rem;color:#f59e0b;cursor:pointer;font-size:.72rem;font-weight:700">Hoy</button>
        <button onclick="_rosterPrintPDF()" style="background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.35);border-radius:6px;padding:.3rem .7rem;color:#ef4444;cursor:pointer;font-size:.72rem;font-weight:700">🖨️ PDF</button>
        <button onclick="_rosterOpenExport()" style="background:rgba(16,185,129,.12);border:1px solid rgba(16,185,129,.35);border-radius:6px;padding:.3rem .7rem;color:#10b981;cursor:pointer;font-size:.72rem;font-weight:700">📥 Excel</button>
        <button onclick="_rosterToggleMulti()" style="background:${_rosterMultiMode?'rgba(168,85,247,.2)':'rgba(168,85,247,.08)'};border:1px solid ${_rosterMultiMode?'#a855f7':'rgba(168,85,247,.3)'};border-radius:6px;padding:.3rem .7rem;color:${_rosterMultiMode?'#a855f7':'#c084fc'};cursor:pointer;font-size:.72rem;font-weight:700">${_rosterMultiMode?'✕ Cancelar':'☰ Multi-selección'}</button>
      </div>
    </div>
    ${_rosterMultiMode?`<div style="position:sticky;top:0;z-index:100;display:flex;align-items:center;gap:.5rem;padding:.45rem .8rem;margin-bottom:.6rem;background:rgba(168,85,247,.12);border:1px solid rgba(168,85,247,.35);border-radius:8px;flex-wrap:wrap">
      <span style="font-size:.72rem;font-weight:700;color:#a855f7">☰ Multi-selección activa</span>
      <span id="rosterMultiCount" style="font-size:.68rem;color:var(--muted2)">${_rosterMultiSel.size} celda${_rosterMultiSel.size!==1?'s':''} seleccionada${_rosterMultiSel.size!==1?'s':''}</span>
      <div style="display:flex;gap:.35rem;margin-left:auto">
        <button onclick="_rosterMultiApply('TD')" style="background:rgba(16,185,129,.2);color:#10b981;border:1px solid #10b98150;border-radius:5px;padding:.25rem .65rem;font-size:.7rem;font-weight:700;cursor:pointer">☀️ TD</button>
        <button onclick="_rosterMultiApply('TN')" style="background:rgba(99,102,241,.2);color:#818cf8;border:1px solid #818cf850;border-radius:5px;padding:.25rem .65rem;font-size:.7rem;font-weight:700;cursor:pointer">🌙 TN</button>
        <button onclick="_rosterMultiApply('DL')" style="background:rgba(100,116,139,.15);color:#94a3b8;border:1px solid #94a3b840;border-radius:5px;padding:.25rem .65rem;font-size:.7rem;font-weight:700;cursor:pointer">🔵 DL</button>
        <button onclick="_rosterMultiApply('RESET')" style="background:rgba(245,158,11,.12);color:#f59e0b;border:1px solid rgba(245,158,11,.3);border-radius:5px;padding:.25rem .65rem;font-size:.7rem;font-weight:700;cursor:pointer">↺ Restaurar ciclo</button>
      </div>
    </div>`:''}
    ${kpiHoy}
    ${leyenda}
    ${barraResumen}
    ${secciones||'<div style="text-align:center;color:var(--muted2);padding:2rem">Sin personal activo con guardia asignada. Asigna guardias en el módulo Personal / RR.HH.</div>'}
    <!-- Modal export Excel -->
    <div id="rosterExportModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;align-items:center;justify-content:center">
      <div style="background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:1.4rem 1.6rem;min-width:320px;max-width:380px;box-shadow:0 16px 48px rgba(0,0,0,.7)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">
          <span style="font-weight:700;font-size:.9rem;color:var(--text)">📥 Exportar Roster a Excel</span>
          <button onclick="_rosterCloseExport()" style="background:none;border:none;color:var(--muted2);cursor:pointer;font-size:1.1rem">✕</button>
        </div>
        <div style="display:flex;flex-direction:column;gap:.8rem">
          <div>
            <label style="font-size:.65rem;color:var(--muted2);display:block;margin-bottom:.3rem;text-transform:uppercase;letter-spacing:.05em">Fecha inicio</label>
            <input type="date" id="rosterExportDesde" style="width:100%;background:var(--panel2);border:1px solid var(--border);border-radius:7px;color:var(--text);padding:.4rem .7rem;font-size:.82rem;box-sizing:border-box;color-scheme:dark">
          </div>
          <div>
            <label style="font-size:.65rem;color:var(--muted2);display:block;margin-bottom:.3rem;text-transform:uppercase;letter-spacing:.05em">Fecha fin</label>
            <input type="date" id="rosterExportHasta" style="width:100%;background:var(--panel2);border:1px solid var(--border);border-radius:7px;color:var(--text);padding:.4rem .7rem;font-size:.82rem;box-sizing:border-box;color-scheme:dark">
          </div>
          <div style="font-size:.62rem;color:var(--muted2)">Máximo 90 días por exportación. Se incluyen todas las guardias con personal activo.</div>
        </div>
        <div style="display:flex;gap:.6rem;justify-content:flex-end;margin-top:1.1rem">
          <button onclick="_rosterCloseExport()" style="background:var(--panel2);border:1px solid var(--border);border-radius:7px;padding:.4rem 1rem;color:var(--text);cursor:pointer;font-size:.8rem">Cancelar</button>
          <button onclick="_rosterDoExport()" style="background:rgba(16,185,129,.15);border:1px solid rgba(16,185,129,.4);border-radius:7px;padding:.4rem 1rem;color:#10b981;cursor:pointer;font-size:.8rem;font-weight:700">📥 Exportar</button>
        </div>
      </div>
    </div>
    <!-- Modal config -->
    <div id="rosterCfgModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:none;align-items:center;justify-content:center">
      <div style="background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:1.4rem 1.6rem;min-width:320px;max-width:400px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">
          <span id="rosterCfgTitle" style="font-weight:700;font-size:.9rem;color:var(--text)">⚙️ Configurar Guardia</span>
          <button onclick="_rosterCloseCfg()" style="background:none;border:none;color:var(--muted2);cursor:pointer;font-size:1.1rem">✕</button>
        </div>
        <div style="display:flex;flex-direction:column;gap:.8rem">
          <div>
            <label style="font-size:.65rem;color:var(--muted2);display:block;margin-bottom:.3rem;text-transform:uppercase;letter-spacing:.05em">Fecha de inicio del ciclo (día 1 de los 14 trabajando)</label>
            <input type="date" id="rosterCfgFecha" style="width:100%;background:var(--panel2);border:1px solid var(--border);border-radius:7px;color:var(--text);padding:.4rem .7rem;font-size:.82rem;box-sizing:border-box;color-scheme:dark">
          </div>
          <div>
            <label style="font-size:.65rem;color:var(--muted2);display:block;margin-bottom:.3rem;text-transform:uppercase;letter-spacing:.05em">Tipo de turno</label>
            <div style="display:flex;flex-direction:column;gap:.4rem">
              <label style="cursor:pointer;display:flex;align-items:center;gap:.4rem;background:rgba(245,158,11,.07);border:1px solid rgba(245,158,11,.2);border-radius:6px;padding:.35rem .6rem">
                <input type="radio" name="rosterCfgTurno" value="DIA" style="accent-color:#f59e0b">
                <span style="font-size:.8rem;color:#f59e0b;font-weight:600">☀️ Turno Día — 14 días TD · 7 días DL</span>
              </label>
              <label style="cursor:pointer;display:flex;align-items:center;gap:.4rem;background:rgba(99,102,241,.07);border:1px solid rgba(99,102,241,.2);border-radius:6px;padding:.35rem .6rem">
                <input type="radio" name="rosterCfgTurno" value="NOCHE" style="accent-color:#6366f1">
                <span style="font-size:.8rem;color:#818cf8;font-weight:600">🌙 Turno Noche — 14 días TN · 7 días DL</span>
              </label>
              <label style="cursor:pointer;display:flex;align-items:center;gap:.4rem;background:rgba(16,185,129,.07);border:1px solid rgba(16,185,129,.2);border-radius:6px;padding:.35rem .6rem">
                <input type="radio" name="rosterCfgTurno" value="MIXTO" style="accent-color:#10b981">
                <span style="font-size:.8rem;color:#10b981;font-weight:600">☀️🌙 Mixto — 7 días TD · 7 días TN · 7 días DL</span>
              </label>
            </div>
          </div>
          <button onclick="_rosterGuardarCfg()" style="background:rgba(16,185,129,.15);border:1px solid rgba(16,185,129,.4);color:#10b981;border-radius:8px;padding:.55rem;font-size:.82rem;font-weight:700;cursor:pointer;width:100%">✓ Guardar configuración</button>
        </div>
      </div>
    </div>
  `;
}

function _rosterNavegar(dias){
  _rosterInicioVista=_rosterAddDays(_rosterInicioVista||_rosterLunes(),dias);
  rRoster();
}

function _rosterPrintPDF(){
  const hoy=today();
  const desde=_rosterInicioVista||_rosterLunes();
  const dias35=Array.from({length:35},(_,i)=>_rosterAddDays(desde,i));
  const filtroGrd=document.getElementById('rosterFiltroGrd')?.value||'';
  const personalActivo=(DB.personal||[]).filter(p=>p.est==='Activo');
  const personasFiltradas=personalActivo.filter(p=>{
    if(filtroGrd&&p.guardia!==filtroGrd)return false;
    if(_rosterFiltroCargos.size&&!_rosterFiltroCargos.has((p.cargo||'Sin cargo').toUpperCase()))return false;
    return true;
  });
  const meses=new Set(dias35.map(d=>d.slice(0,7)));
  const mesLabel=[...meses].map(m=>{const[y,mo]=m.split('-');return new Date(y,+mo-1,1).toLocaleString('es-PE',{month:'long'}).replace(/^\w/,c=>c.toUpperCase())+' '+y;}).join(' / ');
  const DN=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  const tdHdrs=dias35.map(d=>{
    const dow=new Date(d+'T12:00:00').getDay();
    const es=d===hoy,esDom=dow===0;
    return`<th style="text-align:center;width:19px;min-width:19px;padding:1px 0;font-size:5.5px;${es?'background:#fef3c7;color:#92400e;font-weight:900':esDom?'background:#fee2e2;color:#991b1b':'background:#1e3a5f;color:#fff'}">${+d.slice(8)}<br><span style="font-size:4.5px">${DN[dow]}</span></th>`;
  }).join('');
  let seccionesHTML='';
  _ROSTER_GUARDIAS.forEach(grd=>{
    if(filtroGrd&&filtroGrd!==grd)return;
    const cfg=_rosterGetCfg(grd);
    const personas=personasFiltradas.filter(p=>p.guardia===grd);
    if(!personas.length)return;
    const turnoLabel=cfg?(cfg.turno==='NOCHE'?'Turno Noche':cfg.turno==='MIXTO'?'Mixto 7D+7N':'Turno Día'):'Sin config.';
    const cicloLabel=cfg?`Inicio ciclo: ${cfg.fechaInicio}`:'';
    const hBg=grd==='A'?'#0c4a6e':grd==='B'?'#3b0764':'#064e3b';
    const rows=personas.map((p,idx)=>{
      const cells=dias35.map(d=>{
        const tipoBase=cfg?_rosterTipo(d,cfg):null;
        const ovr=DB.rosterOvr.find(o=>+o.personalId===+p.id&&o.fecha===d);
        const tipo=ovr?ovr.tipo:tipoBase;
        let bg='',tx='#94a3b8',lbl='·';
        if(tipo==='TD'){bg='#d1fae5';tx='#065f46';lbl='TD';}
        else if(tipo==='TN'){bg='#e0e7ff';tx='#3730a3';lbl='TN';}
        else if(tipo==='DL'){bg='#f1f5f9';tx='#64748b';lbl='DL';}
        const esHoy=d===hoy;
        return`<td style="text-align:center;padding:0;height:16px;font-size:5.5px;font-weight:700;${bg?`background:${bg};color:${tx};`:'color:#cbd5e1;'}border:1px solid #e2e8f0;${esHoy?'outline:2px solid #f59e0b;outline-offset:-2px;':''}">${lbl}${ovr?'*':''}</td>`;
      }).join('');
      const rowBg=idx%2===0?'#ffffff':'#f8fafc';
      return`<tr style="background:${rowBg}"><td style="font-size:6.5px;font-weight:700;padding:1px 4px;border:1px solid #e2e8f0;white-space:nowrap">${idx+1}. ${p.ape||''}, ${(p.nom||'').split(' ')[0]}</td><td style="font-size:5.8px;padding:1px 3px;border:1px solid #e2e8f0;color:#64748b;white-space:nowrap">${(p.cargo||'—').slice(0,22)}</td>${cells}</tr>`;
    }).join('');
    seccionesHTML+=`<div style="margin-bottom:10px">
      <div style="background:${hBg};color:#fff;padding:4px 8px;border-radius:4px 4px 0 0;font-size:8px;font-weight:700;display:flex;justify-content:space-between">
        <span>GUARDIA ${grd} · ${personas.length} personas</span>
        <span style="font-weight:400;font-size:7px">${turnoLabel} · ${cicloLabel}</span>
      </div>
      <table style="width:100%;border-collapse:collapse">
        <thead><tr style="background:#e2e8f0"><th style="text-align:left;font-size:6.5px;padding:2px 4px;border:1px solid #cbd5e1;min-width:120px">Nombre</th><th style="text-align:left;font-size:6.5px;padding:2px 3px;border:1px solid #cbd5e1;min-width:80px">Cargo</th>${tdHdrs}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  });
  const _logoUrl=window.location.href.replace(/[^\/\\]+$/,'')+'09.-ERP/Imagenes/ECOSERMO-LOGO.png';
  const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Roster de Guardias</title>
<style>@page{size:A3 landscape;margin:.6cm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:8px;color:#111;margin:0}
.hdr{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #1e3a5f;padding-bottom:6px;margin-bottom:8px}
.hdr img{height:40px;object-fit:contain}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body>
<div class="hdr">
  <img src="${_logoUrl}" alt="Ecosermo">
  <div style="text-align:center"><div style="font-size:14px;font-weight:900;color:#1e3a5f">ROSTER DE GUARDIAS</div><div style="font-size:8px;color:#64748b">Cronograma de Rotación de Personal</div></div>
  <div style="text-align:right;font-size:7px;color:#64748b"><div style="font-weight:700;color:#1e3a5f;font-size:9px">${mesLabel}</div><div>Generado: ${new Date().toLocaleString('es-PE')}</div><div style="font-size:6px;margin-top:2px;background:#fef9c3;color:#854d0e;padding:1px 4px;border-radius:3px">* = día sobreescrito manualmente</div></div>
</div>
${seccionesHTML}
</body></html>`;
  const win=window.open('','_blank');
  if(!win){toast('Active ventanas emergentes',true);return;}
  win.document.write(html);win.document.close();win.focus();setTimeout(()=>win.print(),600);
}

function _rosterOpenExport(){
  const modal=document.getElementById('rosterExportModal');
  if(!modal)return;
  // Fecha inicio: inicio de vista actual (la menor fecha visible)
  const desde=_rosterInicioVista||_rosterLunes();
  // Fecha fin: 34 días después (5 semanas = vista completa actual)
  const hasta=_rosterAddDays(desde,34);
  document.getElementById('rosterExportDesde').value=desde;
  document.getElementById('rosterExportHasta').value=hasta;
  modal.style.display='flex';
}
function _rosterCloseExport(){
  const m=document.getElementById('rosterExportModal');
  if(m)m.style.display='none';
}
function _rosterDoExport(){
  const desde=document.getElementById('rosterExportDesde').value;
  const hasta=document.getElementById('rosterExportHasta').value;
  if(!desde||!hasta){toast('Selecciona ambas fechas',true);return;}
  if(desde>hasta){toast('La fecha inicio debe ser menor a la fecha fin',true);return;}
  _rosterCloseExport();
  _rosterExportXLSX(desde,hasta);
}

function _rosterExportXLSX(desde,hasta){
  // Construir rango de días
  const dias=[];let cur=desde;
  while(cur<=hasta){dias.push(cur);cur=_rosterAddDays(cur,1);}
  if(dias.length>91){toast('Máximo 90 días por exportación',true);return;}
  const personalActivo=(DB.personal||[]).filter(p=>p.est==='Activo');
  const DN=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  const _fmt=iso=>{const[,m,d]=iso.split('-');return`${d}/${m}`;};
  const _dow=iso=>new Date(iso+'T12:00:00').getDay();
  const BOR={top:{style:'thin',color:{rgb:'CBD5E1'}},bottom:{style:'thin',color:{rgb:'CBD5E1'}},left:{style:'thin',color:{rgb:'CBD5E1'}},right:{style:'thin',color:{rgb:'CBD5E1'}}};
  const S=(v,bold,bg,color,align,sz)=>({v:v??'',t:'s',s:{font:{bold:!!bold,color:{rgb:color||'334155'},sz:sz||8},fill:bg?{fgColor:{rgb:bg}}:{},alignment:{horizontal:align||'left',vertical:'center',wrapText:false},border:BOR}});
  const nCols=2+dias.length;
  const wsData=[];
  // Títulos
  wsData.push([S('ROSTER DE GUARDIAS',true,'1E3A5F','FFFFFF','center',10),...Array(nCols-1).fill(S('',false,'1E3A5F','FFFFFF'))]);
  wsData.push([S(`Período: ${_fmt(desde)} al ${_fmt(hasta)}  ·  ${dias.length} días`,false,'EFF6FF','3B82F6','center'),...Array(nCols-1).fill(S('',false,'EFF6FF'))]);
  wsData.push([S(`Exportado: ${today()}`,false,'F8FAFC','64748b','center'),...Array(nCols-1).fill(S('',false,'F8FAFC'))]);
  wsData.push(Array(nCols).fill(S('')));
  const GRD_HDR={'A':['14532D','FFFFFF'],'B':['1E1B4B','FFFFFF'],'C':['7C2D12','FFFFFF']};
  const GRD_ROW={'A':['D1FAE5','10b981'],'B':['EDE9FE','6366F1'],'C':['FEE2E2','DC2626']};
  const merges=[{s:{r:0,c:0},e:{r:0,c:nCols-1}},{s:{r:1,c:0},e:{r:1,c:nCols-1}},{s:{r:2,c:0},e:{r:2,c:nCols-1}}];
  let curRow=4;
  _ROSTER_GUARDIAS.forEach(grd=>{
    const cfg=_rosterGetCfg(grd);
    const personas=personalActivo.filter(p=>p.guardia===grd);
    if(!personas.length)return;
    const [hBg,hTx]=GRD_HDR[grd]||['1E3A5F','FFFFFF'];
    const [rBg,rTx]=GRD_ROW[grd]||['EFF6FF','334155'];
    const turno=cfg?(cfg.turno==='NOCHE'?'Turno Noche':'Turno Día'):'Sin configurar';
    const ciclo=cfg?`· Inicio ciclo: ${cfg.fechaInicio}`:'';
    // Encabezado guardia
    wsData.push([S(`GUARDIA ${grd}  ·  ${personas.length} personas  ·  ${turno}  ${ciclo}`,true,hBg,hTx,'left',9),...Array(nCols-1).fill(S('',false,hBg))]);
    merges.push({s:{r:curRow,c:0},e:{r:curRow,c:nCols-1}});
    curRow++;
    // Cabecera columnas
    const dayHdrs=dias.map(d=>{const dow=_dow(d);return{v:`${_fmt(d)}\n${DN[dow]}`,t:'s',s:{font:{bold:true,color:{rgb:dow===0?'DC2626':'FFFFFF'},sz:7},fill:{fgColor:{rgb:'334155'}},alignment:{horizontal:'center',vertical:'center',wrapText:true},border:BOR}};});
    wsData.push([S('NOMBRE',true,'334155','FFFFFF'),S('CARGO',true,'334155','FFFFFF'),...dayHdrs]);
    curRow++;
    // Filas de personas
    personas.forEach((p,i)=>{
      const bg=i%2===0?'F8FAFC':'FFFFFF';
      const dayCells=dias.map(d=>{
        const tipoBase=_rosterTipoPersona(d,cfg,p.id);
        const ovr=DB.rosterOvr.find(o=>+o.personalId===+p.id&&o.fecha===d);
        const t=ovr?ovr.tipo:tipoBase;
        const lbl=!t?'':t==='TD'?'TD':t==='TN'?'TN':'DL';
        const col=!t?'CBD5E1':t==='TD'?'059669':t==='TN'?'4338CA':'6B7280';
        const cb=!t?bg:t==='TD'?'D1FAE5':t==='TN'?'EDE9FE':'F1F5F9';
        return{v:lbl,t:'s',s:{font:{bold:!!t,color:{rgb:col},sz:7},fill:{fgColor:{rgb:cb}},alignment:{horizontal:'center',vertical:'center'},border:BOR}};
      });
      wsData.push([S(`${p.ape||''}, ${p.nom||''}`,false,bg,'0F172A'),S((p.cargo||'').toUpperCase().slice(0,22),false,bg,'334155'),...dayCells]);
      curRow++;
    });
    wsData.push(Array(nCols).fill(S('')));
    curRow++;
  });
  const ws=XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols']=[{wch:24},{wch:20},...dias.map(()=>({wch:5}))];
  ws['!merges']=merges;
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Roster');
  XLSX.writeFile(wb,`Roster_Guardias_${desde}_${hasta}.xlsx`);
  toast(`✓ Excel exportado · ${dias.length} días · ${personalActivo.filter(p=>p.guardia).length} personas`);
}

let _rosterCfgGrd=null;
function _rosterOpenCfg(guardia){
  _rosterCfgGrd=guardia;
  const modal=document.getElementById('rosterCfgModal');
  if(!modal)return;
  const cfg=_rosterGetCfg(guardia);
  document.getElementById('rosterCfgTitle').textContent=`⚙️ Configurar Guardia ${guardia}`;
  document.getElementById('rosterCfgFecha').value=cfg?.fechaInicio||today();
  const turno=cfg?.turno||'DIA';
  document.querySelectorAll('input[name="rosterCfgTurno"]').forEach(r=>r.checked=r.value===turno);
  modal.style.display='flex';
}
function _rosterCloseCfg(){
  const modal=document.getElementById('rosterCfgModal');
  if(modal)modal.style.display='none';
  _rosterCfgGrd=null;
}
function _rosterGuardarCfg(){
  if(!_rosterCfgGrd)return;
  const fecha=document.getElementById('rosterCfgFecha').value;
  if(!fecha){toast('Selecciona la fecha de inicio del ciclo',true);return;}
  const turno=document.querySelector('input[name="rosterCfgTurno"]:checked')?.value||'DIA';
  let cfg=(DB.rosterConfig||[]).find(r=>r.guardia===_rosterCfgGrd);
  if(cfg){
    cfg.fechaInicio=fecha;cfg.turno=turno;cfg.activo=true;
  } else {
    cfg={id:nid('rc'),guardia:_rosterCfgGrd,fechaInicio:fecha,turno,activo:true};
    DB.rosterConfig.push(cfg);
  }
  syncSheet('saveRosterConfig',cfg);
  const _turnoLabel=turno==='NOCHE'?'Turno Noche':turno==='MIXTO'?'Mixto 7D+7N':'Turno Día';
  toast(`✓ Guardia ${_rosterCfgGrd} configurada · ${_turnoLabel} · inicio ${_rosterFmt(fecha)}`);
  _rosterCloseCfg();
  rRoster();
}

// ── MULTI-SELECCIÓN DEL ROSTER ───────────────────────────────────────────────
let _rosterMultiMode=false, _rosterMultiSel=new Set();

function _rosterOpenCargoFilter(ev){
  if(_rosterCargoDropEl){_rosterCargoDropEl.remove();_rosterCargoDropEl=null;return;}
  const personalActivo=(DB.personal||[]).filter(p=>p.est==='Activo');
  const cargos=[...new Set(personalActivo.map(p=>(p.cargo||'Sin cargo').toUpperCase()))].sort();
  const div=document.createElement('div');
  div.style.cssText='position:fixed;z-index:99990;background:var(--panel);border:1px solid var(--border);border-radius:10px;padding:.4rem .35rem;box-shadow:0 8px 32px rgba(0,0,0,.55);width:270px;max-height:360px;overflow-y:auto;font-family:inherit';
  const allChecked=_rosterFiltroCargos.size===0;
  const countByCargo={};
  personalActivo.forEach(p=>{const k=(p.cargo||'Sin cargo').toUpperCase();countByCargo[k]=(countByCargo[k]||0)+1;});

  function _mkRow(id,label,cnt,checked,isAll){
    const row=document.createElement('div');
    row.style.cssText='display:flex;flex-direction:row;align-items:center;padding:.3rem .45rem;border-radius:6px;cursor:pointer;gap:0';
    if(!isAll)row.style.borderBottom='none';
    const cb=document.createElement('input');
    cb.type='checkbox';cb.checked=checked;
    cb.style.cssText='flex:0 0 15px;width:15px;height:15px;margin:0;padding:0;cursor:pointer;accent-color:#a855f7;vertical-align:middle';
    const lbl=document.createElement('span');
    lbl.textContent=label;
    lbl.style.cssText='flex:1;margin-left:9px;font-size:.72rem;font-weight:'+(checked&&!isAll?'700':'500')+';color:'+(checked&&!isAll?'#a855f7':'var(--text)')+';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.3';
    row.appendChild(cb);row.appendChild(lbl);
    if(cnt!==null){
      const badge=document.createElement('span');
      badge.textContent=cnt;
      badge.style.cssText='flex:0 0 auto;margin-left:6px;font-size:.62rem;color:var(--muted2);background:rgba(255,255,255,.08);border-radius:9px;padding:1px 7px;min-width:22px;text-align:center;line-height:1.4';
      row.appendChild(badge);
    }
    if(checked&&!isAll)row.style.background='rgba(168,85,247,.13)';
    row.onmouseenter=function(){if(!row.style.background.includes('168'))row.style.background='rgba(255,255,255,.05)';};
    row.onmouseleave=function(){if(!row.style.background.includes('168'))row.style.background='';};
    if(isAll){cb.onchange=function(){_rosterCargoToggleAll(cb.checked);};row.onclick=function(e){if(e.target!==cb)cb.click();};}
    else{cb.onchange=function(){_rosterCargoToggle(label,cb.checked);};row.onclick=function(e){if(e.target!==cb)cb.click();};}
    return row;
  }

  const header=document.createElement('div');
  header.style.cssText='padding:.15rem .1rem .35rem;border-bottom:1px solid var(--border);margin-bottom:.2rem';
  header.appendChild(_mkRow('all','Todos los cargos',null,allChecked,true));
  div.appendChild(header);
  cargos.forEach(c=>{div.appendChild(_mkRow(c,c,countByCargo[c]||0,_rosterFiltroCargos.has(c),false));});

  document.body.appendChild(div);
  _rosterCargoDropEl=div;
  const btn=document.getElementById('rosterCargoBtn');
  const r=btn?btn.getBoundingClientRect():{top:100,left:100,bottom:130};
  let top=r.bottom+4,left=r.left;
  if(left+275>window.innerWidth)left=window.innerWidth-280;
  if(top+370>window.innerHeight)top=r.top-375;
  div.style.top=top+'px';div.style.left=left+'px';
  setTimeout(()=>document.addEventListener('click',function h(e){if(!div.contains(e.target)&&e.target.id!=='rosterCargoBtn'){div.remove();_rosterCargoDropEl=null;document.removeEventListener('click',h);}},{capture:true,once:false}),50);
}
function _rosterCargoToggle(cargo,checked){
  if(checked)_rosterFiltroCargos.add(cargo);
  else _rosterFiltroCargos.delete(cargo);
  rRoster();
  // Mantener dropdown abierto tras re-render
  setTimeout(()=>_rosterOpenCargoFilter({target:document.getElementById('rosterCargoBtn')}),10);
}
function _rosterCargoToggleAll(checked){
  _rosterFiltroCargos.clear();
  if(_rosterCargoDropEl){_rosterCargoDropEl.remove();_rosterCargoDropEl=null;}
  rRoster();
}
function _rosterToggleMulti(){
  _rosterMultiMode=!_rosterMultiMode;
  _rosterMultiSel.clear();
  rRoster();
}
function _rosterMultiToggleCell(key,el){
  if(_rosterMultiSel.has(key)){_rosterMultiSel.delete(key);el.style.background='';el.style.outline='';}
  else{_rosterMultiSel.add(key);el.style.background='rgba(168,85,247,.45)';el.style.color='#fff';el.style.outline='2px solid #a855f7';el.style.outlineOffset='-2px';}
  const cnt=document.getElementById('rosterMultiCount');
  if(cnt)cnt.textContent=`${_rosterMultiSel.size} celda${_rosterMultiSel.size!==1?'s':''} seleccionada${_rosterMultiSel.size!==1?'s':''}`;
}
function _rosterMultiApply(tipo){
  if(!_rosterMultiSel.size)return;
  _rosterMultiSel.forEach(key=>{
    const [pid,fecha]=key.split('|');
    const personalId=+pid;
    let rec=DB.rosterOvr.find(o=>+o.personalId===personalId&&o.fecha===fecha);
    if(tipo==='RESET'){
      if(rec){DB.rosterOvr=DB.rosterOvr.filter(o=>o.id!==rec.id);supaDelete('rosterOvr',rec.id);}
    }else{
      if(rec){rec.tipo=tipo;}
      else{rec={id:nid('rovr'),personalId,fecha,tipo};DB.rosterOvr.push(rec);}
      syncSheet('saveRosterOvr',rec);
    }
  });
  _rosterMultiSel.clear();
  rRoster();
  toast(`✓ ${_rosterMultiSel.size||'Varios'} días actualizados`);
}

// ── OVERRIDE DE DÍAS DEL ROSTER ──────────────────────────────────────────────
let _rosterOvrEl=null;
function _rosterOvrPicker(personalId,fecha,ev){
  if(_rosterOvrEl){_rosterOvrEl.remove();_rosterOvrEl=null;}
  const ovr=DB.rosterOvr.find(o=>+o.personalId===+personalId&&o.fecha===fecha);
  const div=document.createElement('div');
  div.style.cssText='position:fixed;z-index:99999;background:var(--panel);border:1px solid var(--border);border-radius:8px;padding:.5rem .6rem;box-shadow:0 6px 24px rgba(0,0,0,.4);display:flex;flex-direction:column;gap:.35rem;min-width:130px;font-size:.72rem';
  div.innerHTML=`<div style="font-size:.6rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:.1rem">${fecha}</div>
    <button onclick="_rosterSaveOvr(${personalId},'${fecha}','TD')" style="background:rgba(16,185,129,.18);color:#10b981;border:none;border-radius:5px;padding:.3rem .5rem;cursor:pointer;font-weight:700;text-align:left">☀️ TD – Turno Día</button>
    <button onclick="_rosterSaveOvr(${personalId},'${fecha}','TN')" style="background:rgba(99,102,241,.18);color:#818cf8;border:none;border-radius:5px;padding:.3rem .5rem;cursor:pointer;font-weight:700;text-align:left">🌙 TN – Turno Noche</button>
    <button onclick="_rosterSaveOvr(${personalId},'${fecha}','DL')" style="background:rgba(239,68,68,.1);color:#64748b;border:none;border-radius:5px;padding:.3rem .5rem;cursor:pointer;font-weight:700;text-align:left">🔵 DL – Día Libre</button>
    ${ovr?`<button onclick="_rosterDelOvr(${personalId},'${fecha}')" style="background:rgba(245,158,11,.12);color:#f59e0b;border:1px solid rgba(245,158,11,.3);border-radius:5px;padding:.3rem .5rem;cursor:pointer;font-weight:700;text-align:left">↺ Restaurar ciclo</button>`:''}`;
  document.body.appendChild(div);
  _rosterOvrEl=div;
  const r=ev.target.getBoundingClientRect();
  let top=r.bottom+4,left=r.left;
  if(left+140>window.innerWidth)left=window.innerWidth-145;
  if(top+160>window.innerHeight)top=r.top-165;
  div.style.top=top+'px';div.style.left=left+'px';
  setTimeout(()=>document.addEventListener('click',function h(e){if(!div.contains(e.target)){div.remove();_rosterOvrEl=null;document.removeEventListener('click',h);}},{once:false}),10);
}
function _rosterSaveOvr(personalId,fecha,tipo){
  if(_rosterOvrEl){_rosterOvrEl.remove();_rosterOvrEl=null;}
  let rec=DB.rosterOvr.find(o=>+o.personalId===+personalId&&o.fecha===fecha);
  if(rec){rec.tipo=tipo;}
  else{rec={id:nid('rovr'),personalId,fecha,tipo};DB.rosterOvr.push(rec);}
  syncSheet('saveRosterOvr',rec);
  rRoster();
}
function _rosterDelOvr(personalId,fecha){
  if(_rosterOvrEl){_rosterOvrEl.remove();_rosterOvrEl=null;}
  const rec=DB.rosterOvr.find(o=>+o.personalId===+personalId&&o.fecha===fecha);
  if(!rec)return;
  DB.rosterOvr=DB.rosterOvr.filter(o=>o.id!==rec.id);
  supaDelete('rosterOvr',rec.id);
  rRoster();
}

