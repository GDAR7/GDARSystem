// ══ AUXILIOS MECÁNICOS ══
let _amTab=0,_amEditId=null;
function amGoTab(n){
  _amTab=n;
  [0,1,2,3].forEach(i=>{
    const t=document.getElementById('amTab'+i);
    if(t)t.classList.toggle('eq-tab-act',i===n);
    const p=document.getElementById('amP'+i);
    if(!p)return;
    if(i===n){p.style.display=i===3?'block':'grid';}else{p.style.display='none';}
  });
  const prev=document.getElementById('amBPrev'),next=document.getElementById('amBNext'),save=document.getElementById('amBSave');
  if(prev)prev.style.display=n>0?'':'none';
  if(next)next.style.display=n<3?'':'none';
  if(save)save.style.display=n===3?'':'none';
}
function amAddInsumo(){
  const tbody=document.getElementById('amInsumosBody');
  const ISS='background:var(--panel2);border:1px solid var(--border);border-radius:4px;padding:.25rem .4rem;color:var(--text);font-size:.73rem;width:100%';
  const tr=document.createElement('tr');
  tr.innerHTML=`<td><input style="${ISS}" placeholder="Descripción del ítem"></td>
    <td><input style="${ISS};width:85px" placeholder="M-001"></td>
    <td><input type="number" style="${ISS};width:65px" step="0.01" min="0" placeholder="0"></td>
    <td><input style="${ISS};width:60px" placeholder="und"></td>
    <td><select style="${ISS};width:95px"><option>Almacén</option><option>Campo</option></select></td>
    <td><button class="btn btn-del btn-sm" onclick="this.closest('tr').remove()" style="padding:.2rem .4rem">✕</button></td>`;
  tbody.appendChild(tr);
}
function amGetInsumos(){
  return[...document.getElementById('amInsumosBody').children].map(tr=>{
    const inp=tr.querySelectorAll('input,select');
    return{desc:inp[0].value.trim(),cod:inp[1].value.trim(),cant:+inp[2].value||0,und:inp[3].value.trim(),origen:inp[4].value};
  }).filter(r=>r.desc);
}
function rAuxMec(){
  const tots=DB.auxiliosMecanicos.length;
  const pen=DB.auxiliosMecanicos.filter(r=>r.est==='Pendiente').length;
  const proc=DB.auxiliosMecanicos.filter(r=>r.est==='En Proceso').length;
  const aten=DB.auxiliosMecanicos.filter(r=>r.est==='Atendido').length;
  document.getElementById('auxMecKpis').innerHTML=[
    {l:'Total Auxilios',v:tots,c:'#8b5cf6'},
    {l:'Pendientes',v:pen,c:'#ef4444'},
    {l:'En Proceso',v:proc,c:'#f59e0b'},
    {l:'Atendidos',v:aten,c:'#10b981'}
  ].map(k=>`<div class="kpi" style="--kc:${k.c}"><div class="kpi-lbl">${k.l}</div><div class="kpi-val">${k.v}</div></div>`).join('');
  document.getElementById('tbAuxMec').innerHTML=DB.auxiliosMecanicos.slice().reverse().map(r=>{
    const eq=DB.equipos.find(e=>e.id===r.eqId);
    const eqLabel=eq?`<span class="mono" style="font-size:.71rem;color:var(--mec)">${eq.codigo}</span> ${eq.nombre.split(' ').slice(0,2).join(' ')}`:'—';
    return`<tr>
      <td class="mono" style="color:var(--mec);font-size:.71rem">${r.cod||'—'}</td>
      <td class="mono">${r.fecha||'—'}</td>
      <td style="font-size:.8rem">${eqLabel}</td>
      <td class="mono tr" style="font-size:.78rem">${r.horometro!=null?fmtN(r.horometro)+' h':'—'}</td>
      <td><span class="badge b-purple" style="font-size:.64rem">${r.tipo||'—'}</span></td>
      <td style="font-size:.77rem;max-width:170px;white-space:normal">${r.desc||'—'}</td>
      <td style="font-size:.78rem">${r.mec||'—'}</td>
      <td class="mono tr">${r.tiempoParada!=null?fmtN(r.tiempoParada)+' h':'—'}</td>
      <td>${bge(r.est)}</td>
      <td><span class="mono" style="font-size:.72rem;color:#a78bfa">${eq?eq.proyecto||'—':'—'}</span></td>
      <td style="font-size:.72rem;color:var(--muted2)">${DB.auxMecInsumos.filter(i=>i.auxilioId===r.id).length||'—'}</td>
      <td style="display:flex;gap:.3rem;flex-wrap:nowrap">
        <button class="btn btn-out btn-sm" title="Ver detalle" onclick="verAuxMec(${r.id})" style="color:#3b82f6;border-color:#3b82f660">👁</button>
        ${r.est!=='Atendido'?`<button class="btn btn-out btn-sm" title="Editar" onclick="editAuxMec(${r.id})" style="color:#f59e0b;border-color:#f59e0b60">✏️</button>`:''}
        ${r.est!=='Atendido'?`<button class="btn btn-del btn-sm" onclick="del('auxiliosMecanicos',${r.id})">🗑</button>`:''}
      </td>
    </tr>`;
  }).join('');
}
function openAuxMec(){
  _amEditId=null;
  document.querySelector('#mAuxMec .mttl').textContent='🚨 Registrar Auxilio Mecánico';
  _amTab=0;amGoTab(0);
  const eqSel=document.getElementById('amEq');
  if(eqSel)eqSel.innerHTML='<option value="">— Seleccionar —</option>'+DB.equipos.map(e=>`<option value="${e.id}">${e.codigo} – ${e.nombre.split(' ').slice(0,3).join(' ')}</option>`).join('');
  const mecSel=document.getElementById('amMec');
  if(mecSel){const mecList=DB.personal.filter(p=>p.cat==='Mecánico'||(p.cargo||'').toLowerCase().includes('mecán'));
    mecSel.innerHTML='<option value="">— Seleccionar —</option>'+(mecList.length?mecList:DB.personal).map(p=>`<option>${p.ape}, ${p.nom}</option>`).join('');}
  const fSel=document.getElementById('amFrente');
  if(fSel)fSel.innerHTML='<option value="">— Seleccionar frente —</option>'+DB.frentesTrabajo.map(f=>`<option>${f.nombre}</option>`).join('');
  const yr=new Date().getFullYear();
  document.getElementById('amCod').value=`AUX-${yr}-${String(DB.auxiliosMecanicos.length+1).padStart(4,'0')}`;
  document.getElementById('amFecha').value=today();
  ['amHora','amOp','amHorometro','amDesc','amAccion','amParada','amObs','amNMec','amTrasladoDest','amSupervisor'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('amNMec').value='';
  document.getElementById('amTipo').value='Mecánico';
  document.getElementById('amTipoInt').value='Correctiva no planificada';
  document.getElementById('amCausaRaiz').value='';
  document.getElementById('amTraslado').value='No';
  document.getElementById('amTrasladoDiv').style.display='none';
  document.getElementById('amEst').value='Pendiente';
  document.getElementById('amConforme').checked=false;
  document.getElementById('amInsumosBody').innerHTML='';
  openM('mAuxMec');
}
function gAuxMec(){
  const eqId=+document.getElementById('amEq').value||null;
  const horometro=parseFloat(document.getElementById('amHorometro').value)||null;
  if(!eqId){toast('Seleccione un equipo (Tab Identificación)',true);amGoTab(0);return;}
  if(!horometro){toast('El horómetro/Km es obligatorio (Tab Identificación)',true);amGoTab(0);return;}
  if(!document.getElementById('amDesc').value.trim()){toast('Ingrese descripción del problema (Tab Diagnóstico)',true);amGoTab(1);return;}
  const rec={
    id:nid('auxMec'),
    cod:document.getElementById('amCod').value,
    fecha:document.getElementById('amFecha').value||today(),
    hora:document.getElementById('amHora').value||null,
    eqId,horometro,
    operador:document.getElementById('amOp').value.trim()||null,
    frente:document.getElementById('amFrente').value||null,
    tipo:document.getElementById('amTipo').value,
    tipoInt:document.getElementById('amTipoInt').value,
    desc:document.getElementById('amDesc').value.trim(),
    causaRaiz:document.getElementById('amCausaRaiz').value||null,
    mec:document.getElementById('amMec').value||null,
    ayudante:document.getElementById('amNMec').value.trim()||null,
    accion:document.getElementById('amAccion').value.trim()||null,
    tiempoParada:parseFloat(document.getElementById('amParada').value)||null,
    traslado:document.getElementById('amTraslado').value,
    trasladoDest:document.getElementById('amTrasladoDest').value.trim()||null,
    est:document.getElementById('amEst').value,
    supervisor:document.getElementById('amSupervisor').value.trim()||null,
    conforme:document.getElementById('amConforme').checked,
    obs:document.getElementById('amObs').value.trim()||null,
  };
  const _saveInsumos=(auxilioId)=>{
    amGetInsumos().forEach(ins=>{
      const insRec={id:nid('auxMecIns'),auxilioId,desc:ins.desc,cod:ins.cod||null,cant:ins.cant,und:ins.und||null,origen:ins.origen};
      DB.auxMecInsumos.push(insRec);
      syncSheet('saveAuxMecInsumo',insRec);
    });
  };
  if(_amEditId!==null){
    // EDITAR: actualizar registro existente
    const idx=DB.auxiliosMecanicos.findIndex(x=>x.id===_amEditId);
    if(idx>-1){DB.auxiliosMecanicos[idx]={...DB.auxiliosMecanicos[idx],...rec,id:_amEditId};syncSheet('saveAuxMec',DB.auxiliosMecanicos[idx]);}
    // Reemplazar insumos: borrar los viejos e insertar nuevos
    const viejosIds=DB.auxMecInsumos.filter(i=>i.auxilioId===_amEditId).map(i=>i.id);
    DB.auxMecInsumos=DB.auxMecInsumos.filter(i=>i.auxilioId!==_amEditId);
    viejosIds.forEach(vid=>supaDelete('auxMecInsumos',vid));
    _saveInsumos(_amEditId);
    _amEditId=null;
    closeM('mAuxMec');rAuxMec();toast('Auxilio actualizado: '+rec.cod);
  }else{
    // CREAR: nuevo registro
    DB.auxiliosMecanicos.push(rec);
    syncSheet('saveAuxMec',rec);
    _saveInsumos(rec.id);
    closeM('mAuxMec');rAuxMec();toast('Auxilio registrado: '+rec.cod);
  }
}

function editAuxMec(id){
  const r=DB.auxiliosMecanicos.find(x=>x.id===id);if(!r)return;
  _amEditId=id;
  openAuxMec();
  // Sobreescribir código y modo
  document.getElementById('amCod').value=r.cod||'';
  document.querySelector('#mAuxMec .mttl').textContent='✏️ Editar Auxilio: '+r.cod;
  // Tab 0
  const eqSel=document.getElementById('amEq');if(eqSel&&r.eqId)eqSel.value=r.eqId;
  document.getElementById('amFecha').value=r.fecha||'';
  document.getElementById('amHora').value=r.hora||'';
  document.getElementById('amHorometro').value=r.horometro||'';
  document.getElementById('amOp').value=r.operador||'';
  const fSel=document.getElementById('amFrente');if(fSel)fSel.value=r.frente||'';
  // Tab 1
  document.getElementById('amTipo').value=r.tipo||'Mecánico';
  document.getElementById('amTipoInt').value=r.tipoInt||'Correctiva no planificada';
  document.getElementById('amDesc').value=r.desc||'';
  document.getElementById('amCausaRaiz').value=r.causaRaiz||'';
  // Tab 2
  const mecSel=document.getElementById('amMec');if(mecSel)mecSel.value=r.mec||'';
  document.getElementById('amNMec').value=r.ayudante||'';
  document.getElementById('amAccion').value=r.accion||'';
  document.getElementById('amParada').value=r.tiempoParada||'';
  document.getElementById('amTraslado').value=r.traslado||'No';
  document.getElementById('amTrasladoDiv').style.display=r.traslado==='Sí'?'':'none';
  document.getElementById('amTrasladoDest').value=r.trasladoDest||'';
  document.getElementById('amEst').value=r.est||'Pendiente';
  // Tab 3 — insumos
  document.getElementById('amInsumosBody').innerHTML='';
  DB.auxMecInsumos.filter(i=>i.auxilioId===id).forEach(ins=>{
    document.getElementById('amInsumosBody').appendChild((()=>{
      const ISS='background:var(--panel2);border:1px solid var(--border);border-radius:4px;padding:.25rem .4rem;color:var(--text);font-size:.73rem;width:100%';
      const tr=document.createElement('tr');
      tr.innerHTML=`<td><input style="${ISS}" value="${ins.desc||''}"></td>
        <td><input style="${ISS};width:85px" value="${ins.cod||''}"></td>
        <td><input type="number" style="${ISS};width:65px" step="0.01" min="0" value="${ins.cant||0}"></td>
        <td><input style="${ISS};width:60px" value="${ins.und||''}"></td>
        <td><select style="${ISS};width:95px"><option${ins.origen==='Almacén'?' selected':''}>Almacén</option><option${ins.origen==='Campo'?' selected':''}>Campo</option></select></td>
        <td><button class="btn btn-del btn-sm" onclick="this.closest('tr').remove()" style="padding:.2rem .4rem">✕</button></td>`;
      return tr;
    })());
  });
  document.getElementById('amSupervisor').value=r.supervisor||'';
  document.getElementById('amConforme').checked=!!r.conforme;
  document.getElementById('amObs').value=r.obs||'';
}
function verAuxMec(id){
  const r=DB.auxiliosMecanicos.find(x=>x.id===id);if(!r)return;
  const eq=DB.equipos.find(e=>e.id===r.eqId);
  const ins=DB.auxMecInsumos.filter(i=>i.auxilioId===id);
  const row=(l,v)=>`<div style="display:flex;gap:.5rem;padding:.3rem 0;border-bottom:1px solid var(--border)"><span style="color:var(--muted2);min-width:160px;font-size:.75rem">${l}</span><span style="font-weight:500">${v||'—'}</span></div>`;
  const sec=(t)=>`<div style="background:var(--mec);color:#fff;font-size:.7rem;font-weight:700;padding:.25rem .6rem;border-radius:4px;margin:.7rem 0 .3rem;letter-spacing:.05em">${t}</div>`;
  document.getElementById('auxVerTtl').textContent='🔍 '+r.cod;
  document.getElementById('auxVerBody').innerHTML=`
    ${sec('IDENTIFICACIÓN')}
    ${row('Código',r.cod)}${row('Fecha',r.fecha)}${row('Hora',r.hora)}
    ${row('Equipo',eq?eq.codigo+' – '+eq.nombre:r.eqId)}
    ${row('Horómetro/Km',r.horometro!=null?fmtN(r.horometro)+' h':'—')}
    ${row('Operador',r.operador)}${row('Frente',r.frente)}
    ${sec('DIAGNÓSTICO')}
    ${row('Tipo de Falla',r.tipo)}${row('Tipo de Intervención',r.tipoInt)}
    ${row('Descripción',r.desc)}${row('Causa Raíz',r.causaRaiz)}
    ${sec('ATENCIÓN')}
    ${row('Mecánico',r.mec)}${row('Ayudante',r.ayudante)}
    ${row('Acciones',r.accion)}
    ${row('T. Parada',r.tiempoParada!=null?fmtN(r.tiempoParada)+' h':'—')}
    ${row('Traslado',r.traslado+(r.trasladoDest?' → '+r.trasladoDest:''))}
    ${row('Estado',r.est)}
    ${sec('INSUMOS Y REPUESTOS')}
    ${ins.length?`<table style="width:100%;font-size:.75rem;border-collapse:collapse;margin-top:.3rem">
      <thead><tr style="color:var(--muted2)"><th style="text-align:left;padding:.2rem .4rem">Descripción</th><th>Cód.</th><th>Cant.</th><th>Und.</th><th>Origen</th></tr></thead>
      <tbody>${ins.map(i=>`<tr style="border-top:1px solid var(--border)"><td style="padding:.25rem .4rem">${i.desc}</td><td class="mono">${i.cod||'—'}</td><td class="mono tr">${i.cant}</td><td>${i.und||'—'}</td><td style="font-size:.7rem">${i.origen}</td></tr>`).join('')}</tbody>
    </table>`:'<span style="color:var(--muted);font-size:.78rem">Sin insumos registrados</span>'}
    ${sec('CIERRE')}
    ${row('Supervisor',r.supervisor)}
    ${row('Operador conforme',r.conforme?'✅ Sí':'❌ No')}
    ${row('Observaciones',r.obs)}
  `;
  openM('mAuxMecVer');
}

// ══ PLANNER ══
function rPlanner(){
  const tot=DB.planner.length,done=DB.planner.filter(p=>p.est==='Completado').length,cursos=DB.planner.filter(p=>p.est==='En Curso').length;
  document.getElementById('plannerKpis').innerHTML=[{l:'Total',v:tot,c:'var(--ctl)'},{l:'En Curso',v:cursos,c:'#f59e0b'},{l:'Completadas',v:done,c:'#10b981'},{l:'Avance Prom.',v:tot?Math.round(DB.planner.reduce((a,x)=>a+x.av,0)/tot)+'%':'0%',c:'#3b82f6'}].map(k=>`<div class="kpi" style="--kc:${k.c}"><div class="kpi-lbl">${k.l}</div><div class="kpi-val">${k.v}</div></div>`).join('');
  document.getElementById('tbPlanner').innerHTML=DB.planner.map(a=>`<tr>
    <td class="mono" style="color:var(--ctl)">${a.cod}</td><td><strong>${a.nom}</strong></td><td>${a.resp}</td>
    <td class="mono">${a.ini}</td><td class="mono">${a.fin}</td>
    <td><div style="display:flex;align-items:center;gap:.4rem;min-width:90px"><div class="prog-wrap" style="flex:1"><div class="prog-bar" style="width:${a.av}%;background:${a.av>=80?'var(--ctl)':a.av>=40?'var(--ope)':'var(--seg)'}"></div></div><span class="mono" style="font-size:.7rem;color:var(--muted2)">${a.av}%</span></div></td>
    <td>${bge(a.est)}</td>
    <td><button class="btn btn-del btn-sm" onclick="del('planner',${a.id})">🗑</button></td>
  </tr>`).join('');
}
function gAct(){const nom=document.getElementById('acNom').value.trim();if(!nom){toast('Ingrese nombre',true);return;}DB.planner.push({id:nid('plan'),cod:document.getElementById('acCod').value||'ACT-'+String(DB.planner.length+1).padStart(3,'0'),nom,resp:document.getElementById('acRe').value,ini:document.getElementById('acFi').value,fin:document.getElementById('acFf').value,av:+document.getElementById('acAv').value||0,est:document.getElementById('acEs').value});closeM('mAct');rPlanner();toast('Actividad registrada');}

// ══ CONTROL EQUIPOS POR LÍNEA ══
const lineaMap={'Línea Amarilla':'lineaAmarilla','Línea Blanca':'lineaBlanca','Vehículo Menor':'vehiculosMenores','Equipos Menores':'equiposMenores'};
let currentReporteTipo='Línea Amarilla';
let _editingParteId=null;

// ── ESTADO FORMULARIO PARTE ──
let parteState = { turno:'DIA', guardia:'A', viajeCount:0, tipo:'' };
let _laSort = {col:'fecha', dir:'desc'};
function _laSortBy(col){
  _laSort.dir = _laSort.col===col ? (_laSort.dir==='asc'?'desc':'asc') : 'desc';
  _laSort.col = col;
  rLinea('Línea Amarilla');
}
let _lbSort = {col:'fecha', dir:'desc'};
function _lbSortBy(col){
  _lbSort.dir = _lbSort.col===col ? (_lbSort.dir==='asc'?'desc':'asc') : 'desc';
  _lbSort.col = col;
  rLinea('Línea Blanca');
}

function switchTab(n){
  document.getElementById('tabContent1').style.display = n===1?'block':'none';
  document.getElementById('tabContent2').style.display = n===2?'block':'none';
  document.getElementById('tab1').classList.toggle('active', n===1);
  document.getElementById('tab2').classList.toggle('active', n===2);
}

function setToggle(grupo, val){
  parteState[grupo] = val;
  if(grupo==='turno'){
    ['DIA','NOCHE'].forEach(v => document.getElementById('t'+v).classList.toggle('active', v===val));
  } else {
    ['A','B','C'].forEach(v => document.getElementById('g'+v).classList.toggle('active', v===val));
  }
}

function filtrarEquipos(){
  const sub = document.getElementById('rpTipo').value;
  parteState.tipo = sub;
  const sel = document.getElementById('rpCodigo');
  const linea = currentReporteTipo;
  const eq = DB.equipos.filter(e=>e.tipo===linea&&(!sub||e.sub===sub)&&!(linea==='Vehículo Menor'&&(e.sub||'').toLowerCase().includes('luminaria')));
  sel.innerHTML = '<option value="">— Seleccionar —</option>' +
    eq.map(e=>`<option value="${e.id}">${e.codigo} – ${e.nombre}</option>`).join('');
  const tabV = document.getElementById('tab2');
  if(tabV) tabV.style.display = (currentReporteTipo==='Línea Blanca' || sub.toUpperCase()==='VOLQUETE') ? 'block' : 'none';
  // Filtrar operadores por cargo según subtipo (LA, LB, VM)
  const _catFiltro={'Línea Amarilla':'Operador LA','Línea Blanca':'Operador LB'};
  const opEl=document.getElementById('rpOperador');
  if(opEl){
    let ops;
    if(linea==='Vehículo Menor'){
      ops=sub
        ? DB.personal.filter(p=>p.est==='Activo'&&p.cargo.toLowerCase().includes(sub.toLowerCase()))
        : DB.personal.filter(p=>p.est==='Activo');
    }else if(linea==='Línea Amarilla'||linea==='Línea Blanca'){
      const cat=_catFiltro[linea];
      ops=DB.personal.filter(p=>p.est==='Activo'&&p.cat===cat&&(!sub||p.cargo.toLowerCase().includes(sub.toLowerCase())));
      if(!ops.length) ops=DB.personal.filter(p=>p.est==='Activo'&&p.cat===cat);
    }
    if(ops) opEl.innerHTML=ops.map(p=>`<option>${p.ape}, ${p.nom}</option>`).join('');
  }
}

function autoFillEquipo(){
  const id = +document.getElementById('rpCodigo').value;
  const eq = DB.equipos.find(e=>e.id===id);
  if(eq && eq.hr) document.getElementById('rpHrIni').value = eq.hr;
  _checkStandby();
}

function _checkStandby(){
  const cond=document.getElementById('rpCondicion')?.value||'';
  const eqId=+document.getElementById('rpCodigo').value;
  if(!eqId){calcHoras();return;}

  // Obtener último hrFin y kmFin registrados para este equipo
  const partesEq=DB.partes.filter(p=>p.eqId===eqId&&+p.hrFin>0);
  let lastHr=partesEq.length?Math.max(...partesEq.map(p=>+p.hrFin||0)):0;
  if(!lastHr){const eq=DB.equipos.find(e=>e.id===eqId);lastHr=+eq?.hr||0;}

  const _esKm=['Línea Blanca','Vehículo Menor'].includes(currentReporteTipo);
  const partesKm=_esKm?DB.partes.filter(p=>p.eqId===eqId&&+p.kmFin>0):[];
  let lastKm=partesKm.length?Math.max(...partesKm.map(p=>+p.kmFin||0)):0;

  if(cond==='OPERATIVO (TRABAJADO)'){
    // hrIni = último hrFin; hrFin vacío para que el usuario lo ingrese
    if(lastHr>0) document.getElementById('rpHrIni').value=lastHr;
    document.getElementById('rpHrFin').value='';
    document.getElementById('rpHrsTrab').value=0;
    if(_esKm){
      const ini=document.getElementById('rpKmIni');
      const fin=document.getElementById('rpKmFin');
      if(ini&&lastKm>0) ini.value=lastKm;
      if(fin) fin.value='';
      const kr=document.getElementById('rpKmRec');if(kr) kr.value=0;
    }
  }else if(cond==='OPERATIVO (STANDBY)'){
    // hrIni = hrFin = último valor (no hay movimiento)
    if(lastHr>0){
      document.getElementById('rpHrIni').value=lastHr;
      document.getElementById('rpHrFin').value=lastHr;
    }
    if(_esKm){
      const ini=document.getElementById('rpKmIni');
      const fin=document.getElementById('rpKmFin');
      if(ini&&lastKm>0) ini.value=lastKm;
      if(fin&&lastKm>0){fin.value=lastKm;calcKm();}
    }
  }
  calcHoras();
}

function filtrarFrentes(){
  const sel = document.getElementById('rpFrente');
  const fromDB=DB.frentesTrabajo.map(f=>f.nombre).filter(Boolean);
  const fromPartes=[...new Set(DB.partes.map(p=>p.frenteT).filter(Boolean))];
  const todos=[...new Set([...fromDB,...fromPartes])].sort();
  sel.innerHTML='<option value="">— Seleccionar —</option>'+todos.map(f=>`<option>${f}</option>`).join('');
}

function calcHoras(){
  const ini = +document.getElementById('rpHrIni').value||0;
  const fin = +document.getElementById('rpHrFin').value||0;
  const diff = fin > ini ? parseFloat((fin-ini).toFixed(1)) : 0;
  document.getElementById('rpHrsTrab').value = diff;
  const cond = document.getElementById('rpCondicion')?.value||'';
  if(cond==='OPERATIVO/INOPERATIVO'){
    const inop = parseFloat(Math.max(0,10-diff).toFixed(1));
    document.getElementById('rpHrsInop').value = inop;
  }
}

function calcKm(){
  const ini = +document.getElementById('rpKmIni').value||0;
  const fin = +document.getElementById('rpKmFin').value||0;
  const diff = fin > ini ? fin-ini : 0;
  document.getElementById('rpKmRec').value = diff;
}

let viajeCount = 0;
function addViaje(){
  viajeCount++;
  const nombres = ['PRIMER','SEGUNDO','TERCER','CUARTO','QUINTO'];
  const n = Math.min(viajeCount, 5);
  const c = document.getElementById('viajesContainer');
  const div = document.createElement('div');
  div.className = 'viaje-block';
  div.id = 'viaje-'+viajeCount;
  const _ftOpts=DB.frentesTrabajo.map(f=>`<option value="${f.nombre}">`).join('');
  const _matOpts=DB.tipoMaterial.map(m=>`<option value="${m.nombre}">`).join('');
  div.innerHTML = `<div class="viaje-title">${nombres[n-1]} TRANSPORTE</div>
    <div class="fg-grid" style="grid-template-columns:1fr 1fr 1fr 1fr">
      <div class="fg"><label>Origen</label>
        <input id="vOrigen${viajeCount}" list="frentesData${viajeCount}a" placeholder="Punto de origen...">
        <datalist id="frentesData${viajeCount}a">${_ftOpts}</datalist>
      </div>
      <div class="fg"><label>Destino</label>
        <input id="vDestino${viajeCount}" list="frentesData${viajeCount}b" placeholder="Punto de destino...">
        <datalist id="frentesData${viajeCount}b">${_ftOpts}</datalist>
      </div>
      <div class="fg"><label>Cantidad</label><input id="vCant${viajeCount}" type="number" placeholder="0"></div>
      <div class="fg"><label>Material</label>
        <input id="vMat${viajeCount}" list="matData${viajeCount}" placeholder="Tipo de material">
        <datalist id="matData${viajeCount}">${_matOpts}</datalist>
      </div>
    </div>`;
  c.appendChild(div);
}

function openReporte(tipo){
  currentReporteTipo = tipo;
  _editingParteId = null;
  document.getElementById('mRepTtl').textContent = '📋 Parte Diario – '+tipo;
  parteState.tipo = tipo;
  viajeCount = 0;
  document.getElementById('viajesContainer').innerHTML = '';
  // Equipos de esta línea (excluye luminarias de Vehículo Menor)
  const _isLumRP=e=>(e.sub||'').toLowerCase().includes('luminaria');
  const eqsLinea = DB.equipos.filter(e=>e.tipo===tipo&&!(tipo==='Vehículo Menor'&&_isLumRP(e)));
  // Poblar rpTipo con subtipos únicos de esta línea (e.sub)
  const tipoSel = document.getElementById('rpTipo');
  const subs = [...new Set(eqsLinea.map(e=>e.sub).filter(Boolean))].sort();
  tipoSel.innerHTML = '<option value="">— Seleccionar —</option>' + subs.map(s=>`<option>${s}</option>`).join('');
  // Poblar equipos (todos de esta línea inicialmente)
  const selEq = document.getElementById('rpCodigo');
  selEq.innerHTML = '<option value="">— Seleccionar —</option>' + eqsLinea.map(e=>`<option value="${e.id}">${e.codigo} – ${e.nombre}</option>`).join('');
  // Poblar áreas
  const areas = [...new Set(DB.partes.map(p=>p.areaT).filter(Boolean))];
  if(areas.length === 0) areas.push('R3','NINGUNO');
  document.getElementById('rpArea').innerHTML = '<option value="">— Seleccionar —</option>' + areas.map(a=>`<option>${a}</option>`).join('');
  // Operadores filtrados por categoría según línea
  const _catOp={'Línea Amarilla':'Operador LA','Línea Blanca':'Operador LB'};
  const _catFiltro=_catOp[tipo];
  const _opList=DB.personal.filter(p=>p.est==='Activo'&&(!_catFiltro||p.cat===_catFiltro));
  document.getElementById('rpOperador').innerHTML=_opList.map(p=>`<option>${p.ape}, ${p.nom}</option>`).join('');
  // Horómetros: ocultar en Vehículo Menor
  const hrSec=document.getElementById('rpHrSection');
  const hrTit=document.getElementById('rpHorTitle');
  const _isVM=tipo==='Vehículo Menor';
  if(hrSec) hrSec.style.display=_isVM?'none':'contents';
  if(hrTit) hrTit.style.display=_isVM?'none':'';
  // Km solo visible en Línea Blanca y Vehículos Menores
  const kmSec=document.getElementById('rpKmSection');
  if(kmSec) kmSec.style.display=(['Línea Blanca','Vehículo Menor'].includes(tipo))?'contents':'none';
  // Tab viajes
  const tabV = document.getElementById('tab2');
  if(tabV) tabV.style.display = tipo==='Línea Blanca'||tipo==='VOLQUETE' ? 'block' : 'none';
  const btnG=document.getElementById('btnGuardarRP');
  if(btnG) btnG.style.display='';
  setToggle('turno','DIA');
  setToggle('guardia','A');
  // Limpiar todos los campos del formulario
  document.getElementById('rpFecha').value=new Date().toISOString().split('T')[0];
  document.getElementById('rpTipo').value='';
  document.getElementById('rpCodigo').value='';
  document.getElementById('rpHrIni').value='';
  document.getElementById('rpHrFin').value='';
  document.getElementById('rpHrsTrab').value=0;
  document.getElementById('rpHrsInop').value='';
  document.getElementById('rpDescuentos').value='';
  document.getElementById('rpDescripcion').value='';
  const _ki=document.getElementById('rpKmIni'),_kf=document.getElementById('rpKmFin'),_kr=document.getElementById('rpKmRec');
  if(_ki)_ki.value='';if(_kf)_kf.value='';if(_kr)_kr.value=0;
  switchTab(1);
  openM('mReporte');
}
async function delParte(id){
  const p=DB.partes.find(x=>x.id===id);
  if(!p){toast('Parte no encontrado',true);return;}
  // Validación 48 horas
  const created=p.createdAt?new Date(p.createdAt):null;
  if(!created||isNaN(created.getTime())){toast('No se puede eliminar: fecha de registro desconocida',true);return;}
  const diffHs=(Date.now()-created.getTime())/3600000;
  if(diffHs>48){toast(`⛔ Eliminación bloqueada: el parte fue registrado hace ${Math.round(diffHs)} horas (límite 48 h)`,true);return;}
  const eq=DB.equipos.find(x=>x.id===p.eqId);
  const label=`${p.fecha} – ${eq?eq.codigo:'equipo #'+p.eqId}`;
  if(!confirm(`¿Eliminar el parte del ${label}?\n\nEsta acción no se puede deshacer.`))return;
  toast('Eliminando...');
  await supaDelete('partes',id);
  DB.partes=DB.partes.filter(x=>x.id!==id);
  rLinea(currentReporteTipo);
  toast('✓ Parte eliminado');
}

function editParte(id){
  const p=DB.partes.find(x=>x.id===id);
  if(!p){toast('Parte no encontrado',true);return;}
  const eq=DB.equipos.find(x=>x.id===p.eqId);
  if(!eq){toast('Equipo no encontrado',true);return;}
  openReporte(eq.tipo);
  _editingParteId=id;
  document.getElementById('mRepTtl').textContent='📋 Editar Parte – '+eq.tipo;
  // Tipo/subtipo y equipo
  const rpTipo=document.getElementById('rpTipo');
  if(rpTipo){rpTipo.value=eq.sub||'';filtrarEquipos();}
  const rpCodigo=document.getElementById('rpCodigo');
  if(rpCodigo){rpCodigo.value=eq.id;autoFillEquipo();}
  // Campos básicos
  document.getElementById('rpFecha').value=p.fecha;
  document.getElementById('rpOperador').value=p.op||'';
  setToggle('turno',p.turno||'DIA');
  setToggle('guardia',p.guardia||'A');
  const rpCond=document.getElementById('rpCondicion');
  if(rpCond)rpCond.value=p.condicion||'OPERATIVO';
  document.getElementById('rpHrIni').value=p.hrIni||0;
  document.getElementById('rpHrFin').value=p.hrFin||0;
  calcHoras();
  const rpKmIni=document.getElementById('rpKmIni');
  const rpKmFin=document.getElementById('rpKmFin');
  if(rpKmIni)rpKmIni.value=p.kmIni||0;
  if(rpKmFin){rpKmFin.value=p.kmFin||0;calcKm();}
  document.getElementById('rpDescuentos').value=p.descuentos||0;
  document.getElementById('rpHrsInop').value=p.im||0;
  const rpArea=document.getElementById('rpArea');
  if(rpArea)rpArea.value=p.areaT||'';
  const rpFrente=document.getElementById('rpFrente');
  if(rpFrente)rpFrente.value=p.frenteT||'';
  document.getElementById('rpDescripcion').value=p.act||'';
  document.getElementById('rpObservaciones').value=p.observaciones||'';
  const rpConc=document.getElementById('rpConclusion');
  if(rpConc)rpConc.value=p.conclusion||'';
  const rpNV=document.getElementById('rpNViajes');
  if(rpNV)rpNV.value=p.nViajes||0;
  const rpTT=document.getElementById('rpTiempoTrans');
  if(rpTT)rpTT.value=p.tiempoTrans||'';
  // Viajes
  if(p.viajes&&p.viajes.length){
    p.viajes.forEach(v=>{
      addViaje();
      document.getElementById('vOrigen'+viajeCount).value=v.origen||'';
      document.getElementById('vDestino'+viajeCount).value=v.destino||'';
      document.getElementById('vCant'+viajeCount).value=v.cant||0;
      document.getElementById('vMat'+viajeCount).value=v.material||'';
    });
  }
}

//REPORTE DE TRABAJO
async function gReporte(){
  const eqId  = +document.getElementById('rpCodigo').value;
  const fecha = document.getElementById('rpFecha').value;
  if(!eqId||!fecha){ toast('Seleccione equipo y fecha',true); return; }

  const eq = DB.equipos.find(e=>e.id===eqId);

  // VIAJES
  const viajes=[];
  for(let i=1;i<=viajeCount;i++){
    viajes.push({
      origen:   document.getElementById('vOrigen'+i)?.value||'',
      destino:  document.getElementById('vDestino'+i)?.value||'',
      cant:    +document.getElementById('vCant'+i)?.value||0,
      material: document.getElementById('vMat'+i)?.value||''
    });
  }

  const parte = {
    tipoEquipo:    document.getElementById('rpTipo').value,
    codigoEquipo:  eq ? eq.codigo+' – '+eq.nombre : '',
    operador:      document.getElementById('rpOperador').value,
    fecha,
    turno:         parteState.turno,
    guardia:       parteState.guardia,
    condicion:     document.getElementById('rpCondicion').value,
    hrIni:        +document.getElementById('rpHrIni').value||0,
    hrFin:        +document.getElementById('rpHrFin').value||0,
    kmIni:        +document.getElementById('rpKmIni').value||0,
    kmFin:        +document.getElementById('rpKmFin').value||0,
    descuentos:   +document.getElementById('rpDescuentos').value||0,
    hrsInop:      +document.getElementById('rpHrsInop').value||0,
    areaT:         document.getElementById('rpArea').value,
    frenteT:       document.getElementById('rpFrente').value,
    actividades:   document.getElementById('rpDescripcion').value,
    observaciones: document.getElementById('rpObservaciones').value,
    nViajes:      +document.getElementById('rpNViajes').value||0,
    tiempoTrans:   document.getElementById('rpTiempoTrans').value,
    conclusion:    document.getElementById('rpConclusion').value,
    colaborador:   CU.nombre,
    viajes
  };

  toast('Guardando en data...');

  const parteDB = {
    fecha:        parte.fecha,
    eq_id:        eqId,
    op:           parte.operador,
    ef:           parseFloat((parte.hrFin - parte.hrIni).toFixed(2)),
    im:           parte.hrsInop,
    comb:         0,
    act:          parte.actividades,
    tipo_equipo:  parte.tipoEquipo,
    turno:        parte.turno,
    guardia:      parte.guardia,
    condicion:    parte.condicion,
    hr_ini:       parte.hrIni,
    hr_fin:       parte.hrFin,
    km_ini:       parte.kmIni||null,
    km_fin:       parte.kmFin||null,
    km_rec:       parte.kmFin>parte.kmIni?parte.kmFin-parte.kmIni:null,
    descuentos:   parte.descuentos||null,
    area_t:       parte.areaT||null,
    frente_t:     parte.frenteT||null,
    observaciones:parte.observaciones||null,
    n_viajes:     parte.nViajes||null,
    tiempo_trans: parte.tiempoTrans||null,
    conclusion:   parte.conclusion||null,
    colaborador:  parte.colaborador||null,
    viajes:       viajes.length?viajes:null,
    created_at:   new Date().toISOString()
  };
  let parteId;
  const _wasEdit=!!_editingParteId;
  if(_editingParteId){
    // ACTUALIZAR parte existente
    const {error:updErr}=await supa.from('partes').update(parteDB).eq('id',_editingParteId);
    if(updErr){alert('Error Supabase:\n'+updErr.message);toast('Error: '+updErr.message,true);return;}
    parteId=_editingParteId;
    const idx=DB.partes.findIndex(x=>x.id===parteId);
    if(idx>=0)DB.partes[idx]={...DB.partes[idx],...parte,id:parteId,ef:parseFloat((parte.hrFin-parte.hrIni).toFixed(2)),im:parte.hrsInop,comb:0,act:parte.actividades,eqId};
    _editingParteId=null;
  } else {
    // INSERTAR parte nuevo
    console.log('[Partes] Enviando a Supabase:', parteDB);
    const {data:parteRet,error:parteErr}=await supa.from('partes').insert(parteDB).select('id').single();
    console.log('[Partes] Respuesta:', parteRet, parteErr);
    if(parteErr){alert('Error Supabase:\n'+parteErr.message+'\n\nCódigo: '+parteErr.code);toast('Error: '+parteErr.message,true);return;}
    parteId=parteRet.id;
    // Actualizar horómetro local
    if(eq && parte.hrFin > eq.hr) eq.hr = parte.hrFin;
    DB.partes.push({...parte,id:parteId,ef:parseFloat((parte.hrFin-parte.hrIni).toFixed(2)),im:parte.hrsInop,comb:0,act:parte.actividades,eqId});
  }

  closeM('mReporte');
  viajeCount = 0;
  document.getElementById('viajesContainer').innerHTML='';

  const pg = lineaMap[currentReporteTipo];
  if(pg) renderPage(pg); else renderPage(AP);

  toast('✓ Parte #'+parteId+' '+(_wasEdit?'actualizado':'guardado'));
}
function rLinea(tipo){
  const _isLum=e=>(e.sub||'').toLowerCase().includes('luminaria');
  let eqs;
  if(tipo==='Vehículo Menor')       eqs=DB.equipos.filter(e=>e.tipo===tipo&&!_isLum(e));
  else if(tipo==='Equipos Menores') eqs=DB.equipos.filter(e=>e.tipo===tipo||(e.tipo==='Vehículo Menor'&&_isLum(e)));
  else                              eqs=DB.equipos.filter(e=>e.tipo===tipo);
  const partes=DB.partes.filter(p=>eqs.some(e=>e.id===p.eqId));
  // map to right tbodies
  const tbMap={'Línea Amarilla':'tbLA','Línea Blanca':'tbLB','Vehículo Menor':'tbVM','Equipos Menores':'tbEC'};
  const tbPMap={'Línea Amarilla':'tbPartesLA','Línea Blanca':'tbPartesLB','Vehículo Menor':'tbSalidasVM'};
  const tb=document.getElementById(tbMap[tipo]);
  if(!tb)return;
  if(tipo==='Línea Amarilla'){
    tb.innerHTML=eqs.map(e=>`<tr><td class="mono" style="color:var(--ceq)">${e.codigo}</td><td><strong>${e.nombre}</strong></td><td><span class="badge b-cyan">${e.sub||'—'}</span></td><td>${bge(e.est)}</td><td class="mono">${fmtN(e.hr)} h</td><td class="mono">${e.ultMant||'—'}</td><td class="mono">${e.proxMant||'—'}</td></tr>`).join('');
    // Filtros
    const _fTipo=document.getElementById('laFiltTipo');
    const _fDesde=document.getElementById('laFiltDesde');
    const _fHasta=document.getElementById('laFiltHasta');
    // Poblar combobox de tipos
    if(_fTipo){
      const curT=_fTipo.value;
      const subs=[...new Set(eqs.map(e=>e.sub).filter(Boolean))].sort();
      _fTipo.innerHTML='<option value="">— Todos los tipos —</option>'+subs.map(s=>`<option${s===curT?' selected':''}>${s}</option>`).join('');
    }
    const fTipo=_fTipo?_fTipo.value:'';
    const fDesde=_fDesde?_fDesde.value:'';
    const fHasta=_fHasta?_fHasta.value:'';
    // Aplicar filtros
    let partesF=partes;
    if(fTipo)partesF=partesF.filter(p=>{const eq=DB.equipos.find(e=>e.id===p.eqId);return eq&&eq.sub===fTipo;});
    if(fDesde)partesF=partesF.filter(p=>p.fecha>=fDesde);
    if(fHasta)partesF=partesF.filter(p=>p.fecha<=fHasta);
    // KPIs
    const _totEf=partesF.reduce((s,p)=>s+(+p.ef||0),0);
    const _totIm=partesF.reduce((s,p)=>s+(+p.im||0),0);
    const _byTipo={};
    partesF.forEach(p=>{const eq=DB.equipos.find(e=>e.id===p.eqId);const k=eq?eq.sub||eq.nombre.split(' ')[0]:'Otros';if(!_byTipo[k])_byTipo[k]=0;_byTipo[k]+=(+p.ef||0);});
    const kpiEl=document.getElementById('laKpis');
    if(kpiEl)kpiEl.innerHTML=[
      {l:'Total Registros',v:partesF.length,c:'var(--ceq)',ic:'📋'},
      {l:'Hs Efectivas',v:parseFloat(_totEf.toFixed(2))+'h',c:'#10b981',ic:'⚙️'},
      {l:'Hs Inoperativas',v:parseFloat(_totIm.toFixed(2))+'h',c:'#ef4444',ic:'🛑'},
      ...Object.entries(_byTipo).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([k,v])=>({l:k,v:parseFloat(v.toFixed(2))+'h',c:'#f59e0b',ic:'🏗️'}))
    ].map(k=>`<div style="background:var(--panel2);border:1px solid var(--border);border-bottom:3px solid ${k.c};border-radius:8px;padding:.55rem .9rem;min-width:130px;flex:1">
      <div style="font-size:.6rem;text-transform:uppercase;letter-spacing:.08em;color:var(--muted2);margin-bottom:.25rem">${k.ic} ${k.l}</div>
      <div style="font-size:1.35rem;font-weight:800;color:${k.c};line-height:1">${k.v}</div>
    </div>`).join('');
    // Ordenar
    partesF=[...partesF].sort((a,b)=>{
      const v=_laSort.col==='ef'?(+a.ef||0)-(+b.ef||0):a.fecha.localeCompare(b.fecha);
      return _laSort.dir==='asc'?v:-v;
    });
    const _fIco=document.getElementById('thLAFechaIco'),_eIco=document.getElementById('thLAEfIco');
    if(_fIco)_fIco.textContent=_laSort.col==='fecha'?(_laSort.dir==='asc'?'▲':'▼'):'⇅';
    if(_eIco)_eIco.textContent=_laSort.col==='ef'?(_laSort.dir==='asc'?'▲':'▼'):'⇅';
    // Tabla
    const tbP=document.getElementById('tbPartesLA');
    if(tbP)tbP.innerHTML=partesF.map(p=>{
      const eq=DB.equipos.find(x=>x.id===p.eqId);
      const _can48=p.createdAt&&((Date.now()-new Date(p.createdAt).getTime())/3600000)<48;
      return`<tr><td class="mono">${p.fecha}</td><td>${eq?`<span class="badge b-cyan" style="font-size:.65rem;margin-right:.3rem">${eq.sub||''}</span>${eq.codigo}`:''}</td><td>${p.op}</td><td class="mono" style="color:${(+p.ef)<0?'#ef4444':'#f59e0b'};font-weight:600">${parseFloat((+p.ef).toFixed(2))}h</td><td class="mono">${parseFloat((+p.im).toFixed(2))}h</td><td class="mono" style="display:none">${p.comb} gal</td><td>${p.act}</td>
      <td style="display:flex;gap:4px">
        <button class="btn btn-out btn-sm" onclick="editParte(${p.id})" style="color:#f59e0b;border-color:#f59e0b60" title="Editar">✏️</button>
        ${_can48?`<button class="btn btn-out btn-sm" onclick="delParte(${p.id})" style="color:#ef4444;border-color:#ef444460" title="Eliminar (disponible 48h)">🗑️</button>`:`<button class="btn btn-out btn-sm" disabled style="color:#3d5070;border-color:#2a3a5a;cursor:not-allowed" title="Eliminación bloqueada (+48h)">🔒</button>`}
      </td></tr>`;
    }).join('');
  }else if(tipo==='Línea Blanca'){
    tb.innerHTML=eqs.map(e=>`<tr><td class="mono" style="color:var(--ceq)">${e.codigo}</td><td><strong>${e.nombre}</strong></td><td class="mono">${e.placa||'—'}</td><td>${e.modelo||'—'}</td><td>${bge(e.est)}</td><td class="mono">${fmtN(e.hr)} km</td><td class="mono">${e.proxMant||'—'}</td></tr>`).join('');
    // Filtros LB
    const _fEq=document.getElementById('lbFiltEq');
    const _fDesde=document.getElementById('lbFiltDesde');
    const _fHasta=document.getElementById('lbFiltHasta');
    if(_fEq){
      const curE=_fEq.value;
      _fEq.innerHTML='<option value="">— Todos los equipos —</option>'+eqs.map(e=>`<option value="${e.id}"${e.id==curE?' selected':''}>${e.codigo} – ${e.nombre.split(' ').slice(0,3).join(' ')}</option>`).join('');
    }
    const fEq=_fEq?+_fEq.value||0:0;
    const fDesde=_fDesde?_fDesde.value:'';
    const fHasta=_fHasta?_fHasta.value:'';
    let partesLB=[...partes];
    if(fEq)partesLB=partesLB.filter(p=>p.eqId===fEq);
    if(fDesde)partesLB=partesLB.filter(p=>p.fecha>=fDesde);
    if(fHasta)partesLB=partesLB.filter(p=>p.fecha<=fHasta);
    // KPIs LB
    const _totViajes=partesLB.reduce((s,p)=>s+(+p.nViajes||0),0);
    const _totKm=partesLB.reduce((s,p)=>s+(+p.kmRec||0),0);
    const _totM3=partesLB.reduce((s,p)=>s+(+p.nViajes||0)*12.5,0);
    const _byEq={};
    partesLB.forEach(p=>{const eq=DB.equipos.find(e=>e.id===p.eqId);const k=eq?eq.codigo:'Otros';if(!_byEq[k])_byEq[k]=0;_byEq[k]+=(+p.nViajes||0);});
    const kpiLB=document.getElementById('lbKpis');
    if(kpiLB)kpiLB.innerHTML=[
      {l:'Total Registros',v:partesLB.length,c:'var(--ceq)',ic:'📋'},
      {l:'Total Viajes',v:_totViajes,c:'#10b981',ic:'🚛'},
      {l:'m³ Transportados',v:parseFloat(_totM3.toFixed(1)),c:'#f59e0b',ic:'🪨'},
      {l:'Km Recorridos',v:parseFloat(_totKm.toFixed(1))+'km',c:'#8b5cf6',ic:'🛣️'},
      ...Object.entries(_byEq).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k,v])=>({l:k,v:v+' viajes',c:'#06b6d4',ic:'🚚'}))
    ].map(k=>`<div style="background:var(--panel2);border:1px solid var(--border);border-bottom:3px solid ${k.c};border-radius:8px;padding:.55rem .9rem;min-width:130px;flex:1">
      <div style="font-size:.6rem;text-transform:uppercase;letter-spacing:.08em;color:var(--muted2);margin-bottom:.25rem">${k.ic} ${k.l}</div>
      <div style="font-size:1.35rem;font-weight:800;color:${k.c};line-height:1">${k.v}</div>
    </div>`).join('');
    // Ordenar LB
    partesLB=[...partesLB].sort((a,b)=>{
      const v=_lbSort.col==='viajes'?(+a.nViajes||0)-(+b.nViajes||0):a.fecha.localeCompare(b.fecha);
      return _lbSort.dir==='asc'?v:-v;
    });
    const _fIcoLB=document.getElementById('thLBFechaIco'),_vIcoLB=document.getElementById('thLBViajesIco');
    if(_fIcoLB)_fIcoLB.textContent=_lbSort.col==='fecha'?(_lbSort.dir==='asc'?'▲':'▼'):'⇅';
    if(_vIcoLB)_vIcoLB.textContent=_lbSort.col==='viajes'?(_lbSort.dir==='asc'?'▲':'▼'):'⇅';
    // Tabla LB
    const tbP=document.getElementById('tbPartesLB');
    if(tbP)tbP.innerHTML=partesLB.map(p=>{
      const eq=DB.equipos.find(x=>x.id===p.eqId);
      const m3=(+p.nViajes||0)*12.5;
      const _can48=p.createdAt&&((Date.now()-new Date(p.createdAt).getTime())/3600000)<48;
      return`<tr>
        <td class="mono">${p.fecha}</td>
        <td>${eq?`<span class="badge b-cyan" style="font-size:.65rem;margin-right:.3rem">${eq.placa||eq.codigo}</span>${eq.codigo}`:''}</td>
        <td>${p.op}</td>
        <td class="mono text-acc">${+p.nViajes||0}</td>
        <td class="mono">${m3>0?m3+'m³':'—'}</td>
        <td class="mono">${+p.kmRec>0?parseFloat((+p.kmRec).toFixed(1))+'km':'—'}</td>
        <td class="mono" style="color:${(+p.ef)<0?'#ef4444':+p.ef>0?'#10b981':'#64748b'};font-weight:600">${+p.ef!==0?parseFloat((+p.ef).toFixed(2))+'h':'—'}</td>
        <td class="mono">${+p.im>0?parseFloat((+p.im).toFixed(2))+'h':'—'}</td>
        <td class="mono" style="display:none">${p.comb} gal</td>
        <td>${p.act||'—'}</td>
        <td style="display:flex;gap:4px">
          <button class="btn btn-out btn-sm" onclick="editParte(${p.id})" style="color:#f59e0b;border-color:#f59e0b60" title="Editar">✏️</button>
          ${_can48?`<button class="btn btn-out btn-sm" onclick="delParte(${p.id})" style="color:#ef4444;border-color:#ef444460" title="Eliminar (disponible 48h)">🗑️</button>`:`<button class="btn btn-out btn-sm" disabled style="color:#3d5070;border-color:#2a3a5a;cursor:not-allowed" title="Eliminación bloqueada (+48h)">🔒</button>`}
        </td>
      </tr>`;
    }).join('');
  }else if(tipo==='Vehículo Menor'){
    tb.innerHTML=eqs.map(e=>`<tr><td class="mono" style="color:var(--ceq)">${e.codigo}</td><td><strong>${e.nombre}</strong></td><td class="mono">${e.placa||'—'}</td><td><span class="badge b-cyan">${e.sub||'—'}</span></td><td>${bge(e.est)}</td><td class="mono">${fmtN(e.hr)} km</td><td class="mono">—</td></tr>`).join('');
    const tbS=document.getElementById('tbSalidasVM');if(tbS)tbS.innerHTML='<tr><td colspan="8" class="text-muted" style="text-align:center;padding:1rem">Registre salidas usando ＋ Reporte Diario</td></tr>';
  }else{
    tb.innerHTML=eqs.map(e=>`<tr><td class="mono" style="color:var(--ceq)">${e.codigo}</td><td><strong>${e.nombre}</strong></td><td><span class="badge b-cyan">${e.sub||'—'}</span></td><td>${e.marca}</td><td>${e.modelo}</td><td>${bge(e.est)}</td><td class="mono">${fmtN(e.hr)} h</td></tr>`).join('');
  }
}

// ══ FLOTA DE EQUIPOS ══
function rFlotaEquipos(){
  const fTipo=document.getElementById('flotaFiltTipo')?.value||'';
  const eqs=fTipo?DB.equipos.filter(e=>e.tipo===fTipo):DB.equipos;
  // KPIs
  const total=eqs.length;
  const operativos=eqs.filter(e=>e.est==='Operativo'||e.est==='operativo').length;
  const inMant=eqs.filter(e=>e.est==='En Mantenimiento'||e.est==='Mantenimiento').length;
  const inop=eqs.filter(e=>e.est==='Inoperativo'||e.est==='inoperativo').length;
  const kpiEl=document.getElementById('flotaKpis');
  if(kpiEl)kpiEl.innerHTML=[
    {l:'Total Equipos',v:total,c:'var(--ceq)'},
    {l:'Operativos',v:operativos,c:'#10b981'},
    {l:'En Mantenimiento',v:inMant,c:'#f59e0b'},
    {l:'Inoperativos',v:inop,c:'#ef4444'}
  ].map(k=>`<div class="kpi" style="--kc:${k.c}"><div class="kpi-lbl">${k.l}</div><div class="kpi-val">${k.v}</div></div>`).join('');
  // Días para próximo mantenimiento
  const hoy=new Date();hoy.setHours(0,0,0,0);
  function diasParaMant(proxMant){
    if(!proxMant)return null;
    const d=new Date(proxMant+'T00:00:00');
    return Math.round((d-hoy)/(1000*60*60*24));
  }
  function diasBadge(dias){
    if(dias===null)return '<span style="color:var(--muted)">—</span>';
    if(dias<0)return `<span style="background:rgba(239,68,68,.2);color:#ef4444;border:1px solid #ef444440;border-radius:4px;padding:1px 7px;font-size:.7rem;font-weight:700">Vencido ${Math.abs(dias)}d</span>`;
    if(dias<=10)return `<span style="background:rgba(239,68,68,.15);color:#ef4444;border:1px solid #ef444440;border-radius:4px;padding:1px 7px;font-size:.7rem;font-weight:700">${dias} días</span>`;
    if(dias<=30)return `<span style="background:rgba(245,158,11,.15);color:#f59e0b;border:1px solid #f59e0b40;border-radius:4px;padding:1px 7px;font-size:.7rem;font-weight:700">${dias} días</span>`;
    return `<span style="background:rgba(16,185,129,.12);color:#10b981;border:1px solid #10b98140;border-radius:4px;padding:1px 7px;font-size:.7rem;font-weight:700">${dias} días</span>`;
  }
  // Tabla
  const sortedEqs=[...eqs].sort((a,b)=>(a.tipo||'').localeCompare(b.tipo||'')||(a.codigo||'').localeCompare(b.codigo||''));
  document.getElementById('tbFlota').innerHTML=sortedEqs.map(e=>{
    const dias=diasParaMant(e.proxMant);
    const lineaBadge=e.tipo?`<span class="badge" style="background:rgba(6,182,212,.15);color:var(--ceq);border:1px solid #06b6d440;font-size:.65rem">${e.tipo}</span>`:'';
    const subBadge=e.sub?`<span class="badge b-cyan" style="font-size:.62rem">${e.sub}</span>`:'';
    return`<tr>
      <td class="mono" style="color:var(--ceq);font-weight:600">${e.codigo}</td>
      <td><strong>${e.nombre}</strong></td>
      <td style="display:flex;gap:.3rem;flex-wrap:wrap;align-items:center">${lineaBadge}${subBadge}</td>
      <td class="mono">${e.placa||'<span style="color:var(--muted)">—</span>'}</td>
      <td>${bge(e.est)}</td>
      <td class="mono">${fmtN(e.hr)} ${e.tipo==='Línea Blanca'||e.tipo==='Vehículo Menor'?'km':'h'}</td>
      <td class="mono">${e.ultMant||'<span style="color:var(--muted)">—</span>'}</td>
      <td class="mono">${e.proxMant||'<span style="color:var(--muted)">—</span>'}</td>
      <td>${diasBadge(dias)}</td>
    </tr>`;
  }).join('');
}

// ══ PANEL HORAS ══
const HM_COLS=['Excavadora','Cargador Frontal','Motoniveladora','Retroexcavadora','Tractor Oruga','Rodillo'];
const HM_COLORS={'Excavadora':'#ef4444','Cargador Frontal':'#f97316','Motoniveladora':'#f59e0b','Retroexcavadora':'#10b981','Tractor Oruga':'#3b82f6','Rodillo':'#8b5cf6','Volquete':'#06b6d4'};
function rPanelHoras(){
  // Totals per equipo
  const totHs={};
  DB.partes.forEach(p=>{if(!totHs[p.eqId])totHs[p.eqId]={ef:0,im:0,comb:0};totHs[p.eqId].ef+=p.ef;totHs[p.eqId].im+=p.im;totHs[p.eqId].comb+=p.comb;});
  const totEf=Object.values(totHs).reduce((a,t)=>a+t.ef,0);
  document.getElementById('panelKpis').innerHTML=[{l:'Hs Totales Efectivas',v:fmtN(totEf)+'h',c:'var(--ceq)'},{l:'Equipos con Partes',v:Object.keys(totHs).length,c:'#10b981'},{l:'Total Combustible',v:DB.partes.reduce((a,p)=>a+p.comb,0)+' gal',c:'#f97316'}].map(k=>`<div class="kpi" style="--kc:${k.c}"><div class="kpi-lbl">${k.l}</div><div class="kpi-val">${k.v}</div></div>`).join('');

  // PANEL LA
  const laEqs=DB.equipos.filter(e=>e.tipo==='Línea Amarilla');
  document.getElementById('panelLA').innerHTML=laEqs.map(e=>{
    const t=totHs[e.id]||{ef:0,im:0,comb:0};
    const pct=Math.min(100,(t.ef/200*100));
    const col=HM_COLORS[e.sub]||'var(--ceq)';
    return`<div class="hm-card" style="--hmc:${col}">
      <div class="hm-equipo">${e.sub||e.nombre.split(' ')[0]}</div>
      <div style="font-size:.72rem;color:var(--muted2);margin-bottom:.5rem">${e.codigo} · ${e.nombre.split(' ').slice(0,3).join(' ')}</div>
      <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:.4rem">
        <span style="font-family:'Barlow Condensed';font-size:1.6rem;font-weight:800;color:${col}">${fmtN(t.ef)}h</span>
        <span style="font-size:.68rem;color:var(--muted2)">/ 200h mín.</span>
      </div>
      <div class="prog-wrap"><div class="prog-bar" style="width:${pct}%;background:${col}"></div></div>
      <div class="hm-stat" style="margin-top:.5rem"><span>🛑 Impr: <strong>${t.im}h</strong></span></div>
      <div class="hm-stat"><span>⛽ Comb: <strong>${t.comb} gal</strong></span></div>
      <div style="margin-top:.4rem">${bge(e.est)}</div>
    </div>`;
  }).join('')||'<div class="text-muted" style="padding:1rem">No hay equipos de línea amarilla registrados.</div>';

  // PANEL LB (VOLQUETES)
  const lbEqs=DB.equipos.filter(e=>e.tipo==='Línea Blanca');
  document.getElementById('panelLB').innerHTML=lbEqs.map(e=>{
    const t=totHs[e.id]||{ef:0,im:0,comb:0};
    const col='#06b6d4';
    return`<div class="hm-card" style="--hmc:${col}">
      <div class="hm-equipo">Volquete</div>
      <div style="font-size:.72rem;color:var(--muted2);margin-bottom:.5rem">${e.codigo} · ${e.placa||''}</div>
      <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:.4rem">
        <span style="font-family:'Barlow Condensed';font-size:1.6rem;font-weight:800;color:${col}">${fmtN(t.ef)}h</span>
        <span style="font-size:.68rem;color:var(--muted2)">/ 200h mín.</span>
      </div>
      <div class="prog-wrap"><div class="prog-bar" style="width:${Math.min(100,t.ef/200*100)}%;background:${col}"></div></div>
      <div class="hm-stat" style="margin-top:.5rem"><span>⛽ Comb: <strong>${t.comb} gal</strong></span></div>
      <div style="margin-top:.4rem">${bge(e.est)}</div>
    </div>`;
  }).join('')||'<div class="text-muted" style="padding:1rem">No hay volquetes registrados.</div>';

  // Detail table
  document.getElementById('tbPanelDet').innerHTML=DB.partes.map(p=>{
    const eq=DB.equipos.find(e=>e.id===p.eqId);
    return`<tr><td class="mono">${p.fecha}</td><td>${eq?eq.codigo+' '+eq.nombre.split(' ').slice(0,2).join(' '):'—'}</td><td>${eq?`<span class="badge b-cyan">${eq.sub||eq.tipo}</span>`:'—'}</td><td>${p.op}</td><td class="mono text-acc">${parseFloat((+p.ef).toFixed(2))}h</td><td class="mono">${parseFloat((+p.im).toFixed(2))}h</td><td class="mono">${p.comb} gal</td><td>${p.act}</td></tr>`;
  }).join('');
}

// ══ DASHBOARD EQUIPOS ══
function rDashEquipos(){
  const el=document.getElementById('page-dashEquipos');
  if(!el)return;
  const S={tab:'Línea Amarilla',periodo:'mes',guardia:''};
  window._deTab=t=>{S.tab=t;_deRender();};
  window._dePeriod=v=>{S.periodo=v;_deRender();};
  window._deGuardia=v=>{S.guardia=v;_deRender();};

  function _inPeriodo(fecha){
    if(!fecha)return false;
    const d=new Date(fecha+'T12:00:00'),hoy=new Date();
    if(S.periodo==='mes')return d.getFullYear()===hoy.getFullYear()&&d.getMonth()===hoy.getMonth();
    if(S.periodo==='mesAnt'){const p=new Date(hoy.getFullYear(),hoy.getMonth()-1,1);return d.getFullYear()===p.getFullYear()&&d.getMonth()===p.getMonth();}
    if(S.periodo==='semana'){return(hoy-d)/86400000>=0&&(hoy-d)/86400000<7;}
    return true;
  }

  function _deRender(){
    const tipo=S.tab;
    const color=tipo==='Línea Amarilla'?'#f59e0b':'#06b6d4';

    const partes=DB.partes.filter(p=>{
      const eq=DB.equipos.find(e=>e.id===p.eqId);
      if(!eq||eq.tipo!==tipo)return false;
      if(S.guardia&&p.guardia!==S.guardia)return false;
      return _inPeriodo(p.fecha);
    });

    // Agrupar: subtipo → equipo
    const bySubEq={};
    partes.forEach(p=>{
      const eq=DB.equipos.find(e=>e.id===p.eqId);if(!eq)return;
      const sub=eq.sub||'Sin clasificar';
      if(!bySubEq[sub])bySubEq[sub]={};
      if(!bySubEq[sub][eq.id])bySubEq[sub][eq.id]={eqId:eq.id,nombre:eq.nombre,codigo:eq.codigo,ef:0,im:0};
      bySubEq[sub][eq.id].ef+=+p.ef||0;
      bySubEq[sub][eq.id].im+=+p.im||0;
    });

    const subtypes=Object.keys(bySubEq).sort();
    const totEf=partes.reduce((s,p)=>s+(+p.ef||0),0);
    const totIm=partes.reduce((s,p)=>s+(+p.im||0),0);
    const disp=(totEf+totIm)>0?((totEf/(totEf+totIm))*100).toFixed(1):'—';

    let html=`
      <div class="ph">
        <div class="ph-title" style="color:${color}">📊 Dashboard – Control de Equipos</div>
        <div class="ph-sub">Horas efectivas e inoperativas por equipo</div>
      </div>
      <div class="card" style="margin-bottom:1rem">
        <div class="card-head" style="gap:.7rem;flex-wrap:nowrap">
          <div style="display:flex;gap:.4rem">
            <button class="btn ${S.tab==='Línea Amarilla'?'btn-a':'btn-out'}" style="${S.tab==='Línea Amarilla'?'--ba:#f59e0b':''}" onclick="_deTab('Línea Amarilla')">🟡 Línea Amarilla</button>
            <button class="btn ${S.tab==='Línea Blanca'?'btn-a':'btn-out'}" style="${S.tab==='Línea Blanca'?'--ba:#06b6d4':''}" onclick="_deTab('Línea Blanca')">⚪ Línea Blanca</button>
          </div>
          <div style="display:flex;gap:.5rem">
            <select onchange="_dePeriod(this.value)" style="max-width:150px">
              <option value="mes" ${S.periodo==='mes'?'selected':''}>Mes actual</option>
              <option value="mesAnt" ${S.periodo==='mesAnt'?'selected':''}>Mes anterior</option>
              <option value="semana" ${S.periodo==='semana'?'selected':''}>Última semana</option>
              <option value="todo" ${S.periodo==='todo'?'selected':''}>Todo</option>
            </select>
            <select onchange="_deGuardia(this.value)" style="max-width:130px">
              <option value="">Todas guardias</option>
              <option value="A" ${S.guardia==='A'?'selected':''}>Guardia A</option>
              <option value="B" ${S.guardia==='B'?'selected':''}>Guardia B</option>
            </select>
          </div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:.8rem;margin-bottom:1rem">
        ${[
          {l:'PARTES',v:partes.length,c:color,u:''},
          {l:'HS EFECTIVAS',v:totEf.toFixed(1),c:color,u:'h'},
          {l:'HS INOPERATIVAS',v:totIm.toFixed(1),c:'#ef4444',u:'h'},
          {l:'DISPONIBILIDAD',v:disp,c:'#10b981',u:'%'}
        ].map(k=>`<div class="card" style="text-align:center;padding:.9rem">
          <div style="font-size:.6rem;letter-spacing:.1em;color:var(--muted2);margin-bottom:.4rem">${k.l}</div>
          <div style="font-size:1.7rem;font-weight:800;color:${k.c};line-height:1">${k.v}<span style="font-size:.9rem">${k.u}</span></div>
        </div>`).join('')}
      </div>`;

    if(!subtypes.length){
      html+=`<div class="card"><div class="mb" style="text-align:center;color:var(--muted2);padding:2.5rem 1rem;font-size:.9rem">Sin datos para el período seleccionado</div></div>`;
    } else {
      subtypes.forEach(sub=>{
        const items=Object.values(bySubEq[sub]).sort((a,b)=>b.ef-a.ef);
        const maxVal=Math.max(...items.map(i=>i.ef+i.im),1);
        const stEf=items.reduce((s,i)=>s+i.ef,0);
        const stIm=items.reduce((s,i)=>s+i.im,0);
        html+=`<div class="card" style="margin-bottom:1rem">
          <div class="card-head">
            <div class="card-title" style="color:${color}">${sub} <span style="font-weight:400;color:var(--muted2);font-size:.75rem">(${items.length} equipo${items.length!==1?'s':''})</span></div>
            <div style="display:flex;gap:1.2rem;font-size:.75rem">
              <span style="color:${color}">Ef total: <strong>${stEf.toFixed(1)}h</strong></span>
              <span style="color:#ef4444">Inop total: <strong>${stIm.toFixed(1)}h</strong></span>
            </div>
          </div>
          <div class="mb">${_deChart(items,maxVal,color,S.periodo)}</div>
        </div>`;
      });
    }

    el.innerHTML=html;
  }

  _deRender();
}

function _deChart(items,maxVal,color,periodo){
  const H=170;
  const bars=items.map(item=>{
    const efH=maxVal>0?Math.max(item.ef>0?4:0,Math.round((item.ef/maxVal)*H)):0;
    const imH=maxVal>0?Math.max(item.im>0?4:0,Math.round((item.im/maxVal)*H)):0;
    const lbl=item.codigo||(item.nombre.split(' ').slice(0,2).join(' '));
    const safeColor=color.replace(/'/g,"\\'");
    return `<div style="flex:1;min-width:58px;max-width:96px;cursor:pointer;user-select:none" title="Doble clic para ver detalle diario de ${lbl}" ondblclick="openDrillDown('${item.eqId}','${lbl}','${safeColor}','${periodo||'mes'}')">
      <div style="height:${H}px;display:flex;align-items:flex-end;justify-content:center;gap:3px;border-bottom:1px solid #1e2740">
        <div style="width:22px;height:${efH}px;background:${color};border-radius:3px 3px 0 0;position:relative" title="Ef: ${item.ef.toFixed(1)}h">
          <span style="position:absolute;bottom:100%;left:50%;transform:translateX(-50%);font-size:.52rem;color:${color};white-space:nowrap;padding-bottom:2px">${item.ef>0?item.ef.toFixed(1):''}</span>
        </div>
        <div style="width:22px;height:${imH}px;background:#ef4444;border-radius:3px 3px 0 0;position:relative" title="Inop: ${item.im.toFixed(1)}h">
          <span style="position:absolute;bottom:100%;left:50%;transform:translateX(-50%);font-size:.52rem;color:#ef4444;white-space:nowrap;padding-bottom:2px">${item.im>0?item.im.toFixed(1):''}</span>
        </div>
      </div>
      <div style="font-size:.58rem;color:var(--muted2);text-align:center;padding:5px 2px;line-height:1.2">${lbl}</div>
    </div>`;
  }).join('');

  return `<div style="display:flex;gap:6px;overflow-x:auto;padding:1.4rem .5rem .2rem;min-height:${H+60}px">${bars}</div>
    <div style="display:flex;gap:1.2rem;margin-top:.6rem">
      <span style="font-size:.7rem;color:var(--muted2);display:flex;align-items:center;gap:.35rem"><span style="display:inline-block;width:11px;height:11px;background:${color};border-radius:2px"></span>Hs Efectivas</span>
      <span style="font-size:.7rem;color:var(--muted2);display:flex;align-items:center;gap:.35rem"><span style="display:inline-block;width:11px;height:11px;background:#ef4444;border-radius:2px"></span>Hs Inoperativas</span>
    </div>`;
}

// ══ DRILL-DOWN HORAS DIARIAS ══
function openDrillDown(eqId, codigo, color, periodo){
  const hoy=new Date();
  let year=hoy.getFullYear(), month=hoy.getMonth();
  if(periodo==='mesAnt'){const p=new Date(hoy.getFullYear(),hoy.getMonth()-1,1);year=p.getFullYear();month=p.getMonth();}

  // Poblar selector de años con los años presentes en partes + año actual
  const years=[...new Set(DB.partes.map(p=>p.fecha?p.fecha.substring(0,4):null).filter(Boolean).map(Number))];
  if(!years.includes(year))years.push(year);
  years.sort((a,b)=>b-a);
  const yrSel=document.getElementById('ddYear');
  yrSel.innerHTML=years.map(y=>`<option value="${y}" ${y===year?'selected':''}>${y}</option>`).join('');

  document.getElementById('ddEqId').value=eqId;
  document.getElementById('ddColor').value=color;
  document.getElementById('ddCodigo').textContent=codigo;
  document.getElementById('ddMonth').value=month;
  _renderDrillDown();
  const el=document.getElementById('mDrillDown');
  if(el){el.style.display='flex';}
}

function _renderDrillDown(){
  const eqId=document.getElementById('ddEqId').value;
  const color=document.getElementById('ddColor').value||'var(--ceq)';
  const year=+document.getElementById('ddYear').value;
  const month=+document.getElementById('ddMonth').value;
  const codigo=document.getElementById('ddCodigo').textContent;
  const MESES=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  document.getElementById('ddTitle').textContent=`${codigo} — ${MESES[month]} ${year}`;

  const partes=DB.partes.filter(p=>{
    if(String(p.eqId)!==String(eqId))return false;
    const d=new Date((p.fecha||'')+'T12:00:00');
    return d.getFullYear()===year&&d.getMonth()===month;
  });

  const daysInMonth=new Date(year,month+1,0).getDate();
  const byDay={};
  for(let d=1;d<=daysInMonth;d++)byDay[d]={ef:0,im:0,partes:0};
  partes.forEach(p=>{
    const d=new Date((p.fecha||'')+'T12:00:00').getDate();
    if(byDay[d]){byDay[d].ef+=+p.ef||0;byDay[d].im+=+p.im||0;byDay[d].partes++;}
  });

  const maxVal=Math.max(...Object.values(byDay).map(v=>v.ef+v.im),1);
  const H=150;
  const bars=Object.entries(byDay).map(([day,v])=>{
    const efH=v.ef>0?Math.max(4,Math.round((v.ef/maxVal)*H)):0;
    const imH=v.im>0?Math.max(4,Math.round((v.im/maxVal)*H)):0;
    const hasData=v.ef>0||v.im>0;
    return `<div style="flex:1;min-width:26px;max-width:46px" title="${hasData?`Día ${day}: Ef ${v.ef.toFixed(1)}h · Inop ${v.im.toFixed(1)}h`:`Día ${day}: sin parte`}">
      <div style="height:${H}px;display:flex;align-items:flex-end;justify-content:center;gap:2px;border-bottom:1px solid #1e2740">
        ${efH>0?`<div style="width:10px;height:${efH}px;background:${color};border-radius:2px 2px 0 0;position:relative">
          <span style="position:absolute;bottom:100%;left:50%;transform:translateX(-50%);font-size:.42rem;color:${color};white-space:nowrap;padding-bottom:1px">${v.ef.toFixed(1)}</span>
        </div>`:'<div style="width:10px"></div>'}
        ${imH>0?`<div style="width:10px;height:${imH}px;background:#ef4444;border-radius:2px 2px 0 0;position:relative">
          <span style="position:absolute;bottom:100%;left:50%;transform:translateX(-50%);font-size:.42rem;color:#ef4444;white-space:nowrap;padding-bottom:1px">${v.im.toFixed(1)}</span>
        </div>`:''}
      </div>
      <div style="font-size:.55rem;text-align:center;padding:3px 1px;color:${hasData?'var(--text)':'var(--muted2)'};font-weight:${hasData?'700':'400'}">${day}</div>
    </div>`;
  }).join('');

  const totEf=partes.reduce((s,p)=>s+(+p.ef||0),0);
  const totIm=partes.reduce((s,p)=>s+(+p.im||0),0);
  const kpis=[
    {l:'Hs Efectivas',v:totEf.toFixed(1)+'h',c:color},
    {l:'Hs Inoperativas',v:totIm.toFixed(1)+'h',c:'#ef4444'},
    {l:'Partes registrados',v:partes.length,c:'var(--muted)'},
    {l:'Días trabajados',v:Object.values(byDay).filter(v=>v.ef>0).length,c:'#10b981'}
  ];
  document.getElementById('ddChart').innerHTML=`
    <div style="display:flex;gap:.5rem;margin-bottom:1rem;flex-wrap:wrap">
      ${kpis.map(k=>`<div style="background:var(--panel2);border:1px solid var(--border);border-radius:6px;padding:.3rem .8rem;font-size:.75rem">
        ${k.l}: <strong style="color:${k.c}">${k.v}</strong>
      </div>`).join('')}
    </div>
    <div style="display:flex;gap:3px;overflow-x:auto;padding:1.8rem .3rem .3rem;min-height:${H+50}px">${bars||'<div style="color:var(--muted2);padding:2rem">Sin datos para este mes</div>'}</div>
    <div style="display:flex;gap:1.2rem;margin-top:.7rem">
      <span style="font-size:.7rem;color:var(--muted2);display:flex;align-items:center;gap:.35rem"><span style="display:inline-block;width:11px;height:11px;background:${color};border-radius:2px"></span>Hs Efectivas</span>
      <span style="font-size:.7rem;color:var(--muted2);display:flex;align-items:center;gap:.35rem"><span style="display:inline-block;width:11px;height:11px;background:#ef4444;border-radius:2px"></span>Hs Inoperativas</span>
    </div>`;
}

