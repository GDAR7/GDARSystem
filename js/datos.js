// ══ FACTURACIÓN ══
function rFact(){document.getElementById('tbFact').innerHTML=DB.facturas.map(f=>`<tr><td class="mono">${f.num}</td><td>${f.cli}</td><td>${f.con}</td><td class="mono">${f.fecha}</td><td class="tr mono">${fmt(f.monto)}</td><td>${bge(f.est)}</td><td><button class="btn btn-del btn-sm" onclick="del('facturas',${f.id})">🗑</button></td></tr>`).join('');}
function gFact(){const n=document.getElementById('ftN').value.trim();if(!n){toast('Ingrese N° doc',true);return;}DB.facturas.push({id:nid('fact'),num:n,cli:document.getElementById('ftC').value,con:document.getElementById('ftCn').value,fecha:document.getElementById('ftF').value||today(),monto:+document.getElementById('ftM').value||0,est:document.getElementById('ftE').value});syncSheet('saveFactura',DB.facturas[DB.facturas.length-1]);closeM('mFact');rFact();toast('Factura registrada');}

// ══ COSTOS ══
function rCostos(){
  const tC=DB.costos.reduce((a,c)=>a+c.monto,0);
  document.getElementById('costosKpis').innerHTML=[{l:'Total Costos',v:fmt(tC),c:'#ef4444'},{l:'Combustible',v:fmt(DB.costos.filter(c=>c.cat==='Combustible').reduce((a,c)=>a+c.monto,0)),c:'#f97316'},{l:'Mantenimiento',v:fmt(DB.costos.filter(c=>['Mantenimiento','Repuestos'].includes(c.cat)).reduce((a,c)=>a+c.monto,0)),c:'#3b82f6'}].map(k=>`<div class="kpi" style="--kc:${k.c}"><div class="kpi-lbl">${k.l}</div><div class="kpi-val">${k.v}</div></div>`).join('');
  document.getElementById('tbCostos').innerHTML=DB.costos.map(c=>{const eq=DB.equipos.find(e=>e.id===c.eqId);return`<tr><td class="mono">${c.fecha}</td><td><span class="badge b-blue">${c.cat}</span></td><td>${c.desc}</td><td class="mono">${eq?eq.codigo:'—'}</td><td class="tr mono text-red">${fmt(c.monto)}</td><td><button class="btn btn-del btn-sm" onclick="del('costos',${c.id})">🗑</button></td></tr>`;}).join('');
  const s=document.getElementById('coEq');if(s)s.innerHTML='<option value="">— Ninguno —</option>'+DB.equipos.map(e=>`<option value="${e.id}">${e.codigo} – ${e.nombre.split(' ').slice(0,3).join(' ')}</option>`).join('');
}
function gCosto(){const d=document.getElementById('coDe').value.trim();if(!d){toast('Ingrese descripción',true);return;}DB.costos.push({id:nid('cost'),fecha:document.getElementById('coF').value||today(),cat:document.getElementById('coCa').value,desc:d,eqId:+document.getElementById('coEq').value||null,monto:+document.getElementById('coMo').value||0});syncSheet('saveCosto',DB.costos[DB.costos.length-1]);closeM('mCosto');rCostos();toast('Costo registrado');}

// ══ DELETE ══
// ══ DATA DE INGRESOS – FRENTES DE TRABAJO ══
const FT_EST_COLOR={'ACTIVO':'b-green','EN JECUCION':'b-yellow','DESACTIVADO':'b-red'};
const SP_COLOR={'PROYECTOS':'b-blue','MINA':'b-orange','OTROS':'b-purple'};

function _nextFtCod(){
  const nums=(DB.frentesTrabajo||[]).map(f=>{const m=(f.codigo||'').match(/(\d+)$/);return m?parseInt(m[1]):0;});
  const max=nums.length?Math.max(...nums):0;
  return 'FT_'+String(max+1).padStart(3,'0');
}

function renderFrentesTable(){
  const tb=document.getElementById('tbFrentes');
  if(!tb)return;
  tb.innerHTML=DB.frentesTrabajo.map(r=>`<tr>
    <td class="mono" style="color:var(--ceq)">${r.codigo}</td>
    <td><strong>${r.nombre}</strong></td>
    <td><span class="badge b-cyan">${r.abrev||'—'}</span></td>
    <td><span class="badge ${SP_COLOR[r.sponsor]||'b-blue'}">${r.sponsor||'—'}</span></td>
    <td><span class="badge ${FT_EST_COLOR[r.est]||'b-blue'}">${r.est||'—'}</span></td>
    <td style="display:flex;gap:.3rem">
      <button class="btn btn-sm" style="background:#1e3a5f;border:1px solid #2a5a8f;color:#6bb3f5" onclick="editFrente('${r.codigo}')">✏️</button>
      <button class="btn btn-del btn-sm" onclick="delFrente('${r.codigo}')">🗑</button>
    </td>
  </tr>`).join('');
}

let _frenteEditCodigo = null; // null = modo crear, string = modo editar

function editFrente(codigo){
  const r=DB.frentesTrabajo.find(x=>x.codigo===codigo);
  if(!r)return;
  _frenteEditCodigo = codigo;
  document.getElementById('mFrenteTtl').textContent = '✏️ Editar Frente';
  document.getElementById('ftCod').value   = r.codigo;
  document.getElementById('ftCod').readOnly = true;
  document.getElementById('ftCod').style.opacity = '.5';
  document.getElementById('ftNom').value   = r.nombre;
  document.getElementById('ftAbrev').value = r.abrev;
  document.getElementById('ftSponsor').value = r.sponsor;
  document.getElementById('ftEst').value   = r.est;
  document.getElementById('ftGuardarBtn').textContent = '💾 Actualizar';
  openM('mFrente');
}

function _resetFrenteModal(){
  _frenteEditCodigo = null;
  document.getElementById('mFrenteTtl').textContent = 'Frente de Trabajo';
  document.getElementById('ftCod').value = _nextFtCod();
  document.getElementById('ftCod').readOnly = true;
  document.getElementById('ftCod').style.opacity = '.55';
  document.getElementById('ftNom').value = '';
  document.getElementById('ftAbrev').value = '';
  document.getElementById('ftGuardarBtn').textContent = 'Guardar';
}

async function rFrentes(){
  const tb=document.getElementById('tbFrentes');
  if(!tb)return;
  tb.innerHTML='<tr><td colspan="6" style="text-align:center;color:var(--muted2);padding:1.5rem">⏳ Cargando data...</td></tr>';
  try{
    const r=await apiFetch('getFrentes');
    if(r&&!r.error&&Array.isArray(r)&&r.length){
      DB.frentesTrabajo=r.map(row=>({
        codigo: row['CODIGO']||row.codigo||'',
        nombre: row['FRENTE DE TRABAJO']||row.nombre||'',
        abrev:  row['ABREVIATURA']||row.abrev||'',
        sponsor:row['SPONSOR']||row.sponsor||'',
        est:    row['ESTADO']||row.est||'ACTIVO'
      }));
    }
  }catch(e){console.warn('Error cargando frentes:',e);}
  renderFrentesTable();
}

async function gFrente(){
  const cod=document.getElementById('ftCod').value.trim(),nom=document.getElementById('ftNom').value.trim();
  if(!cod||!nom){toast('Ingrese código y nombre',true);return;}
  const esEdicion = _frenteEditCodigo !== null;
  toast(esEdicion ? 'Actualizando data...' : 'Guardando data...');
  const result=await apiFetch('saveFrente',{
    codigo:cod, nom:nom,
    abrev:document.getElementById('ftAbrev').value.toUpperCase(),
    sponsor:document.getElementById('ftSponsor').value,
    est:document.getElementById('ftEst').value
  });
  if(result&&result.error){toast('Error: '+result.error,true);return;}
  if(!esEdicion){
    DB.frentesTrabajo.push({codigo:cod,nombre:nom,abrev:document.getElementById('ftAbrev').value.toUpperCase(),sponsor:document.getElementById('ftSponsor').value,est:document.getElementById('ftEst').value});
  }
  _resetFrenteModal();
  closeM('mFrente');
  await rFrentes();
  if(typeof _rpFrenteRenderList==='function')_rpFrenteRenderList('');
  toast(esEdicion ? '✓ Frente actualizado' : '✓ Frente de trabajo guardado');
}

async function delFrente(codigo){
  if(!confirm('¿Eliminar este frente de trabajo?'))return;
  toast('Eliminando...');
  const result=await apiFetch('deleteFrente',{id:codigo});
  if(result&&result.error){toast('Error al eliminar: '+result.error,true);return;}
  DB.frentesTrabajo=DB.frentesTrabajo.filter(r=>r.codigo!==codigo);
  renderFrentesTable();
  toast('✓ Frente eliminado');
}

// ══ DATA DE INGRESOS – TIPO DE MATERIAL ══
let _tmEditId=null;
function rTipoMaterial(){
  document.getElementById('tbTipoMat').innerHTML=DB.tipoMaterial.map(r=>`<tr>
    <td class="mono" style="color:var(--muted2)">${r.id}</td>
    <td><strong>${r.nombre}</strong></td>
    <td><span class="badge b-cyan">${r.abrev}</span></td>
    <td style="color:var(--muted2)">${r.anot||'—'}</td>
    <td><button class="btn btn-sm" style="background:#0ea5e920;border:1px solid #0ea5e940;color:#0ea5e9" onclick="_editTipoMat(${r.id})">✏️</button></td>
  </tr>`).join('');
}
function _editTipoMat(id){
  const r=DB.tipoMaterial.find(x=>x.id===id);if(!r)return;
  _tmEditId=id;
  document.getElementById('tmNom').value=r.nombre;
  document.getElementById('tmAbrev').value=r.abrev||'';
  document.getElementById('tmAnot').value=r.anot||'';
  document.querySelector('#mTipoMat .mttl').textContent='✏️ Editar Material';
  document.querySelector('#mTipoMat .mf .btn-a').textContent='💾 Actualizar';
  openM('mTipoMat');
}
function _resetTipoMat(){
  _tmEditId=null;
  document.getElementById('tmNom').value='';
  document.getElementById('tmAbrev').value='';
  document.getElementById('tmAnot').value='';
  document.querySelector('#mTipoMat .mttl').textContent='Tipo de Material';
  document.querySelector('#mTipoMat .mf .btn-a').textContent='Guardar';
}
function gTipoMat(){
  const nom=document.getElementById('tmNom').value.trim();
  if(!nom){toast('Ingrese el tipo de material',true);return;}
  const esEdit=_tmEditId!==null;
  if(esEdit){
    const r=DB.tipoMaterial.find(x=>x.id===_tmEditId);
    if(r){r.nombre=nom.toUpperCase();r.abrev=document.getElementById('tmAbrev').value.toUpperCase();r.anot=document.getElementById('tmAnot').value;syncSheet('saveTipoMaterial',r);}
  }else{
    DB.tipoMaterial.push({id:nid('tm'),nombre:nom.toUpperCase(),abrev:document.getElementById('tmAbrev').value.toUpperCase(),anot:document.getElementById('tmAnot').value});
    syncSheet('saveTipoMaterial',DB.tipoMaterial[DB.tipoMaterial.length-1]);
  }
  _resetTipoMat();
  closeM('mTipoMat');rTipoMaterial();toast(esEdit?'✓ Material actualizado':'✓ Tipo de material registrado');
}

// ══ DATA DE INGRESOS – TRAMOS ══
let _trEditId=null,_trInterf=[];

function _trSwitchTab(n){
  document.getElementById('trTabContent1').style.display=n===1?'block':'none';
  document.getElementById('trTabContent2').style.display=n===2?'block':'none';
  document.getElementById('trTab1').classList.toggle('active',n===1);
  document.getElementById('trTab2').classList.toggle('active',n===2);
}
function _trRenderInterf(){
  const list=document.getElementById('trInterfList');if(!list)return;
  list.innerHTML=_trInterf.length?_trInterf.map((x,i)=>`<tr style="border-top:1px solid #ffffff10">
    <td style="padding:.35rem .5rem">${x.nombre}</td>
    <td style="text-align:center;padding:.35rem .5rem;color:#f59e0b;font-weight:600">${x.tiempo} min</td>
    <td style="text-align:center"><button class="btn btn-del btn-sm" style="padding:.15rem .4rem;font-size:.75rem" onclick="_trDelInterf(${i})">✕</button></td>
  </tr>`).join(''):`<tr><td colspan="3" style="text-align:center;color:var(--muted2);font-size:.8rem;padding:1rem">Sin interferencias</td></tr>`;
  const total=_trInterf.reduce((a,x)=>a+(+x.tiempo||0),0);
  const el=document.getElementById('trInterfTotal');if(el)el.textContent=total+' min';
  const badge=document.getElementById('trInterfBadge');
  if(badge){badge.style.display=_trInterf.length?'inline':'none';badge.textContent=_trInterf.length;}
  _trCalcCiclo();
}
function _trAddInterf(){
  const nom=(document.getElementById('trInterfNom').value||'').trim();
  const t=+document.getElementById('trInterfTiempo').value||0;
  if(!nom){toast('Ingrese el nombre de la interferencia',true);return;}
  _trInterf.push({nombre:nom,tiempo:t});
  document.getElementById('trInterfNom').value='';
  document.getElementById('trInterfTiempo').value='';
  _trRenderInterf();
}
function _trDelInterf(idx){_trInterf.splice(idx,1);_trRenderInterf();}

function rTramos(){
  document.getElementById('tbTramos').innerHTML=DB.tramos.map(r=>`<tr>
    <td class="mono" style="color:var(--ceq)">${r.codigo}</td>
    <td class="mono" style="text-align:center">${r.inicio||'—'}</td>
    <td class="mono" style="text-align:center">${r.fin||'—'}</td>
    <td class="mono" style="text-align:center">${r.long||0} m</td>
    <td class="mono" style="text-align:center">${r.tCargado||0} min</td>
    <td class="mono" style="text-align:center">${r.tDescargado||0} min</td>
    <td class="mono" style="text-align:center;color:#f59e0b">${(Array.isArray(r.interferencias)?r.interferencias.reduce((a,x)=>a+(+x.tiempo||0),0):0)} min</td>
    <td class="mono" style="text-align:center;color:#0ea5e9;font-weight:600">${r.ciclo||0} min</td>
    <td style="text-align:center">${bge(r.est)}</td>
    <td><button class="btn btn-sm" style="background:#0ea5e920;border:1px solid #0ea5e940;color:#0ea5e9" onclick="_editTramo(${r.id})">✏️</button></td>
  </tr>`).join('');
}
function _trCalcCiclo(){
  const c=+document.getElementById('trTCarg').value||0;
  const d=+document.getElementById('trTDesc').value||0;
  const interf=_trInterf.reduce((a,x)=>a+(+x.tiempo||0),0);
  document.getElementById('trCiclo').value=+(c+d+interf).toFixed(1);
}
function _trFrentesOpts(sel){
  return '<option value="">— Seleccionar —</option>'+(DB.frentesTrabajo||[]).map(f=>f.nombre||f.nom||'').filter(Boolean).sort().map(f=>`<option value="${f}"${f===sel?' selected':''}>${f}</option>`).join('');
}
function _openTramoModal(){
  _trEditId=null;_trInterf=[];
  document.getElementById('trCod').value='';
  document.getElementById('trCod').readOnly=false;
  document.getElementById('trCod').style.opacity='1';
  document.getElementById('trLong').value='';
  document.getElementById('trDesc').value='';
  document.getElementById('trTCarg').value='';
  document.getElementById('trTDesc').value='';
  document.getElementById('trCiclo').value='';
  document.getElementById('trEst').value='Activo';
  document.getElementById('mTramoTtl').textContent='Tramo';
  document.getElementById('trIni').innerHTML=_trFrentesOpts('');
  document.getElementById('trFin').innerHTML=_trFrentesOpts('');
  _trRenderInterf();_trSwitchTab(1);
  openM('mTramo');
}
function _editTramo(id){
  const r=DB.tramos.find(x=>x.id===id);if(!r)return;
  _trEditId=id;
  _trInterf=Array.isArray(r.interferencias)?r.interferencias.map(x=>({...x})):[];
  document.getElementById('mTramoTtl').textContent='✏️ Editar Tramo';
  document.getElementById('trCod').value=r.codigo;
  document.getElementById('trCod').readOnly=true;
  document.getElementById('trCod').style.opacity='.55';
  document.getElementById('trIni').innerHTML=_trFrentesOpts(r.inicio||'');
  document.getElementById('trFin').innerHTML=_trFrentesOpts(r.fin||'');
  document.getElementById('trLong').value=r.long||0;
  document.getElementById('trEst').value=r.est||'Activo';
  document.getElementById('trTCarg').value=r.tCargado||0;
  document.getElementById('trTDesc').value=r.tDescargado||0;
  document.getElementById('trDesc').value=r.anotacion||'';
  _trRenderInterf();_trSwitchTab(1);
  openM('mTramo');
}
function gTramo(){
  const cod=document.getElementById('trCod').value.trim();
  if(!cod){toast('Ingrese el código del tramo',true);return;}
  const anotacion=document.getElementById('trDesc').value.trim();
  const tCarg=+document.getElementById('trTCarg').value||0;
  const tDesc_=+document.getElementById('trTDesc').value||0;
  const interf=_trInterf.reduce((a,x)=>a+(+x.tiempo||0),0);
  const ciclo=tCarg+tDesc_+interf;
  const esEdit=_trEditId!==null;
  if(esEdit){
    const r=DB.tramos.find(x=>x.id===_trEditId);
    if(r){Object.assign(r,{anotacion,inicio:document.getElementById('trIni').value,fin:document.getElementById('trFin').value,long:+document.getElementById('trLong').value||0,est:document.getElementById('trEst').value,tCargado:tCarg,tDescargado:tDesc_,ciclo,interferencias:_trInterf});syncSheet('saveTramo',r);}
  }else{
    const rec={id:nid('tr'),codigo:cod,anotacion,inicio:document.getElementById('trIni').value,fin:document.getElementById('trFin').value,long:+document.getElementById('trLong').value||0,est:document.getElementById('trEst').value,tCargado:tCarg,tDescargado:tDesc_,ciclo,interferencias:_trInterf};
    DB.tramos.push(rec);syncSheet('saveTramo',rec);
  }
  _trEditId=null;
  closeM('mTramo');rTramos();toast(esEdit?'✓ Tramo actualizado':'✓ Tramo registrado');
}

// ══ UNIDADES DE MEDIDA ══
function refreshProvDatalist(){
  const dl=document.getElementById('provDatalist');
  if(!dl)return;
  const provs=[...new Set(DB.almacen.map(r=>r.proveedor).filter(v=>v&&v.trim()))].sort();
  dl.innerHTML=provs.map(p=>`<option value="${p}">`).join('');
}
function refreshUndDatalist(){
  const dl=document.getElementById('undDatalist');
  if(dl)dl.innerHTML=DB.unidades.map(u=>`<option value="${u.abrev}">${u.nombre} (${u.abrev})</option>`).join('');
}
function rUnidades(){
  refreshUndDatalist();
  document.getElementById('tbUnidades').innerHTML=DB.unidades.map(u=>`<tr>
    <td>${u.nombre}</td>
    <td><span class="badge b-cyan">${u.abrev}</span></td>
    <td><button class="btn btn-del btn-sm" onclick="delUnidad(${u.id})">🗑</button></td>
  </tr>`).join('');
}
function gUnidad(){
  const nom=document.getElementById('undNom').value.trim();
  const abrev=document.getElementById('undAbrev').value.trim().toLowerCase();
  if(!nom||!abrev){toast('Ingrese nombre y abreviatura',true);return;}
  if(DB.unidades.some(u=>u.abrev===abrev)){toast('Ya existe esa abreviatura',true);return;}
  const u={id:nid('und'),nombre:nom,abrev};
  DB.unidades.push(u);
  supaUpsert('unidades',u);
  document.getElementById('undNom').value='';
  document.getElementById('undAbrev').value='';
  rUnidades();toast('Unidad agregada');
}
function delUnidad(id){
  if(!confirm('¿Eliminar esta unidad?'))return;
  DB.unidades=DB.unidades.filter(u=>u.id!==id);
  supaDelete('unidades',id);
  rUnidades();toast('Unidad eliminada');
}

// ══ CATÁLOGO DE MATERIALES ══
let _matEditId=null;
let _matImgData='';
function loadMatImg(input){
  const file=input.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=function(e){
    const image=new Image();
    image.onload=function(){
      const max=180;let w=image.width,h=image.height;
      if(w>max||h>max){const s=Math.min(max/w,max/h);w=Math.round(w*s);h=Math.round(h*s);}
      const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
      canvas.getContext('2d').drawImage(image,0,0,w,h);
      _matImgData=canvas.toDataURL('image/jpeg',0.75);
      const prev=document.getElementById('matImgPreview');
      const ph=document.getElementById('matImgPlaceholder');
      const btn=document.getElementById('matImgClearBtn');
      if(ph)ph.style.display='none';
      const old=prev.querySelector('img');if(old)old.remove();
      const el=document.createElement('img');
      el.src=_matImgData;el.style.cssText='width:100%;height:100%;object-fit:cover';
      prev.appendChild(el);
      if(btn)btn.style.display='block';
    };
    image.src=e.target.result;
  };
  reader.readAsDataURL(file);
}
function clearMatImg(){
  _matImgData='';
  const prev=document.getElementById('matImgPreview');
  const old=prev.querySelector('img');if(old)old.remove();
  const ph=document.getElementById('matImgPlaceholder');if(ph)ph.style.display='';
  const btn=document.getElementById('matImgClearBtn');if(btn)btn.style.display='none';
  const fi=document.getElementById('matImgFile');if(fi)fi.value='';
}
function onMatTipoChange(){
  const tipo=document.getElementById('matTipo').value;
  const prefix=REQ_PREFIXES[tipo]||tipo.slice(0,2)+'-';
  const count=DB.catalogoItems.filter(c=>c.tipo===tipo).length;
  document.getElementById('matCod').value=prefix+String(count+1).padStart(4,'0');
}
function rMateriales(){
  const items=DB.catalogoItems;
  const tipos=['MATERIALES','ADMINISTRATIVO','DISPOSITIVOS','EPPS','EQUIPOS','HERRAMIENTAS','INSUMOS'];
  const kpis=[
    {l:'Total Registrados',v:items.length,c:'#f97316'},
    ...tipos.map(t=>({l:t,v:items.filter(x=>x.tipo===t).length,c:{MATERIALES:'#3b82f6',EPPS:'#10b981',INSUMOS:'#8b5cf6',HERRAMIENTAS:'#f59e0b'}[t]}))
  ];
  document.getElementById('matKpis').innerHTML=kpis.map(k=>`<div class="kpi" style="--kc:${k.c}"><div class="kpi-lbl">${k.l}</div><div class="kpi-val">${k.v}</div></div>`).join('');
  document.getElementById('tbMateriales').innerHTML=items.map(r=>`<tr>
    <td style="text-align:center;width:46px">
      ${r.img?`<img src="${r.img}" style="width:38px;height:38px;object-fit:cover;border-radius:5px;border:1px solid var(--border);display:block;margin:auto">`
      :`<div style="width:38px;height:38px;background:var(--panel2);border-radius:5px;border:1px solid var(--border);display:inline-flex;align-items:center;justify-content:center;color:var(--muted);font-size:.55rem">—</div>`}
    </td>
    <td><span class="badge b-orange">${r.tipo}</span></td>
    <td class="mono" style="color:var(--alm)">${r.cod}</td>
    <td><strong>${r.desc}</strong></td>
    <td><span class="badge b-cyan">${r.und}</span></td>
    <td style="font-size:.76rem;color:${r.categoria?'var(--text)':'var(--muted)'}">${r.categoria||'—'}</td>
    <td style="font-size:.76rem;color:${r.subCategoria?'var(--muted2)':'var(--muted)'}">${r.subCategoria||'—'}</td>
    <td class="mono" style="text-align:right;color:#10b981">${r.pur?'S/ '+Number(r.pur).toFixed(2):'<span style="color:var(--muted)">—</span>'}</td>
    <td style="color:var(--muted2);font-size:.76rem;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${r.anotacion||''}">${r.anotacion||'—'}</td>
    <td style="display:flex;gap:.3rem">
      <button class="btn btn-sm" style="background:#1e3a5f;color:#60a5fa;border:1px solid #2563eb" onclick="editMaterial(${r.id})">✏️ Editar</button>
      <button class="btn btn-del btn-sm" onclick="del('catalogoItems',${r.id})">🗑</button>
    </td>
  </tr>`).join('');
}
function editMaterial(id){
  const r=DB.catalogoItems.find(x=>x.id===id);if(!r)return;
  _matEditId=id;
  document.getElementById('matTipo').value=r.tipo;
  document.getElementById('matCod').value=r.cod;
  document.getElementById('matDesc').value=r.desc;
  document.getElementById('matUnd').value=r.und;
  document.getElementById('matCategoria').value=r.categoria||'';
  document.getElementById('matSubCategoria').value=r.subCategoria||'';
  document.getElementById('matPur').value=r.pur||'';
  document.getElementById('matAnotacion').value=r.anotacion||'';
  document.querySelector('#mMaterial .mttl').textContent='✏️ Editar Material';
  _matImgData=r.img||'';
  const prev=document.getElementById('matImgPreview');
  const ph=document.getElementById('matImgPlaceholder');
  const btn=document.getElementById('matImgClearBtn');
  const old=prev.querySelector('img');if(old)old.remove();
  if(_matImgData){
    if(ph)ph.style.display='none';
    const el=document.createElement('img');
    el.src=_matImgData;el.style.cssText='width:100%;height:100%;object-fit:cover';
    prev.appendChild(el);
    if(btn)btn.style.display='block';
  }else{
    if(ph)ph.style.display='';
    if(btn)btn.style.display='none';
  }
  refreshUndDatalist();
  openM('mMaterial');
}
function openMaterial(){
  _matEditId=null;
  clearMatImg();
  document.getElementById('matCategoria').value='';
  document.getElementById('matSubCategoria').value='';
  document.getElementById('matPur').value='';
  document.getElementById('matAnotacion').value='';
  document.querySelector('#mMaterial .mttl').textContent='➕ Nuevo Material';
  refreshUndDatalist();
  openM('mMaterial');
}
function openGesUnidades(){rUnidades();openM('mGesUnidades');}
function gMaterial(){
  const cod=document.getElementById('matCod').value.trim();
  const desc=document.getElementById('matDesc').value.trim();
  if(!cod||!desc){toast('Ingrese código y descripción',true);return;}
  const mat={tipo:document.getElementById('matTipo').value,cod,desc,und:document.getElementById('matUnd').value,img:_matImgData,categoria:document.getElementById('matCategoria').value.trim()||null,subCategoria:document.getElementById('matSubCategoria').value.trim()||null,pur:+document.getElementById('matPur').value||null,anotacion:document.getElementById('matAnotacion').value.trim()||null};
  if(_matEditId){
    const r=DB.catalogoItems.find(x=>x.id===_matEditId);
    if(r){Object.assign(r,mat);syncSheet('saveCatalogo',{...r});}
    _matEditId=null;
    document.querySelector('#mMaterial .mttl').textContent='➕ Nuevo Material';
  }else{
    if(DB.catalogoItems.some(c=>c.cod.toLowerCase()===cod.toLowerCase())){toast('Ya existe un material con ese código',true);return;}
    const nuevo={id:nid('cat'),...mat};
    DB.catalogoItems.push(nuevo);
    syncSheet('saveCatalogo',nuevo);
  }
  closeM('mMaterial');rMateriales();toast('Material guardado');
}

function del(t,id){
  const _prevRec=DB[t]?DB[t].find(r=>r.id===id):null;
  if(t==='equipos'){
    const mants=DB.mantenimientos.filter(m=>m.eqId===id).length;
    const auxs=DB.auxiliosMecanicos.filter(a=>a.eqId===id).length;
    const parts=DB.partes?DB.partes.filter(p=>p.eqId===id).length:0;
    const eq=_prevRec;
    let msg=`⚠️ ¿Eliminar el equipo "${eq?eq.codigo+' – '+eq.nombre:''}"?\n\nEsto también eliminará:`;
    if(mants)msg+=`\n• ${mants} orden(es) de mantenimiento / programación`;
    if(parts)msg+=`\n• ${parts} parte(s) diario(s)`;
    if(auxs)msg+=`\n• ${auxs} auxilio(s) mecánico(s)`;
    if(!mants&&!parts&&!auxs)msg+='\n• (sin registros vinculados)';
    msg+='\n\nEsta acción no se puede deshacer.';
    if(!confirm(msg))return;
  }else{
    if(!confirm('¿Eliminar este registro?'))return;
  }
  const _prevRqRef=_prevRec&&_prevRec.rqRef?_prevRec.rqRef:null;
  // Cascade: eliminar dependientes antes de borrar el equipo
  if(t==='equipos'){
    DB.mantenimientos.filter(m=>m.eqId===id).forEach(m=>supaDelete('mantenimientos',m.id));
    DB.mantenimientos=DB.mantenimientos.filter(m=>m.eqId!==id);
    if(DB.partes){DB.partes.filter(p=>p.eqId===id).forEach(p=>supaDelete('partes',p.id));DB.partes=DB.partes.filter(p=>p.eqId!==id);}
    DB.auxiliosMecanicos.filter(a=>a.eqId===id).forEach(a=>{
      DB.auxMecInsumos.filter(i=>i.auxilioId===a.id).forEach(i=>supaDelete('auxMecInsumos',i.id));
      DB.auxMecInsumos=DB.auxMecInsumos.filter(i=>i.auxilioId!==a.id);
      supaDelete('auxiliosMecanicos',a.id);
    });
    DB.auxiliosMecanicos=DB.auxiliosMecanicos.filter(a=>a.eqId!==id);
  }
  DB[t]=DB[t].filter(r=>r.id!==id);
  supaDelete(t,id);
  if(t==='auxiliosMecanicos')DB.auxMecInsumos=DB.auxMecInsumos.filter(r=>r.auxilioId!==id);
  if(t==='almacen'&&_prevRqRef)_autoUpdateRqEst(_prevRqRef);
  renderPage(AP);toast('Eliminado');
}

// ══ INIT ══
function toggleNav(){
  const nav = document.getElementById('sideNav');
  const btn = document.querySelector('.nav-toggle-btn');
  nav.classList.toggle('collapsed');
  btn.textContent = nav.classList.contains('collapsed') ? '▶' : '☰';
}
document.addEventListener('DOMContentLoaded',()=>{
  buildDemos();
  ['wIng','soF','rI','rS','alF','hF','lvF','lvFE','aeF','asF','cbF','suF','inF','ptV','maF','otFp','otFe','acFi','acFf','ftF','coF','rpF','rqF','rqFEnt'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=today();});
  const emEl=document.getElementById('engraseMes');if(emEl)emEl.value=new Date().toISOString().slice(0,7);
  const fpPdfEl=document.getElementById('fpPdf');
  if(fpPdfEl)fpPdfEl.addEventListener('change',function(){
    const prev=document.getElementById('fpPdfPreview');
    if(this.files[0]){prev.textContent='📎 '+this.files[0].name+' ('+Math.round(this.files[0].size/1024)+' KB)';}
    else{prev.textContent='';}
  });
  document.getElementById('plMes').value=new Date().getMonth()+1;
  document.getElementById('loginCodigo').addEventListener('keydown',e=>{if(e.key==='Enter')doLogin();});
});
