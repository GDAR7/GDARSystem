// ══════════════════════════════════════════════════════════════════════════
//  VALORIZACIÓN AL CLIENTE — motor de cálculo (formato VALEC)
//  Toma las partidas de VAL_PRESUP y llena la cantidad de cada una con los
//  datos que YA están en el sistema: Partes Diarios (horas de equipo),
//  Tareaje (mes-hombre por cargo) y el Máster de Equipos.
//  Lo que no se puede deducir (hitos, stand by) se escribe a mano.
// ══════════════════════════════════════════════════════════════════════════

const _vlN=v=>Number(v||0).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});
const _vlN0=v=>Number(v||0).toLocaleString('es-PE',{maximumFractionDigits:0});
const _vlPct=v=>(v==null||!isFinite(v))?'':v.toFixed(2)+'%';
function _vlEsc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function _vlDMY(iso){if(!iso||!iso.includes('-'))return iso||'—';const[y,m,d]=iso.split('-');return`${d}/${m}/${y}`;}
// Normaliza cargos y nombres para comparar sin tildes ni puntuación
const _vlNorm=s=>String(s||'').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^A-Z0-9]+/g,' ').trim();

let _vlDesde='', _vlHasta='', _vlNum='1', _vlProy='';
let _vlManual={};       // {item: cantidad escrita a mano}
let _vlAcum={};         // {item: monto acumulado anterior}
let _vlSoloConMov=false;

// Las cantidades manuales y los acumulados se guardan por período en el
// navegador. Es provisional: cuando se cree la tabla en Supabase, esto migra.
function _vlKey(){return '_gdarVal_'+(_vlProy||'x')+'_'+_vlDesde+'_'+_vlHasta;}
function _vlCargar(){
  try{
    const d=JSON.parse(localStorage.getItem(_vlKey())||'null')||{};
    _vlManual=d.manual||{};_vlAcum=d.acum||{};_vlNum=d.num||_vlNum;
  }catch(e){_vlManual={};_vlAcum={};}
}
function _vlGuardar(){
  try{localStorage.setItem(_vlKey(),JSON.stringify({manual:_vlManual,acum:_vlAcum,num:_vlNum}));}catch(e){}
}

function _vlSet(campo,val){
  if(campo==='desde'){_vlDesde=val;_vlCargar();}
  else if(campo==='hasta'){_vlHasta=val;_vlCargar();}
  else if(campo==='num'){_vlNum=val;_vlGuardar();}
  else if(campo==='proy'){_vlProy=val;_vlCargar();}
  else if(campo==='soloMov')_vlSoloConMov=!!val;
  rValorizacion(campo==='num');
}
function _vlSetCant(item,val){
  const n=+val;
  if(!val||isNaN(n))delete _vlManual[item];else _vlManual[item]=n;
  _vlGuardar();rValorizacion();
}
function _vlSetAcum(item,val){
  const n=+val;
  if(!val||isNaN(n))delete _vlAcum[item];else _vlAcum[item]=n;
  _vlGuardar();rValorizacion();
}

// ── Fuentes de datos ────────────────────────────────────────────────────────

// Horas efectivas del equipo en el período (Partes Diarios)
function _vlHorasEq(codigo,desde,hasta){
  const eq=(DB.equipos||[]).find(e=>_vlNorm(e.codigo)===_vlNorm(codigo));
  if(!eq)return{h:0,eq:null};
  const h=(DB.partes||[])
    .filter(p=>p.eqId===eq.id&&p.fecha>=desde&&p.fecha<=hasta)
    .reduce((s,p)=>s+Math.max(0,+p.ef||0),0);
  return{h:+h.toFixed(2),eq};
}

// Incidencia mensual de los equipos cuyo nombre/subtipo coincide:
// suma de (días con parte ÷ días del período) de cada unidad.
function _vlIncidenciaEq(match,desde,hasta){
  const dp=Math.max(1,Math.round((new Date(hasta+'T12:00')-new Date(desde+'T12:00'))/864e5)+1);
  const m=_vlNorm(match);
  const eqs=(DB.equipos||[]).filter(e=>
    _vlNorm(e.nombre).includes(m)||_vlNorm(e.sub).includes(m)||_vlNorm(e.codigo).includes(m));
  let inc=0,n=0;
  eqs.forEach(e=>{
    const dias=new Set((DB.partes||[])
      .filter(p=>p.eqId===e.id&&p.fecha>=desde&&p.fecha<=hasta).map(p=>p.fecha)).size;
    if(dias>0){inc+=dias/dp;n++;}
  });
  return{cant:+inc.toFixed(4),n,eqs:eqs.length,dp};
}

// Mes-hombre de un cargo: días-hombre trabajados ÷ 30
const _VL_TRAB=['TD','TN','DLT','A5'];
function _vlMesHombre(cargo,desde,hasta){
  const c=_vlNorm(cargo);
  const ids=new Set((DB.personal||[]).filter(p=>{
    const pc=_vlNorm(p.cargo);
    return pc===c||pc.startsWith(c)||c.startsWith(pc);
  }).map(p=>p.id));
  if(!ids.size)return{cant:0,dias:0,personas:0};
  const dias=(DB.tareaje||[]).filter(r=>
    ids.has(r.personalId)&&r.fecha>=desde&&r.fecha<=hasta&&_VL_TRAB.includes(r.tipo)).length;
  return{cant:+(dias/VAL_DIAS_MES).toFixed(4),dias,personas:ids.size};
}

// ── Motor ───────────────────────────────────────────────────────────────────
// Devuelve las filas con su cantidad, monto y avance, más los totales.
function _vlCalcular(){
  const d=_vlDesde,h=_vlHasta;
  const filas=VAL_PRESUP.map(p=>({...p}));
  const detalle={};

  // 1ª pasada: todo salvo los porcentajes, que dependen de los demás
  filas.forEach(f=>{
    if(f.t!=='p')return;
    const s=f.src||{t:'manual'};
    f.auto=null;f.nota='';
    if(!d||!h){f.cant2=+_vlManual[f.item]||0;}
    else if(s.t==='eqHE'){
      const r=_vlHorasEq(s.eq,d,h);
      f.auto=r.h;f.nota=r.eq?`${r.h} h efectivas de ${s.eq}`:`⚠ ${s.eq} no está en el Máster`;
      if(!r.eq)f.alerta=1;
    }
    else if(s.t==='eqMes'){
      const r=_vlIncidenciaEq(s.match,d,h);
      f.auto=r.cant;f.nota=r.n?`${r.n} de ${r.eqs} unidad(es) con partes · ${r.dp} días de período`:`⚠ Sin partes de "${s.match}"`;
      if(!r.eqs)f.alerta=1;
    }
    else if(s.t==='cargo'){
      const r=_vlMesHombre(s.cargo,d,h);
      f.auto=r.cant;f.nota=r.personas?`${r.dias} días-hombre ÷ ${VAL_DIAS_MES} · ${r.personas} persona(s) con ese cargo`:`⚠ Ningún trabajador con cargo "${s.cargo}"`;
      if(!r.personas)f.alerta=1;
    }
    // El valor manual siempre manda sobre el automático
    f.manual=_vlManual[f.item]!=null;
    f.cant2=f.manual?+_vlManual[f.item]:(f.auto||0);
    f.total2=+((f.cant2||0)*(f.pu||0)).toFixed(2);
  });

  // 2ª pasada: % sobre MOD y sobre Costo Directo
  const modBase=filas.filter(f=>f.t==='p'&&f.mod).reduce((s,f)=>s+f.total2,0);
  filas.forEach(f=>{
    if(f.t!=='p'||!f.src)return;
    if(f.src.t==='pctMOD'){
      f.cant2=+modBase.toFixed(2);
      f.total2=+(modBase*f.src.pct/100).toFixed(2);
      f.nota=`${f.src.pct}% de S/ ${_vlN(modBase)} de mano de obra directa valorizada`;
    }
  });
  // Costo directo = todo lo que está antes de la sección CI
  let enCD=false,cd=0;
  filas.forEach(f=>{
    if(f.t==='s'){enCD=f.sec==='CD';return;}
    if(enCD&&f.t==='p'&&(!f.src||f.src.t!=='pctCD'))cd+=f.total2||0;
  });
  filas.forEach(f=>{
    if(f.t==='p'&&f.src&&f.src.t==='pctCD'){
      f.cant2=+cd.toFixed(2);
      f.total2=+(cd*f.src.pct/100).toFixed(2);
      f.nota=`${f.src.pct}% de S/ ${_vlN(cd)} de costo directo valorizado`;
    }
  });

  // Subtotales de grupos y secciones: se suma hacia arriba por el orden del listado
  const idxSec=[];filas.forEach((f,i)=>{if(f.t==='s')idxSec.push(i);});
  const totalDe=(desdeI,hastaI)=>filas.slice(desdeI+1,hastaI).filter(f=>f.t==='p').reduce((s,f)=>s+(f.total2||0),0);
  filas.forEach((f,i)=>{
    if(f.t==='s'){
      const fin=idxSec.find(j=>j>i);
      f.total2=+totalDe(i,fin==null?filas.length:fin).toFixed(2);
    }else if(f.t==='g'){
      // El grupo llega hasta el próximo grupo de nivel igual o superior, o la próxima sección
      let fin=filas.length;
      for(let j=i+1;j<filas.length;j++){
        const x=filas[j];
        if(x.t==='s'||(x.t==='g'&&(x.niv||1)<=(f.niv||1))){fin=j;break;}
      }
      f.total2=+totalDe(i,fin).toFixed(2);
    }
    if(f.t!=='p'){
      f.cant2=null;
      f.acumAnt=filas.slice(i+1).filter((x,k)=>false).length; // los grupos no llevan acumulado propio
    }
    f.pctAv=f.pres>0?(f.total2||0)/f.pres*100:null;
    f.acum=f.t==='p'?(+_vlAcum[f.item]||0):0;
  });
  // Acumulado de grupos: suma de sus partidas
  filas.forEach((f,i)=>{
    if(f.t==='p')return;
    let fin=filas.length;
    for(let j=i+1;j<filas.length;j++){
      const x=filas[j];
      if(x.t==='s'||(f.t==='g'&&x.t==='g'&&(x.niv||1)<=(f.niv||1))){fin=j;break;}
      if(f.t==='s'&&x.t==='s'){fin=j;break;}
    }
    f.acum=filas.slice(i+1,fin).filter(x=>x.t==='p').reduce((s,x)=>s+(+_vlAcum[x.item]||0),0);
  });
  filas.forEach(f=>{
    f.acumAct=+((f.acum||0)+(f.total2||0)).toFixed(2);
    f.pctAcum=f.pres>0?f.acumAct/f.pres*100:null;
    f.saldo=+((f.pres||0)-f.acumAct).toFixed(2);
  });

  const secCD=filas.find(f=>f.t==='s'&&f.sec==='CD')||{};
  const secCI=filas.find(f=>f.t==='s'&&f.sec==='CI')||{};
  return{filas,cd:secCD.total2||0,ci:secCI.total2||0,
    presCD:secCD.pres||0,presCI:secCI.pres||0,
    acumCD:secCD.acumAct||0,acumCI:secCI.acumAct||0,
    sinDato:filas.filter(f=>f.t==='p'&&f.alerta).length};
}

// ── Render ──────────────────────────────────────────────────────────────────
function rValorizacion(mantenerFoco){
  const pg=document.getElementById('page-venta');if(!pg)return;
  if(!_vlDesde||!_vlHasta){
    // Por defecto, el período del mes en curso al estilo del contrato (21 → 20)
    const hoy=new Date();
    const h=new Date(hoy.getFullYear(),hoy.getMonth(),20);
    const dsd=new Date(hoy.getFullYear(),hoy.getMonth()-1,21);
    _vlHasta=_vlHasta||h.toISOString().slice(0,10);
    _vlDesde=_vlDesde||dsd.toISOString().slice(0,10);
    _vlCargar();
  }
  const R=_vlCalcular();
  const proys=(DB.proyectos||[]);
  const selS='background:var(--panel2);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:.3rem .55rem;font-size:.75rem';

  const kpi=(l,v,c,sub)=>`<div class="kpi" style="--kc:${c};border:1px solid ${c};flex:1;min-width:165px">
    <div class="kpi-lbl">${l}</div><div class="kpi-val" style="font-size:${String(v).length>13?'1.1rem':'1.45rem'}">${v}</div>
    <div class="kpi-sub">${sub||''}</div></div>`;

  const TH='padding:5px 6px;font-size:.58rem;text-transform:uppercase;letter-spacing:.05em;color:var(--muted2);white-space:nowrap;position:sticky;top:0;background:var(--panel);z-index:2';
  const TD='padding:3px 6px;font-size:.71rem;white-space:nowrap;border-bottom:1px solid var(--border)';
  const MONO='font-family:monospace;font-variant-numeric:tabular-nums';

  const filas=R.filas.filter(f=>!_vlSoloConMov||f.t!=='p'||(f.total2||0)>0).map(f=>{
    if(f.t==='s'){
      return`<tr style="background:rgba(5,150,105,.16)">
        <td style="${TD};font-weight:900;color:#10b981;font-size:.74rem" colspan="4">${_vlEsc(f.desc)}</td>
        <td style="${TD};text-align:right;${MONO};font-weight:800;color:#10b981">${_vlN(f.pres)}</td>
        <td style="${TD};text-align:right;${MONO};color:var(--muted2)">${f.acum?_vlN(f.acum):'—'}</td>
        <td style="${TD}"></td>
        <td style="${TD};text-align:right;${MONO};font-weight:900;color:#10b981">${_vlN(f.total2)}</td>
        <td style="${TD};text-align:right;${MONO};font-weight:800;color:#10b981">${_vlPct(f.pctAv)}</td>
        <td style="${TD};text-align:right;${MONO};font-weight:800">${_vlN(f.acumAct)}</td>
        <td style="${TD};text-align:right;${MONO};color:var(--muted2)">${_vlPct(f.pctAcum)}</td>
        <td style="${TD};text-align:right;${MONO};color:var(--muted2)">${_vlN(f.saldo)}</td>
      </tr>`;
    }
    if(f.t==='g'){
      const niv=f.niv||1;
      const bg=niv===1?'rgba(30,58,95,.55)':niv===2?'rgba(30,58,95,.32)':'rgba(30,58,95,.16)';
      const col=niv===1?'#38bdf8':niv===2?'#7dd3fc':'#bae6fd';
      return`<tr style="background:${bg}">
        <td style="${TD};color:${col};font-weight:700;padding-left:${6+(niv-1)*10}px">${_vlEsc(f.item)}</td>
        <td style="${TD};color:${col};font-weight:700" colspan="3">${_vlEsc(f.desc)}</td>
        <td style="${TD};text-align:right;${MONO};color:${col}">${f.pres?_vlN(f.pres):''}</td>
        <td style="${TD};text-align:right;${MONO};color:var(--muted2)">${f.acum?_vlN(f.acum):'—'}</td>
        <td style="${TD}"></td>
        <td style="${TD};text-align:right;${MONO};font-weight:800;color:${col}">${_vlN(f.total2)}</td>
        <td style="${TD};text-align:right;${MONO};color:${col}">${_vlPct(f.pctAv)}</td>
        <td style="${TD};text-align:right;${MONO}">${_vlN(f.acumAct)}</td>
        <td style="${TD};text-align:right;${MONO};color:var(--muted2)">${_vlPct(f.pctAcum)}</td>
        <td style="${TD};text-align:right;${MONO};color:var(--muted2)">${f.pres?_vlN(f.saldo):''}</td>
      </tr>`;
    }
    // Partida
    const esAuto=f.src&&f.src.t!=='manual';
    const borde=f.manual?'#f59e0b':esAuto?'#10b98166':'var(--border)';
    const tit=f.nota+(f.manual&&f.auto!=null?` · el sistema calculó ${_vlN(f.auto)}`:'');
    return`<tr>
      <td style="${TD};color:var(--muted2);${MONO};font-size:.64rem;padding-left:20px">${_vlEsc(f.item)}</td>
      <td style="${TD};max-width:320px;overflow:hidden;text-overflow:ellipsis" title="${_vlEsc(f.desc)}">${_vlEsc(f.desc)}
        ${f.alerta?'<span title="'+_vlEsc(f.nota)+'" style="color:#ef4444;font-weight:800">⚠</span>':''}</td>
      <td style="${TD};text-align:center;color:var(--muted2);font-size:.64rem">${f.und||''}</td>
      <td style="${TD};text-align:right;${MONO};color:var(--muted2)">${f.pu?_vlN(f.pu):''}</td>
      <td style="${TD};text-align:right;${MONO};color:var(--muted2)">${f.pres?_vlN(f.pres):''}</td>
      <td style="${TD};text-align:right;padding:1px 4px">
        <input type="number" step="0.01" value="${_vlAcum[f.item]!=null?_vlAcum[f.item]:''}" placeholder="0"
          onchange="_vlSetAcum('${f.item}',this.value)" title="Monto valorizado en EDP anteriores"
          style="width:78px;background:transparent;border:1px solid var(--border);border-radius:4px;color:var(--muted2);padding:1px 4px;font-size:.66rem;text-align:right;${MONO}"></td>
      <td style="${TD};text-align:right;padding:1px 4px" title="${_vlEsc(tit)}">
        <input type="number" step="0.01" value="${f.cant2||''}" placeholder="0"
          oninput="_vlSetCant('${f.item}',this.value)"
          style="width:74px;background:${f.manual?'rgba(245,158,11,.12)':'transparent'};border:1px solid ${borde};border-radius:4px;color:${f.manual?'#f59e0b':'var(--text)'};padding:1px 4px;font-size:.68rem;text-align:right;font-weight:700;${MONO}">
        ${f.manual?`<span onclick="_vlSetCant('${f.item}','')" title="Volver al valor del sistema" style="cursor:pointer;color:#ef4444;font-size:.6rem;margin-left:2px">✕</span>`:''}</td>
      <td style="${TD};text-align:right;${MONO};font-weight:700;background:rgba(255,255,0,.05)">${f.total2?_vlN(f.total2):'—'}</td>
      <td style="${TD};text-align:right;${MONO};color:var(--muted2)">${_vlPct(f.pctAv)}</td>
      <td style="${TD};text-align:right;${MONO}">${f.acumAct?_vlN(f.acumAct):'—'}</td>
      <td style="${TD};text-align:right;${MONO};color:var(--muted2)">${_vlPct(f.pctAcum)}</td>
      <td style="${TD};text-align:right;${MONO};color:var(--muted2)">${f.pres?_vlN(f.saldo):''}</td>
    </tr>`;
  }).join('');

  const total=R.cd+R.ci;
  const nAuto=R.filas.filter(f=>f.t==='p'&&f.src&&f.src.t!=='manual'&&!f.manual&&(f.total2||0)>0).length;
  const nMan=Object.keys(_vlManual).length;

  pg.innerHTML=`
  <div class="ph"><div class="ph-title" style="color:#10b981">💼 Valorización al Cliente</div>
    <div class="ph-sub">EDP en formato VALEC — las cantidades salen de Partes Diarios y Tareaje; lo que no se puede deducir se escribe a mano</div></div>

  <div class="card" style="margin-bottom:.9rem">
    <div class="card-head"><span class="card-title">🗓️ Período de valorización</span>
      <span style="font-size:.63rem;color:var(--muted2)">${nAuto} partida${nAuto===1?'':'s'} calculada${nAuto===1?'':'s'} por el sistema · ${nMan} editada${nMan===1?'':'s'} a mano${R.sinDato?` · <span style="color:#ef4444">${R.sinDato} sin dato</span>`:''}</span>
    </div>
    <div class="card-body"><div style="display:flex;gap:.55rem;flex-wrap:wrap;align-items:flex-end">
      <div style="display:flex;flex-direction:column;gap:.15rem">
        <label style="font-size:.58rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted2)">N° EDP</label>
        <input id="vlNum" value="${_vlEsc(_vlNum)}" onchange="_vlSet('num',this.value)" style="${selS};width:70px;text-align:center;font-weight:800"></div>
      <div style="display:flex;flex-direction:column;gap:.15rem">
        <label style="font-size:.58rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted2)">Desde</label>
        <input type="date" class="date-ic-azul" value="${_vlDesde}" onchange="_vlSet('desde',this.value)" style="${selS};color-scheme:dark"></div>
      <div style="display:flex;flex-direction:column;gap:.15rem">
        <label style="font-size:.58rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted2)">Hasta</label>
        <input type="date" class="date-ic-azul" value="${_vlHasta}" onchange="_vlSet('hasta',this.value)" style="${selS};color-scheme:dark"></div>
      <div style="display:flex;flex-direction:column;gap:.15rem">
        <label style="font-size:.58rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted2)">Proyecto</label>
        <select onchange="_vlSet('proy',this.value)" style="${selS};max-width:260px">
          <option value="">— Todos —</option>
          ${proys.map(p=>`<option value="${_vlEsc(p.codigo)}" ${_vlProy===p.codigo?'selected':''}>${_vlEsc(p.codigo)}${p.nombre?' – '+_vlEsc(p.nombre):''}</option>`).join('')}
        </select></div>
      <label style="display:inline-flex;align-items:center;gap:.35rem;font-size:.7rem;color:var(--muted2);cursor:pointer;padding-bottom:.35rem">
        <input type="checkbox" ${_vlSoloConMov?'checked':''} onchange="_vlSet('soloMov',this.checked)" style="width:auto;margin:0;cursor:pointer"> Solo partidas con movimiento
      </label>
      <button onclick="_vlRecalcular()" style="background:rgba(16,185,129,.15);border:1px solid #10b98155;color:#10b981;border-radius:6px;padding:.3rem .8rem;font-size:.72rem;font-weight:700;cursor:pointer">↻ Recalcular del sistema</button>
      <button onclick="_vlExcel()" style="background:#166534;color:#fff;border:none;border-radius:6px;padding:.3rem .8rem;font-size:.72rem;font-weight:700;cursor:pointer">📊 Excel</button>
    </div></div>
  </div>

  <div class="kpi-row" style="margin-bottom:.9rem">
    ${kpi('Valorización actual',`S/ ${_vlN0(total)}`,'#10b981',`${_vlDMY(_vlDesde)} → ${_vlDMY(_vlHasta)}`)}
    ${kpi('Costo Directo',`S/ ${_vlN0(R.cd)}`,'#38bdf8',`${R.presCD>0?(R.cd/R.presCD*100).toFixed(2):'0.00'}% del presupuesto`)}
    ${kpi('Costo Indirecto',`S/ ${_vlN0(R.ci)}`,'#a855f7',`${R.presCI>0?(R.ci/R.presCI*100).toFixed(2):'0.00'}% del presupuesto`)}
    ${kpi('Acumulado actual',`S/ ${_vlN0(R.acumCD+R.acumCI)}`,'#f59e0b',`de S/ ${_vlN0(R.presCD+R.presCI)} contratados`)}
    ${kpi('Saldo por valorizar',`S/ ${_vlN0(R.presCD+R.presCI-R.acumCD-R.acumCI)}`,'#64748b','presupuesto − acumulado')}
  </div>

  <div class="card">
    <div class="card-head"><span class="card-title">📋 Detalle de partidas</span>
      <span style="font-size:.62rem;color:var(--muted2)">
        <span style="color:#10b981">▮</span> calculado por el sistema ·
        <span style="color:#f59e0b">▮</span> editado a mano ·
        <span style="color:#ef4444">⚠</span> sin dato en el sistema
      </span>
    </div>
    <div class="card-body" style="padding:0"><div class="tbl-wrap" style="max-height:70vh;overflow:auto"><table style="width:100%;border-collapse:collapse">
      <thead><tr>
        <th style="${TH};text-align:left">Ítem</th><th style="${TH};text-align:left">Descripción</th>
        <th style="${TH}">Unid.</th><th style="${TH};text-align:right">P. Unit</th><th style="${TH};text-align:right">Presupuesto</th>
        <th style="${TH};text-align:right">Acum. anterior</th>
        <th style="${TH};text-align:right;color:#fde047">Cant.</th><th style="${TH};text-align:right;color:#fde047">Valorización</th><th style="${TH};text-align:right">% av.</th>
        <th style="${TH};text-align:right">Acum. actual</th><th style="${TH};text-align:right">% acum.</th><th style="${TH};text-align:right">Saldo</th>
      </tr></thead>
      <tbody>${filas}</tbody>
      <tfoot><tr style="border-top:2px solid #10b981;background:rgba(16,185,129,.1);position:sticky;bottom:0">
        <td style="${TD};font-weight:900;color:#10b981" colspan="4">TOTAL VALORIZADO</td>
        <td style="${TD};text-align:right;${MONO};font-weight:800">${_vlN(R.presCD+R.presCI)}</td>
        <td style="${TD};text-align:right;${MONO};color:var(--muted2)">${_vlN(R.acumCD+R.acumCI-R.cd-R.ci)}</td>
        <td style="${TD}"></td>
        <td style="${TD};text-align:right;${MONO};font-weight:900;color:#10b981;font-size:.8rem">${_vlN(total)}</td>
        <td style="${TD};text-align:right;${MONO};font-weight:800">${_vlPct((R.presCD+R.presCI)>0?total/(R.presCD+R.presCI)*100:null)}</td>
        <td style="${TD};text-align:right;${MONO};font-weight:800">${_vlN(R.acumCD+R.acumCI)}</td>
        <td style="${TD}"></td>
        <td style="${TD};text-align:right;${MONO};color:var(--muted2)">${_vlN(R.presCD+R.presCI-R.acumCD-R.acumCI)}</td>
      </tr></tfoot>
    </table></div></div>
  </div>

  <div style="font-size:.62rem;color:var(--muted);margin-top:.7rem;line-height:1.65">
    <strong>De dónde sale cada cantidad:</strong> las horas <em>(HE)</em> son las horas efectivas de los Partes Diarios del equipo.
    Las partidas <em>mes</em> de personal son mes-hombre: días trabajados en el Tareaje ÷ ${VAL_DIAS_MES}.
    Los equipos de soporte y luminarias usan la incidencia del período (días con parte ÷ días del período).
    <em>Herramientas manuales</em> y <em>Soporte de oficina central</em> se calculan sobre lo ya valorizado.
    Los hitos de movilización y el <em>stand by</em> se escriben a mano.
    Cualquier celda amarilla se puede sobrescribir; el ✕ devuelve el valor del sistema.
    <br><strong>Provisional:</strong> las cantidades manuales y los acumulados se guardan en este navegador hasta que se cree la tabla en Supabase.
  </div>`;

  if(mantenerFoco){const b=document.getElementById('vlNum');if(b)b.focus();}
}

// Borra los valores manuales del período para volver a lo que dice el sistema
function _vlRecalcular(){
  if(!Object.keys(_vlManual).length){toast('No hay cantidades editadas a mano');return;}
  if(!confirm(`Se van a descartar ${Object.keys(_vlManual).length} cantidad(es) escritas a mano y se usará lo que calcula el sistema.\n\n¿Continuar?`))return;
  _vlManual={};_vlGuardar();rValorizacion();
  toast('✓ Cantidades recalculadas desde el sistema');
}

// ── Excel en el mismo orden del formato VALEC ───────────────────────────────
function _vlExcel(){
  if(typeof XLSX==='undefined'){toast('Librería de Excel no disponible',true);return;}
  const R=_vlCalcular();
  const BOR={top:{style:'thin',color:{rgb:'D0D7E2'}},bottom:{style:'thin',color:{rgb:'D0D7E2'}},
             left:{style:'thin',color:{rgb:'D0D7E2'}},right:{style:'thin',color:{rgb:'D0D7E2'}}};
  const S=(v,o)=>({v:v==null?'':v,t:typeof v==='number'?'n':'s',s:Object.assign({
    font:{sz:9,bold:!!(o&&o.b),color:{rgb:(o&&o.col)||'0F172A'}},
    fill:{fgColor:{rgb:(o&&o.bg)||'FFFFFF'}},
    alignment:{horizontal:(o&&o.al)||'left',vertical:'center'},border:BOR},
    (o&&o.numFmt)?{numFmt:o.numFmt}:{})});
  const HDR=['Ítem','Descripción','Unid.','Cant. contrato','P. Unit S/','Presupuesto S/','Acum. anterior S/','Cant.','Valorización S/','% avance','Acum. actual S/','% acum.','Saldo S/'];
  const aoa=[
    [S(`EDP N° ${_vlNum} — VALORIZACIÓN`,{b:1,bg:'1E3A5F',col:'FFFFFF',al:'center'}),...Array(HDR.length-1).fill(S('',{bg:'1E3A5F'}))],
    [S(`Período: ${_vlDMY(_vlDesde)} al ${_vlDMY(_vlHasta)}${_vlProy?' · '+_vlProy:''}`,{bg:'EEF2F8',col:'475569',al:'center'}),...Array(HDR.length-1).fill(S('',{bg:'EEF2F8'}))],
    HDR.map(h=>S(h,{b:1,bg:'334155',col:'FFFFFF',al:'center'}))
  ];
  R.filas.forEach(f=>{
    const esT=f.t!=='p';
    const bg=f.t==='s'?'D1FAE5':f.t==='g'?(f.niv===1?'DBEAFE':'EFF6FF'):'FFFFFF';
    aoa.push([
      S(f.item||'',{b:esT,bg}),S(f.desc,{b:esT,bg}),S(esT?'':f.und||'',{al:'center',bg}),
      S(esT?null:(f.cant||null),{al:'right',numFmt:'#,##0.00',bg}),
      S(esT?null:(f.pu||null),{al:'right',numFmt:'#,##0.00',bg}),
      S(f.pres||null,{al:'right',numFmt:'#,##0.00',b:esT,bg}),
      S(f.acum||null,{al:'right',numFmt:'#,##0.00',bg}),
      S(esT?null:(f.cant2||null),{al:'right',numFmt:'#,##0.0000',bg}),
      S(f.total2||null,{al:'right',numFmt:'#,##0.00',b:1,bg:f.t==='p'?'FFFACD':bg}),
      S(f.pctAv!=null?f.pctAv/100:null,{al:'right',numFmt:'0.00%',bg}),
      S(f.acumAct||null,{al:'right',numFmt:'#,##0.00',b:esT,bg}),
      S(f.pctAcum!=null?f.pctAcum/100:null,{al:'right',numFmt:'0.00%',bg}),
      S(f.pres?f.saldo:null,{al:'right',numFmt:'#,##0.00',bg})
    ]);
  });
  const ws=XLSX.utils.aoa_to_sheet(aoa);
  ws['!merges']=[{s:{r:0,c:0},e:{r:0,c:HDR.length-1}},{s:{r:1,c:0},e:{r:1,c:HDR.length-1}}];
  ws['!cols']=[{wch:13},{wch:52},{wch:7},{wch:12},{wch:12},{wch:15},{wch:15},{wch:11},{wch:15},{wch:10},{wch:15},{wch:10},{wch:15}];
  ws['!freeze']={xSplit:2,ySplit:3};
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Valorización');
  XLSX.writeFile(wb,`Valorizacion_EDP_${_vlNum}_${_vlHasta}.xlsx`);
  toast('✓ Valorización exportada');
}
