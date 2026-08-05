// ══════════════════════════════════════════════════════════════════════════
//  INFORME DE PERÍODO — consolidado gerencial
//  Reúne en un solo documento lo que ocurrió en el período: horas de equipos,
//  personal, atenciones mecánicas, combustible y consumo de almacén.
//  Todo es derivado (solo lectura); no crea ni modifica registros.
// ══════════════════════════════════════════════════════════════════════════

let _ipOffset=0,_ipDesde='',_ipHasta='',_ipNotas='';
const _IP_MESES=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const _IP_HH_DIA=10;   // horas hombre por jornada (mismo criterio que el Tareaje)

function _ipN(n,d){return Number(n||0).toLocaleString('es-PE',{minimumFractionDigits:d==null?1:d,maximumFractionDigits:d==null?1:d});}
function _ipEsc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function _ipDMY(f){const p=String(f||'').split('-');return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:(f||'');}

// Período 21 → 20
function _ipPeriodo(off){
  const hoy=new Date(),d=hoy.getDate();
  let baseY=hoy.getFullYear(),baseM=hoy.getMonth();
  if(d<21){baseM--;if(baseM<0){baseM=11;baseY--;}}
  let iniM=baseM+(off||0),iniY=baseY;
  while(iniM>11){iniM-=12;iniY++;}
  while(iniM<0){iniM+=12;iniY--;}
  const ini=new Date(iniY,iniM,21),fin=new Date(iniY,iniM+1,20);
  const f=x=>`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;
  return{desde:f(ini),hasta:f(fin),label:`${_IP_MESES[fin.getMonth()]} ${fin.getFullYear()}`};
}
function _ipInit(){
  if(!_ipDesde||!_ipHasta){const p=_ipPeriodo(_ipOffset);_ipDesde=p.desde;_ipHasta=p.hasta;}
}
function _ipNav(dir){_ipOffset+=dir;const p=_ipPeriodo(_ipOffset);_ipDesde=p.desde;_ipHasta=p.hasta;rInformePeriodo();}
function _ipSetFecha(campo,v){if(campo==='desde')_ipDesde=v;else _ipHasta=v;rInformePeriodo();}
function _ipSetNotas(v){_ipNotas=v;}

// ══ CÁLCULO DE TODOS LOS BLOQUES ══
function _ipDatos(){
  _ipInit();
  const D=_ipDesde,H=_ipHasta;
  const enRango=f=>f&&f>=D&&f<=H;
  const dias=Math.max(1,Math.round((new Date(H+'T12:00')-new Date(D+'T12:00'))/864e5)+1);

  // ── 1. EQUIPOS (partes diarios) ──
  const partes=(DB.partes||[]).filter(p=>enRango(p.fecha));
  const eqMap={};
  partes.forEach(p=>{
    const eq=(DB.equipos||[]).find(e=>e.id===p.eqId);
    if(!eqMap[p.eqId])eqMap[p.eqId]={id:p.eqId,cod:eq?eq.codigo:'—',nom:eq?(eq.nombre||''):'',tipo:eq?(eq.tipo||'Otros'):'Otros',
      calent:eq?(+eq.calentamientoH||0):0,motor:0,cal:0,efec:0,inop:0,partes:0,turnos:{D:0,N:0}};
    const x=eqMap[p.eqId];
    const motor=+p.ef||0;
    const cal=motor>0?x.calent:0;
    x.motor+=motor;x.cal+=cal;x.efec+=Math.max(0,motor-cal);
    x.inop+=Math.max(0,+p.im||0);
    x.partes++;
    const t=String(p.turno||'').toUpperCase();
    if(t.startsWith('N'))x.turnos.N++;else x.turnos.D++;
  });
  const equipos=Object.values(eqMap).map(x=>{
    const disp=dias*24;
    return{...x,motor:+x.motor.toFixed(1),cal:+x.cal.toFixed(1),efec:+x.efec.toFixed(1),inop:+x.inop.toFixed(1),
      dispMec:disp>0?Math.max(0,Math.min(100,(disp-x.inop)/disp*100)):100};
  }).sort((a,b)=>b.motor-a.motor);
  const eqTot={motor:equipos.reduce((s,e)=>s+e.motor,0),efec:equipos.reduce((s,e)=>s+e.efec,0),
    inop:equipos.reduce((s,e)=>s+e.inop,0),partes:equipos.reduce((s,e)=>s+e.partes,0)};
  const porTipoEq={};
  equipos.forEach(e=>{if(!porTipoEq[e.tipo])porTipoEq[e.tipo]={n:0,motor:0};porTipoEq[e.tipo].n++;porTipoEq[e.tipo].motor+=e.motor;});

  // ── 2. PERSONAL (tareaje) ──
  const tar=(DB.tareaje||[]).filter(r=>enRango(r.fecha));
  const ct=t=>tar.filter(r=>r.tipo===t).length;
  const idsPers=new Set(tar.map(r=>r.personalId));
  const jornadas=tar.filter(r=>['TD','TN','DLT','A5'].includes(r.tipo)).length;
  const perGuardia={},perCargo={};
  idsPers.forEach(id=>{
    const p=(DB.personal||[]).find(x=>x.id===id);if(!p)return;
    const g=p.guardia||'—',c=p.cargo||'—';
    if(!perGuardia[g])perGuardia[g]={n:0,jor:0};
    if(!perCargo[c])perCargo[c]={n:0,jor:0};
    const jor=tar.filter(r=>r.personalId===id&&['TD','TN','DLT','A5'].includes(r.tipo)).length;
    perGuardia[g].n++;perGuardia[g].jor+=jor;
    perCargo[c].n++;perCargo[c].jor+=jor;
  });
  const personal={
    total:idsPers.size,activos:(DB.personal||[]).filter(p=>(p.est||'Activo')==='Activo').length,
    td:ct('TD'),tn:ct('TN'),dl:ct('DL'),faltas:ct('F'),permisos:ct('P'),dm:ct('DM'),a5:ct('A5'),dlt:ct('DLT'),
    vac:ct('V'),jornadas,hh:jornadas*_IP_HH_DIA,
    porGuardia:Object.entries(perGuardia).sort((a,b)=>b[1].jor-a[1].jor),
    porCargo:Object.entries(perCargo).sort((a,b)=>b[1].jor-a[1].jor).slice(0,10)
  };

  // ── 3. ATENCIONES MECÁNICAS ──
  const auxs=(DB.auxiliosMecanicos||[]).filter(a=>enRango(a.fecha)&&a.est!=='Anulado');
  const porFalla={},porEqAux={};
  auxs.forEach(a=>{
    const t=a.tipo||'—';
    if(!porFalla[t])porFalla[t]={n:0,horas:0};
    porFalla[t].n++;porFalla[t].horas+=+a.tiempoParada||0;
    const eq=(DB.equipos||[]).find(e=>e.id===a.eqId);
    const k=eq?eq.codigo:'—';
    if(!porEqAux[k])porEqAux[k]={n:0,horas:0};
    porEqAux[k].n++;porEqAux[k].horas+=+a.tiempoParada||0;
  });
  const insumosAux=[];
  auxs.forEach(a=>{
    (DB.auxMecInsumos||[]).filter(i=>i.auxilioId===a.id).forEach(i=>{
      const cat=(DB.catalogoItems||[]).find(c=>String(c.cod).trim()===String(i.cod||'').trim());
      const pur=cat&&cat.pur?+cat.pur:0;
      insumosAux.push({cant:+i.cant||0,total:(+i.cant||0)*pur,almacen:/ALMAC/i.test(i.origen||'')});
    });
  });
  const mecanica={
    total:auxs.length,
    pend:auxs.filter(a=>a.est==='Pendiente').length,
    proc:auxs.filter(a=>a.est==='En Proceso').length,
    aten:auxs.filter(a=>a.est==='Atendido').length,
    horasParada:auxs.reduce((s,a)=>s+(+a.tiempoParada||0),0),
    equipos:new Set(auxs.map(a=>a.eqId)).size,
    porFalla:Object.entries(porFalla).sort((a,b)=>b[1].n-a[1].n),
    topEq:Object.entries(porEqAux).sort((a,b)=>b[1].n-a[1].n).slice(0,8),
    insumosVal:insumosAux.filter(i=>i.almacen).reduce((s,i)=>s+i.total,0),
    insumosLin:insumosAux.length
  };

  // ── 4. COMBUSTIBLE ──
  const comb=(DB.combustible||[]).filter(r=>enRango(r.fecha));
  const ing=comb.filter(r=>r.tipoMov==='Ingreso');
  const des=comb.filter(r=>r.tipoMov!=='Ingreso');
  const porEqComb={};
  des.forEach(r=>{
    const eq=(DB.equipos||[]).find(e=>e.id===r.eqId);
    const k=eq?eq.codigo:'—';
    if(!porEqComb[k])porEqComb[k]={gal:0,soles:0,n:0,eqId:r.eqId};
    porEqComb[k].gal+=+r.gal||0;
    porEqComb[k].soles+=(+r.gal||0)*(+r.precio||0);
    porEqComb[k].n++;
  });
  const galDes=des.reduce((s,r)=>s+(+r.gal||0),0);
  const combustible={
    galIng:ing.reduce((s,r)=>s+(+r.gal||0),0),
    galDes,
    solesDes:des.reduce((s,r)=>s+(+r.gal||0)*(+r.precio||0),0),
    nDes:des.length,nIng:ing.length,
    equipos:new Set(des.map(r=>r.eqId)).size,
    rend:eqTot.motor>0?galDes/eqTot.motor:0,
    topEq:Object.entries(porEqComb).sort((a,b)=>b[1].gal-a[1].gal).slice(0,10)
  };

  // ── 5. ALMACÉN ──
  const alm=(DB.almacen||[]).filter(r=>enRango(r.fecha));
  const ent=alm.filter(r=>r.tipo==='E'),sal=alm.filter(r=>r.tipo==='S');
  const valorizar=arr=>arr.reduce((s,r)=>{
    const cat=(DB.catalogoItems||[]).find(c=>String(c.cod).trim()===String(r.codigo||'').trim());
    return s+(+r.cant||0)*(cat&&cat.pur?+cat.pur:0);
  },0);
  const porItem={};
  sal.forEach(r=>{
    const k=r.codigo||r.nombre;
    const cat=(DB.catalogoItems||[]).find(c=>String(c.cod).trim()===String(r.codigo||'').trim());
    if(!porItem[k])porItem[k]={cod:r.codigo,nom:r.nombre,und:r.unidad,cant:0,soles:0,tipo:cat?cat.tipo:'—'};
    porItem[k].cant+=+r.cant||0;
    porItem[k].soles+=(+r.cant||0)*(cat&&cat.pur?+cat.pur:0);
  });
  const porTipoMat={};
  Object.values(porItem).forEach(i=>{
    const t=i.tipo||'—';
    if(!porTipoMat[t])porTipoMat[t]={n:0,soles:0};
    porTipoMat[t].n++;porTipoMat[t].soles+=i.soles;
  });
  const almacen={
    nEnt:ent.length,nSal:sal.length,
    valEnt:valorizar(ent),valSal:valorizar(sal),
    vales:new Set(sal.map(r=>r.numVale).filter(Boolean)).size,
    items:Object.keys(porItem).length,
    topItems:Object.values(porItem).sort((a,b)=>b.soles-a.soles||b.cant-a.cant).slice(0,10),
    porTipo:Object.entries(porTipoMat).sort((a,b)=>b[1].soles-a[1].soles)
  };

  return{desde:D,hasta:H,dias,equipos,eqTot,porTipoEq,personal,mecanica,combustible,almacen};
}

// ══ RENDER EN PANTALLA ══
function rInformePeriodo(){
  const cont=document.getElementById('ipBody');if(!cont)return;
  const d=_ipDatos();
  const per=_ipPeriodo(_ipOffset);
  const inpS='background:var(--panel2);border:1px solid var(--border);border-radius:6px;padding:.28rem .5rem;color:var(--text);font-size:.78rem;color-scheme:dark;width:auto';

  const kpi=(l,v,sub,c,ic)=>`<div class="kpi" style="--kc:${c};flex:1;min-width:145px"><div style="display:flex;justify-content:space-between;align-items:flex-start"><span class="kpi-lbl">${l}</span><span style="font-size:1.2rem;line-height:1;opacity:.75">${ic}</span></div><div class="kpi-val" style="font-size:1.75rem">${v}</div><div class="kpi-sub">${sub}</div></div>`;

  const TH='background:var(--panel2);color:var(--muted2);font-size:.62rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;padding:.38rem .5rem;white-space:nowrap';
  const TD='padding:.32rem .5rem;border-bottom:1px solid var(--border);font-size:.74rem';
  const seccion=(icono,titulo,color,contenido,extra)=>`
    <div class="card" style="margin-bottom:.9rem">
      <div class="card-head"><span class="card-title" style="color:${color}">${icono} ${titulo}</span>${extra||''}</div>
      <div class="card-body" style="padding:0;overflow-x:auto">${contenido}</div>
    </div>`;
  const mini=(arr,c1,c2)=>`<div style="display:flex;flex-wrap:wrap;gap:.4rem;padding:.6rem">${arr.map(([k,v])=>`<div style="background:var(--panel2);border:1px solid var(--border);border-radius:8px;padding:.35rem .7rem;font-size:.72rem"><span style="color:var(--muted2)">${_ipEsc(k)}</span> <strong style="color:${c1}">${v.n}</strong>${v.jor!=null?` <span style="color:${c2};font-size:.68rem">${v.jor} jor.</span>`:''}${v.horas!=null?` <span style="color:${c2};font-size:.68rem">${_ipN(v.horas)} h</span>`:''}${v.motor!=null?` <span style="color:${c2};font-size:.68rem">${_ipN(v.motor)} h</span>`:''}${v.soles!=null?` <span style="color:${c2};font-size:.68rem">S/ ${_ipN(v.soles,2)}</span>`:''}</div>`).join('')}</div>`;

  // Equipos
  const tEq=d.equipos.length?`<table style="width:100%;border-collapse:collapse;min-width:760px">
    <thead><tr><th style="${TH}">#</th><th style="${TH}">Equipo</th><th style="${TH};text-align:left">Descripción</th><th style="${TH}">Tipo</th>
      <th style="${TH};text-align:right">H. Motor</th><th style="${TH};text-align:right">Calent.</th><th style="${TH};text-align:right">H. Efectiva</th>
      <th style="${TH};text-align:right">H. Inop.</th><th style="${TH};text-align:center">Partes</th><th style="${TH};text-align:right">Disp. Mec.</th></tr></thead>
    <tbody>${d.equipos.map((e,i)=>`<tr style="border-bottom:1px solid var(--border)">
      <td style="${TD};text-align:center;color:var(--muted2);font-size:.7rem">${i+1}</td>
      <td style="${TD};font-family:monospace;font-weight:700;color:#22d3ee">${_ipEsc(e.cod)}</td>
      <td style="${TD};font-size:.72rem;color:var(--muted2)">${_ipEsc(e.nom).slice(0,42)}</td>
      <td style="${TD};font-size:.7rem">${_ipEsc(e.tipo)}</td>
      <td style="${TD};text-align:right;font-weight:700">${_ipN(e.motor)}</td>
      <td style="${TD};text-align:right;color:var(--muted2)">${_ipN(e.cal)}</td>
      <td style="${TD};text-align:right;font-weight:800;color:#10b981">${_ipN(e.efec)}</td>
      <td style="${TD};text-align:right;color:${e.inop?'#ef4444':'var(--muted)'}">${_ipN(e.inop)}</td>
      <td style="${TD};text-align:center;font-size:.72rem">${e.partes}</td>
      <td style="${TD};text-align:right;font-weight:700;color:${e.dispMec>=90?'#10b981':e.dispMec>=75?'#f59e0b':'#ef4444'}">${e.dispMec.toFixed(1)}%</td>
    </tr>`).join('')}</tbody>
    <tfoot><tr style="background:rgba(4,78,100,.14);border-top:2px solid var(--border)">
      <td colspan="4" style="${TD};text-align:right;font-weight:800;font-size:.72rem;color:var(--muted2)">TOTALES</td>
      <td style="${TD};text-align:right;font-weight:900">${_ipN(d.eqTot.motor)}</td><td></td>
      <td style="${TD};text-align:right;font-weight:900;color:#10b981">${_ipN(d.eqTot.efec)}</td>
      <td style="${TD};text-align:right;font-weight:900;color:#ef4444">${_ipN(d.eqTot.inop)}</td>
      <td style="${TD};text-align:center;font-weight:900">${d.eqTot.partes}</td><td></td>
    </tr></tfoot></table>`:'<div style="padding:1.5rem;text-align:center;color:var(--muted);font-size:.8rem">Sin partes diarios en el período.</div>';

  // Personal
  const tPer=`<div style="padding:.7rem">
    <div style="display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:.6rem">
      ${[['Trabajo Día',d.personal.td,'#10b981'],['Trabajo Noche',d.personal.tn,'#3b82f6'],['Día Libre',d.personal.dl,'#6b7280'],
         ['Anexo 5',d.personal.a5,'#f97316'],['DL Trabajado',d.personal.dlt,'#84cc16'],['Faltas',d.personal.faltas,'#ef4444'],
         ['Permisos',d.personal.permisos,'#f59e0b'],['Desc. Médico',d.personal.dm,'#8b5cf6'],['Vacaciones',d.personal.vac,'#0ea5e9']]
        .map(([l,v,c])=>`<div style="background:${c}1a;border:1px solid ${c}55;border-radius:8px;padding:.35rem .75rem;font-size:.72rem"><span style="color:var(--muted2)">${l}</span> <strong style="color:${c};font-size:.85rem">${v}</strong></div>`).join('')}
    </div>
    <div style="font-size:.66rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin:.5rem 0 .2rem">Por guardia</div>
    ${mini(d.personal.porGuardia,'#f59e0b','#10b981').replace('padding:.6rem','padding:0')}
    <div style="font-size:.66rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin:.7rem 0 .2rem">Top cargos por jornadas</div>
    ${mini(d.personal.porCargo,'#22d3ee','#10b981').replace('padding:.6rem','padding:0')}
  </div>`;

  // Mecánica
  const tMec=`<div style="padding:.7rem">
    <div style="display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:.6rem">
      ${[['Atendidos',d.mecanica.aten,'#10b981'],['En Proceso',d.mecanica.proc,'#f59e0b'],['Pendientes',d.mecanica.pend,'#ef4444'],
         ['Horas de parada',_ipN(d.mecanica.horasParada)+' h','#8b5cf6'],['Equipos atendidos',d.mecanica.equipos,'#22d3ee'],
         ['Insumos (Almacén)','S/ '+_ipN(d.mecanica.insumosVal,2),'#f97316']]
        .map(([l,v,c])=>`<div style="background:${c}1a;border:1px solid ${c}55;border-radius:8px;padding:.35rem .75rem;font-size:.72rem"><span style="color:var(--muted2)">${l}</span> <strong style="color:${c};font-size:.85rem">${v}</strong></div>`).join('')}
    </div>
    <div style="font-size:.66rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin:.5rem 0 .2rem">Por tipo de falla</div>
    ${mini(d.mecanica.porFalla,'#ec4899','#8b5cf6').replace('padding:.6rem','padding:0')}
    <div style="font-size:.66rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin:.7rem 0 .2rem">Equipos con más atenciones</div>
    ${mini(d.mecanica.topEq,'#22d3ee','#ef4444').replace('padding:.6rem','padding:0')}
  </div>`;

  // Combustible
  const tComb=`<div style="padding:.7rem">
    <div style="display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:.6rem">
      ${[['Ingresos',_ipN(d.combustible.galIng)+' gal','#3b82f6'],['Despachos',_ipN(d.combustible.galDes)+' gal','#f59e0b'],
         ['Valorizado','S/ '+_ipN(d.combustible.solesDes,2),'#10b981'],['Atenciones',d.combustible.nDes,'#8b5cf6'],
         ['Rendimiento',_ipN(d.combustible.rend,2)+' gal/h','#22d3ee']]
        .map(([l,v,c])=>`<div style="background:${c}1a;border:1px solid ${c}55;border-radius:8px;padding:.35rem .75rem;font-size:.72rem"><span style="color:var(--muted2)">${l}</span> <strong style="color:${c};font-size:.85rem">${v}</strong></div>`).join('')}
    </div>
    ${d.combustible.topEq.length?`<table style="width:100%;border-collapse:collapse">
      <thead><tr><th style="${TH}">#</th><th style="${TH}">Equipo</th><th style="${TH};text-align:center">Atenciones</th><th style="${TH};text-align:right">Galones</th><th style="${TH};text-align:right">S/</th><th style="${TH};text-align:right">% del total</th></tr></thead>
      <tbody>${d.combustible.topEq.map(([k,v],i)=>`<tr style="border-bottom:1px solid var(--border)">
        <td style="${TD};text-align:center;color:var(--muted2);font-size:.7rem">${i+1}</td>
        <td style="${TD};font-family:monospace;font-weight:700;color:#22d3ee">${_ipEsc(k)}</td>
        <td style="${TD};text-align:center;font-size:.72rem">${v.n}</td>
        <td style="${TD};text-align:right;font-weight:700;color:#f59e0b">${_ipN(v.gal)}</td>
        <td style="${TD};text-align:right;color:#10b981">${_ipN(v.soles,2)}</td>
        <td style="${TD};text-align:right;font-size:.72rem;color:var(--muted2)">${d.combustible.galDes?(v.gal/d.combustible.galDes*100).toFixed(1):'0.0'}%</td>
      </tr>`).join('')}</tbody></table>`:''}
  </div>`;

  // Almacén
  const tAlm=`<div style="padding:.7rem">
    <div style="display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:.6rem">
      ${[['Entradas',d.almacen.nEnt,'#10b981'],['Salidas',d.almacen.nSal,'#ef4444'],['Vales emitidos',d.almacen.vales,'#f97316'],
         ['Ítems distintos',d.almacen.items,'#22d3ee'],['Valor entradas','S/ '+_ipN(d.almacen.valEnt,2),'#10b981'],
         ['Valor salidas','S/ '+_ipN(d.almacen.valSal,2),'#ef4444']]
        .map(([l,v,c])=>`<div style="background:${c}1a;border:1px solid ${c}55;border-radius:8px;padding:.35rem .75rem;font-size:.72rem"><span style="color:var(--muted2)">${l}</span> <strong style="color:${c};font-size:.85rem">${v}</strong></div>`).join('')}
    </div>
    <div style="font-size:.66rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin:.5rem 0 .2rem">Salidas por tipo de material</div>
    ${mini(d.almacen.porTipo,'#f97316','#10b981').replace('padding:.6rem','padding:0')}
    ${d.almacen.topItems.length?`<div style="font-size:.66rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin:.7rem 0 .2rem">Ítems más despachados</div>
    <table style="width:100%;border-collapse:collapse">
      <thead><tr><th style="${TH}">#</th><th style="${TH}">Código</th><th style="${TH};text-align:left">Descripción</th><th style="${TH}">Unid.</th><th style="${TH};text-align:right">Cantidad</th><th style="${TH};text-align:right">S/</th></tr></thead>
      <tbody>${d.almacen.topItems.map((it,i)=>`<tr style="border-bottom:1px solid var(--border)">
        <td style="${TD};text-align:center;color:var(--muted2);font-size:.7rem">${i+1}</td>
        <td style="${TD};font-family:monospace;font-size:.7rem;color:var(--alm)">${_ipEsc(it.cod)||'—'}</td>
        <td style="${TD}"><strong>${_ipEsc(it.nom)}</strong></td>
        <td style="${TD};text-align:center;font-size:.7rem;color:var(--muted2)">${_ipEsc(it.und)}</td>
        <td style="${TD};text-align:right;font-weight:700">${_ipN(it.cant)}</td>
        <td style="${TD};text-align:right;font-weight:800;color:#10b981">${_ipN(it.soles,2)}</td>
      </tr>`).join('')}</tbody></table>`:''}
  </div>`;

  cont.innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.6rem;margin-bottom:.9rem;padding:.5rem .7rem;background:var(--panel2);border:1px solid var(--border);border-radius:10px">
      <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap">
        <div style="display:flex;align-items:center;background:var(--panel);border:1px solid var(--border);border-radius:8px;overflow:hidden">
          <button onclick="_ipNav(-1)" style="background:none;border:none;border-right:1px solid var(--border);color:var(--text);cursor:pointer;font-size:1.1rem;padding:.3rem .7rem;line-height:1">‹</button>
          <span style="font-weight:800;font-size:.85rem;min-width:125px;text-align:center;padding:0 .5rem">${per.label}</span>
          <button onclick="_ipNav(1)" style="background:none;border:none;border-left:1px solid var(--border);color:var(--text);cursor:pointer;font-size:1.1rem;padding:.3rem .7rem;line-height:1">›</button>
        </div>
        <span style="font-size:.7rem;color:var(--muted2)">Desde</span>
        <input type="date" class="date-ic-azul" value="${d.desde}" onchange="_ipSetFecha('desde',this.value)" style="${inpS}">
        <span style="font-size:.7rem;color:var(--muted2)">Hasta</span>
        <input type="date" class="date-ic-azul" value="${d.hasta}" onchange="_ipSetFecha('hasta',this.value)" style="${inpS}">
        <span style="font-size:.72rem;color:var(--muted2)">· ${d.dias} días</span>
      </div>
      <div style="display:flex;gap:.4rem">
        <button class="btn btn-out btn-sm" onclick="_ipPrint()" style="color:#10b981;border-color:#10b981;font-size:.78rem">🖨️ Informe PDF</button>
        <button class="btn btn-out btn-sm" onclick="_ipExcel()" style="color:#22d3ee;border-color:#22d3ee60;font-size:.78rem">📥 Excel</button>
      </div>
    </div>

    <div class="kpi-row">
      ${kpi('Horas Máquina',_ipN(d.eqTot.motor),`${d.equipos.length} equipos con parte`,'#06b6d4','⏱️')}
      ${kpi('Horas Hombre',_ipN(d.personal.hh,0),`${d.personal.total} trabajadores`,'#3b82f6','👷')}
      ${kpi('Atenciones Mec.',d.mecanica.total,`${_ipN(d.mecanica.horasParada)} h de parada`,'#8b5cf6','🚨')}
      ${kpi('Combustible',_ipN(d.combustible.galDes,0)+' gal','S/ '+_ipN(d.combustible.solesDes,2),'#f59e0b','⛽')}
      ${kpi('Consumo Almacén','S/ '+_ipN(d.almacen.valSal,2),`${d.almacen.nSal} salidas · ${d.almacen.vales} vales`,'#f97316','📦')}
    </div>

    ${seccion('🚜','Equipos — Horas del Período','#06b6d4',tEq,`<span style="font-size:.7rem;color:var(--muted2)">${d.equipos.length} equipos</span>`)}
    ${Object.keys(d.porTipoEq).length?seccion('🗂️','Horas por Tipo de Equipo','#0ea5e9',mini(Object.entries(d.porTipoEq),'#22d3ee','#10b981')):''}
    ${seccion('👷','Personal — Jornadas del Período','#3b82f6',tPer,`<span style="font-size:.7rem;color:var(--muted2)">${_ipN(d.personal.hh,0)} HH</span>`)}
    ${seccion('🚨','Atenciones Mecánicas','#8b5cf6',tMec,`<span style="font-size:.7rem;color:var(--muted2)">${d.mecanica.total} auxilios</span>`)}
    ${seccion('⛽','Consumo de Combustible','#f59e0b',tComb,`<span style="font-size:.7rem;color:var(--muted2)">${_ipN(d.combustible.galDes)} gal</span>`)}
    ${seccion('📦','Consumo de Almacén','#f97316',tAlm,`<span style="font-size:.7rem;color:var(--muted2)">S/ ${_ipN(d.almacen.valSal,2)}</span>`)}

    <div class="card">
      <div class="card-head"><span class="card-title">📝 Observaciones del Informe</span><span style="font-size:.68rem;color:var(--muted2)">se imprime al final del PDF</span></div>
      <div class="card-body"><textarea oninput="_ipSetNotas(this.value)" placeholder="Comentarios, incidencias relevantes, conclusiones del período..." style="width:100%;min-height:80px;background:var(--panel2);border:1px solid var(--border);border-radius:8px;padding:.6rem;color:var(--text);font-size:.8rem;font-family:inherit;resize:vertical">${_ipEsc(_ipNotas)}</textarea></div>
    </div>`;
}

// ══ INFORME PDF ══
function _ipPrint(){
  const d=_ipDatos();
  const AZ='#0070C0';
  const logo=window.location.href.replace(/[^\/\\]+$/,'')+'09.-ERP/Imagenes/ECOSERMO-LOGO.png';
  const TH=`background:${AZ};color:#fff;padding:4px 6px;font-size:8.5px;text-transform:uppercase;text-align:center;border:1px solid #fff`;
  const TD='border:1px solid #cbd5e1;padding:3px 5px;font-size:9px;color:#111';
  const sec=t=>`<div class="sec">${t}</div>`;
  const cajas=arr=>`<div class="cajas">${arr.map(([l,v])=>`<div class="caja"><span>${l}</span><strong>${v}</strong></div>`).join('')}</div>`;

  const tblEq=d.equipos.length?`<table>
    <thead><tr><th style="${TH}">#</th><th style="${TH}">Equipo</th><th style="${TH};text-align:left">Descripción</th>
      <th style="${TH}">H. Motor</th><th style="${TH}">Calent.</th><th style="${TH}">H. Efectiva</th>
      <th style="${TH}">H. Inop.</th><th style="${TH}">Partes</th><th style="${TH}">Disp. Mec.</th></tr></thead>
    <tbody>${d.equipos.map((e,i)=>`<tr>
      <td style="${TD};text-align:center">${i+1}</td>
      <td style="${TD};text-align:center;font-family:monospace;font-weight:700">${_ipEsc(e.cod)}</td>
      <td style="${TD}">${_ipEsc(e.nom).slice(0,46)}</td>
      <td style="${TD};text-align:right">${_ipN(e.motor)}</td>
      <td style="${TD};text-align:right">${_ipN(e.cal)}</td>
      <td style="${TD};text-align:right;font-weight:700">${_ipN(e.efec)}</td>
      <td style="${TD};text-align:right">${_ipN(e.inop)}</td>
      <td style="${TD};text-align:center">${e.partes}</td>
      <td style="${TD};text-align:right;font-weight:700">${e.dispMec.toFixed(1)}%</td></tr>`).join('')}</tbody>
    <tfoot><tr><td colspan="3" style="${TD};text-align:right;font-weight:800;background:#e2e8f0">TOTALES</td>
      <td style="${TD};text-align:right;font-weight:800;background:#e2e8f0">${_ipN(d.eqTot.motor)}</td>
      <td style="${TD};background:#e2e8f0"></td>
      <td style="${TD};text-align:right;font-weight:800;background:#e2e8f0">${_ipN(d.eqTot.efec)}</td>
      <td style="${TD};text-align:right;font-weight:800;background:#e2e8f0">${_ipN(d.eqTot.inop)}</td>
      <td style="${TD};text-align:center;font-weight:800;background:#e2e8f0">${d.eqTot.partes}</td>
      <td style="${TD};background:#e2e8f0"></td></tr></tfoot></table>`:'<p class="vacio">Sin partes diarios en el período.</p>';

  const tblComb=d.combustible.topEq.length?`<table>
    <thead><tr><th style="${TH}">#</th><th style="${TH}">Equipo</th><th style="${TH}">Atenciones</th><th style="${TH}">Galones</th><th style="${TH}">S/</th><th style="${TH}">% del total</th></tr></thead>
    <tbody>${d.combustible.topEq.map(([k,v],i)=>`<tr>
      <td style="${TD};text-align:center">${i+1}</td>
      <td style="${TD};text-align:center;font-family:monospace;font-weight:700">${_ipEsc(k)}</td>
      <td style="${TD};text-align:center">${v.n}</td>
      <td style="${TD};text-align:right;font-weight:700">${_ipN(v.gal)}</td>
      <td style="${TD};text-align:right">${_ipN(v.soles,2)}</td>
      <td style="${TD};text-align:right">${d.combustible.galDes?(v.gal/d.combustible.galDes*100).toFixed(1):'0.0'}%</td></tr>`).join('')}</tbody></table>`:'';

  const tblAlm=d.almacen.topItems.length?`<table>
    <thead><tr><th style="${TH}">#</th><th style="${TH}">Código</th><th style="${TH};text-align:left">Descripción</th><th style="${TH}">Unid.</th><th style="${TH}">Cantidad</th><th style="${TH}">S/</th></tr></thead>
    <tbody>${d.almacen.topItems.map((it,i)=>`<tr>
      <td style="${TD};text-align:center">${i+1}</td>
      <td style="${TD};text-align:center;font-family:monospace">${_ipEsc(it.cod)||'—'}</td>
      <td style="${TD}">${_ipEsc(it.nom)}</td>
      <td style="${TD};text-align:center">${_ipEsc(it.und)}</td>
      <td style="${TD};text-align:right;font-weight:700">${_ipN(it.cant)}</td>
      <td style="${TD};text-align:right;font-weight:700">${_ipN(it.soles,2)}</td></tr>`).join('')}</tbody></table>`:'';

  const w=window.open('','_blank','width=1000,height=760');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Informe de Período ${_ipDMY(d.desde)} – ${_ipDMY(d.hasta)}</title><style>
    @page{size:A4 portrait;margin:1cm}
    *{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
    body{font-family:Arial,Helvetica,sans-serif;color:#111;font-size:10px}
    .hdr{display:flex;align-items:center;gap:14px;border-bottom:3px solid ${AZ};padding-bottom:8px;margin-bottom:12px}
    .hdr img{height:48px;object-fit:contain}
    .hdr .t{flex:1;text-align:center}
    .hdr h1{font-size:18px;color:${AZ};letter-spacing:.05em}
    .hdr p{font-size:10px;color:#475569;margin-top:3px}
    .hdr .r{text-align:right;font-size:8.5px;color:#475569}
    .sec{font-size:11px;font-weight:800;color:#fff;background:${AZ};padding:4px 8px;margin:14px 0 6px;letter-spacing:.04em}
    table{width:100%;border-collapse:collapse;margin-bottom:4px}
    .cajas{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:6px}
    .caja{border:1px solid #cbd5e1;border-left:3px solid ${AZ};border-radius:3px;padding:4px 9px;font-size:9px;background:#f8fafc}
    .caja span{color:#64748b;display:block;font-size:8px;text-transform:uppercase;letter-spacing:.05em}
    .caja strong{font-size:12px;color:#0f172a}
    .res{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}
    .res .k{flex:1;min-width:110px;border:1.5px solid ${AZ};border-radius:5px;padding:6px 9px;text-align:center;background:#f0f9ff}
    .res .k span{display:block;font-size:8px;color:#475569;text-transform:uppercase;letter-spacing:.06em}
    .res .k strong{font-size:16px;color:${AZ}}
    .res .k em{display:block;font-size:8px;color:#64748b;font-style:normal;margin-top:1px}
    .vacio{font-size:9px;color:#94a3b8;padding:6px 0;font-style:italic}
    .notas{border:1px solid #cbd5e1;border-radius:4px;padding:8px;font-size:9.5px;min-height:50px;white-space:pre-wrap;background:#fffbeb}
    .firmas{display:flex;gap:30px;margin-top:34px}
    .firmas div{flex:1;text-align:center;font-size:8.5px}
    .firmas .ln{border-top:1.2px solid #333;margin:0 12px 4px}
    .pie{margin-top:10px;padding-top:5px;border-top:1px solid #e2e8f0;font-size:7.5px;color:#94a3b8;display:flex;justify-content:space-between}
  </style></head><body>
  <div class="hdr">
    <img src="${logo}" alt="">
    <div class="t"><h1>INFORME DE PERÍODO</h1><p>ECOSERMO · Del ${_ipDMY(d.desde)} al ${_ipDMY(d.hasta)} · ${d.dias} días</p></div>
    <div class="r">Emitido<br><strong>${new Date().toLocaleDateString('es-PE')}</strong></div>
  </div>

  <div class="res">
    <div class="k"><span>Horas Máquina</span><strong>${_ipN(d.eqTot.motor)}</strong><em>${d.equipos.length} equipos</em></div>
    <div class="k"><span>Horas Hombre</span><strong>${_ipN(d.personal.hh,0)}</strong><em>${d.personal.total} trabajadores</em></div>
    <div class="k"><span>Atenciones Mec.</span><strong>${d.mecanica.total}</strong><em>${_ipN(d.mecanica.horasParada)} h parada</em></div>
    <div class="k"><span>Combustible</span><strong>${_ipN(d.combustible.galDes,0)}</strong><em>gal · S/ ${_ipN(d.combustible.solesDes,2)}</em></div>
    <div class="k"><span>Almacén</span><strong>S/ ${_ipN(d.almacen.valSal,2)}</strong><em>${d.almacen.nSal} salidas</em></div>
  </div>

  ${sec('1. EQUIPOS — HORAS DEL PERÍODO')}
  ${tblEq}

  ${sec('2. PERSONAL — JORNADAS DEL PERÍODO')}
  ${cajas([['Trabajadores',d.personal.total],['Jornadas',d.personal.jornadas],['Horas Hombre',_ipN(d.personal.hh,0)],
    ['Trabajo Día',d.personal.td],['Trabajo Noche',d.personal.tn],['Día Libre',d.personal.dl],
    ['Anexo 5',d.personal.a5],['DL Trabajado',d.personal.dlt],['Faltas',d.personal.faltas],
    ['Permisos',d.personal.permisos],['Desc. Médico',d.personal.dm],['Vacaciones',d.personal.vac]])}
  ${d.personal.porGuardia.length?`<table><thead><tr><th style="${TH};text-align:left">Guardia</th><th style="${TH}">Trabajadores</th><th style="${TH}">Jornadas</th><th style="${TH}">Horas Hombre</th></tr></thead>
    <tbody>${d.personal.porGuardia.map(([g,v])=>`<tr><td style="${TD}">${_ipEsc(g)}</td><td style="${TD};text-align:center">${v.n}</td><td style="${TD};text-align:center">${v.jor}</td><td style="${TD};text-align:right">${_ipN(v.jor*_IP_HH_DIA,0)}</td></tr>`).join('')}</tbody></table>`:''}

  ${sec('3. ATENCIONES MECÁNICAS')}
  ${cajas([['Total auxilios',d.mecanica.total],['Atendidos',d.mecanica.aten],['En proceso',d.mecanica.proc],['Pendientes',d.mecanica.pend],
    ['Horas de parada',_ipN(d.mecanica.horasParada)],['Equipos atendidos',d.mecanica.equipos],['Insumos de almacén','S/ '+_ipN(d.mecanica.insumosVal,2)]])}
  ${d.mecanica.porFalla.length?`<table><thead><tr><th style="${TH};text-align:left">Tipo de Falla</th><th style="${TH}">Cantidad</th><th style="${TH}">Horas de Parada</th><th style="${TH}">% del total</th></tr></thead>
    <tbody>${d.mecanica.porFalla.map(([t,v])=>`<tr><td style="${TD}">${_ipEsc(t)}</td><td style="${TD};text-align:center">${v.n}</td><td style="${TD};text-align:right">${_ipN(v.horas)}</td><td style="${TD};text-align:right">${d.mecanica.total?(v.n/d.mecanica.total*100).toFixed(1):'0.0'}%</td></tr>`).join('')}</tbody></table>`:''}

  ${sec('4. CONSUMO DE COMBUSTIBLE')}
  ${cajas([['Ingresos',_ipN(d.combustible.galIng)+' gal'],['Despachos',_ipN(d.combustible.galDes)+' gal'],
    ['Valorizado','S/ '+_ipN(d.combustible.solesDes,2)],['N° de atenciones',d.combustible.nDes],
    ['Equipos atendidos',d.combustible.equipos],['Rendimiento',_ipN(d.combustible.rend,2)+' gal/h']])}
  ${tblComb}

  ${sec('5. CONSUMO DE ALMACÉN')}
  ${cajas([['Entradas',d.almacen.nEnt],['Salidas',d.almacen.nSal],['Vales emitidos',d.almacen.vales],
    ['Ítems distintos',d.almacen.items],['Valor entradas','S/ '+_ipN(d.almacen.valEnt,2)],['Valor salidas','S/ '+_ipN(d.almacen.valSal,2)]])}
  ${tblAlm}

  ${_ipNotas.trim()?`${sec('6. OBSERVACIONES')}<div class="notas">${_ipEsc(_ipNotas)}</div>`:''}

  <div class="firmas">
    <div><div style="height:32px"></div><div class="ln"></div><strong>ELABORADO POR</strong><br>Control de Proyecto</div>
    <div><div style="height:32px"></div><div class="ln"></div><strong>REVISADO POR</strong><br>Residente de Proyecto</div>
    <div><div style="height:32px"></div><div class="ln"></div><strong>APROBADO POR</strong><br>Gerencia de Operaciones</div>
  </div>
  <div class="pie"><span>ECOSERMO · Informe generado por GDAR</span><span>Horas Hombre = jornadas (TD+TN+DLT+A5) × ${_IP_HH_DIA} h · Valorización según P.U.R. del catálogo</span></div>
  <script>window.onload=()=>window.print();<\/script></body></html>`);
  w.document.close();
}

// ══ EXCEL (una hoja por bloque) ══
function _ipExcel(){
  const d=_ipDatos();
  const wb=XLSX.utils.book_new();
  const tit=`INFORME DE PERÍODO · ${_ipDMY(d.desde)} al ${_ipDMY(d.hasta)} · ${d.dias} días`;

  const hResumen=[[tit],[],
    ['INDICADOR','VALOR','DETALLE'],
    ['Horas máquina (motor)',+d.eqTot.motor.toFixed(1),`${d.equipos.length} equipos con parte`],
    ['Horas máquina efectivas',+d.eqTot.efec.toFixed(1),'motor − calentamiento'],
    ['Horas inoperativas',+d.eqTot.inop.toFixed(1),''],
    ['Horas hombre',d.personal.hh,`${d.personal.total} trabajadores`],
    ['Jornadas trabajadas',d.personal.jornadas,'TD + TN + DLT + A5'],
    ['Faltas',d.personal.faltas,''],
    ['Atenciones mecánicas',d.mecanica.total,`${d.mecanica.horasParada.toFixed(1)} h de parada`],
    ['Combustible despachado (gal)',+d.combustible.galDes.toFixed(1),'S/ '+d.combustible.solesDes.toFixed(2)],
    ['Rendimiento (gal/h)',+d.combustible.rend.toFixed(2),''],
    ['Consumo de almacén (S/)',+d.almacen.valSal.toFixed(2),`${d.almacen.nSal} salidas · ${d.almacen.vales} vales`]];
  const wsR=XLSX.utils.aoa_to_sheet(hResumen);
  wsR['!cols']=[{wch:32},{wch:16},{wch:34}];
  XLSX.utils.book_append_sheet(wb,wsR,'Resumen');

  const wsE=XLSX.utils.aoa_to_sheet([[tit],[],
    ['#','EQUIPO','DESCRIPCIÓN','TIPO','H. MOTOR','CALENT.','H. EFECTIVA','H. INOP.','PARTES','DISP. MEC. %'],
    ...d.equipos.map((e,i)=>[i+1,e.cod,e.nom,e.tipo,+e.motor.toFixed(1),+e.cal.toFixed(1),+e.efec.toFixed(1),+e.inop.toFixed(1),e.partes,+e.dispMec.toFixed(1)])]);
  wsE['!cols']=[{wch:4},{wch:14},{wch:34},{wch:16},{wch:10},{wch:9},{wch:11},{wch:10},{wch:8},{wch:12}];
  XLSX.utils.book_append_sheet(wb,wsE,'Equipos');

  const wsP=XLSX.utils.aoa_to_sheet([[tit],[],
    ['CONCEPTO','CANTIDAD'],['Trabajadores en período',d.personal.total],['Jornadas',d.personal.jornadas],['Horas hombre',d.personal.hh],
    ['Trabajo Día',d.personal.td],['Trabajo Noche',d.personal.tn],['Día Libre',d.personal.dl],['Anexo 5',d.personal.a5],
    ['DL Trabajado',d.personal.dlt],['Faltas',d.personal.faltas],['Permisos',d.personal.permisos],['Descanso Médico',d.personal.dm],['Vacaciones',d.personal.vac],
    [],['GUARDIA','TRABAJADORES','JORNADAS','HORAS HOMBRE'],
    ...d.personal.porGuardia.map(([g,v])=>[g,v.n,v.jor,v.jor*_IP_HH_DIA]),
    [],['CARGO','TRABAJADORES','JORNADAS'],
    ...d.personal.porCargo.map(([c,v])=>[c,v.n,v.jor])]);
  wsP['!cols']=[{wch:30},{wch:14},{wch:12},{wch:14}];
  XLSX.utils.book_append_sheet(wb,wsP,'Personal');

  const wsM=XLSX.utils.aoa_to_sheet([[tit],[],
    ['CONCEPTO','VALOR'],['Total auxilios',d.mecanica.total],['Atendidos',d.mecanica.aten],['En proceso',d.mecanica.proc],
    ['Pendientes',d.mecanica.pend],['Horas de parada',+d.mecanica.horasParada.toFixed(1)],['Equipos atendidos',d.mecanica.equipos],
    ['Insumos de almacén (S/)',+d.mecanica.insumosVal.toFixed(2)],
    [],['TIPO DE FALLA','CANTIDAD','HORAS DE PARADA'],
    ...d.mecanica.porFalla.map(([t,v])=>[t,v.n,+v.horas.toFixed(1)]),
    [],['EQUIPO','ATENCIONES','HORAS DE PARADA'],
    ...d.mecanica.topEq.map(([k,v])=>[k,v.n,+v.horas.toFixed(1)])]);
  wsM['!cols']=[{wch:30},{wch:14},{wch:16}];
  XLSX.utils.book_append_sheet(wb,wsM,'Mecánica');

  const wsC=XLSX.utils.aoa_to_sheet([[tit],[],
    ['CONCEPTO','VALOR'],['Galones ingresados',+d.combustible.galIng.toFixed(1)],['Galones despachados',+d.combustible.galDes.toFixed(1)],
    ['Valorizado (S/)',+d.combustible.solesDes.toFixed(2)],['N° de atenciones',d.combustible.nDes],
    ['Equipos atendidos',d.combustible.equipos],['Rendimiento (gal/h)',+d.combustible.rend.toFixed(2)],
    [],['EQUIPO','ATENCIONES','GALONES','S/'],
    ...d.combustible.topEq.map(([k,v])=>[k,v.n,+v.gal.toFixed(1),+v.soles.toFixed(2)])]);
  wsC['!cols']=[{wch:26},{wch:14},{wch:12},{wch:12}];
  XLSX.utils.book_append_sheet(wb,wsC,'Combustible');

  const wsA=XLSX.utils.aoa_to_sheet([[tit],[],
    ['CONCEPTO','VALOR'],['Entradas',d.almacen.nEnt],['Salidas',d.almacen.nSal],['Vales emitidos',d.almacen.vales],
    ['Ítems distintos',d.almacen.items],['Valor entradas (S/)',+d.almacen.valEnt.toFixed(2)],['Valor salidas (S/)',+d.almacen.valSal.toFixed(2)],
    [],['TIPO DE MATERIAL','ÍTEMS','S/'],
    ...d.almacen.porTipo.map(([t,v])=>[t,v.n,+v.soles.toFixed(2)]),
    [],['CÓDIGO','DESCRIPCIÓN','UNID.','CANTIDAD','S/'],
    ...d.almacen.topItems.map(i=>[i.cod,i.nom,i.und,+i.cant.toFixed(2),+i.soles.toFixed(2)])]);
  wsA['!cols']=[{wch:16},{wch:42},{wch:9},{wch:12},{wch:12}];
  XLSX.utils.book_append_sheet(wb,wsA,'Almacén');

  XLSX.writeFile(wb,`InformePeriodo_${d.desde}_${d.hasta}.xlsx`);
  toast('✓ Informe exportado');
}
