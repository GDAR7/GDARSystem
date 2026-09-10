// ══════════════════════════════════════════════════════════════════════════
//  COST CONTROL — EXPORTAR (Excel y PDF)
//  Dos botones fijos que exportan la pestaña que esté abierta. No recalculan
//  nada: piden los mismos _ccCalcEq / _ccCalcHH que pinta la pantalla, así que
//  el archivo siempre dice lo mismo que se está viendo —incluido el filtro de
//  proyecto, el modo de tarifa y el tratamiento del combustible.
//
//  La pestaña Anual delega en _ccaExcel / _ccaPdf, que ya conocen su matriz.
// ══════════════════════════════════════════════════════════════════════════

// ── Datos del período, tal como los ve la pantalla ──────────────────────────
function _ccxDatos(){
  const per=_ccPeriodo();
  const KEY=_ccTarifaModo==='seca'?'seca':'full';
  const C=_ccCalcEq(per,KEY);
  const hhRows=_ccCalcHH(per);
  return{per,KEY,esFull:KEY==='full',hhRows,
         totalHH:hhRows.reduce((s,r)=>s+r.costo,0),...C};
}

// Lo que hace falta saber para leer bien las cifras: sin esto, dos archivos
// del mismo período pueden traer números distintos y nadie sabría por qué.
function _ccxContexto(D){
  const p=[`Período 21→20: ${D.per.desde} al ${D.per.hasta} (${D.per.dias} días)`,
           D.esFull?'Tarifa Full':'Máq. Seca'];
  if(_ccSinIgv)p.push('combustible sin IGV (÷1.18)');
  if(_ccPrecioManual)p.push(`combustible al precio manual S/ ${(+D.precioComb||0).toFixed(2)}/gal`);
  if(_ccProyecto)p.push(`solo proyecto ${_ccProyecto}`);
  return p.join(' · ');
}
function _ccxNombre(ext){
  const t={equipos:'Equipos',personal:'Personal',resumen:'Resumen'}[_ccTabActiva]||'Cost_Control';
  return`Cost_Control_${t}_${_ccPeriodo().hasta}${_ccProyecto?'_'+_ccProyecto:''}.${ext}`;
}
const _ccxEsc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
  .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const _ccxN=v=>Number(v||0).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});

// ── Despachadores ───────────────────────────────────────────────────────────
function _ccxExcel(){
  if(_ccTabActiva==='anual')return _ccaExcel();
  if(typeof XLSX==='undefined'){toast('Librería de Excel no disponible',true);return;}
  const D=_ccxDatos();
  const hoja=_ccTabActiva==='personal'?_ccxHojaPersonal(D)
            :_ccTabActiva==='resumen' ?_ccxHojaResumen(D)
                                      :_ccxHojaEquipos(D);
  if(!hoja){toast('No hay datos para exportar',true);return;}
  const ws=XLSX.utils.aoa_to_sheet(hoja.aoa);
  ws['!merges']=[{s:{r:0,c:0},e:{r:0,c:hoja.nc-1}},{s:{r:1,c:0},e:{r:1,c:hoja.nc-1}}];
  ws['!cols']=hoja.cols;
  ws['!freeze']={xSplit:0,ySplit:3};
  if(hoja.filtro)ws['!autofilter']={ref:XLSX.utils.encode_range(
    {s:{r:2,c:0},e:{r:hoja.aoa.length-1,c:hoja.nc-1}})};
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,hoja.nombre);
  XLSX.writeFile(wb,_ccxNombre('xlsx'));
  toast('✓ '+hoja.nombre+' exportado');
}

function _ccxPdf(){
  if(_ccTabActiva==='anual')return _ccaPdf();
  const D=_ccxDatos();
  const doc=_ccTabActiva==='personal'?_ccxPdfPersonal(D)
           :_ccTabActiva==='resumen' ?_ccxPdfResumen(D)
                                     :_ccxPdfEquipos(D);
  if(!doc){toast('No hay datos para imprimir',true);return;}
  _ccxImprimir(doc.titulo,doc.cuerpo,doc.horizontal!==false);
}

// ── Ventana de impresión (mismo patrón que el resto del sistema) ────────────
function _ccxImprimir(titulo,cuerpo,horizontal){
  const w=window.open('','_blank','width=1200,height=800');
  if(!w){toast('Active las ventanas emergentes',true);return;}
  const logo=window.location.href.replace(/[^\/\\]+$/,'')
    +(typeof EMPRESA!=='undefined'?EMPRESA.logo:'');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${_ccxEsc(titulo)}</title><style>
    *{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
    body{font-family:Arial,sans-serif;background:#fff;color:#111;padding:1cm}
    table{width:100%;border-collapse:collapse}
    tr{page-break-inside:avoid}
    thead{display:table-header-group}
    @page{size:A4 ${horizontal?'landscape':'portrait'};margin:.8cm}
  </style></head><body>
    <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #1e3a5f;padding-bottom:8px;margin-bottom:10px">
      <img src="${logo}" style="height:44px;object-fit:contain" onerror="this.style.visibility='hidden'">
      <div style="text-align:center;flex:1">
        <div style="font-size:16px;font-weight:900;color:#1e3a5f">${_ccxEsc(titulo)}</div>
      </div>
      <div style="width:120px"></div>
    </div>
    ${cuerpo}
    <div style="margin-top:10px;font-size:7.5px;color:#94a3b8;text-align:right">
      Generado el ${new Date().toLocaleString('es-PE')}</div>
  </body></html>`);
  w.document.close();
  // Se espera al logo: si se imprime antes, la cabecera sale sin él
  w.onload=()=>{w.focus();w.print();};
  setTimeout(()=>{try{w.focus();w.print();}catch(e){}},700);
}

// Estilos compartidos de las tablas impresas
const _CCX_TH='background:#1e3a5f;color:#fff;padding:4px 6px;font-size:8px;text-transform:uppercase;letter-spacing:.04em;border:1px solid #fff';
const _CCX_TD='border:1px solid #cbd5e1;padding:3px 6px;font-size:8.5px;color:#111';
function _ccxCabecera(D,sub){
  return`<div style="font-size:9.5px;color:#475569;text-align:center;margin:-6px 0 10px">${_ccxEsc(sub)}</div>
  <div style="font-size:8px;color:#64748b;margin-bottom:8px;padding:4px 6px;background:#f1f5f9;border-left:3px solid #1e3a5f">${_ccxEsc(_ccxContexto(D))}</div>`;
}
function _ccxKpisPdf(kpis){
  return`<div style="display:grid;grid-template-columns:repeat(${kpis.length},1fr);gap:8px;margin-bottom:10px">
    ${kpis.map(([l,v,c])=>`<div style="border:1px solid #cbd5e1;border-radius:5px;padding:5px 8px;text-align:center">
      <div style="font-size:7.5px;color:#64748b;text-transform:uppercase;letter-spacing:.06em">${_ccxEsc(l)}</div>
      <div style="font-size:12.5px;font-weight:800;color:${c}">${v}</div>
    </div>`).join('')}
  </div>`;
}

// ══ EQUIPOS ════════════════════════════════════════════════════════════════
// El Excel lleva más columnas que la pantalla: el margen en soles (arriba solo
// se ve el %), el número de EDP y si el costo es real o estimado. Son las que
// hacen falta para revisar fuera del sistema.
function _ccxFilasEquipos(D){
  return D.eqRows.map(r=>{
    const dias=r.diasPresentes.size;
    const un=r.un||'HM';
    const inc=un==='HM'?+r.horasEf.toFixed(1):un==='DIA'?dias
             :+(D.per.dias>0?dias/D.per.dias*100:0).toFixed(1);
    return{
      codigo:r.eq.codigo||'', equipo:`${r.eq.marca||''} ${r.eq.modelo||''}`.trim()||r.eq.nombre||'',
      sub:r.eq.sub||'', tipo:r.eq.tipo||'Otros', proveedor:r.eq.proveedor||'—',
      proyecto:r.eq.proyecto||'—', un, inc,
      incTxt:un==='HM'?inc.toFixed(1)+' h':un==='DIA'?inc+' d':inc.toFixed(0)+'%',
      tarifa:r.tarifaObj?+r.tarifaObj[D.KEY]||0:0,
      ventaEq:+(r.ventaEq||0), ventaComb:+(r.ventaComb||0), venta:+(r.costo||0),
      gal:+(r.galones||0), costoComb:+(r.costoComb||0), costoProv:+(r.costoProveedor||0),
      origen:r.edp?('EDP '+r.edp.nums.filter(Boolean).join(', ')):(r.eq.tarifa?'Estimado':'Sin tarifa'),
      margen:+(r.margen||0), pct:r.costo>0?r.margen/r.costo:0
    };
  }).sort((a,b)=>a.tipo.localeCompare(b.tipo)||a.codigo.localeCompare(b.codigo));
}

function _ccxHojaEquipos(D){
  const F=_ccxFilasEquipos(D);
  if(!F.length)return null;
  const S=_ccxCelda;
  const HDR=['TIPO','CÓDIGO','EQUIPO','SUBTIPO','CONTRATISTA','PROYECTO','UN.','INCIDENCIA','TARIFA',
    ...(D.esFull?['VENTA EQUIPO','VENTA COMBUSTIBLE']:['VENTA']),
    'VENTA TOTAL','GALONES','COSTO COMB.','COSTO PROV.','ORIGEN COSTO','MARGEN S/','MARGEN %'];
  const aoa=_ccxEncabezado('COST CONTROL — EQUIPOS',_ccxContexto(D)+` · ${F.length} equipo(s)`,HDR);
  const num=(v,c)=>S(+(v||0).toFixed(2),{al:'right',numFmt:'#,##0.00',col:c});
  F.forEach(f=>aoa.push([
    S(f.tipo),S(f.codigo,{b:1}),S(f.equipo),S(f.sub),S(f.proveedor),S(f.proyecto),
    S(f.un,{al:'center'}),S(f.inc,{al:'right',numFmt:'#,##0.0'}),num(f.tarifa,'475569'),
    ...(D.esFull?[num(f.ventaEq,'0E7490'),num(f.ventaComb,'6D28D9')]:[num(f.venta,'0E7490')]),
    num(f.venta,'0E7490'),
    S(+f.gal.toFixed(1),{al:'right',numFmt:'#,##0.0'}),num(f.costoComb,'C2410C'),
    num(f.costoProv,'B45309'),S(f.origen,{al:'center'}),
    num(f.margen,f.margen<0?'B91C1C':'047857'),
    S(f.pct,{al:'right',numFmt:'0%',col:f.margen<0?'B91C1C':'047857'})
  ]));
  const T=(k)=>F.reduce((s,f)=>s+f[k],0);
  // Nueve columnas de texto antes de la venta: TIPO · CÓDIGO · EQUIPO · SUBTIPO
  // · CONTRATISTA · PROYECTO · UN. · INCIDENCIA · TARIFA
  aoa.push([S('TOTALES',{b:1,bg:'EEF2F8'}),...Array(8).fill(S('',{bg:'EEF2F8'})),
    ...(D.esFull?[_ccxTot(T('ventaEq'),'0E7490'),_ccxTot(T('ventaComb'),'6D28D9')]:[_ccxTot(T('venta'),'0E7490')]),
    _ccxTot(T('venta'),'0E7490'),
    S(+T('gal').toFixed(1),{b:1,bg:'EEF2F8',al:'right',numFmt:'#,##0.0'}),
    _ccxTot(T('costoComb'),'C2410C'),_ccxTot(T('costoProv'),'B45309'),
    S('',{bg:'EEF2F8'}),_ccxTot(T('margen'),'047857'),
    S(T('venta')>0?T('margen')/T('venta'):0,{b:1,bg:'EEF2F8',al:'right',numFmt:'0%',col:'047857'})]);
  return{aoa,nc:HDR.length,nombre:'Equipos',filtro:true,
    cols:[{wch:16},{wch:13},{wch:26},{wch:16},{wch:22},{wch:14},{wch:6},{wch:12},{wch:12},
      ...Array(D.esFull?3:2).fill({wch:15}),{wch:10},{wch:13},{wch:14},{wch:16},{wch:14},{wch:10}]};
}

function _ccxPdfEquipos(D){
  const F=_ccxFilasEquipos(D);
  if(!F.length)return null;
  const grupos={};
  F.forEach(f=>{(grupos[f.tipo]=grupos[f.tipo]||[]).push(f);});
  const NC=D.esFull?11:10;
  const der=`${_CCX_TD};text-align:right`;
  let body='';
  Object.entries(grupos).forEach(([tipo,items])=>{
    body+=`<tr><td colspan="${NC}" style="${_CCX_TD};background:#e0f2fe;font-weight:800;color:#0c4a6e;font-size:8px">${_ccxEsc(tipo)} · ${items.length} equipo(s)</td></tr>`;
    items.forEach(f=>{
      body+=`<tr>
        <td style="${_CCX_TD};font-weight:700">${_ccxEsc(f.codigo)}</td>
        <td style="${_CCX_TD}">${_ccxEsc(f.equipo)}<div style="font-size:7px;color:#64748b">${_ccxEsc(f.sub)}</div></td>
        <td style="${_CCX_TD};text-align:center">${_ccxEsc(f.incTxt)}</td>
        <td style="${der}">${_ccxN(f.tarifa)}</td>
        <td style="${der};color:#0E7490;font-weight:700">${_ccxN(f.ventaEq)}</td>
        ${D.esFull?`<td style="${der};color:#6D28D9;font-weight:700">${f.ventaComb?_ccxN(f.ventaComb):'—'}</td>`:''}
        <td style="${der}">${f.gal?f.gal.toFixed(1):'—'}</td>
        <td style="${der};color:#C2410C">${f.costoComb?_ccxN(f.costoComb):'—'}</td>
        <td style="${der};color:#B45309;font-weight:700">${_ccxN(f.costoProv)}
          <div style="font-size:6.5px;color:#94a3b8">${_ccxEsc(f.origen)}</div></td>
        <td style="${der};font-weight:800;color:${f.margen<0?'#b91c1c':'#047857'}">${_ccxN(f.margen)}</td>
        <td style="${der};color:${f.margen<0?'#b91c1c':'#047857'}">${f.venta>0?(f.pct*100).toFixed(0)+'%':'—'}</td>
      </tr>`;
    });
    const sub=k=>items.reduce((s,f)=>s+f[k],0);
    body+=`<tr style="background:#f8fafc;font-weight:800">
      <td colspan="4" style="${der};font-size:7.5px;color:#475569">Subtotal ${_ccxEsc(tipo)}</td>
      <td style="${der};color:#0E7490">${_ccxN(sub('ventaEq'))}</td>
      ${D.esFull?`<td style="${der};color:#6D28D9">${_ccxN(sub('ventaComb'))}</td>`:''}
      <td style="${der}">${sub('gal').toFixed(1)}</td>
      <td style="${der};color:#C2410C">${_ccxN(sub('costoComb'))}</td>
      <td style="${der};color:#B45309">${_ccxN(sub('costoProv'))}</td>
      <td style="${der};color:#047857">${_ccxN(sub('margen'))}</td><td style="${_CCX_TD}"></td>
    </tr>`;
  });
  const T=k=>F.reduce((s,f)=>s+f[k],0);
  const cuerpo=_ccxCabecera(D,'Venta, costo y margen por equipo')
    +_ccxKpisPdf([
      ['Venta equipos','S/ '+_ccxN(D.totalVentaEq),'#0E7490'],
      ['Costo proveedor','S/ '+_ccxN(D.totalCostoEq),'#B45309'],
      ['Combustible','S/ '+_ccxN(D.totalCombEq),'#C2410C'],
      ['Margen bruto','S/ '+_ccxN(D.totalMargenEq),'#047857']])
    +`<table><thead><tr>
      <th style="${_CCX_TH};text-align:left">Código</th><th style="${_CCX_TH};text-align:left">Equipo</th>
      <th style="${_CCX_TH}">Incid.</th><th style="${_CCX_TH}">Tarifa</th>
      <th style="${_CCX_TH}">${D.esFull?'Venta Equipo':'Venta'}</th>
      ${D.esFull?`<th style="${_CCX_TH}">Venta Comb.</th>`:''}
      <th style="${_CCX_TH}">Gal.</th><th style="${_CCX_TH}">Costo Comb.</th>
      <th style="${_CCX_TH}">Costo Prov.</th><th style="${_CCX_TH}">Margen S/</th><th style="${_CCX_TH}">%</th>
    </tr></thead><tbody>${body}</tbody>
    <tfoot><tr style="background:#e2e8f0;font-weight:900">
      <td colspan="4" style="${der}">TOTAL EQUIPOS</td>
      <td style="${der};color:#0E7490">${_ccxN(T('ventaEq'))}</td>
      ${D.esFull?`<td style="${der};color:#6D28D9">${_ccxN(T('ventaComb'))}</td>`:''}
      <td style="${der}">${T('gal').toFixed(1)}</td>
      <td style="${der};color:#C2410C">${_ccxN(T('costoComb'))}</td>
      <td style="${der};color:#B45309">${_ccxN(T('costoProv'))}</td>
      <td style="${der};color:#047857">${_ccxN(T('margen'))}</td>
      <td style="${der}">${T('venta')>0?(T('margen')/T('venta')*100).toFixed(0)+'%':'—'}</td>
    </tr></tfoot></table>`;
  return{titulo:'COST CONTROL — EQUIPOS',cuerpo};
}

// ══ PERSONAL ═══════════════════════════════════════════════════════════════
function _ccxHojaPersonal(D){
  if(!D.hhRows.length)return null;
  const S=_ccxCelda;
  const HDR=['PERSONA','CARGO','DÍAS','TARIFA MES','COSTO DÍA','VENTA'];
  const aoa=_ccxEncabezado('COST CONTROL — PERSONAL',
    _ccxContexto(D)+` · ${D.hhRows.length} persona(s)`,HDR);
  [...D.hhRows].sort((a,b)=>b.costo-a.costo).forEach(r=>aoa.push([
    S(r.persona||'',{b:1}),S(r.tarifa.lab||''),
    S(+r.dias||0,{al:'right',numFmt:'#,##0.0'}),
    S(+(r.tarifa.mes||0).toFixed(2),{al:'right',numFmt:'#,##0.00'}),
    S(+(r.costoDia||0).toFixed(2),{al:'right',numFmt:'#,##0.00'}),
    S(+(r.costo||0).toFixed(2),{al:'right',numFmt:'#,##0.00',col:'6D28D9'})
  ]));
  aoa.push([S('TOTAL',{b:1,bg:'EEF2F8'}),...Array(4).fill(S('',{bg:'EEF2F8'})),
    _ccxTot(D.totalHH,'6D28D9')]);
  return{aoa,nc:HDR.length,nombre:'Personal',filtro:true,
    cols:[{wch:34},{wch:26},{wch:9},{wch:14},{wch:13},{wch:15}]};
}

function _ccxPdfPersonal(D){
  if(!D.hhRows.length)return null;
  const der=`${_CCX_TD};text-align:right`;
  const filas=[...D.hhRows].sort((a,b)=>b.costo-a.costo).map(r=>`<tr>
    <td style="${_CCX_TD};font-weight:600">${_ccxEsc(r.persona)}</td>
    <td style="${_CCX_TD}">${_ccxEsc(r.tarifa.lab)}</td>
    <td style="${der}">${(+r.dias||0).toFixed(1)}</td>
    <td style="${der}">${_ccxN(r.tarifa.mes)}</td>
    <td style="${der}">${_ccxN(r.costoDia)}</td>
    <td style="${der};font-weight:800;color:#6D28D9">${_ccxN(r.costo)}</td></tr>`).join('');
  const cuerpo=_ccxCabecera(D,'Venta de horas hombre por persona')
    +_ccxKpisPdf([['Personas',String(D.hhRows.length),'#111'],
                  ['Días del período',String(D.per.dias),'#111'],
                  ['Venta personal','S/ '+_ccxN(D.totalHH),'#6D28D9']])
    +`<table><thead><tr>
      <th style="${_CCX_TH};text-align:left">Persona</th><th style="${_CCX_TH};text-align:left">Cargo</th>
      <th style="${_CCX_TH}">Días</th><th style="${_CCX_TH}">Tarifa Mes</th>
      <th style="${_CCX_TH}">Costo Día</th><th style="${_CCX_TH}">Venta</th>
    </tr></thead><tbody>${filas}</tbody>
    <tfoot><tr style="background:#e2e8f0;font-weight:900">
      <td colspan="5" style="${der}">TOTAL PERSONAL</td>
      <td style="${der};color:#6D28D9">${_ccxN(D.totalHH)}</td>
    </tr></tfoot></table>`;
  return{titulo:'COST CONTROL — PERSONAL',cuerpo,horizontal:false};
}

// ══ RESUMEN ════════════════════════════════════════════════════════════════
// Las mismas agrupaciones que muestra la pestaña: equipos por línea y personal
// por cargo, más el cierre del período.
function _ccxResumenDatos(D){
  const eq={},hh={};
  D.eqRows.forEach(r=>{const k=r.eq.tipo||'Otros';
    (eq[k]=eq[k]||{n:0,venta:0,costo:0,comb:0,margen:0});
    eq[k].n++;eq[k].venta+=r.costo;eq[k].costo+=r.costoProveedor;
    eq[k].comb+=r.costoComb||0;eq[k].margen+=r.margen||0;});
  D.hhRows.forEach(r=>{const k=r.tarifa.lab||'—';
    (hh[k]=hh[k]||{n:0,venta:0});hh[k].n++;hh[k].venta+=r.costo;});
  return{eq:Object.entries(eq).sort((a,b)=>b[1].venta-a[1].venta),
         hh:Object.entries(hh).sort((a,b)=>b[1].venta-a[1].venta),
         totalGen:D.totalVentaEq+D.totalHH};
}

function _ccxHojaResumen(D){
  const R=_ccxResumenDatos(D);
  if(!R.eq.length&&!R.hh.length)return null;
  const S=_ccxCelda;
  const HDR=['BLOQUE','CONCEPTO','CANT.','VENTA','COSTO PROV.','COMBUSTIBLE','MARGEN'];
  const aoa=_ccxEncabezado('COST CONTROL — RESUMEN',_ccxContexto(D),HDR);
  const n=(v,c)=>S(+(v||0).toFixed(2),{al:'right',numFmt:'#,##0.00',col:c});
  R.eq.forEach(([k,v])=>aoa.push([S('Equipos'),S(k,{b:1}),S(v.n,{al:'right'}),
    n(v.venta,'0E7490'),n(v.costo,'B45309'),n(v.comb,'C2410C'),n(v.margen,'047857')]));
  aoa.push([S('Equipos',{b:1,bg:'F1F5F9'}),S('Subtotal equipos',{b:1,bg:'F1F5F9'}),
    S(D.eqRows.length,{b:1,bg:'F1F5F9',al:'right'}),
    _ccxTot(D.totalVentaEq,'0E7490'),_ccxTot(D.totalCostoEq,'B45309'),
    _ccxTot(D.totalCombEq,'C2410C'),_ccxTot(D.totalMargenEq,'047857')]);
  R.hh.forEach(([k,v])=>aoa.push([S('Personal'),S(k,{b:1}),S(v.n,{al:'right'}),
    n(v.venta,'6D28D9'),S(''),S(''),S('')]));
  aoa.push([S('Personal',{b:1,bg:'F1F5F9'}),S('Subtotal personal',{b:1,bg:'F1F5F9'}),
    S(D.hhRows.length,{b:1,bg:'F1F5F9',al:'right'}),_ccxTot(D.totalHH,'6D28D9'),
    ...Array(3).fill(S('',{bg:'F1F5F9'}))]);
  aoa.push([S('TOTAL',{b:1,bg:'EEF2F8'}),S('Venta del período',{b:1,bg:'EEF2F8'}),
    S('',{bg:'EEF2F8'}),_ccxTot(R.totalGen,'0F172A'),...Array(3).fill(S('',{bg:'EEF2F8'}))]);
  return{aoa,nc:HDR.length,nombre:'Resumen',filtro:false,
    cols:[{wch:12},{wch:30},{wch:8},{wch:15},{wch:15},{wch:15},{wch:15}]};
}

function _ccxPdfResumen(D){
  const R=_ccxResumenDatos(D);
  if(!R.eq.length&&!R.hh.length)return null;
  const der=`${_CCX_TD};text-align:right`;
  const fila=(b,k,n,v,extra)=>`<tr><td style="${_CCX_TD};color:#64748b;font-size:7.5px">${b}</td>
    <td style="${_CCX_TD};font-weight:600">${_ccxEsc(k)}</td>
    <td style="${der}">${n}</td><td style="${der};font-weight:700">${_ccxN(v)}</td>${extra||''}</tr>`;
  const cuerpo=_ccxCabecera(D,'Cierre del período por línea y por cargo')
    +_ccxKpisPdf([
      ['Venta equipos','S/ '+_ccxN(D.totalVentaEq),'#0E7490'],
      ['Venta personal','S/ '+_ccxN(D.totalHH),'#6D28D9'],
      ['Venta total','S/ '+_ccxN(R.totalGen),'#111'],
      ['Margen equipos','S/ '+_ccxN(D.totalMargenEq),'#047857']])
    +`<table><thead><tr>
      <th style="${_CCX_TH};text-align:left">Bloque</th><th style="${_CCX_TH};text-align:left">Concepto</th>
      <th style="${_CCX_TH}">Cant.</th><th style="${_CCX_TH}">Venta</th>
      <th style="${_CCX_TH}">Costo Prov.</th><th style="${_CCX_TH}">Comb.</th><th style="${_CCX_TH}">Margen</th>
    </tr></thead><tbody>
      ${R.eq.map(([k,v])=>fila('Equipos',k,v.n,v.venta,
        `<td style="${der};color:#B45309">${_ccxN(v.costo)}</td>
         <td style="${der};color:#C2410C">${_ccxN(v.comb)}</td>
         <td style="${der};color:${v.margen<0?'#b91c1c':'#047857'};font-weight:700">${_ccxN(v.margen)}</td>`)).join('')}
      <tr style="background:#f8fafc;font-weight:800">
        <td colspan="2" style="${der}">Subtotal equipos</td>
        <td style="${der}">${D.eqRows.length}</td>
        <td style="${der};color:#0E7490">${_ccxN(D.totalVentaEq)}</td>
        <td style="${der};color:#B45309">${_ccxN(D.totalCostoEq)}</td>
        <td style="${der};color:#C2410C">${_ccxN(D.totalCombEq)}</td>
        <td style="${der};color:#047857">${_ccxN(D.totalMargenEq)}</td></tr>
      ${R.hh.map(([k,v])=>fila('Personal',k,v.n,v.venta,
        `<td colspan="3" style="${_CCX_TD}"></td>`)).join('')}
      <tr style="background:#f8fafc;font-weight:800">
        <td colspan="2" style="${der}">Subtotal personal</td>
        <td style="${der}">${D.hhRows.length}</td>
        <td style="${der};color:#6D28D9">${_ccxN(D.totalHH)}</td>
        <td colspan="3" style="${_CCX_TD}"></td></tr>
    </tbody>
    <tfoot><tr style="background:#e2e8f0;font-weight:900">
      <td colspan="3" style="${der}">VENTA TOTAL DEL PERÍODO</td>
      <td style="${der}">${_ccxN(R.totalGen)}</td>
      <td colspan="3" style="${_CCX_TD}"></td>
    </tr></tfoot></table>`;
  return{titulo:'COST CONTROL — RESUMEN',cuerpo,horizontal:false};
}

// ══ Piezas comunes de Excel ════════════════════════════════════════════════
const _CCX_BOR={top:{style:'thin',color:{rgb:'D0D7E2'}},bottom:{style:'thin',color:{rgb:'D0D7E2'}},
                left:{style:'thin',color:{rgb:'D0D7E2'}},right:{style:'thin',color:{rgb:'D0D7E2'}}};
function _ccxCelda(v,o){
  return{v:v==null?'':v,t:typeof v==='number'?'n':'s',s:Object.assign({
    font:{sz:9,bold:!!(o&&o.b),italic:!!(o&&o.it),color:{rgb:(o&&o.col)||'0F172A'}},
    fill:{fgColor:{rgb:(o&&o.bg)||'FFFFFF'}},
    alignment:{horizontal:(o&&o.al)||'left',vertical:'center'},border:_CCX_BOR},
    (o&&o.numFmt)?{numFmt:o.numFmt}:{})};
}
const _ccxTot=(v,col)=>_ccxCelda(+(v||0).toFixed(2),
  {b:1,bg:'EEF2F8',al:'right',numFmt:'#,##0.00',col});
function _ccxEncabezado(titulo,sub,HDR){
  const S=_ccxCelda,n=HDR.length;
  return[
    [S(titulo,{b:1,bg:'1E3A5F',col:'FFFFFF',al:'center'}),...Array(n-1).fill(S('',{bg:'1E3A5F'}))],
    [S(sub,{bg:'EEF2F8',col:'475569',al:'center'}),...Array(n-1).fill(S('',{bg:'EEF2F8'}))],
    HDR.map(h=>S(h,{b:1,bg:'334155',col:'FFFFFF',al:'center'}))
  ];
}
