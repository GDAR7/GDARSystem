// ══════════════════════════════════════════════════════════════════════════
//  EDP PROVEEDORES — Tab de Costos / KPI
//  Analiza los EDP ya guardados (DB.edpProveedores): cuánto cuesta cada
//  equipo, cómo evoluciona el gasto mes a mes y qué proveedor pesa más.
//  No recalcula nada: usa los montos con los que se emitió cada EDP.
// ══════════════════════════════════════════════════════════════════════════

// Un EDP pertenece al mes de su fecha de cierre: los períodos van del 21 al 20,
// así que "hasta" es el mes al que se le carga el gasto.
function _ecMes(r){return String(r.hasta||r.desde||'').slice(0,7);}
function _ecMesLbl(m){
  if(!m||m.length<7)return'—';
  const[y,mo]=m.split('-');
  const N=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Set','Oct','Nov','Dic'];
  return`${N[+mo-1]||mo} ${y}`;
}
// ── TIPO DE CAMBIO ──────────────────────────────────────────────────────────
// Cada EDP se emite en la moneda de su contrato. Para poder sumar y comparar
// hay que llevar todo a soles: sumar dólares como si fueran soles subvalúa el
// costo unas 3.4 veces. La tasa es editable y se recuerda en el navegador.
const _TC_DEF={DOLARES:3.40,EUROS:3.90};
let _tcRates=Object.assign({},_TC_DEF,(()=>{try{return JSON.parse(localStorage.getItem('_gdarTC')||'null')||{};}catch(e){return{};}})());
function _tcGet(m){
  if(m==='DOLARES')return +_tcRates.DOLARES||_TC_DEF.DOLARES;
  if(m==='EUROS')  return +_tcRates.EUROS  ||_TC_DEF.EUROS;
  return 1;                       // SOLES o moneda no declarada
}
function _tcSet(m,v){
  const n=+v;
  if(!n||n<=0){toast('Tipo de cambio inválido',true);return;}
  _tcRates[m]=n;
  try{localStorage.setItem('_gdarTC',JSON.stringify(_tcRates));}catch(e){}
  if(typeof rEdpCostos==='function'&&document.getElementById('edpCostosBody')&&document.getElementById('edpCostosBody').style.display!=='none')rEdpCostos();
  if(typeof rResultadoOperativo==='function'&&document.getElementById('roBody'))rResultadoOperativo();
}
const _tcSim=m=>m==='DOLARES'?'US$':m==='EUROS'?'€':'S/';
// Convierte a soles cualquier importe según la moneda con que se emitió el EDP
function _aSoles(monto,moneda){return +((+monto||0)*_tcGet(moneda)).toFixed(2);}
// Monedas distintas de SOLES presentes en los EDP cargados
function _tcMonedasEnUso(){
  return [...new Set((DB.edpProveedores||[]).map(r=>r.moneda||'SOLES'))].filter(m=>m!=='SOLES');
}
// Controles de tasa para la barra de filtros (solo las monedas que se usan)
function _tcControles(estilo){
  const ms=_tcMonedasEnUso();
  if(!ms.length)return'';
  return ms.map(m=>`<div style="display:flex;flex-direction:column;gap:.15rem">
    <label style="font-size:.58rem;text-transform:uppercase;letter-spacing:.06em;color:#fbbf24">T.C. ${m==='DOLARES'?'US$':'€'} → S/</label>
    <input type="number" step="0.001" min="0.001" value="${_tcGet(m)}" title="Tipo de cambio usado para convertir los EDP en ${m.toLowerCase()} a soles"
      onchange="_tcSet('${m}',this.value)" style="${estilo};width:88px;border-color:#fbbf24;color:#fbbf24;font-weight:700">
  </div>`).join('');
}

const _ecN=v=>Number(v||0).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});
const _ecN0=v=>Number(v||0).toLocaleString('es-PE',{maximumFractionDigits:0});
function _ecEsc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

// Filtros del tab (viven mientras dure la sesión)
let _ecMesSel='', _ecTipo='', _ecProv='', _ecBuscar='', _ecIncAnulados=false;
let _ecOrden='monto';   // monto | equipo | edps

function _ecSet(campo,val){
  if(campo==='mes')_ecMesSel=val;
  else if(campo==='tipo')_ecTipo=val;
  else if(campo==='prov')_ecProv=val;
  else if(campo==='buscar')_ecBuscar=val;
  else if(campo==='anulados')_ecIncAnulados=!!val;
  else if(campo==='orden')_ecOrden=val;
  rEdpCostos(campo==='buscar');
}

// ── Datos: cruza los EDP guardados con el Máster de equipos ─────────────────
function _ecDatos(){
  const eqById=new Map((DB.equipos||[]).map(e=>[+e.id,e]));
  const q=_ecBuscar.trim().toLowerCase();
  const filas=(DB.edpProveedores||[]).map(r=>{
    const eq=eqById.get(+r.eqId)||{};
    // Todos los importes se guardan convertidos a SOLES: es la única forma de
    // sumarlos entre sí. Se conserva el original para poder mostrarlo.
    const mon=r.moneda||'SOLES';
    return{
      id:r.id,eqId:+r.eqId,
      codigo:eq.codigo||'(equipo eliminado)',
      nombre:(eq.nombre||'').split(' ').slice(0,4).join(' '),
      tipo:eq.tipo||'—',
      proveedor:r.proveedor||eq.proveedor||'—',
      mes:_ecMes(r),numEdp:r.numEdp||'',
      desde:r.desde||'',hasta:r.hasta||'',
      tarifaUn:r.tarifaUn||'HM',cantEquipo:+r.cantEquipo||0,
      neto:_aSoles(r.subtotal,mon),desc:_aSoles(r.montoDesc,mon),total:_aSoles(r.total,mon),
      aAbonar:_aSoles(r.aAbonar,mon),estado:r.estado||'Emitido',
      moneda:mon,netoOrig:+r.subtotal||0,tc:_tcGet(mon)
    };
  });
  // Los anulados no son gasto: se excluyen salvo que se pidan explícitamente
  const base=filas.filter(f=>_ecIncAnulados||f.estado!=='Anulado');
  const meses=[...new Set(base.map(f=>f.mes).filter(Boolean))].sort().reverse();
  const tipos=[...new Set(base.map(f=>f.tipo).filter(Boolean))].sort();
  const provs=[...new Set(base.map(f=>f.proveedor).filter(Boolean))].sort();
  const sel=base.filter(f=>
    (!_ecMesSel||f.mes===_ecMesSel)&&
    (!_ecTipo||f.tipo===_ecTipo)&&
    (!_ecProv||f.proveedor===_ecProv)&&
    (!q||`${f.codigo} ${f.nombre} ${f.proveedor} ${f.tipo} ${f.numEdp}`.toLowerCase().includes(q))
  );
  return{todas:base,sel,meses,tipos,provs};
}

// Agrupa por una clave y suma los importes
function _ecAgrupar(filas,key){
  const m=new Map();
  filas.forEach(f=>{
    const k=key(f);
    const a=m.get(k)||{k,neto:0,desc:0,total:0,aAbonar:0,n:0,cant:0,f};
    a.neto+=f.neto;a.desc+=f.desc;a.total+=f.total;a.aAbonar+=f.aAbonar;a.n++;a.cant+=f.cantEquipo;
    m.set(k,a);
  });
  return [...m.values()];
}

// ── Gráfico de barras horizontales (ranking por magnitud) ───────────────────
// Una sola serie: el color no codifica identidad, solo hace legible la barra.
const _EC_HUE='#f97316';
function _ecBarrasH(items,opt){
  opt=opt||{};
  const max=Math.max(...items.map(i=>i.v),0)||1;
  if(!items.length)return`<div style="padding:2rem;text-align:center;color:var(--muted2);font-size:.8rem">Sin datos para los filtros seleccionados</div>`;
  return`<div style="display:flex;flex-direction:column;gap:6px">
    ${items.map(i=>{
      const pct=Math.max(1.5,i.v/max*100);
      return`<div title="${_ecEsc(i.tip||i.lbl)}" style="display:grid;grid-template-columns:150px 1fr 108px;align-items:center;gap:.55rem">
        <span style="font-size:.7rem;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600">${_ecEsc(i.lbl)}</span>
        <div style="position:relative;height:15px;background:rgba(255,255,255,.045);border-radius:4px">
          <div style="position:absolute;left:0;top:0;bottom:0;width:${pct}%;background:${opt.hue||_EC_HUE};border-radius:0 4px 4px 0"></div>
        </div>
        <span style="font-size:.71rem;font-family:monospace;color:var(--text);text-align:right;font-variant-numeric:tabular-nums">${opt.sim||'S/'} ${_ecN(i.v)}</span>
      </div>`;
    }).join('')}
  </div>`;
}

// ── Gráfico de columnas por mes (evolución) ─────────────────────────────────
function _ecColumnasMes(items,sim){
  if(!items.length)return`<div style="padding:2rem;text-align:center;color:var(--muted2);font-size:.8rem">Sin EDP guardados todavía</div>`;
  const max=Math.max(...items.map(i=>i.v),0)||1;
  const prom=items.reduce((s,i)=>s+i.v,0)/items.length;
  const promPct=prom/max*100;
  return`<div style="position:relative;padding-top:.4rem">
    <div style="position:absolute;left:0;right:0;bottom:${34+promPct*1.42}px;border-top:1px dashed rgba(255,255,255,.18);pointer-events:none">
      <span style="position:absolute;right:0;top:-14px;font-size:.56rem;color:var(--muted2);background:var(--panel);padding:0 4px">Promedio ${sim} ${_ecN0(prom)}</span>
    </div>
    <div style="display:flex;align-items:flex-end;gap:8px;height:170px">
      ${items.map(i=>{
        const h=Math.max(2,i.v/max*142);
        const act=_ecMesSel===i.mes;
        return`<div onclick="_ecSet('mes','${_ecMesSel===i.mes?'':i.mes}')" title="${_ecEsc(i.lbl)} · ${sim} ${_ecN(i.v)} · ${i.n} EDP"
          style="flex:1;min-width:34px;display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer">
          <span style="font-size:.58rem;font-family:monospace;color:${act?_EC_HUE:'var(--muted2)'};font-variant-numeric:tabular-nums">${_ecN0(i.v)}</span>
          <div style="width:100%;height:${h}px;background:${act?_EC_HUE:_EC_HUE+'6e'};border-radius:4px 4px 0 0;transition:.15s"></div>
          <span style="font-size:.58rem;color:${act?_EC_HUE:'var(--muted2)'};font-weight:${act?'800':'500'};white-space:nowrap">${_ecEsc(i.lbl)}</span>
        </div>`;
      }).join('')}
    </div>
    <div style="font-size:.58rem;color:var(--muted);margin-top:.35rem">Clic en un mes para filtrar todo el tablero · clic de nuevo para quitarlo</div>
  </div>`;
}

// ── Render del tab ──────────────────────────────────────────────────────────
function rEdpCostos(mantenerFoco){
  const cont=document.getElementById('edpCostosBody');if(!cont)return;
  const D=_ecDatos();
  const SIM='S/';   // los EDP en otra moneda se marcan en la tabla

  // KPIs de lo filtrado
  const tNeto=D.sel.reduce((s,f)=>s+f.neto,0);
  const tDesc=D.sel.reduce((s,f)=>s+f.desc,0);
  const tTotal=D.sel.reduce((s,f)=>s+f.total,0);
  const tAbonar=D.sel.reduce((s,f)=>s+f.aAbonar,0);
  const porEquipo=_ecAgrupar(D.sel,f=>f.eqId).sort((a,b)=>b.neto-a.neto);
  const top=porEquipo[0];
  const nEq=porEquipo.length;

  const kpi=(l,v,c,sub)=>`<div class="kpi" style="--kc:${c};border:1px solid ${c};flex:1;min-width:158px">
    <div class="kpi-lbl">${l}</div>
    <div class="kpi-val" style="font-size:${String(v).length>13?'1.15rem':'1.5rem'}">${v}</div>
    <div class="kpi-sub">${sub||''}</div></div>`;

  // Evolución mensual: siempre sobre TODO (sin el filtro de mes), para poder comparar
  const baseMes=D.todas.filter(f=>
    (!_ecTipo||f.tipo===_ecTipo)&&(!_ecProv||f.proveedor===_ecProv));
  const porMes=_ecAgrupar(baseMes,f=>f.mes)
    .filter(a=>a.k).sort((a,b)=>a.k.localeCompare(b.k)).slice(-12)
    .map(a=>({mes:a.k,lbl:_ecMesLbl(a.k),v:a.neto,n:a.n}));

  // Ranking por equipo: top 12 y el resto agrupado, para no hacer una lista infinita
  const TOPN=12;
  const rank=porEquipo.slice(0,TOPN).map(a=>({
    lbl:`${a.f.codigo}`,v:a.neto,
    tip:`${a.f.codigo} — ${a.f.nombre} · ${a.f.proveedor} · ${a.n} EDP`
  }));
  if(porEquipo.length>TOPN){
    const resto=porEquipo.slice(TOPN).reduce((s,a)=>s+a.neto,0);
    rank.push({lbl:`Otros (${porEquipo.length-TOPN})`,v:resto,tip:`${porEquipo.length-TOPN} equipos restantes`});
  }

  const porProv=_ecAgrupar(D.sel,f=>f.proveedor).sort((a,b)=>b.neto-a.neto).slice(0,8)
    .map(a=>({lbl:a.k,v:a.neto,tip:`${a.k} · ${a.n} EDP · ${new Set(D.sel.filter(f=>f.proveedor===a.k).map(f=>f.eqId)).size} equipos`}));

  // Tabla de detalle
  const ordenados=[...porEquipo].sort((a,b)=>
    _ecOrden==='equipo'?a.f.codigo.localeCompare(b.f.codigo)
    :_ecOrden==='edps'?b.n-a.n
    :b.neto-a.neto);
  const TH='padding:5px 7px;font-size:.6rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted2);white-space:nowrap';
  const TDs='padding:4px 7px;font-size:.72rem;white-space:nowrap';
  const filas=ordenados.map(a=>{
    const pct=tNeto>0?a.neto/tNeto*100:0;
    // Aviso de conversión: el importe mostrado ya está en soles
    const mx=a.f.moneda!=='SOLES'
      ?` <span title="Emitido en ${a.f.moneda.toLowerCase()} · convertido a S/ con T.C. ${a.f.tc}" style="font-size:.55rem;font-weight:800;color:#fbbf24;border:1px solid #fbbf2466;background:#fbbf2418;border-radius:3px;padding:0 3px">${_tcSim(a.f.moneda)}</span>`:'';
    return`<tr style="border-bottom:1px solid var(--border)">
      <td style="${TDs};color:var(--ceq);font-weight:700;font-family:monospace">${_ecEsc(a.f.codigo)}${mx}</td>
      <td style="${TDs};max-width:180px;overflow:hidden;text-overflow:ellipsis">${_ecEsc(a.f.nombre)}</td>
      <td style="${TDs};color:var(--muted2)">${_ecEsc(a.f.tipo)}</td>
      <td style="${TDs};max-width:170px;overflow:hidden;text-overflow:ellipsis">${_ecEsc(a.f.proveedor)}</td>
      <td style="${TDs};text-align:center">${a.n}</td>
      <td style="${TDs};text-align:right;font-family:monospace;color:var(--muted2)">${_ecN(a.cant)} ${a.f.tarifaUn==='HM'?'h':a.f.tarifaUn==='DIA'?'d':'mes'}</td>
      <td style="${TDs};text-align:right;font-family:monospace;font-weight:700">${_ecN(a.neto)}</td>
      <td style="${TDs};text-align:right;font-family:monospace;color:${a.desc>0?'#ef4444':'var(--muted)'}">${a.desc>0?'−'+_ecN(a.desc):'—'}</td>
      <td style="${TDs};text-align:right;font-family:monospace">${_ecN(a.total)}</td>
      <td style="${TDs};text-align:right;font-family:monospace;color:#10b981;font-weight:700">${_ecN(a.aAbonar)}</td>
      <td style="${TDs};text-align:right;font-family:monospace;color:var(--muted2)">${pct.toFixed(1)}%</td>
    </tr>`;
  }).join('');

  const selS='background:var(--panel2);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:.3rem .55rem;font-size:.75rem';
  cont.innerHTML=`
  <div class="card" style="margin-bottom:.9rem">
    <div class="card-head"><span class="card-title">🔎 Filtros</span>
      <span style="font-size:.63rem;color:var(--muted2)">${D.sel.length} EDP de ${D.todas.length} · ${nEq} equipo${nEq===1?'':'s'}</span>
    </div>
    <div class="card-body"><div style="display:flex;gap:.55rem;flex-wrap:wrap;align-items:flex-end">
      <div style="display:flex;flex-direction:column;gap:.15rem">
        <label style="font-size:.58rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted2)">Período</label>
        <select onchange="_ecSet('mes',this.value)" style="${selS}">
          <option value="">— Todos los meses —</option>
          ${D.meses.map(m=>`<option value="${m}" ${_ecMesSel===m?'selected':''}>${_ecMesLbl(m)}</option>`).join('')}
        </select>
      </div>
      <div style="display:flex;flex-direction:column;gap:.15rem">
        <label style="font-size:.58rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted2)">Tipo de equipo</label>
        <select onchange="_ecSet('tipo',this.value)" style="${selS}">
          <option value="">— Todos —</option>
          ${D.tipos.map(t=>`<option value="${_ecEsc(t)}" ${_ecTipo===t?'selected':''}>${_ecEsc(t)}</option>`).join('')}
        </select>
      </div>
      <div style="display:flex;flex-direction:column;gap:.15rem">
        <label style="font-size:.58rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted2)">Proveedor</label>
        <select onchange="_ecSet('prov',this.value)" style="${selS};max-width:220px">
          <option value="">— Todos —</option>
          ${D.provs.map(p=>`<option value="${_ecEsc(p)}" ${_ecProv===p?'selected':''}>${_ecEsc(p)}</option>`).join('')}
        </select>
      </div>
      <div style="display:flex;flex-direction:column;gap:.15rem;flex:1;min-width:190px">
        <label style="font-size:.58rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted2)">Buscar</label>
        <input id="ecBuscar" value="${_ecEsc(_ecBuscar)}" placeholder="Código, equipo, proveedor o N° EDP…" oninput="_ecSet('buscar',this.value)" style="${selS};width:100%;box-sizing:border-box">
      </div>
      ${_tcControles(selS)}
      <label style="display:inline-flex;align-items:center;gap:.35rem;font-size:.7rem;color:var(--muted2);cursor:pointer;padding-bottom:.35rem">
        <input type="checkbox" ${_ecIncAnulados?'checked':''} onchange="_ecSet('anulados',this.checked)" style="width:auto;margin:0;cursor:pointer"> Incluir anulados
      </label>
      ${(_ecMesSel||_ecTipo||_ecProv||_ecBuscar)?`<button onclick="_ecLimpiar()" style="background:transparent;border:1px solid #ef444455;color:#ef4444;border-radius:6px;padding:.3rem .7rem;font-size:.7rem;font-weight:700;cursor:pointer">✕ Limpiar</button>`:''}
      <button onclick="_ecExcel()" style="background:#166534;color:#fff;border:none;border-radius:6px;padding:.3rem .8rem;font-size:.72rem;font-weight:700;cursor:pointer">📊 Excel</button>
    </div></div>
  </div>

  <div class="kpi-row" style="margin-bottom:.9rem">
    ${kpi('Neto valorizado',SIM+' '+_ecN0(tNeto),'#f97316',`${D.sel.length} EDP · sin IGV`)}
    ${kpi('Descuentos',tDesc>0?'− '+SIM+' '+_ecN0(tDesc):'—','#ef4444','insumos y atención mecánica')}
    ${kpi('Total con IGV',SIM+' '+_ecN0(tTotal),'#38bdf8','incluye 18%')}
    ${kpi('A abonar',SIM+' '+_ecN0(tAbonar),'#10b981','neto de detracción')}
    ${kpi('Equipo más caro',top?top.f.codigo:'—','#a855f7',top?`${SIM} ${_ecN0(top.neto)} · ${(top.neto/(tNeto||1)*100).toFixed(0)}% del total`:'sin datos')}
  </div>

  <div class="card" style="margin-bottom:.9rem">
    <div class="card-head"><span class="card-title">📅 Gasto por mes</span>
      <span style="font-size:.63rem;color:var(--muted2)">Neto sin IGV${_ecTipo?' · '+_ecEsc(_ecTipo):''}${_ecProv?' · '+_ecEsc(_ecProv):''}</span>
    </div>
    <div class="card-body">${_ecColumnasMes(porMes,SIM)}</div>
  </div>

  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(400px,1fr));gap:.9rem;margin-bottom:.9rem">
    <div class="card">
      <div class="card-head"><span class="card-title">🚜 Costo por equipo</span>
        <span style="font-size:.63rem;color:var(--muted2)">${_ecMesSel?_ecMesLbl(_ecMesSel):'Todos los meses'}</span>
      </div>
      <div class="card-body">${_ecBarrasH(rank,{sim:SIM})}</div>
    </div>
    <div class="card">
      <div class="card-head"><span class="card-title">🏢 Costo por proveedor</span>
        <span style="font-size:.63rem;color:var(--muted2)">Top 8</span>
      </div>
      <div class="card-body">${_ecBarrasH(porProv,{sim:SIM,hue:'#a855f7'})}</div>
    </div>
  </div>

  <div class="card">
    <div class="card-head"><span class="card-title">📋 Detalle por equipo</span>
      <select onchange="_ecSet('orden',this.value)" style="${selS}">
        <option value="monto" ${_ecOrden==='monto'?'selected':''}>Mayor costo primero</option>
        <option value="equipo" ${_ecOrden==='equipo'?'selected':''}>Por código de equipo</option>
        <option value="edps" ${_ecOrden==='edps'?'selected':''}>Más EDP emitidos</option>
      </select>
    </div>
    <div class="card-body" style="padding:0"><div class="tbl-wrap"><table style="width:100%;border-collapse:collapse">
      <thead><tr style="border-bottom:1px solid var(--border)">
        <th style="${TH};text-align:left">Código</th><th style="${TH};text-align:left">Equipo</th>
        <th style="${TH};text-align:left">Tipo</th><th style="${TH};text-align:left">Proveedor</th>
        <th style="${TH};text-align:center">EDP</th><th style="${TH};text-align:right">Cantidad</th>
        <th style="${TH};text-align:right">Neto S/</th><th style="${TH};text-align:right">Descuentos</th>
        <th style="${TH};text-align:right">Total S/</th><th style="${TH};text-align:right">A abonar</th>
        <th style="${TH};text-align:right">% del total</th>
      </tr></thead>
      <tbody>${filas||`<tr><td colspan="11" style="text-align:center;padding:2rem;color:var(--muted2);font-size:.8rem">Sin EDP guardados para estos filtros</td></tr>`}</tbody>
      ${ordenados.length?`<tfoot><tr style="border-top:2px solid var(--ceq);background:rgba(249,115,22,.07)">
        <td colspan="6" style="${TDs};text-align:right;font-weight:800;color:var(--muted2);text-transform:uppercase;font-size:.62rem;letter-spacing:.05em">Totales</td>
        <td style="${TDs};text-align:right;font-family:monospace;font-weight:800">${_ecN(tNeto)}</td>
        <td style="${TDs};text-align:right;font-family:monospace;font-weight:800;color:#ef4444">${tDesc>0?'−'+_ecN(tDesc):'—'}</td>
        <td style="${TDs};text-align:right;font-family:monospace;font-weight:800">${_ecN(tTotal)}</td>
        <td style="${TDs};text-align:right;font-family:monospace;font-weight:800;color:#10b981">${_ecN(tAbonar)}</td>
        <td style="${TDs};text-align:right;font-family:monospace;color:var(--muted2)">100%</td>
      </tr></tfoot>`:''}
    </table></div></div>
  </div>`;

  // El buscador se re-renderiza en cada tecla: hay que devolverle el foco
  if(mantenerFoco){
    const b=document.getElementById('ecBuscar');
    if(b){b.focus();b.setSelectionRange(b.value.length,b.value.length);}
  }
}

function _ecLimpiar(){
  _ecMesSel='';_ecTipo='';_ecProv='';_ecBuscar='';
  rEdpCostos();
}

// ── Excel de lo que se está viendo ──────────────────────────────────────────
function _ecExcel(){
  if(typeof XLSX==='undefined'){toast('Librería de Excel no disponible',true);return;}
  const D=_ecDatos();
  if(!D.sel.length){toast('No hay EDP para exportar',true);return;}
  const BOR={top:{style:'thin',color:{rgb:'D0D7E2'}},bottom:{style:'thin',color:{rgb:'D0D7E2'}},
             left:{style:'thin',color:{rgb:'D0D7E2'}},right:{style:'thin',color:{rgb:'D0D7E2'}}};
  const S=(v,o)=>({v:v==null?'':v,t:typeof v==='number'?'n':'s',s:Object.assign({
    font:{sz:9,bold:!!(o&&o.b),color:{rgb:(o&&o.col)||'0F172A'}},
    fill:{fgColor:{rgb:(o&&o.bg)||'FFFFFF'}},
    alignment:{horizontal:(o&&o.al)||'left',vertical:'center'},border:BOR},
    (o&&o.numFmt)?{numFmt:o.numFmt}:{})});
  const HDR=['Mes','N° EDP','Código','Equipo','Tipo','Proveedor','Unid.','Cantidad','Neto S/','Descuentos S/','IGV+Total S/','A abonar S/','Estado'];
  const aoa=[
    [S('COSTOS DE PROVEEDORES — EDP',{b:1,bg:'1E3A5F',col:'FFFFFF',al:'center'}),...Array(HDR.length-1).fill(S('',{bg:'1E3A5F'}))],
    [S([_ecMesSel?_ecMesLbl(_ecMesSel):'Todos los meses',_ecTipo,_ecProv,_ecBuscar?'"'+_ecBuscar+'"':''].filter(Boolean).join(' · ')+` · ${D.sel.length} EDP`,{bg:'EEF2F8',col:'475569',al:'center'}),...Array(HDR.length-1).fill(S('',{bg:'EEF2F8'}))],
    HDR.map(h=>S(h,{b:1,bg:'334155',col:'FFFFFF',al:'center'}))
  ];
  let n=0,d=0,t=0,a=0;
  D.sel.sort((x,y)=>(y.mes||'').localeCompare(x.mes||'')||y.neto-x.neto).forEach(f=>{
    n+=f.neto;d+=f.desc;t+=f.total;a+=f.aAbonar;
    aoa.push([S(_ecMesLbl(f.mes),{al:'center'}),S(f.numEdp,{al:'center'}),S(f.codigo,{b:1}),S(f.nombre),
      S(f.tipo),S(f.proveedor),S(f.tarifaUn,{al:'center'}),S(f.cantEquipo,{al:'right',numFmt:'#,##0.00'}),
      S(f.neto,{al:'right',numFmt:'#,##0.00'}),S(f.desc,{al:'right',numFmt:'#,##0.00',col:'DC2626'}),
      S(f.total,{al:'right',numFmt:'#,##0.00'}),S(f.aAbonar,{al:'right',numFmt:'#,##0.00',col:'059669'}),
      S(f.estado,{al:'center'})]);
  });
  aoa.push([S('TOTALES',{b:1,bg:'EEF2F8',al:'right'}),...Array(7).fill(S('',{bg:'EEF2F8'})),
    S(n,{b:1,bg:'EEF2F8',al:'right',numFmt:'#,##0.00'}),S(d,{b:1,bg:'EEF2F8',al:'right',numFmt:'#,##0.00',col:'DC2626'}),
    S(t,{b:1,bg:'EEF2F8',al:'right',numFmt:'#,##0.00'}),S(a,{b:1,bg:'EEF2F8',al:'right',numFmt:'#,##0.00',col:'059669'}),
    S('',{bg:'EEF2F8'})]);
  const ws=XLSX.utils.aoa_to_sheet(aoa);
  ws['!merges']=[{s:{r:0,c:0},e:{r:0,c:HDR.length-1}},{s:{r:1,c:0},e:{r:1,c:HDR.length-1}}];
  ws['!cols']=[{wch:11},{wch:8},{wch:14},{wch:26},{wch:16},{wch:26},{wch:7},{wch:11},{wch:13},{wch:13},{wch:13},{wch:13},{wch:11}];
  ws['!freeze']={xSplit:0,ySplit:3};
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Costos EDP');
  XLSX.writeFile(wb,`Costos_Proveedores_${_ecMesSel||'todos'}.xlsx`);
  toast(`✓ ${D.sel.length} EDP exportados`);
}

// ── Tabs de la página de Proveedores ────────────────────────────────────────
let _edpTabAct='edp';
function _edpTab(k){
  _edpTabAct=k;
  const esEdp=k==='edp';
  const a=document.getElementById('edpBody'),b=document.getElementById('edpCostosBody');
  if(a)a.style.display=esEdp?'':'none';
  if(b)b.style.display=esEdp?'none':'';
  [['edp',esEdp],['costos',!esEdp]].forEach(([n,act])=>{
    const btn=document.getElementById('edpTabBtn-'+n);
    if(btn){btn.style.background=act?'var(--ceq)':'transparent';btn.style.color=act?'#fff':'var(--muted2)';}
  });
  if(esEdp)rEdpProveedores();else rEdpCostos();
}
