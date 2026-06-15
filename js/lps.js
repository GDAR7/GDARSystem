// ══ LPS – LAST PLANNER SYSTEM ══
// Proyecto: R3 Cota 4416 – Recrecimiento Dique Relavera R3 · Buenaventura · UM Uchuchacua

const LPS_SECTORES=['Dique Principal','Mesa de Plata','Dique Intermedio','Dique Auxiliar'];
const LPS_CNC=['Prerequisitos','Materiales','Equipos','Subcontratistas','Clima','Administración'];
const LPS_COLOR='#10b981';

let _lpsTab=1;
let _lpsSemana=null;   // ISO Monday de la semana activa del lookahead
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
  else if(_lpsTab===2)_lpsRenderLookahead(c);
  else if(_lpsTab===3)_lpsRenderPlan(c);
  else _lpsRenderRestr(c);
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

  c.innerHTML=`
  <div style="display:flex;align-items:center;gap:.6rem;flex-wrap:wrap;margin-bottom:.8rem">
    <select id="lpsWbsSector" style="${_lpsCtrl()}" onchange="_lpsRenderTab()">
      <option value="">— Todos los sectores —</option>
      ${LPS_SECTORES.map(s=>`<option${sF===s?' selected':''}>${s}</option>`).join('')}
    </select>
    <input id="lpsWbsQ" placeholder="🔍 Buscar..." value="${qF}" oninput="_lpsRenderTab()" style="${_lpsCtrl()};min-width:180px">
    <button class="btn btn-a" style="--ba:${LPS_COLOR};margin-left:auto" onclick="_lpsOpenWbs(null)">＋ Nueva Actividad</button>
  </div>
  <div class="tbl-wrap"><table>
    <thead><tr><th style="width:52px"></th><th>Código</th><th>Descripción</th><th>Unidad</th><th style="text-align:right">Cant. Total</th><th>Sector</th><th></th></tr></thead>
    <tbody>${rows.length?rows.map((w,idx)=>{
      const movBtns=_btnMove(w.id,idx);
      if(w.tipo==='TITULO'){
        return`<tr style="background:rgba(16,185,129,.09)">
          <td style="display:flex;gap:3px;padding:.35rem .4rem">${movBtns}</td>
          <td class="mono" style="color:${LPS_COLOR};font-family:'Barlow Condensed',sans-serif;font-size:.82rem;letter-spacing:.05em">${w.codigo}</td>
          <td colspan="3" style="font-family:'Barlow Condensed',sans-serif;font-size:.92rem;font-weight:700;color:${LPS_COLOR};letter-spacing:.06em;text-transform:uppercase">${w.desc}</td>
          <td><span style="background:rgba(16,185,129,.15);color:#10b981;border:1px solid #10b98135;border-radius:4px;padding:1px 8px;font-size:.7rem">${w.sector||'—'}</span></td>
          <td style="white-space:nowrap"><span style="font-size:.6rem;color:#10b981;opacity:.7;margin-right:.4rem">TÍTULO</span>
              <button class="btn btn-out btn-sm" onclick="_lpsOpenWbs(${w.id})" style="color:#f59e0b;border-color:#f59e0b60">✏️</button>
              <button class="btn btn-del btn-sm" onclick="_lpsDelWbs(${w.id})" style="margin-left:.3rem">✕</button></td>
        </tr>`;
      }
      return`<tr>
        <td style="display:flex;gap:3px;padding:.35rem .4rem">${movBtns}</td>
        <td class="mono" style="color:${LPS_COLOR}">${w.codigo}</td>
        <td><strong>${w.desc}</strong></td>
        <td class="mono">${w.unidad||'—'}</td>
        <td class="mono" style="text-align:right">${fmtN(+w.cantTotal||0)}</td>
        <td><span style="background:rgba(16,185,129,.15);color:#10b981;border:1px solid #10b98135;border-radius:4px;padding:1px 8px;font-size:.7rem">${w.sector||'—'}</span></td>
        <td style="white-space:nowrap"><button class="btn btn-out btn-sm" onclick="_lpsOpenWbs(${w.id})" style="color:#f59e0b;border-color:#f59e0b60">✏️</button>
            <button class="btn btn-del btn-sm" onclick="_lpsDelWbs(${w.id})" style="margin-left:.3rem">✕</button></td>
      </tr>`;
    }).join(''):'<tr><td colspan="7" style="text-align:center;color:var(--muted2);padding:1.5rem">Sin actividades registradas</td></tr>'}</tbody>
  </table></div>`;
}

function _lpsCtrl(){return'background:var(--panel2);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:.3rem .65rem;font-size:.8rem';}

function _lpsWbsToggleTitulo(esTitulo){
  const undWrap=document.getElementById('lpsWbsUndWrap');
  const cantWrap=document.getElementById('lpsWbsCantWrap');
  if(undWrap)undWrap.style.display=esTitulo?'none':'';
  if(cantWrap)cantWrap.style.display=esTitulo?'none':'';
}

function _lpsOpenWbs(id){
  _lpsEditWbsId=id;
  const w=id?DB.lpsWbs.find(x=>x.id===id):null;
  const esTitulo=w?.tipo==='TITULO';
  document.getElementById('lpsWbsMtl').textContent=w?'✏️ Editar Actividad':'＋ Nueva Actividad';
  document.getElementById('lpsWbsCod').value=w?.codigo||'';
  document.getElementById('lpsWbsDesc').value=w?.desc||'';
  document.getElementById('lpsWbsUnd').value=w?.unidad||'m³';
  document.getElementById('lpsWbsCant').value=w?.cantTotal||'';
  document.getElementById('lpsWbsSect').value=w?.sector||'';
  const chk=document.getElementById('lpsWbsEsTitulo');
  if(chk){chk.checked=esTitulo;_lpsWbsToggleTitulo(esTitulo);}
  openM('mLpsWbs');
}

function _lpsSaveWbs(){
  const codigo=document.getElementById('lpsWbsCod').value.trim();
  const desc=document.getElementById('lpsWbsDesc').value.trim();
  const esTitulo=document.getElementById('lpsWbsEsTitulo')?.checked||false;
  const tipo=esTitulo?'TITULO':'ACTIVIDAD';
  const unidad=esTitulo?'—':document.getElementById('lpsWbsUnd').value.trim();
  const cantTotal=esTitulo?0:(+document.getElementById('lpsWbsCant').value||0);
  const sector=document.getElementById('lpsWbsSect').value;
  if(!codigo||!desc||!sector){toast('Complete código, descripción y sector',true);return;}
  if(_lpsEditWbsId){
    const w=DB.lpsWbs.find(x=>x.id===_lpsEditWbsId);
    if(w){Object.assign(w,{codigo,desc,unidad,cantTotal,sector,tipo});syncSheet('saveLpsWbs',w);}
  }else{
    const maxOrden=DB.lpsWbs.length?Math.max(...DB.lpsWbs.map(w=>w.orden||0))+10:0;
    const rec={id:nid('lpsW'),codigo,desc,unidad,cantTotal,sector,tipo,orden:maxOrden};
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
  const allDays=_lpsDaysRange(_lpsSemana,28);

  // Cabecera de columnas
  let hdrs='<th style="min-width:60px">Código</th><th style="min-width:200px">Actividad</th><th>Sector</th>';
  semanas.forEach((sw,si)=>{
    const days=_lpsDaysRange(sw,7);
    days.forEach(d=>{
      const dow=_lpsDow(d);
      const isWe=dow==='SÁB'||dow==='DOM';
      hdrs+=`<th style="font-size:.6rem;min-width:30px;padding:.2rem;text-align:center;${isWe?'background:rgba(255,255,255,.03);color:var(--muted2)':''}">
        <div>${dow}</div><div>${_lpsFmt(d)}</div>
      </th>`;
    });
    hdrs+=`<th style="font-size:.62rem;min-width:70px;text-align:center;background:rgba(16,185,129,.07);color:#10b981">Cant.<br>S${si+1}</th>`;
  });

  // Filas
  let tbodyRows='';
  if(!wbs.length){
    tbodyRows=`<tr><td colspan="100" style="text-align:center;color:var(--muted2);padding:1.5rem">Sin actividades. Agregue en la Biblioteca WBS.</td></tr>`;
  }else{
    wbs.forEach(w=>{
      let cells='';
      semanas.forEach((sw,si)=>{
        const la=_lpsGetLa(w.id,sw);
        const dias=la?.diasProg||[];
        const days=_lpsDaysRange(sw,7);
        days.forEach(d=>{
          const on=dias.includes(d);
          const dow=_lpsDow(d);
          const isWe=dow==='SÁB'||dow==='DOM';
          cells+=`<td onclick="_lpsCellToggle(${w.id},'${sw}','${d}')" style="text-align:center;cursor:pointer;padding:.15rem;${isWe?'background:rgba(255,255,255,.02)':''}">
            <div style="width:22px;height:22px;border-radius:4px;margin:auto;${on?`background:${LPS_COLOR}`:' background:rgba(255,255,255,.05);border:1px solid var(--border)'}"></div>
          </td>`;
        });
        cells+=`<td style="background:rgba(16,185,129,.04);padding:.2rem .3rem">
          <input type="number" min="0" step="0.1" value="${la?.cantSemana||''}"
            placeholder="0" oninput="_lpsCantSem(${w.id},'${sw}',+this.value)"
            style="width:65px;background:transparent;border:1px solid var(--border);border-radius:4px;color:var(--text);text-align:right;padding:.2rem .3rem;font-size:.75rem">
        </td>`;
      });
      tbodyRows+=`<tr>
        <td class="mono" style="color:${LPS_COLOR};font-size:.72rem">${w.codigo}</td>
        <td style="font-size:.78rem"><strong>${w.desc}</strong></td>
        <td><span style="font-size:.65rem;color:var(--muted2)">${w.sector}</span></td>
        ${cells}
      </tr>`;
    });
  }

  c.innerHTML=`
  <div style="display:flex;align-items:center;gap:.6rem;flex-wrap:wrap;margin-bottom:.8rem">
    <select id="lpsLaSector" style="${_lpsCtrl()}" onchange="_lpsRenderTab()">
      <option value="">— Todos los sectores —</option>
      ${LPS_SECTORES.map(s=>`<option${sF===s?' selected':''}>${s}</option>`).join('')}
    </select>
    <span style="font-size:.78rem;color:var(--muted2)">Semana activa desde:</span>
    <strong style="color:${LPS_COLOR};font-size:.85rem">${_lpsFmtSem(_lpsSemana)}</strong>
    <button class="btn btn-a" style="--ba:#f59e0b;margin-left:auto" onclick="_lpsRodarSemana()">▶ Rodar Semana</button>
  </div>
  <div class="tbl-wrap" style="overflow-x:auto"><table style="white-space:nowrap">
    <thead><tr>${hdrs}</tr></thead>
    <tbody>${tbodyRows}</tbody>
  </table></div>`;
}

function _lpsGetLa(wbsId,semanaInicio){
  return (DB.lpsLookahead||[]).find(r=>r.wbsId===wbsId&&r.semanaInicio===semanaInicio);
}

function _lpsCellToggle(wbsId,semanaInicio,fecha){
  let la=_lpsGetLa(wbsId,semanaInicio);
  if(la){
    const idx=la.diasProg.indexOf(fecha);
    if(idx>-1)la.diasProg.splice(idx,1);else la.diasProg.push(fecha);
    syncSheet('saveLpsLookahead',la);
  }else{
    la={id:nid('lpsL'),wbsId,semanaInicio,diasProg:[fecha],cantSemana:0};
    DB.lpsLookahead.push(la);syncSheet('saveLpsLookahead',la);
  }
  _lpsRenderTab();
}

function _lpsCantSem(wbsId,semanaInicio,val){
  let la=_lpsGetLa(wbsId,semanaInicio);
  if(la){la.cantSemana=val;syncSheet('saveLpsLookahead',la);}
  else{la={id:nid('lpsL'),wbsId,semanaInicio,diasProg:[],cantSemana:val};DB.lpsLookahead.push(la);syncSheet('saveLpsLookahead',la);}
}

function _lpsRodarSemana(){
  if(!confirm(`¿Rodar semana? La semana activa pasará a ${_lpsFmtSem(_lpsAddDays(_lpsSemana,7))}`))return;
  _lpsSemana=_lpsAddDays(_lpsSemana,7);
  localStorage.setItem('_lpsSemana',_lpsSemana);
  _lpsRenderTab();toast('✓ Semana rodada');
}

function _lpsFmtSem(iso){
  return `${_lpsFmt(iso)} – ${_lpsFmt(_lpsAddDays(iso,6))}`;
}

// ══════════════════════════════════════════════════════════════════════════════
// VISTA 3 – PLAN SEMANAL + PPC
// ══════════════════════════════════════════════════════════════════════════════
function _lpsRenderPlan(c){
  const semFin=_lpsAddDays(_lpsSemana,6);
  const planes=(DB.lpsPlanSemanal||[]).filter(p=>p.semanaInicio===_lpsSemana);
  // Actividades con lookahead en esta semana
  const laActivos=(DB.lpsLookahead||[]).filter(r=>r.semanaInicio===_lpsSemana&&(r.diasProg||[]).length>0);
  const wbsEnSemana=[...new Set(laActivos.map(r=>r.wbsId))].map(id=>DB.lpsWbs?.find(w=>w.id===id)).filter(w=>w&&w.tipo!=='TITULO');

  const total=planes.length;
  const cumplidas=planes.filter(p=>p.cumplido==='S').length;
  const ppc=total?Math.round(cumplidas/total*100):0;
  const ppcCol=ppc>=80?'#10b981':ppc>=60?'#f59e0b':'#ef4444';

  const respOpts=USERS.map(u=>`<option>${u.nombre}</option>`).join('');

  c.innerHTML=`
  <div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap;margin-bottom:.8rem">
    <div>
      <span style="font-size:.7rem;color:var(--muted2)">SEMANA ACTIVA</span>
      <div style="font-size:.95rem;font-weight:700;color:${LPS_COLOR}">${_lpsFmtSem(_lpsSemana)}</div>
    </div>
    <div style="display:flex;align-items:center;gap:.5rem;background:var(--panel2);border:1px solid var(--border);border-radius:8px;padding:.4rem .9rem">
      <span style="font-size:.7rem;color:var(--muted2)">PPC</span>
      <span style="font-size:1.6rem;font-weight:800;color:${ppcCol}">${ppc}%</span>
      <span style="font-size:.72rem;color:var(--muted2)">${cumplidas}/${total}</span>
    </div>
    <button class="btn btn-a" style="--ba:${LPS_COLOR};margin-left:auto" onclick="_lpsSincPlan()">⟳ Sincronizar Lookahead</button>
    <button class="btn btn-out" style="color:#ef4444;border-color:#ef444460" onclick="_lpsCerrarSemana()">✓ Cerrar Semana</button>
  </div>
  <div class="tbl-wrap"><table>
    <thead><tr><th>Código</th><th>Actividad</th><th>Sector</th><th>Responsable</th><th style="text-align:right">Programado</th><th style="text-align:right">Ejecutado</th><th style="text-align:center">Cumplido</th></tr></thead>
    <tbody id="lpsPlanBody">
    ${planes.length?planes.map(p=>{
      const w=DB.lpsWbs?.find(x=>x.id===p.wbsId);
      return`<tr>
        <td class="mono" style="color:${LPS_COLOR};font-size:.72rem">${w?.codigo||'—'}</td>
        <td style="font-size:.78rem">${w?.desc||'—'}</td>
        <td style="font-size:.68rem;color:var(--muted2)">${w?.sector||'—'}</td>
        <td><select onchange="_lpsPlanUpd(${p.id},'responsable',this.value)" style="${_lpsCtrl()};max-width:180px">${USERS.map(u=>`<option${p.responsable===u.nombre?' selected':''}>${u.nombre}</option>`).join('')}</select></td>
        <td><input type="number" value="${p.programado||0}" min="0" step="0.1" oninput="_lpsPlanUpd(${p.id},'programado',+this.value)" style="${_lpsCtrl()};width:80px;text-align:right"></td>
        <td><input type="number" value="${p.ejecutado||0}" min="0" step="0.1" oninput="_lpsPlanUpd(${p.id},'ejecutado',+this.value)" style="${_lpsCtrl()};width:80px;text-align:right"></td>
        <td style="text-align:center">
          <button onclick="_lpsPlanToggle(${p.id})" style="background:${p.cumplido==='S'?'rgba(16,185,129,.2)':'rgba(239,68,68,.15)'};color:${p.cumplido==='S'?'#10b981':'#ef4444'};border:1px solid ${p.cumplido==='S'?'#10b98140':'#ef444440'};border-radius:6px;padding:.2rem .7rem;font-size:.75rem;font-weight:700;cursor:pointer">
            ${p.cumplido==='S'?'✓ Sí':'✗ No'}
          </button>
        </td>
      </tr>`;
    }).join(''):`<tr><td colspan="7" style="text-align:center;color:var(--muted2);padding:1.5rem">Sin actividades en el plan. Use "Sincronizar Lookahead".</td></tr>`}
    </tbody>
  </table></div>`;
}

function _lpsSincPlan(){
  const laActivos=(DB.lpsLookahead||[]).filter(r=>r.semanaInicio===_lpsSemana&&(r.diasProg||[]).length>0);
  let added=0;
  laActivos.forEach(la=>{
    const exists=(DB.lpsPlanSemanal||[]).find(p=>p.semanaInicio===_lpsSemana&&p.wbsId===la.wbsId);
    if(!exists){
      const rec={id:nid('lpsP'),semanaInicio:_lpsSemana,wbsId:la.wbsId,responsable:'',programado:la.cantSemana||0,ejecutado:0,cumplido:'N',cncCategoria:'',cncDesc:''};
      DB.lpsPlanSemanal.push(rec);syncSheet('saveLpsPlan',rec);added++;
    }
  });
  _lpsRenderTab();toast(added?`✓ ${added} actividad(es) sincronizadas`:'Sin nuevas actividades en lookahead');
}

function _lpsPlanUpd(id,campo,val){
  const p=(DB.lpsPlanSemanal||[]).find(x=>x.id===id);
  if(p){p[campo]=val;syncSheet('saveLpsPlan',p);}
}

function _lpsPlanToggle(id){
  const p=(DB.lpsPlanSemanal||[]).find(x=>x.id===id);
  if(p){p.cumplido=p.cumplido==='S'?'N':'S';syncSheet('saveLpsPlan',p);_lpsRenderTab();}
}

function _lpsCerrarSemana(){
  const incump=(DB.lpsPlanSemanal||[]).filter(p=>p.semanaInicio===_lpsSemana&&p.cumplido!=='S');
  if(!incump.length){toast('✓ Todas las actividades cumplidas');return;}
  // Modal CNC
  document.getElementById('lpsCncBody').innerHTML=incump.map(p=>{
    const w=DB.lpsWbs?.find(x=>x.id===p.wbsId);
    return`<tr>
      <td style="font-size:.78rem">${w?.codigo||'?'} – ${w?.desc||'?'}</td>
      <td><select id="cnc_cat_${p.id}" style="${_lpsCtrl()}">
        ${LPS_CNC.map(c=>`<option>${c}</option>`).join('')}
      </select></td>
      <td><input id="cnc_desc_${p.id}" placeholder="Descripción breve..." style="${_lpsCtrl()};width:200px"></td>
    </tr>`;
  }).join('');
  openM('mLpsCnc');
}

function _lpsGuardarCnc(){
  const incump=(DB.lpsPlanSemanal||[]).filter(p=>p.semanaInicio===_lpsSemana&&p.cumplido!=='S');
  incump.forEach(p=>{
    p.cncCategoria=document.getElementById('cnc_cat_'+p.id)?.value||'';
    p.cncDesc=document.getElementById('cnc_desc_'+p.id)?.value||'';
    syncSheet('saveLpsPlan',p);
  });
  closeM('mLpsCnc');
  toast(`✓ CNC registradas para ${incump.length} actividad(es)`);
  _lpsRenderTab();
}

// ══════════════════════════════════════════════════════════════════════════════
// VISTA 4 – PANEL DE RESTRICCIONES
// ══════════════════════════════════════════════════════════════════════════════
function _lpsRenderRestr(c){
  const hoy=today();
  const restr=(DB.lpsRestricciones||[]).sort((a,b)=>a.fechaLimite.localeCompare(b.fechaLimite));
  const abiertas=restr.filter(r=>r.estado==='ABIERTA');
  const cerradas=restr.filter(r=>r.estado==='CERRADA');

  function _restrRow(r){
    const d=new Date(hoy+'T12:00:00');
    const lim=new Date(r.fechaLimite+'T12:00:00');
    const dias=Math.round((lim-d)/(1000*60*60*24));
    const w=DB.lpsWbs?.find(x=>x.id===r.wbsId);
    const alert=r.estado==='ABIERTA'&&dias<=3;
    const alertStyle=alert?`background:rgba(239,68,68,.08);border-left:3px solid #ef4444`:'';
    let diasBadge='';
    if(r.estado==='ABIERTA'){
      if(dias<0)diasBadge=`<span style="background:rgba(239,68,68,.2);color:#ef4444;border:1px solid #ef444440;border-radius:4px;padding:1px 7px;font-size:.68rem;font-weight:700">Vencida ${Math.abs(dias)}d</span>`;
      else if(dias<=3)diasBadge=`<span style="background:rgba(245,158,11,.2);color:#f59e0b;border:1px solid #f59e0b40;border-radius:4px;padding:1px 7px;font-size:.68rem;font-weight:700">⚠ ${dias}d</span>`;
      else diasBadge=`<span style="color:var(--muted2);font-size:.72rem">${dias}d</span>`;
    }
    return`<tr style="${alertStyle}">
      <td style="font-size:.78rem">${r.desc}</td>
      <td style="font-size:.78rem">${r.responsable}</td>
      <td class="mono">${r.fechaLimite} ${diasBadge}</td>
      <td style="font-size:.73rem;color:var(--muted2)">${w?w.codigo+' – '+w.desc.slice(0,30):'—'}</td>
      <td><span style="background:${r.estado==='ABIERTA'?'rgba(239,68,68,.15)':'rgba(16,185,129,.15)'};color:${r.estado==='ABIERTA'?'#ef4444':'#10b981'};border:1px solid ${r.estado==='ABIERTA'?'#ef444430':'#10b98130'};border-radius:4px;padding:1px 8px;font-size:.68rem;font-weight:700">${r.estado}</span></td>
      <td>
        ${r.estado==='ABIERTA'?`<button class="btn btn-sm" onclick="_lpsRestrCerrar(${r.id})" style="background:rgba(16,185,129,.15);color:#10b981;border:1px solid #10b98140;font-size:.7rem">✓ Cerrar</button>`:''}
        <button class="btn btn-out btn-sm" onclick="_lpsOpenRestr(${r.id})" style="color:#f59e0b;border-color:#f59e0b60;margin-left:.2rem">✏️</button>
        <button class="btn btn-del btn-sm" onclick="_lpsDelRestr(${r.id})" style="margin-left:.2rem">✕</button>
      </td>
    </tr>`;
  }

  const venc=abiertas.filter(r=>{ const d=Math.round((new Date(r.fechaLimite+'T12:00:00')-new Date(hoy+'T12:00:00'))/(1000*60*60*24));return d<=3;});

  c.innerHTML=`
  ${venc.length?`<div style="background:rgba(239,68,68,.1);border:1px solid #ef444430;border-radius:8px;padding:.5rem .9rem;margin-bottom:.8rem;font-size:.8rem;color:#ef4444">
    ⚠ <strong>${venc.length}</strong> restricción(es) próxima(s) a vencer o vencidas
  </div>`:''}
  <div style="display:flex;justify-content:flex-end;margin-bottom:.8rem">
    <button class="btn btn-a" style="--ba:${LPS_COLOR}" onclick="_lpsOpenRestr(null)">＋ Nueva Restricción</button>
  </div>
  <div class="tbl-wrap"><table>
    <thead><tr><th>Descripción</th><th>Responsable</th><th>Fecha Límite</th><th>Actividad que bloquea</th><th>Estado</th><th></th></tr></thead>
    <tbody>
      ${abiertas.length?abiertas.map(_restrRow).join(''):`<tr><td colspan="6" style="text-align:center;color:var(--muted2);padding:1rem">Sin restricciones abiertas</td></tr>`}
      ${cerradas.length?`<tr><td colspan="6" style="background:rgba(255,255,255,.02);font-size:.65rem;letter-spacing:.1em;color:var(--muted2);padding:.3rem .6rem;text-transform:uppercase">Cerradas (${cerradas.length})</td></tr>`+cerradas.map(_restrRow).join(''):''}
    </tbody>
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
  document.getElementById('lpsRestrWbs').value=r?.wbsId||'';
  document.getElementById('lpsRestrWbs').innerHTML='<option value="">— Sin actividad específica —</option>'+(DB.lpsWbs||[]).map(w=>`<option value="${w.id}"${r?.wbsId===w.id?' selected':''}>${w.codigo} – ${w.desc.slice(0,40)}</option>`).join('');
  document.getElementById('lpsRestrEst').value=r?.estado||'ABIERTA';
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
