// ══════════════════════════════════════════════════════════════════════════
//  TAREAJE · RESUMEN DESDE EL INICIO
//  Una fila por trabajador con todo lo marcado desde su PRIMERA marca de
//  tareaje hasta hoy (o hasta la fecha de corte elegida): días trabajados,
//  libres, faltas, descansos, licencias, días sin marcar y horas hombre.
//
//  Solo cuenta hasta el corte: el tareaje trae días futuros ya programados
//  desde el roster, que todavía no son asistencia.
//  Un día cuenta una sola vez aunque tenga dos marcas (se toma la última).
//  Un inactivo se mide hasta su última marca, no hasta hoy: si no, todo el
//  tiempo desde que salió figuraría como «sin marcar».
//
//  Usa DB.tareaje y DB.personal, que ya están cargados: no consulta la base.
//  Prefijo _tac.
// ══════════════════════════════════════════════════════════════════════════

const _TAC_TRAB=['TD','TN','DLT','A5'];          // días en obra (los mismos que las HH del tareaje)
const _TAC_HH_DIA=10;
// Columnas de conteo, en el orden del cuadro
const _TAC_COLS=[
  {k:'trab',l:'Trabajados',tit:'TD + TN + DLT + A5',c:'#10b981',fuerte:true},
  {k:'TD',l:'TD',tit:'Trabajo Día',c:'#10b981'},
  {k:'TN',l:'TN',tit:'Trabajo Noche',c:'#60a5fa'},
  {k:'DLT',l:'DLT',tit:'DL Trabajado',c:'#84cc16'},
  {k:'A5',l:'A5',tit:'Anexo 5',c:'#f97316'},
  {k:'DL',l:'DL',tit:'Día Libre',c:'#9ca3af'},
  {k:'F',l:'F',tit:'Falta',c:'#ef4444',alerta:true},
  {k:'DM',l:'DM',tit:'Descanso Médico',c:'#a78bfa'},
  {k:'P',l:'P',tit:'Permiso',c:'#f59e0b'},
  {k:'V',l:'V',tit:'Vacaciones',c:'#0ea5e9'},
  {k:'LIC',l:'Lic.',tit:'Licencias: paternidad, maternidad, fallecimiento (LP + LM + LF)',c:'#3b82f6'},
  {k:'R',l:'R',tit:'Retirado',c:'#f87171'},
  {k:'otro',l:'Otros',tit:'Otras marcas',c:'#94a3b8'},
  {k:'sin',l:'Sin marcar',tit:'Días entre su inicio y el corte que no tienen ninguna marca',c:'#f59e0b',alerta:true}
];
let _tacHasta='';                 // '' = hoy
let _tacInact=false;              // mostrar los dados de baja
let _tacProy=null, _tacBusca=null; // null = tomar los de la barra del tareaje al abrir
let _tacOrden={k:'nombre',asc:true};

const _tacEsc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const _tacHoy=()=>typeof today==='function'?today():new Date().toISOString().slice(0,10);
const _tacF=f=>f?String(f).slice(0,10).split('-').reverse().join('/'):'—';
const _tacN=v=>Number(v||0).toLocaleString('es-PE');
// Días calendario entre dos fechas AAAA-MM-DD, contando ambas
function _tacDias(a,b){
  if(!a||!b||b<a)return 0;
  return Math.round((Date.parse(b+'T12:00:00')-Date.parse(a+'T12:00:00'))/864e5)+1;
}
const _tacNorm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');

// ── El cálculo ─────────────────────────────────────────────────────────────
// Lo caro es recorrer todo el tareaje (más de 20 mil marcas): se hace una vez
// por proyecto + corte y se guarda. Buscar solo filtra filas, no lo repite.
// Se rehace solo si cambian el proyecto, el corte o los datos cargados.
let _tacIdx=null;
function _tacIndice(hasta,proy){
  const tar=DB.tareaje||[], pers=DB.personal||[];
  const clave=[hasta,proy,tar.length,pers.length,tar.length?tar[tar.length-1].id:0].join('|');
  if(_tacIdx&&_tacIdx.clave===clave&&_tacIdx.tar===tar&&_tacIdx.pers===pers)return _tacIdx.dias;
  const porId={};pers.forEach(p=>{porId[p.id]=p;});
  // Un tipo por persona y día (si hay dos marcas, la de id mayor), hasta el corte
  const dias={}, idDe={};
  tar.forEach(r=>{
    const f=String(r.fecha||'').slice(0,10);
    if(!f||f>hasta||!r.tipo)return;
    const p=porId[r.personalId];if(!p)return;
    if(proy&&!(r.proy===proy||(!r.proy&&p.proy===proy)))return;
    const m=dias[r.personalId]||(dias[r.personalId]={}), ids=idDe[r.personalId]||(idDe[r.personalId]={});
    if(m[f]===undefined||(+r.id||0)>(ids[f]||0)){m[f]=r.tipo;ids[f]=+r.id||0;}
  });
  _tacIdx={clave,tar,pers,dias};
  return dias;
}
function _tacDatos(){
  const hasta=_tacHasta||_tacHoy();
  const proy=_tacProy||'';
  const q=_tacNorm(_tacBusca||'');
  const pers=DB.personal||[];
  const dias=_tacIndice(hasta,proy);
  let sinMarcas=0;
  const filas=[];
  pers.forEach(p=>{
    const inact=p.est==='Inactivo';
    if(inact&&!_tacInact)return;
    if(q&&!_tacNorm([p.ape,p.nom,p.cargo,p.dni].join(' ')).includes(q))return;
    const m=dias[p.id];
    if(!m){if(!proy||p.proy===proy)sinMarcas++;return;}
    const fechas=Object.keys(m).sort();
    const inicio=fechas[0], ultima=fechas[fechas.length-1];
    const fin=inact?ultima:hasta;
    const c={TD:0,TN:0,DLT:0,A5:0,DL:0,F:0,DM:0,P:0,V:0,LIC:0,R:0,otro:0};
    fechas.forEach(f=>{
      const t=m[f];
      if(c[t]!==undefined)c[t]++;
      else if(t==='LP'||t==='LM'||t==='LF')c.LIC++;
      else c.otro++;
    });
    const trab=_TAC_TRAB.reduce((s,t)=>s+c[t],0);
    const cal=_tacDias(inicio,fin);
    filas.push({p,inact,nombre:`${p.ape||''}, ${p.nom||''}`,dni:p.dni||'',cargo:p.cargo||'',
      inicio,ultima,cal,...c,trab,sin:Math.max(0,cal-fechas.length),
      asis:trab+c.F?trab/(trab+c.F)*100:null,hh:trab*_TAC_HH_DIA});
  });
  // Orden
  const {k,asc}=_tacOrden;
  const txt=k==='nombre'||k==='cargo'||k==='dni'||k==='inicio'||k==='ultima';
  filas.sort((a,b)=>{
    let d;
    if(txt)d=String(a[k]||'').localeCompare(String(b[k]||''),'es',{numeric:true});
    else d=(a[k]==null?-1:a[k])-(b[k]==null?-1:b[k]);
    if(!d)d=a.nombre.localeCompare(b.nombre,'es');
    return asc?d:-d;
  });
  const tot={cal:0,hh:0};
  _TAC_COLS.forEach(cl=>{tot[cl.k]=filas.reduce((s,f)=>s+(f[cl.k]||0),0);});
  tot.cal=filas.reduce((s,f)=>s+f.cal,0);tot.hh=filas.reduce((s,f)=>s+f.hh,0);
  tot.asis=tot.trab+tot.F?tot.trab/(tot.trab+tot.F)*100:null;
  const inicioGen=filas.reduce((m,f)=>!m||f.inicio<m?f.inicio:m,'');
  return{hasta,proy,q:_tacBusca||'',filas,tot,sinMarcas,inicioGen};
}

// ── Pantalla ───────────────────────────────────────────────────────────────
function abrirTarAcum(){
  // Arranca con el proyecto y la búsqueda que ya están en la barra del tareaje
  _tacProy=(document.getElementById('tareProy')||{}).value||'';
  _tacBusca=(document.getElementById('tareBuscar')||{}).value||'';
  _tacIdx=null;                  // el tareaje pudo cambiar desde la última vez
  openM('mTarAcum');
  rTarAcum();
}
function _tacSet(campo,v){
  if(campo==='hasta')_tacHasta=v&&v<_tacHoy()?v:'';
  else if(campo==='inact')_tacInact=!!v;
  else if(campo==='proy')_tacProy=v;
  else if(campo==='busca'){
    // Al escribir se redibujan solo los resultados: la caja de búsqueda no se
    // toca, así no pierde el foco ni el cursor
    _tacBusca=v;clearTimeout(_tacSet._t);_tacSet._t=setTimeout(()=>rTarAcum(true),150);return;
  }
  rTarAcum();
}
function _tacOrdenar(k){
  _tacOrden=_tacOrden.k===k?{k,asc:!_tacOrden.asc}:{k,asc:k==='nombre'||k==='cargo'||k==='dni'||k==='inicio'||k==='ultima'};
  rTarAcum(true);
}
// soloRes: redibuja tarjetas y tabla, dejando los controles como están
function rTarAcum(soloRes){
  const el=document.getElementById('mTarAcumBody');if(!el)return;
  const D=_tacDatos();
  const hoy=_tacHoy();
  const kpi=(l,v,c,sub)=>`<div style="border:1px solid ${c};border-radius:8px;padding:.5rem .8rem;min-width:120px;background:${c}10">
      <div style="font-size:.6rem;color:var(--muted2);text-transform:uppercase;letter-spacing:.07em">${l}</div>
      <div style="font-size:1.25rem;font-weight:800;color:${c};font-variant-numeric:tabular-nums">${v}</div>
      ${sub?`<div style="font-size:.6rem;color:var(--muted2)">${sub}</div>`:''}</div>`;
  const proyOpts='<option value="">— Todos los proyectos —</option>'+(DB.proyectos||[]).map(p=>`<option value="${_tacEsc(p.codigo)}" ${p.codigo===D.proy?'selected':''}>[${_tacEsc(p.codigo)}] ${_tacEsc(p.nombre)}</option>`).join('');
  const ctl='background:var(--panel2);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:.32rem .55rem;font-size:.76rem;color-scheme:dark';
  const flecha=k=>_tacOrden.k===k?(_tacOrden.asc?' ▲':' ▼'):'';
  const TH='position:sticky;top:0;background:var(--panel2);z-index:1;padding:.45rem .4rem;font-size:.6rem;text-transform:uppercase;letter-spacing:.05em;color:var(--muted2);border-bottom:1px solid var(--border);cursor:pointer;white-space:nowrap;user-select:none';
  const th=(k,l,tit,al)=>`<th onclick="_tacOrdenar('${k}')" title="${_tacEsc(tit||'Ordenar')}" style="${TH};text-align:${al||'right'}">${l}${flecha(k)}</th>`;
  const TD='padding:.32rem .4rem;border-bottom:1px solid var(--border);font-size:.74rem;white-space:nowrap';
  const num=(v,cl)=>{
    if(!v)return`<td style="${TD};text-align:right;color:var(--muted);opacity:.5">·</td>`;
    const col=cl.alerta?cl.c:(cl.fuerte?cl.c:'var(--text)');
    return`<td style="${TD};text-align:right;font-variant-numeric:tabular-nums;color:${col};${cl.fuerte||cl.alerta?'font-weight:800':''}">${_tacN(v)}</td>`;
  };
  const pct=v=>v==null?'—':v.toFixed(1).replace('.',',')+'%';
  const colPct=v=>v==null?'var(--muted2)':v>=98?'#10b981':v>=95?'#f59e0b':'#ef4444';
  const filas=D.filas.map((f,i)=>`<tr${f.inact?' style="background:rgba(239,68,68,.05)"':''}>
      <td style="${TD};text-align:right;color:var(--muted2)">${i+1}</td>
      <td style="${TD};font-weight:700;${f.inact?'color:var(--muted2)':''}">${_tacEsc(f.nombre)}${f.inact?' <span style="font-size:.58rem;color:#f87171;border:1px solid #f8717160;border-radius:3px;padding:0 3px">INACTIVO</span>':''}</td>
      <td style="${TD};font-family:monospace;color:#22d3ee">${_tacEsc(f.dni||'—')}</td>
      <td style="${TD};color:var(--muted2);max-width:170px;overflow:hidden;text-overflow:ellipsis" title="${_tacEsc(f.cargo)}">${_tacEsc(f.cargo||'—')}</td>
      <td style="${TD};font-family:monospace">${_tacF(f.inicio)}</td>
      <td style="${TD};font-family:monospace">${_tacF(f.ultima)}</td>
      <td style="${TD};text-align:right;font-variant-numeric:tabular-nums">${_tacN(f.cal)}</td>
      ${_TAC_COLS.map(cl=>num(f[cl.k],cl)).join('')}
      <td style="${TD};text-align:right;font-weight:700;color:${colPct(f.asis)}">${pct(f.asis)}</td>
      <td style="${TD};text-align:right;font-variant-numeric:tabular-nums">${_tacN(f.hh)}</td>
    </tr>`).join('');
  const TF='position:sticky;bottom:0;background:var(--panel2);padding:.45rem .4rem;border-top:2px solid var(--border);font-size:.74rem;font-weight:800;white-space:nowrap;text-align:right;font-variant-numeric:tabular-nums';
  const controles=`
    <div style="display:flex;gap:.6rem;flex-wrap:wrap;align-items:center;margin-bottom:.75rem">
      <select onchange="_tacSet('proy',this.value)" style="${ctl};max-width:220px">${proyOpts}</select>
      <input type="text" value="${_tacEsc(D.q)}" oninput="_tacSet('busca',this.value)" placeholder="🔍 Nombre, cargo o DNI" style="${ctl};width:200px">
      <label style="font-size:.7rem;color:var(--muted2);display:flex;align-items:center;gap:.35rem">Hasta
        <input type="date" value="${D.hasta}" max="${hoy}" onchange="_tacSet('hasta',this.value)" style="${ctl}"></label>
      ${_tacHasta?`<button class="btn btn-out btn-sm" onclick="_tacSet('hasta','')">Hoy</button>`:''}
      <label style="font-size:.72rem;display:flex;align-items:center;gap:.4rem;cursor:pointer;color:${_tacInact?'#f87171':'var(--muted2)'}">
        <input type="checkbox" ${_tacInact?'checked':''} onchange="_tacSet('inact',this.checked)" style="width:auto;accent-color:#ef4444"> Mostrar inactivos</label>
      <div style="margin-left:auto;display:flex;gap:.4rem">
        <button class="btn btn-out btn-sm" onclick="_tacExcel()" style="color:#10b981;border-color:#10b98160">📊 Excel</button>
        <button class="btn btn-out btn-sm" onclick="_tacPdf()" style="color:#ef4444;border-color:#ef444460">🖨 PDF</button>
      </div>
    </div>`;
  const res=`
    <div style="display:flex;gap:.6rem;flex-wrap:wrap;margin-bottom:.75rem">
      ${kpi('Trabajadores',_tacN(D.filas.length),'#6366f1',D.inicioGen?'tareaje desde el '+_tacF(D.inicioGen):'')}
      ${kpi('Días trabajados',_tacN(D.tot.trab),'#10b981','TD + TN + DLT + A5')}
      ${kpi('Días libres',_tacN(D.tot.DL),'#9ca3af','DL')}
      ${kpi('Faltas',_tacN(D.tot.F),'#ef4444','asistencia '+pct(D.tot.asis))}
      ${kpi('Sin marcar',_tacN(D.tot.sin),'#f59e0b','días sin ninguna marca')}
      ${kpi('Horas hombre',_tacN(D.tot.hh),'#3b82f6',_TAC_HH_DIA+' h por día trabajado')}
    </div>
    <div style="font-size:.66rem;color:var(--muted2);margin-bottom:.45rem">
      Desde la primera marca de cada trabajador hasta el <b style="color:var(--text)">${_tacF(D.hasta)}</b>${D.hasta===hoy?' (hoy)':''}. Los días programados después no se cuentan.
      Un inactivo se cuenta hasta su última marca.${D.sinMarcas?` · ${D.sinMarcas} trabajador(es) sin ninguna marca no aparecen.`:''} Toque un encabezado para ordenar.</div>
    <div style="max-height:58vh;overflow:auto;border:1px solid var(--border);border-radius:8px">
      <table style="border-collapse:collapse;width:100%;min-width:1250px">
        <thead><tr>
          <th style="${TH};text-align:right;cursor:default">N°</th>
          ${th('nombre','Trabajador','',"left")}${th('dni','DNI','',"left")}${th('cargo','Cargo','',"left")}
          ${th('inicio','Inicio','Primera marca de tareaje',"left")}${th('ultima','Última','Última marca hasta el corte',"left")}
          ${th('cal','Días','Días calendario desde su inicio')}
          ${_TAC_COLS.map(cl=>th(cl.k,`<span style="color:${cl.c}">${cl.l}</span>`,cl.tit)).join('')}
          ${th('asis','% Asist.','Trabajados ÷ (trabajados + faltas)')}${th('hh','HH','Horas hombre')}
        </tr></thead>
        <tbody>${filas||`<tr><td colspan="${9+_TAC_COLS.length}" style="padding:2rem;text-align:center;color:var(--muted2)">Sin trabajadores con marcas para estos filtros</td></tr>`}</tbody>
        ${D.filas.length?`<tfoot><tr>
          <td colspan="6" style="${TF};text-align:left">TOTAL · ${_tacN(D.filas.length)} trabajador(es)</td>
          <td style="${TF}">${_tacN(D.tot.cal)}</td>
          ${_TAC_COLS.map(cl=>`<td style="${TF};color:${cl.fuerte||cl.alerta?cl.c:'var(--text)'}">${_tacN(D.tot[cl.k])}</td>`).join('')}
          <td style="${TF};color:${colPct(D.tot.asis)}">${pct(D.tot.asis)}</td>
          <td style="${TF}">${_tacN(D.tot.hh)}</td></tr></tfoot>`:''}
      </table>
    </div>`;
  const caja=document.getElementById('tacRes');
  if(soloRes&&caja){caja.innerHTML=res;return;}
  el.innerHTML=controles+`<div id="tacRes">${res}</div>`;
}

// ── Exportar ───────────────────────────────────────────────────────────────
function _tacFiltrosTxt(D){
  const pr=D.proy?((DB.proyectos||[]).find(p=>p.codigo===D.proy)||{}).nombre||D.proy:'Todos los proyectos';
  return[`Hasta el ${_tacF(D.hasta)}`,pr,D.q?`búsqueda «${D.q}»`:'',_tacInact?'incluye inactivos':'solo activos'].filter(Boolean).join(' · ');
}
function _tacExcel(){
  if(typeof XLSX==='undefined'){toast('No se cargó la librería de Excel',true);return;}
  const D=_tacDatos();
  if(!D.filas.length){toast('No hay trabajadores para exportar',true);return;}
  const cab=['N°','Trabajador','DNI','Cargo','Estado','Inicio','Última marca','Días calendario',..._TAC_COLS.map(c=>c.l),'% Asistencia','Horas hombre'];
  const aoa=[['RESUMEN DE TAREAJE DESDE EL INICIO'],[_tacFiltrosTxt(D)],[],cab];
  D.filas.forEach((f,i)=>aoa.push([i+1,f.nombre,String(f.dni||''),f.cargo,f.inact?'Inactivo':'Activo',_tacF(f.inicio),_tacF(f.ultima),f.cal,
    ..._TAC_COLS.map(c=>f[c.k]||0),f.asis==null?'':Math.round(f.asis*10)/10,f.hh]));
  aoa.push(['','TOTAL','','','','','',D.tot.cal,..._TAC_COLS.map(c=>D.tot[c.k]||0),D.tot.asis==null?'':Math.round(D.tot.asis*10)/10,D.tot.hh]);
  const ws=XLSX.utils.aoa_to_sheet(aoa);
  // DNI como texto, para no perder ceros a la izquierda
  D.filas.forEach((f,i)=>{const ref=XLSX.utils.encode_cell({r:4+i,c:2});if(ws[ref])ws[ref].t='s';});
  ws['!cols']=[{wch:5},{wch:34},{wch:11},{wch:26},{wch:9},{wch:11},{wch:12},{wch:9},..._TAC_COLS.map(c=>({wch:Math.max(6,c.l.length+2)})),{wch:11},{wch:11}];
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Desde el inicio');
  XLSX.writeFile(wb,`Tareaje_desde_inicio_al_${D.hasta}_${D.proy||'TODOS'}.xlsx`);
}
function _tacPdf(){
  const D=_tacDatos();
  if(!D.filas.length){toast('No hay trabajadores para imprimir',true);return;}
  const logo=(typeof EMPRESA!=='undefined'&&EMPRESA.logo)?window.location.href.replace(/[^\/\\]+$/,'')+EMPRESA.logo:'';
  const B='border:1px solid #cbd5e1;padding:2px 4px';
  const pct=v=>v==null?'—':v.toFixed(1).replace('.',',')+'%';
  const fila=(f,i)=>`<tr${f.inact?' style="color:#94a3b8"':''}><td style="${B};text-align:right">${i+1}</td><td style="${B};font-weight:700;white-space:nowrap">${_tacEsc(f.nombre)}${f.inact?' (inactivo)':''}</td>
    <td style="${B}">${_tacEsc(f.dni)}</td><td style="${B}">${_tacEsc(f.cargo)}</td><td style="${B}">${_tacF(f.inicio)}</td><td style="${B}">${_tacF(f.ultima)}</td>
    <td style="${B};text-align:right">${f.cal}</td>${_TAC_COLS.map(c=>`<td style="${B};text-align:right;${c.alerta&&f[c.k]?'color:#b91c1c;font-weight:700':c.fuerte?'font-weight:700':''}">${f[c.k]||''}</td>`).join('')}
    <td style="${B};text-align:right">${pct(f.asis)}</td><td style="${B};text-align:right">${_tacN(f.hh)}</td></tr>`;
  const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Tareaje desde el inicio al ${_tacF(D.hasta)}</title>
  <style>@page{size:A4 landscape;margin:.8cm}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
  body{font-family:Arial,sans-serif;font-size:8px;color:#111;margin:0}table{border-collapse:collapse;width:100%}thead{display:table-header-group}tr{page-break-inside:avoid}
  th{background:#1e293b;color:#fff;padding:3px 4px;font-size:7.5px;text-transform:uppercase;border:1px solid #1e293b}</style></head><body>
  <div style="display:flex;align-items:center;gap:12px;border-bottom:2px solid #1e293b;padding-bottom:6px;margin-bottom:6px">
    ${logo?`<img src="${logo}" style="height:34px">`:''}
    <div><div style="font-size:14px;font-weight:900;color:#1e293b">RESUMEN DE TAREAJE DESDE EL INICIO</div>
    <div style="font-size:9px;color:#475569">${_tacEsc(_tacFiltrosTxt(D))} · ${D.filas.length} trabajador(es) · trabajados ${_tacN(D.tot.trab)} · faltas ${_tacN(D.tot.F)} · asistencia ${pct(D.tot.asis)} · ${_tacN(D.tot.hh)} HH</div></div>
  </div>
  <table><thead><tr><th>N°</th><th>Trabajador</th><th>DNI</th><th>Cargo</th><th>Inicio</th><th>Última</th><th>Días</th>${_TAC_COLS.map(c=>`<th>${c.l}</th>`).join('')}<th>% Asist.</th><th>HH</th></tr></thead>
  <tbody>${D.filas.map(fila).join('')}
  <tr style="font-weight:800;background:#f1f5f9"><td style="${B}" colspan="6">TOTAL</td><td style="${B};text-align:right">${_tacN(D.tot.cal)}</td>${_TAC_COLS.map(c=>`<td style="${B};text-align:right">${_tacN(D.tot[c.k])}</td>`).join('')}<td style="${B};text-align:right">${pct(D.tot.asis)}</td><td style="${B};text-align:right">${_tacN(D.tot.hh)}</td></tr>
  </tbody></table>
  <script>window.onload=()=>window.print();<\/script></body></html>`;
  const w=window.open('','_blank');
  if(!w){toast('Active ventanas emergentes para imprimir',true);return;}
  w.document.write(html);w.document.close();
}
