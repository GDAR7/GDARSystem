// ══════════════════════════════════════════════════════════════════════════
//  ASISTENCIA DEL DÍA · REPORTE POR CARGO
//  Agrupa al personal por cargo. Arriba, un cuadro con la cantidad por cargo
//  (presentes / total) para verlo de un vistazo; debajo, el detalle de cada
//  cargo. Respeta los filtros de la pantalla: fecha, guardia, tareo y búsqueda.
//
//  El botón abre un menú:
//    · Ver / Imprimir      → pestaña nueva, imprimible o "Guardar como PDF"
//    · Enviar como imagen  → PNG con todo el reporte
//    · Enviar como PDF     → A4 con todo el detalle, sin cortar filas
//    · Excel               → hojas "Resumen por cargo" y "Detalle"
//  En el celular, "Enviar" abre el menú de compartir del teléfono (WhatsApp,
//  correo…); donde no se puede compartir, el archivo se descarga.
//  Las librerías de imagen/PDF (html2canvas, jsPDF) se cargan recién al usarlas,
//  igual que en el Parte de Turno. Prefijo _arc.
// ══════════════════════════════════════════════════════════════════════════

const _arcEsc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const _arcDMY=f=>{const p=String(f||'').split('-');return p.length===3?p[2]+'/'+p[1]+'/'+p[0]:f;};
const _ARC_FILAS_BLOQUE=50;   // filas por tanda en el PDF (A4): una tanda nunca pasa de una hoja
// Turno del reporte: '' = todo · 'D' = día · 'N' = noche (se elige en el menú)
let _arcTurno='';
const _ARC_TURNO_LBL={'':'Todo el día',D:'Turno Día',N:'Turno Noche'};
// Turno de una persona: por su hora de entrada (05:00–16:59 = día, la misma
// regla del tareo); sin hora, por su tareo (TD = día, TN = noche).
function _arcTurnoDe(ent,tareo){
  if(ent){const h=parseInt(String(ent).slice(0,2),10);if(!isNaN(h))return(h>=5&&h<17)?'D':'N';}
  if(tareo==='TD')return'D';
  if(tareo==='TN')return'N';
  return'';
}
// Marcas de quien trabaja ese día (las mismas "en obra" del tareaje)
const _ARC_TRABAJA=['TD','TN','A5','DLT'];
// "No incluidos: DL 45 · V 3 · sin tareo 2"
function _arcFueraTxt(D){
  const k=Object.keys(D.fuera||{}).sort((a,b)=>D.fuera[b]-D.fuera[a]);
  if(!k.length)return'';
  return'No incluidos: '+k.map(t=>t+' '+D.fuera[t]).join(' · ');
}
function _arcSetTurno(t){_arcTurno=t||'';asiReporteCargo();}

// ── Los datos, con los mismos filtros que rAsistencia() ─────────────────────
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
      turno:_arcTurnoDe(ent,tarDe[p.id]||'')};
  });
  // Presente: marcó entrada y su tareo es de trabajo (TD, TN, A5, DLT).
  // Ausente: TD/TN/A5/DLT sin entrada, DM, P, F, S, V… Quedan fuera del
  // reporte el DL (está de libre) y quien aún no tiene tareo ese día.
  filas.forEach(f=>{f.estado=f.ent&&_ARC_TRABAJA.includes(f.tareo)?'PRESENTE':'AUSENTE';});
  const fuera={};
  for(let i=filas.length-1;i>=0;i--){
    const t=filas[i].tareo;
    if(t&&t!=='DL')continue;
    const k=t||'sin tareo';fuera[k]=(fuera[k]||0)+1;
    filas.splice(i,1);
  }
  // Por turno: solo quienes son de ese turno
  const turno=_arcTurno;
  const sinTurno=turno?filas.filter(f=>f.turno!==turno).length:0;
  if(turno){for(let i=filas.length-1;i>=0;i--)if(filas[i].turno!==turno)filas.splice(i,1);}
  // Grupos por cargo: primero los que tienen más gente
  const mapa=new Map();
  filas.forEach(f=>{if(!mapa.has(f.cargo))mapa.set(f.cargo,[]);mapa.get(f.cargo).push(f);});
  const grupos=[...mapa.entries()].map(([cargo,g])=>{
    g.sort((a,b)=>a.nombre.localeCompare(b.nombre,'es'));
    const pres=g.filter(f=>f.estado==='PRESENTE').length;
    return{cargo,filas:g,total:g.length,pres,aus:g.length-pres};
  }).sort((a,b)=>b.total-a.total||a.cargo.localeCompare(b.cargo,'es'));
  const pres=filas.filter(f=>f.estado==='PRESENTE').length;
  return{fecha,guardia,tareoFilt,q,turno,sinTurno,fuera,grupos,total:filas.length,pres,aus:filas.length-pres};
}
function _arcFiltrosTxt(D){
  const t=[];
  if(D.turno)t.push(_ARC_TURNO_LBL[D.turno]);
  if(D.guardia)t.push('Guardia '+D.guardia);
  if(D.tareoFilt)t.push('Tareo: '+(D.tareoFilt==='__sin__'?'sin tareo':D.tareoFilt));
  if(D.q)t.push('Búsqueda: "'+D.q+'"');
  return t.length?t.join(' · '):'Todas las guardias';
}

// ── HTML del reporte ───────────────────────────────────────────────────────
// Todo cuelga de .arc: así se puede dibujar dentro del sistema (para la imagen
// y el PDF) sin que estos estilos toquen el resto de la página.
function _arcCss(){
  return'.arc{font-family:Arial,sans-serif;font-size:11px;color:#111;background:#fff;padding:18px;box-sizing:border-box}'
    +'.arc *{box-sizing:border-box}'
    +'.arc .hdr{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #1e3a6e;padding-bottom:8px;margin-bottom:10px;gap:12px;flex-wrap:wrap}'
    +'.arc h2{margin:0;font-size:16px;color:#1e3a6e}.arc .sub{font-size:10px;color:#555;margin-top:2px}'
    +'.arc .kp{display:flex;gap:8px}.arc .k{border:2px solid;border-radius:6px;padding:4px 10px;text-align:center;min-width:78px}'
    +'.arc .k b{display:block;font-size:17px}.arc .k span{font-size:8.5px;text-transform:uppercase;letter-spacing:.05em;color:#555}'
    +'.arc .bw{display:flex;align-items:center;gap:6px;width:130px}.arc .bw span{font-weight:700;font-size:10px;min-width:30px}'
    +'.arc tr.au td{color:#dc2626}'
    +'.arc .bb{flex:1;height:7px;background:#eee;border-radius:4px;overflow:hidden}.arc .bb div{height:100%}'
    // Tabla única (formato Guardias FBNV)
    +'.arc th,.arc td{color:#111}'
    +'.arc .gtab{width:100%;border-collapse:collapse;table-layout:fixed;margin-top:6px}'
    +'.arc .gtab th,.arc .gtab td{border:1px solid #000;padding:2px 4px}'
    +'.arc .gtab th{background:#1F4E79;color:#fff;font-size:8.5px;font-weight:800;text-align:center;letter-spacing:.03em}'
    +'.arc .gn{font-size:9px;text-align:center}'
    +'.arc .gcg{font-size:8.5px;text-align:center;font-weight:700;vertical-align:middle;line-height:1.2;word-wrap:break-word}'
    +'.arc .gcc{display:block;font-weight:400;color:#555;font-size:8px;margin-top:1px}'
    +'.arc .gp{font-size:9.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
    +'.arc .gd{font-size:9px;text-align:center;font-weight:700}'
    +'.arc .gt{font-size:9px;font-weight:800;text-align:center}'
    +'.arc .grs{margin:10px auto 0;border-collapse:collapse}'
    +'.arc .grs th,.arc .grs td{border:1px solid #000;padding:2px 10px;font-size:8.5px;text-align:center}'
    +'.arc .grs th{background:#1F4E79;color:#fff;font-size:8px}.arc .grs td.grl{text-align:left;font-weight:700;background:#f8fafc}'
    +'.arc .grs tr td{color:inherit}'
    +'.arc .gley{margin-top:8px;font-size:8px;display:flex;gap:12px;flex-wrap:wrap;color:#475569}.arc .gley span{font-weight:700}'
    +'.arc .foot{margin-top:10px;font-size:8.5px;color:#888;text-align:right}';
}
const _arcAncla=c=>'c'+String(c).replace(/[^A-Za-z0-9]/g,'_');
// % de asistencia como barra: verde completo · naranja parcial · rojo nadie
function _arcBarra(pres,total){
  const p=total?Math.round(pres/total*100):0, c=pres===total?'#059669':pres?'#d97706':'#dc2626';
  return'<div class="bw"><div class="bb"><div style="width:'+p+'%;background:'+c+'"></div></div>'
    +'<span style="color:'+c+'">'+p+'%</span></div>';
}
// Encabezado del reporte: título, filtros y totales
function _arcResumenHtml(D){
  return'<div class="hdr"><div><h2>ASISTENCIA DEL DÍA POR CARGO'+(D.turno?' · '+_ARC_TURNO_LBL[D.turno].toUpperCase():'')+'</h2>'
    +'<div class="sub">Fecha: <b>'+_arcDMY(D.fecha)+'</b> · '+_arcEsc(_arcFiltrosTxt(D))+' · '+D.grupos.length+' cargos'
    +(D.sinTurno?' · '+D.sinTurno+' de otro turno no incluidos':'')
    +(_arcFueraTxt(D)?'<br>'+_arcEsc(_arcFueraTxt(D)):'')+'</div></div>'
    +'<div class="kp"><div class="k" style="border-color:#1e3a6e"><b>'+D.total+'</b><span>Total</span></div>'
    +'<div class="k" style="border-color:#059669"><b style="color:#059669">'+D.pres+'</b><span>Presentes</span></div>'
    +'<div class="k" style="border-color:#dc2626"><b style="color:#dc2626">'+D.aus+'</b><span>Ausentes</span></div></div></div>';
}
// ── Formato Guardias FBNV en una sola tabla ────────────────────────────────
// ITEM · CARGO (celda unida) · APELLIDOS Y NOMBRES · GUARDIA · TAREO.
// El nombre y el tareo van del color de su marca; el ausente, en rojo.
const _ARC_GCOL={A:'#FCE4D6',B:'#E4DFEC',C:'#D9D9D9','—':'#e2e8f0'};
function _arcColor(f){
  if(f.estado!=='PRESENTE')return'#C00000';
  return f.tareo==='TN'?'#002060':f.tareo==='A5'?'#ED7D31':'#0000FF';
}
const _arcGDe=f=>{const g=String(f.p.guardia||'').trim().toUpperCase();return['A','B','C'].includes(g)?g:'—';};
function _arcMatriz(D){
  const filas=D.grupos.flatMap(g=>g.filas);
  // Guardias para el resumen final
  let GS=D.guardia?[String(D.guardia).toUpperCase()]:['A','B','C'];
  if(!D.guardia&&filas.some(f=>_arcGDe(f)==='—'))GS=GS.concat('—');
  const cuenta={};
  GS.forEach(g=>{cuenta[g]={total:0,pres:0};});
  filas.forEach(f=>{const c=cuenta[_arcGDe(f)];if(!c)return;c.total++;if(f.estado==='PRESENTE')c.pres++;});
  // Orden de cargos: el mismo de Guardias FBNV si está cargado; si no, por cantidad.
  // Dentro del cargo: por guardia, presentes primero y por apellido.
  const ord=typeof _gdOrdenIdx==='function'?_gdOrdenIdx:()=>900;
  const bloques=D.grupos.slice().sort((a,b)=>ord(a.cargo)-ord(b.cargo)).map(g=>({cargo:g.cargo,
    pres:g.pres,n:g.filas.length,
    filas:g.filas.slice().sort((x,y)=>_arcGDe(x).localeCompare(_arcGDe(y))
      ||(x.estado==='PRESENTE'?0:1)-(y.estado==='PRESENTE'?0:1)||x.nombre.localeCompare(y.nombre,'es'))}));
  return{GS,cuenta,bloques};
}
// La tabla con los cargos 'bloques' (todos o una tanda, para el PDF).
// 'item0' = número de fila con que empieza la tanda.
function _arcCuadrosHtml(M,bloques,item0){
  let n=item0||0;
  const filas=bloques.map(b=>b.filas.map((f,i)=>{
    n++;
    const col=_arcColor(f),g=_arcGDe(f);
    return'<tr><td class="gn">'+n+'</td>'
      +(i===0?'<td class="gcg" rowspan="'+b.n+'">'+_arcEsc(b.cargo.toUpperCase())
        +'<span class="gcc">'+b.pres+'/'+b.n+'</span></td>':'')
      +'<td class="gp" style="color:'+col+'">'+_arcEsc(f.nombre.toUpperCase())+'</td>'
      +'<td class="gd" style="background:'+(_ARC_GCOL[g]||'#fff')+'">'+(g==='—'?'—':g)+'</td>'
      +'<td class="gt" style="color:'+col+'">'+_arcEsc(f.tareo)+'</td></tr>';
  }).join('')).join('');
  return'<table class="gtab"><thead><tr>'
    +'<th style="width:38px">ITEM</th><th style="width:24%">CARGO</th>'
    +'<th>APELLIDOS Y NOMBRES</th><th style="width:62px">GUARDIA</th><th style="width:52px">TAREO</th>'
    +'</tr></thead><tbody>'+filas+'</tbody></table>';
}
// Resumen final por guardia y leyenda
function _arcResumenGuardiasHtml(D,M){
  const celdas=k=>M.GS.map(g=>{const c=M.cuenta[g];
    return'<td>'+(k==='p'?c.pres:k==='a'?c.total-c.pres:k==='t'?c.total:(c.total?Math.round(c.pres/c.total*100):0)+'%')+'</td>';}).join('');
  const tot=k=>k==='p'?D.pres:k==='a'?D.aus:k==='t'?D.total:(D.total?Math.round(D.pres/D.total*100):0)+'%';
  return'<table class="grs"><thead><tr><th>RESUMEN</th>'+M.GS.map(g=>'<th>'+(g==='—'?'SIN GUARDIA':'GUARDIA '+g)+'</th>').join('')
    +'<th>TOTAL</th></tr></thead><tbody>'
    +[['PRESENTES','p','#0000FF'],['AUSENTES','a','#C00000'],['TOTAL','t','#111'],['% ASISTENCIA','%','#111']]
      .map(([l,k,col])=>'<tr style="color:'+col+'"><td class="grl">'+l+'</td>'+celdas(k)+'<td><b>'+tot(k)+'</b></td></tr>').join('')
    +'</tbody></table>'
    +'<div class="gley"><b>Leyenda:</b><span style="color:#0000FF">TD / DLT — Presente día</span>'
    +'<span style="color:#002060">TN — Presente noche</span><span style="color:#ED7D31">A5 — Anexo 5</span>'
    +'<span style="color:#C00000">Rojo — Ausente (sin entrada, F, DM, P, S, V…)</span></div>';
}
// Todo el reporte de una vez (Ver e imagen)
function _arcCuerpoHtml(D){
  const M=_arcMatriz(D);
  return _arcResumenHtml(D)+_arcCuadrosHtml(M,M.bloques,0)+_arcResumenGuardiasHtml(D,M)+_arcPie();
}
const _arcPie=()=>'<div class="foot">Generado el '+new Date().toLocaleString('es-PE')+'</div>';

// ── Menú del botón ─────────────────────────────────────────────────────────
function asiReporteCargo(){
  const D=_arcDatos();
  if(!D.total&&!_arcTurno){toast('No hay personal con los filtros elegidos',true);return;}
  let ov=document.getElementById('arcMenu');
  if(ov)ov.remove();
  ov=document.createElement('div');
  ov.id='arcMenu';
  ov.style.cssText='position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:16px';
  ov.onclick=e=>{if(e.target===ov)ov.remove();};
  const op=(ic,t,s,fn,col)=>'<button onclick="'+fn+'" style="display:flex;gap:.7rem;align-items:center;width:100%;text-align:left;'
    +'background:var(--panel2);border:2px solid '+col+';border-radius:9px;padding:.7rem .85rem;color:var(--text);cursor:pointer">'
    +'<span style="font-size:1.4rem">'+ic+'</span><span><b style="display:block;font-size:.9rem">'+t+'</b>'
    +'<span style="font-size:.72rem;color:var(--muted2)">'+s+'</span></span></button>';
  ov.innerHTML='<div style="background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:1rem;width:100%;max-width:380px">'
    +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.3rem">'
    +'<b style="font-size:1rem">👷 Reporte por cargo</b>'
    +'<button onclick="document.getElementById(\'arcMenu\').remove()" style="background:none;border:none;color:var(--muted2);font-size:1.2rem;cursor:pointer">✕</button></div>'
    +'<div style="font-size:.74rem;color:var(--muted2);margin-bottom:.8rem">'+_arcDMY(D.fecha)+' · '+_arcEsc(_arcFiltrosTxt(D))
    +' · '+D.total+' personas en '+D.grupos.length+' cargos</div>'
    // Selector de turno
    +'<div style="display:flex;gap:.3rem;margin-bottom:.8rem">'
    +[['','📋 Todo'],['D','☀️ Día'],['N','🌙 Noche']].map(([k,l])=>{
      const on=_arcTurno===k;
      return'<button onclick="_arcSetTurno(\''+k+'\')" style="flex:1;padding:.45rem .3rem;border-radius:8px;cursor:pointer;font-weight:700;font-size:.8rem;'
        +'border:2px solid '+(on?'#38bdf8':'var(--border)')+';background:'+(on?'rgba(56,189,248,.15)':'var(--panel2)')+';'
        +'color:'+(on?'#38bdf8':'var(--muted2)')+'">'+l+'</button>';
    }).join('')+'</div>'
    +(D.total?'':'<div style="font-size:.78rem;color:#f59e0b;margin-bottom:.6rem">No hay personal en '+_ARC_TURNO_LBL[_arcTurno].toLowerCase()+' con estos filtros.</div>')
    +'<div style="display:flex;flex-direction:column;gap:.5rem'+(D.total?'':';opacity:.4;pointer-events:none')+'">'
    +op('🖼️','Enviar como imagen','Todo el reporte en una sola imagen. Ideal para WhatsApp','_arcEnviar(\'img\',this)','#10b981')
    +op('📄','Enviar como PDF','Todo el reporte en hojas A4','_arcEnviar(\'pdf\',this)','#ef4444')
    +op('👁️','Ver / Imprimir','Abre el reporte en una pestaña nueva','_arcVer()','#3b82f6')
    +op('⬇','Excel','Resumen por cargo y detalle','asiReporteCargoXls()','#22c55e')
    +'</div></div>';
  document.body.appendChild(ov);
}
function _arcCerrarMenu(){const m=document.getElementById('arcMenu');if(m)m.remove();}

// ── Ver / Imprimir ─────────────────────────────────────────────────────────
function _arcVer(){
  const D=_arcDatos();
  if(!D.total){toast('No hay personal con los filtros elegidos',true);return;}
  const win=window.open('','_blank');
  if(!win){toast('Active ventanas emergentes para ver el reporte',true);return;}
  _arcCerrarMenu();
  const S='<'+'/';
  const css=_arcCss()+'body{margin:0;background:#fff}.arc{max-width:860px;margin:0 auto}'
    +'.bar{position:sticky;top:0;background:#fff;padding:8px 18px;display:flex;gap:6px;border-bottom:1px solid #ddd}'
    +'.bar button{padding:6px 14px;border-radius:6px;border:1px solid #1e3a6e;background:#1e3a6e;color:#fff;font-weight:700;cursor:pointer}'
    // En el celular: menos margen y la columna CARGO más angosta
    +'@media (max-width:700px){.arc{padding:8px}.arc .gtab th:nth-child(2){width:28%}}'
    +'@media print{.bar{display:none}@page{size:A4 portrait;margin:8mm}.arc{padding:0}'
    +'.arc tr{break-inside:avoid}'
    +'*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}';
  win.document.write('<!DOCTYPE html><html><head><meta charset="utf-8">'
    +'<meta name="viewport" content="width=device-width,initial-scale=1">'
    +'<title>Asistencia por cargo '+_arcDMY(D.fecha)+S+'title><style>'+css+S+'style>'+S+'head><body>'
    +'<div class="bar"><button onclick="print()">🖨 Imprimir / PDF'+S+'button>'+S+'div>'
    +'<div class="arc">'+_arcCuerpoHtml(D)+S+'div>'
    +S+'body>'+S+'html>');
  win.document.close();
}

// ── Imagen y PDF ───────────────────────────────────────────────────────────
const _ARC_LIB_H2C='https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
const _ARC_LIB_PDF='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
function _arcLib(src,listo){
  if(typeof _ptCargarLib==='function')return _ptCargarLib(src,listo);
  return new Promise((ok,mal)=>{
    if(listo())return ok();
    const s=document.createElement('script');s.src=src;
    s.onload=()=>listo()?ok():mal(new Error('no se cargó la librería'));
    s.onerror=()=>mal(new Error('sin conexión para cargar la librería'));
    document.head.appendChild(s);
  });
}
// Dibuja un trozo de HTML fuera de la pantalla, a 794 px (ancho de un A4)
const _ARC_ANCHO=794;
async function _arcCanvas(html){
  const caja=document.createElement('div');
  caja.style.cssText='position:fixed;left:-10000px;top:0;width:'+_ARC_ANCHO+'px;background:#fff';
  caja.innerHTML='<style>'+_arcCss()+'</style><div class="arc">'+html+'</div>';
  document.body.appendChild(caja);
  try{return await window.html2canvas(caja.querySelector('.arc'),{scale:2,backgroundColor:'#ffffff'});}
  finally{caja.remove();}
}
async function _arcImagen(D){
  await _arcLib(_ARC_LIB_H2C,()=>typeof window.html2canvas==='function');
  const cv=await _arcCanvas(_arcCuerpoHtml(D));
  return new Promise((ok,mal)=>cv.toBlob(b=>b?ok(b):mal(new Error('no se pudo crear la imagen')),'image/png'));
}
// Tandas de cargos para el PDF: cada tanda junta cargos enteros hasta
// _ARC_FILAS_BLOQUE filas; un cargo nunca se parte entre dos tandas.
function _arcTandas(bloques){
  const out=[];let act=[],filas=0;
  bloques.forEach(b=>{
    if(act.length&&filas+b.n>_ARC_FILAS_BLOQUE){out.push(act);act=[];filas=0;}
    act.push(b);filas+=b.n;
  });
  if(act.length)out.push(act);
  return out;
}
// PDF (A4 vertical): encabezado, la tabla en tandas de cargos y el resumen.
// Si un bloque no entra en lo que queda de la hoja, pasa entero a la siguiente.
async function _arcPdf(D){
  await _arcLib(_ARC_LIB_H2C,()=>typeof window.html2canvas==='function');
  await _arcLib(_ARC_LIB_PDF,()=>!!(window.jspdf&&window.jspdf.jsPDF));
  const pdf=new window.jspdf.jsPDF({unit:'mm',format:'a4',orientation:'portrait'});
  const W=210,H=297,M=8;
  let y=M,primera=true;
  const poner=cv=>{
    let h=cv.height*W/cv.width, w=W;
    if(h>H-2*M){w=W*(H-2*M)/h;h=H-2*M;}        // por si acaso: se achica, nunca se corta
    if(!primera&&y+h>H-M){pdf.addPage();y=M;}
    pdf.addImage(cv.toDataURL('image/jpeg',0.9),'JPEG',(W-w)/2,y,w,h);
    y+=h;primera=false;
  };
  const Mx=_arcMatriz(D);
  poner(await _arcCanvas(_arcResumenHtml(D)));
  let item=0;
  for(const t of _arcTandas(Mx.bloques)){
    poner(await _arcCanvas(_arcCuadrosHtml(Mx,t,item)));
    item+=t.reduce((s,b)=>s+b.n,0);
  }
  poner(await _arcCanvas(_arcResumenGuardiasHtml(D,Mx)+_arcPie()));
  return pdf.output('blob');
}
function _arcBajar(blob,nombre){
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=nombre;
  document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},2000);
}
// Celular: menú de compartir del teléfono. PC o navegador sin compartir: descarga.
async function _arcEnviar(tipo,btn){
  const D=_arcDatos();
  const esImg=tipo==='img';
  if(!D.total){toast('No hay personal con los filtros elegidos',true);return;}
  const nombre='Asistencia por cargo '+D.fecha+(D.turno?' '+_ARC_TURNO_LBL[D.turno]:'')
    +(D.guardia?' Grd '+D.guardia:'')+(esImg?'.png':'.pdf');
  const txtBtn=btn?btn.innerHTML:'';
  if(btn){btn.disabled=true;btn.style.opacity=.6;}
  toast(esImg?'Generando imagen…':'Generando PDF…');
  try{
    const blob=esImg?await _arcImagen(D):await _arcPdf(D);
    const archivo=new File([blob],nombre,{type:esImg?'image/png':'application/pdf'});
    if(navigator.canShare&&navigator.canShare({files:[archivo]})){
      try{
        await navigator.share({files:[archivo],title:'Asistencia por cargo',
          text:'Asistencia del '+_arcDMY(D.fecha)+(D.turno?' · '+_ARC_TURNO_LBL[D.turno]:'')
            +' · Presentes '+D.pres+' de '+D.total});
        _arcCerrarMenu();
      }catch(e){
        if(e&&e.name==='AbortError')return;           // canceló el menú de compartir
        // Algunos teléfonos no dejan compartir si tardó en generarse: se descarga
        _arcBajar(blob,nombre);toast('Descargado: '+nombre);_arcCerrarMenu();
      }
    }else{
      _arcBajar(blob,nombre);toast('Descargado: '+nombre);_arcCerrarMenu();
    }
  }catch(e){
    toast('No se pudo generar '+(esImg?'la imagen':'el PDF')+': '+((e&&e.message)||e),true);
  }finally{
    if(btn&&document.body.contains(btn)){btn.disabled=false;btn.style.opacity=1;btn.innerHTML=txtBtn;}
  }
}

// ── Excel: hoja Resumen (cantidad por cargo) y hoja Detalle ────────────────
function asiReporteCargoXls(){
  if(typeof XLSX==='undefined'){toast('No se cargó la librería de Excel',true);return;}
  const D=_arcDatos();
  if(!D.total){toast('No hay personal con los filtros elegidos',true);return;}
  const tit=['ASISTENCIA DEL DÍA POR CARGO · '+_arcDMY(D.fecha)+' · '+_arcFiltrosTxt(D)];
  const res=[tit,[],['Cargo','Total','Presentes','Ausentes','% Asistencia']];
  D.grupos.forEach(g=>res.push([g.cargo,g.total,g.pres,g.aus,g.total?+(g.pres/g.total*100).toFixed(1):0]));
  res.push(['TOTAL',D.total,D.pres,D.aus,D.total?+(D.pres/D.total*100).toFixed(1):0]);
  const det=[tit,[],['Cargo','N°','DNI','Apellidos y nombres','Guardia','Tareo','Estado']];
  D.grupos.forEach(g=>g.filas.forEach((f,i)=>det.push([g.cargo,i+1,f.p.dni||'',f.nombre,
    f.p.guardia?'Grd.'+f.p.guardia:'',f.tareo,f.estado])));
  const wb=XLSX.utils.book_new();
  const w1=XLSX.utils.aoa_to_sheet(res);w1['!cols']=[{wch:34},{wch:8},{wch:10},{wch:10},{wch:13}];
  const w2=XLSX.utils.aoa_to_sheet(det);
  w2['!cols']=[{wch:30},{wch:5},{wch:11},{wch:36},{wch:9},{wch:7},{wch:11}];
  XLSX.utils.book_append_sheet(wb,w1,'Resumen por cargo');
  XLSX.utils.book_append_sheet(wb,w2,'Detalle');
  XLSX.writeFile(wb,'Asistencia_por_cargo_'+D.fecha+(D.turno?'_'+(D.turno==='D'?'Dia':'Noche'):'')+'.xlsx');
  if(typeof _arcCerrarMenu==='function'&&typeof document!=='undefined'&&document.getElementById)_arcCerrarMenu();
  toast('Excel descargado');
}
