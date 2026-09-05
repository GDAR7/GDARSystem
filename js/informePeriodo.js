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
// Equipos medidos por kilometraje (sin horómetro): vehículos menores y los que
// el Máster valoriza por DÍA. Para estos, hrIni/hrFin no son horas de motor.
const _IP_TIPOS_KM=['Vehículo Menor','Vehiculo Menor'];
function _ipEsKm(eq){
  if(!eq)return false;
  if(_IP_TIPOS_KM.includes(String(eq.tipo||'').trim()))return true;
  return String(eq.tarifaUn||'').toUpperCase()==='DIA';
}

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

// ══ CÁLCULO DE TODOS LOS BLOQUES ══
function _ipDatos(){
  _ipInit();
  const D=_ipDesde,H=_ipHasta;
  const enRango=f=>f&&f>=D&&f<=H;
  const dias=Math.max(1,Math.round((new Date(H+'T12:00')-new Date(D+'T12:00'))/864e5)+1);

  // ── 1. EQUIPOS (partes diarios) ──
  // Los vehículos menores y los equipos con tarifa por DÍA no llevan horómetro:
  // su avance se mide en kilómetros. Mezclar ambos daba horas negativas enormes
  // (el odómetro se restaba contra un horómetro en cero).
  const partes=(DB.partes||[]).filter(p=>enRango(p.fecha));
  const eqMap={};
  partes.forEach(p=>{
    const eq=(DB.equipos||[]).find(e=>e.id===p.eqId);
    if(!eqMap[p.eqId])eqMap[p.eqId]={id:p.eqId,cod:eq?eq.codigo:'—',nom:eq?(eq.nombre||''):'',tipo:eq?(eq.tipo||'Otros'):'Otros',
      esKm:_ipEsKm(eq),calent:eq?(+eq.calentamientoH||0):0,
      motor:0,cal:0,efec:0,inop:0,km:0,partes:0,errores:0,turnos:{D:0,N:0}};
    const x=eqMap[p.eqId];
    if(x.esKm){
      const ki=+p.kmIni||0,kf=+p.kmFin||0;
      x.km+=kf>ki?kf-ki:0;
    }else{
      const motor=+p.ef||0;
      if(motor<0){x.errores++;}                    // horómetro inconsistente: se ignora, no se resta
      else{const cal=motor>0?x.calent:0;x.motor+=motor;x.cal+=cal;x.efec+=Math.max(0,motor-cal);}
    }
    x.inop+=Math.max(0,+p.im||0);
    x.partes++;
    const t=String(p.turno||'').toUpperCase();
    if(t.startsWith('N'))x.turnos.N++;else x.turnos.D++;
  });
  const equipos=Object.values(eqMap).map(x=>{
    const disp=dias*24;
    return{...x,motor:+x.motor.toFixed(1),cal:+x.cal.toFixed(1),efec:+x.efec.toFixed(1),inop:+x.inop.toFixed(1),km:+x.km.toFixed(1),
      dispMec:disp>0?Math.max(0,Math.min(100,(disp-x.inop)/disp*100)):100};
  }).sort((a,b)=>(b.motor-a.motor)||(b.km-a.km));
  const eqTot={motor:equipos.reduce((s,e)=>s+e.motor,0),efec:equipos.reduce((s,e)=>s+e.efec,0),
    inop:equipos.reduce((s,e)=>s+e.inop,0),partes:equipos.reduce((s,e)=>s+e.partes,0),
    km:equipos.reduce((s,e)=>s+e.km,0),errores:equipos.reduce((s,e)=>s+e.errores,0),
    nHr:equipos.filter(e=>!e.esKm).length,nKm:equipos.filter(e=>e.esKm).length};
  const porTipoEq={};
  equipos.forEach(e=>{
    if(!porTipoEq[e.tipo])porTipoEq[e.tipo]={n:0,motor:0,km:0};
    porTipoEq[e.tipo].n++;porTipoEq[e.tipo].motor+=e.motor;porTipoEq[e.tipo].km+=e.km;
  });

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
  let galHr=0,galKm=0;   // galones de equipos con horómetro vs. de vehículos por km
  des.forEach(r=>{
    const eq=(DB.equipos||[]).find(e=>e.id===r.eqId);
    const k=eq?eq.codigo:'—';
    const g=+r.gal||0;
    if(!porEqComb[k])porEqComb[k]={gal:0,soles:0,n:0,eqId:r.eqId,esKm:_ipEsKm(eq)};
    porEqComb[k].gal+=g;
    porEqComb[k].soles+=g*(+r.precio||0);
    porEqComb[k].n++;
    if(_ipEsKm(eq))galKm+=g;else galHr+=g;
  });
  const galDes=des.reduce((s,r)=>s+(+r.gal||0),0);
  const combustible={
    galIng:ing.reduce((s,r)=>s+(+r.gal||0),0),
    galDes,galHr,galKm,
    solesDes:des.reduce((s,r)=>s+(+r.gal||0)*(+r.precio||0),0),
    nDes:des.length,nIng:ing.length,
    equipos:new Set(des.map(r=>r.eqId)).size,
    // Rendimiento por horómetro: solo galones y horas de equipos con horómetro
    rend:eqTot.motor>0?galHr/eqTot.motor:0,
    // Rendimiento de vehículos: km recorridos por galón
    rendKm:galKm>0?eqTot.km/galKm:0,
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

// ══ TEXTO NARRATIVO DEL INFORME ══
function _ipTextos(d){
  const eqTop=d.equipos.filter(e=>!e.esKm)[0];
  const kmTop=d.equipos.filter(e=>e.esKm).sort((a,b)=>b.km-a.km)[0];
  const dispProm=d.equipos.length?d.equipos.reduce((s,e)=>s+e.dispMec,0)/d.equipos.length:100;
  const fallaTop=d.mecanica.porFalla[0];
  const combTop=d.combustible.topEq[0];
  const almTop=d.almacen.topItems[0];
  const gTop=d.personal.porGuardia[0];
  return{
    intro:`El presente informe consolida la información operativa registrada en el sistema durante el período comprendido entre el <strong>${_ipDMY(d.desde)}</strong> y el <strong>${_ipDMY(d.hasta)}</strong>, equivalente a <strong>${d.dias} días calendario</strong>. Reúne el desempeño de los equipos, la asistencia del personal, las atenciones mecánicas de campo, el consumo de combustible y el movimiento de almacén, con el fin de dar una visión integral de lo ejecutado en el período.`,
    equipos:!d.equipos.length?'No se registraron partes diarios en el período.':
      `Se procesaron <strong>${d.eqTot.partes} partes diarios</strong> correspondientes a <strong>${d.equipos.length} equipos</strong>. `+
      (d.eqTot.nHr?`Los ${d.eqTot.nHr} equipos con horómetro acumularon <strong>${_ipN(d.eqTot.motor)} horas de motor</strong>, de las cuales ${_ipN(d.eqTot.motor-d.eqTot.efec)} h corresponden a calentamiento, resultando en <strong>${_ipN(d.eqTot.efec)} horas efectivas</strong> de trabajo. `:'')+
      (d.eqTot.nKm?`Los ${d.eqTot.nKm} vehículos medidos por kilometraje recorrieron <strong>${_ipN(d.eqTot.km,0)} km</strong>. `:'')+
      `Se acumularon ${_ipN(d.eqTot.inop)} horas de inoperatividad, con una disponibilidad mecánica promedio de <strong>${dispProm.toFixed(1)}%</strong>. `+
      (eqTop?`El equipo de mayor utilización fue <strong>${_ipEsc(eqTop.cod)}</strong> con ${_ipN(eqTop.motor)} horas de motor. `:'')+
      (kmTop&&kmTop.km?`El vehículo con mayor recorrido fue <strong>${_ipEsc(kmTop.cod)}</strong> con ${_ipN(kmTop.km,0)} km. `:'')+
      (d.eqTot.errores?`<span style="color:#b45309">Se detectaron ${d.eqTot.errores} parte(s) con horómetro final menor al inicial; fueron excluidos del cómputo y requieren revisión.</span>`:''),
    personal:!d.personal.total?'No se registraron marcaciones de tareaje en el período.':
      `Participaron <strong>${d.personal.total} trabajadores</strong>, quienes acumularon <strong>${d.personal.jornadas} jornadas</strong> `+
      `(${d.personal.td} en turno día y ${d.personal.tn} en turno noche), equivalentes a <strong>${_ipN(d.personal.hh,0)} horas hombre</strong> `+
      `bajo el criterio de ${_IP_HH_DIA} horas por jornada. `+
      `Se registraron ${d.personal.dl} días libres, ${d.personal.faltas} faltas, ${d.personal.permisos} permisos, ${d.personal.dm} descansos médicos y ${d.personal.vac} días de vacaciones. `+
      (d.personal.a5?`Adicionalmente se contabilizaron ${d.personal.a5} jornadas bajo Anexo 5 correspondientes a personal de ingreso reciente. `:'')+
      (gTop?`La guardia con mayor carga de trabajo fue la <strong>${_ipEsc(gTop[0])}</strong>, con ${gTop[1].n} trabajadores y ${gTop[1].jor} jornadas.`:''),
    mecanica:!d.mecanica.total?'No se registraron atenciones mecánicas en el período.':
      `Se atendieron <strong>${d.mecanica.total} auxilios mecánicos</strong> sobre <strong>${d.mecanica.equipos} equipos</strong>, `+
      `acumulando <strong>${_ipN(d.mecanica.horasParada)} horas de parada</strong>. `+
      `Del total, ${d.mecanica.aten} fueron atendidos, ${d.mecanica.proc} se encuentran en proceso y ${d.mecanica.pend} quedan pendientes de atención. `+
      (fallaTop?`La falla más recurrente correspondió a <strong>${_ipEsc(fallaTop[0])}</strong>, con ${fallaTop[1].n} casos (${(fallaTop[1].n/d.mecanica.total*100).toFixed(1)}% del total). `:'')+
      (d.mecanica.insumosVal?`El consumo de insumos de almacén asociado a estas atenciones asciende a <strong>S/ ${_ipN(d.mecanica.insumosVal,2)}</strong>.`:'No se registró consumo valorizado de insumos de almacén en estas atenciones.'),
    combustible:!d.combustible.nDes&&!d.combustible.nIng?'No se registraron movimientos de combustible en el período.':
      `Ingresaron <strong>${_ipN(d.combustible.galIng)} galones</strong> y se despacharon <strong>${_ipN(d.combustible.galDes)} galones</strong> `+
      `en ${d.combustible.nDes} atenciones a ${d.combustible.equipos} equipos, por un valor de <strong>S/ ${_ipN(d.combustible.solesDes,2)}</strong>. `+
      (d.combustible.rend?`El rendimiento promedio de los equipos con horómetro fue de <strong>${_ipN(d.combustible.rend,2)} gal/h</strong>. `:'')+
      (d.combustible.rendKm?`Los vehículos medidos por kilometraje promediaron <strong>${_ipN(d.combustible.rendKm,2)} km/gal</strong>. `:'')+
      (combTop?`El mayor consumidor fue <strong>${_ipEsc(combTop[0])}</strong> con ${_ipN(combTop[1].gal)} galones, el ${(combTop[1].gal/d.combustible.galDes*100).toFixed(1)}% del total despachado.`:''),
    almacen:!d.almacen.nEnt&&!d.almacen.nSal?'No se registraron movimientos de almacén en el período.':
      `Se procesaron <strong>${d.almacen.nEnt} entradas</strong> y <strong>${d.almacen.nSal} salidas</strong> mediante ${d.almacen.vales} vales, `+
      `involucrando ${d.almacen.items} ítems distintos. `+
      `El valor de las salidas asciende a <strong>S/ ${_ipN(d.almacen.valSal,2)}</strong>, frente a S/ ${_ipN(d.almacen.valEnt,2)} de ingresos al almacén. `+
      (almTop?`El material de mayor consumo fue <strong>${_ipEsc(almTop.nom)}</strong>, con ${_ipN(almTop.cant)} ${_ipEsc(almTop.und)} por un valor de S/ ${_ipN(almTop.soles,2)}.`:'')
  };
}

// ══ DOCUMENTO (hoja blanca, mismo HTML en pantalla y al imprimir) ══
function _ipDoc(){
  const d=_ipDatos();
  const T=_ipTextos(d);
  const AZ='#0070C0';
  const logo=window.location.href.replace(/[^\/\\]+$/,'')+EMPRESA.logo;
  const TH=`background:${AZ};color:#fff;padding:4px 6px;font-size:8.5px;text-transform:uppercase;text-align:center;border:1px solid #fff;font-weight:700`;
  const TD='border:1px solid #cbd5e1;padding:3px 5px;font-size:9.5px;color:#111';
  const sec=(n,t)=>`<div class="ip-sec">${n}. ${t}</div>`;
  const parr=t=>`<p class="ip-p">${t}</p>`;
  const cajas=arr=>`<div class="ip-cajas">${arr.map(([l,v])=>`<div class="ip-caja"><span>${l}</span><strong>${v}</strong></div>`).join('')}</div>`;

  const tblEq=d.equipos.length?`<table class="ip-t">
    <thead><tr><th style="${TH}">#</th><th style="${TH}">Equipo</th><th style="${TH};text-align:left">Descripción</th>
      <th style="${TH}">Medición</th><th style="${TH}">H. Motor</th><th style="${TH}">Calent.</th><th style="${TH}">H. Efectiva</th>
      <th style="${TH}">Km Rec.</th><th style="${TH}">H. Inop.</th><th style="${TH}">Partes</th><th style="${TH}">Disp. Mec.</th></tr></thead>
    <tbody>${d.equipos.map((e,i)=>`<tr>
      <td style="${TD};text-align:center">${i+1}</td>
      <td style="${TD};text-align:center;font-family:monospace;font-weight:700">${_ipEsc(e.cod)}${e.errores?' <span style="color:#b45309" title="Partes con horómetro inconsistente">⚠</span>':''}</td>
      <td style="${TD}">${_ipEsc(e.nom).slice(0,46)}</td>
      <td style="${TD};text-align:center;font-size:8.5px;color:#64748b">${e.esKm?'Kilometraje':'Horómetro'}</td>
      <td style="${TD};text-align:right">${e.esKm?'—':_ipN(e.motor)}</td>
      <td style="${TD};text-align:right">${e.esKm?'—':_ipN(e.cal)}</td>
      <td style="${TD};text-align:right;font-weight:700">${e.esKm?'—':_ipN(e.efec)}</td>
      <td style="${TD};text-align:right;font-weight:700">${e.esKm?_ipN(e.km,0):'—'}</td>
      <td style="${TD};text-align:right">${_ipN(e.inop)}</td>
      <td style="${TD};text-align:center">${e.partes}</td>
      <td style="${TD};text-align:right;font-weight:700">${e.dispMec.toFixed(1)}%</td></tr>`).join('')}</tbody>
    <tfoot><tr><td colspan="4" style="${TD};text-align:right;font-weight:800;background:#e2e8f0">TOTALES</td>
      <td style="${TD};text-align:right;font-weight:800;background:#e2e8f0">${_ipN(d.eqTot.motor)}</td>
      <td style="${TD};background:#e2e8f0"></td>
      <td style="${TD};text-align:right;font-weight:800;background:#e2e8f0">${_ipN(d.eqTot.efec)}</td>
      <td style="${TD};text-align:right;font-weight:800;background:#e2e8f0">${_ipN(d.eqTot.km,0)}</td>
      <td style="${TD};text-align:right;font-weight:800;background:#e2e8f0">${_ipN(d.eqTot.inop)}</td>
      <td style="${TD};text-align:center;font-weight:800;background:#e2e8f0">${d.eqTot.partes}</td>
      <td style="${TD};background:#e2e8f0"></td></tr></tfoot></table>`:'';

  const tblGuardia=d.personal.porGuardia.length?`<table class="ip-t">
    <thead><tr><th style="${TH};text-align:left">Guardia</th><th style="${TH}">Trabajadores</th><th style="${TH}">Jornadas</th><th style="${TH}">Horas Hombre</th><th style="${TH}">% de jornadas</th></tr></thead>
    <tbody>${d.personal.porGuardia.map(([g,v])=>`<tr>
      <td style="${TD}"><strong>${_ipEsc(g)}</strong></td>
      <td style="${TD};text-align:center">${v.n}</td>
      <td style="${TD};text-align:center">${v.jor}</td>
      <td style="${TD};text-align:right">${_ipN(v.jor*_IP_HH_DIA,0)}</td>
      <td style="${TD};text-align:right">${d.personal.jornadas?(v.jor/d.personal.jornadas*100).toFixed(1):'0.0'}%</td></tr>`).join('')}</tbody></table>`:'';

  const tblFalla=d.mecanica.porFalla.length?`<table class="ip-t">
    <thead><tr><th style="${TH};text-align:left">Tipo de Falla</th><th style="${TH}">Cantidad</th><th style="${TH}">Horas de Parada</th><th style="${TH}">% del total</th></tr></thead>
    <tbody>${d.mecanica.porFalla.map(([t,v])=>`<tr>
      <td style="${TD}">${_ipEsc(t)}</td><td style="${TD};text-align:center">${v.n}</td>
      <td style="${TD};text-align:right">${_ipN(v.horas)}</td>
      <td style="${TD};text-align:right">${d.mecanica.total?(v.n/d.mecanica.total*100).toFixed(1):'0.0'}%</td></tr>`).join('')}</tbody></table>`:'';

  const tblEqAux=d.mecanica.topEq.length?`<p class="ip-sub">Equipos con mayor número de atenciones</p><table class="ip-t">
    <thead><tr><th style="${TH}">#</th><th style="${TH}">Equipo</th><th style="${TH}">Atenciones</th><th style="${TH}">Horas de Parada</th></tr></thead>
    <tbody>${d.mecanica.topEq.map(([k,v],i)=>`<tr>
      <td style="${TD};text-align:center">${i+1}</td>
      <td style="${TD};text-align:center;font-family:monospace;font-weight:700">${_ipEsc(k)}</td>
      <td style="${TD};text-align:center">${v.n}</td>
      <td style="${TD};text-align:right">${_ipN(v.horas)}</td></tr>`).join('')}</tbody></table>`:'';

  const tblComb=d.combustible.topEq.length?`<p class="ip-sub">Equipos con mayor consumo</p><table class="ip-t">
    <thead><tr><th style="${TH}">#</th><th style="${TH}">Equipo</th><th style="${TH}">Atenciones</th><th style="${TH}">Galones</th><th style="${TH}">S/</th><th style="${TH}">% del total</th></tr></thead>
    <tbody>${d.combustible.topEq.map(([k,v],i)=>`<tr>
      <td style="${TD};text-align:center">${i+1}</td>
      <td style="${TD};text-align:center;font-family:monospace;font-weight:700">${_ipEsc(k)}</td>
      <td style="${TD};text-align:center">${v.n}</td>
      <td style="${TD};text-align:right;font-weight:700">${_ipN(v.gal)}</td>
      <td style="${TD};text-align:right">${_ipN(v.soles,2)}</td>
      <td style="${TD};text-align:right">${d.combustible.galDes?(v.gal/d.combustible.galDes*100).toFixed(1):'0.0'}%</td></tr>`).join('')}</tbody></table>`:'';

  const tblTipoMat=d.almacen.porTipo.length?`<table class="ip-t">
    <thead><tr><th style="${TH};text-align:left">Tipo de Material</th><th style="${TH}">Ítems</th><th style="${TH}">Valor S/</th><th style="${TH}">% del total</th></tr></thead>
    <tbody>${d.almacen.porTipo.map(([t,v])=>`<tr>
      <td style="${TD}">${_ipEsc(t)}</td><td style="${TD};text-align:center">${v.n}</td>
      <td style="${TD};text-align:right;font-weight:700">${_ipN(v.soles,2)}</td>
      <td style="${TD};text-align:right">${d.almacen.valSal?(v.soles/d.almacen.valSal*100).toFixed(1):'0.0'}%</td></tr>`).join('')}</tbody></table>`:'';

  const tblAlm=d.almacen.topItems.length?`<p class="ip-sub">Ítems más despachados</p><table class="ip-t">
    <thead><tr><th style="${TH}">#</th><th style="${TH}">Código</th><th style="${TH};text-align:left">Descripción</th><th style="${TH}">Unid.</th><th style="${TH}">Cantidad</th><th style="${TH}">Valor S/</th></tr></thead>
    <tbody>${d.almacen.topItems.map((it,i)=>`<tr>
      <td style="${TD};text-align:center">${i+1}</td>
      <td style="${TD};text-align:center;font-family:monospace">${_ipEsc(it.cod)||'—'}</td>
      <td style="${TD}">${_ipEsc(it.nom)}</td>
      <td style="${TD};text-align:center">${_ipEsc(it.und)}</td>
      <td style="${TD};text-align:right;font-weight:700">${_ipN(it.cant)}</td>
      <td style="${TD};text-align:right;font-weight:700">${_ipN(it.soles,2)}</td></tr>`).join('')}</tbody></table>`:'';

  return`
  <div class="ip-hdr">
    <img src="${logo}" alt="">
    <div class="ip-t1"><h1>INFORME DE PERÍODO</h1><p>ECOSERMO · Del ${_ipDMY(d.desde)} al ${_ipDMY(d.hasta)} · ${d.dias} días</p></div>
    <div class="ip-r">Emitido<br><strong>${new Date().toLocaleDateString('es-PE')}</strong></div>
  </div>

  ${parr(T.intro)}

  <div class="ip-res">
    <div class="ip-k"><span>Horas Máquina</span><strong>${_ipN(d.eqTot.motor)}</strong><em>${d.eqTot.nHr} con horómetro</em></div>
    <div class="ip-k"><span>Km Recorridos</span><strong>${_ipN(d.eqTot.km,0)}</strong><em>${d.eqTot.nKm} vehículos</em></div>
    <div class="ip-k"><span>Horas Hombre</span><strong>${_ipN(d.personal.hh,0)}</strong><em>${d.personal.total} trabajadores</em></div>
    <div class="ip-k"><span>Atenciones Mec.</span><strong>${d.mecanica.total}</strong><em>${_ipN(d.mecanica.horasParada)} h parada</em></div>
    <div class="ip-k"><span>Combustible</span><strong>${_ipN(d.combustible.galDes,0)}</strong><em>gal · S/ ${_ipN(d.combustible.solesDes,2)}</em></div>
    <div class="ip-k"><span>Almacén</span><strong>S/ ${_ipN(d.almacen.valSal,2)}</strong><em>${d.almacen.nSal} salidas</em></div>
  </div>

  ${sec(1,'EQUIPOS — HORAS Y KILÓMETROS DEL PERÍODO')}
  ${parr(T.equipos)}
  ${tblEq||'<p class="ip-vacio">Sin partes diarios registrados.</p>'}
  <p class="ip-nota">Horas efectivas = horas de motor menos el calentamiento definido en el Máster de Equipos. Los vehículos menores y los equipos con tarifa por día se miden en kilómetros, no en horas de motor.</p>

  ${sec(2,'PERSONAL — JORNADAS DEL PERÍODO')}
  ${parr(T.personal)}
  ${cajas([['Trabajadores',d.personal.total],['Jornadas',d.personal.jornadas],['Horas Hombre',_ipN(d.personal.hh,0)],
    ['Trabajo Día',d.personal.td],['Trabajo Noche',d.personal.tn],['Día Libre',d.personal.dl],
    ['Anexo 5',d.personal.a5],['DL Trabajado',d.personal.dlt],['Faltas',d.personal.faltas],
    ['Permisos',d.personal.permisos],['Desc. Médico',d.personal.dm],['Vacaciones',d.personal.vac]])}
  ${tblGuardia}
  <p class="ip-nota">Horas hombre = jornadas efectivas (TD + TN + DL Trabajado + Anexo 5) × ${_IP_HH_DIA} horas.</p>

  ${sec(3,'ATENCIONES MECÁNICAS')}
  ${parr(T.mecanica)}
  ${cajas([['Total auxilios',d.mecanica.total],['Atendidos',d.mecanica.aten],['En proceso',d.mecanica.proc],['Pendientes',d.mecanica.pend],
    ['Horas de parada',_ipN(d.mecanica.horasParada)],['Equipos atendidos',d.mecanica.equipos],['Insumos de almacén','S/ '+_ipN(d.mecanica.insumosVal,2)]])}
  ${tblFalla}${tblEqAux}

  ${sec(4,'CONSUMO DE COMBUSTIBLE')}
  ${parr(T.combustible)}
  ${cajas([['Ingresos',_ipN(d.combustible.galIng)+' gal'],['Despachos',_ipN(d.combustible.galDes)+' gal'],
    ['Valorizado','S/ '+_ipN(d.combustible.solesDes,2)],['N° de atenciones',d.combustible.nDes],
    ['Equipos atendidos',d.combustible.equipos],['Rend. horómetro',_ipN(d.combustible.rend,2)+' gal/h'],
    ['Rend. vehículos',_ipN(d.combustible.rendKm,2)+' km/gal']])}
  ${tblComb}

  ${sec(5,'CONSUMO DE ALMACÉN')}
  ${parr(T.almacen)}
  ${cajas([['Entradas',d.almacen.nEnt],['Salidas',d.almacen.nSal],['Vales emitidos',d.almacen.vales],
    ['Ítems distintos',d.almacen.items],['Valor entradas','S/ '+_ipN(d.almacen.valEnt,2)],['Valor salidas','S/ '+_ipN(d.almacen.valSal,2)]])}
  ${tblTipoMat}${tblAlm}
  <p class="ip-nota">Valorización según el Precio Unitario Referencial (P.U.R.) del catálogo de Materiales. Los ítems sin P.U.R. cargado valorizan en cero.</p>

  ${sec(6,'OBSERVACIONES Y CONCLUSIONES')}
  <div class="ip-notas">${_ipNotas.trim()?_ipEsc(_ipNotas):'<span style="color:#94a3b8;font-style:italic">Sin observaciones registradas para este período.</span>'}</div>

  <div class="ip-firmas">
    <div><div class="sp"></div><div class="ln"></div><strong>ELABORADO POR</strong><br>Control de Proyecto</div>
    <div><div class="sp"></div><div class="ln"></div><strong>REVISADO POR</strong><br>Residente de Proyecto</div>
    <div><div class="sp"></div><div class="ln"></div><strong>APROBADO POR</strong><br>Gerencia de Operaciones</div>
  </div>
  <div class="ip-pie"><span>ECOSERMO · Informe generado por el sistema GDAR</span><span>Período ${_ipDMY(d.desde)} — ${_ipDMY(d.hasta)}</span></div>`;
}

// Estilos del documento — compartidos por la vista previa y la impresión
const _IP_CSS=`
  .ip-doc{font-family:Arial,Helvetica,sans-serif;color:#111;font-size:11px;line-height:1.45}
  .ip-doc h1{font-size:19px;color:#0070C0;letter-spacing:.05em;margin:0}
  .ip-hdr{display:flex;align-items:center;gap:14px;border-bottom:3px solid #0070C0;padding-bottom:8px;margin-bottom:12px}
  .ip-hdr img{height:48px;object-fit:contain}
  .ip-t1{flex:1;text-align:center}
  .ip-t1 p{font-size:10.5px;color:#475569;margin-top:3px}
  .ip-r{text-align:right;font-size:9px;color:#475569}
  .ip-sec{font-size:11.5px;font-weight:800;color:#fff;background:#0070C0;padding:4px 9px;margin:16px 0 7px;letter-spacing:.04em}
  .ip-p{font-size:10.5px;text-align:justify;margin:0 0 8px;color:#1e293b}
  .ip-sub{font-size:10px;font-weight:700;color:#334155;margin:9px 0 3px}
  .ip-t{width:100%;border-collapse:collapse;margin-bottom:6px}
  .ip-cajas{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:7px}
  .ip-caja{border:1px solid #cbd5e1;border-left:3px solid #0070C0;border-radius:3px;padding:4px 10px;font-size:9px;background:#f8fafc}
  .ip-caja span{color:#64748b;display:block;font-size:8px;text-transform:uppercase;letter-spacing:.05em}
  .ip-caja strong{font-size:12.5px;color:#0f172a}
  .ip-res{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}
  .ip-k{flex:1;min-width:105px;border:1.5px solid #0070C0;border-radius:5px;padding:7px 9px;text-align:center;background:#f0f9ff}
  .ip-k span{display:block;font-size:8px;color:#475569;text-transform:uppercase;letter-spacing:.06em}
  .ip-k strong{font-size:17px;color:#0070C0}
  .ip-k em{display:block;font-size:8px;color:#64748b;font-style:normal;margin-top:1px}
  .ip-vacio{font-size:9.5px;color:#94a3b8;padding:6px 0;font-style:italic}
  .ip-nota{font-size:8px;color:#64748b;font-style:italic;margin:0 0 6px}
  .ip-notas{border:1px solid #cbd5e1;border-radius:4px;padding:9px;font-size:10px;min-height:52px;white-space:pre-wrap;background:#fffbeb}
  .ip-firmas{display:flex;gap:30px;margin-top:34px}
  .ip-firmas div{flex:1;text-align:center;font-size:8.5px}
  .ip-firmas .sp{height:32px}
  .ip-firmas .ln{border-top:1.2px solid #333;margin:0 12px 4px}
  .ip-pie{margin-top:12px;padding-top:5px;border-top:1px solid #e2e8f0;font-size:7.5px;color:#94a3b8;display:flex;justify-content:space-between}`;

// ══ VISTA EN PANTALLA: barra de control + hoja blanca ══
function rInformePeriodo(){
  const cont=document.getElementById('ipBody');if(!cont)return;
  _ipInit();
  const per=_ipPeriodo(_ipOffset);
  const inpS='background:var(--panel2);border:1px solid var(--border);border-radius:6px;padding:.25rem .5rem;color:var(--text);font-size:.75rem;color-scheme:dark;width:auto';
  const dias=Math.max(1,Math.round((new Date(_ipHasta+'T12:00')-new Date(_ipDesde+'T12:00'))/864e5)+1);

  const bar=`<div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;margin-bottom:.7rem;padding:.45rem .7rem;background:var(--panel2);border:1px solid var(--border);border-radius:8px">
    <span style="font-size:.62rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.08em">Período</span>
    <button onclick="_ipNav(-1)" style="background:none;border:1px solid var(--border);border-radius:5px;color:var(--text);cursor:pointer;font-size:.85rem;padding:.12rem .5rem" title="Período anterior">‹</button>
    <span style="font-weight:800;font-size:.8rem;min-width:112px;text-align:center">${per.label}</span>
    <button onclick="_ipNav(1)" style="background:none;border:1px solid var(--border);border-radius:5px;color:var(--text);cursor:pointer;font-size:.85rem;padding:.12rem .5rem" title="Período siguiente">›</button>
    <div style="width:1px;height:18px;background:var(--border)"></div>
    <span style="font-size:.7rem;color:var(--muted2)">Desde</span>
    <input type="date" class="date-ic-azul" value="${_ipDesde}" onchange="_ipSetFecha('desde',this.value)" style="${inpS}">
    <span style="font-size:.7rem;color:var(--muted2)">Hasta</span>
    <input type="date" class="date-ic-azul" value="${_ipHasta}" onchange="_ipSetFecha('hasta',this.value)" style="${inpS}">
    <span style="font-size:.7rem;font-family:monospace;font-weight:700;color:#a78bfa;background:rgba(139,92,246,.12);border:1px solid rgba(139,92,246,.35);border-radius:6px;padding:.15rem .5rem">${dias} días</span>
    <button onclick="_ipPrint()" style="margin-left:auto;font-size:.72rem;padding:.3rem .9rem;border-radius:6px;border:none;background:#b91c1c;color:#fff;cursor:pointer;font-weight:800;white-space:nowrap">🖨 Imprimir / PDF</button>
    <button onclick="_ipExcel()" style="font-size:.7rem;padding:.25rem .7rem;border-radius:5px;border:none;background:#166534;color:#fff;cursor:pointer;font-weight:700;white-space:nowrap">📊 Excel</button>
  </div>
  <div style="display:flex;align-items:flex-start;gap:.5rem;margin-bottom:.8rem;padding:.45rem .7rem;background:var(--panel2);border:1px solid var(--border);border-radius:8px">
    <span style="font-size:.62rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.08em;padding-top:.3rem;white-space:nowrap">📝 Observaciones</span>
    <textarea onchange="_ipSetNotas(this.value)" placeholder="Comentarios, incidencias relevantes y conclusiones del período — se imprimen en la sección 6 del informe." style="flex:1;min-height:44px;background:var(--panel);border:1px solid var(--border);border-radius:6px;padding:.4rem .6rem;color:var(--text);font-size:.76rem;font-family:inherit;resize:vertical">${_ipEsc(_ipNotas)}</textarea>
  </div>`;

  cont.innerHTML=bar+`<style>${_IP_CSS}</style>
    <div class="ip-doc" style="background:#fff;border-radius:8px;padding:1.4rem 1.6rem;max-width:1080px;margin:0 auto;box-shadow:0 4px 18px rgba(0,0,0,.45)">${_ipDoc()}</div>`;
}
function _ipSetNotas(v){_ipNotas=v;rInformePeriodo();}

// ══ IMPRESIÓN ══
function _ipPrint(){
  const doc=_ipDoc();
  const w=window.open('','_blank','width=1000,height=760');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Informe de Período ${_ipDMY(_ipDesde)} – ${_ipDMY(_ipHasta)}</title><style>
    @page{size:A4 portrait;margin:1cm}
    *{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
    body{background:#fff}
    ${_IP_CSS}
    .ip-sec{page-break-after:avoid}
    .ip-t{page-break-inside:auto}
    .ip-t tr{page-break-inside:avoid}
    .ip-firmas{page-break-inside:avoid}
  </style></head><body><div class="ip-doc">${doc}</div>
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
    ['Horas máquina (motor)',+d.eqTot.motor.toFixed(1),`${d.eqTot.nHr} equipos con horómetro`],
    ['Horas máquina efectivas',+d.eqTot.efec.toFixed(1),'motor − calentamiento'],
    ['Kilómetros recorridos',+d.eqTot.km.toFixed(1),`${d.eqTot.nKm} vehículos medidos por km`],
    ['Horas inoperativas',+d.eqTot.inop.toFixed(1),''],
    ['Horas hombre',d.personal.hh,`${d.personal.total} trabajadores`],
    ['Jornadas trabajadas',d.personal.jornadas,'TD + TN + DLT + A5'],
    ['Faltas',d.personal.faltas,''],
    ['Atenciones mecánicas',d.mecanica.total,`${d.mecanica.horasParada.toFixed(1)} h de parada`],
    ['Combustible despachado (gal)',+d.combustible.galDes.toFixed(1),'S/ '+d.combustible.solesDes.toFixed(2)],
    ['Rendimiento horómetro (gal/h)',+d.combustible.rend.toFixed(2),'solo equipos con horómetro'],
    ['Rendimiento vehículos (km/gal)',+d.combustible.rendKm.toFixed(2),'solo vehículos medidos por km'],
    ['Consumo de almacén (S/)',+d.almacen.valSal.toFixed(2),`${d.almacen.nSal} salidas · ${d.almacen.vales} vales`]];
  const wsR=XLSX.utils.aoa_to_sheet(hResumen);
  wsR['!cols']=[{wch:32},{wch:16},{wch:34}];
  XLSX.utils.book_append_sheet(wb,wsR,'Resumen');

  const wsE=XLSX.utils.aoa_to_sheet([[tit],[],
    ['#','EQUIPO','DESCRIPCIÓN','TIPO','MEDICIÓN','H. MOTOR','CALENT.','H. EFECTIVA','KM REC.','H. INOP.','PARTES','DISP. MEC. %'],
    ...d.equipos.map((e,i)=>[i+1,e.cod,e.nom,e.tipo,e.esKm?'Kilometraje':'Horómetro',
      e.esKm?'':+e.motor.toFixed(1),e.esKm?'':+e.cal.toFixed(1),e.esKm?'':+e.efec.toFixed(1),
      e.esKm?+e.km.toFixed(1):'',+e.inop.toFixed(1),e.partes,+e.dispMec.toFixed(1)])]);
  wsE['!cols']=[{wch:4},{wch:14},{wch:34},{wch:16},{wch:12},{wch:10},{wch:9},{wch:11},{wch:11},{wch:10},{wch:8},{wch:12}];
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
