// ══ VALORIZACIONES / EDP ══
const _VENTA_BUCKET='Ventas_EDP_pdf';
let _ventaEditId=null;
let _vtUploadId=null;
let _vtUploadField=null;

function _vtPdfLink(url,color){
  if(!url)return'<span style="color:var(--muted);font-size:.7rem">—</span>';
  return`<a href="${url}" target="_blank" class="btn btn-sm btn-out" style="font-size:.63rem;padding:2px 8px;color:${color};border-color:${color}60">📄 Ver</a>`;
}
function _vtUploadBtn(ventaId,field,color,label){
  return`<button onclick="openValorizUpload(${ventaId},'${field}')" class="btn btn-sm btn-out" style="font-size:.63rem;padding:2px 8px;color:${color};border-color:${color}40;opacity:.7">📤 ${label}</button>`;
}

function rValorizaciones(){
  const rows=DB.ventas||[];
  const totalMonto=rows.reduce((a,v)=>a+(+v.montoTotal||0),0);
  const kpis=[
    {l:'Total Valorizaciones',v:rows.length,c:'#059669'},
    {l:'Monto Total S/.',v:fmt(totalMonto),c:'#10b981'},
    {l:'Con HES',v:rows.filter(v=>v.hesUrl).length,c:'#f59e0b'},
    {l:'Con Factura',v:rows.filter(v=>v.facturaUrl).length,c:'#a78bfa'},
  ];
  const kpiEl=document.getElementById('valorizKpis');
  if(kpiEl)kpiEl.innerHTML=kpis.map(k=>`<div class="kpi" style="--kc:${k.c}"><div class="kpi-lbl">${k.l}</div><div class="kpi-val">${k.v}</div></div>`).join('');

  const sorted=[...rows].sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||''));
  const tb=document.getElementById('tbValorizaciones');
  if(!tb)return;
  tb.innerHTML=sorted.map(v=>`<tr>
    <td class="mono">${v.fecha||'—'}</td>
    <td><span class="badge b-green" style="font-size:.63rem">${v.edpNum||'—'}</span></td>
    <td><strong style="font-size:.82rem">${v.nombre||'—'}</strong></td>
    <td class="mono" style="color:#a78bfa;font-size:.75rem">${v.codigo||'—'}</td>
    <td style="font-size:.76rem">${v.valorizacionMes||'—'}</td>
    <td class="tr mono" style="color:#10b981">${fmt(v.montoTotal||0)}</td>
    <td style="text-align:center">${_vtPdfLink(v.pdfUrl,'#10b981')}</td>
    <td style="text-align:center">${v.hesUrl?_vtPdfLink(v.hesUrl,'#f59e0b'):_vtUploadBtn(v.id,'hes','#f59e0b','HES')}</td>
    <td style="text-align:center">${v.facturaUrl?_vtPdfLink(v.facturaUrl,'#a78bfa'):_vtUploadBtn(v.id,'factura','#a78bfa','Fact.')}</td>
    <td style="font-size:.71rem;color:var(--muted2);max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${v.observaciones||''}">${v.observaciones||'—'}</td>
    <td style="display:flex;gap:.3rem">
      <button class="btn btn-out btn-sm" onclick="openValorizEdit(${v.id})" style="color:#f59e0b;border-color:#f59e0b60" title="Editar">✏️</button>
      <button class="btn btn-del btn-sm" onclick="del('ventas',${v.id})" title="Eliminar">🗑</button>
    </td>
  </tr>`).join('');

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
  const cfg={hes:{label:'HES',color:'#f59e0b'},factura:{label:'Factura',color:'#a78bfa'}};
  const c=cfg[field]||{label:field,color:'#059669'};
  document.getElementById('mVentaUploadTtl').textContent='📤 Subir '+c.label;
  document.getElementById('mVentaUploadTtl').style.color=c.color;
  document.getElementById('mVentaUploadBtn').style.setProperty('--ba',c.color);
  document.getElementById('mVentaUploadInfo').innerHTML=
    `<strong>${v.edpNum||'—'}</strong> · ${v.nombre||'—'} · <span style="color:var(--muted2)">${v.valorizacionMes||''}</span>`;
  document.getElementById('vtUploadFile').value='';
  document.getElementById('vtUploadPreview').textContent='';
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
  if(folder==='hes'){v.hesUrl=publicUrl;v.hesNombre=file.name;v.hesPath=path;}
  else{v.facturaUrl=publicUrl;v.facturaNombre=file.name;v.facturaPath=path;}
  syncSheet('saveVenta',v);
  closeM('mVentaUpload');
  rValorizaciones();
  toast('Archivo subido correctamente');
}

document.addEventListener('DOMContentLoaded',()=>{
  const pdfInput=document.getElementById('vtPdf');
  if(pdfInput)pdfInput.addEventListener('change',function(){
    const p=document.getElementById('vtPdfPreview');
    if(p)p.textContent=this.files[0]?'📎 '+this.files[0].name+' ('+Math.round(this.files[0].size/1024)+' KB)':'';
  });
  const upInput=document.getElementById('vtUploadFile');
  if(upInput)upInput.addEventListener('change',function(){
    const p=document.getElementById('vtUploadPreview');
    if(p)p.textContent=this.files[0]?'📎 '+this.files[0].name+' ('+Math.round(this.files[0].size/1024)+' KB)':'';
  });
});
