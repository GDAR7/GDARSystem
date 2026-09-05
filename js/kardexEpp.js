// ══════════════════════════════════════════════════════════════════════════
//  CARDEX DE EPP POR TRABAJADOR
//  Se alimenta automáticamente de las SALIDAS de almacén (vales de salida):
//  cada despacho hecho a una persona llena la fila de su fecha y la columna
//  del EPP entregado. No requiere tabla nueva: todo se deriva de DB.almacen.
// ══════════════════════════════════════════════════════════════════════════

// Datos fijos del formato (editar aquí si cambia el documento controlado)
const KEP_CFG={
  titulo1:'SISTEMA DE GESTION DE SEGURIDAD SALUD OCUPACIONAL -SGSSO',
  titulo2:"CARDEX DE EQUIPO DE PROTECCION PERSONAL EPP´S",
  proyecto:'PROYECTO CONTRAFUERTE R3',
  codigo:'PU-AL-001',
  version:'0',
  aprobado:'16/03/2025',
  empresa:'ECOSERMO' 
};
const _KEP_MIN_FILAS=14;   // filas en blanco mínimas al imprimir

let _kepPersId=null;          // null = vista de lista
let _kepAnio=String(new Date().getFullYear());
let _kepProy='';
let _kepBuscar='';
let _kepSoloEpp=true;         // true = solo artículos con tipo EPPS en el catálogo
let _kepCompleto=false;       // true = todas las columnas del catálogo (formato en blanco)
let _kepUnidad=localStorage.getItem('_kepUnidad')||'UCHUCCHACUA';
let _kepArea=localStorage.getItem('_kepArea')||'PROYECTO';

// ── Utilitarios ──
function _kepNorm(s){return String(s||'').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9]/g,' ').replace(/\s+/g,' ').trim();}
function _kepEsc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function _kepCat(cod){return (DB.catalogoItems||[]).find(c=>String(c.cod).trim()===String(cod).trim());}
function _kepEsEpp(cod){const c=_kepCat(cod);return !!c&&c.tipo==='EPPS';}
function _kepOrdCat(cat){const m=String(cat||'').match(/^\s*(\d+)/);return m?+m[1]:98;}
function _kepFDia(f){const p=String(f||'').split('-');return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:(f||'');}

// Índice persona → salidas de almacén (se reconstruye en cada render)
function _kepIndex(){
  const porDni={},porNom={};
  (DB.personal||[]).forEach(p=>{
    if(p.dni)porDni[String(p.dni).trim()]=p;
    const k=_kepNorm((p.ape||'')+' '+(p.nom||''));
    if(k&&!porNom[k])porNom[k]=p;
  });
  const map=new Map();
  (DB.almacen||[]).forEach(r=>{
    if(r.tipo!=='S')return;
    const par=String(r.para||'');
    if(!par.trim())return;
    const m=par.match(/\b\d{8}\b/);
    let p=m?porDni[m[0]]:null;
    if(!p)p=porNom[_kepNorm(par.split(/\s[–—-]\s/)[0])];
    if(!p)return;
    if(!map.has(p.id))map.set(p.id,[]);
    map.get(p.id).push(r);
  });
  return map;
}

// Matriz del cardex de una persona
function _kepDatos(p,idx,completo){
  if(completo===undefined)completo=_kepCompleto;
  let movs=(idx.get(p.id)||[]).slice();
  if(_kepSoloEpp)movs=movs.filter(r=>_kepEsEpp(r.codigo));
  if(_kepAnio)movs=movs.filter(r=>String(r.fecha||'').startsWith(_kepAnio));
  if(_kepProy)movs=movs.filter(r=>String(r.codProy||'').trim()===_kepProy);
  const fechas=[...new Set(movs.map(r=>r.fecha))].sort();
  const nomDe=cod=>movs.find(r=>String(r.codigo).trim()===String(cod).trim())||{};
  let cods;
  if(completo){
    const cat=(DB.catalogoItems||[]).filter(c=>c.tipo==='EPPS').map(c=>String(c.cod).trim());
    cods=[...new Set([...cat,...movs.map(r=>String(r.codigo).trim())])];
  }else{
    cods=[...new Set(movs.map(r=>String(r.codigo).trim()))];
  }

  const cols=cods.map(cod=>{
    const c=_kepCat(cod),mv=nomDe(cod);
    return{cod,nom:(c?c.desc:mv.nombre)||cod,und:(c?c.und:mv.unidad)||'',cat:((c&&c.categoria)?String(c.categoria).trim():'')||'8. Otros'};
  });
  cols.sort((a,b)=>_kepOrdCat(a.cat)-_kepOrdCat(b.cat)||a.cat.localeCompare(b.cat,'es')||a.nom.localeCompare(b.nom,'es'));
  const grupos=[];
  cols.forEach(c=>{const g=grupos[grupos.length-1];if(g&&g.cat===c.cat)g.n++;else grupos.push({cat:c.cat,n:1});});
  const celda={},vales={};
  movs.forEach(r=>{
    const k=r.fecha+'|'+String(r.codigo).trim();
    celda[k]=(celda[k]||0)+(+r.cant||0);
    if(r.numVale){(vales[r.fecha]=vales[r.fecha]||new Set()).add(String(r.numVale).trim());}
  });
  const tot={};
  cols.forEach(c=>{tot[c.cod]=fechas.reduce((s,f)=>s+(celda[f+'|'+c.cod]||0),0);});
  return{movs,fechas,cols,grupos,celda,vales,tot};
}

// ── Render principal.
function rKardexEpp(){
  if(_kepPersId)_kepRenderCardex();else _kepRenderLista();
}
function _kepAbrir(id){_kepPersId=id;rKardexEpp();window.scrollTo(0,0);}
function _kepVolver(){_kepPersId=null;rKardexEpp();}
function _kepSet(campo,val){
  if(campo==='anio')_kepAnio=val;
  else if(campo==='proy')_kepProy=val;
  else if(campo==='soloEpp')_kepSoloEpp=val;
  else if(campo==='completo')_kepCompleto=val;
  else if(campo==='unidad'){_kepUnidad=val;localStorage.setItem('_kepUnidad',val);}
  else if(campo==='area'){_kepArea=val;localStorage.setItem('_kepArea',val);}
  rKardexEpp();
}
function _kepBuscarInput(v){
  _kepBuscar=v;
  const q=v.toLowerCase().trim();
  document.querySelectorAll('#kepTbody tr').forEach(tr=>{
    tr.style.display=(!q||(tr.dataset.s||'').includes(q))?'':'none';
  });
}

function _kepAnios(){
  const a=new Set([String(new Date().getFullYear())]);
  (DB.almacen||[]).forEach(r=>{if(r.tipo==='S'&&r.fecha)a.add(String(r.fecha).slice(0,4));});
  return [...a].sort().reverse();
}
function _kepBarra(){
  const anios=_kepAnios();
  return`<div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;margin-bottom:.8rem;padding:.45rem .7rem;background:var(--panel2);border:1px solid var(--border);border-radius:8px">
    <span style="font-size:.62rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.08em">Periodo</span>
    <select onchange="_kepSet('anio',this.value)" style="${ISS};width:auto;min-width:90px">
      <option value="">Todos</option>
      ${anios.map(a=>`<option value="${a}"${a===_kepAnio?' selected':''}>${a}</option>`).join('')}
    </select>
    <span style="width:1px;height:18px;background:var(--border)"></span>
    <span style="font-size:.62rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.08em">Proyecto</span>
    <select onchange="_kepSet('proy',this.value)" style="${ISS};width:auto;max-width:200px">
      <option value="">— Todos —</option>
      ${(DB.proyectos||[]).map(p=>`<option value="${p.codigo}"${p.codigo===_kepProy?' selected':''}>[${p.codigo}] ${_kepEsc(p.nombre)}</option>`).join('')}
    </select>
    <span style="width:1px;height:18px;background:var(--border)"></span>
    <label style="display:inline-flex;align-items:center;gap:.3rem;font-size:.72rem;color:var(--muted2);cursor:pointer">
      <input type="checkbox" ${_kepSoloEpp?'checked':''} onchange="_kepSet('soloEpp',this.checked)" style="width:auto;margin:0;cursor:pointer"> Solo EPPs
    </label>
    <span style="font-size:.6rem;color:var(--muted)" title="Cuando está activo solo se consideran los artículos con tipo EPPS en el catálogo de Materiales">ⓘ</span>
  </div>`;
}

// ── Vista 1: lista de trabajadores.
function _kepRenderLista(){
  const idx=_kepIndex();
  const pers=(DB.personal||[])
    .filter(p=>(p.est||'Activo')==='Activo')
    .sort((a,b)=>`${a.ape} ${a.nom}`.localeCompare(`${b.ape} ${b.nom}`,'es'));
  const fila=pers.map(p=>{
    const d=_kepDatos(p,idx,false);
    return{p,ent:d.movs.length,tipos:d.cols.length,cods:d.cols.map(c=>c.cod),ult:d.fechas.length?d.fechas[d.fechas.length-1]:''};
  });
  const conEnt=fila.filter(f=>f.ent>0);
  const tiposDist=new Set();
  fila.forEach(f=>{if(f.ent)f.cods.forEach(c=>tiposDist.add(c));});
  const kpis=[
    {l:'Trabajadores con Cardex',v:conEnt.length,c:'#10b981',ic:'👷',sub:`de ${pers.length} activos`},
    {l:'Entregas Registradas',v:fila.reduce((s,f)=>s+f.ent,0),c:'var(--alm)',ic:'📦',sub:_kepAnio?`periodo ${_kepAnio}`:'todos los periodos'},
    {l:'Sin Entregas',v:pers.length-conEnt.length,c:'#ef4444',ic:'⚠️',sub:'revisar despachos'},
    {l:'Tipos de EPP Entregados',v:tiposDist.size,c:'#8b5cf6',ic:'🦺',sub:'artículos distintos'}
  ];
  document.getElementById('kepBody').innerHTML=`
    <div class="kpi-row">${kpis.map(k=>`<div class="kpi" style="--kc:${k.c};flex:1;min-width:150px"><div style="display:flex;justify-content:space-between;align-items:flex-start"><span class="kpi-lbl">${k.l}</span><span style="font-size:1.25rem;line-height:1;opacity:.75">${k.ic}</span></div><div class="kpi-val" style="font-size:2rem">${k.v}</div><div class="kpi-sub">${k.sub}</div></div>`).join('')}</div>
    ${_kepBarra()}
    <div class="card">
      <div class="card-head"><span class="card-title">Trabajadores</span>
        <div class="card-head-right" style="gap:.5rem">
          <input type="text" value="${_kepEsc(_kepBuscar)}" placeholder="🔍 Buscar nombre, DNI o cargo..." oninput="_kepBuscarInput(this.value)" style="background:var(--panel2);border:1px solid var(--border);border-radius:6px;padding:.28rem .6rem;color:var(--text);font-size:.8rem;width:230px">
        </div>
      </div>
      <div class="card-body" style="overflow-x:auto;padding:0">
        <table style="border-collapse:collapse;width:100%">
          <thead><tr style="background:var(--panel2)">
            <th style="padding:6px;font-size:.68rem;width:40px">N°</th>
            <th style="padding:6px 8px;font-size:.68rem;text-align:left">Trabajador</th>
            <th style="padding:6px;font-size:.68rem;text-align:left;min-width:88px">DNI</th>
            <th style="padding:6px;font-size:.68rem;text-align:left;min-width:150px">Cargo</th>
            <th style="padding:6px;font-size:.68rem;text-align:center;min-width:70px">Entregas</th>
            <th style="padding:6px;font-size:.68rem;text-align:center;min-width:80px">Tipos EPP</th>
            <th style="padding:6px;font-size:.68rem;text-align:center;min-width:100px">Última entrega</th>
            <th style="padding:6px;font-size:.68rem;text-align:center;width:110px">Cardex</th>
          </tr></thead>
          <tbody id="kepTbody">${fila.map((f,i)=>`
            <tr data-s="${_kepEsc(((f.p.ape||'')+' '+(f.p.nom||'')+' '+(f.p.dni||'')+' '+(f.p.cargo||'')).toLowerCase())}" style="border-bottom:1px solid var(--border)">
              <td style="text-align:center;font-size:.7rem;color:var(--muted2);padding:4px">${String(i+1).padStart(4,'0')}</td>
              <td style="padding:4px 8px;font-size:.79rem"><strong>${_kepEsc(f.p.ape)}, ${_kepEsc(f.p.nom)}</strong></td>
              <td style="padding:4px 6px;font-family:monospace;font-size:.74rem;color:#22d3ee">${f.p.dni||'—'}</td>
              <td style="padding:4px 6px;font-size:.72rem;color:var(--muted2)">${_kepEsc(f.p.cargo)||'—'}</td>
              <td style="padding:4px;text-align:center;font-size:.78rem;font-weight:700;color:${f.ent?'#10b981':'var(--muted)'}">${f.ent||'—'}</td>
              <td style="padding:4px;text-align:center;font-size:.78rem;color:${f.tipos?'#8b5cf6':'var(--muted)'}">${f.tipos||'—'}</td>
              <td style="padding:4px;text-align:center;font-size:.72rem;font-family:monospace;color:var(--muted2)">${f.ult?_kepFDia(f.ult):'—'}</td>
              <td style="padding:4px;text-align:center"><button class="btn btn-sm" onclick="_kepAbrir(${f.p.id})" style="background:rgba(249,115,22,.14);color:var(--alm);border:1px solid var(--alm);font-size:.7rem">📋 Ver</button></td>
            </tr>`).join('')}</tbody>
        </table>
      </div>
    </div>`;
  if(_kepBuscar)_kepBuscarInput(_kepBuscar);
}

// ── Vista 2: cardex del trabajador.
function _kepRenderCardex(){
  const p=(DB.personal||[]).find(x=>x.id===_kepPersId);
  if(!p){_kepPersId=null;return _kepRenderLista();}
  const idx=_kepIndex();
  const d=_kepDatos(p,idx);
  const orden=(DB.personal||[]).filter(x=>(x.est||'Activo')==='Activo').sort((a,b)=>`${a.ape} ${a.nom}`.localeCompare(`${b.ape} ${b.nom}`,'es'));
  const nro=String(orden.findIndex(x=>x.id===p.id)+1).padStart(4,'0');
  const vert='writing-mode:vertical-rl;transform:rotate(180deg);white-space:nowrap;font-size:.62rem;font-weight:600;padding:6px 2px;height:150px;vertical-align:bottom;text-align:left';
  const filas=d.fechas.map(f=>`<tr style="border-bottom:1px solid var(--border)">
      <td style="padding:3px 6px;font-family:monospace;font-size:.72rem;white-space:nowrap;border-right:1px solid var(--border)">${_kepFDia(f)}</td>
      ${d.cols.map(c=>{const v=d.celda[f+'|'+c.cod]||0;
        return`<td style="text-align:center;font-size:.7rem;font-weight:${v?'700':'400'};padding:3px 2px;border-right:1px solid var(--border);${v?'background:rgba(16,185,129,.14);color:#10b981':'color:var(--muted)'}" title="${_kepEsc(c.nom)}">${v?fmtN(v):''}</td>`;}).join('')}
      <td style="padding:3px 6px;font-size:.66rem;color:var(--muted2);white-space:nowrap">${[...(d.vales[f]||[])].join(', ')||'—'}</td>
    </tr>`).join('');
  const sinDatos=!d.fechas.length;
  document.getElementById('kepBody').innerHTML=`
    <div style="display:flex;align-items:center;gap:.6rem;flex-wrap:wrap;margin-bottom:.8rem">
      <button class="btn btn-out btn-sm" onclick="_kepVolver()" style="font-size:.78rem">← Volver a la lista</button>
      <div style="flex:1;min-width:200px">
        <div style="font-size:1rem;font-weight:800;color:var(--text)">${_kepEsc(p.ape)}, ${_kepEsc(p.nom)}</div>
        <div style="font-size:.72rem;color:var(--muted2)">DNI ${p.dni||'—'} · ${_kepEsc(p.cargo)||'—'} · Cardex N° ${nro}</div>
      </div>
      <label style="display:inline-flex;align-items:center;gap:.3rem;font-size:.72rem;color:var(--muted2);cursor:pointer">
        <input type="checkbox" ${_kepCompleto?'checked':''} onchange="_kepSet('completo',this.checked)" style="width:auto;margin:0;cursor:pointer"> Formato completo (todo el catálogo)
      </label>
      <button class="btn btn-out btn-sm" onclick="_kepImprimir()" style="color:var(--alm);border-color:var(--alm);font-size:.78rem">🖨️ Imprimir Cardex</button>
      <button class="btn btn-out btn-sm" onclick="_kepExcel()" style="color:#10b981;border-color:#10b98160;font-size:.78rem">📥 Excel</button>
    </div>
    ${_kepBarra()}
    <div class="card">
      <div class="card-head"><span class="card-title">Entregas registradas</span>
        <div class="card-head-right" style="gap:.6rem;font-size:.72rem;color:var(--muted2)">
          <span>Unidad Minera <input value="${_kepEsc(_kepUnidad)}" onchange="_kepSet('unidad',this.value)" style="${ISS};width:130px"></span>
          <span>Área <input value="${_kepEsc(_kepArea)}" onchange="_kepSet('area',this.value)" style="${ISS};width:110px"></span>
        </div>
      </div>
      <div class="card-body" style="overflow-x:auto;padding:0">
        ${sinDatos&&!d.cols.length?`<div style="padding:2rem;text-align:center;color:var(--muted)">Sin entregas de EPP registradas para este trabajador en el periodo seleccionado.<br><span style="font-size:.72rem">Las entregas se toman de los vales de salida de Almacén despachados a su nombre o DNI.</span></div>`:`
        <table style="border-collapse:collapse;min-width:100%">
          <thead>
            <tr style="background:var(--panel2)">
              <th rowspan="2" style="padding:6px;font-size:.68rem;border-right:1px solid var(--border);min-width:82px;vertical-align:bottom">FECHA</th>
              ${d.grupos.map(g=>`<th colspan="${g.n}" style="padding:4px;font-size:.66rem;text-align:center;color:var(--alm);border:1px solid var(--border);background:rgba(249,115,22,.1)">${_kepEsc(g.cat)}</th>`).join('')}
              <th rowspan="2" style="padding:6px;font-size:.66rem;min-width:90px;vertical-align:bottom">Vale(s)</th>
            </tr>
            <tr style="background:var(--panel2)">
              ${d.cols.map(c=>`<th style="${vert};border-right:1px solid var(--border)" title="${_kepEsc(c.cod)} – ${_kepEsc(c.nom)}">${_kepEsc(c.nom)}</th>`).join('')}
            </tr>
          </thead>
          <tbody>${filas||`<tr><td colspan="${d.cols.length+2}" style="padding:1.5rem;text-align:center;color:var(--muted);font-size:.78rem">Sin entregas en el periodo — el formato queda listo para imprimir en blanco.</td></tr>`}</tbody>
          <tfoot><tr style="background:rgba(4,78,100,.14);border-top:2px solid var(--border)">
            <td style="padding:4px 6px;font-size:.68rem;font-weight:700;color:var(--muted2)">TOTAL</td>
            ${d.cols.map(c=>`<td style="text-align:center;font-size:.7rem;font-weight:800;padding:4px 2px;color:${d.tot[c.cod]?'#f59e0b':'var(--muted)'}">${d.tot[c.cod]?fmtN(d.tot[c.cod]):''}</td>`).join('')}
            <td></td>
          </tr></tfoot>
        </table>`}
      </div>
    </div>`;
}

// ── Impresión: réplica del formato controlado (A4 apaisado).
function _kepImprimir(){
  const p=(DB.personal||[]).find(x=>x.id===_kepPersId);if(!p)return;
  const idx=_kepIndex(),d=_kepDatos(p,idx);
  if(!d.cols.length){toast('No hay EPPs que mostrar en el periodo',true);return;}
  const orden=(DB.personal||[]).filter(x=>(x.est||'Activo')==='Activo').sort((a,b)=>`${a.ape} ${a.nom}`.localeCompare(`${b.ape} ${b.nom}`,'es'));
  const nro=String(orden.findIndex(x=>x.id===p.id)+1).padStart(4,'0');
  const logo=window.location.href.replace(/[^\/\\]+$/,'')+EMPRESA.logo;
  const nFilas=Math.max(_KEP_MIN_FILAS,d.fechas.length);
  const filas=Array.from({length:nFilas},(_,i)=>{
    const f=d.fechas[i];
    return`<tr>
      <td class="fec">${f?_kepFDia(f):'&nbsp;'}</td>
      ${d.cols.map(c=>{const v=f?(d.celda[f+'|'+c.cod]||0):0;return`<td class="cel">${v?fmtN(v):''}</td>`;}).join('')}
      <td class="frm">&nbsp;</td>
    </tr>`;
  }).join('');
  const w=window.open('','_blank','width=1200,height=760');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Cardex EPP – ${_kepEsc(p.ape)}, ${_kepEsc(p.nom)}</title><style>
    @page{size:A4 landscape;margin:.8cm}
    *{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
    body{font-family:Arial,Helvetica,sans-serif;color:#000;font-size:10px}
    table{border-collapse:collapse;width:100%}
    td,th{border:1px solid #000}
    .hd{margin-bottom:0}
    .hd td{padding:2px 4px;vertical-align:middle}
    .logo img{height:52px;object-fit:contain;display:block;margin:auto}
    .tit{text-align:center;font-weight:700;font-size:11px;background:#d9d9d9;line-height:1.5}
    .meta{font-size:8.5px}
    .meta b{font-weight:700}
    .nro{text-align:center;font-weight:700;font-size:15px;color:#c00000;background:#ffff00}
    .lbl{background:#dbe5f1;font-weight:700;font-size:9px;text-align:center;white-space:nowrap}
    .val{text-align:center;font-weight:700;font-size:10px}
    .val.hl{background:#ffff00}
    .grp{background:#fff;font-weight:700;font-size:9px;text-align:center}
    .vh{height:150px;vertical-align:bottom;text-align:left;padding:3px 1px;background:#dbe5f1}
    .vh span{writing-mode:vertical-rl;transform:rotate(180deg);white-space:nowrap;font-size:8px;font-weight:600;display:block}
    .fecha-h{background:#fff;font-weight:700;font-size:11px;text-align:center;vertical-align:middle;width:70px}
    .firma-h{background:#fff;font-weight:700;font-size:10px;text-align:center;vertical-align:middle;width:100px}
    .fec{height:17px;text-align:center;font-size:9px;width:70px}
    .cel{height:17px;text-align:center;font-size:9px;font-weight:700}
    .frm{height:17px;width:100px}
    .tot td{background:#dbe5f1;font-weight:700;font-size:9px;text-align:center;height:17px}
    .pie{margin-top:6px;font-size:7.5px;color:#555;display:flex;justify-content:space-between}
  </style></head><body>
  <table class="hd">
    <tr>
      <td class="logo" rowspan="3" style="width:210px"><img src="${logo}" alt=""></td>
      <td class="tit" rowspan="3">${KEP_CFG.titulo1}<br>${KEP_CFG.titulo2}</td>
      <td class="meta" colspan="2" style="text-align:center;font-weight:700">${KEP_CFG.proyecto}</td>
      <td class="nro" rowspan="3" style="width:64px">${nro}</td>
    </tr>
    <tr><td class="meta" style="width:80px"><b>Código:</b></td><td class="meta" style="width:90px;text-align:center;font-weight:700">${KEP_CFG.codigo}</td></tr>
    <tr><td class="meta"><b>Versión:</b> ${KEP_CFG.version}&nbsp;&nbsp;<b>Aprobado:</b> ${KEP_CFG.aprobado}</td><td class="meta" style="text-align:center"></td></tr>
  </table>
  <table class="hd">
    <tr>
      <td class="lbl" style="width:150px">APELLIDO Y NOMBRE:</td><td class="val hl">${_kepEsc(p.ape)}, ${_kepEsc(p.nom)}</td>
      <td class="lbl" style="width:80px">DNI N°:</td><td class="val" style="width:110px">${p.dni||''}</td>
      <td class="lbl" style="width:70px">CARGO:</td><td class="val hl" style="width:200px">${_kepEsc(p.cargo)||''}</td>
      <td class="lbl" style="width:80px">PERIODO:</td><td class="val" style="width:70px">${_kepAnio||'—'}</td>
    </tr>
    <tr>
      <td class="lbl">UNIDAD MINERA:</td><td class="val">${_kepEsc(_kepUnidad)}</td>
      <td class="lbl">EMPRESA:</td><td class="val">${KEP_CFG.empresa}</td>
      <td class="lbl">AREA:</td><td class="val">${_kepEsc(_kepArea)}</td>
      <td class="lbl">Fecha Ingreso:</td><td class="val">${p.ing?_kepFDia(p.ing):''}</td>
    </tr>
  </table>
  <table>
    <tr>
      <td class="fecha-h" rowspan="3">FECHA</td>
      ${d.grupos.map(g=>`<td class="grp" colspan="${g.n}">${_kepEsc(g.cat)}</td>`).join('')}
      <td class="firma-h" rowspan="3">Firma del<br>Trabajador</td>
    </tr>
    <tr>${d.cols.map(c=>`<td class="tot" style="height:13px"><div style="font-size:8px;font-weight:700;text-align:center">${d.tot[c.cod]?fmtN(d.tot[c.cod]):0}</div></td>`).join('')}</tr>
    <tr>${d.cols.map(c=>`<td class="vh"><span>${_kepEsc(c.nom)}</span></td>`).join('')}</tr>
    ${filas}
  </table>
  <div class="pie"><span>ECOSERMO · Cardex generado desde los vales de salida de Almacén – GDAR</span><span>${_kepAnio?'Periodo '+_kepAnio:'Todos los periodos'}${_kepProy?' · Proyecto '+_kepProy:''}</span></div>
  <script>window.onload=()=>window.print();<\/script></body></html>`);
  w.document.close();
}

// ── Exportar a Excel.
function _kepExcel(){
  const p=(DB.personal||[]).find(x=>x.id===_kepPersId);if(!p)return;
  const idx=_kepIndex(),d=_kepDatos(p,idx);
  if(!d.cols.length){toast('No hay EPPs que exportar',true);return;}
  const aoa=[
    [KEP_CFG.titulo2],
    [`${p.ape}, ${p.nom}`,'DNI:',p.dni||'','CARGO:',p.cargo||'','PERIODO:',_kepAnio||'Todos'],
    ['UNIDAD MINERA:',_kepUnidad,'EMPRESA:',KEP_CFG.empresa,'AREA:',_kepArea,'F. INGRESO:',p.ing||''],
    [],
    ['CATEGORÍA',...d.cols.map(c=>c.cat)],
    ['FECHA',...d.cols.map(c=>c.nom),'VALE(S)'],
    ...d.fechas.map(f=>[_kepFDia(f),...d.cols.map(c=>d.celda[f+'|'+c.cod]||''),[...(d.vales[f]||[])].join(', ')]),
    ['TOTAL',...d.cols.map(c=>d.tot[c.cod]||''),'']
  ];
  const ws=XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols']=[{wch:12},...d.cols.map(c=>({wch:Math.min(26,Math.max(10,c.nom.length))})),{wch:16}];
  const hdr={fill:{patternType:'solid',fgColor:{rgb:'1E3A5F'}},font:{bold:true,color:{rgb:'FFFFFF'},sz:9},alignment:{horizontal:'center',vertical:'center',wrapText:true}};
  const addr=(r,c)=>XLSX.utils.encode_cell({r,c});
  for(let c=0;c<=d.cols.length+1;c++){const cel=ws[addr(5,c)];if(cel)cel.s=hdr;}
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Cardex EPP');
  XLSX.writeFile(wb,`CardexEPP_${(p.dni||p.id)}_${_kepAnio||'todos'}.xlsx`);
  toast('✓ Cardex exportado');
}
