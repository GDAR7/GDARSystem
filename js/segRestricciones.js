// ══════════════════════════════════════════════════════════════════════════
//  SEGUIMIENTO DE RESTRICCIONES DEL LPS — pestaña de Seguimiento General
//  Mismo modelo que la hoja «Seguimiento de restricciones del LPS»: N°,
//  restricción, actividad afectada, tipo, responsable, detección, compromiso,
//  estado, acciones, fecha real, reprogramaciones e impacto.
//
//  Se guardan en la tabla «seguimiento_tareas» (DB.seguimiento) con esRestriccion=true (ver
//  sql/seguimiento_restricciones.sql). El Tablero y las otras pestañas las
//  ignoran.
//
//  Antigüedad, días de atraso y «vencida» se calculan contra la fecha de corte:
//  hoy, o el último día del mes elegido si ese mes ya pasó.
//  El filtro de mes muestra las restricciones VIVAS en ese mes: detectadas
//  hasta fin de mes y no levantadas antes de que empezara.
// ══════════════════════════════════════════════════════════════════════════

const _SR_EST=['Abierta','En gestión','Levantada'];
const _SR_EST_COL={'Abierta':'#ef4444','En gestión':'#f59e0b','Levantada':'#10b981'};
const _SR_TIPOS=['Interna','Externa','Cliente','Sponsor','Proveedor'];
const _SR_TIPO_COL={Interna:'#06b6d4',Externa:'#3b82f6',Cliente:'#ec4899',Sponsor:'#a855f7',Proveedor:'#64748b'};
const _SR_IMP=[['Alta','Alto'],['Media','Medio'],['Baja','Bajo']];        // guardado en «prioridad»
const _SR_IMP_COL={Alta:'#ef4444',Media:'#f59e0b',Baja:'#10b981'};
const _SR_MES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','setiembre','octubre','noviembre','diciembre'];

let _srMes='';             // 'AAAA-MM' o '' = todas
let _srEst='',_srTipo='',_srImp='',_srQ='';
let _srOrden='atraso',_srDesc=true;
let _srAbierta=null;       // id de la fila desplegada
let _srEditId=null;

function _srEsc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function _srDias(a,b){return Math.round((new Date(b+'T12:00:00')-new Date(a+'T12:00:00'))/864e5);}
function _srDMY(f){const p=String(f||'').slice(0,10).split('-');return p.length===3?p[2]+'/'+p[1]+'/'+p[0]:'—';}
function _srImpLbl(p){return (_SR_IMP.find(x=>x[0]===p)||['','—'])[1];}
function _srFinMes(m){const [y,mm]=m.split('-').map(Number);const d=new Date(Date.UTC(y,mm,0));return d.toISOString().slice(0,10);}
function _srMesNombre(m){const [y,mm]=m.split('-').map(Number);return _SR_MES[mm-1]+' '+y;}

function _srTodas(){return (DB.seguimiento||[]).filter(t=>t.esRestriccion);}
function _srCorte(){
  const hoy=today();
  if(!_srMes)return hoy;
  const fin=_srFinMes(_srMes);
  return fin<hoy?fin:hoy;
}
// Una restricción con sus cálculos al corte
function _srCalc(t,corte){
  const det=String(t.fecha||'').slice(0,10),comp=String(t.fechaProm||'').slice(0,10),real=String(t.fechaComp||'').slice(0,10);
  const est=_SR_EST.includes(t.est)?t.est:'Abierta';
  const lev=est==='Levantada';
  const cierre=lev&&real?real:corte;
  const edad=det?Math.max(0,_srDias(det,cierre)):null;
  const atraso=comp?_srDias(comp,cierre):null;
  return{t,det,comp,real,est,lev,edad,atraso,
    vencida:!lev&&atraso!=null&&atraso>0,
    porVencer:!lev&&atraso!=null&&atraso<=0&&atraso>=-3,
    reprog:+t.reprog||0};
}
// ¿Estuvo viva en el mes? Detectada hasta fin de mes y no levantada antes de que empezara
function _srEnMes(r,m){
  if(!m)return true;
  const ini=m+'-01',fin=_srFinMes(m);
  if(r.det&&r.det>fin)return false;
  if(r.lev&&r.real&&r.real<ini)return false;
  return true;
}
function _srMeses(lista){
  const hoy=today().slice(0,7);
  const dets=lista.map(r=>r.det.slice(0,7)).filter(Boolean).sort();
  if(!dets.length)return [hoy];
  const out=[];let [y,m]=dets[0].split('-').map(Number);
  for(;;){const k=y+'-'+String(m).padStart(2,'0');out.push(k);if(k>=hoy)break;m++;if(m>12){m=1;y++;}}
  return out.reverse();
}

function _srDatos(){
  const corte=_srCorte();
  const base=_srTodas().map(t=>_srCalc(t,corte)).filter(r=>_srEnMes(r,_srMes));
  const q=_srQ.trim().toLowerCase();
  const vista=base.filter(r=>(!_srEst||r.est===_srEst)&&(!_srTipo||r.t.tipoRestr===_srTipo)&&(!_srImp||r.t.prioridad===_srImp)&&
    (!q||[r.t.numero,r.t.titulo,r.t.actividad,r.t.responsable,r.t.restriccion,r.t.restriccionDet,r.t.tipoRestr].join(' ').toLowerCase().includes(q)));
  const key={n:r=>+r.t.numero||0,titulo:r=>String(r.t.titulo||''),tipo:r=>String(r.t.tipoRestr||''),resp:r=>String(r.t.responsable||''),
    det:r=>r.det,comp:r=>r.comp,edad:r=>r.edad??-1,estado:r=>_SR_EST.indexOf(r.est),
    impacto:r=>['Alta','Media','Baja'].indexOf(r.t.prioridad),atraso:r=>r.lev?-9999:(r.atraso??-9998)}[_srOrden]||(r=>+r.t.numero||0);
  vista.sort((a,b)=>{const x=key(a),y=key(b);const c=typeof x==='string'?x.localeCompare(y,'es',{numeric:true}):x-y;return (_srDesc?-c:c)||((+b.t.numero||0)-(+a.t.numero||0));});
  return{corte,base,vista};
}

function _srSet(k,v){
  if(k==='mes')_srMes=v;else if(k==='est')_srEst=_srEst===v?'':v;else if(k==='tipo')_srTipo=_srTipo===v?'':v;else if(k==='imp')_srImp=_srImp===v?'':v;
  _srAbierta=null;_segRender();
}
function _srOrdenar(k){if(_srOrden===k)_srDesc=!_srDesc;else{_srOrden=k;_srDesc=!['titulo','tipo','resp'].includes(k);}_segRender();}
function _srToggle(id){_srAbierta=_srAbierta===id?null:id;_segRender();}
let _srQTimer=null;
function _srBuscar(v){_srQ=v;clearTimeout(_srQTimer);_srQTimer=setTimeout(()=>{_segRender();const el=document.getElementById('srQ');if(el){el.focus();el.setSelectionRange(v.length,v.length);}},250);}

// ── Pintado ──────────────────────────────────────────────────────────────
function _srKpi(l,v,c,sub){
  return `<div style="flex:1 1 130px;background:var(--panel2);border:1px solid ${c};border-radius:8px;padding:.55rem .75rem">
    <div style="font-size:.6rem;color:var(--muted2);text-transform:uppercase;letter-spacing:.07em;font-weight:700">${l}</div>
    <div style="font-size:1.35rem;font-weight:800;color:${c};font-variant-numeric:tabular-nums;line-height:1.2">${v}</div>
    ${sub?`<div style="font-size:.64rem;color:var(--muted2)">${sub}</div>`:''}</div>`;
}
function _srBarras(grupos,base){
  const max=Math.max(1,...grupos.map(([,f])=>base.filter(f).length));
  return grupos.map(([lbl,f,col])=>{
    const g=base.filter(f);
    return `<div style="display:flex;align-items:center;gap:.55rem;margin-bottom:.4rem">
      <span style="font-size:.72rem;min-width:110px;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:${col||'var(--text)'};font-weight:600" title="${_srEsc(lbl)}">${_srEsc(lbl)}</span>
      <span style="flex:1;height:14px;display:flex;gap:1px;background:var(--panel2);border-radius:3px;overflow:hidden">
        ${_SR_EST.map(e=>{const n=g.filter(r=>r.est===e).length;return n?`<i style="flex:${n};background:${_SR_EST_COL[e]}" title="${e}: ${n}"></i>`:'';}).join('')}
        ${g.length<max?`<i style="flex:${max-g.length}"></i>`:''}
      </span>
      <b style="font-size:.72rem;min-width:22px;text-align:right">${g.length}</b></div>`;
  }).join('')||'<div style="font-size:.72rem;color:var(--muted2)">Sin datos.</div>';
}
function _srChipEstado(r){
  const c=(txt,col,solid)=>`<span style="display:inline-block;font-size:.66rem;font-weight:800;padding:2px 7px;border-radius:4px;white-space:nowrap;${solid?`background:${col};color:#fff`:`color:${col};background:${col}22;border:1px solid ${col}55`}">${txt}</span>`;
  if(r.lev)return c('Levantada','#10b981');
  if(r.vencida)return c('Vencida '+r.atraso+' d','#b91c1c',true);
  if(r.porVencer)return c(r.atraso===0?'Vence hoy':'Vence en '+(-r.atraso)+' d','#f59e0b');
  return c(r.est,_SR_EST_COL[r.est]);
}

function _srRender(body){
  const {corte,base,vista}=_srDatos();
  const todas=_srTodas().map(t=>_srCalc(t,corte));
  const meses=_srMeses(todas);
  if(_srMes&&!meses.includes(_srMes))meses.unshift(_srMes);
  const cnt=e=>base.filter(r=>r.est===e).length;
  const vivas=base.filter(r=>!r.lev);
  const edadProm=vivas.length?vivas.reduce((s,r)=>s+(r.edad||0),0)/vivas.length:0;
  const lev=cnt('Levantada');
  const sel=(on,col)=>`border:1.5px solid ${on?col:'var(--border)'};background:${on?col+'2e':'var(--panel2)'};color:${on?col:'var(--text)'}`;
  const chip=(k,v,txt,n,col)=>`<button onclick="_srSet('${k}','${v}')" style="display:inline-flex;align-items:center;gap:.35rem;padding:.28rem .7rem;border-radius:16px;cursor:pointer;font-size:.73rem;font-weight:700;${sel(({est:_srEst,tipo:_srTipo,imp:_srImp})[k]===v,col)}">${txt}${n!=null?` <span style="font-family:monospace;font-size:.64rem;opacity:.75">${n}</span>`:''}</button>`;
  const rot=t=>`<span style="font-size:.62rem;color:var(--muted2);text-transform:uppercase;letter-spacing:.07em;font-weight:700">${t}</span>`;

  let h=`<div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;margin-bottom:.8rem;padding:.45rem .7rem;background:var(--panel2);border:1px solid var(--border);border-radius:8px">
    ${rot('Mes')}
    <select onchange="_srSet('mes',this.value)" style="width:auto;min-width:150px;font-size:.76rem;padding:.25rem .5rem">
      <option value="">— Todos los meses —</option>
      ${meses.map(m=>`<option value="${m}" ${m===_srMes?'selected':''}>${_srMesNombre(m)}</option>`).join('')}
    </select>
    <span style="font-size:.7rem;color:var(--muted2)">corte al <b style="color:var(--text)">${_srDMY(corte)}</b> · ${base.length} restricciones${_srMes?' vivas en el mes':''}</span>
    <button onclick="exportSegRestrXLSX()" style="margin-left:auto;background:#166534;color:#fff;border:none;border-radius:7px;padding:.36rem .9rem;font-size:.78rem;font-weight:700;cursor:pointer">📊 Excel</button>
    <button class="btn btn-a" style="--ba:var(--ctl)" onclick="_srNueva()">＋ Nueva Restricción</button>
  </div>
  <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:.9rem">
    ${_srKpi('Abiertas',cnt('Abierta'),'#ef4444')}
    ${_srKpi('En gestión',cnt('En gestión'),'#f59e0b')}
    ${_srKpi('Vencidas',base.filter(r=>r.vencida).length,'#b91c1c','compromiso pasado')}
    ${_srKpi('Levantadas',lev,'#10b981')}
    ${_srKpi('% Liberación',base.length?Math.round(100*lev/base.length)+'%':'—','#10b981','levantadas ÷ total')}
    ${_srKpi('Antigüedad prom.',vivas.length?edadProm.toFixed(0)+' d':'—','#06b6d4','de las no levantadas')}
    ${_srKpi('Impacto alto abierto',vivas.filter(r=>r.t.prioridad==='Alta').length,'#ef4444')}
  </div>`;

  const resps=[...new Set(base.map(r=>String(r.t.responsable||'').trim()||'(sin responsable)'))].sort((a,b)=>a.localeCompare(b,'es'));
  const ley=`<div style="display:flex;gap:.8rem;flex-wrap:wrap;margin-top:.5rem;font-size:.66rem;color:var(--muted2)">${_SR_EST.map(e=>`<span><i style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${_SR_EST_COL[e]};margin-right:3px"></i>${e}</span>`).join('')}</div>`;
  h+=`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:.8rem;margin-bottom:.9rem">
    <div class="card" style="padding:.8rem 1rem;border:1px solid #3b82f6"><div style="font-size:.66rem;font-weight:800;color:#3b82f6;text-transform:uppercase;letter-spacing:.07em;margin-bottom:.6rem">Por tipo de restricción</div>
      ${_srBarras(_SR_TIPOS.filter(t=>base.some(r=>r.t.tipoRestr===t)).map(t=>[t,r=>r.t.tipoRestr===t,_SR_TIPO_COL[t]]),base)}${ley}</div>
    <div class="card" style="padding:.8rem 1rem;border:1px solid #a855f7"><div style="font-size:.66rem;font-weight:800;color:#a855f7;text-transform:uppercase;letter-spacing:.07em;margin-bottom:.6rem">Carga por responsable</div>
      ${_srBarras(resps.map(p=>[p,r=>(String(r.t.responsable||'').trim()||'(sin responsable)')===p]),base)}</div>
  </div>
  <div style="display:flex;flex-wrap:wrap;gap:.4rem;align-items:center;margin-bottom:.45rem">
    ${rot('Estado')} ${_SR_EST.map(e=>chip('est',e,e,cnt(e),_SR_EST_COL[e])).join('')}
    <span style="width:.6rem"></span>${rot('Tipo')} ${_SR_TIPOS.filter(t=>base.some(r=>r.t.tipoRestr===t)).map(t=>chip('tipo',t,t,base.filter(r=>r.t.tipoRestr===t).length,_SR_TIPO_COL[t])).join('')}
    <span style="width:.6rem"></span>${rot('Impacto')} ${_SR_IMP.map(([v,l])=>chip('imp',v,l,base.filter(r=>r.t.prioridad===v).length,_SR_IMP_COL[v])).join('')}
  </div>
  <input id="srQ" type="search" value="${_srEsc(_srQ)}" oninput="_srBuscar(this.value)" placeholder="Buscar restricción, actividad, responsable o comentario…" style="width:100%;margin-bottom:.7rem;background:var(--panel2);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:.38rem .65rem;font-size:.78rem">`;

  const th=(k,t,x)=>`<th onclick="_srOrdenar('${k}')" style="cursor:pointer;white-space:nowrap;${x||''};color:${_srOrden===k?'var(--ctl)':''}">${t}${_srOrden===k?(_srDesc?' ▼':' ▲'):''}</th>`;
  const filas=vista.map(r=>{
    const t=r.t,ab=_srAbierta===t.id,ic=_SR_IMP_COL[t.prioridad]||'#64748b',tc=_SR_TIPO_COL[t.tipoRestr]||'#64748b';
    let f=`<tr onclick="_srToggle(${t.id})" style="cursor:pointer;${ab?'background:var(--panel2)':''}">
      <td style="font-family:monospace;color:var(--muted2);font-weight:700">${t.numero!=null&&t.numero!==''?String(t.numero).padStart(2,'0'):'—'}</td>
      <td><div style="font-weight:700;font-size:.8rem">${_srEsc(t.titulo||'(sin título)')}</div><div style="font-size:.67rem;color:var(--muted2)">${_srEsc(t.actividad||'')}</div></td>
      <td>${t.tipoRestr?`<span style="font-size:.62rem;font-weight:800;text-transform:uppercase;letter-spacing:.05em;padding:2px 7px;border-radius:4px;background:${tc};color:#fff">${_srEsc(t.tipoRestr)}</span>`:'—'}</td>
      <td style="font-size:.72rem">${_srEsc(t.responsable||'—')}</td>
      <td style="font-family:monospace;font-size:.72rem;white-space:nowrap">${_srDMY(r.det)}</td>
      <td style="font-family:monospace;font-size:.72rem;white-space:nowrap;${r.vencida?'color:#ef4444;font-weight:700':''}">${_srDMY(r.comp)}</td>
      <td style="font-family:monospace;font-size:.72rem;white-space:nowrap">${r.edad!=null?'<b>'+r.edad+'</b> d':'—'}</td>
      <td>${_srChipEstado(r)}${r.reprog?` <span title="Reprogramaciones" style="font-size:.64rem;color:${r.reprog>=2?'#ef4444':'#f59e0b'};font-weight:800">↻${r.reprog}</span>`:''}</td>
      <td style="white-space:nowrap;font-size:.72rem"><i style="display:inline-block;width:6px;height:14px;border-radius:1px;background:${ic};vertical-align:middle;margin-right:4px"></i>${_srImpLbl(t.prioridad)}</td>
    </tr>`;
    if(ab)f+=_srDetalle(r,corte);
    return f;
  }).join('');
  h+=`<div class="card" style="padding:0"><div class="tbl-wrap"><table style="font-size:.76rem;min-width:980px">
    <thead><tr>${th('n','N°')}${th('titulo','Restricción / actividad afectada')}${th('tipo','Tipo')}${th('resp','Responsable')}${th('det','Detección')}${th('comp','Compromiso')}${th('edad','Antigüedad')}${th('estado','Estado')}${th('impacto','Impacto')}</tr></thead>
    <tbody>${filas||`<tr><td colspan="9" style="text-align:center;padding:2rem;color:var(--muted2)">${_srTodas().length?'Sin restricciones con estos filtros.':'Aún no hay restricciones. Usa «＋ Nueva Restricción».'}</td></tr>`}</tbody>
  </table></div></div>`;
  body.innerHTML=h;
}

// Fila desplegada: acciones, línea de tiempo, trazabilidad y avisos
function _srDetalle(r,corte){
  const t=r.t;
  const plazo=r.det&&r.comp?Math.max(1,_srDias(r.det,r.comp)):null;
  let barra='';
  if(plazo&&r.edad!=null){
    const tot=Math.max(plazo,r.edad);
    const col=r.lev?'#10b981':r.vencida?'#b91c1c':'#f59e0b';
    barra=`<div style="margin-top:.7rem">
      <div style="position:relative;height:9px;background:var(--panel);border:1px solid var(--border);border-radius:5px;overflow:hidden">
        <i style="position:absolute;left:0;top:0;bottom:0;width:${(100*plazo/tot).toFixed(1)}%;background:${(_SR_IMP_COL[t.prioridad]||'#64748b')}40"></i>
        <i style="position:absolute;left:0;top:3px;height:3px;width:${(100*r.edad/tot).toFixed(1)}%;background:${col}"></i>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:.62rem;color:var(--muted2);margin-top:3px;font-family:monospace">
        <span>Detección ${_srDMY(r.det)}</span><span>Compromiso ${_srDMY(r.comp)}</span><span>${r.lev&&r.real?'Levantada '+_srDMY(r.real):'Corte '+_srDMY(corte)}</span></div></div>`;
  }
  let aviso='';
  if(!r.lev&&r.real)aviso=`Inconsistencia: tiene fecha real de levantamiento pero sigue «${r.est}». Pásala a Levantada o borra la fecha.`;
  else if(r.lev&&!r.real)aviso='Está Levantada pero sin fecha real de levantamiento.';
  else if(r.vencida&&r.reprog>=2)aviso=`Escalar: ${r.reprog} reprogramaciones y ${r.atraso} días de atraso. Corresponde elevar a Residencia / Gerencia en la reunión semanal.`;
  else if(r.vencida)aviso=`Compromiso vencido hace ${r.atraso} días. Definir nueva fecha (se registra la reprogramación).`;
  const kv=(l,v,c)=>`<div style="background:var(--panel);border:1px solid var(--border);border-radius:6px;padding:.4rem .55rem"><div style="font-size:.56rem;color:var(--muted2);text-transform:uppercase;letter-spacing:.07em;font-weight:700">${l}</div><div style="font-size:.78rem;font-weight:700;font-family:monospace;color:${c||'var(--text)'}">${v}</div></div>`;
  return `<tr style="background:var(--panel2)"><td colspan="9" style="padding:.8rem 1rem 1rem">
    <div style="display:grid;grid-template-columns:minmax(0,1.9fr) minmax(0,1fr);gap:1rem">
      <div>
        <div style="font-size:.6rem;color:var(--muted2);text-transform:uppercase;letter-spacing:.08em;font-weight:800;margin-bottom:.3rem">Acciones y comentarios</div>
        <div style="font-size:.8rem;line-height:1.6;white-space:pre-line;max-width:75ch">${_srEsc(t.restriccionDet||'— sin comentarios —')}</div>
        ${barra}
        ${aviso?`<div style="margin-top:.6rem;border-left:3px solid #f59e0b;background:rgba(245,158,11,.1);padding:.45rem .65rem;font-size:.74rem">${aviso}</div>`:''}
      </div>
      <div>
        <div style="font-size:.6rem;color:var(--muted2);text-transform:uppercase;letter-spacing:.08em;font-weight:800;margin-bottom:.3rem">Trazabilidad</div>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:.4rem">
          ${kv('Causa raíz',_srEsc(t.restriccion||'—'))}
          ${kv('Reprogramaciones',r.reprog,r.reprog>=2?'#ef4444':null)}
          ${kv('Días de atraso',r.atraso!=null&&r.atraso>0?'+'+r.atraso:'—',r.atraso>0&&!r.lev?'#ef4444':null)}
          ${kv('Fecha real',r.real?_srDMY(r.real):'pendiente')}
          ${kv('Antigüedad',r.edad!=null?r.edad+' días':'—')}
          ${kv('Plazo pactado',plazo?plazo+' días':'—')}
        </div>
        <div style="display:flex;gap:.4rem;margin-top:.6rem">
          <button class="btn btn-out btn-sm" onclick="event.stopPropagation();_srEditar(${t.id})" style="color:#f59e0b;border-color:#f59e0b60">✏️ Editar</button>
          ${!r.lev?`<button class="btn btn-out btn-sm" onclick="event.stopPropagation();_srLevantar(${t.id})" style="color:#10b981;border-color:#10b98160">✓ Levantar hoy</button>`:''}
          <button class="btn btn-del btn-sm" onclick="event.stopPropagation();_srEliminar(${t.id})">🗑</button>
        </div>
      </div>
    </div></td></tr>`;
}

// ── Formulario ───────────────────────────────────────────────────────────
function _srModal(){
  if(document.getElementById('mSegRestr'))return;
  const d=document.createElement('div');
  const opt=a=>a.map(x=>Array.isArray(x)?`<option value="${x[0]}">${x[1]}</option>`:`<option>${x}</option>`).join('');
  d.innerHTML=`<div class="mo" id="mSegRestr"><div class="modal" style="max-width:720px">
  <div class="mh"><span class="mttl" id="srMtl">Restricción</span><button class="mx" onclick="closeM('mSegRestr')">✕</button></div>
  <div class="mb"><div class="fg-grid">
    <div class="fg"><label>N°</label><input id="srNum" type="number" min="1"></div>
    <div class="fg"><label>Tipo</label><select id="srTipo">${opt(_SR_TIPOS)}</select></div>
    <div class="fg" style="grid-column:1/-1"><label>Restricción *</label><input id="srTit" placeholder="Ej: Cemento para concreto"></div>
    <div class="fg" style="grid-column:1/-1"><label>Actividad afectada</label><input id="srAct" placeholder="Ej: Vaciado de concreto en todos los frentes"></div>
    <div class="fg"><label>Responsable</label><input id="srResp" list="srRespList" placeholder="Ej: Yonder M. / Andrés R."><datalist id="srRespList"></datalist></div>
    <div class="fg"><label>Causa raíz</label><select id="srCausa"><option value=""></option>${opt(typeof SEG_RESTRICCIONES!=='undefined'?SEG_RESTRICCIONES:[])}</select></div>
    <div class="fg"><label>Fecha de detección *</label><input id="srDet" type="date" style="color-scheme:dark"></div>
    <div class="fg"><label>Fecha compromiso</label><input id="srComp" type="date" style="color-scheme:dark"></div>
    <div class="fg"><label>Estado</label><select id="srEst">${opt(_SR_EST)}</select></div>
    <div class="fg"><label>Impacto</label><select id="srImp">${opt(_SR_IMP)}</select></div>
    <div class="fg"><label>Fecha real de levantamiento</label><input id="srReal" type="date" style="color-scheme:dark"></div>
    <div class="fg"><label>N° de reprogramaciones</label><input id="srRep" type="number" min="0" title="Sube sola cuando se mueve la fecha compromiso a una posterior"></div>
    <div class="fg" style="grid-column:1/-1"><label>Acciones / comentarios</label><textarea id="srAcc" rows="5" placeholder="Qué se hizo, a quién se comunicó, qué falta…"></textarea></div>
  </div></div>
  <div class="mf"><button class="btn btn-out" onclick="closeM('mSegRestr')">Cancelar</button><button class="btn btn-a" style="--ba:#10b981" onclick="_srGuardar()">💾 Guardar</button></div>
</div></div>`;
  while(d.firstChild)document.body.appendChild(d.firstChild);
}
function _srLlenar(t){
  _srModal();
  const dl=document.getElementById('srRespList');
  if(dl)dl.innerHTML=[...new Set(_srTodas().map(x=>x.responsable).filter(Boolean))].map(x=>`<option>${_srEsc(x)}</option>`).join('');
  const s=(id,v)=>{const el=document.getElementById(id);if(el)el.value=v==null?'':v;};
  s('srNum',t.numero);s('srTipo',t.tipoRestr||'Interna');s('srTit',t.titulo);s('srAct',t.actividad);s('srResp',t.responsable);
  s('srCausa',t.restriccion||'');s('srDet',String(t.fecha||'').slice(0,10));s('srComp',String(t.fechaProm||'').slice(0,10));
  s('srEst',t.est||'Abierta');s('srImp',t.prioridad||'Media');s('srReal',String(t.fechaComp||'').slice(0,10));
  s('srRep',t.reprog||0);s('srAcc',t.restriccionDet);
}
function _srNueva(){
  _srEditId=null;
  const sig=Math.max(0,..._srTodas().map(t=>+t.numero||0))+1;
  _srLlenar({numero:sig,fecha:today(),est:'Abierta',prioridad:'Media',tipoRestr:'Interna'});
  document.getElementById('srMtl').textContent='＋ Nueva Restricción';
  openM('mSegRestr');
}
function _srEditar(id){
  const t=_srTodas().find(x=>x.id===id);if(!t)return;
  _srEditId=id;_srLlenar(t);
  document.getElementById('srMtl').textContent='✏️ Restricción N° '+(t.numero||'');
  openM('mSegRestr');
}
function _srGuardar(){
  const g=id=>String(document.getElementById(id).value||'').trim();
  const titulo=g('srTit'),det=g('srDet');
  if(!titulo){toast('Escriba la restricción',true);return;}
  if(!det){toast('Indique la fecha de detección',true);return;}
  let est=g('srEst'),real=g('srReal');
  if(est==='Levantada'&&!real)real=today();          // levantada sin fecha → hoy
  // Con fecha real pero sin estado Levantada: se pregunta. Si dice que no,
  // se guarda igual y el detalle de la fila avisa la inconsistencia.
  if(real&&est!=='Levantada'&&confirm('Tiene fecha real de levantamiento. ¿Marcarla como Levantada?'))est='Levantada';
  let t;
  if(_srEditId!=null){t=(DB.seguimiento||[]).find(x=>x.id===_srEditId);if(!t)return;}
  else{t={id:nid('seg'),esRestriccion:true,creadoPor:CU?CU.nombre:''};DB.seguimiento.push(t);}
  const comp=g('srComp');
  let rep=Math.max(0,+g('srRep')||0);
  // Mover el compromiso a una fecha posterior cuenta como reprogramación
  if(_srEditId!=null&&t.fechaProm&&comp&&comp>String(t.fechaProm).slice(0,10)&&rep===(+t.reprog||0)){
    rep++;
    t.reprogHist=Array.isArray(t.reprogHist)?t.reprogHist:[];
    t.reprogHist.push({de:String(t.fechaProm).slice(0,10),a:comp,fecha:today(),por:CU?CU.nombre:''});
  }
  Object.assign(t,{esRestriccion:true,numero:+g('srNum')||null,tipoRestr:g('srTipo'),titulo,actividad:g('srAct'),responsable:g('srResp'),
    restriccion:g('srCausa'),fecha:det,fechaProm:comp,est,prioridad:g('srImp'),fechaComp:real,reprog:rep,restriccionDet:g('srAcc')});
  syncSheet('saveSegTarea',t);
  closeM('mSegRestr');_srAbierta=t.id;_segRender();
  toast('Restricción guardada');
}
function _srLevantar(id){
  const t=_srTodas().find(x=>x.id===id);if(!t)return;
  t.est='Levantada';t.fechaComp=today();
  syncSheet('saveSegTarea',t);_segRender();toast('✓ Restricción levantada');
}
function _srEliminar(id){
  const t=_srTodas().find(x=>x.id===id);if(!t)return;
  if(!confirm('¿Eliminar la restricción N° '+(t.numero||'')+' «'+(t.titulo||'')+'»?'))return;
  DB.seguimiento=DB.seguimiento.filter(x=>x.id!==id);
  supaDelete('seguimiento',id);
  _srAbierta=null;_segRender();toast('Restricción eliminada');
}

// ── Excel con las columnas de la hoja original ───────────────────────────
function exportSegRestrXLSX(){
  if(typeof XLSX==='undefined'){alert('No se pudo cargar la librería de Excel.');return;}
  const {corte,vista}=_srDatos();
  const lista=[...vista].sort((a,b)=>(+a.t.numero||0)-(+b.t.numero||0));
  const aoa=[['SEGUIMIENTO DE RESTRICCIONES DEL LPS'],[`Corte al ${_srDMY(corte)}${_srMes?' · vivas en '+_srMesNombre(_srMes):''}`],
    ['N°','Restricción','Fecha de detección','Actividad afectada','Tipo','Responsable','Fecha compromiso','Estado','Acciones / Comentarios',
     'Fecha real de levantamiento','N° de reprogramaciones','Impacto','Causa raíz','Antigüedad (d)','Días de atraso']];
  lista.forEach(r=>{const t=r.t;aoa.push([t.numero||'',t.titulo||'',_srDMY(r.det),t.actividad||'',t.tipoRestr||'',t.responsable||'',
    r.comp?_srDMY(r.comp):'',r.est,t.restriccionDet||'',r.real?_srDMY(r.real):'',r.reprog,_srImpLbl(t.prioridad),t.restriccion||'',
    r.edad??'',r.atraso!=null&&r.atraso>0?r.atraso:'']);});
  const ws=XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols']=[{wch:5},{wch:34},{wch:12},{wch:34},{wch:10},{wch:22},{wch:12},{wch:11},{wch:70},{wch:14},{wch:10},{wch:8},{wch:24},{wch:10},{wch:9}];
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Restricciones');
  XLSX.writeFile(wb,`Restricciones_LPS_${(_srMes||'todas')}.xlsx`);
}
