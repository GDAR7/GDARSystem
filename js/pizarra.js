// ══ PIZARRA DE DESPLIEGUE ══
function _pizImgUrl(){return window.location.href.replace(/[^\/\\]+$/,'')+'09.-ERP/Imagenes/R3_2026_IMAGEN.png';}
let _pizTab=1,_pizMoving=null,_pizFecha=null;
function _pizGetFecha(){return _pizFecha||today();}

function rPizarra(){_pizRenderTab();}

function _pizTabSwitch(n){
  _pizTab=n;
  document.querySelectorAll('.piz-tab').forEach((b,i)=>b.classList.toggle('active',i+1===n));
  _pizRenderTab();
}

function _pizRenderTab(){
  const c=document.getElementById('pizBody');if(!c)return;
  if(_pizTab===1)_pizRenderPlan(c);else _pizRenderReal(c);
}

function _pizEqIcon(sub){
  const s=(sub||'').toLowerCase();
  if(s.includes('volquete'))return'🚛';
  if(s.includes('cistern'))return'💧';
  if(s.includes('motoniveladora'))return'🛤️';
  if(s.includes('excavadora'))return'⛏️';
  if(s.includes('rodillo'))return'🔄';
  if(s.includes('cargador'))return'🪣';
  if(s.includes('tractor')||s.includes('dozer'))return'🚜';
  if(s.includes('grúa')||s.includes('grua'))return'🏗️';
  return'🚧';
}

function _pizCondColor(cond){
  const c=(cond||'').toUpperCase();
  if(c.includes('OPERATIVO'))return'#10b981';
  if(c.includes('STANDBY'))return'#f59e0b';
  return'#ef4444';
}

// ── VISTA 1: PLANIFICACIÓN (drag & drop) ───────────────────────────────────
function _pizRenderPlan(c){
  const items=(DB.pizarraItems||[]).filter(x=>x.tab==='plan');
  const equipos=(DB.equipos||[]).filter(e=>e.est!=='Baja');
  const frentes=DB.frentesTrabajo||[];

  const markers=items.map(item=>{
    const col=item.color||'#10b981';
    const ic={equipo:'🚜',personal:'👷',frente:'📍',nota:'📝'}[item.tipo]||'📌';
    return`<div id="piz-m-${item.id}"
      style="position:absolute;left:${item.x}%;top:${item.y}%;transform:translate(-50%,-100%);cursor:grab;z-index:10;user-select:none"
      onmousedown="_pizMousedown(event,${item.id})">
      <div style="background:${col};color:#fff;border-radius:6px;padding:2px 8px;font-size:.65rem;font-weight:700;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.55);display:flex;align-items:center;gap:3px">
        ${ic} ${item.etiqueta}
        <span onclick="event.stopPropagation();_pizRemoveItem(${item.id})" style="margin-left:3px;cursor:pointer;opacity:.7;line-height:1">✕</span>
      </div>
      <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:7px solid ${col};margin:0 auto"></div>
    </div>`;
  }).join('');

  c.innerHTML=`<div style="display:grid;grid-template-columns:185px 1fr;gap:.7rem;height:calc(100vh - 195px)">

    <!-- SIDEBAR -->
    <div style="overflow-y:auto;border:1px solid var(--border);border-radius:8px;padding:.5rem;background:var(--panel2)">
      <div style="font-size:.6rem;letter-spacing:.1em;color:var(--muted2);font-weight:700;text-transform:uppercase;margin-bottom:.5rem">Arrastra al mapa →</div>

      <div style="font-size:.68rem;color:#06b6d4;font-weight:700;margin-bottom:.3rem">🚜 Equipos</div>
      ${equipos.map(e=>`<div draggable="true"
        ondragstart="_pizDragStart(event,'equipo',${e.id},'${(e.codigo||'').replace(/'/g,"\\'")}','#06b6d4')"
        style="cursor:grab;padding:.2rem .4rem;margin-bottom:.18rem;background:rgba(6,182,212,.08);border:1px solid rgba(6,182,212,.2);border-radius:5px;font-size:.67rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"
        title="${e.codigo} – ${e.nombre||''}">
        ${_pizEqIcon(e.sub)} ${e.codigo}
      </div>`).join('')}

      <div style="font-size:.68rem;color:#f59e0b;font-weight:700;margin:.6rem 0 .3rem">📍 Frentes</div>
      ${frentes.map(f=>{const nom=(f.nombre||f.nom||f.frente||'');return`<div draggable="true"
        ondragstart="_pizDragStart(event,'frente',${f.id},'${nom.replace(/'/g,"\\'")}','#f59e0b')"
        style="cursor:grab;padding:.2rem .4rem;margin-bottom:.18rem;background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.2);border-radius:5px;font-size:.67rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"
        title="${nom}">
        📍 ${nom.slice(0,22)}
      </div>`;}).join('')}

      <div style="font-size:.68rem;color:#8b5cf6;font-weight:700;margin:.6rem 0 .3rem">📝 Anotaciones</div>
      <button onclick="_pizAgregarNota()" style="width:100%;background:rgba(139,92,246,.1);border:1px dashed rgba(139,92,246,.4);border-radius:5px;color:#8b5cf6;cursor:pointer;padding:.3rem;font-size:.67rem">＋ Nota libre</button>

      <hr style="border-color:var(--border);margin:.7rem 0">
      <button onclick="_pizLimpiar()" style="width:100%;background:rgba(239,68,68,.07);border:1px solid rgba(239,68,68,.25);border-radius:5px;color:#ef4444;cursor:pointer;padding:.3rem;font-size:.65rem">🗑 Limpiar mapa</button>
    </div>

    <!-- MAPA -->
    <div id="pizMapWrap" style="position:relative;overflow:hidden;border-radius:8px;border:1px solid var(--border);background:#0a0a0a"
      ondragover="event.preventDefault()"
      ondrop="_pizDrop(event)">
      <img src="${_pizImgUrl()}" style="width:100%;height:100%;object-fit:cover;display:block;pointer-events:none;user-select:none" draggable="false">
      ${markers}
      ${!items.length?`<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none">
        <div style="background:rgba(0,0,0,.6);color:#fff;border-radius:8px;padding:.8rem 1.4rem;font-size:.75rem;text-align:center;backdrop-filter:blur(4px)">
          Arrastra equipos o frentes al mapa<br>
          <span style="font-size:.65rem;opacity:.6">Las posiciones se guardan automáticamente</span>
        </div></div>`:''}
    </div>
  </div>`;
}

// ── VISTA 2: ESTADO REAL (desde partes de la fecha seleccionada) ───────────
function _pizRenderReal(c){
  const fecha=_pizGetFecha();
  const partesFecha=(DB.partes||[]).filter(p=>p.fecha===fecha);
  const pizEq=(DB.pizarraItems||[]).filter(x=>x.tab==='plan'&&x.tipo==='equipo');
  const pizFt=(DB.pizarraItems||[]).filter(x=>x.tab==='plan'&&x.tipo==='frente');

  // Contador de slot por frente (para escalonar equipos sin taparse)
  const _ftSlot={};
  function _resolvePos(p){
    // 1° posición manual del equipo
    const manual=pizEq.find(i=>i.refId===p.eqId);
    if(manual)return{x:manual.x,y:manual.y,auto:false};
    // 2° auto: posición del frente registrado en el parte
    const nomFt=(p.frenteT||'').trim();
    if(!nomFt)return null;
    const ft=(DB.frentesTrabajo||[]).find(f=>(f.nombre||f.nom||f.frente||'').trim()===nomFt);
    if(!ft)return null;
    const fpos=pizFt.find(i=>i.refId===ft.id);
    if(!fpos)return null;
    const totalFt=partesFecha.filter(px=>(px.frenteT||'').trim()===nomFt).length;
    const slot=_ftSlot[ft.id]||0;_ftSlot[ft.id]=slot+1;
    const offsetX=(slot-(totalFt-1)/2)*3;
    return{x:fpos.x+offsetX,y:fpos.y+5,auto:true};
  }

  const ops=partesFecha.filter(p=>(p.condicion||'').toUpperCase().includes('OPERATIVO')).length;
  const stdby=partesFecha.filter(p=>(p.condicion||'').toUpperCase()==='STANDBY').length;
  const inop=partesFecha.length-ops-stdby;

  // Pre-calcular posiciones para saber quiénes quedan sin ubicar
  const posCache=new Map();
  partesFecha.forEach(p=>{posCache.set(p.eqId,_resolvePos(p));});
  // Resetear slots para el render real
  Object.keys(_ftSlot).forEach(k=>delete _ftSlot[k]);

  const eqMarkers=partesFecha.map(p=>{
    const eq=(DB.equipos||[]).find(e=>e.id===p.eqId);if(!eq)return'';
    const pos=_resolvePos(p);if(!pos)return'';
    const col=_pizCondColor(p.condicion);
    return`<div style="position:absolute;left:${pos.x}%;top:${pos.y}%;transform:translate(-50%,-100%);cursor:pointer;z-index:10"
      title="${pos.auto?'Auto: '+p.frenteT:eq.codigo}"
      onclick="_pizPopup(${p.eqId},'${fecha}')">
      <div style="background:${col};color:#fff;border-radius:6px;padding:2px 8px;font-size:.65rem;font-weight:700;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.6);display:flex;align-items:center;gap:3px">
        ${_pizEqIcon(eq.sub)} ${eq.codigo}${pos.auto?'<span style="font-size:.55rem;opacity:.75"> ⚙</span>':''}
      </div>
      <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:7px solid ${col};margin:0 auto"></div>
    </div>`;
  }).join('');

  const ftMarkers=pizFt.map(fi=>{
    const ft=(DB.frentesTrabajo||[]).find(f=>f.id===fi.refId);
    const lbl=ft?(ft.nombre||ft.nom||ft.frente||fi.etiqueta):fi.etiqueta;
    return`<div style="position:absolute;left:${fi.x}%;top:${fi.y}%;transform:translate(-50%,-100%);z-index:8">
      <div style="background:rgba(245,158,11,.85);color:#fff;border-radius:5px;padding:2px 7px;font-size:.62rem;font-weight:700;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.4)">
        📍 ${lbl}
      </div>
      <div style="width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;border-top:6px solid rgba(245,158,11,.85);margin:0 auto"></div>
    </div>`;
  }).join('');

  const sinPos=partesFecha.filter(p=>!posCache.get(p.eqId));

  c.innerHTML=`
  <!-- SELECTOR DE FECHA + STATS -->
  <div style="display:flex;align-items:center;gap:.6rem;margin-bottom:.6rem;flex-wrap:wrap">
    <label style="font-size:.72rem;color:var(--muted2);font-weight:700">📅 Fecha:</label>
    <input type="date" value="${fecha}"
      style="background:var(--panel2);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:.2rem .5rem;font-size:.75rem;font-family:'Barlow',sans-serif;cursor:pointer"
      onchange="_pizFecha=this.value;_pizRenderTab()">
    <span style="font-size:.7rem;color:var(--muted2)">${partesFecha.length} parte(s)</span>
    <span style="background:rgba(16,185,129,.15);color:#10b981;border:1px solid #10b98130;border-radius:5px;padding:2px 9px;font-size:.7rem;font-weight:700">● ${ops} Operativo</span>
    <span style="background:rgba(245,158,11,.15);color:#f59e0b;border:1px solid #f59e0b30;border-radius:5px;padding:2px 9px;font-size:.7rem;font-weight:700">● ${stdby} Standby</span>
    <span style="background:rgba(239,68,68,.15);color:#ef4444;border:1px solid #ef444430;border-radius:5px;padding:2px 9px;font-size:.7rem;font-weight:700">● ${inop} Inoperativo</span>
    ${sinPos.length?`<span style="font-size:.65rem;color:var(--muted2)">· ${sinPos.length} sin ubicar</span>`:''}
    <span style="margin-left:auto;font-size:.6rem;color:var(--muted2)">⚙ = posición por frente</span>
  </div>

  <div style="display:grid;grid-template-columns:1fr${sinPos.length?' 165px':''};gap:.7rem;height:calc(100vh - 240px)">
    <div style="position:relative;overflow:hidden;border-radius:8px;border:1px solid var(--border);background:#0a0a0a">
      <img src="${_pizImgUrl()}" style="width:100%;height:100%;object-fit:cover;display:block;pointer-events:none" draggable="false">
      ${ftMarkers}${eqMarkers}
      ${!partesFecha.length?`<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">
        <div style="background:rgba(0,0,0,.6);color:#fff;border-radius:8px;padding:.8rem 1.4rem;font-size:.78rem;text-align:center">
          No hay partes registrados para ${fecha}
        </div></div>`:''}
    </div>

    ${sinPos.length?`<div style="overflow-y:auto;border:1px solid var(--border);border-radius:8px;padding:.5rem;background:var(--panel2)">
      <div style="font-size:.62rem;color:#ef4444;font-weight:700;text-transform:uppercase;margin-bottom:.3rem">Sin ubicar (${sinPos.length})</div>
      <div style="font-size:.6rem;color:var(--muted2);margin-bottom:.4rem;line-height:1.3">Frente no posicionado en el mapa</div>
      ${sinPos.map(p=>{
        const eq=(DB.equipos||[]).find(e=>e.id===p.eqId);if(!eq)return'';
        const col=_pizCondColor(p.condicion);
        return`<div style="padding:.3rem .4rem;margin-bottom:.25rem;border-left:3px solid ${col};background:rgba(255,255,255,.02);border-radius:0 5px 5px 0;font-size:.67rem;cursor:pointer" onclick="_pizPopup(${p.eqId},'${fecha}')">
          ${_pizEqIcon(eq.sub)} <strong>${eq.codigo}</strong><br>
          <span style="color:${col};font-size:.62rem">${p.condicion||'—'}</span><br>
          <span style="color:var(--muted2);font-size:.6rem">${p.frenteT||'Sin frente'}</span>
        </div>`;
      }).join('')}
      <div style="font-size:.6rem;color:var(--muted2);margin-top:.5rem;border-top:1px solid var(--border);padding-top:.4rem">Ubica el frente en la pestaña Planificación</div>
    </div>`:''}
  </div>

  <div id="pizPopup" style="display:none;position:fixed;inset:0;z-index:998;align-items:center;justify-content:center" onclick="this.style.display='none'">
    <div style="background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:1rem 1.2rem;min-width:250px;max-width:320px;box-shadow:0 8px 30px rgba(0,0,0,.5)" onclick="event.stopPropagation()">
      <div id="pizPopupBody"></div>
      <button onclick="document.getElementById('pizPopup').style.display='none'" style="margin-top:.7rem;width:100%;background:none;border:1px solid var(--border);border-radius:6px;color:var(--muted2);cursor:pointer;padding:.3rem;font-size:.72rem">Cerrar</button>
    </div>
  </div>`;
}

// ── Drag desde sidebar ──────────────────────────────────────────────────────
function _pizDragStart(e,tipo,refId,label,color){
  e.dataTransfer.setData('piz_tipo',tipo);
  e.dataTransfer.setData('piz_refId',String(refId));
  e.dataTransfer.setData('piz_label',label);
  e.dataTransfer.setData('piz_color',color);
}

function _pizDrop(e){
  e.preventDefault();
  const tipo=e.dataTransfer.getData('piz_tipo');if(!tipo)return;
  const refId=+e.dataTransfer.getData('piz_refId')||0;
  const label=e.dataTransfer.getData('piz_label');
  const color=e.dataTransfer.getData('piz_color')||'#10b981';
  const map=document.getElementById('pizMapWrap');if(!map)return;
  const rect=map.getBoundingClientRect();
  const x=+((e.clientX-rect.left)/rect.width*100).toFixed(1);
  const y=+((e.clientY-rect.top)/rect.height*100).toFixed(1);
  // Actualizar posición si ya existe
  const existing=(DB.pizarraItems||[]).find(i=>i.tipo===tipo&&i.refId===refId&&i.tab==='plan');
  if(existing){existing.x=x;existing.y=y;syncSheet('savePizItem',existing);_pizRenderTab();return;}
  const rec={id:nid('piz'),tipo,refId,etiqueta:label,x,y,color,tab:'plan'};
  DB.pizarraItems.push(rec);
  syncSheet('savePizItem',rec);
  _pizRenderTab();
}

// ── Arrastrar markers sobre el mapa ────────────────────────────────────────
function _pizMousedown(e,id){
  e.preventDefault();e.stopPropagation();
  _pizMoving={id};
  document.addEventListener('mousemove',_pizMousemove);
  document.addEventListener('mouseup',_pizMouseup);
}
function _pizMousemove(e){
  if(!_pizMoving)return;
  const map=document.getElementById('pizMapWrap');if(!map)return;
  const rect=map.getBoundingClientRect();
  const x=Math.max(1,Math.min(99,(e.clientX-rect.left)/rect.width*100));
  const y=Math.max(1,Math.min(99,(e.clientY-rect.top)/rect.height*100));
  const el=document.getElementById('piz-m-'+_pizMoving.id);
  if(el){el.style.left=x+'%';el.style.top=y+'%';}
}
function _pizMouseup(e){
  if(!_pizMoving)return;
  document.removeEventListener('mousemove',_pizMousemove);
  document.removeEventListener('mouseup',_pizMouseup);
  const map=document.getElementById('pizMapWrap');
  if(map){
    const rect=map.getBoundingClientRect();
    const x=+(Math.max(1,Math.min(99,(e.clientX-rect.left)/rect.width*100)).toFixed(1));
    const y=+(Math.max(1,Math.min(99,(e.clientY-rect.top)/rect.height*100)).toFixed(1));
    const item=(DB.pizarraItems||[]).find(i=>i.id===_pizMoving.id);
    if(item){item.x=x;item.y=y;syncSheet('savePizItem',item);}
  }
  _pizMoving=null;
}

// ── Acciones ────────────────────────────────────────────────────────────────
function _pizRemoveItem(id){
  DB.pizarraItems=(DB.pizarraItems||[]).filter(i=>i.id!==id);
  supaDelete('pizarraItems',id);
  _pizRenderTab();
}

function _pizLimpiar(){
  if(!confirm('¿Limpiar todos los elementos del mapa de planificación?'))return;
  (DB.pizarraItems||[]).forEach(i=>supaDelete('pizarraItems',i.id));
  DB.pizarraItems=[];
  _pizRenderTab();
}

function _pizAgregarNota(){
  const txt=(prompt('Texto de la anotación:','')||'').trim();
  if(!txt)return;
  const rec={id:nid('piz'),tipo:'nota',refId:0,etiqueta:txt,x:50,y:40,color:'#8b5cf6',tab:'plan'};
  DB.pizarraItems.push(rec);
  syncSheet('savePizItem',rec);
  _pizRenderTab();
}

function _pizPopup(eqId,fecha){
  const f=fecha||_pizGetFecha();
  const p=(DB.partes||[]).find(x=>x.eqId===eqId&&x.fecha===f);
  const eq=(DB.equipos||[]).find(e=>e.id===eqId);
  if(!p||!eq)return;
  const col=_pizCondColor(p.condicion);
  document.getElementById('pizPopupBody').innerHTML=`
    <div style="font-size:.8rem;font-weight:700;color:${col};margin-bottom:.35rem">${eq.codigo} – ${eq.nombre||''}</div>
    <div style="font-size:.68rem;color:var(--muted2);margin-bottom:.5rem">${p.fecha} · Turno ${p.turno||'—'} · Guardia ${p.guardia||'—'}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:.3rem;font-size:.7rem">
      <div><span style="color:var(--muted2)">Condición</span><br><strong style="color:${col}">${p.condicion||'—'}</strong></div>
      <div><span style="color:var(--muted2)">Operador</span><br><strong>${p.op||'—'}</strong></div>
      <div><span style="color:var(--muted2)">Hr. Ini / Fin</span><br>${p.hrIni||0} / ${p.hrFin||0}</div>
      <div><span style="color:var(--muted2)">Hs. Trabajadas</span><br>${p.ef||0} h</div>
      ${p.frenteT?`<div style="grid-column:1/-1"><span style="color:var(--muted2)">Frente</span><br>${p.frenteT}</div>`:''}
      ${p.act?`<div style="grid-column:1/-1;border-top:1px solid var(--border);padding-top:.3rem;margin-top:.2rem"><span style="color:var(--muted2)">Actividades</span><br><span style="font-size:.68rem">${p.act}</span></div>`:''}
    </div>`;
  document.getElementById('pizPopup').style.display='flex';
}
