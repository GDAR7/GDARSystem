// ══════════════════════════════════════════════════════════════════════════
//  RR.HH. · ROSTER DE GUARDIAS · 🚐 TRANSPORTE DE PERSONAL
//
//  Verifica día por día si la flota alcanza para subir a la gente que el
//  Roster programa en cada turno. Las personas NO se escriben a mano: salen
//  del mismo cálculo que pinta la grilla del Roster (guardia, turno individual,
//  fecha de incorporación y días sobreescritos).
//
//    · Turno día   : TD, DLT y A5
//    · Turno noche : TN
//
//  Cada turno tiene su propia flota (coaster y camionetas). Reparto:
//    · los obreros van primero en coaster; los staff, primero en camioneta;
//    · si una de las dos se llena, el resto pasa a la otra;
//    · lo que no entra en ninguna es el déficit del día.
//
//  Solo se ve y se exporta a PDF: no se guarda nada en Supabase. Las cantidades
//  de flota de cada turno quedan recordadas en este navegador, para no
//  escribirlas cada vez.
//
//  Usa del Roster (js/personal.js): _rosterInicioVista, _rosterLunes,
//  _rosterAddDays, _rosterFmt, _rosterDia, _rosterGetCfg, _rosterTipoPersona,
//  _rosterOvrDe, _rosterNormOvr, _DN.
//
//  Prefijo _rt.
// ══════════════════════════════════════════════════════════════════════════

const _RT_LS='gdar_rt_flota';                  // flota recordada en el navegador
const _RT_DIAS=35;                              // el mismo largo que la grilla del Roster
const _RT_TIPOS_DIA=['TD','DLT','A5'];
const _RT_TIPOS_NOCHE=['TN'];
// Valores con los que arranca cada turno si todavía no hay nada guardado
const _RT_DEF={
  DIA:  {id:1,turno:'DIA',  coN:3,coAsientos:24,coConductor:false,caN:3,caAsientos:5,caConductor:true,reserva:0},
  NOCHE:{id:2,turno:'NOCHE',coN:1,coAsientos:24,coConductor:false,caN:1,caAsientos:5,caConductor:true,reserva:0}
};
const _RT_COL={dia:'#f59e0b',noche:'#818cf8',obr:'#14b8a6',stf:'#f97316',ok:'#10b981',wa:'#f59e0b',cr:'#ef4444'};

let _rtFlota={DIA:{..._RT_DEF.DIA},NOCHE:{..._RT_DEF.NOCHE}};
let _rtLeida=false;         // ya se leyó la flota recordada
let _rtSel='';              // día elegido para el mapa de asientos

const _rtEsc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const _rtNum=(v,max)=>{const n=Math.floor(+v);return isFinite(n)?Math.max(0,Math.min(max,n)):0;};

// ── Flota ──────────────────────────────────────────────────────────────────
// Asientos útiles por unidad y plazas totales del turno
function _rtPlazas(f){
  const res=Math.min(30,Math.max(0,+f.reserva||0))/100;
  const coUtil=Math.floor(Math.max(0,(+f.coAsientos||0)-(f.coConductor?1:0))*(1-res));
  const caUtil=Math.floor(Math.max(0,(+f.caAsientos||0)-(f.caConductor?1:0))*(1-res));
  const coN=+f.coN||0, caN=+f.caN||0;
  return {coN,caN,coUtil,caUtil,coCap:coN*coUtil,caCap:caN*caUtil,total:coN*coUtil+caN*caUtil};
}

// Reparte a obreros y staff entre coaster y camionetas
function _rtAsignar(obr,stf,P){
  const obrCo=Math.min(obr,P.coCap), stfCa=Math.min(stf,P.caCap);
  const stfCo=Math.min(stf-stfCa,P.coCap-obrCo);
  const obrCa=Math.min(obr-obrCo,P.caCap-stfCa);
  const enCo=obrCo+stfCo, enCa=stfCa+obrCa, pers=obr+stf;
  return {obr,stf,pers,obrCo,stfCo,stfCa,obrCa,enCo,enCa,
    coUsadas:P.coUtil?Math.ceil(enCo/P.coUtil):0,
    caUsadas:P.caUtil?Math.ceil(enCa/P.caUtil):0,
    falta:pers-enCo-enCa,
    holgura:P.total-pers,
    ocup:P.total?pers/P.total:0};
}

// ── Personas por día, desde el Roster ──────────────────────────────────────
function _rtEsStaff(p){return String(p&&p.tipo||'').trim().toLowerCase()==='staff';}
function _rtTipoDe(p,fecha){
  const cfg=_rosterGetCfg(p.guardia);
  const ovr=_rosterOvrDe(p.id,fecha);
  if(ovr)return ovr.tipo;
  return cfg?_rosterTipoPersona(fecha,cfg,p.id):null;
}
function _rtPersonasDia(fecha){
  const r={dia:{obr:0,stf:0},noche:{obr:0,stf:0}};
  (DB.personal||[]).forEach(p=>{
    if(p.est!=='Activo'||!p.guardia)return;
    const t=_rtTipoDe(p,fecha);
    const k=_RT_TIPOS_DIA.includes(t)?'dia':_RT_TIPOS_NOCHE.includes(t)?'noche':null;
    if(!k)return;
    r[k][_rtEsStaff(p)?'stf':'obr']++;
  });
  return r;
}

// Todo el período: personas y reparto de cada turno, día por día
function _rtCalcular(dias){
  const PD=_rtPlazas(_rtFlota.DIA), PN=_rtPlazas(_rtFlota.NOCHE);
  const filas=dias.map(fecha=>{
    const g=_rtPersonasDia(fecha);
    return {fecha,dia:_rtAsignar(g.dia.obr,g.dia.stf,PD),noche:_rtAsignar(g.noche.obr,g.noche.stf,PN)};
  });
  const res=k=>{
    const L=filas.map(f=>f[k]);
    return {pico:L.length?Math.max(...L.map(x=>x.pers)):0,
      fallan:L.filter(x=>x.falta>0).length,
      deficit:L.length?Math.max(...L.map(x=>x.falta)):0,
      holgura:L.length?Math.min(...L.map(x=>x.holgura)):0};
  };
  return {PD,PN,filas,dia:res('dia'),noche:res('noche')};
}

// ── Flota recordada en el navegador ───────────────────────────────────────
const _RT_CAMPOS=['coN','coAsientos','coConductor','caN','caAsientos','caConductor','reserva'];
function _rtLeerFlota(){
  try{
    const g=JSON.parse(localStorage.getItem(_RT_LS)||'null');
    ['DIA','NOCHE'].forEach(k=>{
      if(!g||!g[k])return;
      const f={..._RT_DEF[k]};
      _RT_CAMPOS.forEach(c=>{if(g[k][c]!==undefined)f[c]=(c==='coConductor'||c==='caConductor')?!!g[k][c]:(+g[k][c]||0);});
      _rtFlota[k]=f;
    });
  }catch(e){}
}
function _rtGuardarFlota(){
  try{localStorage.setItem(_RT_LS,JSON.stringify(_rtFlota));}catch(e){}
}

// Cambio en un campo de la flota: recalcula al instante
function _rtSet(k,campo,valor){
  const f=_rtFlota[k];if(!f)return;
  if(campo==='coConductor'||campo==='caConductor')f[campo]=!!valor;
  else if(campo==='reserva')f[campo]=_rtNum(valor,30);
  else f[campo]=_rtNum(valor,campo.endsWith('Asientos')?60:30);
  _rtGuardarFlota();
  _rtPintarCalculo();
}

// ── Navegación ─────────────────────────────────────────────────────────────
function _rtDias(){
  if(!_rosterInicioVista)_rosterInicioVista=_rosterLunes();
  return Array.from({length:_RT_DIAS},(_,i)=>_rosterAddDays(_rosterInicioVista,i));
}
function _rtNavegar(n){
  _rosterInicioVista=n===0?_rosterLunes():_rosterAddDays(_rosterInicioVista||_rosterLunes(),n);
  _rtSel='';
  rRosterTransporte();
}
function _rtElegir(fecha){_rtSel=fecha;_rtPintarCalculo();}

// ── Pintado ────────────────────────────────────────────────────────────────
function _rtPanelFlota(k){
  const f=_rtFlota[k], P=_rtPlazas(f), noche=k==='NOCHE';
  const col=noche?_RT_COL.noche:_RT_COL.dia;
  const num=(campo,etq,max)=>`<label class="rt-fld"><span>${etq}</span>
    <input type="number" min="0" max="${max}" step="1" value="${_rtEsc(f[campo])}" oninput="_rtSet('${k}','${campo}',this.value)"></label>`;
  const chk=(campo,etq)=>`<label class="rt-fld"><span>${etq}</span>
    <input type="checkbox" ${f[campo]?'checked':''} onchange="_rtSet('${k}','${campo}',this.checked)"></label>`;
  return `<div class="rt-flota" style="border:1px solid ${col};border-top:3px solid ${col}">
    <div class="rt-flota-h" style="color:${col}">${noche?'🌙 Turno Noche':'☀ Turno Día'}
      <span id="rtTot${k}">${P.total} plazas</span></div>
    <div class="rt-flota-g">
      <div class="rt-veh"><b style="color:${_RT_COL.obr}">Coaster</b>
        ${num('coN','Unidades',30)}${num('coAsientos','Asientos c/u',60)}${chk('coConductor','Conductor ocupa asiento')}
        <small id="rtCo${k}">${P.coN} × ${P.coUtil} = ${P.coCap} plazas</small></div>
      <div class="rt-veh"><b style="color:${_RT_COL.stf}">Camioneta</b>
        ${num('caN','Unidades',30)}${num('caAsientos','Asientos c/u',60)}${chk('caConductor','Conductor ocupa asiento')}
        <small id="rtCa${k}">${P.caN} × ${P.caUtil} = ${P.caCap} plazas</small></div>
    </div>
    ${num('reserva','Reserva de seguridad (%)',30)}
  </div>`;
}

function _rtKpi(etq,valor,color,sub){
  return `<div class="rt-kpi" style="border:1px solid ${color};border-top:3px solid ${color}">
    <div class="rt-kpi-l">${etq}</div><div class="rt-kpi-v" style="color:${color}">${valor}</div>
    ${sub?`<div class="rt-kpi-s">${sub}</div>`:''}</div>`;
}

function _rtChip(a){
  if(a.falta>0)return `<span class="rt-chip" style="background:${_RT_COL.cr};color:#fff">Faltan ${a.falta}</span>`;
  if(!a.pers)return `<span class="rt-chip" style="color:var(--muted2)">Sin personal</span>`;
  if(a.holgura<=3)return `<span class="rt-chip" style="background:rgba(245,158,11,.18);color:${_RT_COL.wa}">Justo · ${a.holgura} libres</span>`;
  return `<span class="rt-chip" style="background:rgba(16,185,129,.15);color:${_RT_COL.ok}">Alcanza</span>`;
}
function _rtBarra(a){
  const o=Math.min(1,a.ocup), c=a.falta>0?_RT_COL.cr:a.ocup>=.9?_RT_COL.wa:_RT_COL.ok;
  return `<span class="rt-bar"><i style="width:${(100*o).toFixed(1)}%;background:${c}"></i></span><span class="rt-pct">${(100*a.ocup).toFixed(0)}%</span>`;
}

// Las unidades de un turno, con cada asiento pintado: obrero, staff o libre
function _rtUnidades(a,P){
  const html=[];
  const llenar=(n,cap,nombre,primero,segundo,nPri,nSeg)=>{
    let p=nPri,s=nSeg;
    for(let i=0;i<n;i++){
      const ip=Math.min(cap,p);p-=ip;
      const is=Math.min(cap-ip,s);s-=is;
      const ocupa=ip+is;
      const asientos=Array.from({length:cap},(_,j)=>`<i style="background:${j<ip?primero:j<ocupa?segundo:'var(--border)'}"></i>`).join('');
      html.push(`<div class="rt-unit${ocupa?'':' rt-vacia'}"><div class="rt-unit-h"><b>${nombre} ${String(i+1).padStart(2,'0')}</b><u>${ocupa}/${cap}</u></div>
        <div class="rt-seats">${asientos}</div>
        <div class="rt-unit-f">${ocupa?(cap-ocupa?(cap-ocupa)+' libres':'completa'):'sin uso'}</div></div>`);
    }
  };
  llenar(P.coN,P.coUtil,'Coaster',_RT_COL.obr,_RT_COL.stf,a.obrCo,a.stfCo);
  llenar(P.caN,P.caUtil,'Camioneta',_RT_COL.stf,_RT_COL.obr,a.stfCa,a.obrCa);
  return html.join('')||'<div class="rt-nota">Sin unidades configuradas para este turno.</div>';
}
function _rtMapaTurno(a,P,noche){
  const col=noche?_RT_COL.noche:_RT_COL.dia;
  const extraCo=P.coUtil?Math.ceil(a.falta/P.coUtil):0, extraCa=P.caUtil?Math.ceil(a.falta/P.caUtil):0;
  const opciones=[extraCo?extraCo+' coaster':'',extraCa?extraCa+' camioneta'+(extraCa===1?'':'s'):''].filter(Boolean).join(' o ');
  return `<div class="rt-mapa-t">
    <div class="rt-mapa-th"><b style="color:${col}">${noche?'🌙 Turno Noche':'☀ Turno Día'}</b>
      <span>${a.pers} personas (${a.obr} obreros · ${a.stf} staff) · ${a.coUsadas} coaster y ${a.caUsadas} camioneta${a.caUsadas===1?'':'s'} en uso</span>
      ${_rtChip(a)}</div>
    <div class="rt-units">${_rtUnidades(a,P)}</div>
    ${a.falta?`<div class="rt-falta"><b>${a.falta} persona${a.falta===1?'':'s'} sin asiento</b>
      ${opciones?`<p>Con la flota actual harían falta ${opciones} más para este turno.</p>`:''}</div>`:''}
  </div>`;
}

function _rtPintarCalculo(){
  const cont=document.getElementById('rtCalculo');if(!cont)return;
  const dias=_rtDias();
  const C=_rtCalcular(dias);
  if(!_rtSel||!dias.includes(_rtSel))_rtSel=dias.includes(today())?today():dias[0];
  // Totales de los paneles de flota (sin redibujar los campos que se editan)
  [['DIA',C.PD],['NOCHE',C.PN]].forEach(([k,P])=>{
    const t=document.getElementById('rtTot'+k);if(t)t.textContent=P.total+' plazas';
    const co=document.getElementById('rtCo'+k);if(co)co.textContent=P.coN+' × '+P.coUtil+' = '+P.coCap+' plazas';
    const ca=document.getElementById('rtCa'+k);if(ca)ca.textContent=P.caN+' × '+P.caUtil+' = '+P.caCap+' plazas';
  });
  const kd=C.dia, kn=C.noche;
  const kpis=`<div class="rt-kpis">
    ${_rtKpi('☀ Capacidad día',C.PD.total,_RT_COL.dia,'plazas por turno')}
    ${_rtKpi('☀ Pico día',kd.pico,_RT_COL.dia,'personas')}
    ${_rtKpi('☀ Días que no alcanzan',kd.fallan,kd.fallan?_RT_COL.cr:_RT_COL.ok,kd.fallan?'mayor déficit '+kd.deficit:'de '+dias.length)}
    ${_rtKpi('🌙 Capacidad noche',C.PN.total,_RT_COL.noche,'plazas por turno')}
    ${_rtKpi('🌙 Pico noche',kn.pico,_RT_COL.noche,'personas')}
    ${_rtKpi('🌙 Días que no alcanzan',kn.fallan,kn.fallan?_RT_COL.cr:_RT_COL.ok,kn.fallan?'mayor déficit '+kn.deficit:'de '+dias.length)}
  </div>`;
  const hoy=today();
  const filas=C.filas.map(f=>{
    const dow=_rosterDia(f.fecha), d=f.dia, n=f.noche;
    const cls=(f.fecha===_rtSel?'rt-sel ':'')+(f.fecha===hoy?'rt-hoy ':'');
    return `<tr class="${cls}" onclick="_rtElegir('${f.fecha}')">
      <td class="rt-f"><b>${_rosterFmt(f.fecha)}</b><i style="${dow===0?'color:#ef4444':''}">${_DN[dow]}</i></td>
      <td class="rt-n rt-sep">${d.pers}<small>${d.obr} ob · ${d.stf} st</small></td>
      <td class="rt-n" style="color:${_RT_COL.obr}">${d.coUsadas}</td>
      <td class="rt-n" style="color:${_RT_COL.stf}">${d.caUsadas}</td>
      <td>${_rtBarra(d)}</td><td>${_rtChip(d)}</td>
      <td class="rt-n rt-sep">${n.pers}<small>${n.obr} ob · ${n.stf} st</small></td>
      <td class="rt-n" style="color:${_RT_COL.obr}">${n.coUsadas}</td>
      <td class="rt-n" style="color:${_RT_COL.stf}">${n.caUsadas}</td>
      <td>${_rtBarra(n)}</td><td>${_rtChip(n)}</td>
    </tr>`;
  }).join('');
  const sel=C.filas.find(f=>f.fecha===_rtSel)||C.filas[0];
  const selDow=_rosterDia(sel.fecha);
  cont.innerHTML=`${kpis}
    <div class="rt-tabla"><table>
      <thead>
        <tr><th rowspan="2">Día</th>
          <th colspan="5" class="rt-sep" style="color:${_RT_COL.dia}">☀ Turno Día · TD + DLT + A5</th>
          <th colspan="5" class="rt-sep" style="color:${_RT_COL.noche}">🌙 Turno Noche · TN</th></tr>
        <tr><th class="rt-n rt-sep">Personas</th><th class="rt-n">Coaster</th><th class="rt-n">Camioneta</th><th>Ocupación</th><th>Resultado</th>
          <th class="rt-n rt-sep">Personas</th><th class="rt-n">Coaster</th><th class="rt-n">Camioneta</th><th>Ocupación</th><th>Resultado</th></tr>
      </thead>
      <tbody>${filas}</tbody>
    </table></div>
    <div class="rt-mapa">
      <div class="rt-mapa-h">
        <div><b>${_rosterFmt(sel.fecha)} · ${_DN[selDow]}</b><span>Asientos del día elegido. Toque otro día en la tabla para verlo.</span></div>
        <div class="rt-ley"><span><i style="background:${_RT_COL.obr}"></i>Obrero</span><span><i style="background:${_RT_COL.stf}"></i>Staff</span><span><i style="background:var(--border)"></i>Libre</span></div>
      </div>
      ${_rtMapaTurno(sel.dia,C.PD,false)}
      ${_rtMapaTurno(sel.noche,C.PN,true)}
    </div>
    <p class="rt-nota">Las personas salen del Roster: personal activo con guardia, según su ciclo, su turno individual, su fecha de incorporación y los días cambiados a mano en la grilla. Los obreros van primero en coaster y los staff primero en camioneta; si una se llena, el resto pasa a la otra.</p>`;
}

// ── PDF: hoja A4 horizontal, como el PDF del Cronograma ───────────────────
// Detalle de unidades de un turno, en texto: «Coaster 01: 23/23 (20 ob · 3 st)»
function _rtUnidadesTexto(a,P){
  const out=[];
  const lista=(n,cap,nombre,nPri,nSeg,priEsObr)=>{
    let p=nPri,s=nSeg;
    for(let i=0;i<n;i++){
      const ip=Math.min(cap,p);p-=ip;
      const is=Math.min(cap-ip,s);s-=is;
      if(!ip&&!is)continue;
      const ob=priEsObr?ip:is, st=priEsObr?is:ip;
      out.push(`${nombre} ${String(i+1).padStart(2,'0')}: <b>${ip+is}/${cap}</b> (${ob} ob · ${st} st)`);
    }
  };
  lista(P.coN,P.coUtil,'Coaster',a.obrCo,a.stfCo,true);
  lista(P.caN,P.caUtil,'Camioneta',a.stfCa,a.obrCa,false);
  return out.join(' &nbsp;·&nbsp; ')||'Sin unidades en uso';
}
function _rtPdf(){
  const dias=_rtDias();
  const C=_rtCalcular(dias);
  const hoy=today();
  const AZ='#1e3a5f';
  const chip=a=>a.falta>0?`<span style="background:#b91c1c;color:#fff;padding:1px 5px;border-radius:3px;font-weight:700">Faltan ${a.falta}</span>`
    :!a.pers?'<span style="color:#94a3b8">—</span>'
    :a.holgura<=3?`<span style="background:#fef3c7;color:#92400e;padding:1px 5px;border-radius:3px;font-weight:700">Justo · ${a.holgura}</span>`
    :'<span style="background:#d1fae5;color:#065f46;padding:1px 5px;border-radius:3px;font-weight:700">Alcanza</span>';
  const TD='padding:2px 5px;border:1px solid #e2e8f0;text-align:right';
  const filas=C.filas.map((f,i)=>{
    const d=f.dia,n=f.noche,dow=_rosterDia(f.fecha);
    const bg=f.fecha===hoy?'#fef9c3':i%2?'#f8fafc':'#fff';
    return `<tr style="background:${bg}">
      <td style="${TD};text-align:left;font-weight:700${dow===0?';color:#b91c1c':''}">${_rosterFmt(f.fecha)} ${_DN[dow]}</td>
      <td style="${TD};border-left:2px solid ${AZ}">${d.pers} <span style="color:#64748b">(${d.obr}/${d.stf})</span></td><td style="${TD}">${d.coUsadas}</td><td style="${TD}">${d.caUsadas}</td>
      <td style="${TD}">${(100*d.ocup).toFixed(0)}%</td><td style="${TD};text-align:left">${chip(d)}</td>
      <td style="${TD};border-left:2px solid ${AZ}">${n.pers} <span style="color:#64748b">(${n.obr}/${n.stf})</span></td><td style="${TD}">${n.coUsadas}</td><td style="${TD}">${n.caUsadas}</td>
      <td style="${TD}">${(100*n.ocup).toFixed(0)}%</td><td style="${TD};text-align:left">${chip(n)}</td></tr>`;
  }).join('');
  const flota=(k,P,col)=>{const f=_rtFlota[k];return `<div style="flex:1;border:1px solid ${col};border-top:3px solid ${col};border-radius:5px;padding:5px 8px">
    <div style="font-weight:800;color:${col};font-size:9px">${k==='DIA'?'TURNO DÍA · TD + DLT + A5':'TURNO NOCHE · TN'} — ${P.total} plazas</div>
    <div style="margin-top:2px">Coaster: ${P.coN} × ${P.coUtil} pax (${f.coAsientos} asientos${f.coConductor?', menos conductor':''}) = <b>${P.coCap}</b>
     &nbsp;·&nbsp; Camioneta: ${P.caN} × ${P.caUtil} pax (${f.caAsientos} asientos${f.caConductor?', menos conductor':''}) = <b>${P.caCap}</b>
     ${f.reserva?'&nbsp;·&nbsp; Reserva '+f.reserva+'%':''}</div></div>`;};
  const kpi=(l,v,col)=>`<div style="flex:1;border:1px solid ${col};border-top:3px solid ${col};border-radius:5px;padding:4px 7px">
    <div style="font-size:6.5px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;font-weight:700">${l}</div>
    <div style="font-size:15px;font-weight:900;color:${col}">${v}</div></div>`;
  const sel=C.filas.find(f=>f.fecha===_rtSel)||C.filas[0];
  const logo=(typeof EMPRESA!=='undefined'&&EMPRESA.logo)?window.location.href.replace(/[^\/\\]+$/,'')+EMPRESA.logo:'';
  const TH=`padding:3px 5px;background:${AZ};color:#fff;font-size:7px;text-transform:uppercase;border:1px solid ${AZ}`;
  const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Transporte de Personal ${dias[0]} a ${dias[dias.length-1]}</title>
<style>@page{size:A4 landscape;margin:.8cm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:8px;color:#111;margin:0}
table{width:100%;border-collapse:collapse}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}tr{page-break-inside:avoid}}</style></head><body>
<div style="display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid ${AZ};padding-bottom:6px;margin-bottom:8px">
  ${logo?`<img src="${_rtEsc(logo)}" alt="" style="height:38px;object-fit:contain">`:'<span></span>'}
  <div style="text-align:center"><div style="font-size:15px;font-weight:900;color:${AZ}">CAPACIDAD DE TRANSPORTE DE PERSONAL</div>
    <div style="font-size:8px;color:#64748b">Según el Roster de Guardias · del ${_rosterFmt(dias[0])} al ${_rosterFmt(dias[dias.length-1])}/${dias[dias.length-1].slice(0,4)}</div></div>
  <div style="text-align:right;font-size:7px;color:#64748b">Generado<br>${new Date().toLocaleString('es-PE')}</div>
</div>
<div style="display:flex;gap:8px;margin-bottom:6px">${flota('DIA',C.PD,'#b45309')}${flota('NOCHE',C.PN,'#4338ca')}</div>
<div style="display:flex;gap:6px;margin-bottom:8px">
  ${kpi('Día · capacidad',C.PD.total,'#b45309')}${kpi('Día · pico',C.dia.pico,'#b45309')}
  ${kpi('Día · no alcanza',C.dia.fallan+(C.dia.fallan?' días':''),C.dia.fallan?'#b91c1c':'#047857')}
  ${kpi('Noche · capacidad',C.PN.total,'#4338ca')}${kpi('Noche · pico',C.noche.pico,'#4338ca')}
  ${kpi('Noche · no alcanza',C.noche.fallan+(C.noche.fallan?' días':''),C.noche.fallan?'#b91c1c':'#047857')}
</div>
<table><thead>
  <tr><th rowspan="2" style="${TH};text-align:left">Día</th><th colspan="5" style="${TH}">☀ Turno Día</th><th colspan="5" style="${TH}">🌙 Turno Noche</th></tr>
  <tr><th style="${TH}">Personas (ob/st)</th><th style="${TH}">Coaster</th><th style="${TH}">Camioneta</th><th style="${TH}">Ocup.</th><th style="${TH}">Resultado</th>
      <th style="${TH}">Personas (ob/st)</th><th style="${TH}">Coaster</th><th style="${TH}">Camioneta</th><th style="${TH}">Ocup.</th><th style="${TH}">Resultado</th></tr>
</thead><tbody>${filas}</tbody></table>
<div style="margin-top:8px;border:1px solid #cbd5e1;border-radius:5px;padding:6px 8px;page-break-inside:avoid">
  <div style="font-weight:800;color:${AZ};font-size:9px;margin-bottom:3px">Distribución del ${_rosterFmt(sel.fecha)} ${_DN[_rosterDia(sel.fecha)]}</div>
  <div><b>☀ Día</b> — ${sel.dia.pers} personas: ${_rtUnidadesTexto(sel.dia,C.PD)}${sel.dia.falta?` &nbsp;<b style="color:#b91c1c">· ${sel.dia.falta} sin asiento</b>`:''}</div>
  <div style="margin-top:2px"><b>🌙 Noche</b> — ${sel.noche.pers} personas: ${_rtUnidadesTexto(sel.noche,C.PN)}${sel.noche.falta?` &nbsp;<b style="color:#b91c1c">· ${sel.noche.falta} sin asiento</b>`:''}</div>
</div>
<div style="margin-top:6px;font-size:6.5px;color:#64748b">Personas según el Roster (ciclo de guardia, turno individual, incorporación y días cambiados a mano). Obreros primero en coaster, staff primero en camioneta; si una se llena, el resto pasa a la otra. ob = obreros · st = staff.</div>
</body></html>`;
  const win=window.open('','_blank');
  if(!win){toast('Active ventanas emergentes',true);return;}
  win.document.write(html);win.document.close();win.focus();setTimeout(()=>win.print(),600);
}

function rRosterTransporte(){
  const cont=document.getElementById('rtBody');if(!cont)return;
  if(typeof _rosterNormOvr==='function')_rosterNormOvr();
  if(!_rtLeida){_rtLeida=true;_rtLeerFlota();}
  const dias=_rtDias();
  cont.innerHTML=`${_rtEstilos()}
    <div class="rt-nav">
      <button type="button" onclick="_rtNavegar(-7)" title="Semana anterior">◀</button>
      <b>${_rosterFmt(dias[0])} – ${_rosterFmt(dias[dias.length-1])}</b>
      <button type="button" onclick="_rtNavegar(7)" title="Semana siguiente">▶</button>
      <button type="button" onclick="_rtNavegar(0)">Hoy</button>
      <span class="rt-nota" style="margin:0;flex:1">El mismo período que el Cronograma</span>
      <button type="button" class="rt-pdf" onclick="_rtPdf()">🖨 Exportar PDF</button>
    </div>
    <div class="rt-flotas">${_rtPanelFlota('DIA')}${_rtPanelFlota('NOCHE')}</div>
    <div id="rtCalculo"></div>`;
  _rtPintarCalculo();
}

function _rtEstilos(){
  return `<style>
  .rt-nav{display:flex;align-items:center;gap:.4rem;flex-wrap:wrap;margin-bottom:.8rem}
  .rt-nav b{font-size:.82rem;color:var(--text);padding:0 .3rem}
  .rt-nav button{font-size:.76rem;padding:.38rem .7rem;border-radius:7px;border:1px solid var(--border);background:var(--panel2);color:var(--text);cursor:pointer;font-weight:700}
  .rt-nav button:hover{border-color:var(--adm)}
  .rt-nav .rt-pdf{background:var(--adm);border-color:var(--adm);color:#fff}
  .rt-flotas{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:.8rem;margin-bottom:.9rem}
  .rt-flota{border-radius:10px;background:var(--panel);padding:.75rem .85rem;display:flex;flex-direction:column;gap:.55rem}
  .rt-flota-h{display:flex;justify-content:space-between;align-items:baseline;font-size:.9rem;font-weight:800}
  .rt-flota-h span{font-size:.78rem;color:var(--text);font-variant-numeric:tabular-nums}
  .rt-flota-g{display:grid;grid-template-columns:1fr 1fr;gap:.6rem}
  @media(max-width:560px){.rt-flota-g{grid-template-columns:1fr}}
  .rt-veh{border:1px solid var(--border);border-radius:8px;padding:.55rem .6rem;display:flex;flex-direction:column;gap:.35rem;background:var(--panel2)}
  .rt-veh>b{font-size:.78rem}
  .rt-veh small{font-size:.68rem;color:var(--muted2);font-variant-numeric:tabular-nums;border-top:1px dashed var(--border);padding-top:.3rem}
  .rt-fld{display:flex;align-items:center;justify-content:space-between;gap:.5rem;font-size:.72rem;color:var(--muted2)}
  .rt-fld input[type=number]{width:62px;font-size:.8rem;padding:.3rem .4rem;border-radius:6px;border:1px solid var(--border);background:var(--panel);color:var(--text);text-align:right}
  .rt-fld input[type=checkbox]{width:16px;height:16px;accent-color:#f59e0b}
  .rt-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:.6rem;margin-bottom:.9rem}
  .rt-kpi{border-radius:9px;padding:.6rem .8rem;background:var(--panel)}
  .rt-kpi-l{font-size:.58rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--muted2)}
  .rt-kpi-v{font-size:1.6rem;font-weight:900;line-height:1.1;margin-top:.15rem;font-variant-numeric:tabular-nums}
  .rt-kpi-s{font-size:.64rem;color:var(--muted2)}
  .rt-tabla{overflow-x:auto;border:1px solid var(--border);border-radius:9px;background:var(--panel);max-height:460px;overflow-y:auto}
  .rt-tabla table{border-collapse:collapse;width:100%;min-width:900px}
  .rt-tabla th{position:sticky;top:0;background:var(--panel);font-size:.58rem;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--muted2);padding:.4rem .5rem;text-align:left;white-space:nowrap;border-bottom:1px solid var(--border)}
  .rt-tabla thead tr:nth-child(2) th{top:1.55rem}
  .rt-tabla td{padding:.32rem .5rem;font-size:.74rem;color:var(--text);white-space:nowrap;border-bottom:1px solid var(--border);font-variant-numeric:tabular-nums}
  .rt-tabla tbody tr{cursor:pointer}
  .rt-tabla tbody tr:hover{background:var(--panel2)}
  .rt-tabla tr.rt-sel{background:var(--panel2);box-shadow:inset 3px 0 0 #f59e0b}
  .rt-tabla tr.rt-hoy td.rt-f b{color:#f59e0b}
  .rt-n{text-align:right!important}
  .rt-sep{border-left:1px solid var(--border)}
  .rt-f b{font-weight:800}.rt-f i{font-style:normal;font-size:.62rem;color:var(--muted2);margin-left:.3rem}
  .rt-n small{display:block;font-size:.58rem;color:var(--muted2)}
  .rt-bar{display:inline-block;width:80px;height:9px;background:var(--panel2);border:1px solid var(--border);border-radius:3px;overflow:hidden;vertical-align:middle}
  .rt-bar i{display:block;height:100%}
  .rt-pct{font-size:.64rem;color:var(--muted2);margin-left:.3rem}
  .rt-chip{display:inline-block;font-size:.62rem;font-weight:800;padding:.2rem .45rem;border-radius:4px;white-space:nowrap}
  .rt-mapa{margin-top:.9rem;border:1px solid var(--border);border-radius:10px;background:var(--panel);padding:.8rem;display:flex;flex-direction:column;gap:.9rem}
  .rt-mapa-h{display:flex;justify-content:space-between;align-items:flex-end;gap:.6rem;flex-wrap:wrap;border-bottom:1px solid var(--border);padding-bottom:.55rem}
  .rt-mapa-h b{display:block;font-size:1rem;color:var(--text)}
  .rt-mapa-h span{font-size:.7rem;color:var(--muted2)}
  .rt-ley{display:flex;gap:.7rem}
  .rt-ley span{display:flex;align-items:center;gap:.25rem;font-size:.66rem;color:var(--muted2)}
  .rt-ley i{width:10px;height:10px;border-radius:2px;display:inline-block}
  .rt-mapa-t{display:flex;flex-direction:column;gap:.5rem}
  .rt-mapa-th{display:flex;align-items:center;gap:.6rem;flex-wrap:wrap}
  .rt-mapa-th b{font-size:.82rem}
  .rt-mapa-th span:not(.rt-chip){font-size:.7rem;color:var(--muted2);flex:1;min-width:200px}
  .rt-units{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:.55rem}
  .rt-unit{border:1px solid var(--border);border-radius:7px;padding:.5rem .55rem;background:var(--panel2)}
  .rt-unit.rt-vacia{opacity:.5}
  .rt-unit-h{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:.4rem}
  .rt-unit-h b{font-size:.74rem;color:var(--text)}
  .rt-unit-h u{text-decoration:none;font-size:.66rem;color:var(--muted2);font-variant-numeric:tabular-nums}
  .rt-seats{display:flex;flex-wrap:wrap;gap:3px}
  .rt-seats i{width:12px;height:12px;border-radius:2px;display:block}
  .rt-unit-f{margin-top:.35rem;font-size:.6rem;color:var(--muted2)}
  .rt-falta{border:1px dashed #ef4444;border-radius:7px;padding:.5rem .7rem;background:rgba(239,68,68,.08)}
  .rt-falta b{font-size:.78rem;color:#f87171}
  .rt-falta p{margin:.2rem 0 0;font-size:.72rem;color:var(--text)}
  .rt-nota{font-size:.68rem;color:var(--muted2);line-height:1.5;margin:.8rem 0 0}
  </style>`;
}
