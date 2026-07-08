// ══ VENTA / VALORIZACIONES ══
const _VENTA_BUCKET='Equip_eco26';
let _ventaEditId=null;

function _vtPdfBtn(url,label,color){
  if(!url)return'<span style="color:var(--muted);font-size:.7rem">—</span>';
  return`<a href="${url}" target="_blank" class="btn btn-sm btn-out" style="font-size:.63rem;padding:2px 7px;color:${color};border-color:${color}60">📄</a>`;
}

function rVenta(){
  const rows=DB.ventas||[];
  const totalMonto=rows.reduce((a,v)=>a+(+v.montoTotal||0),0);
  const kpis=[
    {l:'Total Valorizaciones',v:rows.length,c:'#059669'},
    {l:'Monto Total S/.',v:fmt(totalMonto),c:'#10b981'},
    {l:'Con HES',v:rows.filter(v=>v.hesUrl).length,c:'#f59e0b'},
    {l:'Con Factura',v:rows.filter(v=>v.facturaUrl).length,c:'#a78bfa'},
  ];
  const kpiEl=document.getElementById('ventaKpis');
  if(kpiEl)kpiEl.innerHTML=kpis.map(k=>`<div class="kpi" style="--kc:${k.c}"><div class="kpi-lbl">${k.l}</div><div class="kpi-val">${k.v}</div></div>`).join('');

  const sorted=[...rows].sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||''));
  const tb=document.getElementById('tbVenta');
  if(!tb)return;
  tb.innerHTML=sorted.map(v=>`<tr>
    <td class="mono">${v.fecha||'—'}</td>
    <td><span class="badge b-green" style="font-size:.63rem">${v.edpNum||'—'}</span></td>
    <td><strong style="font-size:.82rem">${v.nombre||'—'}</strong></td>
    <td class="mono" style="color:#a78bfa;font-size:.75rem">${v.codigo||'—'}</td>
    <td style="font-size:.76rem">${v.valorizacionMes||'—'}</td>
    <td class="tr mono" style="color:#10b981">${fmt(v.montoTotal||0)}</td>
    <td style="text-align:center">${_vtPdfBtn(v.pdfUrl,v.pdfNombre,'#10b981')}</td>
    <td style="text-align:center">${_vtPdfBtn(v.hesUrl,v.hesNombre,'#f59e0b')}</td>
    <td style="text-align:center">${_vtPdfBtn(v.facturaUrl,v.facturaNombre,'#a78bfa')}</td>
    <td style="font-size:.71rem;color:var(--muted2);max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${v.observaciones||''}">${v.observaciones||'—'}</td>
    <td style="display:flex;gap:.3rem">
      <button class="btn btn-out btn-sm" onclick="openVentaEdit(${v.id})" style="color:#f59e0b;border-color:#f59e0b60" title="Editar">✏️</button>
      <button class="btn btn-del btn-sm" onclick="del('ventas',${v.id})" title="Eliminar">🗑</button>
    </td>
  </tr>`).join('');

  const srch=document.getElementById('ventaSearch');
  if(srch&&srch.value)flt(srch,'tbVenta');
}

function _vtShowActual(id,url,nombre){
  const el=document.getElementById(id);
  const lnk=document.getElementById(id.replace('Actual','Link'));
  const nom=document.getElementById(id.replace('Actual','Nombre'));
  if(url&&el){
    el.style.display='block';
    if(lnk)lnk.href=url;
    if(nom)nom.textContent=nombre||'Archivo';
  }else if(el){
    el.style.display='none';
  }
}

function _vtClearForm(){
  document.getElementById('vtFecha').value=today();
  ['vtEdp','vtNombre','vtCod','vtMes','vtObs'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('vtMonto').value='';
  ['vtPdf','vtHes','vtFact'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  ['vtPdfPreview','vtHesPreview','vtFactPreview'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent='';});
  ['vtPdfActual','vtHesActual','vtFactActual'].forEach(id=>{const el=document.getElementById(id);if(el)el.style.display='none';});
}

function openVentaNew(){
  _ventaEditId=null;
  document.querySelector('#mVenta .mttl').textContent='Nueva Valorización';
  _vtClearForm();
  openM('mVenta');
}

function openVentaEdit(id){
  const v=DB.ventas.find(x=>x.id===id);if(!v)return;
  _ventaEditId=id;
  document.querySelector('#mVenta .mttl').textContent='✏️ Editar Valorización';
  _vtClearForm();
  document.getElementById('vtFecha').value=v.fecha||today();
  document.getElementById('vtEdp').value=v.edpNum||'';
  document.getElementById('vtNombre').value=v.nombre||'';
  document.getElementById('vtCod').value=v.codigo||'';
  document.getElementById('vtMes').value=v.valorizacionMes||'';
  document.getElementById('vtMonto').value=v.montoTotal||'';
  document.getElementById('vtObs').value=v.observaciones||'';
  _vtShowActual('vtPdfActual',v.pdfUrl,v.pdfNombre);
  _vtShowActual('vtHesActual',v.hesUrl,v.hesNombre);
  _vtShowActual('vtFactActual',v.facturaUrl,v.facturaNombre);
  openM('mVenta');
}

async function _vtUploadFile(inputId,existingPath,recId,folder){
  const fileInput=document.getElementById(inputId);
  if(!fileInput||!fileInput.files[0])return null;
  const file=fileInput.files[0];
  const path=`ventas/${recId}/${folder}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
  const{error}=await supa.storage.from(_VENTA_BUCKET).upload(path,file,{upsert:true});
  if(error){toast('Error al subir '+folder+': '+error.message,true);return null;}
  if(existingPath&&existingPath!==path)supa.storage.from(_VENTA_BUCKET).remove([existingPath]);
  const{data:{publicUrl}}=supa.storage.from(_VENTA_BUCKET).getPublicUrl(path);
  return{url:publicUrl,nombre:file.name,path};
}

async function gVenta(){
  const nombre=document.getElementById('vtNombre').value.trim();
  if(!nombre){toast('Ingrese nombre de proyecto',true);return;}
  const isEdit=!!_ventaEditId;
  const existing=isEdit?DB.ventas.find(v=>v.id===_ventaEditId)||{}:{};
  const recId=_ventaEditId||nid('vent');

  const hasPdf=document.getElementById('vtPdf').files[0];
  const hasHes=document.getElementById('vtHes').files[0];
  const hasFact=document.getElementById('vtFact').files[0];
  if(hasPdf||hasHes||hasFact)toast('Subiendo archivos...');

  const[pdfRes,hesRes,factRes]=await Promise.all([
    _vtUploadFile('vtPdf',existing.pdfPath,recId,'valorizacion'),
    _vtUploadFile('vtHes',existing.hesPath,recId,'hes'),
    _vtUploadFile('vtFact',existing.facturaPath,recId,'factura'),
  ]);

  const rec={
    id:recId,
    nombre,
    codigo:document.getElementById('vtCod').value.trim(),
    valorizacionMes:document.getElementById('vtMes').value.trim(),
    edpNum:document.getElementById('vtEdp').value.trim(),
    montoTotal:+document.getElementById('vtMonto').value||0,
    observaciones:document.getElementById('vtObs').value.trim(),
    fecha:document.getElementById('vtFecha').value||today(),
    pdfUrl:pdfRes?pdfRes.url:(existing.pdfUrl||''),
    pdfNombre:pdfRes?pdfRes.nombre:(existing.pdfNombre||''),
    pdfPath:pdfRes?pdfRes.path:(existing.pdfPath||''),
    hesUrl:hesRes?hesRes.url:(existing.hesUrl||''),
    hesNombre:hesRes?hesRes.nombre:(existing.hesNombre||''),
    hesPath:hesRes?hesRes.path:(existing.hesPath||''),
    facturaUrl:factRes?factRes.url:(existing.facturaUrl||''),
    facturaNombre:factRes?factRes.nombre:(existing.facturaNombre||''),
    facturaPath:factRes?factRes.path:(existing.facturaPath||''),
  };

  if(isEdit){
    const idx=DB.ventas.findIndex(v=>v.id===_ventaEditId);
    if(idx>-1)DB.ventas[idx]=rec;
  }else{
    DB.ventas.push(rec);
  }
  syncSheet('saveVenta',rec);
  closeM('mVenta');
  rVenta();
  toast(isEdit?'Valorización actualizada':'Valorización registrada');
}

document.addEventListener('DOMContentLoaded',()=>{
  [['vtPdf','vtPdfPreview'],['vtHes','vtHesPreview'],['vtFact','vtFactPreview']].forEach(([inp,prev])=>{
    const el=document.getElementById(inp);
    if(el)el.addEventListener('change',function(){
      const p=document.getElementById(prev);
      if(p)p.textContent=this.files[0]?'📎 '+this.files[0].name+' ('+Math.round(this.files[0].size/1024)+' KB)':'';
    });
  });
});
