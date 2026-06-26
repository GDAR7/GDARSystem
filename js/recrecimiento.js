// ══ MÓDULO RECRECIMIENTO R3 ══════════════════════════════════════════════════
let _recDique='DA', _recVista='seccion';

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

  // ── KPIs ──
  const total=capas.length;
  const comp=capas.filter(c=>+c.pctAvance>=100).length;
  const enCurso=capas.filter(c=>+c.pctAvance>0&&+c.pctAvance<100).length;
  const pend=total-comp-enCurso;
  const pctGlobal=total?Math.round(capas.reduce((s,c)=>s+(+c.pctAvance||0),0)/total):0;

  pg.innerHTML=`
  <div style="padding:.8rem 1rem;height:calc(100vh - 52px);display:flex;flex-direction:column;gap:.6rem;overflow:hidden">

    <!-- CABECERA -->
    <div style="display:flex;align-items:center;gap:.8rem;flex-wrap:wrap">
      <div>
        <div style="font-size:1.1rem;font-weight:800;color:#10b981">🏔️ Recrecimiento R3</div>
        <div style="font-size:.68rem;color:var(--muted2)">Control visual de avance por capa · ${new Date().toLocaleDateString('es-PE',{weekday:'short',day:'2-digit',month:'short',year:'numeric'}).toUpperCase()}</div>
      </div>

      <!-- Tabs dique -->
      <div style="display:flex;gap:.3rem;margin-left:auto">
        ${_REC_DIQUES.map(d=>`<button onclick="_recSetDique('${d.key}')"
          style="padding:.3rem .9rem;border-radius:8px;border:1px solid ${_recDique===d.key?d.color:'var(--border)'};background:${_recDique===d.key?d.color+'22':'transparent'};color:${_recDique===d.key?d.color:'var(--muted2)'};font-size:.72rem;font-weight:${_recDique===d.key?'700':'500'};cursor:pointer">${d.label}</button>`).join('')}
      </div>

      <!-- Toggle vista -->
      <div style="display:flex;border:1px solid var(--border);border-radius:8px;overflow:hidden">
        <button onclick="_recSetVista('seccion')" style="padding:.3rem .8rem;font-size:.7rem;border:none;background:${_recVista==='seccion'?dq.color+'33':'transparent'};color:${_recVista==='seccion'?dq.color:'var(--muted2)'};cursor:pointer;font-weight:${_recVista==='seccion'?'700':'400'}">📐 Sección</button>
        <button onclick="_recSetVista('planta')" style="padding:.3rem .8rem;font-size:.7rem;border:none;border-left:1px solid var(--border);background:${_recVista==='planta'?dq.color+'33':'transparent'};color:${_recVista==='planta'?dq.color:'var(--muted2)'};cursor:pointer;font-weight:${_recVista==='planta'?'700':'400'}">🗺️ Planta</button>
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
      <!-- Barra progreso global -->
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
    <div style="flex:1;overflow:hidden;display:grid;grid-template-columns:260px 1fr;gap:.6rem;min-height:0">

      <!-- PANEL IZQUIERDO: lista de capas -->
      <div style="display:flex;flex-direction:column;gap:.3rem;border:1px solid var(--border);border-radius:8px;padding:.5rem;background:var(--panel2);overflow:hidden">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.2rem">
          <span style="font-size:.65rem;font-weight:700;color:${dq.color};text-transform:uppercase;letter-spacing:.08em">Capas · ${dq.label}</span>
          <button onclick="_recAddCapa('${_recDique}')" style="font-size:.6rem;padding:.15rem .45rem;border-radius:5px;border:1px solid ${dq.color}50;background:${dq.color}15;color:${dq.color};cursor:pointer">＋ Agregar</button>
        </div>
        <div style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:.2rem" id="recCapaList">
          ${capas.length ? capas.map(c=>_recCapaRow(c,dq)).join('') :
            `<div style="text-align:center;padding:1.5rem;color:var(--muted2);font-size:.68rem">
              Sin capas registradas<br>
              <button onclick="_recAddCapa('${_recDique}')" style="margin-top:.5rem;padding:.3rem .8rem;border-radius:6px;border:1px solid ${dq.color}50;background:${dq.color}15;color:${dq.color};cursor:pointer;font-size:.65rem">＋ Agregar primera capa</button>
            </div>`}
        </div>
      </div>

      <!-- PANEL DERECHO: imagen -->
      <div style="border:1px solid var(--border);border-radius:8px;overflow:hidden;background:#0a0a0f;position:relative;display:flex;flex-direction:column" id="recImgWrap">
        <!-- Imagen + overlay SVG -->
        <div style="flex:1;position:relative;overflow:hidden">
          <img id="recSecImg" src="${_recImgBase()}${_recDique.toLowerCase()}_${_recVista}.jpg"
            onerror="this.src='${_recImgBase()}${_recDique.toLowerCase()}_${_recVista}.png';this.onerror=null"
            style="width:100%;height:100%;object-fit:contain;display:block"
            alt="${dq.label} – ${_recVista==='seccion'?'Sección':'Planta'}"
            onload="_recDrawOverlay()">
          ${_recVista==='seccion'?`<svg id="recSvgOverlay" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none"></svg>`:''}
        </div>
        <!-- Barra inferior: leyenda + calibración -->
        <div style="display:flex;align-items:center;gap:.6rem;padding:.3rem .6rem;background:rgba(0,0,0,.4);border-top:1px solid var(--border);flex-wrap:wrap">
          <div style="display:flex;align-items:center;gap:.35rem;font-size:.58rem">
            <span style="display:inline-block;width:12px;height:8px;background:#10b981;border-radius:2px;opacity:.75"></span>Completado
            <span style="display:inline-block;width:12px;height:8px;background:#f59e0b;border-radius:2px;opacity:.75;margin-left:.3rem"></span>En progreso
            <span style="display:inline-block;width:12px;height:8px;background:#6b7280;border-radius:2px;opacity:.4;margin-left:.3rem"></span>Pendiente
          </div>
          ${_recVista==='seccion'?`
          <div style="display:flex;align-items:center;gap:.3rem;margin-left:auto;font-size:.6rem;color:var(--muted2)">
            <span>Cota img:</span>
            <input id="recCotaMin" type="number" step="0.25" placeholder="Min"
              value="${_recGetCotaMin(capas)}"
              style="width:62px;background:var(--panel);border:1px solid var(--border);border-radius:4px;padding:.15rem .3rem;color:var(--text);font-size:.6rem"
              oninput="_recDrawOverlay()">
            <span>→</span>
            <input id="recCotaMax" type="number" step="0.25" placeholder="Max"
              value="${_recGetCotaMax(capas)}"
              style="width:62px;background:var(--panel);border:1px solid var(--border);border-radius:4px;padding:.15rem .3rem;color:var(--text);font-size:.6rem"
              oninput="_recDrawOverlay()">
            <button onclick="_recDrawOverlay()" style="padding:.15rem .4rem;border-radius:4px;border:1px solid ${dq.color}40;background:${dq.color}15;color:${dq.color};cursor:pointer;font-size:.6rem">↺</button>
          </div>`:''}
        </div>
      </div>
    </div>
  </div>

  <!-- MODAL agregar/editar capa -->
  <div id="mRecCapa" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:999;display:none;align-items:center;justify-content:center">
    <div style="background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:1.2rem;width:380px;max-width:95vw">
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
    </div>
  </div>`;
}

function _recCapaRow(c,dq){
  const pct=+c.pctAvance||0;
  const col=pct>=100?'#10b981':pct>0?'#f59e0b':'#6b7280';
  const est=pct>=100?'✅':pct>0?'🔄':'⏳';
  const vol=c.volM3?`${(+c.volM3).toLocaleString('es-PE',{maximumFractionDigits:0})} m³`:'';
  const volColocado=c.volM3&&pct>0?`${Math.round(+c.volM3*pct/100).toLocaleString('es-PE')}/${Math.round(+c.volM3).toLocaleString('es-PE')} m³`:'';
  return`<div style="padding:.3rem .45rem;background:var(--panel);border:1px solid ${col}30;border-radius:6px;cursor:pointer" onclick="_recEditCapa(${c.id})">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.2rem">
      <div style="display:flex;align-items:center;gap:.3rem">
        <span style="font-size:.62rem">${est}</span>
        <span style="font-size:.7rem;font-weight:700;color:${col}">${c.nombre||'—'}</span>
        <span style="font-size:.55rem;color:var(--muted2)">${c.cota?c.cota+' m':''}</span>
      </div>
      <span style="font-size:.65rem;font-weight:700;color:${col}">${pct}%</span>
    </div>
    <div style="height:4px;background:rgba(255,255,255,.07);border-radius:2px;overflow:hidden;margin-bottom:.15rem">
      <div style="height:100%;width:${pct}%;background:${col};border-radius:2px;transition:width .3s"></div>
    </div>
    <div style="display:flex;justify-content:space-between">
      <span style="font-size:.55rem;color:var(--muted2)">${volColocado||vol}</span>
      <span style="font-size:.55rem;color:var(--muted2)">${c.areaM2?(+c.areaM2).toLocaleString('es-PE',{maximumFractionDigits:0})+' m²':''}</span>
    </div>
  </div>`;
}

function _recSetDique(k){_recDique=k;rRecrecimiento();}
function _recSetVista(v){_recVista=v;rRecrecimiento();}

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
  document.getElementById('mRecCapa').style.display='flex';
}

function _recEditCapa(id){
  const c=(DB.capas||[]).find(x=>x.id==id);
  if(!c)return;
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
  if(idx>=0)DB.capas[idx]=camelRec;else(DB.capas=DB.capas||[]).push(camelRec);

  document.getElementById('mRecCapa').style.display='none';
  rRecrecimiento();
}

async function _recDelCapa(){
  const id=+document.getElementById('rcId').value;
  if(!id||!confirm('¿Eliminar esta capa?'))return;
  const{error}=await supa.from('capas').delete().eq('id',id);
  if(error){alert('Error: '+error.message);return;}
  DB.capas=(DB.capas||[]).filter(x=>x.id!==id);
  document.getElementById('mRecCapa').style.display='none';
  rRecrecimiento();
}

// ── SVG OVERLAY ──────────────────────────────────────────────────────────────
function _recGetCotaMin(capas){
  if(!capas||!capas.length)return 4386;
  return Math.min(...capas.map(c=>+c.cota||0))-0.75;
}
function _recGetCotaMax(capas){
  if(!capas||!capas.length)return 4416;
  return Math.max(...capas.map(c=>+c.cota||0));
}

function _recDrawOverlay(){
  const svg=document.getElementById('recSvgOverlay');
  const img=document.getElementById('recSecImg');
  if(!svg||!img)return;

  const cotaMin=+document.getElementById('recCotaMin')?.value||_recGetCotaMin((DB.capas||[]).filter(c=>c.dique===_recDique));
  const cotaMax=+document.getElementById('recCotaMax')?.value||_recGetCotaMax((DB.capas||[]).filter(c=>c.dique===_recDique));
  const range=cotaMax-cotaMin;
  if(range<=0)return;

  const capas=(DB.capas||[]).filter(c=>c.dique===_recDique).sort((a,b)=>+a.cota-+b.cota);

  const wrap=svg.parentElement;
  const W=wrap.clientWidth||800;
  const H=wrap.clientHeight||500;

  // Área real de la imagen dentro del contenedor (object-fit:contain)
  const natW=img.naturalWidth||1;const natH=img.naturalHeight||1;
  const imgRatio=natW/natH;const wrapRatio=W/H;
  let imgW,imgH,imgX,imgY;
  if(imgRatio>wrapRatio){imgW=W;imgH=W/imgRatio;imgX=0;imgY=(H-imgH)/2;}
  else{imgH=H;imgW=H*imgRatio;imgX=(W-imgW)/2;imgY=0;}

  svg.innerHTML=capas.map(c=>{
    const pct=+c.pctAvance||0;
    if(pct<=0)return'';
    const col=pct>=100?'#10b981':'#f59e0b';

    // Y: cota alta = arriba en imagen
    const yTopPct=(cotaMax-(+c.cota))/(range);
    const yBotPct=(cotaMax-((+c.cota)-0.75))/(range);
    const yTop=imgY+yTopPct*imgH;
    const yBot=imgY+yBotPct*imgH;
    const bandH=Math.max(yBot-yTop,1.5);
    // Ancho proporcional al % completado
    const bandW=imgW*(pct/100);

    const label=pct>=100?'✓ '+c.nombre:c.nombre+' '+pct+'%';
    const fs=Math.min(Math.max(bandH*0.65,7),11);
    return`<rect x="${imgX}" y="${yTop.toFixed(1)}" width="${bandW.toFixed(1)}" height="${bandH.toFixed(1)}" fill="${col}" rx="1">
      <title>${c.nombre} · ${c.cota}m · ${pct}%</title></rect>
    <text x="${(imgX+3).toFixed(1)}" y="${(yTop+bandH*0.75).toFixed(1)}" font-size="${fs}" fill="#000" font-weight="700" style="pointer-events:none">${label}</text>`;
  }).join('');
}

// Actualizar % desde la lista directamente (doble clic en barra)
async function _recQuickPct(id,val){
  val=Math.min(100,Math.max(0,+val||0));
  const{error}=await supa.from('capas').update({pct_avance:val}).eq('id',id);
  if(!error){const c=(DB.capas||[]).find(x=>x.id==id);if(c)c.pctAvance=val;}
  rRecrecimiento();
}
