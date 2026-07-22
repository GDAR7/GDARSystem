// ══ VIÁTICOS (Bienestar Social) · mismo modelo/columnas que Reembolsables/Gastos ══
let _viaFiltProv='',_viaFiltProy='',_viaQ='',_viaEditId=null;

const _viaDmy=iso=>{if(!iso||!iso.includes('-'))return iso||'';const[y,m,d]=iso.split('-');return`${d}-${m}-${y}`;};
const _viaN2=v=>Number(v||0).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});
const _viaN3=v=>Number(v||0).toLocaleString('es-PE',{minimumFractionDigits:3,maximumFractionDigits:3});

function _viaRows(){
  let rows=[...(DB.viaticos||[])].sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||'')||b.id-a.id);
  if(_viaFiltProv)rows=rows.filter(r=>r.proveedor===_viaFiltProv);
  if(_viaFiltProy)rows=rows.filter(r=>r.proyecto===_viaFiltProy);
  if(_viaQ){const q=_viaQ.toLowerCase();rows=rows.filter(r=>`${r.proveedor||''} ${r.desc||''} ${r.serie||''} ${r.correlativo||''} ${r.ruc||''} ${r.codigo||''} ${r.nombreCodif||''}`.toLowerCase().includes(q));}
  return rows;
}

function rViaticos(){
  const pg=document.getElementById('page-viaticos');if(!pg)return;
  const all=[...(DB.viaticos||[])];
  const provs=[...new Set(all.map(r=>r.proveedor).filter(Boolean))].sort();
  const proys=[...new Set(all.map(r=>r.proyecto).filter(Boolean))].sort();
  if(_viaFiltProv&&!provs.includes(_viaFiltProv))_viaFiltProv='';
  if(_viaFiltProy&&!proys.includes(_viaFiltProy))_viaFiltProy='';
  const rows=_viaRows();

  const totSin=rows.reduce((a,r)=>a+(+r.importe||0),0);
  const totCon=rows.reduce((a,r)=>a+(+r.importe||0)*1.18,0);
  const nDoc=new Set(rows.map(r=>(r.serie||'')+'-'+(r.correlativo||''))).size;
  const nProv=new Set(rows.map(r=>r.ruc||r.proveedor)).size;
  const kpis=[
    {l:'Total S/ (sin IGV)','v':'S/ '+_viaN2(totSin),c:'#10b981'},
    {l:'Total S/ (inc. IGV)','v':'S/ '+_viaN2(totCon),c:'#06b6d4'},
    {l:'Registros',v:rows.length,c:'#ec4899'},
    {l:'Docs / Proveedores',v:nDoc+' / '+nProv,c:'#8b5cf6'},
  ];

  const TDs='padding:.4rem .55rem;border-bottom:1px solid var(--border);font-size:.74rem;white-space:nowrap;vertical-align:middle';
  const THs='background:var(--panel2);color:var(--muted2);font-size:.62rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;padding:.45rem .55rem;white-space:nowrap;position:sticky;top:0;z-index:2';
  const tbody=rows.map(r=>{
    const punit=+r.precioUnit||0;
    const subTotal=+r.importe||0;
    const cUnitIgv=punit*1.18;
    const igvUnit=punit*0.18;
    const totSoles=subTotal*1.18;
    const tc=+r.tc||0;
    const factura=`${r.serie||''} - ${r.correlativo||''}`.trim();
    const totDol=tc>0?_viaN2(totSoles/tc):'—';
    const subDol=tc>0?_viaN2(subTotal/tc):'—';
    return`<tr>
      <td style="${TDs};font-family:monospace;color:var(--muted2)">${r.id}</td>
      <td style="${TDs};color:#a78bfa">${r.proyecto||'—'}</td>
      <td style="${TDs};text-align:center">${r.edp||'—'}</td>
      <td style="${TDs};font-size:.68rem">${r.moneda||'SOLES'}</td>
      <td style="${TDs};font-family:monospace">${_viaDmy(r.fecha)}</td>
      <td style="${TDs};max-width:130px;overflow:hidden;text-overflow:ellipsis" title="${(r.obs||'').replace(/"/g,'&quot;')}">${r.obs||'—'}</td>
      <td style="${TDs};text-align:center"><span class="badge b-pink" style="font-size:.62rem">${r.tipoCp||'FE'}</span></td>
      <td style="${TDs};font-family:monospace;font-weight:700">${r.serie||'—'}</td>
      <td style="${TDs};font-family:monospace">${r.correlativo||'—'}</td>
      <td style="${TDs};font-family:monospace;font-size:.68rem;color:var(--muted2)">${_viaDmy(r.fecha)}(${factura})</td>
      <td style="${TDs};font-family:monospace;font-weight:700;color:var(--bsw)">${factura}</td>
      <td style="${TDs};font-family:monospace">${r.ruc||'—'}</td>
      <td style="${TDs}">${r.proveedor||'—'}</td>
      <td style="${TDs};font-family:monospace;text-align:center">${r.codigo||'—'}</td>
      <td style="${TDs};max-width:160px;overflow:hidden;text-overflow:ellipsis" title="${(r.nombreCodif||'').replace(/"/g,'&quot;')}">${r.nombreCodif||'—'}</td>
      <td style="${TDs};font-family:monospace;text-align:center">${r.itemFac||'—'}</td>
      <td style="${TDs};max-width:220px;overflow:hidden;text-overflow:ellipsis" title="${(r.desc||'').replace(/"/g,'&quot;')}">${r.desc||''}</td>
      <td style="${TDs};text-align:right;font-family:monospace;font-weight:700">${(+r.cantidad||0).toLocaleString('es-PE')}</td>
      <td style="${TDs};text-align:center;font-size:.68rem;color:var(--muted2)">${r.unidad||'—'}</td>
      <td style="${TDs};text-align:right;font-family:monospace">S/ ${_viaN3(punit)}</td>
      <td style="${TDs};text-align:right;font-family:monospace;font-weight:700;color:#10b981">S/ ${_viaN2(subTotal)}</td>
      <td style="${TDs};text-align:right;font-family:monospace">S/ ${_viaN2(cUnitIgv)}</td>
      <td style="${TDs};text-align:right;font-family:monospace;color:#f59e0b">S/ ${_viaN2(igvUnit)}</td>
      <td style="${TDs};text-align:right;font-family:monospace;font-weight:900;color:#06b6d4">S/ ${_viaN2(totSoles)}</td>
      <td style="${TDs};text-align:right;font-family:monospace">${totDol}</td>
      <td style="${TDs};text-align:right;font-family:monospace;color:var(--muted2)">${tc>0?_viaN3(tc):'—'}</td>
      <td style="${TDs};text-align:right;font-family:monospace">${subDol}</td>
      <td style="${TDs};white-space:nowrap">
        <button onclick="_viaEdit(${r.id})" title="Editar" style="background:none;border:1px solid #f59e0b50;border-radius:5px;color:#f59e0b;cursor:pointer;font-size:.75rem;padding:.15rem .4rem;margin-right:.25rem">✏</button>
        <button class="btn btn-del btn-sm" onclick="_viaDel(${r.id})">🗑</button>
      </td>
    </tr>`;
  }).join('');

  const cols=['ID','Proyecto','EDP','Moneda','Fecha de Fact.','Observaciones','Tipo CP','Serie','Correlativo','Factura y Fecha','Factura','RUC','Proveedor','Cód. Reemb','Nombre Codif.','Ítem Fac','Descripción','Cantidad','Unidad','P. Unit s/IGV','Subtotal S/ sin IGV','Costo Unit c/IGV','IGV','Total S/ (Inc. IGV)','Total $','TC','Subtotal $ (sin IGV)'];

  pg.innerHTML=`
    <div class="ph"><div class="ph-title" style="color:var(--bsw)">🧾 Reembolsables B.S.</div><div class="ph-sub">Reembolsables de Bienestar Social: viáticos, alimentación, hospedaje y habitación</div></div>
    <div class="kpi-row">${kpis.map(k=>`<div class="kpi" style="--kc:${k.c}"><div class="kpi-lbl">${k.l}</div><div class="kpi-val" style="font-size:${k.v.toString().length>9?'1.2rem':'1.85rem'}">${k.v}</div></div>`).join('')}</div>
    <div class="card">
      <div class="card-head" style="flex-wrap:wrap;gap:.5rem">
        <span class="card-title">🧾 Registro de Reembolsables B.S.</span>
        <div style="display:flex;align-items:center;gap:.4rem;flex-wrap:wrap">
          <span style="font-size:.62rem;letter-spacing:.08em;color:var(--muted2);text-transform:uppercase">Proyecto</span>
          <select onchange="_viaFiltProy=this.value;rViaticos()" style="background:var(--panel2);border:1px solid ${_viaFiltProy?'#10b981':'var(--border)'};border-radius:6px;color:var(--text);padding:.3rem .55rem;font-size:.74rem;max-width:200px;cursor:pointer;outline:none">
            <option value="">— Todos —</option>${proys.map(p=>`<option value="${p.replace(/"/g,'&quot;')}" ${p===_viaFiltProy?'selected':''}>${p}</option>`).join('')}
          </select>
          <span style="font-size:.62rem;letter-spacing:.08em;color:var(--muted2);text-transform:uppercase">Proveedor</span>
          <select onchange="_viaFiltProv=this.value;rViaticos()" style="background:var(--panel2);border:1px solid ${_viaFiltProv?'#10b981':'var(--border)'};border-radius:6px;color:var(--text);padding:.3rem .55rem;font-size:.74rem;max-width:200px;cursor:pointer;outline:none">
            <option value="">— Todos —</option>${provs.map(p=>`<option value="${p.replace(/"/g,'&quot;')}" ${p===_viaFiltProv?'selected':''}>${p}</option>`).join('')}
          </select>
          ${(_viaFiltProv||_viaFiltProy)?`<button onclick="_viaFiltProv='';_viaFiltProy='';rViaticos()" style="background:transparent;border:1px solid var(--border);border-radius:6px;color:var(--muted2);padding:.3rem .55rem;font-size:.7rem;cursor:pointer">✕ Limpiar</button>`:''}
          <div class="search-wrap"><span>🔍</span><input class="search-input" placeholder="Buscar..." value="${_viaQ}" oninput="_viaQ=this.value;rViaticos()"></div>
          <button onclick="_viaExportXls()" style="background:#166534;border:none;border-radius:6px;color:#fff;padding:.3rem .7rem;font-size:.72rem;font-weight:700;cursor:pointer;white-space:nowrap">📊 Excel</button>
          <button class="btn btn-a" style="--ba:var(--bsw)" onclick="_viaNuevo()">＋ Nuevo Registro</button>
        </div>
      </div>
      <div class="card-body" style="padding:0"><div class="tbl-wrap" style="max-height:70vh;overflow:auto">
        <table style="min-width:100%;border-collapse:collapse">
          <thead><tr>${cols.map(c=>`<th style="${THs}">${c}</th>`).join('')}<th style="${THs}"></th></tr></thead>
          <tbody>${tbody||`<tr><td colspan="${cols.length+1}" style="text-align:center;padding:2.5rem;color:var(--muted2)">Sin reembolsables registrados. Usa <b style="color:var(--bsw)">＋ Nuevo Registro</b> para agregar.</td></tr>`}</tbody>
        </table>
      </div></div>
    </div>`;
}

// ── Nuevo / Editar ──
function _viaNuevo(){
  _viaEditId=null;
  _viaFill({fecha:today(),moneda:'SOLES',tipoCp:'FE',proyecto:(DB.proyectos&&DB.proyectos[0]?DB.proyectos[0].nombre:'')});
  document.getElementById('viaMtl').textContent='＋ Nuevo Registro';
  openM('mViatico');
}
function _viaEdit(id){
  const r=(DB.viaticos||[]).find(x=>x.id===id);if(!r)return;
  _viaEditId=id;_viaFill(r);
  document.getElementById('viaMtl').textContent='✏️ Editar Registro';
  openM('mViatico');
}
function _viaFill(r){
  if(typeof _fePopulateDatalist==='function')_fePopulateDatalist(); // reusa catálogo Cód. Reemb (R01-R18)
  // Poblar selector de Proyecto desde la base de datos de proyectos
  const proySel=document.getElementById('viaProy');
  if(proySel){
    const cur=r.proyecto||'';
    let opts='<option value="">— Seleccionar proyecto —</option>'+(DB.proyectos||[]).map(p=>`<option value="${(p.nombre||'').replace(/"/g,'&quot;')}">${p.codigo?'['+p.codigo+'] ':''}${p.nombre||''}</option>`).join('');
    if(cur&&!(DB.proyectos||[]).some(p=>(p.nombre||'')===cur))opts+=`<option value="${cur.replace(/"/g,'&quot;')}">${cur}</option>`; // conservar proyecto guardado aunque ya no esté en el catálogo
    proySel.innerHTML=opts;
  }
  const s=(id,v)=>{const el=document.getElementById(id);if(el)el.value=(v==null?'':v);};
  s('viaProy',r.proyecto);s('viaMoneda',r.moneda||'SOLES');s('viaFecha',r.fecha||today());
  s('viaTipoCp',r.tipoCp||'FE');s('viaSerie',r.serie);s('viaCorrel',r.correlativo);
  s('viaRuc',r.ruc);s('viaProv',r.proveedor);s('viaCod',r.codigo);s('viaCodif',r.nombreCodif);
  s('viaItemFac',r.itemFac);s('viaDesc',r.desc);s('viaCant',r.cantidad!=null?r.cantidad:1);
  s('viaUnd',r.unidad||'UND');s('viaPunit',r.precioUnit!=null?r.precioUnit:0);s('viaEdp',r.edp);
  s('viaTc',r.tc);s('viaObs',r.obs);
  _viaCalc();
}
function _viaCod(){
  const el=document.getElementById('viaCod'),out=document.getElementById('viaCodif');
  const v=(el.value||'').trim().toUpperCase();
  if(!v){out.value='';return;}
  const cat=(typeof _feCatalogo==='function')?_feCatalogo():[];
  let hit=cat.find(c=>(c.codigo||'').toUpperCase()===v);
  if(!hit)hit=cat.find(c=>(c.desc||'').toUpperCase().includes(v));
  if(hit){el.value=hit.codigo;out.value=hit.desc;}
}
function _viaCalc(){
  const cant=+document.getElementById('viaCant').value||0;
  const punit=+document.getElementById('viaPunit').value||0;
  const sub=cant*punit;
  document.getElementById('viaSub').textContent=`SubTotal: S/ ${sub.toFixed(2)} sin IGV · S/ ${(sub*1.18).toFixed(2)} inc. IGV`;
}
function _viaSave(){
  const g=id=>(document.getElementById(id).value||'').trim();
  const desc=g('viaDesc');
  const cant=+document.getElementById('viaCant').value||0;
  const punit=+document.getElementById('viaPunit').value||0;
  if(!desc){toast('Ingrese la descripción',true);return;}
  if(cant<=0||punit<=0){toast('Cantidad y P. Unit deben ser mayores a 0',true);return;}
  let r;
  if(_viaEditId!==null){r=(DB.viaticos||[]).find(x=>x.id===_viaEditId);if(!r)return;}
  else{r={id:nid('via')};DB.viaticos.push(r);}
  const fecha=g('viaFecha');
  r.proyecto=g('viaProy');r.moneda=g('viaMoneda');r.fecha=fecha;r.tipoCp=g('viaTipoCp');
  r.serie=g('viaSerie').toUpperCase();r.correlativo=g('viaCorrel');r.ruc=g('viaRuc');r.proveedor=g('viaProv');
  r.codigo=g('viaCod').toUpperCase();r.nombreCodif=g('viaCodif');
  r.itemFac=g('viaItemFac')||String((DB.viaticos||[]).filter(x=>x.serie===r.serie&&x.correlativo===r.correlativo).length).padStart(2,'0');
  r.desc=desc;r.cantidad=cant;r.unidad=g('viaUnd');r.precioUnit=punit;r.importe=+(cant*punit).toFixed(2);
  r.tc=+document.getElementById('viaTc').value||0;r.edp=g('viaEdp');r.obs=g('viaObs');
  syncSheet('saveViatico',r);
  closeM('mViatico');rViaticos();
  toast(_viaEditId!==null?'Registro actualizado':'Registro guardado');
}
function _viaDel(id){
  const r=(DB.viaticos||[]).find(x=>x.id===id);if(!r)return;
  if(!confirm('¿Eliminar este registro?'))return;
  DB.viaticos=DB.viaticos.filter(x=>x.id!==id);
  supaDelete('viaticos',id);
  rViaticos();toast('Registro eliminado');
}

function _viaExportXls(){
  if(typeof XLSX==='undefined'){toast('Librería Excel no disponible',true);return;}
  const rows=_viaRows();
  if(!rows.length){toast('Sin datos para exportar',true);return;}
  const aoa=[
    ['REEMBOLSABLES B.S.'+(_viaFiltProy?' — Proyecto: '+_viaFiltProy:'')+(_viaFiltProv?' — Proveedor: '+_viaFiltProv:'')],
    ['ID','PROYECTO','EDP','MONEDA','FECHA DE FACT.','OBSERVACIONES','TIPO DE CP','SERIE','CORRELATIVO','FACTURA Y FECHA','FACTURA','RUC','PROVEEDOR','CÓD. REEMB','NOMBRE CODIF.','ÍTEM FAC','DESCRIPCIÓN','CANTIDAD','UNIDAD','P. UNIT S/IGV','SUBTOTAL S/ SIN IGV','COSTO UNIT C/IGV','IGV','TOTAL S/ (INC. IGV)','TOTAL $','TC','SUBTOTAL $ (SIN IGV)'],
    ...rows.map(r=>{
      const punit=+r.precioUnit||0,subTotal=+r.importe||0,tc=+r.tc||0;
      const factura=`${r.serie||''} - ${r.correlativo||''}`.trim();
      return[r.id,r.proyecto||'',r.edp||'',r.moneda||'SOLES',_viaDmy(r.fecha),r.obs||'',r.tipoCp||'FE',
        r.serie||'',r.correlativo||'',`${_viaDmy(r.fecha)}(${factura})`,factura,r.ruc||'',r.proveedor||'',
        r.codigo||'',r.nombreCodif||'',r.itemFac||'',r.desc||'',+r.cantidad||0,r.unidad||'',
        +punit.toFixed(4),+subTotal.toFixed(2),+(punit*1.18).toFixed(2),+(punit*0.18).toFixed(2),+(subTotal*1.18).toFixed(2),
        tc>0?+(subTotal*1.18/tc).toFixed(2):'',tc>0?+tc.toFixed(3):'',tc>0?+(subTotal/tc).toFixed(2):''];
    }),
    ['','','','','','','','','','','','','','','','','TOTAL','','','',+rows.reduce((a,r)=>a+(+r.importe||0),0).toFixed(2),'','',+rows.reduce((a,r)=>a+(+r.importe||0)*1.18,0).toFixed(2),'','','']
  ];
  const ws=XLSX.utils.aoa_to_sheet(aoa);
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'ReembolsablesBS');
  XLSX.writeFile(wb,'reembolsables_bs.xlsx');
}
