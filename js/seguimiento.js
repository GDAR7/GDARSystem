// ══ SEGUIMIENTO GENERAL (Panel tipo Trello) ══
let _segTab=1,_segQ='',_segFResp='',_segDragId=null,_segCompId=null,_segBloqId=null;

const SEG_ESTADOS=[
  {key:'Pendiente', icon:'📋', color:'#f59e0b'},
  {key:'Bloqueado', icon:'⛔', color:'#ef4444'},
  {key:'En Proceso',icon:'🚧', color:'#3b82f6'},
  {key:'Completado',icon:'✅', color:'#10b981'}
];
const SEG_CAUSAS=['Falta de recursos','Falta de materiales','Falta de personal','Equipos / maquinaria','Clima','Logística / transporte','Aprobaciones / permisos','Mala programación','Cambio de alcance','Otros'];
// Restricciones (CNC = Causa de No Cumplimiento) que bloquean una tarea
const SEG_RESTRICCIONES=['Cliente / Aprobación externa','Logística / Transporte','QA/QC / Calidad','Falta de materiales','Falta de equipos','Falta de personal','Ingeniería / Planos','Permisos / Seguridad','Depende de otra tarea','Otros'];
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
  else if(_segTab===2)_segRenderAnalisis(body);
  else _segRenderCarga(body);
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
  const bloqueadas=tareas.filter(t=>t.est==='Bloqueado');
  const vencidas=abiertas.filter(t=>t.fechaProm&&t.fechaProm<hoy);
  const comp=tareas.filter(t=>t.est==='Completado');
  const aTiempo=comp.filter(t=>{const d=_segDesfase(t);return d!==null&&d<=0;});

  const kpis=`<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:.6rem;margin-bottom:.9rem">
    ${_segKpi('Tareas Abiertas',abiertas.length,'#3b82f6')}
    ${_segKpi('Bloqueadas',bloqueadas.length,bloqueadas.length?'#ef4444':'#10b981')}
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
        ${t.est!=='Completado'&&t.est!=='Bloqueado'?`<button class="seg-cbtn" title="Bloquear (registrar restricción/CNC)" style="color:#ef4444" onclick="event.stopPropagation();_segOpenBloq(${t.id})">⛔</button>`:''}
        ${t.est==='Bloqueado'?`<button class="seg-cbtn" title="Desbloquear → En Proceso" style="color:#10b981" onclick="event.stopPropagation();_segDesbloq(${t.id})">🔓</button>`:''}
        ${t.est!=='Completado'?`<button class="seg-cbtn" title="Marcar completada" onclick="event.stopPropagation();_segOpenComp(${t.id})">✓</button>`:''}
        <button class="seg-cbtn" title="Eliminar" style="color:#ef4444" onclick="event.stopPropagation();_segDel(${t.id})">🗑</button>
      </span>
    </div>
    <div style="font-size:.8rem;font-weight:700;color:var(--text);line-height:1.25;margin-bottom:.25rem">${t.titulo||'(sin título)'}</div>
    ${t.desc?`<div style="font-size:.66rem;color:var(--muted2);margin-bottom:.35rem;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${t.desc}</div>`:''}
    ${t.est==='Bloqueado'&&t.restriccion?`<div style="font-size:.63rem;color:#fecaca;background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.4);border-radius:5px;padding:.22rem .45rem;margin-bottom:.35rem">🚫 <b>CNC:</b> ${t.restriccion}${t.restriccionDet?' — '+t.restriccionDet:''}${t.restriccionResp?`<div style="color:#fca5a5;margin-top:.1rem">🔧 Levanta: ${t.restriccionResp}${t.fechaBloq?' · bloqueada hace '+_segDias(t.fechaBloq,hoy)+' d':''}</div>`:t.fechaBloq?`<div style="color:#fca5a5;margin-top:.1rem">Bloqueada hace ${_segDias(t.fechaBloq,hoy)} d</div>`:''}</div>`:''}
    ${(t.reprogHist&&t.reprogHist.length)?`<div style="font-size:.62rem;color:#f59e0b;margin-bottom:.35rem" title="${t.reprogHist.map(r=>fmtF(r.de)+'→'+fmtF(r.a)).join(' · ')}">↻ Reprogramada ${t.reprogHist.length} ${t.reprogHist.length===1?'vez':'veces'} (${fmtF(t.reprogHist[0].de)} → ${fmtF(t.fechaProm)})</div>`:''}
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
  if(est==='Bloqueado'){_segOpenBloq(id);return;}
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
  const nuevaProm=g('segFechaProm');
  // Reprogramación: al editar, si la fecha prometida se mueve a una POSTERIOR, se registra en el historial
  if(_segEditId!==null&&t.fechaProm&&nuevaProm&&nuevaProm>t.fechaProm){
    t.reprogHist=t.reprogHist||[];
    t.reprogHist.push({de:t.fechaProm,a:nuevaProm,fecha:today(),por:CU?CU.nombre:''});
  }
  t.titulo=titulo;t.desc=g('segDesc');t.area=g('segArea');t.responsable=g('segResp');
  t.recursos=g('segRecursos');t.fecha=g('segFecha');t.fechaProm=nuevaProm;
  t.prioridad=g('segPrio');
  const nuevoEst=g('segEst');
  if(nuevoEst!=='Completado'&&t.fechaComp){t.fechaComp='';t.causaDesfase='';t.causaDetalle='';}
  if(nuevoEst==='Completado'&&t.est!=='Completado'){
    t.est=t.est||'Pendiente';
    syncSheet('saveSegTarea',t);closeM('mSegTarea');_segOpenComp(t.id);return;
  }
  if(nuevoEst==='Bloqueado'&&t.est!=='Bloqueado'){
    syncSheet('saveSegTarea',t);closeM('mSegTarea');_segOpenBloq(t.id);return;
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

// ── Modal: bloquear tarea (registrar restricción / CNC) ──────────────────────
function _segOpenBloq(id){
  const t=(DB.seguimiento||[]).find(x=>x.id===id);if(!t)return;
  _segBloqId=id;
  const dl=document.getElementById('segRespList');
  if(dl)dl.innerHTML=DB.personal.map(p=>`<option>${p.ape}, ${p.nom}</option>`).join('');
  document.getElementById('segBloqInfo').innerHTML=`<b>${t.titulo}</b>`;
  const c=document.getElementById('segBloqCausa');
  c.innerHTML='<option value=""></option>'+SEG_RESTRICCIONES.map(x=>`<option ${x===t.restriccion?'selected':''}>${x}</option>`).join('');
  document.getElementById('segBloqDet').value=t.restriccionDet||'';
  document.getElementById('segBloqResp').value=t.restriccionResp||'';
  openM('mSegBloq');
}
function _segSaveBloq(){
  const t=(DB.seguimiento||[]).find(x=>x.id===_segBloqId);if(!t)return;
  const causa=document.getElementById('segBloqCausa').value;
  if(!causa){toast('Indique la causa del bloqueo (CNC)',true);return;}
  if(t.est!=='Bloqueado')t.fechaBloq=today();
  t.est='Bloqueado';
  t.restriccion=causa;
  t.restriccionDet=document.getElementById('segBloqDet').value.trim();
  t.restriccionResp=document.getElementById('segBloqResp').value.trim();
  if(t.fechaComp){t.fechaComp='';t.causaDesfase='';t.causaDetalle='';}
  syncSheet('saveSegTarea',t);
  closeM('mSegBloq');_segRender();
  toast('⛔ Tarea bloqueada — CNC registrada');
}
function _segDesbloq(id){
  const t=(DB.seguimiento||[]).find(x=>x.id===id);if(!t)return;
  t.est='En Proceso';
  t.fechaBloq='';
  syncSheet('saveSegTarea',t);
  _segRender();
  toast('🔓 Restricción levantada → En Proceso');
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
  const hoy=today();

  // Restricciones activas (tareas bloqueadas) — el registro de CNC vigente
  const bloq=(_segTareas()).filter(t=>t.est==='Bloqueado').sort((a,b)=>(a.fechaBloq||'9999')<(b.fechaBloq||'9999')?-1:1);
  const restrPanel=`<div class="card" style="margin-bottom:.9rem;padding:0">
    <div class="card-head"><span class="card-title">⛔ Restricciones activas (CNC) · ${bloq.length}</span></div>
    ${bloq.length?`<div class="tbl-wrap"><table style="font-size:.72rem">
      <thead><tr><th>Tarea</th><th>Área</th><th>CNC</th><th>Detalle / depende de</th><th>Levanta</th><th>Días bloq.</th></tr></thead>
      <tbody>${bloq.map(t=>{
        const dias=t.fechaBloq?_segDias(t.fechaBloq,hoy):null;
        return `<tr style="cursor:pointer" onclick="_segEdit(${t.id})">
          <td style="font-weight:600">${t.titulo}</td>
          <td style="font-size:.65rem;color:var(--muted2)">${t.area||'—'}</td>
          <td><span class="badge b-red">${t.restriccion||'—'}</span></td>
          <td style="font-size:.66rem;color:var(--muted2)">${t.restriccionDet||'—'}</td>
          <td style="font-size:.66rem">${t.restriccionResp||'<span style="color:#ef4444">sin asignar</span>'}</td>
          <td style="text-align:center;font-weight:700;color:${dias>=5?'#ef4444':dias>=2?'#f59e0b':'var(--muted2)'}">${dias!=null?dias+' d':'—'}</td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>`:'<div style="padding:1.2rem;text-align:center;color:var(--muted2);font-size:.75rem">Sin restricciones activas 🎉</div>'}
  </div>`;

  body.innerHTML=_segFiltroBar()+`
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:.6rem;margin-bottom:.9rem">
    ${_segKpi('Completadas',comp.length,'#10b981')}
    ${_segKpi('A Tiempo',aTiempo.length+(conDesf.length?' ('+Math.round(aTiempo.length/conDesf.length*100)+'%)':''),'#06b6d4')}
    ${_segKpi('Con Retraso',tarde.length,tarde.length?'#ef4444':'#10b981')}
    ${_segKpi('Desfase Promedio',tarde.length?'+'+prom+' días':'—','#f59e0b')}
  </div>
  ${restrPanel}

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
        <thead><tr><th>Tarea</th><th>Responsable</th><th>Prometida</th><th>Completada</th><th>Desfase</th><th>Reprog.</th><th>Causa</th></tr></thead>
        <tbody>
        ${comp.length?comp.sort((a,b)=>(b.fechaComp||'')<(a.fechaComp||'')?-1:1).map(t=>{
          const d=_segDesfase(t);
          const nr=(t.reprogHist&&t.reprogHist.length)||0;
          return `<tr style="cursor:pointer" onclick="_segEdit(${t.id})">
            <td style="font-weight:600">${t.titulo}</td>
            <td>${t.responsable||'—'}</td>
            <td>${fmtF(t.fechaProm)}</td>
            <td>${fmtF(t.fechaComp)}</td>
            <td>${_segBadgeDesfase(d)||'—'}</td>
            <td style="text-align:center">${nr?'<span class="badge b-orange">↻ '+nr+'</span>':'—'}</td>
            <td style="font-size:.65rem;color:var(--muted2)">${d>0?(t.causaDesfase||'—')+(t.causaDetalle?' · '+t.causaDetalle:''):'—'}</td>
          </tr>`;
        }).join(''):'<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--muted2)">Aún no hay tareas completadas</td></tr>'}
        </tbody>
      </table></div>
    </div>
  </div>`;
}

// ── TAB 3: CARGA POR PERSONA ────────────────────────────────────────────────
function _segRenderCarga(body){
  const hoy=today();
  let list=DB.seguimiento||[];
  if(_segQ){
    const q=_segQ.toLowerCase();
    list=list.filter(t=>Object.values(t).join(' ').toLowerCase().includes(q));
  }
  const byResp={};
  list.forEach(t=>{
    const r=t.responsable||'(Sin responsable)';
    if(!byResp[r])byResp[r]={total:0,abiertas:0,bloqueadas:0,vencidas:0,completadas:0,aTiempo:0,conDesf:0};
    const g=byResp[r];
    g.total++;
    if(t.est==='Completado'){
      g.completadas++;
      const d=_segDesfase(t);
      if(d!==null){g.conDesf++;if(d<=0)g.aTiempo++;}
    }else{
      g.abiertas++;
      if(t.est==='Bloqueado')g.bloqueadas++;
      if(t.fechaProm&&t.fechaProm<hoy)g.vencidas++;
    }
  });
  const rows=Object.entries(byResp).sort((a,b)=>b[1].vencidas-a[1].vencidas||b[1].abiertas-a[1].abiertas);
  const maxAbiertas=Math.max(...rows.map(r=>r[1].abiertas),1);
  const totAbiertas=rows.reduce((s,r)=>s+r[1].abiertas,0);
  const totVenc=rows.reduce((s,r)=>s+r[1].vencidas,0);
  const totBloq=rows.reduce((s,r)=>s+r[1].bloqueadas,0);

  const kpis=`<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:.6rem;margin-bottom:.9rem">
    ${_segKpi('Personas con tareas',rows.length,'#8b5cf6')}
    ${_segKpi('Tareas Abiertas (total)',totAbiertas,'#3b82f6')}
    ${_segKpi('Vencidas (total)',totVenc,totVenc?'#ef4444':'#10b981')}
    ${_segKpi('Bloqueadas (total)',totBloq,totBloq?'#ef4444':'#10b981')}
  </div>`;

  const stat=(lbl,v,col)=>`<div><div style="font-size:.56rem;color:var(--muted2);text-transform:uppercase;letter-spacing:.06em">${lbl}</div><div style="font-size:1.15rem;font-weight:800;color:${col};line-height:1.3">${v}</div></div>`;

  const cards=rows.length?rows.map(([resp,g])=>{
    const pctVenc=g.abiertas?Math.round(g.vencidas/g.abiertas*100):0;
    const pctATiempo=g.conDesf?Math.round(g.aTiempo/g.conDesf*100):null;
    const sobrecarga=g.vencidas>=3||pctVenc>=50;
    return`<div class="card" style="padding:.7rem .9rem;${sobrecarga?'border-color:#ef444470':''}">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:.5rem;margin-bottom:.6rem">
        <span style="font-weight:700;font-size:.82rem">${resp}</span>
        ${sobrecarga?'<span class="badge b-red">⚠ Sobrecargado</span>':''}
      </div>
      <div style="display:flex;gap:1.2rem;flex-wrap:wrap;margin-bottom:.6rem">
        ${stat('Abiertas',g.abiertas,'#3b82f6')}
        ${stat('Bloqueadas',g.bloqueadas,g.bloqueadas?'#ef4444':'var(--muted2)')}
        ${stat('Vencidas',g.vencidas,g.vencidas?'#ef4444':'var(--muted2)')}
        ${stat('Completadas',g.completadas,'#10b981')}
        ${stat('% A tiempo',pctATiempo!==null?pctATiempo+'%':'—','#8b5cf6')}
      </div>
      <div style="background:var(--border);border-radius:4px;height:7px;overflow:hidden">
        <div style="height:100%;width:${Math.round(g.abiertas/maxAbiertas*100)}%;background:${sobrecarga?'#ef4444':'#3b82f6'};border-radius:4px"></div>
      </div>
    </div>`;
  }).join(''):'<div style="padding:1.2rem;text-align:center;color:var(--muted2);font-size:.75rem;grid-column:1/-1">Sin tareas registradas</div>';

  body.innerHTML=`<div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;margin-bottom:.8rem;padding:.4rem .7rem;background:var(--panel2);border:1px solid var(--border);border-radius:8px">
    <div class="search-wrap" style="flex:0 0 220px"><span>🔍</span><input class="search-input" placeholder="Buscar tarea..." value="${_segQ}" oninput="_segQ=this.value;_segRender()"></div>
    <button class="btn btn-a" style="--ba:var(--ctl);margin-left:auto" onclick="_segNueva()">＋ Nueva Tarea</button>
  </div>
  ${kpis}
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:.7rem">${cards}</div>`;
}

function _segKpi(label,val,color){
  return `<div style="background:var(--panel);border:2px solid ${color}55;border-left:4px solid ${color};border-radius:8px;padding:.6rem .8rem">
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
      <div class="fg"><label>Estado</label><select id="segEst"><option>Pendiente</option><option>Bloqueado</option><option>En Proceso</option><option>Completado</option></select></div>
    </div>
  </div>
  <div class="mf"><button class="btn btn-out" onclick="closeM('mSegTarea')">Cancelar</button><button class="btn btn-a" style="--ba:#10b981" onclick="_segSave()">💾 Guardar</button></div>
</div></div>

<div class="mo" id="mSegBloq"><div class="modal" style="max-width:460px">
  <div class="mh"><span class="mttl">⛔ Bloquear Tarea — Restricción (CNC)</span><button class="mx" onclick="closeM('mSegBloq')">✕</button></div>
  <div class="mb">
    <div id="segBloqInfo" style="font-size:.82rem;margin-bottom:.7rem"></div>
    <div class="fg" style="margin-bottom:.6rem"><label>Causa de No Cumplimiento (CNC) *</label><select id="segBloqCausa"></select></div>
    <div class="fg" style="margin-bottom:.6rem"><label>Detalle / ¿de qué depende?</label><textarea id="segBloqDet" rows="2" placeholder="Ej: pendiente aprobación de inducción del cliente..."></textarea></div>
    <div class="fg"><label>Responsable de levantar la restricción</label><input id="segBloqResp" list="segRespList" placeholder="¿Quién la destraba?"></div>
  </div>
  <div class="mf"><button class="btn btn-out" onclick="closeM('mSegBloq')">Cancelar</button><button class="btn btn-a" style="--ba:#ef4444" onclick="_segSaveBloq()">⛔ Bloquear</button></div>
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
