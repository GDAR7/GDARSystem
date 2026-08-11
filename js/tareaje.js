// ══ TAREAJE ══
const _TARE_T={
  TD:{l:'Trabajo Día',     bg:'#10b981',tx:'#fff'},
  TN:{l:'Trabajo Noche',   bg:'#1e3a8a',tx:'#fff'},
  DL:{l:'Día Libre',       bg:'#6b7280',tx:'#fff'},
  P: {l:'Permiso',         bg:'#f59e0b',tx:'#000'},
  F: {l:'Falta',           bg:'#ef4444',tx:'#fff'},
  DM:{l:'Descanso Médico', bg:'#8b5cf6',tx:'#fff'},
  LP:{l:'Lic. Paternidad', bg:'#3b82f6',tx:'#fff'},
  LM:{l:'Lic. Maternidad', bg:'#ec4899',tx:'#fff'},
  LF:{l:'Lic. Fallecim.',  bg:'#374151',tx:'#fff'},
  V: {l:'Vacaciones',      bg:'#0ea5e9',tx:'#fff'},
  DLT:{l:'DL Trabajado',   bg:'#84cc16',tx:'#000'},
  A5:{l:'Anexo 5',         bg:'#f97316',tx:'#fff'},
  R: {l:'Retirado',        bg:'#7f1d1d',tx:'#fff'}
};
let _tarResCache=null;
let _tarPgColVis=null;
let _tarPgColsAvail=[];
let _tarPickerCb=null;
let _tarShowCargo=localStorage.getItem('_tarShowCargo')!=='0';
let _tarShowProc=localStorage.getItem('_tarShowProc')!=='0';
let _tarShowDni=localStorage.getItem('_tarShowDni')==='1';
let _tarShowGrd=localStorage.getItem('_tarShowGrd')==='1';
let _tarShowCat=localStorage.getItem('_tarShowCat')==='1';
let _tarShowTipo=localStorage.getItem('_tarShowTipo')==='1';
let _tarShowIng=localStorage.getItem('_tarShowIng')==='1';
let _tarShowAsig=localStorage.getItem('_tarShowAsig')==='1';

function _tarToggleCol(col){
  if(col==='cargo'){_tarShowCargo=!_tarShowCargo;localStorage.setItem('_tarShowCargo',_tarShowCargo?'1':'0');}
  else if(col==='dni'){_tarShowDni=!_tarShowDni;localStorage.setItem('_tarShowDni',_tarShowDni?'1':'0');}
  else if(col==='grd'){_tarShowGrd=!_tarShowGrd;localStorage.setItem('_tarShowGrd',_tarShowGrd?'1':'0');}
  else if(col==='cat'){_tarShowCat=!_tarShowCat;localStorage.setItem('_tarShowCat',_tarShowCat?'1':'0');}
  else if(col==='tipo'){_tarShowTipo=!_tarShowTipo;localStorage.setItem('_tarShowTipo',_tarShowTipo?'1':'0');}
  else if(col==='ing'){_tarShowIng=!_tarShowIng;localStorage.setItem('_tarShowIng',_tarShowIng?'1':'0');}
  else if(col==='asig'){_tarShowAsig=!_tarShowAsig;localStorage.setItem('_tarShowAsig',_tarShowAsig?'1':'0');}
  else{_tarShowProc=!_tarShowProc;localStorage.setItem('_tarShowProc',_tarShowProc?'1':'0');}
  rTareaje();
}

// Color por guardia: A ámbar · B morado · C verde
const _TAR_GRD_COL={A:'#f59e0b',B:'#a855f7',C:'#10b981'};

// ══ FILTRO POR LEYENDA (chips TD/TN/DL/…) ══
// Un solo tipo a la vez: muestra a quienes tienen al menos un día así en el mes
let _tarLeyFiltro=null;
function _tarLeySet(tipo){
  _tarLeyFiltro=_tarLeyFiltro===tipo?null:tipo;
  rTareaje();
}
function _tarAplicaLeyFiltro(lista,monthStr){
  if(!_tarLeyFiltro)return lista;
  const proy=document.getElementById('tareProy')?.value||'';
  const ids=new Set(DB.tareaje
    .filter(r=>r.tipo===_tarLeyFiltro&&r.fecha&&r.fecha.startsWith(monthStr)&&(!proy||r.proy===proy||!r.proy))
    .map(r=>r.personalId));
  return lista.filter(p=>ids.has(p.id));
}
// Cuántos trabajadores tienen al menos un día de cada tipo (para el contador del chip)
function _tarLeyConteos(monthStr){
  const proy=document.getElementById('tareProy')?.value||'';
  const m={};
  DB.tareaje.forEach(r=>{
    if(!r.fecha||!r.fecha.startsWith(monthStr))return;
    if(proy&&r.proy&&r.proy!==proy)return;
    (m[r.tipo]=m[r.tipo]||new Set()).add(r.personalId);
  });
  return m;
}

// ══ ENCABEZADO / COLUMNAS FIJAS ══
let _tarFijar=localStorage.getItem('_tarFijar')!=='0';   // activo por defecto
function _tarToggleFijar(){
  _tarFijar=!_tarFijar;
  localStorage.setItem('_tarFijar',_tarFijar?'1':'0');
  _tarAplicarFijado();
}
function _tarAplicarFijado(){
  const tb=document.getElementById('tbTareaje');if(!tb)return;
  const wrap=tb.parentElement;
  const btn=document.getElementById('tarBtnFijar');
  if(btn){
    btn.innerHTML=_tarFijar?'📌 Encabezado fijo':'📌 Fijar encabezado';
    btn.style.color=_tarFijar?'#f59e0b':'';
    btn.style.borderColor=_tarFijar?'#f59e0b':'';
    btn.style.background=_tarFijar?'rgba(245,158,11,.12)':'';
  }
  const limpiar=el=>{el.style.top='';el.style.left='';};
  if(!_tarFijar){
    tb.classList.remove('tar-fixed');
    wrap.style.maxHeight='';wrap.style.overflowY='';
    tb.querySelectorAll('th,td.tar-fx').forEach(limpiar);
    return;
  }
  tb.classList.add('tar-fixed');
  wrap.style.maxHeight='calc(100vh - 250px)';
  wrap.style.overflowY='auto';
  const head=tb.tHead;if(!head||!head.rows.length)return;
  const h0=head.rows[0].offsetHeight;
  Array.from(head.rows[0].cells).forEach(c=>c.style.top='0px');
  if(head.rows[1])Array.from(head.rows[1].cells).forEach(c=>c.style.top=h0+'px');
  const w0=head.rows[0].cells[0].offsetWidth;
  const fijaIzq=cells=>{if(cells[0])cells[0].style.left='0px';if(cells[1])cells[1].style.left=w0+'px';};
  Array.from(head.rows).forEach(r=>fijaIzq(r.cells));
  if(tb.tBodies[0])Array.from(tb.tBodies[0].rows).forEach(r=>fijaIzq(r.cells));
}
// Abre el formulario de Personal para corregir DNI, procedencia, cargo, etc.
function _tarEditPersona(id){
  if(typeof openPersonalEdit!=='function'){toast('Formulario de personal no disponible',true);return;}
  if(isModuleReadOnly('personal')){toast('No tiene permiso para editar personal',true);return;}
  const p=DB.personal.find(x=>x.id===id);
  if(!p){toast('Trabajador no encontrado',true);return;}
  openPersonalEdit(id);
}

// ══ FILTROS POR COLUMNA (en el encabezado de cada columna informativa) ══
const _TAR_CAMPO={dni:'dni',cargo:'cargo',cat:'cat',tipo:'tipo',ing:'ing',asig:'asig',grd:'guardia',proc:'proc'};
let _tarColFilt={};   // {claveColumna: valorSeleccionado}
// Valor mostrado/filtrable de una persona en una columna
function _tarVal(p,k){
  if(k==='asig')return +p.asig?'Sí':'No';
  return String(p[_TAR_CAMPO[k]]||'').trim();
}
function _tarColFiltSet(k,v){
  if(v)_tarColFilt[k]=v;else delete _tarColFilt[k];
  if(_tarColFiltEl){_tarColFiltEl.remove();_tarColFiltEl=null;}
  rTareaje();
}
function _tarAplicaColFilt(lista){
  Object.entries(_tarColFilt).forEach(([k,v])=>{if(v)lista=lista.filter(p=>_tarVal(p,k)===v);});
  return lista;
}
// <th> con su botón de filtro
function _tarTh(k,label,color,minw,center){
  const act=_tarColFilt[k];
  const c=color||'#22d3ee';
  return`<th style="padding:5px 6px;font-size:.68rem;white-space:nowrap;min-width:${minw}px;${center?'text-align:center;':''}${color?`color:${color};`:''}">
    <span style="display:inline-flex;align-items:center;gap:.25rem">${label}
      <button onclick="event.stopPropagation();_tarColFiltPanel(event,'${k}')" title="${act?'Filtrado: '+act:'Filtrar esta columna'}"
        style="background:${act?c+'33':'transparent'};border:1px solid ${act?c:'transparent'};border-radius:4px;color:${act?c:'var(--muted2)'};cursor:pointer;font-size:.6rem;padding:0 3px;line-height:1.5">▾</button>
      ${act?`<span onclick="event.stopPropagation();_tarColFiltSet('${k}','')" title="Quitar filtro" style="cursor:pointer;color:#ef4444;font-size:.62rem;font-weight:700">✕</span>`:''}
    </span>
  </th>`;
}
let _tarColFiltEl=null;
function _tarColFiltPanel(ev,k){
  if(_tarColFiltEl){_tarColFiltEl.remove();_tarColFiltEl=null;}
  const col=_TAR_COLS.find(c=>c.k===k)||{l:k,c:'#22d3ee'};
  // Valores disponibles según los demás filtros activos (no el de esta misma columna)
  const otros=Object.entries(_tarColFilt).filter(([kk])=>kk!==k);
  const base=(DB.personal||[]).filter(p=>otros.every(([kk,vv])=>_tarVal(p,kk)===vv));
  const cnt={};
  base.forEach(p=>{const v=_tarVal(p,k)||'(sin dato)';cnt[v]=(cnt[v]||0)+1;});
  const vals=Object.keys(cnt).sort((a,b)=>a.localeCompare(b,'es'));
  const div=document.createElement('div');
  div.style.cssText='position:fixed;z-index:99990;background:var(--panel);border:1px solid var(--border);border-radius:10px;padding:.45rem .4rem;box-shadow:0 8px 32px rgba(0,0,0,.55);width:235px;max-height:330px;overflow-y:auto;font-family:inherit';
  const tit=document.createElement('div');
  tit.textContent='Filtrar por '+col.l;
  tit.style.cssText=`font-size:.62rem;text-transform:uppercase;letter-spacing:.08em;color:${col.c};font-weight:700;padding:.1rem .35rem .35rem;border-bottom:1px solid var(--border);margin-bottom:.25rem`;
  div.appendChild(tit);
  const mkRow=(label,valor,n,sel)=>{
    const row=document.createElement('div');
    row.style.cssText='display:flex;align-items:center;padding:.3rem .45rem;border-radius:6px;cursor:pointer;font-size:.73rem';
    if(sel)row.style.background=col.c+'1f';
    const lbl=document.createElement('span');
    lbl.textContent=label;
    lbl.style.cssText=`flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:${sel?'700':'500'};color:${sel?col.c:'var(--text)'}`;
    row.appendChild(lbl);
    if(n!==null){
      const b=document.createElement('span');
      b.textContent=n;
      b.style.cssText='margin-left:6px;font-size:.6rem;color:var(--muted2);background:rgba(255,255,255,.08);border-radius:9px;padding:1px 7px;min-width:22px;text-align:center';
      row.appendChild(b);
    }
    row.onmouseenter=()=>{if(!sel)row.style.background='rgba(255,255,255,.05)';};
    row.onmouseleave=()=>{if(!sel)row.style.background='';};
    row.onclick=()=>_tarColFiltSet(k,valor);
    return row;
  };
  div.appendChild(mkRow('— Todos —','',base.length,!_tarColFilt[k]));
  vals.forEach(v=>div.appendChild(mkRow(v,v==='(sin dato)'?'':v,cnt[v],_tarColFilt[k]===v)));
  document.body.appendChild(div);
  _tarColFiltEl=div;
  const r=ev.currentTarget.getBoundingClientRect();
  let top=r.bottom+4,left=r.left-60;
  if(left+240>window.innerWidth)left=Math.max(8,window.innerWidth-245);
  if(left<8)left=8;
  if(top+340>window.innerHeight)top=Math.max(8,r.top-345);
  div.style.top=top+'px';div.style.left=left+'px';
  setTimeout(()=>document.addEventListener('click',function h(e){
    if(_tarColFiltEl&&!_tarColFiltEl.contains(e.target)){_tarColFiltEl.remove();_tarColFiltEl=null;document.removeEventListener('click',h);}
  }),10);
}

// ── Selector de columnas visibles (multi-check en un solo botón) ──
// Procedencia va siempre al final de la lista de columnas informativas
const _TAR_COLS=[
  {k:'dni',  l:'DNI',            c:'#22d3ee', get:()=>_tarShowDni},
  {k:'cargo',l:'Cargo',          c:'#94a3b8', get:()=>_tarShowCargo},
  {k:'cat',  l:'Categoría',      c:'#38bdf8', get:()=>_tarShowCat},
  {k:'tipo', l:'Tipo',           c:'#f472b6', get:()=>_tarShowTipo},
  {k:'ing',  l:'F. Ingreso',     c:'#34d399', get:()=>_tarShowIng},
  {k:'asig', l:'Asig. Familiar', c:'#fbbf24', get:()=>_tarShowAsig},
  {k:'grd',  l:'Guardia',        c:'#f59e0b', get:()=>_tarShowGrd},
  {k:'proc', l:'Procedencia',    c:'#a78bfa', get:()=>_tarShowProc},
];
let _tarColsDropEl=null;
function _tarColsPanel(ev){
  if(_tarColsDropEl){_tarColsDropEl.remove();_tarColsDropEl=null;return;}
  const div=document.createElement('div');
  div.style.cssText='position:fixed;z-index:99990;background:var(--panel);border:1px solid var(--border);border-radius:10px;padding:.45rem .4rem;box-shadow:0 8px 32px rgba(0,0,0,.55);width:200px;font-family:inherit';
  const tit=document.createElement('div');
  tit.textContent='Columnas visibles';
  tit.style.cssText='font-size:.62rem;text-transform:uppercase;letter-spacing:.08em;color:var(--muted2);font-weight:700;padding:.1rem .35rem .35rem;border-bottom:1px solid var(--border);margin-bottom:.25rem';
  div.appendChild(tit);
  _TAR_COLS.forEach(c=>{
    const row=document.createElement('div');
    row.style.cssText='display:flex;align-items:center;padding:.32rem .45rem;border-radius:6px;cursor:pointer';
    const cb=document.createElement('input');
    cb.type='checkbox';
    cb.style.cssText='flex:0 0 15px;width:15px;height:15px;margin:0;cursor:pointer;accent-color:'+c.c;
    const lbl=document.createElement('span');
    lbl.textContent=c.l;
    lbl.style.marginLeft='9px';lbl.style.flex='1';lbl.style.fontSize='.75rem';
    // Refresca el aspecto de la fila según el estado actual (el panel NO se cierra al marcar)
    const pinta=()=>{
      const on=c.get();
      cb.checked=on;
      row.style.background=on?c.c+'1f':'';
      lbl.style.fontWeight=on?'700':'500';
      lbl.style.color=on?c.c:'var(--text)';
    };
    pinta();
    row.appendChild(cb);row.appendChild(lbl);
    cb.onchange=()=>{_tarToggleCol(c.k);pinta();};
    row.onclick=e=>{if(e.target!==cb)cb.click();};
    div.appendChild(row);
  });
  document.body.appendChild(div);
  _tarColsDropEl=div;
  const r=ev.currentTarget.getBoundingClientRect();
  let top=r.bottom+4,left=r.left;
  if(left+205>window.innerWidth)left=Math.max(8,window.innerWidth-210);
  if(top+200>window.innerHeight)top=Math.max(8,r.top-205);
  div.style.top=top+'px';div.style.left=left+'px';
  setTimeout(()=>document.addEventListener('click',function h(e){
    if(_tarColsDropEl&&!_tarColsDropEl.contains(e.target)){_tarColsDropEl.remove();_tarColsDropEl=null;document.removeEventListener('click',h);}
  }),10);
}
let _tarMultiMode=false;
let _tarHoverMode=false;
const _tarSel=new Set();

function toggleTareMult(){
  _tarHoverMode=false;
  const hBtn=document.getElementById('tarHoverBtn');
  if(hBtn){hBtn.style.background='';hBtn.style.color='';}
  _tarMultiMode=!_tarMultiMode;
  _tarSel.clear();
  const btn=document.getElementById('tarMultBtn');
  if(btn){btn.style.background=_tarMultiMode?'var(--mec)':'';btn.style.color=_tarMultiMode?'#fff':'';}
  _updateTarMultBar();
  if(!_tarMultiMode)rTareaje();
}
function toggleTareHover(){
  _tarMultiMode=false;
  const mBtn=document.getElementById('tarMultBtn');
  if(mBtn){mBtn.style.background='';mBtn.style.color='';}
  _tarHoverMode=!_tarHoverMode;
  _tarSel.clear();
  const btn=document.getElementById('tarHoverBtn');
  if(btn){btn.style.background=_tarHoverMode?'#f59e0b':'';btn.style.color=_tarHoverMode?'#000':'';}
  if(_tarHoverMode)_tarMultiMode=true;
  _updateTarMultBar();
  if(!_tarHoverMode)rTareaje();
}
function _tarHoverOver(personalId,fecha,cellEl){
  if(!_tarHoverMode)return;
  const key=`${personalId}|${fecha}`;
  if(_tarSel.has(key))return;
  _tarSel.add(key);
  cellEl.style.outline='2px solid #f59e0b';
  cellEl.style.outlineOffset='-2px';
  const td=document.getElementById('tarMultTypes');if(td)td.innerHTML='';
  _updateTarMultBar();
}
function _updateTarMultBar(){
  const bar=document.getElementById('tarMultBar');if(!bar)return;
  if(_tarMultiMode&&_tarSel.size>0){
    bar.style.display='flex';
    const cnt=document.getElementById('tarMultCnt');
    if(cnt)cnt.textContent=_tarSel.size+' celda(s) seleccionada(s)';
    const td=document.getElementById('tarMultTypes');
    if(td&&!td.children.length){
      td.innerHTML=Object.entries(_TARE_T).map(([k,v])=>
        `<button onclick="applyTareMult('${k}')" style="background:${v.bg};color:${v.tx};border:none;border-radius:5px;padding:3px 7px;font-size:.65rem;font-weight:700;cursor:pointer" title="${v.l}">${k}</button>`
      ).join('')+`<button onclick="applyTareMult('')" style="background:#374151;color:#9ca3af;border:1px solid #6b7280;border-radius:5px;padding:3px 7px;font-size:.65rem;font-weight:700;cursor:pointer">✕ Borrar</button>`;
    }
  }else{bar.style.display='none';}
}
function clearTareSel(){
  _tarSel.forEach(key=>{
    const [pId,fecha]=key.split('|');
    const cell=document.getElementById(`tar-${pId}-${fecha}`);
    if(cell)cell.style.outline='';
  });
  _tarSel.clear();
  _tarMultiMode=false;
  _tarHoverMode=false;
  const btn=document.getElementById('tarMultBtn');
  if(btn){btn.style.background='';btn.style.color='';}
  const hBtn=document.getElementById('tarHoverBtn');
  if(hBtn){hBtn.style.background='';hBtn.style.color='';}
  _updateTarMultBar();
}
function _tarCellClick(personalId,fecha,cellEl){
  if(!_tarMultiMode){openTarePicker(personalId,fecha,cellEl);return;}
  const key=`${personalId}|${fecha}`;
  if(_tarSel.has(key)){_tarSel.delete(key);cellEl.style.outline='';}
  else{_tarSel.add(key);cellEl.style.outline='2px solid #fff';cellEl.style.outlineOffset='-2px';}
  const td=document.getElementById('tarMultTypes');if(td)td.innerHTML='';
  _updateTarMultBar();
}
function _tarColClick(fecha){
  if(!_tarMultiMode)return;
  // Seleccionar/deseleccionar toda la columna
  const cells=document.querySelectorAll(`[id^="tar-"][id$="-${fecha}"]`);
  const allSel=[...cells].every(c=>{const k=c.id.replace('tar-','').replace('-'+fecha,'')+'|'+fecha;return _tarSel.has(k);});
  cells.forEach(c=>{
    const pId=c.id.split('-')[1];const key=`${pId}|${fecha}`;
    if(allSel){_tarSel.delete(key);c.style.outline='';}
    else{_tarSel.add(key);c.style.outline='2px solid #fff';c.style.outlineOffset='-2px';}
  });
  const td=document.getElementById('tarMultTypes');if(td)td.innerHTML='';
  _updateTarMultBar();
}
function applyTareMult(tipo){
  const count=_tarSel.size;if(!count)return;
  _tarSel.forEach(key=>{
    const [pId,fecha]=key.split('|');
    const personalId=+pId;
    const existing=DB.tareaje.find(r=>r.personalId===personalId&&r.fecha===fecha);
    if(existing){
      if(!tipo){DB.tareaje=DB.tareaje.filter(r=>r.id!==existing.id);supaDelete('tareaje',existing.id);}
      else{existing.tipo=tipo;syncSheet('saveTareaje',existing);}
    }else{
      if(!tipo)return;
      const _pf2=document.getElementById('tareProy')?.value||'';
      const _pp2=DB.personal.find(p=>p.id===personalId);
      const proy=_pf2||(_pp2?_pp2.proy:'');
      const rec={id:nid('tar'),personalId,fecha,tipo,proy};
      DB.tareaje.push(rec);syncSheet('saveTareaje',rec);
    }
    const cell=document.getElementById(`tar-${personalId}-${fecha}`);
    if(cell){
      const t=tipo?_TARE_T[tipo]:null;
      const dow=new Date(fecha+'T12:00:00').getDay(),isSun=dow===0;
      cell.textContent=tipo;cell.style.background=t?t.bg:(isSun?'rgba(245,158,11,.06)':'');
      cell.style.color=t?t.tx:'';cell.title=t?t.l:fecha;cell.style.outline='';
    }
  });
  _tarSel.clear();
  clearTareSel();
  rTareaje();
  toast(`✓ ${count} celda(s) actualizadas`);
}
function rTareaje(){
  const pad=n=>String(n).padStart(2,'0');
  const mv=document.getElementById('tareMes')?.value||new Date().toISOString().slice(0,7);
  const [y,m]=mv.split('-').map(Number);
  const days=new Date(y,m,0).getDate();
  const monthStr=`${y}-${pad(m)}`;
  const DN=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  const proyEl=document.getElementById('tareProy');
  if(proyEl){const cur=proyEl.value;proyEl.innerHTML='<option value="">— Todos los proyectos —</option>'+(DB.proyectos||[]).map(p=>`<option value="${p.codigo}">[${p.codigo}] ${p.nombre}</option>`).join('');if(cur)proyEl.value=cur;}
  const proyFiltro=proyEl?proyEl.value:'';
  let persF;
  if(proyFiltro){
    const workerIdsConRec=new Set(DB.tareaje.filter(r=>r.fecha&&r.fecha.startsWith(monthStr)&&r.proy===proyFiltro).map(r=>r.personalId));
    persF=DB.personal.filter(p=>p.proy===proyFiltro||workerIdsConRec.has(p.id));
  }else{persF=DB.personal;}
  persF=_tarAplicaColFilt(persF); // filtros elegidos en los encabezados de columna
  persF=_tarAplicaLeyFiltro(persF,monthStr); // chip de la leyenda (TD, TN, F, …)
  const persFIds=new Set(persF.map(p=>p.id));
  const monthRecs=DB.tareaje.filter(r=>r.fecha&&r.fecha.startsWith(monthStr)&&persFIds.has(r.personalId));
  document.getElementById('tareKpis').innerHTML=[
    {l:'Trabajadores',v:persF.length,c:'var(--mec)',ic:'👷',sub:'en grilla'},
    {l:'Trabajo Día',v:monthRecs.filter(r=>r.tipo==='TD').length,c:'#10b981',ic:'☀️',sub:'jornadas TD'},
    {l:'Trabajo Noche',v:monthRecs.filter(r=>r.tipo==='TN').length,c:'#3b82f6',ic:'🌙',sub:'jornadas TN'},
    {l:'Faltas',v:monthRecs.filter(r=>r.tipo==='F').length,c:'#ef4444',ic:'❌',sub:'del mes'},
    {l:'Horas Hombre',v:monthRecs.filter(r=>['TD','TN','DLT','A5'].includes(r.tipo)&&(!proyFiltro||r.proy===proyFiltro||!r.proy)).length*10,c:'#f59e0b',ic:'⏱️',sub:'HH · TD+TN+DLT+A5 × 10 h/día'}
  ].map(k=>`<div class="kpi" style="--kc:${k.c};flex:1;min-width:150px"><div style="display:flex;justify-content:space-between;align-items:flex-start"><span class="kpi-lbl">${k.l}</span><span style="font-size:1.3rem;line-height:1;opacity:.75">${k.ic}</span></div><div class="kpi-val" style="font-size:2.2rem">${k.v}</div><div class="kpi-sub">${k.sub}</div></div>`).join('');
  // Leyenda clicable: filtra a quienes tengan al menos un día de ese tipo en el mes
  const _leyN=_tarLeyConteos(monthStr);
  document.getElementById('tareLeyenda').innerHTML=Object.entries(_TARE_T).map(([k,v])=>{
    const n=_leyN[k]?_leyN[k].size:0;
    const act=_tarLeyFiltro===k;
    return`<span onclick="_tarLeySet('${k}')" title="${n} trabajador${n===1?'':'es'} con al menos un día ${k} en el mes${act?' · clic para quitar el filtro':''}"
      style="background:${v.bg};color:${v.tx};font-size:.6rem;font-weight:700;padding:2px 7px;border-radius:4px;white-space:nowrap;cursor:pointer;user-select:none;
      ${act?'outline:2px solid #fff;outline-offset:1px;box-shadow:0 0 0 3px rgba(255,255,255,.15);':n?'':'opacity:.35;'}">${k} – ${v.l}${n?` <span style="opacity:.75">${n}</span>`:''}${act?' ✕':''}</span>`;
  }).join('')+(_tarLeyFiltro?`<span onclick="_tarLeySet(null)" style="font-size:.6rem;font-weight:700;padding:2px 8px;border-radius:4px;cursor:pointer;background:transparent;border:1px solid var(--border);color:#ef4444;white-space:nowrap">✕ Quitar filtro</span>`:'');
  const _tarRO=isModuleReadOnly('tareaje');
  const mesNombre=new Date(y,m-1,1).toLocaleString('es-PE',{month:'long'}).toUpperCase();
  const dayHdrs=Array.from({length:days},(_,i)=>{
    const d=i+1,fecha=`${y}-${pad(m)}-${pad(d)}`;
    const dow=new Date(fecha+'T12:00:00').getDay(),isSun=dow===0;
    return`<th ${_tarRO?'':` onclick="_tarColClick('${fecha}')"`} style="text-align:center;min-width:30px;width:30px;padding:2px 1px;font-size:.6rem;${_tarRO?'':'cursor:pointer;'}${isSun?'color:#f59e0b;background-image:linear-gradient(rgba(245,158,11,.12),rgba(245,158,11,.12))':''}">${d}<div style="font-size:.5rem;opacity:.7">${DN[dow]}</div></th>`;
  }).join('');
  const rows=persF.map((p,idx)=>{
    const _matchProy=r=>!proyFiltro||r.proy===proyFiltro||(!r.proy&&p.proy===proyFiltro);
    const cells=Array.from({length:days},(_,i)=>{
      const d=i+1,fecha=`${y}-${pad(m)}-${pad(d)}`;
      const rec=DB.tareaje.find(r=>r.personalId===p.id&&r.fecha===fecha&&_matchProy(r));
      const tipo=rec?rec.tipo:'';
      const t=tipo?_TARE_T[tipo]:null;
      const dow=new Date(fecha+'T12:00:00').getDay(),isSun=dow===0;
      return`<td id="tar-${p.id}-${fecha}" ${_tarRO?'':` onclick="_tarCellClick(${p.id},'${fecha}',this)" onmouseover="_tarHoverOver(${p.id},'${fecha}',this)"`} style="text-align:center;${_tarRO?'':'cursor:pointer;'}height:26px;padding:0;border:1px solid var(--border);${t?`background:${t.bg};color:${t.tx};`:''}${isSun&&!tipo?'background:rgba(245,158,11,.06);':''}font-size:.6rem;font-weight:700" title="${t?t.l:fecha}">${tipo}</td>`;
    }).join('');
    const totD=new Set(DB.tareaje.filter(r=>r.personalId===p.id&&r.fecha.startsWith(monthStr)&&(r.tipo==='TD'||r.tipo==='A5')&&_matchProy(r)).map(r=>r.fecha)).size;
    const totN=new Set(DB.tareaje.filter(r=>r.personalId===p.id&&r.fecha.startsWith(monthStr)&&r.tipo==='TN'&&_matchProy(r)).map(r=>r.fecha)).size;
    const totDL=new Set(DB.tareaje.filter(r=>r.personalId===p.id&&r.fecha.startsWith(monthStr)&&r.tipo==='DL'&&_matchProy(r)).map(r=>r.fecha)).size;
    const totA5=new Set(DB.tareaje.filter(r=>r.personalId===p.id&&r.fecha.startsWith(monthStr)&&r.tipo==='A5'&&_matchProy(r)).map(r=>r.fecha)).size;
    const totDLT=new Set(DB.tareaje.filter(r=>r.personalId===p.id&&r.fecha.startsWith(monthStr)&&r.tipo==='DLT'&&_matchProy(r)).map(r=>r.fecha)).size;
    const _a5html=totA5>0?('<br><span style="color:#f97316;font-weight:700">'+totA5+'</span><span style="color:var(--muted2);font-size:.6rem">A5</span>'):'';
    const _dlthtml=totDLT>0?(' <span style="color:#84cc16;font-weight:700">'+totDLT+'</span><span style="color:var(--muted2);font-size:.6rem">DLT</span>'):'';
    return`<tr style="border-bottom:1px solid var(--border)" data-search="${((p.ape||'')+' '+(p.nom||'')+' '+(p.cargo||'')+' '+(p.proc||'')+' '+(p.dni||'')).toLowerCase()}">
      <td class="tar-fx" style="text-align:center;font-size:.7rem;color:var(--muted2);padding:3px 4px;white-space:nowrap;min-width:52px">${idx+1} <button class="tar-edit-btn" onclick="event.stopPropagation();_tarEditPersona(${p.id})" title="Editar datos del trabajador">✏️</button></td>
      <td class="tar-fx tar-fx-end" ondblclick="_tarEditPersona(${p.id})" title="Doble clic para editar los datos del trabajador" style="padding:3px 8px;white-space:nowrap;font-size:.78rem;min-width:180px;cursor:pointer"><strong>${p.ape}, ${p.nom}</strong></td>
      ${_tarShowDni?`<td style="padding:3px 5px;white-space:nowrap;font-size:.72rem;font-family:monospace;color:#22d3ee;min-width:80px">${p.dni||'—'}</td>`:''}
      ${_tarShowCargo?`<td style="padding:3px 5px;white-space:nowrap;font-size:.7rem;color:var(--muted2);min-width:100px">${p.cargo||'—'}</td>`:''}
      ${_tarShowCat?`<td style="padding:3px 5px;white-space:nowrap;font-size:.7rem;color:#38bdf8;min-width:100px">${p.cat||'—'}</td>`:''}
      ${_tarShowTipo?`<td style="padding:3px 5px;white-space:nowrap;font-size:.7rem;color:#f472b6;min-width:80px">${p.tipo||'—'}</td>`:''}
      ${_tarShowIng?`<td style="padding:3px 5px;text-align:center;white-space:nowrap;font-size:.68rem;font-family:monospace;color:#34d399;min-width:82px">${p.ing||'—'}</td>`:''}
      ${_tarShowAsig?`<td style="padding:3px 5px;text-align:center;white-space:nowrap;font-size:.68rem;min-width:60px;color:${+p.asig?'#fbbf24':'var(--muted)'}">${+p.asig?'Sí':'No'}</td>`:''}
      ${_tarShowGrd?(()=>{
        const gc=_TAR_GRD_COL[p.guardia]||'#94a3b8';
        return`<td style="padding:3px 5px;text-align:center;white-space:nowrap;font-size:.7rem;min-width:56px">${p.guardia?`<span style="background:${gc}26;color:${gc};border:1px solid ${gc}70;border-radius:4px;padding:1px 7px;font-weight:800">${p.guardia}</span>`:'<span style="color:var(--muted)">—</span>'}</td>`;
      })():''}
      ${_tarShowProc?`<td style="padding:3px 5px;white-space:nowrap;font-size:.7rem;color:#a78bfa;min-width:90px">${p.proc||'—'}</td>`:''}
      ${cells}
      <td style="text-align:center;font-size:.68rem;padding:3px 4px;white-space:nowrap;background:rgba(4,78,100,.08);line-height:1.5"><span style="color:#10b981;font-weight:700">${totD}</span><span style="color:var(--muted2);font-size:.6rem">TD</span> <span style="color:#3b82f6;font-weight:700">${totN}</span><span style="color:var(--muted2);font-size:.6rem">TN</span><br><span style="color:#6b7280;font-weight:700">${totDL}</span><span style="color:var(--muted2);font-size:.6rem">DL</span>${_dlthtml}${_a5html}</td>
    </tr>`;
  }).join('');
  // Actualizar apariencia de botones toggle y modo solo lectura
  const _btnCols=document.getElementById('tarBtnCols');
  if(_btnCols){
    const n=_TAR_COLS.filter(c=>c.get()).length;
    _btnCols.innerHTML=`🧩 Columnas${n?` <span style="font-size:.62rem;background:rgba(34,211,238,.2);border-radius:8px;padding:0 5px">${n}</span>`:''} ▾`;
  }
  const _mBtn=document.getElementById('tarMultBtn'),_hBtn=document.getElementById('tarHoverBtn');
  if(_mBtn)_mBtn.style.display=_tarRO?'none':'';
  if(_hBtn)_hBtn.style.display=_tarRO?'none':'';
  const _roBadgeEl=document.getElementById('tarROBadge');
  if(_roBadgeEl)_roBadgeEl.style.display=_tarRO?'inline-flex':'none';
  document.getElementById('tbTareaje').innerHTML=`
    <thead>
      <tr style="background:var(--panel2)">
        <th class="tar-fx" style="padding:5px 6px;font-size:.68rem;white-space:nowrap;min-width:52px">N°</th>
        <th class="tar-fx tar-fx-end" style="padding:5px 8px;font-size:.68rem;white-space:nowrap;min-width:180px">Trabajador</th>
        ${_tarShowDni?_tarTh('dni','DNI','#22d3ee',80):''}
        ${_tarShowCargo?_tarTh('cargo','Cargo','',110):''}
        ${_tarShowCat?_tarTh('cat','Categoría','#38bdf8',110):''}
        ${_tarShowTipo?_tarTh('tipo','Tipo','#f472b6',90):''}
        ${_tarShowIng?_tarTh('ing','F. Ingreso','#34d399',92,1):''}
        ${_tarShowAsig?_tarTh('asig','Asig. Fam.','#fbbf24',72,1):''}
        ${_tarShowGrd?_tarTh('grd','Guardia','#f59e0b',70,1):''}
        ${_tarShowProc?_tarTh('proc','Procedencia','#a78bfa',100):''}
        <th colspan="${days}" style="text-align:center;padding:5px;font-size:.72rem;background-image:linear-gradient(rgba(4,78,100,.2),rgba(4,78,100,.2));color:var(--mec);font-weight:700;letter-spacing:.05em">${mesNombre} ${y}</th>
        <th style="padding:5px 4px;font-size:.62rem;text-align:center;white-space:nowrap;min-width:55px;background-image:linear-gradient(rgba(4,78,100,.12),rgba(4,78,100,.12));line-height:1.4"><span style="color:#10b981">TD</span>/<span style="color:#3b82f6">TN</span><br><span style="color:#6b7280">DL</span></th>
      </tr>
      <tr style="background:var(--panel2)"><th class="tar-fx"></th><th class="tar-fx tar-fx-end"></th>${_tarShowDni?'<th></th>':''}${_tarShowCargo?'<th></th>':''}${_tarShowCat?'<th></th>':''}${_tarShowTipo?'<th></th>':''}${_tarShowIng?'<th></th>':''}${_tarShowAsig?'<th></th>':''}${_tarShowGrd?'<th></th>':''}${_tarShowProc?'<th></th>':''}${dayHdrs}<th></th></tr>
    </thead>
    <tbody>${rows}</tbody>`;
  _tarAplicarFijado();
}
function openTarePicker(personalId,fecha,cellEl){
  if(_tarPickerCb)document.removeEventListener('click',_tarPickerCb);
  const picker=document.getElementById('tarePicker');
  const rect=cellEl.getBoundingClientRect();
  const rec=DB.tareaje.find(r=>r.personalId===personalId&&r.fecha===fecha);
  const curTipo=rec?rec.tipo:'';
  let html=`<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px;min-width:230px">`;
  Object.entries(_TARE_T).forEach(([k,v])=>{
    html+=`<button onclick="setTareaje(${personalId},'${fecha}','${k}')" style="background:${v.bg};color:${v.tx};border:2px solid ${k===curTipo?'#fff':'transparent'};border-radius:5px;padding:4px 2px;font-size:.65rem;font-weight:700;cursor:pointer" title="${v.l}">${k}</button>`;
  });
  html+=`<button onclick="setTareaje(${personalId},'${fecha}','')" style="background:#374151;color:#9ca3af;border:1px solid #6b7280;border-radius:5px;padding:4px 2px;font-size:.65rem;font-weight:700;cursor:pointer">✕ Borrar</button>`;
  html+=`</div><div style="font-size:.6rem;color:var(--muted2);margin-top:4px;text-align:center">${fecha}</div>`;
  const left=Math.min(rect.left,window.innerWidth-250);
  const pickerH=200;
  const topPos=window.innerHeight-rect.bottom-4>=pickerH?rect.bottom+4:rect.top-pickerH-4;
  picker.style.cssText=`display:block;position:fixed;left:${Math.max(4,left)}px;top:${Math.max(4,topPos)}px;z-index:9999;background:var(--panel2);border:1px solid var(--border);border-radius:8px;padding:.5rem;box-shadow:0 8px 24px rgba(0,0,0,.6)`;
  picker.innerHTML=html;
  _tarPickerCb=function(e){if(!picker.contains(e.target))closeTarePicker();};
  setTimeout(()=>document.addEventListener('click',_tarPickerCb),10);
}
function closeTarePicker(){
  if(_tarPickerCb){document.removeEventListener('click',_tarPickerCb);_tarPickerCb=null;}
  const p=document.getElementById('tarePicker');if(p)p.style.display='none';
}
function setTareaje(personalId,fecha,tipo){
  closeTarePicker();
  const existing=DB.tareaje.find(r=>r.personalId===personalId&&r.fecha===fecha);
  if(existing){
    if(!tipo){DB.tareaje=DB.tareaje.filter(r=>r.id!==existing.id);supaDelete('tareaje',existing.id);}
    else{existing.tipo=tipo;syncSheet('saveTareaje',existing);}
  }else{
    if(!tipo)return;
    const _pf=document.getElementById('tareProy')?.value||'';
    const _pp=DB.personal.find(p=>p.id===personalId);
    const proy=_pf||(_pp?_pp.proy:'');
    const rec={id:nid('tar'),personalId,fecha,tipo,proy};
    DB.tareaje.push(rec);syncSheet('saveTareaje',rec);
  }
  const cell=document.getElementById(`tar-${personalId}-${fecha}`);
  if(cell){
    const t=tipo?_TARE_T[tipo]:null;
    const dow=new Date(fecha+'T12:00:00').getDay(),isSun=dow===0;
    cell.textContent=tipo;
    cell.style.background=t?t.bg:(isSun?'rgba(245,158,11,.06)':'');
    cell.style.color=t?t.tx:'';cell.title=t?t.l:fecha;
    const mv=document.getElementById('tareMes')?.value||new Date().toISOString().slice(0,7);
    const ms=mv;
    const totD=new Set(DB.tareaje.filter(r=>r.personalId===personalId&&r.fecha.startsWith(ms)&&(r.tipo==='TD'||r.tipo==='A5')).map(r=>r.fecha)).size;
    const totN=new Set(DB.tareaje.filter(r=>r.personalId===personalId&&r.fecha.startsWith(ms)&&r.tipo==='TN').map(r=>r.fecha)).size;
    const totDL=new Set(DB.tareaje.filter(r=>r.personalId===personalId&&r.fecha.startsWith(ms)&&r.tipo==='DL').map(r=>r.fecha)).size;
    const totA5=new Set(DB.tareaje.filter(r=>r.personalId===personalId&&r.fecha.startsWith(ms)&&r.tipo==='A5').map(r=>r.fecha)).size;
    const totDLT2=new Set(DB.tareaje.filter(r=>r.personalId===personalId&&r.fecha.startsWith(ms)&&r.tipo==='DLT').map(r=>r.fecha)).size;
    const _qa5=totA5>0?('<br><span style="color:#f97316;font-weight:700">'+totA5+'</span><span style="color:var(--muted2);font-size:.6rem">A5</span>'):'';
    const _qdlt=totDLT2>0?(' <span style="color:#84cc16;font-weight:700">'+totDLT2+'</span><span style="color:var(--muted2);font-size:.6rem">DLT</span>'):'';
    const row=cell.closest('tr');
    if(row){const last=row.querySelector('td:last-child');if(last)last.innerHTML='<span style="color:#10b981;font-weight:700">'+totD+'</span><span style="color:var(--muted2);font-size:.6rem">TD</span> <span style="color:#3b82f6;font-weight:700">'+totN+'</span><span style="color:var(--muted2);font-size:.6rem">TN</span><br><span style="color:#6b7280;font-weight:700">'+totDL+'</span><span style="color:var(--muted2);font-size:.6rem">DL</span>'+_qdlt+_qa5;}
  }
}
// Personal filtrado EXACTAMENTE igual que la grilla: proyecto + filtros de columna + buscador
function _tarPersFiltrados(monthStr){
  const proyFiltro=document.getElementById('tareProy')?.value||'';
  const buscar=(document.getElementById('tareBuscar')?.value||'').toLowerCase().trim();
  let persF;
  if(proyFiltro){
    const wids=new Set(DB.tareaje.filter(r=>r.fecha&&r.fecha.startsWith(monthStr)&&r.proy===proyFiltro).map(r=>r.personalId));
    persF=DB.personal.filter(p=>p.proy===proyFiltro||wids.has(p.id));
  }else{persF=[...DB.personal];}
  persF=_tarAplicaColFilt(persF);
  persF=_tarAplicaLeyFiltro(persF,monthStr);
  if(buscar)persF=persF.filter(p=>((p.ape||'')+' '+(p.nom||'')+' '+(p.cargo||'')+' '+(p.proc||'')+' '+(p.dni||'')).toLowerCase().includes(buscar));
  return persF;
}
function _tarFiltroTxt(){
  const b=(document.getElementById('tareBuscar')?.value||'').trim();
  const cols=Object.entries(_tarColFilt).map(([k,v])=>{
    const c=_TAR_COLS.find(x=>x.k===k);
    return ' · '+((c&&c.l)||k)+': '+v;
  }).join('');
  const ley=_tarLeyFiltro?' · Solo con '+_tarLeyFiltro+' ('+(_TARE_T[_tarLeyFiltro]?.l||_tarLeyFiltro)+')':'';
  return cols+ley+(b?' · Filtro: "'+b+'"':'');
}
function printTareaje(){
  const pad=n=>String(n).padStart(2,'0');
  const mv=document.getElementById('tareMes')?.value||new Date().toISOString().slice(0,7);
  const [y,m]=mv.split('-').map(Number);
  const days=new Date(y,m,0).getDate();
  const monthStr=`${y}-${pad(m)}`;
  const DN=['D','L','M','X','J','V','S'];
  const mesNombre=new Date(y,m-1,1).toLocaleString('es-PE',{month:'long'}).toUpperCase();
  const _logoUrl=window.location.href.replace(/[^\/\\]+$/,'')+'09.-ERP/Imagenes/ECOSERMO-LOGO.png';
  const proyEl=document.getElementById('tareProy');
  const proyFiltro=proyEl?proyEl.value:'';
  const proyNombre=(proyFiltro?(DB.proyectos.find(p=>p.codigo===proyFiltro)?.nombre||proyFiltro):'— Todos —')+_tarFiltroTxt();
  const elab='';
  // Solo los que están visibles en la grilla (proyecto + guardia + buscador)
  const persF=_tarPersFiltrados(monthStr);
  const dayHdrs=Array.from({length:days},(_,i)=>{
    const d=i+1,fecha=`${y}-${pad(m)}-${pad(d)}`;
    const dow=new Date(fecha+'T12:00:00').getDay(),isSun=dow===0;
    return`<th style="text-align:center;width:18px;min-width:18px;padding:1px 0;font-size:6.5px;${isSun?'background:#fef3c7;color:#92400e':'background:#1e3a5f;color:#fff'}">${d}<br><span style="font-size:5.5px">${DN[dow]}</span></th>`;
  }).join('');
  const rows=persF.map((p,idx)=>{
    const _mp=r=>!proyFiltro||r.proy===proyFiltro||(!r.proy&&p.proy===proyFiltro);
    const cells=Array.from({length:days},(_,i)=>{
      const d=i+1,fecha=`${y}-${pad(m)}-${pad(d)}`;
      const rec=DB.tareaje.find(r=>r.personalId===p.id&&r.fecha===fecha&&_mp(r));
      const tipo=rec?rec.tipo:'';
      const t=tipo?_TARE_T[tipo]:null;
      const dow=new Date(fecha+'T12:00:00').getDay(),isSun=dow===0;
      return`<td style="text-align:center;padding:0;border:1px solid #e2e8f0;height:18px;${t?`background:${t.bg};color:${t.tx};font-weight:700;font-size:6px`:''}${isSun&&!tipo?'background:#fffbeb;':''}">${tipo}</td>`;
    }).join('');
    const totD=new Set(DB.tareaje.filter(r=>r.personalId===p.id&&r.fecha.startsWith(monthStr)&&(r.tipo==='TD'||r.tipo==='A5')&&_mp(r)).map(r=>r.fecha)).size;
    const totN=new Set(DB.tareaje.filter(r=>r.personalId===p.id&&r.fecha.startsWith(monthStr)&&r.tipo==='TN'&&_mp(r)).map(r=>r.fecha)).size;
    const totDL=new Set(DB.tareaje.filter(r=>r.personalId===p.id&&r.fecha.startsWith(monthStr)&&r.tipo==='DL'&&_mp(r)).map(r=>r.fecha)).size;
    const totA5p=new Set(DB.tareaje.filter(r=>r.personalId===p.id&&r.fecha.startsWith(monthStr)&&r.tipo==='A5'&&_mp(r)).map(r=>r.fecha)).size;
    const totDLTp=new Set(DB.tareaje.filter(r=>r.personalId===p.id&&r.fecha.startsWith(monthStr)&&r.tipo==='DLT'&&_mp(r)).map(r=>r.fecha)).size;
    const _pa5=totA5p>0?' <span style="color:#ea580c;font-weight:700">'+totA5p+'</span>A5':'';
    const _pdlt=totDLTp>0?' <span style="color:#65a30d;font-weight:700">'+totDLTp+'</span>DLT':'';
    return`<tr><td style="text-align:center;font-size:7px;padding:1px 2px;border:1px solid #e2e8f0">${idx+1}</td><td style="font-size:7.5px;font-weight:700;padding:1px 4px;border:1px solid #e2e8f0;white-space:nowrap">${p.ape}, ${p.nom}</td><td style="font-size:6.5px;padding:1px 3px;border:1px solid #e2e8f0;white-space:nowrap;color:#64748b">${p.cargo||'—'}</td>${cells}<td style="text-align:center;font-size:7px;padding:1px 3px;border:1px solid #e2e8f0;background:#e0f2fe;line-height:1.6"><span style="color:#059669;font-weight:700">${totD}</span>TD <span style="color:#1e40af;font-weight:700">${totN}</span>TN<br><span style="color:#6b7280;font-weight:700">${totDL}</span>DL${_pdlt}${_pa5}</td></tr>`;
  }).join('');
  const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Tareaje ${mesNombre} ${y}</title>
<style>@page{size:A4 landscape;margin:.7cm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:9px;color:#111;margin:0}
.hdr{display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #1e3a5f;padding-bottom:5px;margin-bottom:6px}
.hdr img{height:44px;object-fit:contain}
.info-row{display:grid;grid-template-columns:100px 1fr 100px 1fr 70px 100px;gap:0;border:1px solid #1e3a5f;border-radius:4px;margin-bottom:6px;overflow:hidden;font-size:7.5px}
.il{background:#1e3a5f;color:#fff;padding:3px 5px;font-weight:700;text-align:center}
.iv{padding:3px 5px;border-right:1px solid #e2e8f0}
table{width:100%;border-collapse:collapse}th{padding:2px 1px;font-size:7px}
td{border:1px solid #e2e8f0;vertical-align:middle}tr:nth-child(even) td{background:#f8fafc}
.ley{display:flex;flex-wrap:wrap;gap:3px;margin-bottom:6px}
.lt{font-size:6px;font-weight:700;padding:2px 4px;border-radius:3px;color:#fff}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body>
<div class="hdr"><img src="${_logoUrl}" alt="Ecosermo"><div style="text-align:center"><div style="font-size:13px;font-weight:900;color:#1e3a5f">TAREAJE DE PERSONAL</div><div style="font-size:9px;color:#64748b">Control de Asistencia Mensual</div></div><div style="text-align:right;font-size:7.5px;color:#64748b"><div style="font-weight:700;color:#1e3a5f;font-size:10px">${mesNombre} ${y}</div><div>Generado: ${new Date().toLocaleString('es-PE')}</div></div></div>
<div class="info-row"><div class="il">Proyecto</div><div class="iv">${proyNombre}</div><div class="il">Elaborado por</div><div class="iv">${elab}</div><div class="il">Fecha</div><div class="iv" style="background:#fef08a;font-weight:700;color:#1e3a5f">${new Date().toLocaleDateString('es-PE')}</div></div>
<div class="ley">${Object.entries(_TARE_T).map(([k,v])=>`<span class="lt" style="background:${v.bg};color:${v.tx}">${k}=${v.l}</span>`).join('')}</div>
<table><thead><tr><th style="background:#1e3a5f;color:#fff;width:20px">N°</th><th style="background:#1e3a5f;color:#fff;text-align:left;min-width:130px">Trabajador</th><th style="background:#1e3a5f;color:#fff;text-align:left;min-width:80px">Cargo</th>${dayHdrs}<th style="background:#1e3a5f;color:#fff;width:30px">D/N</th></tr></thead><tbody>${rows}</tbody></table>
</body></html>`;
  const win=window.open('','_blank');if(!win){toast('Active ventanas emergentes',true);return;}
  win.document.write(html);win.document.close();win.focus();setTimeout(()=>win.print(),500);
}
function fltTareaje(){
  const v=(document.getElementById('tareBuscar')?.value||'').toLowerCase().trim();
  const tbody=document.querySelector('#tbTareaje tbody');if(!tbody)return;
  Array.from(tbody.rows).forEach(r=>{
    const txt=r.dataset.search||((r.cells[1]?.textContent||'')+(r.cells[2]?.textContent||'')).toLowerCase();
    r.style.display=!v||txt.includes(v)?'':'none';
  });
}
function exportTareaje(){
  const ov=document.getElementById('tareExportOverlay');
  if(ov){ov.style.display='flex';document.getElementById('tareExportPwd').value='';setTimeout(()=>document.getElementById('tareExportPwd').focus(),50);}
}
function _doExportTareaje(){
  const pwd=document.getElementById('tareExportPwd').value;
  if(pwd!=='adr32026'){toast('Clave incorrecta',true);return;}
  document.getElementById('tareExportOverlay').style.display='none';
  const pad=n=>String(n).padStart(2,'0');
  const mv=document.getElementById('tareMes')?.value||new Date().toISOString().slice(0,7);
  const [y,m]=mv.split('-').map(Number);
  const days=new Date(y,m,0).getDate();
  const monthStr=`${y}-${pad(m)}`;
  const mesNombre=new Date(y,m-1,1).toLocaleString('es-PE',{month:'long'}).toUpperCase();
  const proyEl=document.getElementById('tareProy');
  const proyFiltro=proyEl?proyEl.value:'';
  const proyNombre=(proyFiltro?(DB.proyectos.find(p=>p.codigo===proyFiltro)?.nombre||proyFiltro):'Todos los proyectos')+_tarFiltroTxt();
  // Solo los que están visibles en la grilla (proyecto + guardia + buscador)
  const persF=_tarPersFiltrados(monthStr);
  // colores por tipo (hex sin #)
  const _BG={TD:'10b981',TN:'1e3a8a',DL:'38bdf8',P:'f59e0b',F:'ef4444',DM:'8b5cf6',LP:'3b82f6',LM:'ec4899',LF:'374151',V:'0ea5e9',DLT:'84cc16',A5:'f97316',R:'7f1d1d'};
  const _FG={TD:'FFFFFF',TN:'FFFFFF',DL:'000000',P:'000000',F:'FFFFFF',DM:'FFFFFF',LP:'FFFFFF',LM:'FFFFFF',LF:'FFFFFF',V:'FFFFFF',DLT:'000000',A5:'FFFFFF',R:'FFFFFF'};
  const _hdrS={fill:{patternType:'solid',fgColor:{rgb:'1E3A5F'}},font:{bold:true,color:{rgb:'FFFFFF'},sz:9},alignment:{horizontal:'center',vertical:'center'}};
  const _fixS=(even)=>({fill:{patternType:'solid',fgColor:{rgb:even?'EFF6FF':'FFFFFF'}},font:{sz:9},alignment:{vertical:'center'}});
  const _totS={fill:{patternType:'solid',fgColor:{rgb:'DBEAFE'}},font:{bold:true,sz:9},alignment:{horizontal:'center',vertical:'center'}};
  const _emptyS=(even)=>({fill:{patternType:'solid',fgColor:{rgb:even?'F8FAFC':'FFFFFF'}},alignment:{horizontal:'center',vertical:'center'}});
  const addr=(r,c)=>XLSX.utils.encode_cell({r,c});
  const dayNums=Array.from({length:days},(_,i)=>i+1);
  // Se exportan exactamente las columnas informativas visibles en la grilla
  const colsVis=_TAR_COLS.filter(c=>c.get());
  const nFix=2+colsVis.length; // N° + Trabajador + columnas visibles
  const headers=['N°','APELLIDOS Y NOMBRES',...colsVis.map(c=>c.l.toUpperCase()),...dayNums,'TD','TN','DL','F','P','DM','OTROS'];
  const dataRows=persF.map((p,idx)=>{
    const _mp=r=>!proyFiltro||r.proy===proyFiltro||(!r.proy&&p.proy===proyFiltro);
    const dayCells=dayNums.map(d=>{const fecha=`${y}-${pad(m)}-${pad(d)}`;const rec=DB.tareaje.find(r=>r.personalId===p.id&&r.fecha===fecha&&_mp(r));return rec?rec.tipo:'';});
    const ct=t=>new Set(DB.tareaje.filter(r=>r.personalId===p.id&&r.fecha.startsWith(monthStr)&&r.tipo===t&&_mp(r)).map(r=>r.fecha)).size;
    const otros=['DM','LP','LM','LF','V','DLT','A5','R'].reduce((s,t)=>s+ct(t),0);
    return[idx+1,`${p.ape}, ${p.nom}`,...colsVis.map(c=>_tarVal(p,c.k)||''),...dayCells,ct('TD'),ct('TN'),ct('DL'),ct('F'),ct('P'),ct('DM'),otros];
  });
  const titulo=[`TAREAJE DE PERSONAL – ${mesNombre} ${y}  |  Proyecto: ${proyNombre}  |  Generado: ${new Date().toLocaleString('es-PE')}`];
  const wsData=[titulo,[],headers,...dataRows];
  const ws=XLSX.utils.aoa_to_sheet(wsData);
  ws['!merges']=[{s:{r:0,c:0},e:{r:0,c:headers.length-1}}];
  const _wCol={dni:12,cargo:22,cat:16,tipo:12,ing:12,asig:8,grd:8,proc:14};
  ws['!cols']=[{wch:4},{wch:32},...colsVis.map(c=>({wch:_wCol[c.k]||14})),...Array(days).fill({wch:4}),{wch:4},{wch:4},{wch:4},{wch:4},{wch:4},{wch:4},{wch:5}];
  ws['!rows']=[{hpt:20},{hpt:4},...Array(dataRows.length+1).fill({hpt:14})];
  // Estilo título (fila 0)
  const tc=ws[addr(0,0)];
  if(tc)tc.s={fill:{patternType:'solid',fgColor:{rgb:'1E3A5F'}},font:{bold:true,color:{rgb:'FFFFFF'},sz:11},alignment:{horizontal:'center',vertical:'center'}};
  // Estilo encabezados (fila 2)
  headers.forEach((_,ci)=>{const c=ws[addr(2,ci)];if(c)c.s=_hdrS;});
  // Filas de datos (desde fila 3)
  dataRows.forEach((row,ri)=>{
    const er=3+ri,even=ri%2===0;
    // columnas fijas (N° + Trabajador + informativas visibles)
    for(let ci=0;ci<nFix;ci++){const c=ws[addr(er,ci)];if(c){c.s=_fixS(even);if(ci>=1)c.s.alignment={...c.s.alignment,horizontal:'left'};}}
    // celdas de días
    dayNums.forEach((_,di)=>{
      const ci=nFix+di;
      let c=ws[addr(er,ci)];
      const tipo=c?c.v:'';
      if(!c){ws[addr(er,ci)]=c={t:'s',v:''};}
      if(tipo&&_BG[tipo]){c.s={fill:{patternType:'solid',fgColor:{rgb:_BG[tipo]}},font:{bold:true,color:{rgb:_FG[tipo]},sz:8},alignment:{horizontal:'center',vertical:'center'}};}
      else{c.s=_emptyS(even);}
    });
    // columnas de totales
    for(let ci=nFix+days;ci<nFix+days+7;ci++){const c=ws[addr(er,ci)];if(c)c.s=_totS;}
  });
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,`Tareaje ${mesNombre} ${y}`.substring(0,31));
  XLSX.writeFile(wb,`Tareaje_${monthStr}_${proyFiltro||'TODOS'}.xlsx`);
  toast('✓ Excel con colores descargado');
}

// ── RESUMEN DIARIO DE TAREAJE ──
function _buildTareResumen(ids,colFilter){
  const fecha=document.getElementById(ids.fecha)?.value||today();
  const proy=document.getElementById(ids.proy)?.value||'';
  const guardia=document.getElementById(ids.guardia)?.value||'';
  let persF=(DB.personal||[]).filter(p=>p.est==='Activo');
  if(guardia)persF=persF.filter(p=>p.guardia===guardia);
  const tarDia=(DB.tareaje||[]).filter(r=>r.fecha===fecha&&(!proy||r.proy===proy||!r.proy));
  const tarMap={};
  tarDia.forEach(r=>{if(persF.find(p=>p.id===r.personalId))tarMap[r.personalId]=r.tipo;});
  const _COL_ORDER=['DL','TD','TN','DLT','A5','P','F','DM','LP','LM','LF','V','R'];
  const _tiposSet=new Set(Object.values(tarMap));
  const tiposAll=_COL_ORDER.filter(t=>_tiposSet.has(t));
  const tiposPresentes=colFilter?tiposAll.filter(t=>colFilter.has(t)):tiposAll;
  const showEnObra=!colFilter||colFilter.has('EO');
  const showTotal=!colFilter||colFilter.has('TG');
  const grupos={},grupoTotales={},totalGral={};
  persF.forEach(p=>{
    const tarTipo=tarMap[p.id];if(!tarTipo)return;
    const g=p.tipo==='Staff'?'STAFF':'OBRERO';
    const cargo=(p.cargo||'SIN CARGO').toUpperCase();
    if(!grupos[g]){grupos[g]={};grupoTotales[g]={};}
    if(!grupos[g][cargo])grupos[g][cargo]={};
    grupos[g][cargo][tarTipo]=(grupos[g][cargo][tarTipo]||0)+1;
    grupoTotales[g][tarTipo]=(grupoTotales[g][tarTipo]||0)+1;
    totalGral[tarTipo]=(totalGral[tarTipo]||0)+1;
  });
  const totalPersonas=Object.values(tarMap).length;
  const totalEnObra=totalPersonas-(totalGral['DL']||0);
  _tarResCache={fecha,proy,guardia,tarMap:{...tarMap},persF:[...persF]};
  // KPIs
  const kpiEl=document.getElementById(ids.kpis);
  if(kpiEl)kpiEl.innerHTML=[
    {l:'Total Personal',v:totalPersonas,c:'var(--mec)',ic:'👷'},
    {l:'Total en Obra',v:totalEnObra,c:'#10b981',ic:'🏗️'},
    ...tiposPresentes.map(t=>({l:_TARE_T[t]?.l||t,v:totalGral[t]||0,c:_TARE_T[t]?.bg||'#666',ic:t}))
  ].map(k=>`<div class="kpi" style="--kc:${k.c};padding:.5rem .9rem;flex:1;min-width:90px">
    <div class="kpi-lbl" style="margin-bottom:.2rem">${k.ic} ${k.l}</div>
    <div class="kpi-val" style="font-size:1.5rem">${k.v}</div>
  </div>`).join('');
  // Tabla
  const tablaEl=document.getElementById(ids.tabla);
  if(tablaEl){
    const thS='padding:6px 10px;font-size:.72rem;text-align:center;white-space:nowrap;border:1px solid #2d4a7a';
    const thSL=thS+';text-align:left';
    const tdS='border:1px solid var(--border);padding:5px 10px';
    let html=`<table style="border-collapse:collapse;width:100%;font-size:.78rem"><thead><tr>
      <th style="${thSL};background:#1e3a5f;color:#fff">Descripción</th>
      ${tiposPresentes.map(t=>`<th style="${thS};background:${_TARE_T[t]?.bg||'#1e3a5f'};color:${_TARE_T[t]?.tx||'#fff'}">${t}</th>`).join('')}
      ${showEnObra?`<th style="${thS};background:#10b981;color:#fff">En<br>Obra</th>`:''}
      ${showTotal?`<th style="${thS};background:#dc2626;color:#fff">Total<br>General</th>`:''}

    </tr></thead><tbody>`;
    ['OBRERO','STAFF'].filter(g=>grupos[g]).forEach(g=>{
      const tot=grupoTotales[g];
      const totG=tiposPresentes.reduce((s,t)=>s+(tot[t]||0),0);
      const totGObra=tiposPresentes.filter(t=>t!=='DL').reduce((s,t)=>s+(tot[t]||0),0);
      html+=`<tr style="background:rgba(30,58,95,.18)"><td style="${tdS};font-weight:700;letter-spacing:.04em">${g}</td>
        ${tiposPresentes.map(t=>`<td style="${tdS};text-align:center;font-weight:700">${tot[t]||''}</td>`).join('')}
        ${showEnObra?`<td style="${tdS};text-align:center;font-weight:700;color:#10b981">${totGObra||''}</td>`:''}
        ${showTotal?`<td style="${tdS};text-align:center;font-weight:700;color:#dc2626">${totG}</td>`:''}
      </tr>`;
      Object.keys(grupos[g]).sort().forEach(cargo=>{
        const cc=grupos[g][cargo];
        const totC=tiposPresentes.reduce((s,t)=>s+(cc[t]||0),0);
        const totCObra=tiposPresentes.filter(t=>t!=='DL').reduce((s,t)=>s+(cc[t]||0),0);
        const cpe=encodeURIComponent(cargo);
        html+=`<tr><td style="${tdS};padding-left:1.6rem;color:var(--muted2);font-size:.73rem">${cargo}</td>
          ${tiposPresentes.map(t=>{const v=cc[t]||0;return`<td style="${tdS};text-align:center${v?';cursor:pointer':''}" ${v?`ondblclick="_tarResDetail(event,'${g}','${cpe}','${t}')"`:''}>${v||''}</td>`;}).join('')}
          ${showEnObra?`<td style="${tdS};text-align:center;color:#10b981;font-weight:600">${totCObra||''}</td>`:''}
          ${showTotal?`<td style="${tdS};text-align:center;color:#dc2626;font-weight:600">${totC}</td>`:''}
        </tr>`;
      });
    });
    const grandTotal=tiposPresentes.reduce((s,t)=>s+(totalGral[t]||0),0);
    const grandTotalObra=tiposPresentes.filter(t=>t!=='DL').reduce((s,t)=>s+(totalGral[t]||0),0);
    html+=`<tr style="background:rgba(220,38,38,.12)"><td style="${tdS};font-weight:700;color:#dc2626">Total general</td>
      ${tiposPresentes.map(t=>`<td style="${tdS};text-align:center;font-weight:700;color:#dc2626">${totalGral[t]||''}</td>`).join('')}
      ${showEnObra?`<td style="${tdS};text-align:center;font-weight:700;color:#10b981">${grandTotalObra}</td>`:''}
      ${showTotal?`<td style="${tdS};text-align:center;font-weight:700;color:#dc2626">${grandTotal}</td>`:''}
    </tr>`;
    html+='</tbody></table>';
    tablaEl.innerHTML=tiposPresentes.length?html:'<div style="color:var(--muted2);padding:2rem;text-align:center;font-size:.8rem">Sin registros de tareaje para esta fecha</div>';
  }
  // Gráfico horizontal
  const chartEl=document.getElementById(ids.chart);
  if(chartEl){
    if(!tiposPresentes.length){chartEl.innerHTML='';return;}
    const maxVal=Math.max(...tiposPresentes.map(t=>totalGral[t]||0),1);
    chartEl.innerHTML=`<div style="font-size:.75rem;font-weight:700;color:var(--text);margin-bottom:.8rem;letter-spacing:.04em;text-transform:uppercase">Distribución por Tipo</div>
      <div style="display:flex;flex-direction:column;gap:.6rem">
        ${tiposPresentes.map(t=>{
          const v=totalGral[t]||0,bg=_TARE_T[t]?.bg||'#666',tx=_TARE_T[t]?.tx||'#fff';
          const pct=Math.round((v/maxVal)*100);
          const lbl=_TARE_T[t]?.l||t;
          return`<div><div style="display:flex;justify-content:space-between;font-size:.65rem;color:var(--muted2);margin-bottom:2px"><span style="font-weight:700;color:${bg}">${t} <span style="font-weight:400">${lbl}</span></span><span style="font-weight:700;color:var(--text)">${v} pers.</span></div>
            <div style="height:30px;background:var(--panel2);border-radius:5px;overflow:hidden;border:1px solid var(--border)">
              <div style="height:100%;width:${pct}%;background:${bg};display:flex;align-items:center;padding-left:8px">
                <span style="color:${tx};font-size:.75rem;font-weight:700">${v}</span>
              </div>
            </div></div>`;
        }).join('')}
      </div>
      <div style="margin-top:1.4rem;font-size:.75rem;font-weight:700;color:var(--text);margin-bottom:.7rem;text-transform:uppercase;letter-spacing:.04em">Por Categoría</div>
      <div style="display:flex;gap:.8rem">
        ${['OBRERO','STAFF'].filter(g=>grupos[g]).map(g=>{
          const tot=tiposPresentes.reduce((s,t)=>s+(grupoTotales[g][t]||0),0);
          const pct=Math.round((tot/(totalPersonas||1))*100);
          const col=g==='OBRERO'?'#f59e0b':'#3b82f6';
          return`<div style="flex:1;background:var(--panel2);border:1px solid var(--border);border-top:3px solid ${col};border-radius:8px;padding:.8rem;text-align:center">
            <div style="font-size:.68rem;color:var(--muted2);margin-bottom:.3rem;font-weight:600">${g}</div>
            <div style="font-size:2rem;font-weight:700;color:${col}">${tot}</div>
            <div style="font-size:.65rem;color:var(--muted2)">${pct}% del total</div>
          </div>`;
        }).join('')}
      </div>`;
  }
  return {fecha,proy,guardia,tiposPresentes,tiposAll,totalGral,totalPersonas};
}
function _printTareResumen(ids){
  const state=_buildTareResumen(ids,_tarPgColVis);
  const fecha=state.fecha,proy=state.proy,guardia=state.guardia;
  const tablaEl=document.getElementById(ids.tabla);
  const kpisEl=document.getElementById(ids.kpis);
  const _fix=h=>(h||'')
    .replace(/var\(--border\)/g,'#94a3b8')
    .replace(/var\(--muted2\)/g,'#475569')
    .replace(/var\(--panel2\)/g,'#f1f5f9')
    .replace(/var\(--text\)/g,'#111')
    .replace(/var\(--mec\)/g,'#be185d')
    .replace(/rgba\(30,58,95,\.18\)/g,'#dce7f3')
    .replace(/rgba\(220,38,38,\.12\)/g,'#fee2e2')
    .replace(/ondblclick="[^"]*"/g,'');
  const tableHTML=_fix(tablaEl?tablaEl.innerHTML:'');
  const kpisHTML=_fix(kpisEl?kpisEl.innerHTML:'');
  const proyNombre=proy?(DB.proyectos.find(p=>p.codigo===proy)?.nombre||proy):'— Todos —';
  const _logoUrl=window.location.href.replace(/[^\/\\]+$/,'')+'09.-ERP/Imagenes/ECOSERMO-LOGO.png';
  const fechaFmt=fecha?new Date(fecha+'T12:00:00').toLocaleDateString('es-PE',{weekday:'long',year:'numeric',month:'long',day:'numeric'}):'';
  const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Resumen Tareaje ${fecha}</title>
  <style>@page{size:A4 portrait;margin:.35cm .5cm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:6.5px;color:#111;margin:0}
  table{width:100%;border-collapse:collapse;table-layout:auto}
  table *{font-size:6.5px!important}
  th,td{border:1px solid #94a3b8!important;padding:1.5px 3px!important;white-space:normal!important;word-break:break-word;vertical-align:middle}
  tr{border-bottom:1px solid #94a3b8!important}
  tr:nth-child(even) td{background:#f8fafc}
  .kpis{display:flex;gap:3px;margin-bottom:4px;flex-wrap:nowrap}
  .kpis>div{padding:2px 4px!important;min-width:unset!important;flex:1!important;border-radius:4px!important}
  .kpis>div>div:first-child{font-size:5px!important;margin-bottom:0!important;white-space:nowrap!important}
  .kpis>div>div:last-child{font-size:9px!important;line-height:1.1!important}
  @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body>
  <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #1e3a5f;padding-bottom:3px;margin-bottom:5px">
    <img src="${_logoUrl}" alt="Ecosermo" style="height:26px;object-fit:contain">
    <div style="text-align:center"><div style="font-size:9px;font-weight:900;color:#1e3a5f">RESUMEN DIARIO DE TAREAJE</div>
    <div style="font-size:6px;color:#64748b;text-transform:capitalize">${fechaFmt}</div></div>
    <div style="text-align:right;font-size:6px;color:#64748b">
      <div>Proyecto: <strong>${proyNombre}</strong></div>
      <div>Guardia: <strong>${guardia||'Todas'}</strong></div>
      <div>Generado: ${new Date().toLocaleString('es-PE')}</div>
    </div>
  </div>
  <div class="kpis">${kpisHTML}</div>
  ${tableHTML}
  </body></html>`;
  const win=window.open('','_blank');if(!win){toast('Active ventanas emergentes',true);return;}
  win.document.write(html);win.document.close();win.focus();setTimeout(()=>win.print(),600);
}
// Popup detalle doble-clic
function _tarResDetail(event,grupo,cargoEnc,tipo){
  if(!_tarResCache)return;
  const {tarMap,persF}=_tarResCache;
  const cargo=decodeURIComponent(cargoEnc);
  const personas=persF.filter(p=>{
    const pg=p.tipo==='Staff'?'STAFF':'OBRERO';
    const pc=(p.cargo||'SIN CARGO').toUpperCase();
    return pg===grupo&&pc===cargo&&tarMap[p.id]===tipo;
  });
  const tt=_TARE_T[tipo]||{bg:'#666',tx:'#fff',l:tipo};
  let pop=document.getElementById('_tarResPop');
  if(!pop){
    pop=document.createElement('div');
    pop.id='_tarResPop';
    pop.style.cssText='position:fixed;z-index:99999;background:var(--panel);border:1px solid var(--border);border-radius:10px;padding:.8rem 1rem;box-shadow:0 8px 32px rgba(0,0,0,.65);min-width:230px;max-width:340px;display:none';
    document.body.appendChild(pop);
    document.addEventListener('click',e=>{if(!pop.contains(e.target))pop.style.display='none';});
  }
  pop.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.7rem;gap:.5rem">
    <span style="font-weight:700;font-size:.8rem;color:var(--text);flex:1">${cargo}</span>
    <span style="background:${tt.bg};color:${tt.tx};border-radius:5px;padding:2px 9px;font-size:.72rem;font-weight:700">${tipo} · ${tt.l}</span>
    <button onclick="document.getElementById('_tarResPop').style.display='none'" style="background:none;border:none;color:var(--muted2);cursor:pointer;font-size:1rem;line-height:1;padding:0">✕</button>
  </div>
  <div style="font-size:.7rem;color:var(--muted2);margin-bottom:.45rem;text-transform:uppercase;letter-spacing:.05em">${personas.length} persona${personas.length!==1?'s':''}</div>
  <div style="display:flex;flex-direction:column;gap:.28rem;max-height:280px;overflow-y:auto">
    ${personas.map(p=>`<div id="_trp_${p.id}" style="display:flex;gap:.45rem;align-items:center;padding:.3rem .5rem;background:var(--panel2);border-radius:6px;border:1px solid var(--border)">
      <span style="font-size:.65rem;color:var(--muted2);font-family:monospace;min-width:75px;flex-shrink:0">${p.dni||'—'}</span>
      <span style="font-size:.72rem;font-weight:600;color:var(--text);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${(p.ape||'').toUpperCase()}, ${p.nom||''}</span>
      <span style="font-size:.6rem;padding:1px 6px;border-radius:4px;background:rgba(245,158,11,.15);color:#f59e0b;font-weight:700;flex-shrink:0;min-width:22px;text-align:center">${p.guardia||'—'}</span>
      <button onclick="_tarCambiarGuardia(${p.id})" title="Cambiar guardia"
        style="background:rgba(99,102,241,.12);border:1px solid rgba(99,102,241,.3);color:#818cf8;border-radius:5px;padding:2px 7px;font-size:.62rem;cursor:pointer;flex-shrink:0;white-space:nowrap">✏️ Grd.</button>
    </div>`).join('')}
  </div>`;
  const x=Math.min(event.clientX+4,window.innerWidth-350);
  const y=Math.min(event.clientY+6,window.innerHeight-300);
  pop.style.left=Math.max(6,x)+'px';
  pop.style.top=Math.max(6,y)+'px';
  pop.style.display='block';
  event.stopPropagation();
}

function _tarCambiarGuardia(personalId){
  const p=(DB.personal||[]).find(x=>x.id===personalId);
  if(!p)return;
  const row=document.getElementById('_trp_'+personalId);
  if(!row)return;
  // Si ya hay un inline-form abierto en esta fila, cerrarlo
  const existente=row.querySelector('._tarGrdForm');
  if(existente){existente.remove();return;}
  // Crear mini-form inline
  const form=document.createElement('div');
  form.className='_tarGrdForm';
  form.style.cssText='display:flex;align-items:center;gap:.3rem;margin-top:.3rem;padding:.25rem .4rem;background:rgba(99,102,241,.08);border:1px solid rgba(99,102,241,.25);border-radius:6px';
  form.innerHTML=`
    <span style="font-size:.6rem;color:#a5b4fc;flex-shrink:0">Guardia:</span>
    <select id="_tarGrdSel_${personalId}"
      style="background:var(--panel);border:1px solid rgba(99,102,241,.4);border-radius:4px;color:var(--text);padding:2px 5px;font-size:.67rem;flex:1;outline:none">
      <option value="">— Sin guardia —</option>
      <option value="A" ${p.guardia==='A'?'selected':''}>A</option>
      <option value="B" ${p.guardia==='B'?'selected':''}>B</option>
      <option value="C" ${p.guardia==='C'?'selected':''}>C</option>
    </select>
    <button onclick="_tarGuardiaSave(${personalId})"
      style="background:rgba(16,185,129,.15);border:1px solid rgba(16,185,129,.35);color:#10b981;border-radius:4px;padding:2px 8px;font-size:.62rem;cursor:pointer;font-weight:700">✓</button>
    <button onclick="document.querySelector('._tarGrdForm')?.remove()"
      style="background:none;border:none;color:var(--muted2);cursor:pointer;font-size:.8rem;line-height:1;padding:0 2px">✕</button>
  `;
  // Insertar el form debajo de la fila convirtiéndola en columna
  row.style.flexWrap='wrap';
  row.appendChild(form);
  document.getElementById('_tarGrdSel_'+personalId)?.focus();
}

function _tarGuardiaSave(personalId){
  const p=(DB.personal||[]).find(x=>x.id===personalId);
  if(!p)return;
  const sel=document.getElementById('_tarGrdSel_'+personalId);
  if(!sel)return;
  const nueva=sel.value;
  p.guardia=nueva;
  syncSheet('savePersonal',p);
  // Actualizar badge en la fila
  const row=document.getElementById('_trp_'+personalId);
  if(row){
    const badge=row.querySelector('span[style*="f59e0b"]');
    if(badge)badge.textContent=nueva||'—';
    const form=row.querySelector('._tarGrdForm');
    if(form)form.remove();
    row.style.flexWrap='';
  }
  toast(`✓ ${p.ape}, ${p.nom} → Guardia ${nueva||'sin asignar'}`);
}
// ── Filtro de columnas del Resumen ──
function _toggleTarColMenu(e){
  const m=document.getElementById('tarPgColMenu');if(!m)return;
  const show=m.style.display!=='block';
  m.style.display=show?'block':'none';
  if(show){
    e&&e.stopPropagation();
    setTimeout(()=>document.addEventListener('click',function _c(ev){
      const btn=document.getElementById('tarPgColBtn');
      if(!m.contains(ev.target)&&ev.target!==btn&&!btn?.contains(ev.target)){m.style.display='none';document.removeEventListener('click',_c);}
    }),10);
  }
}
function _buildTarColMenu(tiposDisp){
  const m=document.getElementById('tarPgColMenu');
  const btnLbl=document.getElementById('tarPgColBtnLbl');
  if(!m)return;
  _tarPgColsAvail=tiposDisp;
  const allKeys=[...tiposDisp,'EO','TG'];
  const vis=_tarPgColVis||new Set(allKeys);
  const lbl=k=>k==='EO'?'En Obra':k==='TG'?'Total General':(_TARE_T[k]?.l||k);
  const col=k=>k==='EO'?'#10b981':k==='TG'?'#dc2626':(_TARE_T[k]?.bg||'#666');
  const tag=k=>k==='EO'?'EO':k==='TG'?'TOTAL':k;
  m.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.4rem;padding-bottom:.3rem;border-bottom:1px solid var(--border)">
    <span style="font-size:.62rem;font-weight:700;color:var(--muted2);text-transform:uppercase;letter-spacing:.06em">Columnas visibles</span>
    <div style="display:flex;gap:3px">
      <button onclick="_tarColSelAll(true)" style="background:none;border:none;color:#10b981;font-size:.6rem;cursor:pointer;font-weight:700">Todas</button>
      <span style="color:var(--muted2);font-size:.6rem">|</span>
      <button onclick="_tarColSelAll(false)" style="background:none;border:none;color:#ef4444;font-size:.6rem;cursor:pointer;font-weight:700">Ninguna</button>
    </div>
  </div>
  ${allKeys.map(k=>`<label style="display:flex;align-items:center;gap:.4rem;padding:.22rem .3rem;border-radius:4px;cursor:pointer;font-size:.74rem" onmouseover="this.style.background='var(--panel2)'" onmouseout="this.style.background=''">
    <input type="checkbox" id="tarCol_${k}" ${vis.has(k)?'checked':''} onchange="_onTarColChange()" style="cursor:pointer;accent-color:${col(k)};width:12px;height:12px">
    <span style="background:${col(k)};color:#fff;border-radius:3px;padding:1px 5px;font-size:.58rem;font-weight:700;min-width:26px;text-align:center">${tag(k)}</span>
    <span style="color:var(--text)">${lbl(k)}</span>
  </label>`).join('')}`;
  const sel=allKeys.filter(k=>vis.has(k)).length;
  if(btnLbl)btnLbl.textContent=sel===allKeys.length?'Todas las columnas':`${sel} / ${allKeys.length} columnas`;
}
function _tarColSelAll(state){
  const allKeys=[..._tarPgColsAvail,'EO','TG'];
  _tarPgColVis=state?null:new Set();
  allKeys.forEach(k=>{const cb=document.getElementById(`tarCol_${k}`);if(cb)cb.checked=state;});
  const btnLbl=document.getElementById('tarPgColBtnLbl');
  if(btnLbl)btnLbl.textContent=state?'Todas las columnas':'0 columnas';
  _buildTareResumen({fecha:'tarPgFecha',proy:'tarPgProy',guardia:'tarPgGuardia',kpis:'tarPgKpis',tabla:'tarPgTabla',chart:'tarPgChart'},_tarPgColVis);
}
function _onTarColChange(){
  const allKeys=[..._tarPgColsAvail,'EO','TG'];
  const sel=new Set(allKeys.filter(k=>{const cb=document.getElementById(`tarCol_${k}`);return cb&&cb.checked;}));
  _tarPgColVis=sel.size===allKeys.length?null:sel;
  const btnLbl=document.getElementById('tarPgColBtnLbl');
  const cnt=_tarPgColVis?_tarPgColVis.size:allKeys.length;
  if(btnLbl)btnLbl.textContent=cnt===allKeys.length?'Todas las columnas':`${cnt} / ${allKeys.length} columnas`;
  _buildTareResumen({fecha:'tarPgFecha',proy:'tarPgProy',guardia:'tarPgGuardia',kpis:'tarPgKpis',tabla:'tarPgTabla',chart:'tarPgChart'},_tarPgColVis);
}
// Página completa
// Fecha y lista de proyectos: son de la página, las comparten ambos tabs
function _tarPgInitFiltros(){
  const fEl=document.getElementById('tarPgFecha');
  if(fEl&&!fEl.value)fEl.value=today();
  const ps=document.getElementById('tarPgProy');
  if(ps){const cur=ps.value;ps.innerHTML='<option value="">— Todos los proyectos —</option>'+(DB.proyectos||[]).map(p=>`<option value="${p.codigo}">[${p.codigo}] ${p.nombre}</option>`).join('');if(cur)ps.value=cur;}
}
function rTareResumenPg(){
  _tarPgInitFiltros();
  // La página comparte fecha y proyecto con el tab de Guardias FBNV
  if(typeof _tarPgTabAct!=='undefined'&&_tarPgTabAct==='guardias'){rGuardiasFbnv();return;}
  _tarPgColVis=null;
  const _st=_buildTareResumen({fecha:'tarPgFecha',proy:'tarPgProy',guardia:'tarPgGuardia',kpis:'tarPgKpis',tabla:'tarPgTabla',chart:'tarPgChart'},null);
  _buildTarColMenu(_st.tiposAll||[]);
}
function printTareResumenPg(){_printTareResumen({fecha:'tarPgFecha',proy:'tarPgProy',guardia:'tarPgGuardia',kpis:'tarPgKpis',tabla:'tarPgTabla',chart:'tarPgChart'});}
function exportTareResumenXLSX(){
  const fecha=document.getElementById('tarPgFecha')?.value||today();
  const proy=document.getElementById('tarPgProy')?.value||'';
  const guardia=document.getElementById('tarPgGuardia')?.value||'';
  const proyNombre=proy?(DB.proyectos.find(p=>p.codigo===proy)?.nombre||proy):'Todos los proyectos';
  let persF=(DB.personal||[]).filter(p=>p.est==='Activo');
  if(guardia)persF=persF.filter(p=>p.guardia===guardia);
  const tarDia=(DB.tareaje||[]).filter(r=>r.fecha===fecha&&(!proy||r.proy===proy||!r.proy));
  const tarMap={};
  tarDia.forEach(r=>{if(persF.find(p=>p.id===r.personalId))tarMap[r.personalId]=r.tipo;});
  if(!Object.keys(tarMap).length){toast('Sin registros de tareaje para esta fecha',true);return;}
  // Recomputar grupos
  const _CO=['DL','TD','TN','DLT','A5','P','F','DM','LP','LM','LF','V','R'];
  const _ts=new Set(Object.values(tarMap));
  const tiposAll=_CO.filter(t=>_ts.has(t));
  const tiposP=_tarPgColVis?tiposAll.filter(t=>_tarPgColVis.has(t)):tiposAll;
  const showEO=!_tarPgColVis||_tarPgColVis.has('EO');
  const showTG=!_tarPgColVis||_tarPgColVis.has('TG');
  const grupos={},grupoTot={},totalGral={};
  persF.forEach(p=>{
    const tp=tarMap[p.id];if(!tp)return;
    const g=p.tipo==='Staff'?'STAFF':'OBRERO';
    const c=(p.cargo||'SIN CARGO').toUpperCase();
    if(!grupos[g]){grupos[g]={};grupoTot[g]={};}
    if(!grupos[g][c])grupos[g][c]={};
    grupos[g][c][tp]=(grupos[g][c][tp]||0)+1;
    grupoTot[g][tp]=(grupoTot[g][tp]||0)+1;
    totalGral[tp]=(totalGral[tp]||0)+1;
  });
  const nC=1+tiposP.length+(showEO?1:0)+(showTG?1:0);
  const fechaFmt=fecha?new Date(fecha+'T12:00:00').toLocaleDateString('es-PE',{weekday:'long',year:'numeric',month:'long',day:'numeric'}):'';
  // Colores tipo
  const _TBG={DL:'6B7280',TD:'10B981',TN:'1E3A8A',DLT:'84CC16',A5:'F97316',P:'F59E0B',F:'EF4444',DM:'8B5CF6',LP:'3B82F6',LM:'EC4899',LF:'374151',V:'0EA5E9',R:'7F1D1D'};
  const addr=(r,c)=>XLSX.utils.encode_cell({r,c});
  const _s=(bg,fg,bold,sz,hAlign)=>({fill:{patternType:'solid',fgColor:{rgb:bg}},font:{bold:!!bold,color:{rgb:fg||'111111'},sz:sz||8},alignment:{horizontal:hAlign||'center',vertical:'center',wrapText:true}});
  // Construir AOA
  const wsData=[];
  wsData.push([`RESUMEN DIARIO DE TAREAJE – ${fechaFmt.toUpperCase()}`,...Array(nC-1).fill('')]);
  wsData.push([`Proyecto: ${proyNombre}   |   Guardia: ${guardia||'Todas'}   |   Generado: ${new Date().toLocaleString('es-PE')}`,...Array(nC-1).fill('')]);
  wsData.push(Array(nC).fill(''));
  wsData.push(['DESCRIPCIÓN',...tiposP,...(showEO?['EN OBRA']:[]),...(showTG?['TOTAL GENERAL']:[])]);
  const rowTypes=['title','info','empty','header'];
  ['OBRERO','STAFF'].filter(g=>grupos[g]).forEach(g=>{
    const tot=grupoTot[g];
    const tG=tiposP.reduce((s,t)=>s+(tot[t]||0),0);
    const tGO=tiposP.filter(t=>t!=='DL').reduce((s,t)=>s+(tot[t]||0),0);
    wsData.push([g,...tiposP.map(t=>tot[t]||''),...(showEO?[tGO||'']:[]),...(showTG?[tG]:[])]);
    rowTypes.push('group');
    Object.keys(grupos[g]).sort().forEach(cargo=>{
      const cc=grupos[g][cargo];
      const tC=tiposP.reduce((s,t)=>s+(cc[t]||0),0);
      const tCO=tiposP.filter(t=>t!=='DL').reduce((s,t)=>s+(cc[t]||0),0);
      wsData.push(['  '+cargo,...tiposP.map(t=>cc[t]||''),...(showEO?[tCO||'']:[]),...(showTG?[tC]:[])]);
      rowTypes.push('cargo');
    });
  });
  const gT=tiposP.reduce((s,t)=>s+(totalGral[t]||0),0);
  const gTO=tiposP.filter(t=>t!=='DL').reduce((s,t)=>s+(totalGral[t]||0),0);
  wsData.push(['TOTAL GENERAL',...tiposP.map(t=>totalGral[t]||''),...(showEO?[gTO]:[]),...(showTG?[gT]:[])]);
  rowTypes.push('grand');
  const ws=XLSX.utils.aoa_to_sheet(wsData);
  ws['!merges']=[{s:{r:0,c:0},e:{r:0,c:nC-1}},{s:{r:1,c:0},e:{r:1,c:nC-1}},{s:{r:2,c:0},e:{r:2,c:nC-1}}];
  // Estilos fila por fila
  rowTypes.forEach((type,ri)=>{
    if(type==='title'){const c=ws[addr(ri,0)];if(c)c.s=_s('1E3A5F','FFFFFF',true,11,'center');}
    else if(type==='info'){const c=ws[addr(ri,0)];if(c)c.s=_s('EFF6FF','475569',false,7.5,'left');}
    else if(type==='header'){
      for(let ci=0;ci<nC;ci++){
        let cell=ws[addr(ri,ci)];if(!cell){ws[addr(ri,ci)]=cell={t:'s',v:''};}
        if(ci===0){cell.s=_s('1E3A5F','FFFFFF',true,8,'left');}
        else{
          const eoIdx=1+tiposP.length;const tgIdx=eoIdx+(showEO?1:0);
          if(ci<eoIdx){const t=tiposP[ci-1];cell.s=_s(_TBG[t]||'1E3A5F','FFFFFF',true,8);}
          else if(showEO&&ci===eoIdx){cell.s=_s('059669','FFFFFF',true,8);}
          else{cell.s=_s('DC2626','FFFFFF',true,8);}
        }
      }
    }
    else if(type==='group'){
      for(let ci=0;ci<nC;ci++){
        let cell=ws[addr(ri,ci)];if(!cell){ws[addr(ri,ci)]=cell={t:'s',v:''};}
        cell.s=ci===0?_s('DCE7F3','1E3A5F',true,8,'left'):_s('DCE7F3','1E3A5F',true,8);
      }
    }
    else if(type==='cargo'){
      for(let ci=0;ci<nC;ci++){
        let cell=ws[addr(ri,ci)];if(!cell){ws[addr(ri,ci)]=cell={t:'s',v:''};}
        const eoIdx=1+tiposP.length;const tgIdx=eoIdx+(showEO?1:0);
        if(ci===0){cell.s=_s('FFFFFF','111111',false,7.5,'left');}
        else if(showEO&&ci===eoIdx){cell.s=_s('FFFFFF','059669',true,7.5);}
        else if(showTG&&ci===tgIdx){cell.s=_s('FFFFFF','DC2626',true,7.5);}
        else{cell.s=_s('FFFFFF','111111',false,7.5);}
      }
    }
    else if(type==='grand'){
      for(let ci=0;ci<nC;ci++){
        let cell=ws[addr(ri,ci)];if(!cell){ws[addr(ri,ci)]=cell={t:'s',v:''};}
        const eoIdx=1+tiposP.length;
        if(showEO&&ci===eoIdx){cell.s=_s('D1FAE5','059669',true,8);}
        else{cell.s=_s('FEE2E2','DC2626',true,8,ci===0?'left':'center');}
      }
    }
  });
  ws['!cols']=[{wch:36},...tiposP.map(()=>({wch:9})),...(showEO?[{wch:11}]:[]),...(showTG?[{wch:14}]:[])];
  ws['!rows']=[{hpt:20},{hpt:12},{hpt:4},{hpt:15},...rowTypes.slice(4).map(t=>t==='cargo'?{hpt:12}:{hpt:14})];
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,`Resumen ${fecha||''}`.substring(0,31));
  XLSX.writeFile(wb,`Resumen_Tareaje_${fecha||'sin-fecha'}.xlsx`);
  toast('✓ Excel exportado correctamente');
}

