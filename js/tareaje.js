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
let _tarPickerCb=null;
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
  const persFIds=new Set(persF.map(p=>p.id));
  const monthRecs=DB.tareaje.filter(r=>r.fecha&&r.fecha.startsWith(monthStr)&&persFIds.has(r.personalId));
  document.getElementById('tareKpis').innerHTML=[
    {l:'Trabajadores',v:persF.length,c:'var(--mec)',ic:'👷',sub:'en grilla'},
    {l:'Trabajo Día',v:monthRecs.filter(r=>r.tipo==='TD').length,c:'#10b981',ic:'☀️',sub:'jornadas TD'},
    {l:'Trabajo Noche',v:monthRecs.filter(r=>r.tipo==='TN').length,c:'#3b82f6',ic:'🌙',sub:'jornadas TN'},
    {l:'Faltas',v:monthRecs.filter(r=>r.tipo==='F').length,c:'#ef4444',ic:'❌',sub:'del mes'},
    {l:'Horas Hombre',v:monthRecs.filter(r=>['TD','TN','DLT','A5'].includes(r.tipo)&&(!proyFiltro||r.proy===proyFiltro||!r.proy)).length*10,c:'#f59e0b',ic:'⏱️',sub:'HH · TD+TN+DLT+A5 × 10 h/día'}
  ].map(k=>`<div style="background:var(--panel);border:1px solid var(--border);border-top:3px solid ${k.c};border-radius:10px;padding:.85rem 1.1rem;flex:1;min-width:150px"><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:.5rem"><span style="font-size:.67rem;text-transform:uppercase;letter-spacing:.08em;color:var(--muted2);font-weight:600">${k.l}</span><span style="font-size:1.3rem;line-height:1;opacity:.75">${k.ic}</span></div><div style="font-size:2.4rem;font-weight:800;color:${k.c};line-height:1;margin-bottom:.25rem">${k.v}</div><div style="font-size:.68rem;color:var(--muted2)">${k.sub}</div></div>`).join('');
  document.getElementById('tareLeyenda').innerHTML=Object.entries(_TARE_T).map(([k,v])=>`<span style="background:${v.bg};color:${v.tx};font-size:.6rem;font-weight:700;padding:2px 7px;border-radius:4px;white-space:nowrap">${k} – ${v.l}</span>`).join('');
  const mesNombre=new Date(y,m-1,1).toLocaleString('es-PE',{month:'long'}).toUpperCase();
  const dayHdrs=Array.from({length:days},(_,i)=>{
    const d=i+1,fecha=`${y}-${pad(m)}-${pad(d)}`;
    const dow=new Date(fecha+'T12:00:00').getDay(),isSun=dow===0;
    return`<th onclick="_tarColClick('${fecha}')" style="text-align:center;min-width:30px;width:30px;padding:2px 1px;font-size:.6rem;cursor:pointer;${isSun?'color:#f59e0b;background:rgba(245,158,11,.12)':''}">${d}<div style="font-size:.5rem;opacity:.7">${DN[dow]}</div></th>`;
  }).join('');
  const rows=persF.map((p,idx)=>{
    const _matchProy=r=>!proyFiltro||r.proy===proyFiltro||(!r.proy&&p.proy===proyFiltro);
    const cells=Array.from({length:days},(_,i)=>{
      const d=i+1,fecha=`${y}-${pad(m)}-${pad(d)}`;
      const rec=DB.tareaje.find(r=>r.personalId===p.id&&r.fecha===fecha&&_matchProy(r));
      const tipo=rec?rec.tipo:'';
      const t=tipo?_TARE_T[tipo]:null;
      const dow=new Date(fecha+'T12:00:00').getDay(),isSun=dow===0;
      return`<td id="tar-${p.id}-${fecha}" onclick="_tarCellClick(${p.id},'${fecha}',this)" onmouseover="_tarHoverOver(${p.id},'${fecha}',this)" style="text-align:center;cursor:pointer;height:26px;padding:0;border:1px solid var(--border);${t?`background:${t.bg};color:${t.tx};`:''}${isSun&&!tipo?'background:rgba(245,158,11,.06);':''}font-size:.6rem;font-weight:700" title="${t?t.l:fecha}">${tipo}</td>`;
    }).join('');
    const totD=DB.tareaje.filter(r=>r.personalId===p.id&&r.fecha.startsWith(monthStr)&&r.tipo==='TD'&&_matchProy(r)).length;
    const totN=DB.tareaje.filter(r=>r.personalId===p.id&&r.fecha.startsWith(monthStr)&&r.tipo==='TN'&&_matchProy(r)).length;
    const totDL=DB.tareaje.filter(r=>r.personalId===p.id&&r.fecha.startsWith(monthStr)&&r.tipo==='DL'&&_matchProy(r)).length;
    return`<tr style="border-bottom:1px solid var(--border)">
      <td style="text-align:center;font-size:.7rem;color:var(--muted2);padding:3px 5px;white-space:nowrap">${idx+1}</td>
      <td style="padding:3px 8px;white-space:nowrap;font-size:.78rem;min-width:180px"><strong>${p.ape}, ${p.nom}</strong></td>
      <td style="padding:3px 5px;white-space:nowrap;font-size:.7rem;color:var(--muted2);min-width:100px">${p.cargo||'—'}</td>
      ${cells}
      <td style="text-align:center;font-size:.68rem;padding:3px 4px;white-space:nowrap;background:rgba(4,78,100,.08);line-height:1.5"><span style="color:#10b981;font-weight:700">${totD}</span><span style="color:var(--muted2);font-size:.6rem">TD</span> <span style="color:#3b82f6;font-weight:700">${totN}</span><span style="color:var(--muted2);font-size:.6rem">TN</span><br><span style="color:#6b7280;font-weight:700">${totDL}</span><span style="color:var(--muted2);font-size:.6rem">DL</span></td>
    </tr>`;
  }).join('');
  document.getElementById('tbTareaje').innerHTML=`
    <thead>
      <tr style="background:var(--panel2)">
        <th style="padding:5px 6px;font-size:.68rem;white-space:nowrap;min-width:30px">N°</th>
        <th style="padding:5px 8px;font-size:.68rem;white-space:nowrap;min-width:180px">Trabajador</th>
        <th style="padding:5px 6px;font-size:.68rem;white-space:nowrap;min-width:100px">Cargo</th>
        <th colspan="${days}" style="text-align:center;padding:5px;font-size:.72rem;background:rgba(4,78,100,.2);color:var(--mec);font-weight:700;letter-spacing:.05em">${mesNombre} ${y}</th>
        <th style="padding:5px 4px;font-size:.62rem;text-align:center;white-space:nowrap;min-width:55px;background:rgba(4,78,100,.12);line-height:1.4"><span style="color:#10b981">TD</span>/<span style="color:#3b82f6">TN</span><br><span style="color:#6b7280">DL</span></th>
      </tr>
      <tr style="background:var(--panel2)"><th></th><th></th><th></th>${dayHdrs}<th></th></tr>
    </thead>
    <tbody>${rows}</tbody>`;
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
    const totD=DB.tareaje.filter(r=>r.personalId===personalId&&r.fecha.startsWith(ms)&&r.tipo==='TD').length;
    const totN=DB.tareaje.filter(r=>r.personalId===personalId&&r.fecha.startsWith(ms)&&r.tipo==='TN').length;
    const totDL=DB.tareaje.filter(r=>r.personalId===personalId&&r.fecha.startsWith(ms)&&r.tipo==='DL').length;
    const row=cell.closest('tr');
    if(row){const last=row.querySelector('td:last-child');if(last)last.innerHTML=`<span style="color:#10b981;font-weight:700">${totD}</span><span style="color:var(--muted2);font-size:.6rem">TD</span> <span style="color:#3b82f6;font-weight:700">${totN}</span><span style="color:var(--muted2);font-size:.6rem">TN</span><br><span style="color:#6b7280;font-weight:700">${totDL}</span><span style="color:var(--muted2);font-size:.6rem">DL</span>`;}
  }
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
  const proyNombre=proyFiltro?(DB.proyectos.find(p=>p.codigo===proyFiltro)?.nombre||proyFiltro):'— Todos —';
  const elab='';
  let persF;
  if(proyFiltro){
    const _wids=new Set(DB.tareaje.filter(r=>r.fecha&&r.fecha.startsWith(monthStr)&&r.proy===proyFiltro).map(r=>r.personalId));
    persF=DB.personal.filter(p=>p.proy===proyFiltro||_wids.has(p.id));
  }else{persF=DB.personal;}
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
    const totD=DB.tareaje.filter(r=>r.personalId===p.id&&r.fecha.startsWith(monthStr)&&r.tipo==='TD'&&_mp(r)).length;
    const totN=DB.tareaje.filter(r=>r.personalId===p.id&&r.fecha.startsWith(monthStr)&&r.tipo==='TN'&&_mp(r)).length;
    const totDL=DB.tareaje.filter(r=>r.personalId===p.id&&r.fecha.startsWith(monthStr)&&r.tipo==='DL'&&_mp(r)).length;
    return`<tr><td style="text-align:center;font-size:7px;padding:1px 2px;border:1px solid #e2e8f0">${idx+1}</td><td style="font-size:7.5px;font-weight:700;padding:1px 4px;border:1px solid #e2e8f0;white-space:nowrap">${p.ape}, ${p.nom}</td><td style="font-size:6.5px;padding:1px 3px;border:1px solid #e2e8f0;white-space:nowrap;color:#64748b">${p.cargo||'—'}</td>${cells}<td style="text-align:center;font-size:7px;padding:1px 3px;border:1px solid #e2e8f0;background:#e0f2fe;line-height:1.6"><span style="color:#059669;font-weight:700">${totD}</span>TD <span style="color:#1e40af;font-weight:700">${totN}</span>TN<br><span style="color:#6b7280;font-weight:700">${totDL}</span>DL</td></tr>`;
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
    const txt=(r.cells[1]?.textContent||'')+(r.cells[2]?.textContent||'');
    r.style.display=!v||txt.toLowerCase().includes(v)?'':'none';
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
  const proyNombre=proyFiltro?(DB.proyectos.find(p=>p.codigo===proyFiltro)?.nombre||proyFiltro):'Todos los proyectos';
  let persF;
  if(proyFiltro){
    const wids=new Set(DB.tareaje.filter(r=>r.fecha&&r.fecha.startsWith(monthStr)&&r.proy===proyFiltro).map(r=>r.personalId));
    persF=DB.personal.filter(p=>p.proy===proyFiltro||wids.has(p.id));
  }else{persF=DB.personal;}
  // colores por tipo (hex sin #)
  const _BG={TD:'10b981',TN:'1e3a8a',DL:'38bdf8',P:'f59e0b',F:'ef4444',DM:'8b5cf6',LP:'3b82f6',LM:'ec4899',LF:'374151',V:'0ea5e9',DLT:'84cc16',A5:'f97316',R:'7f1d1d'};
  const _FG={TD:'FFFFFF',TN:'FFFFFF',DL:'000000',P:'000000',F:'FFFFFF',DM:'FFFFFF',LP:'FFFFFF',LM:'FFFFFF',LF:'FFFFFF',V:'FFFFFF',DLT:'000000',A5:'FFFFFF',R:'FFFFFF'};
  const _hdrS={fill:{patternType:'solid',fgColor:{rgb:'1E3A5F'}},font:{bold:true,color:{rgb:'FFFFFF'},sz:9},alignment:{horizontal:'center',vertical:'center'}};
  const _fixS=(even)=>({fill:{patternType:'solid',fgColor:{rgb:even?'EFF6FF':'FFFFFF'}},font:{sz:9},alignment:{vertical:'center'}});
  const _totS={fill:{patternType:'solid',fgColor:{rgb:'DBEAFE'}},font:{bold:true,sz:9},alignment:{horizontal:'center',vertical:'center'}};
  const _emptyS=(even)=>({fill:{patternType:'solid',fgColor:{rgb:even?'F8FAFC':'FFFFFF'}},alignment:{horizontal:'center',vertical:'center'}});
  const addr=(r,c)=>XLSX.utils.encode_cell({r,c});
  const dayNums=Array.from({length:days},(_,i)=>i+1);
  const headers=['N°','DNI','APELLIDOS Y NOMBRES','CARGO',...dayNums,'TD','TN','DL','F','P','DM','OTROS'];
  const dataRows=persF.map((p,idx)=>{
    const _mp=r=>!proyFiltro||r.proy===proyFiltro||(!r.proy&&p.proy===proyFiltro);
    const dayCells=dayNums.map(d=>{const fecha=`${y}-${pad(m)}-${pad(d)}`;const rec=DB.tareaje.find(r=>r.personalId===p.id&&r.fecha===fecha&&_mp(r));return rec?rec.tipo:'';});
    const ct=t=>DB.tareaje.filter(r=>r.personalId===p.id&&r.fecha.startsWith(monthStr)&&r.tipo===t&&_mp(r)).length;
    const otros=['DM','LP','LM','LF','V','DLT','A5','R'].reduce((s,t)=>s+ct(t),0);
    return[idx+1,p.dni||'',`${p.ape}, ${p.nom}`,p.cargo||'',...dayCells,ct('TD'),ct('TN'),ct('DL'),ct('F'),ct('P'),ct('DM'),otros];
  });
  const titulo=[`TAREAJE DE PERSONAL – ${mesNombre} ${y}  |  Proyecto: ${proyNombre}  |  Generado: ${new Date().toLocaleString('es-PE')}`];
  const wsData=[titulo,[],headers,...dataRows];
  const ws=XLSX.utils.aoa_to_sheet(wsData);
  ws['!merges']=[{s:{r:0,c:0},e:{r:0,c:headers.length-1}}];
  ws['!cols']=[{wch:4},{wch:12},{wch:32},{wch:22},...Array(days).fill({wch:4}),{wch:4},{wch:4},{wch:4},{wch:4},{wch:4},{wch:4},{wch:5}];
  ws['!rows']=[{hpt:20},{hpt:4},...Array(dataRows.length+1).fill({hpt:14})];
  // Estilo título (fila 0)
  const tc=ws[addr(0,0)];
  if(tc)tc.s={fill:{patternType:'solid',fgColor:{rgb:'1E3A5F'}},font:{bold:true,color:{rgb:'FFFFFF'},sz:11},alignment:{horizontal:'center',vertical:'center'}};
  // Estilo encabezados (fila 2)
  headers.forEach((_,ci)=>{const c=ws[addr(2,ci)];if(c)c.s=_hdrS;});
  // Filas de datos (desde fila 3)
  dataRows.forEach((row,ri)=>{
    const er=3+ri,even=ri%2===0;
    // columnas fijas
    for(let ci=0;ci<4;ci++){const c=ws[addr(er,ci)];if(c){c.s=_fixS(even);if(ci===2||ci===3)c.s.alignment={...c.s.alignment,horizontal:'left'};}}
    // celdas de días
    dayNums.forEach((_,di)=>{
      const ci=4+di;
      let c=ws[addr(er,ci)];
      const tipo=c?c.v:'';
      if(!c){ws[addr(er,ci)]=c={t:'s',v:''};}
      if(tipo&&_BG[tipo]){c.s={fill:{patternType:'solid',fgColor:{rgb:_BG[tipo]}},font:{bold:true,color:{rgb:_FG[tipo]},sz:8},alignment:{horizontal:'center',vertical:'center'}};}
      else{c.s=_emptyS(even);}
    });
    // columnas de totales
    for(let ci=4+days;ci<4+days+7;ci++){const c=ws[addr(er,ci)];if(c)c.s=_totS;}
  });
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,`Tareaje ${mesNombre} ${y}`.substring(0,31));
  XLSX.writeFile(wb,`Tareaje_${monthStr}_${proyFiltro||'TODOS'}.xlsx`);
  toast('✓ Excel con colores descargado');
}

// ── RESUMEN DIARIO DE TAREAJE ──
function _buildTareResumen(ids){
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
  const tiposPresentes=_COL_ORDER.filter(t=>_tiposSet.has(t));
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
  // KPIs
  const kpiEl=document.getElementById(ids.kpis);
  if(kpiEl)kpiEl.innerHTML=[
    {l:'Total Personal',v:totalPersonas,c:'var(--mec)',ic:'👷'},
    ...tiposPresentes.map(t=>({l:_TARE_T[t]?.l||t,v:totalGral[t]||0,c:_TARE_T[t]?.bg||'#666',ic:t}))
  ].map(k=>`<div style="background:var(--panel2);border:1px solid var(--border);border-bottom:3px solid ${k.c};border-radius:8px;padding:.5rem .9rem;flex:1;min-width:90px">
    <div style="font-size:.58rem;text-transform:uppercase;letter-spacing:.08em;color:var(--muted2);margin-bottom:.2rem">${k.ic} ${k.l}</div>
    <div style="font-size:1.5rem;font-weight:700;color:${k.c}">${k.v}</div>
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
      <th style="${thS};background:#dc2626;color:#fff">Total<br>general</th>
    </tr></thead><tbody>`;
    ['OBRERO','STAFF'].filter(g=>grupos[g]).forEach(g=>{
      const tot=grupoTotales[g];
      const totG=tiposPresentes.reduce((s,t)=>s+(tot[t]||0),0);
      html+=`<tr style="background:rgba(30,58,95,.18)"><td style="${tdS};font-weight:700;letter-spacing:.04em">${g}</td>
        ${tiposPresentes.map(t=>`<td style="${tdS};text-align:center;font-weight:700">${tot[t]||''}</td>`).join('')}
        <td style="${tdS};text-align:center;font-weight:700;color:#dc2626">${totG}</td></tr>`;
      Object.keys(grupos[g]).sort().forEach(cargo=>{
        const cc=grupos[g][cargo];
        const totC=tiposPresentes.reduce((s,t)=>s+(cc[t]||0),0);
        html+=`<tr><td style="${tdS};padding-left:1.6rem;color:var(--muted2);font-size:.73rem">${cargo}</td>
          ${tiposPresentes.map(t=>`<td style="${tdS};text-align:center">${cc[t]||''}</td>`).join('')}
          <td style="${tdS};text-align:center;color:#10b981;font-weight:600">${totC}</td></tr>`;
      });
    });
    const grandTotal=tiposPresentes.reduce((s,t)=>s+(totalGral[t]||0),0);
    html+=`<tr style="background:rgba(220,38,38,.12)"><td style="${tdS};font-weight:700;color:#dc2626">Total general</td>
      ${tiposPresentes.map(t=>`<td style="${tdS};text-align:center;font-weight:700;color:#dc2626">${totalGral[t]||''}</td>`).join('')}
      <td style="${tdS};text-align:center;font-weight:700;color:#dc2626">${grandTotal}</td></tr>`;
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
  return {fecha,proy,guardia,tiposPresentes,totalGral,totalPersonas};
}
function _printTareResumen(ids){
  const state=_buildTareResumen(ids);
  const fecha=state.fecha,proy=state.proy,guardia=state.guardia;
  const tablaEl=document.getElementById(ids.tabla);
  const tableHTML=tablaEl?tablaEl.innerHTML:'';
  const kpisEl=document.getElementById(ids.kpis);
  const kpisHTML=kpisEl?kpisEl.innerHTML:'';
  const proyNombre=proy?(DB.proyectos.find(p=>p.codigo===proy)?.nombre||proy):'— Todos —';
  const _logoUrl=window.location.href.replace(/[^\/\\]+$/,'')+'09.-ERP/Imagenes/ECOSERMO-LOGO.png';
  const fechaFmt=fecha?new Date(fecha+'T12:00:00').toLocaleDateString('es-PE',{weekday:'long',year:'numeric',month:'long',day:'numeric'}):'';
  const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Resumen Tareaje ${fecha}</title>
  <style>@page{size:A4 portrait;margin:.8cm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:9px;color:#111;margin:0}
  table{width:100%;border-collapse:collapse}th,td{border:1px solid #e2e8f0;padding:5px 7px}
  .kpis{display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap}
  @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body>
  <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #1e3a5f;padding-bottom:6px;margin-bottom:10px">
    <img src="${_logoUrl}" alt="Ecosermo" style="height:42px;object-fit:contain">
    <div style="text-align:center"><div style="font-size:13px;font-weight:900;color:#1e3a5f">RESUMEN DIARIO DE TAREAJE</div>
    <div style="font-size:8.5px;color:#64748b;text-transform:capitalize">${fechaFmt}</div></div>
    <div style="text-align:right;font-size:7.5px;color:#64748b">
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
// Página completa
function rTareResumenPg(){
  const fEl=document.getElementById('tarPgFecha');
  if(fEl&&!fEl.value)fEl.value=today();
  const ps=document.getElementById('tarPgProy');
  if(ps){const cur=ps.value;ps.innerHTML='<option value="">— Todos los proyectos —</option>'+(DB.proyectos||[]).map(p=>`<option value="${p.codigo}">[${p.codigo}] ${p.nombre}</option>`).join('');if(cur)ps.value=cur;}
  _buildTareResumen({fecha:'tarPgFecha',proy:'tarPgProy',guardia:'tarPgGuardia',kpis:'tarPgKpis',tabla:'tarPgTabla',chart:'tarPgChart'});
}
function printTareResumenPg(){_printTareResumen({fecha:'tarPgFecha',proy:'tarPgProy',guardia:'tarPgGuardia',kpis:'tarPgKpis',tabla:'tarPgTabla',chart:'tarPgChart'});}

