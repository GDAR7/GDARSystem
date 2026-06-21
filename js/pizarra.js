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
  if(_pizTab===1)_pizRenderPlan(c);
  else if(_pizTab===2)_pizRenderReal(c);
  else _pizRenderRutas(c);
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

// ══ TAB 3: RUTAS ══
let _rutaSelId=null, _rutaDibujando=false, _rutaPuntos=[], _rutaModoCalor=false, _rutaColors=[
  '#f59e0b','#10b981','#ef4444','#8b5cf6','#06b6d4','#f97316','#ec4899','#84cc16','#0ea5e9','#a78bfa'
];
let _rutaZoom=1, _rutaPanX=0, _rutaPanY=0, _rutaIsPanning=false, _rutaPanStart=null, _rutaDidPan=false;

function _pizRenderRutas(c){
  const tramos=(DB.tramos||[]).sort((a,b)=>(a.codigo||'').localeCompare(b.codigo||''));
  const hoy=today();
  const mesIni=hoy.slice(0,7)+'-01';
  c.innerHTML=`
  <div style="margin-bottom:.5rem;display:flex;align-items:center;gap:.4rem;flex-wrap:nowrap;overflow-x:auto">
    <span style="font-size:.6rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.08em;white-space:nowrap">Período:</span>
    <input type="date" id="rutaFechaD" value="${mesIni}" onchange="_rutaRefresh()" style="font-size:.72rem;padding:.2rem .4rem;border-radius:5px;border:1px solid #f59e0b55;background:var(--panel2);color:var(--text)">
    <span style="color:var(--muted2);font-size:.7rem">→</span>
    <input type="date" id="rutaFechaH" value="${hoy}" onchange="_rutaRefresh()" style="font-size:.72rem;padding:.2rem .4rem;border-radius:5px;border:1px solid #f59e0b55;background:var(--panel2);color:var(--text)">
    <select id="rutaFiltSub" onchange="_rutaRefresh()" style="font-size:.72rem;padding:.2rem .4rem;border-radius:5px;border:1px solid #06b6d455;background:var(--panel2);color:var(--text)">
      <option value="">— Todos los tipos —</option>
      <option value="VOLQUETE">Volquete</option>
      <option value="CISTERNA">Cisterna</option>
      <option value="MOTONIVELADORA">Motoniveladora</option>
      <option value="RODILLO">Rodillo</option>
      <option value="TRACTOR DE ORUGAS">Tractor</option>
    </select>
    <div style="width:1px;height:18px;background:var(--border);flex-shrink:0"></div>
    <button id="rutaBtnCalor" onclick="_rutaToggleCalor()" style="font-size:.7rem;padding:.2rem .6rem;border-radius:5px;border:1px solid #ef444460;background:${_rutaModoCalor?'rgba(239,68,68,.2)':'rgba(239,68,68,.07)'};color:${_rutaModoCalor?'#ef4444':'#888'};cursor:pointer;white-space:nowrap;flex-shrink:0">🌡️ ${_rutaModoCalor?'Calor ON':'Calor OFF'}</button>
    <div id="rutaLegenda" style="display:${_rutaModoCalor?'flex':'none'};align-items:center;gap:.3rem;flex-shrink:0">
      <span style="font-size:.58rem;color:var(--muted2)">Poco</span>
      <div style="width:50px;height:7px;border-radius:3px;background:linear-gradient(to right,#3b82f6,#10b981,#f59e0b,#ef4444)"></div>
      <span style="font-size:.58rem;color:var(--muted2)">Mucho</span>
    </div>
    <div style="width:1px;height:18px;background:var(--border);flex-shrink:0"></div>
    <button id="rutaBtnDraw" onclick="_rutaToggleDraw()" style="font-size:.7rem;padding:.2rem .6rem;border-radius:5px;border:1px solid #10b98140;background:rgba(16,185,129,.1);color:#10b981;cursor:pointer;white-space:nowrap;flex-shrink:0">✏️ Dibujar</button>
    <button id="rutaBtnBorrar" onclick="_rutaBorrar()" style="font-size:.7rem;padding:.2rem .6rem;border-radius:5px;border:1px solid #ef444440;background:rgba(239,68,68,.07);color:#ef4444;cursor:pointer;white-space:nowrap;flex-shrink:0">🗑 Borrar</button>
    <div id="rutaHint" style="font-size:.6rem;color:var(--muted2);white-space:nowrap"></div>
  </div>
  <div style="display:grid;grid-template-columns:200px 1fr;gap:.7rem;height:calc(100vh - 230px)">
    <!-- SIDEBAR RUTAS -->
    <div style="overflow-y:auto;border:1px solid var(--border);border-radius:8px;padding:.5rem;background:var(--panel2);display:flex;flex-direction:column;gap:.3rem">
      <div style="font-size:.6rem;letter-spacing:.1em;color:var(--muted2);font-weight:700;text-transform:uppercase;margin-bottom:.3rem">Tramos / Rutas</div>
      ${tramos.length?tramos.map((t,i)=>{
        const col=_rutaColors[i%_rutaColors.length];
        const pts=(t.puntos||[]).length;
        return`<div id="ruta-item-${t.id}" onclick="_rutaSelect(${t.id})"
          style="cursor:pointer;padding:.35rem .5rem;border-radius:6px;border:2px solid ${col}30;background:${col}10;transition:.15s"
          onmouseover="this.style.background='${col}22'" onmouseout="this.style.background='${col}10'">
          <div style="display:flex;align-items:center;gap:.4rem">
            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${col};flex-shrink:0"></span>
            <span style="font-size:.68rem;font-weight:700;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.codigo||'Sin código'}</span>
          </div>
          <div style="font-size:.58rem;color:var(--muted2);margin-top:2px;padding-left:14px">${t.inicio||''}${t.fin?' → '+t.fin:''}</div>
          <div id="ruta-stat-${t.id}" style="font-size:.56rem;color:${pts?col:'var(--muted2)'};padding-left:14px;margin-top:1px">${pts?pts+' puntos':'Sin trazar'}</div>
        </div>`;
      }).join(''):'<div style="color:var(--muted2);font-size:.68rem;text-align:center;padding:1rem">Sin tramos definidos</div>'}
    </div>
    <!-- MAPA CON SVG + ZOOM/PAN -->
    <div style="position:relative;overflow:hidden;border-radius:8px;border:1px solid var(--border);background:#111" id="rutaMapWrap">
      <div id="rutaCanvas" style="position:relative;transform-origin:0 0;cursor:grab;display:inline-block;min-width:100%">
        <img src="${_pizImgUrl()}" id="rutaImg" style="display:block;width:100%;pointer-events:none;user-select:none" draggable="false">
        <svg id="rutaSvg" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible" xmlns="http://www.w3.org/2000/svg"></svg>
        <div id="rutaCursor" style="position:absolute;width:12px;height:12px;border-radius:50%;border:2px solid #fff;background:#10b981;display:none;pointer-events:none;transform:translate(-50%,-50%)"></div>
      </div>
      <!-- Controles zoom (overlay) -->
      <div style="position:absolute;bottom:.6rem;right:.6rem;display:flex;align-items:center;gap:.25rem;z-index:20;background:rgba(10,10,20,.75);border:1px solid #ffffff18;border-radius:7px;padding:.25rem .4rem;backdrop-filter:blur(6px)">
        <button onclick="_rutaZoomOut()" style="width:22px;height:22px;border-radius:4px;border:1px solid #ffffff20;background:#ffffff10;color:#e0e0e0;cursor:pointer;font-size:.9rem;line-height:1">−</button>
        <span id="rutaZoomPct" style="font-size:.65rem;color:#e0e0e0;min-width:36px;text-align:center;font-weight:700">100%</span>
        <button onclick="_rutaZoomIn()" style="width:22px;height:22px;border-radius:4px;border:1px solid #ffffff20;background:#ffffff10;color:#e0e0e0;cursor:pointer;font-size:.9rem;line-height:1">+</button>
        <div style="width:1px;height:14px;background:#ffffff20;margin:0 .1rem"></div>
        <button onclick="_rutaZoomReset()" title="Restablecer vista" style="padding:0 .35rem;height:22px;border-radius:4px;border:1px solid #ffffff20;background:#ffffff10;color:#e0e0e0;cursor:pointer;font-size:.65rem">↺ Fit</button>
      </div>
    </div>
  </div>`;

  // Bind eventos en el mapa
  const wrap=document.getElementById('rutaMapWrap');
  if(wrap){
    wrap.addEventListener('click',_rutaMapClick);
    wrap.addEventListener('dblclick',_rutaMapDblClick);
    wrap.addEventListener('mousemove',_rutaMouseMove);
    wrap.addEventListener('contextmenu',e=>{e.preventDefault();_rutaCancelarDraw();});
    wrap.addEventListener('wheel',_rutaOnWheel,{passive:false});
    wrap.addEventListener('mousedown',_rutaOnMousedown);
  }
  document.addEventListener('mousemove',_rutaOnGlobalMousemove);
  document.addEventListener('mouseup',_rutaOnGlobalMouseup);
  // Fit inicial: escala la imagen para llenar el contenedor
  requestAnimationFrame(()=>{_rutaFitView();_rutaRefresh();});
}

// ── ZOOM / PAN ──────────────────────────────────────────────────────────────
function _rutaApplyTransform(){
  const canvas=document.getElementById('rutaCanvas');if(!canvas)return;
  canvas.style.transform=`translate(${_rutaPanX}px,${_rutaPanY}px) scale(${_rutaZoom})`;
  const pct=document.getElementById('rutaZoomPct');if(pct)pct.textContent=Math.round(_rutaZoom*100)+'%';
}

function _rutaFitView(){
  const wrap=document.getElementById('rutaMapWrap');
  const canvas=document.getElementById('rutaCanvas');
  if(!wrap||!canvas)return;
  const img=document.getElementById('rutaImg');
  if(!img||!img.naturalWidth){setTimeout(_rutaFitView,200);return;}
  const wW=wrap.clientWidth, wH=wrap.clientHeight;
  const iW=img.naturalWidth, iH=img.naturalHeight;
  const scale=Math.min(wW/iW, wH/iH);
  _rutaZoom=scale;
  _rutaPanX=(wW-iW*scale)/2;
  _rutaPanY=(wH-iH*scale)/2;
  // Set canvas natural width = image natural width
  canvas.style.width=iW+'px';
  _rutaApplyTransform();
}

function _rutaZoomIn(){_rutaSetZoom(_rutaZoom*1.25);}
function _rutaZoomOut(){_rutaSetZoom(_rutaZoom/1.25);}
function _rutaZoomReset(){_rutaFitView();}
function _rutaSetZoom(z,cx,cy){
  const wrap=document.getElementById('rutaMapWrap');if(!wrap)return;
  const newZ=Math.max(0.1,Math.min(8,z));
  if(cx!==undefined&&cy!==undefined){
    _rutaPanX=cx-(cx-_rutaPanX)*(newZ/_rutaZoom);
    _rutaPanY=cy-(cy-_rutaPanY)*(newZ/_rutaZoom);
  }
  _rutaZoom=newZ;_rutaApplyTransform();
}

function _rutaOnWheel(e){
  e.preventDefault();
  const wrap=document.getElementById('rutaMapWrap');if(!wrap)return;
  const r=wrap.getBoundingClientRect();
  const cx=e.clientX-r.left, cy=e.clientY-r.top;
  _rutaSetZoom(_rutaZoom*(e.deltaY<0?1.12:0.89),cx,cy);
}

function _rutaOnMousedown(e){
  if(_rutaDibujando||e.button!==0)return;
  _rutaIsPanning=true;_rutaDidPan=false;
  _rutaPanStart={x:e.clientX-_rutaPanX,y:e.clientY-_rutaPanY};
  const canvas=document.getElementById('rutaCanvas');if(canvas)canvas.style.cursor='grabbing';
}
function _rutaOnGlobalMousemove(e){
  if(!_rutaIsPanning||!_rutaPanStart)return;
  const nx=e.clientX-_rutaPanStart.x, ny=e.clientY-_rutaPanStart.y;
  if(Math.abs(nx-_rutaPanX)>2||Math.abs(ny-_rutaPanY)>2)_rutaDidPan=true;
  _rutaPanX=nx;_rutaPanY=ny;_rutaApplyTransform();
}
function _rutaOnGlobalMouseup(){
  _rutaIsPanning=false;
  _rutaDidPan=false;
  const canvas=document.getElementById('rutaCanvas');if(canvas)canvas.style.cursor=_rutaDibujando?'crosshair':'grab';
}

function _rutaToggleCalor(){
  _rutaModoCalor=!_rutaModoCalor;
  _rutaRefresh();
}

function _rutaRefresh(){
  const svg=document.getElementById('rutaSvg');if(!svg)return;
  const tramos=(DB.tramos||[]).sort((a,b)=>(a.codigo||'').localeCompare(b.codigo||''));
  const fechaD=(document.getElementById('rutaFechaD')||{}).value||'';
  const fechaH=(document.getElementById('rutaFechaH')||{}).value||'';
  const subFilt=((document.getElementById('rutaFiltSub')||{}).value||'').toUpperCase();
  const heat=_rutaComputeHeat(fechaD,fechaH,subFilt);
  // Actualizar botón calor
  const btn=document.getElementById('rutaBtnCalor');
  const leg=document.getElementById('rutaLegenda');
  if(btn){btn.textContent=`🌡️ ${_rutaModoCalor?'Mapa de Calor ON':'Mapa de Calor OFF'}`;btn.style.background=_rutaModoCalor?'rgba(239,68,68,.2)':'rgba(239,68,68,.07)';btn.style.color=_rutaModoCalor?'#ef4444':'#888';}
  if(leg)leg.style.display=_rutaModoCalor?'flex':'none';
  // Actualizar stats en sidebar
  tramos.forEach((t,i)=>{
    const h=heat[t.id]||{viajes:0,nPartes:0,nEquipos:0};
    const el=document.getElementById(`ruta-stat-${t.id}`);
    if(el){
      const pts=(t.puntos||[]).length;
      if(_rutaModoCalor&&h.nPartes>0){
        const col=_rutaColors[i%_rutaColors.length];
        el.style.color=_rutaHeatColor(h.viajes,_rutaMaxViajes(heat));
        el.textContent=`${h.viajes} viajes · ${h.nPartes} partes · ${h.nEquipos} eq.`;
      }else{
        el.style.color=pts?_rutaColors[i%_rutaColors.length]:'var(--muted2)';
        el.textContent=pts?pts+' puntos':'Sin trazar';
      }
    }
  });
  _rutaRenderSvg(tramos,_rutaModoCalor?heat:null);
}

function _rutaMaxViajes(heat){
  const vals=Object.values(heat).map(h=>h.viajes||0);
  return vals.length?Math.max(...vals):1;
}

function _rutaComputeHeat(fechaD,fechaH,subFilt){
  const heat={};
  (DB.partes||[]).forEach(p=>{
    if(fechaD&&p.fecha<fechaD)return;
    if(fechaH&&p.fecha>fechaH)return;
    const eq=(DB.equipos||[]).find(e=>e.id===(p.eqId||p.eqId));
    if(subFilt&&(!eq||(eq.sub||'').toUpperCase()!==subFilt))return;
    const addHeat=(id,cant)=>{
      if(!id)return;
      if(!heat[id])heat[id]={viajes:0,nPartes:0,nEquipos:new Set()};
      heat[id].viajes+=cant;
      heat[id].nPartes++;
      if(eq)heat[id].nEquipos.add(eq.id);
    };
    // Viajes de volquetes (tramoId por viaje)
    if(Array.isArray(p.viajes)){
      p.viajes.forEach(v=>{if(v.tramoId)addHeat(v.tramoId,v.cant||1);});
    }
    // Parte-level tramoId (moto, rodillo, cisterna)
    if(p.tramoId)addHeat(p.tramoId,1);
  });
  // Convertir Set a count
  Object.values(heat).forEach(h=>{h.nEquipos=h.nEquipos.size;});
  return heat;
}

function _rutaHeatColor(viajes,max){
  if(!viajes||!max)return'#404040';
  const r=Math.min(viajes/max,1);
  // azul→verde→amarillo→rojo
  if(r<0.33){const t=r/0.33;return`rgb(${Math.round(59+t*(16-59))},${Math.round(130+t*(185-130))},${Math.round(246+t*(129-246))})`;}
  if(r<0.66){const t=(r-0.33)/0.33;return`rgb(${Math.round(16+t*(245-16))},${Math.round(185+t*(158-185))},${Math.round(129+t*(11-129))})`;}
  const t=(r-0.66)/0.34;return`rgb(${Math.round(245+t*(239-245))},${Math.round(158+t*(68-158))},${Math.round(11+t*(68-11))})`;
}

function _rutaRenderSvg(tramos,heat){
  const svg=document.getElementById('rutaSvg');if(!svg)return;
  const W=svg.clientWidth,H=svg.clientHeight;if(!W||!H)return;
  svg.querySelectorAll('.ruta-static').forEach(el=>el.remove());
  const sorted=(tramos||[]).sort((a,b)=>(a.codigo||'').localeCompare(b.codigo||''));
  const maxV=heat?_rutaMaxViajes(heat):1;
  sorted.forEach((t,i)=>{
    const pts=t.puntos||[];if(pts.length<2)return;
    const baseCol=_rutaColors[i%_rutaColors.length];
    const h=heat?(heat[t.id]||null):null;
    const col=heat?(h?_rutaHeatColor(h.viajes,maxV):'#2a3040'):baseCol;
    const opacity=heat?(h?'.95':'.3'):'.9';
    const strokeW=heat&&h?Math.max(3,Math.min(10,3+h.viajes/Math.max(maxV,1)*7)).toFixed(1):'3';
    const px=pts.map(p=>({x:(p.x*W/100),y:(p.y*H/100)}));
    const d='M '+px.map(p=>`${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L ');
    const mid=px[Math.floor(px.length/2)];
    const g=document.createElementNS('http://www.w3.org/2000/svg','g');
    g.classList.add('ruta-static');
    g.style.cursor='pointer';
    // Tooltip hover
    if(h){
      g.addEventListener('mouseenter',e=>{_rutaShowTooltip(e,t,h);});
      g.addEventListener('mouseleave',()=>{_rutaHideTooltip();});
    }
    // Sombra
    const shadow=document.createElementNS('http://www.w3.org/2000/svg','path');
    shadow.setAttribute('d',d);shadow.setAttribute('stroke','#000');
    shadow.setAttribute('stroke-width',String(+strokeW+3));
    shadow.setAttribute('fill','none');shadow.setAttribute('stroke-linecap','round');shadow.setAttribute('stroke-linejoin','round');shadow.setAttribute('opacity','.3');
    g.appendChild(shadow);
    // Línea principal
    const path=document.createElementNS('http://www.w3.org/2000/svg','path');
    path.setAttribute('d',d);path.setAttribute('stroke',col);path.setAttribute('stroke-width',strokeW);
    path.setAttribute('fill','none');path.setAttribute('stroke-linecap','round');path.setAttribute('stroke-linejoin','round');path.setAttribute('opacity',opacity);
    if(!heat&&t.estado!=='Completado')path.setAttribute('stroke-dasharray','12 5');
    g.appendChild(path);
    // Puntos inicio/fin
    [px[0],px[px.length-1]].forEach(p=>{
      const c=document.createElementNS('http://www.w3.org/2000/svg','circle');
      c.setAttribute('cx',p.x.toFixed(1));c.setAttribute('cy',p.y.toFixed(1));
      c.setAttribute('r','5');c.setAttribute('fill',col);c.setAttribute('stroke','#fff');c.setAttribute('stroke-width','1.5');c.setAttribute('opacity',opacity);
      g.appendChild(c);
    });
    // Etiqueta con fondo
    const lblX=mid.x.toFixed(1),lblY=(mid.y-10).toFixed(1);
    const txt=document.createElementNS('http://www.w3.org/2000/svg','text');
    txt.setAttribute('x',lblX);txt.setAttribute('y',lblY);
    txt.setAttribute('font-size','11');txt.setAttribute('font-weight','bold');txt.setAttribute('fill',col);
    txt.setAttribute('stroke','#000');txt.setAttribute('stroke-width','3');txt.setAttribute('paint-order','stroke');
    txt.setAttribute('dominant-baseline','auto');txt.setAttribute('text-anchor','middle');txt.setAttribute('font-family','monospace');
    const label=heat&&h?`${t.codigo} (${h.viajes}v)`:(t.codigo||'');
    txt.textContent=label;
    g.appendChild(txt);
    svg.appendChild(g);
  });
}

// Tooltip flotante para mapa de calor
function _rutaShowTooltip(e,t,h){
  let tip=document.getElementById('rutaTooltip');
  if(!tip){tip=document.createElement('div');tip.id='rutaTooltip';
    tip.style.cssText='position:fixed;background:#1a1f2a;border:1px solid #ffffff20;border-radius:8px;padding:.5rem .8rem;font-size:.7rem;color:#e0e0e0;pointer-events:none;z-index:9999;box-shadow:0 4px 16px #00000088;min-width:160px';
    document.body.appendChild(tip);}
  const eq=h.nEquipos,v=h.viajes,p=h.nPartes;
  tip.innerHTML=`<div style="font-weight:700;color:#f59e0b;margin-bottom:.3rem">${t.codigo}</div>
    <div style="color:var(--muted2)">${t.inicio||''}${t.fin?' → '+t.fin:''}</div>
    <hr style="border-color:#ffffff15;margin:.3rem 0">
    <div>🚛 <b>${v}</b> viajes registrados</div>
    <div>📋 <b>${p}</b> partes de trabajo</div>
    <div>🔧 <b>${eq}</b> equipo${eq!==1?'s':''} distintos</div>
    ${t.long?`<div>📏 Long: <b>${t.long} m</b></div>`:''}`;
  tip.style.left=(e.clientX+12)+'px';tip.style.top=(e.clientY-10)+'px';tip.style.display='block';
}
function _rutaHideTooltip(){const t=document.getElementById('rutaTooltip');if(t)t.style.display='none';}

function _rutaSelect(id){
  _rutaSelId=id;
  document.querySelectorAll('[id^="ruta-item-"]').forEach(el=>{
    el.style.outline=el.id===`ruta-item-${id}`?'2px solid #10b981':'none';
  });
  const tr=(DB.tramos||[]).find(t=>t.id===id);
  const hint=document.getElementById('rutaHint');
  if(hint)hint.textContent=tr?`✔ ${tr.codigo} seleccionado`:'';
  _rutaDibujando=false;_rutaPuntos=[];
  _rutaCancelarDraw(false);
}

function _rutaToggleDraw(){
  if(!_rutaSelId){toast('Selecciona un tramo primero',true);return;}
  _rutaDibujando=!_rutaDibujando;
  const btn=document.getElementById('rutaBtnDraw');
  const cur=document.getElementById('rutaCursor');
  const wrap=document.getElementById('rutaMapWrap');
  const hint=document.getElementById('rutaHint');
  const canvas=document.getElementById('rutaCanvas');
  _rutaDidPan=false;
  if(_rutaDibujando){
    const tr=(DB.tramos||[]).find(t=>t.id===_rutaSelId);
    _rutaPuntos=tr&&tr.puntos?[...tr.puntos]:[];
    if(btn){btn.textContent='✅ Terminar';btn.style.background='rgba(245,158,11,.15)';btn.style.color='#f59e0b';btn.style.borderColor='#f59e0b40';}
    if(cur){cur.style.display='block';}
    if(canvas){canvas.style.cursor='crosshair';}
    if(hint){hint.textContent='Clic=punto · Doble clic=guardar · Clic derecho=cancelar';}
  }else{
    _rutaGuardar();
  }
}

function _rutaMapClick(e){
  if(!_rutaDibujando||!_rutaSelId)return;
  if(e.detail>1)return;
  const canvas=document.getElementById('rutaCanvas');if(!canvas)return;
  const r=canvas.getBoundingClientRect();
  const x=parseFloat(((e.clientX-r.left)/r.width*100).toFixed(2));
  const y=parseFloat(((e.clientY-r.top)/r.height*100).toFixed(2));
  _rutaPuntos.push({x,y});
  _rutaRedibujarTemp();
}

function _rutaMapDblClick(e){
  if(!_rutaDibujando)return;
  e.preventDefault();
  // Remove last point added by the first click of dblclick
  if(_rutaPuntos.length)_rutaPuntos.pop();
  _rutaGuardar();
}

function _rutaMouseMove(e){
  if(!_rutaDibujando)return;
  const canvas=document.getElementById('rutaCanvas');if(!canvas)return;
  const r=canvas.getBoundingClientRect();
  const xPct=(e.clientX-r.left)/r.width*100;
  const yPct=(e.clientY-r.top)/r.height*100;
  const cur=document.getElementById('rutaCursor');
  if(cur){cur.style.left=xPct+'%';cur.style.top=yPct+'%';}
  const svg=document.getElementById('rutaSvg');if(!svg)return;
  const W=svg.clientWidth,H=svg.clientHeight;
  const xPx=(xPct*W/100).toFixed(1), yPx=(yPct*H/100).toFixed(1);
  const prev=svg.querySelector('#rutaPreview');
  if(_rutaPuntos.length){
    const last=_rutaPuntos[_rutaPuntos.length-1];
    const lxPx=(last.x*W/100).toFixed(1), lyPx=(last.y*H/100).toFixed(1);
    const line=prev||document.createElementNS('http://www.w3.org/2000/svg','line');
    line.id='rutaPreview';
    line.setAttribute('x1',lxPx);line.setAttribute('y1',lyPx);
    line.setAttribute('x2',xPx);line.setAttribute('y2',yPx);
    line.setAttribute('stroke','#10b981');line.setAttribute('stroke-width','2');
    line.setAttribute('stroke-dasharray','5 3');line.setAttribute('opacity','.7');
    if(!prev)svg.appendChild(line);
  }else if(prev){prev.remove();}
}

function _rutaRedibujarTemp(){
  const svg=document.getElementById('rutaSvg');if(!svg)return;
  const W=svg.clientWidth,H=svg.clientHeight;
  // Limpiar elementos temporales previos
  svg.querySelectorAll('.ruta-temp').forEach(el=>el.remove());
  if(_rutaPuntos.length<1)return;
  const px=_rutaPuntos.map(p=>({x:(p.x*W/100).toFixed(1),y:(p.y*H/100).toFixed(1)}));
  const d='M '+px.map(p=>`${p.x} ${p.y}`).join(' L ');
  const path=document.createElementNS('http://www.w3.org/2000/svg','path');
  path.classList.add('ruta-temp');
  path.setAttribute('d',d);path.setAttribute('stroke','#10b981');
  path.setAttribute('stroke-width','3');path.setAttribute('fill','none');
  path.setAttribute('stroke-linecap','round');path.setAttribute('stroke-linejoin','round');
  svg.appendChild(path);
  px.forEach(p=>{
    const c=document.createElementNS('http://www.w3.org/2000/svg','circle');
    c.classList.add('ruta-temp');
    c.setAttribute('cx',p.x);c.setAttribute('cy',p.y);
    c.setAttribute('r','4');c.setAttribute('fill','#10b981');c.setAttribute('stroke','#fff');c.setAttribute('stroke-width','1.5');
    svg.appendChild(c);
  });
}

async function _rutaGuardar(){
  if(!_rutaSelId){_rutaCancelarDraw();return;}
  const tr=(DB.tramos||[]).find(t=>t.id===_rutaSelId);
  if(!tr){_rutaCancelarDraw();return;}
  if(_rutaPuntos.length<2){toast('Necesitas al menos 2 puntos para guardar la ruta',true);return;}
  tr.puntos=[..._rutaPuntos];
  syncSheet('saveTramo',tr);
  toast(`✓ Ruta "${tr.codigo}" guardada (${_rutaPuntos.length} puntos)`);
  _rutaCancelarDraw(false);
  // Limpiar temporales y re-renderizar SVG sin reload completo
  const svg=document.getElementById('rutaSvg');
  if(svg){svg.querySelectorAll('.ruta-temp,.ruta-preview').forEach(el=>el.remove());}
  const prev=svg&&svg.querySelector('#rutaPreview');if(prev)prev.remove();
  _rutaRenderSvg(DB.tramos||[]);
  // Actualizar sidebar para mostrar el conteo de puntos
  const item=document.getElementById(`ruta-item-${tr.id}`);
  if(item){const c=item.querySelector('div:last-child');if(c)c.textContent=tr.puntos.length+' puntos dibujados';c&&(c.style.color=_rutaColors[(DB.tramos||[]).findIndex(t=>t.id===tr.id)%_rutaColors.length]);}
}

function _rutaCancelarDraw(reset=true){
  _rutaDibujando=false;
  if(reset)_rutaPuntos=[];
  const btn=document.getElementById('rutaBtnDraw');
  const cur=document.getElementById('rutaCursor');
  const wrap=document.getElementById('rutaMapWrap');
  if(btn){btn.textContent='✏️ Dibujar';btn.style.background='rgba(16,185,129,.1)';btn.style.color='#10b981';btn.style.borderColor='#10b98140';}
  if(cur){cur.style.display='none';}
  const canvas2=document.getElementById('rutaCanvas');if(canvas2)canvas2.style.cursor='grab';
  const svg=document.getElementById('rutaSvg');
  if(svg){svg.querySelectorAll('.ruta-temp').forEach(el=>el.remove());const p=svg.querySelector('#rutaPreview');if(p)p.remove();}
}

async function _rutaBorrar(){
  if(!_rutaSelId)return;
  const tr=(DB.tramos||[]).find(t=>t.id===_rutaSelId);
  if(!tr)return;
  if(!confirm(`¿Borrar la ruta trazada de "${tr.codigo}"?`))return;
  tr.puntos=[];
  syncSheet('saveTramo',tr);
  toast(`Ruta de "${tr.codigo}" borrada`);
  _rutaCancelarDraw();
  _rutaRenderSvg(DB.tramos||[]);
  const item=document.getElementById(`ruta-item-${tr.id}`);
  if(item){const c=item.querySelector('div:last-child');if(c){c.textContent='Sin trazar';c.style.color='var(--muted2)';}}
}
