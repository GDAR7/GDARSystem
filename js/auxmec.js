// ══ AUXILIOS MECÁNICOS ══
let _amTab=0,_amEditId=null;
const _AM_BUCKET='AuxMec_Evidencias';
// Eliminar solo disponible hasta 48h después de creado (mismo patrón que Máster de Equipos)
function _amPuedeEliminar(id){
  try{
    const d=JSON.parse(localStorage.getItem('ecosermo_auxmec_ts')||'{}');
    return d[id]&&(Date.now()-d[id])<172800000; // 48h en ms
  }catch(e){return false;}
}
function amGoTab(n){
  _amTab=n;
  [0,1,2,3].forEach(i=>{
    const t=document.getElementById('amTab'+i);
    if(t)t.classList.toggle('eq-tab-act',i===n);
    const p=document.getElementById('amP'+i);
    if(!p)return;
    if(i===n){p.style.display=i===3?'block':'grid';}else{p.style.display='none';}
  });
  const prev=document.getElementById('amBPrev'),next=document.getElementById('amBNext'),save=document.getElementById('amBSave');
  if(prev)prev.style.display=n>0?'':'none';
  if(next)next.style.display=n<3?'':'none';
  if(save)save.style.display=n===3?'':'none';
}
// ── Lista de textos ya usados (Descripción del Problema / Acciones Realizadas), para reutilizar rápido ──
let _amDescPickEl=null,_amDescPickAll=[],_amDescPickFiltered=[],_amDescPickTarget=null;
function _amDescPicker(ev,campo,targetId,titulo){
  if(_amDescPickEl){_amDescPickEl.remove();_amDescPickEl=null;}
  _amDescPickTarget=targetId;
  const vistos=new Set();
  _amDescPickAll=(DB.auxiliosMecanicos||[]).map(r=>(r[campo]||'').trim()).filter(d=>{
    if(!d||vistos.has(d.toLowerCase()))return false;
    vistos.add(d.toLowerCase());return true;
  }).sort((a,b)=>a.localeCompare(b,'es'));
  const div=document.createElement('div');
  div.style.cssText='position:fixed;z-index:99999;background:var(--panel);border:1px solid var(--border);border-radius:8px;padding:.6rem;box-shadow:0 6px 24px rgba(0,0,0,.4);width:360px;max-width:90vw;font-size:.75rem';
  div.innerHTML=`<div style="font-size:.62rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:.4rem">📋 ${titulo} · ${_amDescPickAll.length}</div>
    <input id="amDescPickQ" placeholder="Buscar..." autocomplete="off" oninput="_amDescPickFilter()" style="width:100%;background:var(--panel2);border:1px solid var(--border);border-radius:6px;padding:.35rem .5rem;color:var(--text);font-size:.75rem;margin-bottom:.4rem;box-sizing:border-box">
    <div id="amDescPickList" style="max-height:260px;overflow-y:auto;display:flex;flex-direction:column;gap:.2rem"></div>`;
  document.body.appendChild(div);
  _amDescPickEl=div;
  _amDescPickFilter();
  const r=ev.currentTarget.getBoundingClientRect();
  let top=r.bottom+4,left=r.left;
  if(left+360>window.innerWidth)left=Math.max(8,window.innerWidth-365);
  if(top+300>window.innerHeight)top=Math.max(8,r.top-305);
  div.style.top=top+'px';div.style.left=left+'px';
  document.getElementById('amDescPickQ').focus();
  setTimeout(()=>document.addEventListener('click',function h(e){if(!div.contains(e.target)){div.remove();_amDescPickEl=null;document.removeEventListener('click',h);}},{once:false}),10);
}
function _amDescPickFilter(){
  const q=(document.getElementById('amDescPickQ')?.value||'').toLowerCase();
  _amDescPickFiltered=_amDescPickAll.filter(d=>d.toLowerCase().includes(q));
  const list=document.getElementById('amDescPickList');if(!list)return;
  list.innerHTML=_amDescPickFiltered.length?_amDescPickFiltered.map((d,i)=>`<div onclick="_amDescPick(${i})" style="padding:.4rem .5rem;border-radius:5px;cursor:pointer;line-height:1.35" onmouseover="this.style.background='rgba(139,92,246,.15)'" onmouseout="this.style.background=''">${d}</div>`).join(''):'<div style="padding:.5rem;color:var(--muted2);text-align:center">Sin resultados</div>';
}
function _amDescPick(i){
  const d=_amDescPickFiltered[i];if(d==null)return;
  const ta=document.getElementById(_amDescPickTarget||'amDesc');
  if(ta)ta.value=d;
  if(_amDescPickEl){_amDescPickEl.remove();_amDescPickEl=null;}
}
function _amPopulateMatDatalist(){
  const dl=document.getElementById('dlAmMat');if(!dl)return;
  const vistos=new Set();
  dl.innerHTML=(DB.catalogoItems||[]).filter(c=>{
    const d=(c.desc||'').trim();
    if(!d||vistos.has(d.toLowerCase()))return false;
    vistos.add(d.toLowerCase());return true;
  }).map(c=>`<option value="${c.desc.replace(/"/g,'&quot;')}">`).join('');
}
// Al elegir/escribir una descripción que coincide con un material del catálogo, autocompleta su Código de Almacén
function _amInsumoDescInput(el){
  const tr=el.closest('tr');if(!tr)return;
  const codInput=tr.querySelectorAll('input,select')[1];if(!codInput)return;
  const v=(el.value||'').trim().toLowerCase();
  const mat=v?(DB.catalogoItems||[]).find(c=>(c.desc||'').trim().toLowerCase()===v):null;
  if(mat)codInput.value=mat.cod||'';
}
function amAddInsumo(){
  const tbody=document.getElementById('amInsumosBody');
  const ISS='background:var(--panel2);border:1px solid var(--border);border-radius:4px;padding:.25rem .4rem;color:var(--text);font-size:.73rem;width:100%';
  const tr=document.createElement('tr');
  tr.innerHTML=`<td><input style="${ISS}" list="dlAmMat" autocomplete="off" placeholder="Descripción del ítem (buscar o escribir)" oninput="_amInsumoDescInput(this)"></td>
    <td><input style="${ISS};width:85px" placeholder="M-001"></td>
    <td><input type="number" style="${ISS};width:65px" step="0.01" min="0" placeholder="0"></td>
    <td><input style="${ISS};width:60px" placeholder="und"></td>
    <td><select style="${ISS};width:150px">${_provOptsHtml('')}</select></td>
    <td><button class="btn btn-del btn-sm" onclick="this.closest('tr').remove()" style="padding:.2rem .4rem">✕</button></td>`;
  tbody.appendChild(tr);
}
function amGetInsumos(){
  return[...document.getElementById('amInsumosBody').children].map(tr=>{
    const inp=tr.querySelectorAll('input,select');
    return{desc:inp[0].value.trim(),cod:inp[1].value.trim(),cant:+inp[2].value||0,und:inp[3].value.trim(),origen:inp[4].value};
  }).filter(r=>r.desc);
}

// ── Evidencia fotográfica (Antes / Después) ──
function _amFotosArr(v){return Array.isArray(v)?v:(typeof v==='string'&&v?JSON.parse(v):[]);}
function _renderAmMedia(fotosAntes,fotosDespues){
  const lock=document.getElementById('amMediaLock'),content=document.getElementById('amMediaContent');
  if(!_amEditId){if(lock)lock.style.display='block';if(content)content.style.display='none';return;}
  if(lock)lock.style.display='none';if(content)content.style.display='block';
  const gal=(id,fotos)=>{
    const el=document.getElementById(id);if(!el)return;
    el.innerHTML=fotos.length?fotos.map((f,i)=>`
      <div style="position:relative;width:84px;height:84px">
        <img src="${f.url}" style="width:84px;height:84px;object-fit:cover;border-radius:7px;border:1px solid var(--border);cursor:pointer" onclick="window.open('${f.url}','_blank')" title="${f.nombre||''}">
        <button onclick="amDelFoto('${id.includes('Antes')?'antes':'despues'}',${i})" style="position:absolute;top:2px;right:2px;background:rgba(0,0,0,.7);border:none;color:#ef4444;border-radius:4px;width:20px;height:20px;font-size:.65rem;cursor:pointer;line-height:1">✕</button>
      </div>`).join(''):'<span style="font-size:.7rem;color:var(--muted2);opacity:.6">Sin fotos</span>';
  };
  gal('amFotoAntesGallery',_amFotosArr(fotosAntes));
  gal('amFotoDespuesGallery',_amFotosArr(fotosDespues));
}
async function amUploadFoto(input,tipo){
  if(!_amEditId){toast('Guarda el auxilio primero',true);input.value='';return;}
  const files=[...input.files];if(!files.length)return;
  const stEl=document.getElementById(tipo==='antes'?'amFotoAntesStatus':'amFotoDespuesStatus');
  if(stEl)stEl.textContent='Subiendo...';
  const r=DB.auxiliosMecanicos.find(x=>x.id===_amEditId);if(!r)return;
  const campo=tipo==='antes'?'fotosAntes':'fotosDespues';
  const fotos=_amFotosArr(r[campo]);
  for(const file of files){
    const ext=(file.name.split('.').pop()||'jpg');
    const path=`auxmec/${_amEditId}/${tipo}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const{error}=await supa.storage.from(_AM_BUCKET).upload(path,file,{upsert:false});
    if(error){toast('Error: '+error.message,true);continue;}
    const{data:{publicUrl}}=supa.storage.from(_AM_BUCKET).getPublicUrl(path);
    fotos.push({url:publicUrl,path,nombre:file.name});
  }
  r[campo]=JSON.stringify(fotos);
  syncSheet('saveAuxMec',r);
  _renderAmMedia(r.fotosAntes,r.fotosDespues);
  if(stEl)stEl.textContent='';input.value='';
  toast(`${files.length} foto(s) subida(s)`);
}
async function amDelFoto(tipo,idx){
  if(!_amEditId)return;
  const r=DB.auxiliosMecanicos.find(x=>x.id===_amEditId);if(!r)return;
  const campo=tipo==='antes'?'fotosAntes':'fotosDespues';
  const fotos=_amFotosArr(r[campo]);
  const f=fotos[idx];if(!f)return;
  await supa.storage.from(_AM_BUCKET).remove([f.path]);
  fotos.splice(idx,1);
  r[campo]=JSON.stringify(fotos);
  syncSheet('saveAuxMec',r);
  _renderAmMedia(r.fotosAntes,r.fotosDespues);
  toast('Foto eliminada');
}
// ── Filtro de período 21→20 + chips por tipo/subtipo de equipo (mismo patrón que Combustible) ──
let _amOffset=0,_amTodoPer=false,_amTipo=null,_amSub=null;
function _amPeriodo(){
  const hoy=new Date();
  const d=hoy.getDate(),m=hoy.getMonth(),y=hoy.getFullYear();
  let baseY=y,baseM=m;
  if(d<21){baseM=m-1;if(baseM<0){baseM=11;baseY=y-1;}}
  let iniM=baseM+_amOffset,iniY=baseY;
  while(iniM>11){iniM-=12;iniY++;}
  while(iniM<0){iniM+=12;iniY--;}
  const ini=new Date(iniY,iniM,21);
  const fin=new Date(iniY,iniM+1,20);
  const fmtD=x=>`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;
  const MESES=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  return{desde:fmtD(ini),hasta:fmtD(fin),label:`${MESES[fin.getMonth()]} ${fin.getFullYear()}`,dias:Math.round((fin-ini)/86400000)+1};
}
function _amNav(dir){_amOffset+=dir;_amTodoPer=false;rAuxMec();}
function _amTogglePeriodo(){_amTodoPer=!_amTodoPer;rAuxMec();}
function _amSelTipo(t){
  if(_amTipo===t){_amTipo=null;_amSub=null;}else{_amTipo=t;_amSub=null;}
  rAuxMec();
}
function _amSelSub(s){_amSub=_amSub===s?null:s;rAuxMec();}

function rAuxMec(){
  const per=_amPeriodo();
  const eqById=id=>(DB.equipos||[]).find(e=>e.id===id);
  // 1) Filtro por período
  const enPer=(DB.auxiliosMecanicos||[]).filter(r=>_amTodoPer||(r.fecha&&r.fecha>=per.desde&&r.fecha<=per.hasta));
  // 2) Chips tipo → subtipo (contados sobre lo que hay en el período)
  const tiposMap={};
  enPer.forEach(r=>{
    const eq=eqById(r.eqId);
    const t=eq?(eq.tipo||'Otros'):'Otros',s=eq?(eq.sub||'Otros').toUpperCase():'OTROS';
    if(!tiposMap[t])tiposMap[t]={n:0,subs:{}};
    tiposMap[t].n++;
    tiposMap[t].subs[s]=(tiposMap[t].subs[s]||0)+1;
  });
  if(_amTipo&&!tiposMap[_amTipo]){_amTipo=null;_amSub=null;}
  if(_amSub&&(!_amTipo||!tiposMap[_amTipo].subs[_amSub]))_amSub=null;
  // 3) Aplicar chips
  const lista=enPer.filter(r=>{
    if(!_amTipo)return true;
    const eq=eqById(r.eqId);
    const t=eq?(eq.tipo||'Otros'):'Otros',s=eq?(eq.sub||'Otros').toUpperCase():'OTROS';
    if(_amSub)return t===_amTipo&&s===_amSub;
    return t===_amTipo;
  });

  // Barra de período
  const pEl=document.getElementById('auxMecPeriodo');
  if(pEl)pEl.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.6rem;margin-bottom:.9rem">
    <div style="font-size:.78rem;color:var(--muted2)">${_amTodoPer?'Mostrando <strong style="color:var(--mec)">todo el historial</strong>':`Período 21→20 · <span class="mono">${per.desde}</span> al <span class="mono">${per.hasta}</span> · ${per.dias} días`}</div>
    <div style="display:flex;align-items:center;gap:.5rem">
      <div style="display:flex;align-items:center;background:var(--panel2);border:1px solid var(--border);border-radius:8px;overflow:hidden;${_amTodoPer?'opacity:.45':''}">
        <button onclick="_amNav(-1)" style="background:none;border:none;border-right:1px solid var(--border);color:var(--text);cursor:pointer;font-size:1.1rem;padding:.35rem .7rem;line-height:1">‹</button>
        <span style="font-weight:800;font-size:.88rem;color:var(--text);min-width:130px;text-align:center;padding:0 .5rem">${per.label}</span>
        <button onclick="_amNav(1)" style="background:none;border:none;border-left:1px solid var(--border);color:var(--text);cursor:pointer;font-size:1.1rem;padding:.35rem .7rem;line-height:1">›</button>
      </div>
      <button onclick="_amTogglePeriodo()" style="padding:.35rem .8rem;border-radius:8px;cursor:pointer;font-size:.74rem;font-weight:700;border:1.5px solid ${_amTodoPer?'var(--mec)':'var(--border)'};background:${_amTodoPer?'rgba(236,72,153,.15)':'var(--panel2)'};color:${_amTodoPer?'var(--mec)':'var(--muted2)'}">${_amTodoPer?'✕ Ver por período':'📚 Todo el historial'}</button>
    </div>
  </div>`;

  const tots=lista.length;
  const pen=lista.filter(r=>r.est==='Pendiente').length;
  const proc=lista.filter(r=>r.est==='En Proceso').length;
  const aten=lista.filter(r=>r.est==='Atendido').length;
  document.getElementById('auxMecKpis').innerHTML=[
    {l:'Total Auxilios',v:tots,c:'#8b5cf6'},
    {l:'Pendientes',v:pen,c:'#ef4444'},
    {l:'En Proceso',v:proc,c:'#f59e0b'},
    {l:'Atendidos',v:aten,c:'#10b981'}
  ].map(k=>`<div class="kpi" style="--kc:${k.c}"><div class="kpi-lbl">${k.l}</div><div class="kpi-val">${k.v}</div></div>`).join('');

  // Chips de tipo → subtipo
  const cEl=document.getElementById('auxMecChips');
  if(cEl){
    const tiposSorted=Object.entries(tiposMap).sort((a,b)=>b[1].n-a[1].n);
    const chipTodos=`<button onclick="_amTipo=null;_amSub=null;rAuxMec()" style="display:inline-flex;align-items:center;padding:.35rem .8rem;border-radius:20px;cursor:pointer;font-size:.76rem;font-weight:700;border:1.5px solid ${!_amTipo?'#8b5cf6':'var(--border)'};background:${!_amTipo?'rgba(139,92,246,.15)':'var(--panel2)'};color:${!_amTipo?'#a78bfa':'var(--muted2)'}">Todos</button>`;
    const chipTipos=tiposSorted.map(([t,d])=>{
      const act=_amTipo===t,tEsc=t.replace(/'/g,"\\'");
      return`<button onclick="_amSelTipo('${tEsc}')" style="display:inline-flex;align-items:center;gap:.4rem;padding:.35rem .8rem;border-radius:20px;cursor:pointer;font-size:.76rem;font-weight:700;border:1.5px solid ${act?'var(--mec)':'var(--border)'};background:${act?'rgba(236,72,153,.18)':'var(--panel2)'};color:${act?'var(--mec)':'var(--text)'};transition:all .15s">
        ${t} <span style="font-family:monospace;font-size:.68rem;font-weight:900;color:${act?'var(--mec)':'var(--muted2)'}">${d.n}</span>${act?' ✕':''}
      </button>`;
    }).join('');
    let chipSubs='';
    if(_amTipo&&tiposMap[_amTipo]){
      const subsT=Object.entries(tiposMap[_amTipo].subs).sort((a,b)=>b[1]-a[1]);
      chipSubs=`<div style="display:flex;gap:.35rem;flex-wrap:wrap;margin-top:.5rem;padding:.55rem .7rem;background:rgba(139,92,246,.05);border:1px dashed rgba(139,92,246,.4);border-radius:9px">
        <span style="font-size:.64rem;color:var(--muted2);text-transform:uppercase;letter-spacing:.07em;font-weight:700;align-self:center">↳ Subtipo:</span>
        ${subsT.map(([s,n])=>{
          const act=_amSub===s,sEsc=s.replace(/'/g,"\\'");
          return`<button onclick="_amSelSub('${sEsc}')" style="display:inline-flex;align-items:center;gap:.35rem;padding:.3rem .7rem;border-radius:18px;cursor:pointer;font-size:.73rem;font-weight:700;border:1.5px solid ${act?'#8b5cf6':'var(--border)'};background:${act?'rgba(139,92,246,.2)':'var(--panel2)'};color:${act?'#a78bfa':'var(--text)'};transition:all .15s">
            ${s} <span style="font-family:monospace;font-size:.64rem;font-weight:900;color:${act?'#a78bfa':'var(--muted2)'}">${n}</span>${act?' ✕':''}
          </button>`;
        }).join('')}
      </div>`;
    }
    cEl.innerHTML=`<div style="margin-bottom:1rem">
      <div style="display:flex;gap:.35rem;flex-wrap:wrap;align-items:center">
        <span style="font-size:.64rem;color:var(--muted2);text-transform:uppercase;letter-spacing:.07em;font-weight:700">Tipo de equipo:</span>
        ${chipTodos}${chipTipos}
      </div>
      ${chipSubs}
    </div>`;
  }

  const _tbAux=lista.slice().reverse().map(r=>{
    const eq=DB.equipos.find(e=>e.id===r.eqId);
    const eqLabel=eq?`<span class="mono" style="font-size:.71rem;color:var(--mec)">${eq.codigo}</span> ${eq.nombre.split(' ').slice(0,2).join(' ')}`:'—';
    const anulado=r.est==='Anulado';
    return`<tr style="${anulado?'opacity:.55':''}">
      <td class="mono" style="color:var(--mec);font-size:.71rem">${r.cod||'—'}</td>
      <td class="mono">${r.fecha||'—'}</td>
      <td style="font-size:.8rem">${eqLabel}</td>
      <td class="mono tr" style="font-size:.78rem">${r.horometro!=null?fmtN(r.horometro)+' h':'—'}</td>
      <td><span class="badge b-purple" style="font-size:.64rem">${r.tipo||'—'}</span></td>
      <td style="font-size:.77rem;max-width:170px;white-space:normal;${anulado?'text-decoration:line-through':''}">${r.desc||'—'}</td>
      <td style="font-size:.78rem">${r.mec||'—'}</td>
      <td class="mono tr">${r.tiempoParada!=null?fmtN(r.tiempoParada)+' h':'—'}</td>
      <td>${bge(r.est)}</td>
      <td><span class="mono" style="font-size:.72rem;color:#a78bfa">${eq?eq.proyecto||'—':'—'}</span></td>
      <td style="font-size:.72rem;color:var(--muted2)">${DB.auxMecInsumos.filter(i=>i.auxilioId===r.id).length||'—'}</td>
      <td style="display:flex;gap:.3rem;flex-wrap:nowrap">
        <button class="btn btn-out btn-sm" title="Ver detalle" onclick="verAuxMec(${r.id})" style="color:#3b82f6;border-color:#3b82f660">👁</button>
        <button class="btn btn-out btn-sm" title="Editar" onclick="intentarEditarAuxMec(${r.id})" style="color:#f59e0b;border-color:#f59e0b60">✏️</button>
        <button class="btn btn-out btn-sm" title="Imprimir informe PDF" onclick="imprimirAuxMec(${r.id})" style="color:#8b5cf6;border-color:#8b5cf660">🖨</button>
        ${!anulado?`<button class="btn btn-out btn-sm" title="Anular" onclick="anularAuxMec(${r.id})" style="color:#ef4444;border-color:#ef444460">🚫</button>`:''}
        ${anulado?`<button class="btn btn-del btn-sm" title="Eliminar" onclick="del('auxiliosMecanicos',${r.id})">🗑</button>`:(_amPuedeEliminar(r.id)?`<button class="btn btn-del btn-sm" title="Eliminar (disponible 48h desde la creación)" onclick="del('auxiliosMecanicos',${r.id})">🗑</button>`:'')}
      </td>
    </tr>`;
  }).join('');
  document.getElementById('tbAuxMec').innerHTML=_tbAux||`<tr><td colspan="12" style="text-align:center;padding:2.5rem;color:var(--muted2);font-size:.85rem">Sin auxilios mecánicos ${_amTodoPer?'registrados':'en este período'}${_amTipo?' para '+_amTipo+(_amSub?' · '+_amSub:''):''}</td></tr>`;
}
function openAuxMec(){
  _amEditId=null;
  document.querySelector('#mAuxMec .mttl').textContent='🚨 Registrar Auxilio Mecánico';
  _amTab=0;amGoTab(0);
  const eqSel=document.getElementById('amEq');
  if(eqSel)eqSel.innerHTML='<option value="">— Seleccionar —</option>'+DB.equipos.map(e=>`<option value="${e.id}">${e.codigo} – ${e.nombre.split(' ').slice(0,3).join(' ')}</option>`).join('');
  const mecSel=document.getElementById('amMec');
  if(mecSel)mecSel.innerHTML=_mecOptsHtml('');
  const mec2Sel=document.getElementById('amMec2');
  if(mec2Sel)mec2Sel.innerHTML=_mecOptsHtml('');
  const ayuSel=document.getElementById('amNMec');
  if(ayuSel)ayuSel.innerHTML=_mecOptsHtml('');
  const fSel=document.getElementById('amFrente');
  if(fSel)fSel.innerHTML='<option value="">— Seleccionar frente —</option>'+DB.frentesTrabajo.map(f=>`<option>${f.nombre}</option>`).join('');
  const yr=new Date().getFullYear();
  document.getElementById('amCod').value=`AUX-${yr}-${String(DB.auxiliosMecanicos.length+1).padStart(4,'0')}`;
  document.getElementById('amFecha').value=today();
  ['amHora','amOp','amHorometro','amDesc','amAccion','amParada','amObs','amNMec','amTrasladoDest','amSupervisor'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('amNMec').value='';
  document.getElementById('amTipo').value='Mecánico';
  document.getElementById('amTipoInt').value='Correctiva no planificada';
  document.getElementById('amCausaRaiz').value='';
  document.getElementById('amTraslado').value='No';
  document.getElementById('amTrasladoDiv').style.display='none';
  document.getElementById('amEst').value='Pendiente';
  document.getElementById('amConforme').checked=false;
  document.getElementById('amInsumosBody').innerHTML='';
  _renderAmMedia(null,null);
  _amPopulateMatDatalist();
  openM('mAuxMec');
}
function gAuxMec(){
  const eqId=+document.getElementById('amEq').value||null;
  const horometro=parseFloat(document.getElementById('amHorometro').value)||null;
  if(!eqId){toast('Seleccione un equipo (Tab Identificación)',true);amGoTab(0);return;}
  if(!horometro){toast('El horómetro/Km es obligatorio (Tab Identificación)',true);amGoTab(0);return;}
  if(!document.getElementById('amDesc').value.trim()){toast('Ingrese descripción del problema (Tab Diagnóstico)',true);amGoTab(1);return;}
  const rec={
    id:nid('auxMec'),
    cod:document.getElementById('amCod').value,
    fecha:document.getElementById('amFecha').value||today(),
    hora:document.getElementById('amHora').value||null,
    eqId,horometro,
    operador:document.getElementById('amOp').value.trim()||null,
    frente:document.getElementById('amFrente').value||null,
    tipo:document.getElementById('amTipo').value,
    tipoInt:document.getElementById('amTipoInt').value,
    desc:document.getElementById('amDesc').value.trim(),
    causaRaiz:document.getElementById('amCausaRaiz').value||null,
    mec:document.getElementById('amMec').value||null,
    mec2:document.getElementById('amMec2').value||null,
    ayudante:document.getElementById('amNMec').value.trim()||null,
    accion:document.getElementById('amAccion').value.trim()||null,
    tiempoParada:parseFloat(document.getElementById('amParada').value)||null,
    traslado:document.getElementById('amTraslado').value,
    trasladoDest:document.getElementById('amTrasladoDest').value.trim()||null,
    est:document.getElementById('amEst').value,
    supervisor:document.getElementById('amSupervisor').value.trim()||null,
    conforme:document.getElementById('amConforme').checked,
    obs:document.getElementById('amObs').value.trim()||null,
  };
  const _saveInsumos=(auxilioId)=>{
    amGetInsumos().forEach(ins=>{
      const insRec={id:nid('auxMecIns'),auxilioId,desc:ins.desc,cod:ins.cod||null,cant:ins.cant,und:ins.und||null,origen:ins.origen};
      DB.auxMecInsumos.push(insRec);
      syncSheet('saveAuxMecInsumo',insRec);
    });
  };
  if(_amEditId!==null){
    // EDITAR: actualizar registro existente
    const idx=DB.auxiliosMecanicos.findIndex(x=>x.id===_amEditId);
    if(idx>-1){DB.auxiliosMecanicos[idx]={...DB.auxiliosMecanicos[idx],...rec,id:_amEditId};syncSheet('saveAuxMec',DB.auxiliosMecanicos[idx]);}
    // Reemplazar insumos: borrar los viejos e insertar nuevos
    const viejosIds=DB.auxMecInsumos.filter(i=>i.auxilioId===_amEditId).map(i=>i.id);
    DB.auxMecInsumos=DB.auxMecInsumos.filter(i=>i.auxilioId!==_amEditId);
    viejosIds.forEach(vid=>supaDelete('auxMecInsumos',vid));
    _saveInsumos(_amEditId);
    _amEditId=null;
    closeM('mAuxMec');rAuxMec();toast('Auxilio actualizado: '+rec.cod);
  }else{
    // CREAR: nuevo registro
    DB.auxiliosMecanicos.push(rec);
    syncSheet('saveAuxMec',rec);
    _saveInsumos(rec.id);
    // Guardar timestamp de creación para la ventana de 48h del botón eliminar
    try{const d=JSON.parse(localStorage.getItem('ecosermo_auxmec_ts')||'{}');d[rec.id]=Date.now();localStorage.setItem('ecosermo_auxmec_ts',JSON.stringify(d));}catch(e){}
    closeM('mAuxMec');rAuxMec();toast('Auxilio registrado: '+rec.cod);
  }
}

// Bloquea la edición de auxilios anulados (salvo administrador general)
function intentarEditarAuxMec(id){
  const r=DB.auxiliosMecanicos.find(x=>x.id===id);if(!r)return;
  if(r.est==='Anulado'&&(!CU||CU.codigo!=='EIBEL25')){
    alert('⚠️ Este auxilio mecánico está anulado y ya no se puede editar.\n\nComunícate con el Administrador General si necesitas reactivarlo.');
    return;
  }
  editAuxMec(id);
}
// Anula un auxilio (queda en el historial marcado como Anulado, sin borrarlo)
function anularAuxMec(id){
  const r=DB.auxiliosMecanicos.find(x=>x.id===id);if(!r)return;
  if(r.est==='Anulado'){toast('Este auxilio ya está anulado',true);return;}
  const motivo=prompt('Motivo de anulación (opcional):','');
  if(motivo===null)return;
  if(!confirm('¿Anular el auxilio '+(r.cod||'')+'?\n\nQuedará marcado como Anulado en el historial y no podrá editarse.'))return;
  r.est='Anulado';
  r.motivoAnulacion=motivo.trim()||null;
  syncSheet('saveAuxMec',r);
  rAuxMec();
  toast('Auxilio anulado: '+(r.cod||''));
}
function editAuxMec(id){
  const r=DB.auxiliosMecanicos.find(x=>x.id===id);if(!r)return;
  openAuxMec(); // openAuxMec() resetea _amEditId a null (modo "nuevo") — por eso se asigna DESPUÉS, no antes
  _amEditId=id;
  // Sobreescribir código y modo
  document.getElementById('amCod').value=r.cod||'';
  document.querySelector('#mAuxMec .mttl').textContent='✏️ Editar Auxilio: '+r.cod;
  // Tab 0
  const eqSel=document.getElementById('amEq');if(eqSel&&r.eqId)eqSel.value=r.eqId;
  document.getElementById('amFecha').value=r.fecha||'';
  document.getElementById('amHora').value=r.hora||'';
  document.getElementById('amHorometro').value=r.horometro||'';
  document.getElementById('amOp').value=r.operador||'';
  const fSel=document.getElementById('amFrente');if(fSel)fSel.value=r.frente||'';
  // Tab 1
  document.getElementById('amTipo').value=r.tipo||'Mecánico';
  document.getElementById('amTipoInt').value=r.tipoInt||'Correctiva no planificada';
  document.getElementById('amDesc').value=r.desc||'';
  document.getElementById('amCausaRaiz').value=r.causaRaiz||'';
  // Tab 2
  const mecSel=document.getElementById('amMec');if(mecSel)mecSel.innerHTML=_mecOptsHtml(r.mec||'');
  const mec2Sel=document.getElementById('amMec2');if(mec2Sel)mec2Sel.innerHTML=_mecOptsHtml(r.mec2||'');
  const ayuSel=document.getElementById('amNMec');if(ayuSel)ayuSel.innerHTML=_mecOptsHtml(r.ayudante||'');
  document.getElementById('amAccion').value=r.accion||'';
  document.getElementById('amParada').value=r.tiempoParada||'';
  document.getElementById('amTraslado').value=r.traslado||'No';
  document.getElementById('amTrasladoDiv').style.display=r.traslado==='Sí'?'':'none';
  document.getElementById('amTrasladoDest').value=r.trasladoDest||'';
  document.getElementById('amEst').value=r.est||'Pendiente';
  // Tab 3 — insumos
  document.getElementById('amInsumosBody').innerHTML='';
  DB.auxMecInsumos.filter(i=>i.auxilioId===id).forEach(ins=>{
    document.getElementById('amInsumosBody').appendChild((()=>{
      const ISS='background:var(--panel2);border:1px solid var(--border);border-radius:4px;padding:.25rem .4rem;color:var(--text);font-size:.73rem;width:100%';
      const tr=document.createElement('tr');
      tr.innerHTML=`<td><input style="${ISS}" list="dlAmMat" autocomplete="off" value="${ins.desc||''}" oninput="_amInsumoDescInput(this)"></td>
        <td><input style="${ISS};width:85px" value="${ins.cod||''}"></td>
        <td><input type="number" style="${ISS};width:65px" step="0.01" min="0" value="${ins.cant||0}"></td>
        <td><input style="${ISS};width:60px" value="${ins.und||''}"></td>
        <td><select style="${ISS};width:150px">${_provOptsHtml(ins.origen)}</select></td>
        <td><button class="btn btn-del btn-sm" onclick="this.closest('tr').remove()" style="padding:.2rem .4rem">✕</button></td>`;
      return tr;
    })());
  });
  document.getElementById('amSupervisor').value=r.supervisor||'';
  document.getElementById('amConforme').checked=!!r.conforme;
  document.getElementById('amObs').value=r.obs||'';
  _renderAmMedia(r.fotosAntes,r.fotosDespues);
}
let _amVerId=null;
function verAuxMec(id){
  const r=DB.auxiliosMecanicos.find(x=>x.id===id);if(!r)return;
  _amVerId=id;
  const eq=DB.equipos.find(e=>e.id===r.eqId);
  const ins=DB.auxMecInsumos.filter(i=>i.auxilioId===id);
  const fotosAntes=_amFotosArr(r.fotosAntes),fotosDespues=_amFotosArr(r.fotosDespues);
  const galVer=fotos=>fotos.length?`<div style="display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.3rem">${fotos.map(f=>`<img src="${f.url}" onclick="window.open('${f.url}','_blank')" style="width:78px;height:78px;object-fit:cover;border-radius:6px;border:1px solid var(--border);cursor:pointer">`).join('')}</div>`:'<span style="color:var(--muted);font-size:.78rem">Sin fotos</span>';
  const row=(l,v)=>`<div style="display:flex;gap:.5rem;padding:.3rem 0;border-bottom:1px solid var(--border)"><span style="color:var(--muted2);min-width:160px;font-size:.75rem">${l}</span><span style="font-weight:500">${v||'—'}</span></div>`;
  const sec=(t)=>`<div style="background:var(--mec);color:#fff;font-size:.7rem;font-weight:700;padding:.25rem .6rem;border-radius:4px;margin:.7rem 0 .3rem;letter-spacing:.05em">${t}</div>`;
  document.getElementById('auxVerTtl').textContent='🔍 '+r.cod;
  document.getElementById('auxVerBody').innerHTML=`
    ${sec('IDENTIFICACIÓN')}
    ${row('Código',r.cod)}${row('Fecha',r.fecha)}${row('Hora',r.hora)}
    ${row('Equipo',eq?eq.codigo+' – '+eq.nombre:r.eqId)}
    ${row('Horómetro/Km',r.horometro!=null?fmtN(r.horometro)+' h':'—')}
    ${row('Operador',r.operador)}${row('Frente',r.frente)}
    ${sec('DIAGNÓSTICO')}
    ${row('Tipo de Falla',r.tipo)}${row('Tipo de Intervención',r.tipoInt)}
    ${row('Descripción',r.desc)}${row('Causa Raíz',r.causaRaiz)}
    ${sec('ATENCIÓN')}
    ${row('Mecánico',r.mec)}${row('Mecánico 2',r.mec2)}
    ${row('Ayudante',r.ayudante)}
    ${row('Acciones',r.accion)}
    ${row('T. Parada',r.tiempoParada!=null?fmtN(r.tiempoParada)+' h':'—')}
    ${row('Traslado',r.traslado+(r.trasladoDest?' → '+r.trasladoDest:''))}
    ${row('Estado',r.est)}
    ${r.est==='Anulado'?row('Motivo de Anulación',r.motivoAnulacion||'—'):''}
    ${sec('INSUMOS Y REPUESTOS')}
    ${ins.length?`<table style="width:100%;font-size:.75rem;border-collapse:collapse;margin-top:.3rem">
      <thead><tr style="color:var(--muted2)"><th style="text-align:left;padding:.2rem .4rem">Descripción</th><th>Cód.</th><th>Cant.</th><th>Und.</th><th>Origen</th></tr></thead>
      <tbody>${ins.map(i=>`<tr style="border-top:1px solid var(--border)"><td style="padding:.25rem .4rem">${i.desc}</td><td class="mono">${i.cod||'—'}</td><td class="mono tr">${i.cant}</td><td>${i.und||'—'}</td><td style="font-size:.7rem">${i.origen}</td></tr>`).join('')}</tbody>
    </table>`:'<span style="color:var(--muted);font-size:.78rem">Sin insumos registrados</span>'}
    ${sec('CIERRE')}
    ${row('Supervisor',r.supervisor)}
    ${row('Operador conforme',r.conforme?'✅ Sí':'❌ No')}
    ${row('Observaciones',r.obs)}
    ${sec('EVIDENCIA FOTOGRÁFICA')}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:.8rem;margin-top:.3rem">
      <div><span style="font-size:.68rem;font-weight:700;color:#ef4444;text-transform:uppercase">Antes</span>${galVer(fotosAntes)}</div>
      <div><span style="font-size:.68rem;font-weight:700;color:#10b981;text-transform:uppercase">Después</span>${galVer(fotosDespues)}</div>
    </div>
  `;
  openM('mAuxMecVer');
}

// ── Informe PDF del Auxilio (todos los datos + evidencia fotográfica) ──
function imprimirAuxMec(id){
  const r=DB.auxiliosMecanicos.find(x=>x.id===id);if(!r){toast('Auxilio no encontrado',true);return;}
  const eq=DB.equipos.find(e=>e.id===r.eqId);
  const ins=DB.auxMecInsumos.filter(i=>i.auxilioId===id);
  const fotosAntes=_amFotosArr(r.fotosAntes),fotosDespues=_amFotosArr(r.fotosDespues);
  const _logoUrl=window.location.href.replace(/[^\/\\]+$/,'')+'09.-ERP/Imagenes/ECOSERMO-LOGO.png';
  const row=(l,v)=>`<tr><td style="padding:3px 8px;color:#64748b;font-size:10px;font-weight:700;width:150px;vertical-align:top;white-space:nowrap">${l}</td><td style="padding:3px 8px;font-size:11px;color:#111">${v||'—'}</td></tr>`;
  const sec=t=>`<div style="background:#1e293b;color:#fff;font-size:10px;font-weight:700;padding:4px 8px;border-radius:4px;margin:10px 0 4px;letter-spacing:.05em">${t}</div>`;
  const galeria=fotos=>fotos.length?`<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px">${fotos.map(f=>`<img src="${f.url}" style="width:130px;height:130px;object-fit:cover;border-radius:4px;border:1px solid #cbd5e1">`).join('')}</div>`:'<div style="font-size:10px;color:#94a3b8;padding:4px 0">Sin fotos registradas</div>';
  const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Auxilio ${r.cod}</title>
  <style>@page{size:A4 portrait;margin:1.2cm}*{box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
  body{font-family:Arial,sans-serif;color:#111;margin:0}
  table{width:100%;border-collapse:collapse}
  tr{page-break-inside:avoid}</style></head><body>
  <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #1e293b;padding-bottom:8px;margin-bottom:4px">
    <img src="${_logoUrl}" style="height:44px;object-fit:contain">
    <div style="text-align:center;flex:1">
      <div style="font-size:15px;font-weight:900;color:#1e293b">INFORME DE AUXILIO MECÁNICO</div>
      <div style="font-size:10px;color:#64748b">ECOSERMO – Sistema de Control de Mantenimiento – GDAR</div>
    </div>
    <div style="font-size:18px;font-weight:900;color:#ef4444;font-family:monospace;background:#fef2f2;border:2px solid #ef4444;padding:4px 10px;border-radius:6px">${r.cod}</div>
  </div>
  ${sec('IDENTIFICACIÓN')}
  <table><tr>
    <td style="width:50%;vertical-align:top"><table>${row('Fecha',r.fecha)}${row('Hora',r.hora)}${row('Equipo',eq?eq.codigo+' – '+eq.nombre:'—')}${row('Horómetro/Km',r.horometro!=null?fmtN(r.horometro)+' h':'—')}</table></td>
    <td style="width:50%;vertical-align:top"><table>${row('Operador',r.operador)}${row('Frente',r.frente)}${row('Proyecto',eq?eq.proyecto||'—':'—')}${row('Estado',r.est)}</table></td>
  </tr></table>
  ${sec('DIAGNÓSTICO')}
  <table>${row('Tipo de Falla',r.tipo)}${row('Tipo de Intervención',r.tipoInt)}${row('Descripción',r.desc)}${row('Causa Raíz',r.causaRaiz)}</table>
  ${sec('ATENCIÓN')}
  <table><tr>
    <td style="width:50%;vertical-align:top"><table>${row('Mecánico',r.mec)}${row('Mecánico 2',r.mec2)}${row('Ayudante',r.ayudante)}</table></td>
    <td style="width:50%;vertical-align:top"><table>${row('T. Parada',r.tiempoParada!=null?fmtN(r.tiempoParada)+' h':'—')}${row('Traslado',r.traslado+(r.trasladoDest?' → '+r.trasladoDest:''))}</table></td>
  </tr></table>
  <table>${row('Acciones Realizadas',r.accion)}</table>
  ${sec('INSUMOS Y REPUESTOS')}
  ${ins.length?`<table style="border:1px solid #cbd5e1;font-size:10px">
    <thead><tr style="background:#f1f5f9"><th style="padding:4px 6px;text-align:left;border:1px solid #cbd5e1">Descripción</th><th style="padding:4px 6px;border:1px solid #cbd5e1">Cód.</th><th style="padding:4px 6px;border:1px solid #cbd5e1">Cant.</th><th style="padding:4px 6px;border:1px solid #cbd5e1">Und.</th><th style="padding:4px 6px;border:1px solid #cbd5e1">Origen</th></tr></thead>
    <tbody>${ins.map(i=>`<tr><td style="padding:3px 6px;border:1px solid #cbd5e1">${i.desc}</td><td style="padding:3px 6px;border:1px solid #cbd5e1;text-align:center">${i.cod||'—'}</td><td style="padding:3px 6px;border:1px solid #cbd5e1;text-align:right">${i.cant}</td><td style="padding:3px 6px;border:1px solid #cbd5e1;text-align:center">${i.und||'—'}</td><td style="padding:3px 6px;border:1px solid #cbd5e1">${i.origen||'—'}</td></tr>`).join('')}</tbody>
  </table>`:'<div style="font-size:10px;color:#94a3b8;padding:4px 0">Sin insumos registrados</div>'}
  ${sec('CIERRE')}
  <table>${row('Supervisor',r.supervisor)}${row('Operador conforme',r.conforme?'Sí':'No')}${row('Observaciones',r.obs)}</table>
  ${r.est==='Anulado'?`<table>${row('Motivo de Anulación',r.motivoAnulacion)}</table>`:''}
  ${sec('EVIDENCIA FOTOGRÁFICA — ANTES')}
  ${galeria(fotosAntes)}
  ${sec('EVIDENCIA FOTOGRÁFICA — DESPUÉS')}
  ${galeria(fotosDespues)}
  <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:2rem;margin-top:2.2rem;border-top:1px solid #ddd;padding-top:1rem">
    <div style="text-align:center"><div style="height:38px"></div><div style="border-top:1.5px solid #333;margin:0 8px 5px"></div><div style="font-size:9.5px;text-transform:uppercase;font-weight:700;color:#1e293b;letter-spacing:.06em">Mecánico</div></div>
    <div style="text-align:center"><div style="height:38px"></div><div style="border-top:1.5px solid #333;margin:0 8px 5px"></div><div style="font-size:9.5px;text-transform:uppercase;font-weight:700;color:#1e293b;letter-spacing:.06em">Supervisor: ${r.supervisor||''}</div></div>
  </div>
  <script>window.onload=()=>{window.print();}<\/script></body></html>`;
  const w=window.open('','_blank');
  if(!w){toast('Active ventanas emergentes para imprimir',true);return;}
  w.document.write(html);w.document.close();
}
