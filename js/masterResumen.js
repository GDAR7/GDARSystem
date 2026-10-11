// ══════════════════════════════════════════════════════════════════════════
//  MÁSTER DE EQUIPOS · pestaña «Resumen agrupado»
//  Tabla detallada con los equipos agrupados por Proveedor (por defecto),
//  Tipo, Subtipo o Proyecto: el grupo va de encabezado y sus equipos debajo.
//  Muestra Hrs mín. del proveedor, tarifa con su
//  moneda y unidad, contrato y calentamiento.
//  Respeta los filtros de arriba del Máster (Proyecto, Estado, Condición…).
// ══════════════════════════════════════════════════════════════════════════

let _mrVista='lista';          // 'lista' (tabla de siempre) | 'resumen' | 'venc'
let _mrAgrup='proveedor';
let _mrQ='';
let _mrCerrados=new Set();     // grupos contraídos
const _MR_AGRUP=[
  {k:'proveedor',l:'Proveedor'},
  {k:'tipo',l:'Tipo'},
  {k:'sub',l:'Subtipo'},
  {k:'proyecto',l:'Proyecto'}
];
const _MR_SIN={proveedor:'(Sin proveedor)',tipo:'(Sin tipo)',sub:'(Sin subtipo)',proyecto:'(Sin proyecto)'};
const _MR_MON={SOLES:'S/',DOLARES:'US$',EUROS:'€'};
const _MR_UN={HM:'h',DIA:'día',MES:'mes'};

function _mrEsc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function _mrNum(n,d){return (+n||0).toLocaleString('es-PE',{minimumFractionDigits:d||0,maximumFractionDigits:d==null?2:d});}
function _mrDMY(f){const p=String(f||'').slice(0,10).split('-');return p.length===3?p[2]+'/'+p[1]+'/'+p[0]:'';}
// Clave del grupo: sin espacios de más y sin distinguir mayúsculas, para que
// « CAMPOS ALMERCO» y «Campos Almerco» caigan juntos
function _mrClave(v){return String(v||'').trim().replace(/\s+/g,' ').toUpperCase();}
function _mrValor(e,k){return String((e&&e[k])||'').trim().replace(/\s+/g,' ');}
function _mrTarifa(e){
  if(!(+e.tarifa))return '';
  return (_MR_MON[e.moneda]||'S/')+' '+_mrNum(e.tarifa,2)+' / '+(_MR_UN[e.tarifaUn]||_mrEsc(e.tarifaUn||'h'));
}

// Grupos con sus equipos (ya filtrados por los chips del Máster)
function _mrDatos(eqs,agrup,q){
  const qq=String(q||'').trim().toLowerCase();
  const lista=eqs.filter(e=>!qq||[e.codigo,e.nombre,e.marca,e.modelo,e.placa,e.proveedor,e.sub,e.tipo,e.proyecto,e.rucProveedor]
    .join(' ').toLowerCase().includes(qq));
  const g={};
  lista.forEach(e=>{
    const v=_mrValor(e,agrup),k=_mrClave(v)||'~';
    const G=g[k]||(g[k]={k,nombre:v||_MR_SIN[agrup],sin:!v,eqs:[],ruc:'',ctc:'',cel:'',cor:'',logo:''});
    G.eqs.push(e);
    if(agrup==='proveedor'){
      if(!G.ruc&&e.rucProveedor)G.ruc=String(e.rucProveedor).trim();
      if(!G.ctc&&e.contacto)G.ctc=String(e.contacto).trim();
      if(!G.cel&&e.celular)G.cel=String(e.celular).trim();
      if(!G.cor&&e.correo)G.cor=String(e.correo).trim();
      if(!G.logo&&e.logoProveedor)G.logo=e.logoProveedor;
    }
  });
  const grupos=Object.values(g);
  grupos.forEach(G=>{
    G.eqs.sort((a,b)=>String(a.codigo||'').localeCompare(String(b.codigo||''),'es',{numeric:true}));
    G.activos=G.eqs.filter(e=>String(e.est||'').toUpperCase()!=='DESMOVILIZADO').length;
    // Tarifas sumadas por moneda y unidad: no se mezclan soles con dólares ni horas con meses
    const t={};
    G.eqs.forEach(e=>{if(!(+e.tarifa))return;const k=(e.moneda||'SOLES')+'|'+(e.tarifaUn||'HM');t[k]=(t[k]||0)+(+e.tarifa);});
    G.tarifas=Object.entries(t).map(([k,v])=>{const [m,u]=k.split('|');return{m,u,v};})
      .sort((a,b)=>a.m.localeCompare(b.m)||a.u.localeCompare(b.u));
    G.hmin=G.eqs.reduce((s,e)=>s+(+e.horasMinimas||0),0);
  });
  grupos.sort((a,b)=>(a.sin?1:0)-(b.sin?1:0)||a.nombre.localeCompare(b.nombre,'es',{numeric:true}));
  return{grupos,total:lista.length};
}

function _mrSetVista(v){_mrVista=v;rMaster();}
function _mrSetAgrup(k){_mrAgrup=k;_mrCerrados=new Set();rMasterResumen();}
function _mrToggle(k){_mrCerrados.has(k)?_mrCerrados.delete(k):_mrCerrados.add(k);rMasterResumen();}
function _mrTodos(abrir){
  _mrCerrados=abrir?new Set():new Set(_mrDatos(_mqFiltrados(),_mrAgrup,_mrQ).grupos.map(G=>G.k));
  rMasterResumen();
}
function _mrBuscar(v){
  _mrQ=v;rMasterResumen();
  const el=document.getElementById('mrQ');
  if(el){el.focus();el.setSelectionRange(v.length,v.length);}
}

// Botones Listado / Resumen agrupado (se pintan siempre, en las dos vistas)
function _mrTabs(){
  const el=document.getElementById('mqTabs');if(!el)return;
  const b=(k,t)=>{const a=_mrVista===k;
    return `<button onclick="_mrSetVista('${k}')" style="padding:.4rem 1rem;border:none;border-radius:7px 7px 0 0;cursor:pointer;font-size:.8rem;font-weight:700;background:${a?'var(--mec)':'transparent'};color:${a?'#fff':'var(--muted2)'}">${t}</button>`;};
  el.innerHTML=b('lista','📋 Listado')+b('resumen','🗂️ Resumen agrupado')+b('venc','🚦 Vencimientos');
  // Resumen y Vencimientos se pintan en el mismo panel
  const pl=document.getElementById('mqPanelLista'),pr=document.getElementById('mqPanelResumen');
  if(pl)pl.style.display=_mrVista==='lista'?'':'none';
  if(pr)pr.style.display=_mrVista!=='lista'?'':'none';
}

function rMasterResumen(){
  _mrTabs();
  const body=document.getElementById('mqResumenBody');if(!body)return;
  const {grupos,total}=_mrDatos(_mqFiltrados(),_mrAgrup,_mrQ);
  const esProv=_mrAgrup==='proveedor';
  const btn=(on,txt,fn)=>`<button onclick="${fn}" style="padding:.28rem .75rem;border-radius:6px;font-size:.74rem;font-weight:700;cursor:pointer;border:1px solid var(--mec);background:${on?'var(--mec)':'transparent'};color:${on?'#fff':'var(--text)'}">${txt}</button>`;
  const lbl=(_MR_AGRUP.find(a=>a.k===_mrAgrup)||{}).l;

  let h=`<div style="display:flex;flex-wrap:wrap;gap:.45rem;align-items:center;margin-bottom:.7rem">
    <span style="font-size:.62rem;color:var(--muted2);text-transform:uppercase;letter-spacing:.07em;font-weight:700">Agrupar por</span>
    ${_MR_AGRUP.map(a=>btn(_mrAgrup===a.k,a.l,`_mrSetAgrup('${a.k}')`)).join('')}
    <input id="mrQ" type="search" value="${_mrEsc(_mrQ)}" oninput="_mrBuscar(this.value)" placeholder="Buscar código, equipo, placa, proveedor, RUC…" style="flex:1 1 220px;min-width:170px;background:var(--panel2);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:.32rem .6rem;font-size:.78rem">
    <button onclick="_mrTodos(true)" style="background:transparent;border:1px solid var(--border);color:var(--muted2);border-radius:6px;padding:.28rem .6rem;font-size:.72rem;cursor:pointer">▾ Expandir todo</button>
    <button onclick="_mrTodos(false)" style="background:transparent;border:1px solid var(--border);color:var(--muted2);border-radius:6px;padding:.28rem .6rem;font-size:.72rem;cursor:pointer">▸ Contraer todo</button>
    <button onclick="exportMasterResumenXLSX()" style="background:#166534;color:#fff;border:none;border-radius:7px;padding:.36rem .9rem;font-size:.78rem;font-weight:700;cursor:pointer">📊 Excel</button>
  </div>
  <div style="font-size:.72rem;color:var(--muted2);margin-bottom:.6rem">${total} equipos en ${grupos.length} ${grupos.length===1?'grupo':'grupos'} · por ${lbl.toLowerCase()} · filtro: ${_mrEsc(typeof _mqEtiqueta==='function'?_mqEtiqueta()||'Todos':'Todos')}</div>`;

  if(!grupos.length){
    body.innerHTML=h+`<div class="card" style="padding:2rem;text-align:center;color:var(--muted2)">Ningún equipo con estos filtros.</div>`;
    return;
  }

  const TH=t=>`<th style="padding:.4rem .5rem;font-size:.62rem;color:var(--muted2);text-transform:uppercase;letter-spacing:.05em;text-align:left;white-space:nowrap;position:sticky;top:0;background:var(--panel);z-index:1">${t}</th>`;
  const THR=t=>TH(t).replace('text-align:left','text-align:right');
  const cols=[TH('Código'),TH('Equipo'),TH(_mrAgrup==='tipo'?'Subtipo':'Tipo / Subtipo'),TH('Año'),TH('Placa'),TH('Estado'),
    _mrAgrup==='proyecto'?'':TH('Proyecto'),esProv?'':TH('Proveedor'),
    THR('Hrs mín.'),THR('Tarifa'),TH('Contrato'),THR('Calent.')].filter(Boolean);
  const nCol=cols.length;
  let t=`<table style="width:100%;border-collapse:collapse;min-width:1100px;font-size:.76rem;font-variant-numeric:tabular-nums"><thead><tr>${cols.join('')}</tr></thead><tbody>`;
  grupos.forEach(G=>{
    const cerrado=_mrCerrados.has(G.k);
    const kEsc=_mrEsc(G.k).replace(/'/g,"\\'");
    const tar=G.tarifas.map(x=>(_MR_MON[x.m]||x.m)+' '+_mrNum(x.v,2)+'/'+(_MR_UN[x.u]||x.u)).join(' · ');
    const contacto=esProv?[G.ruc?'RUC '+G.ruc:'',G.ctc,G.cel,G.cor].filter(Boolean).map(_mrEsc).join(' · '):'';
    t+=`<tr onclick="_mrToggle('${kEsc}')" style="cursor:pointer;background:var(--panel2);border-top:2px solid var(--mec)">
      <td colspan="${nCol}" style="padding:.5rem .6rem">
        <div style="display:flex;flex-wrap:wrap;align-items:center;gap:.4rem .8rem">
          <span style="color:var(--mec);font-size:.8rem;width:.8rem">${cerrado?'▸':'▾'}</span>
          ${esProv&&G.logo?`<img src="${_mrEsc(G.logo)}" alt="" style="height:22px;max-width:60px;object-fit:contain;border-radius:3px;background:#fff;padding:1px">`:''}
          <span style="font-size:.86rem;font-weight:800;color:${G.sin?'var(--muted2)':'var(--text)'};text-transform:uppercase">${_mrEsc(G.nombre)}</span>
          <span style="font-size:.68rem;font-weight:800;color:var(--mec);border:1px solid var(--mec);border-radius:10px;padding:.05rem .5rem">${G.eqs.length} eq.${G.activos!==G.eqs.length?' · '+G.activos+' activos':''}</span>
          ${contacto?`<span style="font-size:.68rem;color:var(--muted2)">${contacto}</span>`:''}
          <span style="margin-left:auto;font-size:.68rem;color:var(--muted2);white-space:nowrap">${G.hmin?'Hrs mín. <b style="color:var(--text)">'+_mrNum(G.hmin)+'</b> · ':''}${tar?'tarifas <b style="color:#10b981">'+tar+'</b>':'sin tarifa'}</span>
        </div></td></tr>`;
    if(cerrado)return;
    G.eqs.forEach(e=>{
      const contrato=[_mrDMY(e.inicioContrato),_mrDMY(e.terminoContrato)].filter(Boolean).join(' → ');
      const td=(v,x)=>`<td style="padding:.32rem .5rem;border-bottom:1px solid var(--border);${x||''}">${v}</td>`;
      t+=`<tr>
        ${td(`<span class="mono" style="color:var(--mec);cursor:pointer" onclick="verEquipo(${e.id})" title="Ver ficha">${_mrEsc(e.codigo)}</span>`,'white-space:nowrap')}
        ${td(`<strong>${_mrEsc(e.nombre)}</strong>${e.marca||e.modelo?`<div style="font-size:.65rem;color:var(--muted2)">${_mrEsc([e.marca,e.modelo].filter(Boolean).join(' '))}</div>`:''}`)}
        ${td(_mrAgrup==='tipo'?_mrEsc(e.sub||'—'):`${_mrEsc(e.tipo||'—')}<div style="font-size:.65rem;color:var(--muted2)">${_mrEsc(e.sub||'')}</div>`)}
        ${td(_mrEsc(e.anio||'—'),'font-family:monospace')}
        ${td(_mrEsc(e.placa||'—'),'font-family:monospace;white-space:nowrap')}
        ${td(typeof bge==='function'?bge(e.est):_mrEsc(e.est))}
        ${_mrAgrup==='proyecto'?'':td(`<span style="font-family:monospace;font-size:.7rem;color:#a78bfa">${_mrEsc(e.proyecto||'—')}</span>`,'white-space:nowrap')}
        ${esProv?'':td(_mrEsc(e.proveedor||'—'),'font-size:.7rem')}
        ${td(+e.horasMinimas?_mrNum(e.horasMinimas):'<span style="color:var(--muted2)">—</span>','text-align:right;font-family:monospace')}
        ${td(_mrTarifa(e)||'<span style="color:var(--muted2)">—</span>','text-align:right;font-family:monospace;white-space:nowrap')}
        ${td(contrato||'<span style="color:var(--muted2)">—</span>','font-family:monospace;font-size:.7rem;white-space:nowrap')}
        ${td(+e.calentamientoH?_mrNum(e.calentamientoH,2)+' h':'<span style="color:var(--muted2)">—</span>','text-align:right;font-family:monospace')}
      </tr>`;
    });
  });
  t+='</tbody></table>';
  h+=`<div class="card" style="padding:0"><div style="overflow:auto;max-height:75vh">${t}</div></div>`;
  body.innerHTML=h;
}

// ── Excel agrupado: el grupo como fila de encabezado y sus equipos debajo ─
function exportMasterResumenXLSX(){
  if(typeof XLSX==='undefined'){alert('No se pudo cargar la librería de Excel.');return;}
  const {grupos}=_mrDatos(_mqFiltrados(),_mrAgrup,_mrQ);
  const lbl=(_MR_AGRUP.find(a=>a.k===_mrAgrup)||{}).l;
  const cab=['Código','Equipo','Marca','Modelo','Tipo','Subtipo','Año','Placa','Estado','Proyecto','Proveedor','RUC proveedor',
    'Hrs mín.','Moneda','Tarifa','Unidad','Inicio contrato','Término contrato','Calentamiento (h)'];
  const aoa=[[`Máster de Equipos — agrupado por ${lbl} · ${typeof _mqEtiqueta==='function'?_mqEtiqueta()||'Todos':'Todos'}`],[],cab];
  grupos.forEach(G=>{
    const tar=G.tarifas.map(x=>(_MR_MON[x.m]||x.m)+' '+_mrNum(x.v,2)+'/'+(_MR_UN[x.u]||x.u)).join(' · ');
    aoa.push([`${G.nombre} — ${G.eqs.length} equipos${G.ruc?' · RUC '+G.ruc:''}${G.ctc?' · '+G.ctc:''}${G.cel?' · '+G.cel:''}${tar?' · '+tar:''}`]);
    G.eqs.forEach(e=>aoa.push([e.codigo||'',e.nombre||'',e.marca||'',e.modelo||'',e.tipo||'',e.sub||'',e.anio||'',e.placa||'',e.est||'',
      e.proyecto||'',_mrValor(e,'proveedor'),e.rucProveedor||'',+e.horasMinimas||'',e.moneda||'',+e.tarifa||'',e.tarifaUn||'',
      e.inicioContrato||'',e.terminoContrato||'',+e.calentamientoH||'']));
  });
  const ws=XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols']=[{wch:14},{wch:34},{wch:14},{wch:12},{wch:15},{wch:16},{wch:6},{wch:9},{wch:12},{wch:12},{wch:30},{wch:13},
    {wch:8},{wch:9},{wch:9},{wch:7},{wch:12},{wch:12},{wch:9}];
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Por '+lbl);
  XLSX.writeFile(wb,`Master_Equipos_por_${lbl}.xlsx`);
}

// ══════════════════════════════════════════════════════════════════════════
//  Pestaña «🚦 Vencimientos»: solo las fechas de vencimiento de los 5
//  documentos, cada una con su semáforo (mismo criterio del punto del
//  Listado: rojo vencido · ámbar vence en ≤30 días · verde vigente).
//  Agrupada por tipo de equipo (o proveedor / proyecto). Las tarjetas de
//  arriba resumen cada documento y, al tocarlas, filtran por ese documento.
// ══════════════════════════════════════════════════════════════════════════
const _MV_DOCS=[
  {k:'soatVenc',l:'SOAT'},
  {k:'polizaTrecVenc',l:'Póliza de Seguros'},
  {k:'revisionTecnicaVenc',l:'Rev. Técnica'},
  {k:'ricVenc',l:'RIC'},
  {k:'gpsVenc',l:'GPS'}
];
const _MV_EST={
  venc:{l:'Vencidos',c:'#ef4444'},
  prox:{l:'Por vencer (≤30 d)',c:'#f59e0b'},
  ok:{l:'Vigentes',c:'#10b981'},
  sin:{l:'Sin fecha',c:'#64748b'}
};
const _MV_TIPOS=['Línea Amarilla','Línea Blanca','Vehículo Menor','Equipos Menores'];
let _mvAgrup='tipo';
let _mvEst='';          // '' | 'venc' | 'prox' | 'ok' | 'sin'
let _mvDoc='';          // '' = todos los documentos, o la clave de uno
let _mvQ='';

function _mvDias(f){
  if(!f)return null;
  if(typeof _vencDias==='function')return _vencDias(String(f).slice(0,10));
  return Math.round((new Date(String(f).slice(0,10)+'T12:00:00')-new Date(today()+'T12:00:00'))/864e5);
}
function _mvEstado(f){const d=_mvDias(f);return d==null?'sin':d<0?'venc':d<=30?'prox':'ok';}

// ¿El equipo entra con el estado y documento elegidos?
function _mvPasa(e,est,doc){
  if(!est)return true;
  const docs=doc?_MV_DOCS.filter(x=>x.k===doc):_MV_DOCS;
  if(est==='sin')return docs.every(x=>!e[x.k]);   // sin ninguna fecha (en lo elegido)
  return docs.some(x=>_mvEstado(e[x.k])===est);
}
// Conteos por documento y estado, sobre los equipos que dejan pasar los chips del Máster
function _mvConteos(eqs){
  const c={};
  _MV_DOCS.forEach(d=>{c[d.k]={venc:0,prox:0,ok:0,sin:0};eqs.forEach(e=>c[d.k][_mvEstado(e[d.k])]++);});
  return c;
}
function _mvGrupoDe(e,agrup){
  if(agrup==='tipo'){const t=String(e.tipo||'').trim();return t||'(Sin tipo)';}
  const v=String(e[agrup]||'').trim().replace(/\s+/g,' ');
  return v||(agrup==='proveedor'?'(Sin proveedor)':'(Sin proyecto)');
}
function _mvDatos(eqs,o){
  const qq=String(o.q||'').trim().toLowerCase();
  const lista=eqs.filter(e=>_mvPasa(e,o.est,o.doc)&&(!qq||[e.codigo,e.nombre,e.placa,e.proveedor,e.sub,e.tipo].join(' ').toLowerCase().includes(qq)));
  const g={};
  lista.forEach(e=>{const n=_mvGrupoDe(e,o.agrup),k=n.toUpperCase();(g[k]||(g[k]={k,nombre:n,eqs:[]})).eqs.push(e);});
  const ord=n=>{const i=_MV_TIPOS.indexOf(n);return o.agrup==='tipo'&&i>=0?i:n.startsWith('(Sin')?999:100;};
  const grupos=Object.values(g).sort((a,b)=>ord(a.nombre)-ord(b.nombre)||a.nombre.localeCompare(b.nombre,'es',{numeric:true}));
  grupos.forEach(G=>G.eqs.sort((a,b)=>String(a.codigo||'').localeCompare(String(b.codigo||''),'es',{numeric:true})));
  return{grupos,total:lista.length};
}

function _mvSetEst(s){_mvEst=_mvEst===s?'':s;rMasterVenc();}
function _mvSetDoc(k){_mvDoc=_mvDoc===k?'':k;rMasterVenc();}
function _mvSetAgrup(k){_mvAgrup=k;rMasterVenc();}
function _mvBuscar(v){
  _mvQ=v;rMasterVenc();
  const el=document.getElementById('mvQ');
  if(el){el.focus();el.setSelectionRange(v.length,v.length);}
}

// Celda de un documento: punto + fecha + días
function _mvCelda(f){
  if(!f)return `<span style="color:var(--muted2)">—</span>`;
  const d=_mvDias(f),s=_mvEstado(f),c=_MV_EST[s].c;
  const txt=d<0?`vencido hace ${-d} d`:d===0?'vence HOY':`en ${d} d`;
  return `<div style="display:flex;align-items:center;gap:.4rem;white-space:nowrap">
    <span style="width:10px;height:10px;border-radius:50%;background:${c};box-shadow:0 0 5px ${c};flex-shrink:0"></span>
    <div><div style="font-family:monospace;font-size:.74rem;color:${s==='ok'?'var(--text)':c};font-weight:700">${_mrDMY(f)}</div>
    <div style="font-size:.62rem;color:${s==='ok'?'var(--muted2)':c};font-weight:${s==='ok'?400:700}">${txt}</div></div></div>`;
}

function rMasterVenc(){
  _mrTabs();
  const body=document.getElementById('mqResumenBody');if(!body)return;
  const base=_mqFiltrados();
  const cnt=_mvConteos(base);
  const {grupos,total}=_mvDatos(base,{agrup:_mvAgrup,est:_mvEst,doc:_mvDoc,q:_mvQ});

  // Tarjetas por documento (borde con el color de su peor estado). Tocar una filtra por ese documento.
  const tarjeta=d=>{
    const c=cnt[d.k],act=_mvDoc===d.k;
    const col=c.venc?'#ef4444':c.prox?'#f59e0b':c.ok?'#10b981':'#64748b';
    const fila=(s,n)=>`<div style="display:flex;justify-content:space-between;font-size:.7rem"><span style="color:var(--muted2)"><i style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${_MV_EST[s].c};margin-right:4px"></i>${_MV_EST[s].l}</span><b style="color:${n&&s!=='sin'?_MV_EST[s].c:'var(--muted2)'}">${n}</b></div>`;
    return `<div onclick="_mvSetDoc('${d.k}')" title="Tocar para ver solo ${d.l}" style="cursor:pointer;flex:1 1 170px;background:${act?col+'1f':'var(--panel2)'};border:${act?2:1}px solid ${col};border-radius:9px;padding:.55rem .7rem">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.3rem"><span style="font-size:.74rem;font-weight:800;color:${col};text-transform:uppercase;letter-spacing:.04em">${d.l}</span>${act?'<span style="font-size:.66rem;color:'+col+'">✕</span>':''}</div>
      ${fila('venc',c.venc)}${fila('prox',c.prox)}${fila('ok',c.ok)}${fila('sin',c.sin)}</div>`;
  };
  const chip=(s)=>{const a=_mvEst===s,c=_MV_EST[s].c;
    return `<button onclick="_mvSetEst('${s}')" style="display:inline-flex;align-items:center;gap:.35rem;padding:.3rem .75rem;border-radius:18px;cursor:pointer;font-size:.74rem;font-weight:700;border:1.5px solid ${a?c:'var(--border)'};background:${a?c+'2e':'var(--panel2)'};color:${a?c:'var(--text)'}"><i style="width:9px;height:9px;border-radius:50%;background:${c}"></i>${_MV_EST[s].l}${a?' ✕':''}</button>`;};
  const btn=(on,txt,fn)=>`<button onclick="${fn}" style="padding:.28rem .75rem;border-radius:6px;font-size:.74rem;font-weight:700;cursor:pointer;border:1px solid var(--mec);background:${on?'var(--mec)':'transparent'};color:${on?'#fff':'var(--text)'}">${txt}</button>`;
  const docSel=_mvDoc?_MV_DOCS.find(d=>d.k===_mvDoc).l:'';

  let h=`<div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:.8rem">${_MV_DOCS.map(tarjeta).join('')}</div>
  <div style="display:flex;flex-wrap:wrap;gap:.45rem;align-items:center;margin-bottom:.6rem">
    <span style="font-size:.62rem;color:var(--muted2);text-transform:uppercase;letter-spacing:.07em;font-weight:700">Semáforo${docSel?' · '+_mrEsc(docSel):''}</span>
    ${['venc','prox','ok','sin'].map(chip).join('')}
  </div>
  <div style="display:flex;flex-wrap:wrap;gap:.45rem;align-items:center;margin-bottom:.6rem">
    <span style="font-size:.62rem;color:var(--muted2);text-transform:uppercase;letter-spacing:.07em;font-weight:700">Agrupar por</span>
    ${btn(_mvAgrup==='tipo','Tipo',"_mvSetAgrup('tipo')")}${btn(_mvAgrup==='proveedor','Proveedor',"_mvSetAgrup('proveedor')")}${btn(_mvAgrup==='proyecto','Proyecto',"_mvSetAgrup('proyecto')")}
    <input id="mvQ" type="search" value="${_mrEsc(_mvQ)}" oninput="_mvBuscar(this.value)" placeholder="Buscar código, equipo, placa, proveedor…" style="flex:1 1 220px;min-width:170px;background:var(--panel2);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:.32rem .6rem;font-size:.78rem">
    <button onclick="exportMasterVencXLSX()" style="background:#166534;color:#fff;border:none;border-radius:7px;padding:.36rem .9rem;font-size:.78rem;font-weight:700;cursor:pointer">📊 Excel</button>
  </div>
  <div style="font-size:.72rem;color:var(--muted2);margin-bottom:.6rem">${total} equipos · filtro: ${_mrEsc(typeof _mqEtiqueta==='function'?_mqEtiqueta()||'Todos':'Todos')}${_mvEst?' · '+_MV_EST[_mvEst].l.toLowerCase():''}${docSel?' en '+_mrEsc(docSel):''} · ámbar = vence en 30 días o menos</div>`;

  if(!grupos.length){
    body.innerHTML=h+`<div class="card" style="padding:2rem;text-align:center;color:var(--muted2)">Ningún equipo con estos filtros.</div>`;
    return;
  }
  const TH=(t,x)=>`<th style="padding:.4rem .5rem;font-size:.62rem;color:var(--muted2);text-transform:uppercase;letter-spacing:.05em;text-align:left;white-space:nowrap;position:sticky;top:0;background:var(--panel);z-index:1;${x||''}">${t}</th>`;
  const nCol=4+_MV_DOCS.length;
  let t=`<table style="width:100%;border-collapse:collapse;min-width:1000px;font-size:.76rem"><thead><tr>
    ${TH('Código')}${TH('Equipo')}${TH('Placa')}${TH(_mvAgrup==='tipo'?'Proveedor':'Tipo')}
    ${_MV_DOCS.map(d=>TH(d.l,_mvDoc===d.k?'color:var(--mec)':'')).join('')}</tr></thead><tbody>`;
  grupos.forEach(G=>{
    const malos=G.eqs.reduce((s,e)=>s+_MV_DOCS.filter(d=>_mvEstado(e[d.k])==='venc').length,0);
    const prox=G.eqs.reduce((s,e)=>s+_MV_DOCS.filter(d=>_mvEstado(e[d.k])==='prox').length,0);
    t+=`<tr style="background:var(--panel2);border-top:2px solid var(--mec)"><td colspan="${nCol}" style="padding:.45rem .6rem">
      <span style="font-size:.84rem;font-weight:800;color:var(--text);text-transform:uppercase">${_mrEsc(G.nombre)}</span>
      <span style="font-size:.68rem;font-weight:800;color:var(--mec);border:1px solid var(--mec);border-radius:10px;padding:.05rem .5rem;margin-left:.5rem">${G.eqs.length} eq.</span>
      ${malos?`<span style="font-size:.68rem;font-weight:800;color:#ef4444;margin-left:.6rem">● ${malos} vencido${malos>1?'s':''}</span>`:''}
      ${prox?`<span style="font-size:.68rem;font-weight:800;color:#f59e0b;margin-left:.6rem">● ${prox} por vencer</span>`:''}
    </td></tr>`;
    G.eqs.forEach(e=>{
      const td=(v,x)=>`<td style="padding:.32rem .5rem;border-bottom:1px solid var(--border);${x||''}">${v}</td>`;
      t+=`<tr>
        ${td(`<span class="mono" style="color:var(--mec);cursor:pointer" onclick="verEquipo(${e.id})" title="Ver ficha">${_mrEsc(e.codigo)}</span>`,'white-space:nowrap')}
        ${td(`<strong>${_mrEsc(e.nombre)}</strong>`)}
        ${td(_mrEsc(e.placa||'—'),'font-family:monospace;white-space:nowrap')}
        ${td(_mrEsc((_mvAgrup==='tipo'?e.proveedor:e.tipo)||'—'),'font-size:.7rem;color:var(--muted2)')}
        ${_MV_DOCS.map(d=>td(_mvCelda(e[d.k]),_mvDoc===d.k?'background:rgba(255,255,255,.03)':'')).join('')}
      </tr>`;
    });
  });
  t+='</tbody></table>';
  h+=`<div class="card" style="padding:0"><div style="overflow:auto;max-height:75vh">${t}</div></div>`;
  body.innerHTML=h;
}

function exportMasterVencXLSX(){
  if(typeof XLSX==='undefined'){alert('No se pudo cargar la librería de Excel.');return;}
  const {grupos}=_mvDatos(_mqFiltrados(),{agrup:_mvAgrup,est:_mvEst,doc:_mvDoc,q:_mvQ});
  const est=f=>{const s=_mvEstado(f);return s==='sin'?'':{venc:'VENCIDO',prox:'POR VENCER',ok:'VIGENTE'}[s];};
  const cab=['Código','Equipo','Placa','Tipo','Proveedor','Proyecto',..._MV_DOCS.flatMap(d=>[d.l,d.l+' · estado'])];
  const aoa=[[`Vencimientos de documentos — ${typeof _mqEtiqueta==='function'?_mqEtiqueta()||'Todos':'Todos'} · al ${_mrDMY(today())}`],[],cab];
  grupos.forEach(G=>{
    aoa.push([`${G.nombre} — ${G.eqs.length} equipos`]);
    G.eqs.forEach(e=>aoa.push([e.codigo||'',e.nombre||'',e.placa||'',e.tipo||'',String(e.proveedor||'').trim(),e.proyecto||'',
      ..._MV_DOCS.flatMap(d=>[e[d.k]?_mrDMY(e[d.k]):'',est(e[d.k])])]));
  });
  const ws=XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols']=[{wch:14},{wch:34},{wch:9},{wch:15},{wch:28},{wch:12},..._MV_DOCS.flatMap(()=>[{wch:11},{wch:11}])];
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Vencimientos');
  XLSX.writeFile(wb,'Vencimientos_Equipos.xlsx');
}
