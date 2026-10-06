// ══════════════════════════════════════════════════════════════════════════
//  MANTENIMIENTO MECÁNICO · DISPONIBILIDAD Y KPIs DE FLOTA  (Fase 1)
//
//  Indicadores de la flota por corte 21→20, calculados con lo que el sistema
//  YA registra — sin tablas nuevas:
//    · partes diarios      → horas programadas, operativas, inoperativas, stand-by
//    · auxilios mecánicos  → fallas, tiempo de parada, sistema (para el Pareto)
//    · insumos del auxilio × precio del catálogo → costo de repuestos
//
//  Modelo (las horas no se duplican):
//    H. Programadas  = N° de partes × horas por turno (⚙ del Panel de Horas)
//    Disponibilidad  = (Hrs Mín. Venta − H. Inoperativas) ÷ Hrs Mín. Venta
//                      Se toma de Corte de Equipos (_ceDatos), así que da
//                      EXACTAMENTE lo mismo en los dos módulos. Los preventivos
//                      restan: sus horas se cargan como inoperativas en el parte.
//    Utilización     = H. Operativas ÷ (H. Programadas − H. Inoperativas)
//    Uso productivo  = H. Operativas ÷ H. Programadas
//    MTBF            = H. Operativas ÷ N° de fallas
//    MTTR            = Tiempo de parada de las fallas ÷ N° de fallas con tiempo
//  Falla = auxilio «Correctiva no planificada» que no esté anulado.
//
//  Prefijo _fk.
// ══════════════════════════════════════════════════════════════════════════

// Alcance: solo la maquinaria de producción —Línea Amarilla y Línea Blanca—
// del proyecto elegido, que arranca en el N° 04 (Relavera R3). Vehículos y
// equipos menores no entran: no tienen horas mínimas de venta ni miden igual.
let _fkOffset=0, _fkTipo=null, _fkChart=null, _fkProy='EPY-004-26';
const _FK_TIPOS=['Línea Amarilla','Línea Blanca'];
function _fkSetProy(v){_fkProy=v||'';rFlotaKpi();}
const _FK_FALLA='CORRECTIVA NO PLANIFICADA';

const _fkEsc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const _fkN1=v=>(v==null||!isFinite(v))?'—':(+v).toLocaleString('es-PE',{minimumFractionDigits:1,maximumFractionDigits:1});
const _fkS=v=>'S/ '+(+v||0).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});
function _fkHP(){return typeof _phHsProgTurno==='function'?_phHsProgTurno():10;}

// ── Metas (editables con ⚙, se recuerdan en el navegador) ───────────────────
function _fkMetas(){
  let m={};try{m=JSON.parse(localStorage.getItem('gdar_fk_metas')||'{}');}catch(e){}
  return{dm:+m.dm>0?+m.dm:90,uso:+m.uso>0?+m.uso:85};
}
function _fkSetMetas(){
  const m=_fkMetas();
  const a=prompt('Meta de disponibilidad mecánica (%):',m.dm);if(a===null)return;
  const b=prompt('Meta de uso productivo (%):',m.uso);if(b===null)return;
  const dm=+String(a).replace(',','.'), uso=+String(b).replace(',','.');
  if(!(dm>0&&dm<=100&&uso>0&&uso<=100)){toast('Las metas van de 1 a 100',true);return;}
  try{localStorage.setItem('gdar_fk_metas',JSON.stringify({dm,uso}));}catch(e){}
  rFlotaKpi();
}

// ── Período 21→20, nombrado por su mes de cierre ────────────────────────────
function _fkPeriodo(){
  const hoy=new Date();
  let y=hoy.getFullYear(),m=hoy.getMonth();
  if(hoy.getDate()<21){m--;if(m<0){m=11;y--;}}
  m+=_fkOffset;
  while(m>11){m-=12;y++;}while(m<0){m+=12;y--;}
  const ini=new Date(y,m,21),fin=new Date(y,m+1,20);
  const iso=x=>`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;
  const MESES=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Setiembre','Octubre','Noviembre','Diciembre'];
  return{desde:iso(ini),hasta:iso(fin),label:MESES[fin.getMonth()]+' '+fin.getFullYear(),
    dias:Math.round((fin-ini)/864e5)+1};
}
function _fkNav(d){_fkOffset+=d;rFlotaKpi();}
function _fkSetTipo(t){_fkTipo=(_fkTipo===t)?null:t;rFlotaKpi();}

// ── Qué equipos entran ──────────────────────────────────────────────────────
// Los activos, y también los que hoy están desmovilizados pero trabajaron en
// el corte: si no, al revisar un mes pasado faltarían equipos.
function _fkDesmov(eq){
  const est=String((eq&&(eq.est||eq.status))||'').trim().toUpperCase();
  const sub=String((eq&&eq.sub)||'').trim().toUpperCase();
  return est==='DESMOVILIZADO'||sub==='DESMOVILIZADO';
}
function _fkTipoDe(eq){return _FK_TIPOS.includes(eq.tipo)?eq.tipo:'Otros';}
function _fkOrdenTipo(t){const i=_FK_TIPOS.indexOf(t);return i<0?_FK_TIPOS.length:i;}
function _fkEquipos(per,conTipo){
  const conPartes=new Set((DB.partes||[]).filter(p=>p.fecha>=per.desde&&p.fecha<=per.hasta).map(p=>+p.eqId));
  return (DB.equipos||[])
    .filter(eq=>_FK_TIPOS.includes(eq.tipo)&&String(eq.proyecto||'')===_fkProy)
    .filter(eq=>!_fkDesmov(eq)||conPartes.has(+eq.id))
    .filter(eq=>!conTipo||!_fkTipo||_fkTipoDe(eq)===_fkTipo)
    .sort((a,b)=>_fkOrdenTipo(_fkTipoDe(a))-_fkOrdenTipo(_fkTipoDe(b))
      ||String(a.sub||'').localeCompare(String(b.sub||''),'es')
      ||String(a.codigo||'').localeCompare(String(b.codigo||''),'es'));
}

// ── Auxilios del corte y su costo ───────────────────────────────────────────
function _fkAuxilios(per){
  return (DB.auxiliosMecanicos||[]).filter(a=>a.fecha>=per.desde&&a.fecha<=per.hasta
    &&String(a.est||'').toUpperCase()!=='ANULADO');
}
function _fkEsFalla(a){return String(a.tipoInt||'').trim().toUpperCase()===_FK_FALLA;}
function _fkParada(a){const t=+a.tiempoParada;return isFinite(t)&&t>0?t:null;}
// Costo de los repuestos de un auxilio: cantidad × precio del catálogo
function _fkCostoAux(a){
  let costo=0,sinPrecio=0;
  (DB.auxMecInsumos||[]).filter(i=>+i.auxilioId===+a.id).forEach(i=>{
    const cat=i.cod?(DB.catalogoItems||[]).find(c=>String(c.cod||'')===String(i.cod)):null;
    const pu=cat?+cat.pur||0:0;
    if(pu>0)costo+=(+i.cant||0)*pu;else sinPrecio++;
  });
  return{costo,sinPrecio};
}

// ── El cálculo ──────────────────────────────────────────────────────────────
function _fkDatos(){
  const per=_fkPeriodo();
  const HP=_fkHP();
  const auxs=_fkAuxilios(per);
  const filas=_fkEquipos(per,true).map(eq=>{
    const D=typeof _ceDatos==='function'?_ceDatos(eq,per):null;
    const turnos=D?D.filas:[];
    const hProg=turnos.length*HP;
    const hOper=D?D.totalEfec:0;
    const im=D?D.horasInop:0;
    // Stand-by: lo que quedó del turno sin trabajar ni estar inoperativo
    const standby=turnos.filter(f=>/STANDBY|STAND-BY|STAND BY/.test(f.cond))
      .reduce((s,f)=>s+Math.max(0,HP-f.horas-f.inop),0);
    const mios=auxs.filter(a=>+a.eqId===+eq.id);
    const fallas=mios.filter(_fkEsFalla);
    const conT=fallas.filter(a=>_fkParada(a)!=null);
    const hCorr=conT.reduce((s,a)=>s+_fkParada(a),0);
    let costo=0,sinPrecio=0;
    mios.forEach(a=>{const c=_fkCostoAux(a);costo+=c.costo;sinPrecio+=c.sinPrecio;});
    return{eq,tipo:_fkTipoDe(eq),turnos:turnos.length,hProg,hOper,im,standby,
      base:D?D.baseDisp:0,sinBase:D?D.sinBaseDisp:true,dm:D&&!D.sinBaseDisp?D.dispMec:null,
      util:(hProg-im)>0?hOper/(hProg-im)*100:null,
      uso:hProg>0?hOper/hProg*100:null,
      nAux:mios.length,nFallas:fallas.length,nConT:conT.length,hCorr,
      mtbf:fallas.length?hOper/fallas.length:null,
      mttr:conT.length?hCorr/conT.length:null,
      costo,sinPrecio};
  });

  // Totales de la flota filtrada
  const T={turnos:0,hProg:0,hOper:0,im:0,standby:0,nFallas:0,nConT:0,hCorr:0,costo:0,sinPrecio:0,
    baseSum:0,dispSum:0,conBase:0};
  filas.forEach(r=>{
    T.turnos+=r.turnos;T.hProg+=r.hProg;T.hOper+=r.hOper;T.im+=r.im;T.standby+=r.standby;
    T.nFallas+=r.nFallas;T.nConT+=r.nConT;T.hCorr+=r.hCorr;T.costo+=r.costo;T.sinPrecio+=r.sinPrecio;
    if(!r.sinBase){T.baseSum+=r.base;T.dispSum+=Math.max(0,r.base-r.im);T.conBase++;}
  });
  // Disponibilidad de la flota: ponderada por las horas que cada equipo debía dar
  T.dm=T.baseSum>0?Math.min(100,T.dispSum/T.baseSum*100):null;
  T.util=(T.hProg-T.im)>0?T.hOper/(T.hProg-T.im)*100:null;
  T.uso=T.hProg>0?T.hOper/T.hProg*100:null;
  T.mtbf=T.nFallas?T.hOper/T.nFallas:null;
  T.mttr=T.nConT?T.hCorr/T.nConT:null;
  T.n=filas.length;

  // Pareto por sistema: auxilios correctivos y preventivos (no la asistencia
  // operativa), de los equipos filtrados. Se ordena por N° de eventos, que es
  // el dato completo; las horas se muestran al lado.
  const ids=new Set(filas.map(r=>+r.eq.id));
  const porSis={};
  auxs.filter(a=>ids.has(+a.eqId)&&String(a.tipoInt||'').toUpperCase()!=='ASISTENCIA OPERATIVA').forEach(a=>{
    const s=String(a.tipo||'').trim()||'Sin clasificar';
    const o=(porSis[s]=porSis[s]||{sistema:s,eventos:0,horas:0});
    o.eventos++;o.horas+=_fkParada(a)||0;
  });
  const pareto=Object.values(porSis).sort((a,b)=>b.eventos-a.eventos||b.horas-a.horas);
  const totEv=pareto.reduce((s,p)=>s+p.eventos,0);
  let acum=0;
  pareto.forEach(p=>{acum+=p.eventos;p.pct=totEv?p.eventos/totEv*100:0;p.pctAcum=totEv?acum/totEv*100:0;});

  // Alertas
  const metas=_fkMetas();
  const alertas=[];
  filas.filter(r=>r.dm!=null&&r.dm<metas.dm).sort((a,b)=>a.dm-b.dm)
    .forEach(r=>alertas.push({tipo:'dm',eq:r.eq,valor:r.dm,meta:metas.dm}));
  filas.filter(r=>r.uso!=null&&r.uso<metas.uso).sort((a,b)=>a.uso-b.uso)
    .forEach(r=>alertas.push({tipo:'uso',eq:r.eq,valor:r.uso,meta:metas.uso}));
  auxs.filter(a=>ids.has(+a.eqId)&&!['ATENDIDO','ANULADO'].includes(String(a.est||'').toUpperCase()))
    .forEach(a=>alertas.push({tipo:'abierto',aux:a,eq:(DB.equipos||[]).find(e=>+e.id===+a.eqId)}));
  const sinBase=filas.filter(r=>r.sinBase&&r.turnos>0).length;

  return{per,HP,filas,total:T,pareto,totEv,alertas,metas,sinBase};
}

// ── Excel ───────────────────────────────────────────────────────────────────
function _fkExportXls(){
  if(typeof XLSX==='undefined'){toast('Librería Excel no disponible',true);return;}
  const D=_fkDatos();
  const r1=v=>v==null||!isFinite(v)?'':+(+v).toFixed(1);
  const aoa=[['DISPONIBILIDAD Y KPIs DE FLOTA — '+D.per.label.toUpperCase()],
    ['Período',D.per.desde+' al '+D.per.hasta,'Horas por turno',D.HP,'Filtro',_fkTipo||'Todos'],[],
    ['Código','Equipo','Tipo','Subtipo','Turnos','H. Prog.','H. Oper.','H. Inop.','Stand-by',
     'Hrs Mín. Venta','Disp. Mec. %','Utilización %','Uso Prod. %','Auxilios','Fallas','MTBF h','MTTR h','Costo repuestos S/']];
  D.filas.forEach(r=>aoa.push([r.eq.codigo||'',r.eq.nombre||'',r.tipo,r.eq.sub||'',r.turnos,
    r1(r.hProg),r1(r.hOper),r1(r.im),r1(r.standby),r.sinBase?'':r1(r.base),r1(r.dm),r1(r.util),r1(r.uso),
    r.nAux,r.nFallas,r1(r.mtbf),r1(r.mttr),+r.costo.toFixed(2)]));
  const T=D.total;
  aoa.push(['TOTAL FLOTA','','','',T.turnos,r1(T.hProg),r1(T.hOper),r1(T.im),r1(T.standby),
    r1(T.baseSum),r1(T.dm),r1(T.util),r1(T.uso),'',T.nFallas,r1(T.mtbf),r1(T.mttr),+T.costo.toFixed(2)]);
  aoa.push([],['PARETO POR SISTEMA'],['Sistema','Eventos','Horas de parada','%','% acumulado']);
  D.pareto.forEach(p=>aoa.push([p.sistema,p.eventos,r1(p.horas),r1(p.pct),r1(p.pctAcum)]));
  const ws=XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols']=[{wch:14},{wch:28},{wch:15},{wch:16}].concat(Array(14).fill({wch:12}));
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'KPIs Flota');
  XLSX.writeFile(wb,'KPIs Flota '+D.per.label+'.xlsx');
}

// ── Pantalla ────────────────────────────────────────────────────────────────
function rFlotaKpi(){
  const pg=document.getElementById('page-flotaKpi');if(!pg)return;
  const D=_fkDatos(), T=D.total, M=D.metas;
  const colDm=v=>v==null?'var(--muted2)':v>=M.dm?'#10b981':v>=M.dm-10?'#f59e0b':'#ef4444';
  const colUso=v=>v==null?'var(--muted2)':v>=M.uso?'#10b981':v>=M.uso-10?'#f59e0b':'#ef4444';
  const pct=v=>v==null?'—':(+v).toFixed(1)+'%';

  // Chips de tipo, con el diseño de los filtros del combustible
  const todosEq=_fkEquipos(D.per,false);
  const chip=t=>{
    const act=_fkTipo===t, n=todosEq.filter(e=>_fkTipoDe(e)===t).length;
    if(!n&&t==='Otros')return'';
    return`<button onclick="_fkSetTipo('${t}')" style="display:inline-flex;align-items:center;gap:.4rem;padding:.35rem .8rem;border-radius:20px;cursor:pointer;font-size:.76rem;font-weight:700;border:1.5px solid ${act?'#f97316':'var(--border)'};background:${act?'rgba(249,115,22,.18)':'var(--panel2)'};color:${act?'#f97316':'var(--text)'}">${t} <span style="font-family:monospace;font-size:.68rem;font-weight:900;color:${act?'#f97316':'var(--muted2)'}">${n} eq.</span>${act?' ✕':''}</button>`;
  };
  const chipTodos=`<button onclick="_fkTipo=null;rFlotaKpi()" style="display:inline-flex;align-items:center;padding:.35rem .8rem;border-radius:20px;cursor:pointer;font-size:.76rem;font-weight:700;border:1.5px solid ${!_fkTipo?'#06b6d4':'var(--border)'};background:${!_fkTipo?'rgba(6,182,212,.15)':'var(--panel2)'};color:${!_fkTipo?'#06b6d4':'var(--muted2)'}">Todos <span style="font-family:monospace;font-size:.68rem;font-weight:900;margin-left:.35rem">${todosEq.length}</span></button>`;

  const kpis=[
    {l:'Disponibilidad mecánica',v:pct(T.dm),c:colDm(T.dm),s:`${T.conBase} de ${T.n} equipos con Hrs Mín. Venta · meta ${M.dm}%`},
    {l:'Utilización',v:pct(T.util),c:'#06b6d4',s:'H. oper ÷ (H. prog − H. inop)'},
    {l:'Uso productivo',v:pct(T.uso),c:colUso(T.uso),s:`H. oper ÷ H. prog · meta ${M.uso}%`},
    {l:'MTBF',v:T.mtbf==null?'—':_fkN1(T.mtbf)+' h',c:'#8b5cf6',s:`Tiempo medio entre fallas · ${T.nFallas} falla(s)`},
    {l:'MTTR',v:T.mttr==null?'—':_fkN1(T.mttr)+' h',c:'#ec4899',s:`Tiempo medio de reparación · ${T.nConT} con tiempo`},
    {l:'Costo de repuestos',v:_fkS(T.costo),c:'#f97316',s:T.sinPrecio?`${T.sinPrecio} insumo(s) sin precio`:'insumos × catálogo'}
  ].map(k=>`<div class="kpi" style="--kc:${k.c}"><div class="kpi-lbl">${k.l}</div><div class="kpi-val" style="color:${k.c};font-size:${String(k.v).length>9?'1.2rem':'1.7rem'}">${k.v}</div><div style="font-size:.6rem;color:var(--muted2);margin-top:.3rem">${k.s}</div></div>`).join('');

  // Alertas
  const al=D.alertas.slice(0,12).map(a=>{
    if(a.tipo==='abierto')return`<li>🔧 <b>${_fkEsc(a.eq?a.eq.codigo:'?')}</b> — auxilio ${_fkEsc(a.aux.cod||'')} <b>abierto</b> (${_fkEsc(a.aux.est||'')})</li>`;
    const que=a.tipo==='dm'?'Disponibilidad':'Uso productivo';
    return`<li>⚠ <b>${_fkEsc(a.eq.codigo)}</b> — ${que} <b style="color:#ef4444">${a.valor.toFixed(1)}%</b> bajo la meta de ${a.meta}%</li>`;
  }).join('');
  const alertasHtml=(D.alertas.length||D.sinBase)?`<div class="card" style="margin-bottom:1rem;border-color:#ef444455">
    <div class="card-head"><span class="card-title">🚨 Alertas · ${D.alertas.length}</span></div>
    <div class="card-body" style="font-size:.78rem;line-height:1.7">
      ${al?`<ul style="margin:0;padding-left:1.1rem">${al}</ul>`:''}
      ${D.alertas.length>12?`<div style="color:var(--muted2);font-size:.7rem">… y ${D.alertas.length-12} más (ver tabla)</div>`:''}
      ${D.sinBase?`<div style="margin-top:.4rem;color:var(--muted2)">ℹ ${D.sinBase} equipo(s) con partes en el corte no tienen <b>Hrs Mín. Venta</b> en el Máster: su disponibilidad no se puede medir.</div>`:''}
    </div></div>`:'';

  // Pareto
  const paretoTabla=D.pareto.length?D.pareto.map(p=>`<tr>
    <td style="padding:.3rem .5rem">${_fkEsc(p.sistema)}</td>
    <td style="padding:.3rem .5rem;text-align:right;font-family:monospace;font-weight:700">${p.eventos}</td>
    <td style="padding:.3rem .5rem;text-align:right;font-family:monospace">${_fkN1(p.horas)}</td>
    <td style="padding:.3rem .5rem;text-align:right;font-family:monospace">${p.pct.toFixed(1)}%</td>
    <td style="padding:.3rem .5rem;text-align:right;font-family:monospace;color:${p.pctAcum<=80?'#f59e0b':'var(--muted2)'}">${p.pctAcum.toFixed(1)}%</td>
  </tr>`).join(''):`<tr><td colspan="5" style="padding:1rem;text-align:center;color:var(--muted2)">Sin auxilios en el corte</td></tr>`;

  // Tabla por equipo
  const TD='padding:.35rem .5rem;border-bottom:1px solid var(--border);font-size:.74rem;white-space:nowrap';
  const TH='background:var(--panel2);color:var(--muted2);font-size:.6rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;padding:.4rem .5rem;white-space:nowrap;position:sticky;top:0;z-index:2';
  const filasHtml=D.filas.map(r=>`<tr>
    <td style="${TD};font-family:monospace;font-weight:700;color:var(--mec)">${_fkEsc(r.eq.codigo)}</td>
    <td style="${TD};font-size:.66rem;color:var(--muted2)">${_fkEsc(r.eq.sub||r.tipo)}</td>
    <td style="${TD};text-align:center;font-family:monospace">${r.turnos||'—'}</td>
    <td style="${TD};text-align:right;font-family:monospace">${r.turnos?_fkN1(r.hProg):'—'}</td>
    <td style="${TD};text-align:right;font-family:monospace;font-weight:700">${r.turnos?_fkN1(r.hOper):'—'}</td>
    <td style="${TD};text-align:right;font-family:monospace;color:${r.im?'#ef4444':'var(--muted2)'}">${r.im?_fkN1(r.im):'—'}</td>
    <td style="${TD};text-align:right;font-family:monospace;color:${r.standby?'#f59e0b':'var(--muted2)'}">${r.standby?_fkN1(r.standby):'—'}</td>
    <td style="${TD};text-align:right;font-family:monospace;font-weight:800;color:${colDm(r.dm)}" title="${r.sinBase?'Falta Hrs Mín. Venta en el Máster':'Base: '+_fkN1(r.base)+' h'}">${r.sinBase?'s/base':pct(r.dm)}</td>
    <td style="${TD};text-align:right;font-family:monospace">${pct(r.util)}</td>
    <td style="${TD};text-align:right;font-family:monospace;font-weight:700;color:${colUso(r.uso)}">${pct(r.uso)}</td>
    <td style="${TD};text-align:center;font-family:monospace">${r.nFallas||'—'}</td>
    <td style="${TD};text-align:right;font-family:monospace">${r.mtbf==null?'—':_fkN1(r.mtbf)}</td>
    <td style="${TD};text-align:right;font-family:monospace">${r.mttr==null?'—':_fkN1(r.mttr)}</td>
    <td style="${TD};text-align:right;font-family:monospace;color:${r.costo?'#f97316':'var(--muted2)'}">${r.costo?_fkS(r.costo):'—'}</td>
  </tr>`).join('');

  pg.innerHTML=`
    <div class="ph"><div class="ph-title" style="color:var(--mec)">Disponibilidad y KPIs de Flota</div>
      <div class="ph-sub">Línea Amarilla y Línea Blanca · desde partes diarios y auxilios mecánicos · corte 21→20</div></div>
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.6rem;margin-bottom:1rem">
      <div style="font-size:.78rem;color:var(--muted2)">Período 21→20 · <span class="mono">${D.per.desde}</span> al <span class="mono">${D.per.hasta}</span> · ${D.per.dias} días · ${D.HP} h por turno</div>
      <div style="display:flex;gap:.5rem;align-items:center">
        <button onclick="_fkSetMetas()" title="Cambiar las metas" style="font-size:.72rem;padding:.35rem .7rem;border-radius:7px;border:1px solid var(--border);background:var(--panel2);color:var(--muted2);cursor:pointer">⚙ Metas ${M.dm}% / ${M.uso}%</button>
        <button onclick="_fkExportXls()" style="font-size:.72rem;padding:.35rem .8rem;border-radius:7px;border:none;background:#166534;color:#fff;cursor:pointer;font-weight:700">📊 Excel</button>
        <div style="display:flex;align-items:center;background:var(--panel2);border:1px solid var(--border);border-radius:8px;overflow:hidden">
          <button onclick="_fkNav(-1)" style="background:none;border:none;border-right:1px solid var(--border);color:var(--text);cursor:pointer;font-size:1.1rem;padding:.35rem .7rem">‹</button>
          <span style="font-weight:800;font-size:.88rem;min-width:130px;text-align:center;padding:0 .5rem">${D.per.label}</span>
          <button onclick="_fkNav(1)" style="background:none;border:none;border-left:1px solid var(--border);color:var(--text);cursor:pointer;font-size:1.1rem;padding:.35rem .7rem">›</button>
        </div>
      </div>
    </div>
    <div style="display:flex;gap:.35rem;flex-wrap:wrap;align-items:center;margin-bottom:1rem">
      <span style="font-size:.64rem;color:var(--muted2);text-transform:uppercase;letter-spacing:.07em;font-weight:700">Proyecto:</span>
      <select onchange="_fkSetProy(this.value)" style="background:var(--panel2);border:1px solid var(--border);border-radius:20px;color:var(--text);padding:.35rem .8rem;font-size:.76rem;font-weight:700;max-width:340px">
        ${(DB.proyectos||[]).map(p=>`<option value="${_fkEsc(p.codigo)}"${p.codigo===_fkProy?' selected':''}>${_fkEsc(p.codigo)} · ${_fkEsc(String(p.nombre||'').slice(0,40))}</option>`).join('')}
      </select>
      <span style="width:1px;height:20px;background:var(--border);margin:0 .3rem"></span>
      <span style="font-size:.64rem;color:var(--muted2);text-transform:uppercase;letter-spacing:.07em;font-weight:700">Tipo de equipo:</span>
      ${chipTodos}${_FK_TIPOS.map(chip).join('')}
    </div>
    <div class="kpi-row">${kpis}</div>
    ${alertasHtml}
    <div style="display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);gap:1rem;margin-bottom:1rem" class="fk-grid">
      <div class="card"><div class="card-head"><span class="card-title">📉 Pareto de fallas por sistema</span></div>
        <div class="card-body" style="height:280px;position:relative">${D.pareto.length?'<canvas id="fkPareto"></canvas>':'<div style="text-align:center;padding:3rem;color:var(--muted2)">Sin auxilios en el corte</div>'}</div></div>
      <div class="card"><div class="card-head"><span class="card-title">Sistemas · ${D.totEv} evento(s)</span></div>
        <div class="card-body" style="padding:0;overflow:auto;max-height:280px"><table style="width:100%;border-collapse:collapse;font-size:.74rem">
          <thead><tr style="color:var(--muted2);font-size:.6rem;text-transform:uppercase"><th style="text-align:left;padding:.35rem .5rem">Sistema</th><th style="text-align:right;padding:.35rem .5rem">Eventos</th><th style="text-align:right;padding:.35rem .5rem">Horas</th><th style="text-align:right;padding:.35rem .5rem">%</th><th style="text-align:right;padding:.35rem .5rem">% acum.</th></tr></thead>
          <tbody>${paretoTabla}</tbody></table></div></div>
    </div>
    <div class="card">
      <div class="card-head"><span class="card-title">🚜 KPIs por equipo · ${D.filas.length}</span></div>
      <div class="card-body" style="padding:0"><div class="tbl-wrap" style="max-height:60vh;overflow:auto">
        <table style="min-width:100%;border-collapse:collapse"><thead><tr>
          <th style="${TH};text-align:left">Código</th><th style="${TH};text-align:left">Subtipo</th><th style="${TH}">Turnos</th>
          <th style="${TH};text-align:right">H. Prog.</th><th style="${TH};text-align:right">H. Oper.</th>
          <th style="${TH};text-align:right">H. Inop.</th><th style="${TH};text-align:right">Stand-by</th>
          <th style="${TH};text-align:right">Disp. Mec.</th><th style="${TH};text-align:right">Utiliz.</th>
          <th style="${TH};text-align:right">Uso Prod.</th><th style="${TH}">Fallas</th>
          <th style="${TH};text-align:right" title="Tiempo medio entre fallas">MTBF h</th><th style="${TH};text-align:right" title="Tiempo medio de reparación">MTTR h</th>
          <th style="${TH};text-align:right">Repuestos</th>
        </tr></thead><tbody>${filasHtml||`<tr><td colspan="14" style="${TD};text-align:center;padding:2rem;color:var(--muted2)">Sin equipos en este filtro</td></tr>`}</tbody></table>
      </div></div>
    </div>`;

  // Gráfico de Pareto: barras de eventos y línea del % acumulado
  if(_fkChart){try{_fkChart.destroy();}catch(e){}_fkChart=null;}
  const cv=document.getElementById('fkPareto');
  if(cv&&typeof Chart!=='undefined'&&D.pareto.length){
    _fkChart=new Chart(cv.getContext('2d'),{
      data:{labels:D.pareto.map(p=>p.sistema),datasets:[
        {type:'bar',label:'Eventos',data:D.pareto.map(p=>p.eventos),backgroundColor:'#8b5cf6',borderRadius:4,yAxisID:'y'},
        {type:'line',label:'% acumulado',data:D.pareto.map(p=>+p.pctAcum.toFixed(1)),borderColor:'#f59e0b',backgroundColor:'#f59e0b',tension:.2,yAxisID:'y2',pointRadius:3}
      ]},
      options:{responsive:true,maintainAspectRatio:false,
        plugins:{legend:{labels:{color:'#cbd5e1',font:{size:10}}}},
        scales:{
          x:{ticks:{color:'#cbd5e1',font:{size:10}},grid:{display:false}},
          y:{beginAtZero:true,ticks:{color:'#94a3b8',precision:0},grid:{color:'rgba(148,163,184,.15)'},title:{display:true,text:'Eventos',color:'#94a3b8'}},
          y2:{position:'right',min:0,max:100,ticks:{color:'#f59e0b',callback:v=>v+'%'},grid:{display:false}}
        }}
    });
  }
}
