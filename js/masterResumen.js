// ══════════════════════════════════════════════════════════════════════════
//  MÁSTER DE EQUIPOS · pestaña «Resumen agrupado»
//  Tabla detallada con los equipos agrupados por Proveedor (por defecto),
//  Tipo, Subtipo o Proyecto: el grupo va de encabezado y sus equipos debajo.
//  Muestra Hrs mín. del proveedor, Hrs mín. venta del cliente, tarifa con su
//  moneda y unidad, contrato y calentamiento.
//  Respeta los filtros de arriba del Máster (Proyecto, Estado, Condición…).
// ══════════════════════════════════════════════════════════════════════════

let _mrVista='lista';          // 'lista' (tabla de siempre) | 'resumen'
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
    G.hminV=G.eqs.reduce((s,e)=>s+(+e.hrsMinVenta||0),0);
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
  el.innerHTML=b('lista','📋 Listado')+b('resumen','🗂️ Resumen agrupado');
  const pl=document.getElementById('mqPanelLista'),pr=document.getElementById('mqPanelResumen');
  if(pl)pl.style.display=_mrVista==='lista'?'':'none';
  if(pr)pr.style.display=_mrVista==='resumen'?'':'none';
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
    THR('Hrs mín.'),THR('Hrs mín. venta'),THR('Tarifa'),TH('Contrato'),THR('Calent.')].filter(Boolean);
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
          <span style="margin-left:auto;font-size:.68rem;color:var(--muted2);white-space:nowrap">${G.hmin?'Hrs mín. <b style="color:var(--text)">'+_mrNum(G.hmin)+'</b> · ':''}${G.hminV?'venta <b style="color:var(--text)">'+_mrNum(G.hminV)+'</b> · ':''}${tar?'tarifas <b style="color:#10b981">'+tar+'</b>':'sin tarifa'}</span>
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
        ${td(+e.hrsMinVenta?_mrNum(e.hrsMinVenta):'<span style="color:var(--muted2)">—</span>','text-align:right;font-family:monospace')}
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
    'Hrs mín.','Hrs mín. venta','Moneda','Tarifa','Unidad','Inicio contrato','Término contrato','Calentamiento (h)'];
  const aoa=[[`Máster de Equipos — agrupado por ${lbl} · ${typeof _mqEtiqueta==='function'?_mqEtiqueta()||'Todos':'Todos'}`],[],cab];
  grupos.forEach(G=>{
    const tar=G.tarifas.map(x=>(_MR_MON[x.m]||x.m)+' '+_mrNum(x.v,2)+'/'+(_MR_UN[x.u]||x.u)).join(' · ');
    aoa.push([`${G.nombre} — ${G.eqs.length} equipos${G.ruc?' · RUC '+G.ruc:''}${G.ctc?' · '+G.ctc:''}${G.cel?' · '+G.cel:''}${tar?' · '+tar:''}`]);
    G.eqs.forEach(e=>aoa.push([e.codigo||'',e.nombre||'',e.marca||'',e.modelo||'',e.tipo||'',e.sub||'',e.anio||'',e.placa||'',e.est||'',
      e.proyecto||'',_mrValor(e,'proveedor'),e.rucProveedor||'',+e.horasMinimas||'',+e.hrsMinVenta||'',e.moneda||'',+e.tarifa||'',e.tarifaUn||'',
      e.inicioContrato||'',e.terminoContrato||'',+e.calentamientoH||'']));
  });
  const ws=XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols']=[{wch:14},{wch:34},{wch:14},{wch:12},{wch:15},{wch:16},{wch:6},{wch:9},{wch:12},{wch:12},{wch:30},{wch:13},
    {wch:8},{wch:10},{wch:9},{wch:9},{wch:7},{wch:12},{wch:12},{wch:9}];
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Por '+lbl);
  XLSX.writeFile(wb,`Master_Equipos_por_${lbl}.xlsx`);
}
