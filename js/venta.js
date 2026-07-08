// ══ VENTA / VALORIZACIONES ══
const _VENTA_BUCKET='Equip_eco26';
let _ventaEditId=null;

function rVenta(){
  const rows=DB.ventas||[];
  const totalMonto=rows.reduce((a,v)=>a+(+v.montoTotal||0),0);
  const kpis=[
    {l:'Total Valorizaciones',v:rows.length,c:'#059669'},
    {l:'Monto Total S/.',v:fmt(totalMonto),c:'#10b981'},
    {l:'Con PDF adjunto',v:rows.filter(v=>v.pdfUrl).length,c:'#3b82f6'},
  ];
  const kpiEl=document.getElementById('ventaKpis');
  if(kpiEl)kpiEl.innerHTML=kpis.map(k=>`<div class="kpi" style="--kc:${k.c}"><div class="kpi-lbl">${k.l}</div><div class="kpi-val">${k.v}</div></div>`).join('');

  const sorted=[...rows].sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||''));
  const tb=document.getElementById('tbVenta');
  if(!tb)return;
  tb.innerHTML=sorted.map(v=>`<tr>
    <td class="mono">${v.fecha||'—'}</td>
    <td><span class="badge b-green" style="font-size:.65rem">${v.edpNum||'—'}</span></td>
    <td><strong>${v.nombre||'—'}</strong></td>
    <td class="mono" style="color:#a78bfa">${v.codigo||'—'}</td>
    <td style="font-size:.78rem">${v.valorizacionMes||'—'}</td>
    <td class="tr mono" style="color:#10b981">${fmt(v.montoTotal||0)}</td>
    <td style="text-align:center">${v.pdfUrl?`<a href="${v.pdfUrl}" target="_blank" class="btn btn-sm btn-out" style="font-size:.65rem;padding:2px 8px;color:#3b82f6;border-color:#3b82f660">📄 PDF</a>`:'<span style="color:var(--muted);font-size:.72rem">—</span>'}</td>
    <td style="font-size:.72rem;color:var(--muted2);max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${v.observaciones||''}">${v.observaciones||'—'}</td>
    <td style="display:flex;gap:.3rem">
      <button class="btn btn-out btn-sm" onclick="openVentaEdit(${v.id})" style="color:#f59e0b;border-color:#f59e0b60" title="Editar">✏️</button>
      <button class="btn btn-del btn-sm" onclick="del('ventas',${v.id})" title="Eliminar">🗑</button>
    </td>
  </tr>`).join('');

  const srch=document.getElementById('ventaSearch');
  if(srch&&srch.value)flt(srch,'tbVenta');
}

function openVentaNew(){
  _ventaEditId=null;
  document.querySelector('#mVenta .mttl').textContent='Nueva Valorización';
  document.getElementById('vtFecha').value=today();
  ['vtEdp','vtNombre','vtCod','vtMes','vtObs'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('vtMonto').value='';
  document.getElementById('vtPdf').value='';
  document.getElementById('vtPdfPreview').textContent='';
  document.getElementById('vtPdfActual').style.display='none';
  openM('mVenta');
}

function openVentaEdit(id){
  const v=DB.ventas.find(x=>x.id===id);if(!v)return;
  _ventaEditId=id;
  document.querySelector('#mVenta .mttl').textContent='✏️ Editar Valorización';
  document.getElementById('vtFecha').value=v.fecha||today();
  document.getElementById('vtEdp').value=v.edpNum||'';
  document.getElementById('vtNombre').value=v.nombre||'';
  document.getElementById('vtCod').value=v.codigo||'';
  document.getElementById('vtMes').value=v.valorizacionMes||'';
  document.getElementById('vtMonto').value=v.montoTotal||'';
  document.getElementById('vtObs').value=v.observaciones||'';
  document.getElementById('vtPdf').value='';
  document.getElementById('vtPdfPreview').textContent='';
  const actEl=document.getElementById('vtPdfActual');
  if(v.pdfUrl){
    actEl.style.display='flex';
    document.getElementById('vtPdfNombre').textContent=v.pdfNombre||'Archivo PDF';
    document.getElementById('vtPdfLink').href=v.pdfUrl;
  }else{
    actEl.style.display='none';
  }
  openM('mVenta');
}

async function gVenta(){
  const nombre=document.getElementById('vtNombre').value.trim();
  if(!nombre){toast('Ingrese nombre de proyecto',true);return;}
  const isEdit=!!_ventaEditId;
  const existing=isEdit?DB.ventas.find(v=>v.id===_ventaEditId):null;
  const rec={
    id:_ventaEditId||nid('vent'),
    nombre,
    codigo:document.getElementById('vtCod').value.trim(),
    valorizacionMes:document.getElementById('vtMes').value.trim(),
    edpNum:document.getElementById('vtEdp').value.trim(),
    montoTotal:+document.getElementById('vtMonto').value||0,
    observaciones:document.getElementById('vtObs').value.trim(),
    fecha:document.getElementById('vtFecha').value||today(),
    pdfUrl:existing?.pdfUrl||'',
    pdfNombre:existing?.pdfNombre||'',
    pdfPath:existing?.pdfPath||'',
  };

  const fileInput=document.getElementById('vtPdf');
  if(fileInput&&fileInput.files[0]){
    const file=fileInput.files[0];
    const path=`ventas/${rec.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
    toast('Subiendo PDF...');
    const{error}=await supa.storage.from(_VENTA_BUCKET).upload(path,file,{upsert:true});
    if(error){toast('Error al subir PDF: '+error.message,true);return;}
    const{data:{publicUrl}}=supa.storage.from(_VENTA_BUCKET).getPublicUrl(path);
    if(existing?.pdfPath&&existing.pdfPath!==path){
      supa.storage.from(_VENTA_BUCKET).remove([existing.pdfPath]);
    }
    rec.pdfUrl=publicUrl;
    rec.pdfNombre=file.name;
    rec.pdfPath=path;
  }

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
  const pdfInput=document.getElementById('vtPdf');
  if(pdfInput)pdfInput.addEventListener('change',function(){
    const prev=document.getElementById('vtPdfPreview');
    if(this.files[0])prev.textContent='📎 '+this.files[0].name+' ('+Math.round(this.files[0].size/1024)+' KB)';
    else prev.textContent='';
  });
});
