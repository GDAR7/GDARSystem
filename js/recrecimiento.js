// ══ MÓDULO RECRECIMIENTO R3 ══════════════════════════════════════════════════
let _recDique='DA', _recVista='seccion';
// Zoom/pan
let _recZoom=1, _recPanX=0, _recPanY=0, _recZoomLocked=false;
let _recIsPanning=false, _recPanStart=null, _recDidPan=false;
// Dibujo de polígonos
let _recDibujando=false, _recSelCapaId=null, _recAreaPuntos=[];
// Detección de bordes
let _recEdgeMap=null, _recEdgeThreshold=45, _recShowEdges=true, _recSnapEnabled=true, _recSnapRadius=14;

const _REC_DIQUES=[
  {key:'DA',label:'Dique Auxiliar',       color:'#06b6d4'},
  {key:'CA',label:'Contrafuerte DA',      color:'#8b5cf6'},
  {key:'DP',label:'Dique Principal',      color:'#10b981'},
  {key:'DI',label:'Dique Intermedio',     color:'#f59e0b'},
];

function _recImgBase(){
  return window.location.href.replace(/[^\/\\]+$/,'')+'09.-ERP/Imagenes/recrecimiento/';
}

function rRecrecimiento(){
  const pg=document.getElementById('page-recrecimiento');
  if(!pg)return;

  const dq=_REC_DIQUES.find(d=>d.key===_recDique)||_REC_DIQUES[0];
  const capas=(DB.capas||[]).filter(c=>c.dique===_recDique).sort((a,b)=>b.cota-a.cota);

  const total=capas.length;
  const comp=capas.filter(c=>+c.pctAvance>=100).length;
  const enCurso=capas.filter(c=>+c.pctAvance>0&&+c.pctAvance<100).length;
  const pend=total-comp-enCurso;
  const pctGlobal=total?Math.round(capas.reduce((s,c)=>s+(+c.pctAvance||0),0)/total):0;
  const volTotal=capas.reduce((s,c)=>s+(+c.volM3||0),0);
  const volAvanz=capas.reduce((s,c)=>s+(+c.volM3||0)*(+c.pctAvance||0)/100,0);
  const pctVol=volTotal>0?Math.round(volAvanz/volTotal*100):0;

  const selCapa=_recSelCapaId?(DB.capas||[]).find(c=>c.id===_recSelCapaId):null;
  const esSec=_recVista==='seccion';

  pg.innerHTML=`
  <div style="padding:.8rem 1rem;height:calc(100vh - 52px);display:flex;flex-direction:column;gap:.6rem;overflow:hidden">

    <!-- CABECERA -->
    <div style="display:flex;align-items:center;gap:.8rem;flex-wrap:wrap">
      <div>
        <div style="font-size:1.1rem;font-weight:800;color:#10b981">🏔️ Recrecimiento R3</div>
        <div style="font-size:.68rem;color:var(--muted2)">Control visual de avance por capa · ${new Date().toLocaleDateString('es-PE',{weekday:'short',day:'2-digit',month:'short',year:'numeric'}).toUpperCase()}</div>
      </div>
      <div style="display:flex;gap:.3rem;margin-left:auto">
        ${_REC_DIQUES.map(d=>`<button onclick="_recSetDique('${d.key}')"
          style="padding:.3rem .9rem;border-radius:8px;border:1px solid ${_recDique===d.key?d.color:'var(--border)'};background:${_recDique===d.key?d.color+'22':'transparent'};color:${_recDique===d.key?d.color:'var(--muted2)'};font-size:.72rem;font-weight:${_recDique===d.key?'700':'500'};cursor:pointer">${d.label}</button>`).join('')}
      </div>
      <div style="display:flex;border:1px solid var(--border);border-radius:8px;overflow:hidden">
        <button onclick="_recSetVista('seccion')" style="padding:.3rem .8rem;font-size:.7rem;border:none;background:${esSec?dq.color+'33':'transparent'};color:${esSec?dq.color:'var(--muted2)'};cursor:pointer;font-weight:${esSec?'700':'400'}">📐 Sección</button>
        <button onclick="_recSetVista('planta')" style="padding:.3rem .8rem;font-size:.7rem;border:none;border-left:1px solid var(--border);background:${!esSec?dq.color+'33':'transparent'};color:${!esSec?dq.color:'var(--muted2)'};cursor:pointer;font-weight:${!esSec?'700':'400'}">🗺️ Planta</button>
      </div>
      <button onclick="rRecrecimiento()" style="padding:.3rem .7rem;border-radius:7px;border:1px solid #10b98140;background:rgba(16,185,129,.1);color:#10b981;font-size:.7rem;cursor:pointer">🔄 Actualizar</button>
    </div>

    <!-- KPIs -->
    <div style="display:flex;gap:.5rem">
      ${[
        {l:'Avance Global',v:pctGlobal+'%',c:'#10b981'},
        {l:'Completadas',v:comp,c:'#10b981'},
        {l:'En Progreso',v:enCurso,c:'#f59e0b'},
        {l:'Pendientes',v:pend,c:'#6b7280'},
        {l:'Total Capas',v:total,c:dq.color},
      ].map(k=>`<div style="flex:1;background:var(--panel2);border:1px solid ${k.c}30;border-radius:8px;padding:.4rem .7rem;text-align:center">
        <div style="font-size:1.1rem;font-weight:800;color:${k.c}">${k.v}</div>
        <div style="font-size:.58rem;color:var(--muted2)">${k.l}</div>
      </div>`).join('')}
      ${volTotal>0?`<div style="flex:2;background:var(--panel2);border:1px solid #06b6d430;border-radius:8px;padding:.4rem .8rem;display:flex;flex-direction:column;justify-content:center;gap:.3rem">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.1rem">
          <span style="font-size:.6rem;color:var(--muted2);text-transform:uppercase;letter-spacing:.05em">Volumen m³</span>
          <span style="font-size:.78rem;font-weight:800;color:#06b6d4">${pctVol}%</span>
        </div>
        <div style="height:7px;background:rgba(255,255,255,.08);border-radius:4px;overflow:hidden;margin-bottom:.2rem">
          <div style="height:100%;width:${pctVol}%;background:linear-gradient(90deg,#06b6d4,#0891b2);border-radius:4px;transition:width .4s"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:.6rem">
          <span style="color:#06b6d4;font-weight:700">${Math.round(volAvanz).toLocaleString('es-PE')} m³</span>
          <span style="color:var(--muted2)">/ ${Math.round(volTotal).toLocaleString('es-PE')} m³</span>
        </div>
      </div>`:''}
      <div style="flex:3;background:var(--panel2);border:1px solid ${dq.color}30;border-radius:8px;padding:.4rem .8rem;display:flex;flex-direction:column;justify-content:center;gap:.3rem">
        <div style="display:flex;justify-content:space-between;font-size:.63rem;color:var(--muted2)">
          <span>Progreso ${dq.label}</span><span style="font-weight:700;color:${dq.color}">${pctGlobal}%</span>
        </div>
        <div style="height:8px;background:rgba(255,255,255,.08);border-radius:4px;overflow:hidden">
          <div style="height:100%;width:${pctGlobal}%;background:linear-gradient(90deg,${dq.color},${dq.color}cc);border-radius:4px;transition:width .4s"></div>
        </div>
      </div>
    </div>

    <!-- CONTENIDO PRINCIPAL -->
    <div style="flex:1;overflow:hidden;display:grid;grid-template-columns:270px 1fr;gap:.6rem;min-height:0">

      <!-- PANEL IZQUIERDO -->
      <div style="display:flex;flex-direction:column;gap:.3rem;border:1px solid var(--border);border-radius:8px;padding:.5rem;background:var(--panel2);overflow:hidden">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.1rem">
          <span style="font-size:.65rem;font-weight:700;color:${dq.color};text-transform:uppercase;letter-spacing:.08em">Capas · ${dq.label}</span>
          <button onclick="_recAddCapa('${_recDique}')" style="font-size:.6rem;padding:.15rem .45rem;border-radius:5px;border:1px solid ${dq.color}50;background:${dq.color}15;color:${dq.color};cursor:pointer">＋ Agregar</button>
        </div>

        ${esSec?`
        <div style="background:var(--panel);border:1px solid ${_recDibujando?'#f59e0b40':'rgba(255,255,255,.06)'};border-radius:7px;padding:.4rem .5rem">
          ${selCapa
            ?`<div style="font-size:.62rem;color:${dq.color};font-weight:700;margin-bottom:.3rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                ◼ ${selCapa.nombre||'—'}
                <span style="font-weight:400;color:var(--muted2)">${selCapa.cota?' '+selCapa.cota+' m':''}</span>
                ${(selCapa.puntos||[]).length>=3
                  ?`<span style="color:#10b981;font-size:.58rem"> · ${(selCapa.puntos||[]).length} pts ✓</span>`
                  :`<span style="color:#6b7280;font-size:.58rem"> · sin área</span>`}
              </div>`
            :`<div style="font-size:.6rem;color:var(--muted2);margin-bottom:.3rem">← Selecciona una capa de la lista</div>`}
          <div style="display:flex;gap:.3rem">
            <button id="recBtnDraw" onclick="_recToggleDraw()"
              style="flex:1;padding:.25rem .4rem;border-radius:5px;font-size:.62rem;font-weight:700;cursor:pointer;border:1px solid ${_recDibujando?'#f59e0b':'#10b98140'};background:${_recDibujando?'rgba(245,158,11,.15)':'rgba(16,185,129,.1)'};color:${_recDibujando?'#f59e0b':'#10b981'}">
              ${_recDibujando?'✅ Guardar área':'✏️ Dibujar área'}
            </button>
            ${_recDibujando?`<button onclick="_recCancelarDraw()" style="padding:.25rem .4rem;border-radius:5px;border:1px solid #ef444440;background:rgba(239,68,68,.1);color:#ef4444;font-size:.62rem;font-weight:700;cursor:pointer">✗</button>`:''}
            ${!_recDibujando&&selCapa&&(selCapa.puntos||[]).length>=3?`<button onclick="_recBorrarPuntos()" style="padding:.25rem .4rem;border-radius:5px;border:1px solid #ef444440;background:rgba(239,68,68,.08);color:#ef4444;font-size:.62rem;cursor:pointer" title="Borrar área">🗑</button>`:''}
          </div>
          ${_recDibujando
            ?`<div style="font-size:.57rem;color:#f59e0b;margin-top:.3rem">Clic = vértice · Doble clic = cerrar · Clic der. = cancelar
                ${_recSnapEnabled&&_recEdgeMap?`<span style="color:#10b981;margin-left:.4rem">⊙ Snap activo</span>`:''}
              </div>`
            :`<div style="display:flex;align-items:center;gap:.25rem;margin-top:.3rem;flex-wrap:wrap">
                <div style="font-size:.56rem;color:var(--muted2);flex:1;min-width:60px">Selecciona una capa y presiona ✏️ Dibujar</div>
                <button onclick="_recAbrirDXF()" title="Importar desde DXF" style="padding:.18rem .35rem;border-radius:5px;border:1px solid #8b5cf640;background:rgba(139,92,246,.1);color:#8b5cf6;font-size:.58rem;cursor:pointer;white-space:nowrap">📐 DXF</button>
                <button onclick="_recDetectarLineas()" title="Detectar bordes de la imagen para guiar el dibujo" style="padding:.18rem .35rem;border-radius:5px;border:1px solid #06b6d440;background:rgba(6,182,212,.1);color:#06b6d4;font-size:.58rem;cursor:pointer;white-space:nowrap">🔍 Líneas</button>
              </div>`}
          <div id="recEdgeControls"></div>
        </div>`:''}

        <div style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:.18rem" id="recCapaList">
          ${capas.length ? capas.map(c=>_recCapaRow(c,dq)).join('') :
            `<div style="text-align:center;padding:1.5rem;color:var(--muted2);font-size:.68rem">
              Sin capas registradas<br>
              <button onclick="_recAddCapa('${_recDique}')" style="margin-top:.5rem;padding:.3rem .8rem;border-radius:6px;border:1px solid ${dq.color}50;background:${dq.color}15;color:${dq.color};cursor:pointer;font-size:.65rem">＋ Agregar primera capa</button>
            </div>`}
        </div>
      </div>

      <!-- PANEL DERECHO: mapa con zoom/pan -->
      <div style="border:1px solid var(--border);border-radius:8px;overflow:hidden;background:#0a0a0f;position:relative;display:flex;flex-direction:column" id="recImgWrap">
        <div style="flex:1;position:relative;overflow:hidden" id="recMapWrap">
          <div id="recCanvas" style="position:absolute;transform-origin:0 0;touch-action:none">
            <img id="recImg"
              src="${_recImgBase()}${_recDique.toLowerCase()}_${_recVista}.jpg"
              onerror="this.src='${_recImgBase()}${_recDique.toLowerCase()}_${_recVista}.png';this.onerror=null"
              style="display:block;width:100%;pointer-events:none;user-select:none" draggable="false"
              alt="${dq.label}" onload="_recFitView()">
            <canvas id="recEdgeCanvas" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;image-rendering:pixelated;mix-blend-mode:screen;display:${_recEdgeMap&&_recShowEdges?'block':'none'}"></canvas>
            <svg id="recSvg" style="position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:${_recDibujando?'all':'none'}" xmlns="http://www.w3.org/2000/svg"></svg>
            <div id="recCursor" style="display:none;position:absolute;width:10px;height:10px;background:#f59e0b;border:2px solid #fff;border-radius:2px;pointer-events:none;z-index:5"></div>
          </div>
          <!-- Controles zoom -->
          <div style="position:absolute;bottom:.6rem;right:.6rem;display:flex;align-items:center;gap:.25rem;z-index:20;background:rgba(10,10,20,.75);border:1px solid #ffffff18;border-radius:7px;padding:.25rem .4rem;backdrop-filter:blur(6px)">
            <button onclick="_recZoomOut()" style="width:22px;height:22px;border-radius:4px;border:1px solid #ffffff20;background:#ffffff10;color:#e0e0e0;cursor:pointer;font-size:.9rem;line-height:1">−</button>
            <span id="recZoomPct" style="font-size:.65rem;color:#e0e0e0;min-width:36px;text-align:center;font-weight:700">100%</span>
            <button onclick="_recZoomIn()" style="width:22px;height:22px;border-radius:4px;border:1px solid #ffffff20;background:#ffffff10;color:#e0e0e0;cursor:pointer;font-size:.9rem;line-height:1">+</button>
            <div style="width:1px;height:14px;background:#ffffff20;margin:0 .1rem"></div>
            <button onclick="_recZoomReset()" style="padding:0 .35rem;height:22px;border-radius:4px;border:1px solid #ffffff20;background:#ffffff10;color:#e0e0e0;cursor:pointer;font-size:.65rem">↺ Fit</button>
            <div style="width:1px;height:14px;background:#ffffff20;margin:0 .1rem"></div>
            <button id="recLockBtn" onclick="_recToggleLock()" style="padding:0 .35rem;height:22px;border-radius:4px;border:1px solid #ffffff20;background:#ffffff10;color:#e0e0e0;cursor:pointer;font-size:.85rem">${_recZoomLocked?'🔒':'🔓'}</button>
          </div>
        </div>
        <!-- Leyenda -->
        <div style="display:flex;align-items:center;gap:.6rem;padding:.25rem .6rem;background:rgba(0,0,0,.4);border-top:1px solid var(--border);flex-wrap:wrap">
          <div style="display:flex;align-items:center;gap:.35rem;font-size:.58rem">
            <span style="display:inline-block;width:12px;height:8px;background:#10b981;border-radius:2px"></span>Completado
            <span style="display:inline-block;width:12px;height:8px;background:#f59e0b;border-radius:2px;margin-left:.3rem"></span>En proceso
            <span style="display:inline-block;width:12px;height:8px;background:#6b7280;border-radius:2px;opacity:.6;margin-left:.3rem"></span>Pendiente
          </div>
          <span style="font-size:.58rem;color:var(--muted2);margin-left:auto">Rueda=zoom · Arrastrar=pan${esSec?' · Clic polígono=info':''}</span>
        </div>
      </div>

    </div>
  </div>

  <!-- POPUP info capa -->
  <div id="recPopupWrap" style="display:none;position:fixed;inset:0;z-index:990;pointer-events:none">
    <div id="recPopupCard" onclick="event.stopPropagation()" style="pointer-events:all;position:absolute;background:var(--panel);border:1px solid var(--border);border-radius:10px;padding:.8rem 1rem;min-width:210px;max-width:260px;box-shadow:0 8px 24px rgba(0,0,0,.65)"></div>
  </div>

  <!-- MODAL capa -->
  <div id="mRecCapa" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:999;align-items:center;justify-content:center">
    <div style="background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:1.2rem;width:420px;max-width:96vw;max-height:92vh;overflow-y:auto">
      <div style="font-weight:700;margin-bottom:.8rem;font-size:.9rem">🏔️ Capa de recrecimiento</div>
      <input type="hidden" id="rcId">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem;margin-bottom:.5rem">
        <div><label style="font-size:.65rem;color:var(--muted2)">Dique</label>
          <select id="rcDique" style="width:100%;background:var(--panel2);border:1px solid var(--border);border-radius:6px;padding:.3rem .5rem;color:var(--text);font-size:.75rem">
            ${_REC_DIQUES.map(d=>`<option value="${d.key}">${d.label}</option>`).join('')}
          </select></div>
        <div><label style="font-size:.65rem;color:var(--muted2)">Nombre capa</label>
          <input id="rcNombre" placeholder="C-01" style="width:100%;background:var(--panel2);border:1px solid var(--border);border-radius:6px;padding:.3rem .5rem;color:var(--text);font-size:.75rem"></div>
        <div><label style="font-size:.65rem;color:var(--muted2)">Cota (msnm)</label>
          <input id="rcCota" type="number" placeholder="4386" style="width:100%;background:var(--panel2);border:1px solid var(--border);border-radius:6px;padding:.3rem .5rem;color:var(--text);font-size:.75rem"></div>
        <div><label style="font-size:.65rem;color:var(--muted2)">% Avance</label>
          <input id="rcPct" type="number" min="0" max="100" placeholder="0" style="width:100%;background:var(--panel2);border:1px solid var(--border);border-radius:6px;padding:.3rem .5rem;color:var(--text);font-size:.75rem"></div>
        <div><label style="font-size:.65rem;color:var(--muted2)">Fecha inicio</label>
          <input id="rcFechaIni" type="date" style="width:100%;background:var(--panel2);border:1px solid var(--border);border-radius:6px;padding:.3rem .5rem;color:var(--text);font-size:.75rem"></div>
        <div><label style="font-size:.65rem;color:var(--muted2)">Fecha fin plan.</label>
          <input id="rcFechaFin" type="date" style="width:100%;background:var(--panel2);border:1px solid var(--border);border-radius:6px;padding:.3rem .5rem;color:var(--text);font-size:.75rem"></div>
        <div><label style="font-size:.65rem;color:var(--muted2)">Volumen m³</label>
          <input id="rcVolM3" type="number" step="0.001" placeholder="0.000" style="width:100%;background:var(--panel2);border:1px solid var(--border);border-radius:6px;padding:.3rem .5rem;color:var(--text);font-size:.75rem"></div>
        <div><label style="font-size:.65rem;color:var(--muted2)">Área m²</label>
          <input id="rcAreaM2" type="number" step="0.001" placeholder="0.000" style="width:100%;background:var(--panel2);border:1px solid var(--border);border-radius:6px;padding:.3rem .5rem;color:var(--text);font-size:.75rem"></div>
      </div>
      <div style="margin-bottom:.5rem"><label style="font-size:.65rem;color:var(--muted2)">Actividad WBS vinculada (opcional)</label>
        <select id="rcWbs" style="width:100%;background:var(--panel2);border:1px solid var(--border);border-radius:6px;padding:.3rem .5rem;color:var(--text);font-size:.75rem">
          <option value="">— Sin vínculo WBS —</option>
          ${[...(DB.lpsWbs||[])].sort((a,b)=>+a.id-+b.id).map(w=>`<option value="${w.id}">${w.codigo||''}</option>`).join('')}
        </select></div>
      <div style="margin-bottom:.8rem"><label style="font-size:.65rem;color:var(--muted2)">Notas</label>
        <input id="rcNotas" placeholder="Observaciones..." style="width:100%;background:var(--panel2);border:1px solid var(--border);border-radius:6px;padding:.3rem .5rem;color:var(--text);font-size:.75rem"></div>
      <div style="display:flex;gap:.5rem">
        <button onclick="_recSaveCapa()" style="flex:1;background:#10b981;border:none;border-radius:7px;color:#fff;padding:.4rem;font-size:.75rem;font-weight:700;cursor:pointer">💾 Guardar</button>
        <button onclick="document.getElementById('mRecCapa').style.display='none'" style="padding:.4rem .9rem;background:var(--panel2);border:1px solid var(--border);border-radius:7px;color:var(--muted2);font-size:.75rem;cursor:pointer">Cancelar</button>
        <button id="rcBtnDel" onclick="_recDelCapa()" style="padding:.4rem .6rem;background:rgba(239,68,68,.1);border:1px solid #ef444440;border-radius:7px;color:#ef4444;font-size:.75rem;cursor:pointer;display:none">🗑</button>
      </div>
      <!-- HISTORIAL DE AVANCE -->
      <div id="rcHistPanel" style="display:none;margin-top:.7rem;border-top:1px solid var(--border);padding-top:.6rem"></div>
    </div>
  </div>`;

  // Event listeners
  const wrap=document.getElementById('recMapWrap');
  if(wrap){
    wrap.addEventListener('wheel',_recOnWheel,{passive:false});
    wrap.addEventListener('mousedown',_recMapMousedown);
    wrap.addEventListener('contextmenu',e=>{e.preventDefault();if(_recDibujando)_recCancelarDraw();});
  }
  const svg=document.getElementById('recSvg');
  if(svg){
    svg.addEventListener('click',_recSvgClick);
    svg.addEventListener('dblclick',_recSvgDblClick);
    svg.addEventListener('mousemove',_recSvgMouseMove);
  }
  document.addEventListener('mousemove',_recGlobalMousemove);
  document.addEventListener('mouseup',_recGlobalMouseup);
  requestAnimationFrame(()=>{
    _recFitView();
    setTimeout(()=>{
      _recRenderCapasSvg();
      if(_recDibujando){
        const canvas=document.getElementById('recCanvas');
        if(canvas)canvas.style.cursor='crosshair';
        _recTempRender();
      }
      if(_recEdgeMap&&_recShowEdges)_recMostrarEdgeOverlay();
      _recUpdateEdgePanel();
    },150);
  });
}

// ── Lista de capas ────────────────────────────────────────────────────────────

function _recCapaRow(c,dq){
  const pct=+c.pctAvance||0;
  const col=pct>=100?'#10b981':pct>0?'#f59e0b':'#6b7280';
  const est=pct>=100?'✅':pct>0?'🔄':'⏳';
  const volColocado=c.volM3&&pct>0?`${Math.round(+c.volM3*pct/100).toLocaleString('es-PE')}/${Math.round(+c.volM3).toLocaleString('es-PE')} m³`
    :c.volM3?`${(+c.volM3).toLocaleString('es-PE',{maximumFractionDigits:0})} m³`:'';
  const hasPts=(c.puntos||[]).length>=3;
  const isSel=_recSelCapaId===c.id;
  const bdr=isSel?`2px solid ${dq.color}`:`1px solid ${col}25`;
  return`<div id="rec-capa-${c.id}"
    style="padding:.28rem .45rem;background:${isSel?dq.color+'18':'var(--panel)'};border:${bdr};border-radius:6px;cursor:pointer"
    onclick="_recSelCapa(${c.id})">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.12rem">
      <div style="display:flex;align-items:center;gap:.28rem">
        <span title="${hasPts?'Área dibujada':'Sin área'}" style="font-size:.6rem;color:${hasPts?'#10b981':'#6b7280'}">${hasPts?'◼':'○'}</span>
        <span style="font-size:.6rem">${est}</span>
        <span style="font-size:.7rem;font-weight:700;color:${col}">${c.nombre||'—'}</span>
        <span style="font-size:.54rem;color:var(--muted2)">${c.cota?c.cota+' m':''}</span>
      </div>
      <div style="display:flex;align-items:center;gap:.22rem">
        <span style="font-size:.65rem;font-weight:700;color:${col}">${pct}%</span>
        <button onclick="event.stopPropagation();_recEditCapa(${c.id})" style="font-size:.55rem;padding:0 .25rem;border-radius:3px;border:1px solid var(--border);background:transparent;color:var(--muted2);cursor:pointer;line-height:1.5">✎</button>
      </div>
    </div>
    <div style="height:3px;background:rgba(255,255,255,.07);border-radius:2px;overflow:hidden;margin-bottom:.1rem">
      <div style="height:100%;width:${pct}%;background:${col};border-radius:2px"></div>
    </div>
    <div style="font-size:.52rem;color:var(--muted2)">${volColocado}</div>
  </div>`;
}

function _recSelCapa(id){
  if(_recDibujando)_recCancelarDraw();
  _recSelCapaId=(_recSelCapaId===id)?null:id;
  rRecrecimiento();
}

// ══ ZOOM / PAN ════════════════════════════════════════════════════════════════

function _recApplyTransform(){
  const c=document.getElementById('recCanvas');if(!c)return;
  c.style.transform=`translate(${_recPanX}px,${_recPanY}px) scale(${_recZoom})`;
  const pct=document.getElementById('recZoomPct');if(pct)pct.textContent=Math.round(_recZoom*100)+'%';
  const lb=document.getElementById('recLockBtn');if(lb)lb.textContent=_recZoomLocked?'🔒':'🔓';
}

function _recFitView(){
  const wrap=document.getElementById('recMapWrap');
  const canvas=document.getElementById('recCanvas');
  const img=document.getElementById('recImg');
  if(!wrap||!canvas||!img)return;
  if(!img.naturalWidth){setTimeout(_recFitView,200);return;}
  const wW=wrap.clientWidth, wH=wrap.clientHeight;
  const iW=img.naturalWidth, iH=img.naturalHeight;
  const scale=Math.min(wW/iW, wH/iH);
  canvas.style.width=iW+'px';
  _recZoom=scale;
  _recPanX=(wW-iW*scale)/2;
  _recPanY=(wH-iH*scale)/2;
  _recApplyTransform();
  setTimeout(_recRenderCapasSvg,50);
}

function _recZoomIn(){ if(!_recZoomLocked)_recSetZoom(_recZoom*1.25); }
function _recZoomOut(){ if(!_recZoomLocked)_recSetZoom(_recZoom/1.25); }
function _recZoomReset(){ _recFitView(); }
function _recToggleLock(){
  _recZoomLocked=!_recZoomLocked;
  const lb=document.getElementById('recLockBtn');if(lb)lb.textContent=_recZoomLocked?'🔒':'🔓';
}

function _recSetZoom(z,cx,cy){
  const nz=Math.max(0.1,Math.min(10,z));
  if(cx!==undefined){_recPanX=cx-(cx-_recPanX)*(nz/_recZoom);}
  if(cy!==undefined){_recPanY=cy-(cy-_recPanY)*(nz/_recZoom);}
  _recZoom=nz;_recApplyTransform();
}

function _recOnWheel(e){
  e.preventDefault();
  if(_recZoomLocked)return;
  const wrap=document.getElementById('recMapWrap');if(!wrap)return;
  const r=wrap.getBoundingClientRect();
  _recSetZoom(_recZoom*(e.deltaY<0?1.12:0.89),e.clientX-r.left,e.clientY-r.top);
}

function _recMapMousedown(e){
  if(_recDibujando||e.button!==0)return;
  _recIsPanning=true;_recDidPan=false;
  _recPanStart={x:e.clientX-_recPanX,y:e.clientY-_recPanY};
  const c=document.getElementById('recCanvas');if(c)c.style.cursor='grabbing';
}
function _recGlobalMousemove(e){
  if(_recDibujando||!_recIsPanning||!_recPanStart)return;
  const nx=e.clientX-_recPanStart.x, ny=e.clientY-_recPanStart.y;
  if(Math.abs(nx-_recPanX)>2||Math.abs(ny-_recPanY)>2)_recDidPan=true;
  _recPanX=nx;_recPanY=ny;_recApplyTransform();
}
function _recGlobalMouseup(){
  _recIsPanning=false;_recDidPan=false;
  const c=document.getElementById('recCanvas');
  if(c)c.style.cursor=_recDibujando?'crosshair':'grab';
}

// ══ DIBUJO DE POLÍGONOS ═══════════════════════════════════════════════════════

function _recToggleDraw(){
  if(!_recSelCapaId){toast('Selecciona una capa de la lista primero',true);return;}
  if(_recDibujando){
    _recGuardarPuntos();
  }else{
    _recDibujando=true;
    const c=(DB.capas||[]).find(x=>x.id===_recSelCapaId);
    _recAreaPuntos=(c&&c.puntos)?[...c.puntos]:[];
    rRecrecimiento(); // SVG se recrea con pointer-events:all (estado _recDibujando=true)
  }
}

function _recCancelarDraw(reset=true){
  _recDibujando=false;
  if(reset)_recAreaPuntos=[];
  rRecrecimiento(); // SVG se recrea con pointer-events:none
}

async function _recGuardarPuntos(){
  if(!_recSelCapaId){_recCancelarDraw();return;}
  if(_recAreaPuntos.length<3){toast('Necesitas al menos 3 vértices para guardar',true);return;}
  const pts=[..._recAreaPuntos];
  const{error}=await supa.from('capas').update({puntos:pts}).eq('id',_recSelCapaId);
  if(error){toast('Error al guardar: '+error.message,true);return;}
  const c=(DB.capas||[]).find(x=>x.id===_recSelCapaId);
  if(c)c.puntos=pts;
  toast(`✓ Área guardada (${pts.length} vértices)`);
  _recCancelarDraw(false);
  _recRenderCapasSvg();
}

async function _recBorrarPuntos(){
  if(!_recSelCapaId||!confirm('¿Borrar el área dibujada de esta capa?'))return;
  const{error}=await supa.from('capas').update({puntos:[]}).eq('id',_recSelCapaId);
  if(error){toast('Error: '+error.message,true);return;}
  const c=(DB.capas||[]).find(x=>x.id===_recSelCapaId);
  if(c)c.puntos=[];
  toast('Área borrada');
  rRecrecimiento();
  _recRenderCapasSvg();
}

function _recSvgClick(e){
  if(!_recDibujando||!_recSelCapaId)return;
  if(e.detail>1)return;
  const canvas=document.getElementById('recCanvas');if(!canvas)return;
  const r=canvas.getBoundingClientRect();
  const xRaw=(e.clientX-r.left)/r.width*100;
  const yRaw=(e.clientY-r.top)/r.height*100;
  const snapped=_recSnapToEdge(xRaw,yRaw);
  _recAreaPuntos.push({x:parseFloat(snapped.x.toFixed(2)),y:parseFloat(snapped.y.toFixed(2))});
  _recTempRender();
}

function _recSvgDblClick(e){
  if(!_recDibujando)return;
  e.preventDefault();
  if(_recAreaPuntos.length)_recAreaPuntos.pop();
  if(_recAreaPuntos.length<3){toast('Necesitas al menos 3 vértices',true);return;}
  _recGuardarPuntos();
}

function _recSvgMouseMove(e){
  if(!_recDibujando)return;
  const canvas=document.getElementById('recCanvas');if(!canvas)return;
  const r=canvas.getBoundingClientRect();
  const xRaw=(e.clientX-r.left)/r.width*100;
  const yRaw=(e.clientY-r.top)/r.height*100;
  const snapped=_recSnapToEdge(xRaw,yRaw);
  const xPct=snapped.x, yPct=snapped.y;

  const cur=document.getElementById('recCursor');
  if(cur){
    cur.style.display='block';cur.style.left=xPct+'%';cur.style.top=yPct+'%';
    cur.style.transform=`translate(-50%,-50%) scale(${1/(_recZoom||1)})`;
    cur.style.background=snapped.snapped?'#06b6d4':'#f59e0b';
  }

  const svg=document.getElementById('recSvg');if(!svg||!_recAreaPuntos.length)return;
  const W=svg.clientWidth,H=svg.clientHeight;
  const xPx=(xPct*W/100).toFixed(1),yPx=(yPct*H/100).toFixed(1);
  const last=_recAreaPuntos[_recAreaPuntos.length-1];
  const lx=(last.x*W/100).toFixed(1),ly=(last.y*H/100).toFixed(1);
  const sw=(2/(_recZoom||1)).toFixed(2);
  const prev=svg.querySelector('#recAreaPreview');
  if(prev){prev.setAttribute('x1',lx);prev.setAttribute('y1',ly);prev.setAttribute('x2',xPx);prev.setAttribute('y2',yPx);prev.setAttribute('stroke-width',sw);}
  else{
    const line=document.createElementNS('http://www.w3.org/2000/svg','line');
    line.id='recAreaPreview';
    line.setAttribute('x1',lx);line.setAttribute('y1',ly);line.setAttribute('x2',xPx);line.setAttribute('y2',yPx);
    line.setAttribute('stroke','#f59e0b');line.setAttribute('stroke-width',sw);line.setAttribute('stroke-dasharray','5 3');line.setAttribute('pointer-events','none');
    svg.appendChild(line);
  }
}

function _recTempRender(){
  const svg=document.getElementById('recSvg');if(!svg)return;
  const W=svg.clientWidth,H=svg.clientHeight;
  svg.querySelectorAll('.rec-temp').forEach(el=>el.remove());
  if(!_recDibujando||!_recAreaPuntos.length)return;
  const px=_recAreaPuntos.map(p=>({x:(p.x*W/100).toFixed(1),y:(p.y*H/100).toFixed(1)}));
  const d='M '+px.map(p=>`${p.x} ${p.y}`).join(' L ');
  const sw=(2/(_recZoom||1)).toFixed(2);

  const path=document.createElementNS('http://www.w3.org/2000/svg','path');
  path.classList.add('rec-temp');
  path.setAttribute('d',d);path.setAttribute('stroke','#f59e0b');path.setAttribute('stroke-width',sw);
  path.setAttribute('fill','none');path.setAttribute('pointer-events','none');
  svg.appendChild(path);

  if(_recAreaPuntos.length>=3){
    const fp=document.createElementNS('http://www.w3.org/2000/svg','path');
    fp.classList.add('rec-temp');
    fp.setAttribute('d',d+' Z');fp.setAttribute('fill','#f59e0b');fp.setAttribute('fill-opacity','.18');fp.setAttribute('stroke','none');fp.setAttribute('pointer-events','none');
    svg.appendChild(fp);
    const cl=document.createElementNS('http://www.w3.org/2000/svg','line');
    cl.classList.add('rec-temp');
    cl.setAttribute('x1',px[px.length-1].x);cl.setAttribute('y1',px[px.length-1].y);
    cl.setAttribute('x2',px[0].x);cl.setAttribute('y2',px[0].y);
    cl.setAttribute('stroke','#f59e0b');cl.setAttribute('stroke-width',(1.5/(_recZoom||1)).toFixed(2));
    cl.setAttribute('stroke-dasharray','4 3');cl.setAttribute('opacity','.5');cl.setAttribute('pointer-events','none');
    svg.appendChild(cl);
  }
  px.forEach(p=>{
    const c=document.createElementNS('http://www.w3.org/2000/svg','circle');
    c.classList.add('rec-temp');
    c.setAttribute('cx',p.x);c.setAttribute('cy',p.y);c.setAttribute('r',(4/(_recZoom||1)).toFixed(2));
    c.setAttribute('fill','#f59e0b');c.setAttribute('stroke','#fff');c.setAttribute('stroke-width',(1.5/(_recZoom||1)).toFixed(2));
    c.setAttribute('pointer-events','none');
    svg.appendChild(c);
  });
}

// ══ RENDER POLÍGONOS GUARDADOS ════════════════════════════════════════════════

function _recRenderCapasSvg(){
  const svg=document.getElementById('recSvg');if(!svg)return;
  const W=svg.clientWidth,H=svg.clientHeight;if(!W||!H)return;
  svg.querySelectorAll('.rec-static').forEach(el=>el.remove());
  // Los polígonos (c.puntos) se dibujan solo en la vista Sección — sus coordenadas son relativas
  // a la foto de Sección y no corresponden a la foto de Planta, por eso no se muestran ahí.
  if(_recVista!=='seccion')return;

  const capas=(DB.capas||[]).filter(c=>c.dique===_recDique);

  capas.forEach(c=>{
    const pts=c.puntos||[];if(pts.length<3)return;
    const pct=+c.pctAvance||0;
    const col=pct>=100?'#10b981':pct>0?'#f59e0b':'#6b7280';
    const isSel=c.id===_recSelCapaId;

    const px=pts.map(p=>({x:(p.x*W/100),y:(p.y*H/100)}));
    const d='M '+px.map(p=>`${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L ')+' Z';
    const cx=px.reduce((s,p)=>s+p.x,0)/px.length;
    const cy=px.reduce((s,p)=>s+p.y,0)/px.length;

    const g=document.createElementNS('http://www.w3.org/2000/svg','g');
    g.classList.add('rec-static');
    g.style.cursor='pointer';

    const area=document.createElementNS('http://www.w3.org/2000/svg','path');
    area.setAttribute('d',d);
    area.setAttribute('fill',col);
    area.setAttribute('fill-opacity',isSel?'.45':'.32');
    area.setAttribute('stroke',col);
    area.setAttribute('stroke-width',isSel?'2.5':'1.5');
    area.setAttribute('stroke-linejoin','round');
    const cId=c.id;
    area.addEventListener('click',()=>{if(!_recDibujando)_recShowCapaPopup(cId,cx,cy);});
    g.appendChild(area);

    const fs=Math.max(11/_recZoom,8).toFixed(1);
    const txt=document.createElementNS('http://www.w3.org/2000/svg','text');
    txt.setAttribute('x',cx.toFixed(1));txt.setAttribute('y',cy.toFixed(1));
    txt.setAttribute('font-size',fs);txt.setAttribute('font-weight','700');txt.setAttribute('fill',col);
    txt.setAttribute('stroke','#000');txt.setAttribute('stroke-width','2.5');txt.setAttribute('paint-order','stroke');
    txt.setAttribute('dominant-baseline','middle');txt.setAttribute('text-anchor','middle');
    txt.setAttribute('font-family','sans-serif');txt.setAttribute('pointer-events','none');
    txt.textContent=`${c.nombre||''}${pct>0?' '+pct+'%':''}`;
    g.appendChild(txt);
    svg.appendChild(g);
  });
}

function _recShowCapaPopup(id,svgCx,svgCy){
  const c=(DB.capas||[]).find(x=>x.id===id);if(!c)return;
  const dq=_REC_DIQUES.find(d=>d.key===c.dique)||_REC_DIQUES[0];
  const pct=+c.pctAvance||0;
  const col=pct>=100?'#10b981':pct>0?'#f59e0b':'#6b7280';
  const est=pct>=100?'Completada':pct>0?'En Proceso':'Pendiente';
  const wbs=c.wbsId?(DB.lpsWbs||[]).find(w=>+w.id===+c.wbsId):null;
  const volEjec=c.volM3&&pct>0?Math.round(+c.volM3*pct/100).toLocaleString('es-PE')+' m³':null;

  const hist=(DB.capasAvance||[]).filter(e=>+e.capaId===+id).sort((a,b)=>a.fecha<b.fecha?-1:1);
  const popup=document.getElementById('recPopupCard');
  const wrap=document.getElementById('recPopupWrap');
  if(!popup||!wrap)return;

  popup.innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem">
      <span style="font-weight:800;font-size:.85rem;color:${dq.color}">◼ ${c.nombre||'—'}</span>
      <button onclick="document.getElementById('recPopupWrap').style.display='none'" style="background:none;border:none;color:var(--muted2);cursor:pointer;font-size:.95rem;padding:0">✕</button>
    </div>
    <div style="display:grid;grid-template-columns:auto 1fr;gap:.22rem .45rem;font-size:.69rem;align-items:center">
      <span style="color:var(--muted2)">ESTADO</span>
      <span style="background:${col}22;color:${col};padding:1px 8px;border-radius:10px;font-weight:700;font-size:.62rem;display:inline-block">${est}</span>
      <span style="color:var(--muted2)">AVANCE</span>
      <div>
        <span style="font-weight:800;color:${col}">${pct}%</span>
        <div style="height:4px;background:rgba(255,255,255,.1);border-radius:2px;margin-top:2px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:${col};border-radius:2px"></div>
        </div>
      </div>
      ${c.cota?`<span style="color:var(--muted2)">COTA</span><span style="font-weight:700">${c.cota} msnm</span>`:''}
      ${volEjec?`<span style="color:var(--muted2)">VOL. EJEC.</span><span style="font-weight:700">${volEjec}</span>`:''}
      ${c.volM3&&!volEjec?`<span style="color:var(--muted2)">VOLUMEN</span><span>${(+c.volM3).toLocaleString('es-PE',{maximumFractionDigits:0})} m³</span>`:''}
      ${c.areaM2?`<span style="color:var(--muted2)">ÁREA</span><span>${(+c.areaM2).toLocaleString('es-PE',{maximumFractionDigits:0})} m²</span>`:''}
      ${c.fechaIni?`<span style="color:var(--muted2)">INICIO</span><span>${c.fechaIni}</span>`:''}
      ${wbs?`<span style="color:var(--muted2)">WBS</span><span style="font-size:.63rem">${wbs.codigo||''}</span>`:''}
      ${c.notas?`<span style="color:var(--muted2)">NOTAS</span><span style="font-size:.63rem">${c.notas}</span>`:''}
    </div>
    ${hist.length>0?`<div style="margin-top:.5rem;border-top:1px solid var(--border);padding-top:.4rem">
      <div style="font-size:.57rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:.25rem">Historial de avance</div>
      <div style="display:flex;flex-direction:column;gap:.12rem">
        ${hist.map(e=>{const hc=+e.pct>=100?'#10b981':+e.pct>50?'#f59e0b':'#6b7280';return`<div style="display:flex;align-items:center;gap:.3rem;font-size:.62rem">
          <span style="color:var(--muted2);min-width:62px;font-size:.58rem">${e.fecha}</span>
          <div style="flex:1;height:4px;background:rgba(255,255,255,.07);border-radius:2px;overflow:hidden"><div style="height:100%;width:${e.pct}%;background:${hc};border-radius:2px"></div></div>
          <span style="font-weight:700;color:${hc};min-width:28px;text-align:right">${e.pct}%</span>
          ${e.notas?`<span style="color:var(--muted2);font-size:.55rem;max-width:70px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${e.notas}">${e.notas}</span>`:''}
        </div>`;}).join('')}
      </div>
    </div>`:''}
    <button onclick="document.getElementById('recPopupWrap').style.display='none';_recEditCapa(${c.id})" style="margin-top:.6rem;width:100%;background:${dq.color}22;border:1px solid ${dq.color}40;border-radius:6px;color:${dq.color};cursor:pointer;padding:.3rem;font-size:.67rem;font-weight:700">✎ Editar / Registrar avance</button>`;

  // Posicionar cerca del polígono
  const canvas=document.getElementById('recCanvas');
  const svg=document.getElementById('recSvg');
  let left=300, top=200;
  if(canvas&&svg){
    const r=canvas.getBoundingClientRect();
    left=r.left+(svgCx/svg.clientWidth)*r.width+12;
    top=r.top+(svgCy/svg.clientHeight)*r.height-70;
  }
  left=Math.max(10,Math.min(window.innerWidth-275,left));
  top=Math.max(10,Math.min(window.innerHeight-320,top));
  popup.style.left=left+'px';
  popup.style.top=top+'px';
  wrap.style.display='block';
}

// ══ CRUD ══════════════════════════════════════════════════════════════════════

// Los puntos en progreso (_recAreaPuntos) son coordenadas relativas a la imagen activa (Sección o Planta) —
// al cambiar de dique o de vista hay que descartarlos, si no el trazo queda deformado sobre la otra imagen.
function _recSetDique(k){_recDique=k;_recSelCapaId=null;_recDibujando=false;_recAreaPuntos=[];rRecrecimiento();}
function _recSetVista(v){_recVista=v;_recDibujando=false;_recAreaPuntos=[];rRecrecimiento();}

function _recAddCapa(dique){
  document.getElementById('rcId').value='';
  document.getElementById('rcDique').value=dique||_recDique;
  document.getElementById('rcNombre').value='';
  document.getElementById('rcCota').value='';
  document.getElementById('rcPct').value='0';
  document.getElementById('rcFechaIni').value='';
  document.getElementById('rcFechaFin').value='';
  document.getElementById('rcVolM3').value='';
  document.getElementById('rcAreaM2').value='';
  document.getElementById('rcWbs').value='';
  document.getElementById('rcNotas').value='';
  document.getElementById('rcBtnDel').style.display='none';
  const hp=document.getElementById('rcHistPanel');if(hp)hp.style.display='none';
  document.getElementById('mRecCapa').style.display='flex';
}

function _recEditCapa(id){
  const c=(DB.capas||[]).find(x=>x.id==id);if(!c)return;
  document.getElementById('rcId').value=c.id;
  document.getElementById('rcDique').value=c.dique||_recDique;
  document.getElementById('rcNombre').value=c.nombre||'';
  document.getElementById('rcCota').value=c.cota||'';
  document.getElementById('rcPct').value=c.pctAvance||0;
  document.getElementById('rcFechaIni').value=c.fechaIni||'';
  document.getElementById('rcFechaFin').value=c.fechaFin||'';
  document.getElementById('rcVolM3').value=c.volM3||'';
  document.getElementById('rcAreaM2').value=c.areaM2||'';
  document.getElementById('rcWbs').value=c.wbsId||'';
  document.getElementById('rcNotas').value=c.notas||'';
  document.getElementById('rcBtnDel').style.display='';
  document.getElementById('mRecCapa').style.display='flex';
  _recHistEditId=null; // al abrir otra capa, salir del modo edición del historial
  setTimeout(()=>_recRenderHistorial(id),30);
}

async function _recSaveCapa(){
  const id=document.getElementById('rcId').value;
  const rec={
    dique:document.getElementById('rcDique').value,
    nombre:document.getElementById('rcNombre').value.trim(),
    cota:+document.getElementById('rcCota').value||null,
    pct_avance:+document.getElementById('rcPct').value||0,
    fecha_ini:document.getElementById('rcFechaIni').value||null,
    fecha_fin:document.getElementById('rcFechaFin').value||null,
    vol_m3:+document.getElementById('rcVolM3').value||null,
    area_m2:+document.getElementById('rcAreaM2').value||null,
    wbs_id:document.getElementById('rcWbs').value||null,
    notas:document.getElementById('rcNotas').value.trim()||null,
  };
  if(!rec.nombre){alert('Ingresa el nombre de la capa (ej: C-01)');return;}
  if(id)rec.id=+id;else rec.id=DB.nx.cap++;

  const{error}=await supa.from('capas').upsert(rec);
  if(error){alert('Error al guardar: '+error.message);return;}

  const idx=(DB.capas||[]).findIndex(x=>x.id==rec.id);
  const camelRec=toCamel(rec);
  // Preservar puntos existentes al actualizar
  if(idx>=0){camelRec.puntos=DB.capas[idx].puntos||[];DB.capas[idx]=camelRec;}
  else{(DB.capas=DB.capas||[]).push(camelRec);}

  document.getElementById('mRecCapa').style.display='none';
  rRecrecimiento();
}

async function _recDelCapa(){
  const id=+document.getElementById('rcId').value;
  if(!id||!confirm('¿Eliminar esta capa?'))return;
  const{error}=await supa.from('capas').delete().eq('id',id);
  if(error){alert('Error: '+error.message);return;}
  DB.capas=(DB.capas||[]).filter(x=>x.id!==id);
  if(_recSelCapaId===id)_recSelCapaId=null;
  document.getElementById('mRecCapa').style.display='none';
  rRecrecimiento();
}

async function _recQuickPct(id,val){
  val=Math.min(100,Math.max(0,+val||0));
  const{error}=await supa.from('capas').update({pct_avance:val}).eq('id',id);
  if(!error){const c=(DB.capas||[]).find(x=>x.id==id);if(c)c.pctAvance=val;}
  rRecrecimiento();
}

// ══ IMPORTAR DXF ══════════════════════════════════════════════════════════════

let _recDxfEntities=[], _recDxfSelIdx=null, _recDxfBB=null;

function _recAbrirDXF(){
  // Inyectar input file invisible y activarlo
  let inp=document.getElementById('_recDxfInput');
  if(!inp){
    inp=document.createElement('input');
    inp.id='_recDxfInput';inp.type='file';inp.accept='.dxf';inp.style.display='none';
    inp.addEventListener('change',_recDxfOnFile);
    document.body.appendChild(inp);
  }
  inp.value='';
  inp.click();
}

function _recDxfOnFile(e){
  const file=e.target.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=ev=>{
    try{
      _recDxfEntities=_parseDXF(ev.target.result);
      _recDxfSelIdx=null;
      _recMostrarModalDXF();
    }catch(err){toast('Error leyendo DXF: '+err.message,true);}
  };
  reader.readAsText(file,'utf-8');
}

function _parseDXF(text){
  const lines=text.replace(/\r/g,'').split('\n').map(l=>l.trim());
  const entities=[];
  let i=0;
  while(i<lines.length-1){
    const code=lines[i], val=lines[i+1];
    if(code==='0'&&val==='LWPOLYLINE'){
      const pts=[],ent={type:'LWPOLYLINE',layer:'0',closed:false,pts};
      i+=2;
      while(i<lines.length-1&&!(lines[i]==='0')){
        const c=lines[i],v=lines[i+1];
        if(c==='8')ent.layer=v;
        if(c==='70')ent.closed=(+v&1)===1;
        if(c==='10')pts.push({x:parseFloat(v),y:0});
        if(c==='20'&&pts.length)pts[pts.length-1].y=parseFloat(v);
        i+=2;
      }
      if(pts.length>=3)entities.push(ent);
    } else if(code==='0'&&val==='POLYLINE'){
      const pts=[],ent={type:'POLYLINE',layer:'0',closed:false,pts};
      i+=2;
      while(i<lines.length-1){
        if(lines[i]==='0'&&lines[i+1]==='VERTEX'){
          let vx=0,vy=0;i+=2;
          while(i<lines.length-1&&!(lines[i]==='0')){
            if(lines[i]==='10')vx=parseFloat(lines[i+1]);
            if(lines[i]==='20')vy=parseFloat(lines[i+1]);
            i+=2;
          }
          pts.push({x:vx,y:vy});
        } else if(lines[i]==='0'&&lines[i+1]==='SEQEND'){i+=2;break;}
        else i+=2;
      }
      if(pts.length>=3)entities.push(ent);
    } else {i+=2;}
  }
  return entities;
}

function _recDxfBBox(ents){
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  ents.forEach(e=>e.pts.forEach(p=>{
    if(p.x<minX)minX=p.x;if(p.x>maxX)maxX=p.x;
    if(p.y<minY)minY=p.y;if(p.y>maxY)maxY=p.y;
  }));
  return{minX,minY,maxX,maxY,w:maxX-minX,h:maxY-minY};
}

function _recMostrarModalDXF(){
  const dq=_REC_DIQUES.find(d=>d.key===_recDique)||_REC_DIQUES[0];
  const capas=(DB.capas||[]).filter(c=>c.dique===_recDique).sort((a,b)=>b.cota-a.cota);
  _recDxfBB=_recDxfBBox(_recDxfEntities);
  const n=_recDxfEntities.length;

  // Crear o reusar modal
  let modal=document.getElementById('mRecDXF');
  if(!modal){modal=document.createElement('div');modal.id='mRecDXF';document.body.appendChild(modal);}
  modal.style.cssText='display:flex;position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:1000;align-items:center;justify-content:center';

  modal.innerHTML=`
    <div style="background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:1rem 1.2rem;width:780px;max-width:96vw;max-height:94vh;display:flex;flex-direction:column;gap:.6rem">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div style="font-weight:800;font-size:.9rem;color:#8b5cf6">📐 Importar desde DXF · ${n} polilíneas encontradas</div>
        <button onclick="document.getElementById('mRecDXF').style.display='none'" style="background:none;border:none;color:var(--muted2);cursor:pointer;font-size:1.1rem">✕</button>
      </div>

      <div style="font-size:.63rem;color:var(--muted2)">
        Rango DXF: X [${_recDxfBB.minX.toFixed(0)} – ${_recDxfBB.maxX.toFixed(0)}] · Y [${_recDxfBB.minY.toFixed(0)} – ${_recDxfBB.maxY.toFixed(0)}]
        · Haz clic en una polilínea del plano para seleccionarla
      </div>

      <!-- Canvas DXF -->
      <div style="flex:1;min-height:0;position:relative;background:#0d1117;border:1px solid var(--border);border-radius:8px;overflow:hidden">
        <canvas id="recDxfCanvas" style="display:block;width:100%;height:100%"></canvas>
        <div style="position:absolute;top:.3rem;left:.3rem;font-size:.58rem;color:#4ade80;opacity:.6">${_recDxfSelIdx!==null?`Seleccionada: polilínea #${_recDxfSelIdx+1} (${_recDxfEntities[_recDxfSelIdx].pts.length} vértices)`:'Ninguna seleccionada'}</div>
      </div>

      <!-- Controles de asignación -->
      <div style="display:flex;align-items:center;gap:.6rem;flex-wrap:wrap">
        <label style="font-size:.65rem;color:var(--muted2)">Asignar a capa:</label>
        <select id="recDxfCapaSel" style="background:var(--panel2);border:1px solid var(--border);border-radius:6px;padding:.3rem .5rem;color:var(--text);font-size:.72rem;flex:1">
          <option value="">— Seleccionar capa —</option>
          ${capas.map(c=>`<option value="${c.id}" ${_recSelCapaId===c.id?'selected':''}>${c.nombre||'—'} · ${c.cota||''}m</option>`).join('')}
        </select>
        <button onclick="_recDxfAsignar()" style="padding:.3rem .9rem;border-radius:6px;background:#8b5cf6;border:none;color:#fff;font-weight:700;font-size:.72rem;cursor:pointer">✅ Asignar</button>
        <button onclick="document.getElementById('mRecDXF').style.display='none'" style="padding:.3rem .7rem;border-radius:6px;background:var(--panel2);border:1px solid var(--border);color:var(--muted2);font-size:.72rem;cursor:pointer">Cancelar</button>
      </div>
    </div>`;

  // Dibujar canvas después de insertar en DOM
  requestAnimationFrame(_recDxfDrawCanvas);
  const canvas=document.getElementById('recDxfCanvas');
  if(canvas)canvas.addEventListener('click',_recDxfCanvasClick);
}

function _recDxfDrawCanvas(){
  const canvas=document.getElementById('recDxfCanvas');if(!canvas)return;
  const wrap=canvas.parentElement;
  canvas.width=wrap.clientWidth;canvas.height=wrap.clientHeight;
  const ctx=canvas.getContext('2d');
  const W=canvas.width,H=canvas.height;
  ctx.fillStyle='#0d1117';ctx.fillRect(0,0,W,H);

  const bb=_recDxfBB;if(!bb||!bb.w||!bb.h)return;
  const pad=30;
  const scaleX=(W-pad*2)/bb.w;
  const scaleY=(H-pad*2)/bb.h;
  const scale=Math.min(scaleX,scaleY);
  const offX=pad+(W-pad*2-bb.w*scale)/2;
  const offY=pad+(H-pad*2-bb.h*scale)/2;

  function toScreen(p){return{sx:offX+(p.x-bb.minX)*scale, sy:offY+(bb.maxY-p.y)*scale};}

  _recDxfEntities.forEach((ent,idx)=>{
    const sel=idx===_recDxfSelIdx;
    ctx.beginPath();
    ent.pts.forEach((p,j)=>{const s=toScreen(p);j===0?ctx.moveTo(s.sx,s.sy):ctx.lineTo(s.sx,s.sy);});
    if(ent.closed)ctx.closePath();
    ctx.strokeStyle=sel?'#f59e0b':'#4ade80';
    ctx.lineWidth=sel?2.5:1;
    ctx.stroke();
    if(sel){
      ctx.fillStyle='rgba(245,158,11,.15)';ctx.fill();
      // Nro de vértices en centroide
      const cx=ent.pts.reduce((s,p)=>s+p.x,0)/ent.pts.length;
      const cy=ent.pts.reduce((s,p)=>s+p.y,0)/ent.pts.length;
      const sc=toScreen({x:cx,y:cy});
      ctx.fillStyle='#f59e0b';ctx.font='bold 11px sans-serif';ctx.textAlign='center';
      ctx.fillText(`${ent.pts.length} pts`,sc.sx,sc.sy);
    }
  });
}

function _recDxfCanvasClick(e){
  const canvas=document.getElementById('recDxfCanvas');if(!canvas)return;
  const r=canvas.getBoundingClientRect();
  const mx=(e.clientX-r.left)*(canvas.width/r.width);
  const my=(e.clientY-r.top)*(canvas.height/r.height);

  const bb=_recDxfBB;
  const W=canvas.width,H=canvas.height;
  const pad=30;
  const scaleX=(W-pad*2)/bb.w, scaleY=(H-pad*2)/bb.h;
  const scale=Math.min(scaleX,scaleY);
  const offX=pad+(W-pad*2-bb.w*scale)/2;
  const offY=pad+(H-pad*2-bb.h*scale)/2;
  function toScreen(p){return{sx:offX+(p.x-bb.minX)*scale, sy:offY+(bb.maxY-p.y)*scale};}

  // Encontrar entidad más cercana al click
  let best=-1,bestDist=Infinity;
  _recDxfEntities.forEach((ent,idx)=>{
    for(let i=0;i<ent.pts.length-1;i++){
      const a=toScreen(ent.pts[i]),b=toScreen(ent.pts[i+1]);
      // Distancia punto a segmento
      const dx=b.sx-a.sx,dy=b.sy-a.sy;
      const t=Math.max(0,Math.min(1,((mx-a.sx)*dx+(my-a.sy)*dy)/(dx*dx+dy*dy)||0));
      const d=Math.hypot(mx-a.sx-t*dx,my-a.sy-t*dy);
      if(d<bestDist){bestDist=d;best=idx;}
    }
  });
  if(best>=0&&bestDist<20){
    _recDxfSelIdx=best;
    _recDxfDrawCanvas();
    // Actualizar texto de selección
    const lbl=document.querySelector('#mRecDXF .rec-dxf-sel');
    const info=document.querySelector('#mRecDXF canvas+div');
    if(info)info.textContent=`Seleccionada: polilínea #${best+1} (${_recDxfEntities[best].pts.length} vértices) · capa: ${_recDxfEntities[best].layer}`;
  }
}

async function _recDxfAsignar(){
  if(_recDxfSelIdx===null){toast('Selecciona primero una polilínea en el plano',true);return;}
  const capaId=+document.getElementById('recDxfCapaSel').value;
  if(!capaId){toast('Selecciona a qué capa asignar',true);return;}

  const ent=_recDxfEntities[_recDxfSelIdx];
  const bb=_recDxfBB;

  // Convertir puntos DXF a porcentajes de imagen (Y invertido)
  const pts=ent.pts.map(p=>({
    x:parseFloat(((p.x-bb.minX)/bb.w*100).toFixed(2)),
    y:parseFloat(((1-(p.y-bb.minY)/bb.h)*100).toFixed(2))
  }));

  const{error}=await supa.from('capas').update({puntos:pts}).eq('id',capaId);
  if(error){toast('Error al guardar: '+error.message,true);return;}
  const c=(DB.capas||[]).find(x=>x.id===capaId);
  if(c)c.puntos=pts;

  const nombre=c?c.nombre:'capa';
  toast(`✓ Polilínea asignada a "${nombre}" (${pts.length} vértices)`);
  document.getElementById('mRecDXF').style.display='none';
  _recSelCapaId=capaId;
  rRecrecimiento();
  setTimeout(_recRenderCapasSvg,200);
}

// ══ DETECCIÓN DE BORDES (Sobel) ══════════════════════════════════════════════

function _recSnapToEdge(xPct,yPct){
  if(!_recSnapEnabled||!_recEdgeMap)return{x:xPct,y:yPct,snapped:false};
  const{edges,width,height}=_recEdgeMap;
  const xPx=Math.round(xPct*width/100);
  const yPx=Math.round(yPct*height/100);
  const R=_recSnapRadius;
  let bestDist=Infinity,bestX=xPx,bestY=yPx;
  for(let dy=-R;dy<=R;dy++){
    for(let dx=-R;dx<=R;dx++){
      const nx=xPx+dx,ny=yPx+dy;
      if(nx<0||nx>=width||ny<0||ny>=height)continue;
      if(edges[ny*width+nx]>0){
        const d=dx*dx+dy*dy;
        if(d<bestDist){bestDist=d;bestX=nx;bestY=ny;}
      }
    }
  }
  const snapped=bestDist<Infinity;
  return{x:bestX/width*100,y:bestY/height*100,snapped};
}

function _sobelEdgeDetect(imageData,threshold){
  const w=imageData.width,h=imageData.height;
  const d=imageData.data;
  const gray=new Float32Array(w*h);
  for(let i=0;i<w*h;i++){gray[i]=0.299*d[i*4]+0.587*d[i*4+1]+0.114*d[i*4+2];}
  const edges=new Uint8Array(w*h);
  for(let y=1;y<h-1;y++){
    for(let x=1;x<w-1;x++){
      const gx=-gray[(y-1)*w+(x-1)]-2*gray[y*w+(x-1)]-gray[(y+1)*w+(x-1)]
               +gray[(y-1)*w+(x+1)]+2*gray[y*w+(x+1)]+gray[(y+1)*w+(x+1)];
      const gy=-gray[(y-1)*w+(x-1)]-2*gray[(y-1)*w+x]-gray[(y-1)*w+(x+1)]
               +gray[(y+1)*w+(x-1)]+2*gray[(y+1)*w+x]+gray[(y+1)*w+(x+1)];
      if(Math.sqrt(gx*gx+gy*gy)>threshold)edges[y*w+x]=255;
    }
  }
  return{edges,width:w,height:h};
}

function _recDetectarLineas(){
  const img=document.getElementById('recImg');
  if(!img||!img.naturalWidth){toast('Carga la imagen de la sección primero',true);return;}
  const tmp=document.createElement('canvas');
  tmp.width=img.naturalWidth;tmp.height=img.naturalHeight;
  const ctx=tmp.getContext('2d');
  try{
    ctx.drawImage(img,0,0);
    const imgData=ctx.getImageData(0,0,tmp.width,tmp.height);
    _recEdgeMap=_sobelEdgeDetect(imgData,_recEdgeThreshold);
    _recShowEdges=true;
    _recSnapEnabled=true;
    _recMostrarEdgeOverlay();
    _recUpdateEdgePanel();
    toast('✓ Bordes detectados — cursor se ajustará a las líneas');
  }catch(err){
    toast('No se pudo acceder a la imagen (posible CORS)',true);
  }
}

function _recMostrarEdgeOverlay(){
  const c=document.getElementById('recEdgeCanvas');
  if(!c||!_recEdgeMap)return;
  const{edges,width,height}=_recEdgeMap;
  c.width=width;c.height=height;
  const ctx=c.getContext('2d');
  const out=ctx.createImageData(width,height);
  for(let i=0;i<width*height;i++){
    if(edges[i]>0){out.data[i*4]=0;out.data[i*4+1]=220;out.data[i*4+2]=220;out.data[i*4+3]=210;}
  }
  ctx.putImageData(out,0,0);
  c.style.display=_recShowEdges?'block':'none';
}

function _recUpdateEdgePanel(){
  const el=document.getElementById('recEdgeControls');
  if(!el)return;
  if(!_recEdgeMap){el.innerHTML='';return;}
  el.innerHTML=
    '<div style="display:flex;align-items:center;gap:.25rem;margin-top:.25rem;flex-wrap:wrap">'
    +'<button id="recEdgeTogBtn" onclick="_recToggleEdges()" style="padding:.18rem .4rem;border-radius:5px;border:1px solid #06b6d440;background:rgba(6,182,212,.1);color:'+(_recShowEdges?'#06b6d4':'#6b7280')+';font-size:.58rem;cursor:pointer">👁 '+(_recShowEdges?'Ocultar':'Ver')+'</button>'
    +'<button id="recSnapTogBtn" onclick="_recToggleSnap()" style="padding:.18rem .4rem;border-radius:5px;border:1px solid #10b98140;background:rgba(16,185,129,.1);color:'+(_recSnapEnabled?'#10b981':'#6b7280')+';font-size:.58rem;cursor:pointer;font-weight:700">⊙ Snap '+(_recSnapEnabled?'ON':'OFF')+'</button>'
    +'<button onclick="_recDetectarLineas()" style="padding:.18rem .35rem;border-radius:5px;border:1px solid #f59e0b40;background:rgba(245,158,11,.1);color:#f59e0b;font-size:.58rem;cursor:pointer">🔄 Re-detect</button>'
    +'</div>'
    +'<div style="display:flex;align-items:center;gap:.3rem;margin-top:.2rem">'
    +'<span style="font-size:.55rem;color:var(--muted2)">Sensib.</span>'
    +'<input type="range" min="10" max="150" value="'+_recEdgeThreshold+'" step="5" style="flex:1;accent-color:#06b6d4;height:3px" oninput="_recEdgeThreshold=+this.value;_recReDetect()">'
    +'<span style="font-size:.56rem;font-weight:700;color:#06b6d4;min-width:20px">'+_recEdgeThreshold+'</span>'
    +'<span style="font-size:.55rem;color:var(--muted2);margin-left:.3rem">Snap radio</span>'
    +'<input type="range" min="4" max="30" value="'+_recSnapRadius+'" step="2" style="flex:1;accent-color:#10b981;height:3px" oninput="_recSnapRadius=+this.value">'
    +'</div>';
}

function _recToggleEdges(){
  _recShowEdges=!_recShowEdges;
  const c=document.getElementById('recEdgeCanvas');
  if(c)c.style.display=_recShowEdges?'block':'none';
  if(_recShowEdges&&_recEdgeMap)_recMostrarEdgeOverlay();
  const b=document.getElementById('recEdgeTogBtn');
  if(b){b.textContent='👁 '+(_recShowEdges?'Ocultar':'Ver');b.style.color=_recShowEdges?'#06b6d4':'#6b7280';}
}

function _recToggleSnap(){
  _recSnapEnabled=!_recSnapEnabled;
  const b=document.getElementById('recSnapTogBtn');
  if(b){b.textContent='⊙ Snap '+(_recSnapEnabled?'ON':'OFF');b.style.color=_recSnapEnabled?'#10b981':'#6b7280';}
}

function _recReDetect(){
  if(!_recEdgeMap)return;
  const img=document.getElementById('recImg');
  if(!img||!img.naturalWidth)return;
  const tmp=document.createElement('canvas');
  tmp.width=img.naturalWidth;tmp.height=img.naturalHeight;
  const ctx=tmp.getContext('2d');
  try{
    ctx.drawImage(img,0,0);
    _recEdgeMap=_sobelEdgeDetect(ctx.getImageData(0,0,tmp.width,tmp.height),_recEdgeThreshold);
    if(_recShowEdges)_recMostrarEdgeOverlay();
  }catch(e){}
}

// ══ HISTORIAL DE AVANCE ═══════════════════════════════════════════════════════

let _recHistEditId=null; // id del registro de avance en edición (null = agregando)
function _recRenderHistorial(capaId){
  const panel=document.getElementById('rcHistPanel');if(!panel)return;
  const entries=(DB.capasAvance||[]).filter(e=>+e.capaId===+capaId).sort((a,b)=>a.fecha<b.fecha?-1:1);
  panel.style.display='';
  const today=new Date().toISOString().slice(0,10);
  panel.innerHTML=`
    <div style="font-size:.65rem;font-weight:700;color:#10b981;margin-bottom:.45rem">📈 Historial de Avance${_recHistEditId?' <span style="color:#f59e0b">· editando registro</span>':''}</div>
    <div style="display:flex;gap:.3rem;margin-bottom:.45rem;align-items:flex-end">
      <div style="flex:1.2">
        <div style="font-size:.57rem;color:var(--muted2);margin-bottom:.1rem">Fecha</div>
        <input id="rcHFecha" type="date" value="${today}" style="width:100%;background:var(--panel2);border:1px solid var(--border);border-radius:5px;padding:.25rem .4rem;color:var(--text);font-size:.72rem">
      </div>
      <div style="flex:0.7">
        <div style="font-size:.57rem;color:var(--muted2);margin-bottom:.1rem">% Avance</div>
        <input id="rcHPct" type="number" min="0" max="100" step="0.1" placeholder="0" oninput="_recHSync('pct',${capaId})" style="width:100%;background:var(--panel2);border:1px solid var(--border);border-radius:5px;padding:.25rem .4rem;color:var(--text);font-size:.72rem">
      </div>
      <div style="flex:0.9">
        <div style="font-size:.57rem;color:#38bdf8;margin-bottom:.1rem">Área m²</div>
        <input id="rcHArea" type="number" min="0" step="0.1" placeholder="0.0" oninput="_recHSync('area',${capaId})" title="Al escribir el área, el % se calcula solo (y viceversa)" style="width:100%;background:var(--panel2);border:1px solid #38bdf855;border-radius:5px;padding:.25rem .4rem;color:var(--text);font-size:.72rem">
      </div>
      <div style="flex:1.1">
        <div style="font-size:.57rem;color:var(--muted2);margin-bottom:.1rem">Notas (opcional)</div>
        <input id="rcHNotas" placeholder="..." style="width:100%;background:var(--panel2);border:1px solid var(--border);border-radius:5px;padding:.25rem .4rem;color:var(--text);font-size:.72rem">
      </div>
      <button onclick="_recSaveAvance(${capaId})" style="padding:.28rem .55rem;border-radius:5px;background:${_recHistEditId?'rgba(245,158,11,.12)':'rgba(16,185,129,.12)'};border:1px solid ${_recHistEditId?'#f59e0b40':'#10b98140'};color:${_recHistEditId?'#f59e0b':'#10b981'};font-size:.65rem;font-weight:700;cursor:pointer;white-space:nowrap;flex-shrink:0">${_recHistEditId?'💾 Guardar':'＋ Agregar'}</button>
      ${_recHistEditId?`<button onclick="_recCancelEditAvance(${capaId})" title="Cancelar edición" style="padding:.28rem .45rem;border-radius:5px;background:none;border:1px solid var(--border);color:var(--muted2);font-size:.65rem;cursor:pointer;flex-shrink:0">✕</button>`:''}
    </div>
    ${entries.length===0
      ?`<div style="font-size:.6rem;color:var(--muted2);text-align:center;padding:.3rem 0">Sin registros aún — agrega el primer avance</div>`
      :`<div style="display:flex;flex-direction:column;gap:.13rem;max-height:130px;overflow-y:auto">
          ${entries.map(e=>{
            const col=+e.pct>=100?'#10b981':+e.pct>60?'#f59e0b':+e.pct>0?'#6b7280':'#374151';
            const editando=+e.id===+_recHistEditId;
            return`<div style="display:flex;align-items:center;gap:.35rem;padding:.18rem .3rem;background:${editando?'rgba(245,158,11,.1)':'var(--panel2)'};border-radius:5px;${editando?'border:1px solid #f59e0b60':''}">
              <span style="color:var(--muted2);font-size:.6rem;min-width:62px">${e.fecha}</span>
              <div style="flex:1;height:5px;background:rgba(255,255,255,.07);border-radius:3px;overflow:hidden">
                <div style="height:100%;width:${e.pct}%;background:${col};border-radius:3px"></div>
              </div>
              <span style="font-weight:800;color:${col};min-width:28px;text-align:right;font-size:.67rem">${e.pct}%</span>
              <span style="color:#38bdf8;font-size:.58rem;min-width:52px;text-align:right;font-family:monospace">${(()=>{const a=+e.areaM2||_recHAreaCapa(capaId)*(+e.pct||0)/100;return a?a.toLocaleString('es-PE',{maximumFractionDigits:1})+' m²':'';})()}</span>
              ${e.notas?`<span style="color:var(--muted2);font-size:.57rem;max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${e.notas}">${e.notas}</span>`:''}
              <button onclick="_recEditAvance(${e.id},${capaId})" style="background:none;border:none;color:#f59e0b99;cursor:pointer;font-size:.65rem;padding:0;line-height:1;flex-shrink:0" title="Editar fecha, % y notas">✏</button>
              <button onclick="_recDelAvance(${e.id},${capaId})" style="background:none;border:none;color:#ef444455;cursor:pointer;font-size:.7rem;padding:0;line-height:1;flex-shrink:0" title="Eliminar">✕</button>
            </div>`;
          }).join('')}
        </div>`}`;
}

// Área total (m²) de la capa: de la base o del campo del formulario si aún no se guardó
function _recHAreaCapa(capaId){
  const c=(DB.capas||[]).find(x=>+x.id===+capaId);
  return +((c&&c.areaM2)||document.getElementById('rcAreaM2')?.value||0);
}
// Sincroniza % Avance ⇄ Área m² (escribes uno y el otro se calcula con el área total de la capa)
function _recHSync(src,capaId){
  const A=_recHAreaCapa(capaId);if(!A)return;
  const ePct=document.getElementById('rcHPct'),eAr=document.getElementById('rcHArea');
  if(!ePct||!eAr)return;
  if(src==='pct'){
    const p=+ePct.value;
    eAr.value=(ePct.value!==''&&!isNaN(p))?+(p*A/100).toFixed(1):'';
  }else{
    const a=+eAr.value;
    ePct.value=(eAr.value!==''&&!isNaN(a))?Math.min(100,+(a/A*100).toFixed(1)):'';
  }
}
// Cargar un registro en los campos de arriba para editarlo
function _recEditAvance(id,capaId){
  const e=(DB.capasAvance||[]).find(x=>+x.id===+id);if(!e)return;
  _recHistEditId=+id;
  _recRenderHistorial(capaId);
  document.getElementById('rcHFecha').value=e.fecha||'';
  document.getElementById('rcHPct').value=e.pct;
  const _a=document.getElementById('rcHArea');
  if(_a)_a.value=e.areaM2!=null?e.areaM2:(_recHAreaCapa(capaId)?+(_recHAreaCapa(capaId)*(+e.pct||0)/100).toFixed(1):'');
  document.getElementById('rcHNotas').value=e.notas||'';
  document.getElementById('rcHPct').focus();
}
function _recCancelEditAvance(capaId){
  _recHistEditId=null;
  _recRenderHistorial(capaId);
}
async function _recSaveAvance(capaId){
  const fecha=document.getElementById('rcHFecha').value;
  const pct=+document.getElementById('rcHPct').value;
  const areaVal=+document.getElementById('rcHArea')?.value||null;
  const notas=(document.getElementById('rcHNotas').value||'').trim();
  if(!fecha){toast('Selecciona una fecha',true);return;}
  if(isNaN(pct)||pct<0||pct>100){toast('% debe ser entre 0 y 100',true);return;}

  if(_recHistEditId){
    // ── MODO EDICIÓN: actualizar el registro existente ──
    const{error}=await supa.from('capas_avance').update({fecha,pct,notas:notas||null,area_m2:areaVal}).eq('id',_recHistEditId);
    if(error){toast('Error al guardar: '+error.message,true);return;}
    const e=(DB.capasAvance||[]).find(x=>+x.id===+_recHistEditId);
    if(e){e.fecha=fecha;e.pct=pct;e.notas=notas||null;e.areaM2=areaVal;}
    _recHistEditId=null;
  }else{
    const id=DB.nx.cav++;
    const{error}=await supa.from('capas_avance').insert({id,capa_id:+capaId,fecha,pct,notas:notas||null,area_m2:areaVal});
    if(error){toast('Error al guardar: '+error.message,true);DB.nx.cav--;return;}
    (DB.capasAvance=DB.capasAvance||[]).push({id,capaId:+capaId,fecha,pct,notas:notas||null,areaM2:areaVal});
  }

  // Actualizar pct_avance de la capa al valor más reciente (mayor fecha)
  const allE=(DB.capasAvance||[]).filter(e=>+e.capaId===+capaId).sort((a,b)=>a.fecha<b.fecha?1:-1);
  const latestPct=allE[0]?.pct??pct;
  const{error:e2}=await supa.from('capas').update({pct_avance:latestPct}).eq('id',+capaId);
  if(!e2){
    const c=(DB.capas||[]).find(x=>+x.id===+capaId);
    if(c)c.pctAvance=latestPct;
    const rcPct=document.getElementById('rcPct');
    if(rcPct)rcPct.value=latestPct;
  }

  document.getElementById('rcHPct').value='';
  const _hA=document.getElementById('rcHArea');if(_hA)_hA.value='';
  document.getElementById('rcHNotas').value='';
  _recRenderHistorial(capaId);
  toast('✓ Avance guardado');
}

async function _recDelAvance(id,capaId){
  if(!confirm('¿Eliminar este registro de avance?'))return;
  const{error}=await supa.from('capas_avance').delete().eq('id',+id);
  if(error){toast('Error: '+error.message,true);return;}
  DB.capasAvance=(DB.capasAvance||[]).filter(e=>+e.id!==+id);

  // Actualizar pct_avance al registro más reciente restante
  const remaining=(DB.capasAvance||[]).filter(e=>+e.capaId===+capaId).sort((a,b)=>a.fecha<b.fecha?1:-1);
  const latestPct=remaining.length>0?remaining[0].pct:+document.getElementById('rcPct').value||0;
  const{error:e2}=await supa.from('capas').update({pct_avance:latestPct}).eq('id',+capaId);
  if(!e2){
    const c=(DB.capas||[]).find(x=>+x.id===+capaId);
    if(c)c.pctAvance=latestPct;
  }

  _recRenderHistorial(capaId);
}
