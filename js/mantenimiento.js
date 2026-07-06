// ══ SUPERVISIÓN ══
function openSuper(){
  ['suF','suA','suAc','suO'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  ['suS','suR'].forEach(id=>{const el=document.getElementById(id);if(el)el.selectedIndex=0;});
  openM('mSuper');
}
function rSuper(){document.getElementById('tbSuper').innerHTML=DB.supervision.map(r=>`<tr><td class="mono">${r.fecha}</td><td>${r.sup}</td><td>${r.area}</td><td>${r.act}</td><td>${r.obs||'—'}</td><td>${bge(r.res)}</td><td><button class="btn btn-del btn-sm" onclick="del('supervision',${r.id})">🗑</button></td></tr>`).join('');}
function gSuper(){DB.supervision.push({id:nid('super'),fecha:document.getElementById('suF').value||today(),sup:document.getElementById('suS').value,area:document.getElementById('suA').value,act:document.getElementById('suAc').value,obs:document.getElementById('suO').value,res:document.getElementById('suR').value});syncSheet('saveSupervision',DB.supervision[DB.supervision.length-1]);closeM('mSuper');rSuper();toast('Supervisión registrada');}

// ══ SEGURIDAD ══
function openInc(){
  ['inF','inA','inD'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  ['inT','inTr','inSv','inE'].forEach(id=>{const el=document.getElementById(id);if(el)el.selectedIndex=0;});
  openM('mInc');
}
function openPetar(){
  ['ptN','ptV'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  ['ptT','ptR','ptE'].forEach(id=>{const el=document.getElementById(id);if(el)el.selectedIndex=0;});
  openM('mPetar');
}
function rSeg(){
  document.getElementById('segKpis').innerHTML=[{l:'Incidentes Mes',v:DB.incidentes.length,c:'#ef4444'},{l:'Sin Cerrar',v:DB.incidentes.filter(i=>i.est!=='Cerrado').length,c:'#f97316'},{l:'PETAR Activos',v:DB.petar.filter(p=>p.est==='Activo').length,c:'#f59e0b'},{l:'Días sin Accidente',v:15,c:'#10b981'}].map(k=>`<div class="kpi" style="--kc:${k.c}"><div class="kpi-lbl">${k.l}</div><div class="kpi-val">${k.v}</div></div>`).join('');
  document.getElementById('tbInc').innerHTML=DB.incidentes.map(r=>`<tr><td class="mono">${r.fecha}</td><td><span class="badge b-red">${r.tipo}</span></td><td>${r.area}</td><td>${r.desc}</td><td>${r.trab}</td><td>${bge(r.sev)}</td><td>${bge(r.est)}</td><td><button class="btn btn-del btn-sm" onclick="del('incidentes',${r.id})">🗑</button></td></tr>`).join('');
  document.getElementById('tbPetar').innerHTML=DB.petar.map(r=>`<tr><td class="mono" style="color:var(--seg)">${r.num}</td><td><span class="badge b-yellow">${r.tipo}</span></td><td>${r.resp}</td><td class="mono">${r.vig}</td><td>${bge(r.est)}</td><td><button class="btn btn-del btn-sm" onclick="del('petar',${r.id})">🗑</button></td></tr>`).join('');
}
function gInc(){DB.incidentes.push({id:nid('inc'),fecha:document.getElementById('inF').value||today(),tipo:document.getElementById('inT').value,area:document.getElementById('inA').value,desc:document.getElementById('inD').value,trab:document.getElementById('inTr').value,sev:document.getElementById('inSv').value,est:document.getElementById('inE').value});syncSheet('saveIncidente',DB.incidentes[DB.incidentes.length-1]);closeM('mInc');rSeg();toast('Incidente registrado');}
function gPetar(){DB.petar.push({id:nid('pet'),num:document.getElementById('ptN').value,tipo:document.getElementById('ptT').value,resp:document.getElementById('ptR').value,vig:document.getElementById('ptV').value,est:document.getElementById('ptE').value});syncSheet('savePetar',DB.petar[DB.petar.length-1]);closeM('mPetar');rSeg();toast('PETAR registrado');}

// ══ AMBIENTAL ══
function rAmb(){document.getElementById('tbAmb').innerHTML=DB.ambiental.map(r=>`<tr><td class="mono">${r.fecha}</td><td><span class="badge b-teal">${r.tipo}</span></td><td>${r.desc}</td><td class="mono">${r.cant}</td><td>${r.dest}</td><td>${bge(r.est)}</td><td><button class="btn btn-del btn-sm" onclick="del('ambiental',${r.id})">🗑</button></td></tr>`).join('');}
function gAmb(){DB.ambiental.push({id:nid('amb'),fecha:document.getElementById('maF').value||today(),tipo:document.getElementById('maT').value,desc:document.getElementById('maD').value,cant:document.getElementById('maCn').value,dest:document.getElementById('maDst').value,est:document.getElementById('maE').value});syncSheet('saveAmbiental',DB.ambiental[DB.ambiental.length-1]);closeM('mAmb');rAmb();toast('Registro ambiental guardado');}

// ══ MANTENIMIENTO ══
let _eqSort='cod';
function setEqSort(s){
  _eqSort=s;
  ['cod','tipo'].forEach(k=>{
    const th=document.getElementById('eqSort'+k.charAt(0).toUpperCase()+k.slice(1)+'Btn');
    if(th){
      th.style.color=k===s?'var(--mec)':'';
      const arrow=th.querySelector('span');
      if(arrow){arrow.textContent=k===s?'↓':'↕';arrow.style.opacity=k===s?'1':'.6';}
    }
  });
  rMaster();
}
function _masterPrintPDF(){
  const equipos=[...DB.equipos].sort((a,b)=>(a.tipo||'').localeCompare(b.tipo||'')||a.codigo.localeCompare(b.codigo));
  if(!equipos.length){toast('Sin equipos para imprimir',true);return;}
  const base=window.location.href.split('index.html')[0];
  const logo=base+'09.-ERP/Imagenes/ECOSERMO-LOGO.png';
  const fecha=new Date().toLocaleDateString('es-PE',{day:'2-digit',month:'long',year:'numeric'});
  const estCol=s=>s==='OPERATIVO'?'#16a34a':s==='INOPERATIVO'?'#dc2626':s==='EN MANTENIMIENTO'?'#d97706':'#475569';

  // Agrupar por tipo
  const tipos=[...new Set(equipos.map(e=>e.tipo||'Sin Tipo'))];
  const grupos=tipos.map(t=>({tipo:t,items:equipos.filter(e=>(e.tipo||'Sin Tipo')===t)}));

  const filas=grupos.map(g=>{
    const header=`<tr><td colspan="11" style="background:#1e3a5f;color:#06b6d4;font-weight:800;font-size:9.5px;letter-spacing:.1em;text-transform:uppercase;padding:5px 8px">${g.tipo} &nbsp;(${g.items.length})</td></tr>`;
    const rows=g.items.map((e,i)=>`<tr style="background:${i%2===0?'#fff':'#f8fafc'}">
      <td style="color:#0369a1;font-weight:700;font-family:monospace;font-size:9px">${e.codigo}</td>
      <td style="font-weight:600;font-size:9.5px">${e.marca||'—'} ${e.modelo||''}</td>
      <td style="font-size:9px;color:#64748b">${e.sub||'—'}</td>
      <td style="text-align:center;font-size:9px;font-family:monospace">${e.anio||'—'}</td>
      <td style="text-align:center;font-size:9px;font-family:monospace">${e.placa||'—'}</td>
      <td style="text-align:right;font-family:monospace;font-size:9px">${fmtN(e.hr)} h</td>
      <td style="text-align:right;font-family:monospace;font-size:9px">${e.km>0?fmtN(e.km)+' km':'—'}</td>
      <td style="text-align:center;font-size:8.5px;font-weight:700;color:${estCol(e.est)}">${e.est||'—'}</td>
      <td style="font-size:9px;color:#7c3aed">${e.proyecto||'—'}</td>
      <td style="text-align:center;font-size:9px">${e.factorUso!=null?Math.round(e.factorUso*100)+'%':'—'}</td>
      <td style="font-size:8.5px;color:#475569;max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${e.proveedor||''}">${e.proveedor||'—'}</td>
    </tr>`).join('');
    return header+rows;
  }).join('');

  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Máster de Equipos – ${fecha}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:'Segoe UI',Arial,sans-serif;font-size:10px;color:#1e293b;padding:14px 18px;}
    .header{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #0ea5e9;padding-bottom:8px;margin-bottom:12px;}
    .logo{height:36px;object-fit:contain;}
    .titulo{font-size:16px;font-weight:900;color:#0f172a;letter-spacing:-.02em;}
    .subtitulo{font-size:9px;color:#64748b;margin-top:2px;}
    .fecha-box{text-align:right;font-size:9px;color:#64748b;}
    table{width:100%;border-collapse:collapse;}
    th{background:#0f172a;color:#e2e8f0;font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;padding:5px 6px;text-align:left;position:sticky;top:0;}
    th.tr{text-align:right;}
    th.tc{text-align:center;}
    td{padding:4px 6px;border-bottom:1px solid #e2e8f0;vertical-align:middle;}
    .footer{margin-top:10px;font-size:8px;color:#94a3b8;display:flex;justify-content:space-between;border-top:1px solid #e2e8f0;padding-top:5px;}
    @media print{@page{size:A3 landscape;margin:10mm;}}
  </style></head><body>
  <div class="header">
    <div style="display:flex;align-items:center;gap:12px">
      <img src="${logo}" class="logo" onerror="this.style.display='none'">
      <div>
        <div class="titulo">Máster de Equipos</div>
        <div class="subtitulo">GDAR – ECOSERMO · Registro completo de flota · Total: ${equipos.length} equipos</div>
      </div>
    </div>
    <div class="fecha-box"><div style="font-size:11px;font-weight:700;color:#0f172a">${fecha}</div><div>Emitido por: ${typeof CU!=='undefined'?CU.nombre:'—'}</div></div>
  </div>
  <table>
    <thead><tr>
      <th>Código</th><th>Marca / Modelo</th><th>Subtipo</th>
      <th class="tc">Año</th><th class="tc">Placa</th>
      <th class="tr">Horómetro</th><th class="tr">Kilometraje</th>
      <th class="tc">Estado</th><th>Proyecto</th><th class="tc">F.Uso</th><th>Proveedor</th>
    </tr></thead>
    <tbody>${filas}</tbody>
  </table>
  <div class="footer">
    <span>GDAR – ECOSERMO ERP · Máster de Equipos</span>
    <span>Generado el ${fecha}</span>
  </div>
  <script>window.onload=()=>{window.print();window.onafterprint=()=>window.close();}<\/script>
  </body></html>`;

  const win=window.open('','_blank');
  if(win){win.document.write(html);win.document.close();}
}

function rMaster(){
  const sorted=[...DB.equipos].sort((a,b)=>_eqSort==='tipo'
    ?(a.tipo||'').localeCompare(b.tipo||'')||a.codigo.localeCompare(b.codigo)
    :a.codigo.localeCompare(b.codigo));
  document.getElementById('tbMaster').innerHTML=sorted.map(e=>`<tr>
    <td class="mono" style="color:var(--mec)">${e.codigo}</td>
    <td><strong>${e.nombre}</strong></td>
    <td><span class="badge b-purple" style="font-size:.65rem">${e.tipo}</span></td>
    <td class="mono">${e.anio||'—'}</td>
    <td class="mono">${e.placa||'—'}</td>
    <td class="tr mono">${fmtN(e.hr)} h</td>
    <td>${bge(e.est)}</td>
    <td><span class="mono" style="font-size:.72rem;color:#a78bfa">${e.proyecto||'—'}</span></td>
    <td style="display:flex;gap:.3rem">
      <button class="btn btn-out btn-sm" title="Ver detalle" onclick="verEquipo(${e.id})" style="color:#3b82f6;border-color:#3b82f660">👁</button>
      <button class="btn btn-out btn-sm" title="Editar" onclick="editEquipo(${e.id})" style="color:#f59e0b;border-color:#f59e0b60">✏️</button>
      <button class="btn btn-del btn-sm" onclick="del('equipos',${e.id})">🗑</button>
    </td>
  </tr>`).join('');
}
// ══ GESTIÓN DE SUBTIPOS ══
function openGestSubtipos(){_renderGestSubtipos();openM('mGestSubtipos');}
function _renderGestSubtipos(){
  const IS='background:var(--panel2);border:1px solid var(--border);border-radius:6px;padding:.3rem .5rem;color:var(--text);font-size:.82rem;flex:1;min-width:0';
  document.getElementById('gestSubtiposBody').innerHTML=DB.subtiposEquipo.map(s=>`
    <div style="display:flex;gap:.35rem;align-items:center">
      <input id="gse${s.id}" value="${s.nombre}" style="${IS}">
      <button class="btn btn-out btn-sm" onclick="gestSaveSubtipo(${s.id})" title="Guardar" style="color:#10b981;border-color:#10b98160;flex-shrink:0">✓</button>
      <button class="btn btn-del btn-sm" onclick="gestDelSubtipo(${s.id})" style="flex-shrink:0">🗑</button>
    </div>`).join('');
}
function gestSaveSubtipo(id){
  const inp=document.getElementById('gse'+id);if(!inp)return;
  const nuevo=inp.value.trim();if(!nuevo){toast('Nombre vacío',true);return;}
  const s=DB.subtiposEquipo.find(x=>x.id===id);if(!s)return;
  const viejo=s.nombre;
  if(viejo===nuevo)return;
  s.nombre=nuevo;
  syncSheet('saveSubtipoEquipo',s);
  // Actualizar equipos que usen este subtipo
  DB.equipos.forEach(e=>{
    if(e.sub===viejo){
      e.sub=nuevo;
      e.nombre=e.nombre.replace(viejo,nuevo);
      syncSheet('saveEquipo',e);
    }
  });
  toast('✓ Subtipo actualizado');
  _renderGestSubtipos();
  // Refrescar el select del formulario si está abierto
  const cur=document.getElementById('eqSub');
  if(cur)_buildEqSubOpts(cur.value===viejo?nuevo:cur.value);
}
function gestDelSubtipo(id){
  const s=DB.subtiposEquipo.find(x=>x.id===id);if(!s)return;
  if(DB.equipos.some(e=>e.sub===s.nombre)){toast('En uso por equipos, no se puede eliminar',true);return;}
  DB.subtiposEquipo=DB.subtiposEquipo.filter(x=>x.id!==id);
  supaDelete('subtiposEquipo',id);
  _renderGestSubtipos();
  toast('Subtipo eliminado');
}
function gestAddSubtipo(){
  const inp=document.getElementById('gestSubNuevo');if(!inp)return;
  const nombre=inp.value.trim();if(!nombre)return;
  if(DB.subtiposEquipo.find(s=>s.nombre===nombre)){toast('Ya existe ese subtipo',true);return;}
  const ns={id:nid('sub'),nombre};
  DB.subtiposEquipo.push(ns);
  syncSheet('saveSubtipoEquipo',ns);
  inp.value='';
  _renderGestSubtipos();
  toast('Subtipo agregado');
}

// ══ AUTOCOMPLETE PROVEEDOR ══
function _eqProvAc(val){
  const drop=document.getElementById('eqProvDrop');if(!drop)return;
  const q=(val||'').trim().toLowerCase();
  if(!q){drop.style.display='none';return;}
  // Extraer proveedores únicos de DB.equipos con sus datos de contacto
  const map={};
  DB.equipos.forEach(e=>{
    if(e.proveedor&&e.proveedor.trim()&&!map[e.proveedor]){
      map[e.proveedor]={ctc:e.contacto||'',cel:e.celular||'',cor:e.correo||''};
    }
  });
  const matches=Object.entries(map).filter(([p])=>p.toLowerCase().includes(q));
  if(!matches.length){drop.style.display='none';return;}
  drop.innerHTML=matches.map(([p,d])=>`
    <div onclick="_eqProvPick('${p.replace(/'/g,"\\'")}','${d.ctc.replace(/'/g,"\\'")}','${d.cel.replace(/'/g,"\\'")}','${d.cor.replace(/'/g,"\\'")}')
    " style="padding:.38rem .6rem;cursor:pointer;font-size:.82rem;border-bottom:1px solid var(--border)"
       onmouseover="this.style.background='var(--panel2)'" onmouseout="this.style.background=''">
      <div style="font-weight:600">${p}</div>
      ${d.ctc?`<div style="font-size:.72rem;color:var(--muted2)">${d.ctc}${d.cel?' · '+d.cel:''}</div>`:''}
    </div>`).join('');
  drop.style.display='block';
}
function _eqProvPick(prov,ctc,cel,cor){
  const set=(id,v)=>{const el=document.getElementById(id);if(el)el.value=v;};
  set('eqProv',prov);set('eqCtc',ctc);set('eqCel',cel);set('eqCor',cor);
  const drop=document.getElementById('eqProvDrop');if(drop)drop.style.display='none';
}

let _eqTab=0,_eqEditId=null;
function _buildEqSubOpts(selectedVal){
  const sel=document.getElementById('eqSub');if(!sel)return;
  sel.innerHTML=DB.subtiposEquipo.map(s=>`<option value="${s.nombre}"${s.nombre===selectedVal?' selected':''}>${s.nombre}</option>`).join('');
  if(selectedVal)sel.value=selectedVal;
}
function openEquipo(){
  _eqEditId=null;
  document.querySelector('#mEquipo .mttl').textContent='Agregar Equipo';
  _eqTab=0;eqGoTab(0);
  ['eqCod','eqMa','eqMo','eqAn','eqPl',
   'eqNs','eqPhp','eqCm3','eqPkg','eqDim','eqUbi','eqFll','eqFls','eqSoat','eqPtr','eqRtec','eqGps',
   'eqProv','eqCtc','eqCel','eqCor','eqHmin','eqTar','eqIco','eqTco',
   'eqCcg','eqCce','eqCcrn','eqCcmp','eqCcmc'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('eqHr').value=0;
  document.getElementById('eqKm').value=0;
  document.getElementById('eqTi').value='Línea Amarilla';
  document.getElementById('eqEst').value='Operativo';
  const sts=document.getElementById('eqSts');if(sts)sts.value='';
  _buildEqSubOpts('');
  const ps=document.getElementById('eqProy');
  if(ps)ps.innerHTML='<option value="">— Sin proyecto —</option>'+DB.proyectos.map(p=>`<option value="${p.codigo}">${p.codigo}${p.nombre?' – '+p.nombre:''}</option>`).join('');
  _renderEqMedia(null,null);
  openM('mEquipo');
}
function eqGoTab(n){
  _eqTab=n;
  [0,1,2,3].forEach(i=>{
    const p=document.getElementById('eqP'+i),t=document.getElementById('eqTab'+i);
    if(p)p.style.display=i===n?'grid':'none';
    if(t)t.classList.toggle('eq-tab-act',i===n);
  });
  const p4=document.getElementById('eqP4'),t4=document.getElementById('eqTab4');
  if(p4)p4.style.display=n===4?'block':'none';
  if(t4)t4.classList.toggle('eq-tab-act',n===4);
  const prev=document.getElementById('eqBPrev'),next=document.getElementById('eqBNext'),save=document.getElementById('eqBSave');
  if(prev)prev.style.display=n>0?'':'none';
  if(next)next.style.display=n<4?'':'none';
  if(save)save.style.display=n===3||n===4?'':'none';
}
const _EQ_BUCKET='Equip_eco26';
function _renderEqMedia(imagenes,documentos){
  const lock=document.getElementById('eqMediaLock'),content=document.getElementById('eqMediaContent');
  if(!_eqEditId){if(lock)lock.style.display='block';if(content)content.style.display='none';return;}
  if(lock)lock.style.display='none';if(content)content.style.display='block';
  const imgs=Array.isArray(imagenes)?imagenes:(typeof imagenes==='string'&&imagenes?JSON.parse(imagenes):[]);
  const docs=Array.isArray(documentos)?documentos:(typeof documentos==='string'&&documentos?JSON.parse(documentos):[]);
  const gallery=document.getElementById('eqImgGallery');
  if(gallery)gallery.innerHTML=imgs.length?imgs.map((img,i)=>`
    <div style="position:relative;width:90px;height:90px">
      <img src="${img.url}" style="width:90px;height:90px;object-fit:cover;border-radius:7px;border:1px solid var(--border);cursor:pointer" onclick="window.open('${img.url}','_blank')" title="${img.nombre||''}">
      <button onclick="eqDelImg(${i})" style="position:absolute;top:2px;right:2px;background:rgba(0,0,0,.7);border:none;color:#ef4444;border-radius:4px;width:20px;height:20px;font-size:.65rem;cursor:pointer;line-height:1">✕</button>
    </div>`).join(''):'<span style="font-size:.72rem;color:var(--muted2);opacity:.6">Sin imágenes</span>';
  const docList=document.getElementById('eqDocList');
  const docIcon=n=>{const ext=(n||'').split('.').pop().toLowerCase();return ext==='pdf'?'📄':['xls','xlsx'].includes(ext)?'📊':['doc','docx'].includes(ext)?'📝':'📎';};
  if(docList)docList.innerHTML=docs.length?docs.map((d,i)=>`
    <div style="display:flex;align-items:center;gap:.5rem;background:var(--panel2);border:1px solid var(--border);border-radius:7px;padding:.4rem .7rem">
      <span style="font-size:1.1rem">${docIcon(d.nombre)}</span>
      <span style="font-size:.72rem;flex:1"><strong>${d.tipo||'Documento'}</strong><br><span style="color:var(--muted2)">${d.nombre||''}</span></span>
      <span style="font-size:.65rem;color:var(--muted2)">${d.fecha||''}</span>
      <a href="${d.url}" target="_blank" class="btn btn-sm btn-out" style="font-size:.65rem;padding:2px 8px">↓</a>
      <button onclick="eqDelDoc(${i})" class="btn btn-del btn-sm" style="font-size:.65rem;padding:2px 7px">🗑</button>
    </div>`).join(''):'<span style="font-size:.72rem;color:var(--muted2);opacity:.6">Sin documentos</span>';
}
async function eqUploadImgs(input){
  if(!_eqEditId){toast('Guarda el equipo primero',true);input.value='';return;}
  const files=[...input.files];if(!files.length)return;
  const st=document.getElementById('eqImgStatus');if(st)st.textContent='Subiendo...';
  const eq=DB.equipos.find(e=>e.id===_eqEditId);if(!eq)return;
  const imgs=eq.imagenes?(typeof eq.imagenes==='string'?JSON.parse(eq.imagenes):eq.imagenes):[];
  for(const file of files){
    const ext=file.name.split('.').pop();
    const path=`equipos/${_eqEditId}/imgs/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const{error}=await supa.storage.from(_EQ_BUCKET).upload(path,file,{upsert:false});
    if(error){toast('Error: '+error.message,true);continue;}
    const{data:{publicUrl}}=supa.storage.from(_EQ_BUCKET).getPublicUrl(path);
    imgs.push({url:publicUrl,path,nombre:file.name});
  }
  eq.imagenes=JSON.stringify(imgs);
  syncSheet('saveEquipo',eq);
  _renderEqMedia(imgs,eq.documentos);
  if(st)st.textContent='';input.value='';
  toast(`${files.length} foto(s) subida(s)`);
}
async function eqUploadDoc(input){
  if(!_eqEditId){toast('Guarda el equipo primero',true);input.value='';return;}
  const file=input.files[0];if(!file)return;
  const tipo=document.getElementById('eqDocTipo')?.value||'Documento';
  const st=document.getElementById('eqDocStatus');if(st)st.textContent='Subiendo...';
  const eq=DB.equipos.find(e=>e.id===_eqEditId);if(!eq)return;
  const docs=eq.documentos?(typeof eq.documentos==='string'?JSON.parse(eq.documentos):eq.documentos):[];
  const ext=file.name.split('.').pop();
  const path=`equipos/${_eqEditId}/docs/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
  const{error}=await supa.storage.from(_EQ_BUCKET).upload(path,file,{upsert:false});
  if(error){toast('Error: '+error.message,true);if(st)st.textContent='';input.value='';return;}
  const{data:{publicUrl}}=supa.storage.from(_EQ_BUCKET).getPublicUrl(path);
  const today_=new Date().toLocaleDateString('es-PE');
  docs.push({url:publicUrl,path,nombre:file.name,tipo,fecha:today_});
  eq.documentos=JSON.stringify(docs);
  syncSheet('saveEquipo',eq);
  _renderEqMedia(eq.imagenes,docs);
  if(st)st.textContent='';input.value='';
  toast('Documento subido: '+tipo);
}
async function eqDelImg(idx){
  if(!_eqEditId)return;
  const eq=DB.equipos.find(e=>e.id===_eqEditId);if(!eq)return;
  const imgs=typeof eq.imagenes==='string'?JSON.parse(eq.imagenes):eq.imagenes||[];
  const img=imgs[idx];if(!img)return;
  await supa.storage.from(_EQ_BUCKET).remove([img.path]);
  imgs.splice(idx,1);
  eq.imagenes=JSON.stringify(imgs);
  syncSheet('saveEquipo',eq);
  _renderEqMedia(imgs,eq.documentos);
  toast('Imagen eliminada');
}
async function eqDelDoc(idx){
  if(!_eqEditId)return;
  const eq=DB.equipos.find(e=>e.id===_eqEditId);if(!eq)return;
  const docs=typeof eq.documentos==='string'?JSON.parse(eq.documentos):eq.documentos||[];
  const doc=docs[idx];if(!doc)return;
  await supa.storage.from(_EQ_BUCKET).remove([doc.path]);
  docs.splice(idx,1);
  eq.documentos=JSON.stringify(docs);
  syncSheet('saveEquipo',eq);
  _renderEqMedia(eq.imagenes,docs);
  toast('Documento eliminado');
}
function gEquipo(){
  const cod=document.getElementById('eqCod').value.trim();
  if(!cod){toast('Ingrese el código del equipo',true);eqGoTab(0);return;}
  const sub=document.getElementById('eqSub').value;
  const eq={
    id:nid('eq'),codigo:cod,
    nombre:(sub+' '+document.getElementById('eqMa').value+' '+document.getElementById('eqMo').value).trim(),
    tipo:document.getElementById('eqTi').value,
    sub,
    marca:document.getElementById('eqMa').value,
    modelo:document.getElementById('eqMo').value,
    anio:+document.getElementById('eqAn').value||2020,
    placa:document.getElementById('eqPl').value,
    hr:+document.getElementById('eqHr').value||0,
    km:+document.getElementById('eqKm').value||0,
    est:document.getElementById('eqEst').value,
    numSerie:document.getElementById('eqNs').value,
    potenciaHp:+document.getElementById('eqPhp').value||null,
    capacidadM3:+document.getElementById('eqCm3').value||null,
    pesoKg:+document.getElementById('eqPkg').value||null,
    dimensiones:document.getElementById('eqDim').value,
    ubicacion:document.getElementById('eqUbi').value,
    fechaLlegada:document.getElementById('eqFll').value||null,
    fechaSalida:document.getElementById('eqFls').value||null,
    status:document.getElementById('eqSts').value,
    soat:document.getElementById('eqSoat').value,
    polizaTrec:document.getElementById('eqPtr').value,
    revisionTecnica:document.getElementById('eqRtec').value,
    gps:document.getElementById('eqGps').value,
    proveedor:document.getElementById('eqProv').value,
    contacto:document.getElementById('eqCtc').value,
    celular:document.getElementById('eqCel').value,
    correo:document.getElementById('eqCor').value,
    horasMinimas:+document.getElementById('eqHmin').value||null,
    tarifa:+document.getElementById('eqTar').value||null,
    inicioContrato:document.getElementById('eqIco').value||null,
    terminoContrato:document.getElementById('eqTco').value||null,
    ccGets:+document.getElementById('eqCcg').value||null,
    ccEngrase:+document.getElementById('eqCce').value||null,
    ccRellenoNiveles:+document.getElementById('eqCcrn').value||null,
    ccMantPreventivo:+document.getElementById('eqCcmp').value||null,
    ccMantCorrectivo:+document.getElementById('eqCcmc').value||null,
    proyecto:document.getElementById('eqProy').value||null,
    ultMant:null,proxMant:null
  };
  if(_eqEditId!==null){
    const idx=DB.equipos.findIndex(x=>x.id===_eqEditId);
    if(idx>-1){DB.equipos[idx]={...DB.equipos[idx],...eq,id:_eqEditId};syncSheet('saveEquipo',DB.equipos[idx]);}
    _eqEditId=null;
    document.querySelector('#mEquipo .mttl').textContent='Agregar Equipo';
    closeM('mEquipo');rMaster();toast('Equipo actualizado');
  }else{
    DB.equipos.push(eq);
    syncSheet('saveEquipo',eq);
    closeM('mEquipo');rMaster();toast('Equipo agregado');
  }
}
let _verEqId=null;
function verEquipo(id){
  _verEqId=id;
  const e=DB.equipos.find(x=>x.id===id);if(!e)return;
  const row=(l,v)=>`<div style="padding:.26rem 0;border-bottom:1px solid var(--border)"><div style="color:var(--muted2);font-size:.7rem">${l}</div><div style="font-weight:600;font-size:.82rem">${v||'—'}</div></div>`;
  const sec=(t)=>`<div style="grid-column:1/-1;background:var(--mec);color:#fff;font-size:.68rem;font-weight:700;padding:.22rem .6rem;border-radius:4px;margin:.5rem 0 .1rem;letter-spacing:.06em;text-transform:uppercase">${t}</div>`;
  document.getElementById('eqVerTtl').textContent='🔍 '+e.codigo+' – '+e.nombre;
  document.getElementById('eqVerBody').innerHTML=`
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 1.2rem;">
    ${sec('Generales')}
    ${row('Código',e.codigo)}${row('Tipo / Línea',e.tipo)}
    ${row('Subtipo',e.sub)}${row('Marca',e.marca)}
    ${row('Modelo',e.modelo)}${row('Año',e.anio)}
    ${row('Placa',e.placa)}${row('Horómetro',fmtN(e.hr)+' h')}
    ${row('Kilometraje',e.km!=null&&e.km>0?fmtN(e.km)+' km':null)}${row('Estado',e.est)}
    ${row('Proyecto',e.proyecto)}
    ${sec('Técnicos')}
    ${row('N° de Serie',e.numSerie)}${row('Potencia HP',e.potenciaHp!=null?e.potenciaHp+' HP':null)}
    ${row('Capacidad M³',e.capacidadM3)}${row('Peso KG',e.pesoKg!=null?fmtN(e.pesoKg)+' kg':null)}
    ${row('Dimensiones',e.dimensiones)}${row('Ubicación',e.ubicacion)}
    ${row('F. Llegada',e.fechaLlegada)}${row('F. Salida',e.fechaSalida)}
    ${row('Status',e.status)}${row('SOAT',e.soat)}
    ${row('P. TREC',e.polizaTrec)}${row('Rev. Técnica',e.revisionTecnica)}
    ${row('GPS',e.gps)}
    ${sec('Contrato / Proveedor')}
    ${row('Proveedor',e.proveedor)}${row('Contacto',e.contacto)}
    ${row('Celular',e.celular)}${row('Correo',e.correo)}
    ${row('H. Mínimas',e.horasMinimas!=null?fmtN(e.horasMinimas)+' h':null)}${row('Tarifa S/.',e.tarifa?fmt(e.tarifa):null)}
    ${row('Inicio Contrato',e.inicioContrato)}${row('Término Contrato',e.terminoContrato)}
    ${sec('Costos Mantenimiento')}
    ${row("CC GET'S",e.ccGets?fmt(e.ccGets):null)}${row('CC Engrase',e.ccEngrase?fmt(e.ccEngrase):null)}
    ${row('CC Relleno Niveles',e.ccRellenoNiveles?fmt(e.ccRellenoNiveles):null)}${row('CC Mant. Preventivo',e.ccMantPreventivo?fmt(e.ccMantPreventivo):null)}
    ${row('CC Mant. Correctivo',e.ccMantCorrectivo?fmt(e.ccMantCorrectivo):null)}
  </div>`;
  openM('mEqVer');
}
function printEquipoFicha(){
  const e=DB.equipos.find(x=>x.id===_verEqId);if(!e)return;
  const base=window.location.href.split('index.html')[0];
  const logo=base+'09.-ERP/Imagenes/ECOSERMO-LOGO.png';
  const row=(l,v)=>v?`<tr><td class="lbl">${l}</td><td>${v}</td></tr>`:'';
  const sec=(t)=>`<tr><td colspan="2" class="sec">${t}</td></tr>`;
  const imgs=Array.isArray(e.imagenes)?e.imagenes:(typeof e.imagenes==='string'&&e.imagenes?JSON.parse(e.imagenes):[]);
  const docs=Array.isArray(e.documentos)?e.documentos:(typeof e.documentos==='string'&&e.documentos?JSON.parse(e.documentos):[]);
  const imgHtml=imgs.length?'<div class="sec-title">IMÁGENES</div><div class="gallery">'+imgs.map(function(u){return '<img src="'+u+'" onerror="this.style.display=\'none\'">';}).join('')+'</div>':'';
  const docHtml=docs.length?'<div class="sec-title">DOCUMENTOS</div><ul class="doc-list">'+docs.map(function(d){return '<li><b>'+(d.tipo||'Archivo')+'</b> &mdash; '+(d.nombre||d.url||'')+'</li>';}).join('')+'</ul>':'';
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Ficha Técnica – ${e.codigo}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'Segoe UI',Arial,sans-serif;font-size:11px;color:#1a1a2e;padding:18px 24px;}
  .header{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #0ea5e9;padding-bottom:10px;margin-bottom:14px;}
  .header-left .title{font-size:20px;font-weight:700;color:#0369a1;letter-spacing:.03em;}
  .header-left .subtitle{font-size:12px;color:#475569;margin-top:3px;}
  .header-left .equipo{font-size:14px;font-weight:600;color:#1e293b;margin-top:5px;}
  .header-right img{height:56px;object-fit:contain;}
  .header-right .fecha{font-size:10px;color:#94a3b8;text-align:right;margin-top:4px;}
  table{width:100%;border-collapse:collapse;margin-bottom:12px;}
  td{padding:4px 6px;border-bottom:1px solid #e2e8f0;vertical-align:top;}
  td.lbl{color:#64748b;width:38%;font-size:10.5px;}
  td.sec{background:#0369a1;color:#fff;font-size:10px;font-weight:700;padding:4px 8px;letter-spacing:.07em;text-transform:uppercase;}
  .gallery{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0 14px;}
  .gallery img{width:130px;height:90px;object-fit:cover;border-radius:4px;border:1px solid #cbd5e1;}
  .sec-title{font-size:10px;font-weight:700;color:#0369a1;text-transform:uppercase;letter-spacing:.07em;margin:10px 0 4px;}
  .doc-list{padding-left:16px;margin-bottom:12px;}
  .doc-list li{padding:2px 0;font-size:10.5px;}
  .footer{margin-top:18px;border-top:1px solid #e2e8f0;padding-top:8px;display:flex;justify-content:space-between;font-size:9.5px;color:#94a3b8;}
  @media print{body{padding:1cm}button{display:none}}
</style></head><body>
<div class="header">
  <div class="header-left">
    <div class="title">FICHA TÉCNICA DE EQUIPO</div>
    <div class="subtitle">ECOSERMO – Sistema de Control de Equipos – GDAR</div>
    <div class="equipo">${e.codigo} &nbsp;·&nbsp; ${e.nombre||''}</div>
  </div>
  <div class="header-right">
    <img src="${logo}" alt="ECOSERMO">
    <div class="fecha">Impreso: ${today()}</div>
  </div>
</div>
<table>
  ${sec('Generales')}
  ${row('Código',e.codigo)}${row('Tipo / Línea',e.tipo)}${row('Subtipo',e.sub)}
  ${row('Marca',e.marca)}${row('Modelo',e.modelo)}${row('Año',e.anio)}
  ${row('Placa',e.placa)}${row('Horómetro',e.hr!=null?fmtN(e.hr)+' h':null)}${row('Kilometraje',e.km>0?fmtN(e.km)+' km':null)}
  ${row('Estado',e.est)}${row('Proyecto',e.proyecto)}
  ${sec('Técnicos')}
  ${row('N° de Serie',e.numSerie)}${row('Potencia HP',e.potenciaHp)}
  ${row('Capacidad M³',e.capacidadM3)}${row('Peso KG',e.pesoKg)}
  ${row('Dimensiones',e.dimensiones)}${row('Ubicación',e.ubicacion)}
  ${row('F. Llegada',e.fechaLlegada)}${row('F. Salida',e.fechaSalida)}
  ${row('Status',e.status)}${row('SOAT',e.soat)}
  ${row('Póliza TREC',e.polizaTrec)}${row('Rev. Técnica',e.revisionTecnica)}${row('GPS',e.gps)}
  ${sec('Contrato / Proveedor')}
  ${row('Proveedor',e.proveedor)}${row('Contacto',e.contacto)}
  ${row('Celular',e.celular)}${row('Correo',e.correo)}
  ${row('Horas Mínimas',e.horasMinimas!=null?fmtN(e.horasMinimas)+' h':null)}
  ${row('Tarifa S/.',e.tarifa?fmt(e.tarifa):null)}
  ${row('Inicio Contrato',e.inicioContrato)}${row('Término Contrato',e.terminoContrato)}
  ${sec('Costos de Mantenimiento')}
  ${row("CC GET'S",e.ccGets?fmt(e.ccGets):null)}${row('CC Engrase',e.ccEngrase?fmt(e.ccEngrase):null)}
  ${row('CC Relleno Niveles',e.ccRellenoNiveles?fmt(e.ccRellenoNiveles):null)}
  ${row('CC Mant. Preventivo',e.ccMantPreventivo?fmt(e.ccMantPreventivo):null)}
  ${row('CC Mant. Correctivo',e.ccMantCorrectivo?fmt(e.ccMantCorrectivo):null)}
</table>
${imgHtml}${docHtml}
<div class="footer">
  <span>Sistema GDAR – ECOSERMO S.A.C.</span>
  <span>${e.codigo} | Generado: ${today()}</span>
</div>
<script>window.onload=()=>{window.print();}<\/script></body></html>`;
  const w=window.open('','_blank','width=900,height=700');
  if(!w){toast('Permite ventanas emergentes en este sitio para exportar PDF',true);return;}
  w.document.write(html);
  w.document.close();
}
function editEquipo(id){
  const e=DB.equipos.find(x=>x.id===id);if(!e)return;
  openEquipo();
  _eqEditId=id;
  document.querySelector('#mEquipo .mttl').textContent='✏️ Editar Equipo: '+e.codigo;
  // Tab 0
  document.getElementById('eqCod').value=e.codigo||'';
  document.getElementById('eqTi').value=e.tipo||'Línea Amarilla';
  _buildEqSubOpts(e.sub||'');
  document.getElementById('eqMa').value=e.marca||'';
  document.getElementById('eqMo').value=e.modelo||'';
  document.getElementById('eqAn').value=e.anio||'';
  document.getElementById('eqPl').value=e.placa||'';
  document.getElementById('eqHr').value=e.hr||0;
  document.getElementById('eqKm').value=e.km||0;
  document.getElementById('eqEst').value=e.est||'Operativo';
  document.getElementById('eqProy').value=e.proyecto||'';
  // Tab 1
  document.getElementById('eqNs').value=e.numSerie||'';
  document.getElementById('eqPhp').value=e.potenciaHp||'';
  document.getElementById('eqCm3').value=e.capacidadM3||'';
  document.getElementById('eqPkg').value=e.pesoKg||'';
  document.getElementById('eqDim').value=e.dimensiones||'';
  document.getElementById('eqUbi').value=e.ubicacion||'';
  document.getElementById('eqFll').value=e.fechaLlegada||'';
  document.getElementById('eqFls').value=e.fechaSalida||'';
  document.getElementById('eqSts').value=e.status||'';
  document.getElementById('eqSoat').value=e.soat||'';
  document.getElementById('eqPtr').value=e.polizaTrec||'';
  document.getElementById('eqRtec').value=e.revisionTecnica||'';
  document.getElementById('eqGps').value=e.gps||'';
  // Tab 2
  document.getElementById('eqProv').value=e.proveedor||'';
  document.getElementById('eqCtc').value=e.contacto||'';
  document.getElementById('eqCel').value=e.celular||'';
  document.getElementById('eqCor').value=e.correo||'';
  document.getElementById('eqHmin').value=e.horasMinimas||'';
  document.getElementById('eqTar').value=e.tarifa||'';
  document.getElementById('eqIco').value=e.inicioContrato||'';
  document.getElementById('eqTco').value=e.terminoContrato||'';
  // Tab 3
  document.getElementById('eqCcg').value=e.ccGets||'';
  document.getElementById('eqCce').value=e.ccEngrase||'';
  document.getElementById('eqCcrn').value=e.ccRellenoNiveles||'';
  document.getElementById('eqCcmp').value=e.ccMantPreventivo||'';
  document.getElementById('eqCcmc').value=e.ccMantCorrectivo||'';
  // Tab 4 - Media
  _renderEqMedia(e.imagenes,e.documentos);
}
let _mantEditId=null;
function _genOT(){
  const yy=String(new Date().getFullYear()).slice(-2);
  const seq=String(DB.mantenimientos.length+1).padStart(3,'0');
  return`OT-${seq}-${yy}`;
}
function openMant(){
  _mantEditId=null;
  document.getElementById('mMantTtl').textContent='Programar Mantenimiento';
  ['otDe','otFp','otFe'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('otN').value=_genOT();
  document.getElementById('otHs').value=0;
  const eq=document.getElementById('otEq');if(eq)eq.selectedIndex=0;
  const ti=document.getElementById('otTi');if(ti)ti.selectedIndex=0;
  const mc=document.getElementById('otMec');if(mc)mc.selectedIndex=0;
  const es=document.getElementById('otEs');if(es)es.value='Programado';
  openM('mMant');
}
function rProg(){
  const pen=DB.mantenimientos.filter(m=>m.est==='Programado').length,proc=DB.mantenimientos.filter(m=>m.est==='En Proceso').length,comp=DB.mantenimientos.filter(m=>m.est==='Completado').length;
  const total=DB.mantenimientos.length;
  document.getElementById('progKpis').innerHTML=[
    {l:'Programados',v:pen,c:'#3b82f6',ic:'📅',sub:'órdenes pendientes'},
    {l:'En Proceso',v:proc,c:'#f59e0b',ic:'🔄',sub:'en ejecución'},
    {l:'Completados',v:comp,c:'#10b981',ic:'✅',sub:'finalizados'},
    {l:'Total OT',v:total,c:'#8b5cf6',ic:'📋',sub:'órdenes registradas'}
  ].map(k=>`<div style="background:var(--panel);border:1px solid var(--border);border-top:3px solid ${k.c};border-radius:10px;padding:.85rem 1.1rem;flex:1;min-width:150px">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:.5rem">
      <span style="font-size:.67rem;text-transform:uppercase;letter-spacing:.08em;color:var(--muted2);font-weight:600">${k.l}</span>
      <span style="font-size:1.3rem;line-height:1;opacity:.75">${k.ic}</span>
    </div>
    <div style="font-size:2.4rem;font-weight:800;color:${k.c};line-height:1;margin-bottom:.25rem">${k.v}</div>
    <div style="font-size:.68rem;color:var(--muted2)">${k.sub}</div>
  </div>`).join('');
  const fd=document.getElementById('progFDesde')?document.getElementById('progFDesde').value:'';
  const fh=document.getElementById('progFHasta')?document.getElementById('progFHasta').value:'';
  const rows=DB.mantenimientos.filter(r=>{
    if(fd&&r.fp&&r.fp<fd)return false;
    if(fh&&r.fp&&r.fp>fh)return false;
    return true;
  });
  document.getElementById('tbProg').innerHTML=rows.map(r=>{
    const eq=DB.equipos.find(e=>e.id===r.eqId);
    const proy=eq?eq.proyecto||'—':'—';
    return`<tr>
      <td class="mono" style="color:var(--mec)">${r.ot}</td>
      <td>${eq?eq.codigo+' '+eq.nombre.split(' ').slice(0,2).join(' '):''}</td>
      <td><span class="badge b-purple" style="font-size:.65rem">${r.tipo}</span></td>
      <td style="font-size:.8rem">${r.desc}</td>
      <td style="font-size:.8rem">${r.mec}</td>
      <td class="mono">${r.fp}</td>
      <td class="mono">${r.fe||'—'}</td>
      <td class="mono tr">${fmtN(r.hs)}</td>
      <td>${bge(r.est)}</td>
      <td><span class="mono" style="font-size:.72rem;color:#a78bfa">${proy}</span></td>
      <td style="display:flex;gap:.3rem">
        <button class="btn btn-out btn-sm" title="Ver detalle" onclick="verMant(${r.id})" style="color:#3b82f6;border-color:#3b82f660">👁</button>
        <button class="btn btn-out btn-sm" title="Editar" onclick="editMant(${r.id})" style="color:#f59e0b;border-color:#f59e0b60">✏️</button>
        <button class="btn btn-del btn-sm" onclick="del('mantenimientos',${r.id})">🗑</button>
      </td>
    </tr>`;
  }).join('');
}
function verMant(id){
  const r=DB.mantenimientos.find(x=>x.id===id);if(!r)return;
  const eq=DB.equipos.find(e=>e.id===r.eqId);
  const proy=eq?eq.proyecto||'—':'—';
  document.getElementById('mantVerTtl').textContent=`🔍 ${r.ot}`;
  document.getElementById('mantVerBody').innerHTML=`
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:.6rem 1.2rem">
      <div><span style="color:var(--muted2);font-size:.72rem">OT N°</span><div class="mono" style="color:var(--mec);font-size:.95rem;font-weight:700">${r.ot}</div></div>
      <div><span style="color:var(--muted2);font-size:.72rem">Estado</span><div style="margin-top:.15rem">${bge(r.est)}</div></div>
      <div><span style="color:var(--muted2);font-size:.72rem">Equipo</span><div>${eq?`<span class="mono" style="color:var(--mec)">${eq.codigo}</span> ${eq.nombre}`:'—'}</div></div>
      <div><span style="color:var(--muted2);font-size:.72rem">Proyecto</span><div class="mono" style="color:#a78bfa">${proy}</div></div>
      <div><span style="color:var(--muted2);font-size:.72rem">Tipo Mantenimiento</span><div><span class="badge b-purple" style="font-size:.65rem">${r.tipo}</span></div></div>
      <div><span style="color:var(--muted2);font-size:.72rem">Mecánico Responsable</span><div>${r.mec||'—'}</div></div>
      <div style="grid-column:1/-1"><span style="color:var(--muted2);font-size:.72rem">Descripción del Trabajo</span><div style="margin-top:.2rem;padding:.5rem .7rem;background:var(--panel2);border-radius:6px;line-height:1.5">${r.desc||'—'}</div></div>
      <div><span style="color:var(--muted2);font-size:.72rem">F. Programada</span><div class="mono">${r.fp||'—'}</div></div>
      <div><span style="color:var(--muted2);font-size:.72rem">F. Ejecución Real</span><div class="mono">${r.fe||'—'}</div></div>
      <div><span style="color:var(--muted2);font-size:.72rem">Hs / Km Programado</span><div class="mono">${fmtN(r.hs)} h</div></div>
    </div>`;
  openM('mMantVer');
}
function editMant(id){
  const r=DB.mantenimientos.find(x=>x.id===id);if(!r)return;
  _mantEditId=id;
  document.getElementById('mMantTtl').textContent='Editar OT';
  document.getElementById('otN').value=r.ot||'';
  const eq=document.getElementById('otEq');if(eq)eq.value=r.eqId||'';
  const ti=document.getElementById('otTi');if(ti)ti.value=r.tipo||'';
  document.getElementById('otDe').value=r.desc||'';
  const mc=document.getElementById('otMec');if(mc)mc.value=r.mec||'';
  document.getElementById('otFp').value=r.fp||'';
  document.getElementById('otFe').value=r.fe||'';
  document.getElementById('otHs').value=r.hs||0;
  const es=document.getElementById('otEs');if(es)es.value=r.est||'Programado';
  openM('mMant');
}
function gMant(){
  const eqId=+document.getElementById('otEq').value;
  if(!eqId){toast('Seleccione equipo',true);return;}
  const data={ot:document.getElementById('otN').value||_genOT(),eqId,tipo:document.getElementById('otTi').value,desc:document.getElementById('otDe').value,mec:document.getElementById('otMec').value,fp:document.getElementById('otFp').value||today(),fe:document.getElementById('otFe').value||null,hs:+document.getElementById('otHs').value||0,est:document.getElementById('otEs').value};
  if(_mantEditId!==null){
    const idx=DB.mantenimientos.findIndex(x=>x.id===_mantEditId);
    if(idx>-1){DB.mantenimientos[idx]={...DB.mantenimientos[idx],...data,id:_mantEditId};syncSheet('saveMantenimiento',DB.mantenimientos[idx]);}
    _mantEditId=null;
    document.getElementById('mMantTtl').textContent='Programar Mantenimiento';
    closeM('mMant');rProg();toast('OT actualizada');
  }else{
    const rec={id:nid('mant'),...data};
    DB.mantenimientos.push(rec);
    syncSheet('saveMantenimiento',rec);
    closeM('mMant');rProg();toast('Mantenimiento programado');
  }
}
function printProgGantt(){
  const fdEl=document.getElementById('progFDesde'),fhEl=document.getElementById('progFHasta');
  let desde=fdEl?fdEl.value:'',hasta=fhEl?fhEl.value:'';
  if(!desde||!hasta){
    const now=new Date(),dow=now.getDay()||7;
    const mon=new Date(now);mon.setDate(now.getDate()-dow+1);
    const sun=new Date(mon);sun.setDate(mon.getDate()+6);
    if(!desde)desde=mon.toISOString().slice(0,10);
    if(!hasta)hasta=sun.toISOString().slice(0,10);
  }
  const rows=DB.mantenimientos.filter(r=>r.fp&&r.fp>=desde&&r.fp<=hasta);
  const days=[];
  let dc=new Date(desde+'T12:00:00');const endD=new Date(hasta+'T12:00:00');
  while(dc<=endD){days.push(dc.toISOString().slice(0,10));dc.setDate(dc.getDate()+1);}
  const DN=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  const SC={'Programado':{bg:'#dbeafe',tx:'#1e40af',bar:'#3b82f6'},'En Proceso':{bg:'#fef3c7',tx:'#92400e',bar:'#f59e0b'},'Completado':{bg:'#d1fae5',tx:'#065f46',bar:'#10b981'},'Postergado':{bg:'#f3f4f6',tx:'#374151',bar:'#9ca3af'}};
  const wk=(ds)=>{const d=new Date(ds+'T12:00:00'),j4=new Date(d.getFullYear(),0,4),w1=new Date(j4);w1.setDate(j4.getDate()-(j4.getDay()||7)+1);return Math.ceil(((d-w1)/86400000+1)/7);};
  const semana=wk(desde);
  const dayHdrs=days.map(day=>{const d=new Date(day+'T12:00:00');return`<th style="text-align:center;width:38px;padding:3px 1px;font-size:8.5px;background:#1e3a5f;color:#fff"><div>${DN[d.getDay()]}</div><div style="opacity:.8;font-size:8px">${day.slice(5).replace('-','/')}</div></th>`;}).join('');
  const summaryRows=rows.map(r=>{
    const eq=DB.equipos.find(e=>e.id===r.eqId),sc=SC[r.est]||SC['Postergado'],proy=eq?eq.proyecto||'—':'—';
    return`<tr><td style="font-weight:700;color:#1e3a5f;white-space:nowrap">${r.ot}</td><td>${eq?eq.codigo+' '+eq.nombre.split(' ').slice(0,2).join(' '):'—'}</td><td>${r.tipo}</td><td style="font-size:9px">${r.desc||'—'}</td><td>${r.mec||'—'}</td><td style="text-align:center">${r.fp||'—'}</td><td style="text-align:center">${r.fe||'—'}</td><td style="text-align:right">${r.hs||0} h</td><td><span style="background:${sc.bg};color:${sc.tx};padding:2px 5px;border-radius:3px;font-size:8.5px;font-weight:700">${r.est}</span></td><td style="color:#7c3aed;font-size:9px">${proy}</td></tr>`;
  }).join('');
  const ganttRows=rows.map(r=>{
    const eq=DB.equipos.find(e=>e.id===r.eqId),sc=SC[r.est]||SC['Postergado'];
    const fe=r.fe||r.fp||'';
    const cells=days.map(day=>{
      const active=r.fp&&day>=r.fp&&day<=fe;
      return active?`<td style="background:${sc.bar};padding:0;border:1px solid ${sc.bar}"></td>`:`<td style="border:1px solid #e2e8f0"></td>`;
    }).join('');
    return`<tr><td style="font-weight:700;font-size:9.5px;white-space:nowrap;color:#1e3a5f">${r.ot}</td><td style="font-size:9px">${eq?eq.codigo+' '+eq.nombre.split(' ').slice(0,2).join(' '):'—'}</td><td style="font-size:9px">${r.mec||'—'}</td><td><span style="background:${sc.bg};color:${sc.tx};padding:1px 4px;border-radius:2px;font-size:8px;font-weight:700">${r.est}</span></td>${cells}</tr>`;
  }).join('');
  const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Programación Semana ${semana}</title>
<style>@page{size:A4 landscape;margin:1cm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:10px;color:#111;margin:0}
.hdr{display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #1e3a5f;padding-bottom:7px;margin-bottom:9px;gap:1rem}
.hdr-logo{flex:0 0 auto}.hdr-logo img{height:52px;object-fit:contain}
.hdr-mid{flex:1;text-align:center}.hdr-mid h1{font-size:15px;color:#1e3a5f;margin:0 0 2px;font-weight:700}.hdr-mid p{font-size:9px;color:#64748b;margin:0}
.hdr-info{flex:0 0 auto;text-align:right;font-size:8.5px;color:#94a3b8}
table{width:100%;border-collapse:collapse}th{background:#1e3a5f;color:#fff;padding:4px 6px;text-align:left;font-size:9px}
td{border:1px solid #e2e8f0;padding:3px 5px;vertical-align:middle}tr:nth-child(even) td{background:#f8fafc}
.gantt td{height:22px}.sec{font-size:11px;font-weight:700;color:#1e3a5f;margin:10px 0 4px;border-bottom:2px solid #1e3a5f;padding-bottom:3px}
.legend{display:flex;gap:8px;margin-top:6px;font-size:8.5px;align-items:center}
.ld{width:10px;height:10px;border-radius:2px;display:inline-block}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>
<div class="hdr">
  <div class="hdr-logo"><img src="__LOGO__" alt="Ecosermo"></div>
  <div class="hdr-mid"><h1>PROGRAMACIÓN DE MANTENIMIENTO</h1><p>ECOSERMO – Sistema de Control de Mantenimiento Mecánico – GDAR</p></div>
  <div class="hdr-info"><div style="font-weight:700;color:#1e3a5f;font-size:10px">Semana N° ${semana}</div><div>${desde} → ${hasta}</div><div>${rows.length} orden(es)</div><div style="margin-top:3px">Generado: ${new Date().toLocaleString('es-PE')}</div></div>
</div>
<div style="margin-bottom:10px">
  <div style="display:inline-block;border:1px solid #dbeafe;border-top:3px solid #3b82f6;border-radius:8px;padding:.7rem 1.4rem;min-width:180px;background:#f0f6ff">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:.4rem">
      <span style="font-size:.65rem;text-transform:uppercase;letter-spacing:.08em;color:#64748b;font-weight:600">Órdenes Programadas</span>
      <span style="font-size:1.2rem;opacity:.7">📅</span>
    </div>
    <div style="font-size:2.4rem;font-weight:800;color:#3b82f6;line-height:1;margin-bottom:.2rem">${rows.length}</div>
    <div style="font-size:.68rem;color:#64748b">semana N° ${semana} · ${desde} → ${hasta}</div>
  </div>
</div>
<div class="sec">Detalle de Órdenes</div>
<table><thead><tr><th>OT</th><th>Equipo</th><th>Tipo</th><th>Descripción</th><th>Mecánico</th><th>F. Prog.</th><th>F. Ejec.</th><th>Hs/Km</th><th>Estado</th><th>Proyecto</th></tr></thead><tbody>${summaryRows}</tbody></table>
<div class="sec">Diagrama de Gantt</div>
<table class="gantt"><thead><tr><th style="width:80px">OT</th><th style="width:140px">Equipo</th><th style="width:120px">Mecánico</th><th style="width:75px">Estado</th>${dayHdrs}</tr></thead><tbody>${ganttRows}</tbody></table>
<div class="legend"><strong>Leyenda:</strong><span class="ld" style="background:#3b82f6"></span>Programado<span class="ld" style="background:#f59e0b"></span>En Proceso<span class="ld" style="background:#10b981"></span>Completado<span class="ld" style="background:#9ca3af"></span>Postergado</div>
</body></html>`;
  const _logoUrl=window.location.href.replace(/[^\/\\]+$/,'')+'09.-ERP/Imagenes/ECOSERMO-LOGO.png';
  const htmlFinal=html.replace('__LOGO__',_logoUrl);
  const win=window.open('','_blank','width=1200,height=750');
  win.document.write(htmlFinal);win.document.close();
  setTimeout(()=>win.print(),700);
}