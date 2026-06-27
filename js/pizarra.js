// ══ PIZARRA DE DESPLIEGUE ══
function _pizImgUrl(){return window.location.href.replace(/[^\/\\]+$/,'')+'09.-ERP/Imagenes/R3_2026_IMAGEN.png';}
function _pizImgUrlIso(){return window.location.href.replace(/[^\/\\]+$/,'')+'09.-ERP/Imagenes/R3_2026_IMAGEN_isometrico.JPG';}
function _pizCurrentImgUrl(){return _pizActiveTabKey==='iso'?_pizImgUrlIso():_pizImgUrl();}
let _pizTab=1,_pizMoving=null,_pizFecha=null,_realSelFrente=null,_rutaZoomLocked=false;
let _rutaVistaIso=false;
let _pizActiveTabKey='plan';
function _pizGetFecha(){return _pizFecha||today();}

function rPizarra(){
  // Aplicar restricción de tabs según usuario
  const allowed=CU&&CU.pizarraTabs?CU.pizarraTabs:null;
  document.querySelectorAll('[data-piz-tab]').forEach(btn=>{
    const t=+btn.dataset.pizTab;
    btn.style.display=(!allowed||allowed.includes(t))?'':'none';
  });
  // Si el tab actual no está permitido, saltar al primero permitido
  if(allowed&&!allowed.includes(_pizTab)){
    _pizTab=allowed[0];
    document.querySelectorAll('[data-piz-tab]').forEach(btn=>btn.classList.toggle('active',+btn.dataset.pizTab===_pizTab));
  }
  _pizRenderTab();
}

function _pizTabSwitch(n){
  const allowed=CU&&CU.pizarraTabs?CU.pizarraTabs:null;
  if(allowed&&!allowed.includes(n))return;
  _pizTab=n;
  _pizActiveTabKey=(n===5)?'iso':'plan';
  document.querySelectorAll('[data-piz-tab]').forEach(btn=>btn.classList.toggle('active',+btn.dataset.pizTab===n));
  _pizRenderTab();
}

function _pizRenderTab(){
  const c=document.getElementById('pizBody');if(!c)return;
  if(_pizTab===1){_pizActiveTabKey='plan';_pizRenderPlan(c);}
  else if(_pizTab===2)_pizRenderReal(c);
  else if(_pizTab===3)_pizRenderRutas(c);
  else if(_pizTab===4)_pizRenderFrentes(c);
  else if(_pizTab===5){_pizActiveTabKey='iso';_pizRenderIso(c);}
}

function _pizEqIcon(sub){
  const s=(sub||'').toLowerCase();
  const O=(col)=>`<span style="font-size:11px;line-height:1;vertical-align:middle;margin-right:2px;color:${col};text-shadow:0 0 2px rgba(0,0,0,.5)">●</span>`;
  const Q=(col)=>`<span style="font-size:9px;line-height:1;vertical-align:middle;margin-right:2px;color:${col};text-shadow:0 0 2px rgba(0,0,0,.5)">■</span>`;
  // ● Blanco → Volquetes
  if(s.includes('volquete'))                    return O('#ffffff');
  // ● Azul → Cisterna de agua
  if(s.includes('cistern'))                     return O('#60a5fa');
  // ● Plomo → Camionetas
  if(s.includes('camioneta'))                   return O('#9ca3af');
  // ● Marrón → Coaster
  if(s.includes('coaster'))                     return O('#b45309');
  // ● Amarillo → LA con ruedas
  if(s.includes('rodillo'))                     return O('#fbbf24');
  if(s.includes('motoniveladora'))              return O('#fbbf24');
  if(s.includes('retroexcavadora'))             return O('#fbbf24');
  if(s.includes('cargador'))                    return O('#fbbf24');
  // ■ Amarillo → LA con orugas
  if(s.includes('tractor')||s.includes('dozer'))return Q('#fbbf24');
  if(s.includes('excavadora'))                  return Q('#fbbf24');
  if(s.includes('grúa')||s.includes('grua'))   return Q('#fbbf24');
  // Default → ■ blanco
  return Q('rgba(255,255,255,.7)');
}
function _pizEqCode(c){return(c||'').replace(/\s*ECOP/g,'');}

function _pizSpriteUrl(){return window.location.href.replace(/[^\/\\]+$/,'')+'09.-ERP/Imagenes/equipos/equipos_sprite.png';}
function _pizEqSprite(sub){
  const map={
    'Excavadora':      '0% 0%',
    'Tractor Oruga':   '0% 50%',
    'Cargador Frontal':'25% 50%',
    'Motoniveladora':  '50% 50%',
    'Retroexcavadora': '75% 50%',
    'Rodillo':         '100% 50%',
    'Volquete':        '0% 100%',
  };
  return map[sub]||null;
}

function _pizCondColor(cond){
  const c=(cond||'').toUpperCase();
  if(c.includes('OPERATIVO'))return'#10b981';
  if(c.includes('STANDBY'))return'#f59e0b';
  return'#ef4444';
}

// ── VISTA ISO: ISOMÉTRICO ─────────────────────────────────────────────────
let _isoPanel='equipos', _isoEqFiltro='';
let _isoAreaSelId=null, _isoAreaDibujando=false, _isoAreaPuntos=[];
// Plan diario ISO
let _isoFecha=null; // null=vista permanente, 'YYYY-MM-DD'=modo plan
let _isoHiddenFrentes=new Set(); // IDs de frentes ocultos
// Dibujos de planificación
let _isoPlanDibujando=false, _isoPlanPuntos=[], _isoPlanSelId=null;

function _pizRenderIso(c){
  const items=(DB.pizarraItems||[]).filter(x=>
    x.tab==='iso'&&x.tipo!=='frente'&&
    (_isoFecha ? x.fecha===_isoFecha : !x.fecha)
  );
  const equipos=(DB.equipos||[]).filter(e=>e.est!=='Baja');

  // Sub-tipos únicos para filtro
  const subtipos=[...new Set(equipos.map(e=>e.sub||'Otro').filter(Boolean))].sort();
  const eqsFiltrados=_isoEqFiltro?equipos.filter(e=>(e.sub||'Otro')===_isoEqFiltro):equipos;

  // Personal por cargo
  const cargoMap={};
  const lpsP=(DB.lpsWbsRecursos||[]).filter(r=>r.tipo==='Personal');
  if(lpsP.length){lpsP.forEach(r=>{const cg=(r.nombre||'').split('–').slice(-1)[0].trim()||'Personal';cargoMap[cg]=(cargoMap[cg]||0)+(+(r.cantidad)||0);});}
  else{(DB.personal||[]).filter(p=>p.tipo!=='Staff'&&(p.est||'').toLowerCase()==='activo').forEach(p=>{const cg=(p.cargo||'Sin cargo').trim();cargoMap[cg]=(cargoMap[cg]||0)+1;});}
  const placedMap={};
  items.filter(x=>x.tipo==='personal').forEach(x=>{placedMap[x.etiqueta||'']=(placedMap[x.etiqueta||'']||0)+(x.cant||1);});

  // Markers
  const eqByCode={};
  equipos.forEach(e=>{eqByCode[e.codigo]=e;});
  const markers=items.map(item=>{
    const col=item.color||'#10b981';
    const esPersonal=item.tipo==='personal';
    const cant=item.cant||1;
    const cantLabel=esPersonal&&cant>1?`<span style="background:rgba(0,0,0,.25);border-radius:3px;padding:0 3px;margin-right:1px;font-size:.58rem">${cant}×</span>`:'';
    const dblClick=esPersonal?`ondblclick="event.stopPropagation();_pizMarkerDblClick(${item.id})"`:'';
    let icHtml;
    if(item.tipo==='equipo'){
      const eq=eqByCode[item.etiqueta];
      const sp=eq?_pizEqSprite(eq.sub):null;
      icHtml=sp
        ?`<div style="width:52px;height:38px;flex-shrink:0;background-image:url('${_pizSpriteUrl()}');background-size:500% 300%;background-position:${sp};background-repeat:no-repeat"></div>`
        :`<span style="font-size:.8rem">🚜</span>`;
    } else {
      icHtml=`<span style="font-size:.8rem">${{personal:'👷',nota:'📝'}[item.tipo]||'📌'}</span>`;
    }
    const hasSp=item.tipo==='equipo'&&(eqByCode[item.etiqueta]?!!_pizEqSprite(eqByCode[item.etiqueta].sub):false);
    return`<div id="piz-m-${item.id}" class="eq-marker"
      style="position:absolute;left:${item.x}%;top:${item.y}%;transform:translate(-50%,-100%);transform-origin:50% 100%;cursor:grab;z-index:10;user-select:none;text-align:center"
      onmousedown="_pizMousedown(event,${item.id})" ${dblClick}>
      ${hasSp
        ?`<div style="display:inline-flex;flex-direction:column;align-items:center;gap:2px;filter:drop-shadow(0 2px 6px rgba(0,0,0,.8))">
            ${icHtml}
            <div style="background:rgba(0,0,0,.55);backdrop-filter:blur(4px);color:#fff;border-radius:4px;padding:1px 5px;font-size:.6rem;font-weight:700;white-space:nowrap;display:flex;align-items:center;gap:3px">
              ${cantLabel}${_pizEqCode(item.etiqueta)}
              <span onclick="event.stopPropagation();_pizRemoveItem(${item.id})" style="cursor:pointer;opacity:.7;line-height:1;font-size:.65rem">✕</span>
            </div>
          </div>`
        :`<div style="background:${col};color:#fff;border-radius:6px;padding:2px 6px;font-size:.65rem;font-weight:700;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.55);display:inline-flex;align-items:center;gap:4px">
            ${icHtml}${cantLabel}${_pizEqCode(item.etiqueta)}
            <span onclick="event.stopPropagation();_pizRemoveItem(${item.id})" style="margin-left:3px;cursor:pointer;opacity:.7;line-height:1">✕</span>
          </div>
          <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:7px solid ${col};margin:0 auto"></div>`
      }
    </div>`;
  }).join('');

  // Frentes para overlay
  const frentesConArea=(DB.frentesTrabajo||[]).filter(f=>f.puntos&&f.puntos.length>=3);

  // Panel según tab activo
  const btnTab=(key,icon,label)=>{
    const on=_isoPanel===key;
    return`<button onclick="_isoSetPanel('${key}')" style="flex:1;padding:.3rem .2rem;font-size:.62rem;font-weight:${on?'700':'500'};border:1px solid ${on?'#06b6d4':'var(--border)'};border-radius:6px;background:${on?'rgba(6,182,212,.15)':'transparent'};color:${on?'#06b6d4':'var(--muted2)'};cursor:pointer">${icon}<br>${label}</button>`;
  };

  let panelContent='';
  if(_isoPanel==='equipos'){
    panelContent=`
      <div style="font-size:.6rem;color:var(--muted2);margin-bottom:.4rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em">Tipo de equipo</div>
      <div style="display:flex;flex-wrap:wrap;gap:.2rem;margin-bottom:.5rem">
        <button onclick="_isoEqFiltro='';_pizRenderTab()" style="font-size:.6rem;padding:.15rem .4rem;border-radius:4px;border:1px solid ${!_isoEqFiltro?'#06b6d4':'var(--border)'};background:${!_isoEqFiltro?'rgba(6,182,212,.15)':'transparent'};color:${!_isoEqFiltro?'#06b6d4':'var(--muted2)'};cursor:pointer">Todos (${equipos.length})</button>
        ${subtipos.map(s=>{
          const cnt=equipos.filter(e=>(e.sub||'Otro')===s).length;
          const on=_isoEqFiltro===s;
          return`<button onclick="_isoEqFiltro='${s.replace(/'/g,"\\'")}';_pizRenderTab()" style="font-size:.6rem;padding:.15rem .4rem;border-radius:4px;border:1px solid ${on?'#06b6d4':'var(--border)'};background:${on?'rgba(6,182,212,.15)':'transparent'};color:${on?'#06b6d4':'var(--muted2)'};cursor:pointer">${s} (${cnt})</button>`;
        }).join('')}
      </div>
      <div style="display:flex;flex-direction:column;gap:.2rem">
        ${eqsFiltrados.map(e=>{
          const sp=_pizEqSprite(e.sub);
          const imgEl=sp?`<div style="width:52px;height:38px;flex-shrink:0;border-radius:4px;overflow:hidden;background-image:url('${_pizSpriteUrl()}');background-size:500% 300%;background-position:${sp};background-repeat:no-repeat"></div>`
            :`<div style="width:38px;height:38px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:1.2rem;border-radius:4px;background:rgba(6,182,212,.1)">${_pizEqIcon(e.sub)}</div>`;
          return`<div draggable="true"
            ondragstart="_pizDragStart(event,'equipo',${e.id},'${(e.codigo||'').replace(/'/g,"\\'")}','#06b6d4')"
            style="cursor:grab;display:flex;align-items:center;gap:.4rem;padding:.2rem .3rem;background:rgba(6,182,212,.06);border:1px solid rgba(6,182,212,.18);border-radius:6px"
            title="${e.codigo} – ${e.nombre||''}">
            ${imgEl}
            <div style="min-width:0">
              <div style="font-size:.67rem;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${_pizEqCode(e.codigo)}</div>
              <div style="font-size:.58rem;color:var(--muted2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e.sub||''}</div>
            </div>
          </div>`;
        }).join('')}
      </div>`;
  } else if(_isoPanel==='personal'){
    panelContent=Object.entries(cargoMap).map(([cargo,total])=>{
      const placed=placedMap[cargo]||0;const avail=Math.max(0,total-placed);
      const pct=total>0?Math.round(placed/total*100):0;const ok=avail>0;
      const sc=cargo.replace(/'/g,"\\'");
      return`<div draggable="${ok}" ondragstart="${ok}?_pizDragStart(event,'personal',0,'${sc}','#10b981'):event.preventDefault()"
        style="cursor:${ok?'grab':'not-allowed'};padding:.25rem .4rem;margin-bottom:.2rem;background:rgba(16,185,129,.07);border:1px solid rgba(16,185,129,${ok?'.22':'.08'});border-radius:5px;opacity:${ok?1:.45}">
        <div style="display:flex;align-items:center;justify-content:space-between;font-size:.67rem">
          <span>👷 ${cargo}</span>
          <span style="font-weight:700;color:${avail>0?'#10b981':'#ef4444'};font-size:.62rem">${avail}/${total}</span>
        </div>
        <div style="height:3px;background:rgba(255,255,255,.1);border-radius:2px;margin-top:.2rem">
          <div style="height:100%;width:${pct}%;background:${pct>=90?'#ef4444':pct>=60?'#f59e0b':'#10b981'};border-radius:2px"></div>
        </div>
      </div>`;
    }).join('')||'<div style="font-size:.62rem;color:var(--muted2);text-align:center;padding:.5rem">Sin personal en WBS</div>';
  } else if(_isoPanel==='areas'){
    const frentesAll=(DB.frentesTrabajo||[]).sort((a,b)=>(a.nombre||a.nom||'').localeCompare(b.nombre||b.nom||''));
    panelContent=`
      <div style="display:flex;gap:.3rem;margin-bottom:.4rem">
        <button id="isoAreaBtnDraw" onclick="_isoAreaToggleDraw()" style="flex:1;font-size:.63rem;padding:.25rem .4rem;border-radius:5px;border:1px solid #10b98140;background:rgba(16,185,129,.1);color:#10b981;cursor:pointer;white-space:nowrap">✏️ Dibujar área</button>
        <button onclick="_isoAreaBorrar()" title="Borrar área ISO del frente seleccionado" style="font-size:.63rem;padding:.25rem .5rem;border-radius:5px;border:1px solid #ef444440;background:rgba(239,68,68,.07);color:#ef4444;cursor:pointer">🗑</button>
      </div>
      <div id="isoAreaHint" style="font-size:.57rem;color:var(--muted2);margin-bottom:.4rem;min-height:1.1rem;line-height:1.3"></div>
      <div style="display:flex;flex-direction:column;gap:.22rem;overflow-y:auto">
        ${frentesAll.length ? frentesAll.map((f,i)=>{
          const col=_frenteColors[i%_frenteColors.length];
          const nom=(f.nombre||f.nom||f.frente||'Sin nombre').slice(0,24);
          const ptsIso=(f.puntosIso||[]).length;
          const hidden=_isoHiddenFrentes.has(f.id);
          return `<div id="iso-area-item-${f.id}" onclick="_isoAreaSelect(${f.id})"
            style="cursor:pointer;padding:.25rem .35rem;border-radius:5px;border:2px solid ${col}${hidden?'18':'30'};background:${col}${hidden?'06':'10'};opacity:${hidden?.55:1};transition:.1s"
            onmouseover="this.style.background='${col}22'" onmouseout="this.style.background='${col}${hidden?'06':'10'}'">
            <div style="display:flex;align-items:center;gap:.25rem">
              <span style="width:8px;height:8px;border-radius:2px;background:${col};display:inline-block;flex-shrink:0"></span>
              <span style="font-size:.62rem;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1">${nom}</span>
              <button onclick="event.stopPropagation();_isoToggleFrente(${f.id})"
                title="${hidden?'Mostrar':'Ocultar'} área"
                style="background:none;border:none;cursor:pointer;font-size:.75rem;color:${hidden?'#6b7280':'#06b6d4'};padding:0;line-height:1;flex-shrink:0">
                ${hidden?'🙈':'👁'}
              </button>
            </div>
            <div style="font-size:.52rem;padding-left:12px;margin-top:1px;color:${ptsIso>=3?col:'var(--muted2)'}">
              ${ptsIso>=3?ptsIso+' vértices':'Sin área dibujada'}
            </div>
          </div>`;
        }).join('') : '<div style="color:var(--muted2);font-size:.62rem;text-align:center;padding:.5rem">Sin frentes definidos</div>'}
      </div>`;
  } else if(_isoPanel==='dibujos'){
    // Dibujos de planificación vinculados a WBS
    const dibujosActivos=(DB.planDibujos||[]).filter(d=>{
      if(!d.activo)return false;
      if(d.wbsCodigo){
        const w=(DB.lpsWbs||[]).find(x=>x.codigo===d.wbsCodigo);
        if(w&&+(w.pctAvance||w.pct||0)>=100)return false;
      }
      return true;
    });
    const _TIPOS_DIBUJO=['Acceso temporal','Zona de relleno','Límite de corte','Acceso definitivo','Zona de acopio','Otro'];
    panelContent=`
      <div style="display:flex;gap:.25rem;margin-bottom:.4rem">
        <button id="isoPlanDibujarBtn" onclick="_isoPlanDibujarToggle()"
          style="flex:1;font-size:.62rem;padding:.25rem .35rem;border-radius:5px;border:1px solid ${_isoPlanDibujando?'#f59e0b40':'#ef444440'};background:${_isoPlanDibujando?'rgba(245,158,11,.1)':'rgba(239,68,68,.08)'};color:${_isoPlanDibujando?'#f59e0b':'#ef4444'};cursor:pointer;white-space:nowrap">
          ${_isoPlanDibujando?'✅ Guardar dibujo':'📐 Nuevo dibujo'}
        </button>
        ${_isoPlanDibujando?`<button onclick="_isoPlanDibujarCancelar()" style="padding:.25rem .4rem;border-radius:5px;border:1px solid #6b728040;background:var(--panel2);color:var(--muted2);font-size:.62rem;cursor:pointer">✗</button>`:''}
      </div>
      ${_isoPlanDibujando?`<div style="font-size:.56rem;color:#f59e0b;background:rgba(245,158,11,.07);border:1px solid #f59e0b20;border-radius:5px;padding:.3rem .4rem;margin-bottom:.4rem">
        Clic=vértice · Doble clic=cerrar · Clic der.=cancelar<br>
        Vértices: ${_isoPlanPuntos.length}
      </div>`:''}
      <div id="isoPlanDibujoForm" style="display:none;background:var(--panel);border:1px solid var(--border);border-radius:6px;padding:.4rem;margin-bottom:.4rem;font-size:.62rem">
        <div style="font-weight:700;margin-bottom:.3rem">Guardar dibujo</div>
        <input id="isoPlanDibLabel" placeholder="Ej: Acceso Norte" style="width:100%;background:var(--panel2);border:1px solid var(--border);border-radius:5px;padding:.25rem .4rem;color:var(--text);font-size:.62rem;margin-bottom:.25rem">
        <select id="isoPlanDibTipo" style="width:100%;background:var(--panel2);border:1px solid var(--border);border-radius:5px;padding:.25rem .35rem;color:var(--text);font-size:.62rem;margin-bottom:.25rem">
          ${_TIPOS_DIBUJO.map(t=>`<option>${t}</option>`).join('')}
        </select>
        <input id="isoPlanDibWbs" placeholder="Código WBS (opcional)" style="width:100%;background:var(--panel2);border:1px solid var(--border);border-radius:5px;padding:.25rem .4rem;color:var(--text);font-size:.62rem;margin-bottom:.25rem">
        <div style="display:flex;gap:.25rem;align-items:center;margin-bottom:.3rem">
          <label style="font-size:.58rem;color:var(--muted2)">Color:</label>
          ${['#ef4444','#f59e0b','#10b981','#06b6d4','#8b5cf6','#ec4899'].map(c=>`
            <div onclick="document.querySelectorAll('.pld-color-btn').forEach(b=>b.style.outline='none');this.style.outline='2px solid #fff';document.getElementById('isoPlanDibColor').value='${c}'"
              class="pld-color-btn" style="width:16px;height:16px;border-radius:3px;background:${c};cursor:pointer;flex-shrink:0"></div>`).join('')}
          <input type="hidden" id="isoPlanDibColor" value="#ef4444">
        </div>
        <div style="display:flex;gap:.25rem">
          <button onclick="_isoPlanDibujoSave()" style="flex:1;background:#10b981;border:none;border-radius:5px;color:#fff;padding:.25rem;font-size:.62rem;font-weight:700;cursor:pointer">💾 Guardar</button>
          <button onclick="document.getElementById('isoPlanDibujoForm').style.display='none'" style="padding:.25rem .5rem;background:var(--panel2);border:1px solid var(--border);border-radius:5px;color:var(--muted2);font-size:.62rem;cursor:pointer">✗</button>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:.22rem">
        ${dibujosActivos.length?dibujosActivos.map(d=>{
          const wbsOk=d.wbsCodigo?((DB.lpsWbs||[]).find(x=>x.codigo===d.wbsCodigo)||null):null;
          const pct=wbsOk?+(wbsOk.pctAvance||wbsOk.pct||0):null;
          return`<div style="padding:.28rem .4rem;background:${d.color}12;border:1px solid ${d.color}30;border-radius:5px">
            <div style="display:flex;align-items:center;gap:.25rem">
              <span style="width:8px;height:8px;border-radius:50%;background:${d.color};flex-shrink:0"></span>
              <span style="font-size:.62rem;font-weight:700;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${d.label||'Sin nombre'}</span>
              <button onclick="_isoPlanDibujoDelete(${d.id})" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:.65rem;padding:0">✕</button>
            </div>
            <div style="font-size:.52rem;padding-left:12px;color:var(--muted2)">
              ${d.tipo||'Otro'}${d.wbsCodigo?` · WBS: ${d.wbsCodigo}`:''}${pct!==null?` · ${pct}%`:''}
            </div>
          </div>`;
        }).join(''):`<div style="text-align:center;color:var(--muted2);font-size:.62rem;padding:.8rem .4rem">
          Sin dibujos activos<br>
          <span style="font-size:.55rem">Usa 📐 Nuevo dibujo para agregar accesos, zonas, etc.</span>
        </div>`}
      </div>`;
  } else {
    panelContent=`<button onclick="_pizAgregarNota()" style="width:100%;background:rgba(139,92,246,.1);border:1px dashed rgba(139,92,246,.4);border-radius:5px;color:#8b5cf6;cursor:pointer;padding:.4rem;font-size:.67rem;margin-bottom:.5rem">＋ Agregar nota al mapa</button>
      ${items.filter(x=>x.tipo==='nota').map(n=>`<div style="display:flex;align-items:center;gap:.3rem;padding:.25rem .4rem;background:rgba(139,92,246,.08);border:1px solid rgba(139,92,246,.2);border-radius:5px;font-size:.67rem;margin-bottom:.2rem">
        <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">📝 ${n.etiqueta}</span>
        <span onclick="_pizRemoveItem(${n.id})" style="color:#ef4444;cursor:pointer;font-size:.7rem">✕</span>
      </div>`).join('')}`;
  }

  c.innerHTML=`
    <!-- BARRA DE FECHA / PLAN DIARIO -->
    <div style="display:flex;align-items:center;gap:.5rem;padding:.3rem .5rem;margin-bottom:.4rem;background:var(--panel2);border:1px solid ${_isoFecha?'#f59e0b40':'var(--border)'};border-radius:7px;flex-wrap:wrap">
      <span style="font-size:.6rem;font-weight:700;color:${_isoFecha?'#f59e0b':'var(--muted2)'};white-space:nowrap">📅 Plan del día:</span>
      <input type="date" value="${_isoFecha||''}" max="${today()}"
        onchange="_isoSetFecha(this.value)"
        style="background:var(--panel);border:1px solid var(--border);border-radius:5px;padding:.15rem .35rem;color:var(--text);font-size:.65rem;cursor:pointer">
      ${_isoFecha?`
        <span style="font-size:.58rem;color:#f59e0b;font-weight:700">${new Date(_isoFecha+'T12:00:00').toLocaleDateString('es-PE',{weekday:'short',day:'2-digit',month:'short'}).toUpperCase()}</span>
        <button onclick="_isoMantenerPlan()" title="Copiar plan del día anterior a esta fecha"
          style="padding:.15rem .4rem;border-radius:5px;border:1px solid #10b98140;background:rgba(16,185,129,.1);color:#10b981;font-size:.58rem;cursor:pointer;white-space:nowrap">📋 Copiar ayer</button>
        <button onclick="_isoLimpiarDia()" title="Eliminar todos los equipos planificados para este día"
          style="padding:.15rem .4rem;border-radius:5px;border:1px solid #ef444440;background:rgba(239,68,68,.07);color:#ef4444;font-size:.58rem;cursor:pointer;white-space:nowrap">🗑 Limpiar día</button>
        <button onclick="_isoSalirPlan()" style="padding:.15rem .35rem;border-radius:5px;border:1px solid #6b728040;background:var(--panel);color:var(--muted2);font-size:.58rem;cursor:pointer">✕ Salir</button>
      `:`<span style="font-size:.55rem;color:var(--muted2)">Selecciona una fecha para activar el modo planificación diaria</span>`}
    </div>
    <div style="display:grid;grid-template-columns:195px 1fr;gap:.7rem;height:calc(100vh - 235px)">
    <!-- SIDEBAR ISO -->
    <div style="display:flex;flex-direction:column;gap:.4rem;border:1px solid var(--border);border-radius:8px;padding:.5rem;background:var(--panel2);overflow:hidden">
      <!-- Tab selector -->
      <div style="display:flex;gap:.2rem;flex-wrap:wrap">
        ${btnTab('equipos','🚜','Equipos')}
        ${btnTab('personal','👷','Personal')}
        ${btnTab('areas','📍','Áreas')}
        ${btnTab('dibujos','📐','Dibujos')}
        ${btnTab('notas','📝','Notas')}
      </div>
      <hr style="border-color:var(--border);margin:.1rem 0">
      <!-- Contenido del panel -->
      <div style="flex:1;overflow-y:auto">${panelContent}</div>
      <hr style="border-color:var(--border);margin:.1rem 0">
      <button onclick="_pizLimpiar()" style="width:100%;background:rgba(239,68,68,.07);border:1px solid rgba(239,68,68,.25);border-radius:5px;color:#ef4444;cursor:pointer;padding:.25rem;font-size:.62rem">
        ${_isoFecha?`🗑 Limpiar equipos del ${_isoFecha}`:'🗑 Limpiar mapa ISO'}
      </button>
    </div>
    <!-- MAPA -->
    <div style="position:relative;overflow:hidden;border-radius:8px;border:1px solid var(--border);background:#111" id="rutaMapWrap"
      ondragover="event.preventDefault()" ondrop="_pizDrop(event)">
      <div id="rutaCanvas" style="position:relative;transform-origin:0 0;cursor:default;display:inline-block;min-width:100%">
        <img id="rutaImg" src="${_pizImgUrlIso()}" style="display:block;width:100%;pointer-events:none;user-select:none" draggable="false">
        <svg id="rutaSvg" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible" xmlns="http://www.w3.org/2000/svg"></svg>
        ${markers}
        ${!items.length?`<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none">
          <div style="background:rgba(0,0,0,.6);color:#fff;border-radius:8px;padding:.8rem 1.4rem;font-size:.75rem;text-align:center;backdrop-filter:blur(4px)">
            Arrastra equipos o personal al mapa · Rueda=zoom · Arrastrar=pan<br>
            <span style="font-size:.65rem;opacity:.6">Las posiciones se guardan automáticamente</span>
          </div></div>`:''}
      </div>
      <div style="position:absolute;bottom:.6rem;right:.6rem;display:flex;align-items:center;gap:.25rem;z-index:20;background:rgba(10,10,20,.75);border:1px solid #ffffff18;border-radius:7px;padding:.25rem .4rem;backdrop-filter:blur(6px)">
        <button onclick="_rutaZoomOut()" style="width:22px;height:22px;border-radius:4px;border:1px solid #ffffff20;background:#ffffff10;color:#e0e0e0;cursor:pointer;font-size:.9rem;line-height:1">−</button>
        <span id="rutaZoomPct" style="font-size:.65rem;color:#e0e0e0;min-width:36px;text-align:center;font-weight:700">100%</span>
        <button onclick="_rutaZoomIn()" style="width:22px;height:22px;border-radius:4px;border:1px solid #ffffff20;background:#ffffff10;color:#e0e0e0;cursor:pointer;font-size:.9rem;line-height:1">+</button>
        <div style="width:1px;height:14px;background:#ffffff20;margin:0 .1rem"></div>
        <button onclick="_rutaZoomReset()" style="padding:0 .35rem;height:22px;border-radius:4px;border:1px solid #ffffff20;background:#ffffff10;color:#e0e0e0;cursor:pointer;font-size:.65rem">↺ Fit</button>
      </div>
    </div>
  </div>`;

  const wrap=document.getElementById('rutaMapWrap');
  if(wrap){
    wrap.addEventListener('wheel',_rutaOnWheel,{passive:false});
    wrap.addEventListener('mousedown',_pizPlanMapMousedown);
    wrap.addEventListener('click',_isoAreaMapClick);
    wrap.addEventListener('dblclick',_isoAreaMapDblClick);
    wrap.addEventListener('mousemove',_isoAreaMouseMove);
    wrap.addEventListener('contextmenu',e=>{
      e.preventDefault();
      if(_isoAreaDibujando)_isoAreaCancelar();
      if(_isoPlanDibujando)_isoPlanDibujarCancelar();
    });
  }
  document.addEventListener('mousemove',_rutaOnGlobalMousemove);
  document.addEventListener('mouseup',_pizPlanGlobalMouseup);
  requestAnimationFrame(()=>{
    if(_rutaZoom===1&&_rutaPanX===0)_rutaFitView();else _rutaApplyTransform();
    _isoAreaRenderSvg(DB.frentesTrabajo||[]);
  });
}

function _isoSetPanel(p){_isoPanel=p;_pizRenderTab();}

// ══ ISO ÁREA – DIBUJO DE ÁREAS EN MAPA ISOMÉTRICO ══
function _isoAreaSelect(id){
  _isoAreaSelId=id;
  document.querySelectorAll('[id^="iso-area-item-"]').forEach(el=>{
    el.style.outline=el.id===`iso-area-item-${id}`?'2px solid #10b981':'none';
  });
  const f=(DB.frentesTrabajo||[]).find(x=>x.id===id);
  const hint=document.getElementById('isoAreaHint');
  if(hint)hint.textContent=f?`✔ ${(f.nombre||f.nom||'Frente').slice(0,28)} seleccionado`:'';
  if(_isoAreaDibujando)_isoAreaCancelar(true);
}

function _isoAreaToggleDraw(){
  if(!_isoAreaSelId){toast('Selecciona un frente primero',true);return;}
  _isoAreaDibujando=!_isoAreaDibujando;
  const btn=document.getElementById('isoAreaBtnDraw');
  const cur=document.getElementById('rutaCursor');
  const canvas=document.getElementById('rutaCanvas');
  const hint=document.getElementById('isoAreaHint');
  if(_isoAreaDibujando){
    const f=(DB.frentesTrabajo||[]).find(x=>x.id===_isoAreaSelId);
    _isoAreaPuntos=f&&f.puntosIso?[...f.puntosIso]:[];
    if(btn){btn.textContent='✅ Guardar';btn.style.background='rgba(245,158,11,.15)';btn.style.color='#f59e0b';btn.style.borderColor='#f59e0b40';}
    if(cur){cur.style.display='block';cur.style.borderRadius='2px';}
    if(canvas)canvas.style.cursor='crosshair';
    if(hint)hint.textContent='Clic = vértice · Doble clic = cerrar · Clic der. = cancelar';
  }else{
    _isoAreaGuardar();
  }
}

function _isoAreaCancelar(reset=true){
  _isoAreaDibujando=false;
  if(reset)_isoAreaPuntos=[];
  const btn=document.getElementById('isoAreaBtnDraw');
  const cur=document.getElementById('rutaCursor');
  const canvas=document.getElementById('rutaCanvas');
  const hint=document.getElementById('isoAreaHint');
  if(btn){btn.textContent='✏️ Dibujar área';btn.style.background='rgba(16,185,129,.1)';btn.style.color='#10b981';btn.style.borderColor='#10b98140';}
  if(cur)cur.style.display='none';
  if(canvas)canvas.style.cursor='default';
  if(hint)hint.textContent='';
  const svg=document.getElementById('rutaSvg');
  if(svg){svg.querySelectorAll('.iso-area-temp').forEach(el=>el.remove());const p=svg.querySelector('#isoAreaPreview');if(p)p.remove();}
}

function _isoAreaGuardar(){
  if(!_isoAreaSelId){_isoAreaCancelar();return;}
  const f=(DB.frentesTrabajo||[]).find(x=>x.id===_isoAreaSelId);
  if(!f){_isoAreaCancelar();return;}
  if(_isoAreaPuntos.length<3){toast('Necesitas al menos 3 vértices para guardar el área',true);return;}
  f.puntosIso=[..._isoAreaPuntos];
  syncSheet('saveFrenteTrabajo',f);
  toast(`✓ Área ISO "${(f.nombre||f.nom||'Frente').slice(0,25)}" guardada (${_isoAreaPuntos.length} vértices)`);
  _isoAreaCancelar(false);
  const svg=document.getElementById('rutaSvg');
  if(svg){svg.querySelectorAll('.iso-area-temp').forEach(el=>el.remove());const p=svg.querySelector('#isoAreaPreview');if(p)p.remove();}
  _isoAreaRenderSvg(DB.frentesTrabajo||[]);
  _isoAreaUpdateStats();
}

function _isoAreaBorrar(){
  if(!_isoAreaSelId){toast('Selecciona un frente primero',true);return;}
  const f=(DB.frentesTrabajo||[]).find(x=>x.id===_isoAreaSelId);
  if(!f)return;
  if(!confirm(`¿Borrar el área ISO de "${f.nombre||f.nom||'Frente'}"?`))return;
  f.puntosIso=[];
  syncSheet('saveFrenteTrabajo',f);
  toast('Área ISO borrada');
  _isoAreaCancelar();
  _isoAreaRenderSvg(DB.frentesTrabajo||[]);
  _isoAreaUpdateStats();
}

function _isoAreaRenderSvg(frentes){
  const svg=document.getElementById('rutaSvg');if(!svg)return;
  const W=svg.clientWidth,H=svg.clientHeight;if(!W||!H)return;
  svg.querySelectorAll('.iso-area-static,.iso-plan-dibujo').forEach(el=>el.remove());

  // ── Frentes de trabajo (con toggle de visibilidad) ──────────────────────
  const sorted=(frentes||[]).sort((a,b)=>(a.nombre||a.nom||'').localeCompare(b.nombre||b.nom||''));
  sorted.forEach((f,i)=>{
    if(_isoHiddenFrentes.has(f.id))return; // oculto por usuario
    const pts=f.puntosIso||[];if(pts.length<3)return;
    const col=_frenteColors[i%_frenteColors.length];
    const nom=(f.nombre||f.nom||f.frente||'').slice(0,22);
    const px=pts.map(p=>({x:(p.x*W/100),y:(p.y*H/100)}));
    const d='M '+px.map(p=>`${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L ')+' Z';
    const cx=px.reduce((s,p)=>s+p.x,0)/px.length;
    const cy=px.reduce((s,p)=>s+p.y,0)/px.length;
    const g=document.createElementNS('http://www.w3.org/2000/svg','g');
    g.classList.add('iso-area-static');
    const area=document.createElementNS('http://www.w3.org/2000/svg','path');
    area.setAttribute('d',d);area.setAttribute('fill',col);area.setAttribute('fill-opacity','.22');
    area.setAttribute('stroke',col);area.setAttribute('stroke-width','2');area.setAttribute('stroke-linejoin','round');
    g.appendChild(area);
    const txt=document.createElementNS('http://www.w3.org/2000/svg','text');
    txt.setAttribute('x',cx.toFixed(1));txt.setAttribute('y',cy.toFixed(1));
    txt.setAttribute('font-size','11');txt.setAttribute('font-weight','700');txt.setAttribute('fill',col);
    txt.setAttribute('stroke','#000');txt.setAttribute('stroke-width','2.5');txt.setAttribute('paint-order','stroke');
    txt.setAttribute('dominant-baseline','middle');txt.setAttribute('text-anchor','middle');txt.setAttribute('font-family','sans-serif');
    txt.textContent=nom;
    g.appendChild(txt);
    svg.appendChild(g);
  });

  // ── Dibujos de planificación (persistentes, filtrados por WBS) ──────────
  (DB.planDibujos||[]).forEach(d=>{
    if(!d.activo)return;
    if(d.wbsCodigo){
      const w=(DB.lpsWbs||[]).find(x=>x.codigo===d.wbsCodigo);
      if(w&&+(w.pctAvance||w.pct||0)>=100)return; // oculto si WBS completo
    }
    const pts=d.puntos||[];if(pts.length<3)return;
    const col=d.color||'#ef4444';
    const px=pts.map(p=>({x:(p.x*W/100),y:(p.y*H/100)}));
    const dPath='M '+px.map(p=>`${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L ')+' Z';
    const cx=px.reduce((s,p)=>s+p.x,0)/px.length;
    const cy=px.reduce((s,p)=>s+p.y,0)/px.length;
    const g=document.createElementNS('http://www.w3.org/2000/svg','g');
    g.classList.add('iso-plan-dibujo');
    const area=document.createElementNS('http://www.w3.org/2000/svg','path');
    area.setAttribute('d',dPath);area.setAttribute('fill',col);area.setAttribute('fill-opacity','.18');
    area.setAttribute('stroke',col);area.setAttribute('stroke-width','2');area.setAttribute('stroke-dasharray','6 3');area.setAttribute('stroke-linejoin','round');
    g.appendChild(area);
    if(d.label){
      const txt=document.createElementNS('http://www.w3.org/2000/svg','text');
      txt.setAttribute('x',cx.toFixed(1));txt.setAttribute('y',cy.toFixed(1));
      txt.setAttribute('font-size','10');txt.setAttribute('font-weight','700');txt.setAttribute('fill',col);
      txt.setAttribute('stroke','#000');txt.setAttribute('stroke-width','2');txt.setAttribute('paint-order','stroke');
      txt.setAttribute('dominant-baseline','middle');txt.setAttribute('text-anchor','middle');txt.setAttribute('font-family','sans-serif');
      txt.textContent=d.label;
      g.appendChild(txt);
    }
    svg.appendChild(g);
  });

  // ── Dibujo en curso ─────────────────────────────────────────────────────
  if(_isoPlanDibujando&&_isoPlanPuntos.length>=1){
    const px=_isoPlanPuntos.map(p=>({x:(p.x*W/100).toFixed(1),y:(p.y*H/100).toFixed(1)}));
    const pathEl=document.createElementNS('http://www.w3.org/2000/svg','path');
    pathEl.classList.add('iso-plan-dibujo');
    pathEl.setAttribute('d','M '+px.map(p=>`${p.x} ${p.y}`).join(' L '));
    pathEl.setAttribute('stroke','#f59e0b');pathEl.setAttribute('stroke-width','2');
    pathEl.setAttribute('stroke-dasharray','5 3');pathEl.setAttribute('fill','none');
    svg.appendChild(pathEl);
    px.forEach(p=>{
      const c=document.createElementNS('http://www.w3.org/2000/svg','circle');
      c.classList.add('iso-plan-dibujo');
      c.setAttribute('cx',p.x);c.setAttribute('cy',p.y);c.setAttribute('r','4');
      c.setAttribute('fill','#f59e0b');c.setAttribute('stroke','#fff');c.setAttribute('stroke-width','1.5');
      svg.appendChild(c);
    });
  }
}

function _isoAreaTempRender(){
  const svg=document.getElementById('rutaSvg');if(!svg)return;
  const W=svg.clientWidth,H=svg.clientHeight;
  svg.querySelectorAll('.iso-area-temp').forEach(el=>el.remove());
  if(_isoAreaPuntos.length<1)return;
  const px=_isoAreaPuntos.map(p=>({x:(p.x*W/100).toFixed(1),y:(p.y*H/100).toFixed(1)}));
  const d='M '+px.map(p=>`${p.x} ${p.y}`).join(' L ');
  const sw=(2/(_rutaZoom||1)).toFixed(2);
  const path=document.createElementNS('http://www.w3.org/2000/svg','path');
  path.classList.add('iso-area-temp');
  path.setAttribute('d',d);path.setAttribute('stroke','#f59e0b');path.setAttribute('stroke-width',sw);
  path.setAttribute('fill','none');path.setAttribute('stroke-linecap','round');path.setAttribute('stroke-linejoin','round');
  svg.appendChild(path);
  if(_isoAreaPuntos.length>=3){
    const fp=document.createElementNS('http://www.w3.org/2000/svg','path');
    fp.classList.add('iso-area-temp');
    fp.setAttribute('d',d+' Z');fp.setAttribute('fill','#f59e0b');fp.setAttribute('fill-opacity','.12');fp.setAttribute('stroke','none');
    svg.appendChild(fp);
    const cl=document.createElementNS('http://www.w3.org/2000/svg','line');
    cl.classList.add('iso-area-temp');
    cl.setAttribute('x1',px[px.length-1].x);cl.setAttribute('y1',px[px.length-1].y);
    cl.setAttribute('x2',px[0].x);cl.setAttribute('y2',px[0].y);
    cl.setAttribute('stroke','#f59e0b');cl.setAttribute('stroke-width',(1.5/(_rutaZoom||1)).toFixed(2));cl.setAttribute('stroke-dasharray','4 3');cl.setAttribute('opacity','.5');
    svg.appendChild(cl);
  }
  px.forEach(p=>{
    const c=document.createElementNS('http://www.w3.org/2000/svg','circle');
    c.classList.add('iso-area-temp');
    c.setAttribute('cx',p.x);c.setAttribute('cy',p.y);c.setAttribute('r',(4/(_rutaZoom||1)).toFixed(2));
    c.setAttribute('fill','#f59e0b');c.setAttribute('stroke','#fff');c.setAttribute('stroke-width',(1.5/(_rutaZoom||1)).toFixed(2));
    svg.appendChild(c);
  });
}

function _isoAreaMapClick(e){
  if(e.detail>1)return;
  const canvas=document.getElementById('rutaCanvas');if(!canvas)return;
  const r=canvas.getBoundingClientRect();
  const x=parseFloat(((e.clientX-r.left)/r.width*100).toFixed(2));
  const y=parseFloat(((e.clientY-r.top)/r.height*100).toFixed(2));
  if(_isoPlanDibujando){_isoPlanPuntos.push({x,y});_isoAreaRenderSvg(DB.frentesTrabajo||[]);return;}
  if(!_isoAreaDibujando||!_isoAreaSelId)return;
  _isoAreaPuntos.push({x,y});
  _isoAreaTempRender();
}

function _isoAreaMapDblClick(e){
  if(_isoPlanDibujando){
    e.preventDefault();
    if(_isoPlanPuntos.length)_isoPlanPuntos.pop();
    if(_isoPlanPuntos.length<3){toast('Necesitas al menos 3 vértices',true);return;}
    document.getElementById('isoPlanDibujoForm').style.display='block';
    return;
  }
  if(!_isoAreaDibujando)return;
  e.preventDefault();
  if(_isoAreaPuntos.length)_isoAreaPuntos.pop();
  if(_isoAreaPuntos.length<3){toast('Necesitas al menos 3 vértices',true);return;}
  _isoAreaGuardar();
}

function _isoAreaMouseMove(e){
  if(!_isoAreaDibujando)return;
  const canvas=document.getElementById('rutaCanvas');if(!canvas)return;
  const r=canvas.getBoundingClientRect();
  const xPct=(e.clientX-r.left)/r.width*100;
  const yPct=(e.clientY-r.top)/r.height*100;
  const cur=document.getElementById('rutaCursor');
  if(cur){cur.style.left=xPct+'%';cur.style.top=yPct+'%';cur.style.transform='translate(-50%,-50%) scale('+(1/(_rutaZoom||1))+')';}
  const svg=document.getElementById('rutaSvg');if(!svg)return;
  const W=svg.clientWidth,H=svg.clientHeight;
  const xPx=(xPct*W/100).toFixed(1),yPx=(yPct*H/100).toFixed(1);
  const prev=svg.querySelector('#isoAreaPreview');
  if(_isoAreaPuntos.length){
    const last=_isoAreaPuntos[_isoAreaPuntos.length-1];
    const lxPx=(last.x*W/100).toFixed(1),lyPx=(last.y*H/100).toFixed(1);
    const line=prev||document.createElementNS('http://www.w3.org/2000/svg','line');
    line.id='isoAreaPreview';
    line.setAttribute('x1',lxPx);line.setAttribute('y1',lyPx);
    line.setAttribute('x2',xPx);line.setAttribute('y2',yPx);
    line.setAttribute('stroke','#f59e0b');line.setAttribute('stroke-width',(2/(_rutaZoom||1)).toFixed(2));
    line.setAttribute('stroke-dasharray','5 3');line.setAttribute('opacity','.8');
    if(!prev)svg.appendChild(line);
  }else if(prev){prev.remove();}
}

function _isoAreaUpdateStats(){
  (DB.frentesTrabajo||[]).forEach((f,i)=>{
    const el=document.getElementById(`iso-area-stat-${f.id}`);
    if(!el)return;
    const col=_frenteColors[i%_frenteColors.length];
    const ptsIso=(f.puntosIso||[]).length;
    const ptsPlan=(f.puntos||[]).length;
    el.innerHTML=`<span style="color:${ptsIso>=3?col:'var(--muted2)'}">Iso: ${ptsIso}pts</span><span style="color:var(--muted2)"> · Plan: ${ptsPlan}pts</span>`;
  });
}

// ── VISTA 1: PLANIFICACIÓN (drag & drop) ───────────────────────────────────
function _pizRenderPlan(c){
  const items=(DB.pizarraItems||[]).filter(x=>x.tab===_pizActiveTabKey&&x.tipo!=='frente');
  const equipos=(DB.equipos||[]).filter(e=>e.est!=='Baja');

  // ── Personal de piso: agrega desde lpsWbsRecursos (Personal) o fallback a DB.personal ──
  const cargoMap={};
  const lpsPersonal=(DB.lpsWbsRecursos||[]).filter(r=>r.tipo==='Personal');
  if(lpsPersonal.length){
    lpsPersonal.forEach(r=>{
      const cargo=(r.nombre||'').split('–').slice(-1)[0].trim()||'Personal';
      cargoMap[cargo]=(cargoMap[cargo]||0)+(+(r.cantidad)||0);
    });
  } else {
    (DB.personal||[]).filter(p=>p.tipo!=='Staff'&&(p.est||'').toLowerCase()==='activo').forEach(p=>{
      const cargo=(p.cargo||'Sin cargo').trim();
      cargoMap[cargo]=(cargoMap[cargo]||0)+1;
    });
  }
  const placedMap={};
  items.filter(x=>x.tipo==='personal').forEach(x=>{placedMap[x.etiqueta||'']=(placedMap[x.etiqueta||'']||0)+(x.cant||1);});
  const personalHtml=Object.entries(cargoMap).map(([cargo,total])=>{
    const placed=placedMap[cargo]||0;
    const avail=Math.max(0,total-placed);
    const pct=total>0?Math.round(placed/total*100):0;
    const ok=avail>0;
    const safeCargo=cargo.replace(/'/g,"\\'");
    return`<div draggable="${ok}" ondragstart="${ok}?_pizDragStart(event,'personal',0,'${safeCargo}','#10b981'):event.preventDefault()"
      style="cursor:${ok?'grab':'not-allowed'};padding:.25rem .4rem;margin-bottom:.2rem;background:rgba(16,185,129,.07);border:1px solid rgba(16,185,129,${ok?'.22':'.08'});border-radius:5px;opacity:${ok?1:.45}"
      title="${avail} disponibles de ${total}">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:.3rem;font-size:.67rem">
        <span>👷 ${cargo}</span>
        <span style="font-size:.62rem;font-weight:700;color:${avail>0?'#10b981':'#ef4444'};white-space:nowrap">${avail}/${total}</span>
      </div>
      <div style="height:3px;background:rgba(255,255,255,.1);border-radius:2px;margin-top:.2rem">
        <div style="height:100%;width:${pct}%;background:${pct>=90?'#ef4444':pct>=60?'#f59e0b':'#10b981'};border-radius:2px"></div>
      </div>
    </div>`;
  }).join('')||'<div style="font-size:.62rem;color:var(--muted2);padding:.3rem;text-align:center">Sin personal en WBS</div>';

  const eqByCodeP={};
  equipos.forEach(e=>{eqByCodeP[e.codigo]=e;});
  const markers=items.map(item=>{
    const col=item.color||'#10b981';
    const esPersonal=item.tipo==='personal';
    const cant=item.cant||1;
    const cantLabel=esPersonal&&cant>1?`<span style="background:rgba(0,0,0,.25);border-radius:3px;padding:0 3px;margin-right:1px;font-size:.58rem">${cant}×</span> `:'';
    const dblClick=esPersonal?`ondblclick="event.stopPropagation();_pizMarkerDblClick(${item.id})"`:'';
    let icHtml, hasSp=false;
    if(item.tipo==='equipo'){
      const eq=eqByCodeP[item.etiqueta];
      const sp=eq?_pizEqSprite(eq.sub):null;
      hasSp=!!sp;
      icHtml=sp
        ?`<div style="width:52px;height:38px;flex-shrink:0;background-image:url('${_pizSpriteUrl()}');background-size:500% 300%;background-position:${sp};background-repeat:no-repeat"></div>`
        :`<span style="font-size:.8rem">🚜</span>`;
    } else {
      icHtml=`<span style="font-size:.8rem">${{personal:'👷',nota:'📝'}[item.tipo]||'📌'}</span>`;
    }
    return`<div id="piz-m-${item.id}" class="eq-marker"
      style="position:absolute;left:${item.x}%;top:${item.y}%;transform:translate(-50%,-100%);transform-origin:50% 100%;cursor:grab;z-index:10;user-select:none;text-align:center"
      onmousedown="_pizMousedown(event,${item.id})" ${dblClick}>
      ${hasSp
        ?`<div style="display:inline-flex;flex-direction:column;align-items:center;gap:2px;filter:drop-shadow(0 2px 6px rgba(0,0,0,.8))">
            ${icHtml}
            <div style="background:rgba(0,0,0,.55);backdrop-filter:blur(4px);color:#fff;border-radius:4px;padding:1px 5px;font-size:.6rem;font-weight:700;white-space:nowrap;display:flex;align-items:center;gap:3px">
              ${cantLabel}${_pizEqCode(item.etiqueta)}
              <span onclick="event.stopPropagation();_pizRemoveItem(${item.id})" style="cursor:pointer;opacity:.7;line-height:1;font-size:.65rem">✕</span>
            </div>
          </div>`
        :`<div style="background:${col};color:#fff;border-radius:6px;padding:2px 8px;font-size:.65rem;font-weight:700;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.55);display:inline-flex;align-items:center;gap:3px">
            ${icHtml}${cantLabel}${_pizEqCode(item.etiqueta)}
            <span onclick="event.stopPropagation();_pizRemoveItem(${item.id})" style="margin-left:3px;cursor:pointer;opacity:.7;line-height:1">✕</span>
          </div>
          <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:7px solid ${col};margin:0 auto"></div>`
      }
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
      <div style="font-size:.68rem;color:#10b981;font-weight:700;margin:.6rem 0 .3rem">👷 Personal de Piso</div>
      ${personalHtml}
      <div style="font-size:.68rem;color:#8b5cf6;font-weight:700;margin:.6rem 0 .3rem">📝 Anotaciones</div>
      <button onclick="_pizAgregarNota()" style="width:100%;background:rgba(139,92,246,.1);border:1px dashed rgba(139,92,246,.4);border-radius:5px;color:#8b5cf6;cursor:pointer;padding:.3rem;font-size:.67rem">＋ Nota libre</button>
      <hr style="border-color:var(--border);margin:.7rem 0">
      <button onclick="_pizLimpiar()" style="width:100%;background:rgba(239,68,68,.07);border:1px solid rgba(239,68,68,.25);border-radius:5px;color:#ef4444;cursor:pointer;padding:.3rem;font-size:.65rem">🗑 Limpiar mapa</button>
    </div>
    <!-- MAPA CON ZOOM/PAN -->
    <div style="position:relative;overflow:hidden;border-radius:8px;border:1px solid var(--border);background:#111" id="rutaMapWrap"
      ondragover="event.preventDefault()" ondrop="_pizDrop(event)">
      <div id="rutaCanvas" style="position:relative;transform-origin:0 0;cursor:default;display:inline-block;min-width:100%">
        <img id="rutaImg" src="${_pizCurrentImgUrl()}" style="display:block;width:100%;pointer-events:none;user-select:none" draggable="false">
        <svg id="rutaSvg" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible" xmlns="http://www.w3.org/2000/svg"></svg>
        ${markers}
        ${!items.length?`<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none">
          <div style="background:rgba(0,0,0,.6);color:#fff;border-radius:8px;padding:.8rem 1.4rem;font-size:.75rem;text-align:center;backdrop-filter:blur(4px)">
            Arrastra equipos o personal al mapa · Rueda=zoom · Arrastrar mapa=pan<br>
            <span style="font-size:.65rem;opacity:.6">Las posiciones se guardan automáticamente</span>
          </div></div>`:''}
      </div>
      <div style="position:absolute;bottom:.6rem;right:.6rem;display:flex;align-items:center;gap:.25rem;z-index:20;background:rgba(10,10,20,.75);border:1px solid #ffffff18;border-radius:7px;padding:.25rem .4rem;backdrop-filter:blur(6px)">
        <button onclick="_rutaZoomOut()" style="width:22px;height:22px;border-radius:4px;border:1px solid #ffffff20;background:#ffffff10;color:#e0e0e0;cursor:pointer;font-size:.9rem;line-height:1">−</button>
        <span id="rutaZoomPct" style="font-size:.65rem;color:#e0e0e0;min-width:36px;text-align:center;font-weight:700">100%</span>
        <button onclick="_rutaZoomIn()" style="width:22px;height:22px;border-radius:4px;border:1px solid #ffffff20;background:#ffffff10;color:#e0e0e0;cursor:pointer;font-size:.9rem;line-height:1">+</button>
        <div style="width:1px;height:14px;background:#ffffff20;margin:0 .1rem"></div>
        <button onclick="_rutaZoomReset()" style="padding:0 .35rem;height:22px;border-radius:4px;border:1px solid #ffffff20;background:#ffffff10;color:#e0e0e0;cursor:pointer;font-size:.65rem">↺ Fit</button>
        <div style="width:1px;height:14px;background:#ffffff20;margin:0 .1rem"></div>
        <button id="rutaLockBtn" onclick="_rutaToggleLock()" title="Bloquear/desbloquear zoom" style="padding:0 .35rem;height:22px;border-radius:4px;border:1px solid #ffffff20;background:#ffffff10;color:#e0e0e0;cursor:pointer;font-size:.85rem">${_rutaZoomLocked?'🔒':'🔓'}</button>
      </div>
    </div>
  </div>`;

  const wrap=document.getElementById('rutaMapWrap');
  if(wrap){
    wrap.addEventListener('wheel',_rutaOnWheel,{passive:false});
    wrap.addEventListener('mousedown',_pizPlanMapMousedown);
  }
  document.addEventListener('mousemove',_rutaOnGlobalMousemove);
  document.addEventListener('mouseup',_pizPlanGlobalMouseup);
  requestAnimationFrame(()=>{
    if(_rutaZoom===1&&_rutaPanX===0)_rutaFitView();else _rutaApplyTransform();
    _frenteRenderSvg(DB.frentesTrabajo||[]);
  });
}

function _pizPlanMapMousedown(e){
  if(e.target.closest('[id^="piz-m-"]')||e.button!==0)return;
  _rutaIsPanning=true;_rutaDidPan=false;
  _rutaPanStart={x:e.clientX-_rutaPanX,y:e.clientY-_rutaPanY};
  const canvas=document.getElementById('rutaCanvas');if(canvas)canvas.style.cursor='grabbing';
}
function _pizPlanGlobalMouseup(e){
  if(_pizMoving){
    document.removeEventListener('mousemove',_pizMousemove);
    const canvas=document.getElementById('rutaCanvas');
    if(canvas){
      const rect=canvas.getBoundingClientRect();
      const x=+(Math.max(0.5,Math.min(99.5,(e.clientX-rect.left)/rect.width*100)).toFixed(1));
      const y=+(Math.max(0.5,Math.min(99.5,(e.clientY-rect.top)/rect.height*100)).toFixed(1));
      const item=(DB.pizarraItems||[]).find(i=>i.id===_pizMoving.id);
      if(item){item.x=x;item.y=y;syncSheet('savePizItem',item);}
    }
    _pizMoving=null;
  }
  _rutaIsPanning=false;_rutaDidPan=false;
  const canvas=document.getElementById('rutaCanvas');if(canvas)canvas.style.cursor='default';
}

// ── VISTA 2: ESTADO REAL ────────────────────────────────────────────────────
function _pizRenderReal(c){
  const fecha=_pizGetFecha();
  const fColors=['#f59e0b','#10b981','#3b82f6','#8b5cf6','#ec4899','#06b6d4','#84cc16','#f97316','#14b8a6','#a78bfa'];
  const frenteSorted=(DB.frentesTrabajo||[]).sort((a,b)=>(a.nombre||a.nom||'').localeCompare(b.nombre||b.nom||''));
  const fColorMap={};frenteSorted.forEach((f,i)=>fColorMap[f.id]=fColors[i%fColors.length]);

  // Último parte del día por equipo (si tiene varios en el mismo día, el de mayor id = más reciente)
  const lastParteByEq={};
  (DB.partes||[]).forEach(p=>{
    if(!p.eqId||p.fecha!==fecha)return;
    if(!lastParteByEq[p.eqId]||p.id>lastParteByEq[p.eqId].id)lastParteByEq[p.eqId]=p;
  });
  const hoyPartes=Object.values(lastParteByEq);
  const ops=hoyPartes.filter(p=>(p.condicion||'').toUpperCase().includes('OPERATIVO')).length;
  const stdby=hoyPartes.filter(p=>(p.condicion||'').toUpperCase()==='STANDBY').length;
  const inop=hoyPartes.length-ops-stdby;

  // Centroide del polígono
  function centroid(f){
    const pts=f.puntos||[];if(pts.length<3)return null;
    return{x:pts.reduce((s,p)=>s+p.x,0)/pts.length, y:pts.reduce((s,p)=>s+p.y,0)/pts.length};
  }

  // Agrupar por frente usando último parte conocido
  const byFrente={};const sinPos=[];
  Object.values(lastParteByEq).forEach(p=>{
    // frenteT puede ser "FrenteA, FrenteB, FrenteC" → usar el último que tenga área dibujada
    const lista=(p.frenteT||'').split(',').map(s=>s.trim()).filter(Boolean);
    if(!lista.length){sinPos.push(p);return;}
    let ft=null;
    for(let i=lista.length-1;i>=0;i--){
      const f=frenteSorted.find(f=>(f.nombre||f.nom||f.frente||'').trim()===lista[i]);
      if(f&&centroid(f)){ft=f;break;}
    }
    if(!ft){sinPos.push(p);return;}
    const cen=centroid(ft);
    if(!byFrente[ft.id])byFrente[ft.id]={ft,cen,partes:[]};
    byFrente[ft.id].partes.push(p);
  });

  // Si hay frente seleccionado mostrar solo ese
  const visibleByFrente=_realSelFrente
    ?(byFrente[_realSelFrente]?{[_realSelFrente]:byFrente[_realSelFrente]}:{})
    :byFrente;

  // Markers de equipos en frentes
  const eqMarkers=Object.values(visibleByFrente).flatMap(({ft,cen,partes})=>{
    const nCols=Math.ceil(Math.sqrt(partes.length));
    return partes.map((p,i)=>{
      const eq=(DB.equipos||[]).find(e=>e.id===p.eqId);if(!eq)return'';
      const row=Math.floor(i/nCols), col=i%nCols;
      const ox=(col-(nCols-1)/2)*2.2, oy=row*2.2;
      const eqCol=_pizCondColor(p.condicion);
      return`<div class="eq-marker" style="position:absolute;left:${(cen.x+ox).toFixed(1)}%;top:${(cen.y+oy).toFixed(1)}%;transform:translate(-50%,-100%);transform-origin:50% 100%;cursor:pointer;z-index:15;user-select:none"
        onclick="_pizPopup(${p.eqId},'${p.fecha}')">
        <div style="background:${eqCol};color:#fff;border-radius:4px;padding:1px 5px;font-size:.52rem;font-weight:700;white-space:nowrap;box-shadow:0 1px 6px rgba(0,0,0,.6)">
          ${_pizEqIcon(eq.sub)} ${_pizEqCode(eq.codigo)}
        </div>
        <div style="width:0;height:0;border-left:3px solid transparent;border-right:3px solid transparent;border-top:5px solid ${eqCol};margin:0 auto"></div>
      </div>`;
    });
  }).join('');

  c.innerHTML=`
  <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.6rem;flex-wrap:wrap">
    <label style="font-size:.7rem;color:var(--muted2);font-weight:700">📅 Día trabajado:</label>
    <input type="date" value="${fecha}"
      style="background:var(--panel2);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:.2rem .5rem;font-size:.72rem;cursor:pointer"
      onchange="_pizFecha=this.value;_pizRenderTab()">
    <div style="width:1px;height:18px;background:var(--border)"></div>
    <label style="font-size:.7rem;color:var(--muted2);font-weight:700">🏗️ Frente:</label>
    <select onchange="_realZoomToFrente(this.value)"
      style="background:var(--panel2);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:.2rem .5rem;font-size:.7rem;cursor:pointer;max-width:220px">
      <option value="">— Todos —</option>
      ${frenteSorted.map(f=>`<option value="${f.id}" ${_realSelFrente==f.id?'selected':''}>${f.nombre||f.nom||f.frente||'Frente '+f.id}</option>`).join('')}
    </select>
    <div style="width:1px;height:18px;background:var(--border)"></div>
    <span style="font-size:.68rem;color:var(--muted2)">${hoyPartes.length} parte(s) ese día</span>
    <span style="background:rgba(16,185,129,.15);color:#10b981;border:1px solid #10b98130;border-radius:5px;padding:1px 7px;font-size:.68rem;font-weight:700">● ${ops} Op.</span>
    <span style="background:rgba(245,158,11,.15);color:#f59e0b;border:1px solid #f59e0b30;border-radius:5px;padding:1px 7px;font-size:.68rem;font-weight:700">● ${stdby} Stdby</span>
    <span style="background:rgba(239,68,68,.15);color:#ef4444;border:1px solid #ef444430;border-radius:5px;padding:1px 7px;font-size:.68rem;font-weight:700">● ${inop} Inop.</span>
    <span style="font-size:.6rem;color:var(--muted2)">· ${Object.values(byFrente).reduce((s,v)=>s+v.partes.length,0)} ubicados · ${sinPos.length} sin frente</span>
    <span style="margin-left:auto;font-size:.56rem;color:var(--muted2)">Último frente del día por equipo</span>
  </div>
  <div style="display:grid;grid-template-columns:1fr${sinPos.length?' 160px':''};gap:.7rem;height:calc(100vh - 240px)">
    <div style="position:relative;overflow:hidden;border-radius:8px;border:1px solid var(--border);background:#111" id="rutaMapWrap">
      <div id="rutaCanvas" style="position:relative;transform-origin:0 0;display:inline-block;min-width:100%">
        <img id="rutaImg" src="${_pizImgUrl()}" style="display:block;width:100%;pointer-events:none;user-select:none" draggable="false">
        <svg id="rutaSvg" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible" xmlns="http://www.w3.org/2000/svg"></svg>
        ${eqMarkers}
        ${!Object.keys(lastParteByEq).length?`<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none">
          <div style="background:rgba(0,0,0,.65);color:#fff;border-radius:8px;padding:.8rem 1.4rem;font-size:.78rem;text-align:center">
            Sin partes registrados el ${fecha}
          </div></div>`:''}
      </div>
      <div style="position:absolute;bottom:.6rem;right:.6rem;display:flex;align-items:center;gap:.25rem;z-index:20;background:rgba(10,10,20,.75);border:1px solid #ffffff18;border-radius:7px;padding:.25rem .4rem;backdrop-filter:blur(6px)">
        <button onclick="_rutaZoomOut()" style="width:22px;height:22px;border-radius:4px;border:1px solid #ffffff20;background:#ffffff10;color:#e0e0e0;cursor:pointer;font-size:.9rem;line-height:1">−</button>
        <span id="rutaZoomPct" style="font-size:.65rem;color:#e0e0e0;min-width:36px;text-align:center;font-weight:700">100%</span>
        <button onclick="_rutaZoomIn()" style="width:22px;height:22px;border-radius:4px;border:1px solid #ffffff20;background:#ffffff10;color:#e0e0e0;cursor:pointer;font-size:.9rem;line-height:1">+</button>
        <div style="width:1px;height:14px;background:#ffffff20;margin:0 .1rem"></div>
        <button onclick="_rutaZoomReset()" style="padding:0 .35rem;height:22px;border-radius:4px;border:1px solid #ffffff20;background:#ffffff10;color:#e0e0e0;cursor:pointer;font-size:.65rem">↺ Fit</button>
        <div style="width:1px;height:14px;background:#ffffff20;margin:0 .1rem"></div>
        <button id="rutaLockBtn" onclick="_rutaToggleLock()" title="Bloquear/desbloquear zoom" style="padding:0 .35rem;height:22px;border-radius:4px;border:1px solid #ffffff20;background:#ffffff10;color:#e0e0e0;cursor:pointer;font-size:.85rem">${_rutaZoomLocked?'🔒':'🔓'}</button>
      </div>
    </div>
    ${sinPos.length?`<div style="overflow-y:auto;border:1px solid var(--border);border-radius:8px;padding:.5rem;background:var(--panel2)">
      <div style="font-size:.62rem;color:#ef4444;font-weight:700;text-transform:uppercase;margin-bottom:.3rem">Sin frente (${sinPos.length})</div>
      <div style="font-size:.6rem;color:var(--muted2);margin-bottom:.4rem;line-height:1.3">Sin área dibujada en la pestaña Frentes</div>
      ${sinPos.map(p=>{
        const eq=(DB.equipos||[]).find(e=>e.id===p.eqId);if(!eq)return'';
        const col=_pizCondColor(p.condicion);
        return`<div style="padding:.3rem .4rem;margin-bottom:.25rem;border-left:3px solid ${col};background:rgba(255,255,255,.02);border-radius:0 5px 5px 0;font-size:.65rem;cursor:pointer" onclick="_pizPopup(${p.eqId},'${p.fecha}')">
          ${_pizEqIcon(eq.sub)} <strong>${_pizEqCode(eq.codigo)}</strong><br>
          <span style="color:${col};font-size:.62rem">${p.condicion||'—'}</span>
          <span style="color:var(--muted2);font-size:.6rem;display:block">${p.frenteT||'Sin frente'}</span>
        </div>`;
      }).join('')}
    </div>`:''}
  </div>
  <div id="pizPopup" style="display:none;position:fixed;inset:0;z-index:998;align-items:center;justify-content:center" onclick="this.style.display='none'">
    <div style="background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:1rem 1.2rem;min-width:250px;max-width:320px;box-shadow:0 8px 30px rgba(0,0,0,.5)" onclick="event.stopPropagation()">
      <div id="pizPopupBody"></div>
      <button onclick="document.getElementById('pizPopup').style.display='none'" style="margin-top:.7rem;width:100%;background:none;border:1px solid var(--border);border-radius:6px;color:var(--muted2);cursor:pointer;padding:.3rem;font-size:.72rem">Cerrar</button>
    </div>
  </div>`;

  const wrap=document.getElementById('rutaMapWrap');
  if(wrap){
    wrap.addEventListener('wheel',_rutaOnWheel,{passive:false});
    wrap.addEventListener('mousedown',_pizRealMousedown);
  }
  document.addEventListener('mousemove',_rutaOnGlobalMousemove);
  document.addEventListener('mouseup',_pizRealGlobalMouseup);
  requestAnimationFrame(()=>{
    if(_rutaZoom===1&&_rutaPanX===0)_rutaFitView();else _rutaApplyTransform();
    _frenteRenderSvg(DB.frentesTrabajo||[]);
  });
}
function _pizRealMousedown(e){
  if(e.button!==0)return;
  _rutaIsPanning=true;_rutaDidPan=false;
  _rutaPanStart={x:e.clientX-_rutaPanX,y:e.clientY-_rutaPanY};
  const canvas=document.getElementById('rutaCanvas');if(canvas)canvas.style.cursor='grabbing';
}
function _pizRealGlobalMouseup(){
  _rutaIsPanning=false;_rutaDidPan=false;
  const canvas=document.getElementById('rutaCanvas');if(canvas)canvas.style.cursor='default';
}
function _realZoomToFrente(id){
  _realSelFrente=id?+id:null;
  _pizRenderTab();
  if(!id){_rutaZoom=1;_rutaPanX=0;_rutaPanY=0;requestAnimationFrame(_rutaFitView);return;}
  requestAnimationFrame(()=>{
    const ft=(DB.frentesTrabajo||[]).find(f=>f.id===+id);
    if(!ft||(ft.puntos||[]).length<3)return;
    const pts=ft.puntos;
    const cx=pts.reduce((s,p)=>s+p.x,0)/pts.length;
    const cy=pts.reduce((s,p)=>s+p.y,0)/pts.length;
    const wrap=document.getElementById('rutaMapWrap');
    const canvas=document.getElementById('rutaCanvas');
    if(!wrap||!canvas)return;
    const wW=wrap.clientWidth,wH=wrap.clientHeight;
    const cW=canvas.offsetWidth,cH=canvas.offsetHeight;
    _rutaZoom=8;
    _rutaPanX=wW/2-(cx/100)*cW*_rutaZoom;
    _rutaPanY=wH/2-(cy/100)*cH*_rutaZoom;
    _rutaApplyTransform();
    _frenteRenderSvg(DB.frentesTrabajo||[]);
  });
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
  const canvas=document.getElementById('rutaCanvas');if(!canvas)return;
  const rect=canvas.getBoundingClientRect();
  const x=+((e.clientX-rect.left)/rect.width*100).toFixed(1);
  const y=+((e.clientY-rect.top)/rect.height*100).toFixed(1);
  // Reubicar si ya existe EN EL MISMO CONTEXTO de fecha (importante para ISO plan mode)
  if(tipo!=='personal'&&tipo!=='nota'){
    const existing=(DB.pizarraItems||[]).find(i=>
      i.tipo===tipo&&i.refId===refId&&i.tab===_pizActiveTabKey&&
      (_pizActiveTabKey==='iso'
        ? (_isoFecha ? i.fecha===_isoFecha : !i.fecha)
        : true)
    );
    if(existing){existing.x=x;existing.y=y;syncSheet('savePizItem',existing);_pizRenderTab();return;}
  }
  const rec={id:nid('piz'),tipo,refId,etiqueta:label,x,y,color,tab:_pizActiveTabKey,cant:1};
  if(_pizActiveTabKey==='iso'&&_isoFecha)rec.fecha=_isoFecha;
  DB.pizarraItems.push(rec);
  syncSheet('savePizItem',rec);
  _pizRenderTab();
}

function _pizMarkerDblClick(id){
  const item=(DB.pizarraItems||[]).find(i=>i.id===id);
  if(!item||item.tipo!=='personal')return;
  const cargo=item.etiqueta||'';
  // Total disponible en el pool para este cargo
  const cargoMap={};
  const lpsP=(DB.lpsWbsRecursos||[]).filter(r=>r.tipo==='Personal');
  if(lpsP.length){lpsP.forEach(r=>{const c=(r.nombre||'').split('–').slice(-1)[0].trim()||'Personal';cargoMap[c]=(cargoMap[c]||0)+(+(r.cantidad)||0);});}
  else{(DB.personal||[]).filter(p=>p.tipo!=='Staff'&&(p.est||'').toLowerCase()==='activo').forEach(p=>{const c=(p.cargo||'Sin cargo').trim();cargoMap[c]=(cargoMap[c]||0)+1;});}
  const total=cargoMap[cargo]||0;
  // Cuánto ocupan los OTROS marcadores de este cargo en el mapa
  const otrosUsados=(DB.pizarraItems||[]).filter(x=>x.tab===_pizActiveTabKey&&x.tipo==='personal'&&x.etiqueta===cargo&&x.id!==id).reduce((s,x)=>s+(x.cant||1),0);
  const maxDisp=total-otrosUsados;
  if(maxDisp<1){toast('No quedan '+cargo+' disponibles',true);return;}
  const input=prompt(`Cantidad de "${cargo}" en esta etiqueta\n(disponibles: ${maxDisp} de ${total} totales):`, item.cant||1);
  if(input===null)return;
  const nueva=Math.max(1,Math.min(maxDisp,+input||1));
  item.cant=nueva;
  syncSheet('savePizItem',item);
  _pizRenderTab();
}

// ── Arrastrar markers sobre el mapa ────────────────────────────────────────
function _pizMousedown(e,id){
  e.preventDefault();e.stopPropagation();
  _pizMoving={id};
  document.addEventListener('mousemove',_pizMousemove);
  // release is handled by _pizPlanGlobalMouseup (already registered on rutaMapWrap mousedown)
}
function _pizMousemove(e){
  if(!_pizMoving)return;
  const canvas=document.getElementById('rutaCanvas');if(!canvas)return;
  const rect=canvas.getBoundingClientRect();
  const x=Math.max(0.5,Math.min(99.5,(e.clientX-rect.left)/rect.width*100));
  const y=Math.max(0.5,Math.min(99.5,(e.clientY-rect.top)/rect.height*100));
  const el=document.getElementById('piz-m-'+_pizMoving.id);
  if(el){el.style.left=x+'%';el.style.top=y+'%';}
}
function _pizMouseup(e){
  // Handled by _pizPlanGlobalMouseup to combine with pan release
}

// ── Acciones ────────────────────────────────────────────────────────────────
function _pizRemoveItem(id){
  DB.pizarraItems=(DB.pizarraItems||[]).filter(i=>i.id!==id);
  supaDelete('pizarraItems',id);
  _pizRenderTab();
}

function _pizLimpiar(){
  const label=_pizActiveTabKey==='iso'
    ?(_isoFecha?`equipos planificados para ${_isoFecha}`:'mapa isométrico permanente')
    :'mapa de planificación';
  if(!confirm('¿Limpiar '+label+'?'))return;
  const toDelete=(DB.pizarraItems||[]).filter(i=>
    i.tab===_pizActiveTabKey&&
    (_pizActiveTabKey==='iso' ? (_isoFecha ? i.fecha===_isoFecha : !i.fecha) : true)
  );
  toDelete.forEach(i=>supaDelete('pizarraItems',i.id));
  DB.pizarraItems=(DB.pizarraItems||[]).filter(i=>!toDelete.includes(i));
  _pizRenderTab();
}

function _pizAgregarNota(){
  const txt=(prompt('Texto de la anotación:','')||'').trim();
  if(!txt)return;
  const rec={id:nid('piz'),tipo:'nota',refId:0,etiqueta:txt,x:50,y:40,color:'#8b5cf6',tab:_pizActiveTabKey};
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
    <div style="position:relative;flex-shrink:0">
      <button onclick="_rutaCopyToggle(event)" style="font-size:.7rem;padding:.2rem .6rem;border-radius:5px;border:1px solid #8b5cf640;background:rgba(139,92,246,.08);color:#8b5cf6;cursor:pointer;white-space:nowrap">📋 Copiar desde...</button>
      <div id="rutaCopyDrop" style="display:none;position:absolute;top:110%;left:0;z-index:200;background:var(--panel);border:1px solid var(--border);border-radius:7px;min-width:230px;max-height:220px;overflow-y:auto;box-shadow:0 8px 24px #00000060">
        ${tramos.filter(t=>t.puntos&&t.puntos.length>=2).length
          ? tramos.filter(t=>t.puntos&&t.puntos.length>=2).map(t=>`<div onclick="_rutaCopiarDesde(${t.id})" style="padding:.4rem .7rem;cursor:pointer;border-bottom:1px solid var(--border)" onmouseover="this.style.background='var(--panel2)'" onmouseout="this.style.background=''">
              <div style="font-size:.7rem;font-weight:700;color:var(--text)">${t.codigo||'Tramo'} <span style="font-weight:400;color:var(--muted2)">· ${t.puntos.length} pts</span></div>
              ${t.inicio||t.fin?`<div style="font-size:.6rem;color:var(--muted2)">${t.inicio||''}${t.fin?' → '+t.fin:''}</div>`:''}
            </div>`).join('')
          : '<div style="padding:.7rem .9rem;color:var(--muted2);font-size:.7rem">Sin tramos con ruta dibujada</div>'}
      </div>
    </div>
    <button onclick="_rutaUndoUltimo()" style="font-size:.7rem;padding:.2rem .6rem;border-radius:5px;border:1px solid #06b6d440;background:rgba(6,182,212,.08);color:#06b6d4;cursor:pointer;white-space:nowrap;flex-shrink:0">⌫ Deshacer</button>
    <div style="width:1px;height:18px;background:var(--border);flex-shrink:0"></div>
    <button id="rutaBtnVista" onclick="_rutaToggleVista()" title="Cambiar entre vista de plan (aérea) e isométrica" style="font-size:.7rem;padding:.2rem .6rem;border-radius:5px;border:1px solid #f9731640;background:rgba(249,115,22,.07);color:#f97316;cursor:pointer;white-space:nowrap;flex-shrink:0">🏔️ Vista Isométrico</button>
    <button onclick="_rutaLimpiarTodas()" title="Borra los trazados de la vista ACTIVA para redibujar" style="font-size:.7rem;padding:.2rem .6rem;border-radius:5px;border:1px solid #f97316;background:rgba(249,115,22,.1);color:#f97316;cursor:pointer;white-space:nowrap;flex-shrink:0">🔄 Limpiar Trazados</button>
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
          <div id="ruta-stat-${t.id}" style="font-size:.56rem;padding-left:14px;margin-top:1px">
            <span style="color:${pts?col:'var(--muted2)'}">Plan: ${pts||0}pts</span>
            <span style="color:var(--muted2)"> · </span>
            <span style="color:${(t.puntosIso||[]).length?'#f97316':'var(--muted2)'}">Iso: ${(t.puntosIso||[]).length||0}pts</span>
          </div>
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
        <div style="width:1px;height:14px;background:#ffffff20;margin:0 .1rem"></div>
        <button id="rutaLockBtn" onclick="_rutaToggleLock()" title="Bloquear/desbloquear zoom" style="padding:0 .35rem;height:22px;border-radius:4px;border:1px solid #ffffff20;background:#ffffff10;color:#e0e0e0;cursor:pointer;font-size:.85rem">${_rutaZoomLocked?'🔒':'🔓'}</button>
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
  // Counter-scale para que los markers de equipos siempre aparezcan al mismo tamaño visual
  const s=(1/_rutaZoom).toFixed(4);
  document.querySelectorAll('.eq-marker').forEach(el=>{
    el.style.transform=`translate(-50%,-100%) scale(${s})`;
  });
  // Actualizar ícono del candado
  const lb=document.getElementById('rutaLockBtn');
  if(lb)lb.textContent=_rutaZoomLocked?'🔒':'🔓';
}
function _rutaToggleLock(){
  _rutaZoomLocked=!_rutaZoomLocked;
  const lb=document.getElementById('rutaLockBtn');
  if(lb)lb.textContent=_rutaZoomLocked?'🔒':'🔓';
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

function _rutaZoomIn(){if(!_rutaZoomLocked)_rutaSetZoom(_rutaZoom*1.25);}
function _rutaZoomOut(){if(!_rutaZoomLocked)_rutaSetZoom(_rutaZoom/1.25);}
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
  if(_rutaZoomLocked)return;
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
    const pts=(_rutaVistaIso?t.puntosIso:t.puntos)||[];if(pts.length<2)return;
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
  if(_rutaVistaIso){tr.puntosIso=[..._rutaPuntos];}else{tr.puntos=[..._rutaPuntos];}
  syncSheet('saveTramo',tr);
  const vista=_rutaVistaIso?'Isométrico':'Plan';
  toast(`✓ Ruta "${tr.codigo}" [${vista}] guardada (${_rutaPuntos.length} puntos)`);
  _rutaCancelarDraw(false);
  // Limpiar temporales y re-renderizar SVG sin reload completo
  const svg=document.getElementById('rutaSvg');
  if(svg){svg.querySelectorAll('.ruta-temp,.ruta-preview').forEach(el=>el.remove());}
  const prev=svg&&svg.querySelector('#rutaPreview');if(prev)prev.remove();
  _rutaRenderSvg(DB.tramos||[]);
  _rutaUpdateSidebarStats();
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
  const vista=_rutaVistaIso?'Isométrico':'Plan';
  if(!confirm(`¿Borrar el trazado [${vista}] de "${tr.codigo}"?`))return;
  if(_rutaVistaIso){tr.puntosIso=[];}else{tr.puntos=[];}
  syncSheet('saveTramo',tr);
  toast(`Trazado [${vista}] de "${tr.codigo}" borrado`);
  _rutaCancelarDraw();
  _rutaRenderSvg(DB.tramos||[]);
  _rutaUpdateSidebarStats();
}

async function _rutaLimpiarTodas(){
  const campo=_rutaVistaIso?'puntosIso':'puntos';
  const vista=_rutaVistaIso?'Isométrico':'Plan';
  const conRuta=(DB.tramos||[]).filter(t=>t[campo]&&t[campo].length>0);
  if(!conRuta.length){toast(`No hay trazados [${vista}] para limpiar`,true);return;}
  if(!confirm(`¿Limpiar los trazados [${vista}] de TODOS los tramos (${conRuta.length})?\n\nLos tramos en sí NO se eliminan.\nLos trazados de la otra vista NO se tocan.`))return;
  for(const tr of conRuta){
    tr[campo]=[];
    syncSheet('saveTramo',tr);
  }
  _rutaCancelarDraw();
  _rutaRenderSvg(DB.tramos||[]);
  _rutaUpdateSidebarStats();
  toast(`✓ ${conRuta.length} trazado${conRuta.length!==1?'s':''} [${vista}] limpiados. Selecciona un tramo y presiona ✏️ Dibujar.`);
}

function _rutaToggleVista(){
  _rutaVistaIso=!_rutaVistaIso;
  _rutaCancelarDraw();
  // Cambiar imagen de fondo
  const img=document.getElementById('rutaImg');
  if(img){img.src=_rutaVistaIso?_pizImgUrlIso():_pizImgUrl();}
  // Actualizar botón
  const btn=document.getElementById('rutaBtnVista');
  if(btn){
    btn.textContent=_rutaVistaIso?'🗺️ Vista Plan':'🏔️ Vista Isométrico';
    btn.style.background=_rutaVistaIso?'rgba(249,115,22,.25)':'rgba(249,115,22,.07)';
    btn.style.borderColor=_rutaVistaIso?'#f97316':'#f9731640';
  }
  // Re-renderizar SVG con los puntos del modo activo
  _rutaRenderSvg(DB.tramos||[]);
  _rutaUpdateSidebarStats();
  // Reajustar vista a la nueva imagen
  setTimeout(()=>{_rutaFitView();},150);
}

function _rutaUpdateSidebarStats(){
  (DB.tramos||[]).forEach((t,i)=>{
    const el=document.getElementById(`ruta-stat-${t.id}`);
    if(!el)return;
    const col=_rutaColors[i%_rutaColors.length];
    const ptsPlan=(t.puntos||[]).length;
    const ptsIso=(t.puntosIso||[]).length;
    el.innerHTML=`<span style="color:${ptsPlan?col:'var(--muted2)'}">Plan: ${ptsPlan}pts</span><span style="color:var(--muted2)"> · </span><span style="color:${ptsIso?'#f97316':'var(--muted2)'}">Iso: ${ptsIso}pts</span>`;
  });
}

function _rutaCopyToggle(e){
  e.stopPropagation();
  const drop=document.getElementById('rutaCopyDrop');if(!drop)return;
  const show=drop.style.display!=='block';
  drop.style.display=show?'block':'none';
  if(show){const close=()=>{drop.style.display='none';document.removeEventListener('click',close);};setTimeout(()=>document.addEventListener('click',close),0);}
}

function _rutaCopiarDesde(id){
  const from=(DB.tramos||[]).find(t=>t.id===id);
  if(!from||!from.puntos||!from.puntos.length){toast('El tramo origen no tiene ruta dibujada',true);return;}
  if(!_rutaSelId){toast('Selecciona primero el tramo destino en el panel lateral',true);return;}
  // Activar modo dibujo si no está activo
  if(!_rutaDibujando){
    _rutaDibujando=true;
    const btn=document.getElementById('rutaBtnDraw');
    const cur=document.getElementById('rutaCursor');
    const wrap=document.getElementById('rutaMapWrap');
    if(btn){btn.textContent='✅ Guardar';btn.style.background='rgba(245,158,11,.15)';btn.style.color='#f59e0b';btn.style.borderColor='#f59e0b40';}
    if(cur)cur.style.display='block';
    if(wrap)wrap.style.cursor='crosshair';
    const hint=document.getElementById('rutaHint');
    if(hint)hint.textContent='Clic=punto · Doble clic=guardar · Clic derecho=cancelar';
  }
  _rutaPuntos=[...from.puntos];
  _rutaRedibujarTemp();
  const drop=document.getElementById('rutaCopyDrop');if(drop)drop.style.display='none';
  toast(`✓ ${from.puntos.length} puntos copiados de ${from.codigo} · Usa ⌫ Deshacer para retroceder hasta la bifurcación y sigue dibujando`);
}

function _rutaUndoUltimo(){
  if(!_rutaPuntos.length){toast('Sin puntos para deshacer',true);return;}
  _rutaPuntos.pop();
  _rutaRedibujarTemp();
  if(!_rutaPuntos.length){const hint=document.getElementById('rutaHint');if(hint)hint.textContent='Clic=punto · Doble clic=guardar · Clic derecho=cancelar';}
}

// ══ ISO - TOGGLE FRENTE VISIBILIDAD ══════════════════════════════════════════
function _isoToggleFrente(id){
  if(_isoHiddenFrentes.has(id))_isoHiddenFrentes.delete(id);
  else _isoHiddenFrentes.add(id);
  _isoAreaRenderSvg(DB.frentesTrabajo||[]);
  // Actualiza solo el item de lista (sin re-render completo)
  const el=document.getElementById('iso-area-item-'+id);
  const f=(DB.frentesTrabajo||[]).find(x=>x.id===id);
  const i=(DB.frentesTrabajo||[]).sort((a,b)=>(a.nombre||a.nom||'').localeCompare(b.nombre||b.nom||'')).findIndex(x=>x.id===id);
  if(el&&f){
    const col=_frenteColors[i>=0?i%_frenteColors.length:0];
    const hidden=_isoHiddenFrentes.has(id);
    el.style.opacity=hidden?'.55':'1';
    el.style.border=`2px solid ${col}${hidden?'18':'30'}`;
    el.style.background=`${col}${hidden?'06':'10'}`;
    const btn=el.querySelector('button');
    if(btn){btn.textContent=hidden?'🙈':'👁';btn.style.color=hidden?'#6b7280':'#06b6d4';}
  }
}

// ══ ISO - MODO PLAN DIARIO ════════════════════════════════════════════════════
function _isoSetFecha(fecha){
  if(!fecha){_isoSalirPlan();return;}
  const anterior=_isoFecha;
  _isoFecha=fecha;
  // Si hay items en la fecha anterior, preguntar si copiar al nuevo día
  if(anterior&&anterior!==fecha){
    const itemsAnterior=(DB.pizarraItems||[]).filter(x=>x.tab==='iso'&&x.tipo!=='frente'&&x.fecha===anterior);
    if(itemsAnterior.length>0){
      const op=confirm(`Hay ${itemsAnterior.length} equipos en el plan del ${anterior}.\n¿Copiarlos al ${fecha}?\n\nAceptar = Copiar · Cancelar = Empezar vacío`);
      if(op)_isoCopiarFecha(anterior,fecha);
    }
  }
  _pizRenderTab();
}

function _isoSalirPlan(){
  _isoFecha=null;
  _pizRenderTab();
}

function _isoMantenerPlan(){
  if(!_isoFecha){toast('Selecciona una fecha primero',true);return;}
  // Calcula el día anterior
  const d=new Date(_isoFecha+'T12:00:00');
  d.setDate(d.getDate()-1);
  const prev=d.toISOString().slice(0,10);
  const prevItems=(DB.pizarraItems||[]).filter(x=>x.tab==='iso'&&x.tipo!=='frente'&&x.fecha===prev);
  if(!prevItems.length){toast('No hay plan registrado para el día anterior ('+prev+')',true);return;}
  // Verifica si ya hay items en la fecha actual
  const existentes=(DB.pizarraItems||[]).filter(x=>x.tab==='iso'&&x.tipo!=='frente'&&x.fecha===_isoFecha);
  if(existentes.length>0){
    if(!confirm(`Ya hay ${existentes.length} equipos para el ${_isoFecha}. ¿Reemplazar con el plan del ${prev}?`))return;
    existentes.forEach(i=>supaDelete('pizarraItems',i.id));
    DB.pizarraItems=(DB.pizarraItems||[]).filter(i=>!existentes.includes(i));
  }
  _isoCopiarFecha(prev,_isoFecha);
  toast(`✓ Plan del ${prev} copiado a ${_isoFecha} (${prevItems.length} equipos)`);
  _pizRenderTab();
}

function _isoCopiarFecha(origen,destino){
  const src=(DB.pizarraItems||[]).filter(x=>x.tab==='iso'&&x.tipo!=='frente'&&x.fecha===origen);
  src.forEach(item=>{
    const copia={...item,id:nid('piz'),fecha:destino};
    DB.pizarraItems.push(copia);
    syncSheet('savePizItem',copia);
  });
}

function _isoLimpiarDia(){
  if(!_isoFecha){toast('Activa el modo plan primero',true);return;}
  const items=(DB.pizarraItems||[]).filter(x=>x.tab==='iso'&&x.tipo!=='frente'&&x.fecha===_isoFecha);
  if(!items.length){toast('No hay equipos planificados para este día',true);return;}
  if(!confirm(`¿Eliminar los ${items.length} equipos del plan del ${_isoFecha}?`))return;
  items.forEach(i=>supaDelete('pizarraItems',i.id));
  DB.pizarraItems=(DB.pizarraItems||[]).filter(i=>!items.includes(i));
  toast(`✓ Plan del ${_isoFecha} limpiado`);
  _pizRenderTab();
}

// ══ ISO - DIBUJOS DE PLANIFICACIÓN ══════════════════════════════════════════
function _isoPlanDibujarToggle(){
  if(_isoPlanDibujando){
    // Mostrar form si hay puntos suficientes
    if(_isoPlanPuntos.length>=3){
      const form=document.getElementById('isoPlanDibujoForm');
      if(form)form.style.display='block';
    }else{
      toast('Dibuja al menos 3 vértices',true);
    }
  }else{
    _isoPlanDibujando=true;
    _isoPlanPuntos=[];
    const canvas=document.getElementById('rutaCanvas');
    if(canvas)canvas.style.cursor='crosshair';
    _pizRenderTab();
  }
}

function _isoPlanDibujarCancelar(){
  _isoPlanDibujando=false;
  _isoPlanPuntos=[];
  const canvas=document.getElementById('rutaCanvas');
  if(canvas)canvas.style.cursor='default';
  const form=document.getElementById('isoPlanDibujoForm');
  if(form)form.style.display='none';
  _pizRenderTab();
}

async function _isoPlanDibujoSave(){
  const label=(document.getElementById('isoPlanDibLabel')?.value||'').trim();
  const tipo=document.getElementById('isoPlanDibTipo')?.value||'Acceso temporal';
  const wbsCodigo=(document.getElementById('isoPlanDibWbs')?.value||'').trim();
  const color=document.getElementById('isoPlanDibColor')?.value||'#ef4444';
  if(!_isoPlanPuntos.length||_isoPlanPuntos.length<3){toast('Dibuja al menos 3 vértices',true);return;}
  const rec={id:nid('pld'),puntos:[..._isoPlanPuntos],label,tipo,wbsCodigo:wbsCodigo||null,color,activo:true,fecha:today()};
  DB.planDibujos.push(rec);
  syncSheet('savePlanDibujo',rec);
  toast(`✓ "${label||tipo}" guardado (${rec.puntos.length} vértices)${wbsCodigo?' · WBS: '+wbsCodigo:''}`);
  _isoPlanDibujando=false;
  _isoPlanPuntos=[];
  const canvas=document.getElementById('rutaCanvas');
  if(canvas)canvas.style.cursor='default';
  _pizRenderTab();
  setTimeout(()=>_isoAreaRenderSvg(DB.frentesTrabajo||[]),100);
}

function _isoPlanDibujoDelete(id){
  if(!confirm('¿Eliminar este dibujo del mapa?'))return;
  const d=(DB.planDibujos||[]).find(x=>x.id===id);
  if(!d)return;
  d.activo=false;
  syncSheet('savePlanDibujo',d);
  DB.planDibujos=(DB.planDibujos||[]).filter(x=>x.id!==id);
  toast('Dibujo eliminado');
  _pizRenderTab();
  setTimeout(()=>_isoAreaRenderSvg(DB.frentesTrabajo||[]),100);
}
