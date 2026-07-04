// ══ SEGUIMIENTO GENERAL (Panel tipo Trello) ══
let _segTab=1,_segQ='',_segFResp='',_segDragId=null,_segCompId=null;

const SEG_ESTADOS=[
  {key:'Pendiente', icon:'📋', color:'#f59e0b'},
  {key:'En Proceso',icon:'🚧', color:'#3b82f6'},
  {key:'Completado',icon:'✅', color:'#10b981'}
];
const SEG_CAUSAS=['Falta de recursos','Falta de materiales','Falta de personal','Equipos / maquinaria','Clima','Logística / transporte','Aprobaciones / permisos','Mala programación','Cambio de alcance','Otros'];
const SEG_PRIO={'Alta':'#ef4444','Media':'#f59e0b','Baja':'#3b82f6'};

function rSeguimiento(){
  _segEnsureModals();
  _segRender();
}

function _segTabSwitch(n){
  _segTab=n;
  document.querySelectorAll('.seg-tab').forEach((b,i)=>b.classList.toggle('active',i+1===n));
  _segRender();
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function _segDias(a,b){return Math.round((new Date(b)-new Date(a))/864e5);}

// Desfase en días: >0 se completó tarde, <0 antes de lo prometido, null si no aplica
function _segDesfase(t){
  if(!t.fechaProm||!t.fechaComp)return null;
  return _segDias(t.fechaProm,t.fechaComp);
}

function _segBadgeDesfase(d){
  if(d===null)return '';
  if(d>0) return `<span class="badge b-red">+${d} día${d===1?'':'s'} tarde</span>`;
  if(d<0) return `<span class="badge b-cyan">${-d} día${d===-1?'':'s'} antes</span>`;
  return '<span class="badge b-green">A tiempo</span>';
}

function _segTareas(){
  let list=DB.seguimiento||[];
  if(_segQ){
    const q=_segQ.toLowerCase();
    list=list.filter(t=>Object.values(t).join(' ').toLowerCase().includes(q));
  }
  if(_segFResp)list=list.filter(t=>t.responsable===_segFResp);
  return list;
}

function _segRender(){
  const body=document.getElementById('segBody');if(!body)return;
  if(_segTab===1)_segRenderBoard(body);
  else _segRenderAnalisis(body);
}

// ── Barra de filtros ─────────────────────────────────────────────────────────
function _segFiltroBar(){
  const resps=[...new Set((DB.seguimiento||[]).map(t=>t.responsable).filter(Boolean))].sort();
  return `<div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;margin-bottom:.8rem;padding:.4rem .7rem;background:var(--panel2);border:1px solid var(--border);border-radius:8px">
    <div class="search-wrap" style="flex:0 0 220px"><span>🔍</span><input class="search-input" placeholder="Buscar tarea..." value="${_segQ}" oninput="_segQ=this.value;_segRender()"></div>
    <span style="font-size:.62rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.08em">Responsable</span>
    <select onchange="_segFResp=this.value;_segRender()" style="width:auto;min-width:160px;font-size:.75rem;padding:.25rem .5rem">
      <option value="">— Todos —</option>
      ${resps.map(r=>`<option ${r===_segFResp?'selected':''}>${r}</option>`).join('')}
    </select>
    <button class="btn btn-a" style="--ba:var(--ctl);margin-left:auto" onclick="_segNueva()">＋ Nueva Tarea</button>
  </div>`;
}

// ── TAB 1: TABLERO ───────────────────────────────────────────────────────────
function _segRenderBoard(body){
  const hoy=today();
  const tareas=_segTareas();
  const abiertas=tareas.filter(t=>t.est!=='Completado');
  const vencidas=abiertas.filter(t=>t.fechaProm&&t.fechaProm<hoy);
  const comp=tareas.filter(t=>t.est==='Completado');
  const aTiempo=comp.filter(t=>{const d=_segDesfase(t);return d!==null&&d<=0;});

  const kpis=`<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:.6rem;margin-bottom:.9rem">
    ${_segKpi('Tareas Abiertas',abiertas.length,'#3b82f6')}
    ${_segKpi('Vencidas',vencidas.length,vencidas.length?'#ef4444':'#10b981')}
    ${_segKpi('Completadas',comp.length,'#10b981')}
    ${_segKpi('% A Tiempo',comp.length?Math.round(aTiempo.length/comp.length*100)+'%':'—','#8b5cf6')}
  </div>`;

  const cols=SEG_ESTADOS.map(est=>{
    const items=tareas.filter(t=>(t.est||'Pendiente')===est.key)
      .sort((a,b)=>(a.fechaProm||'9999')<(b.fechaProm||'9999')?-1:1);
    return `<div class="seg-col" ondragover="_segDragOver(event)" ondragleave="_segDragLeave(event)" ondrop="_segDrop(event,'${est.key}')">
      <div class="seg-col-head" style="--cc:${est.color}">
        <span>${est.icon} ${est.key}</span>
        <span class="seg-col-count">${items.length}</span>
      </div>
      <div class="seg-col-body">
        ${items.map(t=>_segCard(t,hoy)).join('')||'<div style="text-align:center;color:var(--muted2);font-size:.68rem;padding:1.2rem 0">Arrastra tarjetas aquí</div>'}
      </div>
    </div>`;
  }).join('');

  body.innerHTML=_segFiltroBar()+kpis+`<div class="seg-board">${cols}</div>`;
}

function _segCard(t,hoy){
  const pc=SEG_PRIO[t.prioridad]||'#3b82f6';
  const d=_segDesfase(t);
  const vencida=t.est!=='Completado'&&t.fechaProm&&t.fechaProm<hoy;
  const diasVenc=vencida?_segDias(t.fechaProm,hoy):0;
  const fmtF=f=>f?new Date(f+'T12:00').toLocaleDateString('es-PE',{day:'2-digit',month:'short'}):'—';
  return `<div class="seg-card" style="--sc:${pc}" draggable="true"
      ondragstart="_segDragStart(event,${t.id})" onclick="_segEdit(${t.id})">
    <div style="display:flex;align-items:center;gap:.4rem;margin-bottom:.3rem">
      <span style="font-size:.58rem;font-weight:700;color:${pc};text-transform:uppercase;letter-spacing:.06em">● ${t.prioridad||'Media'}</span>
      ${t.area?`<span style="font-size:.58rem;color:var(--muted2)">· ${t.area}</span>`:''}
      <span style="margin-left:auto;display:flex;gap:.25rem">
        ${t.est!=='Completado'?`<button class="seg-cbtn" title="Marcar completada" onclick="event.stopPropagation();_segOpenComp(${t.id})">✓</button>`:''}
        <button class="seg-cbtn" title="Eliminar" style="color:#ef4444" onclick="event.stopPropagation();_segDel(${t.id})">🗑</button>
      </span>
    </div>
    <div style="font-size:.8rem;font-weight:700;color:var(--text);line-height:1.25;margin-bottom:.25rem">${t.titulo||'(sin título)'}</div>
    ${t.desc?`<div style="font-size:.66rem;color:var(--muted2);margin-bottom:.35rem;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${t.desc}</div>`:''}
    ${t.recursos?`<div style="font-size:.64rem;color:#06b6d4;margin-bottom:.35rem">📦 ${t.recursos}</div>`:''}
    <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;font-size:.64rem;color:var(--muted2)">
      ${t.responsable?`<span>👤 ${t.responsable}</span>`:''}
      ${t.fechaProm?`<span style="${vencida?'color:#ef4444;font-weight:700':''}">🗓 ${fmtF(t.fechaProm)}${vencida?' · vencida hace '+diasVenc+' d':''}</span>`:''}
    </div>
    ${t.est==='Completado'?`<div style="margin-top:.4rem;padding-top:.4rem;border-top:1px dashed var(--border);display:flex;align-items:center;gap:.4rem;flex-wrap:wrap">
      <span style="font-size:.64rem;color:#10b981">✅ ${fmtF(t.fechaComp)}</span>${_segBadgeDesfase(d)}
      ${d>0&&t.causaDesfase?`<span style="font-size:.6rem;color:#f59e0b;width:100%">⚠ ${t.causaDesfase}${t.causaDetalle?': '+t.causaDetalle:''}</span>`:''}
    </div>`:''}
  </div>`;
}

// ── Drag & Drop ──────────────────────────────────────────────────────────────
function _segDragStart(ev,id){_segDragId=id;ev.dataTransfer.effectAllowed='move';}
function _segDragOver(ev){ev.preventDefault();ev.currentTarget.classList.add('drag-over');}
function _segDragLeave(ev){ev.currentTarget.classList.remove('drag-over');}
function _segDrop(ev,est){
  ev.preventDefault();ev.currentTarget.classList.remove('drag-over');
  if(_segDragId===null)return;
  _segMove(_segDragId,est);
  _segDragId=null;
}

function _segMove(id,est){
  const t=(DB.seguimiento||[]).find(x=>x.id===id);if(!t||t.est===est)return;
  if(est==='Completado'){_segOpenComp(id);return;}
  t.est=est;
  // al reabrir una tarea completada se limpia el cierre anterior
  if(t.fechaComp){t.fechaComp='';t.causaDesfase='';t.causaDetalle='';}
  syncSheet('saveSegTarea',t);
  _segRender();
  toast('Tarea movida a '+est);
}

// ── Modal: nueva / editar ────────────────────────────────────────────────────
let _segEditId=null;
function _segNueva(){_segEditId=null;_segFillForm({});document.getElementById('segMtl').textContent='＋ Nueva Tarea';openM('mSegTarea');}
function _segEdit(id){
  const t=(DB.seguimiento||[]).find(x=>x.id===id);if(!t)return;
  _segEditId=id;_segFillForm(t);
  document.getElementById('segMtl').textContent='✏️ Editar Tarea';
  openM('mSegTarea');
}
function _segFillForm(t){
  const dl=document.getElementById('segRespList');
  if(dl)dl.innerHTML=DB.personal.map(p=>`<option>${p.ape}, ${p.nom}</option>`).join('');
  const areaSel=document.getElementById('segArea');
  if(areaSel)areaSel.innerHTML='<option value=""></option>'+Object.values(AREAS).map(a=>`<option ${a.label===t.area?'selected':''}>${a.label}</option>`).join('');
  const set=(id,v)=>{const el=document.getElementById(id);if(el)el.value=v||'';};
  set('segTitulo',t.titulo);set('segDesc',t.desc);set('segResp',t.responsable);
  set('segRecursos',t.recursos);set('segFecha',t.fecha||today());set('segFechaProm',t.fechaProm);
  const p=document.getElementById('segPrio');if(p)p.value=t.prioridad||'Media';
  const e=document.getElementById('segEst');if(e)e.value=t.est||'Pendiente';
}
function _segSave(){
  const g=id=>document.getElementById(id).value.trim();
  const titulo=g('segTitulo');
  if(!titulo){toast('Ingrese el título de la tarea',true);return;}
  let t;
  if(_segEditId!==null){
    t=(DB.seguimiento||[]).find(x=>x.id===_segEditId);if(!t)return;
  }else{
    t={id:nid('seg'),est:'Pendiente',fechaComp:'',causaDesfase:'',causaDetalle:'',creadoPor:CU?CU.nombre:''};
    DB.seguimiento.push(t);
  }
  t.titulo=titulo;t.desc=g('segDesc');t.area=g('segArea');t.responsable=g('segResp');
  t.recursos=g('segRecursos');t.fecha=g('segFecha');t.fechaProm=g('segFechaProm');
  t.prioridad=g('segPrio');
  const nuevoEst=g('segEst');
  if(nuevoEst!=='Completado'&&t.fechaComp){t.fechaComp='';t.causaDesfase='';t.causaDetalle='';}
  if(nuevoEst==='Completado'&&t.est!=='Completado'){
    t.est=t.est||'Pendiente';
    syncSheet('saveSegTarea',t);closeM('mSegTarea');_segOpenComp(t.id);return;
  }
  t.est=nuevoEst;
  syncSheet('saveSegTarea',t);
  closeM('mSegTarea');_segRender();
  toast('Tarea guardada');
}
function _segDel(id){
  if(!confirm('¿Eliminar esta tarea?'))return;
  const i=(DB.seguimiento||[]).findIndex(x=>x.id===id);if(i<0)return;
  DB.seguimiento.splice(i,1);
  supaDelete('seguimiento',id);
  _segRender();
  toast('Tarea eliminada');
}

// ── Modal: completar tarea (fecha real + causa del desfase) ──────────────────
function _segOpenComp(id){
  const t=(DB.seguimiento||[]).find(x=>x.id===id);if(!t)return;
  _segCompId=id;
  document.getElementById('segCompInfo').innerHTML=`<b>${t.titulo}</b><br>
    <span style="font-size:.7rem;color:var(--muted2)">Fecha prometida: ${t.fechaProm||'— sin fecha —'}</span>`;
  document.getElementById('segCompFecha').value=t.fechaComp||today();
  const c=document.getElementById('segCompCausa');
  c.innerHTML='<option value=""></option>'+SEG_CAUSAS.map(x=>`<option ${x===t.causaDesfase?'selected':''}>${x}</option>`).join('');
  document.getElementById('segCompDet').value=t.causaDetalle||'';
  _segCompCalc();
  openM('mSegComp');
}
function _segCompCalc(){
  const t=(DB.seguimiento||[]).find(x=>x.id===_segCompId);if(!t)return;
  const f=document.getElementById('segCompFecha').value;
  const box=document.getElementById('segCompDesf');
  const causaWrap=document.getElementById('segCompCausaWrap');
  if(!t.fechaProm||!f){box.innerHTML='<span style="color:var(--muted2)">Sin fecha prometida: no se calcula desfase.</span>';causaWrap.style.display='none';return;}
  const d=_segDias(t.fechaProm,f);
  if(d>0){
    box.innerHTML=`<span style="color:#ef4444;font-weight:700">⚠ Desfase de +${d} día${d===1?'':'s'} sobre lo prometido.</span> Indique la causa:`;
    causaWrap.style.display='';
  }else{
    box.innerHTML=d<0
      ?`<span style="color:#06b6d4;font-weight:700">✓ Completada ${-d} día${d===-1?'':'s'} antes de lo prometido.</span>`
      :'<span style="color:#10b981;font-weight:700">✓ Completada a tiempo.</span>';
    causaWrap.style.display='none';
  }
}
function _segSaveComp(){
  const t=(DB.seguimiento||[]).find(x=>x.id===_segCompId);if(!t)return;
  const f=document.getElementById('segCompFecha').value;
  if(!f){toast('Ingrese la fecha de completado',true);return;}
  const d=t.fechaProm?_segDias(t.fechaProm,f):null;
  const causa=document.getElementById('segCompCausa').value;
  if(d!==null&&d>0&&!causa){toast('Indique la causa del desfase',true);return;}
  t.est='Completado';t.fechaComp=f;
  t.causaDesfase=(d!==null&&d>0)?causa:'';
  t.causaDetalle=(d!==null&&d>0)?document.getElementById('segCompDet').value.trim():'';
  syncSheet('saveSegTarea',t);
  closeM('mSegComp');_segRender();
  toast('Tarea completada');
}

// ── TAB 2: ANÁLISIS DE DESFASES ──────────────────────────────────────────────
function _segRenderAnalisis(body){
  const comp=(_segTareas()).filter(t=>t.est==='Completado'&&t.fechaComp);
  const conDesf=comp.map(t=>({t,d:_segDesfase(t)})).filter(x=>x.d!==null);
  const tarde=conDesf.filter(x=>x.d>0);
  const aTiempo=conDesf.filter(x=>x.d<=0);
  const prom=tarde.length?(tarde.reduce((s,x)=>s+x.d,0)/tarde.length).toFixed(1):0;

  // frecuencia de causas
  const causas={};
  tarde.forEach(x=>{const c=x.t.causaDesfase||'Sin causa registrada';causas[c]=(causas[c]||0)+1;});
  const causasOrd=Object.entries(causas).sort((a,b)=>b[1]-a[1]);
  const maxC=Math.max(...causasOrd.map(c=>c[1]),1);
  const colores=['#ef4444','#f97316','#f59e0b','#8b5cf6','#3b82f6','#06b6d4','#ec4899','#84cc16','#a78bfa','#6b7280'];

  const fmtF=f=>f?new Date(f+'T12:00').toLocaleDateString('es-PE',{day:'2-digit',month:'short',year:'2-digit'}):'—';

  body.innerHTML=_segFiltroBar()+`
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:.6rem;margin-bottom:.9rem">
    ${_segKpi('Completadas',comp.length,'#10b981')}
    ${_segKpi('A Tiempo',aTiempo.length+(conDesf.length?' ('+Math.round(aTiempo.length/conDesf.length*100)+'%)':''),'#06b6d4')}
    ${_segKpi('Con Retraso',tarde.length,tarde.length?'#ef4444':'#10b981')}
    ${_segKpi('Desfase Promedio',tarde.length?'+'+prom+' días':'—','#f59e0b')}
  </div>

  <div style="display:grid;grid-template-columns:1fr 1.4fr;gap:.8rem;align-items:start">
    <div class="card" style="padding:.8rem 1rem">
      <div style="font-size:.62rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted2);margin-bottom:.7rem">Causas de desfase más frecuentes</div>
      ${causasOrd.length?causasOrd.map(([c,n],i)=>{
        const col=colores[i%colores.length];
        return `<div style="margin-bottom:.45rem">
          <div style="display:flex;justify-content:space-between;margin-bottom:2px">
            <span style="font-size:.68rem;font-weight:700;color:${col}">${c}</span>
            <span style="font-size:.64rem;color:var(--muted2)">${n} tarea${n===1?'':'s'}</span>
          </div>
          <div style="background:var(--border);border-radius:4px;height:8px;overflow:hidden">
            <div style="height:100%;width:${Math.round(n/maxC*100)}%;background:${col};border-radius:4px"></div>
          </div>
        </div>`;
      }).join(''):'<div style="color:var(--muted2);font-size:.72rem;padding:.5rem 0">Sin tareas con retraso registradas. 🎉</div>'}
    </div>

    <div class="card" style="padding:0">
      <div class="card-head"><span class="card-title">Detalle de tareas completadas</span></div>
      <div class="tbl-wrap"><table style="font-size:.72rem">
        <thead><tr><th>Tarea</th><th>Responsable</th><th>Prometida</th><th>Completada</th><th>Desfase</th><th>Causa</th></tr></thead>
        <tbody>
        ${comp.length?comp.sort((a,b)=>(b.fechaComp||'')<(a.fechaComp||'')?-1:1).map(t=>{
          const d=_segDesfase(t);
          return `<tr style="cursor:pointer" onclick="_segEdit(${t.id})">
            <td style="font-weight:600">${t.titulo}</td>
            <td>${t.responsable||'—'}</td>
            <td>${fmtF(t.fechaProm)}</td>
            <td>${fmtF(t.fechaComp)}</td>
            <td>${_segBadgeDesfase(d)||'—'}</td>
            <td style="font-size:.65rem;color:var(--muted2)">${d>0?(t.causaDesfase||'—')+(t.causaDetalle?' · '+t.causaDetalle:''):'—'}</td>
          </tr>`;
        }).join(''):'<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--muted2)">Aún no hay tareas completadas</td></tr>'}
        </tbody>
      </table></div>
    </div>
  </div>`;
}

function _segKpi(label,val,color){
  return `<div style="background:var(--panel);border:1px solid var(--border);border-left:3px solid ${color};border-radius:8px;padding:.6rem .8rem">
    <div style="font-size:.58rem;font-weight:700;text-transform:uppercase;letter-spacing:.09em;color:var(--muted2);margin-bottom:.25rem">${label}</div>
    <div style="font-family:'Barlow Condensed',sans-serif;font-size:1.4rem;font-weight:800;color:${color};line-height:1">${val}</div>
  </div>`;
}

// ── Modales (se inyectan una sola vez) ───────────────────────────────────────
function _segEnsureModals(){
  if(document.getElementById('mSegTarea'))return;
  const d=document.createElement('div');
  d.innerHTML=`
<div class="mo" id="mSegTarea"><div class="modal" style="max-width:560px">
  <div class="mh"><span class="mttl" id="segMtl">Tarea</span><button class="mx" onclick="closeM('mSegTarea')">✕</button></div>
  <div class="mb">
    <div class="fg-grid">
      <div class="fg" style="grid-column:1/-1"><label>Título *</label><input id="segTitulo" placeholder="¿Qué se debe hacer?"></div>
      <div class="fg" style="grid-column:1/-1"><label>Descripción</label><textarea id="segDesc" rows="2" placeholder="Detalle de la tarea..."></textarea></div>
      <div class="fg"><label>Responsable</label><input id="segResp" list="segRespList" placeholder="Buscar o escribir..."><datalist id="segRespList"></datalist></div>
      <div class="fg"><label>Área</label><select id="segArea"></select></div>
      <div class="fg" style="grid-column:1/-1"><label>Recursos necesarios</label><input id="segRecursos" placeholder="Ej: 2 volquetes, cemento, cuadrilla de 4..."></div>
      <div class="fg"><label>Fecha de registro</label><input id="segFecha" type="date" style="color-scheme:dark"></div>
      <div class="fg"><label>Fecha prometida</label><input id="segFechaProm" type="date" style="color-scheme:dark"></div>
      <div class="fg"><label>Prioridad</label><select id="segPrio"><option>Alta</option><option>Media</option><option>Baja</option></select></div>
      <div class="fg"><label>Estado</label><select id="segEst"><option>Pendiente</option><option>En Proceso</option><option>Completado</option></select></div>
    </div>
  </div>
  <div class="mf"><button class="btn btn-out" onclick="closeM('mSegTarea')">Cancelar</button><button class="btn btn-a" style="--ba:#10b981" onclick="_segSave()">💾 Guardar</button></div>
</div></div>

<div class="mo" id="mSegComp"><div class="modal" style="max-width:460px">
  <div class="mh"><span class="mttl">✅ Completar Tarea</span><button class="mx" onclick="closeM('mSegComp')">✕</button></div>
  <div class="mb">
    <div id="segCompInfo" style="font-size:.82rem;margin-bottom:.7rem"></div>
    <div class="fg" style="margin-bottom:.6rem"><label>Fecha real de completado</label><input id="segCompFecha" type="date" style="color-scheme:dark" onchange="_segCompCalc()"></div>
    <div id="segCompDesf" style="font-size:.76rem;margin-bottom:.6rem;padding:.5rem .7rem;background:var(--panel2);border:1px solid var(--border);border-radius:7px"></div>
    <div id="segCompCausaWrap" style="display:none">
      <div class="fg" style="margin-bottom:.6rem"><label>Causa del desfase *</label><select id="segCompCausa"></select></div>
      <div class="fg"><label>Detalle de la causa</label><textarea id="segCompDet" rows="2" placeholder="Explique brevemente qué originó el retraso..."></textarea></div>
    </div>
  </div>
  <div class="mf"><button class="btn btn-out" onclick="closeM('mSegComp')">Cancelar</button><button class="btn btn-a" style="--ba:#10b981" onclick="_segSaveComp()">✓ Completar</button></div>
</div></div>`;
  while(d.firstChild)document.body.appendChild(d.firstChild);
}
