// ══ VALORIZACIONES / EDP ══
const _VENTA_BUCKET='Ventas_EDP_pdf';
let _ventaEditId=null;
let _vtUploadId=null;
let _vtUploadField=null;
let _valorizSort={col:'fecha',dir:-1};
let _vtHesData={};

// ── PDF.js config ──
if(typeof pdfjsLib!=='undefined'){
  pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// ── Extrae todo el texto de un PDF (PDF.js) ──
async function _vtExtractPdfText(file){
  if(typeof pdfjsLib==='undefined')return null;
  const buf=await file.arrayBuffer();
  const pdf=await pdfjsLib.getDocument({data:buf}).promise;
  let full='';
  for(let i=1;i<=pdf.numPages;i++){
    const page=await pdf.getPage(i);
    const tc=await page.getTextContent();
    full+=tc.items.map(it=>it.str).join(' ')+'\n';
  }
  return full;
}

// ── Parsea el texto extraído de una HES SAP ──
function _vtParseHes(text){
  const t=text||'';
  const result={};

  // N° HES — número largo que aparece en el encabezado (SAP genera ~10 dígitos)
  const mHes=t.match(/Hoja\s+de\s+entrada\s+de\s+servicios\s+(\d{6,12})/i)
    ||t.match(/N[°º\.]?\s*HES[:\s]+(\d{6,12})/i)
    ||t.match(/Número\s+de\s+documento[:\s]+(\d{6,12})/i)
    // fallback: primer número largo tras "entrada de servicios"
    ||t.match(/entrada\s+de\s+servicios[\s\S]{0,60}?(\d{9,12})/i);
  if(mHes)result.hesNum=mHes[1];

  // Fecha — formato dd/mm/yyyy o dd.mm.yyyy
  const mFecha=t.match(/Fecha\s*[:\s]+(\d{2}[\/\.]\d{2}[\/\.]\d{4})/i)
    ||t.match(/(\d{2}[\/\.]\d{2}[\/\.]\d{4})/);
  if(mFecha)result.hesFecha=mFecha[1].replace(/\./g,'/');

  // Orden de Compra
  const mOC=t.match(/Orden\s+de\s+(?:Compra|compra|servicio)[:\s]+(\d{6,12})/i)
    ||t.match(/O\.C[.\s]+(\d{6,12})/i)
    ||t.match(/Pedido[:\s]+(\d{6,12})/i);
  if(mOC)result.hesOc=mOC[1];

  // Total Valor Aceptado (puede tener puntos o comas como separador)
  const mMonto=t.match(/Total\s+Valor\s+Aceptado[:\s]+([\d\.,]+)/i)
    ||t.match(/Valor\s+Aceptado[:\s]+([\d\.,]+)/i)
    ||t.match(/Importe[:\s]+([\d\.,]+)/i);
  if(mMonto){
    const raw=mMonto[1].replace(/\s/g,'');
    // SAP usa punto como separador de miles y coma decimal (o viceversa según locale)
    // Detectamos: si termina en ,XX → coma es decimal
    const numStr=raw.includes(',')&&/,\d{1,2}$/.test(raw)
      ?raw.replace(/\./g,'').replace(',','.')
      :raw.replace(/,/g,'');
    result.hesMonto=parseFloat(numStr)||0;
  }

  // Período — "26.03.2026 - 20.04.2026" en columna "Periodo de prestación"
  const mPer=t.match(/(?:Per[ií]odo\s+de\s+prestaci[oó]n|Per[ií]odo|Periodo|Período)[:\s]+(\d{2}[\/\.]\d{2}[\/\.]\d{4})\s*[-–]\s*(\d{2}[\/\.]\d{2}[\/\.]\d{4})/i)
    ||t.match(/(\d{2}\.\d{2}\.\d{4})\s*[-–]\s*(\d{2}\.\d{2}\.\d{4})/);
  if(mPer)result.hesPeriodo=mPer[1].replace(/\./g,'/')+' – '+mPer[2].replace(/\./g,'/');

  // Texto de cabecera — captura toda la línea y elimina campos SAP que PDF.js concatena al final
  const mCab=t.match(/Texto\s+de\s+cabecera\s+(.+)/i);
  if(mCab){
    let cab=mCab[1]
      .replace(/\s+RUC\b.*/i,'')
      .replace(/\s+Tel[eé]fono.*/i,'')
      .replace(/\s+Orden\s+de\s+.*/i,'')
      .replace(/\s+Moneda\s+.*/i,'')
      .replace(/\s+Proveedor\s+.*/i,'')
      .replace(/\s+Cond\.\s+.*/i,'')
      .replace(/\s+N[°o]\s+pos.*/i,'')
      .replace(/\s+\d{8,}.*/,'');   // corta si queda un número largo (RUC, etc.)
    result.hesTextoCabecera=cab.trim();
  }

  // Moneda
  const mMon=t.match(/Moneda\s+([A-Z]{3})\b/i);
  if(mMon)result.hesMoneda=mMon[1].toUpperCase();

  // Cant. Pedida — primer número grande en la fila de datos (columna Cant. Pedida)
  const mCant=t.match(/Cant(?:idad)?\.?\s+Pedida[\s\S]{0,200}?\b(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{3}))\b/i)
    ||t.match(/GLB\s+([\d,\.]+)\s+[\d,\.]+/i);
  if(mCant){
    const raw=mCant[1].replace(/\s/g,'');
    const numStr=raw.includes(',')&&/,\d{3}$/.test(raw)
      ?raw.replace(/,/g,'')
      :/,\d{1,2}$/.test(raw)?raw.replace(/\./g,'').replace(',','.')
      :raw.replace(/,/g,'');
    result.hesCantPedida=parseFloat(numStr)||0;
  }

  return result;
}

// ── Muestra el panel de datos extraídos en el modal ──
function _vtShowHesPanel(data){
  const panel=document.getElementById('vtHesPanel');
  const fields=document.getElementById('vtHesFields');
  const spin=document.getElementById('vtHesSpinner');
  if(!panel||!fields)return;
  if(spin)spin.style.display='none';
  const rows=[
    {l:'N° HES',v:data.hesNum||'—',c:'#f59e0b'},
    {l:'Fecha',v:data.hesFecha||'—'},
    {l:'Orden de Compra',v:data.hesOc||'—'},
    {l:'Moneda',v:data.hesMoneda||'—'},
    {l:'Monto Aceptado',v:data.hesMonto?fmt(data.hesMonto):'—',c:'#10b981'},
    {l:'Cant. Pedida',v:data.hesCantPedida?fmt(data.hesCantPedida):'—'},
    {l:'Período',v:data.hesPeriodo||'—',span:2},
    {l:'Texto de Cabecera',v:data.hesTextoCabecera||'—',span:2,c:'#a78bfa'},
  ];
  fields.innerHTML=rows.map(r=>`
    <div${r.span?` style="grid-column:span ${r.span}"`:''}>
      <div style="font-size:.63rem;color:var(--muted2);text-transform:uppercase;letter-spacing:.05em">${r.l}</div>
      <div style="font-weight:700;color:${r.c||'var(--text)'};">${r.v}</div>
    </div>`).join('');
  panel.style.display='block';
}

function _vtPdfLink(url,color){
  if(!url)return'<span style="color:var(--muted);font-size:.7rem">—</span>';
  return`<a href="${url}" target="_blank" class="btn btn-sm btn-out" style="font-size:.63rem;padding:2px 8px;color:${color};border-color:${color}60">📄 Ver</a>`;
}
function _vtUploadBtn(ventaId,field,color,label){
  return`<button onclick="openValorizUpload(${ventaId},'${field}')" class="btn btn-sm btn-out" style="font-size:.63rem;padding:2px 8px;color:${color};border-color:${color}40;opacity:.75">📤 ${label}</button>`;
}

function _vtSortBy(col){
  if(_valorizSort.col===col)_valorizSort.dir*=-1;
  else{_valorizSort.col=col;_valorizSort.dir=-1;}
  rValorizaciones();
}

function rValorizaciones(){
  const canEdit=CU&&(CU.areas||[]).includes('costControl');
  const rows=DB.ventas||[];
  const totalMonto=rows.reduce((a,v)=>a+(+v.montoTotal||0),0);
  const kpis=[
    {l:'Total Valorizaciones',v:rows.length,c:'#059669'},
    {l:'Monto Total S/.',v:fmt(totalMonto),c:'#10b981'},
    {l:'Con HES',v:rows.filter(v=>v.hesUrl).length,c:'#f59e0b'},
    {l:'Pendiente de HES',v:rows.filter(v=>!v.hesUrl).length,c:'#ef4444'},
    {l:'Con Factura',v:rows.filter(v=>v.facturaUrl).length,c:'#a78bfa'},
  ];
  const kpiEl=document.getElementById('valorizKpis');
  if(kpiEl)kpiEl.innerHTML=kpis.map(k=>`<div class="kpi" style="--kc:${k.c}"><div class="kpi-lbl">${k.l}</div><div class="kpi-val">${k.v}</div></div>`).join('');

  const {col,dir}=_valorizSort;
  const sorted=[...rows].sort((a,b)=>{
    let va=a[col]||'', vb=b[col]||'';
    if(col==='montoTotal'){va=+a.montoTotal||0;vb=+b.montoTotal||0;return(va-vb)*dir;}
    return va.toString().localeCompare(vb.toString())*dir;
  });

  const thStyle=`cursor:pointer;user-select:none;white-space:nowrap`;
  const arrow=c=>_valorizSort.col===c?(_valorizSort.dir===1?' ▲':' ▼'):'';

  const tb=document.getElementById('tbValorizaciones');
  if(!tb)return;

  const thead=tb.closest('table')?.querySelector('thead tr');
  if(thead){
    thead.innerHTML=`
      <th style="${thStyle}" onclick="_vtSortBy('fecha')">Fecha${arrow('fecha')}</th>
      <th>EDP N°</th>
      <th>Proyecto</th>
      <th>Código</th>
      <th style="${thStyle}" onclick="_vtSortBy('valorizacionMes')">Mes${arrow('valorizacionMes')}</th>
      <th class="tr" style="${thStyle}" onclick="_vtSortBy('montoTotal')">Monto S/.${arrow('montoTotal')}</th>
      <th>Valoriz.</th><th>HES</th><th>Factura</th><th>Obs.</th>
      ${canEdit?'<th></th>':''}`;
  }

  tb.innerHTML=sorted.map(v=>{
    const hesCell=v.hesUrl
      ?`<div style="display:flex;flex-direction:column;gap:2px;align-items:center">
          ${_vtPdfLink(v.hesUrl,'#f59e0b')}
          ${v.hesNum?`<span style="font-size:.6rem;color:#f59e0b;font-family:monospace">${v.hesNum}</span>`:''}
        </div>`
      :_vtUploadBtn(v.id,'hes','#f59e0b','HES');
    return`<tr>
      <td class="mono">${v.fecha||'—'}</td>
      <td><span class="badge b-green" style="font-size:.63rem">${v.edpNum||'—'}</span></td>
      <td><strong style="font-size:.82rem">${v.nombre||'—'}</strong></td>
      <td class="mono" style="color:#a78bfa;font-size:.75rem">${v.codigo||'—'}</td>
      <td style="font-size:.76rem">${v.valorizacionMes||'—'}</td>
      <td class="tr mono" style="color:#10b981">${fmt(v.montoTotal||0)}</td>
      <td style="text-align:center">${_vtPdfLink(v.pdfUrl,'#10b981')}</td>
      <td style="text-align:center">${hesCell}</td>
      <td style="text-align:center">${v.facturaUrl?_vtPdfLink(v.facturaUrl,'#a78bfa'):_vtUploadBtn(v.id,'factura','#a78bfa','Fact.')}</td>
      <td style="font-size:.71rem;color:var(--muted2);max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${v.observaciones||''}">${v.observaciones||'—'}</td>
      ${canEdit?`<td style="display:flex;gap:.3rem">
        <button class="btn btn-out btn-sm" onclick="openValorizEdit(${v.id})" style="color:#f59e0b;border-color:#f59e0b60" title="Editar">✏️</button>
        <button class="btn btn-del btn-sm" onclick="del('ventas',${v.id})" title="Eliminar">🗑</button>
      </td>`:''}
    </tr>`;
  }).join('');

  const srch=document.getElementById('valorizSearch');
  if(srch&&srch.value)flt(srch,'tbValorizaciones');
}

function _vtFillProySelect(selectedCod){
  const sel=document.getElementById('vtProy');if(!sel)return;
  sel.innerHTML='<option value="">— Seleccionar proyecto —</option>'
    +(DB.proyectos||[]).map(p=>`<option value="${p.codigo}" data-nombre="${p.nombre}">[${p.codigo}] ${p.nombre}</option>`).join('');
  if(selectedCod)sel.value=selectedCod;
}

function _vtClearForm(){
  document.getElementById('vtFecha').value=today();
  ['vtEdp','vtMes','vtObs'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('vtMonto').value='';
  document.getElementById('vtPdf').value='';
  document.getElementById('vtPdfPreview').textContent='';
  document.getElementById('vtPdfActual').style.display='none';
}

function openValorizNew(){
  _ventaEditId=null;
  document.querySelector('#mVenta .mttl').textContent='Nueva Valorización';
  _vtClearForm();
  _vtFillProySelect('');
  openM('mVenta');
}

function openValorizEdit(id){
  const v=DB.ventas.find(x=>x.id===id);if(!v)return;
  _ventaEditId=id;
  document.querySelector('#mVenta .mttl').textContent='✏️ Editar Valorización';
  _vtClearForm();
  _vtFillProySelect(v.codigo||'');
  document.getElementById('vtFecha').value=v.fecha||today();
  document.getElementById('vtEdp').value=v.edpNum||'';
  document.getElementById('vtMes').value=v.valorizacionMes||'';
  document.getElementById('vtMonto').value=v.montoTotal||'';
  document.getElementById('vtObs').value=v.observaciones||'';
  if(v.pdfUrl){
    document.getElementById('vtPdfActual').style.display='block';
    document.getElementById('vtPdfLink').href=v.pdfUrl;
    document.getElementById('vtPdfNombre').textContent=v.pdfNombre||'Archivo PDF';
  }
  openM('mVenta');
}

async function gVenta(){
  const sel=document.getElementById('vtProy');
  if(!sel||!sel.value){toast('Seleccione un proyecto',true);return;}
  const opt=sel.options[sel.selectedIndex];
  const codigo=sel.value;
  const nombre=opt.getAttribute('data-nombre')||opt.textContent.replace(/^\[.*?\]\s*/,'');
  const isEdit=!!_ventaEditId;
  const existing=isEdit?(DB.ventas.find(v=>v.id===_ventaEditId)||{}):{};
  const recId=_ventaEditId||nid('vent');

  let pdfUrl=existing.pdfUrl||'',pdfNombre=existing.pdfNombre||'',pdfPath=existing.pdfPath||'';
  const fileInput=document.getElementById('vtPdf');
  if(fileInput&&fileInput.files[0]){
    const file=fileInput.files[0];
    const path=`valorizaciones/${recId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
    toast('Subiendo PDF...');
    const{error}=await supa.storage.from(_VENTA_BUCKET).upload(path,file,{upsert:true});
    if(error){toast('Error al subir PDF: '+error.message,true);return;}
    if(pdfPath&&pdfPath!==path)supa.storage.from(_VENTA_BUCKET).remove([pdfPath]);
    const{data:{publicUrl}}=supa.storage.from(_VENTA_BUCKET).getPublicUrl(path);
    pdfUrl=publicUrl;pdfNombre=file.name;pdfPath=path;
  }

  const rec={
    id:recId,nombre,codigo,
    valorizacionMes:document.getElementById('vtMes').value.trim(),
    edpNum:document.getElementById('vtEdp').value.trim(),
    montoTotal:+document.getElementById('vtMonto').value||0,
    observaciones:document.getElementById('vtObs').value.trim(),
    fecha:document.getElementById('vtFecha').value||today(),
    pdfUrl,pdfNombre,pdfPath,
    hesUrl:existing.hesUrl||'',hesNombre:existing.hesNombre||'',hesPath:existing.hesPath||'',
    hesNum:existing.hesNum||'',hesFecha:existing.hesFecha||'',hesOc:existing.hesOc||'',
    hesMonto:existing.hesMonto||0,hesPeriodo:existing.hesPeriodo||'',
    hesTextoCabecera:existing.hesTextoCabecera||'',hesMoneda:existing.hesMoneda||'',hesCantPedida:existing.hesCantPedida||0,
    facturaUrl:existing.facturaUrl||'',facturaNombre:existing.facturaNombre||'',facturaPath:existing.facturaPath||'',
  };

  if(isEdit){const idx=DB.ventas.findIndex(v=>v.id===_ventaEditId);if(idx>-1)DB.ventas[idx]=rec;}
  else DB.ventas.push(rec);
  syncSheet('saveVenta',rec);
  closeM('mVenta');
  rValorizaciones();
  toast(isEdit?'Valorización actualizada':'Valorización registrada');
}

// ── Carga rápida HES / Factura desde la tabla ──
function openValorizUpload(ventaId,field){
  const v=DB.ventas.find(x=>x.id===ventaId);if(!v)return;
  _vtUploadId=ventaId;
  _vtUploadField=field;
  _vtHesData={};
  const cfg={hes:{label:'HES',color:'#f59e0b'},factura:{label:'Factura',color:'#a78bfa'}};
  const c=cfg[field]||{label:field,color:'#059669'};
  const ttl=document.getElementById('mVentaUploadTtl');
  if(ttl){ttl.textContent='📤 Subir '+c.label;ttl.style.color=c.color;}
  const btn=document.getElementById('mVentaUploadBtn');
  if(btn)btn.style.setProperty('--ba',c.color);
  const info=document.getElementById('mVentaUploadInfo');
  if(info)info.innerHTML=`<strong>${v.edpNum||'—'}</strong> · ${v.nombre||'—'} · <span style="color:var(--muted2)">${v.valorizacionMes||''}</span>`;
  document.getElementById('vtUploadFile').value='';
  document.getElementById('vtUploadPreview').textContent='';
  const panel=document.getElementById('vtHesPanel');
  if(panel)panel.style.display='none';
  openM('mVentaUpload');
}

async function gVentaUpload(){
  const fileInput=document.getElementById('vtUploadFile');
  if(!fileInput||!fileInput.files[0]){toast('Seleccione un archivo PDF',true);return;}
  const v=DB.ventas.find(x=>x.id===_vtUploadId);if(!v){toast('Registro no encontrado',true);return;}
  const file=fileInput.files[0];
  const folder=_vtUploadField;
  const existingPath=v[folder+'Path']||'';
  const path=`${folder}/${v.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
  toast('Subiendo...');
  const{error}=await supa.storage.from(_VENTA_BUCKET).upload(path,file,{upsert:true});
  if(error){toast('Error: '+error.message,true);return;}
  if(existingPath&&existingPath!==path)supa.storage.from(_VENTA_BUCKET).remove([existingPath]);
  const{data:{publicUrl}}=supa.storage.from(_VENTA_BUCKET).getPublicUrl(path);
  if(folder==='hes'){
    v.hesUrl=publicUrl;v.hesNombre=file.name;v.hesPath=path;
    // Guardar datos extraídos del PDF HES
    if(_vtHesData.hesNum)v.hesNum=_vtHesData.hesNum;
    if(_vtHesData.hesFecha)v.hesFecha=_vtHesData.hesFecha;
    if(_vtHesData.hesOc)v.hesOc=_vtHesData.hesOc;
    if(_vtHesData.hesMonto)v.hesMonto=_vtHesData.hesMonto;
    if(_vtHesData.hesPeriodo)v.hesPeriodo=_vtHesData.hesPeriodo;
    if(_vtHesData.hesTextoCabecera)v.hesTextoCabecera=_vtHesData.hesTextoCabecera;
    if(_vtHesData.hesMoneda)v.hesMoneda=_vtHesData.hesMoneda;
    if(_vtHesData.hesCantPedida)v.hesCantPedida=_vtHesData.hesCantPedida;
  }else{
    v.facturaUrl=publicUrl;v.facturaNombre=file.name;v.facturaPath=path;
  }
  syncSheet('saveVenta',v);
  closeM('mVentaUpload');
  rValorizaciones();
  toast('Archivo subido correctamente');
}

document.addEventListener('DOMContentLoaded',()=>{
  // Preview del PDF de valorización principal
  const pdfInput=document.getElementById('vtPdf');
  if(pdfInput)pdfInput.addEventListener('change',function(){
    const p=document.getElementById('vtPdfPreview');
    if(p)p.textContent=this.files[0]?'📎 '+this.files[0].name+' ('+Math.round(this.files[0].size/1024)+' KB)':'';
  });

  // Preview + extracción automática para HES
  const upInput=document.getElementById('vtUploadFile');
  if(upInput)upInput.addEventListener('change',async function(){
    const p=document.getElementById('vtUploadPreview');
    const file=this.files[0];
    if(p)p.textContent=file?'📎 '+file.name+' ('+Math.round(file.size/1024)+' KB)':'';

    // Extraer datos solo cuando sea HES
    if(file&&_vtUploadField==='hes'){
      _vtHesData={};
      const panel=document.getElementById('vtHesPanel');
      const spin=document.getElementById('vtHesSpinner');
      if(panel){panel.style.display='block';}
      if(spin)spin.style.display='inline';
      const fields=document.getElementById('vtHesFields');
      if(fields)fields.innerHTML='<div style="color:var(--muted2);font-size:.72rem;grid-column:span 2">Leyendo PDF...</div>';
      try{
        const text=await _vtExtractPdfText(file);
        if(text){
          _vtHesData=_vtParseHes(text);
          _vtShowHesPanel(_vtHesData);
        }else{
          if(fields)fields.innerHTML='<div style="color:#f87171;font-size:.72rem;grid-column:span 2">No se pudo leer el PDF (PDF.js no disponible)</div>';
          if(spin)spin.style.display='none';
        }
      }catch(e){
        if(fields)fields.innerHTML='<div style="color:#f87171;font-size:.72rem;grid-column:span 2">Error al leer PDF: '+e.message+'</div>';
        if(spin)spin.style.display='none';
      }
    }else{
      // Si no es HES, ocultar panel
      const panel=document.getElementById('vtHesPanel');
      if(panel)panel.style.display='none';
      _vtHesData={};
    }
  });
});

// ══ MÓDULO HES ══
let _hesChart=null;

function rHes(){
  const pg=document.getElementById('page-hes');if(!pg)return;
  const allVentas=DB.ventas||[];
  const rows=allVentas.filter(v=>v.hesUrl);

  const totalMonto=rows.reduce((a,v)=>a+(+v.hesMonto||0),0);
  const avg=rows.length?totalMonto/rows.length:0;

  const kpis=[
    {l:'HES Registradas',v:rows.length,c:'#f59e0b'},
    {l:'Monto Total S/.',v:fmt(totalMonto),c:'#10b981'},
    {l:'Promedio por HES',v:fmt(avg),c:'#06b6d4'},
    {l:'Valorizaciones sin HES',v:allVentas.filter(v=>!v.hesUrl).length,c:'#f87171'},
  ];

  // Agrupar por mes según hesFecha (dd/mm/yyyy)
  const MES=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const byMonth={};
  rows.forEach(v=>{
    if(!v.hesFecha)return;
    const p=v.hesFecha.split(/[\/\.\-]/);
    if(p.length<3)return;
    const mm=+p[1]-1,yyyy=p[2];
    const key=`${yyyy}-${String(mm+1).padStart(2,'0')}`;
    if(!byMonth[key])byMonth[key]={label:`${MES[mm]} ${yyyy}`,monto:0};
    byMonth[key].monto+=(+v.hesMonto||0);
  });
  const keys=Object.keys(byMonth).sort();
  const chartLabels=keys.map(k=>byMonth[k].label);
  const chartData=keys.map(k=>byMonth[k].monto);

  const noData=rows.length===0;
  pg.innerHTML=`
    <div class="ph">
      <div class="ph-title" style="color:#f59e0b">📑 HES · Hojas de Entrada de Servicios</div>
      <div class="ph-sub">Resumen de montos aceptados por SAP</div>
    </div>
    <div class="kpi-row">${kpis.map(k=>`<div class="kpi" style="--kc:${k.c}"><div class="kpi-lbl">${k.l}</div><div class="kpi-val">${k.v}</div></div>`).join('')}</div>
    <div class="card" style="margin-bottom:1rem">
      <div class="card-head"><span class="card-title">📊 Monto Aceptado por Mes</span></div>
      <div class="card-body" style="padding:1rem 1.2rem">
        ${noData
          ?'<div style="text-align:center;padding:2rem;color:var(--muted2);font-size:.82rem">Sin HES registradas aún</div>'
          :'<canvas id="hesChartCanvas" style="max-height:260px"></canvas>'}
      </div>
    </div>
    <div class="card">
      <div class="card-head">
        <span class="card-title">Detalle de HES</span>
        <div class="card-head-right">
          <div class="search-wrap"><span>🔍</span><input class="search-input" placeholder="Buscar..." oninput="flt(this,'tbHes')"></div>
        </div>
      </div>
      <div class="card-body"><div class="tbl-wrap"><table>
        <thead><tr>
          <th>N° HES</th><th>Proyecto</th><th>Fecha HES</th>
          <th>Ord. Compra</th><th>Moneda</th>
          <th class="tr">Cant. Pedida</th><th class="tr">Monto Aceptado</th>
          <th>Período</th><th>Texto Cabecera</th><th>PDF</th>
        </tr></thead>
        <tbody id="tbHes">${rows.map(v=>`<tr>
          <td><span style="background:#f59e0b20;color:#f59e0b;border:1px solid #f59e0b50;border-radius:4px;padding:1px 7px;font-size:.65rem;font-family:monospace;font-weight:700">${v.hesNum||'—'}</span></td>
          <td><strong style="font-size:.82rem">${v.nombre||'—'}</strong><br><span style="font-size:.65rem;color:#a78bfa;font-family:monospace">${v.codigo||''}</span></td>
          <td class="mono" style="font-size:.76rem">${v.hesFecha||'—'}</td>
          <td class="mono" style="font-size:.76rem">${v.hesOc||'—'}</td>
          <td style="text-align:center;font-size:.75rem;font-weight:700;color:#06b6d4">${v.hesMoneda||'—'}</td>
          <td class="tr mono" style="font-size:.76rem">${v.hesCantPedida?fmt(v.hesCantPedida):'—'}</td>
          <td class="tr mono" style="color:#10b981;font-weight:700">${v.hesMonto?fmt(v.hesMonto):'—'}</td>
          <td style="font-size:.68rem;color:var(--muted2);white-space:nowrap">${v.hesPeriodo||'—'}</td>
          <td style="font-size:.71rem;color:#a78bfa;max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${v.hesTextoCabecera||''}">${v.hesTextoCabecera||'—'}</td>
          <td>${_vtPdfLink(v.hesUrl,'#f59e0b')}</td>
        </tr>`).join('')}</tbody>
      </table></div></div>
    </div>`;

  if(!noData&&typeof Chart!=='undefined'){
    if(_hesChart){_hesChart.destroy();_hesChart=null;}
    const isDark=document.documentElement.getAttribute('data-theme')==='dark'
      ||(!document.documentElement.getAttribute('data-theme')&&window.matchMedia('(prefers-color-scheme:dark)').matches);
    const gridColor=isDark?'rgba(255,255,255,.06)':'rgba(0,0,0,.06)';
    const tickColor=isDark?'#94a3b8':'#64748b';
    const ctx=document.getElementById('hesChartCanvas');
    if(ctx){
      _hesChart=new Chart(ctx,{
        type:'bar',
        data:{
          labels:chartLabels,
          datasets:[{
            label:'Monto HES S/.',
            data:chartData,
            backgroundColor:'rgba(245,158,11,.25)',
            borderColor:'#f59e0b',
            borderWidth:2,
            borderRadius:7,
            borderSkipped:false,
          }]
        },
        options:{
          responsive:true,
          plugins:{
            legend:{display:false},
            tooltip:{callbacks:{label:c=>' S/. '+fmt(c.raw)}}
          },
          scales:{
            y:{
              ticks:{color:tickColor,callback:v=>'S/.'+fmt(v)},
              grid:{color:gridColor},
              border:{display:false}
            },
            x:{
              ticks:{color:tickColor},
              grid:{display:false},
              border:{display:false}
            }
          }
        }
      });
    }
  }
}
