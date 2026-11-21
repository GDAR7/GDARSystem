// ══════════════════════════════════════════════════════════════════════════
//  ASISTENCIA DEL DÍA · REPORTE POR CARGO
//  Agrupa al personal por cargo. Arriba, un cuadro con la cantidad por cargo
//  (presentes / total) para verlo de un vistazo; debajo, el detalle de cada
//  cargo. Respeta los filtros de la pantalla: fecha, guardia, tareo y búsqueda.
//  Se imprime o guarda en PDF desde el navegador, y se puede bajar en Excel.
//  Prefijo _arc.
// ══════════════════════════════════════════════════════════════════════════

const _arcEsc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const _arcDMY=f=>{const p=String(f||'').split('-');return p.length===3?p[2]+'/'+p[1]+'/'+p[0]:f;};

// Los datos, con los mismos filtros que rAsistencia()
function _arcDatos(){
  const val=id=>(typeof document!=='undefined'&&document.getElementById(id)?.value)||'';
  const fecha=val('asiDate')||today();
  const guardia=val('asiGuardia');
  const tareoFilt=val('asiTareo');
  const q=val('asiNomFiltro').trim().toLowerCase();
  const tarDe={};
  (DB.tareaje||[]).forEach(r=>{if(r.fecha===fecha)tarDe[r.personalId]=r.tipo;});
  const regDe={};
  (DB.asistencia||[]).forEach(a=>{if(a.fecha===fecha)regDe[a.personalId]=a;});
  const filas=(DB.personal||[]).filter(p=>{
    if(p.est!=='Activo')return false;
    if(guardia&&p.guardia!==guardia)return false;
    if(q&&!((p.ape||'')+' '+(p.nom||'')).toLowerCase().includes(q))return false;
    const t=tarDe[p.id]||'';
    if(tareoFilt==='__sin__'&&t)return false;
    if(tareoFilt&&tareoFilt!=='__sin__'&&t!==tareoFilt)return false;
    return true;
  }).map(p=>{
    const r=regDe[p.id]||{};
    const ent=r.horaEntrada||'', sal=r.horaSalida||'';
    return{p,cargo:String(p.cargo||'').trim()||'Sin cargo',
      nombre:(p.ape||'')+', '+(p.nom||''),ent,sal,
      horas:ent&&sal&&typeof calcHoras==='function'?calcHoras(ent,sal):'',
      tareo:tarDe[p.id]||'',
      estado:!ent?'AUSENTE':!sal?'EN TURNO':'COMPLETO'};
  });
  // Grupos por cargo: primero los que tienen más gente
  const mapa=new Map();
  filas.forEach(f=>{if(!mapa.has(f.cargo))mapa.set(f.cargo,[]);mapa.get(f.cargo).push(f);});
  const grupos=[...mapa.entries()].map(([cargo,g])=>{
    g.sort((a,b)=>a.nombre.localeCompare(b.nombre,'es'));
    const pres=g.filter(f=>f.ent).length;
    return{cargo,filas:g,total:g.length,pres,aus:g.length-pres};
  }).sort((a,b)=>b.total-a.total||a.cargo.localeCompare(b.cargo,'es'));
  const pres=filas.filter(f=>f.ent).length;
  return{fecha,guardia,tareoFilt,q,grupos,total:filas.length,pres,aus:filas.length-pres};
}

function _arcFiltrosTxt(D){
  const t=[];
  if(D.guardia)t.push('Guardia '+D.guardia);
  if(D.tareoFilt)t.push('Tareo: '+(D.tareoFilt==='__sin__'?'sin tareo':D.tareoFilt));
  if(D.q)t.push('Búsqueda: "'+D.q+'"');
  return t.length?t.join(' · '):'Todas las guardias';
}

// ── Reporte imprimible ─────────────────────────────────────────────────────
function asiReporteCargo(){
  const D=_arcDatos();
  if(!D.total){toast('No hay personal con los filtros elegidos',true);return;}
  const win=window.open('','_blank');
  if(!win){toast('Active ventanas emergentes para ver el reporte',true);return;}
  const S='<'+'/';
  const colEst={AUSENTE:'#dc2626','EN TURNO':'#d97706',COMPLETO:'#059669'};
  const tt=t=>{
    const v=t&&typeof _TARE_T!=='undefined'?_TARE_T[t]:null;
    return v?'<span class="tr" style="background:'+v.bg+';color:'+v.tx+'">'+t+'</span>':(t||'—');
  };
  // Cuadro resumen: una tarjeta por cargo
  const tarjetas=D.grupos.map(g=>{
    const c=g.pres===g.total?'#059669':g.pres?'#d97706':'#dc2626';
    return'<a class="tj" href="#c'+_arcEsc(g.cargo).replace(/[^A-Za-z0-9]/g,'_')+'" style="border-color:'+c+'">'
      +'<div class="tjc">'+_arcEsc(g.cargo)+'</div>'
      +'<div class="tjn"><b style="color:'+c+'">'+g.pres+'</b><span>/ '+g.total+'</span></div>'
      +'<div class="tjs">'+(g.aus?g.aus+' ausente'+(g.aus>1?'s':''):'completo')+'</div></a>';
  }).join('');
  const bloques=D.grupos.map(g=>{
    let n=0;
    const filas=g.filas.map(f=>'<tr><td class="n">'+(++n)+'</td><td>'+_arcEsc(f.p.dni)+'</td>'
      +'<td><b>'+_arcEsc(f.nombre)+'</b></td><td>'+_arcEsc(f.p.tipo||'—')+'</td>'
      +'<td>'+(f.p.guardia?'Grd.'+_arcEsc(f.p.guardia):'—')+'</td>'
      +'<td class="m" style="color:#059669">'+(f.ent||'—')+'</td>'
      +'<td class="m" style="color:#d97706">'+(f.sal||'—')+'</td>'
      +'<td class="m">'+(f.horas||'—')+'</td><td>'+tt(f.tareo)+'</td>'
      +'<td style="color:'+colEst[f.estado]+';font-weight:700">'+f.estado+'</td></tr>').join('');
    return'<div class="grp" id="c'+_arcEsc(g.cargo).replace(/[^A-Za-z0-9]/g,'_')+'">'
      +'<div class="gh"><span>'+_arcEsc(g.cargo)+'</span>'
      +'<span class="gc">Total '+g.total+' · <b style="color:#059669">Presentes '+g.pres+'</b>'
      +(g.aus?' · <b style="color:#dc2626">Ausentes '+g.aus+'</b>':'')+'</span></div>'
      +'<table><thead><tr><th>N°</th><th>DNI</th><th>Apellidos y nombres</th><th>Tipo</th><th>Guardia</th>'
      +'<th>Entrada</th><th>Salida</th><th>Horas</th><th>Tareo</th><th>Estado</th></tr></thead>'
      +'<tbody>'+filas+'</tbody></table></div>';
  }).join('');
  const css='*{box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:11px;padding:18px;color:#111;margin:0}'
    +'.hdr{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #1e3a6e;padding-bottom:8px;margin-bottom:10px;gap:12px;flex-wrap:wrap}'
    +'h2{margin:0;font-size:16px;color:#1e3a6e}.sub{font-size:10px;color:#555;margin-top:2px}'
    +'.kp{display:flex;gap:8px}.k{border:2px solid;border-radius:6px;padding:4px 10px;text-align:center;min-width:78px}'
    +'.k b{display:block;font-size:17px}.k span{font-size:8.5px;text-transform:uppercase;letter-spacing:.05em;color:#555}'
    +'.tjs-w{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px;margin-bottom:14px}'
    +'.tj{display:block;text-decoration:none;color:inherit;border:2px solid;border-radius:6px;padding:5px 8px;break-inside:avoid}'
    +'.tjc{font-size:9.5px;font-weight:700;text-transform:uppercase;color:#1e3a6e;min-height:24px;line-height:1.2}'
    +'.tjn b{font-size:18px}.tjn span{font-size:11px;color:#555;margin-left:3px}.tjs{font-size:8.5px;color:#666}'
    +'.grp{margin-bottom:12px;break-inside:auto}'
    +'.gh{display:flex;justify-content:space-between;background:#1e3a6e;color:#fff;padding:5px 8px;font-weight:700;font-size:11.5px;border-radius:4px 4px 0 0;break-after:avoid}'
    +'.gc{font-weight:400;font-size:10px;background:#fff;color:#111;padding:1px 7px;border-radius:3px}'
    +'table{width:100%;border-collapse:collapse}th{background:#e8edf5;color:#1e3a6e;padding:4px;text-align:left;font-size:9.5px}'
    +'td{padding:3px 4px;border-bottom:1px solid #e5e5e5;font-size:10px}tr:nth-child(even) td{background:#fafafa}'
    +'.n{color:#888;width:22px}.m{font-family:Consolas,monospace}'
    +'.tr{display:inline-block;padding:0 5px;border-radius:3px;font-size:9px;font-weight:700}'
    +'.bar{position:sticky;top:0;background:#fff;padding:6px 0 10px;display:flex;gap:6px}'
    +'.bar button{padding:6px 14px;border-radius:6px;border:1px solid #1e3a6e;background:#1e3a6e;color:#fff;font-weight:700;cursor:pointer}'
    +'.bar button.o{background:#fff;color:#1e3a6e}'
    +'.foot{margin-top:12px;font-size:8.5px;color:#888;text-align:right}'
    +'@media print{.bar{display:none}body{padding:8px}@page{size:A4 portrait;margin:10mm}'
    +'*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}';
  win.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>Asistencia por cargo '+_arcDMY(D.fecha)+S+'title>'
    +'<style>'+css+S+'style>'+S+'head><body>'
    +'<div class="bar"><button onclick="print()">🖨 Imprimir / PDF'+S+'button>'
    +'<button class="o" onclick="opener&&opener.asiReporteCargoXls&&opener.asiReporteCargoXls()">⬇ Excel'+S+'button>'+S+'div>'
    +'<div class="hdr"><div><h2>ASISTENCIA DEL DÍA POR CARGO'+S+'h2>'
    +'<div class="sub">Fecha: <b>'+_arcDMY(D.fecha)+'</b> · '+_arcEsc(_arcFiltrosTxt(D))+' · '+D.grupos.length+' cargos'+S+'div>'+S+'div>'
    +'<div class="kp"><div class="k" style="border-color:#1e3a6e"><b>'+D.total+'</b><span>Total'+S+'span>'+S+'div>'
    +'<div class="k" style="border-color:#059669"><b style="color:#059669">'+D.pres+'</b><span>Presentes'+S+'span>'+S+'div>'
    +'<div class="k" style="border-color:#dc2626"><b style="color:#dc2626">'+D.aus+'</b><span>Ausentes'+S+'span>'+S+'div>'+S+'div>'+S+'div>'
    +'<div class="tjs-w">'+tarjetas+S+'div>'
    +bloques
    +'<div class="foot">Generado el '+new Date().toLocaleString('es-PE')+S+'div>'
    +S+'body>'+S+'html>');
  win.document.close();
}

// ── Excel: hoja Resumen (cantidad por cargo) y hoja Detalle ──
function asiReporteCargoXls(){
  if(typeof XLSX==='undefined'){toast('No se cargó la librería de Excel',true);return;}
  const D=_arcDatos();
  if(!D.total){toast('No hay personal con los filtros elegidos',true);return;}
  const tit=['ASISTENCIA DEL DÍA POR CARGO · '+_arcDMY(D.fecha)+' · '+_arcFiltrosTxt(D)];
  const res=[tit,[],['Cargo','Total','Presentes','Ausentes','% Asistencia']];
  D.grupos.forEach(g=>res.push([g.cargo,g.total,g.pres,g.aus,g.total?+(g.pres/g.total*100).toFixed(1):0]));
  res.push(['TOTAL',D.total,D.pres,D.aus,D.total?+(D.pres/D.total*100).toFixed(1):0]);
  const det=[tit,[],['Cargo','N°','DNI','Apellidos y nombres','Tipo','Guardia','Entrada','Salida','Horas','Tareo','Estado']];
  D.grupos.forEach(g=>g.filas.forEach((f,i)=>det.push([g.cargo,i+1,f.p.dni||'',f.nombre,f.p.tipo||'',
    f.p.guardia?'Grd.'+f.p.guardia:'',f.ent,f.sal,f.horas,f.tareo,f.estado])));
  const wb=XLSX.utils.book_new();
  const w1=XLSX.utils.aoa_to_sheet(res);w1['!cols']=[{wch:34},{wch:8},{wch:10},{wch:10},{wch:13}];
  const w2=XLSX.utils.aoa_to_sheet(det);
  w2['!cols']=[{wch:30},{wch:5},{wch:11},{wch:36},{wch:9},{wch:9},{wch:8},{wch:8},{wch:8},{wch:7},{wch:11}];
  XLSX.utils.book_append_sheet(wb,w1,'Resumen por cargo');
  XLSX.utils.book_append_sheet(wb,w2,'Detalle');
  XLSX.writeFile(wb,'Asistencia_por_cargo_'+D.fecha+'.xlsx');
  toast('Excel descargado');
}
