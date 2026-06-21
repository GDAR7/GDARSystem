// ══ LPS – LAST PLANNER SYSTEM ══
// Proyecto: R3 Cota 4416 – Recrecimiento Dique Relavera R3 · Buenaventura · UM Uchuchacua

// LPS_SECTORES se carga dinámicamente desde DB.lpsSectores; esto es solo fallback inicial
const _LPS_SECT_FALLBACK=['Dique Principal','Mesa de Plata','Dique Intermedio','Dique Auxiliar'];
function _lpsSects(){const s=DB.lpsSectores||[];return s.length?s.map(x=>x.nombre):_LPS_SECT_FALLBACK;}
const LPS_CNC=['Prerequisitos','Materiales','Equipos','Subcontratistas','Clima','Administración'];
const LPS_COLOR='#10b981';
function _wbsLvl(cod){return(cod.split('-')[0].match(/\./g)||[]).length;}
function _wbsCodeColor(w){
  const lv=_wbsLvl(w.codigo||'');
  const hasCont=!!(w.unidad&&+w.cantTotal>0);
  if(lv>=2&&hasCont) return '#e2e8f0';
  if(lv===1) return '#10b981';
  if(lv===2) return '#f87171';
  if(lv>=3) return '#93c5fd';
  return LPS_COLOR;
}
function _wbsTitleBg(w){
  const lv=_wbsLvl(w.codigo||'');
  if(lv===2) return 'rgba(248,113,113,.08)';
  if(lv>=3) return 'rgba(147,197,253,.08)';
  return 'rgba(16,185,129,.09)';
}
let _lpsWbsQTimer=null,_lpsGanttZoom='month',_ganttLinkMode=false,_ganttLinkSrc=null;
let _lpsWbsNivel=1,_lpsWbsAfterId=null;
function _lpsWbsQInput(){
  clearTimeout(_lpsWbsQTimer);
  _lpsWbsQTimer=setTimeout(()=>_lpsRenderTab(),220);
}

let _lpsTab=1;
let _lpsSemana=null;
let _lpsProyInicio='';
let _lpsProyFin='';
let _lpsSectorFilt='';
let _lpsEditWbsId=null;

// ── helpers de fecha ──────────────────────────────────────────────────────────
function _lpsMonday(d=new Date()){
  const dx=new Date(d);
  const day=dx.getDay();
  dx.setDate(dx.getDate()-day+(day===0?-6:1));
  return dx.toISOString().split('T')[0];
}
function _lpsAddDays(iso,n){
  const d=new Date(iso+'T12:00:00');d.setDate(d.getDate()+n);return d.toISOString().split('T')[0];
}
function _lpsFmt(iso){const[y,m,d]=iso.split('-');return`${d}/${m}`;}
function _lpsDow(iso){return['DOM','LUN','MAR','MIÉ','JUE','VIE','SÁB'][new Date(iso+'T12:00:00').getDay()];}
function _lpsDaysRange(isoStart,n){return Array.from({length:n},(_,i)=>_lpsAddDays(isoStart,i));}

// ── entrada principal ─────────────────────────────────────────────────────────
function rLps(){
  if(!_lpsSemana){_lpsSemana=localStorage.getItem('_lpsSemana')||_lpsMonday();}
  // Cargar fechas de proyecto desde Supabase (DB.lpsConfig), fallback a localStorage
  const cfg=(DB.lpsConfig||[])[0];
  _lpsProyInicio=cfg?.proyectoInicio||localStorage.getItem('_lpsProyInicio')||'';
  _lpsProyFin=cfg?.proyectoFin||localStorage.getItem('_lpsProyFin')||'';
  _lpsRenderShell();
  _lpsRenderTab();
}

function _lpsRenderShell(){
  const page=document.getElementById('page-lps');
  if(!page||page.dataset.lpsInit==='1')return;
  page.dataset.lpsInit='1';
  // tabs ya están en HTML, solo sync estado
}

function _lpsTabSwitch(n){
  _lpsTab=n;
  document.querySelectorAll('.lps-tab').forEach((b,i)=>b.classList.toggle('active',i+1===n));
  _lpsRenderTab();
}
function _lpsRenderTab(){
  const c=document.getElementById('lpsBody');if(!c)return;
  if(_lpsTab===1)_lpsRenderWBS(c);
  else if(_lpsTab===2)_lpsRenderCrono(c);
  else if(_lpsTab===3)_lpsRenderLookahead(c);
  else if(_lpsTab===4)_lpsRenderPlan(c);
  else if(_lpsTab===5)_lpsRenderRestr(c);
  else _lpsRenderCnc(c);
}

// ══════════════════════════════════════════════════════════════════════════════
// VISTA 1 – BIBLIOTECA WBS
// ══════════════════════════════════════════════════════════════════════════════
function _lpsWbsSorted(){
  const wbs=DB.lpsWbs||[];
  // Normalizar orden si no existe
  const needsNorm=wbs.some(w=>w.orden==null);
  if(needsNorm) wbs.forEach((w,i)=>{if(w.orden==null)w.orden=i*10;});
  return [...wbs].sort((a,b)=>a.orden-b.orden);
}

// ── Auto-código WBS ──────────────────────────────────────────────────────────
function _lpsNextCode(nivel){
  const all=_lpsWbsSorted();
  if(!all.length)return String(1).padStart(2,'0')+'.';
  if(nivel===1){
    const nums=all.map(w=>{const m=w.codigo.match(/^(\d+)\./);return m?+m[1]:0;});
    return String(Math.max(0,...nums)+1).padStart(2,'0')+'.';
  }
  // Busca el último padre de nivel (nivel-1) en la lista
  let parentPrefix='';
  for(let i=all.length-1;i>=0;i--){
    if(_wbsLvl(all[i].codigo)===nivel-1){
      parentPrefix=all[i].codigo.split('-')[0];// e.g. "02." ó "02.01."
      break;
    }
  }
  if(!parentPrefix)return _lpsNextCode(nivel-1)+'01.';
  const re=new RegExp('^'+parentPrefix.replace(/\./g,'\\.')+'(\\d+)\\.');
  const nums=all.map(w=>{const m=w.codigo.match(re);return m?+m[1]:0;});
  return parentPrefix+String(Math.max(0,...nums)+1).padStart(2,'0')+'.';
}
function _lpsNivelChange(delta){
  _lpsWbsNivel=Math.max(1,Math.min(3,_lpsWbsNivel+delta));
  _lpsUpdateNivelUI();
}
function _lpsUpdateNivelUI(skipCode=false){
  const DOTS=['●○○','●●○','●●●'];
  const LABELS=['Nivel 1 – Capítulo','Nivel 2 – Sección','Nivel 3 – Actividad'];
  const dotsEl=document.getElementById('lpsWbsNivelDots');
  const labelEl=document.getElementById('lpsWbsNivelLabel');
  if(dotsEl)dotsEl.textContent=DOTS[_lpsWbsNivel-1];
  if(labelEl)labelEl.textContent=LABELS[_lpsWbsNivel-1];
  if(!skipCode){const cod=document.getElementById('lpsWbsCod');if(cod)cod.value=_lpsNextCode(_lpsWbsNivel);}
}
function _lpsWbsCodKey(e){
  if(e.key==='Tab'&&!e.shiftKey){e.preventDefault();_lpsNivelChange(+1);}
  else if(e.key==='Tab'&&e.shiftKey){e.preventDefault();_lpsNivelChange(-1);}
}

function _lpsWbsMover(id,dir){
  // dir: -1=subir, +1=bajar
  const sorted=_lpsWbsSorted();
  // Normalizar a múltiplos de 10
  sorted.forEach((w,i)=>{w.orden=i*10;});
  const idx=sorted.findIndex(w=>w.id===id);
  if(idx<0)return;
  const swapIdx=idx+dir;
  if(swapIdx<0||swapIdx>=sorted.length)return;
  // Intercambiar orden
  const tmp=sorted[idx].orden;
  sorted[idx].orden=sorted[swapIdx].orden;
  sorted[swapIdx].orden=tmp;
  syncSheet('saveLpsWbs',sorted[idx]);
  syncSheet('saveLpsWbs',sorted[swapIdx]);
  _lpsRenderTab();
}

function _lpsRenderWBS(c){
  const sF=document.getElementById('lpsWbsSector')?.value||'';
  const qF=(document.getElementById('lpsWbsQ')?.value||'').toLowerCase();
  const allSorted=_lpsWbsSorted();
  const rows=allSorted.filter(w=>(!sF||w.sector===sF)&&(!qF||w.codigo.toLowerCase().includes(qF)||(w.desc||'').toLowerCase().includes(qF)));
  const last=rows.length-1;

  const _btnMove=(id,idx)=>`
    <button onclick="_lpsWbsMover(${id},-1)" ${idx===0?'disabled':''} title="Subir"
      style="background:none;border:1px solid ${idx===0?'#1e2740':'#2a3a5a'};border-radius:4px;color:${idx===0?'#2a3a5a':'#6b85a8'};width:22px;height:22px;cursor:${idx===0?'default':'pointer'};font-size:.7rem;line-height:1;padding:0">▲</button>
    <button onclick="_lpsWbsMover(${id},+1)" ${idx===last?'disabled':''} title="Bajar"
      style="background:none;border:1px solid ${idx===last?'#1e2740':'#2a3a5a'};border-radius:4px;color:${idx===last?'#2a3a5a':'#6b85a8'};width:22px;height:22px;cursor:${idx===last?'default':'pointer'};font-size:.7rem;line-height:1;padding:0">▼</button>`;

  const _dateCtrl=`color-scheme:dark;${_lpsCtrl()};padding:.25rem .5rem`;
  c.innerHTML=`
  <div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap;margin-bottom:.8rem;padding:.55rem .9rem;background:rgba(16,185,129,.06);border:1px solid rgba(16,185,129,.18);border-radius:8px">
    <span style="font-size:.72rem;font-weight:700;color:${LPS_COLOR};letter-spacing:.06em">📅 RANGO DEL PROYECTO</span>
    <label style="display:flex;align-items:center;gap:.4rem;font-size:.75rem;color:var(--muted2)">Inicio
      <input type="date" value="${_lpsProyInicio}" onchange="_lpsSetProyFecha('ini',this.value)" style="${_dateCtrl}">
    </label>
    <label style="display:flex;align-items:center;gap:.4rem;font-size:.75rem;color:var(--muted2)">Fin
      <input type="date" value="${_lpsProyFin}" onchange="_lpsSetProyFecha('fin',this.value)" style="${_dateCtrl}">
    </label>
    ${_lpsProyInicio&&_lpsProyFin?`<span style="font-size:.72rem;color:var(--muted2)">
      ${(()=>{const d1=new Date(_lpsProyInicio+'T12:00:00'),d2=new Date(_lpsProyFin+'T12:00:00');const sem=Math.ceil((d2-d1)/604800000);return`${sem} semana(s) · ${Math.round((d2-d1)/86400000)+1} días`;})()}
    </span>`:''}
  </div>
  <div style="display:flex;align-items:center;gap:.6rem;flex-wrap:wrap;margin-bottom:.8rem">
    <select id="lpsWbsSector" style="${_lpsCtrl()}" onchange="_lpsRenderTab()">
      <option value="">— Todos los sectores —</option>
      ${_lpsSects().map(s=>`<option${sF===s?' selected':''}>${s}</option>`).join('')}
    </select>
    <button onclick="_lpsOpenSectores()" title="Gestionar sectores" style="background:none;border:1px solid #2a3a5a;border-radius:6px;color:#6b85a8;padding:.3rem .6rem;font-size:.78rem;cursor:pointer">⚙️ Sectores</button>
    <input id="lpsWbsQ" placeholder="🔍 Buscar..." value="${qF}" oninput="_lpsWbsQInput()" style="${_lpsCtrl()};min-width:180px">
    <button class="btn btn-a" style="--ba:${LPS_COLOR};margin-left:auto" onclick="_lpsOpenWbs(null)">＋ Nueva Actividad</button>
  </div>
  <div class="tbl-wrap"><table>
    <thead><tr><th style="width:52px"></th><th>Código</th><th>Unidad</th><th style="text-align:right">Cant. Total</th><th>Sector</th><th>Recursos</th><th></th></tr></thead>
    <tbody>${rows.length?rows.map((w,idx)=>{
      const movBtns=_btnMove(w.id,idx);
      const recsW=(DB.lpsWbsRecursos||[]).filter(r=>r.wbsId===w.id);
      const recsBadge=recsW.length
        ?`<button onclick="_lpsOpenRecursos(${w.id})" title="Ver/editar recursos" style="background:rgba(129,140,248,.15);color:#818cf8;border:1px solid #818cf840;border-radius:5px;padding:1px 8px;font-size:.68rem;cursor:pointer;white-space:nowrap">📦 ${recsW.length} recurso${recsW.length>1?'s':''}</button>`
        :'';
      const notaIcon=w.desc?`<span title="${w.desc.replace(/"/g,'&quot;')}" style="font-size:.75rem;opacity:.55;cursor:help;margin-left:.35rem">📝</span>`:'';
      if(w.tipo==='TITULO'){
        return`<tr style="background:${_wbsTitleBg(w)}">
          <td style="display:flex;gap:3px;padding:.35rem .4rem">${movBtns}</td>
          <td colspan="2" class="mono" style="color:${_wbsCodeColor(w)};font-family:'Barlow Condensed',sans-serif;font-size:.88rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase">${w.codigo}${notaIcon}</td>
          <td></td>
          <td><span style="background:rgba(16,185,129,.15);color:#10b981;border:1px solid #10b98135;border-radius:4px;padding:1px 8px;font-size:.7rem">${w.sector||'—'}</span></td>
          <td></td>
          <td style="white-space:nowrap"><span style="font-size:.6rem;color:#10b981;opacity:.7;margin-right:.4rem">TÍTULO</span>
              <button class="btn btn-out btn-sm" title="Insertar actividad aquí" onclick="_lpsOpenWbs(null,${w.id})" style="color:#10b981;border-color:#10b98160">＋</button>
              <button class="btn btn-out btn-sm" onclick="_lpsOpenWbs(${w.id})" style="color:#f59e0b;border-color:#f59e0b60;margin-left:.2rem">✏️</button>
              <button class="btn btn-del btn-sm" onclick="_lpsDelWbs(${w.id})" style="margin-left:.3rem">✕</button></td>
        </tr>`;
      }
      return`<tr>
        <td style="display:flex;gap:3px;padding:.35rem .4rem">${movBtns}</td>
        <td class="mono" style="color:${_wbsCodeColor(w)}">${w.codigo}${notaIcon}</td>
        <td class="mono">${w.unidad||'—'}</td>
        <td class="mono" style="text-align:right">${fmtN(+w.cantTotal||0)}</td>
        <td><span style="background:rgba(16,185,129,.15);color:#10b981;border:1px solid #10b98135;border-radius:4px;padding:1px 8px;font-size:.7rem">${w.sector||'—'}</span></td>
        <td style="padding:.2rem .4rem">
          ${recsBadge}
          <button onclick="_lpsOpenRecursos(${w.id})" title="Agregar recursos" style="background:none;border:1px dashed #2a3a5a;border-radius:5px;color:#3d5070;padding:1px 7px;font-size:.68rem;cursor:pointer">＋ Recursos</button>
        </td>
        <td style="white-space:nowrap">
          <button class="btn btn-out btn-sm" title="Insertar actividad aquí" onclick="_lpsOpenWbs(null,${w.id})" style="color:#10b981;border-color:#10b98160">＋</button>
          <button class="btn btn-out btn-sm" onclick="_lpsOpenWbs(${w.id})" style="color:#f59e0b;border-color:#f59e0b60;margin-left:.2rem">✏️</button>
          <button class="btn btn-del btn-sm" onclick="_lpsDelWbs(${w.id})" style="margin-left:.3rem">✕</button></td>
      </tr>`;
    }).join(''):'<tr><td colspan="7" style="text-align:center;color:var(--muted2);padding:1.5rem">Sin actividades registradas</td></tr>'}</tbody>
  </table></div>`;
}

function _lpsCtrl(){return'background:var(--panel2);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:.3rem .65rem;font-size:.8rem';}

// ── GESTIÓN DE SECTORES ───────────────────────────────────────────────────────
function _lpsOpenSectores(){
  _lpsRenderSectoresList();
  openM('mLpsSectores');
}
function _lpsRenderSectoresList(){
  const el=document.getElementById('lpsSecList');if(!el)return;
  const sects=DB.lpsSectores||[];
  if(!sects.length){el.innerHTML=`<p style="font-size:.78rem;color:var(--muted2);text-align:center">Sin sectores definidos. Agrega el primero abajo.</p>`;return;}
  el.innerHTML=`<div style="display:flex;flex-wrap:wrap;gap:.4rem">`+sects.map(s=>`
    <div style="display:flex;align-items:center;gap:.35rem;background:rgba(16,185,129,.1);border:1px solid #10b98135;border-radius:6px;padding:.25rem .6rem">
      <span style="font-size:.82rem;color:var(--text)">${s.nombre}</span>
      <button onclick="_lpsDelSector(${s.id})" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:.75rem;padding:0">✕</button>
    </div>`).join('')+`</div>`;
}
function _lpsAddSector(){
  const inp=document.getElementById('lpsSecNuevo');
  const nombre=(inp?.value||'').trim();
  if(!nombre){toast('Escribe el nombre del sector',true);return;}
  if((DB.lpsSectores||[]).find(s=>s.nombre.toLowerCase()===nombre.toLowerCase())){toast('Ese sector ya existe',true);return;}
  const rec={id:nid('lpsS'),nombre};
  if(!DB.lpsSectores)DB.lpsSectores=[];
  DB.lpsSectores.push(rec);
  syncSheet('saveLpsSector',rec);
  if(inp)inp.value='';
  _lpsRenderSectoresList();
  _lpsRenderTab();
  toast('✓ Sector agregado');
}
function _lpsDelSector(id){
  if(!confirm('¿Eliminar este sector?'))return;
  DB.lpsSectores=(DB.lpsSectores||[]).filter(s=>s.id!==id);
  supaDelete('lpsSectores',id);
  _lpsRenderSectoresList();
  _lpsRenderTab();
  toast('Sector eliminado');
}

// ── RECURSOS POR ACTIVIDAD WBS ────────────────────────────────────────────────
let _lpsRecursosWbsId=null;
let _lpsRTabActivo='Equipo';
const _TIPO_REC_COLOR={Equipo:'#f59e0b',Personal:'#10b981',Material:'#818cf8'};
const _TIPO_REC_IC={Equipo:'🚧',Personal:'👷',Material:'🧱'};

function _lpsOpenRecursos(wbsId){
  _lpsRecursosWbsId=wbsId;
  const w=DB.lpsWbs.find(x=>x.id===wbsId);
  document.getElementById('lpsRecursosMtl').textContent=`📦 Recursos — ${w?.codigo||''}`;
  _lpsRTab(_lpsRTabActivo);
  _lpsRenderRecursosList();
  openM('mLpsRecursos');
}

function _lpsRTab(tipo){
  _lpsRTabActivo=tipo;
  const tabs=document.getElementById('lpsRTabs');
  const form=document.getElementById('lpsRForm');
  if(!tabs||!form)return;
  const tipos=['Equipo','Personal','Material'];
  const C=_TIPO_REC_COLOR; const IC=_TIPO_REC_IC;
  tabs.innerHTML=tipos.map(t=>`
    <button onclick="_lpsRTab('${t}')" style="background:${t===tipo?`rgba(${t==='Equipo'?'245,158,11':t==='Personal'?'16,185,129':'129,140,248'},.18)`:'var(--panel2)'};color:${t===tipo?C[t]:'var(--muted2)'};border:1px solid ${t===tipo?C[t]+'60':'var(--border)'};border-radius:7px;padding:.3rem .9rem;font-size:.78rem;font-weight:${t===tipo?700:400};cursor:pointer">
      ${IC[t]} ${t}
    </button>`).join('');

  const ctrl=`background:var(--panel2);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:.3rem .5rem;font-size:.8rem`;

  if(tipo==='Equipo'){
    // Agrupar equipos por tipo (Línea Amarilla / Línea Blanca) y sub
    const eqs=DB.equipos||[];
    const grupos={};
    eqs.forEach(e=>{const g=e.tipo||'Otros';if(!grupos[g])grupos[g]=[];grupos[g].push(e);});
    const opts=Object.entries(grupos).map(([g,items])=>
      `<optgroup label="${g}">${items.map(e=>`<option value="${e.codigo} – ${e.nombre}">[${e.codigo}] ${e.nombre}${e.sub?' ('+e.sub+')':''}</option>`).join('')}</optgroup>`
    ).join('');
    form.innerHTML=`
      <div style="display:flex;flex-wrap:wrap;gap:.5rem;align-items:flex-end">
        <div style="display:flex;flex-direction:column;gap:.2rem;flex:2;min-width:200px">
          <label style="font-size:.68rem;color:#f59e0b">Equipo del sistema</label>
          <select id="lpsRNombre" style="${ctrl};flex:1">${opts||'<option value="">Sin equipos registrados</option>'}</select>
        </div>
        <div style="display:flex;flex-direction:column;gap:.2rem;min-width:70px">
          <label style="font-size:.68rem;color:var(--muted2)">Cantidad</label>
          <input id="lpsRCant" type="number" min="1" step="1" value="1" style="${ctrl};width:70px;text-align:center">
        </div>
        <div style="display:flex;flex-direction:column;gap:.2rem;min-width:80px">
          <label style="font-size:.68rem;color:var(--muted2)">Unidad</label>
          <select id="lpsRUnd" style="${ctrl}"><option>turno</option><option>hrs</option><option>día</option><option>und</option></select>
        </div>
        <button class="btn btn-a" style="--ba:#f59e0b" onclick="_lpsAddRecurso()">＋ Agregar</button>
      </div>`;
  }else if(tipo==='Personal'){
    const pers=(DB.personal||[]).filter(p=>p.tipo!=='Staff');
    const cargos={};
    pers.forEach(p=>{const c=p.cargo||'Sin cargo';if(!cargos[c])cargos[c]=[];cargos[c].push(p);});
    const opts=Object.entries(cargos).map(([c,items])=>
      `<optgroup label="${c}">${items.map(p=>{
        const label=`${p.ape||''}, ${p.nom||''} · DNI ${p.dni||''}`;
        const val=`${p.ape||''}, ${p.nom||''} (DNI:${p.dni||''}) – ${p.cargo||''}`;
        return`<option value="${val}">${label}</option>`;
      }).join('')}</optgroup>`
    ).join('');
    form.innerHTML=`
      <div style="display:flex;flex-wrap:wrap;gap:.5rem;align-items:flex-end">
        <div style="display:flex;flex-direction:column;gap:.2rem;flex:2;min-width:220px">
          <label style="font-size:.68rem;color:#10b981">Personal del sistema</label>
          <select id="lpsRNombre" style="${ctrl}">${opts||'<option value="">Sin personal registrado</option>'}</select>
        </div>
        <div style="display:flex;flex-direction:column;gap:.2rem;min-width:70px">
          <label style="font-size:.68rem;color:var(--muted2)">Cantidad</label>
          <input id="lpsRCant" type="number" min="1" step="1" value="1" style="${ctrl};width:70px;text-align:center">
        </div>
        <input type="hidden" id="lpsRUnd" value="pers">
        <button class="btn btn-a" style="--ba:#10b981" onclick="_lpsAddRecurso()">＋ Agregar</button>
      </div>`;
  }else{
    // Material — datalist desde catálogo + texto libre
    const mats=DB.catalogoItems||[];
    const dataOpts=mats.map(m=>`<option value="${m.descripcion||m.cod}">${m.cod} – ${m.descripcion||''} (${m.und||''})</option>`).join('');
    form.innerHTML=`
      <datalist id="lpsRMatList">${dataOpts}</datalist>
      <div style="display:flex;flex-wrap:wrap;gap:.5rem;align-items:flex-end">
        <div style="display:flex;flex-direction:column;gap:.2rem;flex:2;min-width:220px">
          <label style="font-size:.68rem;color:#818cf8">Material (catálogo o descripción libre)</label>
          <input id="lpsRNombre" list="lpsRMatList" placeholder="Buscar en catálogo o escribir..." style="${ctrl}">
        </div>
        <div style="display:flex;flex-direction:column;gap:.2rem;min-width:70px">
          <label style="font-size:.68rem;color:var(--muted2)">Cantidad</label>
          <input id="lpsRCant" type="number" min="0.01" step="0.01" placeholder="1" style="${ctrl};width:70px;text-align:center">
        </div>
        <div style="display:flex;flex-direction:column;gap:.2rem;min-width:70px">
          <label style="font-size:.68rem;color:var(--muted2)">Unidad</label>
          <input id="lpsRUnd" placeholder="m³, kg, gl..." style="${ctrl};width:70px">
        </div>
        <button class="btn btn-a" style="--ba:#818cf8" onclick="_lpsAddRecurso()">＋ Agregar</button>
      </div>`;
  }
}

function _lpsRenderRecursosList(){
  const lista=document.getElementById('lpsRecursosLista');if(!lista)return;
  const recs=(DB.lpsWbsRecursos||[]).filter(r=>r.wbsId===_lpsRecursosWbsId);
  if(!recs.length){lista.innerHTML=`<p style="font-size:.76rem;color:var(--muted2);text-align:center;padding:.4rem">Sin recursos asignados aún.</p>`;return;}
  const grupos={Equipo:[],Personal:[],Material:[]};
  recs.forEach(r=>{(grupos[r.tipo]||grupos['Material']).push(r);});
  lista.innerHTML=`<div style="font-size:.65rem;font-weight:700;color:var(--muted2);letter-spacing:.08em;margin-bottom:.4rem">ASIGNADOS</div>`+
    Object.entries(grupos).filter(([,v])=>v.length).map(([tipo,items])=>`
      <div style="margin-bottom:.5rem">
        <div style="font-size:.62rem;font-weight:700;color:${_TIPO_REC_COLOR[tipo]};letter-spacing:.07em;margin-bottom:.25rem">${_TIPO_REC_IC[tipo]} ${tipo.toUpperCase()}</div>
        <div style="display:flex;flex-wrap:wrap;gap:.3rem">
          ${items.map(r=>`
            <div style="display:flex;align-items:center;gap:.35rem;background:rgba(${tipo==='Equipo'?'245,158,11':tipo==='Personal'?'16,185,129':'129,140,248'},.1);border:1px solid rgba(${tipo==='Equipo'?'245,158,11':tipo==='Personal'?'16,185,129':'129,140,248'},.22);border-radius:6px;padding:.2rem .55rem">
              <span style="font-size:.76rem;font-weight:600;color:var(--text)">${r.nombre}</span>
              <span style="font-size:.7rem;color:var(--muted2)">${r.cantidad} ${r.unidad||'und'}</span>
              <button onclick="_lpsDelRecurso(${r.id})" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:.72rem;padding:0;line-height:1">✕</button>
            </div>`).join('')}
        </div>
      </div>`).join('');
}

function _lpsAddRecurso(){
  const tipo=_lpsRTabActivo;
  const nombre=(document.getElementById('lpsRNombre')?.value||'').trim();
  const cantidad=+document.getElementById('lpsRCant')?.value||1;
  const unidad=(document.getElementById('lpsRUnd')?.value||'und').trim();
  if(!nombre){toast('Selecciona o escribe el nombre del recurso',true);return;}
  const rec={id:nid('lpsWbsR'),wbsId:_lpsRecursosWbsId,tipo,nombre,cantidad,unidad};
  if(!DB.lpsWbsRecursos)DB.lpsWbsRecursos=[];
  DB.lpsWbsRecursos.push(rec);
  syncSheet('saveLpsRecurso',rec);
  _lpsRTab(tipo);
  _lpsRenderRecursosList();
  _lpsRenderTab();
  toast('✓ Recurso agregado');
}

function _lpsDelRecurso(id){
  if(!confirm('¿Eliminar este recurso?'))return;
  DB.lpsWbsRecursos=DB.lpsWbsRecursos.filter(r=>r.id!==id);
  supaDelete('lpsWbsRecursos',id);
  _lpsRenderRecursosList();
  _lpsRenderTab();
  toast('Recurso eliminado');
}

function _lpsSetProyFecha(tipo,val){
  if(tipo==='ini') _lpsProyInicio=val;
  else _lpsProyFin=val;
  // Guardar en Supabase (registro único id=1)
  if(!DB.lpsConfig) DB.lpsConfig=[];
  let cfg=DB.lpsConfig[0];
  if(!cfg){cfg={id:1,proyectoInicio:'',proyectoFin:''};DB.lpsConfig.push(cfg);}
  cfg.proyectoInicio=_lpsProyInicio;
  cfg.proyectoFin=_lpsProyFin;
  syncSheet('saveLpsConfig',cfg);
  // Mantener localStorage como caché local
  localStorage.setItem('_lpsProyInicio',_lpsProyInicio);
  localStorage.setItem('_lpsProyFin',_lpsProyFin);
  _lpsRenderTab();
}

function _lpsWbsToggleTitulo(esTitulo){
  const undWrap=document.getElementById('lpsWbsUndWrap');
  const cantWrap=document.getElementById('lpsWbsCantWrap');
  const cronoWrap=document.getElementById('lpsWbsCronoWrap');
  if(undWrap)undWrap.style.display=esTitulo?'none':'';
  if(cantWrap)cantWrap.style.display=esTitulo?'none':'';
  if(cronoWrap)cronoWrap.style.display=esTitulo?'none':'';
}

function _lpsOpenWbs(id,afterId=null){
  _lpsEditWbsId=id;
  _lpsWbsAfterId=afterId;
  const w=id?DB.lpsWbs.find(x=>x.id===id):null;
  // Detectar nivel automático
  if(w){
    _lpsWbsNivel=Math.max(1,_wbsLvl(w.codigo||''));
  } else if(afterId){
    const aw=DB.lpsWbs.find(x=>x.id===afterId);
    if(aw)_lpsWbsNivel=Math.max(1,_wbsLvl(aw.codigo||''));
  } else {
    const all=_lpsWbsSorted();
    const last=all[all.length-1];
    _lpsWbsNivel=last?Math.max(1,_wbsLvl(last.codigo||'')):1;
  }
  const esTitulo=w?.tipo==='TITULO';
  document.getElementById('lpsWbsMtl').textContent=w?'✏️ Editar Actividad':'＋ Nueva Actividad';
  document.getElementById('lpsWbsCod').value=w?.codigo||'';
  document.getElementById('lpsWbsDesc').value=w?.desc||'';
  document.getElementById('lpsWbsUnd').value=w?.unidad||'m³';
  document.getElementById('lpsWbsCant').value=w?.cantTotal||'';
  const sel=document.getElementById('lpsWbsSect');
  sel.innerHTML=`<option value="">— Seleccionar —</option>`+_lpsSects().map(s=>`<option${w?.sector===s?' selected':''}>${s}</option>`).join('');
  const chk=document.getElementById('lpsWbsEsTitulo');
  if(chk){chk.checked=esTitulo;_lpsWbsToggleTitulo(esTitulo);}
  // Campos de programación
  document.getElementById('lpsWbsIni').value=w?.fechaIni||'';
  document.getElementById('lpsWbsFin').value=w?.fechaFin||'';
  document.getElementById('lpsWbsCantDias').value=w?.cantDias||'';
  const predSel=document.getElementById('lpsWbsPred');
  if(predSel){
    const otros=(DB.lpsWbs||[]).filter(x=>x.id!==id&&x.tipo!=='TITULO');
    predSel.innerHTML='<option value="">— Sin predecesora —</option>'+
      otros.map(x=>`<option value="${x.id}"${w?.predId===x.id?' selected':''}>${x.codigo} – ${x.desc.slice(0,35)}</option>`).join('');
  }
  const predTipoEl=document.getElementById('lpsWbsPredTipo');
  if(predTipoEl)predTipoEl.value=w?.predTipo||'FS';
  const predLagEl=document.getElementById('lpsWbsPredLag');
  if(predLagEl)predLagEl.value=w?.predLag||0;
  _lpsUpdateNivelUI(!!w);// skipCode si estamos editando (ya tiene su código)
  openM('mLpsWbs');
}

function _lpsWbsPredChange(){
  const predId=+document.getElementById('lpsWbsPred').value||0;
  if(!predId)return;
  const pred=(DB.lpsWbs||[]).find(x=>x.id===predId);
  if(!pred)return;
  const tipo=document.getElementById('lpsWbsPredTipo')?.value||'FS';
  const lag=+document.getElementById('lpsWbsPredLag')?.value||0;
  let ini=null;
  if(tipo==='FS'&&pred.fechaFin) ini=_lpsAddDays(pred.fechaFin,1+lag);
  else if(tipo==='CC'&&pred.fechaIni) ini=_lpsAddDays(pred.fechaIni,lag);
  if(ini){
    document.getElementById('lpsWbsIni').value=ini;
    const dur=+document.getElementById('lpsWbsCantDias').value||0;
    if(dur>0)document.getElementById('lpsWbsFin').value=_lpsAddDays(ini,dur-1);
  }
}
function _lpsWbsDatesChange(){
  const ini=document.getElementById('lpsWbsIni').value;
  const fin=document.getElementById('lpsWbsFin').value;
  if(ini&&fin){
    const d=Math.ceil((new Date(fin)-new Date(ini))/86400000)+1;
    if(d>0)document.getElementById('lpsWbsCantDias').value=d;
  }
}
function _lpsWbsDurChange(){
  const ini=document.getElementById('lpsWbsIni').value;
  const dur=+document.getElementById('lpsWbsCantDias').value||0;
  if(ini&&dur>0)document.getElementById('lpsWbsFin').value=_lpsAddDays(ini,dur-1);
}

function _lpsSaveWbs(){
  const codigo=document.getElementById('lpsWbsCod').value.trim();
  const desc=document.getElementById('lpsWbsDesc').value.trim();
  const esTitulo=document.getElementById('lpsWbsEsTitulo')?.checked||false;
  const tipo=esTitulo?'TITULO':'ACTIVIDAD';
  const unidad=esTitulo?'—':document.getElementById('lpsWbsUnd').value.trim();
  const cantTotal=esTitulo?0:(+document.getElementById('lpsWbsCant').value||0);
  const sector=document.getElementById('lpsWbsSect').value;
  const fechaIni=document.getElementById('lpsWbsIni')?.value||'';
  const fechaFin=document.getElementById('lpsWbsFin')?.value||'';
  const cantDias=+document.getElementById('lpsWbsCantDias')?.value||0;
  const predId=+document.getElementById('lpsWbsPred')?.value||0;
  const predTipo=document.getElementById('lpsWbsPredTipo')?.value||'FS';
  const predLag=+document.getElementById('lpsWbsPredLag')?.value||0;
  if(!codigo||!sector){toast('Complete código y sector',true);return;}
  if(_lpsEditWbsId){
    const w=DB.lpsWbs.find(x=>x.id===_lpsEditWbsId);
    if(w){Object.assign(w,{codigo,desc,unidad,cantTotal,sector,tipo,fechaIni,fechaFin,cantDias,predId,predTipo,predLag});syncSheet('saveLpsWbs',w);}
  }else{
    let newOrden;
    if(_lpsWbsAfterId){
      const allS=_lpsWbsSorted();
      const idx=allS.findIndex(w=>w.id===_lpsWbsAfterId);
      if(idx>=0){
        const cur=allS[idx].orden||0;
        const nxt=idx<allS.length-1?(allS[idx+1].orden||cur+20):cur+20;
        newOrden=(cur+nxt)/2;
      }
    }
    const maxOrden=DB.lpsWbs.length?Math.max(...DB.lpsWbs.map(w=>w.orden||0))+10:0;
    const rec={id:nid('lpsW'),codigo,desc,unidad,cantTotal,sector,tipo,orden:newOrden??maxOrden,fechaIni,fechaFin,cantDias,predId,predTipo,predLag};
    DB.lpsWbs.push(rec);syncSheet('saveLpsWbs',rec);
  }
  closeM('mLpsWbs');_lpsRenderTab();toast('✓ '+(esTitulo?'Título':'Actividad')+' guardado');
}

function _lpsDelWbs(id){
  if(!confirm('¿Eliminar esta actividad WBS?'))return;
  DB.lpsWbs=DB.lpsWbs.filter(w=>w.id!==id);
  supaDelete('lpsWbs',id);
  _lpsRenderTab();toast('Actividad eliminada');
}

// ══════════════════════════════════════════════════════════════════════════════
// VISTA 2 – LOOKAHEAD 4 SEMANAS
// ══════════════════════════════════════════════════════════════════════════════
function _lpsRenderLookahead(c){
  const sF=document.getElementById('lpsLaSector')?.value||'';
  const wbs=_lpsWbsSorted().filter(w=>w.tipo!=='TITULO'&&(!sF||w.sector===sF));
  const semanas=Array.from({length:4},(_,i)=>_lpsAddDays(_lpsSemana,i*7));

  // Cabecera
  let hdrs=`<th style="min-width:80px">Código</th>
    <th style="min-width:115px;text-align:center">F. Inicio</th>
    <th style="min-width:115px;text-align:center">F. Fin</th>
    <th style="min-width:58px;text-align:center">Días</th>
    <th style="min-width:72px;text-align:right">Cant/día</th>
    <th style="min-width:70px">Sector</th>`;
  semanas.forEach((sw,si)=>{
    const days=_lpsDaysRange(sw,7);
    days.forEach(d=>{
      const dow=_lpsDow(d);
      const isWe=dow==='SÁB'||dow==='DOM';
      hdrs+=`<th style="font-size:.58rem;min-width:34px;padding:.2rem;text-align:center;${isWe?'background:rgba(255,255,255,.03);color:var(--muted2)':''}">
        <div>${dow}</div><div>${_lpsFmt(d)}</div>
      </th>`;
    });
    hdrs+=`<th style="font-size:.6rem;min-width:72px;text-align:center;background:rgba(16,185,129,.07);color:#10b981">Cant.<br>S${si+1}</th>`;
  });

  // Filas
  let tbodyRows='';
  if(!wbs.length){
    tbodyRows=`<tr><td colspan="100" style="text-align:center;color:var(--muted2);padding:1.5rem">Sin actividades. Agregue en la Biblioteca WBS.</td></tr>`;
  }else{
    wbs.forEach(w=>{
      const fechaIni=w.fechaIni||'';
      const fechaFin=w.fechaFin||'';
      // Usar cantDias guardado; si no existe, calcularlo de las fechas
      let cantDias=+w.cantDias||0;
      if(!cantDias&&fechaIni&&fechaFin){
        const d1=new Date(fechaIni+'T12:00:00'),d2=new Date(fechaFin+'T12:00:00');
        cantDias=Math.max(1,Math.round((d2-d1)/86400000)+1);
      }
      const cantDiaria=cantDias>0?(+w.cantTotal||0)/cantDias:0;
      const fmtV=v=>v===0?'':v%1===0?String(v):v.toFixed(1);
      const ctrl=`background:var(--panel2);border:1px solid var(--border);border-radius:5px;color:var(--text);padding:.2rem .4rem;font-size:.75rem`;

      let cells='';
      semanas.forEach(sw=>{
        const days=_lpsDaysRange(sw,7);
        let cantSem=0;
        days.forEach(d=>{
          const inRange=fechaIni&&fechaFin&&d>=fechaIni&&d<=fechaFin;
          const dow=_lpsDow(d);
          const isWe=dow==='SÁB'||dow==='DOM';
          if(inRange&&cantDiaria>0)cantSem+=cantDiaria;
          cells+=`<td style="text-align:center;padding:.15rem;${isWe?'background:rgba(255,255,255,.02)':''}${inRange?';background:rgba(16,185,129,.10)':''}">
            ${inRange&&cantDiaria>0
              ?`<div style="font-size:.62rem;font-weight:700;color:#10b981;line-height:1.3">${fmtV(cantDiaria)}</div>`
              :`<div style="width:22px;height:18px;border-radius:3px;margin:auto;background:rgba(255,255,255,.03);border:1px solid var(--border)"></div>`}
          </td>`;
        });
        cells+=`<td style="background:rgba(16,185,129,.04);padding:.25rem .4rem;text-align:right;font-size:.75rem;font-weight:600;color:${cantSem>0?'#10b981':'var(--muted2)'}">
          ${cantSem>0?fmtV(cantSem):'—'}
        </td>`;
      });

      tbodyRows+=`<tr>
        <td class="mono" style="color:${LPS_COLOR};font-size:.72rem">${w.codigo}</td>
        <td style="padding:.25rem"><input type="date" value="${fechaIni}" style="color-scheme:dark;${ctrl};width:125px"
          onchange="_lpsLaFecha(${w.id},'ini',this.value)"></td>
        <td style="padding:.25rem"><input type="date" value="${fechaFin}" style="color-scheme:dark;${ctrl};width:125px"
          onchange="_lpsLaFecha(${w.id},'fin',this.value)"></td>
        <td style="padding:.25rem"><input type="number" min="1" value="${cantDias||''}" placeholder="—"
          style="${ctrl};width:52px;text-align:center"
          onchange="_lpsLaDias(${w.id},+this.value)"></td>
        <td style="text-align:right;padding-right:.5rem;font-size:.78rem;font-weight:600;color:${cantDiaria>0?LPS_COLOR:'var(--muted2)'}">
          ${cantDiaria>0?fmtV(cantDiaria)+(w.unidad&&w.unidad!=='—'?' '+w.unidad:''):'—'}
        </td>
        <td><span style="font-size:.65rem;color:var(--muted2)">${w.sector}</span></td>
        ${cells}
      </tr>`;
    });
  }

  const _canAtras=!_lpsProyInicio||_lpsAddDays(_lpsSemana,-7)>=_lpsProyInicio;
  const _canAdelante=!_lpsProyFin||_lpsAddDays(_lpsSemana,7)<=_lpsProyFin;
  const _btnStyle=(ok)=>`background:${ok?'rgba(245,158,11,.15)':'rgba(255,255,255,.04)'};color:${ok?'#f59e0b':'#3d5070'};border:1px solid ${ok?'#f59e0b50':'#1e2740'};border-radius:6px;padding:.3rem .85rem;font-size:.8rem;font-weight:700;cursor:${ok?'pointer':'not-allowed'}`;
  c.innerHTML=`
  <div style="display:flex;align-items:center;gap:.6rem;flex-wrap:wrap;margin-bottom:.8rem">
    <select id="lpsLaSector" style="${_lpsCtrl()}" onchange="_lpsRenderTab()">
      <option value="">— Todos los sectores —</option>
      ${_lpsSects().map(s=>`<option${sF===s?' selected':''}>${s}</option>`).join('')}
    </select>
    ${_lpsProyInicio&&_lpsProyFin?`<span style="font-size:.7rem;color:var(--muted2);background:rgba(16,185,129,.07);border:1px solid rgba(16,185,129,.18);border-radius:5px;padding:.2rem .6rem">📅 ${_lpsFmt(_lpsProyInicio)} → ${_lpsFmt(_lpsProyFin)}</span>`:''}
    <div style="display:flex;align-items:center;gap:.5rem;margin-left:auto">
      <button onclick="_lpsRodarAtras()" ${_canAtras?'':' disabled'} style="${_btnStyle(_canAtras)}" title="${_canAtras?'Retroceder semana':'Límite de inicio de proyecto'}">◀ Atrás</button>
      <span style="font-size:.82rem;font-weight:700;color:${LPS_COLOR};min-width:130px;text-align:center">${_lpsFmtSem(_lpsSemana)}</span>
      <button onclick="_lpsRodarSemana()" ${_canAdelante?'':' disabled'} style="${_btnStyle(_canAdelante)}" title="${_canAdelante?'Avanzar semana':'Límite de fin de proyecto'}">Adelante ▶</button>
    </div>
  </div>
  <div class="tbl-wrap" style="overflow-x:auto"><table style="white-space:nowrap">
    <thead><tr>${hdrs}</tr></thead>
    <tbody>${tbodyRows}</tbody>
  </table></div>`;
}

function _lpsLaFecha(wbsId,tipo,val){
  const w=DB.lpsWbs.find(x=>x.id===wbsId);if(!w)return;
  if(tipo==='ini')w.fechaIni=val;else w.fechaFin=val;
  // Recalcular y guardar cantDias cuando ambas fechas están definidas
  if(w.fechaIni&&w.fechaFin){
    const d1=new Date(w.fechaIni+'T12:00:00'),d2=new Date(w.fechaFin+'T12:00:00');
    if(d2>=d1) w.cantDias=Math.round((d2-d1)/86400000)+1;
  }
  syncSheet('saveLpsWbs',w);
  _lpsRenderTab();
}

function _lpsLaDias(wbsId,dias){
  const w=DB.lpsWbs.find(x=>x.id===wbsId);
  if(!w||dias<1)return;
  w.cantDias=dias;
  // Calcular fechaFin a partir de fechaIni + cantDias
  if(w.fechaIni) w.fechaFin=_lpsAddDays(w.fechaIni,dias-1);
  syncSheet('saveLpsWbs',w);
  _lpsRenderTab();
}

function _lpsRodarSemana(){
  const newSem=_lpsAddDays(_lpsSemana,7);
  if(_lpsProyFin&&newSem>_lpsProyFin){toast('⚠ Límite de fin de proyecto alcanzado',true);return;}
  _lpsSemana=newSem;
  localStorage.setItem('_lpsSemana',_lpsSemana);
  _lpsRenderTab();toast('✓ Semana avanzada');
}

function _lpsRodarAtras(){
  const newSem=_lpsAddDays(_lpsSemana,-7);
  if(_lpsProyInicio&&newSem<_lpsProyInicio){toast('⚠ Límite de inicio de proyecto alcanzado',true);return;}
  _lpsSemana=newSem;
  localStorage.setItem('_lpsSemana',_lpsSemana);
  _lpsRenderTab();toast('✓ Semana retrocedida');
}

function _lpsFmtSem(iso){
  return `${_lpsFmt(iso)} – ${_lpsFmt(_lpsAddDays(iso,6))}`;
}

// ══════════════════════════════════════════════════════════════════════════════
// VISTA 3 – PLAN SEMANAL + PPC
// ══════════════════════════════════════════════════════════════════════════════
function _lpsRenderPlan(c){
  const semFin=_lpsAddDays(_lpsSemana,6);
  const days=_lpsDaysRange(_lpsSemana,7);
  const planes=(DB.lpsPlanSemanal||[]).filter(p=>p.semanaInicio===_lpsSemana);

  // Actividades con rango de fecha en esta semana (ordenadas por WBS)
  const wbsEnSem=_lpsWbsSorted().filter(w=>{
    if(w.tipo==='TITULO'||!w.fechaIni||!w.fechaFin)return false;
    return w.fechaFin>=_lpsSemana&&w.fechaIni<=semFin;
  });

  // PPC: actividades donde real >= plan (sobre las que tienen plan > 0)
  let planCount=0,cumplCount=0;
  wbsEnSem.forEach(w=>{
    const p=planes.find(x=>x.wbsId===w.id);if(!p)return;
    const cantDias=+w.cantDias||0;
    const cantDiaria=cantDias>0?(+w.cantTotal||0)/cantDias:0;
    const planSem=days.filter(d=>d>=w.fechaIni&&d<=w.fechaFin).length*cantDiaria;
    if(planSem<=0)return;
    const rd=p.realDias||{};
    const realSem=Object.values(rd).reduce((s,v)=>s+(+v||0),0);
    planCount++;
    if(realSem>=planSem*0.999)cumplCount++; // 0.999 evita errores de punto flotante
  });
  const ppc=planCount?Math.round(cumplCount/planCount*100):0;
  const ppcCol=ppc>=80?'#10b981':ppc>=60?'#f59e0b':'#ef4444';

  // Cabecera de días
  const ctrl=`background:var(--panel2);border:1px solid var(--border);border-radius:5px;color:var(--text);padding:.18rem .35rem;font-size:.72rem`;
  const dayHdrs=days.map(d=>{
    const dow=_lpsDow(d);const isWe=dow==='SÁB'||dow==='DOM';
    return`<th style="font-size:.58rem;min-width:48px;text-align:center;padding:.3rem .15rem;${isWe?'background:rgba(255,255,255,.03);color:var(--muted2)':''}"><div>${dow}</div><div>${_lpsFmt(d)}</div></th>`;
  }).join('');

  const fmtV=v=>v===0?'':v%1===0?String(v):parseFloat(v.toFixed(2)).toString();

  let tbody='';
  if(!wbsEnSem.length){
    tbody=`<tr><td colspan="100" style="text-align:center;color:var(--muted2);padding:1.5rem">Sin actividades con fechas en esta semana. Use "Sincronizar Lookahead".</td></tr>`;
  }else{
    wbsEnSem.forEach(w=>{
      const p=planes.find(x=>x.wbsId===w.id);
      const rd=p?p.realDias||{}:{};
      const cantDias=+w.cantDias||0;
      const cantDiaria=cantDias>0?(+w.cantTotal||0)/cantDias:0;
      const und=w.unidad&&w.unidad!=='—'?w.unidad:'';

      let planTotal=0,realTotal=0;

      const planCells=days.map(d=>{
        const inR=d>=w.fechaIni&&d<=w.fechaFin;
        const pv=inR&&cantDiaria>0?cantDiaria:0;
        if(pv)planTotal+=pv;
        const dow=_lpsDow(d);const isWe=dow==='SÁB'||dow==='DOM';
        return`<td style="text-align:center;padding:.15rem;${isWe?'background:rgba(255,255,255,.02)':''}${inR?';background:rgba(16,185,129,.07)':''}">
          ${pv>0?`<span style="font-size:.72rem;font-weight:700;color:#10b981">${fmtV(pv)}</span>`:`<span style="color:#1e2740;font-size:.7rem">—</span>`}
        </td>`;
      }).join('');

      const realCells=days.map(d=>{
        const inR=d>=w.fechaIni&&d<=w.fechaFin;
        const rv=+rd[d]||0;
        if(rv)realTotal+=rv;
        const dow=_lpsDow(d);const isWe=dow==='SÁB'||dow==='DOM';
        return`<td style="padding:.12rem;text-align:center;${isWe?'background:rgba(255,255,255,.02)':''}">
          ${inR
            ?`<input type="number" min="0" step="0.1" value="${rv||''}" placeholder="0"
                onchange="_lpsPlanReal(${p?p.id:0},${w.id},'${d}',+this.value)"
                style="width:46px;${ctrl};background:${rv>0?'rgba(245,158,11,.12)':'transparent'};border-color:${rv>0?'#f59e0b60':'var(--border)'};color:${rv>0?'#f59e0b':'var(--text)'};text-align:center">`
            :`<span style="color:#1e2740;font-size:.7rem">—</span>`}
        </td>`;
      }).join('');

      const cumplido=planTotal>0&&realTotal>=planTotal*0.999;
      const pct=planTotal>0?Math.min(100,Math.round(realTotal/planTotal*100)):0;
      const cumplCol=cumplido?'#10b981':pct>=50?'#f59e0b':'#ef4444';

      const _staff=(DB.personal||[]).filter(x=>x.tipo==='Staff');
      const respSel=p?`<select onchange="_lpsPlanUpd(${p.id},'responsable',this.value)" style="${ctrl};max-width:160px">
        <option value="">— Responsable —</option>
        ${_staff.map(u=>{const nombre=`${u.ape||''}, ${u.nom||''}`.trim().replace(/^,\s*/,'');return`<option value="${nombre}"${p.responsable===nombre?' selected':''}>${nombre}</option>`;}).join('')}
      </select>`:'-';

      tbody+=`
        <tr style="border-top:2px solid #1e2740">
          <td rowspan="2" class="mono" style="color:${LPS_COLOR};font-size:.68rem;vertical-align:middle;padding:.3rem .5rem">${w.codigo}</td>
          <td rowspan="2" style="font-size:.65rem;color:var(--muted2);vertical-align:middle">${w.sector}</td>
          <td rowspan="2" style="vertical-align:middle;padding:.2rem">${respSel}</td>
          <td style="padding:.12rem .4rem"><span style="font-size:.58rem;font-weight:700;color:#10b981;background:rgba(16,185,129,.15);border:1px solid #10b98130;border-radius:3px;padding:1px 6px">PLAN</span></td>
          ${planCells}
          <td style="text-align:right;font-weight:700;font-size:.75rem;color:#10b981;padding:.2rem .5rem;white-space:nowrap">${fmtV(planTotal)} ${und}</td>
          <td rowspan="2" style="text-align:center;vertical-align:middle;padding:.3rem">
            <div style="font-size:1.1rem;font-weight:800;color:${cumplCol}">${pct}%</div>
            <div style="font-size:.58rem;margin-top:2px;color:${cumplCol}">${cumplido?'✓ Cumplido':pct>0?'En curso':'Sin datos'}</div>
          </td>
        </tr>
        <tr>
          <td style="padding:.12rem .4rem"><span style="font-size:.58rem;font-weight:700;color:#f59e0b;background:rgba(245,158,11,.15);border:1px solid #f59e0b30;border-radius:3px;padding:1px 6px">REAL</span></td>
          ${realCells}
          <td style="text-align:right;font-weight:700;font-size:.75rem;color:${realTotal>0?'#f59e0b':'var(--muted2)'};padding:.2rem .5rem;white-space:nowrap">${realTotal>0?fmtV(realTotal)+' '+und:'—'}</td>
        </tr>`;
    });
  }

  const _canAtrasP=!_lpsProyInicio||_lpsAddDays(_lpsSemana,-7)>=_lpsProyInicio;
  const _canAdelanteP=!_lpsProyFin||_lpsAddDays(_lpsSemana,7)<=_lpsProyFin;
  const _btnNavP=(ok,lbl,fn)=>`<button onclick="${ok?fn:'void(0)'}" ${ok?'':'disabled'} style="background:${ok?'rgba(245,158,11,.12)':'rgba(255,255,255,.03)'};color:${ok?'#f59e0b':'#2a3a5a'};border:1px solid ${ok?'#f59e0b40':'#1e2740'};border-radius:6px;padding:.28rem .75rem;font-size:.78rem;font-weight:700;cursor:${ok?'pointer':'not-allowed'}">${lbl}</button>`;
  c.innerHTML=`
  <div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap;margin-bottom:.8rem">
    <div>
      <span style="font-size:.65rem;color:var(--muted2);letter-spacing:.08em">SEMANA ACTIVA</span>
      <div style="display:flex;align-items:center;gap:.5rem;margin-top:.15rem">
        ${_btnNavP(_canAtrasP,'◀','_lpsRodarAtras()')}
        <span style="font-size:.92rem;font-weight:700;color:${LPS_COLOR}">${_lpsFmtSem(_lpsSemana)}</span>
        ${_btnNavP(_canAdelanteP,'▶','_lpsRodarSemana()')}
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:.6rem;background:var(--panel2);border:1px solid var(--border);border-radius:8px;padding:.4rem 1rem">
      <span style="font-size:.65rem;color:var(--muted2)">PPC</span>
      <span style="font-size:1.7rem;font-weight:800;color:${ppcCol}">${ppc}%</span>
      <span style="font-size:.72rem;color:var(--muted2)">${cumplCount}/${planCount} act.</span>
    </div>
    <div style="display:flex;gap:.5rem;margin-left:auto">
      <button class="btn btn-a" style="--ba:${LPS_COLOR}" onclick="_lpsSincPlan()">⟳ Sincronizar Lookahead</button>
      <button class="btn btn-out" style="color:#ef4444;border-color:#ef444460" onclick="_lpsCerrarSemana()">✓ Cerrar Semana</button>
    </div>
  </div>
  <div class="tbl-wrap" style="overflow-x:auto"><table style="white-space:nowrap">
    <thead><tr>
      <th style="min-width:95px">Código</th>
      <th style="min-width:85px">Sector</th>
      <th style="min-width:145px">Responsable</th>
      <th style="min-width:44px"></th>
      ${dayHdrs}
      <th style="min-width:70px;text-align:right">Total</th>
      <th style="min-width:80px;text-align:center">PPC</th>
    </tr></thead>
    <tbody>${tbody}</tbody>
  </table></div>`;
}

function _lpsPlanReal(planId,wbsId,fecha,val){
  let p=(DB.lpsPlanSemanal||[]).find(x=>x.id===planId);
  if(!p){
    // Crear registro si no existe aún
    const w=DB.lpsWbs?.find(x=>x.id===wbsId);
    const rec={id:nid('lpsP'),semanaInicio:_lpsSemana,wbsId,responsable:'',programado:0,ejecutado:0,cumplido:'N',cncCategoria:'',cncDesc:'',realDias:{}};
    DB.lpsPlanSemanal.push(rec);p=rec;
  }
  if(!p.realDias)p.realDias={};
  if(val>0)p.realDias[fecha]=val;else delete p.realDias[fecha];
  p.ejecutado=parseFloat(Object.values(p.realDias).reduce((s,v)=>s+(+v||0),0).toFixed(2));
  syncSheet('saveLpsPlan',p);
  _lpsRenderTab();
}

function _lpsSincPlan(){
  const semFin=_lpsAddDays(_lpsSemana,6);
  const wbsEnSem=_lpsWbsSorted().filter(w=>{
    if(w.tipo==='TITULO'||!w.fechaIni||!w.fechaFin)return false;
    return w.fechaFin>=_lpsSemana&&w.fechaIni<=semFin;
  });
  let added=0;
  wbsEnSem.forEach(w=>{
    const exists=(DB.lpsPlanSemanal||[]).find(p=>p.semanaInicio===_lpsSemana&&p.wbsId===w.id);
    if(!exists){
      let cantDias=+w.cantDias||0;
      if(!cantDias&&w.fechaIni&&w.fechaFin){
        const d1=new Date(w.fechaIni+'T12:00:00'),d2=new Date(w.fechaFin+'T12:00:00');
        cantDias=Math.max(1,Math.round((d2-d1)/86400000)+1);
      }
      const cantDiaria=cantDias>0?(+w.cantTotal||0)/cantDias:0;
      const diasEnSem=_lpsDaysRange(_lpsSemana,7).filter(d=>d>=w.fechaIni&&d<=w.fechaFin).length;
      const programado=parseFloat((cantDiaria*diasEnSem).toFixed(2));
      const rec={id:nid('lpsP'),semanaInicio:_lpsSemana,wbsId:w.id,responsable:'',programado,ejecutado:0,cumplido:'N',cncCategoria:'',cncDesc:'',realDias:{}};
      DB.lpsPlanSemanal.push(rec);syncSheet('saveLpsPlan',rec);added++;
    }
  });
  _lpsRenderTab();toast(added?`✓ ${added} actividad(es) sincronizadas`:'Sin nuevas actividades con fechas en esta semana');
}

function _lpsPlanUpd(id,campo,val){
  const p=(DB.lpsPlanSemanal||[]).find(x=>x.id===id);
  if(p){p[campo]=val;syncSheet('saveLpsPlan',p);}
}

function _lpsCerrarSemana(){
  // Identificar incumplidas: realTotal < planTotal
  const semFin=_lpsAddDays(_lpsSemana,6);
  const days=_lpsDaysRange(_lpsSemana,7);
  const incump=[];
  _lpsWbsSorted().filter(w=>w.tipo!=='TITULO'&&w.fechaIni&&w.fechaFin&&w.fechaFin>=_lpsSemana&&w.fechaIni<=semFin).forEach(w=>{
    const p=(DB.lpsPlanSemanal||[]).find(x=>x.semanaInicio===_lpsSemana&&x.wbsId===w.id);
    if(!p)return;
    const cantDias=+w.cantDias||0;
    const cantDiaria=cantDias>0?(+w.cantTotal||0)/cantDias:0;
    const planSem=days.filter(d=>d>=w.fechaIni&&d<=w.fechaFin).length*cantDiaria;
    const realSem=Object.values(p.realDias||{}).reduce((s,v)=>s+(+v||0),0);
    if(planSem>0&&realSem<planSem*0.999)incump.push({p,w});
  });
  if(!incump.length){toast('✓ Todas las actividades cumplidas');return;}
  document.getElementById('lpsCncBody').innerHTML=incump.map(({p,w})=>`<tr>
    <td style="font-size:.78rem">${w.codigo} – ${w.desc}</td>
    <td><select id="cnc_cat_${p.id}" style="${_lpsCtrl()}">${LPS_CNC.map(cv=>`<option>${cv}</option>`).join('')}</select></td>
    <td><input id="cnc_desc_${p.id}" placeholder="Descripción breve..." style="${_lpsCtrl()};width:200px"></td>
  </tr>`).join('');
  openM('mLpsCnc');
}

function _lpsGuardarCnc(){
  const semFin=_lpsAddDays(_lpsSemana,6);
  const days=_lpsDaysRange(_lpsSemana,7);
  const incump=(DB.lpsPlanSemanal||[]).filter(p=>{
    if(p.semanaInicio!==_lpsSemana)return false;
    const w=DB.lpsWbs?.find(x=>x.id===p.wbsId);if(!w)return false;
    const cantDias=+w.cantDias||0;
    const cantDiaria=cantDias>0?(+w.cantTotal||0)/cantDias:0;
    const planSem=days.filter(d=>d>=w.fechaIni&&d<=w.fechaFin).length*cantDiaria;
    const realSem=Object.values(p.realDias||{}).reduce((s,v)=>s+(+v||0),0);
    return planSem>0&&realSem<planSem*0.999;
  });
  incump.forEach(p=>{
    p.cncCategoria=document.getElementById('cnc_cat_'+p.id)?.value||'';
    p.cncDesc=document.getElementById('cnc_desc_'+p.id)?.value||'';
    p.cumplido='N';
    syncSheet('saveLpsPlan',p);
  });
  closeM('mLpsCnc');
  toast(`✓ CNC registradas para ${incump.length} actividad(es)`);
  _lpsRenderTab();
}

// ══════════════════════════════════════════════════════════════════════════════
// VISTA 4 – RESTRICCIONES (entradas manuales de lps_restricciones)
// ══════════════════════════════════════════════════════════════════════════════
function _lpsRenderRestr(c){
  const abiertas=(DB.lpsRestricciones||[]).filter(r=>r.estado!=='CERRADA');
  const cerradas=(DB.lpsRestricciones||[]).filter(r=>r.estado==='CERRADA');
  function _row(r,done){
    const w=(DB.lpsWbs||[]).find(x=>x.id===r.wbsId);
    const vence=r.fechaLimite&&r.fechaLimite<today()&&!done;
    return`<tr style="${done?'opacity:.5':''}">
      <td style="font-size:.75rem;max-width:280px">${r.desc||'—'}</td>
      <td style="font-size:.74rem">${r.responsable||'—'}</td>
      <td style="text-align:center;font-size:.74rem;${vence?'color:#ef4444;font-weight:700':''}">${r.fechaLimite||'—'}</td>
      <td style="font-size:.7rem;color:var(--muted2)">${w?w.codigo+' – '+w.desc.slice(0,30):'—'}</td>
      <td><span class="badge ${r.estado==='CERRADA'?'b-green':'b-yellow'}">${r.estado||'ABIERTA'}</span></td>
      <td style="white-space:nowrap;display:flex;gap:.3rem">
        <button class="btn btn-sm" onclick="_lpsOpenRestr(${r.id})" style="background:#1e3a5f;border:1px solid #2a5a8f;color:#6bb3f5">✏️</button>
        ${!done?`<button class="btn btn-sm" onclick="_lpsRestrCerrar(${r.id})" style="background:rgba(16,185,129,.15);color:#10b981;border:1px solid #10b98140">✓ Cerrar</button>`:''}
        <button class="btn btn-del btn-sm" onclick="_lpsDelRestr(${r.id})">🗑</button>
      </td>
    </tr>`;
  }
  const abiertasRows=abiertas.length
    ?abiertas.map(r=>_row(r,false)).join('')
    :`<tr><td colspan="6" style="text-align:center;color:var(--muted2);padding:1.2rem">✓ Sin restricciones abiertas</td></tr>`;
  const cerradasRows=cerradas.length
    ?`<tr><td colspan="6" style="font-size:.65rem;letter-spacing:.1em;color:var(--muted2);padding:.3rem .6rem;text-transform:uppercase">Cerradas (${cerradas.length})</td></tr>`+cerradas.map(r=>_row(r,true)).join('')
    :'';
  c.innerHTML=`
  <div style="display:flex;align-items:center;gap:.8rem;margin-bottom:.8rem">
    <div style="font-size:.72rem;color:var(--muted2)">Restricciones que impiden el avance de actividades</div>
    ${abiertas.length?`<span style="background:rgba(239,68,68,.15);color:#ef4444;border:1px solid #ef444430;border-radius:5px;padding:2px 10px;font-size:.72rem;font-weight:700">${abiertas.length} abierta(s)</span>`:''}
    <button onclick="_lpsOpenRestr(null)" class="btn btn-a" style="--ba:#10b981;margin-left:auto">＋ Nueva Restricción</button>
  </div>
  <div class="tbl-wrap"><table>
    <thead><tr><th>Descripción</th><th>Responsable</th><th style="text-align:center">Fecha Límite</th><th>Actividad WBS</th><th>Estado</th><th></th></tr></thead>
    <tbody>${abiertasRows}${cerradasRows}</tbody>
  </table></div>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// VISTA 5 – CNC / CAUSAS DE NO CUMPLIMIENTO (auto-derivado de plan semanal)
// ══════════════════════════════════════════════════════════════════════════════
function _lpsRenderCnc(c){
  const pendientes=[],resueltas=[];
  const semanas=[...new Set((DB.lpsPlanSemanal||[]).map(p=>p.semanaInicio))].sort().reverse();
  semanas.forEach(sem=>{
    const planes=(DB.lpsPlanSemanal||[]).filter(p=>p.semanaInicio===sem);
    const days=_lpsDaysRange(sem,7);
    planes.forEach(p=>{
      const w=(DB.lpsWbs||[]).find(x=>x.id===p.wbsId);
      if(!w||w.tipo==='TITULO'||!w.fechaIni||!w.fechaFin)return;
      const cantDia=+w.cantDias>0?(+w.cantTotal||0)/+w.cantDias:0;
      const planSem=days.filter(d=>d>=w.fechaIni&&d<=w.fechaFin).length*cantDia;
      if(planSem<=0)return;
      const realSem=Object.values(p.realDias||{}).reduce((s,v)=>s+(+v||0),0);
      const pct=Math.round(realSem/planSem*100);
      if(pct>=100)return;
      const item={sem,semFin:_lpsAddDays(sem,6),p,w,planSem,realSem,pct};
      if(p.resuelto)resueltas.push(item);else pendientes.push(item);
    });
  });

  function _restrRow(x,done){
    const pctColor=x.pct===0?'#ef4444':x.pct<50?'#f59e0b':'#eab308';
    const cnc=x.p.cncCategoria?(x.p.cncCategoria+(x.p.cncDesc?' – '+x.p.cncDesc:'')):'<span style="color:var(--muted2);font-size:.7rem">Sin causa registrada</span>';
    return`<tr style="${done?'opacity:.5':''}">
      <td class="mono" style="font-size:.75rem">${x.w.codigo}</td>
      <td><span style="background:rgba(16,185,129,.12);color:#10b981;border:1px solid #10b98130;border-radius:4px;padding:1px 7px;font-size:.68rem">${x.w.sector||'—'}</span></td>
      <td style="text-align:center;font-size:.75rem">${_lpsFmt(x.sem)} – ${_lpsFmt(x.semFin)}</td>
      <td style="text-align:right;font-size:.75rem">${fmtN(x.planSem)} ${x.w.unidad||''}</td>
      <td style="text-align:right;font-size:.75rem">${fmtN(x.realSem)} ${x.w.unidad||''}</td>
      <td style="text-align:center"><span style="font-weight:700;font-size:.82rem;color:${pctColor}">${x.pct}%</span></td>
      <td style="font-size:.72rem">${cnc}</td>
      <td style="white-space:nowrap">
        ${!done
          ?`<button class="btn btn-sm" onclick="_lpsRestrAtender(${x.p.id})" style="background:rgba(16,185,129,.15);color:#10b981;border:1px solid #10b98140;font-size:.7rem">✓ Atendido</button>`
          :`<span style="font-size:.68rem;color:#10b981;font-weight:600">✓ Atendido</span>`}
      </td>
    </tr>`;
  }

  const pendRows=pendientes.length
    ?pendientes.map(x=>_restrRow(x,false)).join('')
    :`<tr><td colspan="8" style="text-align:center;color:var(--muted2);padding:1.2rem">✓ Sin restricciones pendientes — todas las actividades al 100%</td></tr>`;
  const resuRows=resueltas.length
    ?`<tr><td colspan="8" style="font-size:.65rem;letter-spacing:.1em;color:var(--muted2);padding:.3rem .6rem;text-transform:uppercase">Atendidas (${resueltas.length})</td></tr>`+resueltas.map(x=>_restrRow(x,true)).join('')
    :'';

  c.innerHTML=`
  <div style="display:flex;align-items:center;gap:.8rem;margin-bottom:.8rem;flex-wrap:wrap">
    <div style="font-size:.72rem;color:var(--muted2)">Actividades del Plan Semanal con cumplimiento &lt; 100%</div>
    ${pendientes.length?`<span style="background:rgba(239,68,68,.15);color:#ef4444;border:1px solid #ef444430;border-radius:5px;padding:2px 10px;font-size:.72rem;font-weight:700">${pendientes.length} pendiente(s)</span>`:''}
  </div>
  <div class="tbl-wrap"><table>
    <thead><tr><th>Código Actividad</th><th>Sector</th><th style="text-align:center">Semana</th><th style="text-align:right">Planificado</th><th style="text-align:right">Real</th><th style="text-align:center">%</th><th>Causa (CNC)</th><th></th></tr></thead>
    <tbody>${pendRows}${resuRows}</tbody>
  </table></div>`;
}

let _lpsEditRestrId=null;
function _lpsOpenRestr(id){
  _lpsEditRestrId=id;
  const r=id?(DB.lpsRestricciones||[]).find(x=>x.id===id):null;
  document.getElementById('lpsRestrMtl').textContent=r?'✏️ Editar Restricción':'＋ Nueva Restricción';
  document.getElementById('lpsRestrDesc').value=r?.desc||'';
  document.getElementById('lpsRestrResp').value=r?.responsable||'';
  document.getElementById('lpsRestrFecha').value=r?.fechaLimite||'';
  document.getElementById('lpsRestrWbs').innerHTML='<option value="">— Sin actividad específica —</option>'+(DB.lpsWbs||[]).filter(w=>w.tipo!=='TITULO').map(w=>`<option value="${w.id}"${r?.wbsId===w.id?' selected':''}>${w.codigo} – ${w.desc.slice(0,40)}</option>`).join('');
  document.getElementById('lpsRestrEst').value=r?.estado||'ABIERTA';
  // Poblar datalist con todo el staff activo
  const dl=document.getElementById('lpsRestrRespList');
  if(dl){
    const staff=(DB.personal||[]).filter(p=>p.est==='Activo'||(p.est||'').toLowerCase()==='activo');
    dl.innerHTML=staff.map(p=>`<option value="${p.ape}, ${p.nom}">${p.cargo||''}</option>`).join('');
  }
  openM('mLpsRestr');
}

function _lpsSaveRestr(){
  const desc=document.getElementById('lpsRestrDesc').value.trim();
  const responsable=document.getElementById('lpsRestrResp').value.trim();
  const fechaLimite=document.getElementById('lpsRestrFecha').value;
  const wbsId=+document.getElementById('lpsRestrWbs').value||0;
  const estado=document.getElementById('lpsRestrEst').value;
  if(!desc||!responsable||!fechaLimite){toast('Complete descripción, responsable y fecha',true);return;}
  if(_lpsEditRestrId){
    const r=(DB.lpsRestricciones||[]).find(x=>x.id===_lpsEditRestrId);
    if(r){Object.assign(r,{desc,responsable,fechaLimite,wbsId,estado});syncSheet('saveLpsRestr',r);}
  }else{
    const rec={id:nid('lpsR'),desc,responsable,fechaLimite,wbsId,estado};
    DB.lpsRestricciones.push(rec);syncSheet('saveLpsRestr',rec);
  }
  closeM('mLpsRestr');_lpsRenderTab();toast('✓ Restricción guardada');
}

function _lpsRestrAtender(id){
  const p=(DB.lpsPlanSemanal||[]).find(x=>x.id===id);
  if(p){p.resuelto=true;syncSheet('saveLpsPlan',p);_lpsRenderTab();toast('✓ Marcado como atendido');}
}

function _lpsRestrCerrar(id){
  const r=(DB.lpsRestricciones||[]).find(x=>x.id===id);
  if(r){r.estado='CERRADA';syncSheet('saveLpsRestr',r);_lpsRenderTab();toast('✓ Restricción cerrada');}
}

function _lpsDelRestr(id){
  if(!confirm('¿Eliminar esta restricción?'))return;
  DB.lpsRestricciones=DB.lpsRestricciones.filter(r=>r.id!==id);
  supaDelete('lpsRestricciones',id);
  _lpsRenderTab();toast('Restricción eliminada');
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORTAR A PDF
// ══════════════════════════════════════════════════════════════════════════════
function _lpsPrintCurrent(){
  const tabNames=['Biblioteca WBS','Cronograma','Lookahead 4 Semanas','Plan Semanal / PPC','Restricciones','CNC – Causas de No Cumplimiento'];
  const tabName=tabNames[_lpsTab-1]||'Planning';
  const fechaExp=new Date().toLocaleString('es-PE');
  const _logoUrl=window.location.href.replace(/[^\/\\]+$/,'')+'09.-ERP/Imagenes/ECOSERMO-LOGO.png';

  let body='';
  if(_lpsTab===1) body=_lpsPrintBodyWBS();
  else if(_lpsTab===2) body=_lpsPrintBodyCrono();
  else if(_lpsTab===3) body=_lpsPrintBodyLookahead();
  else if(_lpsTab===4) body=_lpsPrintBodyPlan();
  else if(_lpsTab===5) body=_lpsPrintBodyRestrManual();
  else body=_lpsPrintBodyRestr();

  const html=`<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">
<title>${tabName} – Planning ECOSERMO</title>
<style>
@page{size:A4 landscape;margin:.8cm}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,Helvetica,sans-serif;font-size:9px;color:#111;background:#fff}
.hdr{display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #059669;padding-bottom:5px;margin-bottom:8px}
.hdr img{height:40px;object-fit:contain}
.hdr-title{font-size:13px;font-weight:900;color:#059669;text-align:center}
.hdr-sub{font-size:7.5px;color:#64748b;text-align:center;margin-top:2px}
.hdr-right{font-size:7.5px;color:#64748b;text-align:right}
table{width:100%;border-collapse:collapse;margin-top:4px}
th{background:#064e3b;color:#fff;padding:4px 6px;text-align:left;font-size:7.5px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;border:1px solid #047857}
td{padding:3px 6px;border:1px solid #d1fae5;vertical-align:middle;font-size:8px}
tr:nth-child(even) td{background:#f0fdf4}
.lv1{background:#d1fae5!important;color:#065f46;font-weight:700;font-size:9px}
.lv2t{background:#fee2e2!important;color:#991b1b;font-weight:700}
.lv3t{background:#dbeafe!important;color:#1e3a8a;font-weight:700}
.lv-act{color:#111}
.mono{font-family:'Courier New',monospace}
.badge-ok{color:#065f46;font-weight:700}.badge-no{color:#991b1b;font-weight:700}
.ppc-box{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:5px;padding:6px 10px;margin-bottom:8px;font-size:9px}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>
<div class="hdr">
  <img src="${_logoUrl}" alt="ECOSERMO">
  <div><div class="hdr-title">PLANNING &amp; MONITORING – ${tabName.toUpperCase()}</div>
  <div class="hdr-sub">R3 Cota 4416 – Recrecimiento Dique Relavera · Buenaventura · UM Uchuchacua</div></div>
  <div class="hdr-right"><div style="font-weight:700;color:#059669;font-size:9px">Generado:</div><div>${fechaExp}</div></div>
</div>
${body}
</body></html>`;

  const win=window.open('','_blank');
  if(!win){toast('Active ventanas emergentes para exportar PDF',true);return;}
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(()=>win.print(),500);
}

function _lpsPrintBodyWBS(){
  const items=_lpsWbsSorted();
  const q=(document.getElementById('lpsWbsQ')?.value||'').toLowerCase();
  const sF=document.getElementById('lpsWbsSector')?.value||'';
  const list=items.filter(w=>(!sF||w.sector===sF)&&(!q||(w.codigo||'').toLowerCase().includes(q)));
  if(!list.length)return'<p style="margin-top:1rem;color:#555">Sin actividades registradas.</p>';
  const rows=list.map(w=>{
    const lv=_wbsLvl(w.codigo||'');
    const hasCont=!!(w.unidad&&+w.cantTotal>0);
    let cls='lv-act';
    if(lv===1)cls='lv1';
    else if(lv===2&&!hasCont)cls='lv2t';
    else if(lv>=3&&!hasCont)cls='lv3t';
    return`<tr class="${cls}"><td class="mono">${w.codigo||''}</td><td>${w.unidad||''}</td><td style="text-align:right">${w.cantTotal?fmtN(+w.cantTotal):''}</td><td>${w.sector||''}</td></tr>`;
  }).join('');
  return`<table><thead><tr><th>Código / Descripción</th><th>Und</th><th style="text-align:right">Cant. Total</th><th>Sector</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function _lpsPrintBodyLookahead(){
  const sF=document.getElementById('lpsLaSector')?.value||'';
  const list=_lpsWbsSorted().filter(w=>w.tipo!=='TITULO'&&w.fechaIni&&w.fechaFin&&(!sF||w.sector===sF));
  if(!list.length)return'<p style="margin-top:1rem;color:#555">Sin actividades programadas.</p>';
  const semanas=Array.from({length:4},(_,i)=>_lpsAddDays(_lpsSemana,i*7));
  const semHdrs=semanas.map(sw=>`<th style="text-align:center">Sem. ${_lpsFmt(sw)} – ${_lpsFmt(_lpsAddDays(sw,6))}</th>`).join('');
  const rows=list.map(w=>{
    const cantDia=+w.cantDias>0?(+w.cantTotal||0)/+w.cantDias:0;
    const cells=semanas.map(sw=>{
      const d=_lpsDaysRange(sw,7).filter(d=>d>=w.fechaIni&&d<=w.fechaFin).length;
      return`<td style="text-align:right">${d>0?fmtN(d*cantDia):''}</td>`;
    }).join('');
    return`<tr><td class="mono">${w.codigo||''}</td><td>${w.unidad||''}</td><td style="text-align:right">${w.cantDias||''}</td><td>${w.sector||''}</td>${cells}</tr>`;
  }).join('');
  return`<table><thead><tr><th>Código</th><th>Und</th><th style="text-align:right">Días</th><th>Sector</th>${semHdrs}</tr></thead><tbody>${rows}</tbody></table>`;
}

function _lpsPrintBodyPlan(){
  const semFin=_lpsAddDays(_lpsSemana,6);
  const days=_lpsDaysRange(_lpsSemana,7);
  const planes=(DB.lpsPlanSemanal||[]).filter(p=>p.semanaInicio===_lpsSemana);
  const list=_lpsWbsSorted().filter(w=>!w.tipo||w.tipo!=='TITULO').filter(w=>w.fechaIni&&w.fechaFin&&w.fechaFin>=_lpsSemana&&w.fechaIni<=semFin);
  let planTot=0,cumplTot=0;
  const rows=list.map(w=>{
    const p=planes.find(x=>x.wbsId===w.id);
    const cantDia=+w.cantDias>0?(+w.cantTotal||0)/+w.cantDias:0;
    const planSem=days.filter(d=>d>=w.fechaIni&&d<=w.fechaFin).length*cantDia;
    const realSem=Object.values(p?.realDias||{}).reduce((s,v)=>s+(+v||0),0);
    if(planSem>0){planTot++;if(realSem>=planSem*0.999)cumplTot++;}
    const estado=planSem>0?(realSem>=planSem*0.999?'<span class="badge-ok">✓ Cumplido</span>':'<span class="badge-no">✗ No cumplido</span>'):'';
    return`<tr><td class="mono">${w.codigo||''}</td><td>${w.unidad||''}</td><td style="text-align:right">${fmtN(planSem)}</td><td style="text-align:right">${realSem?fmtN(realSem):''}</td><td style="text-align:center">${estado}</td><td style="font-size:7.5px;color:#555">${p?.cncCategoria||''}${p?.cncDesc?' – '+p.cncDesc:''}</td></tr>`;
  }).join('');
  const ppc=planTot>0?Math.round(cumplTot/planTot*100):0;
  return`<div class="ppc-box"><strong>Semana: ${_lpsFmt(_lpsSemana)} – ${_lpsFmt(semFin)}</strong> &nbsp;|&nbsp; PPC: <strong style="color:${ppc>=80?'#065f46':'#991b1b'}">${ppc}%</strong> &nbsp;(${cumplTot} / ${planTot} actividades cumplidas)</div>
  <table><thead><tr><th>Código</th><th>Und</th><th style="text-align:right">Planificado</th><th style="text-align:right">Real</th><th>Estado</th><th>CNC / Causa</th></tr></thead>
  <tbody>${rows||'<tr><td colspan="6" style="text-align:center;color:#999">Sin actividades en esta semana</td></tr>'}</tbody></table>`;
}

function _lpsPrintBodyRestrManual(){
  const rows=(DB.lpsRestricciones||[]).map(r=>{
    const w=(DB.lpsWbs||[]).find(x=>x.id===r.wbsId);
    const vence=r.fechaLimite&&r.fechaLimite<today()&&r.estado!=='CERRADA';
    return`<tr style="${r.estado==='CERRADA'?'opacity:.5':''}">
      <td>${r.desc||'—'}</td>
      <td>${r.responsable||'—'}</td>
      <td style="text-align:center;${vence?'color:#c00;font-weight:700':''}">${r.fechaLimite||'—'}</td>
      <td style="font-size:.8em">${w?w.codigo+' – '+w.desc.slice(0,35):'—'}</td>
      <td style="text-align:center"><span style="background:${r.estado==='CERRADA'?'#d1fae5':'#fef3c7'};color:${r.estado==='CERRADA'?'#065f46':'#92400e'};border-radius:4px;padding:2px 8px;font-size:.85em">${r.estado||'ABIERTA'}</span></td>
    </tr>`;
  }).join('');
  return`<table><thead><tr><th>Descripción</th><th>Responsable</th><th>Fecha Límite</th><th>Actividad WBS</th><th>Estado</th></tr></thead>
    <tbody>${rows||'<tr><td colspan="5" style="text-align:center;color:#999">Sin restricciones registradas</td></tr>'}</tbody></table>`;
}

function _lpsPrintBodyRestr(){
  const pendientes=[],resueltas=[];
  const semanas=[...new Set((DB.lpsPlanSemanal||[]).map(p=>p.semanaInicio))].sort().reverse();
  semanas.forEach(sem=>{
    const planes=(DB.lpsPlanSemanal||[]).filter(p=>p.semanaInicio===sem);
    const days=_lpsDaysRange(sem,7);
    planes.forEach(p=>{
      const w=(DB.lpsWbs||[]).find(x=>x.id===p.wbsId);
      if(!w||w.tipo==='TITULO'||!w.fechaIni||!w.fechaFin)return;
      const cantDia=+w.cantDias>0?(+w.cantTotal||0)/+w.cantDias:0;
      const planSem=days.filter(d=>d>=w.fechaIni&&d<=w.fechaFin).length*cantDia;
      if(planSem<=0)return;
      const realSem=Object.values(p.realDias||{}).reduce((s,v)=>s+(+v||0),0);
      const pct=Math.round(realSem/planSem*100);
      if(pct>=100)return;
      const item={sem,semFin:_lpsAddDays(sem,6),p,w,planSem,realSem,pct};
      if(p.resuelto)resueltas.push(item);else pendientes.push(item);
    });
  });
  const all=[...pendientes,...resueltas];
  if(!all.length)return'<p style="margin-top:1rem;color:#555">Sin restricciones registradas.</p>';
  const rows=all.map(x=>{
    const pctColor=x.pct===0?'#991b1b':x.pct<50?'#92400e':'#713f12';
    const cnc=x.p.cncCategoria?(x.p.cncCategoria+(x.p.cncDesc?' – '+x.p.cncDesc:'')):'—';
    return`<tr style="${x.p.resuelto?'opacity:.6':''}"><td class="mono">${x.w.codigo}</td><td>${x.w.sector||''}</td><td style="text-align:center">${_lpsFmt(x.sem)} – ${_lpsFmt(x.semFin)}</td><td style="text-align:right">${fmtN(x.planSem)} ${x.w.unidad||''}</td><td style="text-align:right">${fmtN(x.realSem)} ${x.w.unidad||''}</td><td style="text-align:center;font-weight:700;color:${pctColor}">${x.pct}%</td><td style="font-size:7.5px">${cnc}</td><td style="text-align:center">${x.p.resuelto?'<span class="badge-ok">Atendido</span>':'<span class="badge-no">Pendiente</span>'}</td></tr>`;
  }).join('');
  return`<p style="font-size:8px;color:#555;margin-bottom:6px">Actividades del Plan Semanal con cumplimiento menor al 100% · Pendientes: ${pendientes.length} · Atendidas: ${resueltas.length}</p>
  <table><thead><tr><th>Código Actividad</th><th>Sector</th><th style="text-align:center">Semana</th><th style="text-align:right">Planificado</th><th style="text-align:right">Real</th><th style="text-align:center">%</th><th>Causa (CNC)</th><th style="text-align:center">Estado</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function _lpsPrintBodyCrono(){
  const sorted=_lpsWbsSorted().filter(w=>w.fechaIni&&w.fechaFin);
  if(!sorted.length)return'<p>Sin actividades con fechas programadas.</p>';
  const rows=sorted.map(w=>{
    const isT=w.tipo==='TITULO';
    const predW=w.predId?(DB.lpsWbs||[]).find(x=>x.id===w.predId):null;
    return`<tr${isT?' style="background:#f0f4f8;font-weight:700"':''}>
      <td style="padding-left:${_wbsLvl(w.codigo||'')*10}px">${w.codigo}</td>
      <td>${w.desc}</td>
      <td style="text-align:center">${w.cantDias||'—'}</td>
      <td style="text-align:center">${w.fechaIni||'—'}</td>
      <td style="text-align:center">${w.fechaFin||'—'}</td>
      <td style="text-align:center">${predW?predW.codigo:'—'}</td>
      <td style="text-align:center">${w.avance?w.avance+'%':'—'}</td>
    </tr>`;
  }).join('');
  return`<p style="font-size:8px;color:#555;margin-bottom:6px">Actividades programadas: ${sorted.length}</p>
  <table><thead><tr><th>Código</th><th>Descripción</th><th style="text-align:center">Días</th><th style="text-align:center">Inicio</th><th style="text-align:center">Fin</th><th style="text-align:center">Pred.</th><th style="text-align:center">Avance</th></tr></thead><tbody>${rows}</tbody></table>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// VISTA 6 – CRONOGRAMA (Gantt tipo MS Project)
// ══════════════════════════════════════════════════════════════════════════════
const _GANTT_PPD={week:10,month:3.8,quarter:1.4};

function _fmtDMY(iso){if(!iso)return'—';const[y,m,d]=iso.split('-');return`${d}/${m}/${y}`;}
function _fmtDM(iso){if(!iso)return'—';const[,m,d]=iso.split('-');return`${d}/${m}`;}

function _lpsRenderCrono(c){
  const sorted=_lpsWbsSorted();
  const withDates=sorted.filter(w=>w.fechaIni&&w.fechaFin);
  if(!withDates.length){
    c.innerHTML=`<div style="padding:2rem;text-align:center;color:var(--muted2);font-size:.82rem">
      Sin actividades con fechas.<br><span style="font-size:.75rem">Edita cada actividad WBS y completa Inicio / Fin en la sección Programación.</span>
    </div>`;return;
  }
  const PPD=_GANTT_PPD[_lpsGanttZoom]||3.8;
  const ROW_H=30,LEFT_W=420;

  const rIni=withDates.map(w=>w.fechaIni).reduce((a,b)=>a<b?a:b);
  const rFin=withDates.map(w=>w.fechaFin).reduce((a,b)=>a>b?a:b);
  const dS=new Date(rIni);dS.setDate(1);
  const dE=new Date(rFin);dE.setMonth(dE.getMonth()+2);dE.setDate(0);
  const totalDays=Math.ceil((dE-dS)/86400000);
  const ganttW=Math.max(800,Math.ceil(totalDays*PPD));

  function px(iso){if(!iso)return-1;return Math.round((new Date(iso)-dS)/86400000*PPD);}
  function bw(ini,fin){return Math.max(4,Math.round((Math.ceil((new Date(fin)-new Date(ini))/86400000)+1)*PPD));}

  // Cabecera meses
  let mHdr='';
  const dm=new Date(dS);
  while(dm<=dE){
    const mEnd=new Date(dm.getFullYear(),dm.getMonth()+1,0);
    const eff=mEnd<dE?mEnd:dE;
    const mW=Math.round((Math.floor((eff-dm)/86400000)+1)*PPD);
    mHdr+=`<div style="width:${mW}px;flex-shrink:0;border-right:1px solid #2a3040;padding:0 6px;font-size:.62rem;font-weight:700;color:var(--muted2);display:flex;align-items:center;overflow:hidden;box-sizing:border-box">
      ${dm.toLocaleDateString('es-PE',{month:'short',year:'numeric'}).toUpperCase()}
    </div>`;
    dm.setMonth(dm.getMonth()+1);dm.setDate(1);
  }
  // Cabecera semanas
  let wHdr='';
  if(_lpsGanttZoom!=='quarter'){
    const dw=new Date(dS);
    while(dw<=dE){
      const wEnd=new Date(dw);wEnd.setDate(wEnd.getDate()+6);
      const eff=wEnd<dE?wEnd:dE;
      const wW=Math.round((Math.floor((eff-dw)/86400000)+1)*PPD);
      const isEven=Math.floor((dw-dS)/86400000/7)%2===0;
      wHdr+=`<div style="width:${wW}px;flex-shrink:0;border-right:1px solid #1e2535;font-size:.55rem;color:#4a5568;text-align:center;display:flex;align-items:center;justify-content:center;background:${isEven?'transparent':'rgba(255,255,255,.012)'};box-sizing:border-box">${dw.getDate()}/${dw.getMonth()+1}</div>`;
      dw.setDate(dw.getDate()+7);
    }
  }
  // Grid semanas alternadas
  let grid='';
  const dg=new Date(dS);let gi=0;
  while(dg<=dE){
    if(gi%2===1){const gx=px(dg.toISOString().slice(0,10));grid+=`<div style="position:absolute;left:${gx}px;top:0;bottom:0;width:${Math.round(7*PPD)}px;background:rgba(255,255,255,.014);pointer-events:none"></div>`;}
    dg.setDate(dg.getDate()+7);gi++;
  }
  const todX=px(today());const todVis=todX>=0&&todX<=ganttW;
  const rowMap={};sorted.forEach((w,i)=>rowMap[w.id]=i);

  // Helper etiqueta predecesora: "01.01 FC+2" o "02.01 CC-1"
  function predLabel(w){
    if(!w.predId)return'—';
    const predW=(DB.lpsWbs||[]).find(x=>x.id===w.predId);
    if(!predW)return'—';
    const tipo=w.predTipo||'FS';
    const lag=+w.predLag||0;
    const tipoL=tipo==='CC'?'CC':'FC';
    const lagStr=lag>0?`+${lag}`:lag<0?`${lag}`:'';
    return`${predW.codigo} ${tipoL}${lagStr}`;
  }

  let leftH='',rightH='',arrows='';
  sorted.forEach((w,i)=>{
    const isT=w.tipo==='TITULO';
    const lv=_wbsLvl(w.codigo||'');
    const ind=lv*12;
    const bg=i%2===0?'rgba(255,255,255,.018)':'transparent';
    const predW=w.predId?(DB.lpsWbs||[]).find(x=>x.id===w.predId):null;
    const pLabel=predLabel(w);
    const isLinkSrc=_ganttLinkSrc===w.id;

    // Panel izquierdo
    const barClick=_ganttLinkMode
      ?`_ganttBarClick(${w.id})`
      :`_lpsOpenWbs(${w.id})`;
    leftH+=`<div style="height:${ROW_H}px;display:flex;align-items:center;background:${bg};border-bottom:1px solid #111927;padding:0 5px;gap:3px;box-sizing:border-box;overflow:hidden${isLinkSrc?';outline:2px solid #f59e0b;outline-offset:-2px':''}">
      <span style="padding-left:${ind}px;flex:1;min-width:0;font-size:.68rem;${isT?'font-weight:700;color:#e2e8f0':'color:var(--text)'};overflow:hidden;text-overflow:ellipsis;white-space:nowrap"
        title="${w.codigo} – ${w.desc}">
        ${isT?'▸ ':''}<span style="color:var(--ceq);margin-right:2px;font-size:.6rem">${w.codigo}</span>${w.desc}
      </span>
      <span style="width:26px;flex-shrink:0;text-align:right;font-size:.62rem;color:var(--muted2)">${w.cantDias||''}</span>
      <span style="width:52px;flex-shrink:0;font-size:.6rem;color:var(--muted2);text-align:center">${_fmtDM(w.fechaIni)}</span>
      <span style="width:52px;flex-shrink:0;font-size:.6rem;color:var(--muted2);text-align:center">${_fmtDM(w.fechaFin)}</span>
      <span style="width:58px;flex-shrink:0;font-size:.56rem;color:#4a6080;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${pLabel}">
        ${pLabel}
      </span>
      <button onclick="event.stopPropagation();${barClick}" style="background:none;border:none;color:${_ganttLinkMode?'#f59e0b':'#3d5272'};cursor:pointer;font-size:.7rem;padding:0 2px;flex-shrink:0" title="${_ganttLinkMode?'Seleccionar como origen/destino del vínculo':'Editar actividad'}">${_ganttLinkMode?'🔗':'✏️'}</button>
    </div>`;

    // Panel derecho (barra)
    let bar='';
    if(w.fechaIni&&w.fechaFin){
      const bx=px(w.fechaIni),barW=bw(w.fechaIni,w.fechaFin);
      const barH=isT?10:16,barTop=Math.floor((ROW_H-barH)/2);
      const col=isT?'#3d5272':_wbsCodeColor(w);
      if(bx>=0){
        const lagStr=w.predLag&&+w.predLag!==0?(+w.predLag>0?`+${w.predLag}`:`${w.predLag}`):'';
        const predTip=predW?`&#10;⬅ ${w.predTipo||'FS'}${lagStr}: ${predW.codigo}`:'';
        bar=`<div id="gbar_${w.id}" style="position:absolute;left:${bx}px;top:${barTop}px;height:${barH}px;width:${barW}px;
          background:${isLinkSrc?'#f59e0b':col};border-radius:${isT?'2px':'4px'};cursor:${_ganttLinkMode?'crosshair':'pointer'};z-index:2;
          ${isT?'clip-path:polygon(0 50%,4px 0%,calc(100% - 4px) 0%,100% 50%,calc(100% - 4px) 100%,4px 100%)':''}
          opacity:.9" onclick="_ganttBarClick(${w.id})"
          title="${w.codigo} – ${w.desc}&#10;📅 ${_fmtDMY(w.fechaIni)} → ${_fmtDMY(w.fechaFin)} (${w.cantDias||'?'} días)${predTip}">
          ${barW>50&&!isT?`<span style="position:absolute;left:5px;top:50%;transform:translateY(-50%);font-size:.57rem;color:#fff;white-space:nowrap;overflow:hidden;max-width:${barW-10}px;pointer-events:none">${w.desc.slice(0,Math.floor(barW/7))}</span>`:''}
        </div>`;
        // Flechas predecesoras (FS o CC)
        if(predW){
          const pi=rowMap[predW.id];
          if(pi!==undefined&&predW.fechaIni){
            const tipo=w.predTipo||'FS';
            let ax,ay;
            if(tipo==='CC'){
              ax=px(predW.fechaIni);
              ay=pi*ROW_H+ROW_H/2;
            }else{
              ax=predW.fechaIni?px(predW.fechaIni)+bw(predW.fechaIni,predW.fechaFin):-1;
              ay=pi*ROW_H+ROW_H/2;
            }
            const by2=i*ROW_H+ROW_H/2;
            const arrowCol=tipo==='CC'?'#8b5cf6':'#f59e0b';
            const markId=tipo==='CC'?'lpsCCArrow':'lpsFSArrow';
            let arrowPath;
            if(tipo==='CC'){
              const mx=Math.min(ax,bx)-8;
              arrowPath=`M${ax},${ay} H${mx} V${by2} H${bx}`;
            }else if(bx>=ax+8){
              // FC normal: sale del borde derecho, baja, entra desde la izquierda →
              arrowPath=`M${ax},${ay} H${ax+8} V${by2} H${bx}`;
            }else{
              // FC con traslape: doble codo para entrar siempre desde la izquierda →
              const emy=Math.round((ay+by2)/2);
              arrowPath=`M${ax},${ay} H${ax+8} V${emy} H${bx-8} V${by2} H${bx}`;
            }
            arrows+=`<path d="${arrowPath}" stroke="${arrowCol}" stroke-width="1.5" fill="none" stroke-dasharray="4,2" marker-end="url(#${markId})"/>`;
          }
        }
      }
    }
    rightH+=`<div style="position:relative;height:${ROW_H}px;background:${bg};border-bottom:1px solid #111927;box-sizing:border-box">${bar}</div>`;
  });

  const svgH=sorted.length*ROW_H;
  const predSVG=arrows?`<svg style="position:absolute;top:0;left:0;pointer-events:none;z-index:4;overflow:visible" width="${ganttW}" height="${svgH}">
    <defs>
      <marker id="lpsFSArrow" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto"><polygon points="0 0,7 2.5,0 5" fill="#f59e0b"/></marker>
      <marker id="lpsCCArrow" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto"><polygon points="0 0,7 2.5,0 5" fill="#8b5cf6"/></marker>
    </defs>
    ${arrows}
  </svg>`:'';

  const linkBtnStyle=_ganttLinkMode
    ?'background:#f59e0b;color:#000;border:1px solid #f59e0b'
    :'background:rgba(255,255,255,.06);color:var(--muted2);border:1px solid var(--border)';

  c.innerHTML=`
  <!-- Toolbar -->
  <div style="display:flex;align-items:center;gap:.4rem;margin-bottom:.6rem;flex-wrap:wrap">
    <span style="font-size:.7rem;color:var(--muted2);font-weight:700">Escala:</span>
    ${[['Semana','week'],['Mes','month'],['Trimestre','quarter']].map(([l,z])=>`<button onclick="_lpsGanttZoom='${z}';_lpsRenderTab()"
      style="padding:.22rem .75rem;font-size:.7rem;border-radius:5px;cursor:pointer;font-family:'Barlow',sans-serif;
      background:${_lpsGanttZoom===z?'#10b981':'rgba(255,255,255,.06)'};color:${_lpsGanttZoom===z?'#fff':'var(--muted2)'};
      border:1px solid ${_lpsGanttZoom===z?'#10b981':'var(--border)'}">${l}</button>`).join('')}
    <div style="width:1px;height:16px;background:var(--border);margin:0 2px"></div>
    <button onclick="_ganttToggleLink()" style="padding:.22rem .75rem;font-size:.7rem;border-radius:5px;cursor:pointer;font-family:'Barlow',sans-serif;${linkBtnStyle}">🔗 ${_ganttLinkMode?'Cancelar vínculo':'Vincular'}</button>
    ${_ganttLinkMode&&_ganttLinkSrc?`<span style="font-size:.65rem;color:#f59e0b;animation:pulse 1s infinite">🎯 Selecciona la actividad SUCESORA</span>`:''}
    <div style="width:1px;height:16px;background:var(--border);margin:0 2px"></div>
    <span style="font-size:.63rem;color:var(--muted2)">
      <span style="color:#10b981">■</span> Nv1 &nbsp;<span style="color:#f87171">■</span> Nv2 &nbsp;
      <span style="color:#93c5fd">■</span> Nv3+ &nbsp;
      <span style="color:#f59e0b">→</span> FC &nbsp;<span style="color:#8b5cf6">→</span> CC
    </span>
    <span style="margin-left:auto;font-size:.63rem;color:var(--muted2)">${_fmtDMY(rIni)} → ${_fmtDMY(rFin)} · ${sorted.length} item(s)</span>
  </div>

  <!-- Gantt -->
  <div style="display:flex;border:1px solid var(--border);border-radius:8px;overflow:hidden;height:calc(100vh - 228px)">
    <!-- Panel izquierdo fijo -->
    <div style="width:${LEFT_W}px;flex-shrink:0;display:flex;flex-direction:column;border-right:2px solid var(--border)">
      <div style="height:44px;flex-shrink:0;background:var(--panel2);border-bottom:2px solid var(--border);display:flex;align-items:center;padding:0 5px;gap:3px">
        <span style="flex:1;font-size:.6rem;font-weight:700;color:var(--muted2);text-transform:uppercase">Actividad</span>
        <span style="width:26px;font-size:.6rem;font-weight:700;color:var(--muted2);text-align:right" title="Días">Dur</span>
        <span style="width:52px;font-size:.6rem;font-weight:700;color:var(--muted2);text-align:center">Inicio</span>
        <span style="width:52px;font-size:.6rem;font-weight:700;color:var(--muted2);text-align:center">Fin</span>
        <span style="width:58px;font-size:.6rem;font-weight:700;color:var(--muted2);text-align:right">Pred.</span>
        <span style="width:22px"></span>
      </div>
      <div id="gLeft" style="overflow-y:scroll;flex:1;scrollbar-width:thin"
        onscroll="document.getElementById('gRight').scrollTop=this.scrollTop">
        ${leftH}
      </div>
    </div>
    <!-- Panel derecho Gantt -->
    <div style="flex:1;min-width:0;display:flex;flex-direction:column;overflow:hidden">
      <div style="height:44px;flex-shrink:0;background:var(--panel2);border-bottom:2px solid var(--border);overflow:hidden">
        <div id="gHdr" style="display:flex;flex-direction:column;width:${ganttW}px">
          <div style="display:flex;height:22px;border-bottom:1px solid #2a3040">${mHdr}</div>
          <div style="display:flex;height:22px">${wHdr}</div>
        </div>
      </div>
      <div id="gRight" style="overflow:auto;flex:1"
        onscroll="document.getElementById('gLeft').scrollTop=this.scrollTop;document.getElementById('gHdr').style.marginLeft='-'+this.scrollLeft+'px'">
        <div style="position:relative;width:${ganttW}px;min-height:100%">
          ${grid}
          ${todVis?`<div style="position:absolute;top:0;bottom:0;left:${todX}px;width:2px;background:rgba(239,68,68,.85);z-index:6;pointer-events:none">
            <div style="position:sticky;top:2px;background:#ef4444;color:#fff;font-size:.52rem;padding:1px 3px;border-radius:0 3px 3px 0;white-space:nowrap;font-weight:700">HOY</div>
          </div>`:''}
          ${predSVG}
          ${rightH}
        </div>
      </div>
    </div>
  </div>`;
}

function _ganttToggleLink(){
  _ganttLinkMode=!_ganttLinkMode;
  _ganttLinkSrc=null;
  _lpsRenderTab();
}

function _ganttBarClick(id){
  if(!_ganttLinkMode){_lpsOpenWbs(id);return;}
  if(!_ganttLinkSrc){
    _ganttLinkSrc=id;
    _lpsRenderTab();
    return;
  }
  if(_ganttLinkSrc===id){toast('Selecciona una actividad diferente como sucesora',true);return;}
  _ganttShowLinkForm(_ganttLinkSrc,id);
}

function _ganttShowLinkForm(srcId,tgtId){
  const src=(DB.lpsWbs||[]).find(x=>x.id===srcId);
  const tgt=(DB.lpsWbs||[]).find(x=>x.id===tgtId);
  if(!src||!tgt)return;
  const existing=document.getElementById('_ganttLinkDlg');
  if(existing)existing.remove();
  const dlg=document.createElement('div');
  dlg.id='_ganttLinkDlg';
  dlg.style.cssText='position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:99999;background:var(--panel);border:1px solid var(--border);border-radius:10px;padding:1.2rem 1.5rem;width:340px;box-shadow:0 8px 32px #0008;font-family:Barlow,sans-serif';
  dlg.innerHTML=`
    <div style="font-size:.8rem;font-weight:700;color:var(--text);margin-bottom:.8rem">🔗 Definir Vínculo</div>
    <div style="font-size:.7rem;color:var(--muted2);margin-bottom:.9rem">
      <span style="color:#10b981">${src.codigo}</span> → <span style="color:#f59e0b">${tgt.codigo}</span><br>
      <span style="font-size:.63rem;opacity:.7">${src.desc.slice(0,40)} → ${tgt.desc.slice(0,40)}</span>
    </div>
    <div style="display:grid;grid-template-columns:1fr 100px;gap:.6rem;margin-bottom:.9rem">
      <div>
        <label style="font-size:.65rem;color:var(--muted2);display:block;margin-bottom:.25rem">Tipo de vínculo</label>
        <select id="_glTipo" style="width:100%;background:var(--input);border:1px solid var(--border);color:var(--text);border-radius:5px;padding:.3rem .5rem;font-size:.75rem;color-scheme:dark">
          <option value="FS">FC – Fin a Comienzo</option>
          <option value="CC">CC – Comienzo a Comienzo</option>
        </select>
      </div>
      <div>
        <label style="font-size:.65rem;color:var(--muted2);display:block;margin-bottom:.25rem">Desfase (días)</label>
        <input id="_glLag" type="number" value="0" style="width:100%;background:var(--input);border:1px solid var(--border);color:var(--text);border-radius:5px;padding:.3rem .5rem;font-size:.75rem;color-scheme:dark;box-sizing:border-box">
      </div>
    </div>
    <div style="font-size:.63rem;color:var(--muted2);margin-bottom:.8rem;background:rgba(255,255,255,.04);border-radius:6px;padding:.5rem .7rem">
      <b>FC+5</b>: sucesora empieza 5 días después del fin de la predecesora<br>
      <b>CC-2</b>: sucesora empieza 2 días antes que la predecesora
    </div>
    <div style="display:flex;gap:.5rem;justify-content:flex-end">
      <button onclick="document.getElementById('_ganttLinkDlg').remove();_ganttToggleLink()"
        style="padding:.3rem .9rem;font-size:.72rem;border-radius:6px;cursor:pointer;background:rgba(255,255,255,.06);border:1px solid var(--border);color:var(--muted2)">Cancelar</button>
      <button onclick="_ganttConfirmLink(${srcId},${tgtId})"
        style="padding:.3rem .9rem;font-size:.72rem;border-radius:6px;cursor:pointer;background:#10b981;border:1px solid #10b981;color:#fff;font-weight:700">✓ Confirmar</button>
    </div>`;
  document.body.appendChild(dlg);
}

function _ganttConfirmLink(srcId,tgtId){
  const tipo=document.getElementById('_glTipo')?.value||'FS';
  const lag=+document.getElementById('_glLag')?.value||0;
  document.getElementById('_ganttLinkDlg')?.remove();
  const tgt=(DB.lpsWbs||[]).find(x=>x.id===tgtId);
  if(!tgt){toast('Actividad no encontrada',true);return;}
  const src=(DB.lpsWbs||[]).find(x=>x.id===srcId);
  tgt.predId=srcId;tgt.predTipo=tipo;tgt.predLag=lag;
  // Recalcular fechas de la sucesora
  if(src){
    let ini=null;
    if(tipo==='FS'&&src.fechaFin) ini=_lpsAddDays(src.fechaFin,1+lag);
    else if(tipo==='CC'&&src.fechaIni) ini=_lpsAddDays(src.fechaIni,lag);
    if(ini){
      tgt.fechaIni=ini;
      if(tgt.cantDias>0)tgt.fechaFin=_lpsAddDays(ini,tgt.cantDias-1);
    }
  }
  syncSheet('saveLpsWbs',tgt);
  _ganttLinkMode=false;_ganttLinkSrc=null;
  _lpsRenderTab();
  const lagStr=lag>0?`+${lag}`:lag<0?`${lag}`:'';
  toast(`✓ Vínculo ${tipo}${lagStr} creado: ${src?.codigo||''}→${tgt.codigo}`);
}
