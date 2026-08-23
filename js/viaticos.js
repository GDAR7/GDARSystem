// ══ VIÁTICOS (Bienestar Social) · mismo modelo/columnas que Reembolsables/Gastos ══
let _viaFiltProv='',_viaFiltProy='',_viaFiltCod='',_viaQ='',_viaEditId=null;
const _VIA_BUCKET='Reembolsables_BS_pdf'; // bucket de Supabase Storage para los PDF
function _viaStoragePath(url){
  if(!url)return null;
  const marker='/object/public/'+_VIA_BUCKET+'/';
  const i=url.indexOf(marker);
  return i!==-1?decodeURIComponent(url.slice(i+marker.length)):null;
}

const _viaDmy=iso=>{if(!iso||!iso.includes('-'))return iso||'';const[y,m,d]=iso.split('-');return`${d}-${m}-${y}`;};
const _viaN2=v=>Number(v||0).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});
const _viaN3=v=>Number(v||0).toLocaleString('es-PE',{minimumFractionDigits:3,maximumFractionDigits:3});

function _viaRows(){
  let rows=[...(DB.viaticos||[])].sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||'')||b.id-a.id);
  if(_viaFiltProv)rows=rows.filter(r=>r.proveedor===_viaFiltProv);
  if(_viaFiltProy)rows=rows.filter(r=>r.proyecto===_viaFiltProy);
  if(_viaFiltCod)rows=rows.filter(r=>(r.codigo||'')===_viaFiltCod);
  if(_viaQ){const q=_viaQ.toLowerCase();rows=rows.filter(r=>`${r.proveedor||''} ${r.desc||''} ${r.serie||''} ${r.correlativo||''} ${r.ruc||''} ${r.codigo||''} ${r.nombreCodif||''}`.toLowerCase().includes(q));}
  return rows;
}

function rViaticos(){
  const pg=document.getElementById('page-viaticos');if(!pg)return;
  const all=[...(DB.viaticos||[])];
  const provs=[...new Set(all.map(r=>r.proveedor).filter(Boolean))].sort();
  const proys=[...new Set(all.map(r=>r.proyecto).filter(Boolean))].sort();
  const codMap={};all.forEach(r=>{if(r.codigo&&!codMap[r.codigo])codMap[r.codigo]=r.nombreCodif||'';});
  const cods=Object.keys(codMap).sort();
  if(_viaFiltProv&&!provs.includes(_viaFiltProv))_viaFiltProv='';
  if(_viaFiltProy&&!proys.includes(_viaFiltProy))_viaFiltProy='';
  if(_viaFiltCod&&!cods.includes(_viaFiltCod))_viaFiltCod='';
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
      <td style="${TDs};text-align:center">${r.pdfUrl?`<a href="${r.pdfUrl}" target="_blank" rel="noopener" title="Ver PDF: ${(r.pdfName||'comprobante').replace(/"/g,'&quot;')}" style="text-decoration:none;font-size:1rem">📄</a>`:'<span style="color:var(--muted)">—</span>'}</td>
      <td style="${TDs};white-space:nowrap">
        <button onclick="_viaEdit(${r.id})" title="Editar" style="background:none;border:1px solid #f59e0b50;border-radius:5px;color:#f59e0b;cursor:pointer;font-size:.75rem;padding:.15rem .4rem;margin-right:.25rem">✏</button>
        <button class="btn btn-del btn-sm" onclick="_viaDel(${r.id})">🗑</button>
      </td>
    </tr>`;
  }).join('');

  const cols=['ID','Proyecto','EDP','Moneda','Fecha de Fact.','Observaciones','Tipo CP','Serie','Correlativo','Factura y Fecha','Factura','RUC','Proveedor','Cód. Reemb','Nombre Codif.','Ítem Fac','Descripción','Cantidad','Unidad','P. Unit s/IGV','Subtotal S/ sin IGV','Costo Unit c/IGV','IGV','Total S/ (Inc. IGV)','Total $','TC','Subtotal $ (sin IGV)','PDF'];

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
          <span style="font-size:.62rem;letter-spacing:.08em;color:var(--muted2);text-transform:uppercase">Cód. Reemb</span>
          <select onchange="_viaFiltCod=this.value;rViaticos()" style="background:var(--panel2);border:1px solid ${_viaFiltCod?'#10b981':'var(--border)'};border-radius:6px;color:var(--text);padding:.3rem .55rem;font-size:.74rem;max-width:200px;cursor:pointer;outline:none;font-family:monospace">
            <option value="">— Todos —</option>${cods.map(c=>`<option value="${c.replace(/"/g,'&quot;')}" ${c===_viaFiltCod?'selected':''}>${c}${codMap[c]?' — '+codMap[c]:''}</option>`).join('')}
          </select>
          <span style="font-size:.62rem;letter-spacing:.08em;color:var(--muted2);text-transform:uppercase">Proveedor</span>
          <select onchange="_viaFiltProv=this.value;rViaticos()" style="background:var(--panel2);border:1px solid ${_viaFiltProv?'#10b981':'var(--border)'};border-radius:6px;color:var(--text);padding:.3rem .55rem;font-size:.74rem;max-width:200px;cursor:pointer;outline:none">
            <option value="">— Todos —</option>${provs.map(p=>`<option value="${p.replace(/"/g,'&quot;')}" ${p===_viaFiltProv?'selected':''}>${p}</option>`).join('')}
          </select>
          ${(_viaFiltProv||_viaFiltProy||_viaFiltCod)?`<button onclick="_viaFiltProv='';_viaFiltProy='';_viaFiltCod='';rViaticos()" style="background:transparent;border:1px solid var(--border);border-radius:6px;color:var(--muted2);padding:.3rem .55rem;font-size:.7rem;cursor:pointer">✕ Limpiar</button>`:''}
          <div class="search-wrap"><span>🔍</span><input class="search-input" placeholder="Buscar..." value="${_viaQ}" oninput="_viaQ=this.value;rViaticos()"></div>
          <button onclick="_viaPrintDetalle()" style="background:transparent;border:1px solid #ef444460;border-radius:6px;color:#ef4444;padding:.3rem .7rem;font-size:.72rem;font-weight:700;cursor:pointer;white-space:nowrap" title="Imprime el detalle agrupado Código → Proveedor → Factura, respetando los filtros activos">🖨 PDF</button>
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
// Mapa proveedor→RUC construido de los registros ya guardados (para autocompletar)
function _viaProvMap(){
  const map={};
  (DB.viaticos||[]).forEach(r=>{if(r.proveedor&&map[r.proveedor]==null)map[r.proveedor]=r.ruc||'';});
  return map;
}
function _viaPopulateProvList(){
  const dl=document.getElementById('dlViaProv');if(!dl)return;
  const map=_viaProvMap();
  dl.innerHTML=Object.keys(map).sort().map(p=>`<option value="${p.replace(/"/g,'&quot;')}">`).join('');
}
// Al elegir/escribir un proveedor ya registrado, autocompleta su RUC
function _viaProvPick(){
  const v=(document.getElementById('viaProv').value||'').trim();
  const map=_viaProvMap();
  if(map[v])document.getElementById('viaRuc').value=map[v];
}
function _viaFill(r){
  if(typeof _fePopulateDatalist==='function')_fePopulateDatalist(); // reusa catálogo Cód. Reemb (R01-R18)
  _viaPopulateProvList(); // buscador de proveedores ya registrados (autocompleta RUC)
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
  // PDF: limpiar el input de archivo y mostrar el estado del PDF actual
  const fi=document.getElementById('viaPdf');if(fi)fi.value='';
  const pi=document.getElementById('viaPdfActual');
  if(pi)pi.innerHTML=r.pdfUrl?`<a href="${r.pdfUrl}" target="_blank" rel="noopener" style="color:var(--bsw)">📄 Ver PDF actual</a> <span style="color:var(--muted2)">· sube otro para reemplazarlo</span>`:'<span style="color:var(--muted2)">Sin PDF adjunto</span>';
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
async function _viaSave(){
  const g=id=>(document.getElementById(id).value||'').trim();
  const desc=g('viaDesc');
  const cant=+document.getElementById('viaCant').value||0;
  const punit=+document.getElementById('viaPunit').value||0;
  if(!desc){toast('Ingrese la descripción',true);return;}
  if(cant<=0||punit<=0){toast('Cantidad y P. Unit deben ser mayores a 0',true);return;}
  const editing=_viaEditId!==null;
  const existing=editing?(DB.viaticos||[]).find(x=>x.id===_viaEditId):null;
  if(editing&&!existing)return;
  // Subir PDF (si se eligió uno) antes de guardar el registro
  const file=document.getElementById('viaPdf')?.files[0];
  let pdfUrl=null,pdfName=null;
  if(file){
    if(existing){const _old=_viaStoragePath(existing.pdfUrl);if(_old)await supa.storage.from(_VIA_BUCKET).remove([_old]);}
    toast('Subiendo PDF...');
    const ext=(file.name.split('.').pop()||'pdf').toLowerCase();
    const path=((g('viaSerie')+'_'+g('viaCorrel')+'_'+Date.now())||'reemb').replace(/[^a-zA-Z0-9_-]/g,'_')+'.'+ext;
    const{error:upErr}=await supa.storage.from(_VIA_BUCKET).upload(path,file,{upsert:true});
    if(upErr){toast('Error al subir PDF: '+upErr.message,true);return;}
    const{data:urlData}=supa.storage.from(_VIA_BUCKET).getPublicUrl(path);
    pdfUrl=urlData.publicUrl;pdfName=file.name;
  }
  const r=editing?existing:{id:nidSeguro('via','viaticos')};
  if(!editing)DB.viaticos.push(r);
  r.proyecto=g('viaProy');r.moneda=g('viaMoneda');r.fecha=g('viaFecha');r.tipoCp=g('viaTipoCp');
  r.serie=g('viaSerie').toUpperCase();r.correlativo=g('viaCorrel');r.ruc=g('viaRuc');r.proveedor=g('viaProv');
  r.codigo=g('viaCod').toUpperCase();r.nombreCodif=g('viaCodif');
  r.itemFac=g('viaItemFac')||String((DB.viaticos||[]).filter(x=>x.serie===r.serie&&x.correlativo===r.correlativo).length).padStart(2,'0');
  r.desc=desc;r.cantidad=cant;r.unidad=g('viaUnd');r.precioUnit=punit;r.importe=+(cant*punit).toFixed(2);
  r.tc=+document.getElementById('viaTc').value||0;r.edp=g('viaEdp');r.obs=g('viaObs');
  if(pdfUrl){r.pdfUrl=pdfUrl;r.pdfName=pdfName;}
  syncSheet('saveViatico',r);
  closeM('mViatico');rViaticos();
  toast(editing?'Registro actualizado':'Registro guardado');
}
async function _viaDel(id){
  const r=(DB.viaticos||[]).find(x=>x.id===id);if(!r)return;
  if(!confirm('¿Eliminar este registro?'+(r.pdfUrl?'\n\nTambién se eliminará su PDF adjunto.':'')))return;
  const _p=_viaStoragePath(r.pdfUrl);
  if(_p){try{await supa.storage.from(_VIA_BUCKET).remove([_p]);}catch(e){}}
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

// ── PDF: Detalle de Reembolsables, agrupado Código → Proveedor → Factura (respeta los filtros activos) ──
function _viaPrintDetalle(){
  const rows=_viaRows();
  if(!rows.length){toast('No hay registros para imprimir con los filtros actuales',true);return;}

  // Agrupar: código → proveedor → factura (serie-correlativo+fecha) → ítems
  const byCod={};
  rows.forEach(r=>{
    const cod=r.codigo||'(Sin código)';
    if(!byCod[cod])byCod[cod]={nombre:r.nombreCodif||'',total:0,provs:{}};
    const g=byCod[cod];g.total+=+r.importe||0;
    if(!g.nombre&&r.nombreCodif)g.nombre=r.nombreCodif;
    const prov=r.proveedor||'(Sin proveedor)';
    if(!g.provs[prov])g.provs[prov]={total:0,facts:{}};
    const gp=g.provs[prov];gp.total+=+r.importe||0;
    const fk=(r.serie||'')+' - '+(r.correlativo||'');
    if(!gp.facts[fk])gp.facts[fk]={fecha:r.fecha||'',total:0,items:[]};
    const gf=gp.facts[fk];gf.total+=+r.importe||0;gf.items.push(r);
  });
  const codsOrd=Object.keys(byCod).sort();

  const AZ='#1e3a5f';
  const TH=`background:${AZ};color:#fff;padding:4px 6px;font-size:8.5px;text-transform:uppercase;letter-spacing:.02em`;
  const TD='border:1px solid #cbd5e1;padding:2px 6px;font-size:9px;vertical-align:middle';
  // Fila con las 7 columnas reales (Código · Proveedor · Factura y Fecha · Descripción · Cantidad · P.Unit · SubTotal)
  const fila=(cod,prov,fact,desc,cant,punit,tot,estilo)=>`<tr style="${estilo||''}">
    <td style="${TD}">${cod||''}</td>
    <td style="${TD}">${prov||''}</td>
    <td style="${TD}">${fact||''}</td>
    <td style="${TD}">${desc||''}</td>
    <td style="${TD};text-align:center">${cant||''}</td>
    <td style="${TD};text-align:right">${punit||''}</td>
    <td style="${TD};text-align:right">${tot}</td>
  </tr>`;
  let body='';
  codsOrd.forEach(cod=>{
    const g=byCod[cod];
    body+=fila(cod,'','','','','',`<b style="color:${AZ}">S/ ${_viaN2(g.total)}</b>`,`background:#c7d2e0;font-weight:900;color:${AZ}`);
    const provsOrd=Object.keys(g.provs).sort();
    provsOrd.forEach(prov=>{
      const gp=g.provs[prov];
      body+=fila('',prov,'','','','',`<b>S/ ${_viaN2(gp.total)}</b>`,'font-weight:700');
      const factsOrd=Object.keys(gp.facts).sort((a,b)=>(gp.facts[a].fecha||'').localeCompare(gp.facts[b].fecha||''));
      factsOrd.forEach(fk=>{
        const gf=gp.facts[fk];
        body+=fila('','',_viaDmy(gf.fecha)+' // '+fk,'','','',`S/ ${_viaN2(gf.total)}`,'color:#334155');
        gf.items.forEach(it=>{
          body+=fila('','','',it.desc||'',(+it.cantidad||0).toLocaleString('es-PE'),'S/ '+_viaN2(it.precioUnit),`<b>S/ ${_viaN2(it.importe)}</b>`);
        });
      });
    });
  });
  const totGen=rows.reduce((s,r)=>s+(+r.importe||0),0);
  const subtitulo=_viaFiltCod
    ?`${_viaFiltCod}${byCod[_viaFiltCod]&&byCod[_viaFiltCod].nombre?' - '+byCod[_viaFiltCod].nombre.toUpperCase():''}`
    :(codsOrd.length===1?codsOrd[0]:'TODOS LOS CÓDIGOS');
  const _logoUrl=window.location.href.replace(/[^\/\\]+$/,'')+'09.-ERP/Imagenes/ECOSERMO-LOGO.png';

  const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Detalle de Reembolsables</title>
  <style>@page{size:A4 landscape;margin:1cm}*{box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
  body{font-family:Arial,sans-serif;font-size:9px;color:#111;margin:0}
  table{width:100%;border-collapse:collapse}
  tr{page-break-inside:avoid}</style></head><body>
  <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid ${AZ};padding-bottom:6px;margin-bottom:6px">
    <img src="${_logoUrl}" style="height:44px;object-fit:contain">
    <div style="text-align:center;flex:1">
      <div style="font-size:14px;font-weight:900;color:${AZ};letter-spacing:.03em">DETALLE DE REEMBOLSABLES</div>
      <div style="font-size:10px;font-weight:800;color:#b91c1c;margin-top:2px">${subtitulo}</div>
    </div>
    <div style="text-align:right;font-size:16px;font-weight:900;color:${AZ};letter-spacing:.02em">BUENAVENTURA</div>
  </div>
  <table>
    <thead><tr>
      <th style="${TH};text-align:left">Código</th>
      <th style="${TH};text-align:left">Proveedor</th>
      <th style="${TH};text-align:left">Factura y Fecha</th>
      <th style="${TH};text-align:left">Descripción</th>
      <th style="${TH};text-align:center">Cantidad</th>
      <th style="${TH};text-align:right">Precio Unit. S/IGV</th>
      <th style="${TH};text-align:right">SubTotal S/. sin IGV</th>
    </tr></thead>
    <tbody>${body}</tbody>
    <tfoot><tr><td style="${TD};background:#dbeafe;font-weight:900" colspan="6">TOTAL GENERAL</td><td style="${TD};background:#dbeafe;font-weight:900;text-align:right;color:${AZ}">S/ ${_viaN2(totGen)}</td></tr></tfoot>
  </table>
  <div style="margin-top:10px;font-size:7.5px;color:#64748b">${(_viaFiltProy?'Proyecto: '+_viaFiltProy+' · ':'')}${(_viaFiltProv?'Proveedor: '+_viaFiltProv+' · ':'')}Emitido: ${new Date().toLocaleDateString('es-PE')}</div>
  </body></html>`;
  const win=window.open('','_blank');
  if(!win){toast('Active ventanas emergentes para imprimir',true);return;}
  win.document.write(html);win.document.close();win.focus();
  setTimeout(()=>win.print(),400);
}
