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

// Al elegir operador, selecciona automáticamente su guardia según el registro de personal
function _rpAutoGuardia(){
  const val=document.getElementById('rpOperador')?.value||'';
  if(!val)return;
  const p=(DB.personal||[]).find(x=>`${x.ape}, ${x.nom}`===val);
  if(p&&['A','B','C'].includes(p.guardia)){
    setToggle('guardia',p.guardia);
    toast(`Guardia ${p.guardia} — según registro de ${p.ape}`);
  }
}

function filtrarEquipos(){
  const sub = document.getElementById('rpTipo').value;
  parteState.tipo = sub;
  const sel = document.getElementById('rpCodigo');
  const linea = currentReporteTipo;
  const eq = DB.equipos.filter(e=>e.tipo===linea&&(!sub||e.sub===sub)&&!(linea==='Vehículo Menor'&&(e.sub||'').toLowerCase().includes('luminaria')));
  sel.innerHTML = '<option value="">— Seleccionar —</option>' +
    eq.map(e=>`<option value="${e.id}">${e.codigo}${e.placa?' – '+e.placa:''}</option>`).join('');
  const tabV = document.getElementById('tab2');
  if(tabV) tabV.style.display = (currentReporteTipo==='Línea Blanca' || sub.toUpperCase()==='VOLQUETE') ? 'block' : 'none';
  // Filtrar operadores por cargo según subtipo (LA, LB, VM)
  const _catFiltro={'Línea Amarilla':'Operador LA','Línea Blanca':'Operador LB'};
  const opEl=document.getElementById('rpOperador');
  if(opEl){
    let ops;
    const isAct=p=>(p.est||'').toLowerCase()==='activo';
    const _cg=p=>(p.cargo||'').toLowerCase();
    // Coincidencia flexible subtipo↔cargo: "Tractor Oruga" ↔ "OP. TRACTOR", "Retroexcavadora" ↔ "OP. RETRO"
    const _opMatchSub=(p,s)=>{
      s=(s||'').toLowerCase();
      if(!s)return true;
      const cargo=_cg(p);
      if(cargo.includes(s))return true;
      const stok=s.split(/[^a-zñáéíóú0-9]+/).filter(w=>w.length>=4);
      const ctok=cargo.split(/[^a-zñáéíóú0-9]+/).filter(w=>w.length>=4&&w!=='operador');
      return stok.some(st=>ctok.some(ct=>st.startsWith(ct)||ct.startsWith(st)));
    };
    if(linea==='Vehículo Menor'){
      const s=(sub||'').toLowerCase();
      if(s.includes('cisterna')||s.includes('d2l')){
        // Cisterna D2L → solo operadores de cisterna de combustible
        ops=DB.personal.filter(p=>isAct(p)&&_cg(p).includes('cisterna')&&(_cg(p).includes('comb')||_cg(p).includes('d2l')));
        if(!ops.length)ops=DB.personal.filter(p=>isAct(p)&&(_cg(p).includes('cisterna')||(p.cat||'')==='Operador Combustible'));
      }else{
        ops=sub ? DB.personal.filter(p=>isAct(p)&&_opMatchSub(p,sub)) : [];
      }
      if(!ops.length) ops=DB.personal.filter(p=>isAct(p));
    }else if(linea==='Línea Amarilla'||linea==='Línea Blanca'){
      const cat=_catFiltro[linea];
      ops=DB.personal.filter(p=>isAct(p)&&p.cat===cat&&(!sub||_opMatchSub(p,sub)));
      if(!ops.length) ops=DB.personal.filter(p=>isAct(p)&&p.cat===cat);
    }
    if(ops) opEl.innerHTML='<option value="">— Seleccionar —</option>'+ops.map(p=>`<option>${p.ape}, ${p.nom}</option>`).join('');
  }
  _setViajesMode(sub);
  // Tramo de trabajo: mostrar para LA no-volquete (moto, rodillo, tractor, etc.)
  const isVolq=sub.toUpperCase()==='VOLQUETE';
  const isLA=linea==='Línea Amarilla';
  const tramoRow=document.getElementById('rpParteTramoRow');
  if(tramoRow){
    tramoRow.style.display=(isLA&&!isVolq)?'':'none';
    if(isLA&&!isVolq){
      const trSel=document.getElementById('rpParteTramoId');
      if(trSel){
        const cur=trSel.value;
        trSel.innerHTML='<option value="">— Sin tramo —</option>'+
          (DB.tramos||[]).sort((a,b)=>(a.codigo||'').localeCompare(b.codigo||''))
            .map(t=>`<option value="${t.id}">${t.codigo}${t.inicio?` (${t.inicio}${t.fin?' → '+t.fin:''})`:''}</option>`).join('');
        if(cur)trSel.value=cur;
      }
    }
  }
  // (cistSection uses dynamic rows — no static select to fill)
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
    if(lastHr>0) document.getElementById('rpHrIni').value=lastHr;
    document.getElementById('rpHrFin').value='';
    document.getElementById('rpHrsTrab').value=0;
    document.getElementById('rpHrsInop').value='';
    if(_esKm){
      const ini=document.getElementById('rpKmIni');if(ini&&lastKm>0)ini.value=lastKm;
      const fin=document.getElementById('rpKmFin');if(fin)fin.value='';
      const rec=document.getElementById('rpKmRec');if(rec)rec.value=0;
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

let _rpFrenteSelected=[];

function _rpFrenteGetTodos(){
  const fromDB=(DB.frentesTrabajo||[]).map(f=>f.nombre||f.nom||'').filter(Boolean);
  const fromPartes=[];
  (DB.partes||[]).forEach(p=>{if(p.frenteT){p.frenteT.split(', ').forEach(v=>{const t=v.trim();if(t)fromPartes.push(t);});}});
  return [...new Set([...fromDB,...fromPartes])].sort();
}

function filtrarFrentes(){
  if((document.getElementById('rpFrenteDropdown')||{}).style.display!=='none')_rpFrenteRenderList('');
}

function _rpFrenteToggle(){
  const dd=document.getElementById('rpFrenteDropdown');if(!dd)return;
  if(dd.style.display==='none'){
    const b=document.getElementById('rpFrenteBuscar');if(b)b.value='';
    _rpFrenteRenderList('');dd.style.display='block';
  }else{dd.style.display='none';}
}

function _rpFrenteRenderList(q){
  const list=document.getElementById('rpFrenteList');if(!list)return;
  const todos=_rpFrenteGetTodos();
  const fil=q?todos.filter(f=>f.toLowerCase().includes(q.toLowerCase())):todos;
  list.innerHTML=fil.map(f=>{
    const esc=f.replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'&quot;');
    const chk=_rpFrenteSelected.includes(f);
    return `<label style="display:flex;align-items:center;gap:.65rem;padding:.5rem .75rem;cursor:pointer;font-size:.85rem"><input type="checkbox"${chk?' checked':''} onchange="_rpFrenteCheck('${esc}',this)" style="width:15px;height:15px;accent-color:#0ea5e9;cursor:inherit">${f}</label>`;
  }).join('');
  const sa=document.getElementById('rpFrenteSelAll');
  if(sa)sa.checked=fil.length>0&&fil.every(f=>_rpFrenteSelected.includes(f));
}

function _rpFrenteFiltrar(){_rpFrenteRenderList(document.getElementById('rpFrenteBuscar')?.value||'');}

function _rpFrenteCheck(val,cb){
  if(cb.checked){if(!_rpFrenteSelected.includes(val))_rpFrenteSelected.push(val);}
  else{_rpFrenteSelected=_rpFrenteSelected.filter(v=>v!==val);}
  _rpFrenteUpdate();
  _rpFrenteRenderList(document.getElementById('rpFrenteBuscar')?.value||'');
}

function _rpFrenteSelAll(cb){
  const q=document.getElementById('rpFrenteBuscar')?.value||'';
  const todos=_rpFrenteGetTodos();
  const fil=q?todos.filter(f=>f.toLowerCase().includes(q.toLowerCase())):todos;
  if(cb.checked){fil.forEach(f=>{if(!_rpFrenteSelected.includes(f))_rpFrenteSelected.push(f);});}
  else{fil.forEach(f=>{_rpFrenteSelected=_rpFrenteSelected.filter(v=>v!==f);});}
  _rpFrenteUpdate();_rpFrenteRenderList(q);
}

function _rpFrenteUpdate(){
  const lbl=document.getElementById('rpFrenteLabel'),inp=document.getElementById('rpFrente');
  if(lbl){lbl.textContent=_rpFrenteSelected.length?_rpFrenteSelected.join(' · '):'— Seleccionar frente —';lbl.style.color=_rpFrenteSelected.length?'var(--text)':'var(--muted2)';}
  if(inp)inp.value=_rpFrenteSelected.join(', ');
}

function _rpFrenteNuevo(){
  const b=document.getElementById('rpFrenteBuscar');
  const nom=(b?b.value:'').trim();
  _resetFrenteModal();
  if(nom){const ftNom=document.getElementById('ftNom');if(ftNom)ftNom.value=nom;}
  openM('mFrente');
}

function calcHoras(){
  const ini = +document.getElementById('rpHrIni').value||0;
  const fin = +document.getElementById('rpHrFin').value||0;
  const diff = fin > ini ? parseFloat((fin-ini).toFixed(2)) : 0;
  document.getElementById('rpHrsTrab').value = diff.toFixed(2);
  const cond = document.getElementById('rpCondicion')?.value||'';
  if(cond==='OPERATIVO/INOPERATIVO'){
    const inop = parseFloat(Math.max(0,10-diff).toFixed(2));
    document.getElementById('rpHrsInop').value = inop.toFixed(2);
  }
}

function calcKm(){
  const ini = +document.getElementById('rpKmIni').value||0;
  const fin = +document.getElementById('rpKmFin').value||0;
  const diff = fin > ini ? fin-ini : 0;
  document.getElementById('rpKmRec').value = diff.toFixed(2);
}

let viajeCount = 0;
let cistRiegoCount = 0;

function _recalcCistTotal(){
  let tot=0;
  for(let i=1;i<=cistRiegoCount;i++){
    const el=document.getElementById('crTanques'+i);
    if(el)tot+=+el.value||0;
  }
  const lbl=document.getElementById('cistTotalTanques');
  if(lbl)lbl.textContent=tot||0;
}

function addCistRiego(tanques,tramoId){
  cistRiegoCount++;
  const ci=cistRiegoCount;
  const c=document.getElementById('cistRiegosContainer');if(!c)return;
  const div=document.createElement('div');
  div.className='viaje-block';
  div.id='cistRiego-'+ci;
  const _trOpts=(DB.tramos||[]).sort((a,b)=>(a.codigo||'').localeCompare(b.codigo||''))
    .map(t=>`<option value="${t.id}">${t.codigo}${t.inicio?` (${t.inicio}${t.fin?' → '+t.fin:''})`:''}</option>`).join('');
  div.innerHTML=`<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.4rem">
    <span style="font-size:.63rem;font-weight:700;color:#06b6d4;letter-spacing:.07em">TRAMO #${ci}</span>
    <button onclick="document.getElementById('cistRiego-${ci}').remove();_recalcCistTotal()" style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:.75rem;padding:0 .2rem" title="Quitar">✕</button>
  </div>
  <div class="fg-grid" style="grid-template-columns:1fr 2fr">
    <div class="fg"><label>N° Tanques</label>
      <input id="crTanques${ci}" type="number" min="0" placeholder="0" value="${tanques||''}" oninput="_recalcCistTotal()" style="text-align:center">
    </div>
    <div class="fg"><label>Tramo Regado 🗺️</label>
      <select id="crTramo${ci}">
        <option value="">— Sin tramo —</option>${_trOpts}
      </select>
    </div>
  </div>`;
  c.appendChild(div);
  if(tramoId){const sel=document.getElementById('crTramo'+ci);if(sel)sel.value=tramoId;}
  _recalcCistTotal();
}

function _cistRiegosClear(){
  cistRiegoCount=0;
  const c=document.getElementById('cistRiegosContainer');if(c)c.innerHTML='';
  _recalcCistTotal();
}

function _cistRiegosGet(){
  const list=[];
  for(let i=1;i<=cistRiegoCount;i++){
    const tanques=+document.getElementById('crTanques'+i)?.value||0;
    const tramoId=+document.getElementById('crTramo'+i)?.value||0;
    if(tanques>0||tramoId)list.push({tanques,tramoId:tramoId||null});
  }
  return list;
}

function _recalcViajes(){
  let totalViajes=0, totalMins=0;
  for(let i=1;i<=viajeCount;i++){
    const cant=+document.getElementById('vCant'+i)?.value||0;
    const mat=(document.getElementById('vMat'+i)?.value||'').trim().toUpperCase();
    const sinMat=!mat||mat==='SIN MATERIAL';
    const tramoId=+document.getElementById('vTramo'+i)?.value||0;
    const tramo=(DB.tramos||[]).find(t=>t.id===tramoId);
    if(!sinMat)totalViajes+=cant;
    totalMins+=cant*(tramo?(+tramo.ciclo||0):0);
  }
  const rpNV=document.getElementById('rpNViajes');
  if(rpNV)rpNV.value=totalViajes||0;
  const rpTT=document.getElementById('rpTiempoTrans');
  if(rpTT){
    if(totalMins>0){const h=Math.floor(totalMins/60),m=Math.round(totalMins%60);rpTT.value=String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');}
    else rpTT.value='';
  }
}

function _setViajesMode(sub){
  const isCist=(sub||'').toLowerCase().includes('cistern');
  const cistS=document.getElementById('cistSection');
  const volqS=document.getElementById('volqSection');
  const hdr=document.getElementById('viajesTabHeader');
  if(cistS)cistS.style.display=isCist?'':'none';
  if(volqS)volqS.style.display=isCist?'none':'';
  if(hdr)hdr.textContent=isCist?'▸ Registro de Agua (Cisterna)':'▸ Registro de Viajes (Volquete)';
  if(isCist){_cistRiegosClear();addCistRiego();}
}

function _vTramoChange(i){
  const sel=document.getElementById('vTramo'+i);if(!sel)return;
  const tramo=(DB.tramos||[]).find(t=>t.id===+sel.value);
  const org=document.getElementById('vOrigen'+i);
  const dst=document.getElementById('vDestino'+i);
  if(org)org.value=tramo?(tramo.inicio||''):'';
  if(dst)dst.value=tramo?(tramo.fin||''):'';
  _recalcViajes();
}

function addViaje(){
  viajeCount++;
  const nombres=['PRIMER','SEGUNDO','TERCER','CUARTO','QUINTO'];
  const n=Math.min(viajeCount,5);
  const c=document.getElementById('viajesContainer');
  const div=document.createElement('div');
  div.className='viaje-block';
  div.id='viaje-'+viajeCount;
  const _trOpts=(DB.tramos||[]).map(t=>`<option value="${t.id}">${t.codigo} (${t.inicio||''} → ${t.fin||''})${t.anotacion?` · ${t.anotacion}`:''}</option>`).join('');
  const _matOpts=DB.tipoMaterial.map(m=>`<option value="${m.nombre}">`).join('');
  const vi=viajeCount;
  div.innerHTML=`<div class="viaje-title">${nombres[n-1]} TRANSPORTE</div>
    <div class="fg-grid" style="grid-template-columns:1fr">
      <div class="fg"><label>Tramo</label>
        <select id="vTramo${vi}" onchange="_vTramoChange(${vi})">
          <option value="">— Seleccionar tramo —</option>${_trOpts}
        </select>
      </div>
    </div>
    <div class="fg-grid" style="grid-template-columns:1fr 1fr 1fr 1fr">
      <div class="fg"><label>Origen</label>
        <input id="vOrigen${vi}" placeholder="Autocompletado" readonly style="opacity:.7;cursor:default">
      </div>
      <div class="fg"><label>Destino</label>
        <input id="vDestino${vi}" placeholder="Autocompletado" readonly style="opacity:.7;cursor:default">
      </div>
      <div class="fg"><label>Cantidad</label><input id="vCant${vi}" type="number" placeholder="0" oninput="_recalcViajes()"></div>
      <div class="fg"><label>Material</label>
        <input id="vMat${vi}" list="matData${vi}" placeholder="Tipo de material" oninput="_recalcViajes()">
        <datalist id="matData${vi}">${_matOpts}</datalist>
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
  selEq.innerHTML = '<option value="">— Seleccionar —</option>' + eqsLinea.map(e=>`<option value="${e.id}">${e.codigo}${e.placa?' – '+e.placa:''}</option>`).join('');
  // Poblar áreas
  const areas = [...new Set(DB.partes.map(p=>p.areaT).filter(Boolean))];
  if(areas.length === 0) areas.push('R3','NINGUNO');
  document.getElementById('rpArea').innerHTML = '<option value="">— Seleccionar —</option>' + areas.map(a=>`<option>${a}</option>`).join('');
  // Operadores filtrados por categoría según línea
  const _catOp={'Línea Amarilla':'Operador LA','Línea Blanca':'Operador LB'};
  const _catFiltro=_catOp[tipo];
  const _opList=DB.personal.filter(p=>(p.est||'').toLowerCase()==='activo'&&(!_catFiltro||p.cat===_catFiltro));
  document.getElementById('rpOperador').innerHTML='<option value="">— Seleccionar —</option>'+_opList.map(p=>`<option>${p.ape}, ${p.nom}</option>`).join('');
  // Ocultar Operador en Equipos Menores (luminarias y similares sin operador asignado)
  const _opRow=document.getElementById('rpOperadorRow');
  if(_opRow)_opRow.style.display=tipo==='Equipos Menores'?'none':'';
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
  _rpFrenteSelected=[];_rpFrenteUpdate();
  const _rpfd=document.getElementById('rpFrenteDropdown');if(_rpfd)_rpfd.style.display='none';
  _setViajesMode('');
  const _rpNT=document.getElementById('rpNTanques');if(_rpNT)_rpNT.value='';
  const _rpNV=document.getElementById('rpNViajes');if(_rpNV)_rpNV.value='';
  const _rpTT=document.getElementById('rpTiempoTrans');if(_rpTT)_rpTT.value='';
  document.getElementById('rpConclusion').value='';
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
  _rpFrenteSelected=(p.frenteT||'').split(', ').map(s=>s.trim()).filter(Boolean);_rpFrenteUpdate();
  document.getElementById('rpDescripcion').value=p.act||'';
  document.getElementById('rpObservaciones').value=p.observaciones||'';
  const rpConc=document.getElementById('rpConclusion');
  if(rpConc)rpConc.value=p.conclusion||'';
  const rpNV=document.getElementById('rpNViajes');
  if(rpNV)rpNV.value=p.nViajes||0;
  const rpTT=document.getElementById('rpTiempoTrans');
  if(rpTT)rpTT.value=p.tiempoTrans||'';
  // Tramo parte (no-volquete LA)
  const rpPTr=document.getElementById('rpParteTramoId');
  if(rpPTr&&p.tramoId){rpPTr.value=p.tramoId;}
  // Cisterna riegos
  if(p.cistRiegos&&p.cistRiegos.length){
    _cistRiegosClear();
    p.cistRiegos.forEach(function(r){addCistRiego(r.tanques,r.tramoId);});
  }else if(p.nTanques){
    _cistRiegosClear();
    addCistRiego(p.nTanques,p.tramoId||null);
  }
  // Viajes
  if(p.viajes&&p.viajes.length){
    p.viajes.forEach(v=>{
      addViaje();
      const tSel=document.getElementById('vTramo'+viajeCount);
      if(tSel&&v.tramoId){tSel.value=v.tramoId;_vTramoChange(viajeCount);}
      document.getElementById('vOrigen'+viajeCount).value=v.origen||'';
      document.getElementById('vDestino'+viajeCount).value=v.destino||'';
      document.getElementById('vCant'+viajeCount).value=v.cant||0;
      document.getElementById('vMat'+viajeCount).value=v.material||'';
    });
    _recalcViajes();
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
      tramoId: +document.getElementById('vTramo'+i)?.value||0,
      origen:  document.getElementById('vOrigen'+i)?.value||'',
      destino: document.getElementById('vDestino'+i)?.value||'',
      cant:   +document.getElementById('vCant'+i)?.value||0,
      material:document.getElementById('vMat'+i)?.value||''
    });
  }

  const parte = {
    tipoEquipo:    document.getElementById('rpTipo').value,
    codigoEquipo:  eq ? eq.codigo+' – '+eq.nombre : '',
    operador:      currentReporteTipo==='Equipos Menores'?'':document.getElementById('rpOperador').value,
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
    cistRiegos:   _cistRiegosGet(),
    nTanques:     _cistRiegosGet().reduce(function(s,r){return s+r.tanques;},0),
    tramoId:      +document.getElementById('rpParteTramoId')?.value||(_cistRiegosGet()[0]?.tramoId||0),
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
    n_tanques:    parte.nTanques||null,
    cist_riegos:  parte.cistRiegos&&parte.cistRiegos.length?parte.cistRiegos:null,
    tramo_id:     parte.tramoId||null,
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
    const _efFuLA=p=>(+p.ef||0);
    const _totEf=partesF.reduce((s,p)=>s+_efFuLA(p),0);
    const _totIm=partesF.reduce((s,p)=>s+(+p.im||0),0);
    const _byTipo={};
    partesF.forEach(p=>{const eq=DB.equipos.find(e=>e.id===p.eqId);const k=eq?eq.sub||eq.nombre.split(' ')[0]:'Otros';if(!_byTipo[k])_byTipo[k]=0;_byTipo[k]+=_efFuLA(p);});
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
    // Helper: viajes con material (excluye transporte sin material)
    const _vMat=p=>{
      if(p.viajes&&p.viajes.length)
        return p.viajes.filter(v=>v.material&&v.material.trim()&&v.material.trim().toUpperCase()!=='SIN MATERIAL').reduce((s,v)=>s+(+v.cant||0),0);
      return +p.nViajes||0;
    };
    // KPIs LB
    const _totViajes=partesLB.reduce((s,p)=>s+_vMat(p),0);
    const _totKm=partesLB.reduce((s,p)=>s+(+p.kmRec||0),0);
    const _totM3=_totViajes*12.5;
    const _byEq={};
    partesLB.forEach(p=>{const eq=DB.equipos.find(e=>e.id===p.eqId);const k=eq?eq.codigo:'Otros';if(!_byEq[k])_byEq[k]=0;_byEq[k]+=_vMat(p);});
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
      const v=_lbSort.col==='viajes'?_vMat(a)-_vMat(b):a.fecha.localeCompare(b.fecha);
      return _lbSort.dir==='asc'?v:-v;
    });
    const _fIcoLB=document.getElementById('thLBFechaIco'),_vIcoLB=document.getElementById('thLBViajesIco');
    if(_fIcoLB)_fIcoLB.textContent=_lbSort.col==='fecha'?(_lbSort.dir==='asc'?'▲':'▼'):'⇅';
    if(_vIcoLB)_vIcoLB.textContent=_lbSort.col==='viajes'?(_lbSort.dir==='asc'?'▲':'▼'):'⇅';
    // Tabla LB
    const tbP=document.getElementById('tbPartesLB');
    if(tbP)tbP.innerHTML=partesLB.map(p=>{
      const eq=DB.equipos.find(x=>x.id===p.eqId);
      const vMat=_vMat(p);const m3=vMat*12.5;
      const _can48=p.createdAt&&((Date.now()-new Date(p.createdAt).getTime())/3600000)<48;
      return`<tr>
        <td class="mono">${p.fecha}</td>
        <td>${eq?`<span class="badge b-cyan" style="font-size:.65rem;margin-right:.3rem">${eq.placa||eq.codigo}</span>${eq.codigo}`:''}</td>
        <td>${p.op}</td>
        <td class="mono text-acc">${vMat}${vMat<(+p.nViajes||0)?`<span style="color:#64748b;font-size:.6rem"> /${+p.nViajes||0}</span>`:''}</td>
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
    // Filtros VM
    const _fVMEq=document.getElementById('vmFiltEq');
    const _fVMDesde=document.getElementById('vmFiltDesde');
    const _fVMHasta=document.getElementById('vmFiltHasta');
    if(_fVMEq){
      const curE=_fVMEq.value;
      _fVMEq.innerHTML='<option value="">— Todos los vehículos —</option>'+eqs.map(e=>`<option value="${e.id}"${e.id==curE?' selected':''}>${e.placa?e.placa+' – ':''}${e.codigo} ${(e.nombre||'').split(' ').slice(0,3).join(' ')}</option>`).join('');
    }
    const fVMEq=_fVMEq?+_fVMEq.value||0:0;
    const fVMDesde=_fVMDesde?_fVMDesde.value:'';
    const fVMHasta=_fVMHasta?_fVMHasta.value:'';
    let partesVM=[...partes];
    if(fVMEq)partesVM=partesVM.filter(p=>p.eqId===fVMEq);
    if(fVMDesde)partesVM=partesVM.filter(p=>p.fecha>=fVMDesde);
    if(fVMHasta)partesVM=partesVM.filter(p=>p.fecha<=fVMHasta);
    partesVM=[...partesVM].sort((a,b)=>b.fecha.localeCompare(a.fecha));
    // KPIs VM
    const _totKmVM=partesVM.reduce((s,p)=>{const ki=+p.kmIni||0,kf=+p.kmFin||0;return s+(kf>ki?kf-ki:0);},0);
    const _totCombVM=partesVM.reduce((s,p)=>s+(+p.comb||0),0);
    const _byVeh={};
    partesVM.forEach(p=>{const eq=DB.equipos.find(e=>e.id===p.eqId);const k=eq?(eq.placa||eq.codigo):'Otros';const ki=+p.kmIni||0,kf=+p.kmFin||0;if(!_byVeh[k])_byVeh[k]=0;_byVeh[k]+=(kf>ki?kf-ki:0);});
    const kpiVM=document.getElementById('vmKpis');
    if(kpiVM)kpiVM.innerHTML=[
      {l:'Total Registros',v:partesVM.length,c:'var(--ceq)',ic:'📋'},
      {l:'Km Recorridos',v:parseFloat(_totKmVM.toFixed(1))+' km',c:'#10b981',ic:'🛣️'},
      {l:'Combustible',v:parseFloat(_totCombVM.toFixed(1))+' gal',c:'#f59e0b',ic:'⛽'},
      ...Object.entries(_byVeh).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k,v])=>({l:k,v:parseFloat(v.toFixed(1))+' km',c:'#8b5cf6',ic:'🚐'}))
    ].map(k=>`<div style="background:var(--panel2);border:1px solid var(--border);border-bottom:3px solid ${k.c};border-radius:8px;padding:.55rem .9rem;min-width:130px;flex:1">
      <div style="font-size:.6rem;text-transform:uppercase;letter-spacing:.08em;color:var(--muted2);margin-bottom:.25rem">${k.ic} ${k.l}</div>
      <div style="font-size:1.35rem;font-weight:800;color:${k.c};line-height:1">${k.v}</div>
    </div>`).join('');
    const tbS=document.getElementById('tbSalidasVM');
    if(tbS){
      if(!partesVM.length){
        tbS.innerHTML='<tr><td colspan="9" class="text-muted" style="text-align:center;padding:1rem">Sin registros. Use ＋ Reporte Diario para agregar.</td></tr>';
      }else{
        const _can48=p=>p.createdAt&&((Date.now()-new Date(p.createdAt).getTime())/3600000)<48;
        tbS.innerHTML=partesVM.map(p=>{
          const eq=DB.equipos.find(x=>x.id===p.eqId);
          const kmIni=+p.kmIni||0,kmFin=+p.kmFin||0;
          const kmTot=kmFin>kmIni?kmFin-kmIni:0;
          return`<tr>
            <td class="mono">${p.fecha}</td>
            <td>${eq?`<span class="badge b-cyan" style="font-size:.62rem;margin-right:.3rem">${eq.placa||eq.codigo}</span>${eq.codigo} ${(eq.nombre||'').split(' ').slice(0,3).join(' ')}`:''}</td>
            <td>${p.op||'—'}</td>
            <td>${p.act||'—'}</td>
            <td class="mono">${kmIni>0?fmtN(kmIni)+' km':'—'}</td>
            <td class="mono">${kmFin>0?fmtN(kmFin)+' km':'—'}</td>
            <td class="mono" style="color:${kmTot>0?'#10b981':'var(--muted)'};font-weight:${kmTot>0?'700':'400'}">${kmTot>0?fmtN(kmTot)+' km':'—'}</td>
            <td class="mono">${+p.comb>0?p.comb+' gal':'—'}</td>
            <td style="display:flex;gap:4px">
              <button class="btn btn-out btn-sm" onclick="editParte(${p.id})" style="color:#f59e0b;border-color:#f59e0b60" title="Editar">✏️</button>
              ${_can48(p)?`<button class="btn btn-out btn-sm" onclick="delParte(${p.id})" style="color:#ef4444;border-color:#ef444460" title="Eliminar">🗑️</button>`:`<button class="btn btn-out btn-sm" disabled style="color:#3d5070;border-color:#2a3a5a;cursor:not-allowed" title="Bloqueado +48h">🔒</button>`}
            </td>
          </tr>`;
        }).join('');
      }
    }
  }else if(tipo==='Equipos Menores'){
    tb.innerHTML=eqs.map(e=>`<tr><td class="mono" style="color:var(--ceq)">${e.codigo}</td><td><strong>${e.nombre}</strong></td><td><span class="badge b-cyan">${e.sub||'—'}</span></td><td>${e.marca}</td><td>${e.modelo}</td><td>${bge(e.est)}</td><td class="mono">${fmtN(e.hr)} h</td></tr>`).join('');
    const _fTipoEM=document.getElementById('emFiltTipo');
    const _fDesdeEM=document.getElementById('emFiltDesde');
    const _fHastaEM=document.getElementById('emFiltHasta');
    if(_fTipoEM){
      const curT=_fTipoEM.value;
      const subs=[...new Set(eqs.map(e=>e.sub).filter(Boolean))].sort();
      _fTipoEM.innerHTML='<option value="">— Todos los tipos —</option>'+subs.map(s=>`<option${s===curT?' selected':''}>${s}</option>`).join('');
    }
    const fTipoEM=_fTipoEM?_fTipoEM.value:'';
    const fDesdeEM=_fDesdeEM?_fDesdeEM.value:'';
    const fHastaEM=_fHastaEM?_fHastaEM.value:'';
    let partesEM=[...partes];
    if(fTipoEM)partesEM=partesEM.filter(p=>{const eq=DB.equipos.find(e=>e.id===p.eqId);return eq&&eq.sub===fTipoEM;});
    if(fDesdeEM)partesEM=partesEM.filter(p=>p.fecha>=fDesdeEM);
    if(fHastaEM)partesEM=partesEM.filter(p=>p.fecha<=fHastaEM);
    partesEM=[...partesEM].sort((a,b)=>b.fecha.localeCompare(a.fecha));
    const _totEfEM=partesEM.reduce((s,p)=>s+(+p.ef||0),0);
    const _totImEM=partesEM.reduce((s,p)=>s+(+p.im||0),0);
    const _byTipoEM={};
    partesEM.forEach(p=>{const eq=DB.equipos.find(e=>e.id===p.eqId);const k=eq?eq.sub||eq.nombre.split(' ')[0]:'Otros';if(!_byTipoEM[k])_byTipoEM[k]=0;_byTipoEM[k]+=(+p.ef||0);});
    const kpiEM=document.getElementById('emKpis');
    if(kpiEM)kpiEM.innerHTML=[
      {l:'Total Registros',v:partesEM.length,c:'var(--ceq)',ic:'📋'},
      {l:'Hs Efectivas',v:parseFloat(_totEfEM.toFixed(2))+'h',c:'#10b981',ic:'⚙️'},
      {l:'Hs Inoperativas',v:parseFloat(_totImEM.toFixed(2))+'h',c:'#ef4444',ic:'🛑'},
      ...Object.entries(_byTipoEM).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([k,v])=>({l:k,v:parseFloat(v.toFixed(2))+'h',c:'#f59e0b',ic:'🔧'}))
    ].map(k=>`<div style="background:var(--panel2);border:1px solid var(--border);border-bottom:3px solid ${k.c};border-radius:8px;padding:.55rem .9rem;min-width:130px;flex:1">
      <div style="font-size:.6rem;text-transform:uppercase;letter-spacing:.08em;color:var(--muted2);margin-bottom:.25rem">${k.ic} ${k.l}</div>
      <div style="font-size:1.35rem;font-weight:800;color:${k.c};line-height:1">${k.v}</div>
    </div>`).join('');
    const tbPartesEM=document.getElementById('tbPartesEM');
    if(tbPartesEM){
      if(!partesEM.length){
        tbPartesEM.innerHTML='<tr><td colspan="7" class="text-muted" style="text-align:center;padding:1rem">Sin registros. Use ＋ Reporte Diario para agregar.</td></tr>';
      }else{
        const _can48=p=>p.createdAt&&((Date.now()-new Date(p.createdAt).getTime())/3600000)<48;
        tbPartesEM.innerHTML=partesEM.map(p=>{
          const eq=DB.equipos.find(x=>x.id===p.eqId);
          return`<tr>
            <td class="mono">${p.fecha}</td>
            <td>${eq?`<span class="badge b-cyan" style="font-size:.65rem;margin-right:.3rem">${eq.sub||''}</span>${eq.codigo}`:''}</td>
            <td>${p.op||'—'}</td>
            <td class="mono" style="color:${(+p.ef)<0?'#ef4444':'#f59e0b'};font-weight:600">${parseFloat((+p.ef).toFixed(2))}h</td>
            <td class="mono">${parseFloat((+p.im).toFixed(2))}h</td>
            <td>${p.act||'—'}</td>
            <td style="display:flex;gap:4px">
              <button class="btn btn-out btn-sm" onclick="editParte(${p.id})" style="color:#f59e0b;border-color:#f59e0b60" title="Editar">✏️</button>
              ${_can48(p)?`<button class="btn btn-out btn-sm" onclick="delParte(${p.id})" style="color:#ef4444;border-color:#ef444460" title="Eliminar">🗑️</button>`:`<button class="btn btn-out btn-sm" disabled style="color:#3d5070;border-color:#2a3a5a;cursor:not-allowed" title="Bloqueado +48h">🔒</button>`}
            </td>
          </tr>`;
        }).join('');
      }
    }
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
  const desmovilizados=eqs.filter(e=>e.est==='Desmovilizado').length;
  const kpiEl=document.getElementById('flotaKpis');
  if(kpiEl)kpiEl.innerHTML=[
    {l:'Total Equipos',v:total,c:'var(--ceq)'},
    {l:'Operativos',v:operativos,c:'#10b981'},
    {l:'En Mantenimiento',v:inMant,c:'#f59e0b'},
    {l:'Inoperativos',v:inop,c:'#ef4444'},
    {l:'Desmovilizados',v:desmovilizados,c:'#8b5cf6'},
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
// ══ PANEL DE HORAS MÁQUINA (reporte semanal por equipo, estilo Avance MT) ══
let _phSemIni=null,_phChart=null,_phExport=null,_phTipoFiltro='';
function _phSemDefault(){
  const h=new Date(today()+'T12:00:00');
  const lunes=new Date(h);
  lunes.setDate(h.getDate()-((h.getDay()+6)%7));
  return lunes.toISOString().slice(0,10);
}
function _phNav(dias){
  const d=new Date((_phSemIni||_phSemDefault())+'T12:00:00');
  d.setDate(d.getDate()+dias);
  _phSemIni=d.toISOString().slice(0,10);
  rPanelHoras();
}
function _phSemExport(){
  if(!_phExport||!_phExport.aoa){toast('Nada que exportar',true);return;}
  if(typeof XLSX==='undefined'){toast('Librería Excel no disponible',true);return;}
  const ws=XLSX.utils.aoa_to_sheet(_phExport.aoa);
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Horas');
  XLSX.writeFile(wb,_phExport.name);
}

let _phTab=1;
function _phTabSwitch(t){_phTab=t;rPanelHoras();}
function rPanelHoras(){
  const root=document.getElementById('phBody');if(!root)return;
  if(!_phSemIni)_phSemIni=_phSemDefault();
  const tabs=[[1,'📅 Horas por Día'],[2,'🎯 Utilización Semanal'],[3,'🔧 Disponibilidad Mecánica'],[4,'🛵 Disponibilidad Menores']];
  root.innerHTML=`<div style="display:flex;gap:.35rem;margin-bottom:.8rem;flex-wrap:wrap">${tabs.map(([n,lbl])=>{const sel=_phTab===n;return`<button onclick="_phTabSwitch(${n})" style="font-size:.72rem;padding:.35rem .9rem;border-radius:7px;border:1px solid ${sel?'var(--ceq)':'var(--border)'};background:${sel?'rgba(249,115,22,.15)':'var(--panel2)'};color:${sel?'var(--ceq)':'var(--muted2)'};cursor:pointer;font-weight:${sel?'800':'500'}">${lbl}</button>`;}).join('')}</div><div id="phTabBody"></div>`;
  if(_phTab===2){_phRenderUtil('util');return;}
  if(_phTab===3){_phRenderUtil('dm');return;}
  if(_phTab===4){_phRenderMenores();return;}
  _phRenderHoras();
}
function _phRenderHoras(){
  const el=document.getElementById('phTabBody');if(!el)return;
  const pad=n=>String(n).padStart(2,'0');
  const DN=['DOM','LUN','MAR','MIÉ','JUE','VIE','SÁB'];
  const hoy=today();
  const fmtH=v=>v.toLocaleString('es-PE',{maximumFractionDigits:1});

  // 7 fechas de la semana elegida (+ semana anterior para comparativo)
  const mkFechas=ini=>{
    const d0=new Date(ini+'T12:00:00');const out=[];
    for(let i=0;i<7;i++){const d=new Date(d0);d.setDate(d0.getDate()+i);out.push({iso:`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`,lbl:DN[d.getDay()],dm:`${pad(d.getDate())}/${pad(d.getMonth()+1)}`});}
    return out;
  };
  const fechas=mkFechas(_phSemIni);
  const fIni=fechas[0].iso,fFin=fechas[6].iso;
  const rango=`${fechas[0].dm} → ${fechas[6].dm}`;
  const dPrev=new Date(_phSemIni+'T12:00:00');dPrev.setDate(dPrev.getDate()-7);
  const fechasPrev=mkFechas(dPrev.toISOString().slice(0,10));
  const pIni=fechasPrev[0].iso,pFin=fechasPrev[6].iso;

  // Partes de la semana: grid[eqId][iso]={ef,im,efD,efN}
  const grid={};const prevEf={};
  (DB.partes||[]).forEach(function(p){
    if(!p.fecha||!p.eqId)return;
    const eq=(DB.equipos||[]).find(e=>e.id===p.eqId);
    if(_phTipoFiltro&&(!eq||eq.tipo!==_phTipoFiltro))return;
    const ef=Math.max(0,+p.ef||0),im=Math.max(0,+p.im||0);
    if(p.fecha>=pIni&&p.fecha<=pFin){prevEf[p.eqId]=(prevEf[p.eqId]||0)+ef;}
    if(p.fecha<fIni||p.fecha>fFin)return;
    if(!grid[p.eqId])grid[p.eqId]={};
    if(!grid[p.eqId][p.fecha])grid[p.eqId][p.fecha]={ef:0,im:0,efD:0,efN:0};
    const c=grid[p.eqId][p.fecha];
    c.ef+=ef;c.im+=im;
    if(/noche/i.test(p.turno||''))c.efN+=ef;else c.efD+=ef;
  });

  // Filas por equipo con totales
  const rows=Object.keys(grid).map(function(id){
    const eq=(DB.equipos||[]).find(e=>e.id==id);
    let ef=0,im=0,efD=0,efN=0;const dias=new Set();
    Object.entries(grid[id]).forEach(([f,c])=>{ef+=c.ef;im+=c.im;efD+=c.efD;efN+=c.efN;if(c.ef||c.im)dias.add(f);});
    return{id,eq,tipo:eq?(eq.tipo||'Otros'):'Otros',ef,im,efD,efN,dias:dias.size,prom:dias.size?ef/dias.size:0,prev:prevEf[id]||0};
  }).sort((a,b)=>b.ef-a.ef);

  // Agrupar por tipo de línea
  const grupos={};
  rows.forEach(r=>{if(!grupos[r.tipo])grupos[r.tipo]=[];grupos[r.tipo].push(r);});
  const tiposOrden=Object.keys(grupos).sort((a,b)=>grupos[b].reduce((s,r)=>s+r.ef,0)-grupos[a].reduce((s,r)=>s+r.ef,0));

  // Totales generales y por día
  const totDia={};let totalEf=0,totalIm=0,maxCelda=0;
  fechas.forEach(f=>{totDia[f.iso]={ef:0,im:0};});
  rows.forEach(r=>fechas.forEach(f=>{
    const c=grid[r.id][f.iso];if(!c)return;
    totDia[f.iso].ef+=c.ef;totDia[f.iso].im+=c.im;
    totalEf+=c.ef;totalIm+=c.im;
    if(c.ef>maxCelda)maxCelda=c.ef;
  }));
  const totalPrev=rows.reduce((s,r)=>s+r.prev,0);

  const TH='padding:.45rem .5rem;font-size:.62rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted2);white-space:nowrap';
  const TD='padding:.4rem .55rem;border:1px solid var(--border);font-size:.74rem;vertical-align:middle';
  // Heatmap: fondo plomo semioscuro con degradado azul según intensidad
  const heatBase='rgba(148,163,184,.08)'; // plomo para celdas sin datos
  const heat=v=>{if(!v||!maxCelda)return heatBase;const a=0.12+0.45*Math.min(1,v/maxCelda);return`rgba(59,130,246,${a.toFixed(2)})`;};
  const delta=(cur,prev)=>typeof _amtDelta==='function'?_amtDelta(cur,prev):'';

  // Barra superior
  const inpS='font-size:.72rem;padding:.2rem .4rem;border-radius:5px;border:1px solid var(--border);background:var(--panel2);color:var(--text);flex-shrink:0';
  const tiposEq=['','Línea Amarilla','Línea Blanca','Vehículo Menor','Equipos Menores'];
  const bar=`<div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;margin-bottom:.8rem;padding:.4rem .7rem;background:var(--panel2);border:1px solid var(--border);border-radius:8px">
    <span style="font-size:.62rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.08em;white-space:nowrap">Semana (7 días desde)</span>
    <button onclick="_phNav(-7)" style="background:none;border:1px solid var(--border);border-radius:5px;color:var(--text);cursor:pointer;font-size:.85rem;padding:.12rem .5rem" title="Semana anterior">‹</button>
    <input type="date" value="${_phSemIni}" onchange="_phSemIni=this.value;rPanelHoras()" style="${inpS};width:135px">
    <button onclick="_phNav(7)" style="background:none;border:1px solid var(--border);border-radius:5px;color:var(--text);cursor:pointer;font-size:.85rem;padding:.12rem .5rem" title="Semana siguiente">›</button>
    <span style="font-size:.72rem;color:var(--ceq);font-weight:700;font-family:monospace">${rango}</span>
    <button onclick="_phSemIni=_phSemDefault();rPanelHoras()" style="font-size:.62rem;padding:.2rem .5rem;border-radius:5px;border:1px solid var(--border);background:transparent;color:var(--muted2);cursor:pointer">Semana actual (Lun)</button>
    <div style="width:1px;height:18px;background:var(--border)"></div>
    <span style="font-size:.62rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.08em;white-space:nowrap">Línea</span>
    <div style="display:flex;gap:.2rem;flex-wrap:wrap">
      ${tiposEq.map(t=>{
        const sel=_phTipoFiltro===t;
        const lbl=t||'Todas';
        return`<button onclick="_phTipoFiltro='${t}';rPanelHoras()" style="font-size:.62rem;padding:.2rem .5rem;border-radius:5px;border:1px solid ${sel?'var(--ceq)':'var(--border)'};background:${sel?'rgba(249,115,22,.15)':'transparent'};color:${sel?'var(--ceq)':'var(--muted2)'};cursor:pointer;white-space:nowrap;font-weight:${sel?'700':'400'}">${lbl}</button>`;
      }).join('')}
    </div>
    <button onclick="_phSemExport()" style="margin-left:auto;font-size:.7rem;padding:.25rem .7rem;border-radius:5px;border:none;background:#166534;color:#fff;cursor:pointer;font-weight:700;white-space:nowrap">📊 Excel</button>
  </div>`;

  // Filas de la tabla (agrupadas por línea con subtotal)
  let body='';
  tiposOrden.forEach(function(tipo){
    const items=grupos[tipo];
    const subEf=items.reduce((s,r)=>s+r.ef,0);
    const subIm=items.reduce((s,r)=>s+r.im,0);
    body+=`<tr><td colspan="${fechas.length+5}" style="padding:.45rem .7rem;background:rgba(249,115,22,.07);border:1px solid var(--border);color:var(--ceq);font-size:.71rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em">${tipo} · ${items.length} equipo(s) · <span style="font-family:monospace">${fmtH(subEf)}h ef.</span>${subIm?` · <span style="font-family:monospace;color:#ef4444">${fmtH(subIm)}h inop.</span>`:''}</td></tr>`;
    items.forEach(function(r){
      const celdas=fechas.map(function(f){
        const c=grid[r.id][f.iso];
        const esHoy=f.iso===hoy;
        if(!c||(!c.ef&&!c.im))return`<td style="${TD};text-align:right;color:var(--muted);background:${esHoy?'rgba(245,158,11,.05)':heatBase}">—</td>`;
        const ttl=`☀ ${fmtH(c.efD)}h · 🌙 ${fmtH(c.efN)}h${c.im?` · 🛑 Inoper: ${fmtH(c.im)}h`:''}`;
        return`<td style="${TD};text-align:right;font-family:monospace;font-weight:700;color:var(--text);background:${esHoy?'rgba(245,158,11,.10)':heat(c.ef)}" title="${ttl}">${fmtH(c.ef)}${c.im?`<span style="color:#ef4444;font-size:.6rem"> +${fmtH(c.im)}i</span>`:''}</td>`;
      }).join('');
      const promCol=r.prom>=8?'#10b981':r.prom>=5?'#f59e0b':'#ef4444';
      body+=`<tr>
        <td style="${TD};white-space:nowrap">
          <span class="mono" style="font-weight:700;color:#06b6d4;cursor:pointer;text-decoration:underline dotted;text-underline-offset:3px" ondblclick="editEquipo(${r.id})" title="Doble click: editar en Master">${r.eq?r.eq.codigo:'#'+r.id}</span>
          <div style="font-size:.62rem;color:var(--muted2)">${r.eq?((r.eq.sub||'')+' '+(r.eq.marca||'')):''}</div>
        </td>
        ${celdas}
        <td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:var(--ceq);background:rgba(249,115,22,.07)">${fmtH(r.ef)}h ${delta(r.ef,r.prev)}<div style="font-size:.58rem;color:var(--muted2);font-weight:400"><span style="color:#fbbf24">☀</span> ${fmtH(r.efD)} · <span style="color:#94a3b8;filter:grayscale(1) brightness(1.15)">🌙</span> ${fmtH(r.efN)}</div></td>
        <td style="${TD};text-align:right;font-family:monospace;color:${r.im?'#ef4444':'var(--muted)'}">${r.im?fmtH(r.im)+'h':'—'}</td>
        <td style="${TD};text-align:center;font-family:monospace">${r.dias}</td>
        <td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:${promCol}">${r.prom.toFixed(1)}</td>
      </tr>`;
    });
  });

  // Datos de exportación
  _phExport={
    name:'horas_maquina_'+fIni+'.xlsx',
    aoa:[
      ['HORAS MÁQUINA POR EQUIPO — '+rango+(_phTipoFiltro?' — '+_phTipoFiltro:'')],
      ['Equipo','Línea',...fechas.map(f=>f.lbl+' '+f.dm),'Hs Efectivas','☀ Día','🌙 Noche','Hs Inoper.','Días trab.','Prom h/día'],
      ...rows.map(r=>[
        r.eq?r.eq.codigo:('#'+r.id),r.tipo,
        ...fechas.map(f=>{const c=grid[r.id][f.iso];return c&&c.ef?+c.ef.toFixed(1):'';}),
        +r.ef.toFixed(1),+r.efD.toFixed(1),+r.efN.toFixed(1),+r.im.toFixed(1),r.dias,+r.prom.toFixed(1)
      ]),
      ['TOTAL','',...fechas.map(f=>+totDia[f.iso].ef.toFixed(1)),+totalEf.toFixed(1),'','',+totalIm.toFixed(1),'','']
    ]
  };

  el.innerHTML=bar+`
  <div class="kpi-row">
    <div class="kpi" style="--kc:var(--ceq)"><div class="kpi-lbl">Hs Efectivas de la Semana</div><div class="kpi-val" style="font-size:1.5rem">${fmtH(totalEf)}h ${delta(totalEf,totalPrev)}</div></div>
    <div class="kpi" style="--kc:#ef4444"><div class="kpi-lbl">Hs Inoperativas</div><div class="kpi-val" style="font-size:1.5rem">${fmtH(totalIm)}h</div></div>
    <div class="kpi" style="--kc:#06b6d4"><div class="kpi-lbl">Equipos con Partes</div><div class="kpi-val" style="font-size:1.5rem">${rows.length}</div></div>
    <div class="kpi" style="--kc:#10b981"><div class="kpi-lbl">Prom. hs/equipo-día</div><div class="kpi-val" style="font-size:1.5rem">${rows.length?(rows.reduce((s,r)=>s+r.prom,0)/rows.length).toFixed(1):'—'}h</div></div>
  </div>
  ${rows.length?`<div class="card" style="margin-bottom:.9rem"><div class="card-body" style="height:230px;position:relative;padding:.7rem"><canvas id="phChart"></canvas></div></div>`:''}
  <div class="card" style="padding:0">
    <div class="tbl-wrap">
    <table style="min-width:100%;border-collapse:collapse">
      <thead><tr style="background:var(--panel2)">
        <th style="${TH};text-align:left;min-width:130px">Equipo</th>
        ${fechas.map(f=>{const esHoy=f.iso===hoy;return`<th style="${TH};text-align:center;min-width:74px;${esHoy?'color:#f59e0b;background:rgba(245,158,11,.1)':''}">${f.lbl}<div style="font-size:.68rem;font-weight:400;font-family:monospace">${f.dm}</div></th>`;}).join('')}
        <th style="${TH};text-align:right;min-width:100px;color:var(--ceq);background:rgba(249,115,22,.08)">Total Semana<div style="font-size:.55rem;font-weight:400">vs sem. anterior</div></th>
        <th style="${TH};text-align:right" title="Horas inoperativas de la semana">🛑 Inoper.</th>
        <th style="${TH};text-align:center">Días</th>
        <th style="${TH};text-align:right" title="Horas efectivas por día trabajado">Prom h/día</th>
      </tr></thead>
      <tbody>${body||`<tr><td colspan="${fechas.length+5}" style="text-align:center;padding:2.5rem;color:var(--muted2);font-size:.85rem">Sin partes diarios en esta semana (${rango})</td></tr>`}</tbody>
      ${rows.length?`<tfoot><tr style="background:var(--panel2);border-top:2px solid var(--border)">
        <td style="${TD};font-size:.65rem;font-weight:700;color:var(--muted2);text-transform:uppercase">TOTAL DÍA (hs ef.)</td>
        ${fechas.map(f=>{const t=totDia[f.iso];return`<td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:${t.ef?'var(--ceq)':'var(--muted)'}">${t.ef?fmtH(t.ef):'—'}</td>`;}).join('')}
        <td style="${TD};text-align:right;font-family:monospace;font-weight:900;font-size:.85rem;color:var(--ceq);background:rgba(249,115,22,.1)">${fmtH(totalEf)}h</td>
        <td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:#ef4444">${totalIm?fmtH(totalIm)+'h':'—'}</td>
        <td colspan="2"></td>
      </tr></tfoot>`:''}
    </table>
    </div>
  </div>
  <div style="margin-top:.5rem;font-size:.64rem;color:var(--muted2)">Celdas = horas efectivas del día (tooltip: desglose ☀/🌙 e inoperativas) · "+Xi" = horas inoperativas · Prom h/día = hs efectivas ÷ días trabajados (verde ≥8, ámbar ≥5, rojo &lt;5) · ▲▼ compara con la semana anterior · Doble click en el código abre el Master</div>`;

  // Gráfico: horas efectivas por día apiladas por línea
  if(rows.length&&typeof Chart!=='undefined'){
    if(_phChart){_phChart.destroy();_phChart=null;}
    const ctx=document.getElementById('phChart');
    if(ctx){
      const colTipo={'Línea Amarilla':'#f59e0b','Línea Blanca':'#06b6d4','Vehículo Menor':'#8b5cf6','Equipos Menores':'#84cc16','Otros':'#6b7280'};
      _phChart=new Chart(ctx,{
        type:'bar',
        data:{
          labels:fechas.map(f=>f.lbl+' '+f.dm),
          datasets:tiposOrden.map(tipo=>({
            label:tipo,
            data:fechas.map(f=>{
              let s=0;grupos[tipo].forEach(r=>{const c=grid[r.id][f.iso];if(c)s+=c.ef;});
              return +s.toFixed(1);
            }),
            backgroundColor:(colTipo[tipo]||'#6b7280')+'CC',
            borderRadius:2,stack:'s'
          }))
        },
        options:{
          responsive:true,maintainAspectRatio:false,
          plugins:{
            legend:{position:'bottom',labels:{color:'#8b93a7',font:{size:9},boxWidth:10}},
            tooltip:{callbacks:{label:c=>c.dataset.label+': '+c.parsed.y.toLocaleString('es-PE')+' h'}},
            title:{display:true,text:'Horas efectivas por día y línea',color:'#8b93a7',font:{size:11}}
          },
          scales:{
            x:{stacked:true,ticks:{color:'#8b93a7',font:{size:9}},grid:{display:false}},
            y:{stacked:true,ticks:{color:'#8b93a7',font:{size:9},callback:v=>v+' h'},grid:{color:'rgba(139,147,167,.12)'},beginAtZero:true}
          }
        }
      });
    }
  }
}

// ── TABS 2 y 3: UTILIZACIÓN (H. Efect ÷ H. Prog) y DISPONIBILIDAD MECÁNICA ((H. Prog − Improd) ÷ H. Prog) · semana + acumulado al corte 21→20 ──
function _phHsProgTurno(){return +(localStorage.getItem('gdar_ph_hsprog')||10);}
function _phSetHsProg(){
  const v=prompt('Horas programadas por parte/turno:',_phHsProgTurno());
  if(v===null)return;
  const n=+String(v).replace(',','.');
  if(!(n>0)){toast('Valor inválido',true);return;}
  localStorage.setItem('gdar_ph_hsprog',n);
  rPanelHoras();
}
function _phRenderUtil(modo){
  const esDM=modo==='dm';
  const el=document.getElementById('phTabBody');if(!el)return;
  const pad=n=>String(n).padStart(2,'0');
  const fmtH=v=>v.toLocaleString('es-PE',{maximumFractionDigits:1});
  const HP=_phHsProgTurno();

  // Semana seleccionada (comparte estado con el tab 1)
  const d0=new Date(_phSemIni+'T12:00:00');
  const fechas=[];
  for(let i=0;i<7;i++){const d=new Date(d0);d.setDate(d0.getDate()+i);fechas.push(`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`);}
  const fIni=fechas[0],fFin=fechas[6];
  const dmy=s=>s.slice(8,10)+'/'+s.slice(5,7);
  const rango=`${dmy(fIni)} – ${dmy(fFin)}`;
  // Nº de semana ISO (según el jueves de la semana del fin)
  const dISO=new Date(fFin+'T12:00:00');
  const jue=new Date(dISO);jue.setDate(dISO.getDate()+(4-(dISO.getDay()||7)));
  const nSem=Math.ceil((((jue-new Date(jue.getFullYear(),0,1))/864e5)+1)/7);
  const semLbl=`${jue.getFullYear()}-S${pad(nSem)} (${rango})`;

  // Corte 21→20 que contiene el fin de la semana
  const dF=new Date(fFin+'T12:00:00');
  const cIniD=dF.getDate()>=21?new Date(dF.getFullYear(),dF.getMonth(),21):new Date(dF.getFullYear(),dF.getMonth()-1,21);
  const cFinD=new Date(cIniD.getFullYear(),cIniD.getMonth()+1,20);
  const isoD=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const cIni=isoD(cIniD),cFin=isoD(cFinD);
  const corteLbl=`${dmy(cIni)}/${String(cIniD.getFullYear()).slice(2)} al ${dmy(cFin)}/${String(cFinD.getFullYear()).slice(2)}`;
  const aFin=fFin<cFin?fFin:cFin; // acumulado: del 21 hasta el fin de la semana elegida

  // Solo Línea Amarilla y Línea Blanca (menores tienen su propio tab por días)
  const filLinea=(_phTipoFiltro==='Línea Amarilla'||_phTipoFiltro==='Línea Blanca')?_phTipoFiltro:'';
  // Acumular partes por equipo
  const acc={};
  (DB.partes||[]).forEach(function(p){
    if(!p.fecha||!p.eqId)return;
    const eq=(DB.equipos||[]).find(e=>e.id===p.eqId);
    const tipoEq=eq?(eq.tipo||'Otros'):'Otros';
    if(tipoEq!=='Línea Amarilla'&&tipoEq!=='Línea Blanca')return;
    if(filLinea&&tipoEq!==filLinea)return;
    const enSem=p.fecha>=fIni&&p.fecha<=fFin;
    const enAc=p.fecha>=cIni&&p.fecha<=aFin;
    if(!enSem&&!enAc)return;
    if(!acc[p.eqId])acc[p.eqId]={eq,tipo:eq?(eq.tipo||'Otros'):'Otros',semN:0,semEf:0,semIm:0,semDias:new Set(),acN:0,acEf:0,acIm:0};
    const a=acc[p.eqId];
    const ef=Math.max(0,+p.ef||0),im=Math.max(0,+p.im||0);
    if(enSem){a.semN++;a.semEf+=ef;a.semIm+=im;a.semDias.add(p.fecha);}
    if(enAc){a.acN++;a.acEf+=ef;a.acIm+=im;}
  });

  const rows=Object.entries(acc).map(([id,a])=>({id,...a,dias:a.semDias.size,semProg:a.semN*HP,acProg:a.acN*HP}))
    .sort((x,y)=>y.semEf-x.semEf);
  const grupos={};
  rows.forEach(r=>{if(!grupos[r.tipo])grupos[r.tipo]=[];grupos[r.tipo].push(r);});
  const tiposOrden=Object.keys(grupos).sort((a,b)=>grupos[b].reduce((s,r)=>s+r.semEf,0)-grupos[a].reduce((s,r)=>s+r.semEf,0));

  const utilCol=u=>u>=80?'#10b981':u>=60?'#f59e0b':'#ef4444';
  // % del tab: Utilización = H.Efect ÷ H.Prog · Disp. Mec. = (H.Prog − Improd) ÷ H.Prog
  const calcPct=(ef,im,prog)=>esDM?(prog-im)/prog*100:ef/prog*100;
  const utilCell=(ef,im,prog,TD)=>{
    if(!prog)return`<td style="${TD};text-align:right;color:var(--muted)">—</td>`;
    const u=calcPct(ef,im,prog);
    return`<td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:${utilCol(u)}">${u.toFixed(1)}%</td>`;
  };

  const TH='padding:.45rem .55rem;font-size:.62rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted2);white-space:nowrap;border:1px solid var(--border)';
  const TD='padding:.42rem .6rem;border:1px solid var(--border);font-size:.75rem;vertical-align:middle';

  // Barra superior (semana comparte estado/nav con el tab 1)
  const inpS='font-size:.72rem;padding:.2rem .4rem;border-radius:5px;border:1px solid var(--border);background:var(--panel2);color:var(--text);flex-shrink:0';
  const tiposEq=['','Línea Amarilla','Línea Blanca'];
  const bar=`<div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;margin-bottom:.8rem;padding:.4rem .7rem;background:var(--panel2);border:1px solid var(--border);border-radius:8px">
    <span style="font-size:.62rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.08em">Corte</span>
    <span style="font-size:.7rem;font-family:monospace;font-weight:700;color:#a78bfa;background:rgba(139,92,246,.12);border:1px solid rgba(139,92,246,.35);border-radius:6px;padding:.18rem .55rem;white-space:nowrap">${corteLbl}</span>
    <div style="width:1px;height:18px;background:var(--border)"></div>
    <span style="font-size:.62rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.08em">Semana</span>
    <button onclick="_phNav(-7)" style="background:none;border:1px solid var(--border);border-radius:5px;color:var(--text);cursor:pointer;font-size:.85rem;padding:.12rem .5rem" title="Semana anterior">‹</button>
    <input type="date" value="${_phSemIni}" onchange="_phSemIni=this.value;rPanelHoras()" style="${inpS};width:135px">
    <button onclick="_phNav(7)" style="background:none;border:1px solid var(--border);border-radius:5px;color:var(--text);cursor:pointer;font-size:.85rem;padding:.12rem .5rem" title="Semana siguiente">›</button>
    <span style="font-size:.72rem;color:var(--ceq);font-weight:700;font-family:monospace;white-space:nowrap">${semLbl}</span>
    <div style="width:1px;height:18px;background:var(--border)"></div>
    <span style="font-size:.62rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.08em">Línea</span>
    <div style="display:flex;gap:.2rem;flex-wrap:wrap">
      ${tiposEq.map(t=>{
        const sel=filLinea===t;
        return`<button onclick="_phTipoFiltro='${t}';rPanelHoras()" style="font-size:.62rem;padding:.2rem .5rem;border-radius:5px;border:1px solid ${sel?'var(--ceq)':'var(--border)'};background:${sel?'rgba(249,115,22,.15)':'transparent'};color:${sel?'var(--ceq)':'var(--muted2)'};cursor:pointer;white-space:nowrap;font-weight:${sel?'700':'400'}">${t||'Todas'}</button>`;
      }).join('')}
    </div>
    <button onclick="_phSetHsProg()" style="font-size:.62rem;padding:.2rem .5rem;border-radius:5px;border:1px solid var(--border);background:transparent;color:var(--muted2);cursor:pointer;white-space:nowrap" title="Horas programadas por parte/turno">⚙ ${HP}h/turno</button>
    <button onclick="_phSemExport()" style="margin-left:auto;font-size:.7rem;padding:.25rem .7rem;border-radius:5px;border:none;background:#166534;color:#fff;cursor:pointer;font-weight:700;white-space:nowrap">📊 Excel</button>
  </div>`;

  // Filas agrupadas por línea
  let body='';
  tiposOrden.forEach(function(tipo){
    const items=grupos[tipo];
    body+=`<tr><td colspan="8" style="padding:.45rem .7rem;background:rgba(249,115,22,.07);border:1px solid var(--border);color:var(--ceq);font-size:.71rem;font-weight:800;text-transform:uppercase;letter-spacing:.06em">▶ ${tipo} · ${items.length} equipo(s)</td></tr>`;
    items.forEach(function(r){
      body+=`<tr>
        <td style="${TD};white-space:nowrap">
          <span class="mono" style="font-weight:700;color:#06b6d4;cursor:pointer;text-decoration:underline dotted;text-underline-offset:3px" ondblclick="editEquipo(${r.id})" title="Doble click: editar en Master">${r.eq?r.eq.codigo:'#'+r.id}</span>
          <div style="font-size:.62rem;color:var(--muted2)">${r.eq?((r.eq.sub||'')+' '+(r.eq.marca||'')):''}</div>
        </td>
        <td style="${TD};text-align:center;font-family:monospace">${r.dias||'—'}</td>
        <td style="${TD};text-align:right;font-family:monospace;color:var(--muted2)">${r.semProg?fmtH(r.semProg):'—'}</td>
        <td style="${TD};text-align:right;font-family:monospace;font-weight:700;color:${esDM?(r.semIm?'#ef4444':'var(--muted)'):'var(--text)'}">${r.semN?fmtH(esDM?r.semIm:r.semEf):'—'}</td>
        ${utilCell(r.semEf,r.semIm,r.semProg,TD)}
        <td style="${TD};text-align:right;font-family:monospace;color:var(--muted2);background:rgba(148,163,184,.05)">${r.acProg?fmtH(r.acProg):'—'}</td>
        <td style="${TD};text-align:right;font-family:monospace;font-weight:700;color:${esDM?(r.acIm?'#ef4444':'var(--muted)'):'var(--text)'};background:rgba(148,163,184,.05)">${r.acN?fmtH(esDM?r.acIm:r.acEf):'—'}</td>
        ${utilCell(r.acEf,r.acIm,r.acProg,TD+';background:rgba(148,163,184,.05)')}
      </tr>`;
    });
  });

  // Totales
  const tSemProg=rows.reduce((s,r)=>s+r.semProg,0),tSemEf=rows.reduce((s,r)=>s+r.semEf,0),tSemIm=rows.reduce((s,r)=>s+r.semIm,0);
  const tAcProg=rows.reduce((s,r)=>s+r.acProg,0),tAcEf=rows.reduce((s,r)=>s+r.acEf,0),tAcIm=rows.reduce((s,r)=>s+r.acIm,0);
  const uSem=tSemProg?calcPct(tSemEf,tSemIm,tSemProg):0,uAc=tAcProg?calcPct(tAcEf,tAcIm,tAcProg):0;
  const mLbl=esDM?'Disp. Mec.':'Utiliz.';

  // Exportación
  _phExport={
    name:(esDM?'disponibilidad_mecanica_':'utilizacion_equipos_')+fIni+'.xlsx',
    aoa:[
      [(esDM?'DISPONIBILIDAD MECÁNICA':'UTILIZACIÓN DE EQUIPOS')+' — Semana '+semLbl+' — Corte '+corteLbl+(_phTipoFiltro?' — '+_phTipoFiltro:'')],
      ['Equipo','Línea','Días trab.','Sem H.Prog.',esDM?'Sem H.Inoper.':'Sem H.Efect.','Sem '+mLbl+'%','Acum H.Prog.',esDM?'Acum H.Inoper.':'Acum H.Efect.','Acum '+mLbl+'%'],
      ...rows.map(r=>[
        r.eq?r.eq.codigo:('#'+r.id),r.tipo,r.dias,
        +r.semProg.toFixed(1),+(esDM?r.semIm:r.semEf).toFixed(1),r.semProg?+calcPct(r.semEf,r.semIm,r.semProg).toFixed(1):'',
        +r.acProg.toFixed(1),+(esDM?r.acIm:r.acEf).toFixed(1),r.acProg?+calcPct(r.acEf,r.acIm,r.acProg).toFixed(1):''
      ]),
      ['TOTAL','','',+tSemProg.toFixed(1),+(esDM?tSemIm:tSemEf).toFixed(1),+uSem.toFixed(1),+tAcProg.toFixed(1),+(esDM?tAcIm:tAcEf).toFixed(1),+uAc.toFixed(1)]
    ]
  };

  el.innerHTML=bar+`
  <div class="kpi-row">
    <div class="kpi" style="--kc:${utilCol(uSem)}"><div class="kpi-lbl">${esDM?'Disp. Mecánica':'Utilización'} de la Semana</div><div class="kpi-val" style="font-size:1.5rem;color:${utilCol(uSem)}">${tSemProg?uSem.toFixed(1)+'%':'—'}</div></div>
    <div class="kpi" style="--kc:${utilCol(uAc)}"><div class="kpi-lbl">${esDM?'Disp. Mecánica':'Utilización'} Acum. al Corte</div><div class="kpi-val" style="font-size:1.5rem;color:${utilCol(uAc)}">${tAcProg?uAc.toFixed(1)+'%':'—'}</div></div>
    ${esDM
      ?`<div class="kpi" style="--kc:#ef4444"><div class="kpi-lbl">Hs Inoperativas Semana</div><div class="kpi-val" style="font-size:1.5rem">${fmtH(tSemIm)}h <span style="font-size:.75rem;color:var(--muted2)">/ ${fmtH(tSemProg)}h prog.</span></div></div>`
      :`<div class="kpi" style="--kc:var(--ceq)"><div class="kpi-lbl">Hs Efectivas Semana</div><div class="kpi-val" style="font-size:1.5rem">${fmtH(tSemEf)}h <span style="font-size:.75rem;color:var(--muted2)">/ ${fmtH(tSemProg)}h prog.</span></div></div>`}
    <div class="kpi" style="--kc:#06b6d4"><div class="kpi-lbl">Equipos con Partes</div><div class="kpi-val" style="font-size:1.5rem">${rows.length}</div></div>
  </div>
  <div class="card" style="padding:0">
    <div class="tbl-wrap">
    <table style="min-width:100%;border-collapse:collapse">
      <thead>
        <tr style="background:var(--panel2)">
          <th style="${TH};text-align:left;min-width:140px" rowspan="2">Tipo / Equipo</th>
          <th style="${TH};text-align:center" rowspan="2" title="Días con parte diario en la semana">Días T</th>
          <th style="${TH};text-align:center;background:rgba(59,130,246,.10);color:#60a5fa" colspan="3">Semana (${rango})</th>
          <th style="${TH};text-align:center;background:rgba(148,163,184,.08)" colspan="3">Acum. al Corte</th>
        </tr>
        <tr style="background:var(--panel2)">
          <th style="${TH};text-align:right;background:rgba(59,130,246,.06)">H. Prog.</th>
          <th style="${TH};text-align:right;background:rgba(59,130,246,.06)">${esDM?'H. Inoper.':'H. Efect.'}</th>
          <th style="${TH};text-align:right;background:rgba(59,130,246,.06)">${mLbl} %</th>
          <th style="${TH};text-align:right;background:rgba(148,163,184,.05)">H. Prog.</th>
          <th style="${TH};text-align:right;background:rgba(148,163,184,.05)">${esDM?'H. Inoper.':'H. Efect.'}</th>
          <th style="${TH};text-align:right;background:rgba(148,163,184,.05)">${mLbl} %</th>
        </tr>
      </thead>
      <tbody>${body||`<tr><td colspan="8" style="text-align:center;padding:2.5rem;color:var(--muted2);font-size:.85rem">Sin partes diarios en esta semana (${rango}) ni en el corte (${corteLbl})</td></tr>`}</tbody>
      ${rows.length?`<tfoot><tr style="background:var(--panel2);border-top:2px solid var(--border)">
        <td style="${TD};font-size:.65rem;font-weight:700;color:var(--muted2);text-transform:uppercase">TOTAL GENERAL</td>
        <td style="${TD}"></td>
        <td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:var(--muted2)">${fmtH(tSemProg)}</td>
        <td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:${esDM?'#ef4444':'var(--ceq)'}">${fmtH(esDM?tSemIm:tSemEf)}</td>
        ${utilCell(tSemEf,tSemIm,tSemProg,TD)}
        <td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:var(--muted2)">${fmtH(tAcProg)}</td>
        <td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:${esDM?'#ef4444':'var(--ceq)'}">${fmtH(esDM?tAcIm:tAcEf)}</td>
        ${utilCell(tAcEf,tAcIm,tAcProg,TD)}
      </tr></tfoot>`:''}
    </table>
    </div>
  </div>
  <div style="margin-top:.5rem;font-size:.64rem;color:var(--muted2);display:flex;gap:1rem;flex-wrap:wrap;align-items:center">
    <span><span style="color:#10b981">●</span> ≥80% — Bueno</span>
    <span><span style="color:#f59e0b">●</span> 60–79% — Alerta</span>
    <span><span style="color:#ef4444">●</span> &lt;60% — Crítico</span>
    <span style="margin-left:auto">ⓘ ${esDM?'Disp. Mec. = (H. Prog. − H. Inoper.) ÷ H. Prog. · H. Inoper. = hs de inoperatividad del parte diario':'Utiliz. = H. Efect. ÷ H. Prog.'} · H. Prog. = Nº de partes × ${HP}h por turno (⚙ configurable) · Acum. = del ${dmy(cIni)} al ${dmy(aFin)} · Doble click en el código abre el Master</span>
  </div>`;
}

// ── TAB 4: DISPONIBILIDAD MENORES (Vehículos y Equipos Menores · por días del corte) ──
// Disp. = (días operativos − días inoperativos) ÷ días del período (semana=7 · corte=30/31)
function _phRenderMenores(){
  const el=document.getElementById('phTabBody');if(!el)return;
  const pad=n=>String(n).padStart(2,'0');

  // Semana seleccionada (comparte estado con los demás tabs)
  const d0=new Date(_phSemIni+'T12:00:00');
  const fechas=[];
  for(let i=0;i<7;i++){const d=new Date(d0);d.setDate(d0.getDate()+i);fechas.push(`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`);}
  const fIni=fechas[0],fFin=fechas[6];
  const dmy=s=>s.slice(8,10)+'/'+s.slice(5,7);
  const rango=`${dmy(fIni)} – ${dmy(fFin)}`;
  const dISO=new Date(fFin+'T12:00:00');
  const jue=new Date(dISO);jue.setDate(dISO.getDate()+(4-(dISO.getDay()||7)));
  const nSem=Math.ceil((((jue-new Date(jue.getFullYear(),0,1))/864e5)+1)/7);
  const semLbl=`${jue.getFullYear()}-S${pad(nSem)} (${rango})`;

  // Corte 21→20 que contiene el fin de la semana
  const dF=new Date(fFin+'T12:00:00');
  const cIniD=dF.getDate()>=21?new Date(dF.getFullYear(),dF.getMonth(),21):new Date(dF.getFullYear(),dF.getMonth()-1,21);
  const cFinD=new Date(cIniD.getFullYear(),cIniD.getMonth()+1,20);
  const isoD=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const cIni=isoD(cIniD),cFin=isoD(cFinD);
  const corteLbl=`${dmy(cIni)}/${String(cIniD.getFullYear()).slice(2)} al ${dmy(cFin)}/${String(cFinD.getFullYear()).slice(2)}`;
  const diasCorte=Math.round((cFinD-cIniD)/864e5)+1; // 30 o 31 días

  // Solo Vehículos Menores y Equipos Menores
  const TIPOS_MEN=['Vehículo Menor','Equipos Menores'];
  const filMen=TIPOS_MEN.includes(_phTipoFiltro)?_phTipoFiltro:'';

  // Clasificar cada parte por su condición: inoperativo puro resta, el resto (trabajado/standby/mixto) es operativo
  const esInop=p=>String(p.condicion||'').toUpperCase().startsWith('INOPERATIVO');

  // acc[eqId] = {eq,tipo, sem:{fecha:{op,inop}}, cor:{fecha:{op,inop}}}
  const acc={};
  (DB.partes||[]).forEach(function(p){
    if(!p.fecha||!p.eqId)return;
    const eq=(DB.equipos||[]).find(e=>e.id===p.eqId);
    const tipoEq=eq?(eq.tipo||''):'';
    if(!TIPOS_MEN.includes(tipoEq))return;
    if(filMen&&tipoEq!==filMen)return;
    const enSem=p.fecha>=fIni&&p.fecha<=fFin;
    const enCor=p.fecha>=cIni&&p.fecha<=cFin;
    if(!enSem&&!enCor)return;
    if(!acc[p.eqId])acc[p.eqId]={eq,tipo:tipoEq,sem:{},cor:{}};
    const a=acc[p.eqId];
    const marca=obj=>{
      if(!obj[p.fecha])obj[p.fecha]={op:false,inop:false};
      if(esInop(p))obj[p.fecha].inop=true;else obj[p.fecha].op=true;
    };
    if(enSem)marca(a.sem);
    if(enCor)marca(a.cor);
  });

  // Un día cuenta como operativo si tuvo al menos un parte operativo; inoperativo solo si todos sus partes fueron inoperativos
  const cuenta=obj=>{
    let op=0,inop=0;
    Object.values(obj).forEach(d=>{if(d.op)op++;else if(d.inop)inop++;});
    return{op,inop};
  };
  const rows=Object.entries(acc).map(([id,a])=>{
    const s=cuenta(a.sem),c=cuenta(a.cor);
    return{id,eq:a.eq,tipo:a.tipo,semOp:s.op,semInop:s.inop,corOp:c.op,corInop:c.inop};
  }).sort((x,y)=>y.corOp-x.corOp);

  const grupos={};
  rows.forEach(r=>{if(!grupos[r.tipo])grupos[r.tipo]=[];grupos[r.tipo].push(r);});
  const tiposOrden=Object.keys(grupos).sort();

  const utilCol=u=>u>=80?'#10b981':u>=60?'#f59e0b':'#ef4444';
  const dispPct=(op,inop,dias)=>Math.max(0,(op-inop)/dias*100);
  const dispCell=(op,inop,dias,TD)=>{
    if(!op&&!inop)return`<td style="${TD};text-align:right;color:var(--muted)">—</td>`;
    const u=dispPct(op,inop,dias);
    return`<td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:${utilCol(u)}">${u.toFixed(1)}%</td>`;
  };

  const TH='padding:.45rem .55rem;font-size:.62rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted2);white-space:nowrap;border:1px solid var(--border)';
  const TD='padding:.42rem .6rem;border:1px solid var(--border);font-size:.75rem;vertical-align:middle';

  // Barra superior
  const inpS='font-size:.72rem;padding:.2rem .4rem;border-radius:5px;border:1px solid var(--border);background:var(--panel2);color:var(--text);flex-shrink:0';
  const tiposEq=['',...TIPOS_MEN];
  const bar=`<div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;margin-bottom:.8rem;padding:.4rem .7rem;background:var(--panel2);border:1px solid var(--border);border-radius:8px">
    <span style="font-size:.62rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.08em">Corte</span>
    <span style="font-size:.7rem;font-family:monospace;font-weight:700;color:#a78bfa;background:rgba(139,92,246,.12);border:1px solid rgba(139,92,246,.35);border-radius:6px;padding:.18rem .55rem;white-space:nowrap">${corteLbl} · ${diasCorte} días</span>
    <div style="width:1px;height:18px;background:var(--border)"></div>
    <span style="font-size:.62rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.08em">Semana</span>
    <button onclick="_phNav(-7)" style="background:none;border:1px solid var(--border);border-radius:5px;color:var(--text);cursor:pointer;font-size:.85rem;padding:.12rem .5rem" title="Semana anterior">‹</button>
    <input type="date" value="${_phSemIni}" onchange="_phSemIni=this.value;rPanelHoras()" style="${inpS};width:135px">
    <button onclick="_phNav(7)" style="background:none;border:1px solid var(--border);border-radius:5px;color:var(--text);cursor:pointer;font-size:.85rem;padding:.12rem .5rem" title="Semana siguiente">›</button>
    <span style="font-size:.72rem;color:var(--ceq);font-weight:700;font-family:monospace;white-space:nowrap">${semLbl}</span>
    <div style="width:1px;height:18px;background:var(--border)"></div>
    <span style="font-size:.62rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.08em">Tipo</span>
    <div style="display:flex;gap:.2rem;flex-wrap:wrap">
      ${tiposEq.map(t=>{
        const sel=filMen===t;
        return`<button onclick="_phTipoFiltro='${t}';rPanelHoras()" style="font-size:.62rem;padding:.2rem .5rem;border-radius:5px;border:1px solid ${sel?'var(--ceq)':'var(--border)'};background:${sel?'rgba(249,115,22,.15)':'transparent'};color:${sel?'var(--ceq)':'var(--muted2)'};cursor:pointer;white-space:nowrap;font-weight:${sel?'700':'400'}">${t||'Todos'}</button>`;
      }).join('')}
    </div>
    <button onclick="_phSemExport()" style="margin-left:auto;font-size:.7rem;padding:.25rem .7rem;border-radius:5px;border:none;background:#166534;color:#fff;cursor:pointer;font-weight:700;white-space:nowrap">📊 Excel</button>
  </div>`;

  // Filas agrupadas por tipo
  let body='';
  tiposOrden.forEach(function(tipo){
    const items=grupos[tipo];
    body+=`<tr><td colspan="8" style="padding:.45rem .7rem;background:rgba(249,115,22,.07);border:1px solid var(--border);color:var(--ceq);font-size:.71rem;font-weight:800;text-transform:uppercase;letter-spacing:.06em">▶ ${tipo} · ${items.length} equipo(s)</td></tr>`;
    items.forEach(function(r){
      body+=`<tr>
        <td style="${TD};white-space:nowrap">
          <span class="mono" style="font-weight:700;color:#06b6d4;cursor:pointer;text-decoration:underline dotted;text-underline-offset:3px" ondblclick="editEquipo(${r.id})" title="Doble click: editar en Master">${r.eq?r.eq.codigo:'#'+r.id}</span>
          <div style="font-size:.62rem;color:var(--muted2)">${r.eq?((r.eq.sub||'')+' '+(r.eq.marca||'')):''}</div>
        </td>
        <td style="${TD};text-align:right;font-family:monospace;font-weight:700;color:#10b981">${r.semOp||'—'}</td>
        <td style="${TD};text-align:right;font-family:monospace;font-weight:700;color:${r.semInop?'#ef4444':'var(--muted)'}">${r.semInop||'—'}</td>
        ${dispCell(r.semOp,r.semInop,7,TD)}
        <td style="${TD};text-align:right;font-family:monospace;font-weight:700;color:#10b981;background:rgba(148,163,184,.05)">${r.corOp||'—'}</td>
        <td style="${TD};text-align:right;font-family:monospace;font-weight:700;color:${r.corInop?'#ef4444':'var(--muted)'};background:rgba(148,163,184,.05)">${r.corInop||'—'}</td>
        <td style="${TD};text-align:center;font-family:monospace;color:var(--muted2);background:rgba(148,163,184,.05)">${diasCorte}</td>
        ${dispCell(r.corOp,r.corInop,diasCorte,TD+';background:rgba(148,163,184,.05)')}
      </tr>`;
    });
  });

  // Totales
  const tSemOp=rows.reduce((s,r)=>s+r.semOp,0),tSemInop=rows.reduce((s,r)=>s+r.semInop,0);
  const tCorOp=rows.reduce((s,r)=>s+r.corOp,0),tCorInop=rows.reduce((s,r)=>s+r.corInop,0);
  const n=rows.length;
  const uSem=n?dispPct(tSemOp,tSemInop,n*7):0;
  const uCor=n?dispPct(tCorOp,tCorInop,n*diasCorte):0;

  // Exportación
  _phExport={
    name:'disponibilidad_menores_'+fIni+'.xlsx',
    aoa:[
      ['DISPONIBILIDAD VEHÍCULOS Y EQUIPOS MENORES — Semana '+semLbl+' — Corte '+corteLbl+' ('+diasCorte+' días)'+(filMen?' — '+filMen:'')],
      ['Equipo','Tipo','Sem D.Oper.','Sem D.Inop.','Sem Disp.%','Corte D.Oper.','Corte D.Inop.','Días Corte','Corte Disp.%'],
      ...rows.map(r=>[
        r.eq?r.eq.codigo:('#'+r.id),r.tipo,
        r.semOp,r.semInop,+dispPct(r.semOp,r.semInop,7).toFixed(1),
        r.corOp,r.corInop,diasCorte,+dispPct(r.corOp,r.corInop,diasCorte).toFixed(1)
      ]),
      ['TOTAL','',tSemOp,tSemInop,+uSem.toFixed(1),tCorOp,tCorInop,'',+uCor.toFixed(1)]
    ]
  };

  el.innerHTML=bar+`
  <div class="kpi-row">
    <div class="kpi" style="--kc:${utilCol(uSem)}"><div class="kpi-lbl">Disponibilidad de la Semana</div><div class="kpi-val" style="font-size:1.5rem;color:${utilCol(uSem)}">${n?uSem.toFixed(1)+'%':'—'}</div></div>
    <div class="kpi" style="--kc:${utilCol(uCor)}"><div class="kpi-lbl">Disponibilidad del Corte</div><div class="kpi-val" style="font-size:1.5rem;color:${utilCol(uCor)}">${n?uCor.toFixed(1)+'%':'—'}</div></div>
    <div class="kpi" style="--kc:#ef4444"><div class="kpi-lbl">Días Inoperativos (Corte)</div><div class="kpi-val" style="font-size:1.5rem">${tCorInop}</div></div>
    <div class="kpi" style="--kc:#06b6d4"><div class="kpi-lbl">Equipos con Partes</div><div class="kpi-val" style="font-size:1.5rem">${n}</div></div>
  </div>
  <div class="card" style="padding:0">
    <div class="tbl-wrap">
    <table style="min-width:100%;border-collapse:collapse">
      <thead>
        <tr style="background:var(--panel2)">
          <th style="${TH};text-align:left;min-width:140px" rowspan="2">Tipo / Equipo</th>
          <th style="${TH};text-align:center;background:rgba(59,130,246,.10);color:#60a5fa" colspan="3">Semana (${rango}) · 7 días</th>
          <th style="${TH};text-align:center;background:rgba(148,163,184,.08)" colspan="4">Corte (${corteLbl})</th>
        </tr>
        <tr style="background:var(--panel2)">
          <th style="${TH};text-align:right;background:rgba(59,130,246,.06)" title="Días con parte operativo (trabajado, standby o mixto)">D. Oper.</th>
          <th style="${TH};text-align:right;background:rgba(59,130,246,.06)" title="Días con parte inoperativo (falla mecánica)">D. Inop.</th>
          <th style="${TH};text-align:right;background:rgba(59,130,246,.06)">Disp. %</th>
          <th style="${TH};text-align:right;background:rgba(148,163,184,.05)">D. Oper.</th>
          <th style="${TH};text-align:right;background:rgba(148,163,184,.05)">D. Inop.</th>
          <th style="${TH};text-align:center;background:rgba(148,163,184,.05)">Días Corte</th>
          <th style="${TH};text-align:right;background:rgba(148,163,184,.05)">Disp. %</th>
        </tr>
      </thead>
      <tbody>${body||`<tr><td colspan="8" style="text-align:center;padding:2.5rem;color:var(--muted2);font-size:.85rem">Sin partes de Vehículos/Equipos Menores en esta semana (${rango}) ni en el corte (${corteLbl})</td></tr>`}</tbody>
      ${n?`<tfoot><tr style="background:var(--panel2);border-top:2px solid var(--border)">
        <td style="${TD};font-size:.65rem;font-weight:700;color:var(--muted2);text-transform:uppercase">TOTAL GENERAL</td>
        <td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:#10b981">${tSemOp}</td>
        <td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:${tSemInop?'#ef4444':'var(--muted)'}">${tSemInop||'—'}</td>
        <td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:${utilCol(uSem)}">${uSem.toFixed(1)}%</td>
        <td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:#10b981">${tCorOp}</td>
        <td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:${tCorInop?'#ef4444':'var(--muted)'}">${tCorInop||'—'}</td>
        <td style="${TD};text-align:center;font-family:monospace;color:var(--muted2)">${diasCorte}</td>
        <td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:${utilCol(uCor)}">${uCor.toFixed(1)}%</td>
      </tr></tfoot>`:''}
    </table>
    </div>
  </div>
  <div style="margin-top:.5rem;font-size:.64rem;color:var(--muted2);display:flex;gap:1rem;flex-wrap:wrap;align-items:center">
    <span><span style="color:#10b981">●</span> ≥80% — Bueno</span>
    <span><span style="color:#f59e0b">●</span> 60–79% — Alerta</span>
    <span><span style="color:#ef4444">●</span> &lt;60% — Crítico</span>
    <span style="margin-left:auto">ⓘ Disp. = (D. Oper. − D. Inop.) ÷ días del período (semana = 7 · corte = ${diasCorte}) · D. Oper. = días con parte operativo/standby · D. Inop. = días donde todos los partes fueron INOPERATIVO (falla mecánica) · Total = promedio sobre ${n} equipo(s)</span>
  </div>`;
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

// ══ REPORTE DE EQUIPOS ══
let _reqCache=[];

function _reqOnTipoChange(){
  const tipo=(document.getElementById('reqFiltTipo')||{}).value||'';
  const codSel=document.getElementById('reqFiltCod');
  if(codSel){
    const eqsFilt=(DB.equipos||[]).filter(e=>!tipo||e.tipo===tipo);
    codSel.innerHTML='<option value="">— Todos —</option>'+
      eqsFilt.sort((a,b)=>a.codigo.localeCompare(b.codigo))
        .map(e=>`<option value="${e.id}">${e.codigo}${e.placa?' ['+e.placa+']':''}</option>`).join('');
  }
  rReporteEquipos();
}

function rReporteEquipos(){
  const TIPOS_EQ=['Línea Amarilla','Línea Blanca','Vehículo Menor','Equipos Menores'];
  const fTipo=(document.getElementById('reqFiltTipo')||{}).value||'';
  const fCodId=(document.getElementById('reqFiltCod')||{}).value||'';
  const eqs=(DB.equipos||[]).filter(e=>TIPOS_EQ.includes(e.tipo)&&(!fTipo||e.tipo===fTipo));
  const fEq=fCodId?+fCodId||0:0;
  const fDesde=(document.getElementById('reqFiltDesde')||{}).value||'';
  const fHasta=(document.getElementById('reqFiltHasta')||{}).value||'';
  const hMinDia=+(document.getElementById('reqHmin')||{}).value||0;
  const hMinMes=+(document.getElementById('reqHminMes')||{}).value||0;
  const _esVMFilt=fTipo==='Vehículo Menor';
  // Encabezados dinámicos según tipo filtrado
  const _hdrIni=document.getElementById('thColIni'),_hdrFin=document.getElementById('thColFin'),_hdrTrab=document.getElementById('thColTrab');
  if(_hdrIni)_hdrIni.textContent=_esVMFilt?'Km Inicial':'Hr Inicial';
  if(_hdrFin)_hdrFin.textContent=_esVMFilt?'Km Final':'Hr Final';
  if(_hdrTrab)_hdrTrab.textContent=_esVMFilt?'Km Recorridos':'Hs Trabajadas';

  let partes=[...(DB.partes||[])];
  if(fEq)partes=partes.filter(p=>p.eqId===fEq);
  else partes=partes.filter(p=>eqs.some(e=>e.id===p.eqId));
  if(fDesde)partes=partes.filter(p=>p.fecha>=fDesde);
  if(fHasta)partes=partes.filter(p=>p.fecha<=fHasta);
  partes=[...partes].sort((a,b)=>a.fecha.localeCompare(b.fecha));
  _reqCache=partes;

  // KPIs
  const totEf=partes.reduce((s,p)=>s+Math.max(0,+p.ef||0),0);
  const totIm=partes.reduce((s,p)=>s+(+p.im||0),0);
  const diasHmin=partes.filter(p=>hMinDia>0?(+p.ef||0)>=hMinDia:false).length;
  const stanby=hMinMes>0?Math.max(0,parseFloat((hMinMes-totEf).toFixed(2))):0;

  // ── UTILIZACIÓN DE EQUIPO: hs efectivas ÷ hs disponibles (días del período × jornada) ──
  const jornada=hMinDia>0?hMinDia:10;
  let diasPer=0;
  if(partes.length){
    const d1=fDesde||partes[0].fecha,d2=fHasta||partes[partes.length-1].fecha;
    diasPer=Math.max(1,Math.round((new Date(d2+'T12:00')-new Date(d1+'T12:00'))/864e5)+1);
  }
  const hsDisp=diasPer*jornada;
  const utilByEq={};
  partes.forEach(p=>{
    if(!utilByEq[p.eqId])utilByEq[p.eqId]={ef:0,im:0,dias:new Set()};
    utilByEq[p.eqId].ef+=Math.max(0,+p.ef||0);utilByEq[p.eqId].im+=(+p.im||0);utilByEq[p.eqId].dias.add(p.fecha);
  });
  const utilRows=Object.entries(utilByEq).map(([id,d])=>{
    const eq=DB.equipos.find(e=>e.id==id);
    return{eq,ef:d.ef,im:d.im,dias:d.dias.size,util:hsDisp>0?d.ef/hsDisp*100:0};
  }).sort((a,b)=>b.util-a.util);
  const utilGlob=utilRows.length&&hsDisp>0?totEf/(utilRows.length*hsDisp)*100:0;
  const _uCol=u=>u>=70?'#10b981':u>=40?'#f59e0b':'#ef4444';

  const kpiEl=document.getElementById('reqKpis');
  if(kpiEl)kpiEl.innerHTML=[
    {l:'Total Partes',v:partes.length,c:'var(--ceq)',ic:'📋'},
    {l:'Hs Efectivas',v:parseFloat(totEf.toFixed(2))+'h',c:'#10b981',ic:'⚙️'},
    {l:'Hs Inoperativas',v:parseFloat(totIm.toFixed(2))+'h',c:'#ef4444',ic:'🛑'},
    {l:'Utilización',v:partes.length?utilGlob.toFixed(0)+'%':'—',c:partes.length?_uCol(utilGlob):'var(--muted2)',ic:'📈'},
    {l:'Días Hmin Cumpl.',v:diasHmin,c:'#f59e0b',ic:'✅'},
    {l:'Hs Stanby a Pagar',v:stanby+'h',c:'#8b5cf6',ic:'⏸️'}
  ].map(k=>`<div class="kpi" style="--kc:${k.c}"><div class="kpi-lbl">${k.ic} ${k.l}</div><div class="kpi-val">${k.v}</div></div>`).join('');

  // Tabla de utilización por equipo
  const utilEl=document.getElementById('reqUtil');
  if(utilEl){
    utilEl.innerHTML=!utilRows.length?'':`<div class="card">
      <div class="card-head"><span class="card-title">📈 Utilización de Equipos</span>
        <span style="font-size:.63rem;color:var(--muted2)">Hs efectivas ÷ Hs disponibles · ${diasPer} día${diasPer===1?'':'s'} × ${jornada}h jornada = ${fmtN(hsDisp)}h por equipo</span>
      </div>
      <div class="card-body" style="padding:0"><div class="tbl-wrap"><table style="font-size:.72rem">
        <thead><tr style="font-size:.62rem;text-transform:uppercase;letter-spacing:.06em">
          <th>Código</th><th>Equipo</th><th>Tipo</th><th class="tr">Días c/Parte</th><th class="tr">Hs Efectivas</th><th class="tr">Hs Inop.</th><th style="min-width:190px">Utilización</th>
        </tr></thead>
        <tbody>
        ${utilRows.map(r=>{
          const c=_uCol(r.util);
          const pct=Math.min(100,Math.round(r.util));
          return`<tr>
            <td class="mono" style="color:var(--ceq);font-weight:700">${r.eq?r.eq.codigo:'—'}</td>
            <td>${r.eq?(r.eq.nombre||'').split(' ').slice(0,4).join(' '):'—'}</td>
            <td><span class="badge b-cyan" style="font-size:.6rem">${r.eq?(r.eq.sub||r.eq.tipo||'—'):'—'}</span></td>
            <td class="tr mono">${r.dias}</td>
            <td class="tr mono" style="color:#10b981;font-weight:700">${parseFloat(r.ef.toFixed(2))}h</td>
            <td class="tr mono" style="color:${r.im>0?'#ef4444':'var(--muted2)'}">${r.im>0?parseFloat(r.im.toFixed(2))+'h':'—'}</td>
            <td><div style="display:flex;align-items:center;gap:.5rem">
              <div style="flex:1;background:var(--border);border-radius:4px;height:8px;overflow:hidden">
                <div style="height:100%;width:${pct}%;background:${c};border-radius:4px"></div>
              </div>
              <span class="mono" style="color:${c};font-weight:800;min-width:48px;text-align:right">${r.util.toFixed(1)}%</span>
            </div></td>
          </tr>`;
        }).join('')}
        </tbody>
      </table></div></div>
    </div>`;
  }

  // Tabla
  const tb=document.getElementById('tbReporteEquipos');
  if(tb){
    if(!partes.length){
      tb.innerHTML='<tr><td colspan="11" style="text-align:center;padding:1.2rem;color:var(--muted2)">Sin partes para los filtros seleccionados.</td></tr>';
    }else{
      tb.innerHTML=partes.map(p=>{
        const eq=DB.equipos.find(e=>e.id===p.eqId);
        const ef=+p.ef||0;
        const esVM=eq?.tipo==='Vehículo Menor';
        const kmIni=+p.kmIni||0,kmFin=+p.kmFin||0,kmRec=kmFin>kmIni?kmFin-kmIni:0;
        const cumple=hMinDia>0?(esVM?kmRec>=hMinDia:ef>=hMinDia):null;
        const hminCell=cumple===null?'—':cumple?'<span style="color:#10b981;font-weight:700">SI</span>':'<span style="color:#ef4444;font-weight:600">NO</span>';
        const colIni=esVM?(kmIni>0?fmtN(kmIni)+' km':'—'):(+p.hrIni||+p.hrIni===0?parseFloat((+p.hrIni).toFixed(1)):'—');
        const colFin=esVM?(kmFin>0?fmtN(kmFin)+' km':'—'):(+p.hrFin||+p.hrFin===0?parseFloat((+p.hrFin).toFixed(1)):'—');
        const colTrab=esVM?(kmRec>0?fmtN(kmRec)+' km':'—'):(ef>0?parseFloat(ef.toFixed(2))+'h':'—');
        const colTrabColor=esVM?(kmRec>0?'#10b981':'var(--muted2)'):(ef>0?'#10b981':'var(--muted2)');
        return`<tr>
          <td class="mono">${p.fecha}</td>
          <td><span class="badge b-blue" style="font-size:.62rem">${p.turno||'—'}</span></td>
          <td>${eq?`<span class="badge b-cyan" style="font-size:.62rem">${eq.tipo||eq.sub||''}</span>`:''}</td>
          <td class="mono" style="color:var(--ceq);font-weight:700">${eq?eq.codigo:'—'}</td>
          <td class="mono">${colIni}</td>
          <td class="mono">${colFin}</td>
          <td class="mono" style="font-weight:700;color:${colTrabColor}">${colTrab}</td>
          <td style="text-align:center">${hminCell}</td>
          <td style="max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${p.areaT||''}">${p.areaT||'—'}</td>
          <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${p.act||''}">${p.act||'—'}</td>
          <td style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${p.observaciones||''}">${p.observaciones||'—'}</td>
        </tr>`;
      }).join('');
    }
  }

  // Totales en tfoot
  const totKmRec=_esVMFilt?partes.reduce((s,p)=>{const ki=+p.kmIni||0,kf=+p.kmFin||0;return s+(kf>ki?kf-ki:0);},0):0;
  const tf=document.getElementById('tfReporteEquipos');
  if(tf&&partes.length){
    tf.innerHTML=`
      <tr style="background:rgba(30,58,95,.25);font-weight:700;border-top:2px solid var(--ceq)">
        <td colspan="6" style="text-align:right;padding:.4rem .6rem;font-size:.7rem;text-transform:uppercase;letter-spacing:.05em;color:var(--muted2)">${_esVMFilt?'Km Recorridos Total':'Hs Efectivas Total'}</td>
        <td class="mono" style="color:#10b981;font-weight:800">${_esVMFilt?fmtN(totKmRec)+' km':parseFloat(totEf.toFixed(2))+'h'}</td>
        <td colspan="4"></td>
      </tr>
      ${hMinMes>0&&!_esVMFilt?`<tr style="background:rgba(30,58,95,.15)">
        <td colspan="6" style="text-align:right;padding:.3rem .6rem;font-size:.7rem;text-transform:uppercase;letter-spacing:.05em;color:var(--muted2)">Hs Stanby a Pagar</td>
        <td class="mono" style="color:#8b5cf6;font-weight:700">${stanby}h</td>
        <td colspan="4"></td>
      </tr>
      <tr style="background:rgba(30,58,95,.1)">
        <td colspan="6" style="text-align:right;padding:.3rem .6rem;font-size:.7rem;text-transform:uppercase;letter-spacing:.05em;color:var(--muted2)">Total = Hmin Mes</td>
        <td class="mono" style="color:var(--ceq);font-weight:800">${hMinMes}h</td>
        <td colspan="4"></td>
      </tr>`:''}`;
  }else if(tf){
    tf.innerHTML='';
  }
  if(typeof _notifActualizarBotones==='function')_notifActualizarBotones();
}

function exportReporteEquiposXLSX(){
  if(!_reqCache||!_reqCache.length){toast('Sin datos para exportar',true);return;}
  const hMinDia=+(document.getElementById('reqHmin')||{}).value||0;
  const hMinMes=+(document.getElementById('reqHminMes')||{}).value||0;
  const fEq=+(document.getElementById('reqFiltEq')||{}).value||0;
  const fDesde=(document.getElementById('reqFiltDesde')||{}).value||'';
  const fHasta=(document.getElementById('reqFiltHasta')||{}).value||'';
  const eqNom=fEq?(DB.equipos.find(e=>e.id===fEq)||{}).codigo||'':' (Todos)';
  const periodo=(fDesde||'—')+' al '+(fHasta||'—');

  const S=(v,bold,bg,color,align,border)=>({v,t:'s',s:{
    font:{bold:!!bold,color:{rgb:color||'111111'},sz:9},
    fill:bg?{fgColor:{rgb:bg}}:{},
    alignment:{horizontal:align||'left',vertical:'center',wrapText:true},
    border:border?{top:{style:'thin',color:{rgb:'94a3b8'}},bottom:{style:'thin',color:{rgb:'94a3b8'}},left:{style:'thin',color:{rgb:'94a3b8'}},right:{style:'thin',color:{rgb:'94a3b8'}}}:{}
  }});
  const N=(v,bold,bg,color,align)=>({v:isNaN(v)?0:v,t:'n',s:{
    font:{bold:!!bold,color:{rgb:color||'111111'},sz:9,name:'Consolas'},
    fill:bg?{fgColor:{rgb:bg}}:{},
    alignment:{horizontal:align||'right',vertical:'center'},
    border:{top:{style:'thin',color:{rgb:'94a3b8'}},bottom:{style:'thin',color:{rgb:'94a3b8'}},left:{style:'thin',color:{rgb:'94a3b8'}},right:{style:'thin',color:{rgb:'94a3b8'}}}
  }});

  const HBOR={top:{style:'thin',color:{rgb:'94a3b8'}},bottom:{style:'thin',color:{rgb:'94a3b8'}},left:{style:'thin',color:{rgb:'94a3b8'}},right:{style:'thin',color:{rgb:'94a3b8'}}};
  const HDR='1E3A5F',HDRT='FFFFFF',SUBBG='EFF6FF',TOTBG='DBEAFE';

  const wsData=[];
  // Header info rows
  wsData.push([S('REPORTE DE EQUIPOS – VALORIZACIÓN',true,HDR,HDRT,'center'),...Array(10).fill(S('',false,HDR,HDRT))]);
  wsData.push([S(`Equipo: ${eqNom}`,true),...Array(10).fill(S(''))]);
  wsData.push([S(`Período: ${periodo}`),...Array(10).fill(S(''))]);
  wsData.push([S(`Hs Mínimas/día: ${hMinDia}h   |   Hmin Mes: ${hMinMes}h`),...Array(10).fill(S(''))]);
  wsData.push(Array(11).fill(S('')));

  // Column headers
  const cols=['FECHA','TURNO','TIPO DE EQUIPO','CÓDIGO','HR INICIAL','HR FINAL','HS TRABAJADAS','HS MÍNIMAS','ÁREA DE TRABAJO','DESCRIPCIÓN DEL TRABAJO','OBSERVACIONES'];
  wsData.push(cols.map(c=>({v:c,t:'s',s:{font:{bold:true,color:{rgb:HDRT},sz:8},fill:{fgColor:{rgb:HDR}},alignment:{horizontal:'center',vertical:'center'},border:HBOR}})));

  let totEf=0;
  _reqCache.forEach(p=>{
    const eq=DB.equipos.find(e=>e.id===p.eqId);
    const ef=+p.ef||0;
    totEf+=ef;
    const cumple=hMinDia>0?ef>=hMinDia:null;
    wsData.push([
      S(p.fecha,false,SUBBG,'334155','center',true),
      S(p.turno||'',false,'','334155','center',true),
      S(eq?eq.tipo||eq.sub||'':'',false,'','334155','center',true),
      S(eq?eq.codigo:'',true,'','1e6196','center',true),
      N(+p.hrIni||0,false,SUBBG,'334155','right'),
      N(+p.hrFin||0,false,SUBBG,'334155','right'),
      ({v:parseFloat(ef.toFixed(2)),t:'n',s:{font:{bold:true,color:{rgb:ef>0?'0f6b3d':'ef4444'},sz:9,name:'Consolas'},fill:{fgColor:{rgb:'f0fdf4'}},alignment:{horizontal:'right',vertical:'center'},border:HBOR}}),
      S(cumple===null?'—':cumple?'SI':'NO',true,'',cumple===null?'64748b':cumple?'0f6b3d':'dc2626','center',true),
      S(p.areaT||'—',false,'','334155','left',true),
      S(p.act||'—',false,'','334155','left',true),
      S(p.observaciones||'—',false,'','334155','left',true),
    ]);
  });

  // Footer totals
  wsData.push(Array(11).fill(S('')));
  const stanby=hMinMes>0?parseFloat(Math.max(0,hMinMes-totEf).toFixed(2)):0;
  wsData.push([S('Hs Efectivas Total',true,TOTBG,'1e3a5f','right',true),...Array(5).fill(S('',false,TOTBG)),
    ({v:parseFloat(totEf.toFixed(2)),t:'n',s:{font:{bold:true,color:{rgb:'0f6b3d'},sz:10,name:'Consolas'},fill:{fgColor:{rgb:TOTBG}},alignment:{horizontal:'right'},border:HBOR}}),
    ...Array(4).fill(S('',false,TOTBG))]);
  if(hMinMes>0){
    wsData.push([S('Hs Stanby a Pagar',true,TOTBG,'5b21b6','right',true),...Array(5).fill(S('',false,TOTBG)),
      ({v:stanby,t:'n',s:{font:{bold:true,color:{rgb:'5b21b6'},sz:10,name:'Consolas'},fill:{fgColor:{rgb:TOTBG}},alignment:{horizontal:'right'},border:HBOR}}),
      ...Array(4).fill(S('',false,TOTBG))]);
    wsData.push([S('Total = Hmin Mes',true,HDR,HDRT,'right',true),...Array(5).fill(S('',false,HDR,HDRT)),
      ({v:hMinMes,t:'n',s:{font:{bold:true,color:{rgb:HDRT},sz:10,name:'Consolas'},fill:{fgColor:{rgb:HDR}},alignment:{horizontal:'right'},border:HBOR}}),
      ...Array(4).fill(S('',false,HDR,HDRT))]);
  }

  const ws=XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols']=[{wch:12},{wch:9},{wch:18},{wch:12},{wch:11},{wch:11},{wch:14},{wch:11},{wch:18},{wch:32},{wch:22}];
  ws['!merges']=[
    {s:{r:0,c:0},e:{r:0,c:10}},
    {s:{r:1,c:0},e:{r:1,c:10}},
    {s:{r:2,c:0},e:{r:2,c:10}},
    {s:{r:3,c:0},e:{r:3,c:10}},
  ];
  ws['!rows']=[{hpt:18},{hpt:14},{hpt:14},{hpt:14},{hpt:6},{hpt:20}];

  const wb=XLSX.utils.book_new();
  const sheetName=('Reporte_'+(eqNom||'Equipos')).substring(0,31);
  XLSX.utils.book_append_sheet(wb,ws,sheetName);
  const fname=`Reporte_Equipos_${(eqNom||'todos').replace(/[^a-zA-Z0-9]/g,'_')}_${fDesde||'inicio'}_${fHasta||'fin'}.xlsx`;
  XLSX.writeFile(wb,fname);
  toast('Excel generado: '+fname);
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

